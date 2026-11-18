import * as T from 'three';
import {blink,closedShape,group,mesh,tube} from './savanna-actors.js';
import {clamp,ease,idleClockRate,mix} from './state.js';
import {makeSilverFry} from './coast-tidepool.js';

const floor=.48,home={x:42.13,z:19.35};
export const icePoints={cave:{x:42.12,y:1.80,z:20.76}};
const path=new T.CatmullRomCurve3([[0,0,0],[0,0,1.45],[.24,0,2.45],[1.08,0,2.96],
 [2.00,0,3.31],[2.62,0,3.97],[3.31,0,4.68]].map(p=>new T.Vector3(...p)));
const tangent=new T.Vector3(),sample=new T.Vector3(),pathLength=path.getLength();
const pulse=t=>t>0&&t<1?Math.sin(t*Math.PI):0;
path.getTangentAt(1,tangent);
const endpointYaw=Math.atan2(tangent.x,tangent.z);
const waterY=-.067,fishScale=[.82,.72,.77];
const swimSpots=[[41.30,27.03],[43.9,27.35],[46.25,27.44]];
// 这点就是完全伸出去的前掌掌心，在主浮冰外、两块碎冰之间。
const finish=path.getPoint(1);
const wetPaw=new T.Vector3(-.454,-floor+waterY,1.32)
 .applyAxisAngle(new T.Vector3(0,1,0),endpointYaw).add(new T.Vector3(home.x+finish.x,floor,home.z+finish.z));
function cruise(fish,time){
 const a=time*.43+fish.index*1.9,[x,z]=swimSpots[fish.index];
 fish.x=x+.63*Math.sin(a);fish.z=z+.23*Math.cos(a);
 fish.y=waterY+.018*Math.sin(a*2);fish.yaw=Math.atan2(.63*Math.cos(a),-.23*Math.sin(a));
}
function fishRoute(fish){
 const points=[[fish.x,fish.z],[(fish.x+44.35)/2,27.25],[44.35,27.07],[44.48,26.20],
  [45.34,25.62],[wetPaw.x,wetPaw.z]];
 return new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,waterY,z)));
}

