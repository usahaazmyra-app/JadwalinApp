// Lainnya: menu, pengingat, bagikan & backup, profil & tema, progres, fokus, bantuan
import { state, save, allFiles, putFile, clearAll, replaceState, flush } from '../store.js';
import { esc, iso, uid, fmtLong, fmtShort, fmtRange, jam, today, addDays, mondayOf, HARI3, stamp, parseDT } from '../util.js';
import { JENJANG, isKuliah, isSD, streak, progresWeek, mapelById, PAL, istilah, convertJadwal } from '../logic.js';
import { ic, rootTop, subTop, sect, grp, schip, gchip, mchip, mdot, seg, picks, swRow, field, select, empty, toast, confirmBox, openSheet } from '../ui.js';
import { requirePIN, pinSetup } from '../forms.js';
import { notifPermission, askPermission, showNotif, upcomingReminders, setFokusRunning, checkReminders } from '../notify.js';
import { FAQ } from '../faq.js';
import { register, rerender, go } from '../core.js';
import { applyTheme } from '../theme.js';

const menu = (icon, t, meta, href) => `<a class="list-item" href="${href}"><span class="ibox">${ic(icon)}</span><span class="grow" style="font-weight:700">${t}</span>${meta ? `<span class="small muted">${meta}</span>` : ''}${ic('right', 18)}</a>`;

function lainnya() {
  const p = state.profile;
  const open = state.tugas.filter((t) => !t.selesai).length;
  return {
    tab: 'lainnya',
    html: `<div class="page narrow">${rootTop('Jadwalin', 'Lainnya', `<a class="icon-btn" href="#/pengingat" aria-label="Pengingat">${ic('bell')}</a>`)}
<a class="card row-card" href="#/profil"><span class="avatar lg">${esc((p.nama || 'J').trim()[0] || 'J').toUpperCase()}</span><span class="col grow" style="gap:2px"><b style="font-size:17px">${esc(p.nama || 'Profil')}</b><span class="small muted">${esc([p.kelas || p.semester, 'Mode ' + JENJANG[p.jenjang]].filter(Boolean).join(' · '))}</span></span>${ic('right', 18)}</a>
${sect('Belajar')}
<div class="list">${menu('note', 'Catatan mapel', state.catatan.length || '', '#/catatan')}${menu('chart', 'Progres mingguan', '', '#/progres')}${menu('timer', 'Mode fokus', '', '#/fokus')}${menu('flag', 'Jadwal ujian', state.ujian.filter((u) => u.tanggal >= iso(today())).length || '', '#/ujian')}${menu('users', 'Ekskul & les'.replace('&', '&amp;'), state.kegiatan.length || '', '#/kegiatan')}</div>
${sect('Atur')}
<div class="list">${menu('bell', 'Pengingat', '', '#/pengingat')}${menu('book', `Kelola ${istilah().mapel.toLowerCase()}`, state.mapel.length || '', '#/jadwal/mapel')}${menu('share', 'Bagikan &amp; backup', '', '#/backup')}${menu('users', 'Ringkasan pendamping', '', '#/ringkasan')}${menu('palette', 'Profil &amp; tema', '', '#/profil')}</div>
${sect('Bantuan')}
<div class="list">${menu('help', 'Bantuan &amp; Q&amp;A', '', '#/bantuan')}${menu('home', 'Lihat tur awal', '', '#/mulai')}</div>
<div class="row small muted" style="gap:8px;align-items:flex-start">${ic('wifioff', 18)}<span>Semua data tersimpan di perangkat ini. Jadwalin tetap jalan tanpa internet.</span></div></div>`,
  };
}

