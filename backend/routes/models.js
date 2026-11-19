/**
 * Modèles 3D du catalogue.
 *   GET    /api/models                 tous les modèles (avec thèmes et version de l'image)
 *   GET    /api/models/duplicates      ?url=…&exclude=id : modèles qui ont déjà ce lien source
 *   GET    /api/models/:id             un modèle
 *   POST   /api/models                 créer ({ name, … })
 *   PUT    /api/models/:id             modifier (champs partiels ; `themes` = liste de noms)
 *   DELETE /api/models/:id             supprimer (image et thèmes liés compris)
 * Chaque modèle a un code « M0001 » (déduit de son identifiant, non modifiable). À la création, si le
 * dossier est vide, il prend la forme « M0001 - Nom ».
 * L'image se gère dans routes/photos.js (/api/models/:id/photo).
 *
 * Les fichiers 3D ne sont pas stockés : `folder` est un sous-dossier relatif à la racine de
 * stockage (réglage storage_root). Un chemin collé en entier est ramené au sous-dossier.
 */
const router = require('express').Router();
const db = require('../db');
const { parseThemeNames, themesByModel, setModelThemes } = require('./themes');
const { readSettings } = require('./settings');

const SOURCES  = ['makerworld', 'printables', 'perso', 'autre'];
const STATUSES = ['catalogue', 'a_imprimer', 'imprime'];

const bad = msg => Object.assign(new Error(msg), { status: 400 });
const sendError = (res, e) => res.status(e.status || 500).json({ error: e.message });

// Adresse comparable : sans « www. », sans paramètres ni ancre, sans préfixe de langue (/fr/, /en/), sans « / » final
function normalizeUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?(?=\/)/i, '').replace(/\/+$/, '').toLowerCase();
    return host + path;
  } catch (_) { return null; }
}

// Sous-dossier relatif à la racine : un chemin collé en entier (racine comprise) est raccourci
function relativeFolder(raw, root) {
  let f = String(raw ?? '').trim();
  if (root && (f === root || f.startsWith(root + '/'))) f = f.slice(root.length).replace(/^\/+/, '');
  return f.replace(/\/+$/, '');
}

function text(v, max, label) {
  const s = String(v ?? '').trim();
  if (s.length > max) throw bad(`${label} : ${max} caractères au maximum`);
  return s || null;
}

// Valide les champs reçus ; renvoie { cols: { colonne: valeur }, themes: [noms] | undefined }
async function readBody(body) {
  const b = body || {};
  const cols = {};
  if ('name' in b) {
    const name = String(b.name ?? '').replace(/\s+/g, ' ').trim();
    if (!name) throw bad('Le nom du modèle est obligatoire');
    if (name.length > 150) throw bad('Le nom ne peut pas dépasser 150 caractères');
    cols.name = name;
  }
  if ('source' in b) {
    if (!SOURCES.includes(b.source)) throw bad('Source inconnue');
    cols.source = b.source;
  }
  if ('source_url' in b) {
    const t = String(b.source_url ?? '').trim();
    if (t && !/^https?:\/\/[^\s"'<>]{1,490}$/i.test(t)) throw bad('Le lien source doit commencer par http:// ou https://');
    cols.source_url = t || null;
  }
  if ('author' in b) cols.author = text(b.author, 150, 'Auteur / licence');
  if ('folder' in b) {
    const { storage_root } = await readSettings();
    cols.folder = text(relativeFolder(b.folder, storage_root), 300, 'Dossier');
  }
  if ('notes' in b) cols.notes = text(b.notes, 5000, 'Remarques');
  if ('status' in b) {
    if (!STATUSES.includes(b.status)) throw bad('Statut inconnu');
    cols.status = b.status;
  }
  if ('favorite' in b) cols.favorite = b.favorite ? 1 : 0;
  const themes = 'themes' in b ? parseThemeNames(b.themes) : undefined;
  return { cols, themes };
}

// Code du modèle : « M » + numéro sur 4 chiffres (M0001). Déduit de l'identifiant : stable, jamais réattribué.
const CODE_SQL = "CONCAT('M', LPAD(m.id, 4, '0'))";

// Nom de dossier conseillé : « M0001 - Nom du modèle » (sans caractères interdits dans un nom de dossier)
function suggestedFolder(id, name) {
  const code = 'M' + String(id).padStart(4, '0');
  const clean = String(name || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).trim();
  return clean ? `${code} - ${clean}` : code;
}

const SELECT = `SELECT m.id, ${CODE_SQL} AS code, m.name, m.source, m.source_url, m.author, m.folder, m.notes, m.status, m.favorite,
                       m.created_at, m.updated_at, ph.version AS photo_v
                  FROM models m LEFT JOIN model_photos ph ON ph.model_id = m.id`;

async function withThemes(rows) {
  const map = await themesByModel(rows.map(r => r.id));
  return rows.map(r => ({ ...r, favorite: !!r.favorite, photo_v: r.photo_v || null, themes: map.get(r.id) || [] }));
}

async function fetchOne(id) {
  const [rows] = await db.query(`${SELECT} WHERE m.id = ?`, [id]);
  if (!rows.length) return null;
  return (await withThemes(rows))[0];
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`${SELECT} ORDER BY m.created_at DESC, m.id DESC`);
    res.json(await withThemes(rows));
  } catch (e) { sendError(res, e); }
});

