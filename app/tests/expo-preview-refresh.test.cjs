const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createPreviewRefresh, refreshGuardScript, requestRefreshScript, refreshActiveScript } = require('../../expo/preview-refresh');

test('unchanged, missing and failed version checks leave the current screen alone', async () => {
  const requested = [];
  let result = 'release-1';
  const monitor = createPreviewRefresh({
    revision: 'release-1', requestRefresh: value => requested.push(value),
    fetchVersion: async () => { if (result instanceof Error) throw result; return result; }
  });
  for (const next of ['release-1', null, {}, '../bad', new Error('Mac offline')]) {
    result = next;
    await monitor.check();
  }
  assert.deepEqual(requested, []);
  result = 'release-2';
  await monitor.check();
  assert.deepEqual(requested, ['release-2']);
});

test('a deferred update stays pending until the web page applies it, then cannot loop', async () => {
  const requested = [];
  const monitor = createPreviewRefresh({ revision: 'release-1', fetchVersion: async () => 'release-2', requestRefresh: value => requested.push(value) });
  await monitor.check();
  assert.equal(monitor.applied('unrequested'), false);
  await monitor.check();
  assert.deepEqual(requested, ['release-2', 'release-2']);
  assert.equal(monitor.applied('release-2'), true);
  await monitor.check();
  assert.equal(requested.length, 2);
  assert.equal(monitor.applied('release-2'), false);
});

test('overlapping checks and a response after unmount cannot trigger extra reloads', async () => {
  let finish, requests = 0, checks = 0;
  const monitor = createPreviewRefresh({
    revision: 'release-1',
    fetchVersion: () => { checks++; return new Promise(resolve => { finish = resolve; }); },
    requestRefresh: () => requests++
  });
  const waiting = monitor.check();
  await monitor.check();
  assert.equal(checks, 1);
  monitor.dispose();
  finish('release-2');
  await waiting;
  await monitor.check();
  assert.equal(requests, 0);
  assert.equal(checks, 1);
});

function openGuard(initialValue = '') {
  const listeners = {}, queued = [], messages = [], navigations = [], fields = [];
  const root = { dataset: {} };
  let mutation;
  const listen = (name, callback) => (listeners[name] ||= []).push(callback);
  const location = {
    href: 'http://172.20.10.6:4174/index.html?preview=release-1&example=yes#today/step',
    replace(url) { navigations.push(url); this.href = url; }
  };
  const document = { documentElement: root, activeElement: null, hidden: false, querySelectorAll: () => fields, addEventListener: listen };
  const sandbox = {
    URL, location, document,
    window: { ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) }, addEventListener: listen },
    setTimeout: callback => queued.push(callback),
    MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} }
  };
  const field = (value = '', type = 'text') => {
    const element = { value, type, checked: false, isConnected: true, isContentEditable: false, matches: () => true };
    fields.push(element);
    return element;
  };
  const initialField = field(initialValue);
  vm.runInNewContext(refreshGuardScript, sandbox);
  const flush = () => { while (queued.length) queued.shift()(); };
  const fire = (name, target = initialField) => { for (const listener of listeners[name] || []) listener({ target }); flush(); };
  return {
    sandbox, document, root, messages, navigations, initialField, field, fire, flush,
    request: revision => vm.runInNewContext(requestRefreshScript(revision), sandbox),
    active: value => { vm.runInNewContext(refreshActiveScript(value), sandbox); flush(); },
    keyboard: open => { root.dataset.nativeKeyboard = String(open); mutation(); flush(); }
  };
}

test('refresh keeps the hotspot origin, current route and other query parameters', () => {
  const page = openGuard();
  page.request('release-2');
  assert.deepEqual(page.navigations, ['http://172.20.10.6:4174/index.html?preview=release-2&example=yes#today/step']);
  assert.deepEqual(page.messages, [{ type: 'preview-refresh-applied', revision: 'release-2' }]);
  page.fire('hashchange');
  assert.equal(page.navigations.length, 1);
});

test('typing, keyboard and unfinished fields defer the update without copying private text', () => {
  const page = openGuard();
  page.document.activeElement = page.initialField;
  page.initialField.value = 'A private unfinished thought';
  page.fire('input');
  page.request('release-2');
  page.document.activeElement = null;
  page.fire('focusout');
  page.fire('steady:screen');
  assert.deepEqual(page.navigations, []);
  assert.deepEqual(page.messages, []);
  // Clearing/submitting the text ends the draft; the keyboard still blocks.
  page.keyboard(true);
  page.initialField.value = '';
  page.fire('submit');
  assert.equal(page.navigations.length, 0);
  page.keyboard(false);
  assert.equal(page.navigations.length, 1);
  assert.equal(JSON.stringify(page.messages).includes('private'), false);
});

test('a pending update waits for active foreground state and a focused field to close', () => {
  const page = openGuard();
  page.active(false);
  page.request('release-2');
  assert.equal(page.navigations.length, 0);
  page.document.activeElement = page.initialField;
  page.active(true);
  assert.equal(page.navigations.length, 0);
  page.document.activeElement = null;
  page.document.hidden = true;
  page.fire('focusout');
  assert.equal(page.navigations.length, 0);
  page.document.hidden = false;
  page.fire('visibilitychange');
  assert.equal(page.navigations.length, 1);
});

test('new form controls are protected and discarded controls do not block forever', () => {
  const page = openGuard();
  const draft = page.field('A new task');
  page.fire('input', draft);
  page.request('release-2');
  assert.equal(page.navigations.length, 0);
  draft.isConnected = false;
  page.fire('steady:screen');
  assert.equal(page.navigations.length, 1);
});

test('clearing an existing field is an edit too and must not be lost on refresh', () => {
  const page = openGuard('Existing text');
  page.initialField.value = '';
  page.fire('input');
  page.request('release-2');
  assert.equal(page.navigations.length, 0);
  page.initialField.value = 'Existing text';
  page.fire('input');
  assert.equal(page.navigations.length, 1);
});

test('a newer pending revision replaces an older one while editing', () => {
  const page = openGuard();
  page.document.activeElement = page.initialField;
  page.request('release-2');
  page.request('release-3');
  page.request('bad\";window.alert(1)');
  page.document.activeElement = null;
  page.fire('focusout');
  assert.equal(page.navigations.length, 1);
  assert.equal(new URL(page.navigations[0]).searchParams.get('preview'), 'release-3');
});

test('a Help chapter remains selected until the user leaves its temporary reading', () => {
  const page = openGuard();
  page.sandbox.location.href = 'http://172.20.10.6:4174/index.html?preview=release-1#learn/chapter';
  const reading = { studyReference: 'John 3:16', sourceId: 'study-1' };
  page.sandbox.window.steadyExperience = { helpReading: reading };
  page.request('release-2');
  page.fire('steady:screen');
  page.active(false);
  page.active(true);
  assert.equal(page.navigations.length, 0);
  assert.equal(page.sandbox.window.steadyExperience.helpReading, reading);
  // Settings preserves this reading too. Only ordinary navigation clears it.
  page.sandbox.location.href = 'http://172.20.10.6:4174/index.html?preview=release-1#settings';
  page.fire('steady:screen');
  assert.equal(page.navigations.length, 0);
  delete page.sandbox.window.steadyExperience.helpReading;
  page.sandbox.location.href = 'http://172.20.10.6:4174/index.html?preview=release-1#today/feelings';
  page.fire('steady:screen');
  assert.deepEqual(page.navigations, ['http://172.20.10.6:4174/index.html?preview=release-2#today/feelings']);
});
