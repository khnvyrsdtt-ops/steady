const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const G=require('../public/guidance.js');
const source=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.events={};this.dataset={};this.attrs={};this._text='';this.className='';this.hidden=false;this.value='';this.classList={toggle:(name,on)=>{const names=new Set(this.className.split(/\s+/).filter(Boolean));if(on)names.add(name);else names.delete(name);this.className=[...names].join(' ');}};}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
  append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);if(this.tag==='select'&&this.children.length===1)this.value=node.value;}}
  insertBefore(node,before){node.remove();const index=this.children.indexOf(before);assert.ok(index>=0,'insertBefore target belongs to parent');node.parent=this;this.children.splice(index,0,node);}
  replaceChildren(...nodes){for(const child of this.children.slice())child.remove();this._text='';this.append(...nodes);}
  set textContent(value){this.replaceChildren();this._text=String(value);}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  setAttribute(name,value){this.attrs[name]=String(value);if(name==='id')this.id=value;if(name==='class')this.className=value;if(name.startsWith('data-'))this.dataset[name.slice(5)]=value;}
  addEventListener(type,handler){this.events[type]=handler;}
  focus(){this.focused=true;}
  set innerHTML(html){
    this.replaceChildren();const stack=[this];
    for(const token of html.match(/<\/?[^>]+>|[^<]+/g)||[]){
      if(token.startsWith('</')){stack.pop();continue;}
      if(token.startsWith('<')){
        const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
        const child=new Element(tag);for(const [,name,value]of token.matchAll(/([\w-]+)="([^"]*)"/g))child.setAttribute(name,value);
        stack.at(-1).append(child);if(!['input','img','hr','br'].includes(tag))stack.push(child);
      }else{const child=new Element('#text');child.textContent=token;stack.at(-1).append(child);}
    }
  }
  querySelectorAll(selector){
    const matches=node=>selector.startsWith('#')?node.id===selector.slice(1):selector.startsWith('.')?node.className.split(/\s+/).includes(selector.slice(1)):selector.startsWith('[data-')?Object.hasOwn(node.dataset,selector.slice(6,-1)):node.tag===selector;
    return this.children.flatMap(child=>[...(matches(child)?[child]:[]),...child.querySelectorAll(selector)]);
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}

// Run the actual plan cache, blocker handler, completion, ratings and renderer,
// including prepareDay on reopening. The fixture does not implement that logic.
function open({profile={goal:'work'},initialDay={need:'progress'},history={},writable=true}={}){
  const root=new Element(),html=source('index.html').match(/<section\b[^>]*id="direction"[\s\S]*?<\/section>/)?.[0];assert.ok(html);
  root.innerHTML=html;
  for(const [,need]of source('index.html').matchAll(/<button data-need="([^"]+)"/g)){const control=new Element('button');control.dataset.need=need;root.append(control);}
  let stored,saves=0,checks=0,route='today/step';const toasts=[];
  const state={profile:structuredClone(profile),days:structuredClone(history)};
  const document={createElement:tag=>new Element(tag),querySelectorAll:selector=>root.querySelectorAll(selector),getElementById:id=>id==='setting-guidance'?{value:'brief'}:root.querySelector('#'+id)};
  const sandbox={document,state,G,SteadyGuide:G,storageAvailable:writable,
    isRecord:value=>value!==null&&typeof value==='object'&&!Array.isArray(value),newDay:()=>({}),taskId:()=>assert.fail('fixture tasks already have IDs'),
    recommendations:Object.fromEntries(G.catalog.map(item=>[item.need,{}])),
    $:selector=>{const node=root.querySelector(selector);assert.ok(node,selector);return node;},
    checkDay(){checks++;},save(){saves++;sandbox.storageAvailable=writable;if(writable)stored=structuredClone(state);return writable;},
    renderRecommendation(){sandbox.renderPlan();},updateProgress(){},haptic(){},toast:text=>toasts.push(text),navigateScreen:next=>{route=next;}
  };
  vm.createContext(sandbox);
  const app=source('app.js');
  vm.runInContext(app.slice(app.indexOf('function prepareDay('),app.indexOf('// Clean all saved days'))+'\nglobalThis.normalise=prepareDay;',sandbox);
  sandbox.day=sandbox.normalise(structuredClone(initialDay));state.days['2026-09-25']=sandbox.day;
  const script=source('experience.js'),cut=(start,end)=>{const from=script.indexOf(start),to=script.indexOf(end,from);assert.ok(from>=0&&to>from);return script.slice(from,to);};
  vm.runInContext(cut('  const el=','  function panel(')+cut('  function profile()','  function hapticsAvailable()')+cut('  function actionLog()','  const contextPanel=')+'\nglobalThis.api={currentPlan,renderPlan,toggleCompletion,isDone,blocker,blockerChoice,leave,feedback,tools};',sandbox);
  const checkInStart=app.indexOf("document.querySelectorAll('[data-need]').forEach(button => button.addEventListener('click'");
  assert.ok(checkInStart>=0);
  vm.runInContext(app.slice(checkInStart,app.indexOf("$('#mind-note').addEventListener",checkInStart)),sandbox);
  sandbox.api.renderPlan();
  return{root,state,day:sandbox.day,toasts,...sandbox.api,
    get stored(){return stored;},get saves(){return saves;},get checks(){return checks;},get route(){return route;},
    block(value){sandbox.api.blockerChoice.value=value;sandbox.api.blockerChoice.events.change();},
    rate(value){const control=sandbox.api.feedback.querySelectorAll('[data-rating]').find(node=>node.dataset.rating===value);assert.ok(control);control.events.click();},
    choose(need){const control=root.querySelectorAll('[data-need]').find(node=>node.dataset.need===need);assert.ok(control,need);control.events.click();},
    leaveNow(){sandbox.api.leave.events.click?.();route=sandbox.api.leave.href.slice(1);},
    selectedRating(){return sandbox.api.feedback.querySelectorAll('[data-rating]').filter(node=>node.attrs['aria-pressed']==='true').map(node=>node.dataset.rating);}
  };
}

