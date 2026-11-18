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
export const adjacentPortals={
 grove:{asia:{x:12.85,y:.57,z:-.52}},
 asia:{grove:{x:17.59,y:.57,z:1.93},rainforest:{x:24.32,y:.56,z:1.83}},
 rainforest:{asia:{x:33.48,y:.56,z:2.54}},
 savanna:{river:{x:21.43,y:.64,z:8.23}},
 river:{savanna:{x:25.51,y:.65,z:10.70},coast:{x:30.75,y:.62,z:10.18}},
 coast:{river:{x:33.74,y:.68,z:11.73},ocean:{x:39.68,y:.64,z:11.57}},
 ocean:{coast:{x:51.02,y:.12,z:16.51}}
};

export function viewFor(mode,ratio) {
 const portrait=ease((1.2-ratio)/.62);
 if(mode==='overview')return {
  x:mix(4.68,4.88,portrait),y:mix(.92,1.30,portrait),z:mix(1.08,1.92,portrait),
  height:Math.max(9.12,mix(18.2,12.3,portrait)/ratio),
  azimuth:mix(-.045,-1.11,portrait),elevation:mix(.67,.73,portrait)
 };
 if(mode==='orchard')return {
  x:mix(4.55,4.49,portrait),y:mix(1.94,1.55,portrait),z:mix(5.94,6.10,portrait),
  height:Math.max(6.50,mix(9.50,6.95,portrait)/ratio),
  azimuth:mix(.018,-.14,portrait),elevation:mix(.23,.37,portrait)
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
 if(mode==='grove')return {
  x:mix(10.18,10.22,portrait),y:mix(1.74,1.98,portrait),z:mix(-.12,.25,portrait),
  height:Math.max(6.45,mix(9.4,6.55,portrait)/ratio),
  azimuth:mix(-.09,-.28,portrait),elevation:mix(.26,.43,portrait)
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
