import {blink,clay,closedShape,eye,group,legPart,makeLeg,mesh,paintSphere,tube} from './savanna-actors.js';

export function makeMoonBear(T,groundAt){
 const root=group(T,null,'亚洲黑熊'),trunk=group(T,root,'肩胸'),head=group(T,trunk,'熊头',[0,.42,.16]);
 const sphere=new T.SphereGeometry(1,24,17),small=new T.SphereGeometry(1,15,11);
 const fur=clay(T,'#4f4a4d',.86),coat=clay(T,'#625955',.86),paws=clay(T,'#4b4547',.87);
 const white=clay(T,'#e9d6ad',.92),muzzle=clay(T,'#a28468',.87),nose=clay(T,'#343239');
 const skin=clay(T,'#ffffff',.87,true),top=new T.Color('#45424b'),chin=new T.Color('#665953');
 const shade=paintSphere(T,(x,y,z)=>chin.clone().lerp(top,T.MathUtils.smoothstep(y,-.60,.82)).multiplyScalar(.97+.035*Math.sin(x*11+z*7)));
 mesh(T,trunk,'浑圆肩背',shade,skin,[0,-.025,-.055],[.374,.535,.383]);
 mesh(T,trunk,'肩峰',shade,skin,[0,.216,.092],[.331,.308,.272]);
 mesh(T,trunk,'圆肚',sphere,coat,[0,-.222,.049],[.298,.284,.271]);
 const patchPositions=[],patchIndex=[];
 for(let i=0;i<=32;i++){
  const t=i/32,x=(t-.5)*.475,arc=Math.sin(Math.PI*t)**.73;
  for(const y of [.232-arc*.165,.232-arc*.090]){
   const z=.092+.274*Math.sqrt(Math.max(.04,1-(x/.331)**2-((y-.216)/.308)**2));
   patchPositions.push(x,y,z);
  }
  if(i<32){const a=2*i;patchIndex.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 const patch=new T.BufferGeometry();
 patch.setAttribute('position',new T.Float32BufferAttribute(patchPositions,3));patch.setIndex(patchIndex);patch.computeVertexNormals();
 mesh(T,trunk,'胸口月牙',patch,white);
 mesh(T,head,'后脑与脸',shade,skin,[0,.008,.028],[.255,.216,.227]);
 mesh(T,head,'短鼻吻',sphere,muzzle,[0,-.064,.205],[.166,.113,.143]);
 mesh(T,head,'熊鼻',small,nose,[0,-.016,.310],[.095,.048,.044]);
 const jaw=group(T,head,'咀嚼下颌',[0,-.091,.16]);
 mesh(T,jaw,'熊下巴',small,muzzle,[0,-.050,.079],[.138,.061,.099]);
 const mouth=group(T,head,'嘴边食物接触点',[0,-.133,.305]);
 const paw=group(T,root,'前掌食物接触点');
 const eyes=[],legs=[];
 for(const side of [-1,1]){
  const ear=group(T,head,'圆耳',[side*.186,.135,-.009]);
  mesh(T,ear,'耳壳',sphere,fur,[0,.027,0],[.100,.102,.054]);
  mesh(T,ear,'耳心',small,coat,[side*.009,.034,.040],[.070,.070,.024]);
  eyes.push(eye(T,head,'熊眼',small,[side*.138,.022,.187],side*.52,muzzle,nose,white));
  for(const front of [true,false]){
   const leg=makeLeg(T,root,front?'前掌':'后足',legPart(T),fur,paws,'掌',[.089,.076,.128]);
   for(let i=-1;i<=1;i++)mesh(T,leg.foot,'趾',small,coat,[i*.046,.048,.117-Math.abs(i)*.010],[.028,.034,.040]);
   legs.push({leg,side,front});
  }
 }
 const toe=new T.Vector3(),toMouth=new T.Vector3(),shoulder=new T.Vector3();
 const s=T.MathUtils.smoothstep;
 function pose({x:worldX,y:worldY=0,z:worldZ=0,yaw=0,time=0,stand=0,reach=0,reachX=.12,reachY=1.21,reachZ=.61,
  hold=0,bring=0,chew=0,gait=0,stride=0}={}){
  const calm=1-Math.max(stand,reach,hold,chew,gait);
  const idle=calm*Math.sin(time*1.26+.9);
  trunk.position.set(0,.641+stand*.303+gait*.022*Math.abs(Math.sin(stride))+idle*.012,-.055-.045*stand);
  trunk.rotation.set(.86-.84*stand,0,gait*.028*Math.sin(stride));
  head.rotation.x=-.42*(1-stand)+.10*chew;
  head.rotation.y=idle*.153;
  head.rotation.z=.038*stand*Math.cos(time*2.4)+idle*.033;
  jaw.rotation.x=.23*chew*(.57+.43*Math.sin(time*21));
  for(const close of eyes)close(blink(time,4.8));
  head.updateMatrix();trunk.updateMatrix();
  toMouth.copy(mouth.position).applyMatrix4(head.matrix).applyMatrix4(trunk.matrix);
  const c=Math.cos(yaw),d=Math.sin(yaw);
  for(const {leg,side,front} of legs){
   const phase=stride+((front?side:-side)>0?Math.PI:0),x=side*(front?.219:.252),z=front?.425:-.389;
   const travel=Math.cos(phase)*gait*.159;
   const lift=Math.max(0,Math.sin(phase))*gait*.115;
   const floor=worldX===undefined?0:groundAt(worldX+x*c+(z+travel)*d,worldZ-x*d+(z+travel)*c)-worldY;
   toe.set(x,floor+lift,z+travel);
   if(front){
    shoulder.set(x,.16,.16).applyMatrix4(trunk.matrix);
    const raised=s(stand,.12,.73);
    toe.lerp(new T.Vector3(x,.783,.303),raised);
    if(side>0){
     const reachPoint=new T.Vector3(reachX,Math.max(floor,reachY-.056),reachZ);
     const snackPoint=toMouth.clone();snackPoint.x+=.085;snackPoint.y-=.150;snackPoint.z+=.105;
     toe.lerp(snackPoint,hold*bring).lerp(reachPoint,reach);
     paw.position.copy(toe);paw.position.y+=.056;
    }
   }else shoulder.set(x,.52+stand*.21,-.289);
   const flex=front?.086:-.077;
   leg.place(shoulder.toArray(),[(shoulder.x+toe.x)*.5,(shoulder.y+toe.y)*.5, (shoulder.z+toe.z)*.5+flex],toe.toArray(),front?.099:.116,.074,-.16*lift);
  }
 }
 pose();
 return {root,pose,paw,mouth};
}

export function makeScopsOwl(T,owlTopAt){
 const root=group(T,null,'东方角鸮'),body=group(T,root,'躯干',[0,.283,-.008]);
 const head=group(T,body,'带耳羽的头',[0,.268,.071]),tail=group(T,body,'短尾',[0,-.201,-.111]);
 const sphere=new T.SphereGeometry(1,25,16),small=new T.SphereGeometry(1,14,10);
 const brow=clay(T,'#8f775e',.88),light=clay(T,'#cbb090',.91),dark=clay(T,'#4c453e',.87);
 const lip=clay(T,'#ac9a73'),gold=clay(T,'#ceab51',.57),shine=clay(T,'#fff1ca',.47);
 gold.emissive.set('#ac8640');
 const patterns=clay(T,'#ffffff',.82,true);
 const cream=new T.Color('#c5a889'),rust=new T.Color('#8f7564'),line=new T.Color('#705748');
 const streak=(x,y,z)=>{
  const k=T.MathUtils.smoothstep(Math.cos(x*22+Math.sin(y*16)*1.62+z*3),.58,.90);
  return cream.clone().lerp(rust,T.MathUtils.smoothstep(-z,-.1,.75)*.85).lerp(line,k*.57);
 };
 const shaped=paintSphere(T,streak,36,22);
 mesh(T,body,'斑纹胸腹',shaped,patterns,[0,0,0],[.211,.262,.175]);
 mesh(T,head,'圆头',shaped,patterns,[0,0,0],[.236,.205,.173]);
 const jaw=group(T,head,'低音时活动的喙',[0,-.067,.184]);
 mesh(T,jaw,'鸟嘴',closedShape(T,[[0,0,.048,.054],[.05,-.005,.032,.037],[.103,-.024,.006,.008]],18),lip);
 const throat=mesh(T,head,'喙间阴影',small,dark,[0,-.090,.222],[.035,.025,.050]);throat.visible=false;
 const lids=[],wings=[],feet=[],ears=[];
 for(const side of [-1,1]){
  const ear=group(T,head,'短耳羽',[side*.161,.137,-.027]);
  ears.push({ear,side});
  const tuft=closedShape(T,[[0,0,.071,.045],[.079,.002,.047,.031],[.164,.016,.006,.005]],20,streak);
  mesh(T,ear,'耳羽',tuft,patterns).rotation.x=-Math.PI/2;
  ear.rotation.z=-side*.19;
  const disk=mesh(T,head,'面盘',sphere,light,[side*.095,.001,.136],[.126,.141,.062]);
  disk.rotation.y=side*.24;
  lids.push(eye(T,head,'琥珀眼',sphere,[side*.093,.001,.186],side*.23,gold,dark,shine));
  const wing=group(T,body,'翼根',[side*.147,.059,-.036]);
  mesh(T,wing,'翼肘',shaped,patterns,[side*.144,-.054,-.043],[.214,.068,.112]);
  for(let i=0;i<7;i++){
   const feather=mesh(T,wing,'有斑纹的飞羽',shaped,patterns,[side*(.235+.034*i),-.075-.010*i,-.055-.019*i],[.160-i*.010,.028,.039]);
   feather.rotation.y=side*(.32+i*.123);
  }
  wings.push({wing,side});
  const foot=group(T,root,'抓住枝面的脚',[side*.082,0,.046]);
  for(const i of [-1,0,1])tube(T,foot,'蜷趾',[[i*.024,.073,-.026],[i*.026,.034,.023],[i*.032,.004,.05],[i*.032,-.004,.071]],.012,lip);
  const shin=mesh(T,root,'短腿',small,brow);
  feet.push({foot,shin,side});
  const rectrix=mesh(T,tail,'尾羽',shaped,patterns,[side*.052,-.061,-.084],[.053,.038,.14]);
  rectrix.rotation.y=side*.18;
 }
 const upright=new T.Vector3(0,1,0),hip=new T.Vector3(),ankle=new T.Vector3(),direction=new T.Vector3();
 function pose({x:worldX,y:worldY=0,z:worldZ=0,yaw=.23,time=0,call=0,flight=0,flap=0,land=0,look=0,sleep=0}={}){
  const soar=T.MathUtils.smoothstep(flight,.04,.72),rest=sleep*(1-soar);
  const calm=(1-rest)*(1-Math.max(soar,call));
  const idle=Math.sin(time*.92+2.1)*calm;
  const settle=land*(1-soar),down=Math.max(0,idle)*.16+settle*.23;
  body.position.y=.277+.006*Math.sin(time*3.8)-rest*.019+.022*call-settle*.038;
  body.rotation.x=.45*soar;
  head.rotation.set(rest*.17-soar*.27-call*.19+down,idle*.227+look*.27+call*.10,-look*.075+idle*.044);
  for(const {ear,side} of ears)ear.rotation.z=side*(-.19+idle*.075);
  jaw.rotation.x=call*.56;
  throat.visible=call>.12;throat.scale.y=.017+.023*call;
  gold.emissiveIntensity=.055+.24*call;
  for(const set of lids)set(blink(time+1,4.7),rest);
  for(const {wing,side} of wings)wing.rotation.set(-soar*.13,side*.35*(1-soar),side*(-1.16*(1-soar)+soar*(flap*.86+.08)));
  const right=Math.cos(yaw),forward=Math.sin(yaw);
  for(const {foot,shin,side} of feet){
   foot.position.set(side*.082,.071*soar,.046-.073*soar);
   foot.rotation.x=soar*-.92;
   if(owlTopAt&&worldX!==undefined&&soar<.22){
    // 栖枝从两个方向伸出，左右脚各找离当前站姿最近的真实枝面。
    let score=-Infinity,gripZ=foot.position.z,gripY=0;
    for(let i=-6;i<=4;i++){
     const z=.046+i*.028,grip=z+.028,x=side*.082;
     const y=owlTopAt(worldX+x*right+grip*forward,worldZ-x*forward+grip*right)-worldY;
     if(Math.abs(y)>.14)continue;
     const preference=y-Math.abs(z-.046)*.34;
     if(preference<=score)continue;
     score=preference;gripY=y;gripZ=z;
    }
    const hold=(1-T.MathUtils.smoothstep(soar,.04,.22));
    if(Number.isFinite(score)){
     foot.position.y=T.MathUtils.lerp(foot.position.y,gripY-.014,hold);
     foot.position.z=T.MathUtils.lerp(foot.position.z,gripZ,hold);
    }
   }
   hip.set(side*.078,-.194,.025).applyEuler(body.rotation).add(body.position);
   ankle.set(0,.053,-.017).applyEuler(foot.rotation).add(foot.position);
   direction.subVectors(ankle,hip);
   shin.position.copy(hip).lerp(ankle,.53);
   shin.scale.set(.032,direction.length()*.64+.012,.036);
   shin.quaternion.setFromUnitVectors(upright,direction.normalize());
  }
  tail.rotation.x=soar*-.37;
 }
 pose();
 return {root,pose};
}
