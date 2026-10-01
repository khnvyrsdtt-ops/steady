const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const physics=require('../public/rain-physics.js');
const rain=require('../public/rainbow-rain.js');

test('rain keeps its bounded count and saturated colours, with layered depth and a calmer fall',()=>{
  for(const [width,height] of [[1,1],[393,852],[1024,1366],[4096,4096]]){
    const drops=rain.createDrops(width,height);
    assert.ok(drops.length>=52&&drops.length<=160);
    assert.equal(new Set(drops.map(drop=>drop.colour)).size,7);
    for(const drop of drops){
      assert.ok(drop.lane>=0&&drop.lane<1);
      assert.ok(drop.speed>=15&&drop.speed<22);
      assert.ok(drop.size>=0.9&&drop.size<1.8);
      assert.ok(drop.length>=16&&drop.length<30);
      const rgb=drop.colour.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16));
      assert.ok(Math.max(...rgb)>=210&&Math.max(...rgb)-Math.min(...rgb)>=100,'the rain keeps distinct saturated colours');
      assert.ok(Number.isFinite(drop.offset));
    }
    assert.ok(new Set(drops.map(drop=>drop.size)).size>40,'depth is varied rather than four repeated stroke weights');
    for(const colour of new Set(drops.map(drop=>drop.colour))){
      const speeds=drops.filter(drop=>drop.colour===colour).map(drop=>drop.speed);
      assert.ok(Math.max(...speeds)-Math.min(...speeds)>4,'colour does not dictate falling speed');
    }
  }
});

test('fall distance stays bounded after suspension and a negative time delta cannot move rain backwards',()=>{
  const drop={...rain.createDrops(393,852)[0],y:100};
  rain.advanceAll([drop],3600,393,852,null);
  assert.ok(drop.y>100&&drop.y<=101.25,'returning after an hour advances at most one small frame');
  const current=drop.y;
  rain.advanceAll([drop],-10,393,852,null);
  assert.equal(drop.y,current);
});

function fallingDrop(overrides={}){
  return {...rain.createDrops(400,852)[0],lane:0.5,y:63.9,speed:15,side:1,offset:0,...overrides,trail:[]};
}

test('touch flow and release stay close to normal fall speed at different frame rates and hold durations',()=>{
  const touch={x:200,y:100,strength:1,holding:true};
  for(const dt of [1/120,1/60,0.05])for(const speed of [15,24.6])for(const side of [-1,1])for(const startY of [63.9,100])for(const holdSeconds of [0.5,8]){
    const drop=fallingDrop({y:startY,speed,side});
    const step=currentTouch=>{
      const before={x:drop.lane*400+drop.offset,y:drop.y};
      rain.advanceAll([drop],dt,400,852,currentTouch);
      const distance=Math.hypot(drop.lane*400+drop.offset-before.x,drop.y-before.y);
      assert.ok(distance<=speed*dt*1.05+0.00001,
        `water accelerated during ${currentTouch?'touch':'release'}: ${distance/dt} px/s versus ${speed} px/s`);
      assert.ok(Number.isFinite(drop.offset)&&Number.isFinite(drop.y));
    };
    for(let elapsed=0;elapsed<holdSeconds;elapsed+=dt)step(touch);
    for(let elapsed=0;elapsed<2;elapsed+=dt)step(null);
    assert.ok(drop.y>startY);
  }
});

test('rendered trail follows its curved history and stays within the drop length',()=>{
  const drop={...fallingDrop({y:300,offset:10}),trail:[{x:210,y:300},{x:205,y:290},{x:200,y:280},{x:200,y:200}]};
  const points=rain.streakPoints(drop,400);
  const length=points.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point.x-points[index].x,point.y-points[index].y),0);
  assert.ok(length<=drop.length+0.0001);
  assert.deepEqual(points.at(-1),{x:210,y:300});
  assert.ok(points.length>2);
});

