import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { createSavanna, savannaPoints } from '../src/savanna-state.js';
import { makeElephant, makeGiraffe, makeLion } from '../src/savanna-actors.js';
import { makeSavannaDiorama } from '../src/savanna-diorama.js';

function setup() {
  const events = [];
  const savanna = createSavanna(event => events.push({ ...event, time: savanna.time }));

  function advance(seconds, active) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) savanna.step(1 / 60, active);
  }

  return { savanna, events, advance };
}

const position = ({ x, y, z }) => ({ x, y, z });

test('象、鹿、斑马和狮安静各走几步，不会擅自喷水、吃叶子或发声', () => {
  const { savanna, events, advance } = setup();
  const animals = [savanna.elephant, savanna.giraffe, savanna.zebra, savanna.lion];
  const origins = animals.map(position);
  const moved = [false, false, false, false];
  for (let i = 0; i < 256; i++) {
    advance(.05, true);
    animals.forEach((animal, index) => {
      moved[index] ||= Math.hypot(animal.x - origins[index].x, animal.z - origins[index].z) > (index === 3 ? .12 : .27);
      assert.equal(animal.y, origins[index].y);
    });
  }
  assert.deepEqual(moved, [true, true, true, true]);
  assert.ok(animals.every(animal => animal.stride > 0));
  assert.deepEqual(events, []);
  const zebraAtDusk = position(savanna.zebra);
  savanna.setNight(true);
  advance(7, true);
  assert.deepEqual(position(savanna.zebra), zebraAtDusk);
  assert.equal(savanna.zebra.sleep, 1);
});

test('大象走开时点下就回应，归位对准水面再取水，实际洒近花才引斑马回头', () => {
  const { savanna, events, advance } = setup();
  advance(2.7, true);
  assert.ok(savanna.elephant.x < savannaPoints.elephant.x - .20);
  savanna.tapFlower(1);
  savanna.tapElephant();
  assert.equal(events.at(-1).type, 'elephant-call');
  advance(.23, true);
  assert.equal(savanna.elephant.scoop, 0);
  while (savanna.time < 6 && !events.some(({ type }) => type === 'scoop')) advance(.05, true);
  assert.ok(events.some(({ type }) => type === 'scoop'));
  assert.deepEqual(position(savanna.elephant), savannaPoints.elephant);
  assert.ok(Math.abs(savanna.elephant.yaw) < .02);
  advance(1.35, true);
  const water = events.findIndex(({ type }) => type === 'water-hit');
  const look = events.findIndex(({ type }) => type === 'zebra-water-look');
  assert.ok(water >= 0 && look > water);
  assert.equal(events[look].index, 1);

  const far = setup();
  far.savanna.tapElephant();
  far.advance(2.2, true);
  assert.ok(far.events.some(({ type }) => type === 'water-hit'));
  assert.ok(!far.events.some(({ type }) => type === 'zebra-water-look'));
});

test('鹿走动时点叶，先稳住四脚并按当前位置准确咬叶', () => {
  const { savanna, events, advance } = setup();
  advance(4.90, true);
  const giraffe = savanna.giraffe;
  assert.ok(Math.hypot(giraffe.x - savannaPoints.giraffe.x, giraffe.z - savannaPoints.giraffe.z) > .15);
  const body = position(giraffe), walkingHeading = giraffe.yaw;
  savanna.tapBranch(0);
  advance(.15, true);
  assert.deepEqual(position(giraffe), body);
  assert.notEqual(giraffe.yaw, walkingHeading);
  assert.equal(giraffe.browse, 0);
  while (savanna.time < 6.65 && giraffe.browse === 0) advance(.04, true);
  const yaw = giraffe.yaw;
  assert.ok(giraffe.browse > 0);
  advance(.60, true);
  assert.deepEqual(position(giraffe), body);
  assert.equal(giraffe.yaw, yaw);
  assert.ok(giraffe.reachZ > .55, '鼻吻始终朝身前的叶');
  const worldLeafX = giraffe.x + giraffe.reachX * Math.cos(yaw) + giraffe.reachZ * Math.sin(yaw);
  const worldLeafZ = giraffe.z - giraffe.reachX * Math.sin(yaw) + giraffe.reachZ * Math.cos(yaw);
  assert.ok(Math.hypot(worldLeafX - savannaPoints.leaves[0].x, worldLeafZ - savannaPoints.leaves[0].z) < .00001);
  assert.ok(events.some(({ type }) => type === 'leaf-bite'));
});

