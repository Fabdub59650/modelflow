// Paramètres › Thèmes : couleur, renommage, fusion, suppression
import { api } from './api.js';
import { toast, openDialog, confirmDialog } from './ui.js';
import { escapeHtml } from './format.js';
import { THEME_COLORS, colorAttr } from './themes.js';

const TRASH = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6"/></svg>`;

export async function mountThemesAdmin(box) {
  let themes = [];

  const draw = () => {
    if (!themes.length) {
      box.innerHTML = `<p class="muted">Aucun thème pour l'instant. Ajoutez-en depuis la fiche d'un modèle (rangée « Thèmes »).</p>`;
      return;
    }
    const unused = themes.filter(t => !t.models_count).length;
    box.innerHTML = `
      <div class="table-wrap">
      <table class="list-table themes-table">
        <thead><tr><th>Couleur</th><th>Nom</th><th class="num">Modèles</th><th></th></tr></thead>
        <tbody>
        ${themes.map(t => `<tr data-id="${t.id}">
          <td><span class="theme-dot"${colorAttr(t.color)}></span>
            <select class="select theme-color" aria-label="Couleur du thème ${escapeHtml(t.name)}">
              <option value="">Neutre</option>
              ${THEME_COLORS.map(([k, l]) => `<option value="${k}" ${k === t.color ? 'selected' : ''}>${l}</option>`).join('')}
            </select></td>
          <td><input class="inline-input theme-name" value="${escapeHtml(t.name)}" maxlength="40" aria-label="Nom du thème"></td>
          <td class="num">${t.models_count || '<span class="muted">0</span>'}</td>
          <td class="theme-actions">
            <button type="button" class="btn btn-sm" data-merge ${themes.length < 2 ? 'disabled' : ''}>Fusionner…</button>
            <button type="button" class="icon-btn icon-btn-danger" data-delete aria-label="Supprimer le thème ${escapeHtml(t.name)}" title="Supprimer le thème">${TRASH}</button>
          </td>
        </tr>`).join('')}
        </tbody>
      </table>
      </div>
      ${unused ? `<p class="theme-note"><button type="button" class="btn btn-sm" id="cleanup-themes">Supprimer les ${unused} thème${unused > 1 ? 's' : ''} sans modèle</button></p>` : ''}`;
    wire();
  };

  const reload = async () => { themes = await api.get('themes'); draw(); };
  const findTheme = tr => themes.find(t => t.id === Number(tr.dataset.id));

  const wire = () => {
    box.querySelectorAll('tr[data-id]').forEach(tr => {
      const t = findTheme(tr);
      const dot = tr.querySelector('.theme-dot');

      tr.querySelector('.theme-color').addEventListener('change', async e => {
        const color = e.target.value || null;
        try {
          await api.put(`themes/${t.id}`, { color });
          t.color = color;
          color ? dot.setAttribute('data-color', color) : dot.removeAttribute('data-color');
        } catch (err) { toast(err.message, 'error'); e.target.value = t.color || ''; }
      });

      const nameInput = tr.querySelector('.theme-name');
      nameInput.addEventListener('change', async () => {
        const name = nameInput.value.replace(/\s+/g, ' ').trim();
        if (!name || name === t.name) { nameInput.value = t.name; return; }
        try {
          const row = await api.put(`themes/${t.id}`, { name });
          t.name = row.name;
          nameInput.value = row.name;
          toast('Thème renommé');
        } catch (err) { toast(err.message, 'error'); nameInput.value = t.name; }
      });
      nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); });

      tr.querySelector('[data-merge]').addEventListener('click', () => {
        const others = themes.filter(o => o.id !== t.id);
        openDialog({
          title: `Fusionner « ${t.name} »`, confirmLabel: 'Fusionner',
          build: b => {
            b.innerHTML = `<label class="field"><span>Fusionner dans</span>
              <select class="select" name="into">${others.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join('')}</select></label>
              <p class="panel-sub" style="margin-top:10px">${t.models_count
                ? `Les ${t.models_count} modèle${t.models_count > 1 ? 's' : ''} de « ${escapeHtml(t.name)} » passeront dans le thème choisi, `
                : ''}puis « ${escapeHtml(t.name)} » sera supprimé. Le nom et la couleur du thème choisi sont conservés.</p>`;
          },
          onConfirm: async b => {
            await api.post(`themes/${t.id}/merge`, { into: Number(b.querySelector('[name=into]').value) });
            toast('Thèmes fusionnés');
            await reload();
          },
        });
      });

      tr.querySelector('[data-delete]').addEventListener('click', async () => {
        const n = t.models_count;
        const ok = await confirmDialog('Supprimer le thème',
          n ? `« ${t.name} » sera retiré des ${n} modèle${n > 1 ? 's' : ''} qui le portent. Les modèles sont conservés.`
            : `« ${t.name} » sera supprimé.`);
        if (!ok) return;
        try { await api.del(`themes/${t.id}`); toast('Thème supprimé'); await reload(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });

    box.querySelector('#cleanup-themes')?.addEventListener('click', async () => {
      const ok = await confirmDialog('Supprimer les thèmes sans modèle',
        'Les thèmes qui ne sont portés par aucun modèle seront supprimés (nom et couleur compris).');
      if (!ok) return;
      try { const r = await api.post('themes/cleanup'); toast(`${r.deleted} thème${r.deleted > 1 ? 's' : ''} supprimé${r.deleted > 1 ? 's' : ''}`); await reload(); }
      catch (err) { toast(err.message, 'error'); }
    });
  };

  try { await reload(); }
  catch (e) { box.innerHTML = `<p class="muted">Thèmes indisponibles : ${escapeHtml(e.message)}</p>`; }
}
