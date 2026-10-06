'use strict';
const fs=require('fs'),assert=require('assert/strict'),H=require('./engine');
const pattern=require('./patterns.json').find(p=>p.id==='callahan-gun'),rule=H.makeRule(pattern.rule),seed=H.makeCells(pattern.seed);
let state=new Set(seed);for(let i=0;i<42;i++)state=H.step(state,rule);
assert.ok([...seed].every(k=>state.has(k)));const emitted=new Set([...state].filter(k=>!seed.has(k)));assert.equal(emitted.size,6);
const eResult=H.classify(emitted,rule,{maxGenerations:20});assert.equal(eResult.kind,'spaceship');assert.equal(eResult.transient,0);
let components=[],timeline=[],maxPop=0,minCoreDistance=Infinity;state=new Set(seed);
const distance=([q,r],[x,y])=>Math.max(Math.abs(q-x),Math.abs(r-y),Math.abs(q+r-x-y));
for(let t=1;t<=4200;t++) {
 state=H.step(state,rule);maxPop=Math.max(maxPop,state.size);
 if(t%42===0){
   components=components.map(c=>{for(let i=0;i<42;i++)c=H.step(c,rule);return c;});components.push(emitted);
   const expected=new Set(seed);for(const c of components)for(const k of c)expected.add(k);
   assert.ok(H.equal(expected,state),`exact core + independent glider decomposition, generation ${t}`);
   assert.equal(state.size,64+6*t/42);
   const d=Math.min(...H.coords(components[components.length-1]).flatMap(a=>H.coords(seed).map(b=>distance(a,b))));minCoreDistance=Math.min(minCoreDistance,d);
   timeline.push({generation:t,population:state.size,emittedSpaceships:components.length,coreEqualsInitial:true,exactIndependentGliderDecomposition:true});
 }
}
const result={id:pattern.id,rule:pattern.rule,corePopulation:64,emissionPeriod:42,verifiedGenerations:4200,verifiedEmissions:100,emittedSeed:H.coords(emitted),spaceship:{period:eResult.period,translation:eResult.translation,population:6},populationAtPeriodBoundary:'64 + 6 * (generation / 42)',maxObservedPopulation:maxPop,minCoreDistanceAtEmission:minCoreDistance,method:'Unbounded sparse lattice. At every period boundary, exact full-state equality with original 64-cell core plus all independently evolved emitted spaceships; not just population matching.',timeline};
fs.mkdirSync(__dirname+'/results',{recursive:true});
fs.writeFileSync(__dirname+'/results/gun-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,timeline:undefined},null,2));
