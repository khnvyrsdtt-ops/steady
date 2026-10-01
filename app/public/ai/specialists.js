'use strict';
/*
 * Specialists.
 *
 * A specialist is a role: its own purpose, instructions, permitted tools,
 * trusted sources, responsibilities and behaviour. They all share the one
 * provider layer, so a user meets a single coherent Steady rather than several
 * disconnected chatbots -- routing is invisible, and the person simply finds
 * that the right kind of help arrived.
 *
 * This is a registry, not a framework. Adding a specialist later means adding an
 * entry with these fields. Nothing in the pipeline changes, and no feature needs
 * to know which specialist exists.
 *
 * One specialist ships today, because one is what Steady actually needs. The
 * second is deliberately not built: an unbuilt animal costs nothing and does
 * nothing, and the routing contract above is what future ones plug into.
 */
const SteadySpecialists = (() => {
  const registry = new Map();

  /*
   * register({id, name, purpose, instructions, retrieve, capability, trust})
   *
   *   id           stable key, also used for the manual override
   *   name         what the person experiences, not a product name
   *   purpose      one line, in Steady's language
   *   instructions the system instructions handed to a model
   *   retrieve     (input, deps) => verified material, from the trusted sources
   *   capability   the kind of request it handles, for routing
   */
  function register(specialist) {
    if (!specialist || typeof specialist.id !== 'string') throw new Error('A specialist needs an id');
    if (typeof specialist.instructions !== 'function') throw new Error(`Specialist ${specialist.id} needs instructions()`);
    if (typeof specialist.retrieve !== 'function') throw new Error(`Specialist ${specialist.id} needs retrieve()`);
    registry.set(specialist.id, Object.freeze({
      name: specialist.id, purpose: '', capability: 'general', ...specialist,
    }));
    return specialist.id;
  }
  const get = id => registry.get(id) || null;
  const all = () => [...registry.values()];
  const clear = () => registry.clear();

  /*
   * The Scripture specialist. Its rules are the load-bearing part:
   *   - it may only be handed text from the verified library, by construction;
   *   - it is instructed that it has no memory of Scripture and must not
   *     reconstruct a verse, paraphrase one as a quotation, or name a reference
   *     it was not given;
   *   - the composer, not the model, supplies the words of the passage.
   * Those rules are enforced by validate() downstream; the instruction below is
   * the part that makes a model want to obey them in the first place.
   */
  const scripture = Object.freeze({
    id: 'scripture',
    name: 'Burden',
    purpose: 'Help someone understand Scripture that has been verified in front of them.',
    capability: 'scripture-explanation',
    instructions(context) {
      const passages = (context.passages || []).map(p => `${p.reference}\n“${p.text}”`).join('\n\n');
      return [
        'You are helping one person understand Bible passages. You are calm, plain and brief.',
        '',
        'You have no memory of the Bible. You must never reconstruct, paraphrase or',
        'complete a verse, and never name a reference that was not given to you.',
        'Quote only from the passages below, exactly as written. If you do not know',
        'how something connects to them, say what they do say and stop.',
        '',
        'Write 2-4 short sentences. No headings, no lists, no verses from elsewhere,',
        'and no advice about the life of the person that they did not ask for.',
        '',
        passages ? 'The verified passages:\n' + passages : 'No passage could be verified, so say so plainly rather than filling the gap.',
      ].join('\n');
    },
    retrieve(input, deps) {
      // Which passage to use comes from the request; where it comes from is the
      // trusted data the layer was given. The two are deliberately separate.
      const { guideId, key } = input || {};
      const { verified, guides, chapters, library, translation } = deps || {};
      if (!verified) return [];
      const passage = verified.retrieve({ guideId, key, translation: (input || {}).translation || translation, guides, chapters, library });
      return passage ? [passage] : [];
    },
  });

  register(scripture);

  return Object.freeze({ register, get, all, clear });
})();

if (typeof window !== 'undefined') window.SteadySpecialists = SteadySpecialists;
if (typeof module !== 'undefined' && module.exports) module.exports = SteadySpecialists;
