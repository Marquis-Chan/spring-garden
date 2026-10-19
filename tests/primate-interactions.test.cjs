const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden,Point}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const actor=(h,id)=>h.document.querySelector('.creature[data-kind="'+id+'"]');
const at=n=>new Point(+n.getAttribute('cx'),+n.getAttribute('cy')).matrixTransform(n.getScreenCTM());
const canopy=()=>{const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1400);return h};
test('monkey skin stays continuous from shoulder to palm through picking, eating and returning',()=>{
 const h=canopy();h.G.game.summon('monkey');let previous=null;
 for(let i=0;i<58;i++){h.advance(80);const n=actor(h,'monkey'),skin=n.querySelector('.monkey-arm').firstElementChild,points=skin.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),palm=at(n.querySelector('[data-anchor="palm"]')),end=new Point(points.at(-2),points.at(-1)).matrixTransform(skin.getScreenCTM());assert.ok(Math.hypot(end.x-palm.x,end.y-palm.y)<.01,'one continuous skin ends at the attached hand');const elbow=n.querySelector('.monkey-elbow');assert.ok(elbow);const p=at(elbow);if(previous)assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y)<10,'elbow must not flip beside the shoulder');previous=p;}
});
test('sloth claws avoid both eyes during the entire leaf-to-mouth and return route',()=>{
 const h=canopy();h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4500);h.G.game.summon('sloth');
 for(let i=0;i<145;i++){h.advance(80);const n=actor(h,'sloth'),hand=n.querySelector('[data-anchor="hand"]'),m=hand.getScreenCTM(),cx=+hand.getAttribute('cx'),cy=+hand.getAttribute('cy'),tl=new Point(cx-12,cy-17).matrixTransform(m),br=new Point(cx+12,cy+5).matrixTransform(m);for(const eye of n.querySelector('.sloth-eyes').querySelectorAll('ellipse')){const p=at(eye);assert.ok(p.x<tl.x-3||p.x>br.x+3||p.y<tl.y-3||p.y>br.y+3,'claws stay clear of the eyes');}if(i===100)assert.equal(h.G.game.snapshot().materials.consumed,1);}
 assert.equal(h.G.game.snapshot().materials.total,5);assert.equal(h.document.querySelectorAll('[data-held-food="sloth-leaf"]').length,0);
});
test('sleeping monkey acknowledges a night click without taking fruit or making a call',()=>{
 const h=canopy();h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4500);h.G.game.summon('monkey');h.advance(400);assert.equal(h.G.game.snapshot().actors.find(a=>a.id==='monkey').state,'monkey-drowsy');assert.ok(actor(h,'monkey').classList.contains('sleeping'));assert.equal(h.audioCalls.filter(c=>c.id==='monkey').length,0);assert.equal(h.G.game.snapshot().materials.branch,5);assert.ok(actor(h,'monkey').querySelector('.head').getAttribute('transform'));h.advance(3000);assert.equal(actor(h,'monkey').querySelector('.head').getAttribute('transform'),null);
});
test('one monkey fruit regrows after eating and supports several complete harvests',()=>{
 const h=canopy();for(let round=0;round<3;round++){h.G.game.summon('monkey');h.advance(3200);assert.equal(h.G.game.snapshot().materials.consumed,1);assert.equal(h.document.querySelector('[data-food="monkey-fruit"]').getAttribute('opacity'),'0');h.advance(3200);assert.equal(h.G.game.snapshot().materials.branch,5);assert.equal(h.document.querySelectorAll('[data-food="monkey-fruit"]').length,1);assert.equal(h.document.querySelectorAll('[data-held-food="monkey-fruit"]').length,0);assert.equal(h.document.querySelector('[data-food="monkey-fruit"]').getAttribute('opacity'),'1');}
});
test('fruit regrowth survives a scene switch without duplicated fruit or an empty picking action',()=>{
 const h=canopy();h.G.game.summon('monkey');h.advance(3200);h.G.game.switchScene('meadow');h.advance(3500);h.G.game.switchScene('asian');h.advance(1800);assert.equal(h.document.querySelector('[data-food="monkey-fruit"]').getAttribute('opacity'),'1');assert.equal(h.document.querySelectorAll('[data-food="monkey-fruit"]').length,1);h.G.game.summon('monkey');h.advance(3200);assert.equal(h.G.game.snapshot().materials.consumed,1);
});
