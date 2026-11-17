import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { asiaPoints, createAsia } from '../src/asia-state.js';
import { makePeacock, makeTiger } from '../src/asia-actors.js';
import { makeMoonBear, makeScopsOwl } from '../src/asia-bear-owl.js';

function setup(options) {
  const events = [];
  const asia = createAsia(event => events.push({ ...event, time: asia.time, reach: asia.bear.reach, fan: asia.peacock.fan }), options);
  function advance(seconds) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) asia.step(1 / 60);
  }
  return { asia, events, advance };
}

const position = ({ x, y, z }) => ({ x, y, z });

test('孔雀合扇才日常改站，角鸮只在夜间无声换枝且仍接收触摸', () => {
  const { asia, events } = setup();
  const advance = seconds => {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) asia.step(1 / 60, true);
  };
  advance(5);
  assert.ok(Math.hypot(asia.peacock.x - asiaPoints.peacock.x, asia.peacock.z - asiaPoints.peacock.z) > .24);
  assert.equal(asia.peacock.fan, 0);
  assert.equal(asia.owl.sleep, 1);
  assert.equal(asia.owl.site, 0);
  asia.setNight(true);
  advance(5.61);
  assert.ok(asia.owl.flight > .4);
  assert.ok(!events.some(e => e.type === 'owl-call'));
  asia.tapOwl();
  advance(.64);
  assert.equal(asia.owl.site, 1);
  assert.equal(events.filter(e => e.type === 'owl-routine-land').length, 1);
  assert.equal(events.filter(e => e.type === 'owl-call').length, 1);
  advance(4);
  assert.equal(asia.owl.site, 0);
});

test('真实啄到种子后，靠近的老虎只接一次目光', () => {
  const { asia, events } = setup();
  const advance = seconds => {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) asia.step(1 / 60, true);
  };
  asia.tapTuft();
  advance(1.4);
  asia.tapPeacockSeeds();
  advance(2);
  const peck = events.find(e => e.type === 'peacock-peck');
  const looks = events.filter(e => e.type === 'tiger-seed-look');
  assert.ok(peck);
  assert.equal(looks.length, 1);
  assert.ok(looks[0].time > peck.time);
});

test('中间果由虎探触、熊拾起吃，三秒内共用同一颗，旧果原位', () => {
  const { asia, events, advance } = setup();
  const fruit = asia.sharedFruit;
  const bearRig = makeMoonBear(T,()=>asiaPoints.floor), tigerRig = makeTiger(T);
  const probe = new T.Vector3();
  assert.equal(asia.fruits.length,2);
  asia.tapSharedFruit();
  asia.tapSharedFruit();
  advance(.25);
  assert.equal(fruit.phase,'drop');
  let checked = 0;
  for (let frame = 0; frame < 320; frame++) {
    const before = events.length;
    asia.step(1/120);
    for (const event of events.slice(before)) {
      const tested = event.type === 'shared-fruit-tiger-touch' ? [tigerRig,asia.tiger,tigerRig.fruitPaw]
        : event.type === 'shared-fruit-bear-pick' ? [bearRig,asia.bear,bearRig.paw] : null;
      if (!tested) continue;
      const [rig,actor,hand] = tested;
      rig.root.position.set(actor.x,actor.y,actor.z);
      rig.root.rotation.y = actor.yaw;
      rig.pose(actor);
      assert.ok(hand.getWorldPosition(probe).distanceTo(new T.Vector3(event.x,event.y,event.z)) < .012);
      checked++;
    }
  }
  const order = events.filter(event => event.type.startsWith('shared-fruit-'));
  assert.deepEqual(order.map(event=>event.type),['shared-fruit-drop','shared-fruit-land',
    'shared-fruit-tiger-touch','shared-fruit-bear-pick','shared-fruit-mouth']);
  assert.ok(order.at(-1).time - order[0].time < 3);
  assert.equal(checked,2);
  assert.equal(asia.sharedFruit,fruit);
  assert.ok(asia.fruits.every(item=>item.phase==='branch'));
});

