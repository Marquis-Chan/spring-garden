/* Static SVG poses only. This does not open or automate a browser. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/macqi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {createGarden}=require('../tests/engine-harness.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/habitat-refinements');fs.mkdirSync(out,{recursive:true});
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function serialize(n){const attrs={...n.attributes},style=Object.entries(n.style).filter(([,v])=>typeof v!=='function'&&v!=='').map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';');if(style)attrs.style=(attrs.style||'')+';'+style;return '<'+n.tagName+Object.entries(attrs).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>'+n.children.map(serialize).join('')+'</'+n.tagName+'>'}
const css=['styles.css','wildlife.css','forest.css','interactions.css'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\n#scene *{animation:none!important;transition:none!important}';
async function shot(h,id,crop){const previous=h.svg.getAttribute('viewBox'),aspect=h.svg.getAttribute('preserveAspectRatio');if(crop){h.svg.setAttribute('viewBox',crop);h.svg.setAttribute('preserveAspectRatio','xMidYMid meet')}const source=serialize(h.svg).replace(/(<svg[^>]*>)/,'$1<style>'+css+'</style>');fs.writeFileSync(path.join(out,id+'.svg'),source);await sharp(Buffer.from(source)).resize({width:1200,height:675,fit:'contain',background:'#f3eedc'}).png().toFile(path.join(out,id+'.png'));h.svg.setAttribute('viewBox',previous);if(aspect)h.svg.setAttribute('preserveAspectRatio',aspect);else h.svg.removeAttribute('preserveAspectRatio')}
async function main(){
 const h=createGarden(root);h.G.game.switchScene('canopy');h.advance(1400);await shot(h,'canopy-placement');
 h.G.game.summon('toucan');h.advance(3500);await shot(h,'toucan-second-perch');
 h.G.game.summon('monkey');h.advance(2600);await shot(h,'banana-at-mouth','900 360 260 250');
 h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4300);await shot(h,'canopy-night');
 const b=createGarden(root);b.G.game.switchScene('asian');b.advance(8500);b.G.game.summon('bear');b.advance(1600);await shot(b,'bear-rising','510 230 410 410');
 b.advance(2000);await shot(b,'bear-leaf-contact','510 230 410 410');b.advance(1500);await shot(b,'bear-eating','510 230 410 410');b.advance(3300);await shot(b,'bear-restored','510 230 410 410');
 b.click(b.document.getElementById('forestHive'),1340,454);b.advance(1600);await shot(b,'whole-hive','1210 320 240 250');
 const t=createGarden(root);t.G.game.summon('turtle');t.advance(9000);await shot(t,'turtle-grounding','930 450 350 270');
 const l=createGarden(root);l.advance(1500);l.G.game.summon('lion');l.advance(2100);await shot(l,'lion-raising','760 330 430 330');l.advance(650);await shot(l,'lion-roaring','760 330 430 330');l.advance(3500);await shot(l,'lion-restored','760 330 430 330');
 const s=createGarden(root);s.G.game.switchScene('asian');s.advance(1700);s.G.game.summon('squirrel');s.advance(5200);s.G.game.summon('squirrel');s.advance(600);await shot(s,'squirrel-scratching','1150 290 240 205');s.advance(2400);await shot(s,'squirrel-restored','1150 290 240 205');
 const g=createGarden(root);g.advance(8500);await shot(g,'giraffe-leaf-ready','625 240 310 350');g.click(g.document.querySelector('.creature[data-kind="giraffe"]'),720,420);g.advance(1600);await shot(g,'giraffe-leaf-contact','625 240 310 350');g.advance(3800);await shot(g,'giraffe-leaf-regrown','625 240 310 350');
 const sl=createGarden(root);sl.G.game.switchScene('canopy');sl.advance(1500);sl.G.daynight.toggle(sl.G.game.snapshot().clock);sl.advance(4200);sl.G.game.summon('sloth');sl.advance(8100);await shot(sl,'sloth-leaf-eaten','475 230 295 310');sl.advance(4500);await shot(sl,'sloth-leaf-regrown','475 230 295 310');
 const e=createGarden(root),ef=e.G.world.scenes.asian.flowers;e.G.world.scenes.asian.flowers=[ef[4],...ef.slice(0,4)];e.G.game.switchScene('asian');e.advance(4800);await shot(e,'elephant-stream-splash','910 285 650 445');
 console.log('21 static habitat / contact poses written');
}
main().catch(e=>{console.error(e);process.exitCode=1});
