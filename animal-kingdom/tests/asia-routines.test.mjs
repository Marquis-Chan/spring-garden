import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { createAsia, asiaPoints } from '../src/asia-state.js';
import { makeTiger } from '../src/asia-actors.js';

const position = ({x,y,z}) => ({x,y,z});
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);

function setup() {
  const events = [];
  const groundAt = (x,z) => .38 + .028*(x-18.5) - .05*z;
  const forest = createAsia(event => events.push(event), {groundAt});
  const advance = (seconds,active=true) => {
    for(let frame=0;frame<Math.ceil(seconds*60);frame++) forest.step(1/60,active);
  };
  return {forest,events,groundAt,advance};
}

test('熊和虎在独立林道轻走并按实际地面落脚，不会自动取食或发声', () => {
  const {forest,events,groundAt,advance} = setup();
  let bearMoved=false,tigerMoved=false,groundSampled=false;
  for(let i=0;i<116;i++) {
    advance(.05);
    const {bear,tiger}=forest;
    bearMoved ||= gap(bear,asiaPoints.bear) > .30;
    tigerMoved ||= gap(tiger,asiaPoints.tiger) > .30;
    assert.ok(gap(bear,tiger) > 1.85);
    assert.equal(bear.y,groundAt(bear.x,bear.z));
    assert.equal(tiger.y,groundAt(tiger.x,tiger.z));
    groundSampled ||= tiger.gait>0 && Math.abs(tiger.frontLeftY)>.003;
  }
  assert.ok(bearMoved && tigerMoved && groundSampled);
  assert.ok(!events.some(({type})=>type.endsWith('-call') || type.includes('pick') || type.includes('mouth')));
});

test('熊巡游背对树叶时先转身再伸手，虎巡游中点按仍发出旧叫声', () => {
  const {forest,events,advance} = setup();
  advance(2.83);
  const {bear,tiger}=forest;
  const b=position(bear),heading=bear.yaw,t=position(tiger);
  forest.tapLeaf();
  forest.tapTiger();
  assert.ok(events.some(({type})=>type==='tiger-call'));
  advance(.16);
  assert.deepEqual(position(bear),b);
  assert.notEqual(bear.yaw,heading);
  assert.equal(bear.reach,0);
  assert.deepEqual(position(tiger),t);
  advance(1.36);
  const picked=events.findIndex(({type})=>type==='bear-leaf-pick');
  const bitten=events.findIndex(({type})=>type==='leaf-mouth');
  assert.ok(picked>=0&&bitten>picked);
  assert.ok(bear.reachZ>0);
  assert.deepEqual(position(bear),b);
});

test('巡游后两只仍按照落果→虎触果→熊拾→熊吃的顺序共用同一颗果', () => {
  const {forest,events,advance} = setup();
  advance(3.2);
  forest.tapSharedFruit();
  advance(3);
  const completed=events.filter(({type})=>['shared-fruit-land','shared-fruit-tiger-touch','shared-fruit-bear-pick','shared-fruit-mouth'].includes(type));
  assert.deepEqual(completed.map(({type})=>type),['shared-fruit-land','shared-fruit-tiger-touch','shared-fruit-bear-pick','shared-fruit-mouth']);
  assert.deepEqual(position(completed[2]),asiaPoints.sharedFruitLanding);
});

test('虎和孔雀沿各自路线分开后，点抖屏仍会引虎抬头', () => {
  const {forest,events,advance} = setup();
  advance(17.6);
  forest.tapPeacock();
  advance(.65);
  assert.ok(gap(forest.tiger,forest.peacock)>2.72);
  assert.equal(forest.peacock.fan,1);
  forest.tapPeacockFan();
  advance(.5);
  assert.ok(events.some(({type})=>type==='peacock-rattle'));
  assert.ok(forest.tiger.notice>.65);
});

test('孔雀抖屏后，虎抬一只前掌再放回，其余三掌不离地', () => {
  const { forest, advance } = setup();
  const model = makeTiger(T);
  const paws = [];
  model.root.traverse(node => {
    if (node.name.endsWith('tiger foot')) paws.push(node);
  });
  assert.equal(paws.length, 4);
  forest.tapPeacock();
  advance(.65, false);
  forest.tapPeacockFan();
  let raised = false;
  for (let frame = 0; frame < 108; frame++) {
    forest.step(1 / 60);
    model.pose(forest.tiger);
    raised ||= paws[0].position.y > forest.tiger.frontLeftY + .065;
    const floor = [forest.tiger.frontRightY,forest.tiger.hindLeftY,forest.tiger.hindRightY];
    for (let index = 1; index < 4; index++) assert.equal(paws[index].position.y, floor[index - 1]);
  }
  assert.ok(raised);
  assert.equal(paws[0].position.y, forest.tiger.frontLeftY);
});
