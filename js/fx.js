/* Sons, voix, confettis et mascotte (tout est généré : aucun fichier à charger). */
const FX = (() => {
  let ctx = null;
  let enabled = { sound: true, speech: true };
  const configure = (o) => Object.assign(enabled, o);

  function audio() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type = 'sine', vol = 0.15) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const t0 = a.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const sounds = {
    ok: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.1, 0.18, 'triangle'); },
    combo: () => { tone(660, 0, 0.1, 'triangle'); tone(880, 0.08, 0.1, 'triangle'); tone(1175, 0.16, 0.22, 'triangle'); },
    ko: () => { tone(300, 0, 0.18, 'sine', 0.12); tone(240, 0.14, 0.25, 'sine', 0.12); },
    tap: () => tone(520, 0, 0.05, 'sine', 0.08),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle')),
    level: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.1, 0.3, 'square', 0.08)),
    tick: () => tone(900, 0, 0.04, 'square', 0.04),
  };
  const play = (n) => { if (enabled.sound && sounds[n]) sounds[n](); };

  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /^fr[-_]FR/i.test(v.lang)) || vs.find((v) => /^fr/i.test(v.lang)) || null;
    return voice;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, force) {
    if (!('speechSynthesis' in window) || (!enabled.speech && !force)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR'; u.rate = 0.9; if (voice || pickVoice()) u.voice = voice;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  function confetti(n = 80) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const g = c.getContext('2d');
    const cols = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff9f1c'];
    const ps = Array.from({ length: n }, () => ({
      x: c.width / 2 + (Math.random() - 0.5) * 120, y: c.height * 0.45,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, s: 6 + Math.random() * 7,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: cols[(Math.random() * cols.length) | 0],
    }));
    let f = 0;
    (function step() {
      g.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.col; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); g.restore();
      });
      if (++f < 110) requestAnimationFrame(step); else c.remove();
    })();
  }

  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  /* ---------- Mascotte « Conjugo » ---------- */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function mascot({ stage = 0, mood = 'happy', color = '#7bd88f', hat = '', glasses = '', neck = '', pet = '', size = 160 } = {}) {
    const dark = shade(color, -0.25), light = shade(color, 0.45);
    const eyeY = stage === 0 ? 118 : 104;
    const mouths = {
      happy: `<path d="M82 ${eyeY + 24} Q100 ${eyeY + 42} 118 ${eyeY + 24}" stroke="#4a2c2a" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      cheer: `<path d="M80 ${eyeY + 22} Q100 ${eyeY + 58} 120 ${eyeY + 22} Z" fill="#7a1f3d" stroke="#4a2c2a" stroke-width="4" stroke-linejoin="round"/><path d="M92 ${eyeY + 40} Q100 ${eyeY + 34} 108 ${eyeY + 40}" fill="#ff7b9c"/>`,
      oops: `<path d="M84 ${eyeY + 38} Q100 ${eyeY + 24} 116 ${eyeY + 38}" stroke="#4a2c2a" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      think: `<path d="M88 ${eyeY + 32} L112 ${eyeY + 32}" stroke="#4a2c2a" stroke-width="5" stroke-linecap="round"/>`,
    };
    const brows = mood === 'oops'
      ? `<path d="M64 ${eyeY - 14} L84 ${eyeY - 23}" stroke="#4a2c2a" stroke-width="5" stroke-linecap="round"/><path d="M136 ${eyeY - 14} L116 ${eyeY - 23}" stroke="#4a2c2a" stroke-width="5" stroke-linecap="round"/>` : '';
    const pupilDx = mood === 'think' ? 3 : 0, pupilDy = mood === 'think' ? -3 : 0;
    const eyes = `<circle cx="78" cy="${eyeY}" r="13" fill="#fff"/><circle cx="122" cy="${eyeY}" r="13" fill="#fff"/>
      <circle cx="${80 + pupilDx}" cy="${eyeY + pupilDy + 1}" r="7" fill="#2b2d42"/><circle cx="${124 + pupilDx}" cy="${eyeY + pupilDy + 1}" r="7" fill="#2b2d42"/>
      <circle cx="${82 + pupilDx}" cy="${eyeY + pupilDy - 2}" r="2.5" fill="#fff"/><circle cx="${126 + pupilDx}" cy="${eyeY + pupilDy - 2}" r="2.5" fill="#fff"/>`;
    const cheeks = `<ellipse cx="62" cy="${eyeY + 20}" rx="9" ry="6" fill="#ff8fa3" opacity=".55"/><ellipse cx="138" cy="${eyeY + 20}" rx="9" ry="6" fill="#ff8fa3" opacity=".55"/>`;
    let body;
    if (stage === 0) {
      body = `<ellipse cx="100" cy="188" rx="52" ry="8" fill="#000" opacity=".12"/>
        <path d="M100 30 C150 30 168 100 168 135 C168 172 138 190 100 190 C62 190 32 172 32 135 C32 100 50 30 100 30Z" fill="${color}" stroke="${dark}" stroke-width="4"/>
        <circle cx="62" cy="75" r="9" fill="${light}"/><circle cx="140" cy="150" r="12" fill="${light}"/><circle cx="64" cy="160" r="7" fill="${light}"/>`;
    } else {
      const wings = stage >= 2 ? `<path d="M40 110 C0 70 10 40 25 35 C32 70 48 80 58 90Z" fill="${light}" stroke="${dark}" stroke-width="3"/><path d="M160 110 C200 70 190 40 175 35 C168 70 152 80 142 90Z" fill="${light}" stroke="${dark}" stroke-width="3"/>` : '';
      const horns = stage >= 3 ? `<path d="M70 52 L60 20 L88 44Z" fill="#ffd166" stroke="${dark}" stroke-width="3"/><path d="M130 52 L140 20 L112 44Z" fill="#ffd166" stroke="${dark}" stroke-width="3"/>`
        : stage >= 2 ? `<path d="M74 52 L68 34 L88 46Z" fill="#ffd166" stroke="${dark}" stroke-width="3"/><path d="M126 52 L132 34 L112 46Z" fill="#ffd166" stroke="${dark}" stroke-width="3"/>` : '';
      const tail = stage >= 1 ? `<path d="M150 160 C185 160 190 130 178 120 C176 140 165 146 148 146Z" fill="${color}" stroke="${dark}" stroke-width="3"/>` : '';
      body = `<ellipse cx="100" cy="190" rx="55" ry="7" fill="#000" opacity=".12"/>${wings}${tail}${horns}
        <ellipse cx="100" cy="122" rx="66" ry="64" fill="${color}" stroke="${dark}" stroke-width="4"/>
        <ellipse cx="100" cy="148" rx="38" ry="34" fill="${light}" opacity=".75"/>
        <ellipse cx="70" cy="184" rx="18" ry="9" fill="${color}" stroke="${dark}" stroke-width="3"/><ellipse cx="130" cy="184" rx="18" ry="9" fill="${color}" stroke="${dark}" stroke-width="3"/>`;
    }
    const hatTop = stage === 0 ? 38 : stage >= 3 ? 32 : 46;
    const hatSvg = hat ? `<text x="100" y="${hatTop}" font-size="54" text-anchor="middle" dominant-baseline="auto">${hat}</text>` : '';
    const glSvg = glasses ? `<text x="100" y="${eyeY + 16}" font-size="62" text-anchor="middle">${glasses}</text>` : '';
    const neckSvg = neck ? `<text x="100" y="${eyeY + 62}" font-size="40" text-anchor="middle">${neck}</text>` : '';
    const petSvg = pet ? `<text x="168" y="190" font-size="40" text-anchor="middle">${pet}</text>` : '';
    return `<svg class="mascot mood-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Conjugo, ta mascotte">
      ${body}${eyes}${brows}${cheeks}${mouths[mood] || mouths.happy}${neckSvg}${glSvg}${hatSvg}${petSvg}</svg>`;
  }

  return { configure, play, speak, confetti, vibrate, mascot, shade };
})();
