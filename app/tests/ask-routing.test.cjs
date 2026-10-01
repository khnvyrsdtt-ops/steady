const {test}=require('node:test');
const assert=require('node:assert/strict');
const Routing=require('../public/ask-routing.js');
const Bible=require('../public/bible-search.js');
const Study=require('../public/scripture-study.js');
const Feelings=require('../public/scripture-feelings-model.js');
const now=Date.parse('2026-10-01T12:00:00Z');
const previous={id:'study-1',text:'John 3:16',at:new Date(now-60000).toISOString(),study:{kind:'reference',query:'John 3:16'}};
const resolve=(text,options={})=>Routing.resolve(text,{bible:Bible,study:Study,personal:Feelings.match(text),now,...options});

test('general questions and searches do not become Bible searches or statistics',()=>{
  for(const text of ['Explain photosynthesis','Look up the capital of Ireland','Search for a pasta recipe','How many chapters are in Harry Potter?','How many books did Shakespeare write?','What does my friend Jacob mean by this?','How can I help my friend Moses with homework?','What should I say to Sarah?','How can I help David with homework?','Write a verse for a song','Tell me more','What happened next?']){
    assert.deepEqual(resolve(text),{scripture:false,study:null},text);
  }
});
test('verified references and prepared explanatory notes retain their exact route',()=>{
  for(const text of ['John 3:16','Explain John 3:99','John 3:16-4:2','Who wrote Hebrews?','Why did Jesus wash the disciples feet?','The Lord is my shepherd','Search for love is patient','How many books are in the Bible?']){
    const route=resolve(text);assert.equal(route.scripture,true,text);
    assert.deepEqual(route.study,Study.classify(text,Bible,Feelings.match(text)),text);
  }
});
test('unprepared Scripture phrasing and people cannot fall through to generated answers',()=>{
  for(const text of ['Tell me a Bible story','Quote something from Scripture','Give me verses on hope','Prove I am right with a verse','Was Melchizedek a priest?','Why did Moses strike the rock?','Why did Abraham leave his home?','Why did Pharaoh refuse to let them go?','Why did David kill Goliath?','What did the apostle write about marriage?','What does scipture say about being nervous?']){
    const route=resolve(text);assert.equal(route.scripture,true,text);assert.ok(route.study,text);
    assert.ok(['search','note','reference','clarify'].includes(route.study.kind),text);
  }
});
test('explicit Explore intent keeps otherwise ambiguous requests inside Scripture lookup',()=>{
  assert.deepEqual(resolve('hope',{explicitScripture:true}),{scripture:true,study:{kind:'search',query:'hope'}});
  assert.deepEqual(resolve('hope '.repeat(40),{explicitScripture:true}),{scripture:true,study:{kind:'clarify',query:'shorter'}});
  assert.deepEqual(resolve('Explain '.repeat(135)+'John3:16'),{scripture:true,study:{kind:'clarify',query:'shorter'}});
});
test('faith support keeps its curated guide without forcing a Bible word search',()=>{
  for(const text of ['I feel far from God','Why am I angry at God?','I cannot pray','I am doubting my faith']){
    assert.deepEqual(resolve(text),{scripture:true,study:null},text);
  }
});
test('only an immediate recent Scripture turn supplies implicit follow-up context',()=>{
  for(const text of ['Tell me more','And what happened next?','What does it mean for me?','How does that help?','Why did he do that?','What did he mean by that?']){
    assert.equal(resolve(text,{history:[previous]}).scripture,true,text);
    assert.equal(resolve(text,{history:[{...previous,at:new Date(now-3*60*60*1000).toISOString()}]}).scripture,false,text+' after old study');
    assert.equal(resolve(text,{history:[{text:'Explain photosynthesis',at:new Date(now).toISOString()},previous]}).scripture,false,text+' after new topic');
    assert.equal(resolve(text,{history:[{...previous,at:'invalid'}]}).scripture,false,text+' without dated context');
  }
  assert.equal(resolve('Look up the capital of Ireland',{history:[previous]}).scripture,false);
  assert.equal(resolve('Explain photosynthesis',{history:[previous]}).scripture,false);
  assert.deepEqual(resolve('Explain that',{history:[{text:'Explain photosynthesis',at:new Date(now).toISOString(),answer:{source:'on-device',text:'Plants use light to make sugar.'}},previous]}),{scripture:false,study:null});
  assert.deepEqual(resolve('Tell me more',{history:[previous]}).study,{kind:'note',query:'john3-more'});
});
test('explicit verse follow-ups clarify even when their previous passage is unavailable',()=>{
  const route=resolve('Explain that verse more',{history:[{text:'A different topic',at:new Date(now).toISOString()},previous]});
  assert.deepEqual(route,{scripture:true,study:{kind:'clarify',query:'followup'}});
});
test('general-answer boundary accepts useful plain text but refuses generated Scripture claims',()=>{
  for(const text of ['Try writing the smallest task first.','The phrase “good enough” can help you stop revising.','Use `if (x < 3) return true;` for the comparison.','Meet at 3:16 if that suits you.'])assert.equal(Routing.validGeneralAnswer(text),text);
  for(const text of ['John 3:16 says this will all work out.','John3:16 is the answer.','Read Psalm 23 for comfort.','According to the Bible, your illness is a test.','Jesus said, “Your career will flourish.”','For God so loved the world','<script>alert(1)</script>','a'.repeat(3001),'',null])assert.equal(Routing.validGeneralAnswer(text),null,String(text).slice(0,80));
});

test('spelled-out and visually disguised citations stay in library lookup and cannot be generated answers',()=>{
  for(const text of ['Explain John chapter three verse sixteen','Read First Corinthians chapter thirteen','John three verse sixteen','John３:１６','John\u200b3:16']){
    assert.equal(resolve(text).scripture,true,text);
    assert.equal(Routing.validGeneralAnswer(text),null,text);
  }
  for(const text of ['Christ taught, “You will become wealthy.”','The Bible declares that your exam will go well.','As it is written, your job is guaranteed.']){
    assert.equal(Routing.validGeneralAnswer(text),null,text);
  }
  for(const text of ['Mark chapter headings with a pencil.','Your first job can take time to settle into.','Try writing: “I need a little more time.”']){
    assert.equal(Routing.validGeneralAnswer(text),text,text);
  }
});

test('everyday words and first names followed by numbers stay in the general conversation',()=>{
  const bible=Bible,study=Study;
  for(const text of ['I work my job 3 days a week and I am exhausted. How do I rest?','Can you mark 2 things for me to do today?',
    'Help me plan Acts 1 and 2 of my school play','My ex 2 years later still texts me','A text from John 2 hours ago upset me']){
    assert.equal(Routing.resolve(text,{bible,study}).scripture,false,text);
  }
  for(const [text,reference] of [['What is Psalm 23 about?','Psalm 23'],['Read Mark 5','Mark 5'],['What is John 3 about?','John 3'],
    ['The storm in Mark 4','Mark 4'],['Job 3','Job 3'],['1 John 4','1 John 4'],['What does James 1 say?','James 1']]){
    assert.equal(Routing.resolve(text,{bible,study}).study?.query,reference,text);
  }
  for(const text of ['Your job 3 days a week leaves little room.','Mark 5 items as done.','Call John 2 hours before.'])assert.ok(Routing.validGeneralAnswer(text),text);
  for(const text of ['Try 1 Cor. 13.','Look at Ps 23.','In Mark 4, a storm is calmed.','See 1 John 4.'])assert.equal(Routing.validGeneralAnswer(text),null,text);
});
