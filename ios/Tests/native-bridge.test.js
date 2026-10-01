'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const template = fs.readFileSync(path.join(__dirname, '../Steady/NativeBridge.js'), 'utf8');

function launch(seed, existing = new Map(), {viewportContent = 'width=device-width, initial-scale=1.0, viewport-fit=cover', initiallyChat = false, settingsVisit = false, settingsPageHidden = true, nativeReply = async () => true, missingHandler = false} = {}) {
  class Storage {
    getItem(key) { return existing.has(String(key)) ? existing.get(String(key)) : null; }
    setItem(key, value) { existing.set(String(key), String(value)); }
    removeItem(key) { existing.delete(String(key)); }
    clear() { existing.clear(); }
  }
  const messages = [];
  const events = [];
  const localStorage = new Storage();
  const listeners = new Map();
  const observers = [];
  const viewportWrites = [];
  let chat = initiallyChat;
  const viewport = {
    getAttribute:() => viewportContent,
    setAttribute(name, value) { viewportContent = value; viewportWrites.push(value); },
    removeAttribute() { viewportContent = null; viewportWrites.push(null); }
  };
  const document = {
    readyState:'loading',
    documentElement:{dataset:{}, setAttribute(){}, getAttribute:() => null},
    body:{classList:{contains:className => (className === 'chat-screen' && chat) || (className === 'settings-open' && settingsVisit)}},
    getElementById:id => id === 'settings-page' ? {hidden:settingsPageHidden} : null,
    querySelector:selector => selector === 'meta[name="viewport"]' ? viewport : null,
    // The bridge asks the document for the mark slot and the Back control when it
    // reports its navigation state. A document double that only answers
    // querySelector cannot answer that, so the double completes the API here
    // rather than the bridge being simplified to suit the double.
    querySelectorAll:() => [],
    addEventListener(type, listener) { listeners.set(type, listener); }
  };
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe(target, options) { observers.push({target, options, callback:this.callback}); }
  }
  function notify(target, attributeName) {
    observers.filter(observer => observer.target === target && observer.options.attributeFilter.includes(attributeName))
      .forEach(observer => observer.callback());
  }
  const window = {
    webkit:{messageHandlers:missingHandler ? {} : {steady:{postMessage:value => {messages.push(value); return nativeReply(value);}}}},
    addEventListener() {},
    dispatchEvent(event){events.push(event);}
  };
  // The bridge subscribes to resize and marks itself for layout observation when
  // it starts. A double that has no such API stops the bridge part way through
  // start-up, so the double provides the shape and the bridge is left alone.
  class ResizeObserver { observe() {} disconnect() {} }
  const context = {Storage, localStorage, document, window, MutationObserver, ResizeObserver, CustomEvent:class {constructor(type, options){this.type=type;this.detail=options.detail;}}, requestAnimationFrame:() => 1};
  vm.runInNewContext(template.replace('__STEADY_NATIVE_SEED__', JSON.stringify(seed)), context);
  return {
    localStorage, api:window.SteadyNative, messages, existing, viewport, viewportWrites,
    dataset:document.documentElement.dataset, events,
    ready:() => listeners.get('DOMContentLoaded')(),
    setChat(value) { chat = value; notify(document.body, 'class'); },
    setTheme(value) { document.documentElement.dataset.theme = value; notify(document.documentElement, 'data-theme'); }
  };
}

test('native display preferences are available before the page becomes ready', () => {
  const modern = launch({nativeDesign:'liquid-glass', reducedTransparency:true, increasedContrast:true});
  assert.equal(modern.dataset.nativeDesign, 'liquid-glass');
  assert.equal(modern.dataset.reducedTransparency, 'true');
  assert.equal(modern.dataset.increasedContrast, 'true');
  assert.equal(modern.messages.length, 0);
  const legacy = launch({});
  assert.equal(legacy.dataset.nativeDesign, 'classic');
  assert.equal(legacy.dataset.reducedTransparency, 'false');
  assert.equal(legacy.dataset.increasedContrast, 'false');
});

test('display preferences change live without rewriting saved content or repeating unchanged events', () => {
  const app = launch({nativeDesign:'liquid-glass'}, new Map([['steady.theme','dark']]));
  const original = [...app.existing];
  const next = {nativeDesign:'liquid-glass', reducedTransparency:true, increasedContrast:true};
  app.api.updateDisplayPreferences(next);
  assert.equal(app.dataset.reducedTransparency, 'true');
  assert.equal(app.dataset.increasedContrast, 'true');
  assert.equal(app.events.at(-1).type, 'steady:display-preferences');
  const count = app.events.length;
  app.api.updateDisplayPreferences(next);
  assert.equal(app.events.length, count);
  app.api.updateDisplayPreferences({nativeDesign:'liquid-glass', reducedTransparency:false, increasedContrast:false});
  assert.equal(app.dataset.reducedTransparency, 'false');
  assert.equal(app.dataset.increasedContrast, 'false');
  assert.deepEqual([...app.existing], original);
  assert.equal(app.messages.length, 0);
});

