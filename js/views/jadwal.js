// Jadwal: grid mingguan / jadwal kuliah, pola minggu A/B, libur & perubahan, kelola mapel
import { state, save } from '../store.js';
import { esc, iso, fmtShort, fmtLong, fmtRange, jam, today, addDays, mondayOf, parseISO, toMin, nowMin, HARI, HARI3, uid, daysBetween } from '../util.js';
import { slots, weekLetter, lessonsOn, isKuliah, mapelById, exceptionOn, istilah, lessonNow } from '../logic.js';
import { ic, rootTop, subTop, sect, grp, schip, gchip, mchip, mdot, mcol, seg, empty, openSheet, field, toast } from '../ui.js';
import { slotForm, kuliahForm, mapelForm, pengecualianForm } from '../forms.js';
import { register, rerender, go } from '../core.js';

let viewLetter = null;
const days = () => (state.profile.hariSekolah === 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]);

function weekExceptions() {
  const mon = mondayOf(new Date()); const out = [];
  for (let i = 0; i < 7; i++) { const d = addDays(mon, i); const ex = exceptionOn(d); if (ex && !out.includes(ex)) out.push(ex); }
  return out;
}
function exLabel(p) { return p.jenis === 'libur' ? 'Libur' : p.jenis === 'pulang' ? `Pulang cepat ${jam(p.jamPulang)}` : 'Jadwal khusus'; }

function grid() {
  const { slots: S, breaks: B } = slots();
  const D = days();
  const mon = mondayOf(new Date());
  const L = state.profile.pola === 'ab' ? (viewLetter || weekLetter(new Date())) : null;
  const tIdx = new Date().getDay();
  const { now } = lessonNow();
  let g = `<div class="wgrid" style="grid-template-columns:var(--tc) repeat(${D.length},minmax(0,1fr))"><span></span>`;
  D.forEach((h, i) => { const d = addDays(mon, i); g += `<span class="dh${h === tIdx ? ' today' : ''}">${HARI3[h]}<b>${d.getDate()}</b></span>`; });
  for (const s of S) {
    g += `<span class="tcell"><b>${s.jamKe}</b>${jam(s.mulai)}</span>`;
    for (const h of D) {
      const e = state.jadwal.find((x) => x.hari === h && x.jamKe === s.jamKe && (!L || x.minggu === 'semua' || x.minggu === L));
      const m = e && mapelById(e.mapelId);
      if (!m) { g += `<button type="button" class="cell cell-empty" data-act="slot" data-h="${h}" data-j="${s.jamKe}" data-l="${L || ''}" aria-label="${HARI[h]} jam ke-${s.jamKe}: kosong, ketuk untuk mengisi">+</button>`; continue; }
      const [bg, fg] = mcol(m);
      const ring = now && h === tIdx && now.jamKe === s.jamKe ? ' now-ring' : '';
      g += `<button type="button" class="cell${ring}" style="background:${bg};color:${fg}" data-act="slot" data-h="${h}" data-j="${s.jamKe}" data-l="${L || ''}" aria-label="${HARI[h]} jam ke-${s.jamKe}: ${esc(m.nama)}"><span class="short">${esc(m.singkat)}</span><span class="full">${esc(m.nama)}<small>${esc(e.ruang || m.ruang || '')}</small></span></button>`;
    }
    const br = B.find((b) => b.after === s.jamKe);
    if (br) g += `<span class="brk" style="grid-column:1/-1">${esc(br.label)} ${jam(br.mulai)}–${jam(br.selesai)}</span>`;
  }
  return g + '</div>';
}

function jadwalSekolah() {
  const mon = mondayOf(new Date());
  const D = days();
  const L = state.profile.pola === 'ab' ? (viewLetter || weekLetter(new Date())) : null;
  const exs = weekExceptions();
  const right = `<a class="icon-btn" href="#/jadwal/pola" aria-label="Pengaturan jadwal">${ic('sliders')}</a>`;
  const body = !state.mapel.length
    ? empty('grid', 'Belum ada mapel', 'Tambahkan mapel dulu, lalu isi slot jadwal.', `<a class="btn btn-primary" href="#/jadwal/mapel">${ic('plus')}Tambah mapel</a>`)
    : `${L ? seg('viewL', [['A', 'Minggu A'], ['B', 'Minggu B']], L, 'data-chg="viewL"') : ''}
${grid()}
<p class="small muted" style="margin:0">Ketuk slot untuk mengisi atau mengubah.</p>`;
  return {
    tab: 'jadwal',
    html: `<div class="page wide">${rootTop(`${fmtRange(mon, addDays(mon, D.length - 1))}${L ? ' · minggu ini ' + weekLetter(new Date()) : ''}`, 'Jadwal', right)}
${exs.map((p) => `<a class="warn warn-row" href="#/jadwal/libur"><span style="color:#C2410C">${ic('alert', 22)}</span><span class="col grow" style="gap:2px"><b>${fmtShort(parseISO(p.dari))} · ${exLabel(p)}</b><span class="small muted">${esc(p.ket || '')}</span></span>${ic('right', 18)}</a>`).join('')}
${body}
<div class="row"><a class="btn btn-line grow btn-sm" href="#/jadwal/mapel">${ic('book', 18)}Kelola mapel</a><a class="btn btn-line grow btn-sm" href="#/jadwal/libur">${ic('calendar', 18)}Libur &amp; perubahan</a></div></div>`,
  };
}

