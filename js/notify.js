// Notifikasi pengingat (berjalan selama aplikasi terbuka/di latar belakang)
import { state, save } from './store.js';
import { reminders, inSchoolHours } from './logic.js';

const swReg = async () => { try { return navigator.serviceWorker && (await navigator.serviceWorker.getRegistration()); } catch { return null; } };

export const notifSupported = () => 'Notification' in window;
export const notifPermission = () => (notifSupported() ? Notification.permission : 'unsupported');
export async function askPermission() {
  if (!notifSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}
export async function showNotif(title, body, url = '#/', tag, until) {
  if (notifPermission() !== 'granted') return false;
  const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url, until: until ? +until : 0 }, timestamp: Date.now(), vibrate: [120, 60, 120] };
  try {
    const reg = await swReg();
    if (reg) { await reg.showNotification(title, opts); return true; }
  } catch { /* lanjut ke cara biasa */ }
  try { new Notification(title, opts); return true; } catch { return false; }
}

export let fokusRunning = false;
export function setFokusRunning(v) { fokusRunning = v; }

// Tutup notifikasi yang kabarnya sudah lewat (misal "30 menit lagi" padahal kegiatan sudah mulai)
export async function closeStale(now = Date.now()) {
  const reg = await swReg(); if (!reg || !reg.getNotifications) return;
  try { for (const x of await reg.getNotifications()) if (x.data && x.data.until && x.data.until <= now) x.close(); } catch { /* abaikan */ }
}

let busy = false;
export async function checkReminders() {
  if (!state.setup || notifPermission() !== 'granted' || busy) return;
  busy = true;
  try {
    const now = new Date();
    await closeStale(now.getTime());
    const sent = state.notifSent;
    const hold = (state.settings.notif.senyap && inSchoolHours(now)) || fokusRunning;
    let changed = false;
    for (const r of reminders(now)) {
      if (sent[r.key] || r.time > now) continue;
      const maxLate = r.key.startsWith('pagi:') ? 3 * 36e5 : 6 * 36e5;
      const txt = now - r.time > maxLate || (r.until && now >= r.until) ? null : r.render(now);
      if (!txt) { sent[r.key] = now.getTime(); changed = true; continue; } // sudah lewat / tidak relevan lagi
      if (hold) continue;
      const ok = await showNotif(txt.title, txt.body, r.url, r.key, r.until);
      if (ok) { sent[r.key] = now.getTime(); changed = true; }
    }
    const cut = now.getTime() - 30 * 864e5;
    for (const k of Object.keys(sent)) if (sent[k] < cut) { delete sent[k]; changed = true; }
    if (changed) save();
  } finally { busy = false; }
}

export function upcomingReminders(n = 5) {
  const now = new Date();
  return reminders(now).filter((r) => r.time > now && !state.notifSent[r.key]).sort((a, b) => a.time - b.time).slice(0, n);
}
