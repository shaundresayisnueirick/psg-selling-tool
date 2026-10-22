#!/usr/bin/env node
'use strict';
/* Persistensi login PWA + mode offline 14 hari.

     node tests/offline-sesi.test.js [--root <dir>] [--bagian A,B,...]

   Memakai vendor Identity ASLI (src/vendor/netlify-identity.js, gotrue-js) dan
   Service Worker ASLI di Chromium. Server dan Identity ditiru lewat Playwright:
   POST /token (password/refresh_token), GET /user, POST /logout, dan
   GET /api/psg/me yang menilai cookie nf_jwt seperti server nyata (cookie yang
   lebih tua dari UMUR_TOKEN_MS dianggap kedaluwarsa → 401).
   Pengujian ini simulasi di Chromium desktop, BUKAN pengujian perangkat nyata. */
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');

function loadPlaywright() {
  for (const m of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) { try { return require(m); } catch (_) {} }
  console.log('Playwright tidak tersedia — dilewati.'); process.exit(2);
}
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ROOT = path.resolve(opt('--root') || path.join(__dirname, '..'));
const BAGIAN = (opt('--bagian') || '').split(',').filter(Boolean);
const ikut = (k) => !BAGIAN.length || BAGIAN.includes(k);
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml',
  png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', mp3: 'audio/mpeg', mp4: 'video/mp4', webmanifest: 'application/manifest+json' };
let gagal = 0, jumlah = 0;
function cek(ok, pesan, detail) {
  jumlah++;
  console.log((ok ? '  OK    ' : '  GAGAL ') + pesan + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) gagal++;
}
const MODE = { server: 'normal' }; // 'normal' | 'putus' (koneksi ditolak) | 'gantung' (tidak pernah menjawab)
const tertahan = [];
const server = http.createServer((req, res) => {
  if (MODE.server === 'putus') { req.socket.destroy(); return; }
  if (MODE.server === 'gantung') { tertahan.push(res); return; }
  let rel = decodeURIComponent((req.url || '/').split(/[?#]/)[0]); if (rel.endsWith('/')) rel += 'index.html';
  const f = path.resolve(ROOT, '.' + rel);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  const h = { 'content-type': MIME[path.extname(f).slice(1)] || 'application/octet-stream' };
  h['cache-control'] = /sw\.js$/.test(f) ? 'no-store' : 'no-cache';
  res.writeHead(200, h); fs.createReadStream(f).pipe(res);
});

const UMUR_TOKEN_MS = 4000;          // simulasi: cookie nf_jwt dianggap kedaluwarsa server sesudah 4 dtk
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const PROFIL = { id: 'uji-agen-0001', email: 'agen.uji@psg.test', nama: 'Agen Uji', roles: [], level: 'FC', kodeAgen: 'UJI01', status: 'aktif', emailTerkonfirmasi: true };

/* Satu "dunia" server tiruan per konteks. */
function dunia() {
  const st = { expDtk: 70, gantung: false, refreshValid: true, refreshN: 0, tokenN: 0, meN: 0, logoutN: 0, tolakMe: null, tolakIdentity: false, tokenSah: new Set() };
  const buatToken = () => {
    const iat = Math.floor(Date.now() / 1000), t = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: PROFIL.id, email: PROFIL.email, iat, exp: iat + st.expDtk, jti: ++st.tokenN }) + '.sig';
    st.tokenSah.add(t); return t;
  };
  st.pasang = async (ctx) => {
    await ctx.route('**/.netlify/identity/**', async (route) => {
      const rq = route.request(), p = new URL(rq.url()).pathname.replace(/^\/\.netlify\/identity/, '');
      if (st.gantung) return new Promise(() => {});
      if (st.tolakIdentity) return route.abort('internetdisconnected');
      const json = (s, b) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
      if (p === '/token' && rq.method() === 'POST') {
        const body = rq.postData() || '';
        if (/grant_type=refresh_token/.test(body)) { if (!st.refreshValid) return json(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' }); st.refreshN++; }
        else if (!/grant_type=password/.test(body)) return json(400, { error: 'unsupported_grant_type' });
        return json(200, { access_token: buatToken(), token_type: 'bearer', expires_in: 70, refresh_token: 'R-' + (++st.tokenN) });
      }
      if (p === '/user' && rq.method() === 'GET') return json(200, { id: PROFIL.id, email: PROFIL.email, confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', roles: [], psg: { nama: PROFIL.nama, level: 'FC', kodeAgen: 'UJI01', status: 'aktif' } }, user_metadata: { full_name: PROFIL.nama } });
      if (p === '/logout') { st.logoutN++; return route.fulfill({ status: 204, body: '' }); }
      return json(404, { msg: 'tidak ada' });
    });
    await ctx.route('**/api/psg/me', async (route) => {
      st.meN++;
      if (st.gantung) return new Promise(() => {});
      if (st.tolakMe === 'jaringan') return route.abort('internetdisconnected');
      if (st.tolakMe === '5xx') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"x"}' });
      const cookie = (await route.request().allHeaders()).cookie || '';
      const m = /(?:^|;\s*)nf_jwt=([^;]*)/.exec(cookie);
      let ok = false;
      if (m && st.tolakMe !== '401') {
        try { const c = JSON.parse(Buffer.from(decodeURIComponent(m[1]).split('.')[1], 'base64url').toString()); ok = Date.now() - c.iat * 1000 <= UMUR_TOKEN_MS && c.exp * 1000 > Date.now(); } catch (_) {}
      }
      return ok ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: PROFIL }) })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"authenticated":false,"error":"unauthenticated"}' });
    });
    await ctx.route('**/api/psg/pribadi**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"penyimpanan":"preview","pesan":null,"polis":[]}' }));
  };
  return st;
}

