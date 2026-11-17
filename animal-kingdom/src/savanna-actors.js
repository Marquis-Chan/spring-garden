export function group(T, parent, name, position = [0, 0, 0]) {
  const item = new T.Group();
  item.name = name;
  item.position.set(...position);
  parent?.add(item);
  return item;
}

export function clay(T, color, roughness = 0.69, vertexColors = false) {
  return new T.MeshStandardMaterial({ color, roughness, vertexColors });
}

export function mesh(T, parent, name, geometry, material, position, scale) {
  const item = new T.Mesh(geometry, material);
  item.name = name;
  if (position) item.position.set(...position);
  if (scale) item.scale.set(...scale);
  item.receiveShadow = item.castShadow = true;
  parent.add(item);
  return item;
}

export function tube(T, parent, name, points, radius, material, rows = 12) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  return mesh(T, parent, name, new T.TubeGeometry(curve, rows, radius, 7, false), material);
}

function ringFaces(rows, sides) {
  const faces = [];
  for (let row = 0; row < rows - 1; row++) {
    for (let i = 0; i < sides; i++) {
      const a = row * sides + i;
      const b = row * sides + (i + 1) % sides;
      faces.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  const back = rows * sides;
  const last = back - sides;
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push(back, i, j, back + 1, last + j, last + i);
  }
  return faces;
}

export function closedShape(T, rings, sides, paint) {
  const points = [];
  const colors = [];
  const colorAt = (x, y, z, angle) => {
    if (!paint) return;
    const color = paint(x, y, z, angle);
    colors.push(color.r, color.g, color.b);
  };
  for (const [z, y, rx, ry, x = 0] of rings) {
    for (let i = 0; i < sides; i++) {
      const theta = i * Math.PI * 2 / sides;
      const vx = x + rx * Math.sin(theta);
      const vy = y + ry * Math.cos(theta);
      points.push(vx, vy, z);
      colorAt(vx, vy, z, theta);
    }
  }
  const [z0, y0, , , x0 = 0] = rings[0];
  const [z1, y1, , , x1 = 0] = rings.at(-1);
  points.push(x0, y0, z0 - 0.001, x1, y1, z1 + 0.001);
  colorAt(x0, y0, z0, 0);
  colorAt(x1, y1, z1, 0);
  const shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  if (paint) shape.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  shape.setIndex(ringFaces(rings.length, sides));
  shape.computeVertexNormals();
  return shape;
}

function denseRings(T, rings) {
  return rings.flatMap((ring, i) => {
    const next = rings[i + 1];
    if (!next) return [ring];
    return [ring, ring.map((value, j) => T.MathUtils.lerp(value, next[j], 1 / 3)),
      ring.map((value, j) => T.MathUtils.lerp(value, next[j], 2 / 3))];
  });
}

export function paintSphere(T, paint, width = 28, height = 18) {
  const shape = new T.SphereGeometry(1, width, height);
  const vertices = shape.attributes.position;
  const colors = [];
  for (let i = 0; i < vertices.count; i++) {
    const color = paint(vertices.getX(i), vertices.getY(i), vertices.getZ(i));
    colors.push(color.r, color.g, color.b);
  }
  shape.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  return shape;
}

// 鼻子和长颈沿各自的中心线弯曲，涂色固定在截面上。
function bendable(T, root, name, material, knots, radius, paint, rows = 27, sides = 20) {
  const points = knots.map(p => new T.Vector3(...p));
  const path = new T.CatmullRomCurve3(points, false, 'catmullrom', 0.40);
  const position = new T.BufferAttribute(new Float32Array((rows * sides + 2) * 3), 3);
  position.setUsage(T.DynamicDrawUsage);
  const shape = new T.BufferGeometry();
  shape.setAttribute('position', position);
  shape.setIndex(ringFaces(rows, sides));
  if (paint) {
    const colors = [];
    for (let i = 0; i < rows * sides + 2; i++) {
      const t = i >= rows * sides ? i - rows * sides : Math.floor(i / sides) / (rows - 1);
      const color = paint(t, (i % sides) * Math.PI * 2 / sides);
      colors.push(color.r, color.g, color.b);
    }
    shape.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  }
  const item = mesh(T, root, name, shape, material);
  item.frustumCulled = false;
  const center = new T.Vector3();
  const forward = new T.Vector3();
  const across = new T.Vector3();
  const normal = new T.Vector3();
  const p = new T.Vector3();
  const worldX = new T.Vector3(1, 0, 0);
  const worldZ = new T.Vector3(0, 0, 1);
  const ring = Array.from({ length: sides }, (_, i) => {
    const a = i * Math.PI * 2 / sides;
    return [Math.sin(a), Math.cos(a)];
  });

  function update() {
    for (let row = 0; row < rows; row++) {
      const t = row / (rows - 1);
      path.getPoint(t, center);
      path.getTangent(t, forward);
      normal.crossVectors(forward, Math.abs(forward.x) > 0.95 ? worldZ : worldX).normalize();
      across.crossVectors(normal, forward).normalize();
      const [rx, ry] = radius(t);
      for (const [i, [sine, cosine]] of ring.entries()) {
        p.copy(center).addScaledVector(across, rx * sine).addScaledVector(normal, ry * cosine);
        position.setXYZ(row * sides + i, p.x, p.y, p.z);
      }
    }
    position.setXYZ(rows * sides, ...points[0].toArray());
    position.setXYZ(rows * sides + 1, ...points.at(-1).toArray());
    position.needsUpdate = true;
    shape.computeVertexNormals();
  }

  update();
  shape.attributes.normal.setUsage(T.DynamicDrawUsage);
  return { points, update };
}

export function eye(T, parent, name, sphere, position, yaw, iris, pupil, white) {
  const socket = group(T, parent, name, position);
  socket.rotation.set(-0.20, yaw, 0);
  const aperture = group(T, socket, name + ' aperture');
  mesh(T, aperture, 'Warm iris rim', sphere, iris, [0, 0, 0], [0.060, 0.050, 0.032]);
  mesh(T, aperture, 'Dark pupil', sphere, pupil, [0, 0.001, 0.025], [0.045, 0.043, 0.024]);
  mesh(T, aperture, 'Soft pinpoint of light', sphere, white, [-0.014, 0.016, 0.043], [0.013, 0.011, 0.007]);
  const fold = tube(T, socket, name + ' folded lid', [
    [-0.050, 0.003, 0.022], [-0.022, -0.010, 0.032], [0, -0.014, 0.035],
    [0.022, -0.010, 0.032], [0.050, 0.003, 0.022],
  ], 0.005, pupil);
  fold.castShadow = false;
  return (blink, sleep = 0) => {
    aperture.visible = sleep < 0.98;
    aperture.scale.y = Math.max(0.02, blink * (1 - sleep));
    fold.visible = sleep > 0.65;
  };
}

export function blink(time, period) {
  const phase = time % period;
  return phase > period - 0.17 ? 1 - 0.94 * Math.sin(Math.PI * (phase - period + 0.17) / 0.17) : 1;
}

export function legPart(T, paint) {
  const count = paint ? 17 : 8;
  const rings = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const radius = 0.47 + 0.56 * Math.sin(Math.PI * t) ** 0.52 - 0.12 * t;
    return [-0.12 + t * 1.25, 0, radius, radius * 0.91];
  });
  return closedShape(T, rings, 18, paint);
}

