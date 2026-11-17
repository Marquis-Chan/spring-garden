import * as T from 'three';
import {groundHeight} from './diorama.js';
import {portals} from './map-view.js';

const wood=['#71503b','#916449','#ad7c52'].map(c=>new T.Color(c));
const canopy=['#6b8b59','#81a45d','#99ae62','#659477'].map(c=>new T.Color(c));
const clay=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.88,...options});
const bark=clay('#ffffff',{vertexColors:true});
const leaves=clay('#ffffff',{vertexColors:true});
const pebble=clay('#c7bda0');
const orb=new T.IcosahedronGeometry(1,3);
const twig=clay('#8b7744');
const grassColors=['#678850','#7e9b53','#9eb266','#bcc181'].map(c=>clay(c,{side:T.DoubleSide}));
const seeds=clay('#dcbd76');
const mossMap=makeMossMap();
const mossColors=['#577d3d','#789b50','#7e9f4d','#beb477'].map(color=>clay(color,{
 map:mossMap,transparent:true,depthWrite:false,opacity:.46
}));
let sequence=8107;
function random(){sequence=Math.imul(sequence,1664525)+1013904223|0;return (sequence>>>0)/4294967296;}
function add(root,geo,material,x=0,y=0,z=0,shadow=true){
 const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;
 root.add(m);return m;
}
function blob(root,x,y,z,scale,mat=pebble,geometry=orb,shadow=true){
 const m=add(root,geometry,mat,x,y,z,shadow);m.scale.set(...scale);m.rotation.y=random()*Math.PI;
 return m;
}
function buildGeometry(vertices,faces,colors){
 const result=new T.BufferGeometry();
 result.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 if(colors)result.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 result.setIndex(faces);result.computeVertexNormals();return result;
}
function curve(points){return new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));}
// 每根枝条连着树干，用实际粗细托住鸟的两只脚。
export function branch(root,points,bottom,tip,steps=20){
 const path=curve(points),vertices=[],faces=[],colors=[];
 const frames=path.computeFrenetFrames(steps,false);
 const sides=18,stripe=new T.Color();
 for(let i=0;i<=steps;i++){
  const q=i/steps,c=path.getPointAt(q),u=frames.normals[i],v=frames.binormals[i];
  const radius=T.MathUtils.lerp(bottom,tip,q)*(1+.15*Math.exp(-q*11));
  for(let j=0;j<sides;j++){
   const a=j*Math.PI*2/sides,r=radius*(1+.09*Math.cos(a*5)+.04*Math.sin(a*3+q*4));
   const edge=c.clone().addScaledVector(u,Math.cos(a)*r).addScaledVector(v,Math.sin(a)*r);
   vertices.push(edge.x,edge.y,edge.z);
   stripe.copy(wood[0]).lerp(wood[2],.36+.18*Math.cos(a*4+q*1.7)+.13*Math.sin(a*9+q*4));
   colors.push(stripe.r,stripe.g,stripe.b);
   if(i<steps){const k=i*sides+j,n=i*sides+(j+1)%sides;faces.push(k,n,k+sides,n,n+sides,k+sides);}
  }
 }
 for(const last of [false,true]){
  const k=vertices.length/3,at=path.getPointAt(last?1:0),offset=last?steps*sides:0;
  vertices.push(at.x,at.y,at.z);colors.push(wood[0].r,wood[0].g,wood[0].b);
  for(let j=0;j<sides;j++){
   const i=offset+j,n=offset+(j+1)%sides;
   if(last)faces.push(k,i,n);else faces.push(k,n,i);
  }
 }
 return add(root,buildGeometry(vertices,faces,colors),bark);
}
export function crownGeometry(variant){
 const g=new T.SphereGeometry(1,24,16),p=g.attributes.position,colors=[];
 const color=new T.Color();
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const r=1+.063*Math.sin(x*7+z*6+variant)*Math.cos(y*7-z*4)+.039*Math.cos(y*9+x*5);
  p.setXYZ(i,x*r,y*r,z*r);
  color.copy(canopy[variant%4]).lerp(canopy[(variant+2)%4],.18+.15*y);
  color.multiplyScalar(1+.13*y+.025*Math.sin(x*11+z*8));
  colors.push(color.r,color.g,color.b);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
const crowns=Array.from({length:4},(_,i)=>crownGeometry(i));
function tree(root,x,z,h,hero=false){
 const y=groundHeight(x,z)-.024,f=h/4.3;
 branch(root,[[x,y,z],[x+.06,y+h*.29,z+.01],[x-.12,y+h*.62,z-.07],[x+.14,y+h,z-.12]],f*.46,f*.10);
 branch(root,[[x,y+.52*f,z],[x-1.0*f,y+.08,z+.41*f],[x-1.25*f,y+.012,z+.52*f]],f*.20,.013);
 branch(root,[[x,y+.40*f,z+.06],[x+.76*f,y+.055,z+.48*f],[x+.98*f,y+.009,z+.64*f]],f*.17,.014);
 if(hero){
  branch(root,[[x,y+1.28,z],[11.10,1.96,-2.27],[10.66,2.08,-1.45],[10.12,2.163,-.95],[9.59,2.18,-.91]],.27,.041);
  branch(root,[[x,y+1.66,z],[11.57,2.24,-2.43],[11.77,2.29,-1.82],[12.13,2.317,-1.38],[12.66,2.36,-1.30]],.24,.046);
  branch(root,[[x-.06,y+h*.69,z],[x-.36,y+h*.84,z+.10],[x-.80,y+h*.94,z+.28]],.19,.044);
 }else{
  branch(root,[[x,y+h*.43,z],[x+.65*f,y+h*.64,z+.22*f],[x+1.12*f,y+h*.75,z+.20*f]],.21*f,.044);
 }
 const shapes=[[-.83,.94,.1,1.37,.76,.95],[.77,.93,.07,1.34,.70,1.06],[.05,1.08,-.20,1.38,.76,.97],
  [-1.38,.83,-.12,1.01,.58,.86],[1.42,.82,-.30,.99,.56,.78],[-.17,.84,-.65,1.76,.65,.89]];
 for(const [i,[dx,dy,dz,sx,sy,sz]] of shapes.entries()){
  blob(root,x+dx*f,y+dy*h,z+dz*f,[sx*f,sy*f,sz*f],leaves,crowns[i%4],hero&&i%2===0);
 }
}
export function pathStrip(root,points,width,color,lift){
 const trace=curve(points.map(([x,z])=>[x,0,z])),positions=[],faces=[],colors=[];
 const rim=new T.Color(color).lerp(new T.Color('#8eaa66'),.65),middle=new T.Color(color);
 const stride=7;
 for(let i=0;i<=60;i++){
  const t=i/60,at=trace.getPointAt(t),dir=trace.getTangentAt(t);
  const r=width*(.84+.13*Math.sin(t*12)+.09*Math.cos(t*19))*Math.min(1,.38+(1-t)*14);
  for(let j=0;j<stride;j++){
   const q=j/3-1,x=at.x-dir.z*q*r,z=at.z+dir.x*q*r;
   const h=lift+.019*(1-q*q);
   positions.push(x,groundHeight(x,z)+h,z);
   const shade=middle.clone().lerp(rim,Math.abs(q)**2).multiplyScalar(.95+.055*Math.sin(x*2.5+z*6));
   colors.push(shade.r,shade.g,shade.b);
   if(i<60&&j<stride-1){
    const k=i*stride+j;
    faces.push(k,k+1,k+stride,k+1,k+stride+1,k+stride);
   }
  }
 }
 add(root,buildGeometry(positions,faces,colors),clay('#ffffff',{vertexColors:true}),0,0,0,false);
}
function blade(root,x,z,height,width,lean,angle,material){
 const v=[],f=[];
 for(let i=0;i<=8;i++){
  const q=i/8,w=width*Math.sin(Math.PI*q)**.61,d=lean*q*q;
  const px=x+Math.cos(angle)*d,pz=z+Math.sin(angle)*d;
  for(let j=-1;j<=1;j++)v.push(px+Math.sin(angle)*w*j,q*height*(1-.09*q)+.022*(1-Math.abs(j))*q,pz-Math.cos(angle)*w*j);
  if(i<8){const k=i*3;f.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
 }
 add(root,buildGeometry(v,f),material,0,0,0,false);
}
function makeMossMap(){
 const side=64,rgba=new Uint8Array(side*side*4);
 for(let j=0;j<side;j++)for(let i=0;i<side;i++){
  const x=i/(side-1)*2-1,z=j/(side-1)*2-1,k=(j*side+i)*4;
  const r=Math.hypot(x,z)+.07*Math.sin(x*9+z*12)*Math.sin(z*9-x*6);
  rgba[k]=rgba[k+1]=rgba[k+2]=248;
  rgba[k+3]=Math.round(255*(1-T.MathUtils.smoothstep(r,.18,.99)));
 }
 const out=new T.DataTexture(rgba,side,side);
 out.colorSpace=T.SRGBColorSpace;out.magFilter=T.LinearFilter;out.needsUpdate=true;
 return out;
}
function moss(root,x,z,sx,sz,rotation,i){
 // 苔色与地表相接，边缘淡出，让树根留在同一块土上。
 const g=new T.PlaneGeometry(2,2,10,10);g.rotateX(-Math.PI/2);g.scale(sx,1,sz);g.rotateY(rotation);
 const p=g.attributes.position;
 for(let k=0;k<p.count;k++)p.setY(k,groundHeight(x+p.getX(k),z+p.getZ(k))+.021);
 g.computeVertexNormals();add(root,g,mossColors[i%4],x,0,z,false);
}
function grassPocket(root,p,index){
 const group=new T.Group();group.position.set(p.x,p.y,p.z);root.add(group);
 const bundles=[];
 for(const [i,[x,z]] of [[-.50,.11],[.34,.10],[-.14,.43],[.20,.53],[.09,-.44]].entries()){
  const tuft=new T.Group();tuft.position.set(x,0,z);group.add(tuft);bundles.push(tuft);
  for(let k=0;k<6;k++){
   blade(tuft,(random()-.5)*.31,(random()-.5)*.27,(index?.66:.53)+random()*.37,
    .047+random()*.069,.12+random()*.32,Math.PI*2*random(),grassColors[(i+k)%4]);
  }
 }
 return bundles;
}
function seedHead(root,x,y,z,length,gold=true){
 const group=new T.Group();group.position.set(x,y,z);root.add(group);
 const stalk=new T.TubeGeometry(curve([[0,0,0],[.013,length*.51,0],[.031,length*.89,0]]),6,.013,5);
 add(group,stalk,twig,0,0,0,false);
 for(let i=0;i<5;i++){
  const side=i%2?1:-1;
  const grain=blob(group,.032+side*.031,length*(.66+i*.061),.009*side,[.041,.055,.024],gold?seeds:grassColors[3],orb,false);
  grain.rotation.z=-side*.55;
 }
 return group;
}
export function makeGroveDiorama(scene,points){
 const root=new T.Group();scene.add(root);
 pathStrip(root,[[4.36,1.98],[5.53,1.68],[6.43,1.12],[7.20,.68],[8.05,.20],[9.47,.00],[10.90,.67],[13.94,.44]],.49,'#c1ad76',.023);
 for(const portal of Object.values(portals)){
  blob(root,portal.x,groundHeight(portal.x,portal.z)+.038,portal.z,[.51,.105,.42]);
 }
 // 树冠高于低枝，给兔耳、鸟和落地路线保留一块亮空地。
 tree(root,11.30,-3.14,2.89,true);
 for(const [x,z,h] of [[7.33,-2.45,2.83],[13.95,-2.50,2.99],[14.76,-.71,2.78],[15.74,-2.88,3.02]])tree(root,x,z,h);
 for(const [i,[x,z,sx,sz]] of [[8.55,1.43,1.09,.76],[12.16,1.51,1.01,.69],
  [13.23,2.58,1.07,.54],[7.45,-1.67,1.36,.67],[11.8,-2.58,1.76,.78],[6.33,1.96,.55,.32],
  [14.38,.87,1.1,.57],[10.18,3.13,1.5,.50],[9.51,-.65,.85,.24]].entries()){
   moss(root,x,z,sx,sz,random()-.5,i);
 }
 const pockets=points.grasses.map((p,i)=>grassPocket(root,p,i));
 const seed=seedHead(root,points.seed.x,points.seed.y,points.seed.z,.29);
 seedHead(root,points.peck.x+.16,points.peck.y,points.peck.z-.12,.40,false);
 seedHead(root,points.grasses[1].x+.48,.38,points.grasses[1].z+.09,.88);
 seedHead(root,points.grasses[1].x+.67,.38,points.grasses[1].z-.14,.77);
 for(const [n,[x,z]] of [[6.40,2.03],[7.42,1.79],[7.62,-.73],[8.09,2.77],[9.17,3.07],
  [10.71,3.31],[11.27,2.21],[12.99,2.77],[13.62,1.07],[13.30,-1.29],[9.29,-2.17],[6.67,-.46]].entries()){
  const plant=new T.Group();plant.position.set(x,groundHeight(x,z)-.014,z);root.add(plant);
  for(let j=0;j<5;j++)blade(plant,random()*.25-.12,random()*.24-.12,.19+random()*.34,.029+random()*.031,.11+random()*.21,random()*6.28,grassColors[(n+j)%4]);
  const s=.072+random()*.17;
  if(n%2===0)blob(root,x+.22,groundHeight(x+.22,z)+.02,z,[s,.086,s*.68]);
 }
 const toss=[{at:-99,strength:0},{at:-99,strength:0}];
 let peckAt=-99,hoverLevel=0;
 return {
  root,
  hintNodes:{grass:pockets},
  react(event,time){
   if(event.type==='grass'&&event.source==='tap')toss[event.index]={at:time,strength:event.strength};
   if(event.type==='peck')peckAt=time;
  },
  tick(time,hover,dt,quiet){
   hoverLevel=T.MathUtils.lerp(hoverLevel,hover===null?0:1,Math.min(1,dt*10));
   for(const [i,tufts] of pockets.entries()){
    const age=time-toss[i].at;
    for(const [j,tuft] of tufts.entries()){
     const phase=Math.max(0,age-j*.027),touch=Math.sin(phase*20)*Math.exp(-phase*5.8)*toss[i].strength;
     const breath=quiet?0:Math.sin(time*1.4+j*.57+i*.9)*.023;
     tuft.rotation.x=breath+touch*.38+(hover===i?hoverLevel*.11:0);
     tuft.rotation.z=touch*(j<2?-.23:.23);
    }
   }
   const age=time-peckAt;
   seed.rotation.z=-Math.sin(age*11)*Math.exp(-Math.max(0,age)*6)*.78;
  }
 };
}
