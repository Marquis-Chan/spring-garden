import * as T from 'three';
import {group,mesh,paintSphere,tube} from './savanna-actors.js';
import {clamp,mix} from './state.js';
import {bambooOrigin,hillHeight} from './bamboo-state.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const mat=color=>new T.MeshStandardMaterial({color,roughness:.83});
const ivory=mat('#f1e6d0'),black=mat('#34343a'),charcoal=mat('#474348'),noseMat=mat('#27282d');
const amber=mat('#594237'),glint=mat('#fff5da'),sole=mat('#5d5050');
const vert=new T.MeshStandardMaterial({color:'white',vertexColors:true,roughness:.83});
const sphere=new T.SphereGeometry(1,24,18);
const coat=new T.Color('#f1e7d2'),light=new T.Color('#f7efe0'),shadow=new T.Color('#33353a'),ink=new T.Color();
const faceGeo=paintSphere(T,(x,y,z)=>{
 const oval=((Math.abs(x)-(.425-.38*y))/.249)**2+((y-.014)/.395)**2;
 return ink.copy(coat).lerp(light,clamp(.4+y)).lerp(shadow,(1-T.MathUtils.smoothstep(oval,.80,1.18))*T.MathUtils.smoothstep(z,.40,.55));
},72,50);
const bodyGeo=paintSphere(T,(x,y,z)=>{
 const upper=.89+.09*z,lower=.22+.14*z+.065*Math.cos(x*3);
 return ink.copy(coat).lerp(light,clamp(.62+z*.35)).lerp(shadow,
  T.MathUtils.smoothstep(y,lower-.028,lower+.028)*(1-T.MathUtils.smoothstep(y,upper-.03,upper+.03)));
},48,38);
function oval(parent,name,m,pos,size,geom=sphere){
 return mesh(T,parent,name,geom,m,pos,size);
}
function ellBetween(parent,name,m,r,parts){
 const node=oval(parent,name,m,[0,0,0],[r,1,r]),delta=V(),Y=V(0,1,0);
 parts.push(node);
 return (a,b)=>{
  delta.subVectors(b,a);const n=delta.length();
  node.position.copy(a).lerp(b,.5);node.scale.set(r,n*.55+r*.27,r);
  node.quaternion.setFromUnitVectors(Y,delta.multiplyScalar(1/Math.max(.0001,n)));
 };
}

