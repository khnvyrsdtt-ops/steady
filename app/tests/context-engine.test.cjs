const {test}=require('node:test');
const assert=require('node:assert/strict');
// The engine borrows the clock's part boundaries from the global, exactly as it
// does in the app where both are plain script tags. Install it before requiring.
global.SteadyRhythm=require('../public/rhythm.js');
const R=global.SteadyRhythm;
const C=require('../public/context-engine.js');
const G=require('../public/guidance.js');

const HOUR=(hour)=>{const d=new Date();d.setHours(hour,0,0,0);return d;};
const at=(hour,fn)=>{R.setNow(()=>HOUR(hour));try{return fn();}finally{R.setNow(null);}};
const stepIds=need=>new Set(G.catalog.filter(item=>item.need===need).map(item=>item.id));
// A person who has done "progress" steps in the morning, on separate days.
const morningPerson=(hours=[9])=>Object.fromEntries(
  ['2026-09-01','2026-09-02','2026-09-03','2026-09-04'].map((date,index)=>
    [date,{actionLog:hours.map(h=>({id:'progress-start',at:new Date(`${date}T${String(h).padStart(2,'0')}:20:00`).toISOString()}))}]));
// The same person, but with an action logged a moment ago.
const justActed=(date,hour,minute)=>[date,{actionLog:[{id:'progress-start',at:new Date(`${date}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`).toISOString()}]}];

const assess=(hour,opts={})=>at(hour,()=>C.assess({moment:R.moment(morningPerson(),{need:opts.need||'progress'}),need:opts.need||'progress',catalog:G.catalog,days:opts.days===undefined?morningPerson():opts.days,day:opts.day||{},now:opts.now||HOUR(hour)}));

test('position is only claimed from the person’s own history',()=>{
  // No history at all, mid-morning: unknown, and therefore silent. Nothing about
  // their schedule can be claimed, and the step is left at its normal size.
  const blank=at(10,()=>C.assess({moment:R.moment({},{need:'progress'}),need:'progress',catalog:G.catalog,days:{},day:{},now:HOUR(10)}));
  assert.equal(blank.position,null);
  assert.equal(blank.known,false);
  assert.equal(blank.note,'','no history means no comment');
  assert.equal(blank.capacity,'normal','and no change to how big the step may be');

  // A quiet hour still asks for a light step with no history at all, because that
  // is about capacity rather than about anybody's schedule. Being awake at 11pm is
  // never treated as a problem; it just means less is being asked of them.
  const quiet=at(22,()=>C.assess({moment:R.moment({},{need:'progress'}),need:'progress',catalog:G.catalog,days:{},day:{},now:HOUR(22)}));
  assert.equal(quiet.position,null);
  assert.equal(quiet.known,false);
  assert.equal(quiet.note,'');
  assert.equal(quiet.capacity,'light');
});

test('a normal hour is left alone',()=>{
  const normal=assess(9);
  assert.equal(normal.position,'ontime');
  assert.equal(normal.note,'');
  assert.equal(normal.capacity,'normal');
});

test('being late recalculates from now and never mentions what was missed',()=>{
  const late=assess(21);
  assert.equal(late.position,'late');
  assert.equal(late.capacity,'light','a small step is the recalculated answer');
  assert.match(late.note,/^It is 9pm\./);
  // The wording may say the shape moved on, never that time was lost or squandered.
  assert.ok(!/miss|missed|late again|waste|lost|behind|should have|failed|too late|day is|fell apart|ruined/i.test(late.note),late.note);
});

test('an hour that is simply not theirs is not called late or early',()=>{
  // Their history is early morning; 2am is outside it entirely.
  const off=at(2,()=>C.assess({moment:R.moment(morningPerson(),{need:'progress'}),need:'progress',catalog:G.catalog,days:morningPerson(),day:{},now:HOUR(2)}));
  assert.equal(off.position,'offschedule');
  assert.equal(off.capacity,'light');
  assert.match(off.note,/not a usual hour for you/);
  assert.ok(!/miss|failed|behind|should have|waste/i.test(off.note),off.note);
});

test('being ahead allows more, unless energy was reported low',()=>{
  const ahead=at(6,()=>C.assess({moment:R.moment(morningPerson(),{need:'progress'}),need:'progress',catalog:G.catalog,days:morningPerson(),day:{context:{energy:'high'}},now:HOUR(6)}));
  assert.equal(ahead.position,'early');
  assert.equal(ahead.capacity,'full');
  assert.match(ahead.note,/room for a fuller piece/);

  // Reported low energy outranks the extra room. This is a person, not a scoreboard.
  const tired=at(6,()=>C.assess({moment:R.moment(morningPerson(),{need:'progress'}),need:'progress',catalog:G.catalog,days:morningPerson(),day:{context:{energy:'low'}},now:HOUR(6)}));
  assert.equal(tired.position,'early');
  assert.equal(tired.capacity,'light','low energy still wins over being ahead');
  assert.equal(tired.note,'','and nothing is suggested about pushing on');
});

