(function(){
 'use strict';const G=window.SpringGarden,C=G.core,M=G.motion,A=G.art,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
 const scene=$('scene'),app=$('app'),canvas=$('effects'),pen=canvas.getContext('2d'),cursor=$('cursor');
 const actors=new Map(),flowerEntities=[],particles=[],specials=[],grown=[],timers=new Set(),budget=new C.EffectBudget(),cooldown=new C.Cooldown(1500),plantGate=new C.Cooldown(160),visits=new C.Visits(['cat','dog','monkey','peacock','tiger','zebra','hippo','rhino','turtle','penguin','elephant','giraffe']);
 const names={cat:'猫猫',dog:'小狗',bird:'小鸟',butterfly:'蝴蝶',elephant:'大象',giraffe:'长颈鹿',monkey:'猴子',peacock:'孔雀',tiger:'老虎',zebra:'斑马',hippo:'河马',rhino:'犀牛',turtle:'乌龟',fish:'鱼儿',penguin:'企鹅'};
 const environment=C.theme(),futureThemes={time:['day','night'],season:['spring','summer','autumn','winter'],scene:['meadow-sunny','underwater','meadow-rain']};
 scene.dataset.time=environment.time;scene.dataset.season=environment.season;scene.dataset.scene=environment.scene;
 let view=C.viewport(innerWidth,innerHeight),rect=scene.getBoundingClientRect(),clock=0,lastFrame=performance.now(),paused=false,manualPause=false,resting=false,pointerDown=false,pointer={x:800,y:600},pointerActive=false,dwell=null,lastTrail=0,lastPlant=0,lastPond=0,lastSurprise=0,interactions=0,flowersMade=0,clicked=0,mainEventUntil=0,sessionTime=0,duration=0,gestureStarted=false;
 let cloudDrag=null;let celestialDwell=null;const light=G.daynight,nightMix=()=>light.cycle.value;
 const departures=[];const scheduled=[],reactionVersions=new WeakMap();let pausedAnimations=[],encounterSequence=0,userGuestUntil=0,soundIntent=0;
 const harvest=new M.Harvest(['apple-0','apple-1','apple-2','apple-3']),appleNodes=new Map(),appleMoves=[],groundApples=new Map();
 const basketSlots=[{x:-22,y:-14},{x:0,y:-19},{x:21,y:-13},{x:4,y:-35}],groundSlots=[{x:313,y:611},{x:355,y:611},{x:338,y:650},{x:383,y:634}];
 let lastButterfly=null;const butterflies=()=>[...actors.values()].filter(a=>a.kind==='butterfly');
 const guestPads=[{x:655,y:474},{x:1030,y:608}];
 const sizes={cat:184,dog:205,elephant:248,giraffe:282,monkey:200,peacock:224,tiger:230,zebra:248,hippo:230,rhino:248,turtle:150,penguin:183};
 const props=[{x:0,y:0,w:410,h:595},{x:1190,y:200,w:365,h:360},{x:1173,y:575,w:367,h:173},{x:96,y:638,w:99,h:73},{x:246,y:647,w:55,h:76},{x:846,y:286,w:57,h:191}];
 const petReservations=[{x:380,y:540,w:240,h:175},{x:633,y:534,w:262,h:181}];
 const reserved=[{x:510,y:199,w:291,h:283},{x:883,y:322,w:295,h:286}];
 function boundsOf(a,p=a){const b=a.id==='bird'&&a.flight?{x:-12,y:-10,w:224,h:190}:a.visual||{x:6,y:12,w:188,h:172};return{x:p.x+(b.x/200-.5)*a.size-5,y:p.y+(b.y/200-1)*a.size-5,w:b.w/200*a.size+10,h:b.h/200*a.size+10}}
 function flowerBounds(f){return{x:f.x-32,y:(f.baseY??f.y+15)-32,w:64,h:76}}
 function overlaps(a,b,gap=14){return!C.separated(a,b,gap)}
 function worldBox(node){const b=node.getBoundingClientRect();return{x:(b.x-rect.left-view.ox)/view.scale,y:(b.y-rect.top-view.oy)/view.scale,w:b.width/view.scale,h:b.height/view.scale}}
 function anchor(node,x=0,y=0){if(!node?.isConnected)return null;const matrix=node.getScreenCTM();if(!matrix)return null;const p=new DOMPoint(x,y).matrixTransform(matrix).matrixTransform(scene.getScreenCTM().inverse());return{x:p.x,y:p.y}}
 function modelAnchor(a,name){const n=a.node.querySelector('[data-anchor="'+name+'"]');return n?anchor(n,Number(n.getAttribute('cx')),Number(n.getAttribute('cy'))):null}
 function moveTo(a,p){const zone=a.zone;if(zone)p={x:clamp(p.x,zone.x,zone.x+zone.w),y:clamp(p.y,zone.y,zone.y+zone.h)};a.target=p}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function element(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}
 function later(ms,fn){scheduled.push({due:clock+ms,fn})}
 function animateClass(node,cls,ms=1600){let versions=reactionVersions.get(node);if(!versions){versions=new Map();reactionVersions.set(node,versions)}const version=(versions.get(cls)||0)+1;versions.set(cls,version);node.classList.remove(cls);void node.getBoundingClientRect();node.classList.add(cls);later(ms,()=>{if(versions.get(cls)===version)node.classList.remove(cls)})}
 function resize(){rect=scene.getBoundingClientRect();view=C.viewport(rect.width,rect.height);const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);canvas.style.width=rect.width+'px';canvas.style.height=rect.height+'px';pen.setTransform(dpr,0,0,dpr,0,0)}
 function point(ev){return view.toWorld(ev.clientX-rect.left,ev.clientY-rect.top)}
 function valid(p){return p.x>=0&&p.y>=0&&p.x<=1600&&p.y<=900}
 function emit(kind,x,y,want=4){
  const n=budget.take(clock,want,particles.length);
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;particles.push({kind,x,y,vx:Math.cos(a)*(25+Math.random()*30),vy:Math.sin(a)*20-20,size:4+Math.random()*5,born:clock,life:850+Math.random()*650,rotation:Math.random()*6,color:['#f0c5bb','#f5dcac','#f8eee0','#d2d7b6'][i%4]})}
 }
 function special(type,x,y,extra={}){if(specials.length>=12){const old=specials.findIndex(s=>s.type!=='spray');specials.splice(Math.max(0,old),1)}const item={type,x,y,born:clock,life:type==='rainbow'?5000:type==='spray'?5500:1800,...extra};specials.push(item);return item}
 function splash(x,y,pond=false,small=false){const n=budget.take(clock,small?3:7,particles.length),drops=Array.from({length:n},(_,i)=>({vx:(i-(n-1)/2)*17,vy:-55-Math.random()*55,gravity:280,r:small?1.8:2.8}));special('splash',x,y,{life:900,pond,drops});if(pond)special('ripple',x,y,{life:1400,pond:true})}
 function heart(x,y){special('heart',x,y)}
 function basketSlot(id){const slot=basketSlots[Number(id.split('-')[1])];return anchor($('basket'),slot.x,slot.y)}
 function appleFigure(id){const n=element('g',{'data-harvest-id':id});n.innerHTML='<use href="#appleArt"/>';return n}
 function renderBasket(){const contents=$('basketContents');contents.replaceChildren();for(const [id,state]of harvest.states)if(state==='basket'){const n=appleFigure(id),p=basketSlots[Number(id.split('-')[1])];n.dataset.collectedApple=id;n.setAttribute('transform',`translate(${p.x} ${p.y}) scale(.43)`);contents.appendChild(n)}}
 function moveApple(id,from,to,kind){const node=appleFigure(id);node.setAttribute('pointer-events','none');node.setAttribute('transform',`translate(${from.x} ${from.y}) scale(${kind==='falling'?1:.43})`);$('harvestApples').appendChild(node);appleMoves.push({id,node,from,to,kind,born:clock,duration:kind==='falling'?1100:850});renderBasket()}
 function takeApple(node){const id=node.dataset.harvestId,state=harvest.states.get(id);if(state==='tree'&&harvest.pick(id)){const from=anchor(node);node.style.display='none';moveApple(id,from,basketSlot(id),'falling');shakeTree($('appleTree'));if(actors.has('cat'))reaction('cat');else summon('cat');interactions++}else if(state==='ground'&&harvest.collect(id)){const from=anchor(node);groundApples.get(id)?.remove();groundApples.delete(id);moveApple(id,from,basketSlot(id),'returning');interactions++}}
 function useBasket(){animateClass($('basket'),'basket-touched',850);if(harvest.counts().moving)return;const ids=harvest.drop();if(ids.length){for(const id of ids)moveApple(id,basketSlot(id),groundSlots[Number(id.split('-')[1])],'spilling')}else for(const [id,state]of harvest.states)if(state==='ground'&&harvest.collect(id)){const node=groundApples.get(id),from=anchor(node);node.remove();groundApples.delete(id);moveApple(id,from,basketSlot(id),'returning')}interactions++}
 function stepHarvest(){for(let i=appleMoves.length-1;i>=0;i--){const s=appleMoves[i],t=clamp((clock-s.born)/s.duration,0,1),q=t*t*(3-2*t),to=s.kind==='spilling'?s.to:basketSlot(s.id);const x=s.from.x+(to.x-s.from.x)*q,y=s.kind==='falling'?s.from.y+(to.y-s.from.y)*t*t:s.from.y+(to.y-s.from.y)*t-Math.sin(t*Math.PI)*42,scale=s.kind==='falling'?1-.57*q:.43;s.node.setAttribute('transform',`translate(${x} ${y}) scale(${scale})`);if(t<1)continue;harvest.land(s.id);s.node.remove();appleMoves.splice(i,1);if(harvest.states.get(s.id)==='ground'){const n=appleFigure(s.id);n.classList.add('fruit');n.dataset.fruit='apple';n.setAttribute('transform',`translate(${to.x} ${to.y}) scale(.43)`);$('harvestApples').appendChild(n);groundApples.set(s.id,n)}renderBasket()}}
 function flowerContact(f){const n=f.node.querySelector('.nectar-anchor');return n?anchor(n,14,-14):null}
 function butterflyObstacles(sourceId,destinationId,self){
  // A butterfly's centre needs more room above than below its asymmetric silhouette.
  const expand=b=>({x:b.x-21,y:b.y-14,w:b.w+42,h:b.h+32});
  const boxes=reserved.concat(petReservations,[{x:1135,y:548,w:264,h:205}],[...actors.values()].filter(a=>a!==self&&a.kind!=='fish').map(a=>{const b=worldBox(a.node);return a.zone?{x:b.x+a.zone.x-a.x,y:b.y+a.zone.y-a.y,w:b.w+a.zone.w,h:b.h+a.zone.h}:b}),[...document.querySelectorAll('[data-fruit]')].filter(n=>n.getBoundingClientRect().width>0).map(worldBox));
  return boxes.concat(allFlowers().filter(f=>f.node.isConnected&&f.id!==sourceId&&f.id!==destinationId).map(f=>worldBox(f.node))).map(expand)
 }

 function flightLift(route,obstacles){if(route.length!==2)return 0;for(let lift=38;lift>0;lift-=2){let previous=route[0],safe=true;for(let i=1;i<=64;i++){const t=i/64,p=M.routePoint(route,t*t*(3-2*t));p.y-=Math.sin(t*Math.PI)*lift;if(p.y<90||!M.segmentClear(previous,p,obstacles)){safe=false;break}previous=p}if(safe)return lift}return 0}
 function flyButterfly(p,force=false,requested=null,actor=null){
  const targetFlower=requested||null,owner=targetFlower&&butterflies().find(b=>b.perch?.id===targetFlower.id||b.flight?.flower.id===targetFlower.id||b.requestedFlower?.id===targetFlower.id),airborne=butterflies().find(b=>b.flight),near=butterflies().sort((u,v)=>Math.hypot(u.x-p.x,u.y-p.y)-Math.hypot(v.x-p.x,v.y-p.y));
  let a=actor||owner||airborne||near[0];
  // Redirect an existing flight immediately; at rest choose the nearest reachable insect.
  if(force&&targetFlower&&!actor&&!owner&&!airborne){const contact=flowerContact(targetFlower);a=near.find(b=>M.flightRoute({x:b.x,y:b.y-.45*b.size},{x:contact.x,y:contact.y-.145*b.size},butterflyObstacles(b.perch?.id,targetFlower.id,b),{x:28,y:90,w:1544,h:704}))||a}
  if(!a||(a.flight||a.requestedFlower)&&!force)return;if(force&&!actor)lastButterfly=a;const from={x:a.x,y:a.y-.45*a.size},sourceId=a.perch?.id||a.flight?.fromFlower;let flowers=allFlowers().filter(f=>f.kind!=='lily'&&f.node.isConnected).sort((u,v)=>Math.hypot(u.x-p.x,u.y-p.y)-Math.hypot(v.x-p.x,v.y-p.y));
  if(force){const exact=requested||flowers[0];if(!exact?.node.isConnected)return;a.requestedFlower=exact;flowers=[exact];if(a.perch?.id===exact.id){a.requestedFlower=null;a.restUntil=clock+7000;if(!actor){a.reactUntil=clock+1100;a.node.classList.add('reacting')}return}}else flowers=flowers.filter(f=>f.id!==a.perch?.id);flowers=flowers.filter(f=>!butterflies().some(b=>b!==a&&(b.perch?.id===f.id||b.flight?.flower.id===f.id||b.requestedFlower?.id===f.id)));if(butterflies().some(b=>b!==a&&b.flight)){if(force&&flowers[0])a.requestedFlower=flowers[0];else a.restUntil=clock+1200;return}
  for(const f of flowers){const obstacles=butterflyObstacles(sourceId,f.id,a),contact=flowerContact(f),to={x:contact.x,y:contact.y-.145*a.size},route=M.flightRoute(from,to,obstacles,{x:28,y:90,w:1544,h:704});if(!route)continue;const fromFlower=a.perch?.id||a.flight?.fromFlower;a.perch=null;a.flight={route,to,flower:f,fromFlower,born:clock,duration:clamp(M.routeLength(route)/145*1000,1100,9000),obstacles,lift:flightLift(route,obstacles)};a.node.classList.remove('perching','facing-left');a.node.classList.add('flying');return}
 }
 function perchButterfly(a,f){const p=flowerContact(f);if(!p)return;const was=a.perch?.id===f.id;a.x=p.x;a.y=p.y+.305*a.size;a.perch=f;a.flight=null;if(a.requestedFlower?.id===f.id)a.requestedFlower=null;a.node.classList.remove('flying');a.node.classList.add('perching');if(!was)a.restUntil=clock+7000+Number(a.id.split('-')[1]||0)*2200+Math.random()*5000}
 function stepButterfly(a){if(a.requestedFlower&&!a.requestedFlower.node.isConnected)a.requestedFlower=null;if(a.flight){const f=a.flight;if(!f.flower.node.isConnected){a.flight=null;if(a.requestedFlower)flyButterfly(a.requestedFlower,true,a.requestedFlower,a);else flyButterfly(a,false,null,a);return}const elapsed=Math.min(50,Math.max(0,clock-(f.tick??f.born)));f.tick=clock;f.elapsed=(f.elapsed||0)+elapsed;const t=clamp(f.elapsed/f.duration,0,1),q=t*t*(3-2*t),p=M.routePoint(f.route,q),lift=Math.sin(t*Math.PI)*f.lift,flutter=Math.sin(t*Math.PI)*Math.sin(clock/140)*2;
   const contact=flowerContact(f.flower),goal=contact?{x:contact.x,y:contact.y-.145*a.size}:f.to,u=clamp((t-.55)/.45,0,1),blend=u*u*(3-2*u);p.x+=(goal.x-f.to.x)*blend;p.y+=(goal.y-f.to.y)*blend;
   const base={x:p.x,y:p.y-lift},wander={x:p.x,y:base.y+flutter},live=butterflyObstacles(f.fromFlower,f.flower.id,a),previous={x:a.x,y:a.y-.45*a.size},maxAdvance=Math.max(.25,elapsed*.25);
   const advance=next=>{const d=Math.hypot(next.x-previous.x,next.y-previous.y),q=d>maxAdvance?maxAdvance/d:1;return{x:previous.x+(next.x-previous.x)*q,y:previous.y+(next.y-previous.y)*q}},drift=advance(wander),steady=advance(base);let chosen=M.pointClear(drift,live)&&M.segmentClear(previous,drift,live)?drift:steady;
   if(!M.pointClear(chosen,live)||!M.segmentClear(previous,chosen,live)){if(clock>(a.retryFlight||0)){a.retryFlight=clock+250;const wanted=a.requestedFlower||f.flower;flyButterfly(wanted,true,wanted,a)}return}a.x=chosen.x;a.y=chosen.y+.45*a.size;a.node.style.setProperty('--butterfly-pitch',(Math.sin(clock/260)*9)+'deg');if(t>=1&&Math.hypot(chosen.x-goal.x,chosen.y-goal.y)<.5)perchButterfly(a,f.flower)}else if(a.perch?.node.isConnected){perchButterfly(a,a.perch);if(a.requestedFlower){if(clock>(a.retryFlight||0)){a.retryFlight=clock+250;flyButterfly(a.requestedFlower,true,a.requestedFlower,a)}return}if(environment.time==='day'&&clock>a.restUntil){const near=allFlowers().filter(f=>f.id!==a.perch.id&&f.kind!=='lily'&&f.node.isConnected).sort((u,v)=>Math.hypot(u.x-a.x,u.y-a.y)-Math.hypot(v.x-a.x,v.y-a.y));const f=near[Math.floor(Math.random()*Math.min(2,near.length))];if(f)flyButterfly({x:f.x,y:f.y},false,null,a)}}else if(a.requestedFlower)flyButterfly(a.requestedFlower,true,a.requestedFlower,a);else flyButterfly(a,false,null,a)}
 function poseElephant(a){if(a.wateringSince===undefined)return;const age=clock-a.wateringSince,t=age<450?age/450:age<2400?1:1-(age-2400)/800,q=clamp(t,0,1)**2*(3-2*clamp(t,0,1)),mix=(u,v)=>u+(v-u)*q;
  const rest=[176,98,194,117,188,148,187,167,169,169,158,170,153,159,154,151,160,151,167,161,173,151,175,134,163,119],aim=[176,98,203,101,217,92,229,81,224,73,220,64,214,68,207,72,211,78,218,77,214,86,200,98,163,119],p=rest.map((v,i)=>mix(v,aim[i]));let d=`M${p[0]} ${p[1]}`;for(let i=2;i<p.length;i+=4)d+=`Q${p[i]} ${p[i+1]} ${p[i+2]} ${p[i+3]}`;a.node.querySelector('.trunk-skin').setAttribute('d',d+'Z');
  const tip=a.node.querySelector('[data-anchor="trunk-tip"]'),inside=a.node.querySelector('[data-anchor="trunk-inner"]');const x=mix(157,219),y=mix(155,70);tip.setAttribute('cx',x);tip.setAttribute('cy',y);tip.setAttribute('transform',`rotate(${mix(-30,50)} ${x} ${y})`);inside.setAttribute('cx',mix(165,213));inside.setAttribute('cy',mix(160,75));
  a.node.querySelector('.trunk-wrinkles').setAttribute('d',`M${mix(177,189)} ${mix(126,99)}l${mix(9,2)} ${mix(2,8)}m${mix(-7,5)} ${mix(9,-12)}l${mix(7,3)} ${mix(1,7)}m${mix(-10,5)} ${mix(11,-14)}l${mix(9,4)} ${mix(2,5)}`);if(age>=3200)delete a.wateringSince;
 }
 function startWatering(a){if(a.arrival){later(800,()=>{if(actors.get(a.id)===a)startWatering(a)});return}const bird=actors.get('bird');if(bird&&bird.x>700)flit('bird',{x:445,y:367});a.waterBusyUntil=clock+5500;a.reactUntil=clock+3200;a.wateringSince=clock;const left=actors.has('hippo')&&a.x>900;a.node.classList.toggle('facing-left',left);const sign=left?-1:1,origin={x:a.x+sign*.595*a.size,y:a.y-.65*a.size},direction={x:sign*.76822128,y:-.6401844},obstacles=[...actors.values()].filter(other=>other!==a&&!['butterfly','fish'].includes(other.kind)&&!(other.id==='bird'&&other.flight)).map(other=>boundsOf(other)).concat([worldBox($('bananaTree').querySelector(':scope > path')),worldBox($('bananaTree').querySelector('[data-fruit]'))]),clear=target=>{const jet=G.nature.waterJet(origin,direction,target);let previous=origin;for(let i=1;i<=64;i++){const next=G.nature.jetPoint(jet,i/64);if(!M.segmentClear(previous,next,obstacles))return false;previous=next}return true},flower=flowerEntities.filter(f=>(f.x-origin.x)*sign>80).sort((u,v)=>Math.abs(u.x-origin.x)-Math.abs(v.x-origin.x)).find(f=>clear(flowerContact(f)))||null,targetPoint=flower?null:[{x:1340,y:696},{x:1400,y:730},{x:1440,y:730},{x:1400,y:710},{x:1470,y:685},{x:1370,y:745}].find(p=>isPond(p)&&clear(p));if(!flower&&!targetPoint){delete a.wateringSince;return}if(flower){const insect=butterflies().find(b=>b.perch?.id===flower.id||b.flight?.flower.id===flower.id);if(insect)flyButterfly(insect,false,null,insect)}mainEventUntil=Math.max(mainEventUntil,clock+5500);special('spray',0,0,{actor:a,flower,targetPoint,life:5500,delay:450,emitDuration:1800,lastImpact:-Infinity});later(800,()=>{if(actors.get(a.id)!==a)return;if(nightMix()<.5)special('rainbow',a.x+sign*175,a.y-105,{life:4500})})}
 function posePeacock(a){const age=a.displaySince===undefined?4800:clock-a.displaySince,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)},lift=age<420?smooth(age/420):age<4350?1:1-smooth((age-4350)/450),spread=age<1400?smooth((age-420)/980):age<3600?1:1-smooth((age-3600)/750);a.open=spread;const fan=a.node.querySelector('.fan');fan.style.opacity=1;a.node.querySelector('.resting-train').style.display='none';for(const n of fan.children){const angle=Number(n.dataset.angle),i=Number(n.dataset.order),r=-100*(1-lift)+angle*spread+(i-9)*.25*(1-spread)+(spread>.98?Math.sin(clock/75+i*.8)*.36:0);n.setAttribute('transform',`rotate(${r} 100 139)`)}if(age>=4800)delete a.displaySince}
 function toggleLight(){if(paused||!light.toggle(clock))return false;mainEventUntil=Math.max(mainEventUntil,clock+3500);celestialDwell={since:clock,done:true};return true}
 function stepLight(){const q=light.render(clock);environment.time=q>=.5?'night':'day';scene.dataset.time=environment.time;if(celestialDwell&&!celestialDwell.done){const u=clamp((clock-celestialDwell.since)/1400,0,1);$('daynightProgress').setAttribute('stroke-dashoffset',553*(1-u));if(u===1){celestialDwell.done=true;toggleLight()}}else $('daynightProgress').setAttribute('stroke-dashoffset',553)}
 function drawEffects(dt){
  pen.clearRect(0,0,rect.width,rect.height);pen.save();pen.translate(view.ox,view.oy);pen.scale(view.scale,view.scale);
  for(let i=particles.length-1;i>=0;i--){const p=particles[i],t=(clock-p.born)/p.life;if(t>=1){particles.splice(i,1);continue}p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=dt*(p.kind==='water'?.28:.016);pen.save();pen.globalAlpha=(1-t)*.85;pen.translate(p.x,p.y);pen.rotate(p.rotation+t*3);pen.fillStyle=p.color;
   if(p.kind==='glow'){pen.fillStyle='#f6e7aa';pen.shadowColor='#fff1ae';pen.shadowBlur=9;pen.beginPath();pen.arc(0,0,p.size*.35,0,Math.PI*2);pen.fill()}else if(p.kind==='water'){pen.fillStyle='#d8f0e7';pen.beginPath();pen.ellipse(0,0,p.size*.6,p.size,0,0,7);pen.fill()}else{pen.beginPath();pen.ellipse(0,0,p.size*.62,p.size,0,0,7);pen.fill()}pen.restore()}
  for(let i=specials.length-1;i>=0;i--){const s=specials[i],t=(clock-s.born)/s.life;if(t>=1){specials.splice(i,1);continue}pen.save();pen.globalAlpha=Math.sin(Math.PI*t)*.85;
   if(s.type==='ripple'){if(s.pond)pen.clip(pondShape);for(let j=0;j<3;j++){const u=clamp((clock-s.born-j*150)/1100,0,1);if(u<=0||u>=1)continue;pen.globalAlpha=(1-u)*.65;pen.strokeStyle=nightMix()>.5?'#cee7e2':'#edf7e3';pen.lineWidth=2.3-u;pen.beginPath();pen.ellipse(s.x,s.y,4+u*57,2+u*21,0,0,Math.PI*2);pen.stroke()}}
   if(s.type==='splash'){if(s.pond)pen.clip(pondShape);const age=(clock-s.born)/1000;for(const drop of s.drops){const p=G.nature.splashPoint(drop,age);if(p.y>0)continue;pen.globalAlpha=(1-t)*.85;pen.fillStyle='#d9f2ed';pen.beginPath();pen.ellipse(s.x+p.x,s.y+p.y,drop.r*.65,drop.r,Math.atan2(drop.vy+drop.gravity*age,drop.vx)-Math.PI/2,0,Math.PI*2);pen.fill()}if(t<.25){pen.strokeStyle='#e6f4e9';pen.lineWidth=1.7;pen.beginPath();pen.ellipse(s.x,s.y,4+t*38,2+t*12,0,0,Math.PI*2);pen.stroke()}}
   if(s.type==='heart'){const x=s.x,y=s.y-t*55;pen.fillStyle='#dba899';pen.beginPath();pen.moveTo(x,y+13);pen.bezierCurveTo(x-29,y-1,x-22,y-22,x,y-9);pen.bezierCurveTo(x+22,y-22,x+29,y-1,x,y+13);pen.fill()}
   if(s.type==='bubble'){if(s.pond)pen.clip(pondShape);for(let j=0;j<5;j++){const x=s.x+Math.sin(j*2+t*3)*25,y=s.y-t*(60+j*13);pen.strokeStyle='#f4f8e8';pen.lineWidth=2;pen.beginPath();pen.arc(x,y,6+j*2,0,7);pen.stroke();pen.beginPath();pen.arc(x-2,y-2,2,0,7);pen.stroke()}}
   if(s.type==='rainbow'){const cols=['#d9bad4','#b7c7df','#aed4d4','#b4d1b0','#ecdf9d','#e6c69d','#e2aaa0'];pen.globalAlpha*=.5*(1-nightMix());pen.lineWidth=7;pen.lineCap='round';cols.forEach((c,j)=>{pen.strokeStyle=c;pen.beginPath();pen.arc(s.x,s.y,110+j*10,Math.PI,Math.PI*2);pen.stroke()})}
   if(s.type==='spray'){
    s.origin=null;const age=clock-s.born,active=age>=s.delay&&age<s.delay+s.emitDuration;
    if(active&&actors.get(s.actor.id)===s.actor){const origin=modelAnchor(s.actor,'trunk-tip'),target=s.targetPoint||flowerContact(s.flower),back=modelAnchor(s.actor,'trunk-inner');if(origin&&target&&back){const dx=origin.x-back.x,dy=origin.y-back.y,length=Math.hypot(dx,dy)||1;s.direction={x:dx/length,y:dy/length};s.origin=origin;s.target=target;s.jet=G.nature.waterJet(origin,s.direction,target)}}
    if(s.jet){const travel=s.jet.duration*1000,front=clamp((age-s.delay)/travel,0,1),tail=clamp((age-s.delay-s.emitDuration)/travel,0,1);if(front>tail){pen.globalAlpha=.7;pen.strokeStyle='#9acddc';pen.lineWidth=2.8;pen.lineCap='round';pen.beginPath();for(let j=0;j<=48;j++){const p=G.nature.jetPoint(s.jet,tail+(front-tail)*j/48);j?pen.lineTo(p.x,p.y):pen.moveTo(p.x,p.y)}pen.stroke();for(let j=0;j<22;j++){const u=((age-s.delay)/travel+j/22)%1;if(u<tail||u>front)continue;const p=G.nature.jetPoint(s.jet,u);pen.fillStyle=j%3?'#c2e6ed':'#f3fcf7';pen.beginPath();pen.ellipse(p.x,p.y,1.7,2.7,-.4,0,Math.PI*2);pen.fill()}}
     if(front===1&&tail<1&&clock-s.lastImpact>160){s.lastImpact=clock;splash(s.jet.target.x,s.jet.target.y,!!s.targetPoint,true);if(!s.landed){s.landed=true;if(s.flower){touchFlower(s.flower);grow(s.flower.x+55,s.flower.baseY-5,A.flowers[flowersMade%6])}}}
    }
   }
   if(s.type==='ball'){const x=s.x+Math.sin(t*Math.PI)*70,y=s.y-Math.abs(Math.sin(t*Math.PI*3))*28;pen.fillStyle='#d8b79e';pen.beginPath();pen.arc(x,y,14,0,7);pen.fill();pen.strokeStyle='#f9eacb';pen.lineWidth=4;pen.beginPath();pen.arc(x,y,10,-.7,1.8);pen.stroke()}
   if(s.type==='leaf'){for(let j=0;j<6;j++){const x=s.x+Math.sin(j+t*3)*65,y=s.y+t*90+j*9;pen.fillStyle=j%2?'#bad0a0':'#ecbfbd';pen.beginPath();pen.ellipse(x,y,7,12,t*3+j,0,7);pen.fill()}}
   pen.restore()}
  if(nightMix()>.01){for(let i=0;i<13;i++){const x=390+(i*97)%760+Math.sin(clock/2300+i)*16,y=540+(i*59)%245+Math.cos(clock/2100+i)*11,alpha=nightMix()*(.12+.28*(1+Math.sin(clock/800+i))/2);pen.globalAlpha=alpha;const glow=pen.createRadialGradient(x,y,0,x,y,12);glow.addColorStop(0,'#fff2b1');glow.addColorStop(1,'#fff2b100');pen.fillStyle=glow;pen.beginPath();pen.arc(x,y,12,0,Math.PI*2);pen.fill();pen.globalAlpha=nightMix()*.7;pen.fillStyle='#f7eabd';pen.beginPath();pen.arc(x,y,1.5,0,Math.PI*2);pen.fill()}}
  pen.restore();
 }
 function renderAnimal(id,x,y,size,guest=false,kind=id){
  if(actors.has(id))return actors.get(id);for(let i=departures.length-1;i>=0;i--)if(departures[i].id===id){departures[i].wrapper.remove();departures.splice(i,1)}
  const wrapper=element('g',{'data-actor':id});const svg=element('svg',{x:-size/2,y:-size,width:size,height:size,viewBox:'0 0 200 200',overflow:'visible'});svg.innerHTML=A.animal(kind);wrapper.appendChild(element('ellipse',{cx:0,cy:-size*.09,rx:size*.29,ry:size*.045,fill:'#819774',opacity:kind==='bird'||kind==='butterfly'||kind==='fish'?'0':'.14'}));wrapper.appendChild(svg);const node=svg.querySelector('.creature-art');node.classList.add('creature');node.setAttribute('aria-label',names[kind]);$('animals').appendChild(wrapper);
  const box=node.getBBox(),bx=Math.min(box.x,200-box.x-box.width);const visual=kind==='butterfly'?{x:22,y:26,w:156,h:132}:id==='dog'?{x:0,y:40,w:200,h:145}:id==='monkey'?{x:-8,y:22,w:216,h:163}:id==='giraffe'?{x:12,y:13,w:176,h:170}:id==='hippo'?{x:5,y:62,w:190,h:120}:id==='peacock'?{x:-24,y:8,w:248,h:177}:id==='penguin'?{x:30,y:25,w:140,h:160}:id==='elephant'?{x:-32,y:59,w:264,h:124}:{x:bx,y:box.y,w:200-2*bx,h:box.height};
  const actor={id,kind,node,wrapper,x,y,size,r:size*.34,visual,guest,born:clock,turn:++encounterSequence,expires:guest?clock+(['cat','dog'].includes(kind)?24000:38000):Infinity,target:null,flight:null,arrival:guest?{from:x-18,to:x,born:clock}:null,reactUntil:0,phase:Math.random()*6,walkDistance:0,zone:id==='cat'?{x:465,y:702,w:48,h:8}:id==='dog'?{x:746,y:702,w:36,h:8}:guest?{x:x-16,y,w:32,h:0}:null};actors.set(id,actor);if(id==='peacock')posePeacock(actor);place(actor);if(guest){node.classList.add('arriving');wrapper.animate([{opacity:0},{opacity:1}],{duration:700,easing:'ease-out'})}updatePortraits();return actor;
 }
 function place(a){a.wrapper.setAttribute('transform',`translate(${a.x.toFixed(2)} ${a.y.toFixed(2)})`)}
 function hitActors(){return [...actors.values()].map(a=>({id:a.id,x:a.x,y:a.y-a.size*.47,r:a.r,actor:a}))}
 function guestIds(){return[...actors.values()].filter(a=>a.guest&&!['cat','dog'].includes(a.kind)).map(a=>a.id)}
 function removeGuest(id){const a=actors.get(id);if(!a||!a.guest)return;actors.delete(id);if(['cat','dog'].includes(a.kind)){a.departingAt=clock;departures.push(a)}else a.wrapper.remove();updatePortraits()}
 function summon(id,location,react=true,ambient=false){
  if(paused)return null;
  if(id==='butterfly'){const a=butterflies()[0];if(react&&a)reaction(a.id);return a}
  if(react&&!ambient){userGuestUntil=clock+9000;soundIntent++}const intent=soundIntent;
  const pet=['cat','dog'].includes(id),existing=actors.get(id);if(existing){existing.turn=++encounterSequence;existing.expires=existing.guest?clock+(pet?24000:38000):Infinity;if(react)reaction(id,ambient?'ambient':'summon');return existing}
  while(!pet&&guestIds().length>=2){const old=[...actors.values()].filter(a=>a.guest&&!['cat','dog'].includes(a.kind)).sort((a,b)=>a.turn-b.turn)[0];removeGuest(old.id)}
  const size=sizes[id]||200,occupied=[...actors.values()].filter(a=>a.guest&&!['cat','dog','hippo'].includes(a.kind));
  const pad=guestPads.find(p=>occupied.every(a=>Math.abs(a.x-p.x)>130))||guestPads[0];
  const x=id==='cat'?486:id==='dog'?746:id==='hippo'?1265:pad.x,y=pet?710:id==='hippo'?733:pad.y;
  const a=renderAnimal(id,x,y,size,true);if(react)special('leaf',x,y-size*.65);visits.reset(clock);if(react)later(900,()=>{if(actors.get(id)===a)reaction(id,ambient?'ambient':'summon',ambient||intent===soundIntent)});return a;
 }
 function updatePortraits(){for(const n of document.querySelectorAll('[data-summon]'))n.classList.toggle('selected',[...actors.values()].some(a=>a.kind===n.dataset.summon))}
 function reaction(id,type='click',voice=true){
  const a=actors.get(id);if(!a)return;emit('petal',a.x,a.y-a.size*.6,type==='near'?2:5);
  if(clock<a.reactUntil||clock<(a.waterBusyUntil||0)||!cooldown.take('animal:'+id,clock))return;
  if(type==='click'||type==='near')soundIntent++;interactions++;a.reactUntil=clock+2600;a.expires=a.guest?clock+(['cat','dog'].includes(a.kind)?24000:38000):Infinity;if(a.guest&&type!=='ambient'&&voice){a.turn=++encounterSequence;userGuestUntil=clock+9000}a.node.classList.remove('reacting');void a.node.getBoundingClientRect();a.node.classList.add('reacting');if(voice&&gestureStarted)G.audio.play(id,{exclusive:type!=='ambient'});
  if(id==='cat'){heart(a.x,a.y-a.size*.8);if(Math.random()<.4)flit('butterfly',{x:a.x+60,y:a.y-90})}
  if(id==='dog'){special('ball',a.x+65,a.y-18);moveTo(a,{x:a.x>764?746:782,y:a.y});heart(a.x,a.y-a.size*.85)}
  if(id==='elephant')startWatering(a);
  if(id==='giraffe'){grow(a.x+40,a.y-24,'daisy');heart(a.x+45,a.y-a.size*.7)}
  if(id==='monkey'){a.reactUntil=clock+3600;special('leaf',a.x,a.y-a.size*.7);shakeTree($('bananaTree'));}
  if(id==='peacock'){a.displaySince=clock;a.reactUntil=clock+4800;mainEventUntil=Math.max(mainEventUntil,clock+4800);emit('petal',a.x,a.y-a.size*.5,8)}
  if(id==='tiger'){special('leaf',a.x+a.size*.24,a.y-55,{life:2000});heart(a.x,a.y-a.size*.7);flit('butterfly',{x:a.x+80,y:a.y-95})}
  if(id==='zebra'){later(900,()=>{if(actors.get(id)===a)emit('petal',a.x+a.size*.17,a.y-25,3)});for(const f of allFlowers().filter(f=>Math.hypot(f.x-a.x,f.y-a.y)<220))touchFlower(f)}
  if(id==='hippo'){const mouth=modelAnchor(a,'mouth');if(mouth)special('bubble',mouth.x,mouth.y,{pond:true});splash(a.x,a.y-23,true,true)}
  if(id==='rhino'){flit('butterfly',{x:a.x+a.size*.33,y:a.y-a.size*.5});special('leaf',a.x+60,a.y-100)}
  if(id==='turtle')moveTo(a,{x:a.x+16,y:a.y});
  if(id==='fish'){const mouth=modelAnchor(a,'mouth');if(mouth)special('bubble',mouth.x,mouth.y);moveTo(a,{x:clamp(pointer.x,1425,1480),y:clamp(pointer.y+40,688,735)})}
  if(id==='bird')flit('bird',{x:clamp(pointer.x+100,420,1150),y:clamp(pointer.y-40,220,560)});
  if(a.kind==='butterfly'){lastButterfly=a;flyButterfly(a,false,null,a)}
  if(id==='penguin'){heart(a.x,a.y-a.size*.8);special('leaf',a.x,a.y-100)}
 }
 function flit(id,p){
  if(id==='butterfly'){flyButterfly(p);return}
  const a=actors.get(id);if(!a)return;
  const spots=id==='bird'?[{x:445,y:367},{x:875,y:329}]:[{x:437,y:438},{x:846,y:492},{x:1540,y:650}];
  spots.sort((u,v)=>Math.hypot(u.x-p.x,u.y-p.y)-Math.hypot(v.x-p.x,v.y-p.y));let dest=spots[0];if(Math.hypot(dest.x-a.x,dest.y-a.y)<75)dest=spots[1];
  const airborne=!!a.flight,distance=Math.hypot(dest.x-a.x,dest.y-a.y),lift=id==='bird'?170:distance>650?310:155;
  a.node.classList.toggle('facing-left',dest.x<a.x);
  a.flight={from:{x:a.x,y:a.y},to:dest,ceiling:Math.min(a.y,dest.y)-lift,born:clock,duration:clamp(distance/(id==='bird'?200:150)*1000,1700,4200),launch:id==='bird'&&!airborne?230:0};a.target=null;
 }
 function grow(x,y,kind){
  if(!valid({x,y})||y<490||y>805)return;
  const found=C.findSpace({x,y:y+6},{w:64,h:76},props.concat(reserved,petReservations,[...actors.values()].filter(a=>!['bird','fish'].includes(a.id)).map(a=>boundsOf(a)),allFlowers().map(flowerBounds)),{x:24,y:498,w:1528,h:309},12);
  if(!found||Math.hypot(found.x-x,found.y-6-y)>140){const near=allFlowers().sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(near)touchFlower(near);return}x=found.x;y=found.y-6;
  if(grown.length>=40){const old=grown.shift();old.node.remove();cooldown.times.delete('flower:'+old.id)}
  const id='grown'+flowersMade,n=element('g',{transform:`translate(${x} ${y}) scale(.82)`,class:'flower','data-flower':kind});n.innerHTML=A.flower(kind,flowersMade++);$('grownFlowers').appendChild(n);n.querySelector('.flower-art').animate([{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)'}],{duration:600,easing:'cubic-bezier(.2,.9,.4,1)'});grown.push({id,node:n,x,baseY:y,y:y-15,kind});
 }
 function allFlowers(){return flowerEntities.concat(grown)}
 function touchFlower(f){if(!cooldown.take('flower:'+f.id,clock))return;animateClass(f.node,'touched',1000);emit('petal',f.x,f.y-20,3);if(Math.random()<.35)flit('butterfly',{x:f.x+35,y:f.y-60})}
 function shakeTree(node){animateClass(node,'tree-touched',1700);special('leaf',node.id==='appleTree'?220:1370,node.id==='appleTree'?230:400)}
 function fruit(node,p){
  if(node.dataset.fruit==='apple'){takeApple(node);return}
  const id=node.dataset.fruit;emit('petal',p.x,p.y,4);if(!cooldown.take('fruit:'+id,clock))return;
  interactions++;animateClass(node,'touched',1800);
  if(id==='banana'){shakeTree($('bananaTree'));summon('monkey',null,true)}
  if(id==='watermelon'){special('bubble',p.x,p.y);flit('butterfly',{x:p.x+70,y:p.y-80});if(clock-lastSurprise>6000){summon('turtle',{x:p.x-90,y:p.y-60});lastSurprise=clock}}
  if(id==='strawberry'){flit('butterfly',{x:p.x-30,y:p.y-40});heart(p.x,p.y-35)}
 }
 const pondShape=new Path2D($('pondWater').getAttribute('d'));
 function isPond(p){return $('pondWater').isPointInFill(new DOMPoint(p.x,p.y))}
 function isCelestial(p){return Math.hypot(p.x-1185,p.y-137)<98}
 function explore(p,target,type){
  if(!valid(p)||paused)return;
  if(isCelestial(p)){toggleLight();return}
  if(type==='click'&&isPond(p))splash(p.x,p.y,true);
  const portrait=target?.closest?.('[data-summon]');if(portrait){summon(portrait.dataset.summon,null,true);return}
  const fruitNode=target?.closest?.('[data-fruit]');if(fruitNode){fruit(fruitNode,p);return}
  if(target?.closest?.('[data-hotspot="basket"]')){useBasket();return}
  const flowerNode=target?.closest?.('.flower'),directFlower=flowerNode&&allFlowers().find(f=>f.node===flowerNode);if(directFlower){touchFlower(directFlower);if(type==='click')flyButterfly({x:directFlower.x,y:directFlower.y},true,directFlower);return}
  const h=C.pick(p,hitActors(),view.scale);if(h){reaction(h.id,type);return}
  const f=C.pick(p,allFlowers().map(f=>({...f,r:20})),view.scale);if(f){touchFlower(f);if(type==='click')flyButterfly(f,true,f);return}
  const hotspot=target?.closest?.('[data-hotspot]')?.dataset.hotspot;
  if(hotspot==='sun'){toggleLight();return}
  if(hotspot==='cloud')return;
  if(hotspot==='apple-tree'){shakeTree($('appleTree'));flit('bird',{x:p.x+75,y:p.y-10});if(gestureStarted)G.audio.play('bird',{exclusive:true});return}
  if(hotspot==='banana-tree'){shakeTree($('bananaTree'));summon('monkey');return}
  if(isPond(p)){if(type!=='click')special('ripple',p.x,p.y,{pond:true});reaction('fish');if(type==='click'&&clock-lastSurprise>4500){summon('hippo');lastSurprise=clock}return}
  if(p.y>485&&p.y<825&&plantGate.take('ground',clock)){grow(p.x,p.y,A.flowers[flowersMade%6]);emit('petal',p.x,p.y,4);clicked++;if(clicked%4===0&&clock-lastSurprise>4000){summon(visits.roster[visits.index++%visits.roster.length],p);lastSurprise=clock}}
  else{emit('petal',p.x,p.y,3);if(clock-lastSurprise>5000){flit('butterfly',{x:p.x+70,y:clamp(p.y+30,310,630)});lastSurprise=clock}}
 }
 function pointerMove(ev){
  if(paused||cloudDrag&&ev.pointerId!==cloudDrag.pointerId)return;const p=point(ev);pointer=p;pointerActive=valid(p);cursor.classList.toggle('active',pointerActive);cursor.style.transform=`translate(${ev.clientX}px,${ev.clientY}px)`;
  if(cloudDrag){const d=cloudDrag;d.moved=d.moved||Math.hypot(p.x-d.start.x,p.y-d.start.y)>5;if(d.moved)light.moveCloud(d.index,{dx:d.dx+p.x-d.start.x,dy:d.dy+p.y-d.start.y});celestialDwell=null;dwell=null;return}if(!pointerActive){pointerDown=false;dwell=null;celestialDwell=null;return}
  const overSun=isCelestial(p)&&!ev.target.closest?.('[data-hotspot=cloud]');$('sun').classList.toggle('noticed',overSun);if(overSun){dwell=null;for(const a of actors.values())a.node.classList.remove('noticed');if(!celestialDwell)celestialDwell={since:clock,done:false};return}else celestialDwell=null;
  if(clock-lastTrail>=90){emit(nightMix()>.5?'glow':'petal',p.x,p.y,2);lastTrail=clock}
  const hit=C.pick(p,hitActors(),view.scale);
  for(const a of actors.values())a.node.classList.toggle('noticed',a.id===hit?.id);
  if(hit){if(!dwell||dwell.id!==hit.id)dwell={id:hit.id,since:clock,done:false};hit.actor.node.classList.add('noticed');if(['cat','dog'].includes(hit.id)&&Math.hypot(hit.actor.x-p.x,hit.actor.y-p.y)>110/view.scale)moveTo(hit.actor,{x:p.x+(p.x<hit.actor.x?100:-100)/view.scale,y:p.y+hit.actor.size*.5})}else dwell=null;
  const f=C.pick(p,allFlowers().map(f=>({...f,r:13})),view.scale);if(f)touchFlower(f);
  if(isPond(p)&&clock-lastPond>250){special('ripple',p.x,p.y,{pond:true});const fish=actors.get('fish');if(fish)moveTo(fish,{x:clamp(p.x,1425,1480),y:clamp(p.y+25,688,735)});lastPond=clock}
  if(pointerDown&&clock-lastPlant>220){explore(p,ev.target,'drag');lastPlant=clock}
 }
 function finishCloud(){if(!cloudDrag)return;const d=cloudDrag;cloudDrag=null;light.endCloud(d.index,clock,d.moved,d.previous);if(scene.hasPointerCapture(d.pointerId))scene.releasePointerCapture(d.pointerId)}
 function releasePointer(ev){if(cloudDrag&&ev.pointerId!==cloudDrag.pointerId)return;finishCloud();pointerDown=false}
 function resetPointer(ev){if(cloudDrag&&ev&&ev.pointerId!==cloudDrag.pointerId)return;if(cloudDrag)cloudDrag.moved=true;finishCloud();celestialDwell=null;$('sun').classList.remove('noticed');pointerDown=false;pointerActive=false;dwell=null;cursor.classList.remove('active');for(const a of actors.values()){a.target=null;a.node.classList.remove('noticed')}}
 async function gesture(){if(!gestureStarted){gestureStarted=true;await G.audio.unlock();updateSound()}else if(G.audio.ctx?.state==='suspended'&&!G.audio.muted&&!paused)await G.audio.unlock()}
 $('sun').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleLight()}});
 scene.addEventListener('pointermove',pointerMove);
 scene.addEventListener('pointerdown',ev=>{if(paused||cloudDrag)return;ev.preventDefault();soundIntent++;gesture();pointerDown=ev.button===0;pointer=point(ev);if(ev.button===2){emit('petal',pointer.x,pointer.y,4);return}const cloud=ev.button===0&&ev.target.closest?.('[data-hotspot=cloud]');if(cloud){const index=[...$('clouds').children].indexOf(cloud),state=light.beginCloud(index,clock);if(state){cloudDrag={index,start:{...pointer},...state,pointerId:ev.pointerId,moved:false};celestialDwell=null;dwell=null;scene.setPointerCapture(ev.pointerId);}return}explore(pointer,ev.target,'click')});
 scene.addEventListener('pointerup',releasePointer);scene.addEventListener('pointercancel',resetPointer);scene.addEventListener('pointerleave',resetPointer);
 app.addEventListener('contextmenu',e=>e.preventDefault());app.addEventListener('dragstart',e=>e.preventDefault());app.addEventListener('wheel',e=>e.preventDefault(),{passive:false});addEventListener('pointerup',releasePointer);
 function setPaused(){const value=manualPause||document.hidden||!document.hasFocus()||resting;if(value===paused)return;paused=value;document.body.classList.toggle('paused',paused);if(paused){pausedAnimations=app.getAnimations({subtree:true}).filter(a=>!(a instanceof CSSAnimation)&&!(a instanceof CSSTransition));for(const animation of pausedAnimations)animation.pause()}else{for(const animation of pausedAnimations)animation.play();pausedAnimations=[]}resetPointer();G.audio.setPaused(paused);lastFrame=performance.now();if(!paused)visits.reset(clock)}
 function parent(open){manualPause=open;$('parent').hidden=!open;setPaused()}
 function updateSound(){$('soundBtn').setAttribute('aria-pressed',String(gestureStarted&&!G.audio.muted));$('soundBtn').setAttribute('aria-label',G.audio.muted?'开启声音':'关闭声音')}
 $('soundBtn').addEventListener('click',async()=>{soundIntent++;const first=!gestureStarted;await gesture();G.audio.setMuted(first?false:!G.audio.muted);updateSound()});
 $('fullBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen()}catch{}resize()});
 $('closeParent').addEventListener('click',()=>parent(false));$('resume').addEventListener('click',()=>parent(false));
 $('volume').addEventListener('input',e=>{G.audio.setVolume(Number(e.target.value));saveSettings()});$('duration').addEventListener('input',e=>{duration=Number(e.target.value)*60000;sessionTime=0;saveSettings()});
 $('restart').addEventListener('click',()=>{resting=false;$('rest').hidden=true;sessionTime=0;setPaused();gesture()});
 function saveSettings(){try{localStorage.setItem('spring-garden-settings',JSON.stringify({version:2,volume:G.audio.volume,duration:duration/60000}))}catch{}}
 try{const saved=JSON.parse(localStorage.getItem('spring-garden-settings')||'null');if(saved){G.audio.setVolume(Number.isFinite(Number(saved.volume))?(!saved.version&&Number(saved.volume)===.3?.46:Number(saved.volume)):.46);duration=[0,5,10,15].includes(saved.duration)?saved.duration*60000:0;$('volume').value=G.audio.volume;$('duration').value=duration/60000}}catch{}
 addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();parent(!manualPause)}if(e.key==='Escape'&&manualPause)parent(false)});
 addEventListener('blur',setPaused);addEventListener('focus',setPaused);document.addEventListener('visibilitychange',setPaused);addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
 function seedWorld(){
  [...document.querySelectorAll('[data-fruit="apple"]')].forEach((n,i)=>{const id='apple-'+i;n.dataset.harvestId=id;appleNodes.set(id,n)});renderBasket();
  for(const fruitNode of document.querySelectorAll('.fruit')){const motion=element('g',{class:'fruit-art'});while(fruitNode.firstChild)motion.appendChild(fruitNode.firstChild);fruitNode.appendChild(motion)}
  let seed=277;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  let blossom='',buds=[];for(let i=0;i<250&&buds.length<30;i++){const x=40+random()*310,y=112+random()*170;if(buds.some(p=>Math.hypot(p.x-x,p.y-y)<32))continue;buds.push({x,y});blossom+=`<g transform="translate(${x} ${y})"><g fill="#fff7e6" stroke="#e4d6bf" stroke-width=".7">${Array.from({length:5},(_,j)=>`<ellipse cy="-4.2" rx="3.8" ry="5.4" transform="rotate(${j*72})"/>`).join('')}</g><circle r="2.5" fill="#e2c584"/></g>`}$('treeBlossoms').innerHTML=blossom;
  let grass='';for(let i=0;i<165;i++){const x=random()*1600,y=520+random()*285;if(isPond({x,y}))continue;grass+=`<path d="M${x} ${y}q-6-15-10-13m10 13q2-22 8-23" stroke="${i%2?'#8dad80':'#a5be8b'}" stroke-width="${1+random()*1.6}" stroke-linecap="round" fill="none" opacity=".5"/>`}$('grassDetails').innerHTML=grass;
  $('backgroundFlowers').innerHTML='';
  const flowerSpots=[85,335,585,835,1085,1460];for(let i=0;i<6;i++){const kind=A.flowers[i],x=flowerSpots[i],y=759,s=.86;const node=element('g',{transform:`translate(${x} ${y}) scale(${s})`,class:'flower','data-flower':kind});node.innerHTML=A.flower(kind,i);$('flowers').appendChild(node);flowerEntities.push({id:'f'+i,node,x,baseY:y,y:y-15,kind})}
  const ids=Object.keys(names);for(let i=0;i<ids.length;i++){const id=ids[i],x=85+i*102,y=858+Math.sin(i*.5)*3;const n=element('g',{transform:`translate(${x} ${y})`,class:'portrait','data-summon':id,role:'button','aria-label':names[id],tabindex:'0'});n.innerHTML=`<circle class="portrait-circle" r="34"/><g class="portrait-art" transform="translate(-34 -35) scale(.34)">${A.animal(id)}</g>`;$('animalTrail').appendChild(n);n.addEventListener('keydown',e=>{if(paused)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();gesture();summon(id)}})}
  summon('cat',null,false);renderAnimal('bird',445,367,105);for(const [i,flowerIndex]of [2,0,3].entries()){const a=renderAnimal(i?'butterfly-'+i:'butterfly',0,0,48,false,'butterfly');if(i){const palette=i===1?{'#e0b3c3':'#e5c889','#e7c1cf':'#f1dca3','#ac8798':'#b5a070','#c39aa9':'#c4aa78'}:{'#e0b3c3':'#a8c4d0','#e7c1cf':'#c1d9d9','#ac8798':'#839fae','#c39aa9':'#90aebb'};for(const n of a.node.querySelectorAll('[fill],[stroke]'))for(const attr of ['fill','stroke'])if(palette[n.getAttribute(attr)])n.setAttribute(attr,palette[n.getAttribute(attr)])}perchButterfly(a,flowerEntities[flowerIndex]);place(a);a.restUntil=clock+6500+i*3500;}renderAnimal('fish',1450,732,88);summon('elephant',null,false);summon('giraffe',null,false);
  light.render(0);
  // Dwell and mouse feedback are usable immediately, even before audio is unlocked.
  mainEventUntil=0;visits.due=7000;
 }
 function frame(now){
  const elapsed=Math.max(0,now-lastFrame),dt=Math.min(50,elapsed);lastFrame=now;
  if(!paused){clock+=elapsed;sessionTime+=elapsed;stepLight();
   for(let i=scheduled.length-1;i>=0;i--){if(clock>=scheduled[i].due){const item=scheduled.splice(i,1)[0];item.fn()}}
   if(dwell&&!dwell.done&&clock-dwell.since>=800){reaction(dwell.id,'near');dwell.done=true}
   for(const a of actors.values()){
    let moving=false;const oldX=a.x;
    if(a.kind==='butterfly')stepButterfly(a);
    else if(a.arrival){const t=clamp((clock-a.arrival.born)/750,0,1);a.x=a.arrival.from+(a.arrival.to-a.arrival.from)*t;moving=true;if(t>=1){a.arrival=null;a.node.classList.remove('arriving')}}
    else if(a.flight){const f=a.flight,elapsed=clock-f.born;const t=clamp((elapsed-f.launch)/f.duration,0,1),q=t*t*(3-2*t),u=1-t;a.node.classList.toggle('taking-off',elapsed<f.launch);a.node.classList.toggle('flying',elapsed>=f.launch&&t<1);a.node.classList.toggle('landing',t>.82&&t<1);a.x=f.from.x+(f.to.x-f.from.x)*q;a.y=u*u*u*f.from.y+3*u*u*t*f.ceiling+3*u*t*t*f.ceiling+t*t*t*f.to.y;a.node.style.setProperty('--flight-pitch',(Math.cos(t*Math.PI)*-8)+'deg');
     if(t>0&&t<1){const fruits=[...document.querySelectorAll('[data-fruit]')].map(worldBox);for(let j=0;j<36;j++){const box=boundsOf(a);if([...actors.values()].every(other=>other===a||!overlaps(box,boundsOf(other),8))&&fruits.every(other=>!overlaps(box,other,8)))break;a.y-=8}}
     if(t>=1){a.flight=null;a.node.classList.remove('flying','landing','taking-off')}
    }else if(a.target){const dx=a.target.x-a.x,dy=a.target.y-a.y,d=Math.hypot(dx,dy),speed=a.id==='turtle'?9:a.id==='fish'?64:42;if(d<2)a.target=null;else{const move=Math.min(d,speed*dt/1000),p={x:a.x+dx/d*move,y:a.y+dy/d*move};if([...actors.values()].every(other=>other===a||!overlaps(boundsOf(a,p),boundsOf(other),12))&&allFlowers().every(f=>!overlaps(boundsOf(a,p),flowerBounds(f),8))){a.x=p.x;a.y=p.y;moving=true;a.node.classList.toggle('facing-left',dx<0)}else a.target=null}}
    if(a.id==='elephant')poseElephant(a);if(a.id==='peacock')posePeacock(a);
    a.node.classList.toggle('moving',moving);a.walkDistance+=Math.abs(a.x-oldX);
    if(a.id==='dog')for(const leg of a.node.querySelectorAll('.dog-leg')){const x=Number(leg.dataset.hipX),y=Number(leg.dataset.hipY),front=leg.classList.contains('leg-front'),near=leg.classList.contains('near'),phase=moving?a.walkDistance/30+(front?(near?0:.5):(near?.75:.25)):.32,p=C.dogLegPose(phase,x,y,front);leg.querySelector('.limb').setAttribute('d',`M${x} ${y}L${p.knee.x} ${p.knee.y}L${p.foot.x} ${p.foot.y}`);leg.querySelector('.foot').setAttribute('transform',`translate(${p.foot.x} ${p.foot.y})`)}
    place(a);
    if(clock>a.reactUntil)a.node.classList.remove('reacting');
    if(a.guest&&clock>a.expires){if(pointerActive&&C.pick(pointer,hitActors(),view.scale)?.id===a.id)a.expires=clock+9000;else removeGuest(a.id)}
   }
   const focused=C.pick(pointer,hitActors(),view.scale),busy=clock<mainEventUntil||clock<userGuestUntil||pointerDown||!!(pointerActive&&focused?.actor.guest);
   const next=visits.next(clock,[...actors.values()].filter(a=>a.guest).map(a=>a.id),busy);if(next)summon(next,null,true,true);
   for(let i=departures.length-1;i>=0;i--){const a=departures[i],u=clamp((clock-a.departingAt)/650,0,1);a.wrapper.setAttribute('opacity',1-u);if(u===1){a.wrapper.remove();departures.splice(i,1)}}
   stepHarvest();
   drawEffects(dt);
   if(duration&&sessionTime>=duration){resting=true;$('rest').hidden=false;setPaused()}
  }
  requestAnimationFrame(frame);
 }
 G.game={futureThemes,environment,summon,snapshot(){const a=lastButterfly||actors.get('butterfly'),feet=modelAnchor(a,'butterfly-feet'),contact=a.perch&&flowerContact(a.perch);return{environment:{...environment},light:{mix:light.cycle.value,target:light.cycle.target,busy:light.cycle.busy},sky:light.sky,departures:departures.map(a=>({id:a.id,opacity:Number(a.wrapper.getAttribute('opacity'))})),butterflies:butterflies().map(b=>{const foot=modelAnchor(b,'butterfly-feet'),contact=b.perch&&flowerContact(b.perch);return{id:b.id,state:b.flight?'flying':'perching',departure:b.flight?.fromFlower||null,requested:b.requestedFlower?.id||null,perch:b.perch?.id||null,destination:b.flight?.flower.id||null,x:b.x,y:b.y,contactError:contact&&foot?Math.hypot(contact.x-foot.x,contact.y-foot.y):null}}),effects:specials.map(s=>s.type),sprays:specials.filter(s=>s.type==='spray').map(s=>({age:clock-s.born,landed:!!s.landed,travel:s.jet?.duration*1000})),peacock:actors.has('peacock')?{open:actors.get('peacock').open}:null,actors:[...actors.keys()],guests:guestIds(),particles:particles.length,specials:specials.length,grownFlowers:grown.length,interactions,paused,clock,audioPlayed:G.audio.totalPlayed,audioLast:G.audio.lastPlayed,harvest:harvest.counts(),water:specials.filter(s=>s.type==='spray'&&s.origin&&actors.get(s.actor.id)===s.actor).map(s=>({actor:s.actor.id,origin:s.origin,target:s.target,direction:s.direction})),butterfly:{id:a.id,state:a.flight?'flying':'perching',perch:a.perch?.id||null,departure:a.flight?.fromFlower||null,destination:a.flight?.flower.id||null,requested:a.requestedFlower?.id||null,x:a.x,y:a.y,contactError:contact&&feet?Math.hypot(contact.x-feet.x,contact.y-feet.y):null},models:[...actors.values()].map(a=>({id:a.id,kind:a.kind,guest:a.guest,expires:a.expires,x:a.x,y:a.y,size:a.size,flying:!!a.flight,bounds:boundsOf(a)})),flowers:allFlowers().map(f=>({id:f.id,bounds:flowerBounds(f)}))}}};
 seedWorld();resize();requestAnimationFrame(frame);
})();
