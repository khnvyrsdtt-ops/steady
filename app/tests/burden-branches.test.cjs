'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Branches = require('../public/burden-branches.js');
const Feelings = require('../public/scripture-feelings-model.js');

test('ten categories with three situations each, all resolving cleanly', () => {
  assert.equal(Branches.categories.length, 10);
  for (const category of Branches.categories) {
    assert.ok(category.id && category.label);
    assert.equal(category.followups.length, 3);
    for (const step of category.followups) {
      assert.ok(step.id && step.label && step.text && step.guide);
      assert.deepEqual(Branches.resolve(category.id, step.id), { text: step.text, guide: step.guide });
    }
  }
  assert.equal(Branches.resolve('anxiety', 'nope'), null);
  assert.equal(Branches.resolve('nope', 'racing'), null);
  assert.equal(Branches.category('nope'), null);
});

test('stances cover the six shapes of being stuck', () => {
  const ids = Branches.stances.map(entry => entry.id);
  assert.deepEqual(ids, ['cant-start', 'dont-know', 'afraid', 'happened', 'thoughts', 'encourage']);
  for (const entry of Branches.stances) {
    assert.ok(entry.label && entry.step && entry.step.length <= 280, entry.id);
    assert.ok(['encouraged', 'listening', 'concerned'].includes(entry.expression), entry.id);
    assert.ok(Branches.stance(entry.id));
  }
  assert.equal(Branches.stance('nope'), null);
});

test('progressive stages remember answers: categories, situations, stances', () => {
  assert.equal(Branches.stageFor(null), 'categories');
  assert.equal(Branches.stageFor({}), 'categories');
  assert.equal(Branches.stageFor({ category: 'anxiety' }), 'situations');
  assert.equal(Branches.stageFor({ category: 'anxiety', followup: 'racing' }), 'stances');
  const combined = Branches.resolveWithStance('anxiety', 'racing', 'thoughts');
  assert.equal(combined.text, 'My thoughts keep racing and I feel anxious');
  assert.equal(combined.guide, 'anxiety');
  assert.ok(combined.step && combined.step.length > 0);
  assert.equal(combined.stance, 'thoughts');
  const skipped = Branches.resolveWithStance('anxiety', 'racing', null);
  assert.equal(skipped.step, null);
  assert.equal(Branches.resolveWithStance('anxiety', 'nope', 'thoughts'), null);
  assert.equal(Branches.prompts.start, 'What are you carrying today?');
});

test('every tap phrase resolves through the normal matcher to its guide', () => {
  for (const category of Branches.categories) {
    for (const step of category.followups) {
      const result = Feelings.match(step.text);
      assert.equal(result.matched, true, step.text);
      assert.equal(result.guide, step.guide, step.text);
      assert.equal(Feelings.response(step.text, result).urgent, false, step.text);
    }
  }
});
