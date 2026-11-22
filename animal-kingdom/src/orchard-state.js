import {sleepStep,  clamp, idleClockRate, ease, idleDelay, mix } from './state.js';
import {createCorgiWalk} from './corgi-walk.js';

export const orchardPoints = {
  floor: .38,
  apples: [{ x: 3.35, y: 1.78, z: 5.43 }, { x: 4.13, y: 2.20, z: 5.40 }, { x: 4.83, y: 1.89, z: 5.48 }],
  basket: { x: 5.53, y: .38, z: 6.68 },
  dog: { x: 4.54, y: .38, z: 7.22 },
  cat: { x: 2.57, y: .38, z: 6.56 },
  butterfly: [{ x: 1.34, y: .76, z: 7.23 }, { x: 2.20, y: .86, z: 7.95 }, { x: 3.57, y: .75, z: 8.35 }],
  hive: { x: 5.82, y: 1.38, z: 5.22 },
  hiveIdle: { x: 6.11, y: 1.40, z: 5.43 },
  beeFlowers: [{ x: 6.32, y: .72, z: 6.29 }, { x: 6.75, y: .78, z: 6.67 }]
};

const appleGround = .55;
const appleRadius = .15;
const gravity = 12.8;
const basketActionDuration = .64;
const basketSlots = [[-.172, -.10], [0, .195], [.172, -.10]].map(([x, z]) => ({
  x: orchardPoints.basket.x + x, y: .63, z: orchardPoints.basket.z + z
}));
const sniffSpot = { x: orchardPoints.basket.x - .84, z: orchardPoints.basket.z - .15 };
const dogStroll = [{ x: 4.95, z: 7.55 }, { x: 4.23, z: 7.34 }, { x: 4.34, z: 6.93 }];
const catStroll = [{ x: 2.88, z: 6.21 }, { x: 3.14, z: 6.39 }, { x: 2.61, z: 6.73 }];

const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;

function insectAt(point, perch, visible) {
  return { ...point, yaw: .25, time: 0, flap: 0, flight: 0, perch, visible };
}

