const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const feelings = require('../public/scripture-feelings-model.js');
const guide = require('../public/guidance.js');
const entry = (id, key, at = '2026-09-23T12:00:00.000Z', text = 'An earlier entry') => ({ id, key, at, text });

test('the pure matcher is available to browser scripts without modules or other globals', () => {
  const browser = vm.runInNewContext(fs.readFileSync(require.resolve('../public/scripture-feelings-model.js'), 'utf8') + '; SteadyFeelings');
  assert.equal(browser.match('I feel lonely').key, 'connection');
  assert.equal(typeof browser.normalizeEntries, 'function');
});

test('bare greetings are detected for a warm reply, longer lines still match', () => {
  for (const [text, salutation] of [
    ['hello', 'Hello.'], ['Hi', 'Hello.'], ['hey!', 'Hello.'], ['howdy', 'Hello.'],
    ['hey there', 'Hello.'], ['hello burden', 'Hello.'], ['hi, Burden', 'Hello.'],
    ['good morning', 'Good morning.'], ['Good evening!', 'Good evening.'], ['good night', 'Good night.']
  ]) assert.equal(feelings.greeting(text), salutation, text);
  for (const text of ['hello, I feel anxious', 'hey, I cannot sleep', 'good morning, I am grieving', 'a greeting hello to everyone here today', 'Othello', 'good morning starshine1990']) assert.equal(feelings.greeting(text), null, text);
});

test('"how are you" gets a steady answer, never a search or a cold miss', () => {
  for (const text of ['How are you?', 'how are you', 'How are you feeling?', 'how r u', 'How are you today, burden']) assert.equal(feelings.checkin(text), true, text);
  for (const text of ['how is your day', 'How are you and your family?', 'how are you feeling about work']) assert.equal(feelings.checkin(text), false, text);
});

test('common feelings match only themes in the existing Scripture library', () => {
  const examples = {
    grief:['I feel sad', 'My father died and I feel lonely', 'I am grieving', 'I have a broken heart', 'I am hurting'],
    rest:['I feel anxious about work', 'My family makes me worried', 'I am so tired', 'I feel scared', 'I cannot sleep', "I can’t sleep", 'I feel overwhelmed'],
    grace:['I feel guilty', 'I am ashamed', 'I feel angry', 'I need forgiveness'],
    connection:['I feel lonely at work', 'I am isolated', 'I feel left out', 'I miss my family'],
    gratitude:['I am grateful', 'I feel joyful', 'I feel happy', 'I am thankful'],
    wisdom:['I feel confused', 'I am uncertain', 'I cannot decide', "I don't know what to do", 'I am not sure which way to go'],
    foundation:['I feel stuck', 'I am starting over']
  };
  for (const [key, texts] of Object.entries(examples)) for (const text of texts) {
    const result = feelings.match(text);
    assert.equal(result.key, key, text);
    assert.equal(result.matched, true, text);
    assert.ok(Object.hasOwn(guide.themes, result.key));
    assert.match(result.reason, /what you wrote/);
    assert.equal(result.relatedId, undefined);
  }
});

test('natural requests for advice or action map to verified themes without generated verses', () => {
  const examples = {
    wisdom:["What should I do?", "idk what to do", "Can you give me advice?", "How do I choose?", "Where do I start?", "I need direction"],
    foundation:["I keep putting this off", "Help me take action", "I need to get started", "I want to follow through", "I am procrastinating"],
    grace:["I need to apologise", "How can I make amends?", "I want to show them kindness"],
    connection:["How can I help my friend?", "I need support", "I want to reconnect"],
    rest:["I need a break", "There is too much going on", "I need to slow down"],
    gratitude:["I want to give thanks", "Something good happened"]
  };
  for (const [key, texts] of Object.entries(examples)) for (const text of texts) {
    const result = feelings.match(text);
    assert.equal(result.key, key, text);
    assert.equal(result.matched, true, text);
    assert.ok(Object.hasOwn(guide.themes, result.key));
    assert.match(result.reason, /verified library/);
  }
});

