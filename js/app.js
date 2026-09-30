// Titik masuk aplikasi: router, shell, event, service worker, pengingat
import { load, state, save, flush } from './store.js';
import { $, isWide } from './util.js';
import { ACT, CHG, INP, VIEWS, FORMS, setRenderer } from './core.js';
import { closeSheet, submitSheet, sheetOpen, ic, toast, onPopState, cancelPendingBack } from './ui.js';
import { quickAdd } from './forms.js';
import { applyTheme } from './theme.js';
import { checkReminders } from './notify.js';
import './views/onboarding.js';
import './views/today.js';
import './views/jadwal.js';
import './views/tugas.js';
import './views/kalender.js';
import './views/catatan.js';
import './views/lainnya.js';

const TABS = [['hari', 'Hari Ini', 'home', '#/'], ['jadwal', 'Jadwal', 'grid', '#/jadwal'], ['tugas', 'Tugas', 'checksq', '#/tugas'], ['kalender', 'Kalender', 'calendar', '#/kalender'], ['lainnya', 'Lainnya', 'dots', '#/lainnya']];
const OPEN_BEFORE_SETUP = new Set(['mulai', 'backup', 'bantuan']);

function route() {
  const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  let name = parts[0] || 'hari';
  let params = parts.slice(1);
  if (name === 'jadwal' && ['pola', 'libur', 'mapel'].includes(params[0])) { name = params[0]; params = params.slice(1); }
  return { name, params };
}

function navHTML(active) {
  return `<span class="rail-logo" aria-hidden="true">${ic('calendar', 24)}</span><button type="button" class="rail-add" data-act="quickAdd" aria-label="Tambah cepat">${ic('plus', 26, 2.4)}</button>
${TABS.map(([k, t, i, h]) => `<a class="tab${k === active ? ' on' : ''}" href="${h}" ${k === active ? 'aria-current="page"' : ''}><span class="tabicon">${ic(i, 22)}</span>${t}</a>`).join('')}`;
}

let lastName = '', lastNote = '';
function render(resetScroll = true) {
  const { name, params } = route();
  if (name === 'tambah') { history.replaceState(null, '', '#/'); render(true); setTimeout(() => quickAdd(), 50); return; }
  if (!state.setup && !OPEN_BEFORE_SETUP.has(name)) { history.replaceState(null, '', '#/mulai'); return render(true); }
  // bersihkan catatan kosong saat meninggalkannya
  if (lastNote && !(name === 'catatan' && params[0] === lastNote)) {
    const c = state.catatan.find((x) => x.id === lastNote);
    if (c && !c.judul.trim() && !(c.isi || '').trim() && !(c.foto || []).length) { state.catatan = state.catatan.filter((x) => x !== c); save(); }
  }
  lastNote = name === 'catatan' ? params[0] || '' : '';
  const fn = VIEWS[name];
  const res = fn ? fn(params) : { html: `<div class="page narrow"><div class="empty"><strong>Halaman tidak ditemukan</strong><a class="btn btn-primary" href="#/">Ke beranda</a></div></div>` };
  const view = $('#view');
  view.innerHTML = res.html;
  const tab = res.tab || (['pola', 'libur', 'mapel'].includes(name) ? 'jadwal' : ['kegiatan', 'ujian'].includes(name) ? 'kalender' : name === 'tugas' ? 'tugas' : ['hari', 'bawaan'].includes(name) ? 'hari' : ['lainnya', 'pengingat', 'backup', 'profil', 'progres', 'fokus', 'bantuan', 'catatan', 'ringkasan'].includes(name) ? 'lainnya' : '');
  document.body.classList.toggle('bare', !!res.bare);
  document.body.classList.toggle('root-tab', !!res.tab);
  $('#nav').innerHTML = navHTML(tab);
  $('#fab').hidden = !(res.tab && res.tab !== 'lainnya') && !res.fab;
  if (resetScroll || name !== lastName) window.scrollTo(0, 0);
  lastName = name;
  if (res.after) res.after();
  const h1 = view.querySelector('h1');
  document.title = h1 ? `${h1.textContent.trim()} · Jadwalin` : 'Jadwalin';
}
setRenderer(render);

ACT.quickAdd = () => quickAdd();
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (fn) { if (el.tagName === 'BUTTON' || el.getAttribute('href') === null) e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', (e) => { const el = e.target.closest('[data-chg]'); if (el && CHG[el.dataset.chg]) CHG[el.dataset.chg](el, e); });
document.addEventListener('input', (e) => { if (e.isComposing) return; const el = e.target.closest('[data-inp]'); if (el && INP[el.dataset.inp]) INP[el.dataset.inp](el, e); });
document.addEventListener('compositionend', (e) => { const el = e.target.closest('[data-inp]'); if (el && INP[el.dataset.inp]) INP[el.dataset.inp](el, e); });
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.getAttribute('id') === 'sheetForm') { e.preventDefault(); submitSheet(f); return; }
  if (f.dataset.form && FORMS[f.dataset.form]) { e.preventDefault(); FORMS[f.dataset.form](f, e); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen()) closeSheet(true); });
// riwayat navigasi di dalam aplikasi, supaya tombol Kembali kembali ke halaman asal
const stack = [location.hash || '#/'];
window.addEventListener('hashchange', () => {
  cancelPendingBack();
  const h = location.hash || '#/';
  if (stack.length > 1 && stack[stack.length - 2] === h) stack.pop(); else stack.push(h);
  if (stack.length > 50) stack.shift();
  if (sheetOpen()) closeSheet(true, true);
  render(true);
});
window.addEventListener('popstate', () => { onPopState(); });
ACT.goBack = (el, e) => { if (stack.length > 1) { e.preventDefault(); history.back(); } };
window.matchMedia('(min-width: 900px)').addEventListener?.('change', () => render(false));

// segarkan beranda tiap menit (jam pelajaran berjalan)
setInterval(() => {
  const n = route().name;
  const busy = sheetOpen() || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (!busy && ['hari', 'jadwal', 'kalender'].includes(n) && state.setup) render(false);
}, 60000);
setInterval(checkReminders, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { checkReminders(); if (!sheetOpen()) render(false); } else flush(); });

async function start() {
  await load();
  applyTheme();
  if (state.setup && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  render(true);
  document.body.classList.remove('loading');
  checkReminders();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', async () => { if (!hadController || reloaded) return; reloaded = true; await flush(); location.reload(); });
      reg.update?.().catch(() => {});
    } catch (err) { console.warn('SW gagal', err); }
    navigator.serviceWorker.addEventListener?.('message', (e) => { if (e.data?.url) location.hash = e.data.url; });
  }
}
start();
