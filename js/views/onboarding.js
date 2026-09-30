// Onboarding: selamat datang, jenjang, profil & jam, mapel, isi jadwal
import { state, save, replaceState, putFile, flush } from '../store.js';
import { esc, iso, mondayOf, jam, HARI } from '../util.js';
import { MAPEL_DEFAULT, JENJANG, newMapel, slots, isKuliah, demoData, mapelById, PAL, convertJadwal, singkat } from '../logic.js';
import { ic, seg, field, select, empty, toast, mdot, mcol, gchip } from '../ui.js';
import { slotForm, kuliahForm, mapelForm } from '../forms.js';
import { register, rerender, go } from '../core.js';
import { applyTheme } from '../theme.js';

const benefit = (i, t, d) => `<div class="row" style="align-items:flex-start"><span class="ibox">${ic(i)}</span><div class="col" style="gap:2px"><b>${t}</b><span class="small muted">${d}</span></div></div>`;
const STEPS = ['Pilih jenjang', 'Profil & jam', isKuliah() ? 'Mata kuliah' : 'Pilih mapel', 'Isi jadwal'];

function shell(n, title, sub, body, next, nextLabel = 'Lanjut', back) {
  const brand = `<aside class="ob-brand"><span class="logo light">${ic('calendar', 30)}</span><div class="col" style="gap:10px"><span class="ob-name">Jadwalin</span><p class="p" style="color:#E0E7FF">Jadwal pelajaran, tugas, dan ekskul — rapi dalam satu genggaman.</p></div><div class="col" style="gap:14px">${['Pilih jenjang', 'Profil & jam', isKuliah() ? 'Mata kuliah' : 'Pilih mapel', 'Isi jadwal'].map((t, i) => `<div class="stepi${i + 1 === n ? ' on' : i + 1 < n ? ' done' : ''}"><b>${i + 1}</b>${esc(t)}</div>`).join('')}</div></aside>`;
  return `<div class="ob">${brand}<main class="ob-main"><div class="ob-col">
<div class="col" style="gap:14px"><div class="row" style="justify-content:space-between"><a class="icon-btn" href="${back}" aria-label="Kembali">${ic('left')}</a><span class="eyebrow">Langkah ${n} dari 4</span>${state.setup ? `<a class="link" href="#/">Tutup</a>` : '<span style="width:44px"></span>'}</div><div class="bar"><span style="width:${n * 25}%"></span></div></div>
<div class="col" style="gap:6px"><h1 class="h1">${title}</h1><p class="p muted">${sub}</p></div>
${body}
<a class="btn btn-primary ob-next" href="${next}" data-act="obNext" data-n="${n}">${nextLabel}</a></div></main></div>`;
}

function welcome() {
  return {
    bare: true,
    html: `<div class="ob"><aside class="ob-brand wide-only"><span class="logo light">${ic('calendar', 32)}</span><div class="col" style="gap:12px"><span class="ob-name" style="font-size:52px">Jadwalin</span><p class="p" style="color:#E0E7FF;font-size:20px">Jadwal pelajaran, tugas, dan ekskul — rapi dalam satu genggaman.</p></div><span class="row small" style="gap:8px;color:#C7D2FE">${ic('wifioff', 18)}Tanpa akun · data tersimpan di perangkat</span></aside>
<main class="ob-main center"><div class="ob-col welcome">
<div class="col mobile-only" style="gap:28px"><span class="logo">${ic('calendar', 32)}</span><div class="col" style="gap:10px"><h1 class="welcome-title">Jadwalin</h1><p class="p muted" style="font-size:18px">Jadwal pelajaran, tugas, dan ekskul — rapi dalam satu genggaman.</p></div></div>
<div class="col" style="gap:18px">${benefit('home', 'Sekali buka, langsung tahu', 'Pelajaran sekarang, tugas terdekat, dan bawaan besok.')}${benefit('bell', 'Tidak ada tugas terlewat', 'Pengingat H-1 dan menjelang deadline.')}${benefit('wifioff', 'Jalan tanpa internet', 'Tanpa akun. Semua data tersimpan di perangkatmu.')}</div>
<div class="col" style="gap:10px">
${state.setup ? `<a class="btn btn-primary" href="#/">Kembali ke aplikasi</a><a class="btn btn-line" href="#/mulai/jenjang">Ulangi pengaturan awal</a>` : `<a class="btn btn-primary" href="#/mulai/jenjang">Mulai</a><button class="btn btn-line" type="button" data-act="obDemo">${ic('play', 18)}Coba dengan data contoh</button><button class="btn btn-ghost" type="button" data-act="obRestore">${ic('upload', 18)}Pulihkan dari backup</button>`}
</div></div></main></div>`,
  };
}

