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
const sizes = [[1440, 900], [430, 740]].filter(([width]) =>
  !process.env.POND_TEST_WIDTH || width === Number(process.env.POND_TEST_WIDTH));
const places = ['pond', 'grove', 'orchard', 'savanna', 'river', 'asia', 'rainforest', 'coast', 'ocean'];

await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.POND_CHROME || undefined,
  chromiumSandbox: true,
  args: process.env.POND_SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []
});
const summary = [];

async function tour(width, height) {
  const touch = width < 500;
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, offline: true });
  const page = await context.newPage();
  const cdp = touch ? await context.newCDPSession(page) : null;
  const record = { width, height, touch, entries: [], problems: [], errors: [], requests: [] };
  let phase = '载入离线单页';
  page.on('pageerror', error => record.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') record.errors.push(message.text());
  });
  page.on('request', request => {
    if (!request.url().startsWith('file:')) record.requests.push(request.url());
  });
  const wait = (predicate, arg = null) => page.waitForFunction(predicate, arg, { timeout: 12000 });
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
    assert.equal(hit, id, `${id} 的实际中心须点中同一按钮`);
    await tap(point);
  }

  async function view(mode) {
    await press(mode === 'overview' ? 'overview' : 'enter-' + mode);
    await wait(expected => {
      const view = window.pondInspect().view;
      return view.mode === expected && !view.moving;
    }, mode);
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

  function checkFrogLanding(state, where) {
    const lastLanding=state.events.findLast(e=>e.type==='land'||e.type==='routine-land');
    assert.equal(state.frog.site,lastLanding?.site??1,`${where} 保留青蛙最近一次真实落脚点`);
  }

  function checkShared(state, parked, basketCount, where) {
    checkFrogLanding(state,where);
    assert.equal(state.orchard.basketCount, basketCount, `${where} 保留篮中苹果`);
    assert.equal(state.audio.muted, true, `${where} 保留静音`);
    assert.deepEqual(state.cloud, parked.cloud, `${where} 保留已固定的云朵位置`);
    assert.ok(state.night > .93, `${where} 保持同一个夜晚`);
  }

  try {
    await page.goto(url);
    await wait(() => window.pondInspect?.().ready || !document.getElementById('unsupported').hidden);
    const first = await read();
    assert.ok(first?.ready, record.errors.join('\n'));
    assert.equal(first.view.mode, 'overview');
    assert.ok(first.night < .07);
    record.overview = await verifyOverview();
    await capture('00-overview');

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
    await wait(() => window.pondInspect().orchard.basketCount === 1);
    await press('sun');
    await wait(() => window.pondInspect().night > .93);
    await press('sound');
    const parked = await read();
    assert.ok(parked.cloud.pin && parked.audio.muted);
    record.shared = { frogSite: parked.frog.site, apples: parked.orchard.basketCount, cloud: parked.cloud };
    await capture('02-orchard');
    record.entries.push('orchard');
    await view('overview');
    checkShared(await read(), parked, 1, '果园返回全景');

    for (const mode of places.filter(mode => !record.entries.includes(mode))) {
      phase = `从全景走进 ${mode}`;
      await view(mode);
      checkShared(await read(), parked, 1, mode);
      await capture(`${String(record.entries.length + 1).padStart(2, '0')}-${mode}`);
      record.entries.push(mode);
      await view('overview');
      checkShared(await read(), parked, 1, `${mode} 返回全景`);
    }
    if (record.entries.length !== places.length) assert.fail('未完成九处入口');

    phase = '返回池塘切回白天，再查果园和云朵';
    await view('pond');
    checkShared(await read(), parked, 1, '重返池塘');
    await press('sun');
    await wait(() => window.pondInspect().night < .07);
    await view('overview'); await view('orchard');
    const returned = await read();
    assert.ok(returned.night < .07 && returned.audio.muted);
    checkFrogLanding(returned,'切回白天');
    assert.equal(returned.orchard.basketCount, 1);
    assert.deepEqual(returned.cloud, parked.cloud);
    await view('overview');
    await capture('09-returned-overview');
  } catch (error) {
    record.problems.push(`${phase}：${error.message}`);
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
