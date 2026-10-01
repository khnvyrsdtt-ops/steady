'use strict';
(() => {
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const button=(text,action)=>{const role=text==='Read chapter'?' moment-action-read':text==='Forget'?' moment-action-forget':'';const n=node('button','text-link'+role,text);n.type='button';n.addEventListener('click',action);return n;};
  let loading;
  const ready=()=>Boolean(window.SteadyBible?.ready?.());
  function loadFile(file,available){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='./'+file+'?v=20260925-scripture-study-1';script.async=true;
      const timer=setTimeout(()=>{script.remove();reject(new Error('timeout'));},20000);
      script.onload=()=>{clearTimeout(timer);if(available())resolve();else{script.remove();reject(new Error('unavailable'));}};
      script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('unavailable'));};
      document.head.append(script);
    });
  }
  function load(){
    if(ready())return Promise.resolve();
    if(loading)return loading;
    loading=(async()=>{
      // Retry even if the small lookup module failed during a partial preview
      // connection. Saved entries should show a loading/error state, not crash.
      if(typeof window.SteadyBible?.ready!=='function')await loadFile('bible-search.js',()=>typeof window.SteadyBible?.ready==='function');
      if(!ready())await loadFile('bible-data.js',ready);
    })().catch(error=>{loading=null;throw error;});
    return loading;
  }
  function mount(reply,item,translation,{read,forget,layout}){
    const content=node('div','study-content'),actions=node('div','moment-actions');
    const remove=button('Forget',forget);remove.setAttribute('aria-label','Forget Scripture lookup: '+item.text);
    actions.append(remove);reply.append(content,actions);
    function libraryStats(){
      // Facts counted live from the included text, never generated or guessed.
      const corpus=globalThis.SteadyBibleData, books=window.SteadyBible?.books;
      if(!corpus||corpus.schema!==1||!Array.isArray(books)||!books.length)return null;
      const web=corpus.translations?.web;
      if(!web)return null;
      let chapters=0,verses=0;
      for(const book of books){const list=web[book.id]||[];chapters+=list.length;for(const rows of list)for(const row of rows)if(row[1])verses++;}
      const malachi=books.findIndex(book=>book.id==='MAL');
      return {books:books.length,oldTestament:malachi+1,newTestament:books.length-malachi-1,chapters,verses};
    }
    function sourceLink(url,text){const a=node('a','text-link',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
    const libraryScope=()=>node('p','study-limit','This library contains 66 Bible books in WEB and ASV. Additional books used by some Christian traditions are not included.');
    function passage(reference,target=content){
      const found=window.SteadyBible.getPassage(reference,translation);
      if(!found.ok){
        target.append(node('p','moment-response',found.error||'This passage is unavailable. Check the book, chapter and verse.'));
        if(found.code==='omitted_verse')target.append(button('Read chapter',event=>read(found.reference,event?.currentTarget)));
        return found;
      }
      const shown=found.verses.slice(0,3);
      const quote=node('blockquote','study-quote');
      for(const verse of shown){const p=node('p');p.append(node('sup','',String(verse.number)+' '),node('span','',verse.text));quote.append(p);}
      target.append(quote,node('p','verse-reference',`${found.reference} · ${found.translation.toUpperCase()}`));
      if(found.verses.length>shown.length)target.append(node('p','study-limit',`Showing the first ${shown.length} verses. Open the chapter to read the rest.`));
      if(found.note)target.append(node('p','study-limit',found.note));
      const links=node('div','moment-actions');links.append(button('Read chapter',event=>read(found.reference,event?.currentTarget)));target.append(links);
      return found;
    }
    function noteContent(note,includePassage){
      content.append(node('strong','study-title',note.title),node('p','moment-context',note.copy),node('p','moment-editorial','Steady’s reading note—not part of the Scripture quotation.'));
      const depth=node('details','moment-depth');depth.append(node('summary','','Read the supporting passage'));
      const supporting=includePassage?passage(note.reference,depth):null;
      depth.append(sourceLink(note.source,'Reading-note source ↗'));
      if(supporting?.source&&supporting.source!==note.source)depth.append(sourceLink(supporting.source,'Passage source · '+translation.toUpperCase()+' ↗'));
      depth.append(libraryScope());content.append(depth);
    }
    function render(){
      content.replaceChildren();
      const study=item.study;
      const studyModel=typeof SteadyStudy!=='undefined'?SteadyStudy:null;
      if(study.kind==='clarify'){
        const message=study.query==='shorter'?'Please use one Bible reference or a shorter search (up to 160 characters), so I don’t lose part of your question.':study.query==='followup'?'Which passage do you mean? Give me its reference, such as John 3:16, so I don’t guess.':'Please give me one Bible reference at a time, such as John 3:16.';
        content.append(node('p','moment-response',message));
      }else if(study.kind==='note'){
        if(studyModel&&Object.hasOwn(studyModel.notes,study.query))noteContent(studyModel.notes[study.query],true);
        else content.append(node('p','moment-response','This reading note is unavailable. Reopen Steady to load the current library, or enter a Bible reference to read its text.'));
      }else if(study.kind==='meta'){
        const stats=libraryStats();
        if(!stats)content.append(node('p','moment-response','The Bible library couldn’t open. Your entry is still here. In Expo Go, check the connection to your preview; the standalone app includes the text offline.'));
        else{
          const lines={books:`This library holds ${stats.books} books: ${stats.oldTestament} in the Old Testament and ${stats.newTestament} in the New.`,chapters:`This library holds ${stats.chapters} chapters across ${stats.books} books.`,verses:`This library holds ${stats.verses} verses with wording in this translation.`};
          content.append(node('p','moment-response',lines[study.query]||lines.books),node('p','study-limit','Counted on this device from the included text.'));
        }
      }else if(study.kind==='reference'){
        const found=passage(study.query);
        const note=studyModel?.context(study.query,window.SteadyBible);
        if(found.ok){
          if(note){
            content.append(node('strong','study-title',note.title),node('p','moment-context',note.copy),node('p','moment-editorial','Steady’s reading note—not part of the Scripture quotation.'));
          }else content.append(node('p','study-limit','I can show this passage, but don’t have a prepared explanation for it yet. Read the chapter to see what comes before and after.'));
          const depth=node('details','moment-depth');depth.append(node('summary','','Source & reading context'));
          depth.append(node('p','moment-context','Notice who is speaking, to whom, and what kind of writing this is. A word match alone does not establish what a passage means.'));
          if(found.source||note)depth.append(sourceLink(found.source||note.source,'Source & translation notes ↗'));
          depth.append(libraryScope());content.append(depth);
        }
      }else{
        const found=window.SteadyBible.search(study.query,{translation,limit:3});
        content.append(node('p','moment-response',found.results.length?'These verses match words in your search—not a complete answer or a claim about what God is saying to you.':'I couldn’t find a reliable word match. Try a shorter phrase, a specific word, or a reference such as John 3:16.'));
        if(/\?|\b(?:who|why|when|explain|meaning|context)\b/i.test(item.text))content.append(node('p','study-limit','I don’t have a prepared explanation for this question. Word matches may miss its meaning.'));
        for(const result of found.results){
          const entry=node('section','study-result');
          entry.append(node('p','study-result-text',result.text),node('p','verse-reference',`${result.reference} · ${found.translation.toUpperCase()}`),button('Read chapter',event=>read(result.reference,event?.currentTarget)));content.append(entry);
        }
        if(found.error)content.append(node('p','study-limit',found.error));
      }
      // Reading notes, as well as quotations and references, stay exactly as
      // supplied by the library. General chat uses the on-device model; a
      // Scripture lookup never silently swaps in a generated interpretation.
      layout();
    }
    function start(){
      content.replaceChildren(node('p','small-copy','Opening the Bible library…'));
      load().then(render,()=>{
        content.replaceChildren(node('p','moment-response','The Bible library couldn’t open. Your entry is still here. In Expo Go, check the connection to your preview; the standalone app includes the text offline.'),button('Try again',start));layout();
      });
    }
    if(item.study.kind==='clarify'||ready())render();else start();
  }
  window.SteadyStudyUI={mount};
})();
