const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/macqi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const engine=process.argv.includes('--edge')?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':'C:/Program Files/Google/Chrome/Application/chrome.exe';
 const browser=await chromium.launch({executablePath:engine,headless:true,args:['--allow-file-access-from-files']});
 const context=await browser.newContext({viewport:{width:1440,height:900},offline:true});const page=await context.newPage();page.setDefaultTimeout(5000);const errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../春日小花园.html')).href);
 const results=[];async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name)}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message)}}
 await check('child screen has no visible text and works offline',async()=>{assert.equal((await page.locator('body').innerText()).trim(),'');assert.equal(network.length,0)});
 await check('all fifteen animal pictures can bring their friends immediately',async()=>{
   assert.equal(await page.locator('[data-summon]').count(),15);
   const ids=['cat','dog','bird','butterfly','elephant','giraffe','monkey','peacock','tiger','zebra','hippo','rhino','turtle','fish','penguin'];
   for(const id of ids){await page.locator(`[data-summon="${id}"]`).click();await page.waitForTimeout(120);assert.ok(await page.locator(`#animals .creature[data-kind="${id}"]`).count(),id+' must appear');}
 });
 await check('animal click performs a dedicated reaction without word popups',async()=>{
   await page.locator('[data-summon="dog"]').click();await page.waitForTimeout(1800);const dog=page.locator('#animals .creature[data-kind="dog"]');const before=await page.evaluate(()=>window.SpringGarden.game.snapshot().interactions);const box=await dog.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);assert.match(await dog.getAttribute('class'),/reacting/);assert.ok(await page.evaluate(()=>window.SpringGarden.game.snapshot().interactions)>before);assert.equal((await page.locator('body').innerText()).trim(),'');
 });
 await check('fruit and newly planted flowers keep their position during animation',async()=>{
   const melon=page.locator('[data-fruit="watermelon"]');await page.waitForTimeout(1600);const before=await melon.boundingBox();await page.mouse.click(before.x+before.width/2,before.y+before.height/2);await page.waitForTimeout(350);const after=await melon.boundingBox();assert.ok(Math.abs(before.x-after.x)<35&&Math.abs(before.y-after.y)<30);
   const sceneBox=await page.locator('#scene').boundingBox();await page.mouse.click(sceneBox.x+sceneBox.width*.32,sceneBox.y+sceneBox.height*.78);await page.waitForTimeout(100);const flowers=page.locator('#grownFlowers > g');assert.ok(await flowers.count()>0);const planted=await flowers.last().boundingBox();assert.ok(planted.x>sceneBox.width*.2&&planted.y>sceneBox.height*.5);
 });
 await check('moving and holding the mouse produces feedback with bounded object counts',async()=>{
   await page.mouse.move(520,630);await page.mouse.down();for(let i=0;i<140;i++)await page.mouse.move(300+(i%12)*55,630+(i%4)*16);await page.mouse.up();
   const s=await page.evaluate(()=>window.SpringGarden.game.snapshot());assert.ok(s.particles<=120);assert.ok(s.grownFlowers<=40);assert.ok(s.interactions>0);assert.ok(await page.locator('#cursor.active').count());
 });
 await check('banana fruit reliably summons a monkey and watermelon opens',async()=>{
   await page.locator('[data-fruit="banana"]').click();assert.equal(await page.locator('#animals .creature[data-kind="monkey"]').count(),1);
   await page.locator('[data-fruit="watermelon"]').click();assert.match(await page.locator('[data-fruit="watermelon"]').getAttribute('class'),/touched/);
 });
 await check('repeated fruit clicks get a full fresh response',async()=>{
   await page.waitForTimeout(1700);const melon=page.locator('[data-fruit="watermelon"]');await melon.click();await page.waitForTimeout(1600);await melon.click();await page.waitForTimeout(350);assert.match(await melon.getAttribute('class'),/touched/);
 });
 await check('real recordings decode and silent animals have no fabricated calls',async()=>{
   await page.waitForFunction(()=>window.SpringGarden?.audio?.loaded>=12,{},{timeout:15000});
   const s=await page.evaluate(()=>({count:window.SpringGarden.audio.loaded,fail:window.SpringGarden.audio.failures,ids:Object.keys(window.SpringGarden.audioData)}));
   assert.equal(s.fail.length,0);for(const id of ['cat','dog','bird','elephant','giraffe','monkey','peacock','tiger','zebra','hippo','rhino','penguin'])assert.ok(s.ids.includes(id));
   for(const id of ['fish','butterfly','turtle'])assert.ok(!s.ids.includes(id));
 });
 await check('parent controls pause and resume without adding text',async()=>{
   await page.keyboard.press('Control+Shift+P');assert.equal(await page.locator('#parent').isVisible(),true);assert.equal(await page.evaluate(()=>window.SpringGarden.game.snapshot().paused),true);
   await page.locator('#resume').click();assert.equal(await page.evaluate(()=>window.SpringGarden.game.snapshot().paused),false);assert.equal((await page.locator('body').innerText()).trim(),'');
 });
 await check('stopping and restarting one recording keeps ownership of its new voice',async()=>{
   const state=await page.evaluate(async()=>{const a=SpringGarden.audio;a.setMuted(false);a.stopAll();await a.play('cat');a.stopAll();await a.play('cat');await new Promise(resolve=>setTimeout(resolve,100));const result={voices:a.sources.size,active:a.gate.active};a.setMuted(true);return result});assert.equal(state.voices,1);assert.equal(state.active,1);
 });
 await check('parent pause freezes fruit animations as well as the world clock',async()=>{
   await page.locator('[data-fruit="watermelon"]').click();await page.keyboard.press('Control+Shift+P');await page.waitForTimeout(50);
   const before=await page.evaluate(()=>({clock:SpringGarden.game.snapshot().clock,animations:document.querySelector('[data-fruit="watermelon"] .fruit-art').getAnimations().map(a=>a.currentTime)}));await page.waitForTimeout(250);
   const after=await page.evaluate(()=>({clock:SpringGarden.game.snapshot().clock,animations:document.querySelector('[data-fruit="watermelon"] .fruit-art').getAnimations().map(a=>a.currentTime)}));assert.deepEqual(after,before);await page.locator('#resume').click();
 });
 await check('initial scene is spring day meadow with independent future theme axes',async()=>{
   const state=await page.evaluate(()=>window.SpringGarden.game.snapshot().environment);assert.equal(state.time,'day');assert.equal(state.season,'spring');assert.equal(state.scene,'meadow-sunny');
 });
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(200);
 const out=path.resolve(__dirname,'../verification');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,process.argv.includes('--edge')?'edge.png':'garden.png')});
 await check('portrait windows keep all animal choices inside the scene',async()=>{
   await page.setViewportSize({width:700,height:1000});await page.waitForTimeout(100);
   for(const el of await page.locator('[data-summon]').all()){const b=await el.boundingBox();assert.ok(b&&b.x>=-2&&b.y>=0&&b.x+b.width<=702&&b.y+b.height<=1002)}
 });
 await check('no JavaScript errors or external requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(network,[])});
 fs.writeFileSync(path.join(out,process.argv.includes('--edge')?'edge-results.json':'chrome-results.json'),JSON.stringify({engine,results,errors,network},null,2));
 await browser.close();if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
