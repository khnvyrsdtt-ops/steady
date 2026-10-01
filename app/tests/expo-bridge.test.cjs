const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {bridgeScript,selectedTab,tabScript,backScript,keyboardViewport,keyboardScript}=require('../../expo/web-bridge');

function openBridge(nativeTabs=false){
  const messages=[],events={},observers=[],classes=new Set();
  const html={dataset:{theme:'dark'}};
  const body={dataset:{section:'today'},classList:{contains:name=>classes.has(name)}};
  const listen=(name,fn)=>(events[name]||=[]).push(fn);
  const sandbox={
    currentScreenRoute:'today/scripture-step',location:{hash:'#today'},
    window:{ReactNativeWebView:{postMessage:value=>messages.push(JSON.parse(value))},addEventListener:listen},
    document:{documentElement:html,body,addEventListener:listen},
    MutationObserver:class{constructor(fn){this.fn=fn;}observe(element){observers.push([element,this.fn]);}}
  };
  vm.runInNewContext(bridgeScript(nativeTabs),sandbox);
  return {messages,html,classes,sandbox,fire:name=>(events[name]||[]).forEach(fn=>fn()),mutate:()=>observers.filter(([element])=>element===body).forEach(([,fn])=>fn())};
}

test('Expo receives the actual screen and its theme rather than guessing from an alias',()=>{
  const app=openBridge();assert.deepEqual(app.messages[0],{type:'route',hash:'#today',screen:'today/scripture-step',section:'today',tabsHidden:false});
  assert.deepEqual(app.messages[1],{type:'theme',dark:true});assert.equal(app.html.dataset.nativeTabs,undefined);
});
test('custom native tabs follow Settings and onboarding visibility and recover on exit',()=>{
  const app=openBridge(true);assert.equal(app.html.dataset.nativeTabs,'true');
  for(const cls of ['settings-open','onboarding-screen']){
    app.classes.add(cls);app.mutate();assert.equal(app.messages.at(-1).tabsHidden,true);
    app.classes.delete(cls);app.mutate();assert.equal(app.messages.at(-1).tabsHidden,false);
  }
});
test('same-hash screen renders still update native navigation and resume location',()=>{
  const app=openBridge(true);app.sandbox.currentScreenRoute='today/step';app.fire('steady:screen');
  assert.equal(app.messages.at(-1).screen,'today/step');assert.equal(app.messages.at(-1).hash,'#today');
  app.sandbox.location.hash='#learn/chapter';app.sandbox.currentScreenRoute='learn/chapter';app.fire('hashchange');assert.equal(app.messages.at(-1).hash,'#learn/chapter');
});
test('native selected tabs keep the simplified Home, Help and Reflect structure',()=>{
  assert.equal(selectedTab('today/feelings'),1);assert.equal(selectedTab('today/scripture-step'),0);assert.equal(selectedTab('#learn/chapter'),0);assert.equal(selectedTab('review'),2);assert.equal(selectedTab('settings'),null);
  for(const route of ['explore','learn','learn/exercise','learn/practice','think','direction','review/progress','review/day/2026-09-23'])assert.equal(selectedTab(route),0,route);
});
test('native highlighting respects the originating section for shared child screens',()=>{
  const app=openBridge(true);
  for(const [screen,section,index] of [['learn/scripture','help',1],['review/progress','review',2],['learn/chapter','home',0]]){
    app.sandbox.currentScreenRoute=screen;
    app.sandbox.document.body.dataset.section=section;
    app.fire('steady:screen');
    const message=app.messages.at(-1);
    assert.equal(message.section,section);
    assert.equal(selectedTab(message.screen,message.section),index);
  }
  assert.equal(selectedTab('review','unknown'),2);
});
test('native tab reselection delegates to web navigation even when the URL is unchanged',()=>{
  const selections=[];
  const sandbox={location:{hash:'#today'},window:{SteadyNavigation:{selectTab:route=>selections.push(route)}},navigateScreen:()=>assert.fail('The shared navigation must own tab selection')};
  vm.runInNewContext(tabScript('today'),sandbox);
  vm.runInNewContext(tabScript('today'),sandbox);
  assert.deepEqual(selections,['today','today']);
  assert.equal(sandbox.location.hash,'#today');
});
test('native tabs still invoke the router on older web previews without the shared API',()=>{
  const visits=[];
  vm.runInNewContext(tabScript('review'),{window:{},navigateScreen:route=>visits.push(route)});
  assert.deepEqual(visits,['review']);
});
test('Android Back delegates to the shared navigation before inspecting fallback controls',()=>{
  let calls=0;
  vm.runInNewContext(backScript,{window:{SteadyNavigation:{back:()=>calls++}},document:{querySelector:()=>assert.fail('The shared navigation owns contextual Back')}});
  assert.equal(calls,1);
});
test('Android Back follows contextual controls and does not depend on WebView hash history callbacks',()=>{
  const clicks=[],visits=[];
  const controls={'.settings-back':{hidden:false,click:()=>clicks.push('settings')},'.screen-back':{hidden:false,click:()=>clicks.push('screen')}};
  const sandbox={location:{hash:'#settings'},document:{querySelector:selector=>controls[selector]},navigateScreen:route=>visits.push(route)};
  vm.runInNewContext(backScript,sandbox);assert.deepEqual(clicks,['settings']);
  sandbox.location.hash='#learn/chapter';vm.runInNewContext(backScript,sandbox);assert.deepEqual(clicks,['settings','screen']);
  controls['.screen-back'].hidden=true;vm.runInNewContext(backScript,sandbox);assert.deepEqual(visits,['home']);
});
test('Android Back uses the previous onboarding step before leaving the flow',()=>{
  let previous=0;
  vm.runInNewContext(backScript,{location:{hash:'#welcome/steps'},document:{querySelector:selector=>selector.includes('.onboard-actions')?{click:()=>previous++}:null},navigateScreen:()=>assert.fail('Should remain in onboarding')});
  assert.equal(previous,1);
});

