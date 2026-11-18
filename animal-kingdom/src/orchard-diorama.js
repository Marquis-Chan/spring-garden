import * as T from 'three';
import {makeRabbitCarrot} from './orchard-carrot.js';
import {branch,pathStrip} from './grove-diorama.js';
import {groundHeight} from './diorama.js';

const clay=(color,roughness=.82)=>new T.MeshStandardMaterial({color,roughness});
const round=new T.SphereGeometry(1,22,14);
const greens=['#779d50','#8caf59','#9db45d','#638d57','#a4b870'].map(color=>clay(color));
const flowers=['#d995bd','#edb979','#cbb6e2','#f4de9f'].map(color=>clay(color));
const honey=clay('#e5b569'),hiveDark=clay('#513c2a'),stem=clay('#755139');
const grass=clay('#91a660');
const wicker=clay('#b48856'),wickerLight=clay('#cea873'),inner=clay('#987149');
const leafBody=new T.SphereGeometry(1,14,10);

function mesh(parent,geometry,material,x=0,y=0,z=0,scale=null,shadow=true){
 const object=new T.Mesh(geometry,material);object.position.set(x,y,z);
 if(scale)object.scale.set(...scale);
 object.castShadow=shadow;object.receiveShadow=true;parent.add(object);
 return object;
}
function group(parent,x=0,y=0,z=0){
 const object=new T.Group();
 object.position.set(x,y,z);parent.add(object);return object;
}
function tube(parent,points,radius,material,n=12){
 const trace=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
 return mesh(parent,new T.TubeGeometry(trace,n,radius,6),material);
}
function leaf(parent,x,y,z,s,angle,color){
 const node=mesh(parent,leafBody,color,x,y,z,[s*.43,s*.084,s],false);
 node.rotation.set(.1,angle,.31);return node;
}
function crown(parent,x,y,z,sx,sy,sz,index){
 const geometry=new T.SphereGeometry(1,28,18);
 const attr=geometry.attributes.position;
 for(let i=0;i<attr.count;i++){
  const vx=attr.getX(i),vy=attr.getY(i),vz=attr.getZ(i);
  const d=1+.07*Math.sin(vx*7+vz*4+index)*Math.cos(vy*7+vz*5);
  attr.setXYZ(i,vx*d,vy*d,vz*d);
 }
 geometry.computeVertexNormals();
 mesh(parent,geometry,greens[index%greens.length],x,y,z,[sx,sy,sz]);
}
function fruit(parent,i){
 const root=group(parent);
 const profile=[[0,-.149],[.05,-.154],[.102,-.141],[.138,-.112],[.157,-.056],
  [.158,.043],[.139,.107],[.101,.143],[.061,.147],[.032,.126],[0,.119]];
 const geometry=new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),36);
 const colors=['#cf5947','#d67448','#bd4a42'];
 // 肩部略分瓣，靠光的一侧泛红，树上和篮里是同一枚苹果。
 const p=geometry.attributes.position,col=[],red=new T.Color(colors[i%colors.length]);
 const honey=new T.Color('#eaa567'),rim=new T.Color();
 for(let j=0;j<p.count;j++){
  const x=p.getX(j),y=p.getY(j),z=p.getZ(j),a=Math.atan2(x,z);
  const lobes=1+.032*Math.cos(5*a+i)*T.MathUtils.smoothstep(Math.abs(y),.05,.15);
  p.setXYZ(j,x*lobes,y,z*lobes);
  rim.copy(red).lerp(honey,.44*T.MathUtils.smoothstep(x*.56+y+z*.2,-.04,.17));
  col.push(rim.r,rim.g,rim.b);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(col,3));
 geometry.computeVertexNormals();
 const material=clay('#ffffff',.67);material.vertexColors=true;
 mesh(root,geometry,material);
 tube(root,[[0,.115,0],[.017,.168,0],[.028,.199,.004]],.012,stem,7);
 leaf(root,.064,.157,.030,.090,-1.13,greens[1]);
 return {root,material};
}
function makeFruitTree(root,points){
 branch(root,[[4.20,.37,4.69],[4.16,1.24,4.64],[4.27,2.19,4.77],[4.31,3.21,4.45]],.37,.11);
 branch(root,[[4.19,1.41,4.69],[3.80,1.78,4.98],[3.34,1.99,5.43],[3.18,2.06,5.46]],.15,.026);
 branch(root,[[4.23,2.05,4.74],[4.27,2.36,5.00],[4.13,2.398,5.40],[4.04,2.47,5.43]],.15,.027);
 branch(root,[[4.23,1.68,4.73],[4.55,2.04,5.13],[4.85,2.087,5.48],[4.95,2.19,5.49]],.17,.031);
 branch(root,[[4.26,2.33,4.70],[4.99,2.70,4.87],[5.63,2.51,4.99],[5.83,2.36,4.98]],.17,.033);
 branch(root,[[4.14,.64,4.69],[3.83,.43,4.93],[3.55,.376,5.11]],.14,.013);
 branch(root,[[4.27,.68,4.68],[4.68,.43,5.01],[4.89,.379,5.09]],.13,.014);
 for(const [i,args] of [[3.31,3.05,4.37,1.04,.61,.67],[4.34,3.55,4.37,1.14,.73,.75],
  [5.26,3.13,4.54,1.05,.63,.77],[4.40,2.88,4.95,.94,.51,.57],[3.68,3.43,4.25,.81,.68,.59],
  [4.92,3.46,4.29,.88,.65,.58]].entries())crown(root,...args,i);
 for(const [i,point] of points.apples.entries()){
  leaf(root,point.x-.13,point.y+.28,point.z-.085,.22,.88*i,greens[i]);
  leaf(root,point.x+.11,point.y+.24,point.z-.11,.17,1.2+.37*i,greens[(i+1)%3]);
 }
}
function petals(root,p,variant){
 const color=flowers[variant%flowers.length],h=p.y-.38,head=[];
 tube(root,[[p.x,.38,p.z],[p.x-.05,.38+h*.48,p.z-.03],[p.x,p.y-.065,p.z]],.023,greens[3],8);
 for(let i=0;i<6;i++){
  const theta=i*Math.PI/3;
  const petal=mesh(root,round,color,p.x+Math.cos(theta)*.16,p.y-.09,p.z+Math.sin(theta)*.16,[.126,.047,.078],false);
  petal.rotation.y=-theta;
  head.push(petal);
 }
 head.push(mesh(root,round,honey,p.x,p.y-.045,p.z,[.082,.049,.082],false));
 leaf(root,p.x+.12,.44+h*.38,p.z+.063,.18,1.11,greens[1]);
 leaf(root,p.x-.12,.44+h*.27,p.z+.019,.14,-1.12,greens[2]);
 return head;
}
function makeHive(root,p){
 const hive=group(root,p.x,p.y+.19,p.z-.31);
 tube(root,[[p.x,2.37,p.z-.305],[p.x,2.11,p.z-.31],[p.x,p.y+.56,p.z-.31]],.031,stem,6);
 const contour=[[0,-.31],[.16,-.30],[.25,-.27],[.31,-.17],[.33,-.07],[.30,.08],[.25,.19],[.18,.28],[.085,.35],[0,.37]];
 mesh(hive,new T.LatheGeometry(contour.map(v=>new T.Vector2(...v)),32),honey);
 for(const [r,y] of [[.214,-.27],[.29,-.21],[.326,-.12],[.334,-.034],[.312,.056],[.276,.135],[.221,.221],[.157,.293]]){
  const coil=mesh(hive,new T.TorusGeometry(r,.016,6,32),wickerLight,0,y,0);
  coil.rotation.x=Math.PI/2;
 }
 mesh(hive,round,hiveDark,0,-.19,.315,[.116,.075,.021],false);
 mesh(hive,round,wicker,0,-.253,.338,[.153,.025,.102],false);
 return hive;
}
function makeBasket(root,p){
 const basket=group(root,p.x,p.y,p.z);
 mesh(basket,new T.CylinderGeometry(.50,.44,.072,34),inner,0,.060,0);
 const gate=-2.43,start=gate+.62,end=gate+Math.PI*2-.62;
 for(let i=0;i<7;i++){
  const y=.095+i*.039,r=.445+i*.012,points=[];
  for(let j=0;j<=26;j++){
   const a=T.MathUtils.lerp(start,end,j/26),w=.009*Math.sin(j*1.8+i);
   points.push([Math.cos(a)*(r+w),y,Math.sin(a)*(r+w)]);
  }
  tube(basket,points,i===6?.034:.021,i%2?wickerLight:wicker,40);
 }
 for(let i=0;i<=25;i++){
  const theta=T.MathUtils.lerp(start,end,i/25);
  tube(basket,[[.445*Math.cos(theta),.082,.445*Math.sin(theta)],
   [.479*Math.cos(theta),.20,.479*Math.sin(theta)],[.518*Math.cos(theta),.332,.518*Math.sin(theta)]],
  .014,i%2?wicker:wickerLight,6);
 }
 return basket;
}
function gardenDetails(root){
 for(const [i,[x,z,s]] of [[1.89,6.66,.8],[2.71,5.18,.64],[7.23,6.85,.65],
  [6.69,5.95,.62],[5.1,4.09,.55]].entries()){
  const y=groundHeight(x,z);
  mesh(root,round,grass,x,y-.042,z,[s*.37,.063,s*.22],false);
  for(let j=0;j<4;j++){
   const a=i*2+j*1.34;
   const blade=leaf(root,x+Math.sin(a)*.10,y+.14+s*.07,z+Math.cos(a)*.095,s*.31,a,greens[(i+j)%4]);
   blade.rotation.x=.63+(j%2)*.18;
  }
  if(i%3===0)petals(root,{x:x+.11,y:y+.20,z:z-.13},i);
 }
 mesh(root,round,clay('#b2a48a'),2.10,.31,6.35,[.45,.19,.31]);
 mesh(root,round,clay('#c8b69a'),7.12,.36,7.23,[.38,.14,.27]);
}
export function makeOrchardDiorama(scene,points){
 const root=group(scene);
 pathStrip(root,[[3.27,3.24],[3.95,3.30],[4.67,3.21],[5.38,3.43]],.34,'#c1a673',.018);
 pathStrip(root,[[4.71,1.78],[5.03,2.92],[5.47,3.92],[5.88,4.47],[6.43,5.52],[7.06,6.28]],.36,'#c1a673',.014);
 pathStrip(root,[[7.02,.71],[7.61,2.01],[7.50,3.14],[6.61,4.20],[5.88,4.47]],.34,'#c1a673',.022);
 makeFruitTree(root,points);
 gardenDetails(root);
 const flowerHeads=points.butterfly.map((p,i)=>petals(root,p,i));
 points.beeFlowers.forEach((p,i)=>petals(root,p,i+3));
 const hive=makeHive(root,points.hive),basket=makeBasket(root,points.basket);
 const apples=points.apples.map((_,i)=>fruit(root,i));
 const carrot=makeRabbitCarrot(root);
 let hiveAt=-99;
 return {
  root,
  hintNodes:{apple:apples.map(({root})=>root),hive,basket,flowers:flowerHeads,carrot:carrot.root},
  react(event,time){if(event.type==='bee-flight')hiveAt=time;},
  tick(model,hover,family){
   carrot.tick(family?.carrot);
   for(const [i,a] of model.apples.entries()){
    const f=apples[i];
    f.root.position.set(a.x,a.y,a.z);f.root.rotation.x=a.rotation;
    f.root.visible=a.phase!=='recover';
    f.material.emissiveIntensity=hover===i&&a.phase==='branch'?.21:0;
    f.material.emissive.set('#fb8752');
   }
   basket.rotation.z=model.basketTilt*.46;
   const age=model.time-hiveAt;
   hive.rotation.z=age<.9?Math.sin(age*13)*.13*Math.exp(-age*3.5):0;
  }
 };
}
