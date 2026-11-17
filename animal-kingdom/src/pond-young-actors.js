import { blink, clay, closedShape, group, mesh, tube } from './savanna-actors.js';

const circle = Math.PI * 2;

export function makeDuckling(T, { scale = 1, feather = '#eec665' } = {}) {
  const root = group(T, null, '池塘幼鸭');
  root.scale.setScalar(scale);
  const torso = group(T, root, '浮在水面的身体', [0, .119, 0]);
  const head = group(T, torso, '连着颈部的头', [0, .195, .151]);
  const bill = group(T, head, '扁圆鸭喙', [0, -.036, .109]);
  const jaw = group(T, bill, '鸭喙下瓣', [0, -.021, -.017]);
  const tail = group(T, torso, '尾羽', [0, .039, -.235]);
  const sphere = new T.SphereGeometry(1, 22, 14);
  const detail = new T.SphereGeometry(1, 14, 10);
  const velvet = clay(T, '#ffffff', .76, true);
  const down = clay(T, feather, .83);
  const butter = new T.Color(feather);
  const cream = new T.Color('#f7dc8e');
  const shadow = new T.Color('#cf993e');
  const tint = new T.Color();
  const orange = clay(T, '#d88a50', .61);
  const paleOrange = clay(T, '#eda665', .67);
  const web = clay(T, '#d29359', .72);
  const toeMark = clay(T, '#c3804c', .79);
  const dark = clay(T, '#4b352c', .50);
  const eyelid = clay(T, '#a47838', .80);
  const glint = clay(T, '#fff3d3', .52);
  const s = T.MathUtils.smoothstep;

  function downColor(x, y, z) {
    const warm = s(y, -.043, .173);
    const shade = s(y, -.166, -.011);
    return tint.copy(butter).lerp(cream, warm * .58).lerp(shadow, (1 - shade) * .42)
      .multiplyScalar(1 + .017 * Math.cos(x * 53 + Math.sin(z * 33)));
  }

  mesh(T, torso, '连续绒羽的鸭身', closedShape(T, [
    [-.301, .030, .017, .020], [-.271, .016, .101, .068],
    [-.204, -.004, .166, .111], [-.107, -.013, .204, .134],
    [.011, -.004, .207, .134], [.125, .025, .187, .128],
    [.204, .044, .130, .106], [.248, .056, .056, .056], [.263, .058, .008, .013],
  ], 32, downColor), velvet);
  mesh(T, torso, '鸭颈', sphere, down, [0, .123, .125], [.111, .131, .106]);
  mesh(T, head, '带脸颊的圆头', closedShape(T, [
    [-.141, -.003, .008, .010], [-.126, .006, .088, .092],
    [-.074, .008, .143, .143], [-.008, .009, .160, .160],
    [.064, -.003, .152, .144], [.111, -.019, .112, .105],
    [.143, -.023, .061, .069], [.157, -.026, .011, .015],
  ], 30, downColor), velvet);
  for (const [x, y, z, tip] of [[-.028,.149,-.045,.29],[.009,.155,-.062,.39],[.042,.139,-.055,.42]]) {
    mesh(T, head, '小撮绒羽', detail, down, [x,y,z], [.035,.052,.024]).rotation.x = tip;
  }
  mesh(T, bill, '上喙轮廓', closedShape(T, [
    [-.014, -.002, .035, .019], [.008, .002, .076, .029],
    [.050, .005, .088, .026], [.086, .003, .084, .022],
    [.111, .001, .064, .018], [.129, -.001, .032, .010], [.135, -.002, .007, .005],
  ], 24), paleOrange);
  mesh(T, jaw, '下喙轮廓', sphere, orange, [0, -.002, .085], [.075, .017, .066]);
  const gap = mesh(T, jaw, '叫声时可见的喙缝', detail, dark, [0, .011, .087], [.058, .011, .048]);
  mesh(T, tail, '收拢的短尾', sphere, down, [0, .014, -.026], [.088, .069, .105]).rotation.x = .24;

  const wingShape = closedShape(T, [
    [-.247,.005,.004,.008],[-.208,-.002,.018,.037],[-.145,-.005,.034,.063],
    [-.066,.001,.047,.080],[.012,.010,.050,.078],[.074,.017,.034,.053],[.097,.014,.006,.010],
  ], 22, downColor);
  const flippers = [], eyes = [], legs = [];
  for (const side of [-1, 1]) {
    const eye = group(T, head, '眼睑', [side * .123, .039, .069]);
    eye.rotation.y = side * .80;
    const open = group(T, eye, '睁眼');
    mesh(T, open, '深褐眼睛', detail, dark, [0, 0, 0], [.027,.029,.016]);
    mesh(T, open, '眼睛里的光', detail, glint, [-.008,.010,.013], [.007,.007,.005]);
    const seam = tube(T, eye, '合眼的弧线', [[-.026,.001,.010],[-.009,-.009,.014],
      [.010,-.009,.014],[.026,.002,.010]], .0045, eyelid, 9);
    eyes.push({ open, seam });
    mesh(T, bill, '一侧鼻孔', detail, toeMark, [side*.032,.024,.059], [.009,.003,.012]);

    const wing = group(T, torso, '肩部连着的翅膀', [side * .162,.041,.059]);
    mesh(T, wing, '连成一体的翼面', wingShape, velvet).scale.x = side;
    const featherLine = clay(T, '#dfb457', .82);
    for (const y of [-.025,.006]) {
      tube(T, wing, '翅上自然分开的羽路', [[side*.031,y+.014,-.167],[side*.039,y,-.111],
        [side*.043,y+.012,-.051]], .0037, featherLine, 8);
    }
    flippers.push({ side, wing });

    const upper = mesh(T, root, '蹼上短腿', detail, web);
    const foot = group(T, root, '游泳时张开的脚蹼');
    mesh(T, foot, '脚蹼连续膜', closedShape(T, [
      [-.037,.002,.011,.009],[-.014,0,.042,.009],[.028,-.001,.056,.008],
      [.071,0,.051,.008],[.092,0,.028,.006],[.104,.002,.008,.004],
    ], 18), web);
    for (const digit of [-1, 0, 1]) {
      tube(T, foot, '从踝分出的三趾', [[digit*.015,.004,-.017],[digit*.029,.007,.030],
        [digit*.042,.005,.084-Math.abs(digit)*.012]], .006, toeMark, 7);
    }
    legs.push({ side, upper, foot });
  }

  const up = new T.Vector3(0,1,0), hip = new T.Vector3(), axis = new T.Vector3();

  function pose({ time = 0, swim = 0, paddle = 0, headUp = 0, dip = 0, wing = 0,
    call = 0, sleep = 0, follow = 0, shake = 0 } = {}) {
    const rest = s(sleep,0,1);
    const rowing = swim * (1 - rest), flutter = Math.max(wing,shake) * (1 - rest);
    const downLook = dip * (1 - rest), voice = call * (1 - rest);
    const clock = paddle * circle;
    const roll = Math.sin(clock) * rowing;
    torso.position.y = .119 + Math.sin(time*3.1)*.005 + Math.sin(clock*2)*rowing*.012 - rest*.011;
    torso.rotation.set(downLook*.097-rowing*.036+.033*headUp, 0, roll*.052);
    head.position.set(.016*rest, .195 + .062*headUp*(1-rest) - downLook*.215 - rest*.026,
      .151 + .046*downLook - .104*rest);
    head.rotation.set(downLook*.72 - .26*headUp*(1-rest) - .13*voice + rest*.19,
      follow*.25*(1-rest) + rest*1.29 + Math.sin(time*18)*shake*.12*(1-rest), rest*-.19);
    jaw.rotation.x = voice*.42;
    gap.visible = voice > .09;
    tail.rotation.set(-rowing*.15+downLook*.25, roll*.144, 0);
    const eyeOpen = blink(time + .34,4.6) * (1 - rest);
    for (const { open, seam } of eyes) {
      open.scale.y = Math.max(.035,eyeOpen);
      open.visible = eyeOpen > .075;
      seam.visible = eyeOpen < .26;
    }
    for (const {side,wing: featherWing} of flippers) {
      const fan = .55+.45*Math.sin(time*16+side*.39);
      featherWing.rotation.set(.06+flutter*.13*fan,-side*flutter*.69*fan,side*(.14+flutter*.63*fan));
    }
    for (const {side,upper,foot} of legs) {
      const phase = clock + (side > 0 ? Math.PI : 0);
      const push = Math.max(0,Math.sin(phase))*rowing;
      foot.position.set(side*(.102 + .043*push - rest*.020),-.071 - push*.046 + rest*.016,
        -.101 + Math.cos(phase)*rowing*.128 - rest*.035);
      foot.rotation.set(.32+rowing*(Math.sin(phase)*.57), side*(.11+push*.28), side*push*.15);
      // 蹼在水下向后推，短腿始终连在身体下沿和脚踝上。
      hip.set(side*.098,-.079,-.089).applyEuler(torso.rotation).add(torso.position);
      axis.subVectors(foot.position,hip);
      upper.position.copy(hip).lerp(foot.position,.52);
      upper.scale.set(.027,axis.length()*.56+.019,.024);
      upper.quaternion.setFromUnitVectors(up,axis.normalize());
    }
  }

  pose();
  return { root, pose };
}

