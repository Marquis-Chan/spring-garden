import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { groundHeight } from '../src/diorama.js';
import { createRiver, riverPoints } from '../src/river-state.js';
import { makeHippo } from '../src/river-actors.js';
import { makeRiverDiorama } from '../src/river-diorama.js';

function setup(options) {
  const events = [];
  const river = createRiver(event => events.push({ ...event, time: river.time }), options);

  function advance(seconds, active) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) river.step(1 / 60, active);
  }

  return { river, events, advance };
}

const position = ({ x, y, z }) => ({ x, y, z });
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('河岸的两只小鸭各自在浅水活动，点任一只跟游，点蛙只引附近小鸭看过去', () => {
  const {river,events,advance} = setup({groundAt:groundHeight});
  const [lead,outer] = river.ducks;
  const start = position(lead);
  advance(2.1,true);
  assert.ok(gap(start,lead)>.13);
  assert.ok(gap(lead,outer)>.65);
  river.tapDuck(1);
  advance(.63,true);
  assert.ok(outer.headUp>.40 && lead.headUp>.25 && lead.call===0);
  assert.ok(events.some(e=>e.type==='river-duck-reply'&&e.index===0));
  advance(1.75,true);
  river.tapFrog();
  advance(.30,true);
  assert.ok(river.frog.throat>.08);
  assert.ok(events.some(e=>e.type==='river-duck-listens'&&e.index===0));
  assert.ok(!events.some(e=>e.type==='river-duck-listens'&&e.index===1));
  river.setNight(true);
  advance(.70,true);
  const sleeping = position(lead);
  river.tapDuck(0);
  advance(.75,true);
  assert.equal(lead.sleep,1);
  assert.deepEqual(position(lead),sleeping);
  assert.equal(events.at(-1).animal,'river-duck');
});

test('河马沉回水线后才发一圈波，先到近叶再到远叶', () => {
  const { river, events, advance } = setup();
  river.tapHippo();
  assert.equal(events[0].type, 'hippo-call');
  advance(.35);
  assert.ok(river.hippo.lift > .7 && river.hippo.gape > 0);
  assert.equal(river.waves.length, 0);
  river.tapHippo();
  advance(.40);
  assert.equal(events.some(event => event.type === 'wave'), false);
  assert.ok(river.leaves.every(leaf => leaf.bob === 0));

  advance(.50);
  const wave = events.find(event => event.type === 'wave');
  assert.deepEqual(position(wave), riverPoints.waveOrigin);
  assert.ok(wave.speed > 0);
  assert.ok(river.waves[0].radius > 0);
  assert.deepEqual(events.filter(event => event.type === 'wave-leaf').map(event => event.index), [0]);
  assert.ok(river.leaves[0].bob > 0);
  assert.equal(river.leaves[1].bob, 0);

  advance(.75);
  const leaves = events.filter(event => event.type === 'wave-leaf');
  assert.deepEqual(leaves.map(event => event.index), [0, 1]);
  for (const event of leaves) {
    assert.ok(Math.abs(event.time - wave.time - gap(event, wave) / wave.speed) < .025);
  }
  assert.equal(events.filter(event => event.type === 'wave').length, 1);
  assert.deepEqual(events.filter(event => event.type === 'wave-fish').map(event => event.index), [0, 1]);
});

test('同一处波能到近龟，到不了远岸踏石，回到浅水可以再玩', () => {
  const { river, events, advance } = setup();
  river.tapHippo();
  advance(1.58);
  assert.ok(events.some(event => event.type === 'wave-turtle'));
  assert.ok(Math.abs(river.turtle.listen) > .10);

  river.tapStone(1);
  advance(.42);
  assert.ok(river.turtle.paddle > 0 && river.turtle.site === 0);
  advance(.90);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[1]);
  assert.equal(river.turtle.bask, 1);

  river.tapHippo();
  advance(2);
  assert.equal(events.filter(event => event.type === 'wave-turtle').length, 1);
  assert.equal(river.turtle.listen, 0);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[1]);

  river.tapStone(0);
  advance(1.4);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[0]);
  assert.equal(river.turtle.bask, 0);
  river.tapHippo();
  advance(1.58);
  assert.equal(events.filter(event => event.type === 'wave-turtle').length, 2);
});

test('点壳缩头再探但不换位，缩壳时水波经过不会补播转头', () => {
  const { river, events, advance } = setup();
  const origin = position(river.turtle);
  river.tapHippo();
  advance(1.31);
  river.tapTurtle();
  advance(.20);
  assert.ok(river.turtle.reach < .35);
  assert.equal(river.turtle.listen, 0);
  assert.deepEqual(position(river.turtle), origin);
  advance(1.25);
  assert.equal(river.turtle.reach, 1);
  assert.equal(events.some(event => event.type === 'wave-turtle'), false);
  assert.equal(river.turtle.listen, 0);
});

