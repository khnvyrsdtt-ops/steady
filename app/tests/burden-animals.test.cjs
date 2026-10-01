'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const repo = path.join(__dirname, '..', '..');
const publicDir = path.join(repo, 'app', 'public');
const source = file => fs.readFileSync(path.join(publicDir, file), 'utf8');

const A = require('../public/burden-animals.js');
const U = require('../public/understanding.js');
const M = require('../public/scripture-feelings-model.js');

const understand = text => U.understand(text, [], M);
const choose = (text, current) => A.choose({ text, current: current || A.BURDEN, understanding: understand(text) });

/*
 * These are the properties the character system is supposed to have, written
 * down so that losing one is a failing test rather than a quiet regression.
 *
 * The two that matter most are the first pair: the portrait must be a hint about
 * the kind of help, never a mode that changes the answer, and it must never
 * flicker. A portrait that changes the response would be a different product; a
 * portrait that changes on a stray word would be worse than no portrait at all.
 */
test('the portrait is chosen by the kind of help, not by a single word', () => {
  assert.equal(choose('I am completely overwhelmed by everything right now').animal, A.BURDEN);
  assert.equal(choose('what does this verse actually mean?').animal, A.SAGE);
  assert.equal(choose('I have three options for the job and I cannot decide between them').animal, A.SCOUT);
  assert.equal(choose('I am so tired and I keep putting it off, I cannot start').animal, A.STEADY);
});

test('Automatic has clear routes for common requests to each form of help',()=>{
  for(const [text,animal] of [
    ['Help me understand Romans 8',A.SAGE],
    ['Can you compare these choices?',A.SCOUT],
    ['I have two job offers and need to decide',A.SCOUT],
    ['What’s the best next step?',A.STEADY],
    ['Help me take one small step',A.STEADY],
    ['I feel overwhelmed and sad',A.BURDEN]
  ]){
    const verdict=A.classify(text);
    assert.equal(verdict.confidence,'clear',text);
    assert.equal(verdict.animal,animal,text);
  }
});

test('one stray word never selects a specialist', () => {
  // Each of these contains a word from a group, and none of them is a request.
  for (const fragment of ['should i', 'why', 'hmm', 'ok', 'the bible', 'tired']) {
    const verdict = choose(fragment, A.SAGE);
    assert.equal(verdict.changed, true, `"${fragment}" returns to the balanced portrait`);
    assert.equal(verdict.animal, A.BURDEN);
  }
});

test('uncertainty falls back to Burden rather than leaving the wrong animal there', () => {
  // Low energy is Steady's case by definition, and it is stated plainly twice
  // over, so the portrait moves there rather than sitting on an unrelated one.
  const verdict = choose('I feel exhausted, low on energy, everything is too much', A.SAGE);
  assert.equal(verdict.animal, A.STEADY);
  assert.equal(verdict.changed, true);
  // An unrelated or unclear request returns to balanced help.
  assert.equal(choose('hello', A.SAGE).animal, A.BURDEN);
  assert.equal(choose('thanks that was helpful', A.SAGE).animal, A.BURDEN);
});

test('a conversation that stays on one kind of help keeps the same animal', () => {
  let current = A.BURDEN;
  const thread = ['I cannot decide between three job offers', 'what are the trade-offs between them', 'which one should I go with'];
  for (const text of thread) {
    const verdict = A.choose({ text, current, understanding: understand(text) });
    current = verdict.animal;
  }
  assert.equal(current, A.SCOUT, 'a continuing decision thread settles on the fox and stays there');
  // A follow-up with no clear specialist cues gets balanced help.
  assert.equal(A.choose({ text: 'what about the salary', current, understanding: understand('what about the salary') }).animal, A.BURDEN);
});

test('the animals share one tile and one set of states', () => {
  assert.deepEqual(Object.keys(A.characters).sort(), ['donkey', 'fox', 'owl', 'tortoise']);
  for (const character of A.all()) {
    assert.ok(character.artwork, character.id + ' needs artwork');
    assert.ok(character.name, character.id + ' needs a name');
    assert.ok(character.label, character.id + ' needs a visible role');
    assert.ok(character.role, character.id + ' needs a role it represents');
    assert.ok(Array.isArray(character.temperament) && character.temperament.length, character.id + ' needs a temperament');
    // Manner is what the stylesheet reads, so it has to be real numbers rather
    // than a description nothing consumes.
    for (const key of ['lift', 'nudge', 'glance']) {
      assert.equal(typeof character.manner[key], 'number', `${character.id} needs a numeric ${key}`);
      assert.ok(character.manner[key] >= 0 && character.manner[key] <= 3, `${character.id} ${key} must stay tiny`);
    }
    assert.ok(['left', 'right'].includes(character.manner.lean), `${character.id} needs a direction to lean`);
  }
  assert.deepEqual(A.STATES, ['idle', 'thinking', 'ready', 'handover']);
  // The four must actually differ in manner, or they are one animal recoloured.
  assert.ok(new Set(A.all().map(c => c.manner.nudge)).size > 1, 'the animals must differ in how much they move');
  assert.equal(A.characters.fox.manner.glance > 0, true, 'Scout watches sideways; the others do not');
  // Four is enough; a fifth is an entry, not a rewrite, but not one yet.
  assert.equal(A.all().length, 4);
});

