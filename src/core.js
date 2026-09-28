(function(){
  'use strict';
  const G=window.SpringGarden=window.SpringGarden||{};
  function viewport(width,height){
    const scale=Math.max(.001,Math.min(width/1600,height/900));
    const ox=(width-1600*scale)/2,oy=(height-900*scale)/2;
    return{scale,ox,oy,toWorld(x,y){return{x:(x-ox)/scale,y:(y-oy)/scale}}};
  }
  function pick(point,entities,scale=1){
    let chosen=null,distance=Infinity;
    for(const e of entities){if(e.hidden)continue;const d=Math.hypot(point.x-e.x,point.y-e.y);if(d<e.r+32/scale&&d<distance){chosen=e;distance=d}}
    return chosen;
  }
  class Cooldown{
    constructor(ms){this.ms=ms;this.times=new Map()}
    take(id,now){const last=this.times.get(id);if(last!==undefined&&now-last<this.ms)return false;this.times.set(id,now);return true}
  }
  class EffectBudget{
    constructor(){this.times=[]}
    take(now,want,live){while(this.times.length&&now-this.times[0]>=1000)this.times.shift();const n=Math.max(0,Math.min(want,24-this.times.length,120-live));for(let i=0;i<n;i++)this.times.push(now);return n}
  }
  class Visits{
    constructor(roster,random=Math.random){this.roster=roster;this.random=random;this.index=0;this.due=5000}
    next(now,active,busy){if(now<this.due||busy)return null;for(let i=0;i<this.roster.length;i++){const id=this.roster[this.index++%this.roster.length];if(!active.includes(id)){this.due=now+15000+10000*this.random();return id}}return null}
    reset(now){this.due=now+15000+10000*this.random()}
  }
  function theme(input={}){
    const choose=(value,list,fallback)=>list.includes(value)?value:fallback;
    return{time:choose(input.time,['day','night'],'day'),season:choose(input.season,['spring','summer','autumn','winter'],'spring'),scene:choose(input.scene,['meadow-sunny','underwater','meadow-rain'],'meadow-sunny')};
  }
  class VoiceGate{
    constructor(limit=2){this.limit=limit;this.voices=new Map()}
    get active(){return this.voices.size}
    take(id,now){if(this.voices.size>=this.limit||this.voices.has(id))return false;this.voices.set(id,now);return true}
    release(id){this.voices.delete(id)}
    clear(){this.voices.clear()}
  }
  function separated(a,b,gap=12){return a.x+a.w+gap<=b.x||b.x+b.w+gap<=a.x||a.y+a.h+gap<=b.y||b.y+b.h+gap<=a.y}
  function findSpace(preferred,size,obstacles,bounds,gap=12){
    const candidates=[preferred];for(let y=bounds.y+size.h/2;y<=bounds.y+bounds.h-size.h/2;y+=24)for(let x=bounds.x+size.w/2;x<=bounds.x+bounds.w-size.w/2;x+=24)candidates.push({x,y});
    candidates.sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y));
    for(const p of candidates){const r={x:p.x-size.w/2,y:p.y-size.h/2,w:size.w,h:size.h};if(r.x<bounds.x||r.y<bounds.y||r.x+r.w>bounds.x+bounds.w||r.y+r.h>bounds.y+bounds.h)continue;if(obstacles.every(other=>separated(r,other,gap)))return p}return null;
  }
  function dogLegPose(phase,x,y,front){
    const t=((phase%1)+1)%1,stance=t<.64,s=stance?t/.64:(t-.64)/.36;
    const foot={x:x+(stance?9-18*s:-9+18*s),y:175-(stance?0:7*Math.sin(Math.PI*s))};
    const dx=foot.x-x,dy=foot.y-y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),bend=Math.acos(Math.max(-1,Math.min(1,(24*24+d*d-25*25)/(48*d))));
    const a=angle+(front?bend:-bend);return{foot,knee:{x:x+24*Math.cos(a),y:y+24*Math.sin(a)}};
  }
  G.core={viewport,pick,Cooldown,EffectBudget,Visits,theme,VoiceGate,separated,findSpace,dogLegPose};
})();
