// Hari Ini (SD, SMP–SMA/SMK, Mahasiswa), Bawaan besok, Ringkasan pendamping
import { state, save } from '../store.js';
import { esc, iso, fmtLong, fmtShort, jam, toMin, nowMin, today, addDays, mondayOf, stamp, parseDT, fmtRange, daysBetween, $ } from '../util.js';
import { lessonNow, lessonsOn, openTasks, sortTasks, taskStatus, kegiatanOn, bawaanFor, nextSchoolDay, weekLetter, isKuliah, isSD, mapelById, upcomingUjian, mapelName } from '../logic.js';
import { ic, rootTop, subTop, sect, taskRow, schip, gchip, mchip, mdot, toast, swRow, empty, kgRow } from '../ui.js';
import { register, rerender } from '../core.js';
import { notifPermission } from '../notify.js';

function notifCard() {
  if (notifPermission() !== 'default' || state.settings.notifAskDismissed) return '';
  return `<div class="card accent-card"><div class="row" style="align-items:flex-start"><span class="ibox solid">${ic('bell')}</span><span class="col grow" style="gap:2px"><b>Aktifkan pengingat</b><span class="small muted">Supaya Jadwalin bisa mengingatkan tugas, ekskul, dan ujian.</span></span></div><div class="row"><button type="button" class="btn btn-line btn-sm grow" data-act="notifDismiss">Nanti saja</button><button type="button" class="btn btn-primary btn-sm grow" data-act="notifAsk">Izinkan</button></div></div>`;
}

function greet() {
  const h = new Date().getHours();
  const n = state.profile.nama ? `, ${esc(state.profile.nama)}` : '';
  return isSD() ? `Halo${n}!` : `Hai${n}`;
}

function nowCard() {
  const { now, next, items } = lessonNow();
  const L = lessonsOn(today());
  if (L.libur) return `<div class="now"><span class="chip chip-onaccent" style="align-self:flex-start">Hari ini</span><span class="now-title">${esc(L.label)}</span><span class="small on-accent">Tidak ada ${isKuliah() ? 'kuliah' : 'pelajaran'}. Waktunya mencicil tugas atau istirahat.</span></div>`;
  if (!items.length) return `<a class="now" href="#/jadwal"><span class="chip chip-onaccent" style="align-self:flex-start">Jadwal kosong</span><span class="now-title" style="font-size:22px">Isi jadwal ${isKuliah() ? 'kuliahmu' : 'pelajaranmu'}</span><span class="small on-accent">Ketuk untuk mulai mengisi.</span></a>`;
  const it = now || next;
  if (!it) return `<a class="now" href="#/jadwal"><span class="chip chip-onaccent" style="align-self:flex-start">${isKuliah() ? 'Kuliah' : 'Sekolah'} selesai</span><span class="now-title" style="font-size:22px">Semua ${isKuliah() ? 'kuliah' : 'pelajaran'} hari ini beres</span><span class="small on-accent">${items.length} ${isKuliah() ? 'kuliah' : 'pelajaran'} · selesai ${jam(items.at(-1).selesai)}</span></a>`;
  const n = nowMin();
  const a = toMin(it.mulai), b = toMin(it.selesai);
  const label = now ? (isSD() ? 'Sekarang belajar' : isKuliah() ? 'Sedang berlangsung' : `Sekarang${it.jamKe ? ' · Jam ke-' + it.jamKe : ''}`) : (isKuliah() ? 'Kuliah berikutnya' : `Berikutnya${it.jamKe ? ' · Jam ke-' + it.jamKe : ''}`);
  const prog = now ? `<div class="col" style="gap:6px"><div class="bar bar-onaccent"><span style="width:${Math.round(((n - a) / (b - a)) * 100)}%"></span></div><span class="small on-accent">Selesai ${b - n} menit lagi</span></div>` : `<span class="small on-accent">Mulai ${a - n} menit lagi</span>`;
  const after = now && next ? `<div class="divider-onaccent"></div><span class="row small" style="gap:6px">${ic('clock', 16)}Berikutnya: <b>${esc(next.mapel.nama)}</b> ${jam(next.mulai)}</span>` : '';
  const who = [it.ruang, it.mapel.guru].filter(Boolean).map(esc).join(' · ');
  return `<a class="now" href="#/jadwal">
<div class="row" style="justify-content:space-between"><span class="chip chip-onaccent">${label}</span><span class="small on-accent">${jam(it.mulai)}–${jam(it.selesai)}</span></div>
<div class="col" style="gap:4px"><span class="now-title">${esc(it.mapel.nama)}</span>${who ? `<span class="row small on-accent" style="gap:6px">${ic('pin', 16)}${who}</span>` : ''}</div>
${isKuliah() && it.mapel.sks ? `<div class="row wrap" style="gap:8px"><span class="chip chip-onaccent">${it.mapel.sks} SKS</span></div>` : ''}
${prog}${after}</a>`;
}

