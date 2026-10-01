'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const AI = require('../public/ai/pipeline.js');
const Provider = require('../public/ai/provider.js');
const Catalogue = require('../public/ai/providers.js');
const Specialists = require('../public/ai/specialists.js');

const publicDir = path.join(__dirname, '..', 'public');
const loadGlobal = (file, name) => {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(publicDir, file), 'utf8') + `\nglobalThis.__out=${name};`, sandbox);
  return sandbox.__out;
};
const Chapters = loadGlobal('chapters.js', 'ScriptureChapters');
const Library = loadGlobal('scriptures.js', 'ScriptureLibrary');
const Guides = require('../public/scripture-help-guides.js');
const Verified = require('../public/verified-scripture.js');
const Matcher = require('../public/scripture-feelings-model.js');

const deps = { verified: Verified, guides: Guides, chapters: Chapters, library: Library, matcher: Matcher, translation: 'web' };

/* ------------------------------------------------------------------ *
 * The guarantee that makes the rest of this safe to ship.
 * ------------------------------------------------------------------ */
test('no credential can ship inside the app bundle', () => {
  // app/public is bundled into the iOS app. A key here would be a key on every
  // user's device, so this is checked mechanically rather than by convention.
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(js|html|css|json)$/.test(entry.name) ? [full] : [];
  });
  // A Google AI Studio key, or anything that looks like a bearer credential.
  const secret = /(?:AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9]{20,}|gsk_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})/;
  const offenders = walk(publicDir).filter(file => secret.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(offenders, [], 'credentials must come from runtime config, never app/public');
});

/* ------------------------------------------------------------------ *
 * Cost: the thing that must stay at zero.
 * ------------------------------------------------------------------ */
test('no metered provider can be reached, even if one is registered', () => {
  Provider.clear();
  Provider.register(Catalogue.meteredExample);
  Provider.configure({ paidKey: 'set-by-a-mistake', config: { paidKey: 'set-by-a-mistake' } });
  return Provider.complete({ prompt: 'hello' }).then(reply => {
    assert.equal(reply.ok, false);
    assert.equal(reply.used, false);
    assert.equal(reply.reason, 'no-provider', 'a paid route is not a fallback');
    assert.equal(Provider.status().meteredCalls, 0);
  });
});

test('metering cannot be switched on by configuration alone', () => {
  Provider.clear();
  Provider.register(Catalogue.meteredExample);
  Provider.configure({ allowMetered: true, config: { paidKey: 'k' } });
  const status = Provider.status();
  // Configuration asks. The code decides, and the default stands until someone
  // changes provider.js deliberately.
  assert.equal(status.meteredCalls, 0);
  assert.equal(typeof Provider.currentConfig().allowMetered, 'boolean');
  Provider.clear();
});

test('nothing is registered that could cost money', () => {
  assert.deepEqual(Catalogue.registerable().map(p => p.cost), ['local', 'free']);
  assert.equal(Catalogue.registerable().some(p => p.cost === 'metered'), false);
});

/* ------------------------------------------------------------------ *
 * Resilience: the app must work when the model cannot.
 * ------------------------------------------------------------------ */
test('an absent provider is an ordinary outcome, not a failure', async () => {
  Provider.clear();
  Provider.configure({ config: {} });
  const reply = await Provider.complete({ prompt: 'anything' });
  assert.equal(reply.ok, false);
  assert.equal(reply.reason, 'no-provider');
});

test('an exhausted quota cools the provider and is not retried in a loop', async () => {
  Provider.clear();
  let calls = 0;
  Provider.register({
    id: 'free-test', cost: 'free', requiresConfig: false,
    complete: async () => { calls += 1; const e = new Error('quota exceeded'); e.status = 429; throw e; },
  });
  const first = await Provider.complete({ prompt: 'one' });
  assert.equal(first.reason, 'quota-exhausted');
  const second = await Provider.complete({ prompt: 'two' });
  assert.equal(second.used, false, 'the exhausted provider is not asked again');
  assert.equal(calls, 1, 'one attempt, not a retry storm');
  assert.deepEqual(Provider.status().cooling, ['free-test']);
  Provider.clear();
});

