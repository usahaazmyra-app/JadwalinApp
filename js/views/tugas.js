// Tugas: daftar & filter, detail (langkah, anggota, lampiran), riwayat selesai
import { state, save, getFile, delFile } from '../store.js';
import { esc, stamp, uid, fmtLong, jam, parseDT, isWide, today, addDays, mondayOf, iso, fmtRange, jam as J } from '../util.js';
import { groupTasks, openTasks, taskStatus, mapelById, isSD, JENIS_TUGAS, streak, sortTasks } from '../logic.js';
import { ic, rootTop, subTop, sect, grp, taskRow, schip, gchip, mchip, segl, empty, toast, confirmBox, openSheet } from '../ui.js';
import { taskForm, addPhoto, quickAdd } from '../forms.js';
import { register, rerender, go } from '../core.js';

let filter = 'Semua', q = '', showSearch = false;
const title = () => (isSD() ? 'PR-ku' : 'Tugas');

function listHTML(selId) {
  const open = openTasks();
  let list = open.filter((t) => (filter === 'Semua' || t.jenis === filter) && (!q || t.judul.toLowerCase().includes(q.toLowerCase())));
  const g = groupTasks(list);
  const late = g.late.length;
  const rows = (arr) => arr.map((t) => taskRow(t, { sel: t.id === selId, big: isSD() })).join('');
  const groups = [['Terlambat', g.late], ['Hari ini', g.today], ['Minggu ini', g.week], ['Nanti', g.later]].filter(([, a]) => a.length).map(([n, a]) => `${grp(n, a.length)}<div class="list">${rows(a)}</div>`).join('');
  const chips = `<div class="picks">${['Semua', ...JENIS_TUGAS].map((j) => `<label class="pick"><input type="radio" name="tf" value="${j}" ${j === filter ? 'checked' : ''} data-chg="tFilter"><span>${j}</span></label>`).join('')}</div>`;
  const emptyState = open.length
    ? empty('search', 'Tidak ada yang cocok', 'Coba filter atau kata kunci lain.')
    : empty('checksq', 'Belum ada tugas, santai dulu.', 'Tekan + untuk mencatat tugas pertamamu. Mapel terisi otomatis dari jadwal.', `<button class="btn btn-primary" type="button" data-act="quickAdd">${ic('plus')}Tambah tugas</button><a class="btn btn-line" href="#/backup">${ic('upload')}Impor dari ketua kelas</a>`);
  return `${rootTop(`${open.length} belum selesai${late ? ` · ${late} terlambat` : ''}`, title(), `<button class="icon-btn" type="button" data-act="tSearch" aria-label="Cari tugas">${ic('search')}</button>`)}
${showSearch ? `<label class="search">${ic('search')}<input type="search" data-inp="tQ" value="${esc(q)}" placeholder="Cari judul tugas" aria-label="Cari tugas" autofocus></label>` : ''}
${segl([[`Belum (${open.length})`, '#/tugas', true], ['Selesai', '#/tugas/selesai', false]])}
${open.length ? chips : ''}
${groups || emptyState}`;
}

async function hydratePhotos() {
  for (const img of document.querySelectorAll('img[data-file]')) {
    if (img.src) continue;
    const d = await getFile(img.dataset.file); if (d) img.src = d; else img.closest('.thumb')?.classList.add('missing');
  }
}

