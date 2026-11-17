import * as T from 'three';
import {branch,crownGeometry,pathStrip} from './grove-diorama.js';

const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.89,...extra});
const stone=new T.IcosahedronGeometry(1,3),blade=new T.SphereGeometry(1,14,9);
const baskingStone=stone.clone(),baskingVertices=baskingStone.attributes.position;
for(let i=0;i<baskingVertices.count;i++){
 const y=baskingVertices.getY(i);
 if(y>0)baskingVertices.setY(i,Math.min(1,y*1.55));
}
baskingStone.computeVertexNormals();
const sandstones=['#a99d82','#c3aa89','#aa9787','#baa88f'].map(color=>mat(color));
const grasses=['#919758','#a0ac68','#6a914f','#b4a562'].map(color=>mat(color));
const padColors=['#7f9e62','#b1b970'].map(color=>mat(color,{side:T.DoubleSide}));
const chalk=mat('#e6ce9a'),canopy=mat('#cccaad',{vertexColors:true});
const petals=[mat('#e0a283'),mat('#d0a8bd')];
const crown=[crownGeometry(2),crownGeometry(0),crownGeometry(3)];

function object(parent,geometry,material,x,y,z,scale,onGround=true){
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);
 if(scale)mesh.scale.set(...scale);
 mesh.castShadow=onGround;mesh.receiveShadow=onGround;parent.add(mesh);return mesh;
}
function reed(parent,x,y,z,i,height=.53){
 const stem=new T.Group();stem.position.set(x,y,z);parent.add(stem);
 for(let j=0;j<5;j++){
  const bearing=i*1.18+j*2.39,flair=.12+j*.019;
  const green=object(stem,blade,grasses[(i+j)%grasses.length],Math.cos(bearing)*flair,height*.39,Math.sin(bearing)*flair,
   [.026,height*(.41+j*.02),.055]);
  green.rotation.set(Math.sin(bearing)*.54,bearing,Math.cos(bearing)*.54);
 }
 return stem;
}
function willow(root,x,y,z,scale){
 branch(root,[[x,y,z],[x+.17*scale,y+scale,z-.11],[x+.06,y+1.45*scale,z]],.18*scale,.045);
 for(const [i,[dx,dz,dy]] of [[-.84,.1,1.63],[.20,-.16,1.89],[.81,-.04,1.53]].entries()){
  branch(root,[[x+.12,y+scale,z],[x+dx*.66*scale,y+dy*.81*scale,z+dz*scale],[x+dx*scale,y+dy*scale,z+dz*scale]],.063,.023);
  object(root,crown[i],canopy,x+dx*scale,y+dy*scale,z+dz*scale,[.73*scale,.48*scale,.56*scale]);
 }
}
function surface(root,points){
 const {pool,waterY}=points;
 const uniforms={t:{value:0},light:{value:1},shade:{value:0},source:{value:new T.Vector3(0,0,0)},
  radius:{value:-1},maximum:{value:3},tap:{value:new T.Vector3(0,-99,0)}};
 const material=new T.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,
  vertexShader:`varying vec2 local;
   varying vec3 positionOnWater;
   void main(){local=position.xy;positionOnWater=(modelMatrix*vec4(position,1.)).xyz;
   gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 local;
   varying vec3 positionOnWater;
   uniform vec3 source,tap;
   uniform float t,light,shade,radius,maximum;
   void main(){
    float edge=length(local),d=length(positionOnWater.xz-source.xz),age=t-tap.y;
    float depth=1.-smoothstep(.34,1.0,edge);
    float lines=sin(local.x*26.+local.y*16.+sin(local.y*16.)*.74+t*1.48);
    float glint=smoothstep(.88,.998,lines)*(.064+.04*sin(local.x*25.-t*.31));
    float front=(1.-smoothstep(.014,.059,abs(d-radius)))+.48*(1.-smoothstep(.018,.054,abs(d-radius+.15)));
    front*=step(0.,radius)*(1.-smoothstep(maximum*.72,maximum,d));
    float quietWave=(1.-smoothstep(.022,.073,abs(distance(positionOnWater.xz,tap.xz)-age*1.5)))*(1.-smoothstep(.44,.92,age))*step(0.,age);
    vec3 color=mix(vec3(.49,.74,.65),vec3(.15,.53,.58),depth);
    color=mix(color*.42+vec3(0.,.027,.04),color,light)*(1.-shade*.26);
    color+=vec3(.39,.52,.45)*(glint+(front*.41+quietWave*.25)*(.45+light*.55));
    gl_FragColor=vec4(color,(.24+.27*depth+.23*front+.16*quietWave)*(1.-smoothstep(.963,1.0,edge)));
   }`
 });
 const cube=object(root,new T.CircleGeometry(1,88),material,pool.x,waterY,pool.z,[pool.rx,pool.rz,1],false);
 cube.rotation.x=-Math.PI/2;
 cube.renderOrder=2;
 return uniforms;
}

