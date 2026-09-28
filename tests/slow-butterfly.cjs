const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
const step=source.slice(source.indexOf('function stepButterfly(a)'),source.indexOf('function poseElephant(a)'));
assert.ok(step.includes('function stepButterfly'));
const results=[];
for(const dt of [16.67,50,250,300,333,400,500]){
 const ctx={window:{SpringGarden:{}},Math,Number};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/motion.js'),'utf8'),ctx);
 vm.runInContext(`const M=window.SpringGarden.motion,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let clock=0,replans=0,landed=false;
 const boxes=[{x:80,y:80,w:40,h:40}],flower={id:'target',node:{isConnected:true}},goal={x:180,y:100};
 const a={id:'butterfly',kind:'butterfly',x:20,y:121.6,size:48,requestedFlower:null,node:{style:{setProperty(){}},classList:{add(){},remove(){}}}};
 const flowerContact=()=>({x:goal.x,y:goal.y+.145*a.size}),butterflyObstacles=()=>boxes;
 function flyButterfly(){replans++;const from={x:a.x,y:a.y-.45*a.size},route=M.flightRoute(from,goal,boxes,{x:0,y:0,w:200,h:200});if(route)a.flight={route,to:goal,flower,born:clock,duration:Math.max(1100,M.routeLength(route)/145*1000),lift:0};}
 function perchButterfly(){a.flight=null;landed=true;a.x=goal.x;a.y=goal.y+.45*a.size;}
 flyButterfly();${step}
 function sample(dt){const before={x:a.x,y:a.y-.45*a.size};clock+=dt;stepButterfly(a);const after={x:a.x,y:a.y-.45*a.size};return{landed,replans,safe:M.pointClear(after,boxes)&&M.segmentClear(before,after,boxes),x:a.x,y:a.y};}`,ctx);
 let state,frames=0;while(frames++<1000){state=ctx.sample(dt);assert.ok(state.safe,'route may not cut through obstacle at '+dt+'ms');if(state.landed)break;}
 results.push({dt,frames,...state});assert.ok(state.landed,'butterfly must land around obstacle with '+dt+'ms frames: '+JSON.stringify(state));
}
fs.writeFileSync(path.join(root,'verification/slow-butterfly.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
