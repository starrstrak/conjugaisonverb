# 🐉 Conjugo – la conjugaison en s'amusant

Appli web pour apprendre les verbes (enfants de 8-9 ans). **Fonctionne sans internet**, s'installe sur
l'écran d'accueil (téléphone, tablette, ordinateur), sans compte, sans publicité, sans collecte de données :
tout reste sur l'appareil.

## Ce que fait l'appli

**Méthode** : petites parties de 10 questions, correction immédiate, répétition espacée.

| Idée | Comment c'est fait |
|---|---|
| Jouer, pas réviser | Mascotte **Conjugo** qui grandit (œuf → dragon), XP, niveaux, pièces, boutique de chapeaux/lunettes/décors, 17 trophées, flamme des jours d'affilée, coffre du jour |
| Facile → difficile | Au début on **choisit** parmi 4 propositions ; quand le verbe est mieux connu, on **écrit** (clavier d'accents fourni) |
| Les erreurs enseignent | Chaque erreur est **expliquée** : mauvaise personne, mauvais temps, terminaison, `ge`/`ç`, accents, auxiliaire, participe passé, accord… avec le rappel du cours. La question revient 2 questions plus tard. « Mes erreurs » regroupe ce qui reste fragile |
| Se souvenir longtemps | Répétition espacée (boîtes de Leitner : 0 / 1 / 3 / 7 / 21 jours) par verbe × temps × personne. « Jouer » = la révision du jour |
| Comprendre | Frise passé / présent / futur, mot-repère (« Hier », « Demain »…), terminaisons colorées, mini-leçon par temps, **Mémo** avec tous les tableaux |
| Variété | Aventure (mondes = temps, missions = familles de verbes, 3 étoiles), Défi chrono 60 s, « Je choisis » (temps + verbes), questions « Quel pronom ? » et « Quel temps ? » |
| Indice | 💡 donne la terminaison et le début du mot (moins d'XP) |
| Confort | Sons, lecture à voix haute (voix française de l'appareil), police plus grande/espacée (dys), pas de vies, pas de chrono punitif (sauf mode chrono, en pause pendant les explications) |

**Temps** : présent, futur simple, imparfait, passé composé, impératif (de base) · conditionnel, plus-que-parfait,
subjonctif présent, passé simple, futur antérieur (bonus, débloqués avec 12 ⭐ ou activés par un parent).
**67 verbes** fournis (être, avoir, aller, faire… verbes en -er, -ir, -re).

## Espace parents / enseignants (🔒 en haut à droite)

Accès protégé par un petit calcul. On y trouve :

* **Verbes** : ajouter, modifier, supprimer/masquer un verbe, créer des **listes** (« Verbes de la semaine »…) qui deviennent des missions et peuvent être mises en avant sur l'accueil.
* **Progrès** : réussite, temps acquis, verbes à retravailler, types d'erreurs fréquentes, dernières erreurs.
* **Réglages** : objectif du jour, longueur des parties, choix/écriture, temps disponibles, sons, police.
* **Partager** : lien de partage de verbes, export/import de fichier, sauvegarde complète.

### Ajouter un verbe (sans toucher au code)

1. **Verbes ➜ ➕ Ajouter**, écrire l'infinitif : le type et le participe passé sont proposés.
2. Régulier (`-er`, `-ir` comme *finir*, `-re` comme *rendre*) : tous les temps sont **générés tout seuls**.
3. Irrégulier : choisir « irrégulier », corriger au besoin les cases du tableau (le présent d'abord, puis radical du futur…).
   Chaque case de l'aperçu est modifiable ; les cases changées sont surlignées.
4. Enregistrer : le verbe apparaît aussitôt dans les missions, le mémo et les révisions.

### Partager avec Aurore (ou n'importe qui)

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

Mettre à jour l'appli : modifier un fichier puis changer `CACHE` dans `sw.js` (ex. `conjugo-v2`) pour que les appareils rechargent.
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
* `js/store.js` sauvegarde, profils, répétition espacée, partage · `js/fx.js` sons, voix, confettis, mascotte
* `js/app.js` écrans et jeu · `js/parent.js` espace parents · `sw.js` mode hors-ligne
* `tests/` : `npm test` vérifie ~150 formes conjuguées et le diagnostic d'erreurs.

## Idées pour la suite

Synchronisation en ligne des verbes entre appareils (petit service gratuit), verbes pronominaux (se laver), conditionnel/subjonctif passés,
dictée audio, défi à deux, plusieurs classes/élèves pour un enseignant.
