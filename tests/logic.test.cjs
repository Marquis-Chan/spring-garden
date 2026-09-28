const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const sandbox={window:{}};
const file=path.join(__dirname,'../src/core.js');
if(fs.existsSync(file))vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox);
const core=sandbox.window.SpringGarden?.core||{};

test('letterboxing and window resizing keep pointer coordinates on the illustration',()=>{
  assert.equal(typeof core.viewport,'function');
  const v=core.viewport(1000,900);
  assert.equal(v.scale,.625);
  assert.equal(v.toWorld(500,450).x,800);
  assert.equal(v.toWorld(500,450).y,450);
});
test('small animals have 32 CSS pixels of forgiving hit area and overlaps pick just one',()=>{
  assert.equal(typeof core.pick,'function');
  const a={id:'a',x:100,y:100,r:20},b={id:'b',x:140,y:100,r:20};
  assert.equal(core.pick({x:160,y:100},[a],.5)?.id,'a');
  assert.equal(core.pick({x:190,y:100},[a],.5),null);
  assert.equal(core.pick({x:136,y:100},[a,b],1)?.id,'b');
});
test('repeated clicks do not enqueue animal actions and exact cooldown boundary permits a new action',()=>{
  assert.equal(typeof core.Cooldown,'function');
  const gate=new core.Cooldown(1500);
  assert.equal(gate.take('cat',100),true);
  for(let t=101;t<1600;t++)assert.equal(gate.take('cat',t),false);
  assert.equal(gate.take('cat',1600),true);
});
test('fast mouse input never creates more than 24 particles per second or 120 live particles',()=>{
  assert.equal(typeof core.EffectBudget,'function');
  const budget=new core.EffectBudget();
  let generated=0;
  for(let i=0;i<1000;i++)generated+=budget.take(i,6,generated);
  assert.equal(generated,24);
  assert.equal(budget.take(1001,10,119),1);
  assert.equal(budget.take(2002,10,120),0);
});
test('the visit queue cycles through the full roster, including when both guest places are occupied',()=>{
  assert.equal(typeof core.Visits,'function');
  const roster=['elephant','giraffe','monkey','peacock','tiger','zebra','hippo','rhino','turtle','penguin'];
  const visits=new core.Visits(roster,()=>0);
  const seen=[];
  for(let i=0;i<roster.length;i++)seen.push(visits.next(20000*(i+1),[],false));
  assert.equal(seen.join(','),roster.join(','));
  assert.ok(roster.includes(visits.next(250000,['a','b'],false)));
  assert.equal(visits.next(250000,[],true),null);
  visits.reset(300000);
  assert.equal(visits.next(300001,[],false),null);
});
test('dog walking plants paws during stance, lifts during swing and keeps articulated limb lengths',()=>{
 assert.equal(typeof core.dogLegPose,'function');
 const stanceA=core.dogLegPose(0,133,134,true),stanceB=core.dogLegPose(.5,133,134,true),swing=core.dogLegPose(.8,133,134,true);
 assert.equal(stanceA.foot.y,175);assert.equal(stanceB.foot.y,175);assert.ok(stanceA.foot.x>stanceB.foot.x);assert.ok(swing.foot.y<171);
 for(let t=0;t<1;t+=.025){const p=core.dogLegPose(t,133,134,true);assert.ok(Math.abs(Math.hypot(p.knee.x-133,p.knee.y-134)-24)<.001);assert.ok(Math.abs(Math.hypot(p.foot.x-p.knee.x,p.foot.y-p.knee.y)-25)<.001)}
});
test('future themes preserve three independent axes and reject unsupported values',()=>{
  assert.equal(typeof core.theme,'function');
  const t=core.theme({time:'night',season:'winter',scene:'underwater'});
  assert.equal(t.time,'night');assert.equal(t.season,'winter');assert.equal(t.scene,'underwater');
  assert.equal(core.theme({time:'oops',season:'oops',scene:'oops'}).time,'day');
  assert.equal(core.theme({}).season,'spring');assert.equal(core.theme({}).scene,'meadow-sunny');
});
test('muting and background suspension release all real recording voices without replay queues',()=>{
  assert.equal(typeof core.VoiceGate,'function');
  const gate=new core.VoiceGate(2);
  assert.equal(gate.take('cat',0),true);
  assert.equal(gate.take('dog',0),true);
  assert.equal(gate.take('bird',1),false);
  gate.clear();assert.equal(gate.active,0);
  assert.equal(gate.take('bird',2),true);
});
test('model placement preserves a visible gap and refuses a completely occupied patch',()=>{
 assert.equal(typeof core.separated,'function');assert.equal(typeof core.findSpace,'function');
 assert.equal(core.separated({x:0,y:0,w:50,h:50},{x:60,y:0,w:50,h:50},12),false);
 assert.equal(core.separated({x:0,y:0,w:50,h:50},{x:62,y:0,w:50,h:50},12),true);
 const occupied=[{x:0,y:0,w:100,h:100}];
 assert.equal(core.findSpace({x:50,y:50},{w:30,h:30},occupied,{x:0,y:0,w:100,h:100},10),null);
 const p=core.findSpace({x:50,y:50},{w:30,h:30},occupied,{x:0,y:0,w:240,h:150},12);
 assert.ok(p);assert.ok(core.separated({x:p.x-15,y:p.y-15,w:30,h:30},occupied[0],12));
});
