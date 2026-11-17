function group(T, parent, name, position = [0, 0, 0]) {
  const item = new T.Group();
  item.name = name;
  item.position.set(...position);
  parent?.add(item);
  return item;
}

function clay(T, color, roughness = 0.72, vertexColors = false) {
  return new T.MeshStandardMaterial({ color, roughness, vertexColors });
}

function mesh(T, parent, name, geometry, material, position, scale) {
  const item = new T.Mesh(geometry, material);
  item.name = name;
  if (position) item.position.set(...position);
  if (scale) item.scale.set(...scale);
  item.receiveShadow = item.castShadow = true;
  parent.add(item);
  return item;
}

function cord(T, parent, name, points, radius, material, sections = 9) {
  const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  return mesh(T, parent, name, new T.TubeGeometry(path, sections, radius, 6, false), material);
}

// 截面在中心线上逐圈成面，尾巴和翼尖的花纹与几何一起转动。
function strokedShape(T, rings, sides, paint) {
  const positions = [];
  const colors = [];
  const faces = [];
  const curve = new T.CatmullRomCurve3(rings.map(([x, y, z]) => new T.Vector3(x, y, z)));
  const tangent = new T.Vector3();
  const mainDirection = new T.Vector3().subVectors(curve.points.at(-1), curve.points[0]).normalize();
  const axis = Math.abs(mainDirection.x) > 0.82 ? new T.Vector3(0, 0, 1) : new T.Vector3(1, 0, 0);
  const across = new T.Vector3();
  const normal = new T.Vector3();
  const p = new T.Vector3();
  function vertex(point, t, theta) {
    positions.push(point.x, point.y, point.z);
    if (paint) {
      const color = paint(point, t, theta);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (const [row, [, , , width, height]] of rings.entries()) {
    const t = row / (rings.length - 1);
    const center = curve.points[row];
    curve.getTangent(t, tangent);
    normal.crossVectors(tangent, axis).normalize();
    across.crossVectors(normal, tangent).normalize();
    for (let i = 0; i < sides; i++) {
      const theta = i / sides * 2 * Math.PI;
      p.copy(center).addScaledVector(across, width * Math.sin(theta))
        .addScaledVector(normal, height * Math.cos(theta));
      vertex(p, t, theta);
      if (row < rings.length - 1) {
        const a = row * sides + i;
        const b = row * sides + (i + 1) % sides;
        faces.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
  }
  const back = positions.length / 3;
  const tip = back + 1;
  const last = back - sides;
  vertex(curve.points[0], 0, 0);
  vertex(curve.points.at(-1), 1, 0);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    faces.push(back, i, next, tip, last + next, last + i);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  if (paint) geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function shadedSphere(T, paint, columns = 26, rows = 17) {
  const geometry = new T.SphereGeometry(1, columns, rows);
  const position = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < position.count; i++) {
    const color = paint(position.getX(i), position.getY(i), position.getZ(i));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  return geometry;
}

function eye(T, parent, label, sphere, position, angle, white, dark, shine, size = 1) {
  const socket = group(T, parent, label, position);
  socket.rotation.set(-0.22, angle, 0);
  socket.scale.setScalar(size);
  const opening = group(T, socket, label + ' aperture');
  mesh(T, opening, 'Colored eye border', sphere, white, [0, 0, 0], [0.060, 0.061, 0.030]);
  mesh(T, opening, 'Soft dark pupil', sphere, dark, [0, 0.002, 0.020], [0.048, 0.046, 0.023]);
  mesh(T, opening, 'Small catchlight', sphere, shine, [-0.014, 0.014, 0.039], [0.011, 0.010, 0.006]);
  const lid = cord(T, socket, label + ' closed lid', [
    [-0.045, 0.005, 0.017], [-0.021, -0.008, 0.027], [0, -0.011, 0.033],
    [0.021, -0.008, 0.027], [0.045, 0.005, 0.017],
  ], 0.004, dark);
  lid.castShadow = false;
  return (blink, sleep = 0) => {
    opening.visible = sleep < 0.98;
    opening.scale.y = Math.max(0.015, blink * (1 - sleep));
    lid.visible = sleep > 0.65;
  };
}

function blink(time, period) {
  const phase = time % period;
  return phase > period - 0.16 ? 1 - 0.94 * Math.sin(Math.PI * (phase - period + 0.16) / 0.16) : 1;
}

function alignPart(part, a, b, axis, delta, width, depth, overlap) {
  delta.subVectors(b, a);
  part.position.copy(a).lerp(b, 0.49);
  part.scale.set(width, delta.length() * 0.58 + overlap, depth);
  part.quaternion.setFromUnitVectors(axis, delta.normalize());
}

export function makeSquirrel(T) {
  const root = group(T, null, 'North American red squirrel');
  const body = group(T, root, 'Squirrel torso', [0, 0.389, -0.054]);
  const head = group(T, body, 'Squirrel head', [0, 0.237, 0.184]);
  const tail = group(T, body, 'Squirrel brush tail', [0, -0.066, -0.192]);
  const cone = group(T, root, 'Squirrel front-paw cone anchor');
  const jaw = group(T, head, 'Squirrel jaw', [0, -0.048, 0.121]);
  const sphere = new T.SphereGeometry(1, 22, 15);
  const small = new T.SphereGeometry(1, 14, 10);
  const painted = clay(T, '#fff', 0.73, true);
  const tan = clay(T, '#bd734c', 0.74);
  const foxRed = clay(T, '#c78b63', 0.74);
  const ivory = clay(T, '#eddfbb', 0.74);
  const softEar = clay(T, '#d29c86', 0.74);
  const nose = clay(T, '#644b40', 0.58);
  const dark = clay(T, '#46362d', 0.41);
  const crease = clay(T, '#9b6955', 0.73);
  const light = clay(T, '#fff0cd', 0.52);
  const rust = new T.Color('#b8724a');
  const paleRust = new T.Color('#d0986c');
  const pale = new T.Color('#efdcb7');
  const brown = new T.Color('#79503e');
  const coatColor = new T.Color();
  const s = T.MathUtils.smoothstep;

  function bodyPaint(x, y, z) {
    const warm = s(z, -0.61, 0.90) * 0.66;
    const belt = (1 - s(Math.abs(z - 0.31), 0.014, 0.18)) * s(Math.abs(x), 0.40, 0.90);
    const belly = s(z + 0.13 * y - 0.10 * Math.abs(x), 0.24, 0.73);
    return coatColor.copy(rust).lerp(paleRust, warm).lerp(brown, belt * 0.54).lerp(pale, belly);
  }

  function headPaint(x, y, z) {
    const muzzle = s(z - y * 0.43, 0.35, 0.81);
    return coatColor.copy(rust).lerp(paleRust, (1 - s(y, -0.41, 0.95)) * 0.70)
      .lerp(pale, (1 - s(y, -0.55, -0.03)) * muzzle);
  }

  mesh(T, body, 'Rounded russet saddle and pale bib', shadedSphere(T, bodyPaint), painted,
    [0, 0.014, 0.005], [0.180, 0.289, 0.230]).rotation.x = 0.16;
  mesh(T, body, 'Rounded squirrel rump', sphere, tan, [0, -0.126, -0.087], [0.201, 0.147, 0.198]);
  mesh(T, head, 'Rounded squirrel skull', shadedSphere(T, headPaint), painted,
    [0, 0.015, -0.012], [0.161, 0.154, 0.166]);
  mesh(T, head, 'Short muzzle', sphere, foxRed, [0, -0.040, 0.126], [0.119, 0.079, 0.091]);
  mesh(T, head, 'Rounded brown nose', small, nose, [0, -0.019, 0.196], [0.038, 0.029, 0.032]);
  mesh(T, jaw, 'Pale lower lip', small, ivory, [0, -0.026, 0.051], [0.075, 0.041, 0.060]);
  const innerMouth = mesh(T, jaw, 'Small mouth opening', small, crease, [0, 0, 0.061],
    [0.049, 0.022, 0.043]);
  const tailGeometry = strokedShape(T, [
    [0, 0.000, 0.011, 0.035, 0.034], [0, 0.018, -0.050, 0.056, 0.051],
    [0, 0.073, -0.130, 0.086, 0.070], [0.003, 0.170, -0.216, 0.122, 0.102],
    [0.009, 0.283, -0.280, 0.150, 0.121], [0.020, 0.417, -0.302, 0.163, 0.139],
    [0.025, 0.548, -0.291, 0.151, 0.127], [0.021, 0.667, -0.257, 0.124, 0.106],
    [0.011, 0.773, -0.192, 0.090, 0.080], [-0.005, 0.855, -0.126, 0.045, 0.052],
    [-0.016, 0.900, -0.070, 0.010, 0.013],
  ], 30, (p, t, theta) => {
    const outer = s(Math.cos(theta) + Math.sin(t * 18 + theta * 3) * 0.12, 0.37, 0.99);
    return coatColor.copy(rust).lerp(paleRust, s(t, 0.16, 0.95) * 0.69)
      .lerp(brown, outer * s(t, 0.18, 0.83) * 0.57);
  });
  mesh(T, tail, 'Continuous sculpted broom tail', tailGeometry, painted);
  const limbs = [];
  const ears = [];
  const eyes = [];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const ear = group(T, head, side + ' rounded squirrel ear', [sign * 0.104, 0.119, -0.058]);
    mesh(T, ear, 'Russet ear', small, tan, [sign * 0.009, 0.035, 0],
      [0.053, 0.078, 0.034]).rotation.z = sign * -0.18;
    mesh(T, ear, 'Warm ear lining', small, softEar, [sign * 0.009, 0.040, 0.024],
      [0.034, 0.053, 0.016]).rotation.z = sign * -0.17;
    ears.push({ sign, ear });
    eyes.push(eye(T, head, side + ' pale-ring squirrel eye', small,
      [sign * 0.124, 0.039, 0.091], sign * 0.81, ivory, dark, light, 0.79));
    mesh(T, head, 'Pale whisker pillow', small, ivory, [sign * 0.053, -0.061, 0.156],
      [0.059, 0.033, 0.041]);
    for (const n of [-1, 0, 1]) {
      const whisker = cord(T, head, 'Fine squirrel whisker', [
        [sign * 0.077, -0.042 + n * 0.008, 0.171],
        [sign * 0.121, -0.037 + n * 0.014, 0.169],
        [sign * 0.155, -0.031 + n * 0.024, 0.145],
      ], 0.002, ivory, 5);
      whisker.castShadow = false;
    }

    for (const front of [true, false]) {
      const label = side + ' squirrel' + (front ? ' front' : ' hind');
      const origin = new T.Vector3();
      const bent = new T.Vector3();
      const upper = mesh(T, root, label + ' upper leg', sphere, front ? foxRed : tan);
      const lower = mesh(T, root, label + ' wrist', small, foxRed);
      const foot = group(T, root, label + ' paw');
      mesh(T, foot, 'Rounded squirrel paw', small, tan, [0, 0, front ? 0.015 : 0.025],
        [front ? 0.039 : 0.055, 0.027, front ? 0.057 : 0.083]);
      for (const n of [-1, 0, 1]) {
        mesh(T, foot, 'Squirrel fingertip', small, ivory,
          [n * 0.020, -0.004, (front ? 0.060 : 0.087) - Math.abs(n) * 0.009],
          [0.012, 0.011, 0.017]);
      }
      limbs.push({ sign, front, origin, bent, upper, lower, foot });
    }
  }

  const up = new T.Vector3(0, 1, 0);
  const delta = new T.Vector3();
  const coneAtMuzzle = new T.Vector3();

  function pose({ time = 0, crouch = 0, air = 0, land = 0, hold = 0, sleep = 0,
    look = 0, climb = 0, stride = time * 8.3, gait = 0, call = 0 } = {}) {
    const rest = s(sleep, 0, 1);
    const grip = s(hold, 0, 1) * (1 - rest * 0.68);
    const scaleUp = s(climb, 0, 1);
    const step = gait * (1 - air) * (1 - rest);
    const handsFree = Math.max(scaleUp, s(gait, 0, 0.50), s(air, 0, 0.37),
      s(crouch, 0, 0.66), s(land, 0, 0.47)) * (1 - rest);
    const pawGrip = grip * (1 - handsFree);
    const upright = grip * (1 - handsFree * 0.75);
    const squash = crouch * 0.121 + land * 0.078 + rest * 0.094;
    const listen = look * (1 - rest);
    body.position.set(0, 0.389 - squash + air * 0.033 + upright * 0.088 + Math.sin(time * 3.65) * 0.005,
      -0.054 + air * 0.048 + scaleUp * 0.120);
    body.rotation.set(0.165 + crouch * 0.25 + air * 0.496 + step * 0.37 - upright * 0.24 - scaleUp * 0.28,
      listen * 0.05, rest * -0.18);
    body.scale.set(1 + land * 0.06, 1 - crouch * 0.083, 1 + air * 0.141);
    head.position.set(0, 0.237 - grip * 0.028 - rest * 0.038, 0.184 + grip * 0.019);
    head.rotation.set(-air * 0.308 - step * 0.15 + grip * 0.18 + rest * 0.216,
      listen * 0.38 + rest * 0.14, listen * -0.093);
    jaw.rotation.x = call * (1 - rest) * 0.36;
    innerMouth.visible = call > 0.092 && rest < 0.50;
    tail.rotation.set(-0.060 - air * 0.71 + land * 0.217 - rest * 0.617 + grip * 0.072,
      Math.sin(time * 2.22) * (0.135 + call * 0.20) * (1 - rest), rest * 0.37 + listen * 0.08);
    for (const setEye of eyes) setEye(blink(time + 0.23, 5.3), rest);
    for (const { sign, ear } of ears) {
      ear.rotation.set(-air * 0.30 - rest * 0.19, sign * 0.17 + listen * 0.23,
      sign * (-0.15 + Math.sin(time * 3 + sign) * 0.052 * (1 - rest)));
    }

    const gripY = 0.027 + pawGrip * 0.323;
    const gripZ = 0.260 + pawGrip * 0.103;
    // 小跑、落脚和攀爬时让同一颗松果沿前爪交接到嘴边。
    head.updateMatrix();
    body.updateMatrix();
    coneAtMuzzle.set(0, -0.100, 0.240).applyMatrix4(head.matrix).applyMatrix4(body.matrix);
    cone.position.set(0, 0.066 + grip * 0.323, 0.297 + grip * 0.103).lerp(coneAtMuzzle, handsFree);
    cone.rotation.set(-0.20 - handsFree * 0.42, listen * 0.09, -0.05);
    for (const { sign, front, origin, bent, foot, upper, lower } of limbs) {
      const phase = stride + ((sign < 0) === front ? 0 : Math.PI);
      const rise = Math.max(0, Math.sin(phase)) * step;
      const progress = -Math.cos(phase) * step;
      if (front) {
        const x = sign * (0.125 - pawGrip * 0.069 + air * 0.048 + scaleUp * 0.055);
        origin.set(sign * 0.110, 0.390 - squash + upright * 0.083, 0.102 + air * 0.101 + scaleUp * 0.102);
        foot.position.set(x, gripY + rise * 0.051 + air * 0.207 + scaleUp * (sign < 0 ? 0.094 : 0.157),
          gripZ + progress * 0.083 + air * 0.163 + scaleUp * 0.083);
        bent.copy(origin).lerp(foot.position, 0.53);
        bent.x += sign * (0.037 + 0.020 * pawGrip);
        bent.y -= pawGrip * 0.048;
        foot.rotation.set(-air * 0.27 - scaleUp * 0.30, sign * (0.15 - pawGrip * 0.77), 0);
        alignPart(upper, origin, bent, up, delta, 0.046, 0.054, 0.019);
        alignPart(lower, bent, foot.position, up, delta, 0.036, 0.036, 0.019);
      } else {
        const x = sign * (0.135 + crouch * 0.015 - air * 0.021);
        origin.set(sign * 0.115, 0.238 - squash + air * 0.036, -0.117 + scaleUp * 0.027);
        bent.set(x + sign * 0.029, 0.144 - squash * 0.50 + air * 0.027 + rise * 0.040,
          -0.068 - air * 0.168 + progress * 0.056);
        foot.position.set(x, 0.027 + air * 0.156 + rise * 0.058,
          -0.177 - air * 0.289 + progress * 0.111);
        foot.rotation.set(-air * 0.36, sign * (0.26 + air * 1.81), 0);
        alignPart(upper, origin, bent, up, delta, 0.092 - air * 0.020, 0.108 - air * 0.035, 0.055);
        alignPart(lower, bent, foot.position, up, delta, 0.047, 0.047, 0.033);
      }
    }
  }

  pose();
  return { root, pose, cone };
}

export function makeWoodpecker(T) {
  const root = group(T, null, 'Great spotted woodpecker');
  const body = group(T, root, 'Woodpecker upright body');
  const head = group(T, root, 'Woodpecker pecking head');
  const beak = group(T, head, 'Woodpecker chisel beak target', [0, -0.025, 0.229]);
  const tailTip = group(T, root, 'Woodpecker tail brace');
  const neck = group(T, root, 'Woodpecker connecting neck');
  const sphere = new T.SphereGeometry(1, 20, 14);
  const small = new T.SphereGeometry(1, 14, 10);
  const pattern = clay(T, '#fff', 0.73, true);
  const ink = clay(T, '#434044', 0.75);
  const white = clay(T, '#eee4ce', 0.74);
  const pale = clay(T, '#ddd2bc', 0.77);
  const lacquer = clay(T, '#a74e4e', 0.72);
  const bill = clay(T, '#68615a', 0.57);
  const claw = clay(T, '#796c5c', 0.76);
  const dark = clay(T, '#393238', 0.45);
  const iris = clay(T, '#8f7160', 0.58);
  const highlight = clay(T, '#fff1ce', 0.53);
  const blackColor = new T.Color('#494448');
  const whiteColor = new T.Color('#eae2ce');
  const ashColor = new T.Color('#777072');
  const crimson = new T.Color('#b65d58');
  const color = new T.Color();
  const smooth = T.MathUtils.smoothstep;

  function torsoPaint(x, y, z) {
    const tummy = smooth(z + Math.abs(x) * 0.29, -0.07, 0.37);
    const rump = (1 - smooth(y, -0.87, -0.57)) * smooth(z, -0.36, 0.46);
    return color.copy(blackColor).lerp(whiteColor, tummy).lerp(crimson, rump * 0.99);
  }

  function headPaint(x, y, z) {
    const cheek = smooth(Math.abs(x), 0.33, 0.65) * (1 - smooth(y, 0.25, 0.55)) *
      smooth(z, -0.75, -0.25);
    const jawStripe = 1 - smooth(Math.abs(y + 0.41 - z * 0.24), 0.068, 0.20);
    const redNape = (1 - smooth(z, -0.82, -0.48)) * smooth(y, 0.07, 0.35) * (1 - smooth(y, 0.62, 0.86));
    const brow = smooth(z, 0.51, 0.86) * smooth(y, -0.36, -0.09) * (1 - smooth(y, 0.34, 0.54));
    return color.copy(blackColor).lerp(whiteColor, Math.max(cheek * (1 - jawStripe * 0.89), brow))
      .lerp(crimson, redNape * 0.98);
  }

  mesh(T, body, 'Black-backed white-bellied body', shadedSphere(T, torsoPaint), pattern,
    [0, 0.004, 0.013], [0.116, 0.192, 0.128]);
  mesh(T, head, 'Patterned ivory cheek and black cap', shadedSphere(T, headPaint), pattern,
    [0, 0.005, -0.013], [0.095, 0.098, 0.108]);
  mesh(T, head, 'Chisel-shaped gray bill', strokedShape(T, [
    [0, -0.020, 0.050, 0.023, 0.022], [0, -0.021, 0.080, 0.028, 0.021],
    [0, -0.022, 0.121, 0.023, 0.016], [0, -0.023, 0.162, 0.017, 0.011],
    [0, -0.024, 0.202, 0.008, 0.006], [0, -0.025, 0.229, 0.0017, 0.0016],
  ], 16), bill);
  mesh(T, neck, 'Upper throat', sphere, pale);

  // 红色尾下羽和后颈色斑都做在身体表面上。
  mesh(T, body, 'Red lower belly coverts', small, lacquer,
    [0, -0.137, 0.075], [0.075, 0.051, 0.065]);
  const tail = mesh(T, root, 'Stiff tail feathers against bark', strokedShape(T, [
    [0, 0, 0, 0.048, 0.011], [0, 0.003, 0.18, 0.058, 0.016],
    [0, 0.012, 0.42, 0.051, 0.014], [0, 0.013, 0.65, 0.038, 0.011],
    [0, 0.009, 0.84, 0.022, 0.008], [0, 0, 1, 0.006, 0.004],
  ], 16, (p, t, angle) => {
    const rim = smooth(Math.abs(Math.sin(angle)), 0.64, 0.89) * smooth(t, 0.19, 0.70) * 0.32;
    return color.copy(blackColor).lerp(whiteColor, rim);
  }), pattern);
  const wingGeometry = strokedShape(T, [
    [0.000, 0.005, 0.012, 0.018, 0.016], [0.053, 0.004, -0.010, 0.070, 0.037],
    [0.119, -0.004, -0.038, 0.093, 0.041], [0.191, -0.018, -0.060, 0.086, 0.034],
    [0.256, -0.035, -0.101, 0.070, 0.025], [0.321, -0.046, -0.147, 0.050, 0.019],
    [0.369, -0.059, -0.167, 0.034, 0.013], [0.399, -0.062, -0.175, 0.007, 0.006],
  ], 24, (p, t, angle) => {
    const whiteShoulder = (1 - smooth(Math.hypot((t - 0.283) / 0.27, (p.z + 0.060) / 0.095), 0.50, 0.88))
      * smooth(Math.cos(angle), -0.71, 0.35);
    const whiteBar = smooth(Math.sin(t * 29.3), 0.54, 0.94) * smooth(t, 0.56, 0.80) * 0.76;
    return color.copy(blackColor).lerp(ashColor, smooth(Math.cos(angle), -0.20, 0.85) * 0.23)
      .lerp(whiteColor, Math.max(whiteShoulder, whiteBar));
  });
  const pinion = strokedShape(T, [
    [0, 0, 0, 0.014, 0.009], [0, 0, 0.036, 0.030, 0.014],
    [0.002, -0.003, 0.084, 0.034, 0.016], [0.007, -0.008, 0.135, 0.026, 0.012],
    [0.012, -0.013, 0.180, 0.012, 0.008], [0.014, -0.014, 0.204, 0.003, 0.004],
  ], 16, (p, t) => color.copy(blackColor)
    .lerp(whiteColor, (1 - smooth(Math.abs(t - 0.50), 0.053, 0.147)) * 0.78));
  const eyeClosers = [];
  const grips = [];
  const wings = [];
  const feet = [];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    eyeClosers.push(eye(T, head, side + ' woodpecker eye', small,
      [sign * 0.075, 0.014, 0.046], sign * 1.04, iris, dark, highlight, 0.57));
    const wing = group(T, body, side + ' woodpecker wing', [sign * 0.084, 0.083, -0.035]);
    const mirrored = group(T, wing, 'Painted feather fan');
    mirrored.scale.x = sign;
    mesh(T, mirrored, 'Black wing with broad pale shoulder', wingGeometry, pattern);
    mesh(T, mirrored, 'Raised white shoulder patch', small, white,
      [0.096, 0.040, -0.048], [0.090, 0.017, 0.060]).rotation.y = 0.24;
    for (let feather = 0; feather < 5; feather++) {
      const quill = mesh(T, mirrored, 'Spotted outer primary', pinion, pattern,
        [0.125 + feather * 0.045, -0.013 - feather * 0.009, -0.081 - feather * 0.022],
        [1 - feather * 0.065, 1 - feather * 0.093, 1 - feather * 0.044]);
      quill.rotation.set(-0.121, 2.82 - feather * 0.104, -0.034);
    }
    wings.push({ sign, wing });

    const foot = group(T, root, side + ' woodpecker bark anchor');
    feet.push(foot);
    const shin = mesh(T, root, side + ' short woodpecker shin', small, claw);
    const pad = mesh(T, foot, 'Small rear talon joint', small, claw,
      [0, 0.001, -0.032], [0.022, 0.022, 0.035]);
    pad.rotation.x = -0.16;
    for (const direction of [-1, 1]) {
      cord(T, foot, 'Hooked pair of climbing toes', [
        [0, 0, -0.061], [direction * 0.018, 0.016 * direction, -0.039],
        [direction * 0.026, 0.030 * direction, -0.012],
        [direction * 0.022, 0.029 * direction, -0.002],
      ], 0.0064, claw, 8);
    }
    grips.push({ sign, foot, shin, hip: new T.Vector3() });
  }

  const up = new T.Vector3(0, 1, 0);
  const forward = new T.Vector3(0, 0, 1);
  const bodyStart = new T.Vector3();
  const neckEnd = new T.Vector3();
  const tailBase = new T.Vector3();
  const vector = new T.Vector3();
  const target = new T.Vector3();
  const offset = new T.Vector3();

  function pose({ time = 0, flight = 0, flap = 0, peck = 0, sleep = 0,
    climb = 0, stride = 0, climbDirection = 1,
    targetX = 0, targetY = 0.33, targetZ = 0.02, surfaceZ = targetZ - 0.038,
    tailZ = surfaceZ - 0.019 } = {}) {
    const open = smooth(flight, 0.014, 0.62);
    const rest = smooth(sleep, 0, 1) * (1 - open);
    const hit = smooth(peck, 0, 1) * (1 - open) * (1 - rest);
    const climbing = climb * (1 - open) * (1 - rest) * (1 - hit);
    const shift = Math.sin(stride) * climbing;
    const settling = (1 - open) * (1 - hit) ** 4 * (1 - rest) * (1 - climbing);
    const scan = Math.sin(time * 1.93 + .35) * settling;
    const air = Math.sin(time * 7.5) * 0.008 * open;
    body.position.set(shift * 0.015,
      0.147 + open * 0.035 + air - rest * 0.017 + .004 * Math.sin(time * 5.4) * settling,
      -0.218 + open * 0.183 + hit * 0.011 + climbing * 0.015);
    body.rotation.set(0.15 + open * 1.01 + hit * 0.068, 0, flap * open * 0.055 - shift * 0.07);
    head.rotation.set(-0.052 + hit * 0.121 + rest * 0.254 - open * 0.155 - climbDirection * climbing * 0.19,
      0.48 * (1 - hit) * (1 - open) + rest * -0.82 + .09 * scan, hit * -0.031 + rest * 0.192 + .055 * scan);

    // 以实际喙尖为解算基准，啄击峰值同时满足三点支撑与触木坐标。
    const turning = 1 - hit;
    target.set(targetX + rest * -0.025 + open * 0.016 + shift * 0.012,
      T.MathUtils.lerp(targetY + 0.054 * turning - rest * 0.082, 0.259 + air, open) + climbDirection * climbing * 0.028,
      T.MathUtils.lerp(targetZ - 0.139 * turning - rest * 0.039, 0.301, open));
    offset.copy(beak.position).applyEuler(head.rotation);
    head.position.copy(target).sub(offset);
    neckEnd.set(0, -0.052, -0.033).applyEuler(head.rotation).add(head.position);
    bodyStart.set(0, 0.103, -0.015).applyEuler(body.rotation).add(body.position);
    alignPart(neck, bodyStart, neckEnd, up, vector, 0.066, 0.067, 0.040);

    tailBase.set(0, -0.112, -0.046).applyEuler(body.rotation).add(body.position);
    tailTip.position.set(-shift * 0.014, T.MathUtils.lerp(-0.30, -0.041, open),
      T.MathUtils.lerp(tailZ, -0.347, open) + climbing * 0.021);
    vector.subVectors(tailTip.position, tailBase);
    tail.position.copy(tailBase);
    tail.scale.set(1, 1, vector.length());
    tail.quaternion.setFromUnitVectors(forward, vector.normalize());

    for (const { sign, foot, shin, hip } of grips) {
      // 一只爪支撑的时候，另一只爪离开树皮，换到新的着力点。
      const cycle = T.MathUtils.euclideanModulo(stride / (2 * Math.PI) + (sign > 0 ? 0.5 : 0), 1);
      const support = 0.62;
      const swing = smooth(cycle, support, 1);
      const step = cycle < support ? 1 - 2 * cycle / support : 2 * swing - 1;
      const lift = climbing * Math.sin(Math.PI * swing);
      foot.position.set(sign * (0.055 + 0.002 * open + lift * 0.012),
        sign * 0.016 + open * 0.12 + step * climbDirection * climbing * 0.068,
        T.MathUtils.lerp(surfaceZ, -0.146, open) + climbing * 0.012 - lift * 0.052);
      foot.rotation.set(open * -0.89 - lift * climbDirection * 0.16, sign * (0.046 + lift * 0.08), 0);
      hip.set(sign * 0.058, -0.029, 0.065).applyEuler(body.rotation).add(body.position);
      bodyStart.set(foot.position.x, foot.position.y, foot.position.z - 0.045);
      alignPart(shin, hip, bodyStart, up, vector, 0.018, 0.018, 0.017);
    }
    for (const { sign, wing } of wings) {
      wing.rotation.set(-open * 0.12, sign * (0.42 - open * 0.30),
        sign * (-1.22 * (1 - open) + (flap * 1.03 + 0.14) * open));
    }
    for (const close of eyeClosers) close(blink(time + 0.74, 5.37), rest);
  }

  pose();
  return { root, pose, beak, feet, tailTip };
}