test('连续点踏石只保留最后一个在途目标，夜间到站后休息', () => {
  const { river, events, advance } = setup();
  river.tapStone(1);
  advance(.3);
  river.tapStone(0);
  river.tapStone(1);
  advance(1.3);
  assert.equal(river.turtle.site, 1);

  river.tapStone(0);
  advance(.3);
  river.tapStone(1);
  river.setNight(true);
  assert.equal(river.turtle.sleep, 0);
  advance(1.6);
  assert.equal(river.turtle.site, 0);
  assert.equal(river.turtle.sleep, 1);
  river.tapStone(1);
  river.tapTurtle();
  river.tapHippo();
  advance(1.8);
  assert.equal(river.turtle.site, 0);
  assert.equal(river.turtle.listen, 0);
  assert.equal(events.filter(event => event.type === 'sleep' && event.animal === 'turtle').length, 2);
  assert.ok(events.some(event => event.type === 'wave'));

  river.setNight(false);
  advance(.6);
  river.tapStone(1);
  advance(1.3);
  assert.equal(river.turtle.site, 1);
  assert.equal(river.turtle.sleep, 0);
});

test('龟到石缘前仍在划水，接近晒石时已抬脚，回程沿同一浅坡入水', () => {
  const { river, advance } = setup();
  for (const site of [1, 0]) {
    river.tapStone(site);
    const samples = [];
    for (let frame = 0; frame < 73; frame++) {
      advance(1 / 60);
      samples.push({ ...river.turtle });
    }
    assert.ok(samples.some(pose => pose.x < 25.54 && pose.x > 25.03 && pose.paddle > .65 && pose.y < riverPoints.waterY));
    const approach = samples.filter(pose => pose.x < 24.98 && pose.x > 24.86);
    assert.ok(approach.some(pose => pose.paddle > .44 && pose.gait > .28 && pose.y < .53));
    const atLip = samples.filter(pose => pose.x < 24.83 && pose.x > 24.73);
    assert.ok(atLip.length);
    assert.ok(atLip.every(pose => pose.y > .53 && pose.gait > .25));
    assert.deepEqual(position(river.turtle), riverPoints.turtleSites[site]);
  }
});

test('犀牛沿独立岸路采样地面高度，走到所选草边才低头探鼻', () => {
  const groundAt = x => .62 + (x - 29.45) * .04;
  const { river, events, advance } = setup({ groundAt });
  river.tapStone(1);
  river.tapGrass(1);
  assert.equal(events.at(-1).type, 'grass-select');
  advance(.3);
  assert.ok(river.grass[1].bend > 0);
  assert.ok(river.rhino.gait > 0);
  assert.equal(river.rhino.sniff, 0);

  for (let frame = 0; frame < 60; frame++) {
    advance(1 / 60);
    assert.ok(Math.abs(river.rhino.y - groundAt(river.rhino.x, river.rhino.z)) < 1e-6);
    assert.ok(gap(river.rhino, river.turtle) > 3);
  }
  const sniff = events.find(event => event.type === 'rhino-sniff');
  const stop = events.find(event => event.type === 'rhino-stop');
  assert.equal(sniff.index, 1);
  assert.ok(sniff.time - stop.time > .36);
  assert.equal(river.rhino.site, 1);
  assert.ok(gap(river.rhino, riverPoints.grass[1]) > .90);
  assert.ok(gap(river.rhino, riverPoints.grass[1]) < 1.02);
  assert.ok(river.grass[1].bend > 0 && river.rhino.sniff > 0);
  assert.equal(river.grass[0].bend, 0);

  advance(.9);
  river.tapRhino();
  advance(1.1);
  assert.equal(river.rhino.site, 0);
  assert.equal(events.filter(event => event.type === 'rhino-call').length, 1);
});

test('点鱼能潜游，两条鱼分别留在各自浅水范围', () => {
  const { river, advance } = setup();
  const { pool, waterY } = riverPoints;
  river.tapFish(0);
  advance(.22);
  assert.ok(river.fish[0].dive > .6);
  assert.equal(river.fish[1].dive, 0);
  for (let frame = 0; frame < 300; frame++) {
    advance(1 / 60);
    assert.ok(gap(river.fish[0], river.fish[1]) > .47);
    assert.ok(gap(river.fish[0], river.hippo) > 1.30);
    for (const [index, fish] of river.fish.entries()) {
      assert.ok(gap(fish, riverPoints.fish[index]) < .27);
      assert.ok(Math.hypot((fish.x - pool.x) / pool.rx, (fish.z - pool.z) / pool.rz) < .81);
      assert.ok(fish.y < waterY);
    }
  }
});

