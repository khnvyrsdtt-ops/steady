const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../public/rhythm.js');

// The clock is context, not judgement. These tests exist so that principle
// cannot quietly erode: they assert the absence of blame, the absence of any
// scoring effect, and that an unusual hour is never corrected on first sight.

const HOUR=(hour,minute=0)=>{const d=new Date();d.setHours(hour,minute,0,0);return d;};
const withClock=(date,fn)=>{R.setNow(()=>date);try{return fn();}finally{R.setNow(null);}};

// Realistic history: a person who has acted on these dates, in these hours.
const history=(partsByDate)=>{
  const days={};
  for(const [date,hours] of Object.entries(partsByDate)){
    days[date]={actionLog:hours.map((hour,index)=>({id:'progress-start',at:new Date(`${date}T${String(hour).padStart(2,'0')}:15:00`).toISOString()}))};
  }
  return days;
};

test('the local clock is read, not assumed, and describes the hour neutrally',()=>{
  withClock(HOUR(1),()=>{
    const m=R.snapshot();
    assert.equal(m.hour,1);
    assert.equal(m.part,'overnight');
    assert.equal(m.quiet,true);
    assert.equal(m.clock,'1am');
  });
  withClock(HOUR(13),()=>assert.equal(R.snapshot().clock,'1pm'));
  withClock(HOUR(0),()=>assert.equal(R.snapshot().clock,'12am'));
  withClock(HOUR(12),()=>assert.equal(R.snapshot().clock,'12pm'));
  withClock(HOUR(23,45),()=>assert.equal(R.snapshot().clock,'11pm'));
});

test('every hour of the day maps to exactly one described part',()=>{
  const seen=new Set();
  for(let hour=0;hour<24;hour++){const part=R.partOf(hour).id;assert.ok(R.partIds.includes(part),`unknown part ${part}`);seen.add(part);}
  assert.equal(seen.size,R.partIds.length,'every part is reachable and none overlap');
});

test('an unusual hour is never corrected on first sight',()=>{
  // No history at all: we know nothing about this person, so we must not speak.
  const m=withClock(HOUR(1),()=>R.moment({}));
  assert.equal(m.known,false);
  assert.equal(m.ask,false,'no rhythm learned means no grounds to ask');
  assert.equal(m.theirs,false);
  assert.equal(m.suggest,'rest','a gentler start is still offered, as a changeable suggestion');
});

test('a rhythm is only inferred from separate days, not repeated hours',()=>{
  // One hour, three separate days, is enough to call it familiar.
  const settled=history({['2026-09-01']:[1],['2026-09-02']:[1],['2026-09-03']:[1]});
  assert.equal(R.hasRhythm(R.pattern(settled)),true);
  assert.equal(R.isFamiliar(R.pattern(settled),'overnight'),true);
  // The same hour across many entries in a single day is one day, not three.
  const oneDay={'2026-09-01':{actionLog:[0,1,2,3].map(h=>({id:'x',at:new Date(`2026-09-01T0${h}:10:00`).toISOString()}))}};
  assert.equal(R.isFamiliar(R.pattern(oneDay),'overnight'),false);
  // A part needs its own three days.
  const mixed=history({['2026-09-01']:[1],['2026-09-02']:[1],['2026-09-03']:[1,10,10]});
  assert.equal(R.isFamiliar(R.pattern(mixed),'overnight'),true);
  assert.equal(R.isFamiliar(R.pattern(mixed),'morning'),false);
});

test('the question appears only when this hour is genuinely not theirs',()=>{
  const dayPerson=history({['2026-09-01']:[9],['2026-09-02']:[9],['2026-09-03']:[9]});
  withClock(HOUR(1),()=>{
    // Their history is mornings; this is 1am, so asking is fair.
    assert.equal(R.moment(dayPerson).ask,true);
    // But once 1am is familiar, it is simply their hour.
    const nightPerson=history({...Object.fromEntries(['2026-09-01','2026-09-02','2026-09-03'].map(d=>[d,[1]]))});
    const m=R.moment(nightPerson);
    assert.equal(m.ask,false,'someone awake at 1am by habit is not asked');
    assert.equal(m.theirs,true);
    assert.equal(m.suggest,null,'no gentler start is imposed on their own hours');
  });
});

test('“yes, it suits me” is honoured immediately and permanently',()=>{
  const dayPerson=history({['2026-09-01']:[9],['2026-09-02']:[9],['2026-09-03']:[9]});
  withClock(HOUR(2),()=>{
    const before=R.moment(dayPerson,{accepted:[]});
    assert.equal(before.ask,true);
    // The accepted list is the record of consent; it needs no history behind it.
    const after=R.moment(dayPerson,{accepted:['overnight']});
    assert.equal(after.ask,false,'the answer is believed straight away');
    assert.equal(after.theirs,true);
    assert.equal(after.suggest,null);
    assert.equal(after.note,'','the clock stops referring to the hour');
  });
});

