const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = file => fs.readFileSync(require.resolve('../public/' + file), 'utf8');

// A small DOM adapter runs the production UI handlers. It contains no matching,
// submission, draft, memory, opt-out, or deletion behaviour from the application.
class Element {
  constructor(tag = 'div') {
    this.tag = tag; this.children = []; this.attrs = {}; this.events = {}; this.className = ''; this.value = ''; this.hidden = false; this.open = false; this._text = '';
    this.style = {setProperty(name,value) {this[name]=value;}}; this.scrollTop = 0; this.scrollHeight = 1000; this.clientHeight = 320; this.mutations = [];
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: name => {if (!this.className.split(/\s+/).includes(name)) this.className += ' ' + name;},
      remove: name => {this.className = this.className.split(/\s+/).filter(value => value !== name).join(' ');}
    };
  }
  append(...nodes) { for (const node of nodes) this.insertBefore(node,null); }
  replaceChildren(...nodes) { for(const child of this.children.slice())child.remove();this.append(...nodes); }
  insertBefore(node,before) {
    if(node===before)return;
    node.remove();
    const index=before?this.children.indexOf(before):this.children.length;
    assert.ok(index>=0,'insertion reference belongs to its parent');
    node.parent=this;this.children.splice(index,0,node);this.mutations.push({type:'add',node});
  }
  remove() {
    if(!this.parent)return;
    const parent=this.parent,index=parent.children.indexOf(this);
    assert.ok(index>=0,'removed child belongs to its parent');
    parent.children.splice(index,1);parent.mutations.push({type:'remove',node:this});this.parent=null;
  }
  get nextElementSibling() {return this.parent?.children[this.parent.children.indexOf(this)+1]||null;}
  get parentElement() {return this.parent||null;}
  get isConnected() {return Boolean(this.connectedRoot||this.parent?.isConnected);}
  closest(selector) {
    const parts=selector.split(',').map(part=>part.trim());
    for(let node=this;node;node=node.parent)if(parts.some(part=>part.startsWith('.')?node.className.split(/\s+/).includes(part.slice(1)):node.tag===part))return node;
    return null;
  }
  before(node) { const i = this.parent.children.indexOf(this); node.parent = this.parent; this.parent.children.splice(i, 0, node); }
  after(node) { const i = this.parent.children.indexOf(this); node.parent = this.parent; this.parent.children.splice(i + 1, 0, node); }
  setAttribute(key, value) { this.attrs[key] = value; if (key === 'class') this.className = value; if (key === 'id') this.id = value; if (key === 'open') this.open = true; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(type, fn) { this.events[type] = fn; }
  focus() { this.focused = true; }
  blur() { this.blurred = true; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  set innerHTML(html) {
    this.children = []; const stack = [this];
    for (const token of html.match(/<\/?[^>]+>|[^<]+/g) || []) {
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (token.startsWith('<')) {
        const tag = token.match(/^<([\w-]+)/)?.[1]; if (!tag) continue;
        const element = new Element(tag);
        for (const attr of token.matchAll(/([\w-]+)="([^"]*)"/g)) element.setAttribute(attr[1], attr[2]);
        stack.at(-1).append(element);
        if (!['input','br','hr','img','meta','link'].includes(tag) && !token.endsWith('/>')) stack.push(element);
      } else stack.at(-1)._text += token;
    }
  }
  querySelectorAll(selector) {
    const parts = selector.split(/\s+/);
    const matches = (node, part) => part.startsWith('#') ? node.id === part.slice(1) : part.startsWith('.') ? node.className.split(/\s+/).includes(part.slice(1)) : node.tag === part;
    const descend = (node, part) => node.children.flatMap(child => [...(matches(child, part) ? [child] : []), ...descend(child, part)]);
    return parts.reduce((nodes, part) => nodes.flatMap(node => descend(node, part)), [this]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function productionSection(file, from, to) {
  const text = source(file), start = text.indexOf(from), end = text.indexOf(to, start);
  assert.ok(start >= 0 && end > start, 'The tested production function is present');
  return text.slice(start, end);
}

function openFeelings({profile = {}, day:initialDay = {}, history = [], olderDays = {}, writable = true, reducedMotion = false, study = false, branches = false, wordingReply, interpretReply, answerReply, nativePlatform, memoryStore} = {}) {
  const day = {mind:'',intention:'',reflection:'',reflections:[],tasks:[],context:{},...initialDay};
  const state = {profile,days:{...olderDays,'2026-09-24':day},scriptureRequests:history};
  const root = new Element(), hub = new Element(), screenHeader = new Element('header'), scripture = new Element();
  root.connectedRoot=true;
  hub.innerHTML = '<article class="home-scripture"></article><textarea id="home-thought"></textarea><blockquote id="home-verse"></blockquote><p id="home-reference"></p><p id="home-match-reason"></p>';
  scripture.innerHTML = '<h2 id="truth-title"></h2><blockquote id="personal-verse"></blockquote><details class="scripture-details"><select id="scripture-theme"></select></details>';
  const styleControl=new Element('select');styleControl.setAttribute('id','setting-help-style');
  root.append(hub, screenHeader, scripture, styleControl);
  const listeners = {}, panels = {}, resizeObservers = [];
  let stored, saves = 0, ids = 0, currentRoute = 'today/feelings', checks = 0;
  const document = {createElement:tag => new Element(tag), getElementById:id => root.querySelector('#' + id), documentElement:{dataset:{}}, addEventListener(type, fn) {(listeners[type] ||= []).push(fn);}};
  const experience = {addPanel(route, title, html) {const panel = new Element('section'); panel.innerHTML = html; panel.screenTitle=title; root.append(panel); panels[route] = panel; return panel;}, routePanel:() => ({node:scripture}), haptic() {}};
  const visit = route => {currentRoute = route; sandbox.location.hash = '#' + route; for (const fn of listeners['steady:screen'] || []) fn({detail:route});};
  // The animal store is real storage, so the screen can only be shown a restored
  // choice if the sandbox actually has somewhere to restore it from. A test that
  // seeds storage and expects the portrait to follow was reading the default
  // animal here and reporting a page bug that was not there.
  const sandbox = {state,day,hub,screenHeader,document,setTimeout,clearTimeout,speakCalls:[],speakStops:0,wheelRegistries:[],localStorage:globalThis.localStorage,window:{addEventListener(type,fn){(listeners['window:'+type] ||= []).push(fn);},steadyExperience:experience,matchMedia:() => ({matches:reducedMotion}),ResizeObserver:class {constructor(callback) {this.callback=callback;} observe(target) {resizeObservers.push({target,callback:this.callback});}},SteadyNative:{speak(text,key) {sandbox.speakCalls.push({text,key}); return Promise.resolve(true);},stopSpeaking() {sandbox.speakStops++; return Promise.resolve(true);},showAnimalWheel(registry) {sandbox.wheelRegistries.push(registry);}}},location:{hash:'#today/feelings'},SteadyIcons:{svg:(name)=>`<svg class="steady-icon" data-icon="${name}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1 1"/></svg>`},
    taskId:() => 'new-' + ++ids,checkDay:() => checks++,save() {saves++; if (writable) stored = structuredClone(state); return writable;},navigateScreen:visit,renderScreen:() => visit(currentRoute),toast(message) {sandbox.lastToast = message;},
    profile:() => state.profile,ctx:() => sandbox.G.context(state.profile, day.context)};
  vm.createContext(sandbox);
  if(interpretReply){
    sandbox.window.SteadyNative.localAIStatus=async()=>({available:true});
    sandbox.window.SteadyNative.interpretAsk=interpretReply;
  }
  if(answerReply)sandbox.window.SteadyNative.answerAsk=answerReply;
  if(nativePlatform)sandbox.window.SteadyNative.platform=nativePlatform;
  if(memoryStore)sandbox.window.SteadyBurdenMemoryStore={capture:async()=>false,context:()=>[],...memoryStore};
  if(wordingReply){sandbox.window.SteadyNative.organiseReply=wordingReply;vm.runInContext(source('burden-wording.js'),sandbox);}
  vm.runInContext(['scripture-feelings-model.js','guidance.js','scriptures.js','chapters.js','scripture-help-guides.js'].map(source).join('\n') + '\nglobalThis.G=SteadyGuide;globalThis.Help=SteadyScriptureHelp;globalThis.Chapters=ScriptureChapters;', sandbox);
  if(branches)vm.runInContext(source('burden-branches.js'),sandbox);
  if(study)vm.runInContext(['bible-data.js','bible-search.js','scripture-study.js'].map(source).join('\n')+'\nwindow.SteadyBible=globalThis.SteadyBible;\n'+source('scripture-study-ui.js'),sandbox);
  vm.runInContext(productionSection('experience.js', '  function chooseScripture()', "  learn.classList.add('scripture-panel')") + '\nwindow.steadyExperience.scriptureChoice=chooseScripture;', sandbox);
  vm.runInContext(productionSection('screens.js', 'function renderHomeScripture()', 'const screenHeader'), sandbox);
  // The animals are part of the real screen now, so they are loaded here too:
  // without them the portrait code is never exercised by any of these tests.
  vm.runInContext(source('burden-animals.js'), sandbox);
  vm.runInContext(source('ask-help.js'), sandbox);
  vm.runInContext(source('ask-routing.js'), sandbox);
  vm.runInContext(source('chat-actions.js'), sandbox);
  vm.runInContext(source('chat-chapter.js'), sandbox);
  vm.runInContext(source('scripture-feelings.js'), sandbox);
  const panel = panels['today/feelings'], input = panel.querySelector('textarea'), scroller = panel.querySelector('.chat-scroll');
  return {day,state,panel,input,scripture,hub,styleControl,visit,scroller,main:sandbox.window.SteadyMain,composer:sandbox.window.SteadyBurdenComposer,choose:() => experience.scriptureChoice(),home() {sandbox.renderHomeScripture(); return hub.querySelector('#home-reference').textContent;},
    passage:(guide,translation='web') => sandbox.Help.passage(guide,translation,sandbox.Chapters),
    guide:id => sandbox.Help.guides[id],
    guideIds:() => Object.keys(sandbox.Help.guides),
    submit(text) {input.value = text; panel.querySelector('form').events.submit({preventDefault(){}});},
    write(text) {input.value = text; input.events.input();},
    scroll(top) {scroller.scrollTop=top;scroller.events.scroll();},
    resize(height,total=scroller.scrollHeight) {scroller.clientHeight=height;scroller.scrollHeight=total;for(const observer of resizeObservers)observer.callback();},
    viewportResize(total=scroller.scrollHeight) {scroller.scrollHeight=total;for(const fn of listeners['window:resize']||[])fn();},
    translation(value) {document.documentElement.dataset.translation=value;for(const fn of listeners.change||[])fn({target:{id:'setting-translation'}});},
    wording(enabled) {state.profile.burdenAI=enabled;for(const fn of listeners['steady:wording-setting']||[])fn();},
    get stored() {return stored;},get route() {return currentRoute;},get saves() {return saves;},get checks() {return checks;},get toast() {return sandbox.lastToast;},get helpReading() {return experience.helpReading;},
    get speakCalls() {return sandbox.speakCalls;},get speakStops() {return sandbox.speakStops;},
    get wheelRegistries() {return sandbox.wheelRegistries;},
    // Drive a real choice the way the native wheel does, rather than reaching
    // into the animals module: the point is what the person sees afterwards.
    chooseAnimal(choice) {return sandbox.window.SteadyAnimalChosen(choice);},
    animals() {return sandbox.window.SteadyAnimals;},
    range(key,location) {return sandbox.window.SteadySpeechRange(key,location);}};
}

const memory = (id, key, text, at = '2026-09-23T12:00:00.000Z') => ({id,key,text,at});
const entryRow = (app,id) => app.scroller.querySelectorAll('.chat-exchange').find(row=>row.attrs['data-request-id']===id);
const entryAction = (row,label) => row.querySelectorAll('button').find(button=>button.textContent===label);
const isVisible = element => {
  if(!element)return false;
  for(let current=element;current;current=current.parent)if(current.hidden)return false;
  return true;
};

const chooseTool=(app,title)=>{
  const button=app.panel.querySelector('.ask-tools-menu').querySelectorAll('button').find(button=>button.textContent===title);
  assert.ok(button,`composer tool is available: ${title}`);
  app.panel.querySelector('.ask-composer-tools').open=true;
  button.events.click();
  assert.equal(app.panel.querySelector('.ask-composer-tools').open,false);
};

const settleAnswer=()=>new Promise(resolve=>setTimeout(resolve,300));

test('general questions use the on-device answer, persist it and carry actual replies into follow-ups',async()=>{
  const calls=[];
  const app=openFeelings({study:true,answerReply:async payload=>{calls.push(payload);return {available:true,text:calls.length===1?'Dublin is the capital of Ireland.':'It is on Ireland’s east coast.'};}});
  app.submit('Look up the capital of Ireland');
  assert.ok(app.panel.querySelector('.is-typing'));
  await settleAnswer();
  const first=app.state.scriptureRequests[0];
  assert.equal(first.study,undefined);assert.equal(first.answer.text,'Dublin is the capital of Ireland.');
  const row=entryRow(app,first.id);
  assert.equal(row.querySelector('.general-answer').textContent,first.answer.text);
  assert.equal(row.querySelector('.verse-reference'),null);
  app.submit('Can you explain that?');await settleAnswer();
  assert.equal(calls.length,2);assert.equal(app.state.scriptureRequests[0].study,undefined);
  assert.ok(calls[1].history.some(turn=>turn.role==='assistant'&&turn.text===first.answer.text));
  const reopened=openFeelings({history:JSON.parse(JSON.stringify(app.state.scriptureRequests)),answerReply:async()=>{throw new Error('Must not regenerate');}});
  assert.equal(entryRow(reopened,first.id).querySelector('.general-answer').textContent,first.answer.text);
});

test('changing a general answer style continues the on-device conversation with the requested perspective',async()=>{
  for(const [text,perspective] of [
    ['Give me a practical answer','step'],
    ['Give me a step-by-step response','step'],
    ['Give me a balanced answer','balanced'],
    ['Use compare choices','untangle']
  ]){
    const prior={...memory('general','foundation','How can I prepare for a job interview?',new Date().toISOString()),unmatched:true,answer:{source:'on-device',text:'Start by choosing two examples of work you are proud of.'}};
    const calls=[],memoryQueries=[];
    const app=openFeelings({study:true,history:[prior],memoryStore:{context(query){memoryQueries.push(query);return ['I prefer brief answers.'];}},answerReply:async payload=>{calls.push(payload);return {available:true,text:'Write down one example of a problem you solved, then practise describing it aloud.'};}});
    app.submit(text);await settleAnswer();
    assert.equal(calls.length,1,text);
    assert.equal(calls[0].text,text,'the current request is not replaced by a previous question');
    assert.equal(calls[0].perspective,perspective);
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0].history)),[{role:'user',text:prior.text},{role:'assistant',text:prior.answer.text}]);
    assert.equal(memoryQueries[0],prior.text+'\n'+text,'the topic is retained when selecting relevant memory');
    assert.equal(calls[0].memories[0],'I prefer brief answers.');
    const item=app.state.scriptureRequests[0];
    assert.ok(item.answer);assert.equal(item.study,undefined);assert.equal(item.guide,undefined);
    assert.doesNotMatch(entryRow(app,item.id).textContent,/Tell me what you need help with/);
  }
});