const tunggu = async (pg, fn, ms, arg) => { try { await pg.waitForFunction(fn, arg, { timeout: ms || 15000 }); return true; } catch (_) { return false; } };
const jeda = (ms) => new Promise((r) => setTimeout(r, ms));
const keadaan = (pg) => pg.evaluate(() => ({
  gate: !!document.getElementById('insuranceAccessGate'),
  terkunci: document.documentElement.classList.contains('insurance-auth-locked'),
  formEmail: !!(document.getElementById('psgIdentityEmail') && document.getElementById('psgIdentityEmail').offsetParent),
  pesan: ((document.getElementById('psgIdentityServerError') || {}).textContent || '') + ' ' + ((document.getElementById('psgIdentityRestoreStatus') || {}).textContent || ''),
  identitas: window.InsuranceHubIdentity ? window.InsuranceHubIdentity.email : null,
  offlineMode: !!(window.PSGOffline && window.PSGOffline.aktif),
  banner: !!document.getElementById('psgOfflineBanner'),
  gotrue: localStorage.getItem('gotrue.user') !== null,
  rekam: localStorage.getItem('psg.offline.v1') !== null,
  tandaKeluar: localStorage.getItem('psg.keluar.v1') !== null,
}));
async function login(pg, base) {
  await pg.goto(base + 'index.html');
  await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 20000 });
  await pg.fill('#psgIdentityEmail', PROFIL.email); await pg.fill('#psgIdentityPassword', 'RahasiaUji#2026');
  await pg.click('#psgIdentityMasuk');
  return tunggu(pg, () => !document.getElementById('insuranceAccessGate') && window.InsuranceHubIdentity, 20000);
}
async function siapOffline(pg) {
  /* waitForFunction tidak menunggu fungsi async: polling lewat evaluate. */
  const batas = Date.now() + 90000;
  while (Date.now() < batas) {
    const ok = await pg.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (!r || !r.active || !navigator.serviceWorker.controller) return false;
      const st = await window.PSGOffline.statusSiap(); return !!st && st.gagal.length === 0; }).catch(() => false);
    if (ok) return true; await jeda(300);
  }
  return false;
}
async function konteks(br, opsi = {}) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: opsi.sw ? 'allow' : 'block', ...(opsi.ctx || {}) });
  const w = dunia(); await w.pasang(ctx);
  const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(String(e))); pg.on('dialog', (d) => d.accept());
  return { ctx, pg, w, err };
}
const ubahRekam = (pg, f) => pg.evaluate((src) => { const r = JSON.parse(localStorage.getItem('psg.offline.v1')); (new Function('r', src))(r); localStorage.setItem('psg.offline.v1', JSON.stringify(r)); }, f);
const HARI = 24 * 3600 * 1000;
/* Rute tiruan tetap menjawab walau setOffline: putuskan juga server tiruan. */
const putus = async (ctx, w, ya) => { await ctx.setOffline(!!ya); w.tolakIdentity = !!ya; w.tolakMe = ya ? 'jaringan' : null; };


