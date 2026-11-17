import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/woodland');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
try{
 for(const [width,height] of [[1440,900],[430,740]].filter(([w])=>!process.env.POND_TEST_WIDTH||w===Number(process.env.POND_TEST_WIDTH))){
  const touch=width===430,context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await context.newPage(),errors=[],requests=[];
  const cdp=touch?await context.newCDPSession(page):null;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const wait=(p,arg=null)=>page.waitForFunction(p,arg,{timeout:13000});
  const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const shot=name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
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
   const control=page.locator('#cloud'),sun=await page.locator('#sun').boundingBox();
   const up=()=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.mouse.up();
   for(const [x,y] of [[.48,.58],[.30,.61],[.64,.61],[.18,.67],[.80,.66],[.48,.37]]){
    const cloud=await control.boundingBox();
    const from={x:cloud.x+cloud.width*x,y:cloud.y+cloud.height*y};
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
    else{await page.mouse.move(from.x,from.y);await page.mouse.down();}
    if(!await control.evaluate(el=>el.classList.contains('dragging'))){await up();continue;}
    const to={x:toX+cloud.width*(x-.5),y:sun.y+sun.height/2-3+cloud.height*(y-.5)};
    if(touch){
     for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/5,y:from.y+(to.y-from.y)*i/5}]});
    }else await page.mouse.move(to.x,to.y,{steps:5});
    await up();
    return;
   }
   assert.fail('林缘没有露出可以抓取的云瓣');
  }
  let phase='打开页面';
  try{
   await page.goto(url);
   await wait(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
   assert.ok((await read())?.ready,errors.join('\n'));
   await view('grove');
   await shot('01-grove-five');
   const first=await read();
   for(const animal of [first.grove.rabbit,first.grove.bird,...['fox','squirrel','pecker'].map(name=>first.woodland[name])]){
    assert.ok(animal.screen.x>=24&&animal.screen.x<=width-24);
   }
   phase='林间可抓云遮日';
   const sun=await page.locator('#sun').boundingBox();
   await dragCloud(sun.x+sun.width/2);
   await wait(()=>{const s=window.pondInspect();return s.cloud.pin&&s.shade>.63;});
   await shot('01a-sun-shaded');
   const parked=(await read()).cloud;
   await press('sun');
   await wait(()=>window.pondInspect().night>.92);
   assert.deepEqual((await read()).cloud,parked);
   await press('sun');
   await wait(()=>window.pondInspect().night<.08);
   assert.deepEqual((await read()).cloud,parked);
   const covered=await page.locator('#cloud').boundingBox();
   await tap({x:covered.x+covered.width*.85,y:covered.y+covered.height*.61});
   await wait(()=>!window.pondInspect().cloud.pin);
   assert.ok((await read()).night<.08);
   await dragCloud(width*.43);
   await wait(()=>window.pondInspect().shade<.14);
   phase='啄树后近松鼠转耳';
   await tap((await read()).woodland.roots[0]);
   await wait(()=>window.pondInspect().woodland.squirrel.site===0);
   await tap((await read()).woodland.wood[0]);
   await wait(()=>{const s=window.pondInspect();return s.woodland.pecker.peck>.92&&s.audio.starts.woodpecker>0;});
   await shot('02-pecker-contact');
   await wait(()=>window.pondInspect().woodland.events.some(e=>e.type==='squirrel-listen'));
   await shot('03-squirrel-listens');
   await wait(()=>window.pondInspect().woodland.events.filter(e=>e.type==='peck-hit').length===3);
   const near=(await read()).woodland.events;
   assert.ok(near.findIndex(e=>e.type==='peck-hit')<near.findIndex(e=>e.type==='squirrel-listen'));
   phase='松鼠去远处，同树敲击';
   await tap((await read()).woodland.squirrel.screen);
   await wait(()=>window.pondInspect().audio.starts.squirrel>0);
   await tap((await read()).woodland.roots[1]);
   await wait(()=>{const s=window.pondInspect().woodland.squirrel;return s.site===1&&Math.hypot(s.x-9.42,s.z+.16)<.04;});
   await tap((await read()).woodland.wood[0]);
   await wait(()=>window.pondInspect().woodland.events.filter(e=>e.type==='peck-hit').length===6);
   assert.equal((await read()).woodland.events.filter(e=>e.type==='squirrel-listen').length,1);
   phase='松鼠沿根攀低枝';
   await tap((await read()).woodland.perch);
   await wait(()=>window.pondInspect().woodland.squirrel.climb>.75);
   await shot('04-squirrel-climbs');
   await wait(()=>window.pondInspect().woodland.squirrel.site===2);
   await shot('05-squirrel-perched');
   phase='啄木鸟上移到高处';
   await tap((await read()).woodland.wood[1]);
   await wait(()=>window.pondInspect().woodland.pecker.site===1);
   await wait(()=>window.pondInspect().woodland.pecker.peck>.9);
   await shot('06-pecker-higher');
   phase='狐狸翻叶并换灌丛';
   await tap((await read()).woodland.litter[0].screen);
   await wait(()=>window.pondInspect().woodland.litter[0].scatter>.4);
   await shot('07-fox-digs');
   await wait(()=>{const s=window.pondInspect().woodland;return s.fox.time-s.events.find(e=>e.type==='litter-flip').time>.54;});
   await tap((await read()).woodland.fox.screen);
   await wait(()=>window.pondInspect().woodland.fox.site===1);
   await shot('08-fox-second-stop');
   phase='原林缘两条联动';
   await tap((await read()).grove.grasses[0]);
   await wait(()=>{const s=window.pondInspect().grove;return s.bird.perch===1&&s.rabbit.cover===null;});
   await shot('09-rabbit-bird');
   await tap((await read()).grove.bird.screen);
   await wait(()=>window.pondInspect().grove.events.some(e=>e.type==='peck'));
   await shot('10-bird-peck-original');
   phase='两种睡眠反应与返回';
   await press('sun');
   await wait(()=>{const s=window.pondInspect();return s.night>.92&&s.woodland.squirrel.sleep>.92&&s.woodland.pecker.sleep>.92;});
   const night=(await read());
   await tap(night.woodland.squirrel.screen);
   await page.locator('#sleep-mark').waitFor({state:'visible'});
   await shot('11-squirrel-sleeps');
   await tap((await read()).woodland.pecker.screen);
   await wait(()=>window.pondInspect().woodland.events.some(e=>e.type==='sleep'&&e.animal==='pecker'));
   await shot('12-pecker-sleeps');
   await view('overview');await view('grove');
   const end=await read();
   assert.equal(end.woodland.squirrel.site,night.woodland.squirrel.site);
   assert.equal(end.woodland.pecker.site,night.woodland.pecker.site);
   assert.equal(end.audio.starts.woodpecker,night.audio.starts.woodpecker);
   assert.ok(end.audio.starts.fox>0&&end.audio.starts.squirrel>0);
   phase='新开局先点旧鸟，兔在草里侧耳';
   await page.reload();
   await wait(()=>window.pondInspect?.().ready);
   await view('grove');
   const hidden=(await read()).grove;
   assert.equal(hidden.rabbit.cover,0);
   await tap(hidden.bird.screen);
   await wait(()=>{const g=window.pondInspect().grove;return g.rabbit.cover===0&&Math.abs(g.rabbit.listen)>.10&&g.events.some(e=>e.type==='peck');});
   await shot('13-bird-first-rabbit-still-hidden');
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
   report.push({width,height,touch,end,errors,requests});
   console.log(JSON.stringify({width,height,errors,requests}));
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