// Avant « /:id » : modèles qui portent déjà ce lien source (hors `exclude`)
router.get('/duplicates', async (req, res) => {
  try {
    const wanted = normalizeUrl(req.query.url || '');
    if (!wanted) return res.json([]);
    const exclude = Number(req.query.exclude) || 0;
    const [rows] = await db.query(
      'SELECT id, name, source_url FROM models WHERE source_url IS NOT NULL AND id <> ?', [exclude]);
    res.json(rows.filter(r => normalizeUrl(r.source_url) === wanted).map(r => ({ id: r.id, name: r.name })));
  } catch (e) { sendError(res, e); }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await fetchOne(req.params.id);
    if (!row) return res.status(404).json({ error: 'Modèle introuvable' });
    res.json(row);
  } catch (e) { sendError(res, e); }
});

router.post('/', async (req, res) => {
  try {
    const { cols, themes } = await readBody(req.body);
    if (!cols.name) throw bad('Le nom du modèle est obligatoire');
    const keys = Object.keys(cols);
    const [r] = await db.query(
      `INSERT INTO models (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      keys.map(k => cols[k]));
    // Dossier non renseigné : « M0001 - Nom » est proposé d'office (le code fait le lien fiche ↔ dossier)
    if (!cols.folder) {
      await db.query('UPDATE models SET folder=? WHERE id=?', [suggestedFolder(r.insertId, cols.name), r.insertId]);
    }
    if (themes && themes.length) await setModelThemes(r.insertId, themes);
    res.status(201).json(await fetchOne(r.insertId));
  } catch (e) { sendError(res, e); }
});

router.put('/:id', async (req, res) => {
  try {
    const exists = await fetchOne(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Modèle introuvable' });
    const { cols, themes } = await readBody(req.body);
    const keys = Object.keys(cols);
    if (keys.length) {
      await db.query(`UPDATE models SET ${keys.map(k => `\`${k}\`=?`).join(', ')} WHERE id=?`,
        [...keys.map(k => cols[k]), req.params.id]);
    }
    if (themes) await setModelThemes(Number(req.params.id), themes);
    res.json(await fetchOne(req.params.id));
  } catch (e) { sendError(res, e); }
});

router.delete('/:id', async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM models WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Modèle introuvable' });
    res.json({ ok: true });
  } catch (e) { sendError(res, e); }
});

module.exports = router;
module.exports.normalizeUrl = normalizeUrl;
module.exports.relativeFolder = relativeFolder;
module.exports.suggestedFolder = suggestedFolder;