test('长颈鹿走完一趟会多停一会，停着也可以马上点叶', () => {
  const { savanna, events, advance } = setup();
  advance(5.65, true);
  const resting = position(savanna.giraffe);
  advance(6.70, true);
  assert.deepEqual(position(savanna.giraffe), resting);
  savanna.tapBranch(0);
  assert.ok(events.some(({ type }) => type === 'leaf-select'));
  advance(2.2, true);
  assert.ok(events.some(({ type }) => type === 'leaf-bite'));
});

test('大象先在水边取水，喷出的水到达所选花才开，另一丛保持干燥', () => {
  const { savanna, events, advance } = setup();
  savanna.tapFlower(1);
  assert.deepEqual(savanna.flowers.map(flower => flower.selected), [false, true]);
  savanna.tapElephant();
  advance(.23);
  assert.ok(savanna.elephant.scoop > 0);
  assert.equal(events.some(event => event.type === 'spray'), false);
  assert.ok(savanna.flowers.every(flower => flower.wet === 0 && flower.bloom === 0));

  advance(.51);
  const scoop = events.find(event => event.type === 'scoop');
  const spray = events.find(event => event.type === 'spray');
  assert.deepEqual(position(scoop), savannaPoints.water);
  assert.deepEqual(position(spray), savannaPoints.flowers[1]);
  assert.equal(spray.index, 1);
  assert.ok(scoop.time < spray.time);
  assert.ok(savanna.flowers.every(flower => flower.wet === 0));

  advance(.75);
  const hit = events.find(event => event.type === 'water-hit');
  assert.equal(hit.index, 1);
  assert.ok(hit.time - spray.time >= .42 && hit.time - spray.time <= .48);
  assert.ok(savanna.flowers[1].wet > .9 && savanna.flowers[1].bloom > .8);
  assert.equal(savanna.flowers[0].wet, 0);
  assert.equal(savanna.flowers[0].bloom, 0);
});

test('连点象鼻只完成当前一程，改选花影响下一程', () => {
  const { savanna, events, advance } = setup();
  savanna.tapElephant();
  advance(.22);
  savanna.tapFlower(1);
  for (let tap = 0; tap < 5; tap++) savanna.tapElephant();
  advance(1.4);
  assert.deepEqual(events.filter(event => event.type === 'water-hit').map(event => event.index), [0]);
  assert.equal(events.filter(event => event.type === 'elephant-call').length, 1);

  savanna.tapElephant();
  advance(1.6);
  assert.deepEqual(events.filter(event => event.type === 'water-hit').map(event => event.index), [0, 1]);
  assert.ok(savanna.flowers.every(flower => flower.bloom > .8));
});

