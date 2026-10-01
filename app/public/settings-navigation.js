'use strict';
(() => {
  const control=document.querySelector('.settings-link');
  if(!control)return;
  const back=document.querySelector('.settings-back');
  const settingsRoute=hash=>hash==='#settings'||hash.startsWith('#settings/');
  const isSettings=settingsRoute;
  const mainHash='#today/feelings';
  const canonicalOrigin=hash=>!hash||['#home','#main','#steady','#help','#ask'].includes(hash)?mainHash:hash;
  let origin={hash:mainHash,top:0};
  let returning=null;
  const modified=event=>event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey;
  function rememberOrigin(){
    origin={hash:canonicalOrigin(location.hash),top:(window.SteadyViewport||window).scrollY};
    returning=null;
  }
  function sync(){
    const open=isSettings(location.hash);
    document.body.classList.toggle('settings-open',location.hash==='#settings');
    control.href=open?origin.hash:'#settings';
    control.setAttribute('aria-label',open?'Close settings':'Settings');
    control.setAttribute('aria-expanded',String(open));
    control.setAttribute('aria-hidden',String(open));
    control.tabIndex=open?-1:0;
    control.title=open?'Return to your previous screen':'Settings';
    if(back){
      // Name the destination, the way every other Back control does. Settings can
      // be opened from anywhere, so the label follows where it was opened from and
      // is only generic when that place cannot be named.
      const destination=destinationLabel(origin.hash);
      back.hidden=!open;
      back.href=origin.hash;
      back.innerHTML=SteadyIcons.svg('arrowLeft')+'<span>'+destination+'</span>';
      back.setAttribute('aria-label','Back to '+destination);
      back.title='Back to '+destination;
    }
  }
  // Keep the return label consistent with Steady and its focused tools.
  const destinationNames={
    home:'Steady',main:'Steady',today:'Your next step','today/step':'Your next step','today/check-in':'Check-in',
    'today/feelings':'Steady',direction:'My actions',review:'Reflect',
    'learn/scripture':'Scripture','learn/chapter':'Scripture','learn/reflect':'Scripture',
    'help/memory':'Memory',
  };
  function destinationLabel(hash){
    const route=String(hash||'').replace(/^#/,'').split('?')[0];
    return destinationNames[route]||'Back';
  }
  function toggle(event){
    // Preserve normal link behaviour for opening a separate tab/window.
    if(modified(event))return;
    event.preventDefault();
    if(isSettings(location.hash)){
      returning={...origin};
      navigateScreen(origin.hash.slice(1),'back');
    }else{
      rememberOrigin();
      navigateScreen('settings');
    }
    sync();
  }
  control.addEventListener('click',toggle);
  back?.addEventListener('click',toggle);
  // Giving and preference links can open Settings directly, without the gear.
  // Capture their source before a link handler or the browser changes the hash.
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||modified(event)||isSettings(location.hash))return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.target==='_blank')return;
    const hash=link.getAttribute('href')||'';
    if(settingsRoute(hash))rememberOrigin();
  },true);
  document.addEventListener('steady:screen',()=>{
    sync();
    if(!returning||isSettings(location.hash))return;
    const destination=returning;returning=null;
    // Screen rendering focuses its heading and resets scrolling first.
    requestAnimationFrame(()=>{
      if(canonicalOrigin(location.hash)===destination.hash)(window.SteadyViewport||window).scrollTo({top:destination.top,behavior:'instant'});
    });
  });
  sync();
})();
