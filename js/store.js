// Penyimpanan lokal: IndexedDB (state + file foto), cadangan localStorage
import { uid } from './util.js';

const DB = 'jadwalin', VER = 1, KEY = 'state';
let db = null;
let saveTimer = null;
const mem = new Map(); // cadangan file bila IndexedDB tidak tersedia

export function defaultState() {
  return {
    v: 1,
    setup: false,
    profile: {
      nama: '', jenjang: 'sekolah', kelas: '', sekolah: '', semester: '',
      jamMasuk: '07:00', durasi: 45, jamPerHari: 8,
      breaks: [{ after: 3, durasi: 15, label: 'Istirahat' }, { after: 6, durasi: 45, label: 'Ishoma' }],
      hariSekolah: 5, pola: 'tetap', abAnchor: null, abStart: 'A',
      pin: null, pinQ: '', pinA: null,
    },
    settings: {
      tema: 'sistem', aksen: '#4F46E5', huruf: 1,
      notif: { pagi: true, jamPagi: '06:00', h1: true, jamH1: '19:00', dekat: true, dekatJam: 2, kegiatan: true, kegiatanMenit: 30, ujian: true, senyap: false },
      ringkasanOtomatis: false, fokusMenit: 25, notifAskDismissed: false, lastBackup: '',
    },
    mapel: [], jadwal: [], pengecualian: [], tugas: [], kegiatan: [], ujian: [], catatan: [],
    bawaanCek: {}, bawaanExtra: {}, notifSent: {}, fokus: { tanggal: '', sesi: 0 },
  };
}

function merge(base, src) {
  if (!src || typeof src !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in src)) continue;
    const b = base[k], s = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && s && typeof s === 'object' && !Array.isArray(s)) base[k] = merge(b, s);
    else base[k] = s;
  }
  return base;
}

export let state = defaultState();

function openDB() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('no idb'));
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('files')) d.createObjectStore('files'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function req(store, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => res(r ? r.result : undefined);
    t.onerror = () => rej(t.error);
  });
}

export async function load() {
  let raw = null;
  try { db = await openDB(); raw = await req('kv', 'readonly', (s) => s.get(KEY)); }
  catch { db = null; try { raw = JSON.parse(localStorage.getItem('jadwalin-state') || 'null'); } catch { raw = null; } }
  state = merge(defaultState(), raw);
  return state;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}
export async function flush() {
  clearTimeout(saveTimer);
  const data = JSON.parse(JSON.stringify(state));
  try { if (db) await req('kv', 'readwrite', (s) => s.put(data, KEY)); else localStorage.setItem('jadwalin-state', JSON.stringify(data)); }
  catch (e) { console.error('Gagal menyimpan', e); }
}
window.addEventListener('pagehide', () => { flush(); });

export function replaceState(obj) { state = merge(defaultState(), obj); save(); }

// ---------- file (foto lampiran/catatan) ----------
export async function putFile(dataUrl, id = uid()) {
  if (db) await req('files', 'readwrite', (s) => s.put(dataUrl, id)); else mem.set(id, dataUrl);
  return id;
}
export async function getFile(id) {
  if (db) return req('files', 'readonly', (s) => s.get(id));
  return mem.get(id);
}
export async function delFile(id) {
  if (db) await req('files', 'readwrite', (s) => s.delete(id)); else mem.delete(id);
}
export async function allFiles() {
  if (!db) return Object.fromEntries(mem);
  const keys = await req('files', 'readonly', (s) => s.getAllKeys());
  const vals = await req('files', 'readonly', (s) => s.getAll());
  const out = {}; keys.forEach((k, i) => { out[k] = vals[i]; });
  return out;
}
export async function clearAll() {
  state = defaultState();
  if (db) { await req('files', 'readwrite', (s) => s.clear()); await req('kv', 'readwrite', (s) => s.clear()); }
  else { mem.clear(); localStorage.removeItem('jadwalin-state'); }
}
