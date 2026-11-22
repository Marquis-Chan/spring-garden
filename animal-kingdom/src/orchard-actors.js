import {corgiLegs} from './corgi-walk.js';

function group(T, parent, name, position = [0, 0, 0]) {
  const result = new T.Group();
  result.name = name;
  result.position.set(...position);
  parent?.add(result);
  return result;
}

function clay(T, color, roughness = 0.67, vertexColors = false) {
  return new T.MeshStandardMaterial({ color, roughness, vertexColors });
}

function mesh(T, parent, name, geometry, material, position, scale) {
  const result = new T.Mesh(geometry, material);
  result.name = name;
  if (position) result.position.set(...position);
  if (scale) result.scale.set(...scale);
  result.castShadow = result.receiveShadow = true;
  parent.add(result);
  return result;
}

// 闭合的截面网格让耳尖、翅片和毛色都有真实的体积与光照。
function sculpt(T, rings, sides, paint) {
  const points = [];
  const faces = [];
  const colors = [];
  const vertex = (x, y, z) => {
    points.push(x, y, z);
    if (paint) {
      const color = paint(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  };
  for (const [z, y, width, height, x = 0] of rings) {
    for (let i = 0; i < sides; i++) {
      const angle = i * Math.PI * 2 / sides;
      vertex(x + width * Math.sin(angle), y + height * Math.cos(angle), z);
    }
  }
  const rear = points.length / 3;
  const tip = rear + 1;
  const finalRing = (rings.length - 1) * sides;
  const [z0, y0, , , x0 = 0] = rings[0];
  const [z1, y1, , , x1 = 0] = rings.at(-1);
  vertex(x0, y0, z0 - 0.001);
  vertex(x1, y1, z1 + 0.001);

  for (let row = 0; row < rings.length - 1; row++) {
    for (let i = 0; i < sides; i++) {
      const a = row * sides + i;
      const b = row * sides + (i + 1) % sides;
      faces.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    faces.push(rear, i, next, tip, finalRing + next, finalRing + i);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  if (paint) geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function cord(T, parent, name, points, radius, material, sections = 8) {
  const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  return mesh(T, parent, name, new T.TubeGeometry(curve, sections, radius, 5, false), material);
}

function eye(T, parent, name, center, yaw, sphere, rim, dark, shine, crease, narrow = 1) {
  const socket = group(T, parent, name + ' socket', center);
  socket.rotation.set(-0.22, yaw, 0);
  const opening = group(T, socket, name + ' opening');
  mesh(T, opening, 'Iris rim', sphere, rim, [0, 0, 0], [0.055, 0.046, 0.025]);
  mesh(T, opening, 'Polished pupil', sphere, dark, [0, 0.001, 0.019], [0.042 * narrow, 0.039, 0.018]);
  mesh(T, opening, 'Eye light', sphere, shine, [-0.013, 0.014, 0.035], [0.009, 0.008, 0.004]);
  const fold = cord(T, socket, name + ' closed fold', [
    [-0.043, 0.005, 0.019], [-0.020, -0.007, 0.025],
    [0, -0.012, 0.027], [0.020, -0.007, 0.025], [0.043, 0.005, 0.019],
  ], 0.0037, crease);
  fold.castShadow = false;
  return (sleep, blink) => {
    opening.scale.y = Math.max(0.014, (1 - sleep) * blink);
    opening.visible = sleep < 0.98;
    fold.visible = sleep > 0.64;
  };
}

function leg(T, root, name, sphere, coat, sock, pad, size) {
  const upper = mesh(T, root, name + ' upper leg', sphere, coat);
  const lower = mesh(T, root, name + ' ankle', sphere, sock);
  const paw = group(T, root, name + ' paw');
  const [width, height, length] = size;
  mesh(T, paw, 'Rounded paw', sphere, pad, [0, 0, 0.024], [width, height, length]);
  const from = new T.Vector3();
  const bend = new T.Vector3();
  const contact = new T.Vector3();
  const axis = new T.Vector3();
  const up = new T.Vector3(0, 1, 0);

  function fit(part, a, b, rx, rz) {
    axis.subVectors(b, a);
    part.position.copy(a).lerp(b, 0.47);
    part.scale.set(rx, axis.length() * 0.58 + 0.029, rz);
    part.quaternion.setFromUnitVectors(up, axis.normalize());
  }

  return (hip, joint, foot, pitch = 0, yaw = 0) => {
    from.set(...hip);
    bend.set(...joint);
    contact.set(...foot);
    fit(upper, from, bend, width * 1.24, length * 1.03);
    fit(lower, bend, contact, width * 0.86, length * 0.68);
    paw.position.copy(contact);
    paw.rotation.set(pitch, yaw, 0);
  };
}

function blinking(time, period, length) {
  const phase = time % period;
  return phase > period - length ? 1 - 0.94 * Math.sin(Math.PI * (phase - period + length) / length) : 1;
}

// 截面之间平滑放样，保留胸深、腰腹和臀部各自的轮廓。
function roundedSections(T,sections){
  const curves=[0,1].map(start=>new T.CatmullRomCurve3(
    sections.map(r=>new T.Vector3(...(start?[r[2],r[3],0]:[r[0],r[1],0]))),false,'catmullrom',.42));
  const count=(sections.length-1)*4;
  return Array.from({length:count+1},(_,i)=>{
    const center=curves[0].getPoint(i/count),size=curves[1].getPoint(i/count);
    return [center.x,center.y,size.x,size.y];
  });
}

// 一条连续的毛皮从肩或髋包到腕、跗部。后膝向前，飞节向后；白袜随小腿一起弯曲。
function corgiLeg(T,root,leg,sphere,cream,painted){
  const {side,front,x,z}=leg,name=(side>0?'Left':'Right')+(front?' front':' rear')+' dog';
  const profile=front?
    [[.010,.022],[.063,.088],[.068,.090],[.052,.063],[.042,.046],[.034,.037],[.030,.030]]:
    [[.014,.024],[.079,.118],[.081,.111],[.060,.082],[.044,.054],[.032,.037],[.029,.029]];
  const sides=16,rows=(profile.length-1)*3+1,positions=new T.Float32BufferAttribute(new Float32Array(rows*sides*3),3);
  positions.setUsage(T.DynamicDrawUsage);
  const angles=Array.from({length:sides},(_,i)=>[Math.cos(2*Math.PI*i/sides),Math.sin(2*Math.PI*i/sides)]);
  const colors=[],indices=[],gold=new T.Color('#ca8953'),sock=new T.Color('#f4dfb9');
  const radii=new T.CatmullRomCurve3(profile.map(([a,b])=>new T.Vector3(a,b,0)),false,'catmullrom',.43);
  const sizes=radii.getPoints(rows-1);
  sizes.forEach((_,row)=>{
    const color=gold.clone().lerp(sock,T.MathUtils.smoothstep(row/3+(front?1:0),2.3,4.6));
    angles.forEach((_,i)=>{
      colors.push(color.r,color.g,color.b);
      if(row+1===rows)return;
      const a=row*sides+i,b=row*sides+(i+1)%sides;
      indices.push(a,b,a+sides,b,b+sides,a+sides);
    });
  });
  const geo=new T.BufferGeometry();geo.setAttribute('position',positions);geo.setIndex(indices);
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const skin=mesh(T,root,name+' coat',geo,painted);skin.frustumCulled=false;
  const paw=group(T,root,name+' paw');
  const spine=new T.CatmullRomCurve3(profile.map(()=>new T.Vector3()),false,'catmullrom',.4);
  const center=new T.Vector3(),tangent=new T.Vector3(),lateral=new T.Vector3(),lengthwise=new T.Vector3();
  mesh(T,paw,'Weight-bearing pad',sphere,cream,[0,0,.013],[front?.050:.053,.043,.070]);
  for(const toe of [-1,0,1])mesh(T,paw,'Toe',sphere,cream,[toe*.024,-.011,.056-.006*Math.abs(toe)],[.018,.026,.032]);
  return (foot,bodyY,rest,ground)=>{
    const px=T.MathUtils.lerp(foot?.localX??x,x+side*.047,rest),pz=T.MathUtils.lerp(foot?.localZ??z,z+(front?.095:.075),rest);
    const fy=.043+ground+(1-rest)*(foot?.up??0),lift=fy-.043-ground;
    const hipY=bodyY+(front?.040:.047),dz=pz-z;
    const jointZ=z+(front?-.040:.071)+dz*.43+(front?-.24:.29)*lift;
    const jointY=hipY+(fy-hipY)*.48+lift*.17;
    const hockZ=pz-(front?.014:.050)-lift*.16;
    const hockY=fy+(hipY-fy)*(front?.245:.255);
    const midX=(px+x)*.5;
    const rings=[
      [x-side*.045,hipY+.050,z-.024],[x-side*.023,hipY,z-.016],
      [x,(hipY+jointY)*.5,(z+jointZ)*.5],
      [midX,jointY,jointZ],[midX,(jointY+hockY)*.5,(jointZ+hockZ)*.5],
      [px,hockY,hockZ],[px,fy+.003,pz-.011]
    ];
    rings.forEach((p,i)=>spine.points[i].set(...p));
    for(let r=0;r<rows;r++){
      const t=r/(rows-1);spine.getPoint(t,center);spine.getTangent(t,tangent);
      lateral.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();
      lengthwise.crossVectors(tangent,lateral);
      angles.forEach(([c,s],i)=>{
        const w=c*sizes[r].x,h=s*sizes[r].y;
        positions.setXYZ(r*sides+i,center.x+w*lateral.x+h*lengthwise.x,
          center.y+w*lateral.y+h*lengthwise.y,center.z+w*lateral.z+h*lengthwise.z);
      });
    }
    positions.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
    paw.position.set(px,fy,pz);paw.rotation.set((foot?.pitch??0)*(1-rest),side*(.024+.10*rest),0);
  };
}

// 眼睛顺着颊骨的斜面生长。眼圈、虹膜、瞳孔和眼神光共用缓凸的眼面。
function corgiEye(T,head,sign,depth,material,ink){
  const ex=sign*.141,ey=.057,rx=.046,ry=.034,rows=14,segments=48;
  const coords=[],colors=[],faces=[],position=[];
  const rim=new T.Color('#39291e'),iris=new T.Color('#95633b'),pupil=new T.Color('#30251f'),shine=new T.Color('#fff5da');
  const shade=new T.Color(),smooth=T.MathUtils.smoothstep;
  for(let row=0;row<=rows;row++)for(let j=0;j<segments;j++){
    const r=row/rows,a=2*Math.PI*j/segments,u=r*Math.cos(a),v=r*Math.sin(a);
    const x=ex+rx*u,dy=ry*v*(1-.20*u*u)-sign*.003*u;
    const bulge=.0014+.011*(1-r*r);
    coords.push([x,dy,bulge]);
    position.push(x,ey+dy,depth(x,ey+dy)+bulge);
    const radius=Math.hypot((u+sign*.05)*1.25,v*.94);
    shade.copy(iris).multiplyScalar(.90-.17*v).lerp(rim,.90*smooth(radius,.74,.96))
      .lerp(pupil,1-smooth(radius,.43,.56)).lerp(rim,smooth(r,.88,.99));
    const fleck=Math.hypot((u+.22)*.92,v-.31);
    shade.lerp(shine,1-smooth(fleck,.105,.18));
    colors.push(shade.r,shade.g,shade.b);
    if(row<rows){const n=row*segments+j,k=row*segments+(j+1)%segments;faces.push(n,n+segments,k+segments,n,k+segments,k);}
  }
  const geo=new T.BufferGeometry(),attr=new T.Float32BufferAttribute(position,3);
  geo.setAttribute('position',attr);geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(faces);geo.computeVertexNormals();
  const eye=mesh(T,head,'Almond eye',geo,material);
  const fold=cord(T,head,'Resting eyelid',[-1,-.5,0,.5,1].map(u=>{
    const x=ex+rx*u,y=ey-.006*(1-u*u)+sign*.0035*u;
    return [x,y,depth(x,y)+.002];
  }),.0038,ink);
  let previous=1;
  return (sleep,blink)=>{
    const aperture=(1-sleep)*blink;
    eye.visible=aperture>.055;fold.visible=aperture<.20;
    if(!eye.visible||Math.abs(previous-aperture)<.004)return;
    previous=aperture;
    coords.forEach(([x,dy,h],i)=>{
      const y=ey+dy*aperture;
      attr.setXYZ(i,x,y,depth(x,y)+.0014+(h-.0014)*aperture);
    });
    attr.needsUpdate=true;geo.computeVertexNormals();
  };
}

export function makeCorgi(T) {
  const root = group(T, null, 'Orchard corgi');
  const body = group(T, root, 'Dog body', [0, 0.376, -0.074]);
  const head = group(T, body, 'Dog head', [0, 0.188, 0.377]);
  const muzzle = group(T, head, 'Dog muzzle', [0, -0.050, 0.198]);
  const jaw = group(T, muzzle, 'Dog jaw', [0, -0.031, -0.063]);
  const tail = group(T, body, 'Dog tail', [0, 0.034, -0.544]);
  const sphere = new T.SphereGeometry(1, 20, 14);
  const small = new T.SphereGeometry(1, 14, 9);
  const painted = clay(T, '#ffffff', 0.63, true);
  const cream = clay(T, '#f4e1bd');
  const nose = clay(T, '#302824', 0.52);
  const mouth = clay(T, '#744339');
  const tongue = clay(T, '#d87f73', 0.54);
  const color = new T.Color();
  const white = new T.Color('#f5e5c5');
  const gold = new T.Color('#d99556');
  const toasted = new T.Color('#ae6e40');
  const honey=new T.Color('#edb478'),freckle=clay(T,'#a58264');
  const s = T.MathUtils.smoothstep;

  function coat(x, y, z) {
    const bib = s(z, 0.150, 0.365) * (1 - s(Math.abs(x), 0.18, 0.273)) *
      (1 - s(y, 0.10, 0.248));
    const belly = 1 - s(y, -0.225, -0.055);
    return color.copy(gold).lerp(toasted, s(y, 0.055, 0.24) * 0.79)
      .lerp(white, Math.max(bib * 0.98, belly));
  }

  function face(x,y,z){
    const width=.015+.024*s(z,.04,.20)+.058*s(z,.17,.29);
    const blaze=(1-s(Math.abs(x-.005*Math.sin(z*23)),width-.008,width+.008))*s(z,-.12,.05);
    const edge=-.068+.093*s(Math.abs(x),.066,.245)+.048*s(z,.13,.25)+.013*Math.cos(z*26);
    const cheeks=(1-s(y,edge-.015,edge+.018))*s(z,-.14,.025);
    const brow=Math.exp(-(((Math.abs(x)-.141)/.054)**2+((y-.105)/.028)**2))*s(z,.02,.12);
    return color.copy(gold).lerp(toasted,.46*s(y,.08,.20)).lerp(honey,brow*.73).lerp(white,Math.max(blaze,cheeks));
  }

  mesh(T, body, 'Long low back and chest', sculpt(T, roundedSections(T,[
    [-0.591, -0.016, 0.009, 0.012], [-0.558, -0.013, 0.116, 0.132],
    [-0.477, 0.019, 0.190, 0.160], [-0.359, 0.028, 0.210, 0.182],
    [-0.211, 0.061, 0.182, 0.155], [-0.044, 0.046, 0.191, 0.176],
    [0.134, 0.025, 0.226, 0.212], [0.284, 0.027, 0.231, 0.222],
    [0.384, 0.064, 0.198, 0.192], [0.456, 0.077, 0.130, 0.143],
    [0.492, 0.061, 0.055, 0.071], [0.505, 0.059, 0.013, 0.018],
  ]), 40, coat), painted);
  // 宽额、颊骨和收起的口吻共用一张皮，白斑随颊部自然转折。
  const headSections=roundedSections(T,[
    [-.206,.012,.022,.025],[-.174,.013,.160,.139],[-.111,.017,.231,.172],
    [-.022,.022,.256,.170],[.068,.017,.242,.163],[.125,.007,.217,.141],
    [.162,-.004,.184,.114],[.196,-.024,.149,.087],[.226,-.040,.126,.064],
    [.268,-.046,.109,.049],[.311,-.049,.090,.041],[.346,-.044,.062,.032],
    [.361,-.043,.033,.020],
  ]);
  mesh(T,head,'Corgi broad forehead',sculpt(T,headSections,96,face),painted);
  // 按脸部放样截面取前表面深度，使眼圈和嘴角从正面、侧面都贴在脸上。
  function faceDepth(x,y){
    let outside=1;
    for(let i=headSections.length-1;i>=0;i--){
      const [z,cy,w,h]=headSections[i],d=(x/w)**2+((y-cy)/h)**2-1;
      if(d<=0){
        const next=headSections[i+1];
        return next?z+(next[0]-z)*(-d)/(outside-d):z;
      }
      outside=d;
    }
    return 0;
  }
  const leather=sculpt(T,roundedSections(T,[
    [-.025,.004,.040,.023],[-.009,.007,.067,.033],[.012,.003,.071,.035],
    [.028,-.001,.056,.030],[.039,-.002,.030,.021],[.042,-.004,.007,.010]
  ]),36);
  const noseVertices=leather.attributes.position;
  for(let i=0;i<noseVertices.count;i++)noseVertices.setX(i,noseVertices.getX(i)*(.68+.32*s(noseVertices.getY(i),-.025,.019)));
  leather.computeVertexNormals();
  mesh(T,muzzle,'Rounded nose',leather,nose,[0,.010,.156]);
  mesh(T,jaw,'Lower lip',sculpt(T,roundedSections(T,[
    [-.030,-.004,.035,.023],[.020,-.004,.091,.034],[.085,-.012,.097,.031],
    [.144,-.012,.077,.025],[.175,-.008,.046,.017],[.187,-.004,.011,.007]
  ]),32),cream);
  const throat=group(T,muzzle,'Mouth hinge',jaw.position.toArray());
  const palateRows=[[-.052,.042],[-.012,.065],[.035,.088],[.085,.088],[.131,.077],[.161,.056],[.179,.028],[.182,.004]];
  const cavity=new T.BufferGeometry(),inside=[],edges=[];
  palateRows.forEach(([z,w],i)=>{
    inside.push(-w,.020,z,w,.020,z,-w,.003,z,w,.003,z);
    if(i===0)return;
    const a=(i-1)*4,b=i*4;
    edges.push(a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1,a,a+1,b,a+1,b+1,b,a+2,b+2,a+3,b+2,b+3,a+3);
  });
  const last=(palateRows.length-1)*4;edges.push(last,last+2,last+1,last+1,last+2,last+3);
  const lining=new T.Float32BufferAttribute(inside,3);cavity.setAttribute('position',lining);cavity.setIndex(edges);
  const inner=clay(T,'#56302d');inner.side=T.DoubleSide;
  const mouthGap=mesh(T,throat,'Inner mouth',cavity,inner);
  let lastOpening=-1;
  function shapeMouth(angle){
    if(Math.abs(angle-lastOpening)<.0008)return;
    lastOpening=angle;const c=Math.cos(angle),s=Math.sin(angle);
    palateRows.forEach(([z,w],i)=>{
      for(let j=0;j<2;j++)lining.setXYZ(i*4+2+j,(j?1:-1)*w*.89,.003*c-z*s,z*c+.003*s);
    });
    lining.needsUpdate=true;cavity.computeVertexNormals();cavity.computeBoundingSphere();
  }
  const tongueTip = mesh(T, jaw, 'Tongue', small, tongue, [0, 0.027, 0.137], [0.039, 0.015, 0.049]);
  mesh(T,tail,'Cream-tipped bobtail',sculpt(T,roundedSections(T,[
    [-.156,.071,.009,.011],[-.132,.067,.053,.050],[-.072,.051,.076,.066],
    [-.014,.033,.073,.067],[.048,.016,.048,.041],[.073,.012,.011,.014]
  ]),24,(x,y,z)=>color.copy(white).lerp(gold,s(z+.11*y,-.12,-.062))),painted);

  // 一片耳廓同时塑出厚边和内凹的耳窝，宠物转耳时内外两面一起动。
  const earRows=roundedSections(T,[
    [-.045,0,.056,.036],[.005,.002,.095,.049],[.073,.014,.101,.046],
    [.145,.024,.083,.036],[.207,.029,.057,.029],[.247,.031,.034,.022],
    [.264,.030,.019,.014],[.271,.029,.005,.005]
  ]);
  const earSides=56,outerEar=sculpt(T,earRows,earSides);
  const ep=outerEar.attributes.position,ec=new Float32Array(ep.count*3);
  const earFur=new T.Color('#bd8251'),earRim=new T.Color('#daab78'),earPink=new T.Color('#cb9684'),canal=new T.Color('#987365');
  for(let i=0;i<ep.count;i++){
    const row=earRows[Math.min(earRows.length-1,Math.floor(i/earSides))];
    const h=ep.getZ(i),across=ep.getX(i)/row[2],front=(row[1]-ep.getY(i))/row[3];
    const cup=s(front,.62,.93)*s(h,.019,.085)*(1-s(h,.191,.249));
    const center=1-Math.min(1,Math.abs(across));
    ep.setX(i,ep.getX(i)+.045*s(h,-.025,.26));
    ep.setY(i,ep.getY(i)+cup*center*.044);
    color.copy(earFur).lerp(earRim,s(front,-.12,.32)).lerp(earPink,cup)
      .lerp(canal,cup*(1-s(h,.068,.167))*center*.82);
    ec.set([color.r,color.g,color.b],i*3);
  }
  outerEar.setAttribute('color',new T.BufferAttribute(ec,3));outerEar.computeVertexNormals();outerEar.rotateX(-Math.PI/2);
  const ears = [];
  const eyes = [];
  head.scale.set(.99,.95,1);
  const legs=corgiLegs.map(leg=>corgiLeg(T,root,leg,small,cream,painted));
  const ink=clay(T,'#332822');
  // 在头部表面找到眼窝的真实深度，避免正看时虹膜和眼神光被额头遮住。
  for(const sign of [-1,1]){
    const side=sign>0?'Left':'Right';
    const ear=group(T,head,side+' corgi ear',[sign*.164,.121,-.040]);
    mesh(T,ear,'Cupped ear',outerEar,painted).scale.x=sign;ears.push({sign,ear});
    eyes.push(corgiEye(T,head,sign,faceDepth,painted,ink));
    mesh(T,muzzle,'Nostril',small,ink,[sign*.033,.012,.191],[.012,.006,.0025]).rotation.z=sign*.24;
    for(const [x,y] of [[.070,-.061],[.086,-.056],[.080,-.067]]){
      mesh(T,head,'Whisker root',small,freckle,[sign*x,y,faceDepth(x,y)+.0014],[.0028,.0024,.0021]);
    }
    const lip=[[.014,-.084],[.042,-.084],[.074,-.080],[.104,-.070],[.122,-.058]];
    cord(T,head,side+' muzzle crease',lip.map(([x,y])=>[sign*x,y,faceDepth(x,y)+.0018]),.0034,mouth);
  }

  function pose({ time = 0, stride = 0, gait = 0, sniff = 0, bark = 0, sleep = 0, feet,groundAt,x=0,z=0 } = {}) {
    const rest = s(sleep, 0, 1);
    const run = gait * (1 - rest);
    const noseDown = sniff * (1 - rest);
    const voice = bark * (1 - rest);
    const inhale = Math.sin(time * (4.2 - rest * 1.6)) * 0.005;
    const bounce = Math.sin(stride*2) * run * 0.005;
    body.position.y = 0.376 - rest * 0.112 + inhale + bounce;
    body.rotation.set(noseDown * 0.04 - voice * 0.052, 0, Math.sin(stride) * run * 0.014);
    head.position.set(rest * 0.039, 0.188 - noseDown * 0.130 - rest * 0.048, 0.377 - rest * 0.027);
    head.rotation.set(noseDown * 0.66 - voice * 0.16 + rest * 0.31 + run * Math.sin(stride * 2) * 0.033,
      rest * 0.27, rest * -0.16);
    jaw.rotation.x=(1-rest)*(.105+.055*run+.012*Math.sin(time*2.6))*(1-noseDown)+voice*.36;
    shapeMouth(jaw.rotation.x);mouthGap.visible=jaw.rotation.x>.020;tongueTip.visible=voice>.19;
    tail.rotation.set(rest * -0.19, Math.sin(time * (5 + run * 4)) * (0.14 + run * 0.38) * (1 - rest), 0);
    for (const { sign, ear } of ears) {
      ear.rotation.set(-0.08 - rest * 0.53 + run * Math.sin(stride + sign) * 0.062,
        sign * 0.19, sign * (-0.23 - rest * 0.19));
    }
    const blink = blinking(time, 4.9, 0.16);
    for (const closeEye of eyes) closeEye(rest, blink);

    const floor=groundAt?.(x,z)??0;
    legs.forEach((place,i)=>{
      const foot=feet?.[i],ground=groundAt&&foot?groundAt(foot.x,foot.z)-floor:0;
      place(foot,body.position.y,rest,ground);
    });
  }

  pose();
  return { root, pose };
}

export function makeButterfly(T) {
  const root = group(T, null, 'Orchard butterfly');
  const body = group(T, root, 'Butterfly body');
  const sphere = new T.SphereGeometry(1, 14, 10);
  const shell = clay(T, '#4e4260', 0.54);
  const bead = clay(T, '#554463', 0.62);
  const pigment = clay(T, '#ffffff', 0.61, true);
  const blue = new T.Color('#789dcd');
  const iris = new T.Color('#7566a3');
  const midnight = new T.Color('#4b416f');
  const pearl = new T.Color('#e8d9d0');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  function wingColor(x, y, z) {
    const rim = s(z + Math.abs(x) * 0.47, 0.305, 0.438);
    const paler = s(y, -0.012, 0.016) * (1 - rim);
    const crescent = 1 - s(Math.hypot((x + 0.084) / 0.051, (z - 0.290) / 0.064), 0.57, 1.07);
    return color.copy(iris).lerp(blue, paler * 0.90).lerp(midnight, rim * 0.91).lerp(pearl, crescent * 0.93);
  }

  function hindColor(x, y, z) {
    const rim = s(z + Math.abs(x + 0.075) * 0.43, 0.212, 0.371);
    const spot = 1 - s(Math.hypot((x - 0.096) / 0.044, (z - 0.219) / 0.067), 0.48, 1.03);
    return color.copy(iris).lerp(blue, s(y, -0.017, 0.025) * 0.64)
      .lerp(midnight, rim * 0.87).lerp(pearl, spot * 0.74);
  }

  const frontWing = sculpt(T, [
    [-0.006, 0.000, 0.014, 0.008], [0.034, 0.009, 0.061, 0.012, -0.023],
    [0.087, 0.018, 0.098, 0.016, -0.051], [0.161, 0.027, 0.125, 0.018, -0.082],
    [0.236, 0.032, 0.128, 0.019, -0.099], [0.300, 0.034, 0.109, 0.017, -0.118],
    [0.358, 0.033, 0.077, 0.015, -0.145], [0.398, 0.031, 0.031, 0.010, -0.173],
    [0.410, 0.031, 0.005, 0.003, -0.183],
  ], 30, wingColor).rotateY(Math.PI / 2);
  const hindWing = sculpt(T, [
    [-0.010, -0.007, 0.013, 0.004], [0.037, -0.003, 0.060, 0.012, 0.046],
    [0.089, 0.000, 0.097, 0.016, 0.084], [0.152, 0.010, 0.114, 0.021, 0.106],
    [0.224, 0.018, 0.106, 0.019, 0.101], [0.272, 0.024, 0.067, 0.016, 0.094],
    [0.305, 0.026, 0.033, 0.011, 0.079], [0.320, 0.026, 0.005, 0.003, 0.060],
  ], 26, hindColor).rotateY(Math.PI / 2);

  mesh(T, body, 'Rounded butterfly abdomen', sphere, shell, [0, 0.080, -0.059], [0.022, 0.028, 0.115]);
  mesh(T, body, 'Butterfly thorax', sphere, shell, [0, 0.087, 0.020], [0.034, 0.035, 0.056]);
  mesh(T, body, 'Butterfly head', sphere, shell, [0, 0.101, 0.074], [0.029, 0.030, 0.031]);
  const wings = [];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const hinge = group(T, body, side + ' butterfly wing', [sign * 0.017, 0.098, 0.014]);
    const wingPair = group(T, hinge, 'Raised wing pair');
    wingPair.scale.x = sign;
    mesh(T, wingPair, 'Round hindwing', hindWing, pigment, [0, -0.004, -0.020]);
    mesh(T, wingPair, 'Crescent forewing', frontWing, pigment);
    wings.push({ sign, hinge });
    cord(T, body, 'Curving butterfly antenna', [
      [sign * 0.014, 0.118, 0.094], [sign * 0.027, 0.150, 0.133],
      [sign * 0.051, 0.162, 0.161], [sign * 0.072, 0.158, 0.176],
    ], 0.0043, bead, 9);
    mesh(T, body, 'Round antenna tip', sphere, bead, [sign * 0.070, 0.158, 0.176], [0.009, 0.008, 0.008]);
    for (const pair of [-1, 0, 1]) {
      const z = pair * 0.040;
      cord(T, body, 'Butterfly flower grip', [[sign * 0.014, 0.074, z],
        [sign * 0.039, 0.037, z + 0.013], [sign * 0.034, 0.008, z + 0.028]], 0.0036, shell, 5);
    }
  }

  function pose({ time = 0, flap = 0, flight = 0, perch = null, sleep = 0 } = {}) {
    const landed = perch == null ? 0 : 1 - flight;
    body.position.y = Math.sin(time * 9) * flight * 0.007;
    body.rotation.x = flight * -0.13;
    for (const { sign, hinge } of wings) {
      const quietWing = flap * 0.25 * landed;
      hinge.rotation.set(flight * 0.10, sign * (0.04 + landed * 0.09),
        sign * (0.17 + landed * (0.67 + sleep * .56) + flight * flap * 0.89 + quietWing));
    }
  }

  pose();
  return { root, pose };
}

export function makeBee(T) {
  const root = group(T, null, 'Orchard honeybee');
  const body = group(T, root, 'Bee body');
  const sphere = new T.SphereGeometry(1, 14, 10);
  const velvet = clay(T, '#fff', 0.73, true);
  const honey = clay(T, '#c79048', 0.70);
  const amber = clay(T, '#dfae5c', 0.72);
  const charcoal = clay(T, '#504235', 0.61);
  const pupil = clay(T, '#3d342e', 0.38);
  const softWing = clay(T, '#e6ead8', 0.42);
  softWing.transparent = true;
  softWing.opacity = 0.74;
  softWing.depthWrite = false;
  const gold = new T.Color('#dfa340');
  const light = new T.Color('#f1c572');
  const dark = new T.Color('#654a35');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  function stripe(x, y, z) {
    const ridge = Math.sin((z + 0.149) * 92 + 0.44 * Math.abs(x) / 0.082 + y * 3.7);
    const band = s(ridge, -0.05, 0.43) * (1 - s(z, 0.007, 0.038));
    return color.copy(gold).lerp(light, s(y, -0.012, 0.070) * 0.59).lerp(dark, band * 0.95);
  }
  const abdomen = Array.from({ length: 22 }, (_, i) => {
    const q = i / 21;
    const r = Math.max(0.08, Math.sin(Math.PI * q) ** 0.67);
    return [-0.165 + q * 0.211, 0.003 - (1 - q) * 0.016,
      r * (0.064 + q * 0.015), r * (0.065 + q * 0.010)];
  });
  mesh(T, body, 'Striped bee abdomen', sculpt(T, abdomen, 24, stripe), velvet, [0, 0.095, -0.039]);
  mesh(T, body, 'Round thorax', sphere, honey, [0, 0.104, 0.036], [0.065, 0.066, 0.062]);
  mesh(T, body, 'Bee face', sphere, amber, [0, 0.107, 0.100], [0.051, 0.052, 0.045]);

  const wingGeometry = sculpt(T, [
    [-0.004, 0.0, 0.010, 0.004], [0.026, 0.006, 0.034, 0.007, 0.012],
    [0.073, 0.012, 0.050, 0.009, 0.031], [0.126, 0.015, 0.051, 0.010, 0.048],
    [0.166, 0.019, 0.035, 0.008, 0.061], [0.194, 0.019, 0.014, 0.005, 0.079],
    [0.201, 0.019, 0.004, 0.002, 0.085],
  ], 20).rotateY(Math.PI / 2);
  const wings = [];
  const feet = [];
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    mesh(T, body, side + ' bee eye', sphere, pupil, [sign * 0.032, 0.116, 0.130], [0.020, 0.025, 0.016]);
    cord(T, body, 'Bee antenna', [
      [sign * 0.015, 0.138, 0.118], [sign * 0.023, 0.167, 0.138],
      [sign * 0.038, 0.186, 0.159], [sign * 0.054, 0.178, 0.171],
    ], 0.0045, charcoal, 8);
    mesh(T, body, 'Bee antenna tip', sphere, charcoal,
      [sign * 0.054, 0.178, 0.171], [0.0075, 0.0075, 0.0075]);

    const hinge = group(T, body, side + ' bee wing', [sign * 0.040, 0.149, 0.018]);
    const fan = group(T, hinge, 'Translucent wing pair');
    fan.scale.x = sign;
    const wing = mesh(T, fan, 'Cream glass forewing', wingGeometry, softWing);
    const smallerWing = mesh(T, fan, 'Cream glass hindwing', wingGeometry, softWing,
      [0.012, -0.009, -0.035], [0.76, 0.83, 0.85]);
    wing.castShadow = smallerWing.castShadow = false;
    wings.push({ sign, hinge });

    for (const pair of [-1, 0, 1]) {
      const foot = group(T, body, 'Bee jointed foot', [sign * 0.032, 0.074, pair * 0.047 - 0.005]);
      cord(T, foot, 'Bee leg segments', [[0, 0, 0], [sign * 0.034, -0.034, pair * 0.017],
        [sign * 0.028, -0.061, pair * 0.016], [sign * 0.040, -0.070, pair * 0.019 + 0.009]],
      0.006, charcoal, 6);
      if (pair < 0) mesh(T, foot, 'Golden pollen pouch', sphere, amber,
        [sign * 0.032, -0.040, -0.016], [0.017, 0.018, 0.016]);
      feet.push({ foot, sign });
    }
  }

  function pose({ time = 0, flap = 0, flight = 0, perch = null, hiveIdle = false } = {}) {
    const landed = perch == null ? 0 : 1 - flight;
    const hover = Number(hiveIdle);
    body.position.y = Math.sin(time * 11) * flight * 0.005 + Math.sin(time * 5.1) * hover * 0.023;
    body.rotation.x = flight * 0.08 + hover * (0.10 + 0.06 * Math.sin(time * 3.8));
    body.rotation.y = hover * 0.18 * Math.sin(time * 2.4);
    for (const { sign, hinge } of wings) {
      hinge.rotation.set(0, sign * (0.14 + landed * 0.53),
        sign * (0.19 + landed * 0.075 + flight * flap * 0.87 + hover * 0.48 * Math.sin(time * 61)));
    }
    for (const { sign, foot } of feet) {
      foot.rotation.z = sign * (flight + 0.53 * hover) * -0.28;
      foot.rotation.x = -(flight + 0.53 * hover) * 0.38;
    }
  }

  pose();
  return { root, pose };
}


function paintedTail(T, points, colors) {
  const segments = 36;
  const radial = 12;
  const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  const geometry = new T.TubeGeometry(curve, segments, 0.065, radial, false);
  const position = geometry.attributes.position;
  const tint = [];
  const color = new T.Color();
  const [oat, amber, charcoal] = colors;
  const smooth = T.MathUtils.smoothstep;

  // 色环和尾巴共用同一片曲面，摆尾时斑纹随曲面走。
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    const center = curve.getPointAt(t);
    const taper = 1 - 0.55 * t - 0.32 * smooth(t, 0.91, 1);
    for (let j = 0; j <= radial; j++) {
      const i = ring * (radial + 1) + j;
      position.setXYZ(i, center.x + (position.getX(i) - center.x) * taper,
        center.y + (position.getY(i) - center.y) * taper,
        center.z + (position.getZ(i) - center.z) * taper);
      const band = Math.sin(t * 24.8 + Math.cos(j / radial * Math.PI * 2) * 0.38);
      color.copy(oat).lerp(amber, smooth(band, -0.18, 0.34))
        .lerp(charcoal, Math.max(smooth(band, 0.60, 0.93) * 0.88, smooth(t, 0.84, 0.99)));
      tint.push(color.r, color.g, color.b);
    }
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(tint, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function makeCat(T) {
  const root = group(T, null, 'Orchard calico cat');
  const body = group(T, root, 'Cat body', [0, 0.421, -0.072]);
  const head = group(T, body, 'Cat head', [0, 0.216, 0.305]);
  const tail = group(T, body, 'Cat tail', [0, 0.031, -0.438]);
  const sphere = new T.SphereGeometry(1, 20, 14);
  const small = new T.SphereGeometry(1, 14, 9);
  const painted = clay(T, '#ffffff', 0.68, true);
  const cream = clay(T, '#f0dec2');
  const cinnamon = clay(T, '#bf8355');
  const black = clay(T, '#534841');
  const peach = clay(T, '#d2a298');
  const nose = clay(T, '#98685f', 0.57);
  const amber = clay(T, '#b29453', 0.53);
  const pupil = clay(T, '#473a2f', 0.35);
  const glint = clay(T, '#fff2d0', 0.45);
  const color = new T.Color();
  const white = new T.Color('#f2e4cb');
  const oat = new T.Color('#d8c2a3');
  const rust = new T.Color('#c78855');
  const charcoal = new T.Color('#5b4d43');
  const s = T.MathUtils.smoothstep;

  function spot(x, y, z, cx, cy, cz, sx, sy, sz) {
    return 1 - s(Math.hypot((x - cx) / sx, (y - cy) / sy, (z - cz) / sz), 0.77, 1.10);
  }

  function coat(x, y, z) {
    const ginger = Math.max(spot(x, y, z, -0.146, 0.071, 0.108, 0.218, 0.189, 0.258),
      spot(x, y, z, 0.151, 0.105, -0.321, 0.169, 0.153, 0.164));
    const smoke = Math.max(spot(x, y, z, 0.169, 0.118, -0.049, 0.169, 0.157, 0.214),
      spot(x, y, z, -0.112, 0.116, -0.311, 0.178, 0.157, 0.195));
    return color.copy(white).lerp(oat, s(y, 0.012, 0.19) * 0.61)
      .lerp(rust, ginger).lerp(charcoal, smoke * 0.95);
  }

  function face(x, y, z) {
    const ginger = spot(x, y, z, 0.144, 0.092, 0.053, 0.151, 0.16, 0.155);
    const smoke = spot(x, y, z, -0.159, 0.070, -0.003, 0.129, 0.131, 0.177);
    return color.copy(white).lerp(oat, s(y, 0.012, 0.175) * 0.48)
      .lerp(rust, ginger).lerp(charcoal, smoke * 0.90);
  }

  mesh(T, body, 'Painted cat shoulders and spine', sculpt(T, [
    [-0.481, -0.024, 0.010, 0.012], [-0.455, -0.021, 0.096, 0.105],
    [-0.381, -0.013, 0.178, 0.157], [-0.283, -0.002, 0.219, 0.183],
    [-0.168, 0.017, 0.223, 0.186], [-0.046, 0.021, 0.209, 0.182],
    [0.087, 0.029, 0.204, 0.179], [0.208, 0.039, 0.192, 0.179],
    [0.314, 0.072, 0.150, 0.143], [0.382, 0.102, 0.081, 0.095],
    [0.406, 0.112, 0.014, 0.018],
  ], 32, coat), painted);
  mesh(T, head, 'Calico face', sculpt(T, [
    [-0.168, -0.006, 0.010, 0.015], [-0.144, -0.003, 0.087, 0.093],
    [-0.086, 0.000, 0.154, 0.134], [-0.013, 0.002, 0.188, 0.152],
    [0.072, -0.001, 0.188, 0.146], [0.136, -0.014, 0.159, 0.122],
    [0.184, -0.030, 0.116, 0.087], [0.209, -0.048, 0.061, 0.047],
    [0.222, -0.049, 0.010, 0.015],
  ], 32, face), painted);
  mesh(T, head, 'Cat nose', small, nose, [0, -0.034, 0.219], [0.042, 0.026, 0.033]);
  cord(T, head, 'Mouth crease', [[0, -0.058, 0.236], [0, -0.078, 0.216], [0, -0.085, 0.197]],
    0.0045, nose, 6);

  const tailPath = [[0, 0, 0], [0.004, 0.072, -0.135], [0.039, 0.159, -0.261], [0.066, 0.326, -0.323],
    [0.049, 0.420, -0.309], [0.004, 0.440, -0.254], [-0.038, 0.408, -0.218]];
  mesh(T, tail, 'Tail with painted rings', paintedTail(T, tailPath, [oat, rust, charcoal]), painted);
  mesh(T, tail, 'Rounded tail tip', small, black, tailPath.at(-1), [0.013, 0.013, 0.013]);

  const outerEar = sculpt(T, [
    [-0.015, -0.003, 0.032, 0.025], [0.013, -0.006, 0.079, 0.040],
    [0.060, -0.012, 0.062, 0.034, 0.015], [0.107, -0.023, 0.045, 0.022, 0.028],
    [0.157, -0.033, 0.024, 0.013, 0.042], [0.185, -0.044, 0.006, 0.006, 0.048],
  ], 18).rotateX(-Math.PI / 2);
  const lining = sculpt(T, [
    [0.041, -0.036, 0.022, 0.007, 0.010], [0.081, -0.041, 0.044, 0.010, 0.019],
    [0.119, -0.045, 0.027, 0.008, 0.031], [0.156, -0.047, 0.006, 0.004, 0.043],
  ], 15).rotateX(-Math.PI / 2);
  const legs = [];
  const eyes = [];
  const ears = [];
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const ear = group(T, head, side + ' triangular cat ear', [sign * 0.109, 0.124, -0.042]);
    mesh(T, ear, 'Coat colored ear', outerEar, sign < 0 ? black : cinnamon).scale.x = sign;
    mesh(T, ear, 'Peach ear lining', lining, peach).scale.x = sign;
    ears.push({ sign, ear });
    eyes.push(eye(T, head, side + ' cat eye', [sign * 0.118, 0.035, 0.135],
      sign * 0.51, small, amber, pupil, glint, nose, 0.69));
    mesh(T, head, side + ' pale muzzle pad', small, cream,
      [sign * 0.055, -0.064, 0.189], [0.063, 0.044, 0.043]);
    for (const stroke of [-1, 0, 1]) {
      const line = cord(T, head, 'Splayed whisker', [
        [sign * 0.087, -0.061 + stroke * 0.009, 0.219],
        [sign * 0.149, -0.056 + stroke * 0.018, 0.214],
        [sign * 0.210, -0.050 + stroke * 0.029, 0.180],
      ], 0.0032, glint, 6);
      line.castShadow = false;
    }
    for (const front of [true, false]) {
      const name = side + (front ? ' front' : ' rear') + ' cat';
      const legColor = front ? cream : sign < 0 ? black : cinnamon;
      legs.push({ sign, front, place: leg(T, root, name, sphere, legColor,
        cream, cream, [front ? 0.055 : 0.061, 0.041, front ? 0.070 : 0.082]) });
    }
  }

  function pose({ time = 0, stride = 0, gait = 0, stretch = 0, look = 0, lookDown = 0, lookUp = 0, paw = 0, sleep = 0 } = {}) {
    const rest = s(sleep, 0, 1);
    const reach = stretch * (1 - rest);
    const swat = paw * (1 - rest);
    const gaze = look * (1 - rest);
    const gazeDown = lookDown * (1 - rest) * (1 - reach);
    const walk = gait * (1 - rest) * (1 - Math.max(reach, swat));
    const inhale = Math.sin(time * (4.0 - rest * 1.65)) * 0.005;
    const weightShift = Math.sin(stride) * walk;
    const shoulderBob = Math.sin(stride * 2) * walk * 0.012;
    body.position.set(rest * -0.044 + weightShift * 0.012,
      0.421 - reach * 0.081 - rest * 0.170 + inhale + shoulderBob, -0.072 + reach * 0.059);
    body.rotation.set(reach * 0.22 + rest * 0.082, rest * -0.09, rest * -0.23 + weightShift * 0.038);
    head.position.set(rest * 0.026, 0.216 - rest * 0.094 - swat * 0.020 - gazeDown * 0.048,
      0.305 + reach * 0.027 - rest * 0.011);
      head.rotation.set(reach * -0.09 - swat * 0.11 + rest * 0.31 + gazeDown * 0.48 - lookUp * .32 * (1 - rest),
      gaze * 0.53 + rest * 0.37, gaze * -0.06 + rest * -0.25 - weightShift * 0.024);
    tail.rotation.set(rest * -0.51 + reach * -0.12,
      rest * -0.94 + gaze * 0.21 + Math.sin(time * 2.6) * (0.10 + swat * 0.18) * (1 - rest) - weightShift * 0.15,
      rest * -0.56 + Math.sin(time * 3.4) * 0.06 * (1 - rest));
    const blink = blinking(time + 0.61, 5.2, 0.16);
    for (const closeEye of eyes) closeEye(rest, blink);
    for (const { sign, ear } of ears) {
      ear.rotation.set(rest * -0.41 - swat * 0.055, sign * 0.09 + gaze * 0.085,
        sign * (-0.089 - rest * 0.20));
    }
    for (const { sign, front, place } of legs) {
      const lift = front && sign > 0 ? swat : 0;
      const x = sign * (front ? 0.138 : 0.155);
      const z = front ? 0.237 : -0.348;
      const lower = reach * (front ? 0.115 : 0.034) + rest * 0.151;
      // 同侧后脚先迈，前脚随后。支撑期脚掌平贴地面，换脚时才抬腕。
      const cycle = T.MathUtils.euclideanModulo(stride / (2 * Math.PI) + (sign > 0 ? 0.5 : 0) - (front ? 0.22 : 0), 1);
      const support = 0.66;
      const swing = s(cycle, support, 1);
      const step = walk * (cycle < support ? 1 - 2 * cycle / support : 2 * swing - 1);
      const clearance = walk * Math.sin(Math.PI * swing);
      place([x - rest * 0.033 + weightShift * 0.012,
        (front ? 0.339 : 0.310) - lower + shoulderBob + x * weightShift * 0.038, z - 0.019 + reach * 0.045],
        [x + sign * (lift * 0.049 + rest * 0.037), 0.164 - lower * 0.48 + lift * 0.113 + clearance * 0.044,
          z + (front ? 0.02 : 0.093) + reach * 0.104 + lift * 0.062 + step * 0.072],
        [x + sign * (lift * 0.053 + rest * 0.035), 0.041 + lift * 0.255 + clearance * 0.086,
          z + 0.049 + reach * (front ? 0.223 : -0.033) + lift * 0.149 + rest * (front ? 0.088 : 0.038) + step * 0.132],
        lift * -0.28 - clearance * 0.21, sign * (0.045 + rest * 0.27));
    }
  }

  pose();
  return { root, pose };
}
