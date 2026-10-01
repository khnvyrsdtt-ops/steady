'use strict';
// Pure, deterministic guidance. No network calls or generated clinical advice.
const SteadyGuide = (() => {
  const choices = {
    goal: { general:'A steadier day', faith:'Faith', health:'Health & rest', relationships:'Relationships', work:'Work & purpose', learning:'Learning', home:'Home', money:'Money', creativity:'Creativity', habits:'Habits', thinking:'Thinking', hobbies:'Hobbies' },
    time: { '1':'1 minute', '2':'2 minutes', '5':'5 minutes', '10':'10 minutes' },
    energy: { auto:'From my check-in', low:'Low', steady:'Steady', high:'Plenty' },
    environment: { anywhere:'Anywhere', quiet:'Quiet space', busy:'Busy place', outside:'Outside' },
    approach: { gentle:'Gentle', practical:'Direct' },
    priority:{build:'Build something',explore:'Explore & learn',decide:'Make a decision',restore:'Find balance'},
    blocker:{none:'Nothing specific',size:'The task feels too big',energy:'Not much energy',interruptions:'Too many interruptions',hesitation:'Hesitating to begin'},
  };
  const defaults = { goal:'general', time:'2', energy:'auto', environment:'anywhere', approach:'gentle',priority:'build',blocker:'none' };
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const validDate=date=>{
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
    const parsed=new Date(`${date}T12:00:00`);
    return Number.isFinite(parsed.getTime())&&parsed.getFullYear()===Number(date.slice(0,4))&&parsed.getMonth()+1===Number(date.slice(5,7))&&parsed.getDate()===Number(date.slice(8,10));
  };
  function context(profile={}, current={}) {
    const merged = {...defaults,...(record(profile)?profile:{}),...(record(current)?current:{})};
    // A blocker describes this check-in, never a saved preference or personality.
    merged.blocker=record(current)?current.blocker:undefined;
    return Object.fromEntries(Object.keys(defaults).map(k=>{
      const value=typeof merged[k]==='string'?merged[k]:k==='time'&&typeof merged[k]==='number'?String(merged[k]):'';
      return [k,Object.hasOwn(choices[k],value)?value:defaults[k]];
    }));
  }
  const catalog = [
    {id:'grow-build',need:'grow',title:'Build on what is working.',copy:'Choose one part of your goal you can move forward. Make a small, visible improvement.',mindset:'Aim for useful progress, not a perfect result.',evidence:'experiment'},
    {id:'grow-cue',need:'grow',title:'Finish one useful piece.',copy:'Complete one useful part of a task you want to advance. Leave a clear place to continue.',mindset:'One finished piece can be enough for now.',evidence:'experiment'},
    {id:'explore-question',need:'explore',title:'Follow one good question.',copy:'Choose something you are curious about. Make a prediction, then check it against a reliable source or a small experiment.',mindset:'Being surprised can be useful information.',evidence:'experiment'},
    {id:'explore-try',need:'explore',title:'Try a small variation.',copy:'Change one part of something familiar. Notice what changes and what stays the same.',mindset:'You are exploring, not proving yourself.',evidence:'experiment'},
    {id:'calm-pause',need:'calm',title:'Take a comfortable pause.',copy:'Let your shoulders soften. Take a few unforced breaths, or simply sit quietly.',mindset:'You do not have to solve everything in this moment.',evidence:'relaxation'},
    {id:'calm-notice',need:'calm',title:'Notice what is around you.',copy:'Find three ordinary things you can see. Let your attention rest on each one.',mindset:'A pause is enough for now.',evidence:'experiment'},
    {id:'clarity-one',need:'clarity',title:'Separate facts from assumptions.',copy:'Bring one decision to mind. Name what you know and what you are assuming. Check one missing fact before choosing.',mindset:'You can leave a choice open while a useful fact is missing.',evidence:'experiment'},
    {id:'clarity-prepare',need:'clarity',title:'Compare two ways forward.',copy:'Name two options and one thing that matters most in this decision. Compare the options against that, then choose or leave the decision open.',mindset:'A clear trade-off is more useful than forcing certainty.',evidence:'experiment'},
    {id:'energy-move',need:'energy',title:'Make a little room to move.',copy:'If comfortable, stretch your hands or shoulders, seated or standing. Keep the movement easy.',mindset:'Work with the energy you have.',evidence:'experiment'},
    {id:'energy-pause',need:'energy',title:'Take a quiet pause.',copy:'Sit comfortably and let one non-urgent task wait. Notice what would make the next step easier.',mindset:'Rest can be a useful choice.',evidence:'experiment'},
    {id:'connection-reach',need:'connection',title:'Make one small connection.',copy:'Send a simple hello to someone you trust, or listen to someone already beside you.',mindset:'You do not need a perfect message.',evidence:'experiment'},
    {id:'connection-plan',need:'connection',title:'Make space for someone.',copy:'Choose one person you would like to connect with. Pick a comfortable moment to reach out later.',mindset:'Keep the invitation small and optional.',evidence:'planning'},
    {id:'progress-start',need:'progress',title:'Start with one small piece.',copy:'Open what you need and do the first manageable part. Stop at the end of your chosen time if you want.',mindset:'An imperfect beginning still counts.',evidence:'planning'},
    {id:'progress-plan',need:'progress',title:'Finish one easy part.',copy:'Do one small, familiar part of the task now. Save or put away that finished piece before moving on.',mindset:'You can enter a task through its easiest useful part.',evidence:'experiment'},
    {id:'rest-stop',need:'rest',title:'Let something wait.',copy:'Set down one non-urgent task and pause comfortably. There is nothing to catch up on during this moment.',mindset:'You do not need to earn a pause.',evidence:'experiment'},
    {id:'rest-quiet',need:'rest',title:'Lower the demands around you.',copy:'Choose one thing to make gentler: less noise, fewer open tabs, or a more comfortable position.',mindset:'A small adjustment is enough.',evidence:'experiment'}
  ];
  // Keep an explicit check-in; otherwise start from the person's saved priority.
  // Daily conditions and previous moods do not become assumptions about today.
  // The clock may offer a gentler place to begin, but only as a suggestion the
  // person can change, and never once this hour is their established rhythm.
  function startingNeed(profile={},currentNeed,rhythm) {
    if(catalog.some(item=>item.need===currentNeed))return currentNeed;
    if(catalog.some(item=>item.need===rhythm?.suggest))return rhythm.suggest;
    return {build:'grow',explore:'explore',decide:'clarity',restore:'rest'}[context(profile).priority];
  }
  const evidence = {
    planning:{label:'Supported principle · if–then planning',text:'Research supports linking a specific situation to an action. The exact suggestion here is a practical adaptation, not a tested intervention.',url:'https://doi.org/10.1016/S0065-2601(06)38002-1',source:'Gollwitzer & Sheeran, 2006 · meta-analysis'},
    relaxation:{label:'Limited evidence · brief relaxation',text:'Relaxation may help some people with stress. Evidence varies; this short pause is not a treatment. Skip breathing exercises if they feel uncomfortable.',url:'https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know',source:'NCCIH · evidence overview'},
    experiment:{label:'Personal experiment',text:'This is a low-demand suggestion, not a proven answer for your situation. Your experience determines whether it is worth repeating.'},
    retrieval:{label:'Supported principle · retrieval practice',text:'Practising recall can improve later retention of material you have studied. Steady’s short cards and review timings have not been independently evaluated, and are not proven to improve general intelligence.',url:'https://pubmed.ncbi.nlm.nih.gov/16507066/',source:'Roediger & Karpicke, 2006 · retrieval study'}
  };
  const scriptureSteps=typeof SteadyScriptureDirection!=='undefined'?SteadyScriptureDirection:(typeof module!=='undefined'?require('./scripture-direction-model.js'):null);
  const variantOf=value=>typeof value?.variant==='string'&&/^[a-z]+(?:-[a-z]+)*$/.test(value.variant)?value.variant:'base';
  function feedbackKey(outcome){return JSON.stringify([typeof outcome?.id==='string'?outcome.id:'',typeof outcome?.context?.goal==='string'?outcome.context.goal:'',variantOf(outcome)]);}
  function outcomes(days) {
    return Object.entries(days||{}).sort(([a],[b])=>a.localeCompare(b)).flatMap(([,d])=>{
      const ratings=(Array.isArray(d?.outcomes)?d.outcomes:[]).filter(o=>o && (catalog.some(c=>c.id===o.id)||scriptureSteps?.isKnownId(o.id)) && ['useful','neutral','not-useful','worse'].includes(o.rating));
      return ratings.filter((o,index)=>!ratings.slice(index+1).some(later=>feedbackKey(later)===feedbackKey(o)));
    });
  }
  // `guard` carries only what should *withhold* a fuller step: a quiet hour, or a
  // day whose shape has moved on. It never adds one, so choosing to push on is
  // always the person's decision.
  function actionMode(need,ctx,guard){
    const active=['progress','grow'].includes(need),blocker=active?ctx.blocker:'none';
    const low=ctx.energy==='low'||blocker==='energy'||(ctx.energy==='auto'&&['rest','energy'].includes(need));
    const busy=ctx.environment==='busy'||blocker==='interruptions';
    const stretch=need==='grow'&&['auto','high'].includes(ctx.energy)&&ctx.time==='10'&&blocker==='none'&&!guard?.withhold;
    const parts=[];
    if(active&&['size','hesitation'].includes(blocker))parts.push(blocker);
    if((active||need==='clarity')&&low)parts.push('energy');
    if((active||need==='clarity')&&busy)parts.push('interruptions');
    if(stretch)parts.push('stretch');
    return {low,busy,stretch,blocker,variant:parts.join('-')||'base'};
  }
  function candidateVariant(item,ctx,mode){
    if(mode.variant!=='base')return mode.variant;
    // Stable IDs preserve history, but an old plan/preparation completion is
    // not completion of the new doing action shown under the same ID.
    if(item.id==='clarity-prepare')return 'direction';
    if(['progress-plan','grow-cue'].includes(item.id))return 'doing';
    if(['progress-start','grow-build'].includes(item.id)&&(['health','habits','thinking'].includes(ctx.goal)||(item.id==='grow-build'&&ctx.goal==='general')))return 'doing';
    return 'base';
  }
  function feedbackWeight(outcome,ctx){
    const prior=record(outcome.context)?outcome.context:{};
    // A goal-only legacy rating still counts. Explicitly similar conditions
    // count more, while a different blocker/energy/setting carries less weight.
    let weight=.75;
    for(const [key,penalty]of [['blocker',.35],['energy',.45],['environment',.55],['time',.7]]){
      if(!Object.hasOwn(prior,key))continue;
      if(String(prior[key])===ctx[key])weight+=.35;else weight*=penalty;
    }
    return weight;
  }
  function recommend(need, ctx, days, exclude, preferredId, rhythmOptions) {
    ctx=context({},ctx);
    // The local clock is read once, here, so the step's size can match the hour
    // without ever claiming the person reported something they did not.
    const clock = typeof SteadyRhythm!=='undefined'
      ? SteadyRhythm.moment(days||{},{...rhythmOptions, need})
      : { quiet:false, note:'', theirs:false, part:'' };
    // Where this hour sits in the person's own day, and how much they have left.
    // Absent, malformed or simply unknown, this withholds nothing.
    const situation = rhythmOptions?.situation && typeof rhythmOptions.situation==='object'
      ? rhythmOptions.situation : null;
    const guard = { withhold: Boolean(clock.quiet) || (situation ? situation.capacity==='light' : false) };
    const mode=actionMode(need,ctx,guard);
    const pool=catalog.filter(p=>p.need===need);
    const rated=outcomes(days);
    const avoided=new Set(rated.filter(o=>o.rating==='worse').map(o=>o.id));
    // These entry points share the same goal-specific activity. Changing the
    // check-in must not bring back an activity that made things worse.
    for(const goalActions of [['grow-build','progress-start'],['grow-cue','progress-plan']]){
      if(ctx.goal!=='general'&&rated.some(o=>o.rating==='worse'&&o.context?.goal===ctx.goal&&goalActions.includes(o.id)))goalActions.forEach(id=>avoided.add(id));
    }
    const scored=pool.filter(p=>!avoided.has(p.id)).map((p,i)=>{
      const variant=candidateVariant(p,ctx,mode);
      const relevant=rated.filter(o=>o.id===p.id&&o.context?.goal===ctx.goal&&variantOf(o)===variant).slice(-8);
      const score=relevant.reduce((sum,o)=>sum+(o.rating==='useful'?2:o.rating==='not-useful'?-3:0)*feedbackWeight(o,ctx),0);
      return {p,score,i,relevant,variant};
    }).filter(x=>x.p.id!==exclude).sort((a,b)=>b.score-a.score||a.i-b.i);
    // An explicit choice survives small context adjustments, but never overrides exclusions.
    const match=scored.find(item=>item.p.id===preferredId)||scored[0]; if(!match){
      const allAvoided=pool.length>0&&pool.every(p=>avoided.has(p.id));
      return {id:`${need}-own`,need,variant:mode.variant,title:'Choose your own next step.',copy:'There are no other suitable suggestions in this small library. Choose a small action you trust, or leave it here for now.',minutes:1,setup:'Use the conditions that work for you.',approach:'You do not need to follow a suggestion to make progress.',fitReason:allAvoided?'You said these approaches made things worse, so they have been left out.':'The small library has no other suitable approach for these choices.',reason:allAvoided?'You said the available approaches made things worse. Steady will not keep recommending them.':'There is no other available approach to offer right now. You can choose your own step without repeating a suggestion.',assumptions:'There may be better options outside this small library.',perspective:'Your experience takes priority over this suggestion library.',evidence:'experiment',context:{...ctx}};
    }
    const p={...match.p};
    const {low,busy,stretch}=mode;
    // `low` is only ever something the person told us. `gentle` is the reduced
    // demand that actually shapes the step, and the clock may lower it. Keeping
    // them apart is what stops the app claiming "you chose low energy" when the
    // only thing that happened was that it is 1am.
    const gentle=low||guard.withhold;
    p.variant=match.variant;
    p.minutes=Math.min(Number(ctx.time),gentle?2:['progress','grow','explore'].includes(need)?10:5);
    const target={
      general:{title:'Make one useful piece.',copy:'Start or continue a task that matters to you. Do its next small, visible part with what you already have.'},
      faith:{title:'Read slowly. Carry one line with you.',copy:'Read a few verses of scripture. Pause over one sentence and consider one small way to live it today.'},
      health:{title:'Take care of one everyday need.',copy:'If comfortable, take a few sips of a drink or make one gentle stretch. Keep the action easy and within what works for you.'},
      relationships:{title:'Send a simple thank-you.',copy:'Think of someone who helped you recently. Send one honest sentence of thanks, if reaching out feels appropriate.'},
      work:{title:'Open the task. Make one small start.',copy:'Open the file or tool for your next task. Do its first manageable part, then leave a clear place to continue.'},
      learning:{title:'Recall one useful idea.',copy:'Recall one thing you recently learned before looking it up. Check it, then say the corrected idea once in your own words.',evidence:'retrieval'},
      home:{title:'Put three things back.',copy:'Return three nearby things to where they belong. Leave the rest for another time.'},
      money:{title:'Understand one bill.',copy:'Open one bill or account record. Find the amount and date, then notice anything you need to check before taking action.'},
      creativity:{title:'Make one rough sketch.',copy:'Make a rough sketch or a few lines of an idea using what you have. Keep the first version rough; you can refine it later.'},
      habits:{title:'Do one familiar repeat.',copy:'Do the first small part of a habit you already want to practise. Use what is within reach and count this one repetition.',evidence:'experiment'},
      thinking:{title:'Check one claim against a source.',copy:'Take one claim you are already considering. Open a reliable source and check what it actually says about that claim.'},
      hobbies:{title:'Repeat one small skill.',copy:'Try one familiar part of a hobby slowly, using what you already have. Notice one detail you could adjust next time.'}
    };
    const alternate={
      general:{title:'Finish one easy part.',copy:'Do one small, familiar part of the task you already have in mind. Finish that piece before moving on.'},
      faith:{title:'Put care into practice.',copy:'Do one small act of care that fits the teaching you want to live by: send a kind message or offer one practical hand, if appropriate.'},
      health:{title:'Make your next care step easier.',copy:'Fill a glass or bottle for later, or arrange a comfortable place to pause. Complete one practical bit of care now.'},
      relationships:{title:'Reply to one person.',copy:'Reply to one message you have been meaning to answer, if contact feels appropriate. A short, honest reply is enough.'},
      work:{title:'Finish one useful edit.',copy:'Correct one clear detail in work already started: a sentence, a row or a small error. Save that finished edit.'},
      learning:{title:'Try one worked example.',copy:'Attempt one example or practice question in something you are learning. Check the answer and correct one part.'},
      home:{title:'Clear one small patch.',copy:'Clear one small patch of a surface you use. Put away its contents and stop at the edge of that patch.'},
      money:{title:'Record one expense.',copy:'Use one recent receipt or account entry to record its amount and what it was for. No purchase or commitment is needed.'},
      creativity:{title:'Make a second rough version.',copy:'Take an idea you already have and make a quick variation: change one shape, sentence, sound or arrangement.'},
      habits:{title:'Use an existing cue now.',copy:'Use something already in front of you as the cue to do one familiar habit repetition now. Finish the repetition before adding anything else.'},
      thinking:{title:'Test a claim with an example.',copy:'Try one concrete example against a claim you are considering. Work through the example and note whether it supports the claim.'},
      hobbies:{title:'Practise one tricky detail.',copy:'Repeat one small, familiar detail of your hobby. Adjust it once and try it again with the tools you already have.'}
    };
    const small={
      general:['Do just the first unfinished part of the task in front of you. Stop after that one piece.','Complete the easiest useful piece of the task, even if it is not the first in order. Stop after that piece.'],
      faith:['Read one verse from the passage you already chose, slowly and once more.','Send one sentence of care to someone, if appropriate. Leave a longer conversation for another time.'],
      health:['If comfortable, stretch just your hands or shoulders gently. Stop after that one movement.','Fill one glass or bottle for later and put it within reach.'],
      relationships:['Send just one sentence of thanks to someone, if appropriate.','Answer just one part of a message, if appropriate. A short reply can stand on its own.'],
      work:['Complete one small unit of the task: one sentence, one row or one item. Save it and stop there.','Correct one obvious detail in work already started. Save that single correction.'],
      learning:['Recall one useful idea in a sentence, then check that sentence against your source.','Work through just the first part of one practice example, then check that part.'],
      home:['Put one nearby item back where it belongs. Leave the rest for another step.','Clear one hand-sized patch of a surface. Leave the rest of the surface alone.'],
      money:['Read the amount and due date on one bill. Record just those two details.','Record the amount from one receipt. Leave sorting the rest for another step.'],
      creativity:['Make one mark, line or phrase of the idea you have in mind. Stop after this fragment.','Change just one line or detail in an idea already started. Leave the rest alone.'],
      habits:['Do just the first repeat of your familiar habit. Stop after that repeat.','Do the easiest part of your familiar habit now. Leave the remaining parts for later.'],
      thinking:['Check one concrete statement against one reliable source. Leave other claims for later.','Work through just one example of the claim you are considering.'],
      hobbies:['Repeat one small movement or phrase of your hobby. Stop after one repeat.','Adjust one familiar detail of your hobby and try it once.']
    };
    const tiny={
      general:['Do one brief part of the task already within reach, even a single item or line. Then stop.','Finish one easy detail in something already started. Then stop.'],
      faith:['Read one short verse from a passage you know. That can be the whole step.','Send a brief kind hello, if appropriate. That can be the whole step.'],
      health:['If comfortable, take a sip of a drink already within reach. That can be enough.','Make one small adjustment to your sitting position or support, if it feels comfortable.'],
      relationships:['Send a simple “thank you”, if appropriate. No longer message is needed.','Send one brief reply, if appropriate. You do not need to continue the conversation now.'],
      work:['Add one rough line to the task already open, then save it. No editing is needed now.','Fix one typo or equally small detail in work already open, then save it.'],
      learning:['Recall one term or fact before checking it. Skip a longer study session for now.','Answer one familiar practice question with your source nearby. Check only that answer.'],
      home:['Put one easy-to-reach item back. Avoid lifting or moving anything demanding.','Move one small item off the surface you use. Leave the larger cleanup for later.'],
      money:['Open one record already available and read its due date. Nothing needs to be decided now.','Copy one amount from a receipt already within reach. Leave calculations for later.'],
      creativity:['Add one rough mark or a few words to an idea. Leave it unfinished if needed.','Change one tiny detail in something already made. Leave the rest as it is.'],
      habits:['Do the lightest familiar part of your habit once. That can be enough today.','Repeat one easy part of a habit you know. Use what is already within reach.'],
      thinking:['Read one sentence in a source you already trust and check what it claims.','Check one familiar example against the claim you are considering. Stop after that example.'],
      hobbies:['Try one easy, familiar part of your hobby once. Keep the effort comfortable.','Repeat one comfortable detail of your hobby, slowly and once.']
    };
    const active=['progress','grow'].includes(need),second=['progress-plan','grow-cue'].includes(p.id),index=second?1:0;
    if(active)Object.assign(p,{evidence:'experiment'},second?alternate[ctx.goal]:target[ctx.goal]);
    if(ctx.goal==='general'&&p.id==='progress-start')Object.assign(p,{title:'Do the first unfinished part.',copy:'Open or set out the task you already have in mind. Do its first unfinished part for the time you have, then leave a clear place to continue.'});
    if(active&&(mode.blocker!=='none'||gentle||busy)){
      p.copy=(gentle?tiny:small)[ctx.goal][index];
      if(mode.blocker==='size')p.copy+=' Keep everything outside that one piece for later.';
      if(mode.blocker==='hesitation')p.copy+=second?' Use a familiar way of doing it; improving the method can wait.':' Let this be a first attempt; leave fixing or polishing it for later.';
      if(busy)p.copy+=' If interrupted, leave a visible mark where you stopped; this piece can stand on its own.';
    }
    if(active&&gentle){p.title=second?'Do one easy '+({work:'edit',learning:'example',home:'tidy-up',money:'record',creativity:'change',habits:'repeat',thinking:'check',hobbies:'repeat',faith:'act of care',health:'care step',relationships:'reply',general:'detail'}[ctx.goal])+'.':'Keep this '+({work:'work step',learning:'recall',home:'tidy-up',money:'money step',creativity:'first sketch',habits:'repeat',thinking:'check',hobbies:'practice',faith:'reading',health:'care step',relationships:'thank-you',general:'step'}[ctx.goal])+' light.';}
    if(stretch){
      const extend={general:'Take a task you want to advance. Make a useful first piece, or add to a piece if you have one.',faith:'Read a short passage of Scripture and its surrounding verses. Follow one connection within the chapter.',health:'Do a manageable part of a comfortable care or movement routine, at a pace that suits you. Stop if it feels uncomfortable.',relationships:'Give one welcome conversation or practical act of care your attention, if the other person has space for it.',work:'Take a task you want to advance. Draft or complete one useful section.',learning:'Work through one example in a topic you want to learn. Explain the result in your own words, then check it.',home:'Put one small area in order. Finish that area, keeping the work manageable.',money:'Work through a small section of a bill, account record or budget. Check the details against their source.',creativity:'Make a useful section of a sketch, piece of writing, music or other creative work. Start a first version or add to one if you have it.',habits:'Do one routine you want to practise. Complete a useful part while keeping the effort comfortable.',thinking:'Take a question you want to understand. Compare two relevant pieces of evidence.',hobbies:'Practise one skill or short section in a hobby you want to work on. Pay attention to one detail as you go.'};
      const refine={general:'Make one useful improvement to a task. If you have no draft or result yet, create a rough first piece and check one detail.',faith:'Read a paragraph of Scripture. Check one line against the whole paragraph before drawing a conclusion.',health:'Try a comfortable care or movement action. Repeat the part that feels useful, without increasing the effort.',relationships:'Follow through on a small helpful offer if you have one; otherwise do a practical act of care that is welcome.',work:'Take a section of work you want to improve. If it does not exist yet, make a rough first version, then check one detail.',learning:'Attempt a practice example, check it, and correct any gaps you find.',home:'Finish one small loose end in an area you want to improve. Put the items involved in their places.',money:'Check a small section of a record against its source. Correct any entry that does not match.',creativity:'Make or choose a short creative fragment. Try one variation and keep the version that works better.',habits:'Do one familiar habit repetition with attention to how it feels. Adjust one practical detail if that makes the action easier.',thinking:'Test one alternative explanation against a reliable source or a concrete example.',hobbies:'Practise a short section or skill. Adjust one detail, then repeat it.'};
      p.title=second?'Make one useful improvement.':'Move one useful part forward.';
      p.copy=(second?refine:extend)[ctx.goal]+' Use the 10 minutes you chose, then leave a clear place to continue.';
      if(busy)p.copy+=' Work in pieces that can stand alone, and mark your place whenever you are interrupted.';
    }
    if(need==='clarity'){
      const area=ctx.goal==='general'?'this decision':'the decision about '+choices.goal[ctx.goal].toLowerCase();
      p.copy=p.id==='clarity-one'?`For ${area}, name what you know and what you are assuming. Check the one missing fact most likely to change your choice.`:`For ${area}, name two possible directions and one thing the choice needs to protect. Compare both options against it, then choose or leave the decision open.`;
      if(gentle)p.copy=p.id==='clarity-one'?`For ${area}, name one fact you know and one question still open. Check only that question if you have the energy.`:`For ${area}, compare just two options against the one thing that matters most. You can leave the choice open.`;
      if(busy)p.copy+=' Keep a short note of the comparison so you can return to it after an interruption.';
    }
    if(p.id==='explore-question'&&ctx.goal!=='general')p.copy=`Choose one question about ${choices.goal[ctx.goal].toLowerCase()}. Predict an answer, then check one reliable source or a small example.`;
    p.setup=busy?'Keep the step small enough for interruptions; leave a visible place to return to.':{anywhere:'Keep only what you need within reach.',quiet:'Put distractions out of reach for this short step.',outside:'Find a safe place to stop before beginning.'}[ctx.environment];
    p.preparation={creativity:'Use the materials you already have; no new equipment needed.',hobbies:'Set out one tool or material you already own.',work:'Open only the file or tool for this small step.',learning:'Keep one source ready, but try recalling before looking.',money:'Have the relevant record available; no purchase or commitment is needed.'}[ctx.goal]||'No special equipment needed.';
    p.pacing=`Stop after about ${p.minutes} ${p.minutes===1?'minute':'minutes'} and decide whether continuing is worthwhile. If now is inconvenient, choose a specific later moment.`;
    p.approach=gentle?'Make the step smaller if needed. Stop when you have had enough.':ctx.approach==='practical'?'Choose the first action, then do only that.':p.mindset;
    const fitByBlocker={size:'You chose a task that feels too big, so this isolates one finishable piece.',energy:'You chose limited energy, so this asks for just one light action.',interruptions:'You chose interruptions, so this piece has a clear stopping and restarting point.',hesitation:'You chose hesitation, so this allows a first attempt without polishing it.'};
    p.fitReason=stretch?(ctx.energy==='high'?'You chose plenty of energy and 10 minutes, giving room for a fuller useful action.':'The growth focus and your 10 minutes give room for a fuller useful action.'):fitByBlocker[mode.blocker]||
      (low?'You chose low energy, so the demand is reduced as well as the time.':busy?'You chose a busy place, so this can pause and resume after an interruption.':
      need==='clarity'?(p.id==='clarity-one'?'This checks an uncertainty before you commit to a direction.':'This compares two directions against what matters in the decision.'):
      need==='progress'?'This begins a concrete part of the task within the time you chose.':
      need==='grow'?'This uses your chosen time to move one useful piece of work forward.':
      ({calm:'You chose calm, so this gives your attention one gentle place to settle.',energy:'You chose an energy reset, so this keeps the effort light.',rest:'You chose rest, so this lowers one demand for a moment.',connection:'You chose connection, so this offers one small way to reach someone.',explore:'You chose exploration, so this gives you something concrete to try or check.'}[need]||'This follows the focus and time you chose.'));
    // Automatic low effort for a rest/energy check-in is not an explicit report
    // of low energy, so do not describe it as something the person told us.
    if(low&&ctx.energy!=='low'&&mode.blocker!=='energy'&&!stretch&&!fitByBlocker[mode.blocker])p.fitReason=need==='rest'?'You chose rest, so this lowers one demand for a moment.':'You chose an energy reset, so this keeps the effort light.';
    // Where today's shape sits is the most useful thing to explain, so its wording
    // leads; the hour is the fallback. Either way it never overwrites wording that
    // only cites the person's own choices, and it is dropped entirely when there is
    // nothing genuinely worth saying.
    const situationNote=typeof situation?.note==='string'?situation.note:'';
    const contextNote=situationNote||clock.note;
    if(contextNote){
      const stated=Boolean(fitByBlocker[mode.blocker])||(low&&ctx.energy==='low')||stretch;
      p.fitReason=stated?`${contextNote} ${p.fitReason}`:contextNote;
    }
    p.reason=`A suggestion for ${choices.goal[ctx.goal].toLowerCase()}, taking about ${p.minutes} ${p.minutes===1?'minute':'minutes'}.`;
    // What Steady actually remembers, said plainly. The ranking above already uses
    // this history; without saying so the app looks like it is guessing when it is
    // in fact remembering, and the user cannot tell a considered suggestion from a
    // random one. Said only when the record is real: a rating for this same
    // approach, in this same goal, in this same form.
    const remembered=match.relevant.filter(o=>o.rating==='useful'||o.rating==='worse');
    if(remembered.some(o=>o.rating==='useful')){
      const helped=remembered.filter(o=>o.rating==='useful').length;
      p.recall=helped>1?`This worked for you ${helped} times before, in the same conditions.`
        :'This worked for you last time you were doing this.';
    }else if(pool.some(item=>avoided.has(item.id))){
      p.recall='An approach you said made things harder has been left out.';
    }else if(match.relevant.some(o=>o.rating==='not-useful'||o.rating==='neutral')){
      // Reachable, unlike a "worse" rating, which excludes the approach entirely.
      // Say so plainly: the step is on offer, but it is not being counted on.
      p.recall='This did not help last time, so Steady is not counting on it.';
    }
    // The useful and excluded facts are now stated once, on the visible `recall`
    // line, so they are not repeated here. What remains is the one distinct
    // detail this disclosure adds: that the pool was narrowed by a past rating.
    if(rated.some(o=>o.id!==p.id&&o.context?.goal===ctx.goal&&o.rating==='not-useful'&&pool.some(c=>c.id===o.id&&candidateVariant(c,ctx,mode)===variantOf(o))))p.reason+=' A different approach from one you marked not useful.';
    p.assumptions='This assumes the action is safe, practical and relevant to your goal. We may be missing important circumstances. The ranking reflects a small library and can be biased.';
    p.perspective='Check likely consequences, who else is affected, and another reasonable perspective before making an important choice.';
    p.context={...ctx};
    return p;
  }
  const themes = {foundation:'Starting small',rest:'Rest & burdens',wisdom:'Wisdom & choices',connection:'Caring for others',gratitude:'Gratitude',grief:'Comfort in sorrow',grace:'Kindness & forgiveness'};
  const words={rest:/\b(tired|exhausted|overwhelmed|stress(?:ed)?|anxious|worr(?:y|ied|ying)|rest|sleep|burden)\b/i,wisdom:/\b(decide|decision|confused|learn|study|exam|wisdom|choice|money|budget|work)\b/i,connection:/\b(lonely|alone|friend|family|relationship|connect|help)\b/i,gratitude:/\b(grateful|gratitude|thankful|thanks|joy|good)\b/i,grief:/\b(grief|grieving|bereavement|died|death|loss|sorrow|heartbroken)\b/i,grace:/\b(forgive|forgiveness|guilt|ashamed|shame|anger|angry|kindness)\b/i};
  function scripture(day,ctx,override,requests) {
    day=record(day)?day:{};
    ctx=context(ctx);
    if(typeof override==='string'&&Object.hasOwn(themes,override))return {key:override,reason:'A theme you chose.'};
    if(typeof SteadyFeelings!=='undefined'&&typeof day.scriptureRequest==='string'){
      const entries=SteadyFeelings.normalizeEntries(requests);
      const index=entries.findIndex(entry=>entry.id===day.scriptureRequest);
      if(index!==-1){
        const request=entries[index],result=SteadyFeelings.match(request.text,entries.slice(index+1));
        // A saved passage stays stable if older context is later forgotten.
        return result.key===request.key?result:{key:request.key,matched:false,reason:'The passage saved with this request. Choose another theme if it no longer fits.'};
      }
    }
    const score=Object.fromEntries(Object.keys(themes).map(k=>[k,0]));
    const matches=[];
    const needTheme={calm:'rest',rest:'rest',energy:'rest',clarity:'wisdom',connection:'connection',progress:'foundation'};
    score[needTheme[day.need]||'foundation']+=3;
    const goalTheme={faith:'foundation',health:'rest',relationships:'connection',learning:'wisdom',work:'wisdom',money:'wisdom',home:'foundation'};
    if(goalTheme[ctx.goal])score[goalTheme[ctx.goal]]+=2;
    const fields=[day.mind,day.intention,day.reflection,...(Array.isArray(day.reflections)?day.reflections:[]),...(Array.isArray(day.tasks)?day.tasks:[]).filter(t=>t&&!t.default).map(t=>t.text)];
    for(const text of fields.filter(t=>typeof t==='string'))for(const [key,pattern] of Object.entries(words)){
      const positiveText=text.replace(/\b(?:not|never|no longer|don’t|don't|isn’t|isn't|aren’t|aren't)\s+(?:(?:feel|feeling|very|really|so|that)\s+){0,3}\w+/gi,'');
      const match=positiveText.match(pattern);
      if(match){score[key]+=4;matches.push({key,word:match[0]});}
    }
    const key=Object.keys(score).sort((a,b)=>score[b]-score[a])[0];
    const exact=matches.find(match=>match.key===key);
    return {key,reason:exact?`Matched with “${exact.word}” in what you wrote.`:'A starting passage based on your current choices. Choose another theme whenever you like.'};
  }
  function progress(days) {
    const entries=Object.entries(record(days)?days:{}).filter(([date,d])=>validDate(date)&&record(d)).sort(([a],[b])=>b.localeCompare(a));
    const rows=entries.map(([date,d])=>{
      const actions=(Array.isArray(d.actionLog)?d.actionLog:[]).filter(action=>record(action)&&typeof action.id==='string'&&action.id);
      const goalOf=action=>typeof action.goal==='string'&&(Object.hasOwn(choices.goal,action.goal)||action.goal==='rest')?action.goal:'';
      const actionKey=action=>JSON.stringify([action.id,variantOf(action)]);
      const specified=new Set(actions.filter(action=>goalOf(action)).map(actionKey));
      const logged=new Set(actions.filter(action=>goalOf(action)||!specified.has(actionKey(action))).map(action=>JSON.stringify([action.id,goalOf(action),variantOf(action)])));
      const loggedIds=new Set(actions.filter(action=>variantOf(action)==='base').map(action=>action.id));
      const legacy=new Set((Array.isArray(d.completedNeeds)?d.completedNeeds:[]).filter(need=>catalog.some(p=>p.need===need)&&!catalog.some(p=>p.need===need&&loggedIds.has(p.id))));
      const tasks=(Array.isArray(d.tasks)?d.tasks:[]).filter(t=>t?.complete===true);
      const taskCount=new Set(tasks.map((task,index)=>typeof task.id==='string'&&task.id?task.id:`unidentified-${index}`)).size;
      const plannedTasks=(Array.isArray(d.tasks)?d.tasks:[]).filter(task=>record(task)&&typeof task.text==='string'&&task.text.trim()&&task.complete!==true);
      const planned=new Set(plannedTasks.map((task,index)=>typeof task.id==='string'&&task.id?`id:${task.id}`:`index:${index}`)).size;
      const response=d.scriptureReflection;
      const scriptureReflection=response&&typeof response==='object'&&!Array.isArray(response)&&typeof response.theme==='string'&&Object.hasOwn(themes,response.theme)&&['practice','pause','pray','sit'].includes(response.choice);
      const writtenReflection=typeof d.reflection==='string'&&d.reflection.trim().length>0;
      const selectedReflection=Array.isArray(d.reflections)&&d.reflections.some(value=>typeof value==='string'&&value.trim().length>0);
      return {date,note:typeof d.mind==='string'&&!!d.mind.trim(),actions:taskCount+logged.size+legacy.size,planned,closed:d.closed===true,practice:d.practice&&typeof d.practice==='object'&&!Array.isArray(d.practice)?Object.values(d.practice).filter(p=>p&&typeof p==='object'&&!Array.isArray(p)).length:0,reflection:!!(writtenReflection||selectedReflection||scriptureReflection)};
    });
    const rated=outcomes(days);
    return {rows:rows.filter(d=>d.actions||d.planned||d.closed||d.practice||d.reflection||d.note),actions:rows.reduce((s,d)=>s+d.actions,0),practice:rows.reduce((s,d)=>s+d.practice,0),reflections:rows.filter(d=>d.reflection).length,useful:rated.filter(o=>o.rating==='useful').length,ratings:rated.length};
  }
  return {choices,defaults,context,startingNeed,catalog,evidence,recommend,outcomes,feedbackKey,themes,scripture,progress};
})();
if(typeof module!=='undefined')module.exports=SteadyGuide;