function eventsToday() {
  const ks = kegiatanOn(today());
  if (!ks.length) return '';
  return `${sect('Hari ini juga', 'Kalender', '#/kalender')}<div class="list">${ks.map((k) => kgRow(k, today())).join('')}</div>`;
}

function tasksNear(n = 3) {
  const list = sortTasks(openTasks()).slice(0, n);
  const title = isKuliah() ? 'Deadline dekat' : isSD() ? 'PR-ku' : 'Tugas terdekat';
  if (!list.length) return `${sect(title, 'Semua', '#/tugas')}<div class="card"><span class="row" style="gap:10px"><span class="ibox">${ic('check')}</span><span class="col" style="gap:2px"><b>Belum ada tugas</b><span class="small muted">Tekan + untuk mencatat tugas baru.</span></span></span></div>`;
  return `${sect(title, 'Semua', '#/tugas')}<div class="list">${list.map((t) => taskRow(t, { big: isSD() })).join('')}</div>`;
}

function bawaanCard() {
  const d = nextSchoolDay();
  const B = bawaanFor(d);
  const items = B.groups.flatMap((g) => g.items);
  const label = daysBetween(today(), d) === 1 ? 'Besok' : fmtShort(d);
  if (isSD()) {
    if (!items.length) return '';
    const colors = [['#FFEDD5', '#C2410C'], ['#FAE8FF', '#A21CAF'], ['#FEF3C7', '#B45309'], ['#E0F2FE', '#0369A1']];
    return `<h2 class="h2 sd-h">${label} bawa</h2><div class="tiles">${items.slice(0, 6).map((x, i) => { const [bg, fg] = colors[i % 4]; return `<a class="tile" href="#/bawaan"><span class="tile-ic" style="background:${bg};color:${fg}">${ic(x.key.startsWith('t:') ? 'note' : 'bag', 28)}</span>${esc(x.teks)}</a>`; }).join('')}</div>`;
  }
  return `<a class="card" href="#/bawaan"><div class="row" style="justify-content:space-between"><span class="row" style="gap:8px;font-weight:800">${ic('bag')}${label} bawa</span><span class="row small muted" style="gap:2px">${B.done}/${B.total}${ic('right', 16)}</span></div>
${items.length ? `<div class="row wrap" style="gap:8px">${items.slice(0, 4).map((x) => gchip(x.teks)).join('')}${items.length > 4 ? gchip(`+${items.length - 4} lainnya`) : ''}</div>` : '<span class="small muted">Belum ada barang. Atur barang tetap per mapel di Kelola mapel.</span>'}</a>`;
}

function kuliahToday() {
  const { items } = lessonsOn(today());
  if (!items.length) return '';
  const n = nowMin();
  return `${sect('Hari ini', 'Jadwal', '#/jadwal')}<div class="list">${items.map((it) => {
    const a = toMin(it.mulai), b = toMin(it.selesai);
    const st = n >= b ? schip('done', 'Selesai') : n >= a ? schip('accent', 'Berlangsung') : schip('later', 'Nanti');
    return `<a class="list-item" href="#/jadwal"><span class="tcol"><b>${jam(it.mulai)}</b><span class="small muted">${jam(it.selesai)}</span></span><span class="col grow" style="gap:2px"><b>${esc(it.mapel.nama)}</b><span class="small muted">${esc(it.ruang)}</span></span>${st}</a>`;
  }).join('')}</div>`;
}

