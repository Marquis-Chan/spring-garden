import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const {chromium}=createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT||'playwright');
const output=path.resolve(process.argv[2]||'qa/new-neighbors');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const sizes=[[1440,900],[390,844],[740,430]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===Number(process.env.POND_TEST_WIDTH));
assert.ok(sizes.length);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME,chromiumSandbox:true});

// 从真正开始播放的音轨取样，与离线 HTML 里署名的对应录音逐样本核对。
function observeAudio(){
 const play=AudioBufferSourceNode.prototype.start;
 window.checkedCalls=[];
 AudioBufferSourceNode.prototype.start=function(...args){
  const pcm=this.buffer.getChannelData(0);
  const id=Object.keys(window.POND_AUDIO).find(name=>{
   const wav=atob(window.POND_AUDIO[name]);
   if(wav.length!==44+2*pcm.length)return false;
   for(let i=0;i<pcm.length;i++){
    const lo=wav.charCodeAt(44+i*2),hi=wav.charCodeAt(45+i*2);
    if(((lo|hi<<8)<<16>>16)!==pcm[i]*32768)return false;
   }
   return true;
  });
  window.checkedCalls.push({id,seconds:this.buffer.duration,rms:Math.sqrt(pcm.reduce((sum,v)=>sum+v*v,0)/pcm.length)});
  return play.apply(this,args);
 };
}
async function check(width,height){
 const touch=width!==1440;
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('file:'))errors.push(r.url());});
 await page.addInitScript(observeAudio);
 const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:30000});
 const read=()=>page.evaluate(()=>window.pondInspect());
 async function click(selector){
  if(touch)await page.locator(selector).tap();else await page.locator(selector).click();
 }
 async function scene(id){
  await click('#enter-'+id);
  await wait(id=>{const v=window.pondInspect().view;return !v.moving&&v.mode===id;},id);
 }
 async function animal(habitat,kind){
  const p=(await read())[habitat][kind].screen;
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p),'stage',kind+' 应露在可点击的画面中');
  if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
 }
 async function call(habitat,kind){
  await animal(habitat,kind);
  await wait(kind=>window.checkedCalls.some(c=>c.id===kind),kind);
 }
 try{
  await page.goto(url);await wait(()=>window.pondInspect?.().ready);
  await scene('river');await call('river','croc');
  await wait(()=>window.pondInspect().river.events.some(e=>e.type==='croc-splash'));
  await scene('rainforest');await call('rainforest','macaw');
  await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='toucan-call'));
  await scene('eucalyptus');await call('eucalyptus','koala');await call('eucalyptus','silvereye');
  await wait(()=>window.pondInspect().eucalyptus.events.some(e=>e.type==='silvereye-land'));
  await page.screenshot({path:path.join(output,width+'-eucalyptus.png')});
  await click('#sun');await wait(()=>window.pondInspect().night>.93);
  await animal('eucalyptus','silvereye');
  await wait(()=>window.pondInspect().eucalyptus.events.some(e=>e.type==='silvereye-sleep')&&!document.querySelector('#sleep-mark').hidden);
  await scene('rainforest');await animal('rainforest','macaw');
  await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='sleep'&&e.animal==='macaw')&&!document.querySelector('#sleep-mark').hidden);
  const clips=await page.evaluate(()=>window.checkedCalls);
  for(const id of ['croc','macaw','koala','silvereye']){
   const tracks=clips.filter(c=>c.id===id);
   assert.equal(tracks.length,1,id+' 不应误触或在熟睡时再叫');
   assert.ok(tracks[0].seconds>=3&&tracks[0].rms>.07&&tracks[0].rms<.12,id+' 叫声的时长和音量');
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,height,clips,errors}));
 }catch(error){await page.screenshot({path:path.join(output,width+'-failure.png')});throw error;}
 finally{await context.close();}
}
try{for(const size of sizes)await check(...size);}finally{await browser.close();}
