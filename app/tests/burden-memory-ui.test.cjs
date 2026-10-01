const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const memory=require('../public/burden-memory-model.js');
const source=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

function open({notes=[],savedPassages=[],profile={},writable=true,available=true}={}){
  let activeElement=null,saves=0,navigation=null;
  class Element{
    constructor(tag='div'){this.tag=tag;this.children=[];this.parent=null;this.attrs={};this.className='';this._text='';this.hidden=false;this.events={};this.classList={add:(...names)=>{this.className+=' '+names.join(' ');},contains:name=>this.className.split(/\s+/).includes(name)};}
    get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
    set textContent(text){this._text=String(text);this.replaceChildren();}
    get isConnected(){return this.root||Boolean(this.parent?.isConnected);}
    append(...nodes){for(const node of nodes)this.insertBefore(node,null);}
    insertBefore(node,before){node.remove();node.parent=this;this.children.splice(before?this.children.indexOf(before):this.children.length,0,node);}
    replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this.append(...nodes);}
    remove(){if(this.parent){const children=this.parent.children;children.splice(children.indexOf(this),1);this.parent=null;}}
    setAttribute(name,value){this.attrs[name]=String(value);}
    getAttribute(name){return this.attrs[name]??null;}
    addEventListener(name,fn){this.events[name]=fn;}
    focus(){activeElement=this;}
    querySelectorAll(selector){const matches=node=>selector.startsWith('#')?node.id===selector.slice(1):selector.startsWith('.')?node.className.split(/\s+/).includes(selector.slice(1)):node.tag===selector;return this.children.flatMap(node=>[...(matches(node)?[node]:[]),...node.querySelectorAll(selector)]);}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  }
  const root=new Element(),scripture=new Element('section'),details=new Element('details');root.root=true;details.className='scripture-details';scripture.append(details);root.append(scripture);
  const listeners={},panels={},keys=['rest','grace','wisdom','connection','gratitude','foundation'];
  const library=Object.fromEntries(keys.map((key,index)=>[key,{reference:'Reference '+(index+1),translations:{web:{text:'WEB passage '+key},asv:{text:'ASV passage '+key}}}]));
  const state={profile:{...profile},savedPassages:[...savedPassages],burdenMemory:{version:1,notes,processed:[]},scriptureRequests:[{id:'chat-a'},{id:'chat-b'}]};
  const day={scriptureTheme:'rest'};
  const document={body:new Element('body'),documentElement:{dataset:{}},createElement:tag=>new Element(tag),get activeElement(){return activeElement;},addEventListener(name,fn){(listeners[name]||=[]).push(fn);},dispatchEvent(event){for(const fn of listeners[event.type]||[])fn(event);}};
  const experience={routePanel:()=>({node:scripture}),scriptureChoice:()=>({key:day.scriptureTheme}),haptic(){},addPanel(route,title){const panel=new Element('section');panels[route]={node:panel,title};root.append(panel);return panel;}};
  const window={steadyExperience:experience,SteadyBurdenMemory:memory,SteadyNative:{localAIStatus:()=>Promise.resolve({available})}};
  const sandbox={window,document,state,day,location:{hash:'#home'},ScriptureLibrary:library,SteadyGuide:{themes:Object.fromEntries(keys.map(key=>[key,key]))},storageAvailable:writable,checkDay(){},save(){saves++;return writable;},navigateScreen(...args){navigation=args;},renderScreen(){},CustomEvent:class{constructor(type){this.type=type;}}};
  vm.createContext(sandbox);vm.runInContext(source('burden-memory.js')+'\n'+source('saved-passages.js'),sandbox);
  const visit=route=>document.dispatchEvent({type:'steady:screen',detail:route});
  visit('help/memory');
  const panel=panels['help/memory'].node;
  return {state,day,document,panels,panel,scripture,window,visit,keys,
    get saves(){return saves;},get navigation(){return navigation;},
    find:selector=>panel.querySelector(selector),
    click:element=>element.events.click({preventDefault(){}}),
    toggle(value){const control=panel.querySelector('#burden-memory-enabled');control.checked=value;control.events.change();},
    translation(value){document.documentElement.dataset.translation=value;document.dispatchEvent({type:'change',target:{id:'setting-translation'}});}};
}
const note=(id,text,at='2026-09-27T10:00:00.000Z')=>({id,text,sourceId:'source-'+id,at});

