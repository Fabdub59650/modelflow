// Image d'un modèle : adresse, réduction côté navigateur, zone d'ajout (fichier, glisser-déposer, Ctrl+V)
import { toast } from './ui.js';
import { escapeHtml } from './format.js';

const MAX_SIDE = 900;      // plus grand côté, en pixels
const QUALITY = 0.85;

/** Adresse de l'image d'un modèle (null s'il n'en a pas). `photo_v` change à chaque remplacement. */
export const photoUrl = m => (m && m.photo_v ? `api/models/${Number(m.id)}/photo?v=${Number(m.photo_v)}` : null);

/** Fichier ou presse-papiers (PNG, JPEG, WebP…) → data URL JPEG réduite, fond blanc (les captures transparentes ne noircissent pas) */
export async function toJpegDataUrl(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Ce fichier n'est pas une image lisible"));
      i.src = url;
    });
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', QUALITY);
  } finally { URL.revokeObjectURL(url); }
}

/**
 * Zone d'image intégrée à la fiche : coller une capture (Ctrl+V / ⌘V), glisser une image, ou choisir un fichier.
 * Rien n'est envoyé ici : la fiche lit `picker.pending` (data URL JPEG) ou `picker.removed` à l'enregistrement.
 * Renvoie { pending, removed, destroy() } ; destroy() retire l'écouteur de collage (à appeler à la fermeture).
 */
export function mountPhotoPicker(box, current) {
  const state = { pending: null, removed: false, destroy: () => {} };
  box.innerHTML = `
    <div class="photo-drop" data-drop tabindex="0">
      <div class="photo-preview" data-preview></div>
      <p class="photo-hint"><strong>Collez</strong> une image (Ctrl+V ou ⌘V), <strong>glissez-la</strong> ici, ou</p>
      <button type="button" class="btn btn-sm" data-pick>Choisir un fichier…</button>
      <input type="file" accept="image/*" data-file hidden>
    </div>
    <button type="button" class="link-btn" data-photo-remove hidden>Retirer l'image</button>`;
  const prev = box.querySelector('[data-preview]');
  const rm = box.querySelector('[data-photo-remove]');
  const file = box.querySelector('[data-file]');
  const drop = box.querySelector('[data-drop]');

  const draw = () => {
    const src = state.pending || (state.removed ? null : current);
    prev.innerHTML = src ? `<img src="${escapeHtml(src)}" alt="Aperçu de l'image">` : '';
    prev.hidden = !src;
    rm.hidden = !src;
  };
  const take = async f => {
    try { state.pending = await toJpegDataUrl(f); state.removed = false; draw(); }
    catch (err) { toast(err.message, 'error'); }
  };

  box.querySelector('[data-pick]').addEventListener('click', () => file.click());
  file.addEventListener('change', () => { if (file.files[0]) take(file.files[0]); });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', e => {
    const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith('image/'));
    if (f) take(f);
  });
  rm.addEventListener('click', () => { state.pending = null; state.removed = true; draw(); });

  // Collage : seulement quand le presse-papiers contient une image (un texte collé dans un champ n'est pas touché)
  const onPaste = e => {
    const f = [...(e.clipboardData?.items || [])].find(it => it.type.startsWith('image/'))?.getAsFile();
    if (!f) return;
    e.preventDefault();
    take(f);
  };
  document.addEventListener('paste', onPaste);
  state.destroy = () => document.removeEventListener('paste', onPaste);

  draw();
  return state;
}
