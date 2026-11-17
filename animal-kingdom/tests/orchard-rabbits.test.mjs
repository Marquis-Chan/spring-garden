import assert from 'node:assert/strict';
import test from 'node:test';
import { groundHeight } from '../src/diorama.js';
import { createOrchardRabbits } from '../src/orchard-rabbits.js';

function setup() {
  const events = [];
  const family = createOrchardRabbits(event => events.push(event), { groundAt: groundHeight });
  const advance = (seconds, active = true) => {
    for (let frame = 0; frame < Math.round(seconds * 60); frame++) family.step(1 / 60, active);
  };
  return { family, events, advance };
}

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('点一只兔先伏低再跳，三维落脚后另一只才动耳，每只可单独点', () => {
  const { family, events, advance } = setup();
  const [first, second] = family.rabbits;
  const start = { ...first };
  family.tap(0);
  advance(.14);
  assert.ok(first.crouch > .35);
  assert.equal(first.y, start.y);
  family.tap(0);
  advance(.34);
  assert.ok(first.air > .5 && first.y > start.y + .13);
  assert.equal(second.listen, 0);
  advance(.72);
  assert.deepEqual(events.map(e => [e.type, e.index, e.phase]), [
    ['rabbit-hop', 0, 'start'], ['rabbit-hop', 0, 'land'], ['rabbit-notice', 1, undefined]
  ]);
  assert.ok(gap(first, start) > .5 && Math.abs(second.listen) > .1);
  assert.equal(first.y, groundHeight(first.x, first.z));
  family.tap(1);
  advance(.75);
  assert.ok(events.some(e => e.type === 'rabbit-hop' && e.index === 1 && e.phase === 'land'));
});

test('两个跳道始终各留一块草地，静置动作分时出现，没有自动的同伴惊跳', () => {
  const { family, events, advance } = setup();
  advance(20, false);
  assert.deepEqual(events, []);
  const firstHop = [Infinity, Infinity];
  for (let frame = 0; frame < 40 * 60; frame++) {
    advance(1 / 60);
    const [a, b] = family.rabbits;
    assert.ok(gap(a, b) > 1.50 && a.z > 9 && b.z > 8.85);
    assert.ok(a.y >= groundHeight(a.x, a.z) && b.y >= groundHeight(b.x, b.z));
    assert.ok(!a.air || !b.air);
    for (const index of [0,1]) {
      if (!Number.isFinite(firstHop[index]) && events.some(e => e.type === 'rabbit-hop' && e.phase === 'start' && e.routine && e.index === index)) firstHop[index] = frame;
    }
  }
  assert.ok(firstHop.every(Number.isFinite));
  assert.ok(firstHop[1] - firstHop[0] > 60);
  for (const index of [0, 1]) {
    const starts = events.filter(e => e.type === 'rabbit-hop' && e.phase === 'start' && e.index === index);
    assert.ok(starts.length >= 2 && starts.length <= 3);
  }
  assert.ok(!events.some(e => e.type === 'rabbit-notice'));
});

test('跳到一半切夜先落稳再趴下，睡着点击出睡眠反馈，白天可再次跳', () => {
  const { family, events, advance } = setup();
  family.tap(0);
  advance(.46);
  const [rabbit, other] = family.rabbits;
  assert.ok(rabbit.air > .7);
  family.setNight(true);
  advance(.10);
  assert.equal(rabbit.sleep, 0);
  advance(1.8);
  assert.equal(rabbit.sleep, 1);
  assert.equal(other.sleep, 1);
  assert.equal(rabbit.y, groundHeight(rabbit.x, rabbit.z));
  family.tap(0);
  assert.deepEqual(events.at(-1), { type: 'sleep', animal: 'orchard-rabbit', index: 0, x: rabbit.x, y: rabbit.y, z: rabbit.z });
  assert.ok(!events.some(e => e.type === 'rabbit-notice'));
  family.setNight(false);
  advance(.6);
  family.tap(0);
  advance(.36);
  assert.ok(rabbit.air > .35);
});