test('四只清醒时各自缓慢巡视，待机保持脚位和夜昼状态', () => {
  const rigs = [
    [makeMoonBear(T,()=>asiaPoints.floor),'熊头'],
    [makeTiger(T),'Tiger head'],
    [makePeacock(T),'Peacock head'],
    [makeScopsOwl(T),'带耳羽的头'],
  ];
  for (const [rig,name] of rigs) {
    const head=rig.root.getObjectByName(name);
    rig.pose({time:.5});
    const before=head.quaternion.clone();
    const feet=rig.feet?.map(foot=>foot.position.clone())??[];
    rig.pose({time:2.8});
    assert.ok(before.angleTo(head.quaternion)>.024);
    feet.forEach((foot,i)=>assert.ok(foot.distanceTo(rig.feet[i].position)<1e-8));
  }
  const [owl,name]=rigs.at(-1);
  owl.pose({time:.5,sleep:1});
  const asleep=owl.root.getObjectByName(name).quaternion.clone();
  owl.pose({time:2.8,sleep:1});
  assert.ok(asleep.angleTo(owl.root.getObjectByName(name).quaternion)<1e-7);
});

test('熊抬身抓到低枝才摘叶，叶送嘴后才咀嚼发声', () => {
  const { asia, events, advance } = setup();
  const sameLeaf = asia.leaf;
  asia.tapBear();
  advance(.28);
  assert.ok(asia.bear.stand > .7);
  assert.equal(asia.leaf.phase, 'branch');
  assert.equal(events.some(event => event.type === 'bear-leaf-pick' || event.type === 'bear-call'), false);
  advance(.34);
  assert.equal(asia.leaf.phase, 'held');
  const picked = events.find(event => event.type === 'bear-leaf-pick');
  assert.equal(picked.reach, 1);
  assert.deepEqual(position(picked), asiaPoints.leaf);
  advance(.31);
  assert.equal(asia.leaf.phase, 'mouth');
  const mouth = events.find(event => event.type === 'leaf-mouth');
  const voice = events.find(event => event.type === 'bear-call');
  assert.ok(mouth.time > picked.time && voice.time === mouth.time);
  assert.equal(voice.food, 'leaf');
  assert.ok(asia.bear.chew > 0);
  advance(3.6);
  assert.equal(asia.leaf, sameLeaf);
  assert.equal(asia.leaf.phase, 'branch');
});

test('两果先落地，熊只走向落在近处的一颗，远果留在地面', () => {
  const { asia, events, advance } = setup();
  const near = asia.fruits[0];
  asia.tapFruit(0);
  asia.tapFruit(0);
  asia.tapFruit(1);
  advance(.28);
  assert.ok(asia.fruits.every(fruit => fruit.phase === 'drop'));
  assert.deepEqual(position(asia.bear), asiaPoints.bear);
  assert.equal(events.some(event => event.type === 'fruit-pick'), false);
  advance(2.1);
  const arrivals = events.filter(event => event.type === 'fruit-land');
  assert.equal(arrivals.length, 2);
  for (const event of arrivals) assert.deepEqual(position(event), asiaPoints.fruitLandings[event.id]);
  const pick = events.find(event => event.type === 'fruit-pick');
  const mouth = events.find(event => event.type === 'fruit-mouth');
  assert.equal(pick.id, 0);
  assert.equal(pick.reach, 1);
  assert.ok(arrivals.find(event => event.id === 0).time < pick.time && pick.time < mouth.time);
  assert.equal(asia.fruits[0], near);
  assert.ok(asia.bear.x < asiaPoints.bear.x);
  assert.deepEqual(position(asia.fruits[1]), asiaPoints.fruitLandings[1]);
  assert.equal(asia.fruits[1].phase, 'ground');
  assert.equal(events.filter(event => event.type === 'fruit-drop').length, 2);
  assert.equal(events.filter(event => event.type === 'fruit-pick').length, 1);
});

