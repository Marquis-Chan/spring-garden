import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {ease} from '../src/state.js';
import {savannaPoints} from '../src/savanna-state.js';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/savanna');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
await fs.mkdir(out,{recursive:true});
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
  const wait=async(p,arg=null)=>{
   try{return await page.waitForFunction(p,arg,{timeout:45000});}
   catch(error){
    const state=await read();
    throw new Error('草原检查等待超时 '+p+' '+JSON.stringify({view:state?.view,events:state?.savanna?.events?.slice(-5),errors}),{cause:error});
   }
  };
  const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const shot=name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
  async function press(id){
   const b=await page.locator('#'+id).boundingBox();
   assert.ok(b,id+' 可见');
   await tap({x:b.x+b.width/2,y:b.y+b.height/2});
  }
  async function view(mode){
   await press(mode==='overview'?'overview':'enter-'+mode);
   await wait(mode=>{const v=window.pondInspect().view;return v.mode===mode&&!v.moving;},mode);
  }
  async function dragCloud(x){
   const cloud=await page.locator('#cloud').boundingBox(),sun=await page.locator('#sun').boundingBox();
   const from={x:cloud.x+cloud.width/2,y:cloud.y+cloud.height*.63};
   const to={x,y:sun.y+sun.height/2-3+cloud.height*.13};
   if(touch){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
    for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/5,y:from.y+(to.y-from.y)*i/5}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else{
    await page.mouse.move(from.x,from.y);
    await page.mouse.down();
    await page.mouse.move(to.x,to.y,{steps:5});
    await page.mouse.up();
   }
  }
  await page.goto(url);
  await wait(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
  assert.ok((await read())?.ready,errors.join('\n'));
  await shot('01-map-entry');
  await view('savanna');
  await shot('02-savanna');
  const sun=await page.locator('#sun').boundingBox(),sunX=sun.x+sun.width/2;
  await dragCloud(sunX);
  await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.shade>.64;});
  const dayShade=(await read()).shade;
  await shot('02a-sun-shaded');
  await dragCloud(width*.53);
  await wait(()=>window.pondInspect().shade<.12);
  const start=await read();
  for(const animal of ['elephant','giraffe','zebra','lion']){
   const p=start.savanna[animal].screen;
   assert.ok(p.x>24&&p.x<width-24&&p.y>25&&p.y<height-25);
  }
  await tap(start.savanna.elephant.screen);
  await wait(()=>{const s=window.pondInspect().savanna;return s.elephant.scoop>.94&&s.elephant.lift<.09;});
  const atWater=(await read()).savanna.nozzle;
  const drink=savannaPoints.water;
  assert.ok(Math.hypot(atWater[0]-drink.x,atWater[1]-drink.y,atWater[2]-drink.z)<.26,
   '鼻尖实际落到水边');
  await shot('03-trunk-at-water');
  await wait(()=>{const s=window.pondInspect().savanna;const spray=s.events.find(e=>e.type==='spray');return spray&&s.elephant.time-spray.time>.25;});
  await shot('04-spray-from-tip');
  await wait(()=>window.pondInspect().savanna.flowers[0].wet>.2);
  await shot('05-contact-and-rainbow');
  assert.equal((await read()).savanna.flowers[1].wet,0);
  await tap((await read()).savanna.flowers[1].screen);
  await wait(()=>window.pondInspect().savanna.flowers[1].wet>.2);
  const watering=await read();
  assert.ok(watering.audio.starts.elephant>=1);
  assert.deepEqual(watering.savanna.events.filter(e=>e.type==='water-hit').map(e=>e.index),[0,1]);
  assert.deepEqual(watering.savanna.events.filter(e=>e.type==='zebra-water-look').map(e=>e.index),[1]);
  await shot('06-second-flowers');

  await tap(watering.savanna.giraffe.screen);
  await wait(()=>window.pondInspect().savanna.giraffe.browse>.98);
  const mouth=(await read()).savanna.mouth;
  const leaf=savannaPoints.leaves[0];
  assert.ok(Math.hypot(mouth[0]-leaf.x,mouth[1]-leaf.y,mouth[2]-leaf.z)<.14,'长颈鹿吻部碰到真叶点');
  await shot('07-giraffe-reaches');
  await wait(()=>window.pondInspect().savanna.events.some(e=>e.type==='zebra-leaf-look'&&e.index===0));
  await wait(()=>Math.abs(window.pondInspect().savanna.zebra.listen)>.1);
  await shot('08-zebra-listens');
  await wait(()=>{const g=window.pondInspect().savanna.giraffe;return !g.browse&&!g.chew;});
  await tap((await read()).savanna.leaves[1].screen);
  await wait(()=>window.pondInspect().savanna.events.some(e=>e.type==='leaf-land'&&e.index===1));
  await wait(()=>window.pondInspect().savanna.events.some(e=>e.type==='lion-bats-leaf'));
  await shot('08a-lion-bats-leaf');
  assert.equal((await read()).savanna.zebra.listen,0);
  await tap((await read()).savanna.zebra.screen);
  await wait(()=>window.pondInspect().savanna.events.some(e=>e.type==='hoof'));
  await wait(()=>window.pondInspect().savanna.elephant.sniff>.67);
  await shot('09-zebra-runs');
  await tap((await read()).savanna.lion.screen);
  await wait(()=>{const s=window.pondInspect();return s.savanna.lion.roar>.94&&s.audio.starts.lion>0;});
  await shot('10-lion-roar');
  await tap((await read()).savanna.rock);
  await wait(()=>window.pondInspect().savanna.lion.stretch>.4);
  await shot('11-stretch');
  await wait(()=>window.pondInspect().savanna.lion.stretch<.06);
  await tap((await read()).savanna.lionGrass);
  await wait(()=>window.pondInspect().savanna.events.some(e=>e.type==='lion-grass-contact'));
  const grassEvents=(await read()).savanna.events;
  const touched=grassEvents.find(e=>e.type==='lion-grass-touch');
  const contact=grassEvents.find(e=>e.type==='lion-grass-contact');
  assert.ok(touched&&contact.time>touched.time,'狮子先响应点击，再伸爪碰草');
  await shot('11a-lion-paw-on-grass');
  await press('sun');
  await wait(()=>{const s=window.pondInspect();return s.night>.91&&s.savanna.zebra.sleep>.90;});
  await tap((await read()).savanna.zebra.screen);
  await page.locator('#sleep-mark').waitFor({state:'visible'});
  await shot('12-savanna-night');
  await dragCloud(sunX);
  await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.shade>.64;});
  const moonShade=(await read()).shade;
  await shot('13-moon-shaded');
  await dragCloud(width*.53);
  await wait(()=>window.pondInspect().shade<.12);
  await view('overview');await view('orchard');
  await tap((await read()).orchard.apples[1].screen);
  await wait(()=>window.pondInspect().orchard.basketCount===1);
  await view('overview');await view('savanna');
  const end=await read();
  assert.ok(end.night>.92&&end.savanna.zebra.sleep>.9);
  const watered=end.savanna.events.filter(e=>e.type==='water-hit');
  assert.deepEqual(watered.map(e=>e.index),[0,1]);
  for(const {index,time} of watered){
   const expected=1-ease((end.savanna.elephant.time-time-2.5)/18);
   assert.ok(Math.abs(end.savanna.flowers[index].wet-expected)<.01,'离开场景后，花仍按浇水时间逐渐变干');
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(requests,[]);
  report.push({width,height,touch,dayShade,moonShade,watering,end,errors,requests});
  await fs.writeFile(path.join(out,'trace.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({width,height,water:watering.savanna.events.filter(e=>e.type==='water-hit').length,night:end.night,errors,requests}));
  await context.close();
 }
}finally{await browser.close();}
