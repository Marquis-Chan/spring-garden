import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { groundHeight } from '../src/diorama.js';
import { createRiver, riverPoints } from '../src/river-state.js';
import { makeHippo } from '../src/river-actors.js';
import { makeRhino } from '../src/river-rhino.js';
import { makeRiverDiorama } from '../src/river-diorama.js';

function setup(options) {
  const events = [];
  const river = createRiver(event => events.push({ ...event, time: river.time }), options);

  function advance(seconds, active) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) river.step(1 / 60, active);
  }

  return { river, events, advance };
}

const position = ({ x, y, z }) => ({ x, y, z });
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('河岸小鸟跟随实际背部落点，刷牙时离开河马，入夜回枝休息', () => {
  const {river,events}=setup({groundAt:groundHeight});
  const rhino=makeRhino(T,groundHeight),hippo=makeHippo(T,groundHeight);
  const bank=makeRiverDiorama(new T.Scene(),riverPoints,groundHeight);
  const anchors={rhino:new T.Vector3(),hippo:new T.Vector3(),branch:{...riverPoints.birdPerch,yaw:.2}};
  const bird=river.bird;
  const ray=new T.Raycaster(),probe=new T.Vector3(),down=new T.Vector3(0,-1,0);
  function frame(){
    river.step(1/60,true);
    for(const [name,model] of [['rhino',rhino],['hippo',hippo]]){
      const host=river[name];
      model.root.position.set(host.x,host.y,host.z);
      model.root.rotation.y=host.yaw;
      model.pose(host);
      model.root.updateMatrixWorld(true);
      model.birdPerch.getWorldPosition(anchors[name]);
      anchors[name].yaw=host.yaw+(name==='rhino'?2.05:-1.10);
    }
    river.poseBird(1/60,true,anchors);
  }
  function feetMeet(surface){
    surface.updateWorldMatrix(true,false);
    // 两脚最前方的爪尖在模型中的 y 为 -.03，部件缩放 .73。
    for(const side of [-1,1]){
      probe.set(side*.067,0,.069).applyAxisAngle(new T.Vector3(0,1,0),bird.yaw);
      probe.add(new T.Vector3(bird.x,bird.y+.4,bird.z));
      ray.set(probe,down);
      const top=ray.intersectObject(surface,false)[0];
      assert.ok(top && Math.abs(bird.y-.022-top.point.y)<.029,bird.site+' 的爪尖接触栖面');
    }
  }
  frame();
  assert.equal(bird.site,'rhino');
  feetMeet(rhino.root.getObjectByProperty('isSkinnedMesh',true));
  river.tapBird();
  const strokes=[];
  for(let i=0;i<105;i++){frame(); if(bird.flight>.92)strokes.push(bird.flap);}
  assert.ok(Math.min(...strokes)<-.92 && Math.max(...strokes)>.92);
  assert.equal(bird.site,'hippo');
  for(let i=0;i<35;i++){
    frame();
    assert.ok(Math.abs(bird.y-anchors.hippo.y)<1e-6);
  }
  feetMeet(hippo.root.getObjectByName('Wide soft hippo barrel'));
  river.tapToothbrush();
  frame();
  assert.equal(bird.to,'branch');
  for(let i=0;i<110;i++)frame();
  assert.equal(bird.site,'branch');
  feetMeet(bank.root.getObjectByName('岸边栖鸟枯枝'));
  river.tapBird();
  for(let i=0;i<115;i++)frame();
  assert.equal(bird.site,'rhino');
  river.setNight(true);
  for(let i=0;i<185;i++)frame();
  assert.ok(bird.sleep>.97 && bird.site==='branch');
  river.tapBird();
  assert.equal(events.at(-1).animal,'river-bird');
  assert.equal(events.filter(e=>e.type==='bird-call').length,2);
});

