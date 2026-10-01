const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

class Element {
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.events={};this._text='';}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this._text='';this.append(...nodes);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  addEventListener(type,fn){this.events[type]=fn;}
  click(){this.events.click?.();}
  set textContent(text){this._text=String(text);this.children=[];}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
}
const descendants=(node,tag)=>node.children.flatMap(child=>[...(child.tag===tag?[child]:[]),...descendants(child,tag)]);
const button=(node,text)=>descendants(node,'button').find(child=>child.textContent===text);
const flush=()=>new Promise(resolve=>setImmediate(resolve));

// The adapter only provides DOM nodes, a controllable network completion and a
// timer clock. The production module owns loading, failure, retry and rendering.
function open({initiallyReady=false,missingLookup=false,wording,readingNote}={}){
  const head=new Element('head'),transcript=new Element('section'),scripts=[],timers=new Map(),passageReads=[];
  let ready=initiallyReady,nextTimer=0;
  const bible={
    ready:()=>ready,
    getPassage(reference,translation){passageReads.push({reference,translation});return{ok:true,reference,translation,verses:[{number:16,text:'A fixture passage.'}],note:''};}
  };
  const originalAppend=head.append.bind(head);head.append=(script)=>{scripts.push(script);originalAppend(script);};
  const sandbox={window:{...(missingLookup?{}:{SteadyBible:bible}),SteadyBurdenWording:wording},SteadyStudy:{notes:{},context:()=>readingNote||null},
    document:{head,createElement:tag=>new Element(tag)},
    setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/scripture-study-ui.js'),'utf8'),sandbox);
  return{head,transcript,scripts,timers,passageReads,
    mount(text='John 3:16',study={kind:'reference',query:text}){
      const reply=new Element('article'),events={forgotten:0,layouts:0,read:[]};transcript.append(reply);
      sandbox.window.SteadyStudyUI.mount(reply,{id:'lookup-'+transcript.children.length,text,study},'web',{
        read:reference=>events.read.push(reference),forget(){events.forgotten++;reply.remove();},layout(){events.layouts++;},wording:true
      });
      return{reply,events};
    },
    metadataLoaded(){sandbox.window.SteadyBible=bible;scripts.at(-1).onload();},
    loaded(index=scripts.length-1,{withData=true}={}){ready=withData;scripts[index].onload();},
    failed(index=scripts.length-1){scripts[index].onerror();},
    timeout(){assert.equal(timers.size,1,'one request owns one timeout');const [id,timer]=[...timers][0];timers.delete(id);timer.fn();}
  };
}

test('an already bundled Bible renders immediately without a network request or timeout',()=>{
  const app=open({initiallyReady:true}),entry=app.mount();
  assert.equal(app.scripts.length,0);assert.equal(app.timers.size,0);
  assert.match(entry.reply.textContent,/A fixture passage/);assert.equal(entry.events.layouts,1);
  assert.equal(button(entry.reply,'Forget').type,'button');
  button(entry.reply,'Read chapter').click();assert.deepEqual(entry.events.read,['John 3:16']);
});

test('Scripture reading notes remain library text even when on-device wording is enabled',()=>{
  let calls=0;
  const copy='A prepared explanation with its original uncertainty.';
  const app=open({initiallyReady:true,readingNote:{title:'Reading context',copy,source:'https://example.org/fixture'},
    wording:{enabled:()=>true,organise(){calls++;throw new Error('Scripture must not use generated wording');}}});
  const entry=app.mount();
  assert.equal(calls,0);
  assert.ok(entry.reply.textContent.includes(copy));
  assert.ok(entry.reply.textContent.includes('A fixture passage.'));
});

test('concurrent entries share one lazy request and all render when it finishes',async()=>{
  const app=open(),first=app.mount('John 3:16'),second=app.mount('Romans 8:16');
  assert.equal(app.scripts.length,1);assert.equal(app.timers.size,1);
  assert.match(first.reply.textContent,/Opening the Bible library/);assert.match(second.reply.textContent,/Opening the Bible library/);
  assert.equal(app.passageReads.length,0,'unavailable data is never presented as a passage');
  app.loaded();await flush();
  assert.equal(app.timers.size,0);assert.equal(first.events.layouts,1);assert.equal(second.events.layouts,1);
  assert.match(first.reply.textContent,/John 3:16 · WEB/);assert.match(second.reply.textContent,/Romans 8:16 · WEB/);
  assert.deepEqual(app.passageReads.map(entry=>entry.reference),['John 3:16','Romans 8:16']);
  const third=app.mount();assert.match(third.reply.textContent,/A fixture passage/);assert.equal(app.scripts.length,1);
});

test('a failed request gives each entry a retry and their retries share one new request',async()=>{
  const app=open(),first=app.mount(),second=app.mount('Romans 8:16');
  app.failed();await flush();
  assert.equal(app.timers.size,0);assert.equal(app.head.children.length,0);
  for(const entry of [first,second]){
    assert.match(entry.reply.textContent,/Bible library couldn’t open/);
    assert.ok(button(entry.reply,'Try again'));assert.ok(button(entry.reply,'Forget'));
    assert.equal(descendants(entry.reply,'blockquote').length,0);
    button(entry.reply,'Try again').click();
  }
  assert.equal(app.scripts.length,2,'the two retries start only one replacement request');
  assert.equal(app.timers.size,1);
  app.loaded();await flush();
  assert.match(first.reply.textContent,/A fixture passage/);assert.match(second.reply.textContent,/A fixture passage/);
  assert.equal(button(first.reply,'Try again'),undefined);assert.equal(app.timers.size,0);
});

test('a timed-out request can retry successfully without losing the entry or its Forget action',async()=>{
  const app=open(),entry=app.mount();
  app.timeout();await flush();
  assert.equal(app.head.children.length,0);assert.equal(app.transcript.children[0],entry.reply);
  assert.match(entry.reply.textContent,/Your entry is still here/);assert.ok(button(entry.reply,'Forget'));
  button(entry.reply,'Try again').click();assert.equal(app.scripts.length,2);
  app.loaded();await flush();
  assert.match(entry.reply.textContent,/A fixture passage/);assert.equal(entry.events.forgotten,0);
});

test('a script that loads without usable Bible data fails visibly and can be retried',async()=>{
  const app=open(),entry=app.mount();app.loaded(0,{withData:false});await flush();
  assert.equal(app.passageReads.length,0);assert.equal(app.timers.size,0);
  assert.match(entry.reply.textContent,/Bible library couldn’t open/);
  button(entry.reply,'Try again').click();assert.equal(app.scripts.length,2);
  app.loaded();await flush();assert.match(entry.reply.textContent,/A fixture passage/);
});

test('Forget remains available during loading and a later response does not reinsert the entry',async()=>{
  const app=open(),entry=app.mount(),forget=button(entry.reply,'Forget');
  assert.ok(forget);assert.equal(forget.type,'button');assert.notEqual(forget.disabled,true);
  assert.match(forget.attrs['aria-label'],/Forget Scripture lookup: John 3:16/);
  forget.click();assert.equal(entry.events.forgotten,1);assert.equal(app.transcript.children.length,0);
  app.loaded();await flush();
  assert.equal(app.transcript.children.length,0);assert.equal(entry.events.forgotten,1);
  assert.equal(app.timers.size,0);
});

test('a partially loaded Expo page can recover the lookup module before loading its corpus',async()=>{
  const app=open({missingLookup:true}),entry=app.mount();
  assert.match(app.scripts[0].src,/bible-search\.js/);
  assert.match(entry.reply.textContent,/Opening the Bible library/);
  app.metadataLoaded();await flush();
  assert.equal(app.scripts.length,2);assert.match(app.scripts[1].src,/bible-data\.js/);
  app.loaded();await flush();
  assert.match(entry.reply.textContent,/A fixture passage/);assert.equal(app.timers.size,0);
});

test('clarifying an ambiguous question needs no network or Bible corpus',()=>{
  const app=open({missingLookup:true});
  const entry=app.mount('explain that',{kind:'clarify',query:'followup'});
  assert.match(entry.reply.textContent,/Which passage do you mean/);
  assert.equal(app.scripts.length,0);assert.equal(app.timers.size,0);
  assert.ok(button(entry.reply,'Forget'));
});
