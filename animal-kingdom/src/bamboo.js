import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {group,mesh} from './savanna-actors.js';
import {bambooKinds,bambooOrigin,createBamboo,hillHeight} from './bamboo-state.js';
import {ease} from './state.js';
import {makePanda} from './bamboo-pandas.js';
export {bambooKinds,bambooOrigin,createBamboo} from './bamboo-state.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0),tau=Math.PI*2;
const matte=(hex,extra={})=>new T.MeshStandardMaterial({color:hex,roughness:.87,...extra});
const culm=['#708d56','#789c67','#98a96d','#65916a'].map(hex=>matte(hex));
const ring=matte('#a1af75'),twig=matte('#798863');
const foliage=['#497e60','#63966a','#80a765','#a4b36a'].map(hex=>matte(hex,{side:T.DoubleSide}));
const softLeaf=matte('#b4c777',{side:T.DoubleSide});
const fallen=['#bf9a58','#d0ae64','#a9ad69'].map(hex=>matte(hex,{side:T.DoubleSide}));
const stone=['#97aa94','#abb294','#8c9b81'].map(hex=>matte(hex));
const cylinder=new T.CylinderGeometry(1,1,1,9);
const rounded=new T.IcosahedronGeometry(1,1);
function rod(parent,a,b,r,material,name='竹节'){
 const delta=V().subVectors(b,a),length=delta.length();
 const limb=mesh(T,parent,name,cylinder,material,a.clone().lerp(b,.5).toArray(),[r,length,r]);
 limb.quaternion.setFromUnitVectors(Y,delta.multiplyScalar(1/length));
 return limb;
}
// 每片披针叶有翻起的中脊、细叶柄和向下弯的叶尖。
function lanceGeometry(){
 const p=[],idx=[];
 for(let i=0;i<=10;i++){
  const t=i*.1,w=.119*Math.sin(Math.PI*t)**.86*(1-.34*t),curl=.09*Math.sin(Math.PI*t)-.19*t*t;
  p.push(.082*t*t-w,curl-w*.36,t,.082*t*t,curl,t,.082*t*t+w,curl-w*.45,t);
  if(i<10){const j=i*3;idx.push(j,j+1,j+3,j+1,j+4,j+3,j+1,j+2,j+4,j+2,j+5,j+4);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
const blade=lanceGeometry();
const tenderBlade=blade.clone();
{
 const p=tenderBlade.attributes.position;
 for(let i=0;i<p.count;i++){const t=p.getZ(i);p.setXY(i,p.getX(i)-.082*t*t,p.getY(i)+.19*t*t);}
 tenderBlade.computeVertexNormals();
}
function leaves(parent,origin,angle,scale,seed=0){
 const cluster=group(T,parent,'错落的竹叶',origin.toArray());cluster.rotation.y=angle;cluster.scale.setScalar(scale);
 for(let j=0;j<5;j++){
  const sign=j%2?-1:1,offset=j*.125,yaw=sign*(.88-.1*j);
  const m=mesh(T,cluster,'竹叶',blade,foliage[(j+seed)%4],[Math.sin(yaw)*.096,.065*Math.sin(j),offset],[1,.8,.42+.10*Math.cos(j+seed)]);
  m.rotation.order='YXZ';m.rotation.set(.05+.13*Math.sin(seed+j),yaw,-.21*sign);
 }
 return cluster;
}
function thicket(parent,x,z,h,width,seed,count){
 for(let i=0;i<count;i++){
  const theta=seed+i*2.4,height=h*(.70+.29*(1+Math.sin(theta*4))*.5);
  const dx=Math.sin(theta)*width,dz=Math.cos(theta)*width*.51;
  const p=t=>V(x+dx*(.32+t*1.41)+.17*Math.sin(t*2.8+theta)*t,t*height,z+dz*(.6+t));
  const joints=5+(i%3);
  for(let j=0;j<joints;j++){
   const a=p(j/joints),b=p((j+1)/joints),r=(.077+.013*Math.sin(theta))*(1-.54*j/joints);
   rod(parent,a,b,r,culm[(i+seed)%4]);
   rod(parent,b.clone().lerp(a,.063),b,r*1.19,ring,'竹节浅环');
   if(j<2||(i+j)%2)continue;
   const out=V((j%2?-1:1)*(.33+.2*Math.cos(theta)),.24,.17*Math.sin(theta));
   const mid=b.clone().add(out),tip=mid.clone().addScaledVector(out,.85);tip.y+=.11;
   rod(parent,b,mid,.019,twig,'竹枝');rod(parent,mid,tip,.012,twig,'细枝');
   leaves(parent,mid,theta+j,1.01,i+j);leaves(parent,tip,theta+j+.88,1.20,i+j+1);
  }
  leaves(parent,p(1),theta,1.15,seed+i);
 }
}
function batchStatic(parent){
 const byMat=new Map(),inv=new T.Matrix4();
 parent.updateWorldMatrix(true,true);inv.copy(parent.matrixWorld).invert();
 parent.traverse(o=>{
  if(!o.isMesh)return;
  const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
  geo.deleteAttribute('uv');geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));
  const list=byMat.get(o.material)||[];list.push(geo);byMat.set(o.material,list);
 });
 parent.clear();
 for(const [mat,parts] of byMat){
  mesh(T,parent,'林中竹影',mergeGeometries(parts),mat);for(const g of parts)g.dispose();
 }
}
function hill(parent){
 const xyz=[],idx=[],col=[],c=new T.Color(),moss=new T.Color('#92a977'),gold=new T.Color('#b2b17c');
 for(let j=0;j<=32;j++)for(let i=0;i<=44;i++){
  const x=-3.45+i*6.9/44,z=-3.5+j*7/32,level=hillHeight(x,z);
  const rim=Math.hypot(x/3.45,(z-.03)/3.45)+.045*Math.sin(2*x+z)*Math.cos(z);
  xyz.push(x,level+.008,z);
  c.copy(moss).lerp(gold,.2+.13*Math.sin(x*1.5+z)+.15*Math.cos(z*2.15));
  col.push(c.r,c.g,c.b,1-T.MathUtils.smoothstep(rim,.69,.98));
  if(j<32&&i<44){const k=j*45+i;idx.push(k,k+45,k+1,k+1,k+45,k+46);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
 g.setAttribute('color',new T.Float32BufferAttribute(col,4));g.setIndex(idx);g.computeVertexNormals();
 const surface=mesh(T,parent,'向前缓缓落下的草坡',g,matte('#ffffff',{vertexColors:true,transparent:true,depthWrite:false}));surface.castShadow=false;
}
const Z=V(0,0,1),aim=V(),tip=V(),contact=V(),from=V(),to=V(),pA=V(),pB=V();
function bambooShoot(root){
 const base=V(.73,.15,-.13),control=V(),grip=V(),shoulder=V(),end=V(),bud=V(),lip=V(),approach=V();
 const joints=group(T,root,'会弯的嫩竹'),bloom=group(T,joints,'可握住的竹梢');
 const segments=[];
 for(let i=0;i<22;i++){
  const r=.040*(1-i*.032);
  const stem=mesh(T,joints,'弯曲的嫩竹枝身',cylinder,i%4===0?ring:culm[2]);segments.push({stem,r});
 }
 const shootTip=mesh(T,bloom,'叶尖',tenderBlade,softLeaf);
 const bracts=[];
 for(let i=0;i<4;i++){
  const m=mesh(T,bloom,'新发的竹叶',blade,i%2?foliage[2]:softLeaf);bracts.push(m);
 }
 // 竹枝分两段曲线。第一段经过妈妈的掌心，第二段末端的嫩叶够到幼崽的嘴边。
 function tick(state,pandas){
  const {play}=state,b=play.bend,t=state.time;
  const mother=pandas[0],cub=pandas[play.lead];
  const arm=mother.arms[1];
  root.worldToLocal(arm.paw.getWorldPosition(contact));
  root.worldToLocal(cub.lips.getWorldPosition(lip));
  // 先把竹梢压到母子之间的空地，再从幼崽胸前递进，收枝时退回同一路线。
  const lower=ease(b/.55),offer=ease((b-.45)/.55);
  const hand=cub.arms[play.side<0?1:0].paw;
  root.worldToLocal(hand.localToWorld(bud.set(0,.20,.90)));
  grip.set(.72,1.10,-.16).lerp(contact,state.bears[0].reach);
  control.set(.73,.54,-.07).lerp(from.set(grip.x*.80,.55,grip.z+.18),state.bears[0].reach);
  approach.set(0,lip.y-.20,lip.z+.33);
  end.set(.92+.037*Math.sin(t*.75),2.32,-.13).lerp(approach,lower);
  // 竹梢先在妈妈脸侧下降，低过下巴后才向两只幼崽之间横移。
  end.x=(.92+.037*Math.sin(t*.75))*(1-ease((lower-.30)/.70));
  end.lerp(bud,offer);
  shoulder.set(.87,1.94,-.12).lerp(to.set(grip.x*.44,grip.y+.03,end.z+.24),lower);
  function position(u,out){
   if(u<.48){const f=u/.48;out.copy(base).multiplyScalar((1-f)**2).addScaledVector(control,2*(1-f)*f).addScaledVector(grip,f*f);}
   else{const f=(u-.48)/.52;out.copy(grip).multiplyScalar((1-f)**2).addScaledVector(shoulder,2*(1-f)*f).addScaledVector(end,f*f);}
  }
  for(const [i,{stem,r}] of segments.entries()){
   position(i/segments.length,pA);position((i+1)/segments.length,pB);
   aim.subVectors(pB,pA);stem.position.copy(pA).lerp(pB,.5);
   stem.scale.set(r,aim.length()+.006,r);stem.quaternion.setFromUnitVectors(Y,aim.normalize());
  }
  bloom.position.copy(end);
  tip.copy(end).add(from.set(-.24,.15,.23)).lerp(lip,offer);
  aim.subVectors(tip,end);const len=aim.length();shootTip.quaternion.setFromUnitVectors(Z,aim.normalize());
  shootTip.scale.set(.63-.44*play.bite,.09,len);shootTip.position.set(0,0,0);
  for(const [i,m] of bracts.entries()){
   const s=i%2?1:-1,short=1-.54*play.bite-.23*b;
   // 下垂的侧叶留在下巴下面，使熊猫衔住叶尖时仍看得见眼睛。
   m.rotation.order='YXZ';m.rotation.set(-.17+1.29*lower,s*(.78+.20*i)*(1-.62*lower)+.08*Math.sin(t*1.4+i),s*.25);
   m.scale.set((1.13-.07*i)*short,.65,(.52-.067*i)*short);m.position.set(s*.024,0,-.026*i);
  }
 }
 return {root:joints,bloom,tip:shootTip,tick};
}

export function makeBambooDiorama(scene){
 const root=group(T,scene,'竹林和大熊猫',[bambooOrigin.x,bambooOrigin.y,bambooOrigin.z]);
 const bank=group(T,root,'竹间的草台'),still=group(T,root,'竹林深处');
 hill(bank);
 for(const [i,[x,z,h,w,n]] of [[-3.29,-1.32,3.15,.43,4],[-2.84,-3.05,2.91,.48,3],
  [-1.17,-3.18,1.49,.39,2],[1.34,-3.48,2.32,.48,3],[2.64,-2.44,3.36,.60,3],[3.55,-.71,3.04,.48,4]].entries()){
  thicket(still,x,z,h,w,i+1,n);
 }
 for(const [i,[x,z,s]] of [[-2.68,.27,.35],[2.74,.87,.34],[-2.46,1.63,.21],[1.60,-2.51,.49],[-1.58,-2.67,.35],[2.80,-2.06,.39]].entries()){
  const rock=mesh(T,still,'青苔石块',rounded,stone[i%3],[x,hillHeight(x,z)+.08,z],[s*1.54,s*.54,s]);
  rock.rotation.y=i*2.6;
  leaves(still,V(x-.18,hillHeight(x,z)+.08,z-.05),i*.84,.66,i);
 }
 for(let i=0;i<16;i++){
  const x=Math.sin(i*23.7+2)*2.73,z=.3+Math.cos(i*3.17)*1.82;
  if(Math.abs(x)<.66&&z>0)continue;
  const m=mesh(T,still,'林地落叶',blade,fallen[i%3],[x,hillHeight(x,z)+.032,z],[.50,.054,.25]);
  m.rotation.y=i*2.41;
 }
 batchStatic(still);
 const slope=group(T,root,'坡心的金黄叶堆',[.02,hillHeight(0,1.58)+.035,1.58]);
 for(let i=0;i<9;i++){
  const a=tau*i/9,bladeNode=mesh(T,slope,'松软竹叶',blade,fallen[i%3],[Math.sin(a)*.19,.009*i,Math.cos(a)*.13],[.80,.18,.38+.08*Math.sin(i)]);
  bladeNode.rotation.order='YXZ';bladeNode.rotation.set(-.11,.86+Math.sin(i*4)*1.21+(i%3===0?Math.PI:0),.11*Math.sin(i));
 }
 const bears=[0,1,2].map(i=>makePanda(root,i)),shoot=bambooShoot(root);
 const hints={},anchors={};
 for(const [i,b] of bears.entries()){hints[bambooKinds[i]]=b.root;anchors[bambooKinds[i]]=b.head;}
 hints['panda-slope']=anchors['panda-slope']=slope;hints['panda-bamboo']=anchors['panda-bamboo']=shoot.bloom;
 function tick(state){
  for(const [i,b] of state.bears.entries())bears[i].pose(b,state.play,state.time);
  shoot.tick(state,bears);
  slope.rotation.z=(state.play.phase==='relay'?.063*Math.sin(state.play.age*10)*Math.max(0,1-state.play.age*.63):0)+
   .040*Math.sin(state.time*18)*state.play.signal;
 }
 tick(createBamboo());
 return {root,hintNodes:hints,point:(kind,v)=>anchors[kind].getWorldPosition(v),tick,bears,shoot};
}
