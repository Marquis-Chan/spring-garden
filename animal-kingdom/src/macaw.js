import * as T from 'three';
import {branch} from './grove-diorama.js';
import {blink, closedShape, group, mesh, paintSphere, tube} from './savanna-actors.js';
import {clamp, ease, mix} from './state.js';

export const macawPerches=[
 {x:38.55,y:1.06,z:2.63,yaw:-.88},
 {x:37.41,y:3.62,z:.46,yaw:-.74}
];
const pulse=t=>Math.sin(Math.PI*clamp(t));
const turn=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

export function createMacaw(emit=()=>{}){
 const bird={...macawPerches[0],site:0,action:'rest',flight:0,flap:0,stretch:0,bank:0,
  crouch:0,look:0,bow:0,fan:0,bill:0,preen:0,sleep:0,time:0};
 let night=false,age=0,nextTap=0,idleAt=17,idleFlight=false,trip=null,pendingBanana=false,pendingTap=false;
 function act(action){bird.action=action;age=0;idleAt=bird.time+20;}
 function fly(to,banana=false){
  trip={from:macawPerches[bird.site],to:macawPerches[to],site:to,banana};
  act('flight');emit({type:'macaw-takeoff',banana,to});
 }
 function tap(){
  if(night){emit({type:'sleep',animal:'macaw'});return;}
  if(bird.action==='flight'){pendingTap=true;return;}
  if(bird.action==='call'&&age<.30)return;
  const choice=nextTap++%3;
  if(choice===0){
   act('call');emit({type:'macaw-call'});
   emit({type:'macaw-invite-toucan',x:bird.x,y:bird.y+.42,z:bird.z});
  }else if(choice===1)fly(1-bird.site);
  else {act('preen');emit({type:'macaw-preen'});}
 }
 function onBananaDrop(){
  if(night)return;
  if(bird.action==='flight'){pendingBanana=true;return;}
  // 低枝本就看得见林下，留枝探头可让宝宝看清落果和地猴的接续动作。
  if(bird.site===0){act('watch');emit({type:'macaw-watch-banana'});}
  else fly(0,true);
 }
 function finish(){
  act('rest');
  if(night)return;
  if(pendingBanana){pendingBanana=false;onBananaDrop();}
  else if(pendingTap){pendingTap=false;tap();}
 }
 function step(dt,active=true){
  if(!active)return;
  dt=clamp(dt,0,.05);age+=dt;bird.time+=dt;
  bird.flight=bird.flap=bird.bank=bird.stretch=bird.crouch=bird.fan=bird.bill=bird.preen=bird.bow=0;
  bird.look=.14*Math.sin(bird.time*.72)+.035*Math.sin(bird.time*1.6);
  bird.sleep=clamp(bird.sleep+dt*(night&&bird.action!=='flight'?2:-3));
  if(bird.action==='flight'){
   const p=clamp((age-.17)/1.24),hop=pulse(p),travel=ease(p),{from,to,site,banana}=trip;
   // 飞行始终在栖枝的镜头一侧；起降两端沿切线拔高，给趾尖和长尾留出空间。
   bird.x=mix(from.x,to.x,travel)-.85*hop;
   bird.z=mix(from.z,to.z,travel)+.82*hop;
   bird.y=mix(from.y,to.y,travel)+.89*hop;
   bird.flight=hop;bird.flap=Math.sin(p*Math.PI*10)*Math.min(1,hop*3);
   bird.stretch=clamp(hop*2.8);bird.fan=hop*.85;
   bird.crouch=.85*pulse(age/.17)+.75*pulse((age-1.41)/.23);
   const slope=6*p*(1-p),arcSlope=Math.PI*Math.cos(p*Math.PI);
   const aim=Math.atan2((to.x-from.x)*slope-.85*arcSlope,(to.z-from.z)*slope+.82*arcSlope);
   bird.yaw=turn(turn(from.yaw,aim,ease(p/.32)),to.yaw,ease((p-.56)/.44));
   bird.bank=.14*Math.sin(2*Math.PI*p);
   if(age>=1.64){
    Object.assign(bird,to);bird.site=site;trip=null;
    emit({type:'macaw-land',site,banana});
    if(banana&&!night&&!pendingTap){pendingBanana=false;act('watch');emit({type:'macaw-watch-banana'});}
    else finish();
   }
  }else if(night){bird.look=0;bird.bow=.42*bird.sleep;}
  else if(bird.action==='call'){
   const beat=pulse((age-.06)/.56)+.83*pulse((age-.74)/.44);
   bird.bill=beat;bird.stretch=.63*pulse(age/1.33);
   bird.flap=.22*beat;bird.fan=.84*pulse(age/1.30);bird.bow=-.18*beat;
   if(age>1.45)finish();
  }else if(bird.action==='preen'){
   bird.preen=ease(age/.34)*(1-ease((age-1.50)/.42));
   bird.bill=.4*bird.preen*(.5+.5*Math.cos(age*14));
   if(age>2)finish();
  }else if(bird.action==='watch'){
   const watch=ease(age/.24)*(1-ease((age-1.20)/.48));
   bird.look=-.80*watch;bird.bow=.67*watch;bird.fan=.72*watch;
   if(age>1.76)finish();
  }else if(bird.time>=idleAt){
   if(idleFlight)fly(1-bird.site);
   else act('preen');
   idleFlight=!idleFlight;
  }
 }
 function setNight(value){
  if(night===Boolean(value))return;
  night=Boolean(value);pendingBanana=pendingTap=false;
  if(bird.action!=='flight')act('rest');
 }
 return {bird,tap,onBananaDrop,step,setNight};
}

