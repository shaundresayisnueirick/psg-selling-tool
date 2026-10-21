#!/usr/bin/env node
'use strict';
/* Browser targeted check for the actual app header and information dialog.
   node tests/psg-informasi-browser.test.js --browser <Edge-or-Chrome-path> */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
function loadPlaywright() {
  for (const m of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) { try { return require(m); } catch (_) {} }
  throw new Error('Playwright tidak tersedia; NODE_PATH perlu diarahkan ke runtime Playwright.');
}
const args = process.argv.slice(2); const arg = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const root = path.resolve(__dirname, '..'); const browserPath = arg('--browser');
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', webmanifest: 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let target = decodeURIComponent((req.url || '/').split(/[?#]/)[0]); if (target.endsWith('/')) target += 'index.html';
  const file = path.resolve(root, '.' + target);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(file).pipe(res);
});
let checks = 0; function check(ok, title) { if (!ok) throw new Error('FAIL ' + (++checks) + '. ' + title); console.log('PASS ' + (++checks) + '. ' + title); }
async function main() {
  const { chromium } = loadPlaywright(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath, headless: true } : { headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' }); const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await context.route('**/src/vendor/netlify-identity.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `window.PSGNetlifyIdentity={login:async()=>({}),logout:async()=>{},requestPasswordRecovery:async()=>{},getUser:async()=>({id:'owner-1111',email:'owner@psg.test'})};` }));
    let role = 'psg_owner';
    await context.route('**/api/psg/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: 'owner-1111', email: 'owner@psg.test', nama: 'Owner Uji', roles: role ? [role] : [], level: role ? null : 'FC', kodeAgen: 'TEST001', status: 'aktif', emailTerkonfirmasi: true } }) }));
    await context.route('**/api/psg/informasi**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, informasi: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', judul: 'Training Oktober', kategori: 'Training', tanggal: '2026-10-15', isi: 'Materi training anggota.', status: 'published', lampiran: [] }] }) }));
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.InsuranceHubIdentity && window.InsuranceHubIdentity.source === 'server:/api/psg/me');
    const bell = page.locator('#btnPsgInformasi'); check(await bell.isVisible(), 'ikon lonceng tampil di header desktop');
    const box = await bell.boundingBox(); check(Boolean(box && box.x >= 0 && box.x + box.width <= 1365), 'ikon berada di dalam lebar header desktop');
    await bell.click(); check(await page.locator('#psgInformasiDialog').evaluate((d) => d.open), 'klik lonceng membuka dialog');
    check(await page.locator('#psgInformasiDetail').isHidden(), 'membuka lonceng hanya menampilkan daftar; detail tidak terbuka otomatis');
    check(await page.locator('#psgInformasiCategories button').count() === 5, 'empat kategori tersedia bersama filter Semua');
    check(await page.locator('#psgInformasiAdmin').isVisible(), 'form kelola terlihat bagi PSG Owner');
    await page.getByRole('button', { name: 'Training', exact: true }).click();
    check(await page.locator('#psgInformasiList').getByText('Training Oktober').isVisible(), 'informasi terbit tampil setelah memilih kategori');
    await page.locator('#psgInformasiList').getByText('Training Oktober').click();
    check(await page.locator('#psgInformasiDetail').getByText('Materi training anggota.').isVisible(), 'klik item membuka detail informasi');
    const kembali = page.getByRole('button', { name: /Kembali ke daftar pengumuman/ });
    check(await kembali.isVisible() && await page.locator('#psgInformasiList').isHidden() && await page.locator('#psgInformasiCategories').isHidden(), 'detail: daftar disembunyikan dan tombol kembali tersedia');
    check(await page.locator('#psgInformasiDetail h3').textContent() === 'Training Oktober', 'detail menampilkan judul yang dipilih');
    await kembali.click();
    check(await page.locator('#psgInformasiList').isVisible() && await page.locator('#psgInformasiDetail').isHidden(), 'kembali: daftar tampil lagi, detail tertutup');
    check(await page.locator('#psgInformasiCategories button[aria-pressed="true"]').textContent() === 'Training', 'kembali: filter kategori yang aktif dipertahankan');
    check(await page.evaluate(() => document.getElementById('psgInformasiDialog').open), 'kembali ke daftar tidak menutup dialog lonceng');
    check(await page.locator('#psgInformasiList .psg-informasi-item').first().evaluate((e) => !e.textContent.includes('Materi training anggota.')), 'daftar hanya memuat judul/meta, bukan isi lengkap');
    await page.setViewportSize({ width: 360, height: 780 });
    check(await bell.isVisible(), 'ikon lonceng tetap tampil pada viewport HP');
    const mobileBox = await bell.boundingBox(); check(Boolean(mobileBox && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= 360), 'ikon tidak overflow pada viewport HP');
    check(errors.length === 0, 'tidak ada JavaScript error pada alur desktop/HP: ' + errors.join(' | '));
    role = '';
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.InsuranceHubIdentity?.source === 'server:/api/psg/me');
    await bell.click(); check(await page.locator('#psgInformasiAdmin').isHidden(), 'form kelola tersembunyi bagi anggota biasa');
    await context.close();
  } finally { await browser.close(); server.close(); }
  console.log('\nLULUS ' + checks + '/' + checks);
}
main().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
