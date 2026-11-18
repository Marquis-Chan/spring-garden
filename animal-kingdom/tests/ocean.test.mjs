import assert from 'node:assert/strict';
import test from 'node:test';
import {Mesh,Raycaster,Scene,Vector3} from 'three';
import {makeOceanDiorama} from '../src/ocean-diorama.js';
import {createOcean,oceanPoints} from '../src/ocean-state.js';

const step=(sea,time,active)=>{for(let at=0;at<time;at+=.01)sea.step(.01,active);};

test('鲸尾水流到达后海豚才回应，重复点鲸不叠加动作',()=>{
 const events=[],sea=createOcean(e=>events.push(e));
 sea.tap('whale');sea.tap('whale');step(sea,.81);
 assert.equal(events.filter(e=>e.type==='ocean-whale').length,1);
 assert.equal(events.some(e=>e.type==='ocean-dolphin'),false);
 step(sea,1.45);
 assert.equal(events.filter(e=>e.type==='ocean-dolphin'&&e.reason==='whale').length,1);
});

test('鲸尾水流到了而海豚正在翻身，会等海豚翻完再回应一次',()=>{
 const events=[],sea=createOcean(event=>events.push(event));
 step(sea,.65,true);
 sea.tap('whale');
 step(sea,.60,true);
 sea.tap('dolphin');
 step(sea,1.35,true);
 assert.deepEqual(events.filter(e=>e.type==='ocean-dolphin').map(e=>e.reason),['tap']);
 step(sea,1.5,true);
 assert.deepEqual(events.filter(e=>e.type==='ocean-dolphin').map(e=>e.reason),['tap','whale']);
});

test('鲨鱼经过时小丑鱼躲进海葵再出来，独立点小丑鱼才让海马探身',()=>{
 const events=[],sea=createOcean(e=>events.push(e));
 sea.tap('shark');step(sea,1.28);
 assert.ok(sea.animals.clown.hide>.8);
 assert.equal(events.filter(e=>e.type==='ocean-clown'&&e.reason==='shark').length,1);
 assert.equal(events.some(e=>e.type==='ocean-horse'),false);
 step(sea,2.18);
 assert.equal(sea.animals.clown.hide,0);
 sea.tap('clown');step(sea,1.15);
 assert.equal(events.filter(e=>e.type==='ocean-horse'&&e.reason==='clown').length,1);
});

test('点海星与贝壳只移动同一只海星，碰贝壳后小丑鱼跟气泡转头',()=>{
 const events=[],sea=createOcean(e=>events.push(e));
 sea.tap('star');sea.tapProp('shell');step(sea,.68);
 assert.equal(events.filter(e=>e.type==='ocean-star').length,1);
 assert.equal(events.some(e=>e.type==='ocean-shell'),false);
 step(sea,.74);
 const shell=events.findIndex(e=>e.type==='ocean-shell');
 const clown=events.findIndex(e=>e.type==='ocean-clown'&&e.reason==='shell');
 assert.ok(shell>0&&clown>shell);
});

test('海葵小鱼可以点到，会回去，下一次能再叫出',()=>{
 const events=[],sea=createOcean(e=>events.push(e));
 assert.equal(sea.visitor.visible,false);
 sea.tapProp('anemone');sea.tapProp('anemone');step(sea,1.21);
 assert.equal(events.filter(e=>e.type==='ocean-visitor').length,1);
 assert.ok(sea.visitor.visible&&sea.visitor.amount>.99);
 sea.tapVisitor();step(sea,.25);
 assert.ok(sea.visitor.pose>.4);
 step(sea,6.48);assert.equal(sea.visitor.visible,false);
 sea.tapProp('anemone');step(sea,1.12);
 assert.ok(sea.visitor.visible);
 assert.equal(events.filter(e=>e.type==='ocean-visitor').length,2);
});

test('海葵动作还没结束就点鲨鱼，小丑鱼仍会在游近时再次躲起来',()=>{
 const events=[],sea=createOcean(event=>events.push(event));
 step(sea,1.5,true);
 sea.tapProp('anemone');
 step(sea,.83,true);
 sea.tap('shark');
 step(sea,1.4,true);
 assert.equal(events.filter(event=>event.type==='ocean-clown'&&event.reason==='shark').length,1);
 assert.ok(sea.visitor.visible);
});

