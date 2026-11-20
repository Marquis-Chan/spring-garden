export const sceneCues = {
  eucalyptus: [{kind:'wallaby'}, {kind:'gum-leaves'}, {kind:'wallaby-grass'}, {kind:'silvereye'}, {kind:'gum-bough'}, {kind:'wombat-den'}, {kind:'wombat'}, {kind:'koala'}],
  bamboo: [{kind:'panda-bamboo'}, {kind:'panda-slope'}, {kind:'panda-mother'}, {kind:'panda-left'}, {kind:'panda-right'}],
  pond: [{kind:'duckling',index:0}, {kind:'site'}],
  ice: [{kind:'ice-fish'}, {kind:'ice-cave'}, {kind:'polar-bear'}],
  grove: [{kind:'grass',index:0}, {kind:'wood',index:0}],
  orchard: [{kind:'rabbit-carrot'}, {kind:'apple',index:0}],
  savanna: [{kind:'bough',index:0}, {kind:'elephant'}],
  river: [{kind:'hippo-brush'}, {kind:'hippo'}, {kind:'river-grass',index:0}, {kind:'croc'}],
  asia: [{kind:'shared-fruit'}, {kind:'tiger-tuft'}],
  rainforest: [{kind:'toucan-berry'}, {kind:'drop-banana'}, {kind:'macaw'}],
  coast: [{kind:'coast-ramp'}, {kind:'coast-crab'}, {kind:'coast-kelp'}, {kind:'coast-stone'}],
  ocean: [{kind:'ocean-animal',index:'whale'}, {kind:'ocean-animal',index:'shark'}]
};

export function sceneCue(mode, idleSeconds, available, preferredKind) {
  const targets = sceneCues[mode];
  if (!targets || idleSeconds < 3) return null;
  const beat = (idleSeconds - 3) % 7;
  if (beat >= 1.65) return null;
  const next = targets[Math.floor((idleSeconds - 3) / 7) % targets.length];
  const preferred = targets.find(({kind}) => kind === preferredKind) ?? next;
  const target = available.find(({kind,index}) => kind === preferred.kind && (preferred.index === undefined || index === preferred.index));
  return target ? {target, strength:.39 * Math.sin(Math.PI * beat / 1.65) ** 2} : null;
}
