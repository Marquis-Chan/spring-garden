/* Deterministic state audit only; does not launch or control any browser. */
const fs=require('node:fs'),path=require('node:path');
const {createGarden}=require('../tests/engine-harness.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/repeat-interaction-audit.json');
const probe=createGarden(root),report=[];
function ready(h,id){for(let i=0;i<180;i++){const s=h.G.game.snapshot(),a=s.actors.find(a=>a.id===id),n=h.document.querySelector('.creature[data-kind="'+id+'"]');if(a&&!n.classList.contains('walking')&&['awake','rest','forage','sleep'].includes(a.state)&&!(id==='dog'&&s.fetch!=='rest')&&!(id==='bee'&&s.bee)&&!(id==='elephant'&&s.water))return;h.advance(100);}}
for(const [scene,c]of Object.entries(probe.G.world.scenes))for(const id of c.roster){
 if(report.some(r=>r.id===id))continue;
 const h=createGarden(root);h.G.game.switchScene(scene);h.advance(1500);
 if(['owl','sloth'].includes(id)){h.G.daynight.toggle(h.G.game.snapshot().clock);h.advance(4200);}
 h.G.game.summon(id);h.advance(2500);const clicks=[];
 for(let round=0;round<3;round++){
  ready(h,id);h.G.game.summon(id);h.advance(100);const s=h.G.game.snapshot(),a=s.actors.find(a=>a.id===id);
  clicks.push({state:a?.state,x:a?.x,y:a?.y,hidden:a?.hidden,materials:s.materials,
   fetch:id==='dog'?s.fetch:undefined,bee:id==='bee'?s.bee:undefined,water:id==='elephant'?s.water:undefined});
 }
 report.push({id,scene,time:h.G.game.snapshot().time,clicks});
 fs.writeFileSync(out,JSON.stringify({method:'Nonrendering state audit of three repeated explicit requests, after prior actions settle; daytime rest uses separate sleep regression tests',animals:report},null,2)+'\n');
 console.log(id+': '+clicks.map(c=>c.state+(c.fetch?' / '+c.fetch:'')+(c.bee?' / '+c.bee:'')+(c.water?' / '+c.water:'')).join(' → '));
}
console.log('Audited '+report.length+' animal types.');
