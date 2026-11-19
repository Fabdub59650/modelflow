# Changelog

## v1.0.1 — 19/11/2026

- **Téléphone** : la barre du haut passe sur deux lignes ; le menu « Paramètres » n'est plus tronqué (« PARA… »).

## v1.0.0 — 19/11/2026

Première version : un catalogue de modèles 3D, simple et indépendant de FilaFlow et de PrepFlow.

- **Liste en vignettes** : photo, nom, source, thèmes, statut, étoile de favori ; recherche (nom, thème, auteur, remarques, dossier), filtres par statut (avec compteurs), source, thèmes et favoris, tri (plus récents, nom, favoris d'abord). Les filtres sont mémorisés.
- **Fiche modèle** : nom, source (MakerWorld, Printables, Personnel, Autre), lien source, auteur / licence, dossier de stockage, thèmes, remarques, statut (Catalogué, À imprimer, Imprimé) et favori.
- **Image** : Ctrl+V / ⌘V, glisser-déposer ou fichier ; réduite par le navigateur et stockée dans la base (elle suit la sauvegarde).
- **Dossier de stockage** : les fichiers ne sont pas stockés dans ModelFlow. Chaque fiche retient un sous-dossier, relatif à la racine de stockage (Paramètres › Général ; par défaut `/Volumes/Datas/Impressions 3D/B - Bibliothèque`). Un bouton « Copier le chemin » donne le chemin complet, à coller dans le Finder avec ⌘⇧G. Un chemin collé en entier est ramené au sous-dossier.
- **Avertissement de doublon** quand un lien source existe déjà dans le catalogue (langue, paramètres et « www » ignorés) ; la source est devinée d'après le lien.
- **Thèmes** : plusieurs par modèle, saisie avec autocomplétion, couleur, renommage, fusion et suppression dans Paramètres › Thèmes.
- **Barre d'applis** FilaFlow · PrepFlow · ModelFlow (fichier `frontend/js/apps-nav.js`, identique dans les trois dépôts).
- Mode clair / sombre, mise à jour depuis GitHub (dernier tag `vX.Y.Z`) comme PrepFlow.