test('鹿吻到选定的枝才咬叶，近处落叶到地面后斑马才转耳', () => {
  const { savanna, events, advance } = setup();
  savanna.tapBranch(0);
  advance(.23);
  assert.ok(savanna.giraffe.browse > 0);
  assert.equal(savanna.leaves[0].remaining, 3);
  assert.equal(savanna.leaves[0].bend, 0);
  assert.equal(savanna.zebra.listen, 0);

  advance(.41);
  const bite = events.find(event => event.type === 'leaf-bite');
  assert.equal(bite.index, 0);
  assert.deepEqual(position(bite), savannaPoints.leaves[0]);
  assert.ok(savanna.giraffe.browse > .98);
  assert.equal(savanna.leaves[0].remaining, 2);
  assert.ok(savanna.leaves[0].bend > 0 && savanna.giraffe.chew > 0);
  assert.equal(savanna.zebra.listen, 0);

  advance(.53);
  const fall = events.find(event => event.type === 'leaf-fall');
  const landing = events.find(event => event.type === 'leaf-land');
  assert.ok(fall.time >= bite.time && landing.time > fall.time);
  assert.ok(Math.abs(savanna.zebra.listen) > .04);
  assert.equal(savanna.leaves[1].remaining, 3);
});

test('远处落叶不让斑马跟动，枝上叶片会长回并可以再吃', () => {
  const { savanna, events, advance } = setup();
  savanna.tapBranch(1);
  advance(1.62);
  assert.ok(events.some(event => event.type === 'leaf-land' && event.index === 1));
  assert.equal(savanna.zebra.listen, 0);
  assert.deepEqual(position(savanna.zebra), savannaPoints.zebra);
  assert.equal(savanna.leaves[1].remaining, 2);
  advance(3);
  assert.equal(savanna.leaves[1].remaining, 3);
  savanna.tapGiraffe();
  advance(.72);
  assert.deepEqual(events.filter(event => event.type === 'leaf-bite').map(event => event.index), [1, 1]);
});

test('斑马跑到另一边后，同一片近枝的落叶也不会让它转耳', () => {
  const { savanna, events, advance } = setup();
  savanna.tapZebra();
  advance(1);
  savanna.tapBranch(0);
  advance(1.3);
  assert.ok(events.some(event => event.type === 'leaf-land' && event.index === 0));
  assert.deepEqual(position(savanna.zebra), savannaPoints.zebraRun);
  assert.equal(savanna.zebra.listen, 0);
});

test('斑马在实际小跑期间逐步留下蹄纹，从新位置能跑回来', () => {
  const { savanna, events, advance } = setup();
  savanna.tapZebra();
  assert.equal(events[0].type, 'zebra-call');
  assert.equal(events.some(event => event.type === 'hoof'), false);
  const flower = savannaPoints.flowers[1];
  let closest = Infinity;
  function checkRoute(frames) {
    for (let frame = 0; frame < frames; frame++) {
      advance(1 / 60);
      closest = Math.min(closest, Math.hypot(savanna.zebra.x - flower.x, savanna.zebra.z - flower.z));
    }
  }
  checkRoute(21);
  assert.ok(savanna.zebra.gait > .3 && savanna.zebra.stride > 0);
  const hoofprints = events.filter(event => event.type === 'hoof');
  assert.ok(hoofprints.length >= 2);
  assert.ok(hoofprints.every(event => event.time > 0 && event.y >= savannaPoints.floor));

  checkRoute(54);
  assert.deepEqual(position(savanna.zebra), savannaPoints.zebraRun);
  assert.equal(savanna.zebra.gait, 0);
  const stride = savanna.zebra.stride;
  savanna.tapZebra();
  checkRoute(74);
  assert.deepEqual(position(savanna.zebra), savannaPoints.zebra);
  assert.ok(savanna.zebra.stride > stride);
  assert.ok(closest > .70, '往返路线应绕开右侧的花');
});

test('点狮张嘴发声，点晒石只让它安静伸展', () => {
  const { savanna, events, advance } = setup();
  savanna.tapRock();
  advance(.32);
  assert.ok(savanna.lion.stretch > 0);
  assert.equal(savanna.lion.roar, 0);
  assert.equal(events.some(event => event.type === 'lion-call'), false);
  savanna.tapLion();
  advance(.24);
  assert.ok(savanna.lion.roar > 0);
  assert.equal(events.filter(event => event.type === 'lion-call').length, 1);
  assert.deepEqual(position(savanna.lion), savannaPoints.lion);
});