test('the question is asked at most once a day, and never repeated within a part',()=>{
  const dayPerson=history({['2026-09-01']:[9],['2026-09-02']:[9],['2026-09-03']:[9]});
  withClock(HOUR(1),()=>{
    assert.equal(R.moment(dayPerson,{askedToday:''}).ask,true);
    assert.equal(R.moment(dayPerson,{askedToday:'overnight'}).ask,false,'already asked about this hour today');
    // An unrelated accepted part must not suppress the question about this one.
    assert.equal(R.moment(dayPerson,{accepted:['morning']}).ask,true);
    // A malformed stored value must not crash or unlock the question.
    assert.equal(R.moment(dayPerson,{askedToday:'not-a-part'}).ask,true);
  });
});

test('both answers are offered and neither is a correction',()=>{
  const q=R.question;
  assert.equal(q.yes,'Yes, it suits me');
  assert.equal(q.no,'Not really');
  assert.ok(q.detail.length>0,'the question explains why it is being asked');
  for(const text of [q.text,q.detail,q.yes,q.no,q.yesNote,q.noNote]){
    assert.ok(text.trim().length>0);
  }
  // A "no" must not imply debt, a deficit, or work to catch up on.
  assert.ok(!/owe|oweing|behind|debt|miss|waste|fail|lazy|should have|make up|recover the day/i.test(q.noNote));
});

test('nothing the clock says implies blame, failure or a conventional schedule',()=>{
  const needs=['rest','progress','grow','calm','energy','clarity','connection','explore'];
  const banned=/lazy|laziness|waste|wasted|fail|failure|failed|should have|should've|must|ought|need to catch up|catch up|behind|slack|wasted|discipline|rest is for|morning person|normal hours|you ought|your fault|promise|commitment to|streak|missed/i;
  for(const hour of [0,1,2,3,4,5,9,13,18,19,20,21,22,23]){
    withClock(HOUR(hour),()=>{
      for(const need of needs){
        const m=R.moment({},{});
        const note=R.moment({},{need}).note;
        const text=`${note} ${R.question.text} ${R.question.detail} ${R.question.yesNote} ${R.question.noNote}`;
        assert.ok(!banned.test(text),`blaming or judgemental wording at ${hour} for ${need}: ${text}`);
        assert.equal(m.suggest,hour>=22||hour<5?'rest':null);
      }
    });
  }
});

test('the clock never fabricates scripture or invents references',()=>{
  for(const hour of [1,9,13,22])withClock(HOUR(hour),()=>{
    for(const need of ['rest','progress','calm','clarity']){
      const note=R.moment({},{need}).note;
      assert.ok(!/\d\s*[A-Za-z]+\s*\d|verse|chapter|psalm|john|romans|ephesians|proverbs/i.test(note),
        `the clock must not quote or cite scripture: ${note}`);
    }
  });
});

test('the clock explains a smaller step without claiming the person said so',()=>{
  withClock(HOUR(23),()=>{
    const note=R.moment({},{need:'progress'}).note;
    assert.match(note,/^It is 11pm where you are, /);
    // It describes the clock and the consequence, never an instruction or a verdict.
    assert.ok(!/you should|you need to|you ought/i.test(note));
  });
  // A day where nothing needs saying stays silent rather than inventing a remark.
  withClock(HOUR(10),()=>{
    for(const need of ['rest','progress','calm','clarity','connection','explore','energy','grow']){
      const m=R.moment({},{need});
      assert.equal(m.note,'',`unexpected remark at 10am for ${need}`);
      assert.equal(m.suggest,null);
    }
  });
});

test('malformed history cannot crash or invent a rhythm',()=>{
  for(const days of [null,undefined,0,'today',[],{a:null},{a:{}},{a:{actionLog:null}},{a:{actionLog:[null,1,'x',{}]}},{a:{actionLog:[{at:'not-a-date'}]}},{a:{actionLog:[{at:'2026-13-45T99:99:99Z'}]}}]){
    const seen=R.pattern(days);
    assert.equal(typeof seen,'object');
    assert.ok(Object.values(seen).every(n=>Number.isInteger(n)&&n>=0));
    const m=R.moment(days,{accept:'not-an-array',askedToday:42});
    assert.equal(typeof m.ask,'boolean');
  }
  assert.deepEqual(R.pattern(null),{});
});
