const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

class Element{
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.events={};this._text='';this.isConnected=true;}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this.attributes[name];}
  addEventListener(name,callback){this.events[name]=callback;}
  focus(options){this.focused=options;}
  set textContent(text){this._text=String(text);this.children=[];}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  find(className){return this.all(className)[0];}
  all(className){return this.children.flatMap(child=>[...(child.className?.split(' ').includes(className)?[child]:[]),...child.all(className)]);}
}
function app({bible=true}={}){
  const sandbox={window:{},document:{createElement:tag=>new Element(tag)}};
  vm.createContext(sandbox);
  const files=['chapters.js','scripture-help-guides.js',...(bible?['bible-data.js','bible-search.js']:[]),'chat-chapter.js'];
  for(const file of files)vm.runInContext(source(file),sandbox);
  if(bible)sandbox.window.SteadyBible=sandbox.SteadyBible;
  const reply=new Element('div'),trigger=new Element('button');trigger.textContent='Read chapter';
  let layouts=0;
  return {reply,trigger,other:()=>new Element('button'),get layouts(){return layouts;},
    toggle(reading,translation='web',source=trigger){return sandbox.window.SteadyChatChapter.toggle({reply,source,reading,translation,layout(){layouts++;}});}};
}

test('a saved guide opens the actual full chapter and exact range, not its broader theme',()=>{
  const reader=app(),chapter=reader.toggle({key:'grace',guide:'anger'});
  assert.equal(chapter.find('chat-chapter-title').textContent,'James 1 · WEB');
  assert.equal(chapter.all('chapter-verse').length,27);
  assert.deepEqual(chapter.all('selected-verse').map(row=>row.find('verse-number').textContent),['19','20']);
  assert.match(chapter.find('chat-chapter-description').textContent,/James 1:19–20/);
  assert.equal(chapter.find('chat-chapter-source').href,'https://ebible.org/eng-web/JAS01.htm');
  assert.equal(reader.trigger.textContent,'Read chapter');
});

test('legacy entries without a guide keep their saved theme and focus verse',()=>{
  const chapter=app().toggle({key:'rest'});
  assert.equal(chapter.find('chat-chapter-title').textContent,'Matthew 11 · WEB');
  assert.equal(chapter.all('chapter-verse').length,30);
  assert.deepEqual(chapter.all('selected-verse').map(row=>row.find('verse-number').textContent),['28']);
});

test('study passage readers include the full verified chapter with selected verses',()=>{
  const reader=app(),chapter=reader.toggle({studyReference:'John 3:16–17'});
  assert.equal(chapter.find('chat-chapter-title').textContent,'John 3 · WEB');
  assert.equal(chapter.all('chapter-verse').length,36);
  assert.deepEqual(chapter.all('selected-verse').map(row=>row.find('verse-number').textContent),['16','17']);
  assert.match(chapter.all('selected-verse')[0].textContent,/God so loved the world/);
});

test('a whole chapter reference does not highlight every verse',()=>{
  const chapter=app().toggle({studyReference:'Psalm 23'});
  assert.equal(chapter.all('chapter-verse').length,6);
  assert.equal(chapter.all('selected-verse').length,0);
  assert.equal(chapter.find('chat-chapter-description').textContent,'The full chapter.');
});

test('omitted verses open surrounding text without inventing the missing words',()=>{
  const chapter=app().toggle({studyReference:'Acts 8:37'},'web');
  assert.equal(chapter.find('chat-chapter-title').textContent,'Acts 8 · WEB');
  assert.equal(chapter.all('selected-verse').length,0);
  assert.ok(chapter.all('chapter-verse').length>30);
  assert.match(chapter.find('chat-chapter-note').textContent,/37.*no main-text wording/);
});

test('WEB and ASV readers carry their own wording and translation source',()=>{
  const reader=app(),web=reader.toggle({studyReference:'John 3:16'});
  const webText=web.all('selected-verse')[0].textContent;
  const asv=reader.toggle({studyReference:'John 3:16'},'asv');
  assert.equal(reader.reply.all('chat-chapter').length,1);
  assert.equal(asv.find('chat-chapter-title').textContent,'John 3 · ASV');
  assert.notEqual(asv.all('selected-verse')[0].textContent,webText);
  assert.match(asv.find('chat-chapter-source').href,/eng-asv/);
});

test('toggling closes only this reader, restores source focus, and never edits the source label',()=>{
  const reader=app(),chapter=reader.toggle({key:'rest'});
  assert.equal(reader.trigger.attributes['aria-expanded'],'true');
  assert.equal(reader.trigger.attributes['aria-controls'],chapter.id);
  assert.equal(chapter.find('chat-chapter-title').focused.preventScroll,true);
  assert.equal(reader.toggle({key:'rest'}),null);
  assert.equal(reader.reply.all('chat-chapter').length,0);
  assert.equal(reader.trigger.attributes['aria-expanded'],'false');
  assert.equal(reader.trigger.attributes['aria-controls'],undefined);
  assert.equal(reader.trigger.focused.preventScroll,true);
  assert.equal(reader.trigger.textContent,'Read chapter');
  assert.equal(reader.layouts,2);
});

test('a different chapter replaces the reader and close returns focus to its own source',()=>{
  const reader=app(),other=reader.other();
  reader.toggle({key:'rest'});
  const chapter=reader.toggle({key:'grief'},'web',other);
  assert.equal(reader.reply.all('chat-chapter').length,1);
  assert.equal(reader.trigger.attributes['aria-expanded'],'false');
  assert.equal(other.attributes['aria-expanded'],'true');
  const close=chapter.find('chat-chapter-close');
  assert.equal(close.type,'button');close.events.click();
  assert.equal(reader.reply.all('chat-chapter').length,0);
  assert.equal(other.attributes['aria-expanded'],'false');
  assert.equal(other.focused.preventScroll,true);
});

test('missing library, unsupported ranges and unknown guides fail visibly without navigation',()=>{
  for(const [reader,reading] of [
    [app({bible:false}),{studyReference:'John 3:16'}],
    [app(),{studyReference:'John 3:16–4:2'}],
    [app(),{studyReference:'John 99:1'}],
    [app(),{key:'rest',guide:'invented'}],
    [app(),{key:'invented'}]
  ]){
    const chapter=reader.toggle(reading);
    assert.equal(chapter.find('chat-chapter-title').textContent,'Chapter unavailable');
    assert.equal(chapter.all('chapter-verse').length,0);
    assert.ok(chapter.find('chat-chapter-close'));
    assert.ok(chapter.children.some(child=>child.attributes.role==='status'&&child.textContent));
  }
});
