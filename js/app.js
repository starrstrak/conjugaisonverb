/* Interface enfant : accueil, aventure, jeu, mémo, trophées, boutique. */
const { PERSONS, TENSES, TENSE_BY_ID, personsOf } = Conj;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const first = (c) => Conj.accepted(c)[0];
const plainText = (s) => String(s).replace(/\(e\)|\(s\)/g, '');

const A = { verbs: [], view: 'home', params: {}, S: null, cache: new Map(), gateUntil: 0 };

const settings = () => Store.data.settings;
const prof = () => Store.profile();

/* ---------- verbes & conjugaisons ---------- */
function refreshVerbs() { A.verbs = Store.allVerbs(); A.cache.clear(); }
function forms(v) {
  const k = v.inf + '|' + (v.updated || 0) + '|' + (v._mod ? 'm' : '');
  let f = A.cache.get(k);
  if (!f) { f = Conj.conjugate(v); A.cache.set(k, f); }
  return f;
}
const cellsOf = (v, t) => { const f = forms(v)[t]; return f ? personsOf(t).filter((p) => f[p] && f[p].t) : []; };
const verbByInf = (inf) => A.verbs.find((v) => v.inf === inf);
const typeLabel = (v) => ({ er: 'verbe en -er', ir2: 'verbe en -ir (finir)', re: 'verbe en -re', irr: 'verbe rebelle' }[v.type]);

function starsTotal(p) { return Object.values(p.stars).reduce((a, b) => a + b, 0); }
function tenseAvailable(t, p) {
  if (settings().tenses[t.id]) return true;
  return !t.core && settings().autoUnlock !== false && p && starsTotal(p) >= 12;
}
const activeTenses = () => TENSES.filter((t) => tenseAvailable(t, prof()));

function fmt(c) {
  if (!c) return '';
  const t = c.t;
  if (c.e && t.endsWith(c.e)) return esc(t.slice(0, t.length - c.e.length)) + `<b class="end">${esc(c.e)}</b>`;
  return esc(t);
}

/* ---------- missions (générées à partir des verbes : les ajouts apparaissent tout seuls) ---------- */
function missionsFor(tenseId) {
  const vs = A.verbs.filter((v) => cellsOf(v, tenseId).length);
  const M = [];
  const add = (id, name, emoji, f, min = 2) => { const pool = vs.filter(f); if (pool.length >= min) M.push({ id, name, emoji, verbs: pool }); };
  add('aux', 'Être et avoir', '👑', (v) => ['être', 'avoir'].includes(v.inf), 1);
  add('er', 'Verbes en -er', '🌈', (v) => v.type === 'er');
  add('ir2', 'Verbes en -ir (finir)', '🍀', (v) => v.type === 'ir2');
  add('re', 'Verbes en -re', '🔧', (v) => v.type === 're');
  add('irr', 'Verbes rebelles', '🐉', (v) => v.type === 'irr' && !['être', 'avoir'].includes(v.inf));
  const lists = [...new Set(vs.flatMap((v) => v.lists || []))];
  lists.forEach((l) => add('list:' + l, l, '📚', (v) => (v.lists || []).includes(l), 1));
  if (vs.length >= 8) M.push({ id: 'mix', name: 'Mélange mystère', emoji: '🎩', verbs: vs });
  return M;
}
const starsFor = (p, tense, mid) => p.stars[`${tense}|${mid}`] || 0;

/* ---------- vues ---------- */
function setView(html) {
  const app = $('#app');
  app.innerHTML = html;
  app.scrollTop = 0; window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
function go(view, params = {}) {
  A.view = view; A.params = params;
  clearTimerIfAny();
  render();
}
function render() {
  const p = prof();
  document.body.dataset.theme = (p && p.equipped.theme) || '';
  document.body.classList.toggle('easy', !!settings().easyFont);
  FX.configure({ sound: settings().sound, speech: settings().speech });
  const inGame = A.view === 'game';
  $('#nav').hidden = inGame || !p || ['welcome', 'parent'].includes(A.view);
  $('#top').hidden = inGame || !p || A.view === 'welcome';
  if (!p && A.view !== 'welcome') { A.view = 'welcome'; }
  if (A.view !== 'welcome' && p) renderTop(p);
  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === navOf(A.view)));
  (views[A.view] || views.home)(A.params);
}
const navOf = (v) => ({ home: 'home', adventure: 'adventure', world: 'adventure', setup: 'adventure', memo: 'memo', trophies: 'trophies', shop: 'trophies' }[v] || '');

function renderTop(p) {
  const lvl = Store.levelOf(p.xp);
  const cur = p.xp - Store.xpFor(lvl), need = Store.xpFor(lvl + 1) - Store.xpFor(lvl);
  $('#top').innerHTML = `
    <button class="chip who" data-act="profiles" aria-label="Changer de joueur"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</button>
    <span class="chip" title="Jours d'affilée">🔥 ${p.streak.count}</span>
    <span class="chip lvl" title="Niveau ${lvl}">⭐ ${lvl}<i class="bar"><u style="width:${Math.round((cur / need) * 100)}%"></u></i></span>
    <span class="chip" title="Pièces">🪙 ${p.coins}</span>
    <button class="chip ghost" data-act="parent" aria-label="Espace parents">🔒</button>`;
}

const views = {};

