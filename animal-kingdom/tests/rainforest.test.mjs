import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { makeMonkey, makeSloth } from '../src/rainforest-actors.js';
import { makeToucan } from '../src/rainforest-toucan.js';
import { createRainforest, rainPoints } from '../src/rainforest-state.js';
import { makeRainforestDiorama } from '../src/rainforest-diorama.js';
import { groundHeight } from '../src/diorama.js';

function setup(options) {
  const events = [];
  const rain = createRainforest(event => events.push({ ...event, time: rain.time,
    monkeyReach: rain.monkey.reach, slothReach: rain.sloth.reach, beakReach: rain.toucan.reach,
    groundReach: rain.groundMonkey?.reach, groundGait: rain.groundMonkey?.gait }), options);
  function advance(seconds) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) rain.step(1 / 60);
  }
  return { rain, events, advance };
}

const position = ({ x, y, z }) => ({ x, y, z });

test('醒着的树懒换握后再接点击，巨嘴鸟静默换枝后也接收点按', () => {
  const { rain, events } = setup();
  const advance = seconds => {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) rain.step(1 / 60, true);
  };
  advance(6.25);
  assert.ok(rain.sloth.crawl > 0 && rain.sloth.crawl < 1);
  rain.tapLeaf();
  assert.equal(rain.leaf.phase, 'branch');
  advance(1.72);
  assert.ok(rain.sloth.x < rainPoints.sloth.x - .18);
  assert.equal(rain.sloth.crawl, -1);
  for (let i = 0; i < 190 && rain.toucan.flight <= .3; i++) advance(1 / 60);
  assert.ok(rain.toucan.flight > .3);
  assert.ok(!events.some(e => e.type === 'toucan-call'));
  rain.tapToucan();
  advance(2.15);
  const types = events.map(e => e.type);
  assert.ok(types.indexOf('sloth-crawl') < types.indexOf('sloth-leaf-pick'));
  assert.ok(types.indexOf('toucan-routine-land') < types.indexOf('toucan-call'));
  assert.equal(types.filter(type => type === 'toucan-call').length, 1);
  assert.ok(types.includes('sloth-leaf-mouth'));
  assert.equal(rain.toucan.site, 0);
});

test('独立熟香蕉先被树猴拨落，落地后地猴才跑去捡同一枚', () => {
  const floor = (x, z) => .38 + .024 * (x - 34) + .033 * z;
  const { rain, events, advance } = setup({ groundAt: floor });
  const fruit = rain.dropBanana;
  const groundStart = rain.groundMonkey.x;
  rain.tapDropBanana();
  rain.tapDropBanana();
  assert.equal(fruit.phase, 'branch');
  advance(.24);
  assert.equal(fruit.phase, 'branch');
  assert.equal(rain.groundMonkey.x, groundStart);
  advance(.31);
  assert.equal(fruit.phase, 'drop');
  assert.ok(fruit.y < rainPoints.dropBanana.y);
  assert.equal(rain.groundMonkey.x, groundStart);
  const release = events.find(event => event.type === 'drop-banana-drop');
  assert.equal(release.monkeyReach, 1);
  advance(3.05);
  const land = events.find(event => event.type === 'drop-banana-land');
  const pickup = events.find(event => event.type === 'ground-monkey-pick');
  const mouth = events.find(event => event.type === 'ground-monkey-mouth');
  assert.ok(release.time < land.time && land.time < pickup.time && pickup.time < mouth.time);
  assert.ok(Math.abs(land.y - floor(land.x, land.z) - .061) < .001);
  assert.equal(pickup.groundReach, 1);
  assert.equal(pickup.groundGait, 0);
  assert.equal(release.id, pickup.id);
  assert.equal(pickup.id, mouth.id);
  assert.ok(rain.bananas.every(apple => apple.phase === 'branch'));
  advance(3.1);
  assert.equal(rain.dropBanana, fruit);
  assert.equal(fruit.phase, 'branch');
  assert.equal(rain.groundMonkey.x, groundStart);
});

