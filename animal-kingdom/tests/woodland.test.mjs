import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { makeWoodpecker } from '../src/woodland-actors.js';
import { createWoodland, woodlandPoints } from '../src/woodland-state.js';

function setup(options) {
  const events = [];
  const woodland = createWoodland(event => events.push({ ...event, time: woodland.time, peck: woodland.pecker.peck, dig: woodland.fox.dig }), options);
  function advance(seconds, active) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) woodland.step(1 / 60, active);
  }
  return { woodland, events, advance };
}

const position = ({ x, y, z }) => ({ x, y, z });

test('松鼠抱同一颗松果换树根，从远根经近根攀到低枝再下来', () => {
  const { woodland, events, advance } = setup();
  assert.deepEqual(position(woodland.squirrel), woodlandPoints.squirrelRoots[0]);
  assert.equal(woodland.squirrel.hold, 1);
  woodland.tapSquirrel();
  advance(.3);
  assert.ok(woodland.squirrel.gait > 0 && woodland.squirrel.hold > .5);
  assert.equal(woodland.squirrel.site, 0);
  advance(.75);
  assert.equal(woodland.squirrel.site, 1);
  assert.deepEqual(position(woodland.squirrel), woodlandPoints.squirrelRoots[1]);

  woodland.tapSquirrelPerch();
  advance(1.16);
  assert.ok(woodland.squirrel.climb > 0);
  assert.ok(woodland.squirrel.y > woodlandPoints.squirrelRoots[0].y);
  advance(.8);
  assert.deepEqual(position(woodland.squirrel), woodlandPoints.squirrelPerch);
  assert.deepEqual(events.filter(event => event.type === 'squirrel-land').map(event => event.index), [1, 0, 2]);

  woodland.tapSquirrel();
  advance(1);
  assert.deepEqual(position(woodland.squirrel), woodlandPoints.squirrelRoots[0]);
  assert.equal(woodland.squirrel.hold, 1);
});

test('啄木鸟每一次触木时才发事件，近处松鼠听一次，远根不跟头', () => {
  const { woodland, events, advance } = setup();
  woodland.tapPecker();
  advance(.14);
  assert.equal(events.some(event => event.type === 'peck-hit' || event.type === 'squirrel-listen'), false);
  advance(.7);
  const knocks = events.filter(event => event.type === 'peck-hit');
  assert.equal(knocks.length, 3);
  assert.deepEqual(knocks.map(event => event.beat), [1, 2, 3]);
  assert.ok(knocks.every(event => event.peck === 1));
  assert.ok(knocks.every(event => event.index === 0));
  assert.deepEqual(position(knocks[0]), woodlandPoints.wood[0]);
  const heard = events.filter(event => event.type === 'squirrel-listen');
  assert.equal(heard.length, 1);
  assert.equal(heard[0].time, knocks[0].time);

  woodland.tapRoot(1);
  advance(1.15);
  woodland.tapPecker();
  advance(1.15);
  assert.equal(events.filter(event => event.type === 'peck-hit').length, 6);
  assert.equal(events.filter(event => event.type === 'squirrel-listen').length, 1);
  assert.equal(woodland.squirrel.look, 0);
});

test('点高处枯木先沿树皮换位，扣稳后在对应点啄击', () => {
  const { woodland, events, advance } = setup();
  woodland.tapWood(1);
  advance(.27);
  assert.ok(woodland.pecker.flight > 0);
  assert.ok(woodland.pecker.y > woodlandPoints.peckerPerches[0].y);
  assert.equal(events.some(event => event.type === 'peck-hit'), false);
  advance(1.3);

  assert.deepEqual(position(woodland.pecker), woodlandPoints.peckerPerches[1]);
  const land = events.find(event => event.type === 'pecker-land');
  const hit = events.find(event => event.type === 'peck-hit');
  assert.ok(land.time < hit.time);
  assert.equal(hit.index, 1);
  assert.deepEqual(position(hit), woodlandPoints.wood[1]);
});

test('啄木鸟在枯木前右侧，两站每一次啄击的实际喙端都到同一事件坐标', () => {
  const model = makeWoodpecker(T);
  const contacts = [];
  const woodland = createWoodland(event => {
    if (event.type !== 'peck-hit') return;
    const bird = woodland.pecker;
    model.root.position.set(bird.x, bird.y, bird.z);
    model.root.rotation.y = bird.yaw;
    model.pose(bird);
    model.root.updateMatrixWorld(true);
    const beak = model.beak.getWorldPosition(new T.Vector3());
    assert.ok(beak.distanceTo(new T.Vector3(event.x, event.y, event.z)) < 1e-6);
    contacts.push(event.index);
  });

  assert.equal(woodland.pecker.yaw, -2.10);
  for (const site of [0, 1]) {
    const root = woodlandPoints.peckerPerches[site];
    const bark = woodlandPoints.wood[site];
    assert.ok(root.x > 8.8 && root.z > -1.50);
    assert.ok(bark.x > 8.8 && bark.z > -1.54);
    woodland.tapWood(site);
    for (let frame = 0; frame < 108; frame++) woodland.step(1 / 60);
  }
  assert.deepEqual(contacts, [0, 0, 0, 1, 1, 1]);
});