test('the full padded logo region is clear with a smooth feather into the surrounding rain',()=>{
  const zone={left:70,right:170,top:60,bottom:200,feather:22};
  for(const x of [70,90,120,170])for(const y of [60,100,200]){
    assert.equal(rain.clearSpaceAlpha(x,y,[zone]),0);
  }
  assert.equal(rain.clearSpaceAlpha(181,120,[zone]),0.5);
  assert.equal(rain.clearSpaceAlpha(192,120,[zone]),1);
  assert.equal(rain.clearSpaceAlpha(240,260,[zone]),1);
  assert.equal(rain.clearSpaceAlpha(120,120,[]),1);
  assert.equal(rain.clearSpaceAlpha(180,120,[zone,{left:175,right:190,top:100,bottom:130,feather:14}]),0);
});

test('a whole rounded streak clears a protected area even when its head is outside it',()=>{
  const zone={left:70,right:170,top:60,bottom:200,feather:22};
  assert.equal(rain.clearSpaceAlpha(120,215,[zone],30,1),0,'a tail crossing the lower edge is fully hidden');
  assert.equal(rain.clearSpaceAlpha(120,55,[zone],30,6),0,'a rounded head reaching the upper edge is hidden');
  assert.equal(rain.clearSpaceAlpha(69,120,[zone],30,2),0,'stroke width cannot bleed through the left edge');
  assert.equal(rain.clearSpaceAlpha(172,120,[zone],30,2),0,'stroke width cannot bleed through the right edge');
  assert.equal(rain.clearSpaceAlpha(120,234,[zone],22,1),0.5,'the feather starts beyond the whole stroke');
  assert.equal(rain.clearSpaceAlpha(120,245,[zone],22,1),1,'a completely clear stroke returns to full opacity');
});

test('a curved streak crossing a protected area stays hidden even with both endpoints outside',()=>{
  const zone={left:70,right:170,top:60,bottom:200,feather:22};
  assert.equal(rain.pathAlpha([{x:60,y:120},{x:180,y:120}],[zone],1),0);
  assert.equal(rain.pathAlpha([{x:120,y:40},{x:120,y:220}],[zone],1),0);
  assert.equal(rain.pathAlpha([{x:50,y:40},{x:120,y:120},{x:190,y:220}],[zone],1),0);
  assert.equal(rain.pathAlpha([{x:69,y:100},{x:69,y:130}],[zone],2),0,'rounded stroke width is protected');
  assert.equal(rain.pathAlpha([{x:195,y:80},{x:200,y:130},{x:195,y:180}],[zone],1),1);
});

class EventTargetStub{
  constructor(){this.listeners=new Map();}
  addEventListener(name,callback,options){
    if(!this.listeners.has(name))this.listeners.set(name,[]);
    this.listeners.get(name).push({callback,options});
  }
  removeEventListener(name,callback){this.listeners.set(name,(this.listeners.get(name)||[]).filter(item=>item.callback!==callback));}
  emit(name,event={}){for(const {callback}of [...(this.listeners.get(name)||[])])callback(event);}
}

