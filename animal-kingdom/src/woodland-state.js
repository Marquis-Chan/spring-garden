import { clamp, idleClockRate, ease, idleDelay, mix } from './state.js';

const peckerYaw = -2.10;
const barkOutward = { x: -Math.sin(peckerYaw), z: -Math.cos(peckerYaw) };

function barkPoint(y) {
  const height = (y - 2.01) / .57;
  const centerX = 8.60 + height * .04;
  const radius = .30 - height * .05;
  return { x: centerX + radius * barkOutward.x, y, z: -1.64 + radius * barkOutward.z };
}

export const woodlandPoints = {
  squirrelRoots: [{ x: 8.05, y: .51, z: -.48 }, { x: 9.42, y: .38, z: -.16 }],
  squirrelPerch: { x: 7.86, y: 1.22, z: -.58 },
  peckerPerches: [1.68, 2.25].map(barkPoint),
  wood: [2.01, 2.58].map(barkPoint),
  foxStops: [{ x: 9.63, y: .38, z: 3.58 }, { x: 10.65, y: .38, z: 3.34 }],
  litter: [{ x: 9.62, y: .38, z: 4.23 }, { x: 10.95, y: .38, z: 3.96 }]
};

const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
const valid = (index, list) => Number.isInteger(index) && index >= 0 && index < list.length;