test('夜里斑马休息、鹿只哼叫，已经喷出的水仍然落花', () => {
  const { savanna, events, advance } = setup();
  savanna.tapElephant();
  advance(.75);
  assert.ok(events.some(event => event.type === 'spray'));
  savanna.setNight(true);
  savanna.tapZebra();
  savanna.tapGiraffe();
  advance(.75);

  assert.equal(savanna.zebra.sleep, 1);
  assert.deepEqual(position(savanna.zebra), savannaPoints.zebra);
  assert.ok(events.some(event => event.type === 'sleep' && event.animal === 'zebra'));
  assert.ok(events.some(event => event.type === 'giraffe-call'));
  assert.ok(events.some(event => event.type === 'water-hit'));
  assert.equal(events.some(event => event.type === 'leaf-bite' || event.type === 'hoof'), false);

  savanna.setNight(false);
  advance(.51);
  assert.equal(savanna.zebra.sleep, 0);
  savanna.tapGiraffe();
  advance(.73);
  assert.ok(events.some(event => event.type === 'leaf-bite'));
  assert.equal(events.filter(event => event.type === 'giraffe-call').length, 1);
});

test('长颈鹿走路转身时的支撑蹄不滑，实际模型就地碰到两侧的叶面', () => {
  for (const index of [0, 1]) {
    const rig = makeGiraffe(T);
    let heldFeet = 0;
    let mouthContacts = 0;
    const plain = createSavanna(event => {
      if (event.type !== 'leaf-bite') return;
      const body = plain.giraffe;
      rig.root.position.set(body.x, body.y, body.z);
      rig.root.rotation.y = body.yaw;
      rig.pose(body);
      const muzzle = rig.mouth.getWorldPosition(new T.Vector3());
      assert.ok(muzzle.distanceTo(new T.Vector3(event.x, event.y, event.z)) < 1e-5);
      mouthContacts++;
    });
    for (let frame = 0; frame < 310; frame++) {
      if (frame === 187) plain.tapBranch(index);
      const before = plain.giraffe.feet.map(position);
      plain.step(1 / 60, true);
      for (const [i, foot] of plain.giraffe.feet.entries()) {
        if (foot.y !== savannaPoints.floor || before[i].y !== savannaPoints.floor) continue;
        assert.deepEqual(position(foot), before[i]);
        heldFeet++;
      }
      assert.ok(plain.giraffe.feet.filter(foot => foot.y === savannaPoints.floor).length >= 3);
    }
    assert.ok(heldFeet > 780);
    assert.equal(mouthContacts, 1);
  }
});

test('点芒草先给提示，狮前爪确实到位才压弯，并保留直接点狮发声', () => {
  const rig = makeLion(T);
  const events = [];
  const plain = createSavanna(event => {
    events.push(event);
    if (event.type !== 'lion-grass-contact') return;
    const body = plain.lion;
    rig.root.position.set(body.x, body.y, body.z);
    rig.root.rotation.y = body.yaw;
    rig.pose(body);
    assert.ok(rig.pawContact.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(event.x, event.y, event.z)) < 1e-5);
  });
  for (let i = 0; i < 283; i++) plain.step(1 / 60, true);
  const before = position(plain.lion);
  plain.tapLionGrass();
  assert.equal(events.at(-1).type, 'lion-grass-touch');
  for (let i = 0; i < 11; i++) plain.step(1 / 60, true);
  assert.ok(plain.lionGrass.cue > .6 && plain.lion.attention > .7);
  assert.equal(plain.lionGrass.bend, 0);
  for (let i = 0; i < 56; i++) plain.step(1 / 60, true);
  assert.ok(events.some(event => event.type === 'lion-grass-contact'));
  assert.ok(plain.lionGrass.bend > 0);
  assert.deepEqual(position(plain.lion), before);
  assert.ok(!events.some(event => event.type === 'lion-call'));
  plain.tapLion();
  assert.equal(events.at(-1).type, 'lion-call');
});

