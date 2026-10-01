#!/usr/bin/env node
'use strict';

// Build-only generator for public/chapters.js.
//
// chapters.js is the set of chapters Steady is allowed to quote in a chat reply.
// It used to be maintained by hand, which capped it at seven passages and made
// every addition a copy-and-paste of text that had to be trusted by eye. It is now
// generated from public/bible-data.js — the same public-domain, build-only import
// that app/tools/import-bible.cjs produces — so every verse in it is provably the
// wording already in the dataset and nothing can drift by transcription.
//
// Runtime never reads bible-data.js; this file stays small on purpose. Run
//   node app/tools/build-chapters.cjs          regenerate
//   node app/tools/build-chapters.cjs --check  fail if the file is out of date
//
// To add a passage, add one line to CHAPTERS below and regenerate. The generator
// refuses to emit a verse range that the dataset does not actually contain.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const publicDir = path.resolve(__dirname, '../public');
const dataPath = path.join(publicDir, 'bible-data.js');
const outPath = path.join(publicDir, 'chapters.js');

// key -> { book, chapter, focus, verses: [ [translations...], ... ] }
// `focus` is the single verse a reader should land on; `verses` is what a guide
// quotes. Both are verified against the dataset on every run.
const CHAPTERS = {
  // --- the original seven, unchanged, so no shipped wording moves -------------
  foundation: { book: 'MAT', chapter: 7, focus: 24 },
  rest: { book: 'MAT', chapter: 11, focus: 28 },
  wisdom: { book: 'JAS', chapter: 1, focus: 5 },
  connection: { book: 'GAL', chapter: 6, focus: 2 },
  gratitude: { book: '1TH', chapter: 5, focus: 18 },
  grief: { book: 'PSA', chapter: 34, focus: 18, cite: 'Psalm' },
  grace: { book: 'EPH', chapter: 4, focus: 32 },

  // --- waiting, meaning, and honest lament ------------------------------------
  waiting: { book: 'LAM', chapter: 3, focus: 22 },
  meaning: { book: 'ECC', chapter: 3, focus: 11 },
  lament: { book: 'PSA', chapter: 13, focus: 1, cite: 'Psalm' },
  absence: { book: 'PSA', chapter: 88, focus: 1, cite: 'Psalm' },
  complaint: { book: 'HAB', chapter: 1, focus: 2 },
  evil: { book: 'JOB', chapter: 1, focus: 20 },
  unanswered: { book: 'MRK', chapter: 14, focus: 33 },
  patience: { book: 'JAS', chapter: 1, focus: 2 },

  // --- doubt, sin, and whether you are loved ----------------------------------
  doubt: { book: 'MRK', chapter: 9, focus: 24 },
  loved: { book: 'ROM', chapter: 8, focus: 38 },
  forgiven: { book: 'ISA', chapter: 1, focus: 18 },
  notabandoned: { book: '1JN', chapter: 1, focus: 9 },
  // `grace` must stay Ephesians 4. Several Help guides quote it by name, and
  // repointing this key would silently move their Scripture somewhere else.
  newlife: { book: 'ROM', chapter: 6, focus: 3 },
  salvation: { book: 'EPH', chapter: 2, focus: 8 },
  freedom: { book: 'GAL', chapter: 5, focus: 1 },
  heal: { book: 'MRK', chapter: 5, focus: 14 },
  weakness: { book: '2CO', chapter: 12, focus: 9 },

  // --- who Jesus is, and how to read the Bible --------------------------------
  jesus: { book: 'JHN', chapter: 1, focus: 1 },
  reading: { book: '2TI', chapter: 3, focus: 16 },
  study: { book: 'LUK', chapter: 24, focus: 45 },
  others: { book: '1PE', chapter: 3, focus: 15 },
  otherfaiths: { book: 'JHN', chapter: 3, focus: 16 },
  science: { book: 'PSA', chapter: 19, focus: 1, cite: 'Psalm' },
  judgetext: { book: 'MAT', chapter: 25, focus: 46 },
  warning: { book: 'HEB', chapter: 10, focus: 29 },
  coming: { book: 'MAT', chapter: 24, focus: 42 },
  renewal: { book: 'REV', chapter: 21, focus: 4 },
  forever: { book: 'JHN', chapter: 14, focus: 1 },
  spirit: { book: 'JHN', chapter: 14, focus: 16 },

  // --- how a person actually lives -------------------------------------------
  anxietyfull: { book: 'PHP', chapter: 4, focus: 6 },
  money: { book: 'MAT', chapter: 6, focus: 21 },
  love: { book: '1CO', chapter: 13, focus: 4 },
  conflict: { book: 'EPH', chapter: 4, focus: 26 },
  church: { book: '1CO', chapter: 12, focus: 12 },
  gifts: { book: '1CO', chapter: 12, focus: 4 },
  justice: { book: 'MIC', chapter: 6, focus: 8 },
  work: { book: 'ECC', chapter: 2, focus: 24 },
  creation: { book: 'GEN', chapter: 2, focus: 15 },
  trust: { book: 'PRO', chapter: 3, focus: 5 },
  service: { book: 'MAT', chapter: 25, focus: 35 },
  command: { book: 'MRK', chapter: 12, focus: 29 },
  divided: { book: '1CO', chapter: 1, focus: 10 },
};

