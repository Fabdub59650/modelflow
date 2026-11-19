// Liste des modèles (grille de vignettes), filtres, et fiche modèle (création / modification)
import { api } from '../api.js';
import { toast, openDialog, confirmDialog } from '../ui.js';
import { STATUS, STATUS_KEYS, SOURCE, SOURCE_KEYS, escapeHtml, fullPath, copyText, fold } from '../format.js';
import { photoUrl, mountPhotoPicker } from '../photo.js';
import { colorAttr, themeChipsHtml, mountThemeEditor } from '../themes.js';

const FILTER_KEY = 'modelflow_filters';
const SORTS = [['recent', 'Plus récents'], ['name', 'Nom (A → Z)'], ['fav', 'Favoris d\'abord']];
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

const CUBE = `<svg viewBox="0 0 32 32" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M16 4.5 26 10v12l-10 5.5L6 22V10z"/><path d="M6.5 10.3 16 16l9.5-5.7M16 16v11"/></svg>`;
const STAR = '★';
const LINK_ICON = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M11 4h5v5M16 4l-7 7"/></svg>`;
const COPY_ICON = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M13 7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/></svg>`;

// ── Filtres (mémorisés dans le navigateur, sauf la recherche) ──────
const DEFAULT_FILTERS = { status: '', source: '', fav: false, themes: [], sort: 'recent' };
function readFilters() {
  try {
    const f = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null') || {};
    return {
      status: STATUS_KEYS.includes(f.status) ? f.status : '',
      source: SOURCE_KEYS.includes(f.source) ? f.source : '',
      fav: !!f.fav,
      themes: Array.isArray(f.themes) ? f.themes.filter(Number.isInteger) : [],
      sort: SORTS.some(([k]) => k === f.sort) ? f.sort : 'recent',
    };
  } catch (_) { return { ...DEFAULT_FILTERS }; }
}
function writeFilters(f) {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch (_) {}
}

export async function renderModels(el, openId) {
  document.title = 'Modèles — ModelFlow';
  let [models, themes, settings] = await Promise.all([api.get('models'), api.get('themes'), api.get('settings')]);
  const filters = readFilters();
  let query = '';

  el.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Modèles</h1>
      <span class="muted" id="count" aria-live="polite"></span>
      <div class="page-actions"><button type="button" class="btn btn-primary" id="add">＋ Nouveau modèle</button></div>
    </div>
    <div class="toolbar">
      <input type="search" id="q" class="search" placeholder="Rechercher : nom, code (M0012), thème, auteur…" aria-label="Rechercher un modèle" autocomplete="off">
      <select class="select" id="source" aria-label="Filtrer par source"></select>
      <select class="select" id="sort" aria-label="Trier">
        ${SORTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}
      </select>
      <button type="button" class="theme-chip is-btn" id="fav-filter" aria-pressed="false" title="Ne montrer que les favoris">${STAR} Favoris<span class="theme-count"></span></button>
    </div>
    <div class="theme-filter" id="status-row"></div>
    <div class="theme-filter" id="theme-row"></div>
    <div id="grid-box"></div>`;

  const $ = s => el.querySelector(s);
  const sourceSel = $('#source');
  sourceSel.innerHTML = `<option value="">Toutes les sources</option>${SOURCE_KEYS.map(k => `<option value="${k}">${SOURCE[k]}</option>`).join('')}`;
  sourceSel.value = filters.source;
  $('#sort').value = filters.sort;

  // ── Filtrage ──
  const haystack = m => fold([m.code, m.name, m.notes, m.author, m.folder, SOURCE[m.source], ...m.themes.map(t => t.name)].filter(Boolean).join(' '));
  const matches = (m, { ignoreStatus = false } = {}) => {
    if (!ignoreStatus && filters.status && m.status !== filters.status) return false;
    if (filters.source && m.source !== filters.source) return false;
    if (filters.fav && !m.favorite) return false;
    if (filters.themes.length && !filters.themes.every(id => m.themes.some(t => t.id === id))) return false;
    if (query) {
      const h = haystack(m);
      // Un mot « 12 », « m12 » ou « M0012 » retrouve le modèle de code M0012 ; sinon recherche dans le texte
      const words = fold(query).split(/\s+/).filter(Boolean);
      if (!words.every(w => h.includes(w) || (/^m?\d+$/.test(w) && Number(w.replace(/^m/, '')) === m.id))) return false;
    }
    return true;
  };
  const sorted = list => {
    const out = [...list];            // l'ordre du serveur est « plus récents d'abord »
    if (filters.sort === 'name') out.sort((a, b) => collator.compare(a.name, b.name));
    else if (filters.sort === 'fav') out.sort((a, b) => (b.favorite - a.favorite));   // tri stable
    return out;
  };
  const anyFilter = () => !!(query || filters.status || filters.source || filters.fav || filters.themes.length);

  // ── Rendu ──
  const drawStatus = () => {
    const base = models.filter(m => matches(m, { ignoreStatus: true }));
    const count = k => base.filter(m => m.status === k).length;
    $('#status-row').innerHTML =
      `<button type="button" class="theme-chip is-btn ${!filters.status ? 'is-active' : ''}" data-status="" aria-pressed="${!filters.status}">Tous<span class="theme-count">${base.length}</span></button>` +
      STATUS_KEYS.map(k => `<button type="button" class="theme-chip is-btn ${filters.status === k ? 'is-active' : ''}" data-status="${k}" aria-pressed="${filters.status === k}">${STATUS[k]}<span class="theme-count">${count(k)}</span></button>`).join('');
    const favBtn = $('#fav-filter');
    favBtn.classList.toggle('is-active', filters.fav);
    favBtn.setAttribute('aria-pressed', String(filters.fav));
    favBtn.querySelector('.theme-count').textContent = models.filter(m => m.favorite).length;
  };

  const drawThemes = () => {
    const used = themes.filter(t => t.models_count > 0);
    const active = new Set(filters.themes);
    $('#theme-row').hidden = !used.length;
    $('#theme-row').innerHTML = used.length
      ? `<span class="theme-label">Thèmes</span>${themeChipsHtml(used, active)}` +
        (anyFilter() ? '<button type="button" class="link-btn" data-reset>Effacer les filtres</button>' : '')
      : '';
  };

  const cardHtml = m => {
    const img = photoUrl(m);
    const path = m.folder ? fullPath(settings.storage_root, m.folder) : '';
    return `
    <article class="mcard" data-id="${m.id}">
      <button type="button" class="mcard-open" data-open aria-label="Ouvrir la fiche « ${escapeHtml(m.name)} »">
        <div class="mcard-img">
          ${img ? `<img src="${img}" alt="" loading="lazy" decoding="async">` : `<div class="mcard-ph">${CUBE}</div>`}
          ${m.status !== 'catalogue' ? `<span class="pill pill-${m.status} mcard-status">${STATUS[m.status]}</span>` : ''}
        </div>
        <div class="mcard-body">
          <h3 class="mcard-name">${escapeHtml(m.name)}</h3>
          <div class="mcard-meta">
            <span class="tag mcard-code" title="Code du modèle">${escapeHtml(m.code)}</span>
            <span class="tag">${SOURCE[m.source]}</span>
            ${m.themes.map(t => `<span class="theme-chip"${colorAttr(t.color)}>${escapeHtml(t.name)}</span>`).join('')}
          </div>
        </div>
      </button>
      <button type="button" class="mcard-fav ${m.favorite ? 'is-on' : ''}" data-fav aria-pressed="${m.favorite}"
        title="${m.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-label="${m.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${STAR}</button>
      <div class="mcard-actions">
        ${m.source_url ? `<a class="icon-btn" href="${escapeHtml(m.source_url)}" target="_blank" rel="noopener noreferrer" title="Ouvrir le lien source" aria-label="Ouvrir le lien source">${LINK_ICON}</a>` : ''}
        ${path ? `<button type="button" class="icon-btn" data-copy title="Copier le chemin du dossier : ${escapeHtml(path)}" aria-label="Copier le chemin du dossier">${COPY_ICON}</button>` : ''}
      </div>
    </article>`;
  };

  const drawGrid = () => {
    const shown = sorted(models.filter(m => matches(m)));
    $('#count').textContent = anyFilter()
      ? `${shown.length} sur ${models.length}`
      : `${models.length} modèle${models.length > 1 ? 's' : ''}`;
    const box = $('#grid-box');
    if (!models.length) {
      box.innerHTML = `<div class="empty-state">
        <p class="empty-title">Aucun modèle pour l'instant</p>
        <p>Ajoutez un premier modèle : un nom suffit, le reste est facultatif.</p>
        <button type="button" class="btn btn-primary" data-add>＋ Nouveau modèle</button></div>`;
    } else if (!shown.length) {
      box.innerHTML = `<div class="empty-state"><p class="empty-title">Aucun modèle ne correspond</p>
        <button type="button" class="btn" data-reset>Effacer les filtres</button></div>`;
    } else {
      box.innerHTML = `<div class="mgrid">${shown.map(cardHtml).join('')}</div>`;
    }
  };

  const drawAll = () => { drawStatus(); drawThemes(); drawGrid(); };
  const save = () => writeFilters(filters);

  const reload = async () => {
    [models, themes] = await Promise.all([api.get('models'), api.get('themes')]);
    drawAll();
  };

  const openFiche = model => openModelDialog({
    model, known: themes, settings,
    onSaved: reload,
  });

  // ── Événements ──
  $('#add').addEventListener('click', () => openFiche(null));
  $('#q').addEventListener('input', e => { query = e.target.value.trim(); drawAll(); });
  sourceSel.addEventListener('change', () => { filters.source = sourceSel.value; save(); drawAll(); });
  $('#sort').addEventListener('change', e => { filters.sort = e.target.value; save(); drawGrid(); });
  $('#fav-filter').addEventListener('click', () => { filters.fav = !filters.fav; save(); drawAll(); });

  const resetFilters = () => {
    Object.assign(filters, { status: '', source: '', fav: false, themes: [] });
    query = ''; $('#q').value = ''; sourceSel.value = '';
    save(); drawAll();
  };

  const onClick = async e => {
    const st = e.target.closest('[data-status]');
    if (st) { filters.status = st.dataset.status; save(); drawAll(); return; }
    const th = e.target.closest('[data-theme-toggle]');
    if (th) {
      const id = Number(th.dataset.themeToggle);
      filters.themes = filters.themes.includes(id) ? filters.themes.filter(x => x !== id) : [...filters.themes, id];
      save(); drawAll(); return;
    }
    if (e.target.closest('[data-reset]')) { resetFilters(); return; }
    if (e.target.closest('[data-add]')) { openFiche(null); return; }

    const card = e.target.closest('.mcard');
    if (!card) return;
    const m = models.find(x => x.id === Number(card.dataset.id));
    if (!m) return;
    if (e.target.closest('[data-fav]')) {
      const next = !m.favorite;
      m.favorite = next; drawAll();                      // affichage immédiat, annulé si l'enregistrement échoue
      try { await api.put(`models/${m.id}`, { favorite: next }); }
      catch (err) { m.favorite = !next; drawAll(); toast(err.message, 'error'); }
      return;
    }
    if (e.target.closest('[data-copy]')) {
      const path = fullPath(settings.storage_root, m.folder);
      const ok = await copyText(path);
      toast(ok ? `Chemin copié : ${path}` : 'Copie impossible : sélectionnez le chemin à la main', ok ? 'info' : 'error');
      return;
    }
    if (e.target.closest('[data-open]')) openFiche(m);
  };
  el.addEventListener('click', onClick);

  // Les thèmes sélectionnés qui n'existent plus (supprimés dans Paramètres) sont retirés du filtre
  filters.themes = filters.themes.filter(id => themes.some(t => t.id === id));
  drawAll();
  // Lien direct #/modele/12 (depuis PrepFlow) : la fiche s'ouvre sur la liste
  if (openId) {
    const target = models.find(m => m.id === Number(openId));
    history.replaceState(null, '', '#/');           // un rechargement ne rouvre pas la fiche
    if (target) openFiche(target); else toast('Ce modèle n\'existe plus dans le catalogue', 'error');
  }
  // La zone de contenu est réutilisée par les autres vues : retirer l'écouteur en quittant la liste
  return () => el.removeEventListener('click', onClick);
}

