'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {guides, passage} = require('../public/scripture-help-guides.js');
const chapterSource = fs.readFileSync(require.resolve('../public/chapters.js'), 'utf8');
const sandbox = {};
vm.runInNewContext(chapterSource + '\nglobalThis.chapters = ScriptureChapters;', sandbox);
const chapters = JSON.parse(JSON.stringify(sandbox.chapters));
const expectedThemes = {
  anxiety: 'rest', exhaustion: 'rest', grief: 'grief', loneliness: 'connection',
  shame: 'grace', anger: 'grace', forgiveness: 'grace', decisions: 'wisdom',
  faith_questions: 'foundation', prayer: 'foundation', starting: 'foundation',
  perseverance: 'foundation', comparison: 'grace', gratitude: 'gratitude',
  helping: 'connection', conflict: 'connection', temptation: 'rest', suffering: 'grief'
};
const words = text => text.trim().split(/\s+/).length;

test('eighteen distinct concise guides retain the agreed topic and theme contract', () => {
  assert.deepEqual(Object.keys(guides).sort(), Object.keys(expectedThemes).sort());
  const acknowledgements = new Set(), practices = new Set();
  for (const [id, guide] of Object.entries(guides)) {
    assert.deepEqual(Object.keys(guide).sort(), ['theme', 'chapterKey', 'verses', 'acknowledgement', 'context', 'practice',...(id==='decisions'?['compare']:[])].sort());
    assert.equal(guide.theme, expectedThemes[id], id);
    assert.ok(Object.hasOwn(chapters, guide.chapterKey), id);
    assert.equal(guide.verses.length, 2);
    assert.ok(guide.verses.every(Number.isInteger));
    assert.ok(guide.verses[0] >= 1 && guide.verses[1] >= guide.verses[0]);
    for (const [field, limit] of [['acknowledgement', 35], ['context', 65], ['practice', 30]]) {
      assert.equal(typeof guide[field], 'string'); assert.ok(guide[field].trim());
      assert.ok(words(guide[field]) <= limit, `${id}.${field}: ${words(guide[field])} words exceeds ${limit}`);
      assert.doesNotMatch(guide[field], /<[^>]+>/, 'editorial content remains plain text');
    }
    assert.match(guide.practice, /^If /, id + ' offers, rather than requires, a practice');
    if(id==='decisions'){
      assert.ok(words(guide.compare)<=50);
      assert.doesNotMatch(guide.compare,/<[^>]+>/);
    }
    assert.match(guide.context, /Jesus|Paul|James|David/, id + ' identifies the biblical speaker or author');
    acknowledgements.add(guide.acknowledgement); practices.add(guide.practice);
  }
  assert.equal(acknowledgements.size, 18); assert.equal(practices.size, 18);
});

test('all 36 passages are exact inclusive ranges from the supplied local chapters and known sources', () => {
  const before = JSON.stringify(chapters);
  for (const [id, guide] of Object.entries(guides)) for (const translation of ['web', 'asv']) {
    const result = passage(id, translation, chapters), chapter = chapters[guide.chapterKey];
    const [first, last] = guide.verses;
    const selected = chapter.translations[translation].filter(verse => verse.number >= first && verse.number <= last);
    assert.ok(result, id + ' ' + translation);
    assert.equal(selected.length, last - first + 1);
    assert.equal(result.text, selected.map(verse => verse.text).join(' '));
    assert.ok(chapter.translations[translation].map(verse => verse.text).join(' ').includes(result.text));
    assert.equal(result.reference, chapter.reference + ':' + first + (first === last ? '' : '–' + last));
    assert.equal(result.source, chapter.sources[translation]);
    assert.equal(result.chapterKey, guide.chapterKey);
    assert.deepEqual(result.verses, guide.verses);
    assert.notEqual(result.verses, guide.verses);
  }
  assert.equal(JSON.stringify(chapters), before);
});