export function createIce(emit=()=>{}){
 const bear={x:home.x,y:floor,z:home.z,yaw:0,phase:'den',stride:0,gait:0,crouch:.27,
  sniff:0,shake:0,look:0,progress:0,time:0,reach:0,dip:0,offer:0,bite:0,mealScale:0};
 const fish=swimSpots.map((_,index)=>{
  const swimmer={index,mode:'swim',size:1,clock:0,swallow:0};
  cruise(swimmer,0);
  return swimmer;
 });
 let trip=null,attempt=0,firstInPair=true,splashAge=10;
 let time=0,age=0,lastCall=-Infinity,rest=0,action=null,queued=false;
 function enter(phase){bear.phase=phase;age=0;}
 function tapCave(){
  if(trip&&bear.phase!=='den'){queued=true;return;}
  if(bear.phase==='den'){action=null;enter('peek');emit({type:'den-peek'});}
  else if(bear.phase==='outside'){action=null;enter('turn-home');emit({type:'den-return'});}
  else if(bear.phase==='leaving')queued=true;
 }
 function call(){
  if(time-lastCall<1.8)return false;
  lastCall=time;emit({type:'polar-bear-call'});
  return true;
 }
 function tapBear(){
  if(!call()||trip)return;
  if(bear.phase==='den')tapCave();
  else if(bear.phase==='outside'){enter('outside');action='shake';rest=0;}
 }
 function canFish(index){
  const f=fish[index];
  return !trip&&f?.mode==='swim'&&f.size>=.85&&['den','peek','leaving','outside'].includes(bear.phase);
 }
 function tapFish(index){
  if(!canFish(index))return;
  const f=fish[index];
  if(attempt%2===0)firstInPair=attempt===0||Math.random()<.5;
  const caught=attempt++%2===0?firstInPair:!firstInPair;
  trip={f,route:fishRoute(f),progress:0,caught,contact:false};
  bear.mealScale=fishScale[index]*f.size;
  if(!caught){
   trip.escape=new T.CatmullRomCurve3([wetPaw.clone(),new T.Vector3(46.78,waterY,25.16),
    new T.Vector3(47.13,waterY,25.78),new T.Vector3(46.68,waterY,26.91),
    new T.Vector3(45.82,waterY,27.27),new T.Vector3(f.x,waterY,f.z)]);
  }
  f.mode='approach';f.noticedAt=time;action=null;call();
  if(bear.phase==='den')tapCave();
  emit({type:'fish-noticed',index});
 }
 function follow(f,route,p,dt){
  route.getPointAt(clamp(p),sample);route.getTangentAt(clamp(p),tangent);
  f.x=sample.x;f.z=sample.z;f.y=waterY;
  const yaw=Math.atan2(tangent.x,tangent.z);
  f.yaw+=Math.atan2(Math.sin(yaw-f.yaw),Math.cos(yaw-f.yaw))*(1-Math.exp(-14*dt));
 }
 function finishFishing(){
  const {f}=trip;
  if(trip.caught){f.mode='away';f.clock=0;f.size=0;}
  else {f.mode='swim';cruise(f,f.clock);}
  emit({type:'fishing-finished',index:f.index,caught:trip.caught});
  trip=null;rest=0;bear.crouch=0;enter('outside');
 }
 function fishing(dt){
  for(const f of fish){
   if(f.mode==='away'){
    f.clock+=dt;if(f.clock<2.5)continue;
    f.mode='swim';f.swallow=0;
   }
   if(f.mode==='swim'){f.clock+=dt;f.size=Math.min(1,f.size+dt*1.4);cruise(f,f.clock);}
  }
  if(!trip)return;
  const {f,caught}=trip;
  if(f.mode==='approach'){
   // 等熊走到位才靠近掌边，鱼儿先在碎冰之间游过，不会钻进冰面。
   const limit=bear.phase==='fishing'?1:.46;
   trip.progress=Math.min(limit,trip.progress+dt*.40);
   follow(f,trip.route,trip.progress,dt);
   if(bear.phase==='outside'){bear.gait=0;enter('fishing');}
   if(trip.progress<.999){if(bear.phase==='fishing')age=0;return;}
   f.mode='ready';age=0;
  }
  const ramp=(start,end)=>ease(clamp((age-start)/(end-start)));
  bear.reach=ramp(0,.57)*(1-ramp(caught?2.12:1.20,caught?2.58:1.85));
  bear.dip=ramp(.58,.90)*(1-ramp(.98,1.38));
  bear.offer=caught?ramp(1.05,1.84)*(1-ramp(2.61,3.20)):0;
  bear.crouch=.58*bear.reach+.16*bear.offer;
  bear.bite=caught?(ramp(1.67,2.00)*(1-ramp(2.21,2.49))+.44*pulse((age-2.51)/.34)):0;
  if(!caught&&age>.49&&f.mode==='ready'){f.mode='escape';emit({type:'fish-escaped',index:f.index});}
  if(!trip.contact&&age>=.89){
   trip.contact=true;splashAge=0;
   if(caught){f.mode='held';emit({type:'fish-scooped',index:f.index});}
  }
  if(f.mode==='held')f.swallow=ramp(2.08,2.52);
  if(f.mode==='escape')follow(f,trip.escape,1-(1-clamp((age-.49)/1.86))**2,dt);
  if(age>=(caught?3.23:2.40))finishFishing();
 }
 function walk(progress,back,dt){
  const before=bear.progress;
  path.getPointAt(progress,sample);path.getTangentAt(progress,tangent);
  bear.progress=progress;bear.x=home.x+sample.x;bear.z=home.z+sample.z;
  bear.yaw=Math.atan2(tangent.x,tangent.z)+(back?Math.PI:0);
  const travel=Math.abs(before-progress)*pathLength;
  bear.stride+=travel*8.2;
  bear.gait=clamp(travel/(dt*1.17));
  bear.crouch=.27*(1-ease(progress/.42));
 }
 function step(dt,active=false){
  if(!active)return;
  dt=clamp(dt,0,.05);if(!dt)return;
  time+=dt;age+=dt;bear.time=time;
  splashAge+=dt;
  bear.reach=bear.dip=bear.offer=bear.bite=0;
  bear.sniff=bear.shake=0;bear.look=.09*Math.sin(time*.86);
  switch(bear.phase){
   case 'den':
    bear.gait=0;bear.crouch=.27;bear.sniff=.10+.07*Math.sin(time*1.4);break;
   case 'peek':
    bear.sniff=pulse(age/.66);bear.look=-.19*bear.sniff;
    if(age>=.63)enter('leaving');
    break;
   case 'leaving':
    walk(ease(age/3.32),false,dt);
    if(bear.progress===1){rest=0;enter('outside');emit({type:'bear-on-ice'});}
    break;
   case 'outside':
    bear.gait=0;rest+=dt*idleClockRate;
    if(queued&&!trip){queued=false;tapCave();break;}
    if(action==='shake'){bear.shake=pulse(age/1.28);bear.look=-.38*bear.shake;if(age>1.28)action=null;}
    else if(rest>6.4){bear.sniff=pulse((rest-6.4)/.98);bear.look=-.30*bear.sniff;if(rest>7.38)rest=0;}
    break;
   case 'turn-home':
   case 'turn-den': {
    const atDen=bear.phase==='turn-den',p=clamp(age/.99),turn=ease(p)*Math.PI;
    bear.yaw=atDen?Math.PI+turn:endpointYaw+turn;bear.gait=.63*pulse(p);
    bear.stride+=dt*9*bear.gait;
    if(p===1){if(atDen){bear.yaw=0;enter('den');emit({type:'bear-settled'});}else enter('returning');}
    break;
   }
   case 'returning':
    walk(1-ease(age/3.22),true,dt);
    if(bear.progress===0)enter('turn-den');
    break;
  }
  fishing(dt);
 }
 return {bear,fish,get time(){return time;},get splashAge(){return splashAge;},step,tapCave,tapBear,tapFish,canFish};
}

