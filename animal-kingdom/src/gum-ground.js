import * as T from 'three';
import {group,mesh,clay,closedShape,paintSphere} from './savanna-actors.js';
import {grazingTuft,hedgehogDoor} from './gum-ground-state.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const tau=Math.PI*2;
const pelt=clay(T,'#ffffff',.91,true),ink=clay(T,'#393332'),cream=clay(T,'#f1e2c6'),
 pink=clay(T,'#b98776'),darkFur=clay(T,'#786350'),nose=clay(T,'#393039',.61),gloss=clay(T,'#ffefce');
const soil=clay(T,'#a08a64'),shade=clay(T,'#564635'),black=clay(T,'#433b36');
const sphere=new T.SphereGeometry(1,18,13);
const band=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
function coat(base,warm,light,chest){
 const a=new T.Color(base),b=new T.Color(warm),c=new T.Color(light),mix=new T.Color();
 return (x,y,z,angle)=>{
  const texture=.032*Math.sin(Math.round(17*x+y*13))*Math.cos(z*17-y*5);
  return mix.copy(a).lerp(b,Math.max(0,Math.min(1,.33+.23*y+.13*Math.cos(3*z)+texture)))
   .lerp(c,chest?chest(x,y,z,angle):0);
 };
}
const shoulder=paintSphere(T,coat('#927865','#b27a56','#dfccb0',(x,y,z)=>band(.40,.94,z)*(.74+.25*y)));
const flank=paintSphere(T,coat('#897c6b','#b49b7c','#d4bb98',(x,y,z)=>.57*band(.22,.9,-y+z*.31)));
const chin=paintSphere(T,coat('#a08568','#ad997d','#e2d3b4',(x,y,z)=>band(.0,.8,-y+z*.25)));
const brown=coat('#847669','#a68e75','#c2ad93',(x,y,z,a)=>.52*band(.16,.8,-Math.cos(a)));
const oval=(root,name,mat,x,y,z,w,h,d,geo=sphere)=>mesh(T,root,name,geo,mat,[x,y,z],[w,h,d]);
const furry=(root,name,g,x,y,z,w,h,d)=>oval(root,name,pelt,x,y,z,w,h,d,g);
function profile(parent,name,rings,paint=brown){
 return mesh(T,parent,name,closedShape(T,rings,24,paint),pelt);
}
function marker(parent,name,x,y,z){return group(T,parent,name,[x,y,z]);}
function longEar(head,sign,small){
 const root=group(T,head,'转向声源的耳根',[sign*.087,.085,-.037]);
 const scale=small?.78:1;
 const ear=oval(root,'尖长外耳',darkFur,0,.135*scale,0,.055*scale,.16*scale,.039*scale);
 ear.rotation.z=-sign*.068;
 oval(root,'绒色耳心',pink,0,.153*scale,.031*scale,.031*scale,.105*scale,.012*scale);
 return root;
}
function wallabyHead(root,small=false){
 const h=group(T,root,small?'小袋鼠的脑袋':'妈妈的头');
 profile(h,'长额和细口鼻',[[-.145,.008,.029,.049],[-.10,.023,.113,.117],[-.034,.035,.145,.141],
  [.038,.024,.146,.137],[.115,.002,.114,.096],[.205,-.024,.085,.059],[.238,-.030,.062,.044]],
 coat(small?'#b79a78':'#90785f',small?'#ccb390':'#c39d77','#ecdbc0',(x,y,z,a)=>.70*band(.12,.94,-Math.cos(a))));
 oval(h,'乌黑鼻尖',nose,0,-.014,.238,.066,.044,.043);
 const ears=[];
 for(const s of [-1,1]){
  const patch=furry(h,'淡色颊纹',chin,s*.114,-.013,.079,.023,.030,.086);patch.rotation.x=-.20;
  oval(h,'湿润眼珠',ink,s*.131,.057,.061,.027,.030,.025);
  oval(h,'眼光',gloss,s*.147,.069,.077,.0067,.0072,.0062);
  ears.push(longEar(h,s,small));
 }
 return {head:h,ears};
}
function wallabyModel(parent){
 const root=group(T,parent,'红颈沙袋鼠妈妈'),back=group(T,root,'随髋起落的躯干');
 furry(back,'袋鼠的腰胯',flank,0,.32,-.03,.238,.30,.275);
 const upper=group(T,back,'由髋向前俯身的胸腹',[0,.38,.015]);
 const chest=furry(upper,'栗色肩颈与淡色胸腹',shoulder,0,.22,.082,.189,.348,.173);
 chest.rotation.x=.28;
 furry(upper,'有毛的颈根',shoulder,0,.467,.176,.132,.222,.129);
 const adult=wallabyHead(upper);adult.head.position.set(0,.610,.205);
 const paws=[];
 for(const s of [-1,1]){
  const arm=group(T,upper,'靠胸收起的前肢',[s*.157,.365,.092]);
  const armSkin=furry(arm,'前肩到肘',shoulder,0,-.092,.015,.063,.142,.064);armSkin.rotation.x=-.36;
  const wrist=oval(arm,'短前臂',darkFur,0,-.199,.079,.046,.098,.043);wrist.rotation.x=-.76;
  oval(arm,'收拢的小掌',darkFur,0,-.247,.145,.040,.044,.068);
  paws.push(arm);
 }
 // 育儿袋的顶边是一个真实开口，幼崽收回时下半张脸先被前袋遮住。
 const bag=group(T,upper,'袋口与幼崽同随母体',[0,-.011,.208]);
 const inner=clay(T,'#74604e'),bagFur=clay(T,'#cfb590');
 const holder=group(T,bag,'从袋里探头的幼崽',[0,0,0]);
 const joey=wallabyHead(holder,true);joey.head.scale.setScalar(.88);joey.head.rotation.y=-.22;
 furry(holder,'幼崽的绒毛肩颈',chin,0,-.086,-.013,.084,.102,.067);
 const coords=[],idx=[],rows=9,cols=32;
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const t=i/rows,a=j/cols*tau,r=.15+.85*Math.sin(t*Math.PI*.57);
  coords.push(.157*r*Math.sin(a),-.094+.167*t+.012*Math.cos(a),.029+.107*r*Math.cos(a));
  if(i<rows&&j<cols){const q=i*(cols+1)+j;idx.push(q,q+cols+1,q+1,q+1,q+cols+1,q+cols+2);}
 }
 const bagGeo=new T.BufferGeometry();bagGeo.setAttribute('position',new T.Float32BufferAttribute(coords,3));bagGeo.setIndex(idx);bagGeo.computeVertexNormals();bagFur.side=T.DoubleSide;
 mesh(T,bag,'向上开口的暖色绒袋',bagGeo,bagFur);
 oval(bag,'袋里柔软的暗部',inner,0,.049,.029,.154,.025,.102);
 const trim=new T.TorusGeometry(1,.066,7,40);
 const rim=mesh(T,bag,'毛绒袋沿',trim,bagFur,[0,.077,.029],[.154,.105,.12]);rim.rotation.x=Math.PI/2-.075;
 const tail=group(T,back,'渐细的长尾',[0,.25,-.15]);
 const tailGeo=profile(tail,'顺地面弯下的尾巴',[[-.99,-.215,.009,.011,.065],[-.83,-.204,.030,.029,.063],
  [-.64,-.176,.044,.041,.048],[-.43,-.126,.065,.065,.029],[-.23,-.058,.099,.093,.012],[.024,.009,.122,.126]],coat('#8d7e6b','#a7977d','#c8b195',(x,y,z,a)=>.3*band(.1,.9,-Math.cos(a))));
 const legs=[];
 for(const s of [-1,1]){
  const leg=group(T,back,'有力的后腿',[s*.156,.326,-.065]);
  const thigh=furry(leg,'浑圆后臀',flank,0,-.012,.040,.134,.194,.178);
  thigh.rotation.x=-.29;
  const shin=furry(leg,'弯曲的后小腿',flank,s*.014,-.132,.005,.064,.141,.080);shin.rotation.x=.62;
  const foot=group(T,leg,'长后掌',[s*.013,-.300,-.060]);
  furry(foot,'细长脚掌',flank,0,.024,.130,.063,.050,.204);
  for(const toe of [-1,1])oval(foot,'趾尖',darkFur,toe*.021,.022,.279,.026,.032,.071);
  legs.push(leg);
 }
 const focus=marker(back,'育儿袋上方的点按中心',0,.58,.115);
 function pose(s,t){
  root.position.set(s.x,s.up,s.z);root.rotation.y=s.yaw;
  const f=s.nibble,l=s.look,peek=s.peek,breathe=Math.sin(t*1.37);
  back.position.y=.006*breathe*(1-f)+.035*s.tuck;
  upper.rotation.x=f*(1.252+.021*Math.sin(t*10))-.07*l-.067*s.tuck;
  upper.rotation.y=.13*l;
  adult.head.rotation.x=.28*peek-.16*l-.20*f;
  adult.head.rotation.y=.34*l-.30*peek;
  for(const [i,e] of adult.ears.entries()){
   const sign=i?1:-1;e.rotation.z=-sign*(.22+.31*s.ears);
   e.rotation.x=-.17-.14*s.tuck+.1*Math.sin(t*.91+i)*(.3+.7*l);
   e.rotation.y=sign*.22+l*.58;
  }
  // 只有耳尖越过袋口后幼崽才可见，俯身前会先缩进袋里。
  holder.visible=peek>.08;holder.position.set(0,-.142+.334*peek,-.008+.065*peek);
  holder.scale.setScalar(.58+.42*peek);
  joey.head.rotation.x=-.26*l;joey.head.rotation.y=.30*l-.23;
  joey.ears.forEach((e,i)=>{e.rotation.z=(i?-1:1)*(.31+.09*Math.sin(t*3+i));});
  for(const [i,leg] of legs.entries()){
   leg.rotation.x=-.74*s.tuck;
   paws[i].rotation.x=-.53*s.tuck+.26*f;
  }
  tail.rotation.x=.24*s.tuck-.029*Math.sin(t*1.05);tailGeo.rotation.y=.070*Math.sin(t*.64);
 }
 return {root,focus,pose};
}