test('点常驻鸭请出第二只，客鸭回到遮蔽后不接收点击', () => {
  const {river,events,advance} = setup({groundAt:groundHeight});
  const [lead,outer] = river.ducks;
  const start = position(lead);
  advance(4.2,true);
  assert.ok(gap(start,lead)>.13);
  assert.ok(gap(lead,outer)>.65);
  assert.equal(outer.present,false);
  river.tapDuck(1);
  assert.equal(events.length,0);
  river.tapDuck(0);
  advance(2.5,true);
  assert.ok(outer.present && outer.interactive);
  river.tapDuck(1);
  advance(.66,true);
  assert.ok(outer.headUp>.40 && lead.headUp>.25 && lead.call===0);
  assert.ok(events.some(e=>e.type==='river-duck-reply'&&e.index===0));
  advance(12,true);
  assert.equal(outer.present,false);
  assert.equal(outer.interactive,false);
  river.setNight(true);
  advance(.70,true);
  const sleeping = position(lead);
  river.tapDuck(0);
  advance(.75,true);
  assert.equal(lead.sleep,1);
  assert.deepEqual(position(lead),sleeping);
  assert.equal(events.at(-1).animal,'river-duck');
});

test('河马沉回水线后才发一圈波，先到近叶再到远叶', () => {
  const { river, events, advance } = setup();
  river.tapHippo();
  assert.equal(events[0].type, 'hippo-call');
  advance(.35);
  assert.ok(river.hippo.lift > .7 && river.hippo.gape > 0);
  assert.equal(river.waves.length, 0);
  river.tapHippo();
  advance(.40);
  assert.equal(events.some(event => event.type === 'wave'), false);
  assert.ok(river.leaves.every(leaf => leaf.bob === 0));

  advance(.50);
  const wave = events.find(event => event.type === 'wave');
  assert.deepEqual(position(wave), riverPoints.waveOrigin);
  assert.ok(wave.speed > 0);
  assert.ok(river.waves[0].radius > 0);
  assert.deepEqual(events.filter(event => event.type === 'wave-leaf').map(event => event.index), [0]);
  assert.ok(river.leaves[0].bob > 0);
  assert.equal(river.leaves[1].bob, 0);

  advance(.75);
  const leaves = events.filter(event => event.type === 'wave-leaf');
  assert.deepEqual(leaves.map(event => event.index), [0, 1]);
  for (const event of leaves) {
    assert.ok(Math.abs(event.time - wave.time - gap(event, wave) / wave.speed) < .025);
  }
  assert.equal(events.filter(event => event.type === 'wave').length, 1);
  const reached=events.filter(event=>event.type==='wave-fish');
  assert.deepEqual(reached.map(event=>event.index).sort(),[0,1]);
  for(const event of reached)assert.ok(Math.abs(event.time-wave.time-gap(event,wave)/wave.speed)<.025);
});

test('刷牙时不自动引来小鸭，安静停留后仍能等到它游出', () => {
  const {river,advance}=setup();
  river.tapToothbrush();
  advance(32,true);
  assert.equal(river.ducks[1].present,false);
  river.returnToothbrush();
  advance(57,true);
  assert.equal(river.ducks[1].interactive,true);
});

test('同一处波能到近龟，到不了远岸踏石，回到浅水可以再玩', () => {
  const { river, events, advance } = setup();
  river.tapHippo();
  advance(1.58);
  assert.ok(events.some(event => event.type === 'wave-turtle'));
  assert.ok(Math.abs(river.turtle.listen) > .10);

  river.tapStone(1);
  advance(.42);
  assert.ok(river.turtle.paddle > 0 && river.turtle.site === 0);
  advance(.90);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[1]);
  assert.equal(river.turtle.bask, 1);

  river.tapHippo();
  advance(2);
  assert.equal(events.filter(event => event.type === 'wave-turtle').length, 1);
  assert.equal(river.turtle.listen, 0);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[1]);

  river.tapStone(0);
  advance(1.4);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[0]);
  assert.equal(river.turtle.bask, 0);
  river.tapHippo();
  advance(1.58);
  assert.equal(events.filter(event => event.type === 'wave-turtle').length, 2);
});

test('点壳缩头再探但不换位，缩壳时水波经过不会补播转头', () => {
  const { river, events, advance } = setup();
  const origin = position(river.turtle);
  river.tapHippo();
  advance(1.31);
  river.tapTurtle();
  advance(.20);
  assert.ok(river.turtle.reach < .35);
  assert.equal(river.turtle.listen, 0);
  assert.deepEqual(position(river.turtle), origin);
  advance(1.25);
  assert.equal(river.turtle.reach, 1);
  assert.equal(events.some(event => event.type === 'wave-turtle'), false);
  assert.equal(river.turtle.listen, 0);
});

