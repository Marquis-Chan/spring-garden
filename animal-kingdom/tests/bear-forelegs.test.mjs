import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {groundHeight} from '../src/diorama.js';
import {createAsia} from '../src/asia-state.js';
import {makeMoonBear} from '../src/asia-bear-owl.js';
import {createIce,makeIceDiorama} from '../src/ice.js';

test('黑熊走动及取叶、捡起两种果实时，以肘屈伸调节距离，两侧前肢保持同等长度',()=>{
 for(const action of ['tapLeaf','tapFruit','tapSharedFruit']){
  const s=createAsia(undefined,{groundAt:groundHeight}),m=makeMoonBear(T,groundHeight);
  const upper=m.root.getObjectsByProperty('name','前掌 upper leg'),lower=m.root.getObjectsByProperty('name','前掌 lower leg');
  const wrist=new T.Vector3(),before=new T.Vector3();let reaches=0;
  s[action](0);
  for(let i=0;i<270;i++){
   s.step(1/60,true);m.pose(s.bear);
   for(let side=0;side<2;side++){
    const length=upper[side].scale.z+lower[side].scale.z;
    assert.ok(length>=.555&&length<.58,action+' 肩肘腕总长 '+length);
   }
   m.paw.getWorldPosition(wrist);
   if(i&&s.bear.hold)assert.ok(wrist.distanceTo(before)<.14,'抓握时前掌不能跳到另一个位置');
   before.copy(wrist);if(s.bear.reach>.99)reaches++;
  }
  assert.ok(reaches>0);
 }
});

test('北极熊入水、托起和把鱼送到嘴角时左前肢保持紧凑',()=>{
 const s=createIce(),v=makeIceDiorama(new T.Scene());s.tapFish(0);
 const leg=v.root.getObjectByName('掌上托鱼的位置').parent.parent.getObjectByName('从肩到踝的毛皮');
 const pos=leg.geometry.getAttribute('position'),here=new T.Vector3(),prev=new T.Vector3(),vertex=new T.Vector3();
 let wet=0,offered=0;
 for(let i=0;i<640;i++){
  s.step(1/60,true);v.tick(s);
  if(s.bear.reach<.01&&s.bear.offer<.01)continue;
  // 网格从足踝向上共有八圈，前七圈到肩关节。取各圈中心，量弯曲肢体的实际路径。
  let length=0;
  for(let row=0;row<7;row++){
   here.set(0,0,0);
   for(let j=0;j<24;j++)here.add(vertex.fromBufferAttribute(pos,row*24+j));
   here.divideScalar(24);
   if(row)length+=here.distanceTo(prev);
   prev.copy(here);
  }
  assert.ok(length<.91,'掌至肩中心线过长 '+length);
  if(s.bear.dip>.94){assert.ok(length<.87);wet++;}
  if(s.bear.offer>.93)offered++;
 }
 assert.ok(wet>=4&&offered>=18);
});
