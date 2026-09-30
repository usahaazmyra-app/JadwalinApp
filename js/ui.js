// Komponen UI: ikon, chip, baris tugas, header, sheet/dialog, toast
import { $, esc, jam, iso } from './util.js';
import { state } from './store.js';
import { PAL, mapelById, taskStatus, kgDone, kgStarted, kgEnd } from './logic.js';
import { nav, go } from './core.js';

const I = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  checksq: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.5 3.5 5.2"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  chart: '<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  bag: '<path d="M6 9a6 6 0 0 1 12 0v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M9 6V5a3 3 0 0 1 6 0v1M9 14h6"/>',
  cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>',
  school: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M12 10v2"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2M9 9.5v.5M15 9.5v.5"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h16M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  wifioff: '<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-2.5-1.8M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5"/><path d="M12 20h.01"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
  shirt: '<path d="M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
};
export function ic(n, s = 20, sw = 2) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
}

export const STATUS = { late: ['#FEE2E2', '#B91C1C'], today: ['#FFEDD5', '#C2410C'], week: ['#FEF9C3', '#854D0E'], later: ['#F1F0F5', '#46455A'], done: ['#DCFCE7', '#166534'], ekskul: ['#FFE4E6', '#BE123C'], les: ['#E0F2FE', '#0369A1'], lainnya: ['#F3E8FF', '#7E22CE'], ujian: ['#FEF3C7', '#92400E'], accent: ['var(--accent-soft)', 'var(--accent-ink)'] };
export const schip = (kind, text) => { const [bg, fg] = STATUS[kind] || STATUS.later; return `<span class="chip" style="background:${bg};color:${fg}">${esc(text)}</span>`; };
export const gchip = (text) => `<span class="chip chip-gray">${esc(text)}</span>`;
export function mcol(m) { return PAL[(m?.warna ?? 12) % PAL.length]; }
export function mchip(m, label) {
  if (!m) return gchip(label || 'Tanpa mapel');
  const [bg, fg] = mcol(m); return `<span class="chip" style="background:${bg};color:${fg}">${esc(label || m.nama)}</span>`;
}
export function mdot(m, s = 36) {
  const [bg, fg] = mcol(m);
  return `<span class="dot" style="background:${bg};color:${fg};width:${s}px;height:${s}px">${esc(m ? m.singkat : '—')}</span>`;
}

export function rootTop(eyebrow, title, right = '') {
  return `<header class="top"><div class="col" style="gap:4px"><span class="eyebrow">${eyebrow}</span><h1 class="h1">${title}</h1></div><div class="row" style="gap:8px">${right}</div></header>`;
}
export function subTop(title, backHref, right = '') {
  return `<header class="top"><a class="icon-btn" href="${backHref}" data-act="goBack" aria-label="Kembali">${ic('left')}</a><h1 class="h2 grow" style="font-size:18px">${title}</h1>${right}</header>`;
}
export function sect(title, linkText, href) {
  const l = linkText ? `<a class="link" href="${href}">${linkText}${ic('right', 16)}</a>` : '';
  return `<div class="sect"><h2 class="h2">${title}</h2>${l}</div>`;
}
export const grp = (t, n) => `<div class="grp"><span>${t}</span>${n != null ? `<span class="chip chip-gray" style="height:22px">${n}</span>` : ''}</div>`;

export function taskRow(t, { big = false, sel = false } = {}) {
  const st = taskStatus(t);
  const m = mapelById(t.mapelId);
  const done = t.selesai;
  return `<div class="task${sel ? ' sel' : ''}"><input type="checkbox" class="check${big ? ' big' : ''}" data-chg="toggleTask" data-id="${t.id}" aria-label="Tandai selesai: ${esc(t.judul)}" ${done ? 'checked' : ''}>
<a class="task-body" href="#/tugas/${t.id}"><span class="task-title${done ? ' struck' : ''}"${big ? ' style="font-size:18px"' : ''}>${esc(t.judul)}</span>
<span class="row wrap" style="gap:6px">${mchip(m)}${done ? '' : schip(st.kind, st.label)}${st.meta && !done ? `<span class="small muted">${esc(st.meta)}</span>` : ''}${done && t.selesaiAt ? `<span class="small muted">Selesai ${esc(t.selesaiAt.slice(8, 10))}/${esc(t.selesaiAt.slice(5, 7))}</span>` : ''}</span></a></div>`;
}

export function empty(icon, title, text, btn = '') {
  return `<div class="empty"><span class="ibox big">${ic(icon, 30)}</span><strong>${title}</strong><span class="muted">${text}</span>${btn}</div>`;
}

export const field = (label, name, value = '', type = 'text', attrs = '') => {
  const inp = `<input id="f-${name}" class="input" name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`;
  const pick = type === 'time' || type === 'date';
  return `<div class="field"><label for="f-${name}">${label}</label>${pick ? `<div class="inwrap">${inp}<span class="in-ic" aria-hidden="true">${ic(type === 'time' ? 'clock' : 'calendar', 18)}</span></div>` : inp}</div>`;
};
export const area = (label, name, value = '', attrs = '') =>
  `<div class="field"><label for="f-${name}">${label}</label><textarea id="f-${name}" class="input area" name="${name}" ${attrs}>${esc(value)}</textarea></div>`;
