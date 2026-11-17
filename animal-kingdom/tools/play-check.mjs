import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const output=path.resolve(process.argv[2]||'qa');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({
 executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true,
 args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],timeout:15000
});
try {
 const records={browser:browser.version(),page:url,sessions:[]};
 for(const viewport of [{width:1440,height:900},{width:430,height:740},{width:1280,height:540}]
  .filter(({width})=>!process.env.POND_TEST_WIDTH||width===Number(process.env.POND_TEST_WIDTH))){
  const context=await browser.newContext({viewport,offline:true,hasTouch:viewport.width<500});
  const page=await context.newPage(),issues=[],network=[];
  page.on('pageerror',e=>issues.push(e.message));
  page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))network.push(r.url());});
  const capture=name=>page.screenshot({path:path.join(output,viewport.width+'-'+name+'.png')});
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const tap=({x,y})=>viewport.width<500?page.touchscreen.tap(x,y):page.mouse.click(x,y);
  const state=predicate=>page.waitForFunction(predicate,null,{timeout:20000});
  const status=()=>page.locator('#stage').evaluate(canvas=>getComputedStyle(canvas).cursor);
  const lightBox=()=>page.locator('#sun').boundingBox();
  async function findOpenWater(points){
   for(const p of points){
    await page.mouse.move(p.x,p.y);
    if((await status()).endsWith(', crosshair'))return;
   }
   throw Error('测试采样时鱼遮住了入水点');
  }
  async function moveCloud(x,y){
   const cloud=await page.locator('#cloud').boundingBox();
   await page.mouse.move(cloud.x+cloud.width/2,cloud.y+cloud.height/2);
   await page.mouse.down();
   await page.mouse.move(x,y,{steps:6});
   await page.mouse.up();
  }
  await page.goto(url);
  await state(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
  if(!(await read())?.ready)throw Error('WebGL unavailable: '+issues.join('; '));
  await page.locator('#enter-pond').click();
  await state(()=>{const view=window.pondInspect().view;return view.mode==='pond'&&!view.moving;});
  const first=await read();
  const sun=await lightBox();
  assert.ok(sun.y<26,'日月需要在宽屏和窄屏的高处');
  await capture('01-day');
  if(viewport.width>500){
   await page.mouse.move(first.sites[1].x,first.sites[1].y);
   const leafCursor=await status();
   assert.match(leafCursor,/data:image\/svg\+xml.*5 4, pointer/);
   await capture('leaf-hover');
   await page.mouse.move(first.water[0].x,first.water[0].y);
   const waterCursor=await status();
   assert.match(waterCursor,/data:image\/svg\+xml.*15 3, crosshair/);
   assert.notEqual(leafCursor,waterCursor);
   await page.mouse.move(first.frog.screen.x,first.frog.screen.y);
   assert.equal(await status(),'pointer');
   await page.mouse.move(viewport.width*.52,viewport.height*.94);
   assert.equal(await status(),'grab');
   const idle=await read();
   assert.equal(idle.audio.started,0);
   assert.equal(idle.target,null);
  }
  await tap(first.frog.screen);
  await state(()=>window.pondInspect().audio.started===1);
  const firstAudio=(await read()).audio;
  assert.ok(firstAudio.duration>=2);
  let played;
  if(viewport.width>500){
   await tap((await read()).sites[1]);
   await state(()=>window.pondInspect().frog.air>.45);
   await capture('02-hop');
   await state(()=>window.pondInspect().frog.site===1&&!window.pondInspect().busy);
   const now=await read();
    await findOpenWater([now.water[0],now.water[1]]);
   await page.mouse.down();
   await page.mouse.move(now.water[3].x,now.water[3].y,{steps:5});
   await page.mouse.up();
   await state(()=>window.pondInspect().greetingCount===1);
   played=await read();
  }else{
   await tap((await read()).water[3]);
   await state(()=>{const s=window.pondInspect(); return Math.hypot(s.fish.x-.69,s.fish.z-.23)<1.17;});
   await tap((await read()).sites[1]);
   await state(()=>window.pondInspect().greetingCount===1);
   played=await read();
   await capture('02-arrival');
  }
  await capture('03-together');
  await tap((await read()).sites[0]);
  await state(()=>window.pondInspect().frog.site===0&&!window.pondInspect().busy);
  await tap((await read()).water[2]);
  await state(()=>window.pondInspect().greetingCount===2);
  const repeat=await read();
  // 真实点按覆盖碰撞框优先级：原落点上的青蛙仍在蓄力时，第二击必须进队列。
  await tap(repeat.sites[1]);
  await tap(repeat.sites[0]);
  await state(()=>window.pondInspect().events.some(event=>event.type==='leaf-touch'));
  await state(()=>{const s=window.pondInspect();return s.frog.site===0&&!s.busy&&s.events.filter(e=>e.type==='land').length>=4;});
  await tap((await read()).fish.screen);
  await state(()=>window.pondInspect().fish.dive>.16);
  if(viewport.width>500){
   const {water}=await read();
   await findOpenWater([water[0],water[1]]);
   await page.mouse.down();
   await page.mouse.move(viewport.width*.52,viewport.height*.94);
   await page.mouse.up();
   assert.equal(await status(),'grab');
  }
  await moveCloud(2,2);
  const parked=await page.locator('#cloud').boundingBox(),mute=await page.locator('#sound').boundingBox();
  assert.ok(parked.x+parked.width/2>mute.x+mute.width,'云停住后仍可从按钮右侧抓取');
  await moveCloud(sun.x+sun.width/2,sun.y+sun.height/2-3);
  await state(()=>window.pondInspect().cloud.pin&&window.pondInspect().shade>.67);
  await moveCloud(viewport.width*.54,sun.y+sun.height/2-3);
  await state(()=>window.pondInspect().shade<.12);
  await page.locator('#sun').click();
  await state(()=>window.pondInspect().night>.94);
  await capture('04-night');
  const moon=await lightBox();
  await moveCloud(moon.x+moon.width/2,moon.y+moon.height/2-3);
  await state(()=>window.pondInspect().cloud.pin&&window.pondInspect().shade>.67);
  const covered=await read();
  await capture('05-covered');
  const end=await read();
  assert.equal(end.cloud.x,covered.cloud.x);
  assert.equal(end.cloud.y,covered.cloud.y);
  await page.locator('#sound').click();
  await state(()=>window.pondInspect().audio.muted);
  assert.deepEqual(issues,[]);
  assert.deepEqual(network,[]);
  const record={viewport,sun,moon,first,firstAudio,played,repeat,covered,frames:end.frames,issues,network};
  records.sessions.push(record);
  console.log(JSON.stringify({
   viewport,sunTop:sun.y,moonTop:moon.y,firstAudio,firstGreeting:played.events.find(event=>event.type==='greet'),
   repeatedGreeting:repeat.greetingCount,cloud:covered.cloud,shade:covered.shade,frames:end.frames,issues,network
  }));
  await fs.writeFile(path.join(output,'trace.json'),JSON.stringify(records,null,2));
  await context.close();
 }
}finally{
 await browser.close();
}
