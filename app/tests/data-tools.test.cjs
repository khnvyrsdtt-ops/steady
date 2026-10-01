const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../public/data-tools-model.js');
function store(initial={}) {
  const values=new Map(Object.entries(initial));let writes=0,failAt=0,failReads=false;
  return {values,get writes(){return writes;},failAt(value){failAt=value;},failReads(value){failReads=value;},
    getItem(key){if(failReads)throw Error('read failed');return values.get(key)??null;},
    setItem(key,value){if(++writes===failAt)throw Error('write failed');values.set(key,value);},
    removeItem(key){if(++writes===failAt)throw Error('delete failed');values.delete(key);}};
}
const entry=JSON.stringify({days:{'2026-09-25':{mind:'A private note',reflection:'Keep this',tasks:[]}},savedPassages:['foundation']});
test('backup round trips current entries and preferences without touching unrelated storage',()=>{
  const s=store({'steady.v1':entry,'steady.settings':'{"font":"serif"}','steady.reading':'{"size":"large"}','steady.theme':'dark','steadyTasks':'[]','steadyReflection':'old note','steady.reminded':'2026-09-24',other:'not ours'});
  const values=model.parse(model.backup(s,new Date('2026-09-25T10:00:00Z')));
  assert.equal(values['steady.v1'],entry);assert.equal(values.other,undefined);assert.equal(s.writes,0);
  const target=store({other:'keep'});model.replace(target,values);
  for(const key of model.keys)assert.equal(target.getItem(key),s.getItem(key));
  assert.equal(target.getItem('other'),'keep');
});
test('deletion removes exact known keys including legacy migration inputs, not arbitrary prefixes',()=>{
  const s=store(Object.fromEntries([...model.keys.map(key=>[key,'old']),['steady.some-other-project','keep'],['other','keep']]));
  model.replace(s,{},model.snapshot(s));
  for(const key of model.keys)assert.equal(s.getItem(key),null);
  assert.equal(s.getItem('steady.some-other-project'),'keep');assert.equal(s.getItem('other'),'keep');
});
test('unreadable storage prevents destructive changes and partial backups',()=>{
  const s=store({'steady.v1':entry});s.failReads(true);
  assert.throws(()=>model.backup(s),/read failed/);assert.throws(()=>model.replace(s,{}),/read failed/);
  assert.equal(s.writes,0);assert.equal(s.values.get('steady.v1'),entry);
});
test('changed storage stops a stale restore or delete',()=>{
  const s=store({'steady.v1':entry});const before=model.snapshot(s);s.setItem('steady.theme','dark');
  const count=s.writes;assert.throws(()=>model.replace(s,{},before),/changed while this was open/);
  assert.equal(s.writes,count);assert.equal(s.getItem('steady.v1'),entry);
});
test('a failed restore or deletion rolls back all keys to their exact previous state',()=>{
  for(const values of [{},{'steady.v1':JSON.stringify({days:{}}),'steady.theme':'light'}]) {
    const s=store({'steady.v1':entry,'steady.theme':'dark',other:'keep'});const before=[...s.values];s.failAt(3);
    assert.throws(()=>model.replace(s,values),/previous data was restored/);
    assert.deepEqual([...s.values].sort(),before.sort());
  }
});
test('invalid, unknown, oversized and prototype-bearing files cannot be imported',()=>{
  const make=values=>JSON.stringify({format:'steady-backup',version:1,values});
  for(const text of ['bad','{}',make({}),make({other:'value'}),make({'steady.v1':'[]'}),make({'steady.v1':'{"days":[]}'}),make({'steady.settings':'null'}),make({'steadyTasks':'{}'}),make({'steady.theme':'other'}),make({'steady.v1':'{"days":{},"__proto__":{}}'}),'x'.repeat(model.maxBytes+1)])assert.throws(()=>model.parse(text));
});
test('export retains unreadable raw values for recovery without claiming they are importable',()=>{
  const s=store({'steady.v1':'corrupt'});const text=model.backup(s);
  assert.equal(JSON.parse(text).values['steady.v1'],'corrupt');assert.throws(()=>model.parse(text),/unreadable saved data/);
});
test('backup and import use the same UTF-8 byte limit, including non-ASCII notes',()=>{
  const text='€'.repeat(Math.ceil(model.maxBytes/3));
  const s=store({'steadyReflection':text});
  assert.throws(()=>model.backup(s),/12 MB limit/);
  assert.throws(()=>model.parse(JSON.stringify({format:'steady-backup',version:1,values:{'steadyReflection':text}})),/12 MB/);
  assert.equal(s.writes,0);
});