test('negation does not turn a denied feeling into the recommendation', () => {
  for (const text of ['I am not anxious but lonely', 'I am not feeling particularly anxious, just lonely', "I don't feel angry. I feel lonely", 'I am no longer sad but lonely', 'I am neither anxious nor angry, just lonely', 'I am not anxious or angry and I feel lonely', 'I am never really very anxious but lonely']) {
    assert.equal(feelings.match(text).key, 'connection', text);
  }
  assert.equal(feelings.match('I am not angry and not worried, just grateful').key, 'gratitude');
  assert.equal(feelings.match('I am not happy').matched, false);
  assert.equal(feelings.match('I do not know why I feel anxious').key, 'rest');
  assert.equal(feelings.match('I am not only anxious, I am exhausted').key, 'rest');
});

test('incidental topics and repeated weak matches cannot displace an explicit feeling', () => {
  for (const text of ['I am lonely about work and my budget and family', 'My work is good but I feel sad', 'Wisdom and choices and decisions: I am anxious', 'I feel anxious about a family decision']) {
    assert.notEqual(feelings.match(text).key, 'wisdom', text);
    assert.notEqual(feelings.match(text).key, 'gratitude', text);
  }
  assert.equal(feelings.match('work family budget good').matched, false);
});

test('vulnerable contexts offer comfort without inferring diagnoses or prescribing forgiveness', () => {
  for (const text of ['I am angry because someone is abusing me', 'I feel guilty and unsafe', 'I am not feeling safe', 'I feel worthless', 'I feel depressed']) {
    const result = feelings.match(text);
    assert.equal(result.key, 'grief', text);
    assert.doesNotMatch(result.reason, /you (?:have|are suffering from)|you (?:must|should|need to) forgive/i);
  }
  assert.equal(feelings.match('I am not being abused but I feel anxious').key, 'rest');
  assert.equal(feelings.match("My father hasn't died; I am worried about him").key, 'rest');
});

test('explicit self-harm language selects comfort and immediate human support together', () => {
  const examples = [
    'I want to kill myself', 'I want to die', 'I wish I were dead', 'I wish to be dead',
    'I am thinking of taking my own life', 'I want to end my life', 'I am hurting myself',
    'I am self-harming', 'I am suicidal', 'I might cut myself',
    "I don't want to live", 'I do not want to live', 'I no longer want to live',
    'I am not wanting to be alive', 'I don’t want to be here', 'I can’t go on'
  ];
  for (const text of examples) {
    const result = feelings.match(text);
    assert.equal(result.key, 'grief', text);
    assert.equal(result.matched, true, text);
    const response = feelings.response(text, result);
    assert.equal(response.urgent, true, text);
    assert.match(response.acknowledgement, /immediate human support/, text);
    assert.doesNotMatch(response.acknowledgement, /diagnos|you must forgive/i, text);
  }
});

test('abuse inflections and explicit physical danger share the same support route', () => {
  const examples = [
    'I am being abused', 'Someone is abusing me', 'My partner abuses me',
    'My partner is abusive', 'I am unsafe', 'I am no longer safe',
    'I am not feeling safe', 'I don’t feel safe', 'My home isn’t safe',
    'I do not feel at all safe', 'I don’t feel very safe',
    'I am in immediate danger', 'Someone threatened me', 'Someone is threatening me',
    'I was assaulted', 'There is violence at home', 'My partner is hitting me',
    'My partner hit me', 'I am being beaten', 'Someone punched me',
    'Someone is kicking me', 'My partner is choking me', 'Someone strangled me',
    'Someone is strangling me', 'I have been raped', 'Someone is attacking me'
  ];
  for (const text of examples) {
    const result = feelings.match(text);
    assert.equal(result.key, 'grief', text);
    assert.equal(result.matched, true, text);
    const response = feelings.response(text, result);
    assert.equal(response.urgent, true, text);
    assert.match(response.acknowledgement, /not as a reason to stay in danger/, text);
  }
});