export function makeLeg(T, root, name, geometry, skin, shoe, sole, scale) {
  const upper = mesh(T, root, name + ' upper leg', geometry, skin);
  const lower = mesh(T, root, name + ' lower leg', geometry, skin);
  const foot = group(T, root, name + ' ' + sole);
  const [width, height, depth] = scale;
  const pad = mesh(T, foot, 'Rounded ' + sole, new T.CylinderGeometry(0.80, 1, 1, 18),
    shoe, [0, height * 0.5, 0.016], [width, height, depth]);
  const direction = new T.Vector3();
  const forward = new T.Vector3(0, 0, 1);
  const start = new T.Vector3();
  const knee = new T.Vector3();
  const end = new T.Vector3();

  function connect(part, a, b, radius, depth) {
    direction.subVectors(b, a);
    part.position.copy(a);
    part.scale.set(radius, depth, direction.length());
    part.quaternion.setFromUnitVectors(forward, direction.normalize());
  }

  function place(a, b, c, upperWidth, lowerWidth, pitch = 0, yaw = 0) {
    start.set(...a);
    knee.set(...b);
    end.set(c[0], c[1] + height * 0.84, c[2]);
    connect(upper, start, knee, upperWidth, upperWidth * 1.12);
    connect(lower, knee, end, lowerWidth, lowerWidth);
    foot.position.set(...c);
    foot.rotation.set(pitch, yaw, 0);
  }
  return { foot, pad, place };
}

function footfall(stride, offset, support) {
  const phase = stride / (2 * Math.PI) + offset;
  const cycle = phase - Math.floor(phase);
  const swing = Math.max(0, (cycle - support) / (1 - support));
  const blend = swing * swing * (3 - 2 * swing);
  // 支撑期脚在世界坐标里尽量保持原位，摆动期弧线抬脚前送。
  return {
    travel: cycle < support ? 1 - 2 * cycle / support : 2 * blend - 1,
    lift: Math.sin(Math.PI * swing),
  };
}

