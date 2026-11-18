import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.POND_PLAYWRIGHT||'playwright');
const out=path.resolve(process.argv[2]||'qa/rainforest');
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
  const wait=(p,arg=null)=>page.waitForFunction(p,arg,{timeout:18500});
  const tap=p=>touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
  const shot=name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
  async function press(id){
   const b=await page.locator('#'+id).boundingBox();
   assert.ok(b,id+' 显示在画面里');
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
  let phase='从全景进雨林';
  try{
   await page.goto(url);
   await wait(()=>window.pondInspect?.().ready||!document.getElementById('unsupported').hidden);
   assert.ok((await read())?.ready,errors.join('\n'));
   await shot('01-map');
   await view('rainforest');
   await shot('02-rainforest');
   const first=(await read()).rainforest;
   for(const name of ['monkey','sloth','toucan']){
    const p=first[name].screen;
    assert.ok(p.x>24&&p.x<width-24&&p.y>25&&p.y<height-25,name+' 要能直接操作');
   }
   phase='雨林拖云，只遮光';
   const sun=await page.locator('#sun').boundingBox(),sunX=sun.x+sun.width/2;
   await dragCloud(sunX);
   await wait(()=>{const s=window.pondInspect();return s.shade>.63&&s.cloud.pin&&s.night<.08;});
   await shot('02a-rainforest-shade');
   await dragCloud(width*.43);
   await wait(()=>window.pondInspect().shade<.14);
   phase='猴手碰香蕉并送嘴';
   await tap((await read()).rainforest.monkey.screen);
   // 自主换枝以后身体点击会吃当前枝上的果，明确再选左香蕉以固定后续跨枝路径。
   await tap((await read()).rainforest.bananas[0].screen);
   await wait(()=>{const s=window.pondInspect().rainforest;return s.bananas[0].phase==='held'&&s.monkey.bring>.66;});
   await shot('03a-monkey-hand-at-mouth');
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='banana-mouth'&&e.id===0));
   await shot('04-monkey-eats');
   await wait(()=>window.pondInspect().rainforest.bananas[0].phase==='branch');
   await shot('05-banana-regrows');
   phase='猴到另一根枝取第二根香蕉';
   await tap((await read()).rainforest.monkeyBranches[0]);
   await wait(()=>{const m=window.pondInspect().rainforest.monkey;return m.site===0&&m.air<.02;});
   const pickedBefore=(await read()).rainforest.events.filter(e=>e.type==='banana-pick'&&e.id===1).length;
   const b=(await read()).rainforest.bananas[1].screen;
   await tap(b);await tap(b);
   await wait(()=>window.pondInspect().rainforest.monkey.air>.62);
   await shot('06-monkey-swing');
   await wait(()=>window.pondInspect().rainforest.bananas[1].phase==='held');
   await shot('07-monkey-second-branch');
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='banana-mouth'&&e.id===1));
   const monkey=(await read()).rainforest;
   assert.equal(monkey.events.filter(e=>e.type==='banana-pick'&&e.id===1).length,pickedBefore+1);
   assert.equal(monkey.monkey.site,1);
   phase='树懒看近枝猴子、伸爪、抱枝轻摆';
   assert.ok(monkey.events.some(e=>e.type==='sloth-watch'&&e.animal==='monkey'));
   await tap(monkey.sloth.face);
   await wait(()=>window.pondInspect().rainforest.sloth.stretch>.62);
   await shot('07a-sloth-reaches-out');
   await wait(()=>window.pondInspect().rainforest.sloth.stretch<.02);
   await wait(()=>window.pondInspect().rainforest.toucan.flight<.02);
   if((await read()).rainforest.toucan.site!==0){
    await tap((await read()).rainforest.toucan.screen);
    await wait(()=>{const b=window.pondInspect().rainforest.toucan;return b.site===0&&b.flight===0;});
   }
   await tap((await read()).rainforest.slothBough);
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='toucan-watch'&&e.animal==='sloth'));
   await wait(()=>Math.abs(window.pondInspect().rainforest.toucan.look)>.23);
   await shot('07b-sloth-sways-neighbor-looks');
   await wait(()=>Math.abs(window.pondInspect().rainforest.sloth.sway)<.02);
   phase='树懒从脸侧把叶送到嘴';
   await tap((await read()).rainforest.leaf.screen);
   await wait(()=>{const f=window.pondInspect().rainforest;return f.leaf.phase==='held'&&f.sloth.bring>.63;});
   await shot('09-sloth-delivers');
   await wait(()=>window.pondInspect().rainforest.leaf.phase==='mouth');
   await shot('10-sloth-chews');
   phase='低枝巨嘴鸟与树懒抢同一颗果，鸟先叼到';
   await wait(()=>window.pondInspect().rainforest.toucan.flight<.02);
   if((await read()).rainforest.toucan.site!==0){
    await tap((await read()).rainforest.toucan.screen);
    await wait(()=>{const b=window.pondInspect().rainforest.toucan;return b.site===0&&b.flight===0;});
   }
   await tap((await read()).rainforest.berry.screen);
   await wait(()=>{
    const r=window.pondInspect().rainforest;
    return r.toucan.reach>.25&&r.sloth.reach>.20;
   });
   await shot('12a-both-reach-low');
   await wait(()=>{const b=window.pondInspect().rainforest.berry;return b.owner==='toucan'&&b.tossY>.135;});
   await shot('12-toucan-tosses');
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='berry-catch'));
   await wait(()=>window.pondInspect().rainforest.berry.phase==='branch');
   await tap((await read()).rainforest.toucan.screen);
   await wait(()=>window.pondInspect().rainforest.toucan.flight>.68);
   await shot('13-toucan-flies');
   await wait(()=>window.pondInspect().rainforest.toucan.site===1);
   phase='高枝巨嘴鸟探不到，果实落到树懒爪里';
   await wait(()=>window.pondInspect().rainforest.sloth.sleep<.07);
   await tap((await read()).rainforest.berry.screen);
   await wait(()=>{
    const r=window.pondInspect().rainforest;
    return r.toucan.reach>.15&&r.sloth.reach>.18;
   });
   await shot('14a-both-reach-high');
   await wait(()=>window.pondInspect().rainforest.berry.phase==='drop');
   await wait(()=>{const b=window.pondInspect().rainforest.berry;return b.owner==='sloth'&&b.phase==='held';});
   await shot('14b-sloth-catches');
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='sloth-berry-mouth'));
   await wait(()=>window.pondInspect().rainforest.berry.phase==='branch');
   const far=(await read()).rainforest;
   assert.deepEqual(far.events.filter(e=>e.type==='berry-pick').map(e=>e.animal),['toucan','sloth']);
   phase='同一短枝二次轻摆，远枝上的巨嘴鸟照旧';
   const watches=far.events.filter(e=>e.type==='toucan-watch').length;
   const swings=far.events.filter(e=>e.type==='sloth-sway').length;
   await tap(far.slothBough);
   await wait(n=>window.pondInspect().rainforest.events.filter(e=>e.type==='sloth-sway').length===n+1,swings);
   assert.equal((await read()).rainforest.events.filter(e=>e.type==='toucan-watch').length,watches);
   phase='白天小憩、晚上睡觉、保留位置';
   await wait(()=>window.pondInspect().rainforest.sloth.sleep>.87);
   await tap((await read()).rainforest.sloth.screen);
   await page.locator('#sleep-mark').waitFor({state:'visible'});
   await shot('15-sloth-naps');
   await tap((await read()).rainforest.berry.screen);
   await wait(()=>{
    const r=window.pondInspect().rainforest;
    return r.events.filter(e=>e.type==='berry-race').some(e=>!e.sloth&&e.winner==='toucan')&&r.berry.owner==='toucan';
   });
   assert.equal((await read()).rainforest.sloth.reach,0);
   await wait(()=>window.pondInspect().rainforest.berry.phase==='branch');
   await press('sun');
   await wait(()=>{const s=window.pondInspect();return s.night>.92&&s.rainforest.monkey.sleep>.92&&s.rainforest.toucan.sleep>.92;});
   await tap((await read()).rainforest.toucan.screen);
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='sleep'&&e.animal==='toucan'));
   await tap((await read()).rainforest.berry.screen);
   assert.equal((await read()).rainforest.events.filter(e=>e.type==='berry-race').length,3);
   await tap((await read()).rainforest.monkey.screen);
   await wait(()=>window.pondInspect().rainforest.events.some(e=>e.type==='sleep'&&e.animal==='monkey'));
   const sleepingBranch=(await read()).rainforest.monkey.site;
   await shot('16-monkey-sleeps');
   const before=(await read()).cloud;
   await view('asia');await view('rainforest');
   const end=await read();
   assert.equal(end.rainforest.monkey.site,sleepingBranch);
   assert.equal(end.rainforest.berry.phase,'branch');assert.ok(end.night>.92);
   assert.deepEqual(end.cloud,before);
   assert.ok(end.audio.starts.monkey>0&&end.audio.starts.toucan>0);
   await press('sun');
   await wait(()=>{const s=window.pondInspect();return s.night<.08&&s.rainforest.monkey.sleep<.08&&s.rainforest.sloth.sleep<.08;});
   await tap((await read()).rainforest.leaf.screen);
   await wait(()=>window.pondInspect().rainforest.events.filter(e=>e.type==='sloth-leaf-mouth').length===2);
   await shot('17-sloth-eats-after-dawn');
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