test('地猴先能独立玩，入夜已落地果保留、地猴歇息，醒后果仍可捡', () => {
  const { rain, events, advance } = setup();
  rain.tapGroundMonkey();
  advance(.25);
  assert.ok(rain.groundMonkey.call > .2);
  assert.equal(rain.monkey.call, 0);
  assert.equal(rain.dropBanana.phase, 'branch');
  rain.tapDropBanana();
  advance(.55);
  rain.setNight(true);
  advance(1.3);
  assert.equal(rain.dropBanana.phase, 'ground');
  assert.equal(rain.groundMonkey.sleep, 1);
  rain.tapGroundMonkey();
  assert.ok(events.some(event => event.type === 'sleep' && event.animal === 'groundMonkey'));
  assert.ok(!events.some(event => event.type === 'ground-monkey-pick'));
  rain.setNight(false);
  rain.tapDropBanana();
  advance(2.15);
  assert.ok(events.some(event => event.type === 'ground-monkey-mouth'));
});

test('坡上的地猴着地脚保持实际高度，双脚停稳后爪点才接触落果', () => {
  const floor = (x, z) => .38 + (x - 34) * .07 + .04 * z;
  const { rain } = setup({ groundAt: floor });
  const rig = makeMonkey(T, { ground: true, scale: .87 });
  let plantedFrames = 0, pickupGap;
  const world = node => node.getWorldPosition(new T.Vector3());
  rain.tapDropBanana();
  for (let frame = 0; frame < 220; frame++) {
    const phase = rain.dropBanana.phase;
    rain.step(1 / 60);
    const actor = rain.groundMonkey;
    rig.root.position.copy(actor);
    rig.root.rotation.y = actor.yaw;
    rig.pose(actor);
    for (const foot of rig.feet) {
      const p = world(foot);
      assert.ok(p.y >= floor(p.x, p.z) - .008);
      if (Math.abs(p.y - floor(p.x, p.z) - .012) < .019) plantedFrames++;
    }
    if (phase === 'ground' && rain.dropBanana.phase === 'held') {
      pickupGap = world(rig.hand).distanceTo(new T.Vector3().copy(rain.dropBanana));
    }
  }
  assert.ok(plantedFrames >= 200);
  assert.ok(pickupGap < .009);
});

test('猴手先碰到香蕉，同一根离梗到嘴，吃完后在原梗长回', () => {
  const { rain, events, advance } = setup();
  const banana = rain.bananas[0];
  rain.tapMonkey();
  for (let tap = 0; tap < 5; tap++) rain.tapBanana(0);
  advance(.26);
  assert.ok(rain.monkey.reach > .2);
  assert.equal(banana.phase, 'branch');
  assert.equal(events.some(event => event.type === 'banana-pick'), false);
  advance(.14);
  assert.ok(rain.monkey.reach < 1 && banana.phase === 'branch');
  advance(.08);
  assert.equal(banana.phase, 'held');
  const pick = events.find(event => event.type === 'banana-pick');
  assert.equal(pick.monkeyReach, 1);
  assert.deepEqual(position(pick), rainPoints.bananas[0]);
  advance(.46);
  assert.equal(banana.phase, 'mouth');
  assert.ok(rain.monkey.chew > 0);
  assert.ok(events.find(event => event.type === 'banana-mouth').time > pick.time);
  assert.equal(events.filter(event => event.type === 'banana-pick').length, 1);
  advance(3.4);
  assert.equal(rain.bananas[0], banana);
  assert.equal(banana.phase, 'branch');
});