function semesterCard() {
  const sks = state.mapel.reduce((s, m) => s + (Number(m.sks) || 0), 0);
  return `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(state.profile.semester || 'Semester ini')} · ${sks} SKS</b><span class="small muted">${state.mapel.length} mata kuliah</span></div></div>`;
}

function hariIni() {
  const d = new Date();
  const L = weekLetter(d);
  const eyebrow = `${fmtLong(d)}${L ? ' · Minggu ' + L : ''}${isKuliah() && state.profile.semester ? ' · ' + esc(state.profile.semester) : ''}`;
  const bell = `<a class="icon-btn" href="#/pengingat" aria-label="Pengingat">${ic('bell')}</a>`;
  const nc = notifCard();
  if (isSD()) {
    return { tab: 'hari', html: `<div class="page sd">${rootTop(eyebrow, greet(), bell)}${nc}<div class="dash dash-2"><div class="dcol">${nowCard()}${tasksNear(4)}</div><div class="dcol">${bawaanCard()}<a class="btn btn-primary btn-lg" href="#/ringkasan">${ic('share', 22)}Kirim ringkasan ke orang tua</a>${eventsToday()}</div></div></div>` };
  }
  if (isKuliah()) {
    return { tab: 'hari', html: `<div class="page">${rootTop(eyebrow, greet(), bell)}${nc}<div class="dash dash-2"><div class="dcol">${nowCard()}${semesterCard()}${eventsToday()}</div><div class="dcol">${kuliahToday()}${tasksNear(4)}</div></div></div>` };
  }
  return { tab: 'hari', html: `<div class="page">${rootTop(eyebrow, greet(), bell)}${nc}<div class="dash dash-3"><div class="dcol">${nowCard()}${eventsToday()}</div><div class="dcol">${tasksNear(3)}</div><div class="dcol">${bawaanCard()}${ujianHint()}</div></div></div>` };
}
function ujianHint() {
  const u = upcomingUjian()[0];
  if (!u) return '';
  const n = daysBetween(today(), new Date(u.tanggal + 'T00:00'));
  const m = u.materi || [];
  return `<a class="card" href="#/ujian"><div class="row" style="justify-content:space-between">${schip('ujian', u.jenis || 'Ujian')}<span class="small muted">${n === 0 ? 'Hari ini' : n === 1 ? 'Besok' : n + ' hari lagi'}</span></div><b>${esc(mapelName(u.mapelId))}${u.nama ? ' · ' + esc(u.nama) : ''}</b>${m.length ? `<div class="row" style="gap:10px"><div class="bar grow"><span style="width:${Math.round((m.filter((x) => x.done).length / m.length) * 100)}%"></span></div><span class="small muted">${m.filter((x) => x.done).length}/${m.length} materi</span></div>` : ''}</a>`;
}