test('restores the native mirror into a fresh file origin', () => {
  const app = launch({snapshot:{version:1,revision:8,values:{'steady.theme':'dark'}}});
  assert.equal(app.localStorage.getItem('steady.theme'), 'dark');
  assert.equal(app.localStorage.getItem('steady.native.revision'), '8');
});
test('About Steady keeps its Back path without retaining the native Settings header', () => {
  const settings = launch({}, new Map(), {settingsVisit:true, settingsPageHidden:false});
  settings.ready();
  assert.equal(settings.messages.find(message => message.type === 'navigation').settings, true);
  const about = launch({}, new Map(), {settingsVisit:true, settingsPageHidden:true});
  about.ready();
  assert.equal(about.messages.find(message => message.type === 'navigation').settings, false);
});
test('Ask interpretation accepts only a bounded reply tied to the request', async () => {
  const request={requestId:'ask:123',text:'What about tomorrow?',history:['I have two job offers.']};
  const app=launch({},new Map(),{nativeReply:async message=>({requestId:message.requestId,available:true,animal:'fox',guide:'decisions',confidence:'clear'})});
  assert.deepEqual(JSON.parse(JSON.stringify(await app.api.interpretAsk(request))),
    {available:true,animal:'fox',guide:'decisions',confidence:'clear'});
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages[0])),{type:'interpretAsk',...request});
  for(const bad of [
    {...request,history:Array(3).fill('old')},
    {...request,text:'x'.repeat(1201)},
    {...request,history:['x'.repeat(241)]}
  ]) assert.equal((await app.api.interpretAsk(bad)).available,false);
  const untrusted=launch({},new Map(),{nativeReply:async()=>({requestId:'wrong',available:true,animal:'fox',guide:'decisions',confidence:'clear'})});
  assert.equal((await untrusted.api.interpretAsk(request)).available,false);
});
test('confirmed erase followed by reload never restores stale bootstrap entries', async () => {
  const seed = {snapshot:{version:1,revision:8,values:{'steady.theme':'dark'}}};
  const app = launch(seed);
  app.localStorage.removeItem('steady.theme');
  await app.api.flushStorage();
  const reloaded = launch(seed, app.existing);
  assert.equal(reloaded.localStorage.getItem('steady.theme'), null);
  assert.ok(Number(reloaded.localStorage.getItem('steady.native.revision')) > 8);
  assert.equal(Object.keys(app.messages.at(-1).snapshot.values).length, 0);
});
test('newer WebKit entries win over an older mirror', () => {
  const existing = new Map([['steady.theme','light'],['steady.native.revision','10']]);
  const app = launch({snapshot:{version:1,revision:8,values:{'steady.theme':'dark'}}}, existing);
  assert.equal(app.localStorage.getItem('steady.theme'), 'light');
});
test('unreadable native mirror blocks destructive writes', async () => {
  const app = launch({error:'Unreadable saved copy'}, new Map([['steady.theme','dark']]));
  assert.throws(() => app.localStorage.setItem('steady.theme','light'), /Unreadable/);
  assert.throws(() => app.localStorage.removeItem('steady.theme'), /Unreadable/);
  await assert.rejects(app.api.flushStorage(), /Unreadable/);
  assert.equal(app.localStorage.getItem('steady.theme'),'dark');
});
test('native snapshot includes only approved Steady storage keys', async () => {
  const app = launch({});
  app.localStorage.setItem('unrelated.private','not in snapshot');
  app.localStorage.setItem('steady.theme','dark');
  await app.api.flushStorage();
  assert.equal(app.messages.at(-1).snapshot.values['steady.theme'],'dark');
  assert.equal(Object.hasOwn(app.messages.at(-1).snapshot.values, 'unrelated.private'),false);
});
test('spoken answers cross the bridge with text and key only', async () => {
  const app = launch({});
  await app.api.speak('Galatians 6:2', 'reply-1');
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages.at(-1))), {type:'speak', text:'Galatians 6:2', key:'reply-1'});
  await app.api.stopSpeaking();
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages.at(-1))), {type:'stopSpeaking'});
});
test('native chat overlays the keyboard and restores the exact viewport on leave and reentry', () => {
  const original = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
  const overlay = `${original}, interactive-widget=overlays-content`;
  const app = launch({}, new Map(), {viewportContent:original});
  app.ready();
  assert.deepEqual(app.viewportWrites, []);
  app.setChat(true);
  assert.equal(app.viewport.getAttribute('content'), overlay);
  app.setTheme('dark');
  app.setTheme('light');
  app.setChat(true);
  assert.deepEqual(app.viewportWrites, [overlay]);
  app.setChat(false);
  assert.equal(app.viewport.getAttribute('content'), original);
  app.setTheme('dark');
  app.setChat(false);
  assert.deepEqual(app.viewportWrites, [overlay, original]);
  app.setChat(true);
  assert.deepEqual(app.viewportWrites, [overlay, original, overlay]);
  assert.equal(app.messages.at(-1).chat, true);
  assert.equal(app.messages.at(-1).dark, true);
});
test('native chat replaces an existing interactive-widget option without changing its saved viewport', () => {
  const original = 'width=device-width; Interactive-Widget = resizes-content, initial-scale=1';
  const overlay = 'width=device-width; interactive-widget=overlays-content, initial-scale=1';
  const app = launch({}, new Map(), {viewportContent:original, initiallyChat:true});
  app.ready();
  assert.equal(app.viewport.getAttribute('content'), overlay);
  assert.equal((app.viewport.getAttribute('content').match(/interactive-widget/gi) || []).length, 1);
  app.setTheme('dark');
  assert.deepEqual(app.viewportWrites, [overlay]);
  app.setChat(false);
  assert.equal(app.viewport.getAttribute('content'), original);
  app.setChat(true);
  assert.deepEqual(app.viewportWrites, [overlay, original, overlay]);
});
test('native chat restores a viewport without a content attribute', () => {
  const app = launch({}, new Map(), {viewportContent:null});
  app.ready();
  app.setChat(true);
  assert.equal(app.viewport.getAttribute('content'), 'interactive-widget=overlays-content');
  app.setChat(false);
  assert.equal(app.viewport.getAttribute('content'), null);
});

