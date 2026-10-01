const say=t=>{try{window.webkit.messageHandlers.steady.postMessage({type:'diagLog',line:t});}catch(_){}};
window.__A=window.SteadyAnimals;
window.__st=()=>{let s=null;try{s=localStorage.getItem('steady.animal');}catch(_){}
 return {stored:s,mode:window.__A.mode,cur:window.__A.current(),manual:window.__A.isManual()};};
window.__tiles=()=>[...document.querySelectorAll('.donkey-guide')].filter(t=>t.getClientRects().length).map(t=>(t.getAttribute('data-animal')||'?')+'|'+(t.querySelector('img')||{}).getAttribute('src'));
window.__r=l=>say('ST| '+l+' '+JSON.stringify(window.__st())+' tiles='+JSON.stringify(window.__tiles()));
window.__pick=id=>{window.SteadyAnimalChosen(id);return new Promise(r=>setTimeout(()=>{window.__r('pick:'+id);r(1);},700));};
window.__say2=t=>{const ta=document.querySelector('#feelings-input, .chat-input-area textarea');return ta?ta.tagName:'no-input';};