test('熊正在摘叶时，记一颗真落近的果，收爪后再拾取', () => {
  const { asia, events, advance } = setup();
  asia.tapLeaf();
  asia.tapFruit(0);
  asia.tapFruit(1);
  advance(.75);
  assert.equal(asia.leaf.phase, 'held');
  assert.ok(asia.fruits.every(fruit => fruit.phase === 'ground'));
  assert.equal(events.some(event => event.type === 'fruit-pick'), false);
  advance(2.45);
  const leaf = events.find(event => event.type === 'leaf-mouth');
  const pick = events.find(event => event.type === 'fruit-pick');
  assert.ok(leaf.time < pick.time);
  assert.equal(pick.id, 0);
  assert.equal(asia.fruits[1].phase, 'ground');
});

test('点虎原地伸爪张嘴，点草走到停点再低头嗅', () => {
  const groundAt = x => asiaPoints.tiger.y + (x - asiaPoints.tiger.x) * .075;
  const { asia, events, advance } = setup({ groundAt });
  asia.tapTiger();
  advance(.25);
  assert.ok(asia.tiger.paw > .18 && asia.tiger.roar > .18);
  assert.deepEqual(position(asia.tiger), asiaPoints.tiger);
  advance(1);
  asia.tapTuft();
  advance(.23);
  assert.ok(asia.tuft.bend > 0 && asia.tiger.gait > 0);
  assert.equal(asia.tiger.sniff, 0);
  advance(1);
  assert.equal(asia.tiger.x, asiaPoints.tigerStop.x);
  assert.equal(asia.tiger.y, groundAt(asiaPoints.tigerStop.x));
  const stop = events.find(event => event.type === 'tiger-stop');
  const sniff = events.find(event => event.type === 'tiger-sniff');
  assert.ok(stop.time < sniff.time);
  assert.equal(events.filter(event => event.type === 'tiger-call').length, 1);
});

test('孔雀在当前开度回收，入夜先闭屏再蹬地上低枝，醒来能回地', () => {
  const { asia, events, advance } = setup();
  asia.tapPeacock();
  advance(.22);
  const open = asia.peacock.fan;
  assert.ok(open > 0 && open < 1);
  asia.tapPeacock();
  advance(.16);
  assert.ok(asia.peacock.fan < open);
  asia.tapPeacock();
  advance(.7);
  assert.equal(asia.peacock.fan, 1);

  asia.setNight(true);
  advance(.18);
  assert.equal(events.some(event => event.type === 'peacock-takeoff'), false);
  assert.ok(asia.peacock.fan > 0);
  advance(1.65);
  const takeoff = events.find(event => event.type === 'peacock-takeoff');
  assert.equal(takeoff.fan, 0);
  assert.deepEqual(position(asia.peacock), asiaPoints.peacockPerch);
  assert.ok(asia.peacock.sleep > 0);
  advance(.30);
  assert.ok(asia.peacock.sleep > .95);
  asia.tapPeacock();
  assert.ok(events.some(event => event.type === 'sleep' && event.animal === 'peacock'));
  asia.setNight(false);
  advance(1.46);
  assert.deepEqual(position(asia.peacock), asiaPoints.peacock);
  assert.equal(asia.peacock.sleep, 0);
});

test('白天点种子先收扇走近，逐粒接触才消失，之后回到开屏站位', () => {
  const { asia, events, advance } = setup();
  asia.tapPeacock();
  advance(.55);
  asia.tapPeacockSeeds();
  advance(.23);
  assert.equal(asia.peacock.z, asiaPoints.peacock.z);
  assert.ok(asia.peacock.fan > 0 && asia.peacock.fan < 1);
  assert.ok(asia.seeds.every(seed => seed.phase === 'ground'));
  advance(.84);
  assert.equal(asia.peacock.fan, 0);
  assert.ok(asia.peacock.z > asiaPoints.peacock.z);
  assert.deepEqual(asia.seeds.map(seed => seed.phase), ['eaten','ground']);
  advance(.55);
  const pecks = events.filter(event => event.type === 'peacock-peck');
  assert.deepEqual(pecks.map(event => event.id), [0,1]);
  assert.deepEqual(pecks.map(position), asiaPoints.peacockSeeds);
  advance(.8);
  assert.deepEqual(position(asia.peacock), asiaPoints.peacock);
});

