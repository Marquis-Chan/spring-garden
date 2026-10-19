/* Static SVG checkpoints only; no browser or continuous-animation verification. */
const {shot,createGarden,root}=require('./render-habitat-qa.cjs');
function forest(){const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1600);return h}
async function main(){
 const p=forest();p.G.daynight.toggle(p.G.game.snapshot().clock);p.advance(4200);p.G.game.summon('owl');p.advance(11000);p.G.game.summon('peacock');p.advance(2300);await shot(p,'motion-final-peacock-ascent','620 100 620 580');p.advance(6500);await shot(p,'motion-final-peacock-perch','620 100 620 580');p.G.daynight.toggle(p.G.game.snapshot().clock);p.advance(4600);await shot(p,'motion-final-peacock-descent','620 100 620 580');p.advance(3300);await shot(p,'motion-final-peacock-ground');
 const b=forest();b.advance(6900);b.G.game.summon('bear');b.advance(9000);for(let i=0;i<3;i++){b.click(b.document.querySelector('[data-fig="fig'+i+'"]'),670+i*28,400);b.advance(7500)}b.G.game.summon('bear');b.advance(5500);await shot(b,'motion-final-bear-returned','480 220 470 460');
 const m=forest();m.G.game.summon('monkey');m.advance(100);m.G.daynight.toggle(m.G.game.snapshot().clock);m.advance(1800);await shot(m,'motion-final-monkey-dusk','230 340 270 290');
 const s=forest();s.G.daynight.toggle(s.G.game.snapshot().clock);s.advance(4200);s.G.game.summon('sloth');s.advance(3600);s.G.daynight.toggle(s.G.game.snapshot().clock);s.advance(3100);await shot(s,'motion-final-sloth-dawn','470 225 310 315');
 const e=forest();e.advance(6400);e.click(e.document.getElementById('forestHive'),1340,454);e.advance(2200);e.G.game.summon('tiger');e.advance(700);await shot(e,'motion-final-bees-returning');
 console.log('8 final motion checkpoints written');
}
main().catch(e=>{console.error(e);process.exitCode=1});
