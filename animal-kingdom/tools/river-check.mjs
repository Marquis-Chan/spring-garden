import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/river');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const viewports=process.env.POND_TEST_WIDTH
 ?[[1440,900],[430,740],[390,844]].filter(([w])=>w===Number(process.env.POND_TEST_WIDTH))
 :[[1440,900],[430,740]];
assert.ok(viewports.length,'POND_TEST_WIDTH 应为 1440、430 或 390');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
try{
 for(const [width,height] of viewports){
  const touch=width!==1440,context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await context.newPage(),errors=[],requests=[];
  const cdp=touch?await context.newCDPSession(page):null;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const wait=(p,arg=null)=>page.waitForFunction(p,arg,{timeout:14000});
  const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const shot=name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
  const event=(type,index)=>wait(([t,i])=>window.pondInspect().river.events.some(e=>e.type===t&&(i===null||e.index===i)),[type,index??null]);
  async function press(id){
   const b=await page.locator('#'+id).boundingBox();
   assert.ok(b,id+' 可见');
   await tap({x:b.x+b.width/2,y:b.y+b.height/2});
  }
  async function view(mode){
   await press(mode==='overview'?'overview':'enter-'+mode);
   await wait(mode=>{const v=window.pondInspect().view;return v.mode===mode&&!v.moving;},mode);
  }
  async function dragCloud(toX){
   const cloud=await page.locator('#cloud').boundingBox(),sun=await page.locator('#sun').boundingBox();
   const from={x:cloud.x+cloud.width/2,y:cloud.y+cloud.height*.61};
   const to={x:toX,y:sun.y+sun.height/2-3+cloud.height*.11};
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
  let phase='打开页面';
  try{
   await page.goto(url);
   await wait(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
   assert.ok((await read())?.ready,errors.join('\n'));
   phase='全景入口';
   await shot('01-map');
   await view('river');
   await shot('02-river');
   phase='拖云遮日并停在原处';
   const sun=await page.locator('#sun').boundingBox(),sunX=sun.x+sun.width/2;
   await dragCloud(sunX);
   await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.shade>.64;});
   await shot('02a-sun-shaded');
   await dragCloud(width*.53);
   await wait(()=>window.pondInspect().shade<.12);
   phase='乌龟壳与鱼';
   await tap((await read()).river.turtle.screen);
   await wait(()=>window.pondInspect().river.turtle.reach<.12);
   await shot('03-tucked');
   await wait(()=>window.pondInspect().river.turtle.reach>.98);
   const first=(await read()).river;
   await tap(first.fish[0].screen);
   await event('fish-tap',0);
   await shot('04-fish-dive');
   phase='近龟的河马浪';
   await tap((await read()).river.hippo.screen);
   await wait(()=>window.pondInspect().river.hippo.gape>.95);
   await shot('05-hippo-gape');
   await wait(()=>{const {leaves,turtle}=window.pondInspect().river;return leaves[0].bob>.24&&leaves[1].bob===0&&Math.abs(turtle.listen)>.08;});
   await shot('06-wave-near');
   await event('wave-leaf',1);
   await shot('06a-wave-far');
   const near=(await read()).river.events.filter(e=>e.type.startsWith('wave'));
   assert.ok(near.findIndex(e=>e.type==='wave-leaf'&&e.index===0)<near.findIndex(e=>e.type==='wave-leaf'&&e.index===1));
   phase='龟划到远岸';
   await tap((await read()).river.stones[1]);
   await wait(()=>{const t=window.pondInspect().river.turtle;return t.paddle>.65&&t.x<25.54&&t.x>25.03;});
   await shot('07-turtle-swims');
   await event('turtle-land',1);
   await shot('08-turtle-basks');
   await tap((await read()).river.turtle.screen);
   await wait(()=>window.pondInspect().river.turtle.reach<.12);
   await tap((await read()).river.hippo.screen);
   await wait(()=>window.pondInspect().river.events.some(e=>e.type==='wave-leaf'&&e.id===2&&e.index===1));
   assert.equal((await read()).river.events.some(e=>e.type==='wave-turtle'&&e.id===2),false);
   phase='犀牛岸上跑和嗅草';
   await tap((await read()).river.rhino.screen);
   await wait(()=>window.pondInspect().river.rhino.gait>.6);
   await shot('09-rhino-steps');
   await wait(()=>window.pondInspect().river.rhino.sniff>.86);
   await shot('10-rhino-sniffs');
   await tap((await read()).river.grass[0]);
   await event('rhino-sniff',0);
   await event('grass-fish-look',0);
   const grassEffect=(await read()).river.events.filter(e=>e.type==='grass-fish-look');
   assert.deepEqual(grassEffect.map(e=>e.index),[0],'草穗碰水只让沿岸近鱼避开');
   phase='夜眠和沿路返回';
   await press('sun');
   await wait(()=>{const s=window.pondInspect();return s.night>.92&&s.river.turtle.sleep>.93;});
   const sleepSite=(await read()).river.turtle.site;
   await tap((await read()).river.turtle.screen);
   await page.locator('#sleep-mark').waitFor({state:'visible'});
   await shot('11-turtle-sleeps');
   await dragCloud(sunX);
   await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.shade>.64;});
   await shot('11a-moon-shaded');
   const cloud=(await read()).cloud;
   await view('savanna');
   await shot('12-grassland-connection');
   await view('river');
   const end=await read();
   assert.equal(end.river.turtle.site,sleepSite);
   assert.deepEqual(end.cloud,cloud);
   assert.ok(end.night>.93&&end.audio.starts.rhino>0&&end.audio.starts.hippo>0);
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
   report.push({width,height,touch,end,errors,requests});
   console.log(JSON.stringify({width,height,nearEvents:near.length,night:end.night,errors,requests}));
  }catch(error){
   report.push({width,height,touch,phase,error:error.message,state:await read().catch(()=>null),errors,requests});
   await shot('failure').catch(()=>{});
   console.error(width,phase,error.message);
   process.exitCode=1;
  }finally{
   await fs.writeFile(path.join(out,'trace.json'),JSON.stringify(report,null,2));
   await context.close();
  }
 }
}finally{await browser.close();}
