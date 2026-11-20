import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bambooKinds,bambooOrigin,createBamboo,makeBambooDiorama} from '../src/bamboo.js';
import {hillHeight} from '../src/bamboo-state.js';

function play(state,seconds,night=false){
 for(let f=0;f<Math.ceil(seconds*60);f++)state.step(1/60,true,night);
}
test('妈妈先抬掌，等待回应的较大幼崽开口，两只交替接嫩竹',()=>{
 const events=[],state=createBamboo(e=>events.push(e)),view=makeBambooDiorama(new T.Scene());
 state.tap('panda-mother');play(state,.40);
 assert.deepEqual(events,[{type:'panda-greeting',animal:'panda-mother'}]);assert.ok(state.bears[0].greet>.95);
 assert.equal(state.bears[0].voice,0);assert.equal(state.bears[1].voice,0);
 play(state,.52);assert.deepEqual(events[1],{type:'panda-call',animal:'panda-left'});
 assert.ok(state.bears[1].voice>.10&&state.bears[2].look<-.68);
 assert.equal(state.bears[0].voice,0);assert.equal(state.bears[2].voice,0);
 for(const [age,peak] of [[1.17,false],[1.95,true],[2.45,false],[3.20,true]]){
  while(state.play.age+.000001<age)state.step(1/60,true);
  if(peak)assert.ok(state.bears[1].voice>.97);else assert.equal(state.bears[1].voice,0);
 }
 play(state,.83);
 const protectedParts=[],bambooPieces=[],sample=new T.Vector3(),matrix=new T.Matrix4();
 for(const {root} of view.bears)root.traverse(part=>{
  if(['眼圈长在脸上','奶油色肚皮与绕肩的深色毛带','宽圆的黑鼻头','吻部绒毛'].includes(part.name)){
   protectedParts.push({part,inverse:new T.Matrix4()});
  }
 });
 view.shoot.root.traverse(piece=>{if(piece.isMesh)bambooPieces.push(piece);});
 for(const n of [1,2]){
  state.tap('panda-bamboo');let bites=0;
  for(let i=0;i<310;i++){
   state.step(1/60,true);view.tick(state);
   // 两个方向都检查整段竹秆和陪衬叶的真实表面，包含弯下、咀嚼和收回。
   view.root.updateWorldMatrix(true,true);
   for(const {part,inverse} of protectedParts){
    inverse.copy(part.matrixWorld).invert();
    for(const piece of bambooPieces){
     const map=matrix.multiplyMatrices(inverse,piece.matrixWorld);
     const vertices=piece.geometry.attributes.position;
     for(let k=0;k<vertices.count;k++){
      assert.ok(sample.fromBufferAttribute(vertices,k).applyMatrix4(map).lengthSq()>=.996,
       '竹枝或竹叶进入了'+part.name);
     }
    }
   }
   if(state.play.bend===1){
    const geo=view.shoot.tip.geometry.attributes.position;
    const leaf=view.shoot.tip.localToWorld(new T.Vector3().fromBufferAttribute(geo,geo.count-2));
    assert.ok(leaf.distanceTo(view.bears[n].lips.getWorldPosition(new T.Vector3()))<.0001);
    const grip=view.bears[n].arms[n===1?1:0].paw;
    grip.worldToLocal(view.shoot.bloom.getWorldPosition(sample));
    assert.ok(sample.length()<=1.01&&sample.z>=.8,'竹梢要搭在幼崽伸出的前掌上');
    bites++;
   }
  }
  assert.ok(bites>110);
  assert.deepEqual(events.filter(e=>e.type==='panda-taste').at(-1),{type:'panda-taste',animal:bambooKinds[n]});
 }
});

test('两只熊猫在各自的坡上依次翻滚，转身走回，触地和活动边缘保持间距',()=>{
 const events=[],state=createBamboo(e=>events.push(e)),view=makeBambooDiorama(new T.Scene());
 const before=state.bears.map(b=>[b.x,b.z]),v=new T.Vector3();
 state.tap('panda-right');let rolling=false,nearFront=false,returning=false;
 for(let i=0;i<425;i++){
  state.step(1/60,true);view.tick(state);
  const [mum,left,right]=state.bears;
  if(right.roll>.3&&right.roll<6){rolling=true;if(state.play.age<1.4)assert.equal(left.roll,0);}
  nearFront||=right.z>2.1;returning||=right.walk>.93&&Math.cos(right.yaw)<-.94;
  for(const b of [left,right]){
   const head=view.point(bambooKinds[b.index],v);
   assert.ok(head.y>bambooOrigin.y+hillHeight(b.x,b.z)+.17);
   assert.ok(Math.hypot(b.x-mum.x,b.z-mum.z)>1.80);
   if(i%12===0){
    let clearance=Infinity;const actor=view.bears[b.index].root;actor.updateWorldMatrix(true,true);
    actor.traverse(part=>{
     if(!part.isMesh||!part.visible)return;
     const vertices=part.geometry.attributes.position;
     for(let j=0;j<vertices.count;j+=4){
      v.fromBufferAttribute(vertices,j).applyMatrix4(part.matrixWorld);
      clearance=Math.min(clearance,v.y-bambooOrigin.y-hillHeight(v.x-bambooOrigin.x,v.z-bambooOrigin.z)-.008);
     }
    });
    assert.ok(clearance>-.014&&clearance<.016,'真实坡面和滚动身体的间距 '+clearance);
   }
  }
  assert.ok(right.x-left.x>2.97);
 }
 assert.ok(rolling&&nearFront&&returning);
 assert.deepEqual(state.bears.map(b=>[b.x,b.z]),before);
 assert.deepEqual(events.filter(e=>e.type==='panda-roll').map(e=>e.animal),['panda-right','panda-left']);
 state.tap('panda-slope');assert.equal(state.play.lead,1);play(state,7.2);
 state.tap('panda-slope');assert.equal(state.play.lead,2);
});

test('切夜时先收动作，睡稳后点动物再出现睡眠符号，回到日间不会补播夜间输入',()=>{
 const events=[],state=createBamboo(e=>events.push(e));
 state.tap('panda-left');play(state,.65);state.tap('panda-bamboo');play(state,.05,true);
 state.tap('panda-left');assert.ok(!events.some(e=>e.type==='panda-sleep'));
 const t=state.time;state.step(.05,false,true);assert.equal(t,state.time);
 play(state,9.4,true);
 for(const k of bambooKinds.slice(0,3))state.tap(k);
 assert.ok(state.bears.every(b=>b.sleep>.94));
 assert.deepEqual(events.filter(e=>e.type==='panda-sleep').map(e=>e.animal),bambooKinds.slice(0,3));
 play(state,1);assert.ok(state.bears.every(b=>b.sleep>0&&b.sleep<.6));
 play(state,1);assert.ok(state.bears.every(b=>b.sleep===0));
 assert.equal(events.filter(e=>e.type==='panda-lower-bamboo').length,0);
 state.tap('panda-mother');assert.equal(events.at(-1).type,'panda-greeting');
 play(state,.22);play(state,.40,true);assert.equal(events.filter(e=>e.type==='panda-call').length,0);
});
