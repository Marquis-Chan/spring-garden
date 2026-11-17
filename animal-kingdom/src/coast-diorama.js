import * as T from 'three';
import {coastGroundHeight,coastPoints,coastWaterY} from './coast-state.js';

const {lanes,waterEntryZ}=coastPoints;
export const rampPoint=i=>({x:lanes[i].ramp.x,z:13.82});
export const shoreStone=i=>({x:lanes[i].land.x+(i===0?-1:1)*.78,z:13.08});

const landY=(x,z)=>{
 const margin=Math.min(...lanes.map(lane=>Math.abs(x-lane.ramp.x)));
 const bend=T.MathUtils.smoothstep(margin,.58,1.4)*(.26*Math.sin(x*1.23)-.17*Math.cos(x*.9));
 return coastGroundHeight(z+bend);
};
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
 const sand=new T.Color('#d6b891'),wet=new T.Color('#b4a28a'),shelf=new T.Color('#699795');
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
}

function wornSlate(root,x,index){
 const z=13.79,rings=8,around=44,positions=[],colors=[],indices=[];
 const middle=new T.Color('#a9a8a0'),edge=new T.Color('#807e76'),tint=new T.Color();
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

function tide(root){
 const uniforms={time:{value:0},light:{value:1},dim:{value:0},fronts:{value:Array.from({length:4},()=>new T.Vector4(0,0,-9,0))},
  taps:{value:Array.from({length:2},()=>new T.Vector3(0,0,-10))}};
 const material=new T.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,
  vertexShader:`varying vec2 world;
   void main(){
    world=(modelMatrix*vec4(position,1.)).xz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }`,
  fragmentShader:`varying vec2 world;
   uniform float time,light,dim;
   uniform vec4 fronts[4];
   uniform vec3 taps[2];
   void main(){
    float deep=smoothstep(14.24,18.7,world.y);
    float drift=sin(world.x*.63+time*.85)*.12+sin(world.x*1.72-time*.52)*.051;
    float bars=sin((world.y+drift)*12.-1.59*time+sin(world.x*1.33)*.53);
    float surf=(1.-smoothstep(.05,.74,abs(world.y+drift-14.44)))*smoothstep(.32,.93,bars);
    float trace=smoothstep(.89,1.,bars)*(.05+.05*sin(world.x*2.26+world.y));
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
    vec3 daytime=mix(vec3(.47,.75,.69),vec3(.11,.47,.60),deep);
    vec3 nighttime=mix(vec3(.13,.26,.31),vec3(.07,.17,.27),deep);
    vec3 color=mix(nighttime,daytime,light)*(1.-dim*.27)+vec3(.76,.89,.83)*(surf*.27+trace+ring*.35);
    gl_FragColor=vec4(color,min(.93,.28+.54*deep+surf*.23+ring*.36));
   }`
 });
 const mesh=new T.Mesh(new T.PlaneGeometry(30,22),material);
 mesh.position.set(37,coastWaterY,24.15);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;
 root.add(mesh);return uniforms;
}

export function makeCoastDiorama(scene){
 const root=new T.Group();root.name='海岸';scene.add(root);
 terrain(root);
 const ramps=lanes.map((lane,i)=>wornSlate(root,lane.ramp.x,i));
 for(const [i,[x,z,w,h,d]] of [
  [32.91,10.83,1.75,.86,1.07],[34.04,9.75,1.40,1.06,.98],[35.03,10.19,.84,.60,.80],
  [36.81,10.69,1.05,.44,.78],[38.87,10.04,.89,.54,.91],[40.37,10.34,1.48,.89,1.12],[41.67,11.03,1.43,.53,.90],
  [33.44,13.4,.39,.22,.53],[36.61,13.49,.42,.25,.49],[36.96,13.82,.36,.16,.49],[40.12,13.79,.64,.32,.42],
  [40.77,14.5,.57,.37,.94],[32.98,14.92,.49,.15,.32],[39.73,16.65,.46,.15,.45]
 ].entries()){
  const y=landY(x,z);
  stone(root,x,y+h*.18,z,[w,h,d],stoneColors[i%4],i);
  if(h>.48)stone(root,x+w*.29,y+h*.64,z-.12,[w*.73,h*.41,d*.78],stoneColors[(i+1)%4],i+.2);
 }
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
 const water=tide(root),foam=finish('#cde7db',{roughness:.66});
 let tapIndex=0;
 const sprays=lanes.map(()=>Array.from({length:9},(_,i)=>{
  const p=stone(root,0,0,0,[.019+i*.001,.035,.020],foam,i,pebbleShape);
  p.castShadow=false;p.visible=false;return p;
 }));
 return {
  root,hintNodes:{stones,ramps},
  ripple(x,z,time){water.taps.value[tapIndex++%2].set(x,z,time);},
  tick(state,night,shade){
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
