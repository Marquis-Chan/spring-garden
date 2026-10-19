/* Static SVG snapshots, not browser animation or actual audio playback. */
const {shot,createGarden,root}=require('./render-habitat-qa.cjs');
async function main(){
 const h=createGarden(root);h.G.game.switchScene('asian');h.advance(1800);await shot(h,'shared-forest-day');h.advance(3000);await shot(h,'shared-forest-spray');
 h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200);await shot(h,'shared-forest-night');h.G.game.summon('toucan');h.advance(100);await shot(h,'shared-forest-sleep-feedback');
 const b=createGarden(root);b.G.game.switchScene('asian');b.advance(8500);b.G.game.summon('bear');b.advance(4300);await shot(b,'shared-forest-bear-standing');
 const p=createGarden(root);p.G.game.switchScene('asian');p.advance(1500);p.G.game.summon('peacock');p.advance(9500);p.G.daynight.toggle(p.G.game.snapshot().clock);p.advance(11000);await shot(p,'shared-forest-peacock-roost');
 const t=createGarden(root);t.G.game.switchScene('asian');t.advance(8500);t.G.game.summon('tiger');t.advance(3000);await shot(t,'shared-forest-tiger');
 console.log('7 shared-forest static poses written');
}
main().catch(e=>{console.error(e);process.exitCode=1});
