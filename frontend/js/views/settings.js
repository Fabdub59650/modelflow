import { api } from '../api.js';
import { toast, openDialog } from '../ui.js';
import { applyColorMode } from '../theme.js';
import { escapeHtml } from '../format.js';
import { setUpdateBadge } from '../updates.js';
import { mountThemesAdmin } from '../themes-admin.js';

const MODES = [
  ['',            'Atelier sombre (par défaut)'],
  ['light',       'Toujours clair'],
  ['dark',        'Toujours sombre'],
  ['auto-system', 'Suivre le thème du système'],
  ['auto-time',   "Selon l'heure"],
];

const SET_TABS = [['general', 'Général'], ['themes', 'Thèmes'], ['version', 'Version']];

const hours = selected => Array.from({ length: 24 }, (_, h) =>
  `<option value="${h}" ${String(h) === String(selected) ? 'selected' : ''}>${h} h</option>`).join('');

export async function renderSettings(el) {
  document.title = 'Paramètres — ModelFlow';
  const s = await api.get('settings');

  el.innerHTML = `
    <div class="page-head"><h1 class="page-title">Paramètres</h1></div>
    <div class="tabs" role="tablist" aria-label="Rubriques des paramètres">
      ${SET_TABS.map(([k, l]) => `<button type="button" role="tab" class="tab" id="settab-${k}" data-settab="${k}" aria-controls="setpanel-${k}">${l}</button>`).join('')}
    </div>

    <div class="tab-panel" role="tabpanel" id="setpanel-general" aria-labelledby="settab-general">
    <section class="settings-section" aria-labelledby="storage-title">
      <h2 class="panel-title" id="storage-title">Stockage des fichiers 3D</h2>
      <p class="panel-sub">ModelFlow ne stocke pas les fichiers (STL, 3MF…) : chaque fiche retient seulement son sous-dossier, et le chemin complet
        est la racine ci-dessous suivie de ce sous-dossier. Pour changer d'emplacement, il suffit de modifier la racine.
        Sur le Mac : sélectionnez le dossier dans le Finder puis <strong>⌥⌘C</strong> pour copier son chemin. Pour un dossier réseau, une adresse du type
        <code>smb://192.168.1.2/3D</code> convient.</p>
      <div class="settings-row">
        <label class="field is-wide"><span>Racine de stockage</span>
          <input type="text" id="storage-root" maxlength="300" placeholder="/Volumes/Datas/Impressions 3D/B - Bibliothèque" value="${escapeHtml(s.storage_root ?? '')}" autocomplete="off"></label>
      </div>
      <p class="panel-sub" style="margin-top:8px">Un navigateur ne peut pas ouvrir un dossier de votre ordinateur : le bouton « Copier le chemin » d'une fiche
        copie le chemin complet, à coller dans le Finder avec <strong>⌘⇧G</strong> (Aller au dossier).</p>
    </section>

    <section class="settings-section" aria-labelledby="appearance-title">
      <h2 class="panel-title" id="appearance-title">Apparence</h2>
      <p class="panel-sub">Le bouton en haut à droite bascule directement entre clair et sombre, et remplace le mode choisi ici.</p>
      <div class="settings-row">
        <label class="field">
          <span>Mode d'affichage</span>
          <select class="select" id="color-mode">
            ${MODES.map(([v, l]) => `<option value="${v}" ${v === (s.color_mode || '') ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <div class="field hours-field" id="hours" ${s.color_mode === 'auto-time' ? '' : 'hidden'}>
          <span>Sombre</span>
          <div class="hours-inputs">
            <label>de <select class="select" id="dark-from" aria-label="Début du mode sombre">${hours(s.dark_from)}</select></label>
            <label>à <select class="select" id="dark-to" aria-label="Fin du mode sombre">${hours(s.dark_to)}</select></label>
          </div>
        </div>
      </div>
    </section>
    </div>

    <div class="tab-panel" role="tabpanel" id="setpanel-themes" aria-labelledby="settab-themes" hidden>
    <section class="settings-section is-wide" aria-labelledby="themes-title">
      <h2 class="panel-title" id="themes-title">Thèmes</h2>
      <p class="panel-sub">Thèmes de modèles (Noël, Halloween, Statuettes…) : couleur, renommage, fusion. On les attribue depuis la fiche d'un modèle.</p>
      <div id="themes-box"><p class="muted">Lecture…</p></div>
    </section>
    </div>

    <div class="tab-panel" role="tabpanel" id="setpanel-version" aria-labelledby="settab-version" hidden>
    <section class="settings-section" aria-labelledby="version-title">
      <h2 class="panel-title" id="version-title">Version</h2>
      <p class="panel-sub">Comparée au dernier tag publié sur GitHub (Fabdub59650/modelflow).</p>
      <div id="version-box" class="version-box"><p class="muted">Lecture…</p></div>
    </section>
    </div>`;

  const modeSel = el.querySelector('#color-mode');
  const fromSel = el.querySelector('#dark-from');
  const toSel   = el.querySelector('#dark-to');
  const hoursEl = el.querySelector('#hours');

  const save = async body => {
    try {
      const saved = await api.put('settings', body);
      applyColorMode(saved.color_mode, saved.dark_from, saved.dark_to);
      toast('Réglage enregistré');
    } catch (e) { toast(e.message, 'error'); }
  };

  modeSel.addEventListener('change', () => {
    hoursEl.hidden = modeSel.value !== 'auto-time';
    save({ color_mode: modeSel.value });
  });
  fromSel.addEventListener('change', () => save({ dark_from: fromSel.value }));
  toSel.addEventListener('change', () => save({ dark_to: toSel.value }));

  // Le bouton de la barre du haut change le mode : garder la liste à jour
  const onToggle = e => {
    modeSel.value = e.detail.mode;
    hoursEl.hidden = true;
  };
  document.addEventListener('modelflow:color-mode', onToggle);

  const rootInput = el.querySelector('#storage-root');
  rootInput.addEventListener('change', async () => {
    try {
      const saved = await api.put('settings', { storage_root: rootInput.value });
      s.storage_root = saved.storage_root;
      rootInput.value = saved.storage_root;
      toast('Réglage enregistré');
    } catch (e) { toast(e.message, 'error'); rootInput.value = s.storage_root ?? ''; }
  });

  // Rubriques : une seule affichée à la fois (mémorisée pour la session)
  const showSetTab = name => {
    if (!SET_TABS.some(([k]) => k === name)) name = 'general';
    for (const [k] of SET_TABS) {
      const on = k === name;
      const b = el.querySelector(`#settab-${k}`);
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      el.querySelector(`#setpanel-${k}`).hidden = !on;
    }
    try { sessionStorage.setItem('modelflow:settings-tab', name); } catch (_) {}
  };
  el.querySelectorAll('[data-settab]').forEach(b => {
    b.addEventListener('click', () => showSetTab(b.dataset.settab));
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const i = SET_TABS.findIndex(([k]) => k === b.dataset.settab);
      const next = SET_TABS[(i + (e.key === 'ArrowRight' ? 1 : SET_TABS.length - 1)) % SET_TABS.length][0];
      showSetTab(next); el.querySelector(`#settab-${next}`).focus();
    });
  });
  let firstTab = 'general';
  try { firstTab = sessionStorage.getItem('modelflow:settings-tab') || 'general'; } catch (_) {}
  showSetTab(firstTab);

  mountThemesAdmin(el.querySelector('#themes-box'));

  const stopVersion = initVersionSection(el.querySelector('#version-box'));
  return () => {
    document.removeEventListener('modelflow:color-mode', onToggle);
    stopVersion();
  };
}


