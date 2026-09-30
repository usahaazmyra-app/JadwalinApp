// Logika inti: jadwal, status tugas, bawaan, bentrok, pengingat, progres
import { state } from './store.js';
import { iso, parseISO, parseDT, addDays, startOfDay, today, mondayOf, daysBetween, toMin, fromMin, jam, fmtLong, fmtShort, HARI, nowMin, stamp, uid } from './util.js';

export const PAL = [
  ['#DBEAFE', '#1D4ED8'], ['#DCFCE7', '#15803D'], ['#CCFBF1', '#0F766E'], ['#ECFCCB', '#4D7C0F'], ['#EDE9FE', '#6D28D9'],
  ['#FCE7F3', '#BE185D'], ['#FEF3C7', '#B45309'], ['#FFEDD5', '#C2410C'], ['#E0F2FE', '#0369A1'], ['#E0E7FF', '#4338CA'],
  ['#FAE8FF', '#A21CAF'], ['#FEE2E2', '#B91C1C'], ['#F1F5F9', '#334155'], ['#E7E5E4', '#57534E'],
];
export const MAPEL_DEFAULT = {
  sd: ['Matematika', 'B. Indonesia', 'IPAS', 'Pend. Pancasila', 'PJOK', 'Seni Budaya', 'Pend. Agama', 'B. Inggris', 'B. Daerah'],
  sekolah: ['Matematika', 'B. Indonesia', 'B. Inggris', 'Fisika', 'Kimia', 'Biologi', 'Sejarah', 'PJOK', 'Pend. Agama', 'Informatika', 'Seni Budaya', 'PPKn', 'Ekonomi', 'Geografi', 'Sosiologi', 'IPA', 'IPS'],
  kuliah: [],
};
export const JENJANG = { sd: 'SD', sekolah: 'SMP–SMA/SMK', kuliah: 'Mahasiswa' };
export const JENIS_TUGAS = ['PR', 'Kelompok', 'Proyek', 'Ulangan', 'Lainnya'];

export const isKuliah = () => state.profile.jenjang === 'kuliah';
export const isSD = () => state.profile.jenjang === 'sd';
export const istilah = () => ({
  mapel: isKuliah() ? 'Mata kuliah' : 'Mapel',
  guru: isKuliah() ? 'Dosen' : 'Guru',
  pr: isSD() ? 'PR' : 'Tugas',
});

export const mapelById = (id) => state.mapel.find((m) => m.id === id);
export const mapelName = (id) => mapelById(id)?.nama || 'Tanpa mapel';
export function singkat(nama) {
  const w = nama.replace(/[^A-Za-z0-9 .]/g, '').split(/[\s.]+/).filter(Boolean);
  if (!w.length) return '—';
  if (w.length === 1) return (w[0].length <= 4 && w[0] === w[0].toUpperCase() ? w[0] : w[0].slice(0, 3)).toUpperCase();
  if (w[0].length === 1) return (w[0] + w[1].slice(0, 3)).toUpperCase(); // B. Indonesia -> BIND
  return w.map((x) => x[0]).join('').slice(0, 4).toUpperCase();
}
export function newMapel(nama, extra = {}) {
  const used = state.mapel.map((m) => m.warna);
  let warna = 0; for (let i = 0; i < PAL.length; i++) { if (!used.includes(i)) { warna = i; break; } warna = state.mapel.length % PAL.length; }
  return { id: uid(), nama, singkat: singkat(nama), warna, guru: '', ruang: '', sks: 0, bawaan: [], ...extra };
}

// ---------- jam pelajaran ----------
export function slots(p = state.profile) {
  const out = [], brk = [];
  let t = toMin(p.jamMasuk || '07:00');
  for (let i = 1; i <= p.jamPerHari; i++) {
    out.push({ jamKe: i, mulai: fromMin(t), selesai: fromMin(t + p.durasi) });
    t += p.durasi;
    const b = (p.breaks || []).find((x) => x.after === i);
    if (b && i < p.jamPerHari) { brk.push({ after: i, label: b.label, mulai: fromMin(t), selesai: fromMin(t + b.durasi) }); t += b.durasi; }
  }
  return { slots: out, breaks: brk };
}

