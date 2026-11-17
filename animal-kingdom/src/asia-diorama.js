import * as T from 'three';
import {branch,crownGeometry,pathStrip} from './grove-diorama.js';

const clay=(color,params={})=>new T.MeshStandardMaterial({color,roughness:.86,...params});
const soft=new T.SphereGeometry(1,18,13),stone=new T.IcosahedronGeometry(1,3);
const ferns=['#708e58','#829f59','#9dac60'].map(color=>clay(color));
const riverStones=['#9da499','#aeb1a1','#a29681'].map(color=>clay(color));
const fruitSkin=clay('#dd8c49',{roughness:.71}),fruitTop=clay('#819745'),petal=clay('#e9b7a4');
const sharedSkin=clay('#cd7049',{roughness:.74});
const seedRock=clay('#b9af8d'), seedHusk=clay('#ca8641',{roughness:.74}), seedSeam=clay('#e6b469');
const shades=[0,1,2,3].map(crownGeometry),leafTint=clay('#ecedd3',{vertexColors:true});

function part(root,geometry,material,x,y,z,shape){
 const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);if(shape)mesh.scale.set(...shape);
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
function tuft(parent,x,y,z,span,i){
 const leaf=new T.Group();parent.add(leaf);leaf.position.set(x,y,z);
 for(let j=0;j<6;j++){
  const bearing=(i*.26+j)*2.40,reach=span*(.08+j*.009);
  const frond=part(leaf,soft,ferns[(i+j)%3],Math.sin(bearing)*reach,span*(.21+j*.038),Math.cos(bearing)*reach,
   [span*(.052+j*.007),span*(.29+j*.024),span*.044]);
  frond.rotation.set(Math.cos(bearing)*.67,bearing,Math.sin(bearing)*.72);
 }
 return leaf;
}
function tallTree(root,x,y,z,lift,flip,canopyLift=0){
 branch(root,[[x,y,z],[x-.13,y+lift*.42,z+.12],[x+.04,y+lift*.78,z],[x+flip*.20,y+lift,z-.09]],.256,.053);
 for(const [i,[dx,dz,dy]] of [[-.78,-.34,.81],[-.18,.22,1.02],[.66,.15,.94],[-.47,-.68,1.16]].entries()){
  const crownY=y+lift*dy+canopyLift;
  branch(root,[[x-.04,y+lift*.67,z],[x+flip*dx*.53,crownY-.22,z+dz*.49],[x+flip*dx,crownY,z+dz]],.10,.034);
  part(root,shades[i],leafTint,x+flip*dx,crownY,z+dz,[.88+i*.074,.47+i*.035,.65+i*.068]);
 }
}
function perch(root,p,start){
 const end=Math.sign(p.x-start[0])*.33;
 return branch(root,[start,[p.x-end*.87,p.y-.119,p.z-.26],[p.x,p.y-.074,p.z],[p.x+end,p.y-.049,p.z+.12]],.163,.052);
}
function fruit(parent,skin=fruitSkin){
 const root=new T.Group();parent.add(root);
 part(root,soft,skin,0,0,0,[.114,.100,.108]);
 for(const i of [0,1,2,3]){
  const a=i*Math.PI/2;
  const calyx=part(root,soft,fruitTop,Math.cos(a)*.046,.080,Math.sin(a)*.046,[.049,.016,.023]);calyx.rotation.y=-a;
 }
 return root;
}

