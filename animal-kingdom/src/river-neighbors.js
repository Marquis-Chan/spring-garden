import {sleepStep,  clamp, ease, idleClockRate, idleTravelRate, mix } from './state.js';

const residentLane = {x:27.36,z:9.32,rx:.26,rz:.14};
export const duckCove = {x:29.80,z:8.82,lipX:29.34};
// 访客停在岸洞前方，留出浅滩水道。
const meeting = {x:29.05,z:9.00};
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const turning = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const location = ({x,y,z}) => ({x,y,z});

function onLane(angle) {
  const {x,z,rx,rz}=residentLane;
  return {x:x+Math.sin(angle)*rx,z:z+Math.cos(angle)*rz,
    yaw:Math.atan2(Math.cos(angle)*rx,-Math.sin(angle)*rz)};
}

export function createRiverNeighbors(emit, {waterY}) {
  let angle=.56, time=0, night=false, duckCall=null;
  const ducks = [onLane(angle),{x:duckCove.x,z:duckCove.z,yaw:-Math.PI/2}].map((start,index)=>({
    ...start, y:waterY+.021,index,present:index===0,interactive:index===0,
    time:0,swim:0,paddle:0,sleep:0,headUp:0,call:0,followLook:0,wing:0
  }));
  const [resident, guest]=ducks;
  const replies=[null,null];
  let progress=0, visiting=false, rest=0, wait=27;

  function invite() {
    if (!visiting) {
      // 在洞口后转身再游出；调头时保持当前位置。
      if (!guest.present) guest.yaw=-Math.PI/2;
      guest.present=true;
      visiting=true;
    }
    rest=6.5;
  }

  function tapDuck(index) {
    const actor=ducks[index];
    if (!Number.isInteger(index) || !actor?.interactive) return;
    if (night) {
      emit({type:'sleep',animal:'river-duck',index,...location(actor)});
      return;
    }
    if (duckCall) return;
    invite();
    duckCall={index,at:time,replied:false};
    emit({type:'duckling-call',index,...location(actor)});
    emit({type:'river-duck-ripple',...location(actor)});
  }

  function setNight(value) {
    night=value;
    if (!night) return;
    duckCall=null;
    replies.fill(null);
    if (guest.present && !guest.interactive) visiting=false;
  }

  function guestCourse(dt,active,quietBank) {
    if (!active || (night && (!guest.present || guest.interactive))) return {...guest};
    if (!guest.present) {
      if (quietBank) wait-=dt*idleClockRate;
      if (quietBank && wait<=0) invite();
    }
    if (!guest.present) return {...guest};
    if (progress>=1 && visiting) {
      rest-=dt;
      if (rest<=0) visiting=false;
    }
    const facing=visiting ? bearing(duckCove,meeting) : bearing(meeting,duckCove);
    const destination=visiting?1:0;
    const targetYaw=visiting&&progress>=1 ? bearing(guest,resident) : facing;
    if (Math.abs(turning(guest.yaw,facing))<.46) {
      progress=clamp(progress+Math.sign(destination-progress)*dt/(visiting?1.95:2.45));
    }
    if (progress===0 && !visiting) {
      guest.present=false;
      wait=32;
    }
    const along=ease(progress);
    const x=mix(duckCove.x,meeting.x,along);
    // 出洞时脸和半个身子露出来才可点；回程头先进洞，较早收回点按范围。
    guest.interactive=guest.present&&x<(visiting?29.21:29.15);
    return {x,z:mix(duckCove.z,meeting.z,along),yaw:targetYaw};
  }

  function step(dt,active,quietBank=true) {
    time+=dt;
    const visitor=guestCourse(dt,active,quietBank);
    const age=duckCall?time-duckCall.at:Infinity;
    // 洞里的访客要先游进视野，再抬头回应常驻鸭。
    if (duckCall && !duckCall.replied && age>=.32 && guest.interactive) {
      const source=ducks[duckCall.index], other=ducks[1-duckCall.index];
      duckCall.replied=true;
      replies[other.index]={at:time,toward:source};
      emit({type:'river-duck-reply',index:other.index,...location(other)});
    }
    if (age>3 || (age>1 && duckCall?.replied)) duckCall=null;
    for (const duck of ducks) {
      const {index}=duck, reply=replies[index];
      const elapsed=reply?time-reply.at:-1;
      const answer=reply ? pulse(elapsed/.95) : 0;
      if (elapsed>=.95) replies[index]=null;
      const calling=duckCall?.index===index?pulse(age/.90):0;
      if (index===0 && active && !night) angle+=dt*(.73*idleTravelRate+.16*calling);
      const at=index===0?onLane(angle):visitor;
      const moving=gap(duck,at);
      duck.x=at.x; duck.z=at.z;
      const toward=answer?bearing(duck,reply.toward):at.yaw;
      const yaw=at.yaw;
      const returningToCover=index===1 && guest.present && !guest.interactive && !visiting;
      if (!night || returningToCover) duck.yaw+=clamp(turning(duck.yaw,yaw),-dt*3.25,dt*3.25);
      duck.followLook=answer*clamp(turning(duck.yaw,toward),-.86,.86);
      duck.swim=clamp(moving/Math.max(.001,dt*.32));
      duck.paddle=(duck.paddle+dt*(1.2+duck.swim*2.2)*duck.swim)%1;
      duck.headUp=Math.max(.93*calling,.72*answer);
      duck.call=calling;
      duck.wing=.25*answer;
      duck.sleep=sleepStep(duck.sleep,night&&!returningToCover,dt);
      duck.time=time+index*.84;
    }
  }

  return {ducks,tapDuck,setNight,step};
}