// 每根刺都从弧形背皮长出，浅色环与棕色刺尖会随身体一起起伏。
function spineCoat(trunk){
 const positions=[],colors=[],indices=[],base=V(),axis=V(),across=V(),along=V(),point=V();
 const palette=['#6d5040','#c8ab83','#ead4ab','#71503d'].map(c=>new T.Color(c));
 for(let row=0;row<17;row++){
  const lat=-1.24+row*.141,ringSize=Math.max(7,Math.round(21*Math.cos(lat)));
  for(let i=0;i<ringSize;i++){
   const angle=-1.80+3.60*(i+.28*(row%2))/(ringSize-.55),c=Math.cos(lat);
   const dx=Math.sin(angle)*c,dy=Math.cos(angle)*c,dz=Math.sin(lat);
   base.set(.221*dx,.194+.177*dy,-.085+.317*dz);
   axis.set(.68*dx,.70*dy+.15,.63*dz-.64).normalize();
   across.set(0,0,1).cross(axis).normalize();along.crossVectors(axis,across);
   const first=positions.length/3,length=.071+.018*Math.cos(i*4.1+row*1.55);
   for(const [j,[t,r]] of [[0,.018],[.57,.014],[.80,.010],[1,.001]].entries()){
    for(let k=0;k<4;k++){
     const a=k*Math.PI/2+.36*row;
     point.copy(base).addScaledVector(axis,length*t).addScaledVector(across,r*Math.cos(a)).addScaledVector(along,r*Math.sin(a));
     positions.push(point.x,point.y,point.z);const color=palette[j];colors.push(color.r,color.g,color.b);
     if(j<3){const v=first+j*4+k,next=first+j*4+(k+1)%4;indices.push(v,next,v+4,next,next+4,v+4);}
    }
   }
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 return mesh(T,trunk,'层层交错的背刺',geo,pelt);
}
function hedgehogModel(parent){
 const root=group(T,parent,'欧洲刺猬'),trunk=group(T,root,'低矮的拱背');
 oval(trunk,'背刺下的栗色绒毛',darkFur,0,.194,-.085,.222,.178,.322);
 spineCoat(trunk);
 const head=group(T,trunk,'贴地探闻的尖脸',[0,.176,.165]);
 profile(head,'由脸颊渐细到鼻尖',[[-.095,.01,.135,.124],[-.03,.017,.155,.128],[.055,.005,.139,.116],
  [.133,-.003,.105,.083],[.198,-.020,.072,.060],[.260,-.026,.030,.032]],
  coat('#ab8b71','#d3b18b','#ead7b5',(x,y,z,a)=>.68*band(.12,.88,-Math.cos(a))));
 const snout=oval(head,'湿亮的小鼻尖',nose,0,-.022,.263,.037,.031,.028);
 for(const side of [-1,1]){
  oval(head,'短圆绒耳',darkFur,side*.113,.106,-.006,.047,.050,.028);
  oval(head,'耳窝',pink,side*.120,.109,.012,.029,.032,.014);
  oval(head,'黑亮的小眼睛',ink,side*.117,.047,.099,.023,.023,.021);
  oval(head,'眼光',gloss,side*.131,.055,.111,.006,.006,.005);
 }
 const legs=[];
 for(const side of [-1,1])for(const z of [-.245,.116]){
  const leg=group(T,trunk,'腹下的小短腿',[side*.133,.120,z]);
  oval(leg,'覆着绒毛的小腿',darkFur,0,-.042,0,.034,.061,.034);
  oval(leg,'踩着落叶的小脚',darkFur,0,-.099,.016,.033,.019,.050);legs.push(leg);
 }
 const focus=marker(head,'鼻梁上的点按中心',0,.04,.161);
 return {root,focus,pose(s,t){
  root.visible=s.visible;root.position.set(Math.sin(hedgehogDoor.yaw)*s.dist,0,Math.cos(hedgehogDoor.yaw)*s.dist);
  root.rotation.y=hedgehogDoor.yaw+Math.PI*s.turn;
  const walk=['out','home','hide','home-turn'].includes(s.action)?1:0;
  trunk.position.y=.006*walk*Math.abs(Math.sin(s.feet))+.003*(1-walk)*Math.sin(t*1.2);
  head.rotation.x=s.bite*(.45+.025*Math.sin(t*8))-(s.action==='peek'?.12:0);
  head.rotation.y=(s.action==='peek'?.25:.24*s.bite)*Math.sin(t*2.2);
  snout.position.y=-.022+.006*Math.sin(t*12);
  legs.forEach((leg,i)=>{leg.rotation.x=.45*walk*Math.sin(s.feet+(i===0||i===3?0:Math.PI));});
 }};
}

function grassPatch(root,x,z,size,seed){
 const patch=group(T,root,'捧起的嫩草',[x,0,z]),base=group(T,patch,'逐渐啃短的草尖');
 const verts=[],cols=[],tri=[],a=new T.Color('#5d824a'),b=new T.Color('#b8ce72'),shade=new T.Color();
 for(let i=0;i<46;i++){
  const direction=i*2.399+seed,scatter=.32*Math.sqrt(i/46),reach=.08+.18*((i*23)%37)/37;
  const dx=Math.cos(direction),dz=Math.sin(direction),height=.23+.23*((i*13)%29)/29;
  const bx=scatter*dx,bz=scatter*dz,index=verts.length/3;
  for(let s=0;s<4;s++){
   const t=s/3,w=.038*(1-t)+.001,cx=bx+reach*t*t*dx,cz=bz+reach*t*t*dz;
   const y=height*t*(1-.19*t);verts.push(cx-w*dz,y,cz+w*dx,cx+w*dz,y,cz-w*dx);
   shade.copy(a).lerp(b,.16+t*.63+.11*Math.cos(i));for(let k=0;k<2;k++)cols.push(shade.r,shade.g,shade.b);
   if(s<3){const n=index+s*2;tri.push(n,n+2,n+1,n+1,n+2,n+3);}
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.setIndex(tri);geo.computeVertexNormals();
 const leaf=clay(T,'#ffffff',.93,true);leaf.side=T.DoubleSide;mesh(T,base,'有浅色嫩尖的草叶',geo,leaf);
 patch.scale.setScalar(size);return {patch,base,focus:marker(base,'草尖',0,.25,0)};
}
function burrow(parent){
 const root=group(T,parent,'树根下的土洞',[hedgehogDoor.x,0,hedgehogDoor.z]),mound=group(T,root,'拱形洞口');
 mound.rotation.y=hedgehogDoor.yaw;
 const verts=[],indices=[],col=[],tint=new T.Color(),warm=new T.Color('#b9a27b'),dirt=new T.Color('#8e795b');
 const rings=[[-1.54,.22,.24],[-1.31,.63,.64],[-.86,.79,.81],[-.43,.77,.79],[-.11,.73,.72],[.035,.62,.69],[.046,.45,.64],[-.15,.46,.63],[-1.16,.47,.65]];
 const slices=29;
 for(const [r,[z,w,h]] of rings.entries())for(let j=0;j<=slices;j++){
  const u=j*Math.PI/slices,px=w*Math.cos(u),py=h*Math.sin(u);
  const irregular=r<6?.041*Math.sin(3*u+1.4*r)*Math.sin(u):0;
  verts.push(px+irregular,-.019+py+irregular,z+.035*Math.cos(3*u));
  const light=r>=6?.13:.49+.19*Math.cos(4*u+r*.43);
  tint.copy(dirt).lerp(warm,light).multiplyScalar(r>=6?.52:1);col.push(tint.r,tint.g,tint.b);
  if(r<rings.length-1&&j<slices){const off=r*(slices+1)+j;indices.push(off,off+slices+1,off+1,off+1,off+slices+1,off+slices+2);}
 }
 const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(verts,3));geom.setAttribute('color',new T.Float32BufferAttribute(col,3));geom.setIndex(indices);geom.computeVertexNormals();
 const mat=clay(T,'#ffffff',.96,true);mat.side=T.DoubleSide;mesh(T,mound,'厚实的拱顶和洞壁',geom,mat);
 oval(mound,'洞穴深处',black,0,.19,-1.16,.46,.51,.09);
 const floor=mesh(T,mound,'洞内的背光泥面',new T.PlaneGeometry(.92,1.21),shade,[0,.009,-.54]);
 floor.rotation.x=-Math.PI/2;
 // 开口保留在树根一侧，外面散土、草皮盖住规整的几何轮廓。
 const loam=clay(T,'#a29065'),turf=clay(T,'#92a16b');
 for(const [x,y,z,w,h,d] of [[-.50,.11,-.45,.32,.22,.54],[.54,.12,-.51,.26,.24,.59],
  [-.37,.48,-.66,.38,.22,.54],[.17,.69,-.59,.32,.10,.43],[-.56,.35,-.76,.20,.19,.46]]){
  oval(mound,'长着苔草的起伏表土',y>.34?turf:loam,x,y,z,w,h,d);
 }
 grassPatch(mound,-.25,-.66,.56,5).patch.position.y=.70;
 grassPatch(mound,.23,-.78,.35,8).patch.position.y=.74;
 const pebbles=[[-.46,.02,.099,.13],[.54,.025,-.09,.17],[-.65,.006,-.49,.095],[.38,.008,.17,.065]];
 for(const [i,[x,y,z,s]] of pebbles.entries())oval(mound,'洞边散土',i%2?soil:shade,x,y,z,s,s*.42,s*.64);
 grassPatch(mound,-.54,-.42,.49,2);grassPatch(mound,.58,-.31,.46,8);
 return {root,mound,focus:marker(mound,'洞口睡觉的位置',-.03,.23,.047)};
}

export function makeGumGround(root){
 const adult=wallabyModel(root),den=burrow(root),hedgehog=hedgehogModel(den.root);
 const tuft=grassPatch(root,grazingTuft.x,grazingTuft.z,1,4);
 const path=group(T,den.root,'洞口外的林地');path.rotation.y=hedgehogDoor.yaw;
 const litter=group(T,path,'洞外的落叶和小甲虫',[0,.015,1.72]);
 const russet=clay(T,'#a96e43'),ochre=clay(T,'#ce9c53'),shell=clay(T,'#62503c',.51);
 for(const [x,z,angle] of [[-.17,.04,.84],[.14,.12,1.94],[.08,.16,.30]]){
  const leaf=oval(litter,'卷起的小落叶',x<0?russet:ochre,x,.012,z,.056,.012,.107);leaf.rotation.y=angle;
 }
 const beetle=group(T,litter,'落叶边的金龟子');
 oval(beetle,'甲虫的翅鞘',shell,0,.028,0,.037,.029,.063);
 oval(beetle,'小甲虫的脑袋',ink,0,.025,-.052,.026,.020,.023);
 return {hints:{wallaby:adult.root,'hedgehog-den':den.mound,hedgehog:hedgehog.root,'wallaby-grass':tuft.patch},
  points:{wallaby:adult.focus,'hedgehog-den':den.focus,hedgehog:hedgehog.focus,'wallaby-grass':tuft.focus},
  tick(s){
   adult.pose(s.wallaby,s.time);hedgehog.pose(s.hedgehog,s.time);
   tuft.base.scale.y=s.grass.height;tuft.base.rotation.z=.13*s.grass.bend+.032*Math.sin(s.time*2.3);
   beetle.visible=!s.hedgehog.preyHidden;
   beetle.position.x=.018*Math.sin(s.time*2);
  }};
}
