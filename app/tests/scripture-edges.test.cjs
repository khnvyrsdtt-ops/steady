const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync(require.resolve('../public/scripture-feelings.css'),'utf8');
const rule=selector=>{
  const start=css.indexOf('\n'+selector+'{');
  assert.ok(start>=0,selector+' exists');
  return css.slice(start,css.indexOf('}',start)+1);
};

test('the transcript scrolls edge to edge with no overlay bands',()=>{
  assert.doesNotMatch(css,/chat-viewport::(before|after)/,'no fade overlays above the keyboard or below the top');
  assert.match(rule('.chat-scroll'),/var\(--chat-input-height,120px\) \+ 26px \+ var\(--keyboard-overlap,0px\)/,'last controls can scroll above the floating input');
  assert.match(rule('.chat-scroll'),/scroll-padding-top:calc\(var\(--chat-top-space\)/,'focused content clears the top controls');
  assert.doesNotMatch(css,/\.chat-header\s*\{/,'the removed full-width header does not return');
  assert.doesNotMatch(rule('.chat-viewport'),/background:|backdrop-filter:/,'the transcript has no overlay sheet');
  assert.match(rule('.chat-input-area'),/bottom:calc\(var\(--chat-bottom-space\) \+ var\(--keyboard-overlap,0px\)\)/,'the input clears the measured keyboard height');
  assert.match(rule('.chat-input-area'),/padding:0;/,'the wrapper adds no strip beneath the composer');
  assert.match(rule('.chat-input-area'),/background:transparent/,'no sheet behind the message box');
  assert.match(rule('.chat-input-area'),/box-shadow:none/,'no shadow pooling under the input');
  assert.match(rule('.chat-composer'),/border-radius:24px/,'one Apple-style pill for typing');
  assert.match(rule('.chat-composer'),/border:1px solid var\(--line\)/,'a hairline edge on the pill');
  assert.doesNotMatch(css,/#feelings-form\{[^}]*background:/,'no backdrop behind the message box');
  assert.match(rule('.chat-composer'),/backdrop-filter:blur\(20px\) saturate\(1\.4\)/,'see-through liquid glass on the pill, not opaque white');
});
