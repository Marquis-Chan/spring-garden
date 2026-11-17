import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const [mode,directory,filename]=process.argv.slice(2);
const output=path.resolve(directory||'qa/daily-'+mode);
const url=filename?pathToFileURL(path.resolve(filename)).href:new URL('../动物王国.html',import.meta.url).href;
const actors={
 overview:['frog','orchard.dog','woodland.fox'],
 orchard:['orchard.dog','orchard.cat','orchard.butterfly','orchard.bees.0'],
 grove:['grove.rabbit','grove.bird','woodland.fox','woodland.squirrel','woodland.pecker'],
 pond:['frog','fish','pondNeighbors.0','pondNeighbors.1'],
 savanna:['savanna.elephant','savanna.giraffe','savanna.zebra','savanna.lion'],
 river:['river.hippo','river.turtle','river.rhino','river.fish.0','river.fish.1'],
 asia:['asia.bear','asia.tiger','asia.peacock'],
 rainforest:['rainforest.monkey','rainforest.groundMonkey','rainforest.sloth','rainforest.toucan'],
 coast:['coast.penguins.0','coast.penguins.1','coast.fish.0','coast.fish.1'],
 ocean:['ocean.animals.star','ocean.animals.horse','ocean.animals.clown','ocean.animals.shark','ocean.animals.dolphin','ocean.animals.whale']
};
assert.ok(actors[mode],'须指定场景');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
try{
 for(const [width,height] of [[1440,900],[430,740]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===Number(process.env.POND_TEST_WIDTH))){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width===430,offline:true});
  try{
   const page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
   page.on('request',request=>{if(!request.url().startsWith('file:'))requests.push(request.url());});
   const tap=p=>width===430?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
   const capture=name=>page.screenshot({path:path.join(output,width+'-'+name+'.png')});
   await page.goto(url);
   await page.waitForFunction(()=>window.pondInspect?.().ready);
   if(mode!=='overview'){
    const button=await page.locator('#enter-'+mode).boundingBox();
    assert.ok(button,'场景入口可见');
    await tap({x:button.x+button.width/2,y:button.y+button.height/2});
   }
   await page.waitForFunction(target=>{const s=window.pondInspect().view;return s.mode===target&&!s.moving;},mode);
   await capture('enter');
   const started=await page.evaluate(()=>window.pondInspect().time);
   const recording=page.evaluate(({paths,mode})=>new Promise(resolve=>{
    const snapshots=[];
    const start=window.pondInspect().time;
    let last=start-.30;
    function next(){
     const s=window.pondInspect();
     if(s.time-last>=.24){
      snapshots.push({time:s.time,listen:mode==='grove'?s.grove.rabbit.listen:0,actors:paths.map(path=>{
       const actor=path.split('.').reduce((value,key)=>value?.[key],s);
       if(!actor)return null;
       return {x:actor.x,y:actor.y,z:actor.z,visible:actor.visible??true,screen:actor.screen,sleep:actor.sleep??0};
      })});
      last=s.time;
     }
     if(s.time-start>=10.8)resolve({snapshots,audio:s.audio.starts,
      rustles:mode==='grove'?s.woodland.events.filter(e=>e.type==='squirrel-rustle'):[]});
     else requestAnimationFrame(next);
    }
    next();
   }),{paths:actors[mode],mode});
   await page.waitForFunction(time=>window.pondInspect().time>=time+3.2,started);
   await capture('moving');
   const trace=await recording;
   const motion=actors[mode].map((name,index)=>{
    const points=trace.snapshots.map(snapshot=>snapshot.actors[index]);
    assert.ok(points.every(p=>p&&[p.x,p.y,p.z].every(Number.isFinite)),name+' 坐标有效');
    const active=points.filter(p=>p.visible&&p.sleep<.8);
    const span=Math.max(0,...active.map(a=>Math.max(...active.map(b=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)))));
    const visible=active.filter(p=>p.screen&&p.screen.x>=0&&p.screen.x<=width&&p.screen.y>=0&&p.screen.y<=height).length;
    return {name,span:+span.toFixed(3),visible,samples:active.length};
   });
   report.push({width,height,mode,motion,audio:trace.audio,errors,requests,trace});
   await fs.writeFile(path.join(output,'trace.json'),JSON.stringify(report,null,2));
   console.log(JSON.stringify({width,mode,motion,audio:trace.audio,errors,requests}));
   await capture('later');
   for(const animal of motion){
    assert.ok(animal.span>=.14,animal.name+' 在清醒时有可见的日常位移');
    assert.ok(animal.visible>=animal.samples*.8,animal.name+' 大部分活动留在画面内');
   }
   for(const count of Object.values(trace.audio))assert.equal(count,0,'日常活动不自动叫');
   if(mode==='grove'){
    assert.ok(trace.rustles.length>0,'松鼠实际到达草丛旁');
    assert.ok(trace.snapshots.some(s=>s.time>=trace.rustles[0].time&&s.time<trace.rustles[0].time+1.1&&Math.abs(s.listen)>.12),'松鼠带着松果经过后兔子才侧耳');
   }
   assert.deepEqual(errors,[]);
   assert.deepEqual(requests,[]);
  }finally{await context.close();}
 }
}finally{await browser.close();}
