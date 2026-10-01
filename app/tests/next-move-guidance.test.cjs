'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../public/guidance.js');
const conditions=current=>G.context({goal:'work'},current);
const pair=(need,ctx,days={})=>{const first=G.recommend(need,ctx,days);return [first,G.recommend(need,ctx,days,first.id)];};

test('blockers belong to the current check-in and cannot leak from saved preferences into a new day',()=>{
  const profile=Object.freeze({goal:'work',blocker:'hesitation',need:'progress',mood:'overwhelmed'});
  assert.equal(G.context(profile).blocker,'none');
  assert.equal(G.context(profile,{}).blocker,'none');
  assert.equal(G.context(profile,{blocker:'size'}).blocker,'size');
  assert.equal(G.context(profile,{blocker:'constructor'}).blocker,'none');
  for(const blocker of Object.keys(G.choices.blocker)){
    const ctx=G.context(profile,{blocker});
    assert.equal(G.recommend('progress',ctx,{}).context.blocker,blocker);
  }
  assert.equal(profile.blocker,'hesitation');
});

test('both ways into a work task perform work now, with different entry points',()=>{
  const [first,other]=pair('progress',conditions({}));
  assert.equal(first.id,'progress-start');assert.equal(other.id,'progress-plan');
  assert.match(first.copy,/Do its first manageable part/);
  assert.match(other.copy,/Correct one clear detail/);
  for(const step of [first,other])assert.doesNotMatch(step.copy,/if.then|make a plan|choose a.*moment|will begin/i);
  assert.notEqual(first.copy,other.copy);
});

test('a large task, low energy, interruptions and hesitation get concretely different work actions',()=>{
  const cases=Object.fromEntries(Object.keys(G.choices.blocker).map(blocker=>[blocker,pair('progress',conditions({blocker,time:'5'}))]));
  for(const index of [0,1])assert.equal(new Set(Object.values(cases).map(steps=>steps[index].copy)).size,5);
  assert.match(cases.size[0].copy,/one sentence, one row or one item/);
  assert.match(cases.energy[0].copy,/one rough line/);
  assert.match(cases.interruptions[0].copy,/If interrupted.*visible mark/);
  assert.match(cases.hesitation[0].copy,/first attempt.*fixing or polishing.*later/);
  assert.match(cases.hesitation[1].copy,/familiar way.*improving.*wait/);
  for(const [blocker,steps]of Object.entries(cases))for(const step of steps){assert.equal(step.context.blocker,blocker);assert.ok(step.fitReason);}
});

test('goals change both concrete approaches, including familiar habits rather than more preparation',()=>{
  const examples={work:/file|task|work|sentence/i,learning:/Recall|example|practice/,home:/things|surface|patch/,money:/bill|expense|receipt|record/,creativity:/sketch|idea|variation/,habits:/Do|do.*repetition/};
  for(const [goal,match]of Object.entries(examples)){
    const steps=pair('progress',G.context({goal}));
    for(const step of steps)assert.match(step.copy,match,goal+' '+step.id);
    assert.notEqual(steps[0].copy,steps[1].copy,goal);
  }
  for(const step of pair('progress',G.context({goal:'habits'})))assert.doesNotMatch(step.copy,/Set up|Put what you need|will do/);
  for(const goal of Object.keys(G.choices.goal).filter(value=>value!=='faith'))for(const step of pair('progress',G.context({goal})))assert.doesNotMatch(step.copy,/scripture|pray|Christ/i);
  assert.match(pair('progress',G.context({goal:'faith'}))[0].copy,/scripture/);
});

test('low energy reduces the work itself, and a busy place changes the action rather than only its setup',()=>{
  const steady=G.recommend('progress',G.context({goal:'home'},{energy:'steady',time:'10'}),{});
  const low=G.recommend('progress',G.context({goal:'home'},{energy:'low',time:'10'}),{});
  assert.match(steady.copy,/three/);assert.match(low.copy,/one easy-to-reach item/);
  assert.equal(low.minutes,2);assert.notEqual(low.copy,steady.copy);
  for(const step of pair('progress',conditions({environment:'busy',energy:'low',time:'10'}))){
    assert.match(step.copy,/If interrupted.*visible mark/);assert.match(step.copy,/one rough line|one typo/);assert.equal(step.minutes,2);
    assert.equal(step.variant,'energy-interruptions');
  }
});