test('海底六个居民自己移位，鱼头大部分时间朝游动方向，海马不藏到草背后',()=>{
 const events=[],sea=createOcean(e=>events.push(e)),tracks={};
 let aligned=0,samples=0;
 for(let i=0;i<115;i++){
  const prev=Object.fromEntries(Object.entries(sea.animals).map(([name,a])=>[name,{x:a.x,z:a.z}]));
  step(sea,.10,true);
  for(const [name,a] of Object.entries(sea.animals)){
   (tracks[name]??=[]).push({x:a.x,y:a.y,z:a.z});
   if(i>14 && ['whale','dolphin','shark','clown'].includes(name)){
    const dx=a.x-prev[name].x,dz=a.z-prev[name].z,len=Math.hypot(dx,dz);
    if(len>.006){aligned+=Number((dx*Math.sin(a.heading)+dz*Math.cos(a.heading))/len>.55);samples++;}
   }
  }
  if(i>12)assert.ok(sea.animals.horse.z>=17.13);
  if(i>12)assert.ok(sea.animals.star.x>=53.06&&sea.animals.star.x<=53.48);
 }
 assert.deepEqual(events,[]);
 for(const [name,points] of Object.entries(tracks)){
  assert.ok(Math.max(...points.map(a=>Math.max(...points.map(b=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)))))>.16,name);
 }
 assert.ok(aligned/samples>.85);
});

test('海星真伸腕碰壳才冒泡，中心不盖住贝壳；鲨鱼不同静默起相都可触发旧躲藏',()=>{
 const events=[],sea=createOcean(e=>events.push(e));
 step(sea,3.25,true);sea.tapProp('shell');
 step(sea,.68,true);
 assert.ok(!events.some(e=>e.type==='ocean-shell'));
 while(sea.time<5&&!events.some(e=>e.type==='ocean-shell')) step(sea,.02,true);
 const a=sea.animals.star;
 assert.ok(a.touch>.65&&a.x>53.55&&oceanPoints.shell.x-a.x>.52);
 assert.ok(events.some(e=>e.type==='ocean-shell'));
 for(const phase of [0,1.5,3,4.5,6,7.5,9,10.5,12]){
  const e=[],sample=createOcean(event=>e.push(event));
  step(sample,phase,true);sample.tap('shark');step(sample,1.85,true);
  assert.equal(e.filter(x=>x.type==='ocean-clown'&&x.reason==='shark').length,1,String(phase));
 }
});

test('点海草后海马确实扫过草尖，只有当小丑鱼游得近才一起回身',()=>{
 let didReact=false,didStay=false;
 for(const phase of [0,1,2,3,4,5,6,7,8]){
  const e=[],sea=createOcean(event=>e.push(event));
  step(sea,phase,true);sea.tapProp('kelp');step(sea,1.52,true);
  const touch=e.findIndex(x=>x.type==='ocean-kelp-touch');
  assert.ok(touch>0,String(phase));
  const react=e.findIndex(x=>x.type==='ocean-clown'&&x.reason==='kelp');
  if(react>=0){assert.ok(react>touch);didReact=true;} else didStay=true;
 }
 assert.ok(didReact&&didStay);
});

test('鲸尾水流起于摆动后的尾根；海马用画出来的吻端轻碰画出来的叶尖',()=>{
 const scene=new Scene(),world=makeOceanDiorama(scene),tail=new Vector3(),nose=new Vector3(),tip=new Vector3();
 const flukes=scene.getObjectByName('鲸尾根'),muzzle=scene.getObjectByName('海马吻端'),blade=scene.getObjectByName('海草叶尖');
 for(const phase of [.3,3,7,12]){
  const events=[],sea=createOcean(e=>events.push(e));step(sea,phase,true);
  sea.tap('whale');sea.tapProp('kelp');
  let wake=false,contact=false;
  for(let i=0;i<150;i++){
   sea.step(.01,true);world.tick(sea,0);
   if(!wake&&sea.current){
    const c=sea.current;
    assert.ok(flukes.getWorldPosition(tail).distanceTo(new Vector3(c.x,c.y,c.z))<.002);
    wake=true;
   }
   if(!contact&&events.some(e=>e.type==='ocean-kelp-touch')){
    assert.ok(muzzle.getWorldPosition(nose).distanceTo(blade.getWorldPosition(tip))<.026);
    contact=true;
   }
   if(contact&&wake)break;
  }
  assert.ok(wake&&contact,'入场相位 '+phase);
 }
});

test('海豚、鲨鱼和小丑鱼的背鳍整个根部嵌进躯干，鳍尖露出背脊',()=>{
 const water=makeOceanDiorama(new Scene()),ray=new Raycaster(),point=new Vector3(),down=new Vector3(0,-1,0);
 for(const name of ['dolphin','shark','clown']){
  const model=water.actors[name].root.children[0],dorsal=model.getObjectByName('长在背脊上的背鳍');
  const body=model.children[0],surface=new Mesh(body.geometry,body.material),vertices=dorsal.geometry.attributes.position;
  for(const i of [0,3,6,9,12,15,vertices.count-1]){
   point.fromBufferAttribute(vertices,i);
   ray.set(new Vector3(point.x,1,point.z),down);
   const top=ray.intersectObject(surface,false)[0].point.y;
   assert.ok(i<18?point.y<top-.005:point.y>top+.025,name+' 的鳍根和鳍尖');
  }
 }
});
