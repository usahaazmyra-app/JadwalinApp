// Catatan per mapel: daftar & detail (dengan foto)
import { state, save, getFile, delFile } from '../store.js';
import { esc, stamp, uid, fmtShort, parseDT, isWide } from '../util.js';
import { mapelById, istilah } from '../logic.js';
import { ic, rootTop, subTop, mchip, empty, toast, confirmBox, openSheet, select } from '../ui.js';
import { addPhoto, mapelOpts, quickAdd } from '../forms.js';
import { register, rerender, go } from '../core.js';

let q = '', fm = '';
async function hydrate() {
  for (const img of document.querySelectorAll('img[data-file]')) { if (img.src) continue; const d = await getFile(img.dataset.file); if (d) img.src = d; }
}
function listHTML(selId) {
  const used = [...new Set(state.catatan.map((c) => c.mapelId).filter(Boolean))].map(mapelById).filter(Boolean);
  const list = state.catatan.filter((c) => (!fm || c.mapelId === fm) && (!q || (c.judul + ' ' + c.isi).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (b.diubah || '').localeCompare(a.diubah || ''));
  const card = (c) => `<a class="note${c.id === selId ? ' sel' : ''}" href="#/catatan/${c.id}">${c.foto?.[0] ? `<span class="note-ph"><img data-file="${c.foto[0]}" alt=""></span>` : ''}${mchip(mapelById(c.mapelId))}<b>${esc(c.judul)}</b><span class="small muted clamp3">${esc(c.isi || '')}</span><span class="small muted" style="font-size:12px">${c.diubah ? fmtShort(parseDT(c.diubah)) : ''}</span></a>`;
  const half = Math.ceil(list.length / 2);
  return `${subTop('Catatan', '#/lainnya', `<button class="icon-btn" type="button" data-act="noteNew" aria-label="Catatan baru">${ic('plus')}</button>`)}
${state.catatan.length ? `<label class="search">${ic('search')}<input type="search" data-inp="noteQ" value="${esc(q)}" placeholder="Cari catatan" aria-label="Cari catatan"></label>
<div class="picks"><label class="pick"><input type="radio" name="nf" value="" ${!fm ? 'checked' : ''} data-chg="noteFilter"><span>Semua</span></label>${used.map((m) => `<label class="pick"><input type="radio" name="nf" value="${m.id}" ${fm === m.id ? 'checked' : ''} data-chg="noteFilter"><span>${esc(m.nama)}</span></label>`).join('')}</div>` : ''}
${list.length ? `<div class="notes"><div class="col" style="gap:12px">${list.slice(0, half).map(card).join('')}</div><div class="col" style="gap:12px">${list.slice(half).map(card).join('')}</div></div>` : empty('note', state.catatan.length ? 'Tidak ada yang cocok' : 'Belum ada catatan', state.catatan.length ? 'Coba kata kunci lain.' : 'Simpan rumus, ringkasan materi, atau foto papan tulis per mapel.', state.catatan.length ? '' : `<button class="btn btn-primary" type="button" data-act="noteNew">${ic('plus')}Catatan baru</button>`)}`;
}
function detailHTML(c) {
  return `<div class="row wrap" style="gap:8px"><div style="min-width:180px;flex:1">${select(istilah().mapel, 'mapelId', mapelOpts(), c.mapelId, `data-chg="noteMapel" data-id="${c.id}"`)}</div><span class="small muted" style="align-self:flex-end;padding-bottom:14px">Diubah ${c.diubah ? fmtShort(parseDT(c.diubah)) + ' ' + c.diubah.slice(11, 16).replace(':', '.') : ''}</span></div>
<input class="title-input" value="${esc(c.judul)}" data-inp="noteEdit" data-id="${c.id}" data-k="judul" aria-label="Judul catatan" maxlength="120" placeholder="Judul">
<div class="thumbs">${(c.foto || []).map((f) => `<div class="thumb lg"><button type="button" class="thumb-img" data-act="notePhotoView" data-file="${f}" aria-label="Lihat foto"><img data-file="${f}" alt="Foto catatan"></button><button type="button" class="thumb-x" data-act="notePhotoDel" data-id="${c.id}" data-file="${f}" aria-label="Hapus foto">${ic('x', 14)}</button></div>`).join('')}<button type="button" class="thumb add" data-act="notePhotoAdd" data-id="${c.id}">${ic('camera', 22)}<span>Foto papan tulis</span></button></div>
<textarea class="note-area" data-inp="noteEdit" data-id="${c.id}" data-k="isi" aria-label="Isi catatan" placeholder="Tulis catatan…">${esc(c.isi || '')}</textarea>
<div class="row"><span class="small muted grow">Tersimpan otomatis.</span><button type="button" class="btn btn-danger btn-sm" data-act="noteDel" data-id="${c.id}">${ic('trash', 18)}Hapus</button></div>`;
}
function catatan(params) {
  const c = params[0] && state.catatan.find((x) => x.id === params[0]);
  if (params[0] && !c) return { html: `<div class="page narrow">${subTop('Catatan', '#/catatan')}${empty('alert', 'Catatan tidak ditemukan', 'Mungkin sudah dihapus.')}</div>` };
  if (isWide()) return { after: hydrate, html: `<div class="split"><section class="pane-list">${listHTML(c?.id)}</section><section class="pane-detail">${c ? `<div class="detail">${detailHTML(c)}</div>` : empty('note', 'Pilih catatan', 'Catatan yang dipilih tampil di sini.')}</section></div>` };
  if (c) return { after: hydrate, html: `<div class="page narrow">${subTop('Catatan', '#/catatan')}${detailHTML(c)}</div>` };
  return { after: hydrate, html: `<div class="page narrow">${listHTML()}</div>` };
}
const find = (id) => state.catatan.find((c) => c.id === id);
register({
  views: { catatan },
  actions: {
    noteNew: () => { const c = { id: uid(), judul: '', isi: '', mapelId: fm || '', foto: [], dibuat: stamp(), diubah: stamp() }; state.catatan.unshift(c); save(); go(`#/catatan/${c.id}`); setTimeout(() => document.querySelector('.title-input')?.focus(), 80); },
    noteDel: async (el) => { const c = find(el.dataset.id); if (!(await confirmBox('Hapus catatan ini beserta fotonya?', { ok: 'Hapus', danger: true, title: 'Hapus catatan?' }))) return; (c.foto || []).forEach(delFile); state.catatan = state.catatan.filter((x) => x !== c); save(); toast('Catatan dihapus'); go('#/catatan'); },
    notePhotoAdd: async (el) => { const c = find(el.dataset.id); const id = await addPhoto(); if (!id) return; c.foto = [...(c.foto || []), id]; c.diubah = stamp(); save(); rerender(); },
    notePhotoDel: async (el) => { const c = find(el.dataset.id); if (!(await confirmBox('Hapus foto ini?', { ok: 'Hapus', danger: true, title: 'Hapus foto?' }))) return; c.foto = c.foto.filter((f) => f !== el.dataset.file); delFile(el.dataset.file); save(); rerender(); },
    notePhotoView: async (el) => { const d = await getFile(el.dataset.file); if (d) openSheet({ title: 'Foto', body: `<img src="${d}" alt="Foto catatan" class="photo-full">` }); },
  },
  changes: {
    noteFilter: (el) => { fm = el.value; rerender(); },
    noteMapel: (el) => { const c = find(el.dataset.id); c.mapelId = el.value; c.diubah = stamp(); save(); if (isWide()) rerender(); },
  },
  inputs: {
    noteEdit: (el) => { const c = find(el.dataset.id); if (!c) return; c[el.dataset.k] = el.value; c.diubah = stamp(); save(); },
    noteQ: (el) => { q = el.value; rerender(); const i = document.querySelector('[data-inp="noteQ"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  },
});
export { quickAdd };