test('answer style changes preserve Scripture library results across repeated follow-ups',async()=>{
  for(const question of ['John 3:16','Why did Jesus teach in parables?','Why did Moses strike the rock?']){
    let calls=0;
    const app=openFeelings({study:true,answerReply:async()=>{calls++;return {available:true,text:'An unsupported explanation.'};}});
    app.submit(question);
    assert.ok(app.state.scriptureRequests[0].study,question);
    for(const style of ['Give me a practical answer','Give me a balanced response','Use compare choices']){
      app.submit(style);await new Promise(setImmediate);
      const item=app.state.scriptureRequests[0];
      assert.equal(item.text,style);assert.ok(item.study,question+' stays in the library after '+style);
      assert.equal(item.answer,undefined);assert.equal(calls,0);
      assert.ok(entryRow(app,item.id).querySelector('.study-content'));
      assert.notEqual(item.study.query,style,'the style command never replaces the Scripture subject');
      assert.doesNotMatch(entryRow(app,item.id).textContent,/An unsupported explanation/);
    }
  }
});

test('Scripture style and the explicit Scripture tool cannot reach general AI',async()=>{
  const prior={...memory('general','foundation','How can I plan my week?',new Date().toISOString()),unmatched:true,answer:{source:'on-device',text:'Choose your three priorities before adding smaller tasks.'}};
  for(const question of ['Give me a Scripture answer','Give me a Sage answer']){
    let calls=0;
    const app=openFeelings({study:true,history:[prior],answerReply:async()=>{calls++;return {available:true,text:'Must not run'};}});
    app.submit(question);await new Promise(setImmediate);
    assert.equal(calls,0);assert.ok(app.state.scriptureRequests[0].study);
    assert.equal(app.state.scriptureRequests[0].answer,undefined);
  }
  let calls=0;
  const app=openFeelings({study:true,answerReply:async()=>{calls++;return {available:true,text:'Must not run'};}});
  app.main.openTool('scripture');app.submit('Give me a practical answer');await new Promise(setImmediate);
  assert.equal(calls,0);assert.ok(app.state.scriptureRequests[0].study);
});

test('styles retain a recent curated guide and never borrow stale or interrupted general context',async()=>{
  let calls=0;
  const answerReply=async()=>{calls++;return {available:true,text:'Must not run'};};
  const at=new Date().toISOString();
  const guide={...memory('guide','wisdom','I need help making a decision',at),guide:'decisions',helpStyle:'donkey'};
  const curated=openFeelings({study:true,history:[guide],answerReply});
  curated.submit('Give me a practical answer');
  assert.equal(curated.state.scriptureRequests[0].guide,'decisions');
  assert.equal(curated.state.scriptureRequests[0].answer,undefined);
  const general={...memory('general','foundation','How can I prepare for an interview?',at),unmatched:true,answer:{source:'on-device',text:'Practise describing a problem you solved.'}};
  for(const history of [[],[{...general,at:new Date(Date.now()-3*60*60*1000).toISOString()}],[{...memory('reflection','foundation','A good walk today',at),reflection:true},general]]){
    const app=openFeelings({study:true,history,answerReply});
    app.submit('Give me a practical answer');
    assert.equal(app.state.scriptureRequests[0].answer,undefined);
    assert.match(entryRow(app,app.state.scriptureRequests[0].id).textContent,/Tell me what you need help with/);
  }
  await new Promise(setImmediate);assert.equal(calls,0);
});

test('unsupported saved AI Scripture is neither displayed nor reused as model context',async()=>{
  const invalid='John 3:99 says every bicycle will save you.';
  const prior={...memory('unsafe','foundation','How does a bicycle work?',new Date().toISOString()),unmatched:true,answer:{source:'on-device',text:invalid}};
  let payload;
  const app=openFeelings({study:true,history:[prior],answerReply:async request=>{payload=request;return {available:true,text:'The pedals drive a chain, which turns the rear wheel.'};}});
  const row=entryRow(app,prior.id);
  assert.equal(row.querySelector('.general-answer'),null);
  assert.doesNotMatch(row.textContent,/John 3:99|every bicycle will save you/);
  assert.ok(entryAction(row,'Try again'));
  assert.equal(app.state.scriptureRequests[0].answer.text,invalid,'the saved entry itself is preserved');
  app.submit('Explain the pedals');await settleAnswer();
  assert.ok(payload.history.some(turn=>turn.role==='user'&&turn.text===prior.text));
  assert.ok(payload.history.every(turn=>turn.text!==invalid));
});

test('on-device answers use relevant memory only when enabled, read when queued work actually starts',async()=>{
  const notes=['I prefer brief answers.','I work night shifts.'];
  let read=0,payload;
  const enabled=openFeelings({memoryStore:{context(text){read++;assert.equal(text,'How can I plan my week?');return notes;}},answerReply:async request=>{payload=request;return {available:true,text:'Choose one important task for your next day off.'};}});
  enabled.submit('How can I plan my week?');await settleAnswer();
  assert.equal(read,1);assert.deepEqual(payload.memories,notes);

  let release,queued,pendingRead=0;
  const disabled=openFeelings({memoryStore:{context(){pendingRead++;return notes;},runWording(work){queued=work;return new Promise(resolve=>{release=resolve;});}},answerReply:async request=>{payload=request;return {available:true,text:'Choose one priority, then leave space around it.'};}});
  disabled.submit('How can I plan my week?');await new Promise(setImmediate);
  assert.equal(pendingRead,0,'memory is not captured before a queued model turn');
  disabled.state.profile.burdenMemoryEnabled=false;
  release(await queued());await settleAnswer();
  assert.equal(pendingRead,0);assert.equal(payload.memories.length,0);
  assert.ok(disabled.state.scriptureRequests[0].answer,'turning memory off keeps ordinary AI available');
});

test('turning AI off while an answer waits in the model queue prevents generation',async()=>{
  let calls=0,work,release;
  const app=openFeelings({memoryStore:{runWording(operation){work=operation;return new Promise(resolve=>{release=resolve;});}},answerReply:async()=>{calls++;return {available:true,text:'Must not run'};}});
  app.submit('How does a bicycle work?');await new Promise(setImmediate);
  app.wording(false);release(await work());await settleAnswer();
  assert.equal(calls,0);assert.equal(app.state.scriptureRequests[0].answer,undefined);
});

test('Scripture keeps a short loading cue and uses exact library text without general generation',async()=>{
  let calls=0;const app=openFeelings({study:true,nativePlatform:'ios',answerReply:async()=>{calls++;return {available:true,text:'Invented answer'};}});
  app.submit('John 3:16');
  assert.equal(app.state.scriptureRequests.length,0);
  assert.match(app.panel.querySelector('.is-typing').textContent,/Checking the library/);
  app.visit('review');await new Promise(setImmediate);app.visit('today/feelings');
  assert.ok(app.panel.querySelector('.is-typing'),'returning restores the pending cue');
  await settleAnswer();
  assert.equal(calls,0);assert.equal(app.panel.querySelector('.is-typing'),null);
  const item=app.state.scriptureRequests[0],row=entryRow(app,item.id);
  assert.equal(item.study.kind,'reference');
  assert.match(row.textContent,/For God so loved the world/);
  app.submit('Tell me a Bible story');await settleAnswer();assert.equal(calls,0);
  assert.ok(app.state.scriptureRequests[0].study);
});

test('a general answer failure preserves a new draft, rejects duplicate sends, and provides retry',async()=>{
  let reject,calls=0;
  const app=openFeelings({answerReply:()=>{calls++;return new Promise((_,no)=>{reject=no;});}});
  app.submit('How does a bicycle work?');await new Promise(setImmediate);
  app.write('How about an electric bicycle?');app.submit(app.input.value);
  assert.equal(calls,1);assert.match(app.panel.querySelector('#feelings-status').textContent,/previous question/);
  reject(new Error('unavailable'));await settleAnswer();
  assert.equal(app.day.feelingsDraft,'How about an electric bicycle?');
  const item=app.state.scriptureRequests[0],row=entryRow(app,item.id);
  assert.equal(item.answerUnavailable,true);assert.equal(item.answer,undefined);
  assert.match(row.querySelector('.moment-response').textContent,/couldn’t generate/);
  assert.ok(entryAction(row,'Try again'));
});

test('general generation cannot supply invented Scripture and respects the off setting and urgent support',async()=>{
  const app=openFeelings({answerReply:async()=>({available:true,text:'John 3:99 says the bicycle will save you.'})});
  app.submit('How does a bicycle work?');await settleAnswer();
  assert.equal(app.state.scriptureRequests[0].answer,undefined);
  assert.equal(app.state.scriptureRequests[0].answerUnavailable,true);
  let calls=0;
  const disabled=openFeelings({profile:{burdenAI:false},answerReply:async()=>{calls++;return {available:true,text:'Must not run'};}});
  disabled.submit('How does a bicycle work?');assert.equal(calls,0);
  const urgent=openFeelings({nativePlatform:'ios',answerReply:async()=>{calls++;return {available:true,text:'Must not run'};}});
  urgent.submit('I am going to kill myself tonight');
  assert.equal(calls,0);assert.equal(urgent.panel.querySelector('.is-typing'),null);
  assert.match(entryRow(urgent,urgent.state.scriptureRequests[0].id).textContent,/immediate human support/);
});

test('a saved conversation opens directly and starting a new prompt does not alter it',()=>{
  const history=[{...memory('kept','rest','I feel anxious'),guide:'anxiety',helpStyle:'donkey'}];
  const app=openFeelings({history});
  assert.equal(app.scroller.classList.contains('is-starting'),false);
  assert.ok(entryRow(app,'kept'));
  const snapshot=JSON.stringify(app.state.scriptureRequests),saves=app.saves;
  app.main.openTool('talk');
  assert.match(app.panel.querySelector('.chat-inline-prompt').textContent,/What would you like to sort out/);
  assert.equal(JSON.stringify(app.state.scriptureRequests),snapshot);
  assert.equal(app.saves,saves,'choosing a prompt does not save or infer a feeling');
  assert.equal(app.scroller.classList.contains('is-starting'),false);
  assert.ok(entryRow(app,'kept'));
});

test('every composer plus option keeps the conversation and unfinished words on the main screen',()=>{
  const app=openFeelings({history:[memory('kept','rest','I feel anxious')],day:{tasks:[{id:'task-kept',text:'Call Alex',complete:false}]}});
  app.write('I want to finish this thought');
  const saved=JSON.stringify(app.state),saves=app.saves,row=entryRow(app,'kept');
  const tools=app.panel.querySelector('.ask-composer-tools');
  for(const button of app.panel.querySelector('.ask-tools-menu').querySelectorAll('button')){
    tools.open=true;button.events.click();
    assert.equal(app.route,'today/feelings',button.textContent+' stays on the main screen');
    assert.equal(tools.open,false);
    assert.equal(entryRow(app,'kept'),row,'the existing exchange remains attached');
    assert.equal(app.input.value,'I want to finish this thought');
    assert.equal(JSON.stringify(app.state),saved);
    assert.equal(app.saves,saves,'choosing a tool does not create or modify an entry');
    assert.equal(app.scroller.querySelectorAll('.chat-actions').length,button.textContent==='My actions'?1:0);
    assert.equal(app.scroller.querySelectorAll('.chat-inline-prompt').length,['My actions','Write freely'].includes(button.textContent)?0:1);
  }
});

test('My actions uses the same saved tasks, completion, removal and undo without leaving chat',()=>{
  const app=openFeelings({history:[memory('kept','rest','I feel anxious')],day:{tasks:[{id:'todo',text:'Call Alex',complete:false},{id:'done',text:'Drink water',complete:true}],actionLog:[{id:'earlier',title:'A short walk'}]}});
  const transcript=JSON.stringify(app.state.scriptureRequests);
  app.main.openTool('actions');
  const card=app.scroller.querySelector('.chat-actions');
  assert.equal(card.querySelectorAll('.chat-action').length,2);
  assert.equal(card.querySelector('.chat-actions-completed-item').textContent,'A short walk');
  const checkbox=card.querySelector('.chat-action-toggle');checkbox.checked=true;checkbox.events.change();
  assert.equal(app.day.tasks[0].complete,true);
  assert.equal(app.stored.days['2026-09-24'].tasks[0].complete,true);
  card.querySelector('.chat-action-remove').events.click();
  assert.deepEqual(app.day.tasks.map(task=>task.id),['done']);
  card.querySelector('.chat-actions-undo').events.click();
  assert.deepEqual(app.day.tasks.map(task=>task.id),['todo','done']);
  assert.equal(app.day.tasks[0].complete,true);
  assert.equal(JSON.stringify(app.state.scriptureRequests),transcript);
  assert.equal(app.route,'today/feelings');
  card.querySelector('.chat-actions-close').events.click();
  assert.equal(app.scroller.querySelector('.chat-actions'),null);
  assert.ok(entryRow(app,'kept'));
});

