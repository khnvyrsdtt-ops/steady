const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Only browser element primitives live here; all wording, caching and request
// validation is supplied by the production module loaded into the VM.
class Element{
  constructor(tag='p'){
    this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;
    this.dataset={};this.attrs={};this.className='';this._text='';this.root=false;
    this.classList={contains:name=>this.className.split(/\s+/).includes(name)};
  }
  get isConnected(){return this.root||Boolean(this.parentElement?.isConnected);}
  get parentNode(){return this.parentElement;}
  get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  set textContent(value){this._text=String(value);for(const node of this.children)node.parentElement=null;this.children=[];}
  set innerHTML(value){throw new Error('Generated wording must be inserted as text, never HTML');}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  appendChild(node){this.append(node);return node;}
  after(node){this.parentElement.insertBefore(node,this.nextElementSibling);}
  insertBefore(node,before){node.remove();node.parentElement=this;this.children.splice(before?this.children.indexOf(before):this.children.length,0,node);}
  remove(){if(this.parentElement){const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null;}}
  setAttribute(name,value){this.attrs[name]=String(value);if(name==='class')this.className=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  matches(selector){return selector.split(',').some(part=>{part=part.trim();return part.startsWith('.')?this.className.split(/\s+/).includes(part.slice(1)):this.tagName===part.toUpperCase();});}
  closest(selector){for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
  querySelectorAll(selector){return this.children.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}

function open({native,profile={},memoryStore}={}){
  const root=new Element('article');root.root=true;
  const prose=new Element(),quote=new Element('blockquote'),reference=new Element();
  prose.className='moment-response';prose.textContent='A prepared response from the local library.';
  quote.textContent='For God so loved the world';reference.className='verse-reference';reference.textContent='John 3:16 · WEB';
  root.append(prose,quote,reference);
  const state={profile},window={SteadyNative:native,SteadyBurdenMemoryStore:memoryStore,SteadyAskRouting:require('../public/ask-routing.js')},listeners={};
  const sandbox={state,window,document:{createElement:tag=>new Element(tag),getElementById:()=>null,addEventListener:(name,handler)=>(listeners[name]||=[]).push(handler)}};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../public/burden-wording.js'),'utf8'),sandbox);
  return {root,prose,quote,reference,state,wording:window.SteadyBurdenWording,memoryChanged(){for(const listener of listeners['steady:memory-changed']||[])listener();},
    addProse(text=prose.textContent){const node=new Element();node.className='moment-response';node.textContent=text;root.append(node);return node;}};
}

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const options={requestId:'entry-1',text:'I feel lonely',sourceText:'A prepared response from the local library.'};
const labels=app=>app.root.querySelectorAll('p,span,small').filter(node=>node.textContent==='Worded with on-device AI');

test('validated wording changes only the supplied prose and labels its origin without saving anything',async()=>{
  const calls=[],app=open({native:{async organiseReply(payload){calls.push(payload);return {available:true,text:'  You can take this one step at a time.  '};}}});
  const quotation=app.quote.textContent,reference=app.reference.textContent,before=JSON.stringify(app.state);
  let layouts=0;
  assert.equal(await app.wording.organise(app.prose,{...options,onLayout(){layouts++;}}),true);
  assert.equal(app.prose.textContent,'You can take this one step at a time.');
  assert.equal(app.prose.children.length,0,'wording is inserted as plain text');
  assert.equal(app.quote.textContent,quotation);assert.equal(app.reference.textContent,reference);
  assert.equal(app.prose.nextElementSibling.textContent,'Worded with on-device AI');
  assert.equal(labels(app).length,1);assert.equal(layouts,1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[options]);
  assert.equal(JSON.stringify(app.state),before,'wording is a presentation change, not a saved entry mutation');
});

test('missing native support and a disabled preference retain the prepared reply without requesting AI',async()=>{
  let calls=0;
  for(const app of [open(),open({profile:{burdenAI:false},native:{async organiseReply(){calls++;return {available:true,text:'New wording'};}}})]){
    const original=app.prose.textContent;
    assert.equal(await app.wording.organise(app.prose,options),false);
    assert.equal(app.prose.textContent,original);assert.equal(labels(app).length,0);
  }
  assert.equal(calls,0);
});

test('unavailable, malformed or unsafe native results leave the original prose and Scripture intact',async()=>{
  const results=[undefined,null,'New wording',{},
    {available:false,text:'New wording'},{available:'true',text:'New wording'},
    {available:true,text:14},{available:true,text:''},{available:true,text:' \n '},
    {available:true,text:'a'.repeat(701)},{available:true,text:Array(101).fill('word').join(' ')},
    {available:true,text:'<img src=x onerror=alert(1)>'},
    {available:true,text:'Find help at https://example.com'},
    {available:true,text:'John 3:16 says this is a replacement quotation.'},
    {available:true,text:'John chapter three promises success.'},
    {available:true,text:'John３:１６ promises success.'},
    {available:true,text:'According to the Bible, your career will flourish.'},
    {available:true,text:'Christ taught that your job is guaranteed.'}];
  for(const result of results){
    const app=open({native:{async organiseReply(){return result;}}}),before=app.root.textContent;
    let layouts=0;
    assert.equal(await app.wording.organise(app.prose,{...options,onLayout(){layouts++;}}),false,JSON.stringify(result));
    assert.equal(app.root.textContent,before);assert.equal(labels(app).length,0);assert.equal(layouts,0);
  }
});

test('word and character limits accept their exact boundary',async()=>{
  for(const text of ['a'.repeat(700),Array(100).fill('word').join(' ')]){
    const app=open({native:{async organiseReply(){return {available:true,text};}}});
    assert.equal(await app.wording.organise(app.prose,options),true);
    assert.equal(app.prose.textContent,text);
  }
});

test('rejected promises and synchronous native errors fall back without an AI label',async()=>{
  for(const organiseReply of [()=>Promise.reject(new Error('Unavailable')),()=>{throw new Error('Bridge unavailable');}]){
    const app=open({native:{organiseReply}}),before=app.root.textContent;
    assert.equal(await app.wording.organise(app.prose,options),false);
    assert.equal(app.root.textContent,before);assert.equal(labels(app).length,0);
  }
});

test('an async result cannot replace prose changed during its request or a removed reply',async()=>{
  for(const change of ['changed','removed']){
    const pending=deferred(),app=open({native:{organiseReply:()=>pending.promise}});
    const result=app.wording.organise(app.prose,options);
    if(change==='changed')app.prose.textContent='A newer prepared response';else app.prose.remove();
    pending.resolve({available:true,text:'Old generated response'});
    assert.equal(await result,false,change);
    assert.equal(app.prose.textContent,change==='changed'?'A newer prepared response':options.sourceText);
    assert.equal(labels(app).length,0);
  }
});

test('a pending result cannot replace actively spoken prose even when the highlighted text is unchanged',async()=>{
  const pending=deferred(),app=open({native:{organiseReply:()=>pending.promise}});
  let layouts=0;
  const result=app.wording.organise(app.prose,{...options,onLayout(){layouts++;}});
  const highlighted=new Element('span');highlighted.className='speech-word spoken';highlighted.textContent=options.sourceText;
  app.prose.textContent='';app.prose.append(highlighted);app.prose.className+=' speech-active';
  assert.equal(app.prose.textContent,options.sourceText,'speech highlighting has not changed the prose');
  pending.resolve({available:true,text:'Wording that arrived after Listen started'});
  assert.equal(await result,false);
  assert.equal(app.prose.textContent,options.sourceText);
  assert.equal(app.prose.children[0],highlighted,'the active speech highlight remains attached');
  assert.equal(highlighted.className,'speech-word spoken');
  assert.equal(labels(app).length,0);assert.equal(layouts,0);
});

test('a newer request wins when two source versions finish out of order',async()=>{
  const pending=[deferred(),deferred()];let calls=0;
  const app=open({native:{organiseReply:()=>pending[calls++].promise}});
  const first=app.wording.organise(app.prose,options);
  app.prose.textContent='Updated library prose.';
  const second=app.wording.organise(app.prose,{...options,sourceText:'Updated library prose.'});
  pending[1].resolve({available:true,text:'Current wording'});assert.equal(await second,true);
  pending[0].resolve({available:true,text:'Outdated wording'});assert.equal(await first,false);
  assert.equal(app.prose.textContent,'Current wording');assert.equal(labels(app).length,1);
});

test('switching the preference off while a request is pending prevents its application',async()=>{
  const pending=deferred(),app=open({native:{organiseReply:()=>pending.promise}});
  const result=app.wording.organise(app.prose,options);app.state.profile.burdenAI=false;
  pending.resolve({available:true,text:'New wording'});
  assert.equal(await result,false);assert.equal(app.prose.textContent,options.sourceText);assert.equal(labels(app).length,0);
});

test('resolved wording is reused for the same request and source, while a changed source or request gets fresh wording',async()=>{
  const calls=[],app=open({native:{async organiseReply(payload){calls.push(payload);return {available:true,text:'Wording '+calls.length};}}});
  assert.equal(await app.wording.organise(app.prose,options),true);
  const duplicate=app.addProse(options.sourceText);
  assert.equal(await app.wording.organise(duplicate,options),true);assert.equal(calls.length,1);
  assert.equal(duplicate.textContent,'Wording 1');
  assert.equal(await app.wording.organise(duplicate,options),true);assert.equal(calls.length,1);
  assert.equal(labels(app).length,2,'reapplying cached wording does not duplicate its label');
  const changed=app.addProse('New library prose');
  await app.wording.organise(changed,{...options,sourceText:'New library prose'});assert.equal(calls.length,2);
  const next=app.addProse(options.sourceText);
  await app.wording.organise(next,{...options,requestId:'entry-2'});assert.equal(calls.length,3);
});

test('an unavailable result is not cached as an AI response and can be retried',async()=>{
  let calls=0;const app=open({native:{async organiseReply(){return ++calls===1?{available:false}:{available:true,text:'Now available'};}}});
  assert.equal(await app.wording.organise(app.prose,options),false);
  assert.equal(await app.wording.organise(app.prose,options),true);
  assert.equal(calls,2);assert.equal(app.prose.textContent,'Now available');assert.equal(labels(app).length,1);
});
test('remembered context reaches only the wording request and changes its cache identity',async()=>{
  let notes=['I prefer brief replies.'];const calls=[];
  const app=open({memoryStore:{context:()=>notes},native:{async organiseReply(payload){calls.push(payload);return {available:true,text:'Prepared wording '+calls.length};}}});
  const quote=app.quote.textContent;
  await app.wording.organise(app.prose,options);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].memories)),notes);
  notes=['I work night shifts.'];app.memoryChanged();
  await app.wording.organise(app.addProse(),options);assert.equal(calls.length,2);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].memories)),notes);
  assert.equal(app.quote.textContent,quote);assert.deepEqual(app.state,{profile:{}});
});
test('forgetting memory invalidates wording that was generated with the forgotten details',async()=>{
  const pending=deferred(),app=open({memoryStore:{context:()=>['I prefer brief replies.']},native:{organiseReply:()=>pending.promise}});
  const result=app.wording.organise(app.prose,options);app.memoryChanged();
  pending.resolve({available:true,text:'An answer with old remembered context'});
  assert.equal(await result,false);assert.equal(app.prose.textContent,options.sourceText);
});
test('a late result cannot refill the cache cleared when memory was forgotten',async()=>{
  const pending=deferred();let calls=0;
  const app=open({memoryStore:{context:()=>['I prefer brief replies.']},native:{organiseReply(){return ++calls===1?pending.promise:Promise.resolve({available:true,text:'Fresh wording'});}}});
  const result=app.wording.organise(app.prose,options);await Promise.resolve();app.memoryChanged();
  pending.resolve({available:true,text:'Old remembered wording'});assert.equal(await result,false);
  assert.equal(await app.wording.organise(app.prose,options),true);assert.equal(calls,2);
  assert.equal(app.prose.textContent,'Fresh wording');
});
test('memory scheduling can wait until an active wording request finishes',async()=>{
  const pending=deferred(),app=open({native:{organiseReply:()=>pending.promise}});
  const result=app.wording.organise(app.prose,options);let idle=false;
  const waiting=app.wording.whenIdle().then(()=>idle=true);
  await Promise.resolve();assert.equal(idle,false);
  pending.resolve({available:true,text:'Prepared wording'});await result;await waiting;
  assert.equal(idle,true);
});

