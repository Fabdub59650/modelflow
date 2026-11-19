# ModelFlow

Catalogue de modèles 3D : une liste simple de ce qu'on a trouvé (MakerWorld, Printables…) ou créé,
avec photo, thèmes, lien source et dossier de stockage des fichiers.

ModelFlow est **indépendant** de [FilaFlow](https://github.com/Fabdub59650/filaflow) et de
[PrepFlow](https://github.com/Fabdub59650/prepflow) : il ne lit ni n'écrit rien dans leurs bases.
Il tourne sur le même Pi, avec sa propre base. Un modèle de ModelFlow peut inspirer un projet de PrepFlow,
mais les deux applis ne sont pas reliées.

**Les fichiers 3D (STL, 3MF…) ne sont pas stockés** : chaque fiche retient seulement son sous-dossier,
relatif à la racine de stockage réglée dans Paramètres › Général.

Accès : **https://filaflow.local/modelflow/**

## Fonctionnalités

- Liste en vignettes, recherche, filtres (statut, source, thèmes, favoris), tri
- Fiche : nom, source, lien, auteur / licence, dossier, thèmes, remarques, statut, favori, image (Ctrl+V / glisser / fichier)
- Bouton « Copier le chemin » (racine + sous-dossier) pour retrouver les fichiers dans le Finder (⌘⇧G)
- Avertissement de doublon sur le lien source
- Thèmes colorés (gestion dans Paramètres), mode clair / sombre
- Barre d'applis commune FilaFlow · PrepFlow · ModelFlow

## Architecture

| Élément | Détail |
|---|---|
| Backend | Node.js + Express, port 3002, écoute sur 127.0.0.1 uniquement |
| Base | MariaDB, base `modelflow`, utilisateur `modelflow` (mot de passe généré, dans `.env`) |
| Frontend | Vanilla JS (modules ES), aucune dépendance externe |
| Accès | Nginx de FilaFlow : `include snippets/modelflow.conf;` → `location /modelflow/` |
| Service | systemd `modelflow`, installé dans `/opt/modelflow` |

```
backend/        server.js, db.js, routes/ (models, themes, photos, settings, updater)
frontend/       index.html, css/ (theme.css commun + app.css), js/ (app, views/), fonts/
sql/schema.sql  schéma idempotent (rejoué à chaque mise à jour)
nginx/          bloc location /modelflow/
systemd/        modelflow.service
scripts/        install.sh, patch.sh, nginx_include.py
docs/           RECONSTRUCTION.md
```

Tables : `models`, `themes`, `model_themes`, `model_photos`, `settings`.

## Fichiers communs aux trois applis

- `frontend/css/theme.css` : identique dans FilaFlow, PrepFlow et ModelFlow (polices, palette, rayons).
- `frontend/js/apps-nav.js` : barre d'applis, identique dans les trois dépôts.

Modifier l'un de ces fichiers dans un dépôt = le recopier à l'identique dans les deux autres.
L'accent (violet pour ModelFlow) reste propre à chaque appli.

## Installation

```bash
cd ~
git clone https://github.com/Fabdub59650/modelflow.git
cd modelflow
sudo bash scripts/install.sh
```

Le script : crée la base et l'utilisateur, applique le schéma, copie les fichiers dans `/opt/modelflow`,
installe le service systemd, puis ajoute l'include dans `/etc/nginx/sites-available/filaflow`
(copie de sauvegarde, `nginx -t`, retour arrière si erreur). Il est rejouable : le `.env` et les données sont conservés.

## Mise à jour

```bash
cd ~/modelflow
git pull            # ou git pull <bundle> main
sudo bash scripts/patch.sh
```

Depuis l'interface (Paramètres › Version) : ModelFlow compare sa version au dernier tag `vX.Y.Z` de GitHub
et peut se mettre à jour seul si l'installation n'est pas un dépôt Git et si le dépôt GitHub est public.
Sur le Pi, la mise à jour se fait comme pour PrepFlow : bundle ou `git pull`, puis `patch.sh`.

## Sauvegarde et reconstruction

La base `modelflow` (images comprises) doit être ajoutée à la sauvegarde NAS de FilaFlow, comme `prepflow`.
Procédure de reconstruction : [docs/RECONSTRUCTION.md](docs/RECONSTRUCTION.md).
