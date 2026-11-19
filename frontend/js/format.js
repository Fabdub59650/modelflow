// Formats d'affichage et petits utilitaires partagés

export const STATUS = { catalogue: 'Catalogué', a_imprimer: 'À imprimer', imprime: 'Imprimé' };
export const STATUS_KEYS = Object.keys(STATUS);

export const SOURCE = { makerworld: 'MakerWorld', printables: 'Printables', perso: 'Personnel', autre: 'Autre' };
export const SOURCE_KEYS = Object.keys(SOURCE);

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export const formatDate = iso => {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR');
};

/**
 * Chemin complet d'un modèle : racine de stockage + sous-dossier.
 * Un dossier déjà absolu (« /… » ou « smb://… ») est pris tel quel.
 */
export function fullPath(root, folder) {
  const r = String(root || '').trim().replace(/\/+$/, '');
  const f = String(folder || '').trim();
  if (!f) return r;
  if (/^(\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(f)) return f;
  return r ? `${r}/${f}` : f;
}

/** Copie dans le presse-papiers (navigateur sécurisé, sinon solution de repli) */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* repli ci-dessous */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) {}
  ta.remove();
  return ok;
}

/** Texte comparable : sans accents ni majuscules (recherche) */
export const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr');
