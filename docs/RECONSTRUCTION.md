# Reconstruire ModelFlow

ModelFlow est une petite appli : tout ce qui compte est dans la base `modelflow` (fiches, thèmes, images).
Les fichiers 3D eux-mêmes ne sont pas dans ModelFlow : ils sont dans le dossier de stockage (Mac ou NAS).

## 1. Récupérer

- Le code : `git clone https://github.com/Fabdub59650/modelflow.git ~/modelflow`
- La base : la dernière sauvegarde NAS de FilaFlow qui contient `modelflow` (dump SQL compressé).

## 2. Installer

Le Pi doit déjà faire tourner FilaFlow (Node.js 18+, MariaDB, Nginx).

```bash
cd ~/modelflow
sudo bash scripts/install.sh
```

## 3. Restaurer les données

```bash
# Remplacer par le chemin du dump extrait de la sauvegarde
sudo mariadb --default-character-set=utf8mb4 modelflow < modelflow.sql
sudo systemctl restart modelflow
```

## 4. Vérifier

- `https://filaflow.local/modelflow/` affiche la liste des modèles avec leurs images.
- Paramètres › Général : la racine de stockage est la bonne (elle est dans la base, donc restaurée).
- `sudo journalctl -u modelflow -n 30` : pas d'erreur.
