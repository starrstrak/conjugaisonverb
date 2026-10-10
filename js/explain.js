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

  return { diagnose, diagnoseRecognition, endingTable, SUBJ, du, au, le };
});
