const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../public/guidance.js');
test('defaults require no setup and reject unknown stored options',()=>{assert.deepEqual(G.context(),G.defaults);assert.equal(G.context({time:'999',goal:'unknown'}).time,'2');assert.equal(G.context({goal:'learning'}).goal,'learning');});
test('malformed stored choices cannot be coerced into valid preferences or crash guidance',()=>{
  for(const value of [null,[],{},Object.create(null),{toString:null}]){
    for(const key of Object.keys(G.defaults))assert.deepEqual(G.context({[key]:value}),G.defaults);
    assert.equal(G.scripture(null,{goal:value},value).key,'foundation');
  }
  assert.equal(G.context({time:5}).time,'5');
  assert.deepEqual(G.context(['work'], 'rest'),G.defaults);
});
test('a starting suggestion needs no setup and follows a saved priority',()=>{
  assert.equal(G.startingNeed(),'grow');
  for(const [priority,need] of Object.entries({build:'grow',explore:'explore',decide:'clarity',restore:'rest'}))assert.equal(G.startingNeed({priority}),need);
  assert.equal(G.startingNeed({priority:'unknown'},'unknown'),'grow');
  assert.equal(G.startingNeed(null,'toString'),'grow');
});
test('today’s explicit check-in takes precedence over every saved priority',()=>{
  for(const currentNeed of new Set(G.catalog.map(item=>item.need)))for(const priority of Object.keys(G.choices.priority))assert.equal(G.startingNeed({priority},currentNeed),currentNeed);
});
test('starting suggestions do not carry old moods or energy into a new day',()=>{
  const profile=Object.freeze({priority:'explore',need:'rest',mood:'tired',energy:'low'});
  assert.equal(G.startingNeed(profile),'explore');
  assert.equal(profile.need,'rest');
  assert.equal(G.startingNeed({priority:'decide'},''),'clarity');
});
test('a low energy recommendation respects available time and surroundings',()=>{const p=G.recommend('progress',G.context({goal:'learning'},{time:'10',energy:'low',environment:'busy'}),{});assert.equal(p.minutes,2);assert.match(p.copy,/Recall/);assert.match(p.setup,/interruptions/);assert.match(p.approach,/smaller/);assert.equal(G.recommend('rest',G.context({time:'1'}),{}).minutes,1);});
test('the first suggestion performs a useful piece of work without extra setup',()=>{
  const p=G.recommend(G.startingNeed(),G.context(),{});
  assert.equal(p.title,'Make one useful piece.');
  assert.match(p.copy,/Start or continue a task.*Do its next small, visible part/);
  assert.doesNotMatch(p.copy,/Close one unused tab|distracting item aside/);
  assert.doesNotMatch(p.copy,/choose.*(?:goal|step|project)/i);
  assert.equal(p.minutes,2);
  assert.equal(p.evidence,'experiment');
  assert.match(G.recommend('clarity',G.context(),{}).copy,/decision/);
  assert.match(G.recommend('progress',G.context(),{}).copy,/first unfinished part/);
});
test('saved goals personalise the visible title as well as the action',()=>{
  const catalogBefore=JSON.stringify(G.catalog);
  for(const need of ['grow','progress']){
    const general=G.recommend(need,G.context(),{});
    const titles=new Set();
    for(const goal of Object.keys(G.choices.goal).filter(goal=>goal!=='general')){
      const p=G.recommend(need,G.context({goal}),{});
      assert.notEqual(p.title,general.title,`${need}: ${goal} should be visible before opening the card`);
      assert.notEqual(p.copy,general.copy);
      assert.ok(G.evidence[p.evidence]);
      titles.add(p.title);
    }
    assert.equal(titles.size,Object.keys(G.choices.goal).length-1);
  }
  assert.equal(JSON.stringify(G.catalog),catalogBefore);
  assert.equal(G.recommend('progress',G.context({goal:'learning'}),{}).evidence,'retrieval');
  assert.equal(G.recommend('clarity',G.context({goal:'habits'}),{}).evidence,'experiment');
  assert.equal(G.recommend('progress',G.context({goal:'relationships'}),{}).evidence,'experiment');
});
test('adjusting conditions preserves an eligible approach the person already chose',()=>{
  const c=G.context({goal:'work'});
  const first=G.recommend('grow',c,{});
  const chosen=G.recommend('grow',c,{},first.id);
  const adjusted=G.recommend('grow',G.context(c,{time:'1',environment:'busy'}),{},undefined,chosen.id);
  assert.equal(adjusted.id,chosen.id);
  assert.equal(adjusted.minutes,1);
  assert.equal(adjusted.context.environment,'busy');
  assert.match(adjusted.setup,/interruptions/);
  assert.equal(G.recommend('grow',c,{}).id,first.id);
  const days={a:{outcomes:[{id:chosen.id,rating:'not-useful',context:c}]}};
  assert.doesNotMatch(G.recommend('grow',c,days,undefined,chosen.id).reason,/different approach/);
});
test('a preferred approach cannot bypass eligibility or made-worse feedback',()=>{
  const c=G.context();
  const ranked=G.recommend('grow',c,{});
  for(const preferred of ['missing','toString','rest-stop',null,{}])assert.equal(G.recommend('grow',c,{},undefined,preferred).id,ranked.id);
  assert.equal(G.recommend('grow',c,{},'grow-cue','grow-cue').id,'grow-build');
  const days={a:{outcomes:[{id:'grow-cue',rating:'worse',context:c}]}};
  assert.equal(G.recommend('grow',c,days,undefined,'grow-cue').id,'grow-build');
  days.a.outcomes.push({id:'grow-build',rating:'worse',context:c});
  assert.equal(G.recommend('grow',c,days,undefined,'grow-build').id,'grow-own');
});
test('negative feedback changes a future recommendation for the same goal',()=>{const c=G.context();const first=G.recommend('calm',c,{});const days={'2026-09-20':{outcomes:[{id:first.id,rating:'not-useful',context:c}]}};assert.notEqual(G.recommend('calm',c,days).id,first.id);assert.equal(G.recommend('calm',G.context({goal:'work'}),days).id,first.id);});
test('positive feedback keeps a useful alternative in future suggestions',()=>{const c=G.context();const a=G.recommend('clarity',c,{});const b=G.recommend('clarity',c,{},a.id);assert.notEqual(a.id,b.id);assert.equal(G.recommend('clarity',c,{x:{outcomes:[{id:b.id,variant:b.variant,rating:'useful',context:c}]}}).id,b.id);});
test('no change stays neutral and a corrected rating replaces earlier negative feedback',()=>{
  const c=G.context(),first=G.recommend('grow',c,{});
  const neutral={a:{outcomes:[{id:first.id,rating:'neutral',context:c}]}};
  assert.equal(G.recommend('grow',c,neutral).id,first.id);
  const corrected={a:{outcomes:[{id:first.id,rating:'not-useful',context:c},{id:first.id,rating:'neutral',context:c}]}};
  assert.equal(G.recommend('grow',c,corrected).id,first.id);
  assert.equal(G.outcomes(corrected).length,1);
});
test('scripture uses entries, respects explicit theme, and has a foundation fallback',()=>{const c=G.context();assert.equal(G.scripture({},c).key,'foundation');assert.equal(G.scripture({need:'progress',mind:'I am grieving a loss'},c).key,'grief');assert.equal(G.scripture({tasks:[{text:'Forgive my friend'}]},c).key,'connection');assert.equal(G.scripture({mind:'I am tired'},c,'grace').key,'grace');assert.equal(G.scripture({reflections:['I need rest']},c).key,'rest');});
test('scripture explains the word that connected an entry to its verse',()=>{const result=G.scripture({mind:'I feel exhausted and worried'},G.context());assert.equal(result.key,'rest');assert.match(result.reason,/“exhausted”/);assert.match(G.scripture({},G.context()).reason,/current choices/);});
test('progress counts meaningful completions rather than visits or rejected suggestions',()=>{const d={'2026-09-21':{tasks:[{complete:true},{complete:false}],completedNeeds:['rest'],actionLog:[{id:'progress-start'}],practice:{'memory-chunk':{correct:true}},reflection:'I noticed grace today',outcomes:[{id:'progress-start',rating:'useful'}]},'2026-09-22':{tasks:[]}};const p=G.progress(d);assert.equal(p.actions,3);assert.equal(p.practice,1);assert.equal(p.reflections,1);assert.equal(p.useful,1);assert.equal(p.rows.length,1);});
test('empty visits, invalid closing flags and blank reflection fields do not create history rows',()=>{
  const p=G.progress({
    '2026-09-20':{},
    '2026-09-21':{closed:'true'},
    '2026-09-22':{closed:false,reflection:' \n\t ',reflections:['', '  ', null, false, {}]},
    '2026-09-23':{mind:'  ',tasks:[],actionLog:[],practice:{}},
    '2026-09-24':{scriptureReflection:{theme:'wisdom',choice:'unknown'}},
    '2026-09-25':{scriptureReflection:{theme:'constructor',choice:'practice'}}
  });
  assert.deepEqual(p.rows,[]);
  assert.equal(p.actions,0);assert.equal(p.practice,0);assert.equal(p.reflections,0);
});
test('explicitly closed days remain reachable without counting as reflections or completions',()=>{
  const p=G.progress({
    '2026-09-20':{closed:true},
    '2026-09-21':{closed:true,reflection:' \n ',reflections:[],tasks:[]},
    '2026-09-22':{}
  });
  assert.deepEqual(p.rows.map(row=>row.date),['2026-09-21','2026-09-20']);
  assert.ok(p.rows.every(row=>row.closed&&!row.reflection&&row.planned===0));
  assert.equal(p.actions,0);assert.equal(p.practice,0);assert.equal(p.reflections,0);
});
test('unfinished tasks stay in their original day and visible history without creating completions',()=>{
  const days={
    '2026-09-26':{tasks:[{id:'call-mum',text:'Call Mum',complete:false}]},
    '2026-09-27':{tasks:[]}
  };
  const before=JSON.stringify(days),p=G.progress(days);
  assert.deepEqual(p.rows.map(row=>row.date),['2026-09-26']);
  assert.equal(p.rows[0].planned,1);assert.equal(p.rows[0].actions,0);
  assert.equal(p.rows[0].closed,false);assert.equal(p.rows[0].reflection,false);
  assert.equal(p.actions,0);assert.equal(p.reflections,0);assert.equal(p.practice,0);
  assert.equal(JSON.stringify(days),before,'reading the record does not move or change tasks');
});
test('planned counts ignore blank or malformed tasks and deduplicate valid task identities',()=>{
  const p=G.progress({'2026-09-26':{tasks:[
    {id:'a',text:'Call Mum',complete:false},
    {id:'a',text:'Call Mum',complete:false},
    {text:'Email a friend'},
    {id:'index:2',text:'Read a chapter'},
    {text:'Take a walk',complete:'false'},
    {id:'done',text:'Drink water',complete:true},
    null,{},[],{text:7},{text:'  ',complete:false}
  ]},'2026-09-27':{tasks:[null,{},[],{text:7},{text:' \n '}]}});
  assert.deepEqual(p.rows.map(row=>row.date),['2026-09-26']);
  assert.equal(p.rows[0].planned,4);
  assert.equal(p.rows[0].actions,1);assert.equal(p.actions,1);
  assert.equal(p.reflections,0);
});
test('actual written, selected and Scripture reflections each preserve one reflected day',()=>{
  const p=G.progress({
    '2026-09-20':{reflection:'  I noticed patience today.  '},
    '2026-09-21':{reflections:['',null,'  I need rest  ']},
    '2026-09-22':{scriptureReflection:{theme:'wisdom',choice:'sit'}},
    '2026-09-23':{closed:true,reflection:'Something helped.',reflections:['I found clarity'],scriptureReflection:{theme:'foundation',choice:'practice'}},
    '2026-09-24':{closed:true,reflection:' ',reflections:[]}
  });
  assert.deepEqual(p.rows.map(row=>row.date),['2026-09-24','2026-09-23','2026-09-22','2026-09-21','2026-09-20']);
  assert.equal(p.rows[0].reflection,false);assert.ok(p.rows.slice(1).every(row=>row.reflection));assert.equal(p.reflections,4);
  assert.equal(p.actions,0);assert.equal(p.practice,0);
});
test('completed actions and practice remain visible without manufacturing a reflection',()=>{
  const p=G.progress({
    '2026-09-20':{closed:true,actionLog:[{id:'rest-stop'}]},
    '2026-09-21':{closed:true,practice:{'memory-chunk':{correct:false}},reflection:' '}
  });
  assert.equal(p.rows.length,2);assert.equal(p.actions,1);assert.equal(p.practice,1);
  assert.equal(p.reflections,0);assert.ok(p.rows.every(row=>!row.reflection));
});
test('growth and exploration personalise real actions across new life areas',()=>{const c=G.context({goal:'creativity'});const p=G.recommend('grow',c,{});assert.match(p.copy,/sketch/);assert.match(p.setup,/within reach/);assert.match(p.preparation,/materials/);assert.match(G.recommend('explore',G.context({goal:'hobbies'}),{}).copy,/hobbies/);});
test('made-worse feedback excludes the approach even for a different goal',()=>{const c=G.context();const days={a:{outcomes:[{id:'grow-build',rating:'worse',context:c}]}};assert.equal(G.recommend('grow',G.context({goal:'work'}),days).id,'grow-cue');days.a.outcomes.push({id:'grow-cue',rating:'worse',context:c});assert.equal(G.recommend('grow',c,days).id,'grow-own');});
test('a different check-in does not repeat a goal-specific activity that made things worse',()=>{
  const c=G.context({goal:'learning'}),days={a:{outcomes:[{id:'grow-build',rating:'worse',context:c}]}};
  assert.equal(G.recommend('progress',c,days,undefined,'progress-start').id,'progress-plan');
  // Decision support now checks assumptions rather than repeating the learning
  // activity, so adverse feedback about the activity does not remove it.
  assert.equal(G.recommend('clarity',c,days).id,'clarity-one');
  assert.equal(G.recommend('progress',G.context({goal:'home'}),days).id,'progress-start');
});
test('requesting an unavailable alternative does not invent adverse feedback',()=>{const c=G.context();const days={a:{outcomes:[{id:'grow-build',rating:'worse',context:c}]}};const own=G.recommend('grow',c,days,'grow-cue');assert.equal(own.id,'grow-own');assert.match(own.reason,/no other available approach/);assert.doesNotMatch(own.reason,/available approaches made things worse/);});
test('feedback uses the latest eight days regardless of stored insertion order',()=>{const c=G.context();const days={'2026-09-30':{outcomes:[{id:'calm-pause',rating:'not-useful',context:c}]}};for(let date=21;date<=29;date++)days[`2026-09-${date}`]={outcomes:[{id:'calm-pause',rating:date===21?'useful':'neutral',context:c}]};assert.equal(G.recommend('calm',c,days).id,'calm-notice');});
test('progress ignores invalid rows and counts each completed action once',()=>{const p=G.progress({'2026-09-23':{tasks:[null,{id:'a',complete:true},{id:'a',complete:true},{complete:'false'}],actionLog:[null,{id:'rest-stop'},{id:'rest-stop'}],completedNeeds:['rest','rest','unknown'],practice:{bad:null,valid:{correct:false}},outcomes:[null,{id:'rest-stop',rating:'useful'},{id:'rest-stop',rating:'neutral'}]}});assert.equal(p.actions,2);assert.equal(p.practice,1);assert.equal(p.ratings,1);assert.equal(p.useful,0);});
test('different goal-specific actions count separately without doubling legacy completions',()=>{
  const p=G.progress({'2026-09-24':{actionLog:[
    {id:'grow-build'},
    {id:'grow-build',goal:'work'},
    {id:'grow-build',goal:'work'},
    {id:'grow-build',goal:'learning'},
    {id:'rest-stop',goal:{toString:null}},
    {id:'rest-stop'},
    {id:'scripture-rest-set-down:rest',goal:'rest'},
    {id:'scripture-rest-set-down:rest',goal:'rest'}
  ],completedNeeds:['grow','rest']}});
  assert.equal(p.actions,4);assert.equal(p.rows[0].actions,4);
});
test('progress rejects impossible calendar dates instead of displaying them as a different day',()=>{
  const p=G.progress({
    '2026-02-29':{reflection:'Invalid leap day'},
    '2026-02-31':{actionLog:[{id:'rest-stop'}]},
    '2026-13-01':{reflection:'Invalid month'},
    '2026-00-01':{reflection:'Invalid month'},
    '2026-09-00':{reflection:'Invalid day'},
    '2024-02-29':{reflection:'Valid leap day'},
    '2026-09-24':{reflection:'Valid day'}
  });
  assert.deepEqual(p.rows.map(row=>row.date),['2026-09-24','2024-02-29']);
  assert.equal(p.actions,0);assert.equal(p.reflections,2);
});
test('invalid optional values cannot corrupt recommendations, scripture or review dates',()=>{assert.equal(G.recommend('grow',{time:'invalid'},{}).minutes,2);assert.equal(G.scripture({tasks:[null],reflections:{}},G.context()).key,'foundation');});
test('the small scripture library includes full chapter context in both translations',()=>{const fs=require('node:fs'),vm=require('node:vm');const library=vm.runInNewContext(fs.readFileSync(require.resolve('../public/chapters.js'),'utf8')+';ScriptureChapters');for(const chapter of Object.values(library)){for(const language of ['web','asv']){const verses=chapter.translations[language];assert.ok(verses.length>5);assert.ok(verses.some(v=>v.number===chapter.focus));assert.equal(verses[0].number,1);assert.equal(new Set(verses.map(v=>v.number)).size,verses.length);}}});

