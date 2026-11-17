import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrchard, orchardPoints } from '../src/orchard-state.js';

function setup() {
  const events = [];
  const orchard = createOrchard(event => events.push({ ...event, time: orchard.time }));

  function advance(seconds, active) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) orchard.step(1 / 60, active);
  }

  return { orchard, events, advance };
}

const position = ({ x, y, z }) => ({ x, y, z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('苹果从枝头落地再滚入篮，柯基接地后才追，在篮边嗅', () => {
  const { orchard, events, advance } = setup();
  const apple = orchard.apples[0];
  const branch = position(apple);
  assert.deepEqual(branch, orchardPoints.apples[0]);

  orchard.tapApple(0);
  assert.equal(apple.phase, 'drop');
  advance(.25);
  assert.ok(apple.y < branch.y && apple.y > .55);
  assert.deepEqual(position(orchard.dog), orchardPoints.dog);
  assert.equal(events.some(event => event.type === 'dog-chase'), false);

  advance(.55);
  assert.equal(apple.phase, 'roll');
  assert.ok(apple.y <= .56 && apple.rotation > 0);
  assert.ok(orchard.dog.gait > 0);
  const land = events.findIndex(event => event.type === 'apple-land');
  const chase = events.findIndex(event => event.type === 'dog-chase');
  assert.ok(land >= 0 && land < chase);

  advance(2.5);
  assert.equal(apple.phase, 'basket');
  assert.equal(orchard.basketCount, 1);
  assert.ok(distance(apple, orchardPoints.basket) < .3);
  assert.ok(orchard.dog.x > orchardPoints.dog.x);
  const settled = events.findIndex(event => event.type === 'apple-basket');
  const sniff = events.findIndex(event => event.type === 'dog-sniff');
  assert.ok(chase < settled && settled < sniff);
});

test('快速重复和交错摘三颗苹果时不重复创建果，柯基不会中途换目标', () => {
  const { orchard, events, advance } = setup();
  orchard.tapApple(0);
  orchard.tapApple(0);
  advance(.11);
  orchard.tapApple(1);
  orchard.tapApple(2);
  orchard.tapApple(1);
  advance(4);

  assert.deepEqual(orchard.apples.map(apple => apple.id), [0, 1, 2]);
  assert.equal(orchard.basketCount, 3);
  assert.ok(distance(orchard.apples[0], orchard.apples[1]) > .32);
  assert.ok(distance(orchard.apples[0], orchard.apples[2]) > .32);
  assert.ok(distance(orchard.apples[1], orchard.apples[2]) > .32);
  for (const type of ['apple-land', 'apple-basket']) {
    assert.deepEqual(events.filter(event => event.type === type).map(event => event.id).sort(), [0, 1, 2]);
  }
  const chasing = events.findIndex(event => event.type === 'dog-chase');
  const firstSniff = events.findIndex(event => event.type === 'dog-sniff');
  assert.ok(chasing >= 0 && firstSniff > chasing);
  assert.equal(events.slice(chasing + 1, firstSniff).some(event => event.type === 'dog-chase'), false);
});

test('篮子只送回已入篮果，重复倾篮无法吞掉另一颗在途的果', () => {
  const { orchard, events, advance } = setup();
  orchard.tapApple(0);
  advance(2.1);
  assert.equal(orchard.basketCount, 1);

  orchard.tapApple(2);
  advance(.57);
  assert.equal(orchard.apples[2].phase, 'roll');
  orchard.tapBasket();
  orchard.tapBasket();
  advance(.2);
  assert.ok(orchard.basketTilt > 0);
  assert.equal(orchard.apples[0].phase, 'recover');
  assert.equal(orchard.apples[2].phase, 'roll');
  assert.equal(orchard.basketCount, 0);

  advance(1.4);
  assert.equal(orchard.apples[0].phase, 'branch');
  assert.deepEqual(position(orchard.apples[0]), orchardPoints.apples[0]);
  assert.equal(orchard.apples[2].phase, 'basket');
  assert.equal(orchard.basketCount, 1);
  orchard.tapApple(0);
  advance(2.2);
  assert.equal(events.filter(event => event.type === 'apple-basket' && event.id === 0).length, 2);
  assert.equal(orchard.basketCount, 2);
});

test('猫狗点按可直接发声，猫只跟附近飞动的蝴蝶', () => {
  const { orchard, events, advance } = setup();
  orchard.tapDog();
  orchard.tapCat();
  assert.deepEqual(events.map(event => event.type), ['dog-call', 'cat-call']);
  advance(.22);
  assert.ok(orchard.dog.bark > 0 && orchard.cat.stretch > 0);

  orchard.tapHive();
  advance(.4);
  assert.ok(orchard.bees.some(bee => bee.flight > 0));
  assert.equal(orchard.cat.look, 0);
  orchard.tapButterfly();
  advance(.27);
  assert.ok(orchard.butterfly.flight > 0 && Math.abs(orchard.cat.look) > .08);
  advance(1.35);
  assert.equal(orchard.butterfly.perch, 1);
  assert.deepEqual(position(orchard.butterfly), orchardPoints.butterfly[1]);
  assert.ok(Math.abs(orchard.cat.look) < .05);
});

test('蝴蝶与两只蜜蜂各有花点，飞行结束后可以再次换花或召回', () => {
  const { orchard, events, advance } = setup();
  assert.deepEqual(orchard.bees.map(bee => bee.visible), [true, false]);
  assert.deepEqual(position(orchard.bees[0]), orchardPoints.hiveIdle);
  orchard.tapButterfly();
  orchard.tapHive();
  advance(1.5);
  assert.equal(orchard.butterfly.perch, 1);
  assert.deepEqual(orchard.bees.map(position), orchardPoints.beeFlowers);
  assert.ok(orchard.bees.every(bee => bee.visible));
  assert.ok(orchard.bees.every(bee => distance(bee, orchard.butterfly) > 1));
  assert.equal(events.filter(event => event.type === 'bee-flight').length, 1);

  orchard.tapButterfly();
  orchard.tapHive();
  advance(1.5);
  assert.equal(orchard.butterfly.perch, 2);
  assert.deepEqual(orchard.bees.map(bee => bee.visible), [true, false]);
  assert.deepEqual(orchard.bees.map(position), [orchardPoints.hiveIdle, orchardPoints.hive]);
});

test('入夜让正在飞的蜜蜂归巢、猫狗渐睡，苹果继续滚动入篮', () => {
  const { orchard, events, advance } = setup();
  orchard.tapApple(0);
  orchard.tapHive();
  advance(.7);
  assert.equal(orchard.apples[0].phase, 'roll');
  assert.ok(orchard.bees.some(bee => bee.flight > 0));
  orchard.setNight(true);
  const atRest = position(orchard.dog);
  const beeCount = events.filter(event => event.type === 'bee-flight').length;

  orchard.tapCat();
  orchard.tapDog();
  orchard.tapHive();
  orchard.tapApple(2);
  advance(.19);
  assert.ok(orchard.dog.sleep > 0 && orchard.dog.sleep < 1);
  assert.ok(orchard.cat.sleep > 0 && orchard.cat.sleep < 1);

  advance(2.4);
  assert.equal(orchard.dog.sleep, 1);
  assert.equal(orchard.cat.sleep, 1);
  assert.deepEqual(position(orchard.dog), atRest);
  assert.ok(orchard.bees.every(bee => !bee.visible));
  assert.equal(orchard.basketCount, 2);
  assert.deepEqual(events.filter(event => event.type === 'sleep').map(event => event.animal), ['cat', 'dog']);
  assert.equal(events.filter(event => event.type === 'bee-flight').length, beeCount);
  assert.equal(events.some(event => event.type === 'dog-call' || event.type === 'cat-call'), false);

  const chases = events.filter(event => event.type === 'dog-chase').length;
  orchard.setNight(false);
  advance(.65);
  assert.equal(orchard.dog.sleep, 0);
  assert.equal(orchard.cat.sleep, 0);
  assert.deepEqual(orchard.bees.map(bee => bee.visible), [true, false]);
  assert.deepEqual(position(orchard.bees[0]), orchardPoints.hiveIdle);
  assert.equal(events.filter(event => event.type === 'dog-chase').length, chases);
  orchard.tapApple(1);
  advance(1);
  assert.ok(events.some(event => event.type === 'dog-chase' && event.id === 1));
});

test('蝴蝶入夜完成在途飞行后停息，夜点只回应休息，天亮可再换花', () => {
  const { orchard, events, advance } = setup();
  orchard.tapButterfly();
  advance(.25);
  assert.ok(orchard.butterfly.flight > 0);

  orchard.setNight(true);
  orchard.tapButterfly();
  advance(.70);
  assert.equal(orchard.butterfly.perch, 1);
  assert.deepEqual(position(orchard.butterfly), orchardPoints.butterfly[1]);
  const restingTime = orchard.butterfly.time;
  orchard.tapButterfly();
  advance(.35);
  assert.equal(orchard.butterfly.perch, 1);
  assert.equal(orchard.butterfly.flight, 0);
  assert.equal(orchard.butterfly.flap, 0);
  assert.equal(orchard.butterfly.time, restingTime);
  assert.deepEqual(events.map(({ time, ...event }) => event), [
    { type: 'sleep', animal: 'butterfly' }, { type: 'sleep', animal: 'butterfly' }
  ]);

  orchard.setNight(false);
  orchard.tapButterfly();
  advance(1);
  assert.equal(orchard.butterfly.perch, 2);
  assert.ok(orchard.butterfly.time > restingTime);
});

test('果园活跃时每种醒着的动物会安静移位，入夜后不再巡游', () => {
  const { orchard, events, advance } = setup();
  const awake = [orchard.dog, orchard.cat, orchard.butterfly, orchard.bees[0]];
  const origin = awake.map(position);
  const moved = awake.map(() => false);
  let restingDog = false;
  for (let sample = 0; sample < 96; sample++) {
    advance(.125, true);
    awake.forEach((animal, index) => { moved[index] ||= distance(animal, origin[index]) > .36; });
    restingDog ||= moved[0] && orchard.dog.gait < .05;
    assert.ok(distance(orchard.dog, orchardPoints.basket) >= .73);
    assert.ok(orchard.cat.z >= 6.19);
  }
  assert.deepEqual(moved, [true, true, true, true]);
  assert.ok(restingDog);
  assert.deepEqual(events, []);

  orchard.setNight(true);
  advance(1.2, true);
  const rest = awake.map(position);
  advance(8, true);
  assert.deepEqual(awake.map(position), rest);
  assert.ok(orchard.bees.every(bee => !bee.visible));
  orchard.setNight(false);
  advance(4.5, true);
  assert.ok(distance(orchard.dog, rest[0]) > .14 || distance(orchard.cat, rest[1]) > .14);
});

test('猫只看实际滚过身旁的苹果，柯基仍会追并把果留篮', () => {
  const { orchard, events, advance } = setup();
  orchard.tapApple(2);
  advance(2, true);
  assert.equal(events.some(({ type }) => type === 'cat-apple-look'), false);

  orchard.tapApple(0);
  advance(.25, true);
  assert.equal(events.some(({ type }) => type === 'cat-apple-look'), false);
  advance(.28, true);
  const look = events.find(({ type }) => type === 'cat-apple-look');
  assert.equal(look?.id, 0);
  assert.ok(orchard.cat.lookDown > .1);
  const stand = position(orchard.cat);
  advance(.25, true);
  assert.deepEqual(position(orchard.cat), stand);
  orchard.tapCat();
  advance(.2, true);
  assert.ok(orchard.cat.stretch > .1);
  advance(1.6, true);
  assert.equal(events.filter(({ type }) => type === 'cat-apple-look').length, 1);
  assert.equal(orchard.basketCount, 2);
  assert.ok(events.some(({ id, type }) => id === 0 && type === 'dog-chase'));
});

test('手动换花与出蜂优先，第二只出巢后也会自己换位置', () => {
  const { orchard, events, advance } = setup();
  advance(5, true);
  orchard.tapButterfly();
  orchard.tapHive();
  advance(.38, true);
  assert.ok(orchard.butterfly.flight > 0 && orchard.bees.every(bee => bee.flight > 0));
  assert.equal(events.filter(({ type }) => type === 'bee-flight').length, 1);
  advance(1.1, true);
  const atFlowers = orchard.bees.map(position);
  assert.deepEqual(atFlowers, orchardPoints.beeFlowers);
  const moved = [false, false];
  for (let sample = 0; sample < 32; sample++) {
    advance(.125, true);
    orchard.bees.forEach((bee, index) => { moved[index] ||= distance(bee, atFlowers[index]) > .22; });
  }
  assert.deepEqual(moved, [true, true]);
  assert.equal(events.filter(({ type }) => type === 'bee-flight').length, 1);

  orchard.tapHive();
  advance(1.15, true);
  assert.deepEqual(orchard.bees.map(bee => bee.visible), [true, false]);
  assert.deepEqual(orchard.bees.map(position), [orchardPoints.hiveIdle, orchardPoints.hive]);
});

test('自动飞蝶沿左侧和前景花带往返，点蝶时猫仍能跟上视线', () => {
  const { orchard, advance } = setup();
  const landings = new Set();
  for (let sample = 0; sample < 310; sample++) {
    advance(.05, true);
    const { x, z, perch } = orchard.butterfly;
    assert.ok(x <= 2.35 || z >= 7.75, '蝴蝶不穿过猫和柯基中间的站区');
    if (perch !== null) landings.add(perch);
  }
  assert.deepEqual([...landings], [0, 1, 2]);

  const afterDrift = setup();
  afterDrift.advance(6.5, true);
  assert.equal(afterDrift.orchard.butterfly.perch, 1);
  afterDrift.orchard.tapButterfly();
  let look = 0;
  for (let sample = 0; sample < 17; sample++) {
    afterDrift.advance(.05, true);
    if (afterDrift.orchard.butterfly.flight > .3) look = Math.max(look, Math.abs(afterDrift.orchard.cat.look));
  }
  assert.equal(afterDrift.orchard.butterfly.perch, 2);
  assert.ok(look > .15);
});
