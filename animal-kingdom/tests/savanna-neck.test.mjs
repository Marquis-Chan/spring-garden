import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeGiraffe,makeZebra} from '../src/savanna-actors.js';
import {createSavanna,savannaPoints} from '../src/savanna-state.js';
import {makeSavannaDiorama} from '../src/savanna-diorama.js';

test('草原长路胸口朝着迈步方向，远枝先走近再吃。活动圈与同伴、水和树干留出净空',()=>{
 const s=createSavanna(),g=s.giraffe,ranges={minX:g.x,maxX:g.x,minZ:g.z,maxZ:g.z};
 const model=makeGiraffe(T),stage=makeSavannaDiorama(new T.Scene(),savannaPoints),wood=[],canopies=[];
 const point=new T.Vector3();
 stage.root.updateWorldMatrix(true,true);
 stage.root.traverse(o=>{
  if(!o.isMesh)return;
  if(o.name==='伞形树冠'){canopies.push({o,box:new T.Box3().setFromObject(o)});return;}
  const attr=o.geometry.attributes.position;
  if(attr.count!==380||!attr.getX)return;
  for(let row=0;row<=20;row++){
   const center=new T.Vector3();
   for(let i=0;i<18;i++)center.add(point.fromBufferAttribute(attr,row*18+i));
   center.divideScalar(18);const radius=center.distanceTo(point.fromBufferAttribute(attr,row*18));
   wood.push({center:o.localToWorld(center),radius});
  }
 });
 const landmarks=['Giraffe head','Giraffe muzzle contact','Left giraffe ear','Right giraffe ear'].map(n=>model.root.getObjectByName(n)).filter(Boolean);
 assert.ok(wood.length>250&&canopies.length>=8&&landmarks.length>=2);
 const ray=new T.Raycaster(),forward=new T.Vector3(.85,.12,.51).normalize();
 for(let frame=0;frame<60*72;frame++){
  const previous={x:g.x,z:g.z};s.step(1/60,true);
  const dx=g.x-previous.x,dz=g.z-previous.z,d=Math.hypot(dx,dz);
  if(d>.0001)assert.ok((dx*Math.sin(g.yaw)+dz*Math.cos(g.yaw))/d>.95);
  assert.ok(Math.hypot(g.x-s.elephant.x,g.z-s.elephant.z)>1.48);
  assert.ok(Math.hypot(g.x-s.zebra.x,g.z-s.zebra.z)>1.23);
  assert.ok(Math.hypot(g.x-s.lion.x,g.z-s.lion.z)>1.43);
  if(frame%8===0){
   model.root.position.set(g.x,g.y,g.z);model.root.rotation.y=g.yaw;model.pose(g);
   for(const node of landmarks){
    node.getWorldPosition(point);
    for(const {center,radius} of wood)assert.ok(point.distanceTo(center)>radius+.028,'木质枝杈与头部 '+JSON.stringify({x:g.x,z:g.z,t:s.time}));
    for(const {o,box} of canopies)if(box.containsPoint(point)){
     // 封闭树冠从内部投射时，只能见背面；反向以外侧起点数面。
     ray.set(point.clone().addScaledVector(forward,-8),forward);
     const enters=ray.intersectObject(o,false).filter(h=>h.distance<8);
     if(enters.length){
      ray.set(point.clone().addScaledVector(forward,8),forward.clone().negate());
      assert.equal(ray.intersectObject(o,false).some(h=>h.distance<8),false,'头部穿入树冠 '+JSON.stringify({x:g.x,z:g.z,t:s.time}));
     }
    }
   }
  }
  ranges.minX=Math.min(ranges.minX,g.x);ranges.maxX=Math.max(ranges.maxX,g.x);
  ranges.minZ=Math.min(ranges.minZ,g.z);ranges.maxZ=Math.max(ranges.maxZ,g.z);
 }
 assert.ok(ranges.maxX-ranges.minX>1.98&&ranges.maxZ-ranges.minZ>.84);
 for(const [start,choice] of [[17,0],[48,1]]){
  let bite=null;const visit=createSavanna(e=>{if(e.type==='leaf-bite')bite=e;});
  for(let i=0;i<60*start;i++)visit.step(1/60,true);
  const deer=visit.giraffe,from={x:deer.x,z:deer.z};
  visit.tapBranch(choice);
  for(let i=0;!bite&&i<60*5;i++){
   const x=deer.x,z=deer.z;visit.step(1/60,true);
   if(deer.browse>0)assert.ok(Math.hypot(deer.x-x,deer.z-z)<.0001);
  }
  assert.equal(bite?.index,choice);assert.ok(Math.hypot(deer.x-from.x,deer.z-from.z)>.31);
  assert.ok(Math.hypot(deer.reachX,deer.reachZ)<1.23);
 }
});

