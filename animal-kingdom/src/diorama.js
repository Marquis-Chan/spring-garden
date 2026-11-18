import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {bounds,sites} from './state.js';
import {riverPoints} from './river-state.js';

const TAU=Math.PI*2;
const groundColors=['#708c55','#819d5b','#91a767','#b0b478','#a2ac68'].map(c=>new T.Color(c));
const sand=new T.Color('#a8ac77'), shallows=new T.Color('#68a08d'), deep=new T.Color('#3b8d84');
const dryGrass=new T.Color('#b8ac65');
const floodGrass=new T.Color('#969f68');
const bankMeadow=new T.Color('#86a383'),bankSand=new T.Color('#c3b488');
const woodlandGrass=new T.Color('#91a76c');
const rainforestGrass=new T.Color('#7a9c69');
const greens=['#5e884f','#729b55','#92ae52','#b2b969','#688448'];
const rockColors=['#9b9f84','#b1ac94','#c8bda2','#8c9a89','#999180'];
const stemColors=greens.map(color=>mat(color));
const stoneMaterials=rockColors.map(color=>mat(color));
function mat(color) {return new T.MeshStandardMaterial({color,roughness:.82});}
function add(parent,geo,material,x=0,y=0,z=0,shadows=true){
 const mesh=new T.Mesh(geo,material);
 mesh.position.set(x,y,z);mesh.castShadow=shadows;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
function seeded(seed){
 return ()=>{seed=Math.imul(1664525,seed)+1013904223|0;return (seed>>>0)/4294967296;};
}
const random=seeded(418);
function bankHeight(r,a){
 const coarse=.045*Math.sin(a*5+.5)+.04*Math.sin(a*9);
 const natural=-.56+.22*T.MathUtils.smoothstep(r,.38,.86)+.84*T.MathUtils.smoothstep(r,.92,1.16)+coarse*T.MathUtils.smoothstep(r,.98,1.12)
   -.105*T.MathUtils.smoothstep(r,1.36,1.92);
 const east=T.MathUtils.smoothstep(Math.cos(a)*bounds.x*r,4.91,7.19);
 const orchard=T.MathUtils.smoothstep(bounds.cz+Math.sin(a)*bounds.z*r,3.9,4.7);
 const x=Math.cos(a)*bounds.x*r,z=bounds.cz+Math.sin(a)*bounds.z*r;
 const {pool}=riverPoints;
 const bank=Math.hypot((x-pool.x)/pool.rx,(z-pool.z)/pool.rz);
 const bottom=.19+.32*T.MathUtils.smoothstep(bank,.44,1)+.11*T.MathUtils.smoothstep(bank,1,1.22);
 const river=T.MathUtils.smoothstep(x,22.8,24.04)*T.MathUtils.smoothstep(z,3.1,5.5);
 const base=T.MathUtils.lerp(T.MathUtils.lerp(natural,.38,Math.max(east,orchard)),bottom,river);
 const coast=T.MathUtils.smoothstep(x,30.6,33.05)*T.MathUtils.smoothstep(z,9.8,11.75);
 return T.MathUtils.lerp(base,.17,coast);
}
export function groundHeight(x,z){
 const px=x/bounds.x,pz=(z-bounds.cz)/bounds.z;
 return bankHeight(Math.hypot(px,pz),Math.atan2(pz,px));
}
function bank(scene){
 const resolution=128,rings=84,vertices=[],colors=[],triangles=[];
 for(let i=0;i<=rings;i++){
  for(let j=0;j<=resolution;j++){
   const a=j/resolution*TAU;
   const far=Math.pow(Math.max(0,-Math.sin(a)),.55);
   const east=Math.max(0,Math.cos(a))**2,tilt=Math.sin(a);
   const south=T.MathUtils.smoothstep(tilt,-.24,.13)*(6.65+5.8*T.MathUtils.smoothstep(tilt,.18,.70));
   const woodland=T.MathUtils.smoothstep(tilt,-.61,-.16)*(1-T.MathUtils.smoothstep(tilt,-.12,.25))*5.0;
   const eastReach=east*(south+woodland);
   const limit=i/rings;
   const r=limit<.48?.001+1.159*limit/.48:
    1.16+T.MathUtils.lerp(4.55+eastReach,.18,far)*((limit-.48)/.52)**1.32;
   const rough=r>T.MathUtils.lerp(.98,1.07,Math.sin(a*4)*.5+.5)?1+.009*Math.sin(a*17)+.012*Math.cos(a*6):1;
   const x=Math.cos(a)*bounds.x*r*rough,z=bounds.cz+Math.sin(a)*bounds.z*r*rough;
   const skyline=T.MathUtils.smoothstep(limit,.71,1)*far;
   vertices.push(x,bankHeight(r,a)+skyline*(.10+.10*Math.cos(a*8)),z);
   const blend=.52+.26*Math.sin(a*3+.6)+.13*Math.sin(2*x+.75*z)+.09*Math.cos(1.65*z-x);
   const n=T.MathUtils.clamp(blend*4,0,3.999);
   const color=groundColors[Math.floor(n)].clone().lerp(groundColors[Math.ceil(n)],n%1);
   color.lerp(sand,1-T.MathUtils.smoothstep(r,.96,1.11));
   color.lerp(shallows,1-T.MathUtils.smoothstep(r,.76,.99));
   color.lerp(deep,1-T.MathUtils.smoothstep(r,.36,.82));
   color.lerp(dryGrass,T.MathUtils.smoothstep(x,11,16)*(.76+.08*Math.sin(z*2)));
   const woodlandBank=T.MathUtils.smoothstep(x,16.4,17.8)*(1-T.MathUtils.smoothstep(x,24.6,27.2))*(1-T.MathUtils.smoothstep(z,1.8,4.30));
   color.lerp(woodlandGrass,woodlandBank*(.80+.09*Math.sin(x*1.46+z*2.0)));
   const rainforest=T.MathUtils.smoothstep(x,31.9,35.6)*(1-T.MathUtils.smoothstep(z,5.2,10));
   color.lerp(rainforestGrass,rainforest*(.76+.13*Math.cos(x*1.3+z*1.9)));
   const pool=riverPoints.pool,riverRadius=Math.hypot((x-pool.x)/pool.rx,(z-pool.z)/pool.rz);
   color.lerp(floodGrass,T.MathUtils.smoothstep(x,22,24)*(.54+.14*Math.cos(x*.83+z*.64)+.11*Math.sin(z*1.8-x*.52)));
   if(riverRadius<1.42)color.lerp(sand,1-T.MathUtils.smoothstep(riverRadius,.93,1.42));
   // 只在这一片河湾铺开湿润草甸和浅色泥岸，让暖灰色犀牛与背景分开。
   if(riverRadius<3.2){
    const meadow=(1-T.MathUtils.smoothstep(riverRadius,1.75,3.2))*T.MathUtils.smoothstep(riverRadius,.88,1.20);
    color.lerp(bankMeadow,meadow*(.77+.09*Math.cos(x*.75+z*.45)));
    color.lerp(bankSand,.67*(1-T.MathUtils.smoothstep(Math.abs(riverRadius-1.00),.04,.24)));
   }
   if(riverRadius<1.03)color.lerp(shallows,1-T.MathUtils.smoothstep(riverRadius,.68,1.03));
   colors.push(color.r,color.g,color.b);
   if(i<rings&&j<resolution){
    const k=i*(resolution+1)+j;
    triangles.push(k,k+1,k+resolution+1,k+1,k+resolution+2,k+resolution+1);
   }
  }
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geo.setIndex(triangles);geo.computeVertexNormals();
 return add(scene,geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.91}),0,0,0,false);
}
function shoreline(a,r=1){return [bounds.x*r*Math.cos(a),bankHeight(r,a),bounds.cz+bounds.z*r*Math.sin(a)];}
function stone(parent,x,y,z,sx,sy,sz,color,rot=0,ledge=false){
 const draft=new T.IcosahedronGeometry(1,3);
 draft.deleteAttribute('normal');draft.deleteAttribute('uv');
 const geo=mergeVertices(draft);
 draft.dispose();
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i);
  const uneven=1+.11*Math.sin(xx*6+zz*4)*Math.cos(yy*4-zz*5);
  p.setXYZ(i,xx*uneven,ledge?Math.min(yy*uneven,.78):yy*uneven,zz*uneven);
 }
 geo.computeVertexNormals();
 const m=add(parent,geo,stoneMaterials[color],x,y,z);
 m.scale.set(sx,sy,sz);m.rotation.y=rot;return m;
}
function stalk(parent,points,color,radius=.018,shadows=true){
 const curve=new T.QuadraticBezierCurve3(...points.map(p=>new T.Vector3(...p)));
 return add(parent,new T.TubeGeometry(curve,8,radius,6,false),color,0,0,0,shadows);
}
function blade(parent,x,y,z,h,bend,az,width,color){
 const vertices=[],indices=[];
 for(let i=0;i<=7;i++){
  const q=i/7,w=width*Math.sin(Math.PI*q)**.7;
  const b=bend*q*q,px=x+Math.cos(az)*b,pz=z+Math.sin(az)*b,Y=y+h*q*(1-.18*q);
  vertices.push(px-Math.sin(az)*w,Y,pz+Math.cos(az)*w,px,Y+.035*Math.sin(q*Math.PI),pz,
    px+Math.sin(az)*w,Y,pz-Math.cos(az)*w);
  if(i<7){const k=i*3;indices.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 return add(parent,geo,color,0,0,0,false);
}
const leafMaterials=greens.map(color=>new T.MeshStandardMaterial({color,roughness:.86,side:T.DoubleSide}));
const flowerColors=['#fff0cb','#eec2bb','#f5cf6e','#d0bdd8'].map(color=>mat(color));
const pollen=mat('#e6ac52'), cattail=mat('#8e674b');
const sphere=new T.SphereGeometry(1,14,9);
function flowers(parent,x,y,z,s,variant){
 const lean=(random()-.5)*.16*s, top=[x+lean,y+.46*s,z];
 stalk(parent,[[x,y,z],[x,y+.23*s,z],top],stemColors[0],.012*s,false);
 for(let i=0;i<5;i++){
  const a=i/5*TAU;
  const petal=add(parent,sphere,flowerColors[variant],top[0]+Math.cos(a)*.069*s,top[1],z+Math.sin(a)*.069*s,false);
  petal.scale.set(.059*s,.031*s,.037*s);petal.rotation.y=-a;
 }
 add(parent,sphere,pollen,top[0],top[1]+.021*s,z,false).scale.set(.044*s,.037*s,.044*s);
 blade(parent,x,y+.09*s,z,.18*s,.16*s,random()*6,.055*s,leafMaterials[1]);
}
function greenery(scene){
 const groups=[];
 for(const [index,a] of [3.42,3.86,4.50,5.34,5.85,.12,.83,1.83,2.57,2.89].entries()){
  const [x,y,z]=shoreline(a,1.10+random()*.10);
  const group=new T.Group();group.position.set(x,y,z);scene.add(group);groups.push(group);
  const back=Math.sin(a)<-.45;
  for(let b=0;b<(back?13:8);b++){
   const h=(back?.58:.31)+random()*(back?.91:.42);
   blade(group,(random()-.5)*.67,-.05,(random()-.5)*.38,h,.15+random()*.3,random()*TAU,.023+random()*.05,leafMaterials[(b+index)%5]);
  }
  if(index%4===1||index===6){
   for(let k=0;k<3;k++){
    const x0=(k-1)*.22,h=(back?1.02:.75)+random()*.31,dx=(k-1)*.13;
    stalk(group,[[x0,0,0],[x0,h*.4,0],[x0+dx,h,0]],stemColors[0],.016);
    const head=add(group,new T.CapsuleGeometry(.051,.18,4,10),cattail,x0+dx,h,0);
    head.rotation.z=-dx;
   }
  }
  if(index%3!==1){for(let k=0;k<3;k++)flowers(group,(k-1)*.18,0,.21+k*.085,.55+random()*.45,(index+k)%4);}
 }
 for(let i=0;i<24;i++){
  const a=random()*TAU,r=1.02+random()**2*.31;
  const [x,y,z]=shoreline(a,r),s=.045+random()**2*.28;
  stone(scene,x,y-s*.13,z,s*1.2,s*.54,s*.82,i%5,random()*TAU);
 }
 for(let i=0;i<15;i++){
  const a=random()*TAU;
  // 远岸的地形收在水边，把零星细草留在真实的土坡上。
  const radius=1.25+random()*.46;
  const [x,y,z]=shoreline(a,Math.sin(a)<-.45?1.18+(radius-1.25)*.18:radius);
  for(let j=0;j<4;j++)blade(scene,x+j*.068,y-.02,z,.10+random()*.2,.1,random()*TAU,.018,leafMaterials[j%5]);
 }
 return groups;
}
function pad(parent,x,y,z,r,angle,kind=0,notch=.21){
 const color=['#6e9b51','#849e58','#79974e'][kind%3];
 const shape=new T.Shape();
 for(let i=0;i<=68;i++){
  const a=.29+(TAU-.59)*i/68,R=r*(1+.038*Math.sin(a*7)+.014*Math.cos(a*13));
  const u=Math.cos(a)*R,v=Math.sin(a)*R*.88;
  if(i===0)shape.moveTo(u,v);else shape.lineTo(u,v);
 }
 shape.quadraticCurveTo(r*.62,-r*.14,r*notch,-r*.028);
 shape.quadraticCurveTo(r*Math.max(.42,notch+.08),r*.11,r*Math.cos(.29),r*Math.sin(.29)*.88);
 const group=new T.Group();group.position.set(x,y,z);group.rotation.y=angle;parent.add(group);
 const leaf=add(group,new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelThickness:.019,bevelSize:.018,bevelSegments:2,curveSegments:16,steps:1}),mat(color));
 leaf.rotation.x=-Math.PI/2;
 const vein=mat('#aac174');
 for(let i=0;i<8;i++){
  const a=.58+5.03*i/7,ex=Math.cos(a)*r*.80,ez=-Math.sin(a)*r*.72;
  stalk(group,[[r*.13,.076,0],[ex*.49,.076,ez*.42],[ex,.076,ez]],vein,.007,false);
 }
 return group;
}
function lily(group,x,z,s){
 const petals=['#ca8097','#df97a7','#f3bdba','#f5d7b3'].map(color=>mat(color));
 for(let ring=0;ring<3;ring++){
  const num=ring===2?6:9;
  for(let i=0;i<num;i++){
   const a=i/num*TAU+ring*.32,r=(.21-ring*.052)*s;
   const p=add(group,sphere,petals[ring],x+Math.cos(a)*r,.116+ring*.037*s,z+Math.sin(a)*r);
   p.scale.set(.15*s,.042*s,.069*s);
   p.rotation.order='YXZ';p.rotation.y=-a;p.rotation.z=.23+ring*.39;
  }
 }
 add(group,sphere,petals[3],x,.24*s+.07,z).scale.set(.087*s,.062*s,.087*s);
}
const waterVertex=`
 varying vec2 world;
 void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xz;gl_Position=projectionMatrix*viewMatrix*p;}
`;
const waterFragment=`
 precision highp float;
 uniform float time,night,shade;
 uniform vec4 waves[10];
 varying vec2 world;
 void main(){
  vec2 uv=(world-vec2(0.,.34))/vec2(4.53,3.13);
  float edge=length(uv);
  if(edge>1.003)discard;
  float a=sin(world.y*17.+world.x*1.03+sin(world.x*2.3+time*.54)*1.1-time*.71);
  float b=sin(world.x*4.3-world.y*2.6+time*.72);
  float fine=pow(max(0.,a),9.)*smoothstep(.03,.91,b);
  float farWeight=1.-smoothstep(-.9,1.9,world.y);
  float rim=smoothstep(.86,.995,edge);
  float basin=1.-smoothstep(.12,.93,edge);
  vec3 c=mix(vec3(.10,.43,.38),vec3(.28,.66,.58),farWeight*.51+.35);
  c=mix(c,vec3(.063,.28,.30),basin*.47);
  c=mix(c,vec3(.57,.70,.45),rim*.78);
  float rings=0.;
  for(int i=0;i<10;i++){
   float age=time-waves[i].z;
   float d=length(world-waves[i].xy);
   float r=.10+age*(.60+.24*waves[i].w);
   float d1=(d-r)/.044,d2=(d-r+.135)/.031;
   float band=exp(-d1*d1);
   float echo=exp(-d2*d2)*.33;
   rings+=waves[i].w*(band+echo)*max(0.,1.-age*.88)*step(0.,age);
  }
  float caustic=pow(max(0.,sin(world.x*6.+sin(world.y*6.+time*.62)*1.7)),9.)
   *pow(max(0.,sin(world.y*7.+sin(world.x*7.+time*.51)*1.4)),8.);
  float reflection=fine*(.19+.20*farWeight)+caustic*.14;
  c=mix(c,vec3(.91,.94,.71),clamp(reflection+rings*.59,0.,.83));
  c=mix(c,vec3(.14,.26,.37)+vec3(.15,.21,.20)*rings,night*.79);
  c*=1.-shade*.30;
  float opacity=.21+rim*.50+farWeight*.18+reflection*.41+rings*.65;
  gl_FragColor=vec4(c,clamp(opacity,0.,.91));
  #include <colorspace_fragment>
 }
`;
export function makeDiorama(scene){
 const land=bank(scene);
 for(let i=0;i<20;i++){
  const theta=random()*TAU,r=.59+random()*.28;
  const [x,y,z]=shoreline(theta,r);
  stone(scene,x,y+.01,z,.075+random()*.19,.034+random()*.057,.09+random()*.16,i%5,theta);
 }
 const waves=Array.from({length:10},()=>new T.Vector4(0,0,-99,0));
 const water=new T.ShaderMaterial({
  transparent:true,depthWrite:false,vertexShader:waterVertex,fragmentShader:waterFragment,
  uniforms:{time:{value:0},night:{value:0},shade:{value:0},waves:{value:waves}}
 });
 const surface=add(scene,new T.PlaneGeometry(9.13,6.34),water,0,.012,bounds.cz,false);
 surface.rotation.x=-Math.PI/2;surface.renderOrder=4;
 const rocks=new T.Group();scene.add(rocks);
 const a=sites[0];
 stone(rocks,a.x,-.022,a.z,1.06,.4,.78,2,.45,true);
 stone(rocks,a.x-.73,-.12,a.z-.24,.38,.21,.35,0,1.2);
 stone(rocks,a.x+.52,-.13,a.z+.42,.43,.20,.27,1,.8);
 const b=sites[1];
 const mainPad=pad(scene,b.x,.148,b.z,.97,-.65,0,.46);
 const leafMaterial=mainPad.children[0].material;
 leafMaterial.emissive.set('#bfce66');
 lily(mainPad,-.56,-.31,.64);
 const lilies=pad(scene,-2.9,.018,1.38,.69,.47,2);
 lily(lilies,-.10,-.06,.55);
 const nearLily=pad(scene,2.86,.023,-.95,.50,2.3,1);
 lily(nearLily,-.07,.04,.50);
 pad(scene,3.19,.024,-.52,.39,1.21,2);
 pad(scene,-3.24,.027,1.83,.36,3.7,1);
 const plants=greenery(scene);
 const sprayMaterial=new T.MeshStandardMaterial({color:'#c3ece0',emissive:'#46a892',emissiveIntensity:.23,roughness:.23});
 const sprayGroup=new T.Group();scene.add(sprayGroup);
 const dropGeometry=new T.SphereGeometry(1,10,7);
 const drops=Array.from({length:9},(_,i)=>{
  const m=add(sprayGroup,dropGeometry,sprayMaterial,0,0,0,false);
  return {m,a:2.7+i*.42,v:.68+(i%3)*.19,size:.033+(i%3)*.009};
 });
 sprayGroup.visible=false;
 let splashAt=-10;
 let w=0;
 return {
  hintNodes:{sites:[rocks,mainPad]},
  land,surface,tick(time,night,shade,quiet){
   water.uniforms.time.value=time;water.uniforms.night.value=night;water.uniforms.shade.value=shade;
   if(!quiet){for(const [i,p] of plants.entries())p.rotation.z=Math.sin(time*.85+i*1.77)*.035;}
   const age=time-splashAt;
   sprayGroup.visible=age>=0&&age<.48;
   if(sprayGroup.visible){for(const {m,a,v,size} of drops){
    const r=.76+age*v*1.43;
    m.position.set(Math.cos(a)*r,.026+Math.max(0,age*(1.42+v)-age*age*4.3),Math.sin(a)*r*.73);
    m.scale.set(size,size*(1.28+age),size);
   }}
  },
  ripple(x,z,time,strength=1){waves[w%waves.length].set(x,z,time,strength);w++;},
  splash(x,z,time){sprayGroup.position.set(x,0,z);splashAt=time;},
  touch(site,amount){mainPad.rotation.z=site===1?amount*.072:0;},
  leafHint(amount){leafMaterial.emissiveIntensity=amount;}
 };
}
