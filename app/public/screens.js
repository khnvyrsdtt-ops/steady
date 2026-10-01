'use strict';
const mainScreenRoute='today/feelings';
function navigateScreen(screen,kind='push',source=null) {
  queueNavigation(screen,kind,source);
  if (location.hash === `#${screen}`) renderScreen();
  else location.hash = screen;
}
const icon = name => SteadyIcons.svg(name);
const main = document.querySelector('.main-shell main');
const hub = document.createElement('section');
hub.id = 'home-hub';
hub.hidden=true;
hub.innerHTML = `<div class="simple-home">
  <div class="hub-heading"><div class="eyebrow">BUILT ON CHRIST</div><h1>Find your footing.</h1><p class="hub-description">One next step is enough.</p></div>
  <a class="home-next home-next-optional" href="#today/check-in"><span class="mini-label" hidden>YOUR NEXT STEP</span><strong id="home-next-title">Need a practical next step?</strong><span class="home-next-arrow" aria-hidden="true">→</span></a>
  <details class="home-scripture"><summary><span class="home-scripture-title">Scripture for today</span><span class="home-scripture-hint">Read or reflect, if you choose</span></summary><div class="home-scripture-content"><blockquote id="home-verse"></blockquote><p class="verse-reference" id="home-reference"></p><a class="text-link" href="#learn/chapter">Read in context <span aria-hidden="true">→</span></a></div></details>
  <button class="home-return" type="button" hidden><span class="home-return-label">PICK UP WHERE YOU LEFT OFF</span><strong class="home-return-title"></strong><span class="home-return-action">Continue this step <span aria-hidden="true">→</span></span></button>
</div>`;
// Show the Christian foundation plainly; let people choose when to read Scripture.
main.prepend(hub);

