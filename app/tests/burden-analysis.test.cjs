'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Analysis = require('../public/burden-analysis.js');

test('the worked example detects a decision with time and uncertainty', () => {
  const a = Analysis.analyze("I don't know whether I should go tomorrow.");
  assert.equal(a.intent, 'decision');
  assert.equal(a.timeReference, 'tomorrow');
  assert.equal(a.uncertainty, true);
  assert.equal(a.isQuestion, false);
  assert.equal(a.confidence, 'high');
  assert.equal(Analysis.waitingText(a), 'Thinking through the choice…');
});

test('faith and general questions get their own waiting states', () => {
  const faith = Analysis.analyze('What does grace mean?');
  assert.equal(faith.intent, 'faith');
  assert.equal(faith.isQuestion, true);
  assert.equal(Analysis.waitingText(faith), 'Understanding your question…');
  const plan = Analysis.analyze('Help me plan my week', { key: 'foundation', matched: true, guide: 'starting' });
  assert.equal(plan.intent, 'planning');
  assert.equal(plan.confidence, 'high');
  assert.equal(Analysis.waitingText(plan), 'Looking at what matters here…');
  const support = Analysis.analyze('I feel anxious', { key: 'rest', matched: true, guide: 'anxiety' });
  assert.equal(support.intent, 'support');
  assert.equal(Analysis.waitingText(support), 'Working through this with you…');
});

test('low confidence falls back to neutral instead of guessing', () => {
  for (const text of ['asdfgh', 'I love decisions', 'My brother is decisive', 'The sky is blue']) {
    const a = Analysis.analyze(text);
    assert.equal(a.confidence, 'low', text);
    assert.equal(Analysis.waitingText(a), null, text);
  }
});

test('weak decision language without uncertainty stays neutral', () => {
  const a = Analysis.analyze('I wonder whether it will rain');
  assert.equal(a.intent, 'decision');
  assert.equal(a.confidence, 'low');
  assert.equal(Analysis.waitingText(a), null);
});

test('urgency never gets a decorated waiting state', () => {
  const a = Analysis.analyze('I need help right now');
  assert.equal(a.urgency, true);
  assert.equal(Analysis.waitingText(a), null);
});

test('time references cover common forms without overclaiming', () => {
  assert.equal(Analysis.analyze('Should I go tomorrow?').timeReference, 'tomorrow');
  assert.equal(Analysis.analyze('See you next week').timeReference, 'next week');
  assert.equal(Analysis.analyze('Pray for me on 25 December').timeReference, '25 december');
  assert.equal(Analysis.analyze('I feel lonely').timeReference, null);
});

test('statements are not questions and topics pass through', () => {
  const statement = Analysis.analyze('I am sad.', { key: 'grief', matched: true, guide: 'grief' });
  assert.equal(statement.isQuestion, false);
  assert.equal(statement.intent, 'support');
  assert.equal(statement.topic, 'grief');
  assert.equal(statement.confidence, 'high');
  const ctx = Analysis.toContext(statement);
  assert.deepEqual(ctx, { intent: 'support', topic: 'grief', timeReference: null, uncertainty: false, isQuestion: false });
  assert.equal(Analysis.toContext(null), null);
});