function openRain({enabled=false,motion='system',reduced=false,native=false,extraProtected=[],onPhysicsStep=null}={}){
  const source=fs.readFileSync(require.resolve('../public/rainbow-rain.js'),'utf8');
  const document=new EventTargetStub(),window=new EventTargetStub(),media=new EventTargetStub();
  const root={dataset:{rainbowRain:enabled?'on':'off',motion,theme:'dark',nativeComposer:native?'true':'false',nativeHeader:native?'true':'false',keyboardOpen:'false'}},classes=new Set(['chat-screen']);
  const rect={left:16,top:0,right:377,bottom:852,width:361,height:852};
  const form={getBoundingClientRect:()=>rect};
  const scroll={getBoundingClientRect:()=>rect};
  const logo={getBoundingClientRect:()=>({left:175,right:229,top:120,bottom:198,width:54,height:78}),closest:()=>null,classList:{contains:name=>name==='steady-presence'}};
  const panel=new EventTargetStub();
  let canvasCount=0,now=0,nextFrame=0,draws=0;
  const frames=new Map(),cancelled=[],mutations=[],resizes=[],canvases=[],streaks=[],fills=[];
  Object.assign(panel,{hidden:false,getBoundingClientRect:()=>rect,querySelector:selector=>selector==='#feelings-form'?form:selector==='.chat-scroll'?scroll:null,querySelectorAll:()=>[logo,...extraProtected],prepend:canvas=>{canvasCount++;canvases.push(canvas);},closest:()=>null});
  let currentPath=[];
  const context={setTransform(){},clearRect(){streaks.length=0;fills.length=0;},save(){},restore(){},rect(){},clip(){},globalAlpha:1,lineCap:'butt',lineWidth:1,
    beginPath(){currentPath=[];},moveTo(x,y){currentPath.push({x,y});},lineTo(x,y){currentPath.push({x,y});},
    createLinearGradient(x0,y0,x1,y1){return {x0,y0,x1,y1,stops:[],addColorStop(offset,colour){this.stops.push({offset,colour});}};},
    stroke(){draws++;streaks.push({path:[...currentPath],width:this.lineWidth,lineCap:this.lineCap,gradient:this.strokeStyle,alpha:this.globalAlpha});},
    fill(){draws++;fills.push({path:[...currentPath],gradient:this.fillStyle,alpha:this.globalAlpha});}
  };
  Object.assign(document,{readyState:'loading',hidden:false,documentElement:root,body:{classList:{contains:name=>classes.has(name)}},querySelector:selector=>selector==='.feelings-panel'?panel:selector==='.chat-scroll'?scroll:null,querySelectorAll:()=>[],
    createElement(name){assert.equal(name,'canvas');return {className:'',hidden:false,setAttribute(){},getContext:()=>context,remove(){this.removed=true;}};}});
  media.matches=reduced;
  const getComputedStyle=()=>({scrollPaddingTop:'90px',scrollPaddingBottom:'84px',getPropertyValue:()=>''});
  Object.assign(window,{devicePixelRatio:3,innerHeight:852,innerWidth:393,matchMedia:()=>media,getComputedStyle,performance:{now:()=>now},visualViewport:new EventTargetStub(),
    requestAnimationFrame(callback){const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame(id){cancelled.push(id);frames.delete(id);}});
  const observedPhysics=onPhysicsStep?{...physics,advanceAll(...args){physics.advanceAll(...args);onPhysicsStep(now,...args);}}:physics;
  const sandbox={document,window,module:{exports:{}},SteadyRainPhysics:observedPhysics,getComputedStyle,
    MutationObserver:class{constructor(callback){this.callback=callback;mutations.push(this);}observe(){}disconnect(){this.disconnected=true;}},
    ResizeObserver:class{constructor(callback){this.callback=callback;resizes.push(this);}observe(){}disconnect(){this.disconnected=true;}}
  };
  vm.runInNewContext(source,sandbox);
  const instance=sandbox.module.exports.init();
  return {document,window,media,root,classes,panel,frames,cancelled,mutations,resizes,canvases,instance,streaks,fills,
    get canvasCount(){return canvasCount;},get draws(){return draws;},
    flush(timestamp=now+16){now=timestamp;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(now));},
    toggle(on){root.dataset.rainbowRain=on?'on':'off';window.emit('steady:rainbow-rain-setting',{detail:{enabled:on}});}
  };
}

test('default-off starts no canvas or animation; enabling and re-enabling reuses one decorative layer',()=>{
  const app=openRain();
  assert.equal(app.canvasCount,0);assert.equal(app.frames.size,0);
  app.toggle(true);assert.equal(app.canvasCount,1);assert.equal(app.frames.size,1);
  app.flush();assert.ok(app.draws>0);assert.equal(app.frames.size,1);
  app.toggle(false);assert.equal(app.frames.size,0);assert.equal(app.canvases[0].hidden,true);
  app.toggle(true);assert.equal(app.canvasCount,1);assert.equal(app.canvases[0].hidden,false);
  app.instance.destroy();assert.equal(app.frames.size,0);assert.equal(app.canvases[0].removed,true);
});

test('motion off or system reduced motion renders a still theme without an ongoing animation loop',()=>{
  for(const options of [{motion:'off'},{reduced:true}]){
    const app=openRain({enabled:true,...options});
    app.flush();assert.ok(app.draws>0);assert.equal(app.frames.size,0);
    app.instance.destroy();
  }
  const app=openRain({enabled:true});app.flush();
  app.root.dataset.motion='off';app.mutations[0].callback([]);
  app.flush();assert.equal(app.frames.size,0);
  app.root.dataset.motion='system';app.mutations[0].callback([]);
  app.flush();assert.equal(app.frames.size,1);
  app.instance.destroy();
});

