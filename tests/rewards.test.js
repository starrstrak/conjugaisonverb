const assert = require('assert');

// ---- mise à jour : un ancien enregistrement (avant les nouvelles récompenses) est relu sans rien perdre ----
const old = { v: 1, settings: {}, profiles: [{ id: 'p1', name: 'Léo', color: '#6ec6ff', xp: 800, coins: 55, streak: { count: 9, last: '2026-10-17' }, daily: { date: '', count: 0, chest: false },
  cards: { 'manger|present|0': { b: 3, d: '2026-10-17', c: 40, w: 1, u: 1 } }, stars: { 'present|er': 3 }, badges: { first: 111, combo5: 222, q100: 333 },
  owned: ['skin:#7bd88f', 'hat:🎩', 'theme:space'], equipped: { hat: '🎩', glasses: '', theme: 'space' },
  stats: { sessions: 12, correct: 340, wrong: 30, bestCombo: 12, perfect: 2, chronoBest: 8, fixed: 4 }, errKinds: {}, errLog: [], created: 1 }], current: 'p1', customVerbs: [], hiddenBase: [], author: '', verbMeta: { tomb: {}, hid: {} }, settingsT: 0, delP: {}, sync: null };
global.localStorage = { getItem: () => JSON.stringify(old), setItem() {} };
const Store = require('../js/store.js');
Store.setBase(require('../data/verbs.json'));
const Parts = require('../js/avatar-parts.js');
require('../js/avatar-items.js');
const Avatar3D = require('../js/avatar3d.js');
const Rewards = require('../js/rewards.js');

const p = Store.profile();
assert.deepStrictEqual(p.badges, { first: 111, combo5: 222, q100: 333 }, 'trophées conservés (avec leur date)');
assert.deepStrictEqual(p.owned, ['skin:#7bd88f', 'hat:🎩', 'theme:space'], 'objets conservés');
assert.strictEqual(p.coins, 55); assert.strictEqual(p.xp, 800);
assert.deepStrictEqual(p.equipped, { hat: '🎩', glasses: '', theme: 'space', neck: '', pet: '' }, 'objet porté conservé, nouvelles catégories ajoutées');
assert.strictEqual(Store.data.seenVer, 0, 'les « Nouveautés » seront montrées une fois');

// ---- trophées : identifiants uniques, anciens trophées toujours là ----
const ids = Rewards.BADGES.map((b) => b.id);
assert.strictEqual(new Set(ids).size, ids.length, 'identifiants de trophées uniques');
assert(ids.length >= 190, 'plus de 150 trophées : ' + ids.length);
const OLD = { first: 'Premier pas', combo5: 'En feu', combo10: 'Inarrêtable', perfect: 'Sans faute', perfect5: 'Perfectionniste', q100: 'Centurion', q500: 'Grand maître', streak3: 'Petite flamme', streak7: 'Semaine de feu',
  streak30: 'Légende', fixer: 'Chasseur d\'erreurs', explorer: 'Explorateur', verbs20: 'Collectionneur', chrono: 'Éclair', master: 'Maître d\'un temps', stars10: 'Chasseur d\'étoiles', lvl5: 'Dragonneau' };
for (const [id, name] of Object.entries(OLD)) assert(Rewards.BADGE_BY_ID[id] && Rewards.BADGE_BY_ID[id].name === name, 'ancien trophée conservé : ' + id);
for (const b of Rewards.BADGES) { assert(b.goal > 0 && b.tier >= 1 && b.tier <= 4 && b.name && b.emoji && typeof b.val === 'function', 'trophée valide : ' + b.id); assert(Rewards.CATS.some((c) => c.id === b.cat), 'catégorie connue : ' + b.id); }

// ---- attribution : rattrapage, idempotence, trophées « collection » ----
const deps = { levelOf: Store.levelOf, typeOf: (inf) => (inf === 'être' || inf === 'avoir' ? 'aux' : ((Store.allVerbs().find((v) => v.inf === inf) || {}).type || null)), starsTotal: (q) => Object.values(q.stars).reduce((a, b) => a + b, 0), masteredCount: () => 0 };
const x = Rewards.context(p, deps);
assert.strictEqual(x.level, 5);
const aw = Rewards.award(p, x);
assert(aw.list.length > 5 && aw.coins > 0, 'des trophées déjà mérités sont attribués');
assert(aw.list.every((b) => !['first', 'combo5', 'q100'].includes(b.id)), 'on ne réattribue pas un trophée déjà gagné');
assert(p.badges.q250 && p.badges.combo10 && p.badges.lvl5 && p.badges.streak7, 'rattrapage selon les statistiques');
assert(!p.badges.q500 && !p.badges.streak30, 'pas de trophée immérité');
const again = Rewards.award(p, Rewards.context(p, deps));
assert.strictEqual(again.list.length, 0, 'attribution idempotente');
assert.strictEqual(p.badges.first, 111, 'la date d\'un ancien trophée ne change pas');