const mat=(colour,extra={})=>new T.MeshStandardMaterial({color:colour,roughness:.69,...extra});
const blue=mat('#286f99'),teal=mat('#33889b'),deep=mat('#2b516d'),
 black=mat('#393b3e'),chin=mat('#33494a'),foot=mat('#666269'),
 skin=mat('#f2e8cb'),eyeGold=mat('#c18f4b'),white=mat('#fff8d7'),green=mat('#628f58'),tealLeaf=mat('#708f69');
const sphere=new T.SphereGeometry(1,20,16);
function oval(root,name,surface,x,y,z,w,h,d){
 return mesh(T,root,name,sphere,surface,[x,y,z],[w,h,d]);
}
const bodyTone=mat('#ffffff',{vertexColors:true}),warm=new T.Color('#e6aa34'),honey=new T.Color('#f6cd58'),
 sea=new T.Color('#2987a7'),shaded=new T.Color('#315975');
const plumage=paintSphere(T,(x,y,z)=>warm.clone().lerp(honey,.42+.30*y)
 .lerp(sea,T.MathUtils.smoothstep(-z+.34*y,.02,.53))
 .lerp(shaded,T.MathUtils.smoothstep(-z,.52,.99)*.38));
const billShape=closedShape(T,[[0,.016,.076,.061],[.052,.037,.082,.088],[.103,.043,.075,.081],
 [.153,.031,.058,.064],[.181,.008,.041,.051],[.192,-.026,.026,.039],[.184,-.066,.016,.019],[.177,-.088,.005,.007]],24);

