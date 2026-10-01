'use strict';

// Local theme matching against the existing passage library. These explanations
// describe the match; they do not interpret a person's life or speak for God.
const SteadyFeelings = (() => {
  const themes = {
    foundation:'starting small', rest:'rest and burdens', wisdom:'wisdom and choices',
    connection:'care and connection', gratitude:'gratitude', grief:'comfort in sorrow',
    grace:'kindness and forgiveness'
  };
  const limit = 1200;
  // Stable guide identifiers keep Scripture sourced locally. General on-device
  // answers are stored separately so reopening a chat does not regenerate them.
  const guideThemes = {
    anxiety:'rest', exhaustion:'rest', grief:'grief', loneliness:'connection',
    shame:'grace', anger:'grace', forgiveness:'grace', decisions:'wisdom',
    faith_questions:'foundation', prayer:'foundation', starting:'foundation',
    perseverance:'foundation', comparison:'grace', gratitude:'gratitude',
    helping:'connection', conflict:'connection', temptation:'rest', suffering:'grief'
  };
  const defaults = {rest:'exhaustion',grief:'grief',connection:'loneliness',grace:'shame',wisdom:'decisions',gratitude:'gratitude',foundation:'starting'};
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const cleanText = value => typeof value === 'string' ? value.trim().slice(0, limit).trim() : '';
  // Common misspellings are corrected for matching only; saved text is never altered.
  const misspellings = [
    [/anxou?s\b/g, 'anxious'], [/overwhe?l+emed\b/g, 'overwhelmed'], [/exhaused\b/g, 'exhausted'],
    [/deppresed\b/g, 'depressed'], [/lonley\b/g, 'lonely'], [/lonliness\b/g, 'loneliness'],
    [/grieivng\b/g, 'grieving'], [/forgivness\b/g, 'forgiveness'], [/guidnace\b/g, 'guidance'],
    [/decison\b/g, 'decision'], [/wisdon\b/g, 'wisdom'], [/prayr\b/g, 'prayer'],
    [/gratefull\b/g, 'grateful'], [/hopeles\b/g, 'hopeless'], [/sucide\b/g, 'suicide'], [/sucidal\b/g, 'suicidal']
  ];
  const clausesFor = text => {
    let normalized = cleanText(text).toLowerCase().replace(/[‘’]/g, "'");
    normalized = normalized.replace(/([a-z])-([a-z])/g, '$1 $2');
    // Informal, gamer and shortened language is expanded for matching only;
    // saved text is never altered. Expansions use words the rules already know.
    const slang = [
      [/\bidk\b/g, 'i do not know'], [/\bidc\b/g, 'i do not care'], [/\bnvm\b/g, 'never mind'],
      [/\btbh\b|\bngl\b|\bimo\b|\bfyi\b|\bbtw\b|\birl\b/g, ''], [/\blol\b|\blmao\b|\brofl\b|\bomg\b/g, ''],
      [/\btilted\b|\btilting\b/g, 'angry'], [/\bsalty\b/g, 'bitter resentful'],
      [/\bfomo\b/g, 'anxious'], [/\bpoggers\b|\bpog\b/g, 'excited'], [/\bgoat\b|\bgoated\b/g, 'amazing'],
      [/\bclutch\b/g, 'amazing'], [/\bthx\b/g, 'thanks'], [/\bpls\b|\bplz\b/g, 'please'],
      [/\bwanna\b/g, 'want to'], [/\bgonna\b/g, 'going to'], [/\bgotta\b/g, 'got to'],
      [/\bkinda\b/g, 'kind of'], [/\bsorta\b/g, 'sort of'], [/\bcuz\b|\bcos\b/g, 'because'],
      [/\bbc\b/g, 'because'], [/\bdef\b/g, 'definitely'], [/\bprobs\b/g, 'probably'],
      [/\bfr\b/g, 'really'], [/\blowkey\b/g, 'a little'], [/\bhighkey\b/g, 'really'],
      [/\bvibes\b|\bvibe\b/g, 'feeling'], [/\bsmh\b/g, 'disappointed'], [/\bwtf\b/g, 'angry'],
      [/\baf\b/g, 'very'], [/\bbruh\b|\bbro\b|\bfam\b/g, ''], [/\bno cap\b/g, 'honestly'],
      [/\btouch grass\b/g, 'need a break outside'], [/\bgg\b/g, 'good game'],
      [/\bu\b/g, 'you'], [/\bur\b/g, 'your'], [/\br\b/g, 'are']
    ];
    for (const [pattern, fix] of slang) normalized = normalized.replace(pattern, fix);
    for (const [pattern, fix] of misspellings) normalized = normalized.replace(pattern, fix);
    return normalized.replace(/\s+/g, ' ').trim()
      .split(/[,;.!?\n]+|\b(?:but|however|yet)\b|\b(?:and|or)\s+(?=(?:i|we|he|she|they|someone|my|our|feel|am|you)\b)/);
  };

  function isoDate(value) {
    if (typeof value !== 'string') return null;
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/);
    if (!parts) return null;
    const [, year, month, date, hours, minutes, seconds, , zone] = parts;
    const y = Number(year), m = Number(month), d = Number(date);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m < 1 || m > 12 || d < 1 || d > monthDays[m - 1] || Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) return null;
    if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) return null;
    const timestamp = Date.parse(value);
    const normalized = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
    return normalized.length === 24 ? normalized : null;
  }

  // Newest first, including when storage was written in a different order.
  // Copy only understood fields; never mutate the caller's saved records.
  function normalizeEntries(value) {
    const entries = (Array.isArray(value) ? value : []).flatMap(entry => {
      if (!record(entry) || typeof entry.id !== 'string' || !entry.id.trim() || entry.id.length > 160 || typeof entry.key !== 'string' || !Object.hasOwn(themes, entry.key)) return [];
      const text = cleanText(entry.text), at = isoDate(entry.at);
      const guide = typeof entry.guide==='string' && Object.hasOwn(guideThemes,entry.guide) && guideThemes[entry.guide]===entry.key ? entry.guide : null;
      const study=record(entry.study)&&['reference','search','note','clarify','meta'].includes(entry.study.kind)&&typeof entry.study.query==='string'&&entry.study.query.trim()
        ? {kind:entry.study.kind,query:entry.study.query.trim().slice(0,160)} : null;
      const helpStyle = ['donkey','owl','fox','tortoise'].includes(entry.helpStyle) ? entry.helpStyle : null;
      const answer=!study&&!entry.reflection&&record(entry.answer)&&entry.answer.source==='on-device'&&typeof entry.answer.text==='string'&&entry.answer.text.trim()&&entry.answer.text.length<=3000
        ?{source:'on-device',text:entry.answer.text.trim()}:null;
      return text && at ? [{ id:entry.id.trim(), text, key:entry.key, at, ...(answer?{answer}:entry.answerUnavailable===true?{answerUnavailable:true}:{}), ...(entry.reflection===true?{reflection:true}:{}), ...(study?{study}:guide?{guide}:{}), ...(helpStyle?{helpStyle}:{}), ...(entry.unmatched===true&&!guide&&!study?{unmatched:true}:{}) }] : [];
    }).sort((a, b) => b.at.localeCompare(a.at));
    const seen = new Set();
    return entries.filter(entry => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }).slice(0, 30);
  }

  // Affect words outrank incidental topics. Specific loss comes before broader
  // feelings, and ties favour a gentle invitation to care rather than a task.
  const rules = [
    { key:'grief', weight:6, words:/\b(?:grief|grieving|grieve|bereave(?:d|ment)?|died|death|heartbroken|broken[ -]heart(?:ed)?|passed away|lost my (?:mother|father|mum|mom|dad|parent|child|son|daughter|baby|wife|husband|partner|friend|sister|brother|pet|dog|cat))\b/gi },
    { key:'grief', weight:4, words:/\b(?:sad|sadness|sorrow|sorrowful|hurting|hopeless|despair|disappointed|disappointment|miserable|crying|devastated|heartache|depressed|worthless|feel(?:ing)? (?:down|empty|numb))\b/gi },
    { key:'rest', weight:4, words:/\b(?:anxious|anxiety|nervous|worr(?:y|ied|ies|ying)|scared|afraid|fear(?:ful)?|frightened|terrified|panic(?:king)?|overwhelmed|stress(?:ed|ful)?|exhausted|exhaustion|tired|weary|burnt out|burned out|burn out|burnout|restless|uneasy|sleepless|burden(?:ed|s)?|interview nerves|stage fright|public speaking|presentation nerves)\b/gi },
    { key:'grace', weight:4, words:/\b(?:guilt(?:y)?|ashamed|shame|angry|anger|bitter(?:ness)?|resent(?:ful|ment)|regret(?:ful)?|forgiv(?:e|eness|ing)|self[ -]critical)\b/gi },
    { key:'connection', weight:4, words:/\b(?:lonely|loneliness|alone|isolated|isolation|disconnected|left out|rejected|unloved|homesick|homesickness|new (?:city|school|job|country|church)|moved away|miss(?:ing)? (?:my |a )?(?:family|friend|friends|partner|parents|home))\b/gi },
    { key:'wisdom', weight:4, words:/\b(?:confused|confusion|uncertain(?:ty)?|unsure|indecisive|torn|feel(?:ing)? lost|need (?:some )?(?:guidance|wisdom|advice|direction))\b/gi },
    { key:'gratitude', weight:4, words:/\b(?:grateful|gratitude|thankful|thankfulness|joy(?:ful)?|happy|happiness|glad|hopeful|excited|amazing|awesome|incredible|peaceful|contented|relieved)\b/gi },
    { key:'foundation', weight:3, words:/\b(?:stuck|unmotivated|discouraged|starting over|new beginning|small steps?|procrastinat(?:e|ing|ion)|putting (?:it|this|things?) off|follow through|take action|take the first step|get started|start now|make progress|do the (?:thing|work)|need (?:to|help to) act)\b/gi },
    { key:'rest', weight:4, words:/\b(?:can(?:not|'t) (?:focus|concentrate)|can(?:not|'t) sleep|unable to sleep)\b/gi },
    { key:'wisdom', weight:4, words:/\b(?:can(?:not|'t) decide|(?:do not|don't|dont) know what to do|not sure (?:what|which|how)|what (?:do i do|should i do|now)|where do i (?:go|start)|which (?:way|option)|should i\b|how (?:do|can|should) i\b|give me (?:advice|guidance|direction)|need (?:some )?(?:advice|guidance|direction)|help me decide|idk what to do)\b/gi },
    { key:'grace', weight:5, words:/\b(?:need to apolog(?:ise|ize)|want to apolog(?:ise|ize)|make amends|put things right|repair (?:a|my|the) relationship|let go of (?:anger|resentment)|be more patient|show (?:them |him |her )?(?:kindness|mercy|grace))\b/gi },
    { key:'connection', weight:5, words:/\b(?:need (?:someone|support|community)|want to (?:help|support|encourage|reconnect)|how can i help|reach out|be there for (?:someone|them|him|her)|support (?:a|my|the) friend)\b/gi },
    { key:'rest', weight:4, words:/\b(?:need (?:a )?(?:break|rest)|slow down|too much (?:to do|going on)|cannot cope|can't cope|need peace|calm down)\b/gi },
    { key:'gratitude', weight:4, words:/\b(?:want to (?:give thanks|thank god|celebrate)|something good happened|count my blessings)\b/gi },
    { key:'grief', weight:4, words:/\b(?:betray(?:ed|al)|divorc(?:e|ed|ing)|breakup|broke up|miscarriage|infertil(?:e|ity)|chronic pain|seriously ill|diagnos(?:ed|is)|suffering)\b/gi },
    { key:'rest', weight:4, words:/\b(?:tempt(?:ed|ation)|addict(?:ed|ion)|relaps(?:e|ed|ing)|out of control|intrusive thoughts?|nightmares?)\b/gi },
    { key:'grace', weight:4, words:/\b(?:sin(?:ned|ful)?|failed god|god (?:is|must be) disappointed|unworthy|hate myself|cannot forgive myself|can't forgive myself|someone hurt me|they hurt me)\b/gi },
    { key:'connection', weight:4, words:/\b(?:relationship|marriage|husband|wife|partner|friendship|family conflict|argument|falling out|church community|belong(?:ing)?)\b/gi },
    { key:'wisdom', weight:4, words:/\b(?:purpose|calling|career|financial (?:decision|worry|problem)|money (?:worries|troubles)|debt|debts|bills|rent|interview|job offer|work (?:decision|problem|conflict)|study|exam|future|move house|dating|marry|parenting|raise my child|discern(?:ment)?)\b/gi },
    { key:'foundation', weight:4, words:/\b(?:doubt(?:ing|s)?|losing (?:my )?faith|faith is weak|where is god|god feels (?:far|distant|silent)|prayer is not working|can't pray|cannot pray|believe in god|trust god|scripture|bible|jesus)\b/gi },
    { key:'rest', weight:1, words:/\b(?:rest|sleep|peace)\b/gi },
    { key:'wisdom', weight:1, words:/\b(?:wisdom|guidance|decisions?|choices?)\b/gi },
    { key:'connection', weight:1, words:/\b(?:connection|companionship)\b/gi },
    { key:'grace', weight:1, words:/\b(?:kindness|grace|mercy)\b/gi },
    { key:'foundation', weight:1, words:/\b(?:faith|trust (?:in )?(?:god|jesus))\b/gi }
  ];

  // Specific situations outrank a broad topic such as "work" or "how do I".
  // These are hand-written matches, not semantic understanding or an AI model.
  const guideRules = [
    {guide:'shame',weight:6,words:/\b(?:(?:(?:can't|cannot) )?forgive myself|forgiving myself)\b/gi},
    {guide:'helping',weight:7,words:/\b(?:how (?:can|do) i (?:help|support|comfort)|support (?:a|my|the) (?:friend|partner|child)|be there for|help (?:my|a) (?:grieving|struggling) (?:friend|partner|child))\b/gi},
    {guide:'grief',weight:6,words:/\b(?:grief|grieving|bereave(?:d|ment)?|died|passed away|lost my (?:mum|mom|dad|mother|father|child|baby|partner|wife|husband|friend|sister|brother|pet|dog|cat))\b/gi},
    {guide:'faith_questions',weight:5,words:/\b(?:doubts?|doubting|deconstruct(?:ing|ion)?|losing (?:my )?faith|faith is weak|struggl(?:e|ing) (?:with|to) (?:my )?(?:faith|believe)|where is god|god (?:feels|seems|is) (?:far|distant|silent|absent)|why (?:does|would|did) god|does god (?:even )?exist|abandoned by god|not sure (?:if |whether )?god|(?:can't|cannot|don't|do not) (?:feel|believe in|trust) god|is god (?:real|there)|questioning (?:my )?faith)\b/gi},
    {guide:'prayer',weight:5,words:/\b(?:(?:can't|cannot|(?:don't|do not) know how to) pray|help me pray|how (?:do|can|should) i pray|quiet time|daily devotion(?:al)?|prayers? (?:go |feel |seem )?unanswered|unanswered prayers?|god (?:isn't|is not|doesn't|does not) (?:answer(?:ing)?|listen(?:ing)?)|prayer (?:isn't|is not) working|struggl(?:e|ing) to pray)\b/gi},
    {guide:'forgiveness',weight:5,words:/\b(?:forgiv(?:e|eness|ing)|let go of (?:anger|resentment)|someone hurt me|they hurt me|betray(?:ed|al))\b/gi},
    {guide:'comparison',weight:5,words:/\b(?:compar(?:e|ing) (?:myself|ourselves|me|my life|my progress|my work|myself to|myself with|to others|with others)|comparison (?:with|to) (?:others|people)|jealous|env(?:y|ious)|imposter syndrome|skill issue|feel(?:ing)? like a fraud|everyone (?:else )?is (?:ahead|better)|falling behind|not good enough|never good enough|perfectionis(?:m|t)|prove (?:myself|my worth)|success (?:feels|is) empty)\b/gi},
    {guide:'shame',weight:5,words:/\b(?:guilt(?:y)?|ashamed|shame|hate myself|unworthy|failed god|god (?:is|must be) disappointed|(?:can't|cannot) forgive myself|sin(?:ned|ful)?|make amends|apolog(?:ise|ize))\b/gi},
    {guide:'anger',weight:5,words:/\b(?:angry|anger|furious|rage|short temper|losing my temper|snapp(?:ed|ing) at|be more patient)\b/gi},
    {guide:'suffering',weight:5,words:/\b(?:chronic (?:pain|illness)|hospital|surgery|illness|doctor'?s? (?:appointment|visit)|diagnos(?:ed|is)|cancer|seriously ill|suffering|miscarriage|infertil(?:e|ity)|depressed|depression|hopeless|numb|empty inside|nothing makes me happy)\b/gi},
    {guide:'anxiety',weight:5,words:/\b(?:anxious|anxiety|worr(?:y|ied|ies|ying)|panic(?:king)?|scared|afraid|fear(?:ful)?|terrified|racing (?:mind|thoughts)|overthinking|(?:can't|cannot) stop thinking|what if it (?:goes wrong|fails))\b/gi},
    {guide:'exhaustion',weight:5,words:/\b(?:exhaust(?:ed|ion)|burn(?:t|ed)? out|burnout|tired|weary|overwhelmed|stress(?:ed|ful)|need (?:a )?(?:break|rest)|too much (?:to do|going on)|(?:can't|cannot) sleep|slow down|no motivation|stuck in a rut|running on empty)\b/gi},
    {guide:'loneliness',weight:5,words:/\b(?:lonely|loneliness|alone|isolated|isolation|left out|rejected|unloved|no (?:one|body) (?:cares|understands)|nobody (?:cares|understands)|(?:don't|do not) belong|miss(?:ing)? my (?:family|friends?|partner))\b/gi},
    {guide:'conflict',weight:5,words:/\b(?:argu(?:e|ed|ing|ment)|family conflict|falling out|toxic|suspicious|sus|griefing|griefer|relationship (?:problem|trouble)|marriage (?:problem|trouble)|disagree(?:ment)?|difficult (?:conversation|colleague)|fight(?:ing)? with)\b/gi},
    {guide:'temptation',weight:5,words:/\b(?:tempt(?:ed|ation)|addict(?:ed|ion)|relaps(?:e|ed|ing)|bad habit|keep (?:sinning|giving in)|(?:can't|cannot) stop (?:drinking|gambling|using))\b/gi},
    {guide:'perseverance',weight:5,words:/\b(?:persever(?:e|ance)|keep going|stay (?:consistent|disciplined)|losing motivation|discipline|disciplined|working hard|hard work|fail(?:ed|ing)? (?:(?:my|the) )?(?:\w+ )?(?:exam|test|interview)s?|took (?:an |the )?l\b|\bbig l\b|not seeing (?:any )?results|no (?:progress|results)|doing well|going well|want to grow|build on my success|new challenge|achiev(?:ed|ement)|(?:reached|hit) my goal)\b/gi},
    {guide:'gratitude',weight:5,words:/\b(?:grateful|gratitude|thankful|thank you|thanks|thx|give thanks|thank god|celebrate|good news|joy(?:ful)?|happy|happiness|excited|bless(?:ed|ings)|proud|pregnan|new baby|engage(?:d|ment)|wedding|won|winning|victory|dub|passed my exam|won (?:the|my|a) (?:race|award|competition))\b/gi},
    {guide:'starting',weight:4,words:/\b(?:stuck|unmotivated|starting over|procrastinat(?:e|ing|ion)|putting (?:it|this|things) off|take action|get started|follow through|small steps?)\b/gi},
    {guide:'decisions',weight:4,words:/\b(?:decid(?:e|ing)|decisions?|choices?|wisdom|guidance|uncertain|unsure|fired|laid off|unemployed|job loss|redundan(?:t|cy)|purpose|calling|career|money|finances|financial|job offer|compar(?:e|ing) (?:these|the|my|our)? ?(?:choices|options|offers|paths)|trade[- ]?offs?|what(?:'s| is) (?:the |my )?(?:best |right )?next step)\b/gi}
  ];

  function negated(clause, position) {
    const prefix = clause.slice(0, position).replace(/\bnot (?:only|just)\b/g, '').replace(/\b(?:can't|cannot|can not) (?:stop|believe how)\b|\bnever (?:been|felt) (?:this|so)\b/g,'');
    const negatives = [...prefix.matchAll(/\b(?:not|never|no longer|no|nothing|without|hardly|neither|nor|(?:don|doesn|didn|isn|aren|wasn|weren|hasn|haven|hadn|can|couldn|wouldn|shouldn|won|shan)'t)\b/g)];
    if (!negatives.length) return false;
    const last = negatives[negatives.length - 1];
    const after = prefix.slice(last.index + last[0].length);
    // A new affirmative statement can follow a negated thought in one clause:
    // "I do not know why I feel anxious" still describes anxiety.
    if (/\b(?:i (?:am|feel)|i'm|we (?:are|feel)|we're)\b/.test(after)) return false;
    return (after.match(/[a-z']+/g) || []).length <= 8;
  }

  // This is a bounded language check, not a clinical assessment or an exhaustive
  // detector. Share it between passage selection and the human-support reply so
  // a phrase cannot be treated as danger in one and denied in the other.
  const safetyRules = [
    { kind:'selfHarm', words:/\b(?:suicid(?:e|al)|self[ -]?harm(?:ing|ed)?|(?:kill(?:ing)?|hurt(?:ing)?|harm(?:ing)?|cut(?:ting)?|poison(?:ing)?)\s+(?:myself|himself|herself|themselves)|(?:end(?:ing)?|tak(?:e|ing))\s+(?:my|his|her|their)\s+(?:own\s+)?life)\b/g },
    { kind:'selfHarm', words:/\b(?:took|taken|swallowed)\s+too many\s+(?:pills|tablets)\b/g },
    { kind:'selfHarm', words:/\b(?:(?:want|wants|wanting|wish|wishing|would like)\s+to\s+(?:die|be dead)|wish\s+i\s+(?:was|were)\s+dead)\b/g },
    { kind:'selfHarm', words:/\b(?:better off (?:dead|without me)|everyone (?:would be |will be )?better off|feel(?:ing)? like (?:dying|i(?:'| a)?m dying)|(?:cannot|can't|can not) (?:do this|take (?:it|this)) anymore|cutting again|started cutting|keep cutting)\b/g },
    // The negative belongs to the risk phrase: denying a wish to live is not a
    // denial of risk. A preceding denial can still negate the whole phrase.
    { kind:'selfHarm', words:/\b(?:(?:do not|don't|dont|no longer)\s+want\s+to\s+(?:live|be alive|be here(?!\s+(?:at|in)\s+(?:(?:this|the|a)\s+)?(?:party|meeting|class|office)))|not\s+wanting\s+to\s+(?:live|be alive|be here(?!\s+(?:at|in)\s+(?:(?:this|the|a)\s+)?(?:party|meeting|class|office)))|(?:cannot|can't|can not)\s+go\s+on(?!\s+(?:(?:a|the|my|this)\s+)?(?:holiday|vacation|trip|stage)))\b/g },
    { kind:'unsafe', words:/\b(?:abus(?:e[ds]?|ing|ive)|unsafe|threaten(?:ed|ing|s)?|assault(?:ed|ing|s)?|rap(?:e[ds]?|ing)|attacked|violence|in\s+(?:immediate\s+)?danger|being\s+(?:hit|beaten|punched|kicked|choked|strangled)|(?:hit(?:ting|s)?|beat(?:ing|s)?|punch(?:ed|ing|es)?|kick(?:ed|ing|s)?|chok(?:e[ds]?|ing)|strangl(?:e[ds]?|ing)|attack(?:s|ing))\s+me)\b/g },
    { kind:'unsafe', words:/\b(?:(?:not|no longer)\s+(?:(?:feeling|feel)\s+)?(?:very\s+|at all\s+)?safe|(?:do not|don't|dont|does not|doesn't|cannot|can't|can not)\s+feel\s+(?:very\s+|at all\s+)?safe|(?:isn't|aren't|wasn't|weren't)\s+safe)\b/g }
  ];
  safetyRules.push({kind:'unsafe',words:/\b(?:hit(?:ting|s)?|beat(?:ing|s)?|punch(?:ed|ing|es)?|kick(?:ed|ing|s)?|chok(?:e[ds]?|ing)|strangl(?:e[ds]?|ing))\s+(?:him|her|them|my (?:child|son|daughter))\b/g});
  safetyRules.push({kind:'unsafe',words:/\b(?:forced (?:himself|herself|themselves) on me|coerced me|pressured me into|forced me to (?:have sex|sleep with (?:him|her|them))|touched me inappropriately|molested(?: me)?)\b/g});

  function safetyNegated(clause, position) {
    let prefix = clause.slice(0, position).replace(/\bnobody\b/g, 'no one');
    // Uncertainty and inability to stop are not denials of what follows.
    prefix = prefix.replace(/\b(?:(?:do not|don't|dont|cannot|can't|can not)\s+(?:know|understand)|not\s+sure|(?:cannot|can't|can not|unable to)\s+(?:seem to\s+)?(?:stop|avoid|prevent))\b/g, '');
    prefix = prefix.replace(/\b(?:(?:cannot|can't|can not|unable to)\s+(?:escape|leave|get away from)|no\s+(?:reason|excuse|justification)\s+for|never\s+(?:thought|imagined|expected)|not to\s+(?:tell|report|mention))\b/g,'');
    if (/\b(?:do not|don't|dont)\s+(?:think|believe)\s+(?:that\s+)?(?:i\s+(?:am|feel)|i'm)\s*$/.test(prefix)) return true;
    // A fresh statement about another person can follow a denied feeling:
    // "I am not anxious because he is hitting me" still describes harm.
    prefix = prefix.replace(/\b(?:he|she|they|someone)\s+(?:is|are|was|were|has|have|keeps?|will)\b/g, ' i am ');
    return negated(prefix, prefix.length);
  }

  function safetyMatch(clauses) {
    // A shared subject may be omitted after "and". Keep a denial attached to
    // its own predicate, rather than carrying it into "and want to die".
    const statements = clauses.flatMap(clause => clause.split(/\b(?:because|although)\b|\band\s+(?=(?:want|wish|would like|am|is|are|do not|don't|dont|cannot|can't|can not|no longer|not)\b)/));
    const risks=[];
    for (const rule of safetyRules) {
      for (const clause of statements) {
        for (const word of clause.matchAll(rule.words)) {
          if (!safetyNegated(clause, word.index)) {
            const thirdParty = /\b(?:himself|herself|themselves|(?:his|her|their) (?:own )?life|(?:hit|hitting|hits|beating|beats|beat|punched|punching|kicking|kicked|choking|choked|strangling|strangled) (?:him|her|them|my (?:child|son|daughter)))\b/.test(word[0]) ||
              (!/\b(?:myself|my (?:own )?life|me)\b/.test(word[0]) && (rule.kind==='selfHarm'
                ? /\b(?:(?:my|a|our) (?:friend|daughter|son|child|brother|sister|partner|wife|husband|mother|father)|he|she|they)\s+(?:(?:has|have|had)\s+)?(?:is|are|was|were|feels?|wants?|says?|said|told|might|may|took|taken|swallowed|being|keeps?|has|have)\b/.test(clause)
                : /\b(?:(?:my|a|our) (?:friend|daughter|son|child|brother|sister|partner|wife|husband|mother|father)|he|she|they)\s+(?:(?:has|have|had) been|is|are|was|were)\s+(?:being\s+)?(?:abused|assaulted|unsafe|threatened|attacked|hit|beaten|raped|in danger)\b/.test(clause)));
            risks.push({kind:rule.kind,word:word[0],thirdParty});
          }
        }
      }
    }
    return risks.find(risk=>risk.kind==='selfHarm'&&!risk.thirdParty)||risks[0]||null;
  }

  function match(text, history = []) {
    const current = cleanText(text);
    const saved = normalizeEntries(history).filter(entry=>!entry.study);
    const fallback = { key:'foundation', matched:false, reason:'No clear theme matched what you wrote. Here is a starting passage; you can choose another theme.' };
    if (!current) return fallback;
    const clauses = clausesFor(current);
    const safety = safetyMatch(clauses);
    const found = safety ? [{key:'grief',word:safety.word,weight:100}] : [];
    for (const rule of guideRules) {
      for (const clause of clauses) for (const word of clause.matchAll(rule.words)) {
        if(rule.guide==='faith_questions'&&/^doubt/.test(word[0])&&!/\b(?:god|jesus|faith|christ|religion|belief)\b/.test(clause))continue;
        if (!negated(clause,word.index)) found.push({key:guideThemes[rule.guide],guide:rule.guide,word:word[0],weight:rule.weight});
      }
    }
    for (const rule of rules) {
      for (const clause of clauses) {
        for (const word of clause.matchAll(rule.words)) {
          if(rule.key==='foundation'&&/^doubt/.test(word[0])&&!/\b(?:god|jesus|faith|christ|religion|belief)\b/.test(clause))continue;
          if (!negated(clause, word.index)) found.push({ key:rule.key, word:word[0], weight:rule.weight });
        }
      }
    }
    // For equally strong themes, prefer a clearly stated feeling belonging to
    // the writer over a feeling mentioned about someone else. A specific guide
    // outranks a bare theme at the same weight: it answers more precisely.
    // Repeated evidence for one theme across clauses outranks a single
    // incidental mention elsewhere.
    const ownFeeling = key => clauses.some(clause=>/\b(?:i feel|i am|i'm|feel)\b/.test(clause)&&guideRules.some(rule=>guideThemes[rule.guide]===key&&[...clause.matchAll(rule.words)].some(word=>!negated(clause,word.index))));
    const totals = {};
    for (const hit of found) totals[hit.key] = (totals[hit.key] || 0) + hit.weight;
    const selected = found.sort((a, b) => b.weight - a.weight || (totals[b.key] || 0) - (totals[a.key] || 0) || Number(Boolean(b.guide)) - Number(Boolean(a.guide)) || Number(ownFeeling(b.key))-Number(ownFeeling(a.key)))[0];
    if (selected) {
      const related = saved.find(entry => entry.key === selected.key);
      const reason = `A passage on ${themes[selected.key]}, matched from “${selected.word}” in what you wrote. The passage comes from Steady’s verified library, not generated text.`;
      return { key:selected.key, matched:true, ...(!safety?{guide:selected.guide||defaults[selected.key]}:{}), reason:reason + (related ? ' You have an earlier entry on this theme.' : ''), ...(related ? { relatedId:related.id } : {}) };
    }
    const continuity = clauses.flatMap(clause => [...clause.matchAll(/\b(?:it (?:is |feels? )?(?:still here|the same)|still (?:the same|struggling with (?:it|that))|here i am again|same (?:thing|feeling|situation))\b/g)].filter(word => !negated(clause, word.index)))[0];
    if (continuity && saved.length) {
      const previous = saved[0];
      if(previous.unmatched)return fallback;
      return { key:previous.key, matched:true, ...(previous.guide?{guide:previous.guide}:{}), relatedId:previous.id, reason:`You wrote “${continuity[0]}”, so this returns to the theme of your most recent entry. Choose another theme if it does not fit.` };
    }
    return fallback;
  }

  function response(text, result=match(text)) {
    const safety=safetyMatch(clausesFor(text));
    if(safety?.thirdParty)return {urgent:true,thirdParty:true,acknowledgement:safety.kind==='selfHarm'?'It sounds like someone you care about may need immediate human support. If they are in immediate danger or have taken too much medication, contact emergency services now. If it is safe, stay with them and help them contact a crisis line or someone trustworthy. You do not have to handle this alone.':'Their safety matters. This passage is not a reason for them to stay in danger or forgive before they are safe. If there is immediate danger, contact local emergency services. If it is safe, help them reach someone trustworthy or specialist abuse support.'};
    if(safety?.kind==='selfHarm')return {urgent:true,acknowledgement:'You deserve immediate human support, not just a verse. If you have taken too much medication, have already hurt yourself or cannot stay safe, contact emergency services now. Otherwise, contact a crisis line where you are or someone you trust who can stay with you.'};
    if(safety?.kind==='unsafe')return {urgent:true,acknowledgement:'What you described sounds serious. This passage is offered for comfort, not as a reason to stay in danger or forgive before you are safe. If you can, contact someone trustworthy or local emergency support.'};
    const copy={
      grief:'This sounds painful. You do not have to make it sound smaller here.',
      rest:'It sounds like you are carrying a lot. This passage makes room for rest without judging you.',
      grace:'There may be hurt, guilt, or anger in this. This passage points toward tenderness without rushing forgiveness or repair.',
      connection:'It sounds like relationship and belonging matter here. This passage centres shared care rather than handling it alone.',
      wisdom:'This sounds like something you want to approach carefully. This passage begins with asking for wisdom, not having every answer already.',
      gratitude:'There is something meaningful or hopeful here. This passage gives you words for gratitude without denying anything difficult alongside it.',
      foundation:'I may not have caught the whole meaning yet. This is a grounded starting passage from Steady’s small library, and you can choose a different theme.'
    };
    return {urgent:false,acknowledgement:copy[result.key]||copy.foundation};
  }

  // Bare greetings get a warm authored reply, never a passage or a cold
  // miss. Longer sentences containing a greeting still match normally.
  // Returns the salutation ("Hello." / "Good morning.") or null.
  function greeting(text) {
    const clean = String(text || '').toLowerCase().replace(/[‘’]/g, "'").trim().replace(/[!.,;:]+$/g, '').trim();
    if (!clean || clean.length > 30) return null;
    const daypart = /\bgood\s+(morning|afternoon|evening|night)\b/.exec(clean)?.[1] || null;
    const bare = clean.replace(/\bgood\s+(?:morning|afternoon|evening|night)\b/g, '').replace(/\b(burden|there)\b/g, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
    if (bare === '' && daypart) return 'Good ' + daypart + '.';
    if (/^(hi|hello|hey|howdy)$/.test(bare)) return daypart ? 'Good ' + daypart + '.' : 'Hello.';
    return null;
  }

  // "How are you?" gets a short steady answer, never a search or a cold miss.
  // A leading greeting ("hello, how are you") is seen through, not tripped on.
  function checkin(text) {
    let clean = String(text || '').toLowerCase().replace(/[‘’]/g, "'").replace(/'/g, '').trim().replace(/[!.,;:?]+$/g, '').trim();
    if (!clean || clean.length > 40) return false;
    clean = clean.replace(/\b(burden|there|please)\b/g, '').replace(/^(hi|hello|hey|howdy|good (morning|afternoon|evening|night))\b[, ]*/, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim().replace(/[!.,;:?]+$/g, '').trim();
    return /^(how are you|howre you|how r u)( (doing|feeling)( today)?| today)?$/.test(clean);
  }

  return { match, response, normalizeEntries, guideThemes, greeting, checkin };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SteadyFeelings;
