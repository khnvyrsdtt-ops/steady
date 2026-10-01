'use strict';
/*
 * Burden's animals.
 *
 * One family, four forms of help from the same verified guide. Selection
 * changes how the approved guidance is presented, never the source of claims.
 *
 * Three ideas hold this together:
 *
 *   AnimalCharacter  what one animal is: artwork, name, role, temperament, and
 *                    how it moves. Data, so a fifth specialist is an entry and
 *                    not a rewrite.
 *   AnimalState      the four shared beats every animal expresses: idle,
 *                    thinking, ready, and the handover. One animation system,
 *                    four animals with slightly different manners inside it.
 *   CharacterRouter  which animal is right, decided by the overall shape of what
 *                    was asked rather than by any single word.
 *
 * The router is deliberately conservative. It classifies the whole request,
 * requires a clear margin over the runner-up and over whoever is already here,
 * and falls back to Burden whenever it is not sure. A portrait that flickers
 * because of one stray word would be worse than a portrait that never moves.
 */
const SteadyAnimals = (() => {
  const BURDEN = 'donkey', SAGE = 'owl', SCOUT = 'fox', STEADY = 'tortoise';

  // The shared beats. Names are ours; the values are what the CSS keys on.
  const State = Object.freeze({ IDLE: 'idle', THINKING: 'thinking', READY: 'ready', HANDOVER: 'handover' });
  const STATES = Object.freeze([State.IDLE, State.THINKING, State.READY, State.HANDOVER]);

  const CHARACTERS = Object.freeze({
    // Burden is the default and the fallback. She is not a specialist; she is
    // the one who is always there, which is why she answers for anything that
    // does not clearly belong elsewhere.
    [BURDEN]: Object.freeze({
      id: BURDEN, name: 'Burden', label: 'BALANCED HELP', summary: 'Balanced support for anything on your mind.', role: 'balanced general support, overwhelm, weight, being stuck, uncertainty',
      temperament: ['patient', 'grounded', 'dependable'],
      artwork: './art/animals/burden-painted.png',
      // Manner within the shared beats, in pixels the stylesheet reads. Steady
      // enough to be recognisable, small enough to be missed.
      manner: { lift: 1, nudge: 2, glance: 0, lean: 'right' },
    }),
    [SAGE]: Object.freeze({
      id: SAGE, name: 'Sage', label: 'SCRIPTURE GUIDE', summary: 'Explore Scripture and understand its meaning.', role: 'understanding, learning, explanation, meaning, Bible and context',
      temperament: ['thoughtful', 'observant', 'calm'],
      artwork: './art/animals/sage-painted.png',
      // Sage holds almost still. It is the one that looks rather than moves, so
      // it takes the smallest step aside and barely breathes.
      manner: { lift: 1, nudge: 1, glance: 0, lean: 'right' },
    }),
    [SCOUT]: Object.freeze({
      id: SCOUT, name: 'Scout', label: 'DECISION GUIDE', summary: 'Compare choices and find a way forward.', role: 'decisions, comparing options, working out what to do, approaches',
      temperament: ['alert', 'practical', 'curious'],
      artwork: './art/animals/scout-painted.png',
      // Scout watches. It takes the longest step aside and is the only one whose
      // thinking beat moves sideways, because deciding is what it is looking at.
      manner: { lift: 1, nudge: 3, glance: 2, lean: 'left' },
    }),
    [STEADY]: Object.freeze({
      id: STEADY, name: 'Steady', label: 'GENTLE STEPS', summary: 'Take one small step when energy is low.', role: 'tiredness, low energy, difficulty starting, friction',
      temperament: ['calm', 'persistent', 'unhurried'],
      artwork: './art/animals/steady-painted.png',
      // Almost motionless. An unhurried animal that fidgets would contradict
      // the thing it is here to say.
      manner: { lift: 1, nudge: 1, glance: 0, lean: 'right' },
    }),
  });

  const DEFAULT = BURDEN;
  const all = () => Object.keys(CHARACTERS).map(id => CHARACTERS[id]);

  // ------------------------------------------------------------ routing ----
  /*
   * Concept groups rather than keywords. Each group is a *kind of help*, and a
   * request is classified by which kind dominates the whole of it. The cue
   * words are only evidence for a group; no single word can select an animal on
   * its own, which is what stops "should I" flicking the portrait.
   */
  /*
   * Written as tolerant stems, not exact words. `overwhelm\b` silently fails to
   * match "overwhelmed", and a classifier that quietly misses the commonest
   * word for its own case is worse than no classifier: it looks deliberate
   * while getting it wrong.
   */
  const GROUPS = {
    // Each entry is [pattern, weight]. The weight is how decisive that cue is on
    // its own: a phrase like "what does this mean" settles the question by
    // itself, while a broad word like "options" is only worth noticing. Without
    // this, a single unambiguous request -- "help me understand Romans 8" --
    // scored too little to ever be believed, and the portrait never moved.
    [SAGE]: [
      [/\b(?:what|why|how)\b[^.?!]{0,28}\b(?:mean|means|meant|meaning|happen(?:s|ed)?|said|teach(?:es|ed)?)\b/, 3],
      [/\b(?:explain(?:ed|ing)?|what does .{0,20} mean|understand(?:ing)?|significance|context|background)\b/, 2],
      [/\b(?:bible|scripture|verse|verses|passage|christ|jesus|god|faith|pray|prayer|prayers|psalm|psalms|proverbs|gospel|testament|epistle|disciple(?:s)?|apostle(?:s)?|parable|prophecy|doctrine|repentance|righteousness|redemption|trinity|atonement|resurrection)\b/, 2],
      [/\b(?:romans|john|matthew|mark|luke|acts|1\s?corinthians|2\s?corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|hebrews|james|peter|revelation|deuteronomy|genesis|exodus|samuel|kings|chronicles|ezra|nehemiah|esther|psalm|proverbs|ecclesiastes|isaiah|jeremiah|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi)\b/i, 2],
      [/\b\d{1,3}\s?:\s?\d{1,3}\b/, 3],
      [/\b(?:stud(?:y|ies|ying)|learn(?:ing|ed|t)?|lesson|read(?:ing)?|reflection|reflect(?:ing|ed)?|discover(?:y|ed)?)\b/, 1],
      [/\b(?:want(?:s|ing)? to (?:learn|understand|know)|help me (?:learn|understand)|more about|what is .{0,24} about)\b/, 2],
      [/\b(?:who was|which book|where in|testimony|contex(?:t|ual)|what is .{0,20} about)\b/, 2],
    ],
    [SCOUT]: [
      [/\b(?:decid(?:e|ed|es|ing)|decisions?|choos(?:e|ing)|choices?|pick(?:ing|ed)?|option(?:s)?|alternative(?:s)?|compar(?:e|ed|ing|ison))\b/, 2],
      [/\b(?:which (?:way|path|one|should|of)|what should i|what do i do|how do i decide|best (?:option|way|choice|route))\b/, 3],
      [/\b(?:between|versus|vs\.?|trade[- ]?offs?|weigh(?:ing)? up|figure out|plan(?:ning)?|route|approach(?:es)?|direction|next move)\b/, 1],
      [/\b(?:job offers?|two (?:choices|options)|several (?:choices|options))\b/, 2],
      [/\b(?:should i|would it|is it (?:better|worth)|pros and cons|narrow(?:ing)? (?:it )?down)\b/, 2],
    ],
    [STEADY]: [
      [/\b(?:tired|exhausted|no energy|low on energy|low energy|run down|shattered|faded|too tired|drained)\b/, 2],
      [/\b(?:procrastinat\w*|put(?:ting)? (?:it |them |this )?off|avoid(?:ing|ance)? (?:it|them)?|drag(?:ging)? my feet|trouble starting|hard to start)\b/, 2],
      [/\b(?:can'?t start|cannot start|can'?t begin|cannot begin|can'?t get started|cannot get started|struggling to (?:start|begin)|difficult to (?:start|begin)|won'?t start)\b/, 3],
      [/\b(?:take (?:one |a )?small step|one small step|help me (?:get started|begin)|what(?:'s| is) (?:the |my )?(?:best |right )?next step)\b/, 3],
      [/\b(?:letharg\w*|friction|apathy|dragging|motivation|no energy left|can'?t be bothered|don'?t have it in me)\b/, 1],
    ],
    [BURDEN]: [
      [/\b(?:overwhelm\w*|too much|burden\w*|heavy|weigh(?:t|ing)? (?:on|down)|drown(?:ing|ed)|swamped|burnt? out)\b/, 2],
      [/\b(?:stuck|lost|nowhere|hopeless|helpless|trapped|can'?t cope|falling apart|breaking point|no idea what)\b/, 2],
      [/\b(?:anxious\w*|anxiety|afraid|scared|worried|worry|worries|panic\w*|terrified|unsafe|scared stiff)\b/, 2],
      [/\b(?:sad\w*|grief|grieving|lonely|alone|ashamed|shame|guilt\w*|empty|hurt|painful)\b/, 2],
      [/\b(?:everything|all of it|any of it|so many things|at my limit|can'?t take)\b/, 1],
    ],
  };

  /*
   * Is this match actually denied?
   *
   * Two failure modes had to be closed. Looking back too far let a negator from a
   * different part of the sentence cancel a real cue -- in "three options and
   * cannot decide" the "cannot" belongs to the decision, not to a denial of it,
   * and the cue was being thrown away. And several cues deliberately contain a
   * negator ("cannot start"), so a match that carries one can never be a denial.
   */
  const NEGATORS = /\b(?:not|never|no longer|don'?t|dont|doesn'?t|didn'?t|cannot|can'?t|won'?t|wouldn'?t|isn'?t|wasn'?t)\b/i;
  /*
   * A specific phrase like "no energy" is not a keyword; a bare "decide" is, and
   * neither is "should i". A single cue may stand alone only when it is a real
   * multi-word condition AND the message is long enough to be a statement rather
   * than a fragment. That is the line the brief asks for, and without the
   * second half "should i" was quietly sending everyone to the fox.
   */
  const isPhrase = (matched, text) => {
    if (typeof matched !== 'string') return false;
    const phraseWords = matched.trim().split(/\s+/).filter(Boolean).length;
    const saidWords = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return phraseWords >= 2 && saidWords >= 3;
  };

  const negated = (clause, index, matched) => {
    // A match that contains the negator is the negator, not a denial of one.
    if (matched && NEGATORS.test(matched)) return false;
    // Only look back a short way, and never across a clause boundary.
    const before = clause.slice(Math.max(0, index - 14), index);
    if (/[,;:]|\band\b|\bbut\b|\bthough\b|\balthough\b/i.test(before)) return false;
    if (NEGATORS.test(before)) return true;
    if (/\b(?:stopped|quit|finally|managed to)\b[^.]*$/i.test(before)) return true;
    return false;
  };

  const clausesOf = text => String(text || '')
    .toLowerCase().normalize('NFKC').replace(/[‘’]/g, "'")
    .split(/[.!?;\n]+/).map(part => part.trim()).filter(Boolean);

  /*
   * Classify one request. Returns a ranked set of scores rather than a bare
   * answer, because the caller needs to know how sure we are before it is
   * willing to move anyone's portrait.
   */
  function classify(text, understanding) {
    const clauses = clausesOf(text);
    const scores = {};
    const cues = {};
    const phrases = {};
    for (const [animal, patterns] of Object.entries(GROUPS)) {
      let score = 0;
      let count = 0;
      let longest = '';
      for (const [pattern, weight] of patterns) {
        for (const clause of clauses) {
          for (const word of clause.matchAll(new RegExp(pattern.source, 'g'))) {
            if (negated(clause, word.index, word[0])) continue;
            // A phrase is stronger evidence than a bare word: "too much" and
            // "no energy" carry more than "much" or "energy" would.
            score += weight * (1 + Math.min(3, Math.floor(word[0].length / 6)));
            count += 1;
            if (word[0].length > longest.length) longest = word[0];
          }
        }
      }
      scores[animal] = score;
      cues[animal] = count;
      phrases[animal] = longest;
    }

    // The understanding contract already separates "I don't know what to do"
    // from "I can't start", and the second of those is exactly Steady's case.
    // Reusing it here is the point of having built it as a seam.
    // The understanding contract is an independent reading of the request, not a
    // keyword, so when it separates "I can't start" from "I don't know what to
    // do" it earns a cue as well as the points. Without that, the clearest case
    // of all -- "I know what to do but I cannot start" -- never moved the tile.
    if (understanding && understanding.difficulty === 'starting') { scores[STEADY] += 2; cues[STEADY] += 1; }
    if (understanding && understanding.difficulty === 'direction') { scores[SCOUT] += 1; cues[SCOUT] += 1; }

    /*
     * A message that is carrying weight *and* asking a question is not a question.
     * If the distress group is present and two or more other kinds are also in
     * play, the person is holding something rather than consulting anyone, and
     * the fallback is the honest answer. Without this, a long mixed message was
     * won by whichever group happened to contain the longest phrase, which sent
     * the most distressed writing to the specialist who explains things.
     */
    const activeGroups = Object.values(scores).filter(value => value > 0).length;
    if (scores[BURDEN] > 0 && activeGroups >= 3) {
      return {
        scores, cues, phrases, animal: DEFAULT, score: scores[BURDEN],
        margin: 0, confidence: 'weak', carried: true,
      };
    }

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [top, topScore] = ranked[0];
    const runnerUp = ranked[1] ? ranked[1][1] : 0;
    return {
      scores,
      cues,
      phrases,
      animal: top,
      score: topScore,
      margin: topScore - runnerUp,
      // Confidence is coarse on purpose, matching the rest of Steady: a band,
      // not a probability. Below `clear` nobody changes.
      //
      // Two independent cues are always required, however heavy either one is.
      // Weighting alone made a bare "decide" or "tired" decisive, which is the
      // one thing this must never do: the portrait may not follow a keyword.
      confidence: topScore >= 3 && topScore - runnerUp >= 2 && (cues[top] >= 2 || isPhrase(phrases[top], text))
        ? 'clear'
        : topScore >= 2 ? 'weak' : 'none',
    };
  }

  /*
   * Choose the animal for this turn.
   *
   *   * a clear read chooses the best match for this request
   *   * unclear, weak or mixed requests return to Burden's balanced help
   *   * a manual choice stays put until the person returns to Automatic
   */
  function decide({ text, current, understanding } = {}) {
    const verdict = classify(text, understanding);
    const now = current && CHARACTERS[current] ? current : DEFAULT;
    // Manual means manual. Someone who chose this animal does not get moved off
    // it because the subject drifted, and nothing here expires that choice.
    if (isManual()) {
      return { animal: manualId, changed: manualId !== now, reason: 'chosen-by-hand', verdict, manual: true };
    }
    const best = !verdict.carried && verdict.confidence === 'clear' ? verdict.animal : DEFAULT;
    lastAutomatic = best;
    return {
      animal: best,
      changed: best !== now,
      reason: verdict.carried ? 'balanced-help-for-a-mixed-burden'
        : verdict.confidence === 'clear' ? (best === now ? 'already-right' : 'best-match-for-request')
          : 'balanced-help-when-unclear',
      verdict,
    };
  }

  /*
   * The decision, and the one point where it becomes visible.
   *
   * `decide` only works out which animal fits; it never touches the screen.
   * This wrapper announces the answer whenever it differs from the animal that
   * was asked about, so every portrait in the app is redrawn from the one
   * authoritative value rather than each part keeping its own.
   */
  function choose(request) {
    const result = decide(request);
    const asked = request && request.current && CHARACTERS[request.current] ? request.current : DEFAULT;
    if (result.animal !== asked) notify('routed');
    return result;
  }

  // A clear on-device interpretation can refine Automatic. Manual selection is
  // never displaced; weak interpretations return to Burden's balanced help.
  function chooseInterpretation(animal, confidence) {
    if(isManual())return {animal:manualId,changed:false,manual:true};
    const next=confidence==='clear'&&CHARACTERS[animal]?animal:DEFAULT;
    const changed=next!==current();
    lastAutomatic=next;
    if(changed)notify('interpreted-on-device');
    return {animal:next,changed,manual:false};
  }

  // --------------------------------------------------------- presentation ---
  /*
   * The tile is shared. Rendering never changes the container, the size or the
   * interaction -- it only says which portrait is in it and which beat it is
   * on. Keeping that in one place is what stops the animals turning into four
   * interfaces that happen to share a stylesheet.
   */
  const portraitVersions = new WeakMap();
  const advancePortrait = tile => {
    const version = (portraitVersions.get(tile) || 0) + 1;
    portraitVersions.set(tile, version);
    return version;
  };

  function render(tile, { animal, state } = {}) {
    if (!tile || !tile.setAttribute) return null;
    // A direct redraw supersedes any earlier delayed handover.
    advancePortrait(tile);
    tile.classList?.remove?.('is-handover', 'is-handover-next');
    const id = animal && CHARACTERS[animal] ? animal : DEFAULT;
    const beat = STATES.includes(state) ? state : State.IDLE;
    const character = CHARACTERS[id];
    tile.setAttribute('data-animal', id);
    tile.setAttribute('data-animal-state', beat);
    // Deliberately not touching data-expression. The stance library -- neutral,
    // concerned, relieved and the rest -- belongs to the existing code, and the
    // animals share its tile without taking any of it over. Overwriting it was
    // caught by the transcript tests asserting a greeting still reads as happy.
    //
    // No accessible name is set either. The tile is already aria-hidden, so a
    // label on it would be announced by nobody, and naming the specialist there
    // would also contradict the heading above it, which reads "Burden" always.
    // Burden is who you are talking to; the portrait is only who is helping.
    //
    // The manner is what makes the four feel like four rather than one animation
    // recoloured, so it is applied here rather than left as data nothing reads.
    if (tile.style && typeof tile.style.setProperty === 'function') {
      tile.style.setProperty('--animal-lift', character.manner.lift + 'px');
      tile.style.setProperty('--animal-nudge', character.manner.nudge + 'px');
      tile.style.setProperty('--animal-glance', character.manner.glance + 'px');
    }
    const image = tile.querySelector('img');
    if (image) {
      image.src = character.artwork;
      image.width = image.width || 29;
      image.height = image.height || 29;
      image.alt = '';
    }
    return { id, state: beat, character };
  }

  /*
   * A handover, kept deliberately small: whoever is here looks aside and steps
   * back, a beat of nothing, and the one taking over arrives. The tile, its
   * size, its position and the whole interface around it never change, so this
   * reads as one presence changing rather than as a character being selected.
   *
   * Under Reduce Motion the whole sequence collapses to a plain swap. The animal
   * still changes -- it is information, not decoration -- it simply does not
   * move while it does.
   */
  const reduceMotion = () => typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Timers are not guaranteed everywhere this runs, and a handover is started
  // without being awaited. Resolving immediately where there is no timer keeps
  // the portrait honest instead of leaving a promise that rejects after the
  // conversation has moved on.
  const wait = ms => (typeof setTimeout === 'function'
    ? new Promise(resolve => setTimeout(resolve, ms))
    : Promise.resolve());
  // Utility first, character second. This runs alongside the reply and never
  // blocks it, but it is still movement on screen, so it is kept to the shortest
  // time that still reads as a change of presence: about a third of a second.
  const ASIDE_MS = 160, PAUSE_MS = 40, ARRIVE_MS = 200;

  async function handover(tile, nextAnimal, { state } = {}) {
    if (!tile) return null;
    const from = tile.getAttribute ? (tile.getAttribute('data-animal') || DEFAULT) : DEFAULT;
    const to = nextAnimal && CHARACTERS[nextAnimal] ? nextAnimal : DEFAULT;
    if (from === to || reduceMotion() || typeof tile.classList === 'undefined') {
      return render(tile, { animal: to, state: state || State.IDLE });
    }
    const version = advancePortrait(tile);
    try {
      // Step aside, hold for a breath, then let the new portrait arrive.
      tile.classList.add('is-handover');
      await wait(ASIDE_MS);
      if (portraitVersions.get(tile) !== version) return null;
      render(tile, { animal: to, state: state || State.IDLE });
      tile.classList.remove('is-handover');
      tile.classList.add('is-handover-next');
      await wait(PAUSE_MS);
      tile.classList.remove('is-handover-next');
      await wait(ARRIVE_MS);
      return { from, to };
    } catch (error) {
      if (portraitVersions.get(tile) !== version) return null;
      // A portrait that cannot animate is still a portrait. Put the right animal
      // in the tile plainly rather than leaving it mid-gesture, or empty.
      try { tile.classList.remove('is-handover'); tile.classList.remove('is-handover-next'); } catch (e) { /* nothing to clean */ }
      return render(tile, { animal: to, state: state || State.IDLE });
    }
  }

  /*
   * Move a tile onto a shared beat. `ready` is a one-time acknowledgement, so it
   * is applied once and then handed back to `idle`; leaving it on `ready` would
   * keep replaying a movement meant to happen once.
   */
  function beat(tile, state) {
    if (!tile || !tile.setAttribute) return;
    if (!STATES.includes(state)) return;
    tile.setAttribute('data-animal-state', state);
    if (state === State.READY) {
      const settle = () => {
        if (tile.getAttribute && tile.getAttribute('data-animal-state') === State.READY) {
          tile.setAttribute('data-animal-state', State.IDLE);
        }
      };
      if (typeof setTimeout === 'function') setTimeout(settle, 700);
    }
  }

  /*
   * Automatic or manual.
   *
   * Automatic is the default and stays the default. Choosing an animal by hand
   * is a deliberate act, so it holds: the router is not allowed to quietly move
   * the portrait away from someone who just chose it. It holds until the choice
   * is handed back, and only the person can hand it back -- nothing here
   * expires a decision they made, because a preference that quietly resets is
   * worse than one that is hard to undo.
   */
  let mode = 'auto';
  let manualId = null;

  /*
   * A choice made by hand has to survive closing the app. Automatic is
   * re-decided every session, because that is the point of it, but a person who
   * picked an animal meant it, and a preference that quietly resets on the next
   * launch is worse than one that is hard to undo. Only the override is stored;
   * which animal the router happens to want today is not a decision to keep.
   */
  const STORE_KEY = 'steady.animal';
  const store = () => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch (_) { return null; } };
  const restore = () => {
    try {
      const raw = store()?.getItem(STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return;
      if (saved.mode === 'manual' && CHARACTERS[saved.id]) { mode = 'manual'; manualId = saved.id; }
      else if (saved.mode === 'auto') { mode = 'auto'; manualId = null; }
    } catch (_) { /* unreadable or unavailable storage: automatic is the safe default */ }
  };
  const persist = () => {
    try {
      store()?.setItem(STORE_KEY, JSON.stringify(isManual() ? { mode: 'manual', id: manualId } : { mode: 'auto' }));
    } catch (_) { /* the choice still holds for this session */ }
  };
  restore();

  /*
   * The one answer to "who is helping right now".
   *
   * Every branch of `choose` that reports a move records it here as well, so
   * this never disagrees with the verdict a caller just acted on. Nothing
   * outside this module keeps a second copy.
   */
  const isManual = () => mode === 'manual' && Boolean(manualId && CHARACTERS[manualId]);
  const setManual = id => {
    if (!id || !CHARACTERS[id]) return { ok: false, reason: 'unknown-animal' };
    // Every animal is choosable by hand, the default one included. Delegating
    // this to setAuto -- which is what used to happen -- threw the choice away
    // instead of holding it, so picking the donkey by hand left the portrait
    // free to be moved again on the very next request. "I want the donkey" and
    // "let Steady choose" are two different decisions, and the wheel already
    // offers them as two different controls.
    mode = 'manual';
    manualId = id;
    persist();
    notify('chosen-by-hand');
    return { ok: true, animal: id, mode, current: current() };
  };
  const setAuto = () => {
    mode = 'auto';
    manualId = null;
    // The automatic reading is re-decided from scratch, so the portrait goes
    // back to the one Steady starts from. Leaving the last automatic animal in
    // place let the wheel name one animal while the screen showed another.
    lastAutomatic = DEFAULT;
    persist();
    notify('automatic');
    return { ok: true, animal: DEFAULT, mode, current: current() };
  };

  /*
   * The registry as the wheel needs it. This is the same data the router uses,
   * handed across rather than restated, so the carousel cannot describe an
   * animal differently from the one that is actually chosen.
   */
  let lastAutomatic = DEFAULT;
  const describe = () => ({
    mode,
    manual: manualId,
    // Read through `current()` rather than restating it, so the wheel and the
    // page can never be told different things about who is helping.
    current: current(),
    animals: all().map(character => ({
      id: character.id,
      name: character.name,
      // One short line, said in Steady's voice. Secondary information, never a
      // card: the portrait is the information.
      role: character.summary,
      artwork: character.artwork,
    })),
  });

  const current = () => (isManual() ? manualId : (lastAutomatic || DEFAULT));

  /*
   * The single place a change is announced.
   *
   * Nothing outside this module keeps its own copy of the animal, so anything
   * that draws a portrait has to be told when the answer changes rather than
   * holding a value it read once. The screen that used to cache its own copy is
   * exactly why a choice made by hand appeared not to take effect until the app
   * was restarted: it was reading a value that nothing ever updated.
   */
  const listeners = [];
  const notify = reason => {
    const detail = { animal: current(), mode, manual: manualId, reason };
    for (const listener of listeners.slice()) {
      try { listener(detail); } catch (error) { /* a portrait must never break a choice */ }
    }
    return detail;
  };
  const subscribe = listener => {
    if (typeof listener !== 'function') return () => {};
    listeners.push(listener);
    // Answered at once, so a screen that mounts late is never left showing a
    // stale animal until the next request happens to change it.
    try { listener({ animal: current(), mode, manual: manualId, reason: 'subscribed' }); } catch (error) { /* as above */ }
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  };

  return Object.freeze({
    BURDEN, SAGE, SCOUT, STEADY,
    State, STATES, DEFAULT,
    characters: CHARACTERS, all,
    classify, choose, chooseInterpretation, render, handover, beat, reduceMotion,
    setManual, setAuto, isManual, describe, current, subscribe,
    get mode() { return mode; },
  });
})();

if (typeof window !== 'undefined') window.SteadyAnimals = SteadyAnimals;
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyAnimals;
