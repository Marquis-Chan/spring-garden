import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { blink, clay, closedShape, eye, group, mesh, tube } from './savanna-actors.js';

const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// 从臀尖到方唇依次指定脊线、腹线的中点和半径。肩峰长在这条背线上。
const spine = [
  [-1.005,.75,.006,.008],[-.98,.75,.16,.17],[-.90,.755,.30,.30],
  [-.74,.762,.418,.412],[-.52,.766,.461,.443],[-.29,.749,.485,.43],
  [-.06,.751,.502,.436],[.12,.796,.496,.461],[.27,.836,.467,.499],
  [.37,.851,.429,.493],[.46,.846,.391,.454],[.55,.828,.335,.36],
  [.65,.813,.296,.294],[.75,.791,.288,.276],[.84,.755,.291,.256],
  [.93,.704,.270,.219],[1.03,.669,.225,.17],[1.13,.647,.219,.146],
  [1.20,.632,.245,.142],[1.256,.63,.247,.127],[1.30,.637,.204,.099],
  [1.327,.641,.134,.067],[1.345,.643,.007,.008]
];

// 足底、踝、膝、上臂也采用一个截面序列，脚和躯干共享同一层皮肤。
const limb = [
  [.008,.117,.140,.040],[.030,.144,.161,.044],[.086,.144,.160,.043],
  [.16,.124,.136,.025],[.255,.125,.128,.002],[.35,.144,.146,-.005],
  [.47,.153,.155,.006],[.61,.173,.180,.005],[.75,.184,.203,-.003],
  [.90,.14,.164,-.006],[1.03,.034,.040,-.008]
];
function section(rows, value) {
  let i = 0;
  while (i + 2 < rows.length && value > rows[i+1][0]) i++;
  const a = rows[i], b = rows[i+1], span = b[0] - a[0];
  const t = Math.max(0,Math.min(1,(value-a[0])/span));
  const before = rows[Math.max(0,i-1)], after = rows[Math.min(rows.length-1,i+2)];
  return a.slice(1).map((v,j) => {
    const c=j+1, w=b[c], ma=(w-before[c])/(b[0]-before[0])*span;
    const mb=(after[c]-v)/(after[0]-a[0])*span;
    return (2*t*t*t-3*t*t+1)*v+(t*t*t-2*t*t+t)*ma
      +(-2*t*t*t+3*t*t)*w+(t*t*t-t*t)*mb;
  });
}

const foreZ=.38, hindZ=-.61, stance=.292;
const headBase=[0,.85,.43];
let skinGeometry;

// 一次生成肩、头、四腿相连的等值面。动画只转动骨架，不在每帧重新采样。
function makeHide(T, material) {
  if (skinGeometry) return skinGeometry;
  const res=52, shape=new MarchingCubes(res,material,false,false,22000);
  const extent=[.68,.86,1.38], offset=[0,.75,.13];
  const axis=(i,k)=>(2*i/res-1)*extent[k]+offset[k];
  const yzProfiles=Array.from({length:res},(_,i)=>section(limb,axis(i,1)));
  const zProfiles=Array.from({length:res},(_,i)=>section(spine,axis(i,2)));
  for(let k=0;k<res;k++) {
    const z=axis(k,2), [mid,width,height]=zProfiles[k];
    const cap=Math.max(spine[0][0]-z,z-spine.at(-1)[0]);
    const squareLip=2+1.15*smooth(1.035,1.227,z);
    const front=z>(foreZ+hindZ)/2;
    for(let j=0;j<res;j++) {
      const y=axis(j,1),[rx,rz,footSlope]=yzProfiles[j];
      const thigh=front?0:-.060*Math.sin(smooth(.10,.77,y)*Math.PI*1.65);
      const station=(front?foreZ:hindZ)+footSlope+thigh;
      const maxY=Math.max(limb[0][0]-y,y-limb.at(-1)[0]);
      const cheek=Math.abs((y-mid)/height)**squareLip;
      for(let i=0;i<res;i++) {
        const x=Math.abs(axis(i,0));
        const trunk=Math.max(cap,((cheek+(x/width)**squareLip)**(1/squareLip)-1)*Math.min(width,height));
        const dx=(x-stance)/rx, dz=(z-station)/rz;
        const leg=Math.max(maxY,(Math.sqrt(dx*dx+dz*dz)-1)*Math.min(rx,rz));
        const blend=.128, h=Math.max(0,blend-Math.abs(trunk-leg))/blend;
        shape.field[i+res*(j+res*k)]=-(Math.min(trunk,leg)-h*h*blend*.25);
      }
    }
  }
  shape.isolation=0;
  shape.update();
  // 同一顶点由相邻三角形共用，保留隐式表面的光滑法线。
  const xyz=[],normal=[],color=[],indices=[],weights=[],bones=[],lookup=new Map();
  const shadow=new T.Color('#a399a5'), top=new T.Color('#c2b7b7'), nose=new T.Color('#c4aeac');
  const c=new T.Color(), n=new T.Vector3();
  for(let i=0;i<shape.count;i++) {
    const j=i*3;
    const x=shape.positionArray[j]*extent[0],y=shape.positionArray[j+1]*extent[1]+offset[1];
    const z=shape.positionArray[j+2]*extent[2]+offset[2];
    const key=Math.round(x*100000)+','+Math.round(y*100000)+','+Math.round(z*100000);
    let id=lookup.get(key);
    if (id===undefined) {
      id=xyz.length/3;lookup.set(key,id);xyz.push(x,y,z);
      n.set(shape.normalArray[j]/extent[0],shape.normalArray[j+1]/extent[1],shape.normalArray[j+2]/extent[2]).normalize();
      normal.push(n.x,n.y,n.z);
      c.copy(shadow).lerp(top,.27+.63*smooth(.1,1.36,y)).lerp(nose,smooth(.97,1.28,z)*.55);
      color.push(c.r,c.g,c.b);
      const aboveShoulder=Math.max(smooth(.62,.84,z),smooth(.47,.88,y));
      const head=smooth(.39,.71,z)*aboveShoulder;
      const leg=(1-smooth(.13,.78,y))*(1-head);
      const foot=2+(x>0?2:0)+(z>(foreZ+hindZ)/2?1:0);
      bones.push(0,1,foot,0);weights.push(1-head-leg,head,leg,0);
    }
    indices.push(id);
  }
  shape.geometry.dispose();
  skinGeometry=new T.BufferGeometry();
  for(const [name,array,size] of [['position',xyz,3],['normal',normal,3],['color',color,3],['skinWeight',weights,4]])
    skinGeometry.setAttribute(name,new T.Float32BufferAttribute(array,size));
  skinGeometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(bones,4));
  skinGeometry.setIndex(indices);skinGeometry.computeBoundingSphere();
  return skinGeometry;
}