// ---------- Bawaan ----------
function bawaan() {
  const d = nextSchoolDay();
  const B = bawaanFor(d);
  const L = lessonsOn(d);
  const groups = B.groups.map((g) => {
    const head = g.mapel ? `${mchip(g.mapel)}<span class="small muted">${g.jamKe ? 'jam ke-' + g.jamKe : jam(g.mulai)}</span>` : schip(g.key === 'tugas' ? 'week' : 'later', g.title);
    return `<div class="list"><div class="list-item" style="min-height:48px">${head}</div>${g.items.map((x) => `<label class="checkrow"><input type="checkbox" class="check" data-chg="bawaanCek" data-date="${iso(d)}" data-key="${esc(x.key)}" ${B.cek.has(x.key) ? 'checked' : ''}><span class="grow">${esc(x.teks)}</span>${x.extra ? `<button type="button" class="icon-btn sm" data-act="bawaanDel" data-date="${iso(d)}" data-teks="${esc(x.teks)}" aria-label="Hapus ${esc(x.teks)}">${ic('x', 16)}</button>` : ''}</label>`).join('')}</div>`;
  }).join('');
  return {
    html: `<div class="page narrow">${subTop(`${daysBetween(today(), d) === 1 ? 'Besok' : fmtShort(d)} bawa apa?`, '#/')}
<div class="card" style="gap:10px"><span class="eyebrow">${fmtLong(d)} · ${L.items.length} ${isKuliah() ? 'kuliah' : 'pelajaran'}</span><span style="font-weight:800;font-size:20px">${B.done} dari ${B.total} sudah masuk tas</span><div class="bar"><span style="width:${B.total ? Math.round((B.done / B.total) * 100) : 0}%"></span></div></div>
${groups || empty('bag', 'Belum ada barang bawaan', 'Atur barang tetap tiap mapel di Kelola mapel, atau tambahkan barang untuk hari ini.')}
<form class="row" data-form="bawaanAdd" data-date="${iso(d)}"><input class="input grow" name="teks" placeholder="Tambah barang, misal: kertas folio" aria-label="Barang tambahan" maxlength="60"><button class="btn btn-line" type="submit">${ic('plus')}Tambah</button></form>
<p class="p small muted">Barang tetap tiap mapel diatur di <a class="link inl" href="#/jadwal/mapel">Kelola mapel</a>.</p></div>`,
  };
}

