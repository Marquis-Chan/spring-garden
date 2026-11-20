import assert from 'node:assert/strict';
import test from 'node:test';
import {OrthographicCamera,Raycaster,Scene,Vector2,Vector3} from 'three';
import {atlasNeighborhood,dragAtlas,habitats,nearestHabitat,placeCamera,viewFor,portals,adjacentPortals} from '../src/map-view.js';
import {orchardPoints} from '../src/orchard-state.js';
import {createOrchardRabbits, rabbitCarrotPoint} from '../src/orchard-rabbits.js';
import {grovePoints} from '../src/grove-state.js';
import {woodlandPoints} from '../src/woodland-state.js';
import {riverPoints} from '../src/river-state.js';
import {makeDiorama} from '../src/diorama.js';

const actors=[
 [-1.67,.75,-.48],[1.93,-.17,1.23],[8.6,1.27,1.25],[10.1,2.61,-.95],
 [12.2,1.27,1.5],[12.15,2.75,-1.38],[.69,.72,.23]
];

test('宽屏和竖屏全景里，四个角色换过落点也能看见',()=>{
 for(const ratio of [1440/900,430/740,390/844,1280/540]){
  const camera=new OrthographicCamera();
  placeCamera(camera,viewFor('overview',ratio),ratio);
  const projected=[...actors,...Object.values(portals).map(p=>[p.x,p.y,p.z])]
   .map(p=>new Vector3(...p).project(camera));
  for(const p of projected){
   assert.ok(Math.abs(p.x)<.87&&Math.abs(p.y)<.87,`仍要看见角色和路口，比例 ${ratio}，坐标 ${p.x},${p.y}`);
  }
  assert.ok(projected[0].distanceTo(projected[2])>.55,'两块互动之间需要清楚的距离');
 }
});

test('同一张地图的近景给对应动物更大空间',()=>{
 for(const ratio of [1.6,430/740]){
  const overview=viewFor('overview',ratio);
  const pond=viewFor('pond',ratio),grove=viewFor('grove',ratio);
  assert.ok(pond.height<overview.height&&grove.height<overview.height);
  assert.ok(pond.x<overview.x&&overview.x<grove.x);
 }
});

test('全景前排的兔脚和胡萝卜在路牌上方留出触控余量',()=>{
 const family=createOrchardRabbits(),camera=new OrthographicCamera();
 for(const [width,height] of [[1440,833],[740,368],[430,631],[390,735]]){
  const ratio=width/height;
  placeCamera(camera,viewFor('overview',ratio),ratio);
  for(const p of [...family.rabbits,rabbitCarrotPoint]){
   const location=new Vector3(p.x,p.y,p.z).project(camera);
   assert.ok((1+location.y)*height/2>=22, `画面底边留足点按范围，宽度 ${width}`);
   assert.ok((1-Math.abs(location.x))*width/2>=22, `左右两侧留足点按范围，宽度 ${width}`);
  }
 }
});

test('果园近景在宽屏和竖屏都保留落果、果篮和两处花地',()=>{
 const poses=[...orchardPoints.apples,orchardPoints.basket,orchardPoints.dog,orchardPoints.cat,
  orchardPoints.hive,...orchardPoints.butterfly,...orchardPoints.beeFlowers];
 for(const ratio of [1440/900,430/740,390/844,1440/833,430/678,390/782,844/328]){
  const camera=new OrthographicCamera();
  placeCamera(camera,viewFor('orchard',ratio),ratio);
  for(const {x,y,z} of poses){
   const screen=new Vector3(x,y,z).project(camera);
   assert.ok(Math.abs(screen.x)<.85&&Math.abs(screen.y)<.83,'近景留出角色与动作的边距');
  }
 }
});

test('狐狸在两堆落叶间行走时，林兔的两处草丛都仍可直接点中',()=>{
 for(const [width,height] of [[1440,833],[740,368],[430,678],[390,782]]){
  const camera=new OrthographicCamera(),ratio=width/height;
  placeCamera(camera,viewFor('grove',ratio),ratio);
  const [from,to]=woodlandPoints.foxStops;
  for(let step=0;step<=12;step++){
   const progress=step/12;
   const fox=new Vector3(from.x+(to.x-from.x)*progress,from.y+.39,from.z+(to.z-from.z)*progress).project(camera);
   for(const g of grovePoints.grasses){
    const grass=new Vector3(g.x,g.y+.24,g.z+.45).project(camera);
    assert.ok(Math.hypot((fox.x-grass.x)*width/2,(fox.y-grass.y)*height/2)>35);
   }
  }
 }
});

