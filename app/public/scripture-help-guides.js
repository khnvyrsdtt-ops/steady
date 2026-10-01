'use strict';
// Curated editorial guidance, not generated answers or individual divine direction.
// Quotations are assembled from the existing local chapter library at read time.
const SteadyScriptureHelp = (() => {
  const guides = {
    anxiety: {
      theme: 'rest', chapterKey: 'rest', verses: [28, 30],
      acknowledgement: 'When worries keep circling, another instruction can feel like another burden. You do not have to solve everything in this moment.',
      context: 'In Matthew, Jesus invites burdened people to come to him and learn his gentle way. His invitation concerns life with him, not a promise that anxiety will disappear immediately or that seeking other support shows weak faith.',
      practice: 'If useful, name one worry in a sentence. Ask what needs attention today and what can wait; choose just one manageable next step.'
    },
    exhaustion: {
      theme: 'rest', chapterKey: 'rest', verses: [28, 30],
      acknowledgement: 'Being tired is not a moral failure. Even meaningful work can leave little room to recover.',
      context: 'Jesus speaks to people who labour and carry heavy burdens, offering rest through coming to him and learning from him. This is more than a productivity break; the passage does not make rest something to earn by doing enough.',
      practice: 'If possible, put one non-essential demand down. If something still has to begin, choose a two-minute first action, then pause and reassess. Rest can be the next step too.'
    },
    grief: {
      theme: 'grief', chapterKey: 'grief', verses: [18, 18],
      acknowledgement: 'Loss does not need a tidy explanation here. You can miss someone or something without finding a lesson in it.',
      context: 'Psalm 34 is a song of praise attributed to David. Alongside accounts of rescue, it names broken hearts and crushed spirits. Its language of God’s nearness is not a timetable for grief to end.',
      practice: 'If you want, name what you miss, or remember one ordinary detail. You can leave it there without making it positive.'
    },
    loneliness: {
      theme: 'connection', chapterKey: 'connection', verses: [2, 2],
      acknowledgement: 'Wanting connection is not asking too much. Being around people and feeling known are not always the same thing.',
      context: 'Paul asks the Galatian communities to carry one another’s burdens. The surrounding verses join gentleness with responsibility. This is a call to shared care, not a claim that loneliness means you have failed to connect.',
      practice: 'If someone feels safe to approach, try one honest sentence: “I could use a little company.” If not, consider one welcoming group to explore.'
    },
    shame: {
      theme: 'grace', chapterKey: 'connection', verses: [1, 1],
      acknowledgement: 'Shame can turn “I did something wrong” into “I am beyond repair.” Those are not the same.',
      context: 'Paul tells the Galatian communities to restore someone who has fallen with gentleness, remembering their own vulnerability. Correction and compassion belong together here. The passage neither excuses wrongdoing nor treats a person as beyond restoration.',
      practice: 'If helpful, separate one thing you regret from a judgement about your whole self. Consider one honest repair that is safe and appropriate.'
    },
    anger: {
      theme: 'grace', chapterKey: 'wisdom', verses: [19, 20],
      acknowledgement: 'Anger can arrive before you know what to do with it. You can take it seriously without acting on its first demand.',
      context: 'James urges his readers to listen readily and to be slow in speech and anger. He challenges anger as a way of producing God’s righteousness. This does not require silence about harm or staying in an unsafe conversation.',
      practice: 'If safe, pause before replying. Name what happened without an insult, then decide whether this conversation needs a calmer time or a clear boundary.'
    },
    forgiveness: {
      theme: 'grace', chapterKey: 'grace', verses: [31, 32],
      acknowledgement: 'Forgiveness can be difficult, especially when harm is ongoing. You do not have to pretend that what happened was acceptable.',
      context: 'In Ephesians, Paul calls a Christian community away from malice and toward kindness and forgiveness, grounded in God’s forgiveness in Christ. This is not permission for harm. Forgiveness should not be used to demand restored trust, immediate reconciliation or returning to danger.',
      practice: 'If useful, name both the harm and the boundary you need. You can explore forgiveness with trusted support without contacting the person who hurt you.'
    },
    decisions: {
      theme: 'wisdom', chapterKey: 'wisdom', verses: [5, 5],
      acknowledgement: 'I can help you think through a choice, but I cannot know the best option without the options and what matters to you. Uncertainty is not a failure.',
      context: 'James writes to dispersed believers facing trials and encourages them to ask God for wisdom without reproach. This invitation is not a method for extracting an instant yes or no. It should not turn honest questions into shame or replace careful judgement.',
      practice: 'If helpful, name the decision, options and one missing fact. Your next step is the smallest safe action to get that fact. Tell me the options to compare.',
      compare: 'I can compare the options, but I need to know what they are and what matters most to you. Name the options, then judge each against the same two priorities. If one key fact is missing, get that fact before choosing.'
    },
    faith_questions: {
      theme: 'foundation', chapterKey: 'rest', verses: [2, 5],
      acknowledgement: 'A faith question does not need to be disguised as certainty. You can be honest about what you find hard to understand.',
      context: 'In Matthew, John sends a question to Jesus from prison. Jesus responds by pointing to what John’s messengers hear and see in his ministry. This particular exchange leaves room to bring a real question; it does not guarantee quick answers to every question today.',
      practice: 'If you want, put your question into one clear sentence. Read the surrounding chapter or bring it to someone who can listen without rushing you.'
    },
    prayer: {
      theme: 'foundation', chapterKey: 'foundation', verses: [7, 8],
      acknowledgement: 'Prayer does not have to begin with polished words or settled certainty. Not knowing what to say is a possible starting point.',
      context: 'In the Sermon on the Mount, Jesus invites asking, seeking and knocking, describing the Father through the image of a parent giving good gifts. This is not a formula guaranteeing a particular result or an immediate feeling of God’s presence.',
      practice: 'If you want, begin: “God, this is what I am carrying, and this is what I do not understand.” A short, honest prayer is enough.'
    },
    starting: {
      theme: 'foundation', chapterKey: 'foundation', verses: [24, 25],
      acknowledgement: 'A worthwhile beginning can be small. You do not need to design your whole future before taking one honest step.',
      context: 'Jesus closes the Sermon on the Mount with a picture of building on rock. The foundation is hearing his teaching and putting it into practice, not simply becoming more organised or successful. The house still encounters a storm.',
      practice: 'If useful, choose one teaching of Jesus you can put into practice today. Make the action small enough to begin, not impressive enough to prove yourself.'
    },
    perseverance: {
      theme: 'foundation', chapterKey: 'connection', verses: [9, 10],
      acknowledgement: 'Doing good work can be demanding even when things are going well. Continuing wisely is different from pushing without limits.',
      context: 'Paul encourages the Galatian communities to keep doing good as opportunities arise, within a passage about life in the Spirit and care for others. The promised harvest is not a guarantee of career success or quick visible results. Perseverance need not mean refusing rest.',
      practice: 'If helpful, identify the good you want to keep doing. Choose a sustainable next step and one limit that will help you continue.'
    },
    comparison: {
      theme: 'grace', chapterKey: 'connection', verses: [4, 5],
      acknowledgement: 'Someone else’s progress can make your own work feel smaller. Their visible results are not the whole measure of your life.',
      context: 'Paul asks the Galatian communities to examine their own work rather than build their confidence on another person’s standing. He also calls them to carry each other’s burdens. Personal responsibility here does not mean isolated self-sufficiency or a contest of worth.',
      practice: 'If useful, name one thing you are responsible for today. Judge the next step by honesty and care, not by whether it outshines someone else.'
    },
    gratitude: {
      theme: 'gratitude', chapterKey: 'gratitude', verses: [16, 18],
      acknowledgement: 'You can appreciate something good without denying what is difficult. Gratitude can also make room to enjoy a season that is going well.',
      context: 'Paul’s closing instructions to the Thessalonian community join rejoicing, prayer and thanksgiving with patient care for others. Giving thanks in circumstances is not the same as calling every circumstance good. These words should not be used to demand a cheerful response to suffering.',
      practice: 'If you want, notice one specific good thing and why it mattered. Let it be enough without needing a list or a lesson.'
    },
    helping: {
      theme: 'connection', chapterKey: 'connection', verses: [2, 2],
      acknowledgement: 'Wanting to help does not mean you must carry everything. Small, reliable care can matter without making you responsible for every outcome.',
      context: 'Paul tells the Galatian communities to bear one another’s burdens, linking shared care with the law of Christ. The wider passage includes personal responsibility too. Helping is not taking control of someone else’s life or ignoring your own limits.',
      practice: 'If appropriate, ask, “What would help most right now?” Offer one thing you can genuinely manage, and leave room for the other person to decline.'
    },
    conflict: {
      theme: 'connection', chapterKey: 'grace', verses: [29, 29],
      acknowledgement: 'A difficult conversation can involve both a real concern and a risk of hurting each other. Being clear need not mean being cruel.',
      context: 'Paul’s instructions in Ephesians connect truthful speech with words that meet another person’s need and build them up. This is not a demand to agree, conceal wrongdoing or stay in unsafe contact. Care and a firm boundary can belong in the same response.',
      practice: 'If safe, draft one sentence about the issue without attacking the person. Ask whether it needs to be said now, later or with support.'
    },
    temptation: {
      theme: 'rest', chapterKey: 'wisdom', verses: [13, 15],
      acknowledgement: 'An unwanted thought is not the same as choosing to act. When a pull conflicts with your values, a pause can leave room for choice.',
      context: 'James tells his readers not to blame God for temptation and describes how desire can develop into harmful action. This is a warning about what is cultivated, not a claim that every passing thought is a chosen wrong or that struggle makes someone beyond grace.',
      practice: 'If helpful, step away from one immediate opportunity to act against your values. Choose a different activity or contact someone trustworthy before deciding what comes next.'
    },
    suffering: {
      theme: 'grief', chapterKey: 'grief', verses: [18, 19],
      acknowledgement: 'You do not need to explain suffering away to bring it here. Pain is not proof that you have failed at faith.',
      context: 'Psalm 34, attributed to David, speaks of God’s nearness while acknowledging that righteous people face many troubles. Its confidence in deliverance does not supply a reason for your particular suffering or a deadline for relief. It is not a reason to forgo practical support.',
      practice: 'If you want, name the hardest part of today and one kind of support that could make it less lonely. No explanation or lesson is required.'
    }
  };
  for (const guide of Object.values(guides)) { Object.freeze(guide.verses); Object.freeze(guide); }
  Object.freeze(guides);

  // Book names, so a displayed reference can be built from the book's own id
  // rather than copied from the chapter object. The chapter object is supplied by
  // the caller, so its own `reference` and `sources` are not trusted: a tampered
  // library must not be able to relabel where a passage came from or point the
  // publisher link somewhere else. 'Psalms' is cited as 'Psalm', as shipped.
  const bookNames = {
    GEN:'Genesis', EXO:'Exodus', LEV:'Leviticus', NUM:'Numbers', DEU:'Deuteronomy', JOS:'Joshua', JDG:'Judges', RUT:'Ruth',
    '1SA':'1 Samuel', '2SA':'2 Samuel', '1KI':'1 Kings', '2KI':'2 Kings', '1CH':'1 Chronicles', '2CH':'2 Chronicles', EZR:'Ezra',
    NEH:'Nehemiah', EST:'Esther', JOB:'Job', PSA:'Psalm', PRO:'Proverbs', ECC:'Ecclesiastes', SNG:'Song of Solomon', ISA:'Isaiah',
    JER:'Jeremiah', LAM:'Lamentations', EZK:'Ezekiel', DAN:'Daniel', HOS:'Hosea', JOL:'Joel', AMO:'Amos', OBA:'Obadiah', JON:'Jonah',
    MIC:'Micah', NAM:'Nahum', HAB:'Habakkuk', ZEP:'Zephaniah', HAG:'Haggai', ZEC:'Zechariah', MAL:'Malachi', MAT:'Matthew', MRK:'Mark',
    LUK:'Luke', JHN:'John', ACT:'Acts', ROM:'Romans', '1CO':'1 Corinthians', '2CO':'2 Corinthians', GAL:'Galatians', EPH:'Ephesians',
    PHP:'Philippians', COL:'Colossians', '1TH':'1 Thessalonians', '2TH':'2 Thessalonians', '1TI':'1 Timothy', '2TI':'2 Timothy',
    TIT:'Titus', PHM:'Philemon', HEB:'Hebrews', JAS:'James', '1PE':'1 Peter', '2PE':'2 Peter', '1JN':'1 John', '2JN':'2 John',
    '3JN':'3 John', JUD:'Jude', REV:'Revelation',
  };

  // The citation and the source link are derived from the book's id and the chapter
  // number, which the generated library records. A caller who swaps in its own
  // chapter object still gets an honest reference, or none at all.
  function passage(id, translation = 'web', chapters) {
    if (typeof id !== 'string' || !Object.hasOwn(guides, id) || !['web', 'asv'].includes(translation)) return null;
    const guide = guides[id];
    if (!chapters || typeof chapters !== 'object' || !Object.hasOwn(chapters, guide.chapterKey)) return null;
    const chapter = chapters[guide.chapterKey];
    if (!chapter || typeof chapter.book !== 'string' || !Number.isInteger(chapter.chapter)) return null;
    const name = bookNames[chapter.book];
    if (!name) return null;
    const rows = chapter?.translations?.[translation];
    if (!Array.isArray(rows)) return null;
    const [first, last] = guide.verses, selected = rows.slice(first - 1, last);
    // Contiguity is required on purpose: a range that spans a verse with no text
    // yields nothing at all rather than a passage stitched across the gap.
    if (selected.length !== last - first + 1 || selected.some((verse, index) =>
      !verse || verse.number !== first + index || typeof verse.text !== 'string' || !verse.text.trim())) return null;
    return {
      reference: `${name} ${chapter.chapter}:${first}${last === first ? '' : '–' + last}`,
      text: selected.map(verse => verse.text).join(' '),
      chapterKey: guide.chapterKey,
      verses: [...guide.verses],
      source: `https://ebible.org/eng-${translation}/${chapter.book}${String(chapter.chapter).padStart(chapter.book === 'PSA' ? 3 : 2, '0')}.htm`,
    };
  }
  return Object.freeze({guides, passage});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SteadyScriptureHelp;
