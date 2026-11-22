import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeRanchActor} from '../src/ranch-actors.js';

test('奶牛吃草、家禽啄谷能碰到各自的食物，起落时脸和脚不穿入地面',()=>{
 const floor=new T.Box3(),p=new T.Vector3();
 for(const [kind,index,depth] of [['cow',0,.810],['cow',1,.810],['lamb',0,.457],
  ['hen',0,.418],['rooster',0,.576],['chick',0,.197],['chick',4,.205]]){
  const animal=makeRanchActor(kind,index);
  for(let i=0;i<=24;i++){
   animal.pose({bite:i/24,time:2+i/24});
   floor.setFromObject(animal.root,true);
   assert.ok(floor.min.y>=-.008,kind+' 在啄食时触地过深');
  }
  animal.muzzle.getWorldPosition(p);
  assert.ok(p.y>=0&&p.y<.09,kind+' 应能吃到低处的食物');
  assert.ok(Math.abs(p.z-depth)<.02,kind+' 应与喂食位置对齐');
  animal.pose({sleep:1,time:3});floor.setFromObject(animal.root,true);
  assert.ok(floor.min.y>=-.008);
  assert.ok(animal.root.getObjectsByProperty('name','眼睛 aperture').every(n=>!n.visible));
 }
});

test('两只奶牛的斑纹直接长在各自的毛皮上，母鸡收拢暖褐短尾，公鸡有弯曲的长尾羽',()=>{
 const a=makeRanchActor('cow',0),b=makeRanchActor('cow',1);
 const coat=m=>m.root.getObjectByName('黑白花背和宽胸').geometry;
 assert.notDeepEqual(coat(a).attributes.color.array,coat(b).attributes.color.array);
 const rooster=makeRanchActor('rooster',0),hen=makeRanchActor('hen',0);
 assert.equal(rooster.root.getObjectsByProperty('name','金属绿镰状尾羽').length,7);
 assert.equal(hen.root.getObjectsByProperty('name','上翘的短尾羽').length,3);
 const dog=makeRanchActor('dog',0);
 dog.pose({stride:1,gait:1,look:.5});const jaw=dog.root.getObjectByName('Dog jaw');
 dog.pose({call:1});assert.ok(jaw.rotation.x>.3);
});
