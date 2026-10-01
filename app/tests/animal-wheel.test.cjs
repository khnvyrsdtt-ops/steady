'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repo = path.join(__dirname, '..', '..');
const publicDir = path.join(repo, 'app', 'public');
const source = file => fs.readFileSync(path.join(publicDir, file), 'utf8');
const A = require('../public/burden-animals.js');
const U = require('../public/understanding.js');
const M = require('../public/scripture-feelings-model.js');

const understand = text => U.understand(text, [], M);
const pick = (text, current) => A.choose({ text, current: current || 'donkey', understanding: understand(text) });

/*
 * The wheel is a native view, so most of it cannot be exercised here. What this
 * file guards is the half that decides everything: the mode contract, the
 * registry that crosses the bridge, and the promise that automatic routing is
 * untouched until a person deliberately takes control of it.
 */
test('automatic is the default, and stays the default', () => {
  assert.equal(A.mode, 'auto');
  assert.equal(A.isManual(), false);
  assert.equal(A.DEFAULT, 'donkey');
  assert.match(A.characters.donkey.summary, /Balanced support/);
  assert.equal(pick('what does this verse mean', 'donkey').animal, 'owl');
  assert.equal(A.isManual(), false, 'automatic routing must not put it into manual mode');
});

test('choosing by hand holds, even when the subject moves elsewhere', () => {
  A.setAuto();
  assert.equal(pick('I cannot decide between three options', 'donkey').animal, 'fox');

  const chosen = A.setManual('tortoise');
  assert.equal(chosen.ok, true);
  assert.equal(chosen.mode, 'manual');
  // Every one of these would move the portrait if it were automatic. None of
  // them may, because a person chose it on purpose.
  const wouldOtherwiseMove = [
    'what does this verse mean',
    'I cannot decide between three options',
    'I am overwhelmed by everything',
    'I am exhausted and cannot start anything',
  ];
  for (const text of wouldOtherwiseMove) {
    const verdict = pick(text, 'tortoise');
    assert.equal(verdict.animal, 'tortoise', `"${text}" moved a manually chosen animal`);
    assert.equal(verdict.manual, true, 'the choice must report itself as manual');
  }
});

test('a manual choice never expires on its own', () => {
  A.setManual('owl');
  // A long stretch of unrelated turns, and a blank one for good measure.
  for (let i = 0; i < 30; i += 1) pick(i % 2 ? 'I cannot decide' : 'I am too tired to start', 'owl');
  pick('', 'owl');
  pick('   ', 'owl');
  assert.equal(A.isManual(), true, 'nothing may quietly hand control back');
  assert.equal(pick('anything at all', 'owl').animal, 'owl');
});

test('handing control back restores the automatic behaviour exactly', () => {
  A.setManual('fox');
  const back = A.setAuto();
  assert.equal(back.mode, 'auto');
  assert.equal(back.animal, 'donkey');
  assert.equal(A.isManual(), false);
  // And the automatic reading is the one that was there before, not a default.
  assert.equal(pick('what does this verse mean', 'donkey').animal, 'owl');
  assert.equal(pick('I am so tired and I keep putting it off', 'donkey').animal, 'tortoise');
});

test('the donkey is choosable by hand like any other animal', () => {
  // Choosing the donkey used to be treated as a request to stop overriding: it
  // silently switched to Automatic, so the portrait could then be moved off the
  // animal the person had just picked, on the very next request. "I want the
  // donkey" and "let Steady choose" are two different decisions, and the wheel
  // already offers them as two different controls.
  A.setManual('fox');
  const result = A.setManual('donkey');
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'manual');
  assert.equal(A.isManual(), true);
  assert.equal(A.current(), 'donkey');
  assert.equal(A.describe().manual, 'donkey');
  // And it holds, exactly like every other animal chosen by hand.
  const verdict = A.choose({ text: 'I cannot decide between three options', current: 'donkey', understanding: understand('I cannot decide between three options') });
  assert.equal(verdict.animal, 'donkey', 'a hand-picked donkey must not be routed off');
  assert.equal(verdict.manual, true);

  // Handing control back is the Automatic control, and nothing else.
  const back = A.setAuto();
  assert.equal(back.mode, 'auto');
  assert.equal(A.isManual(), false);
  assert.equal(A.describe().manual, null);
  // Returning to Automatic resets to the animal Steady starts from, so the wheel
  // and the tile cannot be left naming different animals.
  assert.equal(A.current(), A.DEFAULT);
  assert.equal(A.describe().current, A.DEFAULT);
});

