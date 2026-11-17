import * as T from 'three';
import {branch} from './grove-diorama.js';

const clay=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.90,...options});
const sphere=new T.SphereGeometry(1,16,11);
const barkTint=clay('#fff7e4',{vertexColors:true});
const twig=clay('#8e674c'),cutWood=clay('#c59c67'),growthRing=clay('#a78156'),moss=clay('#819e5c');
const fallen=['#d8aa69','#cc965e','#b98759','#cbb271'].map(color=>clay(color));
const foliage=['#7ea049','#90a452','#a4ad61'].map(color=>clay(color));

function add(root,geometry,material,x,y,z,scale){
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);
 if(scale)mesh.scale.set(...scale);
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}

function timber(root){
 const base={x:8.60,y:2.01},top={x:8.64,y:2.58},span=top.y-base.y,bottom=.37,cap=top.y+.27;
 const geometry=new T.CylinderGeometry(.208,.469,cap-bottom,32,26),p=geometry.attributes.position,colors=[];
 const shade=new T.Color('#91715a'),deep=new T.Color('#604539');
 for(let i=0;i<p.count;i++){
  const y=p.getY(i)+(cap+bottom)*.5,a=Math.atan2(p.getX(i),p.getZ(i));
  const t=(y-base.y)/span;
  // 木皮在两个啄击高度经过共同的目标点，起伏退到树干侧面。
  const x=T.MathUtils.lerp(base.x,top.x,t),radius=.30-.05*t;
  const grain=(.012*Math.sin(a*9+.8)+.010*Math.sin(a*15+y))*T.MathUtils.smoothstep(Math.abs(a-1.042),.18,.57);
  if(Math.hypot(p.getX(i),p.getZ(i))>.001)p.setXYZ(i,x+Math.sin(a)*(radius+grain),y,-1.64+Math.cos(a)*(radius+grain));
  else p.setXYZ(i,x,y,-1.64);
  const tint=shade.clone().lerp(deep,.22+.10*Math.cos(a*13+y*2)+.14*Math.cos(a*9-y));
  colors.push(tint.r,tint.g,tint.b);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const trunk=add(root,geometry,barkTint,0,0,0);
 const xn=top.x+.019;
 const cut=add(root,new T.CircleGeometry(.222,32),cutWood,xn,cap+.002,-1.64);
 cut.rotation.x=-Math.PI/2;
 for(const r of [.085,.149,.194]){
  const ring=add(root,new T.TorusGeometry(r,.008,6,32),growthRing,xn,cap+.005,-1.64);
  ring.rotation.x=-Math.PI/2;
 }
 branch(root,[[base.x-.18,1.28,-1.70],[base.x-.47,1.58,-1.73],[base.x-.53,1.72,-1.74]],.11,.055);
 for(const [i,z] of [-1.51,-1.82,-1.53,-1.64].entries())
  add(root,sphere,moss,base.x+Math.cos(i*2.4)*.32,.412+i*.031,z,[.166,.077,.108]);
 return [trunk,cut];
}

function brush(root,x,y,z,i){
 for(let n=0;n<5;n++){
  const a=(i*.28+n)*2.39;
  const petal=add(root,sphere,foliage[(i+n)%foliage.length],x+Math.cos(a)*.13,y+.17+n*.018,z+Math.sin(a)*.12,[.062,.24,.105]);
  petal.rotation.set(Math.sin(a)*.78,a,Math.cos(a)*.62);
 }
}

export function makeWoodlandDiorama(scene,points,groundAt){
 const root=new T.Group();scene.add(root);
 const trunk=timber(root);
 const near=points.squirrelRoots[0],far=points.squirrelRoots[1],low=points.squirrelPerch;
 const stump=add(root,new T.CylinderGeometry(.33,.39,.16,27),twig,near.x,near.y-.08,near.z);
 const top=add(root,new T.CircleGeometry(.326,30),cutWood,near.x,near.y+.002,near.z);
 top.rotation.x=-Math.PI/2;
 const ring=add(root,new T.TorusGeometry(.235,.009,6,28),growthRing,near.x,near.y+.004,near.z);
 ring.rotation.x=-Math.PI/2;
 branch(root,[[low.x-.29,.36,low.z-.22],[low.x-.27,.87,low.z-.21],[low.x-.24,1.53,low.z-.25]],.174,.105);
 const perch=branch(root,[[low.x-.18,1.101,low.z-.20],[low.x,1.146,low.z],[low.x+.36,1.153,low.z+.127]],.100,.058);
 let farRoot;
 for(const [i,p] of [far,{x:far.x-.38,z:far.z-.38},{x:far.x+.32,z:far.z-.30}].entries()){
  const mossPatch=add(root,sphere,moss,p.x,groundAt(p.x,p.z)+.022,p.z-.11,[.24,.058,.13]);
  if(i===0)farRoot=mossPatch;
  if(i)brush(root,p.x,groundAt(p.x,p.z),p.z-.36,i);
 }
 const cones=new T.Group();
 add(cones,sphere,twig,0,0,0,[.090,.140,.095]);
 for(let i=0;i<5;i++)for(let j=0;j<5;j++){
  const a=j*6.2831853/5+i*.54,r=.081-.007*Math.abs(i-2);
  const scale=add(cones,sphere,fallen[2],r*Math.cos(a),-.084+i*.041,r*Math.sin(a),[.035,.031,.041]);
  scale.rotation.y=-a;
 }
 scene.add(cones);
 cones.scale.setScalar(.78);
 for(const [i,[x,z]] of [[10.65,3.10],[11.70,3.43],[12.85,2.72],[10.41,3.24],[11.93,2.73]].entries())brush(root,x,groundAt(x,z)-.08,z,i+3);
 const litter=points.litter.map((p,i)=>Array.from({length:12},(_,j)=>{
  const a=j*2.39,spread=.058*Math.sqrt(j)+.014*j;
  const lx=p.x+Math.cos(a)*spread,lz=p.z+Math.sin(a)*spread;
  const leaf=add(root,sphere,fallen[(i+j)%4],lx,groundAt(lx,lz)+.026+j*.003,lz,[.075,.018,.044]);
  leaf.rotation.y=a;
  return {leaf,a,x:lx,y:leaf.position.y,z:lz};
 }));
 const debris=Array.from({length:5},()=>{
  const dust=add(root,sphere,fallen[2],0,0,0,[.025,.020,.035]);dust.visible=false;return dust;
 });
 let knock=null;
 return {
  root,cone:cones,
  // 两个啄击点共用同一段枯木，远端落脚点对应地面的苔藓。
  hintNodes:{wood:points.wood.map(()=>trunk),roots:[[stump,top],farRoot],perch,litter:litter.map(group=>group.map(({leaf})=>leaf))},
  react(event,time){if(event.type==='peck-hit')knock={...event,time};},
  tick(state){
   for(const [i,group] of litter.entries())for(const [j,{leaf,a,x,y,z}] of group.entries()){
    const {stir,scatter}=state.litter[i];
    const motion=stir*.08+scatter*(.20+(j%4)*.032);
    leaf.position.set(x+Math.cos(a)*motion,y+motion*(.56+(j%3)*.22),z+Math.sin(a)*motion);
    leaf.rotation.set(scatter*Math.sin(a)*1.4,a+scatter*.42,stir*Math.cos(a)*1.2);
   }
   const age=knock?state.time-knock.time:Infinity;
   for(const [i,dust] of debris.entries()){
    dust.visible=age<.40;
    if(dust.visible)dust.position.set(knock.x+Math.sin(i*2.39)*age*.68,knock.y+.24*age-2*age*age,knock.z+age*(.33+i*.09));
   }
  }
 };
}