// saat ganti jenjang: jam ke- <-> jam bebas
export function convertJadwal(to) {
  const S = slots().slots;
  if (to === 'kuliah') {
    for (const e of state.jadwal) if (!e.mulai) { const s = S.find((x) => x.jamKe === e.jamKe); e.mulai = s ? s.mulai : '07:00'; e.selesai = s ? s.selesai : '08:00'; }
  } else {
    for (const e of state.jadwal) if (!e.jamKe) {
      let best = S[0], d = 1e9;
      for (const s of S) { const x = Math.abs(toMin(s.mulai) - toMin(e.mulai || '07:00')); if (x < d) { d = x; best = s; } }
      e.jamKe = best ? best.jamKe : 1; if (!e.minggu) e.minggu = 'semua';
    }
  }
}

export function weekLetter(date) {
  const p = state.profile;
  if (p.pola !== 'ab') return null;
  const anchor = p.abAnchor ? parseISO(p.abAnchor) : mondayOf(new Date());
  const w = Math.floor(daysBetween(anchor, mondayOf(date)) / 7);
  return ((w % 2) + 2) % 2 === 0 ? p.abStart : (p.abStart === 'A' ? 'B' : 'A');
}

export function exceptionOn(date) {
  const s = iso(date);
  return state.pengecualian.find((p) => p.dari <= s && s <= (p.sampai || p.dari));
}

export function isSchoolDay(date) {
  const dow = date.getDay();
  if (dow === 0) return false;
  if (!isKuliah() && dow > state.profile.hariSekolah) return false;
  return true;
}

export function lessonsOn(date) {
  const dow = date.getDay();
  const ex = exceptionOn(date);
  if (!isSchoolDay(date)) return { items: [], libur: true, label: dow === 0 ? 'Minggu' : 'Tidak ada sekolah', ex };
  if (ex && ex.jenis === 'libur') return { items: [], libur: true, label: ex.ket || 'Libur', ex };
  const L = weekLetter(date);
  const S = slots().slots;
  let items = state.jadwal
    .filter((e) => e.hari === dow && (!L || e.minggu === 'semua' || e.minggu === L))
    .map((e) => {
      const m = mapelById(e.mapelId); if (!m) return null;
      let mulai, selesai;
      if (isKuliah() && e.mulai) { mulai = e.mulai; selesai = e.selesai; }
      else { const s = S.find((x) => x.jamKe === e.jamKe); if (!s) return null; mulai = s.mulai; selesai = s.selesai; }
      return { id: e.id, entry: e, mapel: m, mulai, selesai, jamKe: e.jamKe, ruang: e.ruang || m.ruang || '' };
    })
    .filter(Boolean)
    .sort((a, b) => toMin(a.mulai) - toMin(b.mulai));
  if (ex && ex.jenis === 'pulang' && ex.jamPulang) items = items.filter((i) => toMin(i.mulai) < toMin(ex.jamPulang));
  return { items, libur: false, ex, letter: L };
}

export function lessonNow(date = new Date()) {
  const { items } = lessonsOn(startOfDay(date));
  const n = date.getHours() * 60 + date.getMinutes();
  const now = items.find((i) => toMin(i.mulai) <= n && n < toMin(i.selesai)) || null;
  const next = items.find((i) => toMin(i.mulai) > n) || null;
  return { now, next, items };
}

export function nextMeeting(mapelId, from = today()) {
  for (let i = 1; i <= 42; i++) {
    const d = addDays(from, i);
    const it = lessonsOn(d).items.find((x) => x.mapel.id === mapelId);
    if (it) return { date: d, mulai: it.mulai };
  }
  return null;
}

export function nextSchoolDay(from = today()) {
  for (let i = 1; i <= 14; i++) {
    const d = addDays(from, i);
    const L = lessonsOn(d);
    if (!L.libur && L.items.length) return d;
  }
  return addDays(from, 1);
}

