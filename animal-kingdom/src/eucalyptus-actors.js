import * as T from 'three';
import {makeBird} from './grove-actors.js';
import {clay,group,mesh,paintSphere,tube} from './savanna-actors.js';

const sphere=new T.SphereGeometry(1,26,19);
const skin=clay(T,'#ffffff',.91,true),nose=clay(T,'#363937',.58),ink=clay(T,'#252a28',.40);
const muzzle=clay(T,'#ddd9c9'),pink=clay(T,'#ad8f82'),glint=clay(T,'#f7eee2');
const claw=clay(T,'#746e63'),chin=clay(T,'#e1dccd');
const ash=new T.Color('#747b79'),fawn=new T.Color('#a3a39a'),cream=new T.Color('#dfddd1'),tint=new T.Color();
const V=(x,y,z)=>new T.Vector3(x,y,z);
const fur=(x,y,z)=>{
 const n=.5+.5*Math.cos(x*17+y*21)*Math.sin(19*z-7*y);
 return tint.copy(ash).lerp(fawn,.33+.23*y+.065*n);
};
const pelt=paintSphere(T,fur);
const chest=paintSphere(T,(x,y,z)=>{
 const white=T.MathUtils.smoothstep(z-.36*Math.abs(x)+.19*y,.51,.87);
 return fur(x,y,z).lerp(cream,white);
});
const earFur=paintSphere(T,(x,y,z)=>tint.copy(ash).lerp(cream,.26+.51*Math.abs(x)+.13*y));
// 起伏直接长在耳缘上，转耳时灰色绒毛与耳窝会一起动。
{
 const pos=earFur.attributes.position;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.atan2(y,x);
  const r=1+.069*Math.sin(a*13+.3)*(.48+.52*Math.abs(x))+.036*Math.cos(21*a);
  pos.setXYZ(i,x*r,y*r,z);
 }
 earFur.computeVertexNormals();
}
const oval=(root,name,geo,mat,loc,scale)=>mesh(T,root,name,geo,mat,loc,scale);
function round(root,name,mat,loc,scale){return oval(root,name,sphere,mat,loc,scale);}
function furry(root,name,loc,scale,shape=pelt){return oval(root,name,shape,skin,loc,scale);}

// 肩、肘、掌共用一条连续截面的前肢，掌走到哪里，腿部毛皮便在哪里收口。
function arm(root,side){
 const rows=15,sides=13,points=[],faces=[],cols=[];
 for(let r=0;r<=rows;r++)for(let j=0;j<sides;j++){
  points.push(0,0,0);const c=fur(Math.cos(j/sides*2*Math.PI),r/rows,0);cols.push(c.r,c.g,c.b);
  if(r<rows){const a=r*sides+j,b=r*sides+(j+1)%sides;faces.push(a,b,a+sides,b,b+sides,a+sides);}
 }
 const geo=new T.BufferGeometry(),pos=new T.Float32BufferAttribute(points,3);
 geo.setAttribute('position',pos);geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.setIndex(faces);
 const sleeve=mesh(T,root,'一体的肩臂',geo,skin);sleeve.frustumCulled=false;
 const paw=group(T,root,'五指前掌');furry(paw,'掌背',[0,.007,0],[.118,.085,.105]);
 for(let j=0;j<3;j++){
  const width=(j-1)*.053;
  const digit=furry(paw,'抓握的前趾',[width,-.058,.059],[.033,.075,.035]);
  digit.rotation.x=-.34;
  round(paw,'弯爪',claw,[width,-.120,.045],[.012,.035,.014]);
 }
 for(let j=0;j<2;j++){
  const digit=furry(paw,'对握的两趾',[-side*.087,-.028,.021+j*.043],[.041,.057,.032]);
  digit.rotation.z=-side*.49;
 }
 const center=V(),tangent=V(),across=V(),normal=V(),p=V(),elbow=V(),axis=V(0,0,1);
 function pose(a,b,extension){
  elbow.copy(a).lerp(b,.50);elbow.x+=side*(.19-.093*extension);elbow.y-=.34-.10*extension;elbow.z+=.13;
  for(let i=0;i<=rows;i++){
   const t=i/rows,v=1-t,r=.125*(.84+.27*Math.sin(Math.PI*t))*(1-.36*t);
   center.copy(a).multiplyScalar(v*v).addScaledVector(elbow,2*v*t).addScaledVector(b,t*t);
   tangent.copy(elbow).sub(a).multiplyScalar(v).addScaledVector(b,t).addScaledVector(elbow,-t).normalize();
   across.crossVectors(tangent,axis).normalize();normal.crossVectors(tangent,across);
   for(let j=0;j<sides;j++){
    const angle=Math.PI*2*j/sides;
    p.copy(center).addScaledVector(across,r*Math.cos(angle)).addScaledVector(normal,r*Math.sin(angle));
    pos.setXYZ(i*sides+j,p.x,p.y,p.z);
   }
  }
  pos.needsUpdate=true;geo.computeVertexNormals();
  paw.position.copy(b);paw.rotation.z=side*.15*(1-extension);
 }
 return {paw,pose};
}

