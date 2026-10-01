const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const M=require('../public/burden-memory-model.js');

const at='2026-09-27T12:00:00.000Z';
const empty=()=>({version:1,notes:[],processed:[]});
const note=(id,text,timestamp=at,sourceId=id)=>({id,text,sourceId,at:timestamp});
const memory=notes=>({version:1,notes,processed:notes.map(item=>item.sourceId)});
const remember=(value,sourceId,sourceText,details=[sourceText],timestamp=at)=>M.remember(value,details,{sourceId,sourceText,at:timestamp});

test('exports the same pure model in a classic browser script without platform dependencies',()=>{
  const browser={};vm.createContext(browser);
  vm.runInContext(fs.readFileSync(require.resolve('../public/burden-memory-model.js'),'utf8'),browser);
  assert.deepEqual(Object.keys(browser.SteadyBurdenMemory),Object.keys(M));
  assert.deepEqual(JSON.parse(JSON.stringify(browser.SteadyBurdenMemory.normalize())),empty());
});

test('malformed and unsupported restored records produce a fresh bounded record',()=>{
  for(const value of [undefined,null,[],{},true,'memory',{version:2,notes:[note('one','Private detail')]}])assert.deepEqual(M.normalize(value),empty());
  const value={version:1,notes:'bad',processed:'bad'};
  assert.deepEqual(M.normalize(value),empty());
});

test('normalization validates notes, dates and identifiers without retaining extra fields or mutating restored data',()=>{
  const value={version:1,notes:[
    {...note('keep','  I work in a bakery.  ','2026-09-27T14:00:00+02:00'),extra:'discard'},
    note('blank','  '),note('long','x'.repeat(181)),note('invalid date','Bad date'),
    note('impossible','Impossible date','2026-02-30T00:00:00Z'),
    note('leap','Leap date','2025-02-29T00:00:00Z'),note('clock','Bad clock','2026-09-27T24:00:00Z'),
    note('zone','Bad offset','2026-09-27T12:00:00+24:00'),
    note('source','Bad source',at,'x'.repeat(81)),null,[],
    note('x'.repeat(101),'Bad note identifier')
  ],processed:['keep','keep','with spaces','x'.repeat(81),null],extra:'discard'};
  const before=structuredClone(value),result=M.normalize(value);
  assert.deepEqual(result,{version:1,notes:[note('keep','I work in a bakery.')],processed:['keep']});
  assert.deepEqual(value,before);assert.notEqual(result.notes[0],value.notes[0]);
  assert.equal(M.normalize(memory([note('leap','Valid leap day','2024-02-29T00:00:00Z')])).notes.length,1);
});

test('restored notes sort newest first and deduplicate identifiers and case-insensitive whitespace',()=>{
  const old='2026-09-26T12:00:00Z',newest='2026-09-28T12:00:00Z';
  const result=M.normalize({version:1,notes:[note('old','I work in a bakery.',old),note('new','i WORK\n in a bakery.',newest),note('new','Different duplicate ID.',old),note('other','My sister is Ana.')],processed:[]});
  assert.deepEqual(result.notes.map(item=>item.id),['new','other']);
  assert.deepEqual(result.processed,['new','other'],'restored source IDs remain processed even if a backup omitted the list');
});

test('restored notes and processed sources stay within their independent limits',()=>{
  const notes=Array.from({length:25},(_,index)=>note('note-'+index,'Detail '+index,`2026-09-${String(index+1).padStart(2,'0')}T00:00:00Z`));
  const processed=Array.from({length:70},(_,index)=>'source-'+index);
  const result=M.normalize({version:1,notes,processed});
  assert.equal(result.notes.length,20);assert.equal(result.notes[0].id,'note-24');assert.equal(result.notes.at(-1).id,'note-5');
  assert.equal(result.processed.length,60);assert.deepEqual(result.processed.slice(0,40),processed.slice(0,40));
  for(const note of result.notes)assert.ok(result.processed.includes(note.sourceId));
});

test('remember stores at most two exact trimmed excerpts with stable source IDs and marks the source complete',()=>{
  const source='My name is Jacob.\nI prefer short answers. I work in a bakery.';
  const result=remember(empty(),'entry-1',source,[' My name is Jacob. ',{text:'I prefer short answers.',extra:'discard'}]);
  assert.deepEqual(result,{version:1,notes:[note('entry-1:0','My name is Jacob.',at,'entry-1'),note('entry-1:1','I prefer short answers.',at,'entry-1')],processed:['entry-1']});
  assert.deepEqual(remember(result,'entry-1',source,['I work in a bakery.']),result,'the same source never runs again');
});

test('invented, altered, oversized and excessive extraction results cannot create remembered facts',()=>{
  const source='I work in a bakery. I prefer short answers.';
  for(const details of [null,{},[],['I work in a hospital.'],['i work in a bakery.'],['I work  in a bakery.'],['x'.repeat(181)],['I work in a bakery.','I prefer short answers.','Another detail'],[null,42]]){
    const result=remember(empty(),'entry-1',source,details);
    assert.deepEqual(result,{version:1,notes:[],processed:['entry-1']},JSON.stringify(details));
  }
  assert.equal(remember(empty(),'entry-1','x'.repeat(180)).notes[0].text.length,180);
});

test('invalid source metadata does not process or change existing memory',()=>{
  const initial=remember(empty(),'first','My name is Jacob.'),before=structuredClone(initial);
  for(const changed of [{sourceId:null},{sourceId:'with spaces'},{sourceId:'entry\n'},{sourceId:'x'.repeat(81)},{sourceText:null},{sourceText:' '},{at:'yesterday'},{at:'2026-02-30T00:00:00Z'}]){
    assert.deepEqual(M.remember(initial,['A new detail'],{sourceId:'next',sourceText:'A new detail',at,...changed}),initial);
  }
  assert.deepEqual(initial,before);
  assert.equal(remember(empty(),'x'.repeat(80),'A valid detail').notes[0].id.length,82);
});

