import {blink,clay,closedShape,eye,group,legPart,makeLeg,mesh,paintSphere,tube} from './savanna-actors.js';

export function makeFox(T,groundAt){
 const root=group(T,null,'赤狐'),body=group(T,root,'躯干'),head=group(T,body,'头',[0,.48,.324]);
 const soft=new T.SphereGeometry(1,24,16),small=new T.SphereGeometry(1,14,10);
 const orange=clay(T,'#c6844f'),ginger=clay(T,'#ad5d37'),cream=clay(T,'#e8d4b3');
 const cocoa=clay(T,'#59443c'),inner=clay(T,'#d3a099'),amber=clay(T,'#986c3f');
 const fiber=clay(T,'#ffffff',.81,true);
 const red=new T.Color('#b66339'),white=new T.Color('#ecd6b8'),brindle=new T.Color('#d78c51');
 const dorsal=paintSphere(T,(x,y,z)=>white.clone().lerp(brindle,T.MathUtils.smoothstep(y,-.72,-.16))
  .lerp(red,T.MathUtils.smoothstep(y,.27,.81)*.68).multiplyScalar(.99+.02*Math.sin(x*9+z*8)));
 mesh(T,body,'柔软背线',dorsal,fiber,[0,.449,-.103],[.227,.231,.502]);
 mesh(T,body,'胸口',soft,cream,[0,.374,.219],[.174,.215,.232]);
 mesh(T,body,'臀部',dorsal,fiber,[0,.428,-.372],[.232,.212,.220]);
 mesh(T,head,'额头',dorsal,fiber,[0,.006,.089],[.207,.182,.215]);
 const muzzle=closedShape(T,[[-.015,-.054,.180,.11],[.12,-.059,.173,.105],[.23,-.102,.093,.074],[.31,-.129,.048,.040]],24,
  (x,y,z)=>white.clone().lerp(brindle,T.MathUtils.smoothstep(y,-.106,-.023)));
 mesh(T,head,'狐吻',muzzle,fiber,[0,0,.10]);
 mesh(T,head,'黑鼻尖',small,cocoa,[0,-.115,.415],[.062,.036,.043]);
 const jaw=group(T,head,'下颌',[0,-.088,.108]);
 mesh(T,jaw,'下巴',small,cream,[0,-.029,.179],[.088,.038,.144]);
 const ears=[],eyes=[],feet=[];
 for(const side of [-1,1]){
  const ear=group(T,head,'三角耳',[side*.133,.112,.012]);
  const edge=closedShape(T,[[0,0,.088,.058],[.08,0,.074,.051],[.193,0,.044,.028],[.246,0,.009,.005]],20);
  const lining=closedShape(T,[[0,0,.051,.022],[.13,.010,.037,.018],[.195,0,.004,.004]],16);
  mesh(T,ear,'耳尖',edge,ginger,[0,0,0]).rotation.x=-Math.PI/2;
  mesh(T,ear,'温暖的耳甲',lining,inner,[0,.014,.044]).rotation.x=-Math.PI/2;
  ears.push({ear,side});
  eyes.push(eye(T,head,'眼',small,[side*.158,-.001,.219],side*.60,amber,cocoa,cream));
  for(const front of [false,true]){
   const leg=makeLeg(T,root,'爪',legPart(T),orange,cocoa,'狐掌',[.052,.042,.075]);
   feet.push({leg,side,front});
  }
 }
 const tail=group(T,body,'蓬尾',[0,.475,-.486]);
 const tailForm=closedShape(T,[[-.741,-.033,.009,.014,.225],[-.69,-.057,.064,.071,.209],[-.56,-.09,.116,.101,.146],
  [-.37,-.09,.138,.109,.101],[-.22,-.062,.112,.099,.04],[-.06,-.026,.068,.065,.01],[.02,0,.046,.048,0]],27,
 (x,y,z)=>white.clone().lerp(red,T.MathUtils.smoothstep(z,-.61,-.47)).lerp(brindle,T.MathUtils.smoothstep(y,-.12,-.03)*.22));
 mesh(T,tail,'白尾尖',tailForm,fiber);
 const nose=group(T,head,'鼻前',[0,-.116,.431]);

 function pose({x:worldX,y:worldY=0,z:worldZ=0,yaw=0,time=0,gait=0,stride=0,sniff=0,dig=0,ears:alert=0,call=0}={}){
  const strideWave=Math.sin(stride),rotX=Math.cos(yaw),rotZ=Math.sin(yaw);
  body.position.y=.014*Math.abs(strideWave)*gait-.042*dig;
  body.rotation.z=.026*gait*strideWave;
  head.rotation.x=.54*sniff+.22*dig-.12*call;
  head.rotation.z=.09*alert;
  head.rotation.y=.08*Math.sin(time*6)*alert;
  jaw.rotation.x=.23*call;
  tail.rotation.set(.08*Math.sin(time*2.4)+.17*dig,.18*Math.sin(time*3.2)-gait*strideWave*.22,-.12);
  for(const {ear,side} of ears){
   ear.rotation.z=side*(-.21-.12*alert);
   ear.rotation.y=side*(.34+.29*alert)+.07*Math.sin(time*3+side);
  }
  for(const open of eyes)open(blink(time,4.25));
  for(const {leg,side,front} of feet){
   const phase=stride+((front?side:-side)>0?Math.PI:0),x=side*(front?.127:.155),z=front?.25:-.38;
   const scrape=front?dig*(.61+.39*Math.cos(time*19+side*Math.PI*.5)):0;
   const swing=gait*Math.max(0,Math.sin(phase)),step=Math.cos(phase)*gait*.158+scrape*.39;
   const floor=worldX===undefined?0:groundAt(worldX+x*rotX+(z+step)*rotZ,worldZ-x*rotZ+(z+step)*rotX)-worldY;
   leg.place([x,.37+body.position.y,z],[x,.19+floor*.45+swing*.045,z+step*.65+(front?.035:-.056)],
    [x,floor+swing*.107,z+step],front?.062:.076,.040,swing*-.5);
  }
 }
 pose();
 return {root,pose,nose};
}
