/* Sauvegarde locale (profils, progression, verbes ajoutés) + répétition espacée. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./conjugate.js'));
  else root.Store = factory(root.Conj);
})(typeof self !== 'undefined' ? self : this, function (Conj) {
  'use strict';
  const KEY = 'conju.v1';
  const INTERVALS = [0, 1, 3, 7, 21]; // jours avant la prochaine révision, selon la « boîte » 0-4

  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
  const today = () => dateStr();
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return dateStr(new Date(y, m - 1, d + n)); };

  const defaultSettings = () => ({
    sound: true, speech: true, easyFont: false, dailyGoal: 20, inputMode: 'auto',
    tenses: Object.fromEntries(Conj.TENSES.map((t) => [t.id, t.core])),
    unlockAll: false, autoUnlock: true, sessionLength: 10, featuredList: '',
  });
  const newProfile = (name, color) => ({
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: String(name).slice(0, 20), color: color || '#7bd88f',
    xp: 0, coins: 0, streak: { count: 0, last: '' }, daily: { date: '', count: 0, chest: false },
    cards: {}, stars: {}, badges: {}, owned: ['skin:#7bd88f'], equipped: { hat: '', glasses: '', theme: '', neck: '', pet: '' }, avatar: null,
    stats: { sessions: 0, correct: 0, wrong: 0, bestCombo: 0, perfect: 0, chronoBest: 0, fixed: 0 },
    errKinds: {}, errLog: [], created: Date.now(),
  });
  const emptyData = () => ({ v: 1, settings: defaultSettings(), profiles: [], current: '', customVerbs: [], hiddenBase: [], author: '', verbMeta: { tomb: {}, hid: {} }, settingsT: 0, delP: {}, sync: null, seenVer: 0 });

  let data = emptyData();
  let base = [];
  let memoryOnly = false;
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        data = Object.assign(emptyData(), d);
        data.settings = Object.assign(defaultSettings(), d.settings || {});
        data.settings.tenses = Object.assign(defaultSettings().tenses, (d.settings || {}).tenses || {});
        data.profiles = (d.profiles || []).map((p) => {
          const q = Object.assign(newProfile(p.name || '?'), p);
          q.equipped = Object.assign(newProfile('?').equipped, p.equipped || {}); // nouvelles catégories ajoutées sans rien perdre
          return q;
        });
        data.verbMeta = Object.assign({ tomb: {}, hid: {} }, d.verbMeta || {});
        // anciennes données : verbes masqués sans date → on leur en donne une
        (data.hiddenBase || []).forEach((i) => { if (!data.verbMeta.hid[i]) data.verbMeta.hid[i] = { h: 1, t: 1 }; });
      }
    } catch (e) { memoryOnly = true; }
  }
  /** quiet = true : enregistrement sans « modification utilisateur » (fusion de synchro) */
  function save(quiet) {
    if (!quiet) { const p = profile(); if (p) p.t = Date.now(); }
    try { localStorage.setItem(KEY, JSON.stringify(data)); memoryOnly = false; } catch (e) { memoryOnly = true; }
    if (!quiet) listeners.forEach((f) => f());
  }

  /* ---------- verbes ---------- */
  const s = (x, n = 40) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
  const strArr = (a, len, n = 30) => (Array.isArray(a) && a.length === len ? a.map((x) => s(x, n)) : null);
  function sanitizeVerb(r) {
    if (!r || typeof r !== 'object') return null;
    const v = { inf: s(r.inf).toLowerCase(), type: r.type, pp: s(r.pp), aux: r.aux === 'etre' ? 'etre' : 'avoir' };
    if (!Conj.validVerb(v) || !v.pp) return null;
    const emoji = s(r.emoji, 8); if (emoji) v.emoji = emoji;
    const def = s(r.def, 120); if (def) v.def = def;
    if (Array.isArray(r.lists)) { const l = r.lists.map((x) => s(x, 30)).filter(Boolean).slice(0, 5); if (l.length) v.lists = l; }
    ['fut', 'impStem'].forEach((k) => { const x = s(r[k], 30); if (x) v[k] = x; });
    const pres = strArr(r.pres, 6); if (pres && pres.every(Boolean)) v.pres = pres;
    const subj = strArr(r.subj, 2); if (subj && subj.every(Boolean)) v.subj = subj;
    const ps = strArr(r.ps, 2); if (ps && ps[0] && ['a', 'i', 'u'].includes(ps[1])) v.ps = ps;
    const psf = strArr(r.psForms, 6); if (psf && psf.every(Boolean)) v.psForms = psf;
    const imp = strArr(r.imp, 3); if (imp && imp.every(Boolean)) v.imp = imp;
    if (r.noImp === true) v.noImp = true;
    if (r.forms && typeof r.forms === 'object') {
      const f = {};
      for (const t of Object.keys(r.forms)) {
        if (!Conj.TENSE_BY_ID[t]) continue;
        const a = strArr(r.forms[t], 6);
        if (a && a.some(Boolean)) f[t] = a;
      }
      if (Object.keys(f).length) v.forms = f;
    }
    v.updated = Number.isFinite(r.updated) ? r.updated : Date.now();
    return v;
  }

  function setBase(list) { base = list.map((v) => sanitizeVerb(v)).filter(Boolean); }
  const baseVerbs = () => base;
  function allVerbs() {
    const custom = new Map(data.customVerbs.map((v) => [v.inf, v]));
    const hidden = new Set(data.hiddenBase);
    const out = [];
    for (const b of base) {
      if (hidden.has(b.inf) && !custom.has(b.inf)) continue;
      out.push(custom.has(b.inf) ? Object.assign({ _mod: true }, custom.get(b.inf)) : b);
    }
    for (const c of data.customVerbs) if (!base.some((b) => b.inf === c.inf)) out.push(Object.assign({ _custom: true }, c));
    return out;
  }
  function saveVerb(v) {
    const c = sanitizeVerb(v); if (!c) return false;
    c.updated = Date.now();
    const i = data.customVerbs.findIndex((x) => x.inf === c.inf);
    if (i >= 0) data.customVerbs[i] = c; else data.customVerbs.push(c);
    delete data.verbMeta.tomb[c.inf];
    setHidden(c.inf, false);
    save(); return true;
  }
  const syncHidden = () => { data.hiddenBase = Object.entries(data.verbMeta.hid).filter(([, v]) => v.h).map(([k]) => k); };
  function setHidden(inf, h) {
    if (!h && !data.verbMeta.hid[inf]) return;
    data.verbMeta.hid[inf] = { h: h ? 1 : 0, t: Date.now() };
    syncHidden();
  }
  function removeVerb(inf) {
    data.customVerbs = data.customVerbs.filter((x) => x.inf !== inf);
    data.verbMeta.tomb[inf] = Date.now();
    if (base.some((b) => b.inf === inf)) setHidden(inf, true);
    save();
  }
  function restoreVerb(inf) { // retire la modification / réaffiche un verbe de base
    data.customVerbs = data.customVerbs.filter((x) => x.inf !== inf);
    data.verbMeta.tomb[inf] = Date.now();
    setHidden(inf, false);
    save();
  }
  /** Fusionne des verbes importés (le plus récent gagne). Retourne {added, updated} */
  function mergeVerbs(list) {
    let added = 0, updated = 0;
    for (const r of list) {
      const c = sanitizeVerb(r); if (!c) continue;
      const i = data.customVerbs.findIndex((x) => x.inf === c.inf);
      if (i < 0) { data.customVerbs.push(c); added++; delete data.verbMeta.tomb[c.inf]; setHidden(c.inf, false); }
      else if ((c.updated || 0) >= (data.customVerbs[i].updated || 0)) { data.customVerbs[i] = c; updated++; }
    }
    save(); return { added, updated };
  }

  /* ---------- partage par lien ---------- */
  const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  async function pipe(bytes, stream) {
    const out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }
  async function encodeShare(verbs) {
    const json = JSON.stringify({ v: 1, by: data.author || '', verbs: verbs.map(({ _custom, _mod, ...v }) => v) });
    const bytes = new TextEncoder().encode(json);
    if (typeof CompressionStream !== 'undefined') return 'z' + b64url(await pipe(bytes, new CompressionStream('deflate-raw')));
    return 'j' + b64url(bytes);
  }
  async function decodeShare(code) {
    const bytes = unb64url(code.slice(1));
    const raw = code[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    const obj = JSON.parse(new TextDecoder().decode(raw));
    if (!obj || !Array.isArray(obj.verbs)) throw new Error('format');
    return { by: s(obj.by, 40), verbs: obj.verbs.slice(0, 300).map(sanitizeVerb).filter(Boolean) };
  }

  /* ---------- profils ---------- */
  const profile = () => data.profiles.find((p) => p.id === data.current) || null;
  function addProfile(name, color) {
    const p = newProfile(name, color); p.owned = ['skin:' + p.color];
    data.profiles.push(p); data.current = p.id; save(); return p;
  }
  function selectProfile(id) { if (data.profiles.some((p) => p.id === id)) { data.current = id; save(); } }
  function deleteProfile(id) {
    data.profiles = data.profiles.filter((p) => p.id !== id);
    data.delP[id] = Date.now();
    if (data.current === id) data.current = data.profiles[0] ? data.profiles[0].id : '';
    save();
  }

  /* ---------- XP / niveaux ---------- */
  const levelOf = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
  const xpFor = (lvl) => 50 * (lvl - 1) * (lvl - 1);
  const stageOf = (lvl) => (lvl < 3 ? 0 : lvl < 6 ? 1 : lvl < 10 ? 2 : 3);
  const STAGE_NAMES = ['Œuf magique', 'Bébé dragon', 'Jeune dragon', 'Dragon des verbes'];

  /* ---------- cartes (répétition espacée) ---------- */
  const key = (inf, tense, p) => `${inf}|${tense}|${p}`;
  const card = (prof, k) => prof.cards[k] || null;
  function review(prof, k, ok, weak) {
    const c = prof.cards[k] || (prof.cards[k] = { b: 0, d: today(), c: 0, w: 0 });
    if (ok) {
      c.c++;
      c.b = weak ? Math.min(Math.max(c.b, 0) + 1, 2) : Math.min(4, c.b + 1);
    } else {
      c.w++;
      if (!weak) c.b = Math.max(0, c.b - 2);
    }
    c.d = addDays(today(), INTERVALS[c.b]);
    c.u = Date.now();
    if (ok && c.fix) { c.fix = Math.max(0, c.fix - 1); if (!c.fix) prof.stats.fixed++; }
    if (!ok) c.fix = 2;
    return c;
  }
  const isDue = (c) => !c || c.d <= today();
  const mastery = (prof, inf, tense, persons) => {
    let n = 0;
    for (const p of persons) { const c = prof.cards[key(inf, tense, p)]; if (c && c.b >= 3) n++; }
    return n / persons.length;
  };

  function touchDaily(prof) {
    const t = today();
    if (prof.daily.date !== t) prof.daily = { date: t, count: 0, chest: false };
    return prof.daily;
  }
  function bumpStreak(prof) {
    const t = today();
    if (prof.streak.last === t) return prof.streak.count;
    const gap = prof.streak.last ? dayNum(t) - dayNum(prof.streak.last) : 99;
    prof.streak.count = gap <= 2 ? prof.streak.count + 1 : 1; // 1 jour de tolérance
    prof.streak.last = t;
    return prof.streak.count;
  }


  /* ---------- fusion pour la synchronisation entre appareils ---------- */
  const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((a, x) => { a[x] = v[x]; return a; }, {}) : v));
  const maxBy = (a, b, f) => (f(a) >= f(b) ? a : b);

  function mergeProfile(a, b) {
    const newer = (a.t || 0) >= (b.t || 0) ? a : b;
    const m = JSON.parse(JSON.stringify(newer)); // nom, couleur, pièces, objets : valeurs de la version la plus récente
    m.id = a.id;
    m.t = Math.max(a.t || 0, b.t || 0);
    m.xp = Math.max(a.xp || 0, b.xp || 0);
    m.cards = {};
    for (const k of new Set([...Object.keys(a.cards || {}), ...Object.keys(b.cards || {})])) {
      const x = (a.cards || {})[k], y = (b.cards || {})[k];
      const w = !x ? y : !y ? x : maxBy(x, y, (c) => c.u || 0);
      m.cards[k] = Object.assign({}, w, { c: Math.max((x || {}).c || 0, (y || {}).c || 0), w: Math.max((x || {}).w || 0, (y || {}).w || 0) });
    }
    m.stars = {};
    for (const k of new Set([...Object.keys(a.stars || {}), ...Object.keys(b.stars || {})])) m.stars[k] = Math.max((a.stars || {})[k] || 0, (b.stars || {})[k] || 0);
    m.badges = {};
    for (const k of new Set([...Object.keys(a.badges || {}), ...Object.keys(b.badges || {})])) m.badges[k] = Math.min(...[(a.badges || {})[k], (b.badges || {})[k]].filter(Boolean));
    m.owned = [...new Set([...(a.owned || []), ...(b.owned || [])])];
    const older = newer === a ? b : a;
    m.equipped = Object.assign({}, older.equipped || {}, newer.equipped || {});
    const av = (x) => (x.avatar && x.avatar.t) || 0; // avatar 3D : la version modifiée en dernier gagne (une ancienne version de l'appli n'en a pas)
    const bestAv = av(a) > av(b) ? a : av(b) > av(a) ? b : (stable(a.avatar || null) >= stable(b.avatar || null) ? a : b);
    m.avatar = bestAv.avatar ? JSON.parse(JSON.stringify(bestAv.avatar)) : null;
    m.stats = {};
    for (const k of new Set([...Object.keys(a.stats || {}), ...Object.keys(b.stats || {})])) m.stats[k] = Math.max((a.stats || {})[k] || 0, (b.stats || {})[k] || 0);
    m.errKinds = {};
    for (const k of new Set([...Object.keys(a.errKinds || {}), ...Object.keys(b.errKinds || {})])) m.errKinds[k] = Math.max((a.errKinds || {})[k] || 0, (b.errKinds || {})[k] || 0);
    const union = (x, y, cap) => { const seen = new Set(); return [...(x || []), ...(y || [])].filter((e) => !seen.has(e.at) && seen.add(e.at)).sort((p, q) => p.at - q.at).slice(-cap); };
    m.errLog = union(a.errLog, b.errLog, 60);
    m.history = union(a.history, b.history, 100);
    const sa = a.streak || { count: 0, last: '' }, sb = b.streak || { count: 0, last: '' };
    m.streak = sa.last === sb.last ? { count: Math.max(sa.count, sb.count), last: sa.last } : (sa.last > sb.last ? sa : sb);
    const da = a.daily || { date: '', count: 0, chest: false }, db = b.daily || { date: '', count: 0, chest: false };
    m.daily = da.date === db.date ? { date: da.date, count: Math.max(da.count, db.count), chest: !!(da.chest || db.chest) } : (da.date > db.date ? da : db);
    return m;
  }

  const SYNC_SETTINGS = ['dailyGoal', 'sessionLength', 'inputMode', 'tenses', 'autoUnlock', 'featuredList'];
  const bumpSettings = () => { data.settingsT = Date.now(); };
  const settingsState = () => ({ t: data.settingsT || 0, s: Object.fromEntries(SYNC_SETTINGS.map((k) => [k, data.settings[k]])) });
  function applySettings(r) {
    if (!r || !r.s || (r.t || 0) <= (data.settingsT || 0)) return false;
    const def = defaultSettings();
    for (const k of SYNC_SETTINGS) if (k in r.s && typeof r.s[k] === typeof def[k]) data.settings[k] = r.s[k];
    data.settings.tenses = Object.assign(def.tenses, data.settings.tenses);
    data.settingsT = r.t;
    return true;
  }

  const verbsState = () => ({ verbs: data.customVerbs, tomb: data.verbMeta.tomb, hid: data.verbMeta.hid });
  /** Fusionne l'état distant des verbes : pour chaque verbe, l'événement le plus récent gagne (ajout, modification ou suppression). */
  function mergeVerbsState(r) {
    r = r || {};
    const L = verbsState();
    const rv = (r.verbs || []).map((v) => sanitizeVerb(v)).filter(Boolean);
    const out = { verbs: [], tomb: {}, hid: {} };
    const infs = new Set([...L.verbs.map((v) => v.inf), ...rv.map((v) => v.inf), ...Object.keys(L.tomb), ...Object.keys(r.tomb || {})]);
    for (const inf of infs) {
      const ev = [];
      const lv = L.verbs.find((v) => v.inf === inf), v2 = rv.find((v) => v.inf === inf);
      if (lv) ev.push({ t: lv.updated || 0, v: lv });
      if (v2) ev.push({ t: v2.updated || 0, v: v2 });
      if (L.tomb[inf]) ev.push({ t: L.tomb[inf], v: null });
      if ((r.tomb || {})[inf]) ev.push({ t: r.tomb[inf], v: null });
      const best = ev.reduce((x, y) => (y.t > x.t || (y.t === x.t && y.v) ? y : x));
      if (best.v) out.verbs.push(best.v); else out.tomb[inf] = best.t;
    }
    for (const inf of new Set([...Object.keys(L.hid), ...Object.keys(r.hid || {})])) {
      const x = L.hid[inf], y = (r.hid || {})[inf];
      out.hid[inf] = !x ? y : !y ? x : (y.t > x.t ? y : x);
    }
    const changed = stable(out) !== stable(L);
    data.customVerbs = out.verbs; data.verbMeta = { tomb: out.tomb, hid: out.hid }; syncHidden();
    return changed;
  }

  load();
  return {
    get data() { return data; }, get memoryOnly() { return memoryOnly; },
    save, load, onChange: (f) => listeners.push(f), today, dayNum, addDays,
    sanitizeVerb, setBase, baseVerbs, allVerbs, saveVerb, removeVerb, restoreVerb, mergeVerbs, encodeShare, decodeShare,
    profile, addProfile, selectProfile, deleteProfile, newProfile,
    stable, mergeProfile, settingsState, applySettings, bumpSettings, verbsState, mergeVerbsState,
    levelOf, xpFor, stageOf, STAGE_NAMES, key, card, review, isDue, mastery, touchDaily, bumpStreak, INTERVALS,
    reset() { data = emptyData(); save(true); },
    replaceAll(d) { data = Object.assign(emptyData(), d); data.settings = Object.assign(defaultSettings(), d.settings || {}); save(); },
  };
});
