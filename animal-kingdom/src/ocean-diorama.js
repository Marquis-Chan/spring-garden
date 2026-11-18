import * as T from 'three';
import {humpback,linedSeahorse} from './ocean-sculpt.js';
import {oceanPoints,oceanStarLedge,kelpBlade} from './ocean-state.js';

const pigment=(color,roughness=.54)=>new T.MeshStandardMaterial({color,roughness});
const sphere=new T.SphereGeometry(1,24,16);
const ink=pigment('#152b3c'),shine=pigment('#ecf3e8'),sand=pigment('#d8c69b',.88);
const seashell=pigment('#e7aa98'),shore=pigment('#a39d84',.90);
const seaweed=['#346d63','#68a078','#89a277'].map(color=>pigment(color,.83));
const coral=['#ce8a94','#ca7964','#e6b790','#b595c5'].map(c=>pigment(c,.79));
const V=(x,y,z)=>new T.Vector3(x,y,z);
function item(root,geometry,material,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){
 const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);
 m.receiveShadow=true;return m;
}
function oval(root,material,x,y,z,sx,sy,sz){return item(root,sphere,material,x,y,z,sx,sy,sz);}
function group(root,x=0,y=0,z=0){const g=new T.Group();root.add(g);g.position.set(x,y,z);return g;}
function tube(root,mat,points,r,segments=18){
 const path=new T.CatmullRomCurve3(points.map(p=>V(...p)));
 return item(root,new T.TubeGeometry(path,segments,r,9,false),mat);
}

