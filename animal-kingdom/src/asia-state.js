import {sleepStep,  clamp, idleClockRate, ease, idleDelay, mix } from './state.js';

export const asiaPoints = {
  floor: .38,
  bear: { x: 18.50, y: .38, z: .04 },
  leaf: { x: 18.71, y: 1.65, z: .64 },
  fruitBranches: [{ x: 17.78, y: 2.24, z: -.10 }, { x: 20.05, y: 1.93, z: -.61 }],
  fruitLandings: [{ x: 17.93, y: .48, z: .57 }, { x: 20.35, y: .48, z: -.21 }],
  sharedFruitBranch: { x: 19.66, y: 2.03, z: .84 },
  sharedFruitLanding: { x: 19.66, y: .48, z: .84 },
  tiger: { x: 20.86, y: .38, z: .32 },
  tigerStop: { x: 21.51, y: .38, z: -.29 },
  tuft: { x: 22.10, y: .58, z: .03 },
  peacock: { x: 23.44, y: .38, z: .78 },
  peacockFeedStop: { x: 23.44, y: .38, z: 1.22 },
  peacockSeedStone: { x: 23.53, y: .49, z: 1.83 },
  peacockSeeds: [{ x: 23.47, y: .530, z: 1.79 }, { x: 23.58, y: .527, z: 1.87 }],
  peacockPerch: { x: 23.78, y: 1.76, z: -1.02 },
  owlPerches: [{ x: 20.64, y: 2.35, z: -2.80 }, { x: 22.39, y: 2.53, z: -2.75 }]
};

const bearRange = 1.42;
const gravity = 12.2;
const peacockFlightTime = .86;
const owlFlightTime = .81;
const feedWalkTime = .46;
const peacockWalkStops = [{ x: 23.18, z: .96 }, { x: 23.69, z: .80 }];
const feedBeat = .40;
const featherShakeTime = .90;
const tigerNoticeDuration = 1.24;
const featherLookRange = 3.38;
const seedLookRange = 2.92;
const grassLookRange = 1.79;
const sharedFruitWait = { x: 18.99, z: .57 };
const sharedFruitPickup = { x: 19.13, z: .98 };
const sharedTigerStop = { x: 20.42, z: .78 };
const bearHabit = [{ x: 18.18, z: .29 }, { x: 18.51, z: .10 }];
// 虎转身时，尾巴也要留在孔雀开屏的扇面之外。
const tigerHabit = [{ x: 20.76, z: -.12 }, { x: 20.47, z: .22 }];

const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
const valid = (index, list) => Number.isInteger(index) && index >= 0 && index < list.length;

