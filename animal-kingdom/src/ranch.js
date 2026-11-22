import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldSurfaceHeight} from './world-landscape.js';
import {makeRanchActor} from './ranch-actors.js';

export const ranchOrigin={x:6.5,z:-12};
const level=(x,z)=>worldSurfaceHeight(ranchOrigin.x+x,ranchOrigin.z+z);
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const Y=V(0,1,0), ball=new T.SphereGeometry(1,12,8), box=new T.BoxGeometry();
const timber=new T.CylinderGeometry(1,1.05,1,8), pebble=new T.IcosahedronGeometry(1,1);
const palette=new Map();
function paint(color){
 if(!palette.has(color))palette.set(color,new T.MeshStandardMaterial({color,roughness:.9}));
 return palette.get(color);
}
function mesh(parent,geometry,color,x,y,z,w=1,h=1,d=1){
 const m=new T.Mesh(geometry,paint(color));m.position.set(x,y,z);m.scale.set(w,h,d);
 m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function group(parent,x=0,y=0,z=0){
 const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;
}
function bar(parent,a,b,w,d,color,geo=box){
 const axis=V().subVectors(b,a),p=a.clone().lerp(b,.5);
 const beam=mesh(parent,geo,color,p.x,p.y,p.z,w,axis.length(),d);
 beam.quaternion.setFromUnitVectors(Y,axis.normalize());return beam;
}
// 静止的建筑、围栏和花草共用一次绘制，保留每块木板的颜色与受光面。
function bake(parent){
 parent.updateWorldMatrix(true,true);
 const inv=parent.matrixWorld.clone().invert(),pieces=[];
 parent.traverse(m=>{
  if(!m.isMesh)return;
  const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
  geometry.deleteAttribute('uv');
  geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld));
  const rgb=new Float32Array(geometry.attributes.position.count*3),c=m.material.color;
  for(let i=0;i<rgb.length;i+=3){rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;}
  geometry.setAttribute('color',new T.BufferAttribute(rgb,3));pieces.push(geometry);
 });
 parent.clear();const m=new T.Mesh(mergeGeometries(pieces),new T.MeshStandardMaterial({vertexColors:true,roughness:.9}));
 m.castShadow=m.receiveShadow=true;parent.add(m);pieces.forEach(g=>g.dispose());
}
function barn(parent){
 const b=group(parent,-2.75,level(-2.75,-3.9),-3.95);b.rotation.y=.15;
 const outline=[[-1.36,0],[1.36,0],[1.36,1.40],[.95,2.12],[0,2.56],[-.95,2.12],[-1.36,1.40]];
 const shape=new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)));
 const geo=new T.ExtrudeGeometry(shape,{depth:1.74,bevelEnabled:false});mesh(b,geo,'#b95e4c',0,0,-.88);
 const cream='#f1dab1',shadow='#914d40';
 for(let i=0;i<17;i++){
  const x=-1.31+.164*i,ax=Math.abs(x);
  const top=ax<.95?2.55-.44*ax/.95:2.11-.72*(ax-.95)/.41;
  mesh(b,box,i%3===0?'#c5775c':shadow,x,top*.5,.87,.014,top,.025);
 }
 for(const side of [-1,1]){
  const points=[[1.48,1.34],[1.00,2.18],[0,2.65]];
  for(let i=0;i<2;i++){
   const [x,y]=points[i],[xx,yy]=points[i+1];
   const angle=Math.atan2(yy-y,(xx-x)*side);
   const p=mesh(b,box,i===0?'#557773':'#64827e',(x+xx)*side/2,(y+yy)/2,0,Math.hypot(xx-x,yy-y)+.055,.082,2.03);p.rotation.z=angle;
   const edge=mesh(b,box,cream,p.position.x,p.position.y-.024,1.025,p.scale.x,.092,.069);edge.rotation.z=angle;
   for(const z of [-.88,-.47,-.06,.35,.76]){const rib=mesh(b,box,'#6f8d83',p.position.x,p.position.y+.052,z,p.scale.x,.02,.022);rib.rotation.z=angle;}
  }
  mesh(b,box,cream,side*1.32,.70,.90,.07,1.40,.052);
 }
 mesh(b,box,'#744b3e',-.16,.60,.908,1.34,1.2,.042);
 for(const side of [-1,1]){
  const x=-.16+side*.34;
  mesh(b,box,'#a45443',x,.55,.94,.62,1.07,.055);
  bar(b,V(x-side*.27,.10,.984),V(x+side*.27,1.01,.984),.052,.042,cream);
  for(const y of [.12,1.01])mesh(b,box,cream,x,y,.981,.64,.045,.040);
  mesh(b,box,cream,x+side*.32,.59,.96,.057,1.19,.069);
 }
 mesh(b,box,cream,-.16,1.22,.955,1.47,.09,.08);
 mesh(b,box,'#5a5348',0,1.78,.902,.43,.43,.049);
 for(const s of [-1,1]){
  mesh(b,box,cream,s*.244,1.78,.94,.044,.52,.05);
  mesh(b,box,cream,0,1.78+s*.244,.94,.53,.044,.05);
 }
 bar(b,V(-.17,1.58,.94),V(-.17,1.98,.94),.042,.022,'#a38260');
 mesh(b,box,'#d0a877',.05,1.77,.942,.28,.36,.018);
}
function fence(parent,a,b,count){
 const posts=[];
 for(let n=0;n<=count;n++){
  const u=n/count,x=T.MathUtils.lerp(a[0],b[0],u),z=T.MathUtils.lerp(a[1],b[1],u);
  const y=level(x,z),height=.65+.04*Math.sin(n*5+x);
  mesh(parent,box,'#ac9470',x,y+height/2,z,.11,height,.115);
  mesh(parent,ball,'#c1a981',x,y+height,z,.063,.042,.067);posts.push(V(x,y,z));
 }
 for(let n=1;n<posts.length;n++)for(const h of [.24,.47]){
  const a=posts[n-1].clone(),b=posts[n].clone();a.y+=h;b.y+=h-.012;
  bar(parent,a,b,.084,.060,'#c9b289');
 }
}
function poplar(root,x,z,s,seed){
 const p=group(root,x,level(x,z),z);p.scale.setScalar(s);
 mesh(p,timber,'#847858',0,.57,0,.10,1.14,.09);
 for(const [dx,dy,dz,w,h,c] of [[0,1.44,0,.42,1.18,'#6e8e66'],[-.19,1.64,.07,.34,.88,'#779b6b'],[.14,1.86,0,.33,.84,'#86a46e'],[.03,2.13,.06,.26,.66,'#a2b47a']]){
  const leaf=mesh(p,pebble,c,dx,dy,dz,w,h,w*.89);leaf.rotation.y=seed+dx;
 }
}
// 篱笆后的牧草沿坡成行，坡缘平顺地回到大地图的地面。
function fields(root){
 const pos=[],color=[],idx=[],shade=new T.Color(),base=new T.Color('#a6b478'),wheat=new T.Color('#d5ba77'),sage=new T.Color('#779765');
 const cols=78,rows=30;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const u=i/cols,v=j/rows,x=-6.0+12.8*u,z=-8.1+4.6*v;
  const rim=Math.sin(Math.PI*u)**.75*Math.sin(Math.PI*v)**.82;
  const ridge=rim*(.48+.68*Math.exp(-((x-1.7)**2)/7.8))*(1.30-.32*v);
  const curve=x*.66+.52*Math.sin(z*.81)+.34*z,strip=.5+.5*Math.cos(curve*3.75);
  shade.copy(base).lerp(sage,.12+.78*strip).lerp(wheat,(.16+.47*(1-strip))*T.MathUtils.smoothstep(x,-2,3)).multiplyScalar(.98+.028*Math.sin(z*4.2+x*1.8));
  pos.push(x,level(x,z)+.018+ridge,z);color.push(shade.r,shade.g,shade.b,Math.min(1,rim*6));
  if(i<cols&&j<rows){const k=j*(cols+1)+i;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
 g.setAttribute('color',new T.Float32BufferAttribute(color,4));g.setIndex(idx);g.computeVertexNormals();
 const field=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,transparent:true,roughness:1}));
 field.receiveShadow=true;root.add(field);
}
function borders(root){
 fence(root,[-4.85,-2.91],[-4.82,1.55],3);
 fence(root,[-.98,-3.28],[4.77,-3.30],5);
 fence(root,[4.79,-3.3],[4.88,.07],3);
 for(const [x,z,s] of [[-4.51,-4.69,1.04],[-4.86,-4.19,.76],[3.38,-4.45,.93],[3.92,-4.68,1.13],[4.43,-4.42,.80]])poplar(root,x,z,s,x*7);
 for(const [j,[x,z]] of [[-4.45,1.51],[4.46,-1.83],[3.92,-3.10],[-4.25,-2.85],[4.44,2.14],[-3.92,3.46]].entries()){
  const y=level(x,z);
  for(let i=0;i<12;i++){
   const a=i*2.40,rad=.28*Math.sqrt(i/12),dx=rad*Math.cos(a),dz=rad*Math.sin(a);
   const blade=mesh(root,ball,i%2?'#809656':'#90a665',x+dx,y+.067,z+dz,.027,.11,.022);blade.rotation.z=.41*Math.sin(a);
   if(i%3)continue;
   for(let k=0;k<5;k++){const ang=k*1.257;mesh(root,ball,j%2?'#f5d18a':'#f5e6cb',x+dx+.031*Math.cos(ang),y+.146,z+dz+.031*Math.sin(ang),.026,.014,.022);}
   mesh(root,ball,'#d5a04e',x+dx,y+.16,z+dz,.024,.014,.023);
  }
 }
}
// 篱边的三叶草和低矮草丛逐渐变稀，给场中央的小脚、谷粒留出空间。
function meadowFringe(root){
 for(let i=0;i<87;i++){
  const side=i%2?1:-1,t=(i*.61803398875)%1,q=(i*.41421356)%1;
  const x=i<53?side*(4.37+q*.95):-4.9+9.8*t;
  const z=i<53?-3.2+7.5*t:3.85+q*.95+.17*Math.sin(x);
  const y=level(x,z);
  for(let j=0;j<3;j++){
   const a=i*2.4+j*2.094,dx=.031*Math.cos(a),dz=.031*Math.sin(a),h=.045+.036*q;
   const blade=mesh(root,ball,i%4?'#829b6b':'#97a76c',x+dx,y+h*.57,z+dz,.012+.014*q,h,.010);
   blade.rotation.z=.48*Math.cos(a);blade.rotation.x=.51*Math.sin(a);
  }
  if(i%4===0)for(let j=0;j<3;j++){
   const a=i+j*2.094;
   const leaf=mesh(root,ball,'#789768',x+.029*Math.cos(a),y+.035,z+.029*Math.sin(a),.034,.009,.025);leaf.rotation.y=-a;
  }
 }
}
function makeHay(r,p){
 const parent=group(r,p.x,level(p.x,p.z),p.z),hay=group(parent);
 // 草料直接堆在地上，牛从两侧够到嫩草。束带只留给后墙旁的储备草捆。
 for(let i=0;i<56;i++){
  const a=i*2.4,rad=Math.sqrt(i/56),x=.47*rad*Math.cos(a),z=.32*rad*Math.sin(a);
  const y=.046+.075*(1-rad),len=.08+.13*(1-rad*.6);
  const dir=.8+.48*Math.sin(a),stem=mesh(hay,timber,['#ac9c51','#d5b967','#c9ae5d','#b3bb70'][i%4],x,y,z,.010,2*len,.011);
  stem.quaternion.setFromUnitVectors(Y,V(Math.sin(dir),.13*Math.sin(a),Math.cos(dir)).normalize());
  if(i%2===0){
   const blade=mesh(hay,ball,i%4?'#afba65':'#c0bd76',x+.018,y+.007,z,.016,.011,len*1.14);
   blade.rotation.set(.16,dir,.09*Math.cos(a));
  }
 }
 bake(hay);
 return {root:parent,tick:()=>{hay.scale.y=.48+.52*p.amount+.12*p.pulse;hay.rotation.z=.04*p.pulse;}};
}
function makeGrain(r,p){
 const root=group(r,p.x,level(p.x,p.z),p.z),sack=group(root);
 mesh(sack,ball,'#c19c71',0,.12,0,.185,.15,.149);
 mesh(sack,timber,'#d1b485',-.026,.237,.01,.145,.065,.115);
 mesh(sack,ball,'#866644',-.026,.269,.01,.128,.014,.097);
 for(let i=0;i<21;i++){
  const a=i*2.4,d=.10*Math.sqrt(i/21);
  mesh(sack,ball,i%2?'#e6bd63':'#ecd591',-.024+d*Math.cos(a),.279-d*.11,.01+d*.79*Math.sin(a),.027,.019,.02);
 }
 bar(sack,V(.061,.26,-.036),V(.16,.44,-.067),.025,.02,'#966c45',timber);
 bake(sack);
 const seeds=[...p.seeds,...(p.henSeed?[p.henSeed]:[])],kernels=[],falling=[];
 for(const seed of seeds){
  const cluster=group(r,seed.x,level(seed.x,seed.z)+.025,seed.z);
  for(let i=0;i<7;i++){
   const a=i*2.4,rad=.10*Math.sqrt(i/7);
   mesh(cluster,ball,i%2?'#e1b652':'#edcc78',rad*Math.cos(a),.01+.004*i,rad*Math.sin(a),.033,.021,.028);
  }
  bake(cluster);kernels.push(cluster);
  falling.push(mesh(r,ball,'#edc767',0,0,0,.034,.024,.035));
 }
 return {root,tick:()=>{
  sack.rotation.z=-.12-.25*p.pulse;
  const t=1-p.pulse;
  seeds.forEach((seed,i)=>{
   const kernel=kernels[i],n=seed.amount;kernel.visible=n>.02;kernel.scale.setScalar(.30+.70*n);
   const k=falling[i];k.visible=p.pulse>.01;
   if(k.visible)k.position.set(p.x+(seed.x-p.x)*t,level(seed.x,seed.z)+.03+.23*(1-t)+.42*Math.sin(t*Math.PI),p.z+(seed.z-p.z)*t);
  });
 }};
}