export function makePanda(parent,index){
 const root=group(T,parent,['竹林里的妈妈','圆耳朵的幼崽','小个子的幼崽'][index]);
 const tumble=group(T,root,'滚动时收起四肢');
 const body=group(T,tumble,'肩背与手脚共用的骨架');
 const parts=[];
 const egg=(g,name,m,pos,size,geo)=>{
  const o=oval(g,name,m,pos,size,geo);parts.push(o);return o;
 };
 egg(body,'奶油色肚皮与绕肩的深色毛带',vert,[0,-.015,0],[index===1?.461:.442,.566,index===1?.403:.374],bodyGeo);
 egg(body,'短短的白尾巴',ivory,[0,-.30,-.34],[.13,.13,.125]);
 const head=group(T,body,'宽脸和圆耳朵',[0,.48,.075]);
 egg(head,'眼圈长在脸上',vert,[0,0,0],[index===1?.516:.49,.409,.384],faceGeo);
 const eyes=[],ears=[];
 for(const side of [-1,1]){
  const ear=group(T,head,'毛茸茸的黑耳',[side*.328,.31,-.013]);
  ear.rotation.z=side*-.18;ears.push(ear);
  egg(ear,'圆耳外缘',black,[0,.043,-.016],[index===1?.157:.141,index===2?.151:.139,.096]);
  egg(ear,'耳窝',charcoal,[0,.044,.057],[.086,.087,.037]);
  const eye=group(T,head,'眼窝',[side*.178,.052,.352]);
  eye.rotation.y=side*.32;
  oval(eye,'深棕眼珠',amber,[0,0,0],[.044,.046,.027]);
  oval(eye,'瞳仁',noseMat,[0,0,.017],[.034,.038,.018]);
  oval(eye,'眼神光',glint,[-.008,.014,.035],[.011,.012,.005]);
  const shut=tube(T,head,'睡着的眼线',[[side*.121,.054,.355],[side*.168,.041,.354],[side*.219,.055,.336]],.009,black,6);
  eyes.push({eye,shut});
  egg(head,'吻部绒毛',ivory,[side*.077,-.088,.344],[.130,.104,.110]);
 }
 const chin=egg(head,'会张合的下巴',ivory,[0,-.157,.342],[.098,.049,.080]);
 const mouth=oval(head,'张口时露出的口腔',charcoal,[0,-.149,.402],[.071,.034,.021]);
 egg(head,'宽圆的黑鼻头',noseMat,[0,-.033,.427],[.091,.054,.046]);
 tube(T,head,'人中',[[0,-.069,.427],[0,-.090,.443],[0,-.110,.445]],.0066,charcoal,5);
 const lips=group(T,head,'唇边嫩叶接触点',[0,-.119,.445]);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=group(T,body,'前肢');
  const upper=ellBetween(arm,'上臂',black,.125,parts),lower=ellBetween(arm,'前臂',black,.108,parts);
  const paw=egg(arm,'前掌',black,[0,0,0],[.116,.105,.112]);
  const elbow=V(),shoulder=V(side*.33,.213,.027),end=V();
  // 前臂和手掌采用同一终点；固定长度的上下臂沿外侧折肘。
  const direction=V(),out=V(),middle=V();
  function solve(target){
   end.copy(target);direction.subVectors(end,shoulder);
   const len=Math.max(.001,direction.length());direction.divideScalar(len);
   out.set(side*.66,-1,-.30).addScaledVector(direction,-out.dot(direction)).normalize();
   middle.copy(shoulder).lerp(end,.52);
   elbow.copy(middle).addScaledVector(out,Math.sqrt(Math.max(.008,.277**2-(len*.5)**2)));
   upper(shoulder,elbow);lower(elbow,end);paw.position.copy(end);
  }
  arms.push({side,paw,end,solve,goal:V()});
  const hip=group(T,body,'后腿',[side*.267,-.268,-.045]);
  egg(hip,'黑色后腿',black,[side*.029,-.05,.079],[.166,.192,.198]);
  const foot=egg(hip,'后脚掌',black,[side*.033,-.109,.238],[.141,.120,.185]);
  const pad=oval(foot,'肉垫',sole,[0,.006,.945],[.44,.49,.087]);
  pad.rotation.x=.01;legs.push({hip,side});
 }
 // 用坡面法线找毛球的接触点，再在该点重算坡度，照顾侧滚时头与脚的前后跨度。
 const clearance=()=>{
  root.updateWorldMatrix(true,true);
  let gap=Infinity;
  for(const part of parts){
   const e=part.matrixWorld.elements;
   if(e[13]-Math.hypot(e[1],e[5],e[9])-bambooOrigin.y-.32>=gap)continue;
   const cx=e[12]-bambooOrigin.x,cz=e[14]-bambooOrigin.z;
   let x=cx,z=cz,y=e[13];
   for(let i=0;i<3;i++){
    const nx=(hillHeight(x-.005,z)-hillHeight(x+.005,z))*100;
    const nz=(hillHeight(x,z-.005)-hillHeight(x,z+.005))*100;
    const a=e[0]*nx+e[1]+e[2]*nz,b=e[4]*nx+e[5]+e[6]*nz,c=e[8]*nx+e[9]+e[10]*nz;
    const norm=1/Math.hypot(a,b,c);
    x=cx-(e[0]*a+e[4]*b+e[8]*c)*norm;
    z=cz-(e[2]*a+e[6]*b+e[10]*c)*norm;
    y=e[13]-(e[1]*a+e[5]*b+e[9]*c)*norm;
   }
   gap=Math.min(gap,y-bambooOrigin.y-hillHeight(x,z));
  }
  return gap;
 };
 const loc=V();
 function pose(b,play,time){
  const s=b.index===1?-1:1;
  // 小个子平时前趴，把两掌放在脸颊下；较大的幼崽喜欢挺着圆肚子坐。
  const restingLow=index===2?(1-b.walk)*(1-b.tuck)*(1-b.reach)*(1-b.attention):0;
  root.position.set(b.x,0,b.z);root.rotation.y=b.yaw;root.scale.setScalar(b.size);
  tumble.rotation.x=b.roll;
  body.rotation.x=.055+.69*b.walk+.16*b.tuck+.82*restingLow+.055*b.sleep+.015*Math.sin(time*1.35+index);
  body.rotation.z=.036*b.walk*b.stride;
  head.position.set(0,.48-.098*b.tuck-.05*b.sleep,.075+.075*b.walk+.058*b.tuck);
  head.rotation.set(.012+.18*b.tuck-.56*b.walk-.73*restingLow+.18*b.sleep-.115*b.attention-.13*b.voice+.044*b.nibble,
   b.look,.032*Math.sin(time*.72+index)+.069*b.ear*s);
  chin.position.y=-.157-.057*b.voice-.030*b.nibble;
  mouth.visible=b.voice>.045;mouth.scale.y=.034*b.voice;
  mouth.position.y=-.148-.017*b.voice;
  const blink=b.sleep+Math.max(0,1-Math.abs((time+index*1.7)%5.7-.095)/.095);
  for(const [i,{eye,shut}] of eyes.entries()){
   eye.scale.y=Math.max(.08,1-blink);eye.visible=blink<.89;shut.visible=!eye.visible;
   ears[i].rotation.z=(i?1:-1)*(-.18-.175*b.ear+.16*b.sleep+.12*b.attention);
  }
  for(const {hip,side} of legs){
   hip.rotation.x=-.09-.43*b.tuck+.83*b.walk+.91*restingLow-.54*b.walk*b.stride*side;
   hip.rotation.z=-side*.09*b.tuck;
  }
  for(const arm of arms){
   const side=arm.side;
   const goal=arm.goal.set(side*.335,-.144,.312);
   goal.lerp(loc.set(side*.26,-.17,.55),restingLow);
   goal.lerp(loc.set(side*.31,.10,.455),b.tuck);
   // 四足回坡时前掌绕肩摆动，向前迈步不会同时把上下臂拉长。
   const swing=.71+side*.34*b.stride;
   goal.lerp(loc.set(side*.33,.213-.57*Math.cos(swing),.027+.57*Math.sin(swing)),b.walk);
   if(index===0){
    if(side===-1)goal.lerp(loc.set(-.44,.30,.32),b.greet);
    if(side===1)goal.lerp(loc.set(side*.40,.20,.49),b.reach);
    else goal.lerp(loc.set(side*.28,-.04,.40),b.reach*.61);
   }else if(b.reach){
    if(side===-s)goal.lerp(loc.set(side*.170,.205,.588),b.reach);
    else goal.lerp(loc.set(side*.27,.08,.39),b.reach*.72);
   }
   arm.solve(goal);
  }
  root.position.y+=.008-clearance();
 }
 return {root,head,lips,arms,pose};
}
