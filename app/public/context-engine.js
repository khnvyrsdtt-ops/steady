'use strict';
// Context: what makes sense *now*.
//
// The clock in rhythm.js knows what time it is. This knows where that hour sits
// in this person's own day, what state they have already reported, and whether
// they are already mid-step. It exists to answer one question — "given who I am,
// what I want, what has happened today and what time it is, what is the most
// useful next thing?" — and it answers it by recalculating from now.
//
// The schedule serves the person. Nothing here scores, counts, streaks or
// compares them to a standard day, and there is deliberately no "missed" state.
// A day that did not go to plan is not a broken day; it is a day with a different
// shape, and the only question worth asking is what is still possible.
//
// Silence is the default. Most visits produce no comment at all, because a person
// who is happily working through their plan does not need to be interrupted.
const SteadyContext = (() => {
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  // The part boundaries belong to the clock, so they are borrowed rather than
  // repeated here: two copies of "where does evening start" would drift apart.
  // Without the clock module there is no basis for a position, and we stay silent.
  const partOf = hour => {
    const rhythm = typeof SteadyRhythm !== 'undefined' ? SteadyRhythm : null;
    const part = rhythm && typeof rhythm.partOf === 'function' ? rhythm.partOf(hour) : null;
    // partOf answers with a descriptor, so take its id rather than the object.
    return part && typeof part.id === 'string' ? part.id : null;
  };
  // A position is only claimed once the person has a history for it. Below this we
  // know nothing, and knowing nothing means saying nothing.
  const afterDays = 3;
  // Recent activity counts as "already engaged" and leaves them to it.
  const engagedFor = 2 * 60 * 60 * 1000;
  // The order parts of the day sit in, used only to compare against a person's own
  // habits. It is never used to tell them what they ought to be doing.
  const order = ['early', 'morning', 'midday', 'afternoon', 'evening', 'late', 'overnight'];

  // When this person has done this kind of step before, and on which separate days.
  // Built from timestamps they actually produced, so it costs no extra storage.
  // A null `ids` counts every recorded step, which is the safe fallback when the
  // catalog is not to hand: knowing their rough rhythm beats knowing none.
  function seenFor(days, ids, part) {
    const seen = {};
    for (const entry of Object.values(record(days) ? days : {})) {
      const log = record(entry) && Array.isArray(entry.actionLog) ? entry.actionLog : [];
      for (const action of log) {
        if (!record(action)) continue;
        if (ids && !ids.has(action.id)) continue;
        const stamp = Date.parse(action.at || '');
        if (!Number.isFinite(stamp)) continue;
        const when = new Date(stamp);
        const boundary = part(when.getHours());
        if (!boundary) return {};
        seen[boundary] = seen[boundary] || new Set();
        seen[boundary].add(`${when.getFullYear()}-${when.getMonth() + 1}-${when.getDate()}`);
      }
    }
    return seen;
  }
  const daysIn = seen => Object.fromEntries(Object.entries(seen).map(([id, set]) => [id, set.size]));
  const settledIn = (seen, part) => (seen[part] || 0) >= afterDays;
  const knownAtAll = seen => Object.values(seen).some(count => count >= afterDays);

  // Where now sits inside the parts of the day this person uses for this need.
  // `offschedule` is a shape, not a verdict: it means their own history has no
  // part containing this hour, so today's plan genuinely needs recalculating.
  function position(seen, part) {
    if (settledIn(seen, part)) return 'ontime';
    if (!knownAtAll(seen)) return null;
    const target = order.indexOf(part);
    if (target < 0) return null;
    // Overnight is never "late" and never "early". Someone awake at 2am is not
    // behind on their day and not unusually punctual; they are living at a
    // different hour. Calling it either would smuggle in a verdict about a
    // schedule we have no business ranking, so it is only ever "not our usual".
    if (part === 'overnight') return 'offschedule';
    const mine = order.filter(id => (seen[id] || 0) >= afterDays);
    if (!mine.length) return null;
    // Only classify once every part they actually use sits on one side of this
    // hour. Their habits all being earlier than now means this is *later* than
    // their pattern, and all being later means this is *earlier*. Straddling
    // means neither: simply an hour that is not theirs.
    const before = mine.filter(id => order.indexOf(id) < target).length;
    if (before === mine.length) return 'late';
    if (before === 0) return 'early';
    return 'offschedule';
  }

  // The lightest useful reading of how they are doing, and only ever taken from
  // something they explicitly reported. An unchecked "From my check-in" is unknown,
  // never an assumption of either state.
  function reportedEnergy(day) {
    const value = record(day) && record(day.context) ? day.context.energy : '';
    return ['low', 'steady', 'high'].includes(value) ? value : null;
  }
  const doneToday = day => (record(day) && Array.isArray(day.actionLog) ? day.actionLog.length : 0);
  function recentlyEngaged(day, now) {
    if (!record(day) || !Array.isArray(day.actionLog)) return false;
    const at = now.getTime();
    return day.actionLog.some(action => {
      const stamp = Date.parse(record(action) ? action.at || '' : '');
      return Number.isFinite(stamp) && stamp <= at && at - stamp < engagedFor;
    });
  }

  // Wording. Every line is forward-looking and leaves a way out, because someone
  // off their usual pattern needs a next step and permission, not a diagnosis.
  // None of them mention what they should have done, or that time was lost.
  function noteFor(positionId, moment, energy) {
    switch (positionId) {
      case 'early':
        // Ahead of their own hours, but never at the cost of a reported low patch.
        return energy === 'low' ? '' : `It is ${moment.clock} and you are ahead of your usual hours, so there is room for a fuller piece.`;
      case 'late':
        return `It is ${moment.clock}. The shape of today has moved on, so this is a small useful step from here rather than the one you began with.`;
      case 'offschedule':
        return `It is ${moment.clock}, which is not a usual hour for you. Today does not need rescuing — this is one small step that still works now.`;
      default:
        return '';
    }
  }

  // How big the next step is allowed to be. The catalog still chooses what the
  // step is; this only sets its ceiling. 'light' is the recalculated-from-now
  // answer, and it is the same answer whether the cause is the hour or the energy.
  function capacity(positionId, energy, moment) {
    if (moment && moment.quiet) return 'light';
    if (energy === 'low') return 'light';
    if (positionId === 'late' || positionId === 'offschedule') return 'light';
    if (positionId === 'early') return 'full';
    return 'normal';
  }

  function assess({ days = {}, day = {}, moment, need = '', catalog = null, now = null } = {}) {
    const at = record(moment) ? moment : null;
    const energy = reportedEnergy(day);
    const done = doneToday(day);
    const silent = { position: null, known: false, note: '', capacity: 'normal', energy, done, engaged: false };
    if (!at || typeof at.part !== 'string' || !partOf(at.hour)) return silent;
    const list = Array.isArray(catalog) ? catalog.filter(item => record(item) && typeof item.id === 'string') : [];
    const ids = new Set(list.filter(item => item.need === need).map(item => item.id));
    const seen = daysIn(seenFor(days, ids.size ? ids : null, partOf));
    const where = position(seen, at.part);
    const clock = now instanceof Date && Number.isFinite(now.getTime()) ? now : (typeof at.now === 'function' ? at.now() : new Date());
    // Someone already working is left alone. Being busy is not a problem to solve.
    if (recentlyEngaged(day, clock)) return { position: where, known: knownAtAll(seen), note: '', capacity: 'normal', energy, done, engaged: true };
    return {
      position: where,
      known: knownAtAll(seen),
      engaged: false,
      energy,
      done,
      note: noteFor(where, at, energy),
      capacity: capacity(where, energy, at),
    };
  }

  return { assess, position, capacity, noteFor, reportedEnergy, doneToday, seenFor, daysIn, afterDays, engagedFor, order };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyContext;
