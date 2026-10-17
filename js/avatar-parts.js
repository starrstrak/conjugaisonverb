/* Catalogue de l'avatar 3D : transformations, couleurs, visages, décors, poses…
   (les accessoires — chapeaux, lunettes, etc. — sont dans avatar-items.js).
   Chaque pièce = { id, name, emoji, lock, b? }. `lock` : 0 = gratuit · nombre = prix en pièces · 'l12' = niveau 12 · 'b:streak7' = trophée.
   Ajouter une pièce = ajouter une ligne ici : les anciens appareils la recevront à la prochaine mise à jour sans rien perdre. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AvatarParts = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PI = Math.PI;
  const hexMix = (h, t, to) => { // éclaircit (to = 255) ou assombrit (to = 0)
    const n = parseInt(h.slice(1), 16), f = (v) => Math.round(v + (to - v) * t);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  const lighter = (h, t = 0.4) => hexMix(h, t, 255);
  const darker = (h, t = 0.3) => hexMix(h, t, 0);

  /* ---------- onglets ---------- */
  const SLOTS = [
    { id: 'form', name: 'Forme', emoji: '🐲' }, { id: 'color', name: 'Couleurs', emoji: '🎨' }, { id: 'face', name: 'Visage', emoji: '😀' },
    { id: 'hat', name: 'Tête', emoji: '🎩' }, { id: 'glasses', name: 'Lunettes', emoji: '🕶️' }, { id: 'neck', name: 'Cou', emoji: '🧣' },
    { id: 'back', name: 'Dos', emoji: '🎒' }, { id: 'hand', name: 'Main', emoji: '🎇' }, { id: 'feet', name: 'Pieds', emoji: '👟' },
    { id: 'aura', name: 'Aura', emoji: '✨' }, { id: 'scene', name: 'Décor', emoji: '🏝️' }, { id: 'pose', name: 'Pose', emoji: '💃' }, { id: 'outfit', name: 'Tenues', emoji: '👕' },
  ];

  /* ---------- couleurs ---------- */
  const COLORS = [
    ['#7bd88f', 'Menthe', 0], ['#6ec6ff', 'Ciel', 0], ['#ff9ecf', 'Bonbon', 0], ['#ffb35c', 'Mangue', 0], ['#b79cff', 'Lilas', 0], ['#ff7676', 'Fraise', 0],
    ['#ffd93d', 'Soleil', 0], ['#ffffff', 'Neige', 0], ['#4a4e69', 'Ardoise', 0], ['#2ec4b6', 'Lagon', 0], ['#a0522d', 'Chocolat', 0], ['#f4a261', 'Biscuit', 0],
    ['#e63946', 'Rubis', 10], ['#1d3557', 'Nuit', 10], ['#06d6a0', 'Émeraude', 10], ['#9b5de5', 'Améthyste', 10], ['#f15bb5', 'Framboise', 10],
    ['#00bbf9', 'Lagune', 10], ['#fee440', 'Citron', 10], ['#8ac926', 'Pomme', 10], ['#111827', 'Réglisse', 15], ['#ff6b35', 'Citrouille', 15],
    ['#ffd700', 'Or', 40], ['#c0c8d4', 'Argent', 40], ['rainbow', 'Arc-en-ciel', 'l15'],
  ].map(([id, name, lock]) => ({ id, name, lock, emoji: '' }));
  const EYE_COLORS = ['#2b2d42', '#3a6ea5', '#2e8b57', '#8b4513', '#9b5de5', '#ef476f', '#ffb703', '#00a6a6'].map((id) => ({ id, name: id, lock: 0, emoji: '' }));

  /* ---------- aides de géométrie ---------- */
  const surf = (g, x, y) => g.rz * Math.sqrt(Math.max(0.04, 1 - (x / g.rx) ** 2 - ((y - g.by) / g.ry) ** 2)); // z de la surface du corps en (x, y)
  const topAt = (g, x) => g.by + g.ry * Math.sqrt(Math.max(0.02, 1 - (x / g.rx) ** 2)); // y de la surface en haut, à l'abscisse x
  const onBody = (g, az, dy) => { const s = Math.sqrt(Math.max(0.01, 1 - (dy / g.ry) ** 2)); return { x: g.rx * s * Math.sin(az), y: g.by + dy, z: g.rz * s * Math.cos(az), yaw: az }; };

  /* ---------- ailes / cornes / queues / piques ---------- */
  function wingsB(c, g, type, P) {
    if (!type || type === 'none') return;
    const by = g.by, acc = P.accent, dk = darker(acc, 0.25), lt = lighter(acc, 0.35);
    for (const s of [-1, 1]) {
      const j = s < 0 ? 'wingL' : 'wingR', o = (e) => Object.assign({ j }, e);
      const bx = s * g.rx * 0.5, bz = -g.rz * 0.62, byy = by + g.ry * 0.36;
      if (type === 'baby') c.E(s * (g.rx * 0.72), by + 0.5, -0.5, 0.32, 0.2, 0.05, acc, o({ rot: [0, 0.5 * s, 0.5 * s] }));
      else if (type === 'dragon' || type === 'bat') {
        const big = type === 'bat' ? 1.1 : 1, col = type === 'bat' ? darker(acc, 0.35) : lighter(P.body, 0.12);
        c.E(bx + s * 0.75 * big, byy + 0.5 * big, bz - 0.1, 0.78 * big, 0.5 * big, 0.04, col, o({ rot: [0, 0.45 * s, 0.55 * s] }));
        [25, 50, 78].forEach((deg) => { const a = (deg * PI) / 180; c.C(bx, byy, bz, 0.05, 1.25 * big, dk, o({ rot: [0, 0.45 * s, s * (a - PI / 2)] })); });
      } else if (type === 'angel') {
        for (let k = 0; k < 5; k++) { const a = ((20 + k * 17) * PI) / 180, L = 0.55 + k * 0.03; c.E(bx + s * Math.cos(a) * L, byy + Math.sin(a) * L, bz, 0.58, 0.14, 0.05, k % 2 ? '#ffffff' : '#f3f6ff', o({ rot: [0, 0.3 * s, s * a] })); }
      } else if (type === 'fairy') {
        c.E(bx + s * 0.7, byy + 0.55, bz, 0.72, 0.5, 0.03, lighter(acc, 0.2), o({ m: 'glass', rot: [0, 0.35 * s, 0.5 * s] }));
        c.E(bx + s * 0.55, byy - 0.1, bz, 0.46, 0.32, 0.03, acc, o({ m: 'glass', rot: [0, 0.35 * s, -0.5 * s] }));
      } else if (type === 'leaf') {
        [[0.7, 0.45, 0.6], [0.95, 0.15, 0.45], [0.6, 0.8, 0.4]].forEach(([x, y, r], k) => c.E(bx + s * x, byy + y - 0.1, bz, r, 0.16, 0.04, k === 1 ? '#6bbf59' : '#3f9b4f', o({ rot: [0, 0.3 * s, s * (0.3 + k * 0.4)] })));
      } else if (type === 'fire') {
        for (let k = 0; k < 5; k++) { const a = ((15 + k * 17) * PI) / 180; c.C(bx, byy, bz, 0.09 + (k % 2) * 0.03, 1.1 - Math.abs(k - 2) * 0.12, k % 2 ? '#ffd23f' : '#ff6b1a', o({ m: 'glow', rot: [0, 0.4 * s, s * (a - PI / 2)] })); }
      } else if (type === 'mech') {
        [[0.5, 0.3, 0.9], [0.9, 0.5, 0.7], [1.2, 0.7, 0.5]].forEach(([x, y, w], k) => c.B(bx + s * x, byy + y - 0.2, bz, w, 0.12, 0.3, k === 2 ? '#8d99ae' : '#adb5bd', o({ m: 'metal', rot: [0, 0.3 * s, s * (0.35 + k * 0.1)] })));
        c.B(bx + s * 0.6, byy + 0.1, bz + 0.18, 0.7, 0.05, 0.05, '#00e5ff', o({ m: 'glow', rot: [0, 0.3 * s, s * 0.35] }));
      } else if (type === 'jet') {
        c.Y(bx + s * 0.1, byy - 0.1, bz - 0.1, 0.17, 0.7, '#9aa5b1', o({ m: 'metal' }));
        c.C(bx + s * 0.1, byy - 0.1, bz - 0.1, 0.14, 0.5, '#ff9f1c', o({ m: 'glow', rot: [PI, 0, 0] }));
      }
    }
  }
  function hornsB(c, g, type, P) {
    if (!type || type === 'none') return;
    const acc = P.accent, gold = '#ffd166', x0 = 0.4 * g.rx;
    for (const s of [-1, 1]) {
      const y0 = topAt(g, x0) - 0.06;
      if (type === 'nub') c.C(s * 0.35, topAt(g, 0.35) - 0.04, 0.08, 0.1, 0.2, gold, { rot: [-0.2, 0, -s * 0.3] });
      else if (type === 'horns_s') c.C(s * x0, y0, 0.05, 0.12, 0.4, gold, { rot: [-0.3, 0, -s * 0.35] });
      else if (type === 'horns') c.C(s * x0, y0, 0.05, 0.16, 0.62, gold, { rot: [-0.35, 0, -s * 0.38] });
      else if (type === 'devil') c.C(s * x0, y0, 0.05, 0.13, 0.45, '#d90429', { rot: [-0.2, 0, -s * 0.5] });
      else if (type === 'catears') { c.C(s * 0.55 * g.rx, topAt(g, 0.55 * g.rx) - 0.12, 0, 0.24, 0.42, P.body, { rot: [0, 0, -s * 0.35] }); c.C(s * 0.55 * g.rx, topAt(g, 0.55 * g.rx) - 0.1, 0.06, 0.14, 0.3, '#ffb3c6', { rot: [0, 0, -s * 0.35] }); }
      else if (type === 'bunny') { c.E(s * 0.32, g.by + g.ry + 0.4, -0.05, 0.15, 0.5, 0.08, P.body, { rot: [-0.15, 0, -s * 0.2] }); c.E(s * 0.32, g.by + g.ry + 0.4, 0.0, 0.08, 0.38, 0.05, '#ffb3c6', { rot: [-0.15, 0, -s * 0.2] }); }
      else if (type === 'bear') { c.E(s * 0.62 * g.rx / 0.95, g.by + g.ry * 0.74, 0, 0.22, 0.22, 0.13, P.body); c.E(s * 0.62 * g.rx / 0.95, g.by + g.ry * 0.74, 0.07, 0.12, 0.12, 0.07, '#ffb3c6'); }
      else if (type === 'antenna') { c.Y(s * 0.3, y0, 0, 0.03, 0.45, '#6c757d', { rot: [0, 0, -s * 0.3] }); c.E(s * 0.3 - s * 0.07, y0 + 0.47, 0, 0.07, 0.07, 0.07, '#ff4d6d', { m: 'glow' }); }
      else if (type === 'antlers') {
        c.Y(s * 0.35, y0, 0, 0.04, 0.55, '#7f5539', { rot: [0, 0, -s * 0.3] });
        c.Y(s * 0.45, y0 + 0.25, 0, 0.03, 0.3, '#7f5539', { rot: [0, 0, -s * 0.9] }); c.Y(s * 0.5, y0 + 0.4, 0, 0.03, 0.3, '#7f5539', { rot: [0, 0, -s * 0.2] });
      } else if (type === 'unicorn' && s > 0) {
        c.C(0, topAt(g, 0) - 0.12, 0.35, 0.12, 0.85, gold, { rot: [0.4, 0, 0] });
        [0.2, 0.4, 0.6].forEach((u) => c.T(0, topAt(g, 0) - 0.12 + u * Math.cos(0.4), 0.35 + u * Math.sin(0.4), 0.12 * (1 - u / 0.85) + 0.012, 0.018, '#fff4c2', { rot: [0.4, 0, 0], det: 0.6 }));
      } else if (type === 'sprout' && s > 0) {
        c.E(-0.12, topAt(g, 0) + 0.12, 0, 0.2, 0.07, 0.05, '#4caf50', { rot: [0, 0, 0.6] }); c.E(0.12, topAt(g, 0) + 0.12, 0, 0.2, 0.07, 0.05, '#66bb6a', { rot: [0, 0, -0.6] });
      }
    }
  }
  function spikesB(c, g, type, P) {
    if (!type || type === 'none') return;
    const acc = P.accent;
    const arc = (u) => ({ y: g.by + g.ry * Math.cos(u), z: -g.rz * Math.sin(u) });
    if (type === 'back' || type === 'back_s') {
      const n = type === 'back' ? 6 : 4;
      for (let k = 0; k < n; k++) { const u = 0.3 + k * (type === 'back' ? 0.22 : 0.25), p = arc(u); c.C(0, p.y - 0.03, p.z, 0.11 - k * 0.006, 0.24 - k * 0.012, acc, { rot: [-u, 0, 0] }); }
    } else if (type === 'plates') {
      for (let k = 0; k < 5; k++) { const u = 0.35 + k * 0.25, p = arc(u); c.E(0, p.y, p.z, 0.06, 0.26 - k * 0.015, 0.2, acc, { rot: [-u, 0, 0] }); }
    } else if (type === 'crystal') {
      [[0, 0.5, 0.34], [0.2, 0.7, 0.26], [-0.2, 0.75, 0.28], [0.1, 1.0, 0.2]].forEach(([x, u, h], k) => { const p = arc(u); c.C(x, p.y - 0.04, p.z, 0.09, h * 1.5, k % 2 ? '#bdeeff' : '#7ad7f0', { m: 'glass', rot: [-u, 0, x] }); });
    } else if (type === 'fins') {
      for (const s of [-1, 1]) c.E(s * 0.15, topAt(g, 0.15) + 0.08, -0.25, 0.05, 0.25, 0.3, acc, { rot: [0, 0, -s * 0.2] });
    }
  }
  function tailB(c, g, type, P) {
    if (!type || type === 'none') return;
    const j = 'tail', o = (e) => Object.assign({ j }, e), z0 = -g.rz + 0.05, y0 = g.by - 0.52, body = P.body, acc = P.accent;
    const curve = (n, len, rise, r0, r1, col) => {
      const pts = [], rs = [];
      for (let k = 0; k < n; k++) { const u = k / (n - 1); pts.push([0.12 * Math.sin(u * 3), y0 + rise * u * u, z0 - len * u]); rs.push(r0 + (r1 - r0) * u); }
      pts.forEach((p, i) => c.E(p[0], p[1], p[2], rs[i], rs[i], rs[i], col, o({ det: 0.7 })));
      return pts[n - 1];
    };
    if (type === 'dragon' || type === 'dragon_s') {
      const n = type === 'dragon' ? 6 : 4, e = curve(n, type === 'dragon' ? 0.95 : 0.55, 0.45, 0.24, 0.07, body);
      c.C(e[0], e[1] - 0.02, e[2] - 0.02, type === 'dragon' ? 0.13 : 0.1, 0.24, acc, o({ rot: [-1.6, 0, 0] }));
    } else if (type === 'cat') { const e = curve(8, 0.9, 0.9, 0.11, 0.09, body); c.E(e[0], e[1], e[2], 0.1, 0.1, 0.1, darker(body, 0.25), o({ det: 0.7 })); }
    else if (type === 'fluffy') c.E(0, g.by - 0.5, -g.rz - 0.05, 0.28, 0.28, 0.28, '#ffffff', o({ m: 'soft' }));
    else if (type === 'flame') { c.C(0, y0, z0 - 0.1, 0.2, 0.7, '#ff6b1a', o({ m: 'glow', rot: [-1.2, 0, 0] })); c.C(0, y0 + 0.02, z0 - 0.1, 0.12, 0.55, '#ffd23f', o({ m: 'glow', rot: [-1.2, 0, 0] })); }
    else if (type === 'arrow') { const e = curve(6, 1.0, 0.5, 0.07, 0.05, '#d90429'); c.C(e[0], e[1], e[2], 0.16, 0.26, '#d90429', o({ rot: [-1.2, 0, 0] })); }
    else if (type === 'robot') { for (let k = 0; k < 4; k++) c.Y(0, y0 + 0.05 * k, z0 - 0.15 - k * 0.22, 0.14 - k * 0.02, 0.18, k % 2 ? '#adb5bd' : '#8d99ae', o({ m: 'metal', rot: [-PI / 2, 0, 0] })); c.E(0, y0 + 0.2, z0 - 1.05, 0.09, 0.09, 0.09, '#00e5ff', o({ m: 'glow' })); }
    else if (type === 'dino') c.F(0, y0 - 0.05, z0 + 0.05, 0.32, 0.05, 1.3, body, o({ rot: [-PI / 2 + 0.3, 0, 0] }));
    else if (type === 'stinger') { c.E(0, y0, z0 - 0.1, 0.22, 0.2, 0.28, '#ffd23f', o({})); c.C(0, y0, z0 - 0.3, 0.1, 0.35, '#2b2d42', o({ rot: [-PI / 2, 0, 0] })); }
    else if (type === 'wisp') curve(5, 0.3, -0.5, 0.26, 0.05, body);
    else if (type === 'fish') { c.E(0, y0 + 0.1, z0 - 0.4, 0.04, 0.3, 0.45, acc, o({ rot: [0, 0, 0] })); }
  }

  /* ---------- transformations (formes) ---------- */
  const F = (id, name, emoji, lock, o) => Object.assign({ id, name, emoji, lock, body: [0.95, 0.85, 0.85], arms: 1, feet: 1, wings: 'none', horns: 'none', tail: 'none', spikes: 'none' }, o);
  const FORMS = [
    F('egg', 'Œuf magique', '🥚', 0, { stage: 0, body: [0.8, 1.02, 0.8], arms: 0, feet: 0, noBelly: 1, egg: 1 }),
    F('baby', 'Bébé dragon', '🐣', 'l3', { stage: 1, horns: 'nub', tail: 'dragon_s' }),
    F('young', 'Jeune dragon', '🐲', 'l6', { stage: 2, wings: 'baby', horns: 'horns_s', tail: 'dragon', spikes: 'back_s' }),
    F('dragon', 'Dragon des verbes', '🐉', 'l10', { stage: 3, wings: 'dragon', horns: 'horns', tail: 'dragon', spikes: 'back' }),
    F('fire', 'Dragon de feu', '🔥', 'l12', { wings: 'fire', horns: 'horns', tail: 'flame', spikes: 'back', fin: 'shiny', pal: { body: '#e63946', belly: '#ffb703', accent: '#ff9f1c' } }),
    F('ice', 'Dragon de glace', '❄️', 'l14', { wings: 'fairy', horns: 'horns', tail: 'dragon', spikes: 'crystal', fin: 'jelly', pal: { body: '#8ecae6', belly: '#e0f7ff', accent: '#4cc9f0' } }),
    F('forest', 'Dragon des bois', '🌿', 'l16', { wings: 'leaf', horns: 'antlers', tail: 'dragon', spikes: 'back_s', pal: { body: '#52b788', belly: '#d8f3dc', accent: '#2d6a4f' } }),
    F('galaxy', 'Dragon galaxie', '🌌', 'l18', { wings: 'fairy', horns: 'horns', tail: 'dragon', spikes: 'crystal', fin: 'shiny', pal: { body: '#3a2f7a', belly: '#7b6cd9', accent: '#ffd166' }, extra: (c, g) => { for (let k = 0; k < 9; k++) { const p = onBody(g, k * 2.4, ((k * 37) % 100 / 100 - 0.5) * g.ry * 1.6); c.S(p.x * 1.01, p.y, p.z * 1.01, 0.07, 0.03, '#ffe66d', { rot: [0, p.yaw, 0], m: 'glow' }); } } }),
    F('angel', 'Ange-dragon', '😇', 'l20', { wings: 'angel', tail: 'dragon_s', pal: { body: '#fff1f2', belly: '#ffffff', accent: '#ffd166' }, extra: (c, g) => c.T(0, g.by + g.ry + 0.34, 0, 0.3, 0.045, '#ffe066', { m: 'glow', rot: [0.12, 0, 0] }) }),
    F('devil', 'Petit diable', '😈', 'l22', { wings: 'bat', horns: 'devil', tail: 'arrow', pal: { body: '#d62839', belly: '#ff758f', accent: '#590d22' } }),
    F('phoenix', 'Phénix', '🦅', 'l25', { wings: 'fire', horns: 'nub', tail: 'flame', spikes: 'fins', fin: 'shiny', pal: { body: '#ff7b00', belly: '#ffe066', accent: '#ff3d00' } }),
    F('cosmic', 'Dragon cosmique', '💫', 'l30', { wings: 'fire', horns: 'horns', tail: 'flame', spikes: 'crystal', fin: 'glow', pal: { body: '#7209b7', belly: '#f72585', accent: '#4cc9f0' } }),
    F('unicorn', 'Licorne-dragon', '🦄', 'b:streak7', { wings: 'fairy', horns: 'unicorn', tail: 'fluffy', pal: { body: '#ffd6e8', belly: '#ffffff', accent: '#c77dff' }, extra: (c, g) => { [['#ff6b6b', 0], ['#ffd93d', 1], ['#6bcB77', 2], ['#4d96ff', 3], ['#c77dff', 4]].forEach(([col, k]) => c.E(-0.12 + k * 0.01, g.by + g.ry * 0.78 - k * 0.19, -g.rz * 0.8 + k * 0.02, 0.17, 0.12, 0.1, col, { m: 'soft' })); } }),
    F('cat', 'Chat-dragon', '🐱', 'b:perfect', { horns: 'catears', tail: 'cat', pal: { body: '#f4a261', belly: '#fff3e0', accent: '#e76f51' }, extra: (c, g) => { for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) c.Y(s * 0.5, g.by - 0.05 + k * 0.06, surf(g, 0.5, g.by) + 0.01, 0.008, 0.38, '#5c4033', { rot: [0, 0, PI / 2 + k * 0.18] }); } }),
    F('robot', 'Dragon robot', '🤖', 'b:q500', { wings: 'mech', horns: 'antenna', tail: 'robot', spikes: 'none', fin: 'metal', pal: { body: '#adb5bd', belly: '#dee2e6', accent: '#00b4d8' } }),
    F('ghost', 'Dragon fantôme', '👻', 'b:perfect5', { feet: 0, tail: 'wisp', fin: 'ghost', noBelly: 1, pal: { body: '#e8eaf6', belly: '#ffffff', accent: '#9fa8da' } }),
    F('dino', 'Dino-dragon', '🦖', 'b:verbs20', { tail: 'dino', spikes: 'plates', pal: { body: '#80b918', belly: '#d9ed92', accent: '#2b9348' } }),
    F('bee', 'Abeille-dragon', '🐝', 'b:combo10', { wings: 'fairy', horns: 'antenna', tail: 'stinger', pal: { body: '#ffd23f', belly: '#fff3b0', accent: '#2b2d42' }, extra: (c, g) => { [-0.35, 0, 0.35].forEach((dy) => { const s = Math.sqrt(1 - (dy / g.ry) ** 2); c.T(0, g.by + dy, 0, g.rx * s + 0.012, 0.035, '#2b2d42', { Rz: g.rz * s + 0.012, det: 1.2 }); }); } }),
    F('mushroom', 'Champi-dragon', '🍄', 'b:fixer', { tail: 'dragon_s', pal: { body: '#fff1d6', belly: '#ffffff', accent: '#e63946' }, extra: (c, g) => { c.E(0, g.by + g.ry * 0.82, 0, g.rx * 1.12, g.ry * 0.45, g.rz * 1.12, '#e63946', {}); [[0, 0.45], [0.55, 0.3], [-0.55, 0.25], [0.3, -0.3], [-0.3, -0.35]].forEach(([x, z]) => c.E(x * g.rx, g.by + g.ry * 0.82 + 0.38 * Math.sqrt(Math.max(0.05, 1 - (x * x + z * z))) , z * g.rz, 0.13, 0.05, 0.13, '#ffffff', {})); } }),
    F('cloud', 'Nuage-dragon', '☁️', 'b:stars25', { feet: 0, noBelly: 1, tail: 'none', fin: 'soft', pal: { body: '#f1f5ff', belly: '#ffffff', accent: '#a5c8ff' }, extra: (c, g) => { [[-0.8, 0.2, 0.2, 0.34], [0.8, 0.2, 0.2, 0.34], [-0.55, -0.45, 0.15, 0.3], [0.55, -0.45, 0.15, 0.3], [0, -0.6, 0.25, 0.32]].forEach(([x, dy, z, r]) => c.E(x, g.by + dy, z * 0.4, r, r, r, '#ffffff', { m: 'soft' })); } }),
    F('snowman', 'Bonhomme de neige', '⛄', 150, { feet: 0, noBelly: 1, pal: { body: '#ffffff', belly: '#f1f5ff', accent: '#ff7b00' }, extra: (c, g) => { c.C(0, g.by + 0.02, surf(g, 0, g.by + 0.02) - 0.02, 0.07, 0.4, '#ff7b00', { rot: [PI / 2, 0, 0] }); [-0.3, -0.55, -0.8].forEach((dy) => c.E(0, g.by + dy * g.ry, surf(g, 0, g.by + dy * g.ry) + 0.01, 0.06, 0.06, 0.04, '#2b2d42', {})); } }),
    F('bunny', 'Lapin-dragon', '🐰', 150, { horns: 'bunny', tail: 'fluffy', fin: 'soft', pal: { body: '#fde2e4', belly: '#ffffff', accent: '#ffb3c6' } }),
    F('bear', 'Ours-dragon', '🐻', 150, { horns: 'bear', tail: 'fluffy', fin: 'soft', pal: { body: '#a47148', belly: '#e9d8c4', accent: '#7f5539' } }),
    F('rainbow', 'Dragon arc-en-ciel', '🌈', 'b:trophies50', { wings: 'fairy', horns: 'horns', tail: 'dragon', spikes: 'back', fin: 'shiny', pal: { body: 'rainbow', belly: 'rainbow', accent: 'rainbow' } }),
    F('golden', 'Dragon doré', '👑', 'b:streak30', { wings: 'dragon', horns: 'horns', tail: 'dragon', spikes: 'back', fin: 'metal', pal: { body: '#ffd700', belly: '#fff3b0', accent: '#b8860b' } }),
    F('fox', 'Renard-dragon', '🦊', 100, { horns: 'catears', tail: 'fluffy', pal: { body: '#f08a24', belly: '#fff3e0', accent: '#7f3b08' }, extra: (c, g) => { for (const s of [-1, 1]) c.E(s * 0.62, g.eyeY - 0.26, surf(g, s * 0.62, g.eyeY - 0.26) - 0.03, 0.2, 0.12, 0.1, '#ffffff', { rot: [0, 0, -s * 0.4], m: 'soft' }); } }),
    F('panda', 'Panda-dragon', '🐼', 110, { horns: 'bear', tail: 'fluffy', fin: 'soft', pal: { body: '#ffffff', belly: '#ffffff', accent: '#1d1d2b' }, extra: (c, g) => { for (const s of [-1, 1]) { const x = s * g.ex, y = g.eyeY; c.E(x, y, surf(g, x, y) - 0.03, 0.27, 0.32, 0.1, '#1d1d2b', { rot: [0, 0, s * 0.4], m: 'soft' }); c.E(s * 0.2, g.by + g.ry * 0.7, 0, 0.18, 0.18, 0.1, '#1d1d2b', {}); } } }),
    F('penguin', 'Pingouin-dragon', '🐧', 110, { wings: 'baby', pal: { body: '#27354a', belly: '#ffffff', accent: '#ff9f1c' }, extra: (c, g) => { c.C(0, g.eyeY - 0.17, surf(g, 0, g.eyeY - 0.17) + 0.02, 0.1, 0.24, '#ff9f1c', { rot: [PI / 2, 0, 0] }); } }),
    F('frog', 'Grenouille-dragon', '🐸', 100, { pal: { body: '#5fbf4a', belly: '#e9f7c8', accent: '#2f7d32' }, extra: (c, g) => { for (const s of [-1, 1]) c.E(s * g.ex, g.by + g.ry * 0.82, 0.05, 0.26, 0.2, 0.26, '#5fbf4a', {}); } }),
    F('owl', 'Hibou-dragon', '🦉', 120, { wings: 'baby', horns: 'catears', pal: { body: '#8d6e63', belly: '#f1e3d3', accent: '#5d4037' }, extra: (c, g) => { for (const s of [-1, 1]) c.E(s * g.ex, g.eyeY, surf(g, s * g.ex, g.eyeY) - 0.05, 0.3, 0.3, 0.1, '#f1e3d3', { m: 'soft' }); c.C(0, g.eyeY - 0.12, surf(g, 0, g.eyeY - 0.12) + 0.03, 0.08, 0.2, '#ffb703', { rot: [PI / 2, 0, 0] }); } }),
    F('alien', 'Extra-terrestre', '👽', 130, { horns: 'antenna', pal: { body: '#9be15d', belly: '#d9f99d', accent: '#365314' } }),
    F('pumpkin', 'Citrouille-dragon', '🎃', 120, { noBelly: 1, tail: 'dragon_s', pal: { body: '#f77f00', belly: '#f77f00', accent: '#386641' }, extra: (c, g) => { c.Y(0, g.by + g.ry - 0.05, 0, 0.09, 0.3, '#386641', { rot: [0, 0, 0.2] }); [-0.55, -0.25, 0.25, 0.55].forEach((x) => { const s = Math.sqrt(1 - x * x); c.T(0, g.by, 0, g.rx * s + 0.01, 0.02, '#c85f00', { Rz: g.rz * s + 0.01, rot: [0, 0, 0], det: 1 }); }); } }),
    F('vampire', 'Dragon vampire', '🧛', 140, { wings: 'bat', tail: 'arrow', pal: { body: '#e8dfe8', belly: '#ffffff', accent: '#5a0f2e' }, extra: (c, g) => { for (const s of [-1, 1]) c.C(s * 0.1, g.by - 0.1 * (g.ry / 0.85) - 0.03, surf(g, s * 0.1, g.by - 0.1) + 0.09, 0.03, 0.12, '#ffffff', { rot: [PI, 0, 0] }); } }),
    F('knight', 'Dragon chevalier', '🛡️', 150, { horns: 'horns_s', spikes: 'plates', tail: 'dragon', fin: 'metal', pal: { body: '#9aa5b1', belly: '#dfe7ef', accent: '#e63946' } }),
    F('pirate', 'Dragon pirate', '🏴‍☠️', 130, { tail: 'dragon_s', pal: { body: '#4a7fb5', belly: '#d6e6f5', accent: '#c1121f' }, extra: (c, g) => { c.T(0, g.by + g.ry * 0.5, 0, g.rx * 0.87 + 0.02, 0.07, '#c1121f', { Rz: g.rz * 0.87 + 0.02, m: 'soft' }); c.E(-g.ex, g.eyeY, surf(g, -g.ex, g.eyeY) + 0.15, 0.24, 0.22, 0.04, '#15151f', {}); } }),
    F('lion', 'Lion-dragon', '🦁', 140, { tail: 'cat', horns: 'bear', pal: { body: '#f2b84b', belly: '#fff0c9', accent: '#a0522d' }, extra: (c, g) => { for (let k = 0; k < 12; k++) { const a = (k / 12) * PI * 2; c.E(Math.sin(a) * g.rx * 0.98, g.by + Math.cos(a) * g.ry * 0.98, -0.1, 0.28, 0.28, 0.3, '#a0522d', { m: 'soft', det: 0.6 }); } } }),
    F('sea', 'Dragon des mers', '🌊', 'l22', { wings: 'fairy', tail: 'fish', fin: 'jelly', spikes: 'fins', pal: { body: '#3ac1d8', belly: '#d8f6ff', accent: '#0077b6' } }),
    F('golem', 'Golem de roche', '⛰️', 160, { horns: 'nub', spikes: 'plates', tail: 'dino', pal: { body: '#8d8d8d', belly: '#b5b5b5', accent: '#5c5c5c' }, extra: (c, g) => { [[0.6, 0.3], [-0.9, -0.2], [2.3, 0.2]].forEach(([az, dy]) => { const p = onBody(g, az, dy * g.ry); c.E(p.x, p.y, p.z, 0.16, 0.12, 0.08, '#6b8f4e', { rot: [0, p.yaw, 0], m: 'soft' }); }); } }),
    F('thunder', 'Dragon éclair', '⚡', 150, { wings: 'fire', horns: 'horns', tail: 'arrow', spikes: 'crystal', fin: 'shiny', pal: { body: '#ffd60a', belly: '#fff3b0', accent: '#3a0ca3' } }),
    F('shadow', 'Dragon des ombres', '🌑', 170, { wings: 'bat', horns: 'devil', tail: 'dragon', fin: 'ghost', pal: { body: '#2b2d42', belly: '#4a4e69', accent: '#8d99ae' } }),
  ];

  /* ---------- visages ---------- */
  const EYES = [
    ['round', 'Ronds', '👀', 0], ['dots', 'Petits points', '⚫', 0], ['happy', 'Contents', '😊', 0], ['sleepy', 'Endormis', '😴', 0], ['shine', 'Brillants', '🥺', 10],
    ['cool', 'Cool', '😎', 15], ['wink', 'Clin d\'œil', '😉', 10], ['cat', 'Yeux de chat', '😼', 15], ['star', 'Étoiles', '🤩', 25], ['heart', 'Cœurs', '😍', 25], ['sparkle', 'Étincelles', '✨', 20],
  ].map(([id, name, emoji, lock]) => ({ id, name, emoji, lock }));
  const MOUTHS = [
    ['smile', 'Sourire', '🙂', 0], ['open', 'Grand rire', '😃', 0], ['flat', 'Neutre', '😐', 0], ['o', 'Surpris', '😮', 0], ['grin', 'Dents', '😁', 10],
    ['tongue', 'Langue', '😛', 10], ['smirk', 'En coin', '😏', 10], ['cat', 'Moustache de chat', '😺', 15],
  ].map(([id, name, emoji, lock]) => ({ id, name, emoji, lock }));
  const PATTERNS = [
    ['none', 'Uni', '⬜', 0], ['spots', 'Taches', '🐆', 20], ['stripes', 'Rayures', '🦓', 20], ['stars', 'Étoiles', '⭐', 30], ['sparkles', 'Étincelles', '✨', 30], ['freckles', 'Taches de rousseur', '🟤', 15],
  ].map(([id, name, emoji, lock]) => ({ id, name, emoji, lock }));
  const FINISHES = [
    ['auto', 'Naturelle', '🎯', 0], ['matte', 'Mate', '🧱', 0], ['soft', 'Peluche', '🧸', 20], ['shiny', 'Brillante', '💎', 30], ['metal', 'Métal', '🔩', 60],
    ['jelly', 'Gelée', '🍮', 60], ['ghost', 'Fantôme', '👻', 'l12'], ['glow', 'Lumineuse', '💡', 'l16'], ['glass', 'Cristal', '🔮', 'l20'],
  ].map(([id, name, emoji, lock]) => ({ id, name, emoji, lock }));
  const POSES = [
    ['idle', 'Tranquille', '🙂', 0], ['wave', 'Salut', '👋', 0], ['cheer', 'Hourra', '🙌', 0], ['think', 'Je réfléchis', '🤔', 0], ['sleep', 'Dodo', '😴', 0],
    ['jump', 'Saut', '🦘', 10], ['dance', 'Danse', '💃', 20], ['hero', 'Super-héros', '🦸', 40], ['spin', 'Tourbillon', '🌀', 30],
  ].map(([id, name, emoji, lock]) => ({ id, name, emoji, lock }));

  function eyesB(c, g, style, P) {
    const ey = g.eyeY, ex = g.ex, dark = '#2b2d42', iris = P.eye;
    c.with({ j: 'eyes', m: 'matte' }, () => {
      for (const s of [-1, 1]) {
        const x = s * ex, z = surf(g, x, ey);
        const white = (col = '#ffffff') => c.E(x, ey, z, 0.19, 0.23, 0.12, col);
        const pupil = (dx = 0, dy = 0, r = 1, col = iris) => { c.E(x + dx, ey + dy, z + 0.085, 0.1 * r, 0.13 * r, 0.06, col); c.E(x + dx, ey + dy, z + 0.12, 0.062 * r, 0.085 * r, 0.04, dark); c.E(x + dx + 0.04 * r, ey + dy + 0.06, z + 0.15, 0.03, 0.03, 0.02, '#ffffff'); };
        if (style === 'round') { white(); pupil(); }
        else if (style === 'dots') c.E(x, ey, z + 0.02, 0.1, 0.12, 0.08, dark);
        else if (style === 'shine') { white(); pupil(0, 0, 1.35); c.E(x - 0.04, ey - 0.06, z + 0.16, 0.025, 0.025, 0.02, '#ffffff'); }
        else if (style === 'cat') { white('#ffe66d'); c.E(x, ey, z + 0.1, 0.035, 0.18, 0.04, dark); }
        else if (style === 'cool') { white(); pupil(0, -0.03); c.E(x, ey + 0.1, z + 0.04, 0.215, 0.12, 0.13, P.body); }
        else if (style === 'sleepy') c.beads([-0.12, -0.04, 0.04, 0.12].map((u) => [x + u, ey - 0.04 + 0.02 * Math.abs(u) / 0.12, z + 0.05]), 0.028, dark);
        else if (style === 'happy') c.beads([-0.14, -0.07, 0, 0.07, 0.14].map((u) => [x + u, ey - 0.02 + 0.1 * (1 - (u / 0.14) ** 2) * 0.9, z + 0.06]), 0.03, dark);
        else if (style === 'wink') { if (s < 0) { white(); pupil(); } else c.beads([-0.12, -0.06, 0, 0.06, 0.12].map((u) => [x + u, ey - 0.02 + 0.08 * (1 - (u / 0.12) ** 2), z + 0.06]), 0.03, dark); }
        else if (style === 'star') c.S(x, ey, z + 0.1, 0.22, 0.06, '#ffd23f', { m: 'glow' });
        else if (style === 'heart') { c.E(x - 0.07, ey + 0.05, z + 0.08, 0.1, 0.1, 0.06, '#ff4d6d', { m: 'shiny' }); c.E(x + 0.07, ey + 0.05, z + 0.08, 0.1, 0.1, 0.06, '#ff4d6d', { m: 'shiny' }); c.C(x, ey + 0.08, z + 0.08, 0.17, 0.2, '#ff4d6d', { rot: [PI, 0, 0], m: 'shiny' }); }
        else if (style === 'sparkle') { white(); pupil(0, 0, 1.15); c.S(x + 0.03, ey + 0.09, z + 0.17, 0.07, 0.02, '#ffffff', { pts: 4, m: 'glow' }); }
      }
    });
  }
  function mouthB(c, g, style, P) {
    const my = g.by - 0.1 * (g.ry / 0.85), dark = '#4a2c2a', zz = (x, y) => surf(g, x, y) + (g.noBelly ? 0.015 : 0.075);
    const arc = (w, depth, sign, n = 11, x0 = 0) => c.beads(Array.from({ length: n }, (_, k) => { const u = (k / (n - 1)) * 2 - 1; const x = x0 + u * w, y = my + sign * depth * (1 - u * u) * -1; return [x, y, zz(x, y)]; }), 0.032, dark);
    c.with({ j: 'root', m: 'matte' }, () => {
      if (style === 'smile') arc(0.22, 0.09, 1);
      else if (style === 'smirk') c.beads(Array.from({ length: 6 }, (_, k) => { const x = -0.12 + k * 0.07; const y = my - 0.0 + (k > 3 ? 0.03 * (k - 3) : 0) - 0.02 * Math.sin(k); return [x, y, zz(x, y)]; }), 0.032, dark);
      else if (style === 'flat') c.beads(Array.from({ length: 5 }, (_, k) => { const x = -0.1 + k * 0.05; return [x, my - 0.03, zz(x, my - 0.03)]; }), 0.032, dark);
      else if (style === 'o') { c.E(0, my - 0.03, zz(0, my) , 0.07, 0.09, 0.05, '#7a1f3d'); }
      else if (style === 'open') { c.E(0, my - 0.05, zz(0, my - 0.05) - 0.03, 0.2, 0.15, 0.08, '#7a1f3d'); c.E(0, my - 0.12, zz(0, my - 0.12), 0.1, 0.05, 0.05, '#ff7b9c'); }
      else if (style === 'grin') { c.E(0, my - 0.03, zz(0, my) - 0.03, 0.24, 0.1, 0.07, '#7a1f3d'); c.E(0, my + 0.02, zz(0, my) + 0.0, 0.2, 0.04, 0.05, '#ffffff'); }
      else if (style === 'tongue') { arc(0.2, 0.08, 1); c.E(0.05, my - 0.12, zz(0.05, my - 0.12), 0.07, 0.09, 0.04, '#ff6f91'); }
      else if (style === 'cat') { arc(0.11, 0.06, 1, 5, -0.11); arc(0.11, 0.06, 1, 5, 0.11); c.E(0, my + 0.07, zz(0, my + 0.07), 0.05, 0.035, 0.03, '#ff8fa3'); }
    });
  }
  function cheeksB(c, g) {
    for (const s of [-1, 1]) { const x = s * g.ex * 1.6, y = g.eyeY - 0.12; c.E(x, y, surf(g, x, y) - 0.01, 0.1, 0.065, 0.05, '#ff8fa3', { m: 'soft' }); }
  }
  function patternB(c, g, id, P) {
    if (!id || id === 'none') return;
    const col = P.accent;
    const opt = (yaw) => ({ rot: [0, yaw, 0] });
    if (id === 'spots') [[0.3, 0.1], [1.0, -0.3], [-0.8, -0.2], [-1.6, 0.25], [2.1, 0.3], [2.9, -0.2], [-2.4, 0.1], [0.6, -0.55], [-0.3, 0.45]].forEach(([az, dy]) => { const p = onBody(g, az, dy * g.ry); c.E(p.x, p.y, p.z, 0.11, 0.11, 0.04, col, { rot: [0, p.yaw, 0] }); });
    else if (id === 'stripes') [-0.45, -0.15, 0.15, 0.45].forEach((dy) => { const s = Math.sqrt(1 - dy * dy); c.T(0, g.by + dy * g.ry, 0, g.rx * s + 0.01, 0.028, col, { Rz: g.rz * s + 0.01, det: 1.2 }); });
    else if (id === 'stars') [[0.35, 0.35], [-0.6, -0.1], [0.9, -0.4], [-1.5, 0.3], [2.2, 0.25], [3.1, -0.3], [-2.4, -0.2]].forEach(([az, dy]) => { const p = onBody(g, az, dy * g.ry); c.S(p.x, p.y, p.z, 0.12, 0.03, col, opt(p.yaw)); });
    else if (id === 'sparkles') [[0.4, 0.4], [-0.7, 0.05], [1.0, -0.35], [-1.6, 0.35], [2.2, 0.2], [3.0, -0.2]].forEach(([az, dy]) => { const p = onBody(g, az, dy * g.ry); c.S(p.x, p.y, p.z, 0.13, 0.03, col, { pts: 4, rot: [0, p.yaw, 0] }); });
    else if (id === 'freckles') for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const x = s * (g.ex * 1.35 + k * 0.07), y = g.eyeY - 0.14 + (k % 2) * 0.05; c.E(x, y, surf(g, x, y) + 0.005, 0.022, 0.022, 0.02, darker(P.body, 0.35)); }
  }

  /* ---------- décors ---------- */
  const SC = (id, name, emoji, lock, bg, b, o) => Object.assign({ id, name, emoji, lock, bg, b }, o);
  const floor = (c, col, r = 2.7) => c.Y(0, -0.16, 0, r, 0.16, col, { det: 1.6 });
  const tree = (c, x, z, s = 1, col = '#2d6a4f') => { c.Y(x, 0, z, 0.1 * s, 0.5 * s, '#7f5539', {}); [0, 1, 2].forEach((k) => c.C(x, 0.4 * s + k * 0.38 * s, z, (0.52 - k * 0.12) * s, 0.7 * s, k % 2 ? lighter(col, 0.1) : col, {})); };
  const SCENES = [
    SC('sky', 'Ciel', '☁️', 0, { top: '#cfeeff', bottom: '#fff7e6', deco: 'clouds' }, (c) => c.E(0, -0.05, 0, 1.9, 0.14, 1.9, '#ffffff', { m: 'soft', det: 1.8 })),
    SC('meadow', 'Prairie', '🌼', 15, { top: '#bfe9ff', bottom: '#e6ffd9', deco: 'clouds' }, (c) => { floor(c, '#7ccf6b'); tree(c, -1.7, -1.4); tree(c, 1.9, -1.2, 0.8); for (let k = 0; k < 10; k++) { const a = k * 0.63, r = 1.5 + (k % 3) * 0.3; c.Y(Math.cos(a) * r, 0, Math.sin(a) * r, 0.02, 0.2, '#3a9b4f', {}); c.E(Math.cos(a) * r, 0.24, Math.sin(a) * r, 0.1, 0.1, 0.1, ['#ff6b9d', '#ffd23f', '#ffffff', '#c77dff'][k % 4], {}); } }),
    SC('forest', 'Forêt', '🌲', 25, { top: '#a8e6a1', bottom: '#2d6a4f', deco: 'petals', dc: '#d8f3dc' }, (c) => { floor(c, '#4f9d58'); [[-1.8, -1.2, 1.3], [1.8, -1.5, 1.5], [-0.6, -2.2, 1.6], [2.6, 0.2, 1.1], [-2.6, 0.4, 1.2]].forEach(([x, z, s]) => tree(c, x, z, s)); c.Y(1.2, 0, 1.2, 0.05, 0.22, '#f1e3d3', {}); c.E(1.2, 0.26, 1.2, 0.2, 0.12, 0.2, '#e63946', {}); }),
    SC('ocean', 'Île', '🏝️', 25, { top: '#b6f0ff', bottom: '#2a9fd6', deco: 'bubbles' }, (c) => { c.Y(0, -0.16, 0, 3.2, 0.1, '#2a9fd6', { m: 'jelly', det: 1.6 }); c.Y(0, -0.1, 0, 2.2, 0.12, '#f4e2a8', { det: 1.6 }); c.Y(-1.5, 0, -1.2, 0.08, 1.5, '#8d6e63', { rot: [0.1, 0, 0.2] }); [0, 1, 2, 3, 4].forEach((k) => c.E(-1.3 + Math.cos(k * 1.25) * 0.55, 1.45 + Math.sin(k * 1.25) * 0.1, -1.1 + Math.sin(k * 1.25) * 0.55, 0.6, 0.06, 0.16, '#2e9d4f', { rot: [0, -k * 1.25, 0.25] })); }),
    SC('space', 'Espace', '🚀', 40, { top: '#0b0b2b', bottom: '#3a2f7a', deco: 'stars' }, (c) => { c.E(0, -0.12, 0, 2.2, 0.25, 2.2, '#7d8597', { m: 'matte' }); c.E(1.2, -0.05, 0.9, 0.35, 0.1, 0.3, '#5c677d', {}); c.E(-2.4, 2.6, -3, 0.9, 0.9, 0.9, '#ff9f68', { m: 'shiny' }); c.T(-2.4, 2.6, -3, 1.5, 0.06, '#ffd6a5', { rot: [0.5, 0, 0.3] }); c.E(2.6, 3.2, -3, 0.45, 0.45, 0.45, '#8ecae6', {}); }, { noShadow: 0 }),
    SC('candy', 'Bonbons', '🍭', 40, { top: '#ffe0f0', bottom: '#d9c2ff', deco: 'dots', dc: '#ff9ecf' }, (c) => { floor(c, '#ffb3d9'); [[-1.7, -1], [1.8, -1.3], [-2.4, 0.5]].forEach(([x, z], k) => { c.Y(x, 0, z, 0.05, 1.1, '#fff', {}); c.E(x, 1.25, z, 0.38, 0.38, 0.12, ['#ff6b9d', '#4cc9f0', '#ffd23f'][k], { rot: [0, 0.4, 0] }); }); for (let k = 0; k < 6; k++) c.E(Math.cos(k * 1.1) * 2.1, 0.08, Math.sin(k * 1.1) * 2.1 - 0.4, 0.14, 0.1, 0.14, ['#ff6b9d', '#4cc9f0', '#ffd23f', '#9b5de5'][k % 4], { m: 'shiny' }); }),
    SC('castle', 'Château', '🏰', 50, { top: '#bde0fe', bottom: '#ffe5ec', deco: 'clouds' }, (c) => { floor(c, '#9fd37c'); [[-1.6, -2.2], [1.6, -2.2]].forEach(([x, z]) => { c.Y(x, 0, z, 0.45, 1.6, '#cbd5e1', {}); c.C(x, 1.6, z, 0.55, 0.8, '#e63946', {}); }); c.B(0, 0.6, -2.4, 2.6, 1.2, 0.5, '#d9e2ec', {}); c.B(0, 0.4, -2.1, 0.6, 0.8, 0.1, '#7f5539', {}); }),
    SC('volcano', 'Volcan', '🌋', 50, { top: '#ffb26b', bottom: '#4a1d1d', deco: 'sparks' }, (c) => { floor(c, '#3b2f2f'); c.F(0, 0, -2.4, 1.9, 0.5, 2.1, '#5c4033', {}); c.E(0, 2.1, -2.4, 0.55, 0.1, 0.55, '#ff6b1a', { m: 'glow' }); c.E(1.6, 0.0, 0.6, 0.45, 0.28, 0.45, '#ff9f1c', { m: 'glow' }); }),
    SC('desert', 'Désert', '🏜️', 40, { top: '#ffe8a3', bottom: '#f4a261', deco: 'none' }, (c) => { floor(c, '#f2cc8f'); c.E(-2, -0.1, -2, 1.6, 0.6, 1.2, '#e9b872', {}); c.E(2.2, -0.1, -1.6, 1.4, 0.5, 1.0, '#eec07b', {}); c.Y(1.8, 0, 0.6, 0.14, 0.9, '#2d9a4f', {}); c.Y(2.0, 0.4, 0.6, 0.08, 0.35, '#2d9a4f', { rot: [0, 0, -1.2] }); c.E(-1, 3.2, -3, 0.7, 0.7, 0.7, '#ffd23f', { m: 'glow' }); }),
    SC('snow', 'Neige', '⛄', 40, { top: '#e0f2ff', bottom: '#b8d8f0', deco: 'snow' }, (c) => { floor(c, '#ffffff'); c.E(-1.8, 0.1, -1.4, 0.9, 0.7, 0.9, '#f1f5ff', {}); c.Y(-1.8, 0, -0.5, 0.2, 0.3, '#cdd9e6', { rot: [-PI / 2, 0, 0] }); tree(c, 1.8, -1.2, 1, '#2f6f5e'); tree(c, 2.5, 0.3, 0.8, '#2f6f5e'); }),
    SC('night', 'Nuit étoilée', '🌙', 40, { top: '#0b132b', bottom: '#3a506b', deco: 'stars' }, (c) => { floor(c, '#1c2541'); c.E(2.2, 3.1, -3, 0.9, 0.9, 0.9, '#fff3c4', { m: 'glow' }); tree(c, -2, -1.2, 1.1, '#1b4332'); c.E(-1.2, 0.5, 1.4, 0.07, 0.07, 0.07, '#ffe66d', { m: 'glow', an: (t, ph) => [Math.sin(t + ph) * 0.4, Math.sin(t * 1.3 + ph) * 0.2, Math.cos(t + ph) * 0.4] }); }),
    SC('beach', 'Plage', '🏖️', 30, { top: '#aee6ff', bottom: '#fff1c1', deco: 'clouds' }, (c) => { floor(c, '#f6e0a6'); c.Y(-1.6, 0, -1, 0.04, 1.5, '#8d6e63', { rot: [0, 0, 0.1] }); c.C(-1.65, 1.25, -1, 1.0, 0.45, '#ff6b6b', { rot: [0, 0, 0.1] }); c.E(1.5, 0.22, 0.9, 0.24, 0.24, 0.24, '#4cc9f0', { m: 'shiny' }); c.E(0, -0.1, -3, 4, 0.1, 1, '#4cc9f0', { m: 'jelly' }); }),
    SC('jungle', 'Jungle', '🦜', 50, { top: '#c7f464', bottom: '#2d6a4f', deco: 'petals', dc: '#ffd23f' }, (c) => { floor(c, '#3d8f4f'); [[-2, -1.2], [2, -1.6], [-1, -2.4], [0.8, -2.6]].forEach(([x, z], k) => { c.Y(x, 0, z, 0.12, 1.8 + k * 0.2, '#6d4c41', {}); for (let i = 0; i < 4; i++) c.E(x + Math.cos(i * 1.6) * 0.5, 1.8 + k * 0.2, z + Math.sin(i * 1.6) * 0.5, 0.6, 0.06, 0.2, '#2e9d4f', { rot: [0, -i * 1.6, 0.3] }); }); }),
    SC('city', 'Ville', '🌆', 60, { top: '#ff9e7d', bottom: '#3d348b', deco: 'stars' }, (c) => { floor(c, '#4a4e69'); [[-2.2, -2.2, 0.9, 2.4], [-1, -2.6, 0.8, 3.2], [0.3, -2.4, 1, 2], [1.6, -2.7, 0.9, 3.6], [2.7, -2.1, 0.8, 2.6]].forEach(([x, z, w, h], k) => { c.B(x, h / 2, z, w, h, 0.9, ['#6c757d', '#495057', '#7d8597', '#5c677d'][k % 4], {}); for (let r = 0; r < Math.floor(h * 1.5); r++) c.B(x, 0.35 + r * 0.55, z + 0.46, 0.5, 0.18, 0.02, '#ffe66d', { m: 'glow' }); }); }),
    SC('stage', 'Scène', '🎤', 60, { top: '#1a1033', bottom: '#5a189a', deco: 'rays', dc: '#ffd6ff' }, (c) => { c.Y(0, -0.16, 0, 2.7, 0.16, '#c9184a', { det: 1.6 }); c.B(-2.8, 1.5, -1.5, 0.6, 3, 0.3, '#9d0208', {}); c.B(2.8, 1.5, -1.5, 0.6, 3, 0.3, '#9d0208', {}); c.B(0, 1.5, -2.6, 5.6, 3, 0.2, '#240046', {}); }),
    SC('podium', 'Podium', '🥇', 80, { top: '#fff1b8', bottom: '#ffb703', deco: 'sparks', dc: '#fff' }, (c) => { c.B(0, -0.4, 0, 2.2, 0.8, 1.7, '#ffd700', { m: 'metal' }); c.B(-2.1, -0.55, 0, 1.6, 0.5, 1.4, '#c0c8d4', { m: 'metal' }); c.B(2.1, -0.65, 0, 1.6, 0.3, 1.4, '#cd7f32', { m: 'metal' }); c.S(-2.1, 0.5, 0.3, 0.3, 0.06, '#c0c8d4', {}); c.S(2.1, 0.3, 0.3, 0.3, 0.06, '#cd7f32', {}); }, { noShadow: 1 }),
  ];

  /* ---------- registre ---------- */
  const ITEMS = { form: FORMS, color: COLORS, eyeColor: EYE_COLORS, eyes: EYES, mouth: MOUTHS, pat: PATTERNS, fin: FINISHES, pose: POSES, scene: SCENES, hat: [], glasses: [], neck: [], back: [], hand: [], feet: [], aura: [] };
  const find = (slot, id) => (ITEMS[slot] || []).find((x) => x.id === id) || null;
  const itemId = (slot, id) => `av:${slot}:${id}`;

  const defaults = () => ({ form: 'auto', col: { body: '', belly: '', accent: '' }, eye: '#2b2d42', fin: 'auto', pat: 'none', eyes: 'round', mouth: 'smile', hat: '', glasses: '', neck: '', back: '', hand: '', feet: '', aura: '', scene: 'sky', pose: 'idle', outfits: [null, null, null], home: false });
  /** Rend toujours une configuration complète et valide, même si elle vient d'une ancienne version ou d'un autre appareil. */
  function sanitize(cfg) {
    const d = defaults(), c = Object.assign(d, cfg && typeof cfg === 'object' ? cfg : {});
    c.col = Object.assign({ body: '', belly: '', accent: '' }, c.col || {});
    if (c.form !== 'auto' && !find('form', c.form)) c.form = 'auto';
    for (const [k, slot, def] of [['eyes', 'eyes', 'round'], ['mouth', 'mouth', 'smile'], ['pat', 'pat', 'none'], ['fin', 'fin', 'auto'], ['pose', 'pose', 'idle'], ['scene', 'scene', 'sky']]) if (!find(slot, c[k])) c[k] = def;
    for (const k of ['hat', 'glasses', 'neck', 'back', 'hand', 'feet', 'aura']) if (c[k] && !find(k, c[k])) c[k] = '';
    if (!Array.isArray(c.outfits)) c.outfits = [null, null, null];
    c.outfits = [0, 1, 2].map((i) => (c.outfits[i] && typeof c.outfits[i] === 'object' ? c.outfits[i] : null));
    c.home = !!c.home;
    return c;
  }
  const OUTFIT_KEYS = ['form', 'col', 'eye', 'fin', 'pat', 'eyes', 'mouth', 'hat', 'glasses', 'neck', 'back', 'hand', 'feet', 'aura', 'scene', 'pose'];
  const outfitOf = (cfg) => JSON.parse(JSON.stringify(Object.fromEntries(OUTFIT_KEYS.map((k) => [k, cfg[k]]))));

  /** Prépare tout ce qu'il faut pour construire : forme choisie, palette, finition, accessoires, géométrie. */
  function resolve(cfgIn, opts) {
    opts = opts || {};
    const cfg = sanitize(cfgIn);
    let form = cfg.form === 'auto' ? FORMS.find((f) => f.stage === (opts.stage || 0)) : find('form', cfg.form);
    if (!form) form = FORMS[0];
    const fp = form.pal || {};
    const own = form.stage !== undefined ? null : fp; // les formes « spéciales » ont leurs propres couleurs
    const body = cfg.col.body || (own && own.body) || opts.color || '#7bd88f';
    const belly = cfg.col.belly || (own && own.belly) || (body === 'rainbow' ? 'rainbow' : lighter(body, 0.45));
    const accent = cfg.col.accent || (own && own.accent) || (body === 'rainbow' ? 'rainbow' : darker(body, 0.25));
    const [rx, ry, rz] = form.body, by = ry + 0.18;
    const g = { rx, ry, rz, by, ex: 0.34 * rx / 0.95, eyeY: by + 0.2 * ry / 0.85, top: by + ry, noBelly: !!form.noBelly };
    const items = {};
    for (const k of ['hat', 'glasses', 'neck', 'back', 'hand', 'feet', 'aura']) items[k] = cfg[k] ? find(k, cfg[k]) : null;
    const fin = cfg.fin !== 'auto' ? cfg.fin : form.fin || 'matte';
    const piv = {
      eyes: [0, g.eyeY, 0.8 * rz], armL: [-rx * 0.88, by + 0.1, 0.1], armR: [rx * 0.88, by + 0.1, 0.1], wingL: [-rx * 0.4, by + ry * 0.4, -rz * 0.6], wingR: [rx * 0.4, by + ry * 0.4, -rz * 0.6],
      tail: [0, by - 0.5, -rz + 0.1], aura: [0, by, 0], head: [0, g.top, 0], legL: [-0.4, 0.3, 0.3], legR: [0.4, 0.3, 0.3],
    };
    return { cfg, form, g, pal: { body, belly, accent, eye: cfg.eye }, fin, items, scene: find('scene', cfg.scene) || SCENES[0], piv, noWings: !!(items.back && items.back.rw) };
  }

  function buildAll(c, res) {
    const { g, form, pal, fin, items } = res;
    const rbOf = (k) => (pal[k] === 'rainbow' ? { body: 1, belly: 2, accent: 3 }[k] : 0);
    const hexOf = (k) => (pal[k] === 'rainbow' ? '#ff77aa' : pal[k]);
    const P = { body: hexOf('body'), belly: hexOf('belly'), accent: hexOf('accent'), eye: pal.eye };
    const rb = { body: rbOf('body'), belly: rbOf('belly'), accent: rbOf('accent') };
    // décor
    c.with({ j: 'scene', m: 'matte' }, () => res.scene.b(c, g));
    // corps (la finition s'applique à tout ce qui est « peau »)
    c.st.m = fin;
    c.st.j = 'root';
    const B = (e) => Object.assign({ rb: rb.body }, e);
    c.E(0, g.by, 0, g.rx, g.ry, g.rz, P.body, B({ det: 1.7 }));
    if (!form.noBelly) c.E(0, g.by - 0.52 * g.ry, surf(g, 0, g.by - 0.52 * g.ry) - 0.3, g.rx * 0.58, g.ry * 0.38, 0.36, P.belly, { rb: rb.belly, det: 1.2 });
    if (form.egg) { // taches et fissure de l'œuf
      [[0.4, 0.5], [-0.9, 0.2], [1.6, -0.1], [2.6, 0.45], [-2.2, 0.0], [3.3, 0.1]].forEach(([az, dy]) => { const p = onBody(g, az, dy * g.ry); c.E(p.x, p.y, p.z, 0.13, 0.13, 0.04, P.accent, { rot: [0, p.yaw, 0], rb: rb.accent }); });
    }
    if (form.feet) for (const s of [-1, 1]) c.E(s * 0.42 * g.rx / 0.95, 0.15, 0.3, 0.3, 0.16, 0.4, P.body, B({ det: 0.9 }));
    if (form.arms) for (const s of [-1, 1]) c.E(s * (g.rx + 0.03), g.by - 0.05, 0.12, 0.2, 0.34, 0.2, P.body, B({ j: s < 0 ? 'armL' : 'armR', rot: [0, 0, -s * 0.35], det: 0.9 }));
    // éléments de la forme : ils gardent la finition du corps pour rester cohérents
    if (form.extra) form.extra(c, g, P);
    if (!res.noWings) wingsB(c, g, form.wings, P);
    hornsB(c, g, form.horns, P); spikesB(c, g, form.spikes, P); tailB(c, g, form.tail, P);
    // visage
    c.with({ m: 'matte', j: 'root' }, () => {
      eyesB(c, g, res.cfg.eyes, P);
      mouthB(c, g, res.cfg.mouth, P);
      cheeksB(c, g);
      patternB(c, g, res.cfg.pat, P);
    });
    // accessoires
    c.with({ m: 'matte', j: 'root' }, () => {
      for (const k of ['back', 'neck', 'hat', 'glasses', 'hand', 'feet', 'aura']) {
        const it = items[k];
        if (it && it.b) c.with({ m: 'matte', j: k === 'aura' ? 'aura' : 'root' }, () => it.b(it.sc ? scaled(c, it.sc, it.pv ? it.pv(g) : [0, g.top, 0]) : c, g, P, res));
      }
    });
  }

  /** Pinceau qui agrandit tout ce qu'on dessine autour d'un point pv (utile pour ajuster la taille d'un chapeau ou d'un objet tenu). */
  function scaled(c, k, pv) {
    if (!k || k === 1) return c;
    const X = (x) => pv[0] + (x - pv[0]) * k, Y = (y) => pv[1] + (y - pv[1]) * k, Z = (z) => pv[2] + (z - pv[2]) * k;
    return Object.assign(Object.create(c), {
      E: (x, y, z, rx, ry, rz, col, o) => c.E(X(x), Y(y), Z(z), rx * k, ry * k, rz * k, col, o),
      C: (x, y, z, r, h, col, o) => c.C(X(x), Y(y), Z(z), r * k, h * k, col, o),
      Y: (x, y, z, r, h, col, o) => c.Y(X(x), Y(y), Z(z), r * k, h * k, col, o),
      F: (x, y, z, rb, rt, h, col, o) => c.F(X(x), Y(y), Z(z), rb * k, rt * k, h * k, col, o),
      B: (x, y, z, w, h, d, col, o) => c.B(X(x), Y(y), Z(z), w * k, h * k, d * k, col, o),
      T: (x, y, z, R, r, col, o) => c.T(X(x), Y(y), Z(z), R * k, r * k, col, Object.assign({}, o, o && o.Rz ? { Rz: o.Rz * k } : {})),
      S: (x, y, z, r, t, col, o) => c.S(X(x), Y(y), Z(z), r * k, t * k, col, o),
    });
  }

  /** Les éléments d'un onglet, avec leur état (libre / acheté / à gagner), pour l'interface. */
  const slotItems = (slot) => ITEMS[slot] || [];

  return { SLOTS, ITEMS, FORMS, SCENES, COLORS, EYE_COLORS, find, itemId, defaults, sanitize, outfitOf, resolve, buildAll, slotItems, scaled, surf, topAt, onBody, lighter, darker, wingsB, hornsB, tailB, spikesB };
});
