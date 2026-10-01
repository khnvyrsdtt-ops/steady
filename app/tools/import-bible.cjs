#!/usr/bin/env node
'use strict';

// Build-only importer. Runtime searches read the bundled data and never contact
// eBible. Text comes from eBible's downloadable HTML, with layout and footnote
// markers removed; verse wording, punctuation and numbering are retained.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const target=path.resolve(__dirname,'../public');
const books=[
  ['GEN','Genesis',50],['EXO','Exodus',40],['LEV','Leviticus',27],['NUM','Numbers',36],['DEU','Deuteronomy',34],['JOS','Joshua',24],['JDG','Judges',21],['RUT','Ruth',4],['1SA','1 Samuel',31],['2SA','2 Samuel',24],['1KI','1 Kings',22],['2KI','2 Kings',25],['1CH','1 Chronicles',29],['2CH','2 Chronicles',36],['EZR','Ezra',10],['NEH','Nehemiah',13],['EST','Esther',10],['JOB','Job',42],['PSA','Psalms',150],['PRO','Proverbs',31],['ECC','Ecclesiastes',12],['SNG','Song of Solomon',8],['ISA','Isaiah',66],['JER','Jeremiah',52],['LAM','Lamentations',5],['EZK','Ezekiel',48],['DAN','Daniel',12],['HOS','Hosea',14],['JOL','Joel',3],['AMO','Amos',9],['OBA','Obadiah',1],['JON','Jonah',4],['MIC','Micah',7],['NAM','Nahum',3],['HAB','Habakkuk',3],['ZEP','Zephaniah',3],['HAG','Haggai',2],['ZEC','Zechariah',14],['MAL','Malachi',4],['MAT','Matthew',28],['MRK','Mark',16],['LUK','Luke',24],['JHN','John',21],['ACT','Acts',28],['ROM','Romans',16],['1CO','1 Corinthians',16],['2CO','2 Corinthians',13],['GAL','Galatians',6],['EPH','Ephesians',6],['PHP','Philippians',4],['COL','Colossians',4],['1TH','1 Thessalonians',5],['2TH','2 Thessalonians',3],['1TI','1 Timothy',6],['2TI','2 Timothy',4],['TIT','Titus',3],['PHM','Philemon',1],['HEB','Hebrews',13],['JAS','James',5],['1PE','1 Peter',5],['2PE','2 Peter',3],['1JN','1 John',5],['2JN','2 John',1],['3JN','3 John',1],['JUD','Jude',1],['REV','Revelation',22]
].map(([id,name,chapters])=>({id,name,chapters}));
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function decode(text){
  const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',shy:'',ndash:'–',mdash:'—',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',hellip:'…'};
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(match,key)=>{
    if(key[0]==='#')return String.fromCodePoint(key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10));
    if(Object.hasOwn(entities,key))return entities[key];
    throw Error('Unrecognized HTML entity '+match);
  });
}
function chapterText(html,reference){
  // Start at the chapter's numbered verse body and stop before navigation and
  // footnotes so explanatory material can never become a Scripture quotation.
  const start=html.search(/<span\s+class=["']verse["']/);
  if(start<0)throw Error('No verses in '+reference);
  let body=html.slice(start).split(/<ul\s+class=['"]tnav['"]|<div\s+class=['"]footnote['"]|<div\s+class=['"]copyright['"]/)[0];
  body=body.replace(/<a\b[^>]*\bclass=["']notemark["'][^>]*>[\s\S]*?<\/a>/g,'');
  // Section titles and Psalm superscriptions are not numbered verse text.
  body=body.replace(/<div\b[^>]*class=['"](?:s\d?|ms\d?|mr|r|d|sp|cl|chapterlabel)['"][^>]*>[\s\S]*?<\/div>/g,'');
  const matches=[...body.matchAll(/<span\s+class=["']verse["']\s+id=["']V(\d+)["'][^>]*>[^<]*<\/span>/g)];
  return matches.map((match,index)=>{
    const number=Number(match[1]);
    const fragment=body.slice(match.index+match[0].length,index+1<matches.length?matches[index+1].index:body.length);
    const text=decode(fragment.replace(/<\/?(?:div|p|br)\b[^>]*>/g,' ').replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
    // Empty numbered slots are intentional in this source where the verse is
    // present only as a manuscript-variant footnote (for example Luke 17:36).
    if(number<1||(index&&number<=Number(matches[index-1][1])))throw Error('Invalid verse '+reference+':'+number);
    return [number,text];
  });
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'steady-bible-import-'));
const data={schema:1,books,translations:{}};
const provenance={schema:1,retrievedAt:new Date().toISOString(),scope:'66 books shared by the Protestant, Catholic and Orthodox Old and New Testaments; additional deuterocanonical books are not included in this edition.',method:'Exact numbered verse text from eBible HTML; headings, footnotes and navigation excluded; whitespace normalized. Numbered slots whose content is a manuscript-variant footnote remain empty and are disclosed by the retrieval API.',translations:{}};
for(const [key,label] of [['web','World English Bible Classic'],['asv','American Standard Version (1901)']]){
  const url=`https://ebible.org/Scriptures/eng-${key}_html.zip`;
  const archive=path.join(temp,key+'.zip');
  execFileSync('curl',['--fail','--location','--silent','--show-error','--retry','2','--output',archive,url],{stdio:'inherit'});
  const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split(/\r?\n/);
  if(entries.some(entry=>entry.startsWith('/')||entry.split('/').includes('..')))throw Error('Unsafe archive paths');
  const extracted=path.join(temp,key);fs.mkdirSync(extracted);
  execFileSync('unzip',['-q',archive,'*.htm','-d',extracted]);
  const library={};let verseCount=0;
  for(const book of books){
    library[book.id]=[];
    for(let chapter=1;chapter<=book.chapters;chapter++){
      const filename=book.id+String(chapter).padStart(book.id==='PSA'?3:2,'0')+'.htm';
      const rows=chapterText(fs.readFileSync(path.join(extracted,filename),'utf8'),book.name+' '+chapter);
      library[book.id].push(rows);verseCount+=rows.length;
    }
  }
  data.translations[key]=library;
  provenance.translations[key]={name:label,source:url,homepage:`https://ebible.org/eng-${key}/`,license:'Public Domain',licenseUrl:`https://ebible.org/eng-${key}/copyright.htm`,archiveSha256:hash(fs.readFileSync(archive)),textSha256:hash(JSON.stringify(library)),books:books.length,chapters:books.reduce((sum,book)=>sum+book.chapters,0),verses:verseCount,coverage:books.map(book=>({book:book.name,chapters:book.chapters,verses:library[book.id].reduce((sum,chapter)=>sum+chapter.length,0)}))};
}
// Existing in-app chapters are the compatibility baseline: importing a newer
// revision must be reviewed rather than silently changing a saved quotation.
const sandbox={};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(target,'chapters.js'),'utf8')+'\nglobalThis.chapters=ScriptureChapters;',sandbox);
for(const chapter of Object.values(sandbox.chapters)){
  const match=chapter.reference.match(/^(.*) (\d+)$/);
  const book=books.find(book=>book.name===match[1]||(book.id==='PSA'&&match[1]==='Psalm'));
  if(!book)throw Error('Unknown legacy chapter '+chapter.reference);
  for(const key of ['web','asv']){
    const imported=data.translations[key][book.id][Number(match[2])-1];
    if(imported.length!==chapter.translations[key].length)throw Error('Verse count differs from existing '+chapter.reference+' '+key);
    for(const verse of chapter.translations[key])if(imported.find(row=>row[0]===verse.number)?.[1]!==verse.text)throw Error('Existing verse differs: '+chapter.reference+':'+verse.number+' '+key);
  }
}
const script="/* Public-domain Bible text. Rebuild with node app/tools/import-bible.cjs. Provenance: bible-sources.json. */\n(function(root){'use strict';const data="+JSON.stringify(data)+";if(typeof module==='object'&&module.exports)module.exports=data;else root.SteadyBibleData=data;})(typeof globalThis!=='undefined'?globalThis:this);\n";
provenance.bundleSha256=hash(script);
fs.writeFileSync(path.join(target,'bible-data.js'),script);
fs.writeFileSync(path.join(target,'bible-sources.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({bytes:Buffer.byteLength(script),sha256:provenance.bundleSha256,translations:Object.fromEntries(Object.entries(provenance.translations).map(([key,source])=>[key,{books:source.books,chapters:source.chapters,verses:source.verses}]))}));
console.log('Downloaded source archives retained for reproducibility: '+temp);
