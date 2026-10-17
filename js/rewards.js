/* Système de récompenses de Conjugo : trophées, boutique de la mascotte, règles de déblocage.
   Principe d'évolution « sans rien perdre » : on ne supprime et on ne renomme jamais un identifiant existant ;
   on ajoute seulement. Les trophées déjà gagnés (p.badges), les objets achetés (p.owned) et les objets portés
   (p.equipped) gardent leur sens ; les nouveaux trophées déjà mérités sont attribués automatiquement au premier lancement
   après la mise à jour (voir `award`). Version des récompenses : REWARDS_VERSION (affiche les « Nouveautés » une seule fois). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./conjugate.js'), require('./avatar-parts.js'));
  else root.Rewards = factory(root.Conj, root.AvatarParts);
})(typeof self !== 'undefined' ? self : this, function (Conj, Parts) {
  'use strict';
  const APP_VERSION = '1.3.0';
  const REWARDS_VERSION = 4;
  const AVATAR_LEVEL = 3; // niveau à atteindre pour débloquer l'avatar 3D
  const TIER_COINS = [10, 20, 35, 60];
  const TIER_NAMES = ['Bronze', 'Argent', 'Or', 'Diamant'];

  /* ---------- catégories de trophées ---------- */
  const CATS = [
    { id: 'play', name: 'Parties', emoji: '🎮' }, { id: 'acc', name: 'Bonnes réponses', emoji: '🎯' }, { id: 'combo', name: 'Séries', emoji: '🔥' },
    { id: 'perfect', name: 'Sans faute', emoji: '💯' }, { id: 'streak', name: 'Régularité', emoji: '📅' }, { id: 'lvl', name: 'Niveaux', emoji: '🐉' },
    { id: 'stars', name: 'Étoiles', emoji: '⭐' }, { id: 'master', name: 'Maîtrise', emoji: '🏅' }, { id: 'tense', name: 'Les temps', emoji: '⏳' },
    { id: 'family', name: 'Familles de verbes', emoji: '📚' }, { id: 'chrono', name: 'Chrono', emoji: '⏱️' }, { id: 'fix', name: 'Erreurs corrigées', emoji: '🔧' },
    { id: 'style', name: 'Style & avatar', emoji: '🎨' }, { id: 'fun', name: 'Surprises', emoji: '🎁' }, { id: 'meta', name: 'Collection', emoji: '🏆' },
  ];

  const BADGES = [];
  const add = (b) => BADGES.push(b);
  /** Série de trophées sur une même mesure : le palier (bronze → diamant) découle de la position dans la série. */
  function series(cat, val, rows, o) {
    o = o || {};
    rows.forEach(([goal, id, name, emoji, desc], i) => {
      const tier = Math.min(4, 1 + Math.floor((i * 4) / rows.length));
      add({ id, cat, name, emoji, desc: desc || (o.desc ? o.desc(goal) : ''), goal, val, tier: o.tier || tier, secret: !!o.secret, meta: !!o.meta });
    });
  }
  const S = (key, d = 0) => (p) => (p.stats && p.stats[key]) || d;

  series('play', S('sessions'), [
    [1, 'first', 'Premier pas', '👣', 'Termine ta première partie'], [10, 'play10', 'Habitué', '🎮', 'Termine 10 parties'], [25, 'play25', 'Joueur assidu', '🕹️', 'Termine 25 parties'],
    [50, 'play50', 'Marathonien', '🏃', 'Termine 50 parties'], [100, 'play100', 'Centenaire', '🎳', 'Termine 100 parties'], [250, 'play250', 'Habitant de l\'arène', '🏟️', 'Termine 250 parties'], [500, 'play500', 'Infatigable', '🚀', 'Termine 500 parties'],
  ]);
  series('acc', S('correct'), [
    [25, 'q25', 'Bon début', '🌱', '25 bonnes réponses'], [100, 'q100', 'Centurion', '🛡️', '100 bonnes réponses'], [250, 'q250', 'Tireur d\'élite', '🎯', '250 bonnes réponses'], [500, 'q500', 'Grand maître', '👑', '500 bonnes réponses'],
    [1000, 'q1000', 'Millier', '🏔️', '1 000 bonnes réponses'], [2500, 'q2500', 'Encyclopédie', '📚', '2 500 bonnes réponses'], [5000, 'q5000', 'Savant', '🎓', '5 000 bonnes réponses'], [10000, 'q10000', 'Génie des verbes', '🧠', '10 000 bonnes réponses'],
  ]);
  series('combo', S('bestCombo'), [
    [5, 'combo5', 'En feu', '🔥', '5 bonnes réponses d\'affilée'], [10, 'combo10', 'Inarrêtable', '⚡', '10 bonnes réponses d\'affilée'], [15, 'combo15', 'Torche vivante', '☄️', '15 bonnes réponses d\'affilée'],
    [20, 'combo20', 'Tornade', '🌪️', '20 bonnes réponses d\'affilée'], [30, 'combo30', 'Supernova', '💥', '30 bonnes réponses d\'affilée'], [50, 'combo50', 'Invincible', '🛸', '50 bonnes réponses d\'affilée'],
  ]);
  series('perfect', S('perfect'), [
    [1, 'perfect', 'Sans faute', '💯', 'Une partie parfaite'], [5, 'perfect5', 'Perfectionniste', '💎', '5 parties parfaites'], [10, 'perfect10', 'Orfèvre', '💍', '10 parties parfaites'],
    [25, 'perfect25', 'Précision chirurgicale', '🔬', '25 parties parfaites'], [50, 'perfect50', 'Maître absolu', '🥇', '50 parties parfaites'],
  ]);
  const bestStreak = (p) => Math.max((p.streak && p.streak.count) || 0, (p.stats && p.stats.bestStreak) || 0);
  series('streak', bestStreak, [
    [3, 'streak3', 'Petite flamme', '🕯️', '3 jours d\'affilée'], [7, 'streak7', 'Semaine de feu', '🏮', '7 jours d\'affilée'], [14, 'streak14', 'Quinzaine brûlante', '🌶️', '14 jours d\'affilée'],
    [30, 'streak30', 'Légende', '🌟', '30 jours d\'affilée'], [60, 'streak60', 'Deux mois de feu', '🏔️', '60 jours d\'affilée'], [100, 'streak100', 'Centurie', '💫', '100 jours d\'affilée'],
  ]);
  const days = (p) => Math.max((p.stats && p.stats.days) || 0, (p.streak && p.streak.count) || 0);
  series('streak', days, [
    [5, 'days5', 'Cinq jours de jeu', '📅', 'Joue pendant 5 jours différents'], [10, 'days10', 'Dix jours de jeu', '🗓️', 'Joue pendant 10 jours différents'], [25, 'days25', 'Un mois de jeu', '📆', 'Joue pendant 25 jours différents'],
    [50, 'days50', 'Habitué des lieux', '🏡', 'Joue pendant 50 jours différents'], [100, 'days100', 'Fidèle compagnon', '🤝', 'Joue pendant 100 jours différents'], [200, 'days200', 'Ami pour la vie', '💞', 'Joue pendant 200 jours différents'],
  ]);
  series('streak', S('chests'), [
    [1, 'chest1', 'Premier coffre', '🎁', 'Ouvre ton premier coffre du jour'], [7, 'chest7', 'Chasseur de coffres', '🧰', 'Ouvre 7 coffres du jour'], [30, 'chest30', 'Capitaine au trésor', '🏴‍☠️', 'Ouvre 30 coffres du jour'], [100, 'chest100', 'Dragon d\'or', '🐲', 'Ouvre 100 coffres du jour'],
  ]);
  series('lvl', (p, x) => x.level, [
    [3, 'lvl3', 'Éclosion', '🐣', 'Atteins le niveau 3'], [5, 'lvl5', 'Dragonneau', '🐲', 'Atteins le niveau 5'], [10, 'lvl10', 'Dragon adulte', '🐉', 'Atteins le niveau 10'], [15, 'lvl15', 'Gardien du château', '🏰', 'Atteins le niveau 15'],
    [20, 'lvl20', 'Chevalier des verbes', '⚔️', 'Atteins le niveau 20'], [30, 'lvl30', 'Seigneur des temps', '🤴', 'Atteins le niveau 30'], [40, 'lvl40', 'Roi des conjugaisons', '👑', 'Atteins le niveau 40'], [50, 'lvl50', 'Légende mythique', '🌈', 'Atteins le niveau 50'],
  ]);
  series('stars', (p, x) => x.stars, [
    [10, 'stars10', 'Chasseur d\'étoiles', '✨', 'Gagne 10 étoiles'], [25, 'stars25', 'Collectionneur d\'étoiles', '⭐', 'Gagne 25 étoiles'], [50, 'stars50', 'Constellation', '🌠', 'Gagne 50 étoiles'],
    [100, 'stars100', 'Voie lactée', '🌌', 'Gagne 100 étoiles'], [200, 'stars200', 'Univers entier', '🪐', 'Gagne 200 étoiles'], [300, 'stars300', 'Big Bang', '💫', 'Gagne 300 étoiles'],
  ]);
  series('master', (p, x) => x.mastered, [
    [1, 'master', 'Maître d\'un temps', '🏅', 'Maîtrise un verbe à un temps entier'], [5, 'master5', 'Cinq maîtrises', '🎖️', 'Maîtrise 5 verbes à un temps entier'], [10, 'master10', 'Dix maîtrises', '🏵️', 'Maîtrise 10 verbes à un temps entier'],
    [25, 'master25', 'Vingt-cinq maîtrises', '🏆', 'Maîtrise 25 verbes à un temps entier'], [50, 'master50', 'Cinquante maîtrises', '🥇', 'Maîtrise 50 verbes à un temps entier'], [100, 'master100', 'Grand sage des verbes', '🧙', 'Maîtrise 100 verbes à un temps entier'],
  ]);
  series('tense', (p, x) => x.tensesTried, [
    [2, 'tenses2', 'Curieux du temps', '🔍', 'Joue avec 2 temps différents'], [4, 'explorer', 'Explorateur', '🧭', 'Joue avec 4 temps différents'], [6, 'tenses6', 'Voyageur temporel', '✈️', 'Joue avec 6 temps différents'],
    [8, 'tenses8', 'Globe-trotter', '🌍', 'Joue avec 8 temps différents'], [10, 'tenses10', 'Maître du temps', '⏳', 'Joue avec les 10 temps'],
  ]);
  series('family', (p, x) => x.verbsSeen, [
    [10, 'verbs10', 'Curieux de verbes', '🔖', 'Réussis 10 verbes différents'], [20, 'verbs20', 'Collectionneur', '📚', 'Réussis 20 verbes différents'], [40, 'verbs40', 'Bibliothécaire', '🏛️', 'Réussis 40 verbes différents'],
    [60, 'verbs60', 'Dictionnaire vivant', '📖', 'Réussis 60 verbes différents'], [100, 'verbs100', 'Académicien', '🖋️', 'Réussis 100 verbes différents'],
  ]);
  series('chrono', S('chronoBest'), [
    [15, 'chrono', 'Éclair', '⏱️', '15 bonnes réponses au défi chrono'], [20, 'chrono20', 'Foudre', '🌩️', '20 bonnes réponses au défi chrono'], [25, 'chrono25', 'Guépard', '🐆', '25 bonnes réponses au défi chrono'],
    [30, 'chrono30', 'Fusée', '🚀', '30 bonnes réponses au défi chrono'], [40, 'chrono40', 'Vitesse lumière', '💡', '40 bonnes réponses au défi chrono'],
  ]);
  series('chrono', S('chronos'), [
    [5, 'chronos5', 'Sprinter', '🏃‍♂️', 'Joue 5 défis chrono'], [25, 'chronos25', 'Champion du chrono', '🏁', 'Joue 25 défis chrono'],
  ]);
  series('fix', S('fixed'), [
    [10, 'fixer', 'Chasseur d\'erreurs', '🔧', 'Corrige 10 erreurs'], [25, 'fix25', 'Réparateur', '🛠️', 'Corrige 25 erreurs'], [50, 'fix50', 'Docteur des verbes', '🩺', 'Corrige 50 erreurs'],
    [100, 'fix100', 'Détective', '🕵️', 'Corrige 100 erreurs'], [250, 'fix250', 'Inspecteur en chef', '🧐', 'Corrige 250 erreurs'],
  ]);

  // un trophée par temps et par palier (10 / 50 / 150 bonnes réponses) : créés à partir de la liste des temps du moteur
  const TENSES = (Conj && Conj.TENSES) || [];
  TENSES.forEach((t) => {
    [[10, 'Découverte', 1], [50, 'Pratique', 2], [150, 'Expert', 3]].forEach(([goal, label, tier]) => {
      add({ id: `t:${t.id}:${goal}`, cat: 'tense', name: `${t.name} – ${label.toLowerCase()}`, emoji: t.emoji, desc: `${goal} bonnes réponses : ${t.name.toLowerCase()}`, goal, val: (p, x) => x.byTense[t.id] || 0, tier, secret: false, meta: false });
    });
  });
  // un trophée par famille de verbes et par palier (25 / 100 / 300)
  const FAMILIES = [['aux', 'Être & avoir', '👑'], ['er', 'Verbes en -er', '🌈'], ['ir2', 'Verbes en -ir', '🍀'], ['re', 'Verbes en -re', '🔧'], ['irr', 'Verbes rebelles', '🐉']];
  FAMILIES.forEach(([id, name, emoji]) => {
    [[25, 'apprenti', 1], [100, 'habile', 2], [300, 'champion', 3]].forEach(([goal, label, tier]) => {
      add({ id: `f:${id}:${goal}`, cat: 'family', name: `${name} – ${label}`, emoji, desc: `${goal} bonnes réponses sur « ${name.toLowerCase()} »`, goal, val: (p, x) => x.byType[id] || 0, tier, secret: false, meta: false });
    });
  });

  series('style', (p, x) => x.owned, [
    [3, 'own3', 'Petite garde-robe', '👕', 'Possède 3 objets de la boutique'], [10, 'own10', 'Fashionista', '👗', 'Possède 10 objets de la boutique'], [25, 'own25', 'Collectionneur de style', '🛍️', 'Possède 25 objets de la boutique'],
    [50, 'own50', 'Boutique vivante', '🏬', 'Possède 50 objets de la boutique'], [100, 'own100', 'Roi du dressing', '🤴', 'Possède 100 objets de la boutique'],
  ]);
  series('style', (p, x) => x.forms, [
    [3, 'forms3', 'Apprenti caméléon', '🦎', 'Débloque 3 transformations de l\'avatar'], [6, 'forms6', 'Métamorphe', '🦋', 'Débloque 6 transformations de l\'avatar'], [10, 'forms10', 'Maître des formes', '🎭', 'Débloque 10 transformations de l\'avatar'],
    [15, 'forms15', 'Illusionniste', '🎩', 'Débloque 15 transformations de l\'avatar'], [25, 'forms25', 'Collectionneur de formes', '🌟', 'Débloque 25 transformations de l\'avatar'],
  ]);
  add({ id: 'av1', cat: 'style', name: 'Mon avatar !', emoji: '🧙', desc: 'Enregistre ton premier avatar 3D', goal: 1, val: S('avatarSaves'), tier: 1 });
  add({ id: 'photo', cat: 'style', name: 'Photographe', emoji: '📸', desc: 'Prends une photo de ton avatar', goal: 1, val: S('photos'), tier: 1 });
  add({ id: 'outfit1', cat: 'style', name: 'Styliste', emoji: '👚', desc: 'Enregistre une tenue', goal: 1, val: S('outfits'), tier: 1 });
  add({ id: 'outfit3', cat: 'style', name: 'Défilé de mode', emoji: '👠', desc: 'Enregistre 3 tenues différentes', goal: 3, val: (p) => ((p.avatar && p.avatar.outfits) || []).filter(Boolean).length, tier: 2 });
  add({ id: 'boop25', cat: 'style', name: 'Chatouilles', emoji: '🤭', desc: 'Touche ton avatar 25 fois', goal: 25, val: S('boops'), tier: 2 });

  // surprises (le descriptif est caché tant qu'elles ne sont pas gagnées)
  add({ id: 'early', cat: 'fun', name: 'Lève-tôt', emoji: '🌅', desc: 'Joue une partie avant 8 h du matin', goal: 1, val: S('early'), tier: 2, secret: true });
  add({ id: 'weekend', cat: 'fun', name: 'Week-end studieux', emoji: '🏖️', desc: 'Joue un samedi ou un dimanche', goal: 1, val: S('weekend'), tier: 1, secret: true });
  add({ id: 'comeback', cat: 'fun', name: 'Retour en force', emoji: '🤗', desc: 'Reviens jouer après plus d\'une semaine', goal: 1, val: S('comeback'), tier: 2, secret: true });
  add({ id: 'nohint', cat: 'fun', name: 'Sans coup de pouce', emoji: '🧩', desc: 'Termine une partie de 10 questions sans aucun indice', goal: 1, val: S('noHint'), tier: 2, secret: true });
  add({ id: 'fast', cat: 'fun', name: 'Lièvre des verbes', emoji: '🐇', desc: 'Termine une partie parfaite en moins de 90 secondes', goal: 1, val: S('fast'), tier: 3, secret: true });
  add({ id: 'hints50', cat: 'fun', name: 'Bon élève', emoji: '🙋', desc: 'Utilise 50 fois un indice : demander de l\'aide, c\'est malin !', goal: 50, val: S('hints'), tier: 1, secret: true });


  // ----- version 3 : trophées de très haut niveau, pour les joueurs les plus assidus (palier diamant) -----
  const hi = { tier: 4 };
  series('play', S('sessions'), [[1000, 'play1000', 'Mille parties', '🏆', 'Termine 1 000 parties']], hi);
  series('acc', S('correct'), [[25000, 'q25000', 'Maître des mots', '🧙', '25 000 bonnes réponses']], hi);
  series('combo', S('bestCombo'), [[75, 'combo75', 'Phénomène', '🌠', '75 bonnes réponses d\'affilée'], [100, 'combo100', 'Série légendaire', '🐉', '100 bonnes réponses d\'affilée']], hi);
  series('perfect', S('perfect'), [[100, 'perfect100', 'Cent sans faute', '👑', '100 parties parfaites']], hi);
  series('streak', bestStreak, [[150, 'streak150', 'Flamme éternelle', '🔥', '150 jours d\'affilée'], [200, 'streak200', 'Phénix', '🦅', '200 jours d\'affilée'], [365, 'streak365', 'Une année entière', '🎆', '365 jours d\'affilée']], hi);
  series('streak', days, [[300, 'days300', 'Compagnon de route', '🧭', 'Joue pendant 300 jours différents'], [365, 'days365', 'Un an de jeu', '🎂', 'Joue pendant 365 jours différents']], hi);
  series('lvl', (p, x) => x.level, [[60, 'lvl60', 'Archimage', '🔮', 'Atteins le niveau 60'], [75, 'lvl75', 'Titan', '🗿', 'Atteins le niveau 75'], [100, 'lvl100', 'Dragon éternel', '🐲', 'Atteins le niveau 100']], hi);
  series('chrono', S('chronoBest'), [[50, 'chrono50', 'Supersonique', '🛰️', '50 bonnes réponses au défi chrono'], [60, 'chrono60', 'Temps arrêté', '⏸️', '60 bonnes réponses au défi chrono']], hi);
  series('chrono', S('chronos'), [[50, 'chronos50', 'Pilote de course', '🏎️', 'Joue 50 défis chrono'], [100, 'chronos100', 'Légende du chrono', '🏆', 'Joue 100 défis chrono']], { tier: 3 });
  series('fix', S('fixed'), [[500, 'fix500', 'Gardien de la grammaire', '🏛️', 'Corrige 500 erreurs']], hi);
  series('master', (p, x) => x.mastered, [[200, 'master200', 'Bibliothèque vivante', '📜', 'Maîtrise 200 verbes à un temps entier']], hi);
  series('style', S('photos'), [[5, 'photo5', 'Reporter', '📷', 'Prends 5 photos de ton avatar'], [25, 'photo25', 'Studio photo', '🎞️', 'Prends 25 photos de ton avatar']], { tier: 2 });
  series('style', S('boops'), [[100, 'boop100', 'Roi des câlins', '🤗', 'Touche ton avatar 100 fois'], [250, 'boop250', 'Meilleur ami', '💞', 'Touche ton avatar 250 fois']], { tier: 3 });
  series('style', (p, x) => x.forms, [[30, 'forms30', 'Grand transformiste', '🎭', 'Débloque 30 transformations de l\'avatar'], [Parts.FORMS.length, 'formsAll', 'Toutes les formes !', '🌈', 'Débloque toutes les transformations de l\'avatar']], hi);
  series('style', (p, x) => x.owned, [[150, 'own150', 'Dressing infini', '🧳', 'Possède 150 objets de la boutique']], hi);
  // tous les temps : un trophée « maître » par temps (300 bonnes réponses)
  TENSES.forEach((t) => add({ id: `t:${t.id}:300`, cat: 'tense', name: `${t.name} – maître`, emoji: t.emoji, desc: `300 bonnes réponses : ${t.name.toLowerCase()}`, goal: 300, val: (p, x) => x.byTense[t.id] || 0, tier: 4, secret: false, meta: false }));
  FAMILIES.forEach(([id, name, emoji]) => add({ id: `f:${id}:600`, cat: 'family', name: `${name} – légende`, emoji, desc: `600 bonnes réponses sur « ${name.toLowerCase()} »`, goal: 600, val: (p, x) => x.byType[id] || 0, tier: 4, secret: false, meta: false }));
  // petites surprises supplémentaires
  add({ id: 'monday', cat: 'fun', name: 'Lundi motivé', emoji: '💪', desc: 'Joue un lundi', goal: 1, val: S('monday'), tier: 1, secret: true });
  add({ id: 'wednesday', cat: 'fun', name: 'Mercredi malin', emoji: '🎈', desc: 'Joue un mercredi', goal: 1, val: S('wednesday'), tier: 1, secret: true });
  add({ id: 'long', cat: 'fun', name: 'Longue séance', emoji: '⏳', desc: 'Joue une partie de 20 questions ou plus', goal: 1, val: S('long'), tier: 2, secret: true });
  add({ id: 'rebound', cat: 'fun', name: 'Rebond', emoji: '🏀', desc: 'Réussis une partie après avoir fait au moins 3 erreurs dans la précédente', goal: 1, val: S('rebound'), tier: 2, secret: true });

  // trophées « collection » : comptent les autres trophées
  series('meta', (p, x) => x.badgeCount, [
    [10, 'trophies10', 'Premières coupes', '🥉', 'Gagne 10 trophées'], [25, 'trophies25', 'Vitrine garnie', '🥈', 'Gagne 25 trophées'], [50, 'trophies50', 'Chasseur de trophées', '🥇', 'Gagne 50 trophées'],
    [100, 'trophies100', 'Musée des trophées', '💎', 'Gagne 100 trophées'], [150, 'trophies150', 'Légende des trophées', '🌈', 'Gagne 150 trophées'], [200, 'trophies200', 'Panthéon des trophées', '🏛️', 'Gagne 200 trophées'],
  ], { meta: true });

  const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

  /** Mesures du joueur dont dépendent les trophées. `d` : { levelOf, typeOf(inf), masteredCount(p), starsTotal(p), formsUnlocked(p, x) } */
  function context(p, d) {
    const byTense = {}, byType = {}, seen = new Set(), tried = new Set();
    for (const [k, c] of Object.entries(p.cards || {})) {
      const [inf, t] = k.split('|');
      tried.add(t);
      const n = (c && c.c) || 0; if (!n) continue;
      byTense[t] = (byTense[t] || 0) + n; seen.add(inf);
      const ty = d.typeOf ? d.typeOf(inf) : null; if (ty) byType[ty] = (byType[ty] || 0) + n;
    }
    const x = {
      level: d.levelOf(p.xp || 0), stars: d.starsTotal(p), mastered: d.masteredCount(p), byTense, byType, verbsSeen: seen.size, tensesTried: tried.size,
      owned: (p.owned || []).length, forms: 0, badgeCount: 0,
    };
    x.forms = d.formsUnlocked ? d.formsUnlocked(p, x) : 0;
    return x;
  }

  /** Progression d'un trophée : { val, goal, done, pct } */
  function progress(b, p, x) {
    const val = b.meta ? x.badgeCount : Math.max(0, b.val(p, x) || 0);
    return { val, goal: b.goal, done: val >= b.goal, pct: Math.min(100, Math.round((val / b.goal) * 100)) };
  }
  const earnedCount = (p) => BADGES.filter((b) => !b.meta && p.badges && p.badges[b.id]).length;

  /** Attribue tous les trophées mérités mais pas encore gagnés. Retourne { list, coins }. N'ajoute PAS les pièces (à l'appelant de le faire). */
  function award(p, x, now) {
    p.badges = p.badges || {};
    const list = [];
    for (let pass = 0; pass < 3; pass++) {
      x.badgeCount = earnedCount(p);
      let more = false;
      for (const b of BADGES) {
        if (p.badges[b.id]) continue;
        if (progress(b, p, x).done) { p.badges[b.id] = now || Date.now(); list.push(b); more = true; if (!b.meta) x.badgeCount++; }
      }
      if (!more) break;
    }
    x.badgeCount = earnedCount(p);
    return { list, coins: list.reduce((n, b) => n + TIER_COINS[b.tier - 1], 0) };
  }

  /* ---------- règles de déblocage communes (boutique + avatar) ---------- */
  function parseLock(l) {
    if (!l) return { t: 'free' };
    if (typeof l === 'number') return { t: 'coins', n: l };
    if (l[0] === 'l') return { t: 'lvl', n: +l.slice(1) };
    if (l.startsWith('b:')) return { t: 'badge', id: l.slice(2) };
    return { t: 'free' };
  }
  const owns = (p, id) => (p.owned || []).includes(id);
  /** Peut-on porter l'objet ? (gratuit, acheté, ou gagné grâce au niveau / à un trophée) */
  function usable(p, x, lock, ownedId) {
    const l = parseLock(lock);
    if (l.t === 'free') return true;
    if (owns(p, ownedId)) return true;
    if (l.t === 'lvl') return x.level >= l.n;
    if (l.t === 'badge') return !!(p.badges && p.badges[l.id]);
    return false;
  }
  /** Prix en pièces d'un objet d'avatar (0 = gratuit). Le niveau / trophée de `lock` l'offre sans payer. */
  const priceOf = (it) => (it && it.price) || 0;
  const canBuy = (p, x, it, ownedId) => priceOf(it) > 0 && !usable(p, x, it.lock, ownedId);
  function lockText(lock) {
    const l = parseLock(lock);
    if (l.t === 'coins') return `🪙 ${l.n}`;
    if (l.t === 'lvl') return `Niveau ${l.n}`;
    if (l.t === 'badge') return `Trophée « ${(BADGE_BY_ID[l.id] || { name: l.id }).name} »`;
    return '';
  }
  const lockHelp = (lock) => { const l = parseLock(lock); return l.t === 'lvl' ? `Atteins le niveau ${l.n} pour le débloquer.` : l.t === 'badge' ? `Gagne le trophée « ${(BADGE_BY_ID[l.id] || { name: l.id }).name} » pour le débloquer.` : ''; };

  /* ---------- boutique de la mascotte (2D) ---------- */
  // Les identifiants existants (hat:🎩…) sont conservés tels quels.
  const SHOP = [];
  const shop = (kind, rows) => rows.forEach(([val, name, lock, emoji]) => SHOP.push({ id: `${kind}:${val}`, kind, val, name, lock, price: typeof lock === 'number' ? lock : 0, emoji: emoji || (kind === 'theme' ? '' : val) }));
  shop('hat', [
    ['🎩', 'Haut-de-forme', 30], ['🧢', 'Casquette', 25], ['👑', 'Couronne', 80], ['🎓', 'Chapeau de diplômé', 50], ['🎀', 'Nœud', 25], ['🤠', 'Cowboy', 40], ['🌸', 'Fleur', 20],
    ['👒', 'Chapeau de paille', 25], ['⛑️', 'Casque de chantier', 30], ['🎧', 'Casque audio', 40], ['🌟', 'Étoile', 30], ['🍄', 'Champignon', 35], ['🌻', 'Tournesol', 30],
    ['🦋', 'Papillon', 35], ['❄️', 'Flocon', 30], ['🍀', 'Trèfle', 25], ['🌙', 'Lune', 40], ['🍕', 'Pizza', 40], ['🍦', 'Glace', 35], ['🎈', 'Ballon', 30], ['🐝', 'Abeille', 30],
    ['🔥', 'Flamme', 'b:combo10'], ['☀️', 'Soleil', 'b:streak30'], ['💎', 'Diamant', 'b:perfect5'], ['🌈', 'Arc-en-ciel', 'l8'], ['🏆', 'Coupe', 'b:master'], ['🪁', 'Cerf-volant', 'l12'], ['👾', 'Alien pixel', 'l15'], ['🚀', 'Fusée', 'b:chrono'],
  ]);
  shop('glasses', [
    ['🕶️', 'Lunettes de soleil', 40], ['👓', 'Lunettes rondes', 25], ['🥽', 'Lunettes de plongée', 35], ['🎭', 'Masque', 40], ['🕵️', 'Déguisement', 45], ['😎', 'Cool', 'l6'], ['🤓', 'Premier de la classe', 'b:q100'], ['🧐', 'Monocle', 50],
  ]);
  shop('neck', [
    ['🧣', 'Écharpe', 25], ['📿', 'Collier', 35], ['🏅', 'Médaille', 40], ['🔔', 'Clochette', 20], ['🌺', 'Collier de fleurs', 30], ['⭐', 'Étoile', 25], ['💎', 'Pendentif', 60],
    ['🍬', 'Bonbon', 20], ['🥇', 'Médaille d\'or', 'b:perfect'], ['🎖️', 'Décoration', 'b:streak7'], ['🧿', 'Porte-bonheur', 'l10'],
  ]);
  shop('pet', [
    ['🐥', 'Poussin', 40], ['🐱', 'Chaton', 60], ['🐶', 'Chiot', 60], ['🐞', 'Coccinelle', 30], ['🐢', 'Tortue', 50], ['🐰', 'Lapin', 60], ['🦊', 'Renard', 80], ['🐼', 'Panda', 90],
    ['🦉', 'Hibou', 70], ['🐧', 'Pingouin', 70], ['🐙', 'Pieuvre', 80], ['🐠', 'Poisson', 40], ['👻', 'Fantôme', 50], ['🤖', 'Robot', 100], ['👽', 'Alien', 90],
    ['🐲', 'Mini dragon', 'l10'], ['🦄', 'Licorne', 'b:streak7'], ['🦖', 'Dino', 'b:verbs20'], ['🦅', 'Aigle', 'l20'], ['🐉', 'Dragon sage', 'l25'],
  ]);
  shop('theme', [
    ['space', 'Espace', 60, '🌌'], ['ocean', 'Océan', 60, '🌊'], ['forest', 'Forêt', 60, '🌲'], ['candy', 'Bonbons', 60, '🍭'],
    ['sunset', 'Coucher de soleil', 50, '🌅'], ['meadow', 'Prairie', 50, '🌼'], ['snow', 'Neige', 50, '⛄'], ['desert', 'Désert', 50, '🏜️'], ['sakura', 'Cerisiers', 60, '🌸'],
    ['night', 'Nuit étoilée', 70, '🌙'], ['beach', 'Plage', 55, '🏖️'], ['jungle', 'Jungle', 60, '🦜'], ['lava', 'Volcan', 'l12', '🌋'], ['aurora', 'Aurore boréale', 'l16', '🎆'],
    ['rainbow', 'Arc-en-ciel', 'b:combo5', '🌈'], ['gold', 'Trésor', 'b:streak14', '💰'],
  ]);
  const SKINS = [['#7bd88f', 0], ['#6ec6ff', 15], ['#ff9ecf', 15], ['#ffb35c', 15], ['#b79cff', 15], ['#ff7676', 15], ['#ffd93d', 25],
    ['#2ec4b6', 20], ['#e63946', 20], ['#4a4e69', 20], ['#f4a261', 20], ['#a0e7e5', 20], ['#c77dff', 20], ['#8ac926', 20], ['#ff6b35', 20], ['#ffffff', 25], ['#ffd700', 'l10']];
  const SHOP_KINDS = [['hat', 'Chapeaux', '🎩'], ['glasses', 'Lunettes', '🕶️'], ['neck', 'Cou', '🧣'], ['pet', 'Compagnons', '🐥'], ['theme', 'Décors', '🌌'], ['skin', 'Couleurs', '🎨']];
  const NONE = { hat: ['Aucun', '🚫'], glasses: ['Aucune', '🚫'], neck: ['Aucun', '🚫'], pet: ['Aucun', '🚫'], theme: ['Ciel', '☁️'] };

  /* ---------- avatar 3D ---------- */
  const avatarUnlocked = (x) => x.level >= AVATAR_LEVEL;
  /** Nombre de transformations utilisables (pour les trophées « formes »). */
  function formsUnlocked(p, x) {
    return Parts.FORMS.filter((f) => usable(p, x, f.lock, Parts.itemId('form', f.id))).length;
  }
  /** L'avatar du joueur, toujours complet et valide. */
  function avatarOf(p) {
    const a = p.avatar; // même objet tant qu'il est complet : on peut le modifier en place
    if (a && typeof a === 'object' && a.col && typeof a.col === 'object' && Array.isArray(a.outfits) && a.outfits.length === 3 && typeof a.form === 'string') return a;
    return (p.avatar = Parts.sanitize(a));
  }
  /** Retire de la configuration tout ce que le joueur n'a pas (encore) le droit de porter (ex. après une fusion de synchro). */
  function clampAvatar(p, x, cfg) {
    const c = Parts.sanitize(cfg);
    const ok = (slot, id, lock) => usable(p, x, lock, Parts.itemId(slot, id));
    if (c.form !== 'auto') { const f = Parts.find('form', c.form); if (!f || !ok('form', f.id, f.lock)) c.form = 'auto'; }
    for (const k of ['hat', 'glasses', 'neck', 'back', 'hand', 'feet', 'aura']) if (c[k]) { const it = Parts.find(k, c[k]); if (!it || !ok(k, it.id, it.lock)) c[k] = ''; }
    for (const [k, slot, def] of [['eyes', 'eyes', 'round'], ['mouth', 'mouth', 'smile'], ['pat', 'pat', 'none'], ['fin', 'fin', 'auto'], ['pose', 'pose', 'idle'], ['scene', 'scene', 'sky']]) { const it = Parts.find(slot, c[k]); if (!it || !ok(slot, it.id, it.lock)) c[k] = def; }
    for (const k of ['body', 'belly', 'accent']) if (c.col[k]) { const it = Parts.find('color', c.col[k]); if (it && !ok('color', it.id, it.lock)) c.col[k] = ''; }
    return c;
  }

  /* ---------- nouveautés affichées une fois après la mise à jour ---------- */
  const NEWS = [
    { v: 4, title: 'Personnalise ton avatar avec tes pièces !', lines: [
      '🪙 Chaque avatar, accessoire, couleur, matière, pose et décor 3D s\'achète avec des pièces, comme dans la boutique.',
      '🎁 Atteindre le niveau ou le trophée indiqué sur un objet l\'offre toujours gratuitement.',
      '👀 Tu peux essayer un objet sur ton avatar avant de l\'acheter. Ce que tu as déjà est conservé.',
    ] },
    { v: 3, title: 'Nouveaux avatars et trophées !', lines: [
      '🐲 14 nouveaux avatars à débloquer : renard, panda, pingouin, lion, vampire, chevalier, golem, dragon éclair…',
      '🏆 Plus de 30 nouveaux trophées, du plus facile au plus légendaire.',
      '🔓 Les avatars et accessoires 3D se débloquent maintenant en gagnant des niveaux et des trophées. Ce que tu as déjà acheté est conservé.',
    ] },
    { v: 2, title: 'Gros pack de récompenses !', lines: [
      '🏆 Plus de 150 trophées à gagner (par temps, par famille de verbes, séries, régularité, surprises…).',
      '🎒 Boutique agrandie : chapeaux, lunettes, colliers, compagnons et décors en plus.',
      '🧙 Nouveau : ton avatar 3D ! Transformations, couleurs, accessoires, poses et décors. Il se débloque au niveau 3.',
      '✅ Tout ce que tu avais déjà (trophées, objets, pièces, niveau) est conservé.',
    ] },
  ];

  return {
    APP_VERSION, REWARDS_VERSION, AVATAR_LEVEL, TIER_COINS, TIER_NAMES, CATS, BADGES, BADGE_BY_ID, FAMILIES, SHOP, SKINS, SHOP_KINDS, NONE, NEWS,
    priceOf, canBuy, context, progress, award, earnedCount, parseLock, usable, lockText, lockHelp, owns, avatarUnlocked, formsUnlocked, avatarOf, clampAvatar,
  };
});
