'use strict';
/*
 * The Scripture trust boundary.
 *
 * Principle: deterministic where possible, AI where understanding is required.
 * Understanding may be delegated, but Scripture may not. This module is the one
 * doorway Scripture travels through, so "which text was retrieved, and where did
 * it come from" has a single answer that can be checked.
 *
 * Rules this module keeps:
 *   1. Text is only ever copied from the stored, verified library. Nothing here
 *      composes, paraphrases, summarises or completes a verse.
 *   2. If the library cannot supply a passage, the result is `null`. A gap is
 *      reported, never filled in.
 *   3. Every passage is sealed with its origin, so a caller can tell retrieved
 *      Scripture from any other string on the page.
 *   4. Sealed passages are frozen, so a generated explanation cannot reach in
 *      and adjust the text after the fact.
 *
 * Generation reads from these objects. It never writes to them.
 */
const SteadyVerifiedScripture = (() => {
  const seal = (passage, origin) => Object.freeze({
    ...passage,
    // The provenance that makes the guarantee checkable rather than promised.
    origin: Object.freeze({ ...origin, verified: true, text: 'verified-library' }),
  });
  const isVerified = passage => Boolean(passage && passage.origin && passage.origin.verified);

  /*
   * Retrieve the passage for a named help guide. `guides` is the guide table and
   * `chapters` the manifest-generated chapter library, both deterministic data.
   * Returns null when the guide has no passage, or when the stored verses do not
   * form an unbroken run -- a range spanning a missing verse yields nothing at
   * all, because a stitched-together quote is not a real quotation.
   */
  function fromGuide(guideId, translation, guides, chapters) {
    if (!guideId || !guides || !chapters) return null;
    const guide = guides[guideId];
    if (!guide) return null;
    const passage = guides.passage(guideId, translation, chapters);
    if (!passage) return null;
    return seal(passage, { via: 'help-guide', guide: guideId, translation: String(translation || '') });
  }

  /*
   * Retrieve the passage a built-in theme points at, used when no help guide
   * applies. Same guarantees: copied from the library, or nothing at all.
   */
  function fromTheme(key, translation, library) {
    const entry = library && library[key];
    const verse = entry && entry.translations && entry.translations[translation];
    if (!entry || !verse || typeof verse.text !== 'string' || !verse.text.trim()) return null;
    return seal({ reference: entry.reference, text: verse.text, source: verse.source },
      { via: 'theme', theme: key, translation: String(translation || '') });
  }

  /*
   * The one call a reply needs. Prefers the guide's passage, falls back to the
   * theme's, and reports honestly when neither can be sourced.
   */
  function retrieve({ guideId, key, translation, guides, chapters, library }) {
    return fromGuide(guideId, translation, guides, chapters) || fromTheme(key, translation, library);
  }

  /*
   * The reference shown to the reader must describe the passage that is actually
   * on screen. Reading the reference off the sealed object rather than recomputing
   * it is what keeps the two from drifting apart.
   */
  function referenceOf(passage) {
    return isVerified(passage) ? passage.reference : '';
  }

  return Object.freeze({ retrieve, referenceOf, isVerified });
})();

if (typeof window !== 'undefined') window.SteadyVerifiedScripture = SteadyVerifiedScripture;
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyVerifiedScripture;
