'use strict';
(() => {
  const X=window.steadyExperience, M=SteadyFeelings, H=SteadyScriptureHelp;
  const route='today/feelings';
  const askHelp=typeof SteadyAskHelp!=='undefined'?SteadyAskHelp:null;
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const link=(text,href,cls='text-link')=>{const n=node('a',cls,text);n.href=href;return n;};
  const entries=()=>M.normalizeEntries(state.scriptureRequests);
  const current=()=>entries().find(item=>!item.study&&item.id===day.scriptureRequest);

  const panel=X.addPanel(route,'Steady',`<div class="steady-top-shade" aria-hidden="true"></div><form id="feelings-form">
    <label class="sr-only" for="feelings-note">Write a thought or question</label>
    <div class="chat-viewport"><div class="chat-scroll" role="log" tabindex="0" aria-label="Your Steady conversation" aria-live="polite" aria-relevant="additions">
      <div class="chat-welcome" aria-live="off">
        <button class="ask-guided-back" type="button" hidden>← Back</button>
        <div class="guide-avatar" hidden><div class="donkey-guide" data-expression="neutral" aria-hidden="true"><img class="donkey-pop" src="./art/animals/burden-painted.png" alt="" width="45" height="45" decoding="async"></div></div>
        <div class="steady-welcome-identity"><span class="steady-presence steady-presence-welcome" data-state="resting" aria-hidden="true"><img src="./brand/presence-s.svg" alt="" width="31" height="45"></span><div class="chat-bubble assistant-bubble"><p class="ask-kicker">Today</p><h1 class="ask-welcome-title">Take your time.</h1><div class="donkey-signature" hidden><strong>Burden</strong><span>BALANCED HELP</span></div><p class="animal-summary" hidden>Balanced support for anything on your mind.</p><p class="chat-method">Start with</p></div></div>
        <div class="ask-starters" role="group" aria-label="A few places to start"></div>
        <details class="ask-explore" hidden><summary>Find words for how I feel</summary><div class="chat-suggestions" role="group" aria-label="Suggested questions"></div></details>
        <div class="ask-guided-footer"><button class="ask-guided-skip" type="button" hidden>Skip this question</button><button class="ask-write-own" type="button">Write instead</button><button class="ask-resume" type="button" hidden>Continue last chat</button></div>
        <p class="ask-guided-status" role="status"></p>
      </div>
    </div></div>
    <div class="chat-input-area">
      <details class="ask-composer-tools"><summary aria-label="Open tools"><span class="ask-tools-plus" aria-hidden="true">+</span><span class="ask-tools-label">Tools</span></summary><div class="ask-tools-menu"></div></details>
      <div class="chat-composer"><textarea id="feelings-note" rows="1" maxlength="1200" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Say it your way…"></textarea><button class="chat-send" type="submit" aria-label="Send message" data-empty="true">${SteadyIcons.svg('send')}</button></div>
      <p id="feelings-status" class="small-copy" role="status"></p>
    </div>
  </form>`);
  panel.classList.add('feelings-panel');
  const input=panel.querySelector('textarea'), sendButton=panel.querySelector('.chat-send'), status=panel.querySelector('#feelings-status'), chatScroll=panel.querySelector('.chat-scroll');
  function syncSendButton(){sendButton.setAttribute('data-empty',String(!input.value.trim()));}
  const welcome=chatScroll.querySelector('.chat-welcome');
  const suggestions=panel.querySelector('.chat-suggestions');
  const starters=panel.querySelector('.ask-starters');
  let welcomeStage='start', chosenTopic=null, reflectionChoice=null, welcomeTransition=null;
  let draftIntent=null, inlinePrompt=null;
  let draftPresence=null;
  let composerFocused=false, actionsView=null;
  const reflectionSaveResults=new Map();
  let pendingTurn=null;
  function recentConversation(history){
    const item=history?.[0],age=Date.now()-Date.parse(item?.at);
    return item&&!item.reflection&&Number.isFinite(age)&&age>=0&&age<=2*60*60*1000?item:null;
  }
  function scriptureRoute(text,history,personal,explicitScripture=false){
    const requested=askHelp?.requestedStyle(text),prior=requested?recentConversation(history):null;
    const options={bible:window.SteadyBible,study:typeof SteadyStudy!=='undefined'?SteadyStudy:null,personal,history,explicitScripture:explicitScripture||requested==='owl'};
    // Changing the shape of an answer does not change its source. A Scripture
    // continuation stays with the immediately preceding library result.
    if(prior?.study&&!prior.answer){
      const continued=window.SteadyAskRouting.resolve('explain more',options);
      return {scripture:true,study:continued.study?.kind!=='clarify'?continued.study:prior.study};
    }
    if(prior?.guide&&!prior.answer&&!prior.unmatched)return {scripture:true,study:null};
    return window.SteadyAskRouting.resolve(text,options);
  }
  function modelHistory(history){
    return history.slice(0,3).reverse().flatMap(item=>{
      const turns=[{role:'user',text:item.text.slice(0,1200)}];
      const reply=item.answer?window.SteadyAskRouting.validGeneralAnswer(item.answer.text)
        :!item.study&&!item.reflection&&item.guide?askHelp?.source(item.helpStyle,H.guides[item.guide]):'';
      if(reply)turns.push({role:'assistant',text:reply.slice(0,1800)});
      return turns;
    }).slice(-6);
  }
  function showPendingTurn(){
    if(active&&pendingTurn)showTyping(pendingTurn.message,{stage:'thinking'},pendingTurn.text);
  }
  function beginTurn(text,opts,message,operation,minimum=0){
    const turn={text,opts,message,started:Date.now()};
    pendingTurn=turn;understandingPending=true;showPendingTurn();
    let deadline;
    Promise.race([Promise.resolve().then(operation),new Promise(resolve=>{deadline=setTimeout(()=>resolve({available:false}),30000);})])
      .catch(()=>({available:false})).then(result=>{
        clearTimeout(deadline);
        const finish=()=>{
          if(pendingTurn!==turn)return;
          pendingTurn=null;understandingPending=false;
          const answer=result?.available===true&&state.profile?.burdenAI!==false?window.SteadyAskRouting.validGeneralAnswer(result.text):null;
          commitSubmit(text,{...opts,...(opts.generalRequest?(answer?{answer}:{answerUnavailable:true}):{})},null);
        };
        const remaining=minimum-(Date.now()-turn.started);
        if(remaining>0)setTimeout(finish,remaining);else finish();
      });
  }
  function presence(state='resting'){
    const mark=node('span','steady-presence steady-presence-small');
    mark.setAttribute('data-state',state);mark.setAttribute('aria-hidden','true');
    const glyph=node('img','steady-presence-glyph');
    glyph.src='./brand/presence-s.svg';glyph.alt='';glyph.width=17;glyph.height=25;
    mark.append(glyph);return mark;
  }
  const inputArea=panel.querySelector('.chat-input-area');
  let active=false, scrollScheduled=false, expectedScrollTop=null, pendingReplyId=null, pendingInline=null, typingTimer=null, typingRow=null;
  let inputAreaHeight=0;
  let leadingSpace=null;
  let transcriptSignature='', transcriptRows=new Map(), lastConvoExpression='neutral';
  let localUnderstandingAvailable=false, understandingPending=false;
  window.SteadyNative?.localAIStatus?.().then(value=>{localUnderstandingAvailable=value?.available===true;}).catch(()=>{});
  const scrollPosition={top:0,height:0,followLatest:true};
  const reducedMotion=()=>document.documentElement.dataset.motion==='off'||!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Every guided choice has an immediate purpose: choose a topic, choose the
  // kind of help, or explicitly save a reflection. Unsubmitted choices stay local.
  const guidedBack=welcome.querySelector('.ask-guided-back');
  const guidedSkip=welcome.querySelector('.ask-guided-skip');
  const guidedStatus=welcome.querySelector('.ask-guided-status');
  const resumeConversation=welcome.querySelector('.ask-resume');
  function leaveWelcome(){
    welcomeStage=null;
    welcome.hidden=true;
    chatScroll.classList.remove('is-starting');
    leadingSpace=null;scrollPosition.followLatest=true;
    restoreScroll();
  }
  function writeFreely(){
    closeActions();resetIntent();
    syncDraftPresence();
    if(typeof window.SteadyNative?.focusAsk==='function')window.SteadyNative.focusAsk();
    else input.focus();
  }
  const intents={
    talk:{title:'Talk it through',question:'What would you like to sort out?',placeholder:'Start wherever you like…'},
    step:{title:'One next step',question:'What are you trying to get done?',placeholder:'Something to move forward…'},
    scripture:{title:'Explore Scripture',question:'Which passage or Bible question is on your mind?',note:'Passages and reading notes come from the library.',placeholder:'A passage or Bible question…'},
    reflect:{title:'Keep a reflection',question:'What stood out to you today?',note:'Sending saves it with today’s reflections.',placeholder:'Something worth keeping…'},
    action:{title:'Save an action',question:'What’s one small thing you want to do?',note:'Tap the tick to save it to My actions.',placeholder:'One small action…'}
  };
  function closeActions(){actionsView?.remove();actionsView=null;}
  function shouldShowWelcome(){
    return !entries().length&&!draftIntent&&!inlinePrompt&&!actionsView&&!understandingPending;
  }
  function syncDraftPresence(){
    const emptyWelcome=shouldShowWelcome();
    if(emptyWelcome&&(welcomeStage!=='start'||welcome.hidden)){
      welcomeStage='start';renderMainWelcome();
    }else if(!emptyWelcome&&welcomeStage==='start')leaveWelcome();
    welcome.querySelector('.steady-presence-welcome')?.setAttribute('data-state',composerFocused?'listening':'resting');
    const show=!emptyWelcome&&!inlinePrompt&&!actionsView&&!understandingPending&&(composerFocused||input.value.trim());
    if(show&&!draftPresence){
      draftPresence=node('div','chat-draft-presence');draftPresence.setAttribute('aria-hidden','true');
      draftPresence.append(presence(composerFocused?'listening':'resting'),node('span','','Take your time.'));
      chatScroll.append(draftPresence);
    }else if(!show){draftPresence?.remove();draftPresence=null;}
    draftPresence?.querySelector('.steady-presence')?.setAttribute('data-state',composerFocused?'listening':'resting');
    inlinePrompt?.querySelector('.steady-presence')?.setAttribute('data-state',composerFocused?'listening':'resting');
  }
  function setComposerFocused(focused){
    composerFocused=focused===true;
    syncDraftPresence();
  }
  function resetIntent(){
    draftIntent=null;
    draftPresence?.remove();draftPresence=null;
    inlinePrompt?.remove();inlinePrompt=null;
    input.placeholder='Say it your way…';
    sendButton.setAttribute('aria-label','Send message');sendButton.innerHTML=SteadyIcons.svg('send');
    window.SteadyNative?.setAskPrompt?.('Say it your way…',false);
  }
  function startIntent(key){
    const choice=intents[key];if(!choice)return;
    closeActions();resetIntent();
    draftIntent=key;
    leaveWelcome();
    inlinePrompt=node('div','chat-inline-prompt');
    inlinePrompt.setAttribute('data-intent',key);
    const copy=node('div','chat-prompt-copy');
    copy.append(node('strong','chat-prompt-title',choice.title),node('p','',choice.question));
    if(choice.note)copy.append(node('p','chat-prompt-note small-copy',choice.note));
    const dismiss=node('button','chat-prompt-close','×');dismiss.type='button';dismiss.setAttribute('aria-label','Return to open chat');
    dismiss.addEventListener('click',writeFreely);
    inlinePrompt.append(presence('listening'),copy,dismiss);
    if(key==='reflect')renderKeptReflection();
    chatScroll.append(inlinePrompt);
    input.placeholder=choice.placeholder;
    if(key==='reflect'||key==='action'){
      sendButton.setAttribute('aria-label',key==='action'?'Save action':'Save reflection');
      sendButton.innerHTML=SteadyIcons.svg('check');
    }
    pendingInline=inlinePrompt;scrollPosition.followLatest=true;restoreScroll();
    if(typeof window.SteadyNative?.focusAsk==='function')window.SteadyNative.focusAsk(choice.placeholder,key==='reflect',key==='action');
    else input.focus();
  }
  function renderKeptReflection(){
    const copy=inlinePrompt?.querySelector('.chat-prompt-copy');if(!copy)return;
    copy.querySelector('.chat-kept-reflection')?.remove();
    const saved=[...(day.reflections||[]),day.reflection].filter(Boolean);
    if(saved.length){
      const kept=node('details','chat-kept-reflection');
      kept.append(node('summary','','Saved today'),node('p','',saved.join('\n\n')));copy.append(kept);
    }
  }
  function openActions(){
    closeActions();resetIntent();leaveWelcome();
    actionsView=window.SteadyChatActions.mount({container:chatScroll,close:writeFreely,add:()=>startIntent('action'),layout:()=>{}});
    pendingInline=actionsView.element;scrollPosition.followLatest=true;restoreScroll();
    actionsView.element?.querySelector('h2')?.focus({preventScroll:true});
  }
  function mainChoice(title,detail,action,symbol){
    const button=node('button','ask-starter');button.type='button';
    if(symbol){
      const icon=node('span','ask-starter-icon');
      icon.setAttribute('aria-hidden','true');icon.innerHTML=SteadyIcons.svg(symbol);
      button.append(icon);
    }
    button.append(node('span','ask-starter-title',title),node('span','ask-starter-detail',detail));
    button.addEventListener('click',()=>{X.haptic();action();});starters.append(button);
  }
  function showWelcome(stage='start'){
    stopSpeech();welcomeStage=stage;
    renderMainWelcome(true);
  }
  function guidedAnswer(text,helpStyle){
    submit(text,helpStyle?{helpStyle}:{});
  }
  function renderMainWelcome(focus=false){
    if(welcomeStage===null)return;
    welcome.hidden=false;
    chatScroll.classList.add('is-starting');
    if(welcomeStage==='start')welcome.classList.add('is-home');
    else welcome.classList.remove('is-home');
    const heading=welcome.querySelector('.ask-welcome-title');
    const method=welcome.querySelector('.chat-method');
    const kicker=welcome.querySelector('.ask-kicker');
    heading.setAttribute('tabindex','-1');
    guidedBack.hidden=welcomeStage==='start';
    guidedSkip.hidden=welcomeStage!=='support';
    welcome.querySelector('.ask-write-own').hidden=welcomeStage==='start';
    resumeConversation.hidden=entries().length===0;
    welcome.querySelector('.ask-explore').hidden=true;
    guidedStatus.textContent='';guidedStatus.hidden=welcomeStage==='start';
    welcome.querySelector('.ask-guided-footer').hidden=welcomeStage==='start'&&entries().length===0;
    starters.replaceChildren();starters.hidden=welcomeStage==='start';
    const setCopy=(title,detail,label)=>{heading.textContent=title;method.hidden=false;kicker.hidden=false;method.textContent=detail;kicker.textContent=label;};
    if(welcomeStage==='start'){
      heading.textContent='Take your time.';
      method.textContent='';method.hidden=true;
      kicker.textContent='';kicker.hidden=true;
    }else if(welcomeStage==='talk'){
      setCopy('What’s going on?','Choose the closest one, or write instead.','Talk it through');
      for(const [title,detail,text] of [
        ['Worry that won’t settle','Thoughts that keep coming back','My thoughts keep racing and I feel anxious'],
        ['Too much on my plate','Low on energy or room to breathe','I’m exhausted and have nothing left'],
        ['Feeling disconnected','Wanting a little company or understanding','I feel so alone']
      ])mainChoice(title,detail,()=>{chosenTopic={title,text};showWelcome('support');});
      mainChoice('Something else','Tell it in your own words',writeFreely);
    }else if(welcomeStage==='support'){
      setCopy('What would help?','Pick the kind of answer you want.',chosenTopic?.title||'Talk it through');
      for(const [title,detail,style] of [
        ['A little perspective','Help me see this more clearly','donkey'],
        ['One small step','Give me somewhere manageable to start','tortoise'],
        ['A Scripture perspective','Explore the passage and its context','owl']
      ])mainChoice(title,detail,()=>guidedAnswer(chosenTopic.text,style));
    }else if(welcomeStage==='step'){
      setCopy('Where are you stuck?','Choose what you need help with.','One next step');
      for(const [title,detail,text] of [
        ['Making a decision','I’m not sure which way to go','I have a big decision to make'],
        ['Getting started','I know I want to begin, but I’m putting it off','I’m stuck and putting it off'],
        ['Keeping going','I want a sustainable way forward','I want to keep going']
      ])mainChoice(title,detail,()=>guidedAnswer(text,'tortoise'));
      mainChoice('My actions','Return to the steps I’ve already saved',openActions);
    }else if(welcomeStage==='scripture'){
      setCopy('What are you curious about?','A specific passage or a question is enough.','Explore Scripture');
      mainChoice('A Bible passage','Type a reference, such as John 3:16',writeFreely);
      mainChoice('What grace means','Start with a question of faith',()=>guidedAnswer('What does grace mean?'));
      mainChoice('Finding words to pray','When I’m not sure what to say',()=>guidedAnswer('I don’t know how to pray','owl'));
      mainChoice('Questions about my faith','Make room for honest uncertainty',()=>guidedAnswer('I’m doubting my faith','owl'));
    }else if(welcomeStage==='reflect'){
      setCopy('What do you want to remember?','Choose a moment, then save it or add a note.','Today’s reflection');
      for(const [title,detail] of [
        ['I showed up','Even if today didn’t go to plan'],
        ['I noticed something good','An ordinary moment worth remembering'],
        ['I learned something','A thought I’d like to carry forward'],
        ['I need rest','An honest place to leave today']
      ])mainChoice(title,detail,()=>{reflectionChoice=title;showWelcome('keep-reflection');});
    }else if(welcomeStage==='keep-reflection'){
      setCopy(reflectionChoice,'Save this, or add a few words.','Today’s reflection');
      mainChoice('Keep this for today','Save this reflection on my device',()=>{
        checkDay();
        day.reflections=Array.from(new Set([...(day.reflections||[]),reflectionChoice]));
        const stored=save();
        if(typeof renderDay==='function')renderDay();
        showWelcome('reflection-saved');
        guidedStatus.textContent=stored?'Saved for today.':'Kept for this visit only. Device storage is unavailable.';
      });
      mainChoice('Add a few words','Add to today’s reflection',()=>startIntent('reflect'));
    }else if(welcomeStage==='reflection-saved'){
      setCopy('Done for now.','Read your reflection or add a note.',reflectionChoice);
      mainChoice('Back to the start','Choose something else',()=>showWelcome('start'));
      mainChoice('View my reflection','Read or add to what I’ve kept',()=>startIntent('reflect'));
    }
    scrollPosition.followLatest=false;scrollPosition.top=0;leadingSpace=null;
    chatScroll.scrollTop=0;expectedScrollTop=0;
    if(focus){
      heading.focus({preventScroll:true});
      welcomeTransition?.cancel();
      if(!reducedMotion()&&typeof welcome.animate==='function')welcomeTransition=welcome.animate([{opacity:0.35},{opacity:1}],{duration:160,easing:'ease-out'});
    }
  }
  guidedBack.addEventListener('click',()=>showWelcome(welcomeStage==='support'?'talk':welcomeStage==='keep-reflection'?'reflect':'start'));
  guidedSkip.addEventListener('click',()=>{if(chosenTopic)guidedAnswer(chosenTopic.text);});
  welcome.querySelector('.ask-write-own').addEventListener('click',writeFreely);
  resumeConversation.addEventListener('click',leaveWelcome);
  window.SteadyMain={
    openTool(key){
      if(!['start','talk','step','scripture','reflect','actions','write'].includes(key))return;
      if(location.hash!=='#'+route)navigateScreen(route,'push');
      if(key==='actions'){openActions();return;}
      if(key==='write'){writeFreely();return;}
      if(key==='start'){
        if(entries().length===0)showWelcome('start');
        else startIntent('talk');
      }else startIntent(key);
    },
    resume:leaveWelcome
  };
  const toolMenu=panel.querySelector('.ask-tools-menu');
  toolMenu.append(node('p','ask-tools-heading','Start with'));
  for(const [key,title] of [['talk','Talk it through'],['step','One next step'],['scripture','Explore Scripture'],['reflect','Keep a reflection'],['actions','My actions'],['write','Write freely']]){
    const button=node('button','',title);button.type='button';
    button.addEventListener('click',()=>{panel.querySelector('.ask-composer-tools').open=false;window.SteadyMain.openTool(key);});
    toolMenu.append(button);
  }
  function expressionFor(input={}){
    // Small state system: neutral, listening, thinking, confused, concerned,
    // encouraged, relieved, focused, happy, searching, matching, retrieving, found, uncertain.
    // Every state follows context. Stage-based states come from the analysis step.
    if(input.stage){
      const stage = String(input.stage).toLowerCase();
      if(['searching','matching','listening'].includes(stage)) return stage;
    }
    if(input.urgent)return 'concerned';
    const text=String(input.text||'').toLowerCase();
    const trimmed=text.trim();
    if(input.studyKind==='clarify')return 'confused';
    if(input.studyKind==='reference'||input.studyKind==='search'||input.studyKind==='note')return 'focused';
    if(/\d+:\d+/.test(text))return 'focused';
    if(/\b(john|psalm|matthew|mark|luke|romans|genesis|exodus|bible|jesus|christ|scripture|pray|prayer|faith|grace)\b/.test(text))return 'focused';
    if(input.key==='grief')return 'concerned';
    if(input.key==='rest'&&/(anxious|anxiety|panic|afraid|fear|overwhelm|exhaust|tired|weary|sleep|suffer|stress|worry)/.test(text))return 'concerned';
    if(input.key==='connection'&&/(lonely|alone|isolat|left out|reject|argument|conflict|fight)/.test(text))return 'concerned';
    if(input.key==='gratitude'||input.guide==='gratitude'||input.guide==='perseverance'||/(thank|grateful|progress|goal|celebrat|good news|doing well|hopeful|joy)/.test(text))return 'encouraged';
    if(/^(hi|hello|hey|good (morning|evening)|thanks|thank you|thx|gg|poggers|pog|amen|love this|wonderful)\b/.test(trimmed)&&trimmed.length<80)return 'happy';
    if(input.unmatched)return 'confused';
    if(input.relieved)return 'relieved';
    if(input.key==='wisdom'||/not sure|unsure|uncertain|confus|which (way|option)|should i|what should|decid|choice|guidance|wisdom/.test(text))return 'listening';
    if(input.key==='wisdom')return 'listening';
    if(input.key==='foundation')return 'encouraged';
    return 'concerned';
  }
  function setExpression(element,expression){
    if(!element||typeof element.setAttribute!=='function')return;
    element.setAttribute('data-expression',expression);
  }
  if(typeof window!=='undefined')window.SteadyBurden={expressionFor};

  /*
   * Which animal is present. One presence for the whole screen, not a portrait
   * per reply: the tile, its size and its position never change, and a single
   * current animal cannot flicker as the transcript is scrolled.
   *
   * Resolved defensively, because this module has to keep working when the
   * animals file is absent -- a missing hint must never take the conversation
   * down with it.
   */
  function animals(){return (typeof SteadyAnimals!=='undefined'&&SteadyAnimals)?SteadyAnimals:null;}
  // Whether a handover has played on this screen yet. Presentational only: it is
  // about movement, not about which animal is here.
  let haveAnimal=false;

  /*
   * SteadyAnimals owns which animal is active. This file keeps no second copy.
   *
   * It used to, and that copy was seeded with the default animal rather than
   * with whatever a restored choice said, so a person who had chosen an animal
   * and then reopened the app was shown the donkey everywhere until something
   * happened to overwrite the copy. Every read here goes to the module instead.
   */
  function activeAnimal(){const A=animals();return A?A.current():null;}
  function activeName(){const A=animals();return A?.characters[activeAnimal()]?.name||'Burden';}

  // Every tile is told the same thing, so the portrait is always consistent
  // wherever it appears. The expression library is untouched and still drives
  // the body language; this only decides who is in the tile.
  function dressAnimal(tile,state){
    const A=animals();if(!A||!tile)return;
    A.render(tile,{animal:activeAnimal(),state:state||A.State.IDLE});
  }

  /*
   * Redraw every portrait on screen from the one authoritative animal.
   *
   * Each reply gets its own tile when it is written and is kept afterwards, so
   * a choice made later would otherwise leave the rows that already exist
   * showing whoever was helping at the time they were written. Only the
   * portrait inside each tile changes: the beat a tile is already on is left
   * exactly as it is, so a thought stays a thought and a concern stays a
   * concern. A selection therefore takes effect everywhere at once.
   */
  function dressEveryAnimal(){
    const A=animals();if(!A||!panel||typeof panel.querySelectorAll!=='function')return;
    const character=A.characters[activeAnimal()]||A.characters[A.BURDEN];
    const name=welcome?.querySelector('.donkey-signature strong');
    const label=welcome?.querySelector('.donkey-signature span');
    const summary=welcome?.querySelector('.animal-summary');
    if(name)name.textContent=character.name;
    if(label)label.textContent=character.label;
    if(summary)summary.textContent=character.summary;
    const styleButton=document.getElementById('setting-help-style');
    if(styleButton)styleButton.value=A.isManual()?activeAnimal():'auto';
    for(const tile of panel.querySelectorAll('.donkey-guide')){
      const state=tile.getAttribute&&tile.getAttribute('data-animal-state');
      A.render(tile,{animal:activeAnimal(),state:state||A.State.IDLE});
    }
  }

  // The module announces every change to the active animal, and answers at once
  // on subscribing. That first answer is what corrects the portraits on a cold
  // start: the welcome tile ships carrying the default animal in its markup, and
  // the transcript is skipped when there are saved entries, so without this the
  // restored choice would not reach the screen until the next request.
  if(animals()&&typeof animals().subscribe==='function')animals().subscribe(dressEveryAnimal);

  // Called once the request is understood, before the answer is shown.
  function considerAnimal(text,understanding,model){
    const A=animals();if(!A)return;
    const before=activeAnimal();
    const nextStepRequest=/^(?:what(?:'s| is) (?:the |my )?(?:best |right )?next step|what should i do next)\??$/i.test(text.trim().replace(/[’]/g,"'"));
    const verifiedGuide=typeof model?.guide==='string'&&Object.hasOwn(H.guides,model.guide);
    const local=A.classify?.(text,understanding);
    const verdict=nextStepRequest&&typeof A.chooseInterpretation==='function'
      ?A.chooseInterpretation('tortoise','clear')
      :local?.confidence==='clear'?A.choose({text,current:before,understanding})
      :verifiedGuide&&model.available===true&&model.confidence==='clear'&&typeof A.chooseInterpretation==='function'
      ?A.chooseInterpretation(model.animal,model.confidence)
      :A.choose({text,current:before,understanding});
    if(!verdict.changed)return;
    // Ask the module again rather than trusting the verdict: the module is the
    // authority, and reading it back is what keeps the two from drifting.
    const next=activeAnimal();
    if(!next||next===before)return;
    const welcomeTile=welcome?welcome.querySelector('.donkey-guide'):null;
    if(welcomeTile&&haveAnimal)A.handover(welcomeTile,next);
    else dressAnimal(welcomeTile,A.State.IDLE);
    haveAnimal=true;
  }

  /*
   * The wheel. Tapping the portrait is the whole affordance -- there is no
   * button, no label and no second control, because the control is supposed to be
   * something a person discovers rather than something they are shown.
   *
   * The registry crosses to the native side by value, so the carousel is a
   * renderer of the same list the router uses and cannot describe an animal
   * differently from the one that would actually be chosen.
   */
  function openWheel(){
    const A=animals();if(!A)return;
    const native=typeof window!=='undefined'?window.SteadyNative:null;
    if(!native||typeof native.showAnimalWheel!=='function')return;
    try{native.showAnimalWheel(A.describe());}catch(e){/* no wheel here; the screen still works */}
  }
  document.getElementById('setting-help-style')?.addEventListener('change',event=>{
    const A=animals();if(!A)return;
    if(event.target.value==='auto')A.setAuto();
    else if(askHelp?.choices.includes(event.target.value))A.setManual(event.target.value);
  });

  /*
   * The single entry point the native wheel calls when a person chooses.
   * 'auto' hands control back to Steady; anything else is a deliberate choice
   * that holds until they change it.
   */
  if(typeof window!=='undefined')window.SteadyAnimalChosen=function(choice){
    const A=animals();if(!A)return null;
    const result=(choice==='auto')?A.setAuto():A.setManual(choice);
    if(!result||result.ok===false)return result;
    // The animal to show is read back from the module rather than taken from the
    // call's return value, so the portrait is drawn from the one thing that
    // decides it. Handing control back to Steady restarts the automatic reading
    // from the default animal, and this picks that up either way.
    const next=activeAnimal();
    const tile=welcome?welcome.querySelector('.donkey-guide'):null;
    if(tile&&next)A.handover(tile,next);
    return result;
  };

  // Applied once, to the one portrait a person can reach: the welcome tile.
  function makeTappable(tile){
    if(!tile||typeof tile.setAttribute!=='function')return;
    // Guarded rather than assumed: a tile that cannot be marked is simply not
    // tappable, and that must not disturb the screen it sits on.
    if(typeof tile.getAttribute==='function'&&tile.getAttribute('data-tappable')==='true')return;
    tile.setAttribute('data-tappable','true');
    if(tile.style)tile.style.cursor='pointer';
    if(typeof tile.addEventListener==='function'){
      tile.addEventListener('click',()=>openWheel(tile));
      // The visible Change button is the keyboard and VoiceOver control;
      // the portrait remains a touch shortcut without a duplicate focus stop.
    }
    wheelOpenControl(tile);
  }

  /*
   * The portrait remains tappable. A small switch badge on its corner makes
   * the action discoverable while the animal's name stays centered below.
   */
  function wheelOpenControl(tile){
    if(typeof document==='undefined'||!document.createElement)return;
    const host=tile.parentElement;
    if(!host)return;
    // renderSuggestions runs more than once; the control must not multiply.
    if(host.querySelector('.wheel-open'))return;
    const open=node('button','wheel-open');
    open.type='button';
    open.setAttribute('aria-label','Change animal');
    open.title='Change animal';
    open.innerHTML=SteadyIcons.svg('swap');
    open.addEventListener('click',()=>openWheel(tile));
    host.append(open);
  }

  // Only the transcript scrolls. Remember the reader's position independently
  // of keyboard/composer height changes, which can clamp the browser's scrollTop.
  function restoreScroll(){
    if(!active||scrollScheduled)return;
    scrollScheduled=true;
    (window.requestAnimationFrame||((callback)=>callback()))(()=>{
      scrollScheduled=false;
      if(!active)return;
      // Collapsing the welcome block changes the height above every reply.
      // Preserve the reader's place in an older conversation across both
      // keyboard directions instead of snapping to a different sentence.
      const welcomeBounds=welcome.getBoundingClientRect?.();
      const styles=typeof getComputedStyle==='function';
      const welcomeMargin=styles?parseFloat(getComputedStyle(welcome).marginBottom)||0:0;
      const topPadding=styles?parseFloat(getComputedStyle(chatScroll).paddingTop)||0:0;
      const nextLeadingSpace=welcomeBounds ? (welcomeBounds.height ? welcomeBounds.height+welcomeMargin : 0)+topPadding : null;
      if(nextLeadingSpace!==null){
        if(leadingSpace!==null&&!scrollPosition.followLatest)scrollPosition.top+=nextLeadingSpace-leadingSpace;
        leadingSpace=nextLeadingSpace;
      }
      const maximum=Math.max(0,chatScroll.scrollHeight-chatScroll.clientHeight);
      // On a short screen, start at a long new reply's first sentence instead
      // of skipping straight past its guidance (especially urgent support).
      const pending=pendingInline||(pendingReplyId&&transcriptRows.get(pendingReplyId)?.node.querySelector('.chat-reply-row'));
      const replyBounds=pending?.getBoundingClientRect?.(),scrollBounds=chatScroll.getBoundingClientRect?.();
      if(replyBounds&&scrollBounds){
        const nativeComposer=document.documentElement.dataset.nativeComposer==='true';
        const inputBounds=nativeComposer?null:inputArea.getBoundingClientRect?.();
        const nativeOcclusion=nativeComposer&&styles?Math.max(0,parseFloat(getComputedStyle(chatScroll).scrollPaddingBottom)||0):0;
        const readableTop=scrollBounds.top+12;
        const readableBottom=Math.min(scrollBounds.bottom-nativeOcclusion,inputBounds?.top??scrollBounds.bottom)-12;
        if(replyBounds.height>readableBottom-readableTop){
          scrollPosition.top=Math.max(0,Math.min(maximum,chatScroll.scrollTop+replyBounds.top-readableTop));
          scrollPosition.followLatest=false;
        }
      }
      pendingReplyId=null;pendingInline=null;
      chatScroll.scrollTop=scrollPosition.followLatest?maximum:Math.min(scrollPosition.top,maximum);
      expectedScrollTop=chatScroll.scrollTop;
      scrollPosition.height=chatScroll.clientHeight;
    });
  }
  chatScroll.addEventListener('scroll',()=>{
    if(!active)return;
    if(expectedScrollTop!==null&&Math.abs(chatScroll.scrollTop-expectedScrollTop)<1){expectedScrollTop=null;return;}
    expectedScrollTop=null;
    if(chatScroll.clientHeight!==scrollPosition.height){restoreScroll();return;}
    scrollPosition.top=chatScroll.scrollTop;
    scrollPosition.followLatest=chatScroll.scrollHeight-chatScroll.clientHeight-chatScroll.scrollTop<=40;
  },{passive:true});
  // Keep a simple dismissal gesture when the native form toolbar is hidden.
  chatScroll.addEventListener('click',event=>{
    if(event.target?.closest?.('button,a,input,summary,label'))return;
    if(document.activeElement===input)input.blur();
  });
  // The controls float above a full-height transcript. Only scroll padding
  // reserves their space, so messages can pass behind both sets of controls.
  function sizeFloatingControls(){
    if(!active)return;
    const nextInputHeight=Math.ceil(inputArea.getBoundingClientRect?.().height||0);
    if(nextInputHeight>0&&nextInputHeight!==inputAreaHeight){
      inputAreaHeight=nextInputHeight;
      panel.style.setProperty('--chat-input-height',inputAreaHeight+'px');
    }
    restoreScroll();
  }
  if(window.ResizeObserver){
    new window.ResizeObserver(restoreScroll).observe(chatScroll);
    const controlsObserver=new window.ResizeObserver(sizeFloatingControls);
    controlsObserver.observe(inputArea);
  }
  // Keyboard overlap changes scroll padding without resizing the transcript.
  // Re-anchor after the viewport's queued layout update in that case too.
  window.addEventListener?.('resize',restoreScroll);
  window.visualViewport?.addEventListener('resize',restoreScroll);
  window.visualViewport?.addEventListener('scroll',restoreScroll);

  function updateSuggestions(){
    renderSuggestions();
  }
  let branchMode=null;
  const pendingPractice=new Map();
  function chipButton(label,fn){const button=node('button','',label);button.type='button';button.addEventListener('click',fn);return button;}
  function welcomeDonkey(){return welcome.querySelector('.donkey-guide');}
  // The pack lightens as understanding grows: full → carrying → lighter.
  // Subtle only: shadow and tone shift, same calm tile, same pixel donkey.
  function setLoad(stage){
    const donkey=welcomeDonkey();
    if(!donkey||typeof donkey.setAttribute!=='function')return;
    if(!stage){
      // The test mini-DOM has no removeAttribute; guard keeps production intact.
      if(typeof donkey.removeAttribute==='function')donkey.removeAttribute('data-load');
      else if(donkey.attrs)delete donkey.attrs['data-load'];
    }
    else donkey.setAttribute('data-load',stage);
  }
  // Tap-first progressive flow: one simple question at a time, 2–4 taps to a
  // curated answer. Taps submit ordinary words through the normal matcher, so
  // taps and typing always agree. One spare acknowledgment line, never chatter.
  // Memory lives in branchMode until the answer is submitted, so later
  // questions never repeat what was already tapped.
  function renderSuggestions(){
    if(!suggestions)return;
    // The way into the wheel lives on the portrait, which is visible whether
    // or not there are saved entries. It was attached only in the categories
    // branch below, so anyone with a single saved entry -- the normal state of
    // someone actually using the app -- could never reach the wheel at all.
    makeTappable(welcomeDonkey());
    if(entries().length>0){suggestions.hidden=true;branchMode=null;setLoad(null);return;}
    suggestions.hidden=false;
    suggestions.replaceChildren();
    const table=(typeof SteadyBurdenBranches!=='undefined')?SteadyBurdenBranches:null;
    if(!table){
      for(const text of ['What is grace?','I feel anxious','John 3:16'])suggestions.append(chipButton(text,()=>submit(text)));
      return;
    }
    const stage=table.stageFor(branchMode);
    if(suggestions.dataset)suggestions.dataset.stage=stage;
    if(stage==='categories'){
      setLoad(null);
      setExpression(welcomeDonkey(),'neutral');
      dressAnimal(welcomeDonkey());
      makeTappable(welcomeDonkey());
      suggestions.append(node('span','branch-ack',table.prompts.start));
      for(const category of table.categories)suggestions.append(chipButton(category.label,()=>{branchMode={category:category.id};X.haptic();setExpression(welcomeDonkey(),'listening');renderSuggestions();restoreScroll();}));
      suggestions.append(chipButton('Something else',()=>{input.focus();status.textContent='Write a few plain words to find a fitting passage.';}));
      return;
    }
    const found=table.category(branchMode.category);
    if(!found){branchMode=null;renderSuggestions();return;}
    if(stage==='situations'){
      setLoad('carrying');
      setExpression(welcomeDonkey(),'listening');
      suggestions.append(node('span','branch-ack',`${found.label}. ${table.prompts.situation}`));
      for(const step of found.followups)suggestions.append(chipButton(step.label,()=>{
        branchMode={category:found.id,followup:step.id};
        X.haptic();setExpression(welcomeDonkey(),'listening');renderSuggestions();restoreScroll();
      }));
      suggestions.append(chipButton('None of these',()=>{branchMode=null;X.haptic();renderSuggestions();}));
      return;
    }
    // stances: the second question, remembered alongside the first answer.
    setLoad('lighter');
    setExpression(welcomeDonkey(),'listening');
    suggestions.append(node('span','branch-ack',table.prompts.stance));
    for(const stance of table.stances)suggestions.append(chipButton(stance.label,()=>{
      const resolved=table.resolveWithStance(found.id,branchMode.followup,stance.id);
      branchMode=null;
      if(!resolved){renderSuggestions();return;}
      setExpression(welcomeDonkey(),'thinking');
      submit(resolved.text,{practice:true,step:resolved.step,stanceExpression:stance.expression});
    }));
    suggestions.append(chipButton('Skip',()=>{
      const resolved=table.resolve(found.id,branchMode.followup);
      branchMode=null;
      if(!resolved){renderSuggestions();return;}
      submit(resolved.text,{practice:true});
    }));
    suggestions.append(chipButton('← Back',()=>{branchMode={category:found.id};X.haptic();renderSuggestions();}));
  }

  // A brief thinking indicator makes replies feel conversational rather than
  // instant. Ephemeral only: never saved, announced once, removed on render.
  // An honest line names what Burden is actually doing (searching, matching,
  // retrieving). Without high-confidence analysis it stays a plain shimmer.
  function clearTyping(){
    if(typingTimer!==null&&(typeof clearTimeout==='function'))clearTimeout(typingTimer);
    typingTimer=null;
    if(typingRow){typingRow.remove();typingRow=null;}
  }
  function showTyping(message, detail, userText){
    clearTyping();
    const row=node('article','chat-exchange is-typing');
    if(userText)row.append(node('div','chat-bubble user-bubble',userText));
    row.setAttribute('aria-label','Steady is preparing a reply');
    const replyRow=node('div','chat-reply-row'), donkey=node('div','donkey-guide small');
    donkey.setAttribute('aria-hidden','true');
    const expr = detail?.stage || 'thinking';
    donkey.setAttribute('data-expression',expr);
    const image=node('img');image.src='./art/animals/burden-painted.png';image.alt='';image.width=29;image.height=29;image.decoding='async';
    donkey.append(image);
    dressAnimal(donkey);
    const bubble=node('div','chat-bubble assistant-bubble thinking-bubble');
    const label = message || (detail ? `Steady is ${detail.stage}…` : 'Steady is thinking');
    bubble.setAttribute('aria-label',label);
    if(message)bubble.append(node('span','thinking-text',message));
    else if(detail){
      const detailText = node('span','thinking-text',`Steady is ${detail.stage}…`);
      bubble.append(detailText);
    }
    const drops=node('span','thinking-drops');
    for(let drop=0;drop<3;drop++)drops.append(node('span','thinking-drop'));
    bubble.append(drops);
    donkey.classList.add('is-thinking');
    replyRow.append(presence(detail?.stage==='listening'?'listening':'thinking'),bubble);row.append(replyRow);
    chatScroll.append(row);typingRow=row;
    restoreScroll();
  }
  // Spoken answers: a Listen button reads the reply aloud with word-by-word
  // highlights. Speech runs through the native bridge (precise word ranges)
  // with a silent on-device fallback where supported. Ephemeral like typing.
  const speechState={key:null,parts:[],spans:[],current:null,buttons:new Map()};
  function speechSupported(){
    return typeof window.SteadyNative?.speak==='function'||typeof window.speechSynthesis!=='undefined';
  }
  const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function markWords(el){
    const words=el.textContent.split(/\s+/).filter(Boolean);
    el.innerHTML=words.map(word=>`<span class="speech-word">${escapeHtml(word)}</span>`).join(' ');
    return words;
  }
  function resetListenButton(button){
    button.textContent='Listen';
    button.setAttribute('aria-label','Listen to this answer');
  }
  function stopSpeech(){
    const had=speechState.key!==null;
    if(speechState.current){speechState.current.classList.remove('spoken');speechState.current=null;}
    for(const part of speechState.parts)part.el.classList.remove('speech-active');
    speechState.key=null;speechState.parts=[];speechState.spans=[];
    for(const button of speechState.buttons.values()){
      if(button.isConnected!==false)resetListenButton(button);
    }
    speechState.buttons.clear();
    if(!had)return;
    if(typeof window.SteadyNative?.stopSpeaking==='function'){
      const result=window.SteadyNative.stopSpeaking();
      if(result&&typeof result.catch==='function')result.catch(()=>{});
    }else if(typeof window.speechSynthesis!=='undefined')window.speechSynthesis.cancel();
  }
  window.SteadySpeechRange=(key,location)=>{
    if(key==null||location<0||key!==speechState.key){stopSpeech();return;}
    for(const part of speechState.parts){
      if(part.el.isConnected===false){stopSpeech();return;}
      if(location<part.start||location>=part.start+part.length)continue;
      let index=0;
      for(let i=0;i<part.offsets.length;i++){if(part.offsets[i]<=location)index=i;else break;}
      const span=part.spans[index];
      if(!span||speechState.current===span)return;
      if(speechState.current)speechState.current.classList.remove('spoken');
      span.classList.add('spoken');speechState.current=span;
      return;
    }
  };
  function speakReply(id,button,collect){
    if(speechState.key===id){stopSpeech();return;}
    stopSpeech();
    let text='';
    const parts=[];
    for(const el of collect()){
      if(!el||!el.textContent.trim())continue;
      const words=markWords(el);
      const joined=words.join(' ');
      const offsets=[];
      let cursor=text?text.length+1:text.length;
      for(const word of words){offsets.push(cursor);cursor+=word.length+1;}
      parts.push({el,words,start:text.length?text.length+1:0,offsets,length:joined.length,spans:[...el.querySelectorAll('.speech-word')]});
      text=text?text+' '+joined:joined;
    }
    if(!text||text.length>2000)return;
    speechState.key=id;speechState.parts=parts;
    for(const part of parts)part.el.classList.add('speech-active');
    speechState.spans=parts.flatMap(part=>part.spans);
    speechState.buttons.set(id,button);
    button.textContent='Stop';
    button.setAttribute('aria-label','Stop speaking');
    if(typeof window.SteadyNative?.speak==='function'){
      const result=window.SteadyNative.speak(text,id);
      if(result&&typeof result.catch==='function')result.catch(()=>stopSpeech());
    }else if(typeof window.speechSynthesis!=='undefined'){
      try{
        window.speechSynthesis.cancel();
        const utterance=new SpeechSynthesisUtterance(text);
        utterance.onend=()=>{if(speechState.key===id)stopSpeech();};
        utterance.onerror=()=>{if(speechState.key===id)stopSpeech();};
        window.speechSynthesis.speak(utterance);
      }catch{stopSpeech();}
    }else stopSpeech();
  }
  function listenButton(id,collect){
    const button=node('button','text-link moment-action-listen','Listen');
    button.type='button';
    button.setAttribute('aria-label','Listen to this answer');
    button.addEventListener('click',()=>speakReply(id,button,collect));
    return button;
  }
  function exchange(item,translation){
    // Older saved answers cross the same boundary as a newly generated one.
    // Retain the entry, but never display or speak unverified Scripture prose.
    if(item.answer&&!window.SteadyAskRouting.validGeneralAnswer(item.answer.text)){
      item={...item,answer:undefined,answerUnavailable:true,unmatched:true};
    }
    // A saved continuation must retain its original passage even if its older
    // context was removed or the theme matcher has since changed.
    const response=M.response(item.text,{key:item.key});
    const guide=!response.urgent&&item.guide?H.guides[item.guide]:null;
    const selection=guide?H.passage(item.guide,translation,ScriptureChapters):null;
    const passageKey=response.urgent?'grief':item.key;
    const original=ScriptureLibrary[passageKey];
    const passage=selection||{reference:original.reference,text:original.translations[translation].text};
    const unmatched=item.unmatched&&!response.urgent;
    const row=node('article','chat-exchange'+(response.urgent?' urgent':''));
    row.setAttribute('data-request-id',item.id);
    const user=node('div','chat-bubble user-bubble',item.text);
    const replyRow=node('div','chat-reply-row'), donkey=node('div','donkey-guide small');
    donkey.setAttribute('aria-hidden','true');
    setExpression(donkey,expressionFor({text:item.text,key:item.key,guide:item.guide,urgent:response.urgent,studyKind:item.study?.kind,unmatched}));
    const image=node('img');image.src='./art/animals/burden-painted.png';image.alt='';image.width=29;image.height=29;image.decoding='async';
    donkey.append(image);
    dressAnimal(donkey);
    const reply=node('div','chat-bubble assistant-bubble moment-preview');
    const byline=node('p','ask-reply-byline');
    const replyPresence=presence();
    byline.append(replyPresence,node('span','','Steady'));reply.append(byline);
    if(item.study&&!response.urgent&&window.SteadyStudyUI){
      window.SteadyStudyUI.mount(reply,item,translation,{
        read:(reference,source)=>openChapter(reply,source,{studyReference:reference},translation),
        forget:()=>forget(item.id),layout:()=>{
          // A lazy-loaded answer can be much taller than its loading message.
          // Reveal its beginning, unless the reader has scrolled elsewhere.
          if(scrollPosition.followLatest&&entries()[0]?.id===item.id)pendingReplyId=item.id;
          restoreScroll();
        }
      });
      replyRow.append(donkey,reply);row.append(user,replyRow);
      if(speechSupported())reply.querySelector('.moment-actions')?.append(listenButton(item.id,()=>[reply.querySelector('.study-title'),reply.querySelector('.moment-context'),reply.querySelector('.moment-response'),...reply.querySelectorAll('.study-quote p'),...reply.querySelectorAll('.study-result-text'),reply.querySelector('.verse-reference')]));
      return row;
    }
    if(response.urgent){
      reply.append(node('p','moment-response',response.acknowledgement));
      const support=link('Find a local helpline ↗','https://findahelpline.com/','text-link moment-support');
      support.target='_blank';support.rel='noopener noreferrer';reply.append(support);
      reply.append(node('p','verse-reference moment-reference',`${passage.reference} · ${translation.toUpperCase()}`));
    }else if(item.answer){
      reply.append(node('p','moment-response general-answer',item.answer.text));
      reply.append(node('p','moment-editorial local-ai-label','Answered on this device'));
    }else if(item.reflection){
      reply.append(node('p','moment-response',reflectionSaveResults.get(item.id)===false
        ?'Kept for this visit only. Device storage is unavailable, so copy this reflection somewhere safe if you want to keep it.'
        :'Saved with your reflections. You can leave it here, or add anything else you want to remember.'));
    }else if(unmatched){
      // Bare greetings get warmth, not the cold miss text. Still no verse,
      // no next step, no theme change: Burden greets, then listens.
      const salutation=(typeof M.greeting==='function')?M.greeting(item.text):null;
      const steady=!salutation&&(typeof M.checkin==='function')?M.checkin(item.text):false;
      const requested=askHelp?.requestedStyle(item.text);
      reply.append(node('p','moment-response',salutation
        ?`${salutation} I’m glad you’re here. What would you like to work through?`
        :steady
        ?'Ready when you are. What’s on your mind?'
        :requested
        ?'Tell me what you need help with, and I’ll shape the answer around that.'
        :askHelp?.conversationReply(item.text)||(item.answerUnavailable
          ?'I couldn’t generate an answer on this device just now. Try again, or ask me about a Bible passage from the library.'
          :'I don’t have a reliable answer to that. I can help you think through a choice or read a Bible passage; for specialist facts, use a qualified source.')));
    }else{
      // Matched answers stay short: just the reference. The verse text lives
      // one tap away under Read chapter. The selected helper shapes a concise
      // response from the verified guide without authoring a new quotation.
      reply.className += ' moment-short';
      const helpStyle=item.helpStyle ? (askHelp?.valid(item.helpStyle)||'donkey') : null;
      const source=helpStyle ? (askHelp?.source(helpStyle,guide,{excludePractice:pendingPractice.has(item.id)})||'') : '';
      if(source){
        reply.append(node('p','moment-help-label sr-only',askHelp.styles[helpStyle]));
        reply.append(node('p','moment-context',source));
      }
      reply.append(node('p','verse-reference moment-reference',`${passage.reference} · ${translation.toUpperCase()}`));
      if(pendingPractice.has(item.id)){
        const stanceStep=pendingPractice.get(item.id);
        pendingPractice.delete(item.id);
        // One fitting next step: the stance choice when tapped, else the
        // curated guide practice. Never both, never a list.
        reply.append(node('p','moment-practice',stanceStep||(guide?guide.practice:'')));
      }
    }
    const actions=node('div','moment-actions');
    const read=node('button','text-link moment-action-read','Read chapter');read.type='button';
    read.setAttribute('aria-label',`Read ${passage.reference} in context`);
    read.addEventListener('click',()=>openChapter(reply,read,{key:passageKey,...(guide?{guide:item.guide}:{})},translation));
    const remove=node('button','text-link moment-action-forget','Forget');remove.type='button';
    const date=new Date(item.at).toLocaleDateString(undefined,{day:'numeric',month:'short'});
    remove.setAttribute('aria-label',`Forget entry from ${date}${unmatched?'':' · '+passage.reference}`);
    remove.addEventListener('click',()=>forget(item.id));
    if(!unmatched&&!item.reflection&&!item.answer)actions.append(read);
    if(speechSupported()){
      const speakParts=()=>response.urgent
        ?[reply.querySelector('.moment-response'),reply.querySelector('.moment-reference')]
        :unmatched||item.reflection||item.answer?[reply.querySelector('.moment-response')]:[reply.querySelector('.moment-context'),reply.querySelector('.moment-reference')];
      actions.append(listenButton(item.id,speakParts));
    }
    actions.append(remove);reply.append(actions);
    if(item.answerUnavailable&&!response.urgent){
      const retry=node('button','text-link','Try again');retry.type='button';retry.addEventListener('click',()=>submit(item.text));actions.append(retry);
    }
    if(!response.urgent && !item.reflection && !item.answer && entries()[0]?.id===item.id){
      const adjust=node('button','text-link moment-action-adjust','Adjust help');
      adjust.type='button';adjust.setAttribute('aria-expanded','false');
      const options=node('div','moment-adjust-options');options.hidden=true;
      const addOption=(label,change)=>{
        const button=node('button','moment-adjust-choice',label);button.type='button';
        button.addEventListener('click',()=>{
          state.scriptureRequests=M.normalizeEntries(state.scriptureRequests.map(entry=>entry.id===item.id?{...entry,...change}:entry));
          save();transcriptSignature='';renderTranscript();
        });options.append(button);
      };
      for(const style of askHelp?.choices||[])addOption(askHelp.styles[style],{helpStyle:style});
      if(!item.study){
        for(const [theme,guideId] of Object.entries(askHelp?.themes||{})){
          addOption(`Topic: ${theme}`,{key:theme,guide:guideId,unmatched:false});
        }
      }
      adjust.addEventListener('click',()=>{options.hidden=!options.hidden;adjust.setAttribute('aria-expanded',String(!options.hidden));});
      actions.append(adjust);reply.append(options);
    }
    replyRow.append(donkey,reply);row.append(user,replyRow);
    reply.addEventListener('animationend',()=>row.classList.remove('is-new'));
    return row;
  }
  function openChapter(reply,source,reading,translation){
    // Opening text below the current reply must not pull its last verse to the
    // bottom of the viewport. Keep the reader where they tapped.
    scrollPosition.top=chatScroll.scrollTop;scrollPosition.followLatest=false;
    window.SteadyChatChapter.toggle({reply,source,reading,translation,layout:restoreScroll});
  }
  function renderTranscript(animateId){
    clearTyping();
    const history=entries().reverse();
    if(history.length)chatScroll.classList.add('has-conversation');
    else chatScroll.classList.remove('has-conversation');
    const translation=document.documentElement.dataset.translation==='asv'?'asv':'web';
    const wording=window.SteadyBurdenWording?.enabled()??false;
    const signature=JSON.stringify([translation,wording,history]);
    if(signature===transcriptSignature)return;
    stopSpeech();
    const nextRows=new Map(), rows=[];
    for(const item of history){
      const identity=JSON.stringify([translation,wording,item]);
      const cached=transcriptRows.get(item.id);
      const row=cached?.identity===identity?cached.node:exchange(item,translation);
      if(item.id===animateId&&!reducedMotion())row.classList.add('is-new');
      nextRows.set(item.id,{identity,node:row});rows.push(row);
    }
    // Keep existing messages attached: replacing the whole log would announce
    // every past reply again and discard the browser's current scroll anchor.
    for(const [id,cached] of transcriptRows){
      if(nextRows.get(id)?.node!==cached.node)cached.node.remove();
    }
    let cursor=welcome.nextElementSibling;
    for(const row of rows){
      if(row===cursor)cursor=cursor.nextElementSibling;
      else chatScroll.insertBefore(row,cursor);
    }
    transcriptRows=nextRows;transcriptSignature=signature;
    if(animateId)pendingReplyId=animateId;
    updateSuggestions();
    restoreScroll();
  }

  function sizeComposer(){
    if(!input.style)return;
    input.style.height='44px';
    input.style.height=Math.min(input.scrollHeight||44,130)+'px';
    sizeFloatingControls();
  }

  function submit(text,opts={}){
    text=typeof text==='string'?text.trim().slice(0,1200):'';
    if(!text){status.textContent='Write a few words to begin.';input.focus();return false;}
    if(understandingPending){status.textContent='Finishing the previous question first.';return false;}
    if(draftIntent==='action'){
      checkDay();
      day.tasks.push({id:taskId(),text,complete:false});
      input.value='';day.feelingsDraft='';
      const stored=save();
      if(typeof renderTasks==='function')renderTasks();
      if(typeof updateProgress==='function')updateProgress();
      syncSendButton();sizeComposer();openActions();X.haptic();
      status.textContent='';
      const notice=actionsView.element.querySelector('.chat-actions-status');
      notice.hidden=false;notice.textContent=stored?'Action saved.':'Kept for this visit only. Device storage is unavailable.';
      return true;
    }
    closeActions();
    let perspective={talk:'untangle',step:'step',scripture:'explore',reflect:'reflect'}[draftIntent]||'balanced';
    if(draftIntent==='scripture')opts={...opts,explicitScripture:true};
    if(draftIntent==='step')opts={...opts,helpStyle:'tortoise'};
    else if(draftIntent==='scripture')opts={...opts,helpStyle:'owl'};
    else if(draftIntent==='reflect')opts={...opts,saveReflection:true};
    resetIntent();
    leaveWelcome();
    const previous=entries(),initial=M.match(text,previous);
    const requested=askHelp?.requestedStyle(text);
    const urgent=M.response(text,initial).urgent;
    const route=scriptureRoute(text,previous,initial,opts.explicitScripture);
    const recent=requested?recentConversation(previous):null;
    const generalContinuation=Boolean(recent&&(recent.answer||recent.answerUnavailable)&&!recent.study);
    if(requested)perspective={donkey:'balanced',fox:'untangle',tortoise:'step',owl:'explore'}[requested];
    const simple=urgent||M.greeting?.(text)||M.checkin?.(text)||(requested&&!generalContinuation)||opts.saveReflection||askHelp?.conversationReply(text);
    if(!simple&&!route.scripture&&state.profile?.burdenAI!==false&&typeof window.SteadyNative?.answerAsk==='function'){
      const requestId='answer:'+Date.now().toString(36);
      const work=()=>{
        if(state.profile?.burdenAI===false)return {available:false};
        const memoryQuery=generalContinuation?`${recent.text}\n${text}`:text;
        const memories=state.profile?.burdenMemoryEnabled===false?[]:window.SteadyBurdenMemoryStore?.context(memoryQuery)||[];
        return window.SteadyNative.answerAsk({requestId,text,history:modelHistory(previous),perspective,memories});
      };
      beginTurn(text,{...opts,generalRequest:true},'Thinking…',()=>window.SteadyBurdenMemoryStore?.runWording?window.SteadyBurdenMemoryStore.runWording(work):work(),260);
      return true;
    }
    if(route.scripture&&!urgent&&window.SteadyNative?.platform==='ios'){
      beginTurn(text,opts,'Checking the library…',()=>({available:false}),260);
      return true;
    }
    const special=simple||route.scripture||askHelp?.followUp(text,previous);
    if(!special&&localUnderstandingAvailable&&typeof window.SteadyNative?.interpretAsk==='function'){
      understandingPending=true;showTyping('Steady is listening…',{stage:'listening'});
      const requestId='ask:'+Date.now().toString(36);
      const history=previous.slice(0,2).map(item=>item.text.slice(0,240));
      let native;
      try{native=window.SteadyNative.interpretAsk({requestId,text,history});}
      catch(_){native=Promise.resolve({available:false});}
      let deadline;
      Promise.race([native,new Promise(resolve=>{deadline=setTimeout(()=>resolve({available:false}),4000);})])
        .then(model=>{clearTimeout(deadline);understandingPending=false;commitSubmit(text,opts,model);},
          ()=>{clearTimeout(deadline);understandingPending=false;commitSubmit(text,opts,null);});
      return true;
    }
    commitSubmit(text,opts,null);
    return true;
  }
  function commitSubmit(text,opts={},model=null){
    checkDay();
    const previous=entries();
    const requested=askHelp?.requestedStyle(text);
    const prior=requested?askHelp.recentGuide(previous):null;
    const followUp=!opts.saveReflection?askHelp?.followUp(text,previous):null;
    let result=prior?{key:prior.key,guide:prior.guide,matched:true,reason:'A different kind of help for your last question.'}
      :followUp?{...followUp,matched:true,reason:'Continuing your most recent question.'}
      :askHelp?.interpretation(text,previous,M,model,H.guides)||M.match(text,previous);
    // The animal is chosen from what the person actually asked, not from which
    // passage was matched, and never from a single word. It is decided here, in
    // the same place the answer is understood, so the portrait and the reply
    // always come from one reading of the request.
    try{
      const A=animals();if(A){
        const U=(typeof window!=='undefined'&&window.SteadyUnderstanding)?window.SteadyUnderstanding:null;
        if(requested)window.SteadyAnimalChosen?.(requested);
        else considerAnimal(text,U?U.understand(text,previous,M):null,model);
      }
    }catch(e){/* the portrait is a hint; it must never break the reply */}
    // A bare greeting is stored as uncertain (no verse, no theme change),
    // so even "hello burden" cannot borrow an unrelated passage — and the
    // study classifier must not claim it as a Bible search either.
    const salutation=(typeof M.greeting==='function')?M.greeting(text):null;
    const steady=(typeof M.checkin==='function')?M.checkin(text):false;
    const conversational=askHelp?.conversationReply(text);
    if((salutation||steady||conversational||opts.saveReflection||opts.answer)&&!M.response(text,result).urgent)result={key:'foundation',matched:false};
    const urgent=M.response(text,result).urgent;
    const study=!followUp&&!opts.answer&&!opts.saveReflection&&!conversational&&!salutation&&!steady&&!urgent?scriptureRoute(text,previous,result,opts.explicitScripture).study:null;
    // Retrying an unchanged question need not fill the memory with duplicates.
    const existing=previous[0]?.text===text&&Boolean(previous[0]?.reflection)===Boolean(opts.saveReflection)?previous[0]:null;
    const requestedHelp=opts.helpStyle&&askHelp?.choices.includes(opts.helpStyle)?opts.helpStyle:followUp?.helpStyle||null;
    const request=existing?(study?{id:existing.id,text,key:'foundation',study,at:existing.at}:requestedHelp?{...existing,helpStyle:requestedHelp}:{...existing}):{id:taskId(),text,key:study?'foundation':result.key,...(opts.saveReflection?{reflection:true}:{}),...(study?{study}:result.guide?{guide:result.guide}:{}),...(!study&&!result.matched?{unmatched:true}:{}),helpStyle:requestedHelp||activeAnimal()||'donkey',at:new Date().toISOString()};
    if(opts.generalRequest){
      delete request.answer;delete request.answerUnavailable;
      if(opts.answer){request.answer={source:'on-device',text:opts.answer};delete request.guide;delete request.study;request.key='foundation';request.unmatched=true;}
      else request.answerUnavailable=true;
    }
    state.scriptureRequests=M.normalizeEntries([request,...previous]);
    if(!request.unmatched&&!request.study){day.scriptureRequest=request.id;delete day.scriptureTheme;}
    if(opts.saveReflection&&!existing){
      day.reflection=[day.reflection?.trim(),text].filter(Boolean).join('\n\n');
      day.reflectionSaved=true;
    }
    const nextDraft=input.value&&input.value.trim()!==text?input.value:'';
    day.feelingsDraft=nextDraft;
    const stored=save();
    if(request.reflection)reflectionSaveResults.set(request.id,stored);
    scrollPosition.followLatest=true;
    const relieved=!existing&&!!previous[0]?.unmatched&&!request.unmatched&&!urgent;
    let finalExpression=expressionFor({text:request.text,key:request.key,guide:request.guide,urgent,relieved,studyKind:request.study?.kind,unmatched:request.unmatched});
    // A stance only steers the welcome donkey's body language for this answer;
    // the saved reply keeps the guide-based expression so taps and typing agree.
    if(opts.stanceExpression&&!existing&&!urgent&&!request.unmatched&&!request.study&&request.guide)finalExpression=opts.stanceExpression;
    if(opts.practice&&!existing&&!urgent&&!request.unmatched&&!request.study&&request.guide)pendingPractice.set(request.id,typeof opts.step==='string'&&opts.step.trim()?opts.step.trim().slice(0,280):null);
    lastConvoExpression=finalExpression;
    setExpression(welcome.querySelector('.donkey-guide'),'thinking');
    input.value=nextDraft;syncSendButton();sizeComposer();status.textContent=stored?'':'Kept for this visit only. Device storage is unavailable.';
    X.haptic();
    renderTranscript(existing?undefined:request.id);
    setExpression(welcome.querySelector('.donkey-guide'),finalExpression);
    restoreScroll();
    if(!existing&&!requested&&!urgent&&!salutation&&!steady&&!request.study)window.SteadyBurdenMemoryStore?.capture(request);
  }
  panel.querySelector('form').addEventListener('submit',event=>{event.preventDefault();submit(input.value);});
  input.addEventListener('input',()=>{
    const value=input.value;checkDay();input.value=value;day.feelingsDraft=value.slice(0,1200);
    syncDraftPresence();
    syncSendButton();
    status.textContent=save()?'':'Draft kept for this visit only.';
    // While the user is writing, Burden listens; when cleared it settles back.
    setExpression(welcome.querySelector('.donkey-guide'),value.trim()? 'listening':lastConvoExpression);
    sizeComposer();
  });
  input.addEventListener('focus',()=>setComposerFocused(true));
  input.addEventListener('blur',()=>setComposerFocused(false));
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();submit(input.value);}
  });
  // The iOS search field is native, while this page remains the single owner
  // of drafts, matching and saved replies. The bridge only forwards text.
  window.SteadyBurdenComposer={
    setFocused:setComposerFocused,
    getDraft:()=>pendingTurn&&input.value.trim()===pendingTurn.text?'':input.value,
    setDraft:text=>{input.value=String(text||'').slice(0,1200);input.dispatchEvent(new Event('input',{bubbles:true}));},
    send:text=>submit(String(text||''))
  };
  function forget(id){
    if(X.helpReading?.sourceId===id)delete X.helpReading;
    state.scriptureRequests=entries().filter(item=>item.id!==id);
    window.SteadyBurdenMemoryStore?.forgetSource(id);
    // Remove references too, so a forgotten request can never reappear.
    for(const record of Object.values(state.days))if(record&&record.scriptureRequest===id)delete record.scriptureRequest;
    const stored=save();renderTranscript();syncDraftPresence();renderHomeScripture();
    status.textContent=stored?'Entry forgotten.':'Removed for this visit. Device storage could not be updated.';
    chatScroll.focus({preventScroll:true});
  }

  const scripture=X.routePanel('learn/scripture').node;
  const explanation=node('div','feelings-result');explanation.hidden=true;
  const reason=node('p','small-copy');reason.id='feelings-result-reason';
  const related=node('details','feelings-related');related.append(node('summary','','A related earlier moment'));
  const earlier=node('p','small-copy');related.append(earlier);
  const resultActions=node('div','feelings-result-actions');
  const changeTheme=node('button','text-link','Change theme');changeTheme.type='button';changeTheme.addEventListener('click',()=>{scripture.querySelector('.scripture-details').open=true;scripture.querySelector('#scripture-theme').focus();});
  resultActions.append(link('Write how you feel','#'+route),changeTheme);
  explanation.append(reason,related,resultActions);
  scripture.querySelector('#personal-verse').before(explanation);

  function renderResult(){
    const request=current(),chosen=X.scriptureChoice();
    const explicit=!!request&&!Object.hasOwn(SteadyGuide.themes,day.scriptureTheme);
    explanation.hidden=!explicit;
    scripture.querySelector('#truth-title').textContent=explicit?'A passage for this moment.':'A word for today.';
    if(!explicit)return;
    reason.textContent=chosen.reason;
    const prior=entries().find(item=>item.id===chosen.relatedId);
    related.hidden=!prior;
    earlier.textContent=prior?new Date(prior.at).toLocaleDateString(undefined,{day:'numeric',month:'short'})+' · '+prior.text:'';
  }
  function onScreen(screen){
    active=screen===route;
    if(!active){stopSpeech();clearTyping();setComposerFocused(false);if(document.activeElement===input)input.blur();}
    if(active){
      input.value=day.feelingsDraft||'';syncSendButton();status.textContent='';renderTranscript();sizeComposer();restoreScroll();
      if(entries().length>0){
        if(welcomeStage!==null)leaveWelcome();
      }else renderMainWelcome();
      actionsView?.render();
      if(draftIntent==='reflect')renderKeptReflection();
      syncDraftPresence();
      showPendingTurn();
      const newest=entries()[0];
      if(newest&&!input.value.trim()){
        lastConvoExpression=expressionFor({text:newest.text,key:newest.key,guide:newest.guide,urgent:M.response(newest.text,{key:newest.key}).urgent,studyKind:newest.study?.kind,unmatched:newest.unmatched});
        setExpression(welcome.querySelector('.donkey-guide'),lastConvoExpression);
      }
    }
    if(screen==='learn/scripture')renderResult();
  }
  document.addEventListener('steady:screen',event=>onScreen(event.detail));
  document.addEventListener('steady:wording-setting',()=>{renderTranscript();showPendingTurn();});
  document.addEventListener('change',event=>{
    if(['scripture-theme','setting-translation'].includes(event.target.id))renderResult();
    if(event.target.id==='setting-translation')renderTranscript();
  });
  // Repair the narrowly identified older reply that was sent to Bible word
  // search before general next-step questions had their own route. Keep its
  // text, identity and date; only its answer classification changes.
  const latest=entries()[0];
  if(latest?.study?.kind==='search'&&/\bwhat(?:'s| is) (?:the |my )?(?:best |right )?next step\b/i.test(latest.text.replace(/[’]/g,"'"))){
    const corrected=M.match(latest.text,entries().slice(1));
    if(corrected.guide==='decisions'&&typeof SteadyStudy!=='undefined'&&!SteadyStudy.classify(latest.text,window.SteadyBible,corrected,entries().slice(1))){
      const A=animals();
      if(A&&!A.isManual())A.chooseInterpretation('tortoise','clear');
      state.scriptureRequests=M.normalizeEntries(state.scriptureRequests.map(item=>item.id===latest.id
        ?{...item,key:corrected.key,guide:corrected.guide,study:null,unmatched:false,helpStyle:activeAnimal()||'donkey'}:item));
      day.scriptureRequest=latest.id;
      save();
    }
  }
  const latestStyle=entries()[0], requestedStyle=askHelp?.requestedStyle(latestStyle?.text);
  if(latestStyle?.unmatched&&!latestStyle.answer&&requestedStyle){
    const prior=askHelp.recentGuide(entries().slice(1),Date.parse(latestStyle.at));
    if(prior){
      window.SteadyAnimalChosen?.(requestedStyle);
      state.scriptureRequests=M.normalizeEntries(state.scriptureRequests.map(item=>item.id===latestStyle.id
        ?{...item,key:prior.key,guide:prior.guide,unmatched:false,helpStyle:requestedStyle}:item));
      day.scriptureRequest=latestStyle.id;
      save();
    }
  }
  if(location.hash==='#'+route)renderScreen();
  else onScreen(location.hash.slice(1)||'home');
})();
