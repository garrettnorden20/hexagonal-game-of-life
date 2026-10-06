/* Targeted audited-gun UI/state checks: node experiments/lab-gun-state-test.js.
   This uses the real sparse engine and the DOM shim, not browser rendering.
   Permanent emission is proved by the independent replay/separation audits.
   This test physically replays the complete 29,136-step new gun cycle, one
   precursor stage, and one UI stage of each earlier 102,000-step gun preset. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const engine=require('./engine.js'),{createLab}=require('./lab-state-test.js');
const read=relative=>JSON.parse(fs.readFileSync(path.join(__dirname,relative),'utf8'));
function readFixture(name){
  const raw=fs.readFileSync(path.join(__dirname,'fixtures',name));
  const manifest=read('fixtures/manifest.json').files[name];
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.sha256);
  const frames=JSON.parse(raw);assert.equal(frames.length,manifest.frameCount);
  assert.deepEqual(frames.map(f=>f.generation),manifest.frameGenerations);return frames;
}
const sort=cells=>cells.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
const hash=cells=>crypto.createHash('sha256').update(JSON.stringify(sort(cells))).digest('hex');
const physical=({camera,outsideView,...state})=>state;
function evolve(coords,rule,n){let cells=engine.makeCells(coords);while(n-->0)cells=engine.step(cells,rule);return engine.coords(cells);}
function outsideCells(state){
  const {scale,center}=state.camera;
  return state.cells.filter(([q,r])=>{
    const x=500+(Math.sqrt(3)*(q+r/2)-center.x)*scale,y=350+(1.5*r-center.y)*scale;
    return x < -scale || x > 1000+scale || y < -scale || y > 700+scale;
  });
}
function runGunStateTests({cameraOnly=false}={}){
  runFasterGunStateTests({cameraOnly});
  const lab=createLab(),{$,snap,select,click,patterns}=lab;
  const cutIndex=patterns.findIndex(p=>p.id==='ongoing-autonomous-gun-609');
  const precursorIndex=patterns.findIndex(p=>p.id==='ongoing-autonomous-gun-600');
  assert(cutIndex>=0&&precursorIndex>=0,'both audited-gun presets must be present');
  const cut=patterns[cutIndex],precursor=patterns[precursorIndex];
  const proof=read(cut.verificationArtifact),audit=read('ongoing/results/factory-feedback-emitter23-separation-audit.json');
  const rule=engine.makeRule(cut.rule),lookup=rule.lookup.map(Number).join('');
  assert.equal(proof.classification,'finite-seed autonomous spaceship gun');
  assert.equal(proof.fullFieldEquality,true);assert.equal(proof.allCellsNaturallyEvolvedAndRetained,true);
  assert.equal(proof.historicalNovelty,'unestablished');
  assert.equal(audit.status,'independent permanent-separation audit passed');
  assert.equal(audit.endpointUnionCellsChecked,true);assert.equal(audit.shipRecurrenceIndependent,true);
  assert.equal(audit.ruleLookupSha256,proof.ruleProvenance.lookupSha256);
  assert.equal(crypto.createHash('sha256').update(lookup).digest('hex'),audit.ruleLookupSha256);
  assert.equal(lookup,proof.ruleProvenance.lookupBits);
  assert.deepEqual(cut.seed,proof.physicalCutCells);assert.deepEqual(precursor.seed,proof.fullSeed);
  assert.equal(hash(cut.seed),proof.physicalCutSha256);assert.equal(hash(precursor.seed),proof.fullOriginalSeedSha256);
  assert.deepEqual(sort([...proof.physicalCutCells,...proof.outputCells]),proof.wholeCycleEndpointCells);
  assert.equal(hash(proof.wholeCycleEndpointCells),proof.endpointSha256);
  assert.equal(proof.sourcePeriod,102000);assert.equal(proof.outputPeriod,61);
  assert.deepEqual(proof.outputTranslation,[3,-4]);assert.equal(proof.spaceshipsPerCycle,1);
  assert.equal(precursor.transient,300);
  for(const p of [cut,precursor]){
    assert.equal(p.kind,'gun');assert.equal(p.auditedGun,true);assert.equal(p.sourceView,true);
    assert.equal(p.period,proof.sourcePeriod);assert.equal(p.macroPeriod,17000);
    assert.equal(engine.makeRule(p.rule).lookup.map(Number).join(''),lookup);
  }
  select('pattern',cutIndex);
  const initial=snap();
  assert.equal(initial.pattern,cut.id,'the earlier audited 609-cell source remains available');
  assert.equal(initial.generation,0);assert.equal(initial.population,609);
  assert.deepEqual(initial.cells,cut.seed);assert.equal(initial.camera.follow,false);
  assert(initial.camera.scale>0.6,'initial source view must fit after the first viewport resize');
  assert.equal(initial.outsideView,0);assert.equal($('canvas-outside').hidden,true);
  assert.equal($('source-view').hidden,false);assert.equal($('stepmacro').hidden,false);
  assert.equal($('stepmacro').textContent,'+17,000');
  assert.match($('canvas-kind').textContent,/VERIFIED GUN/);assert.match($('canvas-period').textContent,/CORE P102000/);
  assert.match($('detail-description').textContent,/102,000/);
  assert.match($('detail-description').textContent,/Historical novelty is unconfirmed/);
  click('source-view');assert.deepEqual(snap(),initial,'default view must match an explicit Source view');

  // Camera controls must neither evolve the field nor interrupt a pending
  // stage. Source view restores the seed's anchor after arbitrary navigation.
  click('stepmacro');const prefix=snap(),pending=lab.pending(),stepCount=lab.counts().physicalSteps;
  assert.equal(prefix.generation,100);assert.equal(pending,1);
  assert.deepEqual(prefix.cells,evolve(cut.seed,rule,100));
  for(const action of ['frame','zoom-in','source-view','source-view']){
    click(action);assert.deepEqual(physical(snap()),physical(prefix),`${action}: physical state is unchanged`);
    assert.equal(lab.counts().physicalSteps,stepCount);assert.equal(lab.pending(),pending);
    assert.equal($('status').textContent,'Advancing');
  }
  assert.deepEqual(snap().camera,initial.camera);
  click('stepmacro');const stopped=snap();lab.drain();assert.deepEqual(snap(),stopped);
  assert.equal(stopped.generation,100);assert.equal(stopped.running,false);
  click('reset');assert.deepEqual(snap(),initial);
  click('run');const running=snap();click('source-view');assert.deepEqual(physical(snap()),physical(running));
  click('run');click('reset');assert.deepEqual(snap(),initial);

  // The alternate preset is the complete original finite precursor. Its
  // natural 300-step transient must reach the exact saved 609-cell cut.
  select('pattern',precursorIndex);assert.equal(snap().population,600);assert.equal(snap().camera.follow,false);
  assert.equal($('stepmacro').textContent,'+17,000');assert.equal($('source-view').hidden,false);
  const beforePrecursor=lab.counts();for(let i=0;i<3;i++)click('step100');
  assert.equal(lab.counts().physicalSteps-beforePrecursor.physicalSteps,300);
  assert.equal(snap().generation,300);assert.deepEqual(snap().cells,proof.physicalCutCells);
  click('source-view');assert.deepEqual(snap().cells,proof.physicalCutCells);
  click('reset');assert.equal(snap().generation,0);assert.deepEqual(snap().cells,proof.fullSeed);
  select('pattern',patterns.findIndex(p=>p.id==='callahan-gun'));
  assert.equal($('source-view').hidden,true);assert.equal($('stepmacro').hidden,true);
  assert.match($('detail-description').textContent,/Callahan/);assert.match($('detail-description').textContent,/4,200/);
  select('pattern',cutIndex);assert.deepEqual(snap(),initial);
  if(cameraOnly){console.log('PASS: earlier audited gun source camera, 300-step precursor, proof provenance, live/queued camera controls, cancellation and reset. Physical 17,000-step frame comparison not run.');return;}

  const frames=readFixture('gun-609-stages.json');
  assert.deepEqual(frames.find(f=>f.generation===300).cells,proof.physicalCutCells);
  assert.deepEqual(frames.find(f=>f.generation===102300).cells,proof.wholeCycleEndpointCells);
  const frame=frames.find(f=>f.generation===17300&&f.relativeToCut===17000);
  assert(frame,'complete naturally evolved absolute generation-17300 visualization frame is required');
  assert.equal(frame.trackedOutput.formed,true);assert.equal(frame.trackedOutput.allPresent,true);
  const expected=sort(frame.cells);
  assert.equal(frame.population,expected.length);
  assert.notDeepEqual(expected,sort(cut.seed.map(([q,r])=>[-r+24,q+r-5])),
    'the open output port breaks whole-world rotational recurrence');
  function checkStage(start){
    const before=lab.counts();click('stepmacro');let generation=snap().generation,chunks=1;
    assert.equal(generation,start+100);assert.equal($('status').textContent,'Advancing');
    while(lab.pending()){
      assert.equal(lab.pending(),1);lab.runNext();chunks++;
      const next=snap().generation;assert(next>generation&&next-generation<=100);generation=next;
    }
    const end=snap();
    assert.equal(end.generation,start+17000);assert.deepEqual(end.cells,expected);
    assert.equal(lab.counts().physicalSteps-before.physicalSteps,17000);
    assert.equal(lab.counts().worldDraws-before.worldDraws,chunks);
    assert.equal(chunks,170);assert.equal(end.running,false);assert.equal($('status').textContent,'Paused');
    assert.equal($('stepmacro').textContent,'+17,000');
    return end;
  }
  let end=checkStage(0);assert.deepEqual(end.camera,initial.camera);
  const outside=outsideCells(end);assert(outside.length>0,'naturally escaped output is outside the source viewport');
  const offscreenKeys=engine.makeCells(outside);
  for(const cell of frame.trackedOutput.cells)assert(offscreenKeys.has(engine.key(...cell)),'every tracked emitted cell remains present offscreen');
  assert.equal(end.outsideView,outside.length);assert.equal($('canvas-outside').hidden,false);
  assert.equal($('canvas-outside').textContent,`${outside.length.toLocaleString()} live cells outside view · all simulated`);
  const endpointState=physical(end),endpointCount=lab.counts().physicalSteps;
  click('frame');assert.deepEqual(physical(snap()),endpointState);assert.notDeepEqual(snap().camera,initial.camera);
  assert.equal(snap().outsideView,0,'Fit view must include the escaping output as well as the source');
  const fittedScale=snap().camera.scale;
  click('zoom-in');assert.deepEqual(physical(snap()),endpointState);
  assert(Math.abs(snap().camera.scale-fittedScale*1.25)<1e-12,'zoom in must remain gradual below the old 0.6 floor');
  click('zoom-out');assert.deepEqual(physical(snap()),endpointState);
  assert(Math.abs(snap().camera.scale-fittedScale)<1e-12);
  click('source-view');assert.deepEqual(physical(snap()),endpointState);assert.deepEqual(snap().camera,initial.camera);
  click('zoom-in');assert.deepEqual(physical(snap()),endpointState);
  click('source-view');assert.deepEqual(physical(snap()),endpointState);
  assert.equal(lab.counts().physicalSteps,endpointCount);
  click('step');end=snap();assert.equal(end.generation,17001);
  assert.deepEqual(end.cells,evolve(expected,rule,1),'offscreen output remains in the evolving full field');
  assert(outsideCells(end).length>0);assert.equal(end.outsideView,outsideCells(end).length);
  click('reset');assert.deepEqual(snap(),initial);
  select('pattern',precursorIndex);for(let i=0;i<3;i++)click('step100');
  assert.deepEqual(snap().cells,proof.physicalCutCells);checkStage(300);
  click('source-view');assert.deepEqual(snap().cells,expected);
  click('reset');assert.equal(snap().generation,0);assert.deepEqual(snap().cells,proof.fullSeed);
  // A far-field camera fixture uses the independently saved full-cycle field.
  // This verifies its display and one next physical step, not a UI replay of
  // the preceding 102,000 generations.
  const far=createLab([{id:'test-complete-gun-boundary',name:'Complete gun boundary framing fixture',kind:'gun',
    seed:proof.wholeCycleEndpointCells,rule:cut.rule,period:proof.sourcePeriod,translation:[0,0]}]);
  far.select('pattern',far.patterns.length-1);
  assert.deepEqual(far.snap().cells,proof.wholeCycleEndpointCells);assert.equal(far.snap().outsideView,0);
  assert(far.snap().camera.scale<0.1,'very distant output must still fit');
  const farBefore=physical(far.snap());far.click('frame');assert.deepEqual(physical(far.snap()),farBefore);
  far.click('step');assert.deepEqual(far.snap().cells,evolve(proof.wholeCycleEndpointCells,rule,1));
  far.click('frame');assert.equal(far.snap().outsideView,0);
  console.log(`PASS: both audited gun presets: 17,000 physical steps each in 170 cancellable chunks match the complete saved frame; ${outside.length} offscreen live cells retained, camera-only source/fit/zoom controls, complete distant-output framing, exact 300-step precursor and reset. Full-period/permanent-emission claims remain grounded in the independent audits.`);
}
function runFasterGunStateTests({cameraOnly=false}={}){
  const lab=createLab(),{$,snap,select,click,patterns}=lab;
  assert.equal(patterns.length,62,'all 60 earlier presets plus two distinct new gun presets');
  const cutIndex=patterns.findIndex(p=>p.id==='ongoing-autonomous-gun-254');
  const precursorIndex=patterns.findIndex(p=>p.id==='ongoing-autonomous-gun-245');
  assert(cutIndex>=0&&precursorIndex>=0);
  const cut=patterns[cutIndex],precursor=patterns[precursorIndex],proof=read(cut.verificationArtifact);
  const rule=engine.makeRule(cut.rule),lookup=rule.lookup.map(Number).join('');
  assert.equal(proof.classification,'finite-seed autonomous spaceship gun');
  assert.equal(proof.fullFieldEquality,true);assert.equal(proof.allCellsNaturallyEvolvedAndRetained,true);
  assert.equal(proof.historicalNovelty,'unestablished');
  assert.equal(lookup,proof.ruleProvenance.lookupBits);
  assert.equal(crypto.createHash('sha256').update(lookup).digest('hex'),proof.ruleProvenance.lookupSha256);
  assert.equal(hash(cut.seed),proof.physicalCutSha256);assert.equal(hash(precursor.seed),proof.fullOriginalSeedSha256);
  assert.deepEqual(cut.seed,proof.physicalCutCells);assert.deepEqual(precursor.seed,proof.fullSeed);
  assert.equal(hash(proof.wholeCycleEndpointCells),proof.endpointSha256);
  assert.equal(hash(proof.outputCells),proof.outputSha256);
  assert.deepEqual(sort([...cut.seed,...proof.outputCells]),proof.wholeCycleEndpointCells);
  assert.equal(proof.sourcePeriod,29136);assert.equal(proof.outputPeriod,61);
  assert.deepEqual(proof.outputTranslation,[-3,-1]);assert.equal(proof.spaceshipsPerCycle,1);
  assert.equal(proof.permanentEscape.all61OutputPhasesChecked,true);
  assert(proof.permanentEscape.minimumCoordinateGap>2);
  assert(proof.permanentEscape.allOlderOutputPairGapLowerBound>2);
  assert.deepEqual(evolve(proof.outputCells,rule,61),sort(proof.outputCells.map(([q,r])=>[q-3,r-1])));
  for(const p of [cut,precursor]){
    assert.equal(p.kind,'gun');assert.equal(p.auditedGun,true);assert.equal(p.sourceView,true);
    assert.equal(p.period,29136);assert.equal(p.emissionInterval,29136);assert.equal(p.macroPeriod,9712);
    assert.equal(p.outputPeriod,61);assert.deepEqual(p.outputTranslation,[-3,-1]);
    assert.equal(engine.makeRule(p.rule).lookup.map(Number).join(''),lookup);
  }
  assert.equal(precursor.transient,300);
  const initial=snap();
  assert.equal(initial.pattern,cut.id,'the 254-cell source is the new default');
  assert.equal(initial.population,254);assert.equal(initial.generation,0);
  assert.deepEqual(initial.cells,proof.physicalCutCells);assert.equal(initial.camera.follow,false);
  assert(initial.camera.scale>0.6);assert.equal(initial.outsideView,0);
  assert.equal($('source-view').hidden,false);assert.equal($('stepmacro').hidden,false);
  assert.equal($('stepmacro').textContent,'+9,712');assert.equal($('rule-preset').value,'p61');
  assert.equal($('canvas-period').textContent,'EMISSION 29,136 · SHIP P61');
  assert.match($('pattern-tags').textContent,/emits every 29,136 steps/);
  assert.match($('rule-caption').textContent,/original \+ B4p \+ S6 · B2o3om4p\/S346H/);
  assert.match($('detail-description').textContent,/61-step ship motion is distinct from the 29,136-step emission interval/);
  assert.match($('detail-description').textContent,/Historical novelty is unconfirmed/);
  select('rule-preset','original');assert.equal(snap().verified,false);
  select('rule-preset','p61');assert.deepEqual(snap(),initial,'same-seed rule switching restores the verified gun');

  // Source/Fit/Zoom/Follow and interrupted pointer drags are camera actions,
  // even during a queued stage. None may alter or stop physical evolution.
  click('stepmacro');const prefix=snap(),prefixCounts=lab.counts().physicalSteps;
  assert.equal(prefix.generation,100);assert.deepEqual(prefix.cells,evolve(cut.seed,rule,100));
  const cameraActions=[
    ['fit',()=>click('frame')],['zoom',()=>click('zoom-in')],
    ['follow',()=>{$('follow').checked=true;$('follow').fire('change');}],
    ['wheel',()=>$('world').fire('wheel',{preventDefault(){},deltaY:100,clientX:430,clientY:280})],
    ['cancelled drag',()=>{$('world').fire('pointerdown',{button:0,pointerId:1,clientX:500,clientY:350});$('world').fire('pointermove',{clientX:540,clientY:385});$('world').fire('pointercancel');$('world').fire('pointerup',{clientX:540,clientY:385});}],
    ['source',()=>click('source-view')],['repeated source',()=>click('source-view')],
  ];
  for(const [name,action] of cameraActions){
    action();assert.deepEqual(physical(snap()),physical(prefix),`${name}: camera action preserves the whole field`);
    assert.equal(lab.counts().physicalSteps,prefixCounts);assert.equal(lab.pending(),1);
    assert.equal($('status').textContent,'Advancing');
  }
  assert.deepEqual(snap().camera,initial.camera);
  click('stepmacro');const stopped=snap();lab.drain();assert.deepEqual(snap(),stopped);
  click('reset');assert.deepEqual(snap(),initial);

  const cancellationActions=[
    ['stop',()=>click('stepmacro')],['reset',()=>click('reset')],
    ['preset',()=>select('pattern',patterns.findIndex(p=>p.id==='original-p2'))],
    ['rule preset',()=>select('rule-preset','original')],
    ['apply rule',()=>{$('birth').value='2';$('survive').value='35';click('apply');}],
    ['run',()=>click('run')],['step',()=>click('step')],
    ['+100',()=>click('step100')],['+1000',()=>click('step1000')],
    ['reload',()=>click('reload-pattern')],['clear',()=>click('clear')],['random soup',()=>click('random')],
    ['cell edit',()=>{$('world').fire('pointerdown',{button:0,pointerId:1,clientX:500,clientY:350});$('world').fire('pointerup',{clientX:500,clientY:350});}],
  ];
  for(const [name,action] of cancellationActions){
    select('pattern',cutIndex);click('stepmacro');assert.deepEqual(snap().cells,prefix.cells);assert.equal(lab.pending(),1);
    action();const interrupted=snap(),counts=lab.counts();
    assert.notEqual($('status').textContent,'Advancing',`${name}: stop the queued advance`);
    assert.equal(interrupted.running,name==='run');
    lab.drain();assert.deepEqual(snap(),interrupted,`${name}: stale callback preserves the new state`);
    assert.deepEqual(lab.counts(),counts,`${name}: stale callback cannot step or draw`);
  }
  select('pattern',cutIndex);click('stepmacro');click('reset');click('stepmacro');
  assert.equal(lab.pending(),2);const restarted=snap(),restartCounts=lab.counts();
  lab.runNext();assert.deepEqual(snap(),restarted);assert.deepEqual(lab.counts(),restartCounts);
  assert.equal($('status').textContent,'Advancing');lab.runNext();assert.equal(snap().generation,200);
  assert.deepEqual(snap().cells,evolve(prefix.cells,rule,100));click('reset');lab.drain();assert.deepEqual(snap(),initial);

  select('pattern',precursorIndex);assert.equal(snap().population,245);
  const before=lab.counts().physicalSteps;for(let i=0;i<3;i++)click('step100');
  assert.equal(lab.counts().physicalSteps-before,300);assert.equal(snap().generation,300);
  assert.deepEqual(snap().cells,proof.physicalCutCells);
  click('reset');assert.deepEqual(snap().cells,proof.fullSeed);assert.equal(snap().generation,0);
  if(cameraOnly){console.log('PASS: faster gun provenance, default, explicit rule/emission labels, 13 cancellation actions, queued camera controls, exact 300-step precursor and reset. Full-cycle UI replay not run.');return;}

  const frames=readFixture('gun-254-stages.json');
  assert.deepEqual(frames.find(f=>f.generation===0).cells,precursor.seed);
  assert.deepEqual(frames.find(f=>f.generation===300).cells,cut.seed);
  assert.deepEqual(frames.find(f=>f.generation===29436).cells,proof.wholeCycleEndpointCells);
  function checkStage(start,frame){
    assert.equal(snap().generation,start);const before=lab.counts();click('stepmacro');
    let generation=snap().generation,chunks=1;assert.equal(generation,start+100);
    while(lab.pending()){
      assert.equal(lab.pending(),1);lab.runNext();chunks++;
      const next=snap().generation;assert(next>generation&&next-generation<=100);
      if(!lab.pending())assert.equal(next-generation,12,'final stage chunk must compute the last 12 physical generations');
      generation=next;
    }
    const end=snap();assert.equal(end.generation,start+9712);assert.deepEqual(end.cells,frame.cells);
    assert.equal(end.population,frame.population);assert.equal(lab.counts().physicalSteps-before.physicalSteps,9712);
    assert.equal(chunks,98);assert.equal(lab.counts().worldDraws-before.worldDraws,98);
    assert.equal(end.running,false);assert.equal($('status').textContent,'Paused');
    assert.equal($('stepmacro').textContent,'+9,712');assert(frame.trackedOutput.formed&&frame.trackedOutput.allPresent);
    const outside=outsideCells(end),outsideKeys=engine.makeCells(outside);
    for(const cell of frame.trackedOutput.cells)assert(outsideKeys.has(engine.key(...cell)),'all escaping output cells remain present offscreen');
    assert.equal(end.outsideView,outside.length);assert.equal($('canvas-outside').hidden,false);
    return end;
  }
  select('pattern',cutIndex);
  for(let stage=1;stage<=3;stage++){
    const frame=frames.find(f=>f.generation===300+9712*stage);assert(frame,'complete natural stage frame required');
    const end=checkStage((stage-1)*9712,frame);assert.deepEqual(end.camera,initial.camera);
  }
  const endpoint=snap();assert.deepEqual(endpoint.cells,proof.wholeCycleEndpointCells);assert.equal(endpoint.population,277);
  const outputKeys=engine.makeCells(proof.outputCells);assert.equal(outsideCells(endpoint).filter(c=>outputKeys.has(engine.key(...c))).length,23);
  const state=physical(endpoint),count=lab.counts().physicalSteps;
  click('frame');assert.deepEqual(physical(snap()),state);assert.equal(snap().outsideView,0);
  const fittedScale=snap().camera.scale;assert(fittedScale<0.6,'Fit must include the distant output below the old zoom floor');
  click('zoom-in');assert.deepEqual(physical(snap()),state);assert(Math.abs(snap().camera.scale-fittedScale*1.25)<1e-12);
  click('zoom-out');assert.deepEqual(physical(snap()),state);assert(Math.abs(snap().camera.scale-fittedScale)<1e-12);
  click('source-view');assert.deepEqual(physical(snap()),state);assert.deepEqual(snap().camera,initial.camera);
  assert.equal(lab.counts().physicalSteps,count);click('step');
  assert.deepEqual(snap().cells,evolve(endpoint.cells,rule,1),'full endpoint, including escaped output, advances naturally');
  assert.equal(snap().outsideView,outsideCells(snap()).length);click('reset');assert.deepEqual(snap(),initial);
  select('pattern',precursorIndex);for(let i=0;i<3;i++)click('step100');
  checkStage(300,frames.find(f=>f.generation===10012));click('reset');assert.deepEqual(snap().cells,proof.fullSeed);
  console.log('PASS: faster gun complete 29,136-step cycle (three 9,712-step stages), precursor stage, 277-cell full endpoint with all 23 emitted cells retained, exact saved frames, camera-only controls, 13 cancellation actions and stale/new timer isolation. All 62 presets remain available.');
}
module.exports={runGunStateTests,runFasterGunStateTests};
if(require.main===module)runGunStateTests({cameraOnly:process.argv.includes('--camera-only')});
