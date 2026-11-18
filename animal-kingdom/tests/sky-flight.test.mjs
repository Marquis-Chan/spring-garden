import assert from 'node:assert/strict';
import test from 'node:test';
import { createSkyFlight } from '../src/sky-flight.js';

test('背景鸟留出安静间隔，鸟群进出屏幕并轮流换方向', () => {
  const flight = createSkyFlight();
  assert.equal(flight.step(15, true), null);
  const first = flight.step(1.5, true);
  const later = flight.step(4, true);
  assert.equal(first.count, 3);
  assert.ok(first.progress > 0 && later.progress > first.progress);
  assert.equal(flight.step(6, true), null);
  assert.equal(flight.step(44, true), null);
  const second = flight.step(6, true);
  assert.equal(second.direction, -first.direction);
  assert.equal(second.count, 2);
});

test('夜晚、海底和低动态模式都会结束过境，回到天空仍有安静间隔', () => {
  const flight = createSkyFlight();
  assert.ok(flight.step(16, true));
  assert.equal(flight.step(.1, false), null);
  assert.equal(flight.step(60, false), null);
  assert.equal(flight.step(14, true), null);
  assert.ok(flight.step(3, true));
});
