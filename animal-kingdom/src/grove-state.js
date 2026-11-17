import { clamp, ease, idleDelay, mix } from './state.js';

export const grovePoints = {
  grasses: [{ x: 8.6, y: .38, z: 1.25 }, { x: 12.2, y: .38, z: 1.5 }],
  clearing: { x: 10.55, y: .38, z: .95 },
  branches: [{ x: 10.1, y: 2.25, z: -.95 }, { x: 12.15, y: 2.4, z: -1.38 }],
  peck: { x: 9.78, y: .38, z: .89 },
  seed: { x: 9.38, y: .38, z: 1.012 }
};

const windup = .20;
const hopDuration = .54;
const settleDuration = .18;
const flightDuration = .66;
const coveredPeek = .52;
const perchHeadings = [.52, -.27];

const position = ({ x, y, z }) => ({ x, y, z });
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;

export function createGrove(emit = () => {}) {
  const { grasses, clearing, branches, peck } = grovePoints;
  const rabbit = {
    ...grasses[0], yaw: .35, cover: 0, time: 0,
    crouch: 0, air: 0, land: 0, peek: coveredPeek, listen: 0
  };
  const bird = {
    ...branches[0], yaw: perchHeadings[0], perch: 0, time: 0,
    flap: 0, flight: 0, peck: 0, look: 0, sleep: 0
  };
  let time = 0;
  let night = false;
  let rabbitMove = null;
  let birdMove = null;
  let queuedGrass = null;
  let duckAt = -Infinity;
  let peckAt = -Infinity;
  let contactAt = -Infinity;
  let pendingPeck = false;
  let lookAt = -Infinity;
  let listenPoint = grovePoints.seed;
  let pendingListen = null;
  let routineTime = 0;
  let nextRabbit = 1.82;
  let nextBird = 6.25;
  let rabbitSide = 1;
  let queuedBird = false;

  function stirGrass(index, strength, source) {
    const { x, z } = grasses[index];
    emit({ type: 'grass', index, x, z, strength, source });
  }

  function startHop(cover, grassIndex, routine = false) {
    const from = position(rabbit);
    const home = cover === null ? clearing : grasses[cover];
    const to = routine ? {
      ...home, x: home.x + (rabbitSide > 0 ? .29 : -.48), z: home.z + (rabbitSide > 0 ? .57 : .18)
    } : home;
    rabbitMove = { cover, grassIndex, from, to, at: time, started: false, landed: false, routine };
    if (!routine && rabbit.cover !== null) {
      emit({ type: 'peek', index: rabbit.cover, x: from.x, z: from.z });
    }
  }

  function leaveOrEnterGrass(index) {
    const destination = index === rabbit.cover ? null : index;
    startHop(destination, index);
  }

  function tapGrass(index) {
    if (index !== 0 && index !== 1) return;
    stirGrass(index, 1, 'tap');
    nextRabbit = routineTime + 5.5;
    if (rabbitMove) {
      queuedGrass = index === rabbitMove.grassIndex ? null : index;
      return;
    }
    leaveOrEnterGrass(index);
  }

  function tapRabbit() {
    nextRabbit = routineTime + 5.5;
    if (rabbitMove) {
      if (rabbitMove.routine) queuedGrass = rabbit.cover ?? 1;
      return;
    }
    if (rabbit.cover === null) {
      startHop(1, null);
      return;
    }
    duckAt = time;
    stirGrass(rabbit.cover, .6, 'tap');
  }

  function startFlight(perch, reason) {
    const from = position(bird);
    const to = perch === null ? peck : branches[perch];
    const heading = perchHeadings[perch];
    // 利用枝后一个小弧线调整落脚方向，脚爪抓稳后就不用在枝上滑着转身。
    const approach = heading === undefined ? null : {
      x: to.x - Math.sin(heading) * .74,
      z: to.z - Math.cos(heading) * .74
    };
    birdMove = { perch, reason, from, to, approach, at: time };
    pendingPeck = false;
    bird.sleep = 0;
    bird.flight = .18;
    bird.flap = .55;
    emit({ type: 'flight', phase: 'start', reason, ...from });
  }

  function tapBird() {
    if (night) {
      if (!birdMove && bird.perch !== null) emit({ type: 'sleep', ...position(bird) });
      return;
    }
    lookAt = time;
    nextBird = routineTime + 7;
    if (birdMove?.reason === 'routine') queuedBird = true;
    if (!birdMove) startFlight(bird.perch === null ? 0 : null, 'tap');
  }

  // 松果真的到附近时才拨一次兔耳，远处的松鼠仍是独立活动。
  function listenNear(point) {
    if (distance(rabbit, point) > 2.08 || time - contactAt < 1.1) return false;
    if (rabbitMove) {
      pendingListen = { ...point, until: time + .68 };
      return true;
    }
    listenPoint = position(point);
    contactAt = time;
    return true;
  }

  function setNight(value) {
    const next = Boolean(value);
    if (next === night) return;
    night = next;
    if (!night) return;

    // 入夜中断未完成的接触。已经飞出的鸟保留轨迹，落地后安静归枝。
    pendingPeck = false;
    queuedBird = false;
    peckAt = lookAt = -Infinity;
    if (birdMove?.perch === null) birdMove.skipPeck = true;
    if (!birdMove && bird.perch === null) startFlight(0, 'night');
  }

  function stepRabbit(dt) {
    rabbit.crouch = rabbit.air = rabbit.land = 0;
    rabbit.peek = rabbit.cover === null ? 1 : coveredPeek;
    const listening = pulse((time - contactAt) / 1.1);
    const direction = clamp(turn(rabbit.yaw, bearing(rabbit, listenPoint)) / 1.35, -1, 1);
    rabbit.listen = listening ? listening * direction : 0;

    if (!rabbitMove) {
      if(listening&&rabbit.cover===null){
        rabbit.yaw+=turn(rabbit.yaw,bearing(rabbit,listenPoint))*Math.min(1,dt*3.6*listening);
      }
      if (rabbit.cover !== null && time - duckAt < .45) {
        const duck = pulse((time - duckAt) / .45);
        rabbit.crouch = .4 * duck;
        rabbit.peek = coveredPeek - .28 * duck;
      }
      return;
    }

    const move = rabbitMove;
    const amplitude = move.routine ? .49 : 1;
    const age = time - move.at;
    const progress = clamp((age - windup) / hopDuration);
    const travel = ease(progress);
    const face = bearing(move.from, move.to);
    rabbit.yaw += turn(rabbit.yaw, face) * Math.min(1, dt * 13);

    if (age < windup) {
      rabbit.crouch = ease(age / windup) * amplitude;
      rabbit.peek = mix(rabbit.peek, 1, ease(age / windup));
      return;
    }

    if (!move.started) {
      move.started = true;
      emit({ type: 'hop', phase: 'start', routine: move.routine, ...move.from });
    }
    rabbit.peek = move.cover === null ? 1 : mix(1, coveredPeek, ease((progress - .80) / .20));
    rabbit.air = pulse(progress) * amplitude;
    rabbit.x = mix(move.from.x, move.to.x, travel);
    rabbit.z = mix(move.from.z, move.to.z, travel);
    rabbit.y = mix(move.from.y, move.to.y, travel) + .87 * amplitude * 4 * progress * (1 - progress);

    // 只在兔已离地并经过低枝附近时惊动鸟，避免点草直接触发另一段表演。
    if (!move.routine && !night && !birdMove && bird.perch === 0 && progress > .24 && progress < .95 && distance(rabbit, branches[0]) < 2.04) {
      startFlight(1, 'rabbit');
    }

    if (progress < 1) return;
    const rest = ease((age - windup - hopDuration) / settleDuration);
    rabbit.land = (1 - rest) * amplitude;
    if (!move.landed) {
      move.landed = true;
      Object.assign(rabbit, move.to);
      rabbit.cover = move.cover;
      emit({ type: 'hop', phase: 'land', routine: move.routine, ...move.to });
    }
    if (rest < 1) return;
    rabbitMove = null;
    if (pendingListen) {
      const point = pendingListen;
      pendingListen = null;
      if (time <= point.until) listenNear(point);
    }
    if (queuedGrass !== null) {
      const next = queuedGrass;
      queuedGrass = null;
      leaveOrEnterGrass(next);
    }
  }

  function stepBird(dt) {
    bird.look = pulse((time - lookAt) / .46);
    bird.flap = bird.flight = bird.peck = 0;
    if (!birdMove) {
      if (bird.perch !== null) bird.sleep = clamp(bird.sleep + (night ? dt / .50 : -dt / .36));
      if (bird.perch === null) {
        bird.yaw += turn(bird.yaw, bearing(bird, grasses[0])) * Math.min(1, dt * 12);
        const age=time-peckAt;
        bird.peck=.53*pulse(age/.56);
        // 比落地晚半个俯身周期，鸟嘴到达穗头时才让它弯。
        if(pendingPeck&&age>=.28){
          pendingPeck=false;contactAt=time;listenPoint=grovePoints.seed;
          emit({type:'peck',index:0,...grovePoints.seed});
          stirGrass(0,.82,'peck');
        }
      }
      return;
    }

    const move = birdMove;
    const progress = clamp((time - move.at) / flightDuration);
    const travel = ease(progress);
    const { from, to, approach } = move;
    let heading = bearing(from, to);
    if (approach) {
      const a = mix(from.x, approach.x, travel), b = mix(approach.x, to.x, travel);
      const c = mix(from.z, approach.z, travel), d = mix(approach.z, to.z, travel);
      bird.x = mix(a, b, travel);
      bird.z = mix(c, d, travel);
      heading = Math.atan2(b - a, d - c);
    } else {
      bird.x = mix(from.x, to.x, travel);
      bird.z = mix(from.z, to.z, travel);
    }
    bird.yaw += turn(bird.yaw, heading) * Math.min(1, dt * (approach ? 13 + 14 * travel : 13));
    bird.y = mix(move.from.y, move.to.y, travel) + .48 * 4 * progress * (1 - progress);
    bird.flight = Math.min(1, Math.sin(Math.PI * progress) * 1.4 + .16);
    bird.flap = Math.sin(progress * Math.PI * 8.5) * bird.flight;
    if (progress < 1) return;

    Object.assign(bird, move.to);
    bird.perch = move.perch;
    bird.flap = bird.flight = 0;
    birdMove = null;
    emit({ type: 'flight', phase: 'land', reason: move.reason, ...move.to });
    if (queuedBird && !night) {
      queuedBird = false;
      startFlight(null, 'tap');
      return;
    }
    if (bird.perch === null) {
      if (night || move.skipPeck) {
        startFlight(0, 'night');
      } else {
        peckAt = time;
        pendingPeck = true;
      }
    }
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    rabbit.time = bird.time = time;
    if (active) {
      routineTime += dt;
      if (!rabbitMove && routineTime >= nextRabbit && time - contactAt > 1.1 && time - duckAt > .5) {
        startHop(rabbit.cover, null, true);
        rabbitSide *= -1;
        nextRabbit = routineTime + idleDelay(7.6);
      }
      if (!night && !birdMove && !pendingPeck && routineTime >= nextBird) {
        startFlight(bird.perch === 0 ? 1 : 0, 'routine');
        nextBird = routineTime + idleDelay(10.3);
      }
    }
    stepRabbit(dt);
    stepBird(dt);
  }

  return { rabbit, bird, get time() { return time; }, step, setNight, tapGrass, tapRabbit, tapBird, listenNear };
}