test('连续点踏石只保留最后一个在途目标，夜间到站后休息', () => {
  const { river, events, advance } = setup();
  river.tapStone(1);
  advance(.3);
  river.tapStone(0);
  river.tapStone(1);
  advance(1.3);
  assert.equal(river.turtle.site, 1);

  river.tapStone(0);
  advance(.3);
  river.tapStone(1);
  river.setNight(true);
  assert.equal(river.turtle.sleep, 0);
  advance(1.6);
  assert.equal(river.turtle.site, 0);
  assert.equal(river.turtle.sleep, 1);
  river.tapStone(1);
  river.tapTurtle();
  river.tapHippo();
  advance(1.8);
  assert.equal(river.turtle.site, 0);
  assert.equal(river.turtle.listen, 0);
  assert.equal(events.filter(event => event.type === 'sleep' && event.animal === 'turtle').length, 2);
  assert.ok(events.some(event => event.type === 'wave'));

  river.setNight(false);
  advance(.6);
  river.tapStone(1);
  advance(1.3);
  assert.equal(river.turtle.site, 1);
  assert.equal(river.turtle.sleep, 0);
});

test('龟到石缘前仍在划水，接近晒石时已抬脚，回程沿同一浅坡入水', () => {
  const { river, advance } = setup();
  for (const site of [1, 0]) {
    river.tapStone(site);
    const samples = [];
    for (let frame = 0; frame < 73; frame++) {
      advance(1 / 60);
      samples.push({ ...river.turtle });
    }
    assert.ok(samples.some(pose => pose.x < 25.54 && pose.x > 25.03 && pose.paddle > .65 && pose.y < riverPoints.waterY));
    const approach = samples.filter(pose => pose.x < 24.98 && pose.x > 24.86);
    assert.ok(approach.some(pose => pose.paddle > .44 && pose.gait > .28 && pose.y < .53));
    const atLip = samples.filter(pose => pose.x < 24.83 && pose.x > 24.73);
    assert.ok(atLip.length);
    assert.ok(atLip.every(pose => pose.y > .53 && pose.gait > .25));
    assert.deepEqual(position(river.turtle), riverPoints.turtleSites[site]);
  }
});

test('犀牛沿独立岸路采样地面高度，走到所选草边才低头探鼻', () => {
  const groundAt = x => .62 + (x - 29.45) * .04;
  const { river, events, advance } = setup({ groundAt });
  river.tapStone(1);
  river.tapGrass(1);
  assert.equal(events.at(-1).type, 'grass-select');
  advance(.3);
  assert.ok(river.grass[1].bend > 0);
  assert.ok(river.rhino.gait > 0);
  assert.equal(river.rhino.sniff, 0);

  for (let frame = 0; frame < 180 && !events.some(event=>event.type==='rhino-sniff'); frame++) {
    advance(1 / 60);
    assert.ok(Math.abs(river.rhino.y - groundAt(river.rhino.x, river.rhino.z)) < 1e-6);
    assert.ok(gap(river.rhino, river.turtle) > 3);
  }
  const sniff = events.find(event => event.type === 'rhino-sniff');
  const stop = events.find(event => event.type === 'rhino-stop');
  assert.equal(sniff.index, 1);
  assert.ok(sniff.time - stop.time > .36);
  assert.equal(river.rhino.site, 1);
  assert.ok(gap(river.rhino, riverPoints.grass[1]) > .90);
  assert.ok(gap(river.rhino, riverPoints.grass[1]) < 1.02);
  advance(.12);
  assert.ok(river.grass[1].bend > 0 && river.rhino.sniff > .95);
  assert.equal(river.grass[0].bend, 0);

  advance(2.3);
  const before=position(river.rhino);
  river.tapRhino();
  advance(.11);
  assert.ok(river.rhino.listenEar>.6 && river.rhino.attention<.02);
  advance(.65);
  assert.ok(river.rhino.attention>.9);
  assert.deepEqual(position(river.rhino),before);
  assert.equal(river.rhino.site, 1);
  assert.equal(events.filter(event => event.type === 'rhino-call').length, 1);
});

