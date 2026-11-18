import {clamp,ease,mix} from './state.js';

export const portals={
 pond:{x:3.27,y:.54,z:3.24},
 grove:{x:7.02,y:.54,z:.71},
 orchard:{x:5.33,y:.84,z:3.24},
 savanna:{x:11.75,y:.54,z:3.66},
 river:{x:9.52,y:.54,z:5.08},
 asia:{x:9.47,y:.58,z:-1.77},
 rainforest:{x:11.03,y:.58,z:-1.02},
 coast:{x:5.05,y:.54,z:5.46},
 ocean:{x:6.47,y:.54,z:6.55}
};

// 中心与半径覆盖每处动物的实际活动区。总图和近景共用同一套世界坐标。
export const habitats={
 pond:{x:0,z:.35,r:5},grove:{x:10.2,z:.55,r:5},orchard:{x:4.5,z:7.55,r:4.1},
 savanna:{x:18.55,z:5.9,r:5.5},river:{x:27.8,z:8,r:5.3},asia:{x:21,z:-.75,r:5.5},
 rainforest:{x:36.9,z:.2,r:5.5},coast:{x:36.7,z:14.2,r:5.35},ice:{x:43.7,z:21.9,r:4.5},
 ocean:{x:54.8,z:16.1,r:6}
};

// 总图路牌沿用世界坐标，放在各处的空地或水边，给动物和可玩的物件留出位置。
export const atlasWaymarks={
 pond:{x:-2.85,z:3.69},grove:{x:12.5,z:2.67},orchard:{x:6.95,z:8.45},
 savanna:{x:19.8,z:9.35},river:{x:25.35,z:10.5},asia:{x:23.8,z:1.92},
 rainforest:{x:39.1,z:3.55},coast:{x:39.8,z:13.15},ice:{x:43,z:25.45},
 ocean:{x:56.8,z:19.8}
};
const mapEdges=[[-1.3,-1.8],[37.8,-1.8],[56.2,13.8],[56.2,18.2],[44.5,23.15],
 [41.6,23.15],[3.4,9.35],[-1.3,3.9]];

function onMap(x,z){
 let inside=true,distance=Infinity,nearest={x,z};
 for(let i=0;i<mapEdges.length;i++){
  const [ax,az]=mapEdges[i],[bx,bz]=mapEdges[(i+1)%mapEdges.length];
  const dx=bx-ax,dz=bz-az;
  if(dx*(z-az)-dz*(x-ax)<0)inside=false;
  const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz));
  const px=ax+t*dx,pz=az+t*dz,d2=(x-px)**2+(z-pz)**2;
  if(d2<distance){distance=d2;nearest={x:px,z:pz};}
 }
 return inside?{x,z}:nearest;
}

// 把屏幕位移还原到地面，手指按住的那片草会跟着它走。到岸边后反向拖立即生效。
export function dragAtlas(view,dx,dy,canvasHeight){
 const scale=view.height/canvasHeight,a=view.azimuth;
 const across=-dx*scale,forward=-dy*scale/Math.sin(view.elevation);
 return onMap(view.x+across*Math.cos(a)+forward*Math.sin(a),view.z-across*Math.sin(a)+forward*Math.cos(a));
}
export function atlasNeighborhood(view,ratio){
 const result=[];
 for(const [name,p] of Object.entries(habitats)){
  const dx=p.x-view.x,dz=p.z-view.z;
  const horizontal=dx*Math.cos(view.azimuth)-dz*Math.sin(view.azimuth);
  const vertical=(1.1-view.y)*Math.cos(view.elevation)-(dx*Math.sin(view.azimuth)+dz*Math.cos(view.azimuth))*Math.sin(view.elevation);
  if(Math.abs(horizontal)<=view.height*ratio/2+p.r&&Math.abs(vertical)<=view.height/2+p.r*Math.sin(view.elevation)+2.8)result.push(name);
 }
 return result;
}
export function nearestHabitat(view){
 return Object.keys(habitats).reduce((best,name)=>{
  const d=p=>(p.x-view.x)**2+(p.z-view.z)**2;
  return d(habitats[name])<d(habitats[best])?name:best;
 },'pond');
}
export const adjacentPortals={
 grove:{asia:{x:12.85,y:.57,z:-.52}},
 asia:{grove:{x:17.59,y:.57,z:1.93},rainforest:{x:24.32,y:.56,z:1.83}},
 rainforest:{asia:{x:33.48,y:.56,z:2.54}},
 savanna:{river:{x:21.43,y:.64,z:8.23}},
 river:{savanna:{x:25.51,y:.65,z:10.70},coast:{x:30.75,y:.62,z:10.18}},
 coast:{river:{x:33.74,y:.68,z:11.73},ice:{x:40.25,y:.58,z:15.8},ocean:{x:39.68,y:.64,z:11.57}},
 ocean:{coast:{x:51.02,y:.12,z:16.51},ice:{x:50,y:.12,z:19.2}},
 ice:{coast:{x:40.3,y:.48,z:20},ocean:{x:47,y:.48,z:21.5}}
};

