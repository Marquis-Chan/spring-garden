import assert from 'node:assert/strict';
import test from 'node:test';
import { bounds, createPond, sites } from '../src/state.js';

function setup() {
  const events = [];
  const pond = createPond(event => events.push(event));

  function advance(seconds, active) {
    const frames = Math.ceil(seconds * 60);
    for (let frame = 0; frame < frames; frame++) pond.step(1 / 60, active);
  }

  return { pond, events, advance };
}

function nextToSite(site) {
  return { x: sites[site].x + .33, z: sites[site].z + .55 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

test('青蛙叫声尚未结束时，点空叶仍立即准备并在一秒内落地', () => {
  const { pond, events, advance } = setup();
  pond.tapFrog();
  pond.playSite(1);

  assert.deepEqual(events.map(event => event.type), ['call', 'ready']);
  advance(.10);
  assert.ok(pond.frog.crouch > 0);
  advance(.24);
  assert.ok(pond.frog.y > sites[0].y + .2);
  advance(.55);
  assert.equal(pond.frog.site, 1);
  assert.equal(events.filter(event => event.type === 'land').length, 1);
});

test('蛙先落叶后引鱼，换岸再选择新位置可以联动第二次', () => {
  const { pond, events, advance } = setup();
  pond.playSite(1);
  advance(1.4);
  assert.equal(pond.frog.site, 1);
  assert.equal(pond.greetingCount, 0);

  pond.guide(nextToSite(1));
  advance(2.5);
  assert.equal(pond.greetingCount, 1);

  pond.guide(nextToSite(0));
  advance(3);
  assert.equal(pond.greetingCount, 1);
  pond.playSite(0);
  advance(1.2);
  assert.equal(pond.frog.site, 0);
  assert.equal(pond.greetingCount, 2);
  assert.deepEqual(events.filter(event => event.type === 'greet').map(event => event.site), [1, 0]);
});

test('鱼先到叶边，蛙在靠近的落点落地后也能联动', () => {
  const { pond, events, advance } = setup();
  const spot = nextToSite(1);
  pond.guide(spot);
  advance(2.5);
  assert.ok(distance(pond.fish, spot) < .25);
  assert.equal(pond.greetingCount, 0);

  pond.playSite(1);
  advance(1.2);
  assert.equal(pond.greetingCount, 1);
  assert.deepEqual(events.filter(event => ['land', 'greet'].includes(event.type)).map(event => event.type),
    ['land', 'greet']);
});

test('仅点叶后放着不动，鱼的巡游不会自动联动或连播叫声', () => {
  const { pond, events, advance } = setup();
  pond.playSite(1);
  advance(30);

  assert.equal(pond.frog.site, 1);
  assert.equal(pond.greetingCount, 0);
  assert.equal(events.filter(event => event.type === 'call').length, 0);
});

test('轻点水有波纹和追随，连续拖水能改道并在松手后自然结束', () => {
  const { pond, events, advance } = setup();
  const tapSpot = { x: 1.6, z: 1.6 };
  pond.guide(tapSpot);
  assert.equal(events.at(-1).type, 'ripple');
  advance(2);
  assert.ok(distance(pond.fish, tapSpot) < .25);

  pond.guide({ x: .3, z: 1.2 }, true);
  advance(.3);
  const endSpot = { x: -2.6, z: .5 };
  pond.guide(endSpot, true);
  advance(6);
  assert.ok(pond.target && distance(pond.target, endSpot) < .01);
  assert.ok(distance(pond.fish, endSpot) < .25);
  pond.finishDrag();
  advance(.2);
  assert.ok(pond.target && distance(pond.target, endSpot) < .01);
  advance(6);
  assert.equal(pond.target, null);
});

test('蛙在空中时只记录最后一次落点，落定后仍可继续玩', () => {
  const { pond, events, advance } = setup();
  const landings = () => events.filter(event => event.type === 'land').map(event => event.site);

  pond.playSite(1);
  advance(.3);
  pond.playSite(0);
  pond.playSite(1);
  advance(2.2);
  assert.deepEqual(landings(), [1]);

  pond.playSite(0);
  advance(.3);
  for (let tap = 0; tap < 8; tap++) pond.playSite(1);
  advance(2.2);
  assert.deepEqual(landings(), [1, 0, 1]);
  assert.equal(pond.busy, false);
});

test('贴着岸线拖水或指向岸外时，鱼会留在可游动的区域', () => {
  const { pond } = setup();
  const edgeTargets = [{ x: 20, z: 0 }, { x: 0, z: 20 }, { x: -20, z: 0 }, { x: 0, z: -20 }];

  for (const target of edgeTargets) {
    pond.guide(target, true);
    for (let frame = 0; frame < 270; frame++) {
      pond.step(1 / 60);
      const x = (pond.fish.x - bounds.cx) / bounds.x;
      const z = (pond.fish.z - bounds.cz) / bounds.z;
      assert.ok(Math.hypot(x, z) < .9, '鱼的中心应始终与岸线保留游动距离');
    }
  }
});

test('引鱼从石头前方游向后方时，鱼会绕行并抵达', () => {
  const { pond, advance } = setup();
  pond.guide({ x: -1.75, z: .48 }, true);
  advance(6);
  const behind = { x: -1.80, z: -1.72 };
  pond.guide(behind, true);
  for (let frame = 0; frame < 480; frame++) {
    pond.step(1 / 60);
    const x = (pond.fish.x - sites[0].x) / 1.15;
    const z = (pond.fish.z - sites[0].z) / .88;
    assert.ok(Math.hypot(x, z) > .998, '游动的鱼不得穿进水下的石头');
  }
  assert.ok(distance(pond.fish, behind) < .24, '绕行后应继续去刚才点的地方');
});

test('只在池塘停留足够久才安静换落脚点，日常跳不产生叫声或问候资格', () => {
  const { pond, events, advance } = setup();
  advance(14);
  advance(6.85, true);
  assert.equal(pond.frog.site, 0);
  assert.equal(pond.busy, false);
  advance(.48, true);
  assert.ok(pond.frog.air > .2);
  advance(.78, true);
  assert.equal(pond.frog.site, 1);
  assert.equal(pond.busy, false);
  assert.deepEqual(events.map(({ type }) => type), ['routine-land']);

  pond.guide(nextToSite(1));
  advance(2.45, true);
  assert.ok(distance(pond.fish, nextToSite(1)) < .25);
  assert.equal(pond.greetingCount, 0);
  assert.ok(!events.some(({ type }) => type === 'call' || type === 'land'));
});

test('正在引鱼或听到呱呱声时蛙先待在原位，松手后可接着自然换位', () => {
  const { pond, events, advance } = setup();
  advance(6.6, true);
  pond.guide(nextToSite(0), true);
  advance(4.8, true);
  assert.equal(pond.frog.site, 0);
  assert.equal(pond.busy, false);
  pond.finishDrag();
  advance(3.6, true);
  pond.tapFrog();
  advance(1.4, true);
  assert.equal(pond.frog.site, 0);
  assert.equal(pond.busy, false);
  assert.equal(events.filter(({ type }) => type === 'call').length, 1);
  advance(8.6, true);
  assert.equal(pond.frog.site, 1);
  assert.equal(events.filter(({ type }) => type === 'call').length, 1);
});

test('自主腾空后能立刻点蛙叫；可接管原落点，也可接续跳回', () => {
  const same = setup();
  same.advance(7.33, true);
  assert.ok(same.pond.frog.air > .2);
  same.pond.tapFrog();
  same.pond.playSite(1);
  assert.deepEqual(same.events.map(({ type }) => type), ['call', 'leaf-touch']);
  same.advance(.9, true);
  assert.equal(same.pond.frog.site, 1);
  assert.deepEqual(same.events.filter(({ type }) => type === 'land').map(({ site }) => site), [1]);

  const back = setup();
  back.advance(7.33, true);
  back.pond.playSite(0);
  assert.equal(back.events[0].type, 'leaf-touch');
  back.advance(1.75, true);
  assert.equal(back.pond.frog.site, 0);
  assert.deepEqual(back.events.filter(({ type }) => type === 'land').map(({ site }) => site), [0]);
  assert.ok(!back.events.some(({ type }) => type === 'call'));
});