test('Memory shows a clear empty state and reports normalized memory bytes separately from chats',()=>{
  const app=open(),before=JSON.stringify(app.state);
  assert.equal(app.panels['help/memory'].title,'Memory');assert.equal(app.panels['learn/saved'],undefined);
  assert.equal(app.find('.memory-intro').textContent,'Remembered on this device.');
  assert.equal(app.find('#burden-memory-enabled').checked,true);
  assert.equal(app.find('.memory-empty').textContent,'Useful details will appear here as you chat.');
  assert.equal(app.find('.memory-empty').hidden,false);
  assert.equal(app.find('#burden-memory-storage').textContent,`${memory.byteSize(app.state.burdenMemory)} bytes · 0 of 20 details`);
  assert.equal(app.find('#burden-memory-chat-count').textContent,'2 chat entries are stored separately.');
  assert.equal(app.find('#burden-memory-clear').hidden,true);
  assert.equal(JSON.stringify(app.state),before);assert.equal(app.saves,0);
});

test('remembered detail text is literal and storage bytes count UTF-8 normalized memory only',()=>{
  const text='<img src=x onerror=alert(1)> Éireann 🌱',app=open({notes:[note('one',text)],savedPassages:['rest']});
  const rendered=app.find('.memory-note-text');
  assert.equal(rendered.textContent,text);assert.equal(rendered.children.length,0);
  const bytes=memory.byteSize(app.state.burdenMemory);
  assert.equal(app.find('#burden-memory-storage').textContent,`${bytes} bytes · 1 of 20 details`);
  assert.equal(app.find('.memory-forget').getAttribute('data-navigation-focus'),'memory-note:one');
  assert.equal(app.find('.memory-forget').getAttribute('aria-describedby'),rendered.id);
  assert.equal(app.find('.saved-passage-card').getAttribute('data-navigation-focus'),'saved-passage:rest');
});

test('turning memory off keeps existing notes and makes the effect explicit',()=>{
  const app=open({notes:[note('one','I prefer short replies.')],savedPassages:['rest']});
  const notesBefore=JSON.stringify(app.state.burdenMemory),passagesBefore=JSON.stringify(app.state.savedPassages),chatsBefore=JSON.stringify(app.state.scriptureRequests);
  app.toggle(false);
  assert.equal(app.state.profile.burdenMemoryEnabled,false);assert.equal(app.find('#burden-memory-enabled').checked,false);
  assert.equal(app.find('#burden-memory-off-note').textContent,'Off keeps your notes, but stops remembering and using them.');
  assert.match(app.find('#burden-memory-status').textContent,/Memory is off.*Existing notes are kept/);
  assert.equal(JSON.stringify(app.state.burdenMemory),notesBefore);assert.equal(JSON.stringify(app.state.savedPassages),passagesBefore);assert.equal(JSON.stringify(app.state.scriptureRequests),chatsBefore);
  app.toggle(true);assert.equal(app.state.profile.burdenMemoryEnabled,true);assert.equal(app.saves,2);
});

test('individual Forget removes only that detail and moves focus to the next available action',()=>{
  const app=open({notes:[note('one','First detail'),note('two','Second detail','2026-09-26T10:00:00.000Z')],savedPassages:['rest']});
  const chats=JSON.stringify(app.state.scriptureRequests),passages=JSON.stringify(app.state.savedPassages);
  const first=app.find('.memory-forget');first.focus();app.click(first);
  assert.deepEqual(app.state.burdenMemory.notes.map(item=>item.id),['two']);
  assert.equal(app.document.activeElement.getAttribute('data-navigation-focus'),'memory-note:two');
  assert.equal(app.find('#burden-memory-status').textContent,'Detail forgotten.');
  assert.equal(JSON.stringify(app.state.scriptureRequests),chats);assert.equal(JSON.stringify(app.state.savedPassages),passages);
  app.click(app.find('.memory-forget'));
  assert.equal(app.document.activeElement,app.find('#burden-memory-heading'));assert.equal(app.find('.memory-empty').hidden,false);
});

