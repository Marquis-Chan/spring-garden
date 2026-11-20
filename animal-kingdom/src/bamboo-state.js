import {clamp,ease,mix} from './state.js';

export const bambooOrigin={x:19,y:.38,z:-12};
export const bambooKinds=['panda-mother','panda-left','panda-right','panda-bamboo','panda-slope'];
const homes=[[0,-.96,.05,1.12],[-1.53,.36,.32,.79],[1.52,.53,-.34,.72]];
const beat=(a,b,t)=>ease((t-a)/(b-a));
const hold=(a,b,c,d,t)=>beat(a,b,t)*(1-beat(c,d,t));
// 三声实录相隔约半秒。口型按录音中的起音、峰值、收声走，停顿时嘴唇合拢。
const calls=[[.10,.35,.59],[1.10,1.50,1.65],[2.30,2.75,2.94]];
const spin=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function hillHeight(x,z){
 // 两条柔和的草坡都与原有世界地面平顺相接。
 return .32*Math.exp(-((z+.16)**2)/1.75)*(1-ease((Math.abs(x)-2.12)/1.24));
}

export function createBamboo(emit=()=>{}){
 const bears=homes.map(([x,z,yaw,size],index)=>({index,x,z,yaw,size,homeYaw:yaw,roll:0,tuck:0,walk:0,
  stride:0,sleep:0,attention:0,look:0,reach:0,nibble:0,voice:0,ear:0,greet:0}));
 const play={phase:'idle',age:0,lead:1,bend:0,bite:0,side:1,signal:0,night:false};
 let time=0,meal=0,turn=0,queued=null,nextIdle=13;
 function start(kind){
  play.age=0;
  if(kind==='panda-mother'){
   play.phase='call';emit({type:'panda-greeting',animal:kind});
  }else if(kind==='panda-bamboo'){
   play.phase='share';play.lead=1+(meal++%2);play.side=play.lead===1?-1:1;
   emit({type:'panda-lower-bamboo',animal:bambooKinds[play.lead]});
  }else{
   play.phase='relay';play.lead=kind==='panda-slope'?1+(turn++%2):bambooKinds.indexOf(kind);
   emit({type:'panda-roll-start',animal:bambooKinds[play.lead]});
  }
 }
 function tap(kind){
  if(!bambooKinds.includes(kind))return;
  const i=bambooKinds.indexOf(kind);
  if(play.night){
   const resting=bears[i<3?i:0];
   if(resting.sleep>.52)emit({type:'panda-sleep',animal:bambooKinds[resting.index]});
   else resting.ear=1;
   return;
  }
  if(i<3)bears[i].ear=1;else play.signal=1;
  if(play.phase==='idle')start(kind);else queued=kind;
 }
 function finish(){
  play.phase='idle';nextIdle=time+17;
  if(!play.night&&queued){const kind=queued;queued=null;start(kind);}
 }
 function step(dt,active=true,night=false){
  play.night=Boolean(night);
  if(!active)return;
  dt=clamp(dt,0,.065);if(!dt)return;
  time+=dt;const prev=play.age;play.age+=dt;const t=play.age;
  if(play.night)queued=null;
  play.bend=0;play.bite=0;play.signal=Math.max(0,play.signal-2*dt);
  for(const [i,b] of bears.entries()){
   b.ear=Math.max(0,b.ear-1.8*dt);
   b.x=homes[i][0];b.z=homes[i][1];b.yaw=homes[i][2];b.roll=b.tuck=b.walk=b.stride=b.reach=b.nibble=b.voice=b.greet=0;
   b.sleep=mix(b.sleep,Number(play.night&&play.phase==='idle'),1-Math.exp(-dt*4));
   b.look=.12*Math.sin(time*.59+i*1.8)*(1-b.sleep);b.attention=0;
  }
  if(play.phase==='call'){
   if(play.night&&prev<.45){finish();return;}
   const [mother,older,younger]=bears;
   mother.greet=hold(0,.32,.86,1.46,t);mother.look=-.52*hold(0,.43,2.64,3.30,t);
   mother.attention=mother.greet*.84;
   older.look=.61*hold(.18,.59,2.95,3.59,t);
   older.attention=hold(.12,.45,3.12,3.66,t);
   younger.look=-.73*hold(.45,.91,3.10,3.72,t);
   younger.attention=hold(.45,.85,3.10,3.72,t);
   if(prev<.45&&t>=.45)emit({type:'panda-call',animal:'panda-left'});
   const soundTime=t-.45;
   for(const [start,peak,end] of calls){
    if(soundTime>=start&&soundTime<=end)older.voice=beat(start,peak,soundTime)*(1-beat(peak,end,soundTime));
   }
   if(t>3.85)finish();
  }else if(play.phase==='share'){
   const s=play.side,cub=bears[play.lead],other=bears[3-play.lead];
   bears[0].reach=hold(0,.61,3.98,4.75,t);
   bears[0].look=s*.52*hold(0,.62,3.64,4.50,t);
   play.bend=hold(.57,1.56,3.57,4.51,t);
   cub.reach=hold(.93,1.61,3.38,3.92,t);
   cub.yaw=spin(cub.homeYaw,-s*.68,cub.reach);
   cub.nibble=hold(1.64,1.81,3.28,3.5,t)*(.50-.50*Math.cos((t-1.64)*12));
   play.bite=hold(1.65,3.10,4.34,4.87,t);
   other.look=s*.37*play.bend;other.attention=.57*play.bend;
   if(prev<1.64&&t>=1.64)emit({type:'panda-taste',animal:bambooKinds[play.lead]});
   if(t>4.95)finish();
  }else if(play.phase==='relay'){
   for(const b of bears.slice(1)){
    const delay=b.index===play.lead?0:1.42,u=t-delay,home=homes[b.index],s=b.index===1?-1:1;
    const downhill=beat(.33,1.83,u),uphill=beat(2.78,4.87,u);
    b.z+=1.97*(downhill-uphill);
    b.x+=s*.17*Math.sin(Math.PI*downhill)+s*.23*Math.sin(Math.PI*uphill);
    b.roll=Math.PI*2*downhill;
    b.tuck=hold(0,.31,1.67,2.03,u);
    b.yaw=spin(home[2],.04*s,hold(0,.31,1.90,2.36,u));
    const faceBack=s*Math.PI*.98;
    b.yaw=spin(b.yaw,faceBack,hold(2.20,2.78,4.80,5.35,u));
    b.walk=hold(2.22,2.72,4.78,5.24,u);
    b.stride=Math.sin(uphill*Math.PI*8);
    if(u<0){b.look=-s*.52*hold(0,.34,.98,1.43,t);b.attention=hold(0,.28,1,1.43,t);}
    if(prev<delay+.32&&t>=delay+.32)emit({type:'panda-roll',animal:bambooKinds[b.index]});
   }
   bears[0].look=(play.lead===1?-1:1)*(.55*hold(.08,.61,1.31,1.88,t)-.55*hold(1.47,2.0,2.78,3.73,t));
   if(t>6.85)finish();
  }else if(!play.night&&time>=nextIdle){
   // 自发活动只给一点小动作，双崽打滚和掰竹保留给宝宝来触发。
   const b=bears[Math.floor(time/17)%3];b.ear=1;nextIdle=time+17;
  }
 }
 return {bears,play,tap,step,get time(){return time;}};
}