/* Pengukuran waktu pembukaan dashboard. Keluaran: JSON per skenario. */
const SKENARIO = (opt('--skenario') || '').split(',').filter(Boolean);
const mau = (k) => !SKENARIO.length || SKENARIO.includes(k);
const BATAS_MS = Number(opt('--batas') || 240000);
const hasil = [];
async function ukur(nama, ctx, w, { gantung = false, putusCepat = false, pasca = 0 } = {}, dasar) {
  // atur jaringan
  MODE.server = gantung ? 'gantung' : (putusCepat ? 'putus' : 'normal');
  w.gantung = gantung; w.tolakIdentity = putusCepat; w.tolakMe = putusCepat ? 'jaringan' : null;
  if (putusCepat) await ctx.setOffline(true);
  const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(String(e)));
  await pg.addInitScript(() => {
    window.__jejak = []; const t0 = performance.now(); const asli = window.fetch.bind(window);
    const asal = () => { const m = (new Error().stack || '').split('\n').slice(2).map((l) => (l.match(/\/([\w.-]+\.js):(\d+)/) || [])[1]).filter(Boolean); return [...new Set(m)].slice(0, 3).join('<'); };
    window.fetch = function (u, o) { const url = String(typeof u === 'string' ? u : (u && u.url) || ''); const k = { t: Math.round(performance.now() - t0), url: url.replace(/^https?:\/\/[^/]+/, ''), asal: asal() };
      if (/identity|\/api\/psg\//.test(url)) { window.__jejak.push(k); const fin = (h) => { k.sel = Math.round(performance.now() - t0); k.hasil = h; }; return asli(u, o).then((r) => { fin(r.status); return r; }, (e) => { fin('galat'); throw e; }); }
      return asli(u, o); };
    document.addEventListener('DOMContentLoaded', () => { window.__dcl = Math.round(performance.now() - t0); });
    window.addEventListener('load', () => { window.__load = Math.round(performance.now() - t0); });
    const po = new MutationObserver(() => { if (!window.__gerbang && document.getElementById('insuranceAccessGate')) window.__gerbang = Math.round(performance.now() - t0); }); po.observe(document, { childList: true, subtree: true });
  });
  const t0 = Date.now(); const log = [];
  pg.on('request', (r) => { if (/\/\.netlify\/identity|\/api\/psg\//.test(r.url())) log.push({ t: Date.now() - t0, url: r.url().replace(dasar, '/'), ev: 'minta' }); });
  pg.on('requestfinished', (r) => { if (/\/\.netlify\/identity|\/api\/psg\//.test(r.url())) log.push({ t: Date.now() - t0, url: r.url().replace(dasar, '/'), ev: 'selesai' }); });
  pg.on('requestfailed', (r) => { if (/\/\.netlify\/identity|\/api\/psg\//.test(r.url())) log.push({ t: Date.now() - t0, url: r.url().replace(dasar, '/'), ev: 'gagal' }); });
  pg.goto(dasar + 'index.html', { waitUntil: 'commit', timeout: BATAS_MS }).catch(() => {});
  let buka = false, gerbang = null;
  const mulai = Date.now();
  while (Date.now() - mulai < BATAS_MS) {
    const s = await pg.evaluate(() => ({ dash: !document.getElementById('insuranceAccessGate') && !!window.InsuranceHubIdentity, off: !!(window.PSGOffline && window.PSGOffline.aktif), pesan: (document.getElementById('psgIdentityRestoreStatus') || {}).textContent || '', form: !!(document.getElementById('psgIdentityEmail') && document.getElementById('psgIdentityEmail').offsetParent), err: !!(document.getElementById('psgIdentityRestoreStatus') && document.getElementById('psgIdentityRestoreStatus').classList.contains('psg-identity-restore-error')) })).catch(() => null);
    if (s) { gerbang = s; if (s.dash || s.form || s.err) { buka = s.dash; break; } }
    await jeda(250);
  }
  const ms = Date.now() - t0;
  let pulihMs = null;
  if (pasca && buka) { MODE.server = 'normal'; w.gantung = false; w.tolakIdentity = false; w.tolakMe = null; const t1 = Date.now(); while (Date.now() - t1 < pasca) { const off = await pg.evaluate(() => !!(window.PSGOffline && window.PSGOffline.aktif)).catch(() => true); if (!off) { pulihMs = Date.now() - t1; break; } await jeda(500); } }
  const jejak = await pg.evaluate(() => ({ dcl: window.__dcl, load: window.__load, gerbang: window.__gerbang, f: window.__jejak })).catch(() => null);
  const r = { skenario: nama, dashboard: buka, ms, mode: gerbang && gerbang.off ? 'offline' : 'normal', akhir: gerbang && (gerbang.form ? 'form-login' : (gerbang.err ? 'pesan-tertutup: ' : '') + (gerbang.pesan || '').trim().slice(0, 70)), minta: log.filter((x) => x.ev === 'minta').length, galat: err.length, pulihMs };
  r.dcl = jejak && jejak.dcl; r.load = jejak && jejak.load; r.gerbang = jejak && jejak.gerbang; if (process.env.RINCI) r.fetch = jejak && jejak.f;
  hasil.push(r); console.log(JSON.stringify(r));
  await pg.close().catch(() => {});
  MODE.server = 'normal'; w.gantung = false; w.tolakIdentity = false; w.tolakMe = null; if (putusCepat) await ctx.setOffline(false);
  return r;
}
async function siapkan(br, { sw = true, umur = 12000, expDtk = 70, sebelumTutup = null, ctx: ctxOpsi = null } = {}) {
  const { ctx, pg, w, err } = await konteks(br, { sw, ctx: ctxOpsi }); w.expDtk = expDtk; const base = 'http://127.0.0.1:' + server.address().port + '/';
  await login(pg, base); if (sw) await siapOffline(pg); if (umur) await jeda(umur); if (sebelumTutup) await pg.evaluate(sebelumTutup); await pg.close();
  return { ctx, w, base };
}
async function main() {
  const { chromium } = loadPlaywright(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const br = await chromium.launch({ headless: true });
  try {
    if (mau('online')) { const { ctx, w, base } = await siapkan(br); await ukur('1-online (SW siap, sesi valid)', ctx, w, {}, base); await ctx.close(); }
    if (mau('putus')) { const { ctx, w, base } = await siapkan(br); await ukur('2-offline putus cepat (seperti mode pesawat HP), token kedaluwarsa', ctx, w, { putusCepat: true }, base); await ctx.close(); }
    if (mau('putus-valid')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600 }); await ukur('2b-offline putus cepat, token VALID 1 jam', ctx, w, { putusCepat: true }, base); await ctx.close(); }
    if (mau('gantung')) { const { ctx, w, base } = await siapkan(br); await ukur('3-offline GANTUNG (Wi-Fi tanpa internet, onLine=true), token kedaluwarsa', ctx, w, { gantung: true }, base); await ctx.close(); }
    if (mau('gantung-valid')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600 }); await ukur('3b-offline GANTUNG, token VALID 1 jam', ctx, w, { gantung: true }, base); await ctx.close(); }
    if (mau('logout-gantung')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600, sebelumTutup: () => { localStorage.removeItem('psg.offline.v1'); localStorage.setItem('psg.keluar.v1', JSON.stringify({ t: Date.now(), belumTerkonfirmasi: true })); } }); await ukur('4-offline GANTUNG setelah logout (tanda logout tertunda)', ctx, w, { gantung: true }, base); await ctx.close(); }
    if (mau('logout-putus')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600, sebelumTutup: () => { localStorage.removeItem('psg.offline.v1'); localStorage.setItem('psg.keluar.v1', JSON.stringify({ t: Date.now(), belumTerkonfirmasi: true })); } }); await ukur('4b-offline putus cepat setelah logout', ctx, w, { putusCepat: true }, base); await ctx.close(); }
    if (mau('kedaluwarsa')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600, sebelumTutup: () => { const r = JSON.parse(localStorage.getItem('psg.offline.v1')); r.t -= 15 * 864e5; r.lihat = r.t; localStorage.setItem('psg.offline.v1', JSON.stringify(r)); } }); await ukur('5-offline GANTUNG, masa 14 hari habis', ctx, w, { gantung: true }, base); await ctx.close(); }
    if (mau('kedaluwarsa-putus')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600, sebelumTutup: () => { const r = JSON.parse(localStorage.getItem('psg.offline.v1')); r.t -= 15 * 864e5; r.lihat = r.t; localStorage.setItem('psg.offline.v1', JSON.stringify(r)); } }); await ukur('5b-offline putus cepat, masa 14 hari habis', ctx, w, { putusCepat: true }, base); await ctx.close(); }
    if (mau('tanpa-catatan')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600, sebelumTutup: () => { localStorage.removeItem('psg.offline.v1'); } }); await ukur('6-offline GANTUNG, tanpa catatan offline (sesi lokal ada)', ctx, w, { gantung: true }, base); await ctx.close(); }
    if (mau('pulih')) { const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600 }); await ukur('7-buka offline GANTUNG lalu koneksi pulih (tanpa event online)', ctx, w, { gantung: true, pasca: 150000 }, base); await ctx.close(); }
    if (mau('hp')) { // HP: emulasi viewport/touch Chromium; jaringan putus cepat. SIMULASI, bukan perangkat nyata.
      const { ctx, w, base } = await siapkan(br, { umur: 0, expDtk: 3600, ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } });
      await ukur('8-HP (emulasi) offline putus cepat', ctx, w, { putusCepat: true }, base); await ctx.close(); }
  } finally { await br.close(); for (const r of tertahan) try { r.destroy(); } catch (_) {} server.close(); }
  console.log('\nRINGKASAN'); for (const r of hasil) console.log((r.ms / 1000).toFixed(1).padStart(7) + ' dtk  ' + (r.dashboard ? 'dashboard' : 'TIDAK BUKA') + '  ' + r.skenario + '  [' + r.mode + ', minta=' + r.minta + ']');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
