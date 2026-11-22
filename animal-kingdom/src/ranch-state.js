import {clamp,ease,sleepStep} from './state.js';
import {createCorgiWalk} from './corgi-walk.js';

const homes={
 cow:[[-3.20,-1.50,.70],[-.35,-1.75,-.68]],
 lamb:[[1.38,-1.62,.19],[3.40,-1.08,-.38]],
 hen:[[-2.54,1.34,.52]],rooster:[[4.08,1.35,-.60]],
 chick:[[-1.30,1.14,.25],[-.50,.71,.06],[.30,1.04,.21],[1.10,.68,.09],[1.90,1.13,-.15]],
 dog:[[-3.12,2.97,.94]]
};
const cowNose=.810;
const chickBeak=index=>.197*(1+.022*(index%3)/.545);
const hayMouths=[[-2.07,-.09],[-1.57,-.09]];
const waitForSleep=.57;
const gap=(a,x,z)=>Math.hypot(a.x-x,a.z-z);
const bearing=(x,z)=>Math.atan2(x,z);
const pulse=t=>t>0&&t<1?Math.sin(Math.PI*t):0;
const approach=(v,to,dt,rate)=>v+clamp(to-v,-dt*rate,dt*rate);

function turn(a,yaw,dt){
 const difference=Math.atan2(Math.sin(yaw-a.yaw),Math.cos(yaw-a.yaw));
 const limit=(a.kind==='dog'?1.85:3.5)*dt;
 a.yaw+=clamp(difference,-limit,limit);
}

// 蹄和爪先转向，迈过的距离再带动步相。抵达精确落点后只调整朝向。
function walk(a,x,z,dt,speed,yaw){
 const distance=gap(a,x,z);
 if(distance<.012){
  a.x=x;a.z=z;
  if(yaw!==undefined)turn(a,yaw,dt);
  return true;
 }
 const direction=bearing(x-a.x,z-a.z);
 turn(a,direction,dt);
 const alignment=ease((Math.cos(direction-a.yaw)-.72)/.28);
 const travel=Math.min(distance,speed*dt*alignment);
 a.x+=(x-a.x)*travel/distance;a.z+=(z-a.z)*travel/distance;
 if(a.kind!=='dog')a.stride+=travel*(a.kind==='chick'?27:a.kind==='cow'?7.4:12);
 a.walking=travel/Math.max(.0001,speed*dt);
 return false;
}

const idleDelay={cow:18,lamb:23,hen:12,rooster:27,chick:15,dog:1};
function makeAnimal(kind,index,[x,z,yaw]){
 return {kind,index,x,y:0,z,yaw,time:0,gait:0,stride:index*1.3,sleep:0,bite:0,look:0,
  display:0,call:0,hop:0,voice:9,attention:9,walking:0,idleAway:false,nextIdle:idleDelay[kind]+index*2.7};
}

