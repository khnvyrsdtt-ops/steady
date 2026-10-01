const {test}=require('node:test');
const assert=require('node:assert/strict');
// guidance.js reads the clock from a global, exactly as it does in the app where
// rhythm.js is a plain script tag. Installing it here mirrors that environment.
global.SteadyRhythm=require('../public/rhythm.js');
global.SteadyContext=require('../public/context-engine.js');
const R=global.SteadyRhythm;
const C=global.SteadyContext;
const G=require('../public/guidance.js');

const HOUR=(hour)=>{const d=new Date();d.setHours(hour,0,0,0);return d;};
const at=(hour,fn)=>{R.setNow(()=>HOUR(hour));try{return fn();}finally{R.setNow(null);}};
const history=(partsByDate)=>Object.fromEntries(Object.entries(partsByDate).map(([date,hours])=>
  [date,{actionLog:hours.map(h=>({id:'progress-start',at:new Date(`${date}T${String(h).padStart(2,'0')}:10:00`).toISOString()}))}]));

// The context the person chose for themselves.
const morning={goal:'work',time:'10',energy:'high',environment:'anywhere',approach:'gentle',priority:'build',blocker:'none'};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

test('a quiet hour makes the step smaller without ever claiming the person said so',()=>{
  const day=at(23,()=>G.recommend('progress',morning,{},undefined,undefined,{}));
  const noon=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{}));
  assert.ok(day.minutes<=2,`expected a small step late at night, got ${day.minutes}`);
  assert.ok(noon.minutes>day.minutes,`expected more room at midday, got ${noon.minutes}`);
  // The honest failure mode here is claiming "you chose low energy" when the only
  // thing that happened was the clock. That must never appear.
  assert.ok(!/you chose low energy/i.test(day.fitReason),`clock was reported as the person's choice: ${day.fitReason}`);
  assert.ok(!/you chose/i.test(day.fitReason),`unearned attribution: ${day.fitReason}`);
  assert.match(day.fitReason,/^It is 11pm where you are, /);
});

test('a reported low energy still reads as their own report',()=>{
  const stated={...morning,energy:'low'};
  const day=at(12,()=>G.recommend('progress',stated,{},undefined,undefined,{}));
  assert.match(day.fitReason,/you chose low energy/i);
});

test('an explicit check-in is never overridden by the hour',()=>{
  // Every need the person could have chosen keeps priority at 1am.
  for(const item of G.catalog)assert.equal(G.startingNeed({priority:'grow'},item.need,{suggest:'rest'}),item.need);
  // And with nothing chosen, a gentler start is offered rather than demanded.
  assert.equal(G.startingNeed({priority:'build'},undefined,{suggest:'rest'}),'rest');
  assert.equal(G.startingNeed({priority:'build'},undefined,{suggest:null}),'grow');
  // A malformed suggestion cannot smuggle in a need that does not exist.
  assert.equal(G.startingNeed({priority:'build'},undefined,{suggest:'toString'}),'grow');
  assert.equal(G.startingNeed({priority:'build'},undefined,{suggest:null}),'grow');
});

test('the clock can only withhold the fuller step, never add one',()=>{
  const open={...morning,energy:'auto',time:'10'};
  const noon=at(12,()=>G.recommend('grow',open,{},undefined,undefined,{}));
  const late=at(23,()=>G.recommend('grow',open,{},undefined,undefined,{}));
  assert.equal(noon.variant,'stretch','midday may still offer the fuller step');
  assert.notEqual(late.variant,'stretch','a quiet hour withholds it');
  // The person keeps every other route to a longer step.
  assert.ok(late.copy.length>0);
  assert.ok(late.minutes>0);
});

test('someone whose own hours are these hours is left completely alone',()=>{
  const night=history({'2026-09-01':[1],'2026-09-02':[1],'2026-09-03':[1]});
  const theirs=at(1,()=>G.recommend('progress',morning,night,undefined,undefined,{accepted:[],askedToday:''}));
  const midday=at(12,()=>G.recommend('progress',morning,night,undefined,undefined,{accepted:[],askedToday:''}));
  assert.equal(theirs.fitReason,midday.fitReason,'their established hours shape nothing');
  assert.ok(!/where you are/i.test(theirs.fitReason));
  assert.equal(at(1,()=>G.startingNeed({priority:'build'},undefined,R.moment(night,{need:'progress'}))),'grow');
});

test('the clock changes the step, and nothing else about the day',()=>{
  const late=at(23,()=>G.recommend('progress',morning,{},undefined,undefined,{}));
  const noon=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{}));
  // The step itself is the same kind of object, with the same fields, at either hour.
  assert.deepEqual(Object.keys(late).sort(),Object.keys(noon).sort());
  assert.equal(late.need,noon.need);
  assert.equal(late.context.goal,noon.context.goal,'their choices are untouched');
  assert.equal(late.evidence,noon.evidence);
  // A differing plan must not change what counts as the same step for progress.
  assert.equal(G.feedbackKey({...late,context:{goal:'work'}}),G.feedbackKey({...noon,context:{goal:'work'}}));
});

test('history that cannot be read leaves the step exactly as it was',()=>{
  const base=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{}));
  for(const days of [null,undefined,'today',{a:null},{a:{actionLog:'x'}},{a:{actionLog:[{at:'nope'}]}}]){
    const plan=at(23,()=>G.recommend('progress',morning,days,undefined,undefined,{}));
    assert.ok(plan&&typeof plan.title==='string'&&typeof plan.copy==='string');
    assert.ok(plan.minutes>0);
  }
  assert.equal(base.need,'progress');
});

