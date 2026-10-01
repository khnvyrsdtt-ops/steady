'use strict';
(() => {
  const content=document.querySelector('.app-content');
  const dock=document.querySelector('.sidebar nav');
  if(!content||!dock)return;
  const root=document.documentElement;
  let frame=null;
  const values=new Map();
  window.SteadyViewport={
    get scrollY(){return content.scrollTop;},
    scrollTo(options){content.scrollTo(options);}
  };
  function setProperty(name,value){
    if(values.get(name)===value)return;
    values.set(name,value);
    root.style.setProperty(name,value);
  }
  function scheduleFit(){
    if(frame!==null)return;
    frame=requestAnimationFrame(fit);
  }
  function fit(){
    frame=null;
    const view=window.visualViewport;
    const editing=document.activeElement?.matches('input:not([type=checkbox]),textarea,[contenteditable=true]');
    const contracted=!!(view&&view.scale===1&&view.height<window.innerHeight-100);
    // Focus can move before iOS finishes moving the keyboard. Keep the compact
    // layout until the visual viewport itself returns to full height. A stale
    // native flag must never veto a visibly contracted viewport while editing.
    const nativeKeyboard=root.dataset.nativeKeyboard==='true';
    const slightlyContracted=!!(view&&view.scale===1&&view.height<window.innerHeight-40);
    const keyboard=nativeKeyboard||!!(contracted&&(editing||root.dataset.keyboardOpen==='true'))||!!(editing&&slightlyContracted);
    // This attribute controls dock visibility. Apply a keyboard transition before
    // measuring, but avoid invalidating styles on every viewport callback.
    if(root.dataset.keyboardOpen!==String(keyboard))root.dataset.keyboardOpen=String(keyboard);
    let clearance=0;
    if(!keyboard&&root.dataset.nativeApp!=='ios'&&root.dataset.nativeTabs!=='true'){
      const style=getComputedStyle(dock);
      if(style.display!=='none')clearance=dock.getBoundingClientRect().height+(parseFloat(style.bottom)||0)+12;
    }
    const onChat=!!document.body.classList?.contains('chat-screen');
    // Measure the visible area once for both the composer and transcript.
    // Native frames still work when WebKit does not resize its visual viewport.
    // The body follows caret panning, so both heights stay in screen coordinates.
    const top=keyboard?Math.max(0,view?.offsetTop||0):0;
    const nativeHeight=Number(root.dataset.nativeAppHeight);
    const nativeViewportHeight=Number(root.dataset.nativeViewportHeight);
    // WKWebView can shrink innerHeight along with the visible viewport. The
    // conversation still occupies the whole native view behind the keyboard.
    const canvasHeight=onChat&&Number.isFinite(nativeViewportHeight)&&nativeViewportHeight>0
      ?nativeViewportHeight:window.innerHeight;
    const viewHeight=(view&&Number.isFinite(view.height))?view.height:window.innerHeight;
    const visibleHeight=nativeKeyboard&&Number.isFinite(nativeHeight)&&nativeHeight>0
      ?Math.min(viewHeight,nativeHeight):viewHeight;
    const overlap=keyboard?Math.max(0,canvasHeight-visibleHeight):0;
    setProperty('--keyboard-overlap',overlap+'px');
    // Chat retains a full-height transcript with floating controls at the
    // measured keyboard edge; other screens resize to their visible area.
    setProperty('--app-height',keyboard?(onChat?canvasHeight:visibleHeight)+'px':'100dvh');
    // Safari and WKWebView can pan the visual viewport to reveal the caret,
    // even when native code also supplies the keyboard's visible height.
    // Keep the fixed chat anchored to the visible area in either case.
    setProperty('--app-top',top+'px');
    setProperty('--navigation-space',Math.ceil(clearance)+'px');
  }
  if(window.ResizeObserver){const observer=new ResizeObserver(scheduleFit);[dock,content,...content.children].forEach(node=>observer.observe(node));}
  new MutationObserver(scheduleFit).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('steady:screen',scheduleFit);
  window.addEventListener('resize',scheduleFit);
  window.visualViewport?.addEventListener('resize',scheduleFit);
  window.visualViewport?.addEventListener('scroll',scheduleFit);
  document.addEventListener('focusin',scheduleFit);
  document.addEventListener('focusout',scheduleFit);
  fit();
})();
