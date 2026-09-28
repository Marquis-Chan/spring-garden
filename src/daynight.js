(function(){
 'use strict';const G=window.SpringGarden,$=id=>document.getElementById(id),cycle=new G.nature.LightCycle();let last=-1,nights=0,moon='full',sky={};
 const clouds=[{baseX:550,dx:620,range:360,period:44000,phase:-1.25,dy:8},{baseX:955,dx:-220,range:370,period:63000,phase:1.4,dy:-32},{baseX:1370,dx:-130,range:280,period:81000,phase:2.2,dy:-10}];
 const disc=Array.from({length:61},(_,i)=>{const r=60*Math.sqrt((i+.5)/61),a=i*2.39996323;return{x:1185+r*Math.cos(a),y:137+r*Math.sin(a)}});
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=u=>u*u*(3-2*u);
 function autoCloud(c,now){return{dx:c.dx+Math.sin(now/c.period*Math.PI*2+c.phase)*c.range,dy:c.dy}}
 function cloudPose(c,now){if(c.trip){const u=clamp((now-c.trip.born)/1200,0,1),q=ease(u),to=c.trip.park?c.trip.to:autoCloud(c,now),p={dx:c.trip.from.dx+(to.dx-c.trip.from.dx)*q,dy:c.trip.from.dy+(to.dy-c.trip.from.dy)*q};if(u===1){c.mode=c.trip.park?'parked':'auto';c.manual=c.trip.park?p:null;c.trip=null;}return p}return c.manual||autoCloud(c,now)}
 function beginCloud(i,now){const c=clouds[i];if(!c)return null;const p=cloudPose(c,now),previous=c.mode||'auto';c.trip=null;c.mode='held';c.manual=p;return{...p,previous}}
 function moveCloud(i,p){const c=clouds[i];if(!c)return;const b=$('clouds').children[i].querySelector('path').getBBox();c.manual={dx:clamp(p.dx,16-b.x,1584-b.x-b.width),dy:clamp(p.dy,12-b.y,420-b.y-b.height)};}
 function endCloud(i,now,moved,previous){const c=clouds[i];if(!c)return;if(moved){c.mode='parked';return}const park=previous!=='parked',b=$('clouds').children[i].querySelector('path').getBBox();c.trip={from:cloudPose(c,now),to:{dx:1185-b.x-b.width/2,dy:137-b.y-b.height/2},born:now,park};c.manual=null;c.mode=park?'covering':'returning';}
 function renderSky(now,q){
  let covered=0,moonCovered=0,moonSamples=0;const positions=clouds.map((c,i)=>{const p=cloudPose(c,now),node=$('clouds').children[i];node.setAttribute('transform',`translate(${p.dx.toFixed(3)} ${p.dy.toFixed(3)})`);node.dataset.mode=c.mode||'auto';return{x:c.baseX+p.dx,dx:p.dx,dy:p.dy,mode:c.mode||'auto',path:node.querySelector('path')}});
  for(const p of disc){let transmission=1;for(const c of positions)if(c.path.isPointInFill(new DOMPoint(p.x-c.dx,p.y-c.dy)))transmission*=1-Number(c.path.getAttribute('opacity'));covered+=1-transmission;if(moon==='full'||Math.hypot(p.x-1213,p.y-114)>=58){moonCovered+=1-transmission;moonSamples++}}
  const coverage=covered/disc.length*(1-q)+moonCovered/Math.max(1,moonSamples)*q,shade=coverage*(.36-.08*q);$('cloudShade').setAttribute('opacity',shade.toFixed(4));
  const stars=[...$('nightSky').children].map((n,i)=>{const alpha=.28+.72*(.5+.5*Math.sin(now/(280+i%5*40)+i*1.71))**2;n.setAttribute('opacity',alpha.toFixed(3));return alpha});
  sky={moon,shade,coverage,clouds:positions.map(c=>({x:c.x,dx:c.dx,dy:c.dy,mode:c.mode})),stars};
 }
 const mix=(a,b,q)=>{const parse=v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));a=parse(a);b=parse(b);return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*q).toString(16).padStart(2,'0')).join('')};
 function render(now){const q=cycle.step(now);renderSky(now,q);if(q===last)return q;last=q;
  const colours={sky:[['#d6eae6','#344c70'],['#f6efd9','#8496ad']],grass:[['#d9e6b8','#819f94'],['#acc994','#65897b']],water:[['#b7dcd6','#719aa9'],['#8bbfbd','#537f94']]};
  for(const[id,pairs]of Object.entries(colours))[...$(id).children].forEach((n,i)=>n.setAttribute('stop-color',mix(...pairs[i],q)));
  $('skyGlow').setAttribute('opacity',1-.78*q);$('sunDay').setAttribute('opacity',1-q);$('moonNight').setAttribute('opacity',q);$('nightSky').setAttribute('opacity',q);$('celestialGlow').setAttribute('opacity',.25+.45*q);
  $('sceneLightMatrix').setAttribute('values',`${1-.24*q} 0 0 0 ${.025*q} 0 ${1-.18*q} 0 0 ${.025*q} 0 0 ${1-.05*q} 0 ${.035*q} 0 0 0 1 0`);
  $('nightWash').setAttribute('opacity',q*.13);$('farHill').setAttribute('fill',mix('#cddcbb','#899e9a',q));$('nearHill').setAttribute('fill',mix('#bed3aa','#6e9189',q));
  $('sun').setAttribute('aria-label',q>.5?'月亮，切换白天':'太阳，切换夜晚');$('sun').setAttribute('aria-pressed',String(cycle.target===1));$('scene').style.setProperty('--night',q);
  document.body.style.background=mix('#d6eae6','#344c70',q);return q;
 }
 function toggle(now){const entering=cycle.target===0;if(!cycle.toggle(now))return false;if(entering){moon=(nights++%2===0)?'crescent':'full';$('moonCutout').setAttribute('r',moon==='full'?0:58);$('moonFace').setAttribute('transform',moon==='full'?'translate(0 0)':'translate(-26 12)');$('moonNight').dataset.phase=moon}return true}
 G.daynight={cycle,render,toggle,beginCloud,moveCloud,endCloud,get sky(){return sky}};
})();
