const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const model=require('../public/burden-memory-model.js');
const entry={id:'memory-entry',text:'I prefer brief replies. I work night shifts.',at:'2026-09-27T12:00:00.000Z'};
const clean=value=>JSON.parse(JSON.stringify(value));
function open({native,profile={},memory,entries=[entry],idle=()=>Promise.resolve()}={}){
  const listeners={},events=[],state={profile,scriptureRequests:entries,...(memory?{burdenMemory:memory}:{})};
  let active=true,saves=0;
  const document={body:{classList:{contains:()=>active}},addEventListener(name,handler){(listeners[name]||=[]).push(handler);},dispatchEvent(event){events.push(event.type);for(const handler of listeners[event.type]||[])handler(event);}};
  const window={SteadyBurdenMemory:model,SteadyNative:native,SteadyBurdenWording:{whenIdle:idle}};
  const sandbox={state,window,document,CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},save(){saves++;return true;},setTimeout(fn){queueMicrotask(fn);}};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../public/burden-memory.js'),'utf8'),sandbox);
  return {state,store:window.SteadyBurdenMemoryStore,events,get saves(){return saves;},leave(){active=false;document.dispatchEvent({type:'steady:screen',detail:'help/memory'});}};
}
const deferred=()=>{let resolve;return {promise:new Promise(yes=>resolve=yes),resolve};};

test('new chat details wait for wording, persist locally and supply relevant future context',async()=>{
  const order=[],app=open({idle:async()=>order.push('wording'),native:{async extractMemory(payload){order.push('memory');assert.deepEqual(clean(payload),{requestId:entry.id,text:entry.text});return {available:true,notes:['I prefer brief replies.','I work night shifts.']};}}});
  assert.equal(await app.store.capture(entry),true);
  assert.deepEqual(order,['wording','memory']);assert.equal(app.saves,1);
  assert.equal(app.state.burdenMemory.notes.length,2);
  assert.ok(app.store.context('I struggle with night shifts').includes('I work night shifts.'));
  assert.equal(app.store.summary().count,2);assert.ok(app.store.summary().bytes>0);
  assert.deepEqual(app.state.scriptureRequests,[entry],'remembering never rewrites the chat entry');
});

test('opening memory does not scan existing chat history or request the model',async()=>{
  let calls=0;const app=open({native:{async extractMemory(){calls++;return {available:true,notes:[]};}}});
  await Promise.resolve();assert.equal(calls,0);assert.equal(app.saves,0);
});

test('duplicate queued captures and processed entries use the model only once',async()=>{
  let calls=0;const app=open({native:{async extractMemory(){calls++;return {available:true,notes:['I prefer brief replies.']};}}});
  const first=app.store.capture(entry),second=app.store.capture(entry);
  assert.equal(await second,false);assert.equal(await first,true);
  assert.equal(await app.store.capture(entry),false);assert.equal(calls,1);
  const note=app.state.burdenMemory.notes[0];app.store.forget(note.id);
  assert.equal(await app.store.capture(entry),false);assert.equal(calls,1,'forgetting a memory cannot recreate it from the same entry');
});

test('turning memory off retains notes and disables both collection and future context',async()=>{
  const memory=model.remember(undefined,['I prefer brief replies.'],{sourceId:entry.id,sourceText:entry.text,at:entry.at});
  let calls=0;const app=open({memory,native:{extractMemory(){calls++;}}});
  assert.equal(app.store.setEnabled(false),true);assert.equal(app.state.burdenMemory.notes.length,1);
  assert.deepEqual(clean(app.store.context(entry.text)),[]);
  assert.equal(await app.store.capture({...entry,id:'new-entry'}),false);assert.equal(calls,0);
  assert.equal(app.store.setEnabled('on'),false);assert.equal(app.store.enabled(),false);
  app.store.setEnabled(true);assert.deepEqual(clean(app.store.context(entry.text)),['I prefer brief replies.']);
});

test('late extraction cannot reappear after off, clear, forgetting the source or leaving chat',async()=>{
  for(const action of ['off','clear','source','leave']){
    const pending=deferred(),started=deferred(),app=open({native:{extractMemory(){started.resolve();return pending.promise;}}});
    const result=app.store.capture(entry);await started.promise;
    if(action==='off')app.store.setEnabled(false);
    if(action==='clear')app.store.clear();
    if(action==='source'){app.state.scriptureRequests=[];app.store.forgetSource(entry.id);}
    if(action==='leave')app.leave();
    pending.resolve({available:true,notes:['I prefer brief replies.']});
    assert.equal(await result,false,action);assert.equal(model.normalize(app.state.burdenMemory).notes.length,0,action);
  }
});

test('unavailable or malformed extraction preserves existing memory and chat storage',async()=>{
  for(const response of [{available:false,notes:[]},{available:true,notes:'a note'},null]){
    const app=open({native:{async extractMemory(){return response;}}});
    assert.equal(await app.store.capture(entry),false);assert.equal(app.saves,0);
    assert.equal(app.state.burdenMemory,undefined);assert.deepEqual(app.state.scriptureRequests,[entry]);
  }
});

test('clear forgets only memory notes and retains processed IDs, chats and kept passages',()=>{
  const memory=model.remember(undefined,['I prefer brief replies.'],{sourceId:entry.id,sourceText:entry.text,at:entry.at});
  const app=open({memory});app.state.savedPassages=['rest'];app.store.clear();
  assert.deepEqual(clean(app.state.burdenMemory.notes),[]);
  assert.ok(app.state.burdenMemory.processed.includes(entry.id));
  assert.deepEqual(app.state.scriptureRequests,[entry]);assert.deepEqual(app.state.savedPassages,['rest']);
});

test('local memory survives the existing backup and restore format without a separate storage key',()=>{
  const data=require('../public/data-tools-model.js'),memory=model.remember(undefined,['I prefer brief replies.'],{sourceId:entry.id,sourceText:entry.text,at:entry.at});
  const raw=JSON.stringify({days:{},burdenMemory:memory,profile:{burdenMemoryEnabled:true},scriptureRequests:[entry]});
  const storage={getItem:key=>key==='steady.v1'?raw:null};
  const restored=JSON.parse(data.parse(data.backup(storage))['steady.v1']);
  assert.deepEqual(model.normalize(restored.burdenMemory),memory);
  assert.equal(restored.profile.burdenMemoryEnabled,true);assert.deepEqual(restored.scriptureRequests,[entry]);
});
test('a reply arriving during extraction waits for the shared model slot rather than failing as busy',async()=>{
  const extraction=deferred(),started=deferred(),order=[];
  const app=open({native:{extractMemory(){order.push('memory started');started.resolve();return extraction.promise;}}});
  const memory=app.store.capture(entry);await started.promise;
  const wording=app.store.runWording(async()=>{order.push('wording started');return {available:true,text:'Prepared reply'};});
  await Promise.resolve();assert.deepEqual(order,['memory started']);
  extraction.resolve({available:true,notes:['I prefer brief replies.']});
  assert.equal(await memory,true);assert.equal((await wording).available,true);
  assert.deepEqual(order,['memory started','wording started']);
});
