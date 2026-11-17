import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.POND_PLAYWRIGHT || 'playwright');
const output = path.resolve(process.argv[2] || 'qa/cloud');
const url = new URL('../动物王国.html', import.meta.url).href;
const viewports = [[1440, 900], [430, 740]].filter(([width]) =>
  !process.env.POND_TEST_WIDTH || width === Number(process.env.POND_TEST_WIDTH));
assert.ok(viewports.length, 'POND_TEST_WIDTH 应为 1440 或 430');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.POND_CHROME || undefined,
  chromiumSandbox: true,
  args: process.env.POND_SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []
});
const summary = [];

try {
  for (const [width, height] of viewports) {
    const hasTouch = width === 430;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch, offline: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const cdp = hasTouch ? await context.newCDPSession(page) : null;
    const errors = [];
    const network = [];
    const frames = [];
    const trace = { width, height, hasTouch, errors, network, frames };
    summary.push(trace);

    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (!request.url().startsWith('file:')) network.push(request.url()); });

    const state = () => page.evaluate(() => window.pondInspect?.());
    const wait = (fn, arg = null) => page.waitForFunction(fn, arg, { timeout: 16000 });
    const tap = point => hasTouch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
    const isGrabbing = () => page.locator('#cloud').evaluate(node => node.classList.contains('dragging'));
    const touch = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });

    async function capture(label) {
      const file = path.join(output, `${width}-${label}.png`);
      await page.screenshot({ path: file });
      if (!frames.includes(file)) frames.push(file);
    }

    async function box(selector) {
      const rect = await page.locator(selector).boundingBox();
      assert.ok(rect, `${selector} 应有可用的位置`);
      return rect;
    }

    async function center(selector) {
      const rect = await box(selector);
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }

    async function view(mode) {
      await tap(await center(mode === 'overview' ? '#overview' : '#enter-' + mode));
      await wait(mode => {
        const current = window.pondInspect().view;
        return current.mode === mode && !current.moving;
      }, mode);
    }

    async function down(point) {
      if (hasTouch) {
        await touch('touchStart', point);
      } else {
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
      }
    }

    async function move(from, to) {
      if (!hasTouch) {
        await page.mouse.move(to.x, to.y, { steps: 7 });
        return;
      }
      for (let step = 1; step <= 7; step++) {
        const progress = step / 7;
        await touch('touchMove', { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress });
      }
    }

    const up = () => hasTouch ? touch('touchEnd') : page.mouse.up();

    // 透明按钮只有云朵轮廓内且露在树外的点可抓，优先从云腹或露出的侧瓣开始。
    async function grabCloud() {
      const rect = await box('#cloud');
      const middle = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      const samples = [[.50, .58], [.28, .64], [.70, .63], [.15, .69], [.84, .65], [.50, .33], [.38, .75], [.60, .78]];
      for (const [x, y] of samples) {
        const point = { x: rect.x + x * rect.width, y: rect.y + y * rect.height };
        if (point.x < 1 || point.x >= width - 1 || point.y < 1 || point.y >= height - 1) continue;
        await down(point);
        if (await isGrabbing()) return { point, middle };
        await up();
      }
      assert.fail('找不到尚露在树外的可拖云瓣');
    }

    async function carryCloud(held, target) {
      const end = { x: target.x + held.point.x - held.middle.x, y: target.y + held.point.y - held.middle.y };
      await move(held.point, end);
      await wait(({ x, y }) => {
        const inspected = window.pondInspect();
        return Math.hypot(inspected.cloud.x * inspected.width - x, inspected.cloud.y * inspected.height - y) < 3;
      }, target);
      assert.equal(await isGrabbing(), true, '遮挡发生时正在拖动的指针仍应保留抓取');
    }

    async function parkCloud(target) {
      await carryCloud(await grabCloud(), target);
      await up();
    }

    function cloudDistance(a, b) {
      return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
    }

    async function validateLayers() {
      const ordered = await page.evaluate(() => {
        const canvas = document.querySelector('#stage');
        return ['#cloud-art', '#sun-art'].every(selector => {
          const art = document.querySelector(selector);
          return art && Boolean(art.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
      });
      assert.ok(ordered, '云和日月的绘制层应位于 3D 场景绘制前面');
      for (const id of ['#cloud', '#sun']) {
        const control = await center(id);
        const art = await center(id + '-art');
        assert.ok(Math.hypot(control.x - art.x, control.y - art.y) < 2, `${id} 的绘制和热区应同位`);
      }
    }

    try {
      trace.phase = '打开离线成品并检查绘制顺序';
      await page.goto(url);
      await wait(() => window.pondInspect?.().ready || !document.getElementById('unsupported').hidden);
      assert.ok((await state())?.ready, errors.join('\n'));
      await validateLayers();

      const sun = await center('#sun');
      const overSun = { x: sun.x, y: sun.y - 3 };
      trace.phase = '太阳遮光与入林缘时的位置保留';
      await parkCloud(overSun);
      await wait(() => { const current = window.pondInspect(); return current.cloud.pin && current.shade > .64; });
      const sunShade = await state();
      trace.dayShade = sunShade.shade;
      await capture('01-sun-shaded');
      await view('grove');
      assert.deepEqual((await state()).cloud, sunShade.cloud);

      // 各镜头的树冠轮廓不同，尝试少量已在场景画面确认过的内部位置。
      const crownTargets = hasTouch
        ? [{ x: 213, y: 103 }, { x: 207, y: 115 }, { x: 225, y: 103 }]
        : [{ x: 825, y: 53 }, { x: 820, y: 57 }, { x: 851, y: 55 }];
      trace.phase = '按住拖入树冠并松手归位';
      await capture('02-grove-before-drag');
      let restored = false;
      trace.crownAttempts = [];
      for (const target of crownTargets) {
        const before = (await state()).cloud;
        await carryCloud(await grabCloud(), target);
        const held = (await state()).cloud;
        assert.ok(cloudDistance(before, held) > 25, '按住的云应该真的移到树冠');
        await capture('03-crown-drag-held');
        await up();
        assert.equal(await isGrabbing(), false);
        const released = (await state()).cloud;
        const returned = cloudDistance(before, released) < 3;
        trace.crownAttempts.push({ target, before, held, released, returned });
        if (!returned) {
          await parkCloud(overSun);
          continue;
        }
        assert.ok(released.pin, '松开完全遮挡的云应回到刚才可见的位置并固定');
        restored = true;
        break;
      }
      assert.ok(restored, '尝试的树冠内部位置都未触发完全遮挡归位');
      await capture('04-crown-released');

      const partial = hasTouch ? { x: 162, y: 67 } : { x: 593, y: 57 };
      const onTree = hasTouch ? { x: 195, y: 76 } : { x: 639, y: 68 };
      trace.phase = '部分挡住的云可停留，点击冠内热区不会误抓';
      await parkCloud(partial);
      const partialCloud = (await state()).cloud;
      assert.ok(cloudDistance(partialCloud, { x: partial.x / width, y: partial.y / height }) < 3,
        '只挡住部分的云要能就地固定');
      const insideShape = await page.evaluate(({ x, y }) => {
        const shape = document.querySelector('#cloud-body');
        return shape.isPointInFill(new DOMPoint(x, y).matrixTransform(shape.getScreenCTM().inverse()));
      }, onTree);
      assert.ok(insideShape, '树冠测试点要确实落在云朵的绘制轮廓内');
      await down(onTree);
      assert.equal(await isGrabbing(), false, '从前景树冠点下时不可抓到藏在树后的云');
      await move(onTree, { x: onTree.x + 15, y: onTree.y + 11 });
      await up();
      assert.deepEqual((await state()).cloud, partialCloud);
      trace.blockedPoint = onTree;
      await capture('05-partial-cloud-behind-crown');
      const exposed = await grabCloud();
      trace.regrip = exposed.point;
      await carryCloud(exposed, overSun);
      await up();
      const reparked = (await state()).cloud;
      assert.ok(reparked.pin && cloudDistance(reparked, sunShade.cloud) < 3,
        '还露在树外的云瓣可以再次拖回天空');

      trace.phase = '回到池塘，以开阔天空切换至月夜';
      await view('overview');
      assert.deepEqual((await state()).cloud, reparked);
      await view('pond');
      assert.deepEqual((await state()).cloud, reparked);
      await parkCloud({ x: width * .67, y: sun.y });
      await wait(() => window.pondInspect().shade < .12);
      await tap(await center('#sun'));
      await wait(() => window.pondInspect().night > .94);
      await parkCloud(overSun);
      await wait(() => { const current = window.pondInspect(); return current.cloud.pin && current.shade > .64; });
      const moon = await state();
      trace.moonShade = moon.shade;
      trace.phase = '月亮遮光与重进林缘时的位置保留';
      await view('overview');
      await view('grove');
      assert.deepEqual((await state()).cloud, moon.cloud);
      assert.ok((await state()).shade > .64);
      await capture('06-moon-shaded-pinned');
      assert.deepEqual(network, []);
      assert.deepEqual(errors, []);
      trace.phase = '完成';
      trace.passed = true;
    } catch (error) {
      trace.passed = false;
      trace.failure = error.message;
      await capture('failure').catch(() => {});
    } finally {
      await context.close();
      console.log(`${width}×${height} ${trace.passed ? '通过' : `失败（${trace.phase}。${trace.failure}）`}`);
      for (const file of frames) console.log(file);
    }
  }
} finally {
  await browser.close();
  const report = path.join(output, 'trace.json');
  await fs.writeFile(report, JSON.stringify(summary, null, 2));
  console.log(report);
}

if (summary.some(trace => !trace.passed)) process.exitCode = 1;
