const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const G=require('../public/guidance.js');
const source=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

// Run the production handlers against a small DOM. This adapter has no profile,
// routing, check-in, persistence, or chapter-rendering logic from the application.
class Element {
  constructor(tag='div') {
    this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.events={};
    this.className='';this._text='';this.hidden=false;this.value='';
    this.classList={
      toggle:(name,on)=>{const classes=new Set(this.className.split(/\s+/).filter(Boolean));if(on)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');},
      contains:name=>this.className.split(/\s+/).includes(name)
    };
  }
  append(...nodes) {
    for(const node of nodes){node.remove();node.parent=this;this.children.push(node);if(this.tag==='select'&&this.children.length===1)this.value=node.value;}
  }
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}}
  after(node){const parent=this.parent,index=parent.children.indexOf(this);node.remove();node.parent=parent;parent.children.splice(index+1,0,node);}
  replaceChildren(...nodes){for(const child of this.children.slice())child.remove();this._text='';this.append(...nodes);}
  get lastChild(){return this.children.at(-1)||null;}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set textContent(value){this.replaceChildren();this._text=String(value);}
  setAttribute(key,value){this.attrs[key]=String(value);if(key==='id')this.id=value;if(key==='class')this.className=value;if(key.startsWith('data-'))this.dataset[key.slice(5)]=value;}
  addEventListener(type,fn){this.events[type]=fn;}
  set innerHTML(html){
    this.replaceChildren();const stack=[this];
    for(const token of html.match(/<\/?[^>]+>|[^<]+/g)||[]){
      if(token.startsWith('</')){stack.pop();continue;}
      if(token.startsWith('<')){
        const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
        const child=new Element(tag);
        for(const attr of token.matchAll(/([\w-]+)="([^"]*)"/g))child.setAttribute(attr[1],attr[2]);
        stack.at(-1).append(child);
        if(!['input','br','hr','img','meta','link'].includes(tag)&&!token.endsWith('/>'))stack.push(child);
      }else{const text=new Element('#text');text.textContent=token;stack.at(-1).append(text);}
    }
  }
  querySelectorAll(selector){
    const matches=(node,part)=>{
      if(part.startsWith('#'))return node.id===part.slice(1);
      if(part.startsWith('.'))return node.className.split(/\s+/).includes(part.slice(1));
      if(part.startsWith('[')){
        const [,key,,value]=part.match(/^\[([\w-]+)(=(?:["']?)([^"'\]]+)["']?)?\]$/)||[];
        const actual=key?.startsWith('data-')?node.dataset[key.slice(5)]:node.attrs[key];
        return value===undefined?actual!==undefined:actual===value;
      }
      return node.tag===part;
    };
    const descendants=(node,part)=>node.children.flatMap(child=>[...(matches(child,part)?[child]:[]),...descendants(child,part)]);
    return selector.split(/\s+/).reduce((nodes,part)=>nodes.flatMap(node=>descendants(node,part)),[this]);
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}

function open({profile={},day:initialDay={},history={},writable=true,route='home',theme='foundation',translation='web'}={}){
  const state={profile:structuredClone(profile),days:structuredClone(history),scriptureRequests:[{id:'saved',text:'A private earlier entry'}],learning:{legacy:{successes:2}}};
  const day={context:{},...structuredClone(initialDay)};state.days['2026-09-25']=day;
  const root=new Element(),mind=new Element(),hub=new Element(),preferences=new Element();preferences.id='guidance-preferences';
  mind.innerHTML='<div class="eyebrow"></div><h3></h3><p class="card-description"></p><div class="need-grid"></div>';
  // Build the check-in from the shipped markup so label assertions test the
  // real interface rather than a fixture's placeholder text.
  const shipped=fs.readFileSync(require.resolve('../public/index.html'),'utf8');
  const grid=shipped.match(/<div class="need-grid"[\s\S]*?<\/div>\s*<\/div>|<div class="need-grid"[\s\S]*?(?=<details)/)?.[0]||'';
  for(const need of ['calm','clarity','grow','connection','progress','rest']){
    const button=grid.match(new RegExp('<button data-need="'+need+'"[\\s\\S]*?</button>'))?.[0];
    const control=new Element('button');control.dataset.need=need;
    control.innerHTML=button?button.replace(/^<button[^>]*>/,'').replace(/<\/button>$/,''):'<span>icon</span><span>'+need+'</span>';
    mind.querySelector('.need-grid').append(control);
  }
  root.append(mind,hub,preferences);
  const body=new Element('body'),listeners={},panels={},titles={},toasts=[];
  let currentRoute=route,selectedTheme=theme,stored,saves=0,checks=0,recommendations=0;
  const document={body,documentElement:{dataset:{translation}},
    createElement:tag=>new Element(tag),createTextNode:text=>{const node=new Element('#text');node.textContent=text;return node;},
    getElementById:id=>root.querySelector('#'+id),querySelectorAll:selector=>root.querySelectorAll(selector),
    addEventListener:(type,fn)=>(listeners[type]||=[]).push(fn)};
  function visit(next){
    assert.ok(['home','today/step','today/check-in',...Object.keys(panels)].includes(next),'navigation targets an available route: '+next);
    currentRoute=next;
    for(const [key,panel]of Object.entries(panels))panel.hidden=key!==next;
    for(const fn of listeners['steady:screen']||[])fn({detail:next});
  }
  const sandbox={mind,hub,state,day,document,SteadyGuide:G,SteadyIcons:{svg:()=>'<svg></svg>'},
    checkDay:()=>checks++,save:()=>{saves++;if(writable)stored=structuredClone(state);return writable;},
    renderRecommendation:()=>recommendations++,navigateScreen:visit,renderScreen:()=>visit(currentRoute),toast:message=>toasts.push(message),
    window:{steadyExperience:{
      addPanel:(key,title,html)=>{const panel=new Element('section');panel.innerHTML=html;panel.hidden=true;panels[key]=panel;titles[key]=title;root.append(panel);return panel;},
      scriptureChoice:()=>({key:selectedTheme})
    }}
  };
  vm.createContext(sandbox);
  vm.runInContext(source('chapters.js')+'\nglobalThis.chapterData=ScriptureChapters;',sandbox);
  vm.runInContext(source('onboarding.js'),sandbox);
  const form=key=>panels[key].querySelector('form');
  const values=key=>Object.fromEntries(form(key).querySelectorAll('select').map(select=>[select.name,select.value]));
  return {state,day,root,mind,hub,preferences,body,panels,titles,toasts,visit,form,values,chapterData:sandbox.chapterData,
    change(key,values){for(const select of form(key).querySelectorAll('select'))if(Object.hasOwn(values,select.name))select.value=values[select.name];},
    submit(key){let prevented=false;form(key).events.submit({preventDefault:()=>prevented=true});assert.equal(prevented,true);},
    chapter(key,version){selectedTheme=key;document.documentElement.dataset.translation=version;visit('learn/chapter');},
    get route(){return currentRoute;},get stored(){return stored;},get saves(){return saves;},get checks(){return checks;},get recommendations(){return recommendations;}
  };
}

const status=panel=>panel.querySelector('[role="status"]').textContent;

test('initialization registers one-screen preferences, restores defaults, and does not write user data',()=>{
  const app=open({route:'welcome'});
  assert.deepEqual(Object.keys(app.panels),['welcome','settings/personal','learn/chapter']);
  assert.equal(app.titles.welcome,'Make Steady yours');
  assert.equal(app.panels.welcome.hidden,false);
  assert.equal(app.body.classList.contains('onboarding-screen'),true);
  assert.deepEqual(Object.keys(app.values('welcome')),['priority','goal']);
  assert.deepEqual(app.values('welcome'),{priority:G.defaults.priority,goal:G.defaults.goal});
  assert.equal(app.saves,0);
  assert.equal(app.hub.querySelector('a'),null,'Home has no setup invitation');
  assert.equal(app.preferences.querySelector('a').href,'#settings/personal');
});

test('opening either preference screen restores saved choices and discards unsaved control edits',()=>{
  const app=open({profile:{priority:'explore',goal:'faith',approach:'practical'},route:'settings/personal'});
  const expected={priority:'explore',goal:'faith'};
  assert.deepEqual(app.values('settings/personal'),expected);
  app.change('settings/personal',{goal:'work'});
  app.visit('home');app.visit('settings/personal');
  assert.deepEqual(app.values('settings/personal'),expected);
  app.visit('welcome');
  assert.deepEqual(app.values('welcome'),expected);
  assert.equal(app.saves,0);
});

test('saving changes only exposed preferences and current starting overrides while preserving legacy data and daily conditions',()=>{
  const profile={priority:'build',goal:'faith',approach:'gentle',areas:['faith','learning','work'],aspiration:'finish',obstacle:'time',worldview:'christian',value:'truth',interest:'memory',level:'stretch',useNotes:false,customLegacy:{keep:true}};
  const initialDay={need:'rest',context:{goal:'faith',approach:'gentle',time:'10',energy:'low',environment:'busy'},mind:'Keep this note',outcomes:[{id:'older',rating:'useful'}]};
  const history={'2026-09-24':{reflection:'Keep yesterday',actionLog:[{id:'completed'}]}};
  const app=open({profile,day:initialDay,history,route:'settings/personal'});
  const previous=structuredClone(app.state);
  app.change('settings/personal',{priority:'decide',goal:'work'});
  app.submit('settings/personal');
  assert.deepEqual(structuredClone(app.state.profile),{...profile,priority:'decide',goal:'work',areas:['work','faith','learning'],onboardingStatus:'complete'});
  assert.deepEqual(app.day.context,{approach:'gentle',time:'10',energy:'low',environment:'busy'});
  assert.equal(app.day.need,'clarity');
  assert.equal(app.day.mind,initialDay.mind);
  assert.deepEqual(app.day.outcomes,initialDay.outcomes);
  assert.deepEqual(app.state.days['2026-09-24'],previous.days['2026-09-24']);
  assert.deepEqual(app.state.scriptureRequests,previous.scriptureRequests);
  assert.deepEqual(app.state.learning,previous.learning);
  assert.deepEqual(app.stored,structuredClone(app.state));
  assert.equal(app.route,'settings/personal');
  assert.equal(status(app.panels['settings/personal']),'Preferences saved.');
  assert.equal(app.checks,1);assert.equal(app.recommendations,1);
});

test('a general focus preserves earlier life areas and invalid choice values fall back to supported defaults',()=>{
  const app=open({profile:{goal:'faith',areas:['faith','work'],priority:'restore',approach:'practical'},route:'settings/personal'});
  app.change('settings/personal',{goal:'general',priority:'unknown'});
  app.submit('settings/personal');
  assert.equal(app.state.profile.goal,'general');
  assert.deepEqual([...app.state.profile.areas],['faith','work']);
  assert.equal(app.state.profile.priority,G.defaults.priority);
  assert.equal(app.state.profile.approach,'practical');
});

test('retired guidance tone is not exposed or rewritten when either preference form is saved',()=>{
  for(const route of ['welcome','settings/personal'])for(const approach of [undefined,'gentle','practical','legacy-tone']){
    const profile=approach===undefined?{}:{approach};
    const app=open({profile,day:{context:{approach:'legacy-day-tone',energy:'low'}},route});
    assert.deepEqual(Object.keys(app.values(route)),['priority','goal']);
    assert.doesNotMatch(app.panels[route].textContent,/Guidance tone|Gentle|Direct/);
    app.change(route,{goal:'work'});
    app.submit(route);
    assert.equal(app.state.profile.approach,approach);
    assert.equal(Object.hasOwn(app.state.profile,'approach'),approach!==undefined);
    assert.deepEqual(app.day.context,{approach:'legacy-day-tone',energy:'low'});
    assert.equal(app.stored.profile.approach,approach);
    assert.equal(app.stored.days['2026-09-25'].context.approach,'legacy-day-tone');
  }
});

test('welcome submission persists choices and reaches the existing next-step route',()=>{
  const app=open({route:'welcome'});
  app.change('welcome',{priority:'restore',goal:'health'});
  app.submit('welcome');
  assert.equal(app.route,'today/step');
  assert.equal(app.day.need,'rest');
  assert.equal(app.state.profile.onboardingStatus,'complete');
  assert.equal(app.stored.profile.goal,'health');
  assert.equal(app.body.classList.contains('onboarding-screen'),false);
  app.visit('home');assert.equal(app.hub.querySelector('a'),null);
});

test('skip preserves existing preferences and daily history without applying unsaved choices',()=>{
  const profile={goal:'faith',priority:'explore',approach:'practical',legacy:'preserve'};
  const app=open({profile,day:{need:'rest',context:{goal:'learning',time:'5'}},route:'welcome'});
  const originalDay=structuredClone(app.day);
  app.change('welcome',{goal:'work'});
  app.form('welcome').querySelectorAll('button').find(button=>button.textContent==='Skip for now').events.click();
  assert.equal(app.route,'home');
  assert.deepEqual({...app.state.profile},{...profile,onboardingStatus:'skipped'});
  assert.deepEqual(app.day,originalDay);
  assert.equal(app.stored.profile.goal,'faith');
  assert.equal(app.recommendations,0);
  assert.equal(app.hub.querySelector('a'),null);
});

test('preferences remain usable when saving fails and visibly report visit-only storage',()=>{
  const app=open({writable:false,route:'settings/personal'});
  app.change('settings/personal',{goal:'learning'});
  app.submit('settings/personal');
  assert.equal(app.state.profile.goal,'learning');
  assert.equal(app.stored,undefined);
  assert.equal(app.route,'settings/personal');
  assert.equal(app.panels['settings/personal'].hidden,false);
  assert.equal(status(app.panels['settings/personal']),'Kept for this visit only.');
});

test('welcome save and skip report failed storage outside the departing screen',()=>{
  for(const action of ['save','skip']){
    const app=open({writable:false,route:'welcome'});
    if(action==='save')app.submit('welcome');
    else app.form('welcome').querySelectorAll('button').find(button=>button.textContent==='Skip for now').events.click();
    assert.equal(app.stored,undefined);
    assert.equal(app.route,action==='save'?'today/step':'home');
    assert.equal(app.panels.welcome.hidden,true);
    assert.equal(app.toasts.length,1);
    assert.match(app.toasts[0],/kept for this visit only/i,'the failure notice survives navigation');
  }
});

test('the check-in separates direction, a blocked start and growth while preserving legacy needs',()=>{
  const app=open();
  assert.deepEqual(app.mind.querySelector('.need-grid').children.map(button=>button.dataset.need),['calm','clarity','grow','connection','progress','rest']);
  assert.equal(app.mind.querySelector('.support-picker'),null);
  // The two primary answers name the actual difference: a blocked start and
  // missing direction are different problems.
  assert.match(app.mind.querySelector('[data-need=calm]').textContent,/Overwhelmed/);
  assert.match(app.mind.querySelector('[data-need=clarity]').textContent,/I don't know[\s\S]*what to do/);
  assert.match(app.mind.querySelector('[data-need=progress]').textContent,/I know what to do[\s\S]*can't get started/);
  assert.match(app.mind.querySelector('[data-need=rest]').textContent,/Worn out/);
  assert.match(app.mind.querySelector('[data-need=grow]').textContent,/Ready to stretch/);
  // The check-in's own copy must survive module load rather than be rewritten.
  assert.doesNotMatch(app.mind.querySelector('.need-grid').textContent,/I know, but I’m stuck/);
  assert.equal(app.mind.querySelector('[data-need=energy]'),null);
  assert.equal(app.mind.querySelector('[data-need=explore]'),null);
  for(const need of ['energy','explore']){
    app.day.need=need;app.visit('today/check-in');
    assert.equal(app.day.need,need,'an earlier plan is not silently reassigned');assert.equal(app.saves,0);
  }
});

test('every bundled chapter renders its complete text and selected verse in both translations with no pagination',()=>{
  const app=open(),panel=app.panels['learn/chapter'];
  for(const [key,data]of Object.entries(app.chapterData))for(const translation of ['web','asv']){
    app.chapter(key,translation);
    const verses=panel.querySelector('#chapter-verses').children;
    const expected=data.translations[translation];
    assert.equal(verses.length,expected.length,key+' '+translation+' retains every verse');
    for(let i=0;i<expected.length;i++){
      assert.equal(verses[i].textContent,String(expected[i].number)+expected[i].text);
      assert.equal(verses[i].querySelector('.verse-number').textContent,String(expected[i].number));
    }
    const selected=panel.querySelectorAll('.selected-verse');
    assert.equal(selected.length,1);assert.equal(selected[0].querySelector('.verse-number').textContent,String(data.focus));
    assert.equal(panel.querySelector('#chapter-title').textContent,data.reference+' · '+translation.toUpperCase());
    assert.equal(panel.querySelector('#chapter-description').textContent,'The full chapter. Verse '+data.focus+' is highlighted.');
    assert.equal(panel.querySelectorAll('button').length,0);
    assert.equal(panel.hidden,false);
  }
  assert.equal(app.saves,0,'reading and changing translations does not rewrite user data');
});
