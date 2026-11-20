import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Scene} from 'three';
import {createBamboo,makeBambooDiorama} from '../src/bamboo.js';

test('两只幼崽走回上坡时，以肩为轴交替迈前掌，腿长不会随步幅拉伸',()=>{
 const state=createBamboo(),view=makeBambooDiorama(new Scene()),samples=[0,0,0],shoulder=new Vector3();
 state.tap('panda-slope');
 for(let i=0;i<420;i++){
  state.step(1/60,true);view.tick(state);
  for(const [index,cub] of state.bears.entries()){
   if(cub.walk<.99)continue;
   for(const arm of view.bears[index].arms){
    shoulder.set(arm.side*.33,.213,.027);
    assert.ok(Math.abs(arm.end.distanceTo(shoulder)-.57)<.009);
   }
   samples[index]++;
  }
 }
 assert.ok(samples[1]>45&&samples[2]>45);
});