test('scripture recognises worried without interpreting negated anger as anger',()=>{assert.equal(G.scripture({mind:'I feel worried'},G.context()).key,'rest');assert.notEqual(G.scripture({mind:'I am not angry'},G.context()).key,'grace');});

test('every selected verse exactly matches its complete chapter and publisher reference',()=>{
  const fs=require('node:fs'),vm=require('node:vm');
  const load=(file,name)=>vm.runInNewContext(fs.readFileSync(require.resolve('../public/'+file),'utf8')+';'+name);
  const chapters=load('chapters.js','ScriptureChapters'),passages=load('scriptures.js','ScriptureLibrary');
  const counts={foundation:29,rest:30,wisdom:27,connection:18,gratitude:28,grief:22,grace:32};
  assert.deepEqual(Object.keys(passages),Object.keys(G.themes));
  for(const [theme,passage]of Object.entries(passages)){
    const chapter=chapters[theme];
    assert.equal(passage.reference,chapter.reference+':'+chapter.focus);
    for(const translation of ['web','asv']){
      const verses=chapter.translations[translation];
      assert.equal(verses.length,counts[theme]);
      verses.forEach((verse,index)=>{assert.equal(verse.number,index+1);assert.equal(typeof verse.text,'string');assert.ok(verse.text.trim());});
      assert.equal(passage.translations[translation].text,verses.find(verse=>verse.number===chapter.focus).text);
      assert.equal(passage.translations[translation].source,chapter.sources[translation]+'#V'+chapter.focus);
    }
  }
});

test('private note-only days remain reachable without counting as actions or reflections',()=>{
  const p=G.progress({'2026-09-25':{mind:'Something to remember'}});
  assert.equal(p.rows.length,1);assert.equal(p.rows[0].note,true);
  assert.equal(p.actions,0);assert.equal(p.reflections,0);
});
test('decision support remains about discernment even with a work goal',()=>{
  const plan=G.recommend('clarity',G.context({goal:'work'}),{});
  assert.match(plan.copy,/assuming|assumption/);
  assert.notEqual(plan.copy,G.recommend('progress',G.context({goal:'work'}),{}).copy);
});

test('retired setup fields stay out of new suggestions',()=>{
  const retired={aspiration:'connect',obstacle:'perfection',worldview:'practical',value:'growth',areas:['money']};
  assert.deepEqual(G.context(retired),G.context());
  assert.deepEqual(G.recommend('grow',G.context(retired),{}),G.recommend('grow',G.context(),{}));
});
