const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const G=require('../public/guidance.js');
const source=file=>fs.readFileSync(require.resolve('../public/'+file),'utf8');

// A DOM adapter for the production disclosure construction and plan renderer.
// Actual markup is checked separately so it cannot silently add nested controls.
class Element {
  constructor(tag='div',className='',text=''){
    this.tag=tag;this.className=className;this.textContent=text;this.children=[];this.events={};this.attrs={};this.hidden=false;
    this.classList={toggle:(name,on)=>{this.attrs['class:'+name]=on;}};
  }
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
  append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
  insertBefore(node,before){node.remove();const index=this.children.indexOf(before);assert.ok(index>=0);node.parent=this;this.children.splice(index,0,node);}
  replaceChildren(...nodes){for(const child of this.children.slice())child.remove();this.append(...nodes);}
  querySelector(selector){assert.equal(selector,'.recommendation-details');return this.reason;}
  addEventListener(type,fn){this.events[type]=fn;}
  setAttribute(name,value){this.attrs[name]=value;}
  focus(){this.focused=true;}
}

function openStep(guidance='brief'){
  const nodes=new Map(['recommendation','recommendation-empty','recommendation-label','recommendation-title','recommendation-copy','step-setup','step-approach','recommendation-reason','complete-recommendation'].map(id=>[id,new Element()]));
  const rec=nodes.get('recommendation'),why=new Element('div','recommendation-details');
  why.append(nodes.get('recommendation-reason'));rec.reason=why;rec.append(nodes.get('recommendation-label'),nodes.get('recommendation-title'),nodes.get('recommendation-copy'),why,nodes.get('complete-recommendation'));
  const production=source('experience.js'),start=production.indexOf('  const checkInLabels='),end=production.indexOf("  const feedback=el('div','feedback');",start);
  assert.ok(start>=0&&end>start);
  const plan={id:'grow-build',need:'grow',minutes:5,context:{goal:'work',environment:'anywhere',blocker:'none'},title:'One useful step.',copy:'Begin here.',fitReason:'This matches the next move you chose.',setup:'Keep it small.',approach:'A practical suggestion.',evidence:'test',reason:'A reason.',perspective:'A perspective.'};
  let done=false,feedbackPlan;
  const sandbox={
    $:selector=>{const node=nodes.get(selector.slice(1));assert.ok(node,selector);return node;},
    el:(...args)=>new Element(...args),link:(text,href)=>Object.assign(new Element('a','text-link',text),{href}),
    document:{getElementById:id=>{assert.equal(id,'setting-guidance');return {value:guidance};}},
    currentPlan:()=>plan,renderRecommendation(){},haptic(){},isDone:()=>done,
    // The renderer reads the clock to decide whether to show the schedule
    // question. Pinned here so these layout assertions cannot depend on the
    // hour the suite happens to run in.
    rhythm:()=>({ask:false,part:'',quiet:false,note:'',theirs:false}),
    G,
    renderFeedback:p=>{feedbackPlan=p;}
  };
  vm.createContext(sandbox);
  vm.runInContext(production.slice(start,end)+'\nglobalThis.stepApi={rec,tools,alternative,fit,blocker,blockerChoice,leave};',sandbox);
  const renderStart=production.indexOf('  function renderPlan()'),renderEnd=production.indexOf('  const contextPanel=',renderStart);
  assert.ok(renderStart>=0&&renderEnd>renderStart);
  vm.runInContext(production.slice(renderStart,renderEnd)+'\nglobalThis.render=renderPlan;',sandbox);
  return {...sandbox.stepApi,nodes,why,plan,
    render(completed=false){done=completed;sandbox.render();},
    get feedbackPlan(){return feedbackPlan;}
  };
}

test('the general step markup has no repeated Direction eyebrow or nested Why disclosure',()=>{
  const markup=source('index.html').match(/<section\b[^>]*id="direction"[\s\S]*?<\/section>/)?.[0];
  assert.ok(markup,'the general direction panel exists');
  assert.doesNotMatch(markup,/class="[^"]*eyebrow/);
  assert.doesNotMatch(markup,/<details\b/);
  assert.match(markup,/<div class="recommendation-details"><h4>Why this step\?<\/h4>/);
  assert.match(markup,/class="recommendation-label step-meta" id="recommendation-label"/);
  assert.doesNotMatch(markup,/class="[^"]*section-icon/);
  assert.match(markup,/id="recommendation-empty" class="recommendation-empty"><h3>/);
  const initializers=source('app.js');
  assert.doesNotMatch(initializers,/#direction\s+\.section-icon|#direction\s+\.eyebrow|#recommendation-empty\s*>\s*span/,'startup must not target removed decoration');
});

