const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const G=require('../public/guidance.js');
const H=require('../public/scripture-help-guides.js');
const B=require('../public/bible-search.js');
const source=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

// Exercise the production chapter renderer and route/change listeners. The DOM
// adapter does not select passages, highlight ranges, or clear reading state.
class Element {
  constructor(tag='div') {this.tag=tag;this.children=[];this.className='';this._text='';this.hidden=false;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];this._text='';}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
}

function open({theme='grace',helpLibrary=H,bibleLibrary}={}){
  const fields=new Map(),listeners={},classes=new Set();
  const day={scriptureTheme:theme,scriptureReflection:{theme:'wisdom',choice:'pray'},scriptureDirection:{theme:'wisdom',choice:'pray',active:true}};
  const state={profile:{},savedPassages:['foundation','wisdom'],days:{today:day}};
  const before=JSON.stringify(state);
  let saves=0;
  const document={
    documentElement:{dataset:{translation:'web'}},
    body:{classList:{contains:name=>classes.has(name),toggle:(name,on)=>on?classes.add(name):classes.delete(name)}},
    createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),
    getElementById:id=>fields.get(id),addEventListener:(type,listener)=>(listeners[type]||=[]).push(listener)
  };
  const X={
    scriptureChoice:()=>({key:day.scriptureTheme}),
    addPanel(route,title,html){
      const panel=new Element('section');
      for(const [,tag,id]of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g)){
        const element=new Element(tag);fields.set(id,element);panel.append(element);
      }
      return panel;
    }
  };
  const sandbox={X,G,node:(tag,cls,text)=>{const element=new Element(tag);element.className=cls||'';if(text)element.textContent=text;return element;},
    document,state,day,invite:new Element(),supportPicker:new Element(),renderWelcome(){},renderPersonal(){},save(){saves++;return true;}
  };
  if(helpLibrary!==null)sandbox.SteadyScriptureHelp=helpLibrary;
  if(bibleLibrary)sandbox.SteadyBible=bibleLibrary;
  vm.createContext(sandbox);
  vm.runInContext(source('chapters.js')+'\nglobalThis.chapterData=ScriptureChapters;',sandbox);
  const script=source('onboarding.js'),start=script.indexOf("  const chapter=X.addPanel('learn/chapter'"),end=script.indexOf('  renderScreen();',start);
  assert.ok(start>=0&&end>start,'chapter renderer and listeners remain in onboarding');
  vm.runInContext('(()=>{'+script.slice(start,end)+'})()',sandbox);
  const visit=route=>{for(const listener of listeners['steady:screen']||[])listener({detail:route});};
  return {X,state,day,visit,classes,chapterData:sandbox.chapterData,
    read(selection){X.helpReading=selection;visit('learn/chapter');},
    translation(value){document.documentElement.dataset.translation=value;for(const listener of listeners.change||[])listener({target:{id:'setting-translation'}});},
    get title(){return fields.get('chapter-title').textContent;},get description(){return fields.get('chapter-description').textContent;},
    get verses(){return fields.get('chapter-verses').children;},
    get selected(){return fields.get('chapter-verses').children.filter(node=>node.className.split(/\s+/).includes('selected-verse')).map(node=>Number(node.children[0].textContent));},
    assertUnchanged(){assert.equal(saves,0);assert.equal(JSON.stringify(state),before,'reading must not rewrite themes, reflections, steps or saved passages');}
  };
}

test('every curated Help passage opens its full chapter and highlights the complete range in both translations',()=>{
  const app=open();
  for(const [id,guide]of Object.entries(H.guides))for(const translation of ['web','asv']){
    app.translation(translation);
    app.read({guide:id,key:guide.theme,sourceId:'saved-'+id});
    const passage=H.passage(id,translation,app.chapterData),chapter=app.chapterData[passage.chapterKey];
    assert.equal(app.title,chapter.reference+' · '+translation.toUpperCase(),id);
    assert.equal(app.description,'The full chapter. '+passage.reference+' is highlighted.',id);
    assert.deepEqual(app.selected,Array.from({length:guide.verses[1]-guide.verses[0]+1},(_,index)=>guide.verses[0]+index),id);
    assert.equal(app.verses.length,chapter.translations[translation].length,id+' retains the entire chapter');
    for(const [index,row]of chapter.translations[translation].entries())assert.equal(app.verses[index].textContent,String(row.number)+row.text,id);
  }
  app.assertUnchanged();
});

