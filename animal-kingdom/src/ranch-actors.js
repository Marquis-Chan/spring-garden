import * as T from 'three';
import {blink,clay,closedShape,eye,group,mesh,paintSphere,tube} from './savanna-actors.js';
import {makeCorgi} from './orchard-actors.js';

const ball=new T.SphereGeometry(1,20,16),small=new T.SphereGeometry(1,14,10);
const ink=clay(T,'#39332f'),horn=clay(T,'#68584c'),glint=clay(T,'#fff4d6'),iris=clay(T,'#875c3e');
const velvet=clay(T,'#ffffff',.87,true),cream=clay(T,'#f1e3c9'),chestnut=clay(T,'#76584b');
const rose=clay(T,'#c9917d'),nose=clay(T,'#d6a293'),straw=clay(T,'#dca461'),combRed=clay(T,'#b94d3e');
const auburn=clay(T,'#a66443'),gold=clay(T,'#e8bd68'),forest=clay(T,'#34665b');
const up=new T.Vector3(0,1,0);
const obj=(g,n,p)=>group(T,g,n,p);
const oval=(g,n,mat,p,s,geo=ball)=>mesh(T,g,n,geo,mat,p,s);
const smooth=T.MathUtils.smoothstep;

function softEye(parent,side,pos,size){
 const g=obj(parent,'眼部',pos);g.scale.setScalar(size);
 return eye(T,g,'眼睛',small,[0,0,0],side*1.10,iris,ink,glint);
}

function smoothBody(rows,paint){
 // 通过肩、腰、髋截面形成一整张带花纹的皮，侧面轮廓和斑纹同时变形。
 const radii=new T.CatmullRomCurve3(rows.map(r=>new T.Vector3(r[1],r[2],r[3])),false,'catmullrom',.42);
 const rings=Array.from({length:(rows.length-1)*7+1},(_,i)=>{
  const t=i/((rows.length-1)*7),j=Math.min(rows.length-2,Math.floor(i/7)),u=i/7-j;
  const r=radii.getPoint(t);return [T.MathUtils.lerp(rows[j][0],rows[j+1][0],u),r.x,r.y,r.z];
 });
 return closedShape(T,rings,72,paint);
}

function cowCoat(index){
 const milk=new T.Color('#f5e9d1'),dark=new T.Color(index?'#4e423c':'#393c3a'),color=new T.Color();
 const patches=index?[[.6,-.12,.41,.26],[-.64,-.55,.38,.29],[2.58,.19,.61,.31],
  [-1.48,.15,.64,.26],[-2.48,-.27,.43,.29],[1.42,-.43,.86,.24]]:
  [[.38,-.42,.69,.33],[-.89,.22,.77,.28],[1.48,.13,.83,.25],
   [-2.03,-.51,.68,.36],[2.55,-.21,.49,.27],[2.92,.35,.63,.25]];
 return (x,y,z,a)=>{
  let edge=8;
  for(const [angle,depth,wide,long] of patches){
   const da=Math.atan2(Math.sin(a-angle),Math.cos(a-angle));
   edge=Math.min(edge,(da/wide)**2+((z-depth)/long)**2);
  }
  edge+=.20*Math.sin(a*9+z*14)+.08*Math.cos(z*28-a*5);
  return color.copy(milk).lerp(dark,1-smooth(edge,.85,1.07));
 };
}

const cowRows=[[-.70,.01,.065,.11],[-.61,.025,.268,.272],[-.46,.039,.336,.316],
 [-.24,.014,.345,.33],[.01,-.008,.358,.349],[.23,.018,.345,.359],
 [.38,.06,.307,.334],[.51,.075,.225,.264],[.60,.075,.115,.162],[.65,.09,.045,.077]];
const cowBodies=[0,1].map(i=>smoothBody(cowRows,cowCoat(i)));

function fleece(){
 const white=new T.Color('#eee1c5'),warm=new T.Color('#cfbf9f'),mix=new T.Color();
 const geo=new T.SphereGeometry(1,72,48),p=geo.attributes.position,colors=[];
 const dimples=Array.from({length:131},(_,i)=>{
  const y=1-2*(i+.5)/131,r=Math.sqrt(1-y*y),angle=i*2.39996323;
  return [Math.cos(angle)*r,y,Math.sin(angle)*r];
 });
 // 用许多连在同一表面的浅卷形成羊毛的阴影，不往身体上粘一层小圆球。
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let best=-1;
  for(const [dx,dy,dz] of dimples)best=Math.max(best,x*dx+y*dy+z*dz);
  const curl=smooth(best,.98,.999),lift=.986+.072*curl;
  p.setXYZ(i,lift*x,lift*y,lift*z);
  mix.copy(warm).lerp(white,.54+.4*curl+.05*y);colors.push(mix.r,mix.g,mix.b);
 }
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}
const wool=fleece();

