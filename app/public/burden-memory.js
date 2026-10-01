'use strict';
(() => {
  const model=window.SteadyBurdenMemory;
  if(!model)return;
  let epoch=0,availability=typeof window.SteadyNative?.localAIStatus==='function'?null:false,reason='',queue=Promise.resolve();
  const pending=new Set();
  const jobs=[];let generating=false;
  function drain(){
    if(generating||!jobs.length)return;
    // Reply wording takes precedence over memory jobs that have not started.
    const priority=jobs.findIndex(job=>job.kind==='wording');
    const job=jobs.splice(priority<0?0:priority,1)[0];generating=true;
    Promise.resolve().then(job.work).then(job.resolve,()=>job.resolve({available:false})).finally(()=>{generating=false;drain();});
  }
  function schedule(kind,work){return new Promise(resolve=>{jobs.push({kind,work,resolve});drain();});}
  const enabled=()=>state.profile?.burdenMemoryEnabled!==false;
  const value=()=>model.normalize(state.burdenMemory);
  const active=()=>document.body.classList.contains('chat-screen');
  const notify=()=>document.dispatchEvent(new CustomEvent('steady:memory-changed'));
  function persist(next){state.burdenMemory=next;const stored=save();notify();return stored;}
  function setEnabled(on){
    if(typeof on!=='boolean')return false;
    epoch++;state.profile={...state.profile,burdenMemoryEnabled:on};
    const stored=save();notify();return stored;
  }
  function forget(id){epoch++;return persist(model.forget(value(),id));}
  function clear(){epoch++;return persist(model.clear(value()));}
  function forgetSource(id){
    epoch++;
    const before=value(),after=model.forgetSource(before,id);
    if(JSON.stringify(before)!==JSON.stringify(after))return persist(after);
    notify();return true;
  }
  function summary(){const memory=value();return {enabled:enabled(),count:memory.notes.length,bytes:model.byteSize(memory),available:availability,reason};}
  const context=text=>enabled()?model.context(value(),text):[];
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function capture(request){
    const native=window.SteadyNative;
    if(!enabled()||typeof native?.extractMemory!=='function'||!request||typeof request.id!=='string'||typeof request.text!=='string'||!request.text.trim()||request.text.length>1200||value().processed.includes(request.id)||pending.has(request.id))return Promise.resolve(false);
    const entry={id:request.id,text:request.text,at:request.at},started=epoch;
    pending.add(entry.id);
    const current=()=>enabled()&&started===epoch&&active()&&state.scriptureRequests?.some(item=>item.id===entry.id&&item.text===entry.text);
    const operation=queue.catch(()=>{}).then(async()=>{
      // Let the prepared reply appear and finish its wording before using the
      // shared local model slot. Only new submissions are considered for memory.
      await pause(1100);
      if(!current())return false;
      await window.SteadyBurdenWording?.whenIdle?.();
      if(!current())return false;
      const result=await schedule('memory',()=>current()?native.extractMemory({requestId:entry.id,text:entry.text}):{available:false});
      if(!current()||result?.available!==true||!Array.isArray(result.notes))return false;
      return persist(model.remember(value(),result.notes,{sourceId:entry.id,sourceText:entry.text,at:entry.at}));
    }).catch(()=>false).finally(()=>pending.delete(entry.id));
    queue=operation;return operation;
  }
  window.SteadyBurdenMemoryStore={enabled,setEnabled,forget,clear,forgetSource,summary,context,capture,runWording:work=>schedule('wording',work)};
  document.addEventListener('steady:screen',event=>{if(event.detail!=='today/feelings')epoch++;});
  window.SteadyNative?.localAIStatus?.().then(result=>{
    availability=result?.available===true;reason=typeof result?.reason==='string'?result.reason:'';notify();
  }).catch(()=>{availability=false;notify();});
})();
