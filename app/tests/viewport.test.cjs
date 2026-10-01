const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function open({missing = false, visualViewport = true} = {}) {
  const frames = [], operations = [], properties = new Map(), resizeObservers = [], mutationObservers = [];
  const geometry = {height: 70, bottom: 34, hidden: false};
  let editing = false;
  function target() {
    const listeners = new Map();
    return {
      addEventListener(name, listener) { listeners.set(name, listener); },
      fire(name) { listeners.get(name)?.(); }
    };
  }
  const root = {
    dataset: new Proxy({}, {
      set(object, name, value) { operations.push(['attribute', name, value]); object[name] = value; return true; }
    }),
    style: {setProperty(name, value) { operations.push(['write', name, value]); properties.set(name, value); }}
  };
  const content = {children: [{}, {}], scrollTop: 27, scrollTo(options) { this.lastScroll = options; }};
  const dock = {getBoundingClientRect() { operations.push(['bounds']); return {height: geometry.height}; }};
  const document = Object.assign(target(), {
    documentElement: root, body: {}, activeElement: {matches() { return editing; }},
    querySelector(selector) { return missing ? null : selector === '.app-content' ? content : dock; }
  });
  const window = Object.assign(target(), {innerHeight: 844});
  if (visualViewport) window.visualViewport = Object.assign(target(), {height: 844, scale: 1});
  const ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.nodes = []; resizeObservers.push(this); }
    observe(node) { this.nodes.push(node); }
  };
  window.ResizeObserver = ResizeObserver;
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/viewport.js'), 'utf8'), {
    window, document, ResizeObserver,
    MutationObserver: class {
      constructor(callback) { mutationObservers.push(callback); }
      observe() {}
    },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    getComputedStyle() {
      operations.push(['style']);
      return {display: geometry.hidden || root.dataset.keyboardOpen === 'true' ? 'none' : 'flex', bottom: `${geometry.bottom}px`};
    }
  });
  return {
    window, document, root, content, dock, geometry, operations, properties, frames, resizeObservers,
    edit(value) { editing = value; },
    frame() { frames.shift()?.(); },
    resize() { resizeObservers.forEach(observer => observer.callback()); },
    mutate() { mutationObservers.forEach(callback => callback()); },
    clear() { operations.length = 0; }
  };
}

test('initial clearance includes the dock, safe-area bottom, and breathing room', () => {
  const app = open();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
  assert.equal(app.properties.get('--app-height'), '100dvh');
  assert.equal(app.properties.get('--navigation-space'), '116px');
  assert.equal(app.frames.length, 0);
  assert.deepEqual(app.resizeObservers[0].nodes, [app.dock, app.content, ...app.content.children]);
});

test('screen, observer, focus, and resize notifications share one frame', () => {
  const app = open();
  app.clear();
  app.geometry.height = 72.4;
  app.geometry.bottom = 21;
  app.resize();
  app.mutate();
  app.document.fire('steady:screen');
  app.document.fire('focusin');
  app.document.fire('focusout');
  app.window.fire('resize');
  app.window.visualViewport.fire('resize');
  assert.equal(app.frames.length, 1);
  assert.deepEqual(app.operations, []);
  app.frame();
  assert.deepEqual(app.operations.map(operation => operation[0]), ['style', 'bounds', 'write']);
  assert.equal(app.properties.get('--navigation-space'), '106px');
});

test('unchanged layout does not write CSS or attributes or schedule another frame', () => {
  const app = open();
  app.clear();
  app.resize();
  app.frame();
  assert.deepEqual(app.operations.map(operation => operation[0]), ['style', 'bounds']);
  assert.equal(app.frames.length, 0);
});

