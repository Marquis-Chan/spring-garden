// 面朝本地 +Z。后脚先落、同侧前脚随后，左右错开半周期。
export const corgiLegs=[
 {side:1,front:false,offset:0}, {side:1,front:true,offset:.25},
 {side:-1,front:false,offset:.5}, {side:-1,front:true,offset:.75}
].map(leg=>({...leg,x:leg.side*(leg.front?.145:.152),z:leg.front?.253:-.412}));

// 脚掌锚定在地面坐标中；身体前移或转身时，只给摆动中的爪子计算新落点。
export function createCorgiWalk(dog){
 let lastX=dog.x,lastZ=dog.z,lastYaw=dog.yaw,cycle=0,trot=0,stopped=1;
 const feet=corgiLegs.map(leg=>{
  const x=lastX+Math.cos(lastYaw)*leg.x+Math.sin(lastYaw)*leg.z;
  const z=lastZ-Math.sin(lastYaw)*leg.x+Math.cos(lastYaw)*leg.z;
  return {x,z,localX:leg.x,localZ:leg.z,up:0,pitch:0,startX:x,startZ:z,endX:x,endZ:z,progress:1,lap:-Infinity,landed:0};
 });
 dog.feet=feet;
 function step(x,z,yaw,vx,vz,spin,dt){
  const speed=Math.hypot(vx,vz),motion=speed+.53*Math.abs(spin),moving=motion>.018;
  stopped=moving?0:stopped+dt;
  trot+=Math.min(1,dt*5)*(Math.min(1,Math.max(0,(speed-.91)/.48))-trot);
  const rate=motion/(.43+.15*trot),swing=.34+.07*trot;
  cycle+=dt*rate;
  const cos=Math.cos(yaw),sin=Math.sin(yaw);
  let airborne=feet.filter(f=>f.progress<1).length;
  for(let i=0;i<feet.length;i++){
   const f=feet[i],leg=corgiLegs[i];
   const beat=cycle-leg.offset-(leg.front?.25*trot:0);
   const lap=Math.floor(beat),phase=beat-lap;
   const neutralX=x+cos*leg.x+sin*leg.z,neutralZ=z-sin*leg.x+cos*leg.z;
   const deviation=Math.hypot(f.x-neutralX,f.z-neutralZ);
   // 急转后从小碎步转为直行，及时收回落在身后的脚，避免腿被拖长一整步。
   const reaching=moving&&deviation>.207&&cycle-f.landed>.18;
   const due=moving&&lap>f.lap&&phase<swing;
   const settle=stopped>.10&&airborne===0&&Math.hypot(f.x-neutralX,f.z-neutralZ)>.022;
   const start=f.progress===1&&airborne<2&&(due||settle||reaching);
   if(start){
    f.startX=f.x;f.startZ=f.z;f.progress=0;f.lap=lap;
    f.swingLength=due?Math.max(.12,swing-phase):reaching?.24:swing;
    airborne++;
   }
   if(f.progress<1){
    const t=f.progress=Math.min(1,f.progress+dt*(moving?Math.max(1.5,rate/f.swingLength):5));
    // 摆动前段随路线修正，临落地锁定目标。静止后，剩下的半步仍会踏实。
    if(start||t<.80){
     const lead=moving?((1-t)*f.swingLength+(1-swing)*.5)/rate:0;
     const heading=yaw+spin*lead;
     const endX=x+vx*lead+Math.cos(heading)*leg.x+Math.sin(heading)*leg.z;
     const endZ=z+vz*lead-Math.sin(heading)*leg.x+Math.cos(heading)*leg.z;
     const follow=start?1:Math.min(1,dt*23);
     f.endX+=(endX-f.endX)*follow;f.endZ+=(endZ-f.endZ)*follow;
    }
    const e=t*t*(3-2*t),arc=t===1?0:Math.sin(Math.PI*t)**1.5;
    f.x=f.startX+(f.endX-f.startX)*e;f.z=f.startZ+(f.endZ-f.startZ)*e;
    // 掉头时内侧脚走短弧；摆动脚绕开已经占住的脚印，支撑脚保持原位。
    for(const other of feet){
     if(other===f)continue;
     const ox=f.x-other.x,oz=f.z-other.z,distance=Math.hypot(ox,oz);
     if(distance<.152){
      const ux=distance>.0001?ox/distance:leg.side*cos;
      const uz=distance>.0001?oz/distance:-leg.side*sin;
      f.x=other.x+.152*ux;f.z=other.z+.152*uz;
     }
    }
    f.up=(moving?(leg.front?.054:.065)+.018*trot:.037)*arc;
    f.pitch=.20*Math.sin(t*Math.PI*2)*arc;
    if(t===1){airborne--;f.landed=cycle;}
   }
   const dx=f.x-x,dz=f.z-z;
   f.localX=cos*dx-sin*dz;f.localZ=sin*dx+cos*dz;
  }
 }
 return function advance(dt){
  if(!dt)return;
  const dx=dog.x-lastX,dz=dog.z-lastZ,turn=Math.atan2(Math.sin(dog.yaw-lastYaw),Math.cos(dog.yaw-lastYaw));
  // 将较慢的画面帧细分，确保手机和桌面都不会跳过某只脚的离地时刻。
  const count=Math.ceil(dt*120);
  for(let i=1;i<=count;i++){
   const t=i/count;
   step(lastX+dx*t,lastZ+dz*t,lastYaw+turn*t,dx/dt,dz/dt,turn/dt,dt/count);
  }
  dog.stride=cycle*2*Math.PI;
  lastX=dog.x;lastZ=dog.z;lastYaw=dog.yaw;
 };
}