test('点远香蕉先走短弧，落到邻枝以后才伸手，换枝本身不摘果', () => {
  const { rain, events, advance } = setup();
  rain.tapBanana(1);
  advance(.32);
  assert.ok(rain.monkey.flight > 0 && rain.monkey.tailGrip === 0);
  assert.equal(rain.bananas[1].phase, 'branch');
  assert.equal(events.some(event => event.type === 'banana-pick'), false);
  advance(1.14);
  const land = events.find(event => event.type === 'monkey-land' && event.index === 1);
  const pick = events.find(event => event.type === 'banana-pick');
  assert.ok(land.time < pick.time);
  assert.equal(pick.id, 1);
  assert.deepEqual(position(rain.monkey), rainPoints.monkeyBranches[1]);
  assert.equal(rain.monkey.tailGrip, 1);
  advance(1.18);
  rain.tapMonkeyBough(0);
  advance(1.18);
  assert.deepEqual(position(rain.monkey), rainPoints.monkeyBranches[0]);
  assert.equal(events.filter(event => event.type === 'banana-pick').length, 1);
});

test('树猴两向起落时脚掌落在两根真实树枝上，手和尾落定后再贴木面', () => {
  const { rain } = setup();
  const canopy = makeRainforestDiorama(new T.Scene(), rainPoints, groundHeight);
  const rig = makeMonkey(T, { perchTopAt: canopy.monkeyTopAt });
  const world = new T.Vector3();
  function pose() {
    rig.root.position.copy(rain.monkey);
    rig.root.rotation.y = rain.monkey.yaw;
    rig.pose(rain.monkey);
    rig.root.updateMatrixWorld(true);
  }
  for (const departure of [0, 1]) {
    pose();
    for (const contact of [...rig.feet, rig.supportHand, rig.tailGrip]) {
      contact.getWorldPosition(world);
      const surface = canopy.monkeyTopAt(departure, world.x, world.z);
      assert.ok(world.y - surface >= .009 && world.y - surface < .021);
    }
    rain.tapMonkeyBough(1 - departure);
    let freeFrames = 0;
    for (let frame = 0; frame < 147; frame++) {
      rain.step(1 / 120);
      pose();
      for (const foot of rig.feet) {
        foot.getWorldPosition(world);
        for (const site of [0, 1]) {
          const surface = canopy.monkeyTopAt(site, world.x, world.z);
          assert.ok(world.y >= surface - .003, '猴脚不能从树枝下穿出');
        }
        if (rain.monkey.air > .8 && world.y > 1.96) freeFrames++;
      }
    }
    assert.ok(freeFrames >= 45);
    assert.equal(rain.monkey.site, 1 - departure);
  }
});

test('地猴跑去捡香蕉时，真实坡面不会吃进腿部关节', () => {
  const { rain, events } = setup({ groundAt: groundHeight });
  const rig = makeMonkey(T, { ground: true, scale: .87 });
  const knees = rig.root.children.filter(node => node.name === 'Bent capuchin hind leg bend');
  const point = new T.Vector3();
  assert.equal(knees.length, 2);
  rain.tapDropBanana();
  for (let frame = 0; frame < 360; frame++) {
    rain.step(1 / 75, true);
    rig.root.position.copy(rain.groundMonkey);
    rig.root.rotation.y = rain.groundMonkey.yaw;
    rig.pose(rain.groundMonkey);
    rig.root.updateMatrixWorld(true);
    for (const knee of knees) {
      const { position: vertices } = knee.geometry.attributes;
      for (let i = 0; i < vertices.count; i += 7) {
        point.fromBufferAttribute(vertices, i).applyMatrix4(knee.matrixWorld);
        assert.ok(point.y >= groundHeight(point.x, point.z) - .003);
      }
    }
  }
  assert.ok(events.some(({ type }) => type === 'ground-monkey-pick'));
});

