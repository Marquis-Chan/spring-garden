const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden,Point}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const lion=h=>h.document.querySelector('.creature[data-kind="lion"]');
const state=h=>h.G.game.snapshot().actors.find(a=>a.id==='lion');
const point=(n,x,y)=>new Point(x,y).matrixTransform(n.getScreenCTM());
function setup(){const h=createGarden(root);h.advance(1500);h.G.game.summon('lion');h.advance(2100);return h}
test('male lion replaces tapir, belongs to the plain and has recognizable connected mane and tail tuft',()=>{
 const h=setup();assert.ok(h.G.world.scenes.meadow.roster.includes('lion'));for(const s of Object.values(h.G.world.scenes))assert.ok(!s.roster.includes('tapir'));assert.equal(h.G.forestArt.animal('tapir'),'');const n=lion(h);assert.ok(n);assert.ok(n.querySelector('.lion-head').querySelector('.lion-mane'));assert.ok(n.querySelector('.lion-tail').querySelector('.lion-tuft'));assert.equal(n.querySelectorAll('.leg').length,4);assert.ok(!h.document.querySelector('[data-summon="tapir"]'));assert.ok(h.document.querySelector('[data-summon="lion"]'));
});
test('roaring opens the connected jaw, keeps paws grounded, plays the lion recording once, then restores pose',()=>{
 const h=setup(),n=lion(h);assert.equal(state(h).state,'lion-roar');const head=n.querySelector('.head'),tail=n.querySelector('.lion-tail'),rootPoint=point(head,133,114),tailRoot=point(tail,39,119),paw=n.querySelector('.leg.near.leg-front').querySelector('.foot'),pawPoint=point(paw,0,0);h.advance(650);assert.ok(h.audioCalls.some(c=>c.id==='lion'));assert.ok(+n.querySelector('.lion-mouth').getAttribute('opacity')>.5);assert.match(n.querySelector('.lion-jaw').getAttribute('transform'),/rotate/);for(let i=0;i<100;i++){h.advance(20);for(const [node,p,x,y]of [[head,rootPoint,133,114],[tail,tailRoot,39,119],[paw,pawPoint,0,0]])assert.ok(Math.hypot(point(node,x,y).x-p.x,point(node,x,y).y-p.y)<.01,'attachment stays fixed');}h.advance(1400);assert.equal(state(h).state,'awake');assert.equal(head.getAttribute('transform'),null);assert.equal(n.querySelector('.lion-jaw').getAttribute('transform'),null);assert.equal(n.querySelector('.lion-mouth').getAttribute('opacity'),'0');assert.equal(h.audioCalls.filter(c=>c.id==='lion').length,1);
});
test('repeated touches do not overlap roars; leaving the scene cancels an unfinished roar',()=>{
 const h=setup(),n=lion(h);h.advance(650);h.click(n,960,480);h.advance(1000);assert.equal(h.audioCalls.filter(c=>c.id==='lion').length,1);h.advance(3100);h.click(n,960,480);h.advance(650);assert.equal(h.audioCalls.filter(c=>c.id==='lion').length,2);h.advance(4000);h.click(n,960,480);h.G.game.switchScene('canopy');h.advance(4000);assert.equal(h.G.game.snapshot().scene,'canopy');assert.ok(!lion(h));assert.equal(h.audioCalls.filter(c=>c.id==='lion').length,2);assert.ok(!h.document.querySelector('.creature[data-kind="tapir"]'));
});
