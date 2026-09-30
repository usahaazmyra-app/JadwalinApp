// Form dalam sheet: tambah cepat, tugas, slot jadwal, mapel, pengecualian, kegiatan, ujian, catatan, PIN
import { state, save, putFile } from './store.js';
import { uid, esc, iso, addDays, today, stamp, parseISO, jam, fmtLong, fmtShort, HARI3, toMin, hash, $ } from './util.js';
import { PAL, mapelById, isKuliah, isSD, lessonNow, lessonsOn, nextMeeting, bentrok, newMapel, singkat, JENIS_TUGAS, slots, istilah } from './logic.js';
import { openSheet, closeSheet, field, area, select, seg, picks, swRow, ic, toast, schip } from './ui.js';
import { register, go, rerender } from './core.js';

export const mapelOpts = (none = true) => [...(none ? [['', '— Tanpa mapel —']] : []), ...state.mapel.map((m) => [m.id, m.nama])];

// ---------- foto ----------
export function pickPhoto() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return resolve(null);
      const img = new Image(); const url = URL.createObjectURL(f);
      img.onload = () => {
        const max = 1280, sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    };
    inp.click();
  });
}
export async function addPhoto() { const d = await pickPhoto(); if (!d) return null; return putFile(d); }

// ---------- deadline helpers ----------
function lessonStart(mapelId, d) { const it = lessonsOn(d).items.find((x) => x.mapel.id === mapelId); return it ? it.mulai : '23:59'; }
function quickDeadline(kind, mapelId) {
  const t0 = today();
  if (kind === 'besok') { const d = addDays(t0, 1); return `${iso(d)}T${lessonStart(mapelId, d)}`; }
  if (kind === 'lusa') { const d = addDays(t0, 2); return `${iso(d)}T${lessonStart(mapelId, d)}`; }
  if (kind === 'next') { const n = mapelId && nextMeeting(mapelId); if (n) return `${iso(n.date)}T${n.mulai}`; const d = addDays(t0, 1); return `${iso(d)}T23:59`; }
  return null;
}
function nextLabel(mapelId) { const n = mapelId && nextMeeting(mapelId); return n ? `Pertemuan berikutnya · ${fmtShort(n.date)}` : 'Pertemuan berikutnya'; }

