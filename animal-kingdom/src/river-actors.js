import { legPart, makeLeg } from './savanna-actors.js';
import { riverPoints } from './river-state.js';

function group(T, parent, name, position = [0, 0, 0]) {
  const result = new T.Group();
  result.name = name;
  result.position.set(...position);
  parent?.add(result);
  return result;
}

function clay(T, color, roughness = 0.71, vertexColors = false) {
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

function cord(T, parent, name, points, radius, material, sections = 12, closed = false) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), closed);
  return mesh(T, parent, name, new T.TubeGeometry(curve, sections, radius, 6, closed), material);
}

function sculpt(T, rings, sides, paint) {
  const points = [];
  const colors = [];
  const faces = [];
  function vertex(x, y, z) {
    points.push(x, y, z);
    if (paint) {
      const color = paint(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (const [z, y, rx, ry, x = 0] of rings) {
    for (let i = 0; i < sides; i++) {
      const theta = i / sides * Math.PI * 2;
      vertex(x + rx * Math.sin(theta), y + ry * Math.cos(theta), z);
    }
  }
  const back = points.length / 3;
  const front = back + 1;
  const last = back - sides;
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
    const j = (i + 1) % sides;
    faces.push(back, i, j, front, last + j, last + i);
  }
  const shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  if (paint) shape.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  shape.setIndex(faces);
  shape.computeVertexNormals();
  return shape;
}

function eyes(T, parent, name, position, yaw, iris, pupil, light, size = 1) {
  const geometry = new T.SphereGeometry(1, 14, 10);
  const eye = group(T, parent, name, position);
  eye.rotation.set(-0.26, yaw, 0);
  eye.scale.setScalar(size);
  const aperture = group(T, eye, name + ' aperture');
  mesh(T, aperture, 'Iris border', geometry, iris, [0, 0, 0], [0.072, 0.062, 0.031]);
  mesh(T, aperture, 'Dark eye surface', geometry, pupil, [0, 0.003, 0.022], [0.055, 0.052, 0.027]);
  mesh(T, aperture, 'Tiny catchlight', geometry, light, [-0.018, 0.018, 0.044], [0.013, 0.012, 0.006]);
  const lid = cord(T, eye, 'Closed eye seam', [
    [-0.052, 0.004, 0.018], [-0.021, -0.011, 0.029], [0, -0.014, 0.032],
    [0.021, -0.011, 0.029], [0.052, 0.004, 0.018],
  ], 0.006, pupil, 7);
  lid.castShadow = false;

  return (blink, sleep = 0) => {
    aperture.scale.y = Math.max(0.018, blink * (1 - sleep));
    aperture.visible = sleep < 0.98;
    lid.visible = sleep > 0.65;
  };
}

function blinkAt(time, period) {
  const phase = time % period;
  return phase > period - 0.18 ? 1 - 0.94 * Math.sin(Math.PI * (phase - period + 0.18) / 0.18) : 1;
}

export function makeHippo(T, groundAt = () => 0.19) {
  const root = group(T, null, 'River hippopotamus');
  const body = group(T, root, 'Hippo submerged body', [0, 0.062, -0.114]);
  const head = group(T, body, 'Hippo high-set head', [0, 0.133, 0.523]);
  const jaw = group(T, head, 'Hippopotamus jaw', [0, -0.102, 0.126]);
  const contact = group(T, root, 'Hippo chest wave origin', [0, 0.06, 0.61]);
  const sphere = new T.SphereGeometry(1, 24, 16);
  const detail = new T.SphereGeometry(1, 15, 10);
  const painted = clay(T, '#fff', 0.73, true);
  const stone = clay(T, '#9a8f97', 0.76);
  const cheek = clay(T, '#b29b9c', 0.74);
  const throatShade = clay(T, '#5c414c', 0.72);
  const lip = clay(T, '#a78d91', 0.70);
  const insideEar = clay(T, '#c0979c', 0.76);
  const noseShade = clay(T, '#706370', 0.74);
  const tongue = clay(T, '#bc8892', 0.55);
  const ivory = clay(T, '#e9d9c0');
  const amber = clay(T, '#8f7c68', 0.65);
  const pupil = clay(T, '#4b414b', 0.43);
  const glint = clay(T, '#fff0d9', 0.51);
  const grey = new T.Color('#958c9c');
  const pinkGrey = new T.Color('#bba7a7');
  const wine = new T.Color('#827987');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  function shallowBelly(geometry) {
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      if (y < 0) positions.setY(i, y * 0.39);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  function hide(x, y, z) {
    const lightFace = s(z, 0.10, 0.59) * (1 - s(Math.abs(x), 0.30, 0.61));
    return color.copy(grey).lerp(wine, s(y, 0.19, 0.54) * 0.47)
      .lerp(pinkGrey, Math.max((1 - s(y, -0.28, -0.034)) * 0.67, lightFace * 0.51));
  }

  const barrel = sculpt(T, [
    [-0.867, -0.037, 0.021, 0.026], [-0.827, -0.029, 0.188, 0.213],
    [-0.739, -0.010, 0.395, 0.331], [-0.594, 0.012, 0.554, 0.424],
    [-0.416, 0.026, 0.648, 0.465], [-0.208, 0.028, 0.697, 0.485],
    [0.011, 0.032, 0.714, 0.499], [0.201, 0.041, 0.654, 0.484],
    [0.361, 0.053, 0.569, 0.446], [0.477, 0.054, 0.449, 0.350],
    [0.557, 0.052, 0.262, 0.251], [0.594, 0.052, 0.033, 0.041],
  ], 44, hide);
  // 保留露出水面的背部轮廓，为短腿和浅河床让出水下空间。
  mesh(T, body, 'Wide soft hippo barrel', shallowBelly(barrel), painted);
  mesh(T, body, 'Submerged shoulders', shallowBelly(sphere.clone()), stone,
    [0, -0.020, 0.293], [0.510, 0.340, 0.382]);

  const skull = sculpt(T, [
    [-0.284, -0.004, 0.024, 0.023], [-0.254, 0.004, 0.198, 0.167],
    [-0.172, 0.024, 0.378, 0.236], [-0.061, 0.028, 0.472, 0.268],
    [0.072, 0.009, 0.483, 0.240], [0.201, -0.014, 0.445, 0.210],
    [0.343, -0.023, 0.383, 0.193], [0.422, -0.033, 0.245, 0.133],
    [0.454, -0.039, 0.022, 0.032],
  ], 36, hide);
  mesh(T, head, 'Wide hippo skull', skull, painted);
  const broadSnout = sculpt(T, [
    [-0.077, -0.029, 0.041, 0.032], [-0.054, -0.018, 0.242, 0.134],
    [0.032, -0.011, 0.369, 0.178], [0.128, 0.002, 0.415, 0.162],
    [0.201, 0.005, 0.407, 0.140], [0.254, -0.002, 0.349, 0.112],
    [0.290, -0.009, 0.254, 0.085], [0.314, -0.014, 0.129, 0.064],
    [0.326, -0.019, 0.028, 0.022],
  ], 40).translate(0, -0.003, 0.308);
  mesh(T, head, 'Broad rounded upper muzzle', broadSnout, cheek);
  mesh(T, jaw, 'Hippopotamus soft lower jaw', sphere, lip, [0, -0.051, 0.201], [0.381, 0.116, 0.302]);
  const throat = mesh(T, head, 'Hippo inner mouth', sphere, throatShade);
  const tongueTip = mesh(T, jaw, 'Hippo tongue', sphere, tongue,
    [0, 0.035, 0.304], [0.169, 0.035, 0.117]);
  const teeth = [];
  const lids = [];
  const ears = [];
  const legs = [];
  const limbShape = legPart(T);
  const hip = new T.Vector3();
  const tail = group(T, body, 'Short hippo tail', [0, -0.025, -0.746]);
  cord(T, tail, 'Hanging hippo tail', [[0, 0, 0], [0.012, -0.052, -0.105],
    [0.035, -0.151, -0.166], [0.033, -0.210, -0.172]], 0.023, stone);
  mesh(T, tail, 'Small tail brush', detail, noseShade, [0.033, -0.204, -0.170], [0.026, 0.043, 0.025]);

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const ear = group(T, head, side + ' hippo ear', [sign * 0.307, 0.249, -0.122]);
    const outer = mesh(T, ear, 'Thick curled ear', detail, stone, [sign * 0.022, 0.045, 0],
      [0.102, 0.116, 0.064]);
    const inside = mesh(T, ear, 'Rosy ear hollow', detail, insideEar, [sign * 0.022, 0.053, 0.047],
      [0.065, 0.073, 0.025]);
    outer.rotation.z = inside.rotation.z = sign * -0.26;
    ears.push({ sign, ear });

    mesh(T, head, side + ' raised eye pad', sphere, stone,
      [sign * 0.246, 0.194, 0.169], [0.155, 0.130, 0.151]);
    lids.push(eyes(T, head, side + ' hippo eye', [sign * 0.248, 0.224, 0.264],
      sign * 0.54, amber, pupil, glint, 0.91));
    mesh(T, head, side + ' muzzle nostril swell', detail, cheek,
      [sign * 0.195, 0.107, 0.486], [0.132, 0.077, 0.115]);
    const nostril = mesh(T, head, side + ' hippo nostril', detail, noseShade,
      [sign * 0.204, 0.156, 0.534], [0.068, 0.024, 0.046]);
    nostril.rotation.set(-0.48, sign * 0.26, 0);

    mesh(T, head, side + ' muzzle crease', detail, lip,
      [sign * 0.303, -0.088, 0.500], [0.106, 0.026, 0.062]);
    const tooth = mesh(T, jaw, side + ' rounded ivory tooth', detail, ivory,
      [sign * 0.202, 0.033, 0.326], [0.049, 0.067, 0.055]);
    tooth.rotation.z = sign * -0.13;
    teeth.push(tooth);

    for (const rear of [false, true]) {
      const leg = makeLeg(T, root, side + (rear ? ' rear' : ' front') + ' hippo',
        limbShape, stone, stone, 'foot', [0.139, 0.071, 0.157]);
      legs.push({ sign, rear, leg });
    }
  }

  for (const sign of [-1, 1]) {
    teeth.push(mesh(T, jaw, (sign < 0 ? 'Left' : 'Right') + ' small front ivory tooth', detail, ivory,
      [sign * .069, .069, .361], [.040, .047, .040]));
  }

  const brushRay = new T.Raycaster();
  const brushNormal = new T.Vector3();
  const brushOrigin = new T.Vector3();
  const brushPoint = new T.Vector3();
  const brushHitLocal = new T.Vector3();
  const jawInverse = new T.Matrix4();
  const brushRotation = new T.Quaternion();
  const brushBristles = [-.031, 0, .031].flatMap(x => [-.049, -.016, .016, .049].map(z => ({ x, z, tip: .005 })));
  const brushFootprint = [[0, 0], ...Array.from({ length: 8 }, (_, i) =>
    [Math.cos(i * Math.PI / 4) * .007, Math.sin(i * Math.PI / 4) * .007])];

  function brushRail(u = 0, v = 0, target = new T.Vector3()) {
    root.updateWorldMatrix(true, true);
    const x = T.MathUtils.clamp(u, -1, 1) * .224;
    const z = .361 - .035 * (x / .224) ** 2 + T.MathUtils.clamp(v, -1, 1) * .012;
    // 刷头始终高于最高的牙冠，柔软刷毛分别按各自的牙面压缩。
    target.set(x, .121, z).applyMatrix4(jaw.matrixWorld);
    return target;
  }

  function brushFrame(u = 0, v = 0) {
    brushRail(u, v, brushPoint);
    jawInverse.copy(jaw.matrixWorld).invert();
    const local = brushHitLocal.copy(brushPoint).applyMatrix4(jawInverse);
    const x = local.x, z = local.z;
    brushNormal.set(0, -1, 0).transformDirection(jaw.matrixWorld);
    let touching = false;
    for (const bristle of brushBristles) {
      let height = 0;
      // 每根刷毛的整个圆形端面都取样，旁边较高的牙冠也会先压缩它。
      for (const [dx, dz] of brushFootprint) {
        brushOrigin.set(x + bristle.x + dx, .30, z + bristle.z + dz).applyMatrix4(jaw.matrixWorld);
        brushRay.set(brushOrigin, brushNormal);
        const hit = brushRay.intersectObjects(teeth, false)[0];
        if (hit) height = Math.max(height, brushHitLocal.copy(hit.point).applyMatrix4(jawInverse).y);
      }
      bristle.tip = height > .084 ? height + .004 - .121 : .005;
      touching ||= height > .084;
    }
    jaw.getWorldQuaternion(brushRotation);
    return { point: brushPoint, quaternion: brushRotation, touching, bristles: brushBristles };
  }

  function pose({ x: worldX, y: worldY = 0.45, z: worldZ = 0, yaw = 0, time = 0,
    stride = 0, gait = 0, lift = 0, gape = 0, sink = 0, brushing = 0 } = {}) {
    const dip = s(sink, 0, 1);
    const rise = s(lift, 0, 1);
    const open = s(gape, 0, 1);
    const walk = gait * (1 - Math.max(dip, rise, open));
    const weight = Math.sin(stride) * walk;
    const breath = Math.sin(time * 2.25) * 0.009 * (1 - brushing);
    body.position.y = 0.062 + rise * 0.119 - dip * 0.128 + breath + (Math.sin(stride * 2) * 0.016 - 0.020) * walk;
    body.rotation.set(-rise * 0.025 + dip * 0.018, 0, weight * 0.039);
    head.position.y = 0.133 + open * 0.106 + rise * 0.053 - walk * 0.040;
    head.rotation.set(-open * 0.136 - rise * 0.066 + dip * 0.042 + walk * 0.064,
      Math.sin(time * 1.3) * 0.020 * (1 - brushing), -weight * 0.022);
    jaw.rotation.x = open * 0.785;
    jaw.position.z = 0.126 + open * 0.102;
    throat.position.set(0, -0.097 - open * 0.169, 0.447 + open * 0.031);
    throat.scale.set(0.332, 0.018 + open * 0.160, 0.086);
    // 张嘴刷牙时，暗色口腔留在牙排后方，给牙冠外侧的刷头让出真实空间。
    throat.position.z -= brushing * .17;
    throat.scale.z *= 1 - brushing * .64;
    throat.visible = tongueTip.visible = open > 0.057;
    for (const tooth of teeth) tooth.visible = open > 0.115;
    for (const setEye of lids) setEye(blinkAt(time + 1.21, 5.2));
    for (const { sign, ear } of ears) {
      ear.rotation.set(0.019 - rise * 0.101, sign * (0.23 + open * 0.13),
        sign * (0.046 + Math.sin(time * 3.5 + sign) * 0.072));
    }
    tail.position.y = -0.025 + dip * 0.06;
    tail.rotation.set(dip * 0.42, Math.sin(time * 2.1) * 0.27 + weight * 0.09, 0);

    const right = Math.cos(yaw), forward = Math.sin(yaw);
    for (const { sign, rear, leg } of legs) {
      const phase = stride / (2 * Math.PI) + (sign > 0 ? 0.5 : 0) - (rear ? 0 : 0.24);
      const cycle = phase - Math.floor(phase);
      const support = 0.73;
      const swing = s(cycle, support, 1);
      const step = (cycle < support ? 1 - cycle * 2 / support : swing * 2 - 1) * walk;
      const raised = Math.sin(Math.PI * swing) * walk * 0.092;
      const x = sign * (rear ? 0.382 : 0.344);
      const z = rear ? -0.666 : 0.253;
      const footZ = z + step * 0.23;
      // 四趾踩真实河床，身体压低或探出水面时由腿调整，脚掌不会跟着浮起。
      const floor = (worldX === undefined ? 0.19 :
        groundAt(worldX + x * right + footZ * forward, worldZ - x * forward + footZ * right)) - worldY;
      hip.set(x, -0.121, z + 0.114).applyEuler(body.rotation).add(body.position);
      const footY = floor + raised;
      leg.place(hip.toArray(), [x, Math.max(footY + 0.075, (hip.y + footY) * 0.5), z + step * 0.144],
        [x, footY, footZ], rear ? 0.167 : 0.157, 0.135, 0, sign * 0.07);
    }
  }

  pose();
  return { root, pose, contact, brushRail, brushFrame, teeth };
}

function shellDome(T) {
  const positions = [];
  const colors = [];
  const faces = [];
  const sides = 52;
  const rings = 34;
  const smooth = T.MathUtils.smoothstep;
  const rim = new T.Color('#637048');
  const base = new T.Color('#a4a168');
  const edge = new T.Color('#72774e');
  const highlight = new T.Color('#b7ad72');
  const color = new T.Color();
  const sites = [[0, -0.216], [0.006, 0], [0, 0.208], [-0.154, -0.137],
    [-0.164, 0.087], [0.155, -0.144], [0.165, 0.079], [0.013, 0.323], [0, -0.323]];

  function vertex(x, y, z, radial) {
    positions.push(x, y, z);
    let best = Infinity;
    let next = Infinity;
    let tile = 0;
    for (const [i, [px, pz]] of sites.entries()) {
      const distance = 1.17 * (x - px) ** 2 + 0.92 * (z - pz) ** 2;
      if (distance < best) {
        next = best;
        best = distance;
        tile = i;
      } else {
        next = Math.min(next, distance);
      }
    }
    const seam = 1 - smooth(next - best, 0.0017, 0.010);
    const curvedRing = (0.5 + 0.5 * Math.cos(Math.sqrt(best) * 124)) * 0.09;
    color.copy(base).lerp(highlight, 0.16 + (tile % 4) * 0.11 + curvedRing)
      .lerp(edge, seam * 0.88).lerp(rim, smooth(radial, 0.85, 1.02) * 0.43);
    colors.push(color.r, color.g, color.b);
  }

  // 甲片边缘沿整个拱面排布，从侧面看也有连续的曲率。
  for (let row = 0; row < rings; row++) {
    const r = (row + 1) / rings;
    for (let i = 0; i < sides; i++) {
      const theta = i / sides * Math.PI * 2;
      const scallop = 1 + 0.008 * Math.sin(theta * 10) * r ** 5;
      const x = 0.295 * r * Math.sin(theta) * scallop * (1 - 0.073 * Math.cos(theta));
      const z = 0.391 * r * Math.cos(theta) * scallop;
      const y = 0.122 + Math.max(0, 1 - r * r) ** 0.57 * 0.229 - z * 0.012;
      vertex(x, y, z, r);
    }
  }
  const apex = positions.length / 3;
  vertex(0, 0.351, 0, 0);
  for (let row = 0; row < rings - 1; row++) {
    for (let i = 0; i < sides; i++) {
      const a = row * sides + i;
      const b = row * sides + (i + 1) % sides;
      faces.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  for (let i = 0; i < sides; i++) faces.push(apex, i, (i + 1) % sides);

  const shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  shape.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  shape.setIndex(faces);
  shape.computeVertexNormals();
  return shape;
}

export function makeTurtle(T, stoneTopAt) {
  const root = group(T, null, 'River turtle');
  const torso = group(T, root, 'Turtle body shell');
  const shell = group(T, torso, 'Turtle shell');
  const head = group(T, torso, 'Retracting turtle head');
  const neck = group(T, torso, 'Turtle neck');
  const contact = group(T, root, 'Turtle belly water origin', [0, 0.06, 0.20]);
  const sphere = new T.SphereGeometry(1, 20, 14);
  const small = new T.SphereGeometry(1, 14, 10);
  const paint = clay(T, '#fff', 0.76, true);
  const shellEdge = clay(T, '#797b4a', 0.73);
  const chest = clay(T, '#b0a270', 0.74);
  const moss = clay(T, '#828f5c', 0.74);
  const pale = clay(T, '#b7ad73', 0.74);
  const shadow = clay(T, '#65714f', 0.76);
  const clayPad = clay(T, '#9e9c6c', 0.71);
  const mouth = clay(T, '#62684c', 0.72);
  const amber = clay(T, '#9d8358', 0.61);
  const pupil = clay(T, '#494235', 0.41);
  const glint = clay(T, '#fff1cc', 0.49);
  const s = T.MathUtils.smoothstep;

  mesh(T, shell, 'Sculpted turtle carapace', shellDome(T), paint);
  const rim = new T.TorusGeometry(1, 0.052, 8, 52).rotateX(Math.PI / 2);
  mesh(T, shell, 'Rounded turtle shell rim', rim, shellEdge,
    [0, 0.122, 0], [0.288, 0.56, 0.376]);
  const plastron = sculpt(T, [
    [-0.372, 0.091, 0.012, 0.009], [-0.323, 0.087, 0.150, 0.038],
    [-0.223, 0.087, 0.224, 0.052], [-0.088, 0.090, 0.260, 0.057],
    [0.066, 0.092, 0.263, 0.055], [0.193, 0.096, 0.222, 0.048],
    [0.297, 0.099, 0.151, 0.040], [0.343, 0.099, 0.061, 0.025],
    [0.353, 0.099, 0.017, 0.010],
  ], 24);
  mesh(T, shell, 'Fitted turtle plastron', plastron, chest);
  mesh(T, torso, 'Dark space under front lip', small, shadow,
    [0, 0.125, 0.332], [0.107, 0.052, 0.069]);
  mesh(T, neck, 'Flexible turtle throat', sphere, moss, [0, 0, 0], [0.055, 0.047, 0.14]);
  mesh(T, head, 'Rounded olive turtle head', sculpt(T, [
    [-0.104, -0.003, 0.007, 0.009], [-0.087, 0.006, 0.052, 0.047],
    [-0.038, 0.010, 0.082, 0.065], [0.013, 0.005, 0.089, 0.066],
    [0.054, -0.001, 0.079, 0.055], [0.084, -0.004, 0.060, 0.039],
    [0.103, -0.004, 0.031, 0.029], [0.113, -0.006, 0.008, 0.012],
  ], 24), moss);
  mesh(T, head, 'Soft lower beak', small, pale, [0, -0.022, 0.065],
    [0.065, 0.032, 0.048]);
  group(T, head, 'Turtle nose marker', [0, -0.001, 0.113]);
  cord(T, head, 'Turtle beak edge', [[-0.062, -0.021, 0.079], [-0.028, -0.026, 0.106],
    [0, -0.024, 0.113], [0.028, -0.026, 0.106], [0.062, -0.021, 0.079]], 0.0036, mouth, 12);
  const tail = mesh(T, torso, 'Short turtle tail', sculpt(T, [
    [-0.143, -0.015, 0.006, 0.005], [-0.114, -0.006, 0.016, 0.012],
    [-0.079, 0.004, 0.027, 0.017], [-0.038, 0.004, 0.040, 0.021],
    [0.008, -0.001, 0.038, 0.019],
  ], 14), moss, [0, 0.079, -0.320]);
  const limbs = [];
  const eyelids = [];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    mesh(T, head, side + ' turtle cheek stripe', small, pale, [sign * 0.067, 0.009, 0.009],
      [0.020, 0.031, 0.058]).rotation.y = sign * -0.26;
    eyelids.push(eyes(T, head, side + ' turtle eye', [sign * 0.065, 0.027, 0.043],
      sign * 0.81, amber, pupil, glint, 0.35));
    mesh(T, head, side + ' tiny turtle nostril', small, mouth, [sign * 0.027, 0.011, 0.104],
      [0.008, 0.005, 0.004]);

    for (const front of [true, false]) {
      const label = side + (front ? ' front' : ' hind') + ' turtle';
      const arm = mesh(T, torso, label + ' webbed limb', sphere, moss);
      const foot = group(T, torso, label + ' claw');
      mesh(T, foot, 'Broad turtle webbing', small, moss, [0, 0.005, 0.018],
        [front ? 0.058 : 0.052, 0.026, 0.068]);
      for (const toe of [-1, 0, 1]) {
        const tip = mesh(T, foot, 'Rounded turtle toe', small, clayPad,
          [toe * 0.027, 0.000, 0.063 - Math.abs(toe) * 0.010], [0.014, 0.012, 0.021]);
        tip.rotation.y = toe * 0.24;
      }
      limbs.push({ sign, front, arm, foot });
    }
  }

  const up = new T.Vector3(0, 1, 0);
  const origin = new T.Vector3();
  const direction = new T.Vector3();
  const toe = new T.Vector3();
  const stone = riverPoints.turtleSites[1];
  const belly = plastron.attributes.position;
  const sole = [[0, -0.021, 0.018], [0, -0.012, 0.065], [0, -0.007, -0.031], [0, 0.003, -0.047],
    [-0.044, -0.011, 0.024], [0.044, -0.011, 0.024], [-0.032, -0.010, 0.057], [0.032, -0.010, 0.057],
    [-0.034, -0.009, -0.023], [0.034, -0.009, -0.023], [-0.051, 0.000, 0.018], [0.051, 0.000, 0.018],
    [-0.028, -0.003, 0.071], [0.028, -0.003, 0.071], [0, -0.004, 0.083]];

  function pose({ x: worldX, y: worldY = 0, z: worldZ = 0, yaw = 0, time = 0, reach = 1, paddle = 0, gait = 0,
    stride = time * 6.3, sleep = 0, listen = 0 } = {}) {
    const rest = s(sleep, 0, 1);
    const extend = s(reach, 0, 1) * (1 - rest * 0.80);
    const swim = paddle * (1 - rest);
    const walk = gait * (1 - swim) * (1 - rest);
    const glance = listen * extend;
    const looking = Math.sin(time * 1.42 + .91) * extend * (1 - rest) * (1 - swim) * (1 - walk)
      * (1 - Math.min(1, Math.abs(listen)));
    const bob = Math.sin(time * 5.28) * 0.008 * swim;
    const touchingStone = stoneTopAt && worldX !== undefined && worldY < stone.y - 0.001 &&
      Math.hypot(worldX - stone.x, worldZ - stone.z) < 1.10;
    const right = Math.cos(yaw), forward = Math.sin(yaw);
    const support = (x, z) => stoneTopAt(worldX + x * right + z * forward, worldZ - x * forward + z * right) - worldY;
    torso.position.y = bob;
    if (touchingStone) {
      // 岩缘是弧形，检测腹甲下沿与实物石面，避免整只龟还没抬起就钻进石头。
      for (let ring = 0; ring < Math.floor(belly.count / 24); ring++) {
        for (let sector = 7; sector <= 17; sector += 2) {
          const index = 24 * ring + sector;
          torso.position.y = Math.max(torso.position.y,
            support(belly.getX(index), belly.getZ(index)) - belly.getY(index) + 0.007);
        }
      }
    }
    head.position.set(glance * 0.023 + .006 * looking,
      0.145 + extend * 0.046 - rest * 0.021 + .006 * looking, 0.202 + extend * 0.244);
    head.rotation.set(-extend * 0.121 + rest * 0.173, glance * 0.46 + .113 * looking, glance * -0.068);
    neck.position.set(glance * 0.011, 0.132 + extend * 0.021, 0.264 + extend * 0.099);
    neck.scale.z = 0.61 + extend * 0.40;
    tail.rotation.y = Math.sin(time * 5.8) * (0.067 + swim * 0.173) * (1 - rest);
    for (const setEye of eyelids) setEye(blinkAt(time + 0.42, 5.1), rest);

    for (const { sign, front, arm, foot } of limbs) {
      const phase = stride + ((sign < 0) === front ? 0 : Math.PI);
      const raise = Math.max(0, Math.sin(phase));
      const row = Math.sin(time * 6.1 + (sign < 0 ? Math.PI : 0) + (front ? 0 : 0.72));
      const anchorZ = front ? 0.180 : -0.216;
      const wade = Math.cos(phase) * walk;
      const z = anchorZ + 0.025 + walk * -0.073 * Math.cos(phase) + swim * row * 0.113;
      const x = sign * (0.277 + 0.033 * swim - 0.042 * rest + swim * row * 0.052);
      const y = 0.023 + 0.048 * raise * walk + swim * (row * 0.018 - 0.018);
      foot.position.set(x, y, z);
      foot.rotation.set(raise * walk * -0.18 + swim * row * 0.159,
        sign * (0.41 + swim * 0.44 + rest * 0.20 + wade * 0.16), sign * swim * 0.19);
      if (touchingStone) {
        // 进入岩缘的蹼先跨上石面，没到岩缘的脚继续在水里划。
        for (const sample of sole) {
          toe.set(...sample).applyEuler(foot.rotation);
          foot.position.y = Math.max(foot.position.y,
            support(x + toe.x, z + toe.z) - torso.position.y - toe.y + 0.013);
        }
      }
      origin.set(sign * (front ? 0.170 : 0.183), 0.110 + 0.006 * Math.sin(phase) * walk, anchorZ);
      direction.subVectors(foot.position, origin);
      arm.position.copy(origin).lerp(foot.position, 0.47);
      arm.scale.set(0.049, direction.length() * 0.57 + 0.022, front ? 0.039 : 0.042);
      arm.quaternion.setFromUnitVectors(up, direction.normalize());
    }
  }

  pose();
  return { root, pose, contact };
}
