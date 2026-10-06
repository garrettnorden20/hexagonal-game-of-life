#!/usr/bin/env python3
"""Independent finite-support reference, standard-library only; no finite board."""
import argparse,json
from pathlib import Path
D=((1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1))
ROOT=Path(__file__).resolve().parent

def step(cells,rule):
    overrides={}
    for o in rule.get('orbitOverrides',[]):
        mask=o['index']&63;center=o['index']&64
        for reflection in (1,-1):
            for shift in range(6):
                transformed=sum(1<<((shift+reflection*i)%6) for i in range(6) if mask&(1<<i))
                overrides[center+transformed]=o['value']
    candidates=set(cells)
    for q,r in cells:
        candidates.update((q+dq,r+dr) for dq,dr in D)
    out=set()
    for q,r in candidates:
        alive=[(q+dq,r+dr) in cells for dq,dr in D]
        n=sum(alive)
        if (q,r) in cells:
            keep=n in rule['survive'] or (rule.get('surviveSeparatedPair',False) and n==2 and any(alive[i] and alive[(i+2)%6] for i in range(6)))
        else:
            keep=n in rule['birth'] and (not rule.get('adjacentBirth',True) or (any(alive[i] and alive[(i+1)%6] for i in range(6)) and any(not alive[i] and not alive[(i+1)%6] for i in range(6))))
        localmask=sum(1<<i for i,v in enumerate(alive) if v)+(64 if (q,r) in cells else 0)
        keep=overrides.get(localmask,keep)
        if keep:out.add((q,r))
    return out

def translate(cells,dq,dr):return {(q+dq,r+dr) for q,r in cells}

def verify(pattern,cycles=100):
    seed={tuple(p) for p in pattern['seed']};transient=pattern.get('transient',0)
    for _ in range(transient):seed=step(seed,pattern['rule'])
    state=seed.copy();period=pattern['period'];dq,dr=pattern['translation'];pop=[];first=[]
    for t in range(1,period*cycles+1):
        state=step(state,pattern['rule'])
        if t<=period:
            pop.append(len(state));first.append(sorted(state))
            if t<period:
                # Reject an earlier stationary recurrence; independently check normalized recurrence too.
                a=min(q for q,r in seed);b=min(r for q,r in seed);c=min(q for q,r in state);d=min(r for q,r in state)
                assert translate(seed,c-a,d-b)!=state,(pattern['id'],'smaller translation period',t)
        if t%period==0:
            assert state==translate(seed,dq*(t//period),dr*(t//period)),(pattern['id'],t)
    return {'id':pattern['id'],'cycles':cycles,'generations':transient+period*cycles,'startupGenerations':transient,'populationRange':[min([len(seed)]+pop),max([len(seed)]+pop)],'minimalTranslationPeriod':period,'translation':pattern['translation'],'exactFullStateReturn':True,'verificationEngine':'independent Python set reference; unbounded axial lattice'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Independently verify periodic presets; reaction and gun presets use separate checks.')
    parser.add_argument('--id',action='append',help='Exact periodic preset ID; repeat to select several (overrides --max-period).')
    parser.add_argument('--cycles',type=int,default=100)
    parser.add_argument('--max-period',type=int,default=1000,help='Default sweep period cap; large circuits use the UI and gun audits.')
    args=parser.parse_args()
    if args.cycles<1:parser.error('--cycles must be positive')
    patterns=json.loads((ROOT/'patterns.json').read_text())
    periodic=[p for p in patterns if p.get('kind','oscillator') in ('oscillator','spaceship','still-life')]
    if args.id:
        selected=[p for p in periodic if p['id'] in args.id]
        missing=set(args.id)-{p['id'] for p in selected}
        if missing:parser.error('Unknown or non-periodic preset: '+', '.join(sorted(missing)))
    else:selected=[p for p in periodic if p['period']<=args.max_period]
    result=[verify(p,args.cycles) for p in selected]
    (ROOT/'results').mkdir(exist_ok=True)
    (ROOT/'results/pattern-verification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