// ---------- pengingat ----------
function pengingat() {
  const n = state.settings.notif;
  const perm = notifPermission();
  const permCard = perm === 'granted'
    ? `<div class="card row-card accent-card"><span class="ibox solid">${ic('bell')}</span><span class="col grow" style="gap:2px"><b>Notifikasi aktif</b><span class="small muted">Jadwalin boleh mengirim pengingat.</span></span><button type="button" class="btn btn-line btn-sm" data-act="notifTest">Tes</button></div>`
    : perm === 'unsupported'
      ? `<div class="warn"><b>Perangkat ini belum mendukung notifikasi web.</b><span class="small">Pasang Jadwalin ke layar utama lewat Chrome agar notifikasi bisa dipakai.</span></div>`
      : `<div class="warn"><b>${perm === 'denied' ? 'Notifikasi diblokir' : 'Notifikasi belum diizinkan'}</b><span class="small">${perm === 'denied' ? 'Buka pengaturan situs/aplikasi di HP, lalu izinkan notifikasi untuk Jadwalin.' : 'Izinkan supaya Jadwalin bisa mengingatkan tugas, ekskul, dan ujian.'}</span>${perm === 'default' ? `<button type="button" class="btn btn-primary btn-sm" data-act="notifAsk" style="align-self:flex-start">Izinkan notifikasi</button>` : ''}</div>`;
  const up = upcomingReminders(4);
  const sw = (title, desc, key) => swRow(title, desc, key, n[key], `data-chg="notifSw" data-k="${key}"`);
  return {
    html: `<div class="page narrow">${subTop('Pengingat', '#/lainnya')}
${permCard}
${up.length ? `${sect('Berikutnya')}<div class="list">${up.map((r) => `<div class="list-item"><span class="tcol"><b>${jam(r.time.toTimeString().slice(0, 5))}</b><span class="small muted">${r.time.toDateString() === new Date().toDateString() ? 'Hari ini' : fmtShort(r.time)}</span></span><span class="col grow" style="gap:2px"><b>${esc(r.title)}</b><span class="small muted">${esc(r.body)}</span></span></div>`).join('')}</div>` : ''}
${sect('Jenis pengingat')}
<div class="list">${sw('Ringkasan pagi', 'Pelajaran, tugas, dan kegiatan hari ini', 'pagi')}${sw('Tugas H-1', 'Sehari sebelum deadline', 'h1')}${sw('Menjelang deadline', `${n.dekatJam} jam sebelum deadline`, 'dekat')}${sw('Ekskul &amp; les', `${n.kegiatanMenit} menit sebelum mulai`, 'kegiatan')}${sw('Ujian', 'H-3 dan H-1', 'ujian')}${sw('Senyap saat pelajaran', 'Pengingat ditahan selama jam sekolah', 'senyap')}</div>
${sect('Waktu')}
<div class="grid2">${field('Ringkasan pagi', 'jamPagi', n.jamPagi, 'time', 'data-chg="notifVal" data-k="jamPagi"')}${field('Pengingat H‑1', 'jamH1', n.jamH1, 'time', 'data-chg="notifVal" data-k="jamH1"')}</div>
<div class="grid2">${select('Menjelang deadline', 'dekatJam', [[1, '1 jam'], [2, '2 jam'], [3, '3 jam'], [6, '6 jam']], n.dekatJam, 'data-chg="notifVal" data-k="dekatJam"')}${select('Sebelum ekskul', 'kegiatanMenit', [[15, '15 menit'], [30, '30 menit'], [60, '1 jam']], n.kegiatanMenit, 'data-chg="notifVal" data-k="kegiatanMenit"')}</div>
<div class="row small muted" style="gap:8px;align-items:flex-start">${ic('wifioff', 18)}<span>Pengingat dibuat di perangkat tanpa internet. Agar tepat waktu, biarkan Jadwalin tetap terbuka di latar belakang.</span></div></div>`,
  };
}

