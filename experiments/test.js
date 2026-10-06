'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const H=require('./engine');
const rule=H.makeRule();
let cases=0;
for(let mask=0;mask<64;mask++) for(const live of [false,true]) {
 const cells=H.makeCells(H.OFFSETS.filter((_,i)=>(mask>>i)&1)); if(live)cells.add('0,0');
 const a=H.OFFSETS.map((_,i)=>!!(mask&(1<<i))),n=a.filter(Boolean).length;
 const expected=live?[3,4].includes(n):[2,3].includes(n)&&a.some((v,i)=>v&&a[(i+1)%6])&&a.some((v,i)=>!v&&!a[(i+1)%6]);
 assert.equal(H.step(cells,rule).has('0,0'),expected);cases++;
}
// Run the repository's actual original step() inside a sandbox with a stub canvas.
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:1100,height:750}),addEventListener:()=>{}};
const sandbox={document:{querySelector:()=>canvas},window:{HEX_LIFE_RULES:{birth:[2,3],survive:[3,4]},addEventListener:()=>{}},requestAnimationFrame:()=>{},Math};
let source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
source=source.replace('  sizeCanvas();\n  requestAnimationFrame(loop);','  window.__test = {state, step};\n  requestAnimationFrame(loop);');
vm.runInNewContext(source,sandbox);
let random=123456789; const rng=()=>((random=(Math.imul(random,1664525)+1013904223)>>>0)/4294967296);
for(let trial=0;trial<100;trial++) {
 const size=8, s=sandbox.window.__test.state;s.cols=size;s.rows=size;s.cells=new Set();
 for(let q=0;q<size;q++)for(let r=0;r<size;r++)if(rng()<0.4)s.cells.add(H.key(q,r));
 for(let g=0;g<20;g++) { const next=H.step(s.cells,rule,(q,r)=>q>=0&&r>=0&&q<size&&r<size);sandbox.window.__test.step();assert.ok(H.equal(next,s.cells));cases++; }
}
assert.throws(()=>H.makeRule({birth:[0]}),/infinite/);
assert.equal(H.classify(H.makeCells([[0,0]]),rule).kind,'extinct');
const all=H.makeCells([[0,0],...H.OFFSETS]);
for(let i=0;i<10;i++)assert.ok(H.equal(H.step(H.translate(all,70,-99),rule),H.translate(H.step(all,rule),70,-99)));
const callahan=H.makeRule({birth:[2],survive:[3,4],adjacentBirth:true,surviveSeparatedPair:true});
for(let mask=0;mask<64;mask++)for(const live of [false,true]) {
 const c=H.makeCells(H.OFFSETS.filter((_,i)=>mask&(1<<i)));if(live)c.add('0,0');
 const occupied=H.OFFSETS.map((_,i)=>!!(mask&(1<<i))),n=occupied.filter(Boolean).length;
 const special=n===2&&occupied.some((v,i)=>v&&occupied[(i+(live?2:1))%6]);
 assert.equal(H.step(c,callahan).has('0,0'),live?[3,4].includes(n)||special:special);cases++;
}
console.log(`PASS ${cases} neighborhood and actual-app generation comparisons; B0 guard and translation equivariance`);
// Every arrangement override is isotropic, including reflections. Verify the
// modified gun rule independently of its saved lookup bits for all local cases.
const gunRule=H.makeRule({birth:[2,3],survive:[3,4,6],orbitOverrides:[{index:27,value:true}]});
for(let mask=0;mask<64;mask++)for(const live of [false,true]) {
 const ring=H.OFFSETS.map((_,i)=>Boolean(mask&(1<<i))),n=ring.filter(Boolean).length;
 const oppositeEmpty=n===4&&ring.some((v,i)=>!v&&!ring[(i+3)%6]);
 const gate=ring.some((v,i)=>v&&ring[(i+1)%6])&&ring.some((v,i)=>!v&&!ring[(i+1)%6]);
 const expected=live?[3,4,6].includes(n):([2,3].includes(n)&&gate)||oppositeEmpty;
 assert.equal(gunRule.lookup[mask|(live?64:0)],expected);
 for(const rotated of H.orbitMasks(mask))assert.equal(gunRule.lookup[mask|(live?64:0)],gunRule.lookup[rotated|(live?64:0)]);
}
assert.throws(()=>H.makeRule({orbitOverrides:[{index:0,value:true}]}),/infinite/);
assert.throws(()=>H.makeRule({orbitOverrides:[{index:27,value:true},{index:54,value:false}]}),/Conflicting/);
assert.throws(()=>H.makeRule({orbitOverrides:[{index:128,value:true}]}),/override/);
assert.throws(()=>H.makeRule({survive:[1.5]}),/integers/);
console.log('PASS all 128 adjusted-gun local states, dihedral symmetry, and override validation');