function detailHTML(t) {
  const st = taskStatus(t);
  const m = mapelById(t.mapelId);
  const L = t.langkah || [], A = t.anggota || [];
  const dl = t.deadline ? parseDT(t.deadline) : null;
  const n = state.settings.notif;
  const remind = t.ingat === false ? 'Pengingat dimatikan' : [n.h1 ? `H-1 pukul ${jam(n.jamH1)}` : '', n.dekat ? `${n.dekatJam} jam sebelum deadline` : ''].filter(Boolean).join(' dan ') || 'Pengingat tugas dimatikan di pengaturan';
  return `<div class="col" style="gap:12px"><h1 class="h1">${esc(t.judul)}</h1><div class="row wrap" style="gap:6px">${mchip(m)}${gchip(t.jenis || 'Tugas')}${t.prioritas ? `<span class="chip chip-gray">${ic('flag', 14)}Prioritas tinggi</span>` : ''}${t.selesai ? schip('done', 'Selesai') : ''}</div></div>
<div class="card"><div class="row"><span class="ibox">${ic('calendar')}</span><span class="col grow" style="gap:2px"><b>${dl ? fmtLong(dl) : 'Tanpa deadline'}</b><span class="small muted">${dl ? 'Pukul ' + jam(t.deadline.slice(11, 16)) : ''}</span></span>${t.selesai ? '' : schip(st.kind, st.label)}</div><div class="hr"></div><span class="row small muted" style="gap:8px">${ic('bell', 18)}${esc(remind)}</span></div>
${t.instruksi || t.format ? `<div class="card">${t.instruksi ? `<span class="eyebrow">Instruksi</span><p class="p pre">${esc(t.instruksi)}</p>` : ''}${t.format ? `<span class="eyebrow">Format pengumpulan</span><div class="row wrap" style="gap:6px">${t.format.split(',').map((x) => gchip(x.trim())).join('')}</div>` : ''}</div>` : `<button type="button" class="card add-card" data-act="tEdit" data-id="${t.id}">${ic('plus', 18)}Tambah instruksi &amp; format pengumpulan</button>`}
${sect(`Langkah${L.length ? ` · ${L.filter((x) => x.done).length} dari ${L.length}` : ''}`)}
<div class="list">${L.map((x) => `<div class="checkrow"><input type="checkbox" class="check" data-chg="stepToggle" data-t="${t.id}" data-id="${x.id}" ${x.done ? 'checked' : ''} aria-label="${esc(x.teks)}"><span class="grow${x.done ? ' struck' : ''}">${esc(x.teks)}</span><button type="button" class="icon-btn sm" data-act="stepDel" data-t="${t.id}" data-id="${x.id}" aria-label="Hapus langkah">${ic('x', 16)}</button></div>`).join('')}
<form class="checkrow" data-form="stepAdd" data-t="${t.id}"><span style="color:var(--accent-ink)">${ic('plus', 20)}</span><input class="bare grow" name="teks" placeholder="Tambah langkah" aria-label="Tambah langkah" maxlength="120"></form></div>
${t.jenis === 'Kelompok' || A.length ? `${sect('Pembagian tugas')}<div class="list">${A.map((a) => `<div class="list-item"><span class="avatar">${esc(a.nama.trim()[0] || '?').toUpperCase()}</span><span class="col grow" style="gap:2px"><b>${esc(a.nama)}</b><span class="small muted">${esc(a.bagian || '')}</span></span><button type="button" class="chip-btn" data-act="memToggle" data-t="${t.id}" data-id="${a.id}">${a.done ? schip('done', 'Selesai') : schip('later', 'Belum')}</button><button type="button" class="icon-btn sm" data-act="memDel" data-t="${t.id}" data-id="${a.id}" aria-label="Hapus anggota">${ic('x', 16)}</button></div>`).join('')}
<form class="list-item" data-form="memAdd" data-t="${t.id}" style="gap:8px"><input class="input grow" name="nama" placeholder="Nama" aria-label="Nama anggota" maxlength="40"><input class="input grow" name="bagian" placeholder="Bagian" aria-label="Bagian" maxlength="60"><button class="icon-btn" type="submit" aria-label="Tambah anggota">${ic('plus')}</button></form></div>` : ''}
${sect('Lampiran')}
<div class="thumbs">${(t.lampiran || []).map((f) => `<div class="thumb"><button type="button" class="thumb-img" data-act="photoView" data-file="${f}" aria-label="Lihat foto"><img data-file="${f}" alt="Lampiran"></button><button type="button" class="thumb-x" data-act="photoDel" data-t="${t.id}" data-file="${f}" aria-label="Hapus foto">${ic('x', 14)}</button></div>`).join('')}
<button type="button" class="thumb add" data-act="photoAdd" data-t="${t.id}">${ic('camera', 22)}<span>Tambah foto</span></button></div>
<div class="row wrap detail-actions"><button type="button" class="btn btn-line" data-act="tEdit" data-id="${t.id}">${ic('edit', 18)}Ubah</button><button type="button" class="btn btn-danger" data-act="tDel" data-id="${t.id}">${ic('trash', 18)}Hapus</button></div>
<div class="actionbar"><a class="btn btn-ghost" href="#/fokus/${t.id}">${ic('timer', 18)}Fokus</a><button class="btn btn-primary grow" type="button" data-act="tDone" data-id="${t.id}">${ic('check', 18)}${t.selesai ? 'Batalkan selesai' : 'Tandai selesai'}</button></div>`;
}

