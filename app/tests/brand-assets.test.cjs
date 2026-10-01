const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const publicRoot=path.join(root,'app/public');
const read=name=>fs.readFileSync(path.join(publicRoot,name),'utf8');

test('small secondary labels meet normal-text contrast on light and dark reading surfaces',()=>{
  const luminance=hex=>{
    const rgb=hex.match(/[\da-f]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  const css=read('branding.css');
  for(const [theme,block]of [['light',css.match(/:root\{([^}]+)\}/)[1]],['dark',css.match(/:root\[data-theme=dark\]\{([^}]+)\}/)[1]]]){
    const colours=Object.fromEntries([...block.matchAll(/--([\w-]+):#([\da-f]{6})/gi)].map(([,name,value])=>[name,luminance(value)]));
    for(const text of ['muted','faint'])for(const surface of ['bg','surface','soft']){
      const ratio=(Math.max(colours[text],colours[surface])+.05)/(Math.min(colours[text],colours[surface])+.05);
      assert.ok(ratio>=4.5,`${theme} ${text} on ${surface}: ${ratio.toFixed(2)}`);
    }
  }
});

test('the app uses typography inside while its Home Screen icon stays separate',()=>{
  const index=read('index.html');
  const branding=read('branding.js');
  assert.match(index,/class="brand-wordmark"/);
  assert.doesNotMatch(index,/class="steady-symbol"/);
  assert.doesNotMatch(branding,/class="steady-symbol"/);
  assert.match(branding,/Built on Christ|BUILT ON CHRIST/);
});
test('every icon export has the expected PNG dimensions and native icon matches',()=>{
  for(const size of [16,32,48,64,120,152,167,180,192,512,1024]){
    const data=fs.readFileSync(path.join(publicRoot,'brand/app-icon-v2-'+size+'.png'));
    assert.equal(data.subarray(1,4).toString(),'PNG');
    assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);
  }
  const config=JSON.parse(fs.readFileSync(path.join(root,'expo/app.json'),'utf8'));
  assert.equal(config.expo.icon,'./assets/icon.png');
  const icon=fs.readFileSync(path.join(root,'expo',config.expo.icon));
  assert.deepEqual(icon,fs.readFileSync(path.join(publicRoot,'brand/app-icon-v2-1024.png')));
  assert.deepEqual(fs.readFileSync(path.join(root,'expo/ios/Steady/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png')),icon);
});
test('all local assets referenced by the app entry exist',()=>{
  const index=read('index.html');
  for(const [,href] of index.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)){
    const filename=href.split('?')[0].slice(2);
    assert.ok(fs.existsSync(path.join(publicRoot,filename)),filename);
  }
  const manifest=JSON.parse(read('manifest.webmanifest'));
  for(const item of manifest.icons)assert.ok(fs.existsSync(path.join(publicRoot,item.src.split('?')[0])));
  assert.doesNotMatch(index,/symbol-light\.svg|symbol-dark\.svg|app-icon\.svg/);
  assert.doesNotMatch(index,/swipe-navigation|exercises\.js|welcome-note\.js|brand-boot\.js/);
});
test('old practice names remain available without loading exercises',()=>{
  const titles=require('../public/legacy-practice.js');
  assert.equal(Object.keys(titles).length,18);
  assert.equal(titles['memory-chunk'],'Remember one useful idea');
  assert.equal(fs.existsSync(path.join(publicRoot,'exercises.js')),false);
});
test('settings retain privacy without retired reminder or giving controls',()=>{
  const html=read('index.html');
  assert.match(html,/id="privacy-preferences"/);
  assert.doesNotMatch(html,/<details class="settings-more"/);
  assert.doesNotMatch(html,/setting-notification|test-notification|giving\.js/);
  assert.equal(fs.existsSync(path.join(publicRoot,'giving.js')),false);
  assert.match(read('branding.js'),/Steady is free to use\./);
});

test('retired visual plumbing is absent while the donkey animation remains available',()=>{
  assert.equal(fs.existsSync(path.join(publicRoot,'brand-boot.js')),false);
  assert.doesNotMatch(read('index.html'),/brand-splash|splash-symbol/);
  assert.doesNotMatch(read('branding.css'),/brand-splash|splash-symbol/);
  assert.doesNotMatch(read('branding.js'),/has-pointer-reflection|--glass-x|--glass-y/);
  const scripture=read('scripture-feelings.js'),css=read('scripture-feelings.css');
  assert.match(scripture,/class="donkey-pop"/);
  assert.match(scripture,/burden-painted\.png/);
  assert.match(css,/\.donkey-pop\s*\{/);
  assert.match(css,/@keyframes donkey-pop\s*\{/);
  assert.ok(fs.existsSync(path.join(publicRoot,'art/animals/burden-painted.png')));
});

test('stone lettering keeps live text and accessible solid-color fallbacks',()=>{
  const css=read('wordmark-stone.css');
  assert.match(read('index.html'),/wordmark-stone\.css\?v=/);
  assert.match(css,/@supports.*background-clip:text/);
  assert.match(css,/background-color:var\(--stone-middle\)/);
  assert.match(css,/data:image\/svg\+xml/);
  assert.match(css,/prefers-contrast:more/);
  assert.match(css,/forced-colors:active/);
  assert.match(css,/@media print/);
  assert.match(css,/-webkit-text-fill-color:currentColor/);
  assert.doesNotMatch(css,/https?:\/\/(?!www\.w3\.org)|content\s*:|animation\s*:/);
});

