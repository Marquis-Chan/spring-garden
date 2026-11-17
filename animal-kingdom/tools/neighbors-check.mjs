import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const {chromium}=createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/neighbors');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const sizes=[[1440,900],[430,740],[390,844]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===+process.env.POND_TEST_WIDTH);
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
await fs.mkdir(out,{recursive:true});
try{
 for(const [width,height] of sizes){
  const touch=width<500,context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await context.newPage(),errors=[],requests=[];
  const cdp=touch?await context.newCDPSession(page):null;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const wait=(fn,arg=null)=>page.waitForFunction(fn,arg,{timeout:16000});
  const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const shot=name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
  async function press(id){
   const b=await page.locator('#'+id).boundingBox();
   assert.ok(b,id+' 必须可点');
   await tap({x:b.x+b.width/2,y:b.y+b.height/2});
  }
  async function open(mode){
   await press(mode==='overview'?'overview':'enter-'+mode);
   await wait(mode=>{const s=window.pondInspect().view;return s.mode===mode&&!s.moving;},mode);
  }
  async function drag(from,delta){
   if(!touch){
    await page.mouse.move(from.x,from.y);await page.mouse.down();
    await page.mouse.move(from.x+delta.x,from.y+delta.y,{steps:6});await page.mouse.up();
    return;
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
   for(let i=1;i<=6;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+delta.x*i/6,y:from.y+delta.y*i/6}]});
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  let phase='地图拖曳和短点';
  try{
   await page.goto(url);await wait(()=>window.pondInspect?.().ready);
   const overview=await read();
   await drag({x:width*.42,y:height*.72},{x:-width*.17,y:height*.05});
   await wait(()=>Math.abs(window.pondInspect().view.panX)>14);
   const shifted=await read();
   assert.notEqual(overview.frog.screen.x,shifted.frog.screen.x);
   assert.equal(overview.audio.started,shifted.audio.started);
   await open('overview');
   assert.equal((await read()).view.panX,0);
   const beforeActorDrag=await read();
   await drag(beforeActorDrag.frog.screen,{x:width*.10,y:height*.043});
   assert.ok(Math.abs((await read()).view.panX)>12);
   assert.equal((await read()).audio.started,beforeActorDrag.audio.started);
   await open('overview');
   await open('pond');
   const pond=await read();
   assert.equal(pond.pondNeighbors.length,2);assert.ok(pond.hintCount>=5);
   await drag({x:width*.72,y:height*.19},{x:width*.16,y:height*.035});
   await wait(()=>window.pondInspect().view.panX>12);
   const moved=(await read()).view;
   await drag({x:width*.72,y:height*.24},{x:-moved.panX,y:-moved.panY});
   await wait(()=>Math.abs(window.pondInspect().view.panX)<2);
   for(const fish of (await read()).pondNeighbors)await tap(fish.screen);
   assert.deepEqual((await read()).events.filter(e=>e.type==='neighbor-fish').map(e=>e.index),[0,1]);
   await shot('01-pond-more-fish');
   await open('overview');await open('asia');
   phase='熊虎争同一颗果';
   const asia=await read();
   assert.ok(asia.hintCount>=8);
   await tap(asia.asia.sharedFruit.screen);
   await wait(()=>window.pondInspect().asia.events.some(e=>e.type==='shared-fruit-tiger-touch'));
   await shot('02-tiger-and-bear');
   await wait(()=>window.pondInspect().asia.events.some(e=>e.type==='shared-fruit-mouth'));
   const contest=(await read()).asia.events.map(e=>e.type);
   for(const [a,b] of [['shared-fruit-land','shared-fruit-tiger-touch'],['shared-fruit-tiger-touch','shared-fruit-bear-pick'],
    ['shared-fruit-bear-pick','shared-fruit-mouth']]){
    assert.ok(contest.indexOf(a)>=0&&contest.indexOf(a)<contest.indexOf(b),contest.join(', '));
   }
   await open('rainforest');
   phase='大幅树懒、树上猴落果和地面猴拾果';
   let rain=(await read()).rainforest;
   await tap(rain.slothBough);
   await wait(()=>window.pondInspect().rainforest.sloth.sway>.64);
   await shot('03-sloth-sways');
   await tap(rain.dropBanana.screen);
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='drop-banana-land'));
   await shot('04-banana-on-ground');
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='ground-monkey-pick'));
   await shot('05-monkey-collects');
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='ground-monkey-mouth'));
   rain=(await read()).rainforest;
   assert.equal(rain.events.filter(e=>e.type==='ground-monkey-pick').length,1);
   const pickup=rain.events.find(e=>e.type==='ground-monkey-pick');
   const peek=rain.events.find(e=>e.type==='monkey-look-down');
   assert.ok(peek&&peek.time>=pickup.time,'树猴看的是已经被捡起的同一根香蕉');
   await open('overview');await open('coast');await open('ocean');
   phase='海底六种各点一次，水流、躲藏和邻居回应';
   await drag({x:width*.62,y:height*.79},{x:width*.23,y:0});
   const offshore=(await read()).view;
   assert.ok(offshore.panX>10);
   await drag({x:width*.69,y:height*.79},{x:-offshore.panX,y:0});
   await wait(()=>Math.abs(window.pondInspect().view.panX)<2);
   const marine=(await read()).ocean;
   assert.equal(Object.keys(marine.animals).length,6);
   for(const [name,{screen}] of Object.entries(marine.animals)){
    assert.ok(screen.x>22&&screen.x<width-22&&screen.y>25&&screen.y<height-25,name+' 可见');
   }
   await shot('06-ocean');
   await tap(marine.animals.whale.screen);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-dolphin'&&e.reason==='whale'));
   await shot('07-whale-and-dolphin');
   await wait(()=>window.pondInspect().ocean.animals.dolphin.pose===0);
   await tap((await read()).ocean.animals.dolphin.screen);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-dolphin'&&e.reason==='tap'));
   await tap((await read()).ocean.animals.shark.screen);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-clown'&&e.reason==='shark'));
   await wait(()=>window.pondInspect().ocean.animals.clown.hide>.74);
   await shot('08-clown-hides');
   await wait(()=>window.pondInspect().ocean.animals.clown.pose===0);
   await tap((await read()).ocean.animals.clown.screen);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-horse'&&e.reason==='clown'));
   await wait(()=>window.pondInspect().ocean.animals.horse.pose>.36);
   await wait(()=>window.pondInspect().ocean.animals.horse.pose===0);
   await tap((await read()).ocean.animals.horse.screen);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-horse'&&e.reason==='tap'));
   await wait(()=>window.pondInspect().ocean.animals.horse.pose>.22);
   await wait(()=>window.pondInspect().ocean.animals.horse.pose===0);
   await tap((await read()).ocean.props.kelp);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-kelp-touch'));
   await shot('08a-horse-touches-kelp');
   await tap((await read()).ocean.animals.star.screen);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-shell'));
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-clown'&&e.reason==='shell'));
   await shot('09-starfish-crawls');
   phase='海葵有第二条小鱼，点过后游回家';
   assert.equal((await read()).ocean.visitor.visible,false);
   await tap((await read()).ocean.props.anemone);
   await wait(()=>window.pondInspect().ocean.visitor.amount>.90);
   await tap((await read()).ocean.visitor.screen);
   await wait(()=>window.pondInspect().ocean.events.some(e=>e.type==='ocean-visitor-turn'));
   await shot('10-anemone-guest');
   await wait(()=>!window.pondInspect().ocean.visitor.visible);
   const played=(await read()).ocean.events;
   for(const name of Object.keys(marine.animals))assert.ok(played.some(e=>e.type==='ocean-'+name&&e.reason==='tap'));
   const calls=(await read()).audio.starts;
   assert.ok(calls.whale>0&&calls.dolphin>0);
   await open('coast');await open('overview');await open('ocean');
   assert.ok((await read()).ocean.events.length>=played.length);
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
   const result={width,height,events:played,errors,requests};
   report.push(result);console.log(JSON.stringify({width,height,interactions:played.length,errors,requests}));
  }catch(error){
   report.push({width,height,phase,error:error.message,state:await read().catch(()=>null),errors,requests});
   await shot('failure').catch(()=>{});
   console.error(width,phase,error.message);process.exitCode=1;
  }finally{
   await fs.writeFile(path.join(out,'trace.json'),JSON.stringify(report,null,2));
   await context.close();
  }
 }
}finally{await browser.close();}
