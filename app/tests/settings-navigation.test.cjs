const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function open(hash='#home',scroll=0){
  const events={},attrs={},frames=[],backEvents={},backAttrs={},classes=new Set(),navigations=[];
  const control={setAttribute:(k,v)=>attrs[k]=v,addEventListener:(name,handler)=>events[name]=handler};
  const back={setAttribute:(k,v)=>backAttrs[k]=v,addEventListener:(name,handler)=>backEvents[name]=handler};
  const location={hash};const window={scrollY:scroll,scrollTo:({top})=>window.scrollY=top};const documentEvents={};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/settings-navigation.js'),'utf8'),{
    SteadyIcons:require('../public/icons.js'),location,window,document:{body:{classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)}},querySelector:selector=>selector==='.settings-back'?back:control,addEventListener:(name,fn)=>documentEvents[name]=fn},requestAnimationFrame:fn=>frames.push(fn),navigateScreen:(route,kind)=>{navigations.push({route,kind});location.hash='#'+route;}
  });
  function render(){documentEvents['steady:screen']();window.scrollY=0;while(frames.length)frames.shift()();}
  function click(extra={},target=events){let prevented=false;target.click({button:0,preventDefault:()=>prevented=true,...extra});return prevented;}
  function followLink(hash,extra={}){
    const link={getAttribute:name=>name==='href'?hash:null,target:extra.target||''};
    documentEvents.click({button:0,target:{closest:()=>link},...extra});
    if(!extra.metaKey&&!extra.ctrlKey&&!extra.shiftKey&&!extra.altKey&&extra.target!=='_blank'&&!extra.defaultPrevented){location.hash=hash;render();}
  }
  return {click,clickBack:()=>click({},backEvents),followLink,render,location,window,attrs,control,back,classes,navigations};
}
test('settings toggles back to the same screen and scroll position',()=>{
  const a=open('#learn/scripture',420);a.click();a.render();assert.equal(a.location.hash,'#settings');assert.equal(a.attrs['aria-label'],'Close settings');
  a.click();a.render();assert.equal(a.location.hash,'#learn/scripture');assert.equal(a.window.scrollY,420);assert.equal(a.attrs['aria-label'],'Settings');
  assert.deepEqual(a.navigations.at(-1),{route:'learn/scripture',kind:'back'});
});
test('settings subpages preserve the original destination across a rapid second tap',()=>{
  const a=open('#today',250);a.click();a.click();a.render();assert.equal(a.location.hash,'#today');assert.equal(a.window.scrollY,250);
  a.click();a.render();a.location.hash='#settings/about';a.render();a.click();a.render();assert.equal(a.location.hash,'#today');assert.equal(a.window.scrollY,250);
});
test('direct settings entry falls back to Steady, with no external history traversal',()=>{
  const a=open('#settings/about');a.click();a.render();assert.equal(a.location.hash,'#today/feelings');assert.equal(a.window.scrollY,0);
});
test('only settings routes open the settings shell',()=>{
  const a=open('#review');a.click();a.render();assert.equal(a.location.hash,'#settings');
  a.click();a.render();assert.equal(a.location.hash,'#review');
  const b=open('#learn/scripture');b.render();assert.equal(b.classes.has('settings-open'),false);
});
test('modified clicks preserve normal browser link behaviour',()=>{
  const a=open('#review');assert.equal(a.click({metaKey:true}),false);assert.equal(a.location.hash,'#review');
});
test('a visible contextual Back link returns to the prior screen when the gear is hidden',()=>{
  const a=open('#learn/chapter',460);a.click();a.render();
  assert.equal(a.attrs['aria-hidden'],'true');assert.equal(a.back.hidden,false);assert.equal(a.back.href,'#learn/chapter');
  a.clickBack();a.render();assert.equal(a.location.hash,'#learn/chapter');assert.equal(a.window.scrollY,460);assert.equal(a.attrs['aria-hidden'],'false');assert.equal(a.back.hidden,true);
});
test('Steady and direct Settings entry always have an explicit return control',()=>{
  const a=open();a.click();a.render();assert.equal(a.back.hidden,false);assert.equal(a.back.href,'#today/feelings');
  a.clickBack();a.render();assert.equal(a.location.hash,'#today/feelings');assert.equal(a.back.hidden,true);
  const b=open('#settings');assert.equal(b.back.hidden,false);assert.equal(b.back.href,'#today/feelings');
});
test('Settings styling and accessibility reset outside the visit',()=>{
  const a=open('#review');a.click();a.render();
  assert.equal(a.classes.has('settings-open'),true);assert.equal(a.attrs['aria-hidden'],'true');
  a.location.hash='#review';a.render();assert.equal(a.classes.has('settings-open'),false);assert.equal(a.attrs['aria-hidden'],'false');
  const b=open('#learn/scripture');assert.equal(b.classes.has('settings-open'),false);assert.equal(b.attrs['aria-hidden'],'false');
});
test('direct About links remember their true source and preserve it through Settings pages',()=>{
  const a=open('#learn/scripture',380);a.followLink('#settings/about');
  assert.equal(a.back.href,'#learn/scripture');
  a.followLink('#settings');a.followLink('#settings/about');a.followLink('#settings');
  assert.equal(a.back.href,'#learn/scripture');
  a.clickBack();a.render();assert.equal(a.location.hash,'#learn/scripture');assert.equal(a.window.scrollY,380);
});
test('a new direct Settings visit replaces the earlier origin',()=>{
  const a=open('#home',140);a.followLink('#settings/about');a.clickBack();a.render();
  a.location.hash='#review';a.window.scrollY=240;a.followLink('#settings/personal');
  a.followLink('#settings');a.clickBack();a.render();assert.equal(a.location.hash,'#review');assert.equal(a.window.scrollY,240);
});
test('a standalone screen can open a Settings link and return as a normal screen',()=>{
  const a=open('#learn/scripture',85);a.followLink('#settings/personal');a.followLink('#settings');a.clickBack();a.render();
  assert.equal(a.location.hash,'#learn/scripture');assert.equal(a.window.scrollY,85);assert.equal(a.classes.has('settings-open'),false);
});
test('modified Settings links do not replace the remembered return destination',()=>{
  const a=open('#today',210);a.click();a.render();a.clickBack();a.render();
  a.location.hash='#review';a.window.scrollY=100;a.followLink('#settings/about',{metaKey:true});
  a.location.hash='#settings';a.render();assert.equal(a.back.href,'#today');
});
