(function () {
  'use strict';
  const G = window.SpringGarden = window.SpringGarden || {};

  // The planted foot is authoritative. For an unreachable target the limb
  // stretches toward it rather than moving the point of ground contact.
  function limb(hip, foot, upper, lower, bendSign = 1) {
    const dx = foot.x - hip.x, dy = foot.y - hip.y;
    const distance = Math.hypot(dx, dy);
    const angle = distance > 1e-9 ? Math.atan2(dy, dx) : Math.PI / 2;
    const cosine = distance > 1e-9 && upper > 0
      ? (upper * upper + distance * distance - lower * lower) / (2 * upper * distance)
      : 0;
    const bend = Math.acos(Math.max(-1, Math.min(1, cosine))) * (bendSign < 0 ? -1 : 1);
    const knee = { x: hip.x + upper * Math.cos(angle + bend), y: hip.y + upper * Math.sin(angle + bend) };
    return {
      hip: { x: hip.x, y: hip.y }, knee, foot: { x: foot.x, y: foot.y },
      d: `M${hip.x} ${hip.y}L${knee.x} ${knee.y}L${foot.x} ${foot.y}`
    };
  }

  // Each stripe is a short normal centered on the current shin, not a decal
  // translated with the foot while the underlying leg changes its angle.
  function markings(knee, foot, width = 7, count = 2) {
    const dx = foot.x - knee.x, dy = foot.y - knee.y, length = Math.hypot(dx, dy);
    if (length < 1e-9 || width <= 0 || count <= 0) return '';
    const nx = -dy / length * width / 2, ny = dx / length * width / 2;
    let d = '';
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1), x = knee.x + dx * t, y = knee.y + dy * t;
      d += `M${x - nx} ${y - ny}L${x + nx} ${y + ny}`;
    }
    return d;
  }

  G.rig = { limb, markings };
})();
