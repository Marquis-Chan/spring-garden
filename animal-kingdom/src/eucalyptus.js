import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {branch} from './grove-diorama.js';
import {group,mesh,tube} from './savanna-actors.js';
import {makeKoala,makeSilvereye} from './eucalyptus-actors.js';
import {createEucalyptus,gumOrigin,gumPerches} from './eucalyptus-state.js';
export {createEucalyptus} from './eucalyptus-state.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const clay=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra});
const leafColours=['#5b825e','#78915b','#6f927b','#94a96c'].map(c=>clay(c,{side:T.DoubleSide}));
const young=clay('#a3bf69',{side:T.DoubleSide}),stem=clay('#a49364'),gumPaint=clay('#ffffff',{vertexColors:true});
const gumnut=clay('#9a785b'),cup=clay('#6f5d48'),blossom=clay('#e7c8a4'),pollen=clay('#dfb178');
const sph=new T.SphereGeometry(1,13,9),tau=2*Math.PI;
function leafShape(){
 const verts=[],tri=[],length=12;
 for(let i=0;i<=length;i++){
  const t=i/length,width=.145*Math.sin(Math.PI*t)**.80*(1-.38*t);
  const curve=.12*Math.sin(t*Math.PI)-.25*t*t;
  verts.push(.13*t*t-width,curve-width*.67,t,.13*t*t,curve,t,.13*t*t+width,curve-width*.67,t);
  if(i<length){const k=i*3;tri.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(tri);g.computeVertexNormals();
 return g;
}
const lance=leafShape();
const foodLance=lance.clone();
{
 const p=foodLance.attributes.position;
 for(let i=0;i<p.count;i++){
  const t=p.getZ(i);
  p.setXYZ(i,p.getX(i)-.13*t*t,p.getY(i)+.25*t*t,t);
 }
 foodLance.computeVertexNormals();
}
function ell(parent,name,mat,pos,scale){return mesh(T,parent,name,sph,mat,pos,scale);}
function gumBark(root,pts,base,end){
 const b=branch(root,pts,base,end);b.name='灰白色剥皮桉枝';b.material=gumPaint;
 const pos=b.geometry.attributes.position,col=b.geometry.attributes.color;
 const chalk=new T.Color('#c4b9a0'),fawn=new T.Color('#a38c73'),sienna=new T.Color('#997c64'),tone=new T.Color();
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const patch=Math.sin(3.3*x+1.6*y+4*z)+.4*Math.sin(5*x-1.2*y+3*z);
  tone.copy(fawn).lerp(chalk,T.MathUtils.smoothstep(patch,-.03,.12)*.90)
   .lerp(sienna,.34*T.MathUtils.smoothstep(Math.cos(y*2.3+x*3)+z*.2,.52,.83));
  col.setXYZ(i,tone.r,tone.g,tone.b);
 }
 return b;
}
function spray(parent,x,y,z,scale,yaw,seed){
 const sprig=group(T,parent,'披针形桉叶簇',[x,y,z]);sprig.rotation.y=yaw;sprig.scale.setScalar(scale);
 for(let j=0;j<3;j++){
  const sign=j-1,dx=sign*.55,dz=.50+j*.072,dy=.02+.11*Math.cos(j+seed);
  tube(T,sprig,'红褐叶梗',[[0,0,0],[dx*.48,.19,dz*.52],[dx,dy,dz]],.014,stem,6);
  for(let n=0;n<5;n++){
   const t=.24+n*.165,s=n%2===0?-1:1;
   const leaf=mesh(T,sprig,'垂下的细长桉叶',lance,leafColours[(j+n+seed)%4],[dx*t,.19*Math.sin(t*Math.PI)+dy*t,dz*t]);
   leaf.scale.set(.93,.73,.44+.09*Math.cos(n+seed));leaf.rotation.order='YXZ';
   leaf.rotation.set(.44+.21*Math.sin(seed+n),.75*s+sign*.26,s*(.36+.3*Math.sin(n+seed)));
  }
 }
}
function gumTree(tree,x,z,height,lean,seed){
 const p=(a,b,c)=>[x+a,b,z+c];
 const base=p(0,-.06,0),joint=p(lean*.45,height*.63,-.05);
 gumBark(tree,[base,p(-lean*.19,height*.25,.10),joint,p(lean,height,-.18)],.29,.071);
 for(const [j,[dx,dz,dy]] of [[-1.02,-.13,.91],[.68,-.64,.96],[-.37,.41,1.03],[1.17,.11,.86]].entries()){
  const top=p(lean+dx*(1+.22*Math.cos(j*3+seed)),height*dy+.19*Math.sin(j+seed),dz);
  gumBark(tree,[joint,p(lean+dx*.54,height*(dy-.12),dz*.48),top],.127,.027);
  for(let n=0;n<4;n++){
   const a=1.57*n+seed,dist=n===0?.02:.35;
   spray(tree,top[0]+dist*Math.sin(a),top[1]-.08*n,top[2]+dist*Math.cos(a),.92+.20*Math.sin(a),a,seed+j+n);
  }
 }
 gumBark(tree,[p(.02,.30,.02),p(.42,.067,.21),p(.72,-.015,.40)],.105,.023);
}
function nuts(parent,x,y,z,s){
 const clump=group(T,parent,'桉树的蒴果',[x,y,z]);clump.scale.setScalar(s);
 for(let i=0;i<4;i++){
  const a=i*2.4,px=.15*Math.cos(a),pz=.13*Math.sin(a),py=-.075*i;
  tube(T,clump,'蒴果短梗',[[0,.05,0],[px*.55,py+.05,pz*.55],[px,py,pz]],.012,stem,5);
  ell(clump,'小杯形蒴果',gumnut,[px,py-.077,pz],[.058,.077,.063]);
  ell(clump,'果顶',cup,[px,py-.129,pz+.013],[.050,.023,.045]);
 }
 return clump;
}
// 桉树的细叶和花丝多，静态部分按材质一次合并，保留互动枝的单独轮廓。
function batch(parent){
 const buckets=new Map(),inverse=new T.Matrix4();parent.updateWorldMatrix(true,true);inverse.copy(parent.matrixWorld).invert();
 parent.traverse(o=>{
  if(!o.isMesh)return;
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  g.deleteAttribute('uv');g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
  if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);
 });
 parent.clear();
 for(const [mat,shapes] of buckets){
  mesh(T,parent,'连成一片的桉树林',mergeGeometries(shapes,false),mat);
  for(const g of shapes)g.dispose();
 }
}