test('an unknown animal is refused rather than half-applied', () => {
  A.setAuto();
  for (const value of ['', null, undefined, 'llama', 'DARK', 0, {}]) {
    const result = A.setManual(value);
    assert.equal(result.ok, false, `${JSON.stringify(value)} should be refused`);
  }
  assert.equal(A.isManual(), false, 'a refused choice must not leave the mode half-set');
});

test('the registry crossing the bridge is the same registry the router uses', () => {
  A.setAuto();
  const payload = A.describe();
  assert.equal(payload.animals.length, 4);
  assert.equal(payload.mode, 'auto');
  for (const animal of payload.animals) {
    assert.equal(animal.id, A.characters[animal.id].id);
    assert.equal(animal.name, A.characters[animal.id].name);
    // The one short line the wheel shows is the one the character carries; it is
    // not written a second time for the carousel.
    assert.equal(animal.role, A.characters[animal.id].summary);
    assert.ok(animal.artwork, animal.id + ' needs artwork');
    assert.ok(animal.role && animal.role.length < 60, animal.id + ' needs a short role, not a paragraph');
  }
  // And it must survive the trip as JSON, since that is how it travels.
  const round = JSON.parse(JSON.stringify(payload));
  assert.equal(round.animals.length, 4);
  assert.equal(round.animals[0].role, A.characters.donkey.summary);
});

test('the artwork every animal points at really exists', () => {
  for (const animal of A.all()) {
    const file = path.join(publicDir, animal.artwork.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(file), `${animal.id} points at ${animal.artwork}, which is missing`);
  }
});

test('the wheel is opened by tapping, and only from the one reachable portrait', () => {
  const sandbox = { console, setTimeout, clearTimeout, matchMedia: () => ({ matches: false }) };
  sandbox.globalThis = sandbox; sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source('burden-animals.js'), sandbox);
  const Animals = sandbox.SteadyAnimals;

  const web = source('scripture-feelings.js');
  // The portrait is tappable, and its corner badge keeps the wheel
  // discoverable without moving the animal's name off center.
  assert.match(web, /makeTappable/);
  assert.match(web, /wheelOpenControl/);
  assert.match(web, /node\('button','wheel-open'\)/);
  assert.match(web, /host\.append\(open\)/);
  // The portrait is tappable whether or not there are saved entries. It was
  // attached only in the categories branch, and the entries early-return sits
  // above that branch -- so anyone with a single saved entry could never reach
  // the wheel at all, which is exactly how this broke.
  assert.match(web, /makeTappable\(welcomeDonkey\(\)\);\s*\n\s*if\(entries\(\)/);
  // The tap goes across the existing bridge rather than opening anything of its
  // own, so there is no second character system in the web layer either.
  assert.match(web, /native\.showAnimalWheel\(A\.describe\(\)\)/);
  // Reopening repeatedly must be safe: the marker is what stops a second
  // listener being attached to the same tile.
  assert.match(web, /data-tappable/);
});

