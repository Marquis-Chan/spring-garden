import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const {chromium}=createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT||'playwright');
const folder=path.resolve(process.argv[2]||'qa/bamboo-family');
const file=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const sizes=[[1440,900],[390,844],[740,430]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===Number(process.env.POND_TEST_WIDTH));
assert.ok(sizes.length);
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME,chromiumSandbox:true});

async function play(width,height){
 const touch=width!==1440,context=await browser.newContext({viewport:{width,height},offline:true,hasTouch:touch});
 const page=await context.newPage(),errors=[],calls=[],actions=[];
 const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:32000});
 const read=()=>page.evaluate(()=>window.pondInspect());
 const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
 const photo=tag=>page.screenshot({path:path.join(folder,width+'-'+tag+'.png')});
 let place='';
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('file:'))errors.push(r.url());});
 await page.addInitScript(()=>{
  window.familyRecordings=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){
   const name=window.pondInspect().audio.playing,bytes=atob(window.POND_AUDIO[name]);
   const samples=this.buffer.getChannelData(0);
   const matches=bytes.length===samples.length*2+44&&samples.every((sample,i)=>{
    const at=44+i*2;
    const pcm16=((bytes.charCodeAt(at)|bytes.charCodeAt(at+1)<<8)<<16)>>16;
    return sample*32768===pcm16;
   });
   window.familyRecordings.push({name,matches,seconds:this.buffer.duration,rms:Math.sqrt(samples.reduce((a,x)=>a+x*x,0)/samples.length)});
   return start.apply(this,args);
  };
 });
 // 同时看实际 DOM 点击归属与状态回执，屏幕坐标落在按钮或另一只动物上就会失败。
 async function button(id){
  const rect=await page.locator('#'+id).boundingBox();
  const p={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
  const hit=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('button')?.id,p);
  assert.ok(hit===id||(id==='sun'&&hit==='cloud'),id+' 的中心实际点到了 '+hit);
  await tap(p);
 }
 async function enter(id){
  await button('enter-'+id);
  await wait(id=>window.pondInspect().view.mode===id&&!window.pondInspect().view.moving,id);place=id;
 }
 async function actor(id){
  const target=(await read())[place][id];
  assert.ok(target.clickable!==false,id+' 现在应已出现');
  const p=target.screen;
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p),'stage',id+' 被界面遮住');
  actions.push(id);await tap(p);
 }
 async function captureSound(id){
  await wait(id=>window.familyRecordings.some(r=>r.name===id&&r.matches&&r.rms>.015&&r.seconds>(id==='gum-grass'?.25:1)),id);
  calls.push(id);
 }
 async function tapFor(kind,event){
  const count=(await read())[place].events.filter(e=>e.type===event).length;
  await actor(kind);
  await wait(({place,event,count})=>window.pondInspect()[place].events.filter(e=>e.type===event).length>count,{place,event,count});
 }
 async function sky(night){
  await button('sun');
  await wait(night=>night?window.pondInspect().night>.94:window.pondInspect().night<.06,night);
 }
 async function idle(){await wait(()=>window.pondInspect().bamboo.play.phase==='idle');}
 try{
  await page.goto(file);await wait(()=>window.pondInspect?.().ready);
  await enter('eucalyptus');await photo('family');
  await tapFor('wallaby','wallaby-peek');await wait(()=>window.pondInspect().eucalyptus.mother.peek>.72);await photo('joey');
  await tapFor('wallaby-grass','wallaby-graze');await captureSound('gum-grass');
  await wait(()=>window.pondInspect().eucalyptus.grass.height<.9);
  await tapFor('silvereye','wallaby-listen');await captureSound('silvereye');
  await tapFor('wombat-den','wombat-den-sleep');
  await wait(()=>!document.querySelector('#sleep-mark').hidden);
  await sky(true);await wait(()=>window.pondInspect().eucalyptus.wombat.clickable);
  await tapFor('wombat','wombat-emerge');await captureSound('wombat');
  await wait(()=>window.pondInspect().eucalyptus.burrow.action==='graze');await photo('wombat');
  await tapFor('wombat','wombat-return');await sky(false);
  await enter('bamboo');await photo('bamboo');
  await tapFor('panda-mother','panda-call');await captureSound('panda');
  const greeting=(await read()).bamboo.events.filter(e=>e.type==='panda-call'||e.type==='panda-greeting').slice(-2);
  assert.deepEqual(greeting.map(e=>e.animal),['panda-mother','panda-left']);
  assert.ok(greeting[1].time-greeting[0].time>.35,'妈妈先示意，较大的幼崽随后发声');
  await idle();
  await tapFor('panda-bamboo','panda-taste');
  const first=(await read()).bamboo.events.filter(e=>e.type==='panda-taste').at(-1).animal;
  await photo('leaf');await idle();await tapFor('panda-bamboo','panda-taste');
  assert.notEqual((await read()).bamboo.events.filter(e=>e.type==='panda-taste').at(-1).animal,first);
  await idle();
  await tapFor('panda-right','panda-roll-start');await wait(()=>window.pondInspect().bamboo['panda-right'].tuck>.7);
  await photo('roll');await idle();
  assert.deepEqual((await read()).bamboo.events.filter(e=>e.type==='panda-roll').slice(-2).map(e=>e.animal),['panda-right','panda-left']);
  await tapFor('panda-slope','panda-roll-start');await idle();
  await sky(true);
  await wait(()=>window.pondInspect().bamboo['panda-left'].sleep>.8);
  for(const kind of ['panda-left','panda-right','panda-mother']){
   await tapFor(kind,'panda-sleep');await wait(()=>!document.querySelector('#sleep-mark').hidden);
  }
  await photo('sleep');await sky(false);
  await wait(()=>window.pondInspect().bamboo['panda-left'].sleep<.10);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,actions,calls,errors}));
 }catch(error){console.error(width,place,actions,errors);await photo('failed');throw error;}
 finally{await context.close();}
}
try{for(const size of sizes)await play(...size);}finally{await browser.close();}