// ---- règles de déblocage ----
assert.strictEqual(Rewards.parseLock(0).t, 'free'); assert.strictEqual(Rewards.parseLock(40).n, 40); assert.strictEqual(Rewards.parseLock('l12').n, 12); assert.strictEqual(Rewards.parseLock('b:streak7').id, 'streak7');
assert(Rewards.usable(p, { level: 1 }, 0, 'x'));
assert(!Rewards.usable(p, { level: 1 }, 40, 'x') && Rewards.usable(Object.assign({}, p, { owned: ['x'] }), { level: 1 }, 40, 'x'), 'acheté = utilisable');
assert(Rewards.usable(p, { level: 12 }, 'l12', 'x') && !Rewards.usable(p, { level: 11 }, 'l12', 'x'));
assert(Rewards.usable(p, { level: 1 }, 'b:first', 'x') && !Rewards.usable(p, { level: 1 }, 'b:q500', 'x'));

// ---- catalogue : tout est cohérent ----
const bad = [];
for (const [slot, arr] of Object.entries(Parts.ITEMS)) {
  const seen = new Set();
  for (const it of arr) {
    if (seen.has(it.id)) bad.push('doublon ' + slot + ':' + it.id); seen.add(it.id);
    const l = Rewards.parseLock(it.lock);
    if (l.t === 'badge' && !Rewards.BADGE_BY_ID[l.id]) bad.push('trophée inconnu ' + slot + ':' + it.id);
    if (!it.name) bad.push('nom manquant ' + slot + ':' + it.id);
  }
}
for (const it of Rewards.SHOP) { const l = Rewards.parseLock(it.lock); if (l.t === 'badge' && !Rewards.BADGE_BY_ID[l.id]) bad.push('boutique : trophée inconnu ' + it.id); }
assert.deepStrictEqual(bad, [], bad.join('\n'));
for (const old of ['hat:🎩', 'hat:🧢', 'hat:👑', 'hat:🎓', 'hat:🎀', 'hat:🤠', 'hat:🌸', 'glasses:🕶️', 'glasses:👓', 'glasses:🥽', 'theme:space', 'theme:ocean', 'theme:forest', 'theme:candy']) assert(Rewards.SHOP.some((i) => i.id === old), 'objet de boutique conservé : ' + old);
assert([['hat:🎩', 30], ['hat:👑', 80], ['theme:space', 60]].every(([id, pr]) => Rewards.SHOP.find((i) => i.id === id).price === pr), 'prix inchangés');
assert(Rewards.SHOP.length >= 80, 'boutique agrandie : ' + Rewards.SHOP.length);

// ---- avatar : tout se gagne (niveau ou trophée) ; seuls les objets de départ sont libres ----
const STARTER = { form: ['egg'], eyes: ['round', 'dots', 'happy', 'sleepy'], mouth: ['smile', 'open', 'flat', 'o'], pat: ['none'], fin: ['auto', 'matte'], pose: ['idle', 'wave', 'cheer', 'think', 'sleep'], scene: ['sky'] };
const FREE_COLORS = ['#7bd88f', '#6ec6ff', '#ff9ecf', '#ffb35c', '#b79cff', '#ff7676', '#ffd93d', '#ffffff', '#4a4e69', '#2ec4b6', '#a0522d', '#f4a261'];
const badLocks = [];
for (const [slot, arr] of Object.entries(Parts.ITEMS)) for (const it of arr) {
  const t = Rewards.parseLock(it.lock).t;
  const free = t === 'free';
  if (slot === 'eyeColor') continue;
  const allowed = slot === 'color' ? FREE_COLORS.includes(it.id) : (STARTER[slot] || []).includes(it.id);
  if (free !== allowed) badLocks.push(slot + ':' + it.id + ' (' + t + ')');
  if (t === 'coins') badLocks.push('achat en pièces interdit : ' + slot + ':' + it.id);
}
assert.deepStrictEqual(badLocks, [], badLocks.join('\n'));
assert(Parts.FORMS.length >= 39, 'avatars : ' + Parts.FORMS.length);
// ce qu'un joueur avait déjà acheté reste utilisable
assert(Rewards.usable({ owned: ['av:hat:crown'], badges: {} }, { level: 1 }, Parts.find('hat', 'crown').lock, 'av:hat:crown'));