export function makeTadpole(T, { scale = 1, tint = '#514435' } = {}) {
  const root = group(T, null, '圆头的蝌蚪');
  root.scale.setScalar(scale);
  const body = group(T, root, '头和摆动尾连在一起');
  const skin = clay(T, '#fff', .70, true);
  const eye = clay(T, '#2d2624', .50);
  const light = clay(T, '#ad9472', .60);
  const start = new T.Color(tint), pale = new T.Color('#9f7956'), ink = new T.Color('#382e2a');
  const color = new T.Color(), s = T.MathUtils.smoothstep;
  const bulb = closedShape(T, [
    [-.070,-.002,.010,.012],[-.055,0,.032,.027],[-.018,.006,.054,.044],
    [.026,.004,.069,.053],[.069,.001,.059,.042],[.099,-.003,.035,.024],[.113,-.005,.007,.006],
  ], 22, (x,y,z) => color.copy(start).lerp(pale,(1-s(y,-.038,.04))*.28).lerp(ink,s(z,.05,.113)*.14));
  mesh(T, body, '蝌蚪的大圆头', bulb, skin);
  const tiny = new T.SphereGeometry(1,10,7);
  for (const side of [-1,1]) {
    mesh(T, body, '黑褐小眼睛', tiny, eye, [side*.049,.023,.071], [.013,.012,.009]);
    mesh(T, body, '眼睛浅光', tiny, light, [side*.049,.027,.077], [.0037,.0032,.0027]);
  }
  const rings = Array.from({length: 18}, (_,i) => {
    const t=i/17;
    return [-.246+.207*t, .006*Math.sin(t*Math.PI), .002+.022*t**1.65, .003+.031*Math.sin(t*2.2)**.91];
  });
  const ridge = new T.Color('#bb8b58');
  // 深色尾脊勾住轮廓，只让朝上的窄边带一点暖棕反光。
  const tail = closedShape(T,rings,14,(x,y,z) => color.copy(start).lerp(ink,.58)
    .lerp(ridge,s(y,.011,.032)*.78*(.6+.4*s(z,-.23,-.075)))
    .lerp(ink,(1-s(z,-.235,-.185))*.38));
  mesh(T, body, '从根到尖渐细的透明感尾缘', tail, skin);
  const positions = tail.attributes.position;
  positions.setUsage(T.DynamicDrawUsage);
  const neutral = positions.array.slice();

  function pose({ time = 0, tail: stroke = 0, scatter = 0 } = {}) {
    const strength = .053 + scatter*.041;
    body.rotation.z = stroke*.071;
    body.rotation.x = Math.sin(time*2.8)*.033;
    for (let i=0; i<positions.count; i++) {
      const base = i*3, z = neutral[base+2];
      const distance = T.MathUtils.clamp((-.041-z)/.205,0,1);
      const ripple = stroke*Math.cos(distance*2.75) + Math.sin(time*12-distance*4)*.27;
      positions.setX(i,neutral[base] + ripple*strength*distance**1.45);
    }
    positions.needsUpdate = true;
    tail.computeVertexNormals();
  }

  pose();
  return { root, pose };
}
