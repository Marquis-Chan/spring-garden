import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import {createMacaw,makeMacawDiorama,macawPerches} from '../src/macaw.js';
import {createRainforest,rainPoints} from '../src/rainforest-state.js';
import {groundHeight} from '../src/diorama.js';
import {placeCamera,viewFor} from '../src/map-view.js';

function run(seconds,update){for(let i=0;i<Math.ceil(seconds*60);i++)update(1/60);}
test('同一声招呼由巨嘴鸟回鸣，落香蕉能将高枝鹦鹉引到前枝，夜间安眠',()=>{
 const events=[];
 const macaw=createMacaw(e=>{
  events.push(e);
  if(e.type==='macaw-invite-toucan')forest.answerMacaw(e);
 });
 const forest=createRainforest(e=>{events.push(e);if(e.type==='drop-banana-drop')macaw.onBananaDrop();});
 const advance=t=>run(t,dt=>{macaw.step(dt,true);forest.step(dt,true);});
 macaw.tap();advance(.40);assert.ok(macaw.bird.bill>.2&&macaw.bird.stretch>.36);
 assert.ok(Math.abs(forest.toucan.look)>.12);
 advance(1.48);assert.ok(!events.some(e=>e.type==='toucan-call'));
 advance(1.14);assert.equal(events.filter(e=>e.type==='toucan-call'&&e.reason==='macaw').length,1);
 macaw.tap();advance(1.9);assert.equal(macaw.bird.site,1);
 macaw.tap();advance(.7);assert.ok(macaw.bird.preen>.95);
 forest.tapDropBanana();advance(4.25);
 assert.equal(macaw.bird.site,0);assert.ok(events.some(e=>e.type==='macaw-watch-banana'));
 assert.ok(events.some(e=>e.type==='drop-banana-land'));
 forest.setNight(true);macaw.setNight(true);advance(2.5);assert.equal(macaw.bird.sleep,1);
 const calls=events.filter(e=>e.type==='macaw-call').length;
 macaw.tap();macaw.onBananaDrop();advance(3);assert.equal(macaw.bird.site,0);
 assert.equal(events.filter(e=>e.type==='macaw-call').length,calls);
 assert.ok(events.some(e=>e.type==='sleep'&&e.animal==='macaw'));
});
test('两只脚都停在实枝，翼腕连续拍打，飞行避开原栖枝，梳羽时弯喙触到覆羽',()=>{
 const m=createMacaw(),v=makeMacawDiorama(new T.Scene(),groundHeight);
 const rails=v.root.getObjectsByProperty('name','双脚抓住的枝面'),down=new T.Vector3(0,-1,0);
 const ray=new T.Raycaster(),p=new T.Vector3(),tip=new T.Vector3();
 const step=dt=>{m.step(dt,true);v.tick(m);v.root.updateMatrixWorld(true);};
 function planted(){
  for(const foot of v.feet){
   foot.getWorldPosition(p);ray.set(p.clone().addScaledVector(down,-.25),down);
   const h=ray.intersectObjects(rails)[0]?.point.y;
   assert.ok(Math.abs(p.y-h)<.006,'脚掌中心须压在枝顶');
  }
 }
 step(1/60);planted();
 m.tap();run(1.68,step);m.tap();const flap=[];
 const shoulder=v.bird.getObjectsByProperty('name','绯红翼肩')[1];
 const cameras=[390/735,1440/836].map(ratio=>{
  const camera=new T.OrthographicCamera();const rig=viewFor('rainforest',ratio);
  placeCamera(camera,rig,ratio);return {camera,rig,ratio};
 });
 run(1.68,dt=>{
  step(dt);flap.push(m.bird.flap);
  for(const b of [...rainPoints.monkeyBranches,...rainPoints.toucanBranches,rainPoints.sloth]){
   assert.ok(Math.hypot(m.bird.x-b.x,m.bird.y-b.y,m.bird.z-b.z)>1.1);
  }
  // 飞行弧在三维中有间距，也应在横屏和竖屏中让出巨嘴鸟、树懒的脸。
  for(const {camera,rig,ratio} of cameras){
   const projected=new T.Vector3(m.bird.x,m.bird.y+.31,m.bird.z).project(camera);
   for(const animal of [...rainPoints.toucanBranches.map(p=>({...p,y:p.y+.24})),rainPoints.sloth]){
    p.set(animal.x,animal.y,animal.z).project(camera);
    const separation=Math.hypot((p.x-projected.x)*ratio,p.y-projected.y)*rig.height/2;
    assert.ok(separation>.90,'飞行中的鹦鹉挡住原动物');
   }
  }
 });
 assert.ok(Math.max(...flap)>.96&&Math.min(...flap)<-.96);
 assert.equal(m.bird.x,macawPerches[1].x);planted();
 m.tap();run(.7,step);const bill=v.bird.getObjectByName('向下弯曲的象牙色上喙');
 bill.localToWorld(tip.set(0,-.087,.176));let nearest=Infinity;
 shoulder.traverse(node=>{
  const vertices=node.geometry?.attributes.position;if(!vertices)return;
  for(let i=0;i<vertices.count;i++){
   node.localToWorld(p.fromBufferAttribute(vertices,i));nearest=Math.min(nearest,p.distanceTo(tip));
  }
 });
 assert.ok(nearest<.032,'梳羽时喙尖应贴到朝向镜头的右翼');
});
test('切夜后飞行仍落到枝上，离开场景期间保持原位',()=>{
 const m=createMacaw();m.tap();run(1.7,dt=>m.step(dt,true));m.tap();run(.55,dt=>m.step(dt,true));
 m.setNight(true);const before={...m.bird};run(20,dt=>m.step(dt,false));assert.deepEqual(m.bird,before);
 run(3.8,dt=>m.step(dt,true));assert.equal(m.bird.sleep,1);assert.equal(m.bird.y,macawPerches[1].y);
});

test('较低帧率时，巨嘴鸟仍按实录时间接话；切夜会取消尚未播放的答声',()=>{
 let seconds=0;const responses=[];
 const forest=createRainforest(e=>{if(e.reason==='macaw')responses.push(e);},{soundClock:()=>seconds});
 const bird=createMacaw().bird;
 forest.answerMacaw(bird,3.86);seconds=3.7;forest.step(.04,true);assert.equal(responses.length,0);
 seconds=3.88;forest.step(.04,true);assert.equal(responses.length,1);
 forest.answerMacaw(bird,3.86);forest.setNight(true);seconds=7.9;forest.step(.04,true);assert.equal(responses.length,1);
});