export function createOrchard(emit = () => {}) {
  const points = orchardPoints;
  const apples = points.apples.map((point, id) => ({ ...point, id, phase: 'branch', rotation: 0 }));
  const appleMoves = apples.map(() => null);
  const dog = { ...points.dog, yaw: -.15, time: 0, stride: 0, gait: 0, sniff: 0, bark: 0, sleep: 0 };
  const advanceDogFeet=createCorgiWalk(dog);
  const cat = { ...points.cat, yaw: -.09, time: 0, stride: 0, gait: 0, stretch: 0, look: 0, lookDown: 0, lookUp: 0, paw: 0, sleep: 0 };
  const butterfly = {...insectAt(points.butterfly[0], 0, true),sleep:0};
  const bees = [{ ...insectAt(points.hiveIdle, null, true), hiveIdle: true }, insectAt(points.hive, null, false)];
  const beeMoves = bees.map(() => null);
  let time = 0;
  let dayTime = 0;
  let night = false;
  let basketAt = -Infinity;
  let dogCallAt = -Infinity;
  let catCallAt = -Infinity;
  let sniffAt = -Infinity;
  let trackedApple = null;
  let catGlance = null;
  let butterflyMove = null;
  let beesOutside = false;
  const dogRoutine = { index: 0, next: 2.05, speed: 0 };
  const catRoutine = { index: 0, next: 2.95, speed: 0 };
  let nextButterfly = 3.8;
  const nextBee = [4.45, 5.3];

  function moveApple(apple, phase, to, duration, pursuable = false) {
    apple.phase = phase;
    appleMoves[apple.id] = { from: position(apple), to, at: time, duration, rotation: apple.rotation, pursuable };
  }

  function tapApple(index) {
    const apple = apples[index];
    if (apple?.phase !== 'branch') return;
    const landing = { x: apple.x + .13, y: appleGround, z: apple.z + .17 };
    moveApple(apple, 'drop', landing, Math.sqrt(2 * (apple.y - appleGround) / gravity), !night);
    emit({ type: 'apple-drop', id: apple.id, ...position(apple) });
  }

  function tapBasket() {
    if (time - basketAt < basketActionDuration) return;
    basketAt = time;
    // 倾篮只移开已经入篮的果子，仍在下落或滚动的果继续原路线。
    for (const apple of apples) {
      if (apple.phase === 'basket') moveApple(apple, 'recover', points.apples[apple.id], basketActionDuration);
    }
    emit({ type: 'basket-tip', ...points.basket });
  }

  function stepApple(apple) {
    const move = appleMoves[apple.id];
    if (!move) return;
    const progress = clamp((time - move.at) / move.duration);
    const travel = apple.phase === 'recover' ? ease(progress) : progress;
    apple.x = mix(move.from.x, move.to.x, travel);
    apple.z = mix(move.from.z, move.to.z, travel);
    apple.y = mix(move.from.y, move.to.y, apple.phase === 'drop' ? progress ** 2 : travel);
    if (apple.phase === 'roll') {
      // 接近篮沿时小幅弹起，越过篮沿后落回篮内自己的位置。
      const rim = clamp((progress - .74) / .26);
      apple.y = mix(appleGround, move.to.y, ease(rim)) + .28 * pulse(rim);
      apple.rotation = move.rotation + distance(move.from, apple) / appleRadius;
    } else if (apple.phase === 'recover') {
      apple.y += .62 * pulse(progress);
      apple.rotation = mix(move.rotation, 0, travel);
    } else {
      apple.rotation = move.rotation + progress * .84;
    }
    if (progress < 1) return;

    Object.assign(apple, move.to);
    if (apple.phase === 'drop') {
      const slot = basketSlots[apple.id];
      moveApple(apple, 'roll', slot, .70 + distance(apple, slot) * .19, move.pursuable && !night);
      emit({ type: 'apple-land', id: apple.id, ...position(apple) });
      return;
    }
    appleMoves[apple.id] = null;
    if (apple.phase === 'roll') {
      apple.phase = 'basket';
      emit({ type: 'apple-basket', id: apple.id, ...position(apple) });
    } else {
      apple.phase = 'branch';
      apple.rotation = 0;
    }
  }

  function tapDog() {
    if (night) {
      emit({ type: 'sleep', animal: 'dog' });
      return;
    }
    dogCallAt = time;
    emit({ type: 'dog-call' });
  }

  function tapCat() {
    if (night) {
      emit({ type: 'sleep', animal: 'cat' });
      return;
    }
    catCallAt = time;
    catGlance = null;
    emit({ type: 'cat-call' });
  }

  function chooseRollingApple() {
    let chosen = null;
    let nearest = 3.3;
    for (const apple of apples) {
      const gap = distance(apple, dog);
      if (apple.phase === 'roll' && appleMoves[apple.id].pursuable && gap < nearest) {
        chosen = apple;
        nearest = gap;
      }
    }
    return chosen;
  }

  function turnDog(target, dt) {
    dog.yaw += clamp(angleDelta(dog.yaw, bearing(dog, target)), -2.65*dt, 2.65*dt);
  }

  function walkDog(target, keepDistance, dt) {
    const gap = distance(dog, target);
    turnDog(target, dt);
    if (gap <= keepDistance) return 0;
    const alignment=Math.max(0,Math.cos(angleDelta(dog.yaw,bearing(dog,target))));
    const travel = Math.min(1.52 * dt * alignment**4, gap - keepDistance);
    const step = travel / gap;
    const from = position(dog);
    dog.x = mix(dog.x, target.x, step);
    dog.z = mix(dog.z, target.z, step);
    const rim = distance(dog, points.basket);
    if (rim > 0 && rim < .74) {
      dog.x = mix(points.basket.x, dog.x, .74 / rim);
      dog.z = mix(points.basket.z, dog.z, .74 / rim);
    }
    return distance(from, dog);
  }

  function stroll(animal, routine, route, speed, pause, dt, ready) {
    if (!ready || dayTime < routine.next) {
      routine.speed = 0;
      return 0;
    }
    const target = route[routine.index];
    const gap = distance(animal, target);
    if (gap < .025) {
      routine.index = (routine.index + 1) % route.length;
      routine.next = dayTime + idleDelay(pause);
      routine.speed = 0;
      return 0;
    }
    // 身体先朝脚下的路转，贴近落脚点再减速，步幅与走过的距离相连。
    const turn = angleDelta(animal.yaw, bearing(animal, target));
    animal.yaw += clamp(turn, -dt * 3.5, dt * 3.5);
    const desired = Math.abs(turn) < .34 ? Math.min(speed, Math.max(.065, gap * 2.8)) : 0;
    routine.speed = mix(routine.speed, desired, Math.min(1, dt * 8));
    const travel = Math.min(gap, routine.speed * dt);
    animal.x = mix(animal.x, target.x, travel / gap);
    animal.z = mix(animal.z, target.z, travel / gap);
    return travel;
  }

  function stepDog(dt, daily) {
    const previousYaw=dog.yaw;
    let travel = 0;
    dog.bark = night ? 0 : pulse((time - dogCallAt) / .52);
    dog.sniff = night ? 0 : pulse((time - sniffAt) / .90);
    if (!night && time - sniffAt >= .90) {
      if (trackedApple && trackedApple.phase !== 'roll' && trackedApple.phase !== 'basket') trackedApple = null;
      if (!trackedApple) {
        trackedApple = chooseRollingApple();
        if (trackedApple) emit({ type: 'dog-chase', id: trackedApple.id, ...position(dog) });
      }
      if (trackedApple?.phase === 'roll') travel = walkDog(trackedApple, .46, dt);
      if (trackedApple?.phase === 'basket') {
        if (distance(dog, sniffSpot) < .09) {
          sniffAt = time;
          emit({ type: 'dog-sniff', id: trackedApple.id, ...position(dog) });
          trackedApple = null;
        } else {
          travel = walkDog(sniffSpot, .04, dt);
        }
      }
    }
    if (dog.sniff) turnDog(points.basket, dt);
    const canStroll = daily && !trackedApple && time - sniffAt >= .90 && time - dogCallAt > .62;
    const wandering = stroll(dog, dogRoutine, dogStroll, .66, 1.8, dt, canStroll);
    travel += wandering;
    if (daily && dogRoutine.index === 1 && dayTime < dogRoutine.next && canStroll) {
      const age = dayTime - (dogRoutine.next - idleDelay(1.8));
      dog.sniff = pulse((age - .12) / 1.25) * .78;
    }
    advanceDogFeet(dt);
    const gait = dt ? clamp((travel+.30*Math.abs(dog.yaw-previousYaw)) / (dt * .66)) : 0;
    dog.gait = mix(dog.gait, gait, Math.min(1, dt * 11));
    dog.sleep = sleepStep(dog.sleep, night, dt);
  }

  function nearbyRollingApple() {
    return apples.find(apple => apple.phase === 'roll' && appleMoves[apple.id]?.pursuable
      && !appleMoves[apple.id].catSaw && distance(cat, apple) < 1.48);
  }

  function stepCat(dt, daily) {
    const age = time - catCallAt;
    cat.stretch = night ? 0 : pulse(age / 1.34);
    cat.paw = night ? 0 : pulse((age - .14) / 1.04);
    if (night || !daily || (catGlance && time > catGlance.until)) catGlance = null;
    if (daily && !catGlance && age > 1.34) {
      const apple = nearbyRollingApple();
      if (apple) {
        // 眼睛追过身旁的一颗果，猫留在树根外侧，不踏进落果和柯基的路线。
        appleMoves[apple.id].catSaw = true;
        catGlance = { apple, until: time + .88, point: position(apple) };
        emit({ type: 'cat-apple-look', id: apple.id, ...position(apple) });
      }
    }
    if (catGlance?.apple.phase === 'roll' && distance(cat, catGlance.apple) < 1.75) catGlance.point = position(catGlance.apple);
    const sight = butterflyMove?.manual ? 2.15 : .90;
    const flyingNearby = !night && butterfly.flight > 0 && distance(cat, butterfly) < sight;
    const target = catGlance?.point ?? (flyingNearby ? butterfly : null);
    const moved = stroll(cat, catRoutine, catStroll, .36, 1.9, dt, daily && !target && age > 1.34);
    if (catGlance) {
      const turn = angleDelta(cat.yaw, bearing(cat, catGlance.point));
      if (Math.abs(turn) > .42) cat.yaw += clamp(turn, -dt * 4.6, dt * 4.6);
    }
    const look = target ? clamp(angleDelta(cat.yaw, bearing(cat, target)) / 1.22, -1, 1) : 0;
    cat.look = mix(cat.look, look, Math.min(1, dt * 10));
    cat.lookDown = mix(cat.lookDown, Number(Boolean(catGlance)), Math.min(1, dt * 9));
    const elevation = flyingNearby && !catGlance ? clamp((butterfly.y - cat.y - .48) / .62) : 0;
    cat.lookUp = mix(cat.lookUp, elevation, Math.min(1, dt * 9));
    cat.stride += moved * (2 * Math.PI / .40);
    cat.gait = mix(cat.gait, dt ? clamp(moved / (dt * .36)) : 0, Math.min(1, dt * 11));
    if (Math.abs(cat.look) < .001) cat.look = 0;
    cat.sleep = sleepStep(cat.sleep, night, dt);
  }

  function flight(insect, to, perch, duration, height, delay = 0, visible = true) {
    return { from: position(insect), to, perch, duration, height, at: time + delay, visible };
  }

  function tapButterfly() {
    if (night) {
      emit({ type: 'sleep', animal: 'butterfly' });
      return;
    }
    moveButterfly(true);
  }

  function moveButterfly(manual = false) {
    const index = ((butterflyMove?.perch ?? butterfly.perch) + 1) % points.butterfly.length;
    const to = points.butterfly[index];
    const move = flight(butterfly, to, index, .80, manual ? .66 : .34);
    butterflyMove = { ...move, manual };
    // 回到左边花冠时先从外侧绕开猫尾；过两朵前景花时仍能被猫看见。
    if (index === 0) butterflyMove.via = { x: 1.39, z: 8.32 };
    if (manual && move.from.z > 7.65 && to.z > 7.65) {
      butterflyMove.via = { x: mix(move.from.x, to.x, .42), z: Math.min(move.from.z, to.z) - .51 };
    }
    butterfly.flight = .24;
    butterfly.perch = null;
    nextButterfly = dayTime + idleDelay(4.2);
  }

  function guideBees(outside, skyChanged=false) {
    beesOutside = outside;
    for (const [index, bee] of bees.entries()) {
      const hiveIdle = !outside && !night && index === 0;
      const visible = outside || hiveIdle;
      if (!visible && !bee.visible) {
        beeMoves[index] = null;
        continue;
      }
      const target = outside ? points.beeFlowers[index] : hiveIdle ? points.hiveIdle : points.hive;
      const waking = hiveIdle && !bee.visible;
      bee.hiveIdle = false;
      beeMoves[index] = flight(bee, target, outside ? index : null, skyChanged ? (waking?1.8:2.4+index*.15) : waking ? .51 : .78 + index * .10,
        waking ? .14 : .32 + index * .18, index * .12, visible);
      // 赴花和回巢都让第二只蜜蜂绕右侧，错开两只在巢口前的飞行路线。
      if (index === 1) beeMoves[index].via = {
        x: Math.max(bee.x, target.x) + .56,
        z: outside ? mix(bee.z, target.z, .52) + .12 : target.z - .53
      };
      nextBee[index] = dayTime + 2.8 + index * .65;
    }
  }

  function tapHive() {
    if(night){
      if(bees.every(bee=>!bee.visible))emit({type:'sleep',animal:'hive'});
      return;
    }
    guideBees(!beesOutside);
    if (beesOutside) emit({ type: 'bee-flight' });
  }

  function stepInsect(insect, move, dt, frequency) {
    insect.time = time;
    insect.flap = insect.visible ? .18 * Math.sin(time * frequency * .45) : 0;
    if (!move || time < move.at) return move;
    const progress = clamp((time - move.at) / move.duration);
    const travel = ease(progress);
    insect.visible = true;
    insect.perch = null;
    insect.flight = .19 + .81 * pulse(progress);
    insect.flap = Math.sin(time * frequency) * insect.flight;
    const last = position(insect);
    const path = axis => move.via
      ? mix(mix(move.from[axis], move.via[axis], travel), mix(move.via[axis], move.to[axis], travel), travel)
      : mix(move.from[axis], move.to[axis], travel);
    insect.x = path('x');
    insect.y = mix(move.from.y, move.to.y, travel) + move.height * pulse(progress);
    insect.z = path('z');
    if (move.loop) {
      // 从花心起飞，绕同一朵花一小圈，再回到原来的花心落稳。
      const angle = travel * 2 * Math.PI;
      insect.x += Math.sin(angle) * .20;
      insect.z += (1 - Math.cos(angle)) * .16 * move.loop;
    }
    if (distance(last, insect) > .000001) insect.yaw += angleDelta(insect.yaw, bearing(last, insect)) * Math.min(1, dt * 13);
    if (progress < 1) return move;

    Object.assign(insect, move.to);
    insect.visible = move.visible;
    insect.perch = move.perch;
    insect.flight = insect.flap = 0;
    return null;
  }

  function setNight(value) {
    const next = Boolean(value);
    if (next === night) return;
    night = next;
    guideBees(false,true);
    if (!night) {
      dogRoutine.next = dayTime + 1.2;
      catRoutine.next = dayTime + 1.9;
      nextButterfly = dayTime + 2.7;
      return;
    }

    // 休息只中止追嗅和出巢，已脱枝的水果仍会落地并进篮。
    trackedApple = null;
    catGlance = null;
    dogCallAt = catCallAt = sniffAt = -Infinity;
    for (const move of appleMoves) if (move) move.pursuable = false;
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    const daily = active && !night;
    if (daily) dayTime += dt * idleClockRate;
    dog.time = cat.time = time;
    for (const apple of apples) stepApple(apple);
    if (daily && !butterflyMove && dayTime >= nextButterfly) moveButterfly();
    // 在途的蝴蝶照常落花。停在花上后保留姿势，不再推进扇翅时间。
    butterfly.sleep=sleepStep(butterfly.sleep,night&&!butterflyMove,dt);
    butterflyMove=stepInsect(butterfly,butterflyMove,dt,44);
    butterfly.flap=butterfly.sleep===1?0:butterfly.flap*(1-butterfly.sleep);
    for (const [index, bee] of bees.entries()) {
      if (daily && bee.visible && !beeMoves[index] && dayTime >= nextBee[index]) {
        if (beesOutside) {
          beeMoves[index] = { ...flight(bee, points.beeFlowers[index], index, .98, .27 + .10 * index), loop: index ? 1 : -1 };
        } else if (index === 0) {
          const toFlower = distance(bee, points.hiveIdle) < .08;
          beeMoves[index] = flight(bee, toFlower ? points.beeFlowers[0] : points.hiveIdle,
            toFlower ? 0 : null, .93, .29);
        }
        nextBee[index] = dayTime + idleDelay(2.9 + index * .48);
      }
      beeMoves[index] = stepInsect(bee, beeMoves[index], dt, 72);
      bee.hiveIdle = !night && !beesOutside && index === 0 && bee.visible && !beeMoves[index] && bee.perch === null;
    }
    stepDog(dt, daily);
    stepCat(dt, daily);
  }

  return {
    apples, dog, cat, butterfly, bees,
    get time() { return time; },
    get basketCount() { return apples.filter(apple => apple.phase === 'basket').length; },
    get basketTilt() { return pulse((time - basketAt) / basketActionDuration); },
    step, setNight, tapApple, tapDog, tapCat, tapButterfly, tapHive, tapBasket
  };
}