const S=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
const material=color=>new T.MeshStandardMaterial({color,roughness:.87});
const snow=material('#eff4ec'),inner=material('#789aa6'),stone=material('#859fa4');
const fur=new T.MeshStandardMaterial({vertexColors:true,roughness:.91});
const white=material('#eee5cf'),nose=material('#343941'),coal=material('#242831'),light=material('#fff4de');
const earInside=material('#ab9b8c'),shadow=material('#bfb7a5'),sphere=new T.SphereGeometry(1,22,15);
const oval=(parent,name,mat,x,y,z,w,h,d)=>mesh(T,parent,name,sphere,mat,[x,y,z],[w,h,d]);
const paint=new T.Color(),cream=new T.Color('#f5ebd2'),underside=new T.Color('#cfc5b1');
function furColour(x,y,z){
 return paint.copy(underside).lerp(cream,.14+.86*S(.39,1.01,y))
  .multiplyScalar(.985+.013*Math.cos(z*11+x*13)*Math.sin(y*9));
}

function polarBear(root){
 const bear=group(T,root,'北极熊'),pelvis=new T.Bone(),neck=new T.Bone();
 bear.add(pelvis);pelvis.add(neck);neck.position.set(0,.94,.57);
 // 从臀部、肩峰到鼻梁共用一层毛皮，探头时以骨权重平滑带动颈部。
 const profile=[
  [-1.055,.79,.025,.032],[-1.0,.77,.22,.24],[-.82,.79,.36,.36],[-.57,.79,.405,.42],
  [-.30,.77,.416,.434],[-.08,.79,.40,.43],[.16,.83,.382,.438],[.38,.885,.359,.414],
  [.57,.93,.304,.350],[.705,.985,.272,.285],[.84,1.035,.302,.279],[.972,1.040,.286,.259],
  [1.088,1.008,.241,.212],[1.18,.962,.204,.156],[1.29,.944,.149,.108],[1.352,.94,.089,.070],[1.372,.943,.028,.025]
 ];
 const geometry=closedShape(T,profile,40,furColour),positions=geometry.attributes.position;
 const weights=[],indices=[];
 for(let i=0;i<positions.count;i++){
  const w=S(.26,.74,positions.getZ(i));weights.push(1-w,w,0,0);indices.push(0,1,0,0);
 }
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
 geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const body=new T.SkinnedMesh(geometry,fur);body.name='连贯的肩背与长吻';
 body.castShadow=body.receiveShadow=true;bear.add(body);
 // 反向绑定矩阵取自静止姿势；先更新同级骨架，避免给头部多叠一次颈骨偏移。
 bear.updateMatrixWorld(true);body.bind(new T.Skeleton([pelvis,neck]));
 const face=group(T,neck,'前额与五官',[0,-.94,-.57]);
 const eyes=[];
 for(const side of [-1,1]){
  const ear=group(T,face,'圆耳',[side*.206,1.240,.808]);ear.rotation.z=-side*.27;
  oval(ear,'厚耳缘',white,0,.033,0,.099,.100,.062);
  oval(ear,'耳窝',earInside,side*.005,.039,.051,.062,.066,.018);
  const eye=group(T,face,'杏形眼',[side*.220,1.088,1.074]);eye.rotation.y=side*.61;
  oval(eye,'深褐眼',coal,0,0,0,.047,.046,.030);oval(eye,'眼神光',light,-.011,.014,.025,.011,.011,.006);
  eyes.push(eye);
  tube(T,face,'口角',[[side*.08,.915,1.335],[side*.15,.902,1.246],[side*.187,.916,1.18]],.009,earInside,8);
 }
 oval(face,'宽黑鼻',nose,0,.967,1.341,.128,.077,.073);
 const jaw=group(T,face,'活动下颌',[0,.905,1.092]);
 oval(jaw,'下颌毛皮',white,0,-.025,.123,.117,.044,.17);
 oval(jaw,'嘴唇内侧',earInside,0,.001,.142,.099,.026,.131);
 const lips=group(T,jaw,'鱼头接触嘴唇的位置',[-.092,.006,.236]);
 for(const side of [-1,1])oval(face,'鼻孔',coal,side*.062,.968,1.390,.023,.014,.009);
 oval(pelvis,'小尾巴',white,0,.785,-1.011,.129,.127,.116);
 const legs=[];
 for(const side of [-1,1])for(const front of [false,true]){
  const x=side*(front?.234:.257),z=front?.40:-.64;
  const limb=group(T,bear,'蹠行的熊掌',[x,0,z]);
  const rings=[[.061,.078,.14],[.109,.112,.137],[.20,.104,.112],[.34,.102,.103],
   [.49,.135,.142],[.64,.151,.164],[.79,.164,.170],[.92,.121,.134]];
  const segments=24,pts=[],faces=[],colors=[];
  for(const [k,[y,w,d]] of rings.entries())for(let j=0;j<segments;j++){
   const a=j/segments*2*Math.PI;
   pts.push(w*Math.cos(a),y,d*Math.sin(a));
   const c=furColour(x,y,z);colors.push(c.r,c.g,c.b);
   if(k<rings.length-1){
    const n=k*segments+j,m=k*segments+(j+1)%segments;
    faces.push(n,n+segments,m,m,n+segments,m+segments);
   }
  }
  const skin=new T.BufferGeometry();skin.setAttribute('position',new T.Float32BufferAttribute(pts,3));
  skin.setAttribute('color',new T.Float32BufferAttribute(colors,3));skin.setIndex(faces);skin.computeVertexNormals();
  mesh(T,limb,'从肩到踝的毛皮',skin,fur);
  const paw=group(T,limb,'厚实的足掌');oval(paw,'掌',white,0,.068,.044,.135,.073,.20);
  for(let n=-1;n<=1;n++)oval(paw,'趾尖',shadow,n*.052,.048,.218-Math.abs(n)*.017,.013,.011,.026);
  legs.push({front,side,skin,paw,pts,rings,segments});
 }
 const focus=group(T,face,'额前点击位置',[0,1.06,1.105]);
 const foodAtLips=new T.Vector3(),joint=new T.Vector3();
 function pose(s){
  bear.position.set(s.x,s.y,s.z);bear.rotation.y=s.yaw;
  const bob=.025*Math.sin(s.stride*2)*s.gait,shake=Math.sin(s.time*16)*s.shake;
  const lean=s.reach*(1-s.offer);
  pelvis.position.set(0,bob-.36*s.crouch-.087*lean+.009*Math.sin(s.time*1.73),.13*lean);
  pelvis.rotation.set(.38*lean,0,.066*shake-.07*lean);
  neck.rotation.set(-.24*s.sniff+.068*s.crouch+.36*s.reach+.18*s.offer,
   s.look+.19*shake-.27*s.offer,.085*shake-.09*s.reach);
  jaw.rotation.x=.58*s.bite;
  if(s.offer>0){
   bear.worldToLocal(lips.getWorldPosition(foodAtLips));
   foodAtLips.x-=.48*s.mealScale;
  }
  for(const eye of eyes)eye.scale.y=blink(s.time+.55,4.7);
  for(const {side,front,skin,paw,pts,rings,segments} of legs){
   const phase=s.stride+(side>0?Math.PI:0)+(front?.42:2.93);
   const scoop=front&&side===-1;
   const reach=scoop?s.reach:0,offer=scoop?s.offer:0,dip=scoop?s.dip:0;
   const dx=mix(-.22*reach,foodAtLips.x+.234,offer);
   const delta=mix(Math.cos(phase)*.185*s.gait+.82*reach,foodAtLips.z-.50,offer);
   const lift=mix(Math.max(0,Math.sin(phase))*.125*s.gait+.12*reach-.81*dip,foodAtLips.y-.143,offer);
   paw.position.set(dx,lift,delta);
   // 只要熊探身，腿根就必须跟随肩胛或髋部；脚掌仍由冰面或捞鱼目标定位。
   const rootX=side*(front?.234:.257),rootZ=front?.40:-.64;
   joint.set(rootX,.78,rootZ).applyQuaternion(pelvis.quaternion).add(pelvis.position);
   const pos=skin.attributes.position;
   for(let k=0;k<rings.length;k++){
    const y=rings[k][0],top=S(.073,.78,y),mid=Math.sin(top*Math.PI);
    const dy=mix(lift,joint.y-.78,top);
    const dz=mix(delta,joint.z-rootZ,top)+(front?-.06:.077)*mid-.13*offer*mid;
    const shiftX=mix(dx,joint.x-rootX,top);
    for(let j=0;j<segments;j++){const i=k*segments+j;pos.setXYZ(i,pts[i*3]+shiftX,pts[i*3+1]+dy,pts[i*3+2]+dz);}
   }
   pos.needsUpdate=true;skin.computeVertexNormals();
  }
 }
 const fishingPaw=legs.find(leg=>leg.front&&leg.side===-1).paw;
 const grip=group(T,fishingPaw,'掌上托鱼的位置',[0,.143,.10]);
 return {root:bear,focus,pose,grip,lips,feet:legs.map(leg=>leg.paw)};
}

