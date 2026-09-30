// Notifikasi pengingat (berjalan selama aplikasi terbuka/di latar belakang)
import { state, save } from './store.js';
import { reminders, inSchoolHours } from './logic.js';

export const notifSupported = () => 'Notification' in window;
export const notifPermission = () => (notifSupported() ? Notification.permission : 'unsupported');
export async function askPermission() {
  if (!notifSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}
export async function showNotif(title, body, url = '#/', tag) {
  if (notifPermission() !== 'granted') return false;
  const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url }, vibrate: [120, 60, 120] };
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg) { await reg.showNotification(title, opts); return true; }
  } catch { /* lanjut ke cara biasa */ }
  try { new Notification(title, opts); return true; } catch { return false; }
}

export let fokusRunning = false;
export function setFokusRunning(v) { fokusRunning = v; }

export async function checkReminders() {
  if (!state.setup || notifPermission() !== 'granted') return;
  const now = new Date();
  const sent = state.notifSent;
  const hold = (state.settings.notif.senyap && inSchoolHours(now)) || fokusRunning;
  let changed = false;
  for (const r of reminders(now)) {
    if (sent[r.key]) continue;
    if (r.time > now) continue;
    const maxLate = r.key.startsWith('pagi:') ? 3 * 36e5 : 6 * 36e5;
    if (now - r.time > maxLate) { sent[r.key] = now.getTime(); changed = true; continue; } // terlalu lama, lewati
    if (hold) continue;
    const ok = await showNotif(r.title, r.body, r.url, r.key);
    if (ok) { sent[r.key] = now.getTime(); changed = true; }
  }
  const cut = now.getTime() - 30 * 864e5;
  for (const k of Object.keys(sent)) if (sent[k] < cut) { delete sent[k]; changed = true; }
  if (changed) save();
}

export function upcomingReminders(n = 5) {
  const now = new Date();
  return reminders(now).filter((r) => r.time > now && !state.notifSent[r.key]).sort((a, b) => a.time - b.time).slice(0, n);
}