function tugas(params) {
  const id = params[0];
  if (id === 'selesai') return riwayat();
  const t = id && state.tugas.find((x) => x.id === id);
  if (id && !t) return { html: `<div class="page narrow">${subTop('Tugas', '#/tugas')}${empty('alert', 'Tugas tidak ditemukan', 'Mungkin sudah dihapus.')}</div>` };
  if (isWide()) {
    const right = t ? `<div class="detail">${detailHTML(t)}</div>` : empty('checksq', 'Detail tugas tampil di sini', 'Pilih tugas di daftar, atau tekan + untuk mencatat yang baru.');
    return { tab: 'tugas', fab: true, after: hydratePhotos, html: `<div class="split"><section class="pane-list">${listHTML(t?.id)}</section><section class="pane-detail">${right}</section></div>` };
  }
  if (t) return { after: hydratePhotos, html: `<div class="page narrow has-actionbar">${subTop('Detail tugas', '#/tugas')}${detailHTML(t)}</div>` };
  return { tab: 'tugas', fab: true, html: `<div class="page">${listHTML()}</div>` };
}

function riwayat() {
  const done = state.tugas.filter((t) => t.selesai).sort((a, b) => (b.selesaiAt || '').localeCompare(a.selesaiAt || ''));
  const mon = mondayOf(new Date());
  const bulan = done.filter((t) => (t.selesaiAt || '').slice(0, 7) === iso(new Date()).slice(0, 7)).length;
  const weeks = new Map();
  for (const t of done) {
    const d = t.selesaiAt ? new Date(t.selesaiAt.slice(0, 10) + 'T00:00') : new Date(0);
    const w = iso(mondayOf(d));
    if (!weeks.has(w)) weeks.set(w, []);
    weeks.get(w).push(t);
  }
  const label = (w) => (w === iso(mon) ? 'Minggu ini' : w === iso(addDays(mon, -7)) ? 'Minggu lalu' : fmtRange(new Date(w + 'T00:00'), addDays(new Date(w + 'T00:00'), 6)));
  const open = openTasks();
  const html = `${rootTop(`${open.length} belum selesai`, title(), '')}
${segl([[`Belum (${open.length})`, '#/tugas', false], ['Selesai', '#/tugas/selesai', true]])}
<div class="grid2"><a class="card stat" href="#/progres"><span class="big-n">${bulan}</span><span class="small muted">selesai bulan ini</span></a><a class="card stat" href="#/progres"><span class="big-n row" style="gap:6px"><span style="color:#C2410C">${ic('flame', 26)}</span>${streak()}</span><span class="small muted">hari beruntun</span></a></div>
${done.length ? [...weeks.entries()].slice(0, 8).map(([w, arr]) => `${grp(label(w), arr.length)}<div class="list">${arr.map((t) => taskRow(t)).join('')}</div>`).join('') + '<p class="p small muted">Hapus centang untuk mengembalikan tugas ke daftar.</p>' : empty('check', 'Belum ada tugas selesai', 'Tugas yang dicentang akan muncul di sini.')}`;
  return { tab: 'tugas', fab: true, html: `<div class="page">${html}</div>` };
}

