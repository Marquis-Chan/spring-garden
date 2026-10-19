const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGarden,Point}=require('./engine-harness.cjs'),root=path.join(__dirname,'..');
const animal=(h,id)=>h.G.game.snapshot().actors.find(a=>a.id===id);
const node=(h,id)=>h.document.querySelector('.creature[data-kind="'+id+'"]');
const screenPoint=n=>new Point(+(n.getAttribute('cx')||0),+(n.getAttribute('cy')||0)).matrixTransform(n.getScreenCTM());

test('dog fetch finishes within the visible garden with nested SVG viewport coordinates',()=>{
 const h=createGarden(root);h.G.game.summon('dog');
 for(let i=0;i<130;i++){h.advance(100);const a=animal(h,'dog');assert.ok(a&&a.x>140&&a.x<1400,'dog remains reachable: '+a?.x)}
 assert.equal(h.G.game.snapshot().fetch,'rest');
});
test('water droplets start beside the raised trunk in scene coordinates and hit a flower',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(4900);
 const drops=h.document.getElementById('storyEffects').querySelectorAll('ellipse').filter(n=>n.getAttribute('stroke')==='#8ac3c1');
 assert.ok(drops.length>3,'visible spray exists');
 for(const n of drops){assert.ok(+n.getAttribute('cx')>1000&&+n.getAttribute('cx')<1500,'water stays by elephant/flowers');assert.ok(+n.getAttribute('cy')>250&&+n.getAttribute('cy')<760,'water stays in picture')}
});
test('monkey actually takes the branch fruit under nested SVG coordinates',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1600);h.G.game.summon('monkey');h.advance(5100);
 assert.equal(h.G.game.snapshot().materials.consumed,1);
});
test('both butterflies start on different flowers in every habitat',()=>{
 const h=createGarden(root);for(const scene of ['meadow','asian','asian']){h.G.game.switchScene(scene);h.advance(1300);const a=h.G.game.snapshot().actors.filter(a=>a.id==='butterfly');assert.equal(new Set(a.map(a=>a.x+','+a.y)).size,2,scene)}
});
test('clicking an entering giraffe waits for it to plant its feet before browsing',()=>{
 const h=createGarden(root);h.advance(300);h.G.game.summon('giraffe');h.advance(200);
 assert.notEqual(animal(h,'giraffe').state,'browse','entry must not overlap feeding');
 h.advance(650);assert.equal(animal(h,'giraffe').state,'browse');
 const x=animal(h,'giraffe').x;h.G.game.summon('zebra');h.advance(200);assert.equal(animal(h,'giraffe').x,x,'cannot retreat while being replaced');h.advance(500);assert.ok(!animal(h,'giraffe'),'replacement completes without waiting for the feeding cycle');
});
test('bees and butterflies reserve different landing flowers including flights in progress',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1400);h.G.game.summon('bee');h.G.game.summon('butterfly');
 for(let i=0;i<130;i++){h.advance(100);if(h.G.game.snapshot().bee!=='flower')continue;const bee=screenPoint(node(h,'bee').querySelector('[data-anchor="nectar-tip"]'));for(const b of h.document.querySelectorAll('.creature[data-kind="butterfly"]')){const p=screenPoint(b.querySelector('[data-anchor="butterfly-feet"]'));assert.ok(Math.hypot(bee.x-p.x,bee.y-p.y)>25,'no shared flower')}}
});
test('a departing elephant cannot start a detached water story',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(8600);h.G.game.summon('tiger');h.click(h.document.querySelector('[data-flower="f4"]'),1430,700);h.advance(3000);
 assert.equal(h.G.game.snapshot().water,null);
});
test('ground visitors remain in their play area after repeated movement requests',()=>{
 const h=createGarden(root);h.G.game.summon('zebra');h.advance(9500);
 for(let i=0;i<18;i++){h.G.game.summon('zebra');h.advance(4600);const a=animal(h,'zebra');assert.ok(a&&a.x>180&&a.x<1250,'zebra stays on its patch: '+a?.x)}
});
test('monkey returns its hand from its mouth instead of jumping back to the empty branch',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1600);h.G.game.summon('monkey');h.advance(3100);let last=screenPoint(node(h,'monkey').querySelector('[data-anchor="palm"]'));
 for(let i=0;i<20;i++){h.advance(100);const p=screenPoint(node(h,'monkey').querySelector('[data-anchor="palm"]'));assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<18,'hand moves continuously');last=p}
 assert.ok(Math.abs(last.x-378.945)<3&&Math.abs(last.y-523.86)<3,'hand returns to the original supported position');
});
test('bear lowers its head around the attached neck instead of translating its head off the chest',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1400);h.G.game.summon('bear');h.advance(11000);h.click(h.document.querySelector('[data-fig="fig0"]'),670,400);h.advance(1400);
 const a=animal(h,'bear'),head=node(h,'bear').querySelector('.head'),joint=new Point(115,127).matrixTransform(head.getScreenCTM());
 assert.ok(Math.hypot(joint.x-(a.x+20.85),joint.y-(a.y-101.47))<1,'neck pivot stays attached');
});
test('zebra stripes stay centered inside each shin while the animal steps',()=>{
 const h=createGarden(root);h.G.game.summon('zebra');for(let i=0;i<200&&!node(h,'zebra');i++)h.advance(100);assert.ok(node(h,'zebra'));h.advance(100);
 for(let i=0;i<18;i++){h.advance(40);for(const leg of node(h,'zebra').querySelectorAll('.leg')){const p=leg.querySelector('.limb').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),marks=leg.querySelector('.leg-markings').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),dx=p[4]-p[2],dy=p[5]-p[3],len=Math.hypot(dx,dy);for(let j=0;j<marks.length;j+=4){const mx=(marks[j]+marks[j+2])/2,my=(marks[j+1]+marks[j+3])/2;assert.ok(Math.abs((mx-p[2])*dy-(my-p[3])*dx)/len<.01,'stripe follows shin');}}}
});
test('penguin and turtle have moving feet during entry before their first interaction',()=>{
 for(const id of ['penguin','turtle']){const h=createGarden(root);h.G.game.summon(id);for(let i=0;i<200&&!node(h,id);i++)h.advance(100);const n=node(h,id);assert.ok(n);const feet=n.querySelectorAll(id==='penguin'?'.penguin-foot-left':'.leg');const before=feet.map(n=>n.outerHTML).join('');h.advance(600);assert.notEqual(feet.map(n=>n.outerHTML).join(''),before,id+' entry has gait')}
});
test('the nostril rotates around its current tip when the trunk rises',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(4900);const n=node(h,'elephant').querySelector('[data-anchor="trunk-tip"]'),p=screenPoint(n),center=new Point(+n.getAttribute('cx'),+n.getAttribute('cy')).matrixTransform(n.parentNode.getScreenCTM());assert.ok(Math.hypot(p.x-center.x,p.y-center.y)<.01,'nostril stays on the current nozzle');
});
test('reaching animals restore their connected resting limbs after a complete action',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1400);const arm=node(h,'squirrel').querySelector('.squirrel-arm'),rest=arm.innerHTML;h.G.game.summon('squirrel');h.advance(5100);assert.equal(arm.innerHTML,rest,'squirrel hand returns to its original connected pose');
});
test('dog lowers its head continuously around its attached neck and returns after repeated fetches',()=>{
 const h=createGarden(root);h.G.game.summon('dog');h.advance(12500);
 for(let round=0;round<3;round++){h.G.game.summon('dog');let last=screenPoint(node(h,'dog').querySelector('[data-anchor="mouth"]'));for(let i=0;i<100;i++){h.advance(100);const a=animal(h,'dog'),head=node(h,'dog').querySelector('.head'),pivot=new Point(121,110).matrixTransform(head.getScreenCTM()),p=screenPoint(head.querySelector('[data-anchor="mouth"]'));assert.ok(Math.hypot(pivot.x-(a.x+20.58),pivot.y-(a.y-88.2))<.01,'neck stays attached');assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<25,'no snap on pickup or release');last=p}assert.equal(h.G.game.snapshot().fetch,'rest');}
});
test('an exiting animal can be recalled before it disappears',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(9000);h.G.game.summon('tiger');h.advance(400);h.G.game.summon('elephant');h.advance(2300);assert.ok(animal(h,'elephant'));assert.equal(animal(h,'tiger'),undefined);assert.equal(animal(h,'elephant').x,980);
});
test('tiger paw, sole and leaf contact agree and repeated play stays on its patch',()=>{
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1400);h.G.game.summon('tiger');h.advance(10500);
 for(let round=0;round<12;round++){h.G.game.summon('tiger');h.advance(1600);const a=animal(h,'tiger'),paw=node(h,'tiger').querySelector('.paw'),p=screenPoint(paw.querySelector('[data-anchor="paw-tip"]')),sole=new Point(0,0).matrixTransform(paw.querySelector('.foot').getScreenCTM());assert.ok(Math.hypot(p.x-sole.x,p.y-sole.y)<.01,'sole follows paw');assert.ok(a.x>=715&&a.x<=739,'body movement bounded');h.advance(2000);}
 const leaf=h.document.getElementById('tigerPlayLeaf');assert.ok(+leaf.getAttribute('transform').match(/translate\(([^ ]+)/)[1]<=827,'leaf movement bounded');
});
test('sloth waits for new foliage instead of recreating consumed food immediately on a click',()=>{
 const h=createGarden(root);
 h.G.game.switchScene('asian');h.advance(1400);h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(3200);h.G.game.summon('sloth');h.advance(11100);h.G.game.summon('sloth');h.advance(300);assert.equal(animal(h,'sloth').state,'sloth-look');assert.equal(h.G.game.snapshot().materials.consumed,1);h.advance(2000);assert.equal(h.G.game.snapshot().materials.branch,5);
});
test('hippo jaw opens about its attached hinge and closes at the end',()=>{
 const h=createGarden(root);h.G.game.summon('hippo');h.advance(9500);h.G.game.summon('hippo');h.advance(1700);const a=animal(h,'hippo'),jaw=node(h,'hippo').querySelector('.hippo-jaw'),p=new Point(129,133).matrixTransform(jaw.getScreenCTM());assert.ok(Math.hypot(p.x-(a.x+48.575),p.y-(a.y-112.225))<.01);h.advance(2000);assert.equal(jaw.getAttribute('transform'),null);
});
test('bird feet tuck continuously under the belly and extend before landing',()=>{
 const h=createGarden(root);h.G.game.summon('bird');h.advance(900);const feet=node(h,'bird').querySelector('.bird-feet path'),during=feet.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);assert.ok(during[3]>=136&&during[3]<145,'feet remain beneath belly in flight');h.advance(5000);assert.equal(animal(h,'bird').state,'awake');const rest=feet.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);assert.equal(rest[3],149,'toes extend on the perch');
});
test('fish turns its mouth, body and fins as one pose and returns to the resting angle',()=>{
 const h=createGarden(root);h.G.game.summon('fish');h.advance(1000);const n=node(h,'fish'),pose=n.querySelector('.fish-pose'),mouth=n.querySelector('[data-anchor="mouth"]'),a=animal(h,'fish'),p=screenPoint(mouth),expected=new Point(180,117).matrixTransform(pose.getScreenCTM());assert.ok(Math.hypot(p.x-expected.x,p.y-expected.y)<.01);assert.ok(Math.abs(p.y-(a.y+(117-200)*92/200))>1,'mouth follows the turn');h.advance(4000);assert.equal(pose.getAttribute('transform'),null);
});
