const assert = require('assert');
const Conj = require('../js/conjugate.js');
const verbs = require('../data/verbs.json');
const V = Object.fromEntries(verbs.map((v) => [v.inf, v]));
const row = (inf, t) => { const f = Conj.conjugate(V[inf])[t]; return f ? f.map((c) => (c ? c.t : null)) : null; };
const eq = (inf, t, exp) => assert.deepStrictEqual(row(inf, t), exp, `${inf} ${t}`);

eq('manger','present',['mange','manges','mange','mangeons','mangez','mangent']);
eq('manger','imparfait',['mangeais','mangeais','mangeait','mangions','mangiez','mangeaient']);
eq('manger','passesimple',['mangeai','mangeas','mangea','mangeâmes','mangeâtes','mangèrent']);
eq('commencer','present',['commence','commences','commence','commençons','commencez','commencent']);
eq('commencer','imparfait',['commençais','commençais','commençait','commencions','commenciez','commençaient']);
eq('finir','present',['finis','finis','finit','finissons','finissez','finissent']);
eq('finir','imparfait',['finissais','finissais','finissait','finissions','finissiez','finissaient']);
eq('finir','subjonctif',['finisse','finisses','finisse','finissions','finissiez','finissent']);
eq('rendre','present',['rends','rends','rend','rendons','rendez','rendent']);
eq('rendre','futur',['rendrai','rendras','rendra','rendrons','rendrez','rendront']);
eq('être','present',['suis','es','est','sommes','êtes','sont']);
eq('être','imparfait',['étais','étais','était','étions','étiez','étaient']);
eq('être','futur',['serai','seras','sera','serons','serez','seront']);
eq('être','subjonctif',['sois','sois','soit','soyons','soyez','soient']);
eq('être','passesimple',['fus','fus','fut','fûmes','fûtes','furent']);
eq('être','imperatif',[null,'sois',null,'soyons','soyez',null]);
eq('avoir','passesimple',['eus','eus','eut','eûmes','eûtes','eurent']);
eq('avoir','imparfait',['avais','avais','avait','avions','aviez','avaient']);
eq('avoir','subjonctif',['aie','aies','ait','ayons','ayez','aient']);
eq('aller','futur',['irai','iras','ira','irons','irez','iront']);
eq('aller','imparfait',['allais','allais','allait','allions','alliez','allaient']);
eq('aller','subjonctif',['aille','ailles','aille','allions','alliez','aillent']);
eq('aller','imperatif',[null,'va',null,'allons','allez',null]);
eq('aller','passesimple',['allai','allas','alla','allâmes','allâtes','allèrent']);
eq('aller','passecompose',['suis allé(e)','es allé(e)','est allé(e)','sommes allé(e)s','êtes allé(e)(s)','sont allé(e)s']);
eq('faire','imparfait',['faisais','faisais','faisait','faisions','faisiez','faisaient']);
eq('faire','subjonctif',['fasse','fasses','fasse','fassions','fassiez','fassent']);
eq('faire','conditionnel',['ferais','ferais','ferait','ferions','feriez','feraient']);
eq('prendre','subjonctif',['prenne','prennes','prenne','prenions','preniez','prennent']);
eq('prendre','passesimple',['pris','pris','prit','prîmes','prîtes','prirent']);
eq('venir','futur',['viendrai','viendras','viendra','viendrons','viendrez','viendront']);
eq('venir','subjonctif',['vienne','viennes','vienne','venions','veniez','viennent']);
eq('voir','subjonctif',['voie','voies','voie','voyions','voyiez','voient']);
eq('voir','futur',['verrai','verras','verra','verrons','verrez','verront']);
eq('boire','subjonctif',['boive','boives','boive','buvions','buviez','boivent']);
eq('boire','imparfait',['buvais','buvais','buvait','buvions','buviez','buvaient']);
eq('pouvoir','subjonctif',['puisse','puisses','puisse','puissions','puissiez','puissent']);
eq('pouvoir','futur',['pourrai','pourras','pourra','pourrons','pourrez','pourront']);
eq('vouloir','subjonctif',['veuille','veuilles','veuille','voulions','vouliez','veuillent']);
eq('savoir','subjonctif',['sache','saches','sache','sachions','sachiez','sachent']);
eq('devoir','subjonctif',['doive','doives','doive','devions','deviez','doivent']);
eq('appeler','subjonctif',['appelle','appelles','appelle','appelions','appeliez','appellent']);
eq('appeler','futur',['appellerai','appelleras','appellera','appellerons','appellerez','appelleront']);
eq('envoyer','conditionnel',['enverrais','enverrais','enverrait','enverrions','enverriez','enverraient']);
eq('ouvrir','imperatif',[null,'ouvre',null,'ouvrons','ouvrez',null]);
eq('chanter','imperatif',[null,'chante',null,'chantons','chantez',null]);
eq('chanter','plusqueparfait',['avais chanté','avais chanté','avait chanté','avions chanté','aviez chanté','avaient chanté']);
eq('chanter','futuranterieur',['aurai chanté','auras chanté','aura chanté','aurons chanté','aurez chanté','auront chanté']);
eq('venir','passesimple',['vins','vins','vint','vînmes','vîntes','vinrent']);
eq('savoir','imperatif',[null,'sache',null,'sachons','sachez',null]);
eq('pouvoir','imperatif',null);
eq('écrire','imparfait',['écrivais','écrivais','écrivait','écrivions','écriviez','écrivaient']);
eq('lire','passesimple',['lus','lus','lut','lûmes','lûtes','lurent']);
eq('croire','subjonctif',['croie','croies','croie','croyions','croyiez','croient']);
eq('courir','futur',['courrai','courras','courra','courrons','courrez','courront']);
eq('vivre','passesimple',['vécus','vécus','vécut','vécûmes','vécûtes','vécurent']);
eq('dire','present',['dis','dis','dit','disons','dites','disent']);
eq('partir','imparfait',['partais','partais','partait','partions','partiez','partaient']);

// vérification des réponses
const c = Conj.conjugate(V['manger']).present[3];
assert.strictEqual(Conj.check(c, 'nous mangeons'), 'ok');
assert.strictEqual(Conj.check(c, 'Mangeons'), 'ok');
assert.strictEqual(Conj.check(c, 'mangons'), 'ko');
const a = Conj.conjugate(V['aller']).passecompose[4];
assert.strictEqual(Conj.check(a, 'êtes allés'), 'ok');
assert.strictEqual(Conj.check(a, 'etes alle'), 'accent');
assert.strictEqual(Conj.check(Conj.conjugate(V['être']).present[0], "je suis"), 'ok');
assert.strictEqual(Conj.pronoun(0, 'ai'), "j'");
assert.strictEqual(Conj.pronoun(0, 'mange'), 'je');
// tous les verbes se conjuguent sans trou
for (const v of verbs) {
  assert(Conj.validVerb(v), v.inf);
  const f = Conj.conjugate(v);
  for (const t of Conj.TENSES) {
    if (!f[t.id]) { assert(v.noImp && t.id === 'imperatif', `${v.inf} ${t.id}`); continue; }
    for (const p of Conj.personsOf(t.id)) assert(f[t.id][p] && f[t.id][p].t && !/undefined|NaN/.test(f[t.id][p].t), `${v.inf} ${t.id} ${p}`);
  }
}
console.log('OK', verbs.length, 'verbes');