test('high-energy growth uses the chosen ten minutes to make or improve useful work',()=>{
  for(const [index,step]of pair('grow',conditions({energy:'high',time:'10'})).entries()){
    assert.equal(step.minutes,10);assert.equal(step.variant,'stretch');
    assert.match(step.copy,index===0?/Draft or complete one useful section/:/If it does not exist yet, make a rough first version/);
    assert.match(step.copy,/Use the 10 minutes you chose/);
    assert.doesNotMatch(step.copy,/rest|pause|if.then|later moment/i);
    assert.match(step.fitReason,/plenty of energy and 10 minutes/);
  }
  const busy=G.recommend('grow',conditions({energy:'high',time:'10',environment:'busy'}),{});
  assert.equal(busy.minutes,10);assert.match(busy.copy,/mark your place.*interrupted/);
  const low=G.recommend('grow',conditions({energy:'high',time:'10',blocker:'energy'}),{});
  assert.equal(low.minutes,2);assert.doesNotMatch(low.variant,/stretch/);
  const ready=G.recommend('grow',conditions({time:'10'}),{});
  assert.equal(ready.minutes,10);assert.equal(ready.variant,'stretch');
  assert.match(ready.copy,/Draft or complete one useful section/);
  assert.doesNotMatch(ready.fitReason,/plenty of energy/,'an automatic setting must not invent an explicit energy report');
});

test('growth does not invent previous progress, a helpful routine or an ongoing project from readiness alone',()=>{
  for(const goal of Object.keys(G.choices.goal))for(const energy of ['auto','high'])for(const step of pair('grow',G.context({goal},{energy,time:'10'}))){
    const visible=[step.title,step.copy,step.fitReason].join(' ');
    assert.doesNotMatch(visible,/already underway|already helping you|already studying|working for you|have been improving|your current progress|you have been studying|already using|already practising/);
    assert.equal(step.minutes,10);
    assert.match(step.fitReason,/room for a fuller useful action/);
  }
});

test('ordinary two- and five-minute growth builds or improves a useful part without housekeeping preparation',()=>{
  for(const time of ['2','5'])for(const step of pair('grow',G.context({}, {time}))){
    assert.equal(step.minutes,Number(time));
    assert.match(step.copy,/Do|Complete/);
    assert.doesNotMatch(step.copy,/unused tab|distracting item|choose.*moment|if.then/i);
  }
});

test('uncertainty about direction has two distinct decision approaches rather than task-starting obstacles',()=>{
  const [facts,options]=pair('clarity',conditions({blocker:'hesitation'}));
  assert.match(facts.copy,/what you know.*assuming.*missing fact/);
  assert.match(options.copy,/two possible directions.*choice needs to protect/);
  for(const step of [facts,options]){
    assert.doesNotMatch(step.copy,/Put just the thing|first attempt|first unfinished part|starting easier/);
  }
  assert.equal(facts.variant,'base');assert.equal(options.variant,'direction');
  assert.notEqual(facts.copy,options.copy);
  assert.notEqual(G.recommend('clarity',G.context({goal:'money'}),{}).copy,facts.copy);
});

test('the visible explanation is a concise sentence justified by actual choices',()=>{
  for(const need of ['progress','grow','clarity','calm','energy','rest','connection','explore'])for(const blocker of Object.keys(G.choices.blocker)){
    const step=G.recommend(need,conditions({blocker}),{});
    assert.equal((step.fitReason.match(/[.!?](?:\s|$)/g)||[]).length,1,step.fitReason);
    assert.ok(step.fitReason.length<160,step.fitReason);
    assert.doesNotMatch(step.fitReason,/You feel|You are anxious|Your personality|diagnos|guarantee/);
  }
  assert.doesNotMatch(G.recommend('rest',G.context(),{}).fitReason,/You chose low energy/);
});

test('feedback from similar real conditions carries more weight than unrelated conditions or goal-only history',()=>{
  const current=conditions({energy:'high',environment:'quiet',time:'10'});
  const other=conditions({energy:'auto',environment:'outside',time:'1'});
  const days={
    '2026-09-20':{outcomes:[{id:'progress-start',rating:'useful',context:{goal:'work'}}]},
    '2026-09-21':{outcomes:[{id:'progress-start',rating:'useful',context:other}]},
    '2026-09-22':{outcomes:[{id:'progress-plan',variant:'doing',rating:'useful',context:current}]}
  };
  assert.equal(G.recommend('progress',current,days).id,'progress-plan');
  assert.equal(G.recommend('progress',other,days).id,'progress-start');
});

