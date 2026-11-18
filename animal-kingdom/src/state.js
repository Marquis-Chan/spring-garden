export const sites=[{x:-1.67,z:-.48,y:.29},{x:.69,z:.23,y:.23}];
export const bounds={x:4.53,z:3.13,cx:0,cz:.34};
export const callPulses=[[.044,.356],[.827,1.134],[1.636,1.935]];
export const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
export const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export const mix=(a,b,q)=>a+(b-a)*q;
// 留出观察时间，点按触发的动作仍沿实际时间播放。
export const idleDelay=seconds=>seconds*1.32;
// 等待下一次自发活动和匀速巡游各自减半。跳跃、触碰和叫声继续使用真实时间。
export const idleClockRate=.5;
export const idleTravelRate=.84*idleClockRate;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const deltaAngle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const rock=sites[0], rockX=1.15, rockZ=.88;

// 点按目标由水面的真实椭圆范围限制，鱼的整个身体都留在深水区。
export function waterPoint(p,margin=1) {
 const dx=(p.x-bounds.cx)/bounds.x,dz=(p.z-bounds.cz)/bounds.z,r=Math.max(1,Math.hypot(dx,dz)/margin);
 return {x:bounds.cx+dx*bounds.x/r,z:bounds.cz+dz*bounds.z/r};
}
export function aroundRock(point,other,clearance=1){
 const x=(point.x-rock.x)/rockX,z=(point.z-rock.z)/rockZ,length=Math.hypot(x,z);
 if(length>=clearance)return point;
 const a=length<.03?Math.atan2((other.z-rock.z)/rockZ,(other.x-rock.x)/rockX):Math.atan2(z,x);
 return {x:rock.x+Math.cos(a)*rockX*clearance,z:rock.z+Math.sin(a)*rockZ*clearance};
}
// 游向石头另一面时先沿石缘转过去，避免鱼身穿过水下的石头。
function steerAroundRock(from,to){
 const x=(from.x-rock.x)/rockX,z=(from.z-rock.z)/rockZ;
 if(Math.hypot(x,z)>1.53)return to;
 const dx=(to.x-from.x)/rockX,dz=(to.z-from.z)/rockZ;
 const length=dx*dx+dz*dz;
 if(length<.001)return to;
 const u=clamp(-(x*dx+z*dz)/length);
 if(Math.hypot(x+dx*u,z+dz*u)>.99)return to;
 const fromAngle=Math.atan2(z,x);
 const toAngle=Math.atan2((to.z-rock.z)/rockZ,(to.x-rock.x)/rockX);
 const route=fromAngle+Math.sign(deltaAngle(fromAngle,toAngle)||1)*.56;
 return {x:rock.x+Math.cos(route)*rockX*1.18,z:rock.z+Math.sin(route)*rockZ*1.18};
}
export function createPond(emit=()=>{}) {
 const initial=sites[0],frog={site:0,x:initial.x,z:initial.z,y:initial.y,yaw:.25,crouch:0,air:0,land:0,look:0,nod:0,throat:0,blink:0};
 const fish={x:1.93,z:1.23,y:-.17,yaw:-1.15,tail:0,dive:0,near:false};
 let t=0,hop=null,queued=null,callAt=-100,delivery=0,target=null,touchAt=-100,touchFishAt=-100,bobUntil=-100,
 greetingAt=-100,eligible=false,awaitDeparture=false,releaseAt=0,greetings=0,speed=0,dragging=false,loopPhase=.2,lastRipple=-1;
 let pondTime=0,nextRoutine=7;
 let tadpoleVisit=null;
 const model={frog,fish,get time(){return t},get busy(){return !!hop},get target(){return target},get greetingCount(){return greetings}};
 // 声音与世界位移分开；音频播放不会阻塞下一步点按。
 function speak(audible=true){
  if(t-callAt<2.18)return false;
  callAt=t;delivery=1;emit({type:'call',audible});return true;
 }
 function nudge(){touchAt=t;}
 function startHop(n,quiet=false) {
  if(n===frog.site){nudge();speak();return;}
  const from=sites[frog.site],to=sites[n];
  hop={from,to,n,at:t,quiet,interactive:!quiet,flight:quiet?.63:.55,height:quiet?.88:1.20};
  if(!quiet){
   eligible=false;awaitDeparture=false;
   nudge();emit({type:'ready',site:n,x:to.x,z:to.z});
  }
 }
 function playSite(n) {
  if(!sites[n])return;
  nextRoutine=pondTime+7;
  if(hop){
   if(hop.quiet&&!hop.interactive&&n===frog.site&&t-hop.at<.18){
    hop=null;queued=null;
   }else{
    queued=n===hop.n?null:n;
    // 玩家赶上了同一次起跳，接管落点反馈，不重起、不改变已经发生的抛物线。
    if(hop.quiet&&!hop.interactive&&!hop.landed&&n===hop.n){
     hop.interactive=true;eligible=false;awaitDeparture=false;
    }
    emit({type:'leaf-touch',site:n,x:sites[n].x,z:sites[n].z});return;
   }
  }
  startHop(n);
 }
 function tapFrog(){
  nextRoutine=pondTime+7;
  if(hop?.quiet&&!hop.interactive&&t-hop.at<.18){hop=null;queued=null;}
  nudge();speak();
 }
 function noticeTadpoles({site,x,z}){
  tadpoleVisit={site,x,z,at:t};
 }
 function guide(p,held=false) {
  target=aroundRock(waterPoint(p,.81),fish);dragging=held;
  releaseAt=t+(held?4.8:4.7);
  if(t-lastRipple>.13){lastRipple=t;emit({type:'ripple',...waterPoint(p,.97),strength:held ? .78 : .98});}
 }
 function finishDrag(){dragging=false;releaseAt=t+4.7;}
 function fishTap(){
  touchFishAt=t;
  const s=Math.sign(fish.x)||1;
  target=aroundRock(waterPoint({x:fish.x-.88*s,z:fish.z+.68},.73),fish);
  releaseAt=t+2.6;emit({type:'ripple',x:fish.x,z:fish.z,strength:.74});
 }
 function testGreeting(){
  if(hop)return;
  const distance=dist(frog,fish);
  const canExhaust=distance>1.42;
  if(awaitDeparture&&canExhaust&&t-greetingAt>1.5){awaitDeparture=false;eligible=true;}
  if(target&&eligible&&!awaitDeparture&&distance<1.18&&t-greetingAt>2.4){
   awaitDeparture=true;greetingAt=t;greetings++;bobUntil=t+.8;
   speak();emit({type:'greet',x:fish.x,z:fish.z,site:frog.site});
  }
 }
 function step(dt,active=false) {
  dt=clamp(dt,0,.05);t+=dt;
  if(active){
   pondTime+=dt*idleClockRate;
   // 拖水引鱼、问候和叫声都先完成；日常跳不会抢走孩子正在观察的动作。
   if(pondTime>=nextRoutine&&!hop&&!target&&!dragging&&t-callAt>=2.18&&t>=bobUntil){
    nextRoutine=pondTime+idleDelay(9.2);
    startHop(1-frog.site,true);
   }
  }
  frog.crouch=frog.land=frog.air=frog.nod=0;
  const touched=t-touchAt;
  if(touched<.22)frog.crouch=Math.sin(Math.PI*touched/.22)*.22;
  if(hop){
   const h=t-hop.at;
   const landing=.18+hop.flight;
   const u=clamp((h-.18)/hop.flight);const m=ease(u);
   frog.x=mix(hop.from.x,hop.to.x,m);frog.z=mix(hop.from.z,hop.to.z,m);
   frog.y=mix(hop.from.y,hop.to.y,m)+hop.height*4*u*(1-u);
   frog.crouch=h<.18?ease(h/.18):0;frog.air=Math.sin(Math.PI*u);
   frog.land=u>=1?1-ease((h-landing)/.23):0;
   const face=Math.atan2(hop.to.x-hop.from.x,hop.to.z-hop.from.z);
   frog.yaw+=deltaAngle(frog.yaw,face)*Math.min(1,dt*14)*(h<landing+.06?1:.1);
   if(h>=landing&&!hop.landed){
    hop.landed=true;frog.site=hop.n;
    emit({type:hop.interactive?'land':'routine-land',site:hop.n,x:frog.x,z:frog.z});
   }
   if(h>=landing+.23){
    // 观察里的一跳没有解锁问候，已有的引鱼进度也不会被清掉。
    if(hop.interactive)eligible=true;
    hop=null;const next=queued;queued=null;
    if(next!==null&&next!==frog.site)startHop(next);
   }
  }else {
   const young=tadpoleVisit?.site===frog.site&&t-tadpoleVisit.at<1.75?tadpoleVisit:null;
   const nearby=dist(frog,fish)<2;
   const watched=young||(nearby?fish:null);
   const desired=watched?Math.atan2(watched.x-frog.x,watched.z-frog.z):.37;
   frog.yaw+=deltaAngle(frog.yaw,desired)*dt*4.2;
   frog.look=watched?clamp((watched.x-frog.x)*.7,-1,1):.16;
   if(young)frog.nod=Math.sin(Math.PI*clamp((t-young.at)/.85))**2;
  }
  const age=t-callAt;
  frog.throat=callPulses.reduce((value,[a,b])=>age>=a&&age<=b?Math.sin(Math.PI*(age-a)/(b-a))*delivery:value,0);
  const blink=t%4.9;
  frog.blink=blink>4.72?Math.sin(Math.PI*(blink-4.72)/.18):0;
  if(target&&!dragging&&t>releaseAt)target=null;
  const intent=target||{x:1.12+Math.cos(loopPhase)*1.42,z:1.21+Math.sin(loopPhase)*.84};
  if(!target&&(dist(intent,fish)<.37||speed<.01))loopPhase+=dt*.71*idleTravelRate;
  const approach=steerAroundRock(fish,intent);
  const dx=approach.x-fish.x,dz=approach.z-fish.z,dd=Math.hypot(dx,dz);
  // 先转头再加速，避免在原地不自然地横移或转圈。
  const turn=dd>.13?deltaAngle(fish.yaw,Math.atan2(dx,dz)):0;
  fish.yaw+=clamp(turn,-dt*4.3,dt*4.3);
  const goal=Math.min(target?2.55:1.1*idleTravelRate,dd*3.1)*Math.max(.06,Math.cos(turn))*(t<bobUntil ? .32 : 1);
  speed+=(goal-speed)*Math.min(1,dt*5);
  if(dd>.12){
   const step=Math.min(dd,speed*dt);
   const next=waterPoint({x:fish.x+Math.sin(fish.yaw)*step,z:fish.z+Math.cos(fish.yaw)*step},.82);
   Object.assign(fish,aroundRock(next,fish));
  }
  fish.dive=t-touchFishAt<.85?Math.sin(Math.PI*(t-touchFishAt)/.85):0;
  fish.near=dist(frog,fish)<1.2;
  frog.look=clamp(frog.look,-1,1);
  fish.y=-.20-.20*fish.dive+(t<bobUntil?Math.sin(Math.PI*clamp(1-(bobUntil-t)/.8))*.11:0);
  fish.tail=Math.sin(t*(speed>.65?10:5))*Math.min(.9,.24+speed*.31);
  testGreeting();
 }
 return Object.assign(model,{step,playSite,guide,finishDrag,fishTap,tapFrog,noticeTadpoles});
}
