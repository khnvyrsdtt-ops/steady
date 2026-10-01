'use strict';
/* The four animals are four ways of using the same verified guide. The guide
   owns every factual or biblical claim; the animal changes the shape of help. */
const SteadyAskHelp = (() => {
  const styles = Object.freeze({donkey:'Balanced help',owl:'Scripture context',fox:'Compare choices',tortoise:'One small step'});
  const choices = Object.freeze(Object.keys(styles));
  const themes = Object.freeze({rest:'exhaustion',grief:'grief',connection:'loneliness',grace:'forgiveness',wisdom:'decisions',gratitude:'gratitude',foundation:'starting'});
  const valid = value => choices.includes(value) ? value : 'donkey';
  const clean = value => String(value || '').trim();
  const names = Object.freeze({burden:'donkey',sage:'owl',scout:'fox',steady:'tortoise'});
  function requestedStyle(text) {
    const phrase=clean(text).toLowerCase().replace(/[‘’]/g,"'").replace(/[.!?]+$/,'').replace(/\s+/g,' ');
    const plain=phrase.match(/^(?:give me|show me|write|offer) (?:a |an |the )?(balanced|scripture|practical|step-by-step) (?:answer|reply|response|perspective)(?: (?:to|for) (?:that|this|it))?$/);
    if(plain)return {balanced:'donkey',scripture:'owl',practical:'tortoise','step-by-step':'tortoise'}[plain[1]];
    const label=phrase.match(/^(?:use|switch to) (balanced help|scripture context|compare choices|one small step)(?: (?:for|on) (?:that|this|it))?$/);
    if(label)return {'balanced help':'donkey','scripture context':'owl','compare choices':'fox','one small step':'tortoise'}[label[1]];
    const patterns=[
      /^(?:give me|show me|write|make|offer) (?:a |an |the )?(burden|sage|scout|steady)(?:'s)? (?:answer|reply|response|take)(?: (?:to|for) (?:that|this|it))?$/,
      /^(?:let|have) (burden|sage|scout|steady) (?:answer|reply|respond)(?: (?:to )?(?:that|this|it))?$/,
      /^(?:answer|reply|respond) (?:as|like) (burden|sage|scout|steady)$/
    ];
    for(const pattern of patterns){const match=phrase.match(pattern);if(match)return names[match[1]];}
    return null;
  }
  function recentGuide(entries,now=Date.now()) {
    for(const entry of (Array.isArray(entries)?entries:[]).slice(0,3)){
      if(entry?.guide && !entry.study && !entry.unmatched && Number.isFinite(Date.parse(entry.at))
         && now-Date.parse(entry.at)>=0 && now-Date.parse(entry.at)<=2*60*60*1000)return entry;
      if(!entry || !requestedStyle(entry.text))break;
    }
    return null;
  }
  function followUp(text,entries,now=Date.now()) {
    const phrase=clean(text).toLowerCase().replace(/[‘’]/g,"'").replace(/[.!?]+$/,'').replace(/\s+/g,' ');
    let style=null;
    if(/^(?:(?:so |and )?what (?:should|can) i do(?: next| now| about (?:that|it))?|what(?:'s| is) (?:the |my )?next step|give me (?:a |one )?next step)$/.test(phrase))style='tortoise';
    else if(/^(?:(?:can|could) you )?(?:explain (?:that|it)(?: more)?|tell me more(?: about (?:that|it))?)$/.test(phrase))style='owl';
    if(!style)return null;
    const prior=entries?.[0];
    // Never reach past a new topic, a reflection, or a Bible study to guess
    // what a short follow-up refers to.
    if(!prior||prior.reflection||prior.study||prior.unmatched||!prior.guide||recentGuide([prior],now)!==prior)return null;
    return {key:prior.key,guide:prior.guide,helpStyle:style,relatedId:prior.id};
  }
  function conversationReply(text) {
    const phrase=clean(text).toLowerCase().replace(/[‘’]/g,"'").replace(/[.!?]+$/,'').replace(/\s+/g,' ');
    if(/^(?:please )?(?:i need (?:some )?help|help(?: me)?|can you help(?: me)?|i (?:don't|do not) know (?:where to start|what to (?:do|say))|something is on my mind)$/.test(phrase))
      return 'What’s happening? A few words are enough—we can work out where to start together.';
    if(/^(?:that|this|it) (?:isn't|is not|wasn't|was not|doesn't|does not) (?:helpful|helping|help|what i meant|right)$/.test(phrase))
      return 'I missed what you needed. Which part did I get wrong, or what would you like me to focus on?';
    if(/^(?:thanks(?: a lot)?|thank you(?: so much)?|that helps|that's helpful)$/.test(phrase))
      return 'You’re welcome. We can leave it there, or keep going.';
    return null;
  }
  function source(style, guide, options={}) {
    if (!guide) return '';
    const withoutStep=options.excludePractice===true;
    switch (valid(style)) {
      case 'owl': return [guide.context,withoutStep?'':guide.practice].map(clean).filter(Boolean).join(' ');
      case 'fox': return withoutStep?clean(guide.acknowledgement):clean(guide.compare)||[guide.acknowledgement,guide.practice].map(clean).filter(Boolean).join(' ');
      case 'tortoise': return withoutStep?'':clean(guide.practice);
      default: return [guide.acknowledgement,withoutStep?'':guide.practice].map(clean).filter(Boolean).join(' ');
    }
  }
  function interpretation(text, history, rules, model, guides) {
    const safe = rules.response(text, rules.match(text,history)).urgent;
    const initial = rules.match(text,history);
    // Keep explicit local matches. The model may rescue an ambiguous follow-up,
    // but cannot replace a guide already supported by the person's own words.
    if(safe || initial.matched || !model || model.available !== true || model.confidence !== 'clear')return initial;
    const guide = model.guide;
    if(typeof guide !== 'string' || !Object.hasOwn(guides,guide) || !Object.hasOwn(rules.guideThemes,guide))return initial;
    // Explicit references and reliable study lookups are routed elsewhere.
    return {key:rules.guideThemes[guide], guide, matched:true,
      reason:'Matched on this device. The passage itself comes from Steady’s verified library.'};
  }
  return Object.freeze({styles,choices,themes,valid,source,interpretation,requestedStyle,recentGuide,followUp,conversationReply});
})();
if(typeof window!=='undefined')window.SteadyAskHelp=SteadyAskHelp;
if(typeof module!=='undefined'&&module.exports)module.exports=SteadyAskHelp;
