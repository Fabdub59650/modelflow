// Thèmes : pastilles (filtre de la liste) et éditeur avec autocomplétion (fiche modèle)
import { escapeHtml, fold } from './format.js';

// Palette des thèmes : clé enregistrée en base → libellé (les teintes sont définies dans le CSS)
export const THEME_COLORS = [
  ['rouge', 'Rouge'], ['orange', 'Orange'], ['jaune', 'Jaune'], ['vert', 'Vert'], ['turquoise', 'Turquoise'],
  ['bleu', 'Bleu'], ['violet', 'Violet'], ['rose', 'Rose'], ['gris', 'Gris'],
];
export const colorAttr = c => (c ? ` data-color="${escapeHtml(c)}"` : '');

// Même thème à la casse et aux accents près (comme la base : « Noel » = « Noël »)
export const sameTheme = (a, b) => fold(a) === fold(b);

/** Pastilles cliquables (filtre de la liste). `active` : ensemble d'identifiants de thèmes actifs. */
export function themeChipsHtml(themes, active = new Set()) {
  return themes.map(t => `<button type="button" class="theme-chip is-btn ${active.has(t.id) ? 'is-active' : ''}"${colorAttr(t.color)}
    data-theme-toggle="${t.id}" aria-pressed="${active.has(t.id)}"
    title="Filtrer sur le thème « ${escapeHtml(t.name)} »">${escapeHtml(t.name)}</button>`).join('');
}

/**
 * Éditeur de thèmes d'une fiche : pastilles avec croix + champ de saisie avec suggestions.
 * Les changements restent dans la fiche et partent avec « Enregistrer » : `editor.names()` donne la liste.
 * `known` : tous les thèmes existants [{ id, name, color }] (autocomplétion et graphie existante).
 */
export function mountThemeEditor(box, initial, known) {
  let themes = (initial || []).map(t => ({ name: t.name, color: t.color || null }));

  box.innerHTML = `
    <span class="theme-label">Thèmes</span>
    <span class="theme-chips"></span>
    <input type="text" class="theme-input" list="theme-options" maxlength="40" autocomplete="off"
           placeholder="Ajouter un thème…" aria-label="Ajouter un thème">
    <datalist id="theme-options"></datalist>`;
  const chipsEl = box.querySelector('.theme-chips');
  const input = box.querySelector('.theme-input');
  const options = box.querySelector('#theme-options');

  const draw = () => {
    chipsEl.innerHTML = themes.map((t, i) => `<span class="theme-chip"${colorAttr(t.color)}>${escapeHtml(t.name)}<button type="button"
      class="theme-remove" data-remove="${i}" aria-label="Retirer le thème ${escapeHtml(t.name)}">×</button></span>`).join('');
    options.innerHTML = known.filter(k => !themes.some(t => sameTheme(t.name, k.name)))
      .map(k => `<option value="${escapeHtml(k.name)}"></option>`).join('');
  };

  const add = raw => {
    const typed = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!typed) return;
    // Graphie (et couleur) du thème existant si le nom ne diffère que par la casse ou les accents
    const k = known.find(x => sameTheme(x.name, typed));
    const name = k ? k.name : typed;
    if (themes.some(t => sameTheme(t.name, name))) return;
    themes.push({ name, color: k ? k.color : null });
    draw();
  };
  const commit = () => { const v = input.value; input.value = ''; add(v); };

  // Entrée et virgule valident le texte saisi (Entrée ne doit pas enregistrer la fiche) ;
  // le choix dans la liste de suggestions passe par « change »
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
  });
  input.addEventListener('change', commit);
  chipsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    themes.splice(Number(btn.dataset.remove), 1);
    draw();
  });

  draw();
  return {
    /** Noms des thèmes (le texte en cours de saisie est pris en compte) */
    names() { commit(); return themes.map(t => t.name); },
  };
}
