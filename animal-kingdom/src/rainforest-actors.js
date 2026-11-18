import {blink,clay,closedShape,group,mesh,paintSphere,tube} from './savanna-actors.js';
import {groundMonkeyFoot,rainPoints} from './rainforest-state.js';

const smooth = (value, low = 0, high = 1) => {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

function eyelid(T, parent, name, sphere, position, yaw, eye, white) {
  const socket = group(T, parent, name, position);
  socket.rotation.y = yaw;
  const aperture = group(T, socket, name + ' aperture');
  mesh(T, aperture, 'Dark bead eye', sphere, eye, [0, 0, .010], [.033, .037, .022]);
  mesh(T, aperture, 'Eye highlight', sphere, white, [-.009, .012, .024], [.009, .009, .006]);
  const closed = tube(T, socket, name + ' closed lid', [
    [-.038, .003, .006], [-.019, -.005, .018], [0, -.011, .020],
    [.019, -.005, .018], [.038, .003, .006],
  ], .0047, eye, 8);
  closed.castShadow = false;
  return (time, sleep) => {
    const open = blink(time, 4.6) * (1 - sleep);
    aperture.visible = sleep < .90 && open > .10;
    aperture.scale.y = Math.max(.12, open);
    closed.visible = sleep > .35 || open <= .10;
  };
}

function jointedArm(T, root, name, sphere, upper, lower, widths, lengths) {
  const shoulder = mesh(T, root, name + ' upper', sphere, upper);
  const forearm = mesh(T, root, name + ' lower', sphere, lower);
  const elbow = mesh(T, root, name + ' bend', sphere, lower);
  const direction = new T.Vector3();
  const kink = new T.Vector3();
  const middle = new T.Vector3();
  const along = new T.Vector3(0, 1, 0);
  function between(part, a, b, width, taper) {
    direction.subVectors(b, a);
    part.position.copy(a).lerp(b, .5);
    part.scale.set(width, direction.length() * .54 + width * .45, width * taper);
    part.quaternion.setFromUnitVectors(along, direction.normalize());
  }
  // 先从肩和掌推算肘点，再让两截实体沿各自骨轴连接。
  return (a, b, bend, floor = -Infinity) => {
    direction.subVectors(b, a);
    const distance = Math.max(.0001, direction.length());
    direction.normalize();
    const [first, second] = lengths;
    const sweep = Math.max(.19, Math.min(.81, (distance ** 2 + first ** 2 - second ** 2) / (2 * distance ** 2)));
    const height = Math.sqrt(Math.max(.00010, first ** 2 - (sweep * distance) ** 2));
    kink.copy(bend).addScaledVector(direction, -bend.dot(direction)).normalize();
    middle.copy(a).addScaledVector(direction, sweep * distance).addScaledVector(kink, height);
    middle.y = Math.max(middle.y,floor);
    elbow.position.copy(middle);
    elbow.scale.setScalar(widths[1] * 1.01);
    between(shoulder, a, middle, widths[0], 1.07);
    between(forearm, middle, b, widths[1], .93);
  };
}

function tailSurface(T, root, material) {
  const rows = 25, sides = 9;
  const dots = Array.from({length:8}, () => new T.Vector3());
  const path = new T.CatmullRomCurve3(dots, false, 'centripetal');
  const points = new T.BufferAttribute(new Float32Array(rows * sides * 3), 3);
  points.setUsage(T.DynamicDrawUsage);
  const indices = [];
  for (let row = 0; row < rows - 1; row++) {
    for (let i = 0; i < sides; i++) {
      const a = row * sides + i, b = row * sides + (i + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', points);
  geometry.setIndex(indices);
  const tail = mesh(T, root, 'Curved gripping monkey tail', geometry, material);
  tail.frustumCulled = false;
  const p = new T.Vector3(), normal = new T.Vector3(), tangent = new T.Vector3(), binormal = new T.Vector3();
  return {
    dots,
    update() {
      for (let row = 0; row < rows; row++) {
        const t = row / (rows - 1);
        path.getPoint(t, p);
        path.getTangent(t, tangent);
        if (row === 0) normal.set(0, Math.abs(tangent.y) > .90 ? 0 : 1, Math.abs(tangent.y) > .90 ? 1 : 0);
        binormal.crossVectors(tangent, normal).normalize();
        normal.crossVectors(binormal, tangent).normalize();
        const radius = (.047 - .023 * t) * (1 - .79 * smooth(t, .92, 1));
        for (let j = 0; j < sides; j++) {
          const angle = j * Math.PI * 2 / sides;
          const a = Math.cos(angle) * radius, b = Math.sin(angle) * radius;
          points.setXYZ(row * sides + j, p.x + normal.x * a + binormal.x * b,
            p.y + normal.y * a + binormal.y * b, p.z + normal.z * a + binormal.z * b);
        }
      }
      points.needsUpdate = true;
      geometry.computeVertexNormals();
    },
  };
}

function monkeyPalm(T, hand, sphere, skin, palm, leg = false) {
  mesh(T, hand, 'Broad gripping palm', sphere, skin, [0, .031, -.036], [.058, .034, .060]);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * .024;
    const tip = .041 - .009 * Math.abs(i - 1.5);
    tube(T, hand, 'Curved monkey finger', [[x, .033, -.022], [x * 1.20, .031, tip * .56],
      [x * 1.24, .013, tip], [x * 1.18, leg ? .004 : -.008, tip + .006]], .0123, palm, 6);
  }
  tube(T, hand, 'Opposing thumb', [[-.034, .028, -.039], [-.061, .023, -.020],
    [-.058, .013, .017], [-.050, .004, .026]], .015, skin, 7);
}

export function makeMonkey(T, { ground = false, scale = 1, perchTopAt = null } = {}) {
  const root = group(T, null, 'White-faced capuchin');
  root.scale.setScalar(scale);
  const torso = group(T, root, 'Capuchin trunk');
  const head = group(T, torso, 'Cream-faced capuchin head', [0, .226, .048]);
  const sphere = new T.SphereGeometry(1, 22, 15), small = new T.SphereGeometry(1, 14, 10);
  const black = clay(T, '#3d3533'), brown = clay(T, '#655145'), lightFur = clay(T, '#d2b183');
  const face = clay(T, '#e3bf96'), muzzle = clay(T, '#ba8e70'), fingers = clay(T, '#5d463b');
  const dark = clay(T, '#332621', .46), glint = clay(T, '#fff1cc', .58), coat = clay(T, '#ffffff', .85, true);
  const warm = new T.Color(ground ? '#ad7652' : '#9c7558');
  const hood = new T.Color(ground ? '#514036' : '#423637'), shade = new T.Color();
  const back = paintSphere(T, (x,y,z) => shade.copy(hood)
    .lerp(warm, (.45 + .55 * smooth(z, -.55, .75)) * smooth(y, -.97, .72))
    .multiplyScalar(1 + .034 * Math.sin(x * 11 + z * 6)), 25, 18);
  mesh(T, torso, 'Arched capuchin back', back, coat, [0, -.021, -.035], [.164, .228, .148]);
  mesh(T, torso, 'Cream bib', sphere, lightFur, [0, .072, .088], [.137, .177, .090]);
  mesh(T, head, 'Rounded brown capuchin cap', back, coat, [0, .054, -.011], [.177, .172, .154]);
  mesh(T, head, 'Pale heart-shaped facial mask', sphere, face, [0, .005, .098], [.137, .138, .082]);
  mesh(T, head, 'Shallow short muzzle', small, muzzle, [0, -.071, .152], [.090, .061, .059]);
  mesh(T, head, 'Pale forehead', small, lightFur, [0, .084, .097], [.119, .065, .066]);
  const jaw = group(T, head, 'Chewing capuchin jaw', [0, -.105, .135]);
  mesh(T, jaw, 'Soft pale capuchin chin', small, face, [0, -.003, .037], [.073, .031, .042]);
  mesh(T, head, 'Rounded capuchin nose', small, black, [0, -.045, .199], [.035, .022, .014]);
  const mouth = group(T, head, 'Capuchin mouth food point', [0, -.106, .220]);
  const eyes = [];
  for (const side of [-1, 1]) {
    const label = side < 0 ? 'Left' : 'Right';
    mesh(T, head, label + ' cupped round ear', small, lightFur,
      [side * .151, .023, .013], [.055, .068, .041]).rotation.z = side * -.19;
    mesh(T, head, label + ' shaded ear bowl', small, muzzle,
      [side * .159, .022, .046], [.033, .045, .014]);
    eyes.push(eyelid(T, head, label + ' monkey eye', small, [side * .064, .015, .165],
      side * .32, dark, glint));
  }
  const hand = group(T, root, 'Banana hand contact');
  const supportHand = group(T, root, 'Branch changing left palm');
  const tailGrip = group(T, root, 'Tail hook contact');
  monkeyPalm(T, hand, small, brown, fingers);
  monkeyPalm(T, supportHand, small, brown, fingers, true);
  const armLeft = jointedArm(T, root, 'Left cream reaching arm', sphere, lightFur, brown, [.073,.052], [.26,.26]);
  const armRight = jointedArm(T, root, 'Right cream reaching arm', sphere, lightFur, brown, [.073,.052], [.26,.26]);
  const legs = [-1,1].map(side => {
    const foot = group(T, root, side < 0 ? 'Left branch foot' : 'Right branch foot');
    monkeyPalm(T, foot, small, brown, fingers, true);
    return {side,foot,leg:jointedArm(T, root, 'Bent capuchin hind leg', sphere, brown, black, [.096,.060], [.186,.229])};
  });
  const tail = tailSurface(T, root, brown);
  const start = new T.Vector3(), end = new T.Vector3(), target = new T.Vector3(), palm = new T.Vector3();
  const leftBend = new T.Vector3(-1,-.08,.43), rightBend = new T.Vector3(1,-.60,-.28);
  const knee = new T.Vector3(0,.05,1), wrap = new T.Vector3();
  const anchored = new T.Vector3(), otherAnchor = new T.Vector3();
  const home = rainPoints.monkeyBranches[0];
  const perches = ground ? [] : rainPoints.monkeyBranches.map((branch,site) => {
    const contact = (x,z,padding) => {
      const wx = branch.x+x, wz = branch.z+z;
      const surface = perchTopAt?.(site,wx,wz);
      return new T.Vector3(wx,(Number.isFinite(surface)?surface:branch.y-.022)+padding,wz);
    };
    const hand = contact(-.212,site===0?-.142:-.155,.016);
    const feet = [contact(-.112,site===0?-.064:-.050,.015),contact(.116,.052,.014)];
    const tail = [
      contact(-.202,-.117,.255),contact(-.272,-.124,.153),contact(-.292,-.144,.082),
      contact(-.280,-.170,.046),contact(-.250,-.185,.031),contact(-.241,-.191,.014)
    ];
    return {hand,feet,tail};
  });

  function pose({time=0,x=home.x,y=ground?0:home.y,z=home.z,yaw=0,site=0,leap=-1,landingSite=site,
    reach=0,reachX=.26,reachY=.39,reachZ=.28,bring=0,chew=0,
    sleep=0,swing=0,air=0,crouch=0,land=0,look=0,lookDown=0,call=0,tailGrip:gripping=1,
    gait=0,stride=0,alert=0,leftGroundY=y,rightGroundY=y,leftHandGroundY=y,rightHandGroundY=y}={}) {
    const moving = Math.max(swing,air);
    const releasing = leap >= 0 ? smooth(leap,0,.21) : 0;
    const landing = leap >= 0 ? smooth(leap,.72,1) : 0;
    const c=Math.cos(yaw),s=Math.sin(yaw);
    function local(anchor,out) {
      const dx=anchor.x-x,dz=anchor.z-z;
      return out.set(dx*c-dz*s,anchor.y-y,dx*s+dz*c);
    }
    function passToBranch(out,from,to,loose,catching) {
      out.lerp(local(from,anchored),1-loose);
      if(catching>0)out.lerp(local(to,otherAnchor),catching);
    }
    const resting = smooth(sleep);
    const gather = smooth(bring);
    const awake = (1-resting)*(1-reach)*(1-gather);
    const scan = Math.sin(time*1.42+(ground?2.8:.7))*awake;
    torso.position.set(.027 * reach - .041 * moving,
      .435 - .042 * resting - .060 * crouch - .048 * land + Math.sin(time*2.4)*.008
       - (ground?.048+.10*gait+.096*resting-.048*call:0),
      -.022 + .044 * reach + .031 * moving);
    torso.rotation.set(.121+.12*moving+.13*crouch+.10*resting+.11*gait,.14*reach,.10*resting-.29*moving+.026*scan);
    head.rotation.set(-.20*reach+.33*resting-.095*call-.13*alert+.034*scan+.31*lookDown*awake*(1-moving),
      .30*reach-.18*resting+.29*look+.11*scan,.13*resting);
    jaw.rotation.x = .30 * call * (1-resting) + .18 * chew * (.56 + .44 * Math.sin(time * 18));
    for (const close of eyes) close(time, resting);
    torso.updateMatrix();
    head.updateMatrix();
    target.copy(mouth.position).applyMatrix4(head.matrix).applyMatrix4(torso.matrix);
    if (ground) {
      const leg = groundMonkeyFoot(gait,stride,1,true);
      palm.set(leg.x,(rightHandGroundY-y+.022)/scale+leg.lift+.14*call,leg.z);
    } else palm.set(.215+.061*moving,.187+.134*moving,.204+.068*moving);
    palm.lerp(end.set(reachX,reachY,reachZ),smooth(reach));
    palm.lerp(target,gather);
    hand.position.copy(palm);
    hand.rotation.set(-.24*reach+.41*gather,.36*reach,.26*gather);
    if (ground) {
      const leg = groundMonkeyFoot(gait,stride,-1,true);
      supportHand.position.set(leg.x,(leftHandGroundY-y+.012)/scale+leg.lift,leg.z);
      supportHand.rotation.set(0,-.12,0);
    } else {
      const lifting = Math.max(releasing,.82*smooth(crouch,.22,.94));
      supportHand.position.set(-.265,.236+.072*moving,.181+.060*moving);
      passToBranch(supportHand.position,perches[site].hand,perches[landingSite].hand,lifting,smooth(landing,.44,1));
      const freeWeight = lifting * (1 - smooth(landing,.44,1));
      supportHand.rotation.set(-.20*freeWeight,(-.51-yaw)*(1-freeWeight),-.17*freeWeight);
    }
    start.set(.136,.092,.033).applyMatrix4(torso.matrix);
    end.set(0,.017,-.047).applyEuler(hand.rotation).add(hand.position);
    armRight(start,end,rightBend);
    start.set(-.139,.092,.034).applyMatrix4(torso.matrix);
    end.set(0,.022,-.054).applyEuler(supportHand.rotation).add(supportHand.position);
    armLeft(start,end,leftBend);

    for (const {side,foot,leg} of legs) {
      const floor = side < 0 ? leftGroundY : rightGroundY;
      if (ground) {
        const step = groundMonkeyFoot(gait,stride,side);
        foot.position.set(step.x,(floor-y+.012)/scale+step.lift,step.z);
        foot.rotation.set(limitFootLift(step.lift),side*.14,0);
      } else {
        const footIndex=Number(side>0), catchFoot=side<0?landing:smooth(landing,.17,1);
        foot.position.set(side*.146,.13+.041*side,-.102-.034*side);
        // 把每只脚锁在木面的世界坐标。降落阶段改用下一根枝，朝向变化时脚不跟着滑。
        passToBranch(foot.position,perches[site].feet[footIndex],perches[landingSite].feet[footIndex],releasing,catchFoot);
        const freeWeight=releasing*(1-catchFoot);
        foot.rotation.set(-freeWeight*.32,(-.52+side*.14-yaw)*(1-freeWeight)+side*.14*freeWeight,side*freeWeight*.14);
      }
      start.set(side*.105,-.141,-.029).applyMatrix4(torso.matrix);
      end.set(0,.029,-.044).applyEuler(foot.rotation).add(foot.position);
      // 地猴低身取果时，弯曲的膝盖仍应留在脚下坡面的上方。
      leg(start,end,knee,ground?(floor-y)/scale+.084:-Infinity);
    }
    const tailFirm=ground?0:smooth(gripping)*(1-.94*Math.max(land,smooth(crouch,.09,.74)));
    const p=tail.dots;
    p[0].set(-.011,-.139,-.136).applyMatrix4(torso.matrix);
    p[1].copy(p[0]).add(wrap.set(-.061,-.036,-.123));
    for (let i=2;i<p.length;i++) {
      const t=(i-2)/(p.length-3);
      p[i].set(-.102-.190*Math.sin(t*2.65)+.023*Math.sin(time*2.5+t*2),
        .185+.212*Math.sin(t*2.94)+.042*moving,-.280-.143*Math.sin(t*2.74));
      if (ground) p[i].set(-.12-.19*Math.sin(t*3.1)+.08*scan*t,.13+.21*Math.sin(t*2.45),-.38-.34*t);
      else p[i].lerp(local(perches[site].tail[i-2],wrap),tailFirm);
    }
    tailGrip.position.copy(p.at(-1));
    tail.update();
  }

  pose();
  return {root,pose,hand,mouth,supportHand,tailGrip,feet:legs.map(leg=>leg.foot)};
}

const limitFootLift = lift => -.24 * Math.min(1, lift / .08);



function slothClaw(T, claw, sphere, fur, ivory, bark) {
  const front=bark?.front??.025;
  mesh(T, claw, 'Soft brown sloth paw', sphere, fur, [0, bark?-.064:-.025, front], [.061,.066,.060]);
  for(const i of [-1,0,1]) {
    const x=i*.028;
    if(bark) {
      const peak=bark.height-Math.abs(i)*.008;
      tube(T, claw, 'Sloth branch hook claw', [[x,-.052,front+.008],[x,.017,front+.004],
        [x,peak*.55,front*.92],[x,peak*.91,front*.53],[x,peak,.012],
        [x,peak*.86,-front*.53],[x,peak*.59,-front*.86]], .011, ivory, 13);
    } else {
      tube(T, claw, 'Sloth feeding claw', [[x,-.025,.055],[x,-.007,.094],
        [x,.013,.113],[x,.030,.101]], .0104, ivory, 7);
    }
  }
}

export function makeSloth(T) {
  const root = group(T, null, 'Brown-throated three-toed sloth');
  const torso = group(T, root, 'Sloth hanging body');
  const head = group(T, torso, 'Sloth head below the branch', [.155,.012,.154]);
  const sphere = new T.SphereGeometry(1, 24, 17), small = new T.SphereGeometry(1, 14, 10);
  const tan = clay(T,'#a58c68'), shoulderFur = clay(T,'#8c745b'), paw = clay(T,'#90775d');
  const coffee = clay(T,'#705748'), ivory = clay(T,'#dcc5a0'), mask = clay(T,'#dabe96');
  const dark = clay(T,'#3a302b',.55), white = clay(T,'#f9ebc9'), coat = clay(T,'#ffffff',.87,true);
  const moss = new T.Color('#899575'), cocoa = new T.Color('#6d574a'),
    ochre = new T.Color('#b19b74'), color = new T.Color();
  const wool = paintSphere(T,(x,y,z) => color.copy(cocoa).lerp(ochre,.24+.59*smooth(z,-.69,.94))
    .lerp(moss,.48*smooth(y,-.2,.92)).multiplyScalar(.98+.039*Math.sin(x*16+z*11)),28,18);
  const pelt=closedShape(T,[
    [-.363,-.004,.018,.026,.084],[-.333,-.004,.085,.124,.092],[-.267,.003,.143,.190,.085],
    [-.164,.006,.188,.217,.073],[-.045,.009,.210,.232,.044],[.058,.013,.207,.218,.007],
    [.138,.011,.181,.194,-.040],[.213,.012,.142,.153,-.067],[.271,.004,.085,.110,-.076],
    [.294,-.012,.019,.025,-.085]
  ],32,(side,y,x)=>color.copy(cocoa).lerp(ochre,.36+.47*smooth(-side,-.2,.20))
    .lerp(moss,.38*smooth(y,-.06,.23)).multiplyScalar(.985+.023*Math.cos(x*34+y*16))).rotateY(Math.PI/2);
  mesh(T,torso,'连续的树懒肩背与胸腹',pelt,coat);
  mesh(T,torso,'Brown sloth throat',sphere,coffee,[.165,-.043,.139],[.124,.133,.091]);
  mesh(T,head,'Soft fur rim around sloth face',wool,coat,[.022,-.052,.006],[.168,.158,.136]);
  const cheekFur=new T.Color('#edd5a8'),eyeStripe=new T.Color('#795d4b');
  const facial=paintSphere(T,(x,y,z)=>{
    const side=Math.abs(x),sweep=Math.hypot((side-.64)/.47,(y-(.18-.38*(side-.46)))/.31);
    return color.copy(cheekFur).lerp(eyeStripe,(1-smooth(sweep,.60,1.09))*smooth(z,-.10,.43));
  },44,28);
  mesh(T,head,'浅色脸盘与贴着毛面的两道眼纹',facial,coat,[.029,-.066,.092],[.151,.131,.072]);
  mesh(T,head,'Sloth round muzzle',small,ivory,[.031,-.109,.138],[.090,.067,.056]);
  mesh(T,head,'Dark sloth nose',small,coffee,[.028,-.070,.184],[.052,.031,.026]);
  const face = group(T,head,'Sloth face touch point',[.028,-.070,.208]);
  const jaw = group(T,head,'Small chewing sloth chin',[.028,-.145,.131]);
  mesh(T,jaw,'Rounded sloth chin',small,mask,[0,-.012,.025],[.075,.031,.047]);
  const mouth = group(T,head,'Leaf-to-mouth contact',[.028,-.149,.188]);
  const fruitMouth = group(T,head,'Berry-to-mouth contact',[.041,-.177,.270]);
  const setters = [];
  for(const side of [-1,1]){
    const label=side<0?'Left':'Right';
    setters.push(eyelid(T,head,label+' sloth eye',small,
      [.030+side*.067,-.042,.155],side*.22,dark,white));
  }

  const fixedGrip = [
    group(T,root,'Locked sloth foreclaw',[-.38,.460,-.050]),
    group(T,root,'Locked sloth left hindclaw',[-.152,.460,-.050]),
    group(T,root,'Locked sloth right hindclaw',[.337,.460,-.050]),
  ];
  // 固定卷爪沿横枝的前面伸上树皮，木芯轴只做锚点。
  const gripBark=[{height:.158,front:.128},{height:.136,front:.128},{height:.120,front:.143}];
  fixedGrip.forEach((claw,i)=>slothClaw(T,claw,small,paw,ivory,gripBark[i]));
  const anchors = [
    {base:[-.221,.067,.072], guide:new T.Vector3(-1,.1,.42), move:jointedArm(T,root,'Sloth clinging forelimb',sphere,shoulderFur,tan,[.084,.069],[.270,.280])},
    {base:[-.239,.058,-.102], guide:new T.Vector3(-.42,-.13,-1), move:jointedArm(T,root,'Sloth left clinging hindlimb',sphere,shoulderFur,tan,[.097,.072],[.263,.239])},
    {base:[.086,.047,-.168], guide:new T.Vector3(.9,-.07,-.5), move:jointedArm(T,root,'Sloth right clinging hindlimb',sphere,shoulderFur,tan,[.098,.072],[.279,.270])},
  ];
  const hand = group(T,root,'Sloth leaf hand contact');
  const grasp = group(T,hand,'Leaf claw wrist',[0,-.025,-.089]);
  slothClaw(T,grasp,small,paw,ivory);
  const feed = jointedArm(T,root,'Long free feeding sloth forelimb',sphere,shoulderFur,tan,[.086,.063],[.283,.277]);
  const feedGuide = new T.Vector3(.86,-.82,-.17);
  const shoulder = new T.Vector3(), wrist = new T.Vector3(), snack = new T.Vector3();
  const pickedAt = new T.Vector3(), mouthAt = new T.Vector3(), fromSide = new T.Vector3();
  const steps = [[.04,.31],[.35,.61],[.64,.90]];
  const leftSteps = [0,2,1], rightSteps = [2,0,1];

  function pose({time=0,yaw=0,reach=0,reachX=.44,reachY=-.23,reachZ=.40,hold=0,bring=0,chew=0,
    gripX=-.38,gripY=.46,gripZ=-.05,sleep=0,look=0,stretch=0,sway=0,watch=0,crawl=-1,crawlSpan=0,fruitLean=0}={}) {
    const drowsy=smooth(sleep);
    const holding=smooth(hold);
    const delivery=smooth(bring);
    const gaze=smooth(reach,.12,.75);
    const direction=Math.sign(crawlSpan),climbing=smooth(crawl,0,.15)*(1-smooth(crawl,.85,1));
    const weight=climbing*Math.sin(crawl*Math.PI*2)*direction;
    const rearReach=smooth(crawl,.35,.43)*(1-smooth(crawl,.54,.61));
    torso.position.set(Math.sin(time*1.48)*.012+.205*sway+weight*.070+rearReach*.051+.095*fruitLean,
      -.102-drowsy*.026-Math.sin(time*2.3)*.004+.096*sway+climbing*.041,.047+.023*stretch+.047*fruitLean);
    torso.rotation.set(.15+.025*Math.sin(time*1.54)-.10*sway,-.054*gaze+.16*sway,
      .04*Math.sin(time*1.52)+.035*drowsy+.34*sway+weight*.063-.068*fruitLean);
    head.rotation.set(-.15*(1-drowsy)*(1-.76*gaze)+.112*gaze+.20*drowsy-.19*stretch+.17*Math.abs(watch),
      .22*gaze-.09*drowsy+.15*look-.12*stretch+.53*watch+.18*climbing*direction,
      -.12+.08*gaze-.12*drowsy+.17*stretch-.15*sway+.13*watch);
    jaw.rotation.x=.22*chew*(.54+.46*Math.sin(time*15));
    for(const close of setters)close(time+.34,drowsy);
    torso.updateMatrix();
    head.updateMatrix();
    for(const [i,claw] of fixedGrip.entries()) {
      const {base,guide,move}=anchors[i];
      const along=i===0?0:i===1?.228:.717;
      const order=direction>0?rightSteps:leftSteps;
      const [start,stop]=steps[order[i]];
      const phase=T.MathUtils.clamp((crawl-start)/(stop-start),0,1);
      const release=smooth(phase,0,.24)*(1-smooth(phase,.76,1));
      const newHold=along+crawlSpan*smooth(phase,.24,.76);
      // 先朝树皮外翻开爪，再沿枝换握。另两只爪停在原树皮坐标上。
      const outward=release*.174,c=Math.cos(yaw),s=Math.sin(yaw);
      claw.position.set(gripX+newHold*c-outward*s,gripY+release*.029,gripZ+newHold*s+outward*c);
      claw.rotation.set(release*.84,-yaw,release*direction*.060);
      shoulder.set(...base).applyMatrix4(torso.matrix);
      wrist.set(0,-.075,gripBark[i].front).applyEuler(claw.rotation).add(claw.position);
      move(shoulder,wrist,guide);
    }

    // 叶子先沿右脸外缘走，再从下颌送入口，腕骨全程在眼线以下。
    pickedAt.set(reachX,reachY,reachZ);
    mouthAt.copy(mouth.position).lerp(fruitMouth.position,smooth(fruitLean,0,.75))
      .applyMatrix4(head.matrix).applyMatrix4(torso.matrix);
    fromSide.set(mouthAt.x+.159,Math.min(reachY,mouthAt.y)-.115,mouthAt.z+.115);
    snack.copy(pickedAt).lerp(fromSide,smooth(delivery,0,.64));
    snack.lerp(mouthAt,smooth(delivery,.52,1));
    const reaching=smooth(reach);
    hand.position.set(.397+.030*fruitLean,-.113+.045*drowsy-.082*fruitLean,.141+.057*fruitLean)
      .lerp(pickedAt,reaching);
    // 换到枝的右端后叶在脸的正前下方，手指沿低弧够叶，起落点保持一致。
    hand.position.y-=Math.sin(Math.PI*reaching)*(.056+.064*fruitLean)*(1-holding);
    if(holding>0)hand.position.lerp(snack,holding);
    else {
      hand.position.lerp(mouthAt,delivery);
      const retreat=fruitLean*Math.sin(Math.PI*delivery);
      hand.position.x+=.064*retreat;
      hand.position.y-=.130*retreat;
      hand.position.z+=.095*retreat;
    }
    // 探爪从脸外侧向前走。摆动时空爪够到枝面，三处固定握点始终锁住。
    snack.set(.645,.135+.060*Math.sin(time*9)*stretch,.265);
    hand.position.lerp(snack,stretch);
    const clasp=smooth(sway,.04,.66);
    snack.set(gripX+.88*Math.cos(yaw),gripY-.025,gripZ+.88*Math.sin(yaw));
    hand.position.lerp(snack,clasp);
    hand.rotation.set(-.19-(.44+.35*fruitLean)*delivery-.48*clasp,.17+.29*delivery+.21*stretch,
      -.11*delivery+stretch*(.29+.15*Math.sin(time*10)));
    // 空着的前爪连在脸侧下方，收爪时也沿下颌后方退回。
    shoulder.set(.285+.045*fruitLean,-.112-.016*fruitLean,.065-.022*fruitLean).applyMatrix4(torso.matrix);
    wrist.set(0,-.024,-.086).applyEuler(hand.rotation).add(hand.position);
    feed(shoulder,wrist,feedGuide);
  }

  pose();
  return {root,pose,hand,mouth,fruitMouth,face,fixedGrip};
}