// 两对前后相向的趾包围短圆枝，转头和梳羽只带动躯干，不会把脚爪挪离栖枝。
function makeBird(root){
 const actor=group(T,root,'蓝黄金刚鹦鹉'),trunk=group(T,actor,'肩胸'),head=group(T,trunk,'额颊与上喙');
 mesh(T,trunk,'金黄前胸与蓝背',plumage,bodyTone,[0,0,-.018],[.158,.204,.213]);
 oval(head,'蓝色头顶',teal,0,.005,-.028,.141,.141,.149);
 oval(head,'绿色额冠',green,0,.061,.035,.127,.089,.115);
 oval(head,'黑色喉带',chin,0,-.064,.054,.117,.079,.104);
 const gaze=[];
 for(const side of [-1,1]){
  const face=group(T,head,'裸露的奶白色脸颊',[side*.103,.008,.046]);face.rotation.y=side*.42;
  oval(face,'脸颊',skin,0,0,.005,.048,.094,.104);
  for(let i=0;i<3;i++)tube(T,face,'面部短黑羽纹',[[side*.033,-.044+i*.023,.062],
   [side*.045,-.051+i*.025,.026],[side*.047,-.045+i*.023,-.014]],.004,black,8);
  const eye=group(T,face,'金色眼圈',[side*.039,.038,.044]);
  oval(eye,'眼圈',eyeGold,0,0,0,.020,.027,.024);
  oval(eye,'瞳仁',black,side*.012,0,.008,.014,.021,.017);
  oval(eye,'眼神光',white,side*.022,.006,.015,.005,.006,.005);
  gaze.push(eye);
 }
 mesh(T,head,'向下弯曲的黑色上喙',billShape,black,[0,-.008,.110]);
 const jaw=group(T,head,'短下喙',[0,-.061,.105]);
 oval(jaw,'下喙',chin,0,0,.057,.065,.045,.080);
 const wings=[];
 for(const side of [-1,1]){
  const shoulder=group(T,trunk,'蓝翼肩',[side*.112,.051,-.035]);
  oval(shoulder,'羽肩',blue,side*.128,0,-.054,.183,.066,.105);
  const wrist=group(T,shoulder,'可折起的翼腕',[side*.222,-.014,-.042]);
  for(let i=0;i<6;i++){
   const feather=oval(wrist,'初级飞羽',i%3===1?teal:deep,side*(.122-.011*i),-.015-i*.002,
    -.015-i*.028,.206-i*.016,.019,.030);
   feather.rotation.y=side*(.17+.085*i);
  }
  for(let i=0;i<4;i++)oval(shoulder,'层叠的覆羽',i%2?blue:teal,
   side*(.114+i*.032),.035-i*.009,-.086-i*.011,.089,.021,.038);
  wings.push({shoulder,wrist,side});
 }
 const tail=group(T,trunk,'长楔形尾羽',[0,-.018,-.142]),plumes=[];
 for(let i=-2;i<=2;i++){
  const half=.332-Math.abs(i)*.056;
  const feather=oval(tail,'窄蓝尾翎',i===0?teal:i%2?blue:deep,i*.033,0,-half, .035,.014,half+.035);
  plumes.push({feather,i});
 }
 const legs=[];
 for(const side of [-1,1]){
  const ankle=group(T,actor,'脚踝',[side*.073,0,0]);legs.push(ankle);
  tube(T,ankle,'蹠骨',[[0,.180,-.014],[0,.122,-.011],[0,.055,0],[0,.025,0]],.022,foot);
  for(const direction of [-1,1])for(const toe of [-1,1]){
   tube(T,ankle,'前后环握的趾',[[0,.032,0],[toe*.018,.018,direction*.027],
    [toe*.028,.005,direction*.044],[toe*.030,-.016,direction*.056],
    [toe*.031,-.034,direction*.060]],.009,foot);
  }
 }
 function pose(s){
  actor.position.set(s.x,s.y,s.z);actor.rotation.y=s.yaw;
  trunk.position.set(0,.298-.055*s.crouch+.008*Math.sin(s.time*2.1)*(1-s.sleep),-.014);
  trunk.rotation.set(.26*s.flight+.12*s.bow,0,s.bank);
  head.position.set(0,.181-.019*s.sleep,.088);
  head.rotation.order='YXZ';
  head.rotation.set(s.bow+(.024+.018*Math.sin(s.time*9))*s.preen,
   mix(s.look,2.15-.019*Math.sin(s.time*7),s.preen),.37*s.preen);
  jaw.rotation.x=.60*s.bill;
  gaze.forEach(e=>{e.scale.y=Math.max(.075,blink(s.time,4.7)*(1-s.sleep));});
  for(const {shoulder,wrist,side} of wings){
   const spread=clamp(s.stretch+(side>0?.42*s.preen:0));
   shoulder.rotation.order='ZYX';
   shoulder.rotation.set(-.24+spread*.16,side*mix(1.28,.13,spread),side*(-.33+.57*spread+.80*s.flap));
   wrist.rotation.y=side*mix(.24,.06,spread);
  }
  tail.rotation.x=mix(-.69,-.07,s.flight)-.09*s.bow;
  for(const {feather,i} of plumes)feather.rotation.y=i*(.018+.093*s.fan);
  for(const ankle of legs){ankle.position.y=s.flight*.117;ankle.rotation.x=s.flight*.61;}
 }
 return {actor,pose,legs};
}

export function makeMacawDiorama(scene,groundAt){
 const root=group(T,scene,'金刚鹦鹉的栖枝');
 const bases=[[39.86,groundAt(39.86,2.33)-.06,2.33],[36.03,2.58,-2.38]];
 for(const [i,seat] of macawPerches.entries()){
  const {x,y,z,yaw}=seat,dirX=Math.cos(yaw),dirZ=-Math.sin(yaw),side=i===0?1:-1;
  const attach=[x+side*.29*dirX,y-.062,z+side*.29*dirZ];
  const base=bases[i];
  branch(root,[base,[base[0]+(i===0?-.23:.18),base[1]+(i===0?.39:.50),base[2]+.19],
   [mix(base[0],attach[0],.70),y-.18,mix(base[2],attach[2],.70)],attach],i===0?.084:.092,.060);
  const limb=group(T,root,'短栖枝',[x,y-.062,z]);limb.rotation.y=yaw;
  const rail=mesh(T,limb,'双脚抓住的枝面',new T.CylinderGeometry(.062,.062,.61,24),mat('#8c7052'));
  rail.rotation.z=Math.PI/2;
  branch(limb,[[-side*.27,0,0],[-side*.37,.015,-.022],[-side*.49,.058,-.034]],.062,.016);
  if(i===0){
   const twig=group(T,root,'前枝的新叶',[39.56,base[1]+.31,2.47]);
   branch(twig,[[0,0,0],[.13,.075,.038],[.27,.105,.02]],.027,.009);
   for(const [j,[dx,dz,a]] of [[.12,.05,-.69],[.19,-.02,1.12],[.27,.03,.41]].entries()){
    const leaf=oval(twig,'卵形嫩叶',j===1?green:tealLeaf,dx,.095,dz,.055,.016,.119);
    leaf.rotation.set(-.26,a,.11);
   }
  }
 }
 const {actor,pose,legs}=makeBird(root);pose({...createMacaw().bird});
 return {root,bird:actor,feet:legs,tick(state){pose(state.bird);}};
}
