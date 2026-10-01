(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SteadyBible=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  // Metadata stays small and available before the separately loaded text corpus.
  const books=[
    ['GEN','Genesis',50,'gen ge gn'],['EXO','Exodus',40,'exod exo ex'],['LEV','Leviticus',27,'lev le lv'],['NUM','Numbers',36,'num nu nm'],['DEU','Deuteronomy',34,'deut deu dt'],['JOS','Joshua',24,'josh jos'],['JDG','Judges',21,'judg jdg jg'],['RUT','Ruth',4,'ruth rut ru'],['1SA','1 Samuel',31,'1sam 1sa'],['2SA','2 Samuel',24,'2sam 2sa'],['1KI','1 Kings',22,'1kgs 1ki'],['2KI','2 Kings',25,'2kgs 2ki'],['1CH','1 Chronicles',29,'1chron 1chr 1ch'],['2CH','2 Chronicles',36,'2chron 2chr 2ch'],['EZR','Ezra',10,'ezr'],['NEH','Nehemiah',13,'neh ne'],['EST','Esther',10,'esth est'],['JOB','Job',42,'jb'],['PSA','Psalms',150,'psalm psa ps pss'],['PRO','Proverbs',31,'prov pro pr'],['ECC','Ecclesiastes',12,'eccles eccl ecc'],['SNG','Song of Solomon',8,'song songs sos sng'],['ISA','Isaiah',66,'isa is'],['JER','Jeremiah',52,'jer je'],['LAM','Lamentations',5,'lam la'],['EZK','Ezekiel',48,'ezek ezk'],['DAN','Daniel',12,'dan da dn'],['HOS','Hosea',14,'hos ho'],['JOL','Joel',3,'joel jol jl'],['AMO','Amos',9,'amo am'],['OBA','Obadiah',1,'obad oba ob'],['JON','Jonah',4,'jon jnh'],['MIC','Micah',7,'mic mi'],['NAM','Nahum',3,'nah nam na'],['HAB','Habakkuk',3,'hab'],['ZEP','Zephaniah',3,'zeph zep'],['HAG','Haggai',2,'hag'],['ZEC','Zechariah',14,'zech zec'],['MAL','Malachi',4,'mal'],['MAT','Matthew',28,'matt mat mt'],['MRK','Mark',16,'mark mrk mk'],['LUK','Luke',24,'luke luk lk'],['JHN','John',21,'john jhn jn'],['ACT','Acts',28,'acts act ac'],['ROM','Romans',16,'rom ro rm'],['1CO','1 Corinthians',16,'1cor 1co'],['2CO','2 Corinthians',13,'2cor 2co'],['GAL','Galatians',6,'gal ga'],['EPH','Ephesians',6,'eph ep'],['PHP','Philippians',4,'phil php pp'],['COL','Colossians',4,'col co'],['1TH','1 Thessalonians',5,'1thess 1thes 1th'],['2TH','2 Thessalonians',3,'2thess 2thes 2th'],['1TI','1 Timothy',6,'1tim 1ti'],['2TI','2 Timothy',4,'2tim 2ti'],['TIT','Titus',3,'tit ti'],['PHM','Philemon',1,'philem phlm phm'],['HEB','Hebrews',13,'heb he'],['JAS','James',5,'james jas jam jm'],['1PE','1 Peter',5,'1pet 1pe 1pt'],['2PE','2 Peter',3,'2pet 2pe 2pt'],['1JN','1 John',5,'1john 1jn'],['2JN','2 John',1,'2john 2jn'],['3JN','3 John',1,'3john 3jn'],['JUD','Jude',1,'jude jud'],['REV','Revelation',22,'revelations rev re rv']
  ].map(([id,name,chapters,short])=>Object.freeze({id,name,chapters,aliases:short.split(' ')}));
  const byId=new Map(books.map(book=>[book.id,book]));
  const aliases=new Map();
  const aliasKey=value=>String(value).toLowerCase().replace(/[.\s]/g,'');
  function register(alias,book){aliases.set(aliasKey(alias),book);}
  for(const book of books){
    for(const name of [book.id,book.name,...book.aliases]){
      register(name,book);
      if(/^[123]/.test(name)){
        const digit=Number(name[0]),base=name.slice(1).trim();
        register(['','first','second','third'][digit]+' '+base,book);
        register(['','i','ii','iii'][digit]+' '+base,book);
      }
    }
  }
  register('Song of Songs',byId.get('SNG'));register('Canticles',byId.get('SNG'));
  // Match compact abbreviations, optional spaces/dots, and an embedded reference
  // such as "What does John 3:16 mean?". Bounds are checked by getPassage.
  const aliasPattern=[...aliases.keys()].sort((a,b)=>b.length-a.length).map(alias=>alias.split('').join('\\s*')).join('|');
  const referencePattern=new RegExp('\\b('+aliasPattern+')\\.?\\s*(\\d{1,4})(?:\\s*:\\s*(\\d{1,4})(?:\\s*[-–—]\\s*(?:(\\d{1,4})\\s*:\\s*)?(\\d{1,4}))?)?(?:\\s*[-–—]\\s*(\\d{1,4}))?','ig');
  const ordinaryWordAliases=new Set(['am','is','he','job','mark','numbers','acts','song','songs']);
  function referenceMatches(query){
    return [...query.matchAll(referencePattern)].filter(match=>{
      // Short aliases and book names can also be everyday words. "I am 2
      // weeks behind" is not a request to read Amos. Explicit verses, bare
      // references and clearly requested chapters remain available.
      if(match[3]!==undefined||!ordinaryWordAliases.has(aliasKey(match[1])))return true;
      const before=query.slice(0,match.index).trim(),after=query.slice(match.index+match[0].length).trim();
      return !before&&/^[?!.]*$/.test(after)||/\b(?:read|explain|context(?: of)?|chapter|book|verse|about|does)\s*$/i.test(before)||/\b(?:mean|context)\b/i.test(after);
    });
  }
  let nodeData;
  function data(){
    if(root.SteadyBibleData)return root.SteadyBibleData;
    if(typeof module==='object'&&module.exports){
      if(!nodeData){try{nodeData=require('./bible-data.js');}catch{return null;}}
      return nodeData;
    }
    return null;
  }
  function ready(){const corpus=data();return Boolean(corpus&&corpus.schema===1&&corpus.translations&&corpus.translations.web&&corpus.translations.asv);}
  function parseReference(query){
    if(typeof query!=='string'||query.length>1000)return null;
    const matches=referenceMatches(query),match=matches[0];if(!match)return null;
    const book=aliases.get(aliasKey(match[1])),bareNumber=Number(match[2]);
    // Single-chapter letters are often cited as "Jude 24". Preserve "Jude
    // 1" as the whole chapter, but accept "Jude 1-5" as verses 1 through 5.
    const shorthand=book.chapters===1&&match[3]===undefined&&(bareNumber>1||match[6]!==undefined);
    const chapter=shorthand?1:bareNumber;
    const startVerse=shorthand?bareNumber:match[3]===undefined?null:Number(match[3]);
    const endChapter=match[4]===undefined?chapter:Number(match[4]);
    const endVerse=shorthand?(match[6]===undefined?startVerse:Number(match[6])):match[5]===undefined?startVerse:Number(match[5]);
    const chapterReference=(book.id==='PSA'?'Psalm':book.name)+' '+chapter;
    const reference=chapterReference+(startVerse===null?'':':'+startVerse+(endVerse===startVerse&&endChapter===chapter?'':'-'+(endChapter===chapter?'':endChapter+':')+endVerse));
    const result={bookId:book.id,book:book.name,chapter,startVerse,endVerse,endChapter,reference};
    // Never interpret a malformed or cross-chapter range as its first verse.
    const tail=query.slice(match.index+match[0].length);
    if((match[6]!==undefined&&!shorthand)||/^\s*(?::|[-–—](?:\s*\d|\s*$)|[,;.&+]\s*\d|\d|(?:to|through|and|or)\s+\d|[,;]?\s*(?:vv?|verses?)\.?\s*\d)/i.test(tail)||/^[a-z]/i.test(tail))result.error='Use one chapter, verse, or verse range, such as John 3:16–18.';
    if(endChapter!==chapter)result.error='Please read one chapter at a time, such as John 3 or John 4.';
    if(matches.length>1)result.error='Please look up one Bible reference at a time.';
    if(/\b(?:\d+|iv|v|vi|vii|viii|ix|x|fourth|fifth)\s*$/i.test(query.slice(0,match.index)))result.error='That numbered book is not in this 66-book collection. Check the book name.';
    return result;
  }
  function translationInfo(requested){
    const normalized=typeof requested==='string'?requested.toLowerCase():'web';
    const translation=normalized==='asv'?'asv':'web';
    return {translation,requestedTranslation:normalized,fallback:normalized!==translation};
  }
  function source(bookId,chapter,translation,verse){
    return 'https://ebible.org/eng-'+translation+'/'+bookId+String(chapter).padStart(bookId==='PSA'?3:2,'0')+'.htm'+(verse?'#V'+verse:'');
  }
  function fail(info,code,error){return Object.assign({verses:[],omittedVerses:[]},info,{ok:false,code,error});}
  function getPassage(input,requested='web'){
    const info=translationInfo(requested),parsed=typeof input==='string'?parseReference(input):input;
    if(!parsed||typeof parsed!=='object'||!byId.has(parsed.bookId))return fail(info,'invalid_reference','Try a Bible reference such as John 3:16 or Romans 8.');
    const book=byId.get(parsed.bookId),chapter=parsed.chapter;
    const base=Object.assign({},info,{bookId:book.id,book:book.name,chapter,reference:parsed.reference,chapterReference:(book.id==='PSA'?'Psalm':book.name)+' '+chapter});
    if(parsed.error)return fail(base,'unsupported_range',parsed.error);
    if(parsed.endChapter!==undefined&&parsed.endChapter!==chapter)return fail(base,'unsupported_range','Please read one chapter at a time, such as John 3 or John 4.');
    if(!Number.isInteger(chapter)||chapter<1||chapter>book.chapters)return fail(base,'invalid_chapter',book.name+' has '+book.chapters+' chapter'+(book.chapters===1?'':'s')+'.');
    if(!ready())return fail(base,'not_loaded','The Bible text is still loading. Please try again.');
    const rows=data().translations[info.translation][book.id][chapter-1];
    const first=parsed.startVerse===null||parsed.startVerse===undefined?rows[0][0]:parsed.startVerse;
    const last=parsed.startVerse===null||parsed.startVerse===undefined?rows.at(-1)[0]:(parsed.endVerse===undefined?first:parsed.endVerse);
    if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first||last>rows.at(-1)[0]||!rows.some(row=>row[0]===first))return fail(base,'invalid_verse',base.chapterReference+' has verses 1–'+rows.at(-1)[0]+'. Choose a range within that chapter.');
    const selected=rows.filter(row=>row[0]>=first&&row[0]<=last);
    const omittedVerses=selected.filter(row=>!row[1]).map(row=>row[0]);
    const verses=selected.filter(row=>row[1]).map(([number,text])=>({number,text}));
    const notes=[];
    if(info.fallback)notes.push('This translation is not included; showing the World English Bible (WEB).');
    if(omittedVerses.length)notes.push('Verse '+omittedVerses.join(', ')+' has no main-text wording in this translation; the source discusses the manuscript variation in a footnote.');
    const note=notes.join(' ');
    const result=Object.assign({ok:true},base,{verses,omittedVerses,source:source(book.id,chapter,info.translation,parsed.startVerse),note});
    if(!verses.length)return fail(result,'omitted_verse',note+' Read the surrounding chapter for context.');
    return result;
  }
  function getChapter(bookName,chapter,translation='web'){
    const book=byId.get(bookName)||aliases.get(aliasKey(bookName));
    if(!book)return fail(translationInfo(translation),'invalid_reference','That book is not in this 66-book collection.');
    return getPassage({bookId:book.id,chapter,startVerse:null,endVerse:null,reference:(book.id==='PSA'?'Psalm':book.name)+' '+chapter},translation);
  }
  const normalize=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const stop=new Set('a an and are as at be been being bible biblical but by can could did do does for from had has have he her here him his how i if in into is it its me my of on or our passage please scripture scriptures she should so some tell than that the their them then there these they this those through to us verse verses was we were what when where which who why will with would you your about says say read find show meaning mean explain teaches teach'.split(' '));
  // These are lexical expansions, not claims that every occurrence gives
  // personal guidance. Avoid associations such as lonely → forsaken (which
  // includes forsaking God), stress → cargo burdens, or rest → weariness.
  const synonymGroups=[['anxiety','anxious','worry','worried'],['stress','distress','distressed','anxiety','anxious'],['grief','mourn','mourning','sorrow','weep','weeping'],['forgiveness','forgive','forgiven','forgiving'],['prayer','pray','praying','prayers'],['fear','afraid','fearful'],['wisdom','wise'],['strength','strong'],['peace','peaceful'],['comfort','comforted','comforting','console'],['courage','courageous','brave','boldness'],['light','lamp'],['shepherd','sheep','flock'],['trust','trusted','trusting'],['help','helper','helped','helping'],['lonely','loneliness','lonesome'],['money','wealth','riches'],['hope','hoping'],['temptation','tempted','tempt'],['patient','patience'],['love','loves','loving'],['anger','angry'],['joy','joyful','rejoice'],['truth','true'],['humility','humble'],['rest','rested','resting'],['heal','healing','healed'],['serve','service','serving'],['give','giving','generous','generosity']];
  const synonyms=new Map();for(const group of synonymGroups)for(const word of group)synonyms.set(word,new Set([...(synonyms.get(word)||[]),...group]));
  const indexes=new Map();
  function indexFor(translation){
    const corpus=data();if(!ready())return null;
    if(indexes.get(translation)?.corpus===corpus)return indexes.get(translation);
    const records=[],words=new Map();
    for(const book of books)for(const [chapterIndex,rows]of corpus.translations[translation][book.id].entries())for(const [number,text]of rows){
      if(!text)continue;
      const normalized=normalize(text),id=records.length;
      records.push({bookId:book.id,book:book.name,chapter:chapterIndex+1,number,text,normalized});
      for(const word of new Set(normalized.split(' '))){if(!words.has(word))words.set(word,[]);words.get(word).push(id);}
    }
    const index={corpus,records,words};indexes.set(translation,index);return index;
  }
  function search(query,options={}){
    if(!options||typeof options!=='object')options={};
    const info=translationInfo(options.translation),result=Object.assign({query:typeof query==='string'?query:'',results:[],total:0},info);
    if(typeof query!=='string'||query.length>500){result.error='Use a short Bible phrase or a few words.';return result;}
    const reference=parseReference(query);
    if(reference){
      const passage=getPassage(reference,info.translation);
      if(!passage.ok){result.error=passage.error;return result;}
      const limit=Number.isFinite(options.limit)?Math.max(1,Math.min(20,Math.floor(options.limit))):6;
      result.total=passage.verses.length;
      result.results=passage.verses.slice(0,limit).map(verse=>Object.assign({},verse,{bookId:passage.bookId,book:passage.book,chapter:passage.chapter,reference:passage.chapterReference+':'+verse.number,source:source(passage.bookId,passage.chapter,info.translation,verse.number)}));return result;
    }
    const normalized=normalize(query);
    const terms=[...new Set(normalized.split(' ').filter(word=>word.length>1&&!stop.has(word)))];
    if(!terms.length){result.error='Try a specific word or phrase, such as forgiveness or love is patient.';return result;}
    const index=indexFor(info.translation);if(!index){result.error='The Bible text is still loading. Please try again.';return result;}
    const quoted=/["“]([^"”]+)["”]/.exec(query),phrase=quoted?normalize(quoted[1]):normalized;
    const candidates=new Map();
    terms.forEach((term,termIndex)=>{
      for(const word of synonyms.get(term)||[term]){
        const hits=index.words.get(word)||[];
        const weight=(word===term?1:.65)*Math.log(1+index.records.length/(1+hits.length));
        for(const id of hits){if(!candidates.has(id))candidates.set(id,{groups:new Map(),score:0});const candidate=candidates.get(id);candidate.groups.set(termIndex,Math.max(candidate.groups.get(termIndex)||0,weight));}
      }
    });
    const ranked=[];
    for(const [id,candidate]of candidates){
      const row=index.records[id],containsPhrase=(' '+row.normalized+' ').includes(' '+phrase+' ');
      if(quoted&&!containsPhrase)continue;
      // Require each meaningful query term. A weak shared word should not turn
      // an unsupported question into a confident-looking unrelated passage.
      if(candidate.groups.size<terms.length&&!containsPhrase)continue;
      candidate.score=[...candidate.groups.values()].reduce((sum,value)=>sum+value,0)+(containsPhrase?12:0);
      ranked.push({id,score:candidate.score});
    }
    ranked.sort((a,b)=>b.score-a.score||a.id-b.id);
    const limit=Number.isFinite(options.limit)?Math.max(1,Math.min(20,Math.floor(options.limit))):6;
    result.total=ranked.length;
    result.results=ranked.slice(0,limit).map(({id})=>{const row=index.records[id];return {bookId:row.bookId,book:row.book,chapter:row.chapter,number:row.number,text:row.text,reference:(row.bookId==='PSA'?'Psalm':row.book)+' '+row.chapter+':'+row.number,source:source(row.bookId,row.chapter,info.translation,row.number)};});
    return result;
  }
  return Object.freeze({books:Object.freeze(books),ready,parseReference,getPassage,getChapter,search});
});