function renderHomeScripture() {
  const source = state.profile?.useNotes === true ? day : {...day,mind:'',intention:'',reflection:'',reflections:[],tasks:[]};
  const context = SteadyGuide.context(state.profile || {}, day.context || {});
  const chosen = SteadyGuide.scripture(source, context, day.scriptureTheme, state.scriptureRequests);
  const verse = ScriptureLibrary[chosen.key];
  const translation = document.documentElement.dataset.translation === 'asv' ? 'asv' : 'web';
  document.getElementById('home-verse').textContent = verse.translations[translation].text;
  document.getElementById('home-reference').textContent = `${verse.reference} · ${translation.toUpperCase()}`;
}
function renderHomeStep() {
  // Reading the home passage does not choose a need or create a task.
  // Keep earlier plans available without rewriting or migrating saved entries.
  const entry=hub.querySelector('.home-next');
  const chosen=Object.hasOwn(recommendations,day.need);
  const plan=chosen&&day.plan?.need===day.need?day.plan:null;
  const complete=plan&&(day.actionLog||[]).some(action=>action.id===plan.id&&(!action.goal||action.goal===plan.context?.goal)&&(action.variant||'base')===(plan.variant||'base'));
  entry.href=chosen?'#today':'#today/check-in';
  entry.classList.toggle('home-next-optional',!chosen);
  entry.querySelector('.mini-label').hidden=!chosen;
  entry.querySelector('.mini-label').textContent=complete?'STEP COMPLETE':'YOUR NEXT STEP';
  document.getElementById('home-next-title').textContent=chosen
    ?(typeof plan?.title==='string'&&plan.title.trim()?plan.title:'Return to your next step')
    :'Choose today’s next step';
}
function renderHomeReturn() {
  const control=hub.querySelector('.home-return');
  if(!control)return;
  const chosen=Object.hasOwn(recommendations,day.need);
  const plan=chosen&&day.plan?.need===day.need?day.plan:null;
  const planDone=plan&&(day.actionLog||[]).some(action=>action.id===plan.id&&(!action.goal||action.goal===plan.context?.goal)&&(action.variant||'base')===(plan.variant||'base'));
  // The primary card already resumes an active plan. Keep this second card for
  // one unfinished custom action, never a competing suggestion or a streak.
  if(plan&&!planDone){control.hidden=true;control.returnTask=null;return;}
  const unfinished=entry=>Array.isArray(entry?.tasks)?entry.tasks.slice().reverse().find(task=>typeof task?.text==='string'&&task.text.trim()&&task.complete!==true):null;
  let task=unfinished(day),fromToday=!!task;
  if(!task){
    const current=typeof today==='string'?today:new Date().toISOString().slice(0,10);
    const earliest=new Date(`${current}T12:00:00`);earliest.setDate(earliest.getDate()-7);
    for(const date of Object.keys(state.days||{}).filter(key=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&key<current).sort().reverse()){
      if(new Date(`${date}T12:00:00`)<earliest)break;
      task=unfinished(state.days[date]);if(task)break;
    }
  }
  control.hidden=!task;
  control.returnTask=task?{text:task.text.trim(),fromToday}:null;
  if(task)control.querySelector('.home-return-title').textContent=task.text.trim();
}
hub.querySelector('.home-return')?.addEventListener('click',()=>{
  const control=hub.querySelector('.home-return'),returnTask=control.returnTask;
  if(!returnTask)return;
  if(!returnTask.fromToday){
    // Carry forward only on an explicit tap. The older record stays intact.
    if(!Array.isArray(day.tasks))day.tasks=[];
    if(!day.tasks.some(task=>task.complete!==true&&task.text?.trim()===returnTask.text)){
      day.tasks.push({id:taskId(),text:returnTask.text,complete:false});
      save();renderTasks();updateProgress();
    }
  }
  navigateScreen('direction','push',control);
});
const screenHeader = document.createElement('header');
screenHeader.className = 'screen-header';
screenHeader.hidden=true;
screenHeader.innerHTML = `<a href="#today/feelings" class="screen-back" aria-label="Back to Steady">${icon('arrowLeft')}<span>Steady</span></a><h1 id="screen-title" tabindex="-1"></h1>`;
main.insertBefore(screenHeader, hub.nextSibling);
const mind = document.getElementById('mind');
const step = document.getElementById('direction');
const action = document.getElementById('action');
const review = document.getElementById('reflection');
const learn = document.getElementById('truth');
const resume = document.createElement('a'); resume.href='#today/step';resume.className='step-change';resume.id='resume-step';resume.textContent='Return to my next step →';mind.append(resume);
const panels = [mind,step,learn,action,review];
panels.forEach(panel => {panel.hidden=true;panel.classList.add('focused-panel');main.append(panel);});
const nav = document.querySelector('.sidebar nav');
nav.innerHTML='';
nav.hidden=true;
document.documentElement.dataset.singleMain='true';
document.querySelector('.brand').href='#'+mainScreenRoute;
document.querySelector('.settings-back').href='#'+mainScreenRoute;
document.querySelector('.settings-back').textContent='← Steady';
document.querySelector('.settings-back').hidden=true;
let currentScreenRoute=mainScreenRoute;
let screenTrail=[],pendingNavigation=null;
let screenExtensionsReady=!document.readyState||document.readyState==='complete';
// Reflect on phones: the title stays left while the theme and settings
// controls sit on the same row to the right. Positions restore on leaving.
const themeToggle=document.querySelector('.theme-toggle'), settingsLink=document.querySelector('.settings-link');
function placeScreenTools(route){
  if(!themeToggle||!settingsLink)return;
  const narrow=typeof window.matchMedia==='function'&&window.matchMedia('(max-width:650px)').matches;
  // Latch each control's home the first time it is parented, so restores
  // always aim at the real sidebar — never at a detached node or each other.
  const homes=placeScreenTools.homes||(placeScreenTools.homes=new Map());
  for(const toggle of [themeToggle,settingsLink]){
    if(toggle.parentNode&&!homes.get(toggle)?.parent)homes.set(toggle,{parent:toggle.parentNode,next:toggle.nextSibling||null});
  }
  if(route==='review'&&narrow&&homes.get(themeToggle)?.parent&&homes.get(settingsLink)?.parent){
    screenHeader.append(themeToggle,settingsLink);
  }else{
    for(const [toggle,home] of homes){
      if(home.parent&&toggle.parentNode!==home.parent)home.parent.insertBefore(toggle,home.next);
    }
  }
}
if(typeof window.matchMedia==='function'){
  try{window.matchMedia('(max-width:650px)').addEventListener?.('change',()=>placeScreenTools(currentScreenRoute));}catch{}
}
const primaryRoute=route=>route===mainScreenRoute;
// How far the heading has to clear the page's own Back pill, measured rather
// than assumed because the label is different for every destination.
//
// On the device the pill steps aside for the system navigation bar, and it is
// hidden by a rule the bridge applies *after* this screen has rendered. Measuring
// once, on the frame this screen renders, therefore caught the pill while it was
// still visible and left the heading indented by its width with nothing there to
// indent it around -- and which frame won the race varied, so the same title sat
// in a different place in light and in dark. So: measure on a frame of its own,
// and measure again whenever that rule changes.
function measureBackRow(){
  const frame=window.requestAnimationFrame||((fn)=>fn());
  frame(()=>{
    const root=document.documentElement;
    const style=root?.style;
    if(!style||typeof style.setProperty!=='function')return;
    const pills=[document.querySelector('.settings-back'),document.querySelector('.screen-back')];
    // Only a pill the reader can actually see reserves the row.
    const shown=pills.filter(pill=>pill&&!pill.hidden&&!pill.closest('[hidden]')&&pill.getClientRects().length>0);
    const active=shown[0]||null;
    const box=active&&typeof active.getBoundingClientRect==='function'?active.getBoundingClientRect():null;
    const width=box?box.width:0;
    const offset=(width?Math.ceil(width)+12:0)+'px';
    if(style.getPropertyValue('--back-row-offset')!==offset)style.setProperty('--back-row-offset',offset);
  });
}
if(typeof MutationObserver==='function'){
  new MutationObserver(measureBackRow)
    .observe(document.documentElement,{attributes:true,attributeFilter:['data-native-back']});
}
const plainClick=event=>!event.button&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey;
function queueNavigation(route,kind='push',source=null){
  // Preserve a Back/tab intent established by the actual control's handler.
  if(pendingNavigation?.route===route){if(source)pendingNavigation.source=source;return;}
  pendingNavigation={route,kind,source,from:currentScreenRoute,top:(window.SteadyViewport||window).scrollY||0};
}
function selectTab(route){
  // Older native callers and bookmarks can still use the retired tab keys.
  if(!['home','main','steady','help','today/feelings','review'].includes(route))return;
  if(route==='review'){navigateScreen('review');return;}
  document.querySelectorAll('.main-shell details').forEach(detail=>{
    if(!detail.closest('[hidden]')&&!detail.querySelector('summary')?.hidden)detail.open=false;
  });
  document.dispatchEvent(new CustomEvent('steady:tab-reset'));
  if(primaryRoute(currentScreenRoute)){(window.SteadyViewport||window).scrollTo({top:0,behavior:'instant'});return;}
  navigateScreen(mainScreenRoute,'tab');
  if(typeof window.steadyExperience?.haptic==='function')window.steadyExperience.haptic();
}
window.SteadyNavigation={
  selectTab,
  back(){
    const back=document.querySelector(currentScreenRoute==='settings'?'.settings-back':'.screen-back');
    if(back&&!back.hidden)back.click();
    else selectTab('home');
  }
};
document.addEventListener('click',event=>{
  if(!plainClick(event))return;
  const link=event.target.closest?.('a[href^="#"]');
  const hash=link?.getAttribute('href');
  if(!hash)return;
  const target=hash.slice(1);
  if(link.classList.contains('nav-item')){event.preventDefault();selectTab(link.dataset.section||target);return;}
  queueNavigation(target,link.classList.contains('screen-back')?'back':'push',link);
});
// Older bookmarks keep working without retaining the retired landing screens.
const aliases = {home:mainScreenRoute,main:mainScreenRoute,steady:mainScreenRoute,help:mainScreenRoute,ask:mainScreenRoute,'learn/saved':'help/memory','welcome/steps':'welcome',truth:'learn/scripture',mind:'today/check-in',action:'direction',reflection:'review',explore:mainScreenRoute,think:'review',learn:'learn/scripture','learn/practice':'learn/scripture','learn/exercise':'learn/scripture'};
function canonicalHash(route){
  if(location.hash==='#'+route)return;
  // Replace a bookmark alias so Settings and the native bridge share the same
  // destination without creating a second history entry for the same screen.
  if(typeof history!=='undefined'&&history.replaceState)history.replaceState(null,'','#'+route);
  else location.hash=route;
}
function renderScreen() {
  let route = location.hash.slice(1) || mainScreenRoute;
  route = Object.hasOwn(aliases,route) ? aliases[route] : route;
  if(primaryRoute(route))canonicalHash(route);
  // Ordinary Today always stays in the practical path, including when a
  // separate Scripture step was saved earlier. A missing choice opens check-in.
  if(route==='today')route=Object.hasOwn(recommendations,day.need)?'today/step':'today/check-in';
  const findExtension=destination=>{
    const candidate=window.steadyExperience?.routePanel(destination);
    return candidate&&typeof candidate==='object'&&candidate.node?candidate:null;
  };
  let extension=findExtension(route);
  if(!extension&&!['today/step','today/check-in','direction','review','settings'].includes(route)){
    // Screen modules register after the router. Preserve a deep link until all
    // deferred scripts have run, and let Steady render as soon as it registers.
    if(primaryRoute(route)||!screenExtensionsReady)return;
    route=mainScreenRoute;canonicalHash(route);extension=findExtension(route);
    if(!extension)return;
  }
  const hasStep = Object.hasOwn(recommendations,day.need);
  if (route==='today/step' && !hasStep) route='today/check-in';
  let restoreTop=0,restoreFocus=null,restoreFocusKey=null,restoring=false;
  const intent=pendingNavigation;pendingNavigation=null;
  if(route!==currentScreenRoute||!screenTrail.length){
    const previous=screenTrail[screenTrail.length-1];
    if(previous){
      previous.top=intent?.top??((window.SteadyViewport||window).scrollY||0);
      if(intent?.kind!=='back'&&intent?.source){previous.returnFocus=intent.source;previous.returnFocusKey=intent.source.getAttribute('data-navigation-focus');}
    }
    if(intent?.kind==='back'){
      const index=screenTrail.slice(0,-1).map(item=>item.route).lastIndexOf(route);
      if(index>=0){screenTrail=screenTrail.slice(0,index+1);restoreTop=screenTrail[index].top;restoreFocus=screenTrail[index].returnFocus;restoreFocusKey=screenTrail[index].returnFocusKey;restoring=true;}
      else screenTrail=[];
    }else if(!intent&&screenTrail.some(item=>item.route===route)){
      const index=screenTrail.map(item=>item.route).lastIndexOf(route);
      screenTrail=screenTrail.slice(0,index+1);restoreTop=screenTrail[index].top;restoreFocus=screenTrail[index].returnFocus;restoreFocusKey=screenTrail[index].returnFocusKey;restoring=true;
    }else if(primaryRoute(route)||intent?.kind==='tab'){
      screenTrail=[];
    }else if(!intent)screenTrail=[];
    if(screenTrail[screenTrail.length-1]?.route!==route)screenTrail.push({route,top:0,title:'',section:''});
    if(screenTrail.length>40)screenTrail.shift();
  }
  const settings = route==='settings';
  document.body.classList.toggle('settings-open', settings);
  document.body.classList.toggle('home-screen', false);
  document.body.classList.toggle('chat-screen', route==='today/feelings');
  const brand=document.querySelector('.sidebar .brand');
  brand.classList.toggle('brand-home',!primaryRoute(route));
  // The wordmark is the product name. It is set here rather than left to the
  // markup because this runs on every screen change.
  brand.querySelector('.brand-wordmark').innerHTML='Steady Arc<span class="brand-tm">\u2122</span>';
  brand.setAttribute('aria-label',primaryRoute(route)?'Steady':'Back to Steady');
  document.querySelector('.main-shell').hidden=settings;
  document.getElementById('settings-page').hidden=!settings;
  hub.hidden=true; screenHeader.hidden=settings || primaryRoute(route);
  const selected = extension?.node || {today:mind,'today/check-in':mind,'today/step':step,direction:action,review}[route];
  panels.forEach(panel=>{panel.hidden=panel!==selected;});
  document.body.dataset.atmosphere=route==='learn/scripture'||route==='learn/chapter'?'scripture':route==='review'||route==='learn/reflect'?'reflection':'';
  // One root owns every tool. The section key stays compatible with native
  // shells while the trail below records each tool's actual return path.
  const section='home';
  const previousScreen=screenTrail[screenTrail.length-2];
  const screenTitle = {settings:'Settings','today/feelings':'Steady',review:'Reflect',today:'Your next step','today/step':'Your next step','today/scripture-step':'Your next step','today/check-in':'Check-in',direction:'My actions'}[route] || extension?.title || 'Steady';
  document.getElementById('screen-title').textContent=screenTitle;
  let parent=[mainScreenRoute,'Steady'];
  if(route==='today/scripture-step')parent=day.scriptureDirection?.fromSaved?['learn/scripture','Scripture']:['learn/reflect','Your reflection'];
  else if(route==='today/context')parent=hasStep?['today/step','Your next step']:['today','Your next step'];
  else if(route==='learn/chapter')parent=['learn/scripture','Scripture'];
  else if(route==='learn/reflect')parent=['learn/scripture','Scripture'];
  else if(route==='help/memory')parent=['settings','Settings'];
  else if(route==='direction')parent=['today/step','Your next step'];
  else if(route.startsWith('learn/'))parent=['learn/scripture','Scripture'];
  else if(route.startsWith('review/day/'))parent=['review/progress','Your record'];
  else if(route.startsWith('review/'))parent=['review','Reflect'];
  else if(route.startsWith('settings/'))parent=['settings','Settings'];
  // Shared destinations return to the screen that opened them, without loops.
  if(previousScreen&&!primaryRoute(route))parent=[previousScreen.route,previousScreen.title||'previous screen'];
  const back=screenHeader.querySelector('.screen-back');
  back.hidden=primaryRoute(route);
  back.href='#'+parent[0];
  back.innerHTML=icon('arrowLeft')+'<span></span>';
  back.querySelector('span').textContent=parent[1];
  back.setAttribute('aria-label','Back to '+parent[1]);
  back.title='Back to '+parent[1];
  // The Back pill floats above the content, so the title shares its row and
  // clears it by the pill's measured width. The label changes per destination,
  // so the offset is measured rather than assumed. Settings uses its own Back
  // control, so measure whichever one is actually on screen.
  const settingsBack=document.querySelector('.settings-back');
  if(settingsBack)settingsBack.hidden=!(settings||route.startsWith('settings/'));
  measureBackRow();
  activate(section);
  document.body.dataset.section=section;
  document.getElementById('resume-step').hidden=!hasStep;
  currentScreenRoute=route;
  placeScreenTools(route);
  Object.assign(screenTrail[screenTrail.length-1],{title:document.getElementById('screen-title').textContent,section});
  document.dispatchEvent(new CustomEvent('steady:screen',{detail:route}));
  document.title=primaryRoute(route)?'Steady':`${screenTitle} — Steady`;
  (window.SteadyViewport||window).scrollTo({top:restoreTop,behavior:'instant'});
  if(restoreFocusKey&&!restoreFocus?.isConnected)restoreFocus=Array.from(document.querySelectorAll('[data-navigation-focus]')).find(control=>control.getAttribute('data-navigation-focus')===restoreFocusKey);
  const returnTarget=restoreFocus?.isConnected&&!restoreFocus.closest('[hidden]')&&restoreFocus.getClientRects().length?restoreFocus:null;
  const passageTarget=route==='learn/chapter'&&!restoring&&intent?.kind!=='back'&&window.steadyExperience?.helpReading?.sourceId
    ?document.querySelector('#chapter-verses .selected-verse'):null;
  if(returnTarget)returnTarget.focus({preventScroll:true});
  else if(route==='today/feelings')document.querySelector('.chat-scroll')?.focus({preventScroll:true});
  else if(settings)document.getElementById('settings-title').focus({preventScroll:true});
  else if(selected&&!passageTarget)document.getElementById('screen-title').focus({preventScroll:true});
  if(passageTarget)requestAnimationFrame(()=>{
    if(currentScreenRoute!==route||!passageTarget.isConnected)return;
    const viewport=window.SteadyViewport||window,header=document.querySelector('.sidebar').getBoundingClientRect();
    viewport.scrollTo({top:Math.max(0,(viewport.scrollY||0)+passageTarget.getBoundingClientRect().top-header.bottom-16),behavior:'instant'});
    passageTarget.tabIndex=-1;passageTarget.focus({preventScroll:true});
  });
}
window.addEventListener('hashchange',renderScreen);
document.addEventListener('DOMContentLoaded',()=>{screenExtensionsReady=true;renderScreen();},{once:true});
renderScreen();