// ---------- tambah cepat ----------
export function quickAdd(mode = 'tugas') {
  const { now, next } = lessonNow();
  const cur = (now || next)?.mapel?.id || '';
  const modeSeg = `<div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['tugas', 'Tugas'], ['kegiatan', 'Kegiatan'], ['catatan', 'Catatan']].map(([v, t]) => `<label><input type="radio" name="qmode" value="${v}" ${v === mode ? 'checked' : ''} data-chg="qaMode"><span>${t}</span></label>`).join('')}</div>`;
  if (mode === 'kegiatan') return kegiatanForm(null, modeSeg);
  if (mode === 'catatan') {
    return openSheet({
      title: 'Tambah cepat', submit: 'Simpan catatan',
      body: `${modeSeg}${field('Judul catatan', 'judul', '', 'text', 'autofocus required maxlength="120"')}${select(istilah().mapel, 'mapelId', mapelOpts(), cur)}${area('Isi', 'isi', '', 'rows="5"')}`,
      onSubmit: (fd) => {
        const judul = fd.get('judul').trim(); if (!judul) return 'Judul catatan belum diisi.';
        const c = { id: uid(), judul, isi: fd.get('isi'), mapelId: fd.get('mapelId'), foto: [], dibuat: stamp(), diubah: stamp() };
        state.catatan.unshift(c); save(); setTimeout(() => go(`#/catatan/${c.id}`), 0);
      },
    });
  }
  const mapelHint = now ? ' · otomatis dari pelajaran sekarang' : (next ? ' · pelajaran berikutnya' : '');
  openSheet({
    title: 'Tambah cepat', submit: 'Simpan',
    left: `<button type="button" class="btn btn-line" data-act="qaDetail">Isi detail</button>`,
    body: `${modeSeg}
${field(isSD() ? 'Judul PR' : 'Judul tugas', 'judul', '', 'text', 'autofocus required maxlength="140" placeholder="Misal: LKS hal. 45 no. 1–10"')}
<div class="field"><label for="f-mapelId">${istilah().mapel}<span class="muted" style="font-weight:500">${mapelHint}</span></label><select id="f-mapelId" class="input" name="mapelId" data-chg="qaMapel">${mapelOpts().map(([v, t]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
<div class="field"><span class="label">Jenis</span>${picks('jenis', JENIS_TUGAS.slice(0, 4), 'PR')}</div>
<div class="field"><span class="label">Deadline</span>${picks('dl', [['besok', 'Besok'], ['lusa', 'Lusa'], ['next', `<span id="qaNext">${esc(nextLabel(cur))}</span>`], ['custom', 'Pilih tanggal']], cur ? 'next' : 'besok', { attrs: 'data-chg="qaDl"' })}</div>
<div class="grid2" id="qaCustom" hidden>${field('Tanggal', 'tgl', iso(addDays(today(), 1)), 'date')}${field('Jam', 'jam', '23:59', 'time')}</div>
<label class="set-row" style="padding:4px 0"><span class="row grow" style="gap:8px;font-weight:600">${ic('bell', 18)}Ingatkan H-1 pukul ${jam(state.settings.notif.jamH1)}</span><input type="checkbox" class="switch" name="ingat" checked></label>`,
    onSubmit: (fd) => saveQuickTask(fd),
  });
}
function saveQuickTask(fd, openDetail = false) {
  const judul = (fd.get('judul') || '').trim();
  if (!judul) return 'Judul tugas belum diisi.';
  const mapelId = fd.get('mapelId') || '';
  const dl = fd.get('dl');
  const deadline = dl === 'custom' ? `${fd.get('tgl')}T${fd.get('jam') || '23:59'}` : quickDeadline(dl, mapelId);
  if (dl === 'custom' && !fd.get('tgl')) return 'Pilih tanggal deadline.';
  const t = { id: uid(), judul, mapelId, jenis: fd.get('jenis') || 'PR', deadline, prioritas: false, instruksi: '', format: '', langkah: [], anggota: [], lampiran: [], selesai: false, selesaiAt: null, dibuat: stamp(), ingat: !!fd.get('ingat') };
  state.tugas.push(t); save();
  toast('Tugas tersimpan');
  if (openDetail) setTimeout(() => go(`#/tugas/${t.id}`), 0); else rerender();
}

// ---------- edit tugas lengkap ----------
export function taskForm(t) {
  const isNew = !t;
  t = t || { judul: '', mapelId: lessonNow().now?.mapel.id || '', jenis: 'PR', deadline: `${iso(addDays(today(), 1))}T23:59`, prioritas: false, instruksi: '', format: '', ingat: true };
  openSheet({
    title: isNew ? 'Tugas baru' : 'Ubah tugas', submit: 'Simpan',
    body: `${field('Judul', 'judul', t.judul, 'text', 'required maxlength="140" autofocus')}
${select(istilah().mapel, 'mapelId', mapelOpts(), t.mapelId)}
<div class="field"><span class="label">Jenis</span>${picks('jenis', JENIS_TUGAS, t.jenis)}</div>
<div class="grid2">${field('Tanggal deadline', 'tgl', (t.deadline || '').slice(0, 10), 'date')}${field('Jam', 'jam', (t.deadline || '').slice(11, 16) || '23:59', 'time')}</div>
${area('Instruksi dari guru', 'instruksi', t.instruksi, 'rows="3"')}
${field('Format pengumpulan', 'format', t.format, 'text', 'placeholder="Misal: tulis tangan, file PDF, presentasi"')}
<div class="list">${swRow('Prioritas tinggi', '', 'prioritas', t.prioritas)}${swRow('Ingatkan', 'H-1 dan menjelang deadline', 'ingat', t.ingat !== false)}</div>`,
    onSubmit: (fd) => {
      const judul = fd.get('judul').trim(); if (!judul) return 'Judul belum diisi.';
      const data = { judul, mapelId: fd.get('mapelId'), jenis: fd.get('jenis') || 'PR', deadline: fd.get('tgl') ? `${fd.get('tgl')}T${fd.get('jam') || '23:59'}` : '', instruksi: fd.get('instruksi'), format: fd.get('format'), prioritas: !!fd.get('prioritas'), ingat: !!fd.get('ingat') };
      if (isNew) { const n = { id: uid(), langkah: [], anggota: [], lampiran: [], selesai: false, selesaiAt: null, dibuat: stamp(), ...data }; state.tugas.push(n); save(); setTimeout(() => go(`#/tugas/${n.id}`), 0); }
      else { Object.assign(t, data); save(); rerender(); }
    },
  });
}