function jadwalKuliah() {
  const sks = state.mapel.reduce((s, m) => s + (Number(m.sks) || 0), 0);
  const tIdx = new Date().getDay();
  const cols = [1, 2, 3, 4, 5, 6].map((h) => {
    const list = state.jadwal.filter((e) => e.hari === h).sort((a, b) => toMin(a.mulai) - toMin(b.mulai));
    if (!list.length && h === 6) return '';
    return `<div class="daycol${h === tIdx ? ' today' : ''}">${grp(`${HARI[h]}${h === tIdx ? ' · hari ini' : ''}`)}
<div class="list">${list.map((e) => { const m = mapelById(e.mapelId); return `<button type="button" class="list-item" data-act="kuliahEdit" data-id="${e.id}"><span class="tcol"><b>${jam(e.mulai)}</b><span class="small muted">${jam(e.selesai)}</span></span>${mdot(m)}<span class="col grow" style="gap:2px;text-align:left"><b>${esc(m?.nama || '—')}</b><span class="small muted">${esc(e.ruang || m?.ruang || '')}${m?.guru ? ' · ' + esc(m.guru) : ''}</span></span>${m?.sks ? gchip(m.sks + ' SKS') : ''}</button>`; }).join('')}
<button type="button" class="list-item add-row" data-act="kuliahAdd" data-h="${h}">${ic('plus', 18)}Tambah kuliah</button></div></div>`;
  }).join('');
  return {
    tab: 'jadwal',
    html: `<div class="page wide">${rootTop(esc(state.profile.semester || 'Semester ini'), 'Jadwal kuliah', `<a class="icon-btn" href="#/jadwal/mapel" aria-label="Kelola mata kuliah">${ic('book')}</a>`)}
<div class="card row-card"><span class="ibox">${ic('cap')}</span><span class="col grow" style="gap:2px"><b>${esc(state.profile.semester || 'Semester')} · ${sks} SKS</b><span class="small muted">${state.mapel.length} mata kuliah</span></span><button type="button" class="btn btn-line btn-sm" data-act="semesterBaru">${ic('repeat', 18)}Semester baru</button></div>
<div class="kgrid">${cols}</div>
<a class="btn btn-line btn-sm" href="#/jadwal/libur">${ic('calendar', 18)}Libur &amp; perubahan</a></div>`,
  };
}

function jadwal() { return isKuliah() ? jadwalKuliah() : jadwalSekolah(); }

