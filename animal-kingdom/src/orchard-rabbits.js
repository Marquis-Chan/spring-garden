import { clamp, ease, mix } from './state.js';

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
const position = ({ x, y, z }) => ({ x, y, z });
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function createOrchardRabbits(emit = () => {}, { groundAt = () => .38 } = {}) {
  const rabbits = lanes.map(([home], index) => ({ ...home, y: groundAt(home.x, home.z), index, scale: scales[index],
    yaw: index === 0 ? .42 : -.34, site: 0, time: 0, crouch: 0, air: 0, land: 0, peek: .50, listen: 0, sleep: 0 }));
  const hops = [null, null];
  const heard = [null, null];
  const nextHop = [4.3, 8.5];
  let time = 0;
  let daylight = 0;
  let night = false;

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
    } else {
      start(rabbit, false);
    }
  }

  function setNight(value) {
    night = Boolean(value);
    if (night) heard.fill(null);
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
    const progress = clamp((age - crouchTime) / airborneTime);
    const travel = ease(progress);
    rabbit.x = mix(hop.from.x, hop.to.x, travel);
    rabbit.z = mix(hop.from.z, hop.to.z, travel);
    rabbit.air = Math.sin(Math.PI * progress) * amplitude;
    rabbit.y = groundAt(rabbit.x, rabbit.z) + .35 * amplitude * 4 * progress * (1 - progress);
    if (progress < 1) return;

    const settled = ease((age - crouchTime - airborneTime) / landingTime);
    rabbit.air = 0;
    rabbit.land = (1 - settled) * amplitude;
    // 落地后才让另一只竖耳，隔出的两条短跳路线始终互不穿过。
    if (!hop.landed) {
      hop.landed = true;
      rabbit.site = hop.site;
      hopEvent(rabbit, hop, 'land');
      if (!hop.routine) reactToLanding(rabbit);
    }
    const calmHeading = rabbit.index === 0 ? .42 : -.34;
    rabbit.yaw += clamp(turn(rabbit.yaw, calmHeading), -.95, .95) * settled;
    if (settled === 1) hops[rabbit.index] = null;
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active && !night) {
      daylight += dt;
      if (hops.every(hop => !hop)) {
        const resting = rabbits.find(({ index }) => daylight >= nextHop[index]);
        if (resting) start(resting, true);
      }
    }
    for (const rabbit of rabbits) {
      const hop = hops[rabbit.index];
      rabbit.time = time + rabbit.index * 1.3;
      rabbit.crouch = rabbit.air = rabbit.land = rabbit.listen = 0;
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
  }

  return { rabbits, get time() { return time; }, tap, setNight, step };
}