test('the portrait shares the tile and never takes over the stance library', () => {
  const sandbox = { console };
  sandbox.globalThis = sandbox; sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source('burden-animals.js'), sandbox);
  const Animals = sandbox.SteadyAnimals;

  // A tile that already carries a stance from the existing library.
  const tile = {
    attrs: { 'data-expression': 'concerned' },
    style: { setProperty(k, v) { this[k] = v; } },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    querySelector() { return null; },
  };
  Animals.render(tile, { animal: Animals.SAGE, state: Animals.State.THINKING });
  assert.equal(tile.getAttribute('data-animal'), 'owl', 'Sage is the owl');
  assert.equal(tile.getAttribute('data-animal-state'), 'thinking');
  // The stance the existing code set is untouched, and the name is available to
  // assistive technology without being shown.
  assert.equal(tile.getAttribute('data-expression'), 'concerned', 'the stance library is not overwritten');
  // Burden is the identity. The tile is decorative, and the heading above it
  // reads "Burden" always, so naming the specialist here would announce a
  // different speaker than the one the person is actually reading.
  assert.equal(tile.getAttribute('aria-label'), undefined, 'the tile carries no name of its own');
  // The manner reaches the stylesheet rather than sitting in a data structure.
  assert.equal(tile.style['--animal-nudge'], '1px');
  assert.equal(tile.style['--animal-glance'], '0px');
});

test('a later animal choice cancels an earlier portrait handover', async () => {
  const classes = new Set();
  const image = {};
  const tile = {
    attrs: { 'data-animal': A.BURDEN },
    style: { setProperty() {} },
    classList: {
      add(value) { classes.add(value); },
      remove(...values) { values.forEach(value => classes.delete(value)); },
    },
    setAttribute(key, value) { this.attrs[key] = value; },
    getAttribute(key) { return this.attrs[key]; },
    querySelector() { return image; },
  };
  const previous = A.handover(tile, A.SAGE);
  A.render(tile, { animal: A.SCOUT });
  await previous;
  assert.equal(tile.getAttribute('data-animal'), A.SCOUT);
  assert.equal(image.src, A.characters[A.SCOUT].artwork);
  assert.equal(classes.has('is-handover'), false);
});

test('a one-time acknowledgement settles back to still', async () => {
  const sandbox = { console, setTimeout };
  sandbox.globalThis = sandbox; sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source('burden-animals.js'), sandbox);
  const Animals = sandbox.SteadyAnimals;
  const tile = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, querySelector: () => null };
  Animals.beat(tile, Animals.State.READY);
  assert.equal(tile.getAttribute('data-animal-state'), 'ready');
  await new Promise(r => setTimeout(r, 800));
  assert.equal(tile.getAttribute('data-animal-state'), 'idle', 'ready must not replay forever');
});

test('Reduce Motion is respected, and the animal still changes', () => {
  const sandbox = { console, setTimeout, matchMedia: q => ({ matches: /reduce/.test(q) }) };
  sandbox.globalThis = sandbox; sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source('burden-animals.js'), sandbox);
  const Animals = sandbox.SteadyAnimals;
  assert.equal(Animals.reduceMotion(), true);
  const tile = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, querySelector: () => null };
  // A handover still happens -- the animal is information, not decoration -- it
  // simply does not move while it does.
  const done = Animals.handover(tile, Animals.SAGE);
  assert.equal(tile.getAttribute('data-animal'), 'owl', 'Sage is the owl');
  assert.equal(typeof done.then, 'function');
});

test('the portraits are generated artwork that matches the donkey', () => {
  const out = execFileSync('python3', [path.join(repo, 'app', 'tools', 'build-animals.py'), '--check'], { encoding: 'utf8' });
  assert.match(out, /match the donkey's family/, 'Run: python3 app/tools/build-animals.py');
  for (const name of ['owl', 'fox', 'tortoise']) {
    const file = path.join(repo, 'app', 'public', 'art', 'animals', `${name}.png`);
    assert.ok(fs.existsSync(file), `${name}.png must exist`);
    const alpha = execFileSync('python3', ['-c', `
import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert('RGBA').getchannel('A')
print(a.getextrema()[0], a.getextrema()[1])
`, file], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
    assert.equal(alpha[0], 0, `${name} must be on transparency, so the tile controls its presentation`);
    assert.equal(alpha[1], 255, `${name} must have solid pixels`);
  }
  assert.match(A.characters.donkey.artwork, /burden-painted\.png$/);
});
