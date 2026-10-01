'use strict';

// Lightweight local message analysis for Burden. No LLM, no network, no
// storage, no paid service: small regex and rule checks that run in well
// under a millisecond on-device. It answers one question: what TYPE of thing
// is the user asking, so the short waiting beat can acknowledge it honestly.
// It never claims understanding it cannot demonstrate; low confidence falls
// back to a neutral state. Results stay local. toContext() shapes the small
// subset already intended for any future request payload.
const SteadyBurdenAnalysis = (() => {
  const faithTerms = /\b(bible|jesus|christ|god|scripture|prayer|faith|church|verse|psalm|grace|sin|heaven|lord|pastor|worship|bless)\b/i;
  const supportTerms = /(anxious|anxiety|worried|worry|lonely|loneliness|sad|sadness|sorrow|scared|afraid|fear|overwhelm|stress|tired|exhaust|grief|griev|angry|anger|ashamed|shame|hopeless|numb|alone|suffer|pain|cry|hurting)/i;
  const planningTerms = /\b(plan|routine|habit|schedule|organiz|prepar|goal|steps|going to)\b/i;
  const reflectionTerms = /\b(reflect|looking back|today was|grateful|thankful|learned|noticed|went well)\b/i;
  const timePattern = /\btoday\b|\btonight\b|\btomorrow\b|\bthis (morning|evening|week)\b|\bnext week\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}|\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}[/-]\d{1,2}\b|\bin \d+ days?\b/i;
  const uncertaintyPattern = /\bidk\b|not sure|unsure|uncertain|confus|don't know|do not know|dont know|maybe|perhaps|might\b/i;
  const urgencyPattern = /\basap\b|urgent|right now|immediately|emergency|can't wait|straight away/i;
  const questionStart = /^(who|what|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|will|have|has|define|explain)\b/i;

  function analyze(text, context) {
    const clean = String(text || '').trim().slice(0, 1200);
    const lower = clean.toLowerCase();
    const ctx = context && typeof context === 'object' ? context : {};
    const isQuestion = /\?\s*$/.test(clean) || questionStart.test(clean);
    const decisionStrong = /\bshould i\b|\btorn\b|\bhelp me decide\b|\bdecide\b|\bwhich (way|option|one|to choose)\b/i.test(lower);
    const decisionWeak = /\bwhether\b|\beither\b[\s\S]{0,60}\bor\b/i.test(lower);
    const decision = decisionStrong || decisionWeak;
    const faith = faithTerms.test(lower);
    const planning = planningTerms.test(lower) || /\btomorrow\b|\bnext week\b/i.test(lower);
    const reflection = reflectionTerms.test(lower);
    const support = supportTerms.test(lower);
    const uncertainty = uncertaintyPattern.test(lower);
    const urgency = urgencyPattern.test(lower);
    const timeHit = lower.match(timePattern);
    const timeReference = timeHit ? timeHit[0].slice(0, 40) : null;
    let intent = 'unknown';
    if (decision) intent = 'decision';
    else if (faith && isQuestion) intent = 'faith';
    else if (isQuestion) intent = 'question';
    else if (planning) intent = 'planning';
    else if (reflection) intent = 'reflection';
    else if (support) intent = 'support';
    else if (faith) intent = 'faith';
    const topic = typeof ctx.key === 'string' ? ctx.key : null;
    const matched = ctx.matched === true;
    const guided = typeof ctx.guide === 'string' && ctx.guide.length > 0;
    const confidence = (decisionStrong || (decisionWeak && (uncertainty || isQuestion)) || (faith && isQuestion) || (matched && guided))
      ? 'high' : 'low';
    return { intent, topic, timeReference, uncertainty, urgency, isQuestion, confidence };
  }

  function waitingText(analysis) {
    if (!analysis || analysis.urgency) return null;
    if (analysis.confidence !== 'high') return null;
    switch (analysis.intent) {
      case 'decision': return 'Thinking through the choice…';
      case 'faith':
      case 'question': return 'Understanding your question…';
      case 'planning': return 'Looking at what matters here…';
      case 'support': return 'Working through this with you…';
      case 'reflection': return 'Looking at what matters here…';
      default: return null;
    }
  }

  // Only fields already intended for a request payload. There is currently
  // no AI endpoint; this stays local until one is deliberately configured.
  function toContext(analysis) {
    if (!analysis || typeof analysis !== 'object') return null;
    return {
      intent: analysis.intent,
      topic: analysis.topic,
      timeReference: analysis.timeReference,
      uncertainty: !!analysis.uncertainty,
      isQuestion: !!analysis.isQuestion
    };
  }

  return { analyze, waitingText, toContext };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SteadyBurdenAnalysis;
