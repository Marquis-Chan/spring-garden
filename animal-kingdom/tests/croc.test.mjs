import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCroc,makeCrocView} from '../src/croc.js';
import {groundHeight} from '../src/diorama.js';
import {createRiver,riverPoints} from '../src/river-state.js';

test('晒暖张嘴后顺着浅滩入水；入水唤起小鱼，波前到达才抬鼻，回来正向爬上岸',()=>{
 const events=[],river=createRiver();
 const croc=createCroc(event=>{
  events.push(event);
  if(event.type==='croc-splash')river.tapWater(event.x,event.z);
 });
 const s=croc.croc,home={...s};
 function step(n,active=true){for(let i=0;i<n;i++){river.step(1/60,active);croc.step(1/60,active,river.waves);}}
 croc.tap();croc.tap();step(35);
 assert.ok(s.gape>.85&&s.lift>.85);
 const pausedAt=s.time;step(70,false);assert.equal(s.time,pausedAt);
 step(236);assert.equal(s.phase,'float');
 assert.ok(groundHeight(s.x,s.z)<riverPoints.waterY-.020);
 assert.equal(events.filter(e=>e.type==='croc-splash').length,1);
 assert.equal(events.filter(e=>e.type==='croc-call').length,1);
 assert.ok(river.fish.some(f=>f.surface>.5));
 river.tapHippo();step(38);assert.ok(!events.some(e=>e.type==='croc-wave'));
 step(125);assert.equal(events.filter(e=>e.type==='croc-wave').length,1);
 croc.tap();step(260);assert.equal(s.phase,'bask');
 assert.equal(s.x,home.x);assert.equal(s.z,home.z);
 assert.equal(events.filter(e=>e.type==='croc-call').length,2);
});

test('逐段核实趾尖和长尾贴着真实岸坡，给小鸭及洞口留出空地',()=>{
 const model=createCroc(),view=makeCrocView(new T.Scene()),v=new T.Vector3();
 const surfaces=[];view.root.traverse(node=>{if(node.isMesh)surfaces.push(node);});
 const head=view.root.getObjectByName('宽平的吻部'),jaw=view.root.getObjectByName('下巴');
 const upper=new T.Vector3(),lower=new T.Vector3();let gap=0;
 model.tap();
 for(let i=0;i<510;i++){
  if(i===272)model.tap();model.step(1/60,true);view.tick(model);
  if(i%3)continue;
  view.root.updateMatrixWorld(true);
  head.localToWorld(upper.set(0,-.042,.40));jaw.localToWorld(lower.set(0,.035,.39));
  gap=Math.max(gap,upper.distanceTo(lower));
  for(const mesh of surfaces){
   const vertices=mesh.geometry.attributes.position;
   for(let j=i%13;j<vertices.count;j+=13){
    mesh.localToWorld(v.fromBufferAttribute(vertices,j));
    assert.ok(v.y+.004>=groundHeight(v.x,v.z),'模型穿进浅滩 '+mesh.name);
    assert.ok(Math.hypot(v.x-27.36,v.z-9.32)>.60,'鳄尾扫进小鸭巡游区');
    assert.ok(Math.hypot(v.x-29.05,v.z-9.00)>.29,'鳄鱼挤占访客小鸭的停留位置');
   }
  }
 }
 assert.ok(gap>.15,'张嘴时上下吻部应能清楚分开');
});