function bendingStem(root){
 const segments=16,sides=8,geom=new T.BufferGeometry(),idx=[];
 const pos=new T.BufferAttribute(new Float32Array((segments+1)*sides*3),3);
 for(let a=0;a<segments;a++)for(let j=0;j<sides;j++){
  const i=a*sides+j,k=a*sides+(j+1)%sides;idx.push(i,k,i+sides,k,k+sides,i+sides);
 }
 geom.setAttribute('position',pos);geom.setIndex(idx);const stalk=mesh(T,root,'随掌弯下的叶柄',geom,stem);
 stalk.frustumCulled=false;
 const start=V(1.49,-.091,-.09),center=V(),axis=V(),across=V(),normal=V(),point=V(),bend=V(),up=V(0,0,1);
 return (grip,pull)=>{
  bend.set(1.80-.36*pull,1.00-.18*pull,.02+.13*pull);
  for(let i=0;i<=segments;i++){
   const t=i/segments,v=1-t,r=.043*(1-.72*t);
   center.copy(start).multiplyScalar(v*v).addScaledVector(bend,2*v*t).addScaledVector(grip,t*t);
   axis.copy(bend).sub(start).multiplyScalar(v).addScaledVector(grip,t).addScaledVector(bend,-t).normalize();
   across.crossVectors(axis,up).normalize();normal.crossVectors(axis,across);
   for(let j=0;j<sides;j++){
    const a=tau*j/sides;point.copy(center).addScaledVector(across,r*Math.cos(a)).addScaledVector(normal,r*Math.sin(a));
    pos.setXYZ(i*sides+j,point.x,point.y,point.z);
   }
  }
  pos.needsUpdate=true;geom.computeVertexNormals();
 };
}