// ---------- bagikan & backup ----------
function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  const fallback = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); toast('File disimpan ke unduhan'); };
  if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: name }).catch(fallback);
  else fallback();
}
function pickFile() {
  return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => { try { res(JSON.parse(r.result)); } catch { toast('File tidak bisa dibaca'); res(null); } }; r.readAsText(f); }; i.click(); });
}
const shareSel = { jadwal: true, tugas: true, ujian: true, catatan: false };
function backup() {
  return {
    html: `<div class="page narrow">${subTop('Bagikan &amp; backup', '#/lainnya')}
${sect('Bagikan ke teman sekelas')}
<div class="card"><span class="small muted">Buat file berisi jadwal kelas untuk dikirim lewat WhatsApp atau aplikasi lain. Teman tinggal mengimpornya.</span>
<div class="col" style="gap:0">${[['jadwal', `Jadwal & ${istilah().mapel.toLowerCase()}`], ['tugas', 'Tugas yang belum selesai'], ['ujian', 'Jadwal ujian'], ['catatan', 'Catatan (tanpa foto)']].map(([k, t]) => `<label class="checkrow tight"><input type="checkbox" class="check" data-chg="shareSel" data-k="${k}" ${shareSel[k] ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div>
<button class="btn btn-primary" type="button" data-act="shareFile">${ic('share', 18)}Bagikan file</button><span class="small muted">Berbagi lewat kode atau QR akan hadir di versi berikutnya.</span></div>
${sect('Terima dari teman')}
<div class="card"><span class="small muted">Buka file .jadwalin yang dikirim temanmu. Data ditambahkan, tidak ada yang terhapus.</span><button class="btn btn-ghost" type="button" data-act="importFile">${ic('upload', 18)}Impor file</button></div>
${sect('Backup di perangkat ini')}
<div class="card"><div class="row"><span class="ibox">${ic('download')}</span><span class="col grow" style="gap:2px"><b>Backup terakhir</b><span class="small muted">${state.settings.lastBackup ? fmtLong(parseDT(state.settings.lastBackup)) : 'Belum pernah'}</span></span></div>
<div class="row"><button class="btn btn-line grow btn-sm" type="button" data-act="exportAll">${ic('download', 18)}Ekspor backup</button><button class="btn btn-line grow btn-sm" type="button" data-act="restoreAll">${ic('upload', 18)}Pulihkan backup</button></div>
<span class="small muted">Simpan file backup di Google Drive atau kirim ke dirimu sendiri lewat WhatsApp.</span></div></div>`,
  };
}
function mergeShare(d) {
  const map = {}; let n = { mapel: 0, jadwal: 0, tugas: 0, ujian: 0, catatan: 0 };
  for (const m of d.mapel || []) {
    const ex = state.mapel.find((x) => x.nama.toLowerCase() === m.nama.toLowerCase());
    if (ex) map[m.id] = ex.id; else { const nm = { ...m, id: uid() }; state.mapel.push(nm); map[m.id] = nm.id; n.mapel++; }
  }
  if (d.jam && !state.jadwal.length) Object.assign(state.profile, d.jam);
  for (const e of d.jadwal || []) {
    const mid = map[e.mapelId]; if (!mid) continue;
    const clash = state.jadwal.some((x) => x.hari === e.hari && (e.jamKe ? x.jamKe === e.jamKe && (x.minggu === 'semua' || e.minggu === 'semua' || x.minggu === e.minggu) : x.mulai === e.mulai));
    if (!clash) { state.jadwal.push({ ...e, id: uid(), mapelId: mid }); n.jadwal++; }
  }
  for (const t of d.tugas || []) {
    if (state.tugas.some((x) => x.judul === t.judul && x.deadline === t.deadline)) continue;
    state.tugas.push({ ...t, id: uid(), mapelId: map[t.mapelId] || '', selesai: false, selesaiAt: null, lampiran: [], dibuat: stamp(), langkah: (t.langkah || []).map((x) => ({ ...x, done: false })), anggota: (t.anggota || []).map((x) => ({ ...x, done: false })) }); n.tugas++;
  }
  for (const u of d.ujian || []) {
    if (state.ujian.some((x) => x.tanggal === u.tanggal && x.mapelId === map[u.mapelId])) continue;
    state.ujian.push({ ...u, id: uid(), mapelId: map[u.mapelId] || '', materi: (u.materi || []).map((x) => ({ ...x, done: false })) }); n.ujian++;
  }
  for (const c of d.catatan || []) {
    if (state.catatan.some((x) => x.judul === c.judul)) continue;
    state.catatan.push({ ...c, id: uid(), mapelId: map[c.mapelId] || '', foto: [] }); n.catatan++;
  }
  convertJadwal(state.profile.jenjang);
  save();
  const parts = Object.entries(n).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`);
  toast(parts.length ? `Ditambahkan: ${parts.join(', ')}` : 'Semua data sudah ada');
}

// ---------- profil & tema ----------
const AKSEN = [['#4F46E5', 'Indigo'], ['#0F766E', 'Hijau toska'], ['#BE123C', 'Merah muda'], ['#B45309', 'Oranye'], ['#334155', 'Abu gelap'], ['#7C3AED', 'Ungu']];
function profil() {
  const p = state.profile, s = state.settings;
  return {
    html: `<div class="page narrow">${subTop('Profil &amp; tema', '#/lainnya')}
<div class="col" style="align-items:center;gap:8px"><span class="avatar xl">${esc((p.nama || 'J').trim()[0] || 'J').toUpperCase()}</span></div>
${field('Nama panggilan', 'nama', p.nama, 'text', 'data-chg="profSet" maxlength="30"')}
<div class="grid2">${isKuliah() ? field('Semester', 'semester', p.semester, 'text', 'data-chg="profSet" placeholder="Semester 3"') : field('Kelas', 'kelas', p.kelas, 'text', 'data-chg="profSet"')}${field(isKuliah() ? 'Kampus' : 'Sekolah', 'sekolah', p.sekolah, 'text', 'data-chg="profSet"')}</div>
<div class="field"><span class="label">Jenjang</span>${seg('jenjang', [['sd', 'SD'], ['sekolah', 'SMP–SMA/SMK'], ['kuliah', 'Mahasiswa']], p.jenjang, 'data-chg="jenjangSet"')}</div>
<div class="field"><span class="label">Tema</span>${seg('tema', [['terang', 'Terang'], ['gelap', 'Gelap'], ['sistem', 'Ikuti HP']], s.tema, 'data-chg="temaSet"')}</div>
<div class="field"><span class="label">Warna aksen</span><div class="row wrap" role="radiogroup" style="gap:10px">${AKSEN.map(([c, n]) => `<label class="swc"><input type="radio" name="aksen" value="${c}" aria-label="${n}" ${s.aksen === c ? 'checked' : ''} data-chg="aksenSet"><span style="background:${c}"></span></label>`).join('')}</div></div>
<div class="field"><label for="f-huruf">Ukuran huruf</label><div class="row"><span style="font-size:13px;font-weight:700">A</span><input id="f-huruf" type="range" min="0.9" max="1.3" step="0.1" value="${s.huruf}" class="grow range" data-chg="hurufSet"><span style="font-size:22px;font-weight:700">A</span></div></div>
<div class="list"><div class="list-item"><span class="ibox">${ic('lock')}</span><span class="col grow" style="gap:2px"><b>PIN pendamping</b><span class="small muted">${p.pin ? 'Aktif · hapus data & ganti jenjang butuh PIN' : 'Untuk orang tua/guru, terutama mode SD'}</span></span><button type="button" class="btn btn-ghost btn-sm" data-act="pinSet">${p.pin ? 'Ganti' : 'Atur'}</button></div></div>
<button class="btn btn-danger" type="button" data-act="wipe">${ic('trash', 18)}Hapus semua data</button></div>`,
  };
}

// ---------- progres ----------
let progOff = -0;
function progres() {
  const mon = addDays(mondayOf(new Date()), progOff * 7);
  const P = progresWeek(mon);
  const max = Math.max(1, ...P.perDay);
  const lbl = progOff === 0 ? 'Minggu ini' : progOff === -1 ? 'Minggu lalu' : fmtRange(mon, addDays(mon, 6));
  const prev = progresWeek(addDays(mon, -7));
  const diff = P.done - prev.done;
  const msg = P.total === 0 ? 'Belum ada tugas dengan deadline di minggu ini.' : diff > 0 ? `Mantap! ${diff} tugas lebih banyak dari minggu sebelumnya.` : P.done === P.total ? 'Semua tugas minggu ini beres.' : 'Terus cicil, satu per satu.';
  const pm = Object.entries(P.perMapel).map(([id, v]) => ({ m: mapelById(id), ...v })).sort((a, b) => b.total - a.total);
  return {
    html: `<div class="page narrow">${subTop('Progres mingguan', '#/lainnya')}
<div class="row" style="justify-content:space-between"><button class="icon-btn" type="button" data-act="progNav" data-n="-1" aria-label="Minggu sebelumnya">${ic('left')}</button><b>${lbl} · ${fmtRange(mon, addDays(mon, 6))}</b><button class="icon-btn" type="button" data-act="progNav" data-n="1" aria-label="Minggu berikutnya" ${progOff >= 0 ? 'disabled' : ''}>${ic('right')}</button></div>
<div class="card now-card"><span class="small on-accent">Tugas beres</span><span class="big-n" style="color:#fff">${P.done} <span style="font-size:22px;opacity:.75">dari ${P.total}</span></span><div class="bar bar-onaccent"><span style="width:${P.total ? Math.round((P.done / P.total) * 100) : 0}%"></span></div><span class="small on-accent">${msg}</span></div>
<div class="card row-card"><span class="ibox" style="background:#FFEDD5;color:#C2410C">${ic('flame')}</span><span class="col grow" style="gap:2px"><b>${streak()} hari beruntun</b><span class="small muted">Hari berturut-turut kamu mencatat atau menyelesaikan tugas.</span></span></div>
<div class="card"><b>Selesai per hari</b><div class="bars">${P.perDay.map((v, i) => `<div class="barcol"><span class="small" style="font-weight:800">${v}</span><span class="barv" style="height:${v ? Math.max(8, Math.round((v / max) * 120)) : 4}px;${v ? '' : 'background:var(--seg)'}"></span><span class="small muted">${HARI3[(i + 1) % 7]}</span></div>`).join('')}</div></div>
${pm.length ? `${sect(`Per ${istilah().mapel.toLowerCase()}`)}<div class="list">${pm.map((x) => `<div class="list-item" style="gap:10px">${mdot(x.m, 32)}<span class="col grow" style="gap:6px"><span class="row" style="justify-content:space-between"><b>${esc(x.m?.nama || 'Tanpa mapel')}</b><span class="small muted">${x.done}/${x.total}</span></span><span class="bar"><span style="width:${Math.round((x.done / x.total) * 100)}%"></span></span></span></div>`).join('')}</div>` : ''}</div>`,
  };
}

// ---------- fokus ----------
const F = { mode: 'fokus', running: false, endAt: 0, remain: 25 * 60, total: 25 * 60, taskId: '', timer: null };
function fmtT(s) { s = Math.max(0, Math.round(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function tick() {
  if (F.running) F.remain = (F.endAt - Date.now()) / 1000;
  if (F.running && F.remain <= 0) {
    F.running = false; setFokusRunning(false); clearInterval(F.timer);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (F.mode === 'fokus') {
      const d = iso(new Date()); if (state.fokus.tanggal !== d) state.fokus = { tanggal: d, sesi: 0 };
      state.fokus.sesi++; save();
      showNotif('Sesi fokus selesai', 'Istirahat 5 menit dulu, ya.', location.hash, 'fokus');
      F.mode = 'istirahat'; F.total = F.remain = 5 * 60;
    } else { showNotif('Istirahat selesai', 'Siap lanjut sesi berikutnya?', location.hash, 'fokus'); F.mode = 'fokus'; F.total = F.remain = state.settings.fokusMenit * 60; }
    rerender(); return;
  }
  const t = document.getElementById('fkTime'); const r = document.getElementById('fkRing');
  if (t) t.textContent = fmtT(F.remain);
  if (r) r.setAttribute('stroke-dashoffset', String(691 * (1 - F.remain / F.total)));
}
function fokus(params) {
  if (params[0] !== undefined) F.taskId = params[0];
  if (!F.running && F.mode === 'fokus' && F.remain === F.total) { F.total = F.remain = state.settings.fokusMenit * 60; }
  const t = F.taskId && state.tugas.find((x) => x.id === F.taskId);
  const sesi = state.fokus.tanggal === iso(new Date()) ? state.fokus.sesi : 0;
  return {
    after: () => { clearInterval(F.timer); if (F.running) F.timer = setInterval(tick, 500); tick(); },
    html: `<div class="page narrow">${subTop('Mode fokus', t ? `#/tugas/${t.id}` : '#/lainnya')}
${t ? `<a class="card row-card" href="#/tugas/${t.id}" style="padding:12px 14px">${mchip(mapelById(t.mapelId))}<b class="grow" style="font-size:14px">${esc(t.judul)}</b>${ic('right', 18)}</a>` : `<div class="card"><span class="small muted">Pilih tugas dari halaman detail tugas untuk menautkannya ke sesi fokus.</span></div>`}
<div class="ring"><svg width="260" height="260" viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="110" fill="none" stroke="var(--seg)" stroke-width="16"/><circle id="fkRing" cx="130" cy="130" r="110" fill="none" stroke="${F.mode === 'fokus' ? 'var(--accent)' : '#0F766E'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="691 691" stroke-dashoffset="${691 * (1 - F.remain / F.total)}" transform="rotate(-90 130 130)"/></svg>
<div class="ring-in"><span id="fkTime" class="ring-t">${fmtT(F.remain)}</span><span class="small muted">${F.mode === 'fokus' ? `sesi fokus ${F.total / 60} menit` : 'istirahat'}</span></div></div>
<p class="p small muted" style="text-align:center">${sesi} sesi selesai hari ini${F.running ? ' · pengingat ditahan selama sesi' : ''}</p>
<div class="row" style="justify-content:center;gap:12px"><button class="btn btn-line" style="flex:1 1 0;min-width:0;max-width:140px;padding:0 12px" type="button" data-act="fkReset">${ic('reset', 18)}Ulang</button><button class="play-btn" type="button" data-act="fkToggle" aria-label="${F.running ? 'Jeda' : 'Mulai'}">${ic(F.running ? 'pause' : 'play', 30, 2.6)}</button><button class="btn btn-line" style="flex:1 1 0;min-width:0;max-width:140px;padding:0 12px" type="button" data-act="fkSkip">Lewati</button></div>
${!F.running && F.mode === 'fokus' ? `<div class="field"><span class="label">Durasi sesi</span>${seg('dur', [[15, '15 menit'], [25, '25 menit'], [45, '45 menit']], state.settings.fokusMenit, 'data-chg="fkDur"')}</div>` : ''}</div>`,
  };
}

// ---------- bantuan ----------
let faqQ = '';
function bantuan(params) {
  if (params[0] === 'notif') return bantuanNotif();
  const q = faqQ.toLowerCase();
  const strip = (s) => s.replace(/<[^>]+>/g, '');
  const groups = FAQ.map(([id, name, icon, qs]) => [id, name, icon, qs.filter(([a, b]) => !q || strip(a + ' ' + b).toLowerCase().includes(q))]).filter((g) => g[3].length);
  const total = FAQ.reduce((s, g) => s + g[3].length, 0);
  return {
    html: `<div class="page narrow">${subTop('Bantuan &amp; Q&amp;A', '#/lainnya')}
<div class="card accent-card"><b style="font-size:20px">Ada yang bisa dibantu?</b><span class="small muted">${total} pertanyaan tentang semua fitur Jadwalin.</span><label class="search">${ic('search')}<input type="search" data-inp="faqQ" value="${esc(faqQ)}" placeholder="Cari, misalnya: pengingat" aria-label="Cari pertanyaan"></label></div>
${!q ? `<nav class="picks" aria-label="Topik">${FAQ.map(([id, name, icon]) => `<a class="cat" href="#/bantuan" data-act="faqJump" data-id="${id}">${ic(icon, 16)}${esc(name)}</a>`).join('')}</nav>` : ''}
${groups.length ? groups.map(([id, name, icon, qs]) => `<h2 class="h2 cat-h" id="faq-${id}"><span class="ibox sm">${ic(icon, 18)}</span>${esc(name)}</h2><div class="list">${qs.map(([a, b]) => `<details class="qa"${q ? ' open' : ''}><summary><span>${esc(a)}</span><span class="chev">${ic('right', 18)}</span></summary><div class="qa-a">${b}</div></details>`).join('')}</div>`).join('') : empty('search', 'Tidak ada yang cocok', 'Coba kata kunci lain.')}
<div class="card"><b style="font-size:17px">Masih belum menemukan jawaban?</b><span class="small muted">Ceritakan kendalamu ke pembuat aplikasi, sertakan tangkapan layar bila bisa.</span><a class="btn btn-line btn-sm" href="#/mulai" style="align-self:flex-start">${ic('home', 18)}Lihat tur awal</a></div></div>`,
  };
}
function bantuanNotif() {
  const step = (n, t, d, extra = '') => `<div class="stepcard"><span class="stepno">${n}</span><div class="col" style="gap:4px"><b>${t}</b><span class="muted" style="line-height:1.55">${d}</span>${extra}</div></div>`;
  return {
    html: `<div class="page narrow">${subTop('Bantuan', '#/bantuan')}
<div class="col" style="gap:12px"><span class="chip" style="background:var(--accent-soft);color:var(--accent-ink);align-self:flex-start">${ic('bell', 14)}Pengingat &amp; notifikasi</span><h1 class="h1">Kenapa notifikasi tidak muncul?</h1><p class="p muted">Pengingat Jadwalin dibuat langsung di perangkat, tanpa internet. Kalau tidak muncul, biasanya ada pengaturan yang menahannya. Cek lima hal ini berurutan.</p></div>
${step(1, 'Izinkan notifikasi', 'Buka <b>Lainnya → Pengingat</b>, ketuk <b>Izinkan notifikasi</b>. Kalau sudah diblokir: Pengaturan HP → Aplikasi → Chrome atau Jadwalin → Notifikasi.', `<a class="link" href="#/pengingat">Buka Pengingat${ic('right', 16)}</a>`)}
${step(2, 'Pasang ke layar utama', 'Notifikasi paling andal jika Jadwalin dipasang sebagai aplikasi (menu Chrome → Instal aplikasi), bukan dibuka sebagai tab biasa.')}
${step(3, 'Matikan penghemat baterai untuk Jadwalin/Chrome', 'Beberapa HP menutup aplikasi di latar belakang. Di pengaturan baterai, pilih <b>Tidak dibatasi</b>.')}
${step(4, 'Jangan tutup paksa aplikasi', 'Pengingat dijadwalkan selama Jadwalin berjalan. Menutup paksa dari daftar aplikasi terbaru bisa menunda pengingat sampai aplikasi dibuka lagi.')}
${step(5, 'Cek Senyap saat pelajaran dan sakelar pengingat', 'Kalau Senyap aktif, pengingat ditahan selama jam sekolah. Pastikan juga sakelar jenis pengingat yang kamu tunggu menyala.')}
<div class="warn"><span class="small" style="color:#7C2D12">Nama menu bisa sedikit berbeda di tiap merek HP.</span></div></div>`,
  };
}

register({
  views: { lainnya, pengingat, backup, profil, progres, fokus, bantuan },
  actions: {
    notifAsk: async () => { const r = await askPermission(); toast(r === 'granted' ? 'Notifikasi aktif' : 'Notifikasi belum diizinkan'); rerender(); checkReminders(); },
    notifTest: async () => { const ok = await showNotif('Tes pengingat Jadwalin', 'Notifikasi sudah berfungsi.', '#/pengingat', 'tes'); if (!ok) toast('Notifikasi gagal dikirim'); },
    shareFile: () => {
      const d = { type: 'jadwalin-share', v: 1, dibuat: stamp(), dari: state.profile.nama };
      if (shareSel.jadwal) { d.mapel = state.mapel; d.jadwal = state.jadwal; const p = state.profile; d.jam = { jamMasuk: p.jamMasuk, durasi: p.durasi, jamPerHari: p.jamPerHari, breaks: p.breaks, hariSekolah: p.hariSekolah, pola: p.pola, abAnchor: p.abAnchor, abStart: p.abStart }; }
      else d.mapel = state.mapel;
      if (shareSel.tugas) d.tugas = state.tugas.filter((t) => !t.selesai).map((t) => ({ ...t, lampiran: [] }));
      if (shareSel.ujian) d.ujian = state.ujian;
      if (shareSel.catatan) d.catatan = state.catatan.map((c) => ({ ...c, foto: [] }));
      download(`jadwal-${(state.profile.kelas || 'kelas').replace(/\s+/g, '-')}.jadwalin`, JSON.stringify(d));
    },
    importFile: async () => {
      const d = await pickFile(); if (!d) return;
      if (d.type === 'jadwalin-share') return mergeShare(d);
      if (d.type === 'jadwalin-backup') { toast('Ini file backup. Gunakan tombol Pulihkan backup.'); return; }
      toast('File bukan dari Jadwalin');
    },
    exportAll: async () => {
      await flush();
      const d = { type: 'jadwalin-backup', v: 1, dibuat: stamp(), state, files: await allFiles() };
      state.settings.lastBackup = stamp(); save();
      download(`jadwalin-backup-${iso(new Date())}.jadwalin`, JSON.stringify(d)); rerender();
    },
    restoreAll: async () => {
      const d = await pickFile(); if (!d) return;
      if (d.type === 'jadwalin-share') { if (await confirmBox('Ini file berbagi dari teman. Tambahkan isinya ke datamu?', { ok: 'Tambahkan', title: 'Impor file' })) mergeShare(d); rerender(); return; }
      if (d.type !== 'jadwalin-backup' || !d.state) { toast('File bukan backup Jadwalin'); return; }
      if (!(await confirmBox('Semua data di perangkat ini akan diganti dengan isi backup.', { ok: 'Ganti dengan backup', danger: true, title: 'Pulihkan backup?' }))) return;
      replaceState(d.state); for (const [k, v] of Object.entries(d.files || {})) await putFile(v, k);
      await flush(); applyTheme(); toast('Backup dipulihkan'); go('#/');
    },
    pinSet: () => requirePIN(pinSetup),
    wipe: () => requirePIN(async () => {
      if (!(await confirmBox('Semua jadwal, tugas, catatan, dan pengaturan akan dihapus dari perangkat ini. Langkah ini tidak bisa dibatalkan.', { ok: 'Hapus semua', danger: true, title: 'Hapus semua data?' }))) return;
      await clearAll(); location.hash = '#/mulai'; location.reload();
    }),
    progNav: (el) => { progOff = Math.min(0, progOff + Number(el.dataset.n)); rerender(); },
    fkToggle: () => { if (F.running) { F.running = false; F.remain = (F.endAt - Date.now()) / 1000; setFokusRunning(false); } else { F.running = true; F.endAt = Date.now() + F.remain * 1000; setFokusRunning(F.mode === 'fokus'); } rerender(); },
    fkReset: async () => {
      const left = F.running ? (F.endAt - Date.now()) / 1000 : F.remain;
      if (F.total - left > 30 && !(await confirmBox('Waktu yang sudah berjalan di sesi ini akan hilang.', { ok: 'Ulang', title: 'Ulang sesi?' }))) return;
      F.running = false; setFokusRunning(false); F.mode = 'fokus'; F.total = F.remain = state.settings.fokusMenit * 60; rerender(); },
    fkSkip: () => { F.running = false; setFokusRunning(false); if (F.mode === 'fokus') { F.mode = 'istirahat'; F.total = F.remain = 5 * 60; } else { F.mode = 'fokus'; F.total = F.remain = state.settings.fokusMenit * 60; } rerender(); },
    faqJump: (el, e) => { e.preventDefault(); document.getElementById('faq-' + el.dataset.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  },
  changes: {
    notifSw: (el) => { state.settings.notif[el.dataset.k] = el.checked; save(); rerender(); },
    notifVal: (el) => { const k = el.dataset.k; state.settings.notif[k] = ['dekatJam', 'kegiatanMenit'].includes(k) ? Number(el.value) : el.value; save(); rerender(); },
    shareSel: (el) => { shareSel[el.dataset.k] = el.checked; },
    profSet: (el) => { state.profile[el.name] = el.value.trim(); save(); },
    jenjangSet: (el) => {
      const v = el.value, prev = state.profile.jenjang;
      el.checked = false; document.querySelector(`input[name="jenjang"][value="${prev}"]`).checked = true;
      requirePIN(async () => {
        const toK = v === 'kuliah', fromK = prev === 'kuliah';
        const note = toK !== fromK && state.jadwal.length ? ` Jadwalmu akan diubah ke format ${toK ? 'jam bebas (mulai–selesai)' : 'jam pelajaran ke-'}; cek lagi setelahnya.` : '';
        if (!(await confirmBox(`Tampilan dan istilah akan menyesuaikan mode ${JENJANG[v]}.${note}`, { ok: `Ganti ke ${JENJANG[v]}`, title: 'Ganti jenjang?' }))) return;
        convertJadwal(v); state.profile.jenjang = v; save(); applyTheme(); toast(`Mode ${JENJANG[v]} aktif`); rerender();
      });
    },
    temaSet: (el) => { state.settings.tema = el.value; save(); applyTheme(); },
    aksenSet: (el) => { state.settings.aksen = el.value; save(); applyTheme(); },
    hurufSet: (el) => { state.settings.huruf = Number(el.value); save(); applyTheme(); },
    fkDur: (el) => { state.settings.fokusMenit = Number(el.value); F.total = F.remain = state.settings.fokusMenit * 60; save(); rerender(); },
  },
  inputs: {
    faqQ: (el) => { faqQ = el.value; rerender(); const i = document.querySelector('[data-inp="faqQ"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  },
});
