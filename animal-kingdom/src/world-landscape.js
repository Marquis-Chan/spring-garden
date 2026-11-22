import * as T from 'three';
import {groundHeight} from './diorama.js';
import {bounds} from './state.js';
import {riverPoints} from './river-state.js';
import {coastLandHeight} from './coast-diorama.js';

const smooth=(a,b,v)=>T.MathUtils.smoothstep(v,a,b);
const mix=T.MathUtils.lerp;
// 一块连续的地表托住原来的动物和道具。海水下面留出鱼和海马真实的游动空间。
function shoreline(x){
 return 14.30-.81*Math.max(0,x-40.3)-.034*Math.max(0,x-40.3)**2+
  11*(1-smooth(15,34,x))+1.75*Math.cos(x*.32)*(1-smooth(28,34,x))+
  .22*Math.sin(x*.84)*(1-smooth(32,34,x));
}
export function worldSurfaceHeight(x,z){
 const inland=groundHeight(x,z),shore=smooth(10,12.1,z)*smooth(30.8,33,x);
 const coast=mix(inland,coastLandHeight(x,z),shore);
 return mix(coast,-.064,smooth(-.1,2.2,z-shoreline(x)));
}
const trails=[
 [[4,3.5],[6.2,3.9],[8.9,5.6],[12.3,6.1],[14.8,7.9],[19.2,8.6],[22.8,9.2],[24.1,9.55]],
 [[10.8,-.2],[13.2,.9],[15.8,.3],[18.8,1.6],[23,1.7],[26.8,1.9],[30.4,1.15],[33.7,2.1]],
 [[30.9,8.6],[31.7,9.9],[33.8,11.1],[34.2,12.3]],
 [[6.2,.3],[5.4,-2.6],[6.7,-5.2],[8.2,-7.4],[8.7,-8.5],[7.9,-9.3]],
 [[18.8,1.6],[18.2,-1.8],[19.6,-4.1],[20.3,-6.4],[19.7,-8.6],[20.5,-10.3]]
];
const segments=trails.flatMap(trail=>trail.slice(1).map(([x,z],i)=>{
 const [ax,az]=trail[i],dx=x-ax,dz=z-az;
 return {ax,az,dx,dz,length:dx*dx+dz*dz};
}));
function trailDistance(x,z){
 let best=Infinity;
 for(const {ax,az,dx,dz,length} of segments){
  const t=T.MathUtils.clamp(((x-ax)*dx+(z-az)*dz)/length,0,1);
  best=Math.min(best,Math.hypot(x-ax-t*dx,z-az-t*dz));
 }
 return best;
}
const color=hex=>new T.Color(hex);
const meadow=color('#93a869'),woods=color('#7c9f68'),dry=color('#c2b275'),bank=color('#94b09c');
const pasture=color('#759866'),paddockPath=color('#b8aa7c');
const trail=color('#cebf91'),sand=color('#dabf91'),wet=color('#a2b49b'),shallow=color('#72b6b2');
const blue=color('#4e9cae'),deep=color('#4d8f9d'),snowWater=color('#82bdc4');
const {pool}=riverPoints;
function paint(c,x,z){
 const wave=.60*Math.sin(x*.61+z*.38)+.40*Math.sin(z*1.02-x*.32);
 const pond=Math.hypot(x/bounds.x,(z-bounds.cz)/bounds.z);
 const marsh=Math.hypot((x-pool.x)/pool.rx,(z-pool.z)/pool.rz);
 c.copy(meadow).lerp(woods,smooth(7,17,x)*(1-smooth(1.9,4.8,z))*.91)
  .lerp(dry,smooth(12,16,x)*smooth(.6,4,z)*.86)
  .lerp(bank,(1-smooth(1.45,3.35,marsh))*.89);
 // 牧场中央留出低矮草坪，巡逻的小径缓缓弯向谷仓。
 const pastureWeight=1-smooth(.63,1.16,Math.hypot((x-6.5)/6.3,(z+12)/5.4));
 if(pastureWeight>0){
  c.lerp(pasture,pastureWeight*(.68+.16*wave));
  const lane=Math.abs(z+9.08-.18*Math.sin((x-6)*.67));
  c.lerp(paddockPath,pastureWeight*.51*(1-smooth(.12,.62,lane)));
 }
 c.lerp(trail,.32*(1-smooth(.12,.76+.14*wave,trailDistance(x,z))));
 c.lerp(sand,.70*(1-smooth(.93,1.14,pond))).lerp(shallow,1-smooth(.72,.96,pond));
 c.lerp(sand,.75*(1-smooth(.9,1.15,marsh))).lerp(shallow,1-smooth(.72,.98,marsh));
 const shore=z-shoreline(x);
 c.lerp(sand,smooth(-4.5,-1.35,shore))
  .lerp(wet,smooth(-.55,.15,shore))
  .lerp(shallow,smooth(-.05,.68,shore))
  .lerp(blue,smooth(.68,4.0,shore))
  .lerp(deep,smooth(46,55,x)*.76)
  .lerp(snowWater,(1-smooth(3.5,8.3,Math.hypot(x-43.6,z-22)))*.81);
 const sandbar=Math.exp(-((shore-.34+.14*wave)**2)/.031);
 return c.multiplyScalar(.985+wave*.032+sandbar*.10);
}

export function makeWorldLandscape(scene){
 const root=new T.Group();root.name='从溪谷到海湾';root.visible=false;scene.add(root);
 const along=306,across=160,xyz=[],colors=[],faces=[],c=new T.Color();
 for(let i=0;i<=along;i++){
  const x=mix(-32,87,i/along);
  const bambooValley=14*Math.exp(-((x-19)**2)/96);
  const ranchValley=15.7*Math.exp(-((x-6.4)**2)/109);
  const north=-7.2+1.2*Math.sin(x*.24-.80)+.55*Math.sin(x*.59)-smooth(35,49,x)*22-Math.max(bambooValley,ranchValley);
  const south=43+smooth(22,46,x)*20+.86*Math.cos(x*.29);
  for(let j=0;j<=across;j++){
   const z=mix(north,south,j/across);
   xyz.push(x,worldSurfaceHeight(x,z)-.003,z);
   paint(c,x,z);colors.push(c.r,c.g,c.b);
   if(i<along&&j<across){const k=i*(across+1)+j;faces.push(k,k+1,k+across+1,k+1,k+across+2,k+across+1);}
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(faces);geo.computeVertexNormals();
 const ground=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.92}));
 ground.receiveShadow=true;root.add(ground);
 return {root,ground};
}