/* ── Fiche modèle ───────────────────────────────────────────── */

function openModelDialog({ model, known, settings, onSaved }) {
  let current = model;            // devient le modèle créé après un premier enregistrement (évite un doublon si l'image échoue)
  let picker = null, editor = null, dlg = null;
  const v = (b, n) => b.querySelector(`[name=${n}]`);

  dlg = openDialog({
    title: model ? 'Fiche du modèle' : 'Nouveau modèle',
    confirmLabel: 'Enregistrer',
    wide: true,
    build(body) {
      body.innerHTML = `
      <div class="mf-form">
        <div class="mf-photo" data-photo></div>
        <div class="mf-fields">
          ${model ? `<div class="mf-code"><span>Code</span> <strong data-code>${escapeHtml(model.code)}</strong>
            <button type="button" class="link-btn" data-copy-code>Copier</button></div>` : ''}
          <label class="field"><span>Nom</span><input name="name" required maxlength="150" autocomplete="off"></label>
          <div class="mf-row">
            <label class="field"><span>Source</span>
              <select class="select" name="source">${SOURCE_KEYS.map(k => `<option value="${k}">${SOURCE[k]}</option>`).join('')}</select></label>
            <label class="field"><span>Statut</span>
              <select class="select" name="status">${STATUS_KEYS.map(k => `<option value="${k}">${STATUS[k]}</option>`).join('')}</select></label>
            <label class="toggle mf-fav"><input type="checkbox" name="favorite"> ${STAR} Favori</label>
          </div>
          <div class="field"><span>Lien source</span>
            <span class="mf-inline">
              <input name="source_url" type="text" inputmode="url" maxlength="500" placeholder="https://makerworld.com/…" autocomplete="off" aria-label="Lien source">
              <button type="button" class="btn btn-sm" data-open-link title="Ouvrir le lien dans un nouvel onglet">Ouvrir</button>
            </span>
            <small class="mf-warn" data-dup hidden></small>
          </div>
          <label class="field"><span>Auteur / licence</span><input name="author" maxlength="150" placeholder="ex. Nom du créateur · CC BY-NC" autocomplete="off"></label>
          <div class="field"><span>Dossier de stockage</span>
            <input name="folder" maxlength="300" placeholder="${model ? 'ex. ' + escapeHtml(model.code) + ' - Nom du modèle' : 'Laissez vide : « M… - nom » sera proposé'}" autocomplete="off" aria-label="Dossier de stockage">
            <small class="mf-path"><span data-path></span> <button type="button" class="link-btn" data-copy-path>Copier le chemin</button>
              ${model ? '<button type="button" class="link-btn" data-suggest-folder title="Remplace le dossier par « code - nom » (à renommer ensuite dans le Finder)">Nom conseillé</button>' : ''}</small>
          </div>
          <div class="project-themes" data-themes></div>
          <label class="field"><span>Remarques</span><textarea name="notes" rows="3" maxlength="5000"></textarea></label>
          ${model ? `<div class="mf-projects" data-projects hidden>
            <span class="mf-projects-title">Projets PrepFlow</span>
            <ul data-projects-list></ul>
          </div>
          <div><a class="btn btn-sm" href="/prepflow/#/depuis-modele/${model.id}" target="_blank" rel="noopener"
            title="Crée un projet PrepFlow lié à ce modèle (nom, lien source, image et thèmes repris)">＋ Créer un projet PrepFlow</a></div>` : ''}
          ${model ? '<div><button type="button" class="btn btn-ghost-danger btn-sm" data-delete>Supprimer ce modèle</button></div>' : ''}
        </div>
      </div>`;

      // Valeurs de départ
      const m = model || { name: '', source: 'autre', status: 'catalogue', favorite: false, source_url: '', author: '', folder: '', notes: '', themes: [] };
      v(body, 'name').value = m.name;
      v(body, 'source').value = m.source;
      v(body, 'status').value = m.status;
      v(body, 'favorite').checked = !!m.favorite;
      v(body, 'source_url').value = m.source_url || '';
      v(body, 'author').value = m.author || '';
      v(body, 'folder').value = m.folder || '';
      v(body, 'notes').value = m.notes || '';

      picker = mountPhotoPicker(body.querySelector('[data-photo]'), photoUrl(model));
      editor = mountThemeEditor(body.querySelector('[data-themes]'), m.themes, known);

      // Chemin complet (racine + dossier) et copie
      const pathEl = body.querySelector('[data-path]');
      const copyBtn = body.querySelector('[data-copy-path]');
      const showPath = () => {
        const p = fullPath(settings.storage_root, v(body, 'folder').value);
        pathEl.textContent = p || 'Racine de stockage non définie (Paramètres › Général)';
        copyBtn.hidden = !p;
      };
      v(body, 'folder').addEventListener('input', showPath);
      copyBtn.addEventListener('click', async () => {
        const p = fullPath(settings.storage_root, v(body, 'folder').value);
        const ok = await copyText(p);
        toast(ok ? 'Chemin copié' : 'Copie impossible', ok ? 'info' : 'error');
      });
      showPath();
      if (model) {
        body.querySelector('[data-copy-code]').addEventListener('click', async () => {
          const ok = await copyText(model.code);
          toast(ok ? `Code copié : ${model.code}` : 'Copie impossible', ok ? 'info' : 'error');
        });
        body.querySelector('[data-suggest-folder]').addEventListener('click', () => {
          const clean = v(body, 'name').value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).trim();
          v(body, 'folder').value = clean ? `${model.code} - ${clean}` : model.code;
          showPath();
        });
      }

      // Projets PrepFlow liés à ce modèle (lecture seule ; facultatif : rien ne s'affiche si PrepFlow ne répond pas)
      if (model) {
        const PSTATUS = { idee: 'Idée', preparation: 'En préparation', en_cours: 'En cours', termine: 'Terminé', archive: 'Archivé' };
        fetch('/prepflow/api/projects?archived=1', { signal: AbortSignal.timeout(4000) })
          .then(r => (r.ok ? r.json() : []))
          .then(rows => {
            const mine = rows.filter(p => p.model_id === model.id);
            if (!mine.length || !body.isConnected) return;
            body.querySelector('[data-projects]').hidden = false;
            body.querySelector('[data-projects-list]').innerHTML = mine.map(p =>
              `<li><a href="/prepflow/#/projet/${p.id}" target="_blank" rel="noopener"><span class="mf-pcode">${escapeHtml(p.code || '')}</span> ${escapeHtml(p.name)}</a>
               <span class="mf-pstatus">${escapeHtml(PSTATUS[p.status] || '')}</span></li>`).join('');
          })
          .catch(() => {});
      }

      // Lien : ouverture, source devinée, doublon
      const urlInput = v(body, 'source_url');
      const dupEl = body.querySelector('[data-dup]');
      body.querySelector('[data-open-link]').addEventListener('click', () => {
        const u = urlInput.value.trim();
        if (/^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener,noreferrer');
        else toast('Lien source vide ou invalide', 'error');
      });
      urlInput.addEventListener('change', async () => {
        const u = urlInput.value.trim();
        const src = v(body, 'source');
        if (src.value === 'autre') {
          if (/(^|\/\/|\.)makerworld\.com/i.test(u)) src.value = 'makerworld';
          else if (/(^|\/\/|\.)printables\.com/i.test(u)) src.value = 'printables';
        }
        dupEl.hidden = true;
        if (!/^https?:\/\//i.test(u)) return;
        try {
          const dups = await api.get(`models/duplicates?url=${encodeURIComponent(u)}&exclude=${current ? current.id : 0}`);
          if (dups.length) {
            dupEl.textContent = `⚠ Ce lien est déjà dans le catalogue : ${dups.map(d => `« ${d.name} »`).join(', ')}`;
            dupEl.hidden = false;
          }
        } catch (_) { /* le contrôle de doublon est facultatif */ }
      });

      body.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmDialog('Supprimer le modèle',
          `« ${model.name} » sera retiré du catalogue. Les fichiers rangés dans son dossier ne sont pas touchés.`);
        if (!ok) return;
        try {
          await api.del(`models/${model.id}`);
          toast('Modèle supprimé');
          dlg.close(); dlg.remove();
          await onSaved?.();
        } catch (err) { toast(err.message, 'error'); }
      });
    },
    async onConfirm(body) {
      const payload = {
        name: v(body, 'name').value,
        source: v(body, 'source').value,
        status: v(body, 'status').value,
        favorite: v(body, 'favorite').checked,
        source_url: v(body, 'source_url').value,
        author: v(body, 'author').value,
        folder: v(body, 'folder').value,
        notes: v(body, 'notes').value,
        themes: editor.names(),
      };
      const saved = current
        ? await api.put(`models/${current.id}`, payload)
        : await api.post('models', payload);
      current = saved;
      // Image : le modèle est déjà enregistré ; un échec d'image ne doit pas le faire créer deux fois
      try {
        if (picker.pending) await api.put(`models/${saved.id}/photo`, { image: picker.pending });
        else if (picker.removed && saved.photo_v) await api.del(`models/${saved.id}/photo`);
      } catch (err) {
        toast(`Modèle enregistré, mais l'image n'a pas été prise en compte : ${err.message}`, 'error');
      }
      toast('Modèle enregistré');
      await onSaved?.();
    },
  });
  dlg.addEventListener('close', () => picker && picker.destroy());
  return dlg;
}