// ---------- Ringkasan pendamping ----------
function weekData() {
  const mon = mondayOf(new Date()), sun = addDays(mon, 6);
  const a = iso(mon), b = iso(sun);
  const tugas = sortTasks(state.tugas.filter((t) => t.deadline && t.deadline.slice(0, 10) >= a && t.deadline.slice(0, 10) <= b));
  const ujian = state.ujian.filter((u) => u.tanggal >= a && u.tanggal <= iso(addDays(sun, 7))).sort((x, y) => x.tanggal.localeCompare(y.tanggal));
  const d = nextSchoolDay();
  const baw = bawaanFor(d).groups.filter((g) => g.mapel).flatMap((g) => g.items.map((x) => x.teks));
  return { mon, sun, tugas, ujian, bawDay: d, baw };
}
function ringkasanText(W) {
  const p = state.profile;
  const L = [`*Ringkasan ${p.nama || 'mingguan'}${p.kelas ? ' · ' + p.kelas : ''}*`, `${fmtRange(W.mon, W.sun)}`, ''];
  L.push(`PR/Tugas (${W.tugas.filter((t) => t.selesai).length} dari ${W.tugas.length} selesai):`);
  W.tugas.forEach((t) => L.push(`${t.selesai ? '✅' : '⬜'} ${t.judul} — ${mapelName(t.mapelId)}${t.selesai ? '' : ', ' + fmtShort(parseDT(t.deadline))}`));
  if (!W.tugas.length) L.push('— tidak ada');
  if (W.ujian.length) { L.push('', 'Ulangan/ujian:'); W.ujian.forEach((u) => L.push(`• ${mapelName(u.mapelId)} — ${fmtShort(new Date(u.tanggal + 'T00:00'))}${u.materi?.length ? ' (' + u.materi.map((m) => m.teks).join(', ') + ')' : ''}`)); }
  if (W.baw.length) L.push('', `Bawaan ${fmtShort(W.bawDay)}: ${W.baw.join(', ')}`);
  L.push('', '— dibuat di Jadwalin');
  return L.join('\n');
}
function ringkasan() {
  const W = weekData();
  const line = (t) => `<div class="row" style="gap:10px;align-items:flex-start"><span style="padding-top:2px;color:${t.selesai ? '#166534' : 'var(--ink3)'}">${ic(t.selesai ? 'check' : 'clock', 18)}</span><span class="col grow" style="gap:0"><span style="font-weight:600${t.selesai ? ';text-decoration:line-through;color:var(--ink2)' : ''}">${esc(t.judul)}</span><span class="small muted">${esc(mapelName(t.mapelId))} · ${t.selesai ? 'selesai' : 'dikumpulkan ' + fmtShort(parseDT(t.deadline))}</span></span></div>`;
  return {
    html: `<div class="page narrow">${subTop('Ringkasan pendamping', '#/lainnya')}
<p class="p muted">Kartu ini bisa dikirim ke orang tua atau guru. Mereka tidak perlu memasang aplikasi.</p>
<div class="card rk" id="rkCard" style="padding:0;gap:0;overflow:hidden">
<div class="rk-head"><span class="row small on-accent" style="gap:6px">${ic('calendar', 16)}Jadwalin · Ringkasan mingguan</span><span style="font-weight:800;font-size:20px">${esc(state.profile.nama || 'Ringkasan')}${state.profile.kelas ? ' · ' + esc(state.profile.kelas) : ''}</span><span class="small on-accent">${fmtRange(W.mon, W.sun)}</span></div>
<div class="col" style="padding:16px 18px;gap:16px">
<div class="col" style="gap:10px"><span class="eyebrow">${isSD() ? 'PR' : 'Tugas'} · ${W.tugas.filter((t) => t.selesai).length} dari ${W.tugas.length} selesai</span>${W.tugas.map(line).join('') || '<span class="small muted">Tidak ada tugas minggu ini.</span>'}</div>
${W.ujian.length ? `<div class="hr"></div><div class="col" style="gap:6px"><span class="eyebrow">Ulangan & ujian</span>${W.ujian.map((u) => `<span><b>${esc(mapelName(u.mapelId))}</b> · ${fmtShort(new Date(u.tanggal + 'T00:00'))}${u.materi?.length ? `<br><span class="small muted">${esc(u.materi.map((m) => m.teks).join(', '))}</span>` : ''}</span>`).join('')}</div>` : ''}
${W.baw.length ? `<div class="hr"></div><div class="col" style="gap:8px"><span class="eyebrow">Bawaan ${fmtShort(W.bawDay)}</span><div class="row wrap" style="gap:8px">${W.baw.map(gchip).join('')}</div></div>` : ''}
</div></div>
<div class="col" style="gap:10px"><button class="btn btn-primary" type="button" data-act="rkWA">${ic('share')}Bagikan ke WhatsApp</button><button class="btn btn-line" type="button" data-act="rkImg">${ic('download')}Simpan / bagikan gambar</button></div>
<div class="list">${swRow('Ingatkan tiap Minggu', 'Pukul 18.00, ringkasan siap dibagikan', 'rk', state.settings.ringkasanOtomatis, 'data-chg="rkAuto"')}
<a class="list-item" href="#/profil"><span class="ibox">${ic('lock')}</span><span class="col grow" style="gap:2px"><b>PIN pendamping ${state.profile.pin ? 'aktif' : 'belum diatur'}</b><span class="small muted">Menghapus data dan mengganti jenjang butuh PIN</span></span>${ic('right', 18)}</a></div></div>`,
  };
}

