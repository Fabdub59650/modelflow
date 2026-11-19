-- ══════════════════════════════════════════════════════════════
-- ModelFlow — schéma MariaDB (idempotent : rejouable sans perte)
-- Base : modelflow — utilisateur : modelflow
-- ══════════════════════════════════════════════════════════════

-- Paramètres clé/valeur (_version, storage_root, color_mode, …)
CREATE TABLE IF NOT EXISTS `settings` (
  `key_name`   varchar(64)  NOT NULL,
  `value`      text         DEFAULT NULL,
  `updated_at` timestamp    NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modèles 3D du catalogue.
-- Les fichiers (STL, 3MF…) ne sont PAS stockés ici : `folder` est le sous-dossier, relatif à la
-- racine de stockage (Paramètres › Général), où ils sont rangés sur le Mac ou le réseau.
CREATE TABLE IF NOT EXISTS `models` (
  `id`         int(11)      NOT NULL AUTO_INCREMENT,
  `name`       varchar(150) NOT NULL,
  `source`     enum('makerworld','printables','perso','autre') NOT NULL DEFAULT 'autre',
  `source_url` varchar(500) DEFAULT NULL,
  `author`     varchar(150) DEFAULT NULL,
  `folder`     varchar(300) DEFAULT NULL,
  `notes`      text         DEFAULT NULL,
  `status`     enum('catalogue','a_imprimer','imprime') NOT NULL DEFAULT 'catalogue',
  `favorite`   tinyint(1)   NOT NULL DEFAULT 0,
  `created_at` timestamp    NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp    NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_model_status` (`status`),
  KEY `idx_model_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thèmes (plusieurs par modèle). Nom unique sans tenir compte de la casse ni des accents
-- (collation unicode_ci) : « Noel » = « Noël ».
CREATE TABLE IF NOT EXISTS `themes` (
  `id`    int(11)     NOT NULL AUTO_INCREMENT,
  `name`  varchar(40) NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_theme_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `model_themes` (
  `model_id` int(11) NOT NULL,
  `theme_id` int(11) NOT NULL,
  PRIMARY KEY (`model_id`, `theme_id`),
  KEY `idx_mt_theme` (`theme_id`),
  CONSTRAINT `fk_mt_model` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mt_theme` FOREIGN KEY (`theme_id`) REFERENCES `themes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Image d'un modèle (une seule, JPEG réduit par le navigateur). Dans la base : elle suit la sauvegarde.
-- version : change à chaque remplacement (sert d'adresse de cache côté navigateur)
CREATE TABLE IF NOT EXISTS `model_photos` (
  `model_id`   int(11)     NOT NULL,
  `mime`       varchar(30) NOT NULL DEFAULT 'image/jpeg',
  `data`       mediumblob  NOT NULL,
  `version`    int(11)     NOT NULL DEFAULT 1,
  `updated_at` timestamp   NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`model_id`),
  CONSTRAINT `fk_mp_model` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Valeurs par défaut (INSERT IGNORE : une valeur modifiée n'est jamais écrasée)
INSERT IGNORE INTO `settings` (key_name, value) VALUES ('storage_root', '/Volumes/Datas/Impressions 3D/B - Bibliothèque');
