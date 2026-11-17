import {blink,clay,closedShape,eye,group,mesh,paintSphere,tube} from './savanna-actors.js';

export function makeToucan(T,toucanTopAt){
 const root=group(T,null,'大巨嘴鸟'),body=group(T,root,'短而宽的胸腹',[0,.27,-.072]);
 const head=group(T,root,'头和喙'),jaw=group(T,head,'下喙',[0,-.044,.099]);
 const beak=group(T,head,'喙尖接触点',[0,-.007,.539]);
 const sphere=new T.SphereGeometry(1,26,16),small=new T.SphereGeometry(1,15,10);
 const coal=clay(T,'#3b3e42',.71),white=clay(T,'#efe0bb',.73),rump=clay(T,'#ae655b');
 const dark=clay(T,'#34323b',.52),iris=clay(T,'#b48655',.53),foot=clay(T,'#83929b',.78);
 const skin=clay(T,'#ffffff',.68,true),rim=clay(T,'#6297ae'),cream=clay(T,'#fff3ce',.51);
 const black=new T.Color('#303841'),gray=new T.Color('#65716a');
 const feather=paintSphere(T,(x,y,z)=>black.clone().lerp(gray,Math.max(0,y)*.26+(1+Math.cos(x*16+z*4))*.065));
 mesh(T,body,'黑羽轮廓',feather,skin,[0,0,0],[.184,.226,.247]);
 mesh(T,body,'白围兜',sphere,white,[0,.097,.138],[.146,.147,.098]);
 mesh(T,body,'尾下红羽',small,rump,[0,-.179,-.104],[.103,.053,.103]);
 mesh(T,head,'黑头',feather,skin,[0,.004,-.028],[.151,.143,.158]);
 mesh(T,head,'贴喙白羽',sphere,white,[0,-.059,.066],[.117,.101,.091]);
 const base=new T.Color('#974d3b'),orange=new T.Color('#d98338'),yellow=new T.Color('#f5c067'),tip=new T.Color('#453b43');
 function billColor(x,y,z){
  return base.clone().lerp(orange,T.MathUtils.smoothstep(z,.04,.23))
   .lerp(yellow,T.MathUtils.smoothstep(y,-.028,.094)*.78)
   .lerp(tip,T.MathUtils.smoothstep(z,.434,.527)*.98);
 }
 const upper=closedShape(T,[[.058,.019,.076,.092],[.121,.039,.097,.105],[.221,.043,.103,.100],[.338,.042,.086,.084],
  [.441,.030,.058,.056],[.514,.011,.035,.032],[.539,-.006,.008,.008]],26,billColor);
 const lower=closedShape(T,[[0,0,.076,.034],[.115,-.006,.089,.041],[.235,-.014,.073,.032],[.354,-.021,.044,.022],
  [.425,-.012,.018,.015]],24,(x,y,z)=>billColor(x,y,z+.106).multiplyScalar(.89));
 mesh(T,head,'橙黄上喙与深色喙尖',upper,skin);
 mesh(T,jaw,'开合下喙',lower,skin);
 for(const sign of [-1,1]){
  const line=mesh(T,head,'喙根鼻孔',small,dark,[sign*.085,.073,.158],[.010,.009,.019]);
  line.rotation.y=sign*.25;
 }
 const eyes=[],wings=[],feet=[];
 for(const side of [-1,1]){
  const ring=mesh(T,head,'蓝色眼周',small,rim,[side*.098,.046,.075],[.050,.050,.032]);
  ring.rotation.y=side*.68;
  eyes.push(eye(T,head,'巨嘴鸟眼',small,[side*.114,.047,.089],side*.58,iris,dark,cream));
  const wing=group(T,body,'翼肩',[side*.126,.059,-.045]);
  mesh(T,wing,'翼尖覆羽',feather,skin,[side*.142,-.034,-.052],[.207,.061,.100]);
  for(let i=0;i<7;i++){
   const plume=mesh(T,wing,'翼端飞羽',feather,skin,[side*(.231+.032*i),-.052-.009*i,-.075-.019*i],
    [.178-i*.014,.026,.036]);
   plume.rotation.y=side*(.16+i*.105);
  }
  wings.push({wing,side});
  const grip=group(T,root,'扣枝的脚趾',[side*.071,0,.026]);
  for(const toe of [-1,0,1])tube(T,grip,'前趾',[[toe*.021,.079,-.022],[toe*.025,.035,.025],[toe*.029,.006,.068],[toe*.027,-.004,.078]],.011,foot);
  tube(T,grip,'后趾',[[0,.073,-.016],[side*.017,.034,-.052],[side*.021,.004,-.078]],.012,foot);
  const shin=mesh(T,root,'短跗骨',small,foot);
  feet.push({grip,side,shin});
 }
 const tail=group(T,body,'宽尾',[0,-.106,-.195]);
 for(const i of [-2,-1,0,1,2]){
  const featherTail=mesh(T,tail,'尾羽',sphere,coal,[i*.038,-.050,-.145],[.037,.030,.183]);
  featherTail.rotation.y=i*.11;
 }
 const target=new T.Vector3(),offset=new T.Vector3();
 const up=new T.Vector3(0,1,0),hip=new T.Vector3(),ankle=new T.Vector3(),axis=new T.Vector3();
 function pose({x:worldX,y:worldY=0,z:worldZ=0,yaw=0,time=0,flight=0,flap=0,land=0,reach=0,
  targetX=0,targetY=.356,targetZ=.58,look=0,beakOpen=0,call=0,sleep=0}={}){
  const open=T.MathUtils.smoothstep(flight,.05,.65);
  const drowsy=T.MathUtils.smoothstep(sleep,0,1);
  body.position.y=.27+.008*Math.sin(time*4)-.027*land+open*.043-.039*drowsy;
  body.rotation.x=.53*open+.16*reach+.050*drowsy;
  const attentive=(1-open)*(1-reach)*(1-drowsy)*(1-Math.min(1,Math.abs(look)*2));
  head.rotation.set(-.040-open*.18+reach*.06-Math.max(beakOpen,call)*.10+.026*Math.sin(time*1.96)*attentive+.25*drowsy,
    look*.42*(1-reach)+.069*Math.sin(time*1.18)*attentive,-.055*look);
  offset.copy(beak.position).applyEuler(head.rotation);
  target.set(.010*look,.392+.015*Math.sin(time*3)+.041*beakOpen-.072*drowsy,.600-.108*drowsy);
  target.lerp(offset.set(targetX,targetY,targetZ),reach);
  offset.copy(beak.position).applyEuler(head.rotation);
  head.position.copy(target).sub(offset);
  jaw.rotation.x=.43*beakOpen+.20*call;
  for(const set of eyes)set(blink(time,4.25)*(1-drowsy));
  for(const {wing,side} of wings)wing.rotation.set(open*.23,side*.36*(1-open),side*(-1.28*(1-open)+open*(flap*.96+.09)));
  const right=Math.cos(yaw),forward=Math.sin(yaw);
  for(const {grip,side,shin} of feet){
   grip.position.set(side*.071,.088*open,.026-.075*open);
   grip.rotation.x=open*-.92;
   if(toucanTopAt&&worldX!==undefined&&open<.22){
    let score=-Infinity,gripY=0,gripZ=grip.position.z;
    for(let i=-4;i<=4;i++){
     const z=.026+i*.023,grasp=z+.018,x=side*.071;
     const y=toucanTopAt(worldX+x*right+grasp*forward,worldZ-x*forward+grasp*right)-worldY;
     if(Math.abs(y)>.12)continue;
     const preference=y-.25*Math.abs(z-.026);
     if(preference<=score)continue;
     score=preference;gripY=y;gripZ=z;
    }
    if(Number.isFinite(score)){
     const hold=1-T.MathUtils.smoothstep(open,.025,.22);
     grip.position.y=T.MathUtils.lerp(grip.position.y,gripY-.007,hold);
     grip.position.z=T.MathUtils.lerp(grip.position.z,gripZ,hold);
    }
   }
   hip.set(side*.070,-.164,.066).applyEuler(body.rotation).add(body.position);
   ankle.set(0,.060,-.018).applyEuler(grip.rotation).add(grip.position);
   axis.subVectors(ankle,hip);
   shin.position.copy(hip).lerp(ankle,.52);
   shin.scale.set(.025,axis.length()*.64+.010,.023);
   shin.quaternion.setFromUnitVectors(up,axis.normalize());
  }
  tail.rotation.set(-.23-.42*open,look*.12,0);
 }
 pose();
 return {root,pose,beak};
}
