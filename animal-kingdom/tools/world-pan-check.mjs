import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { habitats } from '../src/map-view.js';

const { chromium } = createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT || 'playwright');
const output = path.resolve(process.argv[2] || 'qa/world-pan');
const url = process.argv[3] ? pathToFileURL(path.resolve(process.argv[3])).href : new URL('../动物王国.html', import.meta.url).href;
const sizes = [[1440,900], [390,844], [740,430]].filter(([w]) => !process.env.POND_TEST_WIDTH || w === Number(process.env.POND_TEST_WIDTH));
assert.ok(sizes.length, '请选择桌面、手机竖屏或手机横屏');
const stops = [
  ['pond','frog','events','call'], ['orchard','orchard.dog','orchard.events','dog-call'],
  ['grove','woodland.fox','woodland.events','fox-call'], ['savanna','savanna.zebra','savanna.events','zebra-call'],
  ['asia','asia.tiger','asia.events','tiger-call'], ['river','river.rhino','river.events','rhino-call'],
  ['rainforest','rainforest.groundMonkey','rainforest.events','monkey-call'],
  ['coast','coast.penguins.0','coast.events','penguin-call'], ['ice','ice.bear','ice.events','polar-bear-call'],
  ['ocean','ocean.animals.whale','ocean.events','ocean-whale']
];
const pick = (object, key) => key.split('.').reduce((node, part) => node?.[part], object);
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.POND_CHROME || undefined,chromiumSandbox:true});
const reports = [];

