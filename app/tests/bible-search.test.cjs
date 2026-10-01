'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const B=require('../public/bible-search.js');
const D=require('../public/bible-data.js');
const publicDir=path.resolve(__dirname,'../public');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

test('bundled translations contain every chapter of all 66 shared books with provenance and intact checksums',()=>{
  const provenance=JSON.parse(fs.readFileSync(path.join(publicDir,'bible-sources.json'),'utf8'));
  assert.equal(D.books.length,66);
  assert.equal(D.books.reduce((sum,book)=>sum+book.chapters,0),1189);
  assert.equal(provenance.bundleSha256,sha(fs.readFileSync(path.join(publicDir,'bible-data.js'))));
  for(const translation of ['web','asv']){
    const source=provenance.translations[translation],library=D.translations[translation];
    assert.equal(source.license,'Public Domain');
    assert.equal(source.source,`https://ebible.org/Scriptures/eng-${translation}_html.zip`);
    assert.match(source.archiveSha256,/^[a-f0-9]{64}$/);
    assert.equal(source.textSha256,sha(JSON.stringify(library)));
    assert.deepEqual(Object.keys(library),D.books.map(book=>book.id));
    let verseSlots=0;
    for(const book of D.books){
      assert.equal(library[book.id].length,book.chapters,translation+' '+book.name);
      for(const [chapter,rows]of library[book.id].entries()){
        assert.ok(rows.length>0,book.name+' '+(chapter+1));let previous=0;
        for(const [number,text]of rows){
          assert.ok(Number.isInteger(number)&&number>previous,book.name+' '+(chapter+1));previous=number;
          assert.equal(typeof text,'string');assert.equal(text,text.trim());
          assert.doesNotMatch(text,/<\/?(?:span|div|a|p)\b|class=|HTML generated|notemark|&(?:#\d+|nbsp|amp);/);
          verseSlots++;
        }
      }
    }
    assert.equal(verseSlots,source.verses);
    assert.equal(source.chapters,1189);
  }
});

test('all existing curated chapter wording and verse numbering is preserved exactly in both translations',()=>{
  const sandbox={};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(publicDir,'chapters.js'),'utf8')+'\nglobalThis.existing=ScriptureChapters;',sandbox);
  for(const chapter of Object.values(sandbox.existing))for(const translation of ['web','asv']){
    const passage=B.getPassage(chapter.reference,translation);assert.equal(passage.ok,true,chapter.reference);
    assert.equal(JSON.stringify(passage.verses),JSON.stringify(chapter.translations[translation]),chapter.reference+' '+translation);
  }
});

test('references are recognized before lazy corpus loading and retrieval reports not loaded',()=>{
  const sandbox={};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(publicDir,'bible-search.js'),'utf8'),sandbox);
  const api=sandbox.SteadyBible;
  assert.equal(api.ready(),false);
  assert.equal(api.parseReference('What does Jn 3:16 mean?').reference,'John 3:16');
  assert.equal(api.getPassage('John 3:16').code,'not_loaded');
  assert.equal(api.search('forgiveness').results.length,0);
  assert.match(api.search('forgiveness').error,/loading/);
  sandbox.SteadyBibleData=D;
  assert.equal(api.ready(),true);
  assert.equal(api.getPassage('John 3:16').verses[0].number,16);
});

test('common full names, aliases, numbered books and questions resolve to the correct reference',()=>{
  for(const [input,expected]of [
    ['John 3:16','John 3:16'],['Jn. 3:16-18','John 3:16-18'],['Romans 8','Romans 8'],
    ['1 Corinthians 13:4–7','1 Corinthians 13:4-7'],['I Cor 13:4','1 Corinthians 13:4'],
    ['First John 4:8','1 John 4:8'],['2Tim 1:7','2 Timothy 1:7'],['III John 1:2','3 John 1:2'],
    ['What does John 3:16 mean?','John 3:16'],['Psalm 23','Psalm 23'],['Psalms 119:105','Psalm 119:105'],
    ['Song of Songs 2:1','Song of Solomon 2:1'],['Canticles 2:1','Song of Solomon 2:1'],['Rev 22:21','Revelation 22:21']
  ])assert.equal(B.parseReference(input)?.reference,expected,input);
  const chapter=B.parseReference('Romans 8');assert.equal(chapter.startVerse,null);assert.equal(chapter.endVerse,null);
  for(const book of D.books)assert.equal(B.parseReference(book.name+' 1:1').bookId,book.id,book.name);
});