test('keyboard resizing hides the dock without measuring it and restores current clearance', () => {
  const app = open();
  app.clear();
  app.edit(true);
  app.window.visualViewport.height = 480;
  app.document.fire('focusin');
  app.window.visualViewport.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'true');
  assert.equal(app.properties.get('--app-height'), '480px');
  assert.equal(app.properties.get('--navigation-space'), '0px');
  assert.equal(app.operations.some(operation => ['style', 'bounds'].includes(operation[0])), false);

  app.clear();
  app.window.visualViewport.height = 440;
  app.window.visualViewport.fire('resize');
  app.frame();
  assert.deepEqual(app.operations, [['write', '--keyboard-overlap', '404px'], ['write', '--app-height', '440px']]);

  app.clear();
  app.geometry.bottom = 24;
  app.window.visualViewport.height = 844;
  app.window.visualViewport.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
  assert.equal(app.properties.get('--app-height'), '100dvh');
  assert.equal(app.properties.get('--navigation-space'), '106px');
  assert.deepEqual(app.operations.map(operation => operation[0]), ['attribute', 'style', 'bounds', 'write', 'write', 'write']);
});

test('moving focus off the editor keeps keyboard layout until iOS expands the viewport', () => {
  const app = open();
  app.edit(true);
  app.window.visualViewport.height = 480;
  app.document.fire('focusin');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'true');

  app.edit(false);
  app.document.fire('focusout');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'true');
  assert.equal(app.properties.get('--app-height'), '480px');
  assert.equal(app.properties.get('--navigation-space'), '0px');

  app.window.visualViewport.height = 844;
  app.window.visualViewport.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
});

test('Expo keyboard bridge supplies a stable visible height when WebView does not resize', () => {
  const app = open();
  app.root.dataset.nativeKeyboard = 'true';
  app.root.dataset.nativeAppHeight = '456';
  app.window.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'true');
  assert.equal(app.properties.get('--app-height'), '456px');
  assert.equal(app.properties.get('--navigation-space'), '0px');

  app.root.dataset.nativeKeyboard = 'false';
  delete app.root.dataset.nativeAppHeight;
  app.window.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
  assert.equal(app.properties.get('--app-height'), '100dvh');
});

test('pinch zoom and a shorter viewport without editing do not count as a keyboard', () => {
  const app = open();
  app.window.visualViewport.height = 400;
  app.window.visualViewport.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
  app.edit(true);
  app.window.visualViewport.scale = 2;
  app.document.fire('focusin');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
  assert.equal(app.properties.get('--app-height'), '100dvh');
});

test('native keyboard height tracks WKWebView caret panning and dismissal resets the position', () => {
  const app = open();
  app.edit(true);
  app.root.dataset.nativeKeyboard = 'true';
  app.root.dataset.nativeAppHeight = '510';
  app.window.visualViewport.height = 450;
  app.window.visualViewport.offsetTop = 32;
  app.window.fire('resize');
  app.frame();
  assert.equal(app.properties.get('--app-height'), '450px','the smaller visible height wins when native excludes chrome');
  assert.equal(app.properties.get('--app-top'), '32px');
  app.root.dataset.nativeKeyboard = 'false';
  delete app.root.dataset.nativeAppHeight;
  app.window.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'true','a still-contracted viewport while editing keeps the compact layout despite a stale flag');
  app.window.visualViewport.height = 844;
  app.window.fire('resize');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
  assert.equal(app.properties.get('--app-height'), '100dvh');
  assert.equal(app.properties.get('--app-top'), '0px');
  assert.notEqual(app.properties.get('--navigation-space'), '0px');
});

test('Safari caret panning updates the chat position and restores it on dismissal', () => {
  const app = open();
  app.edit(true);
  app.window.visualViewport.height = 440;
  app.window.visualViewport.offsetTop = 36;
  app.window.visualViewport.fire('scroll');
  app.frame();
  assert.equal(app.properties.get('--app-top'), '36px');
  app.window.visualViewport.height = 844;
  app.window.visualViewport.offsetTop = 0;
  app.window.visualViewport.fire('resize');
  app.frame();
  assert.equal(app.properties.get('--app-top'), '0px');
});