export function createWoodland(emit = () => {}, { groundAt = () => .38 } = {}) {
  const points = woodlandPoints;
  const squirrelSites = [...points.squirrelRoots, points.squirrelPerch];
  const squirrel = {
    ...squirrelSites[0], yaw: .28, time: 0, site: 0, gait: 0, stride: 0, crouch: 0, air: 0, land: 0,
    climb: 0, hold: 1, carry: 1, listen: 0, look: 0, sleep: 0, call: 0
  };
  const pecker = {
    ...points.peckerPerches[0], yaw: peckerYaw, time: 0, site: 0, flight: 0, flap: 0, peck: 0, sleep: 0,
    climb: 0, stride: 0, climbDirection: 0, targetX: 0, targetY: 0, targetZ: 0, surfaceZ: 0, tailZ: -.028
  };
  const fox = { ...points.foxStops[0], yaw: -.23, time: 0, site: 0, gait: 0, stride: 0, ears: 0, sniff: 0, dig: 0, call: 0 };
  fox.y = groundAt(fox.x, fox.z);
  const litter = points.litter.map((point, index) => ({ ...point, index, selected: false, stir: 0, scatter: 0 }));
  const litterTouchAt = litter.map(() => -Infinity);
  const litterFlipAt = litter.map(() => -Infinity);
  let time = 0;
  let routineTime = 0;
  let foxRoutineAt = .92;
  let squirrelRoutineAt = 2.12;
  let peckerRoutineAt = 3.88;
  let night = false;
  let squirrelGoal = null;
  let squirrelGoalQuiet = false;
  let squirrelMove = null;
  let squirrelLandedAt = -Infinity;
  let squirrelCallAt = -Infinity;
  let squirrelListenAt = -Infinity;
  let soundSource = null;
  let peckerMove = null;
  let peckerPack = null;
  let queuedWood = null;
  let foxMove = null;
  let queuedFox = null;
  let foxCallAt = -Infinity;

  function sleepTap(animal, motion) {
    if (!motion) emit({ type: 'sleep', animal });
  }

  function startSquirrel() {
    if (squirrelGoal === null || squirrelGoal === squirrel.site || night) {
      squirrelGoal = null;
      return;
    }
    // 远树根与低枝之间要经过近根，让攀爬始终沿树干发生。
    const crossesTreeRoot = (squirrelGoal === 2 && squirrel.site === 1) || (squirrelGoal === 1 && squirrel.site === 2);
    const index = crossesTreeRoot ? 0 : squirrelGoal;
    const climbing = index === 2 || squirrel.site === 2;
    squirrelMove = { index, from: position(squirrel), at: time, climbing, quiet: squirrelGoalQuiet };
    if (!squirrelMove.quiet) emit({ type: climbing ? 'squirrel-climb' : 'squirrel-run', index, ...position(squirrel) });
  }

  function goSquirrel(index, quiet = false) {
    if (night) {
      sleepTap('squirrel', squirrelMove);
      return;
    }
    squirrelGoal = index;
    squirrelGoalQuiet = quiet;
    squirrelRoutineAt = routineTime + 3.8;
    if (!squirrelMove) startSquirrel();
  }

  function tapSquirrel() {
    if (night) {
      sleepTap('squirrel', squirrelMove);
      return;
    }
    if (squirrelMove && !squirrelMove.quiet) return;
    squirrelCallAt = time;
    emit({ type: 'squirrel-call' });
    goSquirrel((squirrelMove?.index ?? squirrel.site) === 0 ? 1 : 0);
  }

  function tapRoot(index) {
    if (valid(index, points.squirrelRoots)) goSquirrel(index);
  }

  function tapSquirrelPerch() {
    goSquirrel(2);
  }

  function stepSquirrel(dt, active) {
    squirrel.gait = squirrel.crouch = squirrel.air = squirrel.climb = 0;
    squirrel.land = 1 - ease((time - squirrelLandedAt) / .20);
    squirrel.call = night ? 0 : pulse((time - squirrelCallAt) / .62);
    let heading = .28;
    if (squirrelMove) {
      const { index, from, at, climbing, quiet } = squirrelMove;
      const to = squirrelSites[index];
      const age = time - at;
      const duration = climbing ? .70 : quiet ? .95 : .66;
      const progress = clamp((age - .10) / duration);
      const travel = ease(progress);
      const previous = position(squirrel);
      squirrel.x = mix(from.x, to.x, travel);
      squirrel.y = mix(from.y, to.y, travel) + (climbing ? 0 : (quiet ? .053 : .085) * pulse(progress));
      squirrel.z = mix(from.z, to.z, travel);
      squirrel.stride += distance(previous, squirrel) * 14;
      squirrel.crouch = ease(age / .10) * (1 - ease((age - .10) / .19));
      squirrel.climb = climbing ? pulse(progress) : 0;
      squirrel.gait = climbing ? 0 : pulse(progress);
      squirrel.air = climbing ? 0 : (quiet ? .32 : .59) * pulse(progress);
      heading = climbing ? bearing(squirrelSites[0], squirrelSites[2]) : bearing(from, to);
      if (progress === 1) {
        squirrel.site = index;
        Object.assign(squirrel, to);
        squirrelMove = null;
        squirrelLandedAt = time;
        squirrelRoutineAt = routineTime + idleDelay(2.65);
        if (!quiet) emit({ type: 'squirrel-land', index, ...to });
        // 松果真的随松鼠落到朝草窝的树根，才让近处的兔听见一下。
        if (active && !night && index === 1) emit({ type: 'squirrel-rustle', ...to });
        startSquirrel();
      }
    }
    squirrel.yaw += angleDelta(squirrel.yaw, heading) * Math.min(1, dt * (squirrelMove ? 14 : 5));
    squirrel.sleep = clamp(squirrel.sleep + dt * (night && !squirrelMove ? 2.05 : -2.8));
    const listening = night ? 0 : pulse((time - squirrelListenAt) / .95);
    squirrel.listen = listening ? clamp(angleDelta(squirrel.yaw, bearing(squirrel, soundSource)) / 1.2, -1, 1) * listening : 0;
    squirrel.look = squirrel.listen;
    squirrel.hold = 1 - .17 * squirrel.climb;
    squirrel.carry = squirrel.hold;
  }

  function setPeckerTarget(index) {
    const target = points.wood[index];
    const dx = target.x - pecker.x;
    const dz = target.z - pecker.z;
    pecker.targetX = dx * Math.cos(pecker.yaw) - dz * Math.sin(pecker.yaw);
    pecker.targetY = target.y - pecker.y;
    pecker.targetZ = dx * Math.sin(pecker.yaw) + dz * Math.cos(pecker.yaw);
  }

  function startPeck() {
    peckerPack = { at: time, hits: 0, lastAt: -Infinity, heard: false };
    peckerRoutineAt = routineTime + 3.85;
    setPeckerTarget(pecker.site);
  }

  function reachWood(index, quiet = false) {
    if (pecker.site === index) {
      if (!quiet) startPeck();
      return;
    }
    peckerMove = { at: time, from: position(pecker), index, quiet, peckAfter: false };
    if (!quiet) emit({ type: 'pecker-climb', index, ...position(pecker) });
  }

  function tapPecker() {
    if (night) {
      sleepTap('pecker', peckerMove);
      return;
    }
    if (peckerMove?.quiet) {
      queuedWood = null;
      peckerMove.peckAfter = true;
    } else if (!peckerPack && !peckerMove) startPeck();
  }

  function tapWood(index) {
    if (!valid(index, points.wood)) return;
    if (night) {
      sleepTap('pecker', peckerMove);
      return;
    }
    emit({ type: 'wood-touch', index, ...points.wood[index] });
    if (peckerMove?.quiet) {
      peckerMove.peckAfter = index === peckerMove.index;
      queuedWood = peckerMove.peckAfter ? null : index;
      return;
    }
    if (peckerPack || peckerMove) {
      queuedWood = index === (peckerMove?.index ?? pecker.site) ? null : index;
      return;
    }
    reachWood(index);
  }

  function strikeWood(action) {
    const point = points.wood[pecker.site];
    pecker.peck = 1;
    action.hits++;
    action.lastAt = time;
    // 命中帧喙的混合权重为 1，录音与此事件同帧启动。
    emit({ type: 'peck-hit', index: pecker.site, beat: action.hits, ...point });
    if (!action.heard && distance(squirrel, point) < 1.37 && squirrel.sleep < .18) {
      soundSource = point;
      squirrelListenAt = time;
      action.heard = true;
      emit({ type: 'squirrel-listen', index: squirrel.site, ...position(squirrel) });
    }
  }

  function stepPecker(dt) {
    pecker.flight = pecker.flap = pecker.peck = pecker.climb = pecker.climbDirection = 0;
    if (peckerMove) {
      const { at, from, index, quiet, peckAfter } = peckerMove;
      const to = points.peckerPerches[index];
      const progress = clamp((time - at) / (quiet ? .86 : .52));
      const glide = ease(progress);
      const grip = Math.min(ease(progress / .16), ease((1 - progress) / .17));
      const clearance = quiet ? .012 * grip : .043 * pulse(progress);
      const previousY = pecker.y;
      pecker.x = mix(from.x, to.x, glide) + barkOutward.x * clearance;
      pecker.y = mix(from.y, to.y, glide);
      pecker.z = mix(from.z, to.z, glide) + barkOutward.z * clearance;
      if (quiet) {
        // 一直贴着树身，翼不摆成离枝姿态；步距驱动前爪交替抓树皮。
        pecker.climb = grip;
        pecker.stride += Math.abs(pecker.y - previousY) * (2 * Math.PI / .22);
        pecker.climbDirection = Math.sign(to.y - from.y);
      } else {
        pecker.flight = .66 * pulse(progress);
        pecker.flap = Math.sin(progress * Math.PI * 7) * pecker.flight;
      }
      if (progress === 1) {
        pecker.site = index;
        Object.assign(pecker, to);
        peckerMove = null;
        setPeckerTarget(index);
        peckerRoutineAt = routineTime + idleDelay(3.3);
        if (!quiet) emit({ type: 'pecker-land', index, ...to });
        if (!night) {
          if (!quiet || peckAfter) startPeck();
          else if (queuedWood !== null) {
            const next = queuedWood;
            queuedWood = null;
            reachWood(next);
          }
        }
      }
    }
    pecker.sleep = clamp(pecker.sleep + dt * (night && !peckerMove ? 2.05 : -2.8));
    if (!peckerPack) return;
    const action = peckerPack;
    const next = action.at + .23 + action.hits * .25;
    const recoil = time - action.lastAt;
    if (action.hits < 3 && next <= time) strikeWood(action);
    else if (recoil < .115) pecker.peck = 1 - ease(recoil / .115);
    else if (action.hits < 3) pecker.peck = ease((time - next + .11) / .11);
    else if (recoil >= .18) {
      peckerPack = null;
      if (queuedWood !== null) {
        const index = queuedWood;
        queuedWood = null;
        reachWood(index);
      }
    }
  }

  function startFox(index, dig, quiet = false) {
    const from = position(fox);
    const to = points.foxStops[index];
    const length = distance(from, to);
    const heading = bearing(from, to);
    const turnTime = quiet ? Math.max(.13, Math.abs(angleDelta(fox.yaw, heading)) / 4.8) : .08;
    const duration = length > .04 ? quiet ? length / .72 + .18 : .71 : 0;
    foxMove = { index, from, to, duration, heading, turnTime, dig, quiet, at: time, landed: false, flipped: false };
  }

  function tapFox() {
    if (foxMove && !foxMove.quiet) return;
    foxCallAt = time;
    emit({ type: 'fox-call' });
    startFox(1 - (foxMove?.index ?? fox.site), false);
  }

  function tapLitter(index) {
    if (!valid(index, litter)) return;
    litterTouchAt[index] = time;
    for (const patch of litter) patch.selected = patch.index === index;
    emit({ type: 'litter-touch', index, ...points.litter[index] });
    if (foxMove?.quiet) {
      startFox(index, true);
      return;
    }
    if (foxMove) {
      queuedFox = foxMove.dig && foxMove.index === index ? null : index;
      return;
    }
    startFox(index, true);
  }

  function flipLitter(action) {
    const { index } = action;
    action.flipped = true;
    litterFlipAt[index] = time;
    fox.dig = 1;
    emit({ type: 'litter-flip', index, ...points.litter[index] });
  }

  function stepFox(dt) {
    fox.gait = fox.ears = fox.sniff = fox.dig = 0;
    fox.call = pulse((time - foxCallAt) / .73);
    if (foxMove) {
      const action = foxMove;
      const age = time - action.at;
      const progress = action.duration ? clamp((age - action.turnTime) / action.duration) : 1;
      const travel = ease(progress);
      const before = position(fox);
      fox.x = mix(action.from.x, action.to.x, travel);
      fox.z = mix(action.from.z, action.to.z, travel);
      fox.y = groundAt(fox.x, fox.z);
      const moved = distance(before, fox);
      fox.gait = action.quiet && dt ? clamp(moved / (dt * .82), 0, .91) : pulse(progress);
      fox.stride += moved * 13.4;
      const target = points.litter[action.index];
      const heading = action.quiet ? action.heading : progress < 1 ? action.heading : action.dig ? bearing(fox, target) : -.23;
      fox.yaw += angleDelta(fox.yaw, heading) * Math.min(1, dt * (action.quiet ? 9 : 14));
      fox.ears = action.dig ? pulse(age / .48) : 0;
      if (progress === 1) {
        const arrived = age - (action.duration ? action.duration + action.turnTime : 0);
        if (!action.landed) {
          action.landed = true;
          fox.site = action.index;
          if (!action.quiet) emit({ type: 'fox-land', index: action.index, ...position(fox) });
        }
        if (action.dig) {
          fox.ears = Math.max(fox.ears, .56 * pulse(arrived / .47));
          fox.sniff = pulse((arrived - .10) / .50);
          fox.dig = ease((arrived - .48) / .24) * (1 - ease((arrived - .80) / .36));
          if (!action.flipped && arrived >= .74) flipLitter(action);
        } else if (action.quiet) {
          fox.ears = .27 * pulse(arrived / .57);
          fox.sniff = .48 * pulse((arrived - .10) / .65);
        }
        if (arrived >= (action.dig ? 1.24 : action.quiet ? .83 : .17)) {
          foxMove = null;
          foxRoutineAt = routineTime + idleDelay(2.3);
          if (queuedFox !== null) {
            const next = queuedFox;
            queuedFox = null;
            startFox(next, true);
          }
        }
      }
    }
    for (const patch of litter) {
      patch.stir = pulse((time - litterTouchAt[patch.index]) / .43);
      patch.scatter = pulse((time - litterFlipAt[patch.index]) / .80);
    }
  }

  function setNight(value) {
    night = Boolean(value);
    if (night) {
      squirrelGoal = null;
      squirrelCallAt = squirrelListenAt = -Infinity;
      peckerPack = null;
      queuedWood = null;
    }
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active) {
    routineTime += dt * idleClockRate;
      if (!foxMove && routineTime >= foxRoutineAt) startFox(1 - fox.site, false, true);
      if (!night && !squirrelMove && routineTime >= squirrelRoutineAt && squirrel.sleep < .18) {
        goSquirrel(squirrel.site === 0 ? 1 : 0, true);
      }
      if (!night && !peckerMove && !peckerPack && routineTime >= peckerRoutineAt && pecker.sleep < .18) {
        reachWood(1 - pecker.site, true);
      }
    }
    squirrel.time = pecker.time = fox.time = time;
    stepSquirrel(dt, active);
    stepPecker(dt);
    stepFox(dt);
  }

  setPeckerTarget(0);
  return {
    squirrel, pecker, fox, litter, get time() { return time; },
    step, setNight, tapSquirrel, tapRoot, tapSquirrelPerch, tapPecker, tapWood, tapFox, tapLitter
  };
}