// ---------- tugas ----------
export const openTasks = () => state.tugas.filter((t) => !t.selesai);
export function taskStatus(t, now = new Date()) {
  if (t.selesai) return { kind: 'done', label: 'Selesai', meta: '' };
  if (!t.deadline) return { kind: 'later', label: 'Tanpa deadline', meta: '' };
  const d = parseDT(t.deadline);
  const diff = daysBetween(now, d);
  const time = jam(t.deadline.slice(11, 16));
  let kind, label, meta = time;
  if (d < now) { kind = 'late'; label = 'Terlambat'; meta = diff === -1 ? 'Kemarin' : diff === 0 ? time : fmtShort(d); }
  else if (diff === 0) { kind = 'today'; label = 'Hari ini'; }
  else if (diff === 1) { kind = 'week'; label = 'Besok'; }
  else if (diff <= 6) { kind = 'week'; label = HARI[d.getDay()]; }
  else { kind = 'later'; label = fmtShort(d); meta = ''; }
  const L = t.langkah || [];
  if (L.length) meta = [meta, `${L.filter((x) => x.done).length}/${L.length} langkah`].filter(Boolean).join(' · ');
  return { kind, label, meta };
}
export function sortTasks(list) {
  return [...list].sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
}
export function groupTasks(list) {
  const g = { late: [], today: [], week: [], later: [] };
  for (const t of sortTasks(list)) { const k = taskStatus(t).kind; (g[k] || g.later).push(t); }
  return g;
}

// ---------- kegiatan ----------
export function kegiatanOn(date) {
  const dow = date.getDay(), s = iso(date);
  return state.kegiatan
    .filter((k) => (k.ulang === 'mingguan' ? (k.hari || []).includes(dow) : k.tanggal === s))
    .sort((a, b) => toMin(a.mulai) - toMin(b.mulai));
}
export function bentrok(k) {
  const dates = [];
  if (k.ulang === 'sekali') { if (k.tanggal) dates.push(parseISO(k.tanggal)); }
  else for (const h of k.hari || []) { for (let i = 0; i < 7; i++) { const x = addDays(today(), i); if (x.getDay() === h) { dates.push(x); break; } } }
  const a = toMin(k.mulai), b = toMin(k.selesai), out = [];
  if (!(b > a)) return out;
  for (const d of dates) {
    for (const it of lessonsOn(d).items) {
      const ov = Math.min(b, toMin(it.selesai)) - Math.max(a, toMin(it.mulai));
      if (ov > 0) out.push({ nama: it.mapel.nama, tanggal: d, mulai: it.mulai, selesai: it.selesai, ov, lokasi: it.ruang });
    }
    for (const o of kegiatanOn(d)) {
      if (o.id === k.id) continue;
      const ov = Math.min(b, toMin(o.selesai)) - Math.max(a, toMin(o.mulai));
      if (ov > 0) out.push({ nama: o.nama, tanggal: d, mulai: o.mulai, selesai: o.selesai, ov, lokasi: o.lokasi });
    }
  }
  return out;
}

// ---------- bawaan ----------
export function bawaanFor(date) {
  const groups = [], seen = new Set();
  for (const it of lessonsOn(date).items) {
    if (seen.has(it.mapel.id)) continue; seen.add(it.mapel.id);
    if ((it.mapel.bawaan || []).length) groups.push({ key: it.mapel.id, mapel: it.mapel, jamKe: it.jamKe, mulai: it.mulai, items: it.mapel.bawaan.map((x) => ({ key: `${it.mapel.id}:${x}`, teks: x })) });
  }
  const due = state.tugas.filter((t) => !t.selesai && t.deadline && t.deadline.slice(0, 10) === iso(date));
  if (due.length) groups.push({ key: 'tugas', title: 'Dikumpulkan', items: due.map((t) => ({ key: `t:${t.id}`, teks: t.judul, mapel: mapelById(t.mapelId) })) });
  const ex = state.bawaanExtra[iso(date)] || [];
  if (ex.length) groups.push({ key: 'extra', title: 'Tambahan', items: ex.map((x) => ({ key: `x:${x}`, teks: x, extra: true })) });
  const cek = new Set(state.bawaanCek[iso(date)] || []);
  const all = groups.flatMap((g) => g.items);
  return { groups, total: all.length, done: all.filter((i) => cek.has(i.key)).length, cek };
}

// ---------- ujian ----------
export function upcomingUjian() {
  const s = iso(today());
  return [...state.ujian].filter((u) => u.tanggal >= s).sort((a, b) => (a.tanggal + (a.mulai || '')).localeCompare(b.tanggal + (b.mulai || '')));
}

