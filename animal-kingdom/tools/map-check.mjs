import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const root=path.resolve(process.argv[2]||'qa');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true,
 args:process.env.POND_SOFTWARE?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]});
const summary=[];
try{
 for(const [width,height] of [[1440,900],[430,740]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===Number(process.env.POND_TEST_WIDTH))){
  const hasTouch=width<500,ctx=await browser.newContext({viewport:{width,height},hasTouch,offline:true});
  const page=await ctx.newPage(),network=[],problems=[];
  page.on('pageerror',error=>problems.push(error.message));
  page.on('console',message=>{if(message.type()==='error')problems.push(message.text());});
  page.on('request',request=>{if(!request.url().startsWith('file:'))network.push(request.url());});
  const tap=p=>hasTouch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const loc=selector=>page.locator(selector);
  const box=async selector=>{
   const b=await loc(selector).boundingBox();
   assert.ok(b,selector+' 要能看见');
   return {x:b.x+b.width/2,y:b.y+b.height/2};
  };
  const press=async selector=>tap(await box(selector));
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const wait=(fn,arg=null)=>page.waitForFunction(fn,arg,{timeout:16000});
  const capture=name=>page.screenshot({path:path.join(root,width+'-'+name+'.png')});
  function checkOverview(state){
   for(const {screen} of [state.frog,state.fish,state.grove.rabbit,state.grove.bird]){
    assert.ok(screen.x>22&&screen.x<width-22&&screen.y>24&&screen.y<height-24,'全景里每只动物都需要保留画面边距');
   }
  }
  async function view(mode){
   await press(mode==='overview'?'#overview':'#enter-'+mode);
   await wait(mode=>{const v=window.pondInspect().view;return v.mode===mode&&!v.moving;},mode);
  }
  const cdp=hasTouch?await ctx.newCDPSession(page):null;
  async function drag(from,to){
   if(!cdp){
    await page.mouse.move(from.x,from.y);
    await page.mouse.down();
    await page.mouse.move(to.x,to.y,{steps:7});
    await page.mouse.up();
    return;
   }
   const touch=(type,point)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[point]:[]});
   await touch('touchStart',from);
   for(let i=1;i<=7;i++)await touch('touchMove',{x:from.x+(to.x-from.x)*i/7,y:from.y+(to.y-from.y)*i/7});
   await touch('touchEnd');
  }
  await page.goto(url);
  await wait(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
  const first=await read();
  assert.ok(first?.ready,problems.join('\n'));
  assert.equal(first.view.mode,'overview');
  await capture('01-overview');
  checkOverview(first);
  await tap(first.frog.screen);
  await wait(()=>window.pondInspect().audio.starts.frog===1);
  assert.equal((await read()).view.mode,'overview');
  await tap((await read()).fish.screen);
  await wait(()=>window.pondInspect().fish.dive>.13);
  await view('pond');
  await tap((await read()).sites[1]);
  await wait(()=>{const s=window.pondInspect();return s.frog.site===1&&!s.busy;});
  await capture('02-pond');
  await press('#sun');
  await wait(()=>window.pondInspect().night>.93);
  const sun=await box('#sun');
  await drag(await box('#cloud'),{x:sun.x,y:sun.y-3});
  await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.shade>.64;});
  await press('#sound');
  await wait(()=>window.pondInspect().audio.muted);
  const parked=await read();
  assert.ok(parked.audio.muted);
  await view('overview');await view('grove');
  await wait(()=>window.pondInspect().grove.bird.sleep>.95);
  await capture('03-grove-night');
  await press('#sound');
  await wait(()=>!window.pondInspect().audio.muted);
  const asleep=await read();
  assert.equal(await loc('#sleep-mark').isVisible(),false);
  await tap(asleep.grove.bird.screen);
  await tap(asleep.grove.bird.screen);
  await tap(asleep.grove.bird.screen);
  await loc('#sleep-mark').waitFor({state:'visible'});
  await capture('03b-sleep-response');
  const sleepResponse=await read();
  assert.equal(sleepResponse.grove.bird.perch,asleep.grove.bird.perch);
  assert.ok(sleepResponse.grove.bird.sleep>.95);
  assert.equal(sleepResponse.audio.starts.bird,asleep.audio.starts.bird);
  assert.ok(sleepResponse.grove.events.some(e=>e.type==='sleep'));
  assert.ok(!sleepResponse.grove.events.some(e=>e.type==='flight'||e.type==='peck'));
  await press('#sound');
  await wait(()=>window.pondInspect().audio.muted);
  await view('overview');await view('pond');
  const returned=await read();
  assert.equal(returned.frog.site,1);
  assert.equal(returned.audio.starts.frog,parked.audio.starts.frog);
  assert.ok(returned.audio.muted&&returned.night>.92&&returned.shade>.64);
  assert.deepEqual(returned.cloud,parked.cloud);
  await press('#sound');
  await wait(()=>!window.pondInspect().audio.muted);
  await tap((await read()).frog.screen);
  await wait(started=>window.pondInspect().audio.starts.frog>started,returned.audio.starts.frog);
  await tap((await read()).water[2]);
  await wait(()=>window.pondInspect().target!==null);
  await drag(await box('#cloud'),{x:width*.58,y:sun.y});
  await press('#sun');
  await wait(()=>{const s=window.pondInspect();return s.night<.08&&s.shade<.12&&!s.audio.muted&&s.grove.bird.sleep<.05;});
  await drag(await box('#cloud'),{x:sun.x,y:sun.y-3});
  await wait(()=>window.pondInspect().shade>.64);
  assert.ok((await read()).grove.bird.sleep<.05);
  await drag(await box('#cloud'),{x:width*.58,y:sun.y});
  await view('overview');await view('grove');
  await capture('04-grove');
  await tap((await read()).grove.grasses[0]);
  await wait(()=>{const g=window.pondInspect().grove;return g.bird.flight>.4&&g.rabbit.air>.22;});
  await capture('05-grove-hop-and-flight');
  await wait(()=>{const g=window.pondInspect().grove;return g.bird.perch===1&&g.rabbit.cover===null;});
  const startled=await read();
  const events=startled.grove.events;
  const grass=events.find(e=>e.type==='grass'),hop=events.find(e=>e.type==='hop'&&e.phase==='start');
  const flight=events.find(e=>e.type==='flight'&&e.phase==='start');
  assert.ok(grass.time<hop.time&&hop.time<flight.time&&flight.reason==='rabbit');
  await tap(startled.grove.bird.screen);
  await wait(()=>window.pondInspect().grove.events.some(e=>e.type==='peck'));
  await capture('06-grove-peck');
  const peck=await read();
  const peckEvent=peck.grove.events.find(e=>e.type==='peck');
  const ground=peck.grove.events.find(e=>e.type==='flight'&&e.phase==='land'&&e.reason==='tap'&&e.y<1);
  assert.ok(ground.time+.20<peckEvent.time);
  await tap((await read()).grove.bird.screen);
  await wait(()=>{const g=window.pondInspect().grove;return g.bird.perch===0&&g.bird.flight===0;});
  await tap((await read()).grove.rabbit.screen);
  await wait(()=>window.pondInspect().grove.rabbit.cover===1);
  const end=await read();
  assert.equal(end.grove.bird.perch,0);
  assert.equal(end.grove.events.filter(e=>e.type==='flight'&&e.phase==='start'&&e.reason==='rabbit').length,1);
  assert.ok(end.audio.starts.bird>=1);
  await view('overview');
  checkOverview(await read());
  await capture('07-back-overview');
  // 另开局只碰鸟，观测藏在草里的兔子是否在真实接触发生后才响应。
  await page.reload();
  await wait(()=>window.pondInspect?.().ready);
  await view('grove');
  await tap((await read()).grove.bird.screen);
  await wait(()=>{const g=window.pondInspect().grove;return g.bird.peck>.37&&!g.events.some(e=>e.type==='peck');});
  await capture('08-before-seed-contact');
  await wait(()=>{const g=window.pondInspect().grove;return g.rabbit.cover===0&&Math.abs(g.rabbit.listen)>.43;});
  await capture('09-bird-first-rabbit-listens');
  const birdFirst=await read();
  assert.equal(birdFirst.grove.events.filter(e=>e.type==='hop').length,0);
  assert.ok(birdFirst.grove.events.some(e=>e.type==='peck'));
  await tap((await read()).grove.bird.screen);
  await wait(()=>{const g=window.pondInspect().grove;return g.bird.perch===0&&g.bird.flight===0;});
  await tap((await read()).grove.grasses[1]);
  await wait(()=>window.pondInspect().grove.rabbit.cover===1);
  assert.equal((await read()).grove.bird.perch,0);
  await capture('10-far-route-bird-stays');
  await tap((await read()).grove.bird.screen);
  await wait(()=>window.pondInspect().grove.bird.perch===null);
  const fromGround=await read();
  await press('#sun');
  await wait(()=>{const s=window.pondInspect();return s.night>.93&&s.grove.bird.sleep>.95&&s.grove.bird.perch!==null;});
  const roost=await read();
  assert.ok(Math.cos(roost.grove.bird.yaw)>.48);
  assert.ok(roost.grove.events.some(e=>e.type==='flight'&&e.reason==='night'&&e.phase==='land'));
  assert.equal(roost.audio.starts.bird,fromGround.audio.starts.bird);
  const nightGrass=roost.grove.grasses[1];
  await tap(nightGrass);
  await wait(()=>window.pondInspect().grove.rabbit.cover===null);
  assert.equal((await read()).grove.bird.perch,roost.grove.bird.perch);
  await capture('11-night-rabbit-bird-roosts');
  assert.deepEqual(network,[]);
  assert.deepEqual(problems,[]);
  summary.push({width,height,hasTouch,first,parked,returned,startled,peck,end,birdFirst,sleepResponse,roost,network,problems});
  await fs.writeFile(path.join(root,'trace.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({width,height,hasTouch,flight:flight.time,peck:peckEvent.time,parked:returned.cloud,network,problems}));
  await ctx.close();
 }
}finally{await browser.close();}