export function createAsia(emit = () => {}, { groundAt = () => asiaPoints.floor, owlCallDuration = 3.06 } = {}) {
  const points = asiaPoints;
  const bear = {
    ...points.bear, yaw: .30, time: 0, stand: 0, reach: 0, reachX: 0, reachY: 1.27, reachZ: .64,
    chew: 0, hold: 0, bring: 0, gait: 0, stride: 0, food: null
  };
  const leaf = { ...points.leaf, id: 0, phase: 'branch' };
  const fruits = points.fruitBranches.map((point, id) => ({ ...point, id, phase: 'branch', rotation: 0 }));
  const falling = fruits.map(() => null);
  const fruitRegrow = fruits.map(() => Infinity);
  const sharedFruit = { ...points.sharedFruitBranch, phase:'branch', rotation:0 };
  const tiger = {
    ...points.tiger, yaw: .04, time: 0, paw: 0, stretch: 0, roar: 0, call: 0, sniff: 0, ears: 0, look: 0,
    gait: 0, stride: 0, notice: 0, fruitReach:0, fruitX:0, fruitY:0, fruitZ:0,
    frontLeftY: 0, frontRightY: 0, hindLeftY: 0, hindRightY: 0
  };
  const tuft = { ...points.tuft, bend: 0 };
  const peacock = { ...points.peacock, yaw: .35, time: 0, fan: 0, flight: 0, flap: 0, crouch: 0, land: 0,
    sleep: 0, call: 0, look: 0, site: 0, perch: 0, shake: 0, shakePhase: 0,
    gait: 0, stride: 0, peck: 0, reachX: 0, reachY: 0, reachZ: 0, leftFootY: 0, rightFootY: 0 };
  const seeds = points.peacockSeeds.map((point,id) => ({ ...point, id, phase: 'ground' }));
  const seedReady = seeds.map(() => Infinity);
  const owl = { ...points.owlPerches[0], yaw: .23, time: 0, call: 0, flight: 0, flap: 0, look: 0,
    land: 0, sleep: 1, site: 0 };
  bear.y = groundAt(bear.x, bear.z);
  tiger.y = groundAt(tiger.x, tiger.z);
  let time = 0;
  let routineTime = 0;
  let night = false;
  let bearAction = null;
  const bearRoutine = { index: 0, next: .92 };
  const tigerRoutine = { index: 0, next: 2.03 };
  let pendingFruit = null;
  let sharedDropAt = -Infinity;
  let sharedReadyAt = Infinity;
  let sharedDuel = null;
  let leafRegrow = Infinity;
  let tigerTapAt = -Infinity;
  let tigerWalk = null;
  let tuftAt = -Infinity;
  let tuftSniffAt = -Infinity;
  let fanTarget = 0;
  let peacockCallAt = -Infinity;
  let peacockLandAt = -Infinity;
  let peacockReadyAt = null;
  let peacockMove = null;
  let peacockFeed = null;
  let peacockShakeAt = -Infinity;
  let tigerGlanceAt = -Infinity;
  let peacockGlanceAt = -Infinity;
  let owlLandAt = -Infinity;
  let owlVoiceAt = null;
  let owlMove = null;
  let owlNext = Infinity;
  let owlTapAfterLanding = false;
  let nextPeacock = 2.85;
  let peacockStop = 0;
  let peacockWalk = null;
  let fanClosesAt = Infinity;
  let seedGlance = null;

  function forestWalk(actor,target,dt,speed,cycle) {
    const gap = distance(actor,target);
    if (gap < .014) {
      actor.x=target.x;actor.z=target.z;actor.y=groundAt(actor.x,actor.z);
      return true;
    }
    const heading=bearing(actor,target);
    const toward=turn(actor.yaw,heading);
    actor.yaw += clamp(toward,-dt*5.7,dt*5.7);
    const pace=Math.abs(toward)<.42 ? Math.min(speed,Math.max(.092,gap*3.5)) : 0;
    const moved=Math.min(gap,pace*dt);
    actor.x=mix(actor.x,target.x,moved/gap);
    actor.z=mix(actor.z,target.z,moved/gap);
    actor.y=groundAt(actor.x,actor.z);
    actor.stride+=moved*cycle;
    actor.gait=clamp(pace/(speed*1.16));
    return false;
  }

  function forestPatrol(actor,play,sites,dt,speed,cycle,pause) {
    if (routineTime < play.next || (sharedFruit.phase==='spent' && time<sharedReadyAt-.95)) return;
    if (forestWalk(actor,sites[play.index],dt,speed,cycle)) {
      play.index=1-play.index;
      play.next=routineTime+idleDelay(pause);
    }
  }

  function tapBear() {
    if (bearAction || sharedDuel) return;
    const approach=distance(bear,points.leaf)>.68;
    const wellAimed=!approach && Math.abs(turn(bear.yaw,bearing(bear,points.leaf)))<1.03;
    bearAction = { kind: 'leaf', at: wellAimed ? time : null, approach, prop: leaf.phase === 'branch' ? leaf : null };
    if (wellAimed) emit({ type: 'bear-rise', ...position(bear) });
  }

  function tapLeaf() {
    if (leaf.phase === 'branch') tapBear();
  }

  function tapFruit(index) {
    if (!valid(index, fruits) || fruits[index].phase !== 'branch') return;
    const fruit = fruits[index];
    const landing = points.fruitLandings[index];
    fruit.phase = 'drop';
    falling[index] = { from: position(fruit), at: time, duration: Math.sqrt(2 * (fruit.y - landing.y) / gravity) };
    emit({ type: 'fruit-drop', id: fruit.id, ...position(fruit) });
  }

  function tapSharedFruit() {
    if (sharedFruit.phase !== 'branch') return;
    sharedFruit.phase = 'drop';
    sharedDropAt = time;
    emit({ type:'shared-fruit-drop', ...position(sharedFruit) });
  }

  function sharedWalk(actor,from,to,progress,pace,reversing=false) {
    const old = position(actor), travel = ease(progress);
    actor.x = mix(from.x,to.x,travel);
    actor.z = mix(from.z,to.z,travel);
    actor.y = groundAt(actor.x,actor.z);
    actor.stride += distance(old,actor)*pace*(reversing?-1:1);
    actor.gait = pulse(progress);
  }

  function stepSharedFruit(dt) {
    const landing = points.sharedFruitLanding;
    if (sharedFruit.phase === 'spent' && time >= sharedReadyAt) {
      Object.assign(sharedFruit,points.sharedFruitBranch,{phase:'branch',rotation:0});
    }
    if (sharedFruit.phase === 'drop') {
      const p = clamp((time-sharedDropAt)/Math.sqrt(2*(points.sharedFruitBranch.y-landing.y)/gravity));
      sharedFruit.y = mix(points.sharedFruitBranch.y,landing.y,p*p);
      sharedFruit.rotation = p*1.8;
      if(p===1) {
        Object.assign(sharedFruit,landing,{phase:'ground'});
        emit({type:'shared-fruit-land',...landing});
      }
    }
    if (!sharedDuel && sharedFruit.phase==='ground' && !bearAction && !tigerWalk) {
      sharedDuel = { at:time, bearStart:position(bear), tigerStart:position(tiger), touched:false };
      tigerTapAt = -Infinity;
    }
    if (!sharedDuel) return false;
    const action=sharedDuel, age=time-action.at;
    bear.stand = bear.reach = bear.chew = bear.hold = bear.bring = bear.gait = 0;
    tiger.look = tiger.stretch = tiger.paw = tiger.call = tiger.roar = tiger.notice = tiger.gait = tiger.fruitReach = 0;
    tiger.ears = .77 * pulse(age/.94);
    tiger.sniff = .89 * pulse((age-.48)/.53);
    const retreat = clamp((age-.99)/.54);
    if(age<.99)sharedWalk(tiger,action.tigerStart,sharedTigerStop,clamp(age/.48),16);
    else sharedWalk(tiger,sharedTigerStop,action.tigerStart,retreat,16,true);
    tiger.yaw += turn(tiger.yaw,bearing(tiger,landing))*Math.min(1,dt*15);

    // 虎先从右侧用一掌碰果皮，收掌退开后熊从另一侧拾完整一颗。
    const contact={x:landing.x+.112,y:landing.y,z:landing.z-.008};
    const dx=contact.x-tiger.x,dz=contact.z-tiger.z,c=Math.cos(tiger.yaw),s=Math.sin(tiger.yaw);
    tiger.fruitX=dx*c-dz*s;
    tiger.fruitY=contact.y-tiger.y;
    tiger.fruitZ=dx*s+dz*c;
    tiger.fruitReach=ease((age-.51)/.19)*(1-ease((age-.75)/.23));
    if(age>=.70 && !action.touched){
      action.touched=true;
      tiger.fruitReach=1;
      emit({type:'shared-fruit-tiger-touch',...contact});
    }
    sampleTigerFeet();

    if(age<1.00)sharedWalk(bear,action.bearStart,sharedFruitWait,clamp(age/.61),15);
    else sharedWalk(bear,sharedFruitWait,sharedFruitPickup,clamp((age-1)/.38),15);
    aimBear(landing,dt);
    bear.reach=ease((age-1.38)/.18)*(1-ease((age-1.61)/.15));
    if(age>=1.56 && sharedFruit.phase==='ground'){
      bear.reach=1;
      bear.food='shared-fruit';
      sharedFruit.phase='held';
      emit({type:'shared-fruit-bear-pick',...landing});
    }
    bear.hold=Number(sharedFruit.phase==='held');
    bear.bring=ease((age-1.65)/.19)*(1-ease((age-1.93)/.16));
    if(age>=1.86 && sharedFruit.phase==='held'){
      sharedFruit.phase='mouth';
      bear.bring=1;
      emit({type:'shared-fruit-mouth'});
      emit({type:'bear-call',food:'shared-fruit'});
    }
    if(sharedFruit.phase==='mouth')bear.chew=pulse((age-1.86)/.42);
    if(age>=2.30){
      sharedFruit.phase='spent';
      bear.food=null;
      sharedReadyAt=time+2.50;
      sharedDuel=null;
    }
    return true;
  }

  function stepFruit() {
    for (const fruit of fruits) {
      const { id } = fruit;
      if (fruit.phase === 'spent' && time >= fruitRegrow[id]) {
        Object.assign(fruit, points.fruitBranches[id], { phase: 'branch', rotation: 0 });
      }
      const fall = falling[id];
      if (!fall) continue;
      const progress = clamp((time - fall.at) / fall.duration);
      const to = points.fruitLandings[id];
      fruit.x = mix(fall.from.x, to.x, progress);
      fruit.y = mix(fall.from.y, to.y, progress ** 2);
      fruit.z = mix(fall.from.z, to.z, progress);
      fruit.rotation = progress * 1.8;
      if (progress < 1) continue;
      Object.assign(fruit, to, { phase: 'ground' });
      falling[id] = null;
      emit({ type: 'fruit-land', id, ...to });
      // 以落地当帧的距离决定。远果留在地面，稍后路过也不自动补播追果。
      if (pendingFruit === null && distance(bear, fruit) < bearRange) pendingFruit = fruit;
    }
  }

  function aimBear(target, dt) {
    bear.yaw += turn(bear.yaw, bearing(bear, target)) * Math.min(1, dt * 12);
    const dx = target.x - bear.x;
    const dz = target.z - bear.z;
    bear.reachX = dx * Math.cos(bear.yaw) - dz * Math.sin(bear.yaw);
    bear.reachY = target.y - bear.y;
    bear.reachZ = dx * Math.sin(bear.yaw) + dz * Math.cos(bear.yaw);
  }

  function fetchFruit() {
    const fruit = pendingFruit;
    pendingFruit = null;
    if (!fruit || fruit.phase !== 'ground') return;
    const gap = distance(bear, fruit);
    if (gap >= bearRange) return;
    const approach = gap > .43 ? 1 - .43 / gap : 0;
    const from = position(bear);
    const to = { x: mix(bear.x, fruit.x, approach), z: mix(bear.z, fruit.z, approach) };
    bearAction = { kind: 'fruit', at: time, prop: fruit, from, to, walk: approach ? .53 : 0 };
    emit({ type: 'bear-approach', id: fruit.id, ...from });
  }

  function holdFood(action) {
    const item = action.prop;
    bear.reach = 1;
    bear.food = action.kind;
    bear.hold = 1;
    item.phase = 'held';
    const type = action.kind === 'leaf' ? 'bear-leaf-pick' : 'fruit-pick';
    emit({ type, id: item.id, ...position(item) });
  }

  function chewFood(action, age, start, end) {
    const item = action.prop;
    if (age >= start && item.phase === 'held') {
      item.phase = 'mouth';
      bear.bring = 1;
      emit({ type: action.kind === 'leaf' ? 'leaf-mouth' : 'fruit-mouth', id: item.id });
      emit({ type: 'bear-call', food: action.kind, id: item.id });
    }
    if (item.phase !== 'mouth') return;
    bear.chew = pulse((age - start) / (end - start));
    if (age < end) return;
    item.phase = 'spent';
    bear.food = null;
    if (action.kind === 'leaf') leafRegrow = time + 2.45;
    else fruitRegrow[item.id] = time + 2.45;
  }

  function stepBear(dt,active) {
    if (leaf.phase === 'spent' && time >= leafRegrow) leaf.phase = 'branch';
    bear.stand = bear.reach = bear.chew = bear.hold = bear.bring = bear.gait = 0;
    if (!bearAction) fetchFruit();
    if (!bearAction) {
      if (active) forestPatrol(bear,bearRoutine,bearHabit,dt,.50,15,2.68);
      return;
    }
    if (active) bearRoutine.next=routineTime+2.18;
    const action = bearAction;
    if (action.kind==='leaf' && action.at===null) {
      if (action.approach && !forestWalk(bear,points.bear,dt,.69,15)) return;
      action.approach=false;
      // 转身同站完成，手在身体正面再抬起，避免长臂绕过颈背。
      const heading=bearing(bear,points.leaf);
      const delta=turn(bear.yaw,heading);
      const step=clamp(delta,-dt*7.0,dt*7.0);
      bear.yaw+=step;
      bear.stride+=Math.abs(step)*2.3;
      bear.gait=.28*clamp(Math.abs(delta)/.5);
      if (Math.abs(delta-step)>.08) return;
      bear.yaw=heading;
      action.at=time;
      emit({type:'bear-rise',...position(bear)});
    }
    const age = time - action.at;
    if (action.kind === 'leaf') {
      aimBear(points.leaf, dt);
      bear.stand = ease(age / .32) * (1 - ease((age - 1.02) / .40));
      bear.reach = ease((age - .14) / .39) * (1 - ease((age - .57) / .22));
      if (action.prop) {
        if (age >= .55 && leaf.phase === 'branch') holdFood(action);
        bear.hold = Number(leaf.phase === 'held');
        bear.bring = ease((age - .60) / .22) * (1 - ease((age - .88) / .24));
        chewFood(action, age, .83, 1.22);
      }
      if (age >= 1.45) bearAction = null;
      return;
    }

    const fruit = action.prop;
    if (action.walk) {
      const progress = clamp(age / action.walk);
      const previous = position(bear);
      bear.x = mix(action.from.x, action.to.x, ease(progress));
      bear.z = mix(action.from.z, action.to.z, ease(progress));
      bear.y = groundAt(bear.x, bear.z);
      bear.gait = pulse(progress);
      bear.stride += distance(previous, bear) * 15;
    }
    aimBear(fruit, dt);
    const arrived = age - action.walk;
    bear.reach = ease((arrived - .035) / .22) * (1 - ease((arrived - .30) / .19));
    if (arrived >= .275 && fruit.phase === 'ground') holdFood(action);
    bear.hold = Number(fruit.phase === 'held');
    bear.bring = ease((arrived - .34) / .19) * (1 - ease((arrived - .58) / .22));
    chewFood(action, arrived, .54, .99);
    if (arrived >= 1.11) bearAction = null;
  }

  function tapTiger() {
    if (sharedDuel) return;
    if (tigerWalk && tiger.gait > 0) return;
    tigerTapAt = time;
    emit({ type: 'tiger-call' });
  }

  function tapTuft() {
    if (sharedDuel) return;
    tuftAt = time;
    emit({ type: 'tuft-touch', ...position(tuft) });
    if (tigerWalk) return;
    tigerWalk = { from: position(tiger), at: time,
      duration: distance(tiger, points.tigerStop) > .04 ? .49 : 0, stopped: false, sniffed: false };
  }

  function sampleTigerFeet() {
    const c = Math.cos(tiger.yaw);
    const s = Math.sin(tiger.yaw);
    for (const side of [-1, 1]) {
      for (const front of [true, false]) {
        const phase = tiger.stride + ((front ? side : -side) > 0 ? Math.PI : 0);
        const x = side * (front ? .178 + tiger.stretch * .031 : .171);
        const z = (front ? .386 + tiger.stretch * .33 : -.480) + Math.cos(phase) * tiger.gait * .11;
        const key = `${front ? 'front' : 'hind'}${side < 0 ? 'Left' : 'Right'}Y`;
        tiger[key] = groundAt(tiger.x + x * c + z * s, tiger.z - x * s + z * c) - tiger.y;
      }
    }
  }

  function stepTiger(dt,active) {
    const touchAge = time - tigerTapAt;
    tiger.roar = pulse(touchAge / .97);
    tiger.paw = pulse((touchAge - .055) / .80);
    tiger.sniff = tiger.ears = tiger.gait = 0;
    if (tigerWalk) {
      if (active) tigerRoutine.next=routineTime+2.38;
      const action = tigerWalk;
      const age = time - action.at;
      const progress = action.duration ? clamp((age - .09) / action.duration) : 1;
      const old = position(tiger);
      const to = points.tigerStop;
      tiger.x = mix(action.from.x, to.x, ease(progress));
      tiger.z = mix(action.from.z, to.z, ease(progress));
      tiger.y = groundAt(tiger.x, tiger.z);
      tiger.stride += distance(old, tiger) * 16;
      tiger.gait = pulse(progress);
      if (tiger.gait > 0) tiger.paw = 0;
      const face = progress < 1 ? bearing(action.from, to) : bearing(tiger, tuft);
      tiger.yaw += turn(tiger.yaw, face) * Math.min(1, dt * 13);
      tiger.ears = pulse(age / .40);
      if (progress === 1) {
        const arrived = age - (action.duration ? action.duration + .09 : 0);
        if (!action.stopped) {
          action.stopped = true;
          emit({ type: 'tiger-stop', ...position(tiger) });
        }
        tiger.sniff = ease((arrived - .08) / .19) * (1 - ease((arrived - .43) / .29));
        if (!action.sniffed && arrived >= .29) {
          action.sniffed = true;
          tuftSniffAt = time;
          emit({ type: 'tiger-sniff', ...position(tuft) });
          if (!night && peacock.site === 0 && distance(peacock,tuft) < grassLookRange) peacockGlanceAt = time;
        }
        if (arrived >= .78) tigerWalk = null;
      }
    } else if (active && touchAge>1.00 && time-tigerGlanceAt>tigerNoticeDuration+.10) {
      forestPatrol(tiger,tigerRoutine,tigerHabit,dt,.52,16,2.6);
    }
    tiger.look = tiger.ears * clamp(turn(tiger.yaw, bearing(tiger, tuft)) / 1.2, -1, 1);
    const attentive = night || tiger.gait > 0 || tiger.sniff > .25 || tiger.paw > .25
      ? 0 : pulse((time - tigerGlanceAt) / tigerNoticeDuration);
    tiger.notice = attentive;
    tiger.ears = Math.max(tiger.ears,attentive*.62);
    tiger.look = mix(tiger.look,clamp(turn(tiger.yaw,bearing(tiger,peacock))/1.2,-1,1),attentive*.72);
    tiger.stretch = tiger.paw;
    tiger.call = tiger.roar;
    sampleTigerFeet();
    tuft.bend = Math.max(.48 * pulse((time - tuftAt) / .47), .74 * pulse((time - tuftSniffAt) / .57));
  }

  function tapPeacock() {
    if (night) {
      if (peacock.site === 1 && !peacockMove) emit({ type: 'sleep', animal: 'peacock' });
      return;
    }
    if (peacockMove || peacockFeed || peacock.site !== 0) return;
    peacockWalk = null;
    nextPeacock = routineTime + 4.1;
    fanTarget = 1 - fanTarget;
    if (fanTarget) {
      fanClosesAt = routineTime + 8.2;
      peacockCallAt = time;
      emit({ type: 'peacock-call' });
    }
  }

  function tapPeacockFan() {
    if (night || peacockMove || peacockFeed || peacock.site !== 0 || !fanTarget || peacock.fan < .93
      || time - peacockShakeAt < featherShakeTime) return;
    peacockShakeAt = time;
    fanClosesAt = routineTime + 7.4;
    if (distance(tiger,peacock) < featherLookRange) tigerGlanceAt = time+.11;
    emit({ type: 'peacock-rattle', ...position(peacock) });
  }

  function tapPeacockSeeds() {
    if (night || peacockMove || peacockFeed || peacock.site !== 0) return;
    const available = seeds.filter(seed => seed.phase === 'ground');
    if (!available.length) return;
    peacockWalk = null;
    nextPeacock = routineTime + 4.6;
    peacockFeed = { phase: 'fold', at: time, from: position(peacock), queue: available, index: 0, hit: false };
    fanTarget = 0;
    peacockCallAt = peacockShakeAt = -Infinity;
  }

  function walkPeacock(from,to,p) {
    const before = position(peacock), travel = ease(p);
    peacock.x = mix(from.x,to.x,travel);
    peacock.z = mix(from.z,to.z,travel);
    peacock.y = groundAt(peacock.x,peacock.z);
    peacock.stride += distance(before,peacock) * 24;
    peacock.gait = pulse(p);
  }

  function samplePeacockFeet() {
    const c = Math.cos(peacock.yaw), s = Math.sin(peacock.yaw);
    for (const [i,key] of ['leftFootY','rightFootY'].entries()) {
      const x = i ? .097 : -.097;
      const z = .016 + Math.cos(peacock.stride+i*Math.PI)*peacock.gait*.073;
      peacock[key] = groundAt(peacock.x+x*c+z*s,peacock.z-x*s+z*c)-peacock.y;
    }
  }

  function stepPeacockFeed(active) {
    const feed = peacockFeed;
    if (!feed) return null;
    if (feed.phase === 'fold') {
      if (peacock.fan > 0) return .35;
      feed.phase = 'approach';
      feed.at = time;
    }
    const age = time-feed.at;
    const seedsYaw = bearing(points.peacockFeedStop,points.peacockSeedStone);
    if (feed.phase === 'approach') {
      const progress = clamp(age/feedWalkTime);
      walkPeacock(feed.from,points.peacockFeedStop,progress);
      if (progress === 1) {
        feed.phase = 'peck';
        feed.at = time;
      }
      return seedsYaw;
    }
    if (feed.phase === 'return') {
      const progress = clamp(age/feedWalkTime);
      walkPeacock(feed.from,points.peacock,progress);
      if (progress === 1) peacockFeed = null;
      return progress > .72 ? .35 : Math.PI;
    }

    // 头先降，喙到该粒的表面时才发出接触并收走同一粒。
    const seed = feed.queue[feed.index];
    const dx = seed.x-peacock.x, dz = seed.z-peacock.z;
    const c = Math.cos(peacock.yaw), s = Math.sin(peacock.yaw);
    peacock.reachX = dx*c-dz*s;
    peacock.reachY = seed.y-peacock.y;
    peacock.reachZ = dx*s+dz*c;
    peacock.peck = ease(age/.17)*(1-ease((age-.21)/.16));
    if (age >= .17 && !feed.hit) {
      feed.hit = true;
      seed.phase = 'eaten';
      seedReady[seed.id] = time+3.20;
      peacock.peck = 1;
      emit({ type: 'peacock-peck', id: seed.id, ...position(seed) });
      // 确认喙真正碰到种子后，近虎才会留意。一次进食只送一个信号。
      if (active && !feed.neighborSent && distance(tiger, seed) < seedLookRange) {
        feed.neighborSent = true;
        seedGlance = { at: time, seed };
      }
    }
    if (age >= feedBeat) {
      feed.at = time;
      feed.index++;
      feed.hit = false;
      if (feed.index === feed.queue.length) {
        feed.phase = 'return';
        feed.from = position(peacock);
      }
    }
    return seedsYaw;
  }

  function fly(actor, move, to, duration, height) {
    const progress = clamp((time - move.at) / duration);
    const travel = ease(progress);
    actor.x = mix(move.from.x, to.x, travel);
    actor.y = mix(move.from.y, to.y, travel) + height * pulse(progress);
    actor.z = mix(move.from.z, to.z, travel);
    actor.flight = progress < 1 ? .19 + .81 * pulse(progress) : 0;
    actor.flap = Math.sin(progress * Math.PI * 10) * actor.flight;
    return progress;
  }

  function stepPeacock(dt, active) {
    if (active && routineTime >= fanClosesAt) {
      fanClosesAt = Infinity;
      fanTarget = 0;
    }
    const goal = night || peacock.site !== 0 ? 0 : fanTarget;
    peacock.fan += clamp(goal - peacock.fan, -dt * 2.35, dt * 2.35);
    peacock.crouch = peacock.gait = peacock.peck = 0;
    peacock.call = night ? 0 : pulse((time - peacockCallAt) / .74);
    peacock.shakePhase = Number.isFinite(peacockShakeAt) ? time-peacockShakeAt : 0;
    peacock.shake = !night && fanTarget ? pulse(peacock.shakePhase/featherShakeTime) : 0;
    for (const seed of seeds) {
      if (time >= seedReady[seed.id]) {
        seed.phase = 'ground';
        seedReady[seed.id] = Infinity;
      }
    }
    const feedingYaw = stepPeacockFeed(active);
    const targetSite = night ? 1 : 0;
    if (!peacockMove && !peacockFeed && targetSite !== peacock.site && peacock.fan === 0 && (night || peacock.sleep<.10)) {
      if (peacockReadyAt === null) peacockReadyAt = time;
      const prepared = (time - peacockReadyAt) / .19;
      peacock.crouch = ease(prepared);
      if (prepared >= 1) {
        peacockReadyAt = null;
        peacockMove = { from: position(peacock), at: time, index: targetSite };
        emit({ type: 'peacock-takeoff', index: targetSite, ...position(peacock) });
      }
    }
    let yaw = feedingYaw ?? (peacock.site === 1 ? .22 : .35);
    if (active && !night && !peacockMove && !peacockFeed && !fanTarget && peacock.fan < .04 && peacock.site === 0) {
      if (!peacockWalk && routineTime >= nextPeacock) {
        const to = peacockWalkStops[peacockStop];
        peacockWalk = { from: position(peacock), to, at: time };
        peacockStop = 1 - peacockStop;
      }
    }
    if (peacockWalk) {
      const { from, to, at } = peacockWalk;
      const progress = clamp((time - at) / 1.05);
      walkPeacock(from, to, progress);
      yaw = progress > .84 ? .35 : bearing(from, to);
      if (progress === 1) {
        peacockWalk = null;
        nextPeacock = routineTime + idleDelay(4.7);
      }
    }
    if (peacockMove) {
      const move = peacockMove;
      const to = move.index === 1 ? points.peacockPerch : points.peacock;
      const progress = fly(peacock, move, to, peacockFlightTime, .29);
      yaw = progress < .65 ? bearing(move.from, to) : move.index === 1 ? .22 : .35;
      if (progress === 1) {
        Object.assign(peacock, to);
        peacock.site = peacock.perch = move.index;
        peacockMove = null;
        peacockLandAt = time;
        emit({ type: 'peacock-land', index: move.index, ...to });
      }
    }
    // 啄食的局部喙目标和同一帧的根朝向成对更新。
    if (peacock.peck === 0) peacock.yaw += turn(peacock.yaw, yaw) * Math.min(1, dt * 10);
    const glance = night || peacockFeed || peacockMove ? 0 : pulse((time-peacockGlanceAt)/.80);
    peacock.look = mix(.23*peacock.fan,-.82,glance);
    peacock.land = 1 - ease((time - peacockLandAt) / .22);
    peacock.sleep = sleepStep(peacock.sleep, night && peacock.site === 1 && !peacockMove, dt);
    if (!peacockMove && peacock.site === 0) samplePeacockFeet();
  }

  function tapOwl() {
    if (!night) {
      if (!owlMove) emit({ type: 'sleep', animal: 'owl' });
      return;
    }
    if (owlMove?.quiet) {
      owlTapAfterLanding = true;
      return;
    }
    if (owlVoiceAt !== null || owlMove) return;
    owlNext = routineTime + 10.2;
    owlVoiceAt = time;
    emit({ type: 'owl-call' });
  }

  function stepOwl(dt, active) {
    owl.call = owl.look = 0;
    if (owlVoiceAt !== null) {
      const age = time - owlVoiceAt;
      if (age >= owlCallDuration) {
        owlVoiceAt = null;
        owlMove = { from: position(owl), at: time, index: 1 - owl.site };
        emit({ type: 'owl-takeoff', index: owlMove.index, ...position(owl) });
      } else {
        owl.call = pulse(age / owlCallDuration) * (.56 + .44 * Math.abs(Math.sin(age * 7.3)));
        owl.look = .62 * pulse(age / owlCallDuration);
      }
    }
    if (active && night && !owlMove && owlVoiceAt === null && owl.sleep < .08 && routineTime >= owlNext) {
      owlMove = { from: position(owl), at: time, index: 1 - owl.site, quiet: true };
      owlNext = routineTime + idleDelay(12.2);
      emit({ type: 'owl-routine-takeoff', index: owlMove.index, ...position(owl) });
    }
    let yaw = .23;
    if (owlMove) {
      const move = owlMove;
      const to = points.owlPerches[move.index];
      const progress = fly(owl, move, to, owlFlightTime, .32);
      yaw = progress < .72 ? bearing(move.from, to) : .23;
      if (progress === 1) {
        Object.assign(owl, to);
        owl.site = move.index;
        owlMove = null;
        owlLandAt = time;
        emit({ type: move.quiet ? 'owl-routine-land' : 'owl-land', index: move.index, ...to });
        if (owlTapAfterLanding) {
          owlTapAfterLanding = false;
          tapOwl();
        }
      }
    }
    owl.yaw += turn(owl.yaw, yaw) * Math.min(1, dt * 11);
    owl.land = 1 - ease((time - owlLandAt) / .20);
    owl.sleep = sleepStep(owl.sleep, !night && !owlMove, dt);
  }

  function setNight(value) {
    const next = Boolean(value);
    if (next === night) return;
    night = next;
    peacockReadyAt = null;
    peacockWalk = null;
    seedGlance = null;
    owlTapAfterLanding = false;
    owlNext = night ? routineTime + 5.25 : Infinity;
    if (night) {
      fanTarget = 0;
      peacockCallAt = peacockShakeAt = peacockGlanceAt = tigerGlanceAt = -Infinity;
      if (peacockFeed) {
        peacockFeed = distance(peacock,points.peacock)>.002
          ? { phase: 'return', at: time, from: position(peacock) } : null;
      }
    } else if (owlVoiceAt !== null) {
      // 静音也走这条时序。天亮时取消还在枝上的预备，已离枝则先落稳。
      owlVoiceAt = null;
      emit({ type: 'owl-quiet' });
    }
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active) routineTime += dt * idleClockRate;
    bear.time = tiger.time = peacock.time = owl.time = time;
    stepFruit();
    if(!stepSharedFruit(dt)){
      if (seedGlance && (night || time - seedGlance.at > 1.08)) seedGlance = null;
      if (seedGlance && time - seedGlance.at >= .10 && tiger.gait < .25 && !tigerWalk && tiger.paw < .25) {
        if (distance(tiger, seedGlance.seed) < seedLookRange) {
          tigerGlanceAt = time;
          emit({ type: 'tiger-seed-look', id: seedGlance.seed.id, ...position(seedGlance.seed) });
        }
        seedGlance = null;
      }
      stepBear(dt, active);
      stepTiger(dt, active);
    }
    stepPeacock(dt, active);
    stepOwl(dt, active);
  }

  return {
    bear, leaf, fruits, sharedFruit, tiger, tuft, peacock, seeds, owl, get time() { return time; },
    step, setNight, tapBear, tapLeaf, tapFruit, tapSharedFruit, tapTiger, tapTuft, tapPeacock, tapPeacockFan, tapPeacockSeeds, tapOwl
  };
}
