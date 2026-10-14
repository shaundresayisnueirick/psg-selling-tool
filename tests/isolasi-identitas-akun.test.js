#!/usr/bin/env node
'use strict';
/* Isolasi Nomor HP dan identitas dokumen antarakun Identity di browser yang
   sama — tes browser (Playwright).

   Skenario: data lama perangkat (login kode akses lama / versi sebelumnya)
   → akun A → logout → akun B → logout → akun A → login kode akses lama.
   Diperiksa: Kartu Konsultan, Identitas Agen di Aktivitas & Poin, kolom
   penyaji, Prompt Flyer, cetak, snapshot Library, program-summary.html, mode
   "Dibuat untuk agen lain" dan daftar tim, Isian Terakhir, foto per email,
   serta penyalinan data lama yang hanya terjadi atas pilihan pengguna.

     node tests/isolasi-identitas-akun.test.js [--root <dir>] [--browser <path>] */

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
const C = akun('cccccccc-3333-4333-8333-cccccccccccc', 'agen.c@psg.test', 'Agen Cahya');
const kunciFoto = (email) => 'insuranceHub.agen.foto.identity.v1.' + encodeURIComponent(email);
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (a) => b64u({ alg: 'HS256', typ: 'JWT' }) + '.' + b64u({ sub: a.me.id, email: a.me.email, exp: 4102444800 }) + '.tanda-uji';

