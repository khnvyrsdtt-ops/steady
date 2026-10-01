const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=require('../public/scripture-direction-model.js');
const G=require('../public/guidance.js');
const R=require('../public/scripture-reflection.js');

// Run the complete production renderer and handlers against a small DOM tree.
// The fixture contains no layout, rating, completion, or adjustment behaviour.
class Element {
  constructor(tag='div') {
    this.tag=tag;this.children=[];this.className='';this.attrs={};this.dataset={};this.events={};this.hidden=false;this.open=false;this._text='';
    this.classList={add:name=>{this.className=(this.className+' '+name).trim();}};
  }
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children.forEach(node=>node.parent=null);this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attrs[name]=String(value);}
  addEventListener(type,fn){this.events[type]=fn;}
  click(){this.events.click?.();}
  focus(){this.focused=true;}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
  matches(selector){
    if(selector.startsWith('.'))return this.className.split(/\s+/).includes(selector.slice(1));
    const attribute=selector.match(/^\[([^=\]]+)(?:=([^\]]+))?\]$/);
    if(attribute){const key=attribute[1],value=key.startsWith('data-')?this.dataset[key.slice(5)]:this.attrs[key];return attribute[2]===undefined?value!==undefined:value===attribute[2];}
    return this.tag===selector;
  }
  querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}

