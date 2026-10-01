const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.handlers={};this.className='';this.textContent='';this.hidden=false;}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(name,handler){this.handlers[name]=handler;}
  fire(name='click'){this.handlers[name]?.({target:this});}
  focus(options){this.focusOptions=options;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(selector[0]==='.'?child.className.split(' ').includes(selector.slice(1)):child.tagName===selector)?[child]:[],...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function open(initial,{stored=true}={}){
  const container=new Element('div');
  let rollover=null,saves=0,renderCount=0,progressCount=0,added=0,closed=0;
  const layouts=[];
  const sandbox={day:initial,window:{},document:{createElement:tag=>new Element(tag)},
    save:()=>{saves++;return stored;},
    checkDay:()=>{if(rollover){sandbox.day=rollover;rollover=null;}},
    renderTasks:()=>renderCount++,updateProgress:()=>progressCount++};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/chat-actions.js'),'utf8'),sandbox);
  const view=sandbox.window.SteadyChatActions.mount({container,close:()=>closed++,add:()=>added++,layout:options=>layouts.push(options)});
  return {view,container,sandbox,layouts,get saves(){return saves;},get renderCount(){return renderCount;},get progressCount(){return progressCount;},get added(){return added;},get closed(){return closed;},rollover:next=>rollover=next,
    one:selector=>container.querySelector(selector),all:selector=>container.querySelectorAll(selector)};
}
const task=(id,text,complete=false)=>({id,text,complete});

test('inline actions shows saved tasks and completed steps without changing storage',()=>{
  const day={tasks:[task('one','Make tea'),task('two','Go outside',true)],actionLog:[{id:'old','title':'Call someone'}]};
  const before=JSON.stringify(day),app=open(day);
  assert.equal(app.all('.chat-action-toggle').length,2);
  assert.equal(app.all('.chat-action-toggle')[1].checked,true);
  assert.equal(app.one('.chat-actions-completed-item').textContent,'Call someone');
  assert.match(app.one('.chat-actions-intro').textContent,/1 of 2/);
  assert.equal(JSON.stringify(day),before);
  assert.equal(app.saves,0);
  assert.equal(app.all('form').length,0);
  assert.equal(app.all('input').filter(input=>input.id).length,0,'there are no IDs to collide with the older task list');
});

test('completion saves to the existing task and keeps focus without scrolling',()=>{
  const day={tasks:[task('one','Make tea')],actionLog:[]},app=open(day);
  const toggle=app.one('.chat-action-toggle');toggle.checked=true;toggle.fire('change');
  assert.equal(day.tasks[0].complete,true);
  assert.equal(app.saves,1);
  assert.equal(app.renderCount,1);
  assert.equal(app.progressCount,1);
  assert.equal(app.one('.chat-action-toggle').focusOptions.preventScroll,true);
  assert.ok(app.layouts.every(options=>options.preserveScroll));
  assert.match(app.one('.chat-actions-status').textContent,/done/);
});

test('delete and undo retain task identity, completion, order and unrelated action records',()=>{
  const first=task('one','Make tea',true),second=task('two','Walk'),day={tasks:[first,second],actionLog:[{id:'guided',title:'Stretch'}]},app=open(day);
  app.one('.chat-action-remove').fire();
  assert.deepEqual(day.tasks,[second]);
  assert.equal(app.one('.chat-actions-undo').focusOptions.preventScroll,true);
  app.one('.chat-actions-undo').fire();
  assert.equal(day.tasks[0],first);
  assert.equal(day.tasks[1],second);
  assert.equal(first.complete,true);
  assert.deepEqual(day.actionLog,[{id:'guided',title:'Stretch'}]);
  assert.equal(app.one('.chat-actions-undo'),null);
  assert.equal(app.one('.chat-action-toggle').focusOptions.preventScroll,true);
  assert.equal(app.saves,2);
});

test('failed persistence keeps session edits visible and does not claim they are saved',()=>{
  const day={tasks:[task('one','Make tea')],actionLog:[]},app=open(day,{stored:false});
  const toggle=app.one('.chat-action-toggle');toggle.checked=true;toggle.fire('change');
  assert.equal(day.tasks[0].complete,true);
  const status=app.one('.chat-actions-status');
  assert.equal(status.attributes.role,'status');
  assert.equal(status.hidden,false);
  assert.match(status.textContent,/not been safely saved/);
  assert.doesNotMatch(status.textContent,/One small thing, done/);
});

test('stale completion and removal controls cannot modify either day after midnight',()=>{
  for(const control of ['.chat-action-toggle','.chat-action-remove']){
    const previous={tasks:[task('same','Yesterday')],actionLog:[]};
    const next={tasks:[task('same','Today')],actionLog:[]};
    const app=open(previous),button=app.one(control);app.rollover(next);
    button.checked=true;button.fire(control.includes('toggle')?'change':'click');
    assert.deepEqual(previous.tasks,[task('same','Yesterday')]);
    assert.deepEqual(next.tasks,[task('same','Today')]);
    assert.equal(app.one('.chat-action-text').textContent,'Today');
    assert.equal(app.saves,0);
    assert.match(app.one('.chat-actions-status').textContent,/new day/);
  }
});

test('an old undo cannot carry yesterday’s action into today',()=>{
  const previous={tasks:[task('one','Yesterday')],actionLog:[]},next={tasks:[],actionLog:[]},app=open(previous);
  app.one('.chat-action-remove').fire();const undo=app.one('.chat-actions-undo');app.rollover(next);undo.fire();
  assert.deepEqual(previous.tasks,[]);
  assert.deepEqual(next.tasks,[]);
  assert.equal(app.one('.chat-actions-undo'),null);
  assert.equal(app.saves,1);
});

test('add and close stay delegated to the main composer with warm empty copy',()=>{
  const app=open({tasks:[],actionLog:[]});
  assert.equal(app.one('.chat-actions-list').hidden,true);
  assert.match(app.one('.chat-actions-intro').textContent,/Give it a place/);
  app.one('.chat-actions-add').fire();app.one('.chat-actions-close').fire();
  assert.equal(app.added,1);assert.equal(app.closed,1);assert.equal(app.saves,0);
  app.view.remove();assert.equal(app.one('.chat-actions'),null);
});

test('user text is rendered literally without HTML interpolation',()=>{
  const text='<img src=x onerror=alert(1)>',app=open({tasks:[task('unsafe',text)],actionLog:[{title:text}]});
  assert.equal(app.one('.chat-action-text').textContent,text);
  assert.equal(app.one('.chat-actions-completed-item').textContent,text);
  assert.equal(app.all('img').length,0);
  assert.equal(app.one('.chat-action-remove').attributes['aria-label'],`Remove action: ${text}`);
});
