// Kalender minggu & bulan, Ekskul & les, Jadwal ujian
import { state, save } from '../store.js';
import { esc, iso, fmtLong, fmtShort, fmtRange, jam, today, addDays, mondayOf, parseISO, parseDT, HARI, HARI3, BULAN, daysBetween, toMin } from '../util.js';
import { lessonsOn, kegiatanOn, isKuliah, mapelById, mapelName, exceptionOn, upcomingUjian } from '../logic.js';
import { ic, rootTop, subTop, sect, grp, schip, gchip, mchip, segl, empty, picks } from '../ui.js';
import { kegiatanForm, ujianForm } from '../forms.js';
import { register, rerender } from '../core.js';

const C = { pel: 'var(--accent)', tgs: '#EA580C', eks: '#E11D48', les: '#0284C7', uji: '#D97706', lib: '#78716C' };
let weekOff = 0, selDay = null, monthOff = 0, selMonthDay = null, kgFilter = 'semua';

function dayItems(d) {
  const s = iso(d), out = [];
  const L = lessonsOn(d);
  if (L.ex) out.push({ c: 'lib', time: '', title: L.ex.jenis === 'libur' ? (L.ex.ket || 'Libur') : L.ex.jenis === 'pulang' ? `Pulang cepat ${jam(L.ex.jamPulang)}` : `Jadwal khusus${L.ex.ket ? ': ' + L.ex.ket : ''}`, sub: L.ex.ket && L.ex.jenis !== 'khusus' ? L.ex.ket : '', kind: 'later', k: L.ex.jenis === 'libur' ? 'Libur' : 'Perubahan', href: '#/jadwal/libur' });
  if (L.items.length) {
    const names = [...new Set(L.items.map((i) => i.mapel.nama))];
    out.push({ c: 'pel', time: `${jam(L.items[0].mulai)}`, time2: jam(L.items.at(-1).selesai), title: `${isKuliah() ? 'Kuliah' : 'Sekolah'} · ${L.items.length} ${isKuliah() ? 'kuliah' : 'pelajaran'}`, sub: names.slice(0, 3).join(', ') + (names.length > 3 ? `, +${names.length - 3}` : ''), kind: 'accent', k: 'Pelajaran', href: '#/jadwal', sort: toMin(L.items[0].mulai) });
  }
  for (const k of kegiatanOn(d)) out.push({ c: k.kategori === 'les' ? 'les' : 'eks', time: jam(k.mulai), time2: jam(k.selesai), title: k.nama, sub: k.lokasi, kind: k.kategori === 'les' ? 'les' : 'ekskul', k: k.kategori === 'les' ? 'Les' : k.kategori === 'ekskul' ? 'Ekskul' : 'Kegiatan', href: '#/kegiatan', sort: toMin(k.mulai) });
  for (const u of state.ujian.filter((u) => u.tanggal === s)) out.push({ c: 'uji', time: jam(u.mulai), time2: jam(u.selesai), title: `${u.jenis || 'Ujian'} ${mapelName(u.mapelId)}`, sub: (u.materi || []).map((x) => x.teks).join(', '), kind: 'ujian', k: 'Ujian', href: '#/ujian', sort: toMin(u.mulai) });
  for (const t of state.tugas.filter((t) => !t.selesai && t.deadline && t.deadline.slice(0, 10) === s)) out.push({ c: 'tgs', time: jam(t.deadline.slice(11, 16)), title: t.judul, sub: `Deadline · ${mapelName(t.mapelId)}`, kind: 'today', k: 'Tugas', href: `#/tugas/${t.id}`, sort: toMin(t.deadline.slice(11, 16)) });
  return out.sort((a, b) => (a.sort ?? -1) - (b.sort ?? -1));
}
function dots(d, routine = true) {
  const s = iso(d), set = [];
  if (routine && lessonsOn(d).items.length) set.push(C.pel);
  if (state.tugas.some((t) => !t.selesai && t.deadline?.slice(0, 10) === s)) set.push(C.tgs);
  const ks = kegiatanOn(d).filter((k) => routine || k.ulang === 'sekali');
  if (ks.some((k) => k.kategori !== 'les')) set.push(C.eks);
  if (ks.some((k) => k.kategori === 'les')) set.push(C.les);
  if (state.ujian.some((u) => u.tanggal === s)) set.push(C.uji);
  if (!routine && exceptionOn(d)) set.push(C.lib);
  return set;
}
const legend = (pel = true) => `<div class="legend">${[pel && [C.pel, 'Pelajaran'], [C.tgs, 'Tugas'], [C.eks, 'Ekskul'], [C.les, 'Les'], [C.uji, 'Ujian'], !pel && [C.lib, 'Libur/perubahan']].filter(Boolean).map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>`;
function agenda(d) {
  const items = dayItems(d);
  if (!items.length) return `<div class="card"><span class="small muted">Tidak ada agenda.</span></div>`;
  return `<div class="list">${items.map((x) => `<a class="list-item" href="${x.href}" style="align-items:flex-start"><span class="tcol"><b>${x.time || '—'}</b><span class="small muted">${x.time2 || ''}</span></span><i class="adot" style="background:${C[x.c]}"></i><span class="col grow" style="gap:2px"><b>${esc(x.title)}</b><span class="small muted">${esc(x.sub || '')}</span></span>${schip(x.kind, x.k)}</a>`).join('')}</div>`;
}
const top = (on) => rootTop(fmtLong(new Date()), 'Kalender', `<a class="icon-btn" href="#/kegiatan" aria-label="Ekskul dan les">${ic('users')}</a><a class="icon-btn" href="#/ujian" aria-label="Jadwal ujian">${ic('flag')}</a>`) + segl([['Minggu', '#/kalender', on === 'm'], ['Bulan', '#/kalender/bulan', on === 'b']]);