test('an absent or invalid native frame falls back to a usable viewport height', () => {
  const app = open({visualViewport:false});
  app.root.dataset.nativeKeyboard = 'true';
  app.root.dataset.nativeAppHeight = '-20';
  app.window.fire('resize');
  app.frame();
  assert.equal(app.properties.get('--app-height'), '844px');
});

test('a hidden native-replaced or onboarding dock leaves no clearance', () => {
  const app = open();
  app.clear();
  app.geometry.hidden = true;
  app.mutate();
  app.resize();
  app.frame();
  assert.equal(app.properties.get('--navigation-space'), '0px');
  assert.equal(app.operations.some(operation => operation[0] === 'bounds'), false);
});

test('scroll proxy and environments without a visual viewport continue to work', () => {
  const app = open({visualViewport: false});
  assert.equal(app.window.SteadyViewport.scrollY, 27);
  app.content.scrollTop = 45;
  assert.equal(app.window.SteadyViewport.scrollY, 45);
  const options = {top: 0, behavior: 'auto'};
  app.window.SteadyViewport.scrollTo(options);
  assert.equal(app.content.lastScroll, options);
  app.edit(true);
  app.document.fire('focusin');
  app.frame();
  assert.equal(app.root.dataset.keyboardOpen, 'false');
});

test('missing page structure safely leaves the viewport bridge uninstalled', () => {
  const app = open({missing: true});
  assert.equal(app.window.SteadyViewport, undefined);
  assert.equal(app.frames.length, 0);
  assert.deepEqual(app.operations, []);
});

test('chat input tracks the occluded height instead of guessing keyboard chrome',()=>{
  const app=open();
  app.document.body.classList={contains:name=>name==='chat-screen'};
  app.edit(true);
  app.window.visualViewport.height=400;app.window.visualViewport.offsetTop=0;
  app.window.fire('resize');app.frame();
  assert.equal(app.properties.get('--keyboard-overlap'),'444px');
  assert.equal(app.properties.get('--app-height'),'844px','chat keeps full height while the input rides the overlap');
});

test('chat reaches the native keyboard edge even before WebKit resizes',()=>{
  const app=open();
  app.document.body.classList={contains:name=>name==='chat-screen'};
  app.root.dataset.nativeKeyboard='true';
  app.root.dataset.nativeAppHeight='456';
  app.window.fire('resize');app.frame();
  // Body top cancels visual viewport panning; compare physical screen edges.
  const composerBottom=()=>parseFloat(app.properties.get('--app-height'))-parseFloat(app.properties.get('--keyboard-overlap'));
  assert.equal(composerBottom(),456,'native frame supplies the keyboard edge without a visual viewport resize');

  app.window.visualViewport.height=400;
  app.window.visualViewport.offsetTop=32;
  app.window.visualViewport.fire('scroll');app.frame();
  assert.equal(composerBottom(),400,'caret panning does not leave space between the composer and visual edge');

  app.root.dataset.nativeAppHeight='380';
  app.window.fire('resize');app.frame();
  assert.equal(composerBottom(),380,'native edge remains authoritative when it is higher');
  app.window.visualViewport.height=844;
  app.window.visualViewport.fire('resize');app.frame();
  assert.equal(composerBottom(),380,'native height does not acquire an extra gap when the viewport stays full height');

  app.root.dataset.nativeKeyboard='false';
  app.window.visualViewport.height=844;
  app.window.visualViewport.offsetTop=0;
  app.window.fire('resize');app.frame();
  assert.equal(app.properties.get('--keyboard-overlap'),'0px');
  assert.equal(app.properties.get('--app-top'),'0px');
});

