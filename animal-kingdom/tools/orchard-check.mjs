import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const output=path.resolve(process.argv[2]||'qa/orchard');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
try{
 for(const [width,height] of [[1440,900],[430,740]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===Number(process.env.POND_TEST_WIDTH))){
  const touch=width===430,context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await context.newPage(),errors=[],requests=[];
  const cdp=touch?await context.newCDPSession(page):null;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const wait=(predicate,arg=null)=>page.waitForFunction(predicate,arg,{timeout:18000});
  const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const capture=name=>page.screenshot({path:path.join(output,width+'-'+name+'.png')});
  async function press(id){
   const box=await page.locator('#'+id).boundingBox();
   assert.ok(box,id+' 可见');
   await tap({x:box.x+box.width/2,y:box.y+box.height/2});
  }
  async function view(mode){
   await press(mode==='overview'?'overview':'enter-'+mode);
   await wait(mode=>{const s=window.pondInspect().view;return s.mode===mode&&!s.moving;},mode);
  }
  async function dragCloud(target){
   const control=page.locator('#cloud');
   const dispatch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
   const up=()=>cdp?dispatch('touchEnd',[]):page.mouse.up();
   for(const [x,y] of [[.50,.59],[.27,.61],[.68,.64],[.16,.70],[.84,.65],[.50,.36],[.36,.73],[.62,.76]]){
    const rect=await control.boundingBox();
    const dx=(x-.5)*rect.width,dy=(y-.5)*rect.height;
    const from={x:rect.x+rect.width*x,y:rect.y+rect.height*y};
    if(cdp)await dispatch('touchStart',[from]);
    else{await page.mouse.move(from.x,from.y);await page.mouse.down();}
    if(!await control.evaluate(el=>el.classList.contains('dragging'))){await up();continue;}
    const to={x:target.x+dx,y:target.y+dy};
    if(cdp){
     for(let i=1;i<=7;i++)await dispatch('touchMove',[{x:from.x+(to.x-from.x)*i/7,y:from.y+(to.y-from.y)*i/7}]);
    }else await page.mouse.move(to.x,to.y,{steps:7});
    await up();return;
   }
   assert.fail('果园没有露出可重新抓的云瓣');
  }
  async function parkCloudAwayFromSun(){
   const light=await page.locator('#sun').boundingBox();
   await dragCloud({x:width*.70,y:light.y+light.height/2-3});
   await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.cloud.x>.62&&s.shade<.12;});
  }
  await page.goto(url);
  await wait(()=>window.pondInspect?.().ready);
  await capture('01-overview');
  await view('pond');
  await parkCloudAwayFromSun();
  await view('overview');
  await view('orchard');
  await capture('02-orchard');
  const light=await page.locator('#sun').boundingBox();
  await dragCloud({x:light.x+light.width/2,y:light.y+light.height/2-3});
  await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.shade>.63;});
  await capture('02a-orchard-shade');
  await dragCloud({x:width*.56,y:light.y+light.height/2-3});
  await wait(()=>window.pondInspect().shade<.13);
  const start=await read();
  assert.equal(start.orchard.apples.filter(a=>a.phase==='branch').length,3);
  for(const a of start.orchard.apples){
   assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,a.screen),'stage','苹果的点按区域应由画布接收');
  }
  await tap(start.orchard.apples[0].screen);
  await wait(()=>{const a=window.pondInspect().orchard.apples[0];return a.phase==='drop'&&a.y>1.1;});
  await capture('03-apple-fall');
  await tap(start.orchard.apples[0].screen);
  await tap(start.orchard.apples[0].screen);
   await wait(()=>window.pondInspect().orchard.events.some(e=>e.type==='dog-chase'&&e.id===0));
  await capture('04-dog-chases');
   await wait(()=>{const s=window.pondInspect().orchard;return s.basketCount===1&&s.events.some(e=>e.type==='dog-sniff'&&e.id===0);});
  await capture('05-apple-in-basket');
  const first=await read(),appleEvents=first.orchard.events;
  const land=appleEvents.find(e=>e.type==='apple-land'),chase=appleEvents.find(e=>e.type==='dog-chase');
  assert.ok(land&&chase&&land.time<=chase.time);
  assert.equal(appleEvents.filter(e=>e.type==='apple-drop').length,1);
  await tap(first.orchard.apples[1].screen);await tap(first.orchard.apples[2].screen);
  await wait(()=>window.pondInspect().orchard.basketCount===3);
  const three=await read();assert.equal(new Set(three.orchard.events.filter(e=>e.type==='apple-basket').map(e=>e.id)).size,3);
  await capture('06-three-apples');

  await tap(three.orchard.cat.screen);
  await wait(()=>{const s=window.pondInspect();return s.orchard.cat.stretch>.24&&s.audio.starts.cat>=1;});
  await capture('07-cat-stretch');
  // 先让蝶落在猫附近的第一朵花，再验附近起飞引起的追看。
  // 远花绕行只有最后一瞬进入猫的视距，不能保证两个动作的峰值同时出现。
  await wait(()=>window.pondInspect().orchard.butterfly.perch!==null);
  for(let leg=0;leg<2;leg++){
   const butterfly=(await read()).orchard.butterfly;
   if(butterfly.perch===0)break;
   const next=(butterfly.perch+1)%3;
   await tap(butterfly.screen);
   await wait(index=>window.pondInspect().orchard.butterfly.perch===index,next);
  }
  assert.equal((await read()).orchard.butterfly.perch,0);
  await tap((await read()).orchard.butterfly.screen);
  await wait(()=>{const s=window.pondInspect().orchard;return s.butterfly.flight>.3&&Math.abs(s.cat.look)>.15;});
  await capture('08-cat-follows-butterfly');
  await tap((await read()).orchard.hive);
  await wait(()=>window.pondInspect().orchard.bees.every(b=>b.visible&&b.flight>.2));
  await capture('09-bees-leave-hive');
  await wait(()=>window.pondInspect().orchard.bees.every(b=>b.visible&&b.perch!==null));
  const bloom=await read();
  assert.ok(bloom.audio.starts.bee>=1);
  assert.notEqual(bloom.orchard.bees[0].perch,bloom.orchard.bees[1].perch);
  await capture('10-separate-flowers');

  await press('sun');
  await wait(()=>{const s=window.pondInspect();return s.orchard.cat.sleep>.93&&s.orchard.dog.sleep>.93&&s.orchard.bees.every(b=>!b.visible)&&s.night>.92;});
  const night=await read();
  await tap(night.orchard.dog.screen);
  await page.locator('#sleep-mark').waitFor({state:'visible'});
  await capture('11-orchard-night');
  await view('overview');
  await view('pond');
  await tap((await read()).frog.screen);
  await wait(()=>window.pondInspect().audio.starts.frog>=1);
  await view('overview');
  await view('grove');
  await tap((await read()).grove.grasses[0]);
  await wait(()=>window.pondInspect().grove.rabbit.cover===null);
  await view('overview');
  await view('orchard');
  const back=await read();
  assert.equal(back.orchard.basketCount,3);
  assert.ok(back.night>.92&&back.orchard.dog.sleep>.93);
  const clearMoon=await page.locator('#sun').evaluate(sun=>{
   const r=sun.getBoundingClientRect();
   return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===sun;
  });
  if(!clearMoon){
   await view('overview');
   await view('pond');
   await parkCloudAwayFromSun();
   await press('sun');
   await wait(()=>window.pondInspect().night<.07);
   await view('overview');
   await view('orchard');
  }else await press('sun');
  await wait(()=>{const s=window.pondInspect();return s.night<.07&&s.orchard.dog.sleep<.08;});
  await tap((await read()).orchard.basket);
  await wait(()=>{const s=window.pondInspect().orchard;return s.basketCount===0&&s.apples.every(a=>a.phase==='branch');});
  await tap((await read()).orchard.dog.screen);
  await wait(()=>window.pondInspect().audio.starts.dog>=1);
  await capture('12-awake-ready');
  assert.deepEqual(errors,[]);
  assert.deepEqual(requests,[]);
  report.push({width,height,touch,first,three,bloom,night,back,last:await read(),errors,requests});
  await fs.writeFile(path.join(output,'trace.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({width,height,apples:three.orchard.basketCount,cat:bloom.audio.starts.cat,bee:bloom.audio.starts.bee,errors,requests}));
  await context.close();
 }
}finally{await browser.close();}
