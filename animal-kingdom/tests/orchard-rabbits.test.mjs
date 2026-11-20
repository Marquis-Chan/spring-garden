import assert from 'node:assert/strict';
import test from 'node:test';
import { groundHeight } from '../src/diorama.js';
import { createOrchardRabbits } from '../src/orchard-rabbits.js';
import * as T from 'three';
import {makeRabbit} from '../src/grove-actors.js';

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
  for (let frame = 0; frame < 80 * 60; frame++) {
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
  advance(3.4);
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

test('双兔分道跳到萝卜旁，轮流先吃，另一只明显前探且完整归位才换先手', () => {
  const {family,events,advance}=setup();
  const [a,b]=family.rabbits, starts=family.rabbits.map(r=>({...r}));
  for (const winner of [0,1]) {
    const round=family.carrot.round;
    family.tapCarrot();
    advance(.1);
    family.tapCarrot();
    while (family.carrot.phase!=='eat') {
      advance(1/60);
      assert.ok(gap(a,b)>.93);
    }
    advance(.7);
    assert.ok(family.rabbits[winner].nibble>.99);
    assert.ok(family.rabbits[1-winner].lean>.75 && family.rabbits[1-winner].watch>.95);
    assert.equal(family.rabbits[1-winner].nibble,0);
    assert.equal(family.carrot.round,round);
    assert.equal(family.carrot.winner,winner);
    while(family.carrot.phase!=='ready') advance(1/60);
    assert.equal(family.carrot.round,round+1);
    assert.equal(family.carrot.winner,1-winner);
    for(const r of family.rabbits) assert.ok(gap(r,starts[r.index])<.00001);
  }
  assert.deepEqual(events.filter(e=>e.type==='carrot-race-complete').map(e=>e.index),[0,1]);
});

test('已有短跳先落地再去萝卜；途中切夜双方各落稳归位，未完成一轮不换先手', () => {
  const {family,events,advance}=setup();
  family.tap(0);
  advance(.38);
  family.tapCarrot();
  assert.equal(family.carrot.phase,'waiting');
  advance(.75);
  assert.equal(family.carrot.phase,'approach');
  advance(.2);
  assert.ok(family.rabbits.some(r=>r.air>0));
  family.setNight(true);
  advance(5.3);
  assert.equal(family.carrot.phase,'ready');
  assert.equal(family.carrot.round,0);
  assert.equal(family.carrot.winner,0);
  assert.ok(family.rabbits.every(r=>r.sleep>.99 && r.air===0));
  family.tapCarrot();
  assert.deepEqual(events.slice(-2).map(e=>[e.type,e.index]),[['sleep',0],['sleep',1]]);
  family.setNight(false);
  advance(.6);
  family.tapCarrot();
  advance(5.5);
  assert.equal(family.carrot.round,1);
});

test('两种先手都把同一套真实兔吻对到萝卜，身体网格在靠近、吃和归位时留开', () => {
  const {family,advance}=setup();
  const models=family.rabbits.map(()=>makeRabbit(T)), point=new T.Vector3();
  let samples=0;
  for(let round=0;round<2;round++) {
    family.tapCarrot();
    for(let frame=0;frame<340;frame++) {
      advance(1/60);
      const boxes=models.map((model,index)=>{
        const pose=family.rabbits[index];
        model.root.position.set(pose.x,pose.y,pose.z);model.root.rotation.y=pose.yaw;model.root.scale.setScalar(pose.scale);
        model.pose(pose);
        const head=new T.Box3().setFromObject(model.root.getObjectByName('Soft sculpted face'),true);
        const body=new T.Box3().setFromObject(model.root.getObjectByName('Rounded shoulders and haunch'),true);
        assert.ok(head.intersectsBox(body),'探嘴时头和肩颈保持连接');
        if(pose.nibble>.99) {
          const side=index===0?-1:1;
          model.mouth.getWorldPosition(point);
          assert.ok(Math.abs(point.x-family.carrot.x-side*.11)<.007);
          assert.ok(Math.abs(point.y-.72)<.007);
          assert.ok(Math.abs(point.z-family.carrot.z)<.007);
          samples++;
        } else if(pose.watch>.99) {
          model.mouth.getWorldPosition(point);
          assert.ok(point.distanceTo(new T.Vector3(family.carrot.x,.72,family.carrot.z))>.23,'没抢到的兔子仍看着前方，没有贴到萝卜上');
        }
        return new T.Box3().setFromObject(model.root,true);
      });
      assert.equal(boxes[0].intersectsBox(boxes[1]),false,`round ${round},frame ${frame}`);
    }
  }
  assert.ok(samples>60);
});