test('paint stays clear of the logo and native header/composer without touching foreground geometry',()=>{
  const app=openRain({enabled:true,native:true});
  const bounds=app.panel.getBoundingClientRect();
  app.flush();
  assert.ok(app.streaks.length>0);
  for(const streak of app.streaks){
    const radius=streak.width/2;
    const left=Math.min(...streak.path.map(point=>point.x))-radius;
    const right=Math.max(...streak.path.map(point=>point.x))+radius;
    const top=Math.min(...streak.path.map(point=>point.y))-radius;
    const bottom=Math.max(...streak.path.map(point=>point.y))+radius;
    assert.ok(top>138&&bottom<768,'the full rounded stroke stays clear of native header and composer');
    assert.ok(right<147||left>225||bottom<108||top>210,'the full stroke stays outside the padded logo');
    assert.equal(streak.lineCap,'round');
    assert.equal(streak.path.length,2,'each drop is a continuous stroke');
    assert.ok(streak.gradient.stops.length>=2,'a continuous colour fade replaces separated pixels');
  }
  assert.equal(app.panel.getBoundingClientRect(),bounds);
  assert.equal(app.canvases[0].width,722,'backing resolution is capped at 2x');
  app.instance.destroy();
});

test('holding curves only existing rain, adds no outline or fill, and release returns it to falling',()=>{
  const app=openRain({enabled:true});app.flush(16);
  const event={pointerId:1,isPrimary:true,button:0,clientX:16+361*0.13,clientY:230,target:{closest:()=>null}};
  const drops=rain.createDrops(361,852),colours=new Set(drops.map(drop=>drop.colour));
  const span=streak=>Math.max(...streak.path.map(point=>point.x))-Math.min(...streak.path.map(point=>point.x));
  function checkOnlyRain(){
    assert.equal(app.fills.length,0,'a hold must not add a filled pool');
    assert.ok(app.streaks.length<=drops.length,'no synthetic outline is added to the rain');
    for(const streak of app.streaks){
      assert.equal(streak.gradient.stops.length,3,'every rendered stroke keeps a drop gradient');
      assert.ok(colours.has(streak.gradient.stops.at(-1).colour));
      assert.ok(streak.width>=0.9&&streak.width<1.8);
      const length=streak.path.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point.x-streak.path[index].x,point.y-streak.path[index].y),0);
      assert.ok(length<=34.000001,'a separate long arc cannot appear');
    }
  }
  checkOnlyRain();
  app.panel.emit('pointerdown',event);app.flush(200);
  let now=250,sawCurve=false;
  while(now<6000){
    app.flush(now);checkOnlyRain();
    sawCurve ||= app.streaks.some(streak=>streak.path.length>2&&span(streak)>3);
    now+=50;
  }
  assert.equal(sawCurve,true,'actual falling streaks curve around the held finger');
  app.window.emit('pointerup',event);
  const releasedAt=now;
  while(now<releasedAt+8000){app.flush(now);checkOnlyRain();now+=50;}
  assert.ok(app.streaks.length>0);
  assert.ok(app.streaks.every(streak=>streak.path.at(-1).y>streak.path[0].y),'released water resumes falling, including the normal sideways air drift');
  assert.equal(app.frames.size,1);
  app.instance.destroy();
});

test('pressing over a visible drop bends the rain instead of fading or removing streaks',()=>{
  const free=openRain({enabled:true}),held=openRain({enabled:true});
  free.flush(16);held.flush(16);
  const event={pointerId:1,isPrimary:true,button:0,clientX:16+361*0.13+12,clientY:168.48,target:{closest:()=>null}};
  held.panel.emit('pointerdown',event);
  // At the first held frame touch strength is rising, before collision changes
  // the geometry. Any difference here would be a proximity-opacity effect.
  free.flush(130);held.flush(130);
  assert.equal(held.streaks.length,free.streaks.length,'a held finger does not remove visible streaks');
  const totalOpacity=app=>app.streaks.reduce((sum,streak)=>sum+streak.alpha,0);
  assert.ok(Math.abs(totalOpacity(held)-totalOpacity(free))<0.000001,'pressing alone does not dim the rain');
  let curved=false;
  for(let now=146;now<=700;now+=16){
    held.flush(now);
    curved ||= held.streaks.some(streak=>Math.max(...streak.path.map(point=>point.x))-Math.min(...streak.path.map(point=>point.x))>3);
  }
  assert.equal(curved,true,'the response comes from an actual curved water path');
  free.instance.destroy();held.instance.destroy();
});

