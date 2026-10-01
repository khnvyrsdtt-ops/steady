const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const publicDir=path.join(__dirname,'..','public');
const source=file=>fs.readFileSync(path.join(publicDir,file),'utf8');

// The whole point of generating chapters.js is that its Scripture is the dataset's
// Scripture. These tests are what make that a guarantee rather than an intention:
// a hand-edited chapter, a repointed key or an invented verse all fail here.

function loadChapters(){
  const sandbox={};vm.createContext(sandbox);
  vm.runInContext(source('chapters.js')+'\nglobalThis.CH=ScriptureChapters;',sandbox);
  return sandbox.CH;
}
function loadData(){
  const sandbox={module:{exports:{}}};vm.createContext(sandbox);
  vm.runInContext(source('bible-data.js'),sandbox);
  return sandbox.module.exports;
}
const H=require('../public/scripture-help-guides.js');

test('chapters.js is generated output, not something maintained by hand',()=>{
  // If someone edits chapters.js directly this fails and points at the tool.
  const result=execFileSync(process.execPath,[path.join(__dirname,'..','tools','build-chapters.cjs'),'--check'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  assert.match(result,/is current/,'Run node app/tools/build-chapters.cjs to regenerate');
});

test('the chapters the existing Help guides quote cannot be repointed',()=>{
  // A manifest edit once moved `grace` from Ephesians 4 to Romans 6, which
  // silently repointed the forgiveness and conflict guides at the wrong book.
  const chapters=loadChapters();
  const pinned={foundation:'Matthew 7',rest:'Matthew 11',wisdom:'James 1',connection:'Galatians 6',
    gratitude:'1 Thessalonians 5',grief:'Psalm 34',grace:'Ephesians 4'};
  for(const [key,reference] of Object.entries(pinned)){
    assert.equal(chapters[key].reference,reference,`${key} moved; a guide quotes it by name`);
  }
});

test('every guide passage resolves in both translations and is the dataset’s own text',()=>{
  const chapters=loadChapters(),data=loadData();
  for(const [id,guide] of Object.entries(H.guides)){
    for(const translation of ['web','asv']){
      const passage=H.passage(id,translation,chapters);
      assert.ok(passage,`${id} (${translation}) produced no passage rather than a guess`);
      const chapter=chapters[guide.chapterKey];
      const [first,last]=guide.verses;
      // Read straight from the dataset, independently of chapters.js.
      const rows=data.translations[translation][chapter.book][chapter.chapter-1];
      const expected=rows.filter(([,text])=>typeof text==='string'&&text.trim())
        .filter(([number])=>number>=first&&number<=last);
      assert.equal(expected.length,last-first+1,`${id} (${translation}) range is not fully present in the dataset`);
      assert.equal(passage.text,expected.map(([,text])=>text).join(' '),`${id} (${translation}) wording is not the dataset’s`);
      assert.ok(passage.reference.startsWith(chapter.reference),'the reference must name the chapter it quotes');
    }
  }
});

test('no verse in a chapter is anything other than the dataset’s wording',()=>{
  const chapters=loadChapters(),data=loadData();
  for(const [key,chapter] of Object.entries(chapters)){
    assert.ok(chapter.book,`${key} does not record which book it came from`);
    assert.ok(Number.isInteger(chapter.chapter),`${key} does not record its chapter number`);
    for(const translation of ['web','asv']){
      const rows=chapters[key].translations[translation];
      assert.ok(rows.length>0,`${key}/${translation} is empty`);
      for(const verse of rows){
        assert.ok(verse.text.trim().length>0,`${key}/${translation} verse ${verse.number} has no text`);
        const original=data.translations[translation][chapter.book][chapter.chapter-1]
          .find(([number])=>number===verse.number);
        assert.ok(original,`${key}/${translation} verse ${verse.number} is not in the dataset`);
        assert.equal(verse.text,original[1],`${key}/${translation} verse ${verse.number} wording differs from the dataset`);
      }
      // Verse numbers must stay in order so a quoted range cannot stitch itself.
      // Compared as text: chapters.js is parsed inside a vm, so its arrays carry
      // that realm's prototype and deepStrictEqual would fail on the prototype.
      const numbers=rows.map(v=>v.number).join(',');
      assert.equal(numbers,[...rows.map(v=>v.number)].sort((a,b)=>a-b).join(','),`${key}/${translation} verses are out of order`);
    }
    assert.ok(Number.isInteger(chapter.focus),`${key} has no focus verse`);
    assert.ok(chapter.translations.web.some(v=>v.number===chapter.focus),`${key} focus verse is missing`);
    for(const translation of ['web','asv']){
      assert.ok(chapter.sources[translation].startsWith('https://ebible.org/eng-'+translation+'/'),
        `${key} source must cite the translation it actually used`);
    }
  }
});

test('the library is broad enough to answer more than the original seven',()=>{
  const chapters=loadChapters();
  // A regression guard on the point of the exercise: categories that previously had
  // no honest home at all must keep one.
  for(const key of ['reading','judgetext','coming','science','otherfaiths','jesus','doubt','loved',
                    'justice','money','love','service','heal','weakness','waiting','absence','complaint','renewal']){
    assert.ok(chapters[key],`missing chapter for ${key}`);
  }
  assert.ok(Object.keys(chapters).length>=40,`expected a broad library, found ${Object.keys(chapters).length}`);
});