test('changing a blocker updates the real saved plan, restores focus and leaves completion untouched',()=>{
  const app=open(),original=app.currentPlan();
  app.block('hesitation');
  assert.equal(app.day.context.blocker,'hesitation');assert.equal(app.currentPlan().context.blocker,'hesitation');
  assert.notEqual(app.currentPlan().variant,original.variant);assert.notEqual(app.currentPlan().copy,original.copy);
  assert.equal(app.blockerChoice.focused,true);assert.equal(app.root.querySelector('.step-fit').textContent,app.currentPlan().fitReason);
  assert.equal(app.day.actionLog.length,0);assert.equal(app.day.outcomes.length,0);assert.equal(app.state.profile.blocker,undefined);
  assert.equal(app.stored.days['2026-09-25'].context.blocker,'hesitation');
  const count=app.saves,before=JSON.stringify(app.day);app.block('__proto__');
  assert.equal(app.saves,count);assert.equal(JSON.stringify(app.day),before,'invalid options cannot rewrite a saved plan');
});

test('trying a different step focuses its updated heading without completing an action',()=>{
  const app=open(),previous=app.currentPlan().id;
  const button=app.tools.querySelectorAll('button').find(node=>node.textContent==='Try a different step');
  assert.ok(button);button.events.click();
  const heading=app.root.querySelector('#recommendation-title');
  assert.notEqual(app.currentPlan().id,previous);
  assert.equal(heading.textContent,app.currentPlan().title);
  assert.equal(heading.tabIndex,-1);assert.equal(heading.focused,true);
  assert.equal(app.day.actionLog.length,0);assert.equal(app.day.outcomes.length,0);
  assert.equal(app.stored.days['2026-09-25'].plan.id,app.currentPlan().id);
});

test('a saved corrected plan reopens unchanged without creating another write or losing legacy records',()=>{
  const app=open({initialDay:{need:'progress',mind:'Keep my note',context:{energy:'low'},actionLog:[{id:'energy-move',goal:'health',title:'Earlier energy step'}]}});
  app.block('size');const saved=structuredClone(app.stored.days['2026-09-25']);
  const reopened=open({initialDay:saved,profile:app.stored.profile});
  assert.equal(reopened.saves,0);assert.equal(reopened.blockerChoice.value,'size');
  assert.deepEqual(structuredClone(reopened.currentPlan()),saved.plan);assert.equal(reopened.day.mind,'Keep my note');
  assert.equal(reopened.day.actionLog[0].title,'Earlier energy step');
});