test('adding an action uses the composer and stores a task without manufacturing a chat answer',()=>{
  const app=openFeelings({history:[memory('kept','rest','I feel anxious')],day:{tasks:[{id:'old',text:'Keep this action',complete:true}]}});
  const transcript=JSON.stringify(app.state.scriptureRequests),saves=app.saves;
  app.main.openTool('actions');
  app.scroller.querySelector('.chat-actions-add').events.click();
  assert.equal(app.scroller.querySelector('.chat-actions'),null);
  assert.equal(app.scroller.querySelector('.chat-inline-prompt').attrs['data-intent'],'action');
  assert.equal(app.panel.querySelector('.chat-send').attrs['aria-label'],'Save action');
  assert.equal(app.saves,saves);
  app.submit('Send Alex a message');
  assert.equal(app.route,'today/feelings');
  assert.deepEqual(app.day.tasks.map(task=>task.text),['Keep this action','Send Alex a message']);
  assert.equal(app.day.tasks[1].complete,false);
  assert.equal(app.stored.days['2026-09-24'].tasks[1].text,'Send Alex a message');
  assert.equal(JSON.stringify(app.state.scriptureRequests),transcript);
  assert.equal(app.input.value,'');
  assert.ok(app.scroller.querySelector('.chat-actions'));
  assert.equal(app.scroller.querySelector('.chat-inline-prompt'),null);
});

test('canceling an action or reflection mode preserves the draft and restores an ordinary send',()=>{
  for(const mode of ['action','reflect']){
    const app=openFeelings({study:true});
    if(mode==='action'){
      app.main.openTool('actions');app.scroller.querySelector('.chat-actions-add').events.click();
    }else app.main.openTool('reflect');
    app.write('I need rest today');
    app.scroller.querySelector('.chat-prompt-close').events.click();
    assert.equal(app.input.value,'I need rest today');
    assert.equal(app.day.feelingsDraft,'I need rest today');
    assert.equal(app.scroller.querySelector('.chat-inline-prompt'),null);
    assert.equal(app.panel.querySelector('.chat-send').attrs['aria-label'],'Send message');
    assert.equal(app.input.placeholder,'Say it your way…');
    app.submit('I need rest today');
    assert.equal(app.day.tasks.length,0);
    assert.equal(app.day.reflection,'');
    assert.equal(app.state.scriptureRequests[0].reflection,undefined);
    assert.equal(app.route,'today/feelings');
  }
});

test('Reflect opens existing notes inline and does not resave them when reading or writing freely',()=>{
  const app=openFeelings({day:{reflections:['I showed up'],reflection:'It was worth trying.'}});
  const before=JSON.stringify(app.state),saves=app.saves;
  app.main.openTool('reflect');
  const kept=app.scroller.querySelector('.chat-kept-reflection');
  assert.equal(kept.tag,'details');
  assert.match(kept.textContent,/I showed up[\s\S]*It was worth trying/);
  assert.equal(app.route,'today/feelings');
  app.main.openTool('write');
  assert.equal(app.scroller.querySelector('.chat-kept-reflection'),null);
  assert.equal(app.panel.querySelector('.chat-send').attrs['aria-label'],'Send message');
  assert.equal(app.saves,saves);
  assert.equal(JSON.stringify(app.state),before);
});

test('a quiet drafting cue remains transient within an existing conversation and yields to tools',()=>{
  const history=[{...memory('kept','rest','I feel anxious'),guide:'anxiety',helpStyle:'donkey'}];
  const app=openFeelings({history});
  const saved=JSON.stringify(app.state.scriptureRequests);
  app.input.events.focus();
  assert.equal(app.scroller.querySelector('.chat-draft-presence').textContent,'Take your time.');
  assert.equal(app.scroller.querySelector('.chat-draft-presence').attrs['aria-hidden'],'true');
  assert.equal(app.panel.querySelector('.chat-welcome').hidden,true,'the compact welcome must not duplicate a conversation cue');
  app.write('Something I am still thinking about');
  app.input.events.blur();
  assert.ok(app.scroller.querySelector('.chat-draft-presence'),'an unfinished draft retains the quiet cue');
  app.main.openTool('talk');
  assert.equal(app.scroller.querySelector('.chat-draft-presence'),null);
  assert.equal(JSON.stringify(app.state.scriptureRequests),saved);
  app.main.openTool('write');
  assert.equal(app.input.value,'Something I am still thinking about');
  assert.equal(app.panel.querySelector('.chat-welcome').hidden,true);
  assert.equal(app.route,'today/feelings');
});

test('a direct prompt respects manual style while leaving the chat visible',()=>{
  const app=openFeelings();app.chooseAnimal('fox');
  chooseTool(app,'Talk it through');
  assert.equal(app.scroller.classList.contains('is-starting'),false);
  assert.equal(app.state.scriptureRequests.length,0);
  app.submit('I feel anxious');
  const entry=app.state.scriptureRequests[0];
  assert.equal(entry.guide,'anxiety');assert.equal(entry.helpStyle,'fox');
  assert.equal(app.animals().isManual(),true);assert.equal(app.styleControl.value,'fox');
  assert.ok(entryRow(app,entry.id).querySelector('.moment-context').textContent.length>0);
});

test('next step and Scripture prompts use the existing answer paths within chat',()=>{
  const step=openFeelings({study:true});
  chooseTool(step,'One next step');step.submit('I’m stuck and putting it off');
  assert.equal(step.state.scriptureRequests[0].guide,'starting');
  assert.equal(step.state.scriptureRequests[0].helpStyle,'tortoise');
  const scripture=openFeelings({study:true});
  chooseTool(scripture,'Explore Scripture');scripture.submit('What does grace mean?');
  assert.ok(scripture.state.scriptureRequests[0].study,'Scripture questions use the verified study path');
});

test('reflection saves only when sent, preserves previous reflections, and does not close the day',()=>{
  const app=openFeelings({day:{reflections:['I learned something'],reflection:'Keep my existing note.'}});
  chooseTool(app,'Keep a reflection');
  assert.deepEqual(app.day.reflections,['I learned something']);
  assert.equal(app.day.reflection,'Keep my existing note.');
  app.submit('I showed up even though today was hard.');
  assert.deepEqual(app.day.reflections,['I learned something']);
  assert.match(app.day.reflection,/Keep my existing note.[\s\S]*I showed up even though today was hard/);
  assert.notEqual(app.day.closed,true);
  assert.match(app.stored.days['2026-09-24'].reflection,/I showed up even though today was hard/);
});

test('reflection reports a storage failure without claiming it was saved',()=>{
  const app=openFeelings({writable:false});
  chooseTool(app,'Keep a reflection');app.submit('I need rest today.');
  assert.match(app.panel.querySelector('#feelings-status').textContent,/visit only/);
  assert.equal(app.stored,undefined);
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).querySelector('.moment-response').textContent,/visit only/);
});

test('practical follow-ups stay with the latest conversation instead of switching topic or asking for a Bible reference',()=>{
  const app=openFeelings({study:true});
  app.submit('I feel anxious about tomorrow');
  app.submit('What should I do next?');
  let item=app.state.scriptureRequests[0];
  assert.equal(item.guide,'anxiety');assert.equal(item.helpStyle,'tortoise');assert.equal(item.study,undefined);
  assert.equal(entryRow(app,item.id).querySelector('.moment-context').textContent,app.guide('anxiety').practice);
  app.submit('Can you explain that?');
  item=app.state.scriptureRequests[0];
  assert.equal(item.guide,'anxiety');assert.equal(item.study,undefined);
  assert.match(entryRow(app,item.id).querySelector('.moment-context').textContent,/Matthew/);
  const reopened=openFeelings({history:JSON.parse(JSON.stringify(app.state.scriptureRequests))});
  assert.equal(reopened.state.scriptureRequests[0].guide,'anxiety');
  assert.ok(entryRow(reopened,item.id).querySelector('.moment-context'));
});

test('unclear requests get one useful question while factual limits stay honest',()=>{
  for(const text of ['I need help','I don’t know where to start','Something is on my mind']){
    const app=openFeelings({study:true});app.submit(text);
    const row=entryRow(app,app.state.scriptureRequests[0].id);
    assert.match(row.querySelector('.moment-response').textContent,/What’s happening/);
    assert.equal(row.querySelector('.verse-reference'),null);
  }
  const app=openFeelings({study:true});app.submit('What is the capital of France?');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).querySelector('.moment-response').textContent,/don’t have a reliable answer/);
  app.submit('That isn’t what I meant');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).querySelector('.moment-response').textContent,/Which part/);
  app.submit('Thanks');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).querySelector('.moment-response').textContent,/You’re welcome/);
});

test('a reflection stays a saved reflection after reopening and still prioritises urgent support',()=>{
  const app=openFeelings({study:true});app.main.openTool('reflect');
  app.submit('I went for a walk and enjoyed the fresh air.');
  const item=app.state.scriptureRequests[0];
  assert.equal(item.reflection,true);assert.equal(item.study,undefined);
  const reopened=openFeelings({history:JSON.parse(JSON.stringify(app.state.scriptureRequests))});
  const row=entryRow(reopened,item.id);
  assert.match(row.querySelector('.moment-response').textContent,/Saved with your reflections/);
  assert.equal(row.querySelector('.moment-action-read'),null);
  assert.equal(row.querySelector('.moment-action-adjust'),null);
  app.main.openTool('reflect');app.submit('I am going to kill myself tonight');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).querySelector('.moment-response').textContent,/immediate human support/);
});

test('a failed on-device interpretation falls back and leaves the next draft intact',async()=>{
  let reject;
  const app=openFeelings({interpretReply:()=>new Promise((_,no)=>{reject=no;})});
  await new Promise(setImmediate);
  app.submit('I feel anxious about tomorrow');
  app.write('Another thing I want to ask');
  reject(new Error('unavailable'));await new Promise(setImmediate);
  assert.equal(app.state.scriptureRequests[0].guide,'anxiety');
  assert.equal(app.input.value,'Another thing I want to ask');
  assert.equal(app.day.feelingsDraft,'Another thing I want to ask');
  assert.equal(app.panel.querySelector('.is-typing'),null);
});

test('a balanced-answer request asks for missing context or reuses the recent verified topic',()=>{
  const empty=openFeelings({study:true});empty.submit('Give me a balanced answer');
  assert.match(entryRow(empty,empty.state.scriptureRequests[0].id).querySelector('.moment-response').textContent,/Tell me what you need help with/);
  assert.equal(empty.state.scriptureRequests[0].study,undefined);
  const app=openFeelings({study:true});app.submit('I feel anxious');app.submit('Give me a balanced answer');
  const entry=app.state.scriptureRequests[0];assert.equal(entry.guide,'anxiety');assert.equal(entry.helpStyle,'donkey');
  assert.ok(entryRow(app,entry.id).querySelector('.moment-context'));
});

test('the welcome contains only the compact identity while conversation tools stay in the plus menu', () => {
  const app=openFeelings();
  assert.equal(app.panel.screenTitle,'Steady');
  const welcome=app.panel.querySelector('.chat-welcome').textContent;
  assert.match(welcome,/Take your time\./);
  assert.doesNotMatch(welcome,/What’s on your mind/);
  assert.match(app.panel.querySelector('.chat-suggestions').textContent,/What is grace/);
  assert.equal(app.panel.querySelector('.ask-kicker').hidden,true);
  assert.equal(app.panel.querySelector('.chat-method').hidden,true);
  assert.equal(app.panel.querySelector('.ask-resume').hidden,true);
  assert.equal(app.panel.querySelectorAll('.ask-starter').length,0);
  assert.equal(app.panel.querySelector('.ask-starters').hidden,true,'an empty group must not occupy space below the identity');
  assert.equal(app.panel.querySelector('.ask-guided-footer').hidden,true);
  assert.equal(app.panel.querySelector('.ask-guided-status').hidden,true);
  assert.deepEqual(app.panel.querySelector('.ask-tools-menu').querySelectorAll('button').map(button=>button.textContent),['Talk it through','One next step','Explore Scripture','Keep a reflection','My actions','Write freely']);
  assert.match(source('scripture-feelings.js'),/class="guide-avatar" hidden/);
  assert.match(source('interface-finish.css'),/\.chat-reply-row>\.donkey-guide\{display:none\}/);
  assert.match(source('index.html'),/id="setting-help-style"/);
  assert.equal(app.panel.querySelector('#feelings-privacy'),null);
  assert.doesNotMatch(source('scripture-feelings.js'),/aria-describedby="feelings-privacy"/);
  assert.match(source('index.html'),/Steady keeps your last 30 conversation entries/);
  assert.match(source('index.html'),/no Steady cloud sync or separate encryption vault/);
  assert.ok(app.panel.querySelector('.donkey-pop'),'keep the optional style artwork available');
  // Memory lives in Settings; Ask has no floating header control.
  assert.equal(app.panel.querySelector('.chat-back'),null);
  assert.equal(app.panel.querySelector('.chat-header'),null);
  assert.equal(app.panel.querySelector('.saved-hub-link'),null);
  assert.equal(app.panel.querySelector('.donkey-online'),null);
  assert.equal(app.panel.querySelector('.feelings-history'),null);
  assert.equal(app.hub.querySelector('.home-feelings-link'),null);
  assert.doesNotMatch(source('scripture-feelings.js'),/feelings-entry/);
});

