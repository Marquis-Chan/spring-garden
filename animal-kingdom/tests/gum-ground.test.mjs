import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEucalyptus,makeEucalyptusDiorama} from '../src/eucalyptus.js';
import {gumOrigin} from '../src/eucalyptus-state.js';
import {grazingTuft,wallabyStop} from '../src/gum-ground-state.js';
const dt=1/60;
function play(s,sec,night=false){for(let i=0;i<Math.ceil(sec/dt);i++)s.step(dt,true,night);}

test('妈妈落稳后袋中探头；点草只跳两次，嘴碰草后才变短，喂食后能再玩',()=>{
 const events=[],s=createEucalyptus(e=>events.push(e.type)),v=makeEucalyptusDiorama(new T.Scene());
 const w=s.ground.wallaby;
 s.tap('wallaby');play(s,1.5);assert.ok(w.peek>.94);
 v.tick(s);
 const young=v.root.getObjectByName('小袋鼠的脑袋'),face=new T.Vector3(),rim=new T.Vector3();
 const pouch=v.root.getObjectByName('毛绒袋沿');pouch.getWorldPosition(rim);
 assert.ok(young.getWorldPosition(face).y>rim.y+.08,'幼崽面部露出袋缘');
 s.tap('wallaby-grass');let leaps=0,prev=0,eating=0;
 for(let i=0;i<335;i++){
  s.step(dt);v.tick(s);
  if(w.up>0&&prev===0)leaps++;
  prev=w.up;
  if(w.nibble>.97){
   const tip=v.hintNodes.wallaby.getObjectByName('乌黑鼻尖').getWorldPosition(face);
   assert.ok(Math.hypot(tip.x-gumOrigin.x-grazingTuft.x,tip.z-gumOrigin.z-grazingTuft.z)<.17);
   assert.ok(tip.y>gumOrigin.y+.1&&tip.y<gumOrigin.y+.27,'鼻子能咬到草尖，脚下草地留有空间');
   eating++;
  }
 }
 assert.equal(leaps,2);assert.ok(eating>48);assert.equal(w.x,wallabyStop.x);assert.ok(s.ground.grass.height<.61);
 play(s,16);assert.equal(w.site,0);assert.ok(s.ground.grass.height>.96);
 assert.ok(events.includes('wallaby-graze'));
});
test('银眼鸟先叫，妈妈再侧耳、幼崽接着探头；重复点草不传送或中断半空动作',()=>{
 const s=createEucalyptus();s.tap('wallaby-grass');play(s,.75);const w=s.ground.wallaby,x=w.x,z=w.z;
 s.tap('wallaby-grass');s.tap('wallaby');assert.equal(w.x,x);assert.equal(w.z,z);
 play(s,3.9);play(s,5);
 s.tap('silvereye');play(s,.31);assert.ok(w.look>.24&&w.peek<.05);
 play(s,1.15);assert.ok(w.look>.98&&w.peek>.84);
});
test('点夜晚的洞出睡眠反馈，白天先探头、再走进落叶闻甲虫；刺猬进洞时头不穿过拱口',()=>{
 const events=[],s=createEucalyptus(e=>events.push(e.type)),v=makeEucalyptusDiorama(new T.Scene());
 const b=s.ground.hedgehog;play(s,2.8,true);s.tap('hedgehog-den');assert.equal(events.at(-1),'hedgehog-den-sleep');assert.ok(!s.canTap('hedgehog'));
 play(s,2.85,false);assert.ok(s.canTap('hedgehog'));assert.equal(b.action,'peek');
 s.tap('hedgehog');const door=v.root.getObjectByName('拱形洞口'),word=new T.Vector3();let checked=0;
 for(let i=0;i<320;i++){
  s.step(dt,true,false);v.tick(s);
  if(b.action==='out'&&b.dist<.72){
   for(const name of ['短圆绒耳','湿亮的小鼻尖','层层交错的背刺']){
    const node=v.hintNodes.hedgehog.getObjectByName(name);
    const pos=node.geometry.attributes.position;
    for(let p=0;p<pos.count;p+=5){
     node.localToWorld(word.fromBufferAttribute(pos,p));door.worldToLocal(word);
     if(Math.abs(word.z)>.04)continue;
     assert.ok((word.x/.445)**2+((word.y+.019)/.633)**2<1,'耳部、鼻端都在拱形洞口内侧');checked++;
    }
   }
  }
 }
 assert.ok(checked>65);assert.ok(events.includes('hedgehog-forage'));assert.equal(b.action,'forage');
 const beetle=v.root.getObjectByName('落叶边的金龟子');
 assert.equal(beetle.visible,false,'觅食后甲虫从落叶边消失');
 play(s,.15,true);s.tap('hedgehog-den');assert.notEqual(events.at(-1),'hedgehog-den-sleep');
 play(s,4.5,true);v.tick(s);assert.equal(events.at(-1),'hedgehog-den-sleep');assert.equal(beetle.visible,true,'回窝后下次仍能再找到甲虫');
 assert.equal(b.action,'den');assert.equal(b.visible,false);assert.ok(!s.canTap('hedgehog'));
 const before=s.ground.time;s.step(dt,false,true);assert.equal(s.ground.time,before);
});
