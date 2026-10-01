'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const help=require('../public/ask-help.js');
const rules=require('../public/scripture-feelings-model.js');
const guides=require('../public/scripture-help-guides.js').guides;

test('follow-up context is explicit, recent and never skips past a new topic',()=>{
  const now=Date.now(),prior={id:'prior',key:'rest',guide:'anxiety',at:new Date(now-1000).toISOString()};
  assert.equal(help.followUp('What should I do next?',[prior],now).guide,'anxiety');
  for(const history of [[{...prior,reflection:true}],[{...prior,study:{kind:'reference'}}],[{...prior,unmatched:true}],[{id:'new',unmatched:true},prior],[{...prior,at:new Date(now-3*60*60*1000).toISOString()}]])
    assert.equal(help.followUp('Can you explain that?',history,now),null);
  for(const text of ['What should I do about my mortgage?','Can you explain quantum physics?','I want to hurt myself','I feel lonely'])
    assert.equal(help.followUp(text,[prior],now),null);
});

test('each animal draws a different kind of help from the same verified guide',()=>{
  const guide=guides.decisions;
  assert.equal(help.source('donkey',guide),guide.acknowledgement+' '+guide.practice);
  assert.equal(help.source('owl',guide),guide.context+' '+guide.practice);
  assert.equal(help.source('fox',guide),guide.compare);
  assert.equal(help.source('tortoise',guide),guide.practice);
  assert.equal(help.source('donkey',guide,{excludePractice:true}),guide.acknowledgement);
});

test('a clear on-device reading can rescue an ambiguous follow-up',()=>{
  const history=[{id:'previous',text:'I have two job offers.',key:'wisdom',guide:'decisions',at:'2026-09-29T12:00:00.000Z'}];
  const result=help.interpretation('What about tomorrow?',history,rules,
    {available:true,confidence:'clear',guide:'decisions',animal:'fox'},guides);
  assert.equal(result.guide,'decisions');
  assert.equal(result.key,'wisdom');
});

test('weak, invented and urgent interpretations cannot override the local matcher',()=>{
  for(const model of [
    {available:true,confidence:'weak',guide:'decisions'},
    {available:true,confidence:'clear',guide:'invented'},
    {available:false,confidence:'clear',guide:'decisions'}
  ]) assert.deepEqual(help.interpretation('Something is on my mind',[],rules,model,guides),rules.match('Something is on my mind',[]));
  const urgent='I am going to kill myself tonight';
  assert.deepEqual(help.interpretation(urgent,[],rules,{available:true,confidence:'clear',guide:'gratitude'},guides),rules.match(urgent,[]));
});

test('a model cannot replace an explicit guide with a different one',()=>{
  const text='I feel anxious about tonight';
  const initial=rules.match(text,[]);
  assert.equal(initial.guide,'anxiety');
  assert.deepEqual(help.interpretation(text,[],rules,
    {available:true,confidence:'clear',guide:'gratitude',animal:'fox'},guides),initial);
});

test('representative requests never produce a guide outside the verified library',()=>{
  const prompts=[
    'I feel anxious about the interview',
    'I am grieving my mother',
    'I feel lonely since moving',
    'I need to forgive my friend',
    'I have two job offers and cannot decide',
    'What does prayer mean?',
    'I am exhausted and cannot begin',
    'I am grateful today',
    'I have a question you may not know',
    'I want to end my life'
  ];
  for(const text of prompts){
    const result=help.interpretation(text,[],rules,
      {available:true,confidence:'clear',guide:'made_up',animal:'owl'},guides);
    assert.ok(!result.guide||Object.hasOwn(guides,result.guide),text);
    assert.equal(result.guide,rules.match(text,[]).guide,text);
  }
});

test('named-animal follow-ups are commands, not new topics',()=>{
  for(const [phrase,style] of [
    ['Give me steady answer','tortoise'],['Show me Sage’s reply','owl'],
    ['Let Scout answer','fox'],['Answer as Burden','donkey']
  ]) assert.equal(help.requestedStyle(phrase),style,phrase);
  for(const phrase of ['I feel steady today','Tell me about a tortoise','I met someone called Sage'])
    assert.equal(help.requestedStyle(phrase),null,phrase);
  const now=Date.now();
  const prior={id:'prior',text:'What’s the best next step?',key:'wisdom',guide:'decisions',at:new Date(now-1000).toISOString()};
  assert.equal(help.recentGuide([{text:'Give me steady answer'},prior],now),prior);
  assert.equal(help.recentGuide([prior],now+3*60*60*1000),null,'old context cannot silently become a new answer');
});

test('choice comparison and social comparison select different guides',()=>{
  assert.equal(rules.match('Can you compare these choices?',[]).guide,'decisions');
  assert.equal(rules.match('I keep comparing myself with other people',[]).guide,'comparison');
});

test('plain-language answer styles work without the retired animal names',()=>{
  for(const [phrase,style] of [
    ['Give me a balanced answer','donkey'],['Show me a Scripture perspective','owl'],
    ['Give me a practical response to that','tortoise'],['Use compare choices','fox'],
    ['Switch to one small step','tortoise']
  ])assert.equal(help.requestedStyle(phrase),style);
  for(const phrase of ['I need a balanced diet','What is a practical response to grief?','I dislike the balanced answer'])assert.equal(help.requestedStyle(phrase),null);
});