test('树林像从动物身前看，水域仍看得到水面和前后落点',()=>{
 for(const ratio of [1440/900,430/740,390/844]){
  const rainforest=viewFor('rainforest',ratio),asia=viewFor('asia',ratio);
  const portrait=Math.max(0,Math.min(1,(1.2-ratio)/.62));
  const before=.19+(.30-.19)*portrait**2*(3-2*portrait);
  assert.ok(Math.abs(asia.elevation-before-Math.PI/18)<1e-9);
  for(const rig of [rainforest,asia]){
   const camera=new OrthographicCamera();
   placeCamera(camera,rig,ratio);
   assert.ok(new Vector3(0,-1,-1).unproject(camera).y>.64,'近裁切面一直高于脚下的地面');
  }
  assert.ok(Math.abs(viewFor('river',ratio).elevation-(.25+(.43-.25)*portrait**2*(3-2*portrait))-Math.PI/18)<1e-9);
  for(const [name,wide,narrow] of [['orchard',.23,.37],['grove',.26,.43]]){
   const original=wide+(narrow-wide)*portrait**2*(3-2*portrait);
   assert.ok(Math.abs(viewFor(name,ratio).elevation-original-Math.PI/18)<1e-9);
  }
  for(const [name,wide,narrow,adjustment] of [['rainforest',.18,.29,10],['coast',.28,.45,20],['ocean',.12,.22,20]]){
   const baseline=wide+(narrow-wide)*portrait**2*(3-2*portrait);
   assert.ok(Math.abs(viewFor(name,ratio).elevation-baseline-adjustment*Math.PI/180)<1e-9,name+' 近景俯角增量');
  }
  assert.ok(viewFor('savanna',ratio).elevation<=.46,'草原近景俯角过大');
  const pool=viewFor('pond',ratio);
  assert.ok(pool.elevation>=.45&&pool.elevation<=.74,'池塘需要保留水面深度');
 }
});

test('横竖屏总图可拖至每处原坐标，碰到最远岸边后可以立即折返',()=>{
 for(const [width,height] of [[1440,833],[390,735],[740,368]]){
  const base=viewFor('overview',width/height);
  let view={...base};
  for(const [name,stop] of Object.entries(habitats)){
   const dx=stop.x-view.x,dz=stop.z-view.z,a=base.azimuth,s=height/base.height;
   const screenX=-(dx*Math.cos(a)-dz*Math.sin(a))*s;
   const screenY=-(dx*Math.sin(a)+dz*Math.cos(a))*s*Math.sin(base.elevation);
   for(let i=0;i<12;i++)view={...view,...dragAtlas(view,screenX/12,screenY/12,height)};
   assert.ok(Math.hypot(stop.x-view.x,stop.z-view.z)<1e-6,name);
   assert.equal(nearestHabitat(view),name);
   assert.ok(atlasNeighborhood(view,width/height).includes(name));
  }
  view={...view,...dragAtlas(view,-width*100,0,height)};
  const back=dragAtlas(view,25,0,height);
  assert.ok(back.x<view.x);
 }
});

test('俯视的河岸给日月和云留出天空，前景石头和路标仍在画幅内',()=>{
 const scene=new Scene(),{land}=makeDiorama(scene);
 scene.updateMatrixWorld(true);
 const camera=new OrthographicCamera(),ray=new Raycaster();
 for(const ratio of [1.6,430/740,390/844,1280/540]){
  placeCamera(camera,viewFor('river',ratio),ratio);
  for(const x of [.26,.35,.53]){
   ray.setFromCamera(new Vector2(2*x-1,.82),camera);
   assert.equal(ray.intersectObject(land,false).length,0,`日月上方须露出天空，比例 ${ratio}`);
  }
  for(const p of [riverPoints.birdPerch,...Object.values(adjacentPortals.river)]){
   const screen=new Vector3(p.x,p.y,p.z).project(camera);
   assert.ok(Math.abs(screen.x)<.9&&Math.abs(screen.y)<.9,`可点的石头和路标还在画面内，比例 ${ratio}`);
  }
 }
});