test('clearing all memory requires the inline confirmation and leaves chats and kept passages intact',()=>{
  const app=open({notes:[note('one','A remembered detail')],savedPassages:['rest','grace']});
  const before=JSON.stringify(app.state);app.click(app.find('#burden-memory-clear'));
  assert.equal(app.find('#burden-memory-confirm').hidden,false);assert.equal(app.document.activeElement,app.find('#burden-memory-cancel'));
  assert.equal(JSON.stringify(app.state),before);assert.equal(app.saves,0);
  app.click(app.find('#burden-memory-cancel'));
  assert.equal(app.find('#burden-memory-confirm').hidden,true);assert.equal(app.document.activeElement,app.find('#burden-memory-clear'));
  assert.equal(JSON.stringify(app.state),before);
  app.click(app.find('#burden-memory-clear'));app.click(app.find('#burden-memory-confirm-forget'));
  assert.equal(app.state.burdenMemory.notes.length,0);assert.deepEqual(app.state.savedPassages,['rest','grace']);assert.equal(app.state.scriptureRequests.length,2);
  assert.equal(app.find('#burden-memory-confirm').hidden,true);assert.equal(app.find('#burden-memory-clear').hidden,true);
  assert.equal(app.document.activeElement,app.find('#burden-memory-heading'));
  assert.match(app.find('#burden-memory-status').textContent,/Chats and kept passages are unchanged/);
});

test('memory availability and storage failure are stated without claiming a durable save',async()=>{
  const app=open({notes:[note('one','A remembered detail')],available:false,writable:false});
  await new Promise(setImmediate);
  assert.match(app.find('#burden-memory-availability').textContent,/unavailable on this device/);
  assert.match(app.find('#burden-memory-availability').textContent,/No cloud service/);
  app.click(app.find('.memory-forget'));
  assert.match(app.find('#burden-memory-status').textContent,/for this visit.*storage could not be updated/);
  app.toggle(false);assert.match(app.find('#burden-memory-status').textContent,/visit only/);
});

test('memory refresh retains focus on a rebuilt note control',()=>{
  const app=open({notes:[note('one','One detail')]});
  const first=app.find('.memory-forget');first.focus();
  app.document.dispatchEvent({type:'steady:memory-changed'});
  assert.equal(first.isConnected,false);assert.notEqual(app.document.activeElement,first);
  assert.equal(app.document.activeElement.getAttribute('data-navigation-focus'),'memory-note:one');
});

test('kept passages preserve pagination, translations, Keep action and the original return control',()=>{
  const app=open({notes:[note('one','One detail')],savedPassages:['rest','grace','wisdom','connection','gratitude','foundation']});
  const originalMemory=JSON.stringify(app.state.burdenMemory);
  assert.equal(app.find('.saved-passages-list').children.length,4);
  const [previous,,next]=app.find('.saved-passages-pagination').children;
  app.click(next);assert.equal(app.find('.saved-passages-list').children.length,2);
  app.click(previous);assert.equal(app.find('.saved-passages-list').children.length,4);
  app.translation('asv');assert.match(app.find('.saved-passage-text').textContent,/^ASV passage/);
  const card=app.find('.saved-passage-card');app.click(card);
  assert.equal(app.navigation[0],'learn/scripture');assert.equal(app.navigation[2],card);
  assert.equal(card.getAttribute('data-navigation-focus'),'saved-passage:rest');
  const keep=app.scripture.querySelector('.chip');assert.equal(keep.textContent,'Kept');app.click(keep);
  assert.equal(keep.textContent,'Keep passage');assert.equal(app.state.savedPassages.includes('rest'),false);
  assert.equal(JSON.stringify(app.state.burdenMemory),originalMemory);
});
