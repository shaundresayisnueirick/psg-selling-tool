#!/usr/bin/env node
'use strict';
/* Kartu Konsultan: foto profil akun aktif dan auto-fill Nomor HP Identitas
   Agen — tes browser (Playwright).

   Foto: foto yang diunggah di halaman depan / Identitas Agen dipakai Kartu
   Konsultan, Preview/cetak, Ringkasan 1 Halaman, snapshot Library baru, dan
   program-summary.html. Selama sesi Identity belum siap tampil placeholder,
   tidak pernah foto global lama. Login kode akses lama tetap memakai foto
   lama. Mode "Dibuat untuk agen lain" tetap memakai foto agen tersebut.

   Nomor HP: nomor yang disimpan di Aktivitas & Poin → Identitas Agen
   (insuranceHub.agen.v1.hp) mengisi WhatsApp Kartu Konsultan tanpa refresh,
   mengalahkan WhatsApp lama di Kartu Konsultan akun itu, ikut ke QR,
   cetak, dan Library; "Pulihkan identitas saya" tidak menghapusnya.

   /api/psg/pribadi dijawab logika server asli dengan Blobs tiruan, supaya
   Pesan Personal ikut diperiksa tidak terhapus saat Kartu dirender ulang.

     node tests/kartu-konsultan-foto-hp.test.js [--root <dir>] [--browser <path>] */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');

function loadPlaywright() {
  for (const item of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) {
    try { return require(item); } catch (_) {}
  }
  console.error('Playwright tidak tersedia; tes browser tidak dijalankan.');
  process.exit(2);
}

const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const root = path.resolve(arg('--root') || path.join(__dirname, '..'));
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', webmanifest: 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let target = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  if (target.endsWith('/')) target += 'index.html';
  const file = path.resolve(root, '.' + target);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

let checks = 0; const failures = [];
const check = (ok, message, detail) => {
  checks++;
  console.log((ok ? 'PASS ' : 'FAIL ') + checks + '. ' + message + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 700)));
  if (!ok) failures.push(message);
};

