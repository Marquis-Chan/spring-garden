import assert from 'node:assert/strict';
import test from 'node:test';
import { sceneCues, sceneCue } from '../src/scene-cues.js';

test('各近景轮流提示两个不同的联动入口，中间留出安静时间', () => {
  assert.equal(Object.keys(sceneCues).length, 10);
  for (const [mode, targets] of Object.entries(sceneCues)) {
    const first = sceneCue(mode, 3.8, targets);
    const second = sceneCue(mode, 10.8, targets);
    assert.ok(first?.strength > .20 && second?.strength > .20, mode);
    assert.notEqual(first.target, second.target, mode);
    assert.equal(sceneCue(mode, 2.9, targets), null);
    assert.equal(sceneCue(mode, 6, targets), null);
  }
  assert.equal(sceneCue('river', 3.8, sceneCues.river).target.kind, 'hippo-brush');
  assert.equal(sceneCue('river', 17.8, sceneCues.river).target.kind, 'river-grass');
});

test('跳过碰不到的物件，海岸有回岸请求时提示指定石头，总览不出引导', () => {
  const carrot = {kind:'rabbit-carrot'};
  assert.equal(sceneCue('orchard', 3.8, [carrot]).target, carrot);
  assert.equal(sceneCue('orchard', 10.8, []), null);
  assert.equal(sceneCue('overview', 3.8, [carrot]), null);
  const ramp = {kind:'coast-ramp',index:0};
  const stone = {kind:'coast-stone',index:1};
  assert.equal(sceneCue('coast', 3.8, [ramp, stone], 'coast-stone').target, stone);
});
