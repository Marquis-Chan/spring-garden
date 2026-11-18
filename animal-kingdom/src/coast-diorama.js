import * as T from 'three';
import {coastGroundHeight,coastPoints,coastWaterY} from './coast-state.js';
import {makeIntertidal,poolRadius} from './coast-tidepool.js';

const {lanes,waterEntryZ}=coastPoints;
export const rampPoint=i=>({x:lanes[i].ramp.x,z:13.82});
export const shoreStone=i=>({x:lanes[i].land.x+(i===0?-1:1)*.78,z:13.08});

export const coastLandHeight=(x,z)=>{
 const margin=Math.min(...lanes.map(lane=>Math.abs(x-lane.ramp.x)));
 const bend=T.MathUtils.smoothstep(margin,.58,1.4)*(.26*Math.sin(x*1.23)-.17*Math.cos(x*.9));
 return coastGroundHeight(z+bend)-.21*(1-T.MathUtils.smoothstep(poolRadius(x,z),.62,1.13));
};
const landY=coastLandHeight;
const finish=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.86,...extra});
const rockShape=new T.IcosahedronGeometry(1,2),pebbleShape=new T.SphereGeometry(1,14,9);
const stoneColors=['#83898b','#9c9e93','#a59b89','#696f77'].map(color=>finish(color));
const grassColors=['#8b9561','#a8a375','#757e58'].map(color=>finish(color));

function stone(root,x,y,z,scale,material,seed,shape=rockShape){
 const mesh=new T.Mesh(shape,material);
 mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.rotation.y=seed*2.39;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}

function terrain(root){
 const geometry=new T.PlaneGeometry(30,27,150,216);
 geometry.rotateX(-Math.PI/2);geometry.translate(37,0,21.8);
 const positions=geometry.attributes.position,colors=[];
 const sand=new T.Color('#dfbb91'),wet=new T.Color('#b39d83'),shelf=new T.Color('#60968d');
 const field=new T.Color('#b7a681'),tint=new T.Color();
 for(let n=0;n<positions.count;n++){
  const x=positions.getX(n),z=positions.getZ(n),y=landY(x,z);
  const dry=T.MathUtils.smoothstep(z,9.7,11.7);
  const tiny=.018*Math.sin(x*23.5-z*7.1)*Math.cos(z*17.7+x);
  positions.setY(n,y-(1-T.MathUtils.smoothstep(z,8.28,9.52))*.71);
  tint.copy(field).lerp(sand,dry).lerp(wet,1-T.MathUtils.smoothstep(y,.41,.62))
   .lerp(shelf,1-T.MathUtils.smoothstep(y,.25,.425));
  tint.multiplyScalar(.96+tiny+.025*Math.sin(x*1.54+z*.72));
  colors.push(tint.r,tint.g,tint.b);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,finish('#ffffff',{vertexColors:true}));mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}

