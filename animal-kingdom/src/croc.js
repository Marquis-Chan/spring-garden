import * as T from 'three';
import {groundHeight} from './diorama.js';
import {riverPoints} from './river-state.js';
import {clamp, ease, mix} from './state.js';
import {closedShape,group,mesh} from './savanna-actors.js';

const water=riverPoints.waterY;
// 这一圈只占河湾前沿。往返走不同的弯道，长尾能跟着身体转弯。
const trail=new T.CatmullRomCurve3([
 [29.26,10.77],[28.65,10.72],[28.28,10.46],[28.14,10.09],[28.25,9.76],
 [28.46,9.47],[28.78,9.62],[29.17,9.93],[29.54,10.25],[29.66,10.56]
].map(([x,z])=>new T.Vector3(x,0,z)),true);
const shallows=.51, length=trail.getLength();
const forward=new T.Vector3(),position=new T.Vector3();
const waterDepth=(x,z)=>Math.max(0,water-groundHeight(x,z));
const pulse=t=>t<=0||t>=1?0:Math.sin(Math.PI*t);

export function createCroc(emit=()=>{}){
 let time=0,age=0,rest=0,waveId=-1,waveAt=-20,calledAt=-20;
 const croc={x:0,y:0,z:0,yaw:0,phase:'bask',u:0,stride:0,motion:0,gape:0,lift:0,bob:0,time:0};
 function place(u,dt){
  const distance=(u-croc.u)*length;
  trail.getPointAt(u,position);trail.getTangentAt(u,forward);
  croc.x=position.x;croc.z=position.z;croc.y=groundHeight(croc.x,croc.z);croc.yaw=Math.atan2(forward.x,forward.z);
  croc.u=u;croc.stride+=Math.max(0,distance)*13;
  croc.motion=dt>0?clamp(distance/(dt*.62)):0;
 }
 function phase(value){croc.phase=value;age=0;rest=0;}
 function call(){
  if(time-calledAt<2.4)return;
  calledAt=time;emit({type:'croc-call',x:croc.x,z:croc.z});
 }
 function tap(){
  if(croc.phase==='bask'){phase('gape');call();}
  else if(croc.phase==='float'){phase('turn-back');call();}
 }
 function step(dt,active=true,waves=[]){
  if(!active||dt<=0)return;
  dt=Math.min(dt,.08);time+=dt;age+=dt;rest+=dt;croc.time=time;
  croc.motion=0;croc.gape=0;croc.lift=0;
  if(croc.phase==='float'){
   for(const wave of waves){
    const distance=Math.hypot(wave.x-croc.x,wave.z-croc.z);
    if(wave.id>waveId&&wave.radius>=distance&&wave.radius-distance<.23){
     waveId=wave.id;waveAt=time;emit({type:'croc-wave',x:croc.x,z:croc.z});break;
    }
   }
  }
  croc.bob=pulse((time-waveAt)/1.12);
  if(croc.phase==='gape'){
   croc.gape=ease(age/.42)*(1-ease((age-1.01)/.42));
   croc.lift=ease(age/.35)*(1-ease((age-1.08)/.45));
   if(age>=1.55)phase('enter-water');
  }else if(croc.phase==='enter-water'){
   const before=croc.u;
   place(shallows*ease(age/2.78),dt);
   if(before<.445&&croc.u>=.445)emit({type:'croc-splash',x:croc.x,z:croc.z});
   if(age>=2.78)phase('float');
  }else if(croc.phase==='float'){
   croc.lift=.92*croc.bob;
   if(rest>23&&time-waveAt>2)phase('turn-back');
  }else if(croc.phase==='turn-back'){
   croc.lift=.86*pulse(age/.82);
   if(age>.82)phase('climb');
  }else if(croc.phase==='climb'){
   place(mix(shallows,1,ease(age/3.03)),dt);
   if(age>=3.03){croc.u=0;phase('bask');}
  }else if(croc.phase==='bask'){
   croc.lift=.40*pulse((rest%14.4-9.7)/1.4);
  }
 }
 place(0,0);return {croc,tap,step};
}

