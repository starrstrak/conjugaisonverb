# Mémoire du schéma de Conjugo (version 1.4 · récompenses v4)

But : décrire **exactement** comment l'appli est construite (données, récompenses, boutique, avatar 3D, mise à jour, synchro) pour pouvoir reprendre ce schéma dans une autre appli.
Tout est du JavaScript sans dépendance ni compilation ; les modules sont des « UMD » (utilisables dans le navigateur **et** sous Node pour les tests).

---

## 1. Vue d'ensemble

```
index.html ── charge dans l'ordre ──► conjugate.js  explain.js  store.js  fx.js  sync.js
                                      avatar3d.js  avatar-parts.js  avatar-unlocks.js  avatar-items.js  rewards.js
                                      app.js  rewards-ui.js  parent.js  main.js
```

| Couche | Fichier | Rôle | Dépend de |
|---|---|---|---|
| Données | `store.js` | sauvegarde locale, profils, répétition espacée, fusion | `conjugate.js` |
| Règles | `rewards.js` | trophées, boutique, déblocage, prix, nouveautés | `conjugate.js` (liste des temps), `avatar-parts.js` |
| Catalogue 3D | `avatar-parts.js` (formes, couleurs, visages, décors) · `avatar-items.js` (accessoires) · `avatar-unlocks.js` (table de déblocage figée) | « quoi » : les pièces et leurs règles | rien (items → parts, unlocks) |
| Moteur 3D | `avatar3d.js` | « comment » : maths, éclairage, rendu canvas, animation | rien |
| Interface | `app.js` (jeu), `rewards-ui.js` (trophées/boutique/avatar), `parent.js` (réglages) | écrans | tout |
| Synchro | `sync.js` | Firestore REST, fusion | `store.js` |
| Hors-ligne | `sw.js` | cache + mise à jour | — |

Principe directeur : **séparer les règles (rewards.js) du catalogue (avatar-*.js) et de l'écran (rewards-ui.js)**. Pour porter le système, on reprend `rewards.js` + le catalogue ; l'écran se réécrit selon l'appli cible.

---

## 2. Données persistantes

Une seule clé `localStorage` : `conju.v1` (JSON). Rien n'est jamais supprimé par une mise à jour de code.

### 2.1 Racine (`data`)

```jsonc
{
  "v": 1,                       // version du FORMAT (inchangée ; les nouveautés = nouveaux champs avec valeur par défaut)
  "settings": { "ex": { "types":{"choice":true,"type":true,"pronoun":true,"tense":true}, "recog":14, "persons":{"0":true,"…":true,"5":true}, "families":{"aux":true,"er":true,"ir2":true,"re":true,"irr":true}, "modes":{"review":true,"adventure":true,"chrono":true,"practice":true,"errors":true}, "hints":true, "hintMax":3, "retry":true, "chronoSecs":60 },  // réglages d'exercices (store.exOf() complète/borne ; exProblem() refuse les combinaisons impossibles)
                "sound": true, "speech": true, "easyFont": false, "dailyGoal": 20, "inputMode": "auto",
                "tenses": { "<idTemps>": true|false }, "unlockAll": false, "autoUnlock": true, "sessionLength": 10, "featuredList": "" },
  "profiles": [ /* joueurs, voir 2.2 */ ],
  "current": "<id joueur actif>",
  "customVerbs": [], "hiddenBase": [], "verbMeta": { "tomb": {}, "hid": {} },   // verbes ajoutés/masqués (synchronisés)
  "author": "", "settingsT": 0,  // horodatage des réglages synchronisables
  "delP": { "<idJoueur>": <date suppression> },  // joueurs supprimés (synchro)
  "sync": null | { "pid": "", "key": "", "fid": "", "scope": "all|verbs", "last": 0 },
  "seenVer": 4                  // dernière version de récompenses dont les « Nouveautés » ont été montrées (LOCAL à l'appareil)
}
```

### 2.2 Joueur (`profile`)

