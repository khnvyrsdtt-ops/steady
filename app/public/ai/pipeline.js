'use strict';
/*
 * The request flow.
 *
 *   user input
 *     -> can deterministic code handle it?   yes -> answer, no model call
 *     -> understand                          what did they mean
 *     -> route                               a specialist, quietly
 *     -> retrieve                            trusted, verified material
 *     -> free model                          reasoning over that material
 *     -> validate                            the answer may not outrun its sources
 *
 * Three properties this flow is built to keep, in order of how much damage
 * breaking them would do:
 *
 *   1. Scripture is never generated. The model is given verified passages and is
 *      asked to reason over them; the words of the quotation are supplied by the
 *      composer, from the sealed passage, not by the model. Validation then
 *      removes any reference or quotation that cannot be traced to a retrieved
 *      passage, so a hallucinated citation cannot survive to the reader.
 *
 *   2. No model call is made when ordinary code is reliable. The deterministic
 *      handler is asked first and, when it can answer, nothing else runs. Most
 *      of Steady never reaches the model at all.
 *
 *   3. No model call is made that could cost money. The provider layer refuses
 *      metered providers, applies a daily ceiling, and treats an exhausted quota
 *      as an ordinary outcome. When there is no model, the answer is the
 *      deterministic one and the app is otherwise unchanged.
 */
const SteadyAI = (() => {
  /*
   * The app loads plain scripts; the tests load modules. Resolving whichever is
   * present keeps one file correct in both, and resolving lazily means the
   * order of script tags in index.html cannot break the layer.
   */
  const dep = (relPath, name) => (typeof module !== 'undefined' && module.exports
    ? require(relPath)
    : globalThis[name]);
  const understanding = () => dep('../understanding.js', 'SteadyUnderstanding');
  const providers = () => dep('./provider.js', 'SteadyAIProvider');
  const specialists = () => dep('./specialists.js', 'SteadySpecialists');
  const catalogue = () => dep('./providers.js', 'SteadyAIProviders');

  const registered = new Set();
  function enableFreeProviders() {
    if (registered.size) return;
    catalogue().registerable().forEach(provider => providers().register(provider));
    registered.add('free');
  }

  const normaliseReference = value => String(value || '')
    .toLowerCase().replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();

  /*
   * Validation. Two things are checked, because they are the two ways a model
   * can outrun its sources: a citation it was never given, and a quotation it
   * reconstructed. Anything untraceable is removed rather than shown, and the
   * removal is reported so the caller can fall back for the Scripture part.
   */
  function validate(text, passages) {
    const allowed = new Set(passages.map(p => normaliseReference(p.reference)));
    const bodies = passages.map(p => normaliseReference(p.text));
    let rejected = 0;

    // A citation is a capitalised name followed by chapter:verse. Anything of
    // that shape which is not one of the passages we retrieved is discarded.
    let out = String(text || '').replace(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(\d+:\d+(?:\s*[-\u2013]\s*\d+)?)/g,
      (match, name, cite) => {
        if (allowed.has(normaliseReference(`${name} ${cite}`))) return match;
        rejected += 1;
        return 'this passage';
      });

    // A long quoted span is a quotation. It is kept only if it is actually in a
    // retrieved passage, so a verse recalled from memory cannot be shown as one.
    out = out.replace(/[\u201c"]([^\u201d"]{40,})[\u201d"]/g, (match, body) => {
      const found = bodies.some(full => full.includes(normaliseReference(body)));
      if (found) return match;
      rejected += 1;
      return '';
    });

    return { text: out.replace(/[ \t]{2,}/g, ' ').trim(), rejected };
  }

  /*
   * Choose a specialist. Quiet by default: a manual choice is honoured, otherwise
   * capability decides, and a low-confidence read falls back rather than guessing
   * a specialist for a request it did not really understand.
   */
  function route({ capability, manual, confidence }) {
    if (manual) {
      const chosen = specialists().get(manual);
      if (chosen) return { specialist: chosen, how: 'manual' };
    }
    const match = specialists().all().find(s => s.capability === capability);
    if (match && confidence !== 'none') return { specialist: match, how: 'automatic' };
    return { specialist: null, how: 'default' };
  }

  /*
   * Answer a request. Never throws: every stage degrades to something Steady can
   * already do on its own, and the result says which route produced it.
   */
  async function answer({
    text, history = [], deterministic, capability = 'scripture-explanation',
    manualSpecialist, deps = {}, signal,
  } = {}) {
    // 1. Can ordinary code do this reliably? If so there is no reason to spend
    //    a request, a second of latency, or any quota on it.
    if (typeof deterministic === 'function') {
      const sure = await deterministic({ text, history });
      if (sure && sure.text) return { source: 'deterministic', used: false, text: sure.text, passages: sure.passages || [], reason: 'handled-without-a-model' };
    }

    // 2. Understand.
    const understood = deps.matcher
      ? understanding().understand(text, history, deps.matcher)
      : { theme: null, guide: null, difficulty: understanding().difficultyOf(text), confidence: 'none', basis: 'rules', urgent: false, reason: '', result: {} };

    // 3. Route.
    const { specialist, how } = route({ capability, manual: manualSpecialist, confidence: understood.confidence });
    if (!specialist) {
      return { source: 'none', used: false, text: '', passages: [], understanding: understood, routing: how, reason: 'no-specialist-for-this-request' };
    }

    // 4. Retrieve verified material, before any model is involved. What is
    //    retrieved is decided by the understanding step: the theme and guide it
    //    recognised, never anything the model gets to choose.
    const passages = specialist.retrieve(
      { text, history, ...deps, guideId: deps.guideId || understood.guide, key: deps.key || understood.theme },
      deps,
    ) || [];
    if (!passages.length) {
      return { source: 'none', used: false, text: '', passages: [], understanding: understood, routing: how, specialist: specialist.id, reason: 'nothing-verified-to-reason-over' };
    }

    // 5. Reason, on a free route only.
    enableFreeProviders();
    const reply = await providers().complete({
      system: specialist.instructions({ text, passages, understanding: understood }),
      prompt: buildPrompt({ text, passages }),
      preferred: deps.preferredProvider,
      capability: specialist.id,
      signal,
    });
    if (!reply.ok) {
      // No model, no quota, or no route. The deterministic answer is still a
      // real answer, which is why the app is never dependent on the layer above.
      return { source: 'none', used: false, text: '', passages, understanding: understood, routing: how, specialist: specialist.id, reason: reply.reason };
    }

    // 6. Validate, then hand back. The passage words are not the model's to
    //    supply, so what is returned is reasoning plus the sealed quotation.
    const checked = validate(reply.text, passages);
    return {
      source: 'model', used: true, text: checked.text, passages,
      understanding: understood, routing: how, specialist: specialist.id,
      provider: reply.provider, model: reply.model, ms: reply.ms,
      rejected: checked.rejected, reason: 'answered-by-free-model',
    };
  }

  function buildPrompt({ text, passages }) {
    const quoted = passages.map(p => `${p.reference}\n“${p.text}”`).join('\n\n');
    return [
      'A person has written this:',
      '',
      text,
      '',
      'Using only the verified passages below, help them understand them.',
      'Do not quote any other verse and do not name any other reference.',
      '',
      quoted,
    ].join('\n');
  }

  return Object.freeze({ answer, validate, route, enableFreeProviders, _internals: { understanding, providers, specialists } });
})();

if (typeof window !== 'undefined') window.SteadyAI = SteadyAI;
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyAI;
