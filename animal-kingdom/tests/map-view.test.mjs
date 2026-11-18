import assert from 'node:assert/strict';
import test from 'node:test';
import {OrthographicCamera,Raycaster,Scene,Vector2,Vector3} from 'three';
import {placeCamera,viewFor,portals,adjacentPortals} from '../src/map-view.js';
import {orchardPoints} from '../src/orchard-state.js';
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

test('果园近景在宽屏和竖屏都保留落果、果篮和两处花地',()=>{
 const poses=[...orchardPoints.apples,orchardPoints.basket,orchardPoints.dog,orchardPoints.cat,
  orchardPoints.hive,...orchardPoints.butterfly,...orchardPoints.beeFlowers];
 for(const ratio of [1440/900,430/740,390/844]){
  const camera=new OrthographicCamera();
  placeCamera(camera,viewFor('orchard',ratio),ratio);
  for(const {x,y,z} of poses){
   const screen=new Vector3(x,y,z).project(camera);
   assert.ok(Math.abs(screen.x)<.85&&Math.abs(screen.y)<.83,'近景留出角色与动作的边距');
  }
 }
});

test('树林像从动物身前看，水域仍看得到水面和前后落点',()=>{
 for(const ratio of [1440/900,430/740,390/844]){
  const rainforest=viewFor('rainforest',ratio),asia=viewFor('asia',ratio);
  assert.ok(rainforest.elevation>=.15&&rainforest.elevation<=.31);
  const portrait=Math.max(0,Math.min(1,(1.2-ratio)/.62));
  const before=.19+(.30-.19)*portrait**2*(3-2*portrait);
  assert.ok(Math.abs(asia.elevation-before-Math.PI/18)<1e-9);
  for(const rig of [rainforest,asia]){
   const camera=new OrthographicCamera();
   placeCamera(camera,rig,ratio);
   assert.ok(new Vector3(0,-1,-1).unproject(camera).y>.64,'近裁切面一直高于脚下的地面');
  }
  assert.ok(Math.abs(viewFor('river',ratio).elevation-(.25+(.43-.25)*portrait**2*(3-2*portrait))-Math.PI/18)<1e-9);
  for(const name of ['orchard','savanna','grove','coast']){
   assert.ok(viewFor(name,ratio).elevation<=.46,name+' 近景俯角过大');
  }
  const pool=viewFor('pond',ratio);
  assert.ok(pool.elevation>=.45&&pool.elevation<=.74,'池塘需要保留水面深度');
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
  for(const p of [riverPoints.frogPerch,...Object.values(adjacentPortals.river)]){
   const screen=new Vector3(p.x,p.y,p.z).project(camera);
   assert.ok(Math.abs(screen.x)<.9&&Math.abs(screen.y)<.9,`可点的石头和路标还在画面内，比例 ${ratio}`);
  }
 }
});
