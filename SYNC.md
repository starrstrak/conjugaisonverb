# ☁️ Synchronisation entre appareils (Firebase, gratuit)

Ce que ça synchronise : les **verbes ajoutés** (par exemple par Aurore), les **réglages** et la **progression des enfants**.
Ça marche aussi hors-ligne : chaque appareil garde ses données et fusionne quand internet est là.

## 1. Créer la base (une seule fois, ~5 minutes)

1. Aller sur https://console.firebase.google.com avec un compte Google ➜ **Ajouter un projet** (nom libre, ex. `conjugo`). Désactiver Google Analytics.
2. **Build ➜ Firestore Database ➜ Créer une base de données** : mode **production**, région `eur3` (Europe) ou `europe-west6` (Zurich).
3. Onglet **Règles** : remplacer tout par le contenu du fichier [`firestore.rules`](firestore.rules) puis **Publier**.
4. **Paramètres du projet (⚙️) ➜ Vos applications ➜ `</>` (Web)** : donner un nom, **Enregistrer**. Copier le bloc `const firebaseConfig = { … }` affiché.
   (Ces clés « web » ne sont pas secrètes : c'est normal qu'elles soient dans l'appli. La protection vient des règles.)

## 2. Activer dans l'appli

1. Sur un appareil : 🔒 ➜ **Partager ➜ Synchroniser plusieurs appareils** ➜ coller le bloc ➜ **Activer la synchro**.
2. Toujours dans cet écran, deux liens :
   * **Pour un enfant** (verbes + joueurs) : à ouvrir sur la tablette/le téléphone de l'enfant.
   * **Pour Aurore** (verbes seulement) : elle ajoute des verbes, ils arrivent chez l'enfant tout seuls.
3. Ouvrir le lien sur l'autre appareil ➜ « Rejoindre ✔ ». Terminé : une icône ☁️ apparaît en haut.

> Pour retrouver un enfant déjà créé sur le 1er appareil : rejoindre la synchro **avant** de le recréer sur le 2e.

## Sécurité et vie privée

* Aucun compte : un **code famille** de 24 caractères aléatoires (dans les liens de synchro) sert de clé. Qui a le lien a accès aux données de la famille : ne l'envoyer qu'à des personnes de confiance.
* Les règles interdisent de lister ou d'effacer, et limitent la taille des documents.
* Données envoyées : prénoms des joueurs, progression, verbes ajoutés, réglages. Rien d'autre (pas de publicité, pas d'analytics).
* Pour tout supprimer : supprimer le projet Firebase (ou les documents `families/…` dans la console).

## Fonctionnement (pour les curieux)

* API REST de Firestore, sans bibliothèque : 1 document `verbs`, `settings`, `meta` et un `p_<joueur>` par enfant.
* **Fusion** sans perte : verbes = l'événement le plus récent gagne (ajout, modification, suppression) ; progression = meilleure valeur (XP, étoiles, trophées), cartes de révision les plus récentes, historiques réunis.
* Déclenchée au retour sur l'appli, quand internet revient et ~5 s après chaque enregistrement.
