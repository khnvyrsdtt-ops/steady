const {test}=require('node:test');
const assert=require('node:assert/strict');
const feelings=require('../public/scripture-feelings-model.js');

// These are bounded language regressions, not an exhaustive clinical detector.
function expectSupport(text){
  const match=feelings.match(text);
  assert.equal(match.key,'grief',text);
  assert.equal(match.matched,true,text);
  const response=feelings.response(text,match);
  assert.equal(response.urgent,true,text);
  return response;
}

test('inability to escape and reported secrecy do not negate explicit abuse',()=>{
  for(const text of [
    "I can't escape the abuse",
    'I cannot escape the abuse',
    'I can’t get away from my abusive partner',
    'My partner told me not to tell anyone he hit me',
    'There is no reason for my partner to hit me',
    'I never thought he would hit me'
  ])expectSupport(text);
});

test('passive and indirect self-harm phrasing receives urgent support',()=>{
  for(const text of [
    'Everyone would be better off without me',
    'I feel like dying',
    "I feel like I'm dying",
    "I can't do this anymore",
    'I cannot take it anymore',
    'I started cutting again'
  ])expectSupport(text);
  for(const text of [
    "I don't feel like dying today",
    'The movie character feels like dying'
  ])assert.equal(feelings.response(text).urgent,false,text);
});

test('coerced sexual contact receives urgent unsafe support',()=>{
  for(const text of [
    'He forced himself on me',
    'He coerced me last night',
    'I was molested as a child'
  ])expectSupport(text);
});

test('ordinary denials remain nonurgent after broader safety-negation handling',()=>{
  for(const text of [
    'I am not being abused',
    'My partner is not abusive',
    "My partner isn't hitting me",
    'Nobody is threatening me',
    'There is no violence at home',
    'My daughter does not want to kill herself',
    'My friend is not planning to end his life',
    'I did not take too many pills'
  ])assert.equal(feelings.response(text).urgent,false,text);
});

test('explicit third-person self-harm receives support directed to the person at risk',()=>{
  for(const text of [
    'My daughter wants to kill herself',
    'My friend is planning to end his life',
    "I'm scared my son might hurt himself",
    'He says he will hurt himself tonight',
    'My friend wants to die',
    'They want to kill themselves'
  ]){
    const response=expectSupport(text);
    assert.equal(response.thirdParty,true,text);
    assert.match(response.acknowledgement,/\b(?:them|their|person|friend|someone you care about)\b/i,text);
    assert.doesNotMatch(response.acknowledgement,/who can stay with you\b/i,text);
  }
});

test('reported abuse of another person does not address the writer as the person in danger',()=>{
  for(const text of ['My sister is being abused','My partner hit my child']){
    const response=expectSupport(text);
    assert.equal(response.thirdParty,true,text);
    assert.match(response.acknowledgement,/\b(?:them|their|person|child|sister|someone you care about)\b/i,text);
    assert.doesNotMatch(response.acknowledgement,/before you are safe/i,text);
  }
});

test('an explicit report of taking too many pills receives urgent support without needing an intent statement',()=>{
  for(const text of [
    'I took too many pills and I need help',
    'I have taken too many tablets'
  ])expectSupport(text);
});

test('explicit routine complements are not treated as standalone wishes to die',()=>{
  for(const text of [
    "I can't go on holiday",
    'I cannot go on vacation',
    "I don't want to be here at this party",
    'I do not want to be here in this meeting'
  ])assert.equal(feelings.response(text).urgent,false,text);
  for(const text of ["I can't go on","I don't want to be here"]){
    const response=expectSupport(text);
    assert.notEqual(response.thirdParty,true,text);
  }
});

test('routine phrases and denied third-party risk cannot hide a separate current first-person risk',()=>{
  for(const text of [
    "I can't go on holiday and I want to die",
    "I don't want to be here at this party. I want to kill myself",
    'My friend is not suicidal but I want to die',
    "I am reading an article about self-harm but I want to die"
  ]){
    const response=expectSupport(text);
    assert.notEqual(response.thirdParty,true,text);
  }
});