// ---------- progres ----------
export function streak() {
  const days = new Set();
  for (const t of state.tugas) { if (t.selesaiAt) days.add(t.selesaiAt.slice(0, 10)); if (t.dibuat) days.add(t.dibuat.slice(0, 10)); }
  let d = today(); if (!days.has(iso(d))) d = addDays(d, -1);
  let n = 0; while (days.has(iso(d))) { n++; d = addDays(d, -1); }
  return n;
}
export function progresWeek(monday) {
  const a = iso(monday), b = iso(addDays(monday, 6));
  const inWeek = state.tugas.filter((t) => t.deadline && t.deadline.slice(0, 10) >= a && t.deadline.slice(0, 10) <= b);
  const done = inWeek.filter((t) => t.selesai);
  const perDay = [0, 0, 0, 0, 0, 0, 0];
  for (const t of state.tugas) { if (!t.selesaiAt) continue; const s = t.selesaiAt.slice(0, 10); if (s >= a && s <= b) perDay[daysBetween(monday, parseISO(s))]++; }
  const perMapel = {};
  for (const t of inWeek) { const k = t.mapelId || '-'; perMapel[k] = perMapel[k] || { total: 0, done: 0 }; perMapel[k].total++; if (t.selesai) perMapel[k].done++; }
  return { total: inWeek.length, done: done.length, perDay, perMapel };
}

// ---------- ringkasan & pengingat ----------
export function summaryText(d = today()) {
  const L = lessonsOn(d);
  const due = openTasks().filter((t) => t.deadline && t.deadline.slice(0, 10) === iso(d)).length;
  const keg = kegiatanOn(d).length;
  const parts = [];
  parts.push(L.libur ? L.label : `${L.items.length} ${isKuliah() ? 'kuliah' : 'pelajaran'}`);
  if (due) parts.push(`${due} tugas deadline hari ini`);
  if (keg) parts.push(`${keg} kegiatan`);
  return parts.join(' · ');
}

export function reminders(now = new Date()) {
  const n = state.settings.notif, out = [], t0 = today();
  const at = (d, t) => { const [h, m] = t.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m); };
  if (n.pagi) out.push({ key: `pagi:${iso(t0)}`, time: at(t0, n.jamPagi), title: `Selamat pagi${state.profile.nama ? ', ' + state.profile.nama : ''}`, body: summaryText(t0), url: '#/' });
  for (const t of state.tugas) {
    if (t.selesai || !t.deadline || t.ingat === false) continue;
    const d = parseDT(t.deadline);
    if (n.h1) out.push({ key: `h1:${t.id}:${t.deadline}`, time: at(addDays(startOfDay(d), -1), n.jamH1), title: `Besok: ${t.judul}`, body: `${mapelName(t.mapelId)} · deadline ${fmtLong(d)} ${jam(t.deadline.slice(11, 16))}`, url: `#/tugas/${t.id}` });
    if (n.dekat) out.push({ key: `dk:${t.id}:${t.deadline}`, time: new Date(d - n.dekatJam * 36e5), title: `${n.dekatJam} jam lagi: ${t.judul}`, body: `Deadline pukul ${jam(t.deadline.slice(11, 16))}`, url: `#/tugas/${t.id}` });
  }
  if (n.kegiatan) for (let i = 0; i < 2; i++) {
    const d = addDays(t0, i);
    for (const k of kegiatanOn(d)) out.push({ key: `kg:${k.id}:${iso(d)}`, time: new Date(at(d, k.mulai) - n.kegiatanMenit * 6e4), title: `${k.nama} ${n.kegiatanMenit} menit lagi`, body: `${jam(k.mulai)}–${jam(k.selesai)}${k.lokasi ? ' · ' + k.lokasi : ''}`, url: '#/kegiatan' });
  }
  if (n.ujian) for (const u of state.ujian) {
    const d = parseISO(u.tanggal);
    for (const h of [3, 1]) out.push({ key: `uj${h}:${u.id}`, time: at(addDays(d, -h), n.jamH1), title: `${u.jenis || 'Ujian'} ${h === 1 ? 'besok' : '3 hari lagi'}: ${mapelName(u.mapelId)}`, body: (u.materi || []).length ? `${u.materi.filter((x) => x.done).length}/${u.materi.length} materi sudah dipelajari` : fmtLong(d), url: '#/ujian' });
  }
  if (state.settings.ringkasanOtomatis && isSD() && t0.getDay() === 0) out.push({ key: `rk:${iso(t0)}`, time: at(t0, '18:00'), title: 'Ringkasan mingguan siap', body: 'Kirim ringkasan PR dan bawaan ke orang tua.', url: '#/ringkasan' });
  return out;
}

