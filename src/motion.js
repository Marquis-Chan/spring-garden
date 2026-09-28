(function(){
 'use strict';const G=window.SpringGarden=window.SpringGarden||{};
 class Harvest{
  constructor(ids){this.states=new Map(ids.map(id=>[id,'tree']))}
  pick(id){if(this.states.get(id)!=='tree')return false;this.states.set(id,'falling');return true}
  land(id){const state=this.states.get(id);if(state==='spilling')this.states.set(id,'ground');else if(state==='falling'||state==='returning')this.states.set(id,'basket');else return false;return true}
  drop(){if(this.counts().moving)return[];const ids=[...this.states].filter(([,s])=>s==='basket').map(([id])=>id);for(const id of ids)this.states.set(id,'spilling');return ids}
  collect(id){if(this.states.get(id)!=='ground')return false;this.states.set(id,'returning');return true}
  counts(){const out={tree:0,basket:0,ground:0,moving:0,total:this.states.size};for(const s of this.states.values()){if(s in out)out[s]++;else out.moving++}return out}
 }
 function pointClear(p,boxes){return boxes.every(b=>p.x<=b.x||p.x>=b.x+b.w||p.y<=b.y||p.y>=b.y+b.h)}
 function segmentClear(a,b,boxes){
  return boxes.every(box=>{const r={x:box.x+.001,y:box.y+.001,w:box.w-.002,h:box.h-.002};let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
   for(const [p,q]of [[-dx,a.x-r.x],[dx,r.x+r.w-a.x],[-dy,a.y-r.y],[dy,r.y+r.h-a.y]]){if(Math.abs(p)<1e-9){if(q<0)return true}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return true}}return false;
  });
 }
 function flightRoute(from,to,obstacles,bounds){
  const inside=p=>p.x>=bounds.x&&p.x<=bounds.x+bounds.w&&p.y>=bounds.y&&p.y<=bounds.y+bounds.h;
  if(!inside(from)||!inside(to)||!pointClear(from,obstacles)||!pointClear(to,obstacles))return null;
  const nodes=[{...from},{...to}];for(const r of obstacles)for(const x of [r.x-2,r.x+r.w+2])for(const y of [r.y-2,r.y+r.h+2]){const p={x,y};if(inside(p)&&pointClear(p,obstacles))nodes.push(p)}
  const distance=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),done=new Set();distance[0]=0;
  while(done.size<nodes.length){let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||distance[i]<distance[u]))u=i;if(u<0||!Number.isFinite(distance[u]))return null;if(u===1)break;done.add(u);
   for(let v=0;v<nodes.length;v++)if(!done.has(v)&&segmentClear(nodes[u],nodes[v],obstacles)){const next=distance[u]+Math.hypot(nodes[u].x-nodes[v].x,nodes[u].y-nodes[v].y);if(next<distance[v]){distance[v]=next;previous[v]=u}}
  }
  if(!Number.isFinite(distance[1]))return null;const route=[];for(let i=1;i>=0;i=previous[i])route.unshift(nodes[i]);return route;
 }
 function routeLength(route){let d=0;for(let i=1;i<route.length;i++)d+=Math.hypot(route[i].x-route[i-1].x,route[i].y-route[i-1].y);return d}
 function routePoint(route,t){let remaining=routeLength(route)*Math.max(0,Math.min(1,t));for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(remaining<=d){const q=d?remaining/d:0;return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q}}remaining-=d}return{...route.at(-1)}}
 G.motion={Harvest,pointClear,segmentClear,flightRoute,routeLength,routePoint};
})();
