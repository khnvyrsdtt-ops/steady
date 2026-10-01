'use strict';
const $ = selector => document.querySelector(selector);
const storageKey = 'steady.v1';
// Local task identifiers also work on a phone's HTTP Wi-Fi preview.
// getRandomValues is available there even when randomUUID requires HTTPS.
const taskId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};
const scrollBehavior = () => 'instant';
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const isDateKey = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && `${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` === value;
};
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
let today = dayKey();
let state;
let storageAvailable = true;
let storageReadFailed = false;
let nativeStorageError = '';
let storedSnapshot;
try {
  storedSnapshot = localStorage.getItem(storageKey);
  state = JSON.parse(storedSnapshot);
  if (state !== null && (!isRecord(state) || (state.days !== undefined && !isRecord(state.days)))) throw new Error('Unreadable saved data');
} catch { storageAvailable = false; storageReadFailed = true; }
if (!state || typeof state !== 'object' || Array.isArray(state)) state = { days: {} };
if (!state.days || typeof state.days !== 'object' || Array.isArray(state.days)) state.days = {};
const newDay = () => ({ mood: '', mind: '', intention: '', reflection: '', reflections: [], reflectionSaved: false, tasksInitialized: true, tasks: [] });
if (!isRecord(state.days[today])) {
  state.days[today] = newDay();
  if (!state.migrated) {
    try {
      const oldTaskData = localStorage.getItem('steadyTasks');
      const oldTasks = JSON.parse(oldTaskData || '[]');
      if (oldTaskData !== null && Array.isArray(oldTasks)) state.days[today].tasks = oldTasks.filter(t => t && typeof t.text === 'string').map(t => ({ id: taskId(), text:t.text, complete:!!t.complete }));
      state.days[today].reflection = localStorage.getItem('steadyReflection') || '';
      state.days[today].reflectionSaved = !!state.days[today].reflection;
    } catch { /* Keep the new day usable if older data cannot be read. */ }
    state.migrated = true;
  }
}
function prepareDay(entry) {
  if (!isRecord(entry)) entry = newDay();
  const ids = new Set();
  entry.tasks = (Array.isArray(entry.tasks) ? entry.tasks : []).filter(t => isRecord(t) && typeof t.text === 'string').map(task => {
    if (typeof task.id !== 'string' || !task.id || ids.has(task.id)) task.id = taskId();
    ids.add(task.id);
    task.complete = task.complete === true;
    return task;
  });
  entry.reflections = [...new Set(Array.isArray(entry.reflections) ? entry.reflections.filter(v => typeof v === 'string') : [])];
  const validNeed = value => SteadyGuide.catalog.some(item => item.need === value);
  if (!validNeed(entry.need)) entry.need = '';
  entry.completedNeeds = [...new Set(Array.isArray(entry.completedNeeds) ? entry.completedNeeds.filter(validNeed) : [])];
  if (entry.recommendationDone === true && entry.need && !entry.completedNeeds.includes(entry.need)) entry.completedNeeds.push(entry.need);
  for (const key of ['mind', 'reflection', 'intention']) if (typeof entry[key] !== 'string') entry[key] = '';
  entry.feelingsDraft = typeof entry.feelingsDraft === 'string' ? entry.feelingsDraft.slice(0,1200) : '';
  if (typeof entry.scriptureRequest !== 'string' || entry.scriptureRequest.length > 160) delete entry.scriptureRequest;
  entry.actionLog = (Array.isArray(entry.actionLog) ? entry.actionLog : []).filter(action => isRecord(action) && typeof action.id === 'string' && action.id).map(action => {
    const cleaned = {...action, title: typeof action.title === 'string' ? action.title : SteadyGuide.catalog.find(item => item.id === action.id)?.title || 'Completed step'};
    if (typeof cleaned.goal !== 'string' || !(Object.hasOwn(SteadyGuide.choices.goal, cleaned.goal) || cleaned.goal === 'rest')) delete cleaned.goal;
    if (typeof cleaned.variant !== 'string' || !/^[a-z]+(?:-[a-z]+)*$/.test(cleaned.variant)) delete cleaned.variant;
    return cleaned;
  });
  entry.actionLog = entry.actionLog.filter((action, index, actions) =>
    actions.findIndex(item => item.id === action.id && item.goal === action.goal && (item.variant||'base') === (action.variant||'base')) === index &&
    (action.goal !== undefined || !actions.some(item => item.id === action.id && item.goal !== undefined && (item.variant||'base') === (action.variant||'base'))));
  entry.completedNeeds = entry.completedNeeds.filter(need => !entry.actionLog.some(action => (action.variant||'base') === 'base' && SteadyGuide.catalog.some(item => item.id === action.id && item.need === need)));
  entry.outcomes = (Array.isArray(entry.outcomes) ? entry.outcomes : []).filter(outcome => isRecord(outcome) && typeof outcome.id === 'string' && ['useful', 'neutral', 'not-useful', 'worse'].includes(outcome.rating));
  entry.outcomes = entry.outcomes.filter((outcome, index, outcomes) => !outcomes.slice(index + 1).some(later => SteadyGuide.feedbackKey(later) === SteadyGuide.feedbackKey(outcome)));
  if (!isRecord(entry.practice)) entry.practice = {};
  for (const [id, attempt] of Object.entries(entry.practice)) if (!isRecord(attempt)) delete entry.practice[id];
  if (!isRecord(entry.context)) entry.context = {};
  // Remembers that we already asked about this part of the day today, so the
  // question is never repeated on every visit. It records the question, not an answer.
  entry.rhythmNote = typeof entry.rhythmNote === 'string' && typeof SteadyRhythm !== 'undefined' && SteadyRhythm.partIds.includes(entry.rhythmNote) ? entry.rhythmNote : '';
  // True only while the clock is the one proposing the starting need.
  entry.needFromClock = entry.needFromClock === true;
  entry.closed = entry.closed === true;
  if (!isRecord(entry.plan) || !isRecord(entry.plan.context) || !['id', 'signature', 'title', 'copy', 'setup', 'approach', 'reason', 'assumptions', 'perspective', 'evidence'].every(key => typeof entry.plan[key] === 'string') || !Object.hasOwn(SteadyGuide.evidence, entry.plan.evidence)) delete entry.plan;
  return entry;
}
// Clean all saved days, because progress and future suggestions read history too.
for (const [date, entry] of Object.entries(state.days)) {
  if (isRecord(entry)) state.days[date] = prepareDay(entry);
}
let day = state.days[today] = prepareDay(state.days[today]);
day.tasksInitialized = true;
if (!isRecord(state.profile)) state.profile = {};
if (typeof SteadyFeelings !== 'undefined') state.scriptureRequests = SteadyFeelings.normalizeEntries(state.scriptureRequests);
if (typeof SteadyBurdenMemory !== 'undefined' && state.burdenMemory !== undefined) state.burdenMemory = SteadyBurdenMemory.normalize(state.burdenMemory);
state.profile.areas = Array.isArray(state.profile.areas) ? [...new Set(state.profile.areas.filter(key => typeof key === 'string' && Object.hasOwn(SteadyGuide.choices.goal, key)))].slice(0, 3) : [];
// Parts of the day this person has said suit them. This is only ever added to
// from an explicit answer, so Steady stops treating those hours as unusual and
// never treats them as a habit to correct.
state.profile.rhythmParts = typeof SteadyRhythm !== 'undefined' && Array.isArray(state.profile.rhythmParts)
  ? [...new Set(state.profile.rhythmParts.filter(id => typeof id === 'string' && SteadyRhythm.partIds.includes(id)))]
  : [];
