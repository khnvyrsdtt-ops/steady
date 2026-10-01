const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function openHistory(days) {
  class Element {
    constructor(tag) { this.tag=tag; this.children = []; this.classList = {add() {}}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
  }
  const panel = new Element();
  let onScreen,title;
  const sandbox = {
    state: {days},
    document: {
      createElement: tag => new Element(tag),
      addEventListener(type, handler) { assert.equal(type, 'steady:screen'); onScreen = handler; }
    },
    window: {steadyExperience: {addPanel: (route,name) => {title=name;return panel;}}},
    SteadyGuide: require('../public/guidance.js'),
    SteadyScriptureReflection: require('../public/scripture-reflection.js'),
    ScriptureLibrary: {foundation:{reference:'Matthew 7:24'}}, SteadyLegacyPractice: require('../public/legacy-practice.js')
  };
  const app = fs.readFileSync(require.resolve('../public/app.js'), 'utf8');
  const validators = app.slice(app.indexOf('const isDateKey ='), app.indexOf('let today ='));
  assert.match(validators, /const isRecord =/);
  vm.runInNewContext(validators + fs.readFileSync(require.resolve('../public/history.js'), 'utf8'), sandbox);
  const descendants = element => element.children.flatMap(child => [child, ...descendants(child)]);
  return {
    show(date) { onScreen({detail: `review/day/${date}`}); },
    panel,title, elements: () => descendants(panel),
    text: () => descendants(panel).map(element => element.textContent || '').join('\n')
  };
}

test('history rejects nonexistent calendar dates, missing days and non-record entries', () => {
  const history = openHistory({'2026-02-31': {reflection: 'Wrong date'}, '2026-09-23': 'Broken record'});
  for (const date of ['2026-02-31', '2026-09-23', '2026-09-24', 'not-a-date']) {
    history.show(date);
    assert.match(history.text(), /No entry here/);
    assert.doesNotMatch(history.text(), /Wrong date|Invalid Date/);
    const back=history.elements().find(element=>element.tag==='a');
    assert.equal(back?.href,'#review/progress');assert.equal(back?.textContent,'Your record');
  }
});

test('history preserves literal private text and shows distinct goal-specific completed actions', () => {
  const text = '<img src=x onerror="alert(1)">';
  const history = openHistory({'2026-09-23': {
    reflection: text,
    mind: 'Keep my note',
    actionLog: [{id: 'grow-build', goal: 'work', title: 'Start work'}, {id: 'grow-build', goal: 'relationships', title: 'Thank a friend'}]
  }});
  history.show('2026-09-23');
  assert.match(history.text(), /Start work/);
  assert.match(history.text(), /Thank a friend/);
  assert.match(history.text(), /Keep my note/);
  const reflection = history.elements().find(element => element.textContent === text);
  assert.ok(reflection);
  assert.equal(reflection.innerHTML, undefined, 'private entries must be rendered as text');
});

test('retired practice titles remain readable and inherited IDs are never rendered',()=>{
  const history=openHistory({'2026-09-23':{practice:{'memory-chunk':{correct:true},constructor:{correct:true},toString:{correct:true}}}});
  history.show('2026-09-23');
  assert.match(history.text(),/Remember one useful idea/);
  assert.match(history.text(),/Earlier practice/);
  assert.doesNotMatch(history.text(),/function Object|native code/);
});

test('saved-day cleanup keeps reflection first and preserves secondary content in one closed disclosure',()=>{
  const days={'2026-09-23':{reflection:'A day worth remembering',reflections:['I showed up'],mind:'A private earlier note',
    actionLog:[{id:'grow-build',goal:'work',title:'A completed work step'}],tasks:[{text:'A personal action',complete:true}],
    practice:{'memory-chunk':{correct:true}},closed:true}};
  const before=JSON.stringify(days),history=openHistory(days);
  history.show('2026-09-23');
  const details=history.panel.children.filter(element=>element.tag==='details');
  assert.equal(details.length,1);assert.notEqual(details[0].open,true);
  assert.equal(details[0].children[0].textContent,'Other details');
  assert.equal(history.panel.children[0].className,'record-date');
  assert.equal(history.panel.children[1].children[1].textContent,'A day worth remembering');
  const detailText=element=>[element.textContent||'',...element.children.map(detailText)].join('\n');
  assert.match(detailText(details[0]),/A private earlier note/);
  assert.match(detailText(details[0]),/A completed work step/);
  assert.match(detailText(details[0]),/A personal action/);
  assert.match(detailText(details[0]),/Remember one useful idea/);
  assert.equal(JSON.stringify(days),before,'reading never rewrites saved records');
  history.show('2026-09-23');assert.equal(JSON.stringify(days),before,'repeat visits are read-only too');
});

test('a day without secondary content has no empty disclosure or extra controls',()=>{
  for(const entry of [{reflection:'Only my reflection'},{closed:true}]){
    const history=openHistory({'2026-09-23':entry});history.show('2026-09-23');
    assert.equal(history.elements().filter(element=>['details','button','a'].includes(element.tag)).length,0);
  }
});

test('past planned actions remain distinct from completed work without changing saved tasks',()=>{
  const literal='<img src=x onerror="alert(1)">';
  const days={'2026-09-23':{tasks:[
    {id:'done',text:'Finished action',complete:true},
    {id:'planned',text:literal,complete:false},
    {id:'planned',text:'Duplicate ID',complete:false},
    {id:'index:2',text:'Named task',complete:false},
    {text:'Unnamed task',complete:false},
    {text:'Another unnamed task'},
    {text:'   ',complete:false},null
  ]}};
  const before=JSON.stringify(days),history=openHistory(days);history.show('2026-09-23');
  const sections=history.elements().filter(element=>element.tag==='section');
  const completed=sections.find(element=>element.children[0]?.textContent==='Completed actions');
  const planned=sections.find(element=>element.children[0]?.textContent==='Planned actions');
  assert.deepEqual(completed.children.find(element=>element.tag==='ul').children.map(element=>element.textContent),['Finished action']);
  assert.deepEqual(planned.children.find(element=>element.tag==='ul').children.map(element=>element.textContent),[literal,'Named task','Unnamed task','Another unnamed task']);
  assert.equal(planned.children[1].textContent,'Not marked complete.');
  assert.equal(planned.children.find(element=>element.tag==='ul').children[0].innerHTML,undefined);
  assert.equal(history.elements().some(element=>element.tag==='input'||element.tag==='button'),false);
  assert.equal(JSON.stringify(days),before);
});

test('a planned-only day shows its actions directly with no empty reflection message or disclosure',()=>{
  for(const closed of [false,true]){
    const days={'2026-09-23':{closed,tasks:[{id:'planned',text:'Call a friend',complete:false}]}};
    const before=JSON.stringify(days),history=openHistory(days);history.show('2026-09-23');
    assert.equal(history.title,'Your day');
    const planned=history.panel.children.find(element=>element.tag==='section');
    assert.equal(planned?.children[0].textContent,'Planned actions');
    assert.match(history.text(),/Call a friend/);
    assert.doesNotMatch(history.text(),/No reflection|No written reflection/);
    assert.equal(history.elements().some(element=>element.tag==='details'),false);
    assert.equal(JSON.stringify(days),before);
  }
});

test('planned actions stay secondary when a written, selected or Scripture reflection exists',()=>{
  for(const reflection of [{reflection:'A thought worth keeping'},{reflections:['I showed up']},{scriptureReflection:{theme:'foundation',choice:'pause'}}]){
    const days={'2026-09-23':{...reflection,tasks:[{id:'planned',text:'Call a friend',complete:false}]}};
    const before=JSON.stringify(days),history=openHistory(days);history.show('2026-09-23');
    const details=history.panel.children.find(element=>element.tag==='details');
    assert.ok(details);assert.notEqual(details.open,true);
    assert.equal(details.children[1].children.some(element=>element.children[0]?.textContent==='Planned actions'),true);
    assert.equal(history.panel.children.some(element=>element.children[0]?.textContent==='Planned actions'),false);
    assert.equal(JSON.stringify(days),before);
  }
});
