import { clamp, idleClockRate, ease, idleDelay, mix } from './state.js';

export const rainPoints = {
  monkeyBranches: [{ x: 34.76, y: 1.42, z: .14 }, { x: 35.61, y: 1.64, z: -.53 }],
  bananas: [{ x: 34.22, y: 1.86, z: .54 }, { x: 35.81, y: 2.08, z: -.10 }],
  dropBanana: { x: 35.16, y: 1.94, z: .68 },
  bananaLanding: { x: 35.28, z: 1.48 },
  groundMonkey: { x: 34.64, z: 2.22 },
  sloth: { x: 37.02, y: 1.35, z: .55 },
  slothSupport: { y: 1.81, z: .50, halfWidth: .64 },
  slothBough: { x: 36.39, y: 1.97, z: .64 },
  leaf: { x: 37.46, y: 1.12, z: .95 },
  toucanBranches: [{ x: 38.86, y: 2.05, z: -.72 }, { x: 39.47, y: 2.55, z: -1.62 }],
  berry: { x: 38.31, y: 2.36, z: -.21 }
};

const slothIdleTime = 12 / idleClockRate;
const slothNapTime = 3;
const monkeyWatchRange = 1.95;
const toucanWatchRange = 2.46;
const berryReleaseAt = .41;
const berryCatchAt = .96;
const groundMonkeyScale = .87;
const bananaClearance = .061;
const groundMonkeySidePath = {x:34.32,z:2.67};
const slothCrawlStops = [36.82, 37.18];
const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const pulse = progress => progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) : 0;
const valid = (index, list) => Number.isInteger(index) && index >= 0 && index < list.length;

export function groundMonkeyFoot(gait, stride, side, fore = false) {
  const phase = stride + (side < 0 ? 0 : Math.PI) + (fore ? Math.PI + .24 : 0);
  return { x: side * (fore ? .159 : .122),
    z: (fore ? .25 : -.054) + .143 * gait * Math.cos(phase),
    lift: .086 * gait * Math.max(0, Math.sin(phase)) };
}

function localPoint(actor, point, prefix) {
  const dx = point.x - actor.x;
  const dz = point.z - actor.z;
  const c = Math.cos(actor.yaw);
  const s = Math.sin(actor.yaw);
  actor[prefix + 'X'] = dx * c - dz * s;
  actor[prefix + 'Y'] = point.y - actor.y;
  actor[prefix + 'Z'] = dx * s + dz * c;
}

