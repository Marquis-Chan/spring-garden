import { clamp, ease, idleDelay, idleTravelRate, mix } from './state.js';
import { createRiverNeighbors } from './river-neighbors.js';

export const riverPoints = {
  waterY: .51,
  pool: { x: 27.2, z: 7.85, rx: 3.28, rz: 2.12 },
  hippo: { x: 27.48, y: .45, z: 7.33 },
  waveOrigin: { x: 27.48, y: .51, z: 7.94 },
  toothbrush: { x: 25.45, y: .61, z: 7.24 },
  frogPerch: { x: 26.69, y: .640, z: 9.68 },
  turtleSites: [{ x: 26.16, y: .45, z: 8.36 }, { x: 24.35, y: .58, z: 8.92 }],
  // 两条水道避开河马划水时的身体，近鱼仍游过犀牛会拂动的水草。
  fish: [{ x: 28.95, y: .395, z: 7.30 }, { x: 29.20, y: .445, z: 8.28 }],
  rhino: { x: 29.75, y: .62, z: 5.77 },
  rhinoStops: [{ x: 29.70, y: .62, z: 5.72 }, { x: 30.70, y: .66, z: 6.13 }],
  grass: [{ x: 28.89, y: .75, z: 6.25 }, { x: 31.58, y: .75, z: 6.51 }],
  leaves: [{ x: 26.72, y: .52, z: 8.10 }, { x: 29.03, y: .52, z: 8.45 }]
};

const waveSpeed = 2.42;
const waveRange = 2.24;
const hippoContact = .87;
const turtleDuration = 1.13;
const fishLanes = [{ x: .14, z: .16 }, { x: .21, z: .19 }];
const defaultGroundAt = x => mix(.62, .66, clamp((x - 29.75) / 1.42));
const hippoSites = [{ x: 27.28, z: 7.01 }, riverPoints.hippo];
const turtlePatrol = [{ x: 26.23, z: 8.77 }, { x: 24.23, z: 9.05 }];

const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
const valid = (index, list) => Number.isInteger(index) && index >= 0 && index < list.length;