test('入夜猴子先落稳，清掉未摘果的预约，夜点只出休息反馈', () => {
  const { rain, events, advance } = setup();
  rain.tapBanana(1);
  advance(.32);
  rain.setNight(true);
  assert.equal(rain.monkey.sleep, 0);
  advance(1.4);
  assert.equal(rain.monkey.site, 1);
  assert.equal(rain.monkey.sleep, 1);
  assert.equal(rain.monkey.tailGrip, 1);
  rain.tapMonkey();
  rain.tapBanana(1);
  assert.deepEqual(events.filter(event => event.type === 'sleep').map(event => event.animal), ['monkey', 'monkey']);
  assert.ok(rain.bananas.every(banana => banana.phase === 'branch'));
  assert.equal(events.some(event => event.type === 'banana-pick'), false);
});

test('树懒初见清醒，叶摸满才摘，送嘴后才嚼，闲置二十四秒后短歇', () => {
  const { rain, events, advance } = setup();
  advance(18);
  assert.equal(rain.sloth.sleep, 0);
  rain.tapLeaf();
  const touched = rain.time;
  advance(.27);
  assert.ok(rain.sloth.reach > 0);
  assert.equal(rain.leaf.phase, 'branch');
  advance(.25);
  assert.ok(rain.sloth.reach < 1 && rain.leaf.phase === 'branch');
  advance(.12);
  assert.equal(rain.leaf.phase, 'held');
  assert.equal(events.find(event => event.type === 'sloth-leaf-pick').slothReach, 1);
  assert.equal(rain.sloth.gripY, rainPoints.slothSupport.y - rainPoints.sloth.y);
  advance(.59);
  assert.equal(rain.leaf.phase, 'mouth');
  assert.ok(rain.sloth.chew > 0);
  advance(22.4);
  assert.equal(rain.sloth.sleep, 0);
  advance(.83);
  const nap = events.find(event => event.type === 'sloth-nap');
  assert.ok(nap.time - touched >= 24 && nap.time - touched < 24.05);
  assert.ok(rain.sloth.sleep > .3);
  rain.tapLeaf();
  assert.ok(events.some(event => event.type === 'sleep' && event.animal === 'sloth'));
  advance(3.17);
  assert.equal(rain.sloth.sleep, 0);
  assert.equal(rain.leaf.phase, 'branch');
  rain.tapLeaf();
  advance(.71);
  assert.equal(events.filter(event => event.type === 'sloth-leaf-pick').length, 2);
});

test('树懒入夜睡着，点时不移动叶片，天亮可继续摘', () => {
  const { rain, events, advance } = setup();
  rain.setNight(true);
  advance(.78);
  assert.equal(rain.sloth.sleep, 1);
  rain.tapSloth();
  advance(.78);
  assert.equal(rain.leaf.phase, 'branch');
  assert.ok(events.some(event => event.type === 'sleep' && event.animal === 'sloth'));
  rain.setNight(false);
  advance(.53);
  rain.tapLeaf();
  advance(.67);
  assert.equal(rain.leaf.phase, 'held');
});

test('树懒身体探爪、枝端先动再抱枝摆、低叶才开吃，固定三爪不滑', () => {
  const { rain, events, advance } = setup();
  const rig = makeSloth(T);
  rig.root.position.copy(rain.sloth);
  rig.root.rotation.y = rain.sloth.yaw;
  const anchors = () => {
    rig.pose(rain.sloth);
    return rig.fixedGrip.map(grip => grip.getWorldPosition(new T.Vector3()).toArray());
  };
  const before = anchors();
  const clawAtRest = rig.hand.getWorldPosition(new T.Vector3());
  rain.tapSloth();
  rain.tapSloth();
  advance(.65);
  assert.ok(rain.sloth.stretch > .95);
  assert.deepEqual(anchors(), before);
  assert.ok(rig.hand.getWorldPosition(new T.Vector3()).distanceTo(clawAtRest) > .25);
  assert.equal(rain.leaf.phase, 'branch');
  assert.equal(events.filter(event => event.type === 'sloth-stretch').length, 1);
  advance(.53);
  assert.ok(rain.sloth.stretch < .02);
  rain.tapSlothBough();
  advance(.08);
  assert.ok(rain.sloth.boughShake > 0);
  assert.equal(rain.sloth.sway, 0);
  assert.ok(!events.some(event => event.type === 'sloth-sway'));
  advance(.61);
  assert.ok(rain.sloth.sway > .75);
  assert.deepEqual(anchors(), before);
  assert.equal(rain.leaf.phase, 'branch');
  assert.ok(events.find(event => event.type === 'sloth-bough-touch').time < events.find(event => event.type === 'sloth-sway').time);
  advance(.60);
  rain.tapLeaf();
  advance(.62);
  assert.equal(rain.leaf.phase, 'held');
  assert.deepEqual(anchors(), before);
});

