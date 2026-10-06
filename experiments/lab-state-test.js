/* DOM-shim state checks, runnable without a browser: node experiments/lab-state-test.js.
   This verifies event/state logic, not rendering. The targeted audited-gun
   checks in lab-gun-state-test.js are included in this aggregate run. */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const engine=require('./engine.js');
const html=fs.readFileSync(path.join(__dirname,'lab.html'),'utf8');
function createLab(extraPatterns=[]) {
  const nodes=new Map(), timers=new Map(), frames=[];
  let timerId=0, physicalSteps=0, worldDraws=0;
  class Element {
    constructor(id='',tag='DIV'){this.id=id;this.tagName=tag;this._text='';this.value='';this.checked=false;this.hidden=false;this.handlers={};this.children=[];this.style={};this.classList={add(){},remove(){}};this.parentElement={getBoundingClientRect:()=>({width:1000,height:700})};}
    get textContent(){return this._text+this.children.map(x=>x.textContent||'').join('');}
    set textContent(v){this._text=String(v);this.children=[];}
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
    fire(type,event={}){for(const fn of this.handlers[type]||[])fn(event);}
    click(){this.fire('click');}
    setAttribute(k,v){this[k]=v;}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this._text='';this.children=children;}
    querySelector(selector){return this[selector]??=(new Element());}
    getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:this.id==='sparkline'?180:1000,height:this.id==='sparkline'?58:700};}
    getContext(){return new Proxy({},{get:(_,key)=>()=>{if(this.id==='world'&&key==='clearRect')worldDraws++;},set:()=>true});}
    setPointerCapture(){}
  }
  for(const m of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const e=new Element(m[3],m[1].toUpperCase()),v=m[2].match(/\bvalue="([^"]*)"/);if(v)e.value=v[1];e.checked=/\bchecked\b/.test(m[2]);e.hidden=/\bhidden\b/.test(m[2]);nodes.set(m[3],e);}
  const document={getElementById:id=>{assert(nodes.has(id),`unknown element ${id}`);return nodes.get(id)},createElement:tag=>new Element('',tag),createTextNode:text=>({textContent:text}),addEventListener(){},activeElement:{tagName:'BODY'}};
  // Queue chunks instead of immediately recursing. Toasts have a separate 2300 ms
  // delay and must never be mistaken for pending simulation work.
  const context={window:null,document,HexLife:{...engine,step(...args){physicalSteps++;return engine.step(...args);}},requestAnimationFrame(fn){frames.push(fn);},ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},setTimeout(fn,delay=0){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},console};
  context.window=context;context.devicePixelRatio=1;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'patterns.js'),'utf8'),context);
  context.HEX_PATTERNS.push(...extraPatterns);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  const $=id=>nodes.get(id),snap=()=>JSON.parse(JSON.stringify(context.hexLab.snapshot())),select=(id,value)=>{$(id).value=String(value);$(id).fire('change');},click=id=>$(id).click();
  const pending=(delay=0)=>[...timers.values()].filter(t=>t.delay===delay).length;
  function runNext(delay=0){const entry=[...timers].find(([,t])=>t.delay===delay);assert(entry,`no timer queued for delay ${delay}`);timers.delete(entry[0]);entry[1].fn();}
  function drain(){let count=0;while(pending()){assert(++count<1000,'chunk queue did not settle');runNext();}return count;}
  function runFrame(time){assert(frames.length,'no animation frame queued');frames.shift()(time);}
  return {$,snap,select,click,pending,runNext,drain,runFrame,counts:()=>({physicalSteps,worldDraws}),patterns:JSON.parse(JSON.stringify(context.HEX_PATTERNS))};
}
module.exports={createLab,runStateTests};
function runStateTests(){
const lab=createLab(),{$,snap,select,click,patterns}=lab;
for(const [id,period,macroPeriod,population] of [
  ['ongoing-circulating-p102000',102000,17000,627],
  ['ongoing-circulating-p102048',102048,17008,639],
]){
  const p=patterns.find(pattern=>pattern.id===id);assert(p,`missing circuit preset ${id}`);
  assert.equal(p.period,period);assert.equal(p.macroPeriod,macroPeriod);assert.equal(p.seed.length,population);
}
const sorted=coords=>coords.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
const affine=coords=>sorted(coords.map(([q,r])=>[-r+24,q+r-5]));
const evolve=(coords,rule,n)=>{let cells=engine.makeCells(coords);while(n-->0)cells=engine.step(cells,rule);return engine.coords(cells);};
function checkMacroPreset(p,initial){
  assert.equal(p.kind,'oscillator','rotation certificates only apply to the closed oscillator presets');
  const proof=JSON.parse(fs.readFileSync(path.join(__dirname,p.verificationArtifact),'utf8'));
  assert.equal(p.period,proof.fundamentalPeriod);
  assert.equal(p.macroPeriod,proof.macroDuration);
  assert.deepEqual(initial.cells,proof.physicalCutCells,`${p.id}: complete independently verified seed`);
  assert.equal(engine.makeRule(p.rule).lookup.map(Number).join(''),proof.ruleProvenance.lookupBits);
  assert.deepEqual(affine(initial.cells),proof.independentMacroCells||proof.macroEndpointCells);
  return checkPhysicalMacro(p,initial,affine(initial.cells),'independent rotation certificate');
}
function checkPhysicalMacro(p,initial,expected,source){
  assert.equal($('stepmacro').hidden,false);
  assert.match($('stepmacro').textContent,new RegExp(p.macroPeriod.toLocaleString()));
  assert.equal(lab.pending(),0);
  const before=lab.counts();
  click('stepmacro');
  let generation=snap().generation,chunks=1;
  assert(generation>0&&generation<=100,'the first chunk must yield control');
  assert.equal($('status').textContent,'Advancing');
  assert.equal($('stepmacro').textContent,'Stop advance');
  assert.equal(snap().running,false);
  while(lab.pending()){
    assert.equal(lab.pending(),1,'only one continuation may be queued');
    lab.runNext();chunks++;
    const next=snap().generation;
    assert(next>generation&&next-generation<=100,'each continuation must yield after at most 100 generations');
    generation=next;
  }
  const end=snap(),after=lab.counts();
  assert.equal(generation,p.macroPeriod,'including the partial final chunk');
  assert.equal(after.physicalSteps-before.physicalSteps,p.macroPeriod,'every generation must use the physical engine');
  assert.equal(after.worldDraws-before.worldDraws,chunks,'draw once per chunk, not once per generation');
  assert.deepEqual(end.cells,expected,`${p.id}: exact full-field macro endpoint from ${source}`);
  assert.equal($('status').textContent,'Paused');
  assert.equal($('stepmacro').textContent,`+${p.macroPeriod.toLocaleString()}`);
  assert.equal(end.running,false);
  // The independent artifacts prove fundamental full periods. This UI test
  // replays one entire physical stage; it does not synthesize six UI stages.
  console.log(`PASS: ${p.id}: ${generation} physical steps, ${chunks} responsive chunks, exact full-field endpoint (${source}).`);
  return end;
}
for(let i=0;i<patterns.length;i++){
  const p=patterns[i];select('pattern',i);const initial=snap();assert.equal(initial.generation,0);assert.equal(initial.population,p.seed.length);assert(initial.verified);
  // The audited source and precursor have distinct whole-field gun checks
  // below; neither is a rotational oscillator or Callahan's published gun.
  if(p.auditedGun){assert.equal(p.kind,'gun');continue;}
  if(p.macroPeriod){checkMacroPreset(p,initial);click('reset');assert.deepEqual(snap().cells,initial.cells);assert.equal(snap().generation,0);continue;}
  assert.equal($('stepmacro').hidden,true);
  for(let g=0;g<(p.transient||0);g++)click('step');const periodicOrigin=snap();for(let g=0;g<p.period;g++)click('step');const evolved=snap();assert.equal(evolved.generation,p.period+(p.transient||0));
  if(p.kind==='gun'){assert.equal(p.id,'callahan-gun','new guns require their own complete-state emission audit');assert.equal(evolved.population,p.seed.length+6);assert.match($('canvas-period').textContent,/CORE/);assert.match($('detail-description').textContent,/4,200/);}else if(p.kind==='wick-stretcher'){assert.match($('canvas-period').textContent,/HEAD P8/);assert.match($('detail-description').textContent,/growing full state never repeats/);}else if(!p.kind||['spaceship','oscillator','still-life'].includes(p.kind))assert.deepEqual(evolved.cells,periodicOrigin.cells.map(([q,r])=>[q+p.translation[0],r+p.translation[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
  click('reset');assert.deepEqual(snap().cells,initial.cells);assert.equal(snap().generation,0);
}
const converterIndex=patterns.findIndex(p=>p.id==='ongoing-triggered-converter');
if(converterIndex>=0){const audit=require('./ongoing/results/factory-shuttle-trigger-repeatability.json').results[0],tap=require('./ongoing/results/factory-shuttle-taps-verified.json').results[0];select('pattern',converterIndex);assert.match($('canvas-period').textContent,/SOURCE P700/);assert.match($('detail-description').textContent,/externally supplied/);let output=engine.makeCells(tap.extraOutput.cells),rule=engine.makeRule(patterns[converterIndex].rule);for(let g=tap.certifiedSplitGeneration;g<700;g++)output=engine.step(output,rule);const expected=engine.coords(new Set([...engine.makeCells(audit.sourceCells),...output]));for(let g=0;g<700;g++)click('step');assert.deepEqual(snap().cells,expected);assert.equal(snap().population,audit.boundaries[0].population);click('reset');assert.deepEqual(snap().cells,patterns[converterIndex].seed);}
const compactConverter=patterns.findIndex(p=>p.id==='ongoing-p90-triggered-converter');
if(compactConverter>=0){const proof=require('./ongoing/results/growth-loop-p4-converters-verified.json').results.find(x=>x.sourceTrial===59571),rule=engine.makeRule(patterns[compactConverter].rule);select('pattern',compactConverter);assert.equal(snap().population,24);assert.match($('canvas-period').textContent,/SOURCE P90/);let source=engine.makeCells(proof.loopSeed),output=engine.makeCells(proof.outputAtDecomposition);for(let g=0;g<180;g++)source=engine.step(source,rule);for(let g=proof.earliestPersistentFullDecomposition;g<180;g++)output=engine.step(output,rule);for(let g=0;g<180;g++)click('step');assert.deepEqual(snap().cells,engine.coords(new Set([...source,...output])));click('reset');assert.equal(snap().population,24);}
const gunIndex=patterns.findIndex(p=>p.id==='callahan-gun');assert(gunIndex>=0,'the published-reference gun remains available');select('pattern',gunIndex);for(let i=0;i<252;i++)click('step');assert.equal(snap().population,patterns[gunIndex].seed.length+6*6);assert.equal(snap().generation,252);assert.match($('canvas-period').textContent,/CORE/);click('reset');assert.equal(snap().generation,0);
const sixIndex=patterns.findIndex(p=>p.id==='discovery-six-ship');
if(sixIndex>=0){select('pattern',sixIndex);const originalSix=snap().cells;select('rule-preset','original');assert.equal(snap().pattern,'discovery-six-original');assert.deepEqual(snap().cells,originalSix);assert.equal($('birth4p').checked,false);select('rule-preset','discovery');assert.equal(snap().pattern,'discovery-six-ship');assert.deepEqual(snap().cells,originalSix);assert.equal($('birth4p').checked,true);$('birth4p').checked=false;click('apply');assert.equal(snap().pattern,'discovery-six-original');assert.deepEqual(snap().cells,originalSix);}
select('rule-preset','callahan');assert.equal(snap().rule.surviveSeparatedPair,true);assert.equal($('separated').checked,true);
$('birth').value='0';click('apply');assert.match($('rule-error').textContent,/infinite live background/);assert.deepEqual(snap().rule.birth,[2]);
$('birth').value='7';click('apply');assert.match($('rule-error').textContent,/counts 0/);
select('rule-preset','spaceship');assert.equal(snap().rule.surviveSeparatedPair,false);assert.equal(snap().rule.adjacentBirth,false);
click('random');const random=snap();assert(random.population>0);assert.equal(random.generation,0);assert.equal(random.verified,false);click('step');click('step');click('reset');assert.deepEqual(snap().cells,random.cells);assert.equal(snap().generation,0);
click('clear');assert.equal(snap().population,0);assert.equal($('status').textContent,'Empty');
$('world').fire('pointerdown',{button:0,pointerId:1,clientX:500,clientY:350});$('world').fire('pointerup',{clientX:500,clientY:350});assert.equal(snap().population,1);assert.equal(snap().generation,0);click('reset');assert.equal(snap().population,1);
click('run');assert(snap().running);click('run');assert(!snap().running);click('zoom-in');assert.equal($('follow').checked,false);click('reload-pattern');assert(snap().verified);assert.equal(snap().generation,0);
const fastIndex=patterns.findIndex(p=>p.id==='ongoing-logic-NOR-11');if(fastIndex>=0){select('pattern',fastIndex);let expected=engine.makeCells(patterns[fastIndex].seed),r=engine.makeRule(patterns[fastIndex].rule);for(let g=0;g<100;g++)expected=engine.step(expected,r);click('step100');assert.equal(snap().generation,100);assert.deepEqual(snap().cells,engine.coords(expected));for(let g=0;g<1000;g++)expected=engine.step(expected,r);click('step1000');assert.equal(snap().generation,1100);assert.deepEqual(snap().cells,engine.coords(expected));click('reset');assert.equal(snap().generation,0);}
// Each action must invalidate a queued macro continuation. Use the audited
// gun for cancellation, checking its complete evolved prefix against the engine.
const macroIndex=patterns.findIndex(p=>p.id==='ongoing-autonomous-gun-609');
assert(macroIndex>=0,'the audited gun preset is required');
const macro=patterns[macroIndex],macroRule=engine.makeRule(macro.rule);
const firstChunk=evolve(macro.seed,macroRule,100);
const cancellationActions=[
  ['stop',()=>click('stepmacro')],
  ['reset',()=>click('reset')],
  ['preset',()=>select('pattern',patterns.findIndex(p=>p.id==='original-p2'))],
  ['rule preset',()=>select('rule-preset','original')],
  ['apply rule',()=>{$('birth').value='2';$('survive').value='35';click('apply');}],
  ['run',()=>click('run')],
  ['step',()=>click('step')],
  ['+100',()=>click('step100')],
  ['+1000',()=>click('step1000')],
  ['reload',()=>click('reload-pattern')],
  ['clear',()=>click('clear')],
  ['random soup',()=>click('random')],
  ['cell edit',()=>{$('world').fire('pointerdown',{button:0,pointerId:1,clientX:500,clientY:350});$('world').fire('pointerup',{clientX:500,clientY:350});}],
];
for(const [label,action] of cancellationActions){
  select('pattern',macroIndex);click('stepmacro');
  assert.equal(snap().generation,100);
  assert.deepEqual(snap().cells,firstChunk);
  assert.equal(lab.pending(),1);
  action();
  const interrupted=snap(),counts=lab.counts();
  assert.notEqual($('status').textContent,'Advancing',`${label}: advance must stop`);
  assert.equal(snap().running,label==='run');
  assert.notEqual($('stepmacro').textContent,'Stop advance');
  if(['preset','rule preset','apply rule','clear','random soup','cell edit'].includes(label)){
    assert.equal($('stepmacro').hidden,true,`${label}: hide macro control for a different or custom seed`);
    assert.equal($('source-view').hidden,true,`${label}: hide source framing for a different or custom seed`);
  }
  lab.drain();
  assert.deepEqual(snap(),interrupted,`${label}: stale timer must not mutate state`);
  assert.deepEqual(lab.counts(),counts,`${label}: stale timer must not step or redraw`);
  if(label==='run'){
    $('speed').value='8';$('speed').fire('input');
    lab.runFrame(125);
    assert.equal(snap().generation,interrupted.generation+1,'normal animation resumes after cancelling a macro');
    assert.deepEqual(snap().cells,evolve(interrupted.cells,macroRule,1));
    click('run');
  }
}
// A cancelled callback cannot cancel or advance a newer operation, even if it
// is already queued when the user starts the new operation.
select('pattern',macroIndex);click('stepmacro');click('reset');click('stepmacro');
assert.equal(lab.pending(),2);const restarted=snap(),restartCounts=lab.counts();
lab.runNext();assert.deepEqual(snap(),restarted);assert.deepEqual(lab.counts(),restartCounts);
assert.equal($('status').textContent,'Advancing');assert.equal(lab.pending(),1);
lab.runNext();assert.equal(snap().generation,200);assert.deepEqual(snap().cells,evolve(firstChunk,macroRule,100));
click('stepmacro');lab.drain();assert.equal(snap().generation,200);
// Delayed toast timers are independent of macro timers and cannot evolve cells.
assert(lab.pending(2300)>0);const beforeToast=snap();lab.runNext(2300);assert.deepEqual(snap(),beforeToast);
// Exercise natural self-stops with real cellular evolution. The sparse copies
// are farther apart than a one-generation neighborhood, so their population
// increase is independently predictable and no cells may be clipped or culled.
const growing=patterns.find(p=>p.id==='variant-p57');
const capSeed=Array.from({length:2778},(_,copy)=>growing.seed.map(([q,r])=>[q+30*copy,r])).flat();
const safetyFixtures=[
  {id:'test-macro-extinction',name:'Macro extinction fixture',kind:'oscillator',seed:[[0,0]],period:1,macroPeriod:205,translation:[0,0],rule:patterns.find(p=>p.id==='original-p2').rule},
  {id:'test-macro-population-limit',name:'Macro population limit fixture',kind:'oscillator',seed:capSeed,period:57,macroPeriod:205,translation:[0,0],rule:growing.rule},
];
for(const fixture of safetyFixtures){
  const safety=createLab([fixture]);safety.select('pattern',safety.patterns.length-1);
  const before=safety.counts(),expected=evolve(fixture.seed,engine.makeRule(fixture.rule),1);
  safety.click('stepmacro');
  assert.equal(safety.snap().generation,1,`${fixture.id}: stop at the first unsafe or extinct state`);
  assert.deepEqual(safety.snap().cells,expected,`${fixture.id}: retain the complete physical state`);
  assert.equal(safety.counts().physicalSteps-before.physicalSteps,1);
  assert.equal(safety.counts().worldDraws-before.worldDraws,1,`${fixture.id}: render the final state before returning`);
  assert.equal(safety.pending(),0,`${fixture.id}: do not schedule further evolution`);
  assert.equal(safety.snap().running,false);
  assert.equal(safety.$('status').textContent,expected.length?'Paused':'Empty');
  assert.notEqual(safety.$('stepmacro').textContent,'Stop advance');
  if(expected.length){assert.equal(expected.length,50004);assert.match(safety.$('toast').textContent,/All cells are retained/);}
}
require('./lab-gun-state-test.js').runGunStateTests();
console.log(`PASS: ${patterns.length} presets, oscillator recurrence, separately audited and published gun behavior, full physical macro stages, reset, advanced rules, validation, soup, editing, run/pause, zoom state, reload, ${cancellationActions.length} cancellation actions, stale/new timer isolation, and physical extinction/population-limit stops. DOM shim only; visual rendering requires browser QA.`);
}
if(require.main===module)runStateTests();