export function createRainforest(emit = () => {}, { groundAt = () => .38 } = {}) {
  const points = rainPoints;
  const monkey = {
    ...points.monkeyBranches[0], yaw: -.22, time: 0, site: 0, crouch: 0, air: 0, flight: 0, land: 0,
    leap: -1, landingSite: 0,
    tailGrip: 1, reach: 0, reachX: 0, reachY: 0, reachZ: 0,
    hold: 0, bring: 0, chew: 0, sleep: 0, swing: 0, look: 0, lookDown: 0, call: 0
  };
  const home = points.groundMonkey;
  const groundMonkey = { ...home, y: groundAt(home.x, home.z), yaw: .24, time: 0, gait: 0, stride: 0,
    reach: 0, reachX: 0, reachY: 0, reachZ: 0, hold: 0, bring: 0, chew: 0, crouch: 0, sleep: 0,
    call: 0, look: 0, alert: 0, tailGrip: 0 };
  const sloth = { ...points.sloth, yaw: .05, time: 0, reach: 0, reachX: 0, reachY: 0, reachZ: 0,
    gripX: 0, gripY: 0, gripZ: 0, hold: 0, bring: 0, chew: 0, sleep: 0, look: 0,
    stretch: 0, sway: 0, boughShake: 0, watch: 0, crawl: -1, crawlSpan: 0, fruitLean: 0 };
  const toucan = { ...points.toucanBranches[0], yaw: -.93, time: 0, site: 0, flight: 0, flap: 0, land: 0,
    reach: 0, targetX: 0, targetY: 0, targetZ: 0, hold: 0, beakOpen: 0, look: 0, call: 0, sleep: 0 };
  const bananas = points.bananas.map((point, id) => ({ ...point, id, phase: 'branch' }));
  const dropBanana = { ...points.dropBanana, id: bananas.length, phase: 'branch', rotation: 0 };
  const leaf = { ...points.leaf, id: 0, phase: 'branch' };
  const berry = { ...points.berry, id: 0, phase: 'branch', owner: null, tossY: 0, shiver: 0 };
  const bananaReady = bananas.map(() => Infinity);
  let leafReady = Infinity;
  let berryReady = Infinity;
  let time = 0;
  let routineTime = 0;
  let night = false;
  let monkeyMove = null;
  let monkeyPlan = null;
  let monkeyFood = null;
  let monkeyPluckAt = null;
  let monkeyLandAt = -Infinity;
  let monkeyCallAt = -Infinity;
  let monkeyNext = 2.46;
  let monkeyVoicePending = false;
  let groundNotice = null;
  let monkeyLookAt = -Infinity;
  let monkeyLookPoint = null;
  let bananaDropAt = null;
  let bananaLandedAt = Infinity;
  let dropBananaReady = Infinity;
  let groundMove = null;
  let groundFoodAt = null;
  let groundRevealYaw = null;
  let groundReturnAt = Infinity;
  let groundCallAt = -Infinity;
  let groundNext = .86;
  let groundSide = 0;
  let slothFood = null;
  let slothGesture = null;
  let slothIdleAt = null;
  let slothNapUntil = null;
  let slothTouchAt = -Infinity;
  let slothWatchAt = -Infinity;
  let slothWatchDirection = 0;
  let slothCrawl = null;
  let slothCrawlIndex = 0;
  let slothCrawlAt = 2.75;
  let slothPending = null;
  let toucanMove = null;
  let toucanLandAt = -Infinity;
  let toucanCallAt = -Infinity;
  let toucanWatchAt = -Infinity;
  let toucanNext = 4.65;
  let toucanPending = false;
  let berryQueued = false;
  let berryTouchedAt = -Infinity;
  let berryRace = null;

  function planMonkey(index, action, quiet = false) {
    if (night) {
      if (!monkeyMove && !monkeyFood && monkeyPluckAt === null) emit({ type: 'sleep', animal: 'monkey' });
      return;
    }
    if (monkeyFood?.index === index && action === 'eat') return;
    monkeyPlan = { index, action, quiet };
    monkeyNext = routineTime + (quiet ? idleDelay(4.18) : 4.18);
    startMonkeyPlan();
  }

  function startMonkeyPlan() {
    if (!monkeyPlan || monkeyMove || monkeyFood || monkeyPluckAt !== null || night) return;
    const plan = monkeyPlan;
    if (plan.index !== monkey.site) {
      monkeyMove = { at: time, from: position(monkey), index: plan.index, jumped: false, quiet: plan.quiet };
      if (!plan.action) monkeyPlan = null;
      return;
    }
    monkeyPlan = null;
    if (plan.action === 'eat' && bananas[plan.index].phase === 'branch') {
      monkeyFood = { at: time, index: plan.index };
    }
    if (plan.action === 'drop' && dropBanana.phase === 'branch') monkeyPluckAt = time;
  }

  function tapMonkey() {
    if (!night && monkeyMove?.quiet) {
      const landing = monkeyMove.index;
      monkeyVoicePending = true;
      planMonkey(bananas[landing].phase === 'branch' ? landing : 1 - landing, 'eat');
      return;
    }
    if (!night && (monkeyMove || monkeyFood || monkeyPluckAt !== null)) return;
    if (!night) {
      monkeyCallAt = time;
      emit({ type: 'monkey-call' });
    }
    const other = 1 - monkey.site;
    const target = bananas[monkey.site].phase === 'branch' ? monkey.site : other;
    planMonkey(target, 'eat');
  }

  function tapBanana(index) {
    if (!valid(index, bananas)) return;
    if (night || bananas[index].phase === 'branch') {
      if (!night) emit({ type: 'banana-touch', id: index, ...points.bananas[index] });
      planMonkey(index, 'eat');
    }
  }

  function tapMonkeyBough(index) {
    if (!valid(index, points.monkeyBranches)) return;
    if (!night) emit({ type: 'monkey-bough', index, ...points.monkeyBranches[index] });
    planMonkey(index, null);
  }

  function tapGroundMonkey() {
    if (night) {
      if (groundFoodAt === null) emit({ type: 'sleep', animal: 'groundMonkey' });
      return;
    }
    if (groundMove?.action === 'routine') groundMove = null;
    groundNext = routineTime + 3.65;
    if (groundMove || groundFoodAt !== null || time - groundCallAt < .78) return;
    if (dropBanana.phase === 'ground') {
      startGroundPickup();
      return;
    }
    groundCallAt = time;
    emit({ type: 'monkey-call', animal: 'groundMonkey', ...position(groundMonkey) });
  }

  function tapDropBanana() {
    if (dropBanana.phase === 'ground') {
      if (night) tapGroundMonkey();
      else startGroundPickup();
      return;
    }
    if (dropBanana.phase !== 'branch' || monkeyPluckAt !== null || monkeyPlan?.action === 'drop') return;
    if (!night) emit({ type: 'drop-banana-touch', id: dropBanana.id, ...position(dropBanana) });
    planMonkey(0, 'drop');
  }

  function eat(actor, item, started, pickAt, mouthAt, doneAt, prefix, initialPhase = 'branch') {
    const age = time - started;
    actor.reach = ease(age / pickAt) * (1 - ease((age - pickAt - .028) / .20));
    actor.bring = ease((age - pickAt - .045) / (mouthAt - pickAt - .045)) * (1 - ease((age - mouthAt - .04) / .23));
    if (age >= pickAt && item.phase === initialPhase) {
      actor.reach = 1;
      item.phase = 'held';
      actor.hold = 1;
      emit({ type: prefix + '-pick', id: item.id, ...position(item) });
    }
    if (age >= mouthAt && item.phase === 'held') {
      actor.bring = 1;
      item.phase = 'mouth';
      emit({ type: prefix + '-mouth', id: item.id });
    }
    actor.hold = Number(item.phase === 'held');
    actor.eatProgress = item.phase === 'mouth' ? clamp((age - mouthAt) / (doneAt - mouthAt)) : 0;
    actor.chew = pulse(actor.eatProgress);
    if (age < doneAt) return false;
    item.phase = 'spent';
    return true;
  }

  function nudgeBanana() {
    const age = time - monkeyPluckAt;
    monkey.reach = ease(age / .41) * (1 - ease((age - .43) / .25));
    if (age >= .41 && dropBanana.phase === 'branch') {
      monkey.reach = 1;
      bananaDropAt = time;
      dropBanana.phase = 'drop';
      emit({ type: 'drop-banana-drop', id: dropBanana.id, ...position(dropBanana) });
    }
    if (age >= .69) {
      monkeyPluckAt = null;
      startMonkeyPlan();
    }
  }

  function stepMonkey(dt, active) {
    monkey.reach = monkey.hold = monkey.bring = monkey.chew = 0;
    monkey.crouch = monkey.air = monkey.flight = monkey.swing = 0;
    monkey.leap = -1;
    monkey.tailGrip = 1;
    monkey.call = night ? 0 : pulse((time - monkeyCallAt) / .86);
    monkey.look = monkey.call * .4;
    monkey.lookDown = 0;
    for (const banana of bananas) {
      if (banana.phase === 'spent' && time >= bananaReady[banana.id]) banana.phase = 'branch';
    }
    if (active && !night && !monkeyMove && !monkeyFood && monkeyPluckAt === null && !monkeyPlan && !groundNotice
      && time - monkeyLookAt > 1.15 && routineTime >= monkeyNext) planMonkey(1-monkey.site,null,true);
    let heading = -.22;
    if (monkeyMove) {
      const move = monkeyMove;
      const to = points.monkeyBranches[move.index];
      const age = time - move.at;
      const progress = clamp((age - .14) / .67);
      const travel = ease(progress);
      const arc = pulse(progress);
      monkey.crouch = ease(age / .12) * (1 - ease((age - .14) / .10));
      monkey.x = mix(move.from.x, to.x, travel);
      monkey.y = mix(move.from.y, to.y, travel) + .43 * arc;
      // 从树冠前方跳，脚先离开出发枝，落到下一根枝再伸手摘果。
      monkey.z = mix(move.from.z, to.z, travel) + .40 * arc * arc;
      monkey.leap = progress;
      monkey.landingSite = move.index;
      monkey.air = monkey.flight = monkey.swing = arc;
      if (!move.jumped && age >= .14) {
        move.jumped = true;
        monkey.tailGrip = 0;
        if (!move.quiet) emit({ type: 'monkey-takeoff', index: move.index, ...move.from });
      }
      if (move.jumped && progress < 1) monkey.tailGrip = 0;
      heading = -.22 + angleDelta(-.22, bearing(move.from, to))
        * ease((progress + .08) / .28) * (1 - ease((progress - .39) / .52));
      if (progress === 1) {
        Object.assign(monkey, to);
        monkey.site = move.index;
        monkey.leap = -1;
        monkeyMove = null;
        monkeyLandAt = time;
        if (!move.quiet) {
          emit({ type: 'monkey-land', index: move.index, ...to });
          slothWatchesMonkey(to);
        }
        if (monkeyVoicePending && !night) {
          monkeyVoicePending = false;
          monkeyCallAt = time;
          emit({ type:'monkey-call' });
        }
        startMonkeyPlan();
      }
    }
    if (monkeyPluckAt !== null) {
      const origin = points.dropBanana;
      heading = bearing(monkey, origin);
      monkey.yaw += angleDelta(monkey.yaw, heading) * Math.min(1, dt * 14);
      localPoint(monkey, origin, 'reach');
      nudgeBanana();
    } else if (monkeyFood) {
      const banana = bananas[monkeyFood.index];
      heading = bearing(monkey, banana);
      monkey.yaw += angleDelta(monkey.yaw, heading) * Math.min(1, dt * 14);
      localPoint(monkey, banana, 'reach');
      if (eat(monkey, banana, monkeyFood.at, .42, .78, 1.20, 'banana')) {
        bananaReady[banana.id] = time + 2.4;
        monkeyFood = null;
        startMonkeyPlan();
      }
    } else {
      monkey.yaw += angleDelta(monkey.yaw, heading) * Math.min(1, dt * 11);
      if (groundNotice && time-groundNotice.at > 1.20) groundNotice = null;
      if (groundNotice && !monkeyMove && !night) {
        monkeyLookAt = time;
        monkeyLookPoint = groundNotice.point;
        groundNotice = null;
        emit({type:'monkey-look-down',...monkeyLookPoint});
      }
      // 只动稳定抓枝后的头，让宝宝看清先拾香蕉、树上的伙伴才探头。
      if (!monkeyMove && !night && monkeyLookPoint) {
        monkey.lookDown = .87 * pulse((time-monkeyLookAt)/1.0);
        monkey.look += monkey.lookDown * clamp(angleDelta(monkey.yaw,bearing(monkey,monkeyLookPoint))/1.4,-1,1);
      }
    }
    monkey.land = 1 - ease((time - monkeyLandAt) / .22);
    monkey.sleep = clamp(monkey.sleep + dt * (night && !monkeyMove && !monkeyFood && monkeyPluckAt === null ? 2.1 : -2.8));
  }

  function stepDroppedBanana() {
    if (dropBanana.phase === 'drop') {
      const from = points.dropBanana;
      const to = points.bananaLanding;
      const progress = clamp((time - bananaDropAt) / .64);
      dropBanana.x = mix(from.x, to.x, progress);
      dropBanana.z = mix(from.z, to.z, progress);
      const floor = groundAt(dropBanana.x, dropBanana.z) + bananaClearance;
      const height = from.y - groundAt(from.x, from.z) - bananaClearance;
      dropBanana.y = floor + height * (1 - progress ** 2);
      dropBanana.rotation = -2 * Math.PI * progress;
      if (progress === 1) {
        dropBanana.rotation = 0;
        dropBanana.phase = 'ground';
        bananaLandedAt = time;
        emit({ type: 'drop-banana-land', id: dropBanana.id, ...position(dropBanana) });
      }
    } else if (dropBanana.phase === 'ground') {
      const bounce = (time - bananaLandedAt) / .29;
      const floor = groundAt(dropBanana.x, dropBanana.z) + bananaClearance;
      dropBanana.y = floor + .105 * pulse(bounce);
      dropBanana.rotation = .29 * pulse(bounce);
    } else if (dropBanana.phase === 'spent' && time >= dropBananaReady) {
      Object.assign(dropBanana, points.dropBanana, { phase: 'branch', rotation: 0 });
    }
  }

  function moveGroundMonkey(to, action) {
    const from = position(groundMonkey);
    const length=distance(from,to),quiet=action==='routine';
    const turnIn=quiet ? Math.max(.12,Math.abs(angleDelta(groundMonkey.yaw,bearing(from,to)))/6.5) : 0;
    groundMove = { at:time, from,to, action,turnIn,
      duration:quiet ? Math.max(.55,length*1.45+.18) : Math.max(.29,length*.78+.21) };
  }

  function startGroundPickup() {
    if (night || (groundMove && groundMove.action !== 'routine') || groundFoodAt !== null || time - bananaLandedAt < .29 || dropBanana.phase !== 'ground') return;
    const length = distance(dropBanana, groundMonkey);
    const progress = 1 - Math.min(.36 / Math.max(length, .001), 1);
    moveGroundMonkey({ x: mix(groundMonkey.x, dropBanana.x, progress),
      z: mix(groundMonkey.z, dropBanana.z, progress) }, 'pickup');
  }

  function sampleGroundMonkey() {
    const actor = groundMonkey;
    const c = Math.cos(actor.yaw), s = Math.sin(actor.yaw);
    function floor(side, fore) {
      const { x, z } = groundMonkeyFoot(actor.gait, actor.stride, side, fore);
      const wx = actor.x + groundMonkeyScale * (x * c + z * s);
      const wz = actor.z + groundMonkeyScale * (z * c - x * s);
      return groundAt(wx, wz);
    }
    actor.leftGroundY = floor(-1, false);
    actor.rightGroundY = floor(1, false);
    actor.leftHandGroundY = floor(-1, true);
    actor.rightHandGroundY = floor(1, true);
  }

  function stepGroundMonkey(dt, active) {
    const actor = groundMonkey;
    actor.call = night ? 0 : pulse((time - groundCallAt) / .78);
    actor.reach = actor.bring = actor.hold = actor.chew = actor.gait = 0;
    actor.look = actor.call * .40;
    actor.crouch = .25 * actor.call;
    actor.alert = dropBanana.phase === 'ground' && !night ? pulse((time - bananaLandedAt) / .34) : 0;
    let heading = .24;
    if (!night && groundFoodAt === null && dropBanana.phase === 'ground') startGroundPickup();
    if (!night && !groundMove && groundFoodAt === null && dropBanana.phase !== 'ground') {
      if (time >= groundReturnAt) {
        groundReturnAt = Infinity;
        moveGroundMonkey(home, 'return');
      } else if (active && dropBanana.phase === 'branch' && time-groundCallAt>.78 && routineTime>=groundNext) {
        moveGroundMonkey(groundSide ? home : groundMonkeySidePath,'routine');
      }
    }
    if (groundMove) {
      const { from, to, at, duration, action,turnIn } = groundMove;
      const age = time - at;
      const progress = clamp((age-turnIn) / duration);
      const travel = ease(progress);
      const prev = position(actor);
      actor.x = mix(from.x, to.x, travel);
      actor.z = mix(from.z, to.z, travel);
      actor.gait = (action==='routine' ? .70 : .93) * pulse(progress);
      if (action==='routine') actor.stride += distance(prev,actor)*15.5;
      else actor.stride = 6.28 * age * 3.65;
      heading = bearing(from, to);
      if (progress === 1) {
        groundMove = null;
        if (action === 'pickup') { groundFoodAt = time + .075; groundRevealYaw = null; }
        if (action === 'routine') groundSide = 1-groundSide;
        groundNext = routineTime + idleDelay(2.75);
      }
    }
    actor.y = groundAt(actor.x, actor.z);
    const presenting = groundFoodAt !== null && groundRevealYaw !== null;
    if (presenting) {
      const reveal = ease((time-groundFoodAt-.47)/.46);
      const face = groundRevealYaw + angleDelta(groundRevealYaw,.38)*reveal;
      actor.stride += Math.abs(angleDelta(actor.yaw,face))*2.3;
      actor.gait = .20*pulse(reveal);
      actor.yaw = angleDelta(0,face);
    } else {
      if (groundFoodAt !== null || actor.alert > 0) heading = bearing(actor, dropBanana);
      actor.yaw += angleDelta(actor.yaw, heading) * Math.min(1, dt * 14);
    }
    if (groundFoodAt !== null) {
      const before = dropBanana.phase;
      if (!presenting) {
        localPoint(actor, dropBanana, 'reach');
        actor.reachX /= groundMonkeyScale;
        actor.reachY /= groundMonkeyScale;
        actor.reachZ /= groundMonkeyScale;
      }
      const showFruit = active || presenting;
      if (eat(actor, dropBanana, groundFoodAt, .44, showFruit ? 1.11 : .83, showFruit ? 1.51 : 1.23,
        'ground-monkey', 'ground')) {
        groundFoodAt = null;
        groundRevealYaw = null;
        groundReturnAt = time + .34;
        dropBananaReady = time + 2.5;
      }
      if (active && before==='ground' && dropBanana.phase==='held') {
        // 先从真实落点抓起这根香蕉，再原地换脚转向孩子，把果举到身前。
        groundRevealYaw=actor.yaw;
        if (!night && distance(monkey,actor)<2.13) {
          groundNotice={at:time,point:position(actor)};
          monkeyNext=routineTime+2.9;
        }
      }
      actor.crouch = .79 * actor.reach;
    }
    actor.sleep = clamp(actor.sleep + dt * (night && groundFoodAt === null ? 2.3 : -2.8));
    sampleGroundMonkey();
  }

  function slothBusy() {
    return slothFood !== null || slothGesture !== null || Boolean(berryRace?.sloth);
  }

  function slothCanPlay() {
    if (!night && slothNapUntil === null) return !slothBusy();
    if (!slothBusy()) emit({ type: 'sleep', animal: 'sloth' });
    return false;
  }

  function tapSloth() {
    if (!slothCanPlay()) return;
    if (queueSloth('stretch')) return;
    slothIdleAt = time;
    slothGesture = { kind: 'stretch', at: time };
    emit({ type: 'sloth-stretch', ...position(sloth) });
  }

  function tapSlothBough() {
    if (!slothCanPlay()) return;
    if (queueSloth('sway')) return;
    slothIdleAt = time;
    slothGesture = { kind: 'sway', at: time, reacted: false };
    sloth.boughShake = 1;
    emit({ type: 'sloth-bough-touch', ...points.slothBough });
  }

  function tapLeaf() {
    if (!slothCanPlay() || leaf.phase !== 'branch') return;
    if (queueSloth('leaf')) return;
    slothTouchAt = slothIdleAt = time;
    slothFood = { at: time };
    emit({ type: 'sloth-leaf-touch', ...position(leaf) });
  }

  function slothWatchesMonkey(point) {
    if (night || slothNapUntil !== null || slothBusy() || distance(sloth, point) >= monkeyWatchRange) return;
    slothWatchAt = time;
    slothWatchDirection = clamp(angleDelta(sloth.yaw, bearing(sloth, point)) / 1.50, -1, 1);
    emit({ type: 'sloth-watch', animal: 'monkey', ...position(point) });
  }

  function stepSlothGesture() {
    if (!slothGesture) return;
    const age = time - slothGesture.at;
    if (slothGesture.kind === 'stretch') {
      sloth.stretch = ease(age / .61) * (1 - ease((age - .74) / .47));
      if (age >= .74 && sloth.stretch < .035) {
        sloth.stretch = 0;
        slothGesture = null;
      }
      return;
    }
    // 小枝的抖动先发生，承重枝不动。身体摆到最远才引起低枝上的鸟注意。
    sloth.boughShake = 1 - ease(age / .59);
    sloth.sway = pulse((age - .14) / .96);
    if (!slothGesture.reacted && age >= .60) {
      slothGesture.reacted = true;
      emit({ type: 'sloth-sway', ...position(sloth) });
      if (!toucanMove && !berryRace?.toucan && distance(toucan, sloth) < toucanWatchRange) {
        toucanWatchAt = time;
        emit({ type: 'toucan-watch', animal: 'sloth', ...position(sloth) });
      }
    }
    if (age >= .60 && sloth.sway < .035) {
      sloth.sway = 0;
      slothGesture = null;
    }
  }

  function queueSloth(kind) {
    if (!slothCrawl) {
      slothCrawlAt = routineTime + 4.6;
      return false;
    }
    slothPending = kind;
    slothTouchAt = slothIdleAt = time;
    return true;
  }

  function crawlSloth(active) {
    if (!slothCrawl && active && !night && slothNapUntil === null && !slothBusy() &&
      sloth.sleep < .06 && routineTime >= slothCrawlAt) {
      slothCrawl = { x: sloth.x, span: slothCrawlStops[slothCrawlIndex] - sloth.x, at: time };
      slothCrawlIndex = 1 - slothCrawlIndex;
    }
    if (slothCrawl) {
      const { x, span, at } = slothCrawl;
      const progress = clamp((time - at) / 1.88);
      sloth.x = x + span * ease((progress - .12) / .76);
      sloth.crawl = progress;
      sloth.crawlSpan = span;
      localPoint(sloth, { x: x - .38, y: points.slothSupport.y, z: points.slothSupport.z }, 'grip');
      if (progress < 1) return;
      slothCrawl = null;
      slothCrawlAt = routineTime + idleDelay(6.65);
      emit({ type: 'sloth-crawl', ...position(sloth) });
      const queued = slothPending;
      slothPending = null;
      if (!night && queued) ({ stretch: tapSloth, sway: tapSlothBough, leaf: tapLeaf })[queued]();
    }
    sloth.crawl = -1;
    sloth.crawlSpan = 0;
    localPoint(sloth, { x: sloth.x - .38, y: points.slothSupport.y, z: points.slothSupport.z }, 'grip');
  }

  function stepSloth(dt, active) {
    sloth.reach = sloth.hold = sloth.bring = sloth.chew = 0;
    sloth.stretch = sloth.sway = sloth.boughShake = sloth.fruitLean = 0;
    sloth.look = night ? 0 : .67 * pulse((time - slothTouchAt) / .65);
    if (active && slothIdleAt === null) slothIdleAt = time;
    crawlSloth(active);
    localPoint(sloth, leaf, 'reach');
    if (leaf.phase === 'spent' && time >= leafReady) leaf.phase = 'branch';
    if (slothNapUntil !== null && time >= slothNapUntil) {
      slothNapUntil = null;
      slothIdleAt = time;
    }
    // 第一次互动以前一直清醒，之后每到一段真实闲置期才短憩。
    if (!night && !slothBusy() && !slothCrawl && slothIdleAt !== null && slothNapUntil === null && time - slothIdleAt >= slothIdleTime) {
      slothNapUntil = time + slothNapTime;
      emit({ type: 'sloth-nap' });
    }
    const watch = pulse((time - slothWatchAt) / .97);
    sloth.watch = watch && !night && slothNapUntil === null && !slothBusy() ? slothWatchDirection * watch : 0;
    stepSlothGesture();
    if (slothFood && eat(sloth, leaf, slothFood.at, .55, 1.10, 1.59, 'sloth-leaf')) {
      leafReady = time + 2.1;
      slothFood = null;
    }
    if (berryRace?.sloth) stepSlothBerry(berryRace);
    const resting = (night || slothNapUntil !== null) && !slothBusy() && !slothCrawl;
    sloth.sleep = clamp(sloth.sleep + dt * (resting ? 2.25 : -2.9));
  }

  function tapToucan() {
    if (night) {
      if (!toucanMove && !berryRace?.toucan) emit({ type: 'sleep', animal: 'toucan' });
      return;
    }
    if (toucanMove?.quiet) {
      toucanPending = true;
      return;
    }
    if (toucanMove || berryRace?.toucan) return;
    toucanWatchAt = -Infinity;
    toucanCallAt = time;
    toucanNext = routineTime + 7.2;
    toucanMove = { at: time, index: 1 - toucan.site, from: position(toucan), jumped: false };
    emit({ type: 'toucan-call' });
  }

  function tapBerry() {
    if (berry.phase !== 'branch' || berryRace || berryQueued) return;
    if (night) {
      if (!slothBusy() && !slothCrawl) emit({ type: 'sleep', animal: 'sloth' });
      return;
    }
    berryTouchedAt = time;
    toucanWatchAt = -Infinity;
    berryQueued = true;
    emit({ type: 'berry-look', id: berry.id, ...position(berry) });
    startBerryRace();
  }

  function startBerryRace() {
    if (!berryQueued || toucanMove) return;
    const slothAwake = slothNapUntil === null && sloth.sleep < .12;
    const birdAwake = toucan.sleep < .12;
    if (slothAwake && (slothBusy() || slothCrawl)) return;
    if (!slothAwake && !birdAwake) {
      berryQueued = false;
      return;
    }
    if (!slothAwake && toucan.site === 1) {
      // 树懒打盹时，醒着的鸟可以先换到够得着的枝上再吃。
      toucanMove = { at: time, index: 0, from: position(toucan), jumped: false, quiet: true };
      return;
    }
    const winner = birdAwake && toucan.site === 0 ? 'toucan' : 'sloth';
    const landing = { x: sloth.x + .615, y: sloth.y - .127, z: sloth.z + .415 };
    berryRace = { at: time, sloth: slothAwake, toucan: birdAwake, winner, landing };
    berryQueued = false;
    if (slothAwake) {
      slothTouchAt = slothIdleAt = time;
      slothCrawlAt = routineTime + idleDelay(4.6);
    }
    toucanNext = routineTime + idleDelay(7);
    emit({ type: 'berry-race', winner, sloth: slothAwake, toucan: birdAwake, site: toucan.site });
  }

  function finishBerry() {
    berry.phase = 'spent';
    berryReady = time + 2.35;
    berryRace = null;
  }

  function moveBerry() {
    const touchAge = time - berryTouchedAt;
    berry.shiver = touchAge < .47 ? (1 - ease(touchAge / .47)) * Math.sin(touchAge * 28) : 0;
    if (berry.phase === 'spent' && time >= berryReady) {
      Object.assign(berry, points.berry, { phase: 'branch', owner: null, tossY: 0 });
    }
    if (berryRace?.winner !== 'sloth' || (berry.phase !== 'branch' && berry.phase !== 'drop')) return;
    const age = time - berryRace.at;
    if (age < berryReleaseAt) return;
    if (berry.phase === 'branch') {
      berry.phase = 'drop';
      emit({ type: 'berry-drop', id: berry.id, ...position(berry) });
    }
    // 从枝头沿斜弧落到爪前，果实真正到握点后才切到手上的模型锚点。
    const progress = clamp((age - berryReleaseAt) / (berryCatchAt - berryReleaseAt));
    const landing = berryRace.landing;
    berry.x = mix(points.berry.x, landing.x, progress);
    berry.y = mix(points.berry.y, landing.y, progress * progress);
    // 先朝横枝前方滑出，再落向树懒，以免果实从木枝里穿下来。
    berry.z = mix(points.berry.z, landing.z, ease(progress / .70));
  }

  function stepSlothBerry(race) {
    const age = time - race.at;
    const wins = race.winner === 'sloth';
    localPoint(sloth, race.landing, 'reach');
    if (wins) {
      const before = berry.phase;
      const finished = eat(sloth, berry, race.at, berryCatchAt, 1.49, 1.93, 'sloth-berry', 'drop');
      if (before === 'drop' && berry.phase === 'held') {
        berry.owner = 'sloth';
        emit({ type: 'berry-pick', id: berry.id, animal: berry.owner, ...position(berry) });
      }
      if (finished) finishBerry();
    } else {
      sloth.reach = .90 * ease(age / .47) * (1 - ease((age - .41) / .39));
    }
    sloth.fruitLean = ease(age / .13) * (1 - ease((age - (wins ? 1.71 : .65)) / .24));
    sloth.look = .55 * pulse(age / .97);
  }

  function stepToucanBerry(race) {
    const age = time - race.at;
    if (race.winner === 'sloth') {
      toucan.targetX = 0;
      toucan.targetY = .224;
      toucan.targetZ = .769;
      toucan.reach = .93 * ease(age / .41) * (1 - ease((age - .47) / .39));
      toucan.beakOpen = .49 * pulse((age - .29) / .38);
      return;
    }
    localPoint(toucan, berry, 'target');
    toucan.reach = ease(age / .39) * (1 - ease((age - .40) / .22));
    toucan.beakOpen = Math.max(.50 * pulse((age - .29) / .22), .72 * pulse((age - .58) / .21),
      .78 * pulse((age - .98) / .21));
    if (age >= .39 && berry.phase === 'branch') {
      toucan.reach = 1;
      toucan.hold = 1;
      berry.phase = 'held';
      berry.owner = 'toucan';
      emit({ type: 'berry-pick', id: berry.id, animal: berry.owner, ...position(berry) });
    }
    if (age >= .68 && berry.phase === 'held') {
      berry.phase = 'toss';
      emit({ type: 'berry-toss', id: berry.id });
    }
    if (berry.phase === 'toss') {
      const progress = clamp((age - .68) / .42);
      // 抛起期间渲染仍沿真实喙的锚点，回接高度刚好归零。
      berry.tossY = .17 * 4 * progress * (1 - progress);
      if (progress === 1) {
        berry.phase = 'caught';
        emit({ type: 'berry-catch', id: berry.id });
      }
    }
    toucan.hold = Number(berry.phase === 'held' || berry.phase === 'caught');
    if (age >= 1.33) {
      finishBerry();
      toucan.hold = 0;
    }
  }

  function stepToucan(dt, active) {
    toucan.flight = toucan.flap = toucan.reach = toucan.hold = toucan.beakOpen = 0;
    toucan.call = night ? 0 : pulse((time - toucanCallAt) / .82);
    let heading = toucan.site===0?-.93:.70;
    if (active && !night && !toucanMove && !berryRace && !berryQueued && time - toucanWatchAt > .88 && routineTime >= toucanNext) {
      toucanMove = { at: time, index: 1 - toucan.site, from: position(toucan), jumped: false, quiet: true };
      toucanNext = routineTime + idleDelay(8.2);
    }
    if (toucanMove) {
      const move = toucanMove;
      const to = points.toucanBranches[move.index];
      const age = time - move.at;
      const progress = clamp((age - .12) / .74);
      const travel = ease(progress);
      toucan.x = mix(move.from.x, to.x, travel);
      toucan.y = mix(move.from.y, to.y, travel) + .28 * pulse(progress);
      toucan.z = mix(move.from.z, to.z, travel);
      toucan.flight = pulse(progress);
      toucan.flap = Math.sin(progress * Math.PI * 9) * toucan.flight;
      if (!move.jumped && age >= .12) {
        move.jumped = true;
        emit({ type: move.quiet ? 'toucan-routine-takeoff' : 'toucan-takeoff', index: move.index, ...move.from });
      }
      heading = progress < .65 ? bearing(move.from, to) : .19;
      if (progress === 1) {
        Object.assign(toucan, to);
        toucan.site = move.index;
        toucanMove = null;
        toucanLandAt = time;
        emit({ type: move.quiet ? 'toucan-routine-land' : 'toucan-land', index: move.index, ...to });
        const queued = toucanPending;
        toucanPending = false;
        if (queued) tapToucan();
      }
    }
    if (berryRace?.toucan) heading = bearing(toucan, points.berry);
    toucan.yaw += angleDelta(toucan.yaw, heading) * Math.min(1, dt * 12);
    toucan.look = 0;
    const watch = night ? 0 : pulse((time - toucanWatchAt) / .82);
    if (watch && !toucanMove && !berryRace?.toucan) {
      const direction = Math.sign(angleDelta(toucan.yaw, bearing(toucan, points.slothBough)));
      toucan.look = direction * .67 * watch;
    }
    toucan.land = 1 - ease((time - toucanLandAt) / .22);
    if (berryRace?.toucan) stepToucanBerry(berryRace);
    const resting = night && !toucanMove && !berryRace?.toucan;
    toucan.sleep = clamp(toucan.sleep + dt * (resting ? 2.2 : -3.1));
  }

  function setNight(value) {
    const next = Boolean(value);
    if (night === next) return;
    night = next;
    slothNapUntil = null;
    if (!night) {
      if (slothIdleAt !== null) slothIdleAt = time;
      return;
    }
    monkeyPlan = null;
    monkeyCallAt = -Infinity;
    monkeyVoicePending = false;
    groundNotice = null;
    monkeyLookAt = -Infinity;
    slothGesture = null;
    slothWatchAt = -Infinity;
    slothPending = null;
    toucanWatchAt = -Infinity;
    toucanCallAt = -Infinity;
    toucanPending = false;
    berryQueued = false;
    if (berryRace && berry.phase === 'branch') berryRace = null;
    // 未脱离枝的食物留在枝上；已经拿在手里的食物照常送嘴。
    if (monkeyFood && bananas[monkeyFood.index].phase === 'branch') monkeyFood = null;
    if (dropBanana.phase === 'branch') monkeyPluckAt = null;
    groundCallAt = -Infinity;
    if (groundMove?.action === 'return') groundReturnAt = time;
    groundMove = null;
    if (dropBanana.phase === 'ground') groundFoodAt = null;
    if (slothFood && leaf.phase === 'branch') slothFood = null;
  }

  function step(dt, active = false) {
    dt = clamp(dt, 0, .05);
    time += dt;
    if (active) routineTime += dt * idleClockRate;
    monkey.time = groundMonkey.time = sloth.time = toucan.time = time;
    stepMonkey(dt, active);
    stepDroppedBanana();
    stepGroundMonkey(dt, active);
    moveBerry();
    stepSloth(dt, active);
    stepToucan(dt, active);
    startBerryRace();
  }

  sampleGroundMonkey();
  localPoint(monkey, bananas[0], 'reach');
  localPoint(sloth, { x: points.sloth.x - .38, y: points.slothSupport.y, z: points.slothSupport.z }, 'grip');
  localPoint(sloth, leaf, 'reach');
  localPoint(toucan, berry, 'target');
  return {
    monkey, groundMonkey, sloth, toucan, bananas, dropBanana, leaf, berry, get time() { return time; },
    setNight, step, tapMonkey, tapGroundMonkey, tapBanana, tapDropBanana, tapMonkeyBough, tapSloth, tapSlothBough,
    tapLeaf, tapToucan, tapBerry
  };
}