// ---- avatar : configuration toujours valide, même corrompue ----
const junk = Parts.sanitize({ form: 'nimportequoi', hat: 'inconnu', eyes: 42, col: null, outfits: 'x', scene: 'xx' });
assert.strictEqual(junk.form, 'auto'); assert.strictEqual(junk.hat, ''); assert.strictEqual(junk.eyes, 'round'); assert.strictEqual(junk.scene, 'sky'); assert.strictEqual(junk.outfits.length, 3);
const clamped = Rewards.clampAvatar(p, { level: 1 }, { form: 'cosmic', hat: 'crown', scene: 'podium', col: { body: 'rainbow' } });
assert.strictEqual(clamped.form, 'auto'); assert.strictEqual(clamped.hat, ''); assert.strictEqual(clamped.scene, 'sky'); assert.strictEqual(clamped.col.body, '', 'rien de non débloqué ne passe');
assert.strictEqual(Rewards.clampAvatar(p, { level: 40 }, { form: 'cosmic' }).form, 'cosmic');
const pa = { avatar: null }; assert.strictEqual(Rewards.avatarOf(pa), Rewards.avatarOf(pa), 'avatarOf renvoie le même objet (modifiable en place)'); assert.strictEqual(pa.avatar.outfits.length, 3);
assert(Parts.FORMS.length >= 25 && Rewards.formsUnlocked(p, { level: 1 }) >= 1);

// ---- moteur 3D : chaque pièce se construit et se dessine sans erreur ----
const g2 = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}), set: () => true });
let count = 0;
function tryCfg(cfg, pose) {
  const sc = Avatar3D.build(cfg, Parts, { stage: 2, color: '#7bd88f', quality: 0.7 });
  assert(sc.prims.length > 10 && sc.prims.every((q) => q.polys.length > 0 && q.vs.every(Number.isFinite)), 'géométrie valide');
  Avatar3D.render(g2, sc, { w: 200, h: 200, yaw: 0.4, pitch: 0.1, zoom: 1, t: 1.3, pose: pose || 'idle' });
  count++;
}
for (const it of Parts.ITEMS.form) tryCfg({ form: it.id });
for (const slot of ['hat', 'glasses', 'neck', 'back', 'hand', 'feet', 'aura', 'scene', 'eyes', 'mouth', 'pat', 'fin']) for (const it of Parts.ITEMS[slot]) tryCfg({ [slot]: it.id, form: 'dragon' });
for (const it of Parts.ITEMS.pose) tryCfg({ pose: it.id }, it.id);
for (const c of Parts.ITEMS.color) tryCfg({ col: { body: c.id, belly: c.id, accent: c.id } });
tryCfg({ form: 'rainbow', fin: 'glass', hat: 'wizard', glasses: 'sun', neck: 'scarf', back: 'cape', hand: 'wand', feet: 'boots', aura: 'stars', scene: 'night', pat: 'stars' });
assert(count > 200, 'pièces testées : ' + count);

// ---- synchro : l'avatar le plus récent gagne, une ancienne version sans avatar ne l'efface pas ----
const a = Store.newProfile('Léo'), b = JSON.parse(JSON.stringify(a));
a.avatar = { form: 'fire', t: 100 }; a.t = 5; b.t = 50; delete b.avatar;
a.equipped.hat = '🎩'; b.equipped = { hat: '👑', glasses: '', theme: '' };
const m = Store.mergeProfile(a, b);
assert.strictEqual(m.avatar.form, 'fire', 'avatar conservé même si l\'autre appareil n\'en connaît pas');
assert.strictEqual(m.equipped.hat, '👑'); assert.strictEqual(m.equipped.neck, '', 'catégories complétées');
assert.strictEqual(Store.stable(Store.mergeProfile(a, b)), Store.stable(Store.mergeProfile(b, a)), 'fusion commutative');
console.log(`rewards OK (${ids.length} trophées, ${Rewards.SHOP.length} objets de boutique, ${Object.values(Parts.ITEMS).reduce((n, l) => n + l.length, 0)} pièces d'avatar)`);
