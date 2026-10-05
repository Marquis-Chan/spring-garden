const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const animal=(h,id)=>h.document.querySelector('.creature[data-kind="'+id+'"]');
const state=(h,id)=>h.G.game.snapshot().actors.find(a=>a.id===id)?.state;
function forest(scene='canopy',night=false){const h=createGarden(root);h.G.game.switchScene(scene);h.advance(1500);if(night){h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200)}return h}
test('tree sloth preserves its leaf during spontaneous idle motion and can eat three regrown leaves',()=>{
 const h=forest('canopy',true);h.advance(20000);assert.equal(h.G.game.snapshot().materials.branch,2,'background motion does not consume the interactive leaf');
 for(let round=0;round<3;round++){h.G.game.summon('sloth');assert.equal(state(h,'sloth'),'sloth');h.advance(8100);assert.equal(h.G.game.snapshot().materials.consumed,1);assert.equal(h.document.querySelector('[data-food="sloth-leaf"]').getAttribute('opacity'),'0');h.advance(4500);assert.equal(h.G.game.snapshot().materials.branch,2);assert.equal(h.document.querySelector('[data-food="sloth-leaf"]').getAttribute('opacity'),'1');assert.equal(h.document.querySelectorAll('[data-held-food="sloth-leaf"]').length,0);assert.equal(h.document.querySelectorAll('[data-food="sloth-leaf"]').length,1);}
});
test('sloth leaf regrowth survives switching pages after eating and held leaves return on interruption',()=>{
 for(const age of [4000,8100]){const h=forest('canopy',true);h.G.game.summon('sloth');h.advance(age);assert.equal(h.document.querySelector('[data-food="sloth-leaf"]').getAttribute('opacity'),'0');h.G.game.switchScene('asian');h.advance(5500);h.G.game.switchScene('canopy');h.advance(1800);assert.equal(h.G.game.snapshot().materials.branch,2);assert.equal(h.document.querySelector('[data-food="sloth-leaf"]').getAttribute('opacity'),'1');assert.equal(h.document.querySelectorAll('[data-held-food="sloth-leaf"]').length,0);h.G.game.summon('sloth');assert.equal(state(h,'sloth'),'sloth');}
});
test('a touch just before an action ends cannot consume the next accepted-action cooldown',()=>{
 const h=forest('asian');h.G.game.summon('woodpecker');h.advance(1250);h.click(animal(h,'woodpecker'),174,420);h.advance(300);assert.equal(state(h,'woodpecker'),'awake');h.click(animal(h,'woodpecker'),174,420);assert.equal(state(h,'woodpecker'),'peck');
});
test('a fresh banana interrupts grooming and fresh bear foliage interrupts sniffing immediately',()=>{
 const h=forest();h.G.game.summon('monkey');h.advance(4700);h.G.game.summon('monkey');assert.equal(state(h,'monkey'),'monkey-groom');h.advance(1400);assert.equal(h.document.querySelector('[data-food="monkey-fruit"]').getAttribute('opacity'),'1');h.G.game.summon('monkey');assert.equal(state(h,'monkey'),'monkey');
 const b=forest('asian');b.G.game.summon('bear');b.advance(8500);b.G.game.summon('bear');assert.equal(state(b,'bear'),'sniff');b.advance(850);assert.equal(b.document.getElementById('bearLeaf').getAttribute('opacity'),'1');b.G.game.summon('bear');assert.equal(state(b,'bear'),'bear-leaf');
});
test('a sloth resting by day keeps its regrown leaf and responds with sleep symbols instead of eating',()=>{
 const h=forest('canopy',true);h.G.game.summon('sloth');h.advance(13000);h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200);h.click(animal(h,'sloth'),590,370);assert.ok(h.document.querySelector('[data-effect="sleep-zzz"]'));assert.equal(h.G.game.snapshot().materials.branch,2);assert.notEqual(state(h,'sloth'),'sloth');
});
test('when reachable flowers are occupied elephant sprays into the stream instead of dropping the interaction',()=>{
 const h=createGarden(root),flowers=h.G.world.scenes.asian.flowers;h.G.world.scenes.asian.flowers=[flowers[4],...flowers.slice(0,4)];h.G.game.switchScene('asian');h.advance(2800);assert.ok(h.G.game.snapshot().actors.some(a=>a.id==='butterfly'&&a.flower==='f0'));assert.equal(h.G.game.snapshot().water,'raise');h.advance(1100);assert.equal(h.G.game.snapshot().water,'spray');assert.ok(h.document.getElementById('storyEffects').querySelectorAll('ellipse').some(n=>n.getAttribute('stroke')==='#8ac3c1'));h.advance(800);assert.ok(h.document.getElementById('storyEffects').querySelectorAll('ellipse').some(n=>n.getAttribute('stroke')==='#eef5e6'&&Math.abs(Number(n.getAttribute('cx'))-1302.4)<1&&Math.abs(Number(n.getAttribute('cy'))-677.7)<1),'water impacts the stream surface');h.advance(3400);assert.equal(h.G.game.snapshot().water,null);
});
