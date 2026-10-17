/* Interface des récompenses : trophées, boutique, avatar 3D, nouveautés après mise à jour. */
const RUI = (() => {
  const P = AvatarParts;
  const deps = {
    levelOf: (xp) => Store.levelOf(xp),
    typeOf: (inf) => { if (inf === 'être' || inf === 'avoir') return 'aux'; const v = verbByInf(inf); return v ? v.type : null; },
    starsTotal, masteredCount, formsUnlocked: (p, x) => Rewards.formsUnlocked(p, x),
  };
  function masteredCount(p) {
    const seen = new Set(Object.keys(p.cards).map((k) => k.split('|').slice(0, 2).join('|')));
    let n = 0;
    for (const s of seen) {
      const [inf, t] = s.split('|'); const v = verbByInf(inf);
      if (v && TENSE_BY_ID[t] && cellsOf(v, t).length && Store.mastery(p, inf, t, cellsOf(v, t)) === 1) n++;
    }
    return n;
  }
  const ctx = (p) => Rewards.context(p, deps);
  const bump = (p, k, n = 1) => { p.stats[k] = (p.stats[k] || 0) + n; };

  /** Attribue les trophées mérités (avec pièces, messages et confettis). Retourne la liste des nouveaux. */
  function check(quiet) {
    const p = prof(); if (!p) return [];
    const aw = Rewards.award(p, ctx(p));
    if (aw.list.length) {
      p.coins += aw.coins; Store.save();
      if (!quiet) {
        aw.list.slice(0, 4).forEach((b, i) => setTimeout(() => toast(`${b.emoji} Trophée : ${b.name} (+${Rewards.TIER_COINS[b.tier - 1]} 🪙)`), i * 900));
        if (aw.list.length > 4) setTimeout(() => toast(`… et ${aw.list.length - 4} autres trophées !`), 4 * 900);
        FX.play('win'); FX.confetti(90);
      }
      if (A.view !== 'game') renderTop(p);
    }
    return aw.list;
  }

  const metabs = (cur) => `<div class="metabs" role="tablist">${[['trophies', '🏆', 'Trophées'], ['shop', '🎒', 'Boutique'], ['avatar', '🧙', 'Avatar 3D']].map(([v, e, n]) => `<button role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-go="${v}"><span>${e}</span>${n}</button>`).join('')}</div>`;

  /* =========================== TROPHÉES =========================== */
  const TF = { cat: 'all', show: 'all' };
  function badgeCard(b, p, x) {
    const got = !!p.badges[b.id], pr = Rewards.progress(b, p, x), hide = b.secret && !got;
    const prog = !got && !hide ? `<i class="bar"><u style="width:${pr.pct}%"></u></i><em>${Math.min(pr.val, b.goal)}/${b.goal}</em>` : got ? `<em class="tn">${Rewards.TIER_NAMES[b.tier - 1]}</em>` : '';
    return `<div class="badge t${b.tier} ${got ? 'got' : ''}"><span class="${got ? '' : 'dim'}">${hide ? '🎁' : b.emoji}</span><b>${hide ? 'Surprise !' : esc(b.name)}</b><small>${hide ? 'Un trophée secret…' : esc(b.desc)}</small>${prog}</div>`;
  }
  views.trophies = () => {
    const p = prof();
    check();
    const x = ctx(p); x.badgeCount = Rewards.earnedCount(p);
    const total = p.stats.correct + p.stats.wrong, acc = total ? Math.round((p.stats.correct / total) * 100) : 0;
    const B = Rewards.BADGES, got = B.filter((b) => p.badges[b.id]);
    const byTier = [1, 2, 3, 4].map((t) => got.filter((b) => b.tier === t).length);
    const soon = B.filter((b) => !p.badges[b.id] && !b.secret).map((b) => ({ b, pr: Rewards.progress(b, p, x) })).filter((o) => o.pr.pct < 100).sort((a, c) => c.pr.pct - a.pr.pct).slice(0, 3);
    const cats = Rewards.CATS.map((c) => ({ c, n: B.filter((b) => b.cat === c.id).length, g: got.filter((b) => b.cat === c.id).length }));
    const shown = B.filter((b) => (TF.cat === 'all' || b.cat === TF.cat) && (TF.show === 'all' || (TF.show === 'got') === !!p.badges[b.id]));
    const groups = Rewards.CATS.map((c) => ({ c, list: shown.filter((b) => b.cat === c.id) })).filter((g) => g.list.length);
    setView(`${metabs('trophies')}<h2 class="title">🏆 Mes trophées</h2>
    <section class="card trsum"><div class="trbig"><b>${got.length}</b><small>/ ${B.length} trophées</small></div>
      <i class="bar"><u style="width:${Math.round((got.length / B.length) * 100)}%"></u></i>
      <div class="tiers">${Rewards.TIER_NAMES.map((n, i) => `<span class="t${i + 1}">${['🥉', '🥈', '🥇', '💎'][i]} ${byTier[i]}</span>`).join('')}</div></section>
    <section class="stats card"><div><b>${p.stats.correct}</b><small>bonnes réponses</small></div><div><b>${acc}%</b><small>de réussite</small></div><div><b>${p.stats.bestCombo}</b><small>meilleur combo</small></div><div><b>${x.mastered}</b><small>temps maîtrisés</small></div></section>
    ${soon.length ? `<h3>🔜 Bientôt !</h3><div class="badges soon">${soon.map((o) => badgeCard(o.b, p, x)).join('')}</div>` : ''}
    <div class="chips tfilter">${[['all', 'Tous'], ['got', 'Obtenus'], ['todo', 'À gagner']].map(([k, n]) => `<button class="pill ${TF.show === k ? 'on' : ''}" data-act="tf-show" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="chips tcats"><button class="pill ${TF.cat === 'all' ? 'on' : ''}" data-act="tf-cat" data-c="all">Toutes les catégories</button>${cats.map((o) => `<button class="pill ${TF.cat === o.c.id ? 'on' : ''}" data-act="tf-cat" data-c="${o.c.id}">${o.c.emoji} ${esc(o.c.name)} <small>${o.g}/${o.n}</small></button>`).join('')}</div>
    ${groups.map((g) => `<h3>${g.c.emoji} ${esc(g.c.name)}</h3><div class="badges">${g.list.map((b) => badgeCard(b, p, x)).join('')}</div>`).join('') || '<p class="muted center">Rien à afficher ici pour le moment.</p>'}`);
  };

  /* =========================== BOUTIQUE =========================== */
  const SH = { kind: 'hat' };
  views.shop = () => {
    const p = prof(), x = ctx(p), kind = SH.kind;
    const stage = Store.stageOf(x.level);
    const eq = (k) => p.equipped[k] || '';
    const tile = (it, own, on, act, data, label) => `<button class="item ${on ? 'on' : ''} ${own ? '' : 'lock'}" data-act="${act}" ${data}><span class="e">${it.emoji || ''}</span><small>${esc(it.name)}</small><em>${label}</em></button>`;
    let grid = '';
    if (kind === 'skin') {
      grid = Rewards.SKINS.map(([c, lock]) => {
        const id = 'skin:' + c, own = Rewards.usable(p, x, lock, id), on = p.color === c;
        return `<button class="item ${on ? 'on' : ''} ${own ? '' : 'lock'}" data-act="shop-tap" data-id="${esc(id)}"><span class="swatch" style="background:${c}"></span><em>${on ? 'Choisi ✔' : own ? 'Choisir' : Rewards.lockText(lock)}</em></button>`;
      }).join('');
    } else {
      const none = Rewards.NONE[kind];
      grid = tile({ name: none[0], emoji: none[1] }, true, !eq(kind), 'shop-tap', `data-id="${kind}:"`, !eq(kind) ? 'Porté ✔' : 'Mettre')
        + Rewards.SHOP.filter((i) => i.kind === kind).map((it) => {
          const own = Rewards.usable(p, x, it.lock, it.id), on = eq(kind) === it.val;
          return tile(it, own, on, 'shop-tap', `data-id="${esc(it.id)}"`, on ? 'Porté ✔' : own ? 'Mettre' : Rewards.lockText(it.lock));
        }).join('');
    }
    const kinds = Rewards.SHOP_KINDS.map(([k, n, e]) => `<button class="pill ${k === kind ? 'on' : ''}" data-act="shop-kind" data-k="${k}">${e} ${n}</button>`).join('');
    setView(`${metabs('shop')}<h2 class="title">🎒 Boutique</h2><p class="coins">🪙 <b>${p.coins}</b> pièces</p>
    <div class="center preview">${mascotOf(p, { stage, mood: 'cheer', size: 170 })}</div>
    <div class="chips kinds">${kinds}</div><div class="items">${grid}</div>
    <p class="muted center small">🔒 = à débloquer avec un niveau ou un trophée. Plus d'objets dans l'<a href="#" data-go="avatar">avatar 3D</a> !</p>`);
  };

  /* =========================== AVATAR 3D =========================== */
  const AV = { tab: 'form', pv: null, h: null, x: null };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const CATALOG = { 'col.body': 'color', 'col.belly': 'color', 'col.accent': 'color', eye: 'eyeColor' };
  const catalogOf = (slot) => CATALOG[slot] || slot;
  const OPTIONAL = ['hat', 'glasses', 'neck', 'back', 'hand', 'feet', 'aura'];
  function setCfg(c, slot, id) { if (slot.startsWith('col.')) c.col[slot.slice(4)] = id; else c[slot] = id; }
  const getCfg = (c, slot) => (slot.startsWith('col.') ? c.col[slot.slice(4)] : c[slot]);
  function ocfg(p) { return Rewards.clampAvatar(p, AV.x, Rewards.avatarOf(p)); }
  function shown(p) { const c = clone(ocfg(p)); if (AV.pv) setCfg(c, AV.pv.slot, AV.pv.id); return c; }
  const buildOpts = (p) => ({ stage: Store.stageOf(AV.x.level), color: p.color });
  function touch(p) { const a = Rewards.avatarOf(p); a.t = Date.now(); bump(p, 'avatarSaves'); }

  function lockedView(p, x) {
    const need = Store.xpFor(Rewards.AVATAR_LEVEL) - p.xp;
    return `${metabs('avatar')}<h2 class="title">🧙 Avatar 3D</h2>
    <section class="card center"><div class="avlock">${mascotOf(p, { stage: 0, mood: 'think', size: 150 })}</div>
      <h3>Une récompense spéciale t'attend !</h3>
      <p>Atteins le <b>niveau ${Rewards.AVATAR_LEVEL}</b> pour faire éclore ton <b>avatar 3D</b> : tu pourras le faire tourner, le transformer et l'habiller avec plus de 200 accessoires.</p>
      <p class="muted">Encore <b>${Math.max(0, need)} XP</b> : joue quelques parties !</p>
      <button class="big primary" data-act="review">▶ Jouer</button></section>`;
  }

  const tileHtml = (p, x, slot, it, none) => {
    const cat = catalogOf(slot), cur = getCfg(ocfg(p), slot);
    const id = none ? '' : it.id, on = cur === id;
    const ok = none || Rewards.usable(p, x, it.lock, P.itemId(cat, id));
    const pv = AV.pv && AV.pv.slot === slot && AV.pv.id === id;
    const icon = cat === 'color' ? (id ? `<span class="swatch ${id === 'rainbow' ? 'rb' : ''}" style="background:${id === 'rainbow' ? '' : id}"></span>` : '<span class="e">🎯</span>') : cat === 'eyeColor' ? `<span class="swatch" style="background:${id}"></span>` : `<span class="e">${none ? '🚫' : it.emoji || ''}</span>`;
    const name = none ? (slot.startsWith('col.') ? 'Auto' : 'Aucun') : cat === 'eyeColor' ? '' : esc(it.name);
    const lab = on ? '✔' : ok ? '' : Rewards.lockText(it.lock);
    return `<button class="avt ${on ? 'on' : ''} ${pv ? 'try' : ''} ${ok ? '' : 'lock'}" data-act="av-tap" data-slot="${slot}" data-id="${esc(id)}" aria-pressed="${on}"><span class="ic">${icon}</span><small>${name}</small><em>${lab}</em></button>`;
  };
  const section = (p, x, title, slot, opt) => {
    const cat = catalogOf(slot);
    return `<h4>${title}</h4><div class="avgrid">${opt ? tileHtml(p, x, slot, null, true) : ''}${P.ITEMS[cat].map((it) => tileHtml(p, x, slot, it, false)).join('')}</div>`;
  };

  function panelHtml(p, x) {
    const t = AV.tab, a = ocfg(p);
    if (t === 'form') {
      const stage = Store.stageOf(x.level), nat = P.FORMS.find((f) => f.stage === stage);
      return `<h4>Transformations <small>(${Rewards.formsUnlocked(p, x)}/${P.FORMS.length} débloquées)</small></h4><div class="avgrid"><button class="avt ${a.form === 'auto' ? 'on' : ''}" data-act="av-tap" data-slot="form" data-id="auto"><span class="ic"><span class="e">🌱</span></span><small>Évolution naturelle</small><em>${a.form === 'auto' ? '✔' : esc(nat.name)}</em></button>${P.FORMS.map((it) => tileHtml(p, x, 'form', it, false)).join('')}</div>`;
    }
    if (t === 'color') return section(p, x, '🎨 Corps', 'col.body', true) + section(p, x, '💧 Ventre', 'col.belly', true) + section(p, x, '✏️ Détails', 'col.accent', true) + section(p, x, '🐆 Motif', 'pat') + section(p, x, '💎 Matière', 'fin');
    if (t === 'face') return section(p, x, '👀 Yeux', 'eyes') + section(p, x, '👄 Bouche', 'mouth') + section(p, x, '🎯 Pupilles', 'eye');
    if (OPTIONAL.includes(t)) return section(p, x, P.SLOTS.find((s) => s.id === t).emoji + ' ' + P.SLOTS.find((s) => s.id === t).name, t, true);
    if (t === 'scene') return section(p, x, '🏝️ Décors', 'scene');
    if (t === 'pose') return section(p, x, '💃 Poses', 'pose');
    if (t === 'outfit') {
      const slots = [0, 1, 2].map((i) => {
        const o = a.outfits[i];
        return `<div class="card outfit"><canvas class="ofc" width="120" height="120" data-i="${i}" ${o ? '' : 'hidden'}></canvas><div class="ofi"><b>Tenue ${i + 1}</b><small>${o ? 'Enregistrée' : 'Vide'}</small>
          <div class="row"><button class="small primary" data-act="of-save" data-i="${i}">💾 Enregistrer</button>${o ? `<button class="small" data-act="of-wear" data-i="${i}">👕 Mettre</button>` : ''}</div></div></div>`;
      }).join('');
      return `<h4>Mes tenues</h4><p class="muted">Garde jusqu'à 3 looks préférés et retrouve-les en un toucher.</p>${slots}
        <h4>Autres</h4><div class="actions"><button class="big" data-act="av-random">🎲 Look surprise</button><button class="big" data-act="av-clear">🧹 Tout retirer</button></div>
        <label class="chk"><input type="checkbox" data-act="av-home" ${a.home ? 'checked' : ''}> Afficher mon avatar 3D sur l'accueil</label>`;
    }
    return '';
  }
  function bannerHtml(p) {
    if (!AV.pv) return '';
    const pv = AV.pv, it = pv.id ? P.find(catalogOf(pv.slot), pv.id) : null; if (!it) return '';
    const l = Rewards.parseLock(it.lock);
    const buy = l.t === 'coins' ? `<button class="small primary" data-act="av-buy" ${p.coins >= l.n ? '' : 'disabled'}>Acheter 🪙 ${l.n}</button>${p.coins >= l.n ? '' : `<small>Il te manque ${l.n - p.coins} 🪙</small>`}` : `<small>🔒 ${esc(Rewards.lockHelp(it.lock))}</small>`;
    return `<div class="card avbanner"><span>👀 Essai : <b>${esc(it.emoji || '')} ${esc(it.name || it.id)}</b></span><div class="row">${buy}<button class="small" data-act="av-cancel">Annuler</button></div></div>`;
  }
  function refreshPanel() {
    const p = prof(), x = AV.x;
    const b = $('#avbanner'), pn = $('#avpanel'), t = $('#avtabs');
    if (b) b.innerHTML = bannerHtml(p);
    if (pn) { const sc = pn.scrollTop; pn.innerHTML = panelHtml(p, x); pn.scrollTop = sc; }
    if (t) $$('button', t).forEach((el) => { el.classList.toggle('on', el.dataset.tab === AV.tab); el.setAttribute('aria-selected', el.dataset.tab === AV.tab); });
    if (AV.h) AV.h.update(shown(p), { opts: buildOpts(p) });
    if (AV.tab === 'outfit') drawOutfits(p);
    const c = $('#avcoins'); if (c) c.textContent = p.coins;
  }
  function drawOutfits(p) {
    const a = ocfg(p);
    $$('.ofc').forEach((cv) => { const o = a.outfits[+cv.dataset.i]; if (!o) return; try { const c = Object.assign(clone(a), clone(o)); Avatar3D.still(cv, Avatar3D.build(c, P, Object.assign({ quality: 0.8 }, buildOpts(p))), { zoom: 1.1 }); } catch (e) { /* ignore */ } });
  }

  views.avatar = () => {
    const p = prof(), x = ctx(p); AV.x = x;
    if (!Rewards.avatarUnlocked(x)) { AV.h = null; setView(lockedView(p, x)); return; }
    const a = Rewards.avatarOf(p);
    setView(`${metabs('avatar')}<h2 class="title">🧙 Mon avatar 3D</h2>
    <section class="avstage card"><div id="avcanvas"></div>
      <div class="avtools"><button class="small" data-act="av-spin" aria-label="Tourner tout seul">🔄</button><button class="small" data-act="av-random" aria-label="Look surprise">🎲</button><button class="small" data-act="av-photo" aria-label="Prendre une photo">📸</button></div>
      <small class="muted">Glisse pour tourner · pince pour zoomer · touche-le pour le chatouiller · 🪙 <b id="avcoins">${p.coins}</b></small></section>
    <div id="avbanner"></div>
    <div class="tabs" id="avtabs" role="tablist">${P.SLOTS.map((s) => `<button role="tab" data-act="av-tab" data-tab="${s.id}" class="${s.id === AV.tab ? 'on' : ''}" aria-selected="${s.id === AV.tab}">${s.emoji} ${s.name}</button>`).join('')}</div>
    <div id="avpanel" class="avpanel">${panelHtml(p, x)}</div>`);
    AV.pv = null;
    AV.h = Avatar3D.mount($('#avcanvas'), shown(p), P, { size: 340, opts: buildOpts(p), onBoop: () => { FX.play('ok'); bump(p, 'boops'); if (p.stats.boops % 5 === 0) { Store.save(); check(); } } });
    if (AV.tab === 'outfit') drawOutfits(p);
  };

  function apply(p, slot, id) {
    const a = Rewards.avatarOf(p);
    const cur = getCfg(a, slot);
    if (slot !== 'form' && OPTIONAL.includes(slot) && cur === id) id = ''; // retoucher un accessoire l'enlève
    setCfg(a, slot, id); touch(p); AV.pv = null; Store.save(); FX.play('tap');
    if (slot === 'pose' && AV.h) AV.h.setPose(id);
    refreshPanel(); check();
  }

  function randomLook(p, x) {
    const a = clone(Rewards.avatarOf(p));
    const okIn = (cat, it) => Rewards.usable(p, x, it.lock, P.itemId(cat, it.id));
    const pickIn = (cat) => { const l = P.ITEMS[cat].filter((it) => okIn(cat, it)); return l.length ? l[Math.floor(Math.random() * l.length)].id : null; };
    const f = pickIn('form'); if (f) a.form = Math.random() < 0.3 ? 'auto' : f;
    for (const k of OPTIONAL) a[k] = Math.random() < (k === 'aura' ? 0.4 : 0.6) ? (pickIn(k) || '') : '';
    for (const [k, c] of [['eyes', 'eyes'], ['mouth', 'mouth'], ['pat', 'pat'], ['scene', 'scene']]) a[k] = pickIn(c) || a[k];
    a.eye = pickIn('eyeColor') || a.eye;
    a.col = { body: Math.random() < 0.7 ? pickIn('color') || '' : '', belly: Math.random() < 0.4 ? pickIn('color') || '' : '', accent: Math.random() < 0.5 ? pickIn('color') || '' : '' };
    return a;
  }

  const avActions = {
    'av-tab': (el) => { AV.tab = el.dataset.tab; AV.pv = null; refreshPanel(); const t = el; if (t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' }); },
    'av-tap': (el) => {
      const p = prof(), x = AV.x, slot = el.dataset.slot, id = el.dataset.id;
      if (slot === 'form' && id === 'auto') { apply(p, 'form', 'auto'); return; }
      const cat = catalogOf(slot), none = id === '' && (OPTIONAL.includes(slot) || slot.startsWith('col.'));
      const it = none ? null : P.find(cat, id);
      if (!none && !it) return;
      if (none || Rewards.usable(p, x, it.lock, P.itemId(cat, id))) apply(p, slot, id);
      else { AV.pv = { slot, id }; FX.play('tap'); refreshPanel(); }
    },
    'av-cancel': () => { AV.pv = null; refreshPanel(); },
    'av-buy': () => {
      const p = prof(), pv = AV.pv; if (!pv) return;
      const cat = catalogOf(pv.slot), it = P.find(cat, pv.id), l = it && Rewards.parseLock(it.lock);
      if (!it || l.t !== 'coins') return;
      if (p.coins < l.n) { toast(`Il te manque ${l.n - p.coins} 🪙 — continue à jouer !`); return; }
      p.coins -= l.n; p.owned.push(P.itemId(cat, it.id)); renderTop(p);
      FX.play('win'); FX.confetti(50);
      apply(p, pv.slot, pv.id);
    },
    'av-spin': () => { if (!AV.h) return; AV.h.state.spin = !AV.h.state.spin; AV.h.state.dirty = true; },
    'av-random': () => {
      const p = prof(); if (!AV.x) AV.x = ctx(p);
      const a = randomLook(p, AV.x); p.avatar = Object.assign(Rewards.avatarOf(p), a); touch(p); AV.pv = null; Store.save(); FX.play('combo'); refreshPanel(); check();
    },
    'av-clear': () => {
      const p = prof(), a = Rewards.avatarOf(p); for (const k of OPTIONAL) a[k] = ''; a.pat = 'none'; a.fin = 'auto'; a.col = { body: '', belly: '', accent: '' }; a.pose = 'idle'; touch(p); AV.pv = null; Store.save(); refreshPanel();
    },
    'av-home': (el) => { const p = prof(); Rewards.avatarOf(p).home = !!el.checked; touch(p); Store.save(); toast(el.checked ? 'Ton avatar apparaît sur l\'accueil 🏠' : 'La mascotte revient sur l\'accueil'); },
    'of-save': (el) => {
      const p = prof(), a = Rewards.avatarOf(p), i = +el.dataset.i;
      const o = P.outfitOf(ocfg(p)); a.outfits[i] = o; bump(p, 'outfits'); a.t = Date.now(); Store.save(); toast(`Tenue ${i + 1} enregistrée 👚`); FX.play('ok'); refreshPanel(); check();
    },
    'of-wear': (el) => {
      const p = prof(), a = Rewards.avatarOf(p), o = a.outfits[+el.dataset.i]; if (!o) return;
      Object.assign(a, clone(o)); p.avatar = Rewards.clampAvatar(p, AV.x, a); p.avatar.t = Date.now(); AV.pv = null; Store.save(); FX.play('combo'); refreshPanel();
    },
    'av-photo': () => {
      const p = prof(); if (!AV.h) return;
      AV.h.shot(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'mon-avatar-conjugo.png', { type: 'image/png' });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Mon avatar Conjugo' });
          else { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'mon-avatar-conjugo.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Photo enregistrée 📸'); }
        } catch (e) { /* partage annulé */ }
        bump(p, 'photos'); Store.save(); check();
      });
    },
    /* trophées */
    'tf-show': (el) => { TF.show = el.dataset.k; render(); },
    'tf-cat': (el) => { TF.cat = el.dataset.c; render(); },
    /* boutique */
    'shop-kind': (el) => { SH.kind = el.dataset.k; render(); },
    'shop-tap': (el) => {
      const p = prof(), x = ctx(p), id = el.dataset.id;
      if (id.startsWith('skin:')) {
        const lock = (Rewards.SKINS.find(([c]) => 'skin:' + c === id) || [])[1], c = id.slice(5), l = Rewards.parseLock(lock);
        if (Rewards.usable(p, x, lock, id)) { p.color = c; FX.play('tap'); }
        else if (l.t === 'coins') { if (p.coins < l.n) { toast(`Il te manque ${l.n - p.coins} 🪙`); return; } p.coins -= l.n; p.owned.push(id); p.color = c; FX.play('win'); }
        else { toast(Rewards.lockHelp(lock)); return; }
        Store.save(); render(); check(); return;
      }
      const [kind, val] = id.split(':');
      if (!val) { p.equipped[kind] = ''; FX.play('tap'); Store.save(); render(); return; }
      const it = Rewards.SHOP.find((i) => i.id === id); if (!it) return;
      if (Rewards.usable(p, x, it.lock, it.id)) { p.equipped[kind] = p.equipped[kind] === val ? '' : val; FX.play('tap'); }
      else if (typeof it.lock === 'number') {
        if (p.coins < it.price) { toast(`Il te manque ${it.price - p.coins} 🪙 — continue à jouer !`); return; }
        p.coins -= it.price; p.owned.push(it.id); p.equipped[kind] = val; FX.play('win');
      } else { toast(Rewards.lockHelp(it.lock)); return; }
      Store.save(); render(); check();
    },
    'news-close': () => closeModal(),
    'news-trophies': () => { closeModal(); go('trophies'); },
  };
  Object.assign(actions, avActions);

  /* =========================== ACCUEIL =========================== */
  function homeHero(p) {
    const x = ctx(p);
    return Rewards.avatarUnlocked(x) && Rewards.avatarOf(p).home;
  }
  function mountHome(p) {
    const el = $('#homeav'); if (!el) return;
    const x = ctx(p); AV.x = x;
    Avatar3D.mount(el, Rewards.clampAvatar(p, x, Rewards.avatarOf(p)), P, { size: 240, opts: { stage: Store.stageOf(x.level), color: p.color }, onBoop: () => FX.play('ok') });
  }

  /* =========================== MISE À JOUR =========================== */
  /** Après une mise à jour : attribue (sans rien enlever) les trophées déjà mérités, puis annonce les nouveautés une seule fois. */
  function afterUpdate() {
    const d = Store.data;
    if ((d.seenVer || 0) >= Rewards.REWARDS_VERSION) return;
    if (!d.profiles.length) { d.seenVer = Rewards.REWARDS_VERSION; Store.save(true); return; }
    const cur = prof(); let mine = null;
    for (const p of d.profiles) {
      p.stats = p.stats || {};
      p.stats.bestStreak = Math.max(p.stats.bestStreak || 0, (p.streak && p.streak.count) || 0);
      const aw = Rewards.award(p, ctx(p));
      p.coins += aw.coins;
      if (p === cur) mine = aw;
    }
    d.seenVer = Rewards.REWARDS_VERSION; Store.save(true);
    if (cur) renderTop(cur);
    if (!cur || A.view === 'game') return;
    const news = Rewards.NEWS.filter((n) => n.v > 0 && n.v <= Rewards.REWARDS_VERSION).slice(-1)[0];
    const gift = mine && mine.list.length ? `<p class="reward">🎉 Tu avais déjà mérité <b>${mine.list.length} nouveau${mine.list.length > 1 ? 'x' : ''} trophée${mine.list.length > 1 ? 's' : ''}</b> : ${mine.list.slice(0, 12).map((b) => b.emoji).join(' ')}${mine.list.length > 12 ? ' …' : ''}<br>+${mine.coins} 🪙 offerts !</p>` : '';
    modal(`<h2>✨ Nouveautés !</h2><h3>${esc(news.title)}</h3>${news.lines.map((l) => `<p>${esc(l)}</p>`).join('')}${gift}
      <div class="actions"><button class="big" data-act="news-close">Super !</button><button class="big primary" data-act="news-trophies">🏆 Voir mes trophées</button></div>`);
    if (mine && mine.list.length) { FX.play('win'); FX.confetti(120); }
  }

  /** Quelles nouveautés sont apparues grâce au niveau / aux trophées pendant la partie ? (objets, avatar…) */
  function unlockedBetween(before, after) {
    const out = [];
    const test = (it) => { const l = Rewards.parseLock(it.lock); return (l.t === 'lvl' && before.level < l.n && after.level >= l.n) || (l.t === 'badge' && !before.badges[l.id] && after.badges[l.id]); };
    for (const [k, arr] of Object.entries(P.ITEMS)) if (['form', 'hat', 'glasses', 'neck', 'back', 'hand', 'feet', 'aura', 'scene', 'pose', 'eyes', 'mouth', 'fin', 'pat'].includes(k)) arr.forEach((it) => { if (test(it)) out.push(it); });
    Rewards.SHOP.forEach((it) => { if (test(it)) out.push(it); });
    return out;
  }

  return { check, ctx, bump, afterUpdate, homeHero, mountHome, unlockedBetween, masteredCount, AV };
})();
