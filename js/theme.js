// Tema: terang/gelap, warna aksen, ukuran huruf, mode jenjang
import { state } from './store.js';

const mq = window.matchMedia('(prefers-color-scheme: dark)');
export function applyTheme() {
  const s = state.settings;
  const dark = s.tema === 'gelap' || (s.tema === 'sistem' && mq.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.setProperty('--accent', s.aksen || '#4F46E5');
  document.body.style.zoom = String(s.huruf || 1);
  document.body.classList.toggle('mode-sd', state.profile.jenjang === 'sd');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#121120' : '#F6F5FB');
}
mq.addEventListener?.('change', () => applyTheme());