test('legacy goal-only ratings still guide base steps without rating a new blocker adaptation',()=>{
  const days={'2026-09-20':{outcomes:[{id:'calm-notice',rating:'useful',context:{goal:'work'}},{id:'progress-plan',rating:'useful',context:{goal:'work'}}]}};
  assert.equal(G.recommend('calm',conditions({}),days).id,'calm-notice','unchanged legacy activities still use goal-only history');
  assert.equal(G.recommend('progress',conditions({}),days).id,'progress-start','old planning feedback must not rate a new doing action');
  assert.equal(G.recommend('progress',conditions({blocker:'size'}),days).id,'progress-start');
  const size=G.recommend('progress',conditions({blocker:'size'}),{},'progress-start');
  days['2026-09-21']={outcomes:[{id:size.id,variant:size.variant,rating:'useful',context:size.context}]};
  assert.equal(G.recommend('progress',conditions({blocker:'size'}),days).id,'progress-plan');
  assert.equal(G.recommend('progress',conditions({blocker:'hesitation'}),days).id,'progress-start');
});

test('repurposed IDs never inherit a legacy planning or preparation completion or useful rating',()=>{
  const cases=[['progress','work','progress-plan','doing'],['grow','work','grow-cue','doing'],['clarity','work','clarity-prepare','direction'],['grow','general','grow-build','doing'],['progress','habits','progress-start','doing'],['progress','health','progress-start','doing'],['progress','thinking','progress-start','doing']];
  for(const [need,goal,id,variant]of cases){
    const ctx=G.context({goal}),legacy={id,context:ctx,rating:'useful'};
    const plan=G.recommend(need,ctx,{'2026-09-20':{outcomes:[legacy]}},undefined,id);
    assert.equal(plan.id,id);assert.equal(plan.variant,variant);
    assert.notEqual(G.feedbackKey(plan),G.feedbackKey(legacy),id+' '+goal+' completion identity must be new');
    assert.doesNotMatch(plan.reason,/previously marked this useful/,id+' '+goal);
    assert.equal(plan.recall,undefined,id+' '+goal+' must not claim a memory it does not have');
    const updated={...legacy,variant};
    const rated=G.recommend(need,ctx,{'2026-09-20':{outcomes:[legacy,updated]}},undefined,id);
    // The acknowledgement is now the visible recall line rather than the audit
    // text, so the same fact is still owed to the user exactly once.
    assert.match(rated.recall,/worked for you/i,id+' '+goal);
    assert.doesNotMatch(rated.reason,/previously marked this useful/,id+' '+goal);
    assert.equal(G.outcomes({'2026-09-20':{outcomes:[legacy,updated]}}).length,2,'keep legacy and new ratings independently');
  }
  for(const [need,id]of [['progress','progress-start'],['grow','grow-build']]){
    const ctx=G.context({goal:'work'}),legacy={id,context:ctx,rating:'useful'};
    const plan=G.recommend(need,ctx,{'2026-09-20':{outcomes:[legacy]}});
    assert.equal(plan.id,id);assert.equal(plan.variant,'base');assert.equal(G.feedbackKey(plan),G.feedbackKey(legacy));
    assert.match(plan.recall,/worked for you/i);
  }
});

test('made-worse feedback excludes an ID across variants and two excluded approaches produce an honest own-step fallback',()=>{
  const ctx=conditions({blocker:'size'}),days={'2026-09-20':{outcomes:[{id:'progress-start',rating:'worse',variant:'energy',context:conditions({goal:'home',blocker:'energy'})}]}};
  assert.equal(G.recommend('progress',ctx,days,undefined,'progress-start').id,'progress-plan');
  days['2026-09-21']={outcomes:[{id:'progress-plan',rating:'worse',context:{goal:'home'}}]};
  const fallback=G.recommend('progress',ctx,days);
  assert.equal(fallback.id,'progress-own');assert.match(fallback.reason,/made things worse/);assert.match(fallback.fitReason,/left out/);
});

test('feedback identity keeps blocker variants separate while corrected feedback replaces only the same variant',()=>{
  const ctx=conditions({});
  assert.equal(G.feedbackKey({id:'progress-start',context:ctx}),G.feedbackKey({id:'progress-start',context:ctx,variant:'base'}));
  assert.notEqual(G.feedbackKey({id:'progress-start',context:ctx,variant:'size'}),G.feedbackKey({id:'progress-start',context:ctx,variant:'energy'}));
  const rows=G.outcomes({'2026-09-25':{outcomes:[
    {id:'progress-start',context:ctx,rating:'useful'},
    {id:'progress-start',context:ctx,variant:'size',rating:'not-useful'},
    {id:'progress-start',context:ctx,variant:'energy',rating:'useful'},
    {id:'progress-start',context:ctx,variant:'size',rating:'neutral'}
  ]}});
  assert.equal(rows.length,3);assert.equal(rows.find(row=>row.variant==='size').rating,'neutral');
  for(const input of [null,undefined,[],{}, {id:{},variant:{toString:null},context:null}])assert.doesNotThrow(()=>G.feedbackKey(input));
});