test('explicit denials do not trigger either the danger theme or urgent reply', () => {
  const examples = [
    'I am not suicidal', 'I am no longer suicidal', 'I have never been suicidal',
    'I am not self-harming', 'I no longer self-harm', 'I will not hurt myself',
    'I won’t kill myself', 'I don’t think I am suicidal', 'I do not believe I’m suicidal',
    "I don't want to kill myself", 'I do not want to die', 'I never want to die',
    'I am no longer unsafe', 'I am not being abused', 'My partner is not abusive',
    'Nobody is threatening me', 'No one is abusing me',
    'I have not been assaulted', 'There is no violence', 'My partner isn’t hitting me',
    'My home is not unsafe'
  ];
  for (const text of examples) {
    const result = feelings.match(text);
    assert.notEqual(result.key, 'grief', text);
    assert.equal(feelings.response(text, result).urgent, false, text);
    assert.equal(feelings.response(text, {key:'grief'}).urgent, false, 'Saved theme: '+text);
  }
});

test('denied feelings cannot hide a separate risk clause or inability to stop harm', () => {
  const examples = [
    'I am not suicidal but I want to die',
    'I am not suicidal and want to die',
    'I am not suicidal and don’t want to live',
    'I am not suicidal and can’t go on',
    'I am not anxious and I want to kill myself',
    'I am not being abused; I am hurting myself',
    'I am no longer unsafe. I want to end my life',
    'I’m not suicidal but I can’t stop hurting myself',
    'I don’t know how to stop self-harming',
    'I am unable to stop hurting myself',
    'I do not know why I feel suicidal',
    'I am not sure if I want to die'
  ];
  for (const text of examples) {
    assert.equal(feelings.match(text).key, 'grief', text);
    assert.match(feelings.response(text).acknowledgement, /immediate human support/, text);
  }
  for (const text of [
    'I am not suicidal but my partner is abusing me',
    'I am not being abused and my friend is threatening me',
    'I am not anxious because he is hitting me',
    'I am not anxious because someone threatened me',
    'My partner is not abusive and is hitting me',
    'I do not know why someone is abusing me',
    'I am not only unsafe, I am scared'
  ]) {
    assert.equal(feelings.match(text).key, 'grief', text);
    assert.match(feelings.response(text).acknowledgement, /not as a reason to stay in danger/, text);
  }
  assert.equal(feelings.match('I am not suicidal but lonely').key, 'connection');
  assert.equal(feelings.response('I am not suicidal but lonely').urgent, false);
});

test('current safety wording still receives support when a saved passage has another theme', () => {
  const result = feelings.response('I want to kill myself', {key:'foundation'});
  assert.equal(result.urgent, true);
  assert.match(result.acknowledgement, /immediate human support/);
  assert.equal(feelings.response('I am no longer unsafe', {key:'grief'}).urgent, false);
  for (const text of [null, undefined, {}, [], 12, '', 'I saw a blue bicycle']) {
    assert.equal(feelings.response(text).urgent, false);
  }
  assert.equal(feelings.response('x'.repeat(1200)+' I want to die').urgent, false);
});

test('the current theme wins over history and only related history is identified', () => {
  const history = [entry('old-rest', 'rest', '2026-09-21T12:00:00.000Z'), entry('new-grief', 'grief', '2026-09-24T12:00:00.000Z'), entry('latest-rest', 'rest')];
  const result = feelings.match('I feel anxious', history);
  assert.equal(result.key, 'rest');
  assert.equal(result.relatedId, 'latest-rest');
  assert.match(result.reason, /earlier entry on this theme/);
  const different = feelings.match('I feel happy again', history);
  assert.equal(different.key, 'gratitude');
  assert.equal(different.relatedId, undefined);
  assert.doesNotMatch(different.reason, /earlier entry/);
});

test('explicit continuity can revisit the latest history with an honest explanation', () => {
  const history = [entry('newer', 'connection', '2026-09-24T10:00:00.000Z'), entry('older', 'rest')];
  for (const text of ['It is still here', 'It feels the same', 'Here I am again']) {
    const result = feelings.match(text, history);
    assert.equal(result.key, 'connection');
    assert.equal(result.relatedId, 'newer');
    assert.equal(result.matched, true);
    assert.match(result.reason, /most recent (?:saved )?entry/);
    assert.match(result.reason, /if it does not fit/);
  }
  for (const text of ['It is not the same', 'Never again', 'I am not still there']) assert.equal(feelings.match(text, history).matched, false, text);
  assert.equal(feelings.match('It feels the same', []).matched, false);
});