```jsonc
{
  "id": "p<base36>", "name": "Léo" /* ≤20 car. */, "color": "#7bd88f",   // couleur de la mascotte
  "xp": 0, "coins": 0,
  "streak": { "count": 0, "last": "YYYY-MM-DD" },
  "daily":  { "date": "YYYY-MM-DD", "count": 0, "chest": false },        // objectif du jour + coffre
  "cards":  { "<verbe>|<temps>|<personne>": { "b": 0-4, "d": "date prochaine révision", "c": bonnes, "w": fautes, "u": horodatage, "fix": n } },
  "stars":  { "<temps>|<mission>": 0-3 },
  "badges": { "<idTrophée>": <horodatage d'obtention> },                  // trophées gagnés
  "owned":  [ "skin:#hex", "hat:🎩", "pet:🐥", "av:<slot>:<id>" ],         // TOUT ce qui est acheté (boutique + avatar)
  "equipped": { "hat": "", "glasses": "", "theme": "", "neck": "", "pet": "" },  // mascotte 2D : une valeur par catégorie
  "avatar": null | { /* configuration 3D, voir 5.1, + "t": horodatage de dernière modif */ },
  "stats":  { "sessions":0, "correct":0, "wrong":0, "bestCombo":0, "perfect":0, "chronoBest":0, "fixed":0,
              "hints":0, "days":0, "bestStreak":0, "chests":0, "chronos":0,
              "early":0, "weekend":0, "monday":0, "wednesday":0, "comeback":0, "noHint":0, "fast":0, "long":0, "rebound":0, "prevErr":0,
              "avatarSaves":0, "photos":0, "outfits":0, "boops":0 },
  "errKinds": {}, "errLog": [], "history": [],                            // suivi pédagogique
  "created": 0, "t": 0                                                    // t = dernière modification (sert à la fusion)
}
```

Règles de format :
- **Un identifiant ne change jamais** (trophée, objet, pièce). On ajoute seulement.
- Tout champ ajouté a une **valeur par défaut au chargement** (`Object.assign(newProfile(), saved)`), sinon un ancien enregistrement casse.
- `stats` : uniquement des **nombres** (la fusion de synchro prend le max clé par clé).
- Formules : niveau `floor(sqrt(xp/50)) + 1` · XP du niveau n `50·(n−1)²` · stade de la mascotte : niveau <3 → 0 (œuf), <6 → 1, <10 → 2, sinon 3.

---

## 3. Trophées (`rewards.js`)

### 3.1 Définition d'un trophée

```js
{ id, cat, name, emoji, desc, goal, val: (profil, ctx) => nombre, tier: 1..4, secret: bool, meta: bool }
```
- Obtenu quand `val(p, ctx) >= goal`. **La progression affichée** = `val / goal`.
- `tier` : 1 bronze, 2 argent, 3 or, 4 diamant → pièces offertes `[10, 20, 35, 60]`.
- `secret` : nom et description cachés (« Surprise ! ») tant que non gagné.
- `meta` : compte les autres trophées (collection), calculé en dernier.
- 15 catégories : `play acc combo perfect streak lvl stars master tense family chrono fix style fun meta`.

### 3.2 Fabrique en série

