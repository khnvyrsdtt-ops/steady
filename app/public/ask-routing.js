'use strict';
/* Decide which answers must stay in the verified Scripture path. A failed
   reading-note lookup is not evidence that a question is non-biblical. */
const SteadyAskRouting = (() => {
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const general = () => ({scripture:false,study:null});
  const sacred = /\b(?:bible|biblical|scriptures?|scipture|gospels?|old testament|new testament|holy spirit|jesus|christ|messiah|apostles?|disciples?|parables?|crucifixion|resurrection|psalms?|epistles?)\b/i;
  const people = /\b(?:melchizedek|nicodemus|moses|abraham|abram|goliath|pharaoh|nebuchadnezzar|ezekiel|zechariah|habakkuk|hezekiah|jehoshaphat|zerubbabel|mephibosheth|bethsheba|bathsheba|beelzebub|lazarus|pontius pilate|mary magdalene|judas iscariot|john the baptist|solomon|samson|delilah|cain|abel|noah|isaac|jacob|esau|joseph|elijah|elisha|sarah|hagar|rebekah|rachel|leah|ruth|naomi|boaz|esther|mordecai|deborah|gideon|samuel|saul|david|jonah|isaiah|jeremiah|daniel|hosea|amos|micah|malachi|obadiah|nahum|haggai|zephaniah|joel|joshua|stephen|barnabas|timothy|titus|philemon)\b/i;
  const religious = /\b(?:god|lord|pray|prayer|faith|grace|church|sin|heaven|worship|forgiv(?:e|eness))\b/i;
  const explanation = /\b(?:explain|summari[sz]e|interpret|context|authorship|author|quote|quotation|teach|teaches|taught)\b|\b(?:what (?:does|did).*(?:say|mean)|tell me (?:about|why|who|how)|help me understand)\b/i;
  const literary = /\b(?:poem|poetry|poetic|lyrics?|rap|songs?|songwriting|chorus|novel|harry potter|shakespeare)\b/i;
  const everydayBooks = new Set(['Job','Numbers','Mark','Acts','Song of Solomon','John','Luke','James','Matthew','Daniel','Joel','Ruth','Esther','Joshua','Jude','Titus']);
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function namedBook(text,bible){
    return Boolean(bible?.books?.some(book=>{
      const pattern = escape(book.name);
      if(everydayBooks.has(book.name))return new RegExp('\\b(?:book|gospel|epistle|letter|prophecy|chapter) (?:of |to |according to )?'+pattern+'\\b|\\b'+pattern+'(?:[’\x27]s)? (?:gospel|epistle|letter|prophecy)\\b','i').test(text);
      return new RegExp('\\b'+pattern+'\\b','i').test(text);
    }));
  }
  function verseRequest(text){
    return !literary.test(text)&&/\b(?:verse|verses|scriptural|ten commandments|sermon on the mount|beatitudes|prodigal son|good samaritan|garden of eden|ark of the covenant)\b/i.test(text);
  }
  function contextual(text){
    const value=text.toLowerCase().replace(/[’']/g,'').replace(/[.!?]+$/,'').replace(/\s+/g,' ').trim();
    if(/^(?:(?:and|so|but) )?(?:why (?:did|does|would) (?:he|she|they) (?:do|say) that|what (?:did|does) (?:he|she|they) mean(?: by that)?|what happened next in (?:the|that) (?:story|passage)|how is (?:this|that|it) relevant to (?:me|us))$/.test(value))return true;
    return /^(?:(?:and|so|but) )?(?:(?:(?:can|could|would) you |please )?(?:explain|tell me|say) (?:more|that|this|it)(?: (?:about (?:that|this|it)|a bit more|more|further|in detail|in context))?|go (?:a bit )?deeper|(?:more|a bit more) (?:detail|context)|what (?:does|did) (?:that|this|it) mean(?: for (?:me|us))?|what happened (?:next|after(?: that)?)|what (?:is|was|are|were) (?:the )?(?:context|meaning)|why (?:is|was|are|were|does|did) (?:that|this|it)(?: (?:so|important|true|relevant|like that|for me))?|how (?:does|do|did|is|was|will) (?:that|this|it)(?: work| help(?: me| us)?)?|what about (?:that|this|it)|how many (?:books|chapters|verses)(?: (?:are there|does it have))?)$/.test(value);
  }
  function recentStudy(history,now){
    const item=Array.isArray(history)?history[0]:null;
    const age=now-Date.parse(item?.at);
    if(!item?.study||item.reflection||item.answer||!Number.isFinite(age)||age<0||age>2*60*60*1000)return null;
    return item;
  }
  function routeStudy(text,study,bible,personal,history){
    return typeof study?.classify==='function'?study.classify(text,bible,personal,history):null;
  }
  function search(text){
    const query=text.replace(/^(?:search(?: the bible)?(?: for)?|find(?: verses? (?:about|on|with))?|look up)\s+/i,'').trim();
    return query.length>160?{kind:'clarify',query:'shorter'}:query?{kind:'search',query}:{kind:'clarify',query:'followup'};
  }
  // `now` may be supplied by tests. Only the immediately preceding, recent
  // Scripture turn can supply implicit context; no scan through older topics.
  function resolve(text,{bible,study,personal,history=[],explicitScripture=false,now=Date.now()}={}){
    text=clean(text);if(!text)return general();
    const reference=bible?.parseReference?.(text);
    if(reference)return {scripture:true,study:reference.error&&text.length>160?{kind:'clarify',query:'shorter'}:{kind:'reference',query:reference.error?text:reference.reference}};
    const prior=recentStudy(history,now);
    const continuation=Boolean(prior&&contextual(text));
    // Without a current Scripture antecedent, "tell me more" belongs to the
    // general conversation, not the old study classifier's Bible clarification.
    const currentHistory=prior?history:[];
    const chosen=routeStudy(text,study,bible,personal,currentHistory);
    const explicit=sacred.test(text)||verseRequest(text)||namedBook(text,bible)||citation.test(boundaryText(text))||proseCitation.test(boundaryText(text));
    const personQuestion=people.test(text)&&(/\b(?:moses|abraham|abram|melchizedek|nicodemus|goliath|pharaoh|nebuchadnezzar|jehoshaphat|zerubbabel|mephibosheth|beelzebub|pontius pilate|mary magdalene|judas iscariot|john the baptist)\b/i.test(text)
      ||/\b(?:priest|prophet|apostle|disciple|king|covenant|promised land|wilderness|ark|crucified|baptized|baptised|red sea|burning bush|(?:strike|struck) (?:the )?rock|(?:slay|slew|kill|killed) goliath)\b/i.test(text)
      ||/\b(?:who was|where did|when did|story of|life of)\b/i.test(text))
      &&!(/\b(?:my (?:friend|brother|sister|partner|colleague|coworker|boss|son|daughter)|named|called)\b/i.test(text)&&!explicit);
    // Preserve established prepared notes, including familiar Bible quotations.
    // Searches and statistics need positive scope: "look up" alone is general.
    const prepared=chosen?.kind==='note';
    const stripped=text.replace(/^(?:search(?: the bible)?(?: for)?|find|look up)\s+/i,'');
    const searchedNote=stripped!==text&&routeStudy(stripped,study,bible,personal,[])?.kind==='note';
    const faithSupport=Boolean(religious.test(text)&&(personal?.matched||/\b(?:i|my|me)\b/i.test(text)&&/\b(?:god|lord|pray|prayer|worship)\b/i.test(text)));
    const scripture=Boolean(explicitScripture||explicit||personQuestion||prepared||searchedNote||faithSupport||continuation);
    if(!scripture)return general();
    // A lived experience already has a curated support guide. It must not turn
    // into an unrelated word search merely because it mentions faith or God.
    if(faithSupport&&!explicitScripture&&!explanation.test(text)&&!verseRequest(text)&&!chosen)return {scripture:true,study:null};
    if(chosen&&chosen.kind!=='clarify')return {scripture:true,study:chosen};
    if(continuation){
      const expanded=routeStudy('explain more',study,bible,personal,currentHistory);
      return {scripture:true,study:expanded||{kind:'clarify',query:'followup'}};
    }
    if(chosen?.kind==='clarify')return {scripture:true,study:chosen};
    return {scripture:true,study:search(text)};
  }

  const bookNames='Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of (?:Solomon|Songs)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation|Gen|Exod?|Lev|Deut|Josh|Judg|Sam|Kgs|Chr|Neh|Esth|Ps|Prov|Eccl|Isa|Jer|Ezek|Dan|Hos|Obad|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt?|Mrk|Luk|Jn|Jhn|Rom|Cor|Gal|Eph|Phil|Col|Thess?|Tim|Phlm|Heb|Jas|Pet|Rev';
  // Chapter:verse always counts. A bare number counts after a distinctive
  // book name, but names that are also everyday words or first names ("my
  // job 3 days a week", "John 2 years ago") need a reading cue or a
  // numbered-book prefix. Kept in step with BurdenScriptureBoundary in Swift.
  const ordinal='(?:[1-3]|first|second|third)\\s*';
  const distinctBooks='(?:gen(?:esis)?|exod(?:us)?|lev(?:iticus)?|deut(?:eronomy)?|chr(?:on(?:icles)?)?|neh(?:emiah)?|ps(?:alms?)?|prov(?:erbs)?|eccl(?:esiastes)?|song of (?:solomon|songs)|isa(?:iah)?|jer(?:emiah)?|lamentations|ezek(?:iel)?|obad(?:iah)?|hab(?:akkuk)?|zeph(?:aniah)?|hag(?:gai)?|zech(?:ariah)?|rom(?:ans)?|cor(?:inthians)?|gal(?:atians)?|eph(?:esians)?|philippians|colossians|thess?(?:alonians)?|heb(?:rews)?|philem(?:on)?|phlm|revelation)';
  const everydayCitationBooks='(?:ex|num(?:bers)?|josh(?:ua)?|judg(?:es)?|ruth|sam(?:uel)?|k(?:in)?gs|ezra|esth(?:er)?|job|lam|dan(?:iel)?|hos(?:ea)?|joel|amos|jonah|mic(?:ah)?|nah(?:um)?|mal(?:achi)?|matt?(?:hew)?|mk|mrk|mark|lk|luk|luke|jn|jhn|john|acts|phil|col|tim(?:othy)?|titus|jas|james|pet(?:er)?|jude|rev)';
  const numberedBooks='(?:sam(?:uel)?|k(?:in)?gs|jn|jhn|john|tim(?:othy)?|pet(?:er)?)';
  const readingCue='(?:read|try|study|open|look at|turn to|according to|in|book of)\\s+';
  const citationPatterns=[
    new RegExp('\\b(?:'+ordinal+')?(?:'+bookNames+')\\.?\\s*\\d{1,3}\\s*:\\s*\\d{1,3}\\b','i'),
    new RegExp('\\b(?:'+ordinal+')?'+distinctBooks+'\\.?\\s+\\d','i'),
    new RegExp('\\b'+readingCue+'(?:'+ordinal+')?'+everydayCitationBooks+'\\.?\\s+\\d','i'),
    new RegExp('\\b'+ordinal+numberedBooks+'\\.?\\s+\\d','i')
  ];
  const citation={test:text=>citationPatterns.some(pattern=>pattern.test(text))};
  const numberWord='(?:\\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)';
  const proseCitation=new RegExp('\\b(?:(?:[123]|first|second|third)\\s*)?(?:'+bookNames+')\\.?\\s+(?:(?:chapter|verse)\\s+'+numberWord+'|'+numberWord+'(?:[ -]'+numberWord+')?\\s*,?\\s+verse\\s+'+numberWord+')\\b','i');
  // Normalize only for boundary checks; preserve the user's and model's actual
  // wording. Full-width digits or invisible separators cannot bypass lookup.
  const boundaryText=text=>text.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'');
  function validGeneralAnswer(value){
    const text=clean(value);
    if(!text||text.length>3000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))return null;
    const checked=boundaryText(text);
    if(/<\/?(?:script|iframe|div|span|p|a|html|body|img)\b[^>]*>/i.test(checked)||citation.test(checked)||proseCitation.test(checked))return null;
    if(/\b(?:scripture|the bible|god|jesus|christ|the lord|the holy spirit)\s+(?:says?|said|reads?|states?|declares?|commands?|tells? us|teaches?|taught|promises?|is telling you|wants you to|told me)\b|\baccording to (?:scripture|the bible)\b|\b(?:bible|biblical|scripture)\s+(?:quote|quotation|verse|passage)\s*(?:is|says?|reads?|:)|\bas (?:it is|is) written\b|\b(?:for god so loved the world|the lord is my shepherd|i can do all things through christ)\b/i.test(checked))return null;
    return text;
  }
  return Object.freeze({resolve,validGeneralAnswer});
})();
if(typeof window!=='undefined')window.SteadyAskRouting=SteadyAskRouting;
if(typeof module!=='undefined'&&module.exports)module.exports=SteadyAskRouting;