function minggu() {
  const mon = addDays(mondayOf(new Date()), weekOff * 7);
  const sel = selDay && daysBetween(mon, parseISO(selDay)) >= 0 && daysBetween(mon, parseISO(selDay)) < 7 ? parseISO(selDay) : (weekOff === 0 ? today() : mon);
  const strip = [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = addDays(mon, i); const on = iso(d) === iso(sel); return `<button type="button" class="wday${on ? ' on' : ''}${iso(d) === iso(today()) ? ' is-today' : ''}" data-act="calDay" data-d="${iso(d)}" ${on ? 'aria-current="date"' : ''}><span class="small">${HARI3[d.getDay()]}</span><b>${d.getDate()}</b><span class="dots">${dots(d).map((c) => `<i style="background:${on ? '#fff' : c}"></i>`).join('')}</span></button>`; }).join('');
  const next = addDays(sel, 1);
  return {
    tab: 'kalender', fab: true,
    html: `<div class="page">${top('m')}
<div class="row" style="justify-content:space-between"><button class="icon-btn" type="button" data-act="weekNav" data-n="-1" aria-label="Minggu sebelumnya">${ic('left')}</button><button type="button" class="link" data-act="weekNav" data-n="0">${fmtRange(mon, addDays(mon, 6))}</button><button class="icon-btn" type="button" data-act="weekNav" data-n="1" aria-label="Minggu berikutnya">${ic('right')}</button></div>
<div class="wstrip">${strip}</div>${legend()}
<div class="dash dash-2"><div class="dcol">${grp(fmtLong(sel))}${agenda(sel)}</div><div class="dcol">${grp(fmtLong(next))}${agenda(next)}</div></div></div>`,
  };
}

