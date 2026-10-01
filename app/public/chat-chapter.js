'use strict';
(() => {
  // Chapters are temporary reading space inside the answer that opened them.
  // They never change the route, daily passage, draft or saved conversation.
  const openReaders=new WeakMap();
  let nextId=0;
  const node=(tag,className,text)=>{
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text)element.textContent=text;
    return element;
  };
  const unavailable=message=>({error:message||'This chapter is unavailable. Close it and try the passage again.'});

  function chapterFor(reading,translation){
    if(!reading||typeof reading!=='object')return unavailable();
    if(Object.hasOwn(reading,'studyReference')){
      const bible=window.SteadyBible;
      if(!bible?.ready?.())return unavailable('The Bible library is not available yet. Close this chapter and try again.');
      const reference=typeof reading.studyReference==='string'?bible.parseReference(reading.studyReference):null;
      if(!reference||reference.error)return unavailable(reference?.error);
      const passage=bible.getPassage(reference,translation);
      if(!passage?.ok&&passage?.code!=='omitted_verse')return unavailable(passage?.error);
      const chapter=bible.getChapter(reference.bookId,reference.chapter,translation);
      if(!chapter?.ok)return unavailable(chapter?.error);
      return {
        title:chapter.chapterReference+' · '+chapter.translation.toUpperCase(),
        reference:passage.reference,
        verses:chapter.verses,
        selected:reference.startVerse==null?[]:(passage.verses||[]).map(verse=>verse.number),
        notes:[...new Set([passage.note,chapter.note].filter(Boolean))],
        source:chapter.source
      };
    }
    const chapters=typeof ScriptureChapters!=='undefined'?ScriptureChapters:null;
    if(!chapters||!Object.hasOwn(chapters,reading.key))return unavailable();
    let data=chapters[reading.key],range=[data.focus,data.focus],reference=data.reference+':'+data.focus,source=data.sources?.[translation];
    if(reading.guide){
      const help=typeof SteadyScriptureHelp!=='undefined'?SteadyScriptureHelp:null;
      const passage=help?.passage?.(reading.guide,translation,chapters);
      const candidate=passage&&Object.hasOwn(chapters,passage.chapterKey)?chapters[passage.chapterKey]:null;
      if(!candidate||!Array.isArray(passage.verses)||passage.verses.length!==2)return unavailable();
      data=candidate;range=passage.verses;reference=passage.reference;source=passage.source||data.sources?.[translation];
    }
    const verses=data.translations?.[translation];
    if(!Array.isArray(verses)||!verses.length||!range.every(Number.isInteger)||range[0]>range[1]
      ||!range.every(number=>verses.some(verse=>verse.number===number)))return unavailable();
    return {
      title:data.reference+' · '+translation.toUpperCase(),reference,verses,
      selected:verses.filter(verse=>verse.number>=range[0]&&verse.number<=range[1]).map(verse=>verse.number),
      notes:[],source
    };
  }

  function toggle({reply,source,reading,translation='web',layout}={}){
    if(!reply)return null;
    translation=translation==='asv'?'asv':'web';
    const identity=JSON.stringify([reading?.studyReference??null,reading?.key??null,reading?.guide??null,translation]);
    const previous=openReaders.get(reply);
    function close(reader,restoreFocus=true){
      reader.section.remove();
      reader.source?.setAttribute('aria-expanded','false');
      reader.source?.removeAttribute?.('aria-controls');
      openReaders.delete(reply);
      if(restoreFocus&&reader.source?.isConnected!==false)reader.source?.focus?.({preventScroll:true});
    }
    if(previous){
      close(previous,previous.identity===identity);
      if(previous.identity===identity){layout?.();return null;}
    }
    const section=node('section','chat-chapter');
    const id='chat-chapter-'+(++nextId);
    section.id=id;
    const heading=node('h3','chat-chapter-title');
    heading.id=id+'-title';heading.tabIndex=-1;
    section.setAttribute('aria-labelledby',heading.id);
    const closeButton=node('button','text-link chat-chapter-close','Close chapter');
    closeButton.type='button';closeButton.setAttribute('aria-label','Close chapter and return to the answer');
    const reader={section,source,identity};
    closeButton.addEventListener('click',()=>{close(reader);layout?.();});
    section.append(heading);
    let content;
    try{content=chapterFor(reading,translation);}catch{content=unavailable();}
    if(content.error){
      heading.textContent='Chapter unavailable';
      const message=node('p','small-copy',content.error);message.setAttribute('role','status');section.append(message);
    }else{
      heading.textContent=content.title;
      const description=content.selected.length?'The full chapter. '+content.reference+' is highlighted.':'The full chapter.';
      section.append(node('p','small-copy chat-chapter-description',description));
      for(const note of content.notes)section.append(node('p','small-copy chat-chapter-note',note));
      const verses=node('div','chat-chapter-verses');
      for(const verse of content.verses){
        const paragraph=node('p',content.selected.includes(verse.number)?'chapter-verse selected-verse':'chapter-verse');
        paragraph.append(node('span','verse-number',String(verse.number)),node('span','chapter-verse-text',verse.text));
        verses.append(paragraph);
      }
      section.append(verses);
      if(typeof content.source==='string'&&content.source.startsWith('https://ebible.org/')){
        const sourceLink=node('a','text-link chat-chapter-source','Translation & footnotes ↗');
        sourceLink.href=content.source;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';section.append(sourceLink);
      }
    }
    section.append(closeButton);reply.append(section);openReaders.set(reply,reader);
    source?.setAttribute('aria-expanded','true');source?.setAttribute('aria-controls',id);
    layout?.();heading.focus?.({preventScroll:true});
    return section;
  }
  window.SteadyChatChapter=Object.freeze({toggle});
})();