export function makeElephant(T) {
  const root = group(T, null, 'Savanna elephant');
  const body = group(T, root, 'Elephant barrel', [0, 1.140, -0.22]);
  const head = group(T, root, 'Elephant head', [0, 1.475, 0.516]);
  const nozzle = group(T, root, 'Elephant trunk nozzle');
  const large = new T.SphereGeometry(1, 26, 18);
  const small = new T.SphereGeometry(1, 14, 10);
  const hide = clay(T, '#93929c', 0.73);
  const side = clay(T, '#9b99a0', 0.74);
  const nail = clay(T, '#b7afb1', 0.72);
  const inner = clay(T, '#ba9399', 0.75);
  const lip = clay(T, '#73707a', 0.70);
  const noseDark = clay(T, '#54525e', 0.73);
  const ivory = clay(T, '#f4e7cc');
  const iris = clay(T, '#81725d', 0.62);
  const pupil = clay(T, '#45404a', 0.43);
  const white = clay(T, '#fff0d7', 0.46);
  const mixed = clay(T, '#ffffff', 0.73, true);
  const top = new T.Color('#8c8797');
  const bottom = new T.Color('#b3a9a7');
  const soft = new T.Color('#9798a4');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;
  const skinShape = paintSphere(T, (x, y, z) =>
    color.copy(bottom).lerp(top, s(y, -0.65, 0.77)).lerp(soft, s(Math.abs(x), 0.28, 0.92) * 0.48));
  mesh(T, body, 'Wide rounded elephant back', skinShape, mixed, [0, 0, 0], [0.585, 0.597, 0.860]);
  mesh(T, body, 'Rounded shoulder', skinShape, mixed, [0, 0.06, 0.432], [0.531, 0.494, 0.476]);
  mesh(T, head, 'Broad elephant forehead', skinShape, mixed, [0, 0.037, 0.016], [0.453, 0.433, 0.454]);
  mesh(T, head, 'Smooth cheeks', large, side, [0, -0.177, 0.065], [0.373, 0.246, 0.322]);
  const jaw = group(T, head, 'Elephant jaw', [0, -0.215, 0.103]);
  mesh(T, jaw, 'Elephant lower lip', small, lip, [0, -0.048, 0.109], [0.198, 0.092, 0.154]);

  const ears = [];
  const eyes = [];
  const legs = [];
  const pillar = closedShape(T, [
    [0.002, -0.012, 0.116, 0.158], [0.017, -0.010, 0.177, 0.204],
    [0.066, -0.009, 0.193, 0.217], [0.142, 0.005, 0.183, 0.193],
    [0.261, 0.020, 0.158, 0.157], [0.404, 0.023, 0.159, 0.155],
    [0.562, 0.030, 0.176, 0.169], [0.702, 0.036, 0.197, 0.194],
    [0.842, 0.042, 0.190, 0.213], [0.949, 0.052, 0.132, 0.158],
    [0.985, 0.056, 0.031, 0.048],
  ], 24).rotateX(-Math.PI / 2);
  const earOuter = closedShape(T, [
    [-0.503, 0.017, 0.036, 0.016, 0.064], [-0.435, 0.014, 0.201, 0.056, 0.106],
    [-0.299, 0.004, 0.330, 0.076, 0.154], [-0.133, -0.005, 0.401, 0.079, 0.181],
    [0.059, -0.007, 0.438, 0.075, 0.175], [0.221, -0.004, 0.386, 0.071, 0.137],
    [0.356, -0.006, 0.256, 0.054, 0.099], [0.426, -0.012, 0.107, 0.038, 0.041],
    [0.455, -0.018, 0.015, 0.011, 0.019],
  ], 24).rotateX(-Math.PI / 2);
  const concha = closedShape(T, [
    [-0.394, -0.048, 0.052, 0.010, 0.086], [-0.326, -0.065, 0.148, 0.024, 0.130],
    [-0.212, -0.073, 0.231, 0.029, 0.179], [-0.063, -0.075, 0.280, 0.032, 0.205],
    [0.106, -0.065, 0.280, 0.032, 0.198], [0.231, -0.062, 0.206, 0.028, 0.143],
    [0.319, -0.052, 0.120, 0.016, 0.085], [0.356, -0.050, 0.019, 0.006, 0.027],
  ], 22).rotateX(-Math.PI / 2);
  const tusk = closedShape(T, [
    [-0.029, 0, 0.044, 0.055], [0.023, 0, 0.060, 0.058],
    [0.100, 0.018, 0.051, 0.048, 0.012], [0.171, 0.047, 0.037, 0.034, 0.022],
    [0.218, 0.079, 0.016, 0.017, 0.031], [0.241, 0.096, 0.004, 0.004, 0.040],
  ], 16);

  for (const sign of [-1, 1]) {
    const label = sign < 0 ? 'Left' : 'Right';
    const ear = group(T, head, label + ' elephant ear', [sign * 0.351, -0.014, -0.079]);
    mesh(T, ear, 'Shaped thick ear', earOuter, hide).scale.x = sign;
    mesh(T, ear, 'Rose inner ear', concha, inner).scale.x = sign;
    ears.push({ sign, ear });

    eyes.push(eye(T, head, label + ' elephant eye', small, [sign * 0.313, 0.093, 0.278],
      sign * 0.83, iris, pupil, white));
    const tooth = mesh(T, head, label + ' small ivory tusk', tusk, ivory,
      [sign * 0.234, -0.201, 0.223]);
    tooth.scale.x = sign;
    tooth.rotation.y = sign * 0.24;
    tooth.rotation.x = 0.27;
    for (const front of [true, false]) {
      const z = front ? 0.348 : -0.754;
      const x = sign * (front ? 0.315 : 0.350);
      const foot = group(T, root, label + (front ? ' front' : ' rear') + ' elephant foot', [x, 0, z]);
      foot.rotation.y = sign * 0.06;
      const post = mesh(T, foot, 'Continuous elephant pillar leg', pillar, hide);
      post.matrixAutoUpdate = false;
      legs.push({ sign, front, foot, post, z });
      for (const n of [-1, 0, 1]) {
        mesh(T, foot, 'Elephant toenail', small, nail, [n * 0.084, 0.040, 0.213 - Math.abs(n) * 0.021],
          [0.032, 0.029, 0.022]);
      }
    }
  }

  const tail = group(T, body, 'Elephant tail', [0, -0.008, -0.760]);
  tube(T, tail, 'Hanging elephant tail', [[0, 0.01, -0.015], [0.014, -0.136, -0.119],
    [0.048, -0.314, -0.159], [0.066, -0.516, -0.170]], 0.026, hide);
  mesh(T, tail, 'Flat tail brush', small, noseDark, [0.065, -0.509, -0.170], [0.043, 0.092, 0.038]);

  const rest = [[0, 1.502, 0.814], [0, 1.206, 1.055], [0, 0.770, 1.249],
    [0, 0.357, 1.352], [0, 0.360, 1.526]];
  const low = [[0, 1.502, 0.814], [0, 1.182, 1.059], [0, 0.731, 1.185],
    [0, 0.272, 1.236], [0, 0.055, 1.220]];
  const held = [[0, 1.533, 0.816], [0, 1.399, 1.104], [0, 1.527, 1.375],
    [0, 1.837, 1.588], [0, 1.880, 1.827]];
  const trunk = bendable(T, root, 'Continuous flexible trunk', mixed, rest, t => {
    const r = 0.213 - 0.146 * t ** 0.77 + Math.sin(t * 56) * 0.005 * s(t, 0.18, 0.82);
    return [r * 0.94, r];
  }, (t, angle) => color.copy(soft).lerp(top, s(t, 0.055, 0.94) * 0.29)
    .lerp(bottom, (1 - Math.cos(angle)) * 0.18), 34, 22);
  mesh(T, nozzle, 'Soft trunk rim', new T.TorusGeometry(0.048, 0.015, 8, 18), side);
  mesh(T, nozzle, 'Dark trunk opening', small, noseDark, [0, 0, 0.003], [0.038, 0.035, 0.010]);
  const normal = new T.Vector3(0, 0, 1);
  const tangent = new T.Vector3();

  function pose({ time = 0, stride = 0, gait = 0, scoop = 0, lift = 0, spray = 0, look = 0, call = 0 } = {}) {
    const rising = Math.max(lift, spray);
    const sip = scoop * (1 - rising);
    const sway = Math.sin(time * 2.8);
    const walk = gait * (1 - Math.max(scoop, rising));
    const bob = Math.sin(stride * 2) * walk * 0.023;
    const weight = Math.sin(stride) * walk;
    body.position.y = 1.140 + sway * 0.008 + bob;
    body.rotation.z = weight * 0.036;
    head.position.y = 1.475 + rising * 0.029 + call * 0.018 + bob * 0.64;
    head.rotation.z = weight * 0.023;
    jaw.rotation.x = call * 0.31;
    tail.rotation.y = Math.sin(time * 1.65) * 0.21;
    for (const { sign, ear } of ears) {
      ear.rotation.set(-0.06, sign * (0.16 + sway * 0.052 + call * 0.10 + rising * 0.09),
        sign * (-0.12 + look * 0.042));
    }
    for (const setEye of eyes) setEye(blink(time + 0.8, 5.4));
    for (const { sign, front, foot, post, z } of legs) {
      const { travel, lift: stepUp } = footfall(stride, (sign > 0 ? 0.5 : 0) - (front ? 0.24 : 0), 0.70);
      const slide = travel * walk * 0.263;
      const raised = stepUp * walk * 0.117;
      foot.position.y = raised;
      foot.position.z = z + slide;
      // 柱腿顶端贴着肩或髋，底端和趾甲平移，承重的脚底不被转进地面。
      const topY = 0.985 + bob - raised;
      const topSide = Math.sin(foot.rotation.y) * slide;
      const topBack = -Math.cos(foot.rotation.y) * slide;
      post.matrix.set(1, topSide / 0.985, 0, 0, 0, topY / 0.985, 0, 0,
        0, topBack / 0.985, 1, 0, 0, 0, 0, 1);
      post.matrixWorldNeedsUpdate = true;
    }

    for (const [i, p] of trunk.points.entries()) {
      const t = i / (trunk.points.length - 1);
      const [x, y, z] = rest[i];
      const swayX = (look * 0.21 + sway * 0.026 + weight * 0.048) * t * (1 - sip) * (1 - spray * 0.75);
      p.set(x + swayX,
        T.MathUtils.lerp(y, low[i][1], sip) * (1 - rising) + held[i][1] * rising + call * 0.025 * (1 - sip) + bob * 0.64,
        T.MathUtils.lerp(T.MathUtils.lerp(z, low[i][2], sip), held[i][2], rising));
    }
    trunk.update();
    nozzle.position.copy(trunk.points.at(-1));
    tangent.subVectors(trunk.points.at(-1), trunk.points.at(-2)).normalize();
    nozzle.quaternion.setFromUnitVectors(normal, tangent);
  }

  pose();
  return { root, pose, nozzle };
}

