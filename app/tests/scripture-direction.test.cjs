const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../public/scripture-direction-model.js');
const G=require('../public/guidance.js');
const input=(extra={})=>({theme:'connection',choice:'practice',goal:'relationships',...extra});
const rated=(...outcomes)=>({'2026-09-24':{outcomes}});
const feedback=(id,rating,goal='relationships')=>({id,rating,context:{goal},at:'2026-09-24T12:00:00Z'});

test('all bundled passage themes offer two specific editorial options for each valid response',()=>{
  const ids=new Set();
  for(const theme of Object.keys(G.themes))for(const choice of ['practice','pause','pray','sit']){
    const first=D.recommend(input({theme,choice}));
    const alternative=D.recommend(input({theme,choice}),{},first.id);
    for(const plan of [first,alternative]){
      assert.ok(D.isPlan(plan));assert.equal(plan.theme,theme);assert.equal(plan.choice,choice);
      assert.match(plan.id,/^scripture-/);assert.match(plan.reason,/editorial suggestion/);
      assert.equal(D.isKnownId(plan.id),true);
      assert.match(plan.reason,/not a claim about God’s instruction/);
      assert.ok(!G.catalog.some(item=>item.id===plan.id));ids.add(plan.id);
    }
    assert.notEqual(first.id,alternative.id);
  }
  assert.equal(ids.size,14);
});

test('the life area changes the actual next step, while low energy and time keep its preparation small',()=>{
  for(const theme of Object.keys(G.themes)){
    const copies=['faith','relationships','work','learning','rest'].map(goal=>D.recommend(input({theme,goal})).copy);
    assert.equal(new Set(copies).size,5);
  }
  const one=D.recommend(input({goal:'work',time:'1',energy:'high',environment:'busy'}));
  const low=D.recommend(input({goal:'work',time:'10',energy:'low',environment:'outside'}));
  const longer=D.recommend(input({goal:'work',time:'10',energy:'steady',environment:'quiet'}));
  assert.equal(one.minutes,1);assert.equal(low.minutes,2);assert.equal(longer.minutes,5);
  assert.match(one.setup,/interruptions/);assert.match(low.setup,/Stop somewhere safe/);
  assert.match(low.setup,/first small part is enough/);assert.match(longer.setup,/unrelated distractions/);
  assert.equal(one.goal,'work');assert.match(one.copy,/colleague/);
});

test('existing app conditions are accepted and unfamiliar settings receive useful defaults',()=>{
  assert.deepEqual(D.context({time:1,energy:'auto',environment:'anywhere'}),{goal:'faith',time:'1',energy:'auto',environment:'anywhere'});
  assert.deepEqual(D.context({goal:'constructor',time:{},energy:'unknown',environment:'unknown'}),{goal:'faith',time:'2',energy:'steady',environment:'anywhere'});
  for(const environment of ['home','work','outside','shared','anywhere','quiet','busy']){
    const plan=D.recommend(input({environment}));assert.equal(plan.context.environment,environment);assert.ok(plan.setup);
  }
});

test('a not-useful response stops repeating that approach for the same life area, including a preferred option',()=>{
  const initial=D.recommend(input());
  const days=rated(feedback(initial.id,'not-useful'));
  const changed=D.recommend(input(),days,undefined,initial.id);
  assert.notEqual(changed.id,initial.id);
  assert.equal(D.recommend(input({goal:'work'}),days).id,initial.id);
  assert.equal(D.recommend(input(),days,changed.id),null);
  assert.equal(D.recommend(input(),rated(feedback(initial.id,'not-useful'),feedback(changed.id,'not-useful'))),null);
});

test('neutral feedback leaves an option available and a useful alternative becomes the first suggestion',()=>{
  const first=D.recommend(input());
  const alternative=D.recommend(input(),{},first.id);
  assert.equal(D.recommend(input(),rated(feedback(first.id,'neutral'))).id,first.id);
  const days=rated(feedback(alternative.id,'useful'));
  const selected=D.recommend(input(),days);
  assert.equal(selected.id,alternative.id);assert.match(selected.reason,/previously found this useful/);
  assert.equal(D.recommend(input(),days,alternative.id).id,first.id);
});

test('worse feedback blocks an activity across goals and later ratings cannot silently reinstate it',()=>{
  const first=D.recommend(input());
  const second=D.recommend(input(),{},first.id);
  const days={
    '2026-09-25':{outcomes:[feedback(first.id,'useful','work')]},
    '2026-09-24':{outcomes:[feedback(first.id,'worse')]}
  };
  assert.equal(D.recommend(input({goal:'work'}),days,undefined,first.id).id,second.id);
  days['2026-09-25'].outcomes.push(feedback(second.id,'worse','faith'));
  assert.equal(D.recommend(input({goal:'rest'}),days),null);
});

test('latest same-goal feedback is respected even when days were inserted out of order',()=>{
  const first=D.recommend(input());
  const second=D.recommend(input(),{},first.id);
  const days={
    '2026-09-25':{outcomes:[feedback(second.id,'neutral')]},
    '2026-09-24':{outcomes:[feedback(first.id,'neutral'),feedback(second.id,'useful')]}
  };
  assert.equal(D.recommend(input(),days).id,first.id);
  days['2026-09-25'].outcomes.push(feedback(second.id,'useful'));
  assert.equal(D.recommend(input(),days).id,second.id);
});