test('右枝黄叶落在石沿，狮爪够到实体叶面才拨走，夜里不补玩', () => {
  const lion=makeLion(T);
  const stage=makeSavannaDiorama(new T.Scene(),savannaPoints);
  const events=[];
  const plain=createSavanna(event=>{events.push(event);stage.react(event,plain.time);});
  const fallen=stage.root.getObjectByName('随枝飘落的叶1');
  let contact=false,lofted=false;
  for(let i=0;i<280;i++){
    if(i===1||i===90)plain.tapBranch(1);
    const cursor=events.length;
    plain.step(1/60,true);
    lion.root.position.set(plain.lion.x,plain.lion.y,plain.lion.z);
    lion.root.rotation.y=plain.lion.yaw;lion.pose(plain.lion);
    stage.tick(plain,new T.Vector3(),0,0);
    if(events.slice(cursor).some(e=>e.type==='lion-bats-leaf')){
      assert.ok(fallen.visible);
      assert.ok(lion.pawContact.getWorldPosition(new T.Vector3()).distanceTo(fallen.position)<.002);
      contact=true;
    }
    if(contact && fallen.visible && fallen.position.y>.77 && fallen.position.z>7.00)lofted=true;
  }
  assert.ok(contact&&lofted);
  assert.equal(fallen.visible,false);
  assert.deepEqual(events.filter(e=>['leaf-land','lion-bats-leaf'].includes(e.type)).map(e=>e.type),['leaf-land','lion-bats-leaf']);
  plain.tapBranch(1);
  plain.setNight(true);
  for(let i=0;i<210;i++)plain.step(1/60,true);
  assert.equal(events.filter(e=>e.type==='lion-bats-leaf').length,1);
});

test('蹄声带起象耳与卷鼻，点花立即取水，只有近花能让斑马抖鬃',()=>{
  const {savanna,events,advance}=setup();
  const rig=makeElephant(T);
  rig.pose(savanna.elephant);
  const first=rig.nozzle.position.clone();
  savanna.tapZebra();
  advance(.1,true);
  assert.equal(savanna.elephant.sniff,0);
  advance(.9,true);
  rig.pose(savanna.elephant);
  rig.root.rotation.y=savanna.elephant.yaw;
  const lifted=rig.nozzle.getWorldPosition(new T.Vector3());
  assert.ok(savanna.elephant.listen>.5 && lifted.y>first.y+.70);
  assert.ok(lifted.x>first.x+.50);
  const toZebra=Math.atan2(savanna.zebra.x-savanna.elephant.x,savanna.zebra.z-savanna.elephant.z);
  assert.ok(Math.abs(Math.atan2(lifted.x,lifted.z)-toZebra)<.22);
  assert.ok(events.findIndex(e=>e.type==='hoof')<events.findIndex(e=>e.type==='elephant-hears-hooves'));
  savanna.tapFlower(0);
  advance(1.8,true);
  assert.ok(events.some(e=>e.type==='water-hit'&&e.index===0));
  assert.equal(savanna.zebra.shake,0);
  const next=setup();
  next.savanna.tapFlower(1);
  let shaken=false;
  for(let f=0;f<160;f++){next.advance(1/60,true);shaken ||= Math.abs(next.savanna.zebra.shake)>.72;}
  assert.ok(shaken);
});

test('水花刚落就连点另一丛花，象鼻收回后再浇一次，反复点同一朵不会排队',()=>{
  const {savanna,events,advance}=setup();
  savanna.tapFlower(0);
  advance(1.14,true);
  savanna.tapFlower(1);
  savanna.tapFlower(1);
  advance(4,true);
  assert.deepEqual(events.filter(e=>e.type==='water-hit').map(e=>e.index),[0,1]);
});
