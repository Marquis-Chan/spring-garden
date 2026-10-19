const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden,Point}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const node=(h,id)=>h.document.querySelector('.creature[data-kind="'+id+'"]');
const position=n=>new Point(+(n.getAttribute('cx')||0),+(n.getAttribute('cy')||0)).matrixTransform(n.getScreenCTM());
const state=(h,id)=>h.G.game.snapshot().actors.find(a=>a.id===id);
test('each habitat has one or two butterflies with distinct wing variants',()=>{
 const h=createGarden(root);for(const scene of ['meadow','asian','asian']){h.G.game.switchScene(scene);h.advance(1400);const bs=h.document.querySelectorAll('.creature[data-kind="butterfly"]');assert.ok(bs.length>=1&&bs.length<=2);assert.equal(new Set(bs.map(b=>b.dataset.variant)).size,bs.length);}
});
test('butterfly hides among flowers, releases its nectar reservation and returns visibly',()=>{
 const h=createGarden(root);let hidden=false,returned=false;for(let i=0;i<500;i++){h.advance(100);const b=state(h,'butterfly');if(b?.hidden){hidden=true;assert.equal(node(h,'butterfly').style.display,'none');assert.equal(b.flower,null)}else if(hidden&&node(h,'butterfly').style.display!=='none'){returned=true;break}}assert.ok(hidden,'flower concealment occurs');assert.ok(returned,'not permanently lost');
});
test('turtle shadow lies at its actual planted toe height',()=>{
 const h=createGarden(root);h.G.game.summon('turtle');h.advance(9000);const n=node(h,'turtle'),a=state(h,'turtle');assert.ok(n);const shadow=position(n.querySelector('.ground-shadow'));assert.ok(Math.abs(shadow.y-(a.y+(158-200)*152/200))<2);
});
test('night owl calls while perched, then takes off after its call',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1600);h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4000);h.G.game.summon('owl');assert.ok(h.audioCalls.some(c=>c.id==='owl'));assert.equal(state(h,'owl').state,'owl-call');const from=state(h,'owl').x;h.advance(3000);assert.equal(state(h,'owl').x,from);h.advance(400);assert.equal(state(h,'owl').state,'flight');
});
test('whole hive releases several separated bees by day and gives sleep feedback at night',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(8500);h.click(h.document.getElementById('forestHive'),1340,454);h.advance(300);const bees=h.document.querySelectorAll('.creature[data-kind="bee"]').filter(b=>b.style.display!=='none');assert.equal(bees.length,3);h.advance(12500);h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200);h.click(h.document.getElementById('forestHive'),1340,454);h.advance(100);assert.equal(h.document.querySelectorAll('[data-effect="sleep-zzz"]').length,1);assert.equal(h.G.game.snapshot().bee,null);
});
test('visitor replacement acknowledges immediately and begins the new arrival within one second',()=>{
 const h=createGarden(root);h.advance(1100);h.G.game.summon('zebra');h.advance(100);assert.ok(state(h,'giraffe')?.state==='switch-out');h.advance(800);assert.ok(state(h,'zebra'),'new visitor appears quickly');h.advance(1200);assert.equal(state(h,'zebra').state,'walk');
});
test('monkey branch fruit and held food are visibly bananas, with a renewable branch fruit',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1400);const food=h.document.querySelector('[data-food="monkey-fruit"]');assert.equal(food.dataset.fruit,'banana');h.G.game.summon('monkey');h.advance(1800);assert.ok(h.document.querySelector('[data-held-food="monkey-fruit"]')?.querySelector('.banana-shape'));h.advance(6000);assert.equal(h.G.game.snapshot().materials.branch,5);assert.equal(food.getAttribute('opacity'),'1');
});
test('toucan shares the forest, both feet touch a dedicated branch, and flight lands on the other branch',()=>{
 const h=createGarden(root);assert.ok(h.G.world.scenes.asian.roster.includes('toucan'));assert.equal(Object.keys(h.G.world.scenes).length,2);h.G.game.switchScene('asian');h.advance(1500);const n=node(h,'toucan');assert.ok(n);const a=state(h,'toucan');assert.ok(a.y<350&&a.x>1100&&a.x<1180);for(const name of ['left-foot','right-foot']){const p=position(n.querySelector('[data-anchor="'+name+'"]'));assert.ok(Math.abs(p.y-318)<.5);assert.ok(p.x>=1090&&p.x<=1200)}h.G.game.summon('toucan');h.advance(7000);for(const name of ['left-foot','right-foot'])assert.ok(Math.abs(position(n.querySelector('[data-anchor="'+name+'"]')).y-278)<.5);assert.ok(state(h,'toucan').x>1220&&state(h,'toucan').x<1290);
});
test('removed tapir is absent from the forest and sleeping toucan responds with zzz',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1500);assert.ok(!node(h,'tapir'));assert.ok(!h.document.querySelector('[data-summon="tapir"]'));h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200);h.click(node(h,'toucan'));h.advance(100);assert.equal(h.document.querySelectorAll('[data-effect="sleep-zzz"]').length,1);
});
test('bear stands on planted hind paws, touches a branch leaf, carries it to its mouth and returns to four feet',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(8500);h.G.game.summon('bear');h.advance(2400);const n=node(h,'bear');assert.ok(n);assert.equal(state(h,'bear').state,'bear-leaf');const paw=n.querySelector('[data-anchor="back-near-foot"]'),p=position(paw);h.advance(800);assert.ok(Math.hypot(position(paw).x-p.x,position(paw).y-p.y)<.5,'hind paw stays planted');h.advance(1600);assert.equal(h.document.getElementById('bearLeaf').getAttribute('opacity'),'0');assert.ok(h.document.querySelector('[data-held-food="bear-leaf"]'));h.advance(5000);assert.equal(h.document.querySelectorAll('[data-held-food="bear-leaf"]').length,0);assert.equal(n.querySelector('.bear-pose').getAttribute('transform'),null);
});
test('changing visitor or scene during bear leaf handling restores the branch for another visit',()=>{
 for(const change of ['visitor','scene']){const h=createGarden(root);h.G.game.switchScene('asian');h.advance(8500);h.G.game.summon('bear');h.advance(2400);for(let i=0;i<120&&!h.document.querySelector('[data-held-food="bear-leaf"]');i++)h.advance(20);assert.equal(h.document.getElementById('bearLeaf').getAttribute('opacity'),'0');assert.ok(h.document.querySelector('[data-held-food="bear-leaf"]'));if(change==='visitor'){h.G.game.summon('tiger');h.advance(1600)}else{h.G.game.switchScene('meadow');h.advance(1500);h.G.game.switchScene('asian');h.advance(1500)}assert.equal(h.document.getElementById('bearLeaf').getAttribute('opacity'),'1');assert.equal(h.document.querySelectorAll('[data-held-food="bear-leaf"]').length,0);}
});
test('monkey and bear interactions bind their verified calls to the correct animal',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1600);h.G.game.summon('monkey');assert.ok(h.audioCalls.some(c=>c.id==='monkey'));h.G.game.switchScene('asian');h.advance(8500);h.G.game.summon('bear');h.advance(2200);assert.ok(h.audioCalls.some(c=>c.id==='bear'));
});
test('sleeping toucan tail keeps its attachment at the same body point and waking restores it',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1500);const n=node(h,'toucan'),tail=n.querySelector('.toucan-tail'),p=new Point(96,126).matrixTransform(tail.getScreenCTM());h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200);assert.ok(n.classList.contains('sleeping'));const q=new Point(96,126).matrixTransform(tail.getScreenCTM());assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<.01,'tail remains attached while it raises');h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200);assert.equal(tail.getAttribute('transform'),null);
});
