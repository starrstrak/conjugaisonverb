const assert = require('assert');
const Conj = require('../js/conjugate.js');
const Ex = require('../js/explain.js');
const verbs = require('../data/verbs.json');
const V = Object.fromEntries(verbs.map((v) => [v.inf, v]));
const d = (inf, tense, p, given) => Ex.diagnose({ verb: V[inf], forms: Conj.conjugate(V[inf]), tense, p, given });
const k = (...a) => d(...a).kind;
assert.strictEqual(k('manger','present',3,'mangons'), 'spelling');
assert.strictEqual(k('manger','present',3,'mangent'), 'person');
assert.strictEqual(k('manger','present',3,'mangerons'), 'tense');
assert.strictEqual(k('manger','present',1,'mange'), 'person');
assert.strictEqual(k('manger','present',1,'mangé'), 'ending');
assert.strictEqual(k('manger','present',1,'mangee'), 'ending');
assert.strictEqual(k('manger','present',3,'manger'), 'infinitive');
assert.strictEqual(k('aller','present',0,'va'), 'person');
assert.strictEqual(k('aller','present',0,'allé'), 'other');
assert.strictEqual(k('aller','passecompose',2,'a allé'), 'aux');
assert.strictEqual(k('manger','passecompose',0,'suis mangé'), 'aux');
assert.strictEqual(k('manger','passecompose',0,'ai mangés'), 'pp');
assert.strictEqual(k('aller','passecompose',3,'sommes allé'), 'agreement');
assert.strictEqual(k('aller','passecompose',0,'allé'), 'aux-missing');
assert.strictEqual(k('commencer','present',3,'commencons'), 'accent');
assert.strictEqual(k('prendre','present',0,'prenne'), 'tense');
assert.strictEqual(k('prendre','present',3,'prendons'), 'ending');
assert.strictEqual(k('finir','present',3,'finisons'), 'ending');
console.log(d('manger','present',3,'mangons'));
console.log(d('finir','futur',3,'finirions'));
console.log(d('faire','present',4,'faisez'));
console.log('explain OK');

// indices progressifs : pertinents et sans fuite de la réponse dès le 1er niveau
const hh = (inf, t, p) => Ex.hints(V[inf], Conj.conjugate(V[inf]), t, p);
const exact = (inf, t, p) => Conj.accepted(Conj.conjugate(V[inf])[t][p])[0].replace(/\(e\)|\(s\)/g, '');
for (const v of verbs) {
  const f = Conj.conjugate(v);
  for (const T of Conj.TENSES) {
    if (!f[T.id]) continue;
    for (const p of Conj.personsOf(T.id)) {
      const h = Ex.hints(v, f, T.id, p);
      assert(h.h1 && h.h2 && h.mask, `${v.inf} ${T.id} ${p}`);
      assert(!/undefined|NaN/.test(h.h1 + h.h2 + h.mask), `${v.inf} ${T.id} ${p}`);
      assert(h.mask.length === exact(v.inf, T.id, p).length, `mask ${v.inf} ${T.id} ${p}`);
      assert(h.mask !== exact(v.inf, T.id, p), `mask révèle tout ${v.inf} ${T.id} ${p}`);
      // la méthode (niveau 1) ne contient pas la réponse complète (sauf cas très courts)
      const ans = exact(v.inf, T.id, p);
      if (ans.length > 4 && T.id !== 'imperatif') assert(!h.h1.includes(`« ${ans} »`) && !h.h1.includes(` ${ans}.`), `h1 révèle ${v.inf} ${T.id} ${p}: ${h.h1}`);
    }
  }
}
assert(/infinitif/.test(hh('manger', 'futur', 3).h1));
assert(/irrégulier/.test(hh('aller', 'futur', 3).h1));
assert(/nous mangeons/.test(hh('manger', 'imparfait', 3).h1));
assert(/rebelle/.test(hh('aller', 'present', 0).h1) && /nous allons/.test(hh('aller', 'present', 0).h2));
assert(/auxiliaire « être »/.test(hh('aller', 'passecompose', 4).h1));
console.log('hints OK');