function jenjang() {
  const opt = (v, icon, t, d) => `<label class="opt"><span class="ibox lg">${ic(icon, 26)}</span><span class="col grow" style="gap:4px"><b style="font-size:17px">${t}</b><span class="small muted">${d}</span></span><input type="radio" name="jenjang" value="${v}" class="radio" ${state.profile.jenjang === v ? 'checked' : ''} data-chg="obJenjang"></label>`;
  return { bare: true, html: shell(1, 'Kamu sekolah di jenjang apa?', 'Tampilan dan istilah menyesuaikan jenjangmu. Bisa diubah kapan saja.',
    `<div class="col" role="radiogroup" aria-label="Jenjang" style="gap:12px">${opt('sd', 'smile', 'SD', 'Kelas 1–6. Huruf besar, bergambar, ada ringkasan untuk orang tua.')}${opt('sekolah', 'school', 'SMP–SMA/SMK', 'Jam pelajaran, minggu A/B, ulangan dan ujian.')}${opt('kuliah', 'cap', 'Mahasiswa', 'Jadwal per semester, SKS, gedung dan ruang kuliah.')}</div>`,
    '#/mulai/profil', 'Lanjut', '#/mulai') };
}

function profil() {
  const p = state.profile;
  const body = isKuliah()
    ? `<form class="col" style="gap:14px" data-form="obProfil">${field('Nama panggilan', 'nama', p.nama, 'text', 'maxlength="30" autofocus')}<div class="grid2">${field('Semester', 'semester', p.semester, 'text', 'placeholder="Semester 1"')}${field('Kampus', 'sekolah', p.sekolah)}</div></form>`
    : `<form class="col" style="gap:14px" data-form="obProfil">${field('Nama panggilan', 'nama', p.nama, 'text', 'maxlength="30" autofocus')}
<div class="grid2">${field('Kelas', 'kelas', p.kelas, 'text', 'placeholder="Misal: 5A, 11 IPA 2"')}${field('Jam masuk', 'jamMasuk', p.jamMasuk, 'time')}</div>
${field('Sekolah', 'sekolah', p.sekolah)}
<div class="grid2">${select('Durasi 1 jam pelajaran', 'durasi', [[30, '30 menit'], [35, '35 menit'], [40, '40 menit'], [45, '45 menit'], [50, '50 menit']], p.durasi)}${select('Jam per hari', 'jamPerHari', [4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => [n, n + ' jam']), p.jamPerHari)}</div>
${select('Hari sekolah', 'hariSekolah', [[5, 'Senin–Jumat'], [6, 'Senin–Sabtu']], p.hariSekolah)}
<div class="field"><span class="label">Pola jadwal</span>${seg('pola', [['tetap', 'Tetap tiap minggu'], ['ab', 'Minggu A/B']], p.pola)}<span class="small muted">Pilih Minggu A/B kalau jadwalmu berganti tiap minggu.</span></div></form>`;
  return { bare: true, html: shell(2, 'Kenalan dulu', isKuliah() ? 'Nama dan semester dipakai di beranda dan ringkasan.' : 'Dipakai untuk menghitung jam pelajaran otomatis.', body, '#/mulai/mapel', 'Lanjut', '#/mulai/jenjang') };
}