test('鱼在水下候场，点水浮现一条，点它能潜游，消失后才能出现下一条', () => {
  const { river, advance } = setup();
  const { pool, waterY } = riverPoints;
  assert.equal(river.fish.every(f=>f.surface===0),true);
  for (let i=0;i<2;i++){
    const {x,z}=riverPoints.fish[i];
    river.tapWater(x,z);
    advance(.75);
    assert.equal(river.fish[i].surface,1);
    assert.equal(river.fish[1-i].surface,0);
    advance(4.6);
    assert.equal(river.fish[i].surface,0);
  }
  river.tapWater(river.fish[0].x,river.fish[0].z);
  advance(.6);
  river.tapFish(0);
  advance(.22);
  assert.ok(river.fish[0].dive > .6);
  assert.equal(river.fish[1].dive, 0);
  for (let frame = 0; frame < 300; frame++) {
    advance(1 / 60);
    assert.ok(gap(river.fish[0], river.fish[1]) > .47);
    assert.ok(gap(river.fish[0], river.hippo) > 1.30);
    for (const [index, fish] of river.fish.entries()) {
      assert.ok(gap(fish, riverPoints.fish[index]) < .27);
      assert.ok(Math.hypot((fish.x - pool.x) / pool.rx, (fish.z - pool.z) / pool.rz) < .81);
      assert.ok(fish.y < waterY);
    }
  }
});

test('河马、龟和犀牛各自在合适水深或岸上安静巡游，不替孩子打开道具', () => {
  const groundAt = (x, z) => .58 + (x - 29.45) * .04 + (z - 5.90) * .02;
  const { river, events, advance } = setup({ groundAt });
  const creatures = [river.hippo, river.turtle, river.rhino];
  const starts = creatures.map(position);
  const moved = [false, false, false];
  let paddled = false;
  for (let sample = 0; sample < 140; sample++) {
    advance(.05, true);
    creatures.forEach((actor, i) => { moved[i] ||= gap(actor, starts[i]) > .22; });
    paddled ||= river.turtle.paddle > .3;
    assert.equal(river.rhino.y, groundAt(river.rhino.x, river.rhino.z));
    assert.equal(river.turtle.site, 0);
    assert.ok(river.turtle.y < riverPoints.waterY);
  }
  assert.ok(paddled);
  assert.deepEqual(moved, [true, true, true]);
  assert.deepEqual(events, []);
  river.tapStone(1);
  advance(1.4, true);
  assert.deepEqual(position(river.turtle), riverPoints.turtleSites[1]);
  advance(5.2, true);
  assert.equal(river.turtle.site, 1);
  assert.equal(river.turtle.y, riverPoints.turtleSites[1].y);
  assert.ok(gap(river.turtle, riverPoints.turtleSites[1]) < .21);
});

test('河马安静换位后仍从鼻前的实际水面推出波，不回跳到旧水心', () => {
  const { river, events, advance } = setup();
  while(river.time<8 && gap(river.hippo,riverPoints.hippo)<=.24)advance(1/60,true);
  const body = position(river.hippo);
  assert.ok(gap(body, riverPoints.hippo) > .24);
  river.tapHippo();
  assert.equal(events.at(-1).type, 'hippo-call');
  const tapped=river.time;
  while (river.time-tapped < 2.5 && !events.some(({ type }) => type === 'wave')) advance(.05, true);
  const wave = events.find(({ type }) => type === 'wave');
  assert.ok(wave);
  assert.deepEqual(position(river.hippo), body);
  assert.ok(Math.abs(wave.x - (body.x + Math.sin(river.hippo.yaw) * .61)) < .0001);
  assert.ok(Math.abs(wave.z - (body.z + Math.cos(river.hippo.yaw) * .61)) < .0001);
});

test('犀牛鼻碰近水草后才引起近鱼的一次急游，远水草和远鱼不触发', () => {
  const { river, events, advance } = setup();
  river.tapGrass(0);
  advance(.27, true);
  assert.ok(!events.some(({ type }) => type === 'grass-fish-look'));
  while (river.time < 1.90 && !events.some(({ type }) => type === 'rhino-sniff')) advance(.05, true);
  advance(.18, true);
  const near = events.findIndex(({ type, index }) => type === 'rhino-sniff' && index === 0);
  const react = events.findIndex(({ type }) => type === 'grass-fish-look');
  assert.ok(near >= 0 && react > near);
  assert.equal(events[react].index, 0);
  assert.ok(river.fish[0].alert > .2);
  assert.equal(river.fish[1].alert, 0);
  river.tapGrass(1);
  advance(5.5, true);
  assert.ok(events.some(({ type, index }) => type === 'rhino-sniff' && index === 1));
  assert.equal(events.filter(({ type }) => type === 'grass-fish-look').length, 1);
});