test('an explicit submission clears old overrides and answers in chat using current feelings, not unrelated goals', () => {
  const app = openFeelings({profile:{goal:'work'}, day:{need:'clarity',scriptureTheme:'gratitude',mind:'work budget',intention:'work',reflection:'work'}});
  app.submit('  I feel lonely  ');
  assert.equal(app.route, 'today/feelings');
  assert.equal(app.day.scriptureTheme, undefined);
  assert.equal(app.day.feelingsDraft, '');
  assert.equal(app.choose().key, 'connection');
  assert.equal(app.state.scriptureRequests[0].text, 'I feel lonely');
  assert.equal(app.stored.days['2026-09-24'].scriptureRequest, app.state.scriptureRequests[0].id);
  assert.match(app.home(), /Galatians 6:2/);
  assert.match(app.panel.querySelector('.chat-exchange .verse-reference').textContent, /Galatians 6:2/);
  assert.ok(app.checks > 0);
  app.day.scriptureTheme = 'wisdom';
  assert.equal(app.choose().key, 'wisdom', 'a later deliberate theme selection remains available');
});

test('manual animals change the help given and a correction changes the saved answer',()=>{
  const app=openFeelings();
  app.chooseAnimal('fox');
  app.submit('I have two job offers and need to decide');
  const first=app.state.scriptureRequests[0];
  assert.equal(first.helpStyle,'fox');
  assert.match(entryRow(app,first.id).querySelector('.moment-context').textContent,/compare the options|same two priorities/i);
  app.chooseAnimal('owl');
  app.submit('I feel anxious');
  const second=app.state.scriptureRequests[0];
  assert.equal(second.helpStyle,'owl');
  const row=entryRow(app,second.id);
  assert.match(row.querySelector('.moment-context').textContent,/In Matthew/);
  entryAction(row,'Adjust help').events.click();
  const step=row.querySelectorAll('button').find(button=>button.textContent==='One small step');
  step.events.click();
  assert.equal(app.state.scriptureRequests[0].helpStyle,'tortoise');
  assert.equal(entryRow(app,second.id).querySelector('.moment-context').textContent,app.guide('anxiety').practice);
  assert.equal(app.state.scriptureRequests[1].helpStyle,'fox','older help is not rewritten by a later selection');
});

test('Settings chooses a response approach directly and Automatic can take over again',()=>{
  const app=openFeelings();
  assert.equal(app.styleControl.value,'auto');
  app.styleControl.value='fox';app.styleControl.events.change({target:app.styleControl});
  assert.equal(app.animals().isManual(),true);
  assert.equal(app.styleControl.value,'fox');
  app.submit('I have two job offers and need to decide');
  assert.equal(app.state.scriptureRequests[0].helpStyle,'fox');
  app.styleControl.value='auto';app.styleControl.events.change({target:app.styleControl});
  assert.equal(app.animals().isManual(),false);
  assert.equal(app.styleControl.value,'auto');
  assert.match(source('index.html'),/<select id="setting-help-style"><option value="auto">Automatic/);
});

test('on-device interpretation resolves an explicit follow-up without changing a manual animal',async()=>{
  const calls=[];
  const history=[{...memory('prior','wisdom','I have two job offers.'),guide:'decisions'}];
  const app=openFeelings({history,interpretReply:async request=>{
    calls.push(request);
    return {available:true,animal:'fox',guide:'decisions',confidence:'clear'};
  }});
  await new Promise(setImmediate);
  app.chooseAnimal('owl');
  app.submit('What about tomorrow?');
  assert.equal(app.panel.querySelector('.is-typing').querySelector('.steady-presence').attrs['data-state'],'listening');
  await new Promise(setImmediate);
  assert.equal(app.panel.querySelector('.is-typing'),null,'the presence finishes with the interpretation');
  assert.equal(calls.length,1);
  assert.deepEqual(Array.from(calls[0].history),['I have two job offers.']);
  assert.equal(app.state.scriptureRequests[0].guide,'decisions');
  assert.equal(app.state.scriptureRequests[0].helpStyle,'owl');
});

test('note opt-out excludes private incidental notes while retaining an expressly submitted feeling', () => {
  const app = openFeelings({profile:{useNotes:false},day:{mind:'angry',intention:'angry',reflection:'angry',reflections:['angry'],tasks:[{text:'angry'}]}});
  assert.equal(app.choose().key, 'foundation');
  assert.match(app.home(), /Matthew 7:24/);
  app.submit('I feel lonely');
  assert.equal(app.state.profile.useNotes, false);
  assert.equal(app.choose().key, 'connection');
  assert.match(app.home(), /Galatians 6:2/);
  assert.equal(app.day.mind, 'angry', 'matching never erases the opted-out notes');
});

test('drafts and blank validation do not prematurely replace the selected passage', () => {
  const app = openFeelings({day:{scriptureTheme:'rest'}});
  app.write('I feel grateful');
  assert.equal(app.day.feelingsDraft, 'I feel grateful');
  assert.equal(app.stored.days['2026-09-24'].feelingsDraft, 'I feel grateful');
  assert.equal(app.choose().key, 'rest');
  const saves = app.saves;
  app.submit(' \n ');
  assert.equal(app.saves, saves);
  assert.equal(app.day.scriptureTheme, 'rest');
  assert.equal(app.state.scriptureRequests.length, 0);
  assert.equal(app.route, 'today/feelings');
  assert.match(app.panel.querySelector('#feelings-status').textContent, /Write a few words/);
  assert.equal(app.input.focused, true);
  app.write('x'.repeat(1250));
  assert.equal(app.day.feelingsDraft.length, 1200);
});

test('an explicit request relates only to older matching memory, never itself or a newer unrelated entry', () => {
  const history = [memory('old-rest','rest','I feel tired','2026-09-21T12:00:00.000Z'),memory('recent-grief','grief','I feel sad')];
  const app = openFeelings({history});
  app.submit('I feel anxious');
  assert.equal(app.choose().key, 'rest');
  assert.equal(app.choose().relatedId, 'old-rest');
  app.submit('I feel anxious');
  assert.equal(app.state.scriptureRequests.length, 3, 'unchanged retry does not fill history');
  assert.equal(app.choose().relatedId, 'old-rest');
});

test('the visible transcript Forget control removes saved text and daily references while preserving other entries', () => {
  const history = [memory('remove','connection','I feel lonely'),memory('keep','rest','I feel tired','2026-09-22T12:00:00.000Z')];
  const app = openFeelings({history,day:{scriptureRequest:'remove'},olderDays:{'2026-09-23':{scriptureRequest:'remove'},'2026-09-22':{scriptureRequest:'keep'}}});
  const row=entryRow(app,'remove'),forget=entryAction(row,'Forget');
  assert.ok(isVisible(forget),'deletion is in the visible transcript, not hidden history');
  assert.equal(forget.type,'button','deleting must not submit the composer');
  forget.events.click();
  assert.equal(app.state.scriptureRequests.length, 1);
  assert.equal(app.state.scriptureRequests[0].id, 'keep');
  assert.equal(app.day.scriptureRequest, undefined);
  assert.equal(app.state.days['2026-09-23'].scriptureRequest, undefined);
  assert.equal(app.state.days['2026-09-22'].scriptureRequest, 'keep');
  assert.doesNotMatch(JSON.stringify(app.stored), /I feel lonely|"remove"/);
  assert.equal(app.choose().key, 'foundation');
  assert.match(app.panel.querySelector('#feelings-status').textContent, /Entry forgotten/);
  assert.equal(entryRow(app,'remove'),undefined);
  assert.equal(app.scroller.focused,true,'focus is not left on a removed button');
});

test('each visible Read chapter control opens that saved entry without replacing today’s passage or draft', () => {
  const app=openFeelings({history:[memory('older','rest','I feel anxious')]});
  app.submit('I feel grateful');
  app.write('An unfinished draft');
  assert.equal(app.choose().key,'gratitude');
  const read=entryAction(entryRow(app,'older'),'Read chapter');
  assert.ok(isVisible(read));
  assert.equal(read.type,'button');
  const before=JSON.stringify(app.state),stored=JSON.stringify(app.stored),saves=app.saves;
  read.events.click();
  assert.equal(app.route,'today/feelings');
  const chapter=entryRow(app,'older').querySelector('.chat-chapter');
  assert.equal(chapter.querySelector('.chat-chapter-title').textContent,'Matthew 11 · WEB');
  assert.deepEqual(chapter.querySelectorAll('.selected-verse').map(row=>row.querySelector('.verse-number').textContent),['28'],'legacy entries keep their saved focus without inventing a guide');
  assert.equal(chapter.querySelectorAll('.chapter-verse').length,30);
  assert.equal(app.saves,saves,'reading a chapter does not save a new preference');
  assert.equal(JSON.stringify(app.state),before);
  assert.equal(JSON.stringify(app.stored),stored);
  assert.equal(app.day.scriptureTheme,undefined);
  assert.equal(app.choose().key,'gratitude');
  assert.equal(app.day.feelingsDraft,'An unfinished draft');
  app.visit('today/feelings');
  assert.equal(app.input.value,'An unfinished draft');
  assert.equal(app.choose().key,'gratitude');
  assert.equal(app.scroller.querySelectorAll('.chat-exchange').length,2);
});

test('a saved continuation keeps its passage after its older context is forgotten', () => {
  const app = openFeelings({history:[memory('older','rest','I feel anxious')]});
  app.submit('Still the same');
  assert.equal(app.choose().key,'rest');
  app.visit('today/feelings');
  entryAction(entryRow(app,'older'),'Forget').events.click();
  assert.equal(app.choose().key,'rest');
  assert.equal(app.choose().relatedId,undefined);
  assert.match(app.choose().reason,/passage saved with this request/);
});

test('visible entries render markup literally, and storage failure keeps the request usable', () => {
  const app = openFeelings({writable:false});
  const text = '<img src=x onerror=alert(1)> I feel anxious';
  app.submit(text);
  assert.equal(app.route, 'today/feelings');
  assert.equal(app.choose().key, 'rest');
  assert.equal(app.stored, undefined);
  assert.match(app.panel.querySelector('#feelings-status').textContent, /visit only/);
  app.visit('today/feelings');
  const message=app.panel.querySelector('.user-bubble');
  assert.equal(message.textContent,text);
  assert.equal(message.children.length,0,'message markup stays inert in the visible transcript too');
  const row=app.scroller.querySelector('.chat-exchange');
  entryAction(row,'Read chapter').events.click();
  assert.equal(app.route,'today/feelings','reading remains in the chat without working storage');
  assert.equal(row.querySelector('.chat-chapter-title').textContent,'Matthew 11 · WEB');
  assert.equal(app.choose().key,'rest');
  app.visit('today/feelings');
  entryAction(row,'Forget').events.click();
  assert.equal(app.scroller.querySelector('.chat-chapter'),null,'forgetting removes the inline reader with its entry');
  assert.equal(app.state.scriptureRequests.length,0);
  assert.equal(app.scroller.querySelector('.chat-exchange'),null);
  assert.match(app.panel.querySelector('#feelings-status').textContent,/Removed for this visit/);
});

test('each submitted message and answer remains in the scrolling conversation on reentry and reload', () => {
  const app=openFeelings();
  app.submit('I feel lonely');
  app.submit('I feel grateful');
  const messages=()=>app.scroller.querySelectorAll('.user-bubble').map(row=>row.textContent);
  assert.deepEqual(messages(),['I feel lonely','I feel grateful']);
  assert.ok(app.scroller.children[0].classList.contains('chat-welcome'));
  assert.equal(app.scroller.parent.className,'chat-viewport','the soft edges belong to a dedicated viewport');
  assert.equal(app.panel.querySelector('.chat-composer').parent,app.panel.querySelector('.chat-input-area'),'composer belongs to the floating controls');
  assert.equal(app.panel.querySelector('.chat-input-area').parent,app.scroller.parent.parent,'floating controls stay outside the scrolling transcript');
  assert.match(app.scroller.querySelectorAll('.verse-reference')[0].textContent,/Galatians 6:2/);
  assert.match(app.scroller.querySelectorAll('.verse-reference')[1].textContent,/Thessalonians/);
  app.write('I feel anxious');
  assert.deepEqual(messages(),['I feel lonely','I feel grateful'],'typing does not create an answer');
  app.visit('home');app.visit('today/feelings');
  assert.deepEqual(messages(),['I feel lonely','I feel grateful']);
  assert.equal(app.input.value,'I feel anxious');
  const reloaded=openFeelings({history:app.stored.scriptureRequests,day:app.stored.days['2026-09-24']});
  assert.deepEqual(reloaded.scroller.querySelectorAll('.user-bubble').map(row=>row.textContent),messages());
  assert.equal(reloaded.scroller.querySelectorAll('.is-new').length,0,'restored history does not replay an entry animation');
});

test('stored passage keys remain stable for old messages, including continuations and changed matching rules', () => {
  const app=openFeelings({history:[memory('continuation','rest','Still the same'),memory('legacy','wisdom','I feel lonely','2026-09-22T12:00:00.000Z')]});
  const references=()=>app.scroller.querySelectorAll('.verse-reference').map(row=>row.textContent);
  assert.match(references()[0],/James 1:5/,'a saved old key is not rematched from its text');
  assert.match(references()[1],/Matthew 11:28/,'a saved continuation survives without its earlier entry');
  app.translation('asv');
  assert.ok(references().every(text=>text.endsWith('ASV')));
  assert.match(references()[0],/James 1:5/);
  assert.match(references()[1],/Matthew 11:28/);
});