function find(id) { return state.tugas.find((t) => t.id === id); }
export function toggleTask(t, done) {
  t.selesai = done; t.selesaiAt = done ? stamp() : null; save();
  toast(done ? (isSD() ? 'Hore, PR selesai!' : 'Beres! Tugas selesai') : 'Tugas dikembalikan');
}

register({
  views: { tugas },
  actions: {
    tSearch: () => { showSearch = !showSearch; if (!showSearch) q = ''; rerender(); },
    quickAdd: () => quickAdd(),
    tEdit: (el) => taskForm(find(el.dataset.id)),
    tDone: (el) => { const t = find(el.dataset.id); toggleTask(t, !t.selesai); if (t.selesai && !isWide()) go('#/tugas'); else rerender(); },
    tDel: async (el) => {
      const t = find(el.dataset.id);
      if (!(await confirmBox(`Hapus “${esc(t.judul)}”? Langkah dan lampirannya ikut terhapus.`, { ok: 'Hapus', danger: true, title: 'Hapus tugas?' }))) return;
      for (const f of t.lampiran || []) delFile(f);
      state.tugas = state.tugas.filter((x) => x !== t); save(); toast('Tugas dihapus'); go('#/tugas');
    },
    stepDel: (el) => { const t = find(el.dataset.t); const i = t.langkah.findIndex((x) => x.id === el.dataset.id); if (i < 0) return; const [x] = t.langkah.splice(i, 1); save(); rerender(); toast('Langkah dihapus', { label: 'Urungkan', run: () => { t.langkah.splice(Math.min(i, t.langkah.length), 0, x); save(); rerender(); } }); },
    memToggle: (el) => { const a = find(el.dataset.t).anggota.find((x) => x.id === el.dataset.id); a.done = !a.done; save(); rerender(); },
    memDel: (el) => { const t = find(el.dataset.t); const i = t.anggota.findIndex((x) => x.id === el.dataset.id); if (i < 0) return; const [x] = t.anggota.splice(i, 1); save(); rerender(); toast('Anggota dihapus', { label: 'Urungkan', run: () => { t.anggota.splice(Math.min(i, t.anggota.length), 0, x); save(); rerender(); } }); },
    photoAdd: async (el) => { const t = find(el.dataset.t); const id = await addPhoto(); if (!id) return; t.lampiran = [...(t.lampiran || []), id]; save(); rerender(); },
    photoDel: async (el) => { const t = find(el.dataset.t); if (!(await confirmBox('Hapus foto ini?', { ok: 'Hapus', danger: true, title: 'Hapus foto?' }))) return; t.lampiran = t.lampiran.filter((f) => f !== el.dataset.file); delFile(el.dataset.file); save(); rerender(); },
    photoView: async (el) => { const d = await getFile(el.dataset.file); if (!d) return; openSheet({ title: 'Foto', body: `<img src="${d}" alt="Foto lampiran" class="photo-full">` }); },
  },
  changes: {
    toggleTask: (el) => { const t = find(el.dataset.id); if (t) { toggleTask(t, el.checked); setTimeout(rerender, 350); } },
    tFilter: (el) => { filter = el.value; rerender(); },
    stepToggle: (el) => { const s = find(el.dataset.t).langkah.find((x) => x.id === el.dataset.id); s.done = el.checked; save(); rerender(); },
  },
  inputs: {
    tQ: (el) => { q = el.value; rerender(); const i = document.querySelector('[data-inp="tQ"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  },
  forms: {
    stepAdd: (f) => { const v = f.teks.value.trim(); if (!v) return; const t = find(f.dataset.t); t.langkah = [...(t.langkah || []), { id: uid(), teks: v, done: false }]; save(); rerender(); setTimeout(() => document.querySelector('[data-form="stepAdd"] input')?.focus(), 0); },
    memAdd: (f) => { const n = f.nama.value.trim(); if (!n) return; const t = find(f.dataset.t); t.anggota = [...(t.anggota || []), { id: uid(), nama: n, bagian: f.bagian.value.trim(), done: false }]; save(); rerender(); },
  },
});
