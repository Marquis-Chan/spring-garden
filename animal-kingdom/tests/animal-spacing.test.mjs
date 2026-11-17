import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { groundHeight } from '../src/diorama.js';
import { makeFish } from '../src/animals.js';
import { createOrchard } from '../src/orchard-state.js';
import { makeButterfly, makeCat } from '../src/orchard-actors.js';
import { createOcean } from '../src/ocean-state.js';
import { makeOceanDiorama } from '../src/ocean-diorama.js';
import { createRiver } from '../src/river-state.js';
import { makeHippo } from '../src/river-actors.js';
import { createAsia } from '../src/asia-state.js';
import { makePeacock, makeTiger } from '../src/asia-actors.js';

const direction = new T.Vector3(.918, .371, .137).normalize();
const opposite = direction.clone().negate();
const ray = new T.Raycaster();
const point = new T.Vector3();

function closedMeshes(root) {
  const meshes = [];
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry.attributes.position) return;
    mesh.geometry.computeBoundingBox();
    mesh.material = mesh.material.clone();
    mesh.material.side = T.DoubleSide;
    meshes.push({ mesh, box: new T.Box3() });
  });
  return meshes;
}

function place(model, actor) {
  model.root.position.set(actor.x, actor.y, actor.z);
  model.root.rotation.y = actor.yaw;
  model.pose(actor);
  model.root.updateWorldMatrix(true, true);
}

function intersects(left, right, tolerance) {
  for (const { mesh, box } of [...left, ...right]) box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
  // 包围盒只用于筛选；实际检查网格的取样顶点是否落进对方封闭表面。
  for (const [from, into] of [[left, right], [right, left]]) {
    for (const a of from) for (const b of into) {
      if (!a.box.intersectsBox(b.box)) continue;
      const position = a.mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i += Math.ceil(position.count / 32)) {
        point.fromBufferAttribute(position, i).applyMatrix4(a.mesh.matrixWorld);
        if (!b.box.containsPoint(point)) continue;
        ray.set(point, direction);
        const hits = ray.intersectObject(b.mesh, false).filter((hit, j, all) =>
          j === 0 || Math.abs(hit.distance - all[j - 1].distance) > 1e-6);
        if (hits.length % 2 === 0 || hits[0].distance <= tolerance) continue;
        ray.set(point, opposite);
        if ((ray.intersectObject(b.mesh, false)[0]?.distance ?? 0) > tolerance) return true;
      }
    }
  }
  return false;
}

test('蝴蝶停在第一朵花和起飞时，翅膀不扫过猫脸', () => {
  const orchard = createOrchard(), cat = makeCat(T), butterfly = makeButterfly(T);
  const catSurfaces = closedMeshes(cat.root), butterflySurfaces = closedMeshes(butterfly.root);
  for (let frame = 0; frame < 9 * 36; frame++) {
    if (frame === 72 || frame === 124 || frame === 180) orchard.tapButterfly();
    if (frame === 115) orchard.tapCat();
    orchard.step(1 / 36, true);
    place(cat, orchard.cat);
    place(butterfly, orchard.butterfly);
    assert.equal(intersects(catSurfaces, butterflySurfaces, .017), false, `果园第 ${frame} 帧`);
  }
});

test('海葵大小鱼同时进出、回身和躲鲨鱼时身体不相交', () => {
  const sea = createOcean(), model = makeOceanDiorama(new T.Scene());
  const resident = closedMeshes(model.actors.clown.root);
  const visitor = closedMeshes(model.hintNodes.visitor);
  let shared = 0;
  for (let frame = 0; frame < 13 * 36; frame++) {
    if (frame === 72 || frame === 360) sea.tapProp('anemone');
    if (frame === 112) sea.tapVisitor();
    if (frame === 144 || frame === 317 || frame === 389) sea.tap('shark');
    sea.step(1 / 36, true);
    if (!sea.visitor.visible) continue;
    shared += Number(sea.animals.clown.hide > .7);
    model.tick(sea, 0);
    model.root.updateMatrixWorld(true);
    assert.equal(intersects(resident, visitor, .021), false, `海葵第 ${frame} 帧`);
  }
  assert.ok(shared > 40, '小丑鱼和访客仍可同时在海葵附近出现');
});

test('河马游动、沉降和掀浪时，鱼身和鱼尾都留在一旁的水道', () => {
  const river = createRiver(() => {}, { groundAt: groundHeight });
  const hippo = makeHippo(T, groundHeight);
  const fish = makeFish(T);
  fish.root.scale.set(.63, .30, .63);
  const hippoSurfaces = closedMeshes(hippo.root), fishSurfaces = closedMeshes(fish.root);
  for (let frame = 0; frame <= 14 * 36; frame++) {
    if ([18, 259, 407].includes(frame)) river.tapHippo();
    if (frame === 108) river.tapGrass(0);
    if (frame === 144) river.tapFish(0);
    river.step(1 / 36, true);
    place(hippo, river.hippo);
    place(fish, { ...river.fish[0], dive: river.fish[0].dive * .45 });
    assert.equal(intersects(hippoSurfaces, fishSurfaces, .018), false, `河岸第 ${frame} 帧`);
  }
});

test('孔雀开屏时，虎沿林道换位、探草和触落果也不会扫进扇面', () => {
  const forest = createAsia(() => {}, { groundAt: groundHeight });
  const tiger = makeTiger(T), peacock = makePeacock(T);
  const tigerSurfaces = closedMeshes(tiger.root), fanSurfaces = closedMeshes(peacock.root);
  let openFrames = 0;
  for (let frame = 0; frame <= 15 * 36; frame++) {
    if ([18, 360].includes(frame)) forest.tapSharedFruit();
    if (frame === 72) forest.tapPeacockFan();
    if (frame === 216) forest.tapTiger();
    if (frame === 234) forest.tapPeacockSeeds();
    if (frame === 288) forest.tapTuft();
    if (frame === 396) forest.tapPeacock();
    forest.step(1 / 36, true);
    openFrames += Number(forest.peacock.fan > .8);
    place(tiger, forest.tiger);
    place(peacock, forest.peacock);
    assert.equal(intersects(tigerSurfaces, fanSurfaces, .018), false, `亚洲树林第 ${frame} 帧`);
  }
  assert.ok(openFrames > 100);
});
