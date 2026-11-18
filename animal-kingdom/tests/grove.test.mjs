import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { createGrove, grovePoints } from '../src/grove-state.js';
import { makeRabbit } from '../src/grove-actors.js';

function setup() {
  const events = [];
  const grove = createGrove(event => events.push({ ...event, time: grove.time }));

  function advance(seconds) {
    const frames = Math.ceil(seconds * 60);
    for (let frame = 0; frame < frames; frame++) grove.step(1 / 60);
  }

  return { grove, events, advance };
}

function position(actor) {
  return { x: actor.x, y: actor.y, z: actor.z };
}

test('林缘日常短跳和换枝分时进行，靠近草丛才听见松果', () => {
  const { grove, events } = setup();
  const advance = seconds => {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) grove.step(1 / 60, true);
  };
  advance(4.1);
  assert.ok(Math.hypot(grove.rabbit.x - grovePoints.grasses[0].x,
    grove.rabbit.z - grovePoints.grasses[0].z) > .28);
  assert.equal(grove.rabbit.cover, 0);
  assert.equal(grove.bird.perch, 0);
  advance(4);
  assert.equal(grove.bird.perch, 1);
  assert.ok(events.some(event => event.type === 'flight' && event.reason === 'routine'));
  assert.ok(!events.some(event => event.type === 'flight' && event.reason === 'rabbit'));
  assert.equal(grove.listenNear({ x: 20, z: 20 }), false);
  assert.equal(grove.listenNear({ x: 9.42, z: -.16 }), true);
  advance(.27);
  assert.ok(Math.abs(grove.rabbit.listen) > .1);
  grove.setNight(true);
  advance(6.5);
  assert.ok(grove.bird.sleep > .9);
});

test('林缘开场有半露的兔和低枝上的鸟，静置时没有自动演出', () => {
  const { grove, events, advance } = setup();
  assert.deepEqual(position(grove.rabbit), grovePoints.grasses[0]);
  assert.ok(grove.rabbit.peek > 0 && grove.rabbit.peek < 1);
  assert.deepEqual(position(grove.bird), grovePoints.branches[0]);

  advance(12);
  assert.deepEqual(events, []);
  assert.equal(grove.rabbit.cover, 0);
  assert.equal(grove.bird.perch, 0);
});

test('点草先动，兔真正经过低枝附近后鸟才换枝', () => {
  const { grove, events, advance } = setup();
  grove.tapGrass(0);
  assert.deepEqual(events.map(event => event.type), ['grass', 'peek']);
  assert.equal(events[0].index, 0);
  advance(.14);
  assert.ok(grove.rabbit.crouch > 0);
  assert.equal(grove.bird.perch, 0);
  assert.equal(events.some(event => event.type === 'flight'), false);

  advance(1.55);
  const takeoff = events.find(event => event.type === 'hop' && event.phase === 'start');
  const flight = events.find(event => event.type === 'flight' && event.phase === 'start');
  const landing = events.find(event => event.type === 'hop' && event.phase === 'land');
  assert.ok(takeoff.time < flight.time && flight.time < landing.time);
  assert.equal(flight.reason, 'rabbit');
  assert.equal(grove.rabbit.cover, null);
  assert.deepEqual(position(grove.rabbit), grovePoints.clearing);
  assert.equal(grove.bird.perch, 1);
  assert.deepEqual(position(grove.bird), grovePoints.branches[1]);
});

test('兔走远离低枝的路线时鸟留在原枝，快速重复点草只跳一次', () => {
  const { grove, events, advance } = setup();
  grove.tapGrass(1);
  advance(.1);
  for (let tap = 0; tap < 6; tap++) grove.tapGrass(1);
  advance(1.4);

  assert.equal(grove.rabbit.cover, 1);
  assert.deepEqual(position(grove.rabbit), grovePoints.grasses[1]);
  assert.equal(grove.bird.perch, 0);
  assert.equal(events.filter(event => event.type === 'hop' && event.phase === 'land').length, 1);
  assert.equal(events.filter(event => event.type === 'flight').length, 0);
});

test('点鸟后先飞、落地再啄弯草，兔改变耳朵方向，再点鸟回低枝', () => {
  const { grove, events, advance } = setup();
  grove.tapBird();
  assert.equal(events[0].type, 'flight');
  assert.equal(events[0].phase, 'start');
  assert.equal(events[0].reason, 'tap');
  advance(.25);
  assert.ok(grove.bird.flight > 0);
  assert.equal(events.some(event => event.type === 'peck'), false);
  assert.equal(grove.rabbit.listen, 0);

  advance(.60);
  assert.deepEqual(position(grove.bird), grovePoints.peck);
  assert.equal(grove.bird.perch, null);
  assert.ok(grove.bird.peck > 0);
  assert.equal(grove.rabbit.listen,0);
  assert.equal(events.some(event=>event.type==='peck'),false);
  advance(.23);
  assert.ok(Math.abs(grove.rabbit.listen) > .10);
  const land = events.findIndex(event => event.type === 'flight' && event.phase === 'land');
  const peck = events.findIndex(event => event.type === 'peck');
  const grass = events.findIndex(event => event.type === 'grass' && event.source === 'peck');
  assert.ok(land >= 0 && land < peck && peck < grass);
  assert.equal(events[grass].index, 0);

  grove.tapBird();
  advance(1.15);
  assert.equal(grove.bird.perch, 0);
  assert.deepEqual(position(grove.bird), grovePoints.branches[0]);
  assert.equal(grove.bird.peck, 0);
});

