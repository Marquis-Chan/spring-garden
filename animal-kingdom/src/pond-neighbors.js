import {clamp,ease,idleClockRate,waterPoint} from './state.js';

export function makePondNeighbors(T,makeFish){
 const coves=[{x:-2.15,z:1.70,y:-.13},{x:2.23,z:.12,y:-.14}];
 return coves.map((home,i)=>{
  const actor=makeFish(T),resident={...home};
  actor.root.scale.setScalar(i===0?.55:.61);
  actor.root.traverse(object=>{
   if(!object.isMesh)return;
   object.material=object.material.clone();
   object.material.color.multiply(new T.Color(i===0?'#bbcadf':'#ea9685'));
  });
  let touched=-Infinity,escapeX=i===0?.38:-.41,escapeZ=.21,lastTime=0,yaw=0;
  return {resident,root:actor.root,touch(time,origin=null){
   if(time-touched<1.06)return false;
   const dx=origin?resident.x-origin.x:0,dz=origin?resident.z-origin.z:0,length=Math.hypot(dx,dz);
   escapeX=length>.05?.44*dx/length:i===0?.38:-.41;
   escapeZ=length>.05?.42*dz/length:.21;
   touched=time;
   return true;
  },place(time){
   const phase=time*idleClockRate*(.84+i*.13)+i,age=time-touched;
   const dart=ease(age/.25)*(1-ease((age-.28)/.78));
   const next=waterPoint({x:home.x+(.27+i*.06)*Math.cos(phase)+escapeX*dart,
    z:home.z+.21*Math.sin(phase)+escapeZ*dart},.80);
   const dx=next.x-resident.x,dz=next.z-resident.z,dt=clamp(time-lastTime,0,.05);
   if(Math.hypot(dx,dz)>.001){
    const heading=Math.atan2(dx,dz)-yaw;
    yaw+=clamp(Math.atan2(Math.sin(heading),Math.cos(heading)),-8*dt,8*dt);
   }
   Object.assign(resident,next,{dart});
   resident.y=home.y-.05*dart;
   actor.root.position.set(resident.x,resident.y,resident.z);
   actor.root.rotation.y=yaw;
   actor.pose({time,tail:Math.sin(time*7+i)*(.39+dart*.33),dive:dart*.38});
   lastTime=time;
  }};
 });
}