test('a guide may open a different chapter without replacing its saved theme identity',()=>{
  const app=open();
  const entry=Object.entries(H.guides).find(([,guide])=>guide.chapterKey!==guide.theme);
  assert.ok(entry,'the curated collection includes a cross-theme chapter');
  const [id,guide]=entry;
  app.read({guide:id,key:guide.theme,sourceId:'saved'});
  assert.match(app.title,new RegExp('^'+app.chapterData[guide.chapterKey].reference.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.equal(app.X.helpReading.key,guide.theme);
  app.assertUnchanged();
});

test('legacy Help entries and unknown guides retain the saved base verse instead of the daily selection',()=>{
  for(const guide of [undefined,'retired-guide','constructor','__proto__']){
    const app=open();app.read({guide,key:'rest',sourceId:'legacy'});
    assert.equal(app.title,'Matthew 11 · WEB');
    assert.deepEqual(app.selected,[28]);
    assert.equal(app.description,'The full chapter. Matthew 11:28 is highlighted.');
    app.assertUnchanged();
  }
});

test('the ordinary chapter route and an unavailable Help library remain safe',()=>{
  const app=open({helpLibrary:null});app.visit('learn/chapter');
  assert.equal(app.title,'Ephesians 4 · WEB');assert.deepEqual(app.selected,[32]);
  assert.equal(app.description,'The full chapter. Verse 32 is highlighted.');
  app.read({guide:'anxiety',key:'rest',sourceId:'saved'});
  assert.equal(app.title,'Matthew 11 · WEB');assert.deepEqual(app.selected,[28]);
  app.read({guide:'missing',key:'constructor',sourceId:'invalid'});
  assert.equal(app.title,'Ephesians 4 · WEB');assert.deepEqual(app.selected,[32]);
  app.assertUnchanged();
});

test('a study reference never silently becomes the daily verse when the Bible library is unavailable',()=>{
  for(const bibleLibrary of [undefined,{}, {ready:()=>false}]){
    const app=open({bibleLibrary});app.visit('learn/chapter');
    assert.equal(app.selected.length,1);
    app.read({studyReference:'John 3:16',sourceId:'study'});
    assert.equal(app.title,'Passage unavailable.');
    assert.match(app.description,/Bible text is not available yet/);
    assert.equal(app.verses.length,0);assert.deepEqual(app.selected,[]);
    app.assertUnchanged();
  }
});

test('study references open complete Bible chapters and highlight only the requested verses in either translation',()=>{
  const app=open({bibleLibrary:B});
  for(const translation of ['web','asv'])for(const [reference,numbers]of [['John 3:16',[16]],['Romans 8:1-4',[1,2,3,4]]]){
    app.translation(translation);
    app.read({studyReference:reference,sourceId:'study',key:'constructor'});
    const parsed=B.parseReference(reference),chapter=B.getChapter(parsed.bookId,parsed.chapter,translation);
    assert.equal(app.title,chapter.chapterReference+' · '+translation.toUpperCase());
    assert.equal(app.description,'The full chapter. '+reference+' is highlighted.');
    assert.deepEqual(app.selected,numbers);
    assert.equal(app.verses.length,chapter.verses.length);
    for(const [index,verse]of chapter.verses.entries())assert.equal(app.verses[index].textContent,String(verse.number)+verse.text);
  }
  app.assertUnchanged();
});

test('a full-chapter study request highlights no verse and keeps the daily theme separate',()=>{
  const app=open({bibleLibrary:B});
  app.read({studyReference:'John 3',sourceId:'chapter'});
  assert.equal(app.title,'John 3 · WEB');assert.equal(app.description,'The full chapter.');
  assert.equal(app.verses.length,36);assert.deepEqual(app.selected,[]);
  app.visit('home');assert.equal(app.X.helpReading,undefined);
  app.visit('learn/chapter');assert.equal(app.title,'Ephesians 4 · WEB');assert.deepEqual(app.selected,[32]);
  app.assertUnchanged();
});

test('invalid study references clear the prior chapter without showing an unrelated or fabricated verse',()=>{
  const app=open({bibleLibrary:B});
  for(const reference of ['John 99:1','John 3:999','John 3:18-16','constructor','__proto__','',null,{bookId:'JHN',chapter:3}]){
    app.read({studyReference:'John 3:16',sourceId:'valid'});
    assert.equal(app.verses.length,36);
    app.read({studyReference:reference,sourceId:'invalid',key:'rest'});
    assert.equal(app.title,'Passage unavailable.');assert.ok(app.description);
    assert.equal(app.verses.length,0);assert.deepEqual(app.selected,[]);
  }
  app.assertUnchanged();
});

test('Settings preserves an explicit study reference and changing translation re-renders that chapter',()=>{
  const app=open({bibleLibrary:B}),selection={studyReference:'John 3:16',sourceId:'study'};
  app.read(selection);const webText=app.verses[15].textContent;
  app.visit('settings');app.visit('settings/personal');app.translation('asv');
  assert.equal(app.X.helpReading,selection);
  app.visit('settings');app.classes.add('settings-open');app.visit('settings/about');
  assert.equal(app.X.helpReading,selection);
  app.visit('learn/chapter');assert.equal(app.title,'John 3 · ASV');assert.deepEqual(app.selected,[16]);
  assert.notEqual(app.verses[15].textContent,webText);
  app.translation('web');assert.equal(app.title,'John 3 · WEB');assert.equal(app.verses[15].textContent,webText);
  app.assertUnchanged();
});

test('a verse omitted from a translation shows its surrounding chapter and an honest explanation',()=>{
  const app=open({bibleLibrary:B});app.translation('asv');
  app.read({studyReference:'Matthew 17:21',sourceId:'omitted'});
  assert.equal(app.title,'Matthew 17 · ASV');assert.deepEqual(app.selected,[]);
  assert.match(app.description,/Verse 21 has no main-text wording/);
  assert.equal(app.verses.some(verse=>verse.children[0].textContent==='21'),false);
  assert.equal((app.description.match(/Verse 21 has no main-text wording/g)||[]).length,1,'the shared chapter and passage note is not repeated');
  app.read({studyReference:'Matthew 17:20-22',sourceId:'range'});
  assert.deepEqual(app.selected,[20,22]);assert.match(app.description,/Verse 21 has no main-text wording/);
  app.assertUnchanged();
});

test('invalid or out-of-chapter ranges fall back to the original saved verse',()=>{
  for(const verses of [[30,28],[0,2],[28,31],['28',30],[28],[28,29,30]]){
    const app=open({helpLibrary:{passage:()=>({chapterKey:'rest',verses,reference:'Invalid range'})}});
    app.read({guide:'invalid',key:'wisdom',sourceId:'saved'});
    assert.equal(app.title,'James 1 · WEB');assert.deepEqual(app.selected,[5]);
    app.assertUnchanged();
  }
});

test('Settings and its subpages preserve Help reading and apply the selected translation on return',()=>{
  const app=open();const selection={guide:'anxiety',key:'rest',sourceId:'saved'};
  app.read(selection);app.visit('settings');app.visit('settings/personal');app.translation('asv');
  assert.equal(app.X.helpReading,selection);
  app.visit('settings');app.classes.add('settings-open');app.visit('settings/about');app.visit('settings');
  assert.equal(app.X.helpReading,selection,'Sources & limits opened from Settings preserves the return reading');
  app.visit('learn/chapter');
  assert.equal(app.title,'Matthew 11 · ASV');assert.deepEqual(app.selected,[28,29,30]);
  app.translation('web');assert.equal(app.title,'Matthew 11 · WEB');
  app.assertUnchanged();
});

test('leaving for ordinary screens clears Help reading so Home and reflection keep their own passage',()=>{
  for(const route of ['home','today/feelings','review','learn/scripture','learn/reflect','learn/saved','today/step']){
    const app=open();app.read({guide:'anxiety',key:'rest',sourceId:'saved'});
    app.visit('settings');app.visit(route);
    assert.equal(app.X.helpReading,undefined,route);
    app.visit('learn/chapter');
    assert.equal(app.title,'Ephesians 4 · WEB',route);assert.deepEqual(app.selected,[32],route);
    app.assertUnchanged();
  }
});

test('a fresh chapter visit uses the daily passage rather than inferring a Help request',()=>{
  const app=open();app.visit('learn/chapter');
  assert.equal(app.X.helpReading,undefined);
  assert.equal(app.title,'Ephesians 4 · WEB');assert.deepEqual(app.selected,[32]);
  app.assertUnchanged();
});
