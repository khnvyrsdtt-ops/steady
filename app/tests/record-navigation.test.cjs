const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const G=require('../public/guidance.js');

function openRecord(days){
  let active=null;
  class Element{
    constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.events={};this.textContent='';}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(name,value){this.attrs[name]=value;}
    addEventListener(type,handler){this.events[type]=handler;}
    querySelector(tag){return this.children.find(child=>child.tag===tag)||null;}
    focus(){active=this;}
  }
  const nodes=new Map();
  const get=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);};
  const el=(tag,className,text)=>Object.assign(new Element(tag),{className,textContent:text||''});
  let markup;
  const sandbox={G,state:{days},$:get,el,link:(text,href,className)=>Object.assign(el('a',className,text),{href}),
    panel(route,title,html){markup=html;return new Element('section');}};
  const source=fs.readFileSync(require.resolve('../public/experience.js'),'utf8');
  const start=source.indexOf('  const historyPanel='),end=source.indexOf('  // Preserve existing private notes',start);
  assert.ok(start>=0&&end>start);
  vm.runInNewContext(source.slice(start,end)+'\nglobalThis.render=renderHistory;',sandbox);
  return{get,markup,render:()=>sandbox.render(),more:()=>get('#more-history').events.click(),
    rows:()=>get('#progress-days').children.filter(element=>element.className==='history-row history-entry'),
    get active(){return active;}};
}

test('an empty record offers a direct return to reflection without creating an entry',()=>{
  const days={},before=JSON.stringify(days),app=openRecord(days);app.render();
  const next=app.get('#progress-days').querySelector('a');
  assert.equal(next.textContent,'Reflect on today');assert.equal(next.href,'#review');
  assert.equal(app.get('#more-history').hidden,true);assert.equal(app.get('#history-status').textContent,'');
  assert.equal(JSON.stringify(days),before);
});

test('loading earlier days moves focus to the first new row even when the button disappears',()=>{
  const days=Object.fromEntries(Array.from({length:16},(_,index)=>[`2026-09-${String(27-index).padStart(2,'0')}`,{reflection:`Day ${index}`} ]));
  const before=JSON.stringify(days),app=openRecord(days);app.render();
  assert.equal(app.rows().length,7);assert.equal(app.get('#more-history').hidden,false);
  assert.match(app.markup,/id="more-history"[^>]*aria-controls="progress-days"/);
  assert.match(app.markup,/id="history-status"[^>]*role="status"/);
  app.more();assert.equal(app.rows().length,14);assert.equal(app.active,app.rows()[7]);
  assert.equal(app.get('#history-status').textContent,'7 earlier days shown. 14 of 16 days.');
  app.more();assert.equal(app.rows().length,16);assert.equal(app.get('#more-history').hidden,true);
  assert.equal(app.active,app.rows()[14]);assert.equal(app.get('#history-status').textContent,'2 earlier days shown. 16 of 16 days.');
  app.render();assert.equal(app.get('#history-status').textContent,'');
  assert.equal(JSON.stringify(days),before);
});

test('planned and closed days show honest summaries and full dates distinguish different years',()=>{
  const days={'2026-09-23':{tasks:[{id:'planned',text:'Call a friend',complete:false}]},'2025-09-23':{closed:true}};
  const before=JSON.stringify(days),app=openRecord(days);app.render();
  const rows=app.rows();assert.equal(rows.length,2);
  assert.equal(rows[0].children[1].textContent,'1 planned');assert.equal(rows[1].children[1].textContent,'Day closed');
  assert.match(rows[0].attrs['aria-label'],/2026/);assert.match(rows[1].attrs['aria-label'],/2025/);
  assert.match(rows[0].attrs['aria-label'],/1 planned/);
  assert.equal(app.get('#progress-totals').children[0].children[0].textContent,'0');
  assert.equal(JSON.stringify(days),before);
});
