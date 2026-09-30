// Service worker Jadwalin: offline penuh + klik notifikasi
const VERSION = 'jadwalin-v1.0.6';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/core.js', 'js/util.js', 'js/store.js', 'js/logic.js', 'js/ui.js', 'js/forms.js', 'js/notify.js', 'js/theme.js', 'js/faq.js',
  'js/views/onboarding.js', 'js/views/today.js', 'js/views/jadwal.js', 'js/views/tugas.js', 'js/views/kalender.js', 'js/views/catatan.js', 'js/views/lainnya.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // font Google: simpan setelah pertama kali dimuat
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async (c) => { const hit = await c.match(req); if (hit) return hit; try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; } catch { return hit || Response.error(); } }));
    return;
  }
  if (url.origin !== location.origin) return;
  // halaman: jaringan dulu, lalu cache (supaya pembaruan cepat terlihat)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return res; }).catch(() => caches.match('index.html')));
    return;
  }
  // aset: cache dulu, perbarui di belakang
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '#/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.focus(); c.postMessage({ url }); return; } }
    await self.clients.openWindow('./' + url);
  })());
});