// ---------- slot jadwal ----------
export function slotForm(hari, jamKe, letter) {
  const entries = state.jadwal.filter((e) => e.hari === hari && e.jamKe === jamKe);
  const L = state.profile.pola === 'ab' ? letter : null;
  const cur = entries.find((e) => e.minggu === 'semua' || !L || e.minggu === L);
  const s = slots().slots.find((x) => x.jamKe === jamKe);
  const HARIN = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  openSheet({
    title: `${HARIN[hari]} · Jam ke-${jamKe}`, submit: 'Simpan',
    left: cur ? `<button type="button" class="btn btn-danger" data-act="slotClear">${ic('trash', 18)}Kosongkan</button>` : '',
    body: `<p class="small muted" style="margin:0">${s ? `${jam(s.mulai)}–${jam(s.selesai)}` : ''}</p>
${select(istilah().mapel, 'mapelId', mapelOpts(false), cur?.mapelId || state.mapel[0]?.id || '')}
${field('Ruang (opsional)', 'ruang', cur?.ruang || '', 'text', 'placeholder="Kosongkan untuk memakai ruang default mapel"')}
${L ? `<div class="field"><span class="label">Berlaku untuk</span>${seg('minggu', [['A', 'Minggu A'], ['B', 'Minggu B'], ['semua', 'Semua']], cur ? cur.minggu : (L === 'B' || entries.length ? L : 'semua'))}</div>` : '<input type="hidden" name="minggu" value="semua">'}
<input type="hidden" name="hari" value="${hari}"><input type="hidden" name="jamKe" value="${jamKe}">
${state.mapel.length ? '' : '<p class="small muted">Belum ada mapel. Tambahkan dulu di Kelola mapel.</p>'}`,
    onSubmit: (fd) => {
      const mapelId = fd.get('mapelId'); if (!mapelId) return 'Pilih mapel dulu.';
      setSlot(hari, jamKe, fd.get('minggu') || 'semua', mapelId, fd.get('ruang').trim());
      save(); rerender();
    },
  });
}
export function setSlot(hari, jamKe, target, mapelId, ruang = '') {
  const other = (x) => (x === 'A' ? 'B' : 'A');
  for (const e of [...state.jadwal]) {
    if (e.hari !== hari || e.jamKe !== jamKe) continue;
    if (target === 'semua' || e.minggu === target) state.jadwal.splice(state.jadwal.indexOf(e), 1);
    else if (e.minggu === 'semua') e.minggu = other(target);
  }
  if (mapelId) state.jadwal.push({ id: uid(), hari, jamKe, minggu: target, mapelId, ruang });
}

export function kuliahForm(entry, hariDefault = 1) {
  const e = entry || { mapelId: state.mapel[0]?.id || '', hari: hariDefault, mulai: '08:00', selesai: '10:30', ruang: '' };
  openSheet({
    title: entry ? 'Ubah jadwal kuliah' : 'Tambah jadwal kuliah', submit: 'Simpan',
    left: entry ? `<button type="button" class="btn btn-danger" data-act="kuliahDel" data-id="${entry.id}">${ic('trash', 18)}Hapus</button>` : '',
    body: `${state.mapel.length ? select('Mata kuliah', 'mapelId', mapelOpts(false), e.mapelId) : '<p class="p">Belum ada mata kuliah. Tambahkan dulu lewat <a class="link" href="#/jadwal/mapel" data-act="closeSheet" style="display:inline">Kelola mata kuliah</a>.</p>'}
${select('Hari', 'hari', [[1, 'Senin'], [2, 'Selasa'], [3, 'Rabu'], [4, 'Kamis'], [5, 'Jumat'], [6, 'Sabtu']], e.hari)}
<div class="grid2">${field('Mulai', 'mulai', e.mulai, 'time')}${field('Selesai', 'selesai', e.selesai, 'time')}</div>
${field('Gedung & ruang', 'ruang', e.ruang, 'text', 'placeholder="Misal: Gedung B, R. 204"')}`,
    onSubmit: (fd) => {
      if (!fd.get('mapelId')) return 'Tambahkan mata kuliah dulu.';
      if (toMin(fd.get('selesai')) <= toMin(fd.get('mulai'))) return 'Jam selesai harus setelah jam mulai.';
      const data = { mapelId: fd.get('mapelId'), hari: Number(fd.get('hari')), mulai: fd.get('mulai'), selesai: fd.get('selesai'), ruang: fd.get('ruang').trim(), minggu: 'semua', jamKe: 0 };
      if (entry) Object.assign(entry, data); else state.jadwal.push({ id: uid(), ...data });
      save(); rerender();
    },
  });
}