test('同图联动限于近邻实际接触以后，远枝与动物手上的动作都优先', () => {
  const { rain, events, advance } = setup();
  rain.tapMonkeyBough(1);
  advance(.23);
  assert.equal(rain.sloth.watch, 0);
  advance(.84);
  assert.ok(rain.sloth.watch < -.15);
  assert.equal(events.find(event => event.type === 'sloth-watch').time,
    events.find(event => event.type === 'monkey-land').time);
  rain.tapMonkeyBough(0);
  advance(1.1);
  assert.equal(events.filter(event => event.type === 'sloth-watch').length, 1);
  assert.equal(rain.sloth.watch, 0);

  rain.tapSlothBough();
  advance(.29);
  assert.equal(rain.toucan.look, 0);
  advance(.48);
  assert.ok(Math.abs(rain.toucan.look) > .08);
  assert.equal(events.find(event => event.type === 'toucan-watch').time,
    events.find(event => event.type === 'sloth-sway').time);
  assert.equal(rain.berry.phase, 'branch');
  advance(.53);
  rain.tapToucan();
  advance(1.10);
  rain.tapSlothBough();
  advance(1.30);
  assert.equal(events.filter(event => event.type === 'toucan-watch').length, 1);
  assert.equal(rain.toucan.look, 0);

  rain.tapLeaf();
  rain.tapMonkeyBough(1);
  advance(1.2);
  assert.equal(rain.leaf.phase, 'mouth');
  assert.equal(events.filter(event => event.type === 'sloth-watch').length, 1);
});

test('树懒停歇时三个入口统一出 Zzz，入夜迟来的小摆不会传给鸟', () => {
  const { rain, events, advance } = setup();
  rain.tapSlothBough();
  advance(.23);
  rain.setNight(true);
  advance(.74);
  assert.equal(rain.sloth.sleep, 1);
  assert.equal(rain.sloth.sway, 0);
  assert.equal(rain.sloth.boughShake, 0);
  rain.tapSloth();
  rain.tapSlothBough();
  rain.tapLeaf();
  assert.equal(events.filter(event => event.type === 'sleep' && event.animal === 'sloth').length, 3);
  assert.ok(!events.some(event => event.type === 'toucan-watch'));
  rain.setNight(false);
  advance(.50);
  rain.tapSloth();
  advance(.40);
  assert.ok(rain.sloth.stretch > .5);
});

test('低枝巨嘴鸟和树懒一起探向果实，鸟叼到同一颗再抛接', () => {
  const { rain, events, advance } = setup();
  const berry = rain.berry;
  rain.tapBerry();
  advance(.24);
  assert.equal(berry.phase, 'branch');
  assert.ok(rain.sloth.reach > .05 && rain.toucan.reach > .1);
  assert.equal(events.some(event => event.type === 'berry-pick'), false);
  advance(.13);
  assert.ok(rain.toucan.reach < 1 && berry.phase === 'branch');
  advance(.10);
  assert.equal(berry.phase, 'held');
  assert.equal(events.find(event => event.type === 'berry-pick').beakReach, 1);
  assert.equal(berry.owner, 'toucan');
  advance(.39);
  assert.equal(berry.phase, 'toss');
  assert.ok(berry.tossY > .1 && berry.tossY < .20);
  advance(.29);
  assert.equal(berry.phase, 'caught');
  assert.equal(berry.tossY, 0);
  assert.equal(rain.berry, berry);
  assert.deepEqual(events.filter(event => ['berry-pick', 'berry-toss', 'berry-catch'].includes(event.type)).map(event => event.type),
    ['berry-pick', 'berry-toss', 'berry-catch']);

});

