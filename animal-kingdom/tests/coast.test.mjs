import assert from 'node:assert/strict';
import test from 'node:test';
import { coastGroundHeight, coastPoints, coastWaterY, createCoast } from '../src/coast-state.js';

function setup() {
  const events = [];
  const coast = createCoast(event => events.push({ ...event, time: coast.time,
    pose: coast.penguins[event.index] && { ...coast.penguins[event.index] } }));
  function advance(seconds, active) {
    for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) coast.step(1 / 60, active);
  }
  return { coast, events, advance };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('两侧海藻轮流邀出三尾银鱼，途中连点不传送，鱼沿独立浅水路线藏回叶底',()=>{
  const {coast,events,advance}=setup();
  for(const side of [0,1]){
    coast.tapKelp(side);advance(.75,true);
    assert.ok(coast.fry.every(f=>f.visible));
    const before=coast.fry.map(f=>({...f}));
    coast.tapKelp(1-side);coast.tapFry(1);advance(1/60,true);
    coast.fry.forEach((f,i)=>assert.ok(distance(f,before[i])<.055));
    for(let frame=0;frame<210;frame++){
      advance(1/60,true);
      const active=coast.fry.filter(f=>f.visible);
      active.forEach((f,i)=>{
        assert.ok(f.y>.32&&f.y<coastWaterY-.04&&f.z>16.98);
        for(const next of active.slice(i+1))assert.ok(distance(f,next)>.38);
      });
    }
    assert.ok(coast.fry.every(f=>!f.visible));
    assert.equal(events.filter(e=>e.type==='fry-shelter').at(-1).at,1-side);
  }
  assert.equal(events.filter(e=>e.type==='kelp-fry').length,2);
});

test('点潮池先举螯再横行，只有实际靠近的清醒岸上企鹅停步端详；夜里仍可重复',()=>{
  const {coast,events,advance}=setup(),den={...coast.crab};
  coast.tapCrab();coast.tapCrab();
  advance(.26,true);
  assert.ok(coast.crab.claw>.9);
  assert.equal(coast.crab.x,den.x);
  let seen=false;
  for(let i=0;i<150;i++){
    advance(1/60,true);
    if(coast.penguins[1].inspectCrab>.5)seen=true;
    assert.equal(coast.penguins[0].inspectCrab,0);
    for(const bird of coast.penguins)assert.ok(distance(bird,coast.crab)>.74);
  }
  assert.equal(coast.crab.phase,'ledge');
  assert.ok(seen);
  assert.equal(events.filter(e=>e.type==='crab-signal').length,1);
  assert.equal(events.filter(e=>e.type==='penguin-crab-look').length,1);
  coast.setNight(true);
  coast.tapCrab();advance(2.66,true);
  assert.equal(coast.crab.phase,'den');
  assert.equal(distance(den,coast.crab),0);
  coast.tapCrab();advance(2.66,true);
  assert.equal(coast.crab.phase,'ledge');
  assert.ok(coast.penguins.every(p=>p.sleep===1 && p.inspectCrab===0));
  assert.equal(events.filter(e=>e.type==='penguin-crab-look').length,1);
});

test('两只清醒企鹅在自己岸台摇步，点击时不跳回固定站位', () => {
  const { coast, events, advance } = setup();
  const [a,b]=coast.penguins;
  const moved=[false,false];
  for(let sample=0;sample<175;sample++){
    advance(.05,true);
    coast.penguins.forEach((actor,index)=>{
      moved[index] ||= distance(actor,coastPoints.lanes[index].land)>.23;
      assert.equal(actor.y,coastGroundHeight(actor.z));
      assert.equal(actor.phase,'land');
    });
    assert.ok(distance(a,b)>2.30);
  }
  assert.deepEqual(moved,[true,true]);
  assert.deepEqual(events,[]);
  const before={x:b.x,z:b.z};
  assert.ok(distance(before,coastPoints.lanes[1].land)>.2);
  coast.tapPenguin(1);
  advance(.05,true);
  assert.ok(distance(before,b)<.07);
  coast.tapRamp(1);
  advance(1.45,true);
  assert.equal(b.phase,'swim');
});