// ---------- mapel ----------
export function mapelForm(m) {
  const isNew = !m;
  m = m || newMapel('');
  const sw = PAL.map(([bg, fg], i) => `<label class="sw"><input type="radio" name="warna" value="${i}" ${i === m.warna ? 'checked' : ''} aria-label="Warna ${i + 1}"><span style="background:${bg};color:${fg}">Aa</span></label>`).join('');
  openSheet({
    title: isNew ? `Tambah ${istilah().mapel.toLowerCase()}` : `Ubah ${istilah().mapel.toLowerCase()}`, submit: 'Simpan',
    left: isNew ? '' : `<button type="button" class="btn btn-danger" data-act="mapelDel" data-id="${m.id}">${ic('trash', 18)}Hapus</button>`,
    body: `<div class="grid2 g21">${field('Nama', 'nama', m.nama, 'text', 'required maxlength="40" autofocus')}${field('Singkatan', 'singkat', isNew ? '' : m.singkat, 'text', `maxlength="4" placeholder="${isNew ? 'Otomatis' : esc(singkat(m.nama))}"`)}</div>
<div class="field"><span class="label">Warna</span><div class="swatches">${sw}</div></div>
<div class="grid2">${field(istilah().guru, 'guru', m.guru)}${field('Ruang default', 'ruang', m.ruang)}</div>
${isKuliah() ? field('SKS', 'sks', m.sks || '', 'number', 'min="0" max="8" inputmode="numeric"') : ''}
${area('Barang bawaan tetap (satu per baris)', 'bawaan', (m.bawaan || []).join('\n'), 'rows="3" placeholder="Buku paket\nKalkulator"')}`,
    onSubmit: (fd) => {
      const nama = fd.get('nama').trim(); if (!nama) return 'Nama belum diisi.';
      Object.assign(m, { nama, singkat: (fd.get('singkat').trim().replace(/^—$/, '') || singkat(nama)).toUpperCase().slice(0, 4), warna: Number(fd.get('warna') ?? m.warna), guru: fd.get('guru').trim(), ruang: fd.get('ruang').trim(), sks: Number(fd.get('sks') || 0), bawaan: fd.get('bawaan').split('\n').map((x) => x.trim()).filter(Boolean) });
      if (isNew) state.mapel.push(m);
      save(); rerender();
    },
  });
}

// ---------- pengecualian ----------
export function pengecualianForm(p) {
  const isNew = !p;
  p = p || { jenis: 'libur', dari: iso(addDays(today(), 1)), sampai: '', jamPulang: '11:00', ket: '' };
  openSheet({
    title: isNew ? 'Tambah pengecualian' : 'Ubah pengecualian', submit: 'Simpan',
    left: isNew ? '' : `<button type="button" class="btn btn-danger" data-act="pgDel" data-id="${p.id}">${ic('trash', 18)}Hapus</button>`,
    body: `<div class="field"><span class="label">Jenis</span>${seg('jenis', [['libur', 'Libur'], ['pulang', 'Pulang cepat'], ['khusus', 'Jadwal khusus']], p.jenis)}</div>
<div class="grid2">${field('Dari tanggal', 'dari', p.dari, 'date', 'required')}${field('Sampai (opsional)', 'sampai', p.sampai || '', 'date')}</div>
${field('Jam pulang (untuk pulang cepat)', 'jamPulang', p.jamPulang || '11:00', 'time')}
${field('Keterangan', 'ket', p.ket, 'text', 'placeholder="Misal: rapat guru, PTS, class meeting"')}`,
    onSubmit: (fd) => {
      if (!fd.get('dari')) return 'Isi tanggal mulai.';
      if (fd.get('sampai') && fd.get('sampai') < fd.get('dari')) return 'Tanggal selesai sebelum tanggal mulai.';
      const data = { jenis: fd.get('jenis'), dari: fd.get('dari'), sampai: fd.get('sampai') || '', jamPulang: fd.get('jamPulang'), ket: fd.get('ket').trim() };
      if (isNew) state.pengecualian.push({ id: uid(), ...data }); else Object.assign(p, data);
      save(); rerender();
    },
  });
}

