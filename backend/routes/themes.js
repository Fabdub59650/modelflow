/**
 * Thèmes de modèles (Noël, Halloween, Statuettes…) : plusieurs thèmes possibles par modèle.
 *   GET /api/themes                liste des thèmes avec le nombre de modèles (pour l'autocomplétion)
 *   PUT /api/themes/:id            renommer et/ou changer la couleur ({ name?, color? })
 *   POST /api/themes/:id/merge     fusionner dans un autre thème ({ into })
 *   POST /api/themes/cleanup       supprimer les thèmes qui ne servent à aucun modèle
 *   DELETE /api/themes/:id         supprimer un thème (les modèles sont conservés)
 * Les thèmes d'un modèle se lisent et s'écrivent via /api/models (champ `themes`).
 *
 * Le nom est unique sans tenir compte des majuscules ni des accents (collation
 * utf8mb4_unicode_ci) : « Noel » et « Noël » désignent le même thème, dont la première
 * graphie saisie est conservée.
 */
const router = require('express').Router();
const db = require('../db');

// Palette de l'interface (les teintes elles-mêmes sont définies dans le CSS, en clair et en sombre)
const COLORS = ['rouge', 'orange', 'jaune', 'vert', 'turquoise', 'bleu', 'violet', 'rose', 'gris'];

const MAX_NAME = 40;
const MAX_PER_MODEL = 20;

function cleanName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name) throw Object.assign(new Error('Le nom du thème est obligatoire'), { status: 400 });
  if (name.length > MAX_NAME) {
    throw Object.assign(new Error(`Un thème ne peut pas dépasser ${MAX_NAME} caractères`), { status: 400 });
  }
  return name;
}

// Nettoie la liste reçue : texte, espaces simplifiés, doublons (à la casse et aux accents près) retirés.
// Renvoie un tableau de noms, ou lance une Error 400 si la saisie est invalide.
function parseThemeNames(input) {
  if (!Array.isArray(input)) throw Object.assign(new Error('Les thèmes doivent être une liste'), { status: 400 });
  const collator = new Intl.Collator('fr', { sensitivity: 'base' });
  const out = [];
  for (const raw of input) {
    const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    if (name.length > MAX_NAME) {
      throw Object.assign(new Error(`Un thème ne peut pas dépasser ${MAX_NAME} caractères`), { status: 400 });
    }
    if (!out.some(n => collator.compare(n, name) === 0)) out.push(name);
  }
  if (out.length > MAX_PER_MODEL) {
    throw Object.assign(new Error(`Un modèle ne peut pas avoir plus de ${MAX_PER_MODEL} thèmes`), { status: 400 });
  }
  return out;
}

// Thèmes de plusieurs modèles : Map model_id → [{ id, name, color }] triés par nom
async function themesByModel(modelIds) {
  const map = new Map();
  if (!modelIds.length) return map;
  const [rows] = await db.query(
    `SELECT mt.model_id, t.id, t.name, t.color
       FROM model_themes mt JOIN themes t ON t.id = mt.theme_id
      WHERE mt.model_id IN (?)
      ORDER BY t.name`, [modelIds]);
  for (const r of rows) {
    if (!map.has(r.model_id)) map.set(r.model_id, []);
    map.get(r.model_id).push({ id: r.id, name: r.name, color: r.color });
  }
  return map;
}

// Remplace les thèmes d'un modèle par la liste donnée (les thèmes inconnus sont créés).
// Un thème qui n'a plus de modèle est conservé (avec sa couleur) : il se supprime depuis
// Paramètres › Thèmes.
async function setModelThemes(modelId, names) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const ids = [];
    for (const name of names) {
      await conn.query('INSERT IGNORE INTO themes (name) VALUES (?)', [name]);
      const [[t]] = await conn.query('SELECT id FROM themes WHERE name = ?', [name]);
      if (!ids.includes(t.id)) ids.push(t.id);
    }
    await conn.query('DELETE FROM model_themes WHERE model_id = ?', [modelId]);
    if (ids.length) {
      await conn.query('INSERT INTO model_themes (model_id, theme_id) VALUES ?', [ids.map(id => [modelId, id])]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

const sendError = (res, e) => res.status(e.status || 500).json({ error: e.message });

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.name, t.color, COUNT(mt.model_id) AS models_count
         FROM themes t LEFT JOIN model_themes mt ON mt.theme_id = t.id
        GROUP BY t.id, t.name, t.color
        ORDER BY t.name`);
    res.json(rows);
  } catch (e) { sendError(res, e); }
});

// Supprime les thèmes sans modèle (déclaré avant /:id)
router.post('/cleanup', async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM themes WHERE id NOT IN (SELECT theme_id FROM model_themes)');
    res.json({ deleted: r.affectedRows });
  } catch (e) { sendError(res, e); }
});

router.put('/:id', async (req, res) => {
  try {
    const sets = [], vals = [];
    if ('name' in req.body) { sets.push('name=?'); vals.push(cleanName(req.body.name)); }
    if ('color' in req.body) {
      const c = req.body.color;
      if (c !== null && c !== '' && !COLORS.includes(c)) return res.status(400).json({ error: 'Couleur inconnue' });
      sets.push('color=?'); vals.push(c || null);
    }
    if (sets.length) {
      try {
        const [r] = await db.query(`UPDATE themes SET ${sets.join(', ')} WHERE id=?`, [...vals, req.params.id]);
        if (!r.affectedRows) {
          const [[exists]] = await db.query('SELECT id FROM themes WHERE id=?', [req.params.id]);
          if (!exists) return res.status(404).json({ error: 'Thème introuvable' });
        }
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Un thème porte déjà ce nom (casse et accents ignorés). Utilisez « Fusionner » pour les regrouper.' });
        }
        throw e;
      }
    }
    const [[row]] = await db.query('SELECT id, name, color FROM themes WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Thème introuvable' });
    res.json(row);
  } catch (e) { sendError(res, e); }
});

// Les modèles du thème fusionné passent dans le thème cible (nom et couleur de la cible conservés)
router.post('/:id/merge', async (req, res) => {
  const from = Number(req.params.id), into = Number(req.body && req.body.into);
  if (!Number.isInteger(into) || into === from) return res.status(400).json({ error: 'Choisissez un autre thème' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [found] = await conn.query('SELECT id FROM themes WHERE id IN (?)', [[from, into]]);
    if (found.length !== 2) { await conn.rollback(); return res.status(404).json({ error: 'Thème introuvable' }); }
    await conn.query(
      'INSERT IGNORE INTO model_themes (model_id, theme_id) SELECT model_id, ? FROM model_themes WHERE theme_id = ?',
      [into, from]);
    await conn.query('DELETE FROM themes WHERE id = ?', [from]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback().catch(() => {});
    sendError(res, e);
  } finally { conn.release(); }
});

router.delete('/:id', async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM themes WHERE id=?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Thème introuvable' });
    res.json({ ok: true });
  } catch (e) { sendError(res, e); }
});

module.exports = { router, parseThemeNames, themesByModel, setModelThemes, COLORS };