export function makeGiraffe(T) {
  const root = group(T, null, 'Savanna giraffe');
  const body = group(T, root, 'Giraffe torso', [0, 1.450, -0.143]);
  const head = group(T, root, 'Giraffe head');
  const mouth = group(T, head, 'Giraffe muzzle contact', [0, -0.109, 0.328]);
  const jaw = group(T, head, 'Giraffe chewing jaw', [0, -0.048, 0.039]);
  const tail = group(T, body, 'Giraffe tail', [0, -0.053, -0.628]);
  const medium = new T.SphereGeometry(1, 22, 16);
  const detail = new T.SphereGeometry(1, 14, 10);
  const painted = clay(T, '#ffffff', 0.77, true);
  const gold = clay(T, '#cf994f', 0.74);
  const sand = clay(T, '#e3b777', 0.76);
  const nose = clay(T, '#bd8e68', 0.65);
  const crease = clay(T, '#8f6850', 0.66);
  const mane = clay(T, '#79634c', 0.79);
  const hoof = clay(T, '#78624f', 0.75);
  const pupil = clay(T, '#534039', 0.40);
  const white = clay(T, '#fff1cf', 0.45);
  const earRose = clay(T, '#d5a485', 0.76);
  const hide = new T.Color('#efc277');
  const pale = new T.Color('#f5d99f');
  const ochre = new T.Color('#a77943');
  const patch = new T.Color('#a66f44');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;
  const fract = x => x - Math.floor(x);

  function pattern(u, v) {
    const row = Math.floor(v + 0.09 * Math.sin(u * 5.4));
    const a = fract(u + row * 0.49 + 0.072 * Math.sin(v * 8.3)) - 0.5;
    const b = fract(v + 0.10 * Math.sin(u * 6.2)) - 0.5;
    const side = Math.max(Math.abs(a + 0.07 * Math.sin(b * 7)), Math.abs(b - a * 0.099));
    return 1 - s(side + 0.34 * Math.abs(a * b), 0.326, 0.405);
  }

  function coat(x, y, z, theta) {
    const shade = s(y, -0.65, 0.83);
    const bands = pattern(theta / (Math.PI * 2) * 7, z * 3.4 + y * 0.28);
    return color.copy(pale).lerp(hide, shade * 0.63)
      .lerp(patch, bands * (0.64 + shade * 0.28));
  }

  const barrel = closedShape(T, denseRings(T, [
    [-0.729, -0.025, 0.014, 0.019], [-0.683, -0.030, 0.142, 0.163],
    [-0.564, -0.021, 0.284, 0.279], [-0.421, 0.001, 0.343, 0.315],
    [-0.252, 0.024, 0.351, 0.329], [-0.067, 0.053, 0.349, 0.345],
    [0.128, 0.078, 0.336, 0.368], [0.306, 0.102, 0.322, 0.369],
    [0.456, 0.113, 0.278, 0.330], [0.561, 0.134, 0.173, 0.231],
    [0.621, 0.153, 0.068, 0.089], [0.648, 0.162, 0.017, 0.021],
  ]), 48, coat);
  mesh(T, body, 'Patchwork giraffe torso', barrel, painted);
  const face = paintSphere(T, (x, y, z) => {
    const shortPatch = pattern(Math.atan2(x, y) * 0.64, z * 2.8) * s(y, -0.26, 0.36);
    return color.copy(pale).lerp(hide, s(y, -0.267, 0.835) * 0.66)
      .lerp(ochre, shortPatch * (1 - s(z, 0.08, 0.72)) * 0.72);
  });
  mesh(T, head, 'Giraffe eye ridge and brow', face, painted, [0, 0.014, -0.057], [0.225, 0.219, 0.270]);
  mesh(T, head, 'Long giraffe muzzle', medium, sand, [0, -0.072, 0.148], [0.165, 0.139, 0.218]);
  mesh(T, head, 'Soft giraffe nose', detail, nose, [0, -0.065, 0.290], [0.128, 0.086, 0.083]);
  mesh(T, jaw, 'Rounded lower muzzle', medium, sand, [0, -0.069, 0.139], [0.136, 0.066, 0.181]);
  tube(T, jaw, 'Lip line', [[-0.108, -0.063, 0.218], [-0.063, -0.073, 0.268],
    [0, -0.078, 0.290], [0.063, -0.073, 0.268], [0.108, -0.063, 0.218]], 0.0046, crease, 14);
  const eyes = [];
  const ears = [];
  const legs = [];
  const stripedLeg = legPart(T, (x, y, z) => color.copy(hide)
    .lerp(patch, pattern(Math.atan2(x, y) / (Math.PI * 2) * 5, z * 4.2) * (1 - s(z, 0.64, 1.03)) * 0.76)
    .lerp(pale, s(z, 0.60, 1.10) * 0.81));

  for (const sign of [-1, 1]) {
    const label = sign < 0 ? 'Left' : 'Right';
    eyes.push(eye(T, head, label + ' giraffe eye', detail, [sign * 0.175, 0.055, 0.086],
      sign * 0.91, gold, pupil, white));
    mesh(T, head, label + ' giraffe nostril', detail, crease,
      [sign * 0.067, -0.034, 0.351], [0.018, 0.012, 0.008]);
    const ear = group(T, head, label + ' giraffe ear', [sign * 0.145, 0.136, -0.129]);
    const outer = mesh(T, ear, 'Curved giraffe ear', detail, gold, [sign * 0.097, 0.056, 0],
      [0.140, 0.066, 0.037]);
    const lining = mesh(T, ear, 'Giraffe ear lining', detail, earRose, [sign * 0.104, 0.059, 0.028],
      [0.095, 0.041, 0.018]);
    outer.rotation.z = lining.rotation.z = sign * 0.52;
    ears.push({ sign, ear });
    tube(T, head, label + ' fur-covered horn', [
      [sign * 0.072, 0.154, -0.120], [sign * 0.083, 0.254, -0.132],
      [sign * 0.094, 0.341, -0.147]], 0.024, gold, 9);
    mesh(T, head, 'Brown horn tuft', detail, mane, [sign * 0.096, 0.345, -0.149], [0.040, 0.045, 0.042]);
    for (const front of [true, false]) {
      const x = sign * (front ? 0.206 : 0.199);
      const z = front ? 0.291 : -0.627;
      const y = front ? 1.400 : 1.320;
      const leg = makeLeg(T, root, label + (front ? ' front' : ' rear') + ' giraffe',
        stripedLeg, painted, hoof, 'hoof', [0.111, 0.101, 0.131]);
      legs.push({ sign, front, leg, x, y, z });
    }
  }

  tube(T, tail, 'Fine giraffe tail', [[0, 0, -0.014], [0, -0.153, -0.105],
    [0.041, -0.436, -0.172], [0.070, -0.704, -0.171]], 0.026, gold);
  mesh(T, tail, 'Dark giraffe tail brush', detail, mane,
    [0.071, -0.698, -0.171], [0.040, 0.122, 0.042]);

  const neck = bendable(T, root, 'Continuous giraffe neck', painted,
    [[0, 1.489, 0.315], [0, 1.916, 0.489], [0, 2.460, 0.524], [0, 2.918, 0.596]], t => {
      const r = 0.245 - t * 0.121 - 0.022 * Math.sin(t * Math.PI);
      return [r * 0.83, r];
    }, (t, azimuth) => {
      const patches = pattern(azimuth / (Math.PI * 2) * 5, t * 6.6);
      const back = s(Math.cos(azimuth), 0.77, 0.98) * s(t, 0.13, 0.30) * (1 - s(t, 0.87, 0.98));
      return color.copy(pale).lerp(hide, 0.42 + t * 0.20).lerp(patch, patches * 0.91).lerp(ochre, back * 0.67);
    }, 49, 36);
  const target = new T.Vector3();
  const offset = new T.Vector3();
  const contact = new T.Vector3();
  const headMount = new T.Vector3(0, -0.093, -0.141);

  function pose({ x: worldX = 0, y: worldY = 0, z: worldZ = 0, yaw = 0, feet,
    time = 0, stride = 0, gait = 0, browse = 0, chew = 0, reachX = 0, reachY = 2.68, reachZ = 1.02 } = {}) {
    const reach = s(browse, 0, 1);
    const breathe = Math.sin(time * 2.75) * 0.006;
    const walk = gait * (1 - Math.max(reach, chew));
    const rock = walk * Math.sin(stride);
    const rise = walk * Math.sin(stride * 2) * 0.038;
    body.position.y = 1.450 + breathe + rise;
    body.rotation.z = -rock * 0.033;
    tail.rotation.y = Math.sin(time * 2.02) * 0.24 + rock * 0.15;
    head.rotation.set(0.017 + reach * (0.28 + (2.67 - reachY) * 0.23) + rise * 0.7,
      Math.atan2(reachX, 1.11) * reach * 0.84, reach * reachX * -0.079 + rock * 0.023);
    target.set(reachX * reach + rock * 0.045, T.MathUtils.lerp(2.894 + breathe + rise * 1.21, reachY, reach),
      T.MathUtils.lerp(1.033, reachZ, reach));
    // 从目标叶簇反算头的位置，吻节点在够叶时精确落到叶面。
    offset.copy(mouth.position).applyEuler(head.rotation);
    head.position.copy(target).sub(offset);
    contact.copy(headMount).applyEuler(head.rotation).add(head.position);
    neck.points[0].set(0, 1.487 + breathe + rise, 0.311);
    neck.points[1].set(contact.x * 0.22, T.MathUtils.lerp(1.923 + rise, contact.y - 0.589, reach), 0.488 + reach * 0.154);
    neck.points[2].set(contact.x * 0.67, contact.y - 0.291, contact.z + reach * 0.044);
    neck.points[3].copy(contact);
    neck.update();

    jaw.rotation.x = chew * 0.17;
    jaw.rotation.y = Math.sin(time * 13.7) * chew * 0.051;
    for (const { sign, ear } of ears) {
      ear.rotation.z = sign * (Math.sin(time * 2.9 + sign) * 0.069 - reach * 0.045);
    }
    for (const setEye of eyes) setEye(blink(time + 0.31, 5.1));
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    for (const [index, { sign, front, leg, x, y, z }] of legs.entries()) {
      const foot = feet?.[index];
      const dx = foot ? foot.x - worldX : 0;
      const dz = foot ? foot.z - worldZ : 0;
      const soleX = foot ? dx * c - dz * sn : x + sign * 0.016;
      const soleZ = foot ? dx * sn + dz * c : z + (front ? 0.033 : -0.042);
      const liftHoof = foot ? foot.y - worldY : 0;
      // 支撑蹄转成局部坐标后，身体转向也不会拖着鞋底在地上滑动。
      leg.place([x, y + rise - x * rock * 0.033, z],
        [T.MathUtils.lerp(x + sign * 0.009, soleX, .40), 0.673 + liftHoof * 0.48,
          T.MathUtils.lerp(z, soleZ, .52) + (front ? -0.060 : 0.089)],
        [soleX, liftHoof, soleZ], front ? 0.108 : 0.121, 0.063, -liftHoof * 1.15, sign * 0.047);
    }
  }

  pose();
  return { root, pose, mouth, hooves: legs.map(({ leg }) => leg.foot) };
}

