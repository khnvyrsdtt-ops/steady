'use strict';
// Editorial invitations, not additional Bible text or claims of divine direction.
const SteadyScriptureReflection = (() => {
  const themes = {
    foundation: {
      practice:['Live it out','At your next ordinary choice, put one teaching of Jesus into practice. Start with something small enough to do today.'],
      pause:['Listen more closely','Read the passage again. Notice the connection Jesus makes between hearing and doing.'],
      pray:['Ask for steady faith','Jesus, help me hear your words and live them out, one faithful step at a time.']
    },
    rest: {
      practice:['Make room to rest','Let one non-urgent demand wait. Take a comfortable pause without turning it into another task.'],
      pause:['Name what feels heavy','Bring one burden to mind. You do not have to explain it neatly or solve it in this moment.'],
      pray:['Bring it to Jesus','Jesus, you know what I am carrying. Help me receive your gentleness and learn your way.']
    },
    wisdom: {
      practice:['Seek wise counsel','Ask someone you trust one clear question about a choice you are facing. Consider their reasons before deciding.'],
      pause:['Check an assumption','Separate one thing you know from one thing you are assuming. What could help you check the uncertain part?'],
      pray:['Ask God for wisdom','God, give me wisdom for the choice in front of me, and humility to notice what I do not yet understand.']
    },
    connection: {
      practice:['Offer a small help','Ask someone whether there is one practical thing you could help with. Let them decide what would be welcome.'],
      pause:['Listen to someone','In your next conversation, give the other person space to finish before offering advice.'],
      pray:['Pray for someone','God, care for the person on my mind. Show me how to be present without taking over.']
    },
    gratitude: {
      practice:['Thank someone','Send or say one honest sentence of thanks to someone whose care you noticed.'],
      pause:['Notice something good','Recall one good thing from today, however ordinary. You can appreciate it without pretending the hard parts were good.'],
      pray:['Give thanks honestly','God, thank you for the good I can see today. I bring the difficult parts to you too.']
    },
    grief: {
      practice:['Reach someone safe','If it feels right, let someone you trust know you would value their company. You do not need to explain everything.'],
      pause:['Be honest about sorrow','Let this passage sit alongside what you feel. Sorrow does not need to be hurried into a lesson.'],
      pray:['Pray without perfect words','God, I do not have all the words. Be near to me in what hurts, and help me receive care.']
    },
    grace: {
      practice:['Choose kindness','Make one response a little kinder today. Kindness can sit alongside a clear boundary.'],
      pause:['Pause before replying','Notice the tone you want to bring to your next reply. You can take a moment before responding.'],
      pray:['Ask for a softer response','God, help me respond with kindness and truth. Give me patience with myself and with others.']
    }
  };
  function read(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.theme !== 'string' || !Object.hasOwn(themes, value.theme)) return null;
    if (!['practice','pause','pray','sit'].includes(value.choice)) return null;
    const [title, copy] = value.choice === 'sit'
      ? ['Sit with this passage','Read it once more, slowly. There is no task to complete or answer you need to produce.']
      : themes[value.theme][value.choice];
    return { theme:value.theme, choice:value.choice, title, copy };
  }
  return { themes, read };
})();
if (typeof module !== 'undefined') module.exports = SteadyScriptureReflection;

