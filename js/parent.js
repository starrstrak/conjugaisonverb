/* Espace parents / enseignants : verbes, progrès, réglages, partage. */
const Parent = (() => {
  const KIND_LABEL = {
    accent: 'accents oubliés', person: 'mauvaise personne (je/tu/il…)', tense: 'mauvais temps', ending: 'terminaison', spelling: 'ge / ç oubliés',
    aux: 'auxiliaire (avoir/être)', pp: 'participe passé', agreement: 'accord du participe', 'aux-missing': 'auxiliaire oublié', 'pp-missing': 'participe oublié',
    infinitive: 'infinitif écrit', empty: 'réponse vide', other: 'verbe irrégulier / autre', pronoun: 'reconnaître le pronom',
  };
  const tab = () => A.params.tab || 'verbs';
  const NAMES = { verbs: '📚 Verbes', progress: '📈 Progrès', exercises: '🎯 Exercices', settings: '⚙️ Réglages', share: '🔗 Partager' };

  function gate() {
    const a = 13 + rnd(7), b = 3 + rnd(5);
    modal(`<h2>🔒 Espace parents</h2><p>Pour entrer, résous ce calcul :</p>
      <form id="gate"><p class="calc">${a} × ${b} = ?</p><input id="gans" inputmode="numeric" autocomplete="off" aria-label="Résultat">
      <div class="actions"><button type="button" class="big" data-act="close">Annuler</button><button class="big primary" type="submit">Entrer</button></div></form>`);
    const f = $('#gate'); $('#gans').focus();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (+$('#gans').value === a * b) { A.gateUntil = Date.now() + 10 * 60 * 1000; closeModal(); go('parent', { tab: 'verbs' }); }
      else { toast('Ce n\'est pas ça 😉'); $('#gans').value = ''; }
    });
  }

  views.parent = (params) => {
    const t = params.tab || 'verbs';
    const body = { verbs: verbsTab, progress: progressTab, exercises: exercisesTab, settings: settingsTab, share: shareTab }[t]();
    setView(`<button class="back" data-go="home">← Retour au jeu</button><h2 class="title">Espace parents &amp; enseignants</h2>
      <div class="tabs ptabs">${Object.entries(NAMES).map(([k, n]) => `<button class="${k === t ? 'on' : ''}" data-act="ptab" data-t="${k}">${n}</button>`).join('')}</div>${body}`);
    if (t === 'share') showPersist();
  };

  async function showPersist() {
    const el = $('#persist'); if (!el) return;
    let ok = false;
    try { ok = !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()); } catch (e) { /* ignore */ }
    const last = Store.data.lastBackup ? new Date(Store.data.lastBackup).toLocaleDateString('fr-CH') : 'jamais';
    el.innerHTML = `💾 Sauvegarde sur cet appareil : <b>${Store.memoryOnly ? 'désactivée dans ce navigateur ⚠️' : ok ? 'protégée ✔' : 'active (installe l\'appli pour la protéger)'}</b>. Dernière sauvegarde en fichier : <b>${last}</b>.`;
  }

  /* ---------- Verbes ---------- */
  let vq = '', vf = 'all';
  function verbsTab() {
    const all = A.verbs.slice().sort((a, b) => a.inf.localeCompare(b.inf, 'fr'));
    const hidden = Store.data.hiddenBase.filter((i) => !Store.data.customVerbs.some((c) => c.inf === i));
    const list = all.filter((v) => (!vq || v.inf.includes(vq.toLowerCase())) && (vf === 'all' || (vf === 'custom' && (v._custom || v._mod)) || vf === v.type));
    const nCustom = all.filter((v) => v._custom || v._mod).length;
    return `<p class="lead">${all.length} verbes au total · <b>${nCustom}</b> ajouté${nCustom > 1 ? 's' : ''} ou modifié${nCustom > 1 ? 's' : ''}. Les nouveaux verbes apparaissent automatiquement dans les missions, le mémo et les révisions.</p>
    <button class="big primary" data-act="v-add">➕ Ajouter un verbe</button>
    <div class="row"><input id="pvq" placeholder="Chercher…" value="${esc(vq)}" aria-label="Chercher un verbe">
      <select id="pvf" aria-label="Filtrer">${[['all', 'Tous'], ['custom', 'Ajoutés / modifiés'], ['er', 'en -er'], ['ir2', 'en -ir (finir)'], ['re', 'en -re'], ['irr', 'Rebelles']].map(([k, n]) => `<option value="${k}" ${vf === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="vlist">${list.map((v) => `<div class="vrow"><span class="e">${esc(v.emoji || '📘')}</span><div class="vn"><b>${esc(v.inf)}</b>
      <small>${esc(typeLabel(v))}${v._custom ? ' · <em>ajouté</em>' : v._mod ? ' · <em>modifié</em>' : ''}${(v.lists || []).length ? ' · 📚 ' + esc(v.lists.join(', ')) : ''}</small></div>
      <button class="small" data-act="v-edit" data-v="${esc(v.inf)}" aria-label="Modifier ${esc(v.inf)}">✏️</button>
      ${v._mod ? `<button class="small" data-act="v-restore" data-v="${esc(v.inf)}" title="Revenir à l'original" aria-label="Rétablir l'original">↩</button>` : ''}
      <button class="small danger" data-act="v-del" data-v="${esc(v.inf)}" aria-label="Supprimer ${esc(v.inf)}">🗑️</button></div>`).join('') || '<p class="muted">Aucun verbe.</p>'}</div>
    ${hidden.length ? `<h3>Verbes masqués</h3><div class="chips">${hidden.map((i) => `<button class="pill" data-act="v-restore" data-v="${esc(i)}">↩ ${esc(i)}</button>`).join('')}</div>` : ''}`;
  }

  /* ----- éditeur de verbe ----- */
  let ed = null; // { orig, pres:null|[6], forms:{}, touched:{pp,type} }
  const TYPE_OPTS = [['er', 'Verbe en -er (comme chanter, manger)'], ['ir2', 'Verbe en -ir comme finir (finissons)'], ['re', 'Verbe en -re régulier (comme rendre)'], ['irr', 'Verbe irrégulier (je vérifie chaque case)']];
  function suggestType(inf) { if (inf.endsWith('er') && inf !== 'aller') return 'er'; if (inf.endsWith('ir')) return 'ir2'; if (/dre$/.test(inf) && !/prendre$/.test(inf)) return 're'; return 'irr'; }
  function suggestPP(inf, type) {
    const s = inf.replace(/(er|ir|re)$/, '');
    return type === 'er' ? s + 'é' : type === 'ir2' ? s + 'i' : type === 're' ? s + 'u' : '';
  }
  function openEditor(inf) {
    const base = inf ? verbByInf(inf) : null;
    const v = base ? JSON.parse(JSON.stringify(base)) : { inf: '', type: 'er', aux: 'avoir', pp: '' };
    delete v._custom; delete v._mod;
    ed = { orig: inf || '', pres: v.pres || null, forms: v.forms || {}, touched: { pp: !!inf, type: !!inf } };
    const adv = v.fut || v.impStem || v.subj || v.ps || v.noImp || v.imp;
    modal(`<h2>${inf ? 'Modifier « ' + esc(inf) + ' »' : 'Ajouter un verbe'}</h2>
    <form id="ved" autocomplete="off">
      <div class="two"><label>Infinitif<input name="inf" value="${esc(v.inf)}" required maxlength="40" placeholder="ex : écouter"></label>
        <label>Emoji<input name="emoji" value="${esc(v.emoji || '')}" maxlength="4" placeholder="🎧"></label></div>
      <label>Type de verbe<select name="type">${TYPE_OPTS.map(([k, n]) => `<option value="${k}" ${v.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="two"><label>Auxiliaire<select name="aux"><option value="avoir" ${v.aux !== 'etre' ? 'selected' : ''}>avoir</option><option value="etre" ${v.aux === 'etre' ? 'selected' : ''}>être</option></select></label>
        <label>Participe passé<input name="pp" value="${esc(v.pp)}" required maxlength="40" placeholder="écouté"></label></div>
      <label>Sens (facultatif)<input name="def" value="${esc(v.def || '')}" maxlength="120" placeholder="Prêter attention à un son"></label>
      <label>Liste(s) (facultatif, séparées par des virgules)<input name="lists" value="${esc((v.lists || []).join(', '))}" placeholder="Verbes de la semaine"></label>
      <details ${adv ? 'open' : ''}><summary>Options avancées (verbes irréguliers)</summary>
        <div class="two"><label>Radical du futur<input name="fut" value="${esc(v.fut || '')}" placeholder="ex : ir, pourr, viendr"></label>
          <label>Radical de l'imparfait<input name="impStem" value="${esc(v.impStem || '')}" placeholder="ex : ét"></label></div>
        <div class="two"><label>Subjonctif : je/tu/il/ils<input name="subj0" value="${esc((v.subj || [])[0] || '')}" placeholder="ex : puiss"></label>
          <label>Subjonctif : nous/vous<input name="subj1" value="${esc((v.subj || [])[1] || '')}" placeholder="ex : puiss"></label></div>
        <div class="two"><label>Passé simple : radical<input name="ps0" value="${esc((v.ps || [])[0] || '')}" placeholder="ex : voul"></label>
          <label>Terminaisons<select name="ps1">${[['', '(automatique)'], ['a', '-ai, -as, -a…'], ['i', '-is, -is, -it…'], ['u', '-us, -us, -ut…']].map(([k, n]) => `<option value="${k}" ${(v.ps || [])[1] === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <label class="chk"><input type="checkbox" name="noImp" ${v.noImp ? 'checked' : ''}> Pas d'impératif pour ce verbe</label>
      </details>
      <h3>Aperçu <small>— corrige n'importe quelle case en cas d'exception</small></h3>
      <div id="egrid"></div>
      <div class="actions"><button type="button" class="big" data-act="close">Annuler</button><button class="big primary" type="submit">Enregistrer ✔</button></div>
    </form>`);
    const f = $('#ved');
    renderGrid();
    f.addEventListener('input', (e) => {
      const n = e.target.name;
      if (e.target.closest('#egrid')) return;
      if (n === 'pp') ed.touched.pp = true;
      if (n === 'type') ed.touched.type = true;
      if (n === 'inf') {
        const i = f.inf.value.trim().toLowerCase();
        if (!ed.touched.type && i.length > 2) f.type.value = suggestType(i);
      }
      if ((n === 'inf' || n === 'type') && !ed.touched.pp) f.pp.value = suggestPP(f.inf.value.trim().toLowerCase(), f.type.value);
      renderGrid();
    });
    f.addEventListener('change', (e) => {
      if (e.target.closest('#egrid')) { cellChanged(e.target); return; }
      if (e.target.name === 'type' && e.target.value === 'irr') { const d = f.querySelector('details'); if (d) d.open = true; }
      if (e.target.name === 'type' || e.target.name === 'aux') renderGrid();
    });
    f.addEventListener('submit', (e) => { e.preventDefault(); saveEditor(); });
    setTimeout(() => f.inf.focus(), 50);
  }
  function draft(extra) {
    const f = $('#ved'); const g = (n) => f[n].value.trim();
    const v = { inf: g('inf').toLowerCase(), type: g('type'), aux: g('aux'), pp: g('pp') };
    if (g('emoji')) v.emoji = g('emoji');
    if (g('def')) v.def = g('def');
    const lists = g('lists').split(',').map((x) => x.trim()).filter(Boolean); if (lists.length) v.lists = lists;
    if (g('fut')) v.fut = g('fut');
    if (g('impStem')) v.impStem = g('impStem');
    if (g('subj0') && g('subj1')) v.subj = [g('subj0'), g('subj1')];
    if (g('ps0') && g('ps1')) v.ps = [g('ps0'), g('ps1')];
    if (f.noImp.checked) v.noImp = true;
    if (ed.pres) v.pres = ed.pres;
    if (Object.keys(ed.forms).length) v.forms = ed.forms;
    return Object.assign(v, extra);
  }
  function renderGrid() {
    const g = $('#egrid'); if (!g) return;
    const d = draft();
    if (!Conj.validVerb({ inf: d.inf, type: d.type })) { g.innerHTML = '<p class="muted">Écris l\'infinitif pour voir la conjugaison.</p>'; return; }
    if (!d.pp) d.pp = '';
    const f = Conj.conjugate(d);
    const base = Conj.conjugate(Object.assign({}, d, { pres: null, forms: null }));
    const openId = g.querySelector('details[open]') ? g.querySelector('details[open]').dataset.t : 'present';
    g.innerHTML = Conj.TENSES.map((T) => {
      const ps = personsOf(T.id), arr = f[T.id];
      const comp = !!Conj.COMPOUND[T.id];
      return `<details data-t="${T.id}" ${T.id === openId ? 'open' : ''}><summary style="color:${T.color}">${T.emoji} ${esc(T.name)}</summary>
        ${arr ? `<table class="conj edit">${ps.map((p) => {
          const c = arr[p]; if (!c) return '';
          const b = base[T.id] && base[T.id][p];
          const ov = !comp && b && b.t !== c.t;
          return `<tr><th>${PERSONS[p]}</th><td><input data-t="${T.id}" data-p="${p}" value="${esc(c.t)}" ${comp ? 'readonly tabindex="-1"' : ''} class="${ov ? 'ov' : ''}" aria-label="${esc(T.name)} ${PERSONS[p]}"></td></tr>`;
        }).join('')}</table>${comp ? '<small class="muted">Calculé avec l\'auxiliaire et le participe passé.</small>' : ''}` : '<p class="muted">Pas de forme à ce temps.</p>'}</details>`;
    }).join('');
  }
  function cellChanged(input) {
    const t = input.dataset.t, p = +input.dataset.p, val = input.value.trim();
    const d = draft();
    if (t === 'present') {
      const cur = Conj.conjugate(d).present.map((c) => c.t);
      cur[p] = val || cur[p];
      const ruleBased = Conj.conjugate(Object.assign({}, d, { pres: null, forms: null })).present.map((c) => c.t);
      const same = d.type !== 'irr' && cur.every((x, i) => x === ruleBased[i]);
      ed.pres = same ? null : cur;
    } else {
      const baseCell = Conj.conjugate(Object.assign({}, d, { forms: { [t]: null } }));
      const b = baseCell[t] && baseCell[t][p] ? baseCell[t][p].t : '';
      const arr = ed.forms[t] || ['', '', '', '', '', ''];
      arr[p] = val && val !== b ? val : '';
      if (arr.some(Boolean)) ed.forms[t] = arr; else delete ed.forms[t];
    }
    renderGrid();
  }
  function saveEditor() {
    const d = draft();
    if (!Conj.validVerb(d)) { toast('Vérifie l\'infinitif (lettres uniquement) 🙂'); return; }
    if (!d.pp) { toast('Il manque le participe passé'); return; }
    if (d.type === 'irr' && !d.pres) {
      // un verbe irrégulier doit avoir son présent explicite
      d.pres = Conj.conjugate(d).present.map((c) => c.t);
    }
    const exists = verbByInf(d.inf);
    if (exists && d.inf !== ed.orig && !confirm(`« ${d.inf} » existe déjà. Le remplacer ?`)) return;
    if (!Store.saveVerb(d)) { toast('Impossible d\'enregistrer ce verbe'); return; }
    refreshVerbs(); closeModal(); toast(`« ${d.inf} » enregistré ✔`);
    A.params.tab = 'verbs'; render();
  }

  /* ---------- Progrès ---------- */
  function progressTab() {
    const ps = Store.data.profiles;
    if (!ps.length) return '<p>Aucun joueur pour l\'instant.</p>';
    const p = ps.find((x) => x.id === A.params.pid) || prof() || ps[0];
    A.params.pid = p.id;
    const total = p.stats.correct + p.stats.wrong, acc = total ? Math.round((p.stats.correct / total) * 100) : 0;
    const perTense = TENSES.map((T) => {
      const keys = Object.entries(p.cards).filter(([k]) => k.split('|')[1] === T.id);
      if (!keys.length) return '';
      const mastered = keys.filter(([, c]) => c.b >= 3).length;
      return `<div class="prow"><span>${T.emoji} ${esc(T.name)}</span><i class="bar"><u style="width:${Math.round((mastered / keys.length) * 100)}%;background:${T.color}"></u></i><small>${mastered}/${keys.length} acquis</small></div>`;
    }).join('');
    const weak = {};
    for (const [k, c] of Object.entries(p.cards)) { if (c.w) { const inf = k.split('|')[0]; weak[inf] = (weak[inf] || 0) + c.w; } }
    const weakTop = Object.entries(weak).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const kinds = Object.entries(p.errKinds).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxK = kinds.length ? kinds[0][1] : 1;
    return `<div class="chips">${ps.map((x) => `<button class="pill ${x.id === p.id ? 'on' : ''}" data-act="ppick" data-id="${esc(x.id)}"><span class="dot" style="background:${esc(x.color)}"></span> ${esc(x.name)}</button>`).join('')}</div>
    <section class="stats card"><div><b>${p.stats.sessions}</b><small>parties</small></div><div><b>${total}</b><small>questions</small></div><div><b>${acc}%</b><small>de réussite</small></div><div><b>🔥 ${p.streak.count}</b><small>jours d'affilée</small></div><div><b>${p.stats.hints || 0}</b><small>indices utilisés</small></div></section>
    <h3>Temps travaillés</h3>${perTense || '<p class="muted">Pas encore de données.</p>'}
    <h3>Types d'erreurs fréquentes</h3>${kinds.map(([k, n]) => `<div class="prow"><span>${esc(KIND_LABEL[k] || k)}</span><i class="bar"><u style="width:${(n / maxK) * 100}%;background:#ef476f"></u></i><small>${n}</small></div>`).join('') || '<p class="muted">Aucune erreur enregistrée 🎉</p>'}
    <h3>Verbes à retravailler</h3><div class="chips">${weakTop.map(([i, n]) => `<span class="pill">${esc(i)} <small>${n}</small></span>`).join('') || '<span class="muted">—</span>'}</div>
    <h3>Dernières parties</h3><div class="hist">${(p.history || []).slice(-8).reverse().map((h) => `<div><span>${new Date(h.at).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })} · ${esc({ mission: 'Mission', review: 'Révision', errors: 'Mes erreurs', practice: 'Entraînement', chrono: 'Chrono', list: 'Liste' }[h.mode] || 'Partie')}${h.ctx ? ' · ' + esc((TENSE_BY_ID[h.ctx.tense] || {}).name || '') : ''}</span><b>${h.first}/${h.total} ${'★'.repeat(h.stars || 0)}</b></div>`).join('') || '<span class="muted">—</span>'}</div>
    <h3>Dernières erreurs</h3><div class="errlog">${p.errLog.slice(-8).reverse().map((e) => `<div><b>${esc(e.inf)}</b> · ${esc((TENSE_BY_ID[e.t] || {}).name || e.t)} · ${esc(PERSONS[e.p])} : <s>${esc(e.given)}</s> → <b>${esc(plainText(e.exp))}</b></div>`).join('') || '<span class="muted">—</span>'}</div>
    <button class="small danger" data-act="preset-profile" data-id="${esc(p.id)}">Remettre à zéro la progression de ${esc(p.name)}</button>
    <button class="small danger" data-act="pdel-profile" data-id="${esc(p.id)}">Supprimer le joueur</button>`;
  }

  /* ---------- Exercices : choisir et moduler tout ce qui est joué ---------- */
  function exercisesTab() {
    const e = Store.exOf();
    const chk = (path, label, on, hint) => `<label class="chk"><input type="checkbox" data-ex="${path}" ${on ? 'checked' : ''}> <span>${label}${hint ? `<br><small class="muted">${hint}</small>` : ''}</span></label>`;
    const sel = (path, label, opts, cur) => `<label>${label}<select data-ex="${path}">${opts.map(([v, n]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    const PR = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
    return `<p class="muted">Choisis ce que l'enfant va travailler. Tout est modifiable ; les changements s'appliquent à la prochaine partie.</p>
    <section class="card form"><h3>🧩 Types de questions</h3>
      ${chk('types.choice', '🔘 Choisir parmi 4 réponses', e.types.choice, 'Plus facile.')}
      ${chk('types.type', '⌨️ Écrire la réponse', e.types.type, 'Plus difficile. Si seul ce type est coché, tout est à écrire.')}
      ${chk('types.pronoun', '👤 « Quel pronom ? »', e.types.pronoun, 'Reconnaître la personne à partir du verbe conjugué.')}
      ${chk('types.tense', '⏳ « Quel temps ? »', e.types.tense, 'Reconnaître le temps à partir du verbe conjugué.')}
      ${sel('recog', 'Fréquence de ces questions de reconnaissance', [[0, 'Jamais'], [7, 'Rare'], [14, 'Normale'], [25, 'Fréquente'], [40, 'Très fréquente']], e.recog)}
    </section>
    <section class="card form"><h3>👥 Pronoms travaillés</h3><div class="tenselist">${PR.map((n, i) => chk('persons.' + i, n, e.persons[i])).join('')}</div></section>
    <section class="card form"><h3>📚 Familles de verbes</h3><div class="tenselist">${[['aux', 'Être et avoir'], ['er', 'Verbes en -er'], ['ir2', 'Verbes en -ir (finir)'], ['re', 'Verbes en -re'], ['irr', 'Verbes rebelles']].map(([k, n]) => chk('families.' + k, n, e.families[k])).join('')}</div>
      <p class="muted">Les temps (présent, futur…) se choisissent dans <b>Réglages</b> ; la longueur des parties aussi.</p></section>
    <section class="card form"><h3>🏠 Jeux affichés sur l'accueil</h3>
      ${chk('modes.review', '▶ Jouer (révision du jour)', e.modes.review)}${chk('modes.adventure', '🗺️ Aventure (mondes et missions)', e.modes.adventure)}${chk('modes.chrono', '⏱️ Défi chrono', e.modes.chrono)}
      ${chk('modes.practice', '🎯 Je choisis (entraînement libre)', e.modes.practice)}${chk('modes.errors', '🩹 Mes erreurs', e.modes.errors)}
    </section>
    <section class="card form"><h3>🛟 Aides et rythme</h3>
      ${chk('hints', '💡 Autoriser les indices', e.hints)}
      ${sel('hintMax', 'Nombre d\'indices par question', [[1, '1 indice'], [2, '2 indices'], [3, '3 indices (méthode, coup de pouce, réponse à trous)']], e.hintMax)}
      ${chk('retry', '🔁 Reposer la question ratée 2 questions plus tard', e.retry)}
      ${sel('chronoSecs', 'Durée du défi chrono', [[30, '30 secondes'], [60, '60 secondes'], [90, '90 secondes'], [120, '2 minutes'], [180, '3 minutes']], e.chronoSecs)}
    </section>
    <button class="big" data-act="ex-reset">↺ Rétablir les valeurs par défaut</button>`;
  }

  /* ---------- Réglages ---------- */
  function settingsTab() {
    const s = settings();
    const sw = (k, label) => `<label class="chk"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}> ${label}</label>`;
    const players = Store.data.profiles.length ? `<section class="card form"><h3>👧 Joueurs</h3><p class="muted">Modifier le prénom d'un joueur (la progression est conservée).</p>${Store.data.profiles.map((x) => `<label><span class="dot" style="background:${esc(x.color)}"></span> <input data-pname="${esc(x.id)}" value="${esc(x.name)}" maxlength="20" aria-label="Prénom du joueur" autocomplete="off"></label>`).join('')}</section>` : '';
    return `${players}<section class="card form">
      <label>Objectif quotidien<select data-set="dailyGoal">${[10, 20, 30, 50].map((n) => `<option ${s.dailyGoal === n ? 'selected' : ''} value="${n}">${n} questions</option>`).join('')}</select></label>
      <label>Longueur d'une partie<select data-set="sessionLength">${[5, 10, 15, 20].map((n) => `<option ${(s.sessionLength || 10) === n ? 'selected' : ''} value="${n}">${n} questions</option>`).join('')}</select></label>
      <label>Façon de répondre<select data-set="inputMode">${[['auto', 'Automatique (choix puis écriture)'], ['choice', 'Toujours des choix (plus facile)'], ['type', 'Toujours écrire (plus difficile)']].map(([k, n]) => `<option value="${k}" ${s.inputMode === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Liste mise en avant sur l'accueil<select data-set="featuredList"><option value="">(aucune)</option>${[...new Set(A.verbs.flatMap((v) => v.lists || []))].map((l) => `<option ${s.featuredList === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      ${sw('sound', '🔊 Sons et bruitages')}${sw('speech', '🗣️ Lire les réponses à voix haute')}${sw('easyFont', '🔤 Police plus grande et plus espacée (confort de lecture / dys)')}
      ${sw('autoUnlock', '🔓 Débloquer automatiquement les temps bonus (12 ⭐)')}
    </section>
    <h3>Temps de conjugaison disponibles</h3>
    <div class="tenselist">${TENSES.map((T) => `<label class="chk"><input type="checkbox" data-tense="${T.id}" ${s.tenses[T.id] ? 'checked' : ''}> ${T.emoji} <b>${esc(T.name)}</b> ${T.core ? '' : '<small>(bonus)</small>'}</label>`).join('')}</div>
    <p class="muted">Repères scolaires (Suisse romande, 5H–6H, élèves de 8 à 10 ans) : présent, futur, imparfait, passé composé, impératif. Les temps bonus se débloquent seuls avec les étoiles.</p>`;
  }

  /* ---------- Partage ---------- */
  function shareTab() {
    const custom = A.verbs.filter((v) => v._custom || v._mod);
    const appUrl = location.origin + location.pathname;
    const sy = Sync.on ? Store.data.sync : null;
    const syncCard = sy ? `<section class="card"><h3>☁️ Synchronisation entre appareils : <span class="ok-t">activée</span></h3>
      <p class="muted">${sy.scope === 'verbs' ? 'Cet appareil synchronise les <b>verbes</b> et les réglages.' : 'Cet appareil synchronise les <b>verbes, réglages et joueurs</b>.'}
        ${Sync.state.status === 'error' ? `<br><b class="bad-t">⚠️ ${esc(Sync.state.error)}</b>` : Sync.state.status === 'busy' ? '<br>Synchronisation…' : sy.last ? `<br>Dernière synchro : <b>${new Date(sy.last).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' })}</b>` : ''}</p>
      <button class="big" data-act="sync-now">🔄 Synchroniser maintenant</button>
      <p><b>Ajouter un appareil :</b> ouvre ce lien dessus.</p>
      <div class="actions"><button class="big" data-act="sync-link" data-s="all">👧 Pour un enfant<small>verbes + joueurs</small></button><button class="big" data-act="sync-link" data-s="verbs">👩‍🏫 Pour Aurore<small>verbes seulement</small></button></div>
      <div id="synclink"></div>
      <button class="small danger" data-act="sync-off">Arrêter la synchro sur cet appareil</button></section>`
      : `<section class="card"><h3>☁️ Synchroniser plusieurs appareils</h3>
      <p>Les verbes d'Aurore, les réglages et la progression des enfants se retrouvent sur tous les appareils, automatiquement. Il faut une fois créer une petite base Firebase gratuite (5 min, voir <b>SYNC.md</b> dans le dépôt), puis coller sa configuration ici :</p>
      <textarea id="fbcfg" rows="5" placeholder='const firebaseConfig = { apiKey: "…", projectId: "…", … };'></textarea>
      <button class="big primary" data-act="sync-enable">Activer la synchro</button>
      <p class="muted">Déjà configurée sur un autre appareil ? Ouvre simplement le lien de synchro qu'on t'a envoyé.</p></section>`;
    const updCard = `<section class="card"><h3>🔄 Version de l'appli</h3><p class="muted">Conjugo <b>${Rewards.APP_VERSION}</b> · récompenses v${Rewards.REWARDS_VERSION}. Les mises à jour se téléchargent toutes seules ; tes joueurs, trophées et objets sont conservés.</p>
      <button class="big" data-act="s-update">🔄 Chercher une mise à jour</button></section>`;
    return `${syncCard}${updCard}<section class="card"><h3>📲 Donner l'appli à quelqu'un</h3>
      <p>L'appli est publique : n'importe qui peut l'ouvrir avec ce lien (téléphone, tablette ou ordinateur), sans compte ni installation.</p>
      <input readonly value="${esc(appUrl)}" id="appurl" aria-label="Adresse de l'appli">
      <div class="actions"><button class="big primary" data-act="s-appcopy">📋 Copier le lien</button>${navigator.share ? '<button class="big" data-act="s-appshare">📤 Envoyer…</button>' : ''}</div>
      <p id="persist" class="muted"></p></section>
    <section class="card"><h3>👩‍🏫 Partager des verbes avec quelqu'un</h3>
      <p>Chaque personne qui ajoute des verbes dans <b>Verbes ➜ Ajouter</b> peut les envoyer aux autres : un simple lien à coller dans un message. Il suffit de l'ouvrir sur l'appareil de l'enfant pour que les verbes s'ajoutent (rien n'est écrasé sans demander).</p>
      <label>Ton prénom (pour signer)<input data-author value="${esc(Store.data.author || '')}" maxlength="30" placeholder="Aurore"></label>
      <p><b>${custom.length}</b> verbe${custom.length > 1 ? 's' : ''} ajouté${custom.length > 1 ? 's' : ''} ou modifié${custom.length > 1 ? 's' : ''} à partager.</p>
      <button class="big primary" data-act="s-link" ${custom.length ? '' : 'disabled'}>🔗 Créer un lien de partage</button>
      <div id="sharebox"></div></section>
    <section class="card"><h3>📁 Fichier (pour beaucoup de verbes)</h3>
      <div class="actions"><button class="big" data-act="s-export" ${custom.length ? '' : 'disabled'}>⬇️ Exporter mes verbes</button><button class="big" data-act="s-import">⬆️ Importer un fichier</button></div></section>
    <section class="card"><h3>💾 Sauvegarde complète</h3><p>Joueurs, progression, réglages et verbes. Utile pour changer de tablette.</p>
      <div class="actions"><button class="big" data-act="s-backup">⬇️ Sauvegarder</button><button class="big" data-act="s-restore">⬆️ Restaurer</button></div></section>
    <section class="card"><h3>📲 Toujours disponible</h3><p>Installe l'appli sur l'écran d'accueil : elle marche aussi <b>sans internet</b>.</p><button class="big" data-act="install-help">Comment faire ?</button></section>
    <input type="file" id="fileIn" accept="application/json,.json" hidden>`;
  }
  function download(name, obj) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function pickFile(cb) {
    const i = $('#fileIn'); i.value = '';
    i.onchange = async () => { const f = i.files[0]; if (!f) return; try { cb(JSON.parse(await f.text())); } catch (e) { toast('Fichier illisible 😕'); } };
    i.click();
  }
  function confirmImport(list, by) {
    const ok = list.map((r) => Store.sanitizeVerb(r)).filter(Boolean);
    if (!ok.length) { toast('Aucun verbe valide dans ce partage'); return; }
    modal(`<h2>📥 Ajouter ${ok.length} verbe${ok.length > 1 ? 's' : ''} ?</h2>${by ? `<p>Envoyé par <b>${esc(by)}</b></p>` : ''}
      <div class="chips">${ok.slice(0, 40).map((v) => `<span class="pill">${esc(v.emoji || '')} ${esc(v.inf)}${verbByInf(v.inf) ? ' <small>(déjà là)</small>' : ''}</span>`).join('')}${ok.length > 40 ? '<span class="pill">…</span>' : ''}</div>
      <div class="actions"><button class="big" data-act="close">Non merci</button><button class="big primary" id="doimp">Ajouter ✔</button></div>`);
    $('#doimp').onclick = () => {
      const r = Store.mergeVerbs(ok); refreshVerbs(); closeModal();
      toast(`${r.added} ajouté${r.added > 1 ? 's' : ''}${r.updated ? `, ${r.updated} mis à jour` : ''} ✔`);
      render();
    };
  }

  const actions = {
    ptab: (el) => { A.params = { tab: el.dataset.t, pid: A.params.pid }; render(); },
    ppick: (el) => { A.params.pid = el.dataset.id; render(); },
    'v-add': () => openEditor(),
    'v-edit': (el) => openEditor(el.dataset.v),
    'v-del': (el) => {
      const inf = el.dataset.v, isBase = Store.baseVerbs().some((b) => b.inf === inf);
      if (!confirm(isBase ? `Masquer « ${inf} » du jeu ? (tu pourras le rétablir)` : `Supprimer « ${inf} » ?`)) return;
      Store.removeVerb(inf); refreshVerbs(); render();
    },
    'v-restore': (el) => { Store.restoreVerb(el.dataset.v); refreshVerbs(); toast('Rétabli ✔'); render(); },
    's-link': async (el) => {
      const custom = A.verbs.filter((v) => v._custom || v._mod);
      const code = await Store.encodeShare(custom);
      const url = location.origin + location.pathname + '#import=' + code;
      $('#sharebox').innerHTML = `<textarea readonly rows="4" id="shareurl">${esc(url)}</textarea>
        <div class="actions"><button class="big" data-act="s-copy">📋 Copier</button>${navigator.share ? '<button class="big" data-act="s-native">📤 Envoyer…</button>' : ''}</div>
        ${url.length > 6000 ? '<p class="warn">Ce lien est long : certains messages pourraient le couper. Préfère le fichier.</p>' : ''}`;
    },
    'sync-enable': async () => {
      const c = Sync.parseFirebaseConfig($('#fbcfg').value || '');
      if (!c) { toast('Configuration non reconnue : copie le bloc « firebaseConfig » en entier'); return; }
      await Sync.enable(c); toast(Sync.state.status === 'error' ? 'Erreur : ' + Sync.state.error : 'Synchronisation activée ✔'); render();
    },
    'sync-now': async () => { await Sync.run(); render(); },
    'sync-link': async (el) => {
      const link = Sync.joinLink(el.dataset.s);
      $('#synclink').innerHTML = `<textarea readonly rows="4" id="shareurl">${esc(link)}</textarea><div class="actions"><button class="big" data-act="s-copy">📋 Copier</button>${navigator.share ? '<button class="big" data-act="s-native">📤 Envoyer…</button>' : ''}</div><p class="warn">Ce lien donne accès aux données de la famille : ne l'envoie qu'à des personnes de confiance.</p>`;
    },
    'sync-off': () => { if (confirm('Arrêter la synchronisation sur cet appareil ? Les données restent ici, mais ne seront plus partagées.')) { Sync.disable(); render(); } },
    's-appcopy': async () => { const t = $('#appurl'); try { await navigator.clipboard.writeText(t.value); } catch (e) { t.select(); document.execCommand('copy'); } toast('Lien copié ✔'); },
    's-appshare': () => navigator.share({ title: 'Conjugo', text: 'Conjugo : apprendre la conjugaison en jouant', url: $('#appurl').value }).catch(() => {}),
    's-copy': async () => { const t = $('#shareurl'); try { await navigator.clipboard.writeText(t.value); toast('Lien copié ✔'); } catch (e) { t.select(); document.execCommand('copy'); toast('Lien copié ✔'); } },
    's-native': () => navigator.share({ title: 'Verbes pour Conjugo', text: 'Voici des verbes à ajouter dans l\'appli de conjugaison :', url: $('#shareurl').value }).catch(() => {}),
    's-export': () => download('verbes-conjugo.json', { v: 1, by: Store.data.author || '', verbs: A.verbs.filter((v) => v._custom || v._mod).map(({ _custom, _mod, ...v }) => v) }),
    's-import': () => pickFile((o) => confirmImport(Array.isArray(o) ? o : o.verbs || [], o.by || '')),
    'ex-reset': () => { Store.data.settings.ex = Store.defaultEx(); Store.bumpSettings(); Store.save(); toast('Exercices : valeurs par défaut rétablies'); render(); },
    's-update': async () => {
      try {
        const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (!r) { toast('Mise à jour automatique indisponible ici (ouvre l\'appli installée).'); return; }
        toast('Recherche en cours…'); A.reloadPending = false; await r.update();
        setTimeout(() => toast(r.installing || r.waiting ? 'Nouvelle version trouvée : rechargement…' : 'Tu as déjà la dernière version ✔'), 1500);
      } catch (e) { toast('Impossible de vérifier (pas d\'internet ?)'); }
    },
    's-backup': () => { download('sauvegarde-conjugo.json', { app: 'conjugo', v: 1, data: Store.data }); Store.data.lastBackup = Date.now(); Store.save(); showPersist(); },
    's-restore': () => pickFile((o) => {
      if (!o || o.app !== 'conjugo' || !o.data) { toast('Ce n\'est pas une sauvegarde Conjugo'); return; }
      if (!confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
      Store.replaceAll(o.data); refreshVerbs(); toast('Sauvegarde restaurée ✔'); go('home');
    }),
    'preset-profile': (el) => {
      const p = Store.data.profiles.find((x) => x.id === el.dataset.id);
      if (p && confirm(`Remettre à zéro la progression de ${p.name} ?`)) { const n = Store.newProfile(p.name, p.color); n.id = p.id; Object.assign(p, n); Store.save(); render(); }
    },
    'pdel-profile': (el) => {
      const p = Store.data.profiles.find((x) => x.id === el.dataset.id);
      if (p && confirm(`Supprimer définitivement le joueur ${p.name} ?`)) { Store.deleteProfile(p.id); A.params.pid = ''; if (!Store.data.profiles.length) go('welcome'); else render(); }
    },
  };

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.closest('#app')) return;
    if (t.dataset.ex) {
      const e = Store.exOf(), path = t.dataset.ex.split('.');
      const val = t.type === 'checkbox' ? t.checked : (t.tagName === 'SELECT' ? +t.value : t.value);
      if (path.length === 2) e[path[0]][path[1]] = val; else e[path[0]] = val;
      const bad = Store.exProblem(e);
      if (bad) { toast(bad); render(); return; }
      Store.data.settings.ex = e; Store.bumpSettings(); Store.save();
    } else if (t.dataset.pname) {
      const pl = Store.data.profiles.find((x) => x.id === t.dataset.pname), name = t.value.trim().slice(0, 20);
      if (!pl) return;
      if (!name) { t.value = pl.name; toast('Le prénom ne peut pas être vide'); return; }
      if (name !== pl.name) { pl.name = name; Store.save(); toast(`Joueur renommé : ${name} ✔`); const cur = prof(); if (cur) renderTop(cur); }
    } else if (t.dataset.set) {
      const k = t.dataset.set; const s = settings();
      s[k] = t.type === 'checkbox' ? t.checked : (['dailyGoal', 'sessionLength'].includes(k) ? +t.value : t.value);
      if (['dailyGoal', 'sessionLength', 'inputMode', 'autoUnlock', 'featuredList'].includes(k)) Store.bumpSettings();
      Store.save(); FX.configure({ sound: s.sound, speech: s.speech }); document.body.classList.toggle('easy', !!s.easyFont);
    } else if (t.dataset.tense) {
      settings().tenses[t.dataset.tense] = t.checked; Store.bumpSettings(); Store.save();
    } else if (t.id === 'pvf') { vf = t.value; render(); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'pvq') { vq = t.value; const pos = t.selectionStart; render(); const n = $('#pvq'); n.focus(); n.setSelectionRange(pos, pos); }
    else if (t.dataset && t.dataset.author !== undefined) { Store.data.author = t.value.slice(0, 30); Store.save(); }
  });

  function confirmJoin(j) {
    const n = Store.data.profiles.length;
    modal(`<h2>☁️ Rejoindre la synchronisation ?</h2>
      <p>${j.scope === 'verbs' ? 'Cet appareil recevra et enverra les <b>verbes</b> et les réglages.' : 'Cet appareil recevra et enverra les <b>verbes, réglages et joueurs</b>.'}</p>
      ${j.scope === 'all' && n ? `<p class="warn">Les ${n} joueur${n > 1 ? 's' : ''} déjà présent${n > 1 ? 's' : ''} sur cet appareil seront ajoutés à la famille. Pour retrouver un enfant déjà créé ailleurs, mieux vaut rejoindre <b>avant</b> de le recréer ici.</p>` : ''}
      <div class="actions"><button class="big" data-act="close">Non merci</button><button class="big primary" id="dojoin">Rejoindre ✔</button></div>`);
    $('#dojoin').onclick = async () => {
      closeModal(); toast('Synchronisation…');
      await Sync.enable(j);
      refreshVerbs(); if (!Store.profile() && Store.data.profiles.length) Store.selectProfile(Store.data.profiles[0].id);
      toast(Sync.state.status === 'error' ? 'Erreur : ' + Sync.state.error : 'Appareil synchronisé ✔'); render();
    };
  }

  return { gate, actions, confirmImport, confirmJoin };
})();