test('someone already mid-step is never interrupted',()=>{
  const date='2026-09-28';
  const engaged=at(21,()=>C.assess({
    moment:R.moment(morningPerson(),{need:'progress'}),need:'progress',catalog:G.catalog,
    days:morningPerson(),day:{actionLog:[{id:'progress-start',at:new Date(`${date}T20:40:00`).toISOString()}]},
    now:new Date(`${date}T21:00:00`)}));
  assert.equal(engaged.position,'late','the position is still known');
  assert.equal(engaged.note,'','but they are busy, so say nothing');
  assert.equal(engaged.capacity,'normal');
  // A future-dated or unparseable stamp must not read as recent activity.
  const future=at(21,()=>C.assess({
    moment:R.moment(morningPerson(),{need:'progress'}),need:'progress',catalog:G.catalog,
    days:morningPerson(),day:{actionLog:[{id:'progress-start',at:new Date(`${date}T23:50:00`).toISOString()}]},
    now:new Date(`${date}T21:00:00`)}));
  assert.equal(future.engaged,false,'a later timestamp is not recent activity');
});

test('a quiet hour asks for a light step whatever the position',()=>{
  for(const hour of [22,23,1,3]){
    const m=at(hour,()=>R.moment(morningPerson(),{need:'progress'}));
    const result=at(hour,()=>C.assess({moment:m,need:'progress',catalog:G.catalog,days:morningPerson(),day:{context:{energy:'high'}},now:HOUR(hour)}));
    assert.equal(result.capacity,'light',`expected a light step at ${hour}:00`);
  }
});

test('position follows the need, not a blanket daily pattern',()=>{
  // This person has never done a "rest" step before, so nothing is claimed about
  // when they should be resting. A blanket pattern would have asserted something.
  const rest=at(21,()=>C.assess({moment:R.moment(morningPerson(),{need:'rest'}),need:'rest',catalog:G.catalog,days:morningPerson(),day:{},now:HOUR(21)}));
  assert.equal(rest.known,false,'their progress history says nothing about rest');
  assert.equal(rest.note,'');
});

test('malformed history and days cannot crash or invent a position',()=>{
  for(const days of [null,undefined,0,'today',[],{a:null},{a:{}},{a:{actionLog:null}},{a:{actionLog:[null,1,'x',{}]}},{a:{actionLog:[{at:'nope'}]}},{a:{actionLog:[{id:'progress-start',at:'2026-13-45T99:99:99Z'}]}}]){
    const seen=C.daysIn(C.seenFor(days,stepIds('progress'),R));
    assert.ok(Object.values(seen).every(n=>Number.isInteger(n)&&n>=0));
    const m=at(21,()=>C.assess({moment:R.moment(days,{need:'progress'}),need:'progress',catalog:G.catalog,days,day:null,now:HOUR(21)}));
    assert.ok([null,'ontime','early','late','offschedule'].includes(m.position));
    assert.equal(typeof m.note,'string');
    assert.equal(typeof m.capacity,'string');
  }
  // A missing or malformed moment is answered with silence, not a guess.
  for(const moment of [null,undefined,{},'noon',42,{part:9}]){
    const m=at(21,()=>C.assess({moment,need:'progress',catalog:G.catalog,days:morningPerson(),day:{},now:HOUR(21)}));
    assert.equal(m.position,null);
    assert.equal(m.note,'');
  }
  // A malformed day must not be read as reported energy.
  for(const day of [null,undefined,{},'x',{context:null},{context:'low'},{context:{energy:'toString'}},{actionLog:'x'}]){
    assert.equal(C.reportedEnergy(day),null,`unexpected energy from ${JSON.stringify(day)}`);
    assert.equal(C.doneToday(day),0);
  }
});

test('the engine exposes no score, streak or pass-fail concept at all',()=>{
  // If a future change adds one of these, this fails: the module must not be able
  // to express a verdict on the person, only a position and a next step.
  const surface=Object.keys(C).concat(Object.keys(C.assess({moment:null})));
  for(const banned of ['score','streak','missed','fail','grade','penalty','deficit','rating','punish']){
    assert.ok(!surface.some(key=>key.toLowerCase().includes(banned)),`engine exposes a ${banned} concept`);
  }
  for(const banned of ['miss','missed','waste','failed','failure','behind','late for','should have','discipline','lazy','streak']){
    for(const positionId of ['early','late','offschedule','ontime']){
      for(const energy of ['low','steady','high',null]){
        const note=C.noteFor(positionId,{clock:'9pm',quiet:false},energy);
        assert.ok(!new RegExp(banned,'i').test(note),`"${banned}" in ${positionId}: ${note}`);
      }
    }
  }
});
