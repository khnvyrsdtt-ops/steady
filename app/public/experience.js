'use strict';
const SteadyExperience = (() => {
  const G=SteadyGuide;
  Object.assign(recommendations,{grow:{title:'Build on what is working.'},explore:{title:'Follow one good question.'}});
  const extraPanels={};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const link=(text,href,cls='text-link')=>{const a=el('a',cls,text);a.href=href;return a;};
  function panel(route,title,html){const n=el('section','card focused-panel experience-card');n.hidden=true;n.innerHTML=html;main.append(n);extraPanels[route]={node:n,title};return n;}
  function profile(){return state.profile&&typeof state.profile==='object'?state.profile:{};}
  function ctx(){return G.context(profile(),day.context||{});}
  // Time of day, plus what we have learned about when this person actually lives.
  // `rhythmParts` is only ever written when they have told us a part of the day
  // suits them, so it records consent rather than a judgement about their hours.
  function rhythm(need){
    const accepted=Array.isArray(profile().rhythmParts)?profile().rhythmParts:[];
    const askedToday=typeof day.rhythmNote==='string'?day.rhythmNote:'';
    if(typeof SteadyRhythm==='undefined')return {accepted,askedToday};
    const focus=need||day.need;
    const moment=SteadyRhythm.moment(state.days,{accepted,askedToday,need:focus});
    // Where this hour sits in their own day, how much they have left, and whether
    // they are already mid-step. It only ever sets the step's size and one line of
    // explanation; it never chooses the step, and it never scores the day.
    const situation=typeof SteadyContext!=='undefined'
      ? SteadyContext.assess({days:state.days,day,moment,need:focus,catalog:G.catalog})
      : null;
    return {...moment,situation,accepted,askedToday};
  }
  function startToday(){
    const clock=rhythm();
    // A need the clock proposed stays the clock's: it is re-derived as the hour
    // moves, so an evening suggestion is not still the default at 9am the next
    // morning. Choosing a need yourself is different, and that choice is then
    // left alone for the rest of the day.
    const keep=day.needFromClock===true?undefined:day.need;
    const need=G.startingNeed(profile(),keep,clock);
    if(day.need!==need){day.need=need;save();}
    day.needFromClock=Boolean(clock.suggest)&&need===clock.suggest;
    document.querySelectorAll('[data-need]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.need===need)));
    return currentPlan();
  }
  function select(name,value,idPrefix='context') {return `<label class="context-field">${{goal:'What matters',time:'Time available',energy:'Energy',environment:'Surroundings'}[name]}<select id="${idPrefix}-${name}" data-context="${name}">${Object.entries(G.choices[name]).map(([v,l])=>`<option value="${v}"${v===value?' selected':''}>${l}</option>`).join('')}</select></label>`;}
  function currentPlan(force=false,exclude,preferredId) {
    if(!Object.hasOwn(recommendations,day.need))return null;
    const context=ctx(),clock=rhythm();
    // The clock and the day's shape are part of the signature, so a step chosen in
    // the morning is not still being offered at 1am, and a plan made before the
    // evening re-reads once the day has moved on. Both re-evaluate on each change
    // of state, not each minute, so a plan does not churn while someone reads it.
    const shape=clock.situation||{};
    const signature=JSON.stringify(['v6-next-move',day.need,context,clock.part||'',clock.quiet?'quiet':'',shape.position||'',shape.capacity||'']);
    const saved=day.plan;
    const valid=saved&&saved.signature===signature&&saved.need===day.need&&
      saved.context&&Object.entries(context).every(([key,value])=>saved.context[key]===value)&&
      ['title','copy','setup','approach','reason','assumptions','perspective'].every(key=>typeof saved[key]==='string')&&
      Number.isFinite(saved.minutes)&&saved.minutes>0&&Object.hasOwn(G.evidence,saved.evidence)&&
      (G.catalog.some(p=>p.id===saved.id&&p.need===day.need)||saved.id===`${day.need}-own`);
    if(force||!valid) {
      // Refresh wording without silently replacing a previously chosen approach.
      const keep=preferredId||(!force&&saved?.need===day.need?saved.id:undefined);
      day.plan={...G.recommend(day.need,context,state.days,exclude,keep,clock),signature};
      save();
    }
    return day.plan;
  }
  function hapticsAvailable(){return typeof window.SteadyNative?.haptic==='function'||(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function');}
  function haptic(){
    if(!hapticsAvailable()||document.documentElement.dataset.haptics!=='on'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    try{
      if(typeof window.SteadyNative?.haptic==='function')window.SteadyNative.haptic();
      else navigator.vibrate(12);
    }catch{ /* Optional feedback must never interrupt an action. */ }
  }
  function useSuggestion(id,goal,blocker){
    const item=G.catalog.find(candidate=>candidate.id===id);
    if(!item||!Object.hasOwn(G.choices.goal,goal))return false;
    // Choosing a previously helpful starting approach is an explicit request
    // to reuse that obstacle, never yesterday's energy or surroundings.
    const context={...ctx(),goal,...(typeof blocker==='string'&&Object.hasOwn(G.choices.blocker,blocker)?{blocker}:{})};
    const plan=G.recommend(item.need,context,state.days,undefined,id,rhythm(item.need));
    if(plan.id!==id)return false;
    day.need=item.need;day.context={...day.context,goal,blocker:context.blocker};
    currentPlan(true,undefined,id);navigateScreen('today/step');return true;
  }
  function actionLog(){if(!Array.isArray(day.actionLog))day.actionLog=[];return day.actionLog;}
  function matchesAction(action,plan){return action.id===plan.id&&(!action.goal||action.goal===plan.context.goal)&&(action.variant||'base')===(plan.variant||'base');}
  function isDone(plan){return actionLog().some(a=>matchesAction(a,plan));}
  function toggleCompletion(){const p=currentPlan();if(!p)return;if(p.id.endsWith('-own')){navigateScreen('direction');return;}const done=isDone(p);
    day.actionLog=done?actionLog().filter(a=>!matchesAction(a,p)):[...actionLog(),{id:p.id,title:p.title,goal:p.context.goal,variant:p.variant||'base',at:new Date().toISOString()}];
    // A legacy completion for the same action is represented once.
    if(!done&&(p.variant||'base')==='base')day.completedNeeds=day.completedNeeds.filter(k=>k!==p.need);
    day.recommendationDone=false;
    const stored=save();renderRecommendation();updateProgress();haptic();
    const heading=$('#recommendation-title');heading.tabIndex=-1;heading.focus?.({preventScroll:true});
    if(!done&&stored)toast('One small step, done.');
  }
  const checkInLabels={calm:'Find calm',clarity:'Find direction',energy:'Restore some energy',connection:'Reach out',progress:'Get past the start',rest:'Make room for rest',grow:'Build on what works',explore:'Explore a question'};
  const rec=$('#recommendation');
  // Sits directly under the step: what Steady already knew about this approach.
  const recall=el('p','step-recall');recall.id='step-recall';recall.hidden=true;rec.insertBefore(recall,$('#complete-recommendation'));
  const fit=el('p','step-fit');fit.id='step-fit';rec.insertBefore(fit,$('#complete-recommendation'));
  const blocker=el('label','context-field step-blocker','Anything making the start harder?');
  const blockerChoice=el('select');blockerChoice.setAttribute('aria-label','What is getting in the way of starting?');
  for(const [value,text]of Object.entries(G.choices.blocker)){const option=el('option','',text);option.value=value;blockerChoice.append(option);}
  blocker.append(blockerChoice);
  blockerChoice.addEventListener('change',()=>{
    const value=blockerChoice.value;if(!Object.hasOwn(G.choices.blocker,value))return;
    checkDay();day.context={...day.context,blocker:value};
    // Re-rank for the corrected circumstances; do not carry a former approach
    // across a materially different obstacle or manufacture a completion.
    currentPlan(true);renderRecommendation();blockerChoice.focus({preventScroll:true});
    if(!storageAvailable)toast('Kept for this visit only.');
  });
  const support=el('div','step-support');support.innerHTML='<p id="step-setup"></p><p id="step-approach"></p>';
  const adjust=el('div','step-links');
  const alternative=el('button','text-link','Try a different step');alternative.type='button';alternative.addEventListener('click',()=>{const p=currentPlan();if(!p){renderPlan();return;}currentPlan(true,p.id);renderRecommendation();const heading=$('#recommendation-title');heading.tabIndex=-1;heading.focus({preventScroll:true});haptic();});
  adjust.append(alternative,link('Adjust time, energy or focus','#today/context'),link('Change check-in','#today/check-in'));
  const tools=el('details','step-options');tools.append(el('summary','','Make this step fit'),blocker,adjust,support,rec.querySelector('.recommendation-details'));rec.append(tools);
  tools.open=document.getElementById('setting-guidance').value==='explained';
  rec.insertBefore($('#complete-recommendation'),tools);
  const leave=link('Leave this for now','#home','text-link step-leave');rec.append(leave);
  // A lightweight check on the schedule itself. It appears at most once a day, and
  // only once their own history shows this is not a usual hour for them. It is
  // never a correction: "yes, it suits me" is a complete answer, it is remembered,
  // and it permanently stops Steady treating these hours as unusual. Nothing here
  // touches progress, streaks or how anything is scored.
  const schedule=el('div','step-schedule');
  const scheduleText=el('p','small-copy');
  const scheduleRow=el('p','step-schedule-answers');
  const scheduleNote=el('p','small-copy');
  const scheduleYes=el('button','text-link','Yes, it suits me'),scheduleNo=el('button','text-link','Not really');
  scheduleYes.type=scheduleNo.type='button';
  scheduleRow.append(scheduleYes,scheduleNo);
  schedule.append(scheduleText,scheduleRow,scheduleNote);
  rec.insertBefore(schedule,$('#complete-recommendation'));
  let scheduleSaid='';
  const questionCopy=typeof SteadyRhythm!=='undefined'?SteadyRhythm.question:{text:'Is this schedule working for you?',detail:'',yes:'Yes, it suits me',no:'Not really',yesNote:'Understood. Steady will treat this as your normal and leave it alone.',noNote:'Understood. Nothing to fix right now — there is still one small step available, and tomorrow is a fresh start.'};
  function answerSchedule(suits){
    const part=rhythm().part;if(!part)return;
    // Only the fact that we asked is stored per day, so this cannot nag.
    day.rhythmNote=part;
    if(suits)state.profile={...profile(),rhythmParts:[...new Set([...(profile().rhythmParts||[]),part])]};
    scheduleSaid=suits?questionCopy.yesNote:questionCopy.noNote;
    save();
    // "Suits me" means the clock should stop referring to the hour, so the step
    // is re-read. Both answers leave progress and history untouched.
    currentPlan(true);renderPlan();haptic();
  }
  scheduleYes.addEventListener('click',()=>answerSchedule(true));
  scheduleNo.addEventListener('click',()=>answerSchedule(false));
  const feedback=el('div','feedback');feedback.innerHTML='<details class="step-feedback"><summary>How did it go? <span class="small-copy">Optional</span></summary><div class="chip-row" role="group" aria-label="Was this step useful?"></div></details><p class="small-copy" id="feedback-status" role="status"></p>';
  for(const [value,label]of [['useful','Helped'],['neutral','No change'],['not-useful','Not useful'],['worse','Made things worse']]){
    const b=el('button','chip',label);b.type='button';b.dataset.rating=value;b.addEventListener('click',()=>{
      const p=currentPlan();if(!p){renderPlan();return;}if(!Array.isArray(day.outcomes))day.outcomes=[];
      const outcome={id:p.id,variant:p.variant||'base',rating:value,context:p.context,at:new Date().toISOString()};
      day.outcomes=day.outcomes.filter(o=>G.feedbackKey(o)!==G.feedbackKey(outcome));day.outcomes.push(outcome);
      const stored=save();renderFeedback(p);if(!stored)$('#feedback-status').textContent='Not saved on this device.';haptic();
    });feedback.querySelector('.chip-row').append(b);
  }
  const completionNext=el('div','step-completion-actions');
  const completionState=el('p','step-done','✓ Done');
  const undo=el('button','text-link step-undo','Undo completion');undo.type='button';undo.addEventListener('click',toggleCompletion);
  completionNext.append(completionState,link('Done for now','#home','button primary'));
  rec.append(completionNext,feedback,undo);
  function renderFeedback(p){const done=isDone(p);feedback.hidden=false;completionNext.hidden=!done;undo.hidden=!done;const rating=day.outcomes?.find(o=>G.feedbackKey(o)===G.feedbackKey(p))?.rating;feedback.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rating===rating)));feedback.querySelector('details').open=!!rating;$('#feedback-status').textContent=!storageAvailable?'Kept for this visit only.':({useful:'Saved. We’ll favour this approach in similar circumstances.',neutral:'Saved. No change noted.', 'not-useful':'Saved. Other approaches are now more likely in similar circumstances.',worse:'Saved. We will avoid this approach in future suggestions.'}[rating]||'');}
  function renderPlan(){const p=currentPlan();$('#recommendation-empty').hidden=!!p;rec.hidden=!p;if(!p)return;
    $('#recommendation-label').textContent=`${p.minutes} ${p.minutes===1?'minute':'minutes'} · ${checkInLabels[p.need]||'Your choice'}`;
    $('#recommendation-title').textContent=p.title;$('#recommendation-copy').textContent=p.copy;
    fit.textContent=p.fitReason||p.reason;
    // What Steady remembered about this step, shown only when it really remembers.
    // This is the visible half of the learn loop: the ranking already used this
    // history, and saying so is what makes a suggestion feel considered.
    recall.textContent=p.recall||'';
    recall.hidden=!p.recall;
    const clock=rhythm();
    schedule.hidden=!clock.ask&&!scheduleSaid;
    if(!scheduleSaid){scheduleText.textContent=`${questionCopy.text} ${questionCopy.detail}`;}
    scheduleText.hidden=Boolean(scheduleSaid);
    scheduleRow.hidden=Boolean(scheduleSaid);
    scheduleNote.textContent=scheduleSaid;
    blocker.hidden=p.need!=='progress'||isDone(p);blockerChoice.value=p.context.blocker||'none';
    $('#step-setup').textContent=p.context.environment==='anywhere'?'':p.setup;
    $('#step-setup').hidden=p.context.environment==='anywhere';
    $('#step-approach').textContent=p.pacing||p.approach;
    const why=$('#recommendation-reason');
    const reason=p.reason.replace(/^A suggestion for [^.]+, taking about \d+ minutes?\./,'A small suggestion based on your check-in.');
    const explanation=[el('p','',reason)];
    if(p.need==='clarity')explanation.push(el('p','',p.perspective));
    explanation.push(el('p','small-copy','Steady draws from a small library; this is not a full assessment.'),link('Sources & limits','#settings/about'));
    why.replaceChildren(...explanation);
    const done=isDone(p);fit.hidden=done;rec.classList.toggle('step-finished',done);$('#complete-recommendation').textContent=p.id.endsWith('-own')?'Choose my own step →':done?'Done ✓':'Mark as done';alternative.hidden=p.id.endsWith('-own');$('#complete-recommendation').classList.toggle('completed',done);$('#complete-recommendation').setAttribute('aria-pressed',String(done));
    $('#complete-recommendation').hidden=done;$('#recommendation-label').hidden=done;tools.hidden=done;leave.hidden=done;
    if(done)schedule.hidden=true;
    renderFeedback(p);
  }
  const contextPanel=panel('today/context','Make it fit','<div class="eyebrow">OPTIONAL · NO SETUP REQUIRED</div><h2>A step that fits your day.</h2><p class="small-copy">Change only what matters. Your time, energy and surroundings reset tomorrow.</p><form id="context-form"><div class="context-grid"></div><details class="context-more"><summary>Energy & surroundings</summary><div class="context-extra context-grid"></div></details><button class="button primary" type="submit">Use these choices →</button></form><a href="#today/step" class="text-link">Keep it simple</a>');
  let contextDraft={},contextDraftDay=today;
  contextPanel.querySelector('form').addEventListener('change',event=>{const key=event.target.dataset.context;if(key)contextDraft[key]=event.target.value;});
  function renderContext(){if(contextDraftDay!==today){contextDraft={};contextDraftDay=today;}const values={...ctx(),...contextDraft};contextPanel.querySelector('.context-grid').innerHTML=['goal','time'].map(k=>select(k,values[k])).join('');contextPanel.querySelector('.context-extra').innerHTML=['energy','environment'].map(k=>select(k,values[k])).join('');}
  contextPanel.querySelector('form').addEventListener('submit',event=>{event.preventDefault();checkDay();const preferred=currentPlan()?.id;state.profile={...profile()};day.context={...day.context};delete day.context.goal;for(const select of contextPanel.querySelectorAll('[data-context]')){const key=select.dataset.context;if(key==='goal')state.profile[key]=select.value;else day.context[key]=select.value;}contextDraft={};save();currentPlan(true,undefined,preferred);navigateScreen(day.need?'today/step':'today');});
  // Scripture is selected from a finite, verified library. Matching runs on this device.
  function chooseScripture(){const source=profile().useNotes===true?day:{...day,mind:'',intention:'',reflection:'',reflections:[],tasks:[]};return G.scripture(source,ctx(),day.scriptureTheme,state.scriptureRequests);}
  learn.classList.add('scripture-panel');
  learn.innerHTML='<h2 id="truth-title" class="sr-only">A word for today.</h2><blockquote id="personal-verse"></blockquote><p class="verse-reference" id="personal-reference"></p><p id="visible-verse-context" class="small-copy"></p><a href="#learn/chapter" class="text-link">Read in chapter context →</a><details class="scripture-details"><summary>Why this passage?</summary><p id="scripture-reason"></p><p id="scripture-context"></p><label class="context-field">Choose a theme<select id="scripture-theme"><option value="auto">Match my day</option></select></label><p class="small-copy">Simple theme matching can miss meaning. This passage is an invitation to reflect, not a claim about what God is telling you to do.</p><a id="scripture-source" target="_blank" rel="noopener noreferrer">Read the chapter ↗</a></details>';
  for(const [value,label]of Object.entries(G.themes)){const option=el('option','',label);option.value=value;$('#scripture-theme').append(option);}
  $('#scripture-theme').addEventListener('change',event=>{day.scriptureTheme=event.target.value;save();renderScripture();renderPlan();});
  const verseContext={foundation:'Jesus closes the Sermon on the Mount by connecting hearing his teaching with living it out.',rest:'Jesus invites people carrying heavy burdens to come to him and learn his gentle way.',wisdom:'James encourages people facing trials to ask God for wisdom.',connection:'Paul calls a community to care for one another, including carrying one another’s burdens.',gratitude:'Paul encourages a community in prayer and thanksgiving. Gratitude does not require calling painful events good.',grief:'This psalm describes God’s nearness to people in distress. Sorrow is not a failure of faith.',grace:'Paul calls the community away from bitterness and toward kindness and forgiveness.'};
  function renderScripture(){const chosen=chooseScripture();const verse=ScriptureLibrary[chosen.key];const translation=document.documentElement.dataset.translation==='asv'?'asv':'web';$('#personal-verse').textContent=verse.translations[translation].text;$('#personal-reference').textContent=`${verse.reference} · ${translation.toUpperCase()}`;$('#scripture-reason').textContent=chosen.reason;$('#scripture-context').textContent='The full chapter is available in Steady, in your selected translation.';$('#visible-verse-context').textContent=verseContext[chosen.key];$('#scripture-theme').value=Object.hasOwn(G.themes,day.scriptureTheme)?day.scriptureTheme:'auto';
    $('#scripture-source').href=ScriptureChapters[chosen.key].sources[translation];
  }
  const historyPanel=panel('review/progress','Your record','<div class="eyebrow">YOUR OWN RECORD</div><h2>What you’ve put into practice.</h2><p class="progress-explainer">Your actions, notes and reflections, kept together. There is no streak to protect.</p><div class="progress-totals" id="progress-totals"></div><p id="useful-summary" class="small-copy"></p><div id="progress-days"></div><button class="text-link" id="more-history" type="button" aria-controls="progress-days">Earlier days</button><p id="history-status" class="sr-only" role="status"></p><p class="small-copy">Your record stays here when you take time away.</p>');
  let historyLimit=7;
  $('#more-history').addEventListener('click',()=>{const firstNew=historyLimit;historyLimit+=7;renderHistory(firstNew);});
  function renderHistory(firstNew=null){
    const data=G.progress(state.days);$('#progress-totals').replaceChildren();
    for(const [number,label]of [[data.actions,data.actions===1?'action':'actions'],[data.reflections,data.reflections===1?'day reflected':'days reflected'],...(data.practice?[[data.practice,'earlier practices']]:[])]){const tile=el('div');tile.append(el('strong','',String(number)),el('span','',label));$('#progress-totals').append(tile);}
    $('#useful-summary').textContent=data.ratings?`${data.useful} of ${data.ratings} rated steps felt useful to you.`:'As you try things, your feedback will show what felt useful.';
    const list=$('#progress-days');list.replaceChildren();
    if(!data.rows.length)list.append(el('p','small-copy','Your notes, reflections and planned or completed steps will appear here.'),link('Reflect on today','#review','button primary'));
    const items=[];
    for(const row of data.rows.slice(0,historyLimit)){
      const item=el('a','history-row history-entry'),date=new Date(`${row.date}T12:00:00`);
      const summary=[row.actions?`${row.actions} ${row.actions===1?'action':'actions'}`:'',row.planned?`${row.planned} planned`:'',row.practice?`${row.practice} ${row.practice===1?'practice':'practices'}`:'',row.reflection?'Reflected':'',row.note?'Note':'',row.closed&&!row.reflection?'Day closed':''].filter(Boolean).join(' · ');
      item.href='#review/day/'+row.date;
      item.setAttribute('data-navigation-focus','record:'+row.date);
      item.setAttribute('aria-label',date.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(summary?', '+summary:''));
      item.append(el('strong','',date.toLocaleDateString(undefined,{day:'numeric',month:'short'})),el('span','',summary));
      list.append(item);items.push(item);
    }
    $('#more-history').hidden=data.rows.length<=historyLimit;
    const added=firstNew===null?0:Math.max(0,items.length-firstNew);
    $('#history-status').textContent=firstNew===null?'':added?`${added} earlier ${added===1?'day':'days'} shown. ${items.length} of ${data.rows.length} days.`:`All ${items.length} days are shown.`;
    if(firstNew!==null)(items[Math.min(firstNew,items.length-1)]||list.querySelector('a'))?.focus();
  }
  // Preserve existing private notes without adding a second writing flow for new users.
  const legacyNote=document.getElementById('mind-note').closest('details');
  legacyNote.classList.add('legacy-note');
  legacyNote.querySelector('summary').textContent='Your earlier note';
  legacyNote.append(document.getElementById('mind-status'));
  review.insertBefore(legacyNote,document.getElementById('finish-day'));
  legacyNote.hidden=!day.mind.trim();
  review.append(link('Your record','#review/progress','text-link progress-link'));
  // Reading and privacy settings have separate, visible homes.
  const more=$('.settings-more');
  const preferences=el('div','more-preferences');preferences.innerHTML='<div class="settings-row"><label for="setting-size">Text size</label><select id="setting-size"><option value="system">Follow device</option><option value="standard">Standard</option><option value="large">Larger</option></select></div><div class="settings-row"><label for="setting-translation">Bible translation</label><select id="setting-translation"><option value="web">WEB · modern English</option><option value="asv">ASV · traditional English</option></select></div>';
  const advancedPreferences=el('div','more-preferences');advancedPreferences.innerHTML='<div class="settings-row"><label for="setting-spacing">Spacing</label><select id="setting-spacing"><option value="standard">Standard</option><option value="roomy">Roomier</option></select></div><div class="settings-row"><label for="setting-motion">Animations</label><select id="setting-motion"><option value="system">Follow device</option><option value="off">Off</option></select></div><div class="settings-row" id="haptics-preference"><div><label for="setting-haptics">Haptics</label><p>Brief feedback on supported devices.</p></div><select id="setting-haptics"><option value="off">Off</option><option value="on">On</option></select></div>';
  document.getElementById('advanced-reading-preferences').append(advancedPreferences);
  document.getElementById('reading-preferences').append(preferences);
  const syncHapticsAvailability=()=>{$('#haptics-preference').hidden=!hapticsAvailable();};
  syncHapticsAvailability();
  let reading={},readingReadFailed=false;
  try{
    const stored=JSON.parse(localStorage.getItem('steady.reading'));
    if(stored!==null){
      if(typeof stored==='object'&&!Array.isArray(stored))reading=stored;
      else readingReadFailed=true;
    }
  }catch{readingReadFailed=true;}
  const readingReadFailureMessage='Saved reading preferences could not be read. Existing preferences have not been changed. Changes apply to this session only.';
  if(readingReadFailed)$('#settings-status').textContent=readingReadFailureMessage;
  function saveReading(){
    if(readingReadFailed){$('#settings-status').textContent=readingReadFailureMessage;return;}
    try{localStorage.setItem('steady.reading',JSON.stringify(reading));$('#settings-status').textContent='Saved';}
    catch{$('#settings-status').textContent='Applied for this session. Device storage is unavailable.';}
  }
  const readingOptions={size:['system','standard','large'],spacing:['standard','roomy'],translation:['web','asv'],motion:['system','off'],haptics:['off','on']};
  const applyTextSize=()=>{document.documentElement.dataset.size=reading.size==='system'?(document.documentElement.dataset.systemLargeText==='true'?'large':'standard'):reading.size;};
  for(const [key,values]of Object.entries(readingOptions)){reading[key]=values.includes(reading[key])?reading[key]:values[0];const control=$(`#setting-${key}`);control.value=reading[key];if(key==='size')applyTextSize();else document.documentElement.dataset[key]=reading[key];control.addEventListener('change',()=>{if(!values.includes(control.value)||(key==='haptics'&&!hapticsAvailable())){control.value=reading[key];return;}reading[key]=control.value;if(key==='size')applyTextSize();else document.documentElement.dataset[key]=control.value;saveReading();renderScripture();});}
  window.addEventListener('steady:system-text-size',applyTextSize);
  const rainbowRainControl=$('#setting-rainbow-rain');
  function applyRainbowRain(){
    const enabled=profile().rainbowRain===true;
    rainbowRainControl.checked=enabled;
    document.documentElement.dataset.rainbowRain=enabled?'on':'off';
    return enabled;
  }
  applyRainbowRain();
  rainbowRainControl.addEventListener('change',()=>{
    state.profile={...profile(),rainbowRain:rainbowRainControl.checked===true};
    const enabled=applyRainbowRain(),stored=save();
    $('#settings-status').textContent=stored?'Saved':'Applied for this visit only.';
    window.dispatchEvent(new CustomEvent('steady:rainbow-rain-setting',{detail:{enabled}}));
  });
  $('#use-notes').checked=profile().useNotes===true;$('#use-notes').addEventListener('change',event=>{state.profile={...profile(),useNotes:event.target.checked};const stored=save();$('#settings-status').textContent=stored?'Saved':'Applied for this visit only.';renderScripture();renderPlan();});
  more.append(link('Sources & limits','#settings/about'));
  function routePanel(route){if(route==='learn/scripture')return {node:learn,title:'Scripture'};return extraPanels[route.startsWith('review/day/')?'review/day':route];}
  function renderHomeEntry(){
    renderHomeScripture();
  }
  function onScreen(route){
    if(route==='settings')syncHapticsAvailability();
    if(route==='home')renderHomeEntry();
    Object.values(extraPanels).forEach(p=>p.node.hidden=p!==extraPanels[route.startsWith('review/day/')?'review/day':route]);
    if(route==='today/step'){renderPlan();tools.open=document.getElementById('setting-guidance').value==='explained';}
    if(route==='today/context')renderContext();
    if(route==='learn/scripture')renderScripture();
    if(route==='review')legacyNote.hidden=!day.mind.trim();
    if(route==='review/progress')renderHistory();
  }
  // Recompute only when displaying the recommendation, not while someone is writing.
  document.addEventListener('steady:screen',event=>onScreen(event.detail));
  return {routePanel,onScreen,renderPlan,toggleCompletion,haptic,startToday,useSuggestion,addPanel:panel,scriptureChoice:chooseScripture};
})();
window.steadyExperience=SteadyExperience;
renderRecommendation=SteadyExperience.renderPlan;
const originalUpdateProgress=updateProgress;
updateProgress=()=>{originalUpdateProgress();for(const action of day.actionLog||[]){const row=document.createElement('p');row.className='completed-step';row.textContent=`✓ ${action.title}`;$('#completed-actions').append(row);}};
renderRecommendation();updateProgress();renderScreen();