export function makeZebra(T) {
  const root = group(T, null, 'Savanna zebra');
  const body = group(T, root, 'Zebra barrel', [0, 0.785, -0.086]);
  const head = group(T, body, 'Zebra head', [0, 0.307, 0.556]);
  const jaw = group(T, head, 'Zebra jaw', [0, -0.071, 0.086]);
  const tail = group(T, body, 'Zebra tail', [0, -0.030, -0.665]);
  const sphere = new T.SphereGeometry(1, 22, 16);
  const small = new T.SphereGeometry(1, 14, 10);
  const painted = clay(T, '#ffffff', 0.75, true);
  const ivory = clay(T, '#e9dcc2', 0.75);
  const ink = clay(T, '#534b47', 0.75);
  const muzzle = clay(T, '#6a5955', 0.68);
  const nostril = clay(T, '#443839', 0.63);
  const hoof = clay(T, '#544a44', 0.76);
  const peach = clay(T, '#b28e88', 0.75);
  const iris = clay(T, '#9c7755', 0.62);
  const pupil = clay(T, '#4a3535', 0.40);
  const light = clay(T, '#fff2cf', 0.49);
  const lightHide = new T.Color('#eadfc4');
  const stripe = new T.Color('#49464b');
  const shade = new T.Color('#ae9d8f');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  function stripes(phase, underside) {
    const dark = s(Math.sin(phase), -0.065, 0.47);
    return color.copy(lightHide).lerp(shade, underside * 0.47).lerp(stripe, dark * 0.945);
  }

  const bodyShape = closedShape(T, denseRings(T, [
    [-0.708, -0.035, 0.010, 0.020], [-0.666, -0.027, 0.116, 0.126],
    [-0.570, -0.015, 0.218, 0.211], [-0.428, 0.007, 0.273, 0.246],
    [-0.284, 0.024, 0.290, 0.268], [-0.119, 0.031, 0.289, 0.273],
    [0.072, 0.039, 0.285, 0.277], [0.223, 0.044, 0.264, 0.268],
    [0.363, 0.057, 0.221, 0.239], [0.479, 0.069, 0.172, 0.184],
    [0.550, 0.087, 0.108, 0.124], [0.583, 0.091, 0.020, 0.025],
  ]), 40, (x, y, z) => stripes(z * 42 + Math.sin(y * 11 + z * 3) * 1.56
    + Math.sin(x * 11 - z * 6) * 0.98, 1 - s(y, -0.19, 0.052)));
  mesh(T, body, 'Striped zebra torso', bodyShape, painted);
  const neckShape = paintSphere(T, (x, y, z) =>
    stripes(y * 14.5 + z * 1.73 + Math.sin(x * 2.5 + z * 1.58), 1 - s(y, -0.75, 0.31)), 34, 25);
  const neck = mesh(T, body, 'Striped uphill neck', neckShape, painted, [0, 0.143, 0.360], [0.186, 0.344, 0.226]);
  neck.rotation.x = 0.39;
  const headShape = closedShape(T, [
    [-0.185, 0.002, 0.011, 0.015], [-0.164, 0.018, 0.075, 0.086],
    [-0.125, 0.023, 0.124, 0.122], [-0.073, 0.018, 0.146, 0.138],
    [-0.022, 0.009, 0.151, 0.136], [0.035, -0.018, 0.145, 0.130],
    [0.091, -0.044, 0.132, 0.114], [0.153, -0.070, 0.114, 0.104],
    [0.206, -0.091, 0.103, 0.094], [0.253, -0.107, 0.085, 0.079],
    [0.277, -0.107, 0.052, 0.054], [0.289, -0.108, 0.008, 0.013],
  ], 36, (x, y, z) => stripes(z * 46 + Math.sin(y * 17) * 0.9 + x * 4.5, 0.27));
  mesh(T, head, 'Sculpted striped head', headShape, painted);
  mesh(T, head, 'Round gray muzzle', sphere, muzzle, [0, -0.107, 0.218], [0.103, 0.080, 0.103]);
  mesh(T, jaw, 'Small lower zebra lip', small, ink, [0, -0.085, 0.101], [0.089, 0.056, 0.109]);

  const crest = [[0, 0.272, 0.014], [0, 0.359, 0.118], [0, 0.404, 0.208], [0, 0.451, 0.342], [0, 0.463, 0.451]];
  tube(T, body, 'Short black crest base', crest, 0.036, ink, 14);
  crest.forEach(([x, y, z], index) => {
    const tuft = mesh(T, body, 'Raised crest tuft', small, index % 3 === 0 ? ivory : ink,
      [x, y + 0.035, z], [0.046, 0.066, 0.060]);
    tuft.rotation.x = 0.46;
  });
  tube(T, tail, 'Hanging zebra tail', [[0, 0, 0], [0.025, -0.079, -0.104],
    [0.064, -0.255, -0.148], [0.069, -0.447, -0.142]], 0.019, ink);
  mesh(T, tail, 'Tail brush', small, ink, [0.067, -0.425, -0.143], [0.045, 0.128, 0.044]);

  const earSkin = closedShape(T, [
    [-0.022, 0, 0.025, 0.024], [0.021, 0, 0.055, 0.031],
    [0.075, -0.003, 0.039, 0.023, 0.012], [0.130, -0.013, 0.023, 0.018, 0.019],
    [0.172, -0.018, 0.006, 0.005, 0.020],
  ], 16).rotateX(-Math.PI / 2);
  const legShape = legPart(T, (x, y, z) =>
    stripes(z * 22.3 + Math.sin(Math.atan2(x, y) * 2) * 0.29, 0.19));
  const eyes = [];
  const ears = [];
  const legs = [];

  for (const sign of [-1, 1]) {
    const label = sign < 0 ? 'Left' : 'Right';
    const ear = group(T, head, label + ' zebra ear', [sign * 0.095, 0.129, -0.082]);
    mesh(T, ear, 'Sculpted zebra ear', earSkin, ink).scale.x = sign;
    const lining = mesh(T, ear, 'Pale inner ear', small, peach,
      [sign * 0.012, 0.080, 0.022], [0.024, 0.057, 0.013]);
    lining.rotation.z = sign * -0.12;
    ears.push({ sign, ear });
    eyes.push(eye(T, head, label + ' zebra eye', small, [sign * 0.118, 0.022, 0.060],
      sign * 0.94, iris, pupil, light));
    mesh(T, head, label + ' zebra nostril', small, nostril, [sign * 0.058, -0.085, 0.289],
      [0.020, 0.010, 0.012]);
    for (const front of [true, false]) {
      const leg = makeLeg(T, root, label + (front ? ' front' : ' rear') + ' zebra',
        legShape, painted, hoof, 'hoof', [0.081, 0.084, 0.111]);
      legs.push({ sign, front, leg });
    }
  }

  function pose({ time = 0, stride = 0, gait = 0, listen = 0, notice = 0, sleep = 0, call = 0 } = {}) {
    const rest = s(sleep, 0, 1);
    const moving = gait * (1 - rest);
    const voice = call * (1 - rest);
    const aware = listen * (1 - rest);
    const glance = notice * (1 - rest);
    const sway = Math.sin(stride) * moving;
    body.position.y = 0.785 + Math.sin(time * 3.15) * 0.006 + Math.abs(sway) * 0.016 - rest * 0.032;
    body.rotation.z = sway * 0.023;
    neck.rotation.x = 0.39 + rest * 0.13 + glance * 0.10;
    head.position.set(0, 0.307 - rest * 0.071 - glance * 0.091, 0.556 + rest * 0.034 + glance * 0.045);
    head.rotation.set(rest * 0.28 - voice * 0.095 + glance * 0.16 + Math.sin(stride * 2) * moving * 0.052,
      aware * 0.40 + rest * 0.125, aware * 0.12);
    jaw.rotation.x = voice * 0.39;
    tail.rotation.y = Math.sin(time * 2.28) * (0.13 + moving * 0.18) * (1 - rest);
    for (const { sign, ear } of ears) {
      ear.rotation.set(-0.025 - rest * 0.19 - glance * 0.13, sign * 0.13 + aware * 0.31,
        sign * (-0.13 + 0.07 * Math.sin(time * 2.2 + sign) * (1 - rest)));
    }
    for (const setEye of eyes) setEye(blink(time + 0.64, 4.9), rest);

    for (const { sign, front, leg } of legs) {
      const phase = (stride + ((sign < 0) === front ? 0 : Math.PI)) % (Math.PI * 2);
      const lift = Math.max(0, Math.sin(phase)) * moving;
      // 落地半周沿地面反推，和状态机每半周前进的距离相抵。
      const along = (phase < Math.PI ? -Math.cos(phase) : 3 - 2 * phase / Math.PI) * moving;
      const x = sign * (front ? 0.175 : 0.188);
      const z = front ? 0.268 : -0.414;
      leg.place([x, 0.730 - rest * 0.033, z - 0.022],
        [x, 0.361 + lift * 0.081, z + (front ? -0.018 : 0.103) + along * 0.081],
        [x + sign * 0.006, lift * 0.145, z + along * Math.PI / 32],
        front ? 0.103 : 0.128, front ? 0.060 : 0.062, -lift * 0.13, sign * 0.05);
    }
  }

  pose();
  return { root, pose };
}