export function viewFor(mode,ratio) {
 const portrait=ease((1.2-ratio)/.62);
 if(mode==='overview')return {
  x:mix(4.68,4.88,portrait),y:mix(.92,1.30,portrait),z:mix(2.64,3.03,portrait),
  height:Math.max(11.72,mix(18.2,18.8,portrait)/ratio),
  azimuth:mix(-.045,-.23,portrait),elevation:mix(.67,.73,portrait)
 };
 if(mode==='orchard')return {
  x:mix(4.55,4.34,portrait),y:mix(2.17,1.62,portrait),z:mix(5.94,6.10,portrait),
  height:Math.max(7.40,mix(9.50,6.95,portrait)/ratio),
  azimuth:mix(.018,-.14,portrait),elevation:mix(.23,.37,portrait)+Math.PI/18
 };
 if(mode==='savanna')return {
  x:mix(18.57,18.23,portrait),y:mix(1.91,1.75,portrait),z:mix(5.81,5.74,portrait),
  height:Math.max(7.35,mix(10.6,8.65,portrait)/ratio),
  azimuth:mix(.01,-.12,portrait),elevation:mix(.24,.36,portrait)
 };
 if(mode==='river')return {
  // 加俯角后稍微拉远并抬高取景中心，给日月与可拖云朵保留天空。
  x:mix(27.77,27.68,portrait),y:2.24,z:mix(7.91,7.85,portrait),
  height:Math.max(8.50,mix(11.5,8.40,portrait)/ratio),
  azimuth:mix(.01,-.14,portrait),elevation:mix(.25,.43,portrait)+Math.PI/18
 };
 if(mode==='asia')return {
  x:mix(20.97,21.21,portrait),y:mix(1.72,1.51,portrait),z:mix(-.81,-.72,portrait),
  height:Math.max(6.83,mix(11.2,8.14,portrait)/ratio),
  azimuth:mix(.028,-.12,portrait),elevation:mix(.19,.30,portrait)+Math.PI/18
 };
 if(mode==='rainforest')return {
  x:mix(36.89,36.95,portrait),y:mix(1.79,1.67,portrait),z:mix(.19,.30,portrait),
  height:Math.max(6.65,mix(11.35,7.55,portrait)/ratio),
  azimuth:mix(-.065,-.14,portrait),elevation:mix(.18,.29,portrait)
 };
 if(mode==='coast')return {
  x:mix(36.77,36.70,portrait),y:mix(1.33,1.39,portrait),z:14.15,
  height:Math.max(6.69,mix(10.6,7.85,portrait)/ratio),
  azimuth:mix(-.08,-.10,portrait),elevation:mix(.28,.45,portrait)
 };
 if(mode==='ocean')return {
  x:54.8,y:2.16,z:16.10,
  height:Math.max(6.55,mix(11.5,8.85,portrait)/ratio),
  azimuth:mix(-.021,-.08,portrait),elevation:mix(.12,.22,portrait)
 };
 if(mode==='ice')return {
  x:43.7,y:1.13,z:22.45,height:Math.max(6.85,mix(10.8,8.75,portrait)/ratio),
  azimuth:-.16,elevation:mix(.28,.38,portrait)
 };
 if(mode==='grove')return {
  x:mix(10.18,10.22,portrait),y:mix(1.74,1.98,portrait),z:mix(-.12,.25,portrait),
  height:Math.max(6.45,mix(9.4,6.55,portrait)/ratio),
  azimuth:mix(-.09,-.28,portrait),elevation:mix(.26,.43,portrait)+Math.PI/18
 };
 return {
  x:mix(0,-.19,portrait),y:.08,z:mix(-.96,.16,portrait),
  height:Math.max(6.65,mix(9.7,6.8,portrait)/ratio),
  azimuth:mix(0,.021,portrait),elevation:mix(.53,.73,portrait)
 };
}

export function panView(base,dx,dy,width,height,wide){
 const scale=base.height/height;
 const right=clamp(-dx*scale,-(wide?2.6:.95),wide?2.6:.95);
 const up=clamp(dy*scale,-(wide?1.10:.68),wide?1.10:.68);
 const sine=Math.sin(base.azimuth),cosine=Math.cos(base.azimuth);
 const across=right*Math.min(1,width/360),depth=-up*Math.sin(base.elevation);
 return {...base,x:base.x+across*cosine+depth*sine,
  y:base.y+up*Math.cos(base.elevation),z:base.z-across*sine+depth*cosine};
}

export function placeCamera(camera,view,ratio){
 const half=view.height/2;
 camera.left=-half*ratio;camera.right=half*ratio;camera.top=half;camera.bottom=-half;
 // 低视角的竖屏需要后移正交镜头，避免近裁切面切掉脚下的地面。
 const distance=Math.max(12,(half*Math.cos(view.elevation)-view.y+.70)/Math.tan(view.elevation));
 camera.far=Math.max(55,distance+27);
 camera.position.set(view.x+Math.sin(view.azimuth)*distance,
  view.y+Math.tan(view.elevation)*distance,
  view.z+Math.cos(view.azimuth)*distance);
 camera.lookAt(view.x,view.y,view.z);
 camera.updateProjectionMatrix();camera.updateMatrixWorld();
}

export function blendView(from,to,t) {
 return Object.fromEntries(Object.keys(from).map(key=>[key,mix(from[key],to[key],t)]));
}
