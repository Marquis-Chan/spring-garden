import {clamp,ease,idleTravelRate,mix} from './state.js';
import {Euler, Vector3} from 'three';

// 尾根落水和实际模型用同一套姿态，水流起点跟着鲸的朝向移动。
const flukePoint=new Vector3(),whaleRotation=new Euler(0,0,0,'YXZ');
const currentSpeed=3.45;
export function poseWhale(a,rotation=whaleRotation) {
  return rotation.set(.12+.28*a.pose+a.roll,(a.heading??1.25)-Math.PI/2+a.turn*.23,
    .055*a.sweep+.115*a.pose+.4*(a.pitch??0),'YXZ');
}
export function whaleWakeOrigin(a){
  const p=flukePoint.set(-1.27,-.053+.10*a.sweep+.17*a.pose,0).applyEuler(poseWhale(a));
  return {x:a.x+p.x,y:a.y+p.y,z:a.z+p.z};
}

export const oceanPoints={
 whale:{x:54.04,y:4.43,z:15.05},
 dolphin:{x:57.14,y:3.40,z:15.82},
 shark:{x:52.63,y:2.61,z:15.83},
 clown:{x:55.27,y:1.57,z:16.50},
 horse:{x:57.47,y:1.02,z:16.78},
 star:{x:53.39,y:.171,z:17.27},
 anemone:{x:55.66,y:.65,z:16.46},
 kelp:{x:57.71,y:.39,z:16.81},
 shell:{x:54.29,y:.28,z:17.16}
};
export const oceanStarLedge={x:53.58,y:.09,z:17.28,rx:1.30,ry:.17,rz:.82,cap:.45,pitch:.23};
export function oceanStarTopAt(x,z){
 const ledge=oceanStarLedge;
 return ledge.y+ledge.cap*ledge.ry/Math.cos(ledge.pitch)-Math.tan(ledge.pitch)*(z-ledge.z);
}
const names=['whale','dolphin','shark','clown','horse','star'];
const span={whale:.43,dolphin:.29,shark:.51,clown:.27,horse:.085,star:.032};
const duration={whale:2.3,dolphin:1.55,shark:2.05,clown:1.6,horse:1.6,star:2.4};
const pulse=x=>x>0&&x<1?Math.sin(Math.PI*x):0;
const nearby=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<r;
const turnBetween=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const cruising={whale:[.59,.33,.11,.57,.58],dolphin:[.53,.29,.16,.62,1.83],shark:[.57,.32,.10,.57,2.65],
 clown:[.43,.24,.13,.76,1.07],horse:[.25,.12,.14,.61,2.42]};
const starTouchSpot={x:53.69,z:17.20};
export const kelpBlade={x:57.82,y:.815,z:16.94};
const horseBrush={x:57.65,y:.61,z:17.20};
// 吻端、转身与倾角在造型和接触判断之间共用，侧身靠近时也能吻到叶尖。
export function poseSeahorse(a,rotation) {
 return rotation.set(0,(a.heading??Math.PI/2-.04)-Math.PI/2+a.turn*.24,
  .091*a.sweep+.31*a.pose-.24*(a.touch??0),'YXZ');
}
const horseRotation=new Euler(),muzzle=new Vector3();