export function makeLion(T) {
  const root = group(T, null, 'Savanna male lion');
  const body = group(T, root, 'Lion torso', [0, 0.655, -0.125]);
  const head = group(T, body, 'Lion head', [0, 0.257, 0.465]);
  const jaw = group(T, head, 'Lion jaw', [0, -0.101, 0.103]);
  const tail = group(T, body, 'Lion tail', [0, 0.068, -0.664]);
  const sphere = new T.SphereGeometry(1, 24, 16);
  const small = new T.SphereGeometry(1, 14, 10);
  const locks = new T.SphereGeometry(1, 18, 12);
  const polished = clay(T, '#fff', 0.70, true);
  const golden = clay(T, '#c99b62', 0.70);
  const sand = clay(T, '#e6bf85', 0.71);
  const cream = clay(T, '#edcf9d', 0.72);
  const orange = clay(T, '#b06c45', 0.75);
  const fringe = clay(T, '#995a40', 0.76);
  const maneShadow = clay(T, '#86513d', 0.76);
  const blush = clay(T, '#be8b79', 0.76);
  const nose = clay(T, '#74574f', 0.53);
  const mouth = clay(T, '#503433', 0.72);
  const tongue = clay(T, '#bd786d', 0.56);
  const ivory = clay(T, '#eadabd', 0.58);
  const iris = clay(T, '#ae8f52', 0.62);
  const pupil = clay(T, '#514237', 0.43);
  const light = clay(T, '#fff0d2', 0.50);
  const lightFur = new T.Color('#ebc68d');
  const back = new T.Color('#bd8751');
  const maneTop = new T.Color('#a76c4a');
  const maneDeep = new T.Color('#754838');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  const fur = paintSphere(T, (x, y, z) =>
    color.copy(lightFur).lerp(back, s(y, -0.45, 0.85) * 0.78));
  mesh(T, body, 'Long lion back and haunch', fur, polished, [0, 0, 0], [0.336, 0.326, 0.690]);
  mesh(T, body, 'Lion chest', fur, polished, [0, 0.064, 0.355], [0.350, 0.340, 0.409]);
  const maneCore = paintSphere(T, (x, y, z) =>
    color.copy(maneDeep).lerp(maneTop, s(y + z * 0.36, -0.66, 0.82)));
  const maneGroup = group(T, head, 'Lion mane', [0, -0.011, -0.050]);
  mesh(T, maneGroup, 'Deep rounded lion mane', maneCore, polished, [0, 0, 0], [0.391, 0.421, 0.310]);
  const lowerMane = [];

  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI * 2 / 12;
    const y = Math.cos(a);
    const x = Math.sin(a);
    const r = 0.327 + 0.017 * Math.sin(i * 3.67);
    const fold = mesh(T, maneGroup, 'Thick flowing mane lock', locks,
      y > 0.20 ? orange : y > -0.56 ? fringe : maneShadow,
      [x * r, y * r * 1.10, 0.038 + Math.sin(i * 2.7) * 0.034],
      [0.111 + 0.027 * Math.sin(i * 1.67) ** 2, 0.142 + (1 - y) * 0.023, 0.230]);
    fold.rotation.z = -a;
    if (y < -0.45) lowerMane.push({ fold, x: fold.position.x, z: fold.position.z });
  }

  mesh(T, head, 'Broad golden lion face', fur, polished, [0, 0.014, 0.125], [0.263, 0.226, 0.234]);
  mesh(T, head, 'Lion bridge of nose', sphere, sand, [0, -0.025, 0.268], [0.170, 0.114, 0.105]);
  mesh(T, head, 'Rounded dark nose', small, nose, [0, -0.045, 0.363], [0.077, 0.042, 0.038]);
  mesh(T, jaw, 'Lion chin', sphere, cream, [0, -0.046, 0.059], [0.149, 0.061, 0.170]);
  const throat = mesh(T, head, 'Warm mouth interior', sphere, mouth);
  const tongueTip = mesh(T, jaw, 'Lion tongue', small, tongue, [0, 0.020, 0.163], [0.061, 0.016, 0.051]);
  const fangShape = closedShape(T, [
    [-0.013, 0, 0.022, 0.022], [0.019, 0, 0.019, 0.019],
    [0.049, 0, 0.010, 0.010], [0.062, 0, 0.003, 0.003],
  ], 12).rotateX(Math.PI / 2);
  const fangs = [];
  const eyes = [];
  const legs = [];
  const geometry = legPart(T);
  let pawContact;

  for (const sign of [-1, 1]) {
    const label = sign < 0 ? 'Left' : 'Right';
    const ear = group(T, head, label + ' round lion ear', [sign * 0.249, 0.267, 0.024]);
    mesh(T, ear, 'Golden ear rim', small, golden, [0, 0.018, 0], [0.097, 0.090, 0.057]);
    mesh(T, ear, 'Lion inner ear', small, blush, [0, 0.017, 0.048], [0.064, 0.057, 0.022]);
    eyes.push(eye(T, head, label + ' lion eye', small, [sign * 0.149, 0.059, 0.272],
      sign * 0.53, iris, pupil, light));
    mesh(T, head, label + ' pale muzzle pad', sphere, cream, [sign * 0.087, -0.083, 0.323],
      [0.112, 0.069, 0.076]);
    for (const [x, y, z] of [[0.104, -0.070, 0.396], [0.142, -0.078, 0.385], [0.119, -0.098, 0.394]]) {
      mesh(T, head, 'Fine muzzle marking', small, nose, [sign * x, y, z], [0.008, 0.007, 0.005]);
    }
    fangs.push(mesh(T, head, 'Rounded upper canine', fangShape, ivory, [sign * 0.100, -0.101, 0.321]));
    for (const front of [true, false]) {
      const leg = makeLeg(T, root, label + (front ? ' front' : ' rear') + ' lion',
        geometry, golden, sand, 'paw', [front ? 0.126 : 0.117, 0.073, front ? 0.160 : 0.147]);
      if (front) {
        if (sign > 0) pawContact = group(T, leg.foot, 'Lion grass contact', [0, .058, .166]);
        for (const n of [-1, 0, 1]) {
          mesh(T, leg.foot, 'Small front toe', small, sand, [n * 0.048, 0.035, 0.142],
            [0.039, 0.035, 0.051]);
        }
      }
      legs.push({ sign, front, leg });
    }
  }
  tube(T, tail, 'Curved lion tail', [[0, 0, 0], [0.051, -0.020, -0.171], [0.135, 0.031, -0.320],
    [0.156, 0.126, -0.419], [0.083, 0.189, -0.504]], 0.032, golden);
  mesh(T, tail, 'Lion tail tuft', small, maneShadow, [0.077, 0.191, -0.508],
    [0.061, 0.058, 0.097]).rotation.x = 0.28;

  function pose({ time = 0, stride = 0, gait = 0, roar = 0, stretch = 0,
    attention = 0, paw = 0, pawX = 0, pawY = 0, pawZ = 0 } = {}) {
    const reaching = s(stretch, 0, 1);
    const voice = s(roar, 0, 1);
    const walk = gait * (1 - Math.max(reaching, voice, paw));
    const weight = Math.sin(stride) * walk;
    const rise = Math.sin(stride * 2) * walk * 0.024;
    body.position.set(weight * 0.017, 0.655 - reaching * 0.114 + Math.sin(time * 3.1) * 0.008 + rise,
      -0.125 + reaching * 0.069);
    body.rotation.set(reaching * 0.272 - voice * 0.052 + paw * .082, 0, weight * 0.045 - paw * .063);
    head.position.set(0, 0.257 - reaching * 0.083 + voice * 0.028, 0.465 + reaching * 0.106);
    head.rotation.set(-voice * 0.18 - reaching * 0.11 + attention * .218,
      Math.sin(time * 1.55) * 0.031 * (1 - voice) + attention * .20, -attention * .071);
    maneGroup.rotation.x = 0.04 * reaching - 0.043 * voice;
    jaw.rotation.x = voice * 0.86;
    jaw.position.z = 0.103 + 0.105 * voice;
    // 口腔随下颌打开，下方鬃毛微退，远看也能辨认嘴形。
    throat.position.set(0, -0.134 - voice * 0.089, 0.274 + voice * 0.031);
    throat.scale.set(0.115 + voice * 0.014, 0.022 + voice * 0.091, 0.041);
    for (const { fold, x, z } of lowerMane) {
      fold.position.x = x * (1 + voice * 0.119);
      fold.position.z = z - voice * 0.091;
    }
    throat.visible = tongueTip.visible = voice > 0.055;
    for (const fang of fangs) fang.visible = voice > 0.091;
    tail.rotation.set(reaching * -0.093, Math.sin(time * 2.21) * (0.175 + reaching * 0.095) - weight * 0.16,
      reaching * -0.08);
    for (const setEye of eyes) setEye(blink(time + 1.4, 5.5) * (1 - voice * 0.26));

    for (const { sign, front, leg } of legs) {
      const x = sign * (front ? 0.221 : 0.229);
      const z = front ? 0.368 : -0.480;
      const reach = front ? reaching : 0;
      const { travel, lift } = footfall(stride, (sign > 0 ? 0.5 : 0) - (front ? 0.22 : 0), 0.66);
      const advance = travel * walk * 0.158;
      const lifted = lift * walk * 0.103;
      const brush = front && sign > 0 ? paw : 0;
      const footX = T.MathUtils.lerp(x + sign * reach * 0.031, pawX, brush);
      const footY = T.MathUtils.lerp(lifted, pawY - .058, brush) + .10 * Math.sin(Math.PI * brush);
      const footZ = T.MathUtils.lerp(z + (front ? 0.048 : -0.031) + reach * 0.203 + advance, pawZ - .166, brush);
      leg.place([x + weight * 0.017, (front ? 0.638 : 0.604) - reaching * (front ? 0.205 : 0.077) + rise,
        z + reach * 0.091],
        [x + sign * reach * 0.023 + (footX - x) * brush * .45,
          (front ? 0.295 : 0.265) - reach * 0.147 + lifted * 0.48 + footY * brush * .39,
          z + (front ? 0.027 : 0.111) + reach * 0.199 + advance * 0.49 + (footZ - z) * brush * .60],
        [footX, footY, footZ], front ? 0.135 : 0.176, front ? 0.108 : 0.106,
        -lift * walk * 0.27 * (1 - brush), sign * (0.074 + reach * 0.143) * (1 - brush));
    }
  }

  pose();
  return { root, pose, pawContact };
}
