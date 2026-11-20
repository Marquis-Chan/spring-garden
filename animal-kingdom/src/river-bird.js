import {sleepStep, clamp, ease, idleClockRate, mix} from './state.js';

const sites=['rhino','hippo','branch'];
const turn=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

// 两个活落点由本帧已经摆好姿势的动物提供。飞行的最后一段瞄准移动中的背部。
export function createRiverBird(emit) {
  const bird={x:0,y:0,z:0,yaw:0,site:'rhino',to:null,time:0,flight:0,flap:0,look:0,sleep:0};
  let from=null, elapsed=0, duration=1, rest=16, ready=false, night=false, hippoFree=true;
  let anchors=null;
  function launch(to,reason) {
    from={x:bird.x,y:bird.y,z:bird.z,yaw:bird.yaw};
    bird.to=to;
    elapsed=0;
    const target=anchors[to];
    duration=clamp(.79+Math.hypot(target.x-bird.x,target.z-bird.z)*.16,.92,1.65);
    emit({type:'river-bird-flight',to,reason});
    if(reason==='tap')emit({type:'bird-call'});
  }
  function nextSite() {
    const next=sites[(sites.indexOf(bird.site)+1)%sites.length];
    return next==='hippo'&&!hippoFree?'branch':next;
  }
  function tap() {
    if(!ready || bird.to)return;
    if(night)emit({type:'sleep',animal:'river-bird'});
    else launch(nextSite(),'tap');
  }
  function step(dt,active,dark,available,perches) {
    anchors=perches;
    night=dark;
    hippoFree=available;
    bird.time+=dt;
    const p=anchors[bird.site];
    if(!bird.to){
      bird.x=p.x;bird.y=p.y;bird.z=p.z;
      bird.yaw=p.yaw;ready=true;
      bird.sleep=sleepStep(bird.sleep,night&&bird.site==='branch',dt);
      if(active&&!night)rest-=dt*idleClockRate;
    }
    if((night && (bird.to??bird.site)!=='branch') ||
       (!available && (bird.to??bird.site)==='hippo'))launch('branch',night?'roost':'splash');
    else if(!bird.to && active && !night && rest<=0)launch(nextSite(),'idle');
    if(!bird.to)return;
    elapsed+=dt;
    const t=clamp(elapsed/duration),horizontal=ease(t),lift=Math.sin(t*Math.PI);
    const dest=anchors[bird.to];
    bird.sleep=sleepStep(bird.sleep,false,dt);
    bird.flight=clamp(lift*4);
    bird.flap=Math.sin(elapsed*23+.38);
    bird.x=mix(from.x,dest.x,horizontal);
    bird.z=mix(from.z,dest.z,horizontal)+.34*lift*lift;
    bird.y=mix(from.y,dest.y,horizontal)+(1.04+.13*duration)*lift;
    const aim=Math.atan2(dest.x-from.x,dest.z-from.z);
    const approachYaw=from.yaw+turn(from.yaw,aim)*ease(t/.25);
    bird.yaw=approachYaw+turn(approachYaw,dest.yaw)*ease((t-.66)/.34);
    if(t>=1){
      bird.site=bird.to;bird.to=null;bird.flight=bird.flap=0;rest=18;
      emit({type:'river-bird-land',site:bird.site});
    }
  }
  return {bird,tap,step};
}