test('single verses, inclusive ranges and complete chapters are returned without nearby-verse substitution',()=>{
  const verse=B.getPassage('John 3:16');
  assert.equal(verse.ok,true);assert.equal(verse.verses.length,1);assert.equal(verse.verses[0].number,16);
  assert.equal(verse.verses[0].text,'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.');
  assert.deepEqual(B.getPassage('Jn 3:16-18').verses.map(row=>row.number),[16,17,18]);
  assert.equal(B.getPassage('Romans 8').verses.length,39);
  assert.equal(B.getChapter('Romans',8).reference,'Romans 8');
  assert.equal(B.getChapter('ROM',8).reference,'Romans 8');
  assert.equal(B.getChapter('Psalms',119).verses.length,176);
  assert.equal(B.getPassage('Psalm 23:1').source,'https://ebible.org/eng-web/PSA023.htm#V1');
});

test('single-chapter books accept conventional verse shorthand without losing chapter access',()=>{
  for(const [input,expected]of [
    ['Jude 24','Jude 1:24'],['Jude 24–25','Jude 1:24-25'],['Jude 1-5','Jude 1:1-5'],
    ['Philemon 6','Philemon 1:6'],['Obadiah 15','Obadiah 1:15'],['2 John 6','2 John 1:6'],
    ['3 John 2','3 John 1:2'],['III John 2','3 John 1:2']
  ]){
    assert.equal(B.parseReference(input).reference,expected,input);
    assert.equal(B.getPassage(input).ok,true,input);
    assert.deepEqual(B.getPassage(input).verses,B.getPassage(expected).verses,input);
  }
  assert.equal(B.getPassage('Jude 1').verses.length,25);
  assert.equal(B.getChapter('Jude',1).verses.length,25);
  assert.equal(B.getPassage('Jude 1:1').verses.length,1);
  for(const input of ['Jude 26','Jude 24-26','Philemon 0','2 John 6-4','Jude 1:24-2:1']){
    assert.equal(B.getPassage(input).ok,false,input);
    assert.equal(B.getPassage(input).verses.length,0,input);
  }
});

test('ordinary words followed by numbers do not become unrelated book references',()=>{
  for(const input of ['I am 2 weeks behind','What is 3','he 4 years later','I lost my job 3 weeks ago','There are numbers 1 to 5','We should mark 2 items']){
    assert.equal(B.parseReference(input),null,input);
  }
  for(const [input,reference]of [['Am 2','Amos 2'],['Is 3?','Isaiah 3'],['Read Job 3','Job 3'],['What does Mark 2 mean?','Mark 2'],['Explain Numbers 1','Numbers 1'],['What does Am 2:1 mean?','Amos 2:1']]){
    assert.equal(B.parseReference(input).reference,reference,input);
    assert.equal(B.getPassage(input).ok,true,input);
  }
});

test('invalid bounds and ambiguous ranges report errors instead of returning a partial answer',()=>{
  for(const ref of ['John 0','John 22','John 9999:1','John 3:0','John 3:99','John 3:18-16','John 3:16-999','John 3:16-4:2','John 3-4','John 3:','John 3:16-','John 3:16,18']){
    assert.ok(B.parseReference(ref),'invalid known references still classify as references: '+ref);
    const result=B.getPassage(ref);assert.equal(result.ok,false,ref);assert.equal(result.verses.length,0,ref);assert.ok(result.error,ref);
  }
  assert.equal(B.parseReference('notabook 3:16'),null);
  assert.equal(B.getPassage('notabook 3:16').code,'invalid_reference');
  assert.equal(B.getChapter('constructor',1).ok,false);
  assert.equal(B.getPassage({bookId:'__proto__',chapter:1}).ok,false);
});

test('unsupported suffixes, multiple references and nonexistent numbered books never silently return a first verse',()=>{
  for(const input of [
    'John 3:16a','John 3:16.1','John 3:16;18','John 3:16 to 18','John 3:16 through 18',
    'John 3:16 and 18','John 3:16 & 18','John 3:16-17-18','John 3:16 and Romans 8:28','Psalm 23; John 3',
    'John 3 verse 16','John 3 v.16','John 3, verses 16-18',
    'John 3:16 / John 3:18','4 John 3:16','11 John 3:16','IV John 3:16','Fourth John 3:16'
  ]){
    assert.equal(B.getPassage(input).ok,false,input);
    assert.equal(B.getPassage(input).verses.length,0,input);
    assert.equal(B.search(input).results.length,0,input);
  }
  assert.equal(B.getPassage({bookId:'JHN',chapter:3,startVerse:16,endVerse:18,endChapter:4}).ok,false);
  assert.equal(B.getPassage('John 3:16 — what does it mean?').ok,true);
});

