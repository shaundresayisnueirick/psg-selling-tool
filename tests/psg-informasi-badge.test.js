#!/usr/bin/env node
'use strict';
/* Badge angka belum dibaca pada lonceng Pusat Informasi: logika server asli
   (netlify/lib/psg-informasi.mts) dengan penyimpanan memori; sesi Identity
   ditiru. node tests/psg-informasi-badge.test.js */
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const { pathToFileURL } = require('node:url');
function loadPlaywright() { for (const m of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) { try { return require(m); } catch (_) {} } throw new Error('Playwright tidak tersedia'); }
const root = path.resolve(__dirname, '..');
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp' };
const server = http.createServer((req, res) => {
  let t = decodeURIComponent((req.url || '/').split(/[?#]/)[0]); if (t.endsWith('/')) t += 'index.html';
  const f = path.resolve(root, '.' + t);
  if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(f).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
let n = 0; const check = (ok, t, d) => { if (!ok) throw new Error('FAIL ' + (++n) + '. ' + t + (d ? ' — ' + JSON.stringify(d) : '')); console.log('PASS ' + (++n) + '. ' + t); };
const AKUN = {
  A: { id: 'a0000000-0000-4000-8000-00000000000a', email: 'a@psg.test' }, B: { id: 'b0000000-0000-4000-8000-00000000000b', email: 'b@psg.test' },
  OWNER: { id: 'c0000000-0000-4000-8000-00000000000c', email: 'owner@psg.test', roles: ['psg_owner'] },
};
async function main() {
  const lib = await import(pathToFileURL(path.join(root, 'netlify/lib/psg-informasi.mts')).href);
  const data = new Map(); let seq = 0, pakai = 'A';
  const toko = { get: async (k, o) => (data.has(k) ? (o.type === 'json' ? structuredClone(data.get(k)) : data.get(k)) : null), setJSON: async (k, v) => { data.set(k, structuredClone(v)); }, set: async (k, v) => { data.set(k, v); }, delete: async (k) => { data.delete(k); }, list: async (o) => ({ blobs: [...data.keys()].filter((k) => k.startsWith(o.prefix)).map((key) => ({ key })) }) };
  const tambah = (judul, status, tgl) => { const id = 'f000000' + (seq++) + '-0000-4000-8000-000000000000'; data.set('informasi/' + id + '.json', { id, judul, kategori: 'Memo', tanggal: tgl || '2026-10-15', isi: 'Isi ' + judul, status, lampiran: [], dibuat: new Date().toISOString(), diperbarui: new Date().toISOString() }); return id; };
  const { chromium } = loadPlaywright(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' }); const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await ctx.route('**/src/vendor/netlify-identity.js', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.PSGNetlifyIdentity={login:async()=>({}),logout:async()=>{},requestPasswordRecovery:async()=>{},getUser:async()=>({id:"x"})};' }));
    const akun = () => AKUN[pakai];
    await ctx.route('**/api/psg/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: akun().id, email: akun().email, nama: 'Uji', roles: akun().roles || [], level: 'FC', kodeAgen: 'U1', status: 'aktif', emailTerkonfirmasi: true } }) }));
    await ctx.route('**/api/psg/informasi**', async (route) => {
      const rq = route.request(); const h = await rq.allHeaders(); const a = akun();
      const req = new Request(rq.url(), { method: rq.method(), headers: { ...h, origin: new URL(rq.url()).origin, 'sec-fetch-site': 'same-origin' }, body: /^(GET|HEAD)$/.test(rq.method()) ? undefined : (rq.postData() || '') });
      const res = await lib.tanganiInformasi(req, { ambilUser: async () => ({ id: a.id, email: a.email, confirmedAt: '2026-01-01', appMetadata: { roles: a.roles || [], psg: { level: 'FC', status: 'aktif' } } }), toko: () => toko, namaStore: 'x' });
      const hdr = {}; res.headers.forEach((v, k) => { hdr[k] = v; }); return route.fulfill({ status: res.status, headers: hdr, body: await res.text() });
    });
    const i1 = tambah('Info Satu', 'published', '2026-10-13'), i2 = tambah('Info Dua', 'published', '2026-10-14'), i3 = tambah('Info Tiga', 'published', '2026-10-15');
    tambah('Draf Rahasia', 'draft'); tambah('Arsip Lama', 'archived');
    const url = 'http://127.0.0.1:' + server.address().port + '/';
    const badge = page.locator('#psgInformasiBadge');
    const muat = async () => { await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction((e) => window.InsuranceHubIdentity?.email === e, akun().email); await page.waitForTimeout(500); };
    const teks = async () => ((await badge.isVisible()) ? (await badge.textContent()).trim() : '');
    await muat();
    check(await teks() === '3', 'badge angka = jumlah Published belum dibaca (Draft/Archived tidak dihitung)', await teks());
    check(await page.evaluate(() => !document.querySelector('#btnPsgInformasi .dot, #btnPsgInformasi [class*="titik"]')), 'tidak ada titik merah terpisah');
    await page.locator('#btnPsgInformasi').click();
    await page.waitForSelector('#psgInformasiList .psg-informasi-item');
    check(await teks() === '3', 'membuka panel lonceng tidak menandai dibaca (detail item pertama tampil otomatis)');
    await page.locator('#psgInformasiList').getByText('Info Dua').click();
    await page.waitForFunction(() => document.getElementById('psgInformasiBadge').textContent === '2');
    check(await teks() === '2', 'klik satu informasi: badge berkurang 1');
    await page.locator('#psgInformasiList').getByText('Info Dua').click(); await page.waitForTimeout(300);
    check(await teks() === '2', 'membuka lagi yang sama tidak mengurangi lagi');
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.InsuranceHubIdentity); await page.waitForTimeout(500);
    check(await teks() === '2', 'refresh halaman: status baca bertahan (2)');
    await page.locator('#btnPsgInformasi').click(); await page.waitForSelector('#psgInformasiList .psg-informasi-item');
    await page.locator('#psgInformasiList').getByText('Info Satu').click(); await page.locator('#psgInformasiList').getByText('Info Tiga').click();
    await page.waitForFunction(() => document.getElementById('psgInformasiBadge').hidden);
    check(!(await badge.isVisible()), 'semua sudah dibaca: badge hilang');
    await page.locator('[data-pi-close]').first().click();
    tambah('Info Empat', 'published', '2026-10-16');
    await page.evaluate(() => window.dispatchEvent(new Event('psg:identity-ready'))); await page.waitForFunction(() => document.getElementById('psgInformasiBadge').textContent === '1');
    check(await teks() === '1', 'publikasi baru: badge muncul lagi dengan angka 1');
    await muat();
    check(await teks() === '1', 'login ulang/refresh: yang lama tidak muncul lagi, hanya yang baru (1)');
    pakai = 'B'; await muat();
    check(await teks() === '4', 'anggota lain: status baca terpisah (4 belum dibaca)');
    pakai = 'A'; await muat();
    check(await teks() === '1', 'kembali ke anggota pertama: status bacanya utuh (1)');
    check(errors.length === 0, 'tidak ada JavaScript error: ' + errors.join(' | '));
    await ctx.close();
  } finally { await browser.close(); server.close(); }
  console.log('\nLULUS ' + n + '/' + n);
}
main().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
