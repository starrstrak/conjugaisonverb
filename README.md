# 🐉 Conjugo – la conjugaison en s'amusant

Appli web pour apprendre les verbes (enfants de 8-9 ans). **Fonctionne sans internet**, s'installe sur
l'écran d'accueil (téléphone, tablette, ordinateur), sans compte, sans publicité, sans collecte de données :
tout reste sur l'appareil.

## Ce que fait l'appli

**Méthode** : petites parties de 10 questions, correction immédiate, répétition espacée.

| Idée | Comment c'est fait |
|---|---|
| Jouer, pas réviser | Mascotte **Conjugo** qui grandit (œuf → dragon), XP, niveaux, pièces, flamme des jours d'affilée, coffre du jour, **155 trophées**, boutique (≈100 objets : chapeaux, lunettes, colliers, compagnons, décors, couleurs) et **avatar 3D** |
| Récompenses | Trophées bronze → diamant (parties, séries, régularité, niveaux, étoiles, maîtrise, un par temps, par famille de verbes, chrono, erreurs corrigées, surprises secrètes…) avec barre de progression et « Bientôt ! » ; objets de boutique achetés avec des pièces **ou gagnés** grâce à un niveau / un trophée ; l'écran « Moi » regroupe Trophées · Boutique · Avatar 3D |
| Avatar 3D | Débloqué au niveau 3. Se fait tourner au doigt, se transforme (25 formes : dragon de feu, de glace, licorne, robot, fantôme, abeille…), s'habille (≈100 accessoires : tête, lunettes, cou, dos, main, pieds, auras animées), 25 couleurs + motifs + matières, yeux/bouches, 16 décors 3D, 9 poses, 3 tenues sauvegardables, photo PNG partageable. Tout s'**achète avec les pièces** (comme la boutique) ; atteindre le niveau ou le trophée indiqué sur l'objet l'offre gratuitement. On peut **essayer avant d'acheter**. Moteur maison dans un `<canvas>` : aucune dépendance, fonctionne hors-ligne |
| Facile → difficile | Au début on **choisit** parmi 4 propositions ; quand le verbe est mieux connu, on **écrit** (clavier d'accents fourni) |
| Les erreurs enseignent | Chaque erreur est **expliquée** : mauvaise personne, mauvais temps, terminaison, `ge`/`ç`, accents, auxiliaire, participe passé, accord… avec le rappel du cours. La question revient 2 questions plus tard. « Mes erreurs » regroupe ce qui reste fragile |
| Se souvenir longtemps | Répétition espacée (boîtes de Leitner : 0 / 1 / 3 / 7 / 21 jours) par verbe × temps × personne. « Jouer » = la révision du jour |
| Comprendre | Frise passé / présent / futur, mot-repère (« Hier », « Demain »…), terminaisons colorées, mini-leçon par temps, **Mémo** avec tous les tableaux |
| Variété | Aventure (mondes = temps, missions = familles de verbes, 3 étoiles), Défi chrono 60 s, « Je choisis » (temps + verbes), questions « Quel pronom ? » et « Quel temps ? » |
| Indices | 💡 progressifs et adaptés au temps et au verbe : 1) la méthode (« pars de *nous* au présent… »), 2) un coup de pouce (terminaison, forme voisine) + 2 mauvaises réponses retirées, 3) la réponse à trous (`mang___`). Moins d'XP, et une réponse aidée ne compte pas comme « acquise » |
| Parties sauvegardées | Chaque réponse est enregistrée aussitôt ; une partie interrompue se **reprend** depuis l'accueil ; historique des parties dans Espace parents ➜ Progrès |
| Confort | Sons, lecture à voix haute (voix française de l'appareil), police plus grande/espacée (dys), pas de vies, pas de chrono punitif (sauf mode chrono, en pause pendant les explications) |

**Temps** : présent, futur simple, imparfait, passé composé, impératif (de base) · conditionnel, plus-que-parfait,
subjonctif présent, passé simple, futur antérieur (bonus, débloqués avec 12 ⭐ ou activés par un parent).
**67 verbes** fournis (être, avoir, aller, faire… verbes en -er, -ir, -re).

## Espace parents / enseignants (🔒 en haut à droite)

Accès protégé par un petit calcul. On y trouve :

* **Verbes** : ajouter, modifier, supprimer/masquer un verbe, créer des **listes** (« Verbes de la semaine »…) qui deviennent des missions et peuvent être mises en avant sur l'accueil.
* **Progrès** : réussite, temps acquis, verbes à retravailler, types d'erreurs fréquentes, dernières erreurs.
* **Exercices** : choisir et moduler tout ce qui est joué — types de questions (choisir, écrire, « quel pronom ? », « quel temps ? » et leur fréquence), pronoms travaillés, familles de verbes, jeux visibles sur l'accueil, indices (autorisés ou non, nombre), question ratée reposée ou non, durée du défi chrono. Les valeurs par défaut reproduisent le jeu d'origine ; les réglages se synchronisent.
* **Réglages** : objectif du jour, longueur des parties, choix/écriture, temps disponibles, sons, police.
* **Partager** : lien de partage de verbes, export/import de fichier, sauvegarde complète.

### Ajouter un verbe (sans toucher au code)

1. **Verbes ➜ ➕ Ajouter**, écrire l'infinitif : le type et le participe passé sont proposés.
2. Régulier (`-er`, `-ir` comme *finir*, `-re` comme *rendre*) : tous les temps sont **générés tout seuls**.
3. Irrégulier : choisir « irrégulier », corriger au besoin les cases du tableau (le présent d'abord, puis radical du futur…).
   Chaque case de l'aperçu est modifiable ; les cases changées sont surlignées.
4. Enregistrer : le verbe apparaît aussitôt dans les missions, le mémo et les révisions.

### ☁️ Synchroniser plusieurs appareils (optionnel)

Verbes, réglages et progression se retrouvent sur tous les appareils (Firebase gratuit, sans compte pour les enfants).
Mise en place unique (~5 min) : voir **[SYNC.md](SYNC.md)**. Aurore reçoit un lien « verbes seulement » : ses ajouts arrivent seuls chez l'enfant.
Sans configuration, l'appli marche exactement comme avant (données locales + liens/fichiers).

### Partager avec Aurore (ou n'importe qui) sans synchro

Il n'y a **pas de serveur** : c'est volontaire (simple, gratuit, privé). Les verbes se partagent par lien :

1. Aurore ouvre l'appli (même adresse), ajoute ses verbes dans **Espace parents ➜ Verbes**.
2. **Partager ➜ 🔗 Créer un lien de partage** → elle l'envoie par message.
3. Ouvrir le lien sur l'appareil de l'enfant → « Ajouter N verbes ? » → c'est fait. Une version plus récente d'un même verbe remplace l'ancienne.

Pour beaucoup de verbes : **Exporter / Importer un fichier**.
Pour que des verbes deviennent « officiels » pour tous les appareils : les ajouter dans `data/verbs.json` (format ci-dessous) via GitHub.

## Publier (une fois)

1. Fusionner la branche dans `main`.
2. GitHub ➜ **Settings ➜ Pages ➜ Source : GitHub Actions**. Le workflow `.github/workflows/pages.yml` teste puis publie.
3. Ouvrir l'adresse `https://<utilisateur>.github.io/<dépôt>/` sur l'appareil, puis **« Ajouter à l'écran d'accueil »**
   (iPhone : Safari ➜ Partager ➜ Sur l'écran d'accueil · Android : menu ⋮ ➜ Installer l'application).
   Après la première visite, l'appli marche **hors-ligne**.

### Mettre à jour l'appli sans rien perdre

Les données (joueurs, trophées, objets, pièces, avatar…) sont dans le navigateur de chaque appareil (clé `conju.v1`) : **une mise à jour du code ne les touche jamais**.
Règles qui rendent la mise à jour « incrémentale » :

1. Changer `CACHE` dans `sw.js` (ex. `conjugo-v5`) et y lister tout nouveau fichier : les appareils téléchargent la nouvelle version tout seuls, puis la page se recharge dès qu'on n'est pas en pleine partie (Espace parents ➜ Partager ➜ « Chercher une mise à jour » pour forcer).
2. **Ne jamais supprimer ni renommer** un identifiant existant (trophée, objet de boutique, pièce d'avatar) : on **ajoute** seulement. Les anciens trophées, objets achetés (`p.owned`) et objets portés (`p.equipped`) gardent leur sens.
3. Les nouveaux champs d'un joueur reçoivent une valeur par défaut au chargement (`Store.load`) ; la synchro fusionne par union (trophées, objets) ou « le plus récent gagne » (avatar), donc un appareil pas encore à jour ne fait rien perdre.
4. Pour annoncer des nouveautés : ajouter une entrée dans `NEWS` et augmenter `REWARDS_VERSION` dans `js/rewards.js`. Au prochain lancement, chaque appareil attribue (sans rien retirer) les trophées **déjà mérités** et affiche les nouveautés **une seule fois**.

### Ajouter des récompenses

* **Trophée** : une ligne dans `js/rewards.js` (`series(...)` pour une suite bronze → diamant, ou `add({...})`) ; `val` = la mesure, `goal` = le seuil. Il est attribué automatiquement, même rétroactivement.
* **Objet de boutique (mascotte 2D)** : une ligne dans `shop(...)` du même fichier. Prix en pièces (nombre), `'l12'` = niveau 12, `'b:streak7'` = trophée à gagner.
* **Pièce d'avatar 3D** : une ligne `it('hat', 'id', 'Nom', '🎩', prix, (c, g, P) => { … })` dans `js/avatar-items.js` (accessoires) ou une entrée dans `js/avatar-parts.js` (formes, décors, yeux…). `npm test` construit et dessine **toutes** les pièces pour détecter une erreur.
En local : `npm start` puis http://localhost:8080 (ou n'importe quel serveur statique).

## Format d'un verbe (`data/verbs.json`)

```jsonc
{ "inf": "manger", "type": "er", "pp": "mangé", "emoji": "🍽️" }                       // régulier : tout est généré
{ "inf": "tomber", "type": "er", "aux": "etre", "pp": "tombé" }                        // auxiliaire être
{ "inf": "appeler", "type": "er", "pp": "appelé", "pres": ["appelle","appelles","appelle","appelons","appelez","appellent"], "fut": "appeller" }
{ "inf": "pouvoir", "type": "irr", "pp": "pu", "pres": [ /* 6 formes */ ], "fut": "pourr", "subj": ["puiss","puiss"], "ps": ["p","u"], "noImp": true }
```

| Champ | Rôle |
|---|---|
| `type` | `er` · `ir2` (finir) · `re` (rendre) · `irr` (irrégulier) |
| `aux` | `avoir` (défaut) ou `etre` |
| `pres` | 6 formes du présent (je, tu, il, nous, vous, ils) si différent de la règle |
| `fut` | radical du futur/conditionnel (`ir`, `verr`, `viendr`…) |
| `impStem` | radical de l'imparfait si différent de « nous » − `-ons` (ex. `ét`) |
| `subj` | `[radical je/tu/il/ils, radical nous/vous]` du subjonctif |
| `ps` | passé simple : `[radical, "a"｜"i"｜"u"]` ; ou `psForms` (6 formes) |
| `imp` / `noImp` | impératif `[tu, nous, vous]` / pas d'impératif |
| `forms` | corrections case par case : `{ "subjonctif": ["sois","sois",…] }` |
| `lists`, `emoji`, `def` | listes (missions), icône, sens |

## Le code

Aucune dépendance ni compilation : HTML + CSS + JavaScript.

* `js/conjugate.js` moteur de conjugaison (règles + exceptions) · `js/explain.js` diagnostic des erreurs
* `js/store.js` sauvegarde, profils, répétition espacée, partage, fusion · `js/sync.js` synchro Firestore (REST) · `firestore.rules` règles à publier · `js/fx.js` sons, voix, confettis, mascotte
* `js/rewards.js` trophées, boutique, règles de déblocage · `js/rewards-ui.js` écrans Trophées / Boutique / Avatar, nouveautés après mise à jour
* `js/avatar3d.js` moteur 3D (canvas) · `js/avatar-parts.js` formes, couleurs, visages, décors · `js/avatar-items.js` accessoires
* `js/app.js` écrans et jeu · `js/parent.js` espace parents · `sw.js` mode hors-ligne
* `tests/` : `npm test` vérifie ~150 formes conjuguées, le diagnostic d'erreurs, les indices, la fusion de synchro, la **migration des anciennes données** et le dessin de chaque pièce de l'avatar.

## Idées pour la suite

Verbes pronominaux (se laver), conditionnel/subjonctif passés,
dictée audio, défi à deux, plusieurs classes/élèves pour un enseignant.