const TRANSLATIONS = ['web', 'asv'];

// The chapters the existing Help guides quote, pinned by name. A guide refers to
// a chapter by this key, so editing a key in CHAPTERS would otherwise repoint a
// guide's Scripture at a different book with no error anywhere: the verse range
// would simply stop resolving. These are checked on every run.
const PINNED = {
  foundation: ['MAT', 7], rest: ['MAT', 11], wisdom: ['JAS', 1], connection: ['GAL', 6],
  gratitude: ['1TH', 5], grief: ['PSA', 34], grace: ['EPH', 4],
};

function loadData() {
  const source = fs.readFileSync(dataPath, 'utf8');
  const sandbox = { module: { exports: {} } };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const data = sandbox.module.exports;
  if (!data || !data.translations || !Array.isArray(data.books)) throw new Error('bible-data.js did not export a usable dataset');
  return data;
}

function bookName(data, id) {
  const book = data.books.find(item => item.id === id);
  if (!book) throw new Error(`Unknown book id ${id}`);
  return book.name;
}

function build() {
  const data = loadData();
  const out = {};
  const gapped = [];
  for (const [key, spec] of Object.entries(CHAPTERS)) {
    if (Object.hasOwn(PINNED, key)) {
      const [book, chapter] = PINNED[key];
      if (spec.book !== book || spec.chapter !== chapter) {
        throw new Error(`${key} is pinned to ${book} ${chapter} because a Help guide quotes it; the manifest says ${spec.book} ${spec.chapter}. Give the new chapter its own key.`);
      }
    }
    const rows = {};
    for (const translation of TRANSLATIONS) {
      const byBook = data.translations[translation] && data.translations[translation][spec.book];
      const chapter = byBook && byBook[spec.chapter - 1];
      if (!Array.isArray(chapter) || !chapter.length) throw new Error(`${key}: ${translation} ${spec.book} ${spec.chapter} is not in the dataset`);
      // Some ASV verses carry only a footnote marker and no text (21 of 62,205 in
      // this dataset). They are dropped rather than filled in: a verse with no
      // wording must never gain wording here. Consumers already require a quoted
      // range to be contiguous, so a range spanning a gap simply yields nothing
      // instead of a silently stitched-together passage.
      const verses = [];
      for (const [number, text] of chapter) {
        if (!Number.isInteger(number)) throw new Error(`${key}: ${translation} verse number is not an integer`);
        if (typeof text !== 'string' || !text.trim()) continue;
        verses.push({ number, text });
      }
      if (verses.length !== chapter.length) gapped.push(`${key}/${translation} (${chapter.length - verses.length} empty)`);
      rows[translation] = verses;
      // A focus verse that does not exist would silently misdirect a reader.
      if (!rows[translation].some(verse => verse.number === spec.focus)) {
        throw new Error(`${key}: focus verse ${spec.focus} is not in ${translation} ${spec.book} ${spec.chapter}`);
      }
    }
    const name = bookName(data, spec.book);
    // eBible names the book "Psalms" but convention and the existing shipped
    // references cite "Psalm 34". The citation is what a reader sees, so it wins.
    const reference = `${spec.cite || name} ${spec.chapter}`;
    out[key] = {
      // The source book id, so the chapter is self-describing. Resolving a book
      // back from its display name is fragile: the citation may say "Psalm 34"
      // while the dataset calls the book "Psalms".
      book: spec.book,
      chapter: spec.chapter,
      reference,
      focus: spec.focus,
      translations: rows,
      // The importer pads Psalms to three digits and everything else to two, so
      // the per-chapter source link has to follow the same rule to resolve.
      sources: Object.fromEntries(TRANSLATIONS.map(t => [t, `https://ebible.org/eng-${t}/${spec.book}${String(spec.chapter).padStart(spec.book === 'PSA' ? 3 : 2, '0')}.htm`])),
    };
  }
  if (gapped.length) console.error(`Note: ${gapped.length} chapter/translation pairs have empty verses and are shortened: ${gapped.join(', ')}`);
  return `'use strict';\nconst ScriptureChapters = ${JSON.stringify(out, null, 2)};\n`;
}

const generated = build();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
  if (current !== generated) {
    console.error('chapters.js is out of date. Run: node app/tools/build-chapters.cjs');
    process.exit(1);
  }
  console.log(`chapters.js is current (${Object.keys(CHAPTERS).length} chapters).`);
} else {
  fs.writeFileSync(outPath, generated);
  console.log(`Wrote ${Object.keys(CHAPTERS).length} chapters to ${path.relative(process.cwd(), outPath)}.`);
}
