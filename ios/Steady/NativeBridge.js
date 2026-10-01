(() => {
  'use strict';
  document.documentElement?.setAttribute('data-native-app', 'ios');
  // Replaced by Swift with JSON, never interpolated entry text or executable source.
  const seed = __STEADY_NATIVE_SEED__;
  document.documentElement?.setAttribute('data-system-large-text', seed.systemLargeText ? 'true' : 'false');
  // Native availability and display preferences are authoritative. A web
  // rendering capability alone does not identify the device's iOS design.
  const updateDisplayPreferences = preferences => {
    const root = document.documentElement;
    if (!root || !preferences || typeof preferences !== 'object') return;
    const values = {
      nativeDesign:preferences.nativeDesign === 'liquid-glass' ? 'liquid-glass' : 'classic',
      reducedTransparency:preferences.reducedTransparency === true ? 'true' : 'false',
      increasedContrast:preferences.increasedContrast === true ? 'true' : 'false'
    };
    let changed = false;
    Object.entries(values).forEach(([key, value]) => {
      if (root.dataset[key] !== value) { root.dataset[key] = value; changed = true; }
    });
    if (changed) window.dispatchEvent(new CustomEvent('steady:display-preferences', {detail:values}));
  };
  updateDisplayPreferences(seed);
  const keys = ['steady.v1','steady.settings','steady.reading','steady.theme','steadyTasks','steadyReflection','steady.reminded','steady.animal'];
  const revisionKey = 'steady.native.revision';
  const original = {
    get: Storage.prototype.getItem,
    set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem,
    clear: Storage.prototype.clear
  };
  const post = (type, payload = {}) => window.webkit.messageHandlers.steady.postMessage({type, ...payload});
  let blocked = seed.error || '';
  let revision = 0;
  let pending = Promise.resolve();
  let errorReported = false;
  const report = error => {
    const message = String(error?.message || error || 'Your latest changes could not be saved.');
    window.SteadyData?.reportError(message);
    const notice = document.getElementById?.('storage-status');
    if (notice) { notice.hidden = false; notice.textContent = message; }
    window.dispatchEvent(new CustomEvent('steady:native-storage-error', {detail:{message}}));
    if (!errorReported) { errorReported = true; post('storageError', {message}).catch(() => {}); }
  };
  function readValues() {
    const values = {};
    keys.forEach(key => { const value = original.get.call(localStorage, key); if (value !== null) values[key] = value; });
    return values;
  }
  try {
    const parsed = Number(original.get.call(localStorage, revisionKey));
    revision = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
    if (seed.snapshot && seed.snapshot.revision > revision) {
      keys.forEach(key => {
        if (Object.hasOwn(seed.snapshot.values, key)) original.set.call(localStorage, key, seed.snapshot.values[key]);
        else original.remove.call(localStorage, key);
      });
      revision = seed.snapshot.revision;
      original.set.call(localStorage, revisionKey, String(revision));
    }
  } catch (error) { blocked = 'Steady could not restore its local storage. Its saved native copy has been preserved. Close and reopen the app to try again.'; }

  function persist() {
    if (blocked) { const error = new Error(blocked); report(error); return Promise.reject(error); }
    let snapshot;
    try {
      revision += 1;
      original.set.call(localStorage, revisionKey, String(revision));
      snapshot = {version:1, revision, values:readValues()};
    } catch (error) { report(error); return Promise.reject(error); }
    // Serialize revisions: a delayed earlier write cannot replace a newer snapshot.
    pending = pending.catch(() => {}).then(() => post('persist', {snapshot})).then(result => {
      errorReported = false;
      window.dispatchEvent(new CustomEvent('steady:native-storage-saved', {detail:{revision:snapshot.revision}}));
      return result;
    });
    pending.catch(report);
    return pending;
  }
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && keys.includes(String(key)) && blocked) throw new Error(blocked);
    const result = original.set.call(this, key, value);
    if (this === localStorage && keys.includes(String(key))) persist().catch(() => {});
    return result;
  };
  Storage.prototype.removeItem = function(key) {
    if (this === localStorage && keys.includes(String(key)) && blocked) throw new Error(blocked);
    const result = original.remove.call(this, key);
    if (this === localStorage && keys.includes(String(key))) persist().catch(() => {});
    return result;
  };
  Storage.prototype.clear = function() {
    if (this === localStorage && blocked) throw new Error(blocked);
    const result = original.clear.call(this);
    if (this === localStorage) persist().catch(() => {});
    return result;
  };
  const validRequestId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value) && !/\s/.test(value);
  const validMemories = value => Array.isArray(value) && value.length <= 4 && Array.from(value).every(note => typeof note === 'string' && note.trim() && note.length <= 180);
  async function localAIStatus() {
    try {
      const result = await post('localAIStatus');
      if (result?.available === true) return {available:true};
      const reason = typeof result?.reason === 'string' && /^[a-z_]{1,80}$/.test(result.reason) ? result.reason : 'unavailable';
      return {available:false, reason};
    } catch (_) { return {available:false, reason:'unavailable'}; }
  }
  async function organiseReply(request) {
    const fallback = {available:false};
    if (!request || !validRequestId(request.requestId) || typeof request.text !== 'string' || typeof request.sourceText !== 'string'
        || !request.text.trim() || request.text.length > 1200 || !request.sourceText.trim() || request.sourceText.length > 3000
        || (request.memories !== undefined && !validMemories(request.memories))) return fallback;
    try {
      const payload = {requestId:request.requestId, text:request.text, sourceText:request.sourceText};
      if (request.memories !== undefined) payload.memories = request.memories;
      const result = await post('organiseReply', payload);
      if (result?.available !== true || result.requestId !== request.requestId || typeof result.text !== 'string') return fallback;
      const text = result.text.trim();
      if (!text || text.length > 700 || text.split(/\s+/).length > 100) return fallback;
      return {available:true, text};
    } catch (_) { return fallback; }
  }
  async function answerAsk(request) {
    const fallback = {available:false};
    if (!request || !validRequestId(request.requestId) || typeof request.text !== 'string'
        || !request.text.trim() || request.text.length > 1200 || !Array.isArray(request.history) || request.history.length > 6
        || !Array.from(request.history).every(message => message && ['user','assistant'].includes(message.role)
          && typeof message.text === 'string' && message.text.trim() && message.text.length <= 1800)
        || (request.memories !== undefined && !validMemories(request.memories))
        || (request.perspective !== undefined && !['balanced','untangle','step','explore','reflect'].includes(request.perspective))) return fallback;
    try {
      const payload = {requestId:request.requestId, text:request.text,
        history:request.history.map(({role,text}) => ({role,text}))};
      if (request.memories !== undefined) payload.memories = request.memories;
      if (request.perspective !== undefined) payload.perspective = request.perspective;
      const result = await post('answerAsk', payload);
      if (result?.available !== true || result.requestId !== request.requestId || typeof result.text !== 'string') return fallback;
      const text = result.text.trim();
      if (!text || text.length > 3000 || text.split(/\s+/).length > 500) return fallback;
      return {available:true, requestId:request.requestId, text};
    } catch (_) { return fallback; }
  }
  async function interpretAsk(request) {
    const fallback = {available:false};
    if(!request || !validRequestId(request.requestId) || typeof request.text !== 'string' || !request.text.trim()
       || request.text.length > 1200 || !Array.isArray(request.history) || request.history.length > 2
       || !request.history.every(value => typeof value === 'string' && value.length <= 240)) return fallback;
    try {
      const result = await post('interpretAsk', {requestId:request.requestId,text:request.text,history:request.history});
      if(result?.available !== true || result.requestId !== request.requestId
         || !['donkey','owl','fox','tortoise'].includes(result.animal)
         || !['clear','weak','none'].includes(result.confidence)
         || typeof result.guide !== 'string'
         || !['','anxiety','exhaustion','grief','loneliness','shame','anger','forgiveness',
           'decisions','faith_questions','prayer','starting','perseverance','comparison',
           'gratitude','helping','conflict','temptation','suffering'].includes(result.guide)) return fallback;
      return {available:true,animal:result.animal,guide:result.guide,confidence:result.confidence};
    } catch (_) { return fallback; }
  }
  async function extractMemory(request) {
    const fallback = {available:false, notes:[]};
    if (!request || !validRequestId(request.requestId) || typeof request.text !== 'string' || !request.text.trim() || request.text.length > 1200) return fallback;
    try {
      const result = await post('extractMemory', {requestId:request.requestId, text:request.text});
      if (result?.available !== true || result.requestId !== request.requestId || !Array.isArray(result.notes) || result.notes.length > 2
          || !Array.from(result.notes).every(note => typeof note === 'string' && note.trim() && note.length <= 180 && request.text.includes(note))) return fallback;
      return {available:true, notes:[...new Set(result.notes)]};
    } catch (_) { return fallback; }
  }
  Object.defineProperty(window, 'SteadyNative', {value:Object.freeze({
    platform:'ios',
    updateDisplayPreferences,
    exportBackup:text => post('exportBackup', {text:String(text)}),
    importBackup:() => post('importBackup'),
    haptic:() => post('haptic').catch(() => {}),
    focusAsk:(prompt,saveReflection=false,saveAction=false) => post('focusAsk', {prompt:String(prompt||'').slice(0,80),saveReflection:saveReflection===true,saveAction:saveAction===true}).catch(() => {}),
    setAskPrompt:(prompt,saveReflection=false,saveAction=false) => post('setAskPrompt', {prompt:String(prompt||'').slice(0,80),saveReflection:saveReflection===true,saveAction:saveAction===true}).catch(() => {}),
    speak:(text, key) => post('speak', {text:String(text).slice(0, 2000), key:String(key)}),
    stopSpeaking:() => post('stopSpeaking').catch(() => {}),
    localAIStatus,
    answerAsk,
    organiseReply,
    interpretAsk,
    extractMemory,
    // The registry crosses by value, so the wheel is a renderer of the same list
    // the router uses and cannot describe an animal differently from the one that
    // would actually be chosen. The wheel never decides the mode itself: it hands
    // the choice back to SteadyAnimalChosen, which owns it.
    showAnimalWheel: registry => post('showAnimalWheel', {registry}),
    flushStorage:() => persist()
  }), writable:false});
  // The Steady mark is native glass on the device, not a picture of glass. The
  // page keeps owning the header: it leaves the slot exactly the size it always
  // was, steps the picture aside for whichever mark is actually on screen, and
  // reports where the slot is. The native view then simply follows it, so the
  // header is untouched and still wraps, scrolls and reflows as it does today.
  // A browser never sets data-native-app, so there the generated SVG tile stays.
  let markSlot = null;
  const markFrame = () => {
    const visible = [...document.querySelectorAll('.steady-symbol')].find(el => {
      if (el.getClientRects().length === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1;
    }) || null;
    if (markSlot !== visible) {
      if (markSlot) markSlot.removeAttribute('data-native-mark');
      markSlot = visible;
      if (markSlot) markSlot.setAttribute('data-native-mark', 'true');
    }
    const rect = markSlot ? markSlot.getBoundingClientRect() : null;
    post('markFrame', {
      shown: rect !== null,
      x: rect ? rect.x : 0,
      y: rect ? rect.y : 0,
      size: rect ? Math.min(rect.width, rect.height) : 0,
      dark: document.documentElement.dataset.theme === 'dark'
    }).catch(() => {});
  };
  // Native navigation bar. The page still owns the history and the routing; it
  // only states whether there is currently somewhere to go back to, and the
  // native bar offers exactly that. The page's own Back control then steps
  // aside, so the same destination is never offered twice, and the rest of the
  // header is left alone.
  const reportNavigation = () => {
    // Decided from the page's own `hidden` state, never from whether the pill is
    // currently rendered. Hiding the pill is this bridge's own doing -- it sets
    // data-native-back so the page's Back stands aside for the native bar -- so
    // reading rendered visibility back would hide the pill, conclude there is
    // nowhere to go back to, drop the bar, and bring the pill straight back.
    // The two would fight each other on every screen.
    //
    // The tab the page is standing on travels with the same report, as does
    // whether onboarding (which has no tab) is showing, so the native tab bar
    // can reflect both without a second observer.
    const section = document.body?.dataset?.section || '';
    const settings = !!document.body?.classList?.contains('settings-open') && !document.getElementById('settings-page')?.hidden;
    const onboarding = !!document.body?.classList?.contains('onboarding-screen');
    //
    // Settings and the ordinary screens both leave their pill un-hidden, but only
    // one of them is on screen, so the visible one is named first. The fallbacks
    // keep the answer identical before this bridge has hidden anything.
    const offered = [...document.querySelectorAll('.settings-back, .screen-back')].filter(el => !el.hidden);
    const onScreen = el => !el.closest('[hidden]') && el.getClientRects().length > 0;
    const pill = offered.find(onScreen) || offered.find(el => !el.closest('[hidden]')) || offered[0] || null;
    const back = pill ? (pill.querySelector('span')?.textContent?.trim() || 'Back') : '';
    document.documentElement.dataset.nativeBack = back ? 'true' : 'false';
    if (back === lastBack && section === lastSection && onboarding === lastOnboarding && settings === lastSettings) return;
    lastBack = back;
    lastSection = section;
    lastOnboarding = onboarding;
    lastSettings = settings;
    post('navigation', {back, section, onboarding, settings}).catch(() => {});
  };
  let lastBack = null;
  let lastSection = null;
  let lastOnboarding = null;
  let lastSettings = null;
  let navigationScheduled = false;
  const scheduleNavigation = () => {
    if (navigationScheduled) return;
    navigationScheduled = true;
    requestAnimationFrame(() => { navigationScheduled = false; reportNavigation(); });
  };
  let markScheduled = false;
  const scheduleMark = () => {
    if (markScheduled) return;
    markScheduled = true;
    requestAnimationFrame(() => { markScheduled = false; markFrame(); });
  };
  const ready = () => {
    document.documentElement.dataset.nativeApp = 'ios';
    markFrame();
    reportNavigation();
    // The screen event fires on every route change, after the page has decided
    // whether there is a Back destination and what to call it.
    document.addEventListener('steady:screen', scheduleNavigation);
    document.addEventListener('steady:screen', scheduleMark);
    document.querySelector('.app-content')?.addEventListener('scroll', scheduleNavigation, {passive:true});
    document.querySelector('.app-content')?.addEventListener('scroll', scheduleMark, {passive:true});
    // Settings and Memory both reach their screen before the bridge finishes
    // attaching, and both show and hide their Back control afterwards. Watching
    // the attribute means the bar cannot be left behind by an early route, and
    // cannot stay up after the control goes.
    new MutationObserver(scheduleNavigation)
      .observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:['hidden']});
    window.addEventListener('load', scheduleNavigation);
    new ResizeObserver(scheduleMark).observe(document.documentElement);
    window.addEventListener('resize', scheduleMark);
    window.addEventListener('scroll', scheduleMark, {passive:true});
    window.addEventListener('load', scheduleMark);
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalViewport = viewport?.getAttribute('content') ?? null;
    const widgetToken = /(^|[,;\s])interactive-widget\s*=\s*[^,;\s]*/gi;
    const viewportContent = originalViewport || '';
    const chatViewport = /(^|[,;\s])interactive-widget\s*=/i.test(viewportContent)
      ? viewportContent.replace(widgetToken, '$1interactive-widget=overlays-content')
      : `${viewportContent}${viewportContent ? ', ' : ''}interactive-widget=overlays-content`;
    const appearance = () => {
      const chat = document.body.classList.contains('chat-screen');
      // Keep chat content beneath the keyboard on WebKit versions that support it.
      const content = chat ? chatViewport : originalViewport;
      if (viewport && viewport.getAttribute('content') !== content) {
        if (content === null) viewport.removeAttribute('content');
        else viewport.setAttribute('content', content);
      }
      post('appearance', {dark:document.documentElement.dataset.theme === 'dark', chat}).catch(() => {});
      // The mark's glass has to change with the theme, not just its position.
      scheduleMark();
      // Settings is not a route: it opens by turning a class on the body, so
      // this observer is what tells the bar that a screen with a Back control
      // has appeared. Without it the page's own Back stays and the bar never
      // rises, which is what left Settings and Memory with a stray header.
      scheduleNavigation();
    };
    new MutationObserver(appearance).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    new MutationObserver(appearance).observe(document.body, {attributes:true, attributeFilter:['class']});
    appearance();
    if (blocked) report(blocked); else persist().catch(() => {});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true}); else ready();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist().catch(() => {}); });
})();
