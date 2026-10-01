'use strict';
(() => {
  const X=window.steadyExperience, G=SteadyGuide;
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const button=(text,fn,cls='button primary')=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
  const routeLink=(text,route,cls='text-link')=>{const a=node('a',cls,text);a.href='#'+route;return a;};

  // The check-in's own markup owns its wording. This module used to overwrite
  // every button label and the heading, which silently replaced the copy in
  // index.html — including the "I know what to do" / "I don't know" distinction
  // that separates a blocked start from missing direction. Only the group's
  // accessible name is set here.
  const needGrid=mind.querySelector('.need-grid');
  needGrid.setAttribute('aria-label','Where are you right now?');

  const welcome=X.addPanel('welcome','Make Steady yours','<h2>A useful starting point.</h2><p class="small-copy">Home helps you choose one manageable action. Ask helps with a question or Bible passage. Reflect gives you room to close the day.</p><p class="small-copy">Choose what matters now. You can change this whenever life changes.</p>');
  const personal=X.addPanel('settings/personal','Your preferences','<p class="small-copy">These choices shape your next-step suggestions. Reading and accessibility options stay in Settings.</p>');
  function makePreferences(target,intro){
    const form=node('form','preferences-form'),grid=node('div','context-grid');
    for(const [key,label,options]of [['priority','What would help?',G.choices.priority],['goal','Your focus',G.choices.goal]]){
      const field=node('label','context-field',label),select=node('select');select.name=key;
      for(const [value,text]of Object.entries(options)){const option=node('option','',text);option.value=value;select.append(option);}
      field.append(select);grid.append(field);
    }
    const actions=node('div','onboard-actions'),saveButton=node('button','button primary',intro?'Find my next step':'Save preferences');
    saveButton.type='submit';actions.append(saveButton);
    if(intro)actions.append(button('Skip for now',()=>{state.profile={...state.profile,onboardingStatus:'skipped'};if(!save())toast('Your choices are kept for this visit only.');navigateScreen('home');},'text-link'));
    const status=node('p','small-copy');status.setAttribute('role','status');
    form.append(grid,actions,status);target.append(form);
    form.addEventListener('submit',event=>{
      event.preventDefault();checkDay();
      const values=Object.fromEntries([...form.querySelectorAll('select')].map(select=>[select.name,select.value]));
      const selected=G.context({...state.profile,...values});
      const areas=Array.isArray(state.profile?.areas)?state.profile.areas:[];
      state.profile={...state.profile,priority:selected.priority,goal:selected.goal,onboardingStatus:'complete',areas:selected.goal==='general'?areas:[selected.goal,...areas.filter(k=>k!==selected.goal)].slice(0,3)};
      // Apply changed starting choices now; retain the rest of today's conditions.
      delete day.context.goal;
      day.need=G.startingNeed(state.profile);
      const stored=save();renderRecommendation();
      status.textContent=stored?'Preferences saved.':'Kept for this visit only.';
      if(intro){if(!stored)toast('Your choices are kept for this visit only.');navigateScreen('today/step');}
    });
    return ()=>{const p=G.context(state.profile);for(const select of form.querySelectorAll('select'))select.value=p[select.name];status.textContent='';};
  }
  const renderWelcome=makePreferences(welcome,true),renderPersonal=makePreferences(personal,false);
  document.getElementById('guidance-preferences').append(routeLink('Your starting preferences','settings/personal'));

  const chapter=X.addPanel('learn/chapter','Chapter context','<h2 id="chapter-title"></h2><p class="small-copy" id="chapter-description"></p><div id="chapter-verses"></div><div id="chapter-source"></div>');
  let chapterVisible=false;
  function showChapter(title,description,verses,selected=[]){
    document.getElementById('chapter-title').textContent=title;
    document.getElementById('chapter-description').textContent=description;
    const container=document.getElementById('chapter-verses');container.replaceChildren();
    document.getElementById('chapter-source').replaceChildren();
    for(const verse of verses){
      const p=node('p',selected.includes(verse.number)?'chapter-verse selected-verse':'chapter-verse');
      p.append(node('span','verse-number',String(verse.number)),document.createTextNode(verse.text));container.append(p);
    }
  }
  function showStudyChapter(reading,translation){
    const bible=globalThis.SteadyBible;
    if(typeof bible?.ready!=='function'||!bible.ready()){
      showChapter('Passage unavailable.','The Bible text is not available yet. Return to Burden and open the passage again.',[]);return;
    }
    const reference=typeof reading.studyReference==='string'?bible.parseReference(reading.studyReference):null;
    const passage=reference&&!reference.error?bible.getPassage(reference,translation):null;
    const full=passage&&(passage.ok||passage.code==='omitted_verse')?bible.getChapter(reference.bookId,reference.chapter,translation):null;
    if(!full?.ok){
      showChapter('Passage unavailable.',passage?.error||'That reference could not be found. Try a book, chapter and verse, such as John 3:16.',[]);return;
    }
    const selected=reference.startVerse===null?[]:passage.verses.map(verse=>verse.number);
    const notes=[...new Set([passage.note,full.note].filter(Boolean))];
    const description=(selected.length?`The full chapter. ${passage.reference} is highlighted.`:'The full chapter.')+(notes.length?' '+notes.join(' '):'');
    showChapter(full.chapterReference+' · '+full.translation.toUpperCase(),description,full.verses,selected);
    const source=node('a','text-link','Translation & footnotes ↗');
    source.href=full.source;source.target='_blank';source.rel='noopener noreferrer';
    document.getElementById('chapter-source').append(source);
  }
  function renderChapter(){
    const translation=document.documentElement.dataset.translation==='asv'?'asv':'web';
    // Help reading is temporary: it never replaces a daily theme, saved
    // reflection, or bookmark. Older Help entries keep their original verse.
    const reading=X.helpReading;
    if(reading&&Object.hasOwn(reading,'studyReference')){showStudyChapter(reading,translation);return;}
    const key=reading&&Object.hasOwn(G.themes,reading.key)?reading.key:X.scriptureChoice().key;
    let data=ScriptureChapters[key],range=[data.focus,data.focus],reference=reading?`${data.reference}:${data.focus}`:'';
    const passage=reading&&typeof SteadyScriptureHelp!=='undefined'&&typeof SteadyScriptureHelp.passage==='function'
      ?SteadyScriptureHelp.passage(reading.guide,translation,ScriptureChapters):null;
    const candidate=passage&&Object.hasOwn(ScriptureChapters,passage.chapterKey)?ScriptureChapters[passage.chapterKey]:null;
    const verses=candidate?.translations?.[translation],selection=passage?.verses;
    if(Array.isArray(verses)&&Array.isArray(selection)&&selection.length===2&&selection.every(Number.isInteger)
      &&selection[0]<=selection[1]&&selection.every(number=>verses.some(verse=>verse.number===number))){
      data=candidate;range=selection;reference=passage.reference;
    }
    showChapter(data.reference+' · '+translation.toUpperCase(),reference
      ?`The full chapter. ${reference} is highlighted.`:'The full chapter. Verse '+data.focus+' is highlighted.',
      data.translations[translation],data.translations[translation].filter(verse=>verse.number>=range[0]&&verse.number<=range[1]).map(verse=>verse.number));
  }
  document.addEventListener('steady:screen',event=>{
    const route=event.detail;
    document.body.classList.toggle('onboarding-screen',route==='welcome');
    if(route==='welcome')renderWelcome();
    if(route==='settings/personal')renderPersonal();
    chapterVisible=route==='learn/chapter';
    if(chapterVisible)renderChapter();
    else if(route!=='settings'&&!route.startsWith('settings/'))delete X.helpReading;
  });
  document.addEventListener('change',event=>{if(chapterVisible&&event.target.id==='setting-translation')renderChapter();});
  renderScreen();
})();