test('河马、龟和犀牛各自在合适水深或岸上安静巡游，不替孩子打开道具', () => {
  const groundAt = (x, z) => .58 + (x - 29.45) * .04 + (z - 5.90) * .02;
  const { river, events, advance } = setup({ groundAt });
  const creatures = [river.hippo, river.turtle, river.rhino];
  const starts = creatures.map(position);
  const moved = [false, false, false];
  let paddled = false;
  for (let sample = 0; sample < 140; sample++) {
    advance(.05, true);
    creatures.forEach((actor, i) => { moved[i] ||= gap(actor, starts[i]) > .22; });
    paddled ||= river.turtle.paddle > .3;
    assert.equal(river.rhino.y, groundAt(river.rhino.x, river.rhino.z));
    assert.equal(river.turtle.site, 0);
    assert.ok(river.turtle.y < riverPoints.waterY);
  }
  assert.ok(paddled);
  assert.deepEqual(moved, [true, true, true]);
  assert.deepEqual(events, []);
  river.tapStone(1);
  advance(1.4, true);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[1]);
  advance(5.2, true);
  assert.equal(river.turtle.site, 1);
  assert.equal(river.turtle.y, riverPoints.turtleSites[1].y);
  assert.ok(gap(river.turtle, riverPoints.turtleSites[1]) < .21);
});

test('河马安静换位后仍从鼻前的实际水面推出波，不回跳到旧水心', () => {
  const { river, events, advance } = setup();
  advance(2.95, true);
  const body = position(river.hippo);
  assert.ok(gap(body, riverPoints.hippo) > .24);
  river.tapHippo();
  assert.equal(events.at(-1).type, 'hippo-call');
  while (river.time < 5.4 && !events.some(({ type }) => type === 'wave')) advance(.05, true);
  const wave = events.find(({ type }) => type === 'wave');
  assert.ok(wave);
  assert.deepEqual(position(river.hippo), body);
  assert.ok(Math.abs(wave.x - (body.x + Math.sin(river.hippo.yaw) * .61)) < .0001);
  assert.ok(Math.abs(wave.z - (body.z + Math.cos(river.hippo.yaw) * .61)) < .0001);
});

test('犀牛鼻碰近水草后才引起近鱼的一次急游，远水草和远鱼不触发', () => {
  const { river, events, advance } = setup();
  river.tapGrass(0);
  advance(.27, true);
  assert.ok(!events.some(({ type }) => type === 'grass-fish-look'));
  while (river.time < 1.90 && !events.some(({ type }) => type === 'rhino-sniff')) advance(.05, true);
  advance(.18, true);
  const near = events.findIndex(({ type, index }) => type === 'rhino-sniff' && index === 0);
  const react = events.findIndex(({ type }) => type === 'grass-fish-look');
  assert.ok(near >= 0 && react > near);
  assert.equal(events[react].index, 0);
  assert.ok(river.fish[0].alert > .2);
  assert.equal(river.fish[1].alert, 0);
  river.tapGrass(1);
  advance(2.1, true);
  assert.ok(events.some(({ type, index }) => type === 'rhino-sniff' && index === 1));
  assert.equal(events.filter(({ type }) => type === 'grass-fish-look').length, 1);
});

test('两条鱼靠岸转向和下潜时也留在可容纳鳍身的真实水层内', () => {
  const { river, advance } = setup({ groundAt: groundHeight });
  for (let frame = 0; frame < 660; frame++) {
    if ([45, 320].includes(frame)) river.tapFish(0);
    if ([140, 420].includes(frame)) river.tapFish(1);
    advance(1 / 60, true);
    for (const fish of river.fish) {
      assert.ok(fish.y >= groundHeight(fish.x, fish.z) + .065 - 1e-8);
      assert.ok(fish.y <= riverPoints.waterY - .067 + 1e-8);
    }
  }
});

