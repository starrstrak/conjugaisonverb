const assert = require('assert');
global.localStorage = { getItem: () => null, setItem() {} };
const Store = require('../js/store.js');
Store.setBase(require('../data/verbs.json'));

// profils : meilleure progression, cartes les plus récentes, historiques réunis
const a = Store.newProfile('Léo'); const b = JSON.parse(JSON.stringify(a));
a.xp = 100; b.xp = 80; a.t = 5; b.t = 9; b.coins = 3; a.coins = 50;
a.cards['x|present|0'] = { b: 1, d: '2026-01-02', c: 2, w: 0, u: 10 };
b.cards['x|present|0'] = { b: 3, d: '2026-01-09', c: 1, w: 2, u: 20 };
a.history = [{ at: 1 }, { at: 2 }]; b.history = [{ at: 2 }, { at: 3 }];
a.stars['present|er'] = 3; b.stars['present|er'] = 1; b.stars['futur|er'] = 2;
a.badges.first = 50; b.badges.first = 40; b.badges.q100 = 70;
const m = Store.mergeProfile(a, b);
assert.strictEqual(m.xp, 100);
assert.strictEqual(m.coins, 3, 'pièces : version la plus récente');
assert.deepStrictEqual(m.cards['x|present|0'], { b: 3, d: '2026-01-09', c: 2, w: 2, u: 20 });
assert.deepStrictEqual(m.history.map((h) => h.at), [1, 2, 3]);
assert.deepStrictEqual(m.stars, { 'present|er': 3, 'futur|er': 2 });
assert.strictEqual(m.badges.first, 40);
assert(m.badges.q100);
assert.strictEqual(Store.stable(Store.mergeProfile(a, b)), Store.stable(Store.mergeProfile(b, a)), 'fusion commutative');
assert.strictEqual(Store.stable(Store.mergeProfile(m, a)), Store.stable(m), 'fusion idempotente');

// verbes : le plus récent gagne, suppressions propagées
const t0 = Date.now();
Store.saveVerb({ inf: 'rêver', type: 'er', pp: 'rêvé' });
let changed = Store.mergeVerbsState({ verbs: [{ inf: 'planter', type: 'er', pp: 'planté', updated: t0 }], tomb: {}, hid: {} });
assert(changed && Store.data.customVerbs.some((v) => v.inf === 'planter'));
changed = Store.mergeVerbsState({ verbs: [], tomb: { rêver: Date.now() + 1000 }, hid: {} });
assert(!Store.data.customVerbs.some((v) => v.inf === 'rêver'), 'suppression distante');
Store.removeVerb('chanter'); // verbe de base masqué
assert(!Store.allVerbs().some((v) => v.inf === 'chanter'));
Store.mergeVerbsState({ verbs: [], tomb: {}, hid: { chanter: { h: 0, t: Date.now() + 5000 } } });
assert(Store.allVerbs().some((v) => v.inf === 'chanter'), 'rétabli à distance');
assert(!Store.mergeVerbsState(Store.verbsState()), 'fusion avec soi-même : rien ne change');

// réglages : le plus récent gagne, pas les réglages propres à l'appareil
Store.data.settings.sound = true;
assert(Store.applySettings({ t: 99, s: { dailyGoal: 50, sound: false, inputMode: 'type' } }));
assert.strictEqual(Store.data.settings.dailyGoal, 50);
assert.strictEqual(Store.data.settings.sound, true, 'le son reste local');
assert(!Store.applySettings({ t: 10, s: { dailyGoal: 10 } }), 'plus ancien : ignoré');
console.log('sync OK');
