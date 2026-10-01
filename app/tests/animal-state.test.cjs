'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/*
 * One authoritative animal state.
 *
 * The selector, the page and the native wheel all have to agree about who is
 * helping, and they only do if exactly one thing holds that answer. These guard
 * the state path end to end: registry -> module -> rendered tile -> storage,
 * and back again after a restart.
 *
 * The bug these were written for: the conversation file kept its own copy of the
 * active animal, seeded with the default rather than with whatever a restored
 * choice said. A person who chose an animal and reopened the app was shown the
 * donkey everywhere, while the module knew perfectly well it was the fox.
 */
const repo = path.join(__dirname, '..', '..');
const publicDir = path.join(repo, 'app', 'public');
const read = file => fs.readFileSync(path.join(publicDir, file), 'utf8');
const A = require('../public/burden-animals.js');

const fresh = store => {
  globalThis.localStorage = store;
  delete require.cache[require.resolve('../public/burden-animals.js')];
  return require('../public/burden-animals.js');
};
const memory = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    get size() { return map.size; },
    raw: map
  };
};

const tile = () => {
  const attributes = {};
  const image = { attributes: {}, width: 0, height: 0, alt: null, _src: null, set src(v) { this._src = v; }, get src() { return this._src; } };
  return {
    attributes, image,
    setAttribute(k, v) { attributes[k] = v; },
    getAttribute(k) { return attributes[k]; },
    style: { setProperty() {} },
    querySelector(sel) { return sel === 'img' ? image : null; }
  };
};

test('every animal has its own artwork, and no two share a file', () => {
  const files = A.all().map(animal => animal.artwork);
  assert.equal(new Set(files).size, files.length,
    'two animals point at the same artwork: ' + files.join(' '));
  for (const animal of A.all()) {
    assert.ok(animal.artwork.startsWith('./art/'), animal.id + ' must point inside art/');
    const file = path.join(publicDir, animal.artwork.slice(2));
    assert.ok(fs.existsSync(file), animal.id + ' -> ' + animal.artwork + ' is missing');
  }
});

test('no animal is a stand-in for another: only the donkey uses the donkey', () => {
  const donkeyArt = A.characters[A.DEFAULT].artwork;
  for (const animal of A.all()) {
    if (animal.id === A.DEFAULT) continue;
    assert.notEqual(animal.artwork, donkeyArt,
      animal.id + " falls back to the donkey's artwork");
  }
});

test('a choice renders the animal that was chosen, on the tile, from its own file', () => {
  for (const animal of A.all()) {
    A.setAuto();
    const t = tile();
    A.render(t, { animal: A.current(), state: A.State.IDLE });
    if (animal.id !== A.DEFAULT) {
      A.setManual(animal.id);
      A.render(t, { animal: A.current(), state: A.State.IDLE });
    }
    assert.equal(t.getAttribute('data-animal'), animal.id, animal.id + ' was not rendered');
    assert.equal(t.image.src, animal.artwork, animal.id + ' rendered the wrong artwork');
    assert.equal(t.image.alt, '', 'the portrait is decoration');
  }
  A.setAuto();
});

test('the page keeps no second copy of the active animal', () => {
  const web = read('scripture-feelings.js');
  // A local that tracks the active animal is how the two drifted. The page may
  // hold a flag about whether a movement has played, because that is about
  // motion rather than about which animal is here.
  assert.doesNotMatch(web, /let\s+currentAnimal\b/, 'the page keeps its own active animal');
  assert.doesNotMatch(web, /var\s+currentAnimal\b/, 'the page keeps its own active animal');
  assert.match(web, /function\s+activeAnimal\(\)\{[^}]*A\.current\(\)/,
    'the page must read the active animal from the module');
  // The router must be asked what is already on screen, or its comparison is
  // against an animal nobody is looking at.
  assert.match(web, /A\.choose\(\{text,current:before,understanding\}\)/,
    'the router must be given the module\'s current animal');
});

test('the module records every move it reports, so current() cannot disagree', () => {
  A.setAuto();
  // Every branch that can report a move is reachable from a conversation, and
  // every one of them must leave current() naming the animal it just reported.
  const conversation = [
    'what does this verse mean',
    'I cannot decide between three options',
    'I am so tired I cannot start anything',
    'I am overwhelmed and I cannot decide and I do not understand this verse',
    'compare these two approaches for me',
    'I know what to do but cannot start',
    'explain the context',
    'which way should I go',
    'I have no energy left at all',
    'I am hopeless and stuck and cannot cope',
  ];
  for (const text of conversation) {
    const before = A.current();
    const verdict = A.choose({ text, current: before, understanding: {} });
    if (verdict.changed) {
      assert.equal(A.current(), verdict.animal,
        `"${text}" reported a move to ${verdict.animal} but current() is ${A.current()}`);
    } else {
      assert.equal(A.current(), before, `"${text}" reported no move but current() changed`);
    }
  }
  A.setAuto();
});

test('handing control back names the animal that is actually shown', () => {
  // Automatic mode deliberately starts over from the default animal rather than
  // resuming wherever the router last was, so the wheel can never name one
  // animal while the screen shows another. What has to hold is that the animal
  // the call reports and the animal the module will render are the same one.
  A.setAuto();
  A.choose({ text: 'what does this verse mean', current: A.current(), understanding: {} });
  A.setManual(A.SCOUT);
  const result = A.setAuto();
  assert.equal(result.mode, 'auto');
  assert.equal(result.animal, A.current(),
    'the reported animal and the one that will be drawn disagree');
  assert.equal(A.current(), A.DEFAULT,
    'automatic mode must restart from the default animal');
  const t = tile();
  A.render(t, { animal: A.current(), state: A.State.IDLE });
  assert.equal(t.getAttribute('data-animal'), A.DEFAULT);
  assert.equal(t.image.src, A.characters[A.DEFAULT].artwork);
  A.setAuto();
});

test('a manual choice survives a restart and is what the page is told to draw', () => {
  const store = memory();
  const first = fresh(store);
  first.setManual('owl');
  assert.equal(store.getItem('steady.animal'), JSON.stringify({ mode: 'manual', id: 'owl' }));

  const reopened = fresh(store);
  assert.equal(reopened.isManual(), true, 'the choice is not in force after a restart');
  assert.equal(reopened.current(), 'owl', 'the restored module names a different animal');
  // What the page will render is read from the module, so this is the animal a
  // person actually sees on every tile after reopening the app.
  const t = tile();
  reopened.render(t, { animal: reopened.current(), state: reopened.State.IDLE });
  assert.equal(t.getAttribute('data-animal'), 'owl');
  assert.equal(t.image.src, reopened.characters.owl.artwork);
});

test('automatic is restored as automatic, and may choose again', () => {
  const store = memory();
  const first = fresh(store);
  first.setManual('fox');
  first.setAuto();
  const reopened = fresh(store);
  assert.equal(reopened.isManual(), false);
  assert.equal(reopened.mode, 'auto');
  // Automatic is free to choose again the moment it is on.
  const verdict = reopened.choose({ text: 'what does this verse mean', current: reopened.current(), understanding: {} });
  if (verdict.changed) assert.equal(reopened.current(), verdict.animal);
});

delete globalThis.localStorage;