export function createRiver(emit = () => {}, { groundAt = defaultGroundAt } = {}) {
  const points = riverPoints;
  const neighbors = createRiverNeighbors(emit,points);
  const hippo = { ...points.hippo, yaw: 0, time: 0, lift: 0, gape: 0, sink: 0, gait: 0, stride: 0, brushing: 0 };
  const toothbrush = { phase: 'rest', u: 0, v: 0, amount: 0, open: 0, stroke: 0, strokes: 0 };
  const turtle = {
    ...points.turtleSites[0], yaw: .38, time: 0, site: 0, reach: 1, tuck: 0, swim: 0, paddle: 0, gait: 0,
    stride: 0, bask: 0, look: 0, listen: 0, sleep: 0
  };
  const rhino = { ...points.rhino, yaw: .22, time: 0, site: 0, stride: 0, gait: 0, sniff: 0, call: 0 };
  rhino.y = groundAt(rhino.x, rhino.z);
  const fish = points.fish.map(point => ({ ...point, yaw: .42, time: 0, tail: 0, dive: 0, alert: 0 }));
  const leaves = points.leaves.map((point, index) => ({ ...point, index, bob: 0 }));
  const grass = points.grass.map((point, index) => ({ ...point, index, bend: 0, selected: index === 0 }));
  const leafAt = leaves.map(() => -Infinity);
  const grassTapAt = grass.map(() => -Infinity);
  const grassSniffAt = grass.map(() => -Infinity);
  const fishTapAt = fish.map(() => -Infinity);
  const fishWaveAt = fish.map(() => -Infinity);
  const fishGrassAt = fish.map(() => -Infinity);
  const fishPhase = [.48, 2.82];
  const waves = [];
  let waveId = 0;
  let time = 0;
  let bankTime = 0;
  const hippoRoutine = { next: 1.05, index: 0 };
  const turtleRoutine = { next: 2.05, index: 0 };
  const rhinoRoutine = { next: 3.22, index: 0 };
  let night = false;
  let hippoMotion = null;
  let turtleMotion = null;
  let queuedStone = null;
  let tuckAt = -Infinity;
  let turtleListenAt = -Infinity;
  let turtleListenYaw = 0;
  let rhinoMotion = null;
  let queuedGrass = null;
  let rhinoCallAt = -Infinity;
  let brushAt = null;
  let brushFrom = null;
  let brushMovedAt = -Infinity;
  let brushTravel = 0;

  function alongPath(actor, routine, path, dt, ready, pace, strideSize, pause) {
    if (!ready || bankTime < routine.next) return 0;
    const to = path[routine.index];
    const gap = distance(actor, to);
    if (gap < .012) {
      actor.x = to.x; actor.z = to.z;
      routine.index = 1 - routine.index;
      routine.next = bankTime + idleDelay(pause);
      return 0;
    }
    const facing = turn(actor.yaw, bearing(actor, to));
    actor.yaw += clamp(facing, -dt * 5.4, dt * 5.4);
    const speed = Math.abs(facing) < .43 ? Math.min(pace, Math.max(.07, gap * 3.2)) : 0;
    const moved = Math.min(gap, speed * dt);
    actor.x = mix(actor.x, to.x, moved / gap);
    actor.z = mix(actor.z, to.z, moved / gap);
    actor.stride += moved * 2 * Math.PI / strideSize;
    return speed / pace;
  }

  function tapHippo() {
    if (toothbrush.phase !== 'rest') return;
    if (hippoMotion) return;
    hippoMotion = { at: Math.abs(turn(hippo.yaw, 0)) < .018 ? time : null, splashed: false };
    emit({ type: 'hippo-call' });
  }

  function tapToothbrush() {
    if (toothbrush.phase === 'active' || toothbrush.phase === 'opening') {
      returnToothbrush();
      return;
    }
    if (toothbrush.phase !== 'rest') return;
    toothbrush.phase = 'opening';
    toothbrush.u = toothbrush.v = toothbrush.stroke = 0;
    toothbrush.strokes = brushTravel = 0;
    brushAt = null;
    emit({ type: 'hippo-brush-start' });
  }

  function returnToothbrush() {
    if (['rest', 'returning', 'closing'].includes(toothbrush.phase)) return;
    brushFrom = { amount: toothbrush.amount, open: toothbrush.open };
    toothbrush.phase = 'returning';
    brushAt = time;
    brushMovedAt = -Infinity;
    emit({ type: 'hippo-brush-return' });
  }

  function moveToothbrush(u, v = 0) {
    if (toothbrush.phase !== 'active' || !Number.isFinite(u) || !Number.isFinite(v)) return;
    const x = clamp(u, -1, 1), y = clamp(v, -1, 1);
    const moved = Math.hypot(x - toothbrush.u, (y - toothbrush.v) * .18);
    toothbrush.u = x;
    toothbrush.v = y;
    if (moved < .008) return;
    brushMovedAt = time;
    brushTravel += moved;
    if (brushTravel >= .26) {
      brushTravel %= .26;
      toothbrush.strokes++;
      emit({ type: 'hippo-brush-stroke', u: x, v: y, strokes: toothbrush.strokes });
    }
  }

  function stepToothbrush(dt) {
    if (toothbrush.phase === 'rest' || hippoMotion) return false;
    hippo.gait = Math.max(0, hippo.gait - dt * 7);
    if (toothbrush.phase === 'opening' && brushAt === null) {
      const face = turn(hippo.yaw, 0);
      hippo.yaw += clamp(face, -dt * 5.5, dt * 5.5);
      if (Math.abs(face) > .018) return true;
      hippo.yaw = 0;
      brushAt = time;
    }
    const age = time - brushAt;
    if (toothbrush.phase === 'opening') {
      toothbrush.open = ease(age / .55);
      toothbrush.amount = ease((age - .60) / .45);
      if (age >= 1.05) {
        toothbrush.phase = 'active';
        emit({ type: 'hippo-brush-ready' });
      }
    } else if (toothbrush.phase === 'returning') {
      toothbrush.amount = brushFrom.amount * (1 - ease(age / .50));
      toothbrush.open = brushFrom.open;
      if (age >= .55) {
        toothbrush.phase = 'closing';
        brushAt = time;
      }
    } else if (toothbrush.phase === 'closing') {
      toothbrush.open = brushFrom.open * (1 - ease(age / .45));
      if (age >= .45) {
        toothbrush.phase = 'rest';
        toothbrush.open = toothbrush.amount = 0;
        hippoRoutine.next = bankTime + idleDelay(2.65);
        emit({ type: 'hippo-brush-done' });
      }
    }
    toothbrush.stroke = pulse((time - brushMovedAt) / .40);
    hippo.lift = hippo.gape = hippo.brushing = toothbrush.open;
    return true;
  }

  function startWave() {
    // 河马可以从不同水位点探鼻，波心跟着当下鼻尖前的水面生成。
    const origin = { x: hippo.x + Math.sin(hippo.yaw) * .61, y: points.waterY, z: hippo.z + Math.cos(hippo.yaw) * .61 };
    const contacts = [
      ...leaves.map((actor, index) => ({ type: 'wave-leaf', index, actor })),
      { type: 'wave-turtle', actor: turtle },
      ...fish.map((actor, index) => ({ type: 'wave-fish', index, actor }))
    ].map(contact => ({ ...contact, distance: distance(origin, contact.actor), done: false }));
    const wave = { ...origin, id: ++waveId, at: time, radius: 0, speed: waveSpeed, maxRadius: waveRange };
    waves.push({ ...wave, contacts });
    emit({ type: 'wave', ...wave });
  }

  function stepHippo(dt, active) {
    hippo.lift = hippo.gape = hippo.sink = hippo.brushing = 0;
    if (stepToothbrush(dt)) return;
    const free = active && !hippoMotion && toothbrush.phase === 'rest';
    let walking = alongPath(hippo, hippoRoutine, hippoSites, dt, free, .43, .63, 2.65);
    if (free && bankTime < hippoRoutine.next && hippo.stride > 0) {
      // 到站后轻轻换脚转回水面，留时间看见眼睛和鼻孔。
      const change = clamp(turn(hippo.yaw, .15), -dt * 2.05, dt * 2.05);
      hippo.yaw += change;
      hippo.stride += Math.abs(change) * 1.42;
      if (dt) walking = Math.abs(change) / (dt * 2.05) * .24;
    }
    hippo.gait = mix(hippo.gait, walking, Math.min(1, dt * 11));
    if (!hippoMotion) return;
    if (hippoMotion.at === null) {
      const facing = turn(hippo.yaw, 0);
      hippo.yaw += clamp(facing, -dt * 6.5, dt * 6.5);
      if (Math.abs(facing) > .022) return;
      hippo.yaw = 0;
      hippoMotion.at = time;
    }
    const age = time - hippoMotion.at;
    hippo.lift = ease(age / .30) * (1 - ease((age - .45) / .35));
    hippo.gape = ease((age - .08) / .23) * (1 - ease((age - .59) / .29));
    hippo.sink = ease((age - .58) / (hippoContact - .58)) * (1 - ease((age - .90) / .22));
    if (!hippoMotion.splashed && age >= hippoContact) {
      hippoMotion.splashed = true;
      startWave();
    }
    if (age >= 1.15) {
      hippoMotion = null;
      hippoRoutine.next = bankTime + 2.5;
    }
  }

  function tapTurtle() {
    if (night) {
      if (!turtleMotion) emit({ type: 'sleep', animal: 'turtle' });
      return;
    }
    tuckAt = time;
    turtleRoutine.next = bankTime + 2.45;
    turtleListenAt = -Infinity;
    emit({ type: 'turtle-tuck', ...position(turtle) });
  }

  function tapStone(index) {
    if (!valid(index, points.turtleSites)) return;
    if (night || (!turtleMotion && index === turtle.site)) {
      tapTurtle();
      return;
    }
    if (turtleMotion) {
      queuedStone = index === turtleMotion.index ? null : index;
      return;
    }
    turtleMotion = { from: position(turtle), index, at: time };
    emit({ type: 'turtle-swim', index, ...position(turtle) });
  }

  function stepTurtle(dt, active) {
    turtle.paddle = turtle.gait = 0;
    if (turtleMotion) {
      const { from, index, at } = turtleMotion;
      const to = points.turtleSites[index];
      const progress = clamp((time - at) / turtleDuration);
      const travel = ease(progress);
      const old = position(turtle);
      turtle.x = mix(from.x, to.x, travel);
      turtle.z = mix(from.z, to.z, travel);
      const towardRock = index === 1 ? progress : 1 - progress;
      // 身体到了实际石缘再抬高，离开岩面就开始降回水线，避免四爪悬空。
      const onRock = ease((towardRock - .51) / .26);
      turtle.y = mix(points.turtleSites[0].y, points.turtleSites[1].y, onRock);
      const swim = 1 - onRock;
      turtle.paddle = swim * Math.min(1, pulse(progress) * 1.55);
      turtle.gait = (1 - swim) * Math.min(1, pulse(progress) * 1.65);
      turtle.stride += distance(old, turtle) * 14;
      turtle.yaw += turn(turtle.yaw, bearing(from, to)) * Math.min(1, dt * 11);
      if (progress === 1) {
        Object.assign(turtle, to);
        turtle.site = index;
        turtleMotion = null;
        turtleRoutine.index = 0;
        turtleRoutine.next = bankTime + 2.4;
        emit({ type: 'turtle-land', index, ...to });
        if (!night && queuedStone !== null) {
          const next = queuedStone;
          queuedStone = null;
          tapStone(next);
        }
      }
    } else {
      // 栖岩保持在石面；浅水在同一水深划小圈。两站之间留给孩子点石头来走。
      const movement = alongPath(turtle, turtleRoutine, [turtlePatrol[turtle.site], points.turtleSites[turtle.site]],
        dt, active && !night && turtle.sleep < .17 && time - tuckAt > .60 && time - turtleListenAt > .72,
        turtle.site === 0 ? .39 : .25, .45, 2.48);
      turtle.paddle = turtle.site === 0 ? movement * .72 : 0;
      turtle.gait = turtle.site === 1 ? movement * .66 : 0;
    }
    turtle.swim = turtle.paddle;
    turtle.bask = !turtleMotion && turtle.site === 1 && turtle.gait < .08 ? 1 : 0;
    turtle.sleep = clamp(turtle.sleep + dt * (night && !turtleMotion ? 1.95 : -2.65));
    const age = time - tuckAt;
    const tuck = ease(age / .16) * (1 - ease((age - .27) / .43));
    turtle.reach = (1 - tuck) * (1 - turtle.sleep * .76);
    turtle.tuck = 1 - turtle.reach;
    const listening = night || turtle.tuck > .46 ? 0 : pulse((time - turtleListenAt) / .70);
    turtle.listen = listening ? clamp(turn(turtle.yaw, turtleListenYaw) / 1.24, -1, 1) * listening : 0;
    turtle.look = turtle.listen;
  }

  function tapRhino() {
    if (rhinoMotion) return;
    rhinoCallAt = time;
    emit({ type: 'rhino-call' });
    startRhino(1 - rhino.site);
  }

  function startRhino(index) {
    const to = points.rhinoStops[index];
    const from = position(rhino);
    const gap = distance(from, to);
    const duration = gap < .04 ? 0 : clamp(gap * .76, .30, .72);
    rhinoMotion = { from, to, index, at: time, duration, landed: false, sniffAt: null };
    for (const patch of grass) patch.selected = patch.index === index;
  }

  function tapGrass(index) {
    if (!valid(index, grass)) return;
    grassTapAt[index] = time;
    for (const patch of grass) patch.selected = patch.index === index;
    emit({ type: 'grass-select', index, ...points.grass[index] });
    if (rhinoMotion) {
      queuedGrass = index === rhinoMotion.index ? null : index;
      return;
    }
    startRhino(index);
  }

  function stepRhino(dt, active) {
    rhino.call = pulse((time - rhinoCallAt) / .97);
    rhino.gait = rhino.sniff = 0;
    if (rhinoMotion) {
      const action = rhinoMotion;
      const age = time - action.at;
      const progress = action.duration ? clamp((age - .09) / action.duration) : 1;
      const travel = ease(progress);
      const previous = position(rhino);
      rhino.x = mix(action.from.x, action.to.x, travel);
      rhino.z = mix(action.from.z, action.to.z, travel);
      rhino.y = groundAt(rhino.x, rhino.z);
      rhino.stride += distance(previous, rhino) * 14;
      rhino.gait = pulse(progress);
      const tuft = points.grass[action.index];
      const yaw = progress < 1 ? bearing(action.from, action.to) : bearing(rhino, tuft);
      rhino.yaw += turn(rhino.yaw, yaw) * Math.min(1, dt * 15);
      if (progress === 1) {
        if (!action.landed) {
          action.landed = true;
          rhino.site = action.index;
          emit({ type: 'rhino-stop', index: action.index, ...position(rhino) });
        }
        const arrived = age - (action.duration ? action.duration + .09 : 0);
        if (action.sniffAt === null && arrived >= .15 && Math.abs(turn(rhino.yaw, yaw)) < .11 && distance(rhino, tuft) < 1.02) {
          action.sniffAt = time;
        }
        if (action.sniffAt !== null) {
          const sniffAge = time - action.sniffAt;
          rhino.sniff = pulse(sniffAge / .59);
          // 鼻端降到草穗附近后，草才随探鼻摆动。
          if (sniffAge >= .24 && grassSniffAt[action.index] < action.sniffAt) {
            grassSniffAt[action.index] = time;
            emit({ type: 'rhino-sniff', index: action.index, ...tuft });
            // 水草朝池里倒下，鱼回应的是靠水的叶尖，不是岸上的草根。
            const leafTip = { x: mix(tuft.x, points.pool.x, .15), z: mix(tuft.z, points.pool.z, .15) };
            if (active && action.index === 0 && distance(fish[0], leafTip) < 1.12) {
              fishGrassAt[0] = time;
              emit({ type: 'grass-fish-look', index: 0, grass: action.index, ...position(fish[0]), originX: leafTip.x, originZ: leafTip.z });
            }
          }
        }
        if (arrived >= .90) {
          rhinoMotion = null;
          rhinoRoutine.index = 0;
          rhinoRoutine.next = bankTime + 2.7;
          if (queuedGrass !== null) {
            const next = queuedGrass;
            queuedGrass = null;
            startRhino(next);
          }
        }
      }
    } else {
      const home = rhino.site === 0 ? points.rhino : points.rhinoStops[1];
      const nearby = { x: home.x + (rhino.site === 0 ? .42 : -.40), z: home.z - .19 };
      rhino.gait = alongPath(rhino, rhinoRoutine, [nearby, home], dt, active, .56, .65, 2.7);
      rhino.y = groundAt(rhino.x, rhino.z);
    }
    for (const patch of grass) {
      const touched = .41 * pulse((time - grassTapAt[patch.index]) / .54);
      const smelled = .84 * pulse((time - grassSniffAt[patch.index]) / .62);
      patch.bend = Math.max(touched, smelled);
    }
  }

  function tapFish(index) {
    if (!valid(index, fish)) return;
    fishTapAt[index] = time;
    emit({ type: 'fish-tap', index, ...position(fish[index]) });
  }

  function stepFish(dt) {
    const awake = ease(time / .52);
    for (const [index, actor] of fish.entries()) {
      const center = points.fish[index];
      const lane = fishLanes[index];
      const dive = pulse((time - fishTapAt[index]) / .72);
      const rustle = pulse((time - fishGrassAt[index]) / .78);
      actor.dive = dive;
      actor.alert = Math.max(dive, rustle * .93, pulse((time - fishWaveAt[index]) / .78) * .82);
      const phase = fishPhase[index] += dt * ((.89 + index * .16) * idleTravelRate + actor.alert * 2.5);
      actor.x = center.x + Math.cos(phase) * lane.x * awake - rustle * .08;
      actor.z = center.z + Math.sin(phase) * lane.z * awake + rustle * .19;
      // 近岸真正变浅时先收下潜幅度，腹部不压进河底，背鳍也不穿出水面。
      const cap = points.waterY - .067;
      const bed = groundAt === defaultGroundAt ? -Infinity : groundAt(actor.x, actor.z);
      actor.y = clamp(center.y - dive * .085 - rustle * .035, Math.min(cap, bed + .065), cap);
      actor.yaw = Math.atan2(-Math.sin(phase) * lane.x, Math.cos(phase) * lane.z);
      actor.tail = Math.sin(time * 10.9 + index) * (.35 + actor.alert * .35);
    }
  }

  function waveContact(wave, contact) {
    const { type, actor } = contact;
    let index = contact.index;
    if (type === 'wave-leaf') leafAt[index] = time;
    if (type === 'wave-fish') fishWaveAt[index] = time;
    if (type === 'wave-turtle') {
      if (night || turtle.tuck > .46 || turtle.y > points.waterY) return;
      turtleListenAt = time;
      turtleListenYaw = bearing(wave, turtle);
      index = turtle.site;
    }
    emit({ type, id: wave.id, index, ...position(actor) });
  }

  function stepWaves() {
    for (const wave of waves) {
      const before = wave.radius;
      wave.radius = Math.min(wave.maxRadius, (time - wave.at) * wave.speed);
      // 只在波前真正越过物体的这一帧响应。后来游入已经扫过的区域不会补播。
      for (const contact of wave.contacts) {
        if (contact.done) continue;
        const next = distance(wave, contact.actor);
        if (contact.distance > before && next <= wave.radius) {
          contact.done = true;
          waveContact(wave, contact);
        }
        contact.distance = next;
      }
    }
    while (waves[0] && waves[0].radius >= waves[0].maxRadius) waves.shift();
    for (const leaf of leaves) leaf.bob = pulse((time - leafAt[leaf.index]) / .75);
  }

  function setNight(value) {
    night = Boolean(value);
    neighbors.setNight(night);
    if (night) {
      queuedStone = null;
      turtleListenAt = -Infinity;
    }
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active) bankTime += dt;
    hippo.time = turtle.time = rhino.time = time;
    for (const actor of fish) actor.time = time;
    stepHippo(dt, active);
    stepTurtle(dt, active);
    stepFish(dt);
    stepRhino(dt, active);
    stepWaves();
    neighbors.step(dt,active);
  }

  return {
    hippo, turtle, rhino, fish, leaves, grass, toothbrush,
    ducks:neighbors.ducks, frog:neighbors.frog, tapDuck:neighbors.tapDuck, tapFrog:neighbors.tapFrog,
    get time() { return time; },
    get waves() { return waves.map(({ contacts, ...wave }) => wave); },
    step, setNight, tapHippo, tapTurtle, tapStone, tapRhino, tapGrass, tapFish,
    tapToothbrush, moveToothbrush, returnToothbrush
  };
}
