const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: { SpringGarden: {} } };
const file = path.resolve(__dirname, '../src/rig.js');
if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
const rig = sandbox.window.SpringGarden.rig;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const numbers = d => d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);

test('limb joins the hip, knee and exact planted foot on either bend side', () => {
  assert.ok(rig, 'an independent geometry rig must exist');
  const hip = { x: 42, y: 138 }, foot = { x: 52, y: 177 };
  for (const sign of [-1, 1]) {
    const pose = rig.limb(hip, foot, 28, 29, sign);
    near(distance(pose.hip, hip), 0);
    near(distance(pose.foot, foot), 0);
    near(distance(pose.hip, pose.knee), 28);
    near(distance(pose.knee, pose.foot), 29);
    const cross = (foot.x - hip.x) * (pose.knee.y - hip.y) - (foot.y - hip.y) * (pose.knee.x - hip.x);
    assert.equal(Math.sign(cross), sign);
    assert.deepEqual(numbers(pose.d), [pose.hip.x, pose.hip.y, pose.knee.x, pose.knee.y, foot.x, foot.y]);
  }
});

test('an unreachable or coincident foot stays fixed and yields finite connected geometry', () => {
  assert.ok(rig, 'an independent geometry rig must exist');
  for (const foot of [{ x: 100, y: 200 }, { x: 42, y: 138 }]) {
    const hip = { x: 42, y: 138 }, pose = rig.limb(hip, foot, 26, 26, -1);
    near(distance(pose.foot, foot), 0);
    assert.ok(numbers(pose.d).every(Number.isFinite));
    assert.deepEqual(numbers(pose.d).slice(-2), [foot.x, foot.y]);
  }
});

test('every stripe is centered on the bent shin and normal to it across a gait sweep', () => {
  assert.ok(rig, 'an independent geometry rig must exist');
  for (const dx of [-15, 0, 10, 20]) for (const lift of [0, 4, 8]) {
    const pose = rig.limb({ x: 42, y: 138 }, { x: 42 + dx, y: 179 - lift }, 26.24, 26.24, -1);
    const d = rig.markings(pose.knee, pose.foot, 7, 2), n = numbers(d);
    assert.equal(n.length, 8);
    const tx = pose.foot.x - pose.knee.x, ty = pose.foot.y - pose.knee.y, length = Math.hypot(tx, ty);
    for (let i = 0; i < n.length; i += 4) {
      const [x1, y1, x2, y2] = n.slice(i, i + 4), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      near(((mx - pose.knee.x) * ty - (my - pose.knee.y) * tx) / length, 0);
      near((x2 - x1) * tx + (y2 - y1) * ty, 0);
      near(Math.hypot(x2 - x1, y2 - y1), 7);
      const along = ((mx - pose.knee.x) * tx + (my - pose.knee.y) * ty) / (length * length);
      assert.ok(along > 0 && along < 1, 'stripe remains between knee and foot');
    }
  }
});

test('zero-length shin and zero stripe count produce no detached decoration', () => {
  assert.ok(rig, 'an independent geometry rig must exist');
  assert.equal(rig.markings({ x: 1, y: 2 }, { x: 1, y: 2 }), '');
  assert.equal(rig.markings({ x: 1, y: 2 }, { x: 4, y: 8 }, 7, 0), '');
});

const { Element } = require('./engine-harness.cjs');
sandbox.window.SpringGarden.art = {};
for (const name of ['core', 'wildlife']) vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../src/' + name + '.js'), 'utf8'), sandbox);
function model(id) {
  const root = new Element('svg');
  root.innerHTML = sandbox.window.SpringGarden.art.animal(id);
  return root;
}

test('fish turning moves the complete fish including its mouth and fins', () => {
  const fish = model('fish'), pose = fish.querySelector('.fish-pose');
  assert.ok(pose, 'the fish needs one whole-body turn carrier');
  for (const part of ['.tail', '.wings', '.gill', '.fish-mouth']) assert.ok(pose.querySelector(part), part + ' turns with the body');
  assert.equal(pose.parentNode.children.length, 1, 'no part of the fish remains outside the turn carrier');
});

test('peacock legs join the torso and each named foot can be placed independently', () => {
  const bird = model('peacock'), feet = bird.querySelector('.peacock-feet');
  assert.ok(feet, 'peacock must provide a two-leg gait carrier');
  assert.equal(feet.children.length, 2);
  for (const side of ['left', 'right']) {
    const leg = feet.querySelector('.peacock-leg-' + side), foot = leg?.querySelector('[data-foot-name="' + side + '"]');
    assert.ok(leg && foot, side + ' foot has a named independent group');
    const n = numbers(leg.querySelector('.limb').getAttribute('d'));
    assert.deepEqual(n.slice(0, 2), [+leg.dataset.hipX, +leg.dataset.hipY]);
    assert.deepEqual(n.slice(-2), [+leg.dataset.footX, +leg.dataset.footY]);
    assert.ok(+leg.dataset.hipY < 153 && +leg.dataset.footY >= 177);
    assert.deepEqual(numbers(foot.getAttribute('transform')), [+leg.dataset.footX, +leg.dataset.footY]);
  }
});

test('penguin provides two persistent feet instead of a combined drawing replaced during walking', () => {
  const feet = model('penguin').querySelector('.penguin-feet');
  assert.equal(feet.children.length, 2);
  assert.ok(feet.querySelector('.penguin-foot-left'));
  assert.ok(feet.querySelector('.penguin-foot-right'));
});

test('generic feet retain their hip and exact rest contact while stripes fit the shin', () => {
  for (const id of ['cat', 'elephant', 'giraffe', 'tiger', 'zebra', 'hippo', 'rhino']) {
    for (const leg of model(id).querySelectorAll('.leg')) {
      const skin = leg.querySelector('.limb'), foot = leg.querySelector('.foot');
      assert.ok(skin && foot, id + ' has independent limb and foot');
      const n = numbers(skin.getAttribute('d'));
      assert.deepEqual(n.slice(0, 2), [+leg.dataset.hipX, +leg.dataset.hipY]);
      assert.deepEqual(n.slice(-2), [+leg.dataset.footX, +leg.dataset.footY]);
      assert.deepEqual(numbers(foot.getAttribute('transform')), n.slice(-2));
      if (id === 'zebra') {
        const stripes = numbers(leg.querySelector('.leg-markings').getAttribute('d'));
        const knee = { x: n[2], y: n[3] }, dx = n[4] - n[2], dy = n[5] - n[3], length = Math.hypot(dx, dy);
        for (let i = 0; i < stripes.length; i += 2) {
          const distanceFromShin = Math.abs((stripes[i] - knee.x) * dy - (stripes[i + 1] - knee.y) * dx) / length;
          assert.ok(distanceFromShin + 1.5 < +skin.getAttribute('stroke-width') / 2, 'stripe and its stroke fit inside the leg');
        }
      }
    }
  }
});
