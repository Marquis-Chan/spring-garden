function rig(T, parent, name, x = 0, y = 0, z = 0) {
  const node = new T.Group();
  node.name = name;
  node.position.set(x, y, z);
  parent?.add(node);
  return node;
}

function clay(T, color, roughness = 0.64, vertexColors = false) {
  return new T.MeshStandardMaterial({ color, roughness, vertexColors });
}

function mesh(T, parent, name, geometry, material, center, scale) {
  const shape = new T.Mesh(geometry, material);
  shape.name = name;
  if (center) shape.position.set(...center);
  if (scale) shape.scale.set(...scale);
  shape.castShadow = true;
  shape.receiveShadow = true;
  parent.add(shape);
  return shape;
}

// 截面按局部 Z 排列，闭合端面让耳尖、羽尖也能随场景受光。
function sculpt(T, rings, sides, paint) {
  const positions = [];
  const indices = [];
  const colors = [];

  function vertex(x, y, z) {
    positions.push(x, y, z);
    if (paint) {
      const color = paint(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (const [z, x, y, width, height] of rings) {
    for (let i = 0; i < sides; i++) {
      const angle = i * 2 * Math.PI / sides;
      vertex(x + width * Math.sin(angle), y + height * Math.cos(angle), z);
    }
  }

  const rear = positions.length / 3;
  const front = rear + 1;
  const last = (rings.length - 1) * sides;
  const [rearZ, rearX, rearY] = rings[0];
  const [frontZ, frontX, frontY] = rings.at(-1);
  vertex(rearX, rearY, rearZ - 0.001);
  vertex(frontX, frontY, frontZ + 0.001);

  for (let row = 0; row < rings.length - 1; row++) {
    for (let i = 0; i < sides; i++) {
      const a = row * sides + i;
      const b = row * sides + (i + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    indices.push(rear, i, next, front, last + next, last + i);
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  if (paint) geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function cord(T, parent, name, points, radius, material, segments = 8) {
  const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  return mesh(T, parent, name, new T.TubeGeometry(path, segments, radius, 6, false), material);
}

export function makeRabbit(T, { back = '#ad7d60', middle = '#d5b28d', belly = '#f5e4c7',
  leg = '#cfa782', legShade = '#bd8d6c', lining = '#f1debf', innerEar = '#dca69a' } = {}) {
  const root = rig(T, null, 'Meadow rabbit');
  const body = rig(T, root, 'Rabbit torso', 0, 0.443, -0.082);
  const head = rig(T, body, 'Rabbit head', 0, 0.251, 0.243);
  const tail = rig(T, body, 'Cotton tail', 0, -0.020, -0.324);
  const sphere = new T.SphereGeometry(1, 20, 14);
  const detail = new T.SphereGeometry(1, 12, 9);
  const fur = clay(T, '#ffffff', 0.74, true);
  const tan = clay(T, leg, 0.74);
  const flank = clay(T, legShade, 0.76);
  const fleece = clay(T, lining, 0.78);
  const nose = clay(T, '#97665b', 0.61);
  const insideEar = clay(T, innerEar, 0.72);
  const faceLine = clay(T, '#af8978', 0.77);
  const eyes = clay(T, '#493129', 0.38);
  const iris = clay(T, '#8f6043', 0.50);
  const ivory = clay(T, '#fff4dc', 0.53);
  const brown = new T.Color(back);
  const toast = new T.Color(middle);
  const cream = new T.Color(belly);
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  function torsoPaint(x, y, z) {
    const chest = s(z, 0.025, 0.27) * (1 - s(Math.abs(x), 0.14, 0.31));
    return color.copy(brown).lerp(toast, 1 - s(y, 0.03, 0.27))
      .lerp(cream, (1 - s(y, -0.20, -0.04)) * 0.72 + chest * 0.24);
  }

  function headPaint(x, y, z) {
    const snout = s(z, 0.126, 0.28) * (1 - s(y, 0.007, 0.13));
    const low = 1 - s(y, -0.166, -0.037);
    return color.copy(brown).lerp(toast, 1 - s(y, 0.07, 0.21))
      .lerp(cream, Math.max(low * 0.82, snout * 0.9));
  }

  mesh(T, body, 'Rounded shoulders and haunch', sculpt(T, [
    [-0.402, 0, -0.042, 0.019, 0.027], [-0.377, 0, -0.030, 0.127, 0.133],
    [-0.318, 0, -0.018, 0.239, 0.218], [-0.226, 0, 0.004, 0.303, 0.269],
    [-0.108, 0, 0.006, 0.316, 0.283], [0.018, 0, 0.004, 0.289, 0.265],
    [0.124, 0, 0.020, 0.240, 0.226], [0.222, 0, 0.046, 0.200, 0.198],
    [0.301, 0, 0.093, 0.142, 0.144], [0.354, 0, 0.108, 0.057, 0.074],
    [0.367, 0, 0.113, 0.011, 0.016],
  ], 28, torsoPaint), fur);
  mesh(T, head, 'Soft sculpted face', sculpt(T, [
    [-0.205, 0, 0.000, 0.016, 0.020], [-0.179, 0, 0.006, 0.101, 0.107],
    [-0.127, 0, 0.018, 0.170, 0.156], [-0.052, 0, 0.010, 0.217, 0.186],
    [0.036, 0, 0.003, 0.232, 0.186], [0.111, 0, -0.009, 0.218, 0.167],
    [0.171, 0, -0.030, 0.191, 0.140], [0.218, 0, -0.051, 0.149, 0.106],
    [0.256, 0, -0.059, 0.098, 0.073], [0.280, 0, -0.053, 0.046, 0.045],
    [0.287, 0, -0.049, 0.013, 0.020],
  ], 28, headPaint), fur);
  mesh(T, tail, 'Tail base', sphere, tan, [0, 0.017, -0.040], [0.120, 0.106, 0.124]);
  mesh(T, tail, 'Cream tail tip', sphere, fleece, [0, 0.046, -0.095], [0.109, 0.088, 0.094]);

  const muzzle = rig(T, head, 'Rabbit muzzle', 0, -0.047, 0.237);
  const mouth = rig(T, muzzle, 'Rabbit bite point', 0, -.016, .055);
  mesh(T, muzzle, 'Rabbit nose', sculpt(T, [
    [-0.018, 0, 0.015, 0.027, 0.015], [0.002, 0, 0.014, 0.052, 0.030],
    [0.027, 0, 0.009, 0.046, 0.026], [0.048, 0, 0.004, 0.028, 0.017],
    [0.057, 0, 0.000, 0.007, 0.007],
  ], 16), nose);
  cord(T, muzzle, 'Short mouth crease', [[0, -0.020, 0.045], [0, -0.049, 0.050], [0, -0.058, 0.034]], 0.005, faceLine);

  const outerEar = sculpt(T, [
    [-0.010, 0, 0, 0.030, 0.026], [0.042, 0.003, -0.002, 0.063, 0.042],
    [0.139, 0.008, -0.009, 0.074, 0.045], [0.249, 0.019, -0.019, 0.078, 0.042],
    [0.367, 0.035, -0.035, 0.072, 0.038], [0.472, 0.046, -0.060, 0.058, 0.030],
    [0.548, 0.047, -0.090, 0.035, 0.019], [0.575, 0.041, -0.105, 0.011, 0.008],
  ], 20).rotateX(-Math.PI / 2);
  const earLining = sculpt(T, [
    [0.066, 0.004, -0.042, 0.012, 0.006], [0.133, 0.009, -0.047, 0.036, 0.013],
    [0.240, 0.020, -0.056, 0.049, 0.013], [0.347, 0.034, -0.069, 0.048, 0.011],
    [0.449, 0.044, -0.087, 0.034, 0.010], [0.525, 0.046, -0.103, 0.012, 0.006],
    [0.539, 0.044, -0.109, 0.006, 0.002],
  ], 16).rotateX(-Math.PI / 2);

  const armProfile = [[0.031, 0.041], [0.069, 0.081], [0.075, 0.084], [0.072, 0.074],
    [0.059, 0.061], [0.056, 0.058], [0.052, 0.052], [0.043, 0.043], [0.021, 0.024]];
  const armSides = 16;
  const legs = [];
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const ear = rig(T, head, side + ' ear', sign * 0.103, 0.143, -0.045);
    const earSkin = mesh(T, ear, side + ' ear shell', outerEar, tan);
    const earCenter = mesh(T, ear, side + ' ear lining', earLining, insideEar);
    earSkin.scale.x = earCenter.scale.x = sign;
    ear.scale.y = sign < 0 ? 0.96 : 1;

    const socket = rig(T, head, side + ' rabbit eye', sign * 0.173, 0.036, 0.118);
    socket.rotation.set(-0.26, sign * 0.74, 0);
    const eyelid = mesh(T, socket, 'Sculpted eyelid', detail, flank, [0, 0, 0],
      [0.082, 0.074, 0.045]);
    eyelid.rotation.z = sign * 0.12;
    const eye = rig(T, socket, side + ' blinking eye', 0, 0.005, 0.030);
    mesh(T, eye, 'Amber rim', sphere, iris, [0, 0, 0], [0.065, 0.059, 0.037]);
    mesh(T, eye, 'Gloss dark eye', sphere, eyes, [0, 0.004, 0.023], [0.055, 0.052, 0.026]);
    mesh(T, eye, 'Eye glint', detail, ivory, [-0.017, 0.019, 0.045], [0.012, 0.010, 0.006]);
    mesh(T, muzzle, side + ' cream cheek', sphere, fleece, [sign * 0.064, -0.035, 0.008],
      [0.078, 0.059, 0.038]);
    for (const angle of [-1, 0, 1]) {
      const whisker = cord(T, muzzle, 'Fine whisker', [
        [sign * 0.098, -0.025 + angle * 0.013, 0.025],
        [sign * 0.161, -0.020 + angle * 0.022, 0.027],
        [sign * 0.211, -0.015 + angle * 0.036, 0.006],
      ], 0.0033, ivory, 5);
      whisker.castShadow = false;
    }

    const armGeometry = sculpt(T, armProfile.map(([width, height], index) =>
      [index / (armProfile.length - 1), 0, 0, width, height]), armSides);
    armGeometry.attributes.position.setUsage(T.DynamicDrawUsage);
    armGeometry.attributes.normal.setUsage(T.DynamicDrawUsage);
    armGeometry.boundingSphere = new T.Sphere(new T.Vector3(sign * 0.18, 0.26, 0.36), 0.64);
    const arm = mesh(T, root, side + ' foreleg', armGeometry, tan);
    const thigh = mesh(T, root, side + ' haunch', sphere, flank);
    const calf = mesh(T, root, side + ' hind shin', sphere, tan);
    const forepaw = rig(T, root, side + ' fore paw');
    const hindpaw = rig(T, root, side + ' hind paw');
    mesh(T, forepaw, 'Compact forepaw', sphere, fleece, [0, 0, 0.034], [0.066, 0.042, 0.091]);
    mesh(T, hindpaw, 'Long hind paw', sphere, tan, [0, 0.004, 0.055], [0.087, 0.043, 0.151]);
    for (const toe of [-1, 1]) {
      const start = toe * 0.022;
      cord(T, forepaw, 'Forepaw seam', [
        [start, 0.017, 0.110], [start, 0.025, 0.104], [start, 0.030, 0.093],
      ], 0.0026, faceLine, 4);
    }
    const upper = new T.Vector3();
    const joint = new T.Vector3();
    const hand = new T.Vector3();
    const curve = new T.CatmullRomCurve3([upper, joint, hand], false, 'catmullrom', 0.40);
    legs.push({ sign, ear, eye, arm, thigh, calf, forepaw, hindpaw, upper, joint, hand, curve,
      hip: new T.Vector3(), knee: new T.Vector3(), heel: new T.Vector3() });
  }

  const direction = new T.Vector3();
  const up = new T.Vector3(0, 1, 0);
  const unitX = new T.Vector3(1, 0, 0);
  const across = new T.Vector3();
  const around = new T.Vector3();
  const center = new T.Vector3();
  const sample = new T.Vector3();

  // 前肘沿曲线重新蒙皮，蹬起时仍是一条连续的陶土体块。
  function bendArm(arm, curve) {
    const points = arm.geometry.attributes.position;
    for (const [row, [width, height]] of armProfile.entries()) {
      const t = row / (armProfile.length - 1);
      curve.getPoint(t, center);
      curve.getTangent(t, direction);
      around.crossVectors(direction, unitX).normalize();
      across.crossVectors(around, direction).normalize();
      for (let i = 0; i < armSides; i++) {
        const angle = i * 2 * Math.PI / armSides;
        sample.copy(center).addScaledVector(across, Math.sin(angle) * width)
          .addScaledVector(around, Math.cos(angle) * height);
        points.setXYZ(row * armSides + i, sample.x, sample.y, sample.z);
      }
    }
    const [upper, , hand] = curve.points;
    points.setXYZ(points.count - 2, upper.x, upper.y, upper.z);
    points.setXYZ(points.count - 1, hand.x, hand.y, hand.z);
    points.needsUpdate = true;
    arm.geometry.computeVertexNormals();
  }

  function bone(shape, a, b, width, depth) {
    direction.subVectors(b, a);
    shape.position.copy(a).lerp(b, 0.51);
    shape.scale.set(width, direction.length() * 0.58 + 0.022, depth);
    shape.quaternion.setFromUnitVectors(up, direction.normalize());
  }

  const targetMouth = new T.Vector3(), currentMouth = new T.Vector3();
  function pose({ time = 0, crouch = 0, air = 0, land = 0, peek = 0, listen = 0, sleep = 0,
    lean = 0, nibble = 0, watch = 0, biteX = 0, biteY = 0, biteZ = 0 } = {}) {
    peek *= 1 - sleep;
    const squash = crouch * 0.128 + land * 0.092 + sleep * 0.115;
    const lift = air * 0.049;
    const breath = Math.sin(time * (3.2 - sleep * 1.2)) * 0.008;
    const twitch = Math.sin(time * 13) * (0.004 + 0.008 * peek) * (1 - sleep);
    const attentive = Math.abs(listen) * (1 - sleep) * (1 - air);
    body.position.set(0, 0.443 - squash + lift + breath * (1 - air) * (1 - crouch), -0.082 - crouch * 0.053);
    body.scale.set(1 + crouch * 0.066 + land * 0.1, 1 - 0.10 * crouch - 0.07 * land, 1 + air * 0.28);
    body.rotation.x = -air * 0.11 + crouch * 0.17 + land * 0.13 + lean * .18;
    head.position.set(0, 0.251 + peek * 0.09 + attentive * 0.085 - sleep * 0.068 - lean * .034,
      0.243 + peek * 0.087 + lean * .12);
    head.rotation.set(-peek * 0.15 - attentive * 0.16 + land * 0.18 + sleep * .21 + lean * .20,
      listen * -0.34, listen * 0.099 - watch * .13);
    muzzle.position.z = 0.237 + twitch;
    tail.rotation.x = air * 0.39 - crouch * 0.16;

    for (const leg of legs) {
      const { sign, ear, eye, upper, joint, hand, hip, knee, heel } = leg;
      const flick = Math.sin(time * 4.4 + sign * 0.9) * (0.028 + attentive * 0.047) * (1 - sleep);
      ear.rotation.set(-0.09 - air * 0.85 - crouch * 0.25 + attentive * 0.31 + flick - sleep * .53 - watch * .20,
        sign * (0.070 + listen * 0.16), sign * (-0.146 + listen * sign * 0.131 - sleep * .18));
      const blink = time % 5.6;
      const openness = blink > 5.43 ? 1 - 0.95 * Math.sin(Math.PI * (blink - 5.43) / 0.17) : 1;
      eye.scale.y = Math.max(.048, openness * (1 - sleep));

      upper.set(sign * 0.166, 0.450 - squash + lift, 0.151 + air * 0.064);
      joint.set(sign * (0.195 + 0.031 * air), 0.222 - squash * 0.40 + air * 0.126, 0.207 + air * 0.232);
      hand.set(sign * (0.167 + 0.034 * air), 0.043 + air * 0.246, 0.316 + sign * 0.018 + air * 0.253 + lean * .045);
      hip.set(sign * 0.218, 0.362 - squash + lift, -0.227 - air * 0.044 - crouch * 0.034);
      knee.set(sign * (0.296 + 0.035 * crouch - 0.027 * air), 0.172 - squash * 0.32 + air * 0.116, -0.064 - air * 0.450);
      heel.set(sign * (0.282 + crouch * 0.037 - air * 0.047), 0.040 + air * 0.236, -0.294 - air * 0.400);

      bendArm(leg.arm, leg.curve);
      bone(leg.thigh, hip, knee, 0.150 - air * 0.032, 0.161 - air * 0.023);
      bone(leg.calf, knee, heel, 0.081, 0.077);
      leg.forepaw.position.copy(hand);
      leg.forepaw.rotation.set(air * 0.19, sign * (0.14 - air * 0.057), 0);
      leg.hindpaw.position.copy(heel);
      leg.hindpaw.rotation.set(air * -0.24, sign * (0.247 + air * 2.25), 0);
    }
    if (nibble > 0) {
      // 用同一个真实吻尖对齐萝卜，嘴部、眼睛和头部一起送过去。
      root.updateWorldMatrix(true, true);
      targetMouth.set(biteX, biteY + Math.sin(time * 21) * .004, biteZ);
      root.localToWorld(targetMouth);
      body.worldToLocal(targetMouth);
      mouth.getWorldPosition(currentMouth);
      body.worldToLocal(currentMouth);
      head.position.addScaledVector(targetMouth.sub(currentMouth), nibble);
    }
  }

  pose();
  return { root, pose, mouth };
}

export function makeBird(T) {
  const root = rig(T, null, 'Woodland songbird');
  const body = rig(T, root, 'Bird chest', 0, 0.314, -0.02);
  const head = rig(T, body, 'Bird head', 0, 0.216, 0.146);
  const tail = rig(T, body, 'Bird tail', 0, -0.020, -0.257);
  const sphere = new T.SphereGeometry(1, 20, 14);
  const detail = new T.SphereGeometry(1, 14, 10);
  const painted = clay(T, '#ffffff', 0.68, true);
  const wingTone = clay(T, '#ffffff', 0.76, true);
  const bill = clay(T, '#d29a56', 0.57);
  const crease = clay(T, '#a97048', 0.76);
  const leg = clay(T, '#a57a57', 0.72);
  const claw = clay(T, '#70523d', 0.75);
  const pupil = clay(T, '#352d26', 0.37);
  const rim = clay(T, '#a57349', 0.57);
  const glint = clay(T, '#fff0d1', 0.46);
  const eyelidSkin = clay(T, '#bb905f', 0.71);
  const eyelidFold = clay(T, '#745746', 0.72);
  const back = new T.Color('#86735b');
  const down = new T.Color('#eee0be');
  const ginger = new T.Color('#d68052');
  const gold = new T.Color('#dfa76a');
  const wingShade = new T.Color('#796653');
  const wingLight = new T.Color('#b39671');
  const featherEdge = new T.Color('#a08669');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  function breastPaint(x, y, z) {
    const belly = 1 - s(y, -0.155, 0.060);
    const bib = s(z, -0.013, 0.175) * s(y, -0.144, -0.056);
    return color.copy(back).lerp(down, belly).lerp(ginger, bib * 0.95);
  }

  function headPaint(x, y, z) {
    const crown = s(y, -0.033, 0.149);
    const cheek = s(z, -0.093, 0.105) * (1 - s(y, -0.04, 0.067));
    return color.copy(gold).lerp(back, crown * 0.92).lerp(ginger, cheek * 0.77);
  }

  function wingPaint(x, y, z) {
    const shade = s(y, -0.079, 0.052) * (1 - 0.37 * s(z, 0.28, 0.54));
    return color.copy(wingShade).lerp(wingLight, shade);
  }

  function featherPaint(x, y, z) {
    return color.copy(wingShade).lerp(featherEdge, s(y, -0.007, 0.022))
      .lerp(wingLight, s(z, 0.109, 0.214) * 0.37);
  }

  mesh(T, body, 'Rounded breast', sculpt(T, [
    [-0.329, 0, -0.008, 0.008, 0.012], [-0.302, 0, -0.004, 0.050, 0.061],
    [-0.246, 0, 0.013, 0.103, 0.115], [-0.174, 0, 0.014, 0.145, 0.151],
    [-0.089, 0, 0.010, 0.172, 0.176], [0.002, 0, 0.001, 0.184, 0.184],
    [0.090, 0, -0.004, 0.173, 0.177], [0.159, 0, 0.001, 0.146, 0.157],
    [0.221, 0, 0.016, 0.103, 0.119], [0.262, 0, 0.032, 0.044, 0.062],
    [0.272, 0, 0.038, 0.008, 0.013],
  ], 28, breastPaint), painted);
  mesh(T, head, 'Rounded bird face', sculpt(T, [
    [-0.165, 0, -0.017, 0.013, 0.015], [-0.147, 0, -0.010, 0.079, 0.087],
    [-0.095, 0, 0.004, 0.123, 0.133], [-0.023, 0, 0.008, 0.151, 0.149],
    [0.047, 0, 0.007, 0.146, 0.140], [0.111, 0, -0.007, 0.123, 0.112],
    [0.156, 0, -0.019, 0.085, 0.078], [0.182, 0, -0.028, 0.043, 0.042],
    [0.192, 0, -0.031, 0.009, 0.015],
  ], 28, headPaint), painted);
  mesh(T, head, 'Short copper bill', sculpt(T, [
    [0.166, 0, -0.032, 0.035, 0.028], [0.188, 0, -0.032, 0.053, 0.033],
    [0.228, 0, -0.038, 0.035, 0.024], [0.273, 0, -0.044, 0.018, 0.013],
    [0.299, 0, -0.048, 0.003, 0.004],
  ], 18), bill);
  rig(T, head, 'Bill tip', 0, -0.048, 0.300);

  const wingGeometry = sculpt(T, [
    [-0.027, 0, 0.002, 0.024, 0.020], [0.045, -0.004, 0.000, 0.100, 0.055],
    [0.136, 0.014, -0.005, 0.124, 0.059], [0.237, 0.045, -0.020, 0.120, 0.050],
    [0.337, 0.080, -0.038, 0.100, 0.038], [0.432, 0.119, -0.057, 0.070, 0.025],
    [0.512, 0.172, -0.074, 0.035, 0.014], [0.540, 0.194, -0.077, 0.008, 0.006],
  ], 24, wingPaint).rotateY(Math.PI / 2);
  const featherGeometry = sculpt(T, [
    [-0.018, 0, 0.001, 0.016, 0.009], [0.036, 0.001, 0.000, 0.039, 0.017],
    [0.084, -0.002, -0.003, 0.041, 0.015], [0.143, -0.008, -0.012, 0.033, 0.012],
    [0.195, -0.017, -0.019, 0.019, 0.008], [0.218, -0.022, -0.024, 0.007, 0.003],
  ], 16, featherPaint);

  const tailTips = [];
  for (const fan of [-1, 0, 1]) {
    const tip = mesh(T, tail, 'Rounded tail feather', featherGeometry, wingTone,
      [fan * 0.039, -Math.abs(fan) * 0.012, -0.030], [1.22, 1.07, 1.44 - Math.abs(fan) * 0.18]);
    tailTips.push({ fan, tip });
  }

  const feet = [];
  const wings = [];
  const eyes = [];
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const eye = rig(T, head, side + ' bird eye', sign * 0.127, 0.024, 0.081);
    eye.rotation.set(-0.26, sign * 1.00, 0);
    const opening = rig(T, eye, side + ' bird eye opening');
    mesh(T, opening, 'Eye socket', detail, rim, [0, 0, 0], [0.048, 0.046, 0.027]);
    const iris = rig(T, opening, side + ' blinking eye', 0, 0.001, 0.015);
    mesh(T, iris, 'Glossy bird eye', sphere, pupil, [0, 0, 0], [0.039, 0.039, 0.022]);
    mesh(T, iris, 'Pin of light', detail, glint, [-0.013, 0.011, 0.020], [0.009, 0.008, 0.005]);
    const closedLid = rig(T, eye, side + ' bird closed eyelid');
    mesh(T, closedLid, 'Resting eyelid', detail, eyelidSkin, [0, 0, 0.003], [0.051, 0.044, 0.024]);
    const fold = cord(T, closedLid, 'Closed eyelid fold', [
      [-0.038, 0.008, 0.021], [-0.020, -0.006, 0.026],
      [0, -0.011, 0.028], [0.020, -0.006, 0.026], [0.038, 0.008, 0.021],
    ], 0.0037, eyelidFold);
    fold.castShadow = false;
    eyes.push({ opening, iris, closedLid });

    cord(T, head, side + ' beak seam', [
      [sign * 0.047, -0.041, 0.190], [sign * 0.034, -0.049, 0.230],
      [sign * 0.015, -0.052, 0.271],
    ], 0.0035, crease);

    const wing = rig(T, body, side + ' wing', sign * 0.138, 0.050, 0.018);
    const fan = rig(T, wing, side + ' feather fan');
    fan.scale.x = sign;
    mesh(T, fan, 'Cambered wing', wingGeometry, wingTone);
    for (let n = 0; n < 5; n++) {
      const feather = mesh(T, fan, 'Overlapping flight feather', featherGeometry, wingTone,
        [0.128 + n * 0.071, 0.004 - n * 0.013, -0.052 - n * 0.023],
        [1.15 - n * 0.057, 1, 1 - n * 0.050]);
      feather.rotation.set(-0.14, 2.85 - n * 0.075, -0.30);
    }
    wings.push({ sign, wing });

    const foot = rig(T, root, side + ' bird foot', sign * 0.092, 0, 0.011);
    cord(T, foot, 'Short bent leg', [[0, 0.208, -0.039], [0.005 * sign, 0.117, -0.023],
      [0.012 * sign, 0.059, -0.019], [0, 0.032, 0.011]], 0.017, leg);
    for (const fan of [-1, 0, 1]) {
      const zTip = 0.088 - Math.abs(fan) * 0.012;
      cord(T, foot, 'Gripping front toe', [
        [0, 0.036, 0.005], [fan * 0.022, 0.021, 0.041],
        [fan * 0.036, 0.008, zTip], [fan * 0.038, -0.022, zTip + 0.012],
      ], 0.009, leg, 9);
      cord(T, foot, 'Curved claw tip', [[fan * 0.038, -0.013, zTip + 0.008],
        [fan * 0.039, -0.026, zTip + 0.011], [fan * 0.037, -0.030, zTip + 0.004]], 0.0052, claw, 5);
    }
    cord(T, foot, 'Opposed back toe', [[0, 0.038, -0.001], [sign * 0.029, 0.019, -0.053],
      [sign * 0.036, -0.009, -0.071], [sign * 0.029, -0.026, -0.068]], 0.009, leg);
    feet.push({ sign, foot });
  }

  function pose({ time = 0, flap = 0, flight = 0, peck = 0, look = 0, sleep = 0 } = {}) {
    const open = s(flight, 0.015, 0.48);
    const grounding = 1 - open;
    const dip = peck * grounding;
    // 缩头和呼吸只改变上身，枝面上的脚爪使用同一组接触坐标。
    const resting = s(sleep, 0, 1) * grounding * (1 - peck);
    const attention = grounding * (1 - dip) * (1 - resting) * (1 - Math.min(1, Math.abs(look)));
    const scan = Math.sin(time * 2.08 + .61) * attention;
    const breath = Math.sin(time * 4.7) * 0.005 * (1 - dip) * (1 - resting)
      + Math.sin(time * 2.2) * 0.003 * resting;
    body.position.y = 0.314 - dip * 0.105 + 0.040 * open - 0.023 * resting + breath;
    body.rotation.set(dip * 0.59 - open * 0.13 + resting * 0.11, 0, -open * look * 0.10);
    head.position.set(-resting * 0.029, 0.216 - resting * 0.050, 0.146 - resting * 0.085);
    head.rotation.set(dip * 0.42 + open * 0.099 + resting * 0.48,
      look * 0.36 * (1 - dip * 0.78) * (1 - resting) - resting * 0.85 + .11 * scan,
      look * 0.13 * grounding * (1 - resting) + resting * 0.16 - .048 * scan);
    tail.rotation.x = 0.15 + open * 0.16 - dip * 0.09 - resting * 0.028 + .028 * scan;

    for (const { fan, tip } of tailTips) {
      tip.rotation.y = Math.PI + fan * (0.139 + open * 0.219);
    }
    for (const { sign, wing } of wings) {
      wing.position.x = sign * (0.115 + open * 0.023 - resting * 0.005);
      wing.rotation.set(open * -0.08, sign * (1.22 - open * 1.10 + resting * 0.055),
        sign * (grounding * -0.26 + open * (flap * 1.08 + 0.11) - resting * 0.065));
    }
    for (const { sign, foot } of feet) {
      foot.position.set(sign * (0.092 - open * 0.024), open * 0.148, 0.011 - open * 0.202);
      foot.rotation.set(-open * 0.81, sign * grounding * 0.07, 0);
    }

    const blink = (time + 1.1) % 4.8;
    const blinkHeight = blink > 4.66 ? 1 - 0.94 * Math.sin(Math.PI * (blink - 4.66) / 0.14) : 1;
    for (const { opening, iris, closedLid } of eyes) {
      opening.scale.y = Math.max(0.012, 1 - resting);
      opening.visible = resting < 0.98;
      iris.scale.y = blinkHeight;
      closedLid.visible = resting > 0.40;
      closedLid.scale.y = 0.48 + 0.52 * s(resting, 0.40, 0.98);
    }
  }

  pose();
  return { root, pose };
}