test('同伴真正踏回岸台后才引另一只清醒企鹅摆鳍，远鱼不随同受惊', () => {
  const { coast, events, advance } = setup();
  coast.tapRamp(0);
  advance(1.52,true);
  assert.ok(events.some(({type})=>type==='water-entry'));
  assert.equal(events.some(({type})=>type==='penguin-neighbor-look'),false);
  coast.tapStone(0);
  while(coast.time<6&&!events.some(({type})=>type==='penguin-neighbor-look'))advance(.05,true);
  const land=events.findIndex(({type})=>type==='penguin-land');
  const signal=events.findIndex(({type})=>type==='penguin-neighbor-look');
  assert.ok(land>=0&&signal>land);
  assert.equal(events[signal].source,0);
  assert.equal(events[signal].index,1);
  advance(.22,true);
  assert.ok(coast.penguins[1].display>.2);
  assert.equal(coast.penguins[1].call,0);
  assert.ok(events.some(({type,index})=>type==='wave-fish'&&index===0));
  assert.equal(events.some(({type,index})=>type==='wave-fish'&&index===1),false);
});

test('回岸招呼能看清两次摆鳍，另一只留在自己的岸台，入夜会收回', () => {
  const { coast, events, advance } = setup();
  coast.tapRamp(0);
  advance(1.52, true);
  coast.tapStone(0);
  while (coast.time < 6 && !events.some(({ type }) => type === 'penguin-neighbor-look')) advance(1 / 60, true);
  const friend = coast.penguins[1];
  const anchored = { x: friend.x, y: friend.y, z: friend.z };
  advance(.40, true);
  assert.ok(friend.acknowledge > .75 && Math.abs(friend.look) > .5);
  advance(.42, true);
  assert.ok(friend.acknowledge < .3);
  advance(.42, true);
  assert.ok(friend.acknowledge > .70 && Math.abs(friend.look) > .5);
  assert.deepEqual({ x: friend.x, y: friend.y, z: friend.z }, anchored);
  assert.equal(friend.call, 0);
  assert.equal(events.filter(({ type }) => type === 'penguin-neighbor-look').length, 1);
  coast.setNight(true);
  advance(.1, true);
  assert.equal(friend.acknowledge, 0);
});

test('身体首点有摇步与叫声，但企鹅仍在自己的岸上', () => {
  const { coast, events, advance } = setup();
  coast.tapPenguin(0);
  assert.deepEqual(events.map(event => [event.type, event.index]), [['penguin-call', 0]]);
  advance(.31);
  assert.ok(coast.penguins[0].gait > 0 && coast.penguins[0].display > 0);
  assert.equal(coast.penguins[1].gait, 0);
  assert.equal(coast.penguins[0].y, coastGroundHeight(coast.penguins[0].z));
  advance(.68);
  assert.equal(coast.penguins[0].phase, 'land');
  assert.equal(coast.penguins[0].x, coastPoints.lanes[0].land.x);
  assert.equal(coast.penguins[0].z, coastPoints.lanes[0].land.z);
  assert.equal(events.some(event => event.type === 'water-entry'), false);
});

test('坡面和水线一致，真的趴到坡上才滑，腹部越水线才出一圈波', () => {
  const { coast, events, advance } = setup();
  assert.equal(coastGroundHeight(12), .65);
  assert.ok(Math.abs(coastGroundHeight(15.15) - .263) < 1e-10);
  assert.equal(coastGroundHeight(18), .263);
  assert.ok(Math.abs(coastGroundHeight(coastPoints.waterEntryZ) - coastWaterY) < 1e-10);
  coast.tapRamp(0);
  for (let tap = 0; tap < 5; tap++) coast.tapRamp(0);
  advance(.25);
  assert.equal(coast.penguins[0].phase, 'approach');
  assert.equal(events.some(event => event.type === 'water-entry'), false);
  for (let frame = 0; frame < 114; frame++) {
    coast.step(1 / 60);
    const actor = coast.penguins[0];
    if (actor.phase === 'slide') {
      assert.equal(actor.prone, 1);
      assert.ok(Math.abs(actor.y - coastGroundHeight(actor.z)) < 1e-10);
      assert.ok(actor.y >= coastWaterY);
    }
  }
  const belly = events.find(event => event.type === 'penguin-belly');
  const entry = events.find(event => event.type === 'water-entry');
  assert.ok(belly.time < entry.time);
  assert.equal(belly.pose.prone, 1);
  assert.equal(belly.y, coastGroundHeight(belly.z));
  assert.equal(entry.pose.prone, 1);
  assert.equal(entry.pose.y, coastWaterY);
  assert.equal(entry.y, coastWaterY);
  assert.equal(entry.z, coastPoints.waterEntryZ);
  assert.equal(events.filter(event => event.type === 'water-entry').length, 1);
  assert.equal(coast.penguins[0].phase, 'swim');
});