function jointSegment(root,name,mat,rx,rz){
 const part=oval(root,name,mat,[0,0,0],[rx,1,rz]),axis=new T.Vector3();
 return (a,b)=>{
  axis.subVectors(b,a);const length=axis.length();part.position.copy(a).lerp(b,.5);
  part.scale.y=length*.52+.018;part.quaternion.setFromUnitVectors(up,axis.divideScalar(Math.max(.0001,length)));
 };
}
function splitHoof(g,w,h,d){
 for(const half of [-1,1]){
  const toe=oval(g,'分开的蹄瓣',horn,[half*w*.37,h*.004,.009],[w*.61,h,d],small);
  toe.rotation.y=half*.065;
 }
}

function furryLimb(root,front,size,mat){
 const rows=16,sides=14,positions=new T.Float32BufferAttribute(new Float32Array(rows*sides*3),3);
 positions.setUsage(T.DynamicDrawUsage);
 const faces=[],circle=[],profiles=[];
 for(let j=0;j<sides;j++)circle.push([Math.cos(j*2*Math.PI/sides),Math.sin(j*2*Math.PI/sides)]);
 for(let i=0;i<rows;i++){
  const t=i/(rows-1),bulge=Math.exp(-((t-.18)**2)/.032),joint=Math.exp(-((t-.52)**2)/.005);
  profiles.push([(1-t)*.028+.034+bulge*(front?.027:.055)+.013*joint,
   (1-t)*.047+.039+bulge*(front?.027:.067)+.012*joint]);
  if(i<rows-1)for(let j=0;j<sides;j++){
   const a=i*sides+j,b=i*sides+(j+1)%sides;
   faces.push(a,b,a+sides,b,b+sides,a+sides);
  }
 }
 const geom=new T.BufferGeometry();geom.setAttribute('position',positions);geom.setIndex(faces);
 const limb=mesh(T,root,front?'连贯的前腿':'由后臀渐细的后腿',geom,mat);limb.frustumCulled=false;
 const control=new T.Vector3(),center=new T.Vector3(),tangent=new T.Vector3(),cross=new T.Vector3(),forward=new T.Vector3(),point=new T.Vector3();
 // 从肩到蹄用同一条中心线蒙皮，膝与小腿之间没有球缝。
 return (hip,joint,ankle)=>{
  control.copy(joint).multiplyScalar(2).addScaledVector(hip,-.5).addScaledVector(ankle,-.5);
  for(let i=0;i<rows;i++){
   const t=i/(rows-1),u=1-t;
   center.copy(hip).multiplyScalar(u*u).addScaledVector(control,2*t*u).addScaledVector(ankle,t*t);
   tangent.copy(hip).multiplyScalar(-u).addScaledVector(control,u-t).addScaledVector(ankle,t).normalize();
   cross.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();forward.crossVectors(tangent,cross);
   for(let j=0;j<sides;j++){
    point.copy(center).addScaledVector(cross,size*profiles[i][0]*circle[j][0])
     .addScaledVector(forward,size*profiles[i][1]*circle[j][1]);
    positions.setXYZ(i*sides+j,point.x,point.y,point.z);
   }
  }
  positions.needsUpdate=true;geom.computeVertexNormals();
 };
}
function cattleLimb(root,side,front,lamb,coat){
 const size=lamb?.64:1;
 const bend=furryLimb(root,front,size,coat);
 const hoof=obj(root,'接地的蹄',[0,0,0]);splitHoof(hoof,.065*size,.045*size,.087*size);
 const hip=new T.Vector3(),joint=new T.Vector3(),ankle=new T.Vector3();
 return (bodyY,gait,stride,sleep,tuck)=>{
  const phase=stride+((side>0)===front?0:Math.PI),lift=Math.max(0,Math.sin(phase))*gait;
  const x=side*(front?.217:.231)*size,baseZ=(front?.33:-.44)*size;
  hip.set(x,bodyY-.095*size,baseZ);
  ankle.set(x+side*.078*size*sleep,(.044+.13*lift+.13*tuck)*size,
   baseZ+size*(.16*Math.cos(phase)*gait+(front?-.19:.14)*(sleep+tuck)));
  // 胸腹卧下时膝与蹄沿地面折起，保持脚底高于地表。
  joint.lerpVectors(hip,ankle,.5);
  joint.z+=(front?1:-1)*size*(.035+.24*sleep+.13*tuck+.045*lift);
  joint.x+=side*.032*size*sleep;bend(hip,joint,ankle);hoof.position.copy(ankle);
 };
}