test('抖扇短促引来附近虎抬头，草弯让孔雀回看，白天角鸮始终休息', () => {
  const { asia, events, advance } = setup();
  asia.tapPeacockFan();
  assert.equal(events.length, 0);
  asia.tapPeacock();
  advance(.56);
  asia.tapPeacockFan();
  asia.tapPeacockFan();
  advance(.3);
  assert.equal(asia.peacock.fan, 1);
  assert.ok(asia.peacock.shake > .3 && asia.tiger.ears > .15 && asia.tiger.look > .10 && asia.tiger.notice > .4);
  assert.equal(events.filter(event => event.type === 'peacock-rattle').length, 1);
  advance(.9);
  asia.tapTuft();
  advance(1.07);
  assert.ok(asia.tuft.bend > 0 && asia.peacock.look < -.15);
  assert.equal(asia.owl.sleep, 1);
  assert.equal(asia.owl.call + asia.owl.flight, 0);
});

test('喂食途中入夜撤回，种子不被误啄，孔雀照常飞低枝', () => {
  const { asia, events, advance } = setup();
  asia.tapPeacockSeeds();
  advance(.28);
  asia.setNight(true);
  advance(2);
  assert.ok(asia.seeds.every(seed => seed.phase === 'ground'));
  assert.equal(events.some(event => event.type === 'peacock-peck'), false);
  assert.deepEqual(position(asia.peacock), asiaPoints.peacockPerch);
});

test('模型喙尖准确到达两粒种子，开屏抖动保留地面净空', () => {
  const { asia, events } = setup();
  const rig = makePeacock(T);
  const bill = new T.Vector3(), tip = new T.Vector3();
  asia.tapPeacockSeeds();
  let count = 0;
  for (let frame = 0; frame < 300; frame++) {
    asia.step(1/120);
    const bird = asia.peacock;
    rig.root.position.set(bird.x,bird.y,bird.z);
    rig.root.rotation.y = bird.yaw;
    rig.pose(bird);
    const latest = events.at(-1);
    if (latest?.type === 'peacock-peck' && latest.id === count) {
      rig.bill.getWorldPosition(bill);
      assert.ok(bill.distanceTo(new T.Vector3(latest.x,latest.y,latest.z)) < .008);
      count++;
    }
  }
  assert.equal(count,2);
  assert.equal(rig.fanEyes.length,15);
  rig.pose({fan:1});
  const base = rig.fanSurface.rotation.y;
  let twist = 0;
  for (let frame = 0; frame <= 90; frame++) {
    rig.pose({time:frame/100,fan:1,shake:1,shakePhase:frame/100});
    twist = Math.max(twist,Math.abs(rig.fanSurface.rotation.y-base));
    for (const feather of rig.fanTips) assert.ok(feather.getWorldPosition(tip).y > asiaPoints.floor+.12);
  }
  assert.ok(twist > .19);
});

test('猫头鹰白天只睡，夜间叫完 3.06 秒才离枝，快点不叠声、切回白天能取消待飞', () => {
  const { asia, events, advance } = setup();
  asia.tapOwl();
  assert.deepEqual(events.map(event => event.type), ['sleep']);
  asia.setNight(true);
  advance(.5);
  asia.tapOwl();
  advance(.40);
  assert.ok(asia.owl.call > 0);
  asia.tapOwl();
  advance(2.58);
  assert.equal(events.some(event => event.type === 'owl-takeoff'), false);
  assert.deepEqual(position(asia.owl), asiaPoints.owlPerches[0]);
  advance(.17);
  const start = events.find(event => event.type === 'owl-call');
  const takeoff = events.find(event => event.type === 'owl-takeoff');
  assert.ok(takeoff.time - start.time >= 3.06 && takeoff.time - start.time < 3.10);
  assert.equal(events.filter(event => event.type === 'owl-call').length, 1);
  advance(1.1);
  assert.deepEqual(position(asia.owl), asiaPoints.owlPerches[1]);

  asia.tapOwl();
  advance(.8);
  asia.setNight(false);
  advance(3.8);
  assert.ok(events.some(event => event.type === 'owl-quiet'));
  assert.equal(events.filter(event => event.type === 'owl-takeoff').length, 1);
  assert.ok(asia.owl.sleep > .99);
});