test('an uncertain entry preserves today’s context until rephrased, without replacing its saved identity', () => {
  for(const writable of [true,false]){
    const app=openFeelings({writable,history:[memory('prior','rest','I feel anxious')],day:{scriptureRequest:'prior',scriptureTheme:'wisdom'}});
    const priorRow=entryRow(app,'prior');
    app.submit('hello');
    const request=app.state.scriptureRequests[0],original={...request};
    assert.equal(request.unmatched,true,'an uncertain result is explicitly stored as uncertain');
    assert.equal(request.guide,undefined);
    assert.equal(app.day.scriptureRequest,'prior');
    assert.equal(app.day.scriptureTheme,'wisdom');
    assert.equal(app.choose().key,'wisdom','an unrelated message does not replace a deliberate daily passage');
    const row=entryRow(app,request.id);
    assert.equal(row.querySelector('blockquote'),null,'unknown words must not receive an unrelated verse');
    assert.equal(row.querySelector('.verse-reference'),null);
    assert.equal(row.querySelector('select'),null,'no focus dropdown: rephrase in words instead');
    assert.equal(entryAction(row,'Read chapter'),undefined);
    assert.match(row.querySelector('.moment-response').textContent,/glad you’re here/);
    assert.equal(row.querySelector('.moment-next-step'),null,'uncertain matches do not invent a next step');
    assert.equal(row.querySelector('.moment-practice'),null);
    assert.equal(app.day.feelingsDraft,'');
    if(writable)assert.equal(app.stored.scriptureRequests[0].unmatched,true);

    app.write('A draft for later');
    app.submit('I feel lonely');
    const retry=app.state.scriptureRequests[0];
    assert.equal(retry.unmatched,undefined,'rephrasing in words produces an answer');
    assert.equal(retry.key,'connection');
    assert.deepEqual({...app.state.scriptureRequests.find(entry=>entry.id===original.id)},original,'the uncertain entry keeps its saved identity');
    assert.equal(app.day.scriptureRequest,retry.id);
    assert.equal(app.day.scriptureTheme,undefined,'the answered request intentionally becomes today’s request');
    assert.equal(app.choose().key,'connection');
    assert.equal(entryRow(app,'prior'),priorRow,'an unrelated saved entry is not detached or reannounced');
    const newRow=entryRow(app,retry.id);
    assert.match(newRow.querySelector('.verse-reference').textContent,/Galatians 6:2/);
    assert.equal(newRow.querySelector('select'),null);
    if(writable){
      assert.equal(app.stored.scriptureRequests[0].id,retry.id);
      const reloaded=openFeelings({history:app.stored.scriptureRequests,day:app.stored.days['2026-09-24']});
      assert.match(entryRow(reloaded,retry.id).querySelector('.verse-reference').textContent,/Galatians 6:2/);
    }else{
      assert.equal(app.stored,undefined);
      assert.match(app.panel.querySelector('#feelings-status').textContent,/visit only/);
    }
  }
});

test('bare greetings get warmth with no verse, longer hellos still match', () => {
  const app=openFeelings();
  app.submit('good morning');
  let request=app.state.scriptureRequests[0];
  assert.equal(request.unmatched,true);
  assert.equal(request.guide,undefined);
  let row=entryRow(app,request.id);
  assert.match(row.querySelector('.moment-response').textContent,/Good morning\. I’m glad you’re here/);
  assert.equal(row.querySelector('.donkey-guide').attrs['data-expression'],'happy');
  assert.equal(row.querySelector('.verse-reference'),null);
  assert.equal(row.querySelector('.moment-practice'),null);
  // Even "hello burden" cannot borrow an unrelated exhaustion passage.
  app.submit('hello burden');
  request=app.state.scriptureRequests[0];
  assert.equal(request.unmatched,true);
  assert.equal(request.guide,undefined);
  assert.match(entryRow(app,request.id).querySelector('.moment-response').textContent,/Hello\. I’m glad you’re here/);
  // A greeting wrapped around real feelings still finds its passage.
  app.submit('hello, I feel anxious');
  request=app.state.scriptureRequests[0];
  assert.equal(request.guide,'anxiety');
  assert.match(entryRow(app,request.id).querySelector('.verse-reference').textContent,/Matthew 11:28/);
});

test('a saved guide keeps its full verse range across translation and reload, with optional depth and isolated chapter reading', () => {
  const app=openFeelings({history:[memory('legacy','wisdom','I feel lonely')]});
  app.submit('I feel angry');
  const request=app.state.scriptureRequests[0],id=request.id;
  assert.equal(request.guide,'anger');
  assert.equal(request.key,'grace');
  assert.equal(Object.hasOwn(request,'unmatched'),false);
  assert.equal(app.stored.scriptureRequests[0].guide,'anger');
  const row=entryRow(app,id),web=app.passage('anger');
  assert.equal(row.querySelectorAll('.moment-depth').length,0,'matched answers carry no prose disclosure');
  assert.equal(row.querySelector('blockquote'),null,'matched answers quote no verse text');
  assert.equal(row.querySelector('.moment-response'),null,'matched answers add no acknowledgement');
  assert.equal(row.querySelector('.verse-reference').textContent,'James 1:19–20 · WEB');
  assert.match(row.querySelector('.moment-preview').className,/moment-short/,'matched answers use the compact bubble');
  assert.equal(row.querySelector('.moment-next-step'),null);
  assert.equal(row.querySelector('.moment-practice'),null);
  assert.equal(row.querySelector('.moment-editorial'),null);
  assert.equal(row.querySelector('.moment-context')?.textContent,app.guide('anger').acknowledgement+' '+app.guide('anger').practice);
  assert.equal(web.chapterKey,'wisdom','a guide’s actual chapter can differ from its broad theme');
  assert.deepEqual([...web.verses],[19,20]);
  assert.equal(row.querySelector('select'),null,'matched answers need no dropdown');
  assert.equal(entryRow(app,'legacy').querySelector('.verse-reference').textContent,'James 1:5 · WEB','older records are not silently upgraded to a different quote');
  assert.equal(entryRow(app,'legacy').querySelector('.moment-next-step'),null,'legacy records do not invent editorial guidance');

  app.day.scriptureTheme='gratitude';
  app.write('An unfinished thought');
  const before=JSON.stringify(app.state),stored=JSON.stringify(app.stored),saves=app.saves;
  entryAction(row,'Read chapter').events.click();
  assert.equal(app.route,'today/feelings');
  assert.equal(row.querySelector('.chat-chapter-title').textContent,'James 1 · WEB');
  assert.deepEqual(row.querySelectorAll('.selected-verse').map(verse=>verse.querySelector('.verse-number').textContent),['19','20']);
  assert.equal(row.querySelectorAll('.chapter-verse').length,27);
  assert.equal(app.saves,saves);
  assert.equal(JSON.stringify(app.state),before);
  assert.equal(JSON.stringify(app.stored),stored);
  assert.equal(app.day.scriptureTheme,'gratitude');
  app.visit('today/feelings');
  assert.equal(app.input.value,'An unfinished thought');
  assert.equal(app.choose().key,'gratitude');
  assert.equal(app.day.scriptureTheme,'gratitude');

  app.translation('asv');
  const translated=entryRow(app,id),asv=app.passage('anger','asv');
  assert.equal(translated.querySelector('blockquote'),null);
  assert.notEqual(asv.text,web.text,'translations still differ underneath the short answer');
  assert.equal(translated.querySelector('.verse-reference').textContent,'James 1:19–20 · ASV');
  assert.equal(translated.querySelector('.moment-practice'),null);
  assert.equal(app.saves,saves,'displaying another translation does not rewrite saved requests');
  assert.equal(JSON.stringify(app.state),before);
  const reloaded=openFeelings({history:app.stored.scriptureRequests,day:app.stored.days['2026-09-24']});
  reloaded.translation('asv');
  assert.equal(entryRow(reloaded,id).querySelector('blockquote'),null);
  assert.equal(entryRow(reloaded,id).querySelector('.verse-reference').textContent,'James 1:19–20 · ASV');
  assert.equal(entryRow(reloaded,id).querySelector('.moment-practice'),null);
  assert.equal(reloaded.state.scriptureRequests[0].guide,'anger');
  assert.equal(reloaded.day.scriptureTheme,'gratitude');
});

test('every curated guide answers with just its reference and no dropdown', () => {
  const library=openFeelings();
  const history=library.guideIds().map(id=>({...memory(id,library.guide(id).theme,'A saved request'),guide:id}));
  const app=openFeelings({history});
  for(const id of library.guideIds()){
    const row=entryRow(app,id);
    assert.ok(row.querySelector('.verse-reference'),id+' answers with just its reference');
    assert.equal(row.querySelector('blockquote'),null,id+' quotes no verse text');
    assert.equal(row.querySelector('.moment-response'),null,id+' adds no acknowledgement');
    assert.equal(row.querySelector('.moment-next-step'),null,id);
    assert.equal(row.querySelector('.moment-practice'),null,id);
    assert.equal(row.querySelector('.moment-context'),null,id);
    assert.equal(row.querySelector('.moment-depth'),null,id);
    assert.ok(row.querySelector('select')===null,'answers come from words, not a dropdown');
  }
  assert.equal(app.saves,0,'showing existing guidance does not change entries');
});

test('urgent support cannot be replaced by a stored guide or uncertain flag and never exposes optional focus or editorial advice', () => {
  const app=openFeelings({history:[
    {...memory('old-risk','foundation','I want to kill myself'),guide:'starting'},
    {...memory('uncertain-risk','rest','I am suicidal','2026-09-22T12:00:00.000Z'),unmatched:true}
  ]});
  app.submit('I am going to kill myself tonight');
  assert.equal(app.state.scriptureRequests[0].guide,undefined);
  assert.equal(app.state.scriptureRequests[0].unmatched,undefined);
  for(const row of app.scroller.querySelectorAll('.chat-exchange')){
    assert.match(row.className,/\burgent\b/);
    assert.match(row.querySelector('.moment-response').textContent,/immediate human support/);
    assert.match(row.querySelector('.moment-response').textContent,/emergency services/);
    assert.equal(row.querySelector('.moment-depth'),null);
    assert.equal(row.querySelector('select'),null);
    assert.equal(row.querySelector('.moment-context'),null);
    assert.equal(row.querySelector('.moment-next-step'),null);
    assert.equal(row.querySelector('.moment-practice'),null);
    assert.equal(row.querySelector('.moment-editorial'),null);
    assert.doesNotMatch(row.querySelector('.moment-response').textContent,/couldn’t find a reliable match/);
    assert.ok(isVisible(entryAction(row,'Forget')),'support entries retain the visible deletion control');
  }
  const oldRow=entryRow(app,'old-risk'),oldEntry=app.state.scriptureRequests.find(entry=>entry.id==='old-risk');
  assert.match(oldRow.querySelector('.verse-reference').textContent,/Psalm 34:18/,'urgent support uses the comfort passage instead of an old generic guide');
  assert.equal(oldEntry.key,'foundation','safe presentation does not rewrite the saved legacy record');
  assert.equal(oldEntry.guide,'starting');
  const saves=app.saves;
  entryAction(oldRow,'Read chapter').events.click();
  assert.equal(app.route,'today/feelings');
  assert.equal(oldRow.querySelector('.chat-chapter-title').textContent,'Psalm 34 · WEB');
  assert.deepEqual(oldRow.querySelectorAll('.selected-verse').map(verse=>verse.querySelector('.verse-number').textContent),['18'],'urgent reading follows the displayed comfort passage');
  assert.equal(app.saves,saves);
});

test('sending adds only the new exchange to the live log without reannouncing or detaching existing messages', () => {
  const app=openFeelings({history:[memory('past','rest','I feel anxious')]});
  const original=app.scroller.children.slice();
  app.scroller.mutations.length=0;
  app.submit('I feel lonely');
  assert.deepEqual(app.scroller.children.slice(0,2),original,'greeting and previous exchange retain their DOM identity');
  assert.equal(app.scroller.mutations.length,1,'only one live-region addition occurs');
  assert.equal(app.scroller.mutations[0].type,'add');
  assert.equal(app.scroller.mutations[0].node,app.scroller.children[2]);
  app.scroller.mutations.length=0;
  app.visit('home');app.visit('today/feelings');
  assert.equal(app.scroller.mutations.length,0,'reentry leaves the existing transcript attached');
});

test('the history limit removes only its expired exchange and retains chronological order', () => {
  const history=Array.from({length:30},(_,index)=>memory('entry-'+index,'rest','Moment '+index,`2026-08-${String(index+1).padStart(2,'0')}T12:00:00.000Z`));
  const app=openFeelings({history});
  const expired=app.scroller.children[1],retained=app.scroller.children[2];
  app.scroller.mutations.length=0;
  app.submit('I feel lonely');
  assert.equal(app.scroller.children.length,31,'greeting plus the 30 saved exchanges');
  assert.equal(app.scroller.children[1],retained);
  assert.deepEqual(app.scroller.mutations.map(change=>change.type),['remove','add']);
  assert.equal(app.scroller.mutations[0].node,expired);
  assert.equal(app.scroller.children.at(-1).querySelector('.user-bubble').textContent,'I feel lonely');
});

test('keyboard/composer resizing follows the latest reply but preserves an older reading position', () => {
  const app=openFeelings();
  app.submit('I feel anxious');
  app.resize(320,1600);
  assert.equal(app.scroller.scrollTop,1280);
  app.scroll(300);
  app.resize(220);
  assert.equal(app.scroller.scrollTop,300,'opening keyboard does not jump a reader to the latest reply');
  app.write('I feel lonely');
  assert.equal(app.scroller.scrollTop,300,'typing does not disturb an older reading position');
  app.visit('home');app.visit('today/feelings');
  assert.equal(app.scroller.scrollTop,300,'returning to Help preserves the transcript position');
  app.submit('I feel lonely');
  assert.equal(app.scroller.scrollTop,1380,'sending reveals the new reply');
  app.resize(420);
  assert.equal(app.scroller.scrollTop,1180,'closing keyboard keeps the newest reply anchored');
});

