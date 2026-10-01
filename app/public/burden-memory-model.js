'use strict';

// Extraction happens in the native on-device model. This module only retains
// short, exact excerpts it was given; it never infers a fact about the reader.
((root, factory) => {
  const model=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=model;
  else root.SteadyBurdenMemory=model;
})(typeof globalThis!=='undefined'?globalThis:this, () => {
  const maxNotes=20,maxProcessed=60,maxText=180;
  const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const validSource=value=>typeof value==='string'&&!/\s/.test(value)&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value);
  const validId=value=>typeof value==='string'&&!/\s/.test(value)&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(value);
  const cleanText=value=>typeof value==='string'&&value.trim()&&value.trim().length<=maxText?value.trim():null;
  const identity=text=>text.toLocaleLowerCase('en').replace(/\s+/g,' ');

  function isoDate(value){
    if(typeof value!=='string')return null;
    const parts=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/);
    if(!parts)return null;
    const [,year,month,date,hours,minutes,seconds,,zone]=parts;
    const y=Number(year),m=Number(month),d=Number(date);
    const leap=y%4===0&&(y%100!==0||y%400===0);
    const monthDays=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if(m<1||m>12||d<1||d>monthDays[m-1]||Number(hours)>23||Number(minutes)>59||Number(seconds)>59)return null;
    if(zone!=='Z'&&(Number(zone.slice(1,3))>23||Number(zone.slice(4))>59))return null;
    const timestamp=Date.parse(value);
    const normalized=Number.isFinite(timestamp)?new Date(timestamp).toISOString():'';
    return normalized.length===24?normalized:null;
  }

  function normalize(value){
    const empty={version:1,notes:[],processed:[]};
    if(!record(value)||value.version!==1)return empty;
    const notes=(Array.isArray(value.notes)?value.notes:[]).flatMap(note=>{
      if(!record(note)||!validId(note.id)||!validSource(note.sourceId))return [];
      const text=cleanText(note.text),at=isoDate(note.at);
      return text&&at?[{id:note.id,text,sourceId:note.sourceId,at}]:[];
    }).sort((a,b)=>b.at.localeCompare(a.at));
    const ids=new Set(),texts=new Set();
    empty.notes=notes.filter(note=>{
      const text=identity(note.text);
      if(ids.has(note.id)||texts.has(text))return false;
      ids.add(note.id);texts.add(text);return true;
    }).slice(0,maxNotes);
    const seen=new Set(),noteSources=new Set(empty.notes.map(note=>note.sourceId));
    // Restored notes also establish that their source was processed. This
    // preserves Forget when an older backup omitted the processed list.
    const processed=[...(Array.isArray(value.processed)?value.processed:[]),...noteSources]
      .filter(id=>validSource(id)&&!seen.has(id)&&Boolean(seen.add(id)));
    // Keep every retained note's source within the limit even after many empty
    // extractions. Otherwise forgetting an old note could recreate it later.
    const retained=new Set([...noteSources,...processed.filter(id=>!noteSources.has(id)).slice(0,maxProcessed-noteSources.size)]);
    empty.processed=processed.filter(id=>retained.has(id));
    return empty;
  }

  function remember(value,details,{sourceId,sourceText,at}={}){
    const memory=normalize(value),timestamp=isoDate(at);
    if(!validSource(sourceId)||typeof sourceText!=='string'||!sourceText.trim()||!timestamp||memory.processed.includes(sourceId))return memory;
    const notes=[];
    if(Array.isArray(details)&&details.length<=2){
      details.forEach((detail,index)=>{
        const text=cleanText(record(detail)?detail.text:detail);
        if(text&&sourceText.includes(text))notes.push({id:`${sourceId}:${index}`,text,sourceId,at:timestamp});
      });
    }
    // An empty extraction is still complete. Forget/Clear never causes the
    // same chat entry to be silently mined again.
    return normalize({version:1,notes:[...notes,...memory.notes],processed:[sourceId,...memory.processed]});
  }

  function forget(value,id){
    const memory=normalize(value);
    memory.notes=memory.notes.filter(note=>note.id!==id);
    return memory;
  }
  function forgetSource(value,sourceId){
    const memory=normalize(value);
    memory.notes=memory.notes.filter(note=>note.sourceId!==sourceId);
    if(validSource(sourceId)&&!memory.processed.includes(sourceId))memory.processed=[sourceId,...memory.processed].slice(0,maxProcessed);
    return memory;
  }
  function clear(value){
    const memory=normalize(value);
    memory.notes=[];
    return memory;
  }

  const stopWords=new Set(('a an and are as at be been being but by can could did do does for from had has have how i if in into is it its me my of on or our ours she should so some than that the their them there these they this those to too us was we were what when where which who why will with would you your yours '+
    'am im ive dont cant want wants need needs feel feels feeling feelings help please tell say says said know think really just now today also about something anything everything one').split(/\s+/));
  function keywords(text){
    return new Set((text.toLocaleLowerCase('en').normalize('NFKC').match(/[\p{L}\p{N}]+/gu)||[])
      .filter(word=>(word.length>=3||(word.length>=2&&/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word)))&&!stopWords.has(word)));
  }
  function communicationPreference(text){
    if(/\b(?:call me|my name)\b/i.test(text))return true;
    const communication=/\b(?:repl(?:y|ies)|answers?|responses?|respond|explanations?|explain|words?|wording|speak|write|language)\b/i.test(text);
    const preference=/\b(?:prefer|short|brief|simple|concise|plain|please|first|native)\b/i.test(text);
    return communication&&preference;
  }
  function context(value,text){
    if(typeof text!=='string'||!text.trim())return [];
    const query=keywords(text.slice(0,1200));
    const ranked=normalize(value).notes.map((note,index)=>{
      let overlap=0;
      for(const word of keywords(note.text))if(query.has(word))overlap++;
      return {text:note.text,index,overlap,preference:communicationPreference(note.text)};
    }).filter(note=>note.overlap>0||note.preference)
      .sort((a,b)=>b.overlap-a.overlap||a.index-b.index);
    // Reserve one slot for an explicit communication preference, then keep
    // the most relevant context. A name alone must not crowd out the topic.
    const voice=ranked.find(note=>note.preference&&!/\b(?:call me|my name)\b/i.test(note.text));
    return (voice?[voice,...ranked.filter(note=>note!==voice)]:ranked).slice(0,4).map(note=>note.text);
  }
  function byteSize(value){
    // JSON escapes lone surrogates; iterating code points therefore matches
    // UTF-8 bytes for the exact serialized record even without TextEncoder.
    let bytes=0;
    for(const character of JSON.stringify(normalize(value))){
      const code=character.codePointAt(0);
      bytes+=code<=0x7f?1:code<=0x7ff?2:code<=0xffff?3:4;
    }
    return bytes;
  }

  return Object.freeze({normalize,remember,forget,forgetSource,clear,context,byteSize});
});
