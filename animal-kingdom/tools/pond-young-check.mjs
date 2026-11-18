import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const {chromium}=createRequire(import.meta.url)(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/pond-young');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const viewports=[[1440,900],[430,740],[390,844]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===+process.env.POND_TEST_WIDTH);
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
await fs.mkdir(out,{recursive:true});
try{
 for(const [width,height] of viewports){
  const mobile=width<500;
  const context=await browser.newContext({viewport:{width,height},offline:true,hasTouch:mobile});
  try{
   const page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url());});
   const wait=(predicate,arg=null)=>page.waitForFunction(predicate,arg,{timeout:22000});
   const read=()=>page.evaluate(()=>window.pondInspect());
   const tap=p=>mobile?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
   const capture=name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
   async function button(id){
    await wait(id=>{
     const element=document.getElementById(id),box=element.getBoundingClientRect();
     return document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest('button')===element;
    },id);
    const box=await page.locator('#'+id).boundingBox();
    await tap({x:box.x+box.width/2,y:box.y+box.height/2});
   }
   let phase='打开新池塘';
   try{
    await page.goto(url,{timeout:75000});
    await wait(()=>window.pondInspect?.().ready);
    await button('enter-pond');
    await wait(()=>{const s=window.pondInspect().view;return s.mode==='pond'&&!s.moving;});
    const initial=await read();
    assert.equal(initial.pondYoung.ducks.length,2);
    assert.equal(initial.pondYoung.tadpoles.length,4);
    assert.equal(initial.audio.started,0);
    for(const actor of [...initial.pondYoung.ducks,...initial.pondYoung.tadpoles]){
     assert.ok(actor.screen.x>12&&actor.screen.x<width-12&&actor.screen.y>30&&actor.screen.y<height-15);
    }
    await capture('01-pool');
    phase='点蝌蚪就分散';
    await tap((await read()).pondYoung.tadpoles[0].screen);
    await wait(()=>window.pondInspect().events.some(e=>e.type==='tadpole-scatter'&&e.cause==='tap'));
    await wait(()=>window.pondInspect().pondYoung.tadpoles.every(p=>p.scatter>.16));
    await capture('02-tadpoles');
    phase='前鸭真点、发声和同伴跟随';
    await wait(()=>{const s=window.pondInspect();return s.pondYoung.ducks[0].x>.95&&s.pondYoung.tadpoles.every(p=>p.scatter<.1);});
    await tap((await read()).pondYoung.ducks[0].screen);
    await wait(()=>window.pondInspect().audio.starts.duckling>=1);
    await wait(()=>window.pondInspect().pondYoung.ducks[0].headUp>.25);
    await capture('03-front-duck');
    await wait(()=>window.pondInspect().events.some(e=>e.type==='duck-follow'));
    await wait(()=>window.pondInspect().events.some(e=>e.type==='tadpole-scatter'&&e.cause==='duck'));
    const near=(await read()).events.find(e=>e.type==='tadpole-scatter'&&e.cause==='duck');
    assert.ok(near.radius+.06>=near.distance);
    const afterTail=await read();
    assert.ok(afterTail.audio.ducklingDuration>=2);
    phase='后鸭真点抖翅';
    await wait(()=>window.pondInspect().audio.playing!=='duckling');
    await tap((await read()).pondYoung.ducks[1].screen);
    await wait(()=>{const s=window.pondInspect();return s.pondYoung.ducks[1].wing>.28&&s.audio.starts.duckling>=2;});
    await capture('04-rear-duck');
    phase='原蛙仍完整呱三声';
    await tap((await read()).frog.screen);
    await wait(()=>window.pondInspect().audio.playing==='frog');
    const singing=await read();
    assert.ok(singing.audio.duration>=2);
    await tap((await read()).pondYoung.ducks[0].screen);
    assert.equal((await read()).audio.playing,'frog');
    phase='夜里鸭休息和蝌蚪缓游';
    await button('sun');
    await wait(()=>{const s=window.pondInspect();return s.night>.94&&s.pondYoung.ducks.every(d=>d.sleep>.91);});
    const asleep=await read();
    await tap(asleep.pondYoung.ducks[1].screen);
    await page.locator('#sleep-mark').waitFor({state:'visible'});
    await capture('05-sleep');
    await wait(t=>window.pondInspect().time>t+2.1,asleep.time);
    const final=await read();
    assert.equal(final.audio.starts.duckling,asleep.audio.starts.duckling);
    assert.ok(final.pondYoung.ducks.every((d,i)=>Math.hypot(d.x-asleep.pondYoung.ducks[i].x,d.z-asleep.pondYoung.ducks[i].z)<.025));
    assert.ok(final.pondYoung.tadpoles.some((p,i)=>Math.hypot(p.x-asleep.pondYoung.tadpoles[i].x,p.z-asleep.pondYoung.tadpoles[i].z)>.045));
    assert.deepEqual(errors,[]);
    assert.deepEqual(requests,[]);
    report.push({width,height,near,afterTail,asleep,final,errors,requests});
    console.log(JSON.stringify({width,ducks:2,tadpoles:4,depth:near.distance,radius:near.radius,errors,requests}));
   }catch(error){
    report.push({width,height,phase,error:error.message,state:await read().catch(()=>null),errors,requests});
    await capture('failure').catch(()=>{});
    console.error(width,phase,error.message);
    process.exitCode=1;
   }finally{
    await fs.writeFile(path.join(out,'trace.json'),JSON.stringify(report,null,2));
   }
  }finally{await context.close();}
 }
}finally{await browser.close();}
