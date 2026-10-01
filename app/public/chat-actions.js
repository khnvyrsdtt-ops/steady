'use strict';
(() => {
  const node=(tag,className,text)=>{
    const element=document.createElement(tag);
    element.className=className||'';
    if(text!==undefined)element.textContent=text;
    return element;
  };
  const button=(text,className,handler)=>{
    const element=node('button',className,text);
    element.type='button';
    element.addEventListener('click',handler);
    return element;
  };
  const currentDay=()=>typeof day==='undefined'?null:day;

  function mount({container,close,add,layout}={}){
    if(!container)return null;
    const section=node('section','chat-actions');
    section.setAttribute('aria-label','My actions');
    const header=node('div','chat-actions-header');
    const heading=node('h2','chat-actions-title','My actions');
    heading.tabIndex=-1;
    const closeButton=button('Close','chat-actions-close',()=>close?.());
    closeButton.setAttribute('aria-label','Close my actions');
    header.append(heading,closeButton);
    const introduction=node('p','chat-actions-intro');
    const list=node('div','chat-actions-list');
    const completed=node('div','chat-actions-completed');
    const removal=node('div','chat-actions-removal');
    const addButton=button('Add an action','chat-actions-add',()=>{
      if(typeof checkDay==='function')checkDay();
      render();
      add?.();
    });
    const status=node('p','chat-actions-status');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    status.hidden=true;
    section.append(header,introduction,list,completed,removal,addButton,status);
    container.append(section);
    let removed=null,notice='',saveFailed=false,destroyed=false;
    const controls=new Map();

    function announce(message){
      notice=message;
      status.textContent=notice;
      status.hidden=!notice;
    }
    function validDay(expected){
      if(typeof checkDay==='function')checkDay();
      if(currentDay()===expected)return true;
      removed=null;
      render();
      announce('A new day has started. Your earlier actions stay with that day.');
      return false;
    }
    function persist(message){
      let stored=false;
      try{stored=typeof save==='function'&&save()===true;}catch{/* Keep the edit usable in this session. */}
      saveFailed=!stored;
      notice=stored?message:'This change is kept for this visit only. Keep the app open; it has not been safely saved.';
      if(typeof renderTasks==='function')renderTasks();
      if(typeof updateProgress==='function')updateProgress();
      render();
    }
    function focus(control){control?.focus?.({preventScroll:true});}
    function render(){
      if(destroyed)return;
      const shownDay=currentDay();
      if(removed&&removed.day!==shownDay)removed=null;
      const tasks=Array.isArray(shownDay?.tasks)?shownDay.tasks:[];
      const history=(Array.isArray(shownDay?.actionLog)?shownDay.actionLog:[])
        .filter(action=>typeof action?.title==='string'&&action.title.trim());
      const done=tasks.filter(task=>task.complete).length;
      introduction.textContent=tasks.length
        ?done===tasks.length?'You did what you set out to do. Let that count.'
          :done?`${done} of ${tasks.length} done. One at a time.`:'One small thing at a time.'
        :history.length?'A little progress, already made.':'Something worth doing? Give it a place here.';
      list.replaceChildren();
      controls.clear();
      tasks.forEach(task=>{
        const row=node('div',`chat-action${task.complete?' is-complete':''}`);
        const label=node('label','chat-action-label');
        const toggle=node('input','chat-action-toggle');
        toggle.type='checkbox';
        toggle.checked=!!task.complete;
        toggle.setAttribute('aria-label',`Mark ${task.text} ${task.complete?'incomplete':'complete'}`);
        const text=node('span','chat-action-text',task.text);
        label.append(toggle,text);
        toggle.addEventListener('change',()=>{
          if(!validDay(shownDay))return;
          const current=shownDay.tasks.find(item=>item.id===task.id);
          if(!current){render();return;}
          current.complete=toggle.checked;
          if(current.complete)window.steadyExperience?.haptic?.();
          persist(current.complete?'One small thing, done.':'Ready when you are.');
          focus(controls.get(task.id));
        });
        const remove=button('×','chat-action-remove',()=>{
          if(!validDay(shownDay))return;
          const index=shownDay.tasks.findIndex(item=>item.id===task.id);
          if(index<0){render();return;}
          removed={day:shownDay,task:shownDay.tasks[index],index};
          shownDay.tasks=shownDay.tasks.filter(item=>item.id!==task.id);
          persist('Action removed. You can undo it.');
          focus(removal.querySelector('button'));
        });
        remove.setAttribute('aria-label',`Remove action: ${task.text}`);
        row.append(label,remove);
        list.append(row);
        controls.set(task.id,toggle);
      });
      list.hidden=!tasks.length;
      completed.replaceChildren();
      completed.hidden=!history.length;
      if(history.length){
        completed.append(node('h3','chat-actions-completed-title','Already done'));
        history.forEach(action=>completed.append(node('p','chat-actions-completed-item',action.title)));
      }
      removal.replaceChildren();
      removal.hidden=!removed;
      if(removed){
        const undo=button('Undo','chat-actions-undo',()=>{
          const previous=removed;
          if(!previous||!validDay(previous.day))return;
          if(!previous.day.tasks.some(task=>task.id===previous.task.id)){
            previous.day.tasks.splice(Math.min(previous.index,previous.day.tasks.length),0,previous.task);
          }
          removed=null;
          persist('Action restored.');
          focus(controls.get(previous.task.id));
        });
        undo.setAttribute('aria-label',`Undo removing action: ${removed.task.text}`);
        removal.append(node('span','','Action removed.'),undo);
      }
      if(saveFailed||(typeof storageAvailable!=='undefined'&&!storageAvailable)){
        announce('This change is kept for this visit only. Keep the app open; it has not been safely saved.');
      }else announce(notice);
      layout?.({preserveScroll:true});
    }
    render();
    return {render,element:section,heading,remove(){destroyed=true;section.remove();}};
  }
  window.SteadyChatActions={mount};
})();
