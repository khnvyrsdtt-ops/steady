'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const U = require('../public/understanding.js');
const V = require('../public/verified-scripture.js');
const Feelings = require('../public/scripture-feelings-model.js');
const Guides = require('../public/scripture-help-guides.js');

// chapters.js and scriptures.js are classic scripts holding a bare const, so the
// same vm trick the Bible tests use is how they are read here.
const publicDir = path.join(__dirname, '..', 'public');
const loadGlobal = (file, name) => {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(publicDir, file), 'utf8') + `\nglobalThis.__out=${name};`, sandbox);
  return sandbox.__out;
};
const Chapters = loadGlobal('chapters.js', 'ScriptureChapters');
const Library = loadGlobal('scriptures.js', 'ScriptureLibrary');

/*
 * The principle these two modules exist to hold:
 *   deterministic where possible, AI where understanding is required.
 *
 * These tests are the enforcement. They fail if Scripture ever stops coming
 * from the verified library, or if the understanding contract changes shape --
 * because a contract that moves silently is a contract a future model
 * implementation cannot be written against.
 */

test('understanding tells missing direction apart from difficulty starting', () => {
  const cases = [
    ['I do not know what to do', 'direction'],
    ['I do not know which way to go', 'direction'],
    ['I have too many options and no idea what to do', 'direction'],
    ['I do not know where to start', 'direction'],
    ['I know what to do but I cannot start', 'starting'],
    ['I keep putting it off', 'starting'],
    ['I keep putting it off again', 'starting'],
    ['I never get started on anything', 'starting'],
    ['I do not know what to do and I cannot begin', 'both'],
    // Neither. Most writing does not name either, and saying so is the honest
    // answer rather than a guess dressed as understanding.
    ['today was hard', 'unclear'],
    ['I am not stuck any more', 'unclear'],
    ['I finally started this morning', 'unclear'],
    ['', 'unclear'],
  ];
  for (const [text, expected] of cases) {
    assert.equal(U.difficultyOf(text), expected, JSON.stringify(text));
  }
});

test('a denial is not read as the thing it denies', () => {
  // The distinction is worthless if it fires on the opposite of what was said.
  assert.equal(U.difficultyOf('I am not stuck any more'), 'unclear');
  assert.equal(U.difficultyOf('I no longer keep putting it off'), 'unclear');
  assert.equal(U.difficultyOf('I managed to start this morning'), 'unclear');
  // A denial in one clause must not cancel a real admission in another.
  assert.equal(U.difficultyOf("I am not stuck but I keep putting it off"), 'starting');
});

test('the understanding contract is stable, and reports its own source', () => {
  const understood = U.understand('I do not know what to do', [], Feelings);
  assert.equal(understood.basis, 'rules', 'the source of an interpretation is never anonymous');
  assert.equal(understood.difficulty, 'direction');
  assert.ok(U.difficulties.includes(understood.difficulty));
  assert.equal(typeof understood.theme, 'string');
  assert.equal(typeof understood.matched, 'boolean');
  assert.ok(['clear', 'weak', 'none'].includes(understood.confidence));
  // The rules result is carried intact so existing callers are untouched, which
  // is what makes the implementation replaceable rather than entangled.
  assert.equal(understood.result.key, Feelings.match('I do not know what to do', []).key);
  // Nothing unrecognised is dressed up as understanding.
  const missed = U.understand('zzz qqq', [], Feelings);
  assert.equal(missed.confidence, 'none');
  assert.equal(missed.matched, false);
});

test('Scripture reaches the reader only through the verified boundary', () => {
  const passage = V.retrieve({
    guideId: 'forgiveness', key: 'grace', translation: 'web',
    guides: Guides, chapters: Chapters, library: Library,
  });
  assert.ok(V.isVerified(passage), 'a passage must arrive sealed');
  assert.equal(passage.origin.verified, true);
  assert.equal(passage.origin.text, 'verified-library');
  assert.ok(passage.reference && passage.text, 'reference and text come from the library');
  // The shown reference must describe the text actually on screen, so it is
  // read off the sealed object rather than recomputed somewhere else.
  assert.equal(V.referenceOf(passage), passage.reference);
  // A sealed passage cannot be quietly rewritten by a generated explanation.
  assert.throws(() => { 'use strict'; passage.text = 'anything else'; }, TypeError);
});

test('the boundary reports a gap rather than filling it', () => {
  // No guide, no theme, no library: nothing may be invented to cover the gap.
  assert.equal(V.retrieve({ guideId: 'nope', key: 'nope', translation: 'web', guides: Guides, chapters: Chapters, library: Library }), null);
  assert.equal(V.retrieve({ key: 'nope', translation: 'web', library: Library }), null);
  // A theme with a translation missing is also nothing, not a fallback guess.
  assert.equal(V.retrieve({ key: 'grief', translation: 'nope', library: Library }), null);
  // A guide whose stored verses do not form an unbroken run must not be quoted
  // at all. Falling back to the theme's own verified passage is correct, and the
  // result is still sealed -- what is forbidden is a stitched-together quote.
  const broken = { ...Guides, passage: () => null };
  const fell = V.retrieve({ guideId: 'forgiveness', key: 'grace', translation: 'web', guides: broken, chapters: Chapters, library: Library });
  assert.ok(V.isVerified(fell), 'the fallback is still verified text');
  assert.equal(fell.origin.via, 'theme');
  // A key present in neither the guides nor the library yields nothing. There is
  // no "close enough" path.
  assert.equal(V.retrieve({ guideId: 'nope', key: 'nope', translation: 'web', guides: broken, chapters: Chapters, library: Library }), null);
  // An unverified object is not treated as one of ours.
  assert.equal(V.isVerified({ reference: 'x', text: 'y' }), false);
  assert.equal(V.referenceOf({ reference: 'x' }), '');
});