function wornSlate(root,x,index){
 const z=13.79,rings=8,around=44,positions=[],colors=[],indices=[];
 const middle=new T.Color('#b7ada1'),edge=new T.Color('#858782'),tint=new T.Color();
 for(let ring=0;ring<=rings;ring++){
  const radius=ring/rings;
  for(let j=0;j<=around;j++){
   const a=j/around*Math.PI*2;
   const outline=1+.068*Math.sin(a*3+index)+.042*Math.cos(a*5+index*.6);
   const xx=x+Math.cos(a)*radius*.53*outline,zz=z+Math.sin(a)*radius*.70*outline;
   positions.push(xx,coastGroundHeight(zz)+.005,zz);
   const grain=.93+.035*Math.sin(zz*78+xx*6)+.036*Math.sin(zz*23-xx*13);
   tint.copy(middle).lerp(edge,T.MathUtils.smoothstep(radius,.57,1)).multiplyScalar(grain);
   colors.push(tint.r,tint.g,tint.b);
   if(ring<rings&&j<around){
    const n=ring*(around+1)+j,outer=n+around+1;
    indices.push(n,n+1,outer,n+1,outer+1,outer);
   }
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,finish('#fff',{vertexColors:true}));mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}

// 每只脚离开湿沙的那一刻，用上一帧真实着地点留下三趾蹼印。
function makeTracks(root){
 const outline=new T.Shape();
 outline.moveTo(-.039,.036);
 outline.quadraticCurveTo(-.059,.014,-.067,-.064);outline.lineTo(-.024,-.049);
 outline.lineTo(0,-.098);outline.lineTo(.019,-.054);outline.lineTo(.059,-.073);
 outline.quadraticCurveTo(.050,.025,.019,.040);outline.closePath();
 const shape=new T.ShapeGeometry(outline);shape.rotateX(-Math.PI/2);
 const prints=Array.from({length:12},()=>{const print=new T.Mesh(shape,new T.MeshBasicMaterial({
  color:'#997b60',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide
 }));print.visible=false;root.add(print);return print;});
 const last=Array.from({length:4},()=>({down:false,point:new T.Vector3()}));
 const sample=new T.Vector3();let slot=0;
 return (state,models)=>{
  for(const [index,p] of state.penguins.entries()){
   for(const [side,foot] of (models?.[index].feet??[]).entries()){
    const entry=last[index*2+side];
    if(!['waddle','approach','climb'].includes(p.phase)){entry.down=false;continue;}
    foot.getWorldPosition(sample);
    const ground=coastGroundHeight(sample.z),down=sample.y-ground<.018;
    if(!down&&entry.down&&entry.point.z<waterEntryZ-.07){
     const print=prints[slot++%prints.length];print.visible=true;print.userData.at=state.time;
     print.position.copy(entry.point);print.position.y=coastGroundHeight(print.position.z)+.009;
     print.rotation.set(sample.z>13?Math.atan(.18):0,p.yaw,0,'YXZ');
    }
    if(down)entry.point.copy(sample);entry.down=down;
   }
  }
  for(const print of prints)if(print.visible){
   const age=state.time-print.userData.at;
   print.material.opacity=.43*(1-T.MathUtils.smoothstep(age,.5,2.4));
   print.visible=age<2.4;
  }
 };
}

function tide(root){
 const uniforms={time:{value:0},light:{value:1},dim:{value:0},mapMode:{value:0},fronts:{value:Array.from({length:4},()=>new T.Vector4(0,0,-9,0))},
  taps:{value:Array.from({length:2},()=>new T.Vector3(0,0,-10))}};
 const material=new T.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,
  vertexShader:`varying vec2 world;
   void main(){
    world=(modelMatrix*vec4(position,1.)).xz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }`,
  fragmentShader:`varying vec2 world;
   uniform float time,light,dim,mapMode;
   uniform vec4 fronts[4];
   uniform vec3 taps[2];
   void main(){
    float deep=smoothstep(14.24,18.7,world.y);
    float drift=sin(world.x*.63+time*.85)*.12+sin(world.x*1.72-time*.52)*.051;
    float bars=sin((world.y+drift)*12.-1.59*time+sin(world.x*1.33)*.53);
    float surf=(1.-smoothstep(.05,.74,abs(world.y+drift-14.44)))*smoothstep(.32,.93,bars);
    float line=sin(world.x*5.1+world.y*3.6+time*.45)+sin(world.x*2.7-world.y*6.3-time*.63)+.52*sin(world.y*8.1+world.x*1.4);
    float lace=(1.-smoothstep(.04,.20,abs(line)))*.10*(1.-deep);
    float trace=smoothstep(.89,1.,bars)*(.045+.045*sin(world.x*2.26+world.y))+lace;
    float ring=0.;
    for(int j=0;j<4;j++){
     vec4 w=fronts[j];
     float d=length(world-w.xy);
     float beat=1.-smoothstep(.018,.072,abs(d-w.z));
     float echo=(1.-smoothstep(.019,.055,abs(d-w.z+.16)))*.48;
     ring+=w.w*(beat+echo)*(1.-smoothstep(1.20,2.65,d));
    }
    for(int j=0;j<2;j++){
     float age=time-taps[j].z;
     float distances=abs(distance(world,taps[j].xy)-age*1.42);
     ring+=step(0.,age)*(1.-smoothstep(.33,.89,age))*(1.-smoothstep(.017,.071,distances))*.78;
    }
    vec3 daytime=mix(vec3(.40,.78,.68),vec3(.09,.43,.57),deep);
    vec3 nighttime=mix(vec3(.13,.26,.31),vec3(.07,.17,.27),deep);
    vec3 color=mix(nighttime,daytime,light)*(1.-dim*.27)+vec3(.76,.89,.83)*(surf*.27+trace+ring*.35);
    float bay=1.-smoothstep(.68,1.,length((world-vec2(36.9,15.4))/vec2(6.4,5.6)));
    float clearShelf=1.-smoothstep(.67,1.30,length((world-vec2(36.65,17.56))/vec2(4.05,1.50)));
    float detailAlpha=min(.93,(.28+.54*deep)*(1.-.57*clearShelf)+surf*.23+ring*.36);
    gl_FragColor=vec4(mix(color,vec3(.76,.89,.84)*(1.-dim*.4),mapMode),
     mix(detailAlpha,bay*(surf*.27+trace*.61+ring*.48),mapMode));
   }`
 });
 const mesh=new T.Mesh(new T.PlaneGeometry(30,22),material);
 mesh.position.set(37,coastWaterY,24.15);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;
 root.add(mesh);return uniforms;
}

