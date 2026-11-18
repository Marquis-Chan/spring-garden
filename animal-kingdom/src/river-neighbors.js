import { callPulses, clamp, idleTravelRate } from './state.js';

const lanes = [
  {x:27.30,z:9.12,rx:.31,rz:.18,angle:.56},
  {x:28.52,z:9.13,rx:.29,rz:.16,angle:-.65}
];
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const turning = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const location = ({x,y,z}) => ({x,y,z});

function onLane(lane, angle) {
  return {
    x:lane.x+Math.sin(angle)*lane.rx,
    z:lane.z+Math.cos(angle)*lane.rz,
    yaw:Math.atan2(Math.cos(angle)*lane.rx,-Math.sin(angle)*lane.rz)
  };
}

export function createRiverNeighbors(emit, {waterY, frogPerch}) {
  const frog = {...frogPerch, yaw:.36, time:0, throat:0, blink:0};
  const ducks = lanes.map((lane,index) => ({...onLane(lane,lane.angle), y:waterY+.021,index,
    time:0,swim:0,paddle:0,sleep:0,headUp:0,call:0,followLook:0,wing:0}));
  const phases = lanes.map(({angle})=>angle);
  const replies = [null,null];
  let time = 0, night = false, frogCalled = -Infinity, duckCall = null;

  function tapDuck(index) {
    if (!Number.isInteger(index)) return;
    const actor = ducks[index];
    if (!actor) return;
    if (night) {
      emit({type:'sleep',animal:'river-duck',index,...location(actor)});
      return;
    }
    if (duckCall) return;
    duckCall = {index,at:time,replied:false};
    emit({type:'duckling-call',index,...location(actor)});
  }

  function tapFrog() {
    if (time-frogCalled<2.18) return;
    frogCalled=time;
    emit({type:'frog-call',...location(frog)});
    if (night) return;
    for (const duck of ducks) {
      if (gap(duck,frog)>1.38) continue;
      replies[duck.index]={at:time+.22,toward:frog,pending:true};
    }
  }

  function setNight(value) {
    night=value;
    if (!night) return;
    duckCall=null;
    replies.fill(null);
  }

  function step(dt, active) {
    time+=dt;
    const callAge=duckCall?time-duckCall.at:Infinity;
    if (duckCall && !duckCall.replied && callAge>=.32) {
      const source=ducks[duckCall.index], other=ducks[1-duckCall.index];
      duckCall.replied=true;
      replies[other.index]={at:time,toward:source};
      emit({type:'river-duck-reply',index:other.index,...location(other)});
      emit({type:'river-duck-ripple',...location(source)});
    }
    if (callAge>1) duckCall=null;
    for (const [index,duck] of ducks.entries()) {
      const reply=replies[index], answer=reply?pulse((time-reply.at)/.93):0;
      if (answer>0 && reply.pending) {
        reply.pending=false;
        emit({type:'river-duck-listens',index,...location(duck)});
      }
      const calling=duckCall?.index===index?pulse(callAge/.90):0;
      if (active && !night) phases[index]+=dt*(.62*idleTravelRate+.46*answer+.22*calling);
      const at=onLane(lanes[index],phases[index]);
      const moving=gap(duck,at);
      duck.x=at.x;duck.z=at.z;
      duck.yaw+=turning(duck.yaw,at.yaw)*Math.min(1,dt*9);
      duck.swim=clamp(moving/Math.max(.001,dt*.32));
      duck.paddle=(duck.paddle+dt*(1.2+duck.swim*2.2)*duck.swim)%1;
      duck.headUp=Math.max(.93*calling,.69*answer);
      duck.call=calling;
      duck.wing=.26*answer;
      duck.followLook=answer?answer*clamp(turning(duck.yaw,bearing(duck,reply.toward)),-.91,.91):0;
      duck.sleep=clamp(duck.sleep+dt*(night?2.4:-3.1));
      duck.time=time+index*.84;
    }
    const age=time-frogCalled;
    frog.throat=callPulses.reduce((value,[a,b])=>Math.max(value,pulse((age-a)/(b-a))),0);
    frog.blink=pulse(((time%4.8)-4.60)/.20);
    frog.time=time;
  }

  return {ducks,frog,tapDuck,tapFrog,setNight,step};
}
