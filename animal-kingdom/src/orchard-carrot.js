import * as T from 'three';
import { rabbitCarrotPoint } from './orchard-rabbits.js';

const material = color => new T.MeshStandardMaterial({ color, roughness: .77 });

export function makeRabbitCarrot(parent) {
  const root = new T.Group();
  root.name = '两只兔子的胡萝卜';
  root.position.set(rabbitCarrotPoint.x, rabbitCarrotPoint.y, rabbitCarrotPoint.z);
  parent.add(root);
  const core = new T.Group();
  core.position.y = -.10;
  root.add(core);
  const shape = new T.CylinderGeometry(.14, .024, .34, 20, 4);
  const carrot = new T.Mesh(shape, material('#ed943e'));
  carrot.position.y = .17;
  carrot.castShadow = carrot.receiveShadow = true;
  core.add(carrot);
  const ridge = material('#b9662b');
  for (const [angle,y,r] of [[.5,.26,.135],[3.5,.18,.104],[1.9,.11,.075]]) {
    const line = new T.Mesh(new T.TorusGeometry(r, .005, 5, 14, 1.12), ridge);
    line.rotation.set(Math.PI/2, 0, angle);
    line.position.y = y;
    core.add(line);
  }
  const greens = ['#6f9849','#8eac50','#557e40'].map(material);
  const leafBase = new T.Group();
  leafBase.position.y = .34;
  core.add(leafBase);
  for (const [i,[x,z,height]] of [[-.13,-.06,.31],[.10,-.03,.37],[.02,.10,.30]].entries()) {
    const points = [[0,0,0],[x*.33,height*.50,z*.33],[x,height,z]].map(point => new T.Vector3(...point));
    const line = new T.CatmullRomCurve3(points);
    const stem = new T.Mesh(new T.TubeGeometry(line, 8, .012, 6), greens[i]);
    leafBase.add(stem);
    for (let j=0;j<4;j++) {
      const q=.40+j*.16;
      for (const side of [-1,1]) {
        const at = line.getPoint(q);
        const leaf = new T.Mesh(new T.SphereGeometry(1,10,7), greens[i]);
        leaf.position.copy(at).add(new T.Vector3(side*.042, .017, .011));
        leaf.scale.set(.071,.017,.032);
        leaf.rotation.z=side*.35;
        leafBase.add(leaf);
      }
    }
  }
  return {
    root,
    tick(state) {
      if (!state) return;
      const remaining = Math.max(.06, 1 - state.bite);
      const scale=.42 + remaining * .58;
      core.scale.setScalar(scale);
      core.position.y=.24-.34*scale;
      carrot.material.emissive.set('#efaf4d');
      carrot.material.emissiveIntensity = Math.max(0,state.pulse) * .20;
      leafBase.rotation.z = state.pulse * .14;
    }
  };
}