test('刷牙先转正张嘴，鼠标只在牙面活动，牙刷收回后才闭嘴', () => {
  const { river, events, advance } = setup();
  advance(2.6, true);
  const anchor = position(river.hippo);
  river.tapToothbrush();
  assert.equal(river.toothbrush.phase, 'opening');
  advance(.35, true);
  assert.equal(river.toothbrush.amount, 0);
  advance(1.5, true);
  assert.equal(river.toothbrush.phase, 'active');
  assert.deepEqual(position(river.hippo), anchor);
  assert.equal(river.hippo.gape, 1);
  assert.equal(river.hippo.yaw, 0);
  river.moveToothbrush(-4, 3);
  advance(.14, true);
  assert.equal(river.toothbrush.u, -1);
  assert.equal(river.toothbrush.v, 1);
  river.moveToothbrush(.8, 0);
  advance(.12, true);
  assert.ok(river.toothbrush.stroke > 0);
  assert.ok(events.some(({ type }) => type === 'hippo-brush-stroke'));
  river.tapToothbrush();
  advance(.24, true);
  assert.equal(river.toothbrush.phase, 'returning');
  assert.equal(river.hippo.gape, 1);
  assert.ok(river.toothbrush.amount > 0);
  advance(.35, true);
  assert.equal(river.toothbrush.amount, 0);
  advance(.7, true);
  assert.equal(river.toothbrush.phase, 'rest');
  assert.equal(river.hippo.gape, 0);
  assert.equal(events.some(({ type }) => type === 'wave'), false);
  river.tapHippo();
  advance(1.5, true);
  assert.ok(events.some(({ type }) => type === 'wave'));
});

test('连点刷牙、离场收刷和正在掀浪时预约，都按同一顺序收束', () => {
  const { river, events, advance } = setup();
  river.tapHippo();
  advance(.30, true);
  river.tapToothbrush();
  advance(2.1, true);
  assert.equal(river.toothbrush.phase, 'active');
  assert.equal(events.filter(({ type }) => type === 'wave').length, 1);
  river.returnToothbrush();
  river.returnToothbrush();
  river.tapToothbrush();
  advance(1.3, false);
  assert.equal(river.toothbrush.phase, 'rest');
  assert.equal(river.hippo.gape, 0);
  river.tapToothbrush();
  advance(.25, true);
  river.returnToothbrush();
  advance(1.3, false);
  assert.equal(river.toothbrush.phase, 'rest');
  assert.equal(river.toothbrush.amount, 0);
});

test('实际牙刷只在河马下牙外侧运行，刷柄和刷头有几何净空', () => {
  const { river, advance } = setup({ groundAt: groundHeight });
  const model = makeHippo(T, groundHeight);
  const bank = makeRiverDiorama(new T.Scene(), riverPoints, groundHeight);
  river.tapToothbrush();
  advance(1.6, true);
  model.root.position.set(river.hippo.x, river.hippo.y, river.hippo.z);
  model.root.rotation.y = river.hippo.yaw;
  const head = new T.Vector3(), rail = new T.Vector3();
  const mouth = ['Hippo inner mouth', 'Hippopotamus soft lower jaw', 'Hippo tongue']
    .map(name => model.root.getObjectByName(name)).concat(model.teeth);
  for (const surface of mouth) {
    surface.material = surface.material.clone();
    surface.material.side = T.DoubleSide;
  }
  const ray = new T.Raycaster(), direction = new T.Vector3(.918, .371, .137).normalize();
  function insideMouth(point) {
    ray.set(point, direction);
    return mouth.some(surface => ray.intersectObject(surface, false)
      .filter((hit, index, all) => index === 0 || Math.abs(hit.distance - all[index - 1].distance) > 1e-6)
      .length % 2 === 1);
  }
  for (let i = 0; i <= 24; i++) {
    river.moveToothbrush(-1 + i / 12, i % 2 ? -1 : 1);
    advance(1 / 60, true);
    model.pose(river.hippo);
    model.root.updateWorldMatrix(true, true);
    bank.tick(river, 0, 0, model);
    model.brushRail(river.toothbrush.u, river.toothbrush.v, rail);
    bank.toothbrush.getWorldPosition(head);
    assert.ok(head.distanceTo(rail) < .002);
    assert.equal(insideMouth(rail), false, '刷毛尖留在牙冠的外侧');
    assert.ok(bank.toothbrushHead.getWorldPosition(head).distanceTo(rail) > .055);
    assert.equal(insideMouth(head), false, '刷头没有被口腔实体或牙床包住');
    for (const strand of bank.toothbrush.children.filter(child => child.name === '河马牙刷柔软刷毛')) {
      const vertices = strand.geometry.attributes.position;
      for (let n = 0; n < vertices.count; n++) {
        if (vertices.getY(n) > -.028) continue;
        head.fromBufferAttribute(vertices, n).applyMatrix4(strand.matrixWorld);
        assert.equal(insideMouth(head), false, '每根刷毛的端面也停在各颗牙冠外');
      }
    }
    assert.ok(rail.y > riverPoints.waterY + .08);
  }
});
