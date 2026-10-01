const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {Blob,File}=require('node:buffer');
const model=require('../public/data-tools-model.js');

class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.events={};this.attrs={};this.dataset={};this.className='';this._text='';this.value='';this.disabled=false;this.clicks=0;}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
  setAttribute(name,value){this.attrs[name]=value;if(name==='id')this.id=value;if(name==='class')this.className=value;if(name==='data-entry-action')this.dataset.entryAction=value;}
  addEventListener(name,handler){this.events[name]=handler;}
  closest(selector){if(selector==='[data-entry-action]'&&this.dataset.entryAction)return this;return this.parent?.closest(selector)||null;}
  querySelectorAll(selector){const match=node=>selector[0]==='#'?node.id===selector.slice(1):selector[0]==='.'?node.className.split(/\s+/).includes(selector.slice(1)):node.tag===selector;return this.children.flatMap(child=>[...(match(child)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
  set innerHTML(html){
    this.children=[];const stack=[this];
    for(const token of html.match(/<\/?[^>]+>|[^<]+/g)||[]){
      if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
      if(token.startsWith('<')){
        const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
        const element=new Element(tag);
        for(const attr of token.matchAll(/([\w-]+)="([^"]*)"/g))element.setAttribute(attr[1],attr[2]);
        stack.at(-1).append(element);if(!['input','img','br','hr'].includes(tag))stack.push(element);
      }else stack.at(-1)._text+=token;
    }
  }
  click(){this.clicks++;this.events.click?.({target:this});}
  focus(){this.focused=true;}
  select(){this.selected=true;}
}

const saved=note=>JSON.stringify({days:{'2026-09-25':{mind:note,reflection:'Keep this reflection',tasks:[]}},profile:{goal:'faith'}});
const backup=values=>JSON.stringify({format:'steady-backup',version:1,createdAt:'2026-09-25T12:00:00.000Z',values});
const imported=()=>backup({'steady.v1':saved('A restored note'),'steady.theme':'dark'});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

function openTools(options={}){
  const body=new Element('body'),container=new Element('section');container.id='privacy-preferences';body.append(container);
  const initial={'steady.v1':saved('An existing private note'),'steady.settings':'{"font":"serif"}','steadyTasks':'[{"text":"Legacy task"}]',other:'Unrelated storage',...(options.initial||{})};
  const values=new Map(Object.entries(initial)),writes=[],reads=[],confirmations=[],events=[],downloads=[],exports=[],timers=[];
  const native=options.native?{}:null;let saves=0,reloads=0,flushes=0,imports=0;
  if(native){
    native.flushStorage=()=>{flushes++;events.push('flush');return options.flush?options.flush(flushes):Promise.resolve();};
    native.exportBackup=text=>{exports.push(text);events.push('export');return options.export?options.export(text):Promise.resolve();};
    native.importBackup=()=>{imports++;return options.import?options.import():Promise.resolve();};
  }
  const window={SteadyDataModel:model,confirm(message){confirmations.push(message);return typeof options.confirm==='function'?options.confirm(message,values):options.confirm!==false;}};
  if(native)window.SteadyNative=native;
  if(options.expo)window.ReactNativeWebView={};
  const navigator=options.share?{canShare:()=>true,share:options.share}:{};
  const document={body,getElementById:id=>body.querySelector('#'+id),createElement(tag){const element=new Element(tag);if(tag==='a')element.click=()=>{downloads.push({url:element.href,name:element.download});};return element;}};
  const sandbox={window,document,navigator,Blob,File,
    URL:{createObjectURL:()=>{events.push('download-url');return 'blob:steady-test';},revokeObjectURL:url=>events.push('revoke:'+url)},
    location:{reload(){reloads++;events.push('reload');}},
    localStorage:{getItem(key){reads.push(key);if(options.failRead)throw Error('Device storage cannot be read.');return values.get(key)??null;},setItem(key,value){writes.push(['set',key,value]);values.set(key,value);},removeItem(key){writes.push(['remove',key]);values.delete(key);}},
    save(){saves++;events.push('save');return options.saveResult!==false;},setTimeout(callback,delay){timers.push({callback,delay});}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/data-tools.js'),'utf8'),sandbox);
  const tools=container.querySelector('details'),status=tools.querySelector('#entry-tools-status'),fileInput=tools.querySelector('input');
  return {values,writes,reads,confirmations,events,exports,downloads,timers,tools,status,fileInput,window,
    click(action){const button=tools.querySelectorAll('button').find(node=>node.dataset.entryAction===action);assert.ok(button);return tools.events.click({target:button});},
    receive:text=>window.SteadyData.receiveImport(text),
    chooseFile(file){fileInput.files=file?[file]:[];fileInput.value='selected';return fileInput.events.change();},
    get saves(){return saves;},get reloads(){return reloads;},get flushes(){return flushes;},get imports(){return imports;}
  };
}

test('cancelling restore, deletion or file selection writes nothing and never reloads',async()=>{
  for(const action of ['restore','erase']){
    const app=openTools({native:true,confirm:false}),before=[...app.values];
    if(action==='restore')await app.receive(imported());else await app.click('erase');
    assert.deepEqual([...app.values],before);assert.deepEqual(app.writes,[]);
    assert.equal(app.confirmations.length,1);assert.equal(app.flushes,0);assert.equal(app.reloads,0);
    assert.ok(app.tools.querySelectorAll('button').every(button=>!button.disabled));
  }
  const app=openTools();await app.chooseFile(null);
  assert.deepEqual(app.writes,[]);assert.equal(app.confirmations.length,0);assert.equal(app.reloads,0);
});

test('invalid, unsupported, unsafe and oversized files never reach confirmation or mutate saved entries',async()=>{
  for(const text of ['not JSON','{}',backup({other:'not allowed'}),backup({'steady.v1':'{"days":{},"__proto__":{}}'}),backup({'steady.v1':'{"days":[]}'})]){
    const app=openTools(),before=[...app.values];
    await app.chooseFile({size:text.length,text:async()=>text});
    assert.deepEqual([...app.values],before);assert.deepEqual(app.writes,[]);
    assert.equal(app.confirmations.length,0);assert.equal(app.reloads,0);
    assert.ok(app.status.textContent.length>0);assert.equal(app.fileInput.value,'');
  }
  const oversized=openTools();let read=false;
  await oversized.chooseFile({size:model.maxBytes+1,text:async()=>{read=true;return imported();}});
  assert.equal(read,false,'large files are rejected before reading');assert.deepEqual(oversized.writes,[]);
  assert.match(oversized.status.textContent,new RegExp('smaller than '+model.maxBytes/(1024*1024)+' MB'));
  const unreadable=openTools();await unreadable.chooseFile({size:10,text:async()=>{throw Error('File unavailable');}});
  assert.deepEqual(unreadable.writes,[]);assert.match(unreadable.status.textContent,/entries were not changed/);
});

test('native restore waits for durable storage before reload and ignores competing actions while saving',async()=>{
  const flush=deferred(),app=openTools({native:true,flush:()=>flush.promise});
  const restoring=app.receive(imported());
  assert.equal(app.values.get('steady.v1'),saved('A restored note'));
  assert.equal(app.values.get('steady.theme'),'dark');assert.equal(app.values.get('steadyTasks'),undefined);
  assert.equal(app.values.get('other'),'Unrelated storage');
  assert.equal(app.flushes,1);assert.equal(app.reloads,0);
  assert.ok(app.tools.querySelectorAll('button').every(button=>button.disabled));
  const writes=app.writes.length;
  await app.click('erase');await app.receive(backup({'steady.v1':saved('Must not replace the active import')}));
  assert.equal(app.writes.length,writes);assert.equal(app.confirmations.length,1);
  flush.resolve();await restoring;
  assert.equal(app.reloads,1);assert.deepEqual(app.events,['flush','reload']);
});

test('a failed native flush restores the previous data durably instead of reloading changed entries',async()=>{
  for(const action of ['restore','erase']){
    const first=deferred(),app=openTools({native:true,flush:call=>call===1?first.promise:Promise.resolve()}),before=[...app.values].sort();
    const changing=action==='restore'?app.receive(imported()):app.click('erase');
    assert.equal(app.flushes,1);assert.equal(app.reloads,0);
    first.reject(Error('Native save failed'));await changing;
    assert.equal(app.flushes,2,'rollback is also flushed before claiming recovery');
    assert.deepEqual([...app.values].sort(),before);assert.equal(app.reloads,0);
    assert.match(app.status.textContent,/previous data was restored/i);
    assert.ok(app.tools.querySelectorAll('button').every(button=>!button.disabled));
  }
});

test('failed durable rollback reports uncertainty without claiming that data was unchanged',async()=>{
  const app=openTools({native:true,flush:()=>Promise.reject(Error('Storage remains unavailable'))});
  await app.receive(imported());
  assert.equal(app.reloads,0);
  assert.match(app.status.textContent,/some data may have changed|could not confirm|may be incomplete/i);
  assert.doesNotMatch(app.status.textContent,/previous data was restored|entries were not changed/i);
  assert.match(app.status.textContent,/backup|editing/i);
});

test('a failed native import never rolls back over data changed while its save was pending',async()=>{
  const flush=deferred(),app=openTools({native:true,flush:()=>flush.promise});
  const restoring=app.receive(imported()),newer=saved('A newer independent change');
  app.values.set('steady.v1',newer);
  flush.reject(Error('Native save failed'));await restoring;
  assert.equal(app.values.get('steady.v1'),newer);
  assert.equal(app.reloads,0);assert.equal(app.flushes,1,'a rejected rollback must not persist over newer data');
  assert.match(app.status.textContent,/Some data may have changed/);
});

test('native export waits for flush and share preparation, and rejected operations do not claim backup success',async()=>{
  const flushed=deferred(),shared=deferred(),app=openTools({native:true,flush:()=>flushed.promise,export:()=>shared.promise});
  const exporting=app.click('export');
  assert.equal(app.exports.length,0);assert.equal(app.saves,1);assert.equal(app.flushes,1);
  flushed.resolve();await new Promise(setImmediate);
  assert.equal(app.exports.length,1);
  assert.doesNotMatch(app.status.textContent,/saved|shared|Choose where/i,'a pending native share is not reported as ready');
  shared.resolve();await exporting;
  assert.match(app.status.textContent,/Choose where|save|share/i);
  assert.doesNotMatch(app.status.textContent,/Backup saved|Backup shared/i,'opening the share sheet does not prove a file was saved');

  const rejected=openTools({native:true,export:()=>Promise.reject(Error('Could not open sharing.'))});
  await rejected.click('export');
  assert.match(rejected.status.textContent,/Could not open sharing/);
  assert.doesNotMatch(rejected.status.textContent,/Backup saved|Backup shared|Choose where/i);
  assert.equal(rejected.reloads,0);
  const picker=openTools({native:true,import:()=>Promise.reject(Error('Could not open the file picker.'))});
  await picker.click('import');
  assert.match(picker.status.textContent,/Could not open the file picker/);
  assert.deepEqual(picker.writes,[]);assert.equal(picker.reloads,0);
});

test('blocked saving or failed native flush cannot produce or announce a partial backup',async()=>{
  const app=openTools({native:true,saveResult:false});
  await app.click('export');
  assert.equal(app.exports.length,0);assert.equal(app.flushes,0);assert.deepEqual(app.downloads,[]);
  assert.match(app.status.textContent,/latest changes could not be saved/i);
  const failed=openTools({native:true,flush:()=>Promise.reject(Error('Device copy could not be saved.'))});
  await failed.click('export');
  assert.equal(failed.exports.length,0);assert.equal(failed.reloads,0);
  assert.match(failed.status.textContent,/could not be saved/i);
  assert.doesNotMatch(failed.status.textContent,/Backup saved|Backup shared|Choose where/i);
});

test('an oversized UTF-8 export is stopped before native sharing instead of producing an unrestorable file',async()=>{
  const app=openTools({native:true,initial:{'steady.v1':saved('é'.repeat(model.maxBytes/2))}}),original=app.values.get('steady.v1');
  await app.click('export');
  assert.match(app.status.textContent,/exceeds.*limit/i);
  assert.equal(app.exports.length,0);assert.equal(app.flushes,0);assert.equal(app.reloads,0);
  assert.equal(app.values.get('steady.v1'),original);
  assert.doesNotMatch(app.status.textContent,/Backup saved|Backup shared|Choose where/i);
});

test('cancelled sharing clears stale success and ordinary downloads promise only a request, not a saved file',async()=>{
  const app=openTools({share:async()=>{const error=Error('Cancelled');error.name='AbortError';throw error;}});
  app.status.textContent='Backup shared. Keep your copy safe.';
  await app.click('export');
  assert.doesNotMatch(app.status.textContent,/Backup shared|Backup saved/i);
  assert.deepEqual(app.downloads,[]);assert.equal(app.reloads,0);
  const browser=openTools();await browser.click('export');
  assert.equal(browser.downloads.length,1);assert.match(browser.downloads[0].name,/^steady-backup-.*\.json$/);
  assert.match(browser.status.textContent,/requested/);assert.match(browser.status.textContent,/Check that the file was saved/);
  assert.equal(browser.timers.length,1);assert.equal(browser.reloads,0);
});

test('Expo’s manual backup is literal selectable data, not markup or a claimed download',async()=>{
  const note='</textarea><img src=x onerror=alert(1)>',app=openTools({expo:true,initial:{'steady.v1':saved(note)}});
  await app.click('export');
  const copy=app.tools.querySelector('.backup-copy');
  assert.ok(copy);assert.equal(copy.readOnly,true);assert.equal(copy.focused,true);assert.equal(copy.selected,true);
  assert.equal(copy.children.length,0);assert.equal(JSON.parse(copy.value).values['steady.v1'],saved(note));
  assert.match(app.status.textContent,/Copy all this text/);assert.deepEqual(app.downloads,[]);
  assert.equal(app.reloads,0);
});