export function makeEucalyptusDiorama(scene){
 const root=group(T,scene,'澳洲桉树林',[gumOrigin.x,gumOrigin.y,gumOrigin.z]),still=group(T,root,'静态林冠');
 gumTree(still,-2.02,-.37,3.77,-.04,1);
 gumTree(still,2.25,-1.01,3.29,.42,5);
 for(const [i,p] of gumPerches.entries()){
  // 银眼鸟两脚的连线顺着枝面，落地时前趾、后趾能从两侧扣住枝条。
  const dx=Math.cos(p.yaw),dz=-Math.sin(p.yaw);
  gumBark(still,[[2.26,1.17,-.95],[2.08,1.50,-.64],[p.x+.30*dx,p.y-.061,p.z+.30*dz],
   [p.x,p.y-.04,p.z],[p.x-.32*dx,p.y-.062,p.z-.32*dz]],i?.096:.12,.029);
  nuts(still,p.x-.25*dx,p.y-.067,p.z-.25*dz,.81);
 }
 for(const [i,[x,z]] of [[-2.68,1.0],[1.35,1.55],[-.07,1.91],[2.88,.40],[-2.45,-.87]].entries()){
  const litter=mesh(T,still,'地上的卷叶',lance,leafColours[(i+1)%4],[x,.023,z],[.96,.31,.36+i*.025]);
  litter.rotation.set(-.036,i*1.69,-.04);
  for(let j=0;j<2;j++)ell(still,'散落的蒴果',gumnut,[x+.16*j,.061,z+.21],[.063,.058,.064]);
 }
 for(let i=0;i<3;i++){
  const a=i*2.4,x=2.09+.13*Math.sin(a),z=-.76+.16*Math.cos(a);
  nuts(still,x,2.08+i*.10,z,.85);
  for(let j=0;j<7;j++){
   const b=j*tau/7;
   ell(still,'奶油色桉花',blossom,[x+.059*Math.cos(b),2.18+i*.10+.028*Math.sin(b),z+.061*Math.sin(b)],[.037,.049,.031]);
  }
  ell(still,'桉花花心',pollen,[x,2.17+i*.10,z],[.050,.047,.051]);
 }
 batch(still);
 const hinge=group(T,root,'托住考拉的活树杈',[-1.99,.79,-.28]);
 const perch=group(T,hinge,'承重枝条');
 gumBark(perch,[[0,0,0],[.52,.14,.28],[1.08,.24,.56],[1.93,.24,.53],[2.67,.26,.52],[2.93,.42,.48]],.19,.037);
 nuts(perch,2.93,.42,.48,.64);
 gumBark(perch,[[.48,.16,.27],[.62,.29,.41],[.68,.52,.59]],.101,.058);
 const seat=group(T,hinge,'考拉坐处',[1.04,.348,.61]);
 gumBark(perch,[[.17,.107,.116],[.39,.46,.72],[.694,.663,.992],[1.07,.643,1.025],
  [1.405,.608,1.003],[1.74,.67,.961]],.102,.034);
 const boughPoint=group(T,perch,'可摇动的横杈',[.45,.18,.26]);
 const adult=makeKoala(seat);
 const feeder=group(T,seat,'带嫩叶的一束桉枝');
 const updateStem=bendingStem(feeder),buds=group(T,feeder,'嫩叶叶柄');
 const leaf=mesh(T,buds,'嘴边的主桉叶',foodLance,young);
 const sideLeaves=[-1,1].map((side,i)=>{
  const blade=mesh(T,buds,'侧叶',lance,leafColours[2+i]);
  blade.rotation.order='YXZ';blade.rotation.set(.44,side*.90,side*.35);
  blade.scale.set(.71,.45,.25);return blade;
 });
 const grip=V(),lips=V(),restTip=V(.63,.66,.48),tip=V(),delta=V(),direction=V(),forward=V(0,0,1);
 const silver=makeSilvereye(root),birdFace=silver.root.getObjectByName('Bird head');
 const hints={koala:adult.root,silvereye:silver.root,'gum-leaves':buds,'gum-bough':perch};
 const click={koala:adult.face,silvereye:birdFace,'gum-leaves':buds,'gum-bough':boughPoint};
 function tick(state){
  const k=state.koala,b=state.bird,t=state.time;
  hinge.rotation.z=state.bough.angle;
  adult.pose(state,grip);
  adult.root.worldToLocal(adult.lips.getWorldPosition(lips));
  tip.copy(restTip).lerp(lips,k.pull);
  // 主叶的末端始终由真实嘴角倒算；咀嚼时沿着同一根叶脉变短。
  delta.copy(tip).sub(grip);
  buds.position.copy(grip);updateStem(grip,k.pull);
  const bite=1-.90*state.leaf.eaten;
  leaf.quaternion.setFromUnitVectors(forward,direction.copy(delta).normalize());
  leaf.scale.set(.72*bite,.13*bite,delta.length());
  for(const [i,s] of sideLeaves.entries())s.rotation.z=(i?1:-1)*(.35+.26*k.pull);
  silver.root.position.set(b.x-gumOrigin.x,b.y-gumOrigin.y,b.z-gumOrigin.z);
  silver.root.rotation.y=b.yaw;
  silver.pose({time:t,flight:b.flight,flap:Math.sin(t*32),look:.38*Math.sin(t*.67),peck:b.sing*.42,sleep:b.sleep});
 }
 tick(createEucalyptus());
 return {root,hintNodes:hints,point:(kind,out)=>click[kind].getWorldPosition(out),tick};
}