test('unknown and empty inputs do not invent understanding or unrelated memories', () => {
  const history = [entry('previous', 'grief')];
  for (const text of [null, undefined, {}, [], 12, '', '  ', 'I saw a blue bicycle', '<script>alert(1)</script>']) {
    const result = feelings.match(text, history);
    assert.equal(result.key, 'foundation');
    assert.equal(result.matched, false);
    assert.equal(result.relatedId, undefined);
    assert.match(result.reason, /No clear theme/);
  }
});

test('history normalization removes malformed entries and retains only understood data', () => {
  for (const value of [undefined, null, {}, 'entries', 5]) assert.deepEqual(feelings.normalizeEntries(value), []);
  const valid = Object.freeze({ ...entry(' valid ', 'rest'), text:'  I am tired  ', secret:'not copied' });
  const bad = [null, [], {}, entry('', 'rest'), entry('x', 'constructor'), entry('x', 'toString'), entry('x', 'missing'), { ...entry('x', 'rest'), text:{} }, entry('x', 'rest', '2026-02-30T12:00:00.000Z'), entry('x', 'rest', '2026-13-01T12:00:00.000Z'), entry('x', 'rest', '2026-09-23'), entry('x', 'rest', 'not a date'), entry('x', 'rest', '2026-09-23T24:00:00.000Z'), entry('x', 'rest', '2026-09-23T12:60:00.000Z'), entry('x', 'rest', '2026-09-23T12:00:60.000Z')];
  assert.deepEqual(feelings.normalizeEntries([...bad, valid]), [{ id:'valid', text:'I am tired', key:'rest', at:'2026-09-23T12:00:00.000Z' }]);
  assert.equal(valid.text, '  I am tired  ');
});

test('ISO timestamps are validated and normalized before ordering', () => {
  const result = feelings.normalizeEntries([entry('utc', 'rest', '2026-09-23T12:00:00Z'), entry('offset', 'wisdom', '2026-09-23T13:30:00+01:00'), entry('leap', 'grief', '2024-02-29T12:00:00.1Z'), entry('bad-leap', 'rest', '2025-02-29T12:00:00Z')]);
  assert.deepEqual(result.map(item => item.id), ['offset', 'utc', 'leap']);
  assert.equal(result[0].at, '2026-09-23T12:30:00.000Z');
  assert.equal(result[2].at, '2024-02-29T12:00:00.100Z');
  assert.deepEqual(feelings.normalizeEntries([entry('outside-range', 'rest', '0000-01-01T00:00:00+01:00')]), []);
});

test('history is bounded, newest-first and deduplicated without mutating input', () => {
  const history = Array.from({ length:35 }, (_, index) => entry(`entry-${index}`, 'rest', new Date(Date.UTC(2026, 8, 1, index)).toISOString(), 'x'.repeat(1300)));
  history.push(entry('entry-34', 'grief', '2026-09-25T12:00:00.000Z'));
  const before = JSON.stringify(history);
  const result = feelings.normalizeEntries(history);
  assert.equal(result.length, 30);
  assert.equal(new Set(result.map(item => item.id)).size, 30);
  assert.equal(result[0].id, 'entry-34');
  assert.equal(result[0].key, 'grief');
  assert.ok(result.every(item => item.text.length <= 1200));
  assert.equal(JSON.stringify(history), before);
  assert.deepEqual(feelings.normalizeEntries(result), result);
});

test('matching is deterministic, bounded and does not mutate historical entries', () => {
  const history = Object.freeze([Object.freeze(entry('rest', 'rest'))]);
  assert.deepEqual(feelings.match('I feel anxious', history), feelings.match('I feel anxious', history));
  assert.equal(feelings.match('x'.repeat(1200) + ' anxious').matched, false);
  assert.equal(feelings.match('I feel anxious', [null, {key:'rest'}, ...history]).relatedId, 'rest');
});
