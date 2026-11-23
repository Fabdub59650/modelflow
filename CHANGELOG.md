# Changelog

## v1.5.0 — 23/11/2026

- **Mode liste** en plus des vignettes : un bouton Vignettes / Liste à côté du tri (choix mémorisé). Une ligne par modèle : favori, miniature, code, nom, statut, pièces, dimensions, note, thèmes, source et icônes lien / copier le chemin. Un clic sur la ligne ouvre la fiche. La recherche, les filtres et le tri sont communs aux deux modes. Sur téléphone, les colonnes secondaires sont masquées.
- **Entête fixe** : la ligne « Modèles » avec le bouton « Nouveau modèle » reste visible sous la barre du haut quand on descend dans la liste (y compris sur téléphone, où la barre fait deux lignes).
- **Thèmes de la fiche** : la liste de suggestions du navigateur, qui pouvait ignorer le choix, est remplacée par une liste intégrée. Elle s'ouvre dès qu'on touche le champ, se filtre à la frappe, un clic ajoute le thème immédiatement ; flèches + Entrée au clavier, Échap referme la liste sans fermer la fiche.

## v1.4.0 — 23/11/2026

- **Pièces** : nombre de pièces du modèle (1 à 9999, facultatif). La carte affiche « 12 pièces » seulement au-dessus de 1.
- **Dimensions** : longueur × largeur × hauteur en mm (virgule ou point). Les trois valeurs ensemble, ou aucune. Visibles dans la fiche.
- **Note** : de 1 à 5 étoiles dans la fiche (un second clic sur l'étoile choisie efface la note). La carte affiche « 4/5 ». Nouveau tri « Mieux notés ».
- Base de données : cinq colonnes facultatives ajoutées à `models` (ajoutées automatiquement par `patch.sh`, sans perte). Aucune autre application n'est concernée.

## v1.3.0 — 19/11/2026

- **Même nom, même couleur** : à l'ouverture de la liste, un thème sans couleur adopte celle du thème PrepFlow de même nom (casse et accents ignorés). Lecture seule côté PrepFlow ; une couleur déjà choisie n'est jamais modifiée. Sans effet si PrepFlow ne répond pas.
- Aucun changement de base de données. Fonctionne avec PrepFlow 1.47.0 (suggestions de thèmes et bouton « Reprendre les thèmes »).

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