// 顺着头尾分段成形，腹色沿身侧过渡。
function body(root,profile,back,bottom,bands=false){
 const positions=[],colors=[],indices=[],width=36,A=new T.Color(back),B=new T.Color(bottom),paint=new T.Color();
 if(bands){
  const rings=[];
  for(let i=0;i<profile.length-1;i++){
   const a=profile[i],b=profile[i+1],count=Math.ceil((b[0]-a[0])/.018);
   for(let j=0;j<count;j++)rings.push(a.map((p,k)=>T.MathUtils.lerp(p,b[k],j/count)));
  }
  profile=[...rings,profile.at(-1)];
 }
 for(const [j,[x,y,h,d]] of profile.entries())for(let i=0;i<=width;i++){
  const angle=i/width*Math.PI*2,cy=Math.cos(angle);
  positions.push(x,y+h*cy,d*Math.sin(angle));
  paint.copy(B).lerp(A,T.MathUtils.smoothstep(cy,-.72,.36));
  if(bands){
   const stripe=Math.min(...[.29,-.05,-.40].map(mark=>Math.abs(x-mark+cy*.065)));
   if(stripe<.076)paint.set(stripe>.060?'#3c3831':'#fff4dc');
  }
  colors.push(paint.r,paint.g,paint.b);
  if(j<profile.length-1&&i<width){
   const a=j*(width+1)+i,b=a+width+1;
   indices.push(a,a+1,b,a+1,b+1,b);
  }
 }
 const shape=new T.BufferGeometry();
 shape.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 shape.setAttribute('color',new T.Float32BufferAttribute(colors,3));shape.setIndex(indices);shape.computeVertexNormals();
 return item(root,shape,new T.MeshStandardMaterial({vertexColors:true,roughness:.46,side:T.DoubleSide}));
}
// 纵截面始于身体内部，鳍从宽基部收向薄尖。水平鳍与直立鳍共用同一厚度轮廓。
function foil(root,material,sections,horizontal=false){
 const S=18,xyz=[],faces=[];
 const outward=(sections.at(-1)[1]>sections[0][1])===horizontal;
 for(const [i,[x,span,chord,depth,camber=0]] of sections.entries()){
  for(let j=0;j<S;j++){
   const angle=j*2*Math.PI/S,along=x+Math.cos(angle)*chord,thickness=Math.sin(angle)*depth+camber;
   xyz.push(along,horizontal?thickness:span,horizontal?span:thickness);
   if(i+1===sections.length)continue;
   const a=i*S+j,b=i*S+(j+1)%S;
   if(outward)faces.push(a,b,a+S,b,b+S,a+S);
   else faces.push(a,a+S,b,b,a+S,b+S);
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
 geometry.setIndex(faces);geometry.computeVertexNormals();
 return item(root,geometry,material);
}
function eye(root,x,y,z,scale){
 for(const side of [-1,1]){
  oval(root,ink,x,y,side*z,scale,scale,scale*.55);
  oval(root,shine,x+.013,y+.015,side*(z+scale*.52),scale*.27,scale*.27,scale*.14);
 }
}
function swimmer(root,name){
 const model=group(root),dolphin=name==='dolphin',shark=name==='shark',clown=name==='clown';
 const color=dolphin?'#87a9bd':shark?'#687e89':'#f19950';
 const edge=pigment(color),fluke=pigment(shark?'#677c8a':dolphin?'#7d9bab':'#dd7944');
 const profile=dolphin?[[-.91,-.04,.022,.031],[-.71,-.02,.07,.07],[-.38,.02,.14,.13],[0,.02,.21,.18],[.36,.03,.198,.20],
   [.60,.034,.141,.16],[.73,-.045,.065,.086],[.90,-.054,.036,.071],[1.03,-.059,.025,.047]]:
  shark?[[-1.06,.018,.025,.033],[-.79,.02,.08,.081],[-.48,.03,.145,.141],[-.07,.041,.221,.177],[.34,.025,.224,.19],
   [.62,.012,.162,.179],[.85,-.02,.095,.129],[1.03,-.036,.043,.07],[1.095,-.042,.009,.021]]:
  [[-.53,0,.046,.043],[-.41,0,.125,.072],[-.25,0,.216,.114],[0,0,.273,.136],[.20,0,.236,.137],[.36,0,.165,.114],[.48,-.018,.060,.08],[.53,-.02,.023,.031]];
 body(model,profile,color,dolphin?'#c9e3e0':shark?'#d5ded2':'#f9be65',clown);
 const tail=group(model,profile[0][0]+.028,profile[0][1],0);
 if(clown){
  body(tail,[[-.31,0,.031,.007],[-.29,0,.125,.014],[-.25,0,.181,.022],[-.20,0,.184,.024],
   [-.12,0,.14,.024],[-.045,0,.079,.028],[.051,0,.041,.033]],'#e58a40','#eea354');
 }else for(const side of [-1,1]){
  const fork=dolphin?[
   [.02,0,.086,.030],[-.038,side*.09,.128,.042],[-.098,side*.21,.136,.039],
   [-.183,side*.33,.085,.024],[-.25,side*.40,.014,.006]
  ]:[
   [.015,0,.075,.032],[-.05,side*.075,.095,.027],[-.10,side*(side>0?.24:.16),.090,.024],
   [-.188,side*(side>0?.41:.24),.057,.014],[-.256,side*(side>0?.51:.29),.005,.004]
  ];
  foil(tail,fluke,fork,dolphin);
 }
 const dorsal=foil(model,edge,clown?[
  [-.058,.127,.25,.033],[-.067,.228,.219,.027],[-.075,.283,.170,.023],
  [-.104,.317,.088,.013],[-.124,.323,.031,.005]
 ]:dolphin?[
  [-.13,.094,.235,.048],[-.132,.185,.206,.041],[-.168,.255,.148,.034],
  [-.212,.333,.089,.022],[-.269,.397,.045,.013],[-.307,.413,.005,.004]
 ]:[
  [-.155,.103,.247,.041],[-.147,.221,.204,.044],[-.17,.345,.148,.036],
  [-.199,.459,.087,.026],[-.248,.554,.039,.014],[-.273,.598,.005,.003]
 ]);
 dorsal.name='长在背脊上的背鳍';
 const flippers=[];
 for(const side of [-1,1]){
  const fin=group(model,clown?.11:.26,clown?0:-.040,side*(clown?.080:.10));
  const length=dolphin?.36:shark?.46:.15;
  const rings=clown?[[0,0,.075,.027,0],[-.014,.07,.075,.020,-.020],[-.028,.12,.056,.013,-.041],
   [-.048,.155,.021,.005,-.058]]:[[0,0,.122,.038,0],[-.010,length*.27,.126,.030,-.035],
   [-.065,length*.57,.103,.025,-.075],[-.137,length*.81,.073,.017,-.119],[-.205,length,.010,.005,-.153]];
  foil(fin,clown?pigment('#e0a054'):edge,rings.map(([x,z,c,d,y])=>[x,side*z,c,d,y]),true);
  flippers.push(fin);
 }
 eye(model,dolphin?.63:shark?.73:.36,dolphin?.045:shark?.035:.076,
  dolphin?.144:shark?.133:.112,clown?.049:.039);
 if(shark)for(const sign of [-1,1])for(let i=0;i<4;i++){
  tube(model,fluke,[[.47-i*.061,.09,sign*.181],[.435-i*.061,-.003,sign*.18],[.444-i*.061,-.073,sign*.162]],.009,8);
 }
 model.rotation.y=-.31;
 return a=>{
  model.rotation.z=.10*a.sweep+(dolphin?.19:-.092)*a.pose+(a.pitch??0)*.40;
  model.rotation.x=a.roll;
  model.rotation.y=Number.isFinite(a.heading)?a.heading-Math.PI/2+a.turn*.25:-.31+a.turn;
  tail.rotation.y=(dolphin?.07:.39)*a.sweep;
  tail.rotation.z=dolphin?.28*a.sweep:.06*a.sweep;
  flippers.forEach((fin,i)=>{fin.rotation.x=(i===0?-1:1)*(.08*Math.sin(a.phase+i*.4)+a.pose*.23);});
 };
}
function seastar(root){
 const orange=pigment('#cf7451'),light=pigment('#e59b6d'),arms=[];
 const disk=group(root);
 root.rotation.x=oceanStarLedge.pitch;
 const target=new T.Vector3(),xAxis=V(1,0,0),yAxis=V(0,1,0);
 oval(disk,orange,0,.091,0,.195,.088,.195);
 for(let i=0;i<5;i++){
  const ray=group(disk);ray.rotation.order='YXZ';ray.rotation.y=i*Math.PI*2/5;
  ray.name='海星第'+(i+1)+'臂';
  const arm=body(ray,[
   [.036,.065,.055,.116],[.105,.065,.059,.134],[.18,.059,.055,.114],
   [.27,.052,.047,.09],[.37,.044,.039,.061],[.46,.032,.027,.037],
   [.52,.024,.018,.021],[.553,.016,.010,.010],[.567,.011,.004,.003],
  ],'#d97853','#a45645');
  arm.rotation.y=-Math.PI/2;
  const vertices=arm.geometry.attributes.position;
  for(let j=0;j<vertices.count;j++){
   const reach=vertices.getX(j)/.567;
   vertices.setZ(j,vertices.getZ(j)-.069*reach*reach);
  }
  arm.geometry.computeVertexNormals();
  for(const [along,high,width] of [[.13,.127,.031],[.24,.106,.028],[.35,.089,.024],[.46,.065,.019]]){
   oval(ray,light,.069*(along/.567)**2,high,along,width,.016,width*.89);
  }
  arms.push(ray);
 }
 return a=>{
  const heading=a.heading??0;
  disk.rotation.y=Math.atan2(Math.sin(heading),Math.cos(heading)/Math.cos(oceanStarLedge.pitch));
  const touching=a.touch??0;
  for(const [i,arm] of arms.entries()){
   // 波峰窄于相邻两臂之间的相位，移动时最多一臂离底，另外四臂支撑。
   const step=touching>.03?0:T.MathUtils.smoothstep(Math.sin(a.phase+i*Math.PI*2/5),.83,1)*(a.crawl??0);
   arm.rotation.set(-step*.17,i*Math.PI*2/5,0,'YXZ');
   arm.scale.z=1;
  }
  if(a.pose>0||touching>0){
   // 顺着外壳边缘反算前臂角度。壳没有被压住，也无需整只海星抬离石面。
   const shell=oceanPoints.shell,arm=arms[0];
   const near=Math.hypot(shell.x-a.x,shell.z-a.z);
   const clear=T.MathUtils.clamp((near-.245)/.567,.47,1);
   target.set(shell.x-.171-a.x,shell.y+.004-a.y,shell.z+.020-a.z)
    .applyAxisAngle(xAxis,-oceanStarLedge.pitch).applyAxisAngle(yAxis,-disk.rotation.y);
   const forward=Math.sqrt(Math.max(.001,target.x**2+target.z**2-.069**2));
   const length=Math.sqrt(Math.max(.001,forward**2+target.y**2-.011**2));
   const pitch=Math.atan2(.011,length)-Math.atan2(target.y,forward);
   const yaw=Math.atan2(target.x,target.z)-Math.atan2(.069,forward);
   arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,Math.min(0,pitch),touching);
   arm.rotation.y=T.MathUtils.lerp(0,yaw,touching);
   arm.scale.z=T.MathUtils.clamp(T.MathUtils.lerp(clear,length/.567,touching),.47,1);
  }
 };
}
function starReef(root){
 const ledge=oceanStarLedge;
 const shape=new T.SphereGeometry(1,48,32);
 const vertices=shape.attributes.position;
 for(let i=0;i<vertices.count;i++)vertices.setY(i,Math.min(ledge.cap,vertices.getY(i)));
 shape.computeVertexNormals();
 const reef=item(root,shape,shore,ledge.x,ledge.y,ledge.z,ledge.rx,ledge.ry,ledge.rz);
 reef.rotation.x=ledge.pitch;
 return reef;
}
function seabed(root){
 const mat=new T.ShaderMaterial({
  transparent:true,depthWrite:false,uniforms:{time:{value:0},light:{value:1},mapMode:{value:0}},
  vertexShader:`varying vec2 seabed;
   void main(){seabed=(modelMatrix*vec4(position,1.)).xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 seabed;uniform float time,light,mapMode;
   void main(){
    float depth=smoothstep(17.5,45.,seabed.y);
    vec3 tint=mix(vec3(.70,.72,.52),vec3(.24,.53,.52),depth*.82);
    float a=sin(seabed.x*4.1+sin(seabed.y*5.2)+time*.51);
    float b=sin(seabed.y*6.1+cos(seabed.x*2.7)-time*.42);
    float glint=pow(max(0.,1.-abs(a+b)),8.)*.068;
    float grain=fract(sin(dot(floor(seabed*44.),vec2(12.9898,78.233)))*43758.5453)*.016;
    float reef=length((seabed-vec2(55.1,16.8))/vec2(8.8,4.3));
    float shoal=1.-smoothstep(.56,1.06,reef+.045*sin(seabed.x*1.4+seabed.y*.8));
    vec3 sandbank=mix(vec3(.45,.69,.66),vec3(.68,.74,.58),.65+.25*cos(seabed.x*.63));
    gl_FragColor=vec4((mix(tint,sandbank,mapMode)+glint+grain)*light,
     mix(smoothstep(12.,17.2,seabed.y),shoal*.74,mapMode));
   }`
 });
 const floor=item(root,new T.PlaneGeometry(64,104),mat,54,-.044,41);
 floor.rotation.x=-Math.PI/2;floor.renderOrder=1;
 return {uniforms:mat.uniforms,floor};
}
function kelp(root,x,y,z,scale,seed){
 const cluster=group(root,x,y,z);
 const interactive=x===oceanPoints.kelp.x;
 for(let i=0;i<3;i++){
  const side=i-1,center=side===0,preciseTip=interactive&&center;
  const ribbon=group(cluster,side*.12,0,side*.031);
  const dx=preciseTip?kelpBlade.x-x:side*.34+.08*Math.cos(seed);
  const dz=preciseTip?kelpBlade.z-z:.07*Math.sin(seed+i);
  const height=preciseTip?kelpBlade.y-y:scale*(center?1.04:.82+.09*Math.cos(seed+i));
  const pts=[],faces=[],rows=22;
  for(let j=0;j<=rows;j++){
   const f=j/rows,bell=Math.sin(Math.PI*f);
   const width=.007+(.086+.018*(1+side))*bell**.72*(1+.12*Math.sin(4*Math.PI*f+seed));
   const bend=bell*(.094*Math.sin(f*5+seed+.7*i));
   const cx=dx*f+bend,cy=height*f,cz=dz*f+.058*bell*Math.sin(f*4+i);
   const twist=.40*Math.sin(f*3+seed+i),wx=Math.cos(twist)*width,wz=Math.sin(twist)*width;
   pts.push(cx-wx,cy,cz-wz,cx,cy,cz+.035*bell,cx+wx,cy,cz+wz);
   if(j<rows){
    const k=j*3;
    faces.push(k,k+1,k+3,k+1,k+4,k+3,k+1,k+2,k+4,k+2,k+5,k+4);
   }
  }
  const g=new T.BufferGeometry();g.setIndex(faces);g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();
  seaweed[i].side=T.DoubleSide;
  item(ribbon,g,seaweed[i]);
  if(preciseTip)group(ribbon,dx,height,dz).name='海草叶尖';
 }
 if(!interactive)cluster.rotation.y=seed*.43;
 return cluster;
}
function coralFan(root,x,z,s,id){
 const stem=group(root,x,0,z);
 for(let arm=0;arm<5;arm++){
  const d=arm-2,n=.15*Math.cos(id+arm);
  tube(stem,coral[id%4],[[0,0,0],[d*.09*s,.40*s,n],[d*.21*s,(.75+.08*(arm%2))*s,n-.11]],.040*s);
  oval(stem,coral[(id+2)%4],d*.21*s,(.75+.08*(arm%2))*s,n-.11,.06*s,.065*s,.059*s);
 }
 return stem;
}
function diskShell(root,p){
 const shell=group(root,p.x,p.y-.04,p.z);
 oval(shell,seashell,0,0,0,.23,.065,.19);
 for(let i=0;i<7;i++){
  const valve=oval(shell,coral[2],(i-3)*.042,.034,.01,.025,.035,.146-Math.abs(i-3)*.022);
  valve.rotation.y=(i-3)*.16;
 }
 return shell;
}

export function makeOceanDiorama(scene){
 const root=group(scene);
 const bed=seabed(root);
 const shelf=pigment('#658e86',.88);
 for(const [i,[x,z,s,h]] of [[50.5,12.8,1.2,1.25],[52.1,13.0,.7,.63],[56.7,13.4,1.4,1.1],
  [59.8,13.0,1.35,1.85],[55.48,15.88,.79,.39],[57.59,16.23,.67,.28],[53.02,16.47,.52,.14],
  [51.8,17.3,.67,.19],[59.25,17.13,.84,.24]].entries()){
  const rock=oval(root,i>3?shore:shelf,x,h*.11,z,s,h,s*.67);rock.rotation.set(.10,i*.69,-.08);
 }
 const reef=starReef(root);
 const plants=[[51.25,15.3,1.12],[52.07,16.5,.67],[55.84,14.5,.95],[57.71,16.81,.86],[59.35,16.6,1.36]]
  .map(([x,z,s],i)=>kelp(root,x,-.03,z,s,.57*i));
 for(const [i,[x,z,s]] of [[51.47,17.04,.66],[52.11,15.3,.81],[54.69,15.02,.55],[56.68,16.50,.69],[59.1,15.29,.93]].entries())coralFan(root,x,z,s,i);
 const anemone=group(root,oceanPoints.anemone.x,.37,oceanPoints.anemone.z);
 oval(anemone,coral[0],0,.035,0,.35,.193,.27);
 const fronds=Array.from({length:16},(_,i)=>{
  const q=i*2.399,spread=.10+i%4*.037;
  const strand=oval(anemone,coral[i%2===0?0:3],Math.cos(q)*spread,.12,Math.sin(q)*spread,.038,.16,.038);
  strand.rotation.z=Math.cos(q)*.30;return strand;
 });
 // 前排水螅须挡住躲进去的身体，左侧水道留给探头的小鱼进出。
 for(let i=0;i<12;i++){
  const x=-.306+i*.059,z=.142+.049*Math.sin(i*1.13),height=.52+.083*Math.cos(i*1.68+.51);
  const tuft=group(anemone,x,.077,z),bend=(i-5.5)*.012;
  const tint=coral[i%3===1?3:0];
  tube(tuft,tint,[[0,0,0],[-bend*.34,height*.41,.012],[bend*.54,height*.79,.022],[bend,height,.035]],.049,15);
  oval(tuft,coral[i%3===1?0:3],bend,height,.035,.057,.067,.055);
  fronds.push(tuft);
 }
 const shell=diskShell(root,oceanPoints.shell);
 for(let i=0;i<36;i++){
  const x=50.8+(i*1.271)%8.5,z=16.9+(i*.317)%1.24;
  oval(root,i%2?shore:sand,x,.012,z,.035+i%4*.023,.02,.052+i%5*.013);
 }
 const actors={};
 for(const name of ['whale','dolphin','shark','clown','horse','star']){
  const g=group(root);
  const pose=name==='whale'?humpback(g):name==='horse'?linedSeahorse(g):name==='star'?seastar(g):swimmer(g,name);
  actors[name]={root:g,pose};
 }
 const visitor=group(root),poseVisitor=swimmer(visitor,'clown');
 visitor.scale.setScalar(.57);
 const bubbleMaterial=new T.MeshStandardMaterial({color:'#d1f3ec',roughness:.22,transparent:true,depthWrite:false,opacity:.24});
 const bubbles=Array.from({length:6},(_,i)=>oval(root,bubbleMaterial,0,0,0,.029+i%3*.010,.031+i%3*.010,.029+i%3*.010));
 const shellBubbles=Array.from({length:5},(_,i)=>oval(root,bubbleMaterial,0,0,0,.048+i*.008));
 const rippleMaterial=new T.MeshBasicMaterial({color:'#c8f6e9',transparent:true,opacity:.35});
 const wave=item(root,new T.TorusGeometry(1,.019,7,52),rippleMaterial);
 const shimmer=new T.PointLight('#d2f2f0',29,20,2);shimmer.position.set(54,5.8,19.6);root.add(shimmer);
 const seaFill=new T.HemisphereLight('#d8f4fb','#6f9da5',.79);root.add(seaFill);
 return {root,actors,reef,hintNodes:{anemone,kelp:plants[3],shell,visitor},
 setMapMode(on){bed.uniforms.mapMode.value=Number(on);shimmer.visible=seaFill.visible=!on;},tick(ocean,night){
  for(const [name,actor] of Object.entries(actors)){
   const a=ocean.animals[name];
   actor.root.position.set(a.x,a.y,a.z);actor.pose(a);
  }
  const guest=ocean.visitor;
  visitor.visible=guest.visible;
  if(guest.visible){
   visitor.position.set(guest.x,guest.y,guest.z);
   poseVisitor(guest);
  }
  const t=ocean.time;
  bed.uniforms.time.value=t;bed.uniforms.light.value=1-night*.24;
  plants.forEach((p,i)=>p.children.forEach((blade,j)=>{
   const contact=i===3&&j===1?1-ocean.animals.horse.touch:1;
   blade.rotation.z=contact*Math.sin(t*.83+i+j*.64)*.061;
  }));
  fronds.forEach((p,i)=>{p.rotation.x=Math.cos(t*1.67+i*.78)*.22;});
  bubbles.forEach((p,i)=>{
   const q=(t*.21+i*.59)%3.7;
   p.position.set((i%2?59.03:51.04)+Math.sin(q+i)*.11,.24+q,15.2+i%3*.57);
  });
  shellBubbles.forEach((p,i)=>{
   const age=ocean.shellAge-i*.087;
   p.visible=age>=0&&age<.96;
   if(p.visible)p.position.set(oceanPoints.shell.x+.32*age+Math.sin(i*3+age*4)*.11,
    oceanPoints.shell.y+age*1.49,oceanPoints.shell.z-.14*age);
  });
  const current=ocean.current;
  wave.visible=Boolean(current);
  if(current){
   wave.position.set(current.x,current.y,current.z);
   wave.scale.setScalar(Math.max(.001,current.radius));
   rippleMaterial.opacity=.30*(1-current.radius/8);
  }
  shimmer.intensity=29-night*7;
 }};
}
