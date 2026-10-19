const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const animal=(h,id)=>h.document.querySelector('.creature[data-kind="'+id+'"]');
const puffs=h=>h.document.querySelectorAll('[data-effect="sleep-zzz"]');
test('daytime sleeping owl and resting sloth respond with a drifting sleep symbol',()=>{
 const h=createGarden(root);for(const [scene,id] of [['asian','owl'],['asian','sloth']]){h.G.game.switchScene(scene);h.advance(1400);h.click(animal(h,id));h.advance(100);assert.equal(puffs(h).length,1,id);const first=puffs(h)[0].firstElementChild.getAttribute('transform');h.advance(700);assert.notEqual(puffs(h)[0].firstElementChild.getAttribute('transform'),first,'symbols rise');h.advance(1500);assert.equal(puffs(h).length,0,'symbols fade away');}
});
test('every night resting species uses the same sleep response and an awake owl does not',()=>{
 const h=createGarden(root);h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4500);
 for(const [scene,ids] of [['meadow',['bird','butterfly']],['asian',['monkey']],['asian',['bee','woodpecker','peacock']]]){h.G.game.switchScene(scene);h.advance(1400);for(const id of ids){if(id==='peacock'){h.G.game.summon(id);h.advance(20000)}const n=animal(h,id);assert.ok(n);h.click(n);h.advance(100);assert.equal(puffs(h).length,1,id+' sleep response');h.advance(2300);}}
 h.click(animal(h,'owl'));h.advance(100);assert.equal(puffs(h).length,0,'night owl is awake');
});
test('rapid clicks stay bounded, changing scene clears symbols, and awake animals get no sleep symbol',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1400);for(let i=0;i<50;i++)h.click(animal(h,'sloth'));h.advance(100);assert.equal(puffs(h).length,1);h.G.game.switchScene('meadow');h.advance(1400);assert.equal(puffs(h).length,0);h.G.game.summon('cat');h.advance(8000);h.click(animal(h,'cat'));h.advance(100);assert.equal(puffs(h).length,0);
});
