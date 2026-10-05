const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden,Point}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const node=h=>h.document.querySelector('.creature[data-kind="giraffe"]');
const state=h=>h.G.game.snapshot().actors.find(a=>a.id==='giraffe');
const leaf=h=>h.document.getElementById('giraffeEdibleLeaf');
const setup=()=>{const h=createGarden(root);h.advance(8500);return h};
test('arrival and hovering preserve the leaf until the child asks the giraffe to browse',()=>{
 const h=setup();assert.equal(h.G.game.snapshot().materials.branch,1);assert.equal(leaf(h).getAttribute('opacity'),'1');h.svg.dispatch('pointermove',{target:node(h),clientX:720,clientY:420});h.advance(1000);assert.equal(h.G.game.snapshot().materials.branch,1);h.click(node(h),720,420);assert.equal(state(h).state,'browse');h.advance(1600);assert.equal(h.G.game.snapshot().materials.held,1);const mouth=node(h).querySelector('[data-anchor="mouth"]'),p=new Point(169,62).matrixTransform(mouth.getScreenCTM());assert.ok(Math.hypot(p.x-838,p.y-361)<8,'mouth actually reaches leaf');assert.equal(leaf(h).getAttribute('opacity'),'0');assert.equal(h.document.getElementById('giraffeLeafBranch').getAttribute('opacity'),null,'branch remains visible');
});
test('three complete meals regrow one visible leaf and preserve planted body and connected resting pose',()=>{
 const h=setup(),n=node(h),head=n.querySelector('.head'),neck=n.querySelector('.browsing-neck'),rest=neck.innerHTML,x=state(h).x;
 for(const target of [n,h.document.querySelector('[data-summon="giraffe"]'),h.document.getElementById('giraffeLeafBranch')]){h.click(target,720,420);assert.equal(state(h).state,'browse');h.advance(3000);assert.equal(h.G.game.snapshot().materials.consumed,1);assert.equal(leaf(h).getAttribute('opacity'),'0');assert.equal(h.document.querySelectorAll('[data-held-food="giraffe-leaf"]').length,0);h.advance(2400);assert.equal(h.G.game.snapshot().materials.total,1);assert.equal(h.G.game.snapshot().materials.branch,1);assert.equal(h.document.querySelectorAll('#giraffeEdibleLeaf').length,1);assert.equal(leaf(h).getAttribute('opacity'),'1');assert.equal(head.getAttribute('transform'),null);assert.equal(neck.innerHTML,rest);assert.equal(state(h).x,x,'no retreat while eating');}
});
test('clicking the branch summons a missing giraffe and starts feeding after arrival',()=>{
 const h=setup();h.G.game.summon('zebra');h.advance(2500);assert.ok(!node(h));h.click(h.document.getElementById('giraffeLeafBranch'),838,361);h.advance(2400);assert.equal(state(h).state,'browse');h.advance(2600);assert.equal(h.G.game.snapshot().materials.consumed,1);
});
test('leaf regrowth survives leaving the page and interrupting a held leaf restores it without duplication',()=>{
 for(const age of [1700,3000]){const h=setup();h.click(node(h),720,420);h.advance(age);assert.equal(leaf(h).getAttribute('opacity'),'0');h.G.game.switchScene('asian');h.advance(3400);h.G.game.switchScene('meadow');h.advance(1800);assert.equal(h.G.game.snapshot().materials.total,1);assert.equal(h.G.game.snapshot().materials.branch,1);assert.equal(leaf(h).getAttribute('opacity'),'1');assert.equal(h.document.querySelectorAll('[data-held-food="giraffe-leaf"]').length,0);h.click(node(h),720,420);assert.equal(state(h).state,'browse');}
});
test('clicking the newly grown leaf interrupts a short look rather than swallowing the click in cooldown',()=>{
 const h=setup();h.click(node(h),720,420);h.advance(4500);h.click(node(h),720,420);assert.equal(state(h).state,'giraffe-look');h.advance(650);assert.equal(h.G.game.snapshot().materials.branch,1);h.click(leaf(h),838,361);assert.equal(state(h).state,'browse');h.advance(1700);assert.equal(h.G.game.snapshot().materials.held,1);
});
