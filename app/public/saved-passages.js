'use strict';

// Bookmark the passage identity, so changing translation never makes a duplicate.
const SteadySavedPassages = (() => {
  function normalize(value, knownKeys) {
    const allowed = new Set(knownKeys);
    return [...new Set((Array.isArray(value) ? value : []).filter(key => typeof key === 'string' && allowed.has(key)))];
  }

  function toggle(value, key, knownKeys) {
    const saved = normalize(value, knownKeys);
    if (!knownKeys.includes(key)) return saved;
    return saved.includes(key) ? saved.filter(item => item !== key) : [key, ...saved];
  }

  return { normalize, toggle };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SteadySavedPassages;

if (typeof document !== 'undefined') (() => {
  const experience = window.steadyExperience;
  if (!experience) return;
  const scripture = experience.routePanel('learn/scripture').node;
  const keys = Object.keys(ScriptureLibrary).filter(key => Object.hasOwn(SteadyGuide.themes, key));
  const savedKeys = () => SteadySavedPassages.normalize(state.savedPassages, keys);
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const link = (text, href, className = 'text-link') => {
    const element = node('a', className, text);
    element.href = href;
    return element;
  };

  const controls = node('div', 'passage-save-controls');
  const saveButton = node('button', 'chip', 'Keep passage');
  saveButton.type = 'button';
  saveButton.setAttribute('aria-label', 'Keep passage');
  saveButton.setAttribute('aria-pressed', 'false');
  controls.append(saveButton);
  scripture.insertBefore(controls, scripture.querySelector('.scripture-details'));


  const route = 'help/memory';
  const panel = experience.addPanel(route, 'Memory', '');
  panel.classList.add('saved-passages-panel', 'burden-memory-panel');
  panel.append(node('p', 'memory-intro', 'Remembered on this device.'));
  const preference = node('div', 'memory-preference');
  const preferenceCopy = node('div', 'memory-preference-copy');
  const toggleLabel = node('label', '', 'Remember useful details');
  toggleLabel.setAttribute('for', 'burden-memory-enabled');
  const explanation = node('p', '', 'Ask can remember useful details from new chats. You can forget them at any time.');
  explanation.id = 'burden-memory-explanation';
  preferenceCopy.append(toggleLabel, explanation);
  const enabledControl = node('input', 'memory-toggle');
  enabledControl.type = 'checkbox'; enabledControl.id = 'burden-memory-enabled';
  enabledControl.setAttribute('role', 'switch');
  enabledControl.setAttribute('aria-describedby', 'burden-memory-explanation burden-memory-off-note');
  enabledControl.setAttribute('data-navigation-focus', 'memory-toggle');
  const switchTarget = node('label', 'memory-switch-target'); switchTarget.append(enabledControl);
  preference.append(preferenceCopy, switchTarget);
  const offNote = node('p', 'memory-supporting', 'Off keeps your notes, but stops remembering and using them.');
  offNote.id = 'burden-memory-off-note';
  const availability = node('p', 'memory-supporting'); availability.id = 'burden-memory-availability';
  panel.append(preference, offNote, availability);

  const memories = node('section', 'memory-section');
  const memoryHeading = node('h2', '', 'Remembered details'); memoryHeading.id = 'burden-memory-heading'; memoryHeading.tabIndex = -1;
  memories.setAttribute('aria-labelledby', memoryHeading.id);
  const storage = node('p', 'memory-storage'); storage.id = 'burden-memory-storage';
  const chatCount = node('p', 'memory-supporting'); chatCount.id = 'burden-memory-chat-count';
  const empty = node('p', 'memory-empty', 'Useful details will appear here as you chat.');
  const notes = node('ul', 'memory-notes'); notes.id = 'burden-memory-notes';
  const clearButton = node('button', 'text-link memory-forget-all', 'Forget all memory'); clearButton.type = 'button';
  clearButton.id = 'burden-memory-clear'; clearButton.setAttribute('aria-expanded', 'false'); clearButton.setAttribute('aria-controls', 'burden-memory-confirm');
  const confirmation = node('div', 'memory-confirm'); confirmation.id = 'burden-memory-confirm'; confirmation.hidden = true;
  confirmation.setAttribute('role', 'group'); confirmation.setAttribute('aria-labelledby', 'burden-memory-confirm-title');
  const confirmTitle = node('h3', '', 'Forget all remembered details?'); confirmTitle.id = 'burden-memory-confirm-title';
  const confirmActions = node('div', 'memory-confirm-actions');
  const cancel = node('button', 'button', 'Cancel'), confirm = node('button', 'button memory-confirm-forget', 'Forget memory');
  cancel.type = confirm.type = 'button';
  cancel.id = 'burden-memory-cancel'; confirm.id = 'burden-memory-confirm-forget';
  confirmActions.append(cancel, confirm);
  confirmation.append(confirmTitle, node('p', '', 'This forgets memory only. Your chats and kept passages stay.'), confirmActions);
  const memoryStatus = node('p', 'memory-status'); memoryStatus.id = 'burden-memory-status'; memoryStatus.setAttribute('role', 'status');
  memories.append(memoryHeading, storage, chatCount, empty, notes, clearButton, confirmation, memoryStatus);
  panel.append(memories);

  const passages = node('section', 'memory-section memory-passages');
  const passageHeading = node('h2', '', 'Kept passages'); passageHeading.id = 'burden-memory-passages-heading';
  passages.setAttribute('aria-labelledby', passageHeading.id); passages.append(passageHeading);
  const summary = node('p', 'small-copy');
  const list = node('ul', 'saved-passages-list');
  const pagination = node('div', 'saved-passages-pagination');
  const previous = node('button', 'button', 'Previous');
  const next = node('button', 'button', 'Next');
  previous.type = next.type = 'button';
  const pageLabel = node('span', 'small-copy');
  pageLabel.setAttribute('role', 'status');
  pagination.append(previous, pageLabel, next);
  passages.append(summary, list, pagination, link('Scripture for today →', '#learn/scripture')); panel.append(passages);
  let page = 0;
  const pageSize = 4;

  function updateSaveButton() {
    const key = experience.scriptureChoice().key;
    const saved = savedKeys().includes(key);
    saveButton.setAttribute('aria-pressed', String(saved));
    saveButton.setAttribute('aria-label', saved ? 'Stop keeping this passage' : 'Keep passage');
    saveButton.textContent = saved ? (storageAvailable ? 'Kept' : 'Kept for this visit') : 'Keep passage';
  }

  function renderSaved() {
    const saved = savedKeys();
    const totalPages = Math.max(1, Math.ceil(saved.length / pageSize));
    page = Math.min(page, totalPages - 1);
    const translation = document.documentElement.dataset.translation === 'asv' ? 'asv' : 'web';
    summary.textContent = saved.length ? `${saved.length} kept ${saved.length === 1 ? 'passage' : 'passages'} · ${translation.toUpperCase()}` : 'Keep a passage while reading Scripture to return to it here.';
    list.replaceChildren();
    list.hidden = saved.length === 0;
    for (const key of saved.slice(page * pageSize, (page + 1) * pageSize)) {
      const verse = ScriptureLibrary[key];
      const item = node('li');
      const open = link('', '#learn/scripture', 'saved-passage-card');
      open.setAttribute('data-navigation-focus','saved-passage:'+key);
      const header = node('span', 'saved-passage-heading');
      header.append(node('strong', '', verse.reference), node('small', '', SteadyGuide.themes[key]));
      open.append(header, node('span', 'saved-passage-text', verse.translations[translation].text));
      open.addEventListener('click', event => {
        event.preventDefault();
        checkDay();
        day.scriptureTheme = key;
        save();
        navigateScreen('learn/scripture', 'push', open);
      });
      item.append(open);
      list.append(item);
    }
    pagination.hidden = totalPages <= 1;
    previous.disabled = page === 0;
    next.disabled = page >= totalPages - 1;
    pageLabel.textContent = `${page + 1} of ${totalPages}`;
  }

  function closeConfirmation(restoreFocus = false) {
    confirmation.hidden = true; clearButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus && !clearButton.hidden) clearButton.focus({preventScroll:true});
  }
  function renderMemory() {
    const model = window.SteadyBurdenMemory, store = window.SteadyBurdenMemoryStore;
    const focusedKey = document.activeElement?.getAttribute?.('data-navigation-focus');
    const memory = model ? model.normalize(state.burdenMemory) : {notes:[]};
    const info = store?.summary?.() || {};
    enabledControl.checked = store ? store.enabled() : state.profile?.burdenMemoryEnabled !== false;
    enabledControl.disabled = !store;
    const bytes = model ? model.byteSize(memory) : 0;
    storage.textContent = `${bytes.toLocaleString()} ${bytes === 1 ? 'byte' : 'bytes'} · ${memory.notes.length} of 20 details`;
    const chats = typeof SteadyFeelings !== 'undefined' ? SteadyFeelings.normalizeEntries(state.scriptureRequests).length : (Array.isArray(state.scriptureRequests) ? state.scriptureRequests.length : 0);
    chatCount.textContent = `${chats} chat ${chats === 1 ? 'entry is' : 'entries are'} stored separately.`;
    availability.textContent = info.available === true
      ? 'Apple Intelligence is available for memory on this iPhone. No cloud service is used.'
      : info.available === false
        ? 'Automatic memory is unavailable on this device. Existing notes stay here. No cloud service is used.'
        : 'Checking Apple Intelligence availability… Memory stays on this device.';
    empty.hidden = memory.notes.length > 0; notes.hidden = memory.notes.length === 0; clearButton.hidden = memory.notes.length === 0;
    clearButton.disabled = !store;
    if (!memory.notes.length) closeConfirmation();
    notes.replaceChildren();
    for (const [index, note] of memory.notes.entries()) {
      const item = node('li', 'memory-note');
      const text = node('p', 'memory-note-text', note.text); text.id = 'burden-memory-note-' + encodeURIComponent(note.id);
      const forget = node('button', 'text-link memory-forget', 'Forget'); forget.type = 'button'; forget.disabled = !store;
      forget.setAttribute('aria-label', 'Forget this remembered detail'); forget.setAttribute('aria-describedby', text.id);
      forget.setAttribute('data-navigation-focus', 'memory-note:' + note.id);
      forget.addEventListener('click', () => {
        const stored = store.forget(note.id);
        memoryStatus.textContent = stored ? 'Detail forgotten.' : 'Forgotten for this visit. Device storage could not be updated.';
        const remaining = notes.querySelectorAll('.memory-forget');
        (remaining[Math.min(index, remaining.length - 1)] || memoryHeading).focus({preventScroll:true});
      });
      item.append(text, forget); notes.append(item);
    }
    if (focusedKey?.startsWith('memory-note:')) {
      const target = Array.from(notes.querySelectorAll('.memory-forget')).find(control => control.getAttribute('data-navigation-focus') === focusedKey);
      target?.focus({preventScroll:true});
    }
  }

  saveButton.addEventListener('click', () => {
    checkDay();
    state.savedPassages = SteadySavedPassages.toggle(state.savedPassages, experience.scriptureChoice().key, keys);
    save();
    updateSaveButton();
    experience.haptic();
  });
  previous.addEventListener('click', () => { page -= 1; renderSaved(); });
  next.addEventListener('click', () => { page += 1; renderSaved(); });
  enabledControl.addEventListener('change', () => {
    const store = window.SteadyBurdenMemoryStore; if (!store) return;
    const enabled = enabledControl.checked, stored = store.setEnabled(enabled);
    memoryStatus.textContent = (enabled ? 'Memory is on.' : 'Memory is off. Existing notes are kept.') + (stored ? '' : ' Kept for this visit only.');
  });
  clearButton.addEventListener('click', () => { confirmation.hidden = false; clearButton.setAttribute('aria-expanded', 'true'); cancel.focus({preventScroll:true}); });
  cancel.addEventListener('click', () => closeConfirmation(true));
  confirm.addEventListener('click', () => {
    const store = window.SteadyBurdenMemoryStore; if (!store) return;
    const stored = store.clear(); closeConfirmation();
    memoryStatus.textContent = stored ? 'Memory forgotten. Chats and kept passages are unchanged.' : 'Memory forgotten for this visit. Device storage could not be updated.';
    memoryHeading.focus({preventScroll:true});
  });
  document.addEventListener('steady:memory-changed', renderMemory);
  document.addEventListener('steady:screen', event => {
    if (event.detail === 'learn/scripture') updateSaveButton();
    if (event.detail === route) { renderMemory(); renderSaved(); }
    else closeConfirmation();
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'scripture-theme') updateSaveButton();
    if (event.target.id === 'setting-translation') { updateSaveButton(); renderSaved(); }
  });
  updateSaveButton();
  if (location.hash === '#' + route || location.hash === '#learn/saved') renderScreen();
})();