function drawRingkasan(W) {
  const c = document.createElement('canvas'); const w = 1080; const lines = [];
  const ctx0 = c.getContext('2d');
  const wrap = (text, font, max) => { ctx0.font = font; const words = text.split(' '); const out = []; let cur = ''; for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx0.measureText(t).width > max && cur) { out.push(cur); cur = wd; } else cur = t; } if (cur) out.push(cur); return out; };
  const F = (s, wgt = 600) => `${wgt} ${s}px "Plus Jakarta Sans", system-ui, sans-serif`;
  lines.push(['h', `${isSD() ? 'PR' : 'Tugas'} · ${W.tugas.filter((t) => t.selesai).length} dari ${W.tugas.length} selesai`]);
  W.tugas.forEach((t) => { wrap(`${t.selesai ? '✓' : '○'}  ${t.judul}`, F(34), w - 160).forEach((x, i) => lines.push(['t', x, t.selesai, i])); lines.push(['m', `${mapelName(t.mapelId)} · ${t.selesai ? 'selesai' : 'dikumpulkan ' + fmtShort(parseDT(t.deadline))}`]); });
  if (!W.tugas.length) lines.push(['m', 'Tidak ada tugas minggu ini.']);
  if (W.ujian.length) { lines.push(['sp']); lines.push(['h', 'Ulangan & ujian']); W.ujian.forEach((u) => { lines.push(['t', `${mapelName(u.mapelId)} · ${fmtShort(new Date(u.tanggal + 'T00:00'))}`]); if (u.materi?.length) wrap(u.materi.map((m) => m.teks).join(', '), F(28, 500), w - 160).forEach((x) => lines.push(['m', x])); }); }
  if (W.baw.length) { lines.push(['sp']); lines.push(['h', `Bawaan ${fmtShort(W.bawDay)}`]); wrap(W.baw.join(' · '), F(30, 600), w - 160).forEach((x) => lines.push(['t', x])); }
  const H = { h: 64, t: 48, m: 56, sp: 28 };
  const bodyH = lines.reduce((s, l) => s + H[l[0]], 0);
  const h = 300 + bodyH + 140;
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const accent = getComputedStyle(document.body).getPropertyValue('--now').trim() || '#4338CA';
  g.fillStyle = '#F6F5FB'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.fillRect(40, 40, w - 80, h - 80);
  g.fillStyle = accent; g.fillRect(40, 40, w - 80, 230);
  g.fillStyle = '#E0E7FF'; g.font = F(28, 600); g.fillText('Jadwalin · Ringkasan mingguan', 80, 100);
  g.fillStyle = '#fff'; g.font = F(52, 800); g.fillText(`${state.profile.nama || 'Ringkasan'}${state.profile.kelas ? ' · ' + state.profile.kelas : ''}`, 80, 175);
  g.fillStyle = '#E0E7FF'; g.font = F(30, 500); g.fillText(fmtRange(W.mon, W.sun), 80, 228);
  let y = 330;
  for (const l of lines) {
    if (l[0] === 'h') { g.fillStyle = '#5B5A70'; g.font = F(28, 700); g.fillText(l[1].toUpperCase(), 80, y); }
    if (l[0] === 't') { g.fillStyle = l[2] ? '#5B5A70' : '#1B1A2E'; g.font = F(34, 700); g.fillText(l[1], 80, y); }
    if (l[0] === 'm') { g.fillStyle = '#5B5A70'; g.font = F(28, 500); g.fillText(l[1], 110, y); }
    y += H[l[0]];
  }
  g.fillStyle = '#8B8A9E'; g.font = F(24, 500); g.fillText('Dibuat di Jadwalin', 80, h - 80);
  return c;
}

register({
  views: { hari: hariIni, bawaan, ringkasan },
  actions: {
    notifDismiss: () => { state.settings.notifAskDismissed = true; save(); rerender(); },
    bawaanDel: (el) => { const d = el.dataset.date; state.bawaanExtra[d] = (state.bawaanExtra[d] || []).filter((x) => x !== el.dataset.teks); save(); rerender(); },
    rkWA: () => { const txt = ringkasanText(weekData()); window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank', 'noopener'); },
    rkImg: async () => {
      try { await document.fonts?.ready; } catch { /* abaikan */ }
      const c = drawRingkasan(weekData());
      c.toBlob(async (blob) => {
        const file = new File([blob], `ringkasan-${iso(new Date())}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Ringkasan mingguan' }); return; } catch { /* dibatalkan */ } }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Gambar disimpan');
      }, 'image/png');
    },
  },
  changes: {
    bawaanCek: (el) => { const d = el.dataset.date; const s = new Set(state.bawaanCek[d] || []); el.checked ? s.add(el.dataset.key) : s.delete(el.dataset.key); state.bawaanCek[d] = [...s]; save(); rerender(); },
    rkAuto: (el) => { state.settings.ringkasanOtomatis = el.checked; save(); },
  },
});
register({ forms: {
  bawaanAdd: (f) => { const t = f.teks.value.trim(); if (!t) return; const d = f.dataset.date; state.bawaanExtra[d] = [...(state.bawaanExtra[d] || []), t]; save(); rerender(); },
} });