test('quotation, reference and chapter verse targets are protected even when called directly',async()=>{
  let calls=0;const app=open({native:{async organiseReply(){calls++;return {available:true,text:'Replacement'};}}});
  const quotedSpan=new Element('span');quotedSpan.textContent='A quoted phrase';app.quote.append(quotedSpan);
  const chapterVerse=app.addProse('An exact chapter verse');chapterVerse.className='chapter-verse';
  const before=app.root.textContent;
  for(const target of [app.quote,quotedSpan,app.reference,chapterVerse])assert.equal(await app.wording.organise(target,{...options,sourceText:target.textContent}),false);
  assert.equal(calls,0);assert.equal(app.root.textContent,before);assert.equal(labels(app).length,0);
});

test('simultaneous identical requests share one native operation',async()=>{
  const pending=deferred();let calls=0;
  const app=open({native:{organiseReply(){calls++;return pending.promise;}}}),second=app.addProse(options.sourceText);
  const firstResult=app.wording.organise(app.prose,options),secondResult=app.wording.organise(second,options);
  await Promise.resolve();assert.equal(calls,1);
  pending.resolve({available:true,text:'Shared wording'});
  assert.deepEqual(await Promise.all([firstResult,secondResult]),[true,true]);
  assert.equal(app.prose.textContent,'Shared wording');assert.equal(second.textContent,'Shared wording');assert.equal(labels(app).length,2);
});

test('invalid or overlong input is rejected before the native bridge',async()=>{
  let calls=0;const app=open({native:{async organiseReply(){calls++;return {available:true,text:'New wording'};}}});
  for(const changed of [{sourceText:''},{sourceText:' '},{sourceText:null},{sourceText:'a'.repeat(3001)},
    {text:null},{text:'a'.repeat(1201)},{requestId:null},{requestId:'a'.repeat(161)}]){
    assert.equal(await app.wording.organise(app.prose,{...options,...changed}),false);
  }
  assert.equal(calls,0);assert.equal(app.prose.textContent,options.sourceText);assert.equal(labels(app).length,0);
});
