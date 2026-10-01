const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

test('daily adjustments no longer expose tone and preserve hidden legacy context when saving',()=>{
  const source=read('experience.js');
  assert.match(source,/\['energy','environment'\]\.map/);
  assert.doesNotMatch(source,/Energy, surroundings & approach|\['energy','environment','approach'\]/);
  const start=source.indexOf("  contextPanel.querySelector('form').addEventListener('submit'");
  const end=source.indexOf('\n',start);
  let submit;
  const state={profile:{goal:'faith',approach:'practical',legacy:'keep'}};
  const day={need:'progress',context:{goal:'faith',approach:'gentle',time:'10',energy:'low',environment:'busy',legacy:'keep'},mind:'Keep this note'};
  const controls=Object.entries({goal:'work',time:'2',energy:'steady',environment:'quiet'}).map(([key,value])=>({dataset:{context:key},value}));
  const sandbox={state,day,profile:()=>state.profile,contextDraft:{time:'2'},checkDay(){},save:()=>true,currentPlan:()=>({id:'progress-start'}),navigateScreen(){},
    contextPanel:{querySelector:()=>({addEventListener:(_,handler)=>submit=handler}),querySelectorAll:()=>controls}};
  vm.runInNewContext(source.slice(start,end),sandbox);
  submit({preventDefault(){}});
  assert.deepEqual({...state.profile},{goal:'work',approach:'practical',legacy:'keep'});
  assert.deepEqual({...day.context},{approach:'gentle',time:'2',energy:'steady',environment:'quiet',legacy:'keep'});
  assert.equal(day.mind,'Keep this note');
});