export function makeCoastDiorama(scene){
 const root=new T.Group();root.name='海岸';scene.add(root);
 const sandbar=terrain(root);
 const ramps=lanes.map((lane,i)=>wornSlate(root,lane.ramp.x,i));
 for(const [i,[x,z,w,h,d]] of [
  [33.44,13.4,.39,.22,.53],[40.12,13.79,.64,.32,.42],
  [40.77,14.5,.57,.37,.94],[32.98,14.92,.49,.15,.32],[39.73,16.65,.46,.15,.45]
 ].entries()){
  const y=landY(x,z);
  stone(root,x,y-h*.12,z,[w,h,d],stoneColors[i%4],i);
 }
 const intertidal=makeIntertidal(root,landY);
 const stones=lanes.map((_,i)=>{
  const {x,z}=shoreStone(i);
  const home=stone(root,x,landY(x,z)+.042,z,[.34,.155,.29],stoneColors[1],i+.6,pebbleShape);
  stone(root,x-.32,landY(x-.32,z)+.012,z+.15,[.14,.076,.12],stoneColors[2],i,pebbleShape);
  return home;
 });
 for(const [i,[x,z]] of [[33.45,12.23],[35.99,12.22],[36.70,12.10],[37.05,11.4],[39.58,12.13],[40.64,12.56],[40.15,11.60],[34.41,11.91]].entries()){
  for(let j=0;j<6;j++){
   const a=i*1.42+j*2.39,r=.055+.019*j,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
   const blade=stone(root,px,landY(px,pz)+.10,pz,[.029,.16+j*.021,.043],grassColors[j%3],j,pebbleShape);
   blade.rotation.z=Math.sin(a)*.36;blade.rotation.x=Math.cos(a)*.49;
  }
 }
 const water=tide(root),foam=finish('#cde7db',{roughness:.66}),drawTracks=makeTracks(root);
 let tapIndex=0;
 const sprays=lanes.map(()=>Array.from({length:9},(_,i)=>{
  const p=stone(root,0,0,0,[.019+i*.001,.035,.020],foam,i,pebbleShape);
  p.castShadow=false;p.visible=false;return p;
 }));
 return {
  root,hintNodes:{stones,ramps,crab:intertidal.crab.root,pool:intertidal.water,kelp:intertidal.kelp.map(p=>p.root),fry:intertidal.fry.map(f=>f.root)},
  setMapMode(on){sandbar.visible=!on;water.mapMode.value=Number(on);},
  ripple(x,z,time){water.taps.value[tapIndex++%2].set(x,z,time);},
  tick(state,night,shade,penguins){
   intertidal.tick(state);
   drawTracks(state,penguins);
   water.time.value=state.time;water.light.value=1-night;water.dim.value=shade;
   const waves=state.waves.slice(-4);
   water.fronts.value.forEach((p,i)=>{
    const w=waves[i];
    if(w)p.set(w.x,w.z,w.radius,w.maxRadius?Math.max(0,1-w.radius/w.maxRadius)*.90:.5);
    else p.set(0,0,-9,0);
   });
   sprays.forEach((spray,i)=>{
    const wave=state.waves.findLast(w=>w.index===i&&w.id!==undefined);
    const seconds=wave?wave.radius/wave.speed:1;
    spray.forEach((drop,j)=>{
     drop.visible=seconds>=0&&seconds<.48;
     if(!drop.visible)return;
     const angle=j*2.39,r=seconds*(.87+j*.11),rise=Math.sin(seconds*Math.PI/.48)*(.24+j*.024);
     drop.position.set(wave.x+Math.cos(angle)*r,coastWaterY+rise,wave.z+Math.sin(angle)*r);
    });
   });
  }
 };
}

export function isCoastWater(x,z){
 return x>22&&x<52&&z>=waterEntryZ&&z<35.15&&landY(x,z)<coastWaterY;
}
