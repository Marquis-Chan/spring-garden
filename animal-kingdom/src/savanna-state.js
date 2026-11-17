import { clamp, ease, idleDelay, mix } from './state.js';

export const savannaPoints = {
  floor: .38,
  elephant: { x: 16.20, y: .38, z: 5.02 },
  water: { x: 16.20, y: .437, z: 6.24 },
  flowers: [{ x: 15.30, y: .72, z: 7.11 }, { x: 17.43, y: .72, z: 7.22 }],
  giraffe: { x: 19.10, y: .38, z: 4.91 },
  leaves: [{ x: 18.62, y: 3.03, z: 5.82 }, { x: 20.00, y: 2.85, z: 5.62 }],
  zebra: { x: 18.05, y: .38, z: 6.53 },
  zebraRun: { x: 18.26, y: .38, z: 7.86 },
  lion: { x: 21.20, y: .58, z: 6.12 },
  rock: { x: 21.20, y: .38, z: 6.18 },
  lionGrass: { x: 21.64, y: .77, z: 6.82 }
};

const scoopTime = .31;
const sprayTime = .65;
const waterTravel = .43;
const mouthContact = .55;
const leafTravel = .47;
const leafFallPoints = [{ x: 18.22, y: .387, z: 6.63 }, { x: 20.36, y: .387, z: 5.86 }];
const maxLeaves = 3;
const restYaw = .12;
const elephantWalk = [{ x: 15.74, z: 4.92 }, savannaPoints.elephant];
const giraffeWalk = [{ x: 19.43, z: 5.41 }, { x: 18.98, z: 5.38 }];
const lionWalk = [{ x: 21.345, z: 6.135 }, { x: 21.055, z: 6.135 }];
const giraffeHoofStance = [
  { x: -.222, z: .324 }, { x: -.215, z: -.669 },
  { x: .222, z: .324 }, { x: .215, z: -.669 }
];

const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;

function footOnGround(actor, stance) {
  const c = Math.cos(actor.yaw), s = Math.sin(actor.yaw);
  return { x: actor.x + stance.x * c + stance.z * s, y: savannaPoints.floor,
    z: actor.z - stance.x * s + stance.z * c };
}

function walking(actor, target, dt, pace, strideSize, turnRate = 5.2) {
  const gap = distance(actor, target);
  if (gap < .013) {
    actor.x = target.x; actor.z = target.z;
    actor.gait = mix(actor.gait, 0, Math.min(1, dt * 12));
    return true;
  }
  const turn = angleDelta(actor.yaw, bearing(actor, target));
  actor.yaw += clamp(turn, -dt * turnRate, dt * turnRate);
  // 到路的方向站稳以后再迈步，最后半步逐渐落稳，不平移侧滑。
  const speed = Math.abs(turn) < .36 ? Math.min(pace, Math.max(.09, gap * 3.3)) : 0;
  const moved = Math.min(gap, speed * dt);
  actor.x = mix(actor.x, target.x, moved / gap);
  actor.z = mix(actor.z, target.z, moved / gap);
  actor.stride += moved * 2 * Math.PI / strideSize;
  actor.gait = mix(actor.gait, clamp(speed / pace), Math.min(1, dt * 12));
  return false;
}

