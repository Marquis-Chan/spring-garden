import {sleepStep,  clamp, idleClockRate, ease, idleDelay, idleTravelRate, mix } from './state.js';

export const coastWaterY = .42;
const shoreTop = .65;
const shoreStart = 13;
const grade = .18;

export function coastGroundHeight(z) {
  return Math.max(.263, shoreTop - grade * Math.max(0, z - shoreStart));
}

export const coastPoints = {
  waterEntryZ: shoreStart + (shoreTop - coastWaterY) / grade,
  tidePool: { x: 36.72, y: .53, z: 13.47 },
  kelp: [{x:34.18,y:.36,z:17.47},{x:39.03,y:.36,z:17.92}],
  lanes: [
    { land: { x: 35.20, z: 12.65 }, ramp: { x: 35.20, z: 13.28 }, swim: { x: 35.15, z: 15.85 } },
    { land: { x: 38.35, z: 12.27 }, ramp: { x: 38.35, z: 13.23 }, swim: { x: 38.62, z: 15.75 } }
  ],
  fish: [{ x: 35.95, y: .348, z: 15.43 }, { x: 38.55, y: .342, z: 16.60 }]
};

const approachTime = .43;
const crouchTime = .25;
const slideTime = .52;
const wetGlideTime = .43;
const climbTime = .88;
const floatingY = .34;
const shoreYaw = [.12, -.25];
const shoreWalk = [{ x: 35.58, z: 12.52 }, { x: 38.00, z: 12.51 }];
const waveSpeed = 2.8;
const waveRadius = 1.66;
const shoreGreetingTime = 1.65;
const slopePitch = Math.atan(grade);
const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
const valid = (index, list) => Number.isInteger(index) && index >= 0 && index < list.length;