test('remember deduplicates across chats and retains newest facts when the memory is full',()=>{
  let value=empty();
  for(let index=0;index<21;index++)value=remember(value,'entry-'+index,'My detail '+index,undefined,`2026-09-${String(index+1).padStart(2,'0')}T00:00:00Z`);
  assert.equal(value.notes.length,20);assert.equal(value.notes[0].sourceId,'entry-20');assert.equal(value.notes.at(-1).sourceId,'entry-1');
  const duplicate=remember(value,'duplicate','MY DETAIL 20',undefined,'2026-09-27T00:00:00Z');
  assert.equal(duplicate.notes.length,20);assert.equal(duplicate.notes[0].sourceId,'duplicate');
  assert.equal(duplicate.notes.filter(item=>/my detail 20/i.test(item.text)).length,1);assert.equal(duplicate.processed[0],'duplicate');
});

test('forgetting one detail, a whole chat source, or all details keeps processed sources and never mutates the input',()=>{
  const initial=remember(remember(empty(),'first','My name is Jacob. I prefer short answers.',['My name is Jacob.','I prefer short answers.']),'second','I work in a bakery.'),before=structuredClone(initial);
  const one=M.forget(initial,'first:0');assert.deepEqual(one.notes.map(item=>item.id),['second:0','first:1']);assert.deepEqual(one.processed,initial.processed);
  assert.deepEqual(remember(one,'first','My name is Jacob.'),one,'forgotten notes cannot reappear from the same source');
  const source=M.forgetSource(initial,'first');assert.deepEqual(source.notes.map(item=>item.id),['second:0']);assert.deepEqual(source.processed,initial.processed);
  const cleared=M.clear(initial);assert.deepEqual(cleared,{version:1,notes:[],processed:initial.processed});
  assert.deepEqual(remember(cleared,'second','I work in a bakery.'),cleared);
  assert.deepEqual(M.forgetSource(empty(),'previous'),{version:1,notes:[],processed:['previous']});
  assert.deepEqual(M.forget(initial,'missing'),initial);assert.deepEqual(initial,before);
});

test('retained notes stay processed after many empty extractions so Forget and Clear cannot recreate them',()=>{
  let value=remember(empty(),'old','I work in a bakery.');
  for(let index=0;index<70;index++)value=remember(value,'empty-'+index,'No useful detail.',[]);
  assert.equal(value.processed.length,60);assert.equal(value.notes.length,1);assert.ok(value.processed.includes('old'));
  for(const removed of [M.forget(value,'old:0'),M.forgetSource(value,'old'),M.clear(value)])assert.deepEqual(remember(removed,'old','I work in a bakery.'),removed);
});

test('context includes relevant details and explicit communication preferences while excluding unrelated personal facts',()=>{
  const value=memory([note('bakery','I work in a bakery.'),note('sister','My sister is Ana.'),note('short','I prefer short answers.'),note('name','My name is Jacob.'),note('tea','I prefer tea to coffee.'),note('lang','Please reply in Spanish.')]);
  assert.deepEqual(M.context(value,'I am anxious about the bakery.'),['I prefer short answers.','I work in a bakery.','My name is Jacob.','Please reply in Spanish.']);
  assert.deepEqual(M.context(value,'Explain prayer to me.'),['I prefer short answers.','My name is Jacob.','Please reply in Spanish.']);
  assert.deepEqual(M.context(value,'How is Ana?'),['I prefer short answers.','My sister is Ana.','My name is Jacob.','Please reply in Spanish.']);
  for(const text of [undefined,null,{},'',' '])assert.deepEqual(M.context(value,text),[]);
});

test('context ranks meaningful overlap, supports Unicode, and returns at most four excerpts and 720 characters',()=>{
  const value=memory([note('low','I enjoy garden walks.'),note('high','The garden bakery is my workplace.'),note('other','My hobby is knitting.'),note('unicode','My favourite place is 東京.'),note('one','I prefer brief answers.'),note('two','Call me Jacob.'),note('three','I prefer simple explanations.')]);
  assert.deepEqual(M.context(value,'The garden bakery'),['I prefer brief answers.','The garden bakery is my workplace.','I enjoy garden walks.','Call me Jacob.']);
  assert.ok(M.context(value,'東京へ旅行?').length<=4);
  assert.ok(M.context(value,'東京').includes('My favourite place is 東京.'));
  const full=memory(Array.from({length:7},(_,index)=>note('long-'+index,('bakery detail '+index+' ').padEnd(180,'x'))));
  const selected=M.context(full,'bakery');assert.equal(selected.length,4);assert.equal(selected.join('').length,720);
  assert.deepEqual(M.context(memory([note('noise','I feel tired today.')]),'I feel happy today.'),[],'generic feeling and function words do not select an unrelated memory');
});

test('byte size measures the exact normalized UTF-8 record, including Unicode, escapes and processed IDs',()=>{
  const values=[empty(),memory([note('unicode','é 東京 🫏'),note('escaped','A line\nwith "quotes" and \\slashes'),note('surrogate','A lone surrogate \ud800')]),remember(empty(),'none','No retained detail',[])];
  for(const value of values)assert.equal(M.byteSize(value),Buffer.byteLength(JSON.stringify(M.normalize(value)),'utf8'));
  assert.ok(M.byteSize(values[1])>JSON.stringify(M.normalize(values[1])).length);
  assert.equal(M.byteSize({version:999}),Buffer.byteLength(JSON.stringify(empty()),'utf8'));
});
