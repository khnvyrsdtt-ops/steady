'use strict';

// Only explicit feedback belongs in this collection. Visits and completions
// alone are not evidence that a suggestion helped.
const SteadyHelpful = (() => {
  const scripture=typeof SteadyScriptureDirection!=='undefined'?SteadyScriptureDirection:(typeof module!=='undefined'?require('./scripture-direction-model.js'):null);
  function collect(days, current, guide) {
    const history = guide.outcomes(days);
    const latest = new Map();
    const avoided = new Set();

    history.forEach((outcome, order) => {
      const goal = outcome.context?.goal ?? 'general';
      if (outcome.rating === 'worse') {
        avoided.add(outcome.id);
      }
      if (typeof goal!=='string'||(!Object.hasOwn(guide.choices.goal, goal)&&!(scripture?.isKnownId(outcome.id)&&goal==='rest'))) return;
      latest.set(guide.feedbackKey(outcome), {id: outcome.id, goal, rating: outcome.rating, order, context:outcome.context,variant:outcome.variant||'base'});
    });

    return [...latest.values()]
      .filter(item => item.rating === 'useful' && !avoided.has(item.id))
      .sort((a, b) => b.order - a.order)
      .flatMap(item => {
        if(scripture?.isKnownId(item.id)){
          const plan=scripture.recommend({...current,goal:item.goal,theme:item.context?.scriptureTheme,choice:item.context?.scriptureChoice},days,undefined,item.id);
          return plan?.id===item.id?[{id:item.id,goal:item.goal,plan,source:'scripture'}]:[];
        }
        const entry = guide.catalog.find(action => action.id === item.id);
        if (!entry) return [];
        // An earlier planning cue must not be presented as evidence that a new
        // doing action helped. Keep its stored record, but do not relabel it.
        if(item.variant==='base'&&(guide.recommend(entry.need,{goal:item.goal},{},undefined,item.id).variant||'base')!=='base')return [];
        // The saved obstacle is labelled; only Use this today applies it.
        // The old day's energy, time and surroundings are never carried over.
        const context = guide.context({}, {...current,goal:item.goal,blocker:item.context?.blocker||'none'});
        const plan = guide.recommend(entry.need, context, days, undefined, item.id);
        return plan.id === item.id ? [{id: item.id, goal: item.goal, plan}] : [];
      });
  }

  return {collect};
})();

if (typeof module !== 'undefined') module.exports = SteadyHelpful;