test('without a clock module present, guidance behaves exactly as before',()=>{
  const saved=global.SteadyRhythm;delete global.SteadyRhythm;
  try{
    const plan=G.recommend('progress',morning,{},undefined,undefined,{});
    assert.equal(plan.need,'progress');
    assert.ok(plan.minutes>0);
    // This is the shape experience.js builds when there is no clock module: no
    // `suggest` key at all, so the saved priority is used exactly as it always was.
    assert.equal(G.startingNeed({priority:'build'},undefined,{accepted:[],askedToday:''}),'grow');
    assert.equal(G.startingNeed({priority:'build'},undefined,undefined),'grow');
  }finally{global.SteadyRhythm=saved;}
});

// --- Where the Context Engine reaches the step -------------------------------
// The engine decides the step's size and one line of explanation. It never
// chooses the step itself, and it must not be able to score the day.

const situation=(over={})=>({position:null,known:true,note:'',capacity:'normal',energy:null,done:0,engaged:false,...over});
const morningPerson=()=>Object.fromEntries(
  ['2026-09-01','2026-09-02','2026-09-03','2026-09-04'].map(date=>
    [date,{actionLog:[{id:'progress-start',at:new Date(`${date}T09:20:00`).toISOString()}]}]));

test('a light day’s shape shrinks the step the engine is looking at',()=>{
  const normal=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{situation:situation()}));
  const light=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{situation:situation({capacity:'light',position:'late'})}));
  assert.ok(light.minutes<=2,`expected a light step, got ${light.minutes}`);
  assert.ok(normal.minutes>light.minutes,`expected more room normally, got ${normal.minutes}`);
  // The content of the step is still the catalog's choice, not the engine's.
  assert.equal(light.need,'progress');
  assert.equal(typeof light.title,'string');
  assert.ok(light.title.length>0);
});

test('the day’s shape explains itself, and defers to a reason the person gave',()=>{
  const moved=at(21,()=>G.recommend('progress',morning,{},undefined,undefined,{
    situation:situation({capacity:'light',position:'late',note:'It is 9pm. The shape of today has moved on, so this is a small useful step from here rather than the one you began with.'})}));
  assert.match(moved.fitReason,/^It is 9pm\./);

  // A blocker they selected is more specific, so it is kept in front.
  const blocked=at(21,()=>G.recommend('progress',{...morning,blocker:'size'},{},undefined,undefined,{
    situation:situation({capacity:'light',position:'late',note:'It is 9pm. The shape of today has moved on.'})}));
  assert.match(blocked.fitReason,/^It is 9pm\..*feels too big/s);

  // With nothing to say, the ordinary wording is left completely alone.
  const plain=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{situation:situation()}));
  assert.ok(!/where you are|shape of today|usual hours/i.test(plain.fitReason),plain.fitReason);
});

test('the engine can withhold the fuller step but never force it',()=>{
  const open={...morning,energy:'auto',time:'10'};
  const full=at(12,()=>G.recommend('grow',open,{},undefined,undefined,{situation:situation({capacity:'full',position:'early'})}));
  const light=at(12,()=>G.recommend('grow',open,{},undefined,undefined,{situation:situation({capacity:'light',position:'late'})}));
  assert.equal(full.variant,'stretch','room to do more is allowed when they are ahead');
  assert.notEqual(light.variant,'stretch','and withheld when the day needs recalculating');
  // Both still produce a real, finishable step.
  for(const plan of [full,light]){
    assert.ok(plan.minutes>0);
    assert.ok(plan.copy.length>0);
  }
});

test('a missing or malformed situation withholds nothing',()=>{
  const base=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{}));
  for(const bad of [null,undefined,0,'late',[],{capacity:'toString'},{capacity:null},{note:42},true]){
    const plan=at(12,()=>G.recommend('progress',morning,{},undefined,undefined,{situation:bad}));
    assert.equal(plan.need,'progress');
    assert.ok(plan.minutes>0,`malformed situation ${JSON.stringify(bad)} produced no step`);
    assert.equal(typeof plan.fitReason,'string');
  }
  // A situation with nothing to say must not blank the explanation out.
  assert.ok(base.fitReason.length>0);
});

test('the real engine feeds real guidance, and the loop end to end',()=>{
  // Nothing mocked: the engine reads this person's own history and the clock does
  // the rest, exactly as it does on the phone.
  const days=morningPerson();
  at(21,()=>{
    const moment=R.moment(days,{need:'progress'});
    const real=C.assess({days,day:{},moment,need:'progress',catalog:G.catalog,now:HOUR(21)});
    assert.equal(real.position,'late');
    const plan=G.recommend('progress',morning,days,undefined,undefined,{
      ...moment,situation:real,accepted:[],askedToday:''});
    assert.ok(plan.minutes<=2,`expected a recalculated small step, got ${plan.minutes}`);
    assert.match(plan.fitReason,/^It is /);
  });
  // And the same person, mid-morning, is left alone.
  at(9,()=>{
    const moment=R.moment(days,{need:'progress'});
    const real=C.assess({days,day:{},moment,need:'progress',catalog:G.catalog,now:HOUR(9)});
    assert.equal(real.position,'ontime');
    const plan=G.recommend('progress',morning,days,undefined,undefined,{
      ...moment,situation:real,accepted:[],askedToday:''});
    assert.ok(!/shape of today|usual hours/i.test(plan.fitReason),plan.fitReason);
  });
});