function grazer(kind,index){
 const lamb=kind==='lamb',root=obj(null,lamb?'绵羊羔':'荷斯坦奶牛'),body=obj(root,'肩背');
 const skin=lamb?(index?chestnut:cream):cream;
 if(lamb)oval(body,'一整身卷毛',velvet,[0,.008,-.038],[.223,.239,.364],wool);
 else mesh(T,body,'黑白花背和宽胸',cowBodies[index%2],velvet);
 const shoulder=obj(body,'低头的颈根',lamb?[0,.052,.21]:[0,.099,.40]);
 const neck=oval(shoulder,'连接头胸的颈部',lamb?velvet:cream,
  lamb?[0,.09,.10]:[0,.12,.225],lamb?[.122,.15,.19]:[.183,.207,.330],lamb?wool:ball);
 neck.rotation.x=-.29;
 const head=obj(shoulder,'随颈转动的头',lamb?[0,.154,.195]:[0,.195,.472]);
 const white=new T.Color(lamb?(index?'#816651':'#e3cdb0'):'#f5e9d3'),brown=new T.Color(index?'#4f433c':'#373a37'),mix=new T.Color();
 const face=lamb?ball:paintSphere(T,(x,y,z)=>{
  const mask=smooth((index?-1:1)*x+.3*y+.17*Math.sin(z*6+y*3),.18,.32);
  return mix.copy(white).lerp(brown,mask);
 },48,32);
 const skull=oval(head,'额头和脸颊',lamb?skin:velvet,[0,0,0],
  lamb?[.143,.145,.158]:[.202,.193,.205],face);skull.rotation.x=.12;
 if(lamb)oval(head,'前额的卷毛',velvet,[0,.106,-.008],[.129,.078,.136],wool);
 const bridge=oval(head,'连到鼻端的脸骨',skin,lamb?[0,-.031,.10]:[0,-.081,.167],
  lamb?[.105,.111,.14]:[.146,.157,.205]);bridge.rotation.x=.27;
 const snout=oval(head,'鼻镜',lamb?horn:nose,lamb?[0,-.070,.215]:[0,-.149,.323],
  lamb?[.066,.040,.048]:[.155,.089,.095]);
 const jaw=obj(head,'下颌',lamb?[0,-.092,.13]:[0,-.172,.160]);
 oval(jaw,'会咀嚼的下唇',skin,lamb?[0,-.007,.047]:[0,-.034,.114],
  lamb?[.071,.032,.061]:[.122,.049,.101]);
 const mouth=obj(head,'牧草触点',lamb?[0,-.10,.235]:[0,-.21,.360]);
 const eyes=[],ears=[];const earMat=lamb?skin:ink;
 for(const s of [-1,1]){
  const ear=obj(head,'耳根',lamb?[s*.114,.067,-.035]:[s*.148,.104,-.047]);
  oval(ear,'耳廓',earMat,lamb?[s*.078,-.016,0]:[s*.102,0,0],
   lamb?[.108,.046,.056]:[.14,.070,.068]);
  oval(ear,'耳心',rose,lamb?[s*.084,-.011,.037]:[s*.119,.004,.046],
   lamb?[.072,.030,.025]:[.093,.043,.024],small);ears.push({ear,s});
  eyes.push(softEye(head,s,lamb?[s*.118,.032,.093]:[s*.161,.034,.127],lamb?.41:.64));
  if(!lamb&&index===0){
   const hornShape=closedShape(T,[[0,0,.039,.043],[.025,.019,.036,.041,s*.014],
    [.040,.049,.027,.030,s*.029],[.047,.082,.015,.020,s*.037],[.043,.103,.004,.006,s*.035]],16);
   mesh(T,head,'向外弯的短角',hornShape,cream,[s*.118,.138,-.034]);
  }
  if(!lamb)oval(snout,'椭圆鼻孔',chestnut,[s*.51,.23,.79],[.18,.22,.11],small);
 }
 const tail=obj(body,'尾根',lamb?[0,.05,-.365]:[0,.218,-.61]);
 if(lamb)oval(tail,'短绒尾',velvet,[0,-.044,-.013],[.067,.103,.061],wool);
 else{
  tube(T,tail,'垂下的尾绳',[[0,0,0],[.025,-.16,-.083],[.047,-.42,-.092],[.036,-.57,-.083]],.026,cream);
  oval(tail,'蓬松的尾扫',ink,[.035,-.584,-.088],[.058,.134,.055]);
  oval(body,'乳房',rose,[0,-.202,-.31],[.188,.177,.208]);
 }
 const limbs=[];
 for(const s of [-1,1])for(const front of [false,true])limbs.push(cattleLimb(root,s,front,lamb,skin));
 function pose({time=0,bite=0,gait=0,stride=0,sleep=0,hop=0,look=0,call=0,display=0}={}){
  const rest=smooth(sleep,0,1),active=1-rest,eat=smooth(bite,0,1)*active,step=gait*active;
  const phase=time+index*.91,tuck=Math.min(1,Math.max(0,hop)*3)*active;
  const base=lamb?.448:.814,lower=lamb?.177:.418;
  body.position.y=base-lower*rest+Math.abs(Math.sin(stride))*step*.019+.003*Math.sin(phase*1.7);
  body.rotation.x=eat*.095+step*.016*Math.cos(stride*2);
  shoulder.rotation.order='YXZ';shoulder.rotation.set(eat*(lamb?1.31:1.23)+rest*.29-call*.16,.29*look+.26*rest,0);
  head.rotation.x=-eat*(lamb?.47:.52)+call*-.13+.024*Math.sin(phase*1.5)*active;
  for(const shut of eyes)shut(blink(phase,5.2),sleep);
  for(const {s,ear} of ears){
   ear.rotation.z=s*((lamb?-.19:-.07)-.18*rest+.35*display+.035*Math.sin(phase*1.7+s)*active);
   ear.rotation.y=-s*(.11+.23*look);
  }
  jaw.rotation.x=.28*call+.11*eat*(.6+.4*Math.sin(time*11));jaw.position.x=.015*eat*Math.sin(time*8.8);
  tail.rotation.x=-.08*display+.73*rest;tail.rotation.z=(.11+.26*display)*Math.sin(phase*2.4)*active;
  for(const limb of limbs)limb(body.position.y,step,stride,rest,tuck);
 }
 pose();return {root,pose,focus:head,body,muzzle:mouth};
}

