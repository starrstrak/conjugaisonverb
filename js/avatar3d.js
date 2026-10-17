/* Moteur 3D minimaliste pour l'avatar de Conjugo : aucune dépendance, tout est dessiné dans un <canvas>.
   Principe : l'avatar est une liste de formes simples (ellipsoïdes, cônes, tores…) transformées,
   éclairées puis triées de l'arrière vers l'avant (algorithme du peintre). Les pièces (formes, accessoires,
   décors…) vivent dans avatar-parts.js ; ce fichier ne contient que les maths, la construction et le rendu. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Avatar3D = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- maths (matrices 3×3 rangées dans un tableau de 9) ---------- */
  const PI = Math.PI, TAU = PI * 2;
  const rotM = (rx, ry, rz) => {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    return [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx];
  };
  const mul = (a, b) => {
    const r = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  };
  const app = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  const scaleM = (sx, sy, sz) => [sx, 0, 0, 0, sy, 0, 0, 0, sz];
  const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return l ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1]; };

  /* ---------- couleurs ---------- */
  const hex2rgb = (h) => { const n = parseInt(String(h).replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb2hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const shadeHex = (h, amt) => rgb2hex(mix(hex2rgb(h), amt > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(amt)));
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    const f = (n) => { const k = (n + h * 12) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }

  /* ---------- formes de base : sommets + polygones avec normale sortante ---------- */
  function addPoly(P, idx, ref, verts) {
    // normale = produit vectoriel des diagonales, orientée vers l'extérieur grâce au vecteur de référence
    const a = verts[idx[0]], b = verts[idx[Math.floor(idx.length / 3)]], c = verts[idx[Math.floor((2 * idx.length) / 3)]];
    let n = cross(sub3(b, a), sub3(c, a));
    if (idx.length === 4) n = cross(sub3(verts[idx[2]], verts[idx[0]]), sub3(verts[idx[3]], verts[idx[1]]));
    if (Math.hypot(n[0], n[1], n[2]) < 1e-9) return;
    n = norm(n);
    if (dot(n, ref) < 0) n = [-n[0], -n[1], -n[2]];
    P.push({ i: idx, n });
  }
  function sphere(rx, ry, rz, lat, lon) {
    const V = [], P = [];
    for (let i = 0; i <= lat; i++) {
      const ph = (PI * i) / lat, sp = Math.sin(ph), cp = Math.cos(ph);
      for (let j = 0; j < lon; j++) { const th = (TAU * j) / lon; V.push([rx * sp * Math.cos(th), ry * cp, rz * sp * Math.sin(th)]); }
    }
    for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
      const a = i * lon + j, b = i * lon + ((j + 1) % lon), c = (i + 1) * lon + ((j + 1) % lon), d = (i + 1) * lon + j;
      const cen = [(V[a][0] + V[b][0] + V[c][0] + V[d][0]) / 4, (V[a][1] + V[b][1] + V[c][1] + V[d][1]) / 4, (V[a][2] + V[b][2] + V[c][2] + V[d][2]) / 4];
      addPoly(P, i === 0 ? [a, c, d] : i === lat - 1 ? [a, b, d] : [a, b, c, d], [cen[0] / (rx * rx), cen[1] / (ry * ry), cen[2] / (rz * rz)], V);
    }
    return { V, P };
  }
  function frustum(rb, rt, h, lon) { // axe y, base en y = 0
    const V = [], P = [];
    for (let j = 0; j < lon; j++) { const th = (TAU * j) / lon; V.push([rb * Math.cos(th), 0, rb * Math.sin(th)]); }
    for (let j = 0; j < lon; j++) { const th = (TAU * j) / lon; V.push([rt * Math.cos(th), h, rt * Math.sin(th)]); }
    const slope = (rb - rt) / Math.max(h, 1e-6);
    for (let j = 0; j < lon; j++) {
      const j2 = (j + 1) % lon, th = (TAU * (j + 0.5)) / lon, ref = [Math.cos(th), slope, Math.sin(th)];
      addPoly(P, rt < 1e-6 ? [j, j2, lon + j] : [j, j2, lon + j2, lon + j], ref, V);
    }
    addPoly(P, Array.from({ length: lon }, (_, j) => j), [0, -1, 0], V);
    if (rt > 1e-6) addPoly(P, Array.from({ length: lon }, (_, j) => lon + j), [0, 1, 0], V);
    return { V, P };
  }
  function box(w, h, d) {
    const x = w / 2, y = h / 2, z = d / 2;
    const V = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], P = [];
    [[[0, 1, 2, 3], [0, 0, -1]], [[4, 5, 6, 7], [0, 0, 1]], [[0, 1, 5, 4], [0, -1, 0]], [[3, 2, 6, 7], [0, 1, 0]], [[0, 3, 7, 4], [-1, 0, 0]], [[1, 2, 6, 5], [1, 0, 0]]].forEach(([i, r]) => addPoly(P, i, r, V));
    return { V, P };
  }
  function torus(R, Rz, r, lon, minor) { // anneau couché dans le plan xz (Rz ≠ R : anneau elliptique)
    const V = [], P = [];
    for (let a = 0; a < lon; a++) {
      const th = (TAU * a) / lon, cx = Math.cos(th), sz = Math.sin(th), dir = norm([cx * Rz, 0, sz * R]);
      for (let b = 0; b < minor; b++) {
        const ph = (TAU * b) / minor;
        V.push([R * cx + r * Math.cos(ph) * dir[0], r * Math.sin(ph), Rz * sz + r * Math.cos(ph) * dir[2]]);
      }
    }
    for (let a = 0; a < lon; a++) for (let b = 0; b < minor; b++) {
      const a2 = (a + 1) % lon, b2 = (b + 1) % minor, th = (TAU * (a + 0.5)) / lon, ph = (TAU * (b + 0.5)) / minor;
      const dir = norm([Math.cos(th) * Rz, 0, Math.sin(th) * R]);
      addPoly(P, [a * minor + b, a2 * minor + b, a2 * minor + b2, a * minor + b2], [Math.cos(ph) * dir[0], Math.sin(ph), Math.cos(ph) * dir[2]], V);
    }
    return { V, P };
  }
  function star(r, t, pts) { // étoile à `pts` branches, face à +z, épaisseur t
    const V = [], P = [], n = pts * 2;
    for (let i = 0; i < n; i++) { const a = PI / 2 + (TAU * i) / n, rr = i % 2 ? r * 0.45 : r; V.push([rr * Math.cos(a), rr * Math.sin(a), t / 2]); }
    for (let i = 0; i < n; i++) V.push([V[i][0], V[i][1], -t / 2]);
    // l'étoile n'est pas convexe : on la découpe en triangles depuis le centre
    V.push([0, 0, t / 2], [0, 0, -t / 2]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      addPoly(P, [i, j, 2 * n], [0, 0, 1], V);
      addPoly(P, [n + i, n + j, 2 * n + 1], [0, 0, -1], V);
      addPoly(P, [i, j, n + j, n + i], [(V[i][0] + V[j][0]) / 2, (V[i][1] + V[j][1]) / 2, 0], V);
    }
    return { V, P };
  }

  /* ---------- construction de la scène ---------- */
  /* Un « contexte de construction » expose E (ellipsoïde), C (cône), Y (cylindre), F (tronc de cône),
     B (boîte), T (tore), S (étoile), beads (perles le long d'une courbe). Les coordonnées sont celles de la scène au repos
     (y vers le haut, z vers l'avant). Options : j (articulation), rot [x,y,z], m (matière), det (finesse), an (animation). */
  function makeBuilder(quality) {
    const prims = [];
    const st = { j: 'root', m: 'matte', rb: 0 };
    const q = quality || 1;
    const det = (n, o) => Math.max(3, Math.round(n * q * ((o && o.det) || 1)));
    function push(shape, x, y, z, col, o) {
      o = o || {};
      const R = o.rot ? rotM(o.rot[0], o.rot[1], o.rot[2]) : ID;
      const V = shape.V.map((v) => { const w = app(R, v); return [w[0] + x, w[1] + y, w[2] + z]; });
      const vs = new Float32Array(V.length * 3);
      V.forEach((v, i) => { vs[i * 3] = v[0]; vs[i * 3 + 1] = v[1]; vs[i * 3 + 2] = v[2]; });
      const p = {
        j: o.j || st.j, m: o.m || st.m, col: typeof col === 'string' && col.startsWith('#') ? hex2rgb(col) : hex2rgb('#ff00ff'),
        rb: o.rb !== undefined ? o.rb : 0, vs, polys: shape.P.map((f) => ({ i: f.i, n: app(R, f.n) })), c: [x, y, z], an: o.an || null, ph: o.ph || 0,
      };
      prims.push(p);
      return p;
    }
    const api = {
      prims, st,
      E: (x, y, z, rx, ry, rz, col, o) => push(sphere(rx, ry, rz, det(8, o), det(12, o)), x, y, z, col, o),
      C: (x, y, z, r, h, col, o) => push(frustum(r, 0, h, det(10, o)), x, y, z, col, o),
      F: (x, y, z, rb, rt, h, col, o) => push(frustum(rb, rt, h, det(10, o)), x, y, z, col, o),
      Y: (x, y, z, r, h, col, o) => push(frustum(r, r, h, det(10, o)), x, y, z, col, o),
      B: (x, y, z, w, h, d, col, o) => push(box(w, h, d), x, y, z, col, o),
      T: (x, y, z, R, r, col, o) => push(torus(R, (o && o.Rz) || R, r, det(14, o), det(6, o)), x, y, z, col, o),
      S: (x, y, z, r, t, col, o) => push(star(r, t, (o && o.pts) || 5), x, y, z, col, o),
      beads(pts, r, col, o) { pts.forEach((p, i) => { const rr = typeof r === 'function' ? r(i, pts.length) : r; api.E(p[0], p[1], p[2], rr, rr, rr, col, Object.assign({ det: 0.55 }, o)); }); },
      // petit utilitaire : exécute f avec une articulation / matière par défaut
      with(over, f) { const old = Object.assign({}, st); Object.assign(st, over); try { f(); } finally { Object.assign(st, old); } },
    };
    return api;
  }

  /* ---------- articulations et poses ---------- */
  const PIVOTS = {
    root: [0, 0, 0], armL: [-0.85, 1.15, 0.1], armR: [0.85, 1.15, 0.1], wingL: [-0.4, 1.35, -0.55], wingR: [0.4, 1.35, -0.55],
    tail: [0, 0.45, -0.7], eyes: [0, 1.2, 0.8], aura: [0, 1, 0], scene: [0, 0, 0], head: [0, 1.5, 0], legL: [-0.4, 0.3, 0.3], legR: [0.4, 0.3, 0.3],
  };
  const J = (o) => Object.assign({ rot: [0, 0, 0], off: [0, 0, 0], sc: [1, 1, 1] }, o);
  const sin = Math.sin, cos = Math.cos;
  const flap = (t, amp, sp) => sin(t * sp) * amp;
  const base = (t) => ({
    root: J({ off: [0, 0.015 * sin(t * 2.2), 0], sc: [1, 1 + 0.012 * sin(t * 2.2), 1] }),
    wingL: J({ rot: [0, flap(t, 0.12, 2.2), 0.15 + flap(t, 0.1, 2.2)] }), wingR: J({ rot: [0, -flap(t, 0.12, 2.2), -0.15 - flap(t, 0.1, 2.2)] }),
    tail: J({ rot: [0, flap(t, 0.25, 1.6), 0] }), aura: J({ rot: [0, t * 0.8, 0] }),
    eyes: J({ sc: [1, (t % 4.2) < 0.12 ? 0.12 : 1, 1] }),
    armL: J({ rot: [0, 0, -0.08 * sin(t * 2.2)] }), armR: J({ rot: [0, 0, 0.08 * sin(t * 2.2)] }),
  });
  const POSES = {
    idle: (t) => base(t),
    wave: (t) => Object.assign(base(t), { armR: J({ rot: [0, 0, 2.5 + 0.35 * sin(t * 9)] }) }),
    dance: (t) => Object.assign(base(t), {
      root: J({ off: [0.12 * sin(t * 4), Math.abs(sin(t * 4)) * 0.14, 0], rot: [0, 0.35 * sin(t * 2), 0.12 * sin(t * 4)] }),
      armL: J({ rot: [0, 0, -1.9 + 0.5 * sin(t * 8)] }), armR: J({ rot: [0, 0, 1.9 - 0.5 * sin(t * 8)] }),
    }),
    jump: (t) => { const k = Math.abs(sin(t * 3)); return Object.assign(base(t), { root: J({ off: [0, k * 0.55, 0], sc: [1 + (1 - k) * 0.06, 1 - (1 - k) * 0.06, 1 + (1 - k) * 0.06] }), armL: J({ rot: [0, 0, -1.2 * k] }), armR: J({ rot: [0, 0, 1.2 * k] }) }); },
    spin: (t) => Object.assign(base(t), { root: J({ rot: [0, t * 3, 0], off: [0, 0.08 + 0.08 * sin(t * 6), 0] }), armL: J({ rot: [0, 0, -1.4] }), armR: J({ rot: [0, 0, 1.4] }) }),
    cheer: (t) => Object.assign(base(t), { root: J({ off: [0, Math.abs(sin(t * 5)) * 0.12, 0] }), armL: J({ rot: [0, 0, -2.7 + 0.2 * sin(t * 10)] }), armR: J({ rot: [0, 0, 2.7 - 0.2 * sin(t * 10)] }) }),
    hero: (t) => Object.assign(base(t), { root: J({ rot: [0, -0.35, 0], off: [0, 0.02 * sin(t * 2), 0] }), armL: J({ rot: [0, 0, -0.9] }), armR: J({ rot: [0, 0, 0.9] }), wingL: J({ rot: [0, 0.05, 0.4] }), wingR: J({ rot: [0, -0.05, -0.4] }) }),
    sleep: (t) => Object.assign(base(t), { root: J({ rot: [0.08, 0, 0.16], off: [0, 0, 0], sc: [1, 1 + 0.03 * sin(t * 1.3), 1] }), eyes: J({ sc: [1, 0.08, 1] }), wingL: J({ rot: [0, 0, 0.5] }), wingR: J({ rot: [0, 0, -0.5] }), armL: J({ rot: [0, 0, -0.1] }), armR: J({ rot: [0, 0, 0.1] }) }),
    think: (t) => Object.assign(base(t), { root: J({ rot: [0, 0.2 * sin(t * 0.8), 0.05] }), armR: J({ rot: [-1.1, 0, 0.7] }) }),
  };

  /* ---------- rendu ---------- */
  const MATS = {
    matte: { amb: 0.58, dif: 0.52, spec: 0, pw: 1, a: 1 },
    soft: { amb: 0.64, dif: 0.42, spec: 0, pw: 1, a: 1 },
    shiny: { amb: 0.45, dif: 0.6, spec: 0.35, pw: 22, a: 1 },
    metal: { amb: 0.3, dif: 0.7, spec: 0.75, pw: 10, a: 1 },
    glow: { emit: 1, a: 1 },
    jelly: { amb: 0.58, dif: 0.45, spec: 0.55, pw: 30, a: 0.84 },
    ghost: { amb: 0.66, dif: 0.35, spec: 0, pw: 1, a: 0.62 },
    glass: { amb: 0.5, dif: 0.45, spec: 0.7, pw: 30, a: 0.38 },
  };
  const LIGHT = norm([-0.45, 0.75, 0.55]);
  const HALF = norm(add3(LIGHT, [0, 0, 1]));
  const colorCache = new Map();
  function css(r, g, b, a) {
    const k = ((((r >> 2) * 64 + (g >> 2)) * 64 + (b >> 2)) * 21) + Math.round(a * 20);
    let s = colorCache.get(k);
    if (!s) { s = a >= 0.99 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`; if (colorCache.size > 5000) colorCache.clear(); colorCache.set(k, s); }
    return s;
  }

  function jointAffine(jm, rootM, V, c) {
    // renvoie {A, N, b} : p_vue = A·p + b ; N = rotation seule (pour les normales)
    const pv = jm.pivot;
    const A1 = mul(rotM(jm.rot[0], jm.rot[1], jm.rot[2]), scaleM(jm.sc[0], jm.sc[1], jm.sc[2]));
    const N1 = rotM(jm.rot[0], jm.rot[1], jm.rot[2]);
    const b1 = add3(sub3(pv, app(A1, pv)), jm.off);
    let A = A1, N = N1, b = b1;
    if (!jm.isRoot) { // puis la transformation de la racine
      A = mul(rootM.A, A1); N = mul(rootM.N, N1); b = add3(app(rootM.A, b1), rootM.b);
    }
    const A3 = mul(V, A), N3 = mul(V, N), b3 = sub3(app(V, b), app(V, c));
    return { A: A3, N: N3, b: add3(b3, [0, 0, 0]) };
  }

  /** Dessine la scène. o : { w, h, yaw, pitch, zoom, t, pose, flat } */
  function render(g, scene, o) {
    const w = o.w, h = o.h, t = o.t || 0;
    const posef = POSES[o.pose] || POSES.idle;
    const J0 = posef(t);
    const bg = scene.bg || { top: '#cfeeff', bottom: '#fff7e6' };
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, bg.top); gr.addColorStop(1, bg.bottom);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    drawDeco(g, bg.deco, w, h, t, bg.dc);

    const view = mul(rotM(o.pitch || 0, 0, 0), rotM(0, o.yaw || 0, 0));
    const center = [0, 1.05, 0];
    const D = 7.2, f = Math.min(w, h) * 1.5 * (o.zoom || 1);
    const cy = h * 0.64;

    // matrices par articulation
    const jr = J0.root || J();
    const rootAff = (() => {
      const A = mul(rotM(jr.rot[0], jr.rot[1], jr.rot[2]), scaleM(jr.sc[0], jr.sc[1], jr.sc[2]));
      return { A, N: rotM(jr.rot[0], jr.rot[1], jr.rot[2]), b: jr.off.slice() };
    })();
    const aff = {};
    const affOf = (name) => {
      if (aff[name]) return aff[name];
      const j = J0[name] || J();
      // « scene » et « aura » ne suivent pas les mouvements du corps ; les autres articulations les suivent
      const free = name === 'root' || name === 'scene' || name === 'aura';
      const jm = { pivot: (scene.piv && scene.piv[name]) || PIVOTS[name] || [0, 0, 0], rot: name === 'scene' ? [0, 0, 0] : j.rot, sc: name === 'scene' ? [1, 1, 1] : j.sc, off: name === 'scene' ? [0, 0, 0] : j.off, isRoot: free };
      return (aff[name] = jointAffine(jm, rootAff, view, center));
    };

    // ombre au sol
    if (!scene.noShadow) {
      const s = affOf('scene'), c0 = app(s.A, [0, 0.02, 0]);
      const sc = f / (D - (c0[2] + s.b[2]));
      g.save(); g.translate(w / 2 + (c0[0] + s.b[0]) * sc, cy - (c0[1] + s.b[1]) * sc);
      g.scale(1, 0.28 + Math.abs(Math.sin(o.pitch || 0)) * 0.3); g.fillStyle = 'rgba(30,20,60,.22)';
      g.beginPath(); g.arc(0, 0, 0.95 * sc * (1 - 0.06 * Math.max(0, (jr.off[1] || 0) * 3)), 0, TAU); g.fill(); g.restore();
    }

    const list = [];
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    for (const p of scene.prims) {
      const a = affOf(p.j);
      const mat = MATS[p.m] || MATS.matte;
      const NV = p.vs.length / 3;
      const tv = new Float32Array(NV * 3);
      let d0 = 0, d1 = 0, d2 = 0;
      if (p.an) { const d = p.an(t, p.ph); d0 = d[0]; d1 = d[1]; d2 = d[2]; }
      const A = a.A, b = a.b;
      for (let i = 0; i < NV; i++) {
        const x = p.vs[i * 3] + d0, y = p.vs[i * 3 + 1] + d1, z = p.vs[i * 3 + 2] + d2;
        const vx = A[0] * x + A[1] * y + A[2] * z + b[0], vy = A[3] * x + A[4] * y + A[5] * z + b[1], vz = A[6] * x + A[7] * y + A[8] * z + b[2];
        const k = f / (D - vz);
        tv[i * 3] = w / 2 + vx * k; tv[i * 3 + 1] = cy - vy * k; tv[i * 3 + 2] = vz;
      }
      let col = p.col;
      if (p.rb) { const hh = t * 55 + (p.rb === 3 ? 140 : 0); col = hsl2rgb(hh, 0.85, p.rb === 2 ? 0.8 : 0.66); }
      const N = a.N;
      for (const f2 of p.polys) {
        const n = f2.n;
        const nx = N[0] * n[0] + N[1] * n[1] + N[2] * n[2], ny = N[3] * n[0] + N[4] * n[1] + N[5] * n[2], nz = N[6] * n[0] + N[7] * n[1] + N[8] * n[2];
        if (nz <= 0.01 && !mat.emit) continue;
        if (nz <= -0.2) continue;
        let z = 0; for (const ix of f2.i) z += tv[ix * 3 + 2];
        let r, gg, bb;
        if (mat.emit) { const dif = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]), e = 0.12 + 0.18 * pulse; const k = 0.78 + 0.3 * dif, c0 = col[0] * k, c1 = col[1] * k, c2 = col[2] * k; r = c0 + (255 - c0) * e; gg = c1 + (255 - c1) * e; bb = c2 + (255 - c2) * e; }
        else {
          const dif = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
          const s = mat.amb + mat.dif * dif;
          let sp = 0; if (mat.spec) sp = mat.spec * Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), mat.pw) * 255;
          r = col[0] * s + sp; gg = col[1] * s + sp; bb = col[2] * s + sp;
        }
        list.push({ f: f2, tv, z: z / f2.i.length, c: css(Math.min(255, r) | 0, Math.min(255, gg) | 0, Math.min(255, bb) | 0, mat.a), a: mat.a });
      }
    }
    list.sort((x, y) => x.z - y.z);
    g.lineJoin = 'round'; g.lineWidth = Math.max(0.6, w / 420);
    for (const q of list) {
      const idx = q.f.i, tv = q.tv;
      g.beginPath(); g.moveTo(tv[idx[0] * 3], tv[idx[0] * 3 + 1]);
      for (let k = 1; k < idx.length; k++) g.lineTo(tv[idx[k] * 3], tv[idx[k] * 3 + 1]);
      g.closePath(); g.fillStyle = q.c; g.fill();
      if (q.a >= 0.99) { g.strokeStyle = q.c; g.stroke(); }
    }
  }

  function drawDeco(g, kind, w, h, t, color) {
    if (!kind || kind === 'none') return;
    const n = kind === 'rays' ? 9 : 26;
    g.save();
    if (kind === 'rays') {
      g.globalAlpha = 0.18; g.fillStyle = color || '#fff';
      for (let i = 0; i < n; i++) { const a = (TAU * i) / n + t * 0.15; g.beginPath(); g.moveTo(w / 2, h * 0.55); g.lineTo(w / 2 + Math.cos(a) * w * 2, h * 0.55 + Math.sin(a) * w * 2); g.lineTo(w / 2 + Math.cos(a + 0.12) * w * 2, h * 0.55 + Math.sin(a + 0.12) * w * 2); g.closePath(); g.fill(); }
      g.restore(); return;
    }
    for (let i = 0; i < n; i++) {
      const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * w;
      const yb = ((Math.sin(i * 78.233) * 12345.678) % 1 + 1) % 1;
      let y = yb * h * 0.8, r = 1 + (i % 3);
      if (kind === 'stars') { g.globalAlpha = 0.45 + 0.5 * Math.abs(Math.sin(t * 1.5 + i)); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * 0.8, 0, TAU); g.fill(); }
      else if (kind === 'bubbles') { y = h - ((yb * h * 1.2 + t * (10 + (i % 5) * 4)) % (h * 1.1)); g.globalAlpha = 0.5; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x + Math.sin(t + i) * 6, y, 3 + (i % 4) * 2, 0, TAU); g.stroke(); }
      else if (kind === 'snow') { y = (yb * h + t * (14 + (i % 4) * 6)) % h; g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.beginPath(); g.arc(x + Math.sin(t * 0.8 + i) * 8, y, r, 0, TAU); g.fill(); }
      else if (kind === 'dots') { g.globalAlpha = 0.35; g.fillStyle = color || '#fff'; g.beginPath(); g.arc(x, y, 3 + (i % 5) * 2, 0, TAU); g.fill(); }
      else if (kind === 'sparks') { y = h - ((yb * h + t * (20 + (i % 5) * 8)) % h); g.globalAlpha = 0.6; g.fillStyle = color || '#ffd166'; g.beginPath(); g.arc(x + Math.sin(t * 2 + i) * 5, y, 1.5 + (i % 3), 0, TAU); g.fill(); }
      else if (kind === 'clouds') { const xx = ((x + t * (6 + (i % 4) * 3)) % (w + 120)) - 60; g.globalAlpha = 0.7; g.fillStyle = '#fff'; if (i % 3 === 0) { g.beginPath(); g.ellipse(xx, y * 0.55, 34 + (i % 4) * 8, 11, 0, 0, TAU); g.ellipse(xx + 18, y * 0.55 - 7, 20, 11, 0, 0, TAU); g.fill(); } }
      else if (kind === 'petals') { y = (yb * h + t * (12 + (i % 4) * 5)) % h; g.globalAlpha = 0.8; g.fillStyle = color || '#ffb3d1'; g.beginPath(); g.ellipse(x + Math.sin(t + i) * 12, y, 4, 2, t + i, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  /* ---------- API haute niveau ---------- */
  /** Construit la scène à partir d'une configuration et du catalogue de pièces. */
  function build(cfg, Parts, opts) {
    const quality = (opts && opts.quality) || 1.35;
    const c = makeBuilder(quality);
    const res = Parts.resolve(cfg, opts || {});
    Parts.buildAll(c, res);
    return { prims: c.prims, bg: res.scene.bg, noShadow: !!res.scene.noShadow, piv: res.piv, res };
  }

  /** Dessine une image fixe (vignette, photo) dans un canvas fourni. */
  function still(canvas, scene, o) {
    const g = canvas.getContext('2d');
    render(g, scene, Object.assign({ w: canvas.width, h: canvas.height, yaw: 0, pitch: 0, zoom: 1, t: 0.4, pose: 'idle' }, o));
  }

  /**
   * Affiche un avatar animé dans un conteneur. Glisser = tourner, molette/pincer = zoom, toucher = « boop ».
   * Retourne { update(cfg), stop(), canvas, setPose(p), shot() }.
   */
  function mount(el, cfg, Parts, o) {
    o = o || {};
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = o.size || 300;
    const canvas = document.createElement('canvas');
    canvas.className = 'av3d'; canvas.width = Math.round(size * dpr * (o.aspect || 1)); canvas.height = Math.round(size * dpr);
    canvas.style.width = '100%'; canvas.style.aspectRatio = (o.aspect || 1) + ' / 1'; canvas.style.touchAction = 'pan-y';
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Ton avatar en 3D. Glisse pour le faire tourner.');
    el.innerHTML = ''; el.appendChild(canvas);
    const S = { cfg, opts: Object.assign({}, o.opts || {}), scene: build(cfg, Parts, Object.assign({ quality: o.quality || 1.35 }, o.opts || {})), yaw: o.yaw || 0, pitch: 0.08, zoom: o.zoom || 1, pose: (cfg && cfg.pose) || 'idle', boop: -9, spin: !!o.spin, alive: true, dirty: true, last: 0 };
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let drag = null, pinch = null;
    const pts = new Map();
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch, moved: 0 }; else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: S.zoom }; } });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; S.zoom = Math.max(0.6, Math.min(2.2, pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d)); S.dirty = true; return; }
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); S.yaw = drag.yaw + dx * 0.012; S.pitch = Math.max(-0.35, Math.min(0.55, drag.pitch + dy * 0.006)); S.spin = false; S.dirty = true; }
    });
    const up = (e) => { pts.delete(e.pointerId); if (!pts.size) { if (drag && drag.moved < 8 && o.onBoop) { S.boop = S.t || 0; o.onBoop(); } drag = null; pinch = null; } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); S.zoom = Math.max(0.6, Math.min(2.2, S.zoom * (e.deltaY < 0 ? 1.08 : 0.92))); S.dirty = true; }, { passive: false });
    canvas.addEventListener('dblclick', () => { S.yaw = 0; S.pitch = 0.08; S.zoom = 1; S.dirty = true; });

    function frame(ts) {
      if (!S.alive) return;
      if (!canvas.isConnected) { S.alive = false; return; }
      requestAnimationFrame(frame);
      if (document.hidden) return;
      const animated = !reduced || S.dirty;
      if (!animated || ts - S.last < 33) return; // ~30 images/s
      S.last = ts; S.t = ts / 1000; S.dirty = false;
      const t0 = performance.now();
      if (S.spin) S.yaw += 0.02;
      const pose = S.t - S.boop < 1.2 ? 'jump' : S.pose;
      render(canvas.getContext('2d'), S.scene, { w: canvas.width, h: canvas.height, yaw: S.yaw, pitch: S.pitch, zoom: S.zoom, t: S.t, pose });
      // appareil lent : on réduit la définition du dessin plutôt que de saccader
      S.ms = (S.ms || 0) * 0.9 + (performance.now() - t0) * 0.1;
      if (S.ms > 30 && canvas.width > 200) { canvas.width = Math.round(canvas.width * 0.8); canvas.height = Math.round(canvas.height * 0.8); S.ms = 0; }
    }
    requestAnimationFrame(frame);
    return {
      canvas, state: S,
      update(c2, o2) { S.cfg = c2; if (o2 && o2.opts) S.opts = Object.assign(S.opts, o2.opts); S.scene = build(c2, Parts, Object.assign({ quality: o.quality || 1.35 }, S.opts)); if (!(o2 && o2.keepPose)) S.pose = c2.pose || 'idle'; S.dirty = true; },
      setPose(p) { S.pose = p; S.dirty = true; },
      setSpin(v) { S.spin = v; },
      stop() { S.alive = false; },
      shot(cb) { S.dirty = true; render(canvas.getContext('2d'), S.scene, { w: canvas.width, h: canvas.height, yaw: S.yaw, pitch: S.pitch, zoom: S.zoom, t: S.t || 0.4, pose: S.pose }); canvas.toBlob(cb, 'image/png'); },
    };
  }

  return { build, render, still, mount, makeBuilder, POSES, MATS, PIVOTS, shadeHex, hex2rgb, rgb2hex, mix };
});
