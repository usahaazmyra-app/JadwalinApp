# Jadwalin

Aplikasi jadwal pelajaran, tugas & deadline, ekskul/les, dan ujian untuk pelajar SD sampai mahasiswa.
Berjalan **offline**, **tanpa akun**, semua data tersimpan di perangkat (IndexedDB). Dibangun sebagai PWA
(HTML, CSS, JavaScript tanpa framework, tanpa build step).

## Fitur

- Onboarding 4 langkah + mode **SD**, **SMP–SMA/SMK**, **Mahasiswa**, atau langsung coba dengan data contoh
- **Hari Ini**: pelajaran sekarang/berikutnya, tugas terdekat, kegiatan hari ini, bawaan besok, ujian terdekat
- **Jadwal**: grid mingguan (jam ke-), pola **Minggu A/B**, jam masuk & istirahat, libur/pulang cepat/jadwal khusus, kelola mapel (warna, guru, ruang, bawaan tetap); mode kuliah dengan jam bebas, SKS, dan semester baru
- **Tugas**: tambah cepat (mapel otomatis dari pelajaran yang berlangsung, deadline "pertemuan berikutnya"), status berwarna, filter & cari, langkah, pembagian tugas kelompok, lampiran foto, riwayat selesai
- **Kalender** minggu & bulan, **Ekskul & les** dengan peringatan bentrok, **Jadwal ujian** dengan checklist materi
- **Pengingat** (ringkasan pagi, H-1, menjelang deadline, ekskul/les, ujian, senyap saat pelajaran)
- **Catatan** per mapel dengan foto, **Progres mingguan** & hari beruntun, **Mode fokus** (Pomodoro)
- **Ringkasan pendamping** (kirim ke WhatsApp atau simpan gambar), **PIN pendamping**
- **Bagikan jadwal kelas** lewat file `.jadwalin`, **backup & pulihkan**
- Tema terang/gelap, 6 warna aksen, ukuran huruf; tampilan tablet (rel navigasi & panel ganda)
- **Bantuan & Q&A** (41 pertanyaan)

## Struktur

```
index.html              kerangka aplikasi
manifest.webmanifest    data PWA (nama, ikon, pintasan)
sw.js                   service worker: offline + klik notifikasi
vercel.json             header untuk Vercel
css/app.css             semua gaya (HP, tablet, gelap)
icons/                  ikon aplikasi
js/app.js               router, event, pendaftaran service worker
js/store.js             penyimpanan IndexedDB
js/logic.js             logika jadwal, tugas, pengingat, data contoh
js/ui.js, forms.js      komponen & formulir
js/notify.js, theme.js  notifikasi & tema
js/faq.js               isi Bantuan & Q&A
js/views/*.js           halaman-halaman
```

## Menjalankan di komputer

Butuh server lokal (service worker tidak jalan dari `file://`):

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Deploy ke Vercel

1. Buat repo baru di GitHub (misal `jadwalin`), lalu unggah semua file ini.
2. Di vercel.com → **Add New → Project** → pilih repo → Framework: **Other** → **Deploy**.
3. Aplikasi tersedia di `https://<nama-proyek>.vercel.app`.

## Memasang di HP

- **Android (Chrome)**: buka alamat Vercel → menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama**.
- **iPhone (Safari)**: tombol Bagikan → **Tambahkan ke Layar Utama**.

## Membuat APK (Android)

1. Buka https://www.pwabuilder.com dan masukkan alamat Vercel.
2. Pilih **Package for stores → Android** → **Generate** → unduh ZIP.
3. Pasang file `.apk` di HP (izinkan "instal dari sumber tidak dikenal"), atau unggah `.aab` ke Google Play.

## Catatan pengingat

Pengingat dibuat di perangkat tanpa internet dan dikirim selama Jadwalin berjalan (terbuka atau di latar belakang).
Browser membatasi PWA mengirim notifikasi terjadwal saat aplikasi ditutup paksa. Untuk pengingat yang tetap muncul
walau aplikasi ditutup, langkah berikutnya adalah membungkus dengan Capacitor + Local Notifications.

## Memperbarui versi

Setiap mengubah file, naikkan `VERSION` di `sw.js` (misal `jadwalin-v1.0.1`) agar HP mengambil versi terbaru.
