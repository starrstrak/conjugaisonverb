/* Synchronisation entre appareils via Firestore (API REST, sans SDK).
   Les données restent d'abord sur l'appareil : la synchro est un « bonus » qui fusionne quand internet est là.
   Sécurité : le « code famille » (long, aléatoire) fait office de clé ; voir firestore.rules et SYNC.md. */
const Sync = (() => {
  let running = false, timer = null, again = false;
  const state = { status: 'off', last: 0, error: '' }; // off | idle | busy | error
  const listeners = [];
  const cfg = () => Store.data.sync;

  const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

  function randomCode(n = 24) {
    const a = 'abcdefghijkmnpqrstuvwxyz23456789'; // sans caractères ambigus
    const b = new Uint8Array(n); crypto.getRandomValues(b);
    return Array.from(b, (x) => a[x % a.length]).join('');
  }

  /** Accepte du JSON ou le bloc « const firebaseConfig = {...} » copié depuis la console Firebase */
  function parseFirebaseConfig(text) {
    const k = /apiKey["']?\s*:\s*["']([^"']+)["']/.exec(text);
    const p = /projectId["']?\s*:\s*["']([^"']+)["']/.exec(text);
    if (!k || !p) return null;
    if (!/^[A-Za-z0-9_-]{20,60}$/.test(k[1]) || !/^[a-z0-9-]{4,40}$/.test(p[1])) return null;
    return { pid: p[1], key: k[1] };
  }

  const url = (name, extra = '') => `https://firestore.googleapis.com/v1/projects/${cfg().pid}/databases/(default)/documents/families/${cfg().fid}/docs/${name}?key=${cfg().key}${extra}`;

  async function getDoc(name) {
    const r = await fetch(url(name));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(r.status === 403 ? 'Accès refusé (vérifie les règles Firestore)' : `Erreur ${r.status}`);
    const d = await r.json();
    try { return JSON.parse(d.fields.j.stringValue); } catch (e) { return null; }
  }
  async function putDoc(name, obj) {
    const body = { fields: { j: { stringValue: JSON.stringify(obj) }, t: { integerValue: String(Date.now()) } } };
    const r = await fetch(url(name, '&updateMask.fieldPaths=j&updateMask.fieldPaths=t'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.status === 403 ? 'Écriture refusée (vérifie les règles Firestore)' : `Erreur ${r.status}`);
  }

  function emit() { listeners.forEach((f) => f(state)); }
  function set(status, error = '') { state.status = status; state.error = error; emit(); }

  async function run() {
    if (!cfg()) { set('off'); return; }
    if (running) { again = true; return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { set('error', 'Pas de connexion'); return; }
    running = true; set('busy');
    let changedVerbs = false, changedSettings = false, changedProfiles = false;
    try {
      const scope = cfg().scope || 'all';
      const S = Store.data;
      // 1. verbes
      const rv = await getDoc('verbs');
      changedVerbs = Store.mergeVerbsState(rv || {});
      if (!rv || Store.stable(Store.verbsState()) !== Store.stable(rv)) await putDoc('verbs', Store.verbsState());
      // 2. réglages
      const rs = await getDoc('settings');
      changedSettings = Store.applySettings(rs);
      const ls = Store.settingsState();
      if (!rs || (ls.t || 0) > (rs.t || 0)) { if (ls.t) await putDoc('settings', ls); }
      // 3. joueurs
      if (scope === 'all') {
        const meta = (await getDoc('meta')) || { profiles: [], delP: {} };
        const delP = Object.assign({}, meta.delP || {});
        for (const [id, t] of Object.entries(S.delP || {})) delP[id] = Math.max(delP[id] || 0, t);
        S.delP = Object.assign({}, delP);
        // suppressions
        const before = S.profiles.length;
        S.profiles = S.profiles.filter((p) => !(delP[p.id] && delP[p.id] >= (p.created || 0)));
        if (S.profiles.length !== before) { changedProfiles = true; if (!S.profiles.some((p) => p.id === S.current)) S.current = S.profiles[0] ? S.profiles[0].id : ''; }
        const ids = new Set([...(meta.profiles || []), ...S.profiles.map((p) => p.id)]);
        for (const id of ids) {
          if (delP[id]) continue;
          const remote = await getDoc('p_' + id);
          let local = S.profiles.find((p) => p.id === id);
          if (remote && local) {
            const merged = Store.mergeProfile(local, remote);
            if (Store.stable(merged) !== Store.stable(local)) { Object.assign(local, merged); changedProfiles = true; }
            if (Store.stable(merged) !== Store.stable(remote)) await putDoc('p_' + id, merged);
          } else if (remote && !local) {
            S.profiles.push(Object.assign(Store.newProfile(remote.name || '?'), remote)); changedProfiles = true;
            if (!S.current) S.current = id;
          } else if (local) await putDoc('p_' + id, local);
        }
        const ids2 = S.profiles.map((p) => p.id).sort();
        if (Store.stable({ p: ids2, d: delP }) !== Store.stable({ p: [...(meta.profiles || [])].sort(), d: meta.delP || {} })) await putDoc('meta', { profiles: ids2, delP });
      }
      cfg().last = Date.now();
      Store.save(true);
      set('idle');
    } catch (e) {
      set('error', e && e.message ? e.message : 'Erreur de synchronisation');
    } finally {
      running = false;
    }
    if (changedVerbs || changedSettings || changedProfiles) { state.changed = { verbs: changedVerbs, settings: changedSettings, profiles: changedProfiles }; listeners.forEach((f) => f(state, true)); }
    if (again) { again = false; queue(1500); }
  }

  function queue(ms = 4000) {
    if (!cfg()) return;
    clearTimeout(timer); timer = setTimeout(run, ms);
  }

  function enable({ pid, key, fid, scope }) {
    Store.data.sync = { pid, key, fid: fid || randomCode(), scope: scope || 'all', last: 0 };
    Store.save(true);
    state.status = 'idle'; emit();
    return run();
  }
  function disable() { Store.data.sync = null; Store.save(true); set('off'); }

  /** Lien à envoyer pour qu'un autre appareil rejoigne la famille */
  function joinLink(scope) {
    const c = cfg(); if (!c) return '';
    return location.origin + location.pathname + '#sync=' + b64url(JSON.stringify({ p: c.pid, k: c.key, f: c.fid, s: scope }));
  }
  function parseJoin(code) {
    try {
      const o = JSON.parse(unb64url(code));
      if (!/^[a-z0-9-]{4,40}$/.test(o.p) || !/^[A-Za-z0-9_-]{20,60}$/.test(o.k) || !/^[a-z2-9]{16,40}$/.test(o.f)) return null;
      return { pid: o.p, key: o.k, fid: o.f, scope: o.s === 'verbs' ? 'verbs' : 'all' };
    } catch (e) { return null; }
  }

  // synchro automatique : au retour sur l'appli, quand internet revient, et après chaque enregistrement
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') queue(800); });
    window.addEventListener('online', () => queue(500));
    Store.onChange(() => queue(5000));
  }

  return { state, run, queue, enable, disable, joinLink, parseJoin, parseFirebaseConfig, randomCode, onChange: (f) => listeners.push(f), get on() { return !!cfg(); } };
})();
