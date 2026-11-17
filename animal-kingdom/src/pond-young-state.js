import { aroundRock, clamp, ease, idleTravelRate, mix, waterPoint } from './state.js';

const duckWaterY = .025;
const duckPath = { x: .44, z: -1.58, rx: 1.13, rz: .50 };
const cove = { x: 2.15, z: -1.30 };
const lilyPass = { x: 1.96, z: .72 };
const openWater = { x: 1.48, z: 1.42 };
const swimmingRoute = [lilyPass, openWater];
const returnRoute = [openWater, lilyPass, cove];
const reunionSpots = [{ x: -1.09, z: 1.04 }, { x: .92, z: 1.31 }];
const reeds = [{ x: -.58, z: -2.12, yaw: -.20 }, { x: .46, z: -2.30, yaw: .21 }];
const startingAngles = [.68, -1.43];
const orbit = 2 * Math.PI;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = value => value > 0 && value < 1 ? Math.sin(Math.PI * value) : 0;
const spatial = ({ x, y, z, yaw }) => ({ x, y, z, yaw });

function duckPoint(angle) {
  return { x: duckPath.x + duckPath.rx * Math.sin(angle), z: duckPath.z + duckPath.rz * Math.cos(angle) };
}

function tadpolePoint(index, phase, center = cove) {
  const angle = index * orbit / 4 + phase;
  const spacing = 1 + .27 * ease(distance(center, cove) / .65);
  return {
    x: center.x + Math.cos(angle) * (.22 + .036 * Math.sin(phase * 1.7 + index)) * spacing,
    z: center.z + Math.sin(angle) * (.17 + .024 * Math.cos(phase * 1.9 + index)) * spacing
  };
}