export function makeAsiaDiorama(scene,points,groundAt){
 const root=new T.Group();scene.add(root);
 pathStrip(root,[[12.85,-.52],[14.32,-.76],[15.81,-.32],[16.69,.37],[17.22,1.33],[17.59,1.93]],.34,'#c5aa77',.020);
 pathStrip(root,[[18.36,1.79],[20.09,1.41],[21.56,1.71],[23.03,2.02],[24.58,1.94]],.41,'#bba47a',.021);
 for(const [x,z,l,flip,canopyLift] of [[17.48,-1.57,2.8,1],[18.73,-4.19,2.18,1,-.27],[22.83,-4.10,2.82,-1],[24.94,-2.45,2.64,-1]]){
  tallTree(root,x,groundAt(x,z)-.045,z,l,flip,canopyLift);
 }
 const owlBranches=[perch(root,points.owlPerches[0],[18.77,2.48,-4.09]),
  perch(root,points.owlPerches[1],[22.83,2.67,-4.05])];
 const owlRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 for(const limb of owlBranches)limb.updateWorldMatrix(true,false);
 function owlTopAt(x,z){
  const index=points.owlPerches.findIndex(p=>Math.hypot(x-p.x,z-p.z)<.40);
  if(index<0)return -Infinity;
  owlRay.ray.origin.set(x,points.owlPerches[index].y+.31,z);
  return owlRay.intersectObject(owlBranches[index],false)[0]?.point.y??-Infinity;
 }
 perch(root,points.peacockPerch,[24.90,1.95,-2.42]);
 const branchSources=[[17.64,1.78,-1.27],[18.79,2.20,-3.88]];
 for(const [i,p] of points.fruitBranches.entries()){
  branch(root,[branchSources[i],[p.x-.25,p.y+.28,p.z-.55],[p.x+.018,p.y+.14,p.z-.025]],.091,.020);
  part(root,soft,fruitTop,p.x+.018,p.y+.097,p.z,[.017,.070,.018]);
  for(const sign of [-1,1]){
   const leaf=part(root,soft,ferns[i],p.x+sign*.10,p.y+.186,p.z-.04,[.118,.024,.076]);leaf.rotation.z=sign*.26;
  }
 }
 const central=points.sharedFruitBranch;
 branch(root,[[18.87,2.02,-3.90],[19.10,2.46,-1.50],[19.48,2.33,-.29],
  [central.x,central.y+.142,central.z]],.094,.016);
 part(root,soft,fruitTop,central.x,central.y+.095,central.z,[.014,.062,.015]);
 for(const side of [-1,1]){
  const leaflet=part(root,soft,ferns[1],central.x+side*.086,central.y+.156,central.z-.038,[.090,.019,.050]);
  leaflet.rotation.z=side*.32;
 }
 const leafTarget=points.leaf;
 const leafTip=[leafTarget.x+.18,leafTarget.y+.43,leafTarget.z+.13];
 // 主枝高过熊站立时的耳朵，只有细柄垂到前掌能碰到的叶面。
 branch(root,[[17.55,1.82,-1.32],[18.04,2.12,-.49],[18.40,2.29,.19],leafTip],.105,.016);
 branch(root,[leafTip,[leafTarget.x+.15,leafTarget.y+.23,leafTarget.z+.10],
  [leafTarget.x+.01,leafTarget.y+.055,leafTarget.z+.012]],.018,.006);
 const foodLeaf=new T.Group();root.add(foodLeaf);
 for(const [j,bearing] of [-.74,.16,1.12].entries()){
  const blade=part(foodLeaf,soft,ferns[j],j*.054-.048,.004+.015*j,.039*j,[.075,.018,.107]);
  blade.rotation.set(.39,bearing,-.25);
 }
 const fruits=points.fruitBranches.map(()=>fruit(root));
 const sharedFruit=fruit(root,sharedSkin);
 const feeding=points.peacockSeedStone;
 const pad=part(root,stone,seedRock,feeding.x,feeding.y-.070,feeding.z,[.292,.092,.232]);
 pad.rotation.y=.34;
 const seeds=points.peacockSeeds.map((p,i)=>{
  const sprout=new T.Group();root.add(sprout);sprout.position.set(p.x,p.y-.023,p.z);
  part(sprout,soft,seedHusk,0,0,0,[.051,.023,.032]).rotation.y=.49-i*1.18;
  part(sprout,soft,seedSeam,.006,.016,.002,[.034,.008,.011]).rotation.y=.49-i*1.18;
  return sprout;
 });
 const twig=tuft(root,points.tuft.x,groundAt(points.tuft.x,points.tuft.z),points.tuft.z,.62,2);
 for(const [i,[x,z,w]] of [[17.56,.82,.35],[18.83,1.51,.38],[19.63,.61,.22],[20.12,-1.58,.38],[16.96,-.30,.31],
  [18.11,-.87,.29],[22.91,1.84,.31],[24.28,1.63,.42],[24.77,-.25,.47],[23.12,-1.66,.38],[19.11,2.71,.29],
  [21.87,2.66,.39],[24.41,2.83,.22],[17.3,2.2,.32]].entries()){
  const y=groundAt(x,z);
  const rock=part(root,stone,riverStones[i%3],x,y+.017,z,[w,w*.30,w*.72]);rock.rotation.y=i*.71;
  tuft(root,x+w*.66,y-.020,z-.11,w*1.08,i+6);
  if(i%3===0)for(let j=0;j<3;j++)part(root,soft,petal,x-.37-j*.09,y+.105+j*.032,z+(j%2)*.12,[.063,.026,.054]);
 }
 const landing=new T.Vector3();
 return {
  root,owlTopAt,hintNodes:{fruits,sharedFruit,leaf:foodLeaf,tuft:twig,seedStone:[pad,...seeds]},
  tick(state,bear){
   twig.rotation.z=-.53*state.tuft.bend;
   for(const seed of state.seeds)seeds[seed.id].visible=seed.phase==='ground';
   for(const [food,mesh] of [[state.leaf,foodLeaf],...state.fruits.map((p,i)=>[p,fruits[i]]),[state.sharedFruit,sharedFruit]]){
    mesh.visible=food.phase!=='spent';
    if(!mesh.visible)continue;
    if(food.phase==='held'||food.phase==='mouth'){
     const joint=food.phase==='held'?bear.paw:bear.mouth;
     joint.getWorldPosition(landing);mesh.position.copy(landing);
     if(food.phase==='mouth'){
      const yaw=state.bear.yaw;
      mesh.position.x+=Math.sin(yaw)*.072;
      mesh.position.z+=Math.cos(yaw)*.072;
     }
    }else mesh.position.set(food.x,food.y,food.z);
    const scale=food.phase==='mouth'?Math.max(.12,1-.78*state.bear.chew):1;
    mesh.scale.setScalar(scale);
    mesh.rotation.y=food.phase==='drop'?state.time*7:state.bear.reach*.14;
    mesh.rotation.z=food.phase==='drop'?state.time*8:food.phase==='held'?state.bear.bring*.35:0;
   }
  }
 };
}