function fishingWater(root,bear){
 const swimmers=fishScale.map((_,i)=>makeSilverFry(root,i,{
  backColour:['#265b72','#356779','#2f6471'][i],bellyColour:'#b9d3d6',contrast:.95
 }));
 const foam=new T.MeshBasicMaterial({color:'#d3f6ec',transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide});
 function ring(name){
  const ripple=new T.Mesh(new T.RingGeometry(.88,1,44),foam.clone());
  ripple.rotation.x=-Math.PI/2;ripple.name=name;root.add(ripple);return ripple;
 }
 const splash=ring('熊掌拍水'),notice=ring('小鱼摆尾的水纹');
 const drops=group(T,root,'掌边的水珠');
 const dropMat=material('#a4dfdc');
 for(let i=0;i<8;i++)oval(drops,'水珠',dropMat,0,0,0,.029,.055,.029);
 const palm=new T.Vector3(),mouth=new T.Vector3(),forward=new T.Vector3(),fromLips=new T.Vector3();
 return {nodes:swimmers.map(f=>f.root),tick(state){
  bear.grip.getWorldPosition(palm);bear.lips.getWorldPosition(mouth);
  notice.visible=false;
  for(const f of state.fish){
   const actor=swimmers[f.index],model=actor.root;
   model.visible=f.mode!=='away'&&f.swallow<.999;
   if(!model.visible)continue;
   const size=fishScale[f.index]*f.size*(1-f.swallow);
   let yaw=f.yaw,roll=0;
   model.position.set(f.x,f.y,f.z);
   if(f.mode==='held'){
    // 鱼头朝向嘴角。托起时跟掌心走，嘴唇接住后以接触点为中心逐渐吞入。
    yaw=state.bear.yaw+Math.PI/2;roll=-.20;
    forward.set(Math.sin(yaw),0,Math.cos(yaw));
    model.position.copy(palm);
    if(f.swallow>0)model.position.copy(fromLips.copy(mouth).addScaledVector(forward,-.48*size));
   }
   model.rotation.set(0,yaw,roll,'YXZ');model.scale.set(size,size*.91,size);
   actor.pose({tail:Math.sin(state.time*(f.mode==='escape'?22:8)+f.index)*.71,time:state.time});
   const since=state.time-f.noticedAt;
   if(since>=0&&since<.7){
    notice.visible=true;notice.position.set(f.x,waterY-.02,f.z);
    notice.scale.setScalar(.16+since*.72);notice.material.opacity=.6*(1-since/.7);
   }
  }
  const t=state.splashAge;
  splash.visible=t<.78;drops.visible=t<.49;
  if(splash.visible){splash.position.copy(wetPaw);splash.scale.setScalar(.09+.91*t);splash.material.opacity=.78*(1-t/.78);}
  if(drops.visible)for(const [i,drop] of drops.children.entries()){
   const a=.21+i*.79,r=t*(.70+i%3*.21);
   drop.position.set(wetPaw.x+r*Math.cos(a),waterY+Math.max(0,t*(1.45+i%3*.27)-3.96*t*t),wetPaw.z+r*Math.sin(a));
   drop.scale.set(.029,.055,.029).multiplyScalar(1-t/.49);
  }
 }};
}