function earCup(T, ear, material) {
  // 细耳柄从头顶长出，耳尖稍向外卷。耳窝在迎面的皮肤上直接凹下。
  const rings=[
    [-.070,0,.027,.024],[-.020,0,.041,.035],[.032,-.002,.055,.043],
    [.086,-.004,.075,.050],[.146,-.009,.094,.059],[.190,-.011,.089,.056],
    [.225,-.016,.069,.044],[.251,-.022,.042,.030],[.269,-.028,.008,.010]
  ];
  const geo=closedShape(T,rings,28);
  const pos=geo.attributes.position, colors=[];
  const outer=new T.Color('#b5a9ad'), warm=new T.Color('#997c80'), shade=new T.Color();
  for(let i=0;i<pos.count;i++) {
    const height=pos.getZ(i),x=pos.getX(i),depth=-pos.getY(i);
    const row=Math.min(rings.length-1,Math.floor(i/28));
    const hollow=smooth(.010,.080,height)*(1-smooth(.18,.255,height))
      *(1-smooth(.38,.94,Math.abs(x)/rings[row][2]))*smooth(.000,.024,depth);
    pos.setY(i,pos.getY(i)+.043*hollow);
    shade.copy(outer).lerp(warm,hollow*.92);
    colors.push(shade.r,shade.g,shade.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  mesh(T,ear,'外卷的漏斗耳',geo,material).rotation.x=-Math.PI/2;
}
export function makeRhino(T,groundAt) {
  const root=group(T,null,'白犀牛');
  const body=new T.Bone();body.name='肩背与臀部';root.add(body);
  const head=new T.Bone();head.name='鼻吻和双角';head.position.set(...headBase);body.add(head);
  const small=new T.SphereGeometry(1,20,14);
  const hide=clay(T,'#ffffff',.88,true), lip=clay(T,'#b4a3a6',.90);
  const dark=clay(T,'#695a5b'), iris=clay(T,'#8b715f'), pupil=clay(T,'#382f30'), white=clay(T,'#f5e4d0');
  const horn=clay(T,'#fff',.82,true), nail=clay(T,'#baafa8',.88);
  const hornBase=new T.Color('#afa394'), ivory=new T.Color('#e0d1b8');
  const eyes=[],ears=[],feet=[];
  const local=(x,y,z)=>[x,y-headBase[1],z-headBase[2]];

  for(const side of [-1,1]) {
    const ear=group(T,head,'耳根',local(side*.166,1.018,.718));
    earCup(T,ear,hide);ears.push({ear,side});
    eyes.push(eye(T,head,'眼',small,local(side*.255,.802,.888),side*1.12,iris,pupil,white));
    const nostril=mesh(T,head,'鼻孔',small,dark,local(side*.179,.665,1.309),[.048,.024,.014]);
    nostril.rotation.set(-.20,side*.65,side*.30);
    tube(T,head,'唇边',[
      local(side*.228,.577,1.18),local(side*.228,.557,1.226),
      local(side*.200,.557,1.277),local(side*.132,.555,1.298)
    ],.0065,dark,8);
    for(const front of [false,true]) {
      const foot=new T.Bone();foot.name=front?'前脚':'后脚';
      foot.position.set(side*stance,0,front?foreZ:hindZ);body.add(foot);
      for(const toe of [-1,0,1]) {
        const cap=mesh(T,foot,'趾甲',small,nail,
          [toe*.077,.053,.193-Math.abs(toe)*.026],[.043,.040,.024]);
        cap.rotation.y=toe*.39;
      }
      feet.push({foot,side,front});
    }
  }
  const sculpt=new T.SkinnedMesh(makeHide(T,hide),hide);
  sculpt.name='连续的犀牛皮肤';sculpt.castShadow=sculpt.receiveShadow=true;sculpt.frustumCulled=false;
  root.add(sculpt);root.updateMatrixWorld(true);
  sculpt.bind(new T.Skeleton([body,head,...feet.map(({foot})=>foot)]));
  for(const [z,y,h,r] of [[1.164,.720,.465,.122],[.911,.866,.241,.092]]) {
    const geo=closedShape(T,[
      [0,0,r,r],[h*.13,-.003,r*.91,r*.90],[h*.39,-.012,r*.62,r*.66],
      [h*.68,-.038,r*.38,r*.40],[h*.93,-.065,r*.14,r*.16],[h,-.073,.004,.005]
    ],28,(x,dy,dz)=>hornBase.clone().lerp(ivory,.16+.78*smooth(0,h,dz)));
    const spike=mesh(T,head,'犀角',geo,horn,local(0,y,z));spike.rotation.x=-Math.PI/2;
  }
  const jaw=group(T,head,'咀嚼的下唇',local(0,.563,1.055));
  mesh(T,jaw,'下颌',small,lip,[0,-.009,.129],[.204,.061,.173]);
  // 取闭口时下唇的实际外表面，草梢接触该点即开始弯折。
  const muzzle=group(T,head,'吻端',local(0,.49430,1.2189));
  const birdPerch=group(T,body,'犀牛背上的鸟爪落点',[0,1.228,-.52]);
  const bladeRoot=group(T,jaw,'嘴边的嫩草',[.124,-.006,.234]);
  const leafMat=clay(T,'#81a34d',.89);
  const leafGeometry=closedShape(T,[[0,0,.009,.008],[.072,.024,.034,.009],[.16,.048,.027,.007],[.235,.055,.002,.002]],12);
  const bladeMesh=mesh(T,bladeRoot,'衔起的草叶',leafGeometry,leafMat);
  bladeMesh.rotation.y=1.03;
  const tail=group(T,body,'尾根',[0,.79,-.945]);
  tube(T,tail,'垂尾',[[0,0,0],[.016,-.112,-.07],[.036,-.259,-.089],[.057,-.400,-.066]],.020,lip);
  mesh(T,tail,'尾梢',small,dark,[.058,-.40,-.067],[.031,.059,.026]);

  function pose({x:worldX,y:worldY=0,z:worldZ=0,yaw=0,time=0,stride=0,gait=0,sniff=0,call=0,
      attention=0,listenEar=0,chew=0,blade=0}={}) {
    body.position.y=.006*Math.sin(time*1.84)+.018*gait*Math.abs(Math.sin(stride));
    const lift=Math.max(attention,call*.55)*(1-sniff);
    head.rotation.x=.47034*sniff-.25*lift+.025*gait*Math.cos(stride);
    const towardViewer=Math.atan2(Math.sin(-yaw),Math.cos(-yaw));
    head.rotation.y=T.MathUtils.clamp(towardViewer,-.50,.50)*lift;
    jaw.rotation.x=.18*chew;
    jaw.position.x=.016*chew;
    bladeRoot.visible=blade>.015;
    bladeRoot.scale.setScalar(Math.max(.001,blade));
    bladeRoot.rotation.z=.20*chew;
    tail.rotation.z=.14*Math.sin(time*2.3);
    for(const {ear,side} of ears) {
      const near=side*Math.sin(-yaw)>=0;
      ear.rotation.z=side*(-.40-.12*sniff-.23*(near?1:.4)*listenEar+.044*Math.cos(time*3+side));
      ear.rotation.y=side*(.48-(near?.85:.40)*listenEar);
      ear.rotation.x=-.08-.22*listenEar;
    }
    for(const open of eyes)open(blink(time,4.5));
    const cos=Math.cos(yaw),sin=Math.sin(yaw);
    for(const {foot,side,front} of feet) {
      const phase=stride+((front?side:-side)>0?Math.PI:0);
      const step=Math.cos(phase)*gait*.157, swing=Math.max(0,Math.sin(phase))*gait;
      const z=(front?foreZ:hindZ)+step,x=side*stance;
      const floor=groundAt&&worldX!==undefined?groundAt(worldX+x*cos+z*sin,worldZ-x*sin+z*cos)-worldY:0;
      foot.position.set(x,floor-body.position.y+swing*.108,z);
      foot.rotation.x=-swing*.12;
    }
  }
  pose();
  return {root,pose,muzzle,birdPerch};
}