/* Data lama perangkat: pemiliknya tidak diketahui. */
const LAMA = {
  level: { level: 'FC', nama: 'Financial Consultant', namaAgen: 'PSG TEAM', kodeAgen: '68000001' },
  agen: { nama: 'PSG TEAM', kode: '68000001', hp: '089900000000' },
  konsultan: { nama: 'Konsultan Lama', jabatan: 'Financial Consultant', whatsapp: '089911111111', email: 'lama@psg.test', instagram: 'lama.ig', qr: 'YA' },
  atasNama: { aktif: false, daftar: [{ nama: 'Tim Lama', kode: '6811', whatsapp: '089922222222', foto: '', qr: 'TIDAK' }] },
  foto: 'data:image/png;base64,FOTO-GLOBAL-LAMA'
};
const FOTO_A = 'data:image/png;base64,FOTO-AKUN-A';
const PROFIL = { id: 'fx-iso-01', nama: 'Prospek Isolasi', tglLahir: '1985-03-14', jk: 'PRIA', status: 'Belum menikah',
  family: [{ id: 'self', nama: 'Prospek Isolasi', tglLahir: '1985-03-14', jk: 'PRIA', hubungan: 'Diri Sendiri' }], children: [] };

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

  await context.addInitScript(({ profil, lama, fotoA, kunciA }) => {
    try {
      sessionStorage.setItem('insuranceHub.access.v3', 'ok');
      if (!localStorage.getItem('uji.disemai')) {
        localStorage.clear();
        localStorage.setItem('insuranceHub.customerProfiles.v1', JSON.stringify([profil]));
        localStorage.setItem('insuranceHub.customerProfile.active.v1', profil.id);
        localStorage.setItem('insuranceHub.level.v1', JSON.stringify(lama.level));
        localStorage.setItem('insuranceHub.agen.v1', JSON.stringify(lama.agen));
        localStorage.setItem('insuranceHub.konsultan.v1', JSON.stringify(lama.konsultan));
        localStorage.setItem('insuranceHub.konsultan.atasNama.v1', JSON.stringify(lama.atasNama));
        localStorage.setItem('insuranceHub.agen.foto.v1', lama.foto);
        localStorage.setItem(kunciA, fotoA);
        localStorage.setItem('uji.disemai', '1');
      }
    } catch (_) {}
  }, { profil: PROFIL, lama: LAMA, fotoA: FOTO_A, kunciA: kunciFoto(A.me.email) });

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
    if (email) await page.waitForFunction((e) => window.InsuranceHubIdentity?.email === e, email);
    await page.waitForTimeout(500);
  };
  const ganti = async (a) => {
    await masuk(null);
    await page.evaluate(() => window.insuranceHubLogout());
    await page.waitForLoadState('load');
    await masuk(a);
    await page.reload({ waitUntil: 'load' });
    await siap(a && a.me.email);
  };
  const buka = async (layar, id) => {
    await page.evaluate((l) => window.InsuranceHubNavigation.bukaLayar(l), layar);
    await page.waitForFunction((x) => document.getElementById(x).classList.contains('aktif'), id);
    await page.waitForTimeout(400);
  };
  const bukaIdentitas = () => buka('KARTU_KONSULTAN', 'layarKartuKonsultan');
  const kartu = () => page.evaluate(() => {
    const v = (id) => (document.getElementById(id) || {}).value;
    const r = window.InsuranceHubConsultantCard.read();
    const pv = document.getElementById('kartuKonsultanPreview');
    const pilih = document.getElementById('kkAnPilih');
    return { nama: v('kkNama'), wa: v('kkWhatsApp'), email: v('kkEmail'), instagram: v('kkInstagram'),
      read: { nama: r.nama, whatsapp: r.whatsapp, email: r.email, instagram: r.instagram, atasNama: !!r.atasNama, foto: r.foto },
      pratinjau: pv ? pv.textContent : '', spanduk: !!document.getElementById('kkAnSpanduk'),
      tim: pilih ? [...pilih.options].slice(1).map((o) => o.textContent) : [], anNama: v('kkAnNama'),
      dataLama: !!document.getElementById('kkDataLama') && !document.getElementById('kkDataLama').hidden,
      dataLamaTeks: (document.getElementById('kkDataLama') || {}).textContent || '' };
  });
  /* Dibuka lewat tombol menu seperti pengguna, supaya panel Identitas Agen digambar ulang. */
  const bukaAktivitas = async () => {
    await page.evaluate(() => { const b = document.getElementById('btnAktivitas'); if (b) b.click(); else window.InsuranceHubNavigation.bukaLayar('AKTIVITAS'); });
    await page.waitForFunction(() => document.getElementById('layarAktivitas').classList.contains('aktif'));
    await page.waitForTimeout(400);
  };
  const hpAktivitas = async () => { await bukaAktivitas(); return page.$eval('#aktAgenHp', (n) => n.value); };
  const simpanHp = async (nilai) => {
    await bukaAktivitas();
    await page.fill('#aktAgenHp', nilai);
    await page.click(await page.$('#aktSimpanHp') ? '#aktSimpanHp' : '#aktSimpanAgen');
    await page.waitForTimeout(250);
  };
  const penyaji = () => page.evaluate(() => {
    if (window.InsuranceHubUmum && window.InsuranceHubUmum.isiIdentitasAgen) window.InsuranceHubUmum.isiIdentitasAgen();
    return [...document.querySelectorAll('input[id$="AgenHP"], input[id$="AgenNama"]')].map((n) => n.value).filter(Boolean);
  });
  const flyer = () => page.evaluate(() => { try { return window.InsuranceHubPromptFlyer.susunPrompt(); } catch (e) { return 'ERR ' + e.message; } });
  const cetak = async () => {
    await buka('CRIS_ILUS', 'layarCRISIlus');
    return page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
      const n = document.querySelector('#layarCRISIlus .psg-consultant-print');
      const t = n ? n.textContent : '';
      window.dispatchEvent(new Event('afterprint'));
      return t;
    });
  };
  const simpanLibrary = async () => {
    await buka('CRIS_ILUS', 'layarCRISIlus');
    const n = await page.evaluate(() => window.InsuranceHubLibrary.read().length);
    await page.click('#layarCRISIlus .btn-simpan-library');
    await page.waitForFunction((x) => window.InsuranceHubLibrary.read().length > x, n);
    return page.evaluate(() => window.InsuranceHubLibrary.read()[0].konsultan);
  };
  const ringkasanProgram = async () => {
    await page.evaluate(() => sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify({ customerName: 'Prospek Isolasi', targets: { life: 1000000000 }, scenarios: [] })));
    await page.goto(base + 'comparison-summary.html', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const perbandingan = await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
      const n = document.querySelector('.psg-consultant-print');
      const t = n ? n.textContent : '';
      window.dispatchEvent(new Event('afterprint'));
      return t;
    });
    await page.goto(base + 'program-summary.html', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const hasil = await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
      const n = document.querySelector('.psg-consultant-print');
      const cetak = n ? n.textContent : '';
      window.dispatchEvent(new Event('afterprint'));
      const b = document.getElementById('programSimpanLibrary'); if (b) b.click();
      const x = JSON.parse(localStorage.getItem('insuranceHub.libraryIlustrasi.v1') || '[]')[0];
      return { cetak, potret: x && x.screenKey === 'PROGRAM_SUMMARY' ? x.konsultan : null };
    });
    hasil.perbandingan = perbandingan;
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    return hasil;
  };
  const lokalLama = () => page.evaluate(() => ({
    agen: localStorage.getItem('insuranceHub.agen.v1'), konsultan: localStorage.getItem('insuranceHub.konsultan.v1'),
    atasNama: localStorage.getItem('insuranceHub.konsultan.atasNama.v1'), level: localStorage.getItem('insuranceHub.level.v1'),
    foto: localStorage.getItem('insuranceHub.agen.foto.v1') }));
  const catatanAkun = (a) => page.evaluate((e) => JSON.parse(localStorage.getItem('insuranceHub.identitas.akun.v1.' + encodeURIComponent(e)) || 'null'), a.me.email);
  /* Nama berkas Cadangan (Aktivitas & Poin). */
  const namaCadangan = async () => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => window.InsuranceHubAktivitas.cadangkan())]);
    return d.suggestedFilename();
  };
  const seluruhTeks = (o) => JSON.stringify(o);
  const bocor = (teks, nilai) => nilai.filter((x) => teks.includes(x));

  const awalLama = { agen: JSON.stringify(LAMA.agen), konsultan: JSON.stringify(LAMA.konsultan), atasNama: JSON.stringify(LAMA.atasNama), level: JSON.stringify(LAMA.level), foto: LAMA.foto };
  const NILAI_LAMA = ['089900000000', '089911111111', 'lama@psg.test', 'lama.ig', 'Konsultan Lama', 'PSG TEAM', 'Tim Lama'];
  const NILAI_A = ['081211111111', 'alfa@kontak.test', 'alfa.ig', 'Agen Bantu A', 'Tim Alfa'];
  const NILAI_B = ['081322222222', 'beta@kontak.test'];

  try {
    /* ---------- Akun A pertama kali di perangkat berisi data lama ---------- */
    console.log('\n## Akun A: perangkat berisi data lama');
    tundaMe = 2000;
    await masuk(A);
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.InsuranceHubConsultantCard && document.getElementById('kkNama'));
    let k = await kartu();
    check(!bocor(seluruhTeks(k), NILAI_LAMA).length, 'sesi belum siap: Kartu tidak memuat data lama perangkat', bocor(seluruhTeks(k), NILAI_LAMA));
    let lama0 = await lokalLama();
    check(lama0.agen === awalLama.agen && lama0.konsultan === awalLama.konsultan && lama0.atasNama === awalLama.atasNama && lama0.level === awalLama.level
      && await catatanAkun(A) === null, 'sesi belum siap: tidak ada penulisan ke data lama maupun catatan akun', lama0);
    await siap(A.me.email);
    tundaMe = 0;
    await bukaIdentitas();
    k = await kartu();
    check(k.nama === 'Agen Alfa' && k.read.nama === 'Agen Alfa', 'akun A tanpa data: nama dari profil Identity, bukan nama demo lama', { nama: k.nama, read: k.read.nama });
    check(!bocor(seluruhTeks({ ...k, dataLamaTeks: '' }), NILAI_LAMA).length, 'akun A tanpa data: WhatsApp, email, media sosial, daftar tim lama tidak terbaca', bocor(seluruhTeks({ ...k, dataLamaTeks: '' }), NILAI_LAMA));
    check(k.dataLama && !bocor(k.dataLamaTeks, NILAI_LAMA).length, 'data lama ditawarkan untuk disalin, tanpa menampilkan isinya utuh', k.dataLamaTeks);
    check(await hpAktivitas() === '', 'akun A tanpa data: Nomor HP Identitas Agen kosong, bukan HP lama');
    check(!bocor(seluruhTeks(await penyaji()), NILAI_LAMA).length, 'kolom penyaji akun A tanpa data lama', await penyaji());
    check(!bocor(await flyer(), NILAI_LAMA).length, 'Prompt Flyer akun A tanpa data lama', bocor(await flyer(), NILAI_LAMA));

    /* A mengisi datanya sendiri. */
    await bukaIdentitas();
    await page.click('#kkDataLamaAbaikan', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    await simpanHp('0812 1111 1111');
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === '081211111111', 'akun A: HP Identitas Agen tetap mengisi WhatsApp Kartu Konsultan', k.wa);
    await page.fill('#kkEmail', 'alfa@kontak.test'); await page.fill('#kkInstagram', 'alfa.ig');
    await page.click('#kkSimpan'); await page.waitForTimeout(250);
    await page.fill('#kkAnNama', 'Agen Bantu A'); await page.dispatchEvent('#kkAnNama', 'input');
    await page.fill('#kkAnWa', '081277777777'); await page.dispatchEvent('#kkAnWa', 'input');
    await page.click('#kkAnSimpan'); await page.waitForTimeout(200);
    await page.click('#kkAnMode [data-nilai="Ya"]'); await page.waitForTimeout(250);
    k = await kartu();
    check(k.read.atasNama && k.spanduk && k.tim.some((x) => /Agen Bantu A/.test(x)), 'akun A: mode atas nama dan daftar tim aktif', k);
    let lama = await lokalLama();
    check(lama.agen === awalLama.agen && lama.konsultan === awalLama.konsultan && lama.atasNama === awalLama.atasNama && lama.level === awalLama.level,
      'data lama perangkat tidak diubah oleh penyimpanan akun A', lama);
    await page.click('#kkAnMatikan'); await page.waitForTimeout(200);
    await page.click('#kkAnMode [data-nilai="Ya"]'); await page.waitForTimeout(250);   // tetap aktif saat logout

    /* ---------- A logout → B ---------- */
    console.log('\n## A logout → akun B');
    await ganti(B);
    await bukaIdentitas();
    k = await kartu();
    const teksB = seluruhTeks({ ...k, dataLamaTeks: '' });
    check(k.nama === 'Agen Beta' && !bocor(teksB, NILAI_A).length, 'akun B: Kartu Konsultan tidak memuat HP, kontak, atau identitas A', bocor(teksB, NILAI_A));
    check(!k.read.atasNama && !k.spanduk && !k.tim.length && !k.anNama, 'akun B: mode atas nama dan daftar tim A tidak terbawa', { atasNama: k.read.atasNama, spanduk: k.spanduk, tim: k.tim });
    check(!bocor(teksB, NILAI_LAMA).length, 'akun B: data lama perangkat juga tidak terbaca', bocor(teksB, NILAI_LAMA));
    check(k.read.foto !== FOTO_A && k.read.foto !== LAMA.foto, 'akun B: foto A atau foto lama tidak dipakai', String(k.read.foto).slice(0, 30));
    check(await hpAktivitas() === '', 'akun B: Nomor HP Identitas Agen kosong');
    check(!bocor(seluruhTeks(await penyaji()), NILAI_A.concat(NILAI_LAMA)).length, 'akun B: kolom penyaji tanpa data A atau data lama', await penyaji());
    check(!bocor(await flyer(), NILAI_A.concat(NILAI_LAMA)).length, 'akun B: Prompt Flyer tanpa data A atau data lama', bocor(await flyer(), NILAI_A.concat(NILAI_LAMA)));
    let t = await cetak();
    check(!bocor(t, NILAI_A.concat(NILAI_LAMA)).length, 'akun B: cetak tanpa identitas A atau data lama', t);
    let snap = await simpanLibrary();
    check(!bocor(seluruhTeks(snap), NILAI_A.concat(NILAI_LAMA)).length && snap.foto !== FOTO_A, 'akun B: snapshot Library tanpa data A', snap);
    let ps = await ringkasanProgram(); await siap(B.me.email);
    check(!bocor(seluruhTeks(ps), NILAI_A.concat(NILAI_LAMA)).length, 'akun B: program-summary.html dan comparison-summary.html (cetak dan Library) tanpa data A atau data lama', ps);
    check(await page.evaluate(() => window.InsuranceHubAtasNama.aktif()) === false, 'akun B: InsuranceHubAtasNama.aktif() false (Pesan Personal tidak dikunci oleh mode A)');
    let berkas = await namaCadangan();
    check(/Agen Beta/.test(berkas) && !/PSG TEAM|Konsultan Lama|Agen Alfa/.test(berkas), 'akun B: nama berkas cadangan memakai nama akun B', berkas);

    await simpanHp('0813 2222 2222');
    await bukaIdentitas();
    await page.click('#kkDataLamaAbaikan', { timeout: 3000 }).catch(() => {});
    await page.fill('#kkEmail', 'beta@kontak.test'); await page.click('#kkSimpan'); await page.waitForTimeout(250);
    k = await kartu();
    check(k.wa === '081322222222' && k.read.email === 'beta@kontak.test', 'akun B: menyimpan HP dan kontak sendiri', k.read);
    lama = await lokalLama();
    check(lama.agen === awalLama.agen && lama.konsultan === awalLama.konsultan && lama.atasNama === awalLama.atasNama,
      'data lama perangkat tetap utuh sesudah B menyimpan', lama);

    /* ---------- B logout → A ---------- */
    console.log('\n## B logout → kembali ke akun A');
    await ganti(A);
    await bukaIdentitas();
    k = await kartu();
    check(k.wa === '081211111111' && k.email === 'alfa@kontak.test' && k.instagram === 'alfa.ig' && k.nama === 'Agen Alfa', 'akun A: HP dan kontak A dipulihkan di formulir, tidak tertimpa B', k);
    check(k.read.atasNama && k.spanduk && k.tim.some((x) => /Agen Bantu A/.test(x)), 'akun A: mode atas nama dan daftar tim A dipulihkan', { spanduk: k.spanduk, tim: k.tim });
    check(!bocor(seluruhTeks(k), NILAI_B).length, 'akun A: tidak ada data B', bocor(seluruhTeks(k), NILAI_B));
    check(await hpAktivitas() === '081211111111', 'akun A: Nomor HP Identitas Agen milik A');
    await page.click('#kkAnMatikan'); await page.waitForTimeout(200);
    k = await kartu();
    check(k.read.foto === FOTO_A, 'akun A: foto per email tetap dipakai', String(k.read.foto).slice(0, 30));
    t = await cetak();
    check(t.includes('081211111111') && t.includes('alfa@kontak.test') && !bocor(t, NILAI_B.concat(NILAI_LAMA)).length, 'akun A: cetak memakai data A', t);
    snap = await simpanLibrary();
    check(snap.whatsapp === '081211111111' && snap.email === 'alfa@kontak.test' && snap.foto === FOTO_A, 'akun A: snapshot Library memakai data A', snap);
    ps = await ringkasanProgram(); await siap(A.me.email);
    check(ps.potret && ps.potret.whatsapp === '081211111111' && ps.potret.email === 'alfa@kontak.test' && ps.potret.foto === FOTO_A && ps.cetak.includes('alfa@kontak.test'),
      'akun A: program-summary.html memakai data A', ps);
    const fl = await flyer();
    check(fl.includes('081211111111') && !bocor(fl, NILAI_B.concat(NILAI_LAMA)).length, 'akun A: Prompt Flyer memakai HP A', fl.split('\n').find((x) => /Disajikan/.test(x)));
    check(seluruhTeks(await penyaji()).includes('081211111111'), 'akun A: kolom penyaji memakai HP A', await penyaji());
    check(ps.perbandingan.includes('alfa@kontak.test') && ps.perbandingan.includes('081211111111') && !bocor(ps.perbandingan, NILAI_B.concat(NILAI_LAMA)).length,
      'akun A: comparison-summary.html mencetak identitas A', ps.perbandingan);
    berkas = await namaCadangan();
    check(/Agen Alfa/.test(berkas) && !/PSG TEAM|Konsultan Lama/.test(berkas), 'akun A: nama berkas cadangan memakai nama akun A, bukan nama demo lama', berkas);
    const recA = await catatanAkun(A), recB = await catatanAkun(B);
    check(recB && recB.agen && recB.agen.hp === '081322222222' && recB.konsultan.email === 'beta@kontak.test' && !bocor(seluruhTeks(recB), NILAI_A).length,
      'catatan akun B tetap milik B sesudah A kembali (tidak tertukar)', recB);
    check(recA && recA.agen && recA.agen.hp === '081211111111' && !bocor(seluruhTeks(recA), NILAI_B.concat(NILAI_LAMA)).length,
      'catatan akun A hanya berisi data A', recA);

    /* Isian Terakhir tidak menyimpan isian Kartu Konsultan (punya penyimpanan sendiri per akun). */
    await bukaIdentitas();
    await page.fill('#kkInstagram', 'draf.belum.disimpan');
    await buka('PRODUK', 'layarProduk');
    const isian = await page.evaluate(() => localStorage.getItem('insuranceHub.isianTerakhir.v1') || '');
    check(!isian.includes('draf.belum.disimpan') && !isian.includes('alfa@kontak.test'), 'Isian Terakhir tidak membawa isian Kartu Konsultan ke akun berikutnya', isian.slice(0, 200));

    /* ---------- Penyalinan data lama atas pilihan pengguna ---------- */
    console.log('\n## Akun C: salin data lama perangkat');
    await ganti(C);
    await bukaIdentitas();
    k = await kartu();
    check(k.dataLama && !bocor(seluruhTeks({ ...k, dataLamaTeks: '' }), NILAI_LAMA).length, 'akun C: data lama hanya ditawarkan, belum dipakai', k);
    await page.click('#kkDataLamaSalin', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    k = await kartu();
    check(!k.dataLama && k.read.email === 'lama@psg.test' && k.read.instagram === 'lama.ig' && k.wa === '089900000000' && k.tim.some((x) => /Tim Lama/.test(x)),
      'akun C: Salin memakai data lama untuk akun ini (kontak, HP, daftar tim)', k);
    check(await hpAktivitas() === '089900000000', 'akun C: HP lama ikut menjadi Nomor HP Identitas Agen akun ini');
    lama = await lokalLama();
    check(lama.agen === awalLama.agen && lama.konsultan === awalLama.konsultan && lama.atasNama === awalLama.atasNama && lama.foto === awalLama.foto,
      'penyalinan tidak memindahkan atau menghapus data lama', lama);
    await page.reload({ waitUntil: 'load' }); await siap(C.me.email);
    await bukaIdentitas();
    k = await kartu();
    check(!k.dataLama && k.read.email === 'lama@psg.test', 'akun C: tawaran tidak muncul lagi sesudah disalin', k.read);

    /* ---------- Tanpa sesi Identity (login kode akses lama dicabut) ---------- */
    console.log('\n## Tanpa sesi Identity');
    await masuk(null);
    await page.evaluate(() => window.insuranceHubLogout());
    await page.waitForLoadState('load');
    await page.waitForSelector('#psgIdentityEmail', { state: 'visible' });
    const kunci = await page.evaluate(() => ({ gate: !!document.getElementById('insuranceAccessGate'),
      terkunci: document.documentElement.classList.contains('insurance-auth-locked'), kodeLama: !!document.getElementById('insuranceAccessCode') }));
    check(kunci.gate && kunci.terkunci && !kunci.kodeLama, 'tanpa sesi Identity: aplikasi terkunci, data lama perangkat tidak bisa dibuka lewat kode akses lama', kunci);
    lama = await lokalLama();
    check(lama.agen === awalLama.agen && lama.konsultan === awalLama.konsultan && lama.atasNama === awalLama.atasNama && lama.level === awalLama.level && lama.foto === awalLama.foto,
      'akhir skenario: agen.v1, konsultan.v1, atasNama.v1, level.v1, dan foto lama tidak berubah (login lama dicabut tanpa menghapus data)', lama);

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
