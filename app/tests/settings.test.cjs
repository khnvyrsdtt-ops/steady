const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function openSettings(stored,options={}) {
  const controls=new Map(['settings-status','setting-font','setting-guidance','setting-theme'].map(id=>[id,{
    value:'',textContent:'',handlers:{},addEventListener(name,handler){this.handlers[name]=handler;}
  }]));
  const storage=new Map([
    ['steady.settings',Object.hasOwn(options,'raw')?options.raw:JSON.stringify(stored)],
    ['steady.reminded','2026-09-24'],['unrelated-entries','Private writing stays intact']
  ]);
  const writes=[],reads=[],timers=[],messages=[],documentListeners=[],observers=[];
  const details=options.beforeStepSetup?null:{open:false};
  const control=id=>{assert.ok(controls.has(id),`Settings must not access retired control: ${id}`);return controls.get(id);};
  const document={
    documentElement:{dataset:{theme:'light'}},
    getElementById:control,
    querySelector:selector=>{assert.equal(selector,'.step-options');return details;},
    addEventListener:(...args)=>documentListeners.push(args)
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/settings.js'),'utf8'),{
    document,
    MutationObserver:class {constructor(callback){this.callback=callback;observers.push(this);}observe(){}},
    localStorage:{
      getItem:key=>{reads.push(key);if(options.failRead)throw new Error('Read blocked');return storage.get(key)??null;},
      setItem:(key,value)=>{writes.push([key,value]);if(options.failWrite)throw new Error('Write blocked');storage.set(key,value);}
    },
    setInterval:(...args)=>timers.push(args),setTimeout:(...args)=>timers.push(args),
    toast:message=>messages.push(message),
    applyTheme:value=>{document.documentElement.dataset.theme=value;}
  });
  return {control,storage,writes,reads,timers,messages,documentListeners,observers,details,document,
    change(name,value){const target=control(`setting-${name}`);target.value=value;target.handlers.change({target});}
  };
}

test('legacy enabled reminders create no timers, toasts, reminder controls or document listeners',()=>{
  for(const notifications of ['on','evening']){
    const stored={font:'dyslexic',guidance:'explained',notifications,notificationTime:'00:00',notificationDays:'daily',notificationKind:'scripture'};
    const app=openSettings(stored);
    assert.deepEqual(app.timers,[]);assert.deepEqual(app.messages,[]);assert.deepEqual(app.documentListeners,[]);
    assert.deepEqual(app.reads,['steady.settings']);assert.deepEqual(app.writes,[]);
    assert.equal(app.control('setting-font').value,'dyslexic');assert.equal(app.details.open,true);
    assert.equal(app.storage.get('steady.settings'),JSON.stringify(stored));
    assert.equal(app.storage.get('steady.reminded'),'2026-09-24');
  }
});

test('font and explanation changes still apply and save without changing retired fields or other stores',()=>{
  const legacy={notifications:'on',notificationTime:'09:15',notificationDays:'weekdays',notificationKind:'scripture'};
  const app=openSettings(legacy);
  app.change('font','serif');app.change('guidance','explained');
  assert.equal(app.document.documentElement.dataset.font,'serif');assert.equal(app.details.open,true);
  assert.deepEqual(JSON.parse(app.storage.get('steady.settings')),{...legacy,font:'serif',guidance:'explained'});
  app.change('guidance','brief');assert.equal(app.details.open,false);
  assert.equal(app.control('settings-status').textContent,'Saved');
  assert.ok(app.writes.every(([key])=>key==='steady.settings'));
  assert.equal(app.storage.get('steady.reminded'),'2026-09-24');
  assert.equal(app.storage.get('unrelated-entries'),'Private writing stays intact');
});

test('settings can initialize before the step disclosure exists without changing stored preferences',()=>{
  const stored={font:'dyslexic',guidance:'explained'};
  const app=openSettings(stored,{beforeStepSetup:true});
  assert.equal(app.details,null);
  assert.equal(app.control('setting-guidance').value,'explained');
  assert.equal(app.document.documentElement.dataset.font,'dyslexic');
  assert.equal(app.storage.get('steady.settings'),JSON.stringify(stored));
  assert.deepEqual(app.writes,[]);
  app.change('guidance','brief');
  assert.equal(app.control('setting-guidance').value,'brief');
  assert.equal(JSON.parse(app.storage.get('steady.settings')).guidance,'brief');
});

test('invalid saved reading preferences fall back safely without writing on startup',()=>{
  for(const stored of [null,[],42,'text',{font:'unknown',guidance:'unknown'},{font:{},guidance:[]}]){
    const app=openSettings(stored);
    assert.equal(app.control('setting-font').value,'default');assert.equal(app.control('setting-guidance').value,'brief');
    assert.equal(app.document.documentElement.dataset.font,'default');assert.equal(app.details.open,false);
    assert.deepEqual(app.writes,[]);
  }
});

