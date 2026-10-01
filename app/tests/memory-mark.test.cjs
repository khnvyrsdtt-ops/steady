'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');

test('Memory has one visible entry point in Settings', () => {
  assert.match(read('app/public/index.html'), /href="#help\/memory">Memory/);
  assert.doesNotMatch(read('app/public/scripture-feelings.js'), /saved-hub-link|memory-hub-link|chat-header/);
  assert.doesNotMatch(read('ios/Steady/SteadyViewController.swift'), /burden-memory-pill|burdenNavMemory/);
});

test('a direct Memory link returns to Settings', () => {
  assert.match(read('app/public/screens.js'), /route==='help\/memory'\)parent=\['settings','Settings'\]/);
});
