import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {coastPoints} from './coast-state.js';
import {makeFish} from './animals.js';

const TAU=Math.PI*2;
const shell=new T.SphereGeometry(1,22,14),bud=new T.SphereGeometry(1,10,8);
const clay=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.79,...extra});
const rust=clay('#bc583d'),red=clay('#df7951'),tip=clay('#f1c09a'),dark=clay('#37382f');
const petal=clay('#d979a1'),rose=clay('#efadc0'),pollen=clay('#e7bb64');
const sage=clay('#779476'),blueLeaf=clay('#658e87'),navy=clay('#565d60');
const seaGlass=clay('#ffffff',{vertexColors:true,roughness:.29,metalness:.08});
const quartz=clay('#ffffff',{vertexColors:true});
const graniteBase=new T.Color('#7c8181'),graniteTop=new T.Color('#b79c91'),streak=new T.Color('#6b6469');

function mesh(root,shape,material,x,y,z){
 const item=new T.Mesh(shape,material);root.add(item);item.position.set(x,y,z);
 item.castShadow=item.receiveShadow=true;return item;
}
function oval(root,shape,material,x,y,z,sx,sy,sz){
 const item=mesh(root,shape,material,x,y,z);item.scale.set(sx,sy,sz);return item;
}
function limb(root,points,base,tipRadius,material){
 const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),length=points.length*3;
 const shape=new T.TubeGeometry(path,length,1,6,false),v=shape.attributes.position;
 const point=new T.Vector3(),center=new T.Vector3();
 for(let i=0;i<=length;i++){
  const u=i/length;path.getPointAt(u,center);
  for(let j=0;j<=6;j++){
   const k=i*7+j;point.fromBufferAttribute(v,k).sub(center).multiplyScalar(T.MathUtils.lerp(base,tipRadius,u)).add(center);
   v.setXYZ(k,point.x,point.y,point.z);
  }
 }
 shape.computeVertexNormals();return mesh(root,shape,material,0,0,0);
}