export function createPondYoung(emit = () => {}) {
  const ducks = startingAngles.map((angle, index) => ({ ...duckPoint(angle), y: duckWaterY, index, yaw: 1.52,
    time: 0, swim: 0, paddle: 0, headUp: 0, dip: 0, wing: 0, shake: 0, call: 0, follow: 0, sleep: 0 }));
  const tadpoles = Array.from({ length: 4 }, (_, index) => ({ ...tadpolePoint(index, 0), y: -.07 - index * .004,
    index, yaw: 0, time: 0, tail: 0, scatter: 0 }));
  const actions = [null, null];
  const reactions = tadpoles.map(() => null);
  const waves = [];
  const youngCenter = {...cove};
  let time = 0;
  let dayTime = 0;
  let tadpolePhase = 0;
  let visitClock = 0;
  let nextVisit = 4.45;
  let visit = null;
  let swimSpeed = 0;
  let followAt = -Infinity;
  let lastTapAt = -Infinity;
  let night = false;
  let sunset = null;
  let dawn = null;

  function tapDuck(index) {
    const duck = Number.isInteger(index) ? ducks[index] : null;
    if (!duck) return;
    if (night) {
      emit({ type: 'sleep', animal: 'duck', index, x: duck.x, z: duck.z });
      return;
    }
    if (actions[index] && time - actions[index].at < .96) return;
    actions[index] = { at: time, rippled: false, replied: false };
    emit({ type: 'duck-call', index, x: duck.x, z: duck.z });
  }

  function startWave(duck) {
    const direction = duck.index === 1 ? .15 : -.23;
    const wave = {
      x: duck.x + Math.sin(duck.yaw) * direction,
      z: duck.z + Math.cos(duck.yaw) * direction,
      index: duck.index, at: time, strength: duck.index === 1 ? .91 : .73,
      radius: 0, seen: new Set(), reported: false
    };
    wave.previous = tadpoles.map(actor => distance(actor, wave));
    waves.push(wave);
    if (waves.length > 8) waves.shift();
    emit({ type: 'duck-ripple', index: wave.index, x: wave.x, z: wave.z, strength: wave.strength });
  }

  function markScatter(actor, point, amount) {
    const home = tadpolePoint(actor.index, tadpolePhase, youngCenter);
    const startX = actor.x - home.x;
    const startZ = actor.z - home.z;
    const outward = Math.atan2(actor.x - youngCenter.x, actor.z - youngCenter.z);
    const away = distance(actor, point) > .04 ? Math.atan2(actor.x - point.x, actor.z - point.z) : outward;
    let direction = outward + angleDelta(outward, away) * .49;
    const offset = Math.hypot(startX, startZ);
    if (offset > .045) {
      const current = Math.atan2(startX, startZ);
      direction = current + angleDelta(current, direction) * .32;
    }
    const reach = Math.max(amount, Math.min(night ? .32 : .50, offset + .26 * amount));
    // 连点或不同来源水波叠加时，从真实位置与当前尾摆继续，不跳回藏身点。
    reactions[actor.index] = {
      at: time, startX, startZ, startSpread: actor.scatter,
      x: Math.sin(direction) * reach, z: Math.cos(direction) * reach
    };
  }

  function tapTadpoles(index = 0) {
    const actor = Number.isInteger(index) ? tadpoles[index] : null;
    if (!actor || time - lastTapAt < .34) return;
    lastTapAt = time;
    const point = { x: actor.x, z: actor.z };
    for (const item of tadpoles) markScatter(item, point, night ? .19 : .36);
    emit({ type: 'tadpole-scatter', cause: 'tap', index, ...point });
  }

  function stepWaves() {
    while (waves[0] && time - waves[0].at > 1.06) waves.shift();
    for (const wave of waves) {
      const age = time - wave.at;
      // 与水面正在展开的第一道波使用相同半径。波纹从旁边经过的蝌蚪继续游。
      const radius = .10 + age * (.60 + .24 * wave.strength);
      for (const actor of tadpoles) {
        if (wave.seen.has(actor.index)) continue;
        const gap = distance(actor, wave);
        if (age >= .08 && wave.previous[actor.index] > wave.radius && gap <= radius + .035) {
          wave.seen.add(actor.index);
          markScatter(actor, wave, .32);
          if (!wave.reported) {
            wave.reported = true;
            emit({ type: 'tadpole-scatter', cause: 'duck', source: wave.index, index: actor.index,
              x: actor.x, z: actor.z, radius, distance: gap });
          }
        }
        wave.previous[actor.index] = gap;
      }
      wave.radius = radius;
    }
  }

  function setNight(value) {
    const next = Boolean(value);
    if (next === night) return;
    night = next;
    actions.fill(null);
    waves.length = 0;
    followAt = -Infinity;
    if (night) {
      const positions = ducks.map(spatial);
      const order = ducks[0].x < ducks[1].x ? reeds : [reeds[1], reeds[0]];
      sunset = { at: time, positions, order };
      dawn = null;
    } else {
      dawn = { at: time, positions: ducks.map(spatial) };
      sunset = null;
    }
  }

  function stepDuck(duck, dt, active) {
    const index = duck.index;
    const before = spatial(duck);
    duck.time = time;
    duck.headUp = duck.dip = duck.wing = duck.shake = duck.call = duck.follow = 0;
    if (night) {
      const age = time - sunset.at;
      const travel = ease(age / 1.43);
      const start = sunset.positions[index];
      const nest = sunset.order[index];
      duck.x = mix(start.x, nest.x, travel);
      duck.z = mix(start.z, nest.z, travel);
      duck.y = mix(start.y, .018, travel);
      const facing = distance(before, duck) > .001 ? Math.atan2(duck.x - before.x, duck.z - before.z) : nest.yaw;
      const turning = mix(facing, nest.yaw, ease((age - .94) / .49));
      duck.yaw += angleDelta(duck.yaw, turning) * Math.min(1, dt * 10);
      duck.sleep = ease((age - 1.08) / .58);
      duck.swim = clamp(distance(before, duck) / Math.max(.001, dt * .96)) * (1 - duck.sleep);
    } else {
      const action = actions[index];
      const age = action ? time - action.at : Infinity;
      const followAge = time - followAt;
      duck.follow = index === 1 ? pulse(followAge / 1.15) : 0;
      const angle = startingAngles[index] + dayTime * .55 * idleTravelRate + duck.follow * .12;
      const point = duckPoint(angle);
      const travel = dawn ? ease((time - dawn.at) / 1.13) : 1;
      const origin = dawn ? dawn.positions[index] : before;
      duck.x = mix(origin.x, point.x, travel);
      duck.z = mix(origin.z, point.z, travel);
      duck.y = mix(origin.y, duckWaterY, travel);
      const heading = Math.atan2(duckPath.rx * Math.cos(angle), -duckPath.rz * Math.sin(angle));
      const facing = travel < .83 && distance(before, duck) > .001
        ? Math.atan2(duck.x - before.x, duck.z - before.z) : heading;
      duck.yaw += angleDelta(duck.yaw, facing) * Math.min(1, dt * 8.5);
      duck.sleep = Math.max(0, duck.sleep - dt * 3.2);
      duck.swim = clamp(distance(before, duck) / Math.max(.001, dt * .87));
      if (action) {
        duck.call = pulse(age / .76);
        if (index === 0) {
          duck.headUp = .93 * pulse((age - .02) / .83);
          if (!action.replied && age >= .38) {
            action.replied = true;
            followAt = time;
            emit({ type: 'duck-follow', index: 1, source: 0, x: ducks[1].x, z: ducks[1].z });
          }
        } else {
          duck.wing = .88 * pulse(age / .76);
          duck.shake = .50 * pulse((age - .39) / .48);
          duck.dip = .74 * pulse((age - .23) / .54);
        }
        if (!action.rippled && age >= (index === 0 ? .50 : .47)) {
          action.rippled = true;
          startWave(duck);
        }
        if (age >= 1.05) actions[index] = null;
      }
      if (!active && travel === 1 && !action) duck.swim = 0;
    }
    duck.paddle = (duck.paddle + dt * (1.1 + 2.0 * duck.swim) * duck.swim) % 1;
  }

  function swimCenter(goal, dt) {
    const gap = distance(youngCenter, goal);
    const speed = Math.min(night ? .74 : 1.14, gap * 5.1);
    swimSpeed = mix(swimSpeed, speed, Math.min(1, dt * 7));
    if (gap < .026) {
      Object.assign(youngCenter, goal);
      return true;
    }
    const travel = Math.min(1, swimSpeed * dt / gap);
    youngCenter.x = mix(youngCenter.x, goal.x, travel);
    youngCenter.z = mix(youngCenter.z, goal.z, travel);
    return false;
  }

  // 经过荷叶外沿的敞水区，分开追寻目标及回浅水窝的两段路。
  function seekFrog(dt, frog, jumping) {
    visitClock += dt;
    if (!visit) {
      if (visitClock < nextVisit || jumping) return;
      visit = {phase:'seek', leg:0, site:frog.site, metAt:0};
      emit({type:'tadpoles-seek', ...youngCenter});
    }
    if (visit.phase === 'met') {
      if (visitClock - visit.metAt < 2.35) return;
      visit.phase = 'return';
      visit.leg = 0;
    }
    if (visit.phase === 'return') {
      if (!swimCenter(returnRoute[visit.leg], dt)) return;
      if (++visit.leg < returnRoute.length) return;
      visit = null;
      swimSpeed = 0;
      nextVisit = visitClock + 6.7;
      emit({type:'tadpoles-home', ...youngCenter});
      return;
    }
    if (visit.leg < swimmingRoute.length) {
      if (swimCenter(swimmingRoute[visit.leg], dt)) visit.leg++;
      return;
    }
    if (!jumping) visit.site = frog.site;
    if (!swimCenter(reunionSpots[visit.site], dt) || jumping) return;
    visit.phase = 'met';
    visit.metAt = visitClock;
    emit({type:'tadpoles-met', site:visit.site, ...youngCenter});
  }

  function stepTadpole(actor, dt) {
    const old = spatial(actor);
    const home = tadpolePoint(actor.index, tadpolePhase, youngCenter);
    const reaction = reactions[actor.index];
    const age = reaction ? time - reaction.at : Infinity;
    const scatter = reaction ? ease(age / .28) : 0;
    const returnFade = 1 - ease((age - .35) / .94);
    const spread = reaction ? mix(reaction.startSpread, 1, scatter) * returnFade : 0;
    const offsetX = reaction ? mix(reaction.startX, reaction.x, scatter) * returnFade : 0;
    const offsetZ = reaction ? mix(reaction.startZ, reaction.z, scatter) * returnFade : 0;
    const point = aroundRock(waterPoint({ x: home.x + offsetX, z: home.z + offsetZ }, .88), old, 1.10);
    actor.x = point.x;
    actor.z = point.z;
    actor.y = -.070 - actor.index * .004 - .017 * spread + .007 * Math.sin(tadpolePhase * 1.9 + actor.index);
    actor.time = time;
    actor.scatter = spread;
    if (distance(old, actor) > .0006) {
      const heading = Math.atan2(actor.x - old.x, actor.z - old.z);
      actor.yaw += angleDelta(actor.yaw, heading) * Math.min(1, dt * 14);
    }
    const speed = distance(old, actor) / Math.max(.001, dt);
    actor.tail = Math.sin(time * (night ? 6.1 : 12.4) + actor.index * 1.83) *
      clamp((night ? .43 : .72) + spread * .24 + speed * .12);
    if (age > 1.34) reactions[actor.index] = null;
  }

  function step(seconds, active = false, frog = null, jumping = false) {
    const dt = clamp(seconds, 0, .05);
    time += dt;
    if (active) {
      if (!night && (!dawn || time - dawn.at >= 1.13)) dayTime += dt;
      tadpolePhase += dt * (night ? .42 : .91);
      if (frog) seekFrog(dt, frog, jumping);
    }
    for (const duck of ducks) stepDuck(duck, dt, active);
    if (dawn && time - dawn.at >= 1.13) dawn = null;
    for (const tadpole of tadpoles) stepTadpole(tadpole, dt);
    stepWaves();
  }

  return { ducks, tadpoles, get time() { return time; }, step, setNight, tapDuck, tapTadpoles };
}