test('native chat canvas remains full height when WebKit shrinks innerHeight for the keyboard',()=>{
  const app=open();
  app.document.body.classList={contains:name=>name==='chat-screen'};
  app.root.dataset.nativeKeyboard='true';
  app.root.dataset.nativeViewportHeight='844';
  app.root.dataset.nativeAppHeight='456';
  app.window.innerHeight=456;
  app.window.visualViewport.height=456;
  app.window.fire('resize');app.frame();
  const canvasHeight=parseFloat(app.properties.get('--app-height'));
  const overlap=parseFloat(app.properties.get('--keyboard-overlap'));
  assert.equal(canvasHeight,844,'the transcript canvas extends through the occluded keyboard region');
  assert.equal(overlap,388);
  assert.equal(canvasHeight-overlap,456,'the composer still meets the visible keyboard edge');
});

test('native chat canvas also handles a keyboard that overlays a full visual viewport',()=>{
  const app=open();
  app.document.body.classList={contains:name=>name==='chat-screen'};
  app.root.dataset.nativeKeyboard='true';
  app.root.dataset.nativeViewportHeight='844';
  app.root.dataset.nativeAppHeight='456';
  app.window.fire('resize');app.frame();
  assert.equal(app.window.visualViewport.height,844);
  assert.equal(app.properties.get('--app-height'),'844px');
  assert.equal(app.properties.get('--keyboard-overlap'),'388px');
  assert.equal(parseFloat(app.properties.get('--app-height'))-parseFloat(app.properties.get('--keyboard-overlap')),456);
});

test('native chat canvas follows rotation while the keyboard remains open',()=>{
  const app=open();
  app.document.body.classList={contains:name=>name==='chat-screen'};
  app.root.dataset.nativeKeyboard='true';
  app.root.dataset.nativeViewportHeight='844';
  app.root.dataset.nativeAppHeight='456';
  app.window.innerHeight=456;
  app.window.visualViewport.height=456;
  app.window.fire('resize');app.frame();

  app.root.dataset.nativeViewportHeight='390';
  app.root.dataset.nativeAppHeight='230';
  app.window.innerHeight=230;
  app.window.visualViewport.height=230;
  app.window.fire('resize');app.frame();
  assert.equal(app.properties.get('--app-height'),'390px','rotation replaces the portrait canvas height');
  assert.equal(app.properties.get('--keyboard-overlap'),'160px');
  assert.equal(parseFloat(app.properties.get('--app-height'))-parseFloat(app.properties.get('--keyboard-overlap')),230);
});

test('native full height does not change keyboard sizing on other screens',()=>{
  const app=open();
  app.document.body.classList={contains:()=>false};
  app.root.dataset.nativeKeyboard='true';
  app.root.dataset.nativeViewportHeight='844';
  app.root.dataset.nativeAppHeight='456';
  app.window.innerHeight=456;
  app.window.visualViewport.height=456;
  app.window.fire('resize');app.frame();
  assert.equal(app.properties.get('--app-height'),'456px');
  assert.equal(app.properties.get('--keyboard-overlap'),'0px');

  app.window.innerHeight=844;
  app.window.visualViewport.height=844;
  app.window.fire('resize');app.frame();
  assert.equal(app.properties.get('--app-height'),'456px');
  assert.equal(app.properties.get('--keyboard-overlap'),'388px');
});

test('absent or invalid native full heights preserve the chat innerHeight fallback',()=>{
  const app=open();
  app.document.body.classList={contains:name=>name==='chat-screen'};
  app.root.dataset.nativeKeyboard='true';
  app.root.dataset.nativeAppHeight='400';
  app.window.innerHeight=600;
  app.window.visualViewport.height=400;
  for(const value of [undefined,'','0','-20','invalid','Infinity']){
    if(value===undefined)delete app.root.dataset.nativeViewportHeight;
    else app.root.dataset.nativeViewportHeight=value;
    app.window.fire('resize');app.frame();
    assert.equal(app.properties.get('--app-height'),'600px',`fallback for ${String(value)}`);
    assert.equal(app.properties.get('--keyboard-overlap'),'200px',`fallback overlap for ${String(value)}`);
  }
});