test('same-day feedback keeps each life area separate and uses the latest rating for that area',()=>{
  const first=D.recommend(input());
  const second=D.recommend(input(),{},first.id);
  const days=rated(
    feedback(first.id,'not-useful','relationships'),
    feedback(first.id,'useful','work'),
    feedback(second.id,'useful','relationships'),
    feedback(second.id,'not-useful','work'),
    feedback(first.id,'neutral','learning')
  );
  assert.equal(D.recommend(input(),days).id,second.id);
  assert.equal(D.recommend(input({goal:'work'}),days).id,first.id);
  assert.equal(D.recommend(input({goal:'learning'}),days).id,first.id);
  days['2026-09-24'].outcomes.push(feedback(first.id,'useful','relationships'),feedback(second.id,'neutral','relationships'));
  assert.equal(D.recommend(input(),days).id,first.id);
  assert.equal(D.recommend(input({goal:'work'}),days).id,first.id);
});

test('same-day worse feedback applies globally despite useful ratings for other life areas',()=>{
  const first=D.recommend(input());
  const second=D.recommend(input(),{},first.id);
  const days=rated(feedback(first.id,'worse','relationships'),feedback(first.id,'useful','work'),feedback(first.id,'neutral','learning'));
  for(const goal of ['faith','relationships','work','learning','rest'])assert.equal(D.recommend(input({goal}),days,undefined,first.id).id,second.id);
  days['2026-09-24'].outcomes.push(feedback(second.id,'worse','faith'),feedback(second.id,'useful','rest'));
  assert.equal(D.recommend(input({goal:'rest'}),days),null);
});

test('correcting the same-day rating agrees with saved-day normalisation without erasing earlier days',()=>{
  const first=D.recommend(input()),second=D.recommend(input(),{},first.id);
  const corrected=rated(feedback(first.id,'worse'),feedback(first.id,'useful'));
  assert.equal(D.recommend(input(),corrected).id,first.id);
  assert.match(D.recommend(input(),corrected).reason,/previously found this useful/);
  corrected['2026-09-23']={outcomes:[feedback(first.id,'worse')]};
  assert.equal(D.recommend(input(),corrected).id,second.id);
});

test('the explanation only cites rejected alternatives from this passage and life area',()=>{
  const first=D.recommend(input()),otherTheme=D.recommend(input({theme:'grace'}));
  const unrelated=rated(feedback(otherTheme.id,'not-useful'));
  assert.doesNotMatch(D.recommend(input(),unrelated,first.id).reason,/one you said did not help/);
  const corrected=rated(feedback(first.id,'not-useful'),feedback(first.id,'neutral'));
  assert.doesNotMatch(D.recommend(input(),corrected,first.id).reason,/one you said did not help/);
  assert.match(D.recommend(input(),rated(feedback(first.id,'not-useful'))).reason,/one you said did not help/);
});

test('an explicit alternative stays stable as conditions change without overriding exclusions',()=>{
  const first=D.recommend(input());const second=D.recommend(input(),{},first.id);
  const next=D.recommend(input({time:'1',energy:'low'}),{},undefined,second.id);
  assert.equal(next.id,second.id);assert.equal(next.minutes,1);assert.equal(next.context.energy,'low');
  assert.equal(D.recommend(input(),{},second.id,second.id).id,first.id);
});

test('prayer and sitting remain optional rather than being described as a required task',()=>{
  assert.match(D.recommend(input({choice:'pray'})).reason,/optional practical follow-through/);
  assert.match(D.recommend(input({choice:'sit'})).reason,/no task you have to do/);
});

test('malformed input and stored outcomes cannot choose unrecognised content or mutate state',()=>{
  for(const value of [null,undefined,[],{},'connection',{theme:'constructor',choice:'practice'},{theme:{},choice:'practice'},input({choice:'constructor'}),input({choice:'unknown'})])assert.equal(D.recommend(value),null);
  for(const value of [null,[],{},'plan',{id:'scripture-unknown',theme:'connection'}, {...D.recommend(input()),minutes:Infinity}, {...D.recommend(input()),copy:null}])assert.equal(D.isPlan(value),false);
  for(const value of [null,{},'constructor','scripture-unknown','connection-listen'])assert.equal(D.isKnownId(value),false);
  const corrupt=rated(null,[],{id:'scripture-unknown',rating:'worse'},{id:D.recommend(input()).id,rating:'nonsense'},feedback(D.recommend(input()).id,'not-useful','unknown'));
  assert.equal(D.recommend(input(),corrupt).id,D.recommend(input()).id);
  assert.doesNotThrow(()=>D.recommend(input({time:Object.create(null),goal:Object.create(null)}),null));
  const args=input({time:'1'}),days=rated(feedback(D.recommend(input()).id,'neutral'));
  const before=JSON.stringify({args,days});D.recommend(args,days);assert.equal(JSON.stringify({args,days}),before);
});
