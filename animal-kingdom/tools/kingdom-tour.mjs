import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.POND_PLAYWRIGHT || 'playwright');
const output = path.resolve(process.argv[2] || 'qa/tour');
const url = process.argv[3]
  ? pathToFileURL(path.resolve(process.argv[3])).href
  : new URL('../动物王国.html', import.meta.url).href;
const sizes = [[1440, 900], [430, 740], [390, 844], [740, 430]].filter(([width]) =>
  !process.env.POND_TEST_WIDTH || width === Number(process.env.POND_TEST_WIDTH));
assert.ok(sizes.length, 'POND_TEST_WIDTH 须为受测视口宽度之一');
const places = ['pond', 'grove', 'orchard', 'savanna', 'river', 'asia', 'rainforest', 'coast', 'ice', 'ocean'];

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.POND_CHROME || undefined,
  chromiumSandbox: true,
  args: process.env.POND_SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []
});
const summary = [];

async function tour(width, height) {
  const touch = Math.min(width, height) < 500;
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, offline: true });
  const page = await context.newPage();
  const cdp = touch ? await context.newCDPSession(page) : null;
  const record = { width, height, touch, entries: [], docks: {}, routes: [], problems: [], errors: [], requests: [] };
  let phase = '载入离线单页';
  page.on('pageerror', error => record.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') record.errors.push(message.text());
  });
  page.on('request', request => {
    if (!request.url().startsWith('file:')) record.requests.push(request.url());
  });
  const wait = (predicate, arg = null, timeout = 24000) => page.waitForFunction(predicate, arg, { timeout });
  const read = () => page.evaluate(() => window.pondInspect?.());
  const tap = ({ x, y }) => touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const capture = name => page.screenshot({ path: path.join(output, `${width}-${name}.png`) });

  async function box(id) {
    const rectangle = await page.locator('#' + id).boundingBox();
    assert.ok(rectangle, `${id} 须显示在屏幕上`);
    return { ...rectangle, x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2 };
  }

  async function press(id) {
    const point = await box(id);
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.id, point);
    // 云在日月前面时，点透云的这部分仍会切换昼夜，调用处核实实际结果。
    assert.ok(hit === id || id === 'sun' && hit === 'cloud', `${id} 的实际中心被 ${hit ?? '画布'} 遮挡`);
    await tap(point);
  }

  async function view(mode) {
    await press(mode === 'overview' ? 'overview' : 'enter-' + mode);
    await wait(expected => {
      const view = window.pondInspect().view;
      return view.mode === expected && !view.moving;
    }, mode);
    await verifyDock(mode);
  }

  async function verifyDock(mode, panned = false) {
    await wait(() => Math.abs(window.pondInspect().playHeight - document.querySelector('#stage').clientHeight) <= 1);
    const layout = await page.evaluate(() => {
      const rect = node => node.getBoundingClientRect().toJSON();
      const dock = document.querySelector('#places');
      const stage = document.querySelector('#stage');
      const buttons = [...dock.querySelectorAll('button:not([hidden])')].map(button => {
        const {x, y, width: w, height: h} = rect(button);
        const hit = [[.5,.5],[.12,.5],[.88,.5],[.5,.12],[.5,.88]].every(([u,v]) =>
          document.elementFromPoint(x + w*u, y + h*v)?.closest('button') === button);
        return {id: button.id, ...rect(button), hit, enabled: !button.disabled,
          icon: !!button.querySelector('svg'), label: button.getAttribute('aria-label'),
          current: button.getAttribute('aria-current') === 'location'};
      });
      const bounds = rect(stage);
      const sceneEdgeUsable = [.22,.5,.78].every(u =>
        document.elementFromPoint(bounds.x + bounds.width*u, bounds.bottom-2) === stage);
      return {dock: rect(dock), stage: bounds, buttons, sceneEdgeUsable};
    });
    const key = mode + (panned ? '-panned' : '');
    const {buttons, dock, stage} = layout;
    const expected = ['overview', ...places.map(place => 'enter-' + place)];
    assert.deepEqual(buttons.map(b => b.id).sort(), expected.sort(), key + ' 应能直接切换到全部场景');
    assert.deepEqual(buttons.filter(b=>b.current).map(b=>b.id), [mode === 'overview' ? 'overview' : 'enter-' + mode]);
    assert.ok(stage.bottom <= dock.top + .01 && stage.width >= width-1 && stage.height >= height*.70,
      key + ' 路牌和场景须独占空间，场景保留足够可玩面积');
    assert.ok(layout.sceneEdgeUsable, key + ' 路牌上方的场景底边可以实际点到');
    for (const [i,b] of buttons.entries()) {
      assert.ok(b.width >= 44 && b.height >= 44, b.id + ' 的触控区至少 44 像素');
      assert.ok(b.left >= Math.max(0,dock.left)-.01 && b.right <= Math.min(width,dock.right)+.01 &&
        b.top >= dock.top-.01 && b.bottom <= Math.min(height,dock.bottom)+.01, b.id + ' 须完整位于路牌区');
      assert.ok(b.enabled && b.icon && b.label && b.hit, b.id + ' 须有图标、名称且中心和四边可点');
      for (const other of buttons.slice(i+1)) {
        assert.ok(b.right <= other.left || other.right <= b.left || b.bottom <= other.top || other.bottom <= b.top,
          b.id + ' 与 ' + other.id + ' 的点击区域相交');
      }
    }
    record.docks[key] = {stageHeight:stage.height, dockTop:dock.top, minTarget:Math.min(...buttons.map(b=>Math.min(b.width,b.height))),
      buttons:buttons.map(b=>b.id)};
    return buttons;
  }

  async function panPastDock() {
    const stage = await page.locator('#stage').boundingBox();
    const target = await box('enter-river');
    const start = {x:Math.max(20, target.x-76), y:stage.y+stage.height-38};
    if (cdp) {
      const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints});
      await send('touchStart', [start]);
      for(let i=1;i<=7;i++) await send('touchMove', [{x:start.x+(target.x-start.x)*i/7,y:start.y+(target.y-start.y)*i/7}]);
      await send('touchEnd', []);
    } else {
      await page.mouse.move(start.x,start.y);
      await page.mouse.down();
      await page.mouse.move(target.x,target.y,{steps:7});
      await page.mouse.up();
    }
    await wait(() => {
      const state = window.pondInspect().view;
      return state.mode === 'overview' && !state.moving && Math.hypot(state.panX,state.panY) >= 9;
    });
    const after = await verifyDock('overview',true);
    for (const before of record.overview.entries) {
      const button = after.find(b=>b.id === 'enter-'+before.mode);
      assert.ok(Math.abs(before.x-(button.x+button.width/2)) <= .5 &&
        Math.abs(before.y-(button.y+button.height/2)) <= .5, before.mode + ' 总图复位钮出现时，原有路牌仍须留在原位');
    }
    await view('overview');
    const {panX,panY} = (await read()).view;
    assert.equal(Math.hypot(panX,panY),0,'拖到路牌上松手后，仍能用总图按钮复位');
  }

  async function verifyOverview() {
    const entries = [];
    for (const mode of places) {
      const id = 'enter-' + mode;
      const point = await box(id);
      assert.ok(point.x > point.width / 2 && point.x < width - point.width / 2
        && point.y > point.height / 2 && point.y < height - point.height / 2, `${id} 整个图标应完整显示`);
      const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.id, point);
      entries.push({ mode, ...point, hit });
      if (hit !== id) record.problems.push(`${id} 的中心碰到 ${hit ?? '画布'}`);
    }
    const pairs = entries.flatMap((a, i) => entries.slice(i + 1).map(b => ({
      modes: [a.mode, b.mode], distance: Math.hypot(a.x - b.x, a.y - b.y),
      overlap: Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
        Math.abs(a.y - b.y) < (a.height + b.height) / 2
    })));
    const closest = pairs.sort((a, b) => a.distance - b.distance)[0];
    if (closest.distance < 47) record.problems.push(`最邻近的 ${closest.modes.join('/')} 中心仅相距 ${closest.distance.toFixed(1)} px`);
    for (const pair of pairs.filter(pair => pair.overlap)) {
      record.problems.push(`${pair.modes.join('/')} 按钮边界重叠`);
    }
    return { entries, closest };
  }

  async function pinCloud() {
    const cloud = page.locator('#cloud');
    const dispatch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    const release = () => cdp ? dispatch('touchEnd', []) : page.mouse.up();
    for (const [x, y] of [[.50,.59], [.27,.61], [.68,.64], [.16,.70], [.84,.65], [.50,.36]]) {
      const current = await box('cloud');
      const dx = (x - .5) * current.width;
      const dy = (y - .5) * current.height;
      const from = { x: current.x + dx, y: current.y + dy };
      if (cdp) await dispatch('touchStart', [from]);
      else { await page.mouse.move(from.x, from.y); await page.mouse.down(); }
      if (!await cloud.evaluate(element => element.classList.contains('dragging'))) {
        await release();
        continue;
      }
      const to = {
        x: width * (touch ? .13 : .053) + dx,
        y: current.height * (touch ? .55 : .42) + dy
      };
      if (cdp) {
        for (let i = 1; i <= 7; i++) {
          await dispatch('touchMove', [{ x: from.x + (to.x - from.x) * i / 7, y: from.y + (to.y - from.y) * i / 7 }]);
        }
      } else await page.mouse.move(to.x, to.y, { steps: 7 });
      await release();
      await wait(() => window.pondInspect().cloud.pin);
      return;
    }
    assert.fail('池塘找不到能拖动的露出云瓣');
  }

  async function playOverviewFrontRow() {
    const stage = await page.locator('#stage').boundingBox();
    const stableTarget = async (label, point) => {
      assert.ok(point.x >= stage.x+18 && point.x <= stage.x+stage.width-18 &&
        point.y >= stage.y+18 && point.y <= stage.y+stage.height-18,
        label + ' 须在总图可玩区内且留出点按余量 ' + JSON.stringify(point));
      assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,point),'stage',label+' 不可被路牌或工具遮挡');
      return {label,x:point.x,y:point.y};
    };
    record.frontRow = [];
    for (const i of [0,1]) {
      await wait(index=>{
        const r=window.pondInspect().orchard.rabbits[index]; return !r.air && !r.land && !r.crouch;
      }, i);
      const {screen} = (await read()).orchard.rabbits[i];
      record.frontRow.push(await stableTarget('果园兔子'+(i+1),screen));
      await tap(screen);
      await wait(index=>window.pondInspect().orchard.events.some(e=>e.type==='rabbit-hop' &&
        e.index===index && !e.routine && e.phase==='land'),i);
    }
    const {screen}=(await read()).orchard.carrot;
    record.frontRow.push(await stableTarget('胡萝卜',screen));
    await tap(screen);
    await wait(()=>window.pondInspect().orchard.events.some(e=>e.type==='carrot-eat'),null,45000);
    assert.equal((await read()).view.mode,'overview','全景内就能点兔子和胡萝卜');
  }

  function checkFrogLanding(state, where) {
    const lastLanding=state.events.findLast(e=>e.type==='land'||e.type==='routine-land');
    assert.equal(state.frog.site,lastLanding?.site??1,`${where} 保留青蛙最近一次真实落脚点`);
  }

  let lastCloud;
  async function checkCloud(state, parked, where) {
    assert.equal(state.cloud.pin, true, where + ' 云朵保留固定状态');
    const previous = lastCloud ?? parked.cloud;
    if (state.cloud.x !== previous.x || state.cloud.y !== previous.y) {
      // 原停靠处在新视角里埋进树冠时，云可以退回天空；退后的云瓣必须确实能抓到。
      const cloud = page.locator('#cloud');
      const bounds = await cloud.boundingBox();
      assert.ok(bounds, where + ' 挪开的云须在空中可见');
      let exposed = false;
      for (const [u,v] of [[.5,.59],[.3,.61],[.7,.61],[.14,.68],[.86,.68],[.5,.31]]) {
        const x=bounds.x+u*bounds.width, y=bounds.y+v*bounds.height;
        await page.mouse.move(x,y);
        exposed = await cloud.evaluate((node,{x,y}) => node.contains(document.elementFromPoint(x,y)) &&
          getComputedStyle(node).cursor === 'grab', {x,y});
        if (exposed) break;
      }
      assert.ok(exposed, where + ' 云退到树冠外须露出可抓的云瓣');
    }
    await wait(frame => window.pondInspect().frames >= frame + 3, state.frames);
    assert.deepEqual((await read()).cloud, state.cloud, where + ' 固定后不继续漂移');
    lastCloud = state.cloud;
  }

  async function checkShared(state, parked, basketCount, where) {
    checkFrogLanding(state,where);
    assert.equal(state.orchard.basketCount, basketCount, `${where} 保留篮中苹果`);
    assert.equal(state.audio.muted, true, `${where} 保留静音`);
    await checkCloud(state, parked, where);
    assert.ok(state.night > .93, `${where} 保持同一个夜晚`);
  }

  try {
    await page.goto(url);
    await wait(() => window.pondInspect?.().ready || !document.getElementById('unsupported').hidden);
    const first = await read();
    assert.ok(first?.ready, record.errors.join('\n'));
    assert.equal(first.view.mode, 'overview');
    assert.ok(first.night < .07);
    await verifyDock('overview');
    record.overview = await verifyOverview();
    await capture('00-overview');
    phase = '总图前排兔子与胡萝卜真点';
    await playOverviewFrontRow();
    await capture('00-overview-rabbits');
    phase = '总图拖至路牌后松手并复位';
    await panPastDock();

    phase = '池塘移动青蛙并固定云朵';
    await view('pond');
    await tap((await read()).sites[1]);
    await wait(() => { const state = window.pondInspect(); return state.frog.site === 1 && !state.busy; });
    await pinCloud();
    await capture('01-pond');
    record.entries.push('pond');
    await view('overview');

    phase = '果园落果入篮，切夜并静音';
    await view('orchard');
    await tap((await read()).orchard.apples[0].screen);
    await wait(() => window.pondInspect().orchard.basketCount === 1, null, 60000);
    await press('sun');
    await wait(() => window.pondInspect().night > .93);
    await press('sound');
    const parked = await read();
    assert.ok(parked.cloud.pin && parked.audio.muted);
    record.shared = { frogSite: parked.frog.site, apples: parked.orchard.basketCount, cloud: parked.cloud };
    await capture('02-orchard');
    record.entries.push('orchard');
    await view('overview');
    await checkShared(await read(), parked, 1, '果园返回全景');

    for (const mode of places.filter(mode => !record.entries.includes(mode))) {
      phase = `从全景走进 ${mode}`;
      await view(mode);
      await checkShared(await read(), parked, 1, mode);
      await capture(`${String(record.entries.length + 1).padStart(2, '0')}-${mode}`);
      record.entries.push(mode);
      await view('overview');
      await checkShared(await read(), parked, 1, `${mode} 返回全景`);
    }
    if (record.entries.length !== places.length) assert.fail('未完成十处入口');

    phase = '返回池塘切回白天，再查果园和云朵';
    await view('pond');
    await checkShared(await read(), parked, 1, '重返池塘');
    await press('sun');
    await wait(() => window.pondInspect().night < .07);
    await view('overview'); await view('orchard');
    const returned = await read();
    assert.ok(returned.night < .07 && returned.audio.muted);
    checkFrogLanding(returned,'切回白天');
    assert.equal(returned.orchard.basketCount, 1);
    await checkCloud(returned, parked, '重返果园');
    await view('overview');
    await capture('09-returned-overview');
    phase = '用底部路牌在远近场景间直接切换';
    for (const route of [
      ['pond','orchard','grove','asia','rainforest','asia','grove','orchard','pond','overview'],
      ['savanna','river','coast','ice','ocean','ice','coast','ocean','coast','river','savanna','overview'],
      ['pond','ocean','orchard','ice','grove','coast','asia','river','rainforest','savanna','overview']
    ]) {
      let previous='overview';
      for (const next of route) {
        await view(next);
        record.routes.push(previous + '/' + next);
        previous=next;
      }
    }
  } catch (error) {
    record.problems.push(`${phase}：${error.message}`);
    const state = await read().catch(() => null);
    if (state) record.lastState = {view:state.view.mode, night:state.night, time:state.time,
      applePhases:state.orchard.apples.map(apple=>apple.phase), dog:state.orchard.dog.action};
    await capture('failure').catch(() => {});
  } finally {
    await context.close();
  }
  return record;
}

try {
  for (const [width, height] of sizes) {
    const record = await tour(width, height);
    summary.push(record);
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({
      width, entries: record.entries, closest: record.overview?.closest,
      problems: record.problems, errors: record.errors, requests: record.requests
    }));
  }
} finally {
  await browser.close();
}
process.exitCode = summary.some(record => record.problems.length || record.errors.length || record.requests.length) ? 1 : 0;