/* ── Section Version ─────────────────────────────────────────── */

// Notes du CHANGELOG (Markdown simple) en HTML : titres « ## » et listes « - »
function renderNotes(md) {
  if (!md) return '<p class="muted">Pas de notes pour cette version.</p>';
  const out = [];
  let inList = false;
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const h = line.match(/^##\s+(.*)/);
    const li = line.match(/^-\s+(.*)/);
    if (!li && inList && !/^\s{2,}\S/.test(line)) { out.push('</ul>'); inList = false; }
    if (h) out.push(`<h3 class="notes-title">${escapeHtml(h[1])}</h3>`);
    else if (li) { if (!inList) { out.push('<ul class="notes-list">'); inList = true; } out.push(`<li>${escapeHtml(li[1])}`); }
    else if (/^\s{2,}\S/.test(line) && inList) out.push(' ' + escapeHtml(line.trim()));
    else if (line.trim() && !/^#\s/.test(line)) out.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

const fmtDate = iso => iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';

function initVersionSection(box) {
  let stopped = false;
  let timer = null;

  const draw = (info, { error = null } = {}) => {
    const upToDate = info.latest_version && !info.is_newer;
    box.innerHTML = `
      <dl class="version-grid">
        <dt>Installée</dt><dd><strong>v${escapeHtml(info.current_version || '?')}</strong></dd>
        <dt>Sur GitHub</dt><dd>${info.latest_version ? 'v' + escapeHtml(info.latest_version) : '<span class="muted">non vérifiée</span>'}
          ${info.checked_at ? `<span class="muted"> · vérifiée le ${fmtDate(info.checked_at)}</span>` : ''}</dd>
      </dl>
      ${error ? `<p class="version-error">${escapeHtml(error)}</p>` : ''}
      ${upToDate && !error ? '<p class="version-ok">ModelFlow est à jour.</p>' : ''}
      ${info.is_newer ? `
        <div class="update-card">
          <p class="update-title">Nouvelle version disponible : v${escapeHtml(info.latest_version)}</p>
          <div class="notes">${renderNotes(info.notes)}</div>
          ${info.infra_changes && info.infra_changes.length ? `<p class="version-warn">Cette version modifie aussi le ${escapeHtml(info.infra_changes.join(' et le '))} :
            après la mise à jour, lancez <code>sudo bash scripts/patch.sh</code> sur le Pi.</p>` : ''}
        </div>` : ''}
      <div class="version-actions">
        <button type="button" class="btn" data-check>Vérifier</button>
        ${info.is_newer ? `<button type="button" class="btn btn-primary" data-update>Mettre à jour vers v${escapeHtml(info.latest_version)}</button>` : ''}
      </div>`;
    box.querySelector('[data-check]').addEventListener('click', doCheck);
    box.querySelector('[data-update]')?.addEventListener('click', () => confirmUpdate(info));
  };

  const doCheck = async () => {
    const btn = box.querySelector('[data-check]');
    btn.disabled = true; btn.textContent = 'Vérification…';
    try {
      const info = await api.get('updater/check');
      setUpdateBadge(info.is_newer);
      draw(info);
    } catch (e) {
      const st = await api.get('updater/status').catch(() => ({}));
      draw(st, { error: e.message });
    }
  };

  const confirmUpdate = info => {
    openDialog({
      title: `Mettre à jour vers v${info.latest_version}`,
      confirmLabel: 'Mettre à jour',
      build: b => {
        b.innerHTML = `<p>ModelFlow va télécharger la version depuis GitHub, l'installer puis redémarrer.
          La page se rechargera automatiquement. Comptez une à deux minutes.</p>`;
      },
      onConfirm: async () => {
        await api.post('updater/update', { version: info.latest_version });
        follow(info.latest_version);
      },
    });
  };

  // Suivi de la mise à jour, puis attente du redémarrage
  const follow = target => {
    const show = (text, kind = '') => {
      box.innerHTML = `<p class="update-progress ${kind}">${escapeHtml(text)}</p>`;
    };
    show('Mise à jour lancée…');
    let restarting = false;
    const startedAt = Date.now();
    const tick = async () => {
      if (stopped) return;
      try {
        if (!restarting) {
          const p = await api.get('updater/progress');
          if (p.state === 'error') { show('Échec : ' + p.error + '. Rien n\'a été redémarré ; sur le Pi : sudo bash scripts/patch.sh', 'version-error'); return; }
          if (p.state === 'restarting') restarting = true;
          show(p.step ? p.step + '…' : 'Mise à jour en cours…');
        } else {
          const meta = await api.get('meta');
          if (meta.version === target) {
            show(`ModelFlow v${target} installé. Rechargement…`, 'version-ok');
            setTimeout(() => location.reload(), 1200);
            return;
          }
        }
      } catch (_) {
        restarting = true;
        show('Redémarrage de ModelFlow…');
      }
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        show('Le redémarrage prend plus longtemps que prévu. Vérifiez sur le Pi : sudo journalctl -u modelflow -n 50', 'version-error');
        return;
      }
      timer = setTimeout(tick, 1500);
    };
    timer = setTimeout(tick, 800);
  };

  api.get('updater/status?auto=1')
    .then(info => {
      if (stopped) return;
      setUpdateBadge(info.is_newer);
      if (info.progress && (info.progress.state === 'running' || info.progress.state === 'restarting')) follow(info.progress.version);
      else draw(info);
    })
    .catch(e => draw({}, { error: e.message }));

  return () => { stopped = true; clearTimeout(timer); };
}
