import {clamp,ease,mix} from './state.js';

export const wallabyHome={x:1.42,z:1.40};
export const wallabyStop={x:.48,z:2.48};
export const grazingTuft={x:-.10,z:2.85};
export const wombatDoor={x:-1.72,z:1.26,yaw:.26};
const pulse=t=>Math.sin(Math.PI*clamp(t));
const frame=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const follow=(value,target,dt,speed=8)=>mix(value,target,1-Math.exp(-speed*dt));

export function createGumGround(emit){
 const wallaby={...wallabyHome,action:'rest',site:0,yaw:-.94,up:0,tuck:0,nibble:0,peek:0,look:0,ears:0};
 const grass={height:1,bend:0};
 const wombat={action:'den',dist:-1.08,turn:0,feet:0,bite:0,visible:false,night:false};
 let time=0,age=0,night=false,listen=9,pouch=10,regrow=10,linger=0,depart=0,to=0,phaseAge=0;
 let queuedFeed=false,queuedPouch=false,previousDist=wombat.dist;
 function act(action){wallaby.action=action;age=0;}
 function hop(site){
  if(wallaby.site===site){act('feed');return;}
  to=site;act('hop');emit({type:'wallaby-hop',site});
 }
 function birdSong(){listen=0;emit({type:'wallaby-listen'});}
 function canTap(kind){return kind!=='wombat'||(wombat.visible&&wombat.dist>-.59);}
 function settleWombat(action){depart=wombat.dist;phaseAge=0;wombat.action=action;}
 function comeOut(){
  if(wombat.action==='peek'||wombat.action==='stir'||wombat.action==='den'){
   settleWombat('out');emit({type:'wombat-emerge'});
  }else if(wombat.action==='graze'){settleWombat('home-turn');emit({type:'wombat-return'});}
 }
 function tap(kind){
  if(kind==='wallaby'){
   if(wallaby.action==='hop'){queuedPouch=true;return;}
   pouch=0;emit({type:'wallaby-peek'});return;
  }
  if(kind==='wallaby-grass'){
   grass.bend=1;
   if(wallaby.action==='hop'){queuedFeed=true;return;}
   hop(1);return;
  }
  if(kind==='wombat'||kind==='wombat-den'){
   if(!night){emit({type:'wombat-den-sleep'});return;}
   comeOut();
  }
 }
 function step(dt,dark){
  night=dark;time+=dt;listen+=dt;pouch+=dt;age+=dt;regrow+=dt;phaseAge+=dt;
  const w=wallaby;
  w.up=w.tuck=w.nibble=0;
  w.look=frame(listen,.12,.52,1.52,2.32);
  w.ears=Math.max(w.look,.15*Math.sin(time*2.1),frame(pouch,0,.22,1.15,1.9));
  let targetPeek=Math.max(frame(pouch,.18,1.0,2.4,3.10),frame(listen,.59,1.1,1.75,2.4));
  grass.bend*=Math.exp(-dt*2.8);
  if(w.action==='hop'){
   const a=w.site===0?wallabyHome:wallabyStop,b=to===1?wallabyStop:wallabyHome;
   const angle=Math.atan2(b.x-a.x,b.z-a.z);
   const align=ease(age/.46);
   const oldYaw=w.site===0?-.94:-.99;
   w.yaw=oldYaw+Math.atan2(Math.sin(angle-oldYaw),Math.cos(angle-oldYaw))*align;
   const hopTime=clamp((age-.47)/1.20)*2,index=Math.min(1,Math.floor(hopTime)),local=clamp((hopTime-index-.06)/.84);
   const s=(index+local)/2;
   w.x=mix(a.x,b.x,s);w.z=mix(a.z,b.z,s);
   w.up=.26*4*local*(1-local);w.tuck=pulse(local);
   if(age>1.67){
    const finalYaw=to===1?-.99:-.94;
    w.yaw=angle+Math.atan2(Math.sin(finalYaw-angle),Math.cos(finalYaw-angle))*ease((age-1.67)/.47);
   }
   if(age>2.14){
    w.site=to;w.yaw=to===1?-.99:-.94;act(to===1?'feed':'rest');
    if(queuedPouch){queuedPouch=false;pouch=0;emit({type:'wallaby-peek'});}
    if(queuedFeed&&!to)hop(1);
    queuedFeed=false;
   }
  }else if(w.action==='feed'){
   // 鸟鸣让正在吃草的妈妈抬起头；等它重新低头后，草才继续变短。
   const graze=frame(age,0,.67,2.16,2.95);
   w.nibble=graze*(1-w.look)*(1-frame(pouch,0,.25,2.35,3));
   if(w.nibble>.88){grass.height=Math.max(.41,grass.height-.34*dt);regrow=0;}
   if(age>=.70&&age-dt<.70)emit({type:'wallaby-graze'});
   if(age>=2.95){pouch=0;act('rest');linger=0;emit({type:'wallaby-peek'});}
  }else if(w.site===1){
   linger+=dt;if(linger>10&&pouch>3.2&&listen>2.5)hop(0);
  }else if(age>21&&pouch>3.5&&listen>3){hop(1);}
  if(w.action==='hop'||w.nibble>.38)targetPeek=0;
  w.peek=follow(w.peek,targetPeek,dt);
  if(regrow>3.3)grass.height=follow(grass.height,1,dt,.85);
  const b=wombat;
  if(b.night!==night){
   b.night=night;
   if(night&&b.action==='den')settleWombat('stir');
   if(!night&&['out','graze'].includes(b.action)){settleWombat('home-turn');}
   else if(!night&&['peek','stir'].includes(b.action))settleWombat('hide');
  }
  previousDist=b.dist;b.bite=0;
  if(b.action==='stir'){
   if(phaseAge>.64){settleWombat('peek');emit({type:'wombat-peek'});}
  }else if(b.action==='peek'){
   b.dist=mix(depart,-.38,ease(phaseAge/1.05));
  }else if(b.action==='out'){
   b.dist=mix(depart,1.28,ease(phaseAge/2.3));
   if(phaseAge>=2.3){settleWombat('graze');emit({type:'wombat-graze'});}
  }else if(b.action==='graze'){
   b.bite=frame(phaseAge,0,.50,3.1,3.8);
   if(phaseAge>6){settleWombat('home-turn');emit({type:'wombat-return'});}
  }else if(b.action==='home-turn'){
   // 身体尚在洞内就倒退藏回，完全出了洞才转身，避开洞壁。
   if(b.dist<.82){settleWombat('hide');}
   else {b.turn=ease(phaseAge/.9);if(phaseAge>=.9)settleWombat('home');}
  }else if(b.action==='home'||b.action==='hide'){
   b.dist=mix(depart,-1.08,ease(phaseAge/(b.action==='hide'?1.2:2.15)));
   if(b.dist<=-1.079){b.dist=-1.08;b.turn=0;settleWombat(night?'stir':'den');}
  }
  b.visible=b.dist>-.97;
  b.feet+=Math.abs(b.dist-previousDist)*17+(b.action==='home-turn'?dt*7:0);
 }
 return {wallaby,wombat,grass,tap,step,canTap,birdSong,get time(){return time;}};
}
