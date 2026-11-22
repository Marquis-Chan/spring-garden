import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const {chromium}=createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT||'playwright');
const output=path.resolve(process.argv[2]||'qa/ranch');
const game=pathToFileURL(path.resolve(process.argv[3]||'动物王国.html')).href;
const browser=await chromium.launch({executablePath:process.env.POND_CHROME,chromiumSandbox:true});
const sizes=[[390,844],[1440,900]].filter(([width])=>!process.env.POND_TEST_WIDTH||width===Number(process.env.POND_TEST_WIDTH));
assert.ok(sizes.length);await fs.mkdir(output,{recursive:true});
try{
 for(const [width,height] of sizes){
  const touch=width===390;
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await ctx.newPage(),errors=[],touched=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('request',r=>{if(!r.url().startsWith('file:'))errors.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect());
  const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:45000});
  const press=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  async function button(id){
   const b=await page.locator('#'+id).boundingBox();
   assert.ok(b&&b.width>0);await press({x:b.x+b.width/2,y:b.y+b.height/2});
  }
  async function animal(kind,index){
   const p=(await read()).ranch.targets.find(a=>a.kind===kind&&a.index===index).screen;
   const element=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,p);
   assert.equal(element,'stage',kind+index+' 被 '+element+' 遮挡');await press(p);
  }
  try{
   await page.goto(game);await wait(()=>window.pondInspect?.().ready);
   await button('enter-pond');await wait(()=>window.pondInspect().view.mode==='pond'&&!window.pondInspect().view.moving);
   await button('sun');
   await wait(()=>window.pondInspect().ranch.targets.filter(a=>a.sleep!==undefined&&a.kind!=='ranch-dog').every(a=>a.sleep>.99));
   await button('enter-ranch');await wait(()=>window.pondInspect().view.mode==='ranch'&&!window.pondInspect().view.moving);
   const asleep=(await read()).ranch.targets.filter(a=>a.sleep>.99);assert.equal(asleep.length,11);
   const before=(await read()).audio.started;
   for(const {kind,index} of asleep){
    const count=(await read()).ranch.events.length;await animal(kind,index);
    const last=(await read()).ranch.events.at(-1);
    assert.deepEqual([last?.type,last?.kind,last?.index],['ranch-sleep',kind.slice(6),index],kind+index+' 点按归属');
    assert.equal((await read()).ranch.events.length,count+1);
    await wait(()=>!document.querySelector('#sleep-mark').hidden);
    touched.push(kind+index);
   }
   await page.screenshot({path:path.join(output,'agent-night-'+width+'.png')});
   await animal('ranch-dog',0);assert.equal((await read()).ranch.events.at(-1)?.type,'ranch-dog-watch');
   const dogX=(await read()).ranch.targets.find(a=>a.kind==='ranch-dog').x;
   await wait(x=>Math.abs(window.pondInspect().ranch.targets.find(a=>a.kind==='ranch-dog').x-x)>.55,dogX);
   assert.equal((await read()).audio.started,before);
   // 天亮立刻点牛，不能闭眼叫；再切夜会取消这一次尚未完成的点按。
   await button('sun');await animal('ranch-cow',0);await button('sun');
   await wait(()=>window.pondInspect().ranch.targets.find(a=>a.kind==='ranch-cow').sleep>.99);
   await button('sun');await animal('ranch-lamb',1);
   const early=await read();
   if(early.ranch.targets.find(a=>a.kind==='ranch-lamb'&&a.index===1).sleep>.20)
    assert.equal(early.ranch.events.filter(e=>e.type==='ranch-call').length,0);
   await wait(()=>window.pondInspect().ranch.events.some(e=>e.type==='ranch-call'&&e.kind==='lamb'&&e.index===1));
   assert.equal((await read()).ranch.events.filter(e=>e.type==='ranch-call').length,1);
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({width,nightTaps:touched,silentPatrol:true,dawn:'one lamb call',errors}));
  }catch(e){await page.screenshot({path:path.join(output,'agent-night-failure-'+width+'.png')});throw e;}
  finally{await ctx.close();}
 }
}finally{await browser.close();}