if (!isRecord(state.learning)) state.learning = {};
for (const [id, memory] of Object.entries(state.learning)) {
  if (!isRecord(memory) || !isDateKey(memory.due)) {
    delete state.learning[id];
    continue;
  }
  const successes = ['number', 'string'].includes(typeof memory.successes) ? Number(memory.successes) : NaN;
  memory.successes = Number.isFinite(successes) ? Math.max(0, Math.floor(successes)) : 0;
}
let toastTimer;
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const label = dark ? 'Use light theme' : 'Use dark theme';
  $('#theme-toggle').setAttribute('aria-label', label);
  $('#theme-toggle').title = label;
  $('#theme-toggle').innerHTML = SteadyIcons.svg(dark?'sun':'moon');
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}
// The app follows the device's Light or Dark appearance until the person picks
// a theme for themselves. A choice is stored and then always wins, so nobody has
// their own setting overridden; with nothing stored, the system decides, which
// is what every other app on the phone does.
let storedTheme = null;
try { storedTheme = localStorage.getItem('steady.theme'); } catch {}
const systemTheme = () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
let initialTheme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : systemTheme();
applyTheme(initialTheme);
if (window.matchMedia) {
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const followSystem = event => { if (storedTheme) return; applyTheme(event.matches ? 'dark' : 'light'); };
  if (scheme.addEventListener) scheme.addEventListener('change', followSystem);
  else if (scheme.addListener) scheme.addListener(followSystem);
}
$('#theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  storedTheme = theme;
  try { localStorage.setItem('steady.theme', theme); } catch { toast('Theme changed for this visit. Browser storage is unavailable.'); }
});
const recommendations = {
  calm: { label: 'YOU NEED CALM', title: 'Take three slow breaths.', copy: 'Drop your shoulders. Inhale slowly, then let the exhale be a little longer.' },
  clarity: { label: 'YOU NEED CLARITY', title: 'Name the one thing that matters.', copy: 'Ignore the whole list. Choose the single next useful thing.' },
  energy: { label: 'YOU NEED ENERGY', title: 'Move for two minutes.', copy: 'Stand up, stretch, or walk. A small change in state is enough.' },
  connection: { label: 'YOU NEED CONNECTION', title: 'Reach out to one person.', copy: 'Send a simple hello, or sit near someone you trust.' },
  progress: { label: 'YOU NEED PROGRESS', title: 'Do the first two minutes.', copy: 'Open the thing. Start badly. You only need to create momentum.' },
  rest: { label: 'YOU NEED REST', title: 'Put everything down for five minutes.', copy: 'No fixing or catching up. Be still and let yourself pause.' }
};
// Use the same drawn icon family throughout the need picker.
document.querySelectorAll('[data-need]').forEach(button => {
  const icon = button.querySelector('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = SteadyIcons.svg(button.dataset.need);
});
for(const [selector,name]of [['.settings-link','settings'],['#mind .section-icon','clarity'],['#action .section-icon','showedUp'],['#reflection .section-icon','review']])$(selector).innerHTML=SteadyIcons.svg(name);
$('#task-form>span').innerHTML=SteadyIcons.svg('plus');
$('#task-form>span').setAttribute('aria-hidden','true');
$('#task-form button').innerHTML=SteadyIcons.svg('arrowRight');
for(const [value,name,label]of [['I showed up','showedUp','I showed up'],['I noticed something good','noticedGood','I noticed good'],['I learned something','learned','I learned'],['I need rest','rest','I need rest']]){
  const button=$(`[data-reflection="${value}"]`);
  button.innerHTML=SteadyIcons.svg(name)+`<span>${label}</span>`;
  button.setAttribute('aria-label',label);
}
const duration = { calm: '30 seconds', clarity: '1 minute', energy: '2 minutes', connection: '1 minute', progress: '2 minutes', rest: '5 minutes' };
const guidance = {
  calm: ['Make room before moving forward.', 'When everything feels too much, a brief pause can make the next choice easier.'],
  clarity: ['Choose one thing, let the rest wait.', 'A single priority gives a scattered mind somewhere to begin.'],
  energy: ['Care for your body first.', 'Gentle movement may help you reset. Keep it comfortable for you.'],
  connection: ['Let someone share a little of your day.', 'A small connection can be enough; you don’t need to explain everything.'],
  progress: ['Begin with what is already in front of you.', 'Starting small makes the task easier to approach. Stop after two minutes if you need to.'],
  rest: ['Give yourself permission to pause.', 'When you feel worn out, rest is a useful next step too.']
};
// The check-in's own markup owns its wording; the copy here once replaced it and
// left "Pick the closest" under a heading about obstacles, which read as a
// non-sequitur. Only the section labels below are set here.
$('#mind .eyebrow').textContent = 'CHECK IN';
$('#mind summary').firstChild.textContent = 'Add a private note ';
$('#action .eyebrow').textContent = 'TODAY’S ACTIONS';
$('#reflection .eyebrow').textContent = 'LOOKING BACK';
$('#recommendation-empty h3').textContent = 'Start where you are.';
$('#recommendation-empty p').textContent = 'Check in to find your next step.';
// Closing the day is a stopping point, not another checklist. Editing only
// changes this view: existing entries and the day's closed state stay intact.
let reflectionEditingDay = '';
const reflectionCompletion = document.createElement('div');
reflectionCompletion.className = 'reflection-completion';
reflectionCompletion.hidden = true;
const reflectionCompleteTitle = document.createElement('h3');
reflectionCompleteTitle.id = 'reflection-complete-title';
reflectionCompleteTitle.tabIndex = -1;
reflectionCompleteTitle.textContent = 'You can leave today here.';
const reflectionCompleteStatus = document.createElement('p');
reflectionCompleteStatus.id = 'reflection-complete-status';
reflectionCompleteStatus.className = 'small-copy';
reflectionCompleteStatus.setAttribute('role', 'status');
const reflectionDone = document.createElement('a');
reflectionDone.className = 'button primary';
reflectionDone.href = '#home';
reflectionDone.textContent = 'Done for now';
const reflectionEdit = document.createElement('button');
reflectionEdit.type = 'button';
reflectionEdit.className = 'text-link reflection-edit';
reflectionEdit.textContent = 'Edit reflection';
reflectionEdit.addEventListener('click', () => {
  checkDay();
  reflectionEditingDay = today;
  renderReflectionCompletion();
  const heading = $('#reflection h3');
  heading.tabIndex = -1;
  heading.focus({preventScroll:true});
});
reflectionCompletion.append(reflectionCompleteTitle, reflectionCompleteStatus, reflectionDone, reflectionEdit);
$('#reflection').append(reflectionCompletion);
function renderReflectionCompletion(focus = false) {
  const finished = day.closed && reflectionEditingDay !== today;
  $('#reflection').classList.toggle('reflection-finished', finished);
  reflectionCompletion.hidden = !finished;
  reflectionCompleteStatus.textContent = storageAvailable
    ? 'Today is saved. There is nothing else to complete.'
    : nativeStorageError ? 'Your entries are not safely saved. Keep this screen open and check the storage notice.'
      : 'Finished for this visit only. Keep this screen open to keep your entries.';
  $('#finish-day').textContent = day.closed
    ? reflectionEditingDay === today ? 'Done editing' : 'Finished for today ✓'
    : 'Finish for today';
  if (finished && focus) reflectionCompleteTitle.focus({preventScroll:true});
}
document.addEventListener('steady:screen', event => {
  if (event.detail !== 'review') reflectionEditingDay = '';
  renderReflectionCompletion();
});
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3500); }
function save() {
  if (storageReadFailed) {
    storageAvailable = false;
    $('#storage-status').hidden = false;
    $('#storage-status').textContent = 'Saved data could not be read. Existing storage has not been changed. New entries are kept for this visit only.';
    return false;
  }
  try {
    if (localStorage.getItem(storageKey) !== storedSnapshot) {
      storageAvailable = false;
      $('#storage-status').hidden = false;
      $('#storage-status').textContent = 'Your entries changed in another tab. This page’s new edits are not saved. Keep it open to keep those edits; a fresh page will load the saved entries.';
      return false;
    }
    const nextSnapshot = JSON.stringify(state);
    localStorage.setItem(storageKey, nextSnapshot);
    storedSnapshot = nextSnapshot;
    storageAvailable = !nativeStorageError;
    $('#storage-status').hidden = !nativeStorageError;
    if (nativeStorageError) $('#storage-status').textContent = nativeStorageError;
    return storageAvailable;
  }
  catch { storageAvailable = false; $('#storage-status').hidden = false; $('#storage-status').textContent = 'Changes are only kept in this open app session. Local storage is unavailable.'; return false; }
}
// The iOS shell reports its protected local-copy result asynchronously. Keep a
// failure visible even if an alert could not appear over a share sheet or picker.
window.addEventListener('steady:native-storage-error', () => {
  nativeStorageError = 'Steady could not safely save its on-device copy. Keep this screen open and check your saved entries before closing the app.';
  storageAvailable = false;
  $('#storage-status').hidden = false;
  $('#storage-status').textContent = nativeStorageError;
  $('#mind-status').textContent = 'Not safely saved';
  $('#reflection-status').textContent = 'Not safely saved';
  renderReflectionCompletion();
});
window.addEventListener('steady:native-storage-saved', () => {
  if (!nativeStorageError) return;
  nativeStorageError = '';
  try {
    if (!storageReadFailed && localStorage.getItem(storageKey) === storedSnapshot) {
      storageAvailable = true;
      $('#storage-status').hidden = true;
      $('#mind-status').textContent = day.mind ? 'Saved' : '';
      $('#reflection-status').textContent = reflectionStatus();
      renderReflectionCompletion();
    }
  } catch { /* Keep the existing notice if the browser store is still unreadable. */ }
});
function updateProgress() {
  const list = $('#completed-actions'); list.replaceChildren();
  day.completedNeeds.forEach(key => {
    if (!Object.hasOwn(recommendations, key)) return;
    const row = document.createElement('p'); row.className = 'completed-step'; row.textContent = `✓ ${recommendations[key].title}`; list.append(row);
  });
}
let removedTask = null;
function renderTasks() {
  if (removedTask && removedTask.day !== day) removedTask = null;
  const container = $('#tasks'); container.replaceChildren();
  const taskDay = day;
  const shown = day.tasks;
  if (!shown.length) {
    const empty = document.createElement('div'); empty.className = 'empty-tasks';
    empty.textContent = 'Nothing on the list. Add a small step if you need one.';
    container.append(empty);
  }
  shown.forEach(task => {
    const row = document.createElement('div'); row.className = `task${task.complete ? ' complete' : ''}`;
    if(!task.id)task.id=taskId();
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = !!task.complete; checkbox.id = `task-${task.id}`;
    const label = document.createElement('label'); label.htmlFor = checkbox.id; label.textContent = task.text;
    checkbox.addEventListener('change', () => { task.complete = checkbox.checked; if(task.complete)window.steadyExperience?.haptic(); save(); renderTasks(); updateProgress(); const next = document.getElementById(checkbox.id); if(next) next.focus(); });
    const remove = document.createElement('button'); remove.className = 'delete-task'; remove.innerHTML = SteadyIcons.svg('close'); remove.setAttribute('aria-label', `Delete step: ${task.text}`);
    remove.addEventListener('click', () => {
      checkDay(); if (day !== taskDay) return;
      const index = day.tasks.findIndex(t => t.id === task.id);
      removedTask = {day, task, index};
      day.tasks = day.tasks.filter(t => t.id !== task.id);
      save(); renderTasks(); updateProgress();
      const adjacent = day.tasks[Math.min(index, day.tasks.length - 1)];
      const target = adjacent ? document.getElementById(`task-${adjacent.id}`) : $('#undo-task-removal');
      target?.focus({preventScroll:true});
      toast('Step removed. You can undo it below the list.');
    });
    row.append(checkbox, label, remove); container.append(row);
  });
  if (removedTask) {
    const notice = document.createElement('div'); notice.className = 'task-removal';
    const message = document.createElement('span'); message.textContent = 'Step removed.';
    const undo = document.createElement('button'); undo.id = 'undo-task-removal'; undo.type = 'button'; undo.className = 'text-link'; undo.textContent = 'Undo';
    undo.setAttribute('aria-label', `Undo removing step: ${removedTask.task.text}`);
    undo.addEventListener('click', () => {
      checkDay(); if (!removedTask || removedTask.day !== day) return;
      const {task, index} = removedTask;
      if (!day.tasks.some(t => t.id === task.id)) day.tasks.splice(Math.min(index, day.tasks.length), 0, task);
      removedTask = null;
      save(); renderTasks(); updateProgress();
      document.getElementById(`task-${task.id}`)?.focus({preventScroll:true});
      toast('Step restored.');
    });
    notice.append(message, undo); container.append(notice);
  }
  const completed = day.tasks.filter(t => t.complete).length;
  $('#task-count').textContent = completed ? `${completed} done` : '';
  $('#action-message').textContent = day.tasks.length && completed === day.tasks.length ? 'You showed up today. Let that be enough.' : completed ? 'Good. Keep it gentle.' : 'Just one check is progress.';
}
function reflectionStatus() {
  return day.closed ? 'Saved for today' : day.reflections.length || day.reflection.trim() ? 'Saved' : '';
}
function renderDay() {
  $('#mind-note').value = day.mind || '';
  $('#daily-reflection').value = day.reflection || '';
  $('#mind-status').textContent = day.mind ? 'Saved' : '';
  document.querySelectorAll('[data-need]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.need === day.need)));
  document.querySelectorAll('[data-reflection]').forEach(button => button.setAttribute('aria-pressed', String(day.reflections.includes(button.dataset.reflection))));
  $('#reflection-status').textContent = reflectionStatus();
  renderReflectionCompletion();
  renderRecommendation();
  renderTasks(); updateProgress();
}
function renderRecommendation() {
  const recommendation = Object.hasOwn(recommendations, day.need) ? recommendations[day.need] : null;
  $('#recommendation-empty').hidden = !!recommendation;
  $('#recommendation').hidden = !recommendation;
  if (!recommendation) return;
  $('#recommendation-label').textContent = `${day.need} · ${duration[day.need]}`;
  $('#recommendation-title').textContent = recommendation.title;
  $('#recommendation-copy').textContent = recommendation.copy;
  $('#direction-intention').textContent = guidance[day.need][0];
  $('#recommendation-reason').textContent = guidance[day.need][1];
  day.recommendationDone = day.completedNeeds.includes(day.need);
  $('#complete-recommendation').innerHTML = day.recommendationDone ? 'Done <span>✓</span>' : 'Mark as done <span>✓</span>';
  $('#complete-recommendation').classList.toggle('completed', !!day.recommendationDone);
  $('#complete-recommendation').setAttribute('aria-pressed', String(!!day.recommendationDone));
}
document.querySelectorAll('[data-need]').forEach(button => button.addEventListener('click', () => {
  const nextNeed = button.dataset.need;
  // A new check-in is a correction, not consent to reuse a hidden obstacle.
  if(day.need!==nextNeed&&day.context)delete day.context.blocker;
  day.need = nextNeed;
  // Choosing a need is the person taking it over from the clock, so it stops
  // being re-derived as the hour changes.
  day.needFromClock = false;
  document.querySelectorAll('[data-need]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.need === day.need)));
  save();
  renderRecommendation(); updateProgress();
  navigateScreen('today/step');
}));
$('#mind-note').addEventListener('input', event => { day.mind = event.target.value; $('#mind-status').textContent = save() ? (day.mind.trim() ? 'Saved' : '') : 'Not saved'; updateProgress(); });
$('#complete-recommendation').addEventListener('click', () => {
  if(window.steadyExperience) { window.steadyExperience.toggleCompletion(); return; }
  if (!Object.hasOwn(recommendations, day.need)) return;
  day.completedNeeds = day.completedNeeds.includes(day.need) ? day.completedNeeds.filter(k => k !== day.need) : [...day.completedNeeds, day.need];
  day.recommendationDone = day.completedNeeds.includes(day.need);
  const saved = save(); renderRecommendation(); updateProgress();
  if (day.recommendationDone && saved) toast('One small step, done.');
});
$('#finish-day').addEventListener('click', () => {
  checkDay(); day.closed = true;
  const stored = save();
  reflectionEditingDay = '';
  renderReflectionCompletion(true);
  $('#reflection-status').textContent = stored ? 'Saved for today' : 'Finished for this visit only';
});
document.querySelectorAll('[data-reflection]').forEach(button => button.addEventListener('click', () => { const value = button.dataset.reflection; day.reflections = day.reflections.includes(value) ? day.reflections.filter(item => item !== value) : [...day.reflections, value]; document.querySelectorAll('[data-reflection]').forEach(b => b.setAttribute('aria-pressed', String(day.reflections.includes(b.dataset.reflection)))); $('#reflection-status').textContent = save() ? reflectionStatus() : 'Not saved'; updateProgress(); }));
$('#daily-reflection').addEventListener('input', event => { day.reflection = event.target.value; day.reflectionSaved = !!day.reflection.trim(); $('#reflection-status').textContent = save() ? reflectionStatus() : 'Not saved'; updateProgress(); });
$('#task-form').addEventListener('submit', event => {
  event.preventDefault(); const input = $('#task-input'); const text = input.value.trim(); if (!text) return;
  day.tasks.push({id:taskId(), text, complete:false}); input.value = ''; save(); renderTasks(); updateProgress(); input.focus();
});
function activate(section) { document.querySelectorAll('.nav-item').forEach(link => { const active = link.dataset.section === section; link.classList.toggle('active', active); if(active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); }); }
// Keep each day's entries separate, including when the page stays open overnight.
function checkDay() {
  const next = dayKey(); if (next === today) return;
  save(); today = next; day = state.days[today] = prepareDay(state.days[today]); renderDay(); save(); renderScreen(); toast('A fresh day. Start wherever you are.');
}
document.addEventListener('pointerdown', checkDay, {capture:true});
document.addEventListener('keydown', checkDay, {capture:true});
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
window.addEventListener('focus', checkDay); setInterval(checkDay, 60000);
renderDay(); activate(location.hash.slice(1) || 'today');
if (!storageAvailable) {
  $('#storage-status').hidden = false;
  $('#storage-status').textContent = 'Saved data could not be read. Existing storage has not been changed. New entries are kept for this visit only.';
}