test('a different blocker variant neither inherits a completion nor collapses completed records on reload',()=>{
  const app=open();app.toggleCompletion();const base=structuredClone(app.day.actionLog[0]);
  app.block('hesitation');assert.equal(app.isDone(app.currentPlan()),false);
  assert.equal(app.root.querySelector('#complete-recommendation').hidden,false);
  app.toggleCompletion();assert.equal(app.day.actionLog.length,2);
  const reopened=open({initialDay:structuredClone(app.stored.days['2026-09-25']),profile:app.state.profile});
  assert.equal(reopened.day.actionLog.length,2,'prepareDay must preserve distinct semantic variants');
  assert.equal(reopened.isDone(reopened.currentPlan()),true);
  reopened.toggleCompletion();assert.equal(reopened.day.actionLog.length,1);
  assert.deepEqual(structuredClone(reopened.day.actionLog[0]),base);
});

test('feedback before completion is saved for this variant and changing blocker does not imply completion',()=>{
  const app=open();app.block('size');const first=app.currentPlan();app.rate('not-useful');
  assert.deepEqual(app.selectedRating(),['not-useful']);assert.equal(app.day.actionLog.length,0);
  app.block('hesitation');assert.deepEqual(app.selectedRating(),[]);app.rate('neutral');
  assert.equal(app.day.outcomes.length,2);assert.equal(app.day.outcomes.find(row=>row.variant===first.variant).rating,'not-useful');
  const reopened=open({initialDay:structuredClone(app.stored.days['2026-09-25']),profile:app.state.profile});
  assert.deepEqual(reopened.selectedRating(),['neutral']);assert.equal(reopened.day.outcomes.length,2);
  assert.equal(G.progress(reopened.state.days).actions,0);
});

test('leaving a suggestion creates no completion, feedback or extra saved write',()=>{
  const app=open(),before=JSON.stringify(app.state),saves=app.saves;
  app.leaveNow();assert.equal(app.route,'home');assert.equal(app.saves,saves);assert.equal(JSON.stringify(app.state),before);
  assert.equal(G.progress(app.state.days).actions,0);
});

test('blockers stay with the day while a fresh day and legacy energy requests remain usable',()=>{
  const app=open();app.block('energy');
  const yesterday=structuredClone(app.stored.days['2026-09-25']);
  const tomorrow=open({initialDay:{need:'progress'},profile:app.state.profile,history:{'2026-09-24':yesterday}});
  assert.equal(tomorrow.currentPlan().context.blocker,'none');assert.equal(tomorrow.blockerChoice.value,'none');
  assert.equal(tomorrow.state.days['2026-09-24'].context.blocker,'energy');
  const legacy=open({initialDay:{need:'energy',context:{},completedNeeds:['energy']}});
  assert.equal(legacy.currentPlan().need,'energy');assert.equal(legacy.blocker.hidden,true);assert.ok(legacy.day.completedNeeds.includes('energy'));
});

test('a failed save keeps blocker changes in session and reports their storage limit',()=>{
  const app=open({writable:false});app.block('interruptions');
  assert.equal(app.currentPlan().context.blocker,'interruptions');assert.equal(app.stored,undefined);
  assert.match(app.toasts.at(-1),/Kept for this visit only/);assert.equal(app.day.actionLog.length,0);
});

test('choosing a new check-in clears a hidden old blocker without changing earlier outcomes',()=>{
  const app=open();app.block('interruptions');app.rate('neutral');
  const outcomes=JSON.stringify(app.day.outcomes);
  app.choose('clarity');
  assert.equal(app.currentPlan().need,'clarity');assert.equal(app.day.context.blocker,undefined);
  assert.equal(app.blocker.hidden,true);assert.equal(JSON.stringify(app.day.outcomes),outcomes);
  app.choose('progress');assert.equal(app.blockerChoice.value,'none');assert.equal(app.day.actionLog.length,0);
});

test('an adverse rating is not reintroduced by another blocker and exhausted suggestions award no completion',()=>{
  const app=open(),first=app.currentPlan().id;app.rate('worse');app.block('energy');
  assert.notEqual(app.currentPlan().id,first);assert.equal(app.day.actionLog.length,0);
  app.rate('worse');app.block('size');
  assert.equal(app.currentPlan().id,'progress-own');assert.equal(app.day.outcomes.length,2);
  const before=app.saves;app.toggleCompletion();
  assert.equal(app.route,'direction');assert.equal(app.saves,before);assert.equal(app.day.actionLog.length,0);
  assert.equal(G.progress(app.state.days).actions,0);
});