function surface(root,name,pts,faces,colors){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(faces);g.computeVertexNormals();
 const mat=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.89});
 return mesh(T,root,name,g,mat);
}
const whiteIce=new T.Color('#e4eee9'),cutIce=new T.Color('#94c1c9'),blueIce=new T.Color('#689aa9');
function floe(root,x,z,w,d,top,seed){
 const pts=[],cols=[],tri=[],n=64;
 for(const [row,[radius,y]] of [[.002,top],[.68,top],[.90,top-.014],[.985,top-.073],
  [1.00,mix(top,-.10,.49)],[.965,-.11],[.88,-.31]].entries()){
  for(let j=0;j<n;j++){
   const a=j*2*Math.PI/n,facet=1+.039*Math.sin(3*a+seed)+.042*Math.cos(a*5-seed)+.018*Math.sin(11*a+seed);
   const jag=.72*Math.sin(7*a+seed)+.28*Math.cos(13*a+seed);
   pts.push(x+w*radius*facet*Math.cos(a),y+(row>1?.041*jag:0),z+d*radius*facet*Math.sin(a));
   const c=paint.copy(whiteIce).lerp(cutIce,Math.min(1,row*.047+Math.max(0,row-2)*.29))
    .lerp(blueIce,smoothBand(row)*(.64+.16*jag));
   cols.push(c.r,c.g,c.b);
   if(row<6){const a=row*n+j,b=row*n+(j+1)%n;tri.push(a,b,a+n,b,b+n,a+n);}
  }
 }
 return surface(root,'雪面与蓝冰断层',pts,tri,cols);
}
function smoothBand(row){return S(3,6,row);}

