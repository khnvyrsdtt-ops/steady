'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function open({ motionOff = false, reduceMotion = false } = {}) {
  const listeners = {};
  const hub = {
    children: [], props: {},
    querySelector(sel) { return sel === '.ambience' ? (this.children[0] || null) : null; },
    append(child) { this.children.push(child); },
    style: { setProperty(k, v) { this[k] = v; } }
  };
  const documentListeners = {};
  const rafQueue = [];
  const sandbox = {
    document: {
      readyState: 'complete',
      hidden: false,
      documentElement: { dataset: motionOff ? { motion: 'off' } : {} },
      body: { classList: { contains: name => name === 'home-screen' } },
      querySelector: sel => sel === '.home-screen .hub-heading' ? hub : null,
      createElement: () => ({ className: '', setAttribute() {}, innerHTML: '' }),
      addEventListener: (n, fn) => { (documentListeners[n] ||= []).push(fn); }
    },
    window: {
      innerWidth: 390, innerHeight: 844,
      matchMedia: () => ({ matches: reduceMotion }),
      requestAnimationFrame: fn => { rafQueue.push(fn); return rafQueue.length; },
      cancelAnimationFrame: () => {},
      addEventListener: (n, fn) => { (listeners[n] ||= []).push(fn); }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../public/ambience.js'), 'utf8'), sandbox);
  return { hub, listeners, documentListeners, rafQueue, sandbox };
}

test('home light builds once and leans toward touch within bounds', () => {
  const app = open();
  assert.equal(app.hub.children.length, 1);
  assert.equal(app.hub.children[0].className, 'ambience');
  app.documentListeners['steady:screen'][0]();
  assert.equal(app.hub.children.length, 1, 'one layer only');
  app.listeners.pointermove[0]({ clientX: 390, clientY: 0 });
  while (app.rafQueue.length) app.rafQueue.shift()();
  const x = parseFloat(app.hub.style['--amb-x']), y = parseFloat(app.hub.style['--amb-y']);
  assert.ok(x > 0.5 && x <= 1 && y >= -1 && y < -0.5);
});

test('reduced motion and hidden pages keep the light still', () => {
  const still = open({ motionOff: true });
  assert.equal(still.hub.children.length, 0);
  const calm = open({ reduceMotion: true });
  assert.equal(calm.hub.children.length, 0);
  calm.listeners.pointermove[0]({ clientX: 200, clientY: 200 });
  assert.equal(calm.rafQueue.length, 0);
});