export function createSavanna(emit = () => {}) {
  const points = savannaPoints;
  const elephant = { ...points.elephant, yaw: 0, time: 0, gait: 0, stride: 0, scoop: 0, lift: 0, spray: 0, look: 0, call: 0 };
  const giraffe = { ...points.giraffe, yaw: .06, time: 0, gait: 0, stride: 0, browse: 0, chew: 0, reachX: 0, reachY: 2.60, reachZ: .73 };
  const zebra = { ...points.zebra, yaw: restYaw, time: 0, stride: 0, gait: 0, listen: 0, notice: 0, sleep: 0, call: 0 };
  const lion = { ...points.lion, yaw: -.14, time: 0, gait: 0, stride: 0, roar: 0, stretch: 0,
    attention: 0, paw: 0, pawX: 0, pawY: 0, pawZ: 0 };
  const lionGrass = { ...points.lionGrass, cue: 0, bend: 0 };
  giraffe.feet = giraffeHoofStance.map(stance => footOnGround(giraffe, stance));
  const flowers = points.flowers.map((point, index) => ({ ...point, index, wet: 0, bloom: 0, selected: index === 0 }));
  const leaves = points.leaves.map((point, index) => ({ ...point, index, bend: 0, remaining: maxLeaves, selected: index === 0 }));
  const wateredAt = flowers.map(() => -Infinity);
  const bittenAt = leaves.map(() => -Infinity);
  const fallenAt = leaves.map(() => -Infinity);
  let time = 0;
  let plainTime = 0;
  const elephantRoutine = { index: 0, next: .95 };
  const giraffeRoutine = { index: 0, next: 1.75 };
  const zebraRoutine = { index: 0, next: 2.9 };
  const lionRoutine = { index: 0, next: 3.65 };
  let night = false;
  let flowerChoice = 0;
  let leafChoice = 0;
  let watering = null;
  let elephantCallAt = -Infinity;
  let browsing = null;
  let zebraRun = null;
  let zebraAtSecondStop = false;
  let zebraCallAt = -Infinity;
  let zebraListenAt = -Infinity;
  let listenTarget = null;
  let lionRoarAt = -Infinity;
  let lionStretchAt = -Infinity;
  let lionGrassAt = -Infinity;
  let lionGrassHitAt = -Infinity;
  let lionPawing = null;
  let hoofStep = null;
  let turnHoof = -1;
  let turnDirection = 0;

  function walkRoutine(actor, route, routine, dt, ready, pace, strideSize, rest = 2.8) {
    if (!ready || plainTime < routine.next) {
      actor.gait = mix(actor.gait, 0, Math.min(1, dt * 12));
      return false;
    }
    if (walking(actor, route[routine.index], dt, pace, strideSize)) {
      routine.index = 1 - routine.index;
      routine.next = plainTime + idleDelay(rest);
    }
    return true;
  }

  function tapFlower(index) {
    if (!Number.isInteger(index) || !flowers[index]) return;
    flowerChoice = index;
    for (const flower of flowers) flower.selected = flower.index === index;
    emit({ type: 'flower-select', index, ...points.flowers[index] });
  }

  function tapElephant() {
    if (watering) return;
    const aligned = distance(elephant, points.elephant) < .013 && Math.abs(angleDelta(elephant.yaw, 0)) < .012;
    watering = { index: flowerChoice, at: aligned ? time : null, scooped: false, sprayedAt: null, hit: false };
    elephantCallAt = time;
    emit({ type: 'elephant-call' });
  }

  function stepElephant(dt, active) {
    elephant.scoop = elephant.lift = elephant.spray = elephant.call = 0;
    elephant.call = pulse((time - elephantCallAt) / .78);
    if (watering?.at === null) {
      // 取水位固定在水边；从当前站位走回去，对准水面，才开始下探长鼻。
      if (walking(elephant, points.elephant, dt, .81, .75, 6.6)) {
        const turn = angleDelta(elephant.yaw, 0);
        elephant.yaw += clamp(turn, -dt * 6.6, dt * 6.6);
        if (Math.abs(turn) < .025) { elephant.yaw = 0; watering.at = time; }
      }
    } else {
      walkRoutine(elephant, elephantWalk, elephantRoutine, dt, active && !watering, .48, .75);
    }
    if (watering && watering.at !== null) {
      const action = watering;
      const age = time - action.at;
      const target = points.flowers[action.index];
      elephant.scoop = ease(age / scoopTime) * (1 - ease((age - scoopTime) / .21));
      elephant.lift = ease((age - scoopTime) / (sprayTime - scoopTime)) * (1 - ease((age - .98) / .27));
      if (!action.scooped && age >= scoopTime) {
        action.scooped = true;
        emit({ type: 'scoop', ...points.water });
      }
      if (action.sprayedAt === null && age >= sprayTime) {
        action.sprayedAt = time;
        emit({ type: 'spray', index: action.index, ...target });
      }
      if (action.sprayedAt !== null) {
        const flightAge = time - action.sprayedAt;
        elephant.spray = 1 - ease((flightAge - .14) / .32);
        // 动画开始时水仍在途中。只有本次水弧到达的花才变湿和展开。
        if (!action.hit && flightAge >= waterTravel) {
          action.hit = true;
          wateredAt[action.index] = time;
          emit({ type: 'water-hit', index: action.index, ...target });
          if (active && !night && action.index === 1 && distance(zebra, target) < 1.35) {
            zebraListenAt = time;
            listenTarget = target;
            emit({ type: 'zebra-water-look', index: action.index, ...target });
          }
        }
      }
      if (action.hit && age >= 1.26) {
        watering = null;
        elephantRoutine.index = 0;
        elephantRoutine.next = plainTime + 2.65;
      }
    }
    const target = points.flowers[watering?.index ?? flowerChoice];
    const look = clamp(angleDelta(elephant.yaw, bearing(elephant, target)) / .63, -1, 1);
    elephant.look = mix(elephant.look, look, Math.min(1, dt * 9));
    for (const flower of flowers) {
      flower.wet = 1 - ease((time - wateredAt[flower.index] - 2.5) / 18);
      flower.bloom = clamp(flower.bloom + dt * (flower.wet > .04 ? 3.4 : -.8));
    }
  }

  function fixGiraffeReach(target) {
    const dx = target.x - giraffe.x;
    const dz = target.z - giraffe.z;
    // 将目标叶点换算到模型局部坐标，动作满幅时吻部和枝叶共享同一接触点。
    giraffe.reachX = dx * Math.cos(giraffe.yaw) - dz * Math.sin(giraffe.yaw);
    giraffe.reachY = target.y - giraffe.y;
    giraffe.reachZ = dx * Math.sin(giraffe.yaw) + dz * Math.cos(giraffe.yaw);
  }

  function tapGiraffe() {
    if (night) {
      emit({ type: 'giraffe-call' });
      return;
    }
    if (browsing || !leaves[leafChoice].remaining) return;
    const target = points.leaves[leafChoice];
    const heading = bearing(giraffe, target);
    const turn = angleDelta(giraffe.yaw, heading);
    const aligned = Math.abs(turn) < .95 && distance(giraffe, target) * Math.cos(turn) > .55;
    browsing = { index: leafChoice, at: aligned ? time : null, heading, bit: false };
    if (aligned) fixGiraffeReach(target);
  }

  function tapBranch(index) {
    if (!Number.isInteger(index) || !leaves[index]) return;
    leafChoice = index;
    for (const leaf of leaves) leaf.selected = leaf.index === index;
    emit({ type: 'leaf-select', index, ...points.leaves[index] });
    if (!night) {
      if (browsing?.at === null && browsing.index !== index) browsing = null;
      tapGiraffe();
    }
  }

  function turnGiraffe(yaw) {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    let worst = 0, index = -1;
    for (const [i, foot] of giraffe.feet.entries()) {
      if (hoofStep?.index === i) continue;
      const dx = foot.x - giraffe.x, dz = foot.z - giraffe.z;
      const x = dx * c - dz * sn, z = dx * sn + dz * c;
      const side = Math.sign(giraffeHoofStance[i].x);
      const gap = Math.min(side * x - .088, i % 2 === 0 ? z - .09 : -.34 - z);
      if (gap < worst) { index = i; worst = gap; }
    }
    if (index >= 0) {
      turnHoof = index;
      turnDirection = Math.sign(angleDelta(giraffe.yaw, yaw));
      return false;
    }
    giraffe.yaw = yaw;
    return true;
  }

  function strollGiraffe(dt, ready) {
    if (!ready || plainTime < giraffeRoutine.next) {
      giraffe.gait = mix(giraffe.gait, 0, Math.min(1, dt * 12));
      return;
    }
    const target = giraffeWalk[giraffeRoutine.index];
    const gap = distance(giraffe, target);
    if (gap < .013) {
      giraffeRoutine.index = 1 - giraffeRoutine.index;
      giraffeRoutine.next = plainTime + idleDelay(2.8);
      return;
    }
    // 在树前几步斜走，胸口保持朝开阔草地，来回不用掉头半圈。
    const heading = clamp(bearing(giraffe, target), -.86, .86);
    const turn = angleDelta(giraffe.yaw, heading);
    turnGiraffe(giraffe.yaw + clamp(turn, -dt * 3.4, dt * 3.4));
    const pace = Math.abs(turn) < .25 ? Math.min(.43, Math.max(.09, gap * 3.4)) : 0;
    const travel = Math.min(gap, pace * dt);
    giraffe.x = mix(giraffe.x, target.x, travel / gap);
    giraffe.z = mix(giraffe.z, target.z, travel / gap);
    giraffe.stride += travel * Math.PI * 2 / .95;
    giraffe.gait = mix(giraffe.gait, pace / .43, Math.min(1, dt * 12));
  }

  function stepGiraffe(dt, active) {
    giraffe.browse = giraffe.chew = 0;
    turnHoof = -1;
    turnDirection = 0;
    if (!browsing || browsing.at !== null) strollGiraffe(dt, active && !browsing);
    if (!browsing) return;
    const action = browsing;
    if (action.at === null) {
      // 先稳在这块地上转向叶子。将鼻吻硬拉向身体背后，会把整段颈部折过胸口。
      const remaining = angleDelta(giraffe.yaw, action.heading);
      const turned = clamp(remaining, -dt * 3.8, dt * 3.8);
      if (!turnGiraffe(giraffe.yaw + turned)) return;
      giraffe.stride += Math.abs(turned) * 2.6;
      giraffe.gait = mix(giraffe.gait, .32 * clamp(Math.abs(remaining) / .60), Math.min(1, dt * 14));
      if (Math.abs(remaining - turned) > .025) return;
      if (!turnGiraffe(action.heading)) return;
      fixGiraffeReach(points.leaves[action.index]);
      action.at = time;
    }
    const age = time - action.at;
    giraffe.browse = ease(age / .52) * (1 - ease((age - .62) / .44));
    if (!action.bit && age >= mouthContact) {
      action.bit = true;
      const index = action.index;
      const leaf = leaves[index];
      const from = points.leaves[index];
      const to = leafFallPoints[index];
      bittenAt[index] = fallenAt[index] = time;
      leaf.remaining--;
      emit({ type: 'leaf-bite', index, ...from });
      emit({ type: 'leaf-fall', index, ...from, toX: to.x, toY: to.y, toZ: to.z, duration: leafTravel });
    }
    if (action.bit) giraffe.chew = pulse((time - bittenAt[action.index]) / .61);
    if (age >= 1.17) { browsing = null; giraffeRoutine.next = plainTime + 2.7; }
  }

  function stepGiraffeFeet(before, dt) {
    const ideal = giraffeHoofStance.map(stance => footOnGround(giraffe, stance));
    if (!hoofStep) {
      let index = turnHoof, largest = giraffe.gait > .06 ? .11 : .045;
      for (const [i, foot] of giraffe.feet.entries()) {
        if (turnHoof >= 0) break;
        const drift = distance(foot, ideal[i]);
        if (drift > largest) { largest = drift; index = i; }
      }
      if (index < 0) return;
      hoofStep = { index, from: position(giraffe.feet[index]), at: time };
    }
    // 起蹄前，其他三只蹄固定在世界坐标。抬起的一只略向前预留下一次落脚。
    const progress = clamp((time - hoofStep.at + dt) / .102), travel = ease(progress);
    const deltaYaw = angleDelta(before.yaw, giraffe.yaw);
    const projected = {
      x: giraffe.x + 4 * (giraffe.x - before.x), z: giraffe.z + 4 * (giraffe.z - before.z),
      yaw: giraffe.yaw + 2 * deltaYaw + .11 * turnDirection
    };
    const to = footOnGround(projected, giraffeHoofStance[hoofStep.index]);
    const foot = giraffe.feet[hoofStep.index];
    foot.x = mix(hoofStep.from.x, to.x, travel);
    foot.z = mix(hoofStep.from.z, to.z, travel);
    foot.y = points.floor + .105 * pulse(progress);
    // 只绕开已经落地的鞋底，站着的三只脚始终不被挤开。
    for (const [index, other] of giraffe.feet.entries()) {
      if (index === hoofStep.index) continue;
      const gap = distance(foot, other);
      if (gap > .001 && gap < .23) {
        foot.x = other.x + (foot.x - other.x) * .23 / gap;
        foot.z = other.z + (foot.z - other.z) * .23 / gap;
      }
    }
    if (progress === 1) hoofStep = null;
  }

  function stepLeaves() {
    for (const leaf of leaves) {
      const age = time - bittenAt[leaf.index];
      leaf.bend = ease(age / .09) * (1 - ease((age - .12) / .64));
      if (age >= 2.8) leaf.remaining = maxLeaves;
      if (fallenAt[leaf.index] === -Infinity || time - fallenAt[leaf.index] < leafTravel) continue;
      fallenAt[leaf.index] = -Infinity;
      const landing = leafFallPoints[leaf.index];
      emit({ type: 'leaf-land', index: leaf.index, ...landing });
      if (!night && distance(zebra, landing) < .76) {
        zebraListenAt = time;
        listenTarget = landing;
        emit({ type: 'zebra-leaf-look', index: leaf.index, ...landing });
      }
    }
  }

  function tapZebra() {
    if (night) {
      emit({ type: 'sleep', animal: 'zebra' });
      return;
    }
    if (zebraRun) return;
    const to = zebraAtSecondStop ? points.zebra : points.zebraRun;
    zebraRun = { from: position(zebra), to, at: time };
    zebraCallAt = time;
    emit({ type: 'zebra-call' });
  }

  function markHoof(side, front) {
    const x = side * .20;
    const z = front ? .32 : -.31;
    const c = Math.cos(zebra.yaw);
    const s = Math.sin(zebra.yaw);
    const foot = (front ? 'front-' : 'hind-') + (side < 0 ? 'left' : 'right');
    emit({ type: 'hoof', x: zebra.x + x * c + z * s, y: points.floor + .008,
      z: zebra.z - x * s + z * c, yaw: zebra.yaw, foot });
  }

  function stepZebra(dt, active) {
    zebra.call = night ? 0 : pulse((time - zebraCallAt) / .60);
    if (zebraRun) {
      const face = bearing(zebraRun.from, zebraRun.to);
      zebra.yaw += angleDelta(zebra.yaw, face) * Math.min(1, dt * 14);
      const { from, to, at } = zebraRun;
      const progress = clamp((time - at - .10) / .73);
      const travel = ease(progress);
      const previous = position(zebra);
      zebra.x = mix(from.x, to.x, travel);
      zebra.z = mix(from.z, to.z, travel);
      zebra.gait = pulse(progress);
      const oldBeat = Math.floor(zebra.stride / Math.PI);
      zebra.stride += distance(previous, zebra) * 16;
      const beat = Math.floor(zebra.stride / Math.PI);
      // 每越过一次小跑节拍，才投放当下斜对角两只落地的蹄印。
      if (beat > oldBeat) {
        const side = beat % 2 ? -1 : 1;
        markHoof(side, true);
        markHoof(-side, false);
      }
      if (progress === 1) {
        Object.assign(zebra, to);
        zebraRun = null;
        zebraAtSecondStop = !zebraAtSecondStop;
        zebraRoutine.index = 0;
        zebraRoutine.next = plainTime + 2.55;
      }
    } else if (active) {
      const center = zebraAtSecondStop ? points.zebraRun : points.zebra;
      const near = { x: center.x - .17, z: center.z + (zebraAtSecondStop ? -.39 : .37) };
      walkRoutine(zebra, [near, center], zebraRoutine, dt,
        !night && zebra.sleep < .20 && time - zebraListenAt > .86, .51, .65);
    } else {
      zebra.gait = 0;
      zebra.yaw += angleDelta(zebra.yaw, restYaw) * Math.min(1, dt * 4);
    }
    const listening = night ? 0 : pulse((time - zebraListenAt) / .86);
    const sign = listening ? clamp(angleDelta(zebra.yaw, bearing(zebra, listenTarget)) / 1.2, -1, 1) : 0;
    zebra.listen = sign * listening;
    zebra.notice = listening;
    zebra.sleep = clamp(zebra.sleep + dt * (night && !zebraRun ? 2.05 : -2.8));
  }

  function tapLion() {
    lionPawing = null;
    lionRoarAt = time;
    lionRoutine.next = plainTime + 3.0;
    emit({ type: 'lion-call' });
  }

  function tapRock() {
    lionPawing = null;
    lionRoarAt = -Infinity;
    lionStretchAt = time;
    lionRoutine.next = plainTime + 3.0;
    emit({ type: 'rock-touch', ...points.rock });
  }

  function tapLionGrass() {
    lionGrassAt = time;
    emit({ type: 'lion-grass-touch', ...points.lionGrass });
    if (lionPawing) return;
    lionRoarAt = lionStretchAt = -Infinity;
    lionRoutine.next = plainTime + 3.0;
    const heading = bearing(lion, points.lionGrass) - .31;
    lionPawing = { heading, at: null, hit: false };
  }

  function stepLion(dt, active) {
    lion.roar = pulse((time - lionRoarAt) / .84);
    lion.stretch = pulse((time - lionStretchAt) / 1.25);
    lionGrass.cue = pulse((time - lionGrassAt) / .52);
    lionGrass.bend = pulse((time - lionGrassHitAt) / .82);
    lion.attention = lion.paw = 0;
    walkRoutine(lion, lionWalk, lionRoutine, dt,
      active && !lionPawing && time - lionRoarAt > .84 && time - lionStretchAt > 1.25, .34, .48, 1.85);
    if (!lionPawing) return;
    lion.attention = ease((time - lionGrassAt) / .11);
    const action = lionPawing;
    if (action.at === null) {
      const remaining = angleDelta(lion.yaw, action.heading);
      lion.yaw += clamp(remaining, -dt * 5.4, dt * 5.4);
      if (Math.abs(remaining) > .06) return;
      lion.yaw = action.heading;
      const dx = lionGrass.x - lion.x, dz = lionGrass.z - lion.z;
      const c = Math.cos(lion.yaw), s = Math.sin(lion.yaw);
      lion.pawX = dx * c - dz * s;
      lion.pawZ = dx * s + dz * c;
      lion.pawY = lionGrass.y - lion.y;
      action.at = time;
    }
    const age = time - action.at;
    lion.paw = ease(age / .40) * (1 - ease((age - .47) / .35));
    if (!action.hit && age >= .415) {
      action.hit = true;
      lionGrassHitAt = time;
      emit({ type: 'lion-grass-contact', ...points.lionGrass });
    }
    lion.attention *= 1 - ease((age - .60) / .36);
    if (age >= .96) lionPawing = null;
  }

  function setNight(value) {
    night = Boolean(value);
    if (night) zebraCallAt = zebraListenAt = -Infinity;
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active) plainTime += dt;
    elephant.time = giraffe.time = zebra.time = lion.time = time;
    stepElephant(dt, active);
    const before = { ...position(giraffe), yaw: giraffe.yaw };
    stepGiraffe(dt, active);
    stepGiraffeFeet(before, dt);
    stepZebra(dt, active);
    stepLeaves();
    stepLion(dt, active);
  }

  return {
    elephant, giraffe, zebra, lion, lionGrass, flowers, leaves,
    get time() { return time; },
    setNight, step, tapElephant, tapFlower, tapGiraffe, tapBranch, tapZebra, tapLion, tapRock, tapLionGrass
  };
}