export function select(label, name, opts, value, attrs = '') {
  const o = opts.map((x) => { const [v, t] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`; }).join('');
  return `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" class="input" name="${name}" ${attrs}>${o}</select></div>`;
}
export function seg(name, opts, value, attrs = '') {
  return `<div class="seg" role="radiogroup" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map((x) => { const [v, t] = Array.isArray(x) ? x : [x, x]; return `<label><input type="radio" name="${name}" value="${esc(v)}" ${String(v) === String(value) ? 'checked' : ''} ${attrs}><span>${esc(t)}</span></label>`; }).join('')}</div>`;
}
export function segl(items) {
  return `<div class="seg" style="grid-template-columns:repeat(${items.length},minmax(0,1fr))">${items.map(([t, h, on]) => `<a href="${h}" class="${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}><span>${t}</span></a>`).join('')}</div>`;
}
export function picks(name, opts, value, { multi = false, attrs = '' } = {}) {
  const vals = multi ? new Set((value || []).map(String)) : new Set([String(value)]);
  return `<div class="picks">${opts.map((x) => { const [v, t] = Array.isArray(x) ? x : [x, x]; return `<label class="pick"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${esc(v)}" ${vals.has(String(v)) ? 'checked' : ''} ${attrs}><span>${t}</span></label>`; }).join('')}</div>`;
}
export function swRow(title, desc, name, on, attrs = '') {
  return `<label class="set-row"><span class="col grow" style="gap:2px"><span style="font-weight:700">${title}</span>${desc ? `<span class="small muted">${desc}</span>` : ''}</span><input type="checkbox" class="switch" name="${name}" ${on ? 'checked' : ''} ${attrs}></label>`;
}

// ---------- toast ----------
let toastT;
export function toast(msg, action) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg;
  if (action) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-btn'; b.textContent = action.label || 'Urungkan';
    b.addEventListener('click', (e) => { e.stopPropagation(); t.classList.remove('show'); t.hidden = true; clearTimeout(toastT); action.run(); });
    t.appendChild(b);
  }
  t.hidden = false; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('show'); t.hidden = true; }, action ? 5000 : 2600);
}

// ---------- kegiatan (bisa digeser untuk menandai selesai) ----------
export const kgKat = (k) => (k.kategori === 'les' ? ['les', 'Les'] : k.kategori === 'ekskul' ? ['ekskul', 'Ekskul'] : ['lainnya', 'Lainnya']);
export function kgState(k, d, now = new Date()) {
  if (kgDone(k, d)) return 'done';
  if (!kgStarted(k, d, now)) return 'soon';
  return now < kgEnd(k, d) ? 'live' : 'past';
}
export function kgRow(k, d) {
  const st = kgState(k, d), done = st === 'done';
  const chip = done ? schip('done', 'Selesai') : st === 'live' ? schip('today', 'Berlangsung') : schip(...kgKat(k));
  const lbl = done ? `${ic('reset', 18)}Batal selesai` : `${ic('check', 18)}Selesai`;
  return `<div class="swipe${done ? ' undo' : ''}${st === 'soon' ? ' locked' : ''}" data-swipe="kgDone" data-id="${k.id}" data-d="${iso(d)}"><div class="swipe-bg" aria-hidden="true"><span>${lbl}</span><span>${lbl}</span></div>`
    + `<button type="button" class="list-item swipe-fg${done ? ' is-done' : ''}" data-act="kgOpen" data-id="${k.id}" data-d="${iso(d)}" aria-label="${esc(k.nama)}, ${jam(k.mulai)}${done ? ', selesai' : ''}. Buka detail"><span class="tcol"><b>${jam(k.mulai)}</b><span class="small muted">${jam(k.selesai)}</span></span><span class="col grow" style="gap:2px;text-align:left"><b class="kg-t">${esc(k.nama)}</b><span class="small muted">${esc(k.lokasi || '')}</span></span>${chip}</button></div>`;
}