test('completed adapted actions count separately without doubling legacy goal or base completions',()=>{
  const result=G.progress({'2026-09-25':{completedNeeds:['progress'],actionLog:[
    {id:'progress-start'},
    {id:'progress-start',goal:'work'},
    {id:'progress-start',goal:'work',variant:'base'},
    {id:'progress-start',goal:'work',variant:'size'},
    {id:'progress-start',goal:'work',variant:'size'},
    {id:'progress-start',goal:'work',variant:'energy'}
  ]}});
  assert.equal(result.actions,3);
  const legacyAndNew=G.progress({'2026-09-25':{completedNeeds:['progress'],actionLog:[{id:'progress-start',goal:'work',variant:'size'}]}});
  assert.equal(legacyAndNew.actions,2,'an adapted completion cannot erase a legacy base completion');
});

test('variants change with the actual approach, preserve a chosen alternative and never mutate saved inputs',()=>{
  const profile=Object.freeze({goal:'work'}),today=Object.freeze({blocker:'size',time:'5',energy:'steady'});
  const ctx=G.context(profile,today),before=JSON.stringify({profile,today,catalog:G.catalog});
  const chosen=G.recommend('progress',ctx,{},'progress-start');
  const changed=G.recommend('progress',G.context(profile,{...today,blocker:'hesitation'}),{},undefined,chosen.id);
  assert.equal(changed.id,chosen.id);assert.notEqual(changed.variant,chosen.variant);assert.notEqual(changed.copy,chosen.copy);
  const shorter=G.recommend('progress',G.context(profile,{...today,time:'1'}),{},undefined,chosen.id);
  assert.equal(shorter.variant,chosen.variant);assert.equal(shorter.minutes,1);
  assert.equal(JSON.stringify({profile,today,catalog:G.catalog}),before);
});

test('Steady says plainly what it remembers, and only when the record supports it',()=>{
  const ctx=G.context({goal:'work'});
  // No history at all: nothing to claim.
  assert.equal(G.recommend('progress',ctx,{}).recall,undefined);

  // A real "useful" rating for this goal reaches the visible line.
  const helped=G.recommend('progress',ctx,{'2026-09-20':{outcomes:[{id:'progress-start',rating:'useful',variant:'base',context:G.context({goal:'work'})}]}});
  assert.match(helped.recall,/worked for you/i);

  // Two real "useful" ratings are counted, not rounded to "always works".
  const twice=G.recommend('progress',ctx,{
    '2026-09-19':{outcomes:[{id:'progress-start',rating:'useful',variant:'base',context:G.context({goal:'work'})}]},
    '2026-09-20':{outcomes:[{id:'progress-start',rating:'useful',variant:'base',context:G.context({goal:'work'})}]},
  });
  assert.match(twice.recall,/2 times before/);

  // A rating recorded for a different goal is not a memory about this one.
  const otherGoal=G.recommend('progress',ctx,{'2026-09-20':{outcomes:[{id:'progress-start',rating:'useful',variant:'base',context:G.context({goal:'home'})}]}});
  assert.doesNotMatch(otherGoal.recall||'',/worked for you/i);

  // Unhelpful-but-not-worse stays on offer, and is admitted rather than hidden.
  const sized=G.context({goal:'work'},{blocker:'size'});
  const firstPick=G.recommend('progress',sized,{});
  const known=G.recommend('progress',sized,{},undefined,'progress-plan');
  const unhelpful=G.recommend('progress',sized,{'2026-09-20':{outcomes:[{id:'progress-plan',rating:'not-useful',variant:known.variant,context:sized}]}},undefined,'progress-plan');
  assert.equal(unhelpful.id,'progress-plan');
  assert.match(unhelpful.recall,/did not help last time/i);
  assert.equal(firstPick.recall,undefined);

  // Made-worse is reported as an exclusion, and the step shown is never the
  // excluded one -- the claim and the choice must agree.
  const days={'2026-09-20':{outcomes:[{id:'progress-start',rating:'worse',variant:'base',context:G.context({goal:'work'})}]}};
  const after=G.recommend('progress',ctx,days);
  assert.notEqual(after.id,'progress-start');
  assert.match(after.recall,/left out/i);

  // The fact is owed once, not twice: the audit text must not repeat the line.
  assert.doesNotMatch(after.reason,/made things worse has been excluded/);
  assert.doesNotMatch(helped.reason,/previously marked this useful/);
});
