/* Unbounded axial-hex automaton. Browser + Node, no dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HexLife = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const OFFSETS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const key = (q,r) => `${q},${r}`;
  const parse = k => k.split(',').map(Number);
  const makeCells = coords => new Set(coords.map(p => key(...p)));
  const coords = cells => [...cells].map(parse).sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  function orbitMasks(mask) {
    const out=new Set();
    for(let reflection=0;reflection<2;reflection++)for(let shift=0;shift<6;shift++){
      let transformed=0;for(let i=0;i<6;i++)if(mask&(1<<i))transformed|=1<<((shift+(reflection?-i:i)+6)%6);
      out.add(transformed);
    }
    return [...out].sort((a,b)=>a-b);
  }
  function makeRule({birth=[2,3], survive=[3,4], adjacentBirth=true, surviveSeparatedPair=false, orbitOverrides=[], name}={}) {
    if (birth.includes(0)) throw new Error('B0 has an infinite live background; this finite-support engine does not support it.');
    if ([...birth,...survive].some(n=>!Number.isInteger(n)||n<0||n>6)) throw new Error('Neighbor counts must be integers from 0 to 6.');
    const lookup = Array.from({length:128}, (_, state) => {
      const mask=state&63, n=Array.from({length:6},(_,i)=>(mask>>i)&1).reduce((a,b)=>a+b,0);
      let hasAdjacent=false, hasOpen=false, hasSeparatedPair=false;
      for(let i=0;i<6;i++) { const a=(mask>>i)&1, b=(mask>>((i+1)%6))&1; hasAdjacent ||= !!(a&&b); hasOpen ||= !(a||b); hasSeparatedPair ||= !!(a && ((mask>>((i+2)%6))&1)); }
      return state&64 ? survive.includes(n) || (surviveSeparatedPair && n===2 && hasSeparatedPair) : birth.includes(n) && (!adjacentBirth || (hasAdjacent && hasOpen));
    });
    const canonical=new Map();
    for(const o of orbitOverrides){
      if(!o||!Number.isInteger(o.index)||o.index<0||o.index>127||typeof o.value!=='boolean')throw new Error('An orbit override needs index 0–127 and a Boolean value.');
      const masks=orbitMasks(o.index&63),center=o.index&64,id=center+masks[0];
      if(id===0&&o.value)throw new Error('B0 has an infinite live background; this finite-support engine does not support it.');
      if(canonical.has(id)&&canonical.get(id)!==o.value)throw new Error('Conflicting overrides for the same hexagonal symmetry orbit.');
      canonical.set(id,o.value);for(const mask of masks)lookup[center+mask]=o.value;
    }
    orbitOverrides=[...canonical].sort((a,b)=>a[0]-b[0]).map(([index,value])=>({index,value}));
    return {birth:[...birth],survive:[...survive],adjacentBirth,surviveSeparatedPair,orbitOverrides,name:name||`B${birth.join('')}/S${survive.join('')}${adjacentBirth?' + adjacent-pair birth':''}${surviveSeparatedPair?' + separated-pair survival':''}`,lookup};
  }
  function step(cells, rule, bounds) {
    const masks = new Map();
    for(const k of cells) {
      if(!masks.has(k)) masks.set(k,0);
      const [q,r]=parse(k);
      OFFSETS.forEach(([dq,dr],i)=>{ const target=key(q-dq,r-dr); if(!bounds||bounds(q-dq,r-dr)) masks.set(target,(masks.get(target)||0)|(1<<i)); });
    }
    const next=new Set();
    for(const [k,mask] of masks) if(rule.lookup[mask|(cells.has(k)?64:0)]) next.add(k);
    return next;
  }
  function normalize(cells) {
    if(!cells.size) return {key:'',q:0,r:0};
    const ps=coords(cells), q=Math.min(...ps.map(p=>p[0])),r=Math.min(...ps.map(p=>p[1]));
    return {q,r,key:ps.map(p=>`${p[0]-q},${p[1]-r}`).join(';')};
  }
  function equal(a,b) { return a.size===b.size && [...a].every(k=>b.has(k)); }
  function translate(cells,dq,dr) { return makeCells(coords(cells).map(([q,r])=>[q+dq,r+dr])); }
  function classify(seed,rule,{maxGenerations=256,maxPopulation=10000}={}) {
    let cells=new Set(seed), seen=new Map(), history=[];
    for(let g=0;g<=maxGenerations;g++) {
      if(!cells.size) return {kind:'extinct',generation:g,history};
      if(cells.size>maxPopulation) return {kind:'population-limit',generation:g,population:cells.size,history};
      const c=normalize(cells),prev=seen.get(c.key);
      if(prev) {
        const period=g-prev.g,dq=c.q-prev.q,dr=c.r-prev.r;
        return {kind:dq||dr?'spaceship':period===1?'still-life':'oscillator',generation:g,transient:prev.g,period,translation:[dq,dr],cells:coords(cells),phase:history[prev.g],history};
      }
      seen.set(c.key,{g,q:c.q,r:c.r});history.push(coords(cells));
      if(g<maxGenerations) cells=step(cells,rule);
    }
    return {kind:'unresolved',generation:maxGenerations,population:cells.size,history};
  }
  return {OFFSETS,key,parse,makeCells,coords,orbitMasks,makeRule,step,normalize,equal,translate,classify};
});