export function createCoast(emit = () => {}) {
  const { lanes, waterEntryZ } = coastPoints;
  const penguins = lanes.map(({ land }, index) => ({
    ...land, y: coastGroundHeight(land.z), index, yaw: shoreYaw[index], time: 0, phase: 'land', step: 0, progress: 0,
    gait: 0, display: 0, call: 0, look: 0, acknowledge: 0, crouch: 0, prone: 0, slide: 0, paddle: 0, stand: 1, sleep: 0, land: 0, pitch: 0,
    groundY: shoreTop, leftGroundY: shoreTop, rightGroundY: shoreTop,
    leftFootPitch: 0, rightFootPitch: 0, surface: coastWaterY
  }));
  const fish = coastPoints.fish.map((point, index) => ({ ...point, index, yaw: 0, time: 0, tail: 0, dive: 0, poseDive: 0, alert: 0 }));
  const motions = lanes.map(() => null);
  const returnRequested = lanes.map(() => false);
  const penguinCallAt = lanes.map(() => -Infinity);
  const landedAt = lanes.map(() => -Infinity);
  const fishTouchAt = fish.map(() => -Infinity);
  const fishWave = fish.map(() => null);
  const fishPhase = [.40, 1.92];
  const waves = [];
  let time = 0;
  let shoreTime = 0;
  const shoreRoutines = [{ next: .95, index: 0 }, { next: 2.58, index: 0 }];
  const shoreGaze = lanes.map(() => null);
  let waveId = 0;
  let night = false;
  const crabDen = {x:36.43,z:13.08}, crabLedge = {x:37.48,z:13.21};
  const crab = {...crabDen,y:coastGroundHeight(crabDen.z),phase:'den',stride:0,claw:0,gait:0};
  let crabAt = 0, noticed = false;
  const kelp=coastPoints.kelp.map(p=>({...p,sway:0})),kelpTap=[-Infinity,-Infinity];
  const fry=Array.from({length:3},(_,i)=>({...kelp[0],index:i,visible:false,yaw:0,tail:0}));
  let shoalFrom=null,shoalAge=0,dartAt=-Infinity;

  function tapKelp(index){
    if(!valid(index,kelp))return;
    kelpTap[index]=time;
    if(shoalFrom!==null){dartAt=time;return;}
    shoalFrom=index;shoalAge=0;
    emit({type:'kelp-fry',from:index});
  }

  function stepShoal(dt){
    for(const [i,plant] of kelp.entries())plant.sway=pulse((time-kelpTap[i])/.9);
    if(shoalFrom===null)return;
    const start=kelp[shoalFrom],end=kelp[1-shoalFrom],dir=Math.sign(end.x-start.x);
    shoalAge+=dt*(1+.75*pulse((time-dartAt)/.57));
    for(const f of fry){
      const u=clamp((shoalAge-f.index*.22)/2.8),arc=Math.sin(u*Math.PI);
      f.visible=u>0&&u<1;
      f.x=mix(start.x,end.x,u);
      f.z=mix(start.z,end.z,u)+(.39*f.index-.41)*arc+(f.index-1)*.13;
      f.y=.345+Math.sin(u*Math.PI*2+f.index)*.012;
      f.yaw=Math.atan2(end.x-start.x,end.z-start.z+(.39*f.index-.41)*Math.PI*Math.cos(u*Math.PI));
      f.tail=Math.sin(shoalAge*19-f.index)*.58*dir;
    }
    if(shoalAge>=3.25){
      kelpTap[1-shoalFrom]=time;
      emit({type:'fry-shelter',at:1-shoalFrom});
      shoalFrom=null;
    }
  }
  function tapFry(index){
    const f=fry[index];
    if(!f?.visible)return;
    dartAt=time;emit({type:'ripple',x:f.x,y:coastWaterY,z:f.z});
  }

  function tapCrab() {
    if (crab.phase!=='den' && crab.phase!=='ledge') return;
    crab.phase=crab.phase==='den'?'out':'home';
    crabAt=time;
    noticed=false;
    emit({type:'crab-signal',from:crab.phase==='out'?'pool':'ledge'});
  }

  // 潮池边缘高低不齐，小蟹绕着干岩台横走，先探螯再迈足。
  function stepCrab(dt) {
    const age=time-crabAt;
    if(crab.phase==='ledge' && age>10 && !night) { crab.phase='home';crabAt=time;return; }
    if(crab.phase!=='out' && crab.phase!=='home') {crab.gait=crab.claw=0;return;}
    const goingOut=crab.phase==='out';
    const progress=clamp((age-.50)/1.44);
    const along=goingOut?ease(progress):1-ease(progress);
    const last=position(crab);
    crab.x=mix(crabDen.x,crabLedge.x,along);
    crab.z=mix(crabDen.z,crabLedge.z,along)-Math.sin(along*Math.PI)*.20;
    crab.y=coastGroundHeight(crab.z);
    crab.stride+=(goingOut?1:-1)*distance(crab,last)*29;
    crab.claw=Math.max(pulse(age/.56),.73*pulse((age-1.94)/.64));
    crab.gait=pulse(progress);
    const neighbor=penguins[1];
    if(goingOut&&!noticed&&!night&&neighbor.phase==='land'&&neighbor.sleep<.05&&distance(crab,neighbor)<1.32){
      noticed=true;
      shoreGaze[1]={at:time,toward:crab,crab:true};
      emit({type:'penguin-crab-look',index:1});
    }
    if(age>=2.58){
      crab.phase=goingOut?'ledge':'den';crabAt=time;
      emit({type:'crab-settle',site:crab.phase});
    }
  }

  function begin(actor, phase, duration) {
    actor.phase = phase;
    actor.progress = 0;
    motions[actor.index] = { at: time, from: position(actor), duration };
  }

  function sleepTap(actor) {
    if (actor.phase === 'land') emit({ type: 'sleep', animal: 'penguin', index: actor.index });
  }

  function tapPenguin(index) {
    if (!valid(index, penguins)) return;
    const actor = penguins[index];
    if (night) {
      sleepTap(actor);
      return;
    }
    if (actor.phase !== 'land' && actor.phase !== 'swim') return;
    if (time - penguinCallAt[index] < .70) return;
    penguinCallAt[index] = time;
    if (actor.phase === 'land') begin(actor, 'waddle', .67);
    emit({ type: 'penguin-call', index });
  }

  function tapRamp(index) {
    if (!valid(index, penguins)) return;
    const actor = penguins[index];
    if (night) {
      sleepTap(actor);
      return;
    }
    if (actor.phase !== 'land' && actor.phase !== 'waddle') return;
    begin(actor, 'approach', approachTime);
  }

  function startReturn(actor) {
    const lane = lanes[actor.index];
    returnRequested[actor.index] = false;
    const gap = distance(actor, { x: lane.ramp.x, z: waterEntryZ });
    begin(actor, 'return', .64 + gap * .08);
  }

  function tapStone(index) {
    if (!valid(index, penguins)) return;
    const actor = penguins[index];
    if (actor.phase === 'land' || actor.phase === 'waddle') {
      if (night) sleepTap(actor);
      else tapPenguin(index);
      return;
    }
    if (actor.phase === 'return' || actor.phase === 'climb') return;
    // 坡上只留一个回岸请求。先等本次腹部入水落定，再走回程。
    returnRequested[index] = true;
    if (actor.phase === 'swim' && time - motions[index].at >= wetGlideTime) startReturn(actor);
  }

  function waterEntry(actor) {
    // 进入水的这一帧满伏腹锚点就是根原点，坡高和水高在这里相同。
    actor.y = coastWaterY;
    actor.z = waterEntryZ;
    actor.prone = 1;
    actor.stand = 0;
    begin(actor, 'swim', wetGlideTime);
    const wave = { id: ++waveId, index: actor.index, ...position(actor), at: time, radius: 0, speed: waveSpeed, maxRadius: waveRadius };
    const contacts = fish.map(item => ({ gap: distance(wave, item), hit: false }));
    waves.push({ ...wave, contacts });
    emit({ type: 'water-entry', ...wave });
  }

  function moveToward(actor, from, to, progress, grounded) {
    const before = position(actor);
    actor.x = mix(from.x, to.x, progress);
    actor.z = mix(from.z, to.z, progress);
    if (!grounded) return;
    actor.y = coastGroundHeight(actor.z);
    actor.step += distance(before, actor) * 17;
  }

  function standOnLand(actor, lane, point = lane.land) {
    Object.assign(actor, point);
    actor.y = coastGroundHeight(actor.z);
    actor.phase = 'land';
    actor.prone = actor.paddle = actor.gait = actor.pitch = 0;
    actor.stand = 1;
    motions[actor.index] = null;
    shoreRoutines[actor.index].next = shoreTime + 2.22;
  }

  function stepWalk(actor, move, lane, progress) {
    if (actor.phase === 'waddle') {
      const before = position(actor);
      const sway = pulse(progress);
      actor.x = move.from.x + Math.sin(progress * Math.PI * 4) * .068 * sway;
      actor.z = move.from.z + .112 * sway;
      actor.y = coastGroundHeight(actor.z);
      actor.step += distance(before, actor) * 19;
      actor.gait = .76 * sway;
      if (progress === 1) standOnLand(actor, lane, move.from);
      return;
    }
    moveToward(actor, move.from, lane.ramp, ease(progress), true);
    actor.gait = pulse(progress);
    if (progress === 1) begin(actor, 'crouch', crouchTime);
  }

  function stepSlide(actor, move, progress) {
    actor.prone = 1;
    actor.stand = 0;
    actor.pitch = slopePitch;
    actor.slide = 1;
    actor.z = mix(move.from.z, waterEntryZ, progress ** 1.63);
    actor.y = coastGroundHeight(actor.z);
    if (progress === 1) waterEntry(actor);
  }

  function stepSwim(actor, move, lane, age, progress) {
    actor.prone = 1;
    actor.stand = 0;
    actor.paddle = .85;
    if (age < wetGlideTime) {
      const travel = ease(progress);
      moveToward(actor, move.from, lane.swim, travel, false);
      actor.y = mix(coastWaterY, floatingY, travel);
      actor.pitch = slopePitch * (1 - ease(progress * 2));
      return 0;
    }
    if (night || returnRequested[actor.index]) {
      startReturn(actor);
      return Math.PI;
    }
    const beyond = age - wetGlideTime;
    const settled = ease(beyond / .60);
    const phase = beyond * .89;
    actor.x = lane.swim.x + .17 * Math.sin(phase) * settled;
    actor.z = lane.swim.z + .22 * Math.sin(phase * .65) * settled;
    actor.y = floatingY + .007 * Math.sin(time * 5 + actor.index) * settled;
    return .52 * Math.sin(phase);
  }

  function stepReturn(actor, move, lane, progress) {
    actor.prone = 1;
    actor.stand = 0;
    actor.paddle = .94;
    const to = { x: lane.ramp.x, z: waterEntryZ };
    moveToward(actor, move.from, to, ease(progress), false);
    actor.y = mix(move.from.y, coastWaterY, ease(progress));
    if (progress === 1) begin(actor, 'climb', climbTime);
    return bearing(move.from, to);
  }

  function stepClimb(actor, move, lane, progress, active) {
    moveToward(actor, move.from, lane.land, ease(progress), true);
    const upright = ease((progress - .15) / .43);
    actor.stand = upright;
    actor.prone = 1 - upright;
    actor.paddle = (1 - upright) * .65;
    actor.gait = ease((progress - .13) / .36) * (1 - ease((progress - .78) / .22));
    actor.pitch = actor.z > shoreStart ? -slopePitch * actor.prone : 0;
    if (progress === 1) {
      standOnLand(actor, lane);
      landedAt[actor.index] = time;
      emit({ type: 'penguin-land', index: actor.index, ...position(actor) });
      const friend = penguins[1 - actor.index];
      // 身体完全回到岸台后，只有附近仍醒且没在忙的同伴转脸摆鳍。
      if (active && !night && friend.phase === 'land' && friend.sleep < .15 && distance(actor, friend) < 3.58) {
        shoreGaze[friend.index] = { at: time, toward: position(actor) };
        emit({ type: 'penguin-neighbor-look', index: friend.index, source: actor.index, ...position(friend) });
      }
    }
    return Math.PI;
  }

  function sampleFeet(actor) {
    const c = Math.cos(actor.yaw);
    const s = Math.sin(actor.yaw);
    const scale = actor.index === 0 ? 1 : .94;
    actor.groundY = coastGroundHeight(actor.z);
    for (const [index, side] of ['left', 'right'].entries()) {
      const x = index === 0 ? -.103 : .103;
      const z = .042 + .112 * actor.gait * Math.cos(actor.step + index * Math.PI);
      const sole = actor.z + (-x * s + z * c) * scale;
      const ahead = coastGroundHeight(sole + .11 * c * scale);
      const behind = coastGroundHeight(sole - .11 * c * scale);
      actor[side + 'GroundY'] = coastGroundHeight(sole);
      actor[side + 'FootPitch'] = Math.atan2(behind - ahead, .22 * scale);
    }
  }

  function stepShore(actor, lane, dt, active) {
    const { index } = actor;
    const gaze = shoreGaze[index];
    if (!night && gaze && time - gaze.at < shoreGreetingTime) {
      const face = bearing(actor,gaze.toward);
      const age = time - gaze.at;
      const watching = ease(age / .16) * (1 - ease((age - 1.30) / .35));
      if (gaze.crab) {
        actor.inspectCrab=watching;
        actor.look=clamp(turn(actor.yaw,face)/1.12,-1,1)*watching;
        return shoreYaw[index]+turn(shoreYaw[index],face)*.61*watching;
      }
      // 两次抬起靠近同伴的鳍，脸一直朝它，脚仍留在自己的岸台。
      actor.acknowledge = watching * (.18 + .82 * (.5 - .5 * Math.cos(age * Math.PI * 4 / shoreGreetingTime)));
      actor.display = Math.max(actor.display, actor.acknowledge * .55);
      actor.look = clamp(turn(actor.yaw,face) / 1.15,-1,1) * watching;
      return shoreYaw[index] + turn(shoreYaw[index],face) * .42 * (1 - ease((age - 1.30) / .35));
    }
    if (gaze) shoreGaze[index] = null;
    const routine = shoreRoutines[index];
    if (!active || night || actor.sleep > .15 || shoreTime < routine.next || time-landedAt[index] < .38) return shoreYaw[index];
    const target = routine.index ? lane.land : shoreWalk[index];
    const gap = distance(actor,target);
    if (gap < .014) {
      actor.x=target.x;actor.z=target.z;actor.y=coastGroundHeight(actor.z);
      routine.index=1-routine.index;
      routine.next=shoreTime+idleDelay(2.55);
      return shoreYaw[index];
    }
    const heading=bearing(actor,target), twist=turn(actor.yaw,heading);
    const pace=Math.abs(twist)<.38 ? Math.min(.50,Math.max(.095,gap*3.5)) : 0;
    const moved=Math.min(gap,pace*dt);
    moveToward(actor,actor,target,moved/gap,true);
    actor.gait=.73*(pace/.50);
    return heading;
  }

  function stepPenguin(actor, dt, active) {
    const { index, phase } = actor;
    const lane = lanes[index];
    const move = motions[index];
    const age = move ? time - move.at : 0;
    const progress = move ? clamp(age / move.duration) : 0;
    actor.progress = progress;
    actor.gait = actor.crouch = actor.prone = actor.slide = actor.paddle = actor.pitch = actor.look = actor.acknowledge = 0;
    actor.stand = 1;
    actor.inspectCrab=0;
    const called = night ? 0 : pulse((time - penguinCallAt[index]) / .65);
    actor.display = actor.call = called;
    let yaw = phase === 'land' || phase === 'waddle' ? shoreYaw[index] : 0;
    switch (phase) {
      case 'land':
        yaw=stepShore(actor,lane,dt,active);
        break;
      case 'waddle':
      case 'approach':
        stepWalk(actor, move, lane, progress);
        break;
      case 'crouch':
        actor.crouch = pulse(progress);
        actor.prone = ease(progress);
        actor.stand = 1 - actor.prone;
        actor.pitch = slopePitch * actor.prone;
        if (progress === 1) {
          begin(actor, 'slide', slideTime);
          emit({ type: 'penguin-belly', index, ...position(actor) });
        }
        break;
      case 'slide':
        stepSlide(actor, move, progress);
        break;
      case 'swim':
        yaw = stepSwim(actor, move, lane, age, progress);
        break;
      case 'return':
        yaw = stepReturn(actor, move, lane, progress);
        break;
      case 'climb':
        yaw = stepClimb(actor, move, lane, progress, active);
        break;
    }
    actor.yaw += turn(actor.yaw, yaw) * Math.min(1, dt * 13);
    actor.land = 1 - ease((time - landedAt[index]) / .24);
    actor.sleep = sleepStep(actor.sleep, night && actor.phase === 'land', dt);
    sampleFeet(actor);
  }

  function tapFish(index) {
    if (!valid(index, fish)) return;
    fishTouchAt[index] = time;
    emit({ type: 'fish-touch', index, ...position(fish[index]) });
  }

  function tapWater(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z) || point.z < waterEntryZ) return;
    emit({ type: 'ripple', x: point.x, y: coastWaterY, z: point.z });
    for (const actor of fish) if (distance(actor, point) < .79) fishTouchAt[actor.index] = time;
  }

  function stepFish(dt) {
    const visible = ease(time / .5);
    for (const actor of fish) {
      const index = actor.index;
      const center = coastPoints.fish[index];
      const reaction = fishWave[index];
      const age = reaction ? time - reaction.at : Infinity;
      const surge = ease(age / .22) * (1 - ease((age - .28) / .64));
      actor.time = time;
      actor.dive = pulse((time - fishTouchAt[index]) / .66);
      actor.poseDive = actor.dive * .38;
      actor.alert = Math.max(actor.dive, surge);
      fishPhase[index] += dt * ((.94 + index * .12) * idleTravelRate + actor.alert * 1.1);
      const phase = fishPhase[index];
      const width = index === 0 ? .16 : .22;
      actor.x = center.x + Math.cos(phase) * width * visible + (reaction ? reaction.dx * .32 * surge : 0);
      actor.z = center.z + Math.sin(phase) * .14 * visible + (reaction ? reaction.dz * .32 * surge : 0);
      // 浅水里靠摆尾和俯身下潜，身体中心只在水层内微沉。
      actor.y = Math.max(coastGroundHeight(actor.z) + .058, center.y - .012 * actor.dive);
      const yaw = Math.atan2(-Math.sin(phase) * width, Math.cos(phase) * .14);
      const escaping = reaction ? Math.atan2(reaction.dx, reaction.dz) : yaw;
      actor.yaw = yaw + turn(yaw, escaping) * surge;
      actor.tail = Math.sin(time * 10.4 + index) * (.39 + actor.alert * .32);
    }
  }

  function stepWaves() {
    for (const wave of waves) {
      const previous = wave.radius;
      wave.radius = Math.min(wave.maxRadius, (time - wave.at) * wave.speed);
      for (const actor of fish) {
        const contact = wave.contacts[actor.index];
        if (contact.hit) continue;
        const gap = distance(wave, actor);
        // 只有向外传播的波前越过鱼时，它才沿离开波源的方向甩尾。
        if (contact.gap > previous && gap <= wave.radius) {
          contact.hit = true;
          fishWave[actor.index] = { at: time, dx: (actor.x - wave.x) / Math.max(.01, gap), dz: (actor.z - wave.z) / Math.max(.01, gap) };
          emit({ type: 'wave-fish', id: wave.id, index: actor.index, ...position(actor) });
        }
        contact.gap = gap;
      }
    }
    while (waves[0] && waves[0].radius >= waves[0].maxRadius) waves.shift();
  }

  function setNight(value) {
    night = Boolean(value);
    if (night) { penguinCallAt.fill(-Infinity); shoreGaze.fill(null); }
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active) shoreTime += dt * idleClockRate;
    stepCrab(dt);stepShoal(dt);
    for (const actor of penguins) {
      actor.time = time;
      stepPenguin(actor, dt, active);
    }
    stepFish(dt);
    stepWaves();
  }

  return {
    penguins, fish, get time() { return time; }, get waves() { return waves.map(({ contacts, ...wave }) => wave); },
    crab, kelp, fry, tapCrab, tapKelp, tapFry, step, setNight, tapPenguin, tapRamp, tapStone, tapWater, tapFish
  };
}