export function inSchoolHours(now = new Date()) {
  const { items } = lessonsOn(startOfDay(now));
  if (!items.length) return false;
  const n = now.getHours() * 60 + now.getMinutes();
  return n >= toMin(items[0].mulai) && n < toMin(items.at(-1).selesai);
}

// ---------- data contoh ----------
export function demoData() {
  const S = state;
  const p = S.profile;
  Object.assign(p, { nama: 'Raka', jenjang: 'sekolah', kelas: '11 IPA 2', sekolah: 'SMAN 1 Harapan', jamMasuk: '07:00', durasi: 45, jamPerHari: 8, hariSekolah: 5, pola: 'tetap', abAnchor: iso(mondayOf(new Date())), abStart: 'A' });
  const names = [['Matematika', 'Bu Ratna', 'R. 11 IPA 2', ['Jangka & busur']], ['B. Indonesia', 'Bu Wulan', 'R. 11 IPA 2', []], ['B. Inggris', 'Mr. Adi', 'R. 11 IPA 2', ['Buku paket B. Inggris', 'Kamus']], ['Fisika', 'Pak Hendra', 'Lab Fisika', ['Buku paket Fisika', 'Kalkulator']], ['Kimia', 'Bu Maya', 'Lab Kimia', ['Jas lab']], ['Biologi', 'Bu Lina', 'Lab Biologi', []], ['Sejarah', 'Pak Joko', 'R. 11 IPA 2', []], ['PJOK', 'Pak Rudi', 'Lapangan', ['Seragam olahraga', 'Sepatu olahraga']], ['Pend. Agama', 'Ust. Fajar', 'Musala', []], ['Informatika', 'Pak Dimas', 'Lab Komputer', []], ['Seni Budaya', 'Bu Tari', 'R. Seni', []], ['PPKn', 'Bu Nia', 'R. 11 IPA 2', []]];
  S.mapel = names.map(([n, g, r, b], i) => ({ id: uid(), nama: n, singkat: singkat(n), warna: [0, 5, 4, 1, 2, 3, 6, 7, 8, 9, 10, 11][i], guru: g, ruang: r, sks: 0, bawaan: b }));
  const id = (n) => S.mapel.find((m) => m.nama === n).id;
  const sched = {
    1: ['Matematika', 'Matematika', 'B. Indonesia', 'B. Indonesia', 'Fisika', 'Fisika', 'PPKn', 'Pend. Agama'],
    2: ['B. Inggris', 'B. Inggris', 'Kimia', 'Kimia', 'Sejarah', 'Sejarah', 'Biologi', 'Biologi'],
    3: ['Matematika', 'Matematika', 'Fisika', 'B. Inggris', 'B. Inggris', 'Kimia', 'Informatika', 'Informatika'],
    4: ['PJOK', 'PJOK', 'Sejarah', 'B. Inggris', 'Matematika', 'Matematika', 'Biologi', 'Seni Budaya'],
    5: ['Pend. Agama', 'Pend. Agama', 'B. Indonesia', 'Kimia', 'Biologi', 'Seni Budaya'],
  };
  S.jadwal = [];
  for (const [h, list] of Object.entries(sched)) list.forEach((n, i) => S.jadwal.push({ id: uid(), hari: Number(h), jamKe: i + 1, minggu: 'semua', mapelId: id(n), ruang: '' }));
  const t0 = today();
  const dt = (days, time) => `${iso(addDays(t0, days))}T${time}`;
  const mk = (judul, m, jenis, dl, extra = {}) => ({ id: uid(), judul, mapelId: id(m), jenis, deadline: dl, prioritas: false, instruksi: '', format: '', langkah: [], anggota: [], lampiran: [], selesai: false, selesaiAt: null, dibuat: stamp(addDays(new Date(), -3)), ingat: true, ...extra });
  const step = (arr) => arr.map(([teks, done]) => ({ id: uid(), teks, done }));
  S.tugas = [
    mk('Laporan praktikum Kimia', 'Kimia', 'PR', dt(-1, '07:00')),
    mk('LKS Matematika hal. 42', 'Matematika', 'PR', dt(0, '23:59')),
    mk('Presentasi kelompok Sejarah', 'Sejarah', 'Kelompok', dt(1, '08:30'), { prioritas: true, instruksi: 'Presentasi 10 menit tentang Kerajaan Majapahit: latar belakang, masa kejayaan, dan penyebab keruntuhan.', format: 'Presentasi, slide PPT, 10 menit', langkah: step([['Bagi materi ke anggota', true], ['Tulis bagian masa kejayaan', true], ['Gabungkan slide', false], ['Latihan presentasi', false]]), anggota: [{ id: uid(), nama: 'Raka (kamu)', bagian: 'Masa kejayaan', done: true }, { id: uid(), nama: 'Dinda', bagian: 'Latar belakang', done: true }, { id: uid(), nama: 'Bima', bagian: 'Penyebab keruntuhan', done: false }, { id: uid(), nama: 'Salma', bagian: 'Menyusun slide', done: false }] }),
    mk('Essay “My dream job”', 'B. Inggris', 'PR', dt(3, '23:59')),
    mk('Proyek video Informatika', 'Informatika', 'Proyek', dt(14, '23:59'), { langkah: step([['Tulis naskah', true], ['Rekam', false], ['Edit', false], ['Tambah subtitle', false], ['Unggah', false]]) }),
    mk('Latihan soal limit', 'Matematika', 'PR', dt(-2, '23:59'), { selesai: true, selesaiAt: stamp(addDays(new Date(), -2)) }),
    mk('Vocabulary unit 3', 'B. Inggris', 'PR', dt(-1, '23:59'), { selesai: true, selesaiAt: stamp(addDays(new Date(), -1)) }),
  ];
  S.kegiatan = [
    { id: uid(), nama: 'Paskibra', kategori: 'ekskul', ulang: 'mingguan', hari: [3, 6], tanggal: '', mulai: '15:30', selesai: '17:30', lokasi: 'Lapangan utama', catatan: '' },
    { id: uid(), nama: 'English Club', kategori: 'ekskul', ulang: 'mingguan', hari: [4], tanggal: '', mulai: '15:30', selesai: '17:00', lokasi: 'Ruang Bahasa', catatan: '' },
    { id: uid(), nama: 'Les Matematika', kategori: 'les', ulang: 'mingguan', hari: [1, 3], tanggal: '', mulai: '19:00', selesai: '20:30', lokasi: 'Bimbel Cerdas', catatan: '' },
  ];
  const mat = (arr) => arr.map(([teks, done]) => ({ id: uid(), teks, done }));
  S.ujian = [
    { id: uid(), jenis: 'PTS', nama: 'PTS Ganjil', mapelId: id('Matematika'), tanggal: iso(addDays(t0, 13)), mulai: '07:30', selesai: '09:30', ruang: 'R. 11 IPA 2', materi: mat([['Barisan & deret', true], ['Limit fungsi', true], ['Turunan dasar', false]]) },
    { id: uid(), jenis: 'PTS', nama: 'PTS Ganjil', mapelId: id('Fisika'), tanggal: iso(addDays(t0, 14)), mulai: '07:30', selesai: '09:30', ruang: 'R. 11 IPA 2', materi: mat([['GLBB', false], ['Hukum Newton', false]]) },
    { id: uid(), jenis: 'UH', nama: 'Ulangan harian', mapelId: id('Biologi'), tanggal: iso(addDays(t0, 3)), mulai: '07:00', selesai: '08:30', ruang: '', materi: mat([['Sistem gerak', false]]) },
  ];
  S.catatan = [
    { id: uid(), judul: 'Rumus GLBB', isi: 'GLBB = gerak lurus berubah beraturan; percepatannya tetap.\n\nvt = v0 + a·t\ns = v0·t + ½·a·t²\nvt² = v0² + 2·a·s', mapelId: id('Fisika'), foto: [], dibuat: stamp(), diubah: stamp() },
    { id: uid(), judul: 'Kerajaan Majapahit', isi: 'Berdiri 1293; mencapai puncak kejayaan pada masa Hayam Wuruk.', mapelId: id('Sejarah'), foto: [], dibuat: stamp(), diubah: stamp() },
  ];
  S.setup = true;
}
