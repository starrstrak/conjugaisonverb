/* Moteur de conjugaison : génère tous les temps à partir de règles + exceptions.
   Un verbe = { inf, type:'er'|'ir2'|'re'|'irr', aux:'avoir'|'etre', pp, ... } (voir README). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Conj = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PERSONS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
  const ALL = [0, 1, 2, 3, 4, 5];

  const TENSES = [
    {
      id: 'present', name: 'Présent', emoji: '☀️', color: '#ff9f1c', era: 'présent', core: true,
      markers: ["Aujourd'hui,", 'En ce moment,', 'Maintenant,'],
      tip: "Le présent dit ce qui se passe maintenant. Verbes en -er : -e, -es, -e, -ons, -ez, -ent. Verbes comme finir : -is, -is, -it, -issons, -issez, -issent.",
    },
    {
      id: 'futur', name: 'Futur simple', emoji: '🚀', color: '#2ec4b6', era: 'futur', core: true,
      markers: ['Demain,', 'Bientôt,', 'Dans une semaine,', 'Plus tard,'],
      tip: "Le futur dit ce qui va arriver. Astuce : garde l'infinitif en entier et ajoute -ai, -as, -a, -ons, -ez, -ont. Les verbes en -re perdent leur e : prendre → prendr-.",
    },
    {
      id: 'imparfait', name: 'Imparfait', emoji: '🕰️', color: '#9b5de5', era: 'passé', core: true,
      markers: ['Autrefois,', "Quand j'étais petit,", 'Chaque été,', 'Avant,'],
      tip: "L'imparfait raconte ce qui durait ou se répétait dans le passé. Astuce : prends « nous » au présent, enlève -ons, puis ajoute -ais, -ais, -ait, -ions, -iez, -aient.",
    },
    {
      id: 'passecompose', name: 'Passé composé', emoji: '⏪', color: '#f15bb5', era: 'passé', core: true,
      markers: ['Hier,', 'Ce matin,', 'Tout à l\'heure,', 'Hier soir,'],
      tip: "Le passé composé = auxiliaire (avoir ou être) au présent + participe passé. Exemple : j'ai mangé. Avec être, le participe passé s'accorde : elle est allée, ils sont allés.",
    },
    {
      id: 'imperatif', name: 'Impératif', emoji: '📣', color: '#ef476f', era: 'ordre', core: true, persons: [1, 3, 4],
      markers: ['Un ordre', 'Un conseil'],
      tip: "L'impératif sert à donner un ordre ou un conseil. Il n'a que 3 personnes (tu, nous, vous) et on n'écrit pas le pronom. Avec « tu », les verbes en -er n'ont pas de -s : mange !",
    },
    {
      id: 'conditionnel', name: 'Conditionnel', emoji: '🎈', color: '#4cc9f0', era: 'futur', core: false,
      markers: ['À ta place,', "Si c'était possible,", 'Avec un peu de chance,'],
      tip: "Le conditionnel dit ce qui arriverait si... Astuce : la base du futur (mangerai → manger-) + les terminaisons de l'imparfait : -ais, -ais, -ait, -ions, -iez, -aient.",
    },
    {
      id: 'plusqueparfait', name: 'Plus-que-parfait', emoji: '⏮️', color: '#b5179e', era: 'passé', core: false,
      markers: ['La veille,', 'Avant le départ,'],
      tip: "Le plus-que-parfait = auxiliaire à l'imparfait + participe passé. Il parle d'une action finie avant une autre action passée. Exemple : j'avais mangé.",
    },
    {
      id: 'subjonctif', name: 'Subjonctif présent', emoji: '🎭', color: '#06d6a0', era: 'souhait', core: false,
      markers: ['Il faut que'],
      tip: "Le subjonctif s'emploie surtout après « il faut que ». Terminaisons : -e, -es, -e, -ions, -iez, -ent. Astuce : prends « ils » au présent, enlève -ent, ajoute les terminaisons.",
    },
    {
      id: 'passesimple', name: 'Passé simple', emoji: '📜', color: '#8d6e63', era: 'passé', core: false,
      markers: ['Il était une fois,', 'Soudain,'],
      tip: "Le passé simple se lit surtout dans les contes et les romans. Verbes en -er : -ai, -as, -a, -âmes, -âtes, -èrent. Beaucoup d'autres : -is, -is, -it, -îmes, -îtes, -irent (ou -us, -us, -ut...).",
    },
    {
      id: 'futuranterieur', name: 'Futur antérieur', emoji: '🏁', color: '#118ab2', era: 'futur', core: false,
      markers: ['Demain, dès que', 'Plus tard, quand'],
      tip: "Le futur antérieur = auxiliaire au futur + participe passé. Une action sera finie avant une autre dans le futur. Exemple : quand j'aurai mangé, je jouerai.",
    },
  ];
  const TENSE_BY_ID = Object.fromEntries(TENSES.map((t) => [t.id, t]));
  const COMPOUND = { passecompose: 'present', plusqueparfait: 'imparfait', futuranterieur: 'futur' };

  const AUX = {
    avoir: {
      present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
      imparfait: ['avais', 'avais', 'avait', 'avions', 'aviez', 'avaient'],
      futur: ['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront'],
    },
    etre: {
      present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
      imparfait: ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'],
      futur: ['serai', 'seras', 'sera', 'serons', 'serez', 'seront'],
    },
  };

  const END = {
    imparfait: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
    futur: ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
    subj: ['e', 'es', 'e', 'ions', 'iez', 'ent'],
    ps: {
      a: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
      i: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
      u: ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'],
    },
  };

  const cell = (stem, end) => ({ t: stem + end, e: end });
  const plain = (t) => ({ t, e: '' });

  function stemOf(v) {
    const i = v.inf;
    return /(er|ir|re)$/.test(i) ? i.slice(0, -2) : i;
  }
  function patternOf(v) {
    if (v.type !== 'irr') return v.type;
    const i = v.inf;
    return i.endsWith('er') ? 'er' : i.endsWith('ir') ? 'ir2' : 're';
  }
  // g -> ge et c -> ç devant a / o (mangeons, commençons)
  function spell(v, stem, ending) {
    if (v.type !== 'er' || !/^[aâoô]/.test(ending)) return stem;
    if (/g$/.test(stem)) return stem + 'e';
    if (/c$/.test(stem)) return stem.slice(0, -1) + 'ç';
    return stem;
  }

  function present(v) {
    if (Array.isArray(v.pres) && v.pres.length === 6) return v.pres.map(plain);
    const s = stemOf(v);
    switch (patternOf(v)) {
      case 'er':
        return [cell(s, 'e'), cell(s, 'es'), cell(s, 'e'), cell(spell(v, s, 'ons'), 'ons'), cell(s, 'ez'), cell(s, 'ent')];
      case 'ir2':
        if (v.type === 'irr') return [cell(s, 's'), cell(s, 's'), cell(s, 't'), cell(s, 'ons'), cell(s, 'ez'), cell(s, 'ent')]; // modèle « partir »
        return [cell(s, 'is'), cell(s, 'is'), cell(s, 'it'), cell(s, 'issons'), cell(s, 'issez'), cell(s, 'issent')];
      default:
        return [cell(s, 's'), cell(s, 's'), cell(s, ''), cell(s, 'ons'), cell(s, 'ez'), cell(s, 'ent')];
    }
  }
  function nousStem(v, pres) {
    if (v.impStem) return v.impStem;
    if (v.type === 'er') return stemOf(v);
    const n = pres[3].t;
    return n.endsWith('ons') ? n.slice(0, -3) : stemOf(v);
  }
  function futStem(v) {
    if (v.fut) return v.fut;
    return v.inf.endsWith('e') ? v.inf.slice(0, -1) : v.inf;
  }
  function withEnds(v, stem, ends) {
    return ends.map((e) => cell(spell(v, stem, e), e));
  }
  function pastSimple(v) {
    if (Array.isArray(v.psForms) && v.psForms.length === 6) return v.psForms.map(plain);
    let stem, kind;
    if (Array.isArray(v.ps)) [stem, kind] = v.ps;
    else {
      const p = patternOf(v);
      stem = stemOf(v);
      kind = p === 'er' ? 'a' : 'i';
    }
    return withEnds(v, stem, END.ps[kind] || END.ps.i);
  }
  function imperative(v, pres) {
    if (v.noImp) return null;
    let [tu, nous, vous] = Array.isArray(v.imp) && v.imp.length === 3 ? v.imp : [pres[1].t, pres[3].t, pres[4].t];
    if (!(Array.isArray(v.imp) && v.imp.length === 3) && /s$/.test(tu) && (/er$/.test(v.inf) || /(vrir|frir)$/.test(v.inf))) {
      tu = tu.slice(0, -1);
    }
    const out = [null, null, null, null, null, null];
    out[1] = plain(tu);
    out[3] = plain(nous);
    out[4] = plain(vous);
    return out;
  }
  function compound(v, auxTense) {
    if (!v.pp) return null;
    const aux = AUX[v.aux === 'etre' ? 'etre' : 'avoir'][auxTense];
    const pp = v.pp;
    return aux.map((a, i) => {
      if (v.aux !== 'etre') return plain(a + ' ' + pp);
      const plural = i >= 3;
      const sfx = i === 4 ? ['', 'e', 's', 'es'] : plural ? ['s', 'es'] : ['', 'e'];
      const shown = i === 4 ? '(e)(s)' : plural ? '(e)s' : '(e)';
      return { t: `${a} ${pp}${shown}`, e: '', alt: sfx.map((x) => `${a} ${pp}${x}`) };
    });
  }

  /** Conjugue un verbe à tous les temps. Résultat : { tenseId: [6 cases | null] | null } */
  function conjugate(v) {
    const out = {};
    const pres = present(v);
    out.present = pres;
    const ns = nousStem(v, pres);
    out.imparfait = withEnds(v, ns, END.imparfait);
    const fs = futStem(v);
    out.futur = END.futur.map((e) => cell(fs, e));
    out.conditionnel = END.imparfait.map((e) => cell(fs, e));
    const sStem = Array.isArray(v.subj) ? v.subj[0] : pres[5].t.endsWith('ent') ? pres[5].t.slice(0, -3) : stemOf(v);
    const nStem = Array.isArray(v.subj) ? v.subj[1] : ns;
    out.subjonctif = END.subj.map((e, i) => cell(i === 3 || i === 4 ? nStem : sStem, e));
    out.passesimple = pastSimple(v);
    out.imperatif = imperative(v, pres);
    for (const [t, aux] of Object.entries(COMPOUND)) out[t] = compound(v, aux);
    // corrections manuelles : forms = { tense: [6 textes ou ''] }
    if (v.forms) {
      for (const [t, arr] of Object.entries(v.forms)) {
        if (!Array.isArray(arr) || !TENSE_BY_ID[t]) continue;
        if (!out[t]) out[t] = [null, null, null, null, null, null];
        arr.forEach((txt, i) => {
          if (typeof txt === 'string' && txt.trim() && i < 6) out[t][i] = plain(txt.trim());
        });
      }
    }
    return out;
  }

  /* ---------- Outils d'affichage & de vérification ---------- */
  const vowelStart = (s) => /^[aeiouyàâäéèêëîïôöûùüœh]/i.test(s || '');
  function pronoun(p, text) {
    if (p === 0) return vowelStart(text) ? "j'" : 'je';
    return PERSONS[p];
  }
  const personsOf = (tenseId) => (TENSE_BY_ID[tenseId] && TENSE_BY_ID[tenseId].persons) || ALL;

  const deacc = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  function clean(s) {
    s = String(s || '').toLowerCase().replace(/[’`´]/g, "'").replace(/\(e\)|\(s\)/g, '').replace(/[.!?,;]+$/g, '').replace(/\s+/g, ' ').trim();
    return s.replace(/^(que |qu')?\s*(j'|je |tu |il\/elle |ils\/elles |il |elle |on |nous |vous |ils |elles )\s*/, '').trim();
  }
  const accepted = (c) => (c.alt && c.alt.length ? c.alt : [c.t]);
  function check(c, given) {
    const g = clean(given);
    if (!g) return 'ko';
    const acc = accepted(c).map(clean);
    if (acc.includes(g)) return 'ok';
    if (acc.map(deacc).includes(deacc(g))) return 'accent';
    return 'ko';
  }

  /** Tous les verbes à usage par l'appli : base + ajouts, sans les masqués */
  function validVerb(v) {
    return v && typeof v.inf === 'string' && /^[a-zàâäéèêëîïôöûùüçœæ' -]{2,40}$/i.test(v.inf) && ['er', 'ir2', 're', 'irr'].includes(v.type);
  }

  return { PERSONS, ALL, TENSES, TENSE_BY_ID, COMPOUND, AUX, END, conjugate, pronoun, vowelStart, personsOf, check, clean, deacc, accepted, stemOf, patternOf, validVerb };
});