export function createOcean(emit=()=>{}){
 const animals=Object.fromEntries(names.map((name,i)=>[name,{
  ...oceanPoints[name],name,yaw:i===1||i===3?-.96:1.14,turn:0,roll:0,pose:0,
  sweep:0,phase:i*.83,hide:0,shift:0,crawl:0,touch:0,pitch:0
 }]));
 const actions=new Map();
 const visitor={...oceanPoints.anemone,visible:false,amount:0,phase:0,sweep:0,pose:0,turn:0,roll:0};
 let time=0,waterTime=0,current=null,shellAt=-Infinity,visitorAt=-Infinity,visitorTouchAt=-Infinity;
 function start(name,reason='tap'){
  if(!Object.hasOwn(animals,name)||actions.has(name))return false;
  const a=animals[name];
  actions.set(name,{at:time,from:{x:a.x,y:a.y,z:a.z},reason,sent:false});
  emit({type:'ocean-'+name, reason, x:a.x,y:a.y,z:a.z});
  return true;
 }
 function tapProp(name){
  const animal={anemone:'clown',kelp:'horse',shell:'star'}[name];
  if(animal)start(animal,name);
  if(name==='anemone'&&time-visitorAt>=7.8){
   visitorAt=time;
   emit({type:'ocean-visitor',reason:'anemone'});
  }
 }
 function tapVisitor(){
  if(visitor.amount<.55||time-visitorTouchAt<.56)return;
  visitorTouchAt=time;
  emit({type:'ocean-visitor-turn'});
 }
 function settleDirection(a,name,dx,dy,dz,dt){
  const gap=Math.hypot(dx,dz);
  if(name==='star'){
   if(a.touch<.10&&gap>.00015){
    const h=a.heading??0;
    a.heading=h+clamp(turnBetween(h,Math.atan2(dx,dz)),-dt*2.4,dt*2.4);
   }
   a.crawl=Math.max(a.touch*.36,clamp(gap/Math.max(.001,dt*.14)));
   a.phase+=gap*(2*Math.PI/.31);
   a.sweep=Math.sin(a.phase);
   return;
  }
  if(gap<.00015)return;
  const h=a.heading??(Math.PI/2-.31);
  const target=Math.atan2(dx,dz);
  if((name!=='horse'||a.touch===0)&&(name!=='clown'||a.hide<.76))a.heading=h+clamp(turnBetween(h,target),-dt*4.5,dt*4.5);
  if(name!=='horse') a.pitch=mix(a.pitch,clamp(Math.atan2(dy,gap),-.20,.20),Math.min(1,dt*7));
 }
 function step(seconds,active=false){
  const dt=clamp(seconds,0,.05);time+=dt;
  if(active)waterTime+=dt;
  const flowing=waterTime>0,flowMix=ease(waterTime/.76);
  for(const [i,name] of names.entries()){
   const a=animals[name],p=oceanPoints[name],w=time*.76*idleTravelRate+i*.81,m=actions.get(name);
   const before={x:a.x,y:a.y,z:a.z};
   a.x=p.x+span[name]*Math.sin(w);
   a.y=p.y+(name==='star'?0:span[name]*.23)*Math.sin(w*1.32+1.23);
   a.z=p.z+span[name]*.26*Math.cos(w*.81);
   a.turn=(name==='star'?.06:.12)*Math.sin(w*.91);a.roll=a.pose=a.hide=a.touch=a.crawl=0;
   if(!(flowing&&name==='star'))a.phase=time*(name==='whale'?1.38:name==='star'?2.7:3.5)+i*.86;
   if(flowing&&cruising[name]){
    const [width,depth,lift,pace,offset]=cruising[name],route=waterTime*pace*idleTravelRate+offset;
    a.x=mix(a.x,p.x+width*Math.sin(route),flowMix);
    a.z=mix(a.z,(name==='horse'?17.50:p.z)+depth*Math.cos(route),flowMix);
    a.y=mix(a.y,p.y+lift*Math.sin(route+1.04),flowMix);
   }else if(flowing&&name==='star'){
    const route=waterTime*.61*idleTravelRate+.66;
    a.x=mix(a.x,53.27+.20*Math.sin(route),flowMix);
    a.z=mix(a.z,17.28+.064*Math.cos(route),flowMix);
   }
   if(name==='star')a.y=oceanStarTopAt(a.x,a.z);
   a.sweep=Math.sin(a.phase);
   if(!m){
    if(flowing)settleDirection(a,name,a.x-before.x,a.y-before.y,a.z-before.z,dt);
    continue;
   }
   const progress=clamp((time-m.at)/duration[name]),effort=pulse(progress);
   a.pose=effort;
   a.x=mix(m.from.x,a.x,ease(progress));a.y=mix(m.from.y,a.y,ease(progress));a.z=mix(m.from.z,a.z,ease(progress));
   if(name==='whale'){
    a.x+=.35*effort;a.y+=.23*effort;a.turn-=.27*effort;
   }
   if(name==='dolphin'){a.y+=.63*effort;a.x-=.39*effort;a.roll=Math.sin(progress*Math.PI*2)*.62*effort;}
   if(name==='shark'){
    // 从当下泳道朝小丑鱼游近；结束后回到自己的水层，转身时也沿实际方向游。
    const gap=animals.clown.x-a.x;
    a.x+=(flowing?clamp(gap-1.18,1.40,2.23):1.58)*effort;
    a.y-=.14*effort;a.turn-=.23*effort;
    if(!m.sent&&progress>.33&&nearby(a,animals.clown,2.16)){
     // 小丑鱼可能正在回应海葵；等它动作结束，只要鲨鱼还在附近就继续尝试。
     m.sent=start('clown','shark');
    }
   }
   if(name==='clown'){
    const stage=ease(progress/.27)*(1-ease((progress-.66)/.34));
    if(m.reason==='shark'||m.reason==='anemone'){
     a.x=mix(a.x,flowing?55.69:oceanPoints.anemone.x,stage);
     a.y=mix(a.y,flowing?.71:oceanPoints.anemone.y+.21,stage);a.z=mix(a.z,flowing?16.10:16.22,stage);
     a.hide=stage;
     if(flowing&&stage>.43){
      const heading=a.heading??2.5;
      a.heading=heading+clamp(turnBetween(heading,2.5),-dt*8.9,dt*8.9);
      a.turn*=1-stage;
     }
    }else if(m.reason==='shell'){a.turn-=.48*effort;a.y+=.20*effort;}
    else if(m.reason==='kelp'){a.turn+=.32*effort;a.roll=-.14*effort;a.x-=.16*effort;}
    else{a.x+=.55*effort;a.y+=.34*effort;a.roll=.20*effort;}
    if(!m.sent&&['tap','anemone'].includes(m.reason)&&progress>.38&&nearby(a,animals.horse,2.53)){
     m.sent=true;start('horse','clown');
    }
   }
   if(name==='horse'){
    if(flowing&&m.reason==='kelp'){
     const brush=ease(progress/.37)*(1-ease((progress-.58)/.42));
     a.x=mix(a.x,horseBrush.x,brush);a.y=mix(a.y,horseBrush.y,brush);a.z=mix(a.z,horseBrush.z,brush);
     a.touch=brush;
     const h=a.heading??(Math.PI/2-.04);
     a.heading=h+clamp(turnBetween(h,Math.atan2(kelpBlade.x-a.x,kelpBlade.z-a.z)),-dt*4.6,dt*4.6);
     // 由模型鼻尖局部坐标和当前倾身反推真实水草触点，身体挨近不算碰到。
     const offset=muzzle.set(.367,.204,0).applyEuler(poseSeahorse(a,horseRotation));
     const settle=ease((progress-.36)/.12)*(1-ease((progress-.58)/.19));
     a.x=mix(a.x,kelpBlade.x-offset.x,settle);
     a.y=mix(a.y,kelpBlade.y-offset.y,settle);
     a.z=mix(a.z,kelpBlade.z-offset.z,settle);
     const nose={x:a.x+offset.x,y:a.y+offset.y,z:a.z+offset.z};
     if(!m.sent&&progress>.42&&nearby(nose,kelpBlade,.023)){
      m.sent=true;
      emit({type:'ocean-kelp-touch',...kelpBlade,nose});
      if(nearby(kelpBlade,animals.clown,2.36))start('clown','kelp');
     }
    }else{a.x-=.31*effort;a.y+=.29*effort;a.turn-=.48*effort;}
   }
   if(name==='star'){
    if(flowing){
     const crawl=ease(progress/.42)*(1-ease((progress-.65)/.35));
     a.x=mix(a.x,starTouchSpot.x,crawl);a.z=mix(a.z,starTouchSpot.z,crawl);
     a.y=oceanStarTopAt(a.x,a.z);
     a.touch=ease((progress-.29)/.14)*(1-ease((progress-.57)/.23));
     const desired=Math.atan2(oceanPoints.shell.x-a.x,oceanPoints.shell.z-a.z),h=a.heading??0;
     a.heading=h+clamp(turnBetween(h,desired),-dt*5.1,dt*5.1);
    }else{a.x+=.57*effort;a.z-=.13*effort;a.y=oceanStarTopAt(a.x,a.z);}
    if(!m.sent&&(flowing?progress>.44&&a.touch>.75:progress>.40)){
     m.sent=true;shellAt=time;
     emit(flowing?{type:'ocean-shell',...oceanPoints.shell}:{type:'ocean-shell',x:a.x,y:a.y,z:a.z});
    }
   }
   if(flowing)settleDirection(a,name,a.x-before.x,a.y-before.y,a.z-before.z,dt);
   if(name==='whale'&&!m.sent&&progress>.22){
    m.sent=true;current={...whaleWakeOrigin(a),at:time};
   }
   if(progress===1)actions.delete(name);
  }
  if(current){
   const radius=(time-current.at)*currentSpeed;
   if(!current.sent&&nearby(current,animals.dolphin,radius)){
    current.sent=start('dolphin','whale');
   }
   if(radius>8)current=null;
  }
  const bubbleAge=time-shellAt;
  if(bubbleAge>=.33&&bubbleAge<=.38&&nearby(oceanPoints.shell,animals.clown,2.43))start('clown','shell');
  const age=time-visitorAt,peek=ease((age-.14)/.91)*(1-ease((age-6.69)/1.09));
  const flick=pulse((time-visitorTouchAt)/.61);
  visitor.visible=peek>.04;visitor.amount=peek;
  // 大鱼从后侧躲进海葵；小鱼走右前的小水道，来回都不用穿过大鱼。
  visitor.x=oceanPoints.anemone.x+.25+peek*(.55+Math.sin(time*2.1)*.10+flick*.14);
  visitor.y=oceanPoints.anemone.y+.08+peek*(.23+Math.sin(time*1.61)*.055+flick*.20);
  visitor.z=oceanPoints.anemone.z+.51+peek*.35;
  visitor.phase=time*6.9;visitor.sweep=Math.sin(visitor.phase)*(1+flick*.39);
  visitor.heading=.83+Math.PI*ease((age-6.40)/.38)+flick*.62;
  visitor.pose=flick;visitor.roll=.33*flick;
 }
 return {animals,visitor,step,tap:start,tapProp,tapVisitor,get time(){return time;},
  get shellAge(){return time-shellAt;},
  get current(){return current&&{...current,radius:(time-current.at)*currentSpeed};}};
}