test('invalid select values preserve the current preferences and theme',()=>{
  const app=openSettings({font:'dyslexic',guidance:'explained'});
  const original=app.storage.get('steady.settings');
  for(const [name,expected]of Object.entries({font:'dyslexic',guidance:'explained',theme:'light'})){
    app.change(name,'unknown');assert.equal(app.control(`setting-${name}`).value,expected);
    assert.equal(app.storage.get('steady.settings'),original);assert.deepEqual(app.writes,[]);
  }
  assert.equal(app.document.documentElement.dataset.font,'dyslexic');assert.equal(app.details.open,true);
  assert.equal(app.document.documentElement.dataset.theme,'light');
  assert.equal(app.control('settings-status').textContent,'Choose an available theme.');
});

test('theme changes persist separately and externally applied themes stay reflected in the control',()=>{
  const app=openSettings({font:'system',guidance:'brief'});
  const original=app.storage.get('steady.settings');
  app.change('theme','dark');
  assert.equal(app.document.documentElement.dataset.theme,'dark');assert.equal(app.storage.get('steady.theme'),'dark');
  assert.equal(app.storage.get('steady.settings'),original);assert.equal(app.control('settings-status').textContent,'Saved');
  app.document.documentElement.dataset.theme='light';app.observers[0].callback();
  assert.equal(app.control('setting-theme').value,'light');
});

test('failed writes keep retained settings applied for this visit and report the failure',()=>{
  const app=openSettings({font:'default',guidance:'brief',notifications:'on'},{failWrite:true});
  const original=app.storage.get('steady.settings');
  app.change('font','dyslexic');assert.equal(app.document.documentElement.dataset.font,'dyslexic');
  app.change('guidance','explained');assert.equal(app.details.open,true);
  app.change('theme','dark');assert.equal(app.document.documentElement.dataset.theme,'dark');
  assert.equal(app.storage.get('steady.settings'),original);assert.equal(app.storage.has('steady.theme'),false);
  assert.equal(app.control('settings-status').textContent,'Applied for this session. Device storage is unavailable.');
  assert.deepEqual(app.timers,[]);assert.deepEqual(app.messages,[]);
});

test('malformed or unreadable stored settings start with usable defaults and no reminder activity',()=>{
  for(const options of [{raw:'not JSON'},{failRead:true,failWrite:true}]){
    const app=openSettings({notifications:'on'},options);
    assert.equal(app.control('setting-font').value,'default');assert.equal(app.control('setting-guidance').value,'brief');
    app.change('font','system');assert.equal(app.document.documentElement.dataset.font,'system');
    assert.deepEqual(app.timers,[]);assert.deepEqual(app.messages,[]);assert.deepEqual(app.documentListeners,[]);
  }
});

test('failed settings reads never replace existing preferences even when writes are available',()=>{
  const stored={font:'dyslexic',guidance:'explained',notifications:'on',legacy:'keep'};
  const app=openSettings(stored,{failRead:true});
  app.change('font','serif');app.change('guidance','explained');
  assert.equal(app.document.documentElement.dataset.font,'serif');
  assert.equal(app.details.open,true,'preferences remain usable for this session');
  assert.equal(app.storage.get('steady.settings'),JSON.stringify(stored));
  assert.deepEqual(app.writes,[]);
  assert.match(app.control('settings-status').textContent,/Existing preferences have not been changed/);
  assert.match(app.control('settings-status').textContent,/session only/);
  assert.equal(app.storage.get('unrelated-entries'),'Private writing stays intact');
  app.change('theme','dark');
  assert.equal(app.storage.get('steady.theme'),'dark','an independent explicit theme change remains available');
  assert.equal(app.storage.get('steady.settings'),JSON.stringify(stored));
  assert.ok(app.writes.every(([key])=>key==='steady.theme'));
});

test('malformed settings JSON and unreadable root shapes stay untouched after session changes',()=>{
  for(const raw of ['{"font":"dyslexic"','[]','42','"earlier settings"']){
    const app=openSettings(undefined,{raw});
    app.change('font','system');app.change('guidance','explained');
    assert.equal(app.document.documentElement.dataset.font,'system');
    assert.equal(app.details.open,true);
    assert.equal(app.storage.get('steady.settings'),raw);
    assert.deepEqual(app.writes,[]);
    assert.match(app.control('settings-status').textContent,/could not be read/);
  }
});

test('settings styling no longer contains reminder-only controls',()=>{
  const css=fs.readFileSync(require.resolve('../public/settings.css'),'utf8');
  assert.doesNotMatch(css,/settings-reminders|notification-(?:options|footer)|input\[type=time\]/);
});