test('only a new entry animates, without speaking cues, and reduced motion skips the animation', () => {
  const app=openFeelings({history:[memory('past','rest','I feel anxious')]});
  app.submit('I feel lonely');
  const rows=app.scroller.querySelectorAll('.chat-exchange');
  assert.doesNotMatch(rows[0].className,/is-new/);
  assert.match(rows[1].className,/is-new/);
  assert.equal(app.scroller.querySelector('.is-speaking'),null);
  rows[1].querySelector('.moment-preview').events.animationend();
  assert.doesNotMatch(rows[1].className,/is-new/);
  const quiet=openFeelings({reducedMotion:true});
  quiet.submit('I feel lonely');
  assert.equal(quiet.scroller.querySelector('.is-speaking'),null);
  assert.equal(quiet.scroller.querySelector('.is-new'),null);
});

test('a tall reply starts below the viewport top and preserves reading position',()=>{
  let inputHeight=60;
  Element.prototype.getBoundingClientRect=function(){
    if(this.className==='chat-reply-row')return {top:600-this.parent.parent.scrollTop,height:230};
    if(this.className==='chat-input-area'){
      const bottom=this.parent.querySelector('.chat-scroll').clientHeight-16;
      return {top:bottom-inputHeight,bottom,height:inputHeight};
    }
    return {top:0,bottom:this.clientHeight,height:this.clientHeight};
  };
  try{
    const app=openFeelings({reducedMotion:true});
    app.submit('I feel anxious');
    assert.equal(app.scroller.scrollTop,588,'the beginning of the reply sits 12px below the viewport top');
    assert.equal(app.panel.style['--chat-input-height'],'60px');
    assert.equal(app.panel.style['--chat-header-height'],undefined);
    app.resize(220,1000);
    assert.equal(app.scroller.scrollTop,588,'changing keyboard height does not jump to the end');
    inputHeight=90;app.resize(320,1030);
    assert.equal(app.panel.style['--chat-input-height'],'90px','multiline drafts and status messages update the reserved scroll space');
    assert.equal(app.scroller.scrollTop,588,'growing the floating controls preserves an older reading position');
  }finally{delete Element.prototype.getBoundingClientRect;}
});

test('Bible lookup shows real verse text, opens its chapter and leaves the daily passage alone',()=>{
  const app=openFeelings({study:true,day:{scriptureTheme:'grace'}});
  const before=app.choose().key;
  app.submit('John 3:16');
  const item=app.state.scriptureRequests[0],row=entryRow(app,item.id);
  assert.equal(item.study.kind,'reference');
  assert.match(row.textContent,/For God so loved the world/);
  assert.match(row.textContent,/John 3:16 · WEB/);
  assert.equal(app.choose().key,before);
  assert.equal(app.day.scriptureTheme,'grace');
  const read=entryAction(row,'Read chapter');read.events.click({currentTarget:read});
  assert.equal(row.querySelector('.chat-chapter-title').textContent,'John 3 · WEB');
  assert.equal(row.querySelectorAll('.chapter-verse').length,36);
  assert.deepEqual(row.querySelectorAll('.selected-verse').map(verse=>verse.querySelector('.verse-number').textContent),['16']);
  assert.equal(app.route,'today/feelings');
  const restored=openFeelings({study:true,history:app.stored.scriptureRequests});
  assert.match(restored.scroller.textContent,/For God so loved the world/);
  restored.translation('asv');assert.match(restored.scroller.textContent,/John 3:16 · ASV/);
  entryAction(entryRow(restored,item.id),'Forget').events.click();
  assert.equal(restored.state.scriptureRequests.length,0);
});

test('study questions receive cited notes; unsupported questions receive honest search, not emotional advice',()=>{
  const app=openFeelings({study:true});
  app.submit('Why did Jesus teach in parables?');
  let row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/Christians differ/);
  assert.equal(row.querySelector('a').href,'https://ebible.org/eng-web/MAT13.htm');
  assert.doesNotMatch(row.textContent,/small next step|Choose a focus/);
  app.submit('Why did Moses strike the rock?');row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/don’t have a prepared explanation/);
  assert.equal(row.querySelector('blockquote'),null);
  app.submit('search love is patient');row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/verses match words/);
  assert.ok(row.querySelectorAll('.study-result').length>0);
  assert.ok(row.querySelectorAll('.study-result').length<=3);
});

test('a general next-step question receives decision guidance, never a failed Bible search',()=>{
  const app=openFeelings({study:true});
  app.submit('What’s the best next step?');
  const request=app.state.scriptureRequests[0];
  const row=entryRow(app,request.id);
  assert.equal(request.guide,'decisions');
  assert.equal(request.helpStyle,'tortoise');
  assert.equal(app.animals().current(),'tortoise');
  assert.equal(request.study,undefined);
  assert.doesNotMatch(row.textContent,/reliable word match|specific word/);
  assert.match(row.textContent,/decisions stay uncertain|James/);
});

test('the already saved next-step question is corrected without losing its entry',()=>{
  const old={...memory('old-next','foundation','What’s the best next step?'),study:{kind:'search',query:'What’s the best next step?'}};
  const app=openFeelings({study:true,history:[old]});
  assert.equal(app.state.scriptureRequests[0].id,old.id);
  assert.equal(app.state.scriptureRequests[0].guide,'decisions');
  assert.equal(app.state.scriptureRequests[0].helpStyle,'tortoise');
  assert.equal(app.state.scriptureRequests[0].study,undefined);
  assert.doesNotMatch(entryRow(app,old.id).textContent,/reliable word match/);
});

test('asking for a named animal gives a new answer from the recent verified guide',()=>{
  const at=new Date(Date.now()-60000).toISOString();
  const prior={...memory('prior','wisdom','What’s the best next step?',at),guide:'decisions',helpStyle:'donkey'};
  const app=openFeelings({study:true,history:[prior]});
  app.submit('Give me steady answer');
  const answer=app.state.scriptureRequests[0];
  assert.equal(answer.text,'Give me steady answer');
  assert.equal(answer.guide,'decisions');
  assert.equal(answer.helpStyle,'tortoise');
  assert.equal(answer.study,undefined);
  assert.equal(app.animals().current(),'tortoise');
  const row=entryRow(app,answer.id);
  assert.match(row.querySelector('.moment-context').textContent,/name the decision|smallest safe action/i);
  assert.doesNotMatch(row.textContent,/reliable match/);
});

test('a saved unmatched animal request repairs itself from recent context',()=>{
  const now=Date.now();
  const prior={...memory('prior','wisdom','What’s the best next step?',new Date(now-60000).toISOString()),guide:'decisions'};
  const command={...memory('command','foundation','Give me steady answer',new Date(now-30000).toISOString()),unmatched:true,helpStyle:'donkey'};
  const app=openFeelings({study:true,history:[command,prior]});
  assert.equal(app.state.scriptureRequests[0].id,'command');
  assert.equal(app.state.scriptureRequests[0].guide,'decisions');
  assert.equal(app.state.scriptureRequests[0].helpStyle,'tortoise');
  assert.doesNotMatch(entryRow(app,'command').textContent,/reliable match/);
});

test('a named-animal request without recent context asks for a topic',()=>{
  const app=openFeelings({study:true});
  app.submit('Give me steady answer');
  const entry=app.state.scriptureRequests[0];
  assert.equal(entry.guide,undefined);
  assert.equal(entry.unmatched,true);
  assert.match(entryRow(app,entry.id).textContent,/Tell me what you need help with/);
});

test('common Ask replies give an actual next step without claiming unknown details',()=>{
  for(const [question,guide,style,needed] of [
    ['Can you compare these choices?','decisions','fox',/need to know what they are|same two priorities/i],
    ['I am exhausted and cannot start','exhaustion','tortoise',/two-minute first action|Rest can be the next step/i],
    ['I feel anxious about tomorrow','anxiety','donkey',/one manageable next step/i],
    ['I am exhausted and cannot begin','exhaustion','tortoise',/two-minute first action|Rest can be the next step/i]
  ]){
    const app=openFeelings({study:true});
    app.submit(question);
    const entry=app.state.scriptureRequests[0],reply=entryRow(app,entry.id).querySelector('.moment-context')?.textContent||'';
    assert.equal(entry.guide,guide,question);
    assert.equal(entry.helpStyle,style,question);
    assert.match(reply,needed,question);
    assert.doesNotMatch(reply,/you (?:must|will definitely)|God (?:told|promised) you/i,question);
  }
});

test('unsupported specialist questions state Steady’s limits instead of inviting false confidence',()=>{
  const app=openFeelings({study:true});
  app.submit('Can you help me with my taxes?');
  const entry=app.state.scriptureRequests[0];
  assert.equal(entry.unmatched,true);
  const reply=entryRow(app,entry.id).querySelector('.moment-response').textContent;
  assert.match(reply,/don’t have a reliable answer/);
  assert.match(reply,/qualified source/);
  assert.doesNotMatch(reply,/tax rate|deduction|you should file/i);
});

test('Burden distinguishes a Bible definition from a personal struggle in the saved chat',()=>{
  const app=openFeelings({study:true,day:{scriptureTheme:'grace'}});
  app.submit('What is grace?');
  const study=app.state.scriptureRequests[0];
  assert.deepEqual({...study.study},{kind:'note',query:'grace'});
  let row=entryRow(app,study.id);
  assert.match(row.textContent,/God’s gift/);
  assert.match(row.textContent,/Steady’s reading note/);
  assert.equal(row.querySelector('a').href,'https://ebible.org/eng-web/EPH02.htm');
  assert.equal(row.querySelector('.moment-next-step'),null);
  assert.equal(app.day.scriptureTheme,'grace','asking for a definition does not change the daily theme');
  app.submit('I feel ashamed');
  const personal=app.state.scriptureRequests[0];
  assert.equal(personal.study,undefined);
  row=entryRow(app,personal.id);
  assert.ok(row.querySelector('.moment-reference'),'personal answers show just the reference');
  assert.equal(row.querySelector('.moment-response'),null);
  assert.equal(row.querySelector('blockquote'),null);
  assert.equal(row.querySelector('.study-content'),null);
  const restored=openFeelings({study:true,history:app.stored.scriptureRequests});
  assert.match(entryRow(restored,study.id).textContent,/God’s gift/);
});

test('library reading notes, quotations and references remain authored text even when AI is enabled',async()=>{
  const calls=[],app=openFeelings({study:true,wordingReply:async payload=>{calls.push(payload);return {available:true,text:'Grace is a gift you can receive, not something you need to earn.'};}});
  app.submit('What is grace?');
  const item=app.state.scriptureRequests[0],row=entryRow(app,item.id),prose=row.querySelector('.moment-context');
  const prepared=prose.textContent,quotation=row.querySelector('blockquote').textContent,reference=row.querySelector('.verse-reference').textContent;
  const before=JSON.stringify(app.state),stored=JSON.stringify(app.stored),saves=app.saves;
  await new Promise(setImmediate);
  assert.equal(calls.length,0,'library notes never reach generative rewording');
  assert.equal(prose.textContent,prepared);
  assert.equal(row.querySelector('.local-ai-label'),null);
  assert.equal(row.querySelector('blockquote').textContent,quotation);
  assert.equal(row.querySelector('.verse-reference').textContent,reference);
  assert.equal(JSON.stringify(app.state),before);assert.equal(JSON.stringify(app.stored),stored);assert.equal(app.saves,saves);
  app.wording(false);
  const standard=entryRow(app,item.id);
  assert.equal(standard.querySelector('.moment-context').textContent,prepared,'the library note remains the same with AI off');
  assert.equal(standard.querySelector('.local-ai-label'),null);
  assert.equal(standard.querySelector('blockquote').textContent,quotation);
  assert.equal(standard.querySelector('.verse-reference').textContent,reference);
  await new Promise(setImmediate);assert.equal(calls.length,0);
});

test('prepared support guidance, urgent support and uncertain replies are never rewritten by AI',async()=>{
  const calls=[],app=openFeelings({wordingReply:async payload=>{calls.push(payload);return {available:true,text:'You can pause and take one gentle step.'};}});
  app.submit('I feel anxious');
  const first=app.state.scriptureRequests[0],row=entryRow(app,first.id),reference=row.querySelector('.verse-reference').textContent;
  const prepared=row.querySelector('.moment-context').textContent;
  assert.equal(row.querySelector('.steady-presence').attrs['data-state'],'resting');
  await new Promise(setImmediate);
  assert.equal(row.querySelector('.steady-presence').attrs['data-state'],'resting');
  assert.equal(calls.length,0);
  assert.equal(row.querySelector('.moment-context').textContent,prepared);
  assert.equal(row.querySelector('.verse-reference').textContent,reference);assert.equal(row.querySelector('blockquote'),null);
  app.submit('hello');
  const greeting=entryRow(app,app.state.scriptureRequests[0].id),greetingText=greeting.querySelector('.moment-response').textContent;
  app.submit('I am going to kill myself tonight');
  const urgent=entryRow(app,app.state.scriptureRequests[0].id),support=urgent.querySelector('.moment-response').textContent;
  await new Promise(setImmediate);
  assert.equal(calls.length,0,'prepared, urgent and uncertain entries do not reach the wording model');
  assert.equal(greeting.querySelector('.moment-response').textContent,greetingText);assert.equal(greeting.querySelector('.local-ai-label'),null);
  assert.equal(urgent.querySelector('.moment-response').textContent,support);assert.match(support,/immediate human support/);assert.equal(urgent.querySelector('.local-ai-label'),null);
  let disabledCalls=0;
  const disabled=openFeelings({profile:{burdenAI:false},wordingReply:async()=>{disabledCalls++;return {available:true,text:'Disabled wording'};}});
  disabled.submit('I feel anxious');await new Promise(setImmediate);
  assert.equal(disabledCalls,0);
  assert.ok(disabled.scroller.querySelector('.moment-context')?.textContent,'the animal still gives authored help when AI is off');
  assert.equal(disabled.scroller.querySelector('.local-ai-label'),null);
});