function bulan() {
  const base = new Date(new Date().getFullYear(), new Date().getMonth() + monthOff, 1);
  const start = mondayOf(base);
  const cells = [];
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const nCells = Math.ceil((daysBetween(start, lastDay) + 1) / 7) * 7;
  for (let i = 0; i < nCells; i++) cells.push(addDays(start, i));
  const sel = selMonthDay ? parseISO(selMonthDay) : (monthOff === 0 ? today() : base);
  const grid = `<div class="mgrid">${HARI3.slice(1).concat('Min').map((h) => `<span class="mh">${h}</span>`).join('')}${cells.map((d) => { const out = d.getMonth() !== base.getMonth(); const ex = exceptionOn(d); const on = iso(d) === iso(sel); return `<button type="button" class="mday${out ? ' out' : ''}${on ? ' on' : ''}${iso(d) === iso(today()) ? ' is-today' : ''}${ex?.jenis === 'libur' ? ' libur' : ''}" data-act="monthDay" data-d="${iso(d)}"><span class="n">${d.getDate()}</span><span class="dots">${dots(d, false).map((c) => `<i style="background:${c}"></i>`).join('')}</span></button>`; }).join('')}</div>`;
  const a = iso(base), b = iso(new Date(base.getFullYear(), base.getMonth() + 1, 0));
  const imp = [];
  for (const p of state.pengecualian.filter((p) => p.dari >= a && p.dari <= b)) imp.push({ d: p.dari, t: p.jenis === 'libur' ? 'Libur' : p.jenis === 'pulang' ? `Pulang cepat ${jam(p.jamPulang)}` : 'Jadwal khusus', s: p.ket, k: ['later', p.jenis === 'libur' ? 'Libur' : 'Perubahan'], h: '#/jadwal/libur' });
  for (const u of state.ujian.filter((u) => u.tanggal >= a && u.tanggal <= b)) imp.push({ d: u.tanggal, t: `${u.jenis || 'Ujian'} ${mapelName(u.mapelId)}`, s: u.nama, k: ['ujian', 'Ujian'], h: '#/ujian' });
  for (const t of state.tugas.filter((t) => !t.selesai && t.deadline && t.deadline.slice(0, 10) >= a && t.deadline.slice(0, 10) <= b)) imp.push({ d: t.deadline.slice(0, 10), t: t.judul, s: `Deadline · ${mapelName(t.mapelId)}`, k: ['today', 'Tugas'], h: `#/tugas/${t.id}` });
  for (const k of state.kegiatan.filter((k) => k.ulang === 'sekali' && k.tanggal >= a && k.tanggal <= b)) imp.push({ d: k.tanggal, t: k.nama, s: k.lokasi, k: [k.kategori === 'les' ? 'les' : 'ekskul', k.kategori === 'les' ? 'Les' : 'Ekskul'], h: '#/kegiatan' });
  imp.sort((x, y) => x.d.localeCompare(y.d));
  return {
    tab: 'kalender', fab: true,
    html: `<div class="page">${top('b')}
<div class="row" style="justify-content:space-between"><button class="icon-btn" type="button" data-act="monthNav" data-n="-1" aria-label="Bulan sebelumnya">${ic('left')}</button><button type="button" class="link" data-act="monthNav" data-n="0" style="font-size:17px">${BULAN[base.getMonth()]} ${base.getFullYear()}</button><button class="icon-btn" type="button" data-act="monthNav" data-n="1" aria-label="Bulan berikutnya">${ic('right')}</button></div>
<div class="dash dash-2"><div class="dcol"><div class="card" style="padding:12px">${grid}</div>${legend(false)}<p class="p small muted">Tampilan bulan hanya menandai agenda di luar jadwal rutin.</p></div>
<div class="dcol">${grp(fmtLong(sel))}${agenda(sel)}${sect('Penting bulan ini')}${imp.length ? `<div class="list">${imp.map((x) => { const d = parseISO(x.d); return `<a class="list-item" href="${x.h}"><span class="datebox sm"><b>${d.getDate()}</b><span class="small muted">${fmtShort(d).split(' ')[2]}</span></span><span class="col grow" style="gap:2px"><b>${esc(x.t)}</b><span class="small muted">${esc(x.s || '')}</span></span>${schip(x.k[0], x.k[1])}</a>`; }).join('')}</div>` : '<div class="card"><span class="small muted">Belum ada agenda khusus bulan ini.</span></div>'}</div></div></div>`,
  };
}

