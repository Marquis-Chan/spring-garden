import {blink,clay,closedShape,eye,group,legPart,makeLeg,mesh,paintSphere,tube} from './savanna-actors.js';

export function makeRhino(T,groundAt){
 const root=group(T,null,'白犀牛'),body=group(T,root,'身体'),head=group(T,body,'鼻吻和双角',[0,.72,.44]);
 const form=new T.SphereGeometry(1,26,16),small=new T.SphereGeometry(1,16,10);
 const hide=clay(T,'#a89f95'),light=clay(T,'#b5afa5'),eyeDark=clay(T,'#493d37');
 const hoof=clay(T,'#77736e'),horn=clay(T,'#e3d3b8'),inner=clay(T,'#aa8a85');
 const lit=clay(T,'#ffffff',.8,true),back=new T.Color('#9a8f89'),belly=new T.Color('#beb8ae');
 const skin=paintSphere(T,(x,y,z)=>belly.clone().lerp(back,T.MathUtils.smoothstep(y,-.75,.8)).multiplyScalar(.98+.02*Math.sin(x*11+z*7)));
 mesh(T,body,'肩背',skin,lit,[0,.77,.05],[.47,.48,.72]);
 mesh(T,body,'肩峰',skin,lit,[0,.83,.33],[.45,.50,.45]);
 mesh(T,body,'臀胯',skin,lit,[0,.69,-.48],[.40,.40,.39]);
 mesh(T,head,'长头',skin,lit,[0,-.042,.27],[.29,.27,.43]);
 mesh(T,head,'宽唇',form,light,[0,-.131,.57],[.255,.126,.221]);
 for(const [z,y,height] of [[.56,-.02,.37],[.34,.13,.19]]){
  const shape=closedShape(T,[[0,0,.098,.105],[height*.27,.014,.071,.075],[height*.61,.047,.038,.041],[height,.101,.006,.006]],18);
  const spike=mesh(T,head,'犀角',shape,horn,[0,y,z]);
  spike.rotation.x=-Math.PI/2;
 }
 const eyes=[],ears=[],feet=[];
 for(const side of [-1,1]){
  const ear=group(T,head,'漏斗耳',[side*.196,.178,.064]);
  mesh(T,ear,'耳甲',form,hide,[0,.10,0],[.087,.159,.061]);
  mesh(T,ear,'耳内',small,inner,[.008*side,.11,.047],[.062,.116,.022]);
  ears.push({ear,side});
  eyes.push(eye(T,head,'眼',small,[side*.226,.023,.33],side*.62,hoof,eyeDark,horn));
  const nostril=mesh(T,head,'鼻孔',small,eyeDark,[side*.132,-.081,.726],[.048,.022,.017]);
  nostril.rotation.z=side*.22;
  tube(T,head,'唇沟',[[side*.199,-.17,.662],[side*.131,-.188,.735],[side*.05,-.191,.75]],.008,hoof);
  for(const front of [true,false]){
   const leg=makeLeg(T,root,'三趾腿',legPart(T),hide,hoof,'足',[.121,.080,.142]);
   for(let i=-1;i<=1;i++)mesh(T,leg.foot,'趾甲',small,light,[i*.061,.044,.139-Math.abs(i)*.018],[.030,.044,.031]);
   feet.push({leg,side,front});
  }
 }
 const tail=group(T,body,'尾',[0,.75,-.73]);
 tube(T,tail,'垂尾',[[0,0,0],[.025,-.12,-.058],[.057,-.26,-.062],[.046,-.34,-.074]],.022,hide);
 mesh(T,tail,'尾梢',small,hoof,[.045,-.337,-.076],[.040,.078,.033]);
 const muzzle=group(T,head,'吻端',[0,-.17,.74]);

 function pose({x:worldX,y:worldY=0,z:worldZ=0,yaw=0,time=0,stride=0,gait=0,sniff=0,call=0}={}){
  body.position.y=.011*Math.sin(time*2.7)+gait*.036*Math.abs(Math.sin(stride));
  body.rotation.z=.018*gait*Math.sin(stride);
  head.rotation.x=.60*sniff-.14*call+.06*gait*Math.cos(stride);
  head.rotation.y=.11*Math.sin(time*6)*sniff;
  tail.rotation.z=.17*Math.sin(time*3.2);
  for(const {ear,side} of ears){
   ear.rotation.z=side*(-.31-.15*sniff+.08*Math.cos(time*4.7+side));
   ear.rotation.y=side*.24;
  }
  for(const open of eyes)open(blink(time,4.5));
  const cos=Math.cos(yaw),sin=Math.sin(yaw);
  for(const {leg,side,front} of feet){
   const z=front?.47:-.44,x=side*.28;
   const phase=stride+((front?side:-side)>0?Math.PI:0);
   const swing=Math.max(0,Math.sin(phase))*gait;
   const step=Math.cos(phase)*gait*.22;
   const tread=z+step;
   // 上下岸坡时四只脚分别取实际地面高度，鼻端下探不抬起前脚。
   const floor=groundAt&&worldX!==undefined?groundAt(worldX+x*cos+tread*sin,worldZ-x*sin+tread*cos)-worldY:0;
   leg.place([x,.63+body.position.y,z],[x,.30+floor*.45+swing*.06,z+(front?.062:-.086)+step*.54],
    [x,floor+swing*.17,tread],.147,.109,swing*-.25);
  }
 }
 pose();
 return {root,pose,muzzle};
}
