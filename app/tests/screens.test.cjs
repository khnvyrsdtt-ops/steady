const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function open(withSettings=false,options={}){
  let activeElement=null;
  const created=[];
  class Element{
    constructor(){created.push(this);this.children=[];this.selectors=new Map();this.attrs={};this.dataset={};this.hidden=false;this.isConnected=true;this.value='';this.textContent='';this.classes=new Set();this.focusCalls=[];this.rect={top:0,left:0,width:390,height:44};this.parent=null;this.classList={contains:name=>this.classes.has(name),add:(...names)=>names.forEach(name=>this.classes.add(name)),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
    querySelector(selector){if(!this.selectors.has(selector))this.selectors.set(selector,new Element());return this.selectors.get(selector);}
    append(...nodes){for(const node of nodes){node.detach();node.parent=this;node.isConnected=true;this.children.push(node);}}
    prepend(...nodes){for(const node of [...nodes].reverse()){node.detach();node.parent=this;node.isConnected=true;this.children.unshift(node);}}
    insertBefore(node){node.detach();node.parent=this;node.isConnected=true;this.children.push(node);}
    detach(){if(this.parent){const siblings=this.parent.children,at=siblings.indexOf(this);if(at>=0)siblings.splice(at,1);this.parent=null;}}
    remove(){this.detach();this.removed=true;this.isConnected=false;}
    setAttribute(name,value){this.attrs[name]=value;}
    getAttribute(name){return this.attrs[name];}
    addEventListener(name,handler){(this.listeners||={})[name]||=[];this.listeners[name].push(handler);}
    focus(options){this.focusCalls.push(options);activeElement=this;}
    closest(selector){return selector==='[hidden]'&&(this.hidden||this.hiddenAncestor)?this:null;}
    getBoundingClientRect(){return {...this.rect,right:this.rect.left+this.rect.width,bottom:this.rect.top+this.rect.height};}
    getClientRects(){return this.hidden||this.hiddenAncestor||this.cssHidden||!this.isConnected?[]:[this.getBoundingClientRect()];}
    get parentNode(){return this.parent;}
    get nextSibling(){if(!this.parent)return null;const at=this.parent.children.indexOf(this);return this.parent.children[at+1]||null;}
  }
  const elements=new Map(),listeners={},frames=[];
  const element=selector=>{if(selector==='#reflect-button')return null;selector=selector==='.sidebar .brand'?'.brand':selector;if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);};
  const details=[new Element(),new Element(),new Element()];details.forEach(n=>n.open=true);details[1].hiddenAncestor=true;details[2].querySelector('summary').hidden=true;
  const document={readyState:options.loading?'interactive':'complete',body:new Element(),documentElement:new Element(),get activeElement(){return activeElement;},querySelector:element,querySelectorAll:selector=>selector==='[data-navigation-focus]'?created.filter(node=>node.isConnected&&node.getAttribute('data-navigation-focus')):details,getElementById:id=>element('#'+id),createElement:()=>new Element(),addEventListener:(name,fn)=>(listeners[name]||=[]).push(fn),dispatchEvent:event=>(listeners[event.type]||[]).forEach(fn=>fn(event))};
  const extensions={};
  for(const route of ['learn/scripture','learn/chapter','help/memory','learn/reflect','today/feelings','today/context','today/scripture-step','review/progress','review/day','settings/personal','settings/about','welcome'])extensions[route]={node:new Element(),title:route};
  extensions['learn/scripture'].node=element('#truth');
  extensions['today/feelings'].title='Steady';
  const deferredRoute=options.lateRoute||'today/feelings';
  const deferredExtension=extensions[deferredRoute];
  if(options.loading)delete extensions[deferredRoute];
  extensions['today/scripture-step'].title='';
  let hash=options.hash??'#home';const location={get hash(){return hash;},set hash(value){hash=value.startsWith('#')?value:'#'+value;}};
  const matchMedia=query=>({matches:true,media:query,addEventListener(){}});
  let active,fromSaved=false,savedStep=false,starts=0,saves=0;
  const sandbox={
    document,location,SteadyIcons:require('../public/icons.js'),CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
    day:{need:'grow',scriptureDirection:{get fromSaved(){return fromSaved;}}},state:{profile:{}},recommendations:{grow:{}},
    save:()=>{saves++;return true;},activate:section=>active=section,requestAnimationFrame:fn=>frames.push(fn),
    SteadyGuide:{context:()=>({}),scripture:()=>({key:'foundation',reason:''})},
    ScriptureLibrary:{foundation:{reference:'Matthew 7:24',translations:{web:{text:'A firm foundation'}}}},
    window:{scrollY:0,matchMedia,addEventListener(){},scrollTo({top}){this.scrollY=top;},steadyExperience:{routePanel:route=>extensions[route.startsWith('review/day/')?'review/day':route],startToday:()=>{starts++;return {title:'One useful step'};}},SteadyDirectionFlow:{active:()=>savedStep,renderHome(){}}}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../public/screens.js'),'utf8')+'\nglobalThis.router={render:renderScreen,route:()=>currentScreenRoute,hub,screenHeader};',sandbox);
  if(withSettings)vm.runInContext(fs.readFileSync(require.resolve('../public/settings-navigation.js'),'utf8'),sandbox);
  function visit(route){location.hash='#'+route;sandbox.router.render();}
  function follow(route,kind){const link=new Element();link.setAttribute('href','#'+route);if(kind)link.classList.add(kind);document.dispatchEvent({type:'click',target:{closest:()=>link},preventDefault(){}});visit(route);return link;}
  function navigate(route,kind='push',source=null){sandbox.navigateScreen(route,kind,source);sandbox.router.render();}
  function flushFrames(){while(frames.length)frames.shift()();}
  function followEvidence(){follow('evidence');}
  function clickSettings(selector){
    const control=element(selector);control.getAttribute=name=>name==='href'?control.href:control.attrs[name];
    const event={type:'click',button:0,target:{closest:()=>control},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    for(const fn of control.listeners?.click||[])fn(event);
    document.dispatchEvent(event);sandbox.router.render();flushFrames();
  }
  return {finishLoading(){extensions[deferredRoute]=deferredExtension;document.readyState='complete';document.dispatchEvent({type:'DOMContentLoaded'});},visit,follow,navigate,flushFrames,createControl:()=>new Element(),followEvidence,element,document,details,clickSettings:()=>clickSettings('.settings-link'),closeSettings:()=>clickSettings('.settings-back'),day:sandbox.day,window:sandbox.window,router:sandbox.router,location,selectSavedStep:()=>{savedStep=true;fromSaved=true;},get active(){return active;},get starts(){return starts;},get saves(){return saves;},get back(){return sandbox.router.screenHeader.querySelector('.screen-back');}};
}

test('legacy Home helpers remain available without displaying a second landing screen',()=>{
  const app=open();
  assert.equal(app.router.hub.innerHTML.includes('home-more'),false);
  assert.equal(app.router.hub.innerHTML.includes('href="#help/memory"'),false);
  assert.equal(app.router.hub.innerHTML.includes('href="#explore"'),false);
  assert.ok(app.router.hub.innerHTML.includes('href="#learn/chapter"'));
  assert.ok(app.router.hub.innerHTML.includes('href="#today/check-in"'));
  assert.ok(app.router.hub.innerHTML.includes('One next step is enough.'));
  assert.match(app.router.hub.innerHTML,/<details class="home-scripture"><summary>/);
  assert.match(app.router.hub.innerHTML,/Scripture for today/);
  assert.ok(app.router.hub.innerHTML.indexOf('class="home-next')<app.router.hub.innerHTML.indexOf('<details class="home-scripture"'));
  assert.equal(app.router.hub.innerHTML.includes('id="home-thought"'),false);
});
test('About Steady hides the main Settings page and its page-only styling',()=>{
  const app=open(true);
  app.visit('settings');
  assert.equal(app.document.body.classList.contains('settings-open'),true);
  assert.equal(app.element('#settings-page').hidden,false);
  app.visit('settings/about');
  assert.equal(app.document.body.classList.contains('settings-open'),false);
  assert.equal(app.element('#settings-page').hidden,true);
  assert.equal(app.element('.main-shell').hidden,false);
});
test('the single Steady screen and old Home bookmarks preserve saved entries',()=>{
  const app=open();
  Object.assign(app.day,{need:'grow',plan:{id:'grow-build',need:'grow',title:'My existing step'},actionLog:[{id:'grow-build'}],reflection:'Keep this'});
  const before=JSON.stringify(app.day);
  for(const route of ['home','main','steady','help','ask','today/feelings','']){
    app.visit(route);
    assert.equal(app.router.route(),'today/feelings');
    assert.equal(app.location.hash,'#today/feelings');
    assert.equal(app.element('#screen-title').textContent,'Steady');
    assert.equal(app.document.title,'Steady');
    assert.equal(app.router.hub.hidden,true);
    assert.equal(app.back.hidden,true);
    assert.equal(app.element('.sidebar nav').hidden,true);
    assert.equal(app.element('.sidebar nav').innerHTML,'');
    assert.equal(app.starts,0);assert.equal(app.saves,0);
    assert.equal(JSON.stringify(app.day),before);
  }
});
test('startup waits for the Steady module and preserves a late-registering deep link',()=>{
  for(const hash of ['', '#home', '#main', '#today/feelings']){
    const app=open(false,{loading:true,hash});
    assert.equal(app.location.hash,'#today/feelings');
    assert.equal(app.router.hub.hidden,true);
    assert.equal(app.router.screenHeader.hidden,true);
    app.finishLoading();
    assert.equal(app.router.route(),'today/feelings');
    assert.equal(app.document.title,'Steady');
    assert.equal(app.saves,0);
  }
  for(const route of ['help/memory','learn/scripture','review/progress']){
    const app=open(false,{loading:true,hash:'#'+route,lateRoute:route});
    assert.equal(app.location.hash,'#'+route);
    app.finishLoading();
    assert.equal(app.router.route(),route);
    assert.equal(app.back.hidden,false);
    assert.equal(app.saves,0);
  }
});
test('custom actions remain available and return to the next step',()=>{
  const app=open();app.visit('direction');
  assert.equal(app.active,'home');assert.equal(app.element('#screen-title').textContent,'My actions');assert.equal(app.document.title,'My actions — Steady');assert.equal(app.back.href,'#today/step');assert.equal(app.back.hidden,false);
});
test('direct reading and record tools preserve their contextual parent destinations',()=>{
  const app=open();
  for(const route of ['learn/scripture','learn/chapter','learn/reflect']){app.visit(route);assert.equal(app.active,'home',route);}
  app.visit('help/memory');assert.equal(app.active,'home');assert.equal(app.back.href,'#settings');
  for(const route of ['review/progress','review/day/2026-09-23']){app.visit(route);assert.equal(app.active,'home',route);}
  assert.equal(app.back.href,'#review/progress');app.visit('review/progress');assert.equal(app.back.href,'#review');
});
test('old Saved links open the consolidated Memory area without discarding passages',()=>{
  const app=open();app.visit('learn/saved');
  assert.equal(app.router.route(),'help/memory');assert.equal(app.active,'home');
  assert.equal(app.back.href,'#settings');assert.equal(app.saves,0);
});
test('Today stays practical when a separate Scripture step was saved',()=>{
  const app=open();app.selectSavedStep();app.visit('today');assert.equal(app.router.route(),'today/step');assert.equal(app.active,'home');assert.equal(app.back.href,'#today/feelings');
  assert.equal(app.element('#screen-title').textContent,'Your next step');assert.equal(app.document.title,'Your next step — Steady');
  assert.equal(app.saves,0,'opening Today does not discard the Scripture step');
  app.visit('today/scripture-step');assert.equal(app.router.route(),'today/scripture-step');
  assert.equal(app.back.href,'#learn/scripture','the deliberate Scripture route remains reachable');
});
test('Today opens check-in when no everyday step has been chosen',()=>{
  const app=open();app.day.need='';app.visit('today');
  assert.equal(app.router.route(),'today/check-in');assert.equal(app.saves,0);
  assert.equal(app.back.href,'#today/feelings','direct Today entry never loops back to check-in');
  app.visit('today/step');assert.equal(app.router.route(),'today/check-in');
  assert.equal(app.back.href,'#today/feelings');
});
test('Today has a meaningful title that remains useful when returning from another screen',()=>{
  const app=open();app.visit('today');
  assert.equal(app.element('#screen-title').textContent,'Your next step');assert.equal(app.document.title,'Your next step — Steady');assert.equal(app.active,'home');
  app.follow('learn/scripture');assert.equal(app.back.href,'#today/step');assert.equal(app.back.querySelector('span').textContent,'Your next step');assert.equal(app.back.attrs['aria-label'],'Back to Your next step');
});
test('unrecognised and inherited-object route names safely fall back to Steady',()=>{
  const app=open();
  for(const route of ['missing','constructor','toString','__proto__']){assert.doesNotThrow(()=>app.visit(route));assert.equal(app.router.route(),'today/feelings');assert.equal(app.router.hub.hidden,true);}
});
test('legacy section links still reach the correct real screens',()=>{
  const app=open();
  for(const [alias,route,tab]of [['truth','learn/scripture','home'],['mind','today/check-in','home'],['action','direction','home'],['reflection','review','home']]){
    app.visit(alias);assert.equal(app.router.route(),route);assert.equal(app.active,tab);
  }
});
test('old onboarding links open the current welcome screen with ordinary contextual Back',()=>{
  const app=open();app.visit('welcome/steps');
  assert.equal(app.router.route(),'welcome');
  assert.equal(app.back.hidden,false);
  assert.equal(app.back.href,'#today/feelings');
  assert.equal(app.element('#reflect-button'),null);
  let returned=0;app.element('.screen-back').click=()=>returned++;
  app.window.SteadyNavigation.back();
  assert.equal(returned,1);
});
test('retired landing and practice bookmarks open a useful screen without changing saved entries',()=>{
  const app=open();Object.assign(app.day,{mind:'A thought worth keeping',reflection:'Keep this too',tasks:[{text:'My own step',complete:false}],practice:{memory:{correct:true}}});
  const before=JSON.stringify(app.day);
  for(const [alias,route,tab]of [['explore','today/feelings','home'],['think','review','home'],['learn','learn/scripture','home'],['learn/practice','learn/scripture','home'],['learn/exercise','learn/scripture','home']]){
    app.visit(alias);assert.equal(app.router.route(),route,alias);assert.equal(app.active,tab,alias);assert.equal(JSON.stringify(app.day),before,alias);
  }
});
test('retired screens fall back to Steady instead of stranding navigation',()=>{
  const app=open();app.visit('evidence');assert.equal(app.router.route(),'today/feelings');assert.equal(app.back.href,'#today/feelings');
  const direct=open();direct.visit('help/memory');assert.equal(direct.back.href,'#settings','A direct Memory link returns to Settings');
});

test('shared screens return along the actual entry path and restore scroll without a loop',()=>{
  const app=open();app.window.scrollY=360;
  app.follow('help/memory');assert.equal(app.back.href,'#today/feelings');assert.equal(app.back.hidden,false);assert.equal(app.active,'home');
  app.window.scrollY=90;app.follow('learn/scripture');assert.equal(app.back.href,'#help/memory');
  app.follow('help/memory','screen-back');assert.equal(app.back.href,'#today/feelings');assert.equal(app.window.scrollY,90);
  app.follow('home','screen-back');assert.equal(app.window.scrollY,360);assert.equal(app.back.hidden,true);
});
test('Scripture and progress keep the return path of the tool that opened them',()=>{
  const app=open();app.visit('today');app.follow('learn/scripture');assert.equal(app.active,'home');assert.equal(app.back.href,'#today/step');
  app.follow('learn/chapter');assert.equal(app.active,'home');assert.equal(app.back.href,'#learn/scripture');
  app.visit('review');app.follow('review/progress');assert.equal(app.active,'home');assert.equal(app.back.href,'#review');
  app.visit('today/feelings');app.follow('learn/scripture');assert.equal(app.active,'home');assert.equal(app.back.href,'#today/feelings');assert.equal(app.back.querySelector('span').textContent,'Steady');
});
test('Back restores the initiating control at each level of a Burden reading visit',()=>{
  const app=open();app.visit('today/feelings');
  const savedLink=app.follow('help/memory');assert.equal(app.active,'home');
  app.window.scrollY=120;const passageLink=app.follow('learn/scripture');
  app.follow('help/memory','screen-back');
  assert.equal(app.document.activeElement,passageLink);
  assert.equal(passageLink.focusCalls.at(-1).preventScroll,true);
  assert.equal(app.window.scrollY,120);
  app.follow('today/feelings','screen-back');
  assert.equal(app.document.activeElement,savedLink);
  assert.equal(savedLink.focusCalls.at(-1).preventScroll,true);
  assert.equal(app.active,'home');
});
test('a programmatic chapter visit returns focus to the Read chapter button',()=>{
  const app=open();app.visit('today/feelings');const readButton=app.createControl();
  app.navigate('learn/chapter','push',readButton);
  assert.equal(app.back.href,'#today/feelings');
  app.follow('today/feelings','screen-back');
  assert.equal(app.document.activeElement,readButton);
  assert.equal(readButton.focusCalls.at(-1).preventScroll,true);
});
test('missing, removed or hidden return controls safely fall back to the visible chat transcript',()=>{
  for(const unavailable of ['missing','removed','hidden','cssHidden']){
    const app=open();app.visit('today/feelings');const savedLink=unavailable==='missing'?null:app.createControl();
    app.navigate('help/memory','push',savedLink);
    if(unavailable==='removed')savedLink.remove();else if(unavailable==='hidden')savedLink.hiddenAncestor=true;else if(unavailable==='cssHidden')savedLink.cssHidden=true;
    app.follow('today/feelings','screen-back');
    if(savedLink)assert.equal(savedLink.focusCalls.length,0,unavailable);
    assert.equal(app.document.activeElement,app.element('.chat-scroll'),unavailable);
  }
});
test('Back resolves the initiating Saved passage or record control after the page rebuilds it',()=>{
  for(const [route,destination,key] of [['help/memory','learn/scripture','saved-passage:rest'],['review/progress','review/day/2026-09-23','record:2026-09-23']]){
    const app=open();app.visit(route);app.window.scrollY=140;
    const original=app.createControl();original.setAttribute('data-navigation-focus',key);
    app.navigate(destination,'push',original);
    let replacement;
    app.document.addEventListener('steady:screen',event=>{
      if(event.detail!==route)return;
      original.remove();
      const other=app.createControl();other.setAttribute('data-navigation-focus',key+'-other');
      replacement=app.createControl();replacement.setAttribute('data-navigation-focus',key);
    });
    app.follow(route,'screen-back');
    assert.equal(original.focusCalls.length,0,key);
    assert.equal(app.document.activeElement,replacement,key);
    assert.equal(replacement.focusCalls.at(-1).preventScroll,true,key);
    assert.equal(app.window.scrollY,140,key);
  }
});
test('a still-connected CSS-hidden control does not transfer focus to another control with its key',()=>{
  const app=open();app.visit('help/memory');
  const original=app.createControl();original.setAttribute('data-navigation-focus','saved-passage:rest');
  app.navigate('learn/scripture','push',original);original.cssHidden=true;
  const duplicate=app.createControl();duplicate.setAttribute('data-navigation-focus','saved-passage:rest');
  app.follow('help/memory','screen-back');
  assert.equal(original.focusCalls.length,0);assert.equal(duplicate.focusCalls.length,0);
  assert.equal(app.document.activeElement,app.element('#screen-title'));
});
test('entering Burden focuses its visible transcript without focusing a hidden page title or composer',()=>{
  const app=open(),title=app.element('#screen-title'),composer=app.element('#feelings-note');
  title.cssHidden=true;app.visit('today/feelings');
  assert.equal(app.document.activeElement,app.element('.chat-scroll'));
  assert.equal(app.document.activeElement.getClientRects().length,1);
  assert.equal(app.document.activeElement.focusCalls.at(-1).preventScroll,true);
  assert.equal(title.focusCalls.length,0);
  assert.equal(composer.focusCalls.length,0);
});
test('a new Burden chapter reveals the selected passage once and preserves the reading position on Back',()=>{
  const app=open();app.visit('today/feelings');app.window.steadyExperience.helpReading={sourceId:'foundation'};
  const verse=app.element('#chapter-verses .selected-verse');verse.rect.top=644;
  app.element('.sidebar').rect.height=64;
  app.navigate('learn/chapter','push',app.createControl());
  assert.equal(verse.focusCalls.length,0,'wait until the new chapter has rendered');
  app.flushFrames();
  assert.equal(app.window.scrollY,564,'leave room for the navigation header above the selected passage');
  assert.equal(app.document.activeElement,verse);
  assert.equal(verse.tabIndex,-1);
  assert.equal(verse.focusCalls.at(-1).preventScroll,true);
  app.window.scrollY=220;const settingsLink=app.follow('settings');
  app.follow('learn/chapter','screen-back');app.flushFrames();
  assert.equal(app.window.scrollY,220,'Back preserves the reader’s position');
  assert.equal(verse.focusCalls.length,1,'Back does not reveal the passage again');
  assert.equal(app.document.activeElement,settingsLink);
});
test('ordinary chapter reading and an abandoned reveal do not move focus to a passage',()=>{
  const ordinary=open();ordinary.follow('learn/chapter');ordinary.flushFrames();
  assert.equal(ordinary.document.activeElement,ordinary.element('#screen-title'));
  assert.equal(ordinary.element('#chapter-verses .selected-verse').focusCalls.length,0);
  assert.equal(ordinary.window.scrollY,0);
  const abandoned=open();abandoned.visit('today/feelings');abandoned.window.steadyExperience.helpReading={sourceId:'foundation'};
  const verse=abandoned.element('#chapter-verses .selected-verse');verse.rect.top=644;
  abandoned.navigate('learn/chapter','push',abandoned.createControl());abandoned.follow('help/memory');
  abandoned.flushFrames();
  assert.equal(verse.focusCalls.length,0,'a later route must not receive the old chapter’s focus or scroll');
  assert.equal(abandoned.document.activeElement,abandoned.element('#screen-title'));
  assert.equal(abandoned.window.scrollY,0);
});
test('legacy native tab commands open secondary Reflect and return to Steady without changing progress',()=>{
  const app=open();app.window.scrollY=300;
  app.day.actionLog=[{id:'step-1'}];app.day.reflection='Keep this';
  let reset=0;app.document.addEventListener('steady:tab-reset',()=>reset++);
  app.window.SteadyNavigation.selectTab('review');app.router.render();app.window.scrollY=75;
  app.window.SteadyNavigation.selectTab('home');app.router.render();assert.equal(app.window.scrollY,0);
  assert.equal(app.details[0].open,false);assert.equal(app.details[1].open,true);assert.equal(app.details[2].open,true);
  assert.equal(app.day.actionLog[0].id,'step-1');assert.equal(app.day.reflection,'Keep this');assert.equal(reset,1);
  app.window.SteadyNavigation.selectTab('home');assert.equal(app.window.scrollY,0);
});
test('browser Back preserves the existing return path and its scroll position',()=>{
  const app=open();app.window.scrollY=320;const savedLink=app.follow('help/memory');app.window.scrollY=84;const passageLink=app.follow('learn/scripture');
  app.visit('help/memory');assert.equal(app.back.href,'#today/feelings');assert.equal(app.window.scrollY,84);assert.equal(app.document.activeElement,passageLink);
  app.visit('home');assert.equal(app.window.scrollY,320);assert.equal(app.document.activeElement,savedLink);
});
test('returning from Settings restores the existing next-step Back path, not a Settings loop',()=>{
  const app=open(true);app.follow('today');app.window.scrollY=180;
  app.clickSettings();assert.equal(app.router.route(),'settings');assert.equal(app.element('#screen-title').textContent,'Settings');
  app.closeSettings();assert.equal(app.router.route(),'today/step');assert.equal(app.window.scrollY,180);
  assert.equal(app.back.href,'#today/feelings');assert.equal(app.back.attrs['aria-label'],'Back to Steady');
  app.follow('home','screen-back');assert.equal(app.router.route(),'today/feelings');
});
test('closing a Settings visit discards its subpages and preserves the source screen parent',()=>{
  const app=open(true);app.follow('learn/scripture');app.follow('learn/chapter');app.window.scrollY=95;
  app.clickSettings();app.follow('settings/personal');app.follow('settings','screen-back');
  assert.equal(app.element('#screen-title').textContent,'Settings');
  app.closeSettings();assert.equal(app.router.route(),'learn/chapter');assert.equal(app.window.scrollY,95);
  assert.equal(app.back.href,'#learn/scripture');
});
test('a Settings subpage names its actual Settings parent even when entered from Home',()=>{
  const app=open();app.follow('settings');app.follow('settings/personal');
  assert.equal(app.back.href,'#settings');assert.equal(app.back.attrs['aria-label'],'Back to Settings');
});
test('Reflect on phones seats the title left with theme and settings right in one row',()=>{
  const app=open();
  const bar=app.element('.sidebar');
  const theme=app.element('.theme-toggle'),gear=app.element('.settings-link');
  bar.append(theme,gear);
  app.visit('review');
  const header=app.router.screenHeader;
  assert.equal(theme.parent,header,'theme moves into the Reflect header row');
  assert.equal(gear.parent,header,'settings moves into the Reflect header row');
  assert.ok(header.children.indexOf(theme)<header.children.indexOf(gear),'theme stays left of settings');
  assert.equal(app.element('#screen-title').textContent,'Reflect');
  app.visit('home');
  assert.equal(theme.parent,bar,'theme restores when leaving Reflect');
  assert.equal(gear.parent,bar,'settings restores when leaving Reflect');
});

test('Reflect and saved content are secondary tools that return along the single main flow',()=>{
  const app=open();
  app.follow('review');
  assert.equal(app.back.hidden,false);
  assert.equal(app.back.href,'#today/feelings');
  assert.equal(app.back.attrs['aria-label'],'Back to Steady');
  app.follow('review/progress');app.follow('review/day/2026-09-23');
  assert.equal(app.back.href,'#review/progress');
  app.follow('review/progress','screen-back');app.follow('review','screen-back');
  assert.equal(app.back.href,'#today/feelings');
  app.follow('today/feelings','screen-back');app.follow('help/memory');
  assert.equal(app.active,'home');assert.equal(app.back.href,'#today/feelings');
  app.follow('learn/scripture');assert.equal(app.back.href,'#help/memory');
});