test('backgrounding or leaving chat cancels animation and returning starts it again',()=>{
  const app=openRain({enabled:true});app.flush();
  app.document.hidden=true;app.document.emit('visibilitychange');
  assert.equal(app.frames.size,0);assert.equal(app.canvases[0].hidden,true);
  app.document.hidden=false;app.document.emit('visibilitychange');
  app.flush(1000000);assert.equal(app.frames.size,1);assert.equal(app.canvases[0].hidden,false);
  app.classes.delete('chat-screen');app.panel.hidden=true;app.document.emit('steady:screen',{detail:'settings'});
  assert.equal(app.frames.size,0);assert.equal(app.canvases[0].hidden,true);
  app.classes.add('chat-screen');app.panel.hidden=false;app.document.emit('steady:screen',{detail:'today/feelings'});
  assert.equal(app.frames.size,1);assert.equal(app.canvasCount,1);
  app.instance.destroy();
});

test('finger feedback observes passively and leaves native taps and scrolling uncaptured',()=>{
  const app=openRain({enabled:true});app.flush();
  const event={pointerId:1,isPrimary:true,button:0,clientX:350,clientY:600,target:{closest:()=>null},
    preventDefault(){assert.fail('decorative rain must not cancel gestures');},
    stopPropagation(){assert.fail('decorative rain must not hide gestures from controls');},
    setPointerCapture(){assert.fail('decorative rain must not capture a finger');}};
  for(const [target,name]of [[app.panel,'pointerdown'],[app.window,'pointermove'],[app.window,'pointerup'],[app.window,'pointercancel'],[app.panel,'scroll']]){
    const listeners=target.listeners.get(name);
    assert.ok(listeners.length>0);
    assert.ok(listeners.every(listener=>listener.options?.passive===true),`${name} must be passive`);
  }
  app.panel.emit('pointerdown',event);app.flush(200);app.window.emit('pointermove',event);
  app.panel.emit('scroll');app.window.emit('pointerup',event);
  app.panel.emit('pointerdown',{...event,target:{closest:()=>({tagName:'BUTTON'})}});
  app.window.emit('pointercancel',event);app.flush(220);
  assert.equal(app.frames.size,1,'normal rain keeps running after an unclaimed gesture');
  app.instance.destroy();
  assert.equal(app.panel.listeners.get('pointerdown').length,0);
  assert.ok(app.mutations.every(observer=>observer.disconnected));
  assert.ok(app.resizes.every(observer=>observer.disconnected));
});

test('a deliberate hold responds within 150ms at slow and fast display rates without speeding up water',()=>{
  const activationTimes=[];
  for(const fps of [20,60,120]){
    let firstActive=null,lastPositions=new Map();
    const app=openRain({enabled:true,onPhysicsStep(now,drops,dt,width,height,touch){
      if(firstActive===null&&touch?.holding&&touch.strength>0.45)firstActive=now;
      const nextPositions=new Map();
      for(const drop of drops){
        const current={x:drop.lane*width+drop.offset,y:drop.y,waiting:drop.waiting,generation:drop.generation||0};
        const before=lastPositions.get(drop);
        if(before&&!before.waiting&&!current.waiting&&before.generation===current.generation){
          assert.ok(Math.hypot(current.x-before.x,current.y-before.y)<=drop.speed*1.05*dt+1e-8,
            'faster finger feedback leaves the existing slow-water speed cap intact');
        }
        nextPositions.set(drop,current);
      }
      lastPositions=nextPositions;
    }});
    app.flush(0);
    app.panel.emit('pointerdown',{pointerId:1,isPrimary:true,button:0,clientX:96,clientY:430,target:{closest:()=>null}});
    for(let frame=1;frame<=Math.ceil(fps*0.3);frame++)app.flush(frame*1000/fps);
    assert.ok(firstActive!==null&&firstActive>=140&&firstActive<=150+1e-8,
      `a ${fps}Hz display activates the rain at the same short hold duration`);
    activationTimes.push(firstActive);
    app.instance.destroy();
  }
  assert.ok(Math.max(...activationTimes)-Math.min(...activationTimes)<1e-8,'interaction latency does not depend on refresh rate');
});

