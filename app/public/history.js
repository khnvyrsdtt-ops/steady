'use strict';
(() => {
  const X=window.steadyExperience;
  const panel=X.addPanel('review/day','Your day','');
  panel.classList.add('day-record');
  const node=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
  const text=value=>typeof value==='string'?value.trim():'';
  const array=value=>Array.isArray(value)?value:[];
  function section(target,title,copy){if(!copy)return;const block=node('section','record-section','');block.append(node('h2','',title),node('p','record-text',copy));target.append(block);}

  // Keep the existing history renderer and IDs: only move its secondary totals
  // behind a disclosure, leaving the saved-day links first in the reading flow.
  const overview=X.routePanel?.('review/progress')?.node;
  if(overview){
    overview.classList.add('record-index');
    overview.querySelector('.eyebrow')?.remove();
    overview.querySelector('h2')?.remove();
    const intro=overview.querySelector('.progress-explainer');
    if(intro)intro.textContent='Your reflections and actions, day by day.';
    const totals=overview.querySelector('#progress-totals'),useful=overview.querySelector('#useful-summary');
    const details=node('details','record-overview','');
    details.append(node('summary','','Progress summary'));
    if(totals)details.append(totals);
    if(useful)details.append(useful);
    const footer=overview.lastElementChild;
    if(footer?.tagName==='P'&&footer!==intro)footer.remove();
    overview.append(details);
  }
  document.addEventListener('steady:screen',event=>{
    if(event.detail==='review/progress'&&overview){
      const data=SteadyGuide.progress(state.days),summary=overview.querySelector('.record-overview summary');
      if(summary)summary.textContent=data.reflections?`${data.reflections} ${data.reflections===1?'day':'days'} reflected · Progress summary`:'Progress summary';
      overview.querySelector('.record-overview').hidden=!data.rows.length;
    }
    if(!event.detail.startsWith('review/day'))return;
    const date=event.detail.split('/')[2];
    const entry=isDateKey(date)&&Object.hasOwn(state.days,date)&&isRecord(state.days[date])?state.days[date]:null;
    panel.replaceChildren();
    if(!entry){const back=node('a','text-link','Your record');back.href='#review/progress';panel.append(node('h2','','No entry here.'),node('p','small-copy','Return to your record to choose a day.'),back);}
    else {
      panel.append(node('h2','record-date',new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})));
      const reflection=text(entry.reflection),noticed=array(entry.reflections).map(text).filter(Boolean).join(' · ');
      section(panel,'Your reflection',reflection);
      section(panel,'What you noticed',noticed);
      const details=node('details','record-details',''),content=node('div','record-detail-content','');
      details.append(node('summary','','Other details'),content);
      const response=SteadyScriptureReflection.read(entry.scriptureReflection);
      if(response)section(reflection||noticed?content:panel,ScriptureLibrary[response.theme].reference+' · '+response.title,response.copy);
      section(content,'Your note',text(entry.mind));
      const actions=[...array(entry.actionLog).map(a=>a?.title),...array(entry.tasks).filter(t=>t?.complete).map(t=>t.text),...array(entry.completedNeeds).map(k=>SteadyGuide.catalog.find(c=>c.need===k)?.title)].filter(value=>typeof value==='string'&&value.trim());
      if(actions.length){const block=node('section','record-section','');block.append(node('h2','','Completed actions'));const list=node('ul','record-actions','');for(const title of actions)list.append(node('li','',title));block.append(list);content.append(block);}
      const plannedIds=new Set();
      const planned=array(entry.tasks).filter(task=>isRecord(task)&&text(task.text)&&task.complete!==true).filter((task,index)=>{const id=typeof task.id==='string'&&task.id?`id:${task.id}`:`index:${index}`;if(plannedIds.has(id))return false;plannedIds.add(id);return true;});
      if(planned.length){const block=node('section','record-section','');block.append(node('h2','','Planned actions'),node('p','small-copy','Not marked complete.'));const list=node('ul','record-actions','');for(const task of planned)list.append(node('li','',text(task.text)));block.append(list);(reflection||noticed||response?content:panel).append(block);}
      const practices=Object.keys(entry.practice||{}).map(id=>Object.hasOwn(SteadyLegacyPractice,id)?SteadyLegacyPractice[id]:'Earlier practice').filter(Boolean);
      section(content,'Earlier practice',practices.join(' · '));
      if(!reflection&&!noticed&&!response&&!planned.length)panel.append(node('p','small-copy',entry.closed?'You closed this day. No written reflection was added.':'No reflection was added for this day.'));
      if(content.children.length)panel.append(details);
    }
  });
})();
