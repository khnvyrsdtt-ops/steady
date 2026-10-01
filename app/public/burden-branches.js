'use strict';

// Burden's tap-first branch flow. Pure data plus small resolvers: categories of
// what people carry, each with three situation follow-ups, then one second
// question about the shape of the problem. Every follow-up phrase is verified
// by tests to resolve through the normal matcher to its listed guide, so taps
// and typed words always agree. Stances only choose the one next step; the
// passage always comes from the curated guide library. No AI, no network.
const SteadyBurdenBranches = (() => {
  const prompts = {
    start: 'What are you carrying today?',
    situation: 'Which is closest?',
    stance: 'Which fits best right now?'
  };
  const stances = [
    {id:'cant-start', label:'I know it, can’t start', expression:'encouraged',
      step:'Pick one tiny start you can do in five minutes. Do only that, then stop.'},
    {id:'dont-know', label:'I don’t know what to do', expression:'listening',
      step:'Write the choice, one fact you know, and one fact you still need. Ask one wise person for one missing fact.'},
    {id:'afraid', label:'I know it, but I’m afraid', expression:'concerned',
      step:'Say the fear in one plain sentence. Ask what is true about it, then take one small safe step.'},
    {id:'happened', label:'Something happened', expression:'concerned',
      step:'Say what happened in one plain sentence. You do not need to fix it or learn from it today.'},
    {id:'thoughts', label:'My thoughts loop', expression:'listening',
      step:'When the loop runs, say: “This is a worry thought.” Then turn to one small present task.'},
    {id:'encourage', label:'I need hope', expression:'encouraged',
      step:'Read the passage once slowly. Keep one kind sentence from it for today.'}
  ];
  const categories = [
    {id:'anxiety', label:'Anxious', followups:[
      {id:'racing', label:'Racing thoughts', text:'My thoughts keep racing and I feel anxious', guide:'anxiety'},
      {id:'sleep', label:'Can’t sleep', text:'I cannot sleep tonight', guide:'exhaustion'},
      {id:'whatif', label:'What-if spirals', text:'I keep thinking, what if it goes wrong', guide:'anxiety'}
    ]},
    {id:'stuck', label:'Stuck', followups:[
      {id:'puttingoff', label:'Putting things off', text:'I’m stuck and putting it off', guide:'starting'},
      {id:'empty', label:'No energy', text:'I’m exhausted and have nothing left', guide:'exhaustion'},
      {id:'circles', label:'Going in circles', text:'I’m stuck going in circles', guide:'starting'}
    ]},
    {id:'guilt', label:'Guilt', followups:[
      {id:'ashamed', label:'Ashamed', text:'I feel ashamed of what I did', guide:'shame'},
      {id:'angry', label:'Angry', text:'I feel angry at myself', guide:'anger'},
      {id:'forgive', label:'Need to forgive', text:'I need to forgive someone', guide:'forgiveness'}
    ]},
    {id:'temptation', label:'Tempted', followups:[
      {id:'pulled', label:'Pulled the wrong way', text:'I’m tempted and I don’t want to be', guide:'temptation'},
      {id:'habit', label:'A bad habit', text:'I keep giving in to a bad habit', guide:'temptation'},
      {id:'intrusive', label:'Unwanted thoughts', text:'Intrusive thoughts leave me tempted daily', guide:'temptation'}
    ]},
    {id:'uncertainty', label:'Uncertain', followups:[
      {id:'big', label:'A big decision', text:'I have a big decision to make', guide:'decisions'},
      {id:'torn', label:'Torn in two', text:'I’m torn and I need wisdom', guide:'decisions'},
      {id:'unclear', label:'Nothing is clear', text:'I’m unsure about everything', guide:'decisions'}
    ]},
    {id:'anger', label:'Angry', followups:[
      {id:'snapping', label:'Snapping at people', text:'I keep snapping at everyone', guide:'anger'},
      {id:'temper', label:'Short temper', text:'I keep losing my temper', guide:'anger'},
      {id:'burning', label:'Burning inside', text:'I’m angry all the time', guide:'anger'}
    ]},
    {id:'loneliness', label:'Lonely', followups:[
      {id:'alone', label:'Alone', text:'I feel so alone', guide:'loneliness'},
      {id:'leftout', label:'Left out', text:'Left out again', guide:'loneliness'},
      {id:'missing', label:'Missing someone', text:'I miss my friend', guide:'loneliness'}
    ]},
    {id:'motivation', label:'Unmotivated', followups:[
      {id:'start', label:'Can’t start', text:'I cannot get started on anything', guide:'starting'},
      {id:'keepgoing', label:'Keep going', text:'I want to keep going', guide:'perseverance'},
      {id:'well', label:'Something went well', text:'Things are going well and I want more', guide:'perseverance'}
    ]},
    {id:'faith', label:'Faith questions', followups:[
      {id:'doubting', label:'Doubting', text:'I’m doubting my faith', guide:'faith_questions'},
      {id:'pray', label:'Can’t pray', text:'I don’t know how to pray', guide:'prayer'},
      {id:'wheregod', label:'Where is God', text:'Where is God in this?', guide:'faith_questions'}
    ]},
    {id:'gratitude', label:'Thankful', followups:[
      {id:'thanks', label:'Thankful', text:'I’m thankful today', guide:'gratitude'},
      {id:'news', label:'Good news', text:'Some good news today', guide:'gratitude'},
      {id:'growing', label:'Growing', text:'I want to grow in faith', guide:'perseverance'}
    ]}
  ];

  function category(id) {
    return categories.find(entry => entry.id === id) || null;
  }

  function resolve(categoryId, followupId) {
    const found = category(categoryId);
    const step = found?.followups.find(entry => entry.id === followupId) || null;
    return step ? { text: step.text, guide: step.guide } : null;
  }

  function stance(id) {
    return stances.find(entry => entry.id === id) || null;
  }

  // Which question to show for a given tap memory. Pure, so tests can pin the
  // 2–4 tap path: categories → situations → stances → answer.
  function stageFor(mode) {
    if (!mode || !mode.category) return 'categories';
    if (!mode.followup) return 'situations';
    return 'stances';
  }

  // Combine a remembered situation with a stance: the words still resolve
  // through the normal matcher (taps and typing agree); the stance only picks
  // the single authored next step shown with the curated passage.
  function resolveWithStance(categoryId, followupId, stanceId) {
    const base = resolve(categoryId, followupId);
    if (!base) return null;
    const found = stanceId ? stance(stanceId) : null;
    return { text: base.text, guide: base.guide, step: found ? found.step : null, stance: found ? found.id : null };
  }

  return { categories, prompts, stances, category, stance, resolve, resolveWithStance, stageFor };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SteadyBurdenBranches;