test('the native side receives the choice and applies it in one place', () => {
  const swift = fs.readFileSync(path.join(repo, 'ios', 'Steady', 'SteadyViewController.swift'), 'utf8');
  // The wheel must not decide the mode itself; it hands the choice back to the
  // layer that owns it, or the two would drift.
  assert.match(swift, /SteadyAnimalChosen/);
  assert.match(swift, /JSONEncoder\(\)\.encode\(choice \?\? "auto"\)/, 'the wheel must pass one animal ID, not a one-item array');
  assert.doesNotMatch(swift, /JSONSerialization\.data\(withJSONObject: \[choice \?\? "auto"\]\)/);
  assert.doesNotMatch(swift, /setManual\(/, 'the mode is not decided on the native side');
  const wheel = fs.readFileSync(path.join(repo, 'ios', 'Steady', 'AnimalWheelView.swift'), 'utf8');
  // Painted cutouts stay smooth while moving through the wheel.
  assert.match(wheel, /\.interpolation\(\.high\)/);
  assert.doesNotMatch(wheel, /blur\(|Blur|visualEffect|UIBlurEffect/);
  // Reduce Motion is honoured by replacing the rotation rather than removing it.
  assert.match(wheel, /accessibilityReduceMotion/);

  // The ring is laid out by angle, not as a list. A list with a sideways
  // offset only ever filled the right-hand side and the last animal was clipped
  // off the edge -- which is the entire difference between a wheel and a row of
  // pictures that has been tilted. This was tried and it failed on a real
  // screen: it also collapsed to a one-point target once and could not be
  // turned at all while still looking entirely correct in a screenshot.
  const ring = wheel.slice(wheel.indexOf('private var ring'), wheel.indexOf('/// One animal, placed on the ring'));
  // Every animal is placed from its own angle and drawn back-to-front.
  assert.match(wheel, /private func angle\(for n: Int, at displayedPosition: CGFloat\)/);
  // Keep an unbounded angle even when VoiceOver steps the wheel: folding it
  // during animation can send a one-animal move around most of a turn.
  assert.match(wheel, /position \+= direction == \.increment \? by : -by/);
  assert.doesNotMatch(wheel, /truncatingRemainder\(dividingBy: 360\)/);
  assert.match(wheel, /zIndex\(place\.facing\)/);
  // The spacing is a full turn, so there is always one animal on each side of
  // the front one. A narrower spacing stacked everything on one side and the
  // result was not lined up.
  assert.match(wheel, /360 \/ Double\(max\(animals\.count, 1\)\)/);
  // A drag turns the wheel and the speed carries after the finger lifts, which
  // is what makes it scrollable rather than stopping dead.
  assert.match(wheel, /DragGesture\(minimumDistance: 4\)/);
  assert.match(wheel, /predictedEndTranslation/);
  // The stack of self-placing portraits carries no size, so without a real
  // width the gesture would have a one-point target again.
  assert.match(ring, /\.frame\(maxWidth: \.infinity\)/);
  // One position is the single source of truth. The front animal, the caption
  // and the depth are all read from it and nothing else writes them, so they
  // cannot disagree with one another.
  assert.match(wheel, /@State private var position: CGFloat/);
  assert.match(wheel, /private func front\(at displayedPosition: CGFloat\)/);
  // The pictures, selected name, and description must read the same animated
  // angle. Animating offsets alone cuts across the circle and jumps the copy.
  assert.match(ring, /AnimatedWheelPosition\(position: position\)/);
  assert.match(ring, /placement\(for: n, at: displayedPosition\)/);
  assert.match(ring, /front\(at: displayedPosition\)/);
  assert.match(ring, /animals\[selected\]\.name/);
  assert.match(ring, /animals\[selected\]\.role/);
  // VoiceOver cannot drag, so the wheel steps round instead.
  assert.match(ring, /accessibilityAdjustableAction/);
  // Choosing takes a deliberate hold on the separate confirmation control.
  // The portraits have no competing hold recognizer, so turning stays smooth.
  assert.match(ring, /onLongPressGesture\(minimumDuration: 0\.65, maximumDistance: 15/);
  assert.doesNotMatch(ring, /simultaneousGesture\(\s*LongPressGesture/);
  assert.match(ring, /guard !grabbing, confirmingID == nil/);
  assert.doesNotMatch(ring, /Button \{ choose\(animal\) \}/);
  // Automatic starts from the saved mode, fills the control when active, and
  // can be switched off without committing a previewed animal.
  assert.match(wheel, /_automaticSelected = State\(initialValue: isAutomatic\)/);
  assert.match(wheel, /Capsule\(\)\.fill\(automaticSelected \?/);
  assert.match(wheel, /onChoose\(committedID\)/);
  assert.match(wheel, /onChoose\(nil\)/);
});


test('rapid use of the wheel cannot leave the mode or the portrait inconsistent', () => {
  A.setAuto();
  let current = 'donkey';
  // Fifty turns of someone flicking about in the wheel and changing their mind.
  const ids = ['owl', 'fox', 'tortoise', 'donkey', 'auto', 'owl', 'auto', 'fox'];
  for (let i = 0; i < 50; i += 1) {
    const choice = ids[i % ids.length];
    const result = choice === 'auto' ? A.setAuto() : A.setManual(choice);
    assert.equal(result.ok, true);
    const verdict = A.choose({ text: 'I cannot decide between options', current, understanding: understand('I cannot decide between options') });
    current = verdict.animal;
    assert.ok(A.characters[current], 'the portrait must always be a real animal');
    const shown = A.describe().current;
    assert.equal(shown, current, 'what the wheel is told must match what is shown');
  }
  A.setAuto();
});

/* ------------------------------------------------------------ persistence -- */

/*
 * A choice made by hand has to survive closing the app. Automatic is
 * re-decided every session and must not be written over by a stored value, and
 * the router must never move a person off the animal they picked.
 */
const MODULE = require.resolve('../public/burden-animals.js');

function reopenWithStorage(store) {
  // A fresh module instance is a fresh launch: the file is read again, and the
  // stored choice is all that carries across.
  globalThis.localStorage = store;
  delete require.cache[MODULE];
  return require(MODULE);
}

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: key => { map.delete(key); },
    get size() { return map.size; },
    raw: map,
  };
}

test('a manual animal survives closing and reopening the app', () => {
  const store = memoryStorage();
  const first = reopenWithStorage(store);
  first.setManual('owl');
  assert.equal(store.getItem('steady.animal'), JSON.stringify({ mode: 'manual', id: 'owl' }));

  const reopened = reopenWithStorage(store);
  assert.equal(reopened.isManual(), true, 'the choice must still be in force after a restart');
  assert.equal(reopened.mode, 'manual');
  assert.equal(reopened.describe().current, 'owl');
  assert.equal(reopened.describe().manual, 'owl');
  // Automatic must not quietly take a person off the animal they chose.
  const verdict = reopened.choose({ text: 'I am completely lost and cannot decide anything', current: reopened.BURDEN, understanding: {} });
  assert.equal(verdict.animal, 'owl', 'the router must not override a manual choice');
});

test('Automatic is stored and restored separately, and hands control back', () => {
  const store = memoryStorage();
  const first = reopenWithStorage(store);
  first.setManual('fox');
  first.setAuto();
  assert.equal(store.getItem('steady.animal'), JSON.stringify({ mode: 'auto' }));

  const reopened = reopenWithStorage(store);
  assert.equal(reopened.isManual(), false);
  assert.equal(reopened.describe().manual, null);
  assert.ok(reopened.characters[reopened.describe().current], 'automatic still has to be a real animal');
});

test('unreadable stored choices fall back to automatic rather than throwing', () => {
  for (const raw of ['not json', '[]', 'null', '{"mode":"manual","id":"dragon"}', '{"mode":"sideways"}', '']) {
    const store = memoryStorage(raw === '' ? {} : { 'steady.animal': raw });
    const reopened = reopenWithStorage(store);
    assert.equal(reopened.isManual(), false, `raw ${JSON.stringify(raw)} must not claim a manual choice`);
    assert.ok(reopened.characters[reopened.describe().current]);
  }
});

test('storage being unavailable never breaks choosing an animal', () => {
  const broken = { getItem() { throw new Error('no storage'); }, setItem() { throw new Error('no storage'); } };
  const A2 = reopenWithStorage(broken);
  assert.equal(A2.setManual('tortoise').ok, true);
  assert.equal(A2.isManual(), true, 'the choice still holds for this session');
  assert.equal(A2.setAuto().ok, true);
});

/*
 * The screen must not keep its own copy of the animal.
 *
 * It used to, and that copy was seeded with the default animal when the file
 * loaded instead of with whatever a restored choice said. The module and the
 * screen then named different animals, which is why choosing by hand appeared
 * to do nothing, why the animal reverted on reopening the app, and why the wheel
 * and the tile disagreed. These guard the single authoritative answer itself:
 * whatever the module says is current must be the one the wheel is told and the
 * one a restored session reads back.
 */
test('the module, the wheel and a restored session always name one animal', () => {
  const store = memoryStorage();
  const first = reopenWithStorage(store);
  for (const id of ['owl', 'fox', 'tortoise', 'donkey']) {
    first.setManual(id);
    assert.equal(first.current(), id, `${id} must be the current animal`);
    assert.equal(first.describe().current, id, `the wheel must be told ${id}`);
    assert.equal(first.describe().manual, id);
    // A restarted session reads the same single answer back.
    const restarted = reopenWithStorage(store);
    assert.equal(restarted.current(), id, `${id} must survive a restart`);
    assert.equal(restarted.describe().current, id);
    assert.equal(restarted.isManual(), true);
  }
});

test('every change to the active animal is announced to whatever is drawing it', () => {
  const store = memoryStorage();
  const Animals = reopenWithStorage(store);
  const seen = [];
  Animals.subscribe(detail => seen.push(detail.animal));

  // Answered immediately, so a screen that mounts late is never left showing a
  // stale animal until the next request happens to change it.
  assert.deepEqual(seen, [Animals.DEFAULT], 'subscribing answers with the current animal');

  Animals.setManual('fox');
  assert.deepEqual(seen, [Animals.DEFAULT, 'fox'], 'choosing by hand is announced');

  // Automatic routing is announced too, and every read agrees afterwards.
  Animals.setAuto();
  assert.deepEqual(seen, [Animals.DEFAULT, 'fox', Animals.DEFAULT]);

  Animals.choose({ text: 'what does this verse actually mean', current: Animals.DEFAULT, understanding: understand('what does this verse actually mean') });
  assert.equal(seen[seen.length - 1], 'owl', 'an automatic move is announced');
  assert.equal(Animals.current(), 'owl');
  assert.equal(Animals.describe().current, 'owl');
});

test('Automatic routing still moves the animal, and turns off cleanly', () => {
  const store = memoryStorage();
  const Animals = reopenWithStorage(store);
  const seen = [];
  Animals.subscribe(detail => seen.push(detail.animal));

  // On: Steady may choose for itself.
  Animals.choose({ text: 'I have three options for the job and I cannot decide between them', current: Animals.DEFAULT, understanding: understand('I have three options for the job and I cannot decide between them') });
  assert.equal(Animals.current(), 'fox', 'automatic mode routes a decision to the fox');
  assert.equal(seen[seen.length - 1], 'fox');

  // Off, then a hand-picked animal, then a request that would otherwise move it.
  Animals.setAuto();
  Animals.setManual('tortoise');
  assert.equal(Animals.current(), 'tortoise');
  const held = Animals.choose({ text: 'I have three options for the job and I cannot decide between them', current: 'tortoise', understanding: understand('I have three options for the job and I cannot decide between them') });
  assert.equal(held.animal, 'tortoise', 'automatic routing must not override a hand-picked animal');
  assert.equal(Animals.current(), 'tortoise');

  // And it is still there after a restart.
  const restarted = reopenWithStorage(store);
  assert.equal(restarted.current(), 'tortoise', 'the hand-picked animal must survive a restart');
  assert.equal(restarted.describe().current, 'tortoise');
  assert.equal(restarted.isManual(), true);
  assert.equal(restarted.choose({ text: 'what does this verse actually mean', current: 'tortoise', understanding: {} }).animal, 'tortoise');
});

delete globalThis.localStorage;