function akun(id, email, nama) {
  return {
    me: { id, email, nama, roles: [], level: 'FC', kodeAgen: '6800' + id.slice(0, 4), status: 'aktif', emailTerkonfirmasi: true },
    user: { id, email, confirmedAt: '2026-01-01T00:00:00Z', name: nama, appMetadata: { roles: [], psg: { level: 'FC', status: 'aktif', nama } }, userMetadata: {} }
  };
}
const A = akun('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'agen.a@psg.test', 'Agen Alfa');
const B = akun('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'agen.b@psg.test', 'Agen Beta');
const kunciFoto = (email) => 'insuranceHub.agen.foto.identity.v1.' + encodeURIComponent(email);
/* Bentuk cookie nf_jwt seperti @netlify/identity: header.payload.tanda. */
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (a) => b64u({ alg: 'HS256', typ: 'JWT' }) + '.' + b64u({ sub: a.me.id, email: a.me.email, exp: 4102444800 }) + '.tanda-uji';

const FOTO_LAMA = 'data:image/png;base64,FOTO-GLOBAL-LAMA-PSG-TEAM';
const FOTO_ITEM_LAMA = 'data:image/png;base64,FOTO-SNAPSHOT-LIBRARY-LAMA';
const FOTO_AGEN_LAIN = 'data:image/png;base64,FOTO-AGEN-YANG-DIBANTU';
const PNG_MERAH = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
const PNG_BIRU = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64');

const HP_LAMA = '081100000001';            // WhatsApp lama di insuranceHub.konsultan.v1
const PROFIL = { id: 'fx-foto-01', nama: 'Prospek Foto', tglLahir: '1985-03-14', jk: 'PRIA', status: 'Belum menikah',
  family: [{ id: 'self', nama: 'Prospek Foto', tglLahir: '1985-03-14', jk: 'PRIA', hubungan: 'Diri Sendiri' }], children: [] };
const KONSULTAN = { nama: 'Konsultan Uji', jabatan: 'Financial Consultant', whatsapp: HP_LAMA, email: 'konsultan@psg.test', instagram: 'konsultan.uji', qr: 'YA' };
const ITEM_LAMA = { id: 'IL-foto-lama', title: 'Ilustrasi lama', product: 'Cristal Prime', productCode: 'CRIS', screenKey: 'CRIS_ILUS',
  customerName: 'Prospek Foto', profileId: PROFIL.id, relationship: 'Diri Sendiri', insuredPersonId: 'self', category: 'Ilustrasi',
  familyName: 'Prospek Foto', createdAt: '2026-05-01T08:00:00.000Z', html: '<div class="blok"><h2>Ilustrasi lama</h2><p>Isi tersimpan.</p></div>',
  konsultan: { nama: 'Konsultan Lama', jabatan: 'Financial Consultant', whatsapp: '081900000009', email: '', instagram: '', tiktok: '', facebook: '', linkedin: '', youtube: '', qr: 'TIDAK', foto: FOTO_ITEM_LAMA } };
const PESAN_A = 'Melindungi keluarga adalah komitmen pribadi saya.';

async function main() {
  const lib = await import(pathToFileURL(path.join(root, 'netlify/lib/psg-pribadi.mts')).href);
  const { chromium } = loadPlaywright();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browserPath = arg('--browser');
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const pageErrors = [];

  const store = new Map();
  const toko = { async get(k) { return store.has(k) ? JSON.parse(store.get(k)) : null; }, async setJSON(k, v) { store.set(k, JSON.stringify(v)); }, async delete(k) { store.delete(k); }, async list() { return { blobs: [...store.keys()].map((key) => ({ key })) }; } };
  let sesi = null;
  let tundaMe = 0;

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('dialog', (d) => d.accept());

  await context.addInitScript(({ profil, konsultan, itemLama, fotoLama, emailA }) => {
    try {
      sessionStorage.setItem('insuranceHub.access.v3', 'ok');
      if (!localStorage.getItem('uji.disemai')) {
        localStorage.clear();
        localStorage.setItem('insuranceHub.customerProfiles.v1', JSON.stringify([profil]));
        localStorage.setItem('insuranceHub.customerProfile.active.v1', profil.id);
        localStorage.setItem('insuranceHub.level.v1', JSON.stringify({ level: 'FC', nama: 'Financial Consultant', namaAgen: 'PSG TEAM', kodeAgen: '68000001' }));
        localStorage.setItem('insuranceHub.agen.v1', JSON.stringify({ nama: 'PSG TEAM', kode: '68000001', hp: '' }));
        localStorage.setItem('insuranceHub.agen.foto.v1', fotoLama);
        localStorage.setItem('insuranceHub.konsultan.v1', JSON.stringify(konsultan));
        /* Kartu Konsultan akun A sendiri (catatan per email) dengan WhatsApp
           lama; key lama di atas hanya untuk login kode akses lama. */
        localStorage.setItem('insuranceHub.identitas.akun.v1.' + encodeURIComponent(emailA), JSON.stringify({ konsultan }));
        localStorage.setItem('insuranceHub.libraryIlustrasi.v1', JSON.stringify([itemLama]));
        localStorage.setItem('uji.disemai', '1');
      }
    } catch (_) {}
  }, { profil: PROFIL, konsultan: KONSULTAN, itemLama: ITEM_LAMA, fotoLama: FOTO_LAMA, emailA: A.me.email });

  await context.route('**/src/vendor/netlify-identity.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
    window.PSGNetlifyIdentity = { login: async () => ({}), logout: async () => {}, requestPasswordRecovery: async () => {},
      getUser: async () => (window.__ujiSesi || null) };` }));
  await context.route('**/api/psg/me', async (route) => { if (tundaMe) await new Promise((r) => setTimeout(r, tundaMe)); return sesi
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: sesi.me }) })
    : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ authenticated: false }) }); });
  await context.route('**/api/psg/pribadi**', async (route) => {
    const rq = route.request();
    const h = await rq.allHeaders();
    const headers = {}; for (const [k, v] of Object.entries(h)) if (!/^(content-length|connection|accept-encoding)$/i.test(k) && !k.startsWith(':')) headers[k] = v;
    const req = new Request(rq.url(), { method: rq.method(), headers, body: /^(GET|HEAD)$/.test(rq.method()) ? undefined : (rq.postData() || '') });
    const r = await lib.tanganiPribadi(req, { ambilUser: async () => (sesi ? sesi.user : null), toko: () => toko, namaStore: lib.STORE_PREVIEW, cekKonfirmasi: async () => 'ya' });
    const hdr = {}; r.headers.forEach((v, k) => { hdr[k] = v; });
    return route.fulfill({ status: r.status, headers: hdr, body: await r.text() });
  });

  const masuk = async (a) => {
    sesi = a;
    if (a) await context.addCookies([{ name: 'nf_jwt', value: jwt(a), url: base }]);
    else await context.clearCookies();
    await context.addInitScript((s) => { window.__ujiSesi = s; }, a ? { id: a.me.id, email: a.me.email } : null);
  };
  const siap = async (email) => {
    await page.waitForFunction(() => window.InsuranceHubNavigation && window.InsuranceHubConsultantCard && !document.getElementById('insuranceAccessGate'));
    if (email) await page.waitForFunction((e) => window.InsuranceHubIdentity?.email === e && window.InsuranceHubPesanPersonal?.status() === 'siap', email);
    await page.waitForTimeout(400);
  };
  const buka = async (layar, id) => {
    await page.evaluate((l) => window.InsuranceHubNavigation.bukaLayar(l), layar);
    await page.waitForFunction((x) => document.getElementById(x).classList.contains('aktif'), id);
    await page.waitForTimeout(350);
  };
  const bukaIdentitas = () => buka('KARTU_KONSULTAN', 'layarKartuKonsultan');
  const kartu = () => page.evaluate(() => {
    const pv = document.getElementById('kartuKonsultanPreview');
    const img = pv.querySelector('.kk-avatar img');
    const wa = [...pv.querySelectorAll('.kk-socials a')].find((x) => /WhatsApp/.test(x.textContent));
    const qr = pv.querySelector('img.kk-qr');
    const r = window.InsuranceHubConsultantCard.read();
    return { foto: img ? img.getAttribute('src') : null, ikon: !!pv.querySelector('.kk-avatar span'),
      wa: document.getElementById('kkWhatsApp').value, waLink: wa ? wa.getAttribute('href') : null, qr: qr ? qr.getAttribute('src') : null,
      email: document.getElementById('kkEmail').value, nama: document.getElementById('kkNama').value,
      instagram: document.getElementById('kkInstagram').value, pesan: document.getElementById('kkPesan')?.value ?? null,
      readWa: r.whatsapp, readFoto: r.foto, readAtasNama: !!r.atasNama };
  });
  /* Data identitas akun A (catatan per email). */
  const lokal = () => page.evaluate((k) => { const akun = JSON.parse(localStorage.getItem(k.akunA) || '{}'); return {
    agen: akun.agen || {},
    konsultan: akun.konsultan || null,
    atasNama: akun.atasNama || {},
    fotoLama: localStorage.getItem('insuranceHub.agen.foto.v1'),
    fotoA: localStorage.getItem(k.a), fotoB: localStorage.getItem(k.b),
    kunci: Object.keys(localStorage).sort()
  }; }, { a: kunciFoto(A.me.email), b: kunciFoto(B.me.email), akunA: 'insuranceHub.identitas.akun.v1.' + encodeURIComponent(A.me.email) });
  const cetak = (sel) => page.evaluate((s) => {
    window.dispatchEvent(new Event('beforeprint'));
    const n = document.querySelector(s + ' .psg-consultant-print');
    const img = n && n.querySelector('img.psg-consultant-photo');
    const hasil = n ? { ada: true, foto: img ? img.getAttribute('src') : null, teks: n.textContent } : { ada: false };
    window.dispatchEvent(new Event('afterprint'));
    return hasil;
  }, sel);
  const unggahFoto = async (png) => {
    await buka('PRODUK', 'layarProduk');
    await page.setInputFiles('#fotoAgen', { name: 'foto.png', mimeType: 'image/png', buffer: png });
  };
  const simpanHpAktivitas = async (nilai) => {
    await buka('AKTIVITAS', 'layarAktivitas');
    await page.waitForSelector('#aktAgenHp');
    await page.fill('#aktAgenHp', nilai);
    await page.click(await page.$('#aktSimpanHp') ? '#aktSimpanHp' : '#aktSimpanAgen');
    await page.waitForTimeout(250);
  };
  const simpanLibrary = async () => {
    await buka('CRIS_ILUS', 'layarCRISIlus');
    const n = await page.evaluate(() => window.InsuranceHubLibrary.read().length);
    await page.click('#layarCRISIlus .btn-simpan-library');
    await page.waitForFunction((x) => window.InsuranceHubLibrary.read().length > x, n);
    return page.evaluate(() => window.InsuranceHubLibrary.read()[0]);
  };
  const ringkasan = async (id) => {
    await buka('LIBRARY_ILUSTRASI', 'layarLibraryIlustrasi');
    await page.click('.library-batch-toggle[data-id="' + id + '"]');
    await page.click('#libOnePageSummary'); await page.waitForSelector('#libraryOnePageModal');
    const r = await page.evaluate(() => { const i = document.querySelector('#libraryOnePageModal .summary-consultant img'); return i ? i.getAttribute('src') : null; });
    await page.evaluate(() => document.getElementById('summaryClose').click());
    await page.click('.library-batch-toggle[data-id="' + id + '"]');
    return r;
  };
  const lihatItem = async (id) => {
    await buka('LIBRARY_ILUSTRASI', 'layarLibraryIlustrasi');
    await page.click('.lib-view[data-id="' + id + '"]'); await page.waitForSelector('#libraryDetailModal');
    const r = await cetak('[data-psg-preview-source]');
    await page.evaluate(() => { const m = document.getElementById('libraryDetailModal'); const x = m && [...m.querySelectorAll('button')].find((y) => /tutup|✕/i.test(y.textContent)); if (x) x.click(); });
    return r;
  };

  try {
    /* ---------- Login kode akses lama ---------- */
    console.log('\n## Login kode akses lama');
    await masuk(null);
    await page.goto(base + 'index.html', { waitUntil: 'load' }); await siap();
    await bukaIdentitas();
    let k = await kartu();
    check(k.foto === FOTO_LAMA, '10. kode akses lama: Kartu Konsultan tetap memakai foto profil lama', k.foto && k.foto.slice(0, 60));
    await simpanHpAktivitas('0812-7777-0001');
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === '081277770001' && k.readWa === '081277770001', '11/12. kode akses lama: HP dari Simpan identitas (aktSimpanAgen) mengisi WhatsApp tanpa refresh dan mengalahkan WhatsApp lama', k);
    await page.evaluate(() => localStorage.setItem('insuranceHub.agen.v1', JSON.stringify({ nama: 'PSG TEAM', kode: '68000001', hp: '' })));

    /* ---------- Akun A: sesi dipulihkan ---------- */
    console.log('\n## Akun A: pemulihan sesi Identity');
    tundaMe = 2500;
    await masuk(A);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.InsuranceHubConsultantCard && document.getElementById('kartuKonsultanPreview')?.innerHTML);
    k = await kartu();
    check(k.foto === null && k.ikon, '2. sesi Identity belum siap: placeholder, bukan foto global lama', k.foto && k.foto.slice(0, 60));
    const cetakMenunggu = await page.evaluate(() => { const c = window.InsuranceHubConsultantCard.read(); return { foto: c.foto }; });
    check(!cetakMenunggu.foto || cetakMenunggu.foto !== FOTO_LAMA, '2. sesi belum siap: identitas cetak tidak membawa foto global lama', cetakMenunggu.foto && cetakMenunggu.foto.slice(0, 40));
    await siap(A.me.email);
    tundaMe = 0;
    await bukaIdentitas();
    k = await kartu();
    check(k.foto === null && k.ikon, '9. akun A belum punya foto: placeholder, foto global lama tidak dipakai', k.foto && k.foto.slice(0, 60));

    /* Pesan Personal dan draf formulir yang belum disimpan. */
    await page.fill('#kkPesan', PESAN_A); await page.click('#kkSimpan');
    await page.waitForFunction((t) => window.InsuranceHubPesanPersonal.teks() === t, PESAN_A);
    await page.fill('#kkEmail', 'draf.belum.disimpan@psg.test');

    /* ---------- Foto ---------- */
    console.log('\n## Foto profil');
    let jumlahEvent = 0;
    await page.exposeFunction('__hitungEventFoto', () => { jumlahEvent++; });
    await page.evaluate(() => window.addEventListener('psg:identity-photo-updated', () => window.__hitungEventFoto()));
    await unggahFoto(PNG_MERAH);
    await page.waitForFunction((x) => !!localStorage.getItem(x), kunciFoto(A.me.email));
    await page.waitForTimeout(500);
    let l = await lokal();
    await bukaIdentitas();
    k = await kartu();
    check(!!l.fotoA && k.foto === l.fotoA, '1. foto dari halaman depan muncul di Identitas Konsultan (key foto akun A)', { kartu: k.foto && k.foto.slice(0, 40), a: l.fotoA && l.fotoA.slice(0, 40) });
    check(l.fotoLama === FOTO_LAMA && !l.kunci.some((x) => /foto/.test(x) && x !== 'insuranceHub.agen.foto.v1' && x !== kunciFoto(A.me.email)), 'tanpa salinan foto kedua atau key foto baru', l.kunci);
    check(jumlahEvent === 1, 'render ulang tidak memicu event foto berulang', jumlahEvent);
    check(k.email === 'draf.belum.disimpan@psg.test' && k.instagram === 'konsultan.uji' && k.pesan === PESAN_A, '18. render ulang setelah unggah foto tidak menghapus draf kontak, media sosial, atau Pesan Personal', k);
    const fotoMerah = l.fotoA;
    await unggahFoto(PNG_BIRU);
    await page.waitForFunction((x) => localStorage.getItem(x.k) !== x.lama, { k: kunciFoto(A.me.email), lama: fotoMerah });
    await page.waitForTimeout(300);
    l = await lokal();
    await bukaIdentitas();
    k = await kartu();
    check(k.foto === l.fotoA && k.foto !== fotoMerah, '4. mengganti foto memperbarui pratinjau Kartu Konsultan', k.foto && k.foto.slice(0, 40));
    const fotoA = l.fotoA;
    await page.fill('#kkEmail', 'konsultan@psg.test');

    await page.reload({ waitUntil: 'load' }); await siap(A.me.email);
    await bukaIdentitas();
    k = await kartu();
    check(k.foto === fotoA, '3. foto bertahan sesudah refresh dan pemulihan sesi', k.foto && k.foto.slice(0, 40));

    await buka('CRIS_ILUS', 'layarCRISIlus');
    let c = await cetak('#layarCRISIlus');
    check(c.ada && c.foto === fotoA, '5. Preview/cetak memakai foto akun aktif', c);
    const itemBaru = await simpanLibrary();
    check(itemBaru.konsultan && itemBaru.konsultan.foto === fotoA, '6. snapshot Library baru memakai foto akun aktif', itemBaru.konsultan && String(itemBaru.konsultan.foto).slice(0, 40));
    check(await ringkasan(itemBaru.id) === fotoA, '5. Ringkasan 1 Halaman item baru memakai foto snapshot yang benar');
    const lama = await page.evaluate((id) => window.InsuranceHubLibrary.read().find((x) => x.id === id).konsultan, ITEM_LAMA.id);
    check(lama.foto === FOTO_ITEM_LAMA && lama.nama === 'Konsultan Lama', '7. snapshot Library lama tidak berubah', lama);
    c = await lihatItem(ITEM_LAMA.id);
    check(c.ada && c.foto === FOTO_ITEM_LAMA, '7. cetak item Library lama tetap memakai foto snapshot-nya', c);

    /* ---------- Nomor HP ---------- */
    console.log('\n## Nomor HP Identitas Agen');
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === HP_LAMA, 'HP Identitas Agen kosong: WhatsApp lama Kartu Konsultan tetap terpakai (tidak dihapus)', k.wa);
    await simpanHpAktivitas('+62 812-2222-3333');
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === '081222223333', '11. HP yang disimpan di Aktivitas & Poin mengisi WhatsApp Kartu Konsultan tanpa refresh, mengalahkan WhatsApp lama di konsultan.v1', { wa: k.wa, lama: HP_LAMA });
    check(k.readWa === '081222223333' && k.waLink === 'https://wa.me/6281222223333', '17. identitas cetak dan tautan WhatsApp memakai nomor terbaru', k);
    check(!!k.qr && k.qr.includes(encodeURIComponent('https://wa.me/6281222223333')), '17. QR WhatsApp memakai nomor terbaru', k.qr);
    check(k.email === 'konsultan@psg.test' && k.instagram === 'konsultan.uji' && k.pesan === PESAN_A && k.nama === 'Konsultan Uji', '18. kontak lain dan Pesan Personal tetap', k);
    l = await lokal();
    check(l.agen.hp === '081222223333' && l.konsultan.whatsapp === HP_LAMA, 'render tidak menulis ulang Identitas Agen maupun Kartu Konsultan diam-diam', { agen: l.agen, wa: l.konsultan.whatsapp });

    await simpanHpAktivitas('0812 4444 5555');
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === '081244445555' && k.readWa === '081244445555', '12. mengganti HP di Identitas Agen memperbarui Kartu Konsultan', k.wa);
    await buka('CRIS_ILUS', 'layarCRISIlus');
    c = await cetak('#layarCRISIlus');
    check(c.ada && c.teks.includes('081244445555') && !c.teks.includes(HP_LAMA), '17. cetak memakai nomor terbaru', c.teks);
    const itemHp = await simpanLibrary();
    check(itemHp.konsultan.whatsapp === '081244445555' && itemHp.konsultan.foto === fotoA, '6/17. snapshot Library baru: nomor terbaru dan foto akun', itemHp.konsultan);

    await page.reload({ waitUntil: 'load' }); await siap(A.me.email);
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === '081244445555' && k.foto === fotoA, '13. sesudah refresh auto-fill HP dan foto tetap benar', { wa: k.wa });

    /* ---------- Atas nama agen lain ---------- */
    console.log('\n## Dibuat untuk agen lain');
    await page.evaluate((f) => {
      const an = window.InsuranceHubDataAkun.baca('atasNama');
      an.aktif = true; an.nama = 'Agen Dibantu'; an.kode = '6899'; an.whatsapp = ''; an.foto = f; an.daftar = [{ nama: 'Agen Dibantu', kode: '6899', foto: f, qr: 'TIDAK' }];
      window.InsuranceHubDataAkun.tulis('atasNama', an);
      window.InsuranceHubAtasNama.spanduk();
      window.dispatchEvent(new Event('insurancehub:consultant-refresh'));
    }, FOTO_AGEN_LAIN);
    await page.waitForTimeout(250);
    k = await kartu();
    check(k.foto === FOTO_AGEN_LAIN && k.readAtasNama && k.readFoto === FOTO_AGEN_LAIN, '8. atas nama: pratinjau memakai foto agen tersebut', { foto: k.foto && k.foto.slice(0, 40), readFoto: k.readFoto && k.readFoto.slice(0, 40) });
    check(k.readWa === '' && !k.waLink && !k.qr && k.wa === '081244445555', '16. atas nama: HP pemilik tidak dipakai untuk agen lain; formulir tetap milik sendiri', k);
    await page.evaluate(() => window.dispatchEvent(new Event('psg:identity-photo-updated')));
    await page.waitForTimeout(150);
    k = await kartu();
    check(k.foto === FOTO_AGEN_LAIN, '8. event foto profil tidak menimpa foto agen lain', k.foto && k.foto.slice(0, 40));
    await buka('CRIS_ILUS', 'layarCRISIlus');
    c = await cetak('#layarCRISIlus');
    check(c.ada && c.foto === FOTO_AGEN_LAIN && /Agen Dibantu/.test(c.teks) && !c.teks.includes('081244445555'), '8/16. cetak atas nama: foto dan identitas agen tersebut', c);
    const itemAn = await simpanLibrary();
    check(itemAn.konsultan.foto === FOTO_AGEN_LAIN && itemAn.konsultan.whatsapp === '', '8/16. snapshot Library atas nama: foto agen tersebut, tanpa HP pemilik', itemAn.konsultan);
    await page.evaluate(() => {
      const an = window.InsuranceHubDataAkun.baca('atasNama');
      an.foto = ''; window.InsuranceHubDataAkun.tulis('atasNama', an);
      window.dispatchEvent(new Event('insurancehub:consultant-refresh'));
    });
    await page.waitForTimeout(200);
    k = await kartu();
    check(k.foto === null && k.readFoto !== fotoA, '16. agen lain tanpa foto: kosong, foto pemilik tidak dipakai', { foto: k.foto, readFoto: k.readFoto && k.readFoto.slice(0, 40) });
    await bukaIdentitas();
    await page.evaluate(() => document.getElementById('kkAnMatikan').click());
    await page.waitForTimeout(250);
    k = await kartu();
    check(k.foto === fotoA && k.readWa === '081244445555', 'kembali ke nama sendiri: foto dan HP akun aktif', { foto: k.foto && k.foto.slice(0, 30), wa: k.readWa });

    /* ---------- Pulihkan identitas saya ---------- */
    console.log('\n## Pulihkan identitas saya');
    await page.click('#kkReset');
    await page.waitForTimeout(300);
    l = await lokal();
    k = await kartu();
    check(l.agen.hp === '081244445555', '15. Pulihkan identitas tidak menghapus HP Identitas Agen', l.agen);
    check(l.fotoA === fotoA && Array.isArray(l.atasNama.daftar) && l.atasNama.daftar.length === 1, '15. Pulihkan identitas tidak menghapus foto profil atau daftar tim', { daftar: l.atasNama.daftar });
    check(k.wa === '081244445555' && k.foto === fotoA, '15. sesudah pemulihan Kartu Konsultan kembali memakai HP dan foto Identitas Agen', k);

    /* HP kosong: tanpa nilai palsu, tetap bisa diisi manual. */
    await simpanHpAktivitas('');
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === '' && !k.waLink && !k.qr && k.readWa === '', '14. HP Identitas Agen kosong: WhatsApp kosong, tanpa nilai palsu', k);
    await page.fill('#kkWhatsApp', '0813 5555 6666');
    await page.click('#kkSimpan');
    await page.waitForTimeout(300);
    k = await kartu();
    check(/081355556666|0813 5555 6666/.test(k.readWa) && !!k.waLink, '14. WhatsApp tetap bisa diisi manual dan tersimpan', k);
    check(k.pesan === PESAN_A && await page.evaluate(() => window.InsuranceHubPesanPersonal.teks()) === PESAN_A, '18. Pesan Personal tetap sesudah simpan identitas', k.pesan);

    /* ---------- program-summary.html ---------- */
    console.log('\n## program-summary.html');
    await page.evaluate(() => sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify({ customerName: 'Prospek Foto', targets: { life: 1000000000 }, scenarios: [] })));
    await page.goto(base + 'program-summary.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.InsuranceHubPesanPersonal && window.InsuranceHubPesanPersonal.status() === 'siap');
    c = await cetak('body');
    check(c.ada && c.foto === fotoA, '5. program-summary.html: cetak memakai foto akun aktif', c);
    const potret = await page.evaluate(() => { const b = document.getElementById('programSimpanLibrary'); if (!b) return null; b.click();
      const x = JSON.parse(localStorage.getItem('insuranceHub.libraryIlustrasi.v1') || '[]')[0]; return x && x.screenKey === 'PROGRAM_SUMMARY' ? x.konsultan : null; });
    check(potret && potret.foto === fotoA, '6. program-summary.html: snapshot Library memakai foto akun aktif', potret && { foto: String(potret.foto).slice(0, 40), wa: potret.whatsapp });
    check(potret && /081355556666|0813 5555 6666/.test(potret.whatsapp), '17. program-summary.html: snapshot Library memakai nomor yang sama dengan Kartu Konsultan', potret && potret.whatsapp);

    /* ---------- Isolasi akun A dan B ---------- */
    console.log('\n## Isolasi akun');
    await page.goto(base + 'index.html', { waitUntil: 'load' }); await siap(A.me.email);
    await masuk(null);
    await page.evaluate(() => window.insuranceHubLogout());
    await page.waitForLoadState('load');
    await masuk(B);
    await page.reload({ waitUntil: 'load' }); await siap(B.me.email);
    await bukaIdentitas();
    k = await kartu();
    check(k.foto === null && k.ikon && k.readFoto !== fotoA && k.readFoto !== FOTO_LAMA, '9. akun B tanpa foto: placeholder, bukan foto A atau foto global lama', { foto: k.foto && k.foto.slice(0, 30), readFoto: k.readFoto && k.readFoto.slice(0, 30) });
    await buka('CRIS_ILUS', 'layarCRISIlus');
    c = await cetak('#layarCRISIlus');
    check(c.ada && !c.foto, '9. cetak akun B tanpa foto A', c);
    const itemB = await simpanLibrary();
    check(itemB.konsultan.foto === '', '9. snapshot Library akun B tanpa foto A', String(itemB.konsultan.foto).slice(0, 30));
    l = await lokal();
    check(l.fotoB === null, '9. akun B tidak mendapat salinan foto A', l.fotoB);
    await masuk(null);
    await page.evaluate(() => window.insuranceHubLogout());
    await page.waitForLoadState('load');
    await masuk(A);
    await page.reload({ waitUntil: 'load' }); await siap(A.me.email);
    await bukaIdentitas();
    k = await kartu();
    check(k.foto === fotoA, '9. kembali ke akun A: foto A dipulihkan dari key akun A', k.foto && k.foto.slice(0, 30));

    /* Hapus foto dari Identitas Agen. */
    await buka('AKTIVITAS', 'layarAktivitas');
    await page.click('#hapusFotoAgen');
    await page.waitForTimeout(300);
    await bukaIdentitas();
    k = await kartu();
    l = await lokal();
    check(l.fotoA === null && k.foto === null && k.ikon, '4. menghapus foto memperbarui Kartu Konsultan ke placeholder (tanpa foto global lama)', { foto: k.foto && k.foto.slice(0, 30) });

    check(pageErrors.length === 0, 'tidak ada JavaScript error', pageErrors);
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('\n' + (failures.length ? 'FAIL' : 'PASS') + ': ' + (checks - failures.length) + '/' + checks + ' checks');
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); try { server.close(); } catch (_) {} process.exitCode = 1; });