test('library facts render counted answers from the included text',()=>{
  const app=openFeelings({study:true});
  app.submit('How many books are in the Bible?');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).textContent,/66 books/);
  app.submit('How many chapters does the Bible have?');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).textContent,/1189 chapters/);
  app.submit('How many verses are there?');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).textContent,/verses with wording/);
});

test('malformed references cannot silently quote a different range; safety still outranks Bible lookup',()=>{
  const app=openFeelings({study:true});
  app.submit('John 3:16,19');
  let row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/Use one chapter/);assert.equal(row.querySelector('blockquote'),null);
  app.submit('I want to kill myself. John 3:16');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/immediate human support/);
  assert.equal(app.state.scriptureRequests[0].study,undefined);
});

test('specific Scripture questions and immediate follow-ups receive prepared context without changing daily direction',()=>{
  const app=openFeelings({study:true,day:{need:'progress',scriptureTheme:'grace'}});
  app.submit('Explain Romans 8:28 in context');
  let row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/not a promise that every event is good/);
  assert.equal(app.day.scriptureTheme,'grace');assert.equal(app.day.need,'progress');
  app.submit('Can you explain that verse in more detail?');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/A closer look/);
  assert.match(row.textContent,/suffering and patient hope/);
  app.submit('Why did Jesus wash the disciples feet?');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/serve one another/);
  assert.doesNotMatch(row.textContent,/A small next step/);
  app.submit('Who wrote Hebrews?');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/author is unknown/);
  assert.equal(app.day.scriptureTheme,'grace');
  app.submit('I feel lonely');
  app.submit('Can you explain that verse in more detail?');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/Which passage do you mean/);
  assert.doesNotMatch(row.textContent,/author is unknown|Romans 8/);
});

test('overlong study questions clarify rather than silently losing a second reference or search condition',()=>{
  const app=openFeelings({study:true});
  app.submit('John 3:16 '+ 'and '.repeat(45)+'Romans 8:28');
  let row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.equal(app.state.scriptureRequests[0].study.kind,'clarify');
  assert.match(row.textContent,/shorter search/);assert.equal(row.querySelector('blockquote'),null);
  app.submit('search the Bible for '+ 'love '.repeat(36)+'spaceships');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.match(row.textContent,/shorter search/);assert.equal(row.querySelectorAll('.study-result').length,0);
  const restored=openFeelings({study:true,history:app.stored.scriptureRequests});
  assert.match(restored.scroller.textContent,/shorter search/);
});

test('resubmitting an old question upgrades the answer without duplicates or silent history migration',()=>{
  const old={...memory('old','foundation','Who wrote Romans?'),unmatched:true};
  const app=openFeelings({study:true,history:[old]});
  assert.equal(app.state.scriptureRequests[0].study,undefined);
  app.submit(old.text);
  assert.equal(app.state.scriptureRequests.length,1);
  assert.equal(app.state.scriptureRequests[0].id,'old');
  assert.equal(app.state.scriptureRequests[0].study.query,'romans');
  assert.match(entryRow(app,'old').textContent,/identifies its sender as Paul/);
  app.submit('Things are a mess at home');
  assert.match(entryRow(app,app.state.scriptureRequests[0].id).textContent,/don’t have a reliable answer/);
});

test('Burden donkey uses subtle data-expression states and respects reduced motion',()=>{
  const app=openFeelings();
  const welcomeGuide=()=>app.panel.querySelector('.chat-welcome').querySelector('.donkey-guide');
  assert.equal(welcomeGuide().attrs['data-expression'],'neutral');
  app.write('I am typing something');
  assert.equal(welcomeGuide().attrs['data-expression'],'listening','Burden listens while the user writes');
  app.submit('I feel lonely and left out');
  let row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.equal(row.querySelector('.donkey-guide').attrs['data-expression'],'concerned');
  assert.equal(welcomeGuide().attrs['data-expression'],'concerned');
  app.submit('Should I take this job or not? I am not sure which way to go');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.equal(row.querySelector('.donkey-guide').attrs['data-expression'],'listening');
  app.submit('Thank you, I reached my goal and feel grateful');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.equal(row.querySelector('.donkey-guide').attrs['data-expression'],'encouraged');
  app.submit('John 3:16');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.equal(row.querySelector('.donkey-guide').attrs['data-expression'],'focused');
  app.submit('gg');
  row=entryRow(app,app.state.scriptureRequests[0].id);
  assert.equal(row.querySelector('.donkey-guide').attrs['data-expression'],'happy');
  const css=source('scripture-feelings.css');
  for(const state of ['neutral','listening','thinking','confused','concerned','encouraged','relieved','focused','happy'])assert.match(css,new RegExp(`data-expression="${state}"`));
  assert.match(css,/data-motion=off/);
  assert.equal(app.panel.querySelector('.donkey-guide').attrs['aria-hidden'],'true');
});

test('Burden feels like a chat: suggestions start a conversation, then step aside',()=>{
  const app=openFeelings();
  const chips=app.panel.querySelector('.chat-suggestions');
  assert.equal(chips.hidden,false,'suggestions show on an empty transcript');
  assert.equal(chips.querySelectorAll('button').length,3);
  chips.querySelectorAll('button')[0].events.click();
  assert.equal(app.state.scriptureRequests[0].text,'What is grace?');
  assert.equal(chips.hidden,true,'suggestions hide once the conversation starts');
  assert.equal(app.panel.querySelector('.is-typing'),null,'no stray thinking indicator remains');
  assert.match(source('scripture-feelings.css'),/@keyframes donkey-react/);
  assert.match(source('scripture-feelings.css'),/@keyframes burden-thinking/);
  assert.match(source('scripture-feelings.css'),/@keyframes burden-listening/);
  assert.match(source('scripture-feelings.css'),/@keyframes thinking-rise/);
  assert.match(source('scripture-feelings.js'),/is-typing/);
});

test('Burden understands progressively: category, situation, stance, one next step',()=>{
  const app=openFeelings({branches:true});
  const chips=()=>app.panel.querySelector('.chat-suggestions');
  const welcomeGuide=()=>app.panel.querySelector('.chat-welcome').querySelector('.donkey-guide');
  const tap=label=>{const button=chips().querySelectorAll('button').find(entry=>entry.textContent===label);assert.ok(button,'chip offers: '+label);button.events.click();};
  // Stage one: a single simple question with a way out to typing.
  assert.match(chips().textContent,/What are you carrying today/);
  assert.equal(chips().querySelectorAll('button').length,11);
  tap('Anxious');
  // Stage two remembers the category and listens; None of these steps back out.
  assert.match(chips().textContent,/Which is closest/);
  assert.match(chips().textContent,/Anxious/);
  assert.equal(welcomeGuide().attrs['data-expression'],'listening');
  tap('None of these');
  assert.match(chips().textContent,/What are you carrying today/);
  tap('Anxious');
  tap('Racing thoughts');
  // Stage three builds on both remembered answers without repeating them.
  assert.match(chips().textContent,/Which fits best right now/);
  assert.equal(chips().querySelectorAll('button').length,8);
  tap('← Back');
  assert.match(chips().textContent,/Which is closest/);
  tap('Racing thoughts');
  tap('My thoughts loop');
  // Three taps reach a curated passage plus exactly one fitting next step.
  const entry=app.state.scriptureRequests[0];
  assert.equal(entry.text,'My thoughts keep racing and I feel anxious');
  assert.equal(entry.guide,'anxiety');
  const row=entryRow(app,entry.id);
  assert.match(row.querySelector('.verse-reference').textContent,/Matthew 11:28/);
  const steps=row.querySelectorAll('.moment-practice');
  assert.equal(steps.length,1,'one next step, never a list');
  assert.match(steps[0].textContent,/worry thought/);
  assert.equal(chips().hidden,true,'choices step aside once understood');
});

test('greetings stay greetings even with study lookup enabled',()=>{
  const app=openFeelings({study:true});
  app.submit('Hello');
  const request=app.state.scriptureRequests[0];
  assert.equal(request.unmatched,true);
  assert.equal(request.study,undefined,'a greeting is never a Bible search');
  assert.match(entryRow(app,request.id).querySelector('.moment-response').textContent,/glad you’re here/);
  app.submit('Hello how are you');
  const checkin=app.state.scriptureRequests[0];
  assert.equal(checkin.unmatched,true);
  assert.equal(checkin.study,undefined,'a check-in is never a Bible search');
  assert.match(entryRow(app,checkin.id).querySelector('.moment-response').textContent,/Ready when you are/);
});

test('Burden stance Skip still answers from the curated guide alone',()=>{
  const app=openFeelings({branches:true});
  const chips=()=>app.panel.querySelector('.chat-suggestions');
  const tap=label=>{const button=chips().querySelectorAll('button').find(entry=>entry.textContent===label);assert.ok(button,'chip offers: '+label);button.events.click();};
  tap('Anxious');
  tap('Racing thoughts');
  tap('Skip');
  const entry=app.state.scriptureRequests[0];
  assert.equal(entry.guide,'anxiety');
  const row=entryRow(app,entry.id);
  assert.match(row.querySelector('.verse-reference').textContent,/Matthew 11:28/);
  assert.match(row.querySelector('.moment-practice').textContent,/one worry in a sentence/);
});

test('every Burden animation references existing keyframes',()=>{
  const css=source('scripture-feelings.css');
  const used=new Set([...css.matchAll(/animation:\s*([a-z-]+)/g)].map(m=>m[1]).filter(name=>!/^(none|inherit|initial|unset)$/.test(name)));
  assert.ok(used.size>0,'Burden defines animations');
  for(const name of used)assert.match(css,new RegExp(`@keyframes ${name}\\b`),name+' keyframes exist');
});

test('Listen reads a matched answer aloud and highlights words as they are spoken',()=>{
  const app=openFeelings();
  app.submit('I feel lonely');
  const id=app.state.scriptureRequests[0].id;
  const row=entryRow(app,id);
  const listen=entryAction(row,'Listen');
  assert.ok(listen,'matched replies offer Listen');
  listen.events.click();
  assert.equal(app.speakCalls.length,1);
  assert.equal(app.speakCalls[0].key,id);
  assert.match(app.speakCalls[0].text,/Galatians 6:2/);
  const words=row.querySelectorAll('.speech-word');
  assert.ok(words.length>=2,'reference words are marked for highlighting');
  assert.equal(listen.textContent,'Stop');
  app.range(id,0);
  assert.equal(words[0].className.includes('spoken'),true,'current word highlights');
  app.range(id,words[0].textContent.length+1);
  assert.equal(words[0].className.includes('spoken'),false,'highlight moves on');
  assert.equal(words[1].className.includes('spoken'),true);
  listen.events.click();
  assert.equal(app.speakStops,1,'tapping Stop ends speech');
  assert.ok(words.every(word=>!word.className.includes('spoken')),'highlights clear on stop');
  assert.equal(listen.textContent,'Listen');
});

test('Listen reads original support prose and the passage reference, and releases highlighting on Stop',async()=>{
  const wording='You can take one gentle step and let someone support you.';
  const app=openFeelings({wordingReply:async()=>({available:true,text:wording})});
  app.submit('I feel lonely');await new Promise(setImmediate);
  const id=app.state.scriptureRequests[0].id,row=entryRow(app,id),prose=row.querySelector('.moment-context'),reference=row.querySelector('.moment-reference');
  const prepared=prose.textContent;
  assert.notEqual(prepared,wording);
  const referenceText=reference.textContent,listen=entryAction(row,'Listen');
  listen.events.click();
  assert.equal(app.speakCalls.length,1);assert.equal(app.speakCalls[0].key,id);
  assert.equal(app.speakCalls[0].text,prepared+' '+referenceText);
  assert.doesNotMatch(app.speakCalls[0].text,/Worded with on-device AI|Read chapter|Forget/);
  assert.equal(prose.classList.contains('speech-active'),true);
  assert.equal(reference.classList.contains('speech-active'),true);
  app.range(id,0);
  assert.equal(prose.querySelector('.speech-word').classList.contains('spoken'),true);
  listen.events.click();
  assert.equal(prose.classList.contains('speech-active'),false);
  assert.equal(reference.classList.contains('speech-active'),false);
  assert.equal(prose.querySelector('.spoken'),null);
  assert.equal(row.querySelector('.local-ai-label'),null);
  assert.equal(app.speakStops,1);
});

test('Listen reads urgent support and study notes, and stops when leaving',()=>{
  const app=openFeelings();
  app.submit('I want to kill myself');
  let row=entryRow(app,app.state.scriptureRequests[0].id);
  entryAction(row,'Listen').events.click();
  assert.match(app.speakCalls[0].text,/immediate human support/);
  app.visit('home');
  assert.equal(app.speakStops,1,'leaving Burden stops speech');
  const study=openFeelings({study:true});
  study.submit('What is grace?');
  row=entryRow(study,study.state.scriptureRequests[0].id);
  entryAction(row,'Listen').events.click();
  assert.match(study.speakCalls[0].text,/God’s gift/);
  assert.match(study.speakCalls[0].text,/Ephesians/);
  assert.doesNotMatch(study.speakCalls[0].text,/Read chapter|Forget/,'controls are never spoken');
});


test('keyboard overlap re-anchors the latest reply without resizing the transcript',()=>{
  const app=openFeelings();
  app.submit('I feel anxious');
  const height=app.scroller.clientHeight;
  app.viewportResize(1400);
  assert.equal(app.scroller.clientHeight,height);
  assert.equal(app.scroller.scrollTop,1400-height,'latest reply clears the taller keyboard padding');
  app.scroll(app.scroller.scrollTop);
  app.scroll(120);
  app.viewportResize(1500);
  assert.equal(app.scroller.scrollTop,120,'an older reading position stays put');
});

/* --- who is helping: one animal, everywhere, and it stays chosen -----------
   The portrait used to be read from a copy this screen kept for itself, seeded
   with the default animal when the file loaded. Every one of these failed
   because of that one thing: the module knew which animal was chosen, and the
   tile drew a different one. */