test('从三个站位够左右枝的三片实体叶尖，颈部各段向上平滑延伸',()=>{
 const rig=makeGiraffe(T),tree=makeSavannaDiorama(new T.Scene(),savannaPoints);
 const coords=rig.root.getObjectByName('Continuous giraffe neck').geometry.attributes.position;
 const center=row=>{const p=new T.Vector3();for(let j=0;j<36;j++)p.add(new T.Vector3().fromBufferAttribute(coords,row*36+j));return p.divideScalar(36);};
 const idleLength=center(0).distanceTo(center(48));
 for(const [x,z] of [[19.10,4.91],[19.43,5.41],[18.98,5.38]])for(const index of [0,1]){
  const cluster=tree.hintNodes.bough[index][0],blades=cluster.children.filter(node=>node.name==='可吃的嫩叶');
  let bites=0;
  const plain=createSavanna(event=>{
   if(event.type!=='leaf-bite')return;
   const state=plain.giraffe;
   rig.root.position.set(state.x,state.y,state.z);rig.root.rotation.y=state.yaw;rig.pose(state);
   const p=blades[2-bites].localToWorld(new T.Vector3(0,0,1));
   assert.ok(p.distanceTo(rig.mouth.getWorldPosition(new T.Vector3()))<.0001);
   let previous=center(0),lastDirection=null,length=0;
   for(let row=2;row<=48;row+=2){
    const c=center(row),d=c.clone().sub(previous);length+=d.length();
    assert.ok(d.y>.04,'不出现下折的颈段');
    d.normalize();
    if(lastDirection)assert.ok(d.angleTo(lastDirection)<Math.PI/45,'相邻颈段弯角 '+d.angleTo(lastDirection));
    previous=c;lastDirection=d;
   }
   assert.ok(length/idleLength>.90&&length/idleLength<1.22,'进食姿态须保持颈长 '+length/idleLength);
   bites++;
  });
  Object.assign(plain.giraffe,{x,z});
  // 禁用自主散步以固定测试站位；黄叶落地后，伙伴仍按原来的顺序回应。
  for(let i=0;i<1000&&bites<3;i++){
   if(i%6===0)plain.tapBranch(index);
   plain.step(1/60,false);
  }
  assert.equal(bites,3);assert.equal(plain.leaves[index].remaining,0);
  for(let f=0;f<190;f++)plain.step(1/60,false);
  assert.equal(plain.leaves[index].remaining,3);
 }
});

test('斑马跑动、转耳、睡觉和抖动时，颈顶和头共用枕点，鬃毛随颈转动',()=>{
 const zebra=makeZebra(T),neck=zebra.root.getObjectByName('Striped uphill neck'),head=zebra.head;
 for(const input of [{},{gait:1,stride:2.4},{sleep:1},{notice:1,listen:-1},{shake:1},{call:1}]){
  zebra.pose(input);zebra.root.updateMatrixWorld(true);
  const poll=neck.localToWorld(new T.Vector3(0,0,.648)),skull=head.getWorldPosition(new T.Vector3());
  assert.ok(skull.distanceTo(poll)<.060);
  const shoulder=neck.localToWorld(new T.Vector3(0,0,-.04));assert.ok(shoulder.distanceTo(poll)>.68);
  assert.equal(zebra.root.getObjectByName('Short black crest base').parent,head.parent);
  assert.ok(skull.y>1.19,'低头姿势仍辨得出颈长');
 }
});