let pick = null;
function mapel() {
  if (isKuliah()) {
    const list = state.mapel;
    return { bare: true, html: shell(3, 'Tambahkan mata kuliahmu', 'Isi nama, SKS, dan dosen. Warna dipakai di jadwal dan tugas.',
      `${list.length ? `<div class="list">${list.map((m) => `<button type="button" class="list-item" data-act="mapelEditOb" data-id="${m.id}">${mdot(m, 40)}<span class="col grow" style="gap:2px;text-align:left"><b>${esc(m.nama)}</b><span class="small muted">${[m.sks ? m.sks + ' SKS' : '', m.guru].filter(Boolean).map(esc).join(' · ')}</span></span>${ic('right', 18)}</button>`).join('')}</div>` : ''}
<button class="btn btn-line" type="button" data-act="mapelAddOb">${ic('plus')}Tambah mata kuliah</button>`, '#/mulai/jadwal', 'Lanjut', '#/mulai/profil') };
  }
  const defs = MAPEL_DEFAULT[state.profile.jenjang] || [];
  if (!pick) pick = new Set(state.mapel.length ? state.mapel.map((m) => m.nama) : defs.slice(0, state.profile.jenjang === 'sd' ? 8 : 12));
  const names = [...new Set([...defs, ...state.mapel.map((m) => m.nama), ...pick])];
  return { bare: true, html: shell(3, 'Pilih mata pelajaranmu', 'Warna tiap mapel dipakai di jadwal, tugas, dan kalender.',
    `<div class="mcards">${names.map((n, i) => { const [bg, fg] = PAL[i % PAL.length]; return `<label class="mcard"><input type="checkbox" class="sr" data-chg="obPick" value="${esc(n)}" ${pick.has(n) ? 'checked' : ''}><span class="dot" style="background:${bg};color:${fg}">${esc(singkat(n))}</span><span class="grow mname">${esc(n)}</span></label>`; }).join('')}</div>
<form class="row" data-form="obAddMapel"><input class="input grow" name="nama" placeholder="Mapel lain, misal: Bahasa Jawa" aria-label="Nama mapel lain" maxlength="40"><button class="btn btn-line" type="submit">${ic('plus')}Tambah</button></form>`,
    '#/mulai/jadwal', `Lanjut · ${pick.size} mapel`, '#/mulai/profil') };
}
function commitMapel() {
  if (isKuliah() || !pick) return;
  const keep = state.mapel.filter((m) => pick.has(m.nama));
  const names = new Set(keep.map((m) => m.nama));
  state.mapel = keep;
  const defs = MAPEL_DEFAULT[state.profile.jenjang] || [];
  [...pick].filter((n) => !names.has(n)).sort((a, b) => (defs.indexOf(a) + 1 || 99) - (defs.indexOf(b) + 1 || 99)).forEach((n) => state.mapel.push(newMapel(n)));
  const ids = new Set(state.mapel.map((m) => m.id));
  state.jadwal = state.jadwal.filter((e) => ids.has(e.mapelId));
  save();
}

let obDay = 1;
function jadwal() {
  if (isKuliah()) {
    const days = [1, 2, 3, 4, 5, 6];
    return { bare: true, html: shell(4, 'Isi jadwal kuliah', 'Tambahkan jam kuliah tiap hari. Bisa dilengkapi nanti.',
      `${days.map((h) => { const list = state.jadwal.filter((e) => e.hari === h).sort((a, b) => a.mulai.localeCompare(b.mulai)); return `<div class="grp"><span>${HARI[h]}</span></div><div class="list">${list.map((e) => { const m = mapelById(e.mapelId); return `<button type="button" class="list-item" data-act="kuliahEditOb" data-id="${e.id}"><span class="tcol"><b>${jam(e.mulai)}</b><span class="small muted">${jam(e.selesai)}</span></span>${mdot(m)}<b class="grow" style="text-align:left">${esc(m?.nama || '')}</b></button>`; }).join('')}<button type="button" class="list-item add-row" data-act="kuliahAddOb" data-h="${h}">${ic('plus', 18)}Tambah kuliah</button></div>`; }).join('')}`,
      '#/', 'Selesai', '#/mulai/mapel') };
  }
  const { slots: S, breaks: B } = slots();
  const days = state.profile.hariSekolah === 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const L = state.profile.pola === 'ab' ? (window.__obL || 'A') : null;
  const rows = S.map((s) => {
    const e = state.jadwal.find((x) => x.hari === obDay && x.jamKe === s.jamKe && (!L || x.minggu === 'semua' || x.minggu === L));
    const m = e && mapelById(e.mapelId);
    const br = B.find((b) => b.after === s.jamKe);
    const slot = m
      ? `<button class="slot" type="button" data-act="obSlot" data-j="${s.jamKe}"><span class="dot" style="background:var(--surface2);color:var(--ink2)">${s.jamKe}</span><span class="col grow" style="gap:2px"><span class="small muted">${jam(s.mulai)}–${jam(s.selesai)}</span><b>${esc(m.nama)}</b></span>${mdot(m, 32)}</button>`
      : `<button class="slot slot-empty" type="button" data-act="obSlot" data-j="${s.jamKe}"><span class="dot" style="background:var(--seg);color:var(--ink2)">${s.jamKe}</span><span class="col" style="gap:2px"><span class="small muted">${jam(s.mulai)}–${jam(s.selesai)}</span><span>${ic('plus', 16)} Pilih mapel</span></span></button>`;
    return slot + (br ? `<div class="brk">${esc(br.label)} · ${jam(br.mulai)}–${jam(br.selesai)}</div>` : '');
  }).join('');
  return { bare: true, html: shell(4, 'Isi jadwal mingguan', 'Ketuk slot lalu pilih mapel. Bisa dilengkapi nanti di tab Jadwal.',
    `<div class="picks">${days.map((h) => `<label class="pick"><input type="radio" name="obd" value="${h}" ${h === obDay ? 'checked' : ''} data-chg="obDay"><span>${HARI[h].slice(0, 3)}</span></label>`).join('')}</div>
${L ? seg('obL', [['A', 'Minggu A'], ['B', 'Minggu B']], L, 'data-chg="obL"') : ''}
<div class="col" style="gap:8px">${rows}</div>
<button class="btn btn-line wrap" type="button" data-act="obCopyDay">${ic('copy')}Salin dari hari sebelumnya</button>`,
    '#/', 'Selesai', '#/mulai/mapel') };
}