test('on-device rewriting sends bounded prose as data and checks the matching request ID', async () => {
  const app = launch({}, new Map(), {nativeReply:message => Promise.resolve({requestId:message.requestId, available:true, text:'  Take one gentle step today.  '})});
  const request = {requestId:'reply:123-ab', text:'I’m worried.', sourceText:'Take one “gentle” step today.', ignored:'not sent'};
  const result = await app.api.organiseReply(request);
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages[0])), {type:'organiseReply', requestId:'reply:123-ab', text:'I’m worried.', sourceText:'Take one “gentle” step today.'});
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {available:true, text:'Take one gentle step today.'});
});

test('malformed or oversized rewrite requests never cross the native bridge', async () => {
  const app = launch({});
  const valid = {requestId:'reply-1', text:'I am worried.', sourceText:'Take one gentle step.'};
  for (const request of [undefined, null, {}, {...valid, requestId:''}, {...valid, requestId:'reply\n'}, {...valid, requestId:'a'.repeat(81)}, {...valid, requestId:'<script>'}, {...valid, text:5}, {...valid, text:' '}, {...valid, text:'a'.repeat(1201)}, {...valid, text:'😀'.repeat(601)}, {...valid, sourceText:null}, {...valid, sourceText:' '}, {...valid, sourceText:'a'.repeat(3001)}]) {
    assert.equal((await app.api.organiseReply(request)).available, false);
  }
  assert.equal(app.messages.length, 0);
});

test('unavailable, malformed, mismatched and oversized native replies retain the library fallback', async () => {
  const request = {requestId:'reply-1', text:'I am worried.', sourceText:'Take one gentle step.'};
  for (const reply of [null, true, {}, {available:false}, {available:'true', requestId:'reply-1', text:'A reply'}, {available:true, requestId:'reply-2', text:'A stale reply'}, {available:true, requestId:'reply-1'}, {available:true, requestId:'reply-1', text:' '}, {available:true, requestId:'reply-1', text:'a'.repeat(701)}, {available:true, requestId:'reply-1', text:Array(101).fill('word').join(' ')}]) {
    const app = launch({}, new Map(), {nativeReply:() => Promise.resolve(reply)});
    assert.equal((await app.api.organiseReply(request)).available, false);
  }
});

