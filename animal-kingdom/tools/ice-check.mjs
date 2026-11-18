import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const {chromium}=createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/ice');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME,chromiumSandbox:true});
try{
 for(const [width,height] of [[1440,900],[390,844],[740,430]]){
  const touch=width!==1440;
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith('file:'))errors.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect());
  const wait=fn=>page.waitForFunction(fn,null,{timeout:25000,polling:'raf'});
  const tap=({x,y})=>touch?page.touchscreen.tap(x,y):page.mouse.click(x,y);
  const photo=suffix=>page.screenshot({path:path.join(out,width+'-'+suffix+'.png')});
  async function tapFish(index){
   const {screen,clickable}=(await read()).ice.fish[index];
   assert.ok(clickable&&screen.x>12&&screen.x<width-12);
   assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,screen),'stage');
   await tap(screen);
  }
  await page.addInitScript(()=>{
   const start=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){
    const data=this.buffer.getChannelData(0);
    window.lastClip={seconds:this.buffer.duration,rms:Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length)};
    return start.apply(this,args);
   };
  });
  try{
   await page.goto(url);await wait(()=>window.pondInspect?.().ready);
   await page.locator('#enter-ice').click();await wait(()=>!window.pondInspect().view.moving);
   await photo('shoal');await tapFish(0);
   await wait(()=>window.pondInspect().audio.starts['polar-bear']>=1);
   const sound=await page.evaluate(()=>window.lastClip);assert.ok(sound.seconds>2&&sound.rms>.06);
   await wait(()=>window.pondInspect().ice.fish[0].mode==='held');await photo('scoop');
   await wait(()=>window.pondInspect().ice.bear.bite>.6);await photo('meal');
   await wait(()=>window.pondInspect().ice.events.some(e=>e.type==='fishing-finished'&&e.caught));
   await tapFish(1);
   await wait(()=>window.pondInspect().ice.fish[1].mode==='escape');await photo('escape');
   await wait(()=>window.pondInspect().ice.events.some(e=>e.type==='fishing-finished'&&!e.caught));
   const s=await read();
   assert.equal(s.ice.fish.filter(f=>f.clickable).length,3);
   const before=s.audio.starts['polar-bear'];await tap(s.ice.bear.screen);
   await page.waitForFunction(n=>window.pondInspect().audio.starts['polar-bear']>n,before);
   await tap((await read()).ice.cave);await wait(()=>window.pondInspect().ice.bear.phase==='den');
   assert.deepEqual(errors,[]);console.log(JSON.stringify({width,sound,result:'catch, miss, call, return'}));
  }catch(error){await photo('failure');throw error;}
  finally{await context.close();}
 }
}finally{await browser.close();}
