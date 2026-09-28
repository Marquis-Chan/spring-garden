const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/macqi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1600,height:900},offline:true});const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../春日小花园.html')).href);
 const out=path.resolve(__dirname,'../verification');fs.mkdirSync(out,{recursive:true});await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'preview.png')});
 await page.locator('#soundBtn').click();await page.waitForFunction(()=>SpringGarden.audio.loaded===12);
 assert.equal(await page.evaluate(()=>SpringGarden.audio.muted),false,'first sound click enables sound');
 await page.evaluate(()=>{window.frameStats=[];let prior=performance.now();function tick(now){window.frameStats.push(now-prior);if(window.frameStats.length>12000)window.frameStats.shift();prior=now;requestAnimationFrame(tick)}requestAnimationFrame(tick)});
 const levels=await page.evaluate(()=>Object.entries(SpringGarden.audioData).map(([id,asset])=>{
   const b=SpringGarden.audio.buffers.get(id),c=b.getChannelData(0),from=Math.floor(asset.offset*b.sampleRate),to=Math.min(c.length,Math.floor((asset.offset+asset.duration)*b.sampleRate));let sum=0,peak=0;for(let i=from;i<to;i++){sum+=c[i]*c[i];peak=Math.max(peak,Math.abs(c[i]))}return{id,decodedSeconds:b.duration,clipSeconds:asset.duration,peak,rms:Math.sqrt(sum/(to-from))};
 }));
 for(const sound of levels)assert.ok(sound.peak>.005,sound.id+' clip has recorded signal');
 const ids=['cat','dog','bird','elephant','giraffe','monkey','peacock','tiger','zebra','hippo','rhino','penguin'];
 const individuallyPlayed=[];for(const id of ids){await page.evaluate(()=>SpringGarden.audio.stopAll());await page.locator('[data-summon="'+id+'"]').click();await page.waitForTimeout(1100);const actual=await page.evaluate(()=>SpringGarden.audio.lastPlayed);assert.equal(actual,id,'actual portrait plays '+id);individuallyPlayed.push(actual);await page.waitForTimeout(2200)}
 const played=[],max={particles:0,specials:0,grownFlowers:0,guests:0,voices:0};const start=Date.now(),seconds=120;let i=0,lastCall=-1;
 while(Date.now()-start<seconds*1000){
   const elapsed=Date.now()-start,index=Math.min(ids.length-1,Math.floor(elapsed/6500));
   if(index!==lastCall){await page.mouse.up();await page.locator('[data-summon="'+ids[index]+'"]').click();await page.waitForTimeout(450);played.push(await page.evaluate(()=>SpringGarden.audio.lastPlayed));lastCall=index}
   const x=350+(i*47)%760,y=530+(i*31)%250;await page.mouse.move(x,y);if(i%12===0)await page.mouse.down();if(i%12===6)await page.mouse.up();if(i%8===0)await page.mouse.click(x,y);
   const s=await page.evaluate(()=>({...SpringGarden.game.snapshot(),voices:SpringGarden.audio.sources.size}));
   for(const key of ['particles','specials','grownFlowers','voices'])max[key]=Math.max(max[key],s[key]);max.guests=Math.max(max.guests,s.guests.length);
   assert.ok(s.particles<=120&&s.specials<=12&&s.grownFlowers<=40&&s.guests.length<=2&&s.voices<=2,'bounded scene during stress');
   i++;await page.waitForTimeout(100);
 }
 await page.mouse.up();await page.locator('#soundBtn').click();assert.equal(await page.evaluate(()=>SpringGarden.audio.sources.size),0);
 await page.waitForTimeout(3500);assert.equal(await page.evaluate(()=>SpringGarden.audio.sources.size),0,'muting clears voices without later replay');
 const stats=await page.evaluate(()=>{const times=frameStats.slice(30).sort((a,b)=>a-b);return{medianFrameMs:times[Math.floor(times.length*.5)],p95FrameMs:times[Math.floor(times.length*.95)],frames:times.length,state:SpringGarden.game.snapshot(),audioFailures:SpringGarden.audio.failures}});
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.equal(stats.audioFailures.length,0);
 const report={elapsedSeconds:(Date.now()-start)/1000,pointerOperations:i,max,individuallyPlayed,played,levels,stats,errors,requests};fs.writeFileSync(path.join(out,'soak-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({elapsedSeconds:report.elapsedSeconds,pointerOperations:i,max,individuallyPlayed,stats},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
