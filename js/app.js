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
// ---------- geser kartu (swipe) untuk aksi cepat, misal menandai kegiatan selesai ----------
let sw = null, swipedAt = 0;
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-swipe]');
  if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
  sw = { el, fg: el.querySelector('.swipe-fg'), x: e.clientX, y: e.clientY, id: e.pointerId, on: false, dx: 0 };
});
document.addEventListener('pointermove', (e) => {
  if (!sw || e.pointerId !== sw.id || !sw.fg) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (!sw.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
    if (Math.abs(dx) < 10) return;
    sw.on = true; sw.fg.classList.add('dragging');
    try { sw.el.setPointerCapture(e.pointerId); } catch { /* abaikan */ }
  }
  const w = sw.el.offsetWidth, lim = Math.min(120, w * 0.35);
  sw.dx = sw.el.classList.contains('locked') ? Math.sign(dx) * Math.min(Math.abs(dx), 60) : dx; // belum waktunya: hanya bergeser sedikit
  sw.fg.style.transform = `translateX(${sw.dx}px)`;
  sw.el.classList.toggle('armed', Math.abs(sw.dx) >= lim);
});
function endSwipe(e) {
  if (!sw || (e && e.pointerId !== sw.id)) return;
  const s = sw; sw = null;
  if (!s.on) return;
  swipedAt = Date.now(); s.fg.classList.remove('dragging'); s.el.classList.remove('armed');
  const w = s.el.offsetWidth, locked = s.el.classList.contains('locked');
  const hit = e.type === 'pointerup' && (locked ? Math.abs(s.dx) >= 50 : Math.abs(s.dx) >= Math.min(120, w * 0.35));
  const fn = ACT[s.el.dataset.swipe];
  if (hit && !locked) { s.fg.style.transform = `translateX(${Math.sign(s.dx) * w}px)`; setTimeout(() => { if (fn) fn(s.el); else s.fg.style.transform = ''; }, 200); }
  else { s.fg.style.transform = ''; if (hit && fn) fn(s.el); } // terkunci: tampilkan info kapan bisa ditandai
}
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', endSwipe);
// setelah menggeser, jangan anggap sebagai ketukan
document.addEventListener('click', (e) => { if (Date.now() - swipedAt < 400 && e.target.closest('[data-swipe]')) { e.stopPropagation(); e.preventDefault(); } }, true);

document.addEventListener('change', (e) => { const el = e.target.closest('[data-chg]'); if (el && CHG[el.dataset.chg]) CHG[el.dataset.chg](el, e); });
document.addEventListener('input', (e) => { if (e.isComposing) return; const el = e.target.closest('[data-inp]'); if (el && INP[el.dataset.inp]) INP[el.dataset.inp](el, e); });
document.addEventListener('compositionend', (e) => { const el = e.target.closest('[data-inp]'); if (el && INP[el.dataset.inp]) INP[el.dataset.inp](el, e); });
document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.getAttribute('id') === 'sheetForm') { e.preventDefault(); submitSheet(f); return; }
  if (f.dataset.form && FORMS[f.dataset.form]) { e.preventDefault(); FORMS[f.dataset.form](f, e); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetOpen()) closeSheet(true);
  // Enter di formulir tanpa tombol kirim (misal profil onboarding) tetap mengirim formulir
  if (e.key === 'Enter' && !e.isComposing && e.target.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(e.target.type)) {
    const f = e.target.form;
    if (f && !f.querySelector('[type=submit], button:not([type])')) { e.preventDefault(); f.requestSubmit(); }
  }
});
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
  const busy = sw || sheetOpen() || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (!busy && ['hari', 'jadwal', 'kalender', 'kegiatan'].includes(n) && state.setup) render(false);
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