test('missing or failed native handlers resolve model operations to unavailable', async () => {
  for (const options of [{missingHandler:true}, {nativeReply:() => { throw Error('Unavailable'); }}, {nativeReply:() => Promise.reject(Error('Unavailable'))}]) {
    const app = launch({}, new Map(), options);
    assert.equal((await app.api.localAIStatus()).available, false);
    assert.equal((await app.api.organiseReply({requestId:'reply-1', text:'A concern.', sourceText:'A gentle response.'})).available, false);
    assert.deepEqual(JSON.parse(JSON.stringify(await app.api.extractMemory({requestId:'memory-1', text:'I work night shifts.'}))), {available:false, notes:[]});
  }
});

test('reply context accepts four bounded memories without changing legacy payloads', async () => {
  const app = launch({}, new Map(), {nativeReply:message => Promise.resolve({available:true, requestId:message.requestId, text:'A gentle response.'})});
  const request = {requestId:'reply-1', text:'A concern.', sourceText:'A gentle response.'};
  await app.api.organiseReply(request);
  assert.equal(Object.hasOwn(app.messages[0], 'memories'), false);
  const memories = ['I work nights.', 'I prefer short replies.', 'x'.repeat(180), '😀'.repeat(90)];
  assert.equal((await app.api.organiseReply({...request, memories})).available, true);
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages[1].memories)), memories);
  assert.equal((await app.api.organiseReply({...request, memories:[]})).available, true);
  const sent = app.messages.length;
  for (const value of [null, {}, 'A note', Array(5).fill('A note'), [''], ['  '], [5], ['x'.repeat(181)], ['😀'.repeat(91)], Array(2)]) {
    assert.equal((await app.api.organiseReply({...request, memories:value})).available, false);
  }
  assert.equal(app.messages.length, sent);
});

test('memory extraction only returns the requested exact snippets, including a valid empty result', async () => {
  const text = 'I work night shifts. I prefer short replies.';
  const notes = ['I work night shifts.', 'I prefer short replies.'];
  const app = launch({}, new Map(), {nativeReply:message => Promise.resolve({available:true, requestId:message.requestId, notes})});
  assert.deepEqual(JSON.parse(JSON.stringify(await app.api.extractMemory({requestId:'memory-1', text, extra:'not sent'}))), {available:true, notes});
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages[0])), {type:'extractMemory', requestId:'memory-1', text});
  const empty = launch({}, new Map(), {nativeReply:message => Promise.resolve({available:true, requestId:message.requestId, notes:[]})});
  assert.deepEqual(JSON.parse(JSON.stringify(await empty.api.extractMemory({requestId:'memory-2', text:'Hello'}))), {available:true, notes:[]});
});

test('malformed memory requests never cross the bridge', async () => {
  const app = launch({});
  for (const request of [null, {}, {requestId:'memory-1'}, {requestId:'memory\n', text:'A note'}, {requestId:'memory-1', text:4}, {requestId:'memory-1', text:' '}, {requestId:'memory-1', text:'x'.repeat(1201)}, {requestId:'memory-1', text:'😀'.repeat(601)}]) {
    assert.deepEqual(JSON.parse(JSON.stringify(await app.api.extractMemory(request))), {available:false, notes:[]});
  }
  assert.equal(app.messages.length, 0);
});

test('memory replies reject invented, stale, non-array, oversized and Unicode-normalized notes', async () => {
  const text = 'I work night shifts. I prefer tea. Cafe\u0301. '+ 'x'.repeat(181);
  const valid = {available:true, requestId:'memory-1', notes:['I work night shifts.']};
  for (const result of [null, {}, {available:false}, {...valid, requestId:'old'}, {...valid, notes:'A note'}, {...valid, notes:[7]}, {...valid, notes:['']}, {...valid, notes:['I work day shifts.']}, {...valid, notes:['Café.']}, {...valid, notes:['x'.repeat(181)]}, {...valid, notes:['I work night shifts.', 'I prefer tea.', 'Cafe\u0301.']}]) {
    const app = launch({}, new Map(), {nativeReply:() => Promise.resolve(result)});
    assert.deepEqual(JSON.parse(JSON.stringify(await app.api.extractMemory({requestId:'memory-1', text}))), {available:false, notes:[]});
  }
  const boundary = launch({}, new Map(), {nativeReply:message => Promise.resolve({...valid, requestId:message.requestId, notes:['x'.repeat(180)]})});
  assert.equal((await boundary.api.extractMemory({requestId:'memory-1', text:'x'.repeat(1200)})).notes[0].length, 180);
});

