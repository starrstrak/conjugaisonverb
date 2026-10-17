const assert = require('assert');
global.localStorage = { getItem: () => JSON.stringify({ v: 1, settings: { dailyGoal: 30 }, profiles: [], current: '' }), setItem() {} };
const Store = require('../js/store.js');

// ancien enregistrement sans réglages d'exercices : valeurs par défaut = comportement d'origine
let e = Store.exOf();
assert.deepStrictEqual(e, Store.defaultEx());
assert(e.types.choice && e.types.type && e.types.pronoun && e.types.tense && e.recog === 14 && e.hints && e.retry && e.chronoSecs === 60 && e.hintMax === 3);
assert.strictEqual(Store.data.settings.dailyGoal, 30, 'les autres réglages sont conservés');

// valeurs partielles ou invalides : complétées / bornées
Store.data.settings.ex = { types: { type: false }, persons: { 0: false }, recog: 999, chronoSecs: 1, hintMax: 'x', modes: 'n\'importe quoi' };
e = Store.exOf();
assert.strictEqual(e.types.type, false); assert.strictEqual(e.types.choice, true); assert.strictEqual(e.persons[0], false); assert.strictEqual(e.persons[1], true);
assert.strictEqual(e.recog, 60); assert.strictEqual(e.chronoSecs, 20); assert.strictEqual(e.hintMax, 3); assert.strictEqual(e.modes.review, true);

// combinaisons impossibles refusées
const d = () => Store.defaultEx();
assert.strictEqual(Store.exProblem(d()), '');
let x = d(); x.types.choice = false; x.types.type = false; assert(Store.exProblem(x));
x = d(); Object.keys(x.persons).forEach((k) => { x.persons[k] = false; }); assert(Store.exProblem(x));
x = d(); Object.keys(x.families).forEach((k) => { x.families[k] = false; }); assert(Store.exProblem(x));
x = d(); ['review', 'adventure', 'chrono', 'practice'].forEach((k) => { x.modes[k] = false; }); assert(Store.exProblem(x));
x = d(); x.modes.errors = false; x.types.pronoun = false; x.types.tense = false; x.hints = false; assert.strictEqual(Store.exProblem(x), '', 'on peut tout désactiver sauf le nécessaire');

// synchronisé entre appareils (le plus récent gagne)
Store.data.settings.ex = d();
assert(Store.applySettings({ t: 99, s: { ex: Object.assign(d(), { chronoSecs: 120 }) } }));
assert.strictEqual(Store.exOf().chronoSecs, 120);
console.log('exercises OK');
