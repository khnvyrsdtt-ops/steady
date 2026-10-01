const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const guide = require('../public/guidance.js');

// Exercise the daily state and event handlers without a browser or user storage.
function openApp(saved, {unavailable = false, writeUnavailable = false, rawStored, storageBacking} = {}) {
  class Element {
    constructor() {
      this.children = [];
      this.dataset = {};
      this.events = {};
      this.attributes = {};
      this.firstChild = {};
      this.value = '';
      this.hidden = false;
      this.classes = new Set();
      this.classList = {
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name)
      };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, handler) { this.events[name] = handler; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    querySelector() { return new Element(); }
    focus(options) { this.focused = true; this.focusOptions = options; }
  }
  const elements = new Map();
  const element = selector => {
    if (['#practice-count', '#date-label', '#start-checkin'].includes(selector)) return null;
    if (selector.startsWith('#')) {
      const find = node => node.id === selector.slice(1) ? node : node.children.map(find).find(Boolean);
      for (const root of elements.values()) { const match = find(root); if (match) return match; }
    }
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  let clock = new Date(2026, 8, 23, 12).getTime(), id = 0;
  const storage = storageBacking || new Map(saved === undefined ? [] : [['steady.v1', JSON.stringify(saved)]]);
  if (rawStored !== undefined) storage.set('steady.v1', rawStored);
  const documentEvents = {};
  const document = {
    documentElement: new Element(),
    querySelector: element,
    querySelectorAll: () => [],
    createElement: () => new Element(),
    getElementById: id => element(`#${id}`),
    addEventListener(name, handler) { (documentEvents[name] ||= []).push(handler); }
  };
  const windowEvents = {};
  const sandbox = {
    document, SteadyGuide: guide, SteadyFeelings: require('../public/scripture-feelings-model.js'), SteadyIcons: require('../public/icons.js'),
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [clock])); }
      static now() { return clock; }
    },
    crypto: {randomUUID: () => `id-${++id}`},
    localStorage: {
      getItem(key) { if (unavailable) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (unavailable || writeUnavailable) throw new Error('Storage blocked'); storage.set(key, value); }
    },
    window: {matchMedia: () => ({matches: false}), addEventListener(name, handler) { windowEvents[name] = handler; }},
    location: {hash: '#today'},
    getComputedStyle: () => ({getPropertyValue: () => '#f4f8fb'}),
    setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    renderScreen() {}, navigateScreen() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../public/app.js'), 'utf8') + `
    globalThis.app = {get day(){return day;}, get state(){return state;}, checkDay, save, updateProgress, isDateKey};
  `, sandbox);
  return {app: sandbox.app, element, storage,
    completion: () => element('#reflection').children.find(child => child.className === 'reflection-completion'),
    emit: name => windowEvents[name]?.(),
    screen: route => (documentEvents['steady:screen'] || []).forEach(handler => handler({detail: route})),
    nextDay: () => { clock = new Date(2026, 8, 24, 12).getTime(); sandbox.app.checkDay(); }};
}

test('native durability failures stay visible until confirmed recovery, without discarding session edits',()=>{
  const {app,element,emit,storage}=openApp({days:{'2026-09-23':{mind:'Keep me'}}});
  emit('steady:native-storage-error');
  assert.equal(element('#storage-status').hidden,false);
  app.day.reflection='A later edit';
  assert.equal(app.save(),false);
  assert.equal(element('#storage-status').hidden,false);
  assert.equal(element('#reflection-status').textContent,'Not safely saved');
  assert.equal(JSON.parse(storage.get('steady.v1')).days['2026-09-23'].reflection,'A later edit');
  emit('steady:native-storage-saved');
  assert.equal(element('#storage-status').hidden,true);
  assert.equal(app.save(),true);
});

test('a native success does not hide a browser-store conflict or unreadable record',()=>{
  const current=openApp({days:{}});current.emit('steady:native-storage-error');
  current.storage.set('steady.v1',JSON.stringify({days:{},other:'newer'}));
  current.emit('steady:native-storage-saved');
  assert.equal(current.element('#storage-status').hidden,false);assert.equal(current.app.save(),false);
  const broken=openApp(undefined,{rawStored:'corrupt'});broken.emit('steady:native-storage-error');broken.emit('steady:native-storage-saved');
  assert.equal(broken.element('#storage-status').hidden,false);assert.equal(broken.app.save(),false);
});

test('malformed saved collections do not prevent opening and valid private entries survive', () => {
  const {app, element} = openApp({profile: {areas: 'work'}, days: {
    '2026-09-22': {tasks: [null], actionLog: 'bad', outcomes: [null]},
    '2026-09-23': {need: 'toString', mind: 'My private note', reflection: 'A good day', tasks: [null, {id: 'same', text: 'First'}, {id: 'same', text: 'Second'}], actionLog: [null, {id: 'grow-build'}], completedNeeds: ['grow', 'grow'], outcomes: [null], reflections: 'bad', practice: []}
  }});
  assert.equal(app.day.mind, 'My private note');
  assert.equal(app.day.reflection, 'A good day');
  assert.equal(app.day.need, '');
  assert.equal(new Set(app.day.tasks.map(task => task.id)).size, 2);
  assert.equal(app.day.actionLog[0].title, 'Build on what is working.');
  assert.equal(app.day.completedNeeds.length, 0);
  assert.equal(app.state.profile.areas.length, 0);
  assert.equal(guide.progress(app.state.days).actions, 1);
  assert.equal(app.save(), true);
});

test('an invalid current day is replaced while older history is preserved', () => {
  const {app} = openApp({days: {'2026-09-22': {reflection: 'Keep this'}, '2026-09-23': []}});
  assert.equal(app.day.tasks.length, 0);
  assert.equal(app.state.days['2026-09-22'].reflection, 'Keep this');
});

test('a fresh day resets daily conditions and completions while retaining goals and yesterday', () => {
  const {app, nextDay, storage, element} = openApp({profile: {goal: 'learning'}, days: {'2026-09-23': {
    need: 'progress', mind: 'Yesterday', tasks: [{id: 'done', text: 'Read', complete: true}],
    context: {energy: 'low'}, closed: true, actionLog: [{id: 'progress-start', title: 'Start small'}]
  }}});
  nextDay();
  assert.equal(app.day.need, '');
  assert.equal(app.day.actionLog.length, 0);
  assert.equal(app.day.tasks.filter(task => task.complete).length, 0);
  assert.equal(app.day.context.energy, undefined);
  assert.equal(app.state.profile.goal, 'learning');
  assert.equal(app.state.days['2026-09-23'].mind, 'Yesterday');
  assert.equal(element('#completed-actions').children.length, 0);
  const persisted = JSON.parse(storage.get('steady.v1'));
  assert.ok(persisted.days['2026-09-24']);
  assert.equal(persisted.days['2026-09-23'].actionLog.length, 1);
});

test('blocked storage leaves a persistent notice and working session edits', () => {
  const {app, element} = openApp(undefined, {unavailable: true});
  assert.equal(element('#storage-status').hidden, false);
  element('#mind-note').events.input({target: {value: 'Keep in this session'}});
  assert.equal(app.day.mind, 'Keep in this session');
  assert.equal(element('#mind-status').textContent, 'Not saved');
  assert.equal(element('#storage-status').hidden, false);
});

test('daily controls and saved action totals work without retired dashboard elements', () => {
  const {app, element} = openApp({days: {'2026-09-23': {
    tasks: [{id: 'own-step', text: 'My own action', complete: true}], completedNeeds: ['calm']
  }}});
  for (const selector of ['#practice-count', '#date-label', '#start-checkin']) assert.equal(element(selector), null);
  assert.equal(element('#task-count').textContent, '1 done');
  assert.equal(element('#completed-actions').children.length, 1);
  assert.equal(guide.progress(app.state.days).actions, 2);
  assert.equal(app.day.completedNeeds[0], 'calm');
});

test('removing a step preserves focus and Undo restores its position and completion across reload', () => {
  const tasks = [{id:'first',text:'First step',complete:false}, {id:'middle',text:'Keep my completion',complete:true}, {id:'last',text:'Last step',complete:false}];
  const {app,element,storage}=openApp({days:{'2026-09-23':{tasks}}});
  element('#tasks').children[1].children[2].events.click();
  assert.deepEqual(Array.from(app.day.tasks,t=>t.id),['first','last']);
  assert.equal(element('#task-last').focused,true);
  assert.equal(guide.progress(app.state.days).actions,0);
  element('#undo-task-removal').events.click();
  assert.deepEqual(Array.from(app.day.tasks,t=>({id:t.id,text:t.text,complete:t.complete})),tasks);
  assert.equal(element('#task-middle').focused,true);
  assert.equal(element('#tasks').children.some(child=>child.className==='task-removal'),false);
  const reopened=openApp(JSON.parse(storage.get('steady.v1')));
  assert.equal(reopened.app.day.tasks[1].complete,true);
  assert.equal(guide.progress(reopened.app.state.days).actions,1);
});

test('deleting the final step gives Undo focus and the latest removal can be recovered', () => {
  const {app,element}=openApp({days:{'2026-09-23':{tasks:[{id:'one',text:'Only step',complete:false}]}}});
  element('#tasks').children[0].children[2].events.click();
  const undo=element('#undo-task-removal');
  assert.equal(undo.focused,true);
  assert.equal(undo.attributes['aria-label'],'Undo removing step: Only step');
  undo.events.click();
  assert.equal(app.day.tasks.length,1);
  assert.equal(element('#task-one').focused,true);
});

test('a stale Undo cannot put yesterday’s removed step into a fresh day', () => {
  const {app,element,nextDay,storage}=openApp({days:{'2026-09-23':{tasks:[{id:'old',text:'Yesterday',complete:false}]}}});
  element('#tasks').children[0].children[2].events.click();
  const staleUndo=element('#undo-task-removal');
  nextDay(); staleUndo.events.click();
  assert.equal(app.day.tasks.length,0);
  assert.equal(app.state.days['2026-09-23'].tasks.length,0);
  assert.equal(element('#tasks').children.some(child=>child.className==='task-removal'),false);
  assert.equal(JSON.parse(storage.get('steady.v1')).days['2026-09-24'].tasks.length,0);
});

test('invalid review schedules cannot permanently hide a practice card', () => {
  const {app} = openApp({learning: {
    'memory-chunk': {due: 'not a date'},
    'maths-basic': {due: '2026-09-24', interval: 1, successes: '2'}
  }, days: {}});
  assert.equal(app.state.learning['memory-chunk'], undefined);
  assert.equal(app.state.learning['maths-basic'].successes, 2);
  assert.equal(app.state.learning['maths-basic'].due, '2026-09-24');
});

test('Scripture feedback for different life areas survives reload without losing adverse feedback',()=>{
  const outcomes=[{id:'scripture-grace-pause',rating:'worse',context:{goal:'relationships'}},{id:'scripture-grace-pause',rating:'useful',context:{goal:'work'}},{id:'scripture-grace-pause',rating:'neutral',context:{goal:'work'}}];
  const {app}=openApp({days:{'2026-09-23':{outcomes}}});
  assert.equal(app.day.outcomes.length,2);
  assert.equal(app.day.outcomes[0].rating,'worse');assert.equal(app.day.outcomes[1].rating,'neutral');
  app.save();const reloaded=openApp(JSON.parse(JSON.stringify(app.state))).app;
  assert.equal(reloaded.day.outcomes.length,2);assert.equal(reloaded.day.outcomes[0].context.goal,'relationships');
});

test('malformed saved JSON stays untouched while new edits remain usable in the open page', () => {
  const original = '{"days":{"2026-09-22":{"reflection":"Keep my original data"}';
  const {app, element, storage} = openApp(undefined, {rawStored: original});
  element('#mind-note').events.input({target: {value: 'A note for this visit'}});
  assert.equal(app.day.mind, 'A note for this visit');
  assert.equal(app.save(), false);
  assert.equal(storage.get('steady.v1'), original, 'startup and later saves must not overwrite unreadable entries');
  assert.match(element('#storage-status').textContent, /Existing storage has not been changed/);
});

test('an unreadable saved root or days collection is protected from replacement', () => {
  for (const original of ['[]', '"my old notes"', '{"days":[]}']) {
    const {app, storage} = openApp(undefined, {rawStored: original});
    assert.equal(app.save(), false);
    assert.equal(storage.get('steady.v1'), original);
  }
});

test('unexpected object values in saved preferences and learning do not prevent startup', () => {
  const uncoercible = {toString: null};
  const plan = Object.fromEntries(['id', 'signature', 'title', 'copy', 'setup', 'approach', 'reason', 'assumptions', 'perspective'].map(key => [key, 'saved']));
  plan.context = {}; plan.evidence = uncoercible;
  const {app} = openApp({
    profile: {areas: [uncoercible, 'work', null, 'work']},
    learning: {memory: {due: '2026-09-24', successes: uncoercible}},
    days: {'2026-09-23': {mind: 'A valid note', plan}}
  });
  assert.equal(app.day.mind, 'A valid note');
  assert.equal(app.day.plan, undefined);
  assert.deepEqual(Array.from(app.state.profile.areas), ['work']);
  assert.equal(app.state.learning.memory.successes, 0);
});

test('impossible calendar dates cannot become practice due dates or valid history dates', () => {
  const {app} = openApp({learning: {
    invalid: {due: '2026-02-31'},
    notLeap: {due: '2026-02-29'},
    leap: {due: '2028-02-29'},
    valid: {due: '2026-09-24'}
  }, days: {}});
  assert.equal(app.state.learning.invalid, undefined);
  assert.equal(app.state.learning.notLeap, undefined);
  assert.equal(app.state.learning.leap.due, '2028-02-29');
  for (const invalid of ['2026-02-31', '2026-13-01', '2026-00-01', '2026-09-00', {}, null]) assert.equal(app.isDateKey(invalid), false);
  assert.equal(app.isDateKey('2028-02-29'), true);
});

test('completions for distinct goals survive reload without duplicating legacy or repeated records', () => {
  const {app, storage} = openApp({days: {'2026-09-23': {actionLog: [
    {id: 'grow-build', title: 'Old completion'},
    {id: 'grow-build', goal: 'work', title: 'Start work'},
    {id: 'grow-build', goal: 'relationships', title: 'Send a thank-you'},
    {id: 'grow-build', goal: 'work', title: 'Duplicate'},
    {id: 'rest-stop', title: 'A separate legacy step'}
  ]}}});
  assert.equal(app.day.actionLog.length, 3);
  assert.deepEqual(Array.from(app.day.actionLog, action => action.title), ['Start work', 'Send a thank-you', 'A separate legacy step']);
  app.save();
  const reloaded = openApp(JSON.parse(storage.get('steady.v1'))).app;
  assert.equal(reloaded.day.actionLog.length, 3);
});

test('distinct action variants and legacy base completions survive normalisation and reload',()=>{
  const {app,storage}=openApp({days:{'2026-09-23':{actionLog:[
    {id:'progress-start',title:'Earlier base action'},
    {id:'progress-start',goal:'work',variant:'hesitation',title:'An unpolished first attempt'},
    {id:'progress-start',goal:'work',variant:'hesitation',title:'Duplicate attempt'},
    {id:'progress-start',goal:'work',variant:'low',title:'One low-energy piece'},
    {id:'rest-stop',variant:{bad:true},title:'An older malformed variant'},
    {id:'rest-stop',variant:'base',title:'Duplicate base rest'}
  ]}}});
  assert.deepEqual(Array.from(app.day.actionLog,entry=>entry.title),['Earlier base action','An unpolished first attempt','One low-energy piece','An older malformed variant']);
  assert.equal(app.day.actionLog.at(-1).variant,undefined,'an invalid variant becomes the legacy base identity');
  app.save();const reopened=openApp(JSON.parse(storage.get('steady.v1'))).app;
  assert.deepEqual(JSON.parse(JSON.stringify(reopened.day.actionLog)),JSON.parse(JSON.stringify(app.day.actionLog)));
});

test('a variant completion does not erase a legacy need completion and variant ratings stay separate',()=>{
  const {app,storage}=openApp({days:{'2026-09-23':{
    completedNeeds:['progress'],actionLog:[{id:'progress-start',goal:'work',variant:'low',title:'A different action'}],
    outcomes:[
      {id:'progress-start',context:{goal:'work'},rating:'useful'},
      {id:'progress-start',variant:'size',context:{goal:'work'},rating:'not-useful'},
      {id:'progress-start',variant:'hesitation',context:{goal:'work'},rating:'worse'},
      {id:'progress-start',variant:'size',context:{goal:'work'},rating:'neutral'}
    ]
  }}});
  assert.deepEqual(Array.from(app.day.completedNeeds),['progress']);
  assert.deepEqual(Array.from(app.day.outcomes,row=>[row.variant||'base',row.rating]),[['base','useful'],['hesitation','worse'],['size','neutral']]);
  app.save();const reopened=openApp(JSON.parse(storage.get('steady.v1'))).app;
  assert.deepEqual(Array.from(reopened.day.completedNeeds),['progress']);assert.equal(reopened.day.outcomes.length,3);
});

test('a saved blocker remains in yesterday’s record and resets with the real day rollover',()=>{
  const {app,nextDay}=openApp({profile:{goal:'work'},days:{'2026-09-23':{need:'progress',context:{blocker:'interruptions',time:'5'},mind:'Keep this note'}}});
  nextDay();
  assert.equal(app.day.context.blocker,undefined);assert.equal(app.state.profile.blocker,undefined);
  assert.equal(app.state.days['2026-09-23'].context.blocker,'interruptions');
  assert.equal(app.state.days['2026-09-23'].mind,'Keep this note');
});

test('finishing with unavailable writes reflects session completion without claiming it was saved', () => {
  const {app, element, completion} = openApp({days: {}}, {writeUnavailable: true});
  element('#finish-day').events.click();
  assert.equal(app.day.closed, true);
  assert.equal(element('#finish-day').textContent, 'Finished for today ✓');
  assert.equal(element('#reflection-status').textContent, 'Finished for this visit only');
  assert.equal(element('#storage-status').hidden, false);
  assert.equal(completion().hidden, false);
  assert.match(completion().children[1].textContent, /Finished for this visit only/);
});

test('finishing shows one quiet stopping point while retaining the reflection and all previous entries', () => {
  const {app, element, storage, completion} = openApp({days: {'2026-09-23': {
    reflection: 'I was honest about what felt heavy.', reflections: ['I need rest'], mind: 'An earlier note',
    tasks: [{id: 'done', text: 'A completed step', complete: true}]
  }}});
  const before = JSON.parse(JSON.stringify(app.day));
  assert.equal(completion().hidden, true);
  element('#finish-day').events.click();
  assert.equal(element('#reflection').classes.has('reflection-finished'), true);
  assert.equal(completion().hidden, false);
  assert.equal(completion().children[0].focused, true, 'focus leaves the now-hidden finish button');
  assert.equal(completion().children[0].tabIndex, -1);
  assert.equal(completion().children[1].attributes.role, 'status');
  assert.equal(completion().children[1].textContent, 'Today is saved. There is nothing else to complete.');
  assert.equal(completion().children[2].textContent, 'Done for now');
  assert.equal(completion().children[2].href, '#home');
  const saved = JSON.parse(storage.get('steady.v1')).days['2026-09-23'];
  assert.equal(saved.closed, true);
  for (const key of ['reflection', 'reflections', 'mind', 'tasks']) assert.deepEqual(saved[key], before[key]);
});

test('editing a finished reflection restores its existing controls without reopening or clearing the day', () => {
  const {app, element, storage, completion} = openApp({days: {'2026-09-23': {
    closed: true, reflection: 'Keep these words.', reflections: ['I showed up']
  }}});
  const before = storage.get('steady.v1');
  assert.equal(completion().hidden, false);
  completion().children[3].events.click();
  assert.equal(completion().hidden, true);
  assert.equal(element('#reflection').classes.has('reflection-finished'), false);
  assert.equal(element('#reflection h3').focused, true);
  assert.equal(element('#daily-reflection').value, 'Keep these words.');
  assert.equal(element('#finish-day').textContent, 'Done editing');
  assert.equal(app.day.closed, true);
  assert.equal(storage.get('steady.v1'), before, 'opening the editor does not change stored history');
  element('#daily-reflection').events.input({target: {value: 'Keep these words. An extra thought.'}});
  element('#finish-day').events.click();
  assert.equal(completion().hidden, false);
  assert.equal(app.day.reflection, 'Keep these words. An extra thought.');
  assert.deepEqual(Array.from(app.day.reflections), ['I showed up']);
  assert.equal(app.day.closed, true);
});

test('a finished day stays calm when revisited and the next day starts with fresh reflection controls', () => {
  const {app, element, completion, screen, nextDay} = openApp({days: {'2026-09-23': {
    closed: true, reflection: 'Yesterday stays safe.'
  }}});
  completion().children[3].events.click();
  screen('home');screen('review');
  assert.equal(completion().hidden, false, 'leaving Reflect closes only the temporary editor');
  completion().children[3].events.click();
  nextDay();
  assert.equal(app.day.closed, false);
  assert.equal(completion().hidden, true);
  assert.equal(element('#reflection').classes.has('reflection-finished'), false);
  assert.equal(element('#finish-day').textContent, 'Finish for today');
  assert.equal(element('#daily-reflection').value, '');
  assert.equal(app.state.days['2026-09-23'].reflection, 'Yesterday stays safe.');
  assert.equal(app.state.days['2026-09-23'].closed, true);
});

test('a later native durability failure and recovery update the visible finished acknowledgement', () => {
  const {element, completion, emit} = openApp({days: {}});
  element('#finish-day').events.click();
  emit('steady:native-storage-error');
  assert.match(completion().children[1].textContent, /not safely saved/);
  assert.equal(element('#storage-status').hidden, false);
  emit('steady:native-storage-saved');
  assert.equal(completion().children[1].textContent, 'Today is saved. There is nothing else to complete.');
  assert.equal(completion().hidden, false);
});

test('first use and a day created at midnight start without compulsory actions', () => {
  const {app, nextDay} = openApp();
  assert.equal(app.day.tasks.length, 0);
  assert.equal(app.day.tasksInitialized, true);
  nextDay();
  assert.equal(app.day.tasks.length, 0);
  assert.equal(app.day.tasksInitialized, true);
});

test('entered task text is rendered literally rather than interpreted as markup', () => {
  const {app, element} = openApp();
  const text = '<img src=x onerror="alert(1)">';
  element('#task-input').value = text;
  element('#task-form').events.submit({preventDefault() {}});
  assert.equal(app.day.tasks.at(-1).text, text);
  const label = element('#tasks').children.at(-1).children[1];
  assert.equal(label.textContent, text);
  assert.equal(label.innerHTML, undefined);
});

test('a stale tab preserves both its session edits and newer stored entries instead of overwriting them', () => {
  const storageBacking = new Map([['steady.v1', JSON.stringify({days: {'2026-09-23': {mind: 'Original'}}})]]);
  const first = openApp(undefined, {storageBacking});
  const second = openApp(undefined, {storageBacking});
  first.element('#mind-note').events.input({target: {value: 'Saved from the first tab'}});
  const latest = storageBacking.get('steady.v1');

  second.element('#mind-note').events.input({target: {value: 'Unsaved second-tab note'}});
  assert.equal(second.app.day.mind, 'Unsaved second-tab note');
  assert.equal(second.app.save(), false);
  assert.equal(storageBacking.get('steady.v1'), latest);
  assert.equal(second.element('#storage-status').hidden, false);
  assert.match(second.element('#storage-status').textContent, /changed in another tab/);
  assert.match(second.element('#storage-status').textContent, /new edits are not saved/);

  const reopened = openApp(undefined, {storageBacking});
  assert.equal(reopened.app.day.mind, 'Saved from the first tab');
  reopened.element('#daily-reflection').events.input({target: {value: 'A later reflection'}});
  assert.equal(reopened.app.save(), true);
  const persisted = JSON.parse(storageBacking.get('steady.v1'));
  assert.equal(persisted.days['2026-09-23'].mind, 'Saved from the first tab');
  assert.equal(persisted.days['2026-09-23'].reflection, 'A later reflection');
  assert.equal(second.app.day.mind, 'Unsaved second-tab note', 'recovery in a fresh page must not mutate the original open session');
});

test('removing stored entries from another tab cannot be silently undone by a stale page', () => {
  const {app, storage, element} = openApp({days: {'2026-09-23': {mind: 'Old private note'}}});
  storage.delete('steady.v1');
  assert.equal(app.save(), false);
  assert.equal(storage.has('steady.v1'), false);
  assert.equal(app.day.mind, 'Old private note');
  assert.match(element('#storage-status').textContent, /changed in another tab/);
});

test('feelings memory and its selected request survive save and reload, while a new day starts fresh', () => {
  const history = [{id:'feeling-1', text:'I feel lonely', key:'connection', at:'2026-09-22T12:00:00.000Z'}];
  const first = openApp({scriptureRequests:history, days:{'2026-09-23':{feelingsDraft:'A question to finish', scriptureRequest:'feeling-1'}}});
  assert.equal(first.app.save(), true);
  const reopened = openApp(undefined, {storageBacking:first.storage});
  assert.equal(reopened.app.day.feelingsDraft, 'A question to finish');
  assert.equal(reopened.app.day.scriptureRequest, 'feeling-1');
  assert.deepEqual(JSON.parse(JSON.stringify(reopened.app.state.scriptureRequests)), history);
  reopened.nextDay();
  assert.equal(reopened.app.day.feelingsDraft, '');
  assert.equal(reopened.app.day.scriptureRequest, undefined);
  assert.equal(reopened.app.state.days['2026-09-23'].scriptureRequest, 'feeling-1');
  const persisted = JSON.parse(first.storage.get('steady.v1'));
  assert.deepEqual(persisted.scriptureRequests, history);
  assert.equal(persisted.days['2026-09-23'].feelingsDraft, 'A question to finish');
});

test('malformed feelings storage is sanitized without discarding valid entries or older-day drafts', () => {
  const first = openApp({scriptureRequests:[null, {id:'invalid',text:'Old',key:'constructor',at:'today'}, {id:'valid',text:'I feel sad',key:'grief',at:'2026-09-22T12:00:00Z'}], days:{
    '2026-09-22':{feelingsDraft:'x'.repeat(1300),scriptureRequest:{}},
    '2026-09-23':{feelingsDraft:{text:'invalid'},scriptureRequest:['valid']}
  }});
  assert.equal(first.app.day.feelingsDraft, '');
  assert.equal(first.app.day.scriptureRequest, undefined);
  assert.equal(first.app.state.days['2026-09-22'].feelingsDraft.length, 1200);
  assert.equal(first.app.state.days['2026-09-22'].scriptureRequest, undefined);
  assert.equal(first.app.state.scriptureRequests.length, 1);
  assert.equal(first.app.state.scriptureRequests[0].id, 'valid');
  assert.equal(first.app.state.scriptureRequests[0].at, '2026-09-22T12:00:00.000Z');
  first.app.save();
  const reopened = openApp(undefined, {storageBacking:first.storage});
  assert.equal(reopened.app.state.scriptureRequests[0].text, 'I feel sad');
  assert.equal(reopened.app.state.days['2026-09-22'].feelingsDraft.length, 1200);
});
