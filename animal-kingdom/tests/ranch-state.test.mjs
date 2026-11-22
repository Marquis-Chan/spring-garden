import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRanch} from '../src/ranch-state.js';
import {makeRanchActor} from '../src/ranch-actors.js';

const dt=1/60;
const advance=(r,seconds,night=false,active=true)=>{
 for(let i=0;i<Math.ceil(seconds/dt);i++)r.step(dt,active,night);
};
const position=a=>[a.x,a.y,a.z];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function mouthOf(model,a){
 model.root.position.set(a.x,a.y,a.z);model.root.rotation.y=a.yaw;model.pose(a);
 return model.muzzle.getWorldPosition(new Vector3());
}

test('同一捆干草可以交替喂两头奶牛，吃草中连点也能轮到另一头，草量跟随牛嘴',()=>{
 const events=[],r=createRanch(e=>events.push(e));
 const cows=r.animals.filter(a=>a.kind==='cow'),models=cows.map(a=>makeRanchActor('cow',a.index));
 const hay=r.props.find(p=>p.kind==='hay'),seen=[0,0];
 r.tap('hay');advance(r,.08);r.tap('hay');
 let lastAmount=1;
 for(let i=0;i<60*26;i++){
  r.step(dt);
  for(const a of cows){
   if(a.bite<.999)continue;
   const tip=mouthOf(models[a.index],a),x=a.index===0?-2.07:-1.57;
   assert.ok(Math.hypot(tip.x-x,tip.z+.09)<.072);
   assert.ok(tip.y>=.016&&tip.y<.13);seen[a.index]++;
  }
  if(hay.amount<lastAmount)assert.ok(cows.some(a=>a.bite>.98),'低头接触嫩草后再吃掉');
  lastAmount=hay.amount;
 }
 assert.ok(seen.every(n=>n>40));
 assert.deepEqual(events.filter(e=>e.type==='ranch-hay-eaten').map(e=>e.index),[0,1]);
 assert.equal(hay.amount,1);
});

test('公鸡鸣叫，母鸡招呼五只小鸡到六处谷粒；每只喙啄到自己的谷粒且能再次召集',()=>{
 const events=[],r=createRanch(e=>events.push(e)),grain=r.props.find(p=>p.kind==='grain');
 const fowl=r.animals.filter(a=>a.kind==='hen'||a.kind==='chick');
 const models=fowl.map(a=>makeRanchActor(a.kind,a.index)),contacts=Array(fowl.length).fill(0);
 r.tap('rooster');assert.deepEqual(events[0],{type:'ranch-call',kind:'rooster',index:0});
 for(let i=0;i<490;i++){
  r.step(dt);
  fowl.forEach((a,j)=>{
   if(a.bite<.995)return;
   const tip=mouthOf(models[j],a),seed=a.kind==='hen'?grain.henSeed:grain.seeds[a.index];
   assert.ok(Math.hypot(tip.x-seed.x,tip.z-seed.z)<.048);
   assert.ok(tip.y>-.013&&tip.y<.055);contacts[j]++;
  });
 }
 assert.ok(contacts.every(n=>n>=2));assert.ok(events.some(e=>e.type==='ranch-grain-eaten'));
 advance(r,4);assert.ok(grain.seeds.every(p=>p.amount===1));
 r.tap('hen');assert.deepEqual(events.at(-1),{type:'ranch-scatter',kind:'hen',index:0});
});

test('两只羊交替领跳；黄昏只完成已经离地的一跃，落稳后才入睡',()=>{
 const r=createRanch(),lambs=r.animals.filter(a=>a.kind==='lamb');
 r.tap('lamb',1);advance(r,.85);assert.ok(lambs[1].y>.2);assert.equal(lambs[0].y,0);
 for(let i=0;i<62;i++){
  r.step(dt,true,true);assert.equal(lambs[0].y,0);
  if(lambs[1].y>.03)assert.equal(lambs[1].sleep,0);
 }
 advance(r,6,true);assert.ok(lambs.every(a=>a.sleep===1&&a.y===0));
 advance(r,2);r.tap('lamb',0);advance(r,.85);
 assert.ok(lambs[0].y>.2);assert.equal(lambs[1].y,0);
});

test('十二只动物都可点。睡稳后夜间十一只只回应 Zzz，小狗沿围栏两头巡逻',()=>{
 const events=[],r=createRanch(e=>events.push(e)),dog=r.animals.find(a=>a.kind==='dog');
 const asleep=r.animals.filter(a=>a!==dog);assert.equal(asleep.length,11);
 advance(r,8,true);assert.ok(asleep.every(a=>a.sleep===1));
 for(const a of r.animals)r.tap(a.kind,a.index);
 assert.deepEqual(events.filter(e=>e.type==='ranch-sleep').map(e=>e.kind+e.index),
  asleep.map(a=>a.kind+a.index));
 assert.ok(!events.some(e=>e.type==='ranch-call'));assert.ok(events.some(e=>e.type==='ranch-dog-watch'));
 const resting=asleep.map(position);let min=dog.x,max=dog.x;
 for(let i=0;i<1500;i++){r.step(dt,true,true);min=Math.min(dog.x,min);max=Math.max(dog.x,max);}
 assert.deepEqual(asleep.map(position),resting);assert.ok(max-min>5.8);assert.equal(dog.sleep,0);
});

test('场外也会归位入睡；刚醒时记住点按，切走或再次入夜立即取消',()=>{
 const events=[],r=createRanch(e=>events.push(e)),cow=r.animals[0];
 r.tap('hay');advance(r,2);advance(r,8,true,false);assert.equal(cow.sleep,1);
 for(const leave of ['scene','night','stay']){
  advance(r,.08,false);r.tap('cow',0);r.tap('cow',0);
  const prior=events.filter(e=>e.type==='ranch-call').length;
  assert.ok(cow.sleep>.90);
  if(leave==='scene')advance(r,.18,false,false);
  if(leave==='night')advance(r,.18,true);
  advance(r,2.6);
  assert.equal(events.filter(e=>e.type==='ranch-call').length-prior,leave==='stay'?1:0);
  advance(r,9,true,false);
 }
});

test('食槽、觅食和巡逻同时发生时，羊道、鸡仔与奶牛各自留出空间',()=>{
 const r=createRanch(),a=r.animals;
 r.tap('hay');r.tap('grain');r.tap('lamb',0);
 for(let i=0;i<2700;i++){
  if(i%187===0)r.tap('lamb',i%2);
  if(i%441===0)r.tap('hay');
  if(i%331===0)r.tap('grain');
  r.step(dt);
  for(let j=0;j<a.length;j++)for(let k=j+1;k<a.length;k++){
   let radius={cow:.77,lamb:.39,chick:.13,hen:.32,rooster:.38,dog:.45};
   assert.ok(distance(a[j],a[k])>radius[a[j].kind]+radius[a[k].kind]);
  }
 }
});

test('点鸡仔时由它先啾叫展翅，邻座稍后跟着扑翅；谷袋留给喂食动作',()=>{
 const events=[],r=createRanch(e=>events.push(e)),chicks=r.animals.filter(a=>a.kind==='chick');
 r.tap('chick',3);advance(r,.29);
 assert.ok(chicks[3].display>.38);assert.equal(chicks[4].display,0);
 advance(r,.40);assert.ok(chicks[4].display>.40);
 assert.deepEqual(events.map(e=>e.type),['ranch-call','ranch-wing-wave']);
});