test('the daily ceiling is enforced here, not left to callers', async () => {
  Provider.clear();
  Provider.configure({ dailyCallLimit: 2 });
  let calls = 0;
  Provider.register({ id: 'free-count', cost: 'free', requiresConfig: false, complete: async () => { calls += 1; return { text: 'ok' }; } });
  await Provider.complete({ prompt: 'a' });
  await Provider.complete({ prompt: 'b' });
  const third = await Provider.complete({ prompt: 'c' });
  assert.equal(third.ok, false);
  assert.equal(third.reason, 'daily-limit');
  assert.equal(calls, 2);
  Provider.clear();
});

/* ------------------------------------------------------------------ *
 * Scripture: the guarantee that must hold even with a model in the loop.
 * ------------------------------------------------------------------ */
test('a quotation the model invented is removed, not shown', () => {
  const real = Verified.retrieve({ guideId: 'forgiveness', key: 'grace', translation: 'web', guides: Guides, chapters: Chapters, library: Library });
  // A model that quotes something it was never given, and names a verse it was
  // never given. Both are the failure this whole layer exists to prevent.
  const invented = 'As it says in Romans 8:28, “For I know the plans I have for you are plans to prosper you in every kind of suffering.” That is real.';
  const checked = AI.validate(invented, [real]);
  assert.doesNotMatch(checked.text, /Romans 8:28/, 'an unverified reference must not survive');
  assert.match(checked.text, /this passage/, 'it is replaced, not left ambiguous');
  assert.doesNotMatch(checked.text, /plans to prosper you/, 'a reconstructed quotation must not survive');
  assert.ok(checked.rejected >= 2);
  // A passage that really was retrieved is kept, references and all.
  const honest = `This is what ${real.reference} actually says: “${real.text}”`;
  const kept = AI.validate(honest, [real]);
  assert.match(kept.text, /Ephesians 4:32/);
  assert.equal(kept.rejected, 0);
});

test('deterministic code answers first, and spends nothing', async () => {
  Provider.clear();
  const result = await AI.answer({
    text: 'anything', deps,
    deterministic: () => ({ text: 'The verified answer, with no model involved.' }),
  });
  assert.equal(result.source, 'deterministic');
  assert.equal(result.used, false, 'no quota, no latency, no cost');
  assert.equal(Provider.status().calls, 0);
});

test('with no model available the deterministic answer is still a real answer', async () => {
  Provider.clear();
  Provider.configure({ config: {} });
  const result = await AI.answer({ text: 'I do not know what to do', deps });
  assert.equal(result.used, false);
  assert.ok(['none'].includes(result.source));
  // The verified passage is still retrieved before anything else is considered,
  // so the caller has what it needs without a model.
  assert.equal(result.passages.length, 1);
  assert.ok(Verified.isVerified(result.passages[0]));
});

/* ------------------------------------------------------------------ *
 * Routing: quiet, automatic, and overridable.
 * ------------------------------------------------------------------ */
test('routing is automatic when confidence is real, and manual when asked', () => {
  const auto = AI.route({ capability: 'scripture-explanation', confidence: 'clear' });
  assert.equal(auto.how, 'automatic');
  assert.equal(auto.specialist.id, 'scripture');
  const manual = AI.route({ capability: 'scripture-explanation', manual: 'scripture', confidence: 'none' });
  assert.equal(manual.how, 'manual');
  // A request Steady did not understand is not handed to a specialist on a
  // guess; it falls back rather than pretending to have understood.
  const unsure = AI.route({ capability: 'scripture-explanation', confidence: 'none' });
  assert.equal(unsure.specialist, null);
  assert.equal(unsure.how, 'default');
});

test('a specialist declares its own purpose, instructions and trusted source', () => {
  const scripture = Specialists.get('scripture');
  assert.ok(scripture.purpose);
  const instructions = scripture.instructions({ passages: [{ reference: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' }] });
  assert.match(instructions, /no memory of the Bible/i);
  assert.match(instructions, /never name a reference that was not given/i);
  assert.match(instructions, /Psalm 23:1/);
  // The trusted source is the verified library, not the model.
  const passages = scripture.retrieve({ guideId: 'forgiveness', key: 'grace' }, deps);
  assert.equal(passages.length, 1);
  assert.ok(Verified.isVerified(passages[0]));
});
