// Utilitas umum: tanggal, format, id, escape
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = (n) => String(n).padStart(2, '0');

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const HARI3 = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const parseDT = (s) => { const [a, b = '00:00'] = s.split('T'); const d = parseISO(a); const [h, m] = b.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
export const stamp = (d = new Date()) => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const today = () => startOfDay(new Date());
export const mondayOf = (d) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
export const sameDay = (a, b) => iso(a) === iso(b);

export const fmtLong = (d) => `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`;
export const fmtShort = (d) => `${HARI3[d.getDay()]} ${d.getDate()} ${BULAN3[d.getMonth()]}`;
export const fmtDM = (d) => `${d.getDate()} ${BULAN3[d.getMonth()]}`;
export const fmtRange = (a, b) => (a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${BULAN3[b.getMonth()]}` : `${fmtDM(a)} – ${fmtDM(b)}`);

export const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(((m % 60) + 60) % 60)}`;
export const jam = (t) => (t ? t.slice(0, 5).replace(':', '.') : '');
export const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

// Hash kecil sinkron untuk PIN (kunci lokal, bukan keamanan server)
export function hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const s = 'jadwalin:' + str;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const plural = (n, w) => `${n} ${w}`;
export const isWide = () => window.matchMedia('(min-width: 900px)').matches;
