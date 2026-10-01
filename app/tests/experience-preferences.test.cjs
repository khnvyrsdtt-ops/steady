const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../public/experience.js'),'utf8');

function productionBlock(from,to){
  const start=source.indexOf(from),end=source.indexOf(to,start);
  assert.ok(start>=0&&end>start,'the tested production settings block exists');
  return source.slice(start,end);
}

// Run the production capability, persistence and change handlers without copying
// their decisions into the fixture. Only DOM/storage/platform boundaries are fake.
function openReading(stored,options={}){
  const controls=new Map(),writes=[],calls=[],runtime={...options};
  const makeControl=()=>({value:'',hidden:false,textContent:'',events:{},addEventListener(name,handler){this.events[name]=handler;},append(){}});
  controls.set('#reading-preferences',makeControl());controls.set('#advanced-reading-preferences',makeControl());controls.set('#settings-status',makeControl());
  const control=selector=>{assert.ok(controls.has(selector),'unknown control '+selector);return controls.get(selector);};
  const document={documentElement:{dataset:{systemLargeText:options.systemLargeText?'true':'false'}},getElementById:id=>control('#'+id)};
  const listeners={};
  const window={addEventListener(name,handler){listeners[name]=handler;}},navigator={};
  if(options.native)window.SteadyNative={haptic(){assert.equal(this,window.SteadyNative);calls.push('native');if(runtime.nativeThrows)throw new Error('Feedback unavailable');}};
  if(options.browser)navigator.vibrate=function(duration){assert.equal(this,navigator);calls.push(['browser',duration]);if(runtime.browserThrows)throw new Error('Feedback unavailable');};
  const storage=new Map([['unrelated-entries','Keep these notes']]);
  if(Object.hasOwn(options,'raw'))storage.set('steady.reading',options.raw);
  else if(stored!==undefined)storage.set('steady.reading',JSON.stringify(stored));
  let renders=0;
  const sandbox={document,window,navigator,$:control,
    el:()=>({set innerHTML(html){for(const match of html.matchAll(/<\w+\b[^>]*\bid="([^"]+)"[^>]*>/g))controls.set('#'+match[1],makeControl());}}),
    matchMedia:()=>({matches:!!runtime.reducedMotion}),renderScripture(){renders++;},
    localStorage:{
      getItem(key){if(runtime.failRead)throw new Error('Read blocked');return storage.get(key)??null;},
      setItem(key,value){writes.push([key,value]);if(runtime.failWrite)throw new Error('Write blocked');storage.set(key,value);}
    }
  };
  vm.runInNewContext(productionBlock('  function hapticsAvailable()', '  function useSuggestion(')+
    productionBlock("  const preferences=el('div','more-preferences')", '  const rainbowRainControl=')+
    '\nglobalThis.api={haptic,syncHapticsAvailability};',sandbox);
  return {control,document,window,navigator,storage,writes,calls,runtime,api:sandbox.api,listeners,
    change(name,value){const target=control('#setting-'+name);target.value=value;target.events.change();},
    get renders(){return renders;}
  };
}

test('device text size follows iPhone changes until a manual choice is made',()=>{
  const app=openReading(undefined,{systemLargeText:true});
  assert.equal(app.control('#setting-size').value,'system');
  assert.equal(app.document.documentElement.dataset.size,'large');
  app.document.documentElement.dataset.systemLargeText='false';
  app.listeners['steady:system-text-size']();
  assert.equal(app.document.documentElement.dataset.size,'standard');
  app.change('size','large');
  app.listeners['steady:system-text-size']();
  assert.equal(app.document.documentElement.dataset.size,'large');
});

test('reading choices restore and save without startup writes or changes to unrelated data',()=>{
  const stored={size:'large',spacing:'roomy',translation:'asv',motion:'off',haptics:'on',legacy:'keep'};
  const app=openReading(stored,{browser:true});
  assert.deepEqual(app.writes,[]);assert.deepEqual(app.calls,[]);
  for(const name of ['size','spacing','translation','motion','haptics']){
    assert.equal(app.control('#setting-'+name).value,stored[name]);
    assert.equal(app.document.documentElement.dataset[name],stored[name]);
  }
  app.change('spacing','standard');
  assert.deepEqual(JSON.parse(app.storage.get('steady.reading')),{...stored,spacing:'standard'});
  assert.equal(app.control('#settings-status').textContent,'Saved');
  assert.equal(app.renders,1);
  assert.equal(app.storage.get('unrelated-entries'),'Keep these notes');
});

test('an unreadable reading store stays untouched even after a transient read failure ends',()=>{
  const stored={size:'large',translation:'asv',haptics:'on',legacy:'keep'};
  for(const options of [{failRead:true},{raw:'{"size":"large"'},{raw:'[]'},{raw:'42'},{raw:'"old preferences"'}]){
    const app=openReading(stored,options),original=app.storage.get('steady.reading');
    assert.equal(app.control('#setting-size').value,'system');
    assert.match(app.control('#settings-status').textContent,/could not be read/);
    app.runtime.failRead=false;
    app.change('size','large');app.change('translation','asv');
    assert.equal(app.document.documentElement.dataset.size,'large');
    assert.equal(app.document.documentElement.dataset.translation,'asv');
    assert.equal(app.storage.get('steady.reading'),original);
    assert.deepEqual(app.writes,[]);
    assert.equal(app.renders,2);
    assert.match(app.control('#settings-status').textContent,/Existing preferences have not been changed/);
    assert.match(app.control('#settings-status').textContent,/session only/);
  }
});

test('reading write failures leave saved data intact and report session-only changes',()=>{
  const stored={size:'standard',translation:'web'};
  const app=openReading(stored,{failWrite:true});
  app.change('size','large');
  assert.equal(app.document.documentElement.dataset.size,'large');
  assert.equal(app.storage.get('steady.reading'),JSON.stringify(stored));
  assert.equal(app.control('#settings-status').textContent,'Applied for this session. Device storage is unavailable.');
});

test('unsupported haptics are hidden without discarding a saved preference or accepting unavailable changes',()=>{
  const app=openReading({haptics:'on',translation:'web'});
  assert.equal(app.control('#haptics-preference').hidden,true);
  assert.equal(app.control('#setting-haptics').value,'on');
  app.api.haptic();assert.deepEqual(app.calls,[]);
  app.change('haptics','off');
  assert.equal(app.control('#setting-haptics').value,'on');
  assert.deepEqual(app.writes,[]);
  app.change('translation','not-a-translation');
  assert.equal(app.control('#setting-translation').value,'web');
  assert.deepEqual(app.writes,[]);
  app.change('translation','asv');
  assert.equal(JSON.parse(app.storage.get('steady.reading')).haptics,'on');
});

test('native haptics are preferred, browser vibration remains a fallback, and neither fires during setup',()=>{
  const native=openReading({haptics:'on'},{native:true,browser:true});
  assert.equal(native.control('#haptics-preference').hidden,false);
  assert.deepEqual(native.calls,[]);
  native.api.haptic();assert.deepEqual(native.calls,['native']);
  const browser=openReading({haptics:'on'},{browser:true});
  assert.equal(browser.control('#haptics-preference').hidden,false);
  browser.api.haptic();assert.deepEqual(browser.calls,[['browser',12]]);
  const firstUse=openReading(undefined,{native:true});
  firstUse.api.haptic();assert.deepEqual(firstUse.calls,[],'feedback remains off unless chosen');
  firstUse.change('haptics','on');firstUse.api.haptic();assert.deepEqual(firstUse.calls,['native']);
});

test('both feedback paths respect Off and reduced motion, and native/browser errors never interrupt the app',()=>{
  for(const options of [{native:true},{browser:true}]){
    const app=openReading({haptics:'off'},options);
    app.api.haptic();assert.deepEqual(app.calls,[]);
    app.change('haptics','on');app.runtime.reducedMotion=true;
    app.api.haptic();assert.deepEqual(app.calls,[]);
    app.runtime.reducedMotion=false;app.runtime.nativeThrows=true;app.runtime.browserThrows=true;
    assert.doesNotThrow(()=>app.api.haptic());assert.equal(app.calls.length,1);
  }
});

test('a later native capability refresh can reveal the control without changing saved choices',()=>{
  const app=openReading({haptics:'on'}),original=app.storage.get('steady.reading');
  app.window.SteadyNative={haptic(){app.calls.push('native');}};
  app.api.syncHapticsAvailability();
  assert.equal(app.control('#haptics-preference').hidden,false);
  assert.equal(app.storage.get('steady.reading'),original);assert.deepEqual(app.writes,[]);
  app.api.haptic();assert.deepEqual(app.calls,['native']);
  delete app.window.SteadyNative;app.api.syncHapticsAvailability();
  assert.equal(app.control('#haptics-preference').hidden,true);
});

test('Scripture themes use private notes only after explicit opt-in, preserving saved choices',()=>{
  const sources=[],saved=[];
  const controls=new Map([
    ['#use-notes',{checked:false,events:{},addEventListener(name,handler){this.events[name]=handler;}}],
    ['#settings-status',{textContent:''}]
  ]);
  const state={profile:{},scriptureRequests:[]};
  const day={mind:'I feel anxious',intention:'Help me decide',reflection:'A hard day',reflections:['I need rest'],tasks:[{text:'Find support'}],scriptureTheme:'auto'};
  const sandbox={state,day,$:selector=>controls.get(selector),
    G:{context:()=>({goal:'general'}),scripture:source=>{sources.push(source);return {key:'rest'};}},
    save:()=>{saved.push(structuredClone(state.profile));return true;},
    renderScripture(){},renderPlan(){}
  };
  vm.runInNewContext(productionBlock('  function profile()', '  function startToday()')+
    productionBlock('  function chooseScripture()', '  learn.classList.add')+
    productionBlock("  $('#use-notes').checked", '  more.append(')+
    '\nglobalThis.api={chooseScripture};',sandbox);
  const checkbox=controls.get('#use-notes');
  assert.equal(checkbox.checked,false);
  assert.deepEqual(saved,[],'opening Settings does not rewrite the preference');
  sandbox.api.chooseScripture();
  assert.equal(sources.at(-1).mind,'');
  assert.deepEqual(Array.from(sources.at(-1).tasks),[]);

  checkbox.checked=true;checkbox.events.change({target:checkbox});
  assert.equal(saved.at(-1).useNotes,true);
  sandbox.api.chooseScripture();
  assert.equal(sources.at(-1).mind,'I feel anxious');
  assert.equal(sources.at(-1).tasks.length,1);

  checkbox.checked=false;checkbox.events.change({target:checkbox});
  assert.equal(saved.at(-1).useNotes,false);
  sandbox.api.chooseScripture();
  assert.equal(sources.at(-1).mind,'');
  state.profile={useNotes:true};
  vm.runInNewContext(productionBlock("  $('#use-notes').checked", '  more.append('),sandbox);
  assert.equal(checkbox.checked,true,'an earlier explicit opt-in stays on');
});

function openRainbowRain(savedProfile,options={}){
  const control={checked:false,events:{},addEventListener(name,handler){this.events[name]=handler;}};
  const status={textContent:''},events=[],writes=[];
  const state={profile:savedProfile,days:{'2026-10-01':{reflection:'Keep this entry'}}};
  const document={documentElement:{dataset:{}}};
  const sandbox={state,document,$:selector=>selector==='#setting-rainbow-rain'?control:status,
    window:{dispatchEvent:event=>events.push(event)},
    CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},
    save(){if(options.failSave)return false;writes.push(structuredClone(state));return true;}
  };
  vm.runInNewContext(productionBlock('  function profile()', '  function ctx()')+
    productionBlock('  const rainbowRainControl=', "  $('#use-notes')"),sandbox);
  return {state,document,control,status,events,writes,change(enabled){control.checked=enabled;control.events.change();}};
}

test('rainbow rain stays off unless explicitly enabled and restores without startup writes',()=>{
  for(const profile of [undefined,{}, {rainbowRain:false},{rainbowRain:'on'},{rainbowRain:1},{rainbowRain:true}]){
    const app=openRainbowRain(profile),enabled=profile?.rainbowRain===true;
    assert.equal(app.control.checked,enabled);
    assert.equal(app.document.documentElement.dataset.rainbowRain,enabled?'on':'off');
    assert.deepEqual(app.writes,[]);assert.deepEqual(app.events,[]);
  }
});

test('rainbow rain toggles persist only the chosen preference and announce the applied state',()=>{
  const profile={useNotes:true,areas:['general'],legacy:'keep'},app=openRainbowRain(profile);
  app.change(true);
  assert.equal(app.control.checked,true);
  assert.equal(app.document.documentElement.dataset.rainbowRain,'on');
  assert.deepEqual(app.writes[0],{profile:{...profile,rainbowRain:true},days:{'2026-10-01':{reflection:'Keep this entry'}}});
  assert.equal(app.events[0].type,'steady:rainbow-rain-setting');
  assert.equal(app.events[0].detail.enabled,true);
  assert.equal(app.status.textContent,'Saved');
  app.change(false);
  assert.equal(app.document.documentElement.dataset.rainbowRain,'off');
  assert.equal(app.writes.at(-1).profile.rainbowRain,false);
  assert.equal(app.events.at(-1).detail.enabled,false);
});

test('rainbow rain remains usable for the visit when storage fails and reports the failure',()=>{
  const app=openRainbowRain({rainbowRain:false,useNotes:true},{failSave:true});
  app.change(true);
  assert.equal(app.document.documentElement.dataset.rainbowRain,'on');
  assert.equal(app.state.profile.useNotes,true);
  assert.deepEqual(app.writes,[]);
  assert.equal(app.status.textContent,'Applied for this visit only.');
  assert.equal(app.events.at(-1).detail.enabled,true);
});