test('iPhone keyboard uses the measured WebView origin without subtracting the safe area twice',()=>{
  const keyboard={screenY:540,height:334};
  assert.deepEqual(keyboardViewport({y:0,height:874},keyboard),{open:true,height:540});
  assert.deepEqual(keyboardViewport({y:59,height:815},keyboard),{open:true,height:481});
  // Native tabs can change the WebView's full height without changing its top.
  assert.deepEqual(keyboardViewport({y:0,height:776},keyboard),{open:true,height:540});
});
test('keyboard changes and dismissal restore the current frame instead of retaining the earlier height',()=>{
  const frame={y:0,height:874};
  assert.deepEqual(keyboardViewport(frame,{screenY:510,height:364}),{open:true,height:510});
  assert.deepEqual(keyboardViewport(frame,{screenY:640,height:234}),{open:true,height:640});
  assert.deepEqual(keyboardViewport(frame,{screenY:874,height:334}),{open:false,height:874});
  assert.deepEqual(keyboardViewport(frame,null),{open:false,height:874});
  assert.deepEqual(keyboardViewport({y:24,height:516},{screenY:540,height:334}),{open:false,height:516});
  assert.equal(keyboardViewport(null,null),null);
});
test('cross-fade keyboard coordinates retain a usable viewport and a hidden keyboard is cleared',()=>{
  assert.deepEqual(keyboardViewport({y:0,height:874},{screenY:0,height:334}),{open:true,height:540});
  const html={dataset:{}},events=[];
  const sandbox={document:{documentElement:html},window:{dispatchEvent:event=>events.push(event.type)},Event:class{constructor(type){this.type=type;}}};
  vm.runInNewContext(keyboardScript({open:true,height:540}),sandbox);
  assert.equal(html.dataset.nativeKeyboard,'true');assert.equal(html.dataset.nativeAppHeight,'540');
  vm.runInNewContext(keyboardScript({open:false,height:874}),sandbox);
  assert.equal(html.dataset.nativeKeyboard,'false');assert.equal(html.dataset.nativeAppHeight,'874');
  assert.deepEqual(events,['resize','resize']);
});
