import * as T from 'three';
import {branch,crownGeometry,pathStrip} from './grove-diorama.js';
import {ease} from './state.js';
import {duckCove} from './river-neighbors.js';

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

// 浅水冲出的一小段悬岸。洞口以内留足鸭头和脚蹼的空间，岸脊向陆地渐低。
function erodedBank(root){
 const rows=15, sides=26, vertices=[],faces=[],colors=[];
 const earth=new T.Color('#999e88'), shaded=new T.Color('#838977'), turf=new T.Color('#a6aa78');
 const damp=new T.Color('#7c9086');
 const tone=new T.Color();
 for(let shell=0;shell<2;shell++)for(let row=0;row<=rows;row++)for(let j=0;j<=sides;j++){
  const u=row/rows,a=j/sides*Math.PI,up=Math.sin(a),side=Math.cos(a);
  const shoulder=.86+.14*Math.sin(Math.PI*u);
  const end=1-ease((u-.42)/.58);
  const lump=.026*Math.sin(2.6*a+5*u)+.014*Math.cos(5.1*a-4.3*u);
  // 洞口是被水冲开的斜破口，前沿上圆下宽，右侧渐渐并入草岸。
  const rim=(-.25*Math.sin(2*a+.40)+.10*Math.sin(3.8*a-.55))*(1-u)**2;
  const x=duckCove.lipX+1.36*u+rim;
  const centerZ=duckCove.z+.15*u+.08*u*u;
  const width=(shell?.43:.55+.12*(1-up)+lump)*shoulder*(.08+.92*Math.sqrt(end));
  const height=(shell?.71:.82+lump)*shoulder*end;
  const z=centerZ+side*width;
  const base=.383+.13*ease((u-.51)/.49);
  const y=base+height*up;
  vertices.push(x,y,z);
  tone.copy(shell?shaded:earth);
  if(!shell){
   tone.lerp(turf,ease((up-.18)/.72)*(.77+.19*Math.sin(7.1*u+1.8*a)));
   const floodLine=y+.023*Math.sin(u*5.7+a);
   tone.lerp(damp,(1-ease((floodLine-.49)/.23))*.64);
   tone.lerp(shaded,.10*(1-up)+.07*Math.max(0,Math.cos(floodLine*28-2*u))*(1-u));
  }
  tone.multiplyScalar(.99+.028*Math.sin(9*u+2.3*a)+.016*Math.cos(4*u-5*a));
  colors.push(tone.r,tone.g,tone.b);
 }
 const stride=sides+1, layer=(rows+1)*stride;
 const quad=(a,b,c,d)=>faces.push(a,b,c,a,c,d);
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){
  const a=i*stride+j,b=a+stride;
  quad(a,b,b+1,a+1);
  quad(a+layer,a+layer+1,b+layer+1,b+layer);
 }
 for(const i of [0,rows])for(let j=0;j<sides;j++){
  const a=i*stride+j;
  quad(a,a+layer,a+layer+1,a+1);
 }
 const geo=new T.BufferGeometry();
 geo.setIndex(faces);
 geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();
 const bank=object(root,geo,mat('#ffffff',{vertexColors:true,side:T.DoubleSide}),0,0,0);
 bank.name='水湾悬岸';
 // 扁石埋在坡面上，露出一角；草根也取自这片坡面的实际顶点。
 const ridgePoint=(row,j)=>new T.Vector3().fromArray(vertices,(row*stride+j)*3);
 const rockAt=ridgePoint(11,10);
 const embedded=object(root,stone,mat('#9a9f8e'),rockAt.x,rockAt.y-.031,rockAt.z,[.16,.070,.104]);
 embedded.rotation.set(.12,.19,-.20);
 const shoots=ridgePoint(12,8);
 for(const [i,angle] of [-.53,.41].entries()){
  const green=object(root,blade,grasses[i],shoots.x+i*.045,shoots.y+.066,shoots.z,[.026,.110,.029]);
  green.rotation.z=angle;
 }
}
function grazingGrass(root,point,bed,index){
 const tuft=new T.Group();root.add(tuft);tuft.position.set(point.x,bed,point.z);
 const height=.81-bed;
 const leafMats=['#577d4f','#739353','#91a85e'];
 const makeBlade=(base,tip,width,color)=>{
  const mid=base.clone().lerp(tip,.43), vertices=[],indices=[],colors=[];
  mid.y+=.10;
  const across=new T.Vector3(tip.z-base.z,0,base.x-tip.x).normalize();
  const shade=new T.Color(color),light=new T.Color('#b9c681'),tone=new T.Color();
  for(const [i,t] of [0,.16,.33,.50,.67,.84,1].entries()){
   const p=base.clone().lerp(mid,t).lerp(mid.clone().lerp(tip,t),t);
   const w=width*(.03+Math.sin(Math.PI*t)**.82);
   vertices.push(p.x-w*across.x,p.y-w*.15,p.z-w*across.z,p.x,p.y+w*.28,p.z,
    p.x+w*across.x,p.y-w*.20,p.z+w*across.z);
   for(const stripe of [0,.16,0]){
    tone.copy(shade).lerp(light,t*.42+stripe);colors.push(tone.r,tone.g,tone.b);
   }
   const a=i*3;
   if(i<6)indices.push(a,a+1,a+4,a,a+4,a+3,a+1,a+2,a+5,a+1,a+5,a+4);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  return object(tuft,geo,mat('#ffffff',{side:T.DoubleSide,vertexColors:true}),0,0,0);
 };
 for(let i=0;i<6;i++){
  const a=(i+index*.24)*2.39996, bx=(i===2?.37:.26)*Math.cos(a),bz=.25*Math.sin(a);
  makeBlade(new T.Vector3(bx*.21,0,bz*.21),new T.Vector3(bx,(.62+i*.042)*height,bz),
   .069+(i%3)*.007,leafMats[i%3]);
 }
 const bite=makeBlade(new T.Vector3(-.13,0,-.11),new T.Vector3(0,height,0),.086,'#a5bc68');
 bite.name='可摘的嫩草叶';
 const tip=new T.Object3D();tip.position.y=height;bite.add(tip);
 return {tuft,bite,tip};
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

function hippoToothbrush(root,point){
 const tray=new T.Group();tray.name='河马牙刷小托盘';root.add(tray);
 tray.position.set(point.x,point.y-.075,point.z);
 const wood=mat('#d6bc83'),mint=mat('#4b9b91'),pearl=mat('#f4e8c9');
 const bristle=mat('#e9f0dd',{roughness:.73}),foamMat=mat('#eef5df',{transparent:true,opacity:.78,depthWrite:false});
 object(tray,blade,wood,.12,-.012,0,[.47,.047,.20]);
 object(tray,blade,mat('#dce4b8'),.12,.009,0,[.39,.025,.15]);
 const brush=new T.Group();brush.name='河马的薄荷色牙刷';root.add(brush);
 const head=object(brush,blade,mint,0,.082,0,[.061,.018,.090]);
 head.name='河马牙刷头';
 const handle=object(brush,blade,mint,.284,.086,0,[.249,.032,.047]);
 handle.name='河马牙刷柄';
 object(brush,blade,pearl,.315,.111,0,[.149,.008,.031]);
 const strands=[];
 for(const x of [-.031,0,.031])for(const z of [-.049,-.016,.016,.049]){
  const strand=object(brush,new T.CylinderGeometry(.005,.006,.058,5),bristle,x,.034,z,null);
  strand.name='河马牙刷柔软刷毛';
  strands.push(strand);
 }
 const bubbles=Array.from({length:5},(_,i)=>{
  const bubble=object(root,blade,foamMat,0,0,0,[.014,.014,.014],false);
  bubble.name='刷牙小泡泡';bubble.visible=false;return bubble;
 });
 const holder=new T.Vector3(point.x,point.y,point.z);
 const side=new T.Vector3(),front=new T.Vector3(),contact=new T.Vector3();
 const resting=new T.Quaternion().setFromEuler(new T.Euler(.11,-.20,-.10));
 const path=[holder,side,front,contact];
 const orientation=new T.Quaternion();
 return {brush,head,tray,tick(model,hippo){
  const state=model.toothbrush;
  if(!state||!hippo||state.amount===0){
   brush.position.copy(holder);brush.quaternion.copy(resting);
   for(const strand of strands){strand.position.y=.034;strand.scale.y=1;}
   for(const bubble of bubbles)bubble.visible=false;
   return;
  }
  const frame=hippo.brushFrame(state.u,state.v);
  contact.copy(frame.point);
  side.set(model.hippo.x-1.12,Math.max(1.17,contact.y+.40),model.hippo.z+1.65);
  front.copy(contact).add(new T.Vector3(0,1,0).applyQuaternion(frame.quaternion).multiplyScalar(.31));
  front.z=Math.max(front.z,model.hippo.z+1.32);
  const flight=state.amount*3,index=Math.min(2,Math.floor(flight)),progress=ease(flight-index);
  brush.position.copy(path[index]).lerp(path[index+1],progress);
  orientation.copy(resting).slerp(frame.quaternion,ease((state.amount-.20)/.50));
  brush.quaternion.copy(orientation);
  strands.forEach((strand,i)=>{
   const tip=state.amount>.99 ? frame.bristles[i].tip : .005;
   strand.position.y=(.063+tip)/2;
   strand.scale.y=(.063-tip)/.058;
  });
  brush.updateWorldMatrix(true,true);
  const brushing=state.phase==='active'&&frame.touching&&state.stroke>.08;
  for(const [i,bubble] of bubbles.entries()){
   bubble.visible=brushing;
   if(!brushing)continue;
   const age=(model.time*.82+i*.19)%1;
   bubble.position.copy(contact).add(new T.Vector3(
    Math.cos(i*2.4)*.045,.015+age*.14,Math.sin(i*2.4)*.045));
   bubble.scale.setScalar(.010+.010*Math.sin(age*Math.PI));
  }
 }};
}

export function makeRiverDiorama(scene,points,groundAt){
 const root=new T.Group();root.name='河岸';scene.add(root);
 const {waterY}=points;
 const hills=[[24.18,5.63,.87],[27.65,4.62,1.08],[32.81,4.88,.76]];
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
 // 岸草留在两侧，中间空出完整水面。
 for(const [i,[x,z,r]] of [[23.75,9.52,.23],[24.03,9.64,.14],[24.83,6.11,.25],
  [25.13,6.04,.14],[30.72,9.47,.23],[30.98,9.59,.16],[31.89,7.77,.20]].entries()){
  const y=groundAt(x,z);
  const rock=object(root,stone,sandstones[i%4],x,y+.034,z,[r,r*.48,r*.74]);
  rock.rotation.y=i*.54;
  if(i%3===0)reed(root,x+r,y,z+.20,i,.29+(i%4)*.035);
 }
 for(const [i,[x,z]] of [[24.67,9.80],[24.94,9.88],[30.77,9.72]].entries()){
  const y=groundAt(x,z),height=.21+(i%3)*.059;
  object(root,blade,grasses[2],x,y+height*.42,z,[.021,height*.54,.021]);
  for(let j=0;j<4;j++){
   const a=j*Math.PI/2;
   object(root,blade,petals[i%2],x+Math.cos(a)*.070,y+height,z+Math.sin(a)*.070,[.061,.024,.057],false);
  }
  object(root,blade,chalk,x,y+height+.012,z,[.049,.026,.049],false);
 }
 erodedBank(root);
 const tufts=points.grass.map((p,i)=>grazingGrass(root,p,groundAt(p.x,p.z),i));
 const pads=points.leaves.map((p,i)=>{
  const center=new T.Group();root.add(center);center.position.set(p.x,waterY+.026,p.z);
  const disk=object(center,new T.CircleGeometry(.235,28,.17,Math.PI*2-.44),padColors[i],0,0,0,[1,.81,1],false);
  disk.rotation.set(-Math.PI/2,0,-i*.47);
  object(center,blade,chalk,-.045,.025,.022,[.042,.026,.037],false);
  return center;
 });
 const water=surface(root,points);
 const perch=points.birdPerch;
 const lip=perch.y-.113;
 const twig=branch(root,[[24.74,groundAt(24.74,6.28)-.065,6.28],
  [24.91,.92,6.40],[25.09,lip-.026,6.50],[perch.x,lip,perch.z+.016],[25.60,lip+.004,6.53]],.142,.093);
 twig.name='岸边栖鸟枯枝';
 branch(root,[[24.92,.91,6.40],[24.80,1.01,6.39],[24.72,1.07,6.42]],.047,.014);
 const dental=hippoToothbrush(root,points.toothbrush);
 const foam=Array.from({length:8},(_,i)=>{
  const droplet=object(root,blade,mat(i%2?'#93c8bd':'#c8e3d4'),0,0,0,[.026,.039,.026],false);
  droplet.visible=false;return droplet;
 });
 return {
  root,hintNodes:{stones,grass:tufts.map(grass=>grass.tuft),toothbrush:dental.brush},stoneTopAt,
  grassTips:tufts.map(grass=>grass.tip),
  toothbrush:dental.brush,toothbrushHead:dental.head,
  splash(x,z,time){water.tap.value.set(x,time,z);},
  tick(model,night,shade,hippo){
   dental.tick(model,hippo);
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
   tufts.forEach(({tuft,bite},i)=>{
    tuft.rotation.z=-.10*model.grass[i].bend;
    bite.scale.y=1-.58*(model.grass[i].nibbled??0);
   });
  }
 };
}