test('unknown IDs, unsupported translations and absent chapters do not throw or select a different passage', () => {
  for (const id of [null, undefined, false, 12, [], {}, Symbol('x'), '', 'unknown', 'constructor', '__proto__', 'toString', ' anxiety ']) {
    assert.equal(passage(id, 'web', chapters), null);
  }
  for (const translation of [null, '', 'WEB', 'kjv', '__proto__', {}, []]) assert.equal(passage('anxiety', translation, chapters), null);
  for (const input of [undefined, null, 1, false, '', {}, [], Object.create(chapters)]) assert.equal(passage('anxiety', 'web', input), null);
  assert.deepEqual(passage('anxiety', undefined, chapters), passage('anxiety', 'web', chapters));
});

test('incomplete, misnumbered or malformed verse ranges fail closed instead of misquoting', () => {
  for (const alter of [
    input => { input.rest = null; },
    input => { input.rest.translations = null; },
    input => { input.rest.translations.web = {}; },
    input => { input.rest.translations.web.pop(); },
    input => { input.rest.translations.web[27].number = 29; },
    input => { input.rest.translations.web[27] = null; },
    input => { input.rest.translations.web[27].text = ''; },
    input => { input.rest.translations.web[27].text = 42; }
  ]) {
    const input = structuredClone(chapters); alter(input);
    const before = JSON.stringify(input);
    assert.equal(passage('anxiety', 'web', input), null);
    assert.equal(JSON.stringify(input), before);
  }
});

test('returned ranges are independent, editorial records are frozen and publisher links do not trust supplied URLs', () => {
  const result = passage('anxiety', 'web', chapters); result.verses[0] = 1;
  assert.deepEqual(guides.anxiety.verses, [28, 30]);
  assert.deepEqual(passage('anxiety', 'web', chapters).verses, [28, 30]);
  assert.ok(Object.isFrozen(guides));
  for (const guide of Object.values(guides)) { assert.ok(Object.isFrozen(guide)); assert.ok(Object.isFrozen(guide.verses)); }
  const altered = structuredClone(chapters); altered.rest.sources.web = 'https://example.invalid/';
  altered.rest.reference = 'Something else';
  assert.equal(passage('anxiety', 'web', altered).source, 'https://ebible.org/eng-web/MAT11.htm');
  assert.equal(passage('anxiety', 'web', altered).reference, 'Matthew 11:28–30');
});

test('browser and CommonJS expose the same local-only API without browser or network dependencies', () => {
  const source = fs.readFileSync(require.resolve('../public/scripture-help-guides.js'), 'utf8');
  const browser = {};
  vm.runInNewContext(source + '\nglobalThis.help = SteadyScriptureHelp;', browser);
  assert.deepEqual(Object.keys(browser.help), ['guides', 'passage']);
  assert.equal(JSON.stringify(browser.help.guides), JSON.stringify(guides));
  assert.equal(browser.help.passage('grief', 'asv', chapters).text, passage('grief', 'asv', chapters).text);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|document\./);
});

test('sensitive applications retain uncertainty, boundaries and permission not to turn pain into progress', () => {
  assert.equal(guides.faith_questions.chapterKey, 'rest'); assert.deepEqual(guides.faith_questions.verses, [2, 5]);
  assert.match(guides.faith_questions.context, /does not guarantee quick answers/);
  assert.match(guides.prayer.context, /not a formula guaranteeing/);
  assert.match(guides.forgiveness.context, /not permission for harm/);
  assert.match(guides.forgiveness.context, /restored trust, immediate reconciliation or returning to danger/);
  assert.match(guides.grief.context, /not a timetable/);
  assert.match(guides.suffering.context, /not.*deadline for relief/);
  assert.match(guides.perseverance.context, /not a guarantee of career success/);
  assert.match(guides.gratitude.context, /not the same as calling every circumstance good/);
  assert.match(guides.temptation.acknowledgement, /unwanted thought is not the same as choosing to act/);
});