const portraits = app => app.panel.querySelectorAll('.donkey-guide').map(tile => tile.attrs['data-animal']);
const artwork = tile => (tile.querySelector('img')||{}).src;
const welcomeTile = app => app.panel.querySelector('.chat-welcome').querySelector('.donkey-guide');

test('choosing an animal by hand changes the portrait immediately, everywhere',()=>{
  const app=openFeelings();
  const change=app.panel.querySelector('.chat-welcome .guide-avatar .wheel-open');
  assert.equal(change.attrs['aria-label'],'Change animal');
  change.events.click();
  assert.equal(app.wheelRegistries.length,1,'the inline action opens the wheel');
  // One animal per selector option, each mapping to the portrait it names.
  const expected={donkey:'./art/animals/burden-painted.png',owl:'./art/animals/sage-painted.png',fox:'./art/animals/scout-painted.png',tortoise:'./art/animals/steady-painted.png'};
  for(const id of Object.keys(expected)){
    const result=app.chooseAnimal(id);
    assert.equal(result.ok,true,id+' must be accepted');
    assert.equal(result.mode,'manual',id+' must be a manual choice');
    assert.equal(app.animals().current(),id);
    // Immediately: before any navigation and before any new request.
    assert.equal(welcomeTile(app).attrs['data-animal'],id,id+' must be on the welcome tile at once');
    assert.equal(artwork(welcomeTile(app)),expected[id],id+' must use its own artwork');
    assert.equal(app.panel.querySelector('.chat-welcome .donkey-signature strong').textContent,app.animals().characters[id].name,id+' must show its own name');
    assert.equal(app.panel.querySelector('.chat-welcome .donkey-signature span').textContent,app.animals().characters[id].label,id+' must show its own role');
    assert.equal(app.panel.querySelector('.chat-welcome .animal-summary').textContent,app.animals().characters[id].summary,id+' must show its own description');
  }
});

test('a hand-picked animal is on every portrait, including replies already written',()=>{
  const app=openFeelings();
  app.submit('I feel anxious about everything');
  app.submit('What is grace?');
  const before=portraits(app);
  assert.ok(before.length>1,'the transcript has portraits of its own');
  app.chooseAnimal('fox');
  // Older rows were written while another animal was here. They must change too:
  // the portrait says who is helping, not who was helping at the time.
  assert.deepEqual([...new Set(portraits(app))],['fox'],'every portrait must show the chosen animal');
  // The replies themselves are untouched by the choice.
  assert.equal(app.state.scriptureRequests.length,2);
  assert.match(app.scroller.querySelectorAll('.chat-exchange')[0].textContent,/^I feel anxious/);
});

test('a hand-picked animal survives switching, navigating away and back',()=>{
  const app=openFeelings();
  // Switch repeatedly, the way someone flicking through the wheel does.
  for(const id of ['owl','fox','tortoise','owl','donkey','tortoise']){
    app.chooseAnimal(id);
    assert.equal(welcomeTile(app).attrs['data-animal'],id,id+' must apply at once');
  }
  app.chooseAnimal('fox');
  // Away to another screen and back again.
  app.visit('home');
  app.visit('today/feelings');
  assert.equal(welcomeTile(app).attrs['data-animal'],'fox','the choice must survive navigation');
  // And a request that would otherwise move it must not.
  app.submit('I have three options for the job and I cannot decide between them');
  assert.equal(welcomeTile(app).attrs['data-animal'],'fox','a request must not override a hand-picked animal');
  assert.equal(app.animals().current(),'fox');
  app.visit('home');
  app.visit('today/feelings');
  assert.equal(welcomeTile(app).attrs['data-animal'],'fox','still the chosen animal after navigating back');
});

test('Automatic mode routes for itself, and turning it off restores a stable state',()=>{
  const app=openFeelings();
  assert.equal(app.animals().mode,'auto','automatic is the default');
  // On: Steady picks for itself, and the portrait follows.
  app.submit('I have three options for the job and I cannot decide between them');
  assert.equal(welcomeTile(app).attrs['data-animal'],'fox','automatic mode should route a decision to the fox');
  app.submit('what does this verse actually mean');
  assert.equal(welcomeTile(app).attrs['data-animal'],'owl','automatic mode should route an explanation to the owl');
  app.submit('I am so tired and I keep putting it off, I cannot start');
  assert.equal(welcomeTile(app).attrs['data-animal'],'tortoise','automatic mode should route difficulty starting to the tortoise');
  assert.deepEqual([...new Set(portraits(app))],['tortoise'],'automatic mode keeps every portrait consistent');
});

test('turning Automatic off and picking by hand leaves a predictable, lasting state',()=>{
  const app=openFeelings();
  app.submit('I have three options for the job and I cannot decide between them');
  assert.equal(app.animals().current(),'fox');
  // Off.
  app.chooseAnimal('auto');
  assert.equal(app.animals().mode,'auto');
  assert.equal(app.animals().current(),app.animals().DEFAULT,'returning to Automatic starts again from the default');
  assert.equal(welcomeTile(app).attrs['data-animal'],app.animals().DEFAULT);
  // Then a deliberate choice, which must hold from here on.
  app.chooseAnimal('owl');
  assert.equal(app.animals().mode,'manual');
  assert.equal(app.animals().isManual(),true);
  for(const text of ['I cannot decide between three options','I am overwhelmed by everything','what does this verse mean']){
    app.submit(text);
    assert.equal(app.animals().current(),'owl',`"${text}" moved a hand-picked animal`);
    assert.equal(welcomeTile(app).attrs['data-animal'],'owl');
  }
  // A request that routes elsewhere in automatic mode changes nothing here.
  app.submit('I am so tired and I keep putting it off, I cannot start');
  assert.equal(welcomeTile(app).attrs['data-animal'],'owl');
});

test('the wheel is told the same animal the tile is showing',()=>{
  const app=openFeelings();
  app.chooseAnimal('tortoise');
  welcomeTile(app).events.click();
  assert.equal(app.wheelRegistries.length,1);
  const registry=app.wheelRegistries[0];
  assert.equal(registry.mode,'manual');
  assert.equal(registry.manual,'tortoise');
  assert.equal(registry.current,'tortoise','the wheel must be told the animal that is on screen');
  assert.equal(registry.current,welcomeTile(app).attrs['data-animal']);
  // And each option maps to the right animal, with its own portrait.
  const byId=Object.fromEntries(registry.animals.map(animal=>[animal.id,animal]));
  assert.deepEqual(Object.keys(byId).sort(),['donkey','fox','owl','tortoise']);
  for(const [id,animal] of Object.entries(byId)){
    assert.equal(animal.name,app.animals().characters[id].name,id+' must be named once');
    assert.equal(animal.artwork,app.animals().characters[id].artwork,id+' must point at its own artwork');
  }
  assert.equal(byId.donkey.artwork,'./art/animals/burden-painted.png');
  assert.equal(byId.owl.artwork,'./art/animals/sage-painted.png');
  assert.equal(byId.fox.artwork,'./art/animals/scout-painted.png');
  assert.equal(byId.tortoise.artwork,'./art/animals/steady-painted.png');
});

test('a restored choice is the portrait on screen from the first frame',()=>{
  // A cold start with a stored choice: the welcome tile ships carrying the
  // default animal in its markup, and the transcript is skipped when there are
  // saved entries, so nothing else would correct it.
  const store=new Map([['steady.animal',JSON.stringify({mode:'manual',id:'fox'})]]);
  globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key),get size(){return store.size;},raw:store};
  try{
    const history=[memory('a','grace','I feel anxious',  '2026-09-23T12:00:00.000Z')];
    const app=openFeelings({history});
    // Before anything is submitted, before navigating: the restored animal.
    assert.equal(welcomeTile(app).attrs['data-animal'],'fox','a restored choice must be shown immediately');
    assert.equal(artwork(welcomeTile(app)),'./art/animals/scout-painted.png');
    assert.deepEqual([...new Set(portraits(app))],['fox'],'every portrait must show the restored animal');
  } finally { delete globalThis.localStorage; }
});

test('an action save failure is visible inside the chat even when the web composer is hidden',()=>{
  const app=openFeelings({writable:false});
  app.main.openTool('actions');app.panel.querySelector('.chat-actions-add').events.click();
  app.submit('  Take a short walk  ');
  assert.equal(app.day.tasks[0].text,'Take a short walk');
  const notice=app.panel.querySelector('.chat-actions-status');
  assert.equal(notice.hidden,false);assert.match(notice.textContent,/visit only/);
  assert.equal(app.state.scriptureRequests.length,0);
});

test('returning to an open reflection refreshes the current day without changing its draft',()=>{
  const app=openFeelings({day:{reflection:'Earlier day note'}});
  app.main.openTool('reflect');app.write('Still writing');
  app.day.reflection='Current day note';app.day.reflections=[];
  app.visit('today/feelings');
  assert.match(app.panel.querySelector('.chat-kept-reflection').textContent,/Current day note/);
  assert.doesNotMatch(app.panel.querySelector('.chat-kept-reflection').textContent,/Earlier day note/);
  assert.equal(app.input.value,'Still writing');
});

test('the compact empty-chat identity remains the same element through focus, typing and blur',()=>{
  const app=openFeelings();
  const welcome=app.panel.querySelector('.chat-welcome');
  const identity=welcome.querySelector('.steady-welcome-identity');
  const mark=identity?.querySelector('.steady-presence');
  const heading=identity?.querySelector('h1');
  assert.ok(identity,'the compact welcome has one shared identity');
  assert.equal(heading.textContent,'Take your time.');
  assert.equal(mark.attrs['aria-hidden'],'true','only the decorative mark is hidden from assistive technology');
  assert.notEqual(identity.attrs['aria-hidden'],'true');
  assert.notEqual(heading.attrs['aria-hidden'],'true');
  const checkIdentity=()=>{
    assert.equal(app.panel.querySelector('.chat-welcome'),welcome);
    assert.equal(welcome.querySelector('.steady-welcome-identity'),identity);
    assert.equal(identity.querySelector('.steady-presence'),mark);
    assert.equal(identity.querySelector('h1'),heading);
    assert.equal(isVisible(welcome),true);
    assert.equal(app.panel.querySelector('.chat-draft-presence'),null,'there is no duplicate typing identity');
    assert.equal(welcome.querySelectorAll('.ask-starter').length,0,'focus and typing never restore removed starter cards');
    assert.equal(welcome.querySelector('.ask-starters').hidden,true);
  };
  checkIdentity();
  app.input.events.focus();checkIdentity();
  app.write('Something I am still thinking about');checkIdentity();
  app.input.events.blur();checkIdentity();
  app.composer.setFocused(true);checkIdentity();
  app.write('');checkIdentity();
  app.composer.setFocused(false);checkIdentity();
  assert.equal(app.state.scriptureRequests.length,0,'the welcome is not a saved conversation entry');
});

test('a restored draft keeps the compact welcome on returning to the main screen',()=>{
  const app=openFeelings({day:{feelingsDraft:'I want to put this into words'}});
  const welcome=app.panel.querySelector('.chat-welcome');
  const identity=welcome.querySelector('.steady-welcome-identity');
  assert.equal(isVisible(welcome),true);
  assert.equal(app.input.value,'I want to put this into words');
  assert.equal(app.panel.querySelector('.chat-draft-presence'),null);
  app.visit('settings');app.visit('today/feelings');
  assert.equal(welcome.querySelector('.steady-welcome-identity'),identity);
  assert.equal(isVisible(welcome),true);
  assert.equal(app.input.value,'I want to put this into words');
  assert.equal(app.panel.querySelector('.chat-draft-presence'),null);
  assert.equal(app.state.scriptureRequests.length,0);
});

test('conversation tools replace the compact welcome and closing them restores it without losing a draft',()=>{
  const app=openFeelings();
  const welcome=app.panel.querySelector('.chat-welcome');
  const identity=welcome.querySelector('.steady-welcome-identity');
  app.write('An unfinished thought');
  for(const tool of ['talk','step','scripture','reflect','actions']){
    app.main.openTool(tool);
    assert.equal(isVisible(welcome),false,tool+' supplies its own context');
    assert.equal(app.panel.querySelector('.chat-draft-presence'),null);
    if(tool==='actions')app.panel.querySelector('.chat-actions-close').events.click();
    else app.panel.querySelector('.chat-prompt-close').events.click();
    assert.equal(welcome.querySelector('.steady-welcome-identity'),identity);
    assert.equal(isVisible(welcome),true,tool+' returns to the same compact welcome');
    assert.equal(app.panel.querySelector('.chat-draft-presence'),null);
    assert.equal(app.input.value,'An unfinished thought');
    assert.equal(app.route,'today/feelings');
  }
  assert.equal(app.state.scriptureRequests.length,0);
});

test('sending a first message replaces the compact welcome through loading and the saved reply',async()=>{
  let resolveAnswer;
  const app=openFeelings({answerReply:()=>new Promise(resolve=>{resolveAnswer=resolve;})});
  const welcome=app.panel.querySelector('.chat-welcome');
  app.input.events.focus();app.write('How does a bicycle work?');
  assert.equal(isVisible(welcome),true);
  app.submit(app.input.value);await new Promise(setImmediate);
  assert.equal(isVisible(welcome),false);
  assert.equal(app.panel.querySelector('.chat-draft-presence'),null);
  assert.ok(app.panel.querySelector('.is-typing'));
  resolveAnswer({available:true,text:'Pedalling turns the wheels through a chain, moving the bicycle forward.'});
  await settleAnswer();
  assert.equal(app.state.scriptureRequests.length,1);
  assert.equal(isVisible(welcome),false);
  assert.equal(app.panel.querySelector('.is-typing'),null);
  app.input.events.blur();app.visit('settings');app.visit('today/feelings');
  assert.equal(isVisible(welcome),false,'returning to saved conversation must not restore an empty state');
  assert.equal(app.panel.querySelector('.chat-draft-presence'),null);
});
