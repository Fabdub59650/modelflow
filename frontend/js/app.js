import { api } from './api.js';
import { toast } from './ui.js';
import { renderModels } from './views/models.js';
import { renderSettings } from './views/settings.js';
import { initTheme } from './theme.js';
import { initUpdateBadge } from './updates.js';

// Routes : #/  (liste des modèles)   #/modele/12  (liste + fiche du modèle 12)   #/parametres
const routes = [
  { re: /^#?\/?$/,         view: renderModels,   nav: 'models' },
  { re: /^#\/modele\/(\d+)$/, view: renderModels, nav: 'models' },
  { re: /^#\/parametres$/, view: renderSettings, nav: 'settings' },
];

let currentCleanup = null;

async function route() {
  const hash = location.hash || '#/';
  const match = routes.map(r => ({ r, m: hash.match(r.re) })).find(x => x.m);
  const content = document.getElementById('content');
  if (currentCleanup) { try { currentCleanup(); } catch (_) {} currentCleanup = null; }

  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', !!match && a.dataset.nav === match.r.nav));

  if (!match) { location.hash = '#/'; return; }
  content.innerHTML = '<p class="loading">Chargement…</p>';
  try {
    currentCleanup = await match.r.view(content, ...match.m.slice(1)) || null;
  } catch (e) {
    content.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = e.message;
    content.appendChild(p);
    toast(e.message, 'error');
  }
}

async function init() {
  initTheme();
  initUpdateBadge();
  try {
    const meta = await api.get('meta');
    document.getElementById('app-version').textContent = 'v' + meta.version;
  } catch (_) {}
  window.addEventListener('hashchange', route);
  route();
}

init();

// Hauteur réelle de la barre du haut (2 lignes sur téléphone) : l'entête de page s'y accroche
{
  const tb = document.querySelector('.topbar');
  if (tb) {
    const setH = () => document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
    setH();
    if (window.ResizeObserver) new ResizeObserver(setH).observe(tb);
  }
}