test('an established hold follows the latest finger sample promptly and releases immediately',()=>{
  let observedTouch=null;
  const app=openRain({enabled:true,onPhysicsStep(now,drops,dt,width,height,touch){observedTouch=touch?{...touch}:null;}});
  const event={pointerId:1,isPrimary:true,button:0,clientX:96,clientY:430,target:{closest:()=>null}};
  app.flush(0);app.panel.emit('pointerdown',event);
  for(let now=25;now<=300;now+=25)app.flush(now);
  assert.ok(observedTouch.strength>0.9);
  app.window.emit('pointermove',{...event,clientX:100,getCoalescedEvents:()=>[
    {clientX:106,clientY:430},{clientX:136,clientY:430}
  ]});
  for(let now=325;now<=400;now+=25)app.flush(now);
  assert.ok(observedTouch.x>115&&observedTouch.x<120,'the rain follows over 90% of a finger movement within 100ms');
  assert.equal(observedTouch.y,430);
  app.window.emit('pointerup',event);app.flush(425);
  assert.equal(observedTouch.holding,false,'release stops the obstacle on the next animation frame');
  app.instance.destroy();
});

test('quick scrolling and ordinary control taps never activate the faster hold response',()=>{
  let activated=false;
  const app=openRain({enabled:true,onPhysicsStep(now,drops,dt,width,height,touch){activated ||= Boolean(touch?.holding&&touch.strength>0.45);}});
  const event={pointerId:1,isPrimary:true,button:0,clientX:96,clientY:430,target:{closest:()=>null}};
  app.flush(0);app.panel.emit('pointerdown',event);app.flush(50);
  app.window.emit('pointermove',{...event,getCoalescedEvents:()=>[{clientX:96,clientY:446}]});
  for(let now=75;now<=300;now+=25)app.flush(now);
  assert.equal(activated,false,'moving early remains a scroll gesture');
  app.panel.emit('pointerdown',{...event,target:{closest:()=>({tagName:'BUTTON'})}});
  for(let now=325;now<=600;now+=25)app.flush(now);
  assert.equal(activated,false,'buttons keep their ordinary tap behavior');
  app.instance.destroy();
});


test('typing gently lowers background intensity and closing the keyboard restores it',()=>{
  const free=openRain({enabled:true}),typing=openRain({enabled:true});
  const alpha=app=>app.streaks.reduce((sum,streak)=>sum+streak.alpha,0);
  free.flush(16);typing.flush(16);
  typing.root.dataset.keyboardOpen='true';
  free.mutations[0].callback([]);typing.mutations[0].callback([]);
  free.flush(32);typing.flush(32);
  assert.ok(Math.abs(alpha(typing)/alpha(free)-1)<0.000001,'keyboard appearance does not abruptly dim the canvas');
  for(let now=82;now<=232;now+=50){free.flush(now);typing.flush(now);}
  let ratio=alpha(typing)/alpha(free);
  assert.ok(ratio>0.6&&ratio<0.85,'the typing state settles through a visible gradual transition');
  for(let now=282;now<=1232;now+=50){free.flush(now);typing.flush(now);}
  ratio=alpha(typing)/alpha(free);
  assert.ok(ratio>0.56&&ratio<0.57,'the optional colour stays present at a quieter intensity');
  typing.root.dataset.keyboardOpen='false';
  free.mutations[0].callback([]);typing.mutations[0].callback([]);
  free.flush(1248);typing.flush(1248);
  assert.ok(alpha(typing)/alpha(free)<0.57,'closing the keyboard does not flash the rain back on');
  for(let now=1298;now<=2448;now+=50){free.flush(now);typing.flush(now);}
  assert.ok(alpha(typing)/alpha(free)>0.998,'normal intensity returns smoothly');
  free.instance.destroy();typing.instance.destroy();
});

