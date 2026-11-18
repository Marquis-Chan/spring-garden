import * as T from 'three';
import {branch,crownGeometry,pathStrip} from './grove-diorama.js';

const clay=(color,roughness=.83,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
const soft=new T.SphereGeometry(1,24,14),small=new T.SphereGeometry(1,12,9);
const leaves=['#7e9b4c','#9ba554','#709345','#828c47'].map(c=>clay(c));
const rocks=['#b3a388','#c5b496','#967e63'].map(c=>clay(c));
const crowns=[2,0,1,2].map(crownGeometry),crownTint=clay('#d4ca9d',.91,{vertexColors:true});
const rim=clay('#93b6a0'), waterMat=clay('#69b6b2',.32);
const wetPetal=[clay('#eaa994'),clay('#f1c765')], pollen=clay('#f0d389');
const drops=clay('#98deda',.32,{transparent:true,opacity:.92,depthWrite:false,emissive:'#5bc2c6',emissiveIntensity:.28});
const rings=clay('#e1e5bd',.64,{transparent:true,opacity:.64,depthWrite:false});

function add(parent,name,geo,mat,x,y,z,scale=null,shadow=true){
 const mesh=new T.Mesh(geo,mat);mesh.name=name;mesh.position.set(x,y,z);
 if(scale)mesh.scale.set(...scale);
 mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function group(parent,x=0,y=0,z=0){
 const out=new T.Group();out.position.set(x,y,z);parent.add(out);return out;
}
function curve(parent,points,radius,material){
 const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
 return add(parent,'',new T.TubeGeometry(path,11,radius,7),material,0,0,0);
}
function oval(root,pt,sx,sz,material){
 const a=add(root,'池水',new T.CircleGeometry(1,56),material,pt.x,pt.y,pt.z,[sx,sz,1],false);
 a.rotation.x=-Math.PI/2;
}
function leaf(root,x,y,z,angle,s,mat){
 const a=add(root,'叶片',small,mat,x,y,z,[s*.52,s*.11,s],false);
 a.rotation.set(.41,angle,.19);return a;
}
function acacia(root,x,y,z,scale){
 branch(root,[[x,.37,z],[x-.14*scale,.38+(y-.38)*.46,z+.07],[x+.07,y-.47*scale,z],[x+.24*scale,y,z+.08]],.25*scale,.045);
 for(const [k,[sx,sz,span]] of [[-1.10,-.11,.92],[.12,.19,1.23],[1.01,-.28,.94],[.56,-.52,.82]].entries()){
  branch(root,[[x,.38+(y-.38)*.72,z],[x+sx*.59*scale,y-.38*scale,z+sz*.25],[x+sx*scale,y-.22*scale,z+sz*scale]],.10*scale,.023);
  add(root,'伞形树冠',crowns[k],crownTint,x+sx*scale,y-.08*scale,z+sz*scale,[span*scale,.33*scale,.54*scale]);
 }
}
function baskingRock(root,p){
 const geometry=new T.CylinderGeometry(.96,1.10,.22,36,3),vertices=geometry.attributes.position;
 for(let i=0;i<vertices.count;i++){
  const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),a=Math.atan2(z,x);
  const uneven=1+.07*Math.sin(3*a+.44)+.04*Math.cos(5*a-.38);
  vertices.setXYZ(i,x*uneven,y,z*uneven);
 }
 geometry.computeVertexNormals();
 return add(root,'晒石',geometry,rocks[0],p.x,.47,p.z,[1.02,1,1.08]);
}
function flower(root,p,i){
 const g=group(root,p.x,.38,p.z),height=p.y-.38;
 const stem=curve(g,[[0,0,0],[0,height*.5,0],[.018,height,0]],.022,leaves[2]);
 leaf(g,.107,height*.38,.002,1.2,.16,leaves[1]);
 leaf(g,-.093,height*.54,-.011,-1.0,.14,leaves[3]);
 const core=group(g,0,height,0);
 add(core,'花心',small,pollen,0,0,0,[.070,.032,.070],false);
 const petals=[];
 for(let j=0;j<(i===0?5:7);j++){
  const a=j*Math.PI*2/(i===0?5:7);
  const leaflet=group(core,0,0,0);leaflet.rotation.y=-a;
  add(leaflet,'花瓣',small,wetPetal[i],.133,.009,0,[.108,.043,.059],false);
  petals.push(leaflet);
 }
 const soil=add(root,'湿土',new T.CircleGeometry(1,32),clay('#716645',.6,{transparent:true,depthWrite:false}),p.x,.392,p.z,[.29,.20,1],false);
 soil.rotation.x=-Math.PI/2;
 return {g,core,petals,soil,stem};
}
function feedingTree(root,positions){
 return positions.map((p,i)=>{
  const x=i===0?17.24:20.62,z=i===0?3.32:3.42;
  acacia(root,x,i===0?3.34:3.89,z,i===0?.74:1);
  const side=i===0?-.36:.38;
  const tip=[p.x+side,i===0?3.49:3.17,p.z-.20];
  const bend=i===0?[17.97,3.43,p.z-.96]:[p.x+.64,3.20,p.z-.76];
  // 左右两棵树从脸外侧递来枝叶，鹿耳后面留出完整的天空。
  branch(root,[[x-.04,i===0?2.49:2.75,z],[x+.36,i===0?2.86:3.12,z+.24],bend,tip],.094,.019);
  const bud=[tip[0]+side*.98,tip[1]+.19,tip[2]-.18];
  branch(root,[[(tip[0]+bend[0])*.5,(tip[1]+bend[1])*.5,(tip[2]+bend[2])*.5],bud],.024,.007);
  for(const [n,k] of [[-1,.65],[0,1.02],[1,1.52]])leaf(root,bud[0]+n*.076,bud[1]+n*.022,bud[2]+Math.abs(n)*.035,k*side*2,.13,leaves[(n+2+i)%4]);
  const stalkSide=side*(i===0?.79:.37);
  const twig=branch(root,[tip,[p.x+side*(i===0?1.17:.85),p.y+.17,p.z+.06],
   [p.x+stalkSide,p.y+.088,p.z+.195]],.016,.005);
  const cluster=group(root,p.x,p.y,p.z);
  const blades=Array.from({length:3},(_,n)=>leaf(cluster,(n-1)*.096,-.029+n*.025,.032*n,1.07+n*.58,.126,leaves[(n+i)%4]));
  leaf(cluster,stalkSide*.78,.069,.144,side*.95,.128,leaves[i]);
  return {cluster,blades,twig};
 });
}
function grassesOnRock(root,p){
 const tuft=group(root,p.x,.58,p.z);
 const dry=clay('#c4a368'),grain=clay('#ecd096');
 for(const [x,z,lean,height] of [[-.092,.006,-.09,.154],[0,0,0,p.y-.58],[.087,-.034,.09,.216],
  [.074,.052,.17,.137],[-.035,-.047,-.035,.227]]){
  curve(tuft,[[0,.005,0],[x*.63,height*.55,z*.52],[x,height,z]],.013,dry);
  const seed=add(tuft,'芒草草籽',small,grain,x,height,z,[.024,.051,.023],false);
  seed.rotation.z=-lean*1.2;
 }
 for(const [x,z,angle] of [[-.071,.071,-.4],[.06,-.042,.8],[0,-.085,1.6]]){
  leaf(tuft,x,.061,z,angle,.147,leaves[1]);
 }
 return tuft;
}
function setSparkles(bundle,source,spray,age){
 for(const [i,m] of bundle.entries()){
  const q=(age-i*.017)/.43;
  m.visible=q>=0&&q<=1;
  if(!m.visible)continue;
  const origin=spray.origins[i]??=source.clone(),destination=spray.to;
  const bend=Math.sin(Math.PI*q);
  m.position.set(T.MathUtils.lerp(origin.x,destination.x,q)+Math.sin(i*1.85)*.11*q,
   T.MathUtils.lerp(origin.y,destination.y,q)+.61*bend,
   T.MathUtils.lerp(origin.z,destination.z,q)+Math.cos(i*1.44)*.075*q);
  m.scale.set(.042,.055+.022*bend,.042);
 }
}
export function makeSavannaDiorama(scene,points){
 const root=group(scene);
 pathStrip(root,[[11.75,3.66],[13.20,4.33],[14.64,5.21],[17.21,5.85],[18.68,6.11]],.55,'#c4a36e',.022);
 pathStrip(root,[[15.42,5.20],[15.08,6.13],[15.48,7.38],[17.26,7.79],[18.89,7.27]],.18,'#c2a96e',.018);
 const treeLeaves=feedingTree(root,points.leaves);
 acacia(root,23.0,3.58,4.29,1.03);
 const pool=points.water;
 oval(root,{...pool,y:pool.y-.016},.93,.64,rim);
 oval(root,pool,.81,.53,waterMat);
 for(const [i,[dx,dz,s]] of [[-.75,.08,.22],[.57,-.32,.17],[.39,.45,.18],[-.18,.57,.14]].entries()){
  add(root,'岸石',soft,rocks[i%3],pool.x+dx,.407,pool.z+dz,[s,.086,s*.83]);
 }
 const beds=points.flowers.map((p,i)=>flower(root,p,i));
 const rock=baskingRock(root,points.rock);
 const lionGrass=grassesOnRock(root,points.lionGrass);
 const chips=[[14.39,5.14],[22.84,5.84],[15.14,8.65],[19.77,9.28],[22.85,8.82]];
 for(const [i,[x,z]] of chips.entries()){
  add(root,'浅色石子',small,rocks[i%3],x,.419,z,[.15+.033*(i%3),.064,.14]);
  for(let n=0;n<4;n++){
   const angle=n*1.81+i;
   const blade=leaf(root,x+Math.sin(angle)*.17,.53,z+Math.cos(angle)*.16,angle,.22,leaves[(i+n)%4]);
   blade.rotation.x=1.05+(i%3)*.16;
  }
 }
 const sprayDrops=Array.from({length:34},()=>add(root,'水珠',small,drops,0,0,0,null,false));
 const splashes=Array.from({length:10},()=>add(root,'落水',small,drops,0,0,0,[.035,.043,.035],false));
 const rippleList=Array.from({length:2},(_,i)=>{
  const circle=add(root,'吸水涟漪',new T.TorusGeometry(.29,.012,8,40),rings,pool.x,pool.y+.006+i*.003,pool.z,null,false);
  circle.rotation.x=-Math.PI/2;return circle;
 });
 const rainbow=group(root);
 const rainbowColors=['#f49b91','#ffd27f','#d9df8b','#89d1c4','#b6a6e0'];
 rainbowColors.forEach((color,i)=>{
  const material=clay(color,.62,{transparent:true,opacity:.25,depthWrite:false,emissive:color,emissiveIntensity:.39});
  add(rainbow,'水雾虹',new T.TorusGeometry(.42-i*.041,.020,8,36,Math.PI),material,0,0,0,null,false);
 });
 const falling=points.leaves.map((p,i)=>leaf(root,0,0,0,0,i===1?.21:.15,i===1?clay('#c8a04e'):leaves[1]));
 falling.forEach((blade,index)=>{blade.name='随枝飘落的叶'+index;blade.rotation.order='YXZ';});
 const tracks=Array.from({length:12},()=>{
  const mark=add(root,'蹄迹',new T.CircleGeometry(.075,14),clay('#695735',.85,{transparent:true,depthWrite:false}),0,0,0,[.74,1.05,1],false);
  mark.rotation.x=-Math.PI/2;mark.visible=false;return {mark,at:-99};
 });
 [...sprayDrops,...splashes,...rippleList,rainbow,...falling].forEach(object=>{object.visible=false;});
 const selectedAt=[-99,-99];
 const leafSelectedAt=[-99,-99];
 let trackIndex=0;
 const leafMotions=points.leaves.map(()=>null);
 let spray=null,contact=null,scoopAt=-99;
 return {
  root,
  hintNodes:{bough:treeLeaves.map(({cluster,twig})=>[cluster,twig]),flower:beds.map(({core})=>core),rock,lionGrass},
  react(e,time){
   if(e.type==='scoop')scoopAt=time;
   if(e.type==='spray')spray={at:time,to:new T.Vector3(e.x,e.y,e.z),origins:[]};
   if(e.type==='water-hit')contact={at:time,x:e.x,y:e.y,z:e.z};
   if(e.type==='leaf-fall')leafMotions[e.index]={at:time,...e,batAt:null};
   if(e.type==='lion-bats-leaf'&&leafMotions[1])leafMotions[1].batAt=time;
   if(e.type==='flower-select')selectedAt[e.index]=time;
   if(e.type==='leaf-select')leafSelectedAt[e.index]=time;
   if(e.type==='hoof'){
    const spot=tracks[trackIndex++%tracks.length];spot.at=time;spot.mark.position.set(e.x,e.y,e.z);
    spot.mark.rotation.z=-e.yaw;
   }
  },
  tick(model,nozzle,night,shade){
   const time=model.time;
   lionGrass.rotation.x=model.lionGrass.bend*.57;
   lionGrass.rotation.z=Math.sin(time*22)*model.lionGrass.cue*.11-model.lionGrass.bend*.86;
   for(const [i,bed] of beds.entries()){
    const flower=model.flowers[i],motion=contact?.x===flower.x?Math.max(0,1-(time-contact.at)*3):0;
    const picked=time-selectedAt[i];
    bed.core.rotation.z=motion*Math.sin(time*27)*.21+Math.sin(picked*18)*Math.max(0,1-picked*2.5)*.21;
    bed.core.scale.setScalar(.86+flower.bloom*.25+(flower.selected?.047:0));
    for(const petal of bed.petals)petal.rotation.z=.34-(flower.bloom||0)*.53;
    bed.soil.material.opacity=flower.wet*.50;
   }
   for(const [i,node] of treeLeaves.entries()){
    const afterTap=time-leafSelectedAt[i];
    node.cluster.rotation.x=model.leaves[i].bend*.61+Math.sin(afterTap*24)*Math.max(0,1-afterTap*3)*.19;
    node.blades.forEach((blade,n)=>{blade.visible=n<model.leaves[i].remaining;});
   }
   const rippleAge=time-scoopAt;
   for(const [i,ring] of rippleList.entries()){
    ring.visible=rippleAge>i*.12&&rippleAge<.82+i*.12;
    if(ring.visible)ring.scale.setScalar(.44+Math.max(0,rippleAge-i*.12)*1.75);
   }
   const active=spray&&time-spray.at<1.24;
   if(active)setSparkles(sprayDrops,nozzle,spray,time-spray.at);
   else sprayDrops.forEach(drop=>{drop.visible=false;});
   const splashAge=contact?time-contact.at:1;
   for(const [i,drop] of splashes.entries()){
    drop.visible=splashAge>=0&&splashAge<.30;
    if(drop.visible)drop.position.set(contact.x+Math.cos(i*2.39)*splashAge*.64,
     contact.y+Math.sin(Math.PI*splashAge/.30)*(.13+i*.011),contact.z+Math.sin(i*2.39)*splashAge*.56);
   }
   rainbow.visible=!!(active&&night<.28&&shade<.35&&time-spray.at>.28);
   if(rainbow.visible){
    // 把虹留在花上方的水雾里，喷泉的发射点仍跟随活动的象鼻尖。
    rainbow.position.copy(spray.to);
    rainbow.position.y+=.39;
    rainbow.position.z-=.10;
    rainbow.children.forEach(band=>{band.material.opacity=.68*Math.min(1,(time-spray.at-.28)*6)*Math.max(0,1-(time-spray.at-.80)*2);});
   }
   for(const [index,leaf] of falling.entries()){
    const m=leafMotions[index];
    if(!m)continue;
    const age=time-m.at, bat=m.batAt===null?0:(time-m.batAt)/.74;
    const fade=m.batAt!==null?T.MathUtils.smoothstep(bat,.85,1.36):
      T.MathUtils.smoothstep(age,index===1?3.6:.63,index===1?4.15:.95);
    leaf.visible=fade<1;
    if(!leaf.visible)continue;
    const t=Math.min(1,age/m.duration),sway=Math.sin(Math.PI*t);
    const leap=Math.min(1,bat),size=(index===1?.21:.15)*(1-fade);
    const toY=index===1?.406:m.toY;
    // 黄叶先飘到石沿，再从狮爪向石外划弧，回落后逐渐隐入草中。
    leaf.position.set(T.MathUtils.lerp(m.x,m.toX,t)+sway*Math.sin(t*7)*.16-leap*.65,
     T.MathUtils.lerp(m.y,m.toY,t*t)+leap*(toY-m.toY)+Math.sin(Math.PI*leap)*.31,
     T.MathUtils.lerp(m.z,m.toZ,t)+sway*(index===1?.34:0)+leap*.66);
    leaf.rotation.set((index===1?-.22:.10)*(1-leap)+sway*Math.cos(t*8)*.92+Math.sin(leap*Math.PI)*1.47,.46+t*3.6+2.9*leap,sway*.79);
    leaf.scale.set(size*(index===1?.66:.56),size*.10,size);
   }
   for(const {mark,at} of tracks){
    const age=time-at;
    mark.visible=age<1.28;
    if(mark.visible)mark.material.opacity=.31*(1-age/1.28);
   }
  }
 };
}