test('两条鱼靠岸转向和下潜时也留在可容纳鳍身的真实水层内', () => {
  const { river, advance } = setup({ groundAt: groundHeight });
  for (let frame = 0; frame < 660; frame++) {
    if (frame===0||frame===300)river.tapWater(river.fish[frame===0?0:1].x,river.fish[frame===0?0:1].z);
    if (frame===45) river.tapFish(0);
    if (frame===345) river.tapFish(1);
    advance(1 / 60, true);
    for (const fish of river.fish) {
      assert.ok(fish.y >= groundHeight(fish.x, fish.z) + .065 - 1e-8);
      assert.ok(fish.y <= riverPoints.waterY - .067 + 1e-8);
    }
  }
});

test('两棵草在咬下的瞬间与实体嘴缘接触，随后叶尖变短、衔草咀嚼再长回', () => {
  const {river,events}=setup({groundAt:groundHeight});
  const rhino=makeRhino(T,groundHeight);
  const bank=makeRiverDiorama(new T.Scene(),riverPoints,groundHeight);
  const lip=new T.Vector3(),tip=new T.Vector3();
  for(const index of [1,0]){
    river.tapGrass(index);
    let distanceAtBite=Infinity,chewed=false;
    for(let frame=0;frame<360;frame++){
      const before=events.length;
      river.step(1/60,true);
      const pose=river.rhino;
      rhino.root.position.set(pose.x,pose.y,pose.z);
      rhino.root.rotation.y=pose.yaw;
      rhino.pose(pose);
      bank.tick(river,0,0,null);
      if(events.slice(before).some(e=>e.type==='rhino-sniff'&&e.index===index)){
        distanceAtBite=rhino.muzzle.getWorldPosition(lip).distanceTo(bank.grassTips[index].getWorldPosition(tip));
      }
      if(river.grass[index].nibbled>.8 && pose.sniff<.2 && pose.chew>.8 && pose.blade>.85)chewed=true;
    }
    assert.ok(distanceAtBite<.045,'咬合瞬间的实际距离 '+distanceAtBite);
    assert.ok(chewed);
    assert.equal(river.grass[index].nibbled,0);
  }
});

test('回望与咀嚼时，头颈带动连续的皮肤，站稳的脚掌仍落在原处', () => {
  const model=makeRhino(T);
  const skin=model.root.getObjectByProperty('isSkinnedMesh',true);
  const rest=new T.Vector3(),posed=new T.Vector3();
  const toes=[];
  for(let i=0;i<skin.geometry.attributes.position.count;i+=5){
    rest.fromBufferAttribute(skin.geometry.attributes.position,i);
    if(rest.y<.13)toes.push({i,point:rest.clone()});
  }
  assert.ok(toes.length>20);
  for(const action of [{yaw:5.22,attention:1},{sniff:1,chew:.8,blade:1}]){
    model.pose({time:1.2,...action});
    model.root.updateWorldMatrix(true,true);
    for(const {i,point} of toes){
      assert.ok(skin.getVertexPosition(i,posed).distanceTo(point)<.001);
    }
  }
});

test('刷牙先转正张嘴，鼠标只在牙面活动，牙刷收回后才闭嘴', () => {
  const { river, events, advance } = setup();
  advance(2.6, true);
  const anchor = position(river.hippo);
  river.tapToothbrush();
  assert.equal(river.toothbrush.phase, 'opening');
  advance(.35, true);
  assert.equal(river.toothbrush.amount, 0);
  advance(1.5, true);
  assert.equal(river.toothbrush.phase, 'active');
  assert.deepEqual(position(river.hippo), anchor);
  assert.equal(river.hippo.gape, 1);
  assert.equal(river.hippo.yaw, 0);
  river.moveToothbrush(-4, 3);
  advance(.14, true);
  assert.equal(river.toothbrush.u, -1);
  assert.equal(river.toothbrush.v, 1);
  river.moveToothbrush(.8, 0);
  advance(.12, true);
  assert.ok(river.toothbrush.stroke > 0);
  assert.ok(events.some(({ type }) => type === 'hippo-brush-stroke'));
  river.tapToothbrush();
  advance(.24, true);
  assert.equal(river.toothbrush.phase, 'returning');
  assert.equal(river.hippo.gape, 1);
  assert.ok(river.toothbrush.amount > 0);
  advance(.35, true);
  assert.equal(river.toothbrush.amount, 0);
  advance(.7, true);
  assert.equal(river.toothbrush.phase, 'rest');
  assert.equal(river.hippo.gape, 0);
  assert.equal(events.some(({ type }) => type === 'wave'), false);
  river.tapHippo();
  advance(1.5, true);
  assert.ok(events.some(({ type }) => type === 'wave'));
});

