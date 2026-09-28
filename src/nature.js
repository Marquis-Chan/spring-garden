(function(){
 'use strict';const G=window.SpringGarden,clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>t*t*(3-2*t);
 class LightCycle{
  constructor(){this.value=0;this.target=0;this.born=0;this.busy=false}
  toggle(now){if(this.busy)return false;this.from=this.value;this.target=this.value<.5?1:0;this.born=now;this.busy=true;return true}
  step(now){if(this.busy){const t=clamp((now-this.born)/2800);this.value=this.from+(this.target-this.from)*ease(t);if(t===1)this.busy=false}return this.value}
 }
 function waterJet(origin,direction,target){const gravity=420,dx=target.x-origin.x,slope=direction.y/(Math.sign(direction.x||1)*Math.max(.15,Math.abs(direction.x))),dy=target.y-origin.y,duration=Math.sqrt(Math.max(.05,2*(dy-slope*dx)/gravity)),vx=dx/duration;return{origin:{...origin},target:{...target},vx,vy:vx*slope,gravity,duration}}
 function jetPoint(jet,fraction){const t=fraction*jet.duration;return{x:jet.origin.x+jet.vx*t,y:jet.origin.y+jet.vy*t+.5*jet.gravity*t*t}}
 function splashPoint(drop,t){return{x:drop.vx*t,y:drop.vy*t+.5*drop.gravity*t*t}}
 G.nature={LightCycle,waterJet,jetPoint,splashPoint};
})();
