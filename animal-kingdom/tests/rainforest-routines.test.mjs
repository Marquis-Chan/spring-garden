import assert from 'node:assert/strict';
import test from 'node:test';
import { createRainforest, rainPoints } from '../src/rainforest-state.js';

function setup() {
  let forest;
  const events=[];
  const groundAt=(x,z)=>.38+.031*(x-34.64)-.022*(z-2.22);
  forest=createRainforest(event=>events.push({...event,time:forest.time}),{groundAt});
  const step=(seconds,active=true)=>{
    for(let frame=0;frame<Math.ceil(seconds*60);frame++) forest.step(1/60,active);
  };
  return {forest,events,step,groundAt};
}

test('两只猴的日常位置都变，望枝换位不叫，点正在飞的猴会落稳再吃',()=>{
  const {forest,events,step,groundAt}=setup();
  step(3.8);
  assert.ok(Math.hypot(forest.groundMonkey.x-rainPoints.groundMonkey.x,forest.groundMonkey.z-rainPoints.groundMonkey.z)>.18);
  assert.equal(forest.groundMonkey.y,groundAt(forest.groundMonkey.x,forest.groundMonkey.z));
  while(forest.time<8.0&&forest.monkey.air<.4)step(.05);
  assert.ok(forest.monkey.air>.4);
  assert.deepEqual(events.filter(({type})=>type==='monkey-call'||type==='banana-pick'),[]);
  forest.tapMonkey();
  assert.equal(events.filter(({type})=>type==='monkey-call').length,0);
  step(1.55);
  assert.equal(forest.monkey.site,1);
  const call=events.findIndex(({type})=>type==='monkey-call');
  const pick=events.findIndex(({type})=>type==='banana-pick');
  const mouth=events.findIndex(({type})=>type==='banana-mouth');
  assert.ok(call>=0&&pick>call&&mouth>pick);
  assert.equal(events.filter(({type})=>type==='monkey-call').length,1);
});

test('地猴走动时仍能接一颗真实落地的香蕉；树猴在接住之后才低头看',()=>{
  const {forest,events,step}=setup();
  step(1.43);
  forest.tapDropBanana();
  step(1.51);
  assert.ok(events.some(({type})=>type==='drop-banana-land'));
  assert.equal(forest.monkey.lookDown,0);
  while(forest.time<5.7&&!events.some(({type})=>type==='monkey-look-down'))step(.05);
  const land=events.findIndex(({type})=>type==='drop-banana-land');
  const pick=events.findIndex(({type})=>type==='ground-monkey-pick');
  const look=events.findIndex(({type})=>type==='monkey-look-down');
  assert.ok(land>=0&&pick>land&&look>pick);
  const {x,z,yaw}=forest.groundMonkey;
  step(.28);
  assert.ok(forest.monkey.lookDown>.3);
  assert.equal(forest.dropBanana.phase,'held');
  assert.ok(Math.abs(forest.groundMonkey.yaw-yaw)>.4);
  step(.27);
  assert.equal(forest.dropBanana.phase,'held');
  assert.ok(Math.abs(forest.groundMonkey.yaw-.38)<.04);
  assert.deepEqual([forest.groundMonkey.x,forest.groundMonkey.z],[x,z]);
  step(1.5);
  assert.equal(forest.monkey.lookDown,0);
  assert.equal(events.filter(({type})=>type==='monkey-look-down').length,1);
  assert.ok(events.some(({type})=>type==='ground-monkey-mouth'));
});
