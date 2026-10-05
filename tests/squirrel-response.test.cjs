const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden,Point}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
function setup(){const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1700);return h}
const squirrel=h=>h.document.querySelector('.creature[data-kind="squirrel"]');
const state=h=>h.G.game.snapshot().actors.find(a=>a.id==='squirrel').state;
const point=(n,x,y)=>new Point(x,y).matrixTransform(n.getScreenCTM());
test('hovering a squirrel never spends its one nut before the child clicks',()=>{
 const h=setup(),n=squirrel(h);h.svg.dispatch('pointermove',{target:n,clientX:1260,clientY:380,pointerId:1});h.advance(5100);assert.equal(h.document.getElementById('squirrelBranchNut').getAttribute('opacity'),'1');assert.equal(state(h),'awake');h.click(n,1260,380);assert.equal(state(h),'squirrel-food');h.advance(5100);assert.equal(h.document.getElementById('squirrelBranchNut').getAttribute('opacity'),'0');
});
test('body and portrait clicks after eating repeatedly produce a visible face scratch with attached tail',()=>{
 const h=setup(),n=squirrel(h);h.click(n,1260,380);h.advance(5200);
 for(const target of [n,h.document.querySelector('[data-summon="squirrel"]'),n]){const arm=n.querySelector('.squirrel-arm'),rest=arm.innerHTML,tail=n.querySelector('.squirrel-tail'),tip=point(tail,49,52),rootPoint=point(tail,79,148);h.click(target,target===n?1260:1080,target===n?380:853);assert.equal(state(h),'squirrel-scratch');h.advance(600);assert.notEqual(arm.innerHTML,rest,'forepaw actively scratches');assert.ok(Math.hypot(point(tail,49,52).x-tip.x,point(tail,49,52).y-tip.y)>10,'tail has a visible sweep');assert.ok(Math.hypot(point(tail,79,148).x-rootPoint.x,point(tail,79,148).y-rootPoint.y)<.01,'tail stays joined');h.advance(2400);assert.equal(state(h),'awake');assert.equal(arm.innerHTML,rest,'forepaw returns');assert.equal(h.document.getElementById('squirrelBranchNut').getAttribute('opacity'),'0','no invisible picking or duplicated food');}
});
test('clicking during a feeding action acknowledges touch without queuing or restarting feeding',()=>{
 const h=setup(),n=squirrel(h);h.click(n,1260,380);h.advance(1200);const tail=n.querySelector('.squirrel-tail'),tip=point(tail,49,52);h.click(n,1260,380);h.advance(120);assert.equal(state(h),'squirrel-food');assert.ok(Math.hypot(point(tail,49,52).x-tip.x,point(tail,49,52).y-tip.y)>4,'busy click moves the tail promptly');h.advance(4300);assert.equal(state(h),'awake');assert.equal(h.document.getElementById('squirrelBranchNut').getAttribute('opacity'),'0');assert.equal(h.document.querySelectorAll('[data-held-food="nut"]').length,0);
});
test('clicking the squirrel forepaw is treated as an animal touch, and the scratch avoids the eye',()=>{
 const h=setup(),n=squirrel(h);h.G.game.summon('squirrel');h.advance(5200);h.click(n.querySelector('.squirrel-arm'),1260,380);assert.equal(state(h),'squirrel-scratch');for(let i=0;i<130;i++){h.advance(20);const palm=n.querySelector('[data-anchor="palm"]'),eye=point(n.querySelector('.head'),134,99),p=point(palm,+palm.getAttribute('cx'),+palm.getAttribute('cy'));assert.ok(Math.hypot(p.x-eye.x,p.y-eye.y)>6,'paw remains below the eye')}
});