```js
series(cat, val, [[goal, id, name, emoji, desc], …], { tier?, secret?, meta? })
```
Le palier (tier) découle de la position dans la série (`1 + floor(i*4/n)`), sauf si `tier` est imposé. 201 trophées au total :
parties, bonnes réponses, combos, parties parfaites, série de jours, jours joués, coffres, niveaux, étoiles, maîtrise, temps explorés,
**un par temps × 4 paliers** (10/50/150/300), **un par famille de verbes × 4 paliers** (25/100/300/600), chrono, erreurs corrigées, style (objets, formes d'avatar, photos, tenues, câlins), surprises, collection.

### 3.3 Contexte et attribution

`context(p, deps)` calcule les mesures : `level, stars, mastered, byTense{}, byType{}, verbsSeen, tensesTried, owned, forms, badgeCount`.
`deps` = fonctions fournies par l'appli (`levelOf, typeOf(verbe), starsTotal, masteredCount, formsUnlocked`) → **seul point d'adaptation métier**.

`award(p, ctx, now)` : parcourt tous les trophées non gagnés, écrit `p.badges[id] = now`, recommence jusqu'à 3 passes (pour les trophées « collection »). Retourne `{ list, coins }` ; **l'appelant ajoute les pièces**. Idempotent, rétroactif (rattrape ce qui était déjà mérité).

Suivi des statistiques (dans `finishSession`) : `chronos, days, bestStreak, early(<8h), weekend, monday, wednesday, comeback(>7 j d'absence), noHint, fast, long(≥20 q.), rebound, chests`.

---

## 4. Boutique de la mascotte 2D et règles de déblocage

### 4.1 Verrou (`lock`) — une seule notation pour tout

| Valeur | Sens |
|---|---|
| `0` / absent | gratuit |
| nombre `N` | s'achète `N` pièces |
| `'l12'` | offert au niveau 12 |
| `'b:streak7'` | offert avec le trophée `streak7` |

```js
parseLock(l) → { t:'free'|'coins'|'lvl'|'badge', n?, id? }
usable(p, ctx, lock, ownedId)   // true si : gratuit, OU p.owned contient ownedId, OU niveau atteint, OU trophée gagné
lockText(lock) / lockHelp(lock) // textes pour l'interface
```

### 4.2 Objets 2D

`SHOP = [{ id: '<kind>:<valeur>', kind, val, name, lock, price, emoji }]` avec `kind` ∈ `hat glasses neck pet theme` + les couleurs (`skin:#hex`, liste `SKINS = [[hex, lock]]`).
- Porter = `p.equipped[kind] = val` (retoucher l'objet porté l'enlève ; `kind:` vide = « aucun »).
- Acheter = `p.coins -= prix ; p.owned.push(id)` ; ce qui est acheté reste à vie (`owned` est une **union** à la fusion).
- Les décors (`theme`) correspondent à `body[data-theme="<val>"]` en CSS.

---

## 5. Avatar 3D

### 5.1 Configuration d'un avatar (`profile.avatar`)

```jsonc
{ "form": "auto" | "<idForme>",           // auto = forme selon le niveau (œuf/bébé/jeune/dragon)
  "col": { "body": "", "belly": "", "accent": "" },   // "" = auto, sinon "#hex" ou "rainbow"
  "eye": "#2b2d42",                        // couleur des pupilles
  "fin": "auto|matte|soft|shiny|metal|jelly|ghost|glow|glass",   // matière
  "pat": "none|spots|stripes|stars|sparkles|freckles",           // motif
  "eyes": "round|…", "mouth": "smile|…",
  "hat": "", "glasses": "", "neck": "", "back": "", "hand": "", "feet": "", "aura": "",   // "" = rien
  "scene": "sky|…", "pose": "idle|…",
  "outfits": [null|{…copie des champs ci-dessus sauf outfits/home…} ×3],   // 3 tenues
  "home": false,                           // afficher l'avatar 3D sur l'accueil
  "t": 0 }                                 // horodatage (fusion : le plus récent gagne)
```
`sanitize(cfg)` rend **toujours** une configuration complète et valide (identifiants inconnus → valeur par défaut) : indispensable après une synchro ou une ancienne version.
`clampAvatar(p, ctx, cfg)` retire tout ce que le joueur n'a pas le droit de porter.

### 5.2 Une pièce du catalogue

```js
{ id, name, emoji, lock, price, b?: (c, g, P, res) => { … dessine … }, sc?, pv?, rw? }
```
- `lock` : notation 4.1 (gratuit / niveau / trophée). **`price`** : prix en pièces (**tout ce qui n'est pas gratuit est achetable** ; niveau/trophée = gratuit).
- Prix : prix d'origine si l'objet était en pièces ; sinon dérivé du verrou (`l{n}` → `round((20+7n)/5)*5`, trophée → 90).
- `b` : fonction de dessin 3D (accessoires). `sc`/`pv` : agrandissement autour d'un point (chapeaux ×1.3, objets en main ×1.45). `rw:1` : remplace les ailes de la forme.
- Identifiant d'appartenance : `av:<slot>:<id>` (stocké dans `p.owned`).
- Catalogue (`Parts.ITEMS`) : `form`(40) `color`(25) `eyeColor`(8) `eyes`(11) `mouth`(8) `pat`(6) `fin`(9) `pose`(9) `scene`(16) `hat`(35) `glasses`(17) `neck`(14) `back`(15) `hand`(17) `feet`(10) `aura`(14).

### 5.3 Forme (transformation)

```js
F(id, name, emoji, lock, { stage?, body:[rx,ry,rz], arms, feet, noBelly, egg,
                           wings: 'none|baby|dragon|bat|angel|fairy|leaf|fire|mech|jet',
                           horns: 'none|nub|horns_s|horns|devil|catears|bunny|bear|antenna|antlers|unicorn|sprout',
                           tail:  'none|dragon|dragon_s|cat|fluffy|flame|arrow|robot|dino|stinger|wisp|fish',
                           spikes:'none|back|back_s|plates|crystal|fins',
                           fin?: matière par défaut, pal?: {body, belly, accent}, extra?: (c, g, P) => dessin spécifique })
```
Une forme = **des paramètres** (+ éventuellement une fonction `extra`) : créer une forme revient à combiner des briques existantes. Les formes « de stade » (`stage` 0-3) prennent la couleur de la mascotte ; les autres ont leur palette.

### 5.4 Règles de déblocage figées (`avatar-unlocks.js`)

Table `{ 'slot:id': 'lN' | 'b:trophée' }` appliquée au chargement par `avatar-items.js`. **On n'y change jamais une ligne existante** (sinon un joueur pourrait perdre ce qu'il porte) ; on ajoute seulement. Départ gratuit : œuf, 4 yeux, 4 bouches, 12 couleurs, 5 poses, décor « ciel », motif « uni », matières « auto/mate ».

### 5.5 Moteur 3D (`avatar3d.js`) — API

```js
makeBuilder(quality)            // pinceau : E(ellipsoïde) C(cône) Y(cylindre) F(tronc) B(boîte) T(tore, anneau elliptique) S(étoile) beads(perles)
                                //   options : { j: articulation, rot:[x,y,z], m: matière, det: finesse, an: (t,ph)=>[dx,dy,dz], rb: arc-en-ciel }
build(cfg, Parts, { stage, color, quality }) → scène { prims, bg, piv, … }
render(ctx2d, scène, { w, h, yaw, pitch, zoom, t, pose })     // une image
still(canvas, scène, opts)                                     // image fixe (vignette, photo)
mount(élément, cfg, Parts, { size, opts, onBoop }) → { update(cfg), setPose(p), shot(cb), stop(), state }   // canvas animé interactif
```
Rendu : formes → sommets → articulations (`root, armL, armR, wingL, wingR, tail, eyes, aura, scene`) → vue → perspective ; polygones éclairés (lambert + reflet selon la matière) triés du fond vers l'avant (algorithme du peintre), contour de même couleur pour masquer les jointures. Matières : `matte soft shiny metal glow jelly ghost glass`. ≈30 images/s, définition réduite automatiquement si l'appareil est lent, respecte « réduire les animations ». Interaction : glisser (rotation), pincer/molette (zoom), toucher (saut), double-tap (réinitialiser).
Poses : `idle wave cheer think sleep jump dance hero spin` (fonctions du temps → rotations d'articulations).

---

## 6. Mise à jour « incrémentale » (ne rien effacer)

1. **Aucun identifiant n'est supprimé/renommé** ; on ajoute (trophées, objets, pièces, formes, décors).
2. Champs de profil nouveaux = valeur par défaut au chargement (`newProfile` + `Object.assign`) ; sous-objets (`equipped`) complétés clé par clé.
3. `REWARDS_VERSION` (dans `rewards.js`) + entrée dans `NEWS` : au **premier lancement** sur chaque appareil (`data.seenVer < REWARDS_VERSION`) → `award()` pour **tous les profils** (rattrapage + pièces offertes) puis fenêtre « Nouveautés » **une seule fois** ; `seenVer` met à jour.
4. Service worker `sw.js` : changer `CACHE` (ex. `conjugo-v7`) et lister les nouveaux fichiers ⇒ téléchargement automatique ; `controllerchange` ⇒ rechargement dès qu'on n'est pas en pleine partie (bouton « Chercher une mise à jour » dans l'espace parents).
5. Les tests (`npm test`) vérifient : relecture d'anciennes données, anciens trophées/objets toujours présents (noms, prix), identifiants uniques, verrous valides, chaque pièce se construit et se dessine, fusion de synchro.

---

## 7. Fusion de synchro (`store.mergeProfile`)

Appliquée entre deux versions d'un même joueur (Firestore, un document `p_<id>` par joueur) ; **commutative et idempotente** :

| Champ | Règle |
|---|---|
| nom, couleur, pièces, objets portés | version la plus récente (`t`) ; `equipped` complété clé par clé avec l'autre |
| `xp`, `stats.*`, `stars.*`, `errKinds.*` | maximum |
| `badges` | union ; date la plus ancienne |
| `owned` | union (un achat n'est jamais perdu) |
| `cards` | carte la plus récente ; compteurs `c`/`w` au max |
| `streak`, `daily` | le plus récent / le plus grand |
| `history`, `errLog` | union triée, tronquée |
| `avatar` | celui dont `avatar.t` est le plus grand (égalité : ordre stable) ; une ancienne version de l'appli sans avatar n'écrase pas |

---

## 8. Checklist pour importer ce schéma dans une autre appli

1. **Reprendre** `rewards.js` (trophées, `series`, `award`, `usable`, `parseLock`, `SHOP`, `NEWS`) et, si besoin, `avatar3d.js` + `avatar-parts.js` + `avatar-items.js` + `avatar-unlocks.js` (moteur et catalogue de l'avatar).
2. **Adapter le métier** : remplacer les mesures de `context()` (`byTense`, `byType`, `mastered`…) par celles de l'autre appli ; réécrire les `series(...)` correspondantes ; garder `stats` numériques.
3. **Profil** : ajouter à votre modèle `coins, xp, badges{}, owned[], equipped{}, avatar, stats{}` (+ `t` pour la fusion) ; donner une valeur par défaut à chaque champ au chargement.
4. **Brancher les événements** : après chaque action (fin de partie, achat, photo…) incrémenter les `stats` utiles puis appeler `award()` ; ajouter les pièces retournées ; afficher les nouveaux trophées.
5. **Boutique/avatar** : réutiliser la notation `lock`/`price` ; vérifier `usable()` avant d'équiper, `canBuy()` avant d'acheter ; stocker les achats dans `owned` (`av:<slot>:<id>` pour l'avatar).
6. **Version** : définir `REWARDS_VERSION`, `seenVer`, la fenêtre « Nouveautés » et le rattrapage (`award` sur tous les profils).
7. **Tests** : reprendre `tests/rewards.test.js` (migration, intégrité, rendu de chaque pièce avec un faux contexte canvas).
8. **Ne jamais** modifier/supprimer un identifiant publié ; toute évolution = ajout.

## 9. Où trouver quoi (code)

| Besoin | Fichier / repère |
|---|---|
| Ajouter un trophée | `js/rewards.js` → `series(...)` / `add({...})` |
| Ajouter un objet 2D | `js/rewards.js` → `shop(kind, [[val, nom, lock, emoji]])` |
| Ajouter un accessoire 3D | `js/avatar-items.js` → `it(slot, id, nom, emoji, prix\|'lN'\|'b:id', (c, g, P) => {…})` |
| Ajouter une forme / un décor / un visage | `js/avatar-parts.js` → `FORMS`, `SCENES`, `EYES`, `MOUTHS`, … |
| Fixer le déblocage d'une pièce | `js/avatar-unlocks.js` (ajouter seulement) |
| Écrans (trophées, boutique, studio d'avatar) | `js/rewards-ui.js` |
| Fusion de synchro, valeurs par défaut | `js/store.js` (`newProfile`, `load`, `mergeProfile`) |
| Cache hors-ligne / version | `sw.js` (`CACHE`) · `js/rewards.js` (`APP_VERSION`, `REWARDS_VERSION`) |
