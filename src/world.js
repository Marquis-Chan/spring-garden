(function(){
 'use strict';const G=window.SpringGarden;
 // 统一树林的站位与食物接触点，插画和动作读取同一坐标。
 const forestLayout={monkey:{x:335,y:565,food:{x:402,y:516}},sloth:{x:590,y:437,food:{x:686,y:276}},toucan:[{x:1140,y:318},{x:1250,y:278}],fish:{x:1250,y:690,size:82},peacockPerch:{x:960,y:355}};
 const scenes={
  meadow:{region:'meadow',roster:['cat','dog','bird','butterfly','giraffe','zebra','hippo','turtle','fish','penguin','lion'],residents:['bird','butterfly','fish'],guests:['giraffe','zebra','hippo','turtle','penguin','lion'],starts:['giraffe'],flowers:[{x:90,y:755},{x:330,y:755},{x:585,y:755},{x:840,y:755},{x:1090,y:755},{x:1470,y:755}],water:{x:1190,y:570,w:340,h:175},pads:[{x:670,y:495},{x:1010,y:610}],portals:[{to:'asian',x:1510,y:405}]},
  asian:{region:'asian',roster:['owl','bear','bee','tiger','elephant','peacock','rhino','squirrel','woodpecker','butterfly','sloth','monkey','toucan','fish'],residents:['owl','bee','squirrel','woodpecker','butterfly','sloth','monkey','toucan','fish'],guests:['tiger','bear','elephant','peacock','rhino'],starts:['elephant'],flowers:[{x:360,y:756},{x:510,y:750},{x:805,y:745},{x:1100,y:755},{x:1430,y:755}],water:{x:1000,y:563,w:540,h:155},pads:[{x:740,y:620},{x:1250,y:630}],portals:[{to:'meadow',x:83,y:405}]}
 };
 class SceneLedger{
  constructor(){this.current='meadow';this.epoch=0;this.states=Object.fromEntries(Object.keys(scenes).map(id=>[id,{visited:false,actors:[],grown:[],materials:null}]));this.pending=[]}
  get state(){return this.states[this.current]}
  enter(id){if(!scenes[id]||id===this.current)return false;this.current=id;this.epoch++;this.pending=[];this.state.visited=true;return true}
  schedule(now,delay,fn){this.pending.push({due:now+delay,epoch:this.epoch,fn})}
  advance(now){const due=this.pending.filter(t=>t.due<=now);this.pending=this.pending.filter(t=>t.due>now);for(const t of due)if(t.epoch===this.epoch)t.fn()}
 }
 class MaterialLedger{
  constructor(ids,initial='branch'){this.states=new Map(ids.map(id=>[id,initial]))}
  transfer(id,from,to){if(this.states.get(id)!==from)return false;this.states.set(id,to);return true}
  counts(){const out={total:this.states.size};for(const s of this.states.values())out[s]=(out[s]||0)+1;return out}
 }
 function contactTransfer(ledger,id,from,to,contact,object,tolerance=7){return Math.hypot(contact.x-object.x,contact.y-object.y)<=tolerance&&ledger.transfer(id,from,to)}
 class GroundedFoot{
  constructor(hip){this.hip=hip;this.plant=null;this.swing=false}
  step(bodyX,ground,phase,stride=22){const t=((phase%1)+1)%1;
   if(this.plant===null)this.plant=bodyX+this.hip+stride*.4;
   if(t<.64){if(this.swing){this.plant=bodyX+this.hip+stride*.4;this.swing=false}return{x:this.plant,y:ground,stance:true}}
   if(!this.swing){this.swing=true;this.from=this.plant}
   const q=(t-.64)/.36,to=bodyX+this.hip+stride*.4;return{x:this.from+(to-this.from)*q,y:ground-Math.sin(Math.PI*q)*Math.min(8,stride*.3),stance:false};
  }
 }
 class FetchCycle{
  constructor(home){this.home={...home};this.ball={id:'garden-ball',...home};this.state='rest'}
  throwTo(to,now){if(this.state!=='rest')return false;this.from={x:this.ball.x,y:this.ball.y};this.to={...to};this.born=now;this.state='rolling';return true}
  step(now,mouth){if(this.state==='rolling'){const q=Math.min(1,(now-this.born)/450);this.ball.x=this.from.x+(this.to.x-this.from.x)*q;this.ball.y=this.from.y+(this.to.y-this.from.y)*q;if(q===1)this.state='chasing'}
   if(this.state==='chasing'&&Math.hypot(mouth.x-this.ball.x,mouth.y-this.ball.y)<9)this.state='carrying';
   if(this.state==='carrying'){this.ball.x=mouth.x;this.ball.y=mouth.y;if(Math.hypot(mouth.x-this.home.x,mouth.y-this.home.y)<9){this.state='rest';Object.assign(this.ball,this.home)}}return this.state;
  }
 }
 function activity(id,time){if(id==='owl')return time==='day'?'sleep':'awake';if(id==='sloth')return time==='day'?'rest':'forage';if(['bee','bird','butterfly','woodpecker','monkey','peacock','toucan'].includes(id)&&time==='night')return'rest';return'awake'}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 function bezier(points,t){const u=1-t;return{x:u*u*u*points[0].x+3*u*u*t*points[1].x+3*u*t*t*points[2].x+t*t*t*points[3].x,y:u*u*u*points[0].y+3*u*u*t*points[1].y+3*u*t*t*points[2].y+t*t*t*points[3].y}}
 function scaleAt(size,y){return size*(.78+.22*clamp((y-420)/300,0,1))}
 function safeFlight(from,to,boxes){const bounds={x:60,y:225,w:1480,h:565},M=G.motion,points=[from,{x:from.x+(to.x-from.x)*.25,y:Math.max(235,Math.min(from.y,to.y)-115)},{x:from.x+(to.x-from.x)*.75,y:Math.max(235,Math.min(from.y,to.y)-115)},to];const clear=route=>route.every((p,i)=>!i||M.segmentClear(route[i-1],p,boxes));let samples=Array.from({length:65},(_,i)=>bezier(points,i/64));if(clear(samples))return samples;
  // 起终点靠近安全边界时仅缩小额外缓冲，不能丢掉整块障碍物。
  const clearance=(p,b)=>Math.max(b.x-p.x,p.x-b.x-b.w,b.y-p.y,p.y-b.y-b.h),inflated=boxes.map(b=>{const r=Math.max(0,Math.min(20,clearance(from,b)-.5,clearance(to,b)-.5));return{x:b.x-r,y:b.y-r,w:b.w+2*r,h:b.h+2*r}}),route=M.flightRoute(from,to,inflated,bounds);if(!route)return null;samples=[from];
  for(let i=1;i<route.length-1;i++){const a=route[i-1],b=route[i],c=route[i+1],d1=Math.hypot(b.x-a.x,b.y-a.y),d2=Math.hypot(c.x-b.x,c.y-b.y);let r=Math.min(16,d1*.2,d2*.2),corner;for(let attempt=0;attempt<8;attempt++){const p0={x:b.x+(a.x-b.x)*r/d1,y:b.y+(a.y-b.y)*r/d1},p2={x:b.x+(c.x-b.x)*r/d2,y:b.y+(c.y-b.y)*r/d2};corner=[p0];for(let j=1;j<=12;j++){const t=j/12,u=1-t;corner.push({x:u*u*p0.x+2*u*t*b.x+t*t*p2.x,y:u*u*p0.y+2*u*t*b.y+t*t*p2.y})}if(clear(corner))break;r/=2;}samples.push(...corner);}
  samples.push(to);return clear(samples)?samples:null;
 }
 G.world={scenes,forestLayout,SceneLedger,MaterialLedger,GroundedFoot,FetchCycle,contactTransfer,activity,clamp,ease,bezier,scaleAt,safeFlight};
})();