// ---------- kegiatan (ekskul/les) ----------
function kgWarnHTML(k) {
  const b = bentrok(k);
  if (!b.length) return '';
  const x = b[0];
  return `<div class="warn" role="alert"><div class="row" style="gap:10px;align-items:flex-start"><span style="color:#C2410C">${ic('alert', 22)}</span><span class="col" style="gap:4px"><strong>Bentrok dengan ${esc(x.nama)}</strong><span class="small" style="color:#7C2D12">${fmtLong(x.tanggal)}, ${jam(x.mulai)}–${jam(x.selesai)}${x.lokasi ? ' · ' + esc(x.lokasi) : ''}. Tumpang tindih ${x.ov} menit.${b.length > 1 ? ` Ada ${b.length - 1} bentrok lain.` : ''}</span><span class="small" style="color:#7C2D12">Ubah jam, atau tetap simpan kalau memang disengaja.</span></span></div></div>`;
}
function readKg(form) {
  const fd = new FormData(form);
  return { id: fd.get('kid') || '', nama: (fd.get('nama') || '').trim(), kategori: fd.get('kategori'), ulang: fd.get('ulang'), hari: fd.getAll('hari').map(Number), tanggal: fd.get('tanggal'), mulai: fd.get('mulai'), selesai: fd.get('selesai'), lokasi: (fd.get('lokasi') || '').trim(), catatan: (fd.get('catatan') || '').trim() };
}
export function kegiatanForm(k, prefix = '') {
  const isNew = !k;
  const d = k || { nama: '', kategori: 'ekskul', ulang: 'mingguan', hari: [today().getDay() || 1], tanggal: iso(today()), mulai: '15:30', selesai: '17:00', lokasi: '', catatan: '' };
  const dayOpts = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [0, 'Min']];
  openSheet({
    title: prefix ? 'Tambah cepat' : (isNew ? 'Kegiatan baru' : 'Ubah kegiatan'), submit: 'Simpan',
    left: isNew ? '' : `<button type="button" class="btn btn-danger" data-act="kgDel" data-id="${k.id}">${ic('trash', 18)}Hapus</button>`,
    body: `${prefix}<input type="hidden" name="kid" value="${k ? k.id : ''}">
${field('Nama kegiatan', 'nama', d.nama, 'text', 'required maxlength="60" autofocus placeholder="Misal: Paskibra, Les Matematika" data-chg="kgCheck"')}
<div class="field"><span class="label">Kategori</span>${seg('kategori', [['ekskul', 'Ekskul'], ['les', 'Les'], ['lainnya', 'Lainnya']], d.kategori)}</div>
<div class="field"><span class="label">Ulangi</span>${seg('ulang', [['sekali', 'Sekali'], ['mingguan', 'Tiap minggu']], d.ulang, 'data-chg="kgUlang"')}</div>
<div class="field" id="kgHari" ${d.ulang === 'mingguan' ? '' : 'hidden'}><span class="label">Hari</span>${picks('hari', dayOpts, d.hari, { multi: true, attrs: 'data-chg="kgCheck"' })}</div>
<div id="kgTgl" ${d.ulang === 'sekali' ? '' : 'hidden'}>${field('Tanggal', 'tanggal', d.tanggal, 'date', 'data-chg="kgCheck"')}</div>
<div class="grid2">${field('Mulai', 'mulai', d.mulai, 'time', 'data-chg="kgCheck"')}${field('Selesai', 'selesai', d.selesai, 'time', 'data-chg="kgCheck"')}</div>
<div id="kgWarn">${d.nama || k ? kgWarnHTML(d) : ''}</div>
${field('Lokasi', 'lokasi', d.lokasi)}
${field('Catatan (opsional)', 'catatan', d.catatan, 'text', 'placeholder="Misal: bawa seragam lengkap"')}`,
    onSubmit: (fd, form) => {
      const x = readKg(form);
      if (!x.nama) return 'Nama kegiatan belum diisi.';
      if (x.ulang === 'mingguan' && !x.hari.length) return 'Pilih minimal satu hari.';
      if (x.ulang === 'sekali' && !x.tanggal) return 'Pilih tanggal.';
      if (toMin(x.selesai) <= toMin(x.mulai)) return 'Jam selesai harus setelah jam mulai.';
      if (isNew) state.kegiatan.push({ ...x, id: uid() }); else Object.assign(k, x, { id: k.id });
      save(); toast('Kegiatan tersimpan'); rerender();
    },
  });
}