test('连点刷牙、离场收刷和正在掀浪时预约，都按同一顺序收束', () => {
  const { river, events, advance } = setup();
  river.tapHippo();
  advance(.30, true);
  river.tapToothbrush();
  advance(2.1, true);
  assert.equal(river.toothbrush.phase, 'active');
  assert.equal(events.filter(({ type }) => type === 'wave').length, 1);
  river.returnToothbrush();
  river.returnToothbrush();
  river.tapToothbrush();
  advance(1.3, false);
  assert.equal(river.toothbrush.phase, 'rest');
  assert.equal(river.hippo.gape, 0);
  river.tapToothbrush();
  advance(.25, true);
  river.returnToothbrush();
  advance(1.3, false);
  assert.equal(river.toothbrush.phase, 'rest');
  assert.equal(river.toothbrush.amount, 0);
});

test('实际牙刷只在河马下牙外侧运行，刷柄和刷头有几何净空', () => {
  const { river, advance } = setup({ groundAt: groundHeight });
  const model = makeHippo(T, groundHeight);
  const bank = makeRiverDiorama(new T.Scene(), riverPoints, groundHeight);
  river.tapToothbrush();
  advance(1.6, true);
  model.root.position.set(river.hippo.x, river.hippo.y, river.hippo.z);
  model.root.rotation.y = river.hippo.yaw;
  const head = new T.Vector3(), rail = new T.Vector3();
  const mouth = ['Hippo inner mouth', 'Hippopotamus soft lower jaw', 'Hippo tongue']
    .map(name => model.root.getObjectByName(name)).concat(model.teeth);
  for (const surface of mouth) {
    surface.material = surface.material.clone();
    surface.material.side = T.DoubleSide;
  }
  const ray = new T.Raycaster(), direction = new T.Vector3(.918, .371, .137).normalize();
  function insideMouth(point) {
    ray.set(point, direction);
    return mouth.some(surface => ray.intersectObject(surface, false)
      .filter((hit, index, all) => index === 0 || Math.abs(hit.distance - all[index - 1].distance) > 1e-6)
      .length % 2 === 1);
  }
  for (let i = 0; i <= 24; i++) {
    river.moveToothbrush(-1 + i / 12, i % 2 ? -1 : 1);
    advance(1 / 60, true);
    model.pose(river.hippo);
    model.root.updateWorldMatrix(true, true);
    bank.tick(river, 0, 0, model);
    model.brushRail(river.toothbrush.u, river.toothbrush.v, rail);
    bank.toothbrush.getWorldPosition(head);
    assert.ok(head.distanceTo(rail) < .002);
    assert.equal(insideMouth(rail), false, '刷毛尖留在牙冠的外侧');
    assert.ok(bank.toothbrushHead.getWorldPosition(head).distanceTo(rail) > .055);
    assert.equal(insideMouth(head), false, '刷头没有被口腔实体或牙床包住');
    for (const strand of bank.toothbrush.children.filter(child => child.name === '河马牙刷柔软刷毛')) {
      const vertices = strand.geometry.attributes.position;
      for (let n = 0; n < vertices.count; n++) {
        if (vertices.getY(n) > -.028) continue;
        head.fromBufferAttribute(vertices, n).applyMatrix4(strand.matrixWorld);
        assert.equal(insideMouth(head), false, '每根刷毛的端面也停在各颗牙冠外');
      }
    }
    assert.ok(rail.y > riverPoints.waterY + .08);
  }
});