// ---------- ekskul & les ----------
function kegiatan() {
  const list = state.kegiatan.filter((k) => kgFilter === 'semua' || k.kategori === kgFilter);
  const rutin = list.filter((k) => k.ulang === 'mingguan'), sekali = list.filter((k) => k.ulang === 'sekali').sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const DN = { 0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab' };
  const card = (k) => `<div class="card"><div class="row" style="justify-content:space-between"><span class="row wrap" style="gap:8px"><b style="font-size:17px">${esc(k.nama)}</b>${schip(k.kategori === 'les' ? 'les' : k.kategori === 'ekskul' ? 'ekskul' : 'lainnya', k.kategori === 'les' ? 'Les' : k.kategori === 'ekskul' ? 'Ekskul' : 'Lainnya')}</span><button type="button" class="icon-btn" data-act="kgEdit" data-id="${k.id}" aria-label="Ubah ${esc(k.nama)}">${ic('edit', 18)}</button></div>
<div class="col" style="gap:6px"><span class="row small muted" style="gap:8px">${ic('clock', 16)}${k.ulang === 'mingguan' ? [...k.hari].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((h) => DN[h]).join(' & ') : fmtShort(parseISO(k.tanggal))} · ${jam(k.mulai)}–${jam(k.selesai)}</span>${k.lokasi ? `<span class="row small muted" style="gap:8px">${ic('pin', 16)}${esc(k.lokasi)}</span>` : ''}<span class="row small muted" style="gap:8px">${ic('repeat', 16)}${k.ulang === 'mingguan' ? 'Tiap minggu' : 'Sekali'}${k.catatan ? ' · ' + esc(k.catatan) : ''}</span></div></div>`;
  return {
    html: `<div class="page narrow">${subTop('Ekskul &amp; les', '#/kalender', `<button class="icon-btn" type="button" data-act="kgAdd" aria-label="Tambah kegiatan">${ic('plus')}</button>`)}
${picks('kgf', [['semua', 'Semua'], ['ekskul', 'Ekskul'], ['les', 'Les'], ['lainnya', 'Lainnya']], kgFilter, { attrs: 'data-chg="kgFilter"' })}
${list.length ? `${rutin.map(card).join('')}${sekali.length ? sect('Sekali saja') + sekali.map(card).join('') : ''}` : empty('users', 'Belum ada kegiatan', 'Tambahkan ekskul, les, atau acara lain. Jadwalin memberi tahu kalau ada yang bentrok.', `<button class="btn btn-primary" type="button" data-act="kgAdd">${ic('plus')}Tambah kegiatan</button>`)}</div>`,
  };
}

// ---------- ujian ----------
function ujian() {
  const up = upcomingUjian();
  const past = state.ujian.filter((u) => u.tanggal < iso(today())).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 6);
  const next = up[0];
  const allMat = up.flatMap((u) => u.materi || []);
  const byDay = new Map(); for (const u of up) { if (!byDay.has(u.tanggal)) byDay.set(u.tanggal, []); byDay.get(u.tanggal).push(u); }
  const card = (u) => { const m = u.materi || []; const dn = m.filter((x) => x.done).length; return `<div class="card" style="gap:10px"><div class="row" style="justify-content:space-between">${mchip(mapelById(u.mapelId))}<span class="row" style="gap:6px"><span class="small muted">${jam(u.mulai)}${u.selesai ? '–' + jam(u.selesai) : ''}${u.ruang ? ' · ' + esc(u.ruang) : ''}</span><button type="button" class="icon-btn sm" data-act="ujEdit" data-id="${u.id}" aria-label="Ubah ujian">${ic('edit', 16)}</button></span></div>
<b>${esc(u.jenis || 'Ujian')}${u.nama ? ' · ' + esc(u.nama) : ''}</b>
${m.length ? `<div class="col" style="gap:0">${m.map((x) => `<label class="checkrow tight"><input type="checkbox" class="check" data-chg="matToggle" data-u="${u.id}" data-id="${x.id}" ${x.done ? 'checked' : ''}><span class="${x.done ? 'struck' : ''}">${esc(x.teks)}</span></label>`).join('')}</div><div class="row" style="gap:10px"><div class="bar grow"><span style="width:${Math.round((dn / m.length) * 100)}%"></span></div><span class="small muted">${dn}/${m.length} materi</span></div>` : '<span class="small muted">Belum ada daftar materi.</span>'}</div>`; };
  const nd = next ? daysBetween(today(), parseISO(next.tanggal)) : 0;
  return {
    html: `<div class="page narrow">${subTop('Jadwal ujian', '#/kalender', `<button class="icon-btn" type="button" data-act="ujAdd" aria-label="Tambah ujian">${ic('plus')}</button>`)}
${next ? `<div class="card amber-card"><div class="row" style="justify-content:space-between">${schip('ujian', next.nama || next.jenis || 'Ujian')}<span class="small muted">${fmtShort(parseISO(next.tanggal))}</span></div><span style="font-size:32px;font-weight:800">${nd === 0 ? 'Hari ini' : nd === 1 ? 'Besok' : nd + ' hari lagi'}</span>${allMat.length ? `<div class="row" style="gap:10px"><div class="bar grow amber"><span style="width:${Math.round((allMat.filter((x) => x.done).length / allMat.length) * 100)}%"></span></div><span class="small muted">Persiapan ${allMat.filter((x) => x.done).length}/${allMat.length} materi</span></div>` : ''}</div>` : ''}
${up.length ? [...byDay.entries()].map(([d, arr]) => `${grp(fmtLong(parseISO(d)))}${arr.map(card).join('')}`).join('') : empty('flag', 'Belum ada jadwal ujian', 'Catat ulangan, PTS, UTS, atau kuis beserta materinya.', `<button class="btn btn-primary" type="button" data-act="ujAdd">${ic('plus')}Tambah ujian</button>`)}
${past.length ? `${sect('Sudah lewat')}<div class="list">${past.map((u) => `<button type="button" class="list-item muted-row" data-act="ujEdit" data-id="${u.id}"><b class="grow" style="text-align:left">${esc(u.jenis)} ${esc(mapelName(u.mapelId))}</b><span class="small muted">${fmtShort(parseISO(u.tanggal))}</span></button>`).join('')}</div>` : ''}</div>`,
  };
}

register({
  views: { kalender: (p) => (p[0] === 'bulan' ? bulan() : minggu()), kegiatan, ujian },
  actions: {
    calDay: (el) => { selDay = el.dataset.d; rerender(); },
    weekNav: (el) => { const n = Number(el.dataset.n); weekOff = n === 0 ? 0 : weekOff + n; selDay = null; rerender(); },
    monthDay: (el) => { selMonthDay = el.dataset.d; rerender(); },
    monthNav: (el) => { const n = Number(el.dataset.n); monthOff = n === 0 ? 0 : monthOff + n; selMonthDay = null; rerender(); },
    kgAdd: () => kegiatanForm(null),
    kgEdit: (el) => kegiatanForm(state.kegiatan.find((k) => k.id === el.dataset.id)),
    ujAdd: () => ujianForm(null),
    ujEdit: (el) => ujianForm(state.ujian.find((u) => u.id === el.dataset.id)),
  },
  changes: {
    kgFilter: (el) => { kgFilter = el.value; rerender(); },
    matToggle: (el) => { const u = state.ujian.find((x) => x.id === el.dataset.u); const m = u.materi.find((x) => x.id === el.dataset.id); m.done = el.checked; save(); rerender(); },
  },
});
