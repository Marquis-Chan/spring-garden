import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createIce,makeIceDiorama} from '../src/ice.js';
import {worldSurfaceHeight} from '../src/world-landscape.js';
import {coastPoints,coastWaterY} from '../src/coast-state.js';
import {riverPoints} from '../src/river-state.js';
import {groundHeight} from '../src/diorama.js';

const step=(state,seconds,active=true)=>{
 for(let i=0;i<Math.ceil(60*seconds);i++)state.step(1/60,active);
};
test('雪洞先露熊鼻，再四脚向前出洞；点熊抖雪发声，点洞转身归家',()=>{
 const events=[],ice=createIce(e=>events.push(e.type)),home={...ice.bear};
 step(ice,40,false);
 assert.equal(ice.bear.time,0);
 ice.tapCave();step(ice,.30);
 assert.equal(ice.bear.phase,'peek');
 assert.ok(ice.bear.sniff>.7);
 assert.deepEqual(events,['den-peek']);
 step(ice,1);assert.ok(ice.bear.progress>0&&ice.bear.gait>0);
 step(ice,3.6);assert.equal(ice.bear.phase,'outside');
 ice.tapBear();ice.tapBear();step(ice,.37);
 assert.ok(ice.bear.shake>.6);
 assert.equal(events.filter(e=>e==='polar-bear-call').length,1);
 ice.tapCave();step(ice,.5);
 assert.equal(ice.bear.phase,'turn-home');
 assert.ok(ice.bear.gait>0);
 step(ice,5.3);assert.equal(ice.bear.phase,'den');assert.equal(ice.bear.x,home.x);
 assert.equal(ice.bear.z,home.z);assert.deepEqual(events.slice(-2),['den-return','bear-settled']);
});
test('从探头到抖雪，毛皮鼻梁和黑鼻保持实际接触',()=>{
 const ice=createIce(),view=makeIceDiorama(new T.Scene());
 const body=view.root.getObjectByName('连贯的肩背与长吻'),nose=view.root.getObjectByName('宽黑鼻');
 const v=new T.Vector3(),black=new T.Vector3(),tip=body.geometry.attributes.position.count-1;
 ice.tapCave();
 for(let i=0;i<350;i++){
  if(i===256)ice.tapBear();
  ice.step(1/60,true);view.tick(ice);
  view.root.updateMatrixWorld(true);
  body.getVertexPosition(tip,v).applyMatrix4(body.matrixWorld);
  nose.getWorldPosition(black);assert.ok(v.distanceTo(black)<.072,'鼻尖始终落在黑鼻内');
 }
});
test('大地图潮池、浅水和海草都在实际地表上，不会被整片沙洲压住',()=>{
 const {tidePool,lanes}=coastPoints;
 assert.ok(worldSurfaceHeight(tidePool.x,tidePool.z)<tidePool.y-.07);
 for(const lane of lanes){
  assert.ok(Math.abs(worldSurfaceHeight(lane.land.x,lane.land.z)-.65)<.015);
  assert.ok(worldSurfaceHeight(lane.swim.x,lane.swim.z)<coastWaterY-.05);
 }
 assert.equal(worldSurfaceHeight(riverPoints.pool.x,riverPoints.pool.z),groundHeight(riverPoints.pool.x,riverPoints.pool.z));
 assert.ok(worldSurfaceHeight(54,16)<-.035&&worldSurfaceHeight(44,22)<-.035);
});

test('捞鱼时逐帧检查熊掌、冰沿、鱼和嘴唇；扑空后能继续玩',()=>{
 const events=[],ice=createIce(e=>events.push(e)),view=makeIceDiorama(new T.Scene());
 const floes=view.root.children.filter(node=>node.name==='雪面与蓝冰断层');
 const down=new T.Vector3(0,-1,0),ray=new T.Raycaster(),origin=new T.Vector3();
 function iceTop(p){
  ray.set(origin.set(p.x,8,p.z),down);
  return ray.intersectObjects(floes,false)[0]?.point.y??-Infinity;
 }
 const palm=view.root.getObjectByName('掌上托鱼的位置'),lip=view.root.getObjectByName('鱼头接触嘴唇的位置');
 const body=view.root.getObjectByName('连贯的肩背与长吻'),legs=view.root.getObjectsByProperty('name','从肩到踝的毛皮');
 const p=new T.Vector3(),hand=new T.Vector3(),mouth=new T.Vector3();
 for(const index of [0,1]){
  ice.tapFish(index);ice.tapFish(index);ice.tapBear();
  let ended=false,contact=false,ate=false,missed=false;
  const target=view.hintNodes.fish[index];
  for(let i=0;i<820;i++){
   ice.step(1/60,true);view.tick(ice);view.root.updateMatrixWorld(true);
   palm.getWorldPosition(hand);target.getWorldPosition(p);
   const f=ice.fish[index];
   if(f.mode==='approach'||f.mode==='ready'||f.mode==='escape'){
    for(const z of [-.53,0,.48]){
     target.localToWorld(p.set(0,0,z));
     assert.ok(p.y>iceTop(p),'鱼头、鱼身和尾鳍都在碎冰之间的水路里');
    }
   }
   if(ice.bear.phase==='fishing'){
    assert.ok(hand.y+.001>=iceTop(hand),'手掌伸出冰沿才能入水');
    // 检查蒙皮后的实际轮廓，包含探身时最低的胸口和弯曲的前腿。
    for(const model of [body,...legs]){
     const at=model.geometry.attributes.position;
     for(let j=i%11;j<at.count;j+=11){
      model.getVertexPosition(j,p).applyMatrix4(model.matrixWorld);
      if(p.y<.52)assert.ok(p.y+.005>=iceTop(p),'熊的躯干或腿穿过冰面');
     }
    }
   }
   if(f.mode==='held'&&!f.swallow){
    assert.ok(target.getWorldPosition(p).distanceTo(hand)<.001,'鱼随掌心移动');contact=true;
   }
   if(f.mode==='held'&&f.swallow>.01&&f.swallow<.96){
    p.set(0,0,.48);target.localToWorld(p);lip.getWorldPosition(mouth);
    assert.ok(p.distanceTo(mouth)<.002,'吞入时鱼头持续贴住嘴角');ate=true;
   }
   if(f.mode==='escape'&&ice.bear.dip>.94){
    assert.ok(target.getWorldPosition(p).distanceTo(hand)>.65,'扑空时鱼已游出掌边');missed=true;
   }
   if(events.filter(e=>e.type==='fishing-finished').length===index+1){ended=true;break;}
  }
  assert.ok(ended);assert.equal(contact,index===0);assert.equal(ate,index===0);assert.equal(missed,index===1);
 }
 assert.deepEqual(events.filter(e=>e.type==='fishing-finished').map(e=>e.caught),[true,false]);
 assert.equal(events.filter(e=>e.type==='polar-bear-call').length,2);
 step(ice,3.5);assert.ok(ice.fish.every(f=>ice.canFish(f.index)));
 ice.tapFish(2);step(ice,.75);ice.tapCave();const before=ice.time;step(ice,8,false);
 assert.equal(ice.time,before);step(ice,16);assert.equal(ice.bear.phase,'den');
});