function openStep({initialDay={},history={},explained=false,writable=true}={}) {
  const input={theme:'connection',choice:'practice',goal:'relationships'};
  const plan=D.recommend(input);
  const day={scriptureReflection:input,scriptureDirection:{...input,active:true,context:plan.context,plan},actionLog:[],outcomes:[],...initialDay};
  const state={profile:{},days:{...history,'2026-09-25':day}};
  const panel=new Element('section'),review=new Element('section'),screenHeader=new Element('header'),back=new Element('a');back.className='screen-back';screenHeader.append(back);
  const hub=new Element('section'),entry=new Element('a');entry.className='home-next';entry.href='#today';
  for(const [tag,cls]of [['span','mini-label'],['strong',''],['span','home-next-arrow']]){const child=new Element(tag);child.className=cls;entry.append(child);}hub.append(entry);
  entry.querySelector('strong').textContent='Practical next step';
  const guidance={value:explained?'explained':'brief'},listeners={};let saves=0,persisted;
  const sandbox={
    day,state,hub,review,screenHeader,storageAvailable:writable,
    document:{createElement:tag=>new Element(tag),getElementById:id=>id==='setting-guidance'?guidance:null,addEventListener:(type,fn)=>(listeners[type]||=[]).push(fn)},
    window:{steadyExperience:{addPanel:()=>panel,haptic(){}},scrollTo(){}},
    SteadyGuide:G,SteadyScriptureDirection:D,SteadyScriptureReflection:R,
    ScriptureLibrary:{connection:{reference:'Galatians 6:2'}},
    isRecord:value=>!!value&&typeof value==='object'&&!Array.isArray(value),
    save(){saves++;sandbox.storageAvailable=writable;if(writable)persisted=structuredClone(state);return writable;},
    updateProgress(){},navigateScreen(){}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/scripture-direction.js'),'utf8'),sandbox);
  const render=()=>{for(const fn of listeners['steady:screen']||[])fn({detail:'today/scripture-step'});};
  render();
  return {day,state,panel,review,hub,render,renderReview:()=>{for(const fn of listeners['steady:screen']||[])fn({detail:'review'});},get saves(){return saves;},get persisted(){return persisted;},
    click:text=>{const button=panel.querySelectorAll('button').find(node=>node.textContent===text);assert.ok(button,text);button.click();},
    choice:(key,value)=>panel.querySelectorAll('[data-choice]').find(node=>node.dataset.choice===key&&node.dataset.value===value)};
}

test('saved Scripture step has a labelled Reflect link and leaves the general Home action alone',()=>{
  const app=openStep(),homeAction=app.hub.querySelector('.home-next');
  const resume=app.review.querySelector('.scripture-direction-resume');
  assert.equal(homeAction.href,'#today');
  assert.equal(homeAction.querySelector('strong').textContent,'Practical next step');
  assert.equal(resume.href,'#today/scripture-step');
  assert.match(resume.textContent,/^Scripture step · /);
  app.renderReview();
  assert.equal(homeAction.href,'#today');
  assert.equal(homeAction.querySelector('strong').textContent,'Practical next step');
});

test('initial Scripture step has one quiet meta line and one local options entry',()=>{
  const app=openStep(),{panel}=app;
  assert.deepEqual(panel.children.map(node=>node.tag),['p','h2','p','button','details']);
  assert.equal(panel.children[0].className,'step-meta');
  assert.match(panel.children[0].textContent,/\d+ minutes? · Relationships/);
  assert.equal(panel.children[3].textContent,'Mark as done');
  const options=panel.querySelector('.step-options');
  assert.equal(options.open,false);assert.equal(options.querySelector('summary').textContent,'Details & adjustments');
  assert.ok(options.querySelector('.direction-source'));
  assert.ok(options.querySelector('.direction-fit'));
  assert.equal(options.querySelector('.direction-fit').tag,'div');
  assert.equal(panel.querySelectorAll('details').length,1,'all step details share one disclosure level');
  assert.ok(options.querySelector('.direction-setup'));
  assert.ok(options.querySelectorAll('button').some(node=>node.textContent==='Another approach'));
  assert.ok(options.querySelectorAll('a').some(node=>node.textContent==='Other next steps'));
  assert.doesNotMatch(panel.textContent,/FROM YOUR REFLECTION|Leave it here/);
  assert.equal(panel.querySelector('.step-feedback'),null);
  assert.equal(app.saves,0,'rendering a valid saved plan does not rewrite it');
});

test('explanations preference opens options and fit changes keep the single disclosure open and focused',()=>{
  const app=openStep({explained:true});
  assert.equal(app.panel.querySelector('.step-options').open,true);
  assert.equal(app.panel.querySelector('.direction-fit').tag,'div');
  const id=app.day.scriptureDirection.plan.id;
  const goal=app.choice('goal','work');goal.click();
  assert.equal(app.panel.querySelector('.step-options').open,true);
  assert.equal(app.panel.querySelectorAll('details').length,1);
  assert.equal(app.choice('goal','work').focused,true);
  assert.equal(app.day.scriptureDirection.context.goal,'work');
  assert.equal(app.day.scriptureDirection.plan.id,id,'changing conditions retains the selected approach');
});

test('completion replaces adjustments with a clear exit and one optional feedback disclosure',()=>{
  const app=openStep();app.click('Mark as done');
  assert.equal(app.day.actionLog.length,1);
  assert.equal(app.panel.querySelector('.step-options'),null);
  assert.equal(app.panel.querySelector('.direction-fit'),null);
  assert.equal(app.panel.querySelector('.step-meta'),null);
  assert.equal(app.panel.querySelector('.direction-complete').textContent,'✓ Done');
  const actions=app.panel.querySelector('.step-completion-actions');
  assert.equal(actions.querySelector('a').textContent,'Done for now');
  assert.equal(actions.querySelector('a').href,'#home');
  const feedback=app.panel.querySelector('.step-feedback');
  assert.equal(feedback.open,false);
  assert.match(feedback.querySelector('summary').textContent,/^How did it go\?/);
  assert.equal(feedback.querySelector('summary').querySelector('.small-copy').textContent,'Optional');
  assert.equal(feedback.querySelectorAll('details').length,0,'adverse feedback has no extra hidden layer');
  assert.deepEqual(feedback.querySelectorAll('button').map(node=>node.dataset.value),['useful','neutral','not-useful','worse']);
  assert.equal(app.panel.querySelector('[role=status]').hidden,true,'success is already clear without a second confirmation line');
  const before=JSON.stringify(app.day),saves=app.saves;app.render();
  assert.equal(JSON.stringify(app.day),before);assert.equal(app.saves,saves);
});

test('selected adverse feedback stays visible on reload and preserves other goals and earlier days',()=>{
  const history={'2026-09-24':{outcomes:[{id:'scripture-grace-pause',rating:'worse',context:{goal:'work'}}]}};
  const app=openStep({history});app.click('Mark as done');
  const id=app.day.scriptureDirection.plan.id;
  app.day.outcomes.push({id,rating:'useful',context:{goal:'work'}});
  app.click('Made things worse');
  assert.equal(app.panel.querySelector('.step-feedback').open,true);
  assert.equal(app.choice('rating','worse').attrs['aria-pressed'],'true');
  assert.equal(app.choice('rating','worse').focused,true);
  assert.equal(app.day.outcomes.find(item=>item.context.goal==='work').rating,'useful');
  assert.equal(app.state.days['2026-09-24'].outcomes[0].rating,'worse');
  const before=JSON.stringify(app.state),saves=app.saves;app.render();
  assert.equal(JSON.stringify(app.state),before);assert.equal(app.saves,saves);
  assert.equal(app.panel.querySelector('.step-feedback').open,true);
  assert.match(app.panel.querySelector('[role=status]').textContent,/avoid this approach/);
  const reopened=openStep({initialDay:structuredClone(app.day),history});
  assert.equal(reopened.choice('rating','worse').attrs['aria-pressed'],'true');
  assert.equal(reopened.panel.querySelector('.step-feedback').open,true);
});

test('storage failure remains visible even when optional feedback is closed',()=>{
  const app=openStep({writable:false});app.click('Mark as done');
  const status=app.panel.querySelector('[role=status]');
  assert.equal(app.panel.querySelector('.step-feedback').open,false);
  assert.equal(status.hidden,false);assert.equal(status.parent,app.panel);
  assert.match(status.textContent,/Kept for this visit only/);
  assert.equal(app.persisted,undefined);
  app.click('Made things worse');
  assert.equal(app.panel.querySelector('.step-feedback').open,true);
  assert.match(app.panel.querySelector('[role=status]').textContent,/Kept for this visit only/);
});

test('exhausted and absent reflections keep their useful fallback without replacing saved data',()=>{
  const input={theme:'connection',choice:'practice',goal:'relationships'},first=D.recommend(input),second=D.recommend(input,{},first.id);
  const history={'2026-09-24':{outcomes:[first,second].map(plan=>({id:plan.id,rating:'worse',context:plan.context}))}};
  const direction={...input,active:true,context:first.context,plan:null};
  const app=openStep({initialDay:{scriptureDirection:direction},history});
  assert.match(app.panel.querySelector('h2').textContent,/Choose your own next step/);
  assert.ok(app.panel.querySelectorAll('a').some(node=>node.textContent==='My actions'&&node.href==='#direction'));
  assert.equal(app.day.scriptureDirection.plan,null);assert.equal(app.saves,0);
  assert.equal(app.state.days['2026-09-24'].outcomes.length,2);
  const empty=openStep({initialDay:{scriptureReflection:null,scriptureDirection:null}});
  assert.equal(empty.panel.querySelector('h2').textContent,'Start with a passage.');
  assert.ok(empty.panel.querySelectorAll('a').some(node=>node.href==='#learn/scripture'));
});

test('existing Undo completion semantics remain scoped to the current plan and goal',()=>{
  const app=openStep();app.click('Mark as done');app.click('No change');
  app.day.actionLog.push({id:'other-step:work',title:'Keep this',goal:'work'});
  app.day.outcomes.push({id:'other-step',rating:'worse',context:{goal:'work'}});
  app.click('Undo completion');
  assert.equal(app.day.actionLog.length,1);assert.equal(app.day.actionLog[0].id,'other-step:work');
  assert.equal(app.day.outcomes.length,1);assert.equal(app.day.outcomes[0].rating,'worse');
  assert.ok(app.panel.querySelector('.step-options'));
  assert.equal(app.panel.querySelector('.step-feedback'),null);
});