export function makeRanchDiorama(scene,ranch){
 const root=group(scene,ranchOrigin.x,0,ranchOrigin.z);root.name='春日牧场';
 fields(root);
 const landscape=group(root);barn(landscape);borders(landscape);meadowFringe(landscape);bake(landscape);
 const indexedHints={},targets=[],point=V();
 function target(state,node,anchor,width,height,min,body=null){
  const {kind,index=0}=state,key='ranch-'+kind;
  (indexedHints[key]??=[])[index]=node;
  targets.push({kind:key,index,width,height,min,state,anchor,body});
 }
 const sizes={cow:[.67,.64,20],lamb:[.47,.42,17],hen:[.29,.31,15],rooster:[.37,.47,17],chick:[.185,.20,19],dog:[.41,.38,18]};
 const animals=ranch.animals.map(s=>{
  const m=makeRanchActor(s.kind,s.index);root.add(m.root);
  target(s,m.root,m.focus,...sizes[s.kind],m.body);return m;
 });
 const props=ranch.props.map(s=>{
  const m=s.kind==='hay'?makeHay(root,s):makeGrain(root,s);
  target(s,m.root,m.root,s.kind==='hay'?.45:.29,.25,17);return m;
 });
 function tick(){
  ranch.animals.forEach((s,i)=>{
   const m=animals[i];m.root.position.set(s.x,level(s.x,s.z)+s.y,s.z);m.root.rotation.y=s.yaw;
   m.pose(s.kind==='dog'?{...s,groundAt:level}:s);
  });props.forEach(p=>p.tick());
 }
 tick();return {root,indexedHints,targets,tick,point(target,body=false){return (body?target.body:target.anchor).getWorldPosition(point);}};
}
