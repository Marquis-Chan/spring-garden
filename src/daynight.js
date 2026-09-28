(function(){
 'use strict';const G=window.SpringGarden,$=id=>document.getElementById(id),cycle=new G.nature.LightCycle();let last=-1;
 const mix=(a,b,q)=>{const parse=v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));a=parse(a);b=parse(b);return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*q).toString(16).padStart(2,'0')).join('')};
 function render(now){const q=cycle.step(now);if(q===last)return q;last=q;
  const colours={sky:[['#d6eae6','#344c70'],['#f6efd9','#8496ad']],grass:[['#d9e6b8','#819f94'],['#acc994','#65897b']],water:[['#b7dcd6','#719aa9'],['#8bbfbd','#537f94']]};
  for(const[id,pairs]of Object.entries(colours))[...$(id).children].forEach((n,i)=>n.setAttribute('stop-color',mix(...pairs[i],q)));
  $('sunDay').setAttribute('opacity',1-q);$('moonNight').setAttribute('opacity',q);$('nightSky').setAttribute('opacity',q);$('celestialGlow').setAttribute('opacity',.25+.45*q);
  $('sceneLightMatrix').setAttribute('values',`${1-.24*q} 0 0 0 ${.025*q} 0 ${1-.18*q} 0 0 ${.025*q} 0 0 ${1-.05*q} 0 ${.035*q} 0 0 0 1 0`);
  $('nightWash').setAttribute('opacity',q*.13);$('farHill').setAttribute('fill',mix('#cddcbb','#899e9a',q));$('nearHill').setAttribute('fill',mix('#bed3aa','#6e9189',q));
  $('sun').setAttribute('aria-label',q>.5?'月亮，切换白天':'太阳，切换夜晚');$('sun').setAttribute('aria-pressed',String(cycle.target===1));$('scene').style.setProperty('--night',q);
  document.body.style.background=mix('#d6eae6','#344c70',q);return q;
 }
 function toggle(now){return cycle.toggle(now)}
 G.daynight={cycle,render,toggle};
})();
