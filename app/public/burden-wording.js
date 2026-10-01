'use strict';
(() => {
  // AI only edits the supplied reading prose. Scripture and references remain
  // separate DOM nodes populated directly from the local Bible library.
  const cache=new Map(),pending=new Map(),requests=new WeakMap();
  let epoch=0;
  const enabled=()=>state.profile?.burdenAI!==false;
  function validText(value){
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text||text.length>700||text.split(/\s+/).length>100||/[<>]|https?:\/\/|\b\d{1,3}:\d{1,3}\b/.test(text))return null;
    if(!window.SteadyAskRouting?.validGeneralAnswer(text))return null;
    return text;
  }
  async function organise(element,{requestId,text,sourceText,onLayout=()=>{}}){
    const native=window.SteadyNative;
    if(!enabled()||typeof native?.organiseReply!=='function'||!element||element.closest('blockquote,.verse-reference,.chapter-verse,.study-result-text')||typeof sourceText!=='string'||!sourceText.trim()||sourceText.length>3000||typeof text!=='string'||text.length>1200||typeof requestId!=='string'||requestId.length>160)return false;
    const memories=window.SteadyBurdenMemoryStore?.context(text)||[];
    const original=element.textContent,key=JSON.stringify([requestId,text,sourceText,memories]),token={},started=epoch;
    requests.set(element,token);
    try {
      let result=cache.get(key);
      if(!result){
        let operation=pending.get(key);
        if(!operation){
          const work=()=>{
            if(!enabled()||started!==epoch)return {available:false};
            return native.organiseReply({requestId,text,sourceText,...(memories.length?{memories}:{})});
          };
          operation=typeof window.SteadyBurdenMemoryStore?.runWording==='function'?window.SteadyBurdenMemoryStore.runWording(work):Promise.resolve().then(work);
          pending.set(key,operation);
        }
        try{result=await operation;}finally{if(pending.get(key)===operation)pending.delete(key);}
        const wording=result?.available===true?validText(result.text):null;
        if(!wording)return false;
        if(!enabled()||started!==epoch)return false;
        result=wording;cache.set(key,result);
        if(cache.size>30)cache.delete(cache.keys().next().value);
      }
      if(!enabled()||started!==epoch||requests.get(element)!==token||!element.isConnected||element.closest('.speech-active')||element.textContent!==original)return false;
      element.textContent=result;element.hidden=false;
      let label=element.nextElementSibling;
      if(!label?.classList.contains('local-ai-label')){
        label=document.createElement('p');label.className='moment-editorial local-ai-label';element.after(label);
      }
      label.textContent='Worded with on-device AI';
      onLayout();return true;
    }catch{return false;}
  }
  window.SteadyBurdenWording={organise,enabled,validText,whenIdle:()=>Promise.allSettled([...pending.values()])};
  document.addEventListener?.('steady:memory-changed',()=>{epoch++;cache.clear();});
  const control=document.getElementById('setting-burden-ai'),section=document.getElementById('burden-ai-preference'),status=document.getElementById('burden-ai-status');
  if(control&&section){
    section.hidden=typeof window.SteadyNative?.organiseReply!=='function';
    control.value=enabled()?'on':'off';
    control.addEventListener('change',()=>{
      if(!['on','off'].includes(control.value))return;
      state.profile={...state.profile,burdenAI:control.value==='on'};epoch++;
      const stored=save(),notice=document.getElementById('settings-status');if(notice)notice.textContent=stored?'Saved':'Applied for this visit only.';
      document.dispatchEvent(new CustomEvent('steady:wording-setting'));
    });
    window.SteadyNative?.localAIStatus?.().then(result=>{
      if(status)status.textContent=(result?.available?'Answers general questions on this iPhone. ':'General AI needs Apple Intelligence. Library replies remain available. ')+
        'Your words stay on this device. Scripture comes from the verified library.';
    }).catch(()=>{});
  }
})();
