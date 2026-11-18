import assert from 'node:assert/strict';
import test from 'node:test';
import {createPondYoung} from '../src/pond-young-state.js';
import {bounds, sites} from '../src/state.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const where = actor => ({ x: actor.x, y: actor.y, z: actor.z });

function setup() {
  const events = [];
  const young = createPondYoung(event => events.push({ ...event, time: young.time }));
  const run = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) young.step(1 / 60, true); };
  return { young, events, run };
}

test('两只幼鸭自主划水、不相撞也不自动叫，四只蝌蚪各自在浅水游', () => {
  const {young, events, run} = setup();
  assert.equal(young.ducks.length, 2);
  assert.equal(young.tadpoles.length, 4);
  const starts = [...young.ducks, ...young.tadpoles].map(where);
  const spans = starts.map(() => 0);
  for (let frame = 0; frame < 210; frame++) {
    run(.075);
    const [left, right] = young.ducks;
    assert.ok(gap(left, right) > .75);
    for (const duck of young.ducks) assert.ok(duck.z <= -1.07 && duck.z >= -2.10 && duck.y > 0);
    for (const tadpole of young.tadpoles) assert.ok(tadpole.x > 1.78 && tadpole.x < 2.52 && tadpole.y < 0);
    [...young.ducks, ...young.tadpoles].forEach((actor, index) => {
      spans[index] = Math.max(spans[index], gap(actor, starts[index]));
    });
  }
  assert.ok(spans.every(span => span > .24));
  assert.ok(!events.some(({type}) => type === 'duck-call'));
});

test('抬头鸭先叫、同伴半拍后跟，近水波抵达后才散开', () => {
  const {young, events, run} = setup();
  run(.85);
  young.tapDuck(0);
  run(.20);
  assert.ok(young.ducks[0].headUp > .3);
  assert.deepEqual(events.map(({type}) => type), ['duck-call']);
  run(.39);
  const follow = events.find(event => event.type === 'duck-follow');
  const wave = events.find(event => event.type === 'duck-ripple');
  assert.ok(follow.time - events[0].time >= .37 && wave.time > follow.time);
  assert.equal(follow.index, 1);
  assert.ok(young.ducks[1].follow > .25);
  assert.ok(young.ducks[1].headUp > .28 && Math.abs(young.ducks[1].followLook) > .18);
  assert.equal(young.ducks[1].call, 0);
  assert.equal(events.some(({type}) => type === 'tadpole-scatter'), false);
  run(1.0);
  const reached = events.find(event => event.type === 'tadpole-scatter' && event.cause === 'duck');
  assert.ok(reached.time > wave.time + .16);
  assert.ok(reached.distance <= reached.radius + .035);
  assert.ok(young.tadpoles.some(({scatter}) => scatter > .08));
  run(1.4);
  assert.ok(young.tadpoles.every(({scatter}) => scatter < .02));
});

test('远鸭抖翅拨水不会带动蝌蚪，手点可重复散开，天黑两鸭收头', () => {
  const {young, events, run} = setup();
  young.tapDuck(1);
  run(.30);
  assert.ok(young.ducks[1].wing > .5);
  run(1.55);
  assert.ok(events.some(({type}) => type === 'duck-ripple'));
  assert.equal(events.some(({type}) => type === 'tadpole-scatter'), false);
  young.tapTadpoles(2);
  run(.30);
  assert.ok(young.tadpoles.every(({scatter}) => scatter > .78));
  run(1.14);
  young.tapTadpoles(2);
  assert.equal(events.filter(({cause}) => cause === 'tap').length, 2);

  young.setNight(true);
  run(1.88);
  const asleep = young.ducks.map(where), tads = young.tadpoles.map(where);
  assert.ok(young.ducks.every(({sleep, swim, z}) => sleep === 1 && swim === 0 && z <= -2.11));
  young.tapDuck(0);
  run(1.47);
  assert.deepEqual(young.ducks.map(where), asleep);
  assert.ok(young.tadpoles.some((actor, i) => gap(actor, tads[i]) > .05));
  assert.equal(events.at(-1).type, 'sleep');
  young.setNight(false);
  run(.03);
  assert.ok(young.ducks.every((actor, i) => gap(actor, asleep[i]) < .02));
  run(1.35);
  assert.ok(young.ducks.every(({sleep}) => sleep === 0));
});

test('蝌蚪已经散开时再次点，沿当前游动的位置继续摆尾', () => {
  const {young, events, run} = setup();
  young.tapTadpoles(0);
  run(.46);
  const expanded = young.tadpoles.map(where);
  assert.ok(young.tadpoles.every(({scatter}) => scatter > .88));
  young.tapTadpoles(3);
  run(1 / 60);
  assert.equal(events.filter(({cause}) => cause === 'tap').length, 2);
  assert.ok(young.tadpoles.every((actor, index) => gap(actor, expanded[index]) < .035 && actor.scatter > .82));
  run(1.5);
  assert.ok(young.tadpoles.every(({scatter}) => scatter === 0));
});

test('蝌蚪从浅水窝出发，绕到青蛙旁停留，再游回浅水', () => {
  const {young, events} = setup();
  const start = young.tadpoles.map(where);
  const frog = {...sites[0], site:0};
  let found = false;
  for (let i = 0; i < 1400; i++) {
    const previous = young.tadpoles.map(where);
    young.step(1 / 60, true, frog);
    assert.ok(young.tadpoles.every((p, index) => {
      const shore = Math.hypot(p.x / bounds.x, (p.z - bounds.cz) / bounds.z);
      const rock = Math.hypot((p.x - sites[0].x) / 1.15, (p.z - sites[0].z) / .88);
      return p.y < 0 && shore <= .89 && rock > 1.03 && gap(p, previous[index]) < .065;
    }));
    const reunion = events.find(({type}) => type === 'tadpoles-met');
    if (reunion && !found) {
      found = true;
      assert.equal(reunion.site, 0);
      assert.ok(young.tadpoles.every(point => gap(point, frog) < 1.95));
    }
    if (events.some(({type}) => type === 'tadpoles-home')) break;
  }
  assert.ok(found);
  assert.ok(events.some(({type}) => type === 'tadpoles-home'));
  assert.ok(young.tadpoles.every((point, i) => gap(point, start[i]) < .54));
  assert.ok(!events.some(({type}) => type.endsWith('call')));
});

test('青蛙换到荷叶后，出发的蝌蚪改找新落点', () => {
  const {young, events} = setup();
  let frog = {...sites[0], site:0};
  let jumping = false;
  for (let i = 0; i < 1000; i++) {
    if (i === 315) jumping = true;
    if (i === 365) { frog = {...sites[1], site:1}; jumping = false; }
    young.step(1 / 60, true, frog, jumping);
    if (events.some(({type}) => type === 'tadpoles-met')) break;
  }
  const met = events.find(({type}) => type === 'tadpoles-met');
  assert.equal(met?.site,1);
  assert.ok(young.tadpoles.every(point => gap(point, frog) < 1.45));
});
