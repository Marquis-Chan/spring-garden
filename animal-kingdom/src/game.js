import * as T from 'three';
import {groundHeight,makeDiorama} from './diorama.js';
import {makeFrog,makeFish} from './animals.js';
import {bounds,sites,clamp,ease,mix,createPond} from './state.js';
import {makeRabbit,makeBird} from './grove-actors.js';
import {makeGroveDiorama} from './grove-diorama.js';
import {createGrove,grovePoints} from './grove-state.js';
import {createOrchard,orchardPoints} from './orchard-state.js';
import {makeOrchardDiorama} from './orchard-diorama.js';
import {makeCorgi,makeCat,makeButterfly,makeBee} from './orchard-actors.js';
import {createOrchardRabbits,rabbitCoats} from './orchard-rabbits.js';
import {createSavanna,savannaPoints} from './savanna-state.js';
import {makeSavannaDiorama} from './savanna-diorama.js';
import {makeElephant,makeGiraffe,makeZebra,makeLion} from './savanna-actors.js';
import {createRiver,riverPoints} from './river-state.js';
import {makeRiverDiorama} from './river-diorama.js';
import {makeHippo,makeTurtle} from './river-actors.js';
import {makeRhino} from './river-rhino.js';
import {createWoodland,woodlandPoints} from './woodland-state.js';
import {makeWoodlandDiorama} from './woodland-diorama.js';
import {makeFox} from './woodland-fox.js';
import {makeSquirrel,makeWoodpecker} from './woodland-actors.js';
import {asiaPoints,createAsia} from './asia-state.js';
import {makeAsiaDiorama} from './asia-diorama.js';
import {makeMoonBear,makeScopsOwl} from './asia-bear-owl.js';
import {makePeacock,makeTiger} from './asia-actors.js';
import {createRainforest,rainPoints} from './rainforest-state.js';
import {makeRainforestDiorama} from './rainforest-diorama.js';
import {makeMonkey,makeSloth} from './rainforest-actors.js';
import {makeToucan} from './rainforest-toucan.js';
import {coastGroundHeight,coastPoints,coastWaterY,createCoast} from './coast-state.js';
import {makePenguin} from './coast-actors.js';
import {isCoastWater,makeCoastDiorama,rampPoint,shoreStone} from './coast-diorama.js';
import {createOcean,oceanPoints} from './ocean-state.js';
import {makeOceanDiorama} from './ocean-diorama.js';
import {makePondNeighbors} from './pond-neighbors.js';
import {makeDuckling,makeTadpole} from './pond-young-actors.js';
import {createPondYoung} from './pond-young-state.js';
import {createSkyFlight} from './sky-flight.js';
import {makeInteractionOutline} from './interaction-outline.js';
import {sceneCue} from './scene-cues.js';
import {makeWorldLandscape} from './world-landscape.js';
import {createCroc,makeCrocView} from './croc.js';
import {createMacaw,makeMacawDiorama} from './macaw.js';
import {createEucalyptus,makeEucalyptusDiorama} from './eucalyptus.js';
import {bambooKinds,createBamboo,makeBambooDiorama} from './bamboo.js';
import {createIce,icePoints,makeIceDiorama} from './ice.js';
import {atlasNeighborhood,atlasWaymarks,blendView,dragAtlas,habitats,nearestHabitat,panView,placeCamera,viewFor} from './map-view.js';

const $=id=>document.getElementById(id);
const root=$('pond'),canvas=$('stage'),cloud=$('cloud'),sun=$('sun'),sound=$('sound');
const quiet=matchMedia('(prefers-reduced-motion: reduce)');

function bindButton(button,activate){
 let touch=null,lastTouch=-Infinity;
 button.addEventListener('pointerdown',ev=>{
  if(ev.pointerType==='touch'&&!touch)touch={id:ev.pointerId,x:ev.clientX,y:ev.clientY};
 });
 button.addEventListener('pointercancel',ev=>{if(touch?.id===ev.pointerId)touch=null;});
 button.addEventListener('pointerup',ev=>{
  if(touch?.id!==ev.pointerId)return;
  const start=touch;touch=null;
  const r=button.getBoundingClientRect(),x=ev.clientX,y=ev.clientY;
  if(button.disabled||Math.hypot(x-start.x,y-start.y)>15||x<r.left||x>r.right||y<r.top||y>r.bottom)return;
  // 连续拖云与点按时，触摸浏览器有时只发 pointerup，不发合成 click。
  lastTouch=performance.now();activate();
 });
 button.addEventListener('click',ev=>{
  if(ev.pointerType==='touch'||ev.sourceCapabilities?.firesTouchEvents)return;
  if(!ev.pointerType&&ev.detail>0&&performance.now()-lastTouch<480)return;
  activate();
 });
}