const mat=(color,more={})=>new T.MeshStandardMaterial({color,roughness:.71,...more});
const moss=mat('#839650'),belly=mat('#cfbd83'),eyeRing=mat('#afad68'),amber=mat('#e7b062');
const umber=mat('#373c2c'),pearl=mat('#f8edc6'),mouth=mat('#a77465'),ridge=mat('#718047');
const painted=mat('#ffffff',{vertexColors:true}),ball=new T.SphereGeometry(1,18,14);
const tan=new T.Color('#d6c792'),side=new T.Color('#a2a65d'),green=new T.Color('#697e45'),band=new T.Color('#445841');
const pigment=new T.Color();
function paint(x,y,z,angle){
 const up=(Math.cos(angle)+1)*.5;
 const stripe=(1+Math.cos(z*37+.78*Math.sin(angle*2)))*.5;
 return pigment.copy(tan).lerp(side,ease((up-.16)/.36)).lerp(green,ease((up-.50)/.50))
  .lerp(band,ease((stripe-.47)/.45)*ease((up-.24)/.40)*mix(.62,.33,ease((z+.55)/.58)));
}
const oval=(parent,name,material,x,y,z,w,h,d)=>mesh(T,parent,name,ball,material,[x,y,z],[w,h,d]);
const bodyProfile=[
 [-.93,.11,.008,.012],[-.82,.132,.036,.046],[-.67,.140,.054,.066],[-.54,.151,.084,.079],
 [-.39,.161,.129,.098],[-.25,.169,.171,.119],[-.085,.17,.186,.126],[.06,.17,.170,.119],[.18,.17,.142,.102],[.29,.167,.107,.081]
];
const upperProfile=[
 [-.086,.008,.093,.075],[.005,.030,.147,.111],[.089,.035,.158,.109],[.16,.018,.14,.087],
 [.24,-.001,.113,.054],[.32,-.006,.096,.043],[.39,-.002,.087,.044],[.438,.002,.065,.036],[.465,.004,.018,.019]
];
const jawProfile=[
 [-.050,0,.079,.043],[.045,-.017,.137,.052],[.14,-.012,.131,.045],[.24,.005,.108,.035],
 [.32,.008,.091,.027],[.395,.01,.075,.025],[.438,.016,.034,.018]
];
function dense(profile){
 const rings=[];
 for(let i=0;i<profile.length-1;i++)for(let j=0;j<4;j++){
  rings.push(profile[i].map((x,k)=>mix(x,profile[i+1][k],j/4)));
 }
 return [...rings,profile.at(-1)];
}

