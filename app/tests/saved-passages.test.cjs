const { test } = require('node:test');
const assert = require('node:assert/strict');
const bookmarks = require('../public/saved-passages.js');
const keys = ['foundation', 'rest', 'wisdom', 'connection', 'gratitude', 'grief', 'grace'];

test('saved passages reject malformed storage and unknown or repeated identities', () => {
  for (const value of [undefined, null, {}, 'wisdom', 1]) assert.deepEqual(bookmarks.normalize(value, keys), []);
  assert.deepEqual(bookmarks.normalize(['rest', null, 'missing', 'rest', 'wisdom', {}, 'toString'], keys), ['rest', 'wisdom']);
});

test('a passage can be saved once, removed, and saved again without mutating prior data', () => {
  const prior = Object.freeze(['foundation']);
  const saved = bookmarks.toggle(prior, 'rest', keys);
  assert.deepEqual(saved, ['rest', 'foundation']);
  assert.deepEqual(prior, ['foundation']);
  assert.deepEqual(bookmarks.toggle(saved, 'rest', keys), ['foundation']);
  assert.deepEqual(bookmarks.toggle(['foundation'], 'rest', keys), saved);
  assert.deepEqual(bookmarks.toggle(saved, 'unknown', keys), saved);
});

test('bookmark identity is independent of translation and never accepts a translation-qualified duplicate', () => {
  const saved = bookmarks.toggle([], 'wisdom', keys);
  assert.deepEqual(bookmarks.normalize([...saved, 'wisdom:web', 'wisdom:asv', 'wisdom'], keys), ['wisdom']);
  assert.deepEqual(bookmarks.toggle(saved, 'wisdom:asv', keys), ['wisdom']);
});