// ---------- pola minggu ----------
function pola() {
  const p = state.profile;
  const mon = mondayOf(new Date());
  const cur = weekLetter(new Date());
  const lastDay = days().length - 1;
  const aOnly = state.jadwal.filter((e) => e.minggu === 'A' && !state.jadwal.some((b) => b.hari === e.hari && b.jamKe === e.jamKe && b.minggu === 'B')).length;
  const body = p.pola !== 'ab'
    ? `<div class="card"><b>Jadwal sama setiap minggu</b><span class="small muted">Pilih Minggu A/B kalau jadwalmu bergantian tiap minggu. Jadwal yang sudah ada berlaku untuk kedua minggu.</span></div>`
    : `<div class="card accent-card"><span class="eyebrow">Minggu ini · ${fmtRange(mon, addDays(mon, lastDay))}</span><span style="font-size:30px;font-weight:800">Minggu ${cur}</span><button class="btn btn-line btn-sm" type="button" data-act="abSwap" style="align-self:flex-start">${ic('repeat', 18)}Tukar jadi Minggu ${cur === 'A' ? 'B' : 'A'}</button></div>
${sect('Minggu berikutnya')}
<div class="list">${[1, 2, 3, 4].map((i) => { const m = addDays(mon, i * 7); const l = weekLetter(m); return `<div class="list-item"><b class="grow">${fmtRange(m, addDays(m, lastDay))}</b>${l === 'A' ? schip('accent', 'Minggu A') : gchip('Minggu B')}</div>`; }).join('')}</div>
<div class="card"><b>${aOnly ? `Minggu B belum lengkap` : 'Salin jadwal'}</b><span class="small muted">${aOnly ? `${aOnly} slot khusus Minggu A belum punya pasangan di Minggu B.` : 'Salin slot khusus Minggu A ke Minggu B, lalu ubah yang berbeda.'}</span><button class="btn btn-ghost" type="button" data-act="abCopy">${ic('copy', 18)}Salin dari Minggu A ke B</button></div>
<p class="p small muted">Pola berganti otomatis setiap Senin.</p>`;
  return {
    html: `<div class="page narrow">${subTop('Pola minggu', '#/jadwal')}
${seg('pola', [['tetap', 'Tetap tiap minggu'], ['ab', 'Minggu A/B']], p.pola, 'data-chg="polaSet"')}
${body}
${sect('Jam pelajaran')}
<form class="card" data-form="jamSet"><div class="grid2">${field('Jam masuk', 'jamMasuk', p.jamMasuk, 'time')}${field('Menit per jam', 'durasi', p.durasi, 'number', 'min="20" max="120"')}</div><div class="grid2">${field('Jam per hari', 'jamPerHari', p.jamPerHari, 'number', 'min="1" max="14"')}<div class="field"><label for="f-hs">Hari sekolah</label><select id="f-hs" class="input" name="hariSekolah"><option value="5" ${p.hariSekolah === 5 ? 'selected' : ''}>Senin–Jumat</option><option value="6" ${p.hariSekolah === 6 ? 'selected' : ''}>Senin–Sabtu</option></select></div></div>
${(p.breaks || []).map((b, i) => `<div class="grid3">${field(`Istirahat ${i + 1}`, `bl${i}`, b.label)}${field('Setelah jam ke-', `ba${i}`, b.after, 'number', 'min="1" max="14"')}${field('Menit', `bd${i}`, b.durasi, 'number', 'min="5" max="90"')}</div>`).join('')}
<button class="btn btn-primary" type="submit">Simpan jam pelajaran</button></form></div>`,
  };
}

// ---------- libur & perubahan ----------
function libur() {
  const t = iso(today());
  const up = state.pengecualian.filter((p) => (p.sampai || p.dari) >= t).sort((a, b) => a.dari.localeCompare(b.dari));
  const past = state.pengecualian.filter((p) => (p.sampai || p.dari) < t).sort((a, b) => b.dari.localeCompare(a.dari)).slice(0, 10);
  const row = (p, muted) => { const d = parseISO(p.dari); const kind = p.jenis === 'khusus' ? 'ujian' : 'later'; return `<button type="button" class="list-item${muted ? ' muted-row' : ''}" data-act="pgEdit" data-id="${p.id}"><span class="datebox"><span class="small muted">${HARI3[d.getDay()]}</span><b>${d.getDate()}</b><span class="small muted">${fmtShort(d).split(' ')[2]}</span></span><span class="col grow" style="gap:2px;text-align:left"><b>${exLabel(p)}${p.sampai && p.sampai !== p.dari ? ' · s.d. ' + fmtShort(parseISO(p.sampai)) : ''}</b><span class="small muted">${esc(p.ket || '')}</span></span>${schip(kind, p.jenis === 'libur' ? 'Libur' : p.jenis === 'pulang' ? 'Pulang cepat' : 'Khusus')}</button>`; };
  return {
    html: `<div class="page narrow">${subTop('Libur &amp; perubahan', '#/jadwal', `<button class="icon-btn" type="button" data-act="pgAdd" aria-label="Tambah pengecualian">${ic('plus')}</button>`)}
<p class="p muted">Pengecualian menimpa jadwal biasa hanya di tanggal itu.</p>
${sect('Akan datang')}${up.length ? `<div class="list">${up.map((p) => row(p)).join('')}</div>` : empty('calendar', 'Tidak ada libur atau perubahan', 'Tekan + untuk mencatat libur, pulang cepat, atau jadwal khusus.')}
${past.length ? `${sect('Sudah lewat')}<div class="list">${past.map((p) => row(p, true)).join('')}</div>` : ''}</div>`,
  };
}