/* ----- accueil de bienvenue / profils ----- */
const COLORS = ['#7bd88f', '#6ec6ff', '#ff9ecf', '#ffb35c', '#b79cff', '#ff7676', '#ffd93d'];
views.welcome = () => {
  const ps = Store.data.profiles;
  setView(`<section class="welcome card">
    <div class="center">${FX.mascot({ stage: 1, mood: 'cheer', size: 150 })}</div>
    <h1>Salut ! Moi c'est Conjugo 🐉</h1>
    <p class="lead">Avec moi, tu vas devenir un champion des verbes. Prêt ?</p>
    ${ps.length ? `<h3>Qui joue ?</h3><div class="profiles">${ps.map((p) => `<button class="pbtn" data-act="pick-profile" data-id="${esc(p.id)}"><span class="dot big" style="background:${esc(p.color)}"></span>${esc(p.name)}</button>`).join('')}</div><hr>` : ''}
    <h3>${ps.length ? 'Nouveau joueur' : 'Comment tu t\'appelles ?'}</h3>
    <form id="newp" autocomplete="off">
      <input name="name" maxlength="20" placeholder="Ton prénom" required aria-label="Ton prénom">
      <div class="colors">${COLORS.map((c, i) => `<label><input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>
      <button class="big primary" type="submit">C'est parti ! 🚀</button>
    </form></section>`);
  $('#newp').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('name')).trim();
    if (!name) return;
    Store.addProfile(name, f.get('color'));
    FX.play('win'); go('home');
  });
};

/* ----- accueil ----- */
function messageFor(p) {
  const d = Store.touchDaily(p);
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Bonjour' : hour < 18 ? 'Salut' : 'Bonsoir';
  if (!p.stats.sessions) return `${hi} ${p.name} ! On fait notre première partie ?`;
  if (d.count >= settingsGoal()) return `Objectif du jour atteint, bravo ${p.name} ! 🎉 Tu veux continuer ?`;
  if (p.streak.last !== Store.today() && p.streak.count >= 2) return `Ta flamme de ${p.streak.count} jours t'attend ! 🔥`;
  const due = dueCount(p);
  if (due >= 5) return `${due} verbes à revoir aujourd'hui. On y va ?`;
  return pick([`${hi} ${p.name} ! Quel verbe vas-tu dompter ?`, 'Un petit défi ?', 'Les verbes ont hâte de te revoir !', 'Chaque erreur te rend plus fort 💪']);
}
const settingsGoal = () => settings().dailyGoal || 20;
function dueCount(p) {
  let n = 0;
  for (const [k, c] of Object.entries(p.cards)) {
    if (!Store.isDue(c)) continue;
    const [inf, t, pp] = k.split('|');
    const v = verbByInf(inf);
    if (v && TENSE_BY_ID[t] && tenseAvailable(TENSE_BY_ID[t], p) && cellsOf(v, t).includes(+pp)) n++;
  }
  return n;
}
const errorCount = (p) => Object.entries(p.cards).filter(([k, c]) => c.w > 0 && c.b <= 1 && c.fix).length;

views.home = () => {
  const p = prof();
  const d = Store.touchDaily(p);
  const goal = settingsGoal(), pct = Math.min(100, Math.round((d.count / goal) * 100));
  const lvl = Store.levelOf(p.xp), stage = Store.stageOf(lvl);
  const due = dueCount(p), errs = errorCount(p);
  const feat = settings().featuredList;
  const featVerbs = feat ? A.verbs.filter((v) => (v.lists || []).includes(feat)) : [];
  setView(`
  <section class="hero">
    <div class="mascot-wrap">${FX.mascot({ stage, mood: 'happy', color: skinOf(p), hat: p.equipped.hat, glasses: p.equipped.glasses, size: 170 })}
      <small class="stage">${esc(Store.STAGE_NAMES[stage])} · niveau ${lvl}</small></div>
    <div class="bubble">${esc(messageFor(p))}</div>
  </section>
  <section class="daily card">
    <div class="ring" style="--pct:${pct}"><span>${d.count}<small>/${goal}</small></span></div>
    <div><b>Objectif du jour</b><br><small>${d.chest ? '🎁 Coffre ouvert, bravo !' : `Réponds à ${goal} questions pour ouvrir le coffre 🎁`}</small></div>
  </section>
  <button class="big primary play" data-act="review">▶ Jouer<small>${due ? `${due} à revoir aujourd'hui` : 'Révision du jour'}</small></button>
  ${featVerbs.length ? `<button class="card featured" data-act="featured">📚 <b>${esc(feat)}</b><small>${featVerbs.length} verbes choisis pour toi</small></button>` : ''}
  <section class="tiles">
    <button class="tile t-adv" data-go="adventure"><span>🗺️</span>Aventure</button>
    <button class="tile t-chrono" data-act="setup-chrono"><span>⏱️</span>Défi chrono</button>
    <button class="tile t-free" data-act="setup-practice"><span>🎯</span>Je choisis</button>
    <button class="tile t-err" data-act="errors" ${errs ? '' : 'data-empty="1"'}><span>🩹</span>Mes erreurs${errs ? `<em>${errs}</em>` : ''}</button>
    <button class="tile t-memo" data-go="memo"><span>📖</span>Mémo</button>
    <button class="tile t-trophy" data-go="trophies"><span>🏆</span>Trophées</button>
    <button class="tile t-shop" data-go="shop"><span>🎒</span>Boutique</button>
  </section>
  ${Store.memoryOnly ? '<p class="warn">⚠️ La sauvegarde est désactivée dans ce navigateur : la progression sera perdue à la fermeture.</p>' : ''}
  ${installHint()}`);
};
const skinOf = (p) => p.color;
function installHint() {
  if (window.matchMedia && matchMedia('(display-mode: standalone)').matches) return '';
  if (A.deferredInstall) return '<button class="card install" data-act="install">📲 <b>Installer l\'appli</b><small>Pour jouer même sans internet</small></button>';
  return '<button class="card install" data-act="install-help">📲 <b>Mettre l\'appli sur l\'écran d\'accueil</b><small>Pour jouer à tout moment, même sans internet</small></button>';
}

/* ----- aventure ----- */
views.adventure = () => {
  const p = prof();
  const avail = TENSES.filter((t) => tenseAvailable(t, p));
  const locked = TENSES.filter((t) => !tenseAvailable(t, p));
  const card = (t, lock) => {
    const ms = lock ? [] : missionsFor(t.id);
    const got = ms.reduce((s, m) => s + starsFor(p, t.id, m.id), 0), max = ms.length * 3;
    return `<button class="world ${lock ? 'locked' : ''}" style="--c:${t.color}" ${lock ? 'data-act="locked"' : `data-act="world" data-t="${t.id}"`}>
      <span class="e">${lock ? '🔒' : t.emoji}</span><b>${esc(t.name)}</b>
      <small>${lock ? 'Gagne 12 ⭐ pour débloquer' : `${got}/${max} ⭐`}</small>
      ${lock ? '' : `<i class="bar"><u style="width:${max ? (got / max) * 100 : 0}%"></u></i>`}</button>`;
  };
  setView(`<h2 class="title">🗺️ Choisis ton monde</h2><div class="worlds">${avail.map((t) => card(t)).join('')}${locked.filter((t) => !t.core).map((t) => card(t, true)).join('')}</div>`);
};
views.world = ({ t }) => {
  const p = prof(), T = TENSE_BY_ID[t], ms = missionsFor(t);
  setView(`<button class="back" data-go="adventure">← Mondes</button>
  <h2 class="title" style="color:${T.color}">${T.emoji} ${esc(T.name)}</h2>
  <details class="lesson card" open><summary>💡 La leçon en 10 secondes</summary><p>${esc(T.tip)}</p>
    <button class="small" data-act="memo-tense" data-t="${t}">Voir les tableaux</button></details>
  <div class="path">${ms.map((m, i) => {
    const s = starsFor(p, t, m.id);
    return `<button class="node" style="--c:${T.color}" data-act="mission" data-t="${t}" data-m="${esc(m.id)}" style="animation-delay:${i * 60}ms">
      <span class="e">${m.emoji}</span><span class="n"><b>${esc(m.name)}</b><small>${m.verbs.length} verbe${m.verbs.length > 1 ? 's' : ''}</small></span>
      <span class="stars">${[1, 2, 3].map((k) => `<i class="${k <= s ? 'on' : ''}">★</i>`).join('')}</span></button>`;
  }).join('') || '<p>Aucun verbe disponible pour ce temps.</p>'}</div>`);
};

/* ----- préparation entraînement libre / chrono ----- */
views.setup = ({ mode }) => {
  const p = prof(), avail = activeTenses();
  const sel = A.params.sel || { tenses: [avail[0].id], verbs: null, filter: '' };
  A.params.sel = sel;
  const chrono = mode === 'chrono';
  const verbs = A.verbs.filter((v) => sel.tenses.some((t) => cellsOf(v, t).length));
  if (!sel.verbs) sel.verbs = new Set(verbs.map((v) => v.inf));
  const fl = sel.filter.toLowerCase();
  setView(`<button class="back" data-go="home">← Accueil</button>
  <h2 class="title">${chrono ? '⏱️ Défi chrono' : '🎯 Je choisis'}</h2>
  ${chrono ? `<p class="lead">60 secondes : réponds à un maximum de questions ! Meilleur score : <b>${p.stats.chronoBest}</b></p>` : ''}
  <h3>Quels temps ?</h3>
  <div class="chips">${avail.map((t) => `<button class="pill ${sel.tenses.includes(t.id) ? 'on' : ''}" style="--c:${t.color}" data-act="tog-tense" data-t="${t.id}">${t.emoji} ${esc(t.name)}</button>`).join('')}</div>
  <h3>Quels verbes ? <small>(${[...sel.verbs].filter((i) => verbs.some((v) => v.inf === i)).length}/${verbs.length})</small></h3>
  <div class="row"><input id="vfilter" placeholder="Chercher un verbe…" value="${esc(sel.filter)}" aria-label="Chercher un verbe">
    <button class="small" data-act="verbs-all">Tous</button><button class="small" data-act="verbs-none">Aucun</button></div>
  <div class="chips verbs">${verbs.filter((v) => !fl || v.inf.includes(fl)).map((v) => `<button class="pill ${sel.verbs.has(v.inf) ? 'on' : ''}" data-act="tog-verb" data-v="${esc(v.inf)}">${esc(v.emoji || '')} ${esc(v.inf)}</button>`).join('')}</div>
  <button class="big primary sticky" data-act="start-setup" data-mode="${mode}">Commencer ▶</button>`);
  const f = $('#vfilter');
  f.addEventListener('input', () => { sel.filter = f.value; const pos = f.selectionStart; views.setup({ mode, sel }); const nf = $('#vfilter'); nf.focus(); nf.setSelectionRange(pos, pos); });
};

/* ----- mémo ----- */
views.memo = ({ inf, t, q } = {}) => {
  const vs = A.verbs.slice().sort((a, b) => a.inf.localeCompare(b.inf, 'fr'));
  const v = verbByInf(inf) || null;
  const tense = t || 'present';
  const T = TENSE_BY_ID[tense];
  let body = '';
  if (v) {
    const f = forms(v)[tense];
    const ps = personsOf(tense);
    const speakAll = f ? ps.filter((p) => f[p]).map((p) => `${Conj.pronoun(p, first(f[p]))} ${plainText(first(f[p]))}`).join('. ') : '';
    body = `<div class="card verbcard">
      <div class="vhead"><span class="big-e">${esc(v.emoji || '📘')}</span><div><h2>${esc(v.inf)}</h2><small>${esc(typeLabel(v))} · auxiliaire ${v.aux === 'etre' ? 'être' : 'avoir'} · participe passé <b>${esc(v.pp)}</b></small>${v.def ? `<br><small>${esc(v.def)}</small>` : ''}</div>
      <button class="small" data-act="say" data-text="${esc(speakAll)}" aria-label="Écouter">🔊</button></div>
      <div class="tabs">${TENSES.map((x) => `<button class="${x.id === tense ? 'on' : ''}" style="--c:${x.color}" data-act="memo-tab" data-v="${esc(v.inf)}" data-t="${x.id}">${x.emoji} ${esc(x.name)}</button>`).join('')}</div>
      ${f ? `<table class="conj" style="--c:${T.color}">${ps.map((p) => f[p] ? `<tr><th>${esc(Conj.pronoun(p, first(f[p])))}${Conj.pronoun(p, first(f[p])).endsWith("'") ? '' : ''}</th><td>${fmt(f[p])}</td></tr>` : '').join('')}</table>`
        : '<p class="muted">Ce verbe n\'a pas de forme à ce temps.</p>'}
      <p class="tip">💡 ${esc(T.tip)}</p>
      <button class="primary" data-act="practice-verb" data-v="${esc(v.inf)}" data-t="${tense}">S'entraîner avec « ${esc(v.inf)} » ▶</button></div>`;
  }
  const fl = (q || '').toLowerCase();
  setView(`<h2 class="title">📖 Mémo conjugaison</h2>
    <input id="mq" placeholder="Chercher un verbe…" value="${esc(q || '')}" aria-label="Chercher un verbe">
    ${body}
    <div class="chips verbs">${vs.filter((x) => !fl || x.inf.includes(fl)).map((x) => `<button class="pill ${v && x.inf === v.inf ? 'on' : ''}" data-act="memo-verb" data-v="${esc(x.inf)}" data-t="${tense}">${esc(x.emoji || '')} ${esc(x.inf)}</button>`).join('')}</div>`);
  const mq = $('#mq');
  mq.addEventListener('input', () => { const pos = mq.selectionStart; views.memo({ inf, t, q: mq.value }); const n = $('#mq'); n.focus(); n.setSelectionRange(pos, pos); A.params = { inf, t, q: mq.value }; });
};

/* ----- trophées ----- */
const BADGES = [
  { id: 'first', name: 'Premier pas', emoji: '👣', desc: 'Termine ta première partie', test: (p) => p.stats.sessions >= 1 },
  { id: 'combo5', name: 'En feu', emoji: '🔥', desc: '5 bonnes réponses d\'affilée', test: (p) => p.stats.bestCombo >= 5 },
  { id: 'combo10', name: 'Inarrêtable', emoji: '⚡', desc: '10 bonnes réponses d\'affilée', test: (p) => p.stats.bestCombo >= 10 },
  { id: 'perfect', name: 'Sans faute', emoji: '💯', desc: 'Une partie parfaite', test: (p) => p.stats.perfect >= 1 },
  { id: 'perfect5', name: 'Perfectionniste', emoji: '💎', desc: '5 parties parfaites', test: (p) => p.stats.perfect >= 5 },
  { id: 'q100', name: 'Centurion', emoji: '🛡️', desc: '100 bonnes réponses', test: (p) => p.stats.correct >= 100 },
  { id: 'q500', name: 'Grand maître', emoji: '👑', desc: '500 bonnes réponses', test: (p) => p.stats.correct >= 500 },
  { id: 'streak3', name: 'Petite flamme', emoji: '🕯️', desc: '3 jours d\'affilée', test: (p) => p.streak.count >= 3 },
  { id: 'streak7', name: 'Semaine de feu', emoji: '🏮', desc: '7 jours d\'affilée', test: (p) => p.streak.count >= 7 },
  { id: 'streak30', name: 'Légende', emoji: '🌟', desc: '30 jours d\'affilée', test: (p) => p.streak.count >= 30 },
  { id: 'fixer', name: 'Chasseur d\'erreurs', emoji: '🔧', desc: 'Corrige 10 erreurs', test: (p) => p.stats.fixed >= 10 },
  { id: 'explorer', name: 'Explorateur', emoji: '🧭', desc: 'Joue avec 4 temps différents', test: (p) => new Set(Object.keys(p.cards).map((k) => k.split('|')[1])).size >= 4 },
  { id: 'verbs20', name: 'Collectionneur', emoji: '📚', desc: 'Réussis 20 verbes différents', test: (p) => new Set(Object.entries(p.cards).filter(([, c]) => c.c > 0).map(([k]) => k.split('|')[0])).size >= 20 },
  { id: 'chrono', name: 'Éclair', emoji: '⏱️', desc: '15 bonnes réponses au défi chrono', test: (p) => p.stats.chronoBest >= 15 },
  { id: 'master', name: 'Maître d\'un temps', emoji: '🏅', desc: 'Maîtrise un verbe à un temps entier', test: (p) => masteredCount(p) >= 1 },
  { id: 'stars10', name: 'Chasseur d\'étoiles', emoji: '✨', desc: 'Gagne 10 étoiles', test: (p) => starsTotal(p) >= 10 },
  { id: 'lvl5', name: 'Dragonneau', emoji: '🐲', desc: 'Atteins le niveau 5', test: (p) => Store.levelOf(p.xp) >= 5 },
];
function masteredCount(p) {
  const seen = new Set(Object.keys(p.cards).map((k) => k.split('|').slice(0, 2).join('|')));
  let n = 0;
  for (const s of seen) {
    const [inf, t] = s.split('|'); const v = verbByInf(inf);
    if (v && TENSE_BY_ID[t] && cellsOf(v, t).length && Store.mastery(p, inf, t, cellsOf(v, t)) === 1) n++;
  }
  return n;
}
views.trophies = () => {
  const p = prof();
  const total = p.stats.correct + p.stats.wrong;
  const acc = total ? Math.round((p.stats.correct / total) * 100) : 0;
  setView(`<h2 class="title">🏆 Mes trophées</h2>
  <section class="stats card"><div><b>${p.stats.correct}</b><small>bonnes réponses</small></div><div><b>${acc}%</b><small>de réussite</small></div><div><b>${p.stats.bestCombo}</b><small>meilleur combo</small></div><div><b>${masteredCount(p)}</b><small>temps maîtrisés</small></div></section>
  <div class="badges">${BADGES.map((b) => `<div class="badge ${p.badges[b.id] ? 'got' : ''}"><span>${p.badges[b.id] ? b.emoji : '❔'}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>`);
};

/* ----- boutique ----- */
const SHOP = [
  ...['🎩:Haut-de-forme:30', '🧢:Casquette:25', '👑:Couronne:80', '🎓:Chapeau de diplômé:50', '🎀:Nœud:25', '🤠:Cowboy:40', '🌸:Fleur:20'].map((s) => { const [v, n, pr] = s.split(':'); return { id: 'hat:' + v, kind: 'hat', val: v, name: n, price: +pr }; }),
  ...['🕶️:Lunettes de soleil:40', '👓:Lunettes rondes:25', '🥽:Lunettes de plongée:35'].map((s) => { const [v, n, pr] = s.split(':'); return { id: 'glasses:' + v, kind: 'glasses', val: v, name: n, price: +pr }; }),
  ...[['space', 'Espace', '🌌'], ['ocean', 'Océan', '🌊'], ['forest', 'Forêt', '🌲'], ['candy', 'Bonbons', '🍭']].map(([v, n, e]) => ({ id: 'theme:' + v, kind: 'theme', val: v, name: n, emoji: e, price: 60 })),
];
views.shop = () => {
  const p = prof();
  const lvl = Store.levelOf(p.xp), stage = Store.stageOf(lvl);
  const item = (it) => {
    const own = p.owned.includes(it.id) || it.price === 0;
    const on = p.equipped[it.kind] === it.val;
    return `<button class="item ${on ? 'on' : ''}" data-act="${own ? 'equip' : 'buy'}" data-id="${esc(it.id)}"><span class="e">${it.emoji || it.val}</span><small>${esc(it.name)}</small>
      <em>${on ? 'Porté ✔' : own ? 'Mettre' : `🪙 ${it.price}`}</em></button>`;
  };
  setView(`<h2 class="title">🎒 Boutique</h2><p class="coins">🪙 <b>${p.coins}</b> pièces</p>
  <div class="center preview">${FX.mascot({ stage, mood: 'cheer', color: p.color, hat: p.equipped.hat, glasses: p.equipped.glasses, size: 170 })}</div>
  <h3>Chapeaux</h3><div class="items">${item({ id: 'hat:', kind: 'hat', val: '', name: 'Aucun', emoji: '🚫', price: 0 })}${SHOP.filter((i) => i.kind === 'hat').map(item).join('')}</div>
  <h3>Lunettes</h3><div class="items">${item({ id: 'glasses:', kind: 'glasses', val: '', name: 'Aucune', emoji: '🚫', price: 0 })}${SHOP.filter((i) => i.kind === 'glasses').map(item).join('')}</div>
  <h3>Décors</h3><div class="items">${item({ id: 'theme:', kind: 'theme', val: '', name: 'Ciel', emoji: '☁️', price: 0 })}${SHOP.filter((i) => i.kind === 'theme').map(item).join('')}</div>
  <h3>Couleur de Conjugo</h3><div class="items">${COLORS.map((c) => { const own = p.owned.includes('skin:' + c); const price = c === '#7bd88f' ? 0 : c === '#ffd93d' ? 25 : 15; return `<button class="item ${p.color === c ? 'on' : ''}" data-act="${own || !price ? 'skin' : 'buyskin'}" data-c="${c}" data-price="${price}"><span class="swatch" style="background:${c}"></span><em>${p.color === c ? 'Choisi ✔' : own || !price ? 'Choisir' : `🪙 ${price}`}</em></button>`; }).join('')}</div>`);
};

/* ---------- JEU ---------- */
function activeTensesForPool(ids) { return ids.filter((id) => TENSE_BY_ID[id]); }
function buildPool(tenseIds, verbs) {
  const pool = [];
  for (const v of verbs) for (const t of tenseIds) for (const p of cellsOf(v, t)) pool.push({ v, t, p, k: Store.key(v.inf, t, p) });
  return pool;
}
function reviewPool(p, n) {
  const pool = [];
  for (const [k, c] of Object.entries(p.cards)) {
    if (!Store.isDue(c)) continue;
    const [inf, t, pp] = k.split('|'); const v = verbByInf(inf);
    if (v && TENSE_BY_ID[t] && tenseAvailable(TENSE_BY_ID[t], p) && cellsOf(v, t).includes(+pp)) pool.push({ v, t, p: +pp, k });
  }
  if (pool.length >= n) return pool;
  // compléter avec des cartes nouvelles du premier temps pas encore acquis
  const avail = activeTenses();
  const frontier = avail.find((t) => t.core && missionsFor(t.id).reduce((s, m) => s + starsFor(p, t.id, m.id), 0) < 3) || avail[0];
  const easy = A.verbs.filter((v) => cellsOf(v, frontier.id).length && (['être', 'avoir'].includes(v.inf) || v.type === 'er' || pool.some((x) => x.v === v)));
  const have = new Set(pool.map((x) => x.k));
  buildPool([frontier.id], easy.length >= 4 ? easy : A.verbs).forEach((it) => { if (!have.has(it.k) && !p.cards[it.k]) pool.push(it); });
  return pool.length ? pool : buildPool([frontier.id], A.verbs);
}
function errorsPool(p) {
  const pool = [];
  for (const [k, c] of Object.entries(p.cards)) {
    if (!(c.w > 0 && c.b <= 1)) continue;
    const [inf, t, pp] = k.split('|'); const v = verbByInf(inf);
    if (v && TENSE_BY_ID[t] && cellsOf(v, t).includes(+pp)) pool.push({ v, t, p: +pp, k });
  }
  return pool;
}

function weightOf(c) {
  if (!c) return 3;
  return [8, 5, 3, 1.5, 0.6][c.b] * (Store.isDue(c) ? 1.5 : 0.7) + (c.fix ? 3 : 0);
}
function pickItem(S) {
  const p = prof();
  const cand = S.pool.length > 1 ? S.pool.filter((it) => it.k !== S.lastKey && !S.recent.includes(it.k)) : S.pool;
  const list = cand.length ? cand : S.pool;
  const ws = list.map((it) => weightOf(p.cards[it.k]));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

function startSession(cfg) {
  const p = prof();
  const pool = cfg.pool || buildPool(cfg.tenses, cfg.verbs);
  if (!pool.length) { toast('Pas assez de verbes pour jouer 😕'); return; }
  const n = cfg.n || (Store.data.settings.sessionLength || 10);
  A.S = { cfg, pool, n, asked: 0, answered: 0, first: 0, combo: 0, maxCombo: 0, xp: 0, coins: 0, mistakes: [], retry: [], lastKey: '', recent: [],
    timeLeft: cfg.timed ? 60 : null, paused: false, q: null, lvl0: Store.levelOf(p.xp), levelUps: [], startedAt: Date.now() };
  Store.touchDaily(p);
  A.view = 'game';
  render();
  if (cfg.timed) startTimer();
  nextQuestion();
}
let timerId = null;
function startTimer() {
  clearTimerIfAny();
  timerId = setInterval(() => {
    const S = A.S; if (!S || S.paused) return;
    S.timeLeft--;
    const el = $('#timer'); if (el) { el.textContent = S.timeLeft; el.classList.toggle('low', S.timeLeft <= 10); }
    if (S.timeLeft <= 5 && S.timeLeft > 0) FX.play('tick');
    if (S.timeLeft <= 0) { clearTimerIfAny(); finishSession(); }
  }, 1000);
}
function clearTimerIfAny() { if (timerId) { clearInterval(timerId); timerId = null; } }

function markerFor(t) { return pick(TENSE_BY_ID[t].markers); }

function nextQuestion() {
  const S = A.S; if (!S) return;
  S.paused = false;
  let item = null, isRetry = false;
  const rIdx = S.retry.findIndex((r) => S.asked - r.at >= 2 || (!S.cfg.timed && S.asked >= S.n));
  if (rIdx >= 0) { item = S.retry.splice(rIdx, 1)[0].item; isRetry = true; }
  else if (!S.cfg.timed && S.asked >= S.n) { finishSession(); return; }
  else { item = pickItem(S); S.asked++; }
  S.lastKey = item.k; S.recent.push(item.k); if (S.recent.length > 3) S.recent.shift();
  S.q = buildQuestion(item, isRetry);
  renderQuestion();
}

function buildQuestion(item, isRetry) {
  const p = prof(), S = A.S;
  const c = p.cards[item.k], b = c ? c.b : 0;
  const f = forms(item.v), cell = f[item.t][item.p];
  const mode = settings().inputMode;
  let type = S.cfg.timed ? 'choice' : mode === 'choice' ? 'choice' : mode === 'type' ? 'type' : b >= 2 ? 'type' : 'choice';
  const q = { item, v: item.v, t: item.t, p: item.p, k: item.k, cell, type, retry: isRetry, marker: markerFor(item.t), t0: Date.now() };
  const full = personsOf(item.t).length === 6;
  if (!isRetry && b >= 1 && full && Math.random() < 0.14) {
    const r = recogPronoun(q); if (r) return r;
  }
  if (!isRetry && b >= 1 && Math.random() < 0.14) {
    const r = recogTense(q); if (r) return r;
  }
  if (q.type === 'choice') q.options = makeChoices(q);
  return q;
}

/** 4 propositions : la bonne + des erreurs « typiques » (autre personne, autre temps, mauvaise terminaison, mauvais auxiliaire) */
function makeChoices(q) {
  const f = forms(q.v), exp = plainText(first(q.cell));
  const key = (s) => Conj.clean(plainText(s));
  const acceptedKeys = new Set(Conj.accepted(q.cell).map(key));
  const buckets = { person: [], tense: [], ending: [], aux: [] };
  for (const p of personsOf(q.t)) if (p !== q.p && f[q.t][p]) buckets.person.push(plainText(first(f[q.t][p])));
  for (const t of ['present', 'imparfait', 'futur', 'conditionnel', 'subjonctif', 'passecompose']) {
    if (t !== q.t && f[t] && f[t][q.p]) buckets.tense.push(plainText(first(f[t][q.p])));
  }
  const e = q.cell.e;
  if (e && exp.endsWith(e)) {
    const stem = exp.slice(0, exp.length - e.length);
    ['e', 'es', 'ons', 'ez', 'ent', 'ais', 'ait', 'ions', 'iez', 'ai', 'as', 'a', 'ont', 'is', 'it', 'ions', 'issons'].forEach((x) => { if (x !== e) buckets.ending.push(stem + x); });
  } else {
    const stem = q.v.inf.replace(/(er|ir|re)$/, '');
    ['e', 'es', 's', 'ons', 'ez', 'ent', 'ais', 'ai', 'it'].forEach((x) => buckets.ending.push(stem + x));
    if (/ons$/.test(exp)) buckets.ending.push(exp.replace(/ons$/, 'ont'));
  }
  if (Conj.COMPOUND[q.t]) {
    const [a, ...rest] = exp.split(' ');
    const wrongAux = q.v.aux === 'etre' ? ['a', 'as', 'ai', 'avons', 'avez', 'ont'] : ['est', 'es', 'suis', 'sommes', 'êtes', 'sont'];
    const similar = wrongAux.filter((x) => x[0] === a[0] || x.length === a.length);
    buckets.aux.push(...(similar.length ? similar : wrongAux).map((x) => `${x} ${rest.join(' ')}`));
    buckets.aux.push(`${a} ${q.v.inf}`);
    buckets.ending.length = 0;
  }
  const taken = new Set([key(exp)]);
  const out = [];
  const take = (arr) => {
    for (const s of shuffle(arr)) {
      const k = key(s);
      if (taken.has(k) || acceptedKeys.has(k) || Conj.deacc(k) === Conj.deacc(key(exp))) continue;
      taken.add(k); out.push(s); return true;
    }
    return false;
  };
  take(buckets.person); take(buckets.tense); take(buckets.ending); take(buckets.aux);
  for (const arr of shuffle(Object.values(buckets))) { if (out.length >= 3) break; take(arr); }
  for (const arr of Object.values(buckets)) { while (out.length < 3 && take(arr)); }
  return shuffle([exp, ...out.slice(0, 3)]).map((text) => ({ text, ok: text === exp }));
}

function recogPronoun(q) {
  const f = forms(q.v)[q.t];
  const text = plainText(first(q.cell));
  const same = Conj.ALL.filter((p) => f[p] && Conj.accepted(f[p]).map(Conj.clean).includes(Conj.clean(text)));
  const others = Conj.ALL.filter((p) => !same.includes(p));
  if (others.length < 3) return null;
  const opts = shuffle([q.p, ...shuffle(others).slice(0, 3)]).map((p) => ({ text: PERSONS[p], p, ok: same.includes(p) }));
  return Object.assign(q, { type: 'pronoun', options: opts, shown: text });
}
function recogTense(q) {
  const v = q.v, f = forms(v), text = Conj.clean(plainText(first(q.cell)));
  if (q.t === 'imperatif') return null;
  const avail = activeTenses().filter((t) => t.id !== 'imperatif' && f[t.id]);
  const same = (t) => Conj.ALL.some((p) => f[t.id][p] && Conj.accepted(f[t.id][p]).map((x) => Conj.clean(plainText(x))).includes(text));
  const okSet = avail.filter(same).map((t) => t.id);
  const others = avail.filter((t) => !okSet.includes(t.id));
  if (others.length < 2 || !okSet.includes(q.t)) return null;
  const opts = shuffle([TENSE_BY_ID[q.t], ...shuffle(others).slice(0, 3)]).map((t) => ({ text: t.name, t: t.id, ok: okSet.includes(t.id), emoji: t.emoji }));
  return Object.assign(q, { type: 'tense', options: opts, shown: `${Conj.pronoun(q.p, text)}${Conj.pronoun(q.p, text).endsWith("'") ? '' : ' '}${text}` });
}

function sentenceHTML(q, filled) {
  const exp = plainText(first(q.cell));
  const pr = Conj.pronoun(q.p, exp);
  const blank = filled || '<span class="blank">…</span>';
  const inf = `<small class="inf">(${esc(q.v.inf)})</small>`;
  if (q.t === 'imperatif') return `${esc(q.marker)} pour « ${esc(PERSONS[q.p])} » : ${blank} ${inf} !`;
  return `${esc(q.marker)} <span class="pron">${esc(pr)}</span>${pr.endsWith("'") ? '' : ' '}${blank} ${inf}`;
}
function timelineHTML(T) {
  if (!['passé', 'présent', 'futur'].includes(T.era)) return '';
  return `<div class="timeline" aria-hidden="true">${[['passé', '⏪'], ['présent', '☀️'], ['futur', '🚀']].map(([e, i]) => `<span class="${T.era === e ? 'on' : ''}">${i} ${e}</span>`).join('')}</div>`;
}
const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'ë', "'"];

function renderQuestion() {
  const S = A.S, q = S.q, T = TENSE_BY_ID[q.t], p = prof();
  const total = S.cfg.timed ? '∞' : S.n;
  const pct = S.cfg.timed ? (S.timeLeft / 60) * 100 : Math.min(100, (S.asked - (q.retry ? 0 : 1) + 0) / S.n * 100);
  let main = '', prompt = '';
  if (q.type === 'pronoun') {
    prompt = `<div class="prompt">Qui peut faire cette action ?</div><div class="sentence"><span class="chip-t" style="--c:${T.color}">${T.emoji} ${esc(T.name)}</span> … <b class="shown">${esc(q.shown)}</b> <small class="inf">(${esc(q.v.inf)})</small></div>`;
  } else if (q.type === 'tense') {
    prompt = `<div class="prompt">À quel temps est ce verbe ?</div><div class="sentence"><b class="shown">${esc(q.shown)}</b> <small class="inf">(${esc(q.v.inf)})</small></div>`;
  } else {
    prompt = `<div class="prompt">Complète avec le bon verbe</div><div class="sentence" id="sentence">${sentenceHTML(q)}</div>`;
  }
  if (q.type === 'type') {
    main = `<form id="ans" autocomplete="off"><input id="inp" type="text" inputmode="text" lang="fr" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Écris ta réponse" aria-label="Ta réponse">
      <div class="accents">${ACCENTS.map((a) => `<button type="button" tabindex="-1" data-act="accent" data-a="${a}">${a}</button>`).join('')}</div>
      <button class="big primary" type="submit">Valider ✔</button></form>`;
  } else {
    main = `<div class="choices">${q.options.map((o, i) => `<button class="choice" data-act="choose" data-i="${i}"><kbd>${i + 1}</kbd><span>${o.emoji ? o.emoji + ' ' : ''}${esc(o.text)}</span></button>`).join('')}</div>`;
  }
  const mood = S.combo >= 3 ? 'cheer' : 'happy';
  setView(`<div class="game" style="--c:${T.color}">
    <div class="g-top"><button class="x" data-act="quit" aria-label="Quitter">✕</button>
      <div class="prog"><u style="width:${Math.max(0, pct)}%"></u></div>
      ${S.cfg.timed ? `<b id="timer" class="timer ${S.timeLeft <= 10 ? 'low' : ''}">${S.timeLeft}</b>` : `<small>${Math.min(S.asked, S.n)}/${total}</small>`}
      <span class="combo ${S.combo >= 2 ? 'on' : ''}" id="combo">🔥 ×${S.combo}</span></div>
    <div class="g-body">
      <div class="g-head"><span class="mini" id="mini">${FX.mascot({ stage: Store.stageOf(Store.levelOf(p.xp)), mood, color: p.color, hat: p.equipped.hat, glasses: p.equipped.glasses, size: 74 })}</span>
        <div><span class="chip-t" style="--c:${T.color}">${T.emoji} ${esc(T.name)}</span>${q.retry ? '<span class="chip-t retry">🔁 On réessaie</span>' : ''}${timelineHTML(T)}</div></div>
      <div class="vcard"><span class="big-e">${esc(q.v.emoji || '📘')}</span><b>${esc(q.v.inf)}</b>
        <button class="small" data-act="say" data-text="${esc(q.v.inf)}" aria-label="Écouter le verbe">🔊</button></div>
      ${prompt}
      <div id="answer">${main}${q.type === 'type' || q.type === 'choice' ? '<div class="center"><button class="small" data-act="hint">💡 Un indice</button></div><div id="hint"></div>' : ''}</div>
      <div id="fb"></div>
    </div></div>`);
  const inp = $('#inp');
  if (inp) { inp.focus(); $('#ans').addEventListener('submit', (e) => { e.preventDefault(); answerTyped(inp.value); }); }
}

function answerTyped(val) {
  const S = A.S, q = S.q; if (q.done) return;
  if (!val.trim()) { $('#inp').focus(); return; }
  const r = Conj.check(q.cell, val);
  resolve(r === 'ok', val, r);
}
function answerChoice(i) {
  const S = A.S, q = S.q; if (q.done) return;
  const o = q.options[i];
  $$('.choice').forEach((b, j) => { b.disabled = true; if (q.options[j].ok) b.classList.add('right'); });
  $$('.choice')[i].classList.add(o.ok ? 'right' : 'wrong');
  resolve(o.ok, o.text, o.ok ? 'ok' : 'ko');
}

function resolve(ok, given, verdict) {
  const S = A.S, q = S.q, p = prof();
  q.done = true; S.paused = true;
  const weak = q.type === 'pronoun' || q.type === 'tense';
  const expText = first(q.cell);
  const speech = plainText(`${q.t === 'imperatif' ? '' : Conj.pronoun(q.p, plainText(expText)) + ' '}${expText}`).replace("' ", "'");
  const d = Store.touchDaily(p);
  d.count++; S.answered++;
  Store.review(p, q.k, ok, weak);
  if (ok) {
    p.stats.correct++;
    let gain = q.retry ? 4 : 10 + Math.min(S.combo, 6) * 2;
    if (q.hint) gain = Math.min(gain, 5);
    if (!q.retry && !q.hint) { S.first++; S.combo++; S.coins++; p.coins++; S.maxCombo = Math.max(S.maxCombo, S.combo); }
    updCombo();
    S.xp += gain; p.xp += gain;
    const lvl = Store.levelOf(p.xp);
    if (lvl > S.lvl0 + S.levelUps.length) { S.levelUps.push(lvl); }
    FX.play(S.combo >= 3 && !q.retry ? 'combo' : 'ok'); FX.vibrate(15);
    const blank = `<span class="filled ok">${fmt(q.cell)}</span>`;
    if (q.type === 'type' || q.type === 'choice') { const s = $('#sentence'); if (s) s.innerHTML = sentenceHTML(q, blank); }
    const msg = S.combo >= 5 ? pick(['Incroyable !', 'Tu es en feu !', 'Quel champion !']) : pick(['Bravo !', 'Super !', 'Bien joué !', 'Exact !', 'Parfait !']);
    $('#fb').innerHTML = `<div class="fb ok"><b>🎉 ${msg}</b><span>+${gain} XP${S.combo >= 2 && !q.retry ? ` · combo ×${S.combo}` : ''}</span>
      <button class="small" data-act="say" data-text="${esc(speech)}" aria-label="Écouter">🔊</button></div>`;
    $('#answer').hidden = true;
    const m = $('#mini'); if (m) m.innerHTML = FX.mascot({ stage: Store.stageOf(Store.levelOf(p.xp)), mood: 'cheer', color: p.color, hat: p.equipped.hat, glasses: p.equipped.glasses, size: 74 });
    if (S.levelUps.length && S.levelUps.length !== q.lvlShown) { q.lvlShown = S.levelUps.length; FX.play('level'); FX.confetti(120); toast(`Niveau ${S.levelUps[S.levelUps.length - 1]} ! 🎊`); }
    if (!S.cfg.timed) FX.speak(speech);
    if (d.count >= settingsGoal() && !d.chest) { /* le coffre est ouvert à la fin de la partie */ }
    Store.save();
    S.autoNext = setTimeout(() => { if (A.S === S && S.q === q) afterAnswer(); }, S.cfg.timed ? 450 : 1100);
    $('#fb').onclick = () => { clearTimeout(S.autoNext); afterAnswer(); };
    return;
  }
  // erreur
  p.stats.wrong++;
  if (!q.retry) { S.combo = 0; S.retry.push({ item: q.item, at: S.asked }); }
  updCombo();
  let info;
  if (q.type === 'pronoun') {
    const okP = q.options.filter((o) => o.ok).map((o) => o.text).join(' / ');
    info = Explain.diagnoseRecognition('pronoun', { text: q.shown, who: `« ${okP} »`, hint: q.cell.e ? `Regarde la terminaison : -${q.cell.e}.` : '', tip: TENSE_BY_ID[q.t].tip });
  } else if (q.type === 'tense') {
    const T = TENSE_BY_ID[q.t];
    info = Explain.diagnoseRecognition('tense', { text: q.shown, tenseName: Explain.au(T), hint: `Indice : on dit souvent « ${T.markers[0].replace(/,$/, '')} » avec ce temps.`, tip: T.tip });
  } else {
    info = Explain.diagnose({ verb: q.v, forms: forms(q.v), tense: q.t, p: q.p, given });
  }
  p.errKinds[info.kind] = (p.errKinds[info.kind] || 0) + 1;
  p.errLog.push({ inf: q.v.inf, t: q.t, p: q.p, given: String(given).slice(0, 40), exp: expText, kind: info.kind, at: Date.now() });
  if (p.errLog.length > 60) p.errLog.shift();
  S.mistakes.push({ q, given, info });
  FX.play('ko'); FX.vibrate([20, 40, 20]);
  const endings = Explain.endingTable(forms(q.v), q.t);
  const sentence = $('#sentence');
  if (sentence && q.type !== 'pronoun' && q.type !== 'tense') sentence.innerHTML = sentenceHTML(q, `<span class="filled ko"><s>${esc(plainText(given))}</s></span> <span class="filled ok">${fmt(q.cell)}</span>`);
  const m = $('#mini'); if (m) m.innerHTML = FX.mascot({ stage: Store.stageOf(Store.levelOf(p.xp)), mood: 'oops', color: p.color, hat: p.equipped.hat, glasses: p.equipped.glasses, size: 74 });
  $('#answer').hidden = true;
  $('#fb').innerHTML = `<div class="fb ko">
    <h3>🤔 ${esc(info.title)}</h3>
    ${q.type === 'type' || q.type === 'choice' ? `<p class="yours">Ta réponse : <s>${esc(plainText(given))}</s></p>` : ''}
    <p class="good">Bonne réponse : <b>${fmt(q.cell)}</b> <button class="small" data-act="say" data-text="${esc(speech)}" aria-label="Écouter">🔊</button></p>
    ${info.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
    ${endings ? `<div class="etable" aria-label="Terminaisons">${endings.map((e) => `<span class="${e.p === q.p ? 'me' : ''}">${esc(PERSONS[e.p])} <b>${e.e ? '-' + esc(e.e) : '∅'}</b></span>`).join('')}</div>` : ''}
    <details><summary>💡 Petit rappel de cours</summary><p>${esc(info.tip)}</p></details>
    <button class="big primary" data-act="next" autofocus>J'ai compris, on continue ▶</button>
    <small class="muted">On reverra ce verbe dans quelques questions 😉</small></div>`;
  if (!S.cfg.timed) FX.speak(speech);
  Store.save();
  $('#fb').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function updCombo() {
  const c = $('#combo'); if (!c || !A.S) return;
  c.textContent = `🔥 ×${A.S.combo}`; c.classList.toggle('on', A.S.combo >= 2);
}
function afterAnswer() {
  const S = A.S; if (!S) return;
  if (S.autoNext) clearTimeout(S.autoNext);
  nextQuestion();
}

function finishSession() {
  const S = A.S; if (!S) return;
  clearTimerIfAny(); clearTimeout(S.autoNext);
  const p = prof(), cfg = S.cfg;
  const before = new Set(Object.keys(p.badges));
  const answered = S.answered;
  const mainTotal = cfg.timed ? answered : S.n;
  let stars = 0, newStars = 0;
  if (cfg.timed) {
    stars = S.first >= 20 ? 3 : S.first >= 12 ? 2 : S.first >= 6 ? 1 : 0;
    if (S.first > p.stats.chronoBest) { p.stats.chronoBest = S.first; S.newRecord = true; }
  } else {
    const r = S.first / Math.max(1, mainTotal);
    stars = r >= 1 ? 3 : r >= 0.9 ? 2 : r >= 0.7 ? 1 : 0;
  }
  if (cfg.ctx && cfg.ctx.mission) {
    const k = `${cfg.ctx.tense}|${cfg.ctx.mission}`;
    const old = p.stars[k] || 0;
    if (stars > old) { newStars = stars - old; p.stars[k] = stars; p.coins += newStars * 5; S.coins += newStars * 5; }
  }
  p.stats.sessions++;
  if (!cfg.timed && S.first === S.n && S.n >= 5) p.stats.perfect++;
  p.stats.bestCombo = Math.max(p.stats.bestCombo, S.maxCombo);
  if (answered >= 5) Store.bumpStreak(p);
  const d = Store.touchDaily(p);
  if (d.count >= settingsGoal() && !d.chest) { d.chest = true; p.coins += 20; S.chest = 20; S.coins += 20; }
  S.stars = stars; S.newStars = newStars;
  S.newBadges = BADGES.filter((b) => !before.has(b.id) && b.test(p));
  S.newBadges.forEach((b) => { p.badges[b.id] = Date.now(); p.coins += 10; S.coins += 10; });
  Store.save();
  A.view = 'result'; render();
  if (stars >= 2 || S.chest || S.newBadges.length) { FX.play('win'); FX.confetti(140); } else FX.play('ok');
}

views.result = () => {
  const S = A.S, p = prof(), cfg = S.cfg;
  const total = cfg.timed ? S.answered : S.n;
  const mood = S.stars >= 2 ? 'cheer' : S.stars === 1 ? 'happy' : 'think';
  const title = cfg.timed ? (S.newRecord ? 'Nouveau record ! 🏅' : 'Temps écoulé !') : S.stars === 3 ? 'Parfait ! 🌟' : S.stars === 2 ? 'Très bien ! 🎉' : S.stars === 1 ? 'Bien joué ! 👍' : 'Courage, tu progresses ! 💪';
  const lvl = Store.levelOf(p.xp), stage = Store.stageOf(lvl);
  setView(`<section class="result">
    <div class="center">${FX.mascot({ stage, mood, color: p.color, hat: p.equipped.hat, glasses: p.equipped.glasses, size: 150 })}</div>
    <h1>${title}</h1>
    <div class="bigstars">${[1, 2, 3].map((k) => `<i class="${k <= S.stars ? 'on' : ''}" style="animation-delay:${k * 160}ms">★</i>`).join('')}</div>
    <div class="stats card">
      <div><b>${S.first}/${total}</b><small>du premier coup</small></div>
      <div><b>×${S.maxCombo}</b><small>meilleur combo</small></div>
      <div><b>+${S.xp}</b><small>XP</small></div>
      <div><b>+${S.coins}</b><small>🪙 pièces</small></div></div>
    ${S.newStars ? `<p class="reward">⭐ Nouvelle${S.newStars > 1 ? 's' : ''} étoile${S.newStars > 1 ? 's' : ''} : +${S.newStars * 5} 🪙</p>` : ''}
    ${S.levelUps.length ? `<p class="reward">🆙 Niveau ${S.levelUps[S.levelUps.length - 1]} atteint !${Store.stageOf(S.levelUps[S.levelUps.length - 1]) > Store.stageOf(S.lvl0) ? ` Conjugo devient un <b>${esc(Store.STAGE_NAMES[Store.stageOf(S.levelUps[S.levelUps.length - 1])])}</b> !` : ''}</p>` : ''}
    ${S.chest ? '<p class="reward">🎁 Coffre du jour ouvert : +20 🪙 !</p>' : ''}
    ${S.newBadges.map((b) => `<p class="reward">${b.emoji} Nouveau trophée : <b>${esc(b.name)}</b></p>`).join('')}
    ${S.mistakes.length ? `<h3>À retenir 🧠</h3><div class="mistakes">${S.mistakes.map((m) => `<details class="card"><summary>${m.q.v.emoji ? esc(m.q.v.emoji) + ' ' : ''}<b>${esc(m.q.v.inf)}</b> · ${esc(TENSE_BY_ID[m.q.t].name)} · ${esc(PERSONS[m.q.p])} → <b class="end">${esc(plainText(first(m.q.cell)))}</b></summary>
      <p><s>${esc(plainText(m.given))}</s></p>${m.info.lines.map((l) => `<p>${esc(l)}</p>`).join('')}<p class="tip">💡 ${esc(m.info.tip)}</p></details>`).join('')}</div>` : ''}
    <div class="actions"><button class="big primary" data-act="again">Rejouer ↻</button><button class="big" data-go="home">Accueil 🏠</button></div></section>`);
}

/* ---------- actions ---------- */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2700);
}
function modal(html, onClose) {
  const m = $('#modal'); m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  m._close = onClose;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if (m._close) m._close(); m._close = null; }

const actions = {
  'pick-profile': (el) => { Store.selectProfile(el.dataset.id); go('home'); },
  profiles: () => {
    const ps = Store.data.profiles, cur = prof();
    modal(`<h2>Qui joue ?</h2><div class="profiles">${ps.map((p) => `<button class="pbtn ${cur && p.id === cur.id ? 'on' : ''}" data-act="pick-profile-m" data-id="${esc(p.id)}"><span class="dot big" style="background:${esc(p.color)}"></span>${esc(p.name)}</button>`).join('')}</div>
      <button class="big" data-act="new-profile">➕ Nouveau joueur</button><button class="small" data-act="close">Fermer</button>`);
  },
  'pick-profile-m': (el) => { Store.selectProfile(el.dataset.id); closeModal(); go('home'); },
  'new-profile': () => { closeModal(); A.view = 'welcome'; render(); },
  close: () => closeModal(),
  parent: () => { if (Date.now() < A.gateUntil) go('parent', { tab: 'verbs' }); else Parent.gate(); },
  review: () => { const p = prof(); startSession({ mode: 'review', title: 'Révision', pool: reviewPool(p, 10), n: 10 }); },
  errors: () => {
    const p = prof(), pool = errorsPool(p);
    if (!pool.length) { toast('Aucune erreur à corriger : bravo ! 🎉'); return; }
    startSession({ mode: 'errors', pool, n: Math.min(10, Math.max(5, pool.length)) });
  },
  featured: () => { const l = settings().featuredList; const vs = A.verbs.filter((v) => (v.lists || []).includes(l)); startSession({ mode: 'list', tenses: activeTenses().filter((t) => t.core).map((t) => t.id), verbs: vs, n: 10 }); },
  world: (el) => go('world', { t: el.dataset.t }),
  locked: () => toast('Continue à gagner des étoiles pour débloquer ce monde ! ⭐'),
  mission: (el) => {
    const t = el.dataset.t, m = missionsFor(t).find((x) => x.id === el.dataset.m); if (!m) return;
    startSession({ mode: 'mission', tenses: [t], verbs: m.verbs, ctx: { tense: t, mission: m.id }, n: 10 });
  },
  'setup-practice': () => go('setup', { mode: 'practice' }),
  'setup-chrono': () => go('setup', { mode: 'chrono', sel: { tenses: activeTenses().filter((t) => t.core).slice(0, 4).map((t) => t.id), verbs: null, filter: '' } }),
  'tog-tense': (el) => { const s = A.params.sel, t = el.dataset.t; s.tenses = s.tenses.includes(t) ? (s.tenses.length > 1 ? s.tenses.filter((x) => x !== t) : s.tenses) : [...s.tenses, t]; s.verbs = null; views.setup(A.params); },
  'tog-verb': (el) => { const s = A.params.sel; s.verbs.has(el.dataset.v) ? s.verbs.delete(el.dataset.v) : s.verbs.add(el.dataset.v); views.setup(A.params); },
  'verbs-all': () => { A.params.sel.verbs = null; views.setup(A.params); },
  'verbs-none': () => { A.params.sel.verbs = new Set(); views.setup(A.params); },
  'start-setup': (el) => {
    const s = A.params.sel, mode = el.dataset.mode;
    const vs = A.verbs.filter((v) => s.verbs.has(v.inf));
    const pool = buildPool(s.tenses, vs);
    if (!pool.length) { toast('Choisis au moins un verbe 🙂'); return; }
    A.lastCfg = { mode, tenses: s.tenses, verbs: vs, timed: mode === 'chrono', n: 10 };
    startSession(A.lastCfg);
  },
  'practice-verb': (el) => { startSession({ mode: 'practice', tenses: [el.dataset.t], verbs: [verbByInf(el.dataset.v)], n: 10 }); },
  'memo-verb': (el) => go('memo', { inf: el.dataset.v, t: el.dataset.t }),
  'memo-tab': (el) => go('memo', { inf: el.dataset.v, t: el.dataset.t }),
  'memo-tense': (el) => go('memo', { inf: 'manger', t: el.dataset.t }),
  hint: () => {
    const q = A.S && A.S.q; if (!q || q.done) return;
    q.hint = true;
    const T = TENSE_BY_ID[q.t], exp = plainText(first(q.cell)), lines = [];
    const w = Explain.SUBJ[q.p];
    if (q.cell.e && !Conj.COMPOUND[q.t]) lines.push(`Avec ${w}, ${Explain.au(T)}, la terminaison est « -${q.cell.e} ».`);
    else if (Conj.COMPOUND[q.t]) lines.push(`Il faut 2 mots : l'auxiliaire ${q.v.aux === 'etre' ? '« être »' : '« avoir »'} + le participe passé « ${q.v.pp} ».`);
    lines.push(`La réponse commence par « ${exp.slice(0, Math.min(2, exp.length - 1) || 1)}… »`);
    $('#hint').innerHTML = `<p class="tip">💡 ${lines.map(esc).join('<br>')}<br><small>(avec un indice, tu gagnes moins d'XP)</small></p>`;
  },
  say: (el) => FX.speak(el.dataset.text, true),
  accent: (el) => { const i = $('#inp'); if (!i) return; const s = i.selectionStart ?? i.value.length, e = i.selectionEnd ?? s; i.value = i.value.slice(0, s) + el.dataset.a + i.value.slice(e); i.focus(); i.setSelectionRange(s + 1, s + 1); FX.play('tap'); },
  choose: (el) => answerChoice(+el.dataset.i),
  next: () => afterAnswer(),
  quit: () => {
    const S = A.S; if (S) S.paused = true;
    modal(`<h2>Tu veux arrêter ?</h2><p>Ta progression est sauvegardée.</p><div class="actions"><button class="big" data-act="resume">Continuer</button><button class="big primary" data-act="quit-ok">Quitter</button></div>`, () => { if (A.S && A.view === 'game' && !A.S.q.done) A.S.paused = false; });
  },
  resume: () => closeModal(),
  'quit-ok': () => { const m = $('#modal'); m._close = null; closeModal(); const S = A.S; if (S && S.answered) { finishSession(); } else go('home'); },
  again: () => { const S = A.S; if (S && S.cfg.pool) { const cfg = Object.assign({}, S.cfg); if (cfg.mode === 'review') cfg.pool = reviewPool(prof(), 10); startSession(cfg); } else if (S) startSession(S.cfg); },
  buy: (el) => {
    const p = prof(), it = SHOP.find((i) => i.id === el.dataset.id); if (!it) return;
    if (p.coins < it.price) { toast(`Il te manque ${it.price - p.coins} 🪙 — continue à jouer !`); return; }
    p.coins -= it.price; p.owned.push(it.id); p.equipped[it.kind] = it.val; FX.play('win'); Store.save(); render();
  },
  equip: (el) => { const [kind, val] = el.dataset.id.split(':'); const p = prof(); p.equipped[kind] = p.equipped[kind] === val && val ? '' : val; FX.play('tap'); Store.save(); render(); },
  skin: (el) => { const p = prof(); p.color = el.dataset.c; Store.save(); render(); },
  buyskin: (el) => { const p = prof(), pr = +el.dataset.price; if (p.coins < pr) { toast(`Il te manque ${pr - p.coins} 🪙`); return; } p.coins -= pr; p.owned.push('skin:' + el.dataset.c); p.color = el.dataset.c; FX.play('win'); Store.save(); render(); },
  install: async () => { const e = A.deferredInstall; if (!e) return; e.prompt(); await e.userChoice; A.deferredInstall = null; render(); },
  'install-help': () => modal(`<h2>📲 Installer l'appli</h2>
    <p><b>iPhone / iPad (Safari)</b> : touche le bouton Partager <span class="kbd">⬆️</span> puis « Sur l'écran d'accueil ».</p>
    <p><b>Android (Chrome)</b> : menu <span class="kbd">⋮</span> puis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).</p>
    <p><b>Ordinateur (Chrome / Edge)</b> : clique sur l'icône d'installation à droite de la barre d'adresse.</p>
    <p>Ensuite l'appli s'ouvre comme une vraie appli et <b>fonctionne même sans internet</b> 🎉</p><button class="big primary" data-act="close">OK</button>`),
};

function wire() {
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g && !g.closest('#modal')) { FX.play('tap'); const v = g.dataset.go; go(v); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act] || (typeof Parent !== 'undefined' && Parent.actions[el.dataset.act]);
    if (fn) { if (!['choose', 'accent'].includes(el.dataset.act)) FX.play('tap'); fn(el, e); }
  });
  document.addEventListener('keydown', (e) => {
    if (A.view !== 'game' || !A.S || !A.S.q) return;
    const q = A.S.q;
    if (e.key === 'Enter' && q.done) { const n = $('[data-act="next"]'); if (n) { e.preventDefault(); afterAnswer(); } else if ($('#fb .ok')) { afterAnswer(); } }
    else if (!q.done && q.options && /^[1-4]$/.test(e.key) && q.options[+e.key - 1]) answerChoice(+e.key - 1);
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); A.deferredInstall = e; if (A.view === 'home') render(); });
}