export function makeRiverDiorama(scene,points,groundAt){
 const root=new T.Group();root.name='河岸';scene.add(root);
 const {waterY}=points;
 const hills=[[24.18,5.63,.87],[28.55,4.62,1.08],[32.81,4.88,.76]];
 for(const [x,z,size] of hills)willow(root,x,groundAt(x,z),z,size);
 pathStrip(root,[[21.43,8.23],[23.37,8.39],[23.58,9.63],[24.33,10.22],[25.51,10.70]],.33,'#c5ac7d',.016);
 const stones=points.turtleSites.map((p,i)=>{
  const width=i===0?.52:.58;
  const depth=i===0?.49:.53;
  const height=i===0?.08:.12;
  const rock=object(root,i===0?stone:baskingStone,sandstones[i+1],p.x,p.y-height,p.z,[width,height,depth]);
  rock.rotation.y=i*.82;
  return rock;
 });
 const baskingRock=stones[1],stoneRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 baskingRock.updateWorldMatrix(true,false);
 function stoneTopAt(x,z){
  if(Math.hypot(x-baskingRock.position.x,z-baskingRock.position.z)>.62)return -Infinity;
  stoneRay.ray.origin.set(x,baskingRock.position.y+1,z);
  return stoneRay.intersectObject(baskingRock,false)[0]?.point.y??-Infinity;
 }
 for(const [i,[x,z,r]] of [[23.75,9.52,.19],[25.13,9.59,.21],[25.32,9.64,.14],[26.18,9.91,.36],
  [27.63,10.20,.21],[29.66,9.4,.28],[30.06,8.97,.31],[30.41,7.73,.18],[28.44,5.85,.23],
  [25.82,6.04,.25],[24.07,7.1,.24],[31.79,7.72,.34],[25.21,10.31,.30],[28.83,10.77,.29],
  [27.52,11.19,.23],[30.30,10.84,.15],[31.06,9.82,.23],[26.42,5.35,.26],[28.95,4.15,.22]].entries()){
  const y=groundAt(x,z);
  const rock=object(root,stone,sandstones[i%4],x,y+.034,z,[r,r*.48,r*.74]);
  rock.rotation.y=i*.54;
  reed(root,x+r,y,z+.20,i,.35+(i%4)*.08);
 }
 for(const [i,[x,z]] of [[25.8,10.38],[26.16,10.52],[26.42,10.44],[29.45,9.72],[29.67,9.65],[29.81,9.83],[24.55,6.82],[24.36,6.98]].entries()){
  const y=groundAt(x,z),height=.21+(i%3)*.059;
  object(root,blade,grasses[2],x,y+height*.42,z,[.021,height*.54,.021]);
  for(let j=0;j<4;j++){
   const a=j*Math.PI/2;
   object(root,blade,petals[i%2],x+Math.cos(a)*.070,y+height,z+Math.sin(a)*.070,[.061,.024,.057],false);
  }
  object(root,blade,chalk,x,y+height+.012,z,[.049,.026,.049],false);
 }
 const tufts=points.grass.map((p,i)=>{
  const y=groundAt(p.x,p.z),cluster=reed(root,p.x,y,p.z,i+8,.62);
  for(const sign of [-1,1])object(cluster,blade,chalk,sign*.085,.58,0,[.033,.11,.031]);
  return cluster;
 });
 const pads=points.leaves.map((p,i)=>{
  const center=new T.Group();root.add(center);center.position.set(p.x,waterY+.026,p.z);
  const disk=object(center,new T.CircleGeometry(.235,28,.17,Math.PI*2-.44),padColors[i],0,0,0,[1,.81,1],false);
  disk.rotation.set(-Math.PI/2,0,-i*.47);
  object(center,blade,chalk,-.045,.025,.022,[.042,.026,.037],false);
  return center;
 });
 const water=surface(root,points);
 const foam=Array.from({length:8},(_,i)=>{
  const droplet=object(root,blade,mat(i%2?'#93c8bd':'#c8e3d4'),0,0,0,[.026,.039,.026],false);
  droplet.visible=false;return droplet;
 });
 return {
  root,hintNodes:{stones,grass:tufts},stoneTopAt,
  splash(x,z,time){water.tap.value.set(x,time,z);},
  tick(model,night,shade){
   water.t.value=model.time;water.light.value=1-night;water.shade.value=shade;
   const wave=model.waves.at(-1);
   water.radius.value=wave?.radius??-1;
   if(wave){water.source.value.set(wave.x,waterY,wave.z);water.maximum.value=wave.maxRadius;}
   const splash=wave?wave.radius/wave.speed:1;
   for(const [i,drop] of foam.entries()){
    drop.visible=splash>=0&&splash<.30;
    if(drop.visible)drop.position.set(wave.x+Math.cos(i*2.39)*splash*.91,waterY+Math.sin(splash*Math.PI/.30)*(.13+i*.02),
     wave.z+Math.sin(i*2.39)*splash*.67);
   }
   for(const [i,pad] of pads.entries()){
    const bob=model.leaves[i].bob;
    pad.position.y=waterY+.026+.04*bob;
    pad.rotation.x=.24*bob;pad.rotation.z=-.18*bob;
   }
   tufts.forEach((plant,i)=>{plant.rotation.z=-.46*model.grass[i].bend;});
  }
 };
}