// ---------- ujian ----------
export function ujianForm(u) {
  const isNew = !u;
  const d = u || { jenis: isSD() ? 'Ulangan' : 'UH', nama: '', mapelId: '', tanggal: iso(addDays(today(), 7)), mulai: '07:30', selesai: '09:00', ruang: '', materi: [] };
  const jenisOpts = isKuliah() ? ['Kuis', 'UTS', 'UAS', 'Lainnya'] : isSD() ? ['Ulangan', 'PTS', 'PAS', 'Lainnya'] : ['UH', 'PTS', 'PAS', 'UTS', 'UAS', 'Lainnya'];
  openSheet({
    title: isNew ? 'Tambah ujian' : 'Ubah ujian', submit: 'Simpan',
    left: isNew ? '' : `<button type="button" class="btn btn-danger" data-act="ujDel" data-id="${u.id}">${ic('trash', 18)}Hapus</button>`,
    body: `<div class="grid2">${select('Jenis', 'jenis', jenisOpts, d.jenis)}${field('Nama periode (opsional)', 'nama', d.nama, 'text', 'placeholder="Misal: PTS Ganjil"')}</div>
${select(istilah().mapel, 'mapelId', mapelOpts(false), d.mapelId || state.mapel[0]?.id)}
${field('Tanggal', 'tanggal', d.tanggal, 'date', 'required')}
<div class="grid2">${field('Mulai', 'mulai', d.mulai, 'time')}${field('Selesai', 'selesai', d.selesai, 'time')}</div>
${field('Ruang', 'ruang', d.ruang)}
${area('Materi yang diujikan (satu per baris)', 'materi', (d.materi || []).map((x) => x.teks).join('\n'), 'rows="4" placeholder="Barisan & deret\nLimit fungsi"')}`,
    onSubmit: (fd) => {
      if (!fd.get('tanggal')) return 'Isi tanggal ujian.';
      const old = new Map((d.materi || []).map((x) => [x.teks, x]));
      const materi = fd.get('materi').split('\n').map((x) => x.trim()).filter(Boolean).map((t) => old.get(t) || { id: uid(), teks: t, done: false });
      const data = { jenis: fd.get('jenis'), nama: fd.get('nama').trim(), mapelId: fd.get('mapelId'), tanggal: fd.get('tanggal'), mulai: fd.get('mulai'), selesai: fd.get('selesai'), ruang: fd.get('ruang').trim(), materi };
      if (isNew) state.ujian.push({ id: uid(), ...data }); else Object.assign(u, data);
      save(); rerender();
    },
  });
}

// ---------- PIN pendamping ----------
export const PIN_Q = ['Nama hewan peliharaan pertama?', 'Nama sekolah TK/PAUD?', 'Makanan favorit anak?', 'Nama kota kelahiran?'];
export function requirePIN(then) {
  const p = state.profile;
  if (!p.pin) return then();
  openSheet({
    title: 'Masukkan PIN pendamping', submit: 'Buka',
    left: `<button type="button" class="btn btn-line" data-act="pinForgot">Lupa PIN</button>`,
    body: `<p class="p muted">Langkah ini butuh PIN orang tua atau guru.</p>${field('PIN (4 angka)', 'pin', '', 'password', 'inputmode="numeric" maxlength="4" autocomplete="off" autofocus pattern="[0-9]*"')}`,
    onSubmit: (fd) => { if (hash(fd.get('pin')) !== p.pin) return 'PIN salah.'; closeSheet(false); Promise.resolve().then(then); return false; },
  });
}
export function pinSetup() {
  openSheet({
    title: state.profile.pin ? 'Ganti PIN pendamping' : 'Atur PIN pendamping', submit: 'Simpan PIN',
    left: state.profile.pin ? `<button type="button" class="btn btn-danger" data-act="pinRemove">Hapus PIN</button>` : '',
    body: `<p class="p muted">PIN dipakai orang tua atau guru untuk mengunci penghapusan data dan penggantian jenjang.</p>
<div class="grid2">${field('PIN baru', 'pin', '', 'password', 'inputmode="numeric" maxlength="4" autocomplete="off" autofocus')}${field('Ulangi PIN', 'pin2', '', 'password', 'inputmode="numeric" maxlength="4" autocomplete="off"')}</div>
${select('Pertanyaan pengaman', 'q', PIN_Q, state.profile.pinQ || PIN_Q[0])}
${field('Jawaban', 'a', '', 'text', 'autocomplete="off"')}`,
    onSubmit: (fd) => {
      const pin = fd.get('pin');
      if (!/^\d{4}$/.test(pin)) return 'PIN harus 4 angka.';
      if (pin !== fd.get('pin2')) return 'Kedua PIN tidak sama.';
      if (!fd.get('a').trim()) return 'Isi jawaban pertanyaan pengaman.';
      Object.assign(state.profile, { pin: hash(pin), pinQ: fd.get('q'), pinA: hash(fd.get('a').trim().toLowerCase()) });
      save(); toast('PIN pendamping aktif'); rerender();
    },
  });
}

