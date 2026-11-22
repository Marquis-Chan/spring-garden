import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const {chromium}=createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT||'playwright');
const folder=path.resolve(process.argv[2]||'qa/ranch');
const file=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const sizes=[[1440,900],[390,844],[740,430]].filter(([w])=>!process.env.POND_TEST_WIDTH||+process.env.POND_TEST_WIDTH===w);
assert.ok(sizes.length);
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME,chromiumSandbox:true});
async function play(width,height){
 const touch=width!==1440,context=await browser.newContext({viewport:{width,height},offline:true,hasTouch:touch});
 const page=await context.newPage(),errors=[],taps=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('file:'))errors.push(r.url());});
 await page.addInitScript(()=>{
  const start=AudioBufferSourceNode.prototype.start;window.ranchVoices=[];
  AudioBufferSourceNode.prototype.start=function(...args){
   window.ranchVoices.push({key:window.pondInspect().audio.playing,duration:this.buffer.duration});
   return start.apply(this,args);
  };
 });
 const read=()=>page.evaluate(()=>window.pondInspect());
 const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:75000});
 const photo=tag=>page.screenshot({path:path.join(folder,width+'-'+tag+'.png')});
 const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
 async function button(id){
  const el=page.locator('#'+id),r=await el.boundingBox();assert.ok(r,id);
  const p={x:r.x+r.width/2,y:r.y+r.height/2};
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('button')?.id,p),id);
  await tap(p);
 }
 const idleView=id=>wait(id=>window.pondInspect().view.mode===id&&!window.pondInspect().view.moving,id);
 async function hit(kind,index,event,who=kind,which=index,body=false){
  const state=(await read()).ranch,p=state.targets.find(t=>t.kind==='ranch-'+kind&&t.index===index)[body?'bodyScreen':'screen'];
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p),'stage',kind+' blocked');
  const n=state.events.length;taps.push([kind,index,event]);await tap(p);
  await wait(({event,n,who,which})=>window.pondInspect().ranch.events.slice(n).some(e=>e.type==='ranch-'+event&&e.kind===who&&e.index===which),{event,n,who,which});
 }
 try{
  await page.goto(file);await wait(()=>window.pondInspect?.().ready);
  await button('enter-ranch');await idleView('ranch');await photo('pasture');
  const r=(await read()).ranch;
  assert.deepEqual(r.targets.filter(t=>t.sleep!==undefined).map(t=>t.kind).sort(),['cow','cow','lamb','lamb','hen','rooster','chick','chick','chick','chick','chick','dog'].map(k=>'ranch-'+k).sort());
  for(const t of r.targets){
   assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,t.screen),'stage',t.kind+' covered');
  }
  const nav=await page.locator('button.waymark').evaluateAll(buttons=>buttons.filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return [b.id,r.left,r.top,r.right,r.bottom];}));
  assert.ok(nav.length>=13);assert.ok(nav.every(([,x,y,right,bottom])=>x>=0&&y>=0&&right<=width+1&&bottom<=height+1));
  await hit('hay',0,'hay-offer','cow',0);
  await wait(()=>window.pondInspect().ranch.targets.some(a=>a.kind==='ranch-cow'&&a.bite>.80));
  await photo('hay');await hit('lamb',1,'follow-hop');
  await hit('grain',0,'scatter','hen',0);
  await wait(()=>window.pondInspect().ranch.events.some(e=>e.type==='ranch-grain-eaten'));
  await hit('rooster',0,'call');
  await hit('chick',4,'call');await hit('dog',0,'dog-watch');
  await wait(()=>['ranch-cow','ranch-lamb','ranch-hen','ranch-rooster','ranch-chick','dog'].every(k=>window.ranchVoices.some(v=>v.key===k&&v.duration>.9)));
  await wait(()=>window.pondInspect().ranch.events.some(e=>e.type==='ranch-hay-eaten'&&e.index===0));
  await hit('cow',1,'hay-offer','cow',1,true);
  await wait(()=>window.pondInspect().ranch.events.some(e=>e.type==='ranch-hay-eaten'&&e.index===1));
  await button('overview');await idleView('overview');
  // 从总图入口实际拖到牧场，再点地图上的路标回到近景。
  for(let i=0;i<8;i++){
   if(await page.locator('#atlas-ranch').isVisible())break;
   await page.mouse.move(width*.45,height*.29);await page.mouse.down();
   await page.mouse.move(width*.41,height*.59,{steps:9});await page.mouse.up();
  }
  await button('atlas-ranch');await idleView('ranch');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,taps,voices:await page.evaluate(()=>window.ranchVoices),errors}));
 }catch(e){console.error(width,taps,errors,await read().then(x=>[x.view,x.ranch.events]).catch(()=>null));await photo('failed');throw e;}
 finally{await context.close();}
}
try{for(const size of sizes)await play(...size);}finally{await browser.close();}
