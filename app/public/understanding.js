'use strict';
/*
 * Understanding: the one capability that earns AI.
 *
 * Principle: deterministic where possible, AI where understanding is required.
 * Recognising what someone actually means, and telling "I don't know what to do"
 * apart from "I know what to do but can't start", is interpretation. Rules
 * approximate it; a model does it. Everything else in Steady -- Scripture,
 * time, settings, storage, navigation, calculations -- stays deterministic and
 * must not be routed through here.
 *
 * This module is the seam. The rules implementation below is what ships today
 * and costs nothing. Replacing it with a model means writing one function that
 * returns the same shape, and nothing else in the app changes: the contract, not
 * the implementation, is what the rest of Steady depends on.
 *
 * The contract:
 *   theme      which verified passage family fits
 *   guide      which help guide explains it
 *   difficulty 'direction' | 'starting' | 'both' | 'unclear'
 *              the distinction that changes the help, kept explicit and separate
 *              from theme because the same theme is reached two different ways
 *   confidence 'clear' | 'weak' | 'none'
 *              deliberately coarse. A number here would be invented precision;
 *              routing needs a band, not a probability.
 *   basis      'rules' today. 'model' once a model produces it. Recorded so the
 *              source of an interpretation is never anonymous to the reader.
 *
 * Nothing here generates Scripture. Understanding chooses which verified
 * passage to retrieve; it never produces the passage's words.
 */
const SteadyUnderstanding = (() => {
  // "I don't know what to do" -- the step that is missing is a decision.
  const direction = [
    /\b(?:don'?t|do not|does ?n'?t|did ?n'?t|no)\s+(?:idea\s+)?know\s+(?:what|which|how|where)\b/,
    /\b(?:no|not)\s+(?:idea|clue)\s+(?:at all\s+)?(?:what|which|how)\b/,
    /\b(?:can'?t|cannot|unable to|don'?t know how to)\s+(?:decide|choose|pick|choose between)\b/,
    /\b(?:what|which)\s+(?:way|path|option|steps?)\s+(?:should|do|to take|would be)\b/,
    /\b(?:lost|adrift|nowhere|going in circles)\b/,
    /\b(?:don'?t|do not|not)\s+know\s+where\s+to\s+(?:start|begin)\b/,
    /\btoo many (?:options|choices|ways|possibilities)\b/,
  ];
  // "I know what to do but I can't start" -- the decision is made; the beginning
  // is what is not happening.
  const starting = [
    /\b(?:keep|keeps|kept|always)\s+(?:putting|procrastinating|delaying|avoiding|postponing)\b[^.]{0,14}\boff\b/,
    /\bprocrastinat/,
    /\b(?:can'?t|cannot|unable to|struggle to|struggling to)\s+(?:start|begin|get started|get going|get moving|motivate)\b/,
    /\b(?:never|haven'?t|have not|not)\s+(?:get\s+|got\s+|managed to\s+)?(?:start|began|begun|start)\w*/,
    /\bkeep(?:s|ing)?\s+(?:meaning to|intending to|saying i'?ll|telling myself)\b/,
    // "Stuck" only counts as difficulty starting when it is about starting.
    // A bare "I feel stuck" is emotional weight, not friction, and reading it as
    // a block made the two kinds of help compete for the same words.
    /\b(?:stuck|stalled|blocked)\s+(?:on|with|at|starting|beginning|to start)\b/,
    /\b(?:paralysed|paralyzed)\b/,
    /\b(?:so much|too much|too many) (?:to do|to think about|on at once)\b/,
    /\b(?:motivation|energy) to (?:start|begin|do it)\b/,
  ];

  // A clause is a statement the person actually made, not one they denied.
  // "I am not stuck any more" must not be read as being stuck.
  const negated = (clause, index) => {
    const before = clause.slice(Math.max(0, index - 28), index);
    if (/\b(?:not|never|no longer|don'?t|dont|doesn'?t|didn'?t|cannot|can'?t|won'?t|wouldn'?t)\b[^.]*$/i.test(before)) return true;
    if (/\b(?:stopped|quit|finally|managed to)\b[^.]*$/i.test(before)) return true;
    return false;
  };
  const clausesOf = text => String(text || '')
    .toLowerCase().normalize('NFKC').replace(/[‘’]/g, "'")
    .split(/[.!?;\n]+|(?:\s+and\s+)|(?:\s+but\s+)/).map(part => part.trim()).filter(Boolean);

  /*
   * The distinction itself. Evidence is gathered per clause so a denial in one
   * part of the sentence cannot cancel a real admission in another, and both
   * are reported when both are genuinely there rather than being forced into
   * one. Returning 'unclear' is a real answer: most writing does not name either.
   */
  function difficultyOf(text) {
    const clauses = clausesOf(text);
    // matchAll needs a global regex, and the patterns are written as plain
    // literals so they stay readable. Index is carried through because a denial
    // has to be judged against the words immediately before the match.
    const hits = patterns => patterns.some(pattern => clauses.some(clause =>
      [...clause.matchAll(new RegExp(pattern.source, 'g'))].some(word => !negated(clause, word.index))));
    const needsDirection = hits(direction);
    const needsStarting = hits(starting);
    if (needsDirection && needsStarting) return 'both';
    if (needsDirection) return 'direction';
    if (needsStarting) return 'starting';
    return 'unclear';
  }

  /*
   * Understand what someone wrote. `matcher` is the rules implementation; the
   * return value is the contract every other part of Steady relies on.
   */
  function understand(text, history, matcher) {
    const raw = matcher.match(text, history || []);
    const difficulty = difficultyOf(text);
    // Coarse on purpose. A clear match is a specific guide with real keyword
    // evidence; a fallback means nothing was recognised, and Steady should say
    // so plainly rather than dress a guess as understanding.
    const confidence = raw.urgent ? 'clear' : raw.matched ? 'clear' : 'none';
    return {
      theme: raw.key,
      guide: raw.guide || null,
      matched: Boolean(raw.matched),
      difficulty,
      confidence,
      basis: 'rules',
      urgent: Boolean(raw.urgent),
      safety: raw.urgent ? 'urgent' : null,
      reason: raw.reason || '',
      relatedId: raw.relatedId || null,
      // The rules result is kept intact so existing callers keep working
      // unchanged. This is what makes the implementation replaceable.
      result: raw,
    };
  }

  return Object.freeze({ understand, difficultyOf, difficulties: Object.freeze(['direction', 'starting', 'both', 'unclear']) });
})();

if (typeof window !== 'undefined') window.SteadyUnderstanding = SteadyUnderstanding;
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyUnderstanding;
