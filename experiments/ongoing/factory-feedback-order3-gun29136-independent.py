#!/usr/bin/env python3
"""Independent complete-field emitter replay and permanent separation certificate."""
import argparse,hashlib,importlib.util,json,sys,time
from pathlib import Path
P=Path(__file__).resolve().parent;R=P/'results';sp=importlib.util.spec_from_file_location('reference',P.parent/'verify-patterns.py');ref=importlib.util.module_from_spec(sp);sp.loader.exec_module(ref)
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir',type=Path,default=P.parent/'results'/'gun-replay')
args=parser.parse_args();OUT=args.output_dir;OUT.mkdir(parents=True,exist_ok=True)
ident=38
x=json.loads((R/'factory-feedback-order3-gun29136-candidate.json').read_text());rule=x['ruleProvenance'];period=x['period'];cutgen=x['cutGeneration'];cut=set(map(tuple,x['cut']));output=set(map(tuple,x['output']));dr=x['outputTranslation'][1]
def step(s):return ref.step(s,rule)
def digest(s):return hashlib.sha256(json.dumps(sorted(s),separators=(',',':')).encode()).hexdigest()
bits=''
for i in range(128):
 s={ref.D[j] for j in range(6) if i>>j&1}
 if i&64:s.add((0,0))
 bits+=str(int((0,0) in step(s)))
assert bits==rule['lookupBits'] and hashlib.sha256(bits.encode()).hexdigest()==rule['lookupSha256']
phases=[output]
for _ in range(x['outputPeriod']):phases.append(step(phases[-1]))
assert phases[-1]=={(q+x['outputTranslation'][0],r+dr) for q,r in output}
phaseMax=[max(r for q,r in s) for s in phases[:-1]];phaseMin=[min(r for q,r in s) for s in phases[:-1]]
assert dr<0
olderPairGap=-dr*(period//x['outputPeriod'])-(max(phaseMax)-min(phaseMin));assert olderPairGap>2
s=set(map(tuple,x['seed']));envelope=[];started=time.time();minpop=maxpop=len(s);minGap=10**12;gapWitness=None
for g in range(cutgen+period+1):
 minpop=min(minpop,len(s));maxpop=max(maxpop,len(s))
 if g==cutgen:assert s==cut
 if g>=cutgen:
  t=g-cutgen;m=min(r for q,r in s);envelope.append(m);k,phase=divmod(t,x['outputPeriod']);oldMax=phaseMax[phase]+dr*k;gap=m-oldMax
  if gap<minGap:minGap=gap;gapWitness={'generationFromCut':t,'freshMinimumR':m,'oldMaximumR':oldMax}
  assert gap>2,(g,gap)
 if g%10000==0:
  progress={'candidate':ident,'generation':g,'targetGeneration':cutgen+period,'population':len(s),'seconds':time.time()-started,'minimumOlderOutputGapSoFar':minGap if envelope else None};(OUT/f'factory-feedback-order3-gun29136-independent-progress.json').write_text(json.dumps(progress,indent=2)+'\n');print(json.dumps(progress),flush=True)
 if g<cutgen+period:s=step(s)
assert s==set(map(tuple,x['endpoint']))==cut|output
assert not cut&output
trace={'candidate':ident,'cutGeneration':cutgen,'period':period,'minimumRAtEveryGenerationFromCut':envelope,'outputPhaseMinimumR':phaseMin,'outputPhaseMaximumR':phaseMax,'outputTranslation':x['outputTranslation'],'ruleLookupSha256':rule['lookupSha256']};tracepath=OUT/f'factory-feedback-order3-gun29136-independent-envelope.json';tracepath.write_text(json.dumps(trace,separators=(',',':'))+'\n')
out={'candidate':ident,'classification':'finite-seed autonomous spaceship gun','ruleProvenance':rule,'sourcePeriod':period,'transient':cutgen,'precursorPopulation':len(x['seed']),'savedCorePopulation':len(cut),'oneCycleEndpointPopulation':len(s),'spaceshipsPerCycle':1,'outputPeriod':x['outputPeriod'],'outputTranslation':x['outputTranslation'],'outputPopulationAtFirstBoundary':len(output),'fullOriginalSeedSha256':digest(set(map(tuple,x['seed']))),'physicalCutSha256':digest(cut),'endpointSha256':digest(s),'outputSha256':digest(output),'fullFieldEquality':True,'allCellsNaturallyEvolvedAndRetained':True,'independentEngine':'Python neighbor-set reference reconstructed from rule parameters; all128 local cases/hash checked; complete original finite seed evolved through the entire cycle without pruning, restart, injection, recentering, or clipping.','permanentEscape':{'projection':'axial r; escaping direction negative','firstOlderOutputVsEveryFreshCycleStateChecks':len(envelope),'minimumCoordinateGap':minGap,'witness':gapWitness,'radiusOneNeighborhoodSeparationRequiresGapGreaterThan':2,'allOlderOutputPairGapLowerBound':olderPairGap,'all61OutputPhasesChecked':True,'cyclePeriodDivisibleByShipPeriod':period%x['outputPeriod']==0,'induction':'One cycle gives C union O. At every phase of a fresh cycle, the first older output is separated from the entire fresh field by r-gap>2. All further old outputs lie strictly farther along negative r; the all-phase bound separates every consecutive pair despite P not dividing61. Locality therefore makes every cycle evolve as the same complete fresh field plus independently moving older outputs, establishing one permanently escaping spaceship per cycle for every future cycle.'},'populationRangeDuringReplay':[minpop,maxpop],'envelopeArtifact':tracepath.name,'envelopeSha256':hashlib.sha256(tracepath.read_bytes()).hexdigest(),'seconds':time.time()-started,'fullSeed':x['seed'],'physicalCutCells':sorted(cut),'outputCells':sorted(output),'wholeCycleEndpointCells':sorted(s),'historicalNovelty':'unestablished'}
(OUT/f'factory-feedback-order3-gun29136-independent.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ('ruleProvenance','fullSeed','physicalCutCells','outputCells','wholeCycleEndpointCells')}))