// 长尾羽从羽根拱起并下垂，白昼摆尾时整片羽轴和羽片共用一个转轴。
function sickleFeather(length,height,side,tint){
 const vertices=[],colors=[],faces=[],light=new T.Color(tint),dark=new T.Color('#24483e'),shade=new T.Color();
 for(let i=0;i<=24;i++){
  const t=i/24,width=.052*Math.sin(Math.PI*t)**.74+.002,x=side*.12*t*t;
  const y=height*Math.sin(t*Math.PI*.91)+.05*t,z=-length*t;
  for(const k of [-1,0,1]){
   vertices.push(x+width*k,y+(k===0?.016:0),z+width*k*.14);
   shade.copy(dark).lerp(light,(k===0?.77:.48)+.20*t);colors.push(shade.r,shade.g,shade.b);
  }
  if(i<24){const j=i*3;faces.push(j,j+3,j+1,j+1,j+3,j+4,j+1,j+4,j+2,j+2,j+4,j+5);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(faces);g.computeVertexNormals();return g;
}
const tailMat=clay(T,'#ffffff',.69,true);tailMat.side=T.DoubleSide;
function comb(parent,size){
 const rows=[[-.104,0,.009,.011],[-.088,.03,.018,.036],[-.072,.056,.020,.065],
  [-.052,.023,.024,.032],[-.036,.070,.024,.079],[-.014,.028,.027,.039],
  [.006,.061,.024,.071],[.027,.023,.021,.035],[.046,.043,.020,.051],[.072,.018,.018,.034],[.086,0,.007,.011]];
 mesh(T,parent,'红色锯齿鸡冠',closedShape(T,rows,16),combRed,[0,.087,-.001],[size,size,size]);
}
function chicken(kind,index){
 const young=kind==='chick',male=kind==='rooster',root=obj(null,young?'绒黄鸡仔':male?'铜颈公鸡':'暖褐母鸡');
 const frame=obj(root,'鸡的骨架'),body=obj(frame,'有龙骨的胸腹');
 // 鸡仔的头大而圆，胸腹、跗部与喙按幼龄比例单独塑形。
 const size=young?.545+.022*(index%3):male?1.12:.92;frame.scale.setScalar(size);
 const warm=new T.Color(young?['#e9bb62','#ebc779','#d9b06f'][index%3]:male?'#ac6339':'#b77b4d');
 const belly=new T.Color(young?'#f7df98':male?'#33483f':'#dcad78'),back=new T.Color(young?'#dbad5a':male?'#8c4834':'#916444');
 const tone=new T.Color();
 const feathers=paintSphere(T,(x,y,z)=>{
  const under=1-smooth(y+.24*z,-.5,.24);
  const dark=smooth(y,.03,.93)*(.33+.14*Math.cos(18*z+Math.sin(x*8)));
  return tone.copy(warm).lerp(belly,under*.84).lerp(back,dark);
 },28,22);
 const torso=oval(body,'圆胸和背羽',velvet,[0,0,-.043],
  young?[.183,.176,.198]:[.193,.199,.282],feathers);torso.rotation.x=-.13;
 const neck=obj(body,'低头啄食的颈根',[0,.056,young?.076:.127]);
 const hackle=oval(neck,'层叠颈羽',young?gold:male?straw:auburn,[0,young?.064:.115,.026],
  young?[.108,.11,.116]:[.122,.197,.129]);hackle.rotation.x=.17;
 const head=obj(neck,'朝前的鸡头',[0,young?.179:male?.299:.247,.067]);
 oval(head,'带绒的脸',young?gold:male?auburn:straw,[0,0,0],
  young?[.144,.138,.138]:[.111,.113,.117]);
 if(!young)comb(head,male?1:.53);
 const eyes=[];
 const beakRows=[[-.018,-.002,.045,.037],[.015,.003,.048,.035],[.051,.003,.037,.023],[.094,-.004,.018,.016],[.117,-.014,.002,.004]];
 const beakRoot=obj(head,'喙根',[0,young?-.029:-.010,young?.104:.089]);
 const beakScale=young?.73:1;
 beakRoot.scale.setScalar(beakScale);
 mesh(T,beakRoot,'尖而短的上喙',closedShape(T,beakRows,16),straw);
 const jaw=obj(beakRoot,'下喙',[0,-.022,.006]);
 mesh(T,jaw,'下喙边缘',closedShape(T,[[-.016,.003,.038,.019],[.028,0,.038,.015],[.070,-.003,.021,.013],[.096,.005,.002,.003]],16),straw);
 const tip=obj(beakRoot,'谷粒触点',[0,-.014,.118]);
 for(const s of [-1,1]){
  eyes.push(softEye(head,s,young?[s*.118,.028,.069]:[s*.086,.030,.069],young?.36:.28));
  if(!young)oval(beakRoot,'下垂的肉髯',combRed,[s*.020,-.069,.001],
   male?[.033,.062,.028]:[.025,.030,.023],small);
 }
 const wings=[];
 for(const s of [-1,1]){
  const wing=obj(body,'翼肩',[s*(young?.128:.138),.070,-.015]);wings.push({s,wing});
  const base=oval(wing,'覆羽连在翼肩上',young?cream:male?auburn:straw,[s*.032,-.051,-.050],
   young?[.045,.077,.109]:[.059,.117,.180]);base.rotation.x=-.25;
  if(!young)for(let j=0;j<4;j++){
   const f=oval(wing,'折叠的飞羽',male?(j%2?forest:chestnut):auburn,
    [s*(.040+j*.007),-.089+j*.020,-.097-j*.013],[.022,.038,.125-j*.007],small);f.rotation.x=-.31+j*.052;
  }
 }
 const tail=obj(body,'尾羽根',[0,.091,young?-.176:-.239]);
 if(male){
  for(let i=-3;i<=3;i++){
   const spread=Math.abs(i)/3;
   const quill=mesh(T,tail,'金属绿镰状尾羽',sickleFeather(.447-.176*spread,.338-.136*spread,Math.sign(i),i%2?'#417763':'#37666a'),tailMat);
   quill.rotation.y=i*.14;quill.rotation.x=.08+.07*spread;
  }
 }else{
  for(let i=-1;i<=1;i++){
   const len=young?.066:.137,plume=oval(tail,'上翘的短尾羽',young?gold:auburn,[i*.031,.046,-.042],
    [.039,young?.027:.046,len]);plume.rotation.set(.69,i*.22,0);
  }
 }
 const feet=[];
 for(const s of [-1,1]){
  const thigh=jointSegment(frame,'腿上的绒羽',young?gold:auburn,.046,.054);
  const shank=jointSegment(frame,'纤细的跗部',straw,.018,.019);
  const foot=obj(frame,'抓地的趾爪');
  for(const j of [-1,0,1]){
   tube(T,foot,'向前分开的脚趾',[[0,.009,0],[j*.026,.001,.044],[j*.052,-.002,.095-Math.abs(j)*.014]],.008,straw,4);
  }
  tube(T,foot,'向后的第一趾',[[0,.009,0],[0,.005,-.026],[-s*.014,-.002,-.051]],.007,straw,4);
  feet.push({s,thigh,shank,foot});
 }
 const hip=new T.Vector3(),heel=new T.Vector3();
 function pose({time=0,gait=0,stride=0,bite=0,display=0,look=0,call=0,sleep=0}={}){
  const rest=smooth(sleep,0,1),awake=1-rest,feed=awake*smooth(bite,0,1),show=display*awake*(1-feed);
  const walking=gait*awake,phase=time+index*.36,bob=Math.abs(Math.sin(stride))*.018*walking;
  const height=young?.233:.311;
  body.position.set(0,height+(young?-.056:-.094)*rest+.028*show+bob,0);
  body.rotation.x=feed*.39-show*.14+walking*.032*Math.cos(stride);
  neck.rotation.order='YXZ';neck.rotation.set((young?1.15:male?1.29:1.32)*feed-.25*show+rest*.24,look*.55+rest*1.13,-rest*.17);
  head.rotation.x=-.65*feed+.034*Math.sin(phase*4)*awake-.23*call;
  jaw.rotation.x=.67*call+.19*feed;tail.rotation.x=.11*show+.07*Math.sin(phase*2)*awake;
  for(const shut of eyes)shut(blink(phase,4.2),sleep);
  for(const {s,wing} of wings){
   wing.rotation.set(.12*rest-.10*show,s*.19*show,s*(.15*rest+show*(.59+.22*Math.sin(time*10))));
  }
  for(const {s,thigh,shank,foot} of feet){
   const beat=stride+(s<0?Math.PI:0),push=walking*Math.cos(beat),lift=walking*Math.max(0,Math.sin(beat));
   hip.set(s*.085,body.position.y-.062,-.006);heel.set(s*.089,young?.084:.109,-.038+push*.039);
   heel.y-=rest*.046+feed*.026;
   foot.position.set(s*.092,.014+lift*.069,.001+push*.105);
   thigh(hip,heel);shank(heel,foot.position);
  }
 }
 pose();return {root,pose,focus:head,body,muzzle:tip};
}

export function makeRanchActor(kind,index=0){
 if(kind==='cow'||kind==='lamb')return grazer(kind,index);
 if(kind==='hen'||kind==='rooster'||kind==='chick')return chicken(kind,index);
 if(kind==='dog'){
  const model=makeCorgi(T);model.root.name='巡守牧场的柯基';
  const head=model.root.getObjectByName('Dog head'),tail=model.root.getObjectByName('Dog tail');
  return {root:model.root,focus:head,body:model.root.getObjectByName('Dog body'),pose(state={}){
   const attention=Math.min(1,Math.max(0,(state.attention??9)/1.15));
   const watch=Math.sin(Math.PI*attention);
   model.pose({...state,bark:state.call,sniff:(state.bite??0)*(1-watch)});
   head.rotation.y-=.53*watch*Math.sin(state.yaw??0);
   head.rotation.z+=.18*watch;
   tail.rotation.y+=.27*watch*Math.sin((state.time??0)*12);
  }};
 }
 throw Error('未知牧场动物 '+kind);
}