test('keyboard-sized height changes clip rain without squeezing existing streaks into new positions',()=>{
  const app=openRain({enabled:true});app.flush(16);
  const head=streak=>`${streak.gradient.x1},${streak.gradient.y1}`;
  const positions=new Set(app.streaks.map(head));
  const rect=app.panel.getBoundingClientRect();rect.height=500;rect.bottom=500;
  app.resizes[0].callback([]);app.flush(16);
  assert.ok(app.streaks.length>0);
  assert.ok(app.streaks.every(streak=>positions.has(head(streak))),'visible water retains its exact position on a height-only resize');
  app.instance.destroy();
});


test('short trail corners are smoothly rounded with fixed endpoints and no extra stroke length',()=>{
  const input=[{x:0,y:0},{x:0,y:10},{x:10,y:10}];
  const rounded=rain.smoothStreak(input);
  assert.deepEqual(rounded[0],input[0]);
  assert.deepEqual(rounded.at(-1),input.at(-1));
  assert.ok(rounded.every(point=>point.x>=-1e-10&&point.x<=10+1e-10&&point.y>=-1e-10&&point.y<=10+1e-10),'the curve cannot overshoot the water history');
  assert.ok(!rounded.some(point=>point.x===0&&point.y===10),'the angular corner is replaced by a curve');
  let length=0,previousAngle=null,largestTurn=0;
  for(let i=1;i<rounded.length;i++){
    const dx=rounded[i].x-rounded[i-1].x,dy=rounded[i].y-rounded[i-1].y;
    length+=Math.hypot(dx,dy);
    const angle=Math.atan2(dy,dx);
    if(previousAngle!==null)largestTurn=Math.max(largestTurn,Math.abs(angle-previousAngle));
    previousAngle=angle;
  }
  assert.ok(length<=20,'rounding never creates a longer trail or a helper arc');
  assert.ok(largestTurn<0.4,'no visible right-angle join remains in the sampled curve');
  const dense=[...Array.from({length:11},(_,i)=>({x:0,y:i})),...Array.from({length:10},(_,i)=>({x:i+1,y:10}))];
  assert.deepEqual(rain.smoothStreak(dense),rounded,'the same physical path renders identically with different frame sampling');
  const straight=[{x:3,y:0},{x:3,y:5},{x:3,y:10}];
  assert.deepEqual(rain.smoothStreak(straight),[straight[0],straight[2]],'straight falling rain stays straight');
});


test('existing rain fills the unused centre below its small quiet entrance without adding particles',()=>{
  const width=402,height=874,drops=rain.createDrops(width,height);
  assert.equal(drops.length,Math.round(width*height/3400));
  const upperCentre=drops.filter(drop=>drop.y>160&&drop.y<440&&drop.lane*width+drop.offset>width*0.35&&drop.lane*width+drop.offset<width*0.65);
  assert.ok(upperCentre.length>=7,'existing streaks occupy the upper central space as well as both sides');
});

test('the transparent welcome parent does not erase rain from unused space around its actual content',()=>{
  const welcome={getBoundingClientRect:()=>({left:16,right:377,top:100,bottom:500,width:361,height:400}),
    classList:{contains:name=>name==='chat-bubble'},closest:selector=>selector==='.chat-welcome'?{}:null};
  const normal=openRain({enabled:true}),withContainer=openRain({enabled:true,extraProtected:[welcome]});
  normal.flush(16);withContainer.flush(16);
  assert.deepEqual(JSON.parse(JSON.stringify(withContainer.streaks)),JSON.parse(JSON.stringify(normal.streaks)),'only the transparent layout rectangle is excluded from clearance');
  assert.ok(withContainer.streaks.some(streak=>streak.gradient.y1>250&&streak.gradient.y1<500),'rain still uses otherwise empty space within that rectangle');
  normal.instance.destroy();withContainer.instance.destroy();
});
