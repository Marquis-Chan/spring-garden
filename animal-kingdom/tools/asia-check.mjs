import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/asia');
const url=process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:new URL('../动物王国.html',import.meta.url).href;
const sizes=process.env.POND_TEST_WIDTH?[[1440,900],[430,740],[390,844]].filter(([w])=>w===Number(process.env.POND_TEST_WIDTH)):[[1440,900],[430,740]];
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.POND_CHROME||undefined,chromiumSandbox:true});
const report=[];
try{
 for(const [width,height] of sizes){
  const touch=width!==1440,context=await browser.newContext({viewport:{width,height},hasTouch:touch,offline:true});
  const page=await context.newPage(),errors=[],requests=[];
  const cdp=touch?await context.newCDPSession(page):null;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url());});
  const read=()=>page.evaluate(()=>window.pondInspect?.());
  const wait=(p,arg=null)=>page.waitForFunction(p,arg,{timeout:15000});
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
    await up();return;
   }
   assert.fail('找不到可拖的云瓣');
  }
  let phase='打开和进入亚洲林';
  try{
   await page.goto(url);
   await wait(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
   assert.ok((await read())?.ready,errors.join('\n'));
   await shot('01-overview');
   await view('asia');
   await shot('02-asia');
   const first=await read();
   for(const name of ['bear','tiger','peacock','owl']){
    const p=first.asia[name].screen;
    assert.ok(p.x>24&&p.x<width-24&&p.y>26&&p.y<height-26,name+' 进入画面并可点');
   }
   phase='猫头鹰白天睡';
   await tap(first.asia.owl.screen);
   await page.locator('#sleep-mark').waitFor({state:'visible'});
   await shot('03-owl-asleep');
   assert.equal((await read()).audio.starts.owl,0);
   phase='熊摘叶和落果近远';
   await tap((await read()).asia.bear.screen);
   await wait(()=>{const s=window.pondInspect().asia;return s.bear.stand>.96&&s.bear.reach>.91;});
   await shot('04-bear-reaches-leaf');
   await wait(()=>window.pondInspect().asia.events.some(e=>e.type==='leaf-mouth'));
   await shot('05-bear-chews');
   await tap((await read()).asia.fruits[1].screen);
   await wait(()=>window.pondInspect().asia.fruits[1].phase==='ground');
   const far=(await read()).asia;
   assert.equal(far.events.some(e=>e.type==='bear-approach'&&e.id===1),false);
   await tap(far.fruits[0].screen);
   await wait(()=>window.pondInspect().asia.fruits[0].phase==='drop');
   await shot('06-fruit-falls');
   await wait(()=>window.pondInspect().asia.fruits[0].phase==='held');
   await shot('07-bear-holds-fruit');
   await wait(()=>window.pondInspect().asia.events.some(e=>e.type==='fruit-mouth'&&e.id===0));
   const feed=(await read()).asia;
   const types=feed.events.filter(e=>e.id===0).map(e=>e.type);
   assert.ok(types.indexOf('fruit-land')<types.indexOf('fruit-pick')&&types.indexOf('fruit-pick')<types.indexOf('fruit-mouth'));
   assert.equal(feed.fruits[1].phase,'ground');
   phase='虎抓地伸展和多走两步';
   await tap((await read()).asia.tiger.screen);
   await wait(()=>{const s=window.pondInspect();return s.asia.tiger.stretch>.7&&s.audio.starts.tiger>0;});
   await shot('08-tiger-stretches');
   await tap((await read()).asia.tuft.screen);
   await wait(()=>window.pondInspect().asia.tiger.sniff>.78);
   await shot('09-tiger-sniffs');
   phase='孔雀开扇并入夜飞上枝';
   await tap((await read()).asia.peacock.screen);
   await wait(()=>{const s=window.pondInspect();return s.asia.peacock.fan>.98&&s.audio.starts.peacock>0;});
   await shot('10-peacock-fan');
   phase='遮云后孔雀仍然开屏';
   const sun=await page.locator('#sun').boundingBox();
   await dragCloud(sun.x+sun.width/2);
   await wait(()=>{const s=window.pondInspect();return s.shade>.64&&s.cloud.pin;});
   assert.ok((await read()).asia.peacock.fan>.98);
   await shot('10a-fan-in-cloud-shade');
   await dragCloud(width*.435);
   await wait(()=>window.pondInspect().shade<.13);
   phase='孔雀入夜先收屏后拍翼';
   await press('sun');
   await wait(()=>{const p=window.pondInspect().asia.peacock;return p.flight>.65&&p.fan<.02;});
   await shot('11-peacock-flies');
   await wait(()=>{const s=window.pondInspect();return s.night>.93&&s.asia.peacock.site===1&&s.asia.peacock.sleep>.93;});
   await tap((await read()).asia.peacock.screen);
   await wait(()=>window.pondInspect().asia.events.some(e=>e.type==='sleep'&&e.animal==='peacock'));
   await shot('12-peacock-perched');
   phase='夜间猫头鹰先叫再飞';
   await tap((await read()).asia.owl.screen);
   await tap((await read()).asia.owl.screen);
   await wait(()=>{const s=window.pondInspect();return s.audio.starts.owl===1&&s.asia.owl.call>.2;});
   await shot('13-owl-calls');
   await tap((await read()).asia.tiger.screen);
   await wait(()=>window.pondInspect().asia.tiger.stretch>.26);
   assert.equal((await read()).audio.playing,'owl');
   await wait(()=>window.pondInspect().asia.owl.flight>.67);
   await shot('14-owl-wings');
   await wait(()=>window.pondInspect().asia.owl.site===1);
   const night=(await read()).asia,voice=night.events.find(e=>e.type==='owl-call'),flight=night.events.find(e=>e.type==='owl-takeoff');
   assert.ok(flight.time-voice.time>=3.06-1e-6);
   assert.equal(night.events.filter(e=>e.type==='owl-call').length,1);
   await shot('15-owl-second-branch');
   phase='相邻树林返回，天亮再开屏';
   await view('grove');await view('asia');
   assert.equal((await read()).asia.owl.site,1);
   await press('sun');
   await wait(()=>{const s=window.pondInspect();return s.night<.08&&s.asia.peacock.site===0&&s.asia.owl.sleep>.92;});
   await tap((await read()).asia.peacock.screen);
   await wait(()=>{const p=window.pondInspect().asia.peacock;return p.fan>.38&&p.fan<.85;});
   await tap((await read()).asia.peacock.screen);
   await wait(()=>window.pondInspect().asia.peacock.fan<.05);
   await tap((await read()).asia.peacock.screen);
   await wait(()=>window.pondInspect().asia.peacock.fan>.98);
   await tap((await read()).asia.peacock.screen);
   await wait(()=>window.pondInspect().asia.peacock.fan<.05);
   phase='点羽眼抖屏，老虎回应，猫头鹰接着睡';
   await tap((await read()).asia.peacock.screen);
   await wait(()=>window.pondInspect().asia.peacock.fan>.98);
   const feather=[...(await read()).asia.peacockFan].sort((a,b)=>a.y-b.y)[0];
   await tap(feather);
   await wait(()=>window.pondInspect().asia.events.some(e=>e.type==='peacock-rattle'));
   await wait(()=>{
    const {peacock,tiger}=window.pondInspect().asia;
    return Math.abs(Math.sin(peacock.shakePhase*14))*peacock.shake>.61&&tiger.notice>.35;
   });
   await shot('17-peacock-rattles');
   const reaction=(await read()).asia;
   assert.ok(reaction.peacock.fan>.98&&reaction.owl.sleep>.9);
   phase='点浅石啄掉两粒种子';
   await tap(reaction.peacockSeedStone);
   await wait(()=>window.pondInspect().asia.events.some(e=>e.type==='peacock-peck'));
   await shot('18-peacock-pecks');
   await wait(()=>window.pondInspect().asia.events.filter(e=>e.type==='peacock-peck').length===2);
   const fed=(await read()).asia;
   assert.equal(fed.events.filter(e=>e.type==='peacock-peck').length,2);
   assert.ok(fed.peacock.fan<.06&&fed.owl.sleep>.9);
   const end=await read();
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
   report.push({width,height,touch,owlDelay:flight.time-voice.time,end,errors,requests});
   console.log(JSON.stringify({width,height,owlDelay:flight.time-voice.time,errors,requests}));
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
