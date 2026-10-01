'use strict';
// The clock is context, not judgement.
//
// This module reads the device's local time and describes it. It never decides
// whether the person's schedule is healthy, late, lazy, wasteful or wrong. There
// is no score, no streak and no progress effect anywhere in here: the only
// thing time is allowed to do is change the *size* of the suggestion, and to
// occasionally ask whether their schedule is working for them.
//
// A person's rhythm is learned from their own history rather than assumed. We
// only treat a part of the day as "theirs" once they have used it on several
// separate days, so an unusual hour is never corrected on first sight.
const SteadyRhythm = (() => {
  // Names describe the clock on the wall. None of them imply a correct order
  // to a day, and none of them are shown to the person on their own.
  const parts = [
    { id:'overnight', from:0,  to:4,  label:'overnight' },
    { id:'early',     from:5,  to:7,  label:'early morning' },
    { id:'morning',   from:8,  to:11, label:'morning' },
    { id:'midday',    from:12, to:14, label:'midday' },
    { id:'afternoon', from:15, to:17, label:'afternoon' },
    { id:'evening',   from:18, to:21, label:'evening' },
    { id:'late',      from:22, to:23, label:'late evening' },
  ];
  const partIds = parts.map(part => part.id);
  // Separate days of evidence before we treat a part of the day as familiar.
  // Two is too few to call a pattern; three is enough to stop asking.
  const familiarAfter = 3;
  // The hours most people describe as a wind-down time. Being awake here is not
  // treated as a problem, so this only ever makes the offered step smaller.
  const isQuietHour = hour => hour >= 22 || hour < 5;
  // Slightly wider band, used for offering room rather than for correcting.
  const isOpenHour = hour => hour >= 8 && hour < 18;
  // Time can widen the choice earlier in the day; it never narrows it by lecture.
  const canStretch = part => ['morning','midday','afternoon'].includes(part);

  // Injectable clock so guidance stays deterministic under test while reading the
  // real device clock in normal use.
  let clock = () => new Date();
  const now = () => clock();
  const setNow = fn => { clock = typeof fn === 'function' ? fn : () => new Date(); };

  const partOf = hour => parts.find(part => hour >= part.from && hour <= part.to) || parts[0];

  function clockText(date) {
    const hour = date.getHours();
    const suffix = hour < 12 ? 'am' : 'pm';
    const shown = hour % 12 === 0 ? 12 : hour % 12;
    return `${shown}${suffix}`;
  }

  function snapshot(date = now()) {
    const at = date instanceof Date && Number.isFinite(date.getTime()) ? date : now();
    const hour = at.getHours();
    const part = partOf(hour);
    return { hour, part:part.id, label:part.label, clock:clockText(at), quiet:isQuietHour(hour), open:isOpenHour(hour) };
  }

  // How many separate days the person has taken a step in each part of the day.
  // Built from timestamps they actually produced, so it costs no extra storage
  // and cannot be wrong about what they did.
  function pattern(days) {
    const seen = {};
    for (const entry of Object.values(days || {})) {
      const log = entry && typeof entry === 'object' ? entry.actionLog : null;
      if (!Array.isArray(log)) continue;
      for (const action of log) {
        const stamp = Date.parse(action && typeof action === 'object' ? action.at || '' : '');
        if (!Number.isFinite(stamp)) continue;
        const at = new Date(stamp);
        const id = partOf(at.getHours()).id;
        const dateKey = `${at.getFullYear()}-${at.getMonth() + 1}-${at.getDate()}`;
        seen[id] = seen[id] || new Set();
        seen[id].add(dateKey);
      }
    }
    return Object.fromEntries(Object.entries(seen).map(([id, set]) => [id, set.size]));
  }

  // Do we have enough of their own history to call this part of the day theirs?
  const isFamiliar = (seen, part) => (seen[part] || 0) >= familiarAfter;
  // Have we seen enough of this person at all to know their rhythm is not this?
  const hasRhythm = seen => Object.values(seen).some(count => count >= familiarAfter);

  // Wording. Each line keeps the same shape: where you are, then what that means
  // for this step, then permission to stop. No blame, no missed-day framing, and
  // never an instruction about what they ought to be doing with their evening.
  const quietNotes = {
    rest:      'so this keeps the demand low. Nothing needs to be rescued right now.',
    progress:  'so this is one small piece rather than the whole task.',
    grow:      'so this is one small piece rather than the whole thing.',
    calm:      'so this stays quiet and low-effort.',
    energy:    'so this stays quiet and low-effort.',
    clarity:   'so this narrows to one open question rather than a full decision.',
    connection:'so this is only worth doing if the timing suits the other person too.',
    explore:   'so this is one question rather than a session.',
  };
  const eveningNotes = {
    rest:      'so there is room to put the day down.',
    progress:  'so this is a small piece that can be left for tomorrow.',
    grow:      'so this is a small piece that can be left for tomorrow.',
    calm:      'so this is a quiet, undemanding step.',
    energy:    'so this is a quiet, undemanding step.',
    clarity:   'so this narrows to one open question.',
    connection:'so this is only worth doing if the timing suits the other person too.',
    explore:   'so this is one question rather than a session.',
  };

  // Builds the one line that explains why the step is shaped the way it is.
  // Returns '' whenever the clock has nothing useful to say, which is most of
  // the time. An explicit check-in is respected: if the person asked for
  // something specific, the clock stays quiet and only shapes the size.
  function note(need, moment, { theirs = false, evening = false } = {}) {
    if (theirs) return '';
    const table = moment.quiet ? quietNotes : evening ? eveningNotes : null;
    const tail = table ? table[need] : null;
    if (!tail) return '';
    return `It is ${moment.clock} where you are, ${tail}`;
  }

  // Should we ask whether this schedule is working for them? Only when we have
  // real evidence that this is not their usual hour, they have enough history for
  // "usual" to mean anything, they have not told us this part suits them, and we
  // have not already asked about this part today. The question is allowed to be
  // answered "yes, it suits me", and that answer is remembered.
  function shouldAsk(seen, moment, { accepted = [], askedToday = '' } = {}) {
    if (accepted.includes(moment.part)) return false;
    if (askedToday === moment.part) return false;
    if (isFamiliar(seen, moment.part)) return false;
    if (!hasRhythm(seen)) return false;
    return moment.quiet || moment.part === 'early';
  }

  // The question itself, plus what each answer means. Both answers are valid and
  // neither is a correction: "suits me" is a real answer, not a failure to
  // engage, and it stops the question being asked again.
  const question = {
    text: 'Is this schedule working for you?',
    detail: 'Steady is not keeping score of your hours. It only asks so it can stop guessing.',
    yes: 'Yes, it suits me',
    no: 'Not really',
    yesNote: 'Understood. Steady will treat this as your normal and leave it alone.',
    noNote: 'Understood. Nothing to fix right now — there is still one small step available, and tomorrow is a fresh start.',
  };

  function moment(days = {}, options = {}) {
    const at = snapshot(options.date || now());
    const seen = pattern(days);
    const accepted = Array.isArray(options.accepted) ? options.accepted.filter(id => partIds.includes(id)) : [];
    const theirs = accepted.includes(at.part) || isFamiliar(seen, at.part);
    return {
      ...at,
      seen,
      theirs,
      known: hasRhythm(seen),
      // A gentler place to begin, offered only as a starting point the person can
      // change on the check-in. Never offered once this hour is their own.
      suggest: theirs ? null : at.quiet ? 'rest' : null,
      ask: shouldAsk(seen, at, { accepted, askedToday: typeof options.askedToday === 'string' ? options.askedToday : '' }),
      note: note(options.need, at, { theirs, evening: at.part === 'evening' }),
      question,
    };
  }

  return { moment, snapshot, pattern, partOf, isQuietHour, isOpenHour, canStretch, isFamiliar, hasRhythm, clockText, parts, partIds, familiarAfter, question, now, setNow };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyRhythm;