export function makeKoala(parent){
 const root=group(T,parent,'成年考拉'),upper=group(T,root,'肩背');
 const rump=furry(upper,'银灰色的肩背与白胸',[0,.42,-.02],[.40,.51,.31],chest);
 rump.rotation.x=-.14;
 for(const side of [-1,1]){
  const haunch=furry(root,'坐在分叉上的后腿',[side*.30,.20,.026],[.206,.239,.24]);
  haunch.rotation.z=-side*.30;
  const foot=furry(root,'包住枝条的后掌',[side*.296,.061,.069],[.12,.092,.15]);
  foot.rotation.y=side*.36;
  for(let i=0;i<3;i++){
   round(root,'后爪尖',claw,[side*(.23+i*.048),.017,.174],[.013,.029,.032]);
  }
 }
 const neck=group(T,upper,'能循声转动的头',[0,.81,.024]);
 furry(neck,'宽颊前额',[0,.08,.027],[.412,.339,.329],chest);
 const ears=[],eyes=[];
 for(const side of [-1,1]){
  const ear=group(T,neck,'绒毛圆耳',[side*.341,.164,-.048]);
  furry(ear,'不规则白绒耳缘',[side*.105,.015,0],[.191,.213,.101],earFur);
  const cup=round(ear,'凹耳窝',pink,[side*.115,.032,.083],[.107,.116,.024]);
  cup.rotation.z=-side*.19;
  ears.push(ear);
  const eye=group(T,neck,'小而明亮的眼',[side*.175,.125,.306]);
  eye.rotation.y=side*.38;
  round(eye,'深棕眼',ink,[0,0,0],[.042,.047,.032]);
  round(eye,'眼中光点',glint,[-.012,.014,.029],[.008,.009,.005]);eyes.push(eye);
  round(neck,'浅灰口鼻垫',muzzle,[side*.064,-.057,.323],[.104,.058,.070]);
 }
 const snout=round(neck,'宽长的黑鼻镜',nose,[0,.060,.347],[.091,.143,.080]);snout.rotation.x=.11;
 for(const s of [-1,1])round(neck,'鼻孔',ink,[s*.050,-.009,.407],[.017,.013,.009]);
 const jaw=group(T,neck,'张合下颌',[0,-.104,.257]);
 round(jaw,'下唇',chin,[0,-.003,.063],[.086,.039,.078]);
 round(jaw,'口缝',nose,[0,.014,.082],[.057,.019,.054]);
 const lips=group(T,jaw,'叶尖抵住的嘴角',[.050,.018,.122]);
 const face=group(T,neck,'脸部点击位置',[0,.077,.251]);
 const arms=[arm(root,-1),arm(root,1)];
 const anchors=[group(T,upper,'左肩',[-.277,.684,.078]),group(T,upper,'右肩',[.277,.684,.078])];
 const shoulder=V(),hand=V(),bite=V();
 const leftRest=V(-.346,.396,.375),rightRest=V(.365,.333,.389);
 function pose(state,leafGrip){
  const k=state.koala,t=state.time;
  upper.position.y=.003*Math.sin(t*2.2)+.044*k.stretch;
  upper.rotation.set(-.07*k.stretch+.07*k.sleep,.08*k.watch+.075*k.pull,.10*k.pull+.048*k.stretch);
  neck.rotation.set(-.44*k.stretch+.14*k.pull+.22*k.sleep+k.watch*-.16,
    .28+.43*k.pull+.47*k.watch-.24*k.sleep,
    -.09*k.pull-.11*k.watch+.16*k.sleep);
  for(const [i,ear] of ears.entries()){
   const sign=i===0?-1:1;
   ear.rotation.set(.15*k.sleep,sign*(.15-.23*k.ears),sign*(.08+.17*k.ears-.20*k.sleep));
  }
  jaw.rotation.x=.85*k.call+.38*k.chew;
  const blink=Math.pow(Math.max(0,Math.cos(t*1.4+1.08)),125);
  for(const eye of eyes)eye.scale.y=Math.max(.04,1-k.sleep-.94*blink);
  root.worldToLocal(lips.getWorldPosition(bite));
  // 手指抓住叶柄，叶片还要有一段长度才抵到侧嘴角。
  leafGrip.set(.947,.74,.30);
  const remaining=1-.71*state.leaf.eaten;
  bite.x+=.279*remaining;bite.y-=.060*remaining+.030;bite.z+=.048*remaining;
  leafGrip.lerp(bite,k.pull);
  for(let i=0;i<2;i++){
   root.worldToLocal(anchors[i].getWorldPosition(shoulder));
   hand.copy(i===0?leftRest:rightRest);
   if(i===1)hand.lerp(leafGrip,k.reach);
   arms[i].pose(shoulder,hand,i===1?k.reach:0);
  }
 }
 return {root,face,lips,pose,feedingPaw:arms[1].paw};
}

export function makeSilvereye(root){
 const bird=makeBird(T),olive=new T.Color('#758344'),saffron=new T.Color('#b7b958'),
  grey=new T.Color('#a5a99b'),ivory=new T.Color('#d9d3b1');
 bird.root.name='银眼鸟';root.add(bird.root);bird.root.scale.setScalar(.92);
 const visited=new Set();
 bird.root.traverse(part=>{
  if(!part.isMesh)return;
  if(part.name==='Short copper bill')part.material.color.set('#47463e');
  if(part.name==='Eye socket'){part.material.color.set('#fbf5d8');part.scale.x*=1.21;part.scale.y*=1.19;}
  if(part.name==='Resting eyelid')part.material.color.set('#8d955a');
  const g=part.geometry,col=g.attributes.color;
  if(!col||visited.has(g))return;
  visited.add(g);const pos=g.attributes.position,box=new T.Box3().setFromBufferAttribute(pos);
  for(let i=0;i<pos.count;i++){
   const h=T.MathUtils.inverseLerp(box.min.y,box.max.y,pos.getY(i));
   if(part.name==='Rounded breast')tint.copy(ivory).lerp(grey,h).lerp(olive,h*h);
   else if(part.name==='Rounded bird face')tint.copy(saffron).lerp(olive,.20+h*.76);
   else tint.copy(olive).multiplyScalar(.65+.33*h);
   col.setXYZ(i,tint.r,tint.g,tint.b);
  }
 });
 return bird;
}