test('one make-this-step-fit disclosure owns the explanation and respects saved guidance depth',()=>{
  for(const [guidance,expected]of [['brief',false],['explained',true]]){
    const app=openStep(guidance);
    assert.equal(app.tools.tag,'details');assert.equal(app.tools.open,expected);
    assert.equal(app.tools.children[0].tag,'summary');assert.equal(app.tools.children[0].textContent,'Make this step fit');
    assert.equal(app.tools.children[1],app.blocker,'the optional obstacle correction stays inside adjustment details');
    assert.equal(app.tools.children[2].className,'step-links');
    assert.equal(app.tools.children[2].children[0].textContent,'Try a different step');
    assert.equal(app.tools.children[2].children.length,3,'check-in stays reachable after a reload');
    assert.equal(app.rec.children.includes(app.blocker),false,'the suggested action is not preceded by another question');
    assert.equal(app.why.parent,app.tools);
    assert.equal(app.tools.children.filter(node=>node.tag==='details').length,0);
    assert.equal(app.rec.children.filter(node=>node.tag==='details').length,1);
    assert.ok(app.rec.children.indexOf(app.nodes.get('complete-recommendation'))<app.rec.children.indexOf(app.tools),'primary completion action precedes optional details');
  }
});

test('rendering completion hides the former working controls and restoring the step brings them back',()=>{
  const app=openStep();
  for(const done of [false,true,false]){
    app.render(done);
    assert.equal(app.nodes.get('complete-recommendation').hidden,done);
    assert.equal(app.tools.hidden,done);
    assert.equal(app.leave.hidden,done);
    assert.equal(app.fit.hidden,done,'completion hides the old fit explanation and undo restores it');
    assert.equal(app.fit.textContent,app.plan.fitReason);
    assert.equal(app.feedbackPlan,app.plan);
    assert.equal(app.nodes.get('recommendation-label').textContent,'5 minutes · Build on what works');
    assert.equal(app.nodes.get('recommendation-title').textContent,app.plan.title);
    assert.equal(app.nodes.get('step-setup').hidden,true,'generic setup stays out of the default step');
    assert.equal(app.nodes.get('recommendation-reason').children[0].textContent,app.plan.reason);
    assert.equal(app.nodes.get('recommendation-reason').children.at(-1).href,'#settings/about');
  }
  app.plan.minutes=1;app.render();
  assert.equal(app.nodes.get('recommendation-label').textContent,'1 minute · Build on what works');
  app.plan.context.environment='busy';app.render();
  assert.equal(app.nodes.get('step-setup').hidden,false,'specific surroundings advice remains available');
});

test('the blocker choice appears only for an unfinished blocked start and the fit remains visible',()=>{
  const app=openStep();
  assert.deepEqual(app.blockerChoice.children.map(option=>option.value),Object.keys(G.choices.blocker));
  assert.equal(app.blockerChoice.attrs['aria-label'],'What is getting in the way of starting?');
  for(const need of ['clarity','grow','energy','rest','connection','calm']){
    app.plan.need=need;app.render();assert.equal(app.blocker.hidden,true,need);
  }
  app.plan.need='progress';app.plan.context.blocker='hesitation';app.render();
  assert.equal(app.blocker.hidden,false);assert.equal(app.blockerChoice.value,'hesitation');
  assert.equal(app.nodes.get('recommendation-label').textContent,'5 minutes · Get past the start');
  assert.equal(app.fit.textContent,app.plan.fitReason);
  assert.equal(app.leave.href,'#home');assert.equal(app.leave.textContent,'Leave this for now');
  app.render(true);assert.equal(app.blocker.hidden,true);
});

test('the step explanation removes stale goal language and reserves decision advice for clarity',()=>{
  const app=openStep();
  app.plan.need='calm';
  app.plan.reason='A suggestion for learning, taking about 5 minutes. You previously marked this useful.';
  app.render();
  assert.equal(app.nodes.get('recommendation-label').textContent,'5 minutes · Find calm');
  assert.equal(app.nodes.get('recommendation-reason').children[0].textContent,'A small suggestion based on your check-in. You previously marked this useful.');
  assert.ok(app.nodes.get('recommendation-reason').children.every(node=>node.textContent!=='A perspective.'));
  app.plan.need='clarity';
  app.render();
  assert.ok(app.nodes.get('recommendation-reason').children.some(node=>node.textContent==='A perspective.'));
});
