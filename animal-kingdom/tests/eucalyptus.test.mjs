import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEucalyptus,makeEucalyptusDiorama} from '../src/eucalyptus.js';
import {gumOrigin,gumPerches} from '../src/eucalyptus-state.js';

function play(state,seconds,night=false){
 for(let frame=0;frame<Math.ceil(seconds*60);frame++)state.step(1/60,true,night);
}
test('点嫩叶：考拉抓稳再吃，银眼鸟起飞换枝，松手后叶子重新可玩',()=>{
 const events=[],state=createEucalyptus(e=>events.push(e)),view=makeEucalyptusDiorama(new T.Scene());
 const root=view.hintNodes.koala,hand=root.getObjectsByProperty('name','五指前掌')[1];
 const lips=root.getObjectByName('叶尖抵住的嘴角'),blade=view.root.getObjectByName('嘴边的主桉叶');
 const eye=root.getObjectsByProperty('name','小而明亮的眼')[1];
 const v=new T.Vector3(),p=new T.Vector3(),q=new T.Vector3();let eating=0,flapping=0;
 state.tap('gum-leaves');state.tap('gum-leaves');
 for(let i=0;i<250;i++){
  state.step(1/60,true);view.tick(state);
  if(state.koala.reach===1){
   assert.ok(view.point('gum-leaves',v).distanceTo(hand.getWorldPosition(p))<.00001,'嫩枝与前掌同时移动');
   assert.ok(hand.getWorldPosition(v).y<eye.getWorldPosition(q).y-.13,'掌心在眼睛下方');
  }
  if(state.koala.pull===1){
   blade.localToWorld(v.set(0,0,1));assert.ok(v.distanceTo(lips.getWorldPosition(p))<.00001);
   eating++;
  }
  if(state.bird.flight>.5)flapping++;
 }
 assert.ok(eating>65&&flapping>40);
 assert.deepEqual(events.map(e=>e.type),['koala-feed','silvereye-flight','silvereye-land']);
 assert.equal(state.bird.perch,1);assert.equal(state.koala.action,'rest');assert.equal(state.leaf.eaten,0);
 state.tap('gum-leaves');assert.equal(state.koala.action,'feed');
});
test('横枝随身摇摆，单独点鸟会先歌唱，再展翼，考拉寻声转头',()=>{
 const events=[],state=createEucalyptus(e=>events.push(e)),view=makeEucalyptusDiorama(new T.Scene());
 state.tap('gum-bough');play(state,.86);view.tick(state);
 assert.ok(Math.abs(state.bough.angle)>.04);assert.equal(state.bird.journey,true);
 play(state,3);assert.equal(state.bird.perch,1);assert.equal(state.bough.angle,0);
 state.tap('silvereye');play(state,.24);assert.ok(state.koala.watch>.85);assert.equal(state.bird.journey,false);
 play(state,.70);assert.ok(state.bird.flight>.50);
 const last={x:state.bird.x,y:state.bird.y,z:state.bird.z,time:state.time};
 state.step(.04,false,true);assert.equal(state.time,last.time);assert.equal(state.bird.y,last.y);
 play(state,1.3);assert.equal(state.bird.perch,0);
 const p=gumPerches[0];
 assert.equal(state.bird.x,gumOrigin.x+p.x);assert.equal(state.bird.y,gumOrigin.y+p.y);
 assert.deepEqual(events.map(e=>e.type),['koala-rock','silvereye-flight','silvereye-land','silvereye-call','koala-listen','silvereye-flight','silvereye-land']);
 state.tap('koala');play(state,.64);assert.ok(state.koala.stretch>.99&&state.koala.call>.1);
});
test('入夜时鸟先落稳再睡，点睡鸟有回应；考拉夜里吃叶，白天偶尔小睡',()=>{
 const events=[],s=createEucalyptus(e=>events.push(e));
 s.tap('silvereye');play(s,.67);assert.equal(s.bird.journey,true);
 play(s,2.5,true);assert.ok(!s.bird.journey&&s.bird.sleep>.95);
 s.tap('silvereye');s.tap('gum-leaves');play(s,4.0,true);
 assert.ok(events.some(e=>e.type==='silvereye-sleep'));
 assert.equal(events.filter(e=>e.type==='silvereye-flight').length,1);
 play(s,38);assert.ok(s.koala.sleep>.75);s.tap('koala');
 assert.equal(events.at(-1).type,'koala-sleep');
 play(s,2,true);s.tap('koala');assert.equal(events.at(-1).type,'koala-call');
});