// ---------- kelola mapel ----------
let mapelQ = '';
function mapelList() {
  const q = mapelQ.toLowerCase();
  const list = state.mapel.filter((m) => !q || m.nama.toLowerCase().includes(q));
  const count = (id) => Math.round(state.jadwal.filter((e) => e.mapelId === id).reduce((s, e) => s + (e.minggu === 'A' || e.minggu === 'B' ? 0.5 : 1), 0));
  return {
    html: `<div class="page narrow">${subTop(`Kelola ${istilah().mapel.toLowerCase()}`, '#/jadwal', `<button class="icon-btn" type="button" data-act="mapelAdd" aria-label="Tambah">${ic('plus')}</button>`)}
<label class="search">${ic('search')}<input type="search" data-inp="mapelQ" value="${esc(mapelQ)}" aria-label="Cari" placeholder="Cari ${istilah().mapel.toLowerCase()}"></label>
${list.length ? `<div class="list">${list.map((m) => `<button type="button" class="list-item" data-act="mapelEdit" data-id="${m.id}">${mdot(m, 40)}<span class="col grow" style="gap:2px;text-align:left"><b>${esc(m.nama)}</b><span class="small muted">${[m.guru, isKuliah() ? (m.sks ? m.sks + ' SKS' : '') : `${count(m.id)} jam/minggu`, (m.bawaan || []).length ? `${m.bawaan.length} barang bawaan` : ''].filter(Boolean).map(esc).join(' · ')}</span></span>${ic('right', 18)}</button>`).join('')}</div>` : empty('book', 'Belum ada', 'Tekan + untuk menambahkan.')}</div>`,
  };
}

register({
  views: { jadwal, pola, libur, mapel: mapelList },
  actions: {
    slot: (el) => slotForm(Number(el.dataset.h), Number(el.dataset.j), el.dataset.l || null),
    kuliahAdd: (el) => kuliahForm(null, Number(el.dataset.h)),
    kuliahEdit: (el) => kuliahForm(state.jadwal.find((e) => e.id === el.dataset.id)),
    semesterBaru: () => openSheet({
      title: 'Semester baru', submit: 'Mulai semester baru',
      body: `${field('Nama semester', 'sem', '', 'text', 'autofocus placeholder="Misal: Semester 4"')}<label class="set-row" style="padding:4px 0"><span class="col grow" style="gap:2px"><b>Salin jadwal lama</b><span class="small muted">Matikan untuk mulai dari kosong. Tugas dan catatan tetap tersimpan.</span></span><input type="checkbox" class="switch" name="keep" checked></label>`,
      onSubmit: (fd) => { if (!fd.get('sem').trim()) return 'Isi nama semester.'; state.profile.semester = fd.get('sem').trim(); if (!fd.get('keep')) { state.jadwal = []; state.mapel = state.mapel.filter((m) => state.tugas.some((t) => t.mapelId === m.id)); } save(); toast('Semester baru dimulai'); rerender(); },
    }),
    abSwap: () => { state.profile.abStart = state.profile.abStart === 'A' ? 'B' : 'A'; viewLetter = null; save(); rerender(); },
    abCopy: () => {
      let n = 0;
      for (const e of state.jadwal.filter((x) => x.minggu === 'A')) {
        if (!state.jadwal.some((b) => b.hari === e.hari && b.jamKe === e.jamKe && b.minggu === 'B')) { state.jadwal.push({ ...e, id: uid(), minggu: 'B' }); n++; }
      }
      save(); toast(n ? `${n} slot disalin ke Minggu B` : 'Minggu B sudah lengkap'); rerender();
    },
    pgAdd: () => pengecualianForm(null),
    pgEdit: (el) => pengecualianForm(state.pengecualian.find((p) => p.id === el.dataset.id)),
    mapelAdd: () => mapelForm(null),
    mapelEdit: (el) => mapelForm(state.mapel.find((m) => m.id === el.dataset.id)),
  },
  changes: {
    viewL: (el) => { viewLetter = el.value; rerender(); },
    polaSet: (el) => { const p = state.profile; p.pola = el.value; if (p.pola === 'ab' && !p.abAnchor) p.abAnchor = iso(mondayOf(new Date())); save(); rerender(); },
  },
  inputs: {
    mapelQ: (el) => { mapelQ = el.value; rerender(); const i = document.querySelector('[data-inp="mapelQ"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  },
  forms: {
    jamSet: (f) => {
      const p = state.profile; const fd = new FormData(f);
      p.jamMasuk = fd.get('jamMasuk') || '07:00'; p.durasi = Math.max(20, Number(fd.get('durasi')) || 45); p.jamPerHari = Math.min(14, Math.max(1, Number(fd.get('jamPerHari')) || 8)); p.hariSekolah = Number(fd.get('hariSekolah')) || 5;
      p.breaks = (p.breaks || []).map((b, i) => ({ label: (fd.get(`bl${i}`) || b.label).trim(), after: Number(fd.get(`ba${i}`)) || b.after, durasi: Number(fd.get(`bd${i}`)) || b.durasi }));
      save(); toast('Jam pelajaran disimpan'); rerender();
    },
  },
});
