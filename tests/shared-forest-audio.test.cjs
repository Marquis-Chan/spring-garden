const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createGarden,Point}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const credits=()=>['credits.json','forest-credits.json'].flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'assets',f),'utf8')));
const state=(h,id)=>h.G.game.snapshot().actors.find(a=>a.id===id);
const node=(h,id)=>h.document.querySelector('.creature[data-kind="'+id+'"]');
const forest=()=>{const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1600);return h};

test('only meadow and one shared forest exist, with all 23 animal types retained',()=>{
 const h=createGarden(root),s=h.G.world.scenes;assert.deepEqual(Object.keys(s).sort(),['asian','meadow']);assert.equal(new Set(Object.values(s).flatMap(c=>c.roster)).size,23);
 h.G.game.switchScene('asian');h.advance(1600);for(const id of ['sloth','monkey','toucan','owl','squirrel','woodpecker','bee','butterfly','fish'])assert.ok(node(h,id),id+' lives in the shared forest');assert.equal(h.document.querySelectorAll('[data-to="canopy"]').length,0);
});
test('tiger explicit interaction plays its real recording once without overlapping paw actions',()=>{
 const h=forest();h.G.game.summon('tiger');h.advance(6000);h.audioCalls.length=0;h.click(node(h,'tiger'),715,550);assert.equal(state(h,'tiger').state,'paw-leaf');assert.equal(h.audioCalls.filter(c=>c.id==='tiger').length,1);assert.equal(h.audioCalls.find(c=>c.id==='tiger').opts.exclusive,true);h.click(node(h,'tiger'),715,550);assert.equal(h.audioCalls.filter(c=>c.id==='tiger').length,1);
});
test('every recording response reaches the cat reference duration with real non-silent calls',()=>{
 const all=credits(),minimum=all.find(c=>c.id==='cat').duration;assert.ok(minimum>=1.95);for(const c of all){assert.ok(c.duration>=minimum-.001,c.id+' response too short: '+c.duration);const b=fs.readFileSync(path.join(root,'assets',c.file));assert.equal(b.toString('ascii',8,12),'WAVE');const samples=[];for(let i=44;i+1<b.length;i+=2)samples.push(b.readInt16LE(i)/32768);assert.ok(samples.some(v=>Math.abs(v)>.04),c.id+' is not silence');if(c.responseSequence){assert.ok(c.responseSequence.repetitions>=2);assert.ok(c.responseSequence.callSeconds*c.responseSequence.repetitions>=minimum-.001,c.id+' padded instead of enough call material');}}
});
test('dog has additional audible gain and every processed recording retains peak headroom',()=>{
 const all=credits(),dog=all.find(c=>c.id==='dog');assert.ok(dog.activeDbfs>-16,'dog is still too quiet');for(const c of all)assert.ok(c.peakDbfs<=-1.95,c.id+' lacks peak headroom');
});
test('natural cat motion does not interrupt foreground audio, explicit touch takes priority',()=>{
 const h=createGarden(root);h.G.game.summon('cat',false);h.advance(1600);assert.equal(h.audioCalls.find(c=>c.id==='cat').opts.exclusive,false);h.advance(4000);h.audioCalls.length=0;h.click(node(h,'cat'),490,640);assert.equal(h.audioCalls.find(c=>c.id==='cat').opts.exclusive,true);
});
test('forest fish stays inside the real water clip and a pool click requests its swimming action',()=>{
 const h=forest(),n=node(h,'fish');assert.ok(n);assert.equal(n.parentNode.getAttribute('clip-path'),'url(#waterAnimalClip)');assert.equal(h.document.querySelector('#waterAnimalClip').querySelector('use').getAttribute('href'),'#forestActualWater');h.click(h.document.querySelector('[data-prop="stream"]'),1200,650);assert.equal(state(h,'fish').state,'fish');h.advance(1000);const mouth=n.querySelector('[data-anchor="mouth"]'),p=new Point(180,117).matrixTransform(mouth.getScreenCTM());assert.ok(p.x>1100&&p.x<1500&&p.y>590&&p.y<700);h.advance(4000);assert.equal(n.querySelector('.fish-pose').getAttribute('transform'),null);
});
test('shared forest foliage and bananas survive a meadow round trip without duplicate food',()=>{
 const h=forest();assert.equal(h.G.game.snapshot().materials.total,5);h.G.game.summon('monkey');h.advance(3200);assert.ok(h.G.game.snapshot().materials.consumed>=1);h.G.game.switchScene('meadow');h.advance(3500);h.G.game.switchScene('asian');h.advance(1800);for(const food of ['monkey-fruit','sloth-leaf'])assert.equal(h.document.querySelectorAll('[data-food="'+food+'"]').length,1);assert.equal(h.document.querySelector('[data-food="monkey-fruit"]').getAttribute('opacity'),'1');assert.ok(node(h,'monkey')&&node(h,'sloth'));
});
test('sleeping animals still acknowledge touch while elephant water effects are active',()=>{
 const h=forest();h.advance(3300);assert.ok(h.G.game.snapshot().water);h.click(node(h,'sloth'),590,360);assert.ok(h.document.querySelector('[data-effect="sleep-zzz"]'));assert.notEqual(state(h,'sloth').state,'sloth');assert.equal(h.G.game.snapshot().materials.branch,5);
});
test('touching the banana or sloth leaf branch invokes its animal and preserves day and night rules',()=>{
 const h=forest();h.click(h.document.getElementById('monkeyFruitBranch'),402,516);assert.equal(state(h,'monkey').state,'monkey');h.advance(3200);assert.equal(h.document.querySelector('[data-food="monkey-fruit"]').getAttribute('opacity'),'0');h.click(h.document.getElementById('slothLeafBranch'),686,276);assert.ok(h.document.querySelector('[data-effect="sleep-zzz"]'));h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(5200);h.click(h.document.getElementById('slothLeafBranch'),686,276);assert.equal(state(h,'sloth').state,'sloth');
});
