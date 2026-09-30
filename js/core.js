// Registri aksi & navigasi, dipakai semua halaman (menghindari import melingkar)
export const ACT = {};   // klik pada [data-act]
export const CHG = {};   // change pada [data-chg]
export const INP = {};   // input pada [data-inp]
export const VIEWS = {}; // nama rute -> fungsi render
export const FORMS = {}; // submit pada form[data-form]

export function register({ actions = {}, changes = {}, inputs = {}, views = {}, forms = {} }) {
  Object.assign(ACT, actions); Object.assign(CHG, changes); Object.assign(INP, inputs); Object.assign(VIEWS, views); Object.assign(FORMS, forms);
}

let renderFn = () => {};
export function setRenderer(fn) { renderFn = fn; }
export function rerender() { renderFn(false); }
// saat sheet baru ditutup, navigasi ditahan sampai entri riwayat sheet dilepas
export const nav = { holding: false, pending: null };
export function go(hash, replace = false) {
  if (nav.holding) { nav.pending = [hash, replace]; return; }
  if (replace) { history.replaceState(null, '', hash); renderFn(true); }
  else if (location.hash === hash) renderFn(true);
  else location.hash = hash;
}
export function back(fallback = '#/') {
  if (history.length > 1 && document.referrer !== undefined && sessionStorage.getItem('jw-nav') === '1') history.back();
  else go(fallback);
}
