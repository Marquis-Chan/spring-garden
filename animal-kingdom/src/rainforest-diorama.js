import * as T from 'three';
import {branch,crownGeometry,pathStrip} from './grove-diorama.js';

const clay=(color,roughness=.86,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
const soft=new T.SphereGeometry(1,18,13),rock=new T.IcosahedronGeometry(1,2);
const leaves=['#548155','#6b945d','#91ad63','#497b5b'].map(color=>clay(color,.78,{side:T.DoubleSide}));
const moss=clay('#889778'),flower=clay('#e5a59c'),fruit=clay('#df7250'),yellow=clay('#f2c166',.72),brown=clay('#9f7d43');
const barkGreen=clay('#b3ac69');
const crowns=[0,1,3].map(crownGeometry),shadeLeaf=clay('#dce4c7',.87,{vertexColors:true});

function add(root,shape,mat,x,y,z,scale){
 const item=new T.Mesh(shape,mat);root.add(item);item.position.set(x,y,z);if(scale)item.scale.set(...scale);
 item.castShadow=true;item.receiveShadow=true;return item;
}
function canopy(root,x,y,z,h){
 branch(root,[[x,y,z],[x-.19,y+h*.42,z+.10],[x+.06,y+h*.89,z],[x+.12,y+h,z-.10]],.24,.071);
 for(const [i,[dx,dz,dy]] of [[-.73,.05,.93],[.05,.14,1.1],[.73,-.33,.91]].entries()){
  branch(root,[[x,y+h*.62,z],[x+dx*.49,y+h*dy-.19,z+dz*.51],[x+dx,y+h*dy,z+dz]],.10,.036);
  add(root,crowns[i],shadeLeaf,x+dx,y+h*dy,z+dz,[.79+.16*i,.37+i*.04,.69]);
 }
}
function vine(root,meshPath,material=leaves[3]){
 const path=new T.CatmullRomCurve3(meshPath.map(p=>new T.Vector3(...p)));
 return add(root,new T.TubeGeometry(path,15,.023,8),material,0,0,0);
}
function frond(root,x,y,z,length,yaw,color){
 const position=[],indices=[];
 for(let j=0;j<=13;j++){
  const f=j/13,width=.155*Math.sin(f*Math.PI)**.55*(1-.16*f),mid=.35*Math.sin(f*Math.PI)*length;
  for(const k of [-1,0,1])position.push(k*width,mid-Math.abs(k)*width*.39-.11*f*f,length*f);
  if(j<13)for(let k=0;k<2;k++){
   const a=j*3+k;indices.push(a,a+1,a+3,a+1,a+4,a+3);
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const blade=add(root,geometry,leaves[color],x,y,z,null);blade.rotation.y=yaw;
 return blade;
}
function banana(root){
 const group=new T.Group();root.add(group);
 const arc=new T.CatmullRomCurve3([[-.145,.036,0],[-.095,-.016,0],[-.025,-.043,.011],[.073,-.011,.014],[.132,.052,.006]].map(p=>new T.Vector3(...p)));
 add(group,new T.TubeGeometry(arc,18,.041,12),yellow,0,0,0);
 add(group,soft,yellow,-.145,.035,0,[.041,.042,.041]);
 add(group,soft,brown,.137,.057,.006,[.026,.031,.025]);
 return group;
}
function branchSeat(root,p,start,direction=1){
 return branch(root,[start,[p.x-direction*.30,p.y-.128,p.z-.28],[p.x,p.y-.083,p.z],[p.x+direction*.34,p.y-.091,p.z+.069]],.162,.063);
}
function seatTip(seat){
 // 用原枝的末段三角面做提示，整根枝仍保持原法线和接缝。
 const segments=20,sides=18;
 const split=(segments-6)*sides*6,lastRing=segments*sides*6,lastCap=lastRing+sides*3;
 const geometry=seat.geometry,index=geometry.index.array;
 const tip=seat.clone(false);
 tip.geometry=geometry.clone();
 geometry.setIndex([...index.subarray(0,split),...index.subarray(lastRing,lastCap)]);
 tip.geometry.setIndex([...index.subarray(split,lastRing),...index.subarray(lastCap)]);
 seat.parent.add(tip);
 return tip;
}

export function makeRainforestDiorama(scene,points,groundAt){
 const root=new T.Group();scene.add(root);
 pathStrip(root,[[32.28,2.6],[34.40,2.59],[35.95,2.85],[38.08,2.72],[40.22,2.96]],.40,'#a6966a',.017);
 for(const [x,z,h] of [[33.72,-1.89,2.77],[36.04,-2.42,2.62],[39.53,-2.19,2.84],[41.04,-.42,2.48]]){
  canopy(root,x,groundAt(x,z)-.035,z,h);
 }
 const monkeySeats=[
  branchSeat(root,points.monkeyBranches[0],[33.78,1.75,-1.78]),
  branchSeat(root,points.monkeyBranches[1],[36.02,2.07,-2.29])
 ];
 const monkeyBoughs=monkeySeats.map(seatTip);
 const branchSurface=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 function monkeyTopAt(site,x,z){
  const seat=monkeyBoughs[site];
  seat.updateWorldMatrix(true,false);
  branchSurface.ray.origin.set(x,points.monkeyBranches[site].y+.33,z);
  return branchSurface.intersectObject(seat,false)[0]?.point.y??-Infinity;
 }
 branch(root,[[33.62,2.53,-1.69],[34.63,2.13,-.72],[35.08,2.22,-.85],[35.60,2.37,-1.31],[35.99,2.62,-2.27]],.124,.097);
 for(const [i,p] of points.bananas.entries()){
  const stemX=p.x+(i===0?-.64:.46),stemZ=p.z-.96;
  vine(root,[[stemX,groundAt(stemX,stemZ),stemZ],[stemX,p.y-.18,stemZ],[p.x-.13,p.y+.255,p.z-.17],[p.x+.10,p.y+.075,p.z]],barkGreen);
  for(let n=0;n<4;n++)frond(root,stemX+(i===1?.30:0),p.y-.20+n*.074,stemZ-(i===1?.24:0),.60+n*.13,n*1.81+i*.53,n%4);
 }
 const ripe=points.dropBanana;
 vine(root,[[34.68,2.14,-.74],[34.96,2.02,-.08],[ripe.x+.08,ripe.y+.14,ripe.z-.20],[ripe.x+.123,ripe.y+.052,ripe.z]],barkGreen);
 const ripeFruit=banana(root);
 const grip=points.slothSupport;
 branch(root,[[36.07,2.20,-2.36],[36.41,1.87,.42],[points.sloth.x,grip.y,grip.z],[37.70,grip.y+.014,grip.z],
  [38.18,1.59,-1.24],[38.85,1.54,-1.77],[39.55,2.04,-2.15]],.169,.092);
 const tip=points.slothBough,bough=new T.Group();
 bough.position.set(tip.x+.16,tip.y-.098,tip.z-.19);root.add(bough);
 branch(bough,[[0,0,0],[-.118,.071,.144],[-.180,.135,.268]],.054,.016);
 // 侧枝的嫩叶伸出承重枝轮廓，和低处的食叶保持独立。
 const leftTip=frond(bough,-.143,.126,.214,.34,-.95,2);
 leftTip.rotation.x=-.61;
 leftTip.scale.set(.89,.83,.96);
 const rightTip=frond(bough,-.113,.112,.177,.27,.72,2);
 rightTip.rotation.x=-.73;
 rightTip.scale.set(.74,.90,.92);
 const frontTip=frond(bough,-.202,.118,.239,.190,-.19,1);
 frontTip.rotation.x=-.34;
 frontTip.scale.set(.64,.75,.83);
 const food=points.leaf;
 vine(root,[[37.77,1.94,.41],[37.64,1.61,.69],[food.x+.04,food.y+.07,food.z]]);
 const leafFood=new T.Group();root.add(leafFood);
 frond(leafFood,0,0,-.095,.28,.58,2).scale.set(.63,.58,.76);
 frond(leafFood,-.09,.007,-.075,.20,-.42,1).scale.set(.58,.53,.78);
 const toucanSeats=[branchSeat(root,points.toucanBranches[0],[39.53,2.24,-2.13],-1),
  branchSeat(root,points.toucanBranches[1],[39.86,2.72,-2.14],-1)];
 const toeRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 for(const seat of toucanSeats)seat.updateWorldMatrix(true,false);
 function toucanTopAt(x,z){
  const site=points.toucanBranches.findIndex(p=>Math.hypot(x-p.x,z-p.z)<.32);
  if(site<0)return -Infinity;
  toeRay.ray.origin.set(x,points.toucanBranches[site].y+.27,z);
  return toeRay.intersectObject(toucanSeats[site],false)[0]?.point.y??-Infinity;
 }
 const fruitPoint=points.berry;
 vine(root,[[38.06,1.74,-.74],[38.08,2.22,-.47],[fruitPoint.x,fruitPoint.y+.023,fruitPoint.z]],leaves[2]);
 for(const sign of [-1,1])frond(root,fruitPoint.x+sign*.098,fruitPoint.y+.054,fruitPoint.z-.178,.19,sign*.97,sign>0?2:1);
 const berry=add(root,soft,fruit,fruitPoint.x,fruitPoint.y,fruitPoint.z,[.070,.067,.068]);
 const bananas=points.bananas.map(()=>banana(root));
 for(const [i,[x,z,r]] of [[33.14,2.55,.27],[34.10,1.72,.49],[35.73,2.51,.33],[36.34,1.91,.38],
  [37.21,2.51,.35],[38.13,1.87,.31],[39.76,2.13,.43],[40.42,1.42,.61],[41.07,2.29,.29],
  [33.45,.55,.44],[36.13,-.91,.72],[38.17,-1.35,.47],[40.13,-.39,.49]].entries()){
  const y=groundAt(x,z);add(root,rock,moss,x,y+.025,z,[r,r*.29,r*.69]);
  for(let j=0;j<4;j++)frond(root,x+.09,y+.12*j,z-.10,r*(1.13+j*.22),i*.68+j*1.92,(j+i)%4);
  if(i%3===0)for(let j=0;j<3;j++)add(root,soft,flower,x-.17-j*.085,y+.058+j*.012,z+.29+j*.06,[.083,.024,.066]);
 }
 const contact=new T.Vector3();
 function place(mesh,data,actor,scale=1){
  mesh.visible=data.phase!=='spent';if(!mesh.visible)return;
  if(data.phase==='held'||data.phase==='mouth'){
   const node=data.phase==='held'?actor.hand:actor.mouth;
   node.getWorldPosition(contact);mesh.position.copy(contact);
  }else mesh.position.set(data.x,data.y,data.z);
  mesh.scale.setScalar(scale);
 }
 return {
  root,monkeyTopAt,toucanTopAt,hintNodes:{bananas,dropBanana:ripeFruit,leaf:leafFood,slothBough:bough,berry,monkeyBoughs},
  tick(state,monkey,sloth,toucan,groundMonkey){
   state.bananas.forEach((data,i)=>{
    place(bananas[i],data,monkey,data.phase==='mouth'?.86-.66*state.monkey.eatProgress:1);
    if(data.phase==='mouth'){
     bananas[i].position.x+=Math.sin(state.monkey.yaw)*.065;
     bananas[i].position.z+=Math.cos(state.monkey.yaw)*.065;
    }
    bananas[i].rotation.set(.18,i*.35+state.monkey.bring*.35,-.23);
   });
   const dropped=state.dropBanana;
   const eaten=dropped.phase==='mouth';
   const face=state.groundMonkey;
   const attached=dropped.phase==='held'||eaten;
   if(!attached||groundMonkey){
    place(ripeFruit,dropped,groundMonkey,eaten?.82-.68*face.eatProgress:1);
    const fall=dropped.phase==='drop'?-dropped.rotation/(2*Math.PI):0;
    const lay=dropped.phase==='ground'?1.48:dropped.phase==='drop'?.10+1.38*fall:.10;
    ripeFruit.rotation.set(lay,.39,dropped.rotation+(dropped.phase==='branch'?.44:.10),'YXZ');
    if(eaten){
     ripeFruit.position.x+=Math.sin(face.yaw)*.053;
     ripeFruit.position.z+=Math.cos(face.yaw)*.053;
    }
   }
   const beat=state.sloth.boughShake;
   bough.rotation.set(beat*.24*Math.sin(state.time*26),beat*.19*Math.sin(state.time*24),beat*.28*Math.cos(state.time*25));
   place(leafFood,state.leaf,sloth,state.leaf.phase==='mouth'?1-.83*state.sloth.eatProgress:1);
   leafFood.rotation.set(state.leaf.phase==='held'?-.26:0,.17,state.sloth.bring*.46);
   const fruit=state.berry;
   berry.visible=fruit.phase!=='spent';
   if(fruit.owner==='sloth'&&berry.visible){
    const anchor=fruit.phase==='mouth'?sloth.fruitMouth:sloth.hand;
    anchor.getWorldPosition(contact);berry.position.copy(contact);
    if(fruit.phase==='mouth')berry.position.lerp(sloth.mouth.getWorldPosition(contact),
      T.MathUtils.smoothstep(state.sloth.eatProgress,0,.46));
   }else if(fruit.owner==='toucan'&&berry.visible){
    toucan.beak.getWorldPosition(contact);berry.position.copy(contact);
    berry.position.y+=fruit.tossY;
   }else berry.position.set(fruit.x+fruit.shiver*.026,fruit.y,fruit.z);
   const size=fruit.phase==='mouth'?1-.82*state.sloth.eatProgress:1;
   berry.scale.set(.081*size,.075*size,.078*size);
  }
 };
}