if (typeof document !== 'undefined') (() => {
  const model = SteadyScriptureReflection;
  const make = (tag, className, text) => { const node=document.createElement(tag);node.className=className||'';if(text)node.textContent=text;return node; };
  const destination = window.steadyExperience.addPanel('learn/reflect','Reflect on Scripture',
    '<div class="eyebrow">SCRIPTURE → LIFE</div><p class="reflection-reference"></p><div class="scripture-response-content"></div>');
  destination.classList.add('scripture-response');
  const content = destination.querySelector('.scripture-response-content');
  let theme = 'foundation';
  let choosing = false;
  const start = make('a','button primary scripture-reflect-start','Reflect on this passage');
  start.href='#learn/reflect';
  learn.insertBefore(start,learn.querySelector('a[href="#learn/chapter"]'));
  const summary = make('a','path-link scripture-day-summary');summary.href='#learn/reflect';summary.hidden=true;
  summary.append(make('span',''),make('span','','→'));summary.lastChild.setAttribute('aria-hidden','true');
  review.insertBefore(summary,review.querySelector('.optional-write'));
  summary.addEventListener('click',()=>{
    const saved=model.read(day.scriptureReflection);
    if(saved){day.scriptureTheme=saved.theme;save();}
  });
  const homePassageActions = make('div','home-passage-actions');
  const homeReflect = make('a','button primary','Reflect on this passage');homeReflect.href='#learn/reflect';
  homePassageActions.append(homeReflect);hub.querySelector('.home-scripture-content').append(homePassageActions);
  function renderHomeResponse(){
    const saved=model.read(day.scriptureReflection);
    homeReflect.textContent=saved?.theme===window.steadyExperience.scriptureChoice().key?'Return to your reflection':'Reflect on this passage';
  }
  function renderSummary() {
    const saved=model.read(day.scriptureReflection);summary.hidden=!saved;
    if(saved)summary.firstChild.replaceChildren(make('strong','',ScriptureLibrary[saved.theme].reference),make('small','',saved.title));
  }
  function choose(choice) {
    const selected=model.read({theme,choice});if(!selected)return;
    day.scriptureReflection={theme,choice};
    if(day.scriptureDirection)day.scriptureDirection.active=false;
    const stored=save();choosing=false;render();renderSummary();renderHomeResponse();window.steadyExperience.haptic();
    destination.querySelector('[role="status"]').textContent=stored?'Saved for today.':'Kept for this visit only.';
    content.querySelector('h2').focus();
  }
  function render() {
    const saved=model.read(day.scriptureReflection);
    const current=saved?.theme===theme?saved:null;
    destination.querySelector('.reflection-reference').textContent=ScriptureLibrary[theme].reference;
    content.replaceChildren();
    if(current&&!choosing){
      const heading=make('h2','',current.title);heading.tabIndex=-1;
      content.append(make('div','mini-label',current.choice==='pray'?'A PRAYER TO MAKE YOUR OWN':'A THOUGHT TO CARRY'),heading,
        make('p',current.choice==='pray'?'response-prayer':'response-copy',current.copy));
      const status=make('p','small-copy response-status',storageAvailable?'Saved for today.':'Kept for this visit only.');status.setAttribute('role','status');content.append(status);
      const direction=make('a',current.choice==='sit'?'text-link':'button primary',current.choice==='sit'?'Optional: a practical next step':'Find a small next step');direction.href='#today/scripture-step';direction.addEventListener('click',()=>{const r=day.scriptureDirection;if(r){if(r.theme!==theme||r.choice!==current.choice)r.active=false;else delete r.fromSaved;save();}});content.append(direction);
      const leave=make('a',current.choice==='sit'?'button primary':'text-link','Done for now');leave.href='#home';content.append(leave);
      const change=make('button','text-link','Change my response');change.type='button';
      change.addEventListener('click',()=>{choosing=true;render();content.querySelector('h2').focus();});content.append(change);
      return;
    }
    const heading=make('h2','','What will you carry into today?');heading.tabIndex=-1;
    content.append(heading,make('p','small-copy','Choose what feels useful. No writing needed.'));
    const choices=make('div','scripture-response-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','Your response to this passage');
    for(const [id,[title]] of Object.entries(model.themes[theme])){
      const button=make('button','answer',title);button.type='button';button.setAttribute('aria-pressed',String(current?.choice===id));button.addEventListener('click',()=>choose(id));choices.append(button);
    }
    const sit=make('button','text-link','Just sit with this passage');sit.type='button';sit.addEventListener('click',()=>choose('sit'));
    content.append(choices,sit);
  }
  function onScreen(route) {
    if(route==='learn/reflect'){
      const nextTheme=window.steadyExperience.scriptureChoice().key;if(nextTheme!==theme)choosing=false;theme=nextTheme;render();
    }
    if(route==='review')renderSummary();
    if(route==='home'){
      renderHomeScripture();
      renderHomeResponse();
    }
    if(route==='learn/scripture'){
      const saved=model.read(day.scriptureReflection);
      start.textContent=saved?.theme===window.steadyExperience.scriptureChoice().key?'Return to your reflection':'Reflect on this passage';
    }
  }
  document.addEventListener('steady:screen',event=>onScreen(event.detail));
  document.addEventListener('change',event=>{if(event.target.id==='scripture-theme')onScreen('learn/scripture');});
  renderSummary();renderHomeResponse();
})();