test('local model status reports availability and a bounded reason without exposing native errors', async () => {
  const ready = launch({}, new Map(), {nativeReply:() => Promise.resolve({available:true})});
  assert.deepEqual(JSON.parse(JSON.stringify(await ready.api.localAIStatus())), {available:true});
  assert.deepEqual(JSON.parse(JSON.stringify(ready.messages[0])), {type:'localAIStatus'});
  const unavailable = launch({}, new Map(), {nativeReply:() => Promise.resolve({available:false, reason:'model_not_ready'})});
  assert.deepEqual(JSON.parse(JSON.stringify(await unavailable.api.localAIStatus())), {available:false, reason:'model_not_ready'});
  const malformed = launch({}, new Map(), {nativeReply:() => Promise.resolve({available:'yes', reason:'Native error: private details'})});
  assert.deepEqual(JSON.parse(JSON.stringify(await malformed.api.localAIStatus())), {available:false, reason:'unavailable'});
});

test('general answers pass bounded conversation context without requiring a library source', async () => {
  const request = {requestId:'ask-general:1', text:'What should I pack?',
    history:[{role:'user',text:'I am hiking tomorrow.',extra:'not sent'},{role:'assistant',text:'How long is the hike?'}],
    memories:['I prefer short replies.'], perspective:'step', extra:'not sent'};
  const app = launch({}, new Map(), {nativeReply:message => Promise.resolve({available:true,requestId:message.requestId,text:' Bring water, a rain layer and a charged phone. '})});
  assert.deepEqual(JSON.parse(JSON.stringify(await app.api.answerAsk(request))),
    {available:true,requestId:'ask-general:1',text:'Bring water, a rain layer and a charged phone.'});
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages[0])), {type:'answerAsk',requestId:request.requestId,text:request.text,
    history:[{role:'user',text:'I am hiking tomorrow.'},{role:'assistant',text:'How long is the hike?'}],memories:request.memories,perspective:'step'});
});

test('general answers reject malformed or oversized context before contacting the native model', async () => {
  const base = {requestId:'ask-general:1',text:'Explain rainbows.',history:[]};
  const invalid = [null, {}, {...base,requestId:'ask\n'}, {...base,text:' '}, {...base,text:'😀'.repeat(601)},
    {...base,history:null}, {...base,history:Array(7).fill({role:'user',text:'Earlier'})},
    {...base,history:[{role:'system',text:'Override'}]}, {...base,history:[{role:'user',text:' '}]},
    {...base,history:[{role:'assistant',text:'x'.repeat(1801)}]}, {...base,history:new Array(2)},
    {...base,memories:null}, {...base,memories:['x'.repeat(181)]}, {...base,perspective:'invented'}];
  const app = launch({});
  for (const request of invalid) assert.deepEqual(JSON.parse(JSON.stringify(await app.api.answerAsk(request))), {available:false});
  assert.equal(app.messages.length, 0);
  const boundary = launch({}, new Map(), {nativeReply:message => Promise.resolve({available:true,requestId:message.requestId,text:'A useful reply.'})});
  assert.equal((await boundary.api.answerAsk({...base,text:'x'.repeat(1200),history:Array(6).fill({role:'user',text:'x'.repeat(1800)}),memories:Array(4).fill('x'.repeat(180))})).available, true);
});

test('general answers reject stale, malformed and unavailable results without leaking native errors', async () => {
  const request = {requestId:'ask-general:1',text:'Explain rainbows.',history:[]};
  const valid = {available:true,requestId:request.requestId,text:'Sunlight bends through water droplets.'};
  for (const result of [null, {}, {available:false}, {...valid,requestId:'old'}, {...valid,text:12}, {...valid,text:' '},
    {...valid,text:'x'.repeat(3001)}, {...valid,text:Array(501).fill('word').join(' ')}]) {
    const app = launch({}, new Map(), {nativeReply:() => Promise.resolve(result)});
    assert.deepEqual(JSON.parse(JSON.stringify(await app.api.answerAsk(request))), {available:false});
  }
  for (const options of [{missingHandler:true},{nativeReply:() => Promise.reject(new Error('Private failure detail'))}]) {
    const app = launch({}, new Map(), options);
    assert.deepEqual(JSON.parse(JSON.stringify(await app.api.answerAsk(request))), {available:false});
  }
});

test('composer prompts distinguish action and reflection saves and explicitly clear both for free chat',async()=>{
  const app=launch({});
  await app.api.focusAsk('One small action…',false,true);
  await app.api.focusAsk('A moment from today…',true);
  await app.api.setAskPrompt('Say it your way…');
  assert.deepEqual(JSON.parse(JSON.stringify(app.messages)),[
    {type:'focusAsk',prompt:'One small action…',saveReflection:false,saveAction:true},
    {type:'focusAsk',prompt:'A moment from today…',saveReflection:true,saveAction:false},
    {type:'setAskPrompt',prompt:'Say it your way…',saveReflection:false,saveAction:false}
  ]);
});
