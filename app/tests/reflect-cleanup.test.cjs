const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

test('Reflect record keeps one right-aligned arrow treatment',()=>{
  assert.match(read('experience.js'),/link\('Your record','#review\/progress','text-link progress-link'\)/);
  const css=read('reflect-cleanup.css');
  assert.match(css,/\.reflection-card \.progress-link\{width:100%;justify-content:space-between/);
  assert.match(css,/\.reflection-card \.progress-link::after\{content:'→'/);
  assert.doesNotMatch(css,/review-helpful-link|helpful-panel/);
  assert.doesNotMatch(read('helpful.js'),/review\/helpful|addPanel/);
});

test('record overview keeps the existing live totals and moves them after day navigation',()=>{
  const script=read('history.js');
  assert.match(script,/details\.append\(totals\)/);
  assert.match(script,/details\.append\(useful\)/);
  assert.match(script,/overview\.append\(details\)/);
  assert.doesNotMatch(script,/\bsave\s*\(|localStorage|delete state|state\.days\s*=/);
  const css=read('reflect-cleanup.css');
  assert.match(css,/\.record-index \.history-entry\{display:grid/);
  assert.match(css,/html\[data-size=large\]/);
  assert.match(css,/html\[data-spacing=roomy\]/);
  assert.doesNotMatch(css,/backdrop-filter|animation:|overflow:hidden/);
});
