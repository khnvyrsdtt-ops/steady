const {test}=require('node:test');
const assert=require('node:assert/strict');
const feelings=require('../public/scripture-feelings-model.js');
const history=(key='grief',guide='grief')=>[{id:'earlier',key,guide,text:'An earlier entry',at:'2026-09-25T09:00:00.000Z'}];

// Concrete language regressions only: these do not assert general language understanding.
function expectGuide(text,guide){
  const result=feelings.match(text);
  assert.equal(result.matched,true,text);
  assert.equal(result.guide,guide,text);
  assert.equal(result.key,feelings.guideThemes[guide],text);
  assert.equal(feelings.response(text,result).urgent,false,text);
  return result;
}

test('inability to stop and intensifying never phrases retain the expressed feeling',()=>{
  for(const text of ["I can't stop worrying",'I can’t stop being scared','I have never been this anxious'])expectGuide(text,'anxiety');
  for(const text of ['I have never felt so happy',"I can't believe how grateful I am"])expectGuide(text,'gratitude');
});

test('a negated earlier predicate does not swallow a later shared-subject feeling',()=>{
  expectGuide('I have no energy and feel alone','loneliness');
  expectGuide("I'm not anxious anymore and feel grateful",'gratitude');
  expectGuide('I am no longer sad and feel grateful','gratitude');
});

test('the absence of happiness is not interpreted as gratitude or a hopeful statement',()=>{
  const text='Nothing makes me happy anymore';
  const result=feelings.match(text),response=feelings.response(text,result);
  assert.notEqual(result.key,'gratitude');assert.notEqual(result.guide,'gratitude');
  assert.equal(response.urgent,false);
  assert.doesNotMatch(response.acknowledgement,/There is something meaningful or hopeful|words for gratitude/i);
});

test('explicit faith questions are recognised without requiring positive belief language',()=>{
  for(const text of [
    'Does God even exist?',
    "I don't believe in God anymore",
    "I don't feel God's presence",
    'I feel abandoned by God',
    'Where is God in all this?'
  ])expectGuide(text,'faith_questions');
});

test('doubt about a concrete non-faith topic does not become a faith question',()=>{
  for(const text of ['I have doubts about my marriage','I doubt this spreadsheet is correct']){
    assert.notEqual(feelings.match(text).guide,'faith_questions',text);
  }
});

test('common misspellings still reach the intended guide without changing saved text',()=>{
  for(const [text,guide] of [
    ['I feel anxous lately','anxiety'],
    ['I am so lonley','loneliness'],
    ['Feeling overwhelemed by everything','exhaustion'],
    ['I need guidnace on this decison','decisions']
  ])expectGuide(text,guide);
});

test('informal gamer and shortened language reaches the intended guide',()=>{
  for(const [text,guide] of [
    ['idk what to do anymore','decisions'],
    ['my teammates are so toxic','conflict'],
    ['he kept griefing me all game','conflict'],
    ['so tilted right now','anger'],
    ['thanks for everything','gratitude'],
    ['that play was clutch','gratitude'],
    ['lowkey stressed about exams','exhaustion'],
    ['smh at myself','grief'],
    ['took a big L today','perseverance'],
    ['my friends are acting sus','conflict'],
    ['fomo is real','anxiety'],
    ['no cap, I need guidance','decisions'],
    ["u up? I can't sleep",'exhaustion'],
    ['poggers, I passed!','gratitude']
  ])expectGuide(text,guide);
});

test('everyday phrasings reach a specific guide instead of the generic fallback',()=>{
  for(const [text,guide] of [
    ['I burn out every week','exhaustion'],
    ['Burn-out again this week','exhaustion'],
    ["I can't focus on anything","exhaustion"],
    ['Homesick in a new city','loneliness'],
    ['Debt collectors keep calling','decisions'],
    ['Imposter syndrome at work','comparison'],
    ['My quiet time feels dry','prayer'],
    ['Deconstructing my faith','faith_questions'],
    ['Stage fright before my presentation','exhaustion'],
    ['Surgery went badly and I feel hopeless','suffering'],
    ['I got fired yesterday','decisions'],
    ['We just got engaged','gratitude'],
    ['I failed my driving test','perseverance']
  ])expectGuide(text,guide);
});

test('achievement and growth can receive a useful local guide without being reduced to incidental exam vocabulary',()=>{
  for(const text of [
    'I passed my exam and feel proud',
    "I'm proud of what I achieved",
    'Things are going well and I want to grow',
    'I hit my goal and want a new challenge',
    "I don't need a reset, I want to build on my success"
  ]){
    const result=feelings.match(text);
    assert.equal(result.matched,true,text);
    assert.ok(['perseverance','gratitude'].includes(result.guide),text+' → '+result.guide);
    assert.equal(feelings.response(text,result).urgent,false,text);
  }
});

test('a named other person’s feeling does not displace the writer’s explicit current feeling',()=>{
  const grateful=expectGuide('My friend is anxious but I am grateful','gratitude');
  assert.equal(grateful.key,'gratitude');
  const anxious=expectGuide('My friend is happy but I am anxious','anxiety');
  assert.equal(anxious.key,'rest');
});

test('explicit continuity still preserves the previous theme and optional guide',()=>{
  for(const text of ['It is still here','It feels the same','Here I am again']){
    const result=feelings.match(text,history('connection','loneliness'));
    assert.equal(result.matched,true,text);assert.equal(result.key,'connection',text);
    assert.equal(result.guide,'loneliness',text);assert.equal(result.relatedId,'earlier',text);
    assert.match(result.reason,/most recent (?:saved )?entry/i,text);
  }
});

test('incidental still or again cannot invent continuity with a previous grief entry',()=>{
  for(const text of ['I won the race again','I am still learning to drive','Still waiting for the bus','I need help again with my homework']){
    const result=feelings.match(text,history());
    assert.equal(result.relatedId,undefined,text);
    assert.notEqual(result.key,'grief',text);
    assert.doesNotMatch(result.reason,/most recent (?:saved )?entry/i,text);
  }
});

test('unknown messages and small talk remain honest instead of adopting saved distress',()=>{
  for(const text of ['hello','good morning','tell me a joke','What is the weather?','I saw a blue bicycle']){
    const result=feelings.match(text,history()),response=feelings.response(text,result);
    assert.equal(result.matched,false,text);assert.equal(result.guide,undefined,text);
    assert.equal(result.relatedId,undefined,text);assert.equal(response.urgent,false,text);
    assert.match(response.acknowledgement,/may not|not sure|choose|couldn’t|couldn't/i,text);
    assert.doesNotMatch(response.acknowledgement,/This sounds painful|you are carrying a lot|you (?:are|have) depressed|God (?:is telling|wants) you/i,text);
  }
});

test('ordinary prayer wording and self-forgiveness get the specific guide they request',()=>{
  for(const text of ['I do not know how to pray',"I don't know how to pray",'Please help me pray',"God isn't listening"]){
    expectGuide(text,'prayer');
  }
  for(const text of ['How can I forgive myself?',"I can't forgive myself",'I struggle with forgiving myself'])expectGuide(text,'shame');
});
