const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/experience.js'), 'utf8');

function productionBlock(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}

function completion(log = []) {
  const day = {actionLog: structuredClone(log), completedNeeds: []};
  let goal = 'work', variant='base', stored;
  const plan = () => ({id:'grow-build', need:'grow', title:goal+' step', variant, context:{goal}});
  const button = {classList:{remove(){},add(){}}};
  const context = {
    day, currentPlan:plan, renderRecommendation(){}, updateProgress(){}, haptic(){},
    navigateScreen(){}, toast(){}, $:()=>button, requestAnimationFrame:fn=>fn(), setTimeout(){},
    save(){stored=structuredClone(day);return true;}
  };
  vm.runInNewContext(productionBlock('  function actionLog()', '  const rec=')+
    '\nglobalThis.api={toggleCompletion,isDone};',context);
  return {day, get stored(){return stored;}, goal(value){goal=value;},variant(value){variant=value;}, done:()=>context.api.isDone(plan()), toggle:()=>context.api.toggleCompletion()};
}

test('different goal actions complete and undo independently, without removing other goals',()=>{
  const app=completion();
  app.toggle();
  assert.equal(app.done(),true);
  app.goal('relationships');
  assert.equal(app.done(),false);
  app.toggle();
  assert.equal(app.stored.actionLog.length,2);
  app.toggle();
  assert.equal(app.stored.actionLog.length,1);
  assert.equal(app.stored.actionLog[0].goal,'work');
  assert.equal(app.done(),false);
  app.goal('work');
  assert.equal(app.done(),true);
});

test('legacy completions remain recognisable and can be undone',()=>{
  const app=completion([{id:'grow-build',title:'Previously completed'}]);
  assert.equal(app.done(),true);
  app.toggle();
  assert.equal(app.stored.actionLog.length,0);
  app.toggle();
  assert.equal(app.stored.actionLog[0].goal,'work');
});

test('completing a new semantic variant does not inherit or undo a different action variant',()=>{
  const app=completion([{id:'grow-build',goal:'work',title:'Earlier base action'}]);
  app.variant('energy');assert.equal(app.done(),false);app.toggle();
  assert.equal(app.stored.actionLog.length,2);
  assert.equal(app.stored.actionLog.find(action=>action.variant==='energy').goal,'work');
  app.variant('hesitation');assert.equal(app.done(),false);app.toggle();
  assert.equal(app.stored.actionLog.length,3);
  app.variant('energy');app.toggle();
  assert.equal(app.stored.actionLog.length,2);
  assert.equal(app.stored.actionLog.some(action=>action.variant==='hesitation'),true);
  app.variant('base');assert.equal(app.done(),true);
  assert.equal(app.stored.actionLog[0].title,'Earlier base action');
});