export function createRanch(emit=()=>{}){
 const groups=Object.fromEntries(Object.entries(homes).map(([kind,places])=>
  [kind,places.map((place,index)=>makeAnimal(kind,index,place))]));
 const animals=Object.values(groups).flat();
 const advanceDogFeet=createCorgiWalk(groups.dog[0]);
 const hay={kind:'hay',index:0,x:-1.82,y:0,z:-.05,amount:1,pulse:0};
 const seeds=homes.chick.map(([x,z],i)=>({x:x+.23,z:z+(i%2?.99:.83),amount:1}));
 const henSeed={x:-1.91+Math.sin(.69)*.418,z:1.39+Math.cos(.69)*.418,amount:1};
 const grain={kind:'grain',index:0,x:.82,y:0,z:-.11,amount:1,pulse:0,seeds,henSeed};
 const props=[hay,grain];
 let time=0,night=false,cowTurn=0,meal=null,queuedCow=null,hayRest=0;
 let flock=null,grainRest=0,queuedFlock=false,flockCaller=null;
 let jumps=null,queuedLamb=null,nextLeap=18,patrolSide=1,patrolWait=1.0;
 let wakingTap=null;
 const waitingSleep=new Set();
 const action=(name,kind,index)=>emit({type:'ranch-'+name,kind,index});

 function voice(a){
  if(a.voice<1.6)return;
  a.voice=0;action('call',a.kind,a.index);
 }
 function feedCow(index){
  const cow=groups.cow[index];
  cow.attention=0;hay.pulse=1;
  if(meal){queuedCow=index;return;}
  meal={index,phase:'walk',age:0};
  hay.amount=1;voice(cow);action('hay-offer','cow',index);
 }
 function leap(index,manual){
  if(jumps){if(manual)queuedLamb=index;return;}
  jumps={lead:index,age:0,starts:groups.lamb.map(a=>({x:a.x,z:a.z,grounded:false}))};
  if(manual)voice(groups.lamb[index]);
  action('follow-hop','lamb',index);
 }
 function scatterFeed(caller){
  caller.attention=0;grain.pulse=1;
  if(flock){queuedFlock=true;flockCaller=caller;return;}
  voice(caller);
  flock={age:0,peckTimes:Array(5).fill(0),allFedAt:null};
  for(const seed of [henSeed,...seeds])seed.amount=1;
  action('scatter',caller.kind,caller.index);
 }
 function tap(kind,index=0){
  const a=groups[kind]?.[index];
  if(!a&&!(index===0&&(kind==='hay'||kind==='grain')))return;
  if(kind==='dog'){
   a.attention=0;patrolWait=night?.68:.88;
   if(!night)voice(a);
   action('dog-watch','dog',0);return;
  }
  if(night){
   const resting=a||(kind==='hay'?groups.cow[cowTurn]:groups.hen[0]);
   if(resting.sleep>=waitForSleep)action('sleep',resting.kind,resting.index);
   else waitingSleep.add(resting);
   return;
  }
  const actor=a||(kind==='hay'?groups.cow[cowTurn]:groups.hen[0]);
  if(actor.sleep>.20){wakingTap={kind,index,actor};return;}
  if(kind==='cow'||kind==='hay'){
   const first=kind==='cow'?index:cowTurn;cowTurn=1-first;feedCow(first);
  }else if(kind==='lamb')leap(index,true);
  else if(kind==='chick'){
   const sibling=groups.chick[index===groups.chick.length-1?index-1:index+1];
   actor.attention=0;sibling.attention=-.39;voice(actor);action('wing-wave',kind,index);
  }else scatterFeed(actor);
 }

 function idle(a,dt){
  if(a.sleep>.20)return;
  const [x,z,yaw]=homes[a.kind][a.index];
  if(time>a.nextIdle){a.idleAway=!a.idleAway;a.nextIdle=time+idleDelay[a.kind]+a.index*1.6;}
  const side=a.index%2?-1:1;
  const offset=a.kind==='cow'?.27:a.kind==='chick'?.12:.20;
  walk(a,x+(a.idleAway?side*offset:0),z-(a.idleAway?offset*.71:0),dt,a.kind==='chick'?.30:.40,yaw);
 }
 function cows(dt){
  for(const a of groups.cow){
   const [hx,hz,hy]=homes.cow[a.index];
   if(!meal||meal.index!==a.index){
    if(meal){
     a.look=approach(a.look,a.index?-.58:.58,dt,1.8);
     turn(a,hy,dt);
    }else idle(a,dt);
    continue;
   }
   const side=a.index===0?1:-1,yaw=side*.64,[mx,mz]=hayMouths[a.index];
   if(meal.phase==='walk'){
    const arrived=walk(a,mx-cowNose*Math.sin(yaw),mz-cowNose*Math.cos(yaw),dt,.68,yaw);
    if(arrived&&Math.cos(yaw-a.yaw)>.998){meal.phase='bite';meal.age=0;}
   }else if(meal.phase==='bite'){
    meal.age+=dt;a.bite=ease(meal.age/.51)*(1-ease((meal.age-1.73)/.53));
    if(meal.age>.50&&hay.amount>.34)hay.amount=Math.max(.34,hay.amount-dt*.55);
    if(meal.age>=2.27){action('hay-eaten',a.kind,a.index);meal.phase='home';}
   }else if(walk(a,hx,hz,dt,.61,hy)){
    meal=null;hayRest=0;
    if(queuedCow!==null){const index=queuedCow;queuedCow=null;feedCow(index);}
   }
  }
  if(!meal&&(hayRest+=dt)>1.6)hay.amount=approach(hay.amount,1,dt,.55);
 }
 // 每只羊在自己的跳道表演；先蓄力，前掌抬起，再依次落蹄。入夜时空中的一跃照常落地。
 function lambs(dt){
  if(!jumps&&time>nextLeap&&!night)leap(Math.floor(time/18)%2,false);
  if(!jumps){if(!night)for(const a of groups.lamb)idle(a,dt);return;}
  jumps.age+=dt;
  for(const a of groups.lamb){
   const j=a.index,home=homes.lamb[j],origin=jumps.starts[j],delay=j===jumps.lead?0:.50;
   const t=jumps.age-delay;
   if(t<0||origin.grounded)continue;
   const reverse=origin.z>home[1]+.40;
   const dx=home[0]+(reverse?0:j?-.28:.31)-origin.x;
   const dz=home[1]+(reverse?0:.65)-origin.z,yaw=bearing(dx,dz);
   const takeoff=.65+(reverse?.32:0);
   turn(a,yaw,dt);
   const p=clamp((t-takeoff)/.70);
   a.hop=pulse(p);a.y=.36*a.hop;
   a.display=Math.max(a.display,.72*pulse(t/takeoff));
   a.x=origin.x+dx*ease(p);a.z=origin.z+dz*ease(p);
  }
  if(jumps.age>2.27){jumps=null;nextLeap=time+19;
   if(!night&&queuedLamb!==null){const i=queuedLamb;queuedLamb=null;leap(i,true);}
  }
 }
 function birds(dt){
  const hen=groups.hen[0],rooster=groups.rooster[0];
  if(!flock){
   for(const a of [hen,rooster,...groups.chick])idle(a,dt);
   if((grainRest+=dt)>2.4)for(const seed of [henSeed,...seeds])seed.amount=approach(seed.amount,1,dt,.65);
  }else{
   flock.age+=dt;
   hen.look=.42*(1-ease((flock.age-.65)/.45));hen.display=Math.max(hen.display,.65*pulse(flock.age/1.17));
   const guide=walk(hen,-1.91,1.39,dt,.55,.69);
   if(guide&&flock.age>1.05&&Math.cos(hen.yaw-.69)>.998){
    hen.bite=Math.max(0,Math.sin((flock.age-1.05)*7));
    if(hen.bite>.87)henSeed.amount=Math.max(0,henSeed.amount-2.4*dt);
   }
   rooster.look=-.58;
   for(const a of groups.chick){
    const seed=seeds[a.index],yaw=.29-a.index*.06;
    if(flock.age<.29+a.index*.12)continue;
    const reach=chickBeak(a.index);
    if(walk(a,seed.x-Math.sin(yaw)*reach,seed.z-Math.cos(yaw)*reach,dt,.65,yaw)&&Math.cos(yaw-a.yaw)>.998){
     const age=(flock.peckTimes[a.index]+=dt);
     a.bite=age<1.55?Math.max(0,Math.sin(age*7.4)):0;
     if(a.bite>.86)seed.amount=Math.max(0,seed.amount-3.4*dt);
    }
   }
   if(flock.peckTimes.every(t=>t>1.55)){
    for(const seed of seeds)seed.amount=0;
    if(flock.allFedAt===null){flock.allFedAt=time;action('grain-eaten','hen',0);}
    if(time-flock.allFedAt>.48){
     flock=null;grainRest=0;
     if(queuedFlock){queuedFlock=false;scatterFeed(flockCaller);}
    }
   }
  }
  grain.amount=seeds.reduce((sum,s)=>sum+s.amount,0)/seeds.length;
 }
 function dog(dt){
  const a=groups.dog[0];
  if(patrolWait>0){patrolWait-=dt;a.bite=.69*pulse(Math.min(1,Math.max(0,patrolWait)/1.1));}
  else if(walk(a,patrolSide*3.14,patrolSide===1?3.03:2.94,dt,night?.74:.55)){
   patrolSide*=-1;patrolWait=night?1.30:2.4;
  }
  a.display=Math.max(a.display,.28+.22*Math.sin(time*3));
 }
 function setNight(value){
  if(night===value)return;
  night=value;queuedCow=null;queuedLamb=null;queuedFlock=false;wakingTap=null;waitingSleep.clear();
  if(night){
   meal=null;flock=null;
   for(const a of animals){a.voice=9;a.attention=9;}
   if(jumps){
    groups.lamb.forEach((a,i)=>{jumps.starts[i].grounded=a.hop<.001;});
    if(jumps.starts.every(p=>p.grounded))jumps=null;
   }
  }else{
   nextLeap=time+17;
   for(const a of animals)a.nextIdle=time+idleDelay[a.kind]+a.index*1.7;
  }
 }
 function step(seconds,active=true,dark=false){
  setNight(Boolean(dark));
  const dt=clamp(seconds,0,.065);if(!dt)return;
  if(!active){
   // 离开时放下待办点按；日落仍会归位，避免下次打开才在黑夜里开始赶路。
   wakingTap=null;queuedCow=null;queuedLamb=null;queuedFlock=false;waitingSleep.clear();
   if(!night){for(const a of animals)a.sleep=sleepStep(a.sleep,false,dt);return;}
  }
  time+=dt;hay.pulse=Math.max(0,hay.pulse-1.8*dt);grain.pulse=Math.max(0,grain.pulse-1.8*dt);
  for(const a of animals){
   a.time=time;a.voice+=dt;a.attention+=dt;a.walking=0;
   a.call=pulse(a.voice/1.20);a.display=pulse(a.attention/1.52);
   a.bite=night?approach(a.bite,0,dt,2.8):0;a.look=approach(a.look,0,dt,.74);
   if(!night)a.sleep=sleepStep(a.sleep,false,dt);
  }
  if(!night&&wakingTap&&wakingTap.actor.sleep<=.20){const {kind,index}=wakingTap;wakingTap=null;tap(kind,index);}
  lambs(dt);dog(dt);advanceDogFeet(dt);
  if(!night){cows(dt);birds(dt);}
  else{
   for(const a of animals){
    if(a.kind==='dog'||(a.kind==='lamb'&&jumps))continue;
    const [x,z,yaw]=homes[a.kind][a.index];
    const settled=walk(a,x,z,dt,a.kind==='cow'?.65:.75,yaw);
    if(settled){
     a.sleep=sleepStep(a.sleep,true,dt);
     if(a.sleep>=waitForSleep&&waitingSleep.delete(a))action('sleep',a.kind,a.index);
    }
   }
  }
  for(const a of animals)a.gait=approach(a.gait,a.walking,dt,6.2);
 }
 return {animals,props,tap,step,setNight,get time(){return time;},get night(){return night;}};
}