test('高枝巨嘴鸟探得不够远，树懒在果实实际落进手爪后才送嘴', () => {
  const { rain, events, advance } = setup();
  const berry = rain.berry;
  const sloth = makeSloth(T), bird = makeToucan(T);
  rain.tapToucan();
  advance(1.15);
  assert.deepEqual(position(rain.toucan), rainPoints.toucanBranches[1]);
  assert.ok(events.some(event => event.type === 'toucan-call'));
  rain.tapBerry();
  rain.tapBerry();
  advance(.34);
  assert.ok(rain.toucan.reach > .08 && rain.sloth.reach > .08);
  assert.equal(berry.phase, 'branch');
  let drop = false;
  while (rain.time < 3.2 && berry.phase !== 'held') {
    advance(1 / 60);
    if (berry.phase === 'drop') drop = true;
    bird.root.position.copy(rain.toucan);
    bird.root.rotation.y = rain.toucan.yaw;
    bird.pose(rain.toucan);
    assert.ok(bird.beak.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(berry.x, berry.y, berry.z)) > .30);
  }
  assert.ok(drop);
  assert.equal(berry.phase, 'held');
  assert.equal(berry.owner, 'sloth');
  sloth.root.position.copy(rain.sloth);
  sloth.root.rotation.y = rain.sloth.yaw;
  sloth.pose(rain.sloth);
  assert.ok(sloth.hand.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(berry.x, berry.y, berry.z)) < .001);
  advance(1);
  assert.ok(events.some(event => event.type === 'sloth-berry-mouth'));
  assert.equal(events.filter(event => event.type === 'berry-pick').length, 1);
  advance(3);
  assert.equal(rain.berry, berry);
  assert.equal(berry.phase, 'branch');
  assert.deepEqual(position(berry), rainPoints.berry);
});

test('短睡中的树懒留在枝下，只有清醒的巨嘴鸟吃果，夜晚果留在枝上', () => {
  const { rain, events, advance } = setup();
  const start = () => rain.step(1 / 60, true);
  start();
  advance(24.4);
  assert.ok(rain.sloth.sleep > .65);
  rain.tapBerry();
  advance(.50);
  assert.equal(rain.sloth.reach, 0);
  assert.equal(rain.berry.owner, 'toucan');
  advance(3.4);
  rain.setNight(true);
  advance(.55);
  assert.ok(rain.toucan.sleep > .9);
  const total = events.filter(event => event.type === 'berry-pick').length;
  rain.tapBerry();
  rain.tapToucan();
  advance(1.4);
  assert.equal(events.filter(event => event.type === 'berry-pick').length, total);
  assert.equal(rain.berry.phase, 'branch');
  assert.equal(rain.toucan.flight, 0);
});

test('抢果途中入夜，以果实是否已离枝决定停止或顺势接完', () => {
  for (const release of [false, true]) {
    const { rain, events, advance } = setup();
    rain.tapToucan();
    advance(1);
    rain.tapBerry();
    advance(release ? .52 : .23);
    assert.equal(rain.berry.phase, release ? 'drop' : 'branch');
    rain.setNight(true);
    advance(2.7);
    assert.equal(rain.berry.phase, release ? 'spent' : 'branch');
    assert.equal(events.filter(event => event.type === 'sloth-berry-mouth').length, Number(release));
    assert.equal(rain.sloth.sleep, 1);
    assert.equal(rain.toucan.sleep, 1);
  }
});