// ---------- sheet / dialog ----------
let ctx = null;
export function openSheet({ title, body, submit = 'Simpan', onSubmit = null, left = '', onClose = null, danger = false, disabled = false }) {
  const o = $('#overlay');
  const returnTo = ctx ? ctx.returnTo : document.activeElement;
  body = body.replace(/(id|for)="f-/g, '$1="s-');
  o.innerHTML = `<div class="scrim" data-act="closeSheet"></div><form class="sheet" id="sheetForm" novalidate role="dialog" aria-modal="true" aria-label="${esc(title.replace(/<[^>]+>/g, ''))}"><div class="grab"></div><div class="sheet-head"><h2 class="h2">${title}</h2><button type="button" class="icon-btn" data-act="closeSheet" aria-label="Tutup">${ic('x')}</button></div><div class="sheet-body">${body}<p class="form-error" role="alert" hidden></p></div>${onSubmit ? `<div class="sheet-foot">${left}<button class="btn ${danger ? 'btn-dangerfill' : 'btn-primary'} grow" type="submit" ${disabled ? 'disabled' : ''}>${submit}</button></div>` : ''}</form>`;
  o.hidden = false;
  ctx = { onSubmit, onClose, returnTo };
  // entri riwayat agar tombol Kembali HP menutup sheet, bukan pindah halaman
  if (!sheetEntry) { try { history.pushState({ jwSheet: 1 }, ''); sheetEntry = true; } catch { /* abaikan */ } }
  document.body.classList.add('noscroll');
  setTimeout(() => { const a = o.querySelector('[autofocus]'); if (a) a.focus(); }, 60);
}
let sheetEntry = false;
function flushGo() { const p = nav.pending; nav.pending = null; if (p) go(p[0], p[1]); }
// dipanggil saat popstate (tombol Kembali). true bila sudah ditangani.
// halaman berganti lewat tautan saat sheet baru ditutup: jangan mundurkan riwayat
export function cancelPendingBack() { if (nav.holding && sheetEntry) sheetEntry = false; }
export function onPopState() {
  dlgCancel();
  if (nav.holding) { nav.holding = false; flushGo(); return true; }
  if (ctx) { sheetEntry = false; closeSheet(true, true); return true; }
  return false;
}
export function closeSheet(cancelled = true, fromNav = false) {
  const o = $('#overlay'); if (!o) return;
  dlgCancel();
  const c = ctx; ctx = null;
  o.hidden = true; o.innerHTML = ''; document.body.classList.remove('noscroll');
  if (c && c.returnTo && document.contains(c.returnTo)) { try { c.returnTo.focus({ preventScroll: true }); } catch { /* abaikan */ } }
  if (fromNav) sheetEntry = false;
  else if (sheetEntry) {
    nav.holding = true;
    const h0 = location.hash;
    setTimeout(() => {
      if (!sheetEntry || ctx || location.hash !== h0) { if (location.hash !== h0) sheetEntry = false; nav.holding = false; flushGo(); return; } // dibatalkan, atau sheet lain langsung dibuka
      sheetEntry = false; history.back();
    }, 0);
  }
  if (cancelled && c && c.onClose) c.onClose();
}
export function sheetOpen() { return !!ctx; }
export function submitSheet(form) {
  if (!ctx || !ctx.onSubmit) return;
  const fd = new FormData(form);
  const c = ctx;
  const err = c.onSubmit(fd, form);
  if (typeof err === 'string') { const e = form.querySelector('.form-error'); e.textContent = err; e.hidden = false; return; }
  if (err === false) return; // tetap terbuka (mis. sheet diganti)
  if (ctx === c) closeSheet(false);
}
// Konfirmasi sebelum aksi yang tidak bisa dibatalkan.
// Bila sebuah sheet sedang terbuka (misal form Ubah), dialog tampil DI ATAS sheet itu
// sehingga menekan Batal tidak menghilangkan isian form.
let dlgDone = null;
export const dlgOpen = () => !!dlgDone;
export function dlgCancel() { if (dlgDone) dlgDone(false); }
export function confirmBox(msg, { ok = 'Ya, lanjutkan', danger = false, title = 'Yakin?', cancel = 'Batal' } = {}) {
  if (dlgDone) dlgDone(false);
  if (!ctx) {
    return new Promise((res) => {
      openSheet({ title, body: `<p class="p">${msg}</p>`, submit: ok, danger, left: `<button type="button" class="btn btn-line" data-act="closeSheet">${cancel}</button>`, onSubmit: () => { res(true); }, onClose: () => res(false) });
    });
  }
  return new Promise((res) => {
    let d = $('#dlg');
    if (!d) { d = document.createElement('div'); d.id = 'dlg'; document.body.appendChild(d); }
    const prevFocus = document.activeElement;
    d.innerHTML = `<div class="dlg-scrim" data-dlg="0"></div><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlgT" aria-describedby="dlgM"><h2 class="h2" id="dlgT">${title}</h2><p class="p" id="dlgM">${msg}</p><div class="row dlg-foot"><button type="button" class="btn btn-line grow" data-dlg="0">${cancel}</button><button type="button" class="btn ${danger ? 'btn-dangerfill' : 'btn-primary'} grow" data-dlg="1">${ok}</button></div></div>`;
    d.hidden = false;
    const onClick = (e) => { const b = e.target.closest('[data-dlg]'); if (b) { e.preventDefault(); e.stopPropagation(); dlgDone(b.dataset.dlg === '1'); } };
    d.addEventListener('click', onClick);
    dlgDone = (v) => {
      dlgDone = null; d.removeEventListener('click', onClick); d.hidden = true; d.innerHTML = '';
      if (prevFocus && document.contains(prevFocus)) { try { prevFocus.focus({ preventScroll: true }); } catch { /* abaikan */ } }
      res(v);
    };
    setTimeout(() => d.querySelector('[data-dlg="0"]')?.focus(), 30);
  });
}
