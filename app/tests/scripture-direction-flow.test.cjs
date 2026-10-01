const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=require('../public/scripture-direction-model.js');
const G=require('../public/guidance.js');
const R=require('../public/scripture-reflection.js');

function open(day,days={}){
  class Element{
    constructor(){this.children=[];this.selectors=new Map();this.dataset={};this.classes=new Set(['home-next-optional']);this.classList={add:(name)=>this.classes.add(name),remove:(name)=>this.classes.delete(name)};this.textContent='';}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    querySelector(selector){if(!this.selectors.has(selector))this.selectors.set(selector,new Element());return this.selectors.get(selector);}
    addEventListener(){}
  }
  const hub=new Element();
  const entry=hub.querySelector('.home-next');entry.href='#today/check-in';entry.querySelector('strong').textContent='One useful general step';
  const window={steadyExperience:{addPanel:()=>new Element()}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/scripture-direction.js'),'utf8'),{
    day,state:{days},window,hub,review:new Element(),screenHeader:new Element(),
    document:{createElement:()=>new Element(),addEventListener(){}},
    SteadyGuide:G,SteadyScriptureDirection:D,SteadyScriptureReflection:R,
    isRecord:value=>!!value&&typeof value==='object'&&!Array.isArray(value)
  });
  return {flow:window.SteadyDirectionFlow,entry};
}

test('a valid Scripture step stays saved without taking over Home',()=>{
  const input={theme:'connection',choice:'practice',goal:'relationships'};
  const plan=D.recommend(input);
  const day={scriptureReflection:input,scriptureDirection:{...input,active:true,context:plan.context,plan},actionLog:[],outcomes:[]};
  const before=JSON.stringify(day),app=open(day);
  assert.equal(app.flow.active(),true);
  assert.equal(app.entry.href,'#today/check-in');
  assert.equal(app.entry.classes.has('home-next-optional'),true);
  assert.equal(JSON.stringify(day),before);
});

test('exhausted Scripture suggestions do not hijack the general next step displayed on Home',()=>{
  const input={theme:'connection',choice:'practice',goal:'relationships'};
  const first=D.recommend(input),second=D.recommend(input,{},first.id);
  const days={'2026-09-24':{outcomes:[first,second].map(plan=>({id:plan.id,rating:'worse',context:plan.context}))}};
  const plan=D.recommend(input,days);assert.equal(plan,null);
  const day={scriptureReflection:input,scriptureDirection:{...input,active:true,context:first.context,plan},actionLog:[],outcomes:[]};
  const before=JSON.stringify({day,days});
  const app=open(day,days);
  assert.equal(app.entry.href,'#today/check-in');
  assert.equal(app.entry.querySelector('strong').textContent,'One useful general step');
  assert.equal(app.flow.active(),false,'the Today router must use the general step shown on Home');
  assert.equal(JSON.stringify({day,days}),before,'checking Home preserves reflection choices and adverse feedback');
});

test('absent or invalid stored Scripture plans leave the general Home destination active',()=>{
  const input={theme:'connection',choice:'practice',goal:'relationships'};
  for(const plan of [undefined,{id:'unknown'},null]){
    const app=open({scriptureReflection:input,scriptureDirection:{...input,active:true,context:{goal:'relationships'},plan}});
    assert.equal(app.entry.href,'#today/check-in');assert.equal(app.flow.active(),false);
  }
});
test('a completed Scripture step stays available without turning Home into a feedback request',()=>{
  const input={theme:'connection',choice:'practice',goal:'relationships'},plan=D.recommend(input);
  const day={scriptureReflection:input,scriptureDirection:{...input,active:true,context:plan.context,plan},actionLog:[{id:plan.id+':'+plan.goal}],outcomes:[]};
  const before=JSON.stringify(day),app=open(day);
  assert.equal(app.flow.active(),true);
  assert.equal(app.entry.href,'#today/check-in');assert.equal(JSON.stringify(day),before);
});
