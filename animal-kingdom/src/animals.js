// The two actors are modeled in local space with +Z forward and +Y up.
// The scene controls their root positions, headings and lighting.

const forwardAxis = [0, 0, 1];

function group(THREE, parent, name, position = [0, 0, 0]) {
  const result = new THREE.Group();
  result.name = name;
  result.position.set(...position);
  parent?.add(result);
  return result;
}

function solid(THREE, parent, name, geometry, material, position, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  if (position) mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function clay(THREE, color, roughness = 0.65, vertexColors = false) {
  return new THREE.MeshStandardMaterial({ color, roughness, vertexColors });
}

// Each ring specifies the center and two radii. Closing the ends here also
// gives the thin fins rounded edges and proper highlights along their rims.
function loft(THREE, rings, sides = 24, paint) {
  const positions = [];
  const indices = [];
  const colors = [];
  const vertex = (x, y, z) => {
    positions.push(x, y, z);
    if (paint) {
      const color = paint(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  };

  for (const [z, x, y, width, height] of rings) {
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      vertex(x + width * Math.sin(angle), y + height * Math.cos(angle), z);
    }
  }

  const [rearZ, rearX, rearY] = rings[0];
  const [noseZ, noseX, noseY] = rings.at(-1);
  const rear = positions.length / 3;
  const nose = rear + 1;
  const lastRing = (rings.length - 1) * sides;
  vertex(rearX, rearY, rearZ - 0.001);
  vertex(noseX, noseY, noseZ + 0.001);

  for (let row = 0; row < rings.length - 1; row++) {
    for (let side = 0; side < sides; side++) {
      const a = row * sides + side;
      const b = row * sides + (side + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides;
    indices.push(rear, side, next, nose, lastRing + next, lastRing + side);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (paint) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function line(THREE, parent, name, points, radius, material, segments = 16) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return solid(THREE, parent, name, new THREE.TubeGeometry(curve, segments, radius, 6, false), material);
}

export function makeFrog(THREE) {
  const root = group(THREE, null, 'Tree frog');
  const body = group(THREE, root, 'Frog torso', [0, 0.43, -0.06]);
  const head = group(THREE, body, 'Frog head', [0, 0.237, 0.17]);

  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const detailSphere = new THREE.SphereGeometry(1, 12, 9);
  const skin = clay(THREE, '#a1b64e', 0.56);
  const limbSkin = clay(THREE, '#8da247', 0.62);
  const lightSkin = clay(THREE, '#b5ba60', 0.61);
  const toePad = clay(THREE, '#c6ba6b', 0.49);
  const cream = clay(THREE, '#f5da9a', 0.63);
  const skinPaint = clay(THREE, '#ffffff', 0.58, true);
  const mouth = clay(THREE, '#55633b', 0.68);
  const eyeRim = clay(THREE, '#615f3d', 0.51);
  const iris = clay(THREE, '#e0aa50', 0.46);
  const pupil = clay(THREE, '#2e2e24', 0.37);
  const eyeLight = clay(THREE, '#fff0d0', 0.4);

  const shade = new THREE.Color('#749344');
  const back = new THREE.Color('#b8c565');
  const belly = new THREE.Color('#e8d79a');
  const stripe = new THREE.Color('#677e42');
  const color = new THREE.Color();
  const smooth = THREE.MathUtils.smoothstep;

  function bodyPaint(x, y) {
    color.copy(shade).lerp(back, smooth(y, -0.05, 0.25));
    const underside = (1 - smooth(y, -0.21, -0.04)) * (1 - smooth(Math.abs(x), 0.16, 0.305));
    return color.lerp(belly, underside);
  }

  function headPaint(x, y, z) {
    color.copy(shade).lerp(back, smooth(y, 0.01, 0.16));
    const jaw = 1 - smooth(y, -0.104, -0.045);
    const eyeStripe = smooth(Math.abs(x), 0.19, 0.32) *
      smooth(y, -0.057, -0.022) * (1 - smooth(y, 0.017, 0.102)) *
      (1 - smooth(z, 0.21, 0.35));
    return color.lerp(belly, jaw).lerp(stripe, eyeStripe * 0.74);
  }

  const torsoRings = [
    [-0.42, 0, -0.095, 0.018, 0.021],
    [-0.40, 0, -0.085, 0.101, 0.10],
    [-0.35, 0, -0.067, 0.196, 0.155],
    [-0.27, 0, -0.035, 0.267, 0.194],
    [-0.16, 0, 0.003, 0.303, 0.234],
    [-0.04, 0, 0.025, 0.308, 0.245],
    [0.07, 0, 0.045, 0.291, 0.235],
    [0.17, 0, 0.068, 0.260, 0.210],
    [0.24, 0, 0.086, 0.195, 0.166],
    [0.30, 0, 0.10, 0.095, 0.085],
    [0.32, 0, 0.10, 0.012, 0.018],
  ];
  solid(THREE, body, 'Rounded back', loft(THREE, torsoRings, 32, bodyPaint), skinPaint);

  const headRings = [
    [-0.20, 0, -0.018, 0.015, 0.018],
    [-0.18, 0, -0.005, 0.140, 0.104],
    [-0.105, 0, 0.01, 0.259, 0.161],
    [-0.01, 0, 0.013, 0.327, 0.176],
    [0.075, 0, 0.006, 0.346, 0.169],
    [0.159, 0, -0.009, 0.334, 0.148],
    [0.23, 0, -0.020, 0.302, 0.125],
    [0.29, 0, -0.026, 0.266, 0.104],
    [0.338, 0, -0.030, 0.207, 0.092],
    [0.373, 0, -0.032, 0.143, 0.074],
    [0.391, 0, -0.037, 0.075, 0.052],
    [0.399, 0, -0.042, 0.017, 0.019],
  ];
  solid(THREE, head, 'Continuous muzzle', loft(THREE, headRings, 32, headPaint), skinPaint);
  const throat = solid(THREE, head, 'Frog throat', sphere, cream,
    [0, -0.152, 0.205], [0.213, 0.105, 0.152]);

  line(THREE, head, 'Smile crease', [
    [-0.31, -0.050, 0.19], [-0.275, -0.073, 0.258],
    [-0.201, -0.083, 0.334], [-0.11, -0.083, 0.375],
    [0, -0.082, 0.394],
    [0.11, -0.083, 0.375], [0.201, -0.083, 0.334],
    [0.275, -0.073, 0.258], [0.31, -0.050, 0.19],
  ], 0.008, mouth, 24);

  const segment = loft(THREE, [
    [-0.09, 0, 0, 0.17, 0.17], [0.00, 0, 0, 0.67, 0.70],
    [0.17, 0, 0.05, 0.96, 0.97], [0.38, 0, 0.07, 1.0, 1.0],
    [0.60, 0, 0.04, 0.85, 0.80], [0.80, 0, 0.01, 0.65, 0.65],
    [0.98, 0, 0, 0.49, 0.54], [1.12, 0, 0, 0.12, 0.15],
  ], 20);
  const normal = new THREE.Vector3(...forwardAxis);
  const direction = new THREE.Vector3();
  const sides = [];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const nostril = solid(THREE, head, side + ' nostril', detailSphere, mouth,
      [sign * 0.102, 0.028, 0.364], [0.018, 0.009, 0.015]);
    nostril.rotation.set(-0.54, sign * 0.40, 0);
    const eye = group(THREE, head, side + ' eye socket', [sign * 0.255, 0.116, 0.106]);
    eye.rotation.set(-0.35, sign * 0.34, sign * -0.055);
    solid(THREE, eye, side + ' eye ridge', sphere, skin, [0, 0, 0],
      [0.136, 0.146, 0.13]);
    const opening = group(THREE, eye, side + ' eye opening', [0, 0.019, 0.086]);
    solid(THREE, opening, side + ' eye rim', sphere, eyeRim, [0, 0, 0],
      [0.101, 0.091, 0.055]);
    solid(THREE, opening, side + ' iris', sphere, iris, [0, 0.002, 0.023],
      [0.089, 0.077, 0.048]);
    const gaze = group(THREE, opening, side + ' pupil tracking', [0, 0.009, 0.066]);
    solid(THREE, gaze, side + ' pupil', sphere, pupil,
      [0, 0, 0], [0.067, 0.032, 0.023]);
    solid(THREE, gaze, side + ' eye catchlight', detailSphere, eyeLight,
      [-0.022, 0.015, 0.02], [0.014, 0.012, 0.007]);

    const upperArm = solid(THREE, root, side + ' upper arm', segment, skin);
    const forearm = solid(THREE, root, side + ' forearm', segment, skin);
    const elbowJoint = solid(THREE, root, side + ' elbow', detailSphere, skin,
      [0, 0, 0], [0.049, 0.053, 0.047]);
    const thigh = solid(THREE, root, side + ' folded thigh', segment, limbSkin);
    const shin = solid(THREE, root, side + ' hind shin', segment, skin);
    const frontFoot = group(THREE, root, side + ' forefoot');
    const hindFoot = group(THREE, root, side + ' hind foot');

    for (const [foot, spread, length] of [[frontFoot, 0.031, 0.128], [hindFoot, 0.041, 0.149]]) {
      solid(THREE, foot, 'Palm', detailSphere, lightSkin, [0, 0.005, 0.024],
        [0.062, 0.028, 0.051]);
      for (const fan of [-1.5, -0.5, 0.5, 1.5]) {
        const x = spread * fan;
        const z = length - Math.abs(fan) * 0.026 + fan * sign * 0.006;
        line(THREE, foot, 'Rounded toe', [
          [x * 0.37, 0.011, 0.028],
          [x * 0.67, -0.003, z * 0.61],
          [x, -0.009, z],
        ], 0.014, lightSkin, 6);
        solid(THREE, foot, 'Toe disk', detailSphere, toePad,
          [x, -0.008, z], [0.022, 0.015, 0.024]);
      }
    }
    sides.push({
      sign, opening, gaze, upperArm, forearm, elbowJoint, thigh, shin, frontFoot, hindFoot,
      shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(),
      wrist: new THREE.Vector3(), hip: new THREE.Vector3(),
      knee: new THREE.Vector3(), ankle: new THREE.Vector3(),
    });
  }

  function aim(mesh, start, end, width, height) {
    direction.subVectors(end, start);
    mesh.position.copy(start);
    mesh.scale.set(width, height, direction.length());
    mesh.quaternion.setFromUnitVectors(normal, direction.normalize());
  }

  function pose({ crouch = 0, air = 0, land = 0, throat: puff = 0, look = 0, nod = 0, blink = 0, time = 0 } = {}) {
    const squash = 0.13 * crouch + 0.10 * land;
    const lift = air * 0.033;
    const breath = Math.sin(time * 3.1) * 0.007;
    body.position.y = 0.43 - squash + lift + breath;
    body.scale.set(1 + 0.10 * crouch + 0.06 * land, 1 - 0.11 * crouch - 0.07 * land, 1 + 0.18 * air);
    body.rotation.x = 0.16 * crouch - 0.22 * air + 0.15 * land;
    head.rotation.set(-0.07 * air + 0.06 * land + 0.24 * nod, look * 0.15, look * -0.035);
    // 声囊从下颌向外鼓出，安静时贴回喉部，远看也能读出每声呱叫。
    throat.position.set(0, -0.137 - 0.064 * puff, 0.205 + 0.055 * puff);
    throat.scale.set(0.212 + 0.084 * puff, 0.089 + 0.109 * puff, 0.149 + 0.098 * puff);

    for (const side of sides) {
      const { sign, opening, gaze, shoulder, elbow, wrist, hip, knee, ankle } = side;
      opening.scale.y = Math.max(0.037, 1 - blink);
      gaze.position.x = look * 0.019 - sign * 0.008;
      shoulder.set(sign * 0.234, 0.424 - squash + lift, 0.211);
      elbow.set(sign * (0.337 + 0.076 * air), 0.177 - squash * 0.38 + 0.137 * air, 0.295 + 0.153 * air);
      // 在石台或荷叶上先把脚掌收回承重区，蹬地后仍舒展到完整的跳跃姿势。
      wrist.set(sign * (0.236 + 0.152 * air), 0.019 + 0.241 * air,
        0.280 + sign * 0.025 + 0.428 * air);
      hip.set(sign * 0.225, 0.325 - squash + lift, -0.268);
      knee.set(sign * (0.425 + 0.047 * crouch + 0.023 * air),
        0.250 - squash * 0.62 - 0.019 * air, -0.013 - 0.435 * air);
      ankle.set(sign * (0.353 + 0.014 * crouch - 0.076 * air),
        0.026 + 0.184 * air, -0.285 - 0.466 * air);

      aim(side.upperArm, shoulder, elbow, 0.069, 0.062);
      aim(side.forearm, elbow, wrist, 0.057, 0.052);
      side.elbowJoint.position.copy(elbow);
      aim(side.thigh, hip, knee, 0.136, 0.139 - 0.037 * air);
      aim(side.shin, knee, ankle, 0.071, 0.076);
      side.frontFoot.position.copy(wrist);
      side.frontFoot.rotation.set(air * 0.22, sign * (0.16 + 0.19 * air), 0);
      side.hindFoot.position.copy(ankle);
      side.hindFoot.rotation.set(air * 0.20, sign * (0.49 + 2.05 * air), 0);
    }
  }

  pose();
  return { root, pose };
}

export function makeFish(THREE) {
  const root = group(THREE, null, 'Pond fish');
  const body = group(THREE, root, 'Fish bank');
  const tailHinge = group(THREE, body, 'Fish tail hinge', [0, 0, -0.25]);
  const tail = group(THREE, tailHinge, 'Fish tail', [0, 0, -0.143]);

  const scales = clay(THREE, '#ffffff', 0.43, true);
  const fin = clay(THREE, '#ffffff', 0.49, true);
  const gill = clay(THREE, '#a65838', 0.62);
  const iris = clay(THREE, '#dc9a4e', 0.43);
  const pupil = clay(THREE, '#46362a', 0.34);
  const light = clay(THREE, '#fce5b3', 0.42);
  const eye = new THREE.SphereGeometry(1, 14, 10);
  const smooth = THREE.MathUtils.smoothstep;
  const cream = new THREE.Color('#ffe1a2');
  const sand = new THREE.Color('#eab067');
  const gold = new THREE.Color('#ed9347');
  const persimmon = new THREE.Color('#cf6439');
  const finAmber = new THREE.Color('#cb693e');
  const finEdge = new THREE.Color('#f2ba70');
  const color = new THREE.Color();

  function fishPaint(x, y, z) {
    const back = smooth(y, -0.068, 0.101);
    const marking = Math.sin(z * 19 + x * 8 + Math.sin(y * 18)) +
      0.29 * Math.sin(z * 47 - y * 9);
    const saddle = smooth(marking, -0.28, 0.47) * smooth(y, -0.051, 0.024);
    color.copy(cream).lerp(sand, back * 0.8).lerp(gold, saddle);
    return color.lerp(persimmon, saddle * smooth(y, 0.016, 0.111) * 0.84);
  }

  function finPaint(x, y, z) {
    return color.copy(finAmber).lerp(finEdge,
      Math.max(smooth(Math.abs(y), 0.039, 0.14), 1 - smooth(z, -0.28, -0.075)));
  }

  const bodyRings = [
    [-0.315, 0, 0, 0.020, 0.028], [-0.27, 0, 0, 0.029, 0.035],
    [-0.215, 0, -0.003, 0.041, 0.050], [-0.148, 0, -0.003, 0.058, 0.069],
    [-0.064, 0, -0.005, 0.077, 0.088], [0.035, 0, -0.005, 0.095, 0.108],
    [0.132, 0, -0.002, 0.106, 0.118], [0.219, 0, 0.000, 0.105, 0.113],
    [0.299, 0, 0.001, 0.095, 0.094], [0.368, 0, 0.006, 0.081, 0.076],
    [0.418, 0, 0.008, 0.064, 0.056], [0.453, 0, 0.007, 0.042, 0.039],
    [0.476, 0, 0.005, 0.019, 0.020], [0.48, 0, 0.005, 0.008, 0.010],
  ];
  solid(THREE, body, 'Shaped fish body', loft(THREE, bodyRings, 32, fishPaint), scales);

  solid(THREE, tailHinge, 'Flexible tail base', loft(THREE, [
    [-0.165, 0, 0, 0.013, 0.028], [-0.12, 0, 0, 0.018, 0.032],
    [-0.06, 0, 0, 0.023, 0.032], [0.045, 0, 0, 0.033, 0.039],
  ], 20, fishPaint), scales);

  solid(THREE, body, 'Dorsal fin', loft(THREE, [
    [-0.242, 0, 0.045, 0.005, 0.008], [-0.175, 0, 0.078, 0.013, 0.03],
    [-0.097, 0, 0.106, 0.015, 0.048], [-0.012, 0, 0.126, 0.012, 0.054],
    [0.062, 0, 0.123, 0.009, 0.031], [0.137, 0, 0.109, 0.005, 0.007],
  ], 18, finPaint), fin);
  const pectorals = [];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const eyeSocket = group(THREE, body, side + ' fish eye', [sign * 0.073, 0.041, 0.348]);
    eyeSocket.rotation.set(-0.39, sign * 0.94, 0);
    solid(THREE, eyeSocket, 'Gold eye ring', eye, iris, [0, 0, 0],
      [0.035, 0.034, 0.024]);
    solid(THREE, eyeSocket, 'Glossy fish pupil', eye, pupil, [0, 0.002, 0.018],
      [0.026, 0.026, 0.014]);
    solid(THREE, eyeSocket, 'Fish eye catchlight', eye, light, [-0.008, 0.010, 0.029],
      [0.007, 0.007, 0.005]);
    line(THREE, body, side + ' gill crease', [
      [sign * 0.061, 0.077, 0.275],
      [sign * 0.096, 0.040, 0.248],
      [sign * 0.106, -0.005, 0.236],
      [sign * 0.096, -0.052, 0.239],
    ], 0.006, gill);

    solid(THREE, tail, side + ' caudal fin', loft(THREE, [
      [-0.288 + (sign < 0 ? 0.024 : 0), 0, sign * 0.128, 0.004, 0.006],
      [-0.264 + (sign < 0 ? 0.024 : 0), 0, sign * 0.120, 0.012, 0.024],
      [-0.224, -sign * 0.002, sign * 0.100, 0.018, 0.040],
      [-0.176, -sign * 0.003, sign * 0.078, 0.021, 0.052],
      [-0.123, 0, sign * 0.051, 0.024, 0.048],
      [-0.065, 0, sign * 0.025, 0.022, 0.035],
      [-0.005, 0, sign * 0.014, 0.015, 0.022],
      [0.027, 0, sign * 0.012, 0.006, 0.009],
    ], 20, finPaint), fin);

    const pectoral = group(THREE, body, side + ' pectoral hinge', [sign * 0.085, -0.043, 0.179]);
    solid(THREE, pectoral, 'Rounded pectoral fin', loft(THREE, [
      [-0.186, sign * 0.093, -0.036, 0.006, 0.005],
      [-0.155, sign * 0.081, -0.031, 0.029, 0.012],
      [-0.113, sign * 0.066, -0.023, 0.035, 0.015],
      [-0.070, sign * 0.044, -0.013, 0.033, 0.015],
      [-0.020, sign * 0.023, -0.006, 0.022, 0.014],
      [0.024, sign * 0.006, 0.003, 0.010, 0.009],
    ], 18, finPaint), fin);
    pectorals.push({ pectoral, sign });
  }

  line(THREE, body, 'Small fish mouth', [
    [-0.038, 0.001, 0.448], [-0.022, -0.009, 0.472],
    [0, -0.012, 0.481], [0.022, -0.009, 0.472], [0.038, 0.001, 0.448],
  ], 0.007, gill);

  // Direct-light shadow maps give the fish a hard silhouette on the pond bed.
  root.traverse((part) => { part.castShadow = false; });

  function pose({ tail: stroke = 0, dive = 0, time = 0 } = {}) {
    const sway = Math.sin(time * 4.5);
    body.rotation.x = dive * 0.42;
    body.rotation.z = -stroke * 0.12 + sway * 0.031;
    tailHinge.rotation.y = stroke * 0.62 + sway * 0.14;
    tail.rotation.y = stroke * 0.22 + Math.sin(time * 4.5 - 0.5) * 0.08;
    for (const { pectoral, sign } of pectorals) {
      const flutter = Math.sin(time * 8.5 + sign * 0.65);
      pectoral.rotation.x = 0.06 + flutter * 0.11 - dive * 0.17;
      pectoral.rotation.y = sign * (0.10 + flutter * 0.08);
    }
  }

  pose();
  return { root, pose };
}