test('把鸟带回低枝后还可再玩，点空地的兔跳去右草丛时鸟不跟', () => {
  const { grove, events, advance } = setup();
  grove.tapGrass(0);
  advance(1.7);
  grove.tapBird();
  advance(.9);
  grove.tapBird();
  advance(.9);
  assert.equal(grove.bird.perch, 0);

  const reassigned = () => events.filter(event => event.type === 'flight' && event.phase === 'start' && event.reason === 'rabbit').length;
  grove.tapRabbit();
  advance(1.2);
  assert.equal(grove.rabbit.cover, 1);
  assert.equal(grove.bird.perch, 0);
  assert.equal(reassigned(), 1);

  grove.tapGrass(0);
  advance(1.1);
  grove.tapGrass(0);
  advance(1.7);
  assert.equal(grove.bird.perch, 1);
  assert.equal(reassigned(), 2);
});

test('夜间鸟在枝上渐睡，点按只回应休息，兔从下方经过也不吵醒它', () => {
  const { grove, events, advance } = setup();
  grove.setNight(true);
  advance(.15);
  assert.ok(grove.bird.sleep > 0 && grove.bird.sleep < 1);
  advance(.55);
  assert.equal(grove.bird.sleep, 1);

  grove.tapBird();
  assert.deepEqual(events.map(({ time, ...event }) => event), [{ type: 'sleep', ...grovePoints.branches[0] }]);
  grove.tapGrass(0);
  advance(1.55);
  assert.equal(grove.rabbit.cover, null);
  assert.equal(grove.bird.perch, 0);
  assert.equal(grove.bird.sleep, 1);
  assert.equal(events.some(event => event.type === 'flight'), false);

  grove.setNight(false);
  advance(.12);
  assert.ok(grove.bird.sleep > 0 && grove.bird.sleep < 1);
  advance(.55);
  assert.equal(grove.bird.sleep, 0);
  grove.tapBird();
  advance(1.15);
  assert.ok(events.some(event => event.type === 'peck'));
});

test('鸟正飞向地面时入夜，沿原轨迹落地后归枝，途中不睡也不啄草', () => {
  const { grove, events, advance } = setup();
  grove.tapBird();
  advance(.24);
  const inFlight = position(grove.bird);

  grove.setNight(true);
  assert.deepEqual(position(grove.bird), inFlight);
  grove.setNight(false);
  advance(.5);
  assert.ok(grove.bird.flight > 0);
  assert.equal(grove.bird.sleep, 0);
  assert.ok(events.some(event => event.type === 'flight' && event.phase === 'start' && event.reason === 'night'));
  grove.setNight(true);
  grove.tapBird();
  advance(1.4);

  assert.deepEqual(events.filter(event => event.type === 'flight').map(event => [event.phase, event.reason]),
    [['start', 'tap'], ['land', 'tap'], ['start', 'night'], ['land', 'night']]);
  assert.equal(events.some(event => event.type === 'peck' || event.type === 'grass'), false);
  assert.equal(grove.rabbit.listen, 0);
  assert.deepEqual(position(grove.bird), grovePoints.branches[0]);
  assert.equal(grove.bird.sleep, 1);
  assert.ok(Math.cos(grove.bird.yaw)>.48,'落枝后应能从画面看清合眼');
});

test('鸟落地后快速切入夜晚再切回白天，只归巢一次且不会补播接触联动', () => {
  const { grove, events, advance } = setup();
  grove.tapBird();
  advance(.74);
  assert.equal(grove.bird.perch, null);
  assert.equal(events.some(event => event.type === 'peck'), false);

  grove.setNight(true);
  grove.setNight(false);
  grove.setNight(true);
  grove.setNight(false);
  advance(1.3);
  assert.equal(grove.bird.perch, 0);
  assert.equal(grove.bird.sleep, 0);
  assert.equal(events.filter(event => event.type === 'flight' && event.phase === 'start' && event.reason === 'night').length, 1);
  assert.equal(events.some(event => event.type === 'peck' || event.type === 'grass'), false);
  assert.equal(grove.rabbit.listen, 0);

  grove.tapBird();
  advance(1.15);
  assert.equal(events.filter(event => event.type === 'peck').length, 1);
});

test('兔听到左右两侧的伙伴时都会抬头，四爪保持在原地', () => {
  const rabbit = makeRabbit(T);
  const head = rabbit.root.getObjectByName('Rabbit head');
  const feet = [];
  rabbit.root.traverse(node => {
    if (node.isGroup && (node.name.endsWith('fore paw') || node.name.endsWith('hind paw'))) feet.push(node);
  });
  assert.equal(feet.length, 4);
  rabbit.pose({ time: 1, peek: .52 });
  const rest = head.getWorldPosition(new T.Vector3());
  const anchors = feet.map(foot => foot.getWorldPosition(new T.Vector3()).toArray());
  for (const side of [-.8, .8]) {
    rabbit.pose({ time: 1, peek: .52, listen: side });
    const raised = head.getWorldPosition(new T.Vector3());
    assert.ok(raised.y > rest.y + .06);
    assert.deepEqual(feet.map(foot => foot.getWorldPosition(new T.Vector3()).toArray()), anchors);
  }
});