test('波长到近鱼时鱼才游开，远鱼仍按原来的轨迹走', () => {
  const { coast, events } = setup();
  const baseline = createCoast();
  let changed = 0;
  coast.tapRamp(0);
  for (let frame = 0; frame < 190; frame++) {
    coast.step(1 / 60);
    baseline.step(1 / 60);
    assert.deepEqual(coast.fish[1], baseline.fish[1]);
    changed = Math.max(changed, distance(coast.fish[0], baseline.fish[0]));
  }
  const wave = events.find(event => event.type === 'water-entry');
  const fish = events.find(event => event.type === 'wave-fish');
  assert.equal(fish.index, 0);
  assert.equal(fish.id, wave.id);
  assert.ok(fish.time > wave.time);
  assert.ok(Math.abs(fish.time - wave.time - distance(wave, fish) / wave.speed) < .04);
  assert.equal(events.filter(event => event.type === 'wave-fish').length, 1);
  assert.ok(changed > .15);
});

test('两只交错点坡和石，石只安排本企鹅一次就地回岸', () => {
  const { coast, events, advance } = setup();
  coast.tapRamp(0);
  advance(.29);
  coast.tapRamp(1);
  coast.tapStone(1);
  coast.tapStone(1);
  for (let frame = 0; frame < 238; frame++) {
    coast.step(1 / 60);
    assert.ok(coast.penguins[1].x - coast.penguins[0].x > 2.5);
  }
  assert.equal(coast.penguins[0].phase, 'swim');
  assert.equal(coast.penguins[1].phase, 'land');
  assert.equal(coast.penguins[1].z, coastPoints.lanes[1].land.z);
  const secondEntry = events.find(event => event.type === 'water-entry' && event.index === 1);
  const secondLand = events.find(event => event.type === 'penguin-land' && event.index === 1);
  assert.ok(secondEntry.time < secondLand.time);
  assert.equal(events.filter(event => event.type === 'penguin-land').length, 1);
  assert.deepEqual(events.filter(event => event.type === 'water-entry').map(event => event.index), [0, 1]);
  coast.tapStone(0);
  advance(2);
  assert.equal(coast.penguins[0].phase, 'land');
  assert.equal(coast.penguins[0].z, coastPoints.lanes[0].land.z);
});

test('滑到一半入夜先入水再上岸睡，夜点只回应 Zzz，天亮可重玩', () => {
  const { coast, events, advance } = setup();
  coast.tapRamp(0);
  advance(.83);
  assert.equal(coast.penguins[0].phase, 'slide');
  coast.setNight(true);
  advance(.23);
  assert.equal(coast.penguins[0].sleep, 0);
  advance(5.2);
  assert.ok(coast.penguins.every(actor => actor.phase === 'land' && actor.sleep === 1));
  const entry = events.find(event => event.type === 'water-entry');
  const land = events.find(event => event.type === 'penguin-land');
  assert.ok(entry.time < land.time);
  coast.tapPenguin(0);
  coast.tapRamp(1);
  assert.deepEqual(events.filter(event => event.type === 'sleep').map(event => event.index), [0, 1]);
  assert.equal(events.filter(event => event.type === 'water-entry').length, 1);
  coast.setNight(false);
  advance(.51);
  coast.tapRamp(0);
  advance(1.71);
  assert.equal(events.filter(event => event.type === 'water-entry').length, 2);
});

test('直接点水和鱼有局部反馈，企鹅姿势与另一条鱼不被牵动', () => {
  const { coast, events, advance } = setup();
  coast.tapWater({ x: 35.95, z: 15.18 });
  coast.tapFish(0);
  advance(.26);
  assert.ok(coast.fish[0].dive > .2);
  assert.ok(coast.fish[0].poseDive > 0 && coast.fish[0].poseDive < .4);
  assert.equal(coast.fish[1].dive, 0);
  assert.ok(coast.penguins.every(actor => actor.phase === 'land'));
  assert.ok(events.some(event => event.type === 'ripple'));
  assert.ok(events.some(event => event.type === 'fish-touch' && event.index === 0));
  assert.equal(events.some(event => event.type === 'water-entry'), false);
  assert.equal(coast.waves.length, 0);
});
