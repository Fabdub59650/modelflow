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
  let active = -1;           // suggestion surlignée au clavier

  box.innerHTML = `
    <span class="theme-label">Thèmes</span>
    <span class="theme-chips"></span>
    <span class="theme-add">
      <input type="text" class="theme-input" maxlength="40" autocomplete="off" role="combobox" aria-autocomplete="list"
             aria-expanded="false" placeholder="Ajouter un thème…" aria-label="Ajouter un thème">
      <ul class="theme-suggest" role="listbox" hidden></ul>
    </span>`;
  const chipsEl = box.querySelector('.theme-chips');
  const input = box.querySelector('.theme-input');
  const list = box.querySelector('.theme-suggest');

  const drawChips = () => {
    chipsEl.innerHTML = themes.map((t, i) => `<span class="theme-chip"${colorAttr(t.color)}>${escapeHtml(t.name)}<button type="button"
      class="theme-remove" data-remove="${i}" aria-label="Retirer le thème ${escapeHtml(t.name)}">×</button></span>`).join('');
  };

  // Suggestions : thèmes existants pas encore sur la fiche, filtrés par ce qui est tapé (casse et accents ignorés)
  const candidates = () => {
    const q = fold(input.value.trim());
    return known.filter(k => !themes.some(t => sameTheme(t.name, k.name)) && (!q || fold(k.name).includes(q))).slice(0, 8);
  };
  const hideSuggest = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
  const showSuggest = () => {
    const c = candidates();
    if (!c.length) { hideSuggest(); return; }
    active = Math.min(active, c.length - 1);
    list.innerHTML = c.map((k, i) => `<li role="option" data-name="${escapeHtml(k.name)}" class="${i === active ? 'is-active' : ''}"
      aria-selected="${i === active}">${escapeHtml(k.name)}</li>`).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    // Pas assez de place sous le champ (bas de la fiche) : la liste s'ouvre vers le haut
    list.classList.remove('is-up');
    const room = (box.closest('dialog') || document.documentElement).getBoundingClientRect().bottom;
    if (list.getBoundingClientRect().bottom > room - 8) list.classList.add('is-up');
  };

  const add = raw => {
    const typed = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!typed) return;
    // Graphie (et couleur) du thème existant si le nom ne diffère que par la casse ou les accents
    const k = known.find(x => sameTheme(x.name, typed));
    const name = k ? k.name : typed;
    if (themes.some(t => sameTheme(t.name, name))) return;
    themes.push({ name, color: k ? k.color : null });
    drawChips();
  };
  const commit = () => { const v = input.value; input.value = ''; add(v); };

  // Un clic sur une suggestion l'ajoute tout de suite (mousedown ne retire pas le focus du champ)
  list.addEventListener('mousedown', e => e.preventDefault());
  list.addEventListener('click', e => {
    const li = e.target.closest('[data-name]');
    if (!li) return;
    input.value = '';
    add(li.dataset.name);
    input.focus();
    showSuggest();
  });
  input.addEventListener('focus', showSuggest);
  input.addEventListener('input', () => { active = -1; showSuggest(); });
  input.addEventListener('blur', () => { hideSuggest(); commit(); });
  input.addEventListener('keydown', e => {
    const c = candidates();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!c.length) return;
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + c.length) % c.length;
      showSuggest();
    } else if (e.key === 'Enter' || e.key === ',') {
      // Entrée ne doit pas enregistrer la fiche : elle ajoute la suggestion surlignée, sinon le texte saisi
      e.preventDefault();
      if (e.key === 'Enter' && active >= 0 && c[active]) { input.value = ''; add(c[active].name); }
      else commit();
      active = -1;
      showSuggest();
    } else if (e.key === 'Escape' && !list.hidden) {
      e.stopPropagation(); e.preventDefault();      // referme la liste sans fermer la fiche
      hideSuggest();
    }
  });
  chipsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    themes.splice(Number(btn.dataset.remove), 1);
    drawChips();
  });

  drawChips();
  return {
    /** Noms des thèmes (le texte en cours de saisie est pris en compte) */
    names() { commit(); return themes.map(t => t.name); },
  };
}
