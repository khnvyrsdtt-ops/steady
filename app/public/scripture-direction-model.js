'use strict';
// Curated invitations for Scripture → life. These are editorial suggestions,
// not Bible text, clinical advice, or claims of divine direction.
const SteadyScriptureDirection = (() => {
  const goals = {faith:'faith',relationships:'relationships',work:'work',learning:'learning',rest:'rest'};
  const choices = ['practice','pause','pray','sit'];
  const passageContext = {
    foundation:'Matthew 7:24 connects hearing Jesus’ words with doing them.',
    rest:'Matthew 11:28 is Jesus’ invitation to come to him for rest.',
    wisdom:'James 1:5 invites those who lack wisdom to ask God for it.',
    connection:'Galatians 6:2 calls believers to carry one another’s burdens.',
    gratitude:'1 Thessalonians 5:18 calls for thanksgiving in all circumstances.',
    grief:'Psalm 34:18 speaks of God’s nearness to the brokenhearted.',
    grace:'Ephesians 4:32 connects kindness and forgiveness with God’s forgiveness in Christ.'
  };
  const themes = {
    foundation: [
      {key:'practice',title:'Put one good intention into practice.',byGoal:{
        faith:'Recall one teaching of Jesus from the passage. Choose one ordinary moment today to act on it.',
        relationships:'Bring one small promise to mind. Do its first manageable part, or let the person know when you can.',
        work:'Open the task you already meant to begin. Complete its first small part with care.',
        learning:'Choose one idea you have learned. Try it on a single example instead of only reading it again.',
        rest:'Choose a place for a short pause and let one non-urgent demand wait.'}},
      {key:'prepare',title:'Make your next good choice easier.',byGoal:{
        faith:'Keep the passage beside a routine you already have. Choose one line to return to at that moment.',
        relationships:'Choose a comfortable moment to keep in touch with someone you value. Decide a simple opening sentence.',
        work:'Set out just what you need for your next task. Leave the first small action ready to begin.',
        learning:'Open one example or page for your next practice. Decide exactly where you will start.',
        rest:'Put away one non-essential distraction and make your resting place a little more comfortable.'}}
    ],
    rest: [
      {key:'set-down',title:'Let one non-urgent thing wait.',byGoal:{
        faith:'Read the passage once without trying to produce an answer. Let one non-urgent task wait while you pause.',
        relationships:'Let one non-urgent reply wait for a calmer moment. You can care for someone without answering immediately.',
        work:'Find a natural stopping point in the task. Leave yourself a clear place to continue, then pause.',
        learning:'Mark where you stopped. Put the material down for a brief pause without adding another exercise.',
        rest:'Set down one non-urgent demand. Sit or stand somewhere comfortable with nothing to catch up on.'}},
      {key:'ease',title:'Make this moment a little gentler.',byGoal:{
        faith:'Choose a quieter place for a short prayer, or read silently where you are. There is no right amount to say.',
        relationships:'Choose a quieter moment or place for your next conversation, if that would help both of you.',
        work:'Close one unused window or move one distracting item. Keep only what you need nearby.',
        learning:'Reduce one distraction around your reading or practice. Give yourself permission to stop at one small section.',
        rest:'Adjust one thing for comfort: your seat, the noise around you, or the light. Leave the rest alone.'}}
    ],
    wisdom: [
      {key:'check',title:'Check one assumption.',byGoal:{
        faith:'Read the paragraph around the verse. Check whether your first impression fits what the passage actually says.',
        relationships:'Think of one assumption you are making about someone. Choose a respectful question that could check it.',
        work:'Name one uncertain detail in your next decision. Check one relevant source before committing.',
        learning:'Make a prediction about one example, then check the answer. Notice what you would change in your explanation.',
        rest:'Notice whether a task really needs doing now or whether you assumed it did. Let a genuinely non-urgent task wait.'}},
      {key:'question',title:'Ask one clear question.',byGoal:{
        faith:'Choose one question the passage raises. Look at the surrounding chapter, or keep it for someone you trust.',
        relationships:'Ask one open question in your next conversation. Let the answer challenge your first impression.',
        work:'Choose one specific question for a relevant colleague or reliable source. You can prepare it now and ask at a suitable time.',
        learning:'Name the first part you do not understand. Look for one worked example that addresses that part.',
        rest:'Ask yourself what would make this pause easier. Change one small thing you can control.'}}
    ],
    connection: [
      {key:'listen',title:'Give someone room to finish.',byGoal:{
        faith:'Choose someone to listen to with care today. At your next conversation, let them finish before offering advice.',
        relationships:'In your next conversation, let the other person finish before replying. Ask whether they want advice or simply to be heard.',
        work:'In your next exchange with a colleague, hear the full question before proposing a solution.',
        learning:'Invite someone to explain one idea in their own words. Listen to the whole explanation before comparing it with yours.',
        rest:'If company would feel restful, choose someone you can be quiet with. Prepare a low-pressure invitation.'}},
      {key:'offer',title:'Offer one small, welcome help.',byGoal:{
        faith:'Think of someone you could serve in an ordinary way. Ask what would actually be helpful before taking over.',
        relationships:'Ask someone whether one small practical help would be welcome. Let them decide and accept a no.',
        work:'Ask a colleague whether a small clarification or shared resource would help. Keep the offer within your time and role.',
        learning:'Offer to share one useful example with someone learning the same thing. Ask whether they would like it first.',
        rest:'If you would value company, let a trusted person know. A brief message or simply planning one is enough.'}}
    ],
    gratitude: [
      {key:'thank',title:'Give one specific thank-you.',byGoal:{
        faith:'Bring one ordinary good thing to mind and thank God in your own words. There is no need to dismiss the hard parts.',
        relationships:'Say or send one honest sentence of thanks for something specific someone did.',
        work:'Thank someone for one specific contribution, if reaching out is appropriate.',
        learning:'Think of someone or a resource that helped you understand something. Name exactly what was useful; share your thanks if you want.',
        rest:'Notice one ordinary comfort available now. Enjoy it for a moment without needing to make it productive.'}},
      {key:'notice',title:'Notice one good thing you can carry.',byGoal:{
        faith:'Recall one good part of today. Let it sit beside the difficult parts as you return to the passage.',
        relationships:'Recall one kind thing someone did. Let that detail inform the care you bring to your next reply.',
        work:'Notice one part of your work that went usefully. Choose one small condition that made it possible to keep next time.',
        learning:'Recall one thing that is clearer than it was before. Try saying that idea once in your own words.',
        rest:'Rest your attention on one small comfort: a view, a sound, or a comfortable place. Stay only as long as you want.'}}
    ],
    grief: [
      {key:'company',title:'Make room for trusted company.',byGoal:{
        faith:'If it feels right, choose someone you trust to sit or pray with. A short invitation is enough; you do not need to explain everything.',
        relationships:'Let someone safe know you would value their company, if that feels right. You can keep the invitation simple.',
        work:'If useful, prepare one sentence telling a trusted colleague what small support you would welcome. Share only what you want.',
        learning:'If learning feels hard today, choose one trusted person you could ask for a little patience or help.',
        rest:'Choose whether quiet company would feel welcome. If so, prepare a simple invitation to someone you trust.'}},
      {key:'space',title:'Leave a little room for what you feel.',byGoal:{
        faith:'Read the passage slowly without forcing an explanation. You can bring what hurts to prayer without finding perfect words.',
        relationships:'Let one non-urgent reply wait while you pause. You can return when you feel ready.',
        work:'Choose one non-urgent expectation you can reasonably reduce today. Leave a clear stopping point in what you are doing.',
        learning:'Choose a smaller stopping point in your reading or practice. You do not need to turn today into a test.',
        rest:'Find a comfortable place for a quiet moment. Nothing needs to be solved or turned into a lesson.'}}
    ],
    grace: [
      {key:'reply',title:'Make your next reply a little kinder.',byGoal:{
        faith:'Choose one reply you are about to make. Aim for honesty and gentleness together; a boundary can stay clear.',
        relationships:'Before your next reply, remove one unnecessary sharp phrase. Keep what you need to say clear.',
        work:'Read one message before sending it. Make the request clear and remove blame that does not help explain the problem.',
        learning:'When you notice a mistake, name the part to change without insulting yourself. Try that one part again if you want.',
        rest:'Notice the way you are talking to yourself about taking a break. Try one kinder, truthful sentence.'}},
      {key:'pause',title:'Give your response a little room.',byGoal:{
        faith:'Take a moment before your next reply. Bring the tone you want to use into a short prayer, if you wish.',
        relationships:'Let a non-urgent message sit for a moment. Decide what you want the other person to understand before replying.',
        work:'Pause before a non-urgent response. Separate the practical request from frustration before you send it.',
        learning:'Pause over one correction before defending your answer. Notice one useful detail you can take from it.',
        rest:'Let one non-urgent demand wait. Decide later whether it needs a reply, a boundary, or no action.'}}
    ]
  };
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const catalog = Object.entries(themes).flatMap(([theme,items])=>items.map(item=>({...item,theme,id:`scripture-${theme}-${item.key}`})));
  function context(value) {
    value=record(value)?value:{};
    return {
      goal:typeof value.goal==='string'&&Object.hasOwn(goals,value.goal)?value.goal:'faith',
      time:['1','2','5','10',1,2,5,10].includes(value.time)?String(value.time):'2',
      energy:['auto','low','steady','high'].includes(value.energy)?value.energy:'steady',
      environment:['anywhere','quiet','busy','outside','home','work','shared'].includes(value.environment)?value.environment:'anywhere'
    };
  }
  function outcomes(days) {
    if(!record(days))return [];
    return Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).flatMap(([,day])=>{
      const ratings=record(day)&&Array.isArray(day.outcomes)?day.outcomes.filter(outcome=>record(outcome)&&
        catalog.some(item=>item.id===outcome.id)&&['useful','neutral','not-useful','worse'].includes(outcome.rating)):[];
      // Today's rating is editable. Match the app's saved-day normalisation so
      // correcting it has the same result before and after reloading.
      return ratings.filter((outcome,index)=>!ratings.slice(index+1).some(later=>later.id===outcome.id&&later.context?.goal===outcome.context?.goal));
    });
  }
  function recommend(input,days={},excludeId,preferredId) {
    if(!record(input)||typeof input.theme!=='string'||!Object.hasOwn(themes,input.theme)||!choices.includes(input.choice))return null;
    const ctx=context(input), rated=outcomes(days);
    // Earlier days' reports of harm are not overridden by another goal,
    // preferred option, or later usefulness rating. No change is not rejection.
    const avoided=new Set(rated.filter(item=>item.rating==='worse').map(item=>item.id));
    const latest=new Map();
    rated.filter(item=>record(item.context)&&item.context.goal===ctx.goal).forEach(item=>latest.set(item.id,item.rating));
    const pool=catalog.filter(item=>item.theme===input.theme&&item.id!==excludeId&&!avoided.has(item.id)&&latest.get(item.id)!=='not-useful');
    const selected=pool.find(item=>item.id===preferredId)||pool.find(item=>latest.get(item.id)==='useful')||pool[0];
    if(!selected)return null;
    const minutes=Math.min(Number(ctx.time),ctx.energy==='low'?2:5);
    const setup={
      anywhere:'Keep only what you need nearby. You can stay where you are.',
      quiet:'Use the quiet for this one small step. Put unrelated distractions aside.',
      busy:'Choose a natural break. Keep the step small enough for interruptions and private if needed.',
      home:'Keep only what you need nearby. You can stay where you are.',
      work:'Use a natural break and keep any conversation within the time and privacy available.',
      outside:'Stop somewhere safe before reading or sending anything. Keep your surroundings in view.',
      shared:'Keep this private if you prefer. Prepare words silently and choose a suitable moment to share them.'
    }[ctx.environment];
    const pacing=ctx.energy==='low'?'With low energy, preparing the first small part is enough.':ctx.energy==='high'?'Use the energy you have without adding extra tasks.':'Keep it to one small step.';
    const response={practice:'You chose to put the passage into practice.',pause:'You chose to pause and reflect.',pray:'You chose prayer; this is an optional practical follow-through.',sit:'You chose to sit with the passage. There is still no task you have to do.'}[input.choice];
    const rejectedAlternative=catalog.some(item=>item.theme===input.theme&&item.id!==selected.id&&latest.get(item.id)==='not-useful');
    const feedback=latest.get(selected.id)==='useful'?' You previously found this useful for the same life area.':rejectedAlternative?' This uses a different approach from one you said did not help.':'';
    return {
      id:selected.id,theme:input.theme,choice:input.choice,goal:ctx.goal,title:selected.title,
      copy:selected.byGoal[ctx.goal],setup:`${setup} ${pacing} Give it up to ${minutes} ${minutes===1?'minute':'minutes'}; preparing something for later also counts.`,
      reason:`${passageContext[input.theme]} ${response} This editorial suggestion applies that theme to ${goals[ctx.goal]}, within the time and energy you chose. It is not a claim about God’s instruction, and we may not have the full picture.${feedback}`,
      minutes,context:ctx
    };
  }
  function isPlan(value) {
    return record(value)&&catalog.some(item=>item.id===value.id&&item.theme===value.theme)&&choices.includes(value.choice)&&
      typeof value.goal==='string'&&Object.hasOwn(goals,value.goal)&&Number.isFinite(value.minutes)&&value.minutes>0&&value.minutes<=10&&
      ['title','copy','setup','reason'].every(key=>typeof value[key]==='string'&&value[key].trim().length>0);
  }
  const isKnownId = id => typeof id==='string'&&catalog.some(item=>item.id===id);
  return {recommend,context,isPlan,isKnownId};
})();
if(typeof module!=='undefined')module.exports=SteadyScriptureDirection;