test('manuscript variant omissions are disclosed without inventing verse text',()=>{
  const omitted=B.getPassage('Matthew 17:21','asv');
  assert.equal(omitted.ok,false);assert.equal(omitted.code,'omitted_verse');assert.deepEqual(omitted.verses,[]);
  assert.deepEqual(omitted.omittedVerses,[21]);assert.match(omitted.error,/manuscript/);
  const surrounding=B.getPassage('Matthew 17:20-22','asv');
  assert.equal(surrounding.ok,true);assert.deepEqual(surrounding.verses.map(row=>row.number),[20,22]);assert.deepEqual(surrounding.omittedVerses,[21]);
  assert.match(B.getChapter('Matthew',17,'asv').note,/21/);
});

test('translation selection stays consistent and unsupported translations have an explicit WEB fallback',()=>{
  const asv=B.getPassage('John 3:16','ASV');
  assert.equal(asv.translation,'asv');assert.equal(asv.fallback,false);assert.match(asv.verses[0].text,/only begotten Son/);
  assert.equal(asv.source,'https://ebible.org/eng-asv/JHN03.htm#V16');
  const fallback=B.getPassage('John 3:16','NIV');
  assert.equal(fallback.ok,true);assert.equal(fallback.translation,'web');assert.equal(fallback.requestedTranslation,'niv');assert.equal(fallback.fallback,true);assert.match(fallback.note,/showing.*WEB/);
  assert.equal(fallback.verses[0].text,B.getPassage('John 3:16','web').verses[0].text);
});

test('ranked text search prioritizes the quoted phrase and returns exact verses with source links',()=>{
  const phrase=B.search('love is patient');
  assert.equal(phrase.results[0].reference,'1 Corinthians 13:4');
  assert.equal(phrase.results[0].text,B.getPassage('1 Corinthians 13:4').verses[0].text);
  const exact=B.search('"God so loved the world"');
  assert.equal(exact.results.length,1);assert.equal(exact.results[0].reference,'John 3:16');
  const reference=B.search('John 3:16-18');assert.deepEqual(reference.results.map(row=>row.number),[16,17,18]);
  assert.equal(B.search('John 3:99').results.length,0);assert.match(B.search('John 3:99').error,/verses 1–36/);
});

test('search expands close vocabulary without sending unsupported questions to an unrelated passage',()=>{
  const anxiety=B.search('anxiety',{limit:20});assert.ok(anxiety.results.length>0);
  assert.ok(anxiety.results.some(row=>/anxious|worry|worried/i.test(row.text)));
  const comfort=B.search('comfort',{limit:20});assert.ok(comfort.results.length>0);
  assert.ok(comfort.results.some(row=>/comfort/i.test(row.text)));
  const courage=B.search('courage',{limit:20});assert.ok(courage.results.length>0);
  assert.deepEqual(B.search('spaceships quantum warranty').results,[]);
  assert.deepEqual(B.search('why did Jesus invent smartphones').results,[]);
  assert.deepEqual(B.search('and the of please').results,[]);
  assert.deepEqual(B.search('').results,[]);
});

test('search does not broaden emotional words into unrelated cargo or abandonment accounts',()=>{
  const lonely=B.search('lonely',{limit:20});assert.ok(lonely.results.length>0);
  for(const row of lonely.results)assert.match(row.text,/\b(?:lonely|loneliness|lonesome)\b/i);
  const stress=B.search('stress',{limit:20});assert.ok(stress.results.length>0);
  for(const row of stress.results)assert.match(row.text,/\b(?:stress|distress|distressed|anxiety|anxious)\b/i);
  assert.equal(stress.results.some(row=>row.reference==='Exodus 23:5'),false);
  for(const row of B.search('rest',{limit:20}).results)assert.match(row.text,/\b(?:rest|rested|resting)\b/i);
});

test('long supported phrases work and no meaningful trailing query terms are silently dropped',()=>{
  const verse=B.getPassage('John 3:16').verses[0].text;
  assert.equal(B.search('"'+verse+'"').results[0].reference,'John 3:16');
  const query='God loved world gave only born Son whoever believes not perish eternal life spaceships';
  assert.deepEqual(B.search(query).results,[]);
});

test('text results respect translation and finite result limits',()=>{
  const result=B.search('faith',{translation:'asv',limit:3});
  assert.equal(result.translation,'asv');assert.equal(result.results.length,3);assert.ok(result.total>3);
  for(const row of result.results){assert.match(row.source,/eng-asv/);assert.equal(row.text,B.getPassage(row.reference,'asv').verses[0].text);}
  assert.equal(B.search('love',{limit:200}).results.length,20);
  assert.equal(B.search('love',{limit:0}).results.length,1);
  assert.equal(B.search('love',{limit:NaN}).results.length,6);
  assert.equal(B.search('love',{translation:'unknown'}).fallback,true);
});
