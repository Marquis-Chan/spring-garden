import {clamp,ease,mix} from './state.js';
import {createGumGround} from './gum-ground-state.js';

export const gumOrigin={x:29,y:.38,z:-1};
export const gumPerches=[
 {x:1.64,y:1.55,z:.37,yaw:-1.00},
 {x:.56,y:2.36,z:.24,yaw:.92}
];
const pulse=t=>Math.sin(Math.PI*clamp(t));
const window=(time,a,b,c,d)=>ease(clamp((time-a)/(b-a)))*(1-ease(clamp((time-c)/(d-c))));

export function createEucalyptus(emit=()=>{}){
 const ground=createGumGround(emit);
 const koala={action:'rest',sleep:0,reach:0,pull:0,chew:0,stretch:0,call:0,watch:0,ears:0};
 const bird={x:0,y:0,z:0,yaw:0,flight:0,perch:0,night:false,sleep:0,age:0,journey:false,sing:0};
 const leaf={pluck:0,eaten:0},bough={angle:0};
 let time=0,age=0,night=false,from=0,to=0,flightAge=0,singAge=10,listenAge=10,drowse=0;
 let dayAwake=0,dayRest=0,flightInvited=false;
 function placeBird(x,y,z){bird.x=x+gumOrigin.x;bird.y=y+gumOrigin.y;bird.z=z+gumOrigin.z;}
 const home=gumPerches[0];
 placeBird(home.x,home.y,home.z);bird.yaw=home.yaw;
 function fly(){
  if(night||bird.journey)return;
  from=bird.perch;to=1-from;flightAge=0;bird.journey=true;bird.sleep=0;
  emit({type:'silvereye-flight',perch:to});
 }
 function begin(action){
  if(koala.action!=='rest')return false;
  koala.action=action;age=0;flightInvited=false;return true;
 }
 function tap(kind){
  if(['wallaby','wallaby-grass','wombat-den','wombat'].includes(kind)){ground.tap(kind);return;}
  if(kind==='silvereye'){
   if(night&&!bird.journey){emit({type:'silvereye-sleep'});return;}
   if(bird.journey||singAge<1.1)return;
   singAge=0;listenAge=0;emit({type:'silvereye-call'});
   if(koala.sleep<.6)emit({type:'koala-listen'});
   ground.birdSong();
   return;
  }
  if(!['koala','gum-leaves','gum-bough'].includes(kind))return;
  if(koala.sleep>.60){emit({type:'koala-sleep'});return;}
  const action=kind==='koala'?'call':kind==='gum-leaves'?'feed':'rock';
  if(begin(action)){
   dayAwake=0;dayRest=0;
   emit({type:action==='call'?'koala-call':'koala-'+action});
  }
 }
 function step(dt,active=true,nightValue=false){
  if(!active)return;
  dt=clamp(dt,0,.05);if(!dt)return;
  night=Number(nightValue)>.55;bird.night=night;
  ground.step(dt,night);
  time+=dt;age+=dt;singAge+=dt;listenAge+=dt;
  if(!night&&koala.action==='rest'){
   dayAwake+=dt;
   if(dayAwake>=37){dayAwake=0;dayRest=6;}
  }else if(night){dayRest=0;dayAwake=0;}
  dayRest=Math.max(0,dayRest-dt);
  drowse=mix(drowse,Number(dayRest>0),1-Math.exp(-4*dt));
  koala.sleep=drowse;
  const feeding=koala.action==='feed',rocking=koala.action==='rock',calling=koala.action==='call';
  koala.reach=feeding?window(age,0,.57,3.23,3.77):0;
  koala.pull=feeding?window(age,.59,1.48,2.75,3.42):0;
  koala.chew=feeding?koala.pull*(.48-.48*Math.cos(Math.max(0,age-1.42)*14)):0;
  leaf.pluck=koala.pull;
  // 叶尖进入嘴里后才缩短；松开后原位置长出下一片嫩叶。
  leaf.eaten=feeding?window(age,1.54,2.39,3.47,3.85):0;
  koala.stretch=calling?window(age,0,.52,1.43,2.14):0;
  koala.call=koala.stretch*(.65+.35*Math.cos(age*11));
  bough.angle=(rocking?.115*pulse(age/3.5)*Math.sin(age*5.3):0)+
    (feeding?.022*koala.pull*Math.sin(age*3.2):0);
  if(!flightInvited&&((feeding&&age>.86)||(rocking&&age>.66))){
   flightInvited=true;fly();
  }
  if((feeding&&age>=3.9)||(calling&&age>=2.2)||(rocking&&age>=3.5))koala.action='rest';
  if(singAge-dt<.45&&singAge>=.45)fly();
  bird.sing=window(singAge,0,.12,.4,.52);
  if(bird.journey){
   flightAge+=dt;const t=clamp(flightAge/1.32),s=ease(t),high=pulse(t);
   const a=gumPerches[from],b=gumPerches[to];
   placeBird(mix(a.x,b.x,s)+.30*high,mix(a.y,b.y,s)+.43*high,mix(a.z,b.z,s)+.60*high);
   const flyYaw=Math.atan2(b.x-a.x,b.z-a.z);
   const target=t<.8?flyYaw:b.yaw;
   bird.yaw+=Math.atan2(Math.sin(target-bird.yaw),Math.cos(target-bird.yaw))*(1-Math.exp(-12*dt));
   bird.flight=window(t,0,.13,.85,1);
   if(t===1){bird.journey=false;bird.perch=to;bird.yaw=b.yaw;emit({type:'silvereye-land',perch:to});}
  }
  bird.sleep=mix(bird.sleep,Number(night&&!bird.journey),1-Math.exp(-5*dt));
  const listening=window(listenAge,0,.27,1.62,2.32)*(1-koala.sleep);
  koala.watch=listening;koala.ears=listening*pulse(listenAge/.47)+koala.stretch*.58;
 }
 return {koala,bird,leaf,bough,ground,canTap:ground.canTap,get time(){return time;},tap,step};
}
