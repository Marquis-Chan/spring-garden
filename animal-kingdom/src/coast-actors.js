import {blink,clay,closedShape,group,mesh,paintSphere,tube} from './savanna-actors.js';

const s = (value, a=0, b=1) => {
  const u = Math.min(1, Math.max(0,(value-a)/(b-a)));
  return u*u*(3-2*u);
};
const mix = (a,b,t) => a + (b-a)*t;

export function makePenguin(T,{scale=1}={}) {
  const root=group(T,null,'Temperate coast penguin');
  root.scale.setScalar(scale);
  const trunk=group(T,root,'Penguin chest and back');
  const head=group(T,trunk,'Rounded penguin head',[0,.684,.012]);
  const sphere=new T.SphereGeometry(1,24,16);
  const small=new T.SphereGeometry(1,14,10);
  const coat=clay(T,'#ffffff',.78,true), slate=clay(T,'#485258',.77);
  const dark=clay(T,'#303a40',.71), ivory=clay(T,'#f2eada',.82);
  const warm=clay(T,'#ad7e68',.81), web=clay(T,'#987767',.82);
  const throat=clay(T,'#616261',.81), toe=clay(T,'#4b4945',.72);
  const pupil=clay(T,'#282529',.41), glint=clay(T,'#fff2d8',.58);
  const back=new T.Color('#3d454c'), edge=new T.Color('#6e7778');
  const bellyWhite=new T.Color('#f0e5ce'), white=new T.Color('#fff0d9');
  const headDark=new T.Color('#343a41'), nape=new T.Color('#5b6668');
  const grey=new T.Color('#6b6b68'), pale=new T.Color('#eee6d5'), color=new T.Color();

  // 胸腹白羽与黑背随同一个滚圆轮廓转动。
  const bodyRings=[
    [.090,-.045,.020,.034],[.127,-.048,.086,.080],[.156,-.043,.126,.115],
    [.204,-.039,.157,.158],[.275,-.028,.186,.190],[.328,-.022,.207,.221],
    [.384,-.020,.218,.236],[.444,-.017,.220,.241],[.504,-.013,.211,.239],
    [.552,-.017,.200,.237],[.600,-.023,.183,.217],[.642,-.021,.163,.188],
    [.680,-.011,.139,.155],[.722,-.011,.123,.123],[.762,-.006,.092,.089],
    [.792,-.005,.045,.049]
  ];
  const sculptedBody=closedShape(T,bodyRings.map(([y,z,rx,rz])=>[y,-z,rx,rz]),36,(x,depth,y)=>{
    const z=-depth;
    const front=s(z,.014,.066);
    const apron=front*s(y,.10,.19)*(1-s(y,.66,.735));
    const collar=s(y,.592+.15*x*x,.608+.15*x*x)*(1-s(y,.654,.669));
    const salt=1+.023*Math.sin(x*24+y*15)*Math.cos(y*22+z*13);
    color.copy(back).lerp(edge,.25+.28*s(z,-.18,.12)+.13*s(y,.22,.69));
    return color.lerp(bellyWhite,.97*apron).lerp(white,.34*apron*s(y,.26,.61))
      .lerp(grey,.86*collar*apron).multiplyScalar(salt);
  }).rotateX(-Math.PI/2);
  mesh(T,trunk,'Continuous black back and pale ventral feathers',sculptedBody,coat);
  const belly=group(T,trunk,'Leading breast contact',[0,.504,.226]);
  const rudder=mesh(T,trunk,'Short swept penguin tail',small,dark,[0,.155,-.190],[.096,.052,.147]);
  rudder.rotation.x=.48;

  const headVolume=paintSphere(T,(x,y,z)=>{
    const face=Math.max(0,1-Math.hypot((Math.abs(x)-.64)/.66,(y+.16)/.63)) * s(z,.08,.28);
    const cheek=s(face,.12,.26);
    color.copy(headDark).lerp(nape,.23+.35*s(z,-.38,.20)+.17*s(y,.12,.80));
    return color.lerp(pale,cheek*.96).multiplyScalar(.98+.025*Math.sin(z*13+x*7));
  },30,19);
  mesh(T,head,'Penguin charcoal hood with cheek stripe',headVolume,coat,[0,.096,.013],[.151,.141,.148]);
  mesh(T,head,'Short lower throat',sphere,ivory,[0,-.015,.088],[.109,.073,.072]);
  const upperBill=closedShape(T,[
    [.118,.040,.033,.034],[.145,.040,.041,.038],[.181,.041,.039,.032],
    [.219,.038,.031,.022],[.255,.029,.024,.014],[.282,.018,.014,.009],
    [.292,.012,.005,.004],
  ],16);
  mesh(T,head,'Tapered upper bill',upperBill,dark);
  const jaw=group(T,head,'Lower bill hinge',[0,.008,.136]);
  mesh(T,jaw,'Ochre-gray lower bill',closedShape(T,[
    [0,0,.030,.018],[.030,-.002,.035,.021],[.070,-.002,.029,.018],
    [.111,.001,.020,.011],[.144,.006,.011,.006],[.151,.006,.003,.002],
  ],16),throat);
  const bill=group(T,head,'Bill tip',[0,.014,.291]);
  const eyes=[];
  const flippers=[];
  const feet=[];
  const leggers=[];
  const fin=closedShape(T,[
    [0,0,.062,.025],[.035,.001,.068,.035],[.095,.000,.067,.035],
    [.168,-.012,.061,.032],[.233,-.028,.052,.029],[.290,-.041,.039,.023],
    [.337,-.056,.029,.017],[.370,-.068,.017,.012],[.386,-.078,.005,.005],
  ],18,(x,y,z)=>{
    const lower=s(y,.001,.027);
    return color.copy(headDark).lerp(nape,.38+.20*s(z,0,.33)).lerp(grey,lower*.53);
  }).rotateX(Math.PI/2);

  for (const side of [-1,1]) {
    const name=side<0?'Left':'Right';
    const eye=group(T,head,name+' penguin eye',[side*.098,.110,.101]);
    eye.rotation.y=side*.67;
    const opening=group(T,eye,name+' penguin eye aperture');
    mesh(T,opening,'Sienna penguin eye rim',small,warm,[0,0,.005],[.035,.032,.014]);
    mesh(T,opening,'Glossy penguin eye',small,pupil,[0,0,.016],[.026,.027,.016]);
    mesh(T,opening,'Eye catchlight',small,glint,[-.008,.008,.028],[.008,.008,.007]);
    const lid=tube(T,eye,name+' penguin eye closed lid',[
      [-.032,.003,.011],[-.016,-.004,.019],[0,-.009,.022],[.016,-.004,.019],[.032,.003,.011],
    ],.0042,pupil,7);
    lid.castShadow=false;
    eyes.push({opening,lid});

    const flipper=group(T,trunk,name+' penguin flipper',[side*.158,.600,-.013]);
    mesh(T,flipper,'Tapered flipper',fin,coat,undefined,[.57,1,1.73]);
    flippers.push({side,flipper});

    const foot=group(T,root,name+' webbed sole');
    mesh(T,foot,'Rounded webbed foot',sphere,web,[0,.027,.026],[.063,.027,.113]);
    for(const ray of [-1,0,1]){
      const spread=ray*.025;
      const digit=mesh(T,foot,'Webbed foot toe',small,warm,[spread,.021,.087-Math.abs(ray)*.009],
        [.025,.020,.062-.012*Math.abs(ray)]);
      digit.rotation.y=ray*.21;
      mesh(T,foot,'Short toe claw',small,toe,[spread*1.41,.018,.146-Math.abs(ray)*.030],
        [.013,.013,.023]).rotation.y=ray*.25;
    }
    const leg=mesh(T,root,name+' lower penguin leg',small,slate);
    feet.push(foot);
    leggers.push({side,foot,leg});
  }

  const offset=new T.Vector3(), rolledBelly=new T.Vector3();
  const hip=new T.Vector3(), join=new T.Vector3(), goal=new T.Vector3(), direction=new T.Vector3();
  const up=new T.Vector3(0,1,0);

  // 伏下时用胸腹曲面的最前点作支点，水线和斜坡都跟这个点对齐。
  function pose(state={}, time=state.time??0) {
    const {phase='land',progress=0,step=0,gait=0,prone=0,display=0,crouch=0,stand=0,
      land=0,look=0,call=0,pitch=0,y=0,groundY=y,leftGroundY=groundY,rightGroundY=groundY}=state;
    const paddle=state.paddle??state.swim??0;
    const sleepy=s(state.sleep??Number(state.asleep??false));
    const reply=phase==='land'?(state.acknowledge??0)*(1-sleepy):0;
    const attention=s(reply,.035,.83),facing=Math.sign(look);
    const bodyDisplay=Math.max(0,display-.55*reply);
    const low=s(prone);
    const lean=s(prone,.25,1);
    const wiggle=Math.cos(step)*gait*(1-low);
    const rest=(1-low)*(1-.50*bodyDisplay);
    const idle=Number(phase==='land')*(1-sleepy)*(1-bodyDisplay);
    const glance=Math.sin(time*1.72+(state.index??0)*1.9)*idle;
    const beat=Math.sin(time*13.6);
    const grounded=phase!=='swim' && phase!=='return';
    const strokeDepth=(state.surface===undefined?1:s(state.surface-groundY,.024,.137));
    const waterStroke=grounded?0:paddle*strokeDepth;
    const shoreLift=phase==='climb'?1:phase==='return'?s(progress,.56,1):0;
    trunk.rotation.set(
      low*Math.PI/2 + pitch*lean + .18*crouch*(1-low)+.058*land*(1-low),
      .024*Math.sin(time*2.5)*paddle*low,
      -.095*wiggle + beat*.031*paddle*low
    );
    rolledBelly.copy(belly.position).applyEuler(trunk.rotation);
    offset.set(-wiggle*.039,
      mix(belly.position.y-.104*crouch-.044*sleepy-.020*land,0,low) + Math.sin(time*3.1)*.004*rest,
      (1-low)*(belly.position.z+.019*crouch+.023*stand));
    trunk.position.copy(offset).sub(rolledBelly);
    trunk.updateMatrix();

    head.rotation.set(-(.79+.36*shoreLift)*low+.24*sleepy-.112*call+Math.sin(time*2.3)*.017*rest+.11*attention,
      (.42+.22*attention)*look*(1-.72*low)+.14*attention*facing+.13*glance*(1-attention),
      -(.042+.057*attention)*look+.043*sleepy-.052*glance*(1-attention));
    jaw.rotation.x=.72*call*(1-sleepy)*(1-.78*low);
    rudder.rotation.x=.48+low*.25 + beat*.13*paddle;
    for(const {opening,lid} of eyes) {
      const open=blink(time,4.73)*(1-sleepy);
      opening.visible=sleepy<.90 && open>.10;
      opening.scale.y=Math.max(.12,open);
      lid.visible=sleepy>.35 || open<=.10;
    }

    const spread=Math.max(display*(1-.68*reply),low*.76,crouch*.38,land*.30)*(1-.75*sleepy);
    for (const {side,flipper} of flippers) {
      const stroke=Math.sin(time*11.6 + (side>0?.48:0));
      // 朝回岸同伴的一侧张开鳍，随着应答结束慢慢收回。
      const greet=attention*(facing===side?.72:.09);
      flipper.rotation.set(mix(.20+low*.31,-.72+.80*stroke,waterStroke),
        side*(-.21+display*.29+waterStroke*.16*stroke),
        side*(.12+spread*1.03+greet+.16*waterStroke*(1+stroke)+.058*idle*Math.max(0,Math.sin(time*2.1+side))));
    }

    for (const [i,{side,foot,leg}] of leggers.entries()) {
      const clock=step+(side>0?Math.PI:0);
      const swing=gait*Math.max(0,-Math.sin(clock));
      const floor=((i===0?leftGroundY:rightGroundY)-y)/root.scale.y;
      const slope=(i===0?state.leftFootPitch:state.rightFootPitch)??pitch;
      const z=.042 + .112*gait*Math.cos(clock);
      const kick=Math.sin(time*14.7 + i*1.61)*paddle;
      goal.set(side*(.105+.013*paddle),.124+.031*kick,.028+.038*kick).applyMatrix4(trunk.matrix);
      goal.y=mix(goal.y,.047+.046*kick,waterStroke);
      foot.position.set(side*.103,floor + .055*swing,z).lerp(goal,lean);
      const footPitch=mix(slope-swing*.29,mix(Math.PI*.48+.19*kick,.24+.37*kick,waterStroke),lean);
      if(grounded && lean>0){
        const floorAtSole=floor+(z-foot.position.z)*Math.tan(slope);
        const toeClearance=Math.max(0,.171*Math.sin(footPitch-slope)-.004);
        foot.position.y=Math.max(floorAtSole+toeClearance,foot.position.y);
      }
      foot.rotation.set(footPitch,side*(.16+.12*lean)+Math.PI*waterStroke*lean,side*.044*crouch);
      hip.set(side*.105,.208,-.016).applyMatrix4(trunk.matrix);
      join.set(0,.043,-.037).applyEuler(foot.rotation).add(foot.position);
      direction.subVectors(join,hip);
      leg.position.copy(hip).lerp(join,.53);
      leg.scale.set(.034,direction.length()*.55+.027,.035);
      leg.quaternion.setFromUnitVectors(up,direction.normalize());
    }
  }

  pose();
  return {root,pose,belly,feet,bill,flippers:flippers.map(part=>part.flipper)};
}
