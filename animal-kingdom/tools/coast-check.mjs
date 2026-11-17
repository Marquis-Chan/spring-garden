import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {coastGroundHeight,coastWaterY} from '../src/coast-state.js';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/coast');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const sizes=[[1440,900],[430,740],[390,844]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===+process.env.POND_TEST_WIDTH);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
try{
 for(const [width,height] of sizes){
  const touch=width!==1440,context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await context.newPage(),errors=[],requests=[],contacts=[];
  const cdp=touch?await context.newCDPSession(page):null;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const wait=(p,arg=null)=>page.waitForFunction(p,arg,{timeout:16000});
  const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const shot=name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
  async function press(id){
   const b=await page.locator('#'+id).boundingBox();
   assert.ok(b,id+' 显示在画面里');
   await tap({x:b.x+b.width/2,y:b.y+b.height/2});
  }
  async function view(mode){
   await press(mode==='overview'?'overview':'enter-'+mode);
   await wait(mode=>{const v=window.pondInspect().view;return v.mode===mode&&!v.moving;},mode);
  }
  async function dragCloud(toX){
   const control=page.locator('#cloud'),sun=await page.locator('#sun').boundingBox();
   const up=()=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.mouse.up();
   for(const [x,y] of [[.48,.58],[.30,.61],[.64,.61],[.18,.67],[.80,.66],[.48,.37]]){
    const cloud=await control.boundingBox(),from={x:cloud.x+cloud.width*x,y:cloud.y+cloud.height*y};
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
    else{await page.mouse.move(from.x,from.y);await page.mouse.down();}
    if(!await control.evaluate(el=>el.classList.contains('dragging'))){await up();continue;}
    const to={x:toX+cloud.width*(x-.5),y:sun.y+sun.height/2-3+cloud.height*(y-.5)};
    if(touch){
     for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/5,y:from.y+(to.y-from.y)*i/5}]});
    }else await page.mouse.move(to.x,to.y,{steps:5});
    await up();return;
   }
   assert.fail('找不到可拖的云瓣');
  }
  let phase='全景与河岸相邻入口';
  try{
   await page.goto(url);
   await wait(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
   assert.ok((await read())?.ready,errors.join('\n'));
   await shot('01-map');
   await view('river');await view('coast');
   await shot('02-coast');
   const initial=(await read()).coast;
   for(const p of [...initial.penguins.map(p=>p.screen),...initial.ramps,...initial.stones,...initial.fish.map(p=>p.screen)]){
    assert.ok(p.x>24&&p.x<width-24&&p.y>25&&p.y<height-25,'每个目标要能直接操作');
   }
   phase='两只企鹅摇步与发声';
   for(const i of [0,1]){
    const before=(await read()).audio.starts.penguin;
    await tap((await read()).coast.penguins[i].screen);
    await wait(i=>window.pondInspect().coast.penguins[i].phase==='waddle',i);
    await shot('03-waddle-'+i);
    await wait(i=>window.pondInspect().coast.penguins[i].phase==='land',i);
    await wait(n=>window.pondInspect().audio.starts.penguin>n,before);
    await wait(()=>window.pondInspect().audio.playing!=='penguin');
   }
   phase='左坡贴腹，前缘越水线，只有近鱼游开';
   const s=(await read()).coast;
   await tap(s.ramps[0]);await tap(s.ramps[0]);
   await wait(()=>{const p=window.pondInspect().coast.penguins[0];return p.phase==='slide'&&p.prone>.98&&p.z<14.24;});
   const sliding=(await read()).coast.penguins[0];
   assert.ok(Math.abs(sliding.belly[1]-coastGroundHeight(sliding.belly[2]))<.018,'胸腹与岩坡接触');
   contacts.push({phase:'slope',belly:sliding.belly});
   await shot('04-belly-on-ramp');
   await wait(()=>window.pondInspect().coast.events.some(e=>e.type==='water-entry'&&e.index===0));
   await shot('05-water-entry');
   await wait(()=>window.pondInspect().coast.penguins[0].phase==='swim');
   await wait(()=>window.pondInspect().coast.events.some(e=>e.type==='wave-fish'&&e.index===0));
   const entry=(await read()).coast;
   const entries=entry.events.filter(e=>e.type==='water-entry');
   assert.equal(entries.length,1,'连点只允许下水一次');
   assert.ok(Math.abs(entries[0].y-coastWaterY)<.001,'水花从实际水线起');
   assert.ok(Math.abs(coastGroundHeight(entries[0].z)-coastWaterY)<.002,'水花在坡的入水处');
   assert.ok(!entry.events.some(e=>e.type==='wave-fish'&&e.index===1),'远鱼不跟着触发');
   assert.equal(entry.penguins[1].phase,'land');
   contacts.push({phase:'water-entry',event:entries[0]});
   await shot('06-swim-near-fish');
   phase='回岸左脚着地，另一只滑水时点自己的石';
   await tap(entry.stones[0]);
   await wait(()=>window.pondInspect().coast.penguins[0].phase==='climb');
   await shot('07-climb-left');
   await wait(()=>window.pondInspect().coast.penguins[0].phase==='land');
   const landed=(await read()).coast;
   for(const foot of landed.penguins[0].feet)assert.ok(Math.abs(foot[1]-coastGroundHeight(foot[2]))<.07,'脚蹼上岸贴地');
   const back=landed.events.find(e=>e.type==='penguin-land'&&e.index===0);
   const look=landed.events.filter(e=>e.type==='penguin-neighbor-look'&&e.index===1&&e.source===0);
   assert.ok(back);
   assert.equal(look.length,1,'近处留岸的同伴只回看一次');
   assert.ok(look[0].time>=back.time,'先踩到岸再有邻居回应');
   await tap(landed.ramps[1]);
   await wait(()=>['approach','crouch','slide'].includes(window.pondInspect().coast.penguins[1].phase));
   await tap((await read()).coast.stones[1]);
   await wait(()=>window.pondInspect().coast.events.some(e=>e.type==='water-entry'&&e.index===1));
   await wait(()=>window.pondInspect().coast.penguins[1].phase==='climb');
   await shot('08-climb-right');
   await wait(()=>window.pondInspect().coast.penguins[1].phase==='land');
   phase='直接点鱼与水，水中切夜再回岸';
   const beforeFish=(await read()).coast;
   await tap(beforeFish.fish[1].screen);
   await wait(()=>window.pondInspect().coast.events.some(e=>e.type==='fish-touch'&&e.index===1));
   await tap((await read()).coast.water);
   await wait(()=>window.pondInspect().coast.events.some(e=>e.type==='ripple'));
   const ringCount=(await read()).coast.events.filter(e=>e.type==='ripple').length;
   await tap({x:width*.55,y:height*.85});
   await wait(n=>window.pondInspect().coast.events.filter(e=>e.type==='ripple').length===n+1,ringCount);
   await tap((await read()).coast.ramps[0]);
   await wait(()=>window.pondInspect().coast.penguins[0].phase==='swim');
   await press('sun');
   await wait(()=>{const c=window.pondInspect();return c.night>.93&&c.coast.penguins.every(p=>p.phase==='land'&&p.sleep>.88);});
   await tap((await read()).coast.penguins[0].screen);
   await page.locator('#sleep-mark').waitFor({state:'visible'});
   await shot('09-night-sleep');
   const soundBefore=(await read()).audio.starts.penguin;
   await tap((await read()).coast.penguins[1].screen);
   await wait(()=>window.pondInspect().coast.events.some(e=>e.type==='sleep'&&e.index===1));
   assert.equal((await read()).audio.starts.penguin,soundBefore);
   phase='拖云遮月、复亮与切回白天';
   const sun=await page.locator('#sun').boundingBox(),sunX=sun.x+sun.width/2;
   await dragCloud(sunX);
   await wait(()=>{const s=window.pondInspect();return s.shade>.63&&s.cloud.pin&&s.night>.93;});
   await shot('10-shaded-moon');
   await dragCloud(width*.42);
   await wait(()=>window.pondInspect().shade<.14);
   await press('sun');
   await wait(()=>{const c=window.pondInspect();return c.night<.07&&c.coast.penguins.every(p=>p.sleep<.08);});
   await tap((await read()).coast.ramps[1]);
   await wait(()=>window.pondInspect().coast.penguins[1].phase==='swim');
   phase='短暂离开，回来还是同一只在水里';
   await view('river');await view('coast');
   assert.equal((await read()).coast.penguins[1].phase,'swim');
   await view('overview');await view('coast');
   assert.equal((await read()).coast.penguins[1].phase,'swim');
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
   report.push({width,height,contacts,events:(await read()).coast.events,errors,requests});
   console.log(JSON.stringify({width,height,contacts,errors,requests}));
  }catch(error){
   await shot('failure').catch(()=>{});
   await fs.writeFile(path.join(out,width+'-failure.json'),JSON.stringify({phase,state:await read(),errors,requests},null,2));
   throw new Error(width+'px · '+phase,{cause:error});
  }finally{await context.close();}
 }
}finally{
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await browser.close();
}