// 花岗岩的风化层沿着同一石面走，拱门从两端扎进沙地，中间真正可以透景。
function stoneRibbon(root,points,widths,depths,seed){
 const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),steps=36,sides=24;
 const vertices=[],colors=[],indices=[],color=new T.Color();
 for(let i=0;i<=steps;i++){
  const u=i/steps,axis=path.getPoint(u),tangent=path.getTangent(u);
  const side=new T.Vector3(-tangent.y,tangent.x,0).normalize();
  const along=u*(widths.length-1),k=Math.min(widths.length-2,Math.floor(along)),f=along-k;
  const w=T.MathUtils.lerp(widths[k],widths[k+1],f),d=T.MathUtils.lerp(depths[k],depths[k+1],f);
  for(let j=0;j<sides;j++){
   const a=TAU*j/sides,irregular=1+.077*Math.cos(3*a+u*7+seed)+.051*Math.cos(5*a-u*9);
   const p=axis.clone().addScaledVector(side,w*Math.cos(a)*irregular);
   p.z+=Math.sin(a)*d*irregular;vertices.push(p.x,p.y,p.z);
   const h=p.y-.65;
   const seam=T.MathUtils.smoothstep(Math.cos(h*14+p.x*.95+.32*Math.sin(p.x*3)+seed),.965,.999);
   color.copy(graniteBase).lerp(graniteTop,T.MathUtils.clamp(.18+h*.54+.11*Math.sin(a),0,1)).lerp(streak,.47*seam);
   colors.push(color.r,color.g,color.b);
   if(i<steps){const m=i*sides+j,n=i*sides+(j+1)%sides;indices.push(m,n,m+sides,n,n+sides,m+sides);}
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 return mesh(root,geo,quartz,0,0,0);
}

function weatheredSlab(root,x,y,z,sx,sy,sz,angle,seed){
 const shape=new T.SphereGeometry(1,44,27),v=shape.attributes.position,colors=[],tint=new T.Color();
 for(let i=0;i<v.count;i++){
  const a=v.getX(i),b=v.getY(i),c=v.getZ(i);
  const uneven=.96+.055*Math.sin(a*4.6+c*6+seed)+.04*Math.cos(b*7-c*4);
  const top=Math.sign(b)*Math.pow(Math.abs(b),.68);
  v.setXYZ(i,(a*uneven+.17*b)*sx,(top*uneven+.11*a)*sy,c*uneven*sz);
  const seam=Math.cos(top*10+2.1*a+.95*c+seed);
  tint.copy(graniteBase).lerp(graniteTop,T.MathUtils.smoothstep(top+.16*a,-.02,.95))
   .lerp(streak,.43*T.MathUtils.smoothstep(seam,.93,1))
   .multiplyScalar(.97+.045*Math.sin(a*9+c*7+b*5));
  colors.push(tint.r,tint.g,tint.b);
 }
 shape.setAttribute('color',new T.Float32BufferAttribute(colors,3));shape.computeVertexNormals();
 mesh(root,shape,quartz,x,y,z).rotation.y=angle;
}

function flowerClump(root,x,y,z,scale,seed){
 for(let i=0;i<16;i++){
  const a=2.4*i+seed,r=.31*Math.sqrt(i/16)*scale,dx=Math.sin(a),dz=Math.cos(a);
  const leaf=oval(root,bud,i%3?sage:blueLeaf,x+r*dx,y+.072*scale,z+r*dz,.028*scale,.027*scale,(.13+.027*Math.sin(i))*scale);
  leaf.rotation.order='YXZ';leaf.rotation.y=a;leaf.rotation.x=-.49;
 }
 for(let flower=0;flower<3;flower++){
  const a=flower*2.39+seed,cx=x+Math.sin(a)*.25*scale,cz=z+Math.cos(a)*.19*scale;
  const cy=y+(.16+flower*.012)*scale;
  limb(root,[[cx-.04,y,cz],[cx,cy-.07,cz],[cx,cy,cz]],.014,.008,sage);
  for(let i=0;i<10;i++){
   const angle=TAU*i/10+flower;
   const p=oval(root,bud,flower===2?rose:petal,cx+Math.sin(angle)*.071*scale,cy+.010,cz+Math.cos(angle)*.071*scale,.025*scale,.014*scale,.061*scale);
   p.rotation.order='YXZ';p.rotation.y=angle;p.rotation.x=-.21;
  }
  oval(root,bud,pollen,cx,cy+.018*scale,cz,.043*scale,.032*scale,.043*scale);
 }
}

// 固定花瓣和石纹按材质绘制，镜头拖过海岸时不用逐片提交几百朵花叶。
function batchFixed(group){
 group.updateWorldMatrix(true,true);
 const batches=new Map(),shared=new Set([shell,bud]);
 for(const item of group.children){
  const geo=item.geometry.index?item.geometry.toNonIndexed():item.geometry.clone();
  geo.deleteAttribute('uv');geo.applyMatrix4(item.matrix);
  if(!batches.has(item.material))batches.set(item.material,[]);
  batches.get(item.material).push(geo);
  if(!shared.has(item.geometry))item.geometry.dispose();
 }
 group.clear();
 for(const [material,list] of batches){
  const shape=mergeGeometries(list);for(const g of list)g.dispose();mesh(group,shape,material,0,0,0);
 }
}

function makeCrab(root){
 const actor=new T.Group();root.add(actor);
 const carapace=oval(actor,shell,red,0,.147,0,.24,.12,.16);
 const legs=[],claws=[];
 for(const sign of [-1,1]){
  for(let i=0;i<4;i++){
   const z=-.105+.064*i,length=.30+.07*Math.sin((i+.3)*.81);
   const leg=new T.Group();actor.add(leg);leg.position.set(sign*.145,.11,z);
   limb(leg,[[0,0,0],[sign*.085,.052,-.015],[sign*(length-.16),.036,-.036],[sign*(length-.082),-.102,-.065]],.029,.010,rust);
   legs.push({leg,i,sign});
  }
  const claw=new T.Group();actor.add(claw);claw.position.set(sign*.124,.145,.10);
  limb(claw,[[0,0,0],[sign*.12,-.012,.082],[sign*.16,.036,.13]],.034,.040,rust);
  oval(claw,bud,red,sign*.157,.065,.132,.067,.063,.056);
  limb(claw,[[sign*.18,.079,.14],[sign*.19,.134,.145],[sign*.166,.167,.148]],.036,.009,tip);
  limb(claw,[[sign*.136,.076,.14],[sign*.121,.117,.152],[sign*.141,.145,.15]],.027,.006,tip);
  claws.push({claw,sign});
  limb(actor,[[sign*.096,.20,.072],[sign*.115,.25,.085],[sign*.115,.274,.097]],.015,.014,red);
  oval(actor,bud,dark,sign*.115,.275,.10,.026,.026,.024);
  oval(actor,bud,tip,sign*.11,.284,.120,.008,.008,.004);
  for(let j=0;j<3;j++)oval(actor,bud,rust,sign*(.07+.045*j),.23-j*.013,-.041,.016,.007,.015);
 }
 return {root:actor,pose(crab){
  actor.position.set(crab.x,crab.y,crab.z);actor.rotation.y=-.19;
  carapace.position.y=.147+.014*crab.gait*Math.cos(crab.stride*2);
  for(const {leg,i,sign} of legs){
   const beat=crab.stride+i*Math.PI+sign*.72;
   leg.rotation.z=sign*Math.max(0,Math.sin(beat))*.34*crab.gait;
   leg.rotation.y=.26*Math.cos(beat)*crab.gait;
  }
  for(const {claw,sign} of claws){claw.rotation.x=-crab.claw*(sign>0?.84:.49);claw.rotation.z=sign*.095*crab.gait;}
 }};
}

function makeKelp(root,p,index){
 const patch=new T.Group();patch.position.set(p.x,.263,p.z);root.add(patch);
 const ribbons=[],greens=[clay('#718c55',{side:T.DoubleSide}),clay('#547f62',{side:T.DoubleSide}),clay('#97a35e',{side:T.DoubleSide})];
 oval(patch,bud,navy,0,.014,0,.31,.065,.17);
 for(let i=0;i<9;i++){
  const angle=i*2.4+index,length=.40+.13*(i%3),pos=[],faces=[];
  for(let j=0;j<=12;j++){
   const k=j/12,w=.088*Math.pow(Math.sin(Math.PI*k),.66)*(1+.16*Math.sin(k*15));
   const y=.02+.12*Math.sin(k*Math.PI*.9)+.014*Math.sin(k*12+i),x=.11*Math.sin(k*4.5)*k;
   pos.push(x-w,y,k*length,x,y+.012,k*length,x+w,y,k*length);
   if(j<12){const n=j*3;faces.push(n,n+1,n+3,n+1,n+4,n+3,n+1,n+2,n+4,n+2,n+5,n+4);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(faces);geo.computeVertexNormals();
  const blade=mesh(patch,geo,greens[i%3],.09*Math.sin(angle),.008,.07*Math.cos(angle));
  blade.rotation.order='YXZ';blade.rotation.y=angle;ribbons.push({blade,angle});
 }
 return {root:patch,pose(time,sway){
  for(const {blade,angle} of ribbons)blade.rotation.x=.08*Math.sin(time*.85+angle)-.26*sway;
 }};
}

export function makeSilverFry(root,index,{backColour='#577f80',bellyColour='#d2dac4',contrast=.65}={}){
 const fish=makeFish(T),size=[.51,.46,.47][index];
 // 银灰的侧线和透明灰的尾鳍跟着身体转动，停进叶丛后一起隐去。
 const back=new T.Color(backColour),silver=new T.Color(bellyColour),c=new T.Color();
 fish.root.traverse(item=>{
  const geometry=item.geometry;
  if(!geometry?.attributes.color)return;
  const pigment=geometry.attributes.color,p=geometry.attributes.position;
  const lowest=new T.Box3().setFromBufferAttribute(p);
  for(let i=0;i<pigment.count;i++){
   const h=T.MathUtils.inverseLerp(lowest.min.y,lowest.max.y,p.getY(i));
   c.copy(silver).lerp(back,T.MathUtils.smoothstep(h,.41,.90)*contrast);
   pigment.setXYZ(i,c.r,c.g,c.b);
  }
 });
 fish.root.scale.set(size,.36,size);fish.root.visible=false;root.add(fish.root);return fish;
}

export function poolRadius(x,z){
 const pool=coastPoints.tidePool,dx=(x-pool.x)/.70,dz=(z-pool.z)/.33;
 const angle=Math.atan2(dz,dx);
 return Math.hypot(dx,dz)/(1+.055*Math.sin(angle*3+.7)+.036*Math.cos(angle*5));
}

export function makeIntertidal(root,ground){
 const scenery=new T.Group();root.add(scenery);
 stoneRibbon(scenery,[[31.95,.16,10.36],[32.40,1.28,10.27],[32.79,1.59,10.33],[33.42,1.47,10.40],[34.05,.19,10.54]],
  [.68,.51,.37,.29,.42],[.75,.59,.47,.42,.56],2);
 weatheredSlab(scenery,32.08,.97,10.17,1.04,.88,.70,.26,1);
 weatheredSlab(scenery,31.86,.71,10.78,1.13,.29,.59,-.38,4);
 weatheredSlab(scenery,33.87,.74,10.74,.60,.31,.41,.21,5);
 weatheredSlab(scenery,40.45,1.04,10.07,1.52,.88,.83,.26,1.5);
 weatheredSlab(scenery,41.38,.82,10.72,1.23,.52,.84,-.45,2.8);
 weatheredSlab(scenery,40.05,.67,11.09,.84,.26,.49,.2,3.7);
 for(const [x,z,s,seed] of [[33.77,12.00,1.6,2],[34.23,11.77,1.1,7],[39.45,11.78,1.4,9],[40.04,12.06,1.3,3]]){
  flowerClump(scenery,x,ground(x,z),z,s,seed);
 }
 const {x,y,z}=coastPoints.tidePool;
 const waterSkin=shell.clone(),waterPoints=waterSkin.attributes.position,waterColors=[];
 const turquoise=new T.Color('#519a91'),rim=new T.Color('#accbb1'),color=new T.Color();
 for(let i=0;i<waterPoints.count;i++){
  const a=waterPoints.getX(i),c=waterPoints.getZ(i);
  color.copy(turquoise).lerp(rim,T.MathUtils.smoothstep(Math.hypot(a,c),.13,1));
  color.multiplyScalar(.96+.05*Math.cos(a*12+c*7));
  waterColors.push(color.r,color.g,color.b);
 }
 waterSkin.setAttribute('color',new T.Float32BufferAttribute(waterColors,3));
 const water=oval(root,waterSkin,seaGlass,x,y,z,.65,.017,.305);
 water.castShadow=false;
 for(const [dx,dz,s] of [[-.61,.045,.25],[-.49,-.18,.24],[.41,.22,.20],[.57,.13,.19],[.50,-.23,.13]]){
  oval(scenery,shell,navy,x+dx,ground(x+dx,z+dz)+.015,z+dz,s,.09,s*.65);
 }
 // 入口就在低石檐前，蟹经过时始终走在潮池后缘的干净湿沙上。
 weatheredSlab(scenery,x-.84,.75,z-.60,.15,.29,.23,-.14,5);
 weatheredSlab(scenery,x-.34,.76,z-.88,.30,.33,.15,.07,3);
 weatheredSlab(scenery,x-.49,1.085,z-.69,.49,.088,.227,-.14,2);
 for(let i=0;i<8;i++){
  const angle=i*2.4;
  oval(scenery,bud,i%3?navy:tip,x-.49+.18*Math.cos(angle),1.163-.004*(i%3),z-.69+.095*Math.sin(angle),.036,.016,.046);
 }
 batchFixed(scenery);
 const crab=makeCrab(root),kelp=coastPoints.kelp.map((p,i)=>makeKelp(root,p,i));
 const fry=[0,1,2].map(i=>makeSilverFry(root,i));
 return {crab,water,kelp,fry,tick(state){
  crab.pose(state.crab);
  kelp.forEach((p,i)=>p.pose(state.time,state.kelp[i].sway));
  for(const f of state.fry){
   const fish=fry[f.index];fish.root.visible=f.visible;
   if(!f.visible)continue;
   fish.root.position.set(f.x,f.y,f.z);fish.root.rotation.y=f.yaw;fish.pose({time:state.time,tail:f.tail,dive:0});
  }
 }};
}