function snowDen(root){
 const den=group(T,root,'雪丘中的洞口',[home.x,floor-.03,20.76]);
 const sides=40,pts=[],cols=[],tri=[];
 // 雪丘外壳、洞沿和弯进山里的内壁构成真实拱顶，熊可以从开口经过。
 const rows=[
  [-2.99,.20,.16,.38,0],[-2.78,1.00,.79,.32,0],[-2.19,1.83,1.70,.17,0],
  [-1.31,2.05,2.10,.04,0],[-.57,1.96,2.06,-.03,0],[-.11,1.70,1.93,-.08,0],
  [.055,1.43,1.66,-.04,.18],[.016,1.22,1.48,-.01,.48],[-.205,1.18,1.51,0,.73],
  [-.66,1.43,1.64,.02,.89],[-1.33,1.54,1.64,.07,.95],[-2.14,1.11,1.21,.13,.97],
  [-2.60,.32,.45,.17,.99],[-2.65,.004,.01,.17,1]
 ];
 const snowCap=new T.Color('#f2f4e8'),deepWall=new T.Color('#527789'),rim=new T.Color('#bad5da');
 for(const [i,[z,rx,ry,offset,deep]] of rows.entries())for(let j=0;j<=sides;j++){
  const a=Math.PI*j/sides,s=Math.sin(a),c=Math.cos(a),rough=1+.027*Math.sin(a*5+.65)+.018*Math.cos(a*9+z*1.1);
  const x=offset+c*rx*rough,y=s*ry*rough;
  pts.push(x,y,z+.14*c+.095*Math.sin(a*3+.2)*s+.036*Math.cos(a*7-z));
  const tone=paint.copy(rim).lerp(snowCap,.40+.59*s)
   .lerp(deepWall,deep*(.92+.08*(1-s)));
  cols.push(tone.r,tone.g,tone.b);
  if(i<rows.length-1&&j<sides){const idx=i*(sides+1)+j;tri.push(idx,idx+sides+1,idx+1,idx+1,idx+sides+1,idx+sides+2);}
 }
 const roof=surface(den,'凹入雪丘的洞壁',pts,tri,cols);
 const shadePts=[],shadeCols=[],shadeFaces=[],backSnow=new T.Color('#718d9c'),frontSnow=new T.Color('#e4eee9');
 for(let i=0;i<=8;i++)for(let j=0;j<=14;j++){
  const depth=i/8,side=j/7-1.0;
  shadePts.push(side*(.91+.23*depth),.032,-2.50+2.56*depth-.18*side*side);
  const tone=paint.copy(backSnow).lerp(frontSnow,S(.19,1,depth)*.96);
  shadeCols.push(tone.r,tone.g,tone.b);
  if(i<8&&j<14){const k=i*15+j;shadeFaces.push(k,k+15,k+1,k+1,k+15,k+16);}
 }
 surface(den,'从洞内过渡到白雪的阴影',shadePts,shadeFaces,shadeCols);
 // 冰晶留在洞沿外侧，让出鼻尖和爪子的进出路线。
 for(const [i,[x,y,h]] of [[1.35,.87,.28],[1.21,1.11,.20],[-1.23,.99,.27],[-1.38,.69,.16]].entries()){
  const shard=mesh(T,den,'洞沿透蓝的短冰柱',new T.ConeGeometry(.063,h,6),material(i%2?'#c3e2e2':'#b2d6df'),
   [x,y-.11,.054]);shard.rotation.z=Math.PI+(i-1)*.032;
 }
 return roof;
}
function underIce(root){
 const geometry=new T.PlaneGeometry(70,68);geometry.rotateX(-Math.PI/2);
 const water=new T.ShaderMaterial({
  uniforms:{clock:{value:0},dim:{value:0}},vertexShader:`varying vec2 p;
  void main(){vec4 w=modelMatrix*vec4(position,1.);p=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`varying vec2 p;uniform float clock,dim;
  void main(){float l=sin(p.y*11.+sin(p.x*1.71+clock*.47)*.82-clock*.91);
  float glint=pow(max(l,0.),15.)*smoothstep(.24,.90,cos(p.x*1.5-p.y*2.19+clock*.5));
  vec3 blue=mix(vec3(.345,.647,.697),vec3(.47,.73,.75),.5+.5*cos(p.y*.39-p.x*.14));
  gl_FragColor=vec4((blue+glint*.085)*(1.-dim*.55),1.);}`
 });
 const sheet=mesh(T,root,'浮冰之间的水',geometry,water,[43.7,-.14,45.7]);sheet.castShadow=false;
 sheet.rotation.y=-.16;
 return sheet;
}
function pawprints(root,feet){
 const pad=(x,z,w,d)=>{const outline=new T.Shape();outline.absellipse(x,-z,w,d,0,Math.PI*2,false,0);return outline;};
 const contours=[pad(0,0,.085,.095)];
 for(let i=0;i<5;i++){const x=(i-2)*.037;contours.push(pad(x,.106-Math.abs(x)*.43,.017,.026));}
 const stampShape=new T.ShapeGeometry(contours,8);stampShape.rotateX(-Math.PI/2);
 const footprint=new T.Mesh(stampShape,material('#b0c7c7'));footprint.name='雪地里的五趾掌印';
 const prints=Array.from({length:18},()=>{const stamp=footprint.clone();root.add(stamp);stamp.visible=false;return stamp;});
 const grounded=feet.map(()=>true),previous=feet.map(()=>new T.Vector3()),p=new T.Vector3();
 let next=0,last=-1;
 return state=>{
  if(last===state.time)return;
  last=state.time;
  for(const print of prints)if(print.visible){const age=state.time-print.userData.landed;
   print.scale.setScalar(1-.60*S(4.5,7,age));if(age>7)print.visible=false;}
  for(const [index,foot] of feet.entries()){
   foot.getWorldPosition(p);
   const down=p.y-floor<.022;
   if(!down&&grounded[index]&&state.progress>.19&&state.gait>.30){
    const stamp=prints[next++%prints.length];stamp.visible=true;stamp.position.copy(previous[index]);
    stamp.position.y=floor+.0035;stamp.rotation.y=state.yaw;stamp.scale.setScalar(1);
    stamp.userData.landed=state.time;
   }
   grounded[index]=down;previous[index].copy(p);
  }
 };
}
export function makeIceDiorama(scene){
 const root=group(T,scene,'浮冰岸'),water=underIce(root);
 floe(root,43.44,21.50,4.83,3.89,floor,1.25);
 for(const [x,z,w,d,h,seed] of [
  [38.1,22.3,.95,.67,.22,1],[38.75,23.7,.46,.33,.15,3.7],[47.96,24.35,.95,.60,.24,4.1],
  [46.93,17.19,1.21,.71,.29,1.9],[40.7,16.64,1.56,.69,.41,2.8],
  [43.09,25.92,.89,.31,.15,5.1],[48.81,22.10,.64,.33,.09,2]
 ])floe(root,x,z,w,d,h,seed);
 const cave=snowDen(root),bear=polarBear(root);
 const fishing=fishingWater(root,bear);
 const printPaws=pawprints(root,bear.feet);
 const iceLight=new T.HemisphereLight('#c7e5ed','#8faebe',1.04);root.add(iceLight);
 const chips=group(T,root,'雪边风刻');
 for(const [i,[x,z,w]] of [[46.38,21.13,.34],[46.67,21.25,.16],[40.20,22.69,.24],[40.43,22.81,.10]].entries()){
  const rock=oval(chips,'冰露出雪面',stone,x,.50,z,w,.043,w*.56);rock.rotation.y=i*.84;
 }
 const drift=material('#d1e3e3');
 for(const [i,[x,z,w]] of [[41.14,23.21,1],[44.87,20.62,.75],[43.25,24.18,.48]].entries()){
  tube(T,root,'风吹出的雪纹',[[x-.52*w,floor+.003,z],[x-.18*w,floor+.019,z-.08],
   [x+.21*w,floor+.014,z-.043],[x+.57*w,floor+.003,z+.076]],.013-i*.001,drift,12);
 }
 bear.pose(createIce().bear);
 return {root,hintNodes:{cave,bear:bear.root,fish:fishing.nodes},setMapMode(on){water.visible=iceLight.visible=!on;},
  bearScreenPoint(v){return bear.focus.getWorldPosition(v);},
  tick(state,night=0,shade=0){
   bear.pose(state.bear);printPaws(state.bear);fishing.tick(state);
   iceLight.intensity=1.04*(1-night*.80-shade*.12);
   water.material.uniforms.clock.value=state.time;water.material.uniforms.dim.value=night+.16*shade;
  }
 };
}
