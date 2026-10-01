'use strict';
(() => {
  const X=window.steadyExperience, M=SteadyScriptureDirection;
  const route='today/scripture-step';
  const goals={faith:'Faith',relationships:'Relationships',work:'Work',learning:'Learning',rest:'Rest'};
  const panel=X.addPanel(route,'Today','');
  panel.classList.add('scripture-direction');
  const node=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};
  const link=(text,hash,cls='text-link')=>{const n=node('a',cls,text);n.href='#'+hash;return n;};
  function button(text,cls,fn){const n=node('button',cls,text);n.type='button';n.addEventListener('click',fn);return n;}
  const response=()=>SteadyScriptureReflection.read(day.scriptureReflection);
  const defaultGoal=theme=>({foundation:'faith',rest:'rest',wisdom:'work',connection:'relationships',gratitude:'relationships',grief:'relationships',grace:'relationships'}[theme]);
  function validRecord(record){return isRecord(record)&&record.active===true&&SteadyScriptureReflection.read(record)&&isRecord(record.context);}
  function record(){const r=day.scriptureDirection,saved=response();return validRecord(r)&&(r.fromSaved===true||(saved?.theme===r.theme&&saved?.choice===r.choice))?r:null;}
  const completionId=plan=>plan.id+':'+plan.goal;
  function done(plan){return (day.actionLog||[]).some(a=>a.id===completionId(plan));}
  function feedback(plan){return (day.outcomes||[]).find(o=>o.id===plan.id&&o.context?.goal===plan.goal)?.rating;}
  function focusChoice(key,value){const chip=[...panel.querySelectorAll('[data-choice]')].find(b=>b.dataset.choice===key&&b.dataset.value===value);chip?.focus({preventScroll:true});}
  function ready(){
    let r=record();const saved=r?.fromSaved?r:response();if(!saved)return null;
    if(!r||r.theme!==saved.theme||r.choice!==saved.choice){
      const c=SteadyGuide.context(state.profile||{},day.context||{});
      r={theme:saved.theme,choice:saved.choice,active:true,context:{goal:Object.hasOwn(goals,c.goal)?c.goal:c.goal==='health'?'rest':defaultGoal(saved.theme),time:c.time,energy:c.energy==='auto'?(['rest','energy'].includes(day.need)?'low':'steady'):c.energy,environment:c.environment}};
      day.scriptureDirection=r;
    }
    if(!Object.hasOwn(r,'plan')||(r.plan!==null&&(!M.isPlan(r.plan)||r.plan.theme!==r.theme||r.plan.choice!==r.choice||r.plan.goal!==r.context.goal))){
      r.plan=M.recommend({...r.context,theme:r.theme,choice:r.choice},state.days);
      save();
    }
    return r;
  }
  function changeContext(key,value){
    const r=record();if(!r)return;
    r.context[key]=value;
    r.plan=M.recommend({...r.context,theme:r.theme,choice:r.choice},state.days,undefined,r.plan?.id);
    save();render(true);focusChoice(key,value);X.haptic();
  }
  function makeFit(r,open,insideOptions=false){
    const fit=node(insideOptions?'div':'details','direction-fit');
    if(!insideOptions){fit.open=!!open;fit.append(node('summary','','Make it fit'));}
    for(const [key,label,choices] of [['goal','What matters today',goals],['time','Time available',SteadyGuide.choices.time],['energy','Energy', {low:'Low',steady:'Steady',high:'Plenty'}],['environment','Surroundings',SteadyGuide.choices.environment]]){
      const field=node('fieldset','direction-choice');field.append(node('legend','mini-label',label));
      const options=node('div','chip-row');
      for(const [value,text] of Object.entries(choices)){
        const choice=button(text,'chip',()=>changeContext(key,value));choice.dataset.choice=key;choice.dataset.value=value;choice.setAttribute('aria-pressed',String(r.context[key]===value));options.append(choice);
      }
      field.append(options);fit.append(field);
    }
    return fit;
  }
  function returnToPassage(){const r=record();if(r){day.scriptureTheme=r.theme;save();}}
  function complete(){
    const r=record(),p=r?.plan;if(!p||!M.isPlan(p))return;
    if(!done(p))day.actionLog.push({id:completionId(p),title:p.title,goal:p.goal,at:new Date().toISOString(),scriptureTheme:p.theme});
    const stored=save();updateProgress();render();X.haptic();
    if(!stored){const status=panel.querySelector('[role=status]');status.textContent='Kept for this visit only.';status.hidden=false;}
    focusHeading();
  }
  function rate(value){
    const r=record(),p=r?.plan;if(!p||!done(p))return;
    day.outcomes=day.outcomes.filter(o=>o.id!==p.id||o.context?.goal!==p.goal);
    day.outcomes.push({id:p.id,rating:value,context:{...r.context,goal:p.goal,scriptureTheme:p.theme,scriptureChoice:p.choice},at:new Date().toISOString()});
    save();render();focusChoice('rating',value);X.haptic();
  }
  function focusHeading(){const h=panel.querySelector('h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}(window.SteadyViewport||window).scrollTo({top:0,behavior:'instant'});}
  function render(openFit=false){
    const r=ready();panel.replaceChildren();
    if(!r){panel.append(node('h2','','Start with a passage.'),node('p','small-copy','Choose a reflection, then explore a practical next step if you want one.'),link('Read Scripture','learn/scripture','button primary'));return;}
    const p=r.plan;
    const source=link(ScriptureLibrary[r.theme].reference+(r.fromSaved?' · Scripture':' · Your reflection'),r.fromSaved?'learn/scripture':'learn/reflect','direction-source text-link');source.addEventListener('click',returnToPassage);
    if(!p){
      panel.append(source,node('h2','','Choose your own next step.'),node('p','small-copy','No other suitable suggestion is available here. You can leave this here or choose a small action yourself.'),link('My actions','direction','button primary'),makeFit(r,openFit),link('Done for now','home'));const other=link('Other next steps','today/step');panel.append(other);return;
    }
    const finished=done(p),rating=feedback(p);
    if(!finished)panel.append(node('p','step-meta',p.minutes+' '+(p.minutes===1?'minute':'minutes')+' · '+goals[p.goal]));
    panel.append(node('h2','',p.title));
    if(finished){
      panel.append(node('p','direction-complete','✓ Done'));
      const actions=node('div','step-completion-actions');actions.append(link('Done for now','home','button primary'));panel.append(actions);
      const feedbackDetails=node('details','step-feedback');feedbackDetails.open=!!rating;
      const feedbackSummary=node('summary','','How did it go?');feedbackSummary.append(node('span','small-copy','Optional'));feedbackDetails.append(feedbackSummary);
      const choices=node('div','chip-row');choices.setAttribute('role','group');choices.setAttribute('aria-label','Did this Scripture step help?');
      for(const [value,label]of [['useful','Helped'],['neutral','No change'],['not-useful','Not useful'],['worse','Made things worse']]){const b=button(label,'chip',()=>rate(value));b.dataset.choice='rating';b.dataset.value=value;b.setAttribute('aria-pressed',String(rating===value));choices.append(b);}
      feedbackDetails.append(choices);panel.append(feedbackDetails);
      const messages={useful:'Saved. This approach will be favoured for this life area.',neutral:'Saved. No change noted.', 'not-useful':'Saved. We’ll avoid this approach for this life area.',worse:'Saved. We’ll avoid this approach in future suggestions.'};
      const status=node('p','small-copy',storageAvailable?(messages[rating]||''):'Kept for this visit only.');status.setAttribute('role','status');status.hidden=storageAvailable&&!rating;panel.append(status);
      panel.append(button('Undo completion','text-link step-undo',()=>{day.actionLog=day.actionLog.filter(a=>a.id!==completionId(p));day.outcomes=day.outcomes.filter(o=>o.id!==p.id||o.context?.goal!==p.goal);save();updateProgress();render();focusHeading();}));
    } else {
      panel.append(node('p','direction-action-copy',p.copy));
      panel.append(button('Mark as done','button primary',complete));
      const options=node('details','step-options');options.open=openFit||document.getElementById('setting-guidance')?.value==='explained';
      options.append(node('summary','','Details & adjustments'),source,node('p','small-copy',p.reason),node('p','small-copy','Choose what fits your circumstances. You can stop or choose differently.'));
      const setup=node('div','direction-setup');setup.append(node('p','',p.setup));
      options.append(setup,makeFit(r,openFit,true));
      const general=link('Other next steps','today/step');general.addEventListener('click',()=>{r.active=false;save();});
      const alternatives=node('div','direction-alternatives');alternatives.append(button('Another approach','text-link',()=>{r.plan=M.recommend({...r.context,theme:r.theme,choice:r.choice},state.days,p.id);save();render();focusHeading();}),general);options.append(alternatives);panel.append(options);
    }
  }
  const reviewStep=link('','today/scripture-step','path-link scripture-direction-resume');reviewStep.hidden=true;review.append(reviewStep);
  function renderLinks(){
    const r=record(),p=r?.plan;reviewStep.hidden=!M.isPlan(p);
    if(M.isPlan(p)){reviewStep.replaceChildren(node('span','',done(p)&&!feedback(p)?'Scripture step · Did this step help?':`Scripture step · ${p.title}`),node('span','','→'));}
  }
  screenHeader.querySelector('.screen-back').addEventListener('click',()=>{if(!panel.hidden)returnToPassage();});
  document.addEventListener('steady:screen',event=>{if(event.detail===route)render();if(event.detail==='review')renderLinks();});
  function useSaved(plan){
    if(!M.isPlan(plan))return false;
    const context=M.context({...SteadyGuide.context(state.profile||{},day.context||{}),goal:plan.goal});
    const next=M.recommend({...context,theme:plan.theme,choice:plan.choice},state.days,undefined,plan.id);
    if(next?.id!==plan.id)return false;
    day.scriptureDirection={theme:plan.theme,choice:plan.choice,context,plan:next,active:true,fromSaved:true};
    save();navigateScreen(route);return true;
  }
  window.SteadyDirectionFlow={active:()=>M.isPlan(record()?.plan),useSaved};
  renderLinks();
})();
