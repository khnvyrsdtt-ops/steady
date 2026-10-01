const {test}=require('node:test');
const assert=require('node:assert/strict');
const reflection=require('../public/scripture-reflection.js');
const G=require('../public/guidance.js');
const fs=require('node:fs');
const vm=require('node:vm');

test('every bundled scripture theme offers reflection, prayer and a no-task choice',()=>{
  assert.deepEqual(Object.keys(reflection.themes),Object.keys(G.themes));
  for(const theme of Object.keys(G.themes))for(const choice of ['practice','pause','pray','sit']){
    const saved=JSON.parse(JSON.stringify({theme,choice}));
    const result=reflection.read(saved);
    assert.equal(result.theme,theme);assert.equal(result.choice,choice);
    assert.ok(result.title.length>3);assert.ok(result.copy.length>20);
  }
});
test('unrecognised or malformed stored reflections cannot select arbitrary content',()=>{
  for(const saved of [null,undefined,[],{},'foundation',{theme:'constructor',choice:'practice'},{theme:['foundation'],choice:'practice'},{theme:Object.create(null),choice:'practice'},{theme:{toString:null},choice:'practice'},{theme:'foundation',choice:'constructor'},{theme:'foundation',choice:'unknown'}])assert.equal(reflection.read(saved),null);
});
test('scripture reflection records a reflected day without adding completed actions or practice',()=>{
  const result=G.progress({'2026-09-23':{scriptureReflection:{theme:'wisdom',choice:'pray'}}});
  assert.equal(result.rows.length,1);assert.equal(result.rows[0].reflection,true);
  assert.equal(result.actions,0);assert.equal(result.practice,0);
  assert.equal(G.progress({'2026-09-23':{scriptureReflection:{theme:'wisdom',choice:'invented'}}}).rows.length,0);
});

test('reflection initializes with current navigation markup and its Home action remains usable',()=>{
  // Unknown selectors return null, as in the browser. In particular, the old
  // Learn return link and Home reflection shortcut no longer exist.
  class Element {
    constructor(tag='div',className='') {this.tag=tag;this.className=className;this.children=[];this.attrs={};this.events={};this.classList={add:name=>{this.className+=' '+name;}};}
    append(...nodes){this.children.push(...nodes);}
    insertBefore(node,before){const index=this.children.indexOf(before);if(index<0)this.append(node);else this.children.splice(index,0,node);}
    replaceChildren(...nodes){this.children=[...nodes];}
    get firstChild(){return this.children[0];}
    get lastChild(){return this.children.at(-1);}
    setAttribute(key,value){this.attrs[key]=value;}
    addEventListener(type,handler){this.events[type]=handler;}
    focus(){this.focused=true;}
    querySelector(selector){
      const matches=node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):
        selector==='[role="status"]'?node.attrs.role==='status':
        selector==='a[href="#learn/chapter"]'?node.tag==='a'&&node.href==='#learn/chapter':node.tag===selector;
      for(const child of this.children){if(matches(child))return child;const match=child.querySelector(selector);if(match)return match;}
      return null;
    }
  }
  const learn=new Element(),chapter=new Element('a');chapter.href='#learn/chapter';learn.append(chapter);
  const review=new Element(),optional=new Element('details','optional-write');review.append(optional);
  const hub=new Element(),passage=new Element('details','home-scripture'),passageContent=new Element('div','home-scripture-content');passage.append(passageContent);hub.append(passage);
  const listeners={},day={},destination=new Element(),content=new Element('div','scripture-response-content');
  destination.append(new Element('p','reflection-reference'),content);
  let saves=0;
  const sandbox={learn,review,hub,day,storageAvailable:true,save:()=>{saves++;return true;},renderHomeScripture(){},
    ScriptureLibrary:{foundation:{reference:'Matthew 7:24'}},
    document:{createElement:tag=>new Element(tag),addEventListener:(type,fn)=>(listeners[type]||=[]).push(fn)},
    window:{steadyExperience:{addPanel:()=>destination,scriptureChoice:()=>({key:'foundation'}),haptic(){}}}
  };
  assert.doesNotThrow(()=>vm.runInNewContext(fs.readFileSync(require.resolve('../public/scripture-reflection.js'),'utf8'),sandbox));
  const visit=route=>(listeners['steady:screen']||[]).forEach(fn=>fn({detail:route}));
  const homeAction=passageContent.querySelector('a');
  assert.equal(homeAction.href,'#learn/reflect');
  assert.equal(homeAction.textContent,'Reflect on this passage');
  visit('learn/reflect');
  assert.equal(destination.querySelector('.reflection-reference').textContent,'Matthew 7:24');
  content.querySelector('button').events.click();
  assert.equal(day.scriptureReflection.theme,'foundation');
  assert.equal(day.scriptureReflection.choice,'practice');
  assert.equal(saves,1);
  assert.equal(homeAction.textContent,'Return to your reflection');
  assert.equal(content.querySelector('[role="status"]').textContent,'Saved for today.');
  assert.equal(content.querySelector('a').href,'#today/scripture-step');
  assert.equal(review.querySelector('.scripture-day-summary').hidden,false);
  assert.doesNotThrow(()=>visit('home'));
});
