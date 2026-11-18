function group(T, parent, name, position = [0, 0, 0]) {
  const node = new T.Group();
  node.name = name;
  node.position.set(...position);
  parent?.add(node);
  return node;
}

function clay(T, color, roughness = 0.70, vertexColors = false) {
  return new T.MeshStandardMaterial({ color, roughness, vertexColors });
}

function mesh(T, parent, name, geometry, material, position, scale) {
  const shape = new T.Mesh(geometry, material);
  shape.name = name;
  if (position) shape.position.set(...position);
  if (scale) shape.scale.set(...scale);
  shape.castShadow = shape.receiveShadow = true;
  parent.add(shape);
  return shape;
}

function cord(T, parent, name, points, radius, material, sections = 9) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
  return mesh(T, parent, name, new T.TubeGeometry(curve, sections, radius, 6, false), material);
}

function denseRings(T, rings) {
  return rings.flatMap((ring, i) => {
    const next = rings[i + 1];
    if (!next) return [ring];
    return [ring, ring.map((value, j) => T.MathUtils.lerp(value, next[j], 1 / 3)),
      ring.map((value, j) => T.MathUtils.lerp(value, next[j], 2 / 3))];
  });
}

// 每个截面围成封闭曲面，虎纹和孔雀羽的眼斑都直接随顶点走。
function sculpt(T, rings, sides, paint) {
  const positions = [];
  const indices = [];
  const colors = [];
  const point = (x, y, z) => {
    positions.push(x, y, z);
    if (paint) {
      const color = paint(x, y, z);
      colors.push(color.r, color.g, color.b);
    }
  };

  for (const [z, centerY, width, height, centerX = 0] of rings) {
    for (let i = 0; i < sides; i++) {
      const angle = i / sides * Math.PI * 2;
      point(centerX + Math.sin(angle) * width, centerY + Math.cos(angle) * height, z);
    }
  }
  const last = (rings.length - 1) * sides;
  const rear = positions.length / 3;
  const tip = rear + 1;
  const [z0, y0, , , x0 = 0] = rings[0];
  const [z1, y1, , , x1 = 0] = rings.at(-1);
  point(x0, y0, z0 - 0.001);
  point(x1, y1, z1 + 0.001);
  for (let row = 0; row < rings.length - 1; row++) {
    for (let i = 0; i < sides; i++) {
      const a = row * sides + i;
      const b = row * sides + (i + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    indices.push(rear, i, j, tip, last + j, last + i);
  }
  const shape = new T.BufferGeometry();
  shape.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  if (paint) shape.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  return shape;
}

function eye(T, parent, name, sphere, position, angle, amber, pupil, shine, size = 1) {
  const socket = group(T, parent, name, position);
  socket.rotation.set(-0.22, angle, 0);
  socket.scale.setScalar(size);
  const opening = group(T, socket, name + ' aperture');
  mesh(T, opening, 'Rounded eye rim', sphere, amber, [0, 0, 0], [0.060, 0.051, 0.029]);
  mesh(T, opening, 'Dark reflective pupil', sphere, pupil, [0, 0.001, 0.020], [0.041, 0.043, 0.021]);
  mesh(T, opening, 'Light fleck', sphere, shine, [-0.014, 0.013, 0.038], [0.010, 0.010, 0.005]);
  const fold = cord(T, socket, name + ' closed lid', [
    [-0.046, 0.006, 0.016], [-0.022, -0.007, 0.025], [0, -0.012, 0.028],
    [0.022, -0.007, 0.025], [0.046, 0.006, 0.016],
  ], 0.0045, pupil, 7);
  fold.castShadow = false;
  return (blink, sleep = 0) => {
    opening.visible = sleep < 0.98;
    opening.scale.y = Math.max(0.015, blink * (1 - sleep));
    fold.visible = sleep > 0.65;
  };
}

function blinking(time, period) {
  const phase = time % period;
  return phase > period - 0.16 ? 1 - 0.94 * Math.sin(Math.PI * (phase - period + 0.16) / 0.16) : 1;
}

export function makeTiger(T) {
  const root = group(T, null, 'Bengal tiger');
  const body = group(T, root, 'Tiger long torso', [0, 0.578, -0.073]);
  const head = group(T, body, 'Tiger head', [0, 0.229, 0.472]);
  const jaw = group(T, head, 'Tiger jaw', [0, -0.089, 0.102]);
  const tail = group(T, body, 'Tiger ringed tail', [0, 0.029, -0.674]);
  const muzzle = group(T, head, 'Tiger nose contact', [0, -0.032, 0.342]);
  const sphere = new T.SphereGeometry(1, 22, 15);
  const small = new T.SphereGeometry(1, 14, 10);
  const coat = clay(T, '#ffffff', 0.72, true);
  const amber = clay(T, '#af8d53', 0.62);
  const charcoal = clay(T, '#544039', 0.73);
  const orange = clay(T, '#cc8b50', 0.74);
  const ivory = clay(T, '#efdfc1', 0.76);
  const earInner = clay(T, '#ba8977', 0.76);
  const darkEye = clay(T, '#403637', 0.41);
  const nose = clay(T, '#7c5b55', 0.60);
  const tongue = clay(T, '#b88179', 0.62);
  const mouth = clay(T, '#503834', 0.73);
  const glint = clay(T, '#fff2d6', 0.51);
  const russet = new T.Color('#bf783e');
  const golden = new T.Color('#dfa35e');
  const cream = new T.Color('#ecdfbd');
  const dark = new T.Color('#493838');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  function torsoColor(x, y, z) {
    const phase = z * 38 + 1.38 * Math.sin(y * 9.7 + z * 4.75) + Math.sin(x * 10.1 - z * 8.3) * 0.78;
    const stripe = s(Math.sin(phase), 0.19 + 0.16 * Math.sin(z * 11.1), 0.72);
    const below = 1 - s(y, -0.224 + Math.sin(z * 5.6) * 0.032, -0.071);
    return color.copy(golden).lerp(russet, s(y, -.035, .293) * 0.68)
      .lerp(cream, below * 0.94).lerp(dark, stripe * (1 - below * 0.62));
  }

  function faceColor(x, y, z) {
    const cheek = (1 - s(y, -0.105, -0.043)) * 0.92;
    const chest = s(Math.abs(x), 0.11, 0.23) * (1 - s(y, 0.065, 0.129)) * 0.69;
    const comma = Math.sin(Math.abs(x) * 52 + 1.92 * Math.sin(y * 14.3) + z * 12.8);
    const ink = s(comma, 0.36, 0.79) * (1 - s(z, 0.193, 0.309));
    return color.copy(golden).lerp(russet, s(y, 0.047, 0.204) * 0.81)
      .lerp(cream, Math.max(cheek, chest)).lerp(dark, ink * .91);
  }

  const belly = sculpt(T, denseRings(T, [
    [-0.735, -0.038, 0.017, 0.023], [-0.693, -0.022, 0.137, 0.132],
    [-0.592, -0.001, 0.219, 0.211], [-0.442, 0.028, 0.264, 0.256],
    [-0.251, 0.039, 0.286, 0.275], [-0.038, 0.047, 0.284, 0.280],
    [0.167, 0.059, 0.277, 0.284], [0.337, 0.067, 0.276, 0.269],
    [0.465, 0.093, 0.234, 0.228], [0.552, 0.124, 0.178, 0.184],
    [0.607, 0.144, 0.080, 0.098], [0.628, 0.152, 0.013, 0.018],
  ]), 38, torsoColor);
  mesh(T, body, 'Continuous black and orange tiger saddle', belly, coat);
  const skull = sculpt(T, denseRings(T, [
    [-0.216, 0.010, 0.014, 0.019], [-0.190, 0.023, 0.121, 0.110],
    [-0.131, 0.032, 0.194, 0.174], [-0.054, 0.036, 0.231, 0.198],
    [0.041, 0.024, 0.225, 0.183], [0.127, 0.007, 0.199, 0.149],
    [0.192, -0.020, 0.160, 0.112], [0.254, -0.037, 0.107, 0.078],
    [0.287, -0.040, 0.064, 0.051], [0.306, -0.043, 0.012, 0.014],
  ]), 32, faceColor);
  mesh(T, head, 'Sculpted face and forehead stripes', skull, coat);
  mesh(T, head, 'Tiger dark pink nose', small, nose, [0, -0.036, 0.312], [0.057, 0.036, 0.035]);
  mesh(T, jaw, 'Warm chin', sphere, ivory, [0, -0.041, 0.092], [0.111, 0.051, 0.146]);
  const throat = mesh(T, head, 'Soft shaded mouth opening', sphere, mouth);
  const tongueTip = mesh(T, jaw, 'Small tongue tip', small, tongue,
    [0, 0.015, 0.176], [0.042, 0.016, 0.056]);

  const tailGeometry = sculpt(T, denseRings(T, [
    [-0.936, 0.228, 0.009, 0.010, 0.129], [-0.903, 0.234, 0.023, 0.022, 0.154],
    [-0.829, 0.209, 0.029, 0.029, 0.159], [-0.721, 0.139, 0.035, 0.033, 0.139],
    [-0.601, 0.066, 0.038, 0.035, 0.105], [-0.470, 0.026, 0.041, 0.039, 0.071],
    [-0.335, 0.001, 0.048, 0.044, 0.039], [-0.198, -0.028, 0.054, 0.051, 0.012],
    [-0.067, -0.034, 0.063, 0.056, 0.004], [0.024, -0.023, 0.043, 0.044, 0],
  ]), 20, (x, y, z) => {
    const band = s(Math.sin(z * 38 - y * 6.5), 0.09, 0.66);
    return color.copy(russet).lerp(golden, .32).lerp(dark, Math.max(band, 1 - s(z, -.94, -.874)));
  });
  mesh(T, tail, 'Single continuous tiger tail with rings', tailGeometry, coat);

  const eyes = [];
  const ears = [];
  for (const sign of [-1, 1]) {
    const label = sign < 0 ? 'Left' : 'Right';
    const ear = group(T, head, label + ' rounded tiger ear', [sign * .150, .151, -.087]);
    mesh(T, ear, 'Dark tiger ear exterior', small, charcoal, [0, .034, 0], [.070, .071, .041]);
    mesh(T, ear, 'Pale ear center', small, earInner, [0, .035, .034], [.047, .048, .018]);
    mesh(T, ear, 'White rear ear dot', small, ivory, [0, .042, -.037], [.034, .027, .010]);
    ears.push({ sign, ear });
    eyes.push(eye(T, head, label + ' tiger eye', small, [sign * .120, .036, .160],
      sign * .57, amber, darkEye, glint));
    mesh(T, head, 'Pale whisker pad', small, ivory, [sign * .080, -.070, .270],
      [.085, .055, .068]);
    for (const ray of [-1, 0, 1]) {
      const whisker = cord(T, head, 'Soft white tiger whisker', [
        [sign * .116, -.064 + ray * .009, .305], [sign * .177, -.057 + ray * .015, .298],
        [sign * .231, -.043 + ray * .024, .261],
      ], .0026, ivory, 6);
      whisker.castShadow = false;
    }
  }

  function makeLimb() {
    const rings = Array.from({length: 26}, (_, i) => {
      const t = i / 25;
      const mass = .46 + .58 * Math.sin(t * Math.PI) ** .58 - t * .135;
      return [-.10 + 1.24 * t, 0, mass, mass * .92];
    });
    return sculpt(T, rings, 18, (x, y, z) => {
      const stripe = s(Math.sin(z * 22.9 + Math.sin(Math.atan2(x, y) * 2 + z * 4.6) * .62), .13, .77);
      const pale = s(y, .28, .91) * .44 + s(z, .72, 1.13) * .22;
      return color.copy(golden).lerp(russet, .36).lerp(cream, pale).lerp(dark, stripe * .91);
    });
  }
  const legGeometry = makeLimb();
  const feet = [];
  const limbs = [];
  for (const front of [true, false]) {
    for (const sign of [-1, 1]) {
      const label = (sign < 0 ? 'Left ' : 'Right ') + 'striped ' + (front ? 'front' : 'hind') + ' leg';
      const upper = mesh(T, root, label + ' shoulder', legGeometry, coat);
      const lower = mesh(T, root, label + ' shin', legGeometry, coat);
      const foot = group(T, root, (sign < 0 ? 'Left ' : 'Right ') + (front ? 'front' : 'hind') + ' tiger foot');
      mesh(T, foot, 'Low round tiger paw', sphere, orange, [0, .043, .030],
        [front ? .091 : .082, .043, front ? .114 : .098]);
      for (const n of [-1, 0, 1]) {
        mesh(T, foot, 'Cream tiger toe', small, ivory, [n * .042, .027, .111 - Math.abs(n) * .011],
          [.030, .026, .040]);
      }
      feet.push(foot);
      limbs.push({ sign, front, foot, upper, lower });
    }
  }
  const hip = new T.Vector3();
  const elbow = new T.Vector3();
  const pawTop = new T.Vector3();
  const fruitPaw = group(T,feet[0],'Tiger paw pad contact with shared fruit',[0,.032,.146]);
  const reachingFoot = new T.Vector3(), reachingPad = new T.Vector3();
  const direction = new T.Vector3();
  const axis = new T.Vector3(0, 0, 1);

  function align(mesh, from, to, width, depth) {
    direction.subVectors(to, from);
    mesh.position.copy(from);
    mesh.scale.set(width, depth, direction.length());
    mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
  }

  function pose({ time = 0, stride = time * 6.7, gait = 0, stretch = 0, look = 0,
    ears: hearing = 0, sniff = 0, call = 0, notice = 0, frontLeftY = 0, frontRightY = 0,
    hindLeftY = 0, hindRightY = 0, fruitReach = 0, fruitX = 0, fruitY = 0, fruitZ = 0 } = {}) {
    const bow = s(stretch, 0, 1);
    const scent = s(sniff, 0, 1);
    const crouch = Math.max(bow, scent * .81);
    const voice = s(call, 0, 1);
    const step = gait * (1 - crouch);
    const breath = Math.sin(time * 3.05) * .005;
    const calm = 1-Math.max(gait,stretch,sniff,call,notice,hearing,fruitReach);
    const survey = Math.sin(time*1.18+.7)*(.026+.09*s(Math.sin(time*.81),.53,.92))*calm;
    body.position.set(0, .578 - crouch * .128 + Math.abs(Math.sin(stride)) * step * .021 + breath,
      -.073 + bow * .100);
    body.rotation.set(bow * .190 + scent * .103 - voice * .050, look * .036,
      Math.sin(stride) * step * .040);
    body.scale.set(1, 1 - bow * .065, 1 + bow * .100);
    head.position.set(0, .229 - bow * .081 - scent * .152 + voice * .025 + notice*.073, .472 + bow * .060 + scent * .017);
    head.rotation.set(-bow * .081 + scent * .39 - voice * .159 - notice*.25,
      look * .77+survey, look * -.087+survey*.18);
    tail.rotation.set(-bow * .142, Math.sin(time * 2.1) * (.26 + step * .19) + look * .20,
      bow * -.041 + Math.sin(time * 3.3) * .087);
    jaw.rotation.x = voice * .63;
    jaw.position.z = .102 + voice * .067;
    throat.position.set(0, -.102 - voice * .074, .267 + voice * .028);
    throat.scale.set(.105, .014 + voice * .077, .040);
    throat.visible = tongueTip.visible = voice > .068;
    for (const setEye of eyes) setEye(blinking(time + .40, 4.9) * (1 - voice * .17));
    for (const { sign, ear } of ears) {
      const twitch = calm*s(Math.sin(time*2.2+sign*1.9),.89,1)*Math.sin(time*25);
      ear.rotation.set(bow * -.13 - hearing * .078 + twitch*.102, sign * .16 + look * .15 + hearing * .12,
        sign * (-.18 + Math.sin(time * 2.7 + sign) * .049));
    }

    const floors = [frontLeftY, frontRightY, hindLeftY, hindRightY];
    for (const [i, { sign, front, foot, upper, lower }] of limbs.entries()) {
      const phase = stride + ((sign < 0) === front ? 0 : Math.PI);
      const lift = Math.max(0, -Math.sin(phase)) * step;
      // 水平足位与状态层采样地高的位置一致，摆腿时只加抬脚高度。
      const along = Math.cos(phase) * gait;
      const reach = front ? stretch : 0;
      const x = sign * ((front ? .178 : .171) + reach * .031);
      const z = front ? .386 : -.480;
      foot.position.set(x, floors[i] + lift * .109, z + reach * .33 + along * .110);
      // 听到近处孔雀抖屏，先抬头看，再轻抬一只前掌，另外三掌保持承重。
      if(i===0){
        foot.position.y+=notice*.087;
        foot.position.z+=notice*.038;
      }
      foot.rotation.set(-lift * .14, sign * (.06 + reach * .16), 0);
      if(i===0 && fruitReach>0){
        const touch=s(fruitReach,0,1);
        foot.rotation.x=-touch*.12;
        reachingPad.copy(fruitPaw.position).applyEuler(foot.rotation);
        reachingFoot.set(fruitX,fruitY,fruitZ).sub(reachingPad);
        foot.position.lerp(reachingFoot,touch);
        foot.position.y+=.051*Math.sin(Math.PI*touch);
      }
      pawTop.copy(foot.position);
      pawTop.y += .060;
      hip.set(sign * (front ? .166 : .179), (front ? .592 : .556) - crouch * (front ? .193 : .062),
        z - .035 + reach * .117);
      elbow.set(x, (front ? .264 : .240) - reach * .119 + lift * .045,
        z + (front ? -.026 : .079) + reach * .224 + along * .063);
      align(upper, hip, elbow, front ? .119 : .151, front ? .123 : .160);
      align(lower, elbow, pawTop, front ? .082 : .077, .082);
    }
  }

  pose();
  return { root, pose, feet, muzzle, fruitPaw };
}

export function makePeacock(T) {
  const root = group(T, null, 'Indian blue peacock');
  const body = group(T, root, 'Peacock body');
  const neck = group(T, body, 'Peacock blue neck', [0, .027, .103]);
  const head = group(T, neck, 'Peacock head', [0, .500, .125]);
  const bill = group(T, head, 'Peacock lower bill', [0, -.018, .069]);
  const train = group(T, body, 'Peacock coverts fan', [0, .029, -.211]);
  const sphere = new T.SphereGeometry(1, 22, 15);
  const small = new T.SphereGeometry(1, 14, 10);
  const paint = clay(T, '#fff', .59, true);
  const white = clay(T, '#ece8d5', .71);
  const eyeRim = clay(T, '#ab9981', .64);
  const pupil = clay(T, '#3d3738', .41);
  const blue = clay(T, '#2f7091', .54);
  const shaft = clay(T, '#7c8876', .71);
  const beak = clay(T, '#a38f63', .67);
  const footSkin = clay(T, '#89836b', .75);
  const nail = clay(T, '#625b4d', .71);
  const light = clay(T, '#fff1dd', .52);
  const deepBlue = new T.Color('#294674');
  const cobalt = new T.Color('#3e82b0');
  const blueGreen = new T.Color('#42968e');
  const coverts = new T.Color('#68865b');
  const leaf = new T.Color('#81a16c');
  const bronze = new T.Color('#d3ad68');
  const emerald = new T.Color('#397e70');
  const turquoise = new T.Color('#56b7ba');
  const violet = new T.Color('#34538b');
  const nearBlack = new T.Color('#25385d');
  const cinnamon = new T.Color('#a08466');
  const smoke = new T.Color('#585351');
  const color = new T.Color();
  const s = T.MathUtils.smoothstep;

  const back = sculpt(T, [
    [-.385, .012, .008, .014], [-.363, .020, .061, .049],
    [-.310, .027, .116, .087], [-.242, .028, .162, .118],
    [-.151, .023, .184, .144], [-.053, .015, .194, .159],
    [.049, .011, .185, .159], [.137, .011, .153, .140],
    [.207, .012, .105, .102], [.255, .024, .050, .054], [.270, .031, .012, .017],
  ], 28, (x, y, z) => {
    const goldEdge = s(y, .025, .161) * (.30 + .1 * Math.sin(z * 34 + x * 16));
    return color.copy(deepBlue).lerp(coverts, s(-z, -.115, .225)).lerp(bronze, goldEdge);
  });
  mesh(T, body, 'Blue-green volume of peacock shoulders', back, paint);

  const neckSilhouette = sculpt(T, [
    [-.040, .013, .053, .048], [.011, -.009, .103, .091],
    [.077, -.032, .112, .104], [.157, -.067, .100, .093],
    [.238, -.094, .080, .077], [.325, -.114, .064, .069],
    [.401, -.118, .055, .059], [.481, -.125, .052, .056],
    [.530, -.129, .040, .044], [.552, -.136, .016, .022],
  ], 26, (x, y, z) => {
    const cool = s(y, -.14, .023) * s(z, .035, .50);
    const metallic = s(Math.abs(x), .026, .102) * (1 - s(z, .30, .51));
    return color.copy(deepBlue).lerp(cobalt, .52 + cool * .29).lerp(blueGreen, metallic * .62);
  }).rotateX(-Math.PI / 2);
  mesh(T, neck, 'Sculpted blue neck', neckSilhouette, paint);
  mesh(T, head, 'Rounded cobalt head', sphere, blue, [0, .021, -.008], [.089, .092, .111]);
  mesh(T, head, 'Short gray-gold upper bill', sculpt(T, [
    [.062, -.013, .027, .032], [.095, -.015, .035, .032],
    [.130, -.020, .026, .022], [.168, -.025, .011, .010], [.180, -.027, .003, .004],
  ], 16), beak);
  const billTip = group(T, head, 'Peacock upper bill contact', [0, -.027, .181]);
  mesh(T, bill, 'Fine lower bill', small, beak, [0, -.013, .049], [.030, .015, .058]);

  const eyelids = [];
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const mark = mesh(T, head, side + ' peafowl cheek mask', small, white,
      [sign * .069, .026, .046], [.024, .037, .059]);
    mark.rotation.set(-.20, sign * .29, sign * .10);
    eyelids.push(eye(T, head, side + ' peacock eye', small,
      [sign * .075, .043, .056], sign * .92, eyeRim, pupil, light, .57));
  }
  const crown = group(T, head, 'Upright crown quills', [0, .081, -.044]);
  for (const ray of [-2, -1, 0, 1, 2]) {
    const x = ray * .031;
    const height = .177 - Math.abs(ray) * .017;
    cord(T, crown, 'Peacock crest shaft', [[0, 0, 0], [x * .64, height * .55, -.015],
      [x, height, -.033]], .0034, shaft, 7);
    mesh(T, crown, 'Blue crest paddle', small, blue,
      [x, height + .005, -.033], [.018, .028, .010]).rotation.z = -ray * .12;
  }

  const feather = sculpt(T, [
    [0, 0, .008, .008], [.065, .003, .015, .008], [.160, .009, .026, .009],
    [.276, .011, .035, .009], [.394, .014, .045, .010], [.499, .017, .054, .010],
    [.597, .021, .062, .010], [.670, .026, .073, .010], [.716, .029, .083, .011],
    [.752, .031, .089, .012], [.782, .033, .091, .012], [.808, .035, .092, .012],
    [.834, .037, .089, .012], [.859, .040, .083, .012], [.887, .043, .074, .011],
    [.919, .046, .060, .010], [.948, .048, .048, .009], [.974, .049, .028, .007],
    [.993, .050, .010, .005], [.999, .050, .003, .003],
  ], 18, (x, y, z) => {
    const radius = Math.hypot(x / .084, (z - .815) / .125);
    const cleanEdge = 1 - s(radius, .91, 1.025);
    const bronzeRing = s(radius, .66, .91) * cleanEdge;
    const shaftCover = (1 - s(Math.abs(x), .005, .021)) * (1 - s(z, .56, .708));
    color.copy(coverts).lerp(leaf, s(z, .20, .98) * .83)
      .lerp(emerald, cleanEdge).lerp(bronze, bronzeRing * .92)
      .lerp(turquoise, (1 - s(radius, .46, .69)) * .98)
      .lerp(violet, 1 - s(radius, .30, .47)).lerp(nearBlack, 1 - s(radius, .125, .285));
    const vane=s(z,.18,.52)*(1-s(z,.61,.75));
    return color.lerp(bronze,shaftCover*.54+.070*vane*(.5+.5*Math.cos(z*62-Math.abs(x)*84)));
  }).rotateX(-Math.PI / 2);

  const rays = [];
  const fanTips = [];
  const fanEyes = [];
  for (let row = 0; row < 2; row++) {
    const count = row === 0 ? 15 : 10;
    for (let i = 0; i < count; i++) {
      const amount = i / (count - 1) * 2 - 1;
      const fanAngle = amount * (row === 0 ? 1.34 : 1.16) + (row === 0 ? 0 : .043);
      const length = (row === 0 ? 1.064 : .806) - Math.abs(amount) * (row === 0 ? .076 : .049);
      const ray = group(T, train, 'Peacock feather hinge ' + (rays.length + 1),
        [amount * .049, row * -.014, row * .037 + .009 * (i % 2)]);
      ray.scale.set(row === 0 ? 1.0 : .87, length, 1);
      mesh(T, ray, 'Sculpted eyespot feather', feather, paint);
      fanTips.push(group(T, ray, 'Feather tip', [0, 1, -.050]));
      if (row === 0) fanEyes.push(group(T, ray, 'Outer train eyespot', [0, .815, -.045]));
      rays.push({ fanAngle, ray, amount, row, i });
    }
  }

  const wingGeometry = sculpt(T, [
    [-.015, .003, .025, .020], [.055, .003, .099, .047],
    [.123, -.005, .129, .056], [.224, -.014, .127, .050],
    [.340, -.030, .107, .038], [.442, -.048, .074, .025],
    [.531, -.067, .041, .015], [.570, -.073, .010, .007],
  ], 22, (x, y, z) => {
    const shimmer = s(y, -.020, .06) * (1 - s(z, .15, .48));
    return color.copy(cinnamon).lerp(smoke, s(z, .31, .57) * .74).lerp(bronze, shimmer * .35);
  }).rotateY(Math.PI / 2);
  const flightFeather = sculpt(T, [
    [-.015, 0, .012, .007], [.031, .002, .035, .014],
    [.081, 0, .039, .015], [.141, -.008, .034, .012],
    [.193, -.017, .022, .009], [.235, -.028, .005, .004],
  ], 12, (x, y, z) => color.copy(cinnamon).lerp(smoke, .45 * s(z, .089, .230)));
  const feet = [];
  const legs = [];
  const wings = [];

  for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'Left' : 'Right';
    const wing = group(T, body, side + ' peacock wing', [sign * .136, .031, .033]);
    const mirrored = group(T, wing, 'Flight fan');
    mirrored.scale.x = sign;
    mesh(T, mirrored, 'Round brown flight wing', wingGeometry, paint);
    for (let i = 0; i < 5; i++) {
      const quill = mesh(T, mirrored, 'Layered outer flight feather', flightFeather, paint,
        [.155 + .065 * i, -.008 - i * .009, -.034 - i * .013],
        [1, 1, 1 - i * .043]);
      quill.rotation.set(.12, 2.88 - i * .11, 0);
    }
    wings.push({ sign, wing });

    const foot = group(T, root, side + ' peacock foot contact');
    const ankle = mesh(T, root, side + ' slender leg', small, footSkin);
    const toes = group(T, foot, 'Peacock forward toe hinge', [0, .011, .008]);
    mesh(T, foot, 'Rounded toe base', small, footSkin, [0, .018, 0], [.023, .018, .034]);
    for (const ray of [-1, 0, 1]) {
      const reach = .085 - Math.abs(ray) * .013;
      cord(T, toes, 'Peacock front toe', [[0, .008, .002], [ray * .023, .000, .038],
        [ray * .033, -.001, reach]], .0068, footSkin, 8);
      cord(T, toes, 'Short claw tip', [[ray * .033, -.001, reach - .003],
        [ray * .036, -.005, reach + .007], [ray * .035, -.007, reach + .013]], .004, nail, 5);
    }
    const rear = group(T, foot, 'Peacock rear grip hinge', [0, .017, -.009]);
    cord(T, rear, 'Opposed toe', [[0, .002, -.002], [sign * .016, -.002, -.024],
      [sign * .022, -.008, -.041]], .0065, footSkin, 7);
    feet.push(foot);
    legs.push({ sign, foot, toes, rear, ankle });
  }
  const hip = new T.Vector3();
  const heel = new T.Vector3();
  const delta = new T.Vector3();
  const up = new T.Vector3(0, 1, 0);
  const reach = new T.Vector3();
  const inverseBody = new T.Matrix4();
  const neckAim = new T.Quaternion(), headAim = new T.Quaternion();
  const aiming = new T.Euler();
  const upperLength = Math.hypot(head.position.y, head.position.z);
  const lowerLength = Math.hypot(billTip.position.y, billTip.position.z);

  // 由颈基和喙尖解两段转轴，让伸颈后每次真碰同一粒种子。
  function aimBill(x,y,z,amount) {
    body.updateMatrix();
    reach.set(x,y,z).applyMatrix4(inverseBody.copy(body.matrix).invert()).sub(neck.position);
    const axial = Math.hypot(reach.x,reach.z);
    const length = Math.min(reach.length(),upperLength + lowerLength - .0001);
    const direction = Math.atan2(axial,reach.y);
    const spread = Math.acos(T.MathUtils.clamp((upperLength ** 2 + length ** 2 - lowerLength ** 2)
      / (2 * upperLength * Math.max(.02,length)),-1,1));
    const shoulder = direction-spread;
    const neckPitch = shoulder-Math.atan2(head.position.z,head.position.y);
    const billDirection = Math.atan2(axial-Math.sin(shoulder)*upperLength,reach.y-Math.cos(shoulder)*upperLength);
    const headPitch = billDirection-neckPitch-Math.atan2(billTip.position.z,billTip.position.y);
    neckAim.setFromEuler(aiming.set(neckPitch,Math.atan2(reach.x,reach.z),0,'YXZ'));
    headAim.setFromEuler(aiming.set(headPitch,0,0,'XYZ'));
    neck.quaternion.slerp(neckAim,amount);
    head.quaternion.slerp(headAim,amount);
  }

  function pose({ time = 0, fan = 0, flight = 0, flap = 0, land = 0, call = 0, look = 0,
    crouch = 0, sleep = 0, perch = 0, shake = 0, shakePhase = 0, peck = 0,
    reachX = 0, reachY = 0, reachZ = 0, gait = 0, stride = 0, leftFootY = 0, rightFootY = 0 } = {}) {
    const air = s(flight, .015, .66);
    const rest = s(sleep, 0, 1) * (1 - air);
    const crouched = crouch * (1 - air) + land * .48;
    const displayed = s(fan, 0, 1) * (1 - air) * (1 - rest) * (perch ? 0 : 1);
    const voice = call * (1 - rest);
    const taking = peck * (1-air) * (1-rest);
    const walking = gait * (1-air) * (perch ? 0 : 1);
    const rocking = Math.cos(stride)*walking;
    const rattle = displayed*shake;
    const quiet = 1-Math.max(air,rest,taking,walking,displayed,voice,Math.abs(look),crouched);
    const survey = Math.sin(time*1.19+.88)*quiet*.098;
    body.position.set(rocking*.017, .361 - crouched * .079 - rest * .046 - taking*.066
      + Math.sin(time * 3) * .005 + Math.abs(rocking)*.013,
      -.009 + air * .053);
    body.rotation.set(air * .242 + crouched * .092, 0, air * flap * .041 - rocking*.053);
    neck.rotation.set(-air * .412 + rest * .36 - displayed * .044, look * .25,
      rest * -.139 + look * .044);
    head.rotation.set(-voice * .125 - air * .072 + survey*.33,
      look * .26 + rest * -.62 + survey, look * -.09+survey*.35);
    if (taking>0) aimBill(reachX,reachY,reachZ,taking);
    bill.rotation.x = voice * .42 + taking*(1-taking)*.22;
    crown.rotation.x = Math.sin(time * 5.3) * .047 + air * -.27 + rest * -.16;
    for (const setEye of eyelids) setEye(blinking(time + .52, 4.9), rest);

    // 先抬羽轴再展开两侧，最低羽尖在地上方通过。
    const raised = s(displayed, 0, .70);
    const shiver = Math.sin(shakePhase*14);
    train.rotation.set(T.MathUtils.lerp(-1.71 + air * .10, -.145, raised) + rattle*shiver*.039,
      .038 + displayed * .07 + rattle*shiver*.245, -.018 + rattle*Math.sin(shakePhase*19)*.044);
    for (const { fanAngle, ray, amount, row, i } of rays) {
      const reveal = s(displayed, Math.abs(amount) * .30 + row*.04, .99);
      const flutter = Math.sin(time * 2.3 - i * .37) * displayed * .005;
      const tremor = rattle*Math.sin(shakePhase*41-i*.58+row*.73);
      ray.rotation.set((row ? .096 : -.039) * reveal + flutter + tremor*.017,
        amount * .040 * (1 - reveal), -fanAngle * (.072 + reveal * .928) + tremor*.022);
    }
    for (const { sign, wing } of wings) {
      wing.rotation.set(-air * .16,
        sign * (1.29 - air * 1.16),
        sign * (-.32 * (1 - air) + air * (flap * 1.15 + .16)));
    }
    for (const { sign, foot, toes, rear, ankle } of legs) {
      const grip = (perch ? 1 : 0) * (1 - air);
      const step = stride+(sign>0?Math.PI:0);
      const rise = Math.max(0,-Math.sin(step))*walking;
      const floor = (sign<0?leftFootY:rightFootY)*(1-air)*(perch?0:1);
      foot.position.set(sign * (.097 - air * .016), air * .119 + floor + rise*.047,
        .016 - air * .136 + Math.cos(step)*walking*.073);
      foot.rotation.set(-air * .61, sign * .11, 0);
      toes.rotation.x = grip * .38 + air * .24;
      rear.rotation.x = -grip * .48;
      hip.set(sign * .098, -.109, -.013).applyEuler(body.rotation).add(body.position);
      heel.copy(foot.position);
      heel.y += .028;
      heel.z -= .012;
      delta.subVectors(heel, hip);
      ankle.position.copy(hip).lerp(heel, .52);
      ankle.scale.set(.021, delta.length() * .60 + .017, .024);
      ankle.quaternion.setFromUnitVectors(up, delta.normalize());
    }
  }

  pose();
  return { root, pose, feet, fanTips, bill:billTip, fanSurface:train, fanEyes };
}
