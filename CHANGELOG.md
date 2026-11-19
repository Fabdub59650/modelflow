# Changelog

## v1.2.0 — 19/11/2026

- **Projets PrepFlow** : la fiche d'un modèle liste les projets PrepFlow qui s'appuient sur lui (code, nom, statut, lien vers le projet). Lecture seule ; rien ne s'affiche si PrepFlow ne répond pas.
- **Créer un projet PrepFlow** : nouveau bouton sur la fiche (modèle existant). PrepFlow crée un projet lié au modèle, avec son nom, son lien source, son image et ses thèmes.
- **Lien direct** `#/modele/12` : ouvre la liste avec la fiche du modèle 12 (utilisé par PrepFlow).
- Aucun changement de base de données. Fonctionne avec PrepFlow 1.46.0 ou plus.

## v1.1.0 — 19/11/2026

- **Code du modèle** : chaque fiche porte un code `M0001`, `M0002`… attribué automatiquement, non modifiable, jamais réutilisé. Il s'affiche sur la vignette et en haut de la fiche (bouton « Copier »).
- **Dossier de stockage** : à la création, si le dossier est laissé vide, il est proposé sous la forme `M0001 - Nom du modèle` (caractères interdits retirés). Sur une fiche existante, le lien « Nom conseillé » remplit le champ de la même façon. Le chemin complet reste calculé à partir de la racine de stockage.
- **Recherche par code** : `M0012`, `m12` ou simplement `12` retrouvent le modèle ; le code est aussi cherché dans le texte des fiches.

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
