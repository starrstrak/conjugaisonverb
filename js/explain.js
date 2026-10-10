/* Diagnostic d'erreur : compare la réponse de l'enfant à la bonne réponse
   et produit une explication simple (tutoiement, phrases courtes). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./conjugate.js'));
  else root.Explain = factory(root.Conj);
})(typeof self !== 'undefined' ? self : this, function (Conj) {
  'use strict';
  const { PERSONS, TENSES, TENSE_BY_ID, COMPOUND, clean, deacc, accepted, personsOf } = Conj;

  const SUBJ = ['« je »', '« tu »', '« il / elle »', '« nous »', '« vous »', '« ils / elles »'];
  const PL = (p) => p >= 3;
  const first = (c) => accepted(c)[0];
  const quote = (s) => `« ${s} »`;
  // « du présent », « de l'imparfait », « au futur », « à l'impératif »…
  const vow = (t) => /^[aeiouyéèh]/i.test(t.name);
  const lc = (t) => t.name.toLowerCase();
  const du = (t) => (vow(t) ? "de l'" : 'du ') + lc(t);
  const au = (t) => (vow(t) ? "à l'" : 'au ') + lc(t);
  const le = (t) => (vow(t) ? "l'" : 'le ') + lc(t);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const dash = (e) => (e ? `-${e}` : 'rien (pas de terminaison)');

  function prefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  /** Terminaisons du temps pour le verbe, affichables en puces : [{p, e}] ou null */
  function endingTable(forms, tenseId) {
    const arr = forms[tenseId];
    if (!arr || COMPOUND[tenseId]) return null;
    const ps = personsOf(tenseId);
    if (!ps.every((p) => arr[p] && typeof arr[p].e === 'string' && (arr[p].e || tenseId === 'present'))) return null;
    return ps.map((p) => ({ p, e: arr[p].e }));
  }

  /**
   * ctx : { verb, forms (Conj.conjugate), tense, p, given }
   * retour : { kind, title, lines[], tip }
   */
  function diagnose(ctx) {
    const { verb, forms, tense, p, given } = ctx;
    const cellE = forms[tense][p];
    const expected = first(cellE);
    const tInfo = TENSE_BY_ID[tense];
    const g = clean(given);
    const exp = clean(expected);
    const tip = tInfo.tip;
    const res = (kind, title, lines) => ({ kind, title, lines, tip });
    const who = SUBJ[p];

    if (!g) return res('empty', 'Tu n\'as rien écrit', [`Avec ${who}, ${au(tInfo)}, il faut écrire ${quote(expected)}.`]);
    if (deacc(g) === deacc(clean(verb.inf))) {
      return res('infinitive', 'C\'est l\'infinitif !', [`Tu as écrit le verbe tel qu'il est dans le dictionnaire. Il faut le conjuguer avec ${who}.`]);
    }

    // accents / cédille
    const acc = accepted(cellE).map(clean);
    if (acc.map(deacc).includes(deacc(g))) {
      const lines = [];
      if (/ç/.test(exp) && !/ç/.test(g)) lines.push('Il manque une cédille : devant « a » ou « o », le « c » devient « ç » pour garder le son [s].');
      else lines.push('Les lettres sont bonnes, mais pense aux accents (é, è, ê, à, â, î, ô, û).');
      lines.push(`Bonne écriture : ${quote(expected)}.`);
      return res('accent', 'Presque ! Fais attention aux accents', lines);
    }

    // g -> ge / c -> ç oubliés
    if (verb.type === 'er' && /ge/.test(exp) && deacc(exp.replace(/ge(?=[aâoô])/, 'g')) === deacc(g)) {
      return res('spelling', 'Un « e » muet est caché !', [
        `Devant « a » ou « o », le « g » de ${quote(verb.inf)} prend un « e » pour garder le son [j] (comme dans « gentil »).`,
        `Il faut écrire ${quote(expected)}.`,
      ]);
    }

    // autre personne du même temps ?
    for (const q of personsOf(tense)) {
      if (q === p || !forms[tense][q]) continue;
      if (accepted(forms[tense][q]).map(clean).includes(g)) {
        const lines = [`${quote(given.trim())} est la forme de ${SUBJ[q]}, mais la phrase demande ${who}.`];
        if (cellE.e !== undefined && forms[tense][q].e !== undefined && cellE.e !== forms[tense][q].e) {
          lines.push(`Avec ${who}, la terminaison est ${dash(cellE.e)} (et non ${dash(forms[tense][q].e)}).`);
        }
        lines.push(`Bonne réponse : ${quote(expected)}.`);
        return res('person', 'Mauvaise personne', lines);
      }
    }

    // autre temps du même verbe ?
    for (const t2 of TENSES) {
      if (t2.id === tense || !forms[t2.id]) continue;
      const order = [p, ...personsOf(t2.id).filter((x) => x !== p)];
      for (const q of order) {
        const c2 = forms[t2.id][q];
        if (c2 && accepted(c2).map(clean).includes(g)) {
          return res('tense', 'Tu as pris le mauvais temps', [
            `${quote(given.trim())} est ${du(t2)} (${t2.emoji}), mais ici il faut ${le(tInfo)} (${tInfo.emoji}).`,
            `Bonne réponse : ${quote(expected)}.`,
          ]);
        }
      }
    }

    // temps composés : auxiliaire / participe passé
    if (COMPOUND[tense]) {
      const eTok = exp.split(' ');
      const gTok = g.split(' ');
      if (gTok.length === 1) {
        const pp = clean(verb.pp || '');
        if (deacc(gTok[0]).startsWith(deacc(pp.slice(0, Math.max(2, pp.length - 2))))) {
          return res('aux-missing', 'Il manque l\'auxiliaire', [
            `Un temps composé s'écrit en deux mots : l'auxiliaire ${quote(verb.aux === 'etre' ? 'être' : 'avoir')} + le participe passé.`,
            `Bonne réponse : ${quote(expected)}.`,
          ]);
        }
        return res('pp-missing', 'Il manque le participe passé', [
          `Un temps composé s'écrit en deux mots : l'auxiliaire + le participe passé ${quote(verb.pp)}.`,
          `Bonne réponse : ${quote(expected)}.`,
        ]);
      }
      if (gTok.length >= 2) {
        if (deacc(gTok[0]) !== deacc(eTok[0])) {
          const wrongAux = ['a', 'as', 'ai', 'avons', 'avez', 'ont', 'avais', 'avait', 'avions', 'aviez', 'avaient', 'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront'].includes(gTok[0]);
          const lines = [];
          if (verb.aux === 'etre' && wrongAux) lines.push(`Le verbe ${quote(verb.inf)} se conjugue avec l'auxiliaire « être », pas avec « avoir ».`);
          else if (verb.aux !== 'etre' && !wrongAux) lines.push(`Le verbe ${quote(verb.inf)} se conjugue avec l'auxiliaire « avoir ».`);
          else lines.push(`L'auxiliaire doit être accordé avec ${who} : ${quote(eTok[0])}.`);
          lines.push(`Bonne réponse : ${quote(expected)}.`);
          return res('aux', 'Attention à l\'auxiliaire', lines);
        }
        const ppG = gTok.slice(1).join(' ');
        const ppBase = clean(verb.pp);
        if (verb.aux === 'etre' && deacc(ppG).startsWith(deacc(ppBase))) {
          const wantPl = PL(p) || p === 4;
          return res('agreement', 'Le participe passé s\'accorde', [
            `Avec l'auxiliaire « être », le participe passé s'accorde avec le sujet. ${wantPl ? 'Ici le sujet est pluriel : on ajoute -s.' : 'Pour une fille ou une femme, on ajoute -e ; pour le pluriel, -s.'}`,
            `Bonne réponse : ${quote(expected)}.`,
          ]);
        }
        return res('pp', 'Le participe passé n\'est pas bon', [
          `Le participe passé de ${quote(verb.inf)} est ${quote(verb.pp)}.`,
          `Bonne réponse : ${quote(expected)}.`,
        ]);
      }
    }

    // même début, mauvaise terminaison
    const k = prefixLen(g, exp);
    if (k >= 2 && exp.length - k <= 5 && g.length - k <= 6) {
      const gEnd = g.slice(k);
      const eEnd = exp.slice(k);
      const lines = [`Le début ${quote(exp.slice(0, k))} est juste ! 👍`];
      if (!gEnd) lines.push(`Mais tu as oublié la fin du mot : il faut ajouter ${quote(eEnd)}.`);
      else lines.push(`Mais la fin doit être ${quote('-' + eEnd)} avec ${who}, pas ${quote('-' + gEnd)}.`);
      if (cellE.e && !COMPOUND[tense]) lines.push(`${cap(au(tInfo))}, avec ${who}, la terminaison est ${dash(cellE.e)}.`);
      lines.push(`Bonne réponse : ${quote(expected)}.`);
      return res('ending', 'La fin du mot n\'est pas bonne', lines);
    }

    const lines = [];
    if (verb.type === 'irr') lines.push(`${quote(verb.inf)} est un verbe rebelle (irrégulier) : il faut apprendre ses formes par cœur.`);
    lines.push(`Avec ${who}, ${au(tInfo)}, on écrit ${quote(expected)}.`);
    return res('other', 'Pas tout à fait', lines);
  }

  /** Version courte d'un diagnostic pour les questions « pronom » / « temps » */
  function diagnoseRecognition(kind, info) {
    if (kind === 'pronoun') {
      return { kind: 'pronoun', title: 'Regarde la terminaison', lines: [`${quote(info.text)} va avec ${info.who}.`, info.hint || ''].filter(Boolean), tip: info.tip };
    }
    return { kind: 'tense', title: 'Quel est ce temps ?', lines: [`${quote(info.text)} est ${info.tenseName}.`, info.hint || ''].filter(Boolean), tip: info.tip };
  }


  const plain = (s) => String(s).replace(/\(e\)|\(s\)/g, '');
  /** Réponse cachée : « mang___ », « a_ m_____ »… */
  function mask(exp, e) {
    if (e && exp.endsWith(e) && exp.length > e.length) return exp.slice(0, -e.length) + '_'.repeat(e.length);
    return exp.split(' ').map((t) => {
      const k = t.length <= 1 ? 0 : t.length <= 2 ? 1 : Math.ceil(t.length / 2);
      return t.slice(0, k) + '_'.repeat(t.length - k);
    }).join(' ');
  }

  /**
   * Indices progressifs et adaptés au temps, à la personne et au verbe.
   * h1 = la méthode (sans donner la réponse) · h2 = un coup de pouce précis · mask = lettres cachées.
   */
  function hints(verb, forms, tense, p) {
    const cell = forms[tense][p];
    const exp = plain(first(cell));
    const w = SUBJ[p];
    const e = cell.e;
    const pres = forms.present;
    const endTxt = e ? `Avec ${w}, la terminaison est « -${e} ».` : '';
    const tStem = e && exp.endsWith(e) ? exp.slice(0, -e.length) : exp; // radical réellement utilisé (mang-, commenç-…)
    let h1, h2;
    if (COMPOUND[tense]) {
      const auxName = verb.aux === 'etre' ? 'être' : 'avoir';
      const when = { present: 'au présent', imparfait: "à l'imparfait", futur: 'au futur' }[COMPOUND[tense]];
      h1 = `Il faut 2 mots : l'auxiliaire « ${auxName} » ${when} + le participe passé.`;
      h2 = `L'auxiliaire est « ${exp.split(' ')[0]} » et le participe passé de « ${verb.inf} » est « ${verb.pp} ».${verb.aux === 'etre' ? ` Avec « être », il s'accorde avec ${w}.` : ''}`;
    } else if (tense === 'present') {
      if (e !== '' && verb.type !== 'irr' && !verb.pres) {
        h1 = `Enlève « -${verb.inf.slice(-2)} » de l'infinitif pour trouver le radical, puis ajoute la terminaison de ${w}.`;
        h2 = `${endTxt} Le radical est « ${tStem}- ».`.trim();
      } else {
        const q = p === 3 ? 5 : 3;
        h1 = `« ${verb.inf} » est un verbe rebelle : sa forme change beaucoup. Redis le verbe à voix haute avec ${w}.`;
        h2 = `Pour t'aider, voici une autre forme : ${PERSONS[q]} ${plain(first(pres[q]))}.`;
      }
    } else if (tense === 'imparfait') {
      const stem = tStem;
      const nous = pres[3].t;
      if (nous.endsWith('ons')) {
        h1 = `Pars de « nous » au présent : « nous ${nous} ». Enlève -ons, puis ajoute la terminaison de l'imparfait.`;
      } else {
        h1 = `Le radical de l'imparfait de « ${verb.inf} » est irrégulier : « ${stem}- ».`;
      }
      h2 = `${endTxt} Le radical est « ${stem}- ».`.trim();
    } else if (tense === 'futur' || tense === 'conditionnel') {
      const base = forms.futur[0].t.slice(0, -2);
      const regular = base === verb.inf || base === verb.inf.slice(0, -1);
      h1 = regular
        ? `${tense === 'futur' ? 'Au futur' : 'Au conditionnel'}, garde l'infinitif en entier : « ${verb.inf} »${verb.inf.endsWith('re') ? ' (les verbes en -re perdent leur e)' : ''}.`
        : `Attention : « ${verb.inf} » a un radical irrégulier au ${tense === 'futur' ? 'futur' : 'conditionnel'}.`;
      if (tense === 'conditionnel') h1 += " Puis les terminaisons de l'imparfait.";
      h2 = `Le radical est « ${base}- ». ${endTxt}`.trim();
    } else if (tense === 'subjonctif') {
      h1 = verb.forms && verb.forms.subjonctif
        ? `Le subjonctif de « ${verb.inf} » est très irrégulier : à apprendre par cœur.`
        : `Après « il faut que », pars de « ils » au présent (ils ${plain(first(pres[5]))}), enlève -ent et ajoute la terminaison.`;
      h2 = `${endTxt} ${p === 3 || p === 4 ? 'Pour nous et vous, le radical est celui de « nous » au présent.' : ''}`.trim();
    } else if (tense === 'imperatif') {
      h1 = `L'impératif ressemble au présent avec ${w}, mais sans le pronom.${p === 1 && /er$/.test(verb.inf) ? ' Avec « tu », les verbes en -er n\'ont pas de -s.' : ''}`;
      h2 = `Au présent : ${PERSONS[p]} ${plain(first(pres[p]))}.`;
    } else { // passé simple
      h1 = verb.type === 'er' || verb.inf === 'aller'
        ? "Verbes en -er : -ai, -as, -a, -âmes, -âtes, -èrent."
        : "Beaucoup d'autres verbes : -is, -is, -it, -îmes, -îtes, -irent (ou -us, -us, -ut, -ûmes, -ûtes, -urent).";
      h2 = endTxt || `Pense à la forme de « ${verb.inf} » dans un conte.`;
    }
    if (!h2) h2 = `La réponse commence par « ${exp.slice(0, Math.min(2, exp.length))}… ».`;
    return { h1, h2, mask: mask(exp, e) };
  }

  return { diagnose, diagnoseRecognition, endingTable, hints, SUBJ, du, au, le };
});