test('点叶先局部拨动，狐狸转耳探鼻后才前爪翻起原位叶堆', () => {
  const groundAt = x => .38 + (x - 11.13) * .041;
  const { woodland, events, advance } = setup({ groundAt });
  woodland.tapLitter(1);
  assert.equal(events[0].type, 'litter-touch');
  advance(.23);
  assert.ok(woodland.litter[1].stir > 0 && Math.abs(woodland.fox.ears) > .06);
  assert.equal(woodland.fox.dig, 0);
  assert.equal(woodland.litter[1].scatter, 0);
  for (let frame = 0; frame < 95; frame++) {
    advance(1 / 60);
    assert.ok(Math.abs(woodland.fox.y - groundAt(woodland.fox.x)) < 1e-6);
  }
  const stop = events.find(event => event.type === 'fox-land');
  const flip = events.find(event => event.type === 'litter-flip');
  assert.ok(stop.time < flip.time);
  assert.ok(flip.time - stop.time > .58);
  assert.equal(flip.index, 1);
  assert.equal(flip.dig, 1);
  assert.equal(woodland.litter[0].scatter, 0);
});

test('点狐狸换灌丛，忙时的连续点叶只接续最新目标', () => {
  const { woodland, events, advance } = setup();
  woodland.tapFox();
  advance(.18);
  woodland.tapLitter(1);
  woodland.tapLitter(0);
  woodland.tapLitter(0);
  advance(3.3);
  assert.equal(woodland.fox.site, 0);
  assert.deepEqual(events.filter(event => event.type === 'litter-flip').map(event => event.index), [0]);
  assert.equal(events.filter(event => event.type === 'fox-call').length, 1);
});

test('入夜后松鼠和啄木鸟停息，夜点发休息事件，狐狸仍可翻叶', () => {
  const { woodland, events, advance } = setup();
  woodland.tapPecker();
  woodland.tapRoot(1);
  advance(.27);
  const originalKnocks = events.filter(event => event.type === 'peck-hit').length;
  woodland.setNight(true);
  advance(1.52);
  assert.equal(woodland.squirrel.site, 1);
  assert.equal(woodland.squirrel.sleep, 1);
  assert.equal(woodland.pecker.sleep, 1);
  assert.equal(woodland.pecker.peck, 0);
  assert.equal(events.filter(event => event.type === 'peck-hit').length, originalKnocks);

  woodland.tapSquirrel();
  woodland.tapWood(1);
  woodland.tapLitter(0);
  advance(1.47);
  assert.deepEqual(events.filter(event => event.type === 'sleep').map(event => event.animal), ['squirrel', 'pecker']);
  assert.equal(woodland.pecker.site, 0);
  assert.ok(events.some(event => event.type === 'litter-flip' && event.index === 0));

  woodland.setNight(false);
  advance(.52);
  assert.equal(woodland.squirrel.sleep, 0);
  assert.equal(woodland.pecker.sleep, 0);
  woodland.tapPecker();
  advance(.95);
  assert.equal(events.filter(event => event.type === 'peck-hit').length, originalKnocks + 3);
});

test('林缘三只各走各的小路线，啄木鸟贴树换爪，只有松果擦近地发邻居事件', () => {
  const groundAt = x => .38 + (x - 11.13) * .041;
  const { woodland, events, advance } = setup({ groundAt });
  const animals = [woodland.fox, woodland.squirrel, woodland.pecker];
  const start = animals.map(position);
  let climbing = false;
  for (let i = 0; i < 190; i++) {
    advance(.05, true);
    assert.equal(woodland.fox.y, groundAt(woodland.fox.x));
    if (woodland.pecker.climb > .4) {
      climbing = true;
      assert.equal(woodland.pecker.flight, 0);
      assert.equal(woodland.pecker.flap, 0);
      assert.ok(woodland.pecker.stride > 0);
      assert.equal(woodland.pecker.climbDirection, 1);
    }
  }
  assert.ok(animals.every((animal, i) => Math.hypot(animal.x - start[i].x, animal.y - start[i].y, animal.z - start[i].z) > .20));
  assert.ok(climbing);
  assert.ok(woodland.squirrel.hold > .85);
  assert.deepEqual(events.map(event => event.type), ['squirrel-rustle']);
  assert.deepEqual(position(events[0]), woodlandPoints.squirrelRoots[1]);

  woodland.setNight(true);
  advance(1, true);
  const before = animals.map(position);
  let foxMoved = false;
  for (let i = 0; i < 220; i++) {
    advance(.05, true);
    foxMoved ||= Math.abs(woodland.fox.x - before[0].x) > .25;
  }
  assert.ok(foxMoved);
  assert.deepEqual(animals.slice(1).map(position), before.slice(1));
  assert.equal(woodland.squirrel.sleep, 1);
  assert.equal(woodland.pecker.sleep, 1);
});

test('狐狸、松鼠和啄木鸟在自主巡游中点下去仍完成原动作', () => {
  const { woodland, events, advance } = setup();
  while (woodland.time < 6 && woodland.fox.gait < .12) advance(.05, true);
  assert.ok(woodland.fox.gait > .12);
  woodland.tapLitter(0);
  assert.equal(events.at(-1)?.type, 'litter-touch');
  while (woodland.time < 8 && woodland.squirrel.gait < .12) advance(.05, true);
  assert.ok(woodland.squirrel.gait > .12);
  woodland.tapSquirrel();
  assert.equal(events.at(-1)?.type, 'squirrel-call');
  while (woodland.time < 10 && woodland.pecker.climb < .25) advance(.05, true);
  assert.ok(woodland.pecker.climb > .25);
  const tapAt = woodland.time;
  woodland.tapWood(1);
  advance(1.8, true);
  assert.deepEqual(events.filter(event => event.type === 'peck-hit').map(event => event.index), [1, 1, 1]);
  assert.ok(events.find(event => event.type === 'peck-hit').time - tapAt < 1.2);
  assert.ok(events.some(event => event.type === 'litter-flip' && event.index === 0));
  assert.equal(woodland.squirrel.site, 0);
});
