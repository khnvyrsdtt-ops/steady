const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const G = require('../public/guidance.js');

// Run the production feedback construction, click handlers and renderer. The
// small DOM fixture isolates feedback from unrelated page setup and routing.
function openFeedback(outcomes, goal, {done = true, writable = true} = {}) {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.attributes = {}; this.events = {}; }
    append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
    addEventListener(type, listener) { this.events[type] = listener; }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector(selector) {
      const match = this.selectors?.[selector];
      assert.ok(match, `Unexpected fixture selector: ${selector}`);
      return match;
    }
    querySelectorAll(selector) {
      assert.equal(selector, '[data-rating]');
      return this.children.flatMap(child => [child, ...child.queryRatingDescendants()]).filter(child => child.dataset.rating);
    }
    queryRatingDescendants() { return this.children.flatMap(child => [child, ...child.queryRatingDescendants()]); }
  }
  const status = new Element();
  const day = {outcomes: structuredClone(outcomes), actionLog: []};
  let currentGoal = goal, currentVariant = 'base', persisted, undoCalls = 0;
  const plan = () => ({id: 'grow-build', variant: currentVariant, context: {goal: currentGoal}});
  const source = fs.readFileSync(require.resolve('../public/experience.js'), 'utf8');
  const start = source.indexOf("  const feedback=el('div','feedback');");
  const end = source.indexOf('  function renderPlan()', start);
  assert.ok(start >= 0 && end > start, 'Production feedback block must be present');
  const sandbox = {
    day, G,
    currentPlan: plan,
    isDone: () => done,
    storageAvailable: writable,
    save() { if (writable) persisted = JSON.parse(JSON.stringify(day)); return writable; },
    toggleCompletion() { undoCalls++; },
    haptic() {},
    renderPlan() { throw new Error('This scenario has a current plan'); },
    $: selector => { assert.equal(selector, '#feedback-status'); return status; },
    link: (text, href, className) => Object.assign(new Element(), {textContent: text, href, className}),
    rec: new Element(),
    el(tag, className, text) {
      const element = new Element();
      element.tag = tag;
      element.className = className;
      element.textContent = text;
      if (className === 'feedback') {
        const choices = new Element(), details = new Element();
        details.append(choices);
        element.append(details, status);
        element.selectors = {'.chip-row': choices, details};
      }
      return element;
    }
  };
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.feedbackApi = {feedback, completionNext, undo, renderFeedback};', sandbox);
  const {feedback, completionNext, undo, renderFeedback} = sandbox.feedbackApi;
  return {
    day, status, feedback, completionNext, undo,
    get persisted() { return persisted; },
    get undoCalls() { return undoCalls; },
    get moreOpen() { return feedback.querySelector('details').open; },
    setDone(value) { done = value; renderFeedback(plan()); },
    render(goal = currentGoal) { currentGoal = goal; renderFeedback(plan()); },
    variant(value) { currentVariant = value; renderFeedback(plan()); },
    click(rating) { feedback.querySelectorAll('[data-rating]').find(button => button.dataset.rating === rating).events.click(); },
    selected() { return feedback.querySelectorAll('[data-rating]').filter(button => button.attributes['aria-pressed'] === 'true').map(button => button.dataset.rating); }
  };
}

const outcome = (goal, rating) => ({id: 'grow-build', rating, context: {goal}, at: '2026-09-24T09:00:00.000Z'});

test('rating and rerating an action for one goal preserves the other goal and renders each selection independently', () => {
  const original = outcome('work', 'useful');
  const app = openFeedback([original], 'relationships');
  app.render();
  assert.deepEqual(app.selected(), [], 'a different goal must not inherit the first goal’s rating');
  assert.equal(app.status.textContent, '');
  assert.equal(app.moreOpen, false);

  app.click('not-useful');
  assert.equal(app.persisted.outcomes.length, 2);
  assert.deepEqual(app.persisted.outcomes.find(item => item.context.goal === 'work'), original);
  assert.equal(app.persisted.outcomes.find(item => item.context.goal === 'relationships').rating, 'not-useful');
  assert.deepEqual(app.selected(), ['not-useful']);

  app.render('work');
  assert.deepEqual(app.selected(), ['useful']);
  app.render('relationships');
  assert.deepEqual(app.selected(), ['not-useful']);
  app.click('neutral');
  assert.equal(app.persisted.outcomes.length, 2, 'rerating replaces only the current goal’s prior rating');
  assert.deepEqual(app.persisted.outcomes.find(item => item.context.goal === 'work'), original);
  assert.equal(app.persisted.outcomes.find(item => item.context.goal === 'relationships').rating, 'neutral');
  assert.deepEqual(app.selected(), ['neutral']);
});