function finish() {
  const p = state.profile;
  if (!p.abAnchor) p.abAnchor = iso(mondayOf(new Date()));
  state.setup = true; save(); applyTheme();
  navigator.storage?.persist?.().catch(() => {});
}

register({
  views: { mulai: (params) => { const s = params[0]; return s === 'jenjang' ? jenjang() : s === 'profil' ? profil() : s === 'mapel' ? mapel() : s === 'jadwal' ? jadwal() : welcome(); } },
  actions: {
    obNext: (el, e) => {
      const n = Number(el.dataset.n);
      if (n === 2) { const f = document.querySelector('[data-form="obProfil"]'); if (f) FORM_PROFIL(f); }
      if (n === 3) { if (!isKuliah()) { if (!pick || !pick.size) { e.preventDefault(); toast('Pilih minimal satu mapel'); return; } commitMapel(); } }
      if (n === 4) { e.preventDefault(); finish(); toast('Siap! Selamat memakai Jadwalin'); go('#/'); }
    },
    obDemo: () => { demoData(); save(); applyTheme(); navigator.storage?.persist?.().catch(() => {}); toast('Data contoh dimuat'); go('#/'); },
    obRestore: () => { go('#/backup'); },
    obSlot: (el) => slotForm(obDay, Number(el.dataset.j), state.profile.pola === 'ab' ? (window.__obL || 'A') : null),
    obCopyDay: () => {
      const prev = obDay === 1 ? null : obDay - 1; if (!prev) { toast('Senin tidak punya hari sebelumnya'); return; }
      state.jadwal = state.jadwal.filter((e) => e.hari !== obDay);
      state.jadwal.filter((e) => e.hari === prev).forEach((e) => state.jadwal.push({ ...e, id: Math.random().toString(36).slice(2), hari: obDay }));
      save(); rerender();
    },
    mapelAddOb: () => mapelForm(null),
    mapelEditOb: (el) => mapelForm(state.mapel.find((m) => m.id === el.dataset.id)),
    kuliahAddOb: (el) => kuliahForm(null, Number(el.dataset.h)),
    kuliahEditOb: (el) => kuliahForm(state.jadwal.find((e) => e.id === el.dataset.id)),
  },
  changes: {
    obJenjang: (el) => { if (state.profile.jenjang !== el.value) { convertJadwal(el.value); state.profile.jenjang = el.value; pick = null; } save(); applyTheme(); },
    obPick: (el) => { el.checked ? pick.add(el.value) : pick.delete(el.value); const b = document.querySelector('.ob-next'); if (b) b.textContent = `Lanjut · ${pick.size} mapel`; },
    obDay: (el) => { obDay = Number(el.value); rerender(); },
    obL: (el) => { window.__obL = el.value; rerender(); },
  },
  forms: {
    obAddMapel: (f) => { const n = f.nama.value.trim(); if (!n) return; pick.add(n); rerender(); },
    obProfil: (f) => { FORM_PROFIL(f); go('#/mulai/mapel'); },
  },
});
function FORM_PROFIL(f) {
  const fd = new FormData(f), p = state.profile;
  for (const k of ['nama', 'kelas', 'sekolah', 'semester', 'jamMasuk', 'pola']) if (fd.has(k)) p[k] = String(fd.get(k)).trim();
  for (const k of ['durasi', 'jamPerHari', 'hariSekolah']) if (fd.has(k)) p[k] = Number(fd.get(k));
  if (p.pola === 'ab' && !p.abAnchor) p.abAnchor = iso(mondayOf(new Date()));
  save();
}
