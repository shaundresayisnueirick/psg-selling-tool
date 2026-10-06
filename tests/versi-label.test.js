#!/usr/bin/env node
/* Label versi yang terlihat agen: halaman login dan kaki dashboard (Beranda)
   harus menampilkan versi yang sama dari src/app-version.js.

   node tests/versi-label.test.js [--browser <chromium-or-edge-exe>] [--root <dir>]
   Playwright is optional; exit 2 means the browser dependency is unavailable.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

function loadPlaywright() {
  const tries = ['playwright'];
  if (process.env.NODE_PATH) tries.push(path.join(process.env.NODE_PATH, 'playwright'));
  for (const p of tries) { try { return require(p); } catch (_) {} }
  console.log('Playwright tidak tersedia — test targeted dilewati.');
  process.exit(2);
}
const { chromium } = loadPlaywright();
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const ROOT = path.resolve(option('--root') || path.join(__dirname, '..'));
const browserExe = option('--browser') || undefined;
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', webp: 'image/webp',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
const VERSI = 'v1.6';
const LABEL = 'Aplikasi Web ' + VERSI;
let gagal = 0;
function cek(ok, pesan, detail) {
  console.log((ok ? '  OK    ' : '  GAGAL ') + pesan + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) gagal++;
}
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(ROOT, '.' + rel);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}
const accessInit = () => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {} };

/* Membaca badge versi: teks, terlihat, dan tetap di dalam layar setelah digulir. */
async function bacaBadge(pg, id) {
  await pg.waitForFunction((i) => { const n = document.getElementById(i); return !!(n && n.textContent.trim()); }, id, { timeout: 10000 });
  return pg.evaluate((i) => {
    const n = document.getElementById(i);
    n.scrollIntoView({ block: 'center' });
    const r = n.getBoundingClientRect(), gaya = getComputedStyle(n);
    return { teks: n.textContent.trim(), terlihat: r.width > 0 && r.height > 0 && gaya.visibility !== 'hidden' && gaya.display !== 'none' &&
      r.top >= 0 && r.bottom <= innerHeight };
  }, id);
}

(async () => {
  console.log('[S] Sumber versi');
  const sumber = fs.readFileSync(path.join(ROOT, 'src/app-version.js'), 'utf8');
  cek(sumber.includes("window.PSG_APP_VERSION = '" + VERSI + "';") && sumber.includes("window.PSG_APP_VERSION_LABEL = '" + LABEL + "';"),
    'src/app-version.js: PSG_APP_VERSION ' + VERSI + ' dan label "' + LABEL + '"');
  cek(!/v1\.5\b/.test(sumber), 'src/app-version.js: tidak ada sisa v1.5');

  const srv = await serve();
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await chromium.launch({ executablePath: browserExe });
  const hasil = {};
  for (const [nama, ukuran] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    console.log('[L] Login + dashboard — ' + nama);
    const errors = [];

    const ctxLogin = await br.newContext({ viewport: ukuran, serviceWorkers: 'block' });
    const pgLogin = await ctxLogin.newPage();
    pgLogin.on('pageerror', (e) => errors.push(String(e)));
    await pgLogin.goto(url);
    await pgLogin.waitForSelector('#psgVersiLogin', { state: 'attached', timeout: 10000 });
    const login = await bacaBadge(pgLogin, 'psgVersiLogin');
    cek(login.teks === LABEL && login.terlihat, nama + ': halaman login menampilkan "' + LABEL + '"', login);
    await ctxLogin.close();

    const ctxApp = await br.newContext({ viewport: ukuran, serviceWorkers: 'block' });
    await ctxApp.addInitScript(accessInit);
    const pgApp = await ctxApp.newPage();
    pgApp.on('pageerror', (e) => errors.push(String(e)));
    await pgApp.goto(url);
    await pgApp.waitForFunction(() => !!window.bukaLayar);
    const dashboard = await bacaBadge(pgApp, 'psgVersiApp');
    const diBeranda = await pgApp.evaluate(() => {
      const n = document.getElementById('psgVersiApp');
      return { aktif: !!document.querySelector('#layarProduk.aktif'), tanpaLogin: !document.getElementById('psgVersiLogin') ||
        !document.getElementById('psgVersiLogin').getClientRects().length, teksKaki: n.closest('p').textContent.replace(/\s+/g, ' ').trim() };
    });
    cek(dashboard.teks === LABEL && dashboard.terlihat && diBeranda.aktif && diBeranda.tanpaLogin,
      nama + ': kaki dashboard (Beranda) menampilkan "' + LABEL + '"', { dashboard, diBeranda });
    cek(login.teks === dashboard.teks, nama + ': login dan dashboard menampilkan versi yang sama', { login: login.teks, dashboard: dashboard.teks });
    cek(!errors.length, nama + ': tanpa error halaman', errors);
    hasil[nama] = { login: login.teks, dashboard: dashboard.teks, kaki: diBeranda.teksKaki };
    await ctxApp.close();
  }
  await br.close(); srv.close();
  console.log(JSON.stringify(hasil));
  console.log(gagal ? 'HASIL: GAGAL (' + gagal + ')' : 'HASIL: SEMUA LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
