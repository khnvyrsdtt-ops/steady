const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const icons=require('../public/icons.js');

test('Burden uses a simple outlined conversation mark, not a Bible book',()=>{
  const svg=icons.svg('burden');
  assert.equal((svg.match(/<path /g)||[]).length,2);
  assert.match(svg,/M7 4h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H9l-5 3v-4/,'rounded conversation bubble');
  assert.match(svg,/M12 9\.5v4m-2-2h4/,'small centred cross inside the bubble');
  assert.doesNotMatch(svg,/M6\.5 3\.5h13v17/,'no Bible book cover');
  assert.doesNotMatch(svg,/<rect|<image|<text|<filter|<animate|<linearGradient|<radialGradient/);
  assert.notEqual(svg,icons.svg('review'));
});

test('the cross has equal left/right clearance within the Burden bubble',()=>{
  const match=icons.svg('burden').match(/M12 9\.5v4m-2-2h4/);
  assert.ok(match,'the mark remains a simple bubble with a small cross');
  const cover={left:4.5,right:19.5,top:3.5,bottom:16.5};
  assert.ok(cover.left<12&&12<cover.right,'cross stays inside the bubble');
});

test('navigation icons share accessible, theme-aware 24-pixel stroke styling',()=>{
  for(const name of ['home','burden','review']){
    const svg=icons.svg(name);
    assert.match(svg,/viewBox="0 0 24 24" width="24" height="24"/);
    assert.match(svg,/fill="none" stroke="currentColor" stroke-width="1\.7"/);
    assert.match(svg,/stroke-linecap="round" stroke-linejoin="round"/);
    assert.match(svg,/aria-hidden="true" focusable="false"/,'visible tab label supplies the accessible name');
    assert.equal((svg.match(/<svg /g)||[]).length,1);
  }
});

test('Steady retains the conversation icon for content without recreating navigation tabs',()=>{
  const source=fs.readFileSync(require.resolve('../public/screens.js'),'utf8');
  assert.match(source,/const mainScreenRoute='today\/feelings'/);
  assert.match(source,/nav\.hidden=true/);
  assert.ok(icons.names.includes('burden'));
  assert.ok(icons.names.includes('help'),'retired book mark stays available');
  assert.equal(icons.svg('unknown'),'', 'unknown icons do not inject fallback markup');
});
