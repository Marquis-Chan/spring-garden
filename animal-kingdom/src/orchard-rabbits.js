import { clamp, idleClockRate, ease, mix } from './state.js';

export const rabbitCoats = [
  { back: '#bd885e', middle: '#e3bb94', belly: '#f6e6c9', leg: '#d2a27a', innerEar: '#dea391' },
  { back: '#a59a93', middle: '#d5c9bb', belly: '#fbefd9', leg: '#bdb0a6', legShade: '#a2978c', innerEar: '#d3a0a4' }
];

const lanes = [
  [{ x: 3.19, z: 9.36 }, { x: 3.65, z: 9.83 }],
  [{ x: 5.17, z: 9.48 }, { x: 5.68, z: 9.06 }]
];
const scales = [.72, .60];
const crouchTime = .21;
const airborneTime = .51;
const landingTime = .22;
export const rabbitCarrotPoint = { x: 4.44, y: .50, z: 10.12 };
const feedingSpots = [{ x: 3.84, z: 10.24 }, { x: 4.98, z: 10.02 }];
const position = ({ x, y, z }) => ({ x, y, z });
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function createOrchardRabbits(emit = () => {}, { groundAt = () => .38 } = {}) {
  const rabbits = lanes.map(([home], index) => ({ ...home, y: groundAt(home.x, home.z), index, scale: scales[index],
    yaw: index === 0 ? .42 : -.34, site: 0, time: 0, crouch: 0, air: 0, land: 0, peek: .50, listen: 0, sleep: 0,
    lean: 0, nibble: 0, watch: 0, biteX: 0, biteY: 0, biteZ: 0 }));
  const carrot = { ...rabbitCarrotPoint, clickPoint: { x: rabbitCarrotPoint.x, y: .73, z: rabbitCarrotPoint.z },
    phase: 'ready', winner: 0, round: 0, bite: 0, pulse: 0 };
  const hops = [null, null];
  const heard = [null, null];
  const nextHop = [4.3, 8.5];
  let time = 0;
  let daylight = 0;
  let night = false;
  let race = null;
  let carrotTouchAt = -Infinity;

  function start(rabbit, routine) {
    const { index, yaw } = rabbit;
    const site = 1 - rabbit.site;
    const from = position(rabbit);
    const to = lanes[index][site];
    hops[index] = { from, to, site, yaw, heading: turn(yaw, bearing(from, to)), at: time, routine };
    heard[index] = null;
    nextHop[index] = daylight + 14 + index * 3.5;
  }

  function tap(index) {
    const rabbit = Number.isInteger(index) ? rabbits[index] : null;
    if (!rabbit || hops[index]) return;
    if (night) {
      emit({ type: 'sleep', animal: 'orchard-rabbit', index, ...position(rabbit) });
    } else if (!race) {
      start(rabbit, false);
    }
  }

  function tapCarrot() {
    carrotTouchAt = time;
    emit({ type: 'carrot-tap', ...carrot.clickPoint });
    if (night) {
      for (const rabbit of rabbits) emit({ type: 'sleep', animal: 'orchard-rabbit', index: rabbit.index, ...position(rabbit) });
      return;
    }
    if (race) return;
    carrot.phase = 'waiting';
    race = { winner: carrot.winner, from: null, at: time, cancelled: false };
    heard.fill(null);
  }

  function setNight(value) {
    night = Boolean(value);
    if (night) heard.fill(null);
    if (night && race) race.cancelled = true;
  }

  function hopEvent(rabbit, hop, phase) {
    emit({ type: 'rabbit-hop', index: rabbit.index, phase, routine: hop.routine, ...position(rabbit) });
  }

  function reactToLanding(rabbit) {
    const neighbor = rabbits[1 - rabbit.index];
    if (night || hops[neighbor.index]) return;
    heard[neighbor.index] = { at: time, direction: clamp(turn(neighbor.yaw, bearing(neighbor, rabbit)), -.88, .88) };
    emit({ type: 'rabbit-notice', index: neighbor.index, source: rabbit.index, ...position(neighbor) });
  }

  function stepHop(rabbit, hop) {
    const age = time - hop.at;
    const crouch = ease(age / crouchTime);
    const amplitude = hop.routine ? .61 : .91;
    rabbit.peek = .48 + .23 * crouch;
    rabbit.yaw = hop.yaw + hop.heading * crouch;
    if (age < crouchTime) {
      rabbit.crouch = crouch * amplitude;
      return;
    }
    if (!hop.started) {
      hop.started = true;
      hopEvent(rabbit, hop, 'start');
    }
    const duration = hop.duration ?? airborneTime;
    const progress = clamp((age - crouchTime) / duration);
    const travel = ease(progress);
    rabbit.x = mix(hop.from.x, hop.to.x, travel);
    rabbit.z = mix(hop.from.z, hop.to.z, travel);
    rabbit.air = Math.sin(Math.PI * progress) * amplitude;
    rabbit.y = groundAt(rabbit.x, rabbit.z) + .35 * amplitude * 4 * progress * (1 - progress);
    if (hop.feeding) rabbit.yaw += turn(rabbit.yaw,bearing(rabbit,carrot))*ease((progress-.55)/.45);
    if (progress < 1) return;

    const settled = ease((age - crouchTime - duration) / landingTime);
    rabbit.air = 0;
    rabbit.land = (1 - settled) * amplitude;
    // 落地后才让另一只竖耳，隔出的两条短跳路线始终互不穿过。
    if (!hop.landed) {
      hop.landed = true;
      if (hop.site !== undefined) rabbit.site = hop.site;
      hopEvent(rabbit, hop, 'land');
      if (!hop.routine && !race) reactToLanding(rabbit);
    }
    const calmHeading = hop.feeding ? bearing(rabbit, carrot) : rabbit.index === 0 ? .42 : -.34;
    const adjustment=turn(rabbit.yaw,calmHeading);
    rabbit.yaw += (hop.feeding?adjustment:clamp(adjustment,-.95,.95))*settled;
    if (settled === 1) hops[rabbit.index] = null;
  }

  function feedHop(rabbit, to, feeding) {
    const from = position(rabbit);
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    hops[rabbit.index] = { from, to, yaw: rabbit.yaw, heading: turn(rabbit.yaw, bearing(from, to)),
      at: time, routine: false, feeding, duration: .50 + length * .13 };
  }

  function biteTarget(rabbit) {
    const side = rabbit.index === 0 ? -1 : 1;
    const x = carrot.x + side * .11 - rabbit.x;
    const z = carrot.z - rabbit.z;
    const c = Math.cos(rabbit.yaw), s = Math.sin(rabbit.yaw);
    rabbit.biteX = (x * c - z * s) / rabbit.scale;
    rabbit.biteY = (.72 - rabbit.y) / rabbit.scale;
    rabbit.biteZ = (x * s + z * c) / rabbit.scale;
  }

  function stepRace() {
    if (!race) return;
    if (carrot.phase === 'waiting' && hops.every(hop => !hop)) {
      race.from = rabbits.map(position);
      if (race.cancelled) {
        carrot.phase = 'regrow';
        race.at = time;
      } else {
        carrot.phase = 'approach';
        race.at = time;
        for (const rabbit of rabbits) {
          const spot=feedingSpots[rabbit.index];
          const waitBack=rabbit.index===race.winner?0:rabbit.index===0?-.17:.17;
          feedHop(rabbit,{x:spot.x+waitBack,z:spot.z},true);
        }
        emit({ type: 'carrot-race-start', round: carrot.round, winner: race.winner, ...position(carrot) });
      }
    }
    if (carrot.phase === 'approach' && hops.every(hop => !hop)) {
      carrot.phase = race.cancelled ? 'return' : 'eat';
      race.at = time;
      if (race.cancelled) for (const rabbit of rabbits) feedHop(rabbit, race.from[rabbit.index], false);
      else emit({ type: 'carrot-eat', round: carrot.round, index: race.winner, ...position(carrot) });
    }
    if (carrot.phase === 'eat') {
      const age = time - race.at;
      const lean = ease(age / .32) * (1 - ease((age - 1.80) / .28));
      for (const rabbit of rabbits) {
        const first = rabbit.index === race.winner;
        rabbit.lean = lean * (first ? .92 : 1.10);
        rabbit.peek = .50 + (first ? .04 : .42) * lean;
        rabbit.watch = first ? 0 : lean;
        rabbit.nibble = first ? ease((age - .18) / .16) * (1 - ease((age - 1.65) / .25)) : 0;
        biteTarget(rabbit);
      }
      carrot.bite = ease((age - .43) / 1.17);
      if (race.cancelled || age >= 2.10) {
        race.completed = !race.cancelled;
        carrot.phase = 'return';
        race.at = time;
        for (const rabbit of rabbits) feedHop(rabbit, race.from[rabbit.index], false);
      }
    }
    if (carrot.phase === 'return' && hops.every(hop => !hop)) {
      carrot.phase = 'regrow';
      race.at = time;
      if (race.completed && !race.cancelled) {
        carrot.round++;
        carrot.winner = 1 - race.winner;
        emit({ type: 'carrot-race-complete', round: carrot.round, index: race.winner, ...position(carrot) });
      }
      nextHop[0] = daylight + 12;
      nextHop[1] = daylight + 16;
    }
    if (carrot.phase === 'regrow') {
      carrot.bite *= 1 - ease((time - race.at) / .65);
      if (time - race.at >= .65) {
        carrot.bite = 0;
        carrot.phase = 'ready';
        race = null;
      }
    }
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active && !night) {
    daylight += dt * idleClockRate;
      if (!race && hops.every(hop => !hop)) {
        const resting = rabbits.find(({ index }) => daylight >= nextHop[index]);
        if (resting) start(resting, true);
      }
    }
    for (const rabbit of rabbits) {
      const hop = hops[rabbit.index];
      rabbit.time = time + rabbit.index * 1.3;
      rabbit.crouch = rabbit.air = rabbit.land = rabbit.listen = rabbit.lean = rabbit.nibble = rabbit.watch = 0;
      rabbit.peek = .50;
      rabbit.sleep = clamp(rabbit.sleep + dt * (night && !hop ? 2.1 : -2.8));
      if (hop) {
        stepHop(rabbit, hop);
      } else if (heard[rabbit.index]) {
        const reply = heard[rabbit.index];
        const progress = clamp((time - reply.at) / .93);
        const attentive = Math.sin(Math.PI * progress);
        rabbit.listen = attentive * reply.direction;
        rabbit.peek += attentive * .31;
        if (progress === 1) heard[rabbit.index] = null;
      }
    }
    carrot.pulse = Math.exp(-Math.max(0,time - carrotTouchAt) * 4) * Math.sin((time - carrotTouchAt) * 12);
    if (!Number.isFinite(carrot.pulse)) carrot.pulse = 0;
    stepRace();
  }

  return { rabbits, carrot, get time() { return time; }, tap, tapCarrot, setNight, step };
}