register({
  actions: {
    closeSheet: (el) => closeSheet(true, !!el.getAttribute('href')),
    qaDetail: (el) => { const f = el.closest('form'); const r = saveQuickTask(new FormData(f), true); if (typeof r === 'string') { const e = f.querySelector('.form-error'); e.textContent = r; e.hidden = false; } else closeSheet(false); },
    slotClear: (el) => { const f = el.closest('form'); const fd = new FormData(f); setSlot(Number(fd.get('hari')), Number(fd.get('jamKe')), fd.get('minggu') || 'semua', null); save(); closeSheet(false); rerender(); },
    kuliahDel: (el) => { state.jadwal = state.jadwal.filter((e) => e.id !== el.dataset.id); save(); closeSheet(false); rerender(); },
    mapelDel: (el) => {
      const id = el.dataset.id, used = state.jadwal.some((e) => e.mapelId === id) || state.tugas.some((t) => t.mapelId === id);
      if (used && !el.dataset.sure) { el.dataset.sure = '1'; el.innerHTML = 'Yakin? Jadwalnya ikut terhapus'; return; }
      state.mapel = state.mapel.filter((m) => m.id !== id); state.jadwal = state.jadwal.filter((e) => e.mapelId !== id);
      state.tugas.forEach((t) => { if (t.mapelId === id) t.mapelId = ''; });
      save(); closeSheet(false); rerender();
    },
    pgDel: (el) => { state.pengecualian = state.pengecualian.filter((p) => p.id !== el.dataset.id); save(); closeSheet(false); rerender(); },
    kgDel: (el) => { state.kegiatan = state.kegiatan.filter((k) => k.id !== el.dataset.id); save(); closeSheet(false); rerender(); },
    ujDel: (el) => { state.ujian = state.ujian.filter((u) => u.id !== el.dataset.id); save(); closeSheet(false); rerender(); },
    pinForgot: () => {
      openSheet({
        title: 'Lupa PIN', submit: 'Lanjut',
        body: `<p class="p">${esc(state.profile.pinQ || 'Pertanyaan pengaman')}</p>${field('Jawaban', 'a', '', 'text', 'autocomplete="off" autofocus')}`,
        onSubmit: (fd) => { if (hash(fd.get('a').trim().toLowerCase()) !== state.profile.pinA) return 'Jawaban belum cocok.'; closeSheet(false); Promise.resolve().then(pinSetup); return false; },
      });
    },
    pinRemove: () => { requirePIN(() => { Object.assign(state.profile, { pin: null, pinA: null }); save(); toast('PIN dihapus'); rerender(); }); },
  },
  changes: {
    qaMode: (el) => { closeSheet(false); quickAdd(el.value); },
    qaDl: (el) => { const f = el.closest('form'); f.querySelector('#qaCustom').hidden = el.value !== 'custom'; },
    qaMapel: (el) => { const n = el.closest('form').querySelector('#qaNext'); if (n) n.textContent = nextLabel(el.value); },
    kgUlang: (el) => { const f = el.closest('form'); f.querySelector('#kgHari').hidden = el.value !== 'mingguan'; f.querySelector('#kgTgl').hidden = el.value !== 'sekali'; CHANGE_KG(f); },
    kgCheck: (el) => CHANGE_KG(el.closest('form')),
  },
});
function CHANGE_KG(f) { const x = readKg(f); f.querySelector('#kgWarn').innerHTML = kgWarnHTML(x); }