test('feedback follows the current goal and restores any saved rating, including worse', () => {
  const app = openFeedback([outcome('work', 'worse'), outcome('relationships', 'neutral')], 'work');
  app.render();
  assert.deepEqual(app.selected(), ['worse']);
  assert.equal(app.moreOpen, true);
  app.render('relationships');
  assert.deepEqual(app.selected(), ['neutral']);
  assert.equal(app.moreOpen, true);
  app.render('learning');
  assert.deepEqual(app.selected(), []);
  assert.equal(app.moreOpen, false);
  assert.equal(app.status.textContent, '');
});

test('all four ratings share one optional disclosure without nested More feedback', () => {
  const app = openFeedback([], 'work'); app.render();
  const html = app.feedback.innerHTML;
  assert.equal((html.match(/<details\b/g) || []).length, 1);
  assert.match(html, /<details class="step-feedback"><summary>How did it go\? <span class="small-copy">Optional<\/span><\/summary>/);
  assert.match(html, /<div class="chip-row" role="group" aria-label="Was this step useful\?"><\/div><\/details>/);
  assert.doesNotMatch(html, /More feedback|feedback-more|One tap is enough/);
  assert.deepEqual(app.feedback.querySelector('.chip-row').children.map(button => button.dataset.rating), ['useful', 'neutral', 'not-useful', 'worse']);
  assert.equal(app.moreOpen, false);
  assert.equal(app.status.textContent, '', 'no extra prompt competes with the completion exit');
});

test('every saved feedback rating opens the disclosure when the step is revisited', () => {
  for (const rating of ['useful', 'neutral', 'not-useful', 'worse']) {
    const app = openFeedback([outcome('work', rating)], 'work'); app.render();
    assert.equal(app.moreOpen, true, rating);
    assert.deepEqual(app.selected(), [rating]);
    assert.match(app.status.textContent, /^Saved\./);
  }
});

test('storage failures remain outside the optional disclosure even before any rating', () => {
  const app = openFeedback([], 'work', {writable: false}); app.render();
  assert.match(app.feedback.innerHTML, /<\/details><p class="small-copy" id="feedback-status" role="status"><\/p>/);
  assert.equal(app.status.parent, app.feedback);
  assert.equal(app.moreOpen, false);
  assert.equal(app.status.textContent, 'Kept for this visit only.');
  app.click('worse');
  assert.equal(app.persisted, undefined);
  assert.deepEqual(app.selected(), ['worse']);
  assert.equal(app.moreOpen, true);
  assert.equal(app.status.textContent, 'Not saved on this device.');
});

test('feedback is available before completion while the completed exit and undo stay hidden', () => {
  const app = openFeedback([], 'work', {done: false}); app.render();
  assert.equal(app.feedback.hidden,false);
  for (const node of [app.completionNext, app.undo]) assert.equal(node.hidden, true);
  app.click('not-useful');
  assert.equal(app.persisted.actionLog.length,0,'rating a suggestion does not complete it');
  assert.equal(app.completionNext.hidden,true);assert.equal(app.undo.hidden,true);
  app.setDone(true);
  for (const node of [app.feedback, app.completionNext, app.undo]) assert.equal(node.hidden, false);
  const links = app.completionNext.children.filter(node => node.href);
  assert.equal(links.length, 1);
  assert.equal(links[0].textContent, 'Done for now');
  assert.equal(links[0].href, '#home');
  assert.equal(links[0].className, 'button primary');
  assert.equal(app.undo.textContent, 'Undo completion');
  assert.equal(app.undo.type, 'button');
  assert.equal(app.undo.parent, app.feedback.parent);
  app.undo.events.click(); assert.equal(app.undoCalls, 1);
});

test('ratings for different action variants remain separate through rerating and reopening',()=>{
  const app=openFeedback([], 'work', {done:false});
  app.variant('hesitation');app.click('useful');
  app.variant('energy');assert.deepEqual(app.selected(),[]);app.click('worse');
  assert.equal(app.persisted.outcomes.length,2);
  app.variant('hesitation');assert.deepEqual(app.selected(),['useful']);app.click('neutral');
  assert.equal(app.persisted.outcomes.length,2);
  assert.equal(app.persisted.outcomes.find(item=>item.variant==='energy').rating,'worse');
  const reopened=openFeedback(app.persisted.outcomes,'work',{done:false});
  reopened.variant('energy');assert.deepEqual(reopened.selected(),['worse']);
  reopened.variant('hesitation');assert.deepEqual(reopened.selected(),['neutral']);
  assert.equal(reopened.day.actionLog.length,0);
});