export function makeCrocView(scene){
 const root=group(T,scene,'尼罗鳄幼崽'),skinRoot=group(T,root,'带动斑纹的鳄鱼');
 const rings=dense(bodyProfile),sides=32,skin=closedShape(T,rings,sides,paint);
 const body=mesh(T,skinRoot,'肩背和长尾的连续皮肤',skin,painted);
 const vertices=skin.attributes.position,rest=vertices.array.slice();
 vertices.setUsage(T.DynamicDrawUsage);
 // 趴着晒暖时，厚眼眶、鼻孔和耳后的暗斑都随同一个颅骨抬起。
 const head=group(T,skinRoot,'抬起的上颌',[0,.19,.218]);
 mesh(T,head,'宽平的吻部',closedShape(T,dense(upperProfile),32,paint),painted);
 const jaw=group(T,head,'有铰点的下颌',[0,-.068,.009]);
 mesh(T,jaw,'下巴',closedShape(T,dense(jawProfile),28),belly);
 oval(jaw,'下唇内沿',mouth,0,.019,.23,.094,.023,.196);
 oval(head,'上唇内沿',mouth,0,-.039,.235,.101,.018,.172);
 const eyes=[];
 for(const sign of [-1,1]){
  oval(head,'抬高的眉弓',moss,sign*.112,.093,.078,.057,.053,.087);
  const lid=group(T,head,'金棕色的小眼睛',[sign*.146,.098,.110]);
  oval(lid,'虹膜',amber,0,0,0,.028,.033,.032);
  oval(lid,'竖瞳',umber,sign*.021,.001,.012,.008,.026,.013);
  oval(lid,'眼睛高光',pearl,sign*.023,.014,.020,.006,.006,.006);eyes.push(lid);
  oval(head,'鼻端隆起',moss,sign*.048,.031,.397,.032,.026,.046);
  oval(head,'鼻孔',umber,sign*.052,.051,.410,.013,.006,.018);
  for(let j=0;j<3;j++){
   const z=.165+j*.054,w=.127-j*.015;
   const tooth=mesh(T,head,'小乳齿',new T.ConeGeometry(.012,.034,6),pearl,[sign*w,-.05,z]);
   tooth.rotation.z=Math.PI;
  }
 }
 const scales=[];
 const keel=closedShape(T,[[-1,0,.18,.16],[-.62,.14,.78,.72],[.03,.23,1,.94],[.62,.09,.74,.58],[1,0,.20,.16]],12);
 for(let i=1;i<bodyProfile.length-1;i++){
  const [z,y,w,h]=bodyProfile[i];
  for(const sign of [-1,1]){
   const scute=mesh(T,skinRoot,'双排背甲',keel,ridge,[0,0,0],[Math.min(.032,w*.26),.022+.011*h,.058]);
   scales.push({node:scute,x:sign*w*.34,y:y+h*.93,z});
  }
 }
 const legs=[];
 for(const sign of [-1,1])for(const fore of [true,false]){
  const thigh=oval(skinRoot,'贴身的上腿',moss,0,0,0,.049,.05,.04);
  const shank=oval(skinRoot,'弯折的小腿',moss,0,0,0,.032,.05,.032);
  const foot=group(T,skinRoot,'脚掌');
  oval(foot,'掌垫',eyeRing,0,.018,.009,.044,.023,.062);
  for(let j=0;j<(fore?5:4);j++){
   const angle=(j-(fore?2:1.5))*.28;
   const toe=oval(foot,'小趾',belly,.041*Math.sin(angle),.012,.061*Math.cos(angle),.009,.009,.040);
   toe.rotation.y=angle;
  }
  legs.push({sign,fore,thigh,shank,foot});
 }
 const focus=group(T,head,'鳄鱼点按位置',[0,.05,.13]);
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),up=new T.Vector3(0,1,0),axis=new T.Vector3();
 function connect(node,start,end,radius){
  axis.subVectors(end,start);
  node.position.copy(start).lerp(end,.5);
  node.scale.set(radius,axis.length()/2+radius*.37,radius);
  node.quaternion.setFromUnitVectors(up,axis.normalize());
 }
 let lastTime=-1;
 function tick(model){
  const s=model.croc;
  if(lastTime===s.time)return;
  lastTime=s.time;skinRoot.position.set(s.x,s.y,s.z);skinRoot.rotation.y=s.yaw;
  const sn=Math.sin(s.yaw),cs=Math.cos(s.yaw);
  const ground=(x,z)=>groundHeight(s.x+x*cs+z*sn,s.z+z*cs-x*sn)-s.y;
  const wet=ease(waterDepth(s.x,s.z)/.065);
  const breathe=.008*Math.sin(s.time*1.47)+.035*s.bob-.027*wet;
  const wave=z=>{const t=ease((.10-z)/1.04);
   return t*(.05+.155*s.motion+.038*s.bob)*Math.sin(s.stride*.62+s.time*.78+t*3.1);
  };
  function section(z){
   const u=T.MathUtils.euclideanModulo(s.u+z/length,1);
   trail.getPointAt(u,position);trail.getTangentAt(u,forward);
   const railTwist=Math.atan2(forward.x,forward.z)-s.yaw;
   // 水道拐弯时尾巴沿来路弯回。晒暖时尾尖放松展开，保持长尾的轮廓。
   const bendAmount=z<0?mix(.23,.86,ease((10.51-s.z)/.64)):1;
   const twist=Math.atan2(Math.sin(railTwist),Math.cos(railTwist))*bendAmount;
   const dx=position.x-s.x,dz=position.z-s.z;
   const bend=wave(z),co=Math.cos(twist),si=Math.sin(twist);
   const x=(dx*cs-dz*sn)*bendAmount+co*bend,depth=mix(z,dx*sn+dz*cs,bendAmount)-si*bend;
   return {x,z:depth,co,si,twist,y:ground(x,depth)+breathe*(.35+.65*ease((z+.98)/.75))};
  }
  // 每个截面随它下面那一小块浅滩起伏。背甲也取自同一个截面，尾巴摇时不会脱落。
  for(let i=0;i<rings.length;i++){
   const r=section(rings[i][0]);
   for(let j=0;j<sides;j++){const k=i*sides+j,lateral=rest[k*3];
    vertices.setXYZ(k,r.x+r.co*lateral,rest[k*3+1]+r.y,r.z-r.si*lateral);}
  }
  for(const k of [vertices.count-2,vertices.count-1]){
   const r=section(rest[k*3+2]);vertices.setXYZ(k,r.x,rest[k*3+1]+r.y,r.z);
  }
  vertices.needsUpdate=true;skin.computeVertexNormals();body.frustumCulled=false;
  for(const scute of scales){
   const r=section(scute.z);scute.node.position.set(r.x+r.co*scute.x,scute.y+r.y,r.z-r.si*scute.x);
   scute.node.rotation.y=r.twist;
  }
  const nape=section(.218),snout=section(.66);
  head.position.set(nape.x,.19+nape.y,nape.z);
  head.rotation.order='YXZ';
  head.rotation.y=Math.atan2(snout.x-nape.x,snout.z-nape.z);
  head.rotation.x=-.34*s.lift-.09*s.bob;
  // 低头行走时，吻部随真实岸坡抬高；张嘴时下巴的末端仍落在地面上方。
  const climb=ground(snout.x,snout.z)-ground(nape.x,nape.z);
  head.rotation.x-=Math.atan2(climb,.46);
  jaw.rotation.x=.45*s.gape;
  for(const eye of eyes)eye.scale.y=1-.93*pulse(((s.time+.54)%5.4)/.18);
  for(const {sign,fore,thigh,shank,foot} of legs){
   const phase=s.stride+(sign>0?Math.PI:0)+(fore?0:Math.PI);
   const z=fore?.124:-.274,back=fore?-.06:.057;
   const motion=s.motion,lift=.039*Math.max(0,Math.sin(phase))*motion;
   const hip=section(z),knee=section(z+back+.04*Math.cos(phase)*motion),ankle=section(z+.058+.083*Math.cos(phase)*motion);
   a.set(hip.x+hip.co*sign*.122,.161+hip.y,hip.z-hip.si*sign*.122);
   const width=sign*(.234-.050*wet+.014*Math.cos(phase)*motion);
   b.set(knee.x+knee.co*width,0,knee.z-knee.si*width);
   b.y=ground(b.x,b.z)+.070+lift*.48;
   const footWidth=sign*(.252-.10*wet);
   c.set(ankle.x+ankle.co*footWidth,0,ankle.z-ankle.si*footWidth);
   const footYaw=ankle.twist+sign*.4,toeX=Math.sin(footYaw)*.11,toeZ=Math.cos(footYaw)*.11;
   c.y=ground(c.x,c.z)+.010+lift;
   foot.position.copy(c);foot.rotation.order='YXZ';foot.rotation.y=footYaw;
   foot.rotation.x=-Math.atan2(ground(c.x+toeX,c.z+toeZ)-ground(c.x,c.z),.11);
   c.y+=.031;
   connect(thigh,a,b,.054);connect(shank,b,c,.035);
  }
 }
 tick(createCroc());
 return {root,hintNode:skinRoot,focusPoint:v=>focus.getWorldPosition(v),tick};
}
