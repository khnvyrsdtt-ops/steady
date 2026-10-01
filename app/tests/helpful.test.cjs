const {test} = require('node:test');
const assert = require('node:assert/strict');
const G = require('../public/guidance.js');
const {collect} = require('../public/helpful.js');
const feedback = (id, rating, goal = 'general', extra = {}) => ({id, rating, context: {goal, ...extra}});

test('helpful collection requires explicit useful feedback', () => {
  const days = {'2026-09-23': {actionLog: [{id: 'grow-build'}], outcomes: [
    feedback('rest-stop', 'neutral'), feedback('calm-pause', 'not-useful'), null,
    feedback('missing', 'useful'), feedback('grow-cue', 'useful', 'unknown')
  ]}};
  assert.deepEqual(collect(days, G.context(), G), []);
});

test('malformed stored goal values do not crash the helpful collection',()=>{
  for(const goal of [[],{},Object.create(null),{toString:null},false,7]){
    const days={'2026-09-24':{outcomes:[feedback('grow-cue','useful',goal)]}};
    assert.deepEqual(collect(days,G.context(),G),[]);
  }
});

test('latest feedback wins for each action and goal regardless of day insertion order', () => {
  const days = {
    '2026-09-23': {outcomes: [feedback('grow-build', 'neutral', 'work'), feedback('rest-stop', 'useful')]},
    '2026-09-21': {outcomes: [feedback('grow-build', 'useful', 'work'), feedback('grow-build', 'useful', 'home')]},
    '2026-09-22': {outcomes: [feedback('grow-build', 'useful', 'work')]}
  };
  const items = collect(days, G.context(), G);
  assert.deepEqual(items.map(item => [item.id, item.goal]), [['rest-stop', 'general'], ['grow-build', 'home']]);
  days['2026-09-24'] = {outcomes: [feedback('rest-stop', 'not-useful')]};
  assert.deepEqual(collect(days, G.context(), G).map(item => item.id), ['grow-build']);
});

test('made-worse feedback excludes repeats and equivalent task activity without excluding independent direction', () => {
  const days = {
    '2026-09-21': {outcomes: [feedback('grow-build', 'worse', 'learning'), feedback('rest-stop', 'worse')]},
    '2026-09-22': {outcomes: [feedback('progress-start', 'useful', 'learning'), feedback('rest-stop', 'useful', 'home')]},
    '2026-09-23': {outcomes: [feedback('clarity-one', 'useful', 'learning'), feedback('progress-start', 'useful', 'home')]}
  };
  assert.deepEqual(collect(days, G.context(), G).map(item => [item.id, item.goal]), [['progress-start', 'home'],['clarity-one','learning']]);
});

test('a corrected same-day rating follows the guidance engine’s feedback rules', () => {
  const days = {'2026-09-23': {outcomes: [feedback('rest-stop', 'worse'), feedback('rest-stop', 'useful')]}};
  assert.equal(collect(days, G.context(), G)[0].id, 'rest-stop');
});

test('reused steps keep the saved goal while using today’s conditions and chosen approach', () => {
  const days = {'2026-09-20': {outcomes: [feedback('grow-build', 'useful', 'work', {time: '10', energy: 'high', environment: 'quiet'})]}};
  const current = G.context({goal: 'home', time: '1', energy: 'low', environment: 'busy'});
  const before = JSON.stringify({days, current});
  const [item] = collect(days, current, G);
  assert.equal(item.id, 'grow-build');
  assert.equal(item.plan.context.goal, 'work');
  assert.equal(item.plan.minutes, 1);
  assert.equal(item.plan.context.energy, 'low');
  assert.equal(item.plan.context.environment, 'busy');
  assert.match(item.plan.setup, /interruptions/);
  assert.equal(JSON.stringify({days, current}), before);
});

test('helpful Scripture steps retain their source while adapting to current time',()=>{
  const D=require('../public/scripture-direction-model.js');
  const plan=D.recommend({theme:'grace',choice:'practice',goal:'relationships'});
  const days={'2026-09-24':{outcomes:[feedback(plan.id,'useful','relationships',{scriptureTheme:'grace',scriptureChoice:'practice'})]}};
  const items=collect(days,G.context({time:'1',energy:'low'}),G);
  assert.equal(items[0].source,'scripture');assert.equal(items[0].plan.theme,'grace');assert.equal(items[0].plan.minutes,1);
  assert.equal(G.progress(days).useful,1);
  days['2026-09-25']={outcomes:[feedback(plan.id,'worse','work')]};
  assert.equal(collect(days,G.context(),G).length,0);
});

test('a corrected Scripture rating appears consistently before and after storage normalisation',()=>{
  const D=require('../public/scripture-direction-model.js');
  const plan=D.recommend({theme:'grace',choice:'practice',goal:'relationships'});
  const metadata={scriptureTheme:'grace',scriptureChoice:'practice'};
  const days={'2026-09-24':{outcomes:[feedback(plan.id,'worse','relationships',metadata),feedback(plan.id,'useful','relationships',metadata)]}};
  const items=collect(days,G.context(),G);
  assert.equal(items.length,1);assert.equal(items[0].id,plan.id);
});

test('obsolete legacy base ratings cannot claim the replacement doing or direction action helped',()=>{
  const obsolete=[['progress-plan','work'],['grow-cue','work'],['clarity-prepare','work'],['grow-build','general'],
    ...['health','habits','thinking'].flatMap(goal=>[['progress-start',goal],['grow-build',goal]])];
  for(const [id,goal]of obsolete)for(const current of [G.context(),G.context({energy:'low',environment:'busy',time:'1'})]){
    const days={'2026-09-20':{outcomes:[feedback(id,'useful',goal)],actionLog:[{id,goal,title:'Keep the original action'}]}};
    const original=JSON.stringify(days);
    assert.deepEqual(collect(days,current,G),[],`${id}/${goal} must not borrow its old meaning, including when adapted for low energy`);
    assert.equal(JSON.stringify(days),original,'obsolete feedback and historical action titles stay saved');
  }
});

test('new doing and direction ratings are reusable while an older base rating for the same ID stays historical',()=>{
  for(const [id,goal,variant]of [['progress-plan','work','doing'],['grow-cue','work','doing'],['clarity-prepare','work','direction'],['grow-build','general','doing']]){
    const days={'2026-09-20':{outcomes:[feedback(id,'useful',goal)]},'2026-09-25':{outcomes:[{...feedback(id,'useful',goal),variant}]}};
    const original=JSON.stringify(days),items=collect(days,G.context(),G);
    assert.equal(items.length,1,id);assert.equal(items[0].id,id);assert.equal(items[0].plan.variant,variant);
    assert.equal(JSON.stringify(days),original);
  }
});

test('useful corrected-start records retain their explicitly selected blocker for reuse',()=>{
  const context=G.context({}, {goal:'work',blocker:'hesitation'}),plan=G.recommend('progress',context,{});
  const days={'2026-09-25':{outcomes:[{id:plan.id,variant:plan.variant,rating:'useful',context:plan.context}]}};
  const [item]=collect(days,G.context({time:'1'}),G);
  assert.equal(item.id,plan.id);assert.equal(item.plan.context.blocker,'hesitation');
  assert.equal(item.plan.context.time,'1');assert.equal(item.plan.variant,plan.variant);
});