function audioPlayer(){
 let context,source,gain,muted=false,started=0;
 const buffers={},starts=Object.fromEntries(Object.keys(window.POND_AUDIO).map(name=>[name,0]));
 const Context=window.AudioContext||window.webkitAudioContext;
 function fadeSource(){
  if(!source)return;
  const now=context.currentTime,current=source;
  source=null;
  current.volume.gain.setTargetAtTime(0,now,.02);
  current.node.stop(now+.09);
 }
 return {
  wake(){
   if(!Context)return;
   if(!context){
    context=new Context();
    gain=context.createGain();gain.gain.value=muted?0:.57;gain.connect(context.destination);
    for(const [name,encoded] of Object.entries(window.POND_AUDIO)){
     const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
     const wave=new DataView(bytes.buffer);
     const buffer=context.createBuffer(1,(bytes.length-44)/2,wave.getUint32(24,true));
     const track=buffer.getChannelData(0);
     for(let i=0;i<track.length;i++)track[i]=wave.getInt16(44+i*2,true)/32768;
     buffers[name]=buffer;
    }
   }
   if(context.state==='suspended')context.resume().catch(()=>{});
  },
  play(name='frog'){
   const buffer=buffers[name];
   if(name==='gum-grass'&&source)return;
   // 角鸮会先叫完一组再离枝，期间仍可操作其他动物。
   if(!buffer||muted||source?.name===name||source?.name==='owl'||(name==='duckling'&&source?.name==='frog'))return;
   fadeSource();
   const node=context.createBufferSource(),volume=context.createGain();
   node.buffer=buffer;node.connect(volume);volume.connect(gain);
   node.onended=()=>{node.disconnect();volume.disconnect();if(source?.node===node)source=null;};
   source={name,node,volume,since:context.currentTime};started++;starts[name]++;node.start();return true;
  },
  clock(){return context?.currentTime??performance.now()/1000;},
  duration(name){return buffers[name]?.duration||0;},
  // 用当前正在播放的实录控制张喙，叫声之间的空隙会自然合嘴。
  voiceLevel(name){
   if(muted||source?.name!==name)return 0;
   const buffer=buffers[name],samples=buffer.getChannelData(0);
   const start=Math.floor((context.currentTime-source.since)*buffer.sampleRate);
   const span=Math.min(Math.floor(buffer.sampleRate*.034),samples.length-start);
   if(span<1)return 0;
   let sum=0,count=0;
   for(let i=0;i<span;i+=8){const value=samples[start+i];sum+=value*value;count++;}
   return Math.min(1,Math.sqrt(sum/count)*6.8);
  },
  stop(name){if(source?.name===name)fadeSource();},
  toggle(){
   muted=!muted;
   if(context)gain.gain.setTargetAtTime(muted?0:.57,context.currentTime,.035);
   return muted;
  },
  inspect(){return {muted,started,starts:{...starts},state:context?.state||'waiting',duration:buffers.frog?.duration||0,
   ducklingDuration:buffers.duckling?.duration||0,playing:source?.name??null};}
 };
}
function setup(renderer){
 const scene=new T.Scene();
 const camera=new T.OrthographicCamera(-7,7,4,-4,.1,55);
 const sky=new T.HemisphereLight('#f8ebc8','#679278',2.21);
 const key=new T.DirectionalLight('#ffedca',3.05);
 key.castShadow=true;
 Object.assign(key.shadow.camera,{left:-12,right:12,top:8,bottom:-8,near:.5,far:30});
 key.target.position.set(4.8,0,0);key.position.set(1.5,11.4,4.2);
 key.shadow.mapSize.set(1536,1536);key.shadow.bias=-.00019;key.shadow.normalBias=.033;key.shadow.radius=3;
 scene.add(sky,key,key.target);
 const fill=new T.DirectionalLight('#bddeef',.61);fill.position.set(5,3,-4);scene.add(fill);
 const diorama=makeDiorama(scene);
 const landscape=makeWorldLandscape(scene);
 const iceView=makeIceDiorama(scene);
 const crocView=makeCrocView(scene),macawView=makeMacawDiorama(scene,groundHeight);
 const gumView=makeEucalyptusDiorama(scene);
 const gumKinds=['koala','silvereye','gum-leaves','gum-bough','wallaby','wallaby-grass','hedgehog-den','hedgehog'];
 const bambooView=makeBambooDiorama(scene);
 const forest=makeGroveDiorama(scene,grovePoints);
 const garden=makeOrchardDiorama(scene,orchardPoints);
 const grassland=makeSavannaDiorama(scene,savannaPoints);
 const bank=makeRiverDiorama(scene,riverPoints,groundHeight);
 const timber=makeWoodlandDiorama(scene,woodlandPoints,groundHeight);
 const thicket=makeAsiaDiorama(scene,asiaPoints,groundHeight);
 const canopy=makeRainforestDiorama(scene,rainPoints,groundHeight);
 const coastView=makeCoastDiorama(scene);
 const oceanView=makeOceanDiorama(scene);
 const frog=makeFrog(T),fish=makeFish(T);
 const pondNeighbors=makePondNeighbors(T,makeFish);
 const ducklings=[makeDuckling(T,{scale:1.01,adult:true,feather:'#aa855c'}),makeDuckling(T,{scale:.86,feather:'#f5d77a'})];
 const tadpoles=['#47483d','#665840','#53503e','#61553f'].map((tint,index)=>makeTadpole(T,{tint,scale:1-index*.045}));
 const rabbit=makeRabbit(T),bird=makeBird(T);
 const dog=makeCorgi(T),cat=makeCat(T),butterfly=makeButterfly(T);
 const orchardRabbits=rabbitCoats.map(coat=>makeRabbit(T,coat));
 const bees=orchardPoints.beeFlowers.map(()=>makeBee(T));
 const elephant=makeElephant(T),giraffe=makeGiraffe(T),zebra=makeZebra(T),lion=makeLion(T);
 const largeAnimals={elephant,giraffe,zebra,lion};
 const hippo=makeHippo(T,groundHeight),turtle=makeTurtle(T,bank.stoneTopAt),rhino=makeRhino(T,groundHeight);
 const bankBird=makeBird(T);
 bankBird.root.scale.setScalar(.73);
 const birdPerches={rhino:new T.Vector3(),hippo:new T.Vector3(),branch:{...riverPoints.birdPerch,yaw:.20}};
 const riverDucks=[makeDuckling(T,{scale:.92,adult:true,feather:'#aa855c'}),makeDuckling(T,{scale:.77,feather:'#f8d999'})];
 const riverAnimals={hippo,turtle,rhino};
 const fox=makeFox(T,groundHeight),squirrel=makeSquirrel(T),pecker=makeWoodpecker(T);
 const woodlandAnimals={fox,squirrel,pecker};
 const bear=makeMoonBear(T,groundHeight),owl=makeScopsOwl(T,thicket.owlTopAt),tiger=makeTiger(T),peacock=makePeacock(T);
 const asiaAnimals={bear,owl,tiger,peacock};
 const monkey=makeMonkey(T,{perchTopAt:canopy.monkeyTopAt}),sloth=makeSloth(T),toucan=makeToucan(T,canopy.toucanTopAt);
 const groundMonkey=makeMonkey(T,{ground:true,scale:.87});
 const rainforestAnimals={monkey,sloth,toucan,groundMonkey};
 const riverFish=riverPoints.fish.map((_,i)=>{
  const actor=makeFish(T),size=i===0?.63:.52;
  // 浅水鱼在河床和水面之间留出鳍的空间。
  actor.root.scale.set(size,i===0?.30:.29,size);
  const materials=new Set();
  actor.root.traverse(part=>{
   if(!part.isMesh)return;
   materials.add(part.material);
   part.renderOrder=1;
   part.castShadow=false;
  });
  for(const material of materials)material.transparent=true;
  actor.waterMaterials=materials;
  return actor;
 });
 const penguins=[makePenguin(T),makePenguin(T,{scale:.94,speckled:true})];
 const coastFish=[makeFish(T),makeFish(T)];
 coastFish.forEach((fish,i)=>fish.root.scale.set(i===0?.69:.54,.25,i===0?.69:.54));
 const nozzlePosition=new T.Vector3(),mouthPosition=new T.Vector3(),billPosition=new T.Vector3(),fanPosition=new T.Vector3();
 const toothPosition=new T.Vector3();
 scene.add(frog.root,fish.root,rabbit.root,bird.root,dog.root,cat.root,butterfly.root,...bees.map(bee=>bee.root),
  elephant.root,giraffe.root,zebra.root,lion.root,hippo.root,turtle.root,rhino.root,bankBird.root,...riverFish.map(f=>f.root),...riverDucks.map(d=>d.root),
  fox.root,squirrel.root,pecker.root,bear.root,owl.root,tiger.root,peacock.root,monkey.root,sloth.root,toucan.root,
  ...penguins.map(p=>p.root),...coastFish.map(f=>f.root),groundMonkey.root,...pondNeighbors.map(f=>f.root),
  ...ducklings.map(actor=>actor.root),...tadpoles.map(actor=>actor.root),...orchardRabbits.map(actor=>actor.root));
 const outlines=makeInteractionOutline(renderer,scene);
 const modelRoots=actors=>actors.map(actor=>actor.root);
 const soloHints={
  ...gumView.hintNodes,...bambooView.hintNodes,croc:crocView.hintNode,macaw:macawView.bird,
  frog:frog.root,fish:fish.root,rabbit:rabbit.root,bird:bird.root,dog:dog.root,cat:cat.root,
  'ice-cave':iceView.hintNodes.cave,'polar-bear':iceView.hintNodes.bear,
  elephant:elephant.root,giraffe:giraffe.root,zebra:zebra.root,lion:lion.root,
  hippo:hippo.root,turtle:turtle.root,rhino:rhino.root,fox:fox.root,squirrel:squirrel.root,pecker:pecker.root,
  bear:bear.root,tiger:tiger.root,owl:owl.root,peacock:peacock.root,'peacock-fan':peacock.fanSurface,
  monkey:monkey.root,'ground-monkey':groundMonkey.root,sloth:sloth.root,toucan:toucan.root,
  basket:garden.hintNodes.basket,'savanna-rock':grassland.hintNodes.rock,'lion-grass':grassland.hintNodes.lionGrass,
  'squirrel-perch':timber.hintNodes.perch,
  'bear-leaf':thicket.hintNodes.leaf,'tiger-tuft':thicket.hintNodes.tuft,'shared-fruit':thicket.hintNodes.sharedFruit,
  'peacock-seeds':thicket.hintNodes.seedStone,'sloth-leaf':canopy.hintNodes.leaf,
  'sloth-bough':canopy.hintNodes.slothBough,'toucan-berry':canopy.hintNodes.berry,
  'rabbit-carrot':garden.hintNodes.carrot,'hippo-brush':bank.hintNodes.toothbrush,'river-bird':bankBird.root,
  'drop-banana':canopy.hintNodes.dropBanana,'ocean-visitor':oceanView.hintNodes.visitor
 };
 const indexedHints={
  'ice-fish':iceView.hintNodes.fish,
  site:diorama.hintNodes.sites,grass:forest.hintNodes.grass,wood:timber.hintNodes.wood,
  litter:timber.hintNodes.litter,'squirrel-root':timber.hintNodes.roots,apple:garden.hintNodes.apple,
  bough:grassland.hintNodes.bough,'savanna-flower':grassland.hintNodes.flower,
  'river-stone':bank.hintNodes.stones,'river-grass':bank.hintNodes.grass,'river-fish':modelRoots(riverFish),'river-duck':modelRoots(riverDucks),
  'asia-fruit':thicket.hintNodes.fruits,banana:canopy.hintNodes.bananas,'monkey-bough':canopy.hintNodes.monkeyBoughs,
  penguin:modelRoots(penguins),'coast-fish':modelRoots(coastFish),'coast-ramp':coastView.hintNodes.ramps,
  'coast-stone':coastView.hintNodes.stones,'pond-neighbor':modelRoots(pondNeighbors),
  duckling:modelRoots(ducklings),tadpole:modelRoots(tadpoles),'orchard-rabbit':modelRoots(orchardRabbits),
  'ocean-animal':Object.fromEntries(Object.entries(oceanView.actors).map(([name,actor])=>[name,actor.root])),
  'ocean-prop':oceanView.hintNodes
 };
 const beeHints=modelRoots(bees);
 const marks=Object.fromEntries(Object.keys(habitats).map(name=>[name,$('enter-'+name)]));
 const mapButton=$('overview');
 const atlasMarks=$('atlas-waymarks');
 const pins=Object.entries(marks).map(([name,mark])=>{
  const button=document.createElement('button'),icon=document.createElement('span');
  button.type='button';
  button.id='atlas-'+name;
  button.className='atlas-waymark';
  button.hidden=true;
  button.setAttribute('aria-label',mark.getAttribute('aria-label'));
  icon.append(mark.firstElementChild.cloneNode(true));
  button.append(icon);
  atlasMarks.append(button);
  button.addEventListener('pointerdown',ev=>beginPlay(ev,button));
  // 鼠标和触屏共用地图拖动判定，键盘和辅助技术可以直接开启近景。
  button.addEventListener('click',ev=>{if(ev.detail===0)openView(name);});
  return {button,name,anchor:atlasWaymarks[name]};
 });
 const pool=[
  ['--sky-a','#b7d8d0','#152741'],['--sky-b','#f7edbd','#4d626c'],
  ['--hill-far','#a6bf93','#3d5a60'],['--hill-near','#b3c88e','#365358']
 ].map(([id,a,b])=>[id,new T.Color(a),new T.Color(b)]);
 const daylightKey=new T.Color('#ffedca'),moonKey=new T.Color('#a8c7ff');
 const daylightSky=new T.Color('#f8ebc8'),moonSky=new T.Color('#94b6dd'),tint=new T.Color();
 const audio=audioPlayer();
 let duckVoiceScene=null;
 function quack(scene){
  if(audio.play('duckling'))duckVoiceScene=scene;
 }
 const starLayout=[[17,8,9],[24,17,6],[34,6,8],[41,18,9],[53,7,6],[62,15,9],[71,5,7],[74,16,6],[94,17,8],[10,19,7],[52,20,5],[5,10,7]];
 for(const [i,[x,y,s]] of starLayout.entries()){
  const star=document.createElement('i');star.className='star';
  Object.assign(star.style,{left:x+'%',top:y+'%',width:s+'px',height:s+'px',animationDelay:-i*.38+'s',animationDuration:1.5+i%5*.36+'s'});
  $('stars').append(star);
 }
 const notes=$('access-status'),sleepMark=$('sleep-mark'),events=[],groveEvents=[],orchardEvents=[],savannaEvents=[],riverEvents=[],woodlandEvents=[],asiaEvents=[],rainforestEvents=[];
 const coastEvents=[];
 const cloudShape=$('cloud-body'),sunArt=$('sun-art'),skyOccluders=[];
 const skyFlight=createSkyFlight(),skyBirds=$('sky-birds');
 const flyingBirds=[...skyBirds.querySelectorAll('.sky-bird')].map(body=>({body,far:body.firstElementChild,near:body.lastElementChild}));
 scene.traverse(object=>{
  if(object.isMesh&&!object.material.transparent)skyOccluders.push(object);
 });
 let lastActive=1,padAt=-100,night=0,nightGoal=0,nightVisits=0,shade=0,cover=0,cloudX=.52,cloudY=.104,pin=false,cloudHand=null;
 let brushAt=-100,brushX=-99,brushY=-99;
 let hoverPoint=null,cursor='default',leafGlow=0,minCloudX=.06,minCloudY=0;
 let width=1,height=1,playTop=0,playHeight=1,pointer=null,frames=0,ready=false,lastFrame=performance.now();
 let mode='overview',rig=null,travel=null,panX=0,panY=0,gesture=null,hintCount=0,hintIdleAt=0,hintCue=null;
 let atlasPosition=null,atlasVisible=[],atlasFocus='pond';
 function refreshAtlas(){
  atlasVisible=atlasNeighborhood(rig,width/playHeight);
  atlasFocus=nearestHabitat(rig);
 }
 function onStage(name){
  return mode===name||travel?.fromMode===name||
   ((mode==='overview'||travel?.fromMode==='overview')&&atlasVisible.includes(name));
 }
 const pondSwimmerKinds=new Set(['fish','pond-neighbor','duckling','tadpole']);
 let sleepAt=-Infinity,sleeper='bird';
 const pondWaves=[];
 function rememberPondEvent(event){
  events.push({...event,time:pond.time});
  if(events.length>45)events.shift();
 }
 function pondRipple(x,z,strength,affectNeighbors=false){
  diorama.ripple(x,z,pond.time,strength);
  if(!affectNeighbors)return;
  pondWaves.push({x,z,strength,time:pond.time,seen:new Set()});
  if(pondWaves.length>10)pondWaves.shift();
 }
 function movePondNeighbors(){
  while(pondWaves.length&&pond.time-pondWaves[0].time>1.06)pondWaves.shift();
  pondNeighbors.forEach((neighbor,index)=>{
   neighbor.root.visible=onStage('pond');
   if(!neighbor.root.visible)return;
   neighbor.place(pond.time);
   for(const wave of pondWaves){
    const age=pond.time-wave.time;
    // 用画面中正在扩大的第一道水纹来判定鱼感受到的时刻。
    const radius=.10+age*(.60+.24*wave.strength);
    const distance=Math.hypot(wave.x-neighbor.resident.x,wave.z-neighbor.resident.z);
    if(age<.09||wave.seen.has(index)||distance>radius+.035)continue;
    wave.seen.add(index);
    if(neighbor.touch(pond.time,wave))rememberPondEvent({type:'neighbor-ripple',index,
     waveAt:wave.time,x:wave.x,z:wave.z,radius,distance});
   }
  });
 }
 const pond=createPond(event=>{
  rememberPondEvent(event);
  if(event.type==='call'){
   if(event.audible)audio.play();
   notes.textContent='青蛙呱呱叫';
  }
  if(event.type==='ripple')pondRipple(event.x,event.z,event.strength,true);
  if(event.type==='greet')pondRipple(event.x,event.z,1,true);
  if(event.type==='ready'||event.type==='land'||event.type==='leaf-touch'){
   lastActive=event.site;padAt=pond.time;
   pondRipple(event.x,event.z,event.type==='land'?1.13:.72,event.type==='land');
   if(event.type==='land'&&event.site===1&&!quiet.matches)diorama.splash(event.x,event.z,pond.time);
  }
  if(event.type==='routine-land'&&event.site===1){
   lastActive=event.site;padAt=pond.time;
   pondRipple(event.x,event.z,.56);
  }
 });
 const pondYoung=createPondYoung(event=>{
  rememberPondEvent(event);
  if(event.type==='duck-call')quack('pond');
  if(event.type==='duck-ripple')pondRipple(event.x,event.z,event.strength);
  if(event.type==='tadpole-scatter'&&event.cause==='tap')pondRipple(event.x,event.z,.64);
  if(event.type==='tadpoles-met'){
   pond.noticeTadpoles(event);
   pondRipple(event.x,event.z,.37);
  }
  if(event.type==='sleep'){
   sleepAt=pond.time;sleeper='duckling-'+event.index;notes.textContent='小鸭在水边睡着了';
  }
 });
 const grove=createGrove(event=>{
  groveEvents.push({...event,time:grove.time});
  if(groveEvents.length>48)groveEvents.shift();
  forest.react(event,grove.time);
  if(event.type==='flight'&&event.phase==='start'&&!['night','routine'].includes(event.reason)){
   audio.play('bird');notes.textContent='小鸟飞起来了';
  }
  if(event.type==='sleep'){
   sleepAt=grove.time;sleeper='bird';notes.textContent='小鸟在树枝上睡着了';
  }
  if(event.type==='hop'&&event.phase==='start'&&!event.routine)notes.textContent='兔子跳起来了';
 });
 const orchard=createOrchard(event=>{
  orchardEvents.push({...event,time:orchard.time});
  if(orchardEvents.length>55)orchardEvents.shift();
  garden.react(event,orchard.time);
  if(event.type==='dog-call')audio.play('dog');
  if(event.type==='cat-call')audio.play('cat');
  if(event.type==='bee-flight'&&!nightGoal)audio.play('bee');
  if(event.type==='sleep'){
   sleepAt=pond.time;sleeper=event.animal;
   notes.textContent={dog:'小狗睡着了',cat:'猫睡着了',butterfly:'蝴蝶在花上休息',hive:'蜜蜂在巢里睡觉'}[sleeper];
  }
  if(event.type==='apple-basket')notes.textContent='苹果进篮子了';
 });
 const family=createOrchardRabbits(event=>{
  orchardEvents.push({...event,time:family.time});
  if(orchardEvents.length>55)orchardEvents.shift();
  garden.react(event,family.time);
  if(event.type==='sleep'){
   sleepAt=pond.time;sleeper='orchard-rabbit-'+event.index;notes.textContent='果园里的小兔睡着了';
  }
  if(event.type==='rabbit-hop'&&event.phase==='start'&&!event.routine)notes.textContent='果园里的小兔跳起来了';
  if(event.type==='carrot-eat')notes.textContent='小兔吃到了胡萝卜，另一只凑近来看';
 },{groundAt:groundHeight});
 const savanna=createSavanna(event=>{
  savannaEvents.push({...event,time:savanna.time});
  if(savannaEvents.length>68)savannaEvents.shift();
  grassland.react(event,savanna.time);
  if(event.type.endsWith('-call'))audio.play(event.type.slice(0,-5));
  if(event.type==='sleep'){sleepAt=pond.time;sleeper='zebra';notes.textContent='斑马在草地上睡着了';}
  if(event.type==='water-hit')notes.textContent='大象浇到花了';
  if(event.type==='leaf-bite')notes.textContent='长颈鹿吃到嫩叶了';
 });
 const river=createRiver(event=>{
  riverEvents.push({...event,time:river.time});
  if(riverEvents.length>80)riverEvents.shift();
  if(event.type==='duckling-call')quack('river');
  else if(event.type.endsWith('-call'))audio.play(event.type.slice(0,-5));
  if(event.type==='sleep'){
   sleepAt=pond.time;
   sleeper=event.animal==='river-duck'?'river-duck-'+event.index:event.animal;
   notes.textContent=event.animal==='river-bird'?'小鸟在枝上睡着了':event.animal==='river-duck'?'小鸭在浅水里睡着了':'乌龟在岸边睡着了';
  }
  if(event.type==='wave')notes.textContent='河马推开一道水波';
  if(event.type==='hippo-brush-ready')notes.textContent='河马张开嘴了，移动鼠标帮它刷牙，再点一下放回牙刷';
  if(event.type==='grass-fish-look')bank.splash(event.originX,event.originZ,river.time);
  if(event.type==='river-duck-ripple')bank.splash(event.x,event.z,river.time);
 },{groundAt:groundHeight});
 const woodland=createWoodland(event=>{
  woodlandEvents.push({...event,time:woodland.time});
  if(woodlandEvents.length>80)woodlandEvents.shift();
  timber.react(event,woodland.time);
  if(event.type==='squirrel-rustle')grove.listenNear(event);
  if(event.type==='fox-call'||event.type==='squirrel-call')audio.play(event.type.slice(0,-5));
  if(event.type==='peck-hit'&&event.beat===1){audio.play('woodpecker');notes.textContent='啄木鸟敲在树干上';}
  if(event.type==='sleep'){
   sleepAt=pond.time;sleeper=event.animal;
   notes.textContent=event.animal==='squirrel'?'松鼠睡着了':'啄木鸟睡着了';
  }
 },{groundAt:groundHeight});
 const asia=createAsia(event=>{
  asiaEvents.push({...event,time:asia.time});
  if(asiaEvents.length>90)asiaEvents.shift();
  if(event.type.endsWith('-call'))audio.play(event.type.slice(0,-5));
  if(event.type==='owl-quiet')audio.stop('owl');
  if(event.type==='sleep'){
   sleepAt=pond.time;sleeper=event.animal;notes.textContent=event.animal==='owl'?'猫头鹰在睡觉':'孔雀在枝上睡觉';
  }
 },{groundAt:groundHeight,owlCallDuration:3.06});
 const croc=createCroc(event=>{
  riverEvents.push({...event,time:river.time});
  if(riverEvents.length>80)riverEvents.shift();
  if(event.type==='croc-call')audio.play('croc');
  if(event.type==='croc-splash'){
   bank.splash(event.x,event.z,river.time);river.tapWater(event.x,event.z);
  }
 });
 const gumEvents=[];
 const gum=createEucalyptus(event=>{
  gumEvents.push({...event,time:gum.time});
  if(gumEvents.length>60)gumEvents.shift();
  if(event.type==='hedgehog-emerge')audio.play('hedgehog');
  if(event.type==='wallaby-graze')audio.play('gum-grass');
  if(event.type.endsWith('-call'))audio.play(event.type.slice(0,-5));
  if(event.type.endsWith('-sleep')){
   sleepAt=pond.time;sleeper=event.type.slice(0,-6);notes.textContent='它正在桉树上休息';
   if(sleeper==='hedgehog-den')notes.textContent='刺猬在落叶窝里睡觉';
  }
 });
 const bambooEvents=[];
 const bamboo=createBamboo(event=>{
  bambooEvents.push({...event,time:pond.time});
  if(bambooEvents.length>75)bambooEvents.shift();
  if(event.type==='panda-call')audio.play('panda');
  if(event.type==='panda-sleep'){
   sleepAt=pond.time;sleeper=event.animal;notes.textContent='大熊猫正在竹林里休息';
  }
 });
 const macaw=createMacaw(event=>{
  rainforestEvents.push({...event,time:rainforest.time});
  if(rainforestEvents.length>90)rainforestEvents.shift();
  if(event.type==='macaw-call')audio.play('macaw');
  if(event.type==='macaw-invite-toucan')rainforest.answerMacaw(event,(audio.duration('macaw')||3.14)+.72);
  if(event.type==='sleep'){sleepAt=pond.time;sleeper='macaw';notes.textContent='金刚鹦鹉在枝上睡觉';}
 });
 const rainforest=createRainforest(event=>{
  if(event.type==='drop-banana-drop')macaw.onBananaDrop();
  rainforestEvents.push({...event,time:rainforest.time});
  if(rainforestEvents.length>90)rainforestEvents.shift();
  if(event.type.endsWith('-call'))audio.play(event.type.slice(0,-5));
  if(event.type==='berry-pick')notes.textContent=event.animal==='sloth'?'树懒接到了果实':'巨嘴鸟叼到了果实';
  if(event.type==='sleep'){
   sleepAt=pond.time;sleeper=event.animal;
   notes.textContent={sloth:'树懒在歇息',toucan:'巨嘴鸟在枝上睡着了',monkey:'猴子睡着了','ground-monkey':'猴子睡着了'}[sleeper];
  }
 },{groundAt:groundHeight,soundClock:audio.clock});
 const coast=createCoast(event=>{
  coastEvents.push({...event,time:coast.time});
  if(coastEvents.length>90)coastEvents.shift();
  if(event.type==='penguin-call')audio.play('penguin');
  if(event.type==='water-entry')notes.textContent='企鹅滑进水里了';
  if(event.type==='ripple')coastView.ripple(event.x,event.z,coast.time);
  if(event.type==='sleep'){
   sleepAt=pond.time;sleeper='penguin-'+event.index;notes.textContent='企鹅在岸上睡着了';
  }
 });
 const iceEvents=[];
 const ice=createIce(event=>{
  iceEvents.push({...event,time:ice.time});
  if(iceEvents.length>40)iceEvents.shift();
  if(event.type==='polar-bear-call')audio.play('polar-bear');
 });
 const oceanEvents=[];
 const ocean=createOcean(event=>{
  oceanEvents.push({...event,time:ocean.time});
  if(oceanEvents.length>60)oceanEvents.shift();
  if(event.type==='ocean-whale')audio.play('whale');
  if(event.type==='ocean-dolphin'&&event.reason==='tap')audio.play('dolphin');
 });
 const ray=new T.Raycaster(), plane=new T.Plane(new T.Vector3(0,1,0),-.012);
 const riverPlane=new T.Plane(new T.Vector3(0,1,0),-riverPoints.waterY);
 const coastPlane=new T.Plane(new T.Vector3(0,1,0),-coastWaterY);
 const hit=new T.Vector3(), projected=new T.Vector3(), mouse=new T.Vector2();
 function pannedView(){
  const base=viewFor(mode,width/playHeight);
  if(mode==='overview')return {...base,...atlasPosition};
  return panView(base,panX,panY,width,playHeight,false);
 }
 function resize(){
  const r=canvas.getBoundingClientRect(),habitat=$('habitat').getBoundingClientRect();
  width=r.width;height=habitat.height;playTop=r.top-habitat.top;playHeight=r.height;
  if(width<1||playHeight<1)return;
  const lightBox=sun.getBoundingClientRect();
  const cloudHeight=cloud.offsetHeight;
  minCloudX=Math.max(.06,(sound.getBoundingClientRect().right-r.left+12)/width);
  minCloudY=cloudHeight*.46/height;
  if(!cloudHand){
   if(pin)setCloud(cloudX,cloudY);
   else cloudY=(lightBox.top-habitat.top+lightBox.height/2-cloudHeight*.06)/height;
  }
  const ratio=width/playHeight;
  if(travel)travel.to=pannedView();
  else rig=pannedView();
  placeCamera(camera,rig,ratio);
  refreshAtlas();
  updateMapButtons();
  if(ready&&!travel)settleViewCloud();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(width,playHeight,false);
  outlines.resize(width,playHeight);
 }
 const observer=new ResizeObserver(resize);
 observer.observe(canvas);resize();
 function point(x,y,z){
  projected.set(x,y,z).project(camera);
  return {x:(projected.x*.5+.5)*width,y:playTop+(.5-projected.y*.5)*playHeight};
 }
 function updateMapButtons(){
  // 底部场景入口在总图和近景共享同一位置。
  for(const [name,mark] of Object.entries({...marks,overview:mapButton})){
   mark.hidden=false;
   mark.disabled=!!travel;
   if(name===mode)mark.setAttribute('aria-current','location');
   else mark.removeAttribute('aria-current');
   mark.classList.toggle('nearby',mode==='overview'&&!!atlasPosition&&name===atlasFocus);
  }
  atlasMarks.hidden=mode!=='overview'||!!travel;
  if(atlasMarks.hidden)return;
  for(const {button,anchor,name} of pins){
   let {x,y}=point(anchor.x,.27,anchor.z);
   // 在矮横屏上，动物能先于岸边路牌进入画面；把当前场景的路牌留在最近的画布边缘。
   if(name===atlasFocus){
    x=clamp(x,24,width-24);y=clamp(y,playTop+36,height-24);
   }
   button.hidden=x<24||x>width-24||y<playTop+36||y>height-24;
   if(!button.hidden){
    button.style.left=x+'px';
    button.style.top=y+'px';
   }
  }
 }
 function openView(next){
  if(travel||pointer!==null||gesture||(mode===next&&(mode==='overview'?!atlasPosition:panX===0&&panY===0)))return;
  hoverPoint=null;hintIdleAt=pond.time;updateCursor(null);
  wakeTap=null;
  const fromMode=mode;
  if(duckVoiceScene&&next!==duckVoiceScene&&next!=='overview'){audio.stop('duckling');duckVoiceScene=null;}
  if(fromMode==='overview'&&next==='overview')atlasPosition=null;
  if(fromMode==='river'&&next!=='river')river.returnToothbrush();
  panX=panY=0;
  mode=next;root.dataset.view=mode;
  const to=pannedView();
  if(quiet.matches){
   rig=to;placeCamera(camera,rig,width/playHeight);refreshAtlas();updateMapButtons();
   settleViewCloud();
  }else{
   travel={from:rig,fromMode,to,at:performance.now(),duration:Math.min(1050,590+Math.abs(rig.x-to.x)*34)};
   updateMapButtons();
  }
 }
 for(const [name,mark] of Object.entries(marks))bindButton(mark,()=>openView(name));
 bindButton(mapButton,()=>openView('overview'));
 function moveCamera(now){
  if(!travel)return;
  const t=clamp((now-travel.at)/travel.duration);
  rig=blendView(travel.from,travel.to,ease(t));
  placeCamera(camera,rig,width/playHeight);
  refreshAtlas();
  if(t===1){
   travel=null;
   hintIdleAt=pond.time;
   settleViewCloud();
   updateMapButtons();
  }
 }
 function waterHit(x,y){
  mouse.set(x/width*2-1,1-(y-playTop)/playHeight*2);ray.setFromCamera(mouse,camera);
  if(!ray.ray.intersectPlane(plane,hit))return null;
  if(Math.hypot(hit.x/bounds.x,(hit.z-bounds.cz)/bounds.z)>.99)return null;
  return {x:hit.x,z:hit.z};
 }
 const isNear=(center,x,y,w,h)=>Math.hypot((x-center.x)/w,(y-center.y)/h)<=1;
 const peckerScreen=bird=>point(bird.x-Math.sin(bird.yaw)*.14,bird.y+.24,bird.z-Math.cos(bird.yaw)*.14);
 const toucanScreen=bird=>point(bird.x-Math.sin(bird.yaw)*.085,bird.y+.23,bird.z+.05);
 const slothScreen=s=>point(s.x+.07,s.y-.045,s.z+.14);
 const peacockScreen=p=>point(p.x,p.y+.58,p.z+.13);
 const worldScreen=p=>point(p.x,p.y,p.z);
 const nodeScreen=node=>worldScreen(node.getWorldPosition(fanPosition));
 const brushScreen=(u,v=0)=>worldScreen(hippo.brushRail(u,v,toothPosition));
 const brushing=()=>mode==='river'&&river.toothbrush.phase!=='rest';
 function guideToothbrush(x,y){
  if(river.toothbrush.phase!=='active')return;
  const left=brushScreen(-1),right=brushScreen(1);
  const dx=right.x-left.x,dy=right.y-left.y,length=Math.hypot(dx,dy);
  if(length<1)return;
  const offsetX=x-(left.x+right.x)/2,offsetY=y-(left.y+right.y)/2;
  const u=2*(offsetX*dx+offsetY*dy)/(length*length);
  const v=(offsetX*dy-offsetY*dx)/(length*Math.max(24,length*.4));
  river.moveToothbrush(u,v);
 }
 const orchardRabbitScreen=p=>point(p.x,p.y+.82*p.scale,p.z);
 const bankBirdScreen=p=>point(p.x,p.y+.30,p.z);
 const riverDuckScreen=p=>point(p.x,p.y+.26,p.z);
 // 两个目标的边缘可以重合，点在中心时优先触发孩子指到的那个。
 function nearestTarget(x,y,targets){
  let closest=null,minimum=1;
  for(const {screen,w,h,...intent} of targets){
   const distance=Math.hypot((x-screen.x)/w,(y-screen.y)/h);
   if(distance<minimum){minimum=distance;closest=intent;}
  }
  return closest;
 }
 const penguinScreen=p=>point(p.x,p.y+mix(.53,.23,p.prone)-.11*p.sleep,p.z);
 const slopeScreen=i=>{const p=rampPoint(i);return point(p.x,coastGroundHeight(p.z)+.012,p.z);};
 const stoneScreen=i=>{const p=shoreStone(i);return point(p.x,coastGroundHeight(p.z)+.19,p.z);};
 function sceneTargets(){
  return mode==='overview'?atlasVisible.flatMap(habitatTargets):habitatTargets(mode);
 }
 function habitatTargets(name){
  const px=width/(camera.right-camera.left),targets=[];
  const add=(kind,screen,w,h,mw,mh,index,show=true)=>{
   targets.push({kind,screen,w:Math.max(mw,w*px),h:Math.max(mh,h*px),index,show});
  };
  const pos=(actor,y=0,z=0)=>point(actor.x,actor.y+y,actor.z+z);
  if(name==='bamboo'){
   for(const kind of bambooKinds){
    const screen=worldScreen(bambooView.point(kind,fanPosition));
    add(kind,screen,kind==='panda-mother'?.56:.38,kind==='panda-mother'?.57:.39,23,23);
   }
   return targets;
  }
  if(name==='eucalyptus'){
   for(const kind of gumKinds){
    if(!gum.canTap(kind))continue;
    const body=kind==='koala'||kind==='wallaby'||kind==='hedgehog';
    add(kind,worldScreen(gumView.point(kind,fanPosition)),body?.48:.30,body?.50:.30,23,23);
   }
   return targets;
  }
  if(name==='ice'){
   for(const f of ice.fish)if(ice.canFish(f.index))add('ice-fish',pos(f),.48,.26,23,22,f.index);
   add('ice-cave',worldScreen(icePoints.cave),.75,.46,25,23);
   add('polar-bear',worldScreen(iceView.bearScreenPoint(fanPosition)),.53,.47,23,22);
   return targets;
  }
  if(name==='ocean'){
   const sizes={whale:[1.48,.52],dolphin:[.96,.45],shark:[1.05,.53],clown:[.53,.38],horse:[.32,.52],star:[.49,.25]};
   for(const [name,actor] of Object.entries(ocean.animals)){
    add('ocean-animal',pos(actor,name==='star'?.04:0),...sizes[name],22,21,name);
   }
   if(ocean.visitor.amount>.55)add('ocean-visitor',pos(ocean.visitor),.34,.26,19,19);
   for(const name of ['anemone','kelp','shell'])add('ocean-prop',worldScreen(oceanPoints[name]),.31,.22,19,19,name);
   return targets;
  }
  if(name==='coast'){
   coast.penguins.forEach((p,i)=>add('penguin',penguinScreen(p),.36,mix(.47,.30,p.prone),23,24,i));
   coast.penguins.forEach((_,i)=>{
    add('coast-stone',stoneScreen(i),.37,.23,21,19,i);
    add('coast-ramp',slopeScreen(i),.65,.30,26,22,i);
   });
   add('coast-crab',pos(coast.crab,.17),.35,.24,20,20);
   add('tide-pool',worldScreen(coastPoints.tidePool),.55,.23,22,18);
   coast.fry.forEach(f=>{if(f.visible)add('coast-fry',pos(f),.27,.16,16,14,f.index);});
   coast.kelp.forEach((p,i)=>add('coast-kelp',pos(p),.49,.25,22,20,i));
   coast.fish.forEach((p,i)=>add('coast-fish',pos(p),.36,.27,22,20,i));
   return targets;
  }
  if(name==='rainforest'){
   add('macaw',pos(macaw.bird,.42),.39,.42,22,23);
   const {monkey:m,sloth:s,toucan:t,leaf,berry,groundMonkey:g,dropBanana}=rainforest;
   rainforest.bananas.forEach((fruit,i)=>{
    if(fruit.phase==='branch')add('banana',pos(fruit),.22,.18,22,22,i);
   });
   if(dropBanana.phase==='branch'||dropBanana.phase==='ground')add('drop-banana',pos(dropBanana),.23,.20,22,22);
   if(leaf.phase==='branch')add('sloth-leaf',pos(leaf),.25,.20,22,22);
   if(berry.phase==='branch')add('toucan-berry',pos(berry),.21,.19,22,22);
   add('sloth-bough',worldScreen(rainPoints.slothBough),.27,.19,22,22);
   add('monkey',pos(m,.34,.10),.36,.46,22,22);
   add('ground-monkey',pos(g,.36,.08),.34,.43,22,22);
   add('toucan',toucanScreen(t),.40,.38,22,22);
   add('sloth',slothScreen(s),.40,.34,22,22);
   add('sloth',nodeScreen(sloth.face),.26,.25,22,22,undefined,false);
   rainPoints.monkeyBranches.forEach((p,i)=>add('monkey-bough',pos(p,-.037,.11),.23,.15,22,22,i));
   return targets;
  }
  if(name==='asia'){
   const {bear:b,owl:o,tiger:t,peacock:p,leaf,tuft,sharedFruit}=asia;
   asia.fruits.forEach((fruit,i)=>{
    if(fruit.phase==='branch')add('asia-fruit',pos(fruit),.21,.22,20,20,i);
   });
   if(sharedFruit.phase==='branch')add('shared-fruit',pos(sharedFruit),.25,.23,22,22);
   if(leaf.phase==='branch')add('bear-leaf',pos(leaf),.25,.20,22,22);
   add('owl',pos(o,.43,.06),.34,.41,24,24);
   add('bear',pos(b,.61+b.stand*.39,.15),.49,.57,27,30);
   add('tiger-tuft',pos(tuft),.24,.22,21,20);
   add('tiger',pos(t,.50),.68,.44,25,24);
   add('peacock-seeds',worldScreen(asiaPoints.peacockSeedStone),.35,.20,23,20);
   add('peacock',peacockScreen(p),.31,.43,23,24);
   if(p.fan>.93)peacock.fanEyes.forEach((eye,i)=>add('peacock-fan',nodeScreen(eye),.24,.21,15,15,undefined,i===7));
   return targets;
  }
  if(name==='river'){
   if(brushing())return targets;
   add('croc',worldScreen(crocView.focusPoint(fanPosition)),.42,.25,23,22);
   add('croc',pos(croc.croc,.17,-.04),.45,.22,22,20,undefined,false);
   const {hippo:h,turtle:t,rhino:r}=river;
   add('hippo-brush',worldScreen(riverPoints.toothbrush),.36,.26,23,22);
   add('hippo',pos(h,.49,.46),1.04,.62,30,30);
   add('turtle',pos(t,.25),.42,.32,24,22);
   riverPoints.turtleSites.forEach((p,i)=>add('river-stone',pos(p),.44,.27,22,22,i));
   riverPoints.grass.forEach((p,i)=>add('river-grass',pos(p,.06),.33,.29,22,21,i));
   add('rhino',pos(r,.72),.72,.59,27,25);
   if(r.sniff<.3)add('rhino',nodeScreen(rhino.muzzle),.36,.31,17,17,undefined,false);
   river.fish.forEach((p,i)=>{if(p.surface>.46)add('river-fish',pos(p),.32,.25,19,18,i);});
   add('river-bird',bankBirdScreen(river.bird),.30,.30,21,20);
   river.ducks.forEach((p,i)=>{if(p.interactive)add('river-duck',riverDuckScreen(p),.27,.25,20,20,i);});
   return targets;
  }
  if(name==='savanna'){
   for(const leaf of savanna.leaves)add('bough',pos(leaf),.22,.22,25,25,leaf.index);
   for(const flower of savanna.flowers)add('savanna-flower',pos(flower),.34,.26,23,23,flower.index);
   const e=savanna.elephant,n=savanna.giraffe,z=savanna.zebra,l=savanna.lion,rock=savannaPoints.rock;
   add('lion-grass',worldScreen(savannaPoints.lionGrass),.20,.29,21,22);
   add('elephant',pos(e,1.02,.25),1,1.02,32,32);
   add('giraffe',pos(n,1.78),.53,1.48,28,27);
   add('savanna-rock',pos(rock,.21,.68),.62,.17,24,19);
   add('zebra',pos(z,.66),.49,.64,25,24);
   add('zebra',nodeScreen(zebra.head),.25,.23,22,22,undefined,false);
   add('lion',pos(l,.48,.16),.66,.51,26,26);
   return targets;
  }
  if(name==='grove'){
   const d=woodland.fox,s=woodland.squirrel,k=woodland.pecker;
   add('fox',pos(d,.39),.48,.37,24,23);
   add('pecker',peckerScreen(k),.22,.34,22,23);
   add('squirrel',pos(s,.30),.30,.37,23,23);
   woodlandPoints.wood.forEach((p,i)=>add('wood',pos(p),.21,.12,20,18,i));
   woodlandPoints.litter.forEach((p,i)=>add('litter',pos(p,.052),.28,.23,22,23,i));
   woodlandPoints.squirrelRoots.forEach((p,i)=>add('squirrel-root',pos(p),.26,.12,21,20,i));
   add('squirrel-perch',pos(woodlandPoints.squirrelPerch),.22,.16,20,20);
  }
  if(name==='orchard'){
   for(const a of orchard.apples)if(a.phase==='branch')add('apple',pos(a),.19,.23,21,22,a.id);
   const hive=orchardPoints.hive,basket=orchardPoints.basket;
   const c=orchard.cat,d=orchard.dog,but=orchard.butterfly;
   add('hive',pos(hive,.18),.34,.33,25,24);
   add('butterfly',pos(but,.15),.27,.23,20,20);
   orchard.bees.forEach((bee,i)=>{if(bee.visible)add('hive',pos(bee,.11),.20,.19,17,17,i);});
   add('dog',pos(d,.56),.45,.40,25,22);
   add('cat',pos(c,.52),.40,.38,24,26);
   add('basket',pos(basket,.24),.48,.29,25,24);
   const carrot=family.carrot;
   if(carrot.phase==='ready')add('rabbit-carrot',worldScreen(carrot.clickPoint),.22,.25,22,22);
   family.rabbits.forEach((r,i)=>add('orchard-rabbit',orchardRabbitScreen(r),.36,.43,22,24,i));
   orchardPoints.butterfly.forEach((p,i)=>add('butterfly',pos(p),.26,.22,18,18,i));
  }
  if(name==='grove'){
   add('rabbit',pos(grove.rabbit,.88),.43,.56,25,27);
   add('bird',pos(grove.bird,.35),.46,.48,26,26);
  }
  if(name==='pond'){
   const addSites=()=>sites.forEach((p,i)=>add('site',pos(p),i===1?.87:.73,.56,32,28,i));
   if(pond.busy)addSites();
   add('frog',pos(pond.frog,.47),.63,.63,30,33);
   add('fish',pos(pond.fish,.02),.54,.42,26,26);
   if(!pond.busy)addSites();
   pondNeighbors.forEach(({resident},i)=>add('pond-neighbor',pos(resident),.33,.29,19,18,i));
   pondYoung.ducks.forEach((actor,i)=>add('duckling',pos(actor,.27),.36,.34,22,21,i));
   pondYoung.tadpoles.forEach((actor,i)=>add('tadpole',pos(actor),.17,.13,13,13,i));
  }
  if(name==='grove'){
   grovePoints.grasses.forEach((p,i)=>add('grass',pos(p,.36,.13),.83,.51,29,24,i));
  }
  return targets;
 }
 function resolve(x,y,targets=sceneTargets()){
  if(travel||y<playTop)return null;
  if(brushing())return {kind:'hippo-brush'};
  if(mode==='bamboo'||mode==='eucalyptus'||mode==='overview'||mode==='grove'||mode==='orchard'||mode==='river'||mode==='rainforest'||mode==='asia'||mode==='ocean'){
   const nearest=nearestTarget(x,y,targets);
   if(nearest)return nearest;
  }else{
   const target=targets.find(p=>isNear(p.screen,x,y,p.w,p.h));
   if(target&&pondSwimmerKinds.has(target.kind)){
    const swimmers=targets.filter(p=>pondSwimmerKinds.has(p.kind));
    return nearestTarget(x,y,swimmers);
   }
   if(target)return target;
  }
  if(mode==='coast'||mode==='river'){
   mouse.set(x/width*2-1,1-(y-playTop)/playHeight*2);ray.setFromCamera(mouse,camera);
   if(!ray.ray.intersectPlane(mode==='coast'?coastPlane:riverPlane,hit))return null;
   const p=riverPoints.pool;
   const wet=mode==='coast'?isCoastWater(hit.x,hit.z):Math.hypot((hit.x-p.x)/p.rx,(hit.z-p.z)/p.rz)<.97;
   return wet?{kind:mode+'-water',x:hit.x,z:hit.z}:null;
  }
  if(mode==='overview'){
   mouse.set(x/width*2-1,1-(y-playTop)/playHeight*2);ray.setFromCamera(mouse,camera);
   if(atlasVisible.includes('river')&&ray.ray.intersectPlane(riverPlane,hit)){
    const p=riverPoints.pool;
    if(Math.hypot((hit.x-p.x)/p.rx,(hit.z-p.z)/p.rz)<.97)return {kind:'river-water',x:hit.x,z:hit.z};
   }
   if(atlasVisible.includes('coast')&&ray.ray.intersectPlane(coastPlane,hit)&&
    Math.abs(hit.x-habitats.coast.x)<5.5&&Math.abs(hit.z-habitats.coast.z)<4.6&&isCoastWater(hit.x,hit.z)){
    return {kind:'coast-water',x:hit.x,z:hit.z};
   }
  }
  if(mode!=='pond'&&mode!=='overview')return null;
  const location=waterHit(x,y);
  return location?{kind:'water',location}:null;
 }
 function paintHints(targets,hover){
  hintCount=0;
  hintCue=null;
  if(travel||gesture?.moving)return;
  const visible=[];
  for(const target of targets){
   const {kind,index,screen:{x,y}}=target;
   if(!target.show||x<5||x>width-5||y<28||y>height-12)continue;
   const contact=resolve(x,y,targets);
   if(!contact||contact.kind!==kind||contact.index!==index)continue;
   let nodes=soloHints[kind]??indexedHints[kind]?.[index];
    if(kind==='coast-crab')nodes=coastView.hintNodes.crab;
    if(kind==='tide-pool')nodes=coastView.hintNodes.pool;
    if(kind==='coast-kelp')nodes=coastView.hintNodes.kelp[index];
    if(kind==='coast-fry')nodes=coastView.hintNodes.fry[index];
    if(kind==='hive')nodes=index===undefined?garden.hintNodes.hive:beeHints[index];
   if(kind==='butterfly')nodes=index===undefined?butterfly.root:garden.hintNodes.flowers[index];
   if(nodes)visible.push({kind,index,nodes});
  }
  hintCount=visible.length;
  let cue=null;
  const idle=pond.time-hintIdleAt;
  if(pointer===null&&!quiet.matches&&idle>=3&&mode!=='overview'&&(!nightGoal||mode==='ocean'||mode==='eucalyptus')){
   // 海岸先提示下水的坡道，有企鹅在水里后改提示它自己的回岸石。
   const available=visible.filter(({kind,index})=>{
    if(kind==='site')return !pond.busy&&index!==pond.frog.site;
    if(kind==='coast-stone')return coast.penguins[index].phase==='swim';
    return true;
   });
   let preferred;
   if(mode==='coast'&&coast.penguins.some(p=>p.phase==='swim'))preferred='coast-stone';
   if(mode==='eucalyptus'&&nightGoal)preferred='hedgehog-den';
   cue=sceneCue(mode,idle,available,preferred);
   if(cue)hintCue={kind:cue.target.kind,index:cue.target.index,strength:cue.strength};
  }
  outlines.draw(camera,visible,wakeTap?.intent??hover,night,cue);
 }
 function local(ev){
  const r=$('habitat').getBoundingClientRect();return [ev.clientX-r.left,ev.clientY-r.top];
 }
 function updateCursor(intent){
  let next='default';
  if(brushing())next='toothbrush';
  else if(gesture?.moving)next='pan';
  else if(pointer!==null||intent?.kind==='water'||intent?.kind==='river-water'||intent?.kind==='coast-water')next='water';
  else if((intent?.kind==='site'&&intent.index===1)||['sloth-leaf','sloth-bough','gum-leaves','gum-bough','panda-bamboo'].includes(intent?.kind))next='leaf';
  else if(intent)next=['grass','river-grass','litter','tiger-tuft','lion-grass','wallaby-grass','panda-slope'].includes(intent.kind)?'grass':'animal';
  if(cursor!==next){cursor=next;canvas.dataset.cursor=next;}
 }
 function beginPlay(ev,mapPin=null){
  if(travel||gesture||pointer!==null||ev.button!==0)return;
  hintIdleAt=pond.time;
  if(ev.pointerType!=='mouse'){hoverPoint=null;updateCursor(null);}
  const [x,y]=local(ev),intent=mapPin?null:resolve(x,y);
  canvas.setPointerCapture(ev.pointerId);
  if(brushing())guideToothbrush(x,y);
  if(mode==='pond'&&intent?.kind==='water'){
   audio.wake();
   pointer=ev.pointerId;pond.guide(intent.location,true);
   updateCursor(intent);
  }else gesture={id:ev.pointerId,x,y,lastX:x,lastY:y,panX,panY,intent,mapPin,moving:false};
 }
 // 天亮时记住宝宝刚点的动物，等它看得见时再回应。切换场景或日月会取消旧点按。
 const morningActors={
  dog:orchard.dog,cat:orchard.cat,butterfly:orchard.butterfly,bird:grove.bird,zebra:savanna.zebra,
  turtle:river.turtle,'river-stone':river.turtle,'river-bird':river.bird,'river-duck':river.ducks,duckling:pondYoung.ducks,
  'orchard-rabbit':family.rabbits,'rabbit-carrot':family.rabbits[0],squirrel:woodland.squirrel,pecker:woodland.pecker,
  wood:woodland.pecker,peacock:asia.peacock,'peacock-seeds':asia.peacock,
  macaw:macaw.bird,toucan:rainforest.toucan,monkey:rainforest.monkey,'ground-monkey':rainforest.groundMonkey,
  banana:rainforest.monkey,'monkey-bough':rainforest.monkey,'drop-banana':rainforest.monkey,
  sloth:rainforest.sloth,'sloth-leaf':rainforest.sloth,'sloth-bough':rainforest.sloth,
  penguin:coast.penguins,'coast-ramp':coast.penguins,'coast-stone':coast.penguins,
  silvereye:gum.bird,'panda-mother':bamboo.bears[0],'panda-left':bamboo.bears[1],'panda-right':bamboo.bears[2],
  'panda-bamboo':bamboo.bears[0],'panda-slope':bamboo.bears[1]
 };
 const waking=new Set();
 let wakeTap=null;
 function collectWaking(){
  waking.clear();wakeTap=null;
  const animals=nightGoal?[asia.owl]:Object.values(morningActors).flat();
  for(const animal of animals)if(animal.sleep>.20)waking.add(animal);
 }
 function finishWaking(){
  for(const animal of waking){
   if(animal.sleep>.20||(animal===asia.peacock&&animal.site===1))continue;
   waking.delete(animal);
   if(wakeTap?.animal===animal){
    const {intent}=wakeTap;wakeTap=null;playIntent(intent);
   }
  }
 }
 function playIntent(intent){
  if(!intent)return;
  audio.wake();wakeTap=null;
  const entry=intent.kind==='owl'?asia.owl:morningActors[intent.kind];
  const animal=Array.isArray(entry)?entry[intent.index]:entry;
  if(animal&&waking.has(animal)){wakeTap={animal,intent};return;}
  if(intent.kind==='frog')pond.tapFrog();
  if(gumKinds.includes(intent.kind))gum.tap(intent.kind);
  if(bambooKinds.includes(intent.kind))bamboo.tap(intent.kind);
  if(intent.kind==='macaw')macaw.tap();
  if(intent.kind==='croc')croc.tap();
  if(intent.kind==='ice-cave')ice.tapCave();
  if(intent.kind==='ice-fish')ice.tapFish(intent.index);
  if(intent.kind==='polar-bear')ice.tapBear();
  if(intent.kind==='fish')pond.fishTap();
  if(intent.kind==='duckling')pondYoung.tapDuck(intent.index);
  if(intent.kind==='tadpole')pondYoung.tapTadpoles(intent.index);
  if(intent.kind==='pond-neighbor'){
   const fish=pondNeighbors[intent.index];
   fish.touch(pond.time);pondRipple(fish.resident.x,fish.resident.z,.68);
   rememberPondEvent({type:'neighbor-fish',index:intent.index});
  }
  if(intent.kind==='site')pond.playSite(intent.index);
  if(intent.kind==='rabbit')grove.tapRabbit();
  if(intent.kind==='orchard-rabbit')family.tap(intent.index);
  if(intent.kind==='rabbit-carrot')family.tapCarrot();
  if(intent.kind==='bird')grove.tapBird();
  if(intent.kind==='grass')grove.tapGrass(intent.index);
  if(intent.kind==='apple')orchard.tapApple(intent.index);
  if(intent.kind==='dog')orchard.tapDog();
  if(intent.kind==='cat')orchard.tapCat();
  if(intent.kind==='basket')orchard.tapBasket();
  if(intent.kind==='hive')orchard.tapHive();
  if(intent.kind==='butterfly')orchard.tapButterfly();
  if(intent.kind==='elephant')savanna.tapElephant();
  if(intent.kind==='savanna-flower')savanna.tapFlower(intent.index);
  if(intent.kind==='giraffe')savanna.tapGiraffe();
  if(intent.kind==='bough')savanna.tapBranch(intent.index);
  if(intent.kind==='zebra')savanna.tapZebra();
  if(intent.kind==='lion')savanna.tapLion();
  if(intent.kind==='lion-grass')savanna.tapLionGrass();
  if(intent.kind==='savanna-rock')savanna.tapRock();
  if(intent.kind==='hippo')river.tapHippo();
  if(intent.kind==='hippo-brush'){
   if(mode==='overview')openView('river');
   river.tapToothbrush();
  }
  if(intent.kind==='turtle')river.tapTurtle();
  if(intent.kind==='river-stone')river.tapStone(intent.index);
  if(intent.kind==='rhino')river.tapRhino();
  if(intent.kind==='river-grass')river.tapGrass(intent.index);
  if(intent.kind==='river-fish')river.tapFish(intent.index);
  if(intent.kind==='river-bird')river.tapBird();
  if(intent.kind==='river-duck')river.tapDuck(intent.index);
  if(intent.kind==='river-water'){
   bank.splash(intent.x,intent.z,river.time);
   river.tapWater(intent.x,intent.z);
  }
  if(intent.kind==='fox')woodland.tapFox();
  if(intent.kind==='litter')woodland.tapLitter(intent.index);
  if(intent.kind==='squirrel')woodland.tapSquirrel();
  if(intent.kind==='squirrel-root')woodland.tapRoot(intent.index);
  if(intent.kind==='squirrel-perch')woodland.tapSquirrelPerch();
  if(intent.kind==='pecker')woodland.tapPecker();
  if(intent.kind==='wood')woodland.tapWood(intent.index);
  if(intent.kind==='bear')asia.tapBear();
  if(intent.kind==='bear-leaf')asia.tapLeaf();
  if(intent.kind==='asia-fruit')asia.tapFruit(intent.index);
  if(intent.kind==='shared-fruit')asia.tapSharedFruit();
  if(intent.kind==='tiger')asia.tapTiger();
  if(intent.kind==='tiger-tuft')asia.tapTuft();
  if(intent.kind==='peacock')asia.tapPeacock();
  if(intent.kind==='peacock-seeds')asia.tapPeacockSeeds();
  if(intent.kind==='peacock-fan')asia.tapPeacockFan();
  if(intent.kind==='owl')asia.tapOwl();
  if(intent.kind==='monkey')rainforest.tapMonkey();
  if(intent.kind==='ground-monkey')rainforest.tapGroundMonkey();
  if(intent.kind==='drop-banana')rainforest.tapDropBanana();
  if(intent.kind==='banana')rainforest.tapBanana(intent.index);
  if(intent.kind==='monkey-bough')rainforest.tapMonkeyBough(intent.index);
  if(intent.kind==='sloth')rainforest.tapSloth();
  if(intent.kind==='sloth-leaf')rainforest.tapLeaf();
  if(intent.kind==='sloth-bough')rainforest.tapSlothBough();
  if(intent.kind==='toucan')rainforest.tapToucan();
  if(intent.kind==='toucan-berry')rainforest.tapBerry();
  if(intent.kind==='penguin')coast.tapPenguin(intent.index);
  if(intent.kind==='coast-ramp')coast.tapRamp(intent.index);
  if(intent.kind==='coast-stone')coast.tapStone(intent.index);
  if(intent.kind==='coast-fish')coast.tapFish(intent.index);
  if(intent.kind==='tide-pool'||intent.kind==='coast-crab')coast.tapCrab();
  if(intent.kind==='coast-kelp')coast.tapKelp(intent.index);
  if(intent.kind==='coast-fry')coast.tapFry(intent.index);
  if(intent.kind==='coast-water')coast.tapWater(intent);
  if(intent.kind==='ocean-animal')ocean.tap(intent.index);
  if(intent.kind==='ocean-prop')ocean.tapProp(intent.index);
  if(intent.kind==='ocean-visitor')ocean.tapVisitor();
  if(intent.kind==='water')pond.guide(intent.location);
 }
 function movePlay(ev){
  const [x,y]=local(ev);
  hintIdleAt=pond.time;
  if(ev.pointerType==='mouse')hoverPoint=x>=0&&x<width&&y>=0&&y<height?[x,y]:null;
  if(brushing()){
   if(gesture?.id===ev.pointerId&&Math.hypot(x-gesture.x,y-gesture.y)>8)gesture.moving=true;
   guideToothbrush(x,y);
   updateCursor(null);
   return;
  }
  if(pointer===ev.pointerId){
   const location=waterHit(x,y);
   if(location)pond.guide(location,true);
  }else if(gesture?.id===ev.pointerId){
   const dx=x-gesture.x,dy=y-gesture.y;
   if(!gesture.moving&&Math.hypot(dx,dy)<(ev.pointerType==='touch'?12:8))return;
   gesture.moving=true;
   if(mode==='overview'){
    atlasPosition=dragAtlas(rig,x-gesture.lastX,y-gesture.lastY,playHeight);
    panX+=x-gesture.lastX;panY+=y-gesture.lastY;
    gesture.lastX=x;gesture.lastY=y;
   }else{
    const toPixels=playHeight/rig.height;
    panX=clamp(gesture.panX+dx,-toPixels*.95,toPixels*.95);
    panY=clamp(gesture.panY+dy,-toPixels*.68,toPixels*.68);
   }
   rig=pannedView();placeCamera(camera,rig,width/playHeight);refreshAtlas();updateMapButtons();
   updateCursor(null);
  }else if(ev.pointerType==='mouse'){
   const intent=resolve(x,y);
   updateCursor(intent);
   if(intent?.kind==='water'&&!quiet.matches&&pond.time-brushAt>.23&&Math.hypot(x-brushX,y-brushY)>22){
    const {x:worldX,z}=intent.location;
    diorama.ripple(worldX,z,pond.time,.31);brushAt=pond.time;brushX=x;brushY=y;
   }
  }
 }
 canvas.addEventListener('pointerdown',beginPlay);
 canvas.addEventListener('pointermove',movePlay);
 canvas.addEventListener('pointerleave',()=>{hoverPoint=null;updateCursor(null);});
 function endPointer(ev){
  if(gesture&&(!ev||ev.pointerId===gesture.id)){
   const closed=gesture;gesture=null;
   if(ev?.type==='pointerup'&&!closed.moving){
    if(closed.mapPin){
     const released=document.elementFromPoint(ev.clientX,ev.clientY);
     if(closed.mapPin.contains(released))openView(closed.mapPin.id.slice('atlas-'.length));
    }else playIntent(closed.intent);
   }
  }
  if(pointer!==null&&(!ev||ev.pointerId===pointer)){
   pointer=null;pond.finishDrag();
  }
  updateCursor(hoverPoint&&resolve(...hoverPoint));
 }
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endPointer);
 window.addEventListener('blur',()=>{hoverPoint=null;endPointer();updateCursor(null);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)endPointer();});
 $('key-frog').onclick=()=>{audio.wake();pond.tapFrog();};
 $('key-hop').onclick=()=>{audio.wake();pond.playSite(1-pond.frog.site);};
 $('key-fish').onclick=()=>{audio.wake();pond.guide({x:pond.frog.x,z:pond.frog.z+.87});};
 $('key-grass').onclick=()=>{audio.wake();grove.tapGrass(grove.rabbit.cover??1);};
 $('key-bird').onclick=()=>{audio.wake();grove.tapBird();};
 bindButton(sound,()=>{
  const muted=audio.toggle();sound.setAttribute('aria-pressed',String(muted));
  sound.setAttribute('aria-label',muted?'打开声音':'静音');
 });
 function setCloud(x,y){cloudX=clamp(x,minCloudX,.96);cloudY=clamp(y,minCloudY,.38);}
 function skyAt(x,y){
  if(x<0||x>width||y<0||y>height)return false;
  if(y<playTop)return true;
  mouse.set(x/width*2-1,1-(y-playTop)/playHeight*2);ray.setFromCamera(mouse,camera);
  const hits=[];
  for(const object of skyOccluders){
   let node=object;
   while(node&&node.visible)node=node.parent;
   if(!node&&ray.intersectObject(object,false,hits).length)return false;
  }
  return true;
 }
 function cloudCanBeGrabbed(ev){
  const r=cloud.getBoundingClientRect();
  const shapePoint=new DOMPoint((ev.clientX-r.left)*184/r.width,(ev.clientY-r.top)*92/r.height);
  return cloudShape.isPointInFill(shapePoint)&&skyAt(...local(ev));
 }
 function cloudHasGrip(minimum=2){
  const w=cloud.offsetWidth,h=cloud.offsetHeight;
  let openings=0;
  for(const [x,y] of [[-.36,.18],[-.20,.11],[0,.09],[.20,.11],[.36,.18],[0,-.19]]){
   if(skyAt(cloudX*width+x*w,cloudY*height+y*h)&&++openings===minimum)return true;
  }
  return false;
 }
 function settleCloud(previous,minimum=2){
  if(cloudHasGrip(minimum))return;
  if(previous){
   setCloud(previous.cx,previous.cy);
   if(cloudHasGrip(minimum))return;
  }
  const start=cloudX,startY=cloudY;
  // 完全藏到树后的停靠点需要退到一块仍可抓到的天空。
  for(const offset of [0,-.08,.08,-.16,.16,-.24,.24,-.32,.32,-.48,.48]){
   setCloud(start+offset,minCloudY);
   if(cloudHasGrip(minimum))return;
  }
  setCloud(start,startY);
 }
 function settleViewCloud(){
  if(cloudHand||mode==='ocean')return;
  if(pin)settleCloud();
  else if(['grove','river','asia','rainforest'].includes(mode))settleCloud(undefined,4);
 }
 function toggleCloudPin(){
  pin=!pin;
  if(pin){setCloud(cloudX,cloudY);settleCloud();}
 }
 cloud.onpointerdown=ev=>{
  if(cloudHand||ev.button!==0)return;
  const box=sun.getBoundingClientRect();
  const lightTap=Math.hypot(ev.clientX-box.x-box.width/2,ev.clientY-box.y-box.height/2)<box.width*.40&&skyAt(...local(ev));
  const grab=cloudCanBeGrabbed(ev);
  // 图形在场景后，同一位置若碰到前景，交回场景原本的点按。
  if(!grab&&!lightTap){beginPlay(ev);return;}
  cloudHand={id:ev.pointerId,x:ev.clientX,y:ev.clientY,cx:cloudX,cy:cloudY,moved:false,grab,lightTap};
  hoverPoint=null;updateCursor(null);
  cloud.style.removeProperty('cursor');
  cloud.setPointerCapture(ev.pointerId);
  if(grab)cloud.classList.add('dragging');
 };
 cloud.onpointermove=ev=>{
  if(!cloudHand&&ev.pointerType==='mouse'){
   if(cloudCanBeGrabbed(ev)){
    hoverPoint=null;updateCursor(null);cloud.style.cursor='grab';
   }else{
    movePlay(ev);cloud.style.cursor=getComputedStyle(canvas).cursor;
   }
   return;
  }
  if(cloudHand?.id!==ev.pointerId)return;
  const dx=ev.clientX-cloudHand.x,dy=ev.clientY-cloudHand.y;
  if(Math.hypot(dx,dy)>4)cloudHand.moved=true;
  if(cloudHand.moved&&cloudHand.grab)setCloud(cloudHand.cx+dx/width,cloudHand.cy+dy/height);
 };
 function releaseCloud(ev){
  if(cloudHand?.id!==ev.pointerId)return;
  if(cloudHand.moved&&cloudHand.grab){pin=true;settleCloud(cloudHand);}
  else if(!cloudHand.moved&&ev.type==='pointerup'){
   // 云朵经过日月时，轻点日月仍能换时间，拖动则继续抓住云。
   if(cloudHand.lightTap)switchDayNight();else toggleCloudPin();
  }
  cloudHand=null;cloud.classList.remove('dragging');
 }
 for(const event of ['pointerup','pointercancel','lostpointercapture'])cloud.addEventListener(event,releaseCloud);
 cloud.onclick=ev=>{if(ev.detail===0)toggleCloudPin();};
 function switchDayNight(){
  nightGoal=1-nightGoal;collectWaking();
  pondYoung.setNight(Boolean(nightGoal));
  grove.setNight(Boolean(nightGoal));
  orchard.setNight(Boolean(nightGoal));
  family.setNight(Boolean(nightGoal));
  savanna.setNight(Boolean(nightGoal));
  river.setNight(Boolean(nightGoal));
  woodland.setNight(Boolean(nightGoal));
  asia.setNight(Boolean(nightGoal));
  rainforest.setNight(Boolean(nightGoal));macaw.setNight(Boolean(nightGoal));
  coast.setNight(Boolean(nightGoal));
  if(nightGoal){
   sunArt.classList.toggle('full',++nightVisits%2===0);
   audio.stop('bird');
   audio.stop('dog');audio.stop('cat');audio.stop('bee');
   audio.stop('zebra');audio.stop('duckling');
   audio.stop('squirrel');audio.stop('woodpecker');
   audio.stop('peacock');
   audio.stop('monkey');
   audio.stop('toucan');
   audio.stop('macaw');audio.stop('silvereye');
   audio.stop('panda');
   audio.stop('penguin');
  }else sleepAt=-Infinity;
  sun.setAttribute('aria-label',nightGoal?'切换到白天':'切换到夜晚');
 }
 bindButton(sun,switchDayNight);
 function drawSkyBirds(dt){
  const flight=skyFlight.step(dt,mode!=='ocean'&&!quiet.matches&&night<(nightGoal ? .68 : .30));
  if(!flight){if(!skyBirds.hidden)skyBirds.hidden=true;return;}
  if(skyBirds.hidden)skyBirds.hidden=false;
  const {direction,altitude,count,age,progress}=flight;
  const size=mix(.71,1,clamp((width-350)/820));
  const lane=altitude-.034*ease((1.25-width/playHeight)/.55);
  const front=mix(-100,width+100,progress);
  for(const [index,{body,far,near}] of flyingBirds.entries()){
   body.style.display=index<count?'':'none';
   if(index>=count)continue;
   const x=front-index*34*size;
   const y=height*(lane+Math.sin(progress*Math.PI*1.38+.28)*.016)+index*7*size;
   const phase=age*13+index*1.46;
   const exertion=.42+.58*ease((Math.cos(age*2.30+index*.54)+.60)/1.24);
   const stroke=.35+Math.cos(phase)*exertion;
   const span=size*(1-index*.13);
   body.setAttribute('transform',`translate(${direction>0?x:width-x} ${y}) rotate(${direction*5*Math.cos(progress*4)}) scale(${direction*span} ${span})`);
   far.setAttribute('transform',`scale(1 ${stroke*.83-.11})`);
   near.setAttribute('transform',`scale(1 ${stroke})`);
  }
 }
 function weather(dt){
  if(!pin&&!cloudHand&&!quiet.matches){
   cloudX-=dt*.009;
   if(cloudX<-.09)cloudX=1.09;
  }
  root.style.setProperty('--cloud-x',cloudX*100+'%');
  root.style.setProperty('--cloud-y',cloudY*100+'%');
  const s=sun.getBoundingClientRect(),c=cloud.getBoundingClientRect();
  const dx=(c.x+c.width/2)-(s.x+s.width/2),dy=(c.y+c.height*.56)-(s.y+s.height/2);
  cover=1-ease((Math.hypot(dx/(c.width*.45+s.width*.09),dy/(c.height*.36+s.height*.08))-.10)/.93);
  shade+=(cover-shade)*Math.min(1,dt*5);
  night+=(nightGoal-night)*Math.min(1,dt*(quiet.matches?12:3.6));
  root.style.setProperty('--night',night.toFixed(3));root.style.setProperty('--shade',shade.toFixed(3));
  for(const [id,a,b] of pool)root.style.setProperty(id,tint.copy(a).lerp(b,night).multiplyScalar(1-shade*.45).getStyle());
  sky.color.copy(daylightSky).lerp(moonSky,night);
  key.color.copy(daylightKey).lerp(moonKey,night);
  sky.intensity=mix(1.72,1.03,night)*(1-shade*.49);
  key.intensity=mix(2.66,.76,night)*(1-shade*.75);
  fill.intensity=mix(.66,.76,night)*(1-shade*.13);
 }
 function showSleep(animal){
  const progress=(pond.time-sleepAt)/1.48;
  let restTime=nightGoal;
  if(sleeper==='hedgehog-den')restTime=onStage('eucalyptus')&&nightGoal;
  if(sleeper==='koala')restTime=onStage('eucalyptus')&&gum.koala.sleep>.48;
  if(sleeper==='silvereye')restTime=onStage('eucalyptus')&&gum.bird.sleep>.48;
  if(sleeper==='macaw')restTime=onStage('rainforest')&&nightGoal;
  if(bambooKinds.includes(sleeper))restTime=onStage('bamboo')&&nightGoal&&bamboo.bears[bambooKinds.indexOf(sleeper)]?.sleep>.48;
  if(sleeper==='owl')restTime=!nightGoal;
  if(sleeper==='sloth')restTime=rainforest.sloth.sleep>.48;
  if(travel||!restTime||progress>=1){sleepMark.hidden=true;return;}
  const offset=sleeper==='zebra'?1.16:sleeper==='peacock'?.77:sleeper.startsWith('penguin-')?.85:.51;
  const p=point(animal.x,animal.y+offset,animal.z);
  sleepMark.hidden=p.x<0||p.x>width||p.y<35||p.y>height;
  if(sleepMark.hidden)return;
  const x=p.x+(sleeper==='zebra'?Math.max(-31,8-p.x):p.x>width-65?-58:13);
  const y=p.y-37-(quiet.matches?0:progress*22);
  sleepMark.style.transform='translate('+x+'px,'+y+'px)';
  sleepMark.style.opacity=String(mix(.36,1,ease(progress/.12))*(1-ease((progress-.58)/.42)));
 }
 function render(now){
  const dt=clamp((now-lastFrame)/1000,0,.046);lastFrame=now;
  moveCamera(now);
  const active=name=>!travel&&onStage(name);
  pond.step(dt,active('pond'));
  pondYoung.step(dt,active('pond'),active('pond')?pond.frog:null,pond.busy);
  grove.step(dt,active('grove'));orchard.step(dt,active('orchard'));
  const seeOrchardRabbits=onStage('orchard');
  family.step(dt,seeOrchardRabbits&&active('orchard'));
  savanna.step(dt,active('savanna'));river.step(dt,active('river'));
  woodland.step(dt,active('grove'));asia.step(dt,active('asia'));rainforest.step(dt,active('rainforest'));
  coast.step(dt,active('coast'));ocean.step(dt,active('ocean'));
  ice.step(dt,active('ice'));
  gum.step(dt,active('eucalyptus'),Boolean(nightGoal));
  bamboo.step(dt,active('bamboo'),Boolean(nightGoal));
  croc.step(dt,active('river'),river.waves);macaw.step(dt,active('rainforest'));
  if(mode!=='ocean')weather(dt);
  drawSkyBirds(dt);
  key.target.position.x=Math.max(4.8,rig.x-2.75);
  key.position.x=key.target.position.x-3.3;
  const f=pond.frog,g=pond.fish,h=grove.rabbit,b=grove.bird;
  frog.root.position.set(f.x,f.y,f.z);frog.root.rotation.y=f.yaw;
  frog.pose({...f,time:pond.time});
  fish.root.position.set(g.x,g.y,g.z);fish.root.rotation.y=g.yaw;
  fish.pose({tail:g.tail,dive:g.dive,time:pond.time});
  movePondNeighbors();
  const seePond=onStage('pond');
  frog.root.visible=fish.root.visible=seePond;
  for(const [models,states] of [[ducklings,pondYoung.ducks],[tadpoles,pondYoung.tadpoles]]){
   models.forEach((model,i)=>{
    model.root.visible=seePond;
    if(!seePond)return;
    const actor=states[i];
    model.root.position.set(actor.x,actor.y,actor.z);
    model.root.rotation.y=actor.yaw;
    model.pose(models===ducklings?{...actor,call:i===0&&duckVoiceScene==='pond'?audio.voiceLevel('duckling'):0}:actor);
   });
  }
  rabbit.root.position.set(h.x,h.y,h.z);rabbit.root.rotation.y=h.yaw;rabbit.pose(h);
  orchardRabbits.forEach((model,index)=>{
   model.root.visible=seeOrchardRabbits;
   if(!seeOrchardRabbits)return;
   const actor=family.rabbits[index];
   model.root.position.set(actor.x,actor.y,actor.z);
   model.root.rotation.y=actor.yaw;
   model.root.scale.setScalar(actor.scale);
   model.pose(actor);
  });
  bird.root.position.set(b.x,b.y,b.z);bird.root.rotation.y=b.yaw;bird.pose(b);
  for(const [actor,state] of [[dog,orchard.dog],[cat,orchard.cat],[butterfly,orchard.butterfly],...bees.map((bee,i)=>[bee,orchard.bees[i]])]){
   actor.root.visible=onStage('orchard')&&state.visible!==false;
   if(!actor.root.visible)continue;
   actor.root.position.set(state.x,state.y,state.z);actor.root.rotation.y=state.yaw;
   actor.pose(state);
  }
  const seeRainforest=onStage('rainforest'),seeCoast=onStage('coast'),seeAsia=onStage('asia'),seeGrassland=onStage('savanna');
  const seeOcean=onStage('ocean'),seeRiver=onStage('river');
  const mapLayer=mode==='overview'||travel?.fromMode==='overview';
  const seeGum=onStage('eucalyptus');
  const seeBamboo=onStage('bamboo'),seeContinuousGround=seeGum||seeBamboo;
  landscape.root.visible=mapLayer||seeContinuousGround;
  gumView.root.visible=seeGum;if(seeGum)gumView.tick(gum);
  bambooView.root.visible=seeBamboo;if(seeBamboo)bambooView.tick(bamboo);
  macawView.root.visible=seeRainforest;if(seeRainforest)macawView.tick(macaw,audio.voiceLevel('macaw'));
  crocView.root.visible=seeRiver;if(seeRiver)crocView.tick(croc);
  iceView.root.visible=onStage('ice');
  iceView.setMapMode(mapLayer);coastView.setMapMode(mapLayer);oceanView.setMapMode(mapLayer);
  if(iceView.root.visible)iceView.tick(ice,night,shade);
  // 走进树林的近景时，草原与河岸的前景树留在取景之外。
  grassland.root.visible=mapLayer?seeGrassland:!seeContinuousGround&&!seeAsia&&!seeRainforest&&!seeCoast&&!seeOcean&&mode!=='ice';
  bank.root.visible=mapLayer?seeRiver:grassland.root.visible;
  thicket.root.visible=seeAsia||(!mapLayer&&mode==='grove'&&(travel?.from.x??0)<16);
  canopy.root.visible=seeRainforest;
  coastView.root.visible=seeCoast;
  oceanView.root.visible=seeOcean;
  diorama.land.visible=!seeContinuousGround&&!mapLayer&&mode!=='ice'&&(!seeCoast||rig.x<32.4||rig.z<9.6)&&(!seeOcean||rig.x<44);
  key.target.position.z=seeContinuousGround||mapLayer||seeCoast||seeOcean||mode==='ice'?rig.z:0;
  key.position.z=4.2+key.target.position.z;
  for(const [name,actor] of Object.entries(largeAnimals)){
   actor.root.visible=seeGrassland;
   if(!seeGrassland)continue;
   const state=savanna[name];
   actor.root.position.set(state.x,state.y,state.z);actor.root.rotation.y=state.yaw;
   actor.pose(state);
  }
  if(seeGrassland)grassland.tick(savanna,elephant.nozzle.getWorldPosition(nozzlePosition),night,shade);
  function placeRiver(actor,state){
   actor.root.visible=seeRiver&&state.present!==false;
   if(!actor.root.visible)return;
   actor.root.position.set(state.x,state.y,state.z);actor.root.rotation.y=state.yaw;
   actor.pose(state);
  }
  for(const [name,actor] of Object.entries(riverAnimals))placeRiver(actor,river[name]);
  if(seeRiver){
   for(const name of ['rhino','hippo']){
    riverAnimals[name].birdPerch.getWorldPosition(birdPerches[name]);
    birdPerches[name].yaw=river[name].yaw+(name==='rhino'?2.05:-1.10);
   }
   river.poseBird(dt,active('river'),birdPerches);
  }
  placeRiver(bankBird,river.bird);
  riverDucks.forEach((actor,index)=>placeRiver(actor,{...river.ducks[index],call:index===0&&duckVoiceScene==='river'?audio.voiceLevel('duckling'):0}));
  if(seeRiver)bank.tick(river,night,shade,hippo);
  riverFish.forEach((actor,i)=>{
   const state=river.fish[i];
   placeRiver(actor,{...state,present:state.surface>.005,dive:state.dive*.45});
   if(actor.root.visible)for(const material of actor.waterMaterials)material.opacity=state.surface;
  });
  const seeWood=onStage('grove');
  garden.root.visible=onStage('orchard');
  forest.root.visible=timber.root.visible=seeWood;
  rabbit.root.visible=bird.root.visible=seeWood;
  for(const [name,actor] of Object.entries(woodlandAnimals)){
   actor.root.visible=seeWood;
   if(!seeWood)continue;
   const state=woodland[name];
   actor.root.position.set(state.x,state.y,state.z);actor.root.rotation.y=state.yaw;actor.pose(state);
  }
  timber.cone.visible=seeWood;
  if(seeWood){
   timber.tick(woodland);
   squirrel.cone.getWorldPosition(timber.cone.position);
   squirrel.cone.getWorldQuaternion(timber.cone.quaternion);
  }
  for(const [name,actor] of Object.entries(asiaAnimals)){
   actor.root.visible=seeAsia;
   if(!seeAsia)continue;
   const state=asia[name];
   actor.root.position.set(state.x,state.y,state.z);actor.root.rotation.y=state.yaw;actor.pose(state);
  }
  if(seeAsia)thicket.tick(asia,bear,tiger);
  for(const [name,actor] of Object.entries(rainforestAnimals)){
   actor.root.visible=seeRainforest;
   if(!seeRainforest)continue;
   const state=rainforest[name];
   actor.root.position.set(state.x,state.y,state.z);actor.root.rotation.y=state.yaw;actor.pose(state);
  }
  if(seeRainforest)canopy.tick(rainforest,monkey,sloth,toucan,groundMonkey);
  for(const [i,p] of penguins.entries()){
   p.root.visible=seeCoast;
   if(!seeCoast)continue;
   const state=coast.penguins[i];
   p.root.position.set(state.x,state.y,state.z);p.root.rotation.y=state.yaw;
   p.pose(state,coast.time);
  }
  for(const [i,actor] of coastFish.entries()){
   actor.root.visible=seeCoast;
   if(!seeCoast)continue;
   const state=coast.fish[i];
   actor.root.position.set(state.x,state.y,state.z);actor.root.rotation.y=state.yaw;
   actor.pose({tail:state.tail,dive:state.poseDive,time:coast.time});
  }
  if(seeCoast)coastView.tick(coast,night,shade,penguins);
  if(seeOcean)oceanView.tick(ocean,night);
  finishWaking();
  const sleeperPenguin=sleeper.startsWith('penguin-')?coast.penguins[Number(sleeper.at(-1))]:null;
  const sleepingDucks=sleeper.startsWith('river-duck-')?river.ducks:sleeper.startsWith('duckling-')?pondYoung.ducks:null;
  const sleeperDuck=sleepingDucks?.[Number(sleeper.at(-1))];
  const sleeperRabbit=sleeper.startsWith('orchard-rabbit-')?family.rabbits[Number(sleeper.at(-1))]:null;
  let newSleeper=null;
  if(sleeper==='hive')newSleeper=orchardPoints.hive;
  else if(gumKinds.includes(sleeper))newSleeper=gumView.point(sleeper,fanPosition);
  else if(bambooKinds.includes(sleeper))newSleeper=bambooView.point(sleeper,fanPosition);
  else if(sleeper==='macaw')newSleeper=macaw.bird;
  showSleep(newSleeper||sleeperRabbit||sleeperDuck||sleeperPenguin||(sleeper==='river-bird'?river.bird:sleeper==='bird'?b:savanna[sleeper]||orchard[sleeper]||river[sleeper]||woodland[sleeper]||asia[sleeper]||rainforest[sleeper]||b));
  const a=pond.time-padAt;
  diorama.touch(lastActive,lastActive===pond.frog.site&&!pond.busy?0:Math.sin(a*13)*Math.max(0,1-a*2.8));
  // 角色游过光标时同样更新提示，悬停和点按共享命中区域。
  const targets=travel?[]:sceneTargets();
  const hover=pointer===null&&hoverPoint?resolve(...hoverPoint,targets):null;
  if(pointer===null)updateCursor(hover);
  const idleHint=!quiet.matches&&!pond.busy&&f.site!==1 ? .065*Math.sin(Math.PI*clamp((pond.time%5-.65)/1.4)) : 0;
  const glow=cursor==='leaf' ? .28 : idleHint;
  leafGlow=quiet.matches?glow:mix(leafGlow,glow,Math.min(1,dt*12));
  diorama.leafHint(leafGlow);
  diorama.tick(pond.time,night,shade,quiet.matches);
  forest.tick(grove.time,hover?.kind==='grass'?hover.index:null,dt,quiet.matches);
  garden.tick(orchard,hover?.kind==='apple'?hover.index:null,family);
  renderer.render(scene,camera);frames++;
  paintHints(targets,hover);
  if(!ready){ready=true;root.classList.add('ready');}
  requestAnimationFrame(render);
 }
 window.pondInspect=()=>{
  const f=pond.frog,g=pond.fish;
  return {
   ready,frames,width,height,playTop,playHeight,time:pond.time,night,shade,cover,cloud:{x:cloudX,y:cloudY,pin},
   frog:{...f,screen:point(f.x,f.y+.47,f.z)},fish:{...g,screen:point(g.x,g.y+.02,g.z)},
   sites:sites.map(s=>point(s.x,s.y,s.z)),water:[[0,1.2],[1.8,1.6],[-1.6,.3],[.71,1.10]].map(([x,z])=>point(x,.012,z)),
   target:pond.target&&{...pond.target},busy:pond.busy,greetingCount:pond.greetingCount,events:events.map(e=>({...e})),audio:audio.inspect(),
   view:{mode,moving:!!travel,panX,panY,...rig},hintCount,hintCue,
   atlas:mode==='overview'?{x:rig.x,z:rig.z,focus:atlasFocus,visible:[...atlasVisible]}:null,
   bamboo:{...Object.fromEntries(bambooKinds.map((kind,i)=>[kind,{...bamboo.bears[i],screen:worldScreen(bambooView.point(kind,fanPosition))}])),play:{...bamboo.play},
    events:bambooEvents.map(e=>({...e}))},
   eucalyptus:{...Object.fromEntries(gumKinds.map(kind=>[kind,{screen:worldScreen(gumView.point(kind,fanPosition)),clickable:gum.canTap(kind)}])),
    mother:{...gum.ground.wallaby},grass:{...gum.ground.grass},burrow:{...gum.ground.hedgehog},events:gumEvents.map(e=>({...e}))},
   ice:{bear:{...ice.bear,screen:worldScreen(iceView.bearScreenPoint(fanPosition))},
    fish:ice.fish.map(f=>({...f,screen:nodeScreen(iceView.hintNodes.fish[f.index]),clickable:ice.canFish(f.index)})),
    cave:worldScreen(icePoints.cave),events:iceEvents.map(event=>({...event}))},
   pondNeighbors:pondNeighbors.map(({resident})=>({...resident,screen:worldScreen(resident)})),
   pondYoung:{
    ducks:pondYoung.ducks.map(actor=>({...actor,screen:point(actor.x,actor.y+.27,actor.z)})),
    tadpoles:pondYoung.tadpoles.map(actor=>({...actor,screen:worldScreen(actor)}))
   },grove:{
    rabbit:{...grove.rabbit,screen:point(grove.rabbit.x,grove.rabbit.y+.88,grove.rabbit.z)},
    bird:{...grove.bird,screen:point(grove.bird.x,grove.bird.y+.35,grove.bird.z)},
    grasses:grovePoints.grasses.map(g=>point(g.x,g.y+.24,g.z+.45)),
    events:groveEvents.map(e=>({...e}))
   },orchard:{
    basketCount:orchard.basketCount,basketTilt:orchard.basketTilt,
    carrot:{...family.carrot,screen:worldScreen(family.carrot.clickPoint)},
    rabbits:family.rabbits.map(r=>({...r,screen:orchardRabbitScreen(r)})),
    apples:orchard.apples.map(a=>({...a,screen:point(a.x,a.y,a.z)})),
    dog:{...orchard.dog,screen:point(orchard.dog.x,orchard.dog.y+.56,orchard.dog.z)},
    cat:{...orchard.cat,screen:point(orchard.cat.x,orchard.cat.y+.52,orchard.cat.z)},
    butterfly:{...orchard.butterfly,screen:point(orchard.butterfly.x,orchard.butterfly.y+.15,orchard.butterfly.z)},
    bees:orchard.bees.map(bee=>({...bee,screen:point(bee.x,bee.y+.11,bee.z)})),
    basket:point(orchardPoints.basket.x,orchardPoints.basket.y+.24,orchardPoints.basket.z),
    hive:point(orchardPoints.hive.x,orchardPoints.hive.y+.18,orchardPoints.hive.z),
    events:orchardEvents.map(e=>({...e}))
   },savanna:{
    elephant:{...savanna.elephant,screen:point(savanna.elephant.x,savanna.elephant.y+1.03,savanna.elephant.z+.25)},
    giraffe:{...savanna.giraffe,screen:point(savanna.giraffe.x,savanna.giraffe.y+1.72,savanna.giraffe.z)},
    zebra:{...savanna.zebra,screen:point(savanna.zebra.x,savanna.zebra.y+.69,savanna.zebra.z)},
    lion:{...savanna.lion,screen:point(savanna.lion.x,savanna.lion.y+.49,savanna.lion.z+.16)},
    lionGrass:worldScreen(savannaPoints.lionGrass),
    flowers:savanna.flowers.map(p=>({...p,screen:point(p.x,p.y,p.z)})),
    leaves:savanna.leaves.map(p=>({...p,screen:point(p.x,p.y,p.z)})),
    rock:point(savannaPoints.rock.x,savannaPoints.rock.y+.21,savannaPoints.rock.z+.68),
    nozzle:elephant.nozzle.getWorldPosition(nozzlePosition).toArray(),
    mouth:giraffe.mouth.getWorldPosition(mouthPosition).toArray(),events:savannaEvents.map(e=>({...e}))
   },river:{
    croc:{...croc.croc,screen:worldScreen(crocView.focusPoint(fanPosition))},
    hippo:{...river.hippo,screen:point(river.hippo.x,river.hippo.y+.49,river.hippo.z+.46)},
    toothbrush:{...river.toothbrush,screen:worldScreen(riverPoints.toothbrush),rail:[brushScreen(-1),brushScreen(1)],
     head:bank.toothbrushHead.getWorldPosition(toothPosition).toArray()},
    turtle:{...river.turtle,screen:point(river.turtle.x,river.turtle.y+.25,river.turtle.z)},
    rhino:{...river.rhino,muzzle:{...rhino.muzzle.getWorldPosition(toothPosition)},screen:point(river.rhino.x,river.rhino.y+.72,river.rhino.z)},
    stones:riverPoints.turtleSites.map(p=>point(p.x,p.y,p.z)),
    grass:riverPoints.grass.map(p=>point(p.x,p.y+.06,p.z)),
    grassTips:bank.grassTips.map(tip=>({...tip.getWorldPosition(toothPosition)})),
    leaves:river.leaves.map(p=>({...p,screen:point(p.x,p.y,p.z)})),
    fish:river.fish.map(p=>({...p,screen:point(p.x,p.y,p.z)})),
    bird:{...river.bird,screen:bankBirdScreen(river.bird)},
    ducks:river.ducks.map(p=>({...p,screen:riverDuckScreen(p)})),
    waves:river.waves.map(w=>({...w})),events:riverEvents.map(e=>({...e}))
   },woodland:{
    fox:{...woodland.fox,screen:point(woodland.fox.x,woodland.fox.y+.39,woodland.fox.z)},
    squirrel:{...woodland.squirrel,screen:point(woodland.squirrel.x,woodland.squirrel.y+.30,woodland.squirrel.z)},
    pecker:{...woodland.pecker,screen:peckerScreen(woodland.pecker)},
    roots:woodlandPoints.squirrelRoots.map(p=>point(p.x,p.y,p.z)),
    perch:point(woodlandPoints.squirrelPerch.x,woodlandPoints.squirrelPerch.y,woodlandPoints.squirrelPerch.z),
    wood:woodlandPoints.wood.map(p=>point(p.x,p.y,p.z)),
    litter:woodland.litter.map(p=>({...p,screen:point(p.x,p.y+.052,p.z)})),
    bill:pecker.beak.getWorldPosition(billPosition).toArray(),events:woodlandEvents.map(e=>({...e}))
   },asia:{
    bear:{...asia.bear,screen:point(asia.bear.x,asia.bear.y+.61+asia.bear.stand*.39,asia.bear.z+.15)},
    tiger:{...asia.tiger,screen:point(asia.tiger.x,asia.tiger.y+.50,asia.tiger.z)},
    peacock:{...asia.peacock,screen:peacockScreen(asia.peacock)},
    peacockFan:peacock.fanEyes.map(nodeScreen),
    peacockSeedStone:worldScreen(asiaPoints.peacockSeedStone),
    seeds:asia.seeds.map(p=>({...p,screen:worldScreen(p)})),
    owl:{...asia.owl,screen:point(asia.owl.x,asia.owl.y+.43,asia.owl.z+.06)},
    leaf:{...asia.leaf,screen:point(asia.leaf.x,asia.leaf.y,asia.leaf.z)},
    tuft:{...asia.tuft,screen:point(asia.tuft.x,asia.tuft.y,asia.tuft.z)},
    fruits:asia.fruits.map(f=>({...f,screen:point(f.x,f.y,f.z)})),
    sharedFruit:{...asia.sharedFruit,screen:worldScreen(asia.sharedFruit)},events:asiaEvents.map(e=>({...e}))
   },rainforest:{
    macaw:{...macaw.bird,screen:point(macaw.bird.x,macaw.bird.y+.42,macaw.bird.z)},
    monkey:{...rainforest.monkey,screen:point(rainforest.monkey.x,rainforest.monkey.y+.34,rainforest.monkey.z+.10)},
    sloth:{...rainforest.sloth,screen:slothScreen(rainforest.sloth),face:nodeScreen(sloth.face)},
    slothBough:worldScreen(rainPoints.slothBough),
    groundMonkey:{...rainforest.groundMonkey,screen:point(rainforest.groundMonkey.x,rainforest.groundMonkey.y+.36,rainforest.groundMonkey.z+.08)},
    dropBanana:{...rainforest.dropBanana,screen:worldScreen(rainforest.dropBanana)},
    toucan:{...rainforest.toucan,screen:toucanScreen(rainforest.toucan)},
    bananas:rainforest.bananas.map(f=>({...f,screen:point(f.x,f.y,f.z)})),
    monkeyBranches:rainPoints.monkeyBranches.map(p=>point(p.x,p.y-.037,p.z+.11)),
    leaf:{...rainforest.leaf,screen:point(rainforest.leaf.x,rainforest.leaf.y,rainforest.leaf.z)},
    berry:{...rainforest.berry,screen:point(rainforest.berry.x,rainforest.berry.y,rainforest.berry.z)},
    events:rainforestEvents.map(e=>({...e}))
   },coast:{
    penguins:coast.penguins.map((p,i)=>({...p,screen:penguinScreen(p),belly:penguins[i].belly.getWorldPosition(new T.Vector3()).toArray(),
     feet:penguins[i].feet.map(foot=>foot.getWorldPosition(new T.Vector3()).toArray())})),
    ramps:penguins.map((_,i)=>slopeScreen(i)),stones:penguins.map((_,i)=>stoneScreen(i)),
    fish:coast.fish.map(p=>({...p,screen:point(p.x,p.y,p.z)})),water:point(36.8,coastWaterY,18),
    crab:{...coast.crab,screen:point(coast.crab.x,coast.crab.y+.17,coast.crab.z)},tidePool:worldScreen(coastPoints.tidePool),
    kelp:coast.kelp.map(p=>({...p,screen:worldScreen(p)})),fry:coast.fry.map(f=>({...f,screen:worldScreen(f)})),
    waves:coast.waves.map(w=>({...w})),events:coastEvents.map(e=>({...e}))
   },ocean:{
    animals:Object.fromEntries(Object.entries(ocean.animals).map(([name,a])=>[name,{...a,screen:point(a.x,a.y+(name==='star'?.04:0),a.z)}])),
    visitor:{...ocean.visitor,screen:worldScreen(ocean.visitor)},
    props:Object.fromEntries(['anemone','kelp','shell'].map(name=>[name,worldScreen(oceanPoints[name])])),
    events:oceanEvents.map(e=>({...e}))
   }
  };
 };
 requestAnimationFrame(render);
}
try{
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 setup(renderer);
}catch(error){
 console.error(error);root.classList.add('ready');$('unsupported').hidden=false;
}
