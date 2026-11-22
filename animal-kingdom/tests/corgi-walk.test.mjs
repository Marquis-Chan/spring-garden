import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {createRanch} from '../src/ranch-state.js';
import {makeCorgi} from '../src/orchard-actors.js';
import {createOrchard} from '../src/orchard-state.js';
import {corgiLegs} from '../src/corgi-walk.js';

test('慢走时四爪依次落地；在直线与折返中，承重的脚掌都留在原处',()=>{
 const ranch=createRanch(),dog=ranch.animals.find(a=>a.kind==='dog'),model=makeCorgi(T);
 const paws=['Left rear','Left front','Right rear','Right front'].map(k=>model.root.getObjectByName(k+' dog paw'));
 const order=[],positions=[],air=[];
 let pivotFrames=0,plantedFrames=0,maxSlide=0;
 for(let frame=0;frame<1500;frame++){
  const yaw=dog.yaw;ranch.step(1/60,true,false);
  model.root.position.set(dog.x,0,dog.z);model.root.rotation.y=dog.yaw;model.pose(dog);
  if(frame>500&&Math.abs(yaw-dog.yaw)>.02)pivotFrames++;
  let support=0;
  paws.forEach((paw,i)=>{
   const p=paw.getWorldPosition(new T.Vector3()),lifted=p.y>.044;
   if(!lifted)support++;
   if(frame>180&&frame<600&&air[i]&&!lifted)order.push(i);
   if(!lifted&&!air[i]&&positions[i]){
    maxSlide=Math.max(maxSlide,Math.hypot(p.x-positions[i].x,p.z-positions[i].z));
    plantedFrames++;
   }
   positions[i]=p;air[i]=lifted;
  });
  assert.ok(support>=2,'慢走至少两爪承重');
 }
 assert.ok(pivotFrames>10&&plantedFrames>2000);
 assert.ok(maxSlide<.006,'承重脚单帧滑移 '+maxSlide.toFixed(4));
 assert.ok(order.length>=16);
 assert.ok(order.every((n,i)=>!i||n===(order[i-1]+1)%4),'落脚顺序 '+order);
});

test('追果、绕篮、回头和夜间巡视在不同帧率下都保留四个分开的脚印',()=>{
 for(const dt of [1/60,1/30,.046]){
  const ranch=createRanch(),orchard=createOrchard();
  for(let i=0;i<1700;i++){
   if(i%300===0)orchard.tapApple((i/300)%3);
   orchard.step(dt,true);ranch.step(dt,true,i>800);
   for(const dog of [orchard.dog,ranch.animals.find(a=>a.kind==='dog')]){
    dog.feet.forEach((foot,j)=>{
     const leg=corgiLegs[j];
     assert.ok(Math.hypot(foot.localX-leg.x,foot.localZ-leg.z)<.37,'短腿不能被身子拖远');
     for(let k=0;k<j;k++){
      const other=dog.feet[k];
      assert.ok(Math.hypot(foot.x-other.x,foot.z-other.z)>.145,'相邻爪不能叠在一起');
     }
    });
   }
  }
 }
});

test('果园与牧场的观看高度都能看清双眼，闭眼后眼线贴在脸上',()=>{
 const dog=makeCorgi(T),eyes=dog.root.getObjectsByProperty('name','Almond eye');
 const lids=dog.root.getObjectsByProperty('name','Resting eyelid');
 assert.equal(eyes.length,2);assert.equal(lids.length,2);
 dog.pose({time:1});dog.root.updateMatrixWorld(true);
 for(const height of [.20,.53])for(const yaw of [-.25,0,.25])for(const eye of eyes){
  const vertex=eye.geometry.attributes.position;
  for(const i of [2*48,6*48,6*48+12,6*48+24,6*48+36]){
   const p=new T.Vector3();
   for(const j of [i,i+48,i+49])p.add(new T.Vector3().fromBufferAttribute(vertex,j));
   p.multiplyScalar(1/3).applyMatrix4(eye.matrixWorld);
   const toward=new T.Vector3(Math.sin(yaw),height,Math.cos(yaw)).normalize();
   const ray=new T.Raycaster(p.clone().addScaledVector(toward,2),toward.negate());
   const hits=ray.intersectObjects(dog.root.children,true).filter(h=>h.object.visible);
   assert.equal(hits[0]?.object.name,'Almond eye','额头或鼻梁遮住眼面');
  }
 }
 dog.pose({sleep:1,time:2});
 assert.ok(eyes.every(e=>!e.visible)&&lids.every(l=>l.visible));
 dog.pose({sleep:0,time:3});
 assert.ok(eyes.every(e=>e.visible)&&lids.every(l=>!l.visible));
});