async function check(width,height) {
  const touch = Math.min(width,height)<500;
  const context = await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page = await context.newPage();
  const cdp = touch ? await context.newCDPSession(page) : null;
  const report = {width,height,touch,visits:[],errors:[],requests:[],phase:'进入总图'};
  reports.push(report);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))report.requests.push(r.url());});
  const read = () => page.evaluate(()=>window.pondInspect());
  const wait = (predicate,arg) => page.waitForFunction(predicate,arg,{timeout:14000});
  const tap = p => touch ? page.touchscreen.tap(p.x,p.y) : page.mouse.click(p.x,p.y);
  const capture = name => page.screenshot({path:path.join(output,width+'-'+name+'.png')});
  async function drag(a,b) {
    if (cdp) {
      const send = (type,points) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
      await send('touchStart',[a]);
      for(let i=1;i<=5;i++)await send('touchMove',[{x:a.x+(b.x-a.x)*i/5,y:a.y+(b.y-a.y)*i/5}]);
      await send('touchEnd',[]);
    } else {
      await page.mouse.move(a.x,a.y); await page.mouse.down();
      await page.mouse.move(b.x,b.y,{steps:5}); await page.mouse.up();
    }
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  async function press(id) {
    await tap(await buttonCenter(id));
  }
  async function buttonCenter(id){
    const bounds=await page.locator('#'+id).boundingBox();
    assert.ok(bounds,id+' 应可见');
    const point={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
    const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.id,point);
    assert.ok(hit===id||id==='sun'&&hit==='cloud',id+' 的中心应可实际点到，当前位置是 '+hit);
    return point;
  }
  async function checkAtlasPin(place,parked){
    await press('atlas-'+place);
    await wait(place=>{const {view}=window.pondInspect();return view.mode===place&&!view.moving;},place);
    assert.equal(await page.locator('#atlas-waymarks').isVisible(),false);
    const dock=await inspectDock();
    assert.equal(dock.buttons.length,stops.length+1,'近景底部仍可切换全部场景');
    await press('overview');
    await wait(()=>{const {view}=window.pondInspect();return view.mode==='overview'&&!view.moving;});
    assert.ok(gap((await read()).atlas,parked)<.05,'从地图路牌进入近景后应回到原处');
  }
  async function testSky(place) {
    const before=await read(),sun=await page.locator('#sun').boundingBox();
    const center={x:sun.x+sun.width/2,y:sun.y+sun.height/2};
    assert.ok(center.y<before.playTop,'地图中的日月实际露在天空里');
    await press('sun');
    await wait(()=>window.pondInspect().night>.93);
    if(place==='ocean') {
      async function carryCloud(centerX) {
        const cloud=await page.locator('#cloud').boundingBox();
        const offset=cloud.height*.10;
        const from={x:cloud.x+cloud.width*.50,y:cloud.y+cloud.height*.5+offset};
        await drag(from,{x:centerX,y:center.y+offset-3});
        await wait(()=>window.pondInspect().cloud.pin);
      }
      await carryCloud(width*.78); await wait(()=>window.pondInspect().shade<.18);
      await carryCloud(center.x); await wait(()=>window.pondInspect().shade>.62);
      await capture('cloud-over-ocean');
    }
    await press('sun');
    await wait(()=>window.pondInspect().night<.08);
    if(place==='ocean') {
      const cloud=await page.locator('#cloud').boundingBox();
      await drag({x:cloud.x+cloud.width*.5,y:cloud.y+cloud.height*.6},{x:width*.76,y:center.y+cloud.height*.1});
      await wait(()=>window.pondInspect().shade<.18);
    }
    assert.ok(gap((await read()).atlas,before.atlas)<.02,'切昼夜、拖云均不应误拖总图');
  }
  async function inspectDock() {
    const dock=await page.evaluate(()=>{
      const canvas=document.getElementById('stage').getBoundingClientRect(),nav=document.getElementById('places');
      const buttons=[...nav.querySelectorAll('button:not([hidden])')];
      return {top:nav.getBoundingClientRect().top,bottom:canvas.bottom,height:canvas.height,buttons:buttons.map(button=>{
        const b=button.getBoundingClientRect();return {id:button.id,x:b.x,y:b.y,size:Math.min(b.width,b.height),
          hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===button};})};
    });
    assert.ok(dock.top>=dock.bottom-.05 && dock.height/height>.70 && dock.buttons.every(b=>b.hit && b.size>=44),'路牌独立、每枚可点，留出大部分画面给动物');
    return dock;
  }
  async function navigate(place,actorPath) {
    for(let n=0;n<30;n++) {
      const s=await read();
      assert.equal(s.view.mode,'overview','拖动中一直留在总图');
      const p=pick(s,actorPath)?.screen;
      assert.ok(Number.isFinite(p?.x)&&Number.isFinite(p?.y), place+' 动物位置有效');
      const top=s.playTop??0, playHeight=s.playHeight??s.height;
      const middle=top+playHeight*.5;
      if(s.atlas.focus===place && s.atlas.visible.includes(place) && Math.abs(p.x-s.width*.5)<s.width*.34 && Math.abs(p.y-middle)<playHeight*.32)return n;
      // 用屏幕上的动物位置决定下一次手指滑动方向。每一段均从游戏画布上落下，保留带到画外的余量。
      let dx=s.width*.5-p.x,dy=middle-p.y;
      if(s.atlas.focus!==place){
        const v=s.view, px=playHeight/v.height;
        const across=habitats[place].x-v.x, ahead=habitats[place].z-v.z;
        dx=-(across*Math.cos(v.azimuth)-ahead*Math.sin(v.azimuth))*px;
        dy=-(across*Math.sin(v.azimuth)+ahead*Math.cos(v.azimuth))*Math.sin(v.elevation)*px;
      }
      const fraction=Math.min(1,s.width*.65/Math.max(1,Math.abs(dx)),playHeight*.49/Math.max(1,Math.abs(dy)));
      const step={x:dx*fraction,y:dy*fraction};
      const start={x:s.width*.50-step.x*.5,y:top+playHeight*.56-step.y*.5};
      await drag(start,{x:start.x+step.x,y:start.y+step.y});
      const after=await read();
      assert.ok(gap(s.atlas,after.atlas)>.015, place+' 方向应能继续拖动，当前位置 '+JSON.stringify(s.atlas)+'，目标 '+JSON.stringify(p));
    }
    throw Error('无法通过连续拖动到达 '+place);
  }
  try {
    await page.goto(url,{timeout:90000});
    await wait(()=>window.pondInspect?.().ready);
    const first=await read();
    assert.equal(first.view.mode,'overview');assert.ok(first.atlas?.visible,'总图应能报告连续世界的位置');
    report.home=first.atlas;
    const initialDock=await inspectDock();
    await capture('00-start');
    report.phase='从地图路牌起拖';
    const firstPin=await buttonCenter('atlas-orchard');
    await drag(firstPin,{x:firstPin.x-55,y:firstPin.y+50});
    const dragged=await read();
    assert.equal(dragged.view.mode,'overview');
    assert.ok(gap(dragged.atlas,first.atlas)>.25,'从路牌起拖也应移动地图');
    for(const [place,actorPath,eventPath,eventType] of stops) {
      report.phase='拖到 '+place;
      const dragCount=await navigate(place,actorPath);
      if(place==='ice'){
        report.phase='在总图打开冰洞';
        const den=(await read()).ice.cave;
        await tap(den.screen??den);
        await wait(()=>window.pondInspect().ice.bear.phase==='outside');
      }
      const s=await read(),p=pick(s,actorPath).screen;
      assert.ok(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id==='stage',p),place+' 的动物须在路牌外且可直接点击');
      report.phase='实点 '+place;
      const events=pick(s,eventPath);
      const previous=events.filter(e=>!eventType || e.type===eventType).at(-1)?.time??-1;
      await tap(p);
      await wait(({eventPath,eventType,previous})=>{
        const s=window.pondInspect();
        return eventPath.split('.').reduce((a,k)=>a[k],s).some(e=>(!eventType||e.type===eventType)&&e.time>previous);
      },{eventPath,eventType,previous});
      const state=await read();
      assert.equal(state.view.mode,'overview');assert.ok(gap(s.atlas,state.atlas)<.02,'轻点动物不会误拖');
      const response=pick(state,eventPath).filter(e=>(!eventType||e.type===eventType)&&e.time>previous).at(-1);
      report.visits.push({place,dragCount,atlas:state.atlas,response:response?.type});
      await capture(place);
      if(place==='coast'){
        report.phase='在总图引出潮池小蟹';
        await tap(state.coast.tidePool);
        await wait(()=>window.pondInspect().coast.events.some(e=>e.type==='penguin-crab-look'));
        await wait(()=>window.pondInspect().coast.crab.phase==='ledge');
        await tap((await read()).coast.crab.screen);
        await wait(()=>window.pondInspect().coast.crab.phase==='den');
      }
      if(place==='ice'||place==='ocean'){report.phase='总图日夜和云 '+place;await testSky(place);}
      report.phase='用地图路牌走近 '+place;
      await checkAtlasPin(place,state.atlas);
      if(place==='orchard') {
        report.phase='从动物身上起拖';
        const before=await read(),start=pick(before,actorPath).screen;
        await drag(start,{x:start.x-s.width*.22,y:start.y+30});
        const after=await read();
        assert.ok(gap(before.atlas,after.atlas)>.20);
        assert.equal(pick(after,eventPath).filter(e=>e.type===eventType).length,pick(before,eventPath).filter(e=>e.type===eventType).length,'从动物起拖不应触发叫声');
        const whilePanning=await inspectDock();
        for(const b of initialDock.buttons){
          const other=whilePanning.buttons.find(c=>c.id===b.id);
          assert.ok(other&&Math.hypot(b.x-other.x,b.y-other.y)<1,b.id+' 在开始探索后仍须保持原位');
        }
      }
    }
    const coast=stops.find(([s])=>s==='coast');
    await navigate(coast[0],coast[1]);
    const parked=(await read()).atlas;
    report.phase='海岸近景、日夜与回程';
    await press('enter-coast');
    await wait(()=>{const v=window.pondInspect().view;return v.mode==='coast'&&!v.moving;});
    await press('sun');
    await wait(()=>window.pondInspect().night>.93);
    await press('overview');
    await wait(()=>{const v=window.pondInspect().view;return v.mode==='overview'&&!v.moving;});
    const back=await read();
    assert.ok(gap(parked,back.atlas)<.15,'近景返回后应回到刚才拖到的海边');
    assert.ok(back.night>.93);
    await press('overview');
    await wait(()=>!window.pondInspect().view.moving);
    assert.ok(gap((await read()).atlas,first.atlas)<.15,'总图复位回到开场');
    await inspectDock();
    assert.deepEqual(report.errors,[]); assert.deepEqual(report.requests,[]);
    report.phase='完成';
  } catch(error) {
    report.error=error.message;
    const s=await read().catch(()=>null);
    if(s)report.last={atlas:s.atlas,view:s.view,night:s.night};
    await capture('failure').catch(()=>{});
    console.error(width,report.phase,error.message);process.exitCode=1;
  } finally {
    await fs.writeFile(path.join(output,'check.json'),JSON.stringify(reports,null,2));
    console.log(JSON.stringify({width,stops:report.visits.length,phase:report.phase,errors:report.errors}));
    await context.close();
  }
}
try { for(const [w,h] of sizes) await check(w,h); } finally { await browser.close(); }
