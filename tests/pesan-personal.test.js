#!/usr/bin/env node
'use strict';
/* Pesan Personal Identitas Konsultan — tes browser (Playwright).

   /api/psg/pribadi dijawab oleh logika server ASLI (netlify/lib/psg-pribadi.mts)
   di proses tes, dengan sesi Identity dan Netlify Blobs tiruan. Tidak ada
   permintaan ke store production maupun preview yang sebenarnya.

   Cakupan: login kode akses lama, akun email A dan B di perangkat yang sama,
   kosong vs terisi, 280 karakter dengan kata sangat panjang (HP & desktop),
   Preview/cetak, Ringkasan 1 Halaman, snapshot Library baru vs item lama,
   mode "Dibuat untuk agen lain", gagal simpan + coba lagi, offline,
   program-summary.html dan comparison-summary.html, tanpa storage key baru.

     node tests/pesan-personal.test.js [--root <dir>] [--browser <path>] */

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
  console.log((ok ? 'PASS ' : 'FAIL ') + checks + '. ' + message + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 900)));
  if (!ok) failures.push(message);
};

/* Akun fiktif. me = jawaban /api/psg/me, user = bentuk User @netlify/identity. */
function akun(id, email, nama, opsi = {}) {
  return {
    me: { id, email, nama, roles: opsi.roles || [], level: opsi.level === undefined ? 'FC' : opsi.level, kodeAgen: opsi.kode || '6800' + id.slice(0, 4), status: 'aktif', emailTerkonfirmasi: true },
    user: { id, email, confirmedAt: '2026-01-01T00:00:00Z', name: nama, appMetadata: { roles: opsi.roles || [], psg: { level: opsi.level === undefined ? 'FC' : opsi.level, status: 'aktif', nama } }, userMetadata: {} }
  };
}
const A = akun('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'agen.a@psg.test', 'Agen Alfa');
const B = akun('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'agen.b@psg.test', 'Agen Beta');

const PROFIL = { id: 'fx-pesan-01', nama: 'Prospek Pesan', tglLahir: '1985-03-14', jk: 'PRIA', status: 'Belum menikah',
  family: [{ id: 'self', nama: 'Prospek Pesan', tglLahir: '1985-03-14', jk: 'PRIA', hubungan: 'Diri Sendiri' }], children: [] };
const KONSULTAN = { nama: 'Konsultan Uji', jabatan: 'Financial Consultant', whatsapp: '081234567890', email: 'konsultan@psg.test', qr: 'TIDAK' };
const ITEM_LAMA = { id: 'IL-lama-1', title: 'Ilustrasi lama', product: 'Cristal Prime', productCode: 'CRIS', screenKey: 'CRIS_ILUS',
  customerName: 'Prospek Pesan', profileId: 'fx-pesan-01', relationship: 'Diri Sendiri', insuredPersonId: 'self', category: 'Ilustrasi',
  familyName: 'Prospek Pesan', createdAt: '2026-05-01T08:00:00.000Z', html: '<div class="blok"><h2>Ilustrasi lama</h2><p>Isi tersimpan.</p></div>',
  konsultan: { nama: 'Konsultan Uji', jabatan: 'Financial Consultant', whatsapp: '081234567890', email: 'konsultan@psg.test', instagram: '', tiktok: '', facebook: '', linkedin: '', youtube: '', qr: 'TIDAK', foto: '' } };

const PESAN_A = 'Melindungi keluarga bukan hanya profesi saya, tetapi juga komitmen pribadi saya.';
const PANJANG = 'Prestasi:' + 'A'.repeat(200) + ' ' + 'https://contoh.example/' + 'b'.repeat(47);   // 280 karakter

async function main() {
  const lib = await import(pathToFileURL(path.join(root, 'netlify/lib/psg-pribadi.mts')).href);
  const { chromium } = loadPlaywright();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browserPath = arg('--browser');
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const pageErrors = [];
  check(PANJANG.length === 280, 'fixture pesan panjang tepat 280 karakter', PANJANG.length);

  /* Netlify Blobs tiruan + sesi yang sedang aktif (diatur tes). */
  const store = new Map();
  const toko = { async get(k) { return store.has(k) ? JSON.parse(store.get(k)) : null; }, async setJSON(k, v) { store.set(k, JSON.stringify(v)); }, async delete(k) { store.delete(k); },
    async list(o) { return { blobs: [...store.keys()].filter((k) => k.startsWith(o.prefix)).map((key) => ({ key, etag: '' })) }; } };
  let sesi = null;                 // akun yang dianggap sedang login di server
  let gangguan = 0;                // jumlah permintaan berikutnya yang dijawab 503
  const log = [];

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('dialog', (d) => d.accept());

  await context.addInitScript(({ profil, konsultan, itemLama }) => {
    try {
      sessionStorage.setItem('insuranceHub.access.v3', 'ok');
      if (!localStorage.getItem('uji.disemai')) {
        localStorage.clear();
        localStorage.setItem('insuranceHub.customerProfiles.v1', JSON.stringify([profil]));
        localStorage.setItem('insuranceHub.customerProfile.active.v1', profil.id);
        localStorage.setItem('insuranceHub.konsultan.v1', JSON.stringify(konsultan));
        localStorage.setItem('insuranceHub.libraryIlustrasi.v1', JSON.stringify([itemLama]));
        localStorage.setItem('uji.disemai', '1');
      }
    } catch (_) {}
  }, { profil: PROFIL, konsultan: KONSULTAN, itemLama: ITEM_LAMA });

  await context.route('**/src/vendor/netlify-identity.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
    window.PSGNetlifyIdentity = { login: async () => ({}), logout: async () => {}, requestPasswordRecovery: async () => {},
      getUser: async () => (window.__ujiSesi || null) };` }));
  await context.route('**/api/psg/me', (route) => sesi
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: sesi.me }) })
    : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ authenticated: false }) }));
  await context.route('**/api/psg/pribadi**', async (route) => {
    const rq = route.request();
    const h = await rq.allHeaders();
    log.push({ method: rq.method(), url: rq.url(), header: h['x-psg-request'], sesi: sesi && sesi.me.email });
    if (gangguan > 0) { gangguan--; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'storage_unavailable', message: 'x' }) }); }
    const headers = {}; for (const [k, v] of Object.entries(h)) if (!/^(content-length|connection|accept-encoding)$/i.test(k) && !k.startsWith(':')) headers[k] = v;
    const req = new Request(rq.url(), { method: rq.method(), headers, body: /^(GET|HEAD)$/.test(rq.method()) ? undefined : (rq.postData() || '') });
    const r = await lib.tanganiPribadi(req, { ambilUser: async () => (sesi ? sesi.user : null), toko: () => toko, namaStore: lib.STORE_PREVIEW });
    const hdr = {}; r.headers.forEach((v, k) => { hdr[k] = v; });
    return route.fulfill({ status: r.status, headers: hdr, body: await r.text() });
  });

  /* Seperti src/vendor/netlify-identity.js: login menulis cookie nf_jwt. */
  const masuk = async (a) => {
    sesi = a;
    if (a) await context.addCookies([{ name: 'nf_jwt', value: 'jwt-uji-' + a.me.id, url: base }]);
    else await context.clearCookies();
    await context.addInitScript((s) => { window.__ujiSesi = s; }, a ? { id: a.me.id, email: a.me.email } : null);
  };
  const siap = async (email) => {
    await page.waitForFunction(() => window.InsuranceHubNavigation && window.InsuranceHubPesanPersonal && !document.getElementById('insuranceAccessGate'));
    if (email) await page.waitForFunction((e) => window.InsuranceHubIdentity?.email === e && window.InsuranceHubPesanPersonal.status() === 'siap', email);
    await page.waitForTimeout(400);
  };
  const bukaIdentitas = async () => {
    await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('KARTU_KONSULTAN'));
    await page.waitForFunction(() => document.getElementById('layarKartuKonsultan').classList.contains('aktif'));
    await page.waitForTimeout(300);
  };
  const keadaan = () => page.evaluate(() => {
    const box = document.getElementById('kkPesanPratinjau');
    const t = document.getElementById('kkPesan');
    return { status: window.InsuranceHubPesanPersonal.status(), teks: window.InsuranceHubPesanPersonal.teks(),
      kolom: t.value, nonaktif: t.disabled, info: document.getElementById('kkPesanInfo').textContent,
      pesanStatus: document.getElementById('kkPesanStatus').textContent, ulang: !document.getElementById('kkPesanUlang').hidden,
      hitung: document.getElementById('kkPesanHitung').textContent,
      pratinjauHidden: box.hidden, pratinjauTinggi: box.getBoundingClientRect().height, pratinjau: box.textContent };
  });
  const simpan = async (teks) => {
    await page.fill('#kkPesan', teks);
    await page.click('#kkSimpan');
  };
  const cetak = (sel) => page.evaluate((s) => {
    window.dispatchEvent(new Event('beforeprint'));
    const n = document.querySelector(s + ' .psg-consultant-print');
    const hasil = n ? { ada: true, pesan: (n.querySelector('.psg-consultant-pesan') || {}).textContent || null, teks: n.textContent } : { ada: false };
    window.dispatchEvent(new Event('afterprint'));
    return hasil;
  }, sel);
  const kunciLokal = () => page.evaluate(() => Object.keys(localStorage).sort());

  try {
    /* ---------- 1. Login kode akses lama ---------- */
    console.log('\n## Login kode akses lama');
    await masuk(null);
    await page.goto(base + 'index.html', { waitUntil: 'load' }); await siap();
    await bukaIdentitas();
    let k = await keadaan();
    check(k.status === 'tidak-tersedia' && k.nonaktif && /login email terverifikasi/i.test(k.info), 'kode akses lama: kolom nonaktif dengan keterangan login email', k);
    check(k.pratinjauHidden && k.pratinjauTinggi === 0, 'kode akses lama: tidak ada blok pesan di bawah kartu', k);
    check(!log.some((x) => x.method !== 'GET'), 'kode akses lama: tidak ada permintaan simpan', log);
    const kunciAwal = await kunciLokal();

    /* ---------- 2. Akun A, pesan kosong ---------- */
    console.log('\n## Akun email A');
    await masuk(A);
    await page.reload({ waitUntil: 'load' }); await siap(A.me.email);
    await bukaIdentitas();
    k = await keadaan();
    check(k.status === 'siap' && !k.nonaktif && k.kolom === '' && k.hitung === '0/280', 'A: kolom aktif dan kosong', k);
    check(k.pratinjauHidden && k.pratinjauTinggi === 0, 'A kosong: tidak ada ruang kosong di bawah kartu', k);
    const tanpaPesan = await page.evaluate(() => document.getElementById('kartuKonsultanPreview').closest('.blok').getBoundingClientRect().height);
    check(log.every((x) => x.header === '1'), 'setiap permintaan membawa X-PSG-Request', log);

    /* ---------- 3. Simpan pesan A ---------- */
    await simpan(PESAN_A);
    await page.waitForFunction((t) => window.InsuranceHubPesanPersonal.teks() === t, PESAN_A);
    k = await keadaan();
    check(/tersimpan/i.test(k.pesanStatus) && !k.ulang, 'A: status tersimpan setelah server mengonfirmasi', k);
    check(!k.pratinjauHidden && k.pratinjau === PESAN_A, 'A: pesan tampil di bawah kartu konsultan', k);
    check(JSON.parse(store.get('u/' + A.me.id + '/pesan.json')).teks === PESAN_A, 'A: tersimpan di server pada kunci user.id A');
    const urutan = await page.evaluate(() => { const p = document.getElementById('kartuKonsultanPreview'), q = document.getElementById('kkPesanPratinjau'); return p.nextElementSibling === q && p.getBoundingClientRect().bottom <= q.getBoundingClientRect().top + 1; });
    check(urutan, 'pesan berada tepat di bawah kartu identitas');

    /* ---------- 4. 280 karakter, kata sangat panjang, HP & desktop ---------- */
    await simpan(PANJANG);
    await page.waitForFunction((t) => window.InsuranceHubPesanPersonal.teks() === t, PANJANG);
    for (const [w, h] of [[390, 844], [1280, 900]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(250);
      const m = await page.evaluate(() => { const q = document.querySelector('#kkPesanPratinjau .kk-pesan-kutipan'), b = q.closest('.blok');
        return { q: q.scrollWidth <= q.clientWidth + 1, blok: b.scrollWidth <= b.clientWidth + 1, dok: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
      check(m.q && m.blok && m.dok, 'pesan 280 karakter tidak meluber pada lebar ' + w, m);
    }
    k = await keadaan();
    check(k.hitung === '280/280', 'penghitung 280/280', k.hitung);
    const kelebihan = await page.evaluate(() => { const t = document.getElementById('kkPesan'); t.value = ''; return t.maxLength; });
    check(kelebihan === 280, 'kolom dibatasi maxlength 280');
    await page.setViewportSize({ width: 390, height: 844 });

    /* ---------- 5. Preview dan cetak dokumen ---------- */
    await simpan(PESAN_A);
    await page.waitForFunction((t) => window.InsuranceHubPesanPersonal.teks() === t, PESAN_A);
    await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('CRIS'));
    await page.waitForFunction(() => document.getElementById('layarCRIS').classList.contains('aktif'));
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('tblKanan').click());
    await page.waitForFunction(() => document.getElementById('layarCRISIlus').classList.contains('aktif'));
    await page.waitForSelector('#layarCRISIlus .btn-simpan-library');
    await page.waitForTimeout(500);
    let c = await cetak('#layarCRISIlus');
    check(c.ada && c.pesan === PESAN_A && /Konsultan Uji/.test(c.teks), 'cetak: pesan tercetak di bawah identitas konsultan', c);
    const prev = await page.evaluate(() => { const b = document.querySelector('#layarCRISIlus .psg-preview-btn'); if (!b) return null; b.click();
      const m = document.getElementById('psgPrintPreviewModal'); const n = m && m.querySelector('.psg-consultant-print .psg-consultant-pesan');
      const t = n ? n.textContent : null; const x = m && [...m.querySelectorAll('button')].find((y) => /tutup|✕/i.test(y.textContent)); if (x) x.click(); else if (m) m.remove(); return t; });
    check(prev === PESAN_A, 'Preview: pesan tampil pada blok konsultan', prev);
    const kaki = await page.evaluate(() => [...document.querySelectorAll('#layarCRISIlus [id$="KakiAgen"]')].map((n) => n.textContent).join(' '));
    check(!kaki.includes(PESAN_A), 'baris "Disajikan oleh" tidak memuat pesan', kaki);

    /* ---------- 6. Snapshot Library baru ---------- */
    const n0 = await page.evaluate(() => window.InsuranceHubLibrary.read().length);
    await page.click('#layarCRISIlus .btn-simpan-library');
    await page.waitForFunction((n) => window.InsuranceHubLibrary.read().length > n, n0);
    const baru = await page.evaluate(() => window.InsuranceHubLibrary.read()[0]);
    check(baru.konsultan && baru.konsultan.pesan === PESAN_A, 'item Library baru menyimpan snapshot pesan', baru.konsultan);

    /* Pesan diubah sesudahnya: snapshot item tidak ikut berubah. */
    await bukaIdentitas();
    await simpan('Pesan versi kedua');
    await page.waitForFunction(() => window.InsuranceHubPesanPersonal.teks() === 'Pesan versi kedua');
    const tetap = await page.evaluate((id) => window.InsuranceHubLibrary.read().find((x) => x.id === id).konsultan.pesan, baru.id);
    check(tetap === PESAN_A, 'mengubah pesan tidak mengubah snapshot item lama', tetap);

    /* Membuka item: cetak memakai snapshot item, bukan pesan sekarang. */
    const lihat = async (id) => {
      await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('LIBRARY_ILUSTRASI')); await page.waitForTimeout(400);
      await page.click('.lib-view[data-id="' + id + '"]'); await page.waitForSelector('#libraryDetailModal');
      const r = await cetak('[data-psg-preview-source]');
      await page.evaluate(() => { const m = document.getElementById('libraryDetailModal'); const x = m && [...m.querySelectorAll('button')].find((y) => /tutup|✕/i.test(y.textContent)); if (x) x.click(); });
      return r;
    };
    c = await lihat(baru.id);
    check(c.ada && c.pesan === PESAN_A, 'cetak item baru dari Library: pesan dari snapshot', c);
    c = await lihat(ITEM_LAMA.id);
    check(c.ada && c.pesan === null && /Konsultan Uji/.test(c.teks), 'cetak item Library lama tanpa field pesan: tanpa pesan, identitas tetap', c);

    /* Ringkasan 1 Halaman */
    const ringkasan = async (ids) => {
      await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('LIBRARY_ILUSTRASI')); await page.waitForTimeout(400);
      for (const id of ids) await page.click('.library-batch-toggle[data-id="' + id + '"]');
      await page.click('#libOnePageSummary'); await page.waitForSelector('#libraryOnePageModal');
      const r = await page.evaluate(() => { const p = document.querySelector('#libraryOnePageModal .summary-pesan'); return { pesan: p ? p.textContent : null, html: document.querySelector('#libraryOnePageModal .summary-consultant').innerHTML }; });
      await page.evaluate(() => document.getElementById('summaryClose').click());
      for (const id of ids) await page.click('.library-batch-toggle[data-id="' + id + '"]');
      return r;
    };
    let r1 = await ringkasan([baru.id]);
    check(r1.pesan === PESAN_A, 'Ringkasan 1 Halaman: pesan dari snapshot item', r1.pesan);
    r1 = await ringkasan([ITEM_LAMA.id]);
    check(r1.pesan === null, 'Ringkasan 1 Halaman item lama: tanpa pesan dan tanpa elemen kosong', r1);

    /* XSS: teks berbahaya ditampilkan sebagai teks. */
    await bukaIdentitas();
    await simpan('<img src=x onerror="window.__xss=1">');
    await page.waitForFunction(() => /onerror/.test(window.InsuranceHubPesanPersonal.teks()));
    const xss = await page.evaluate(() => ({ img: !!document.querySelector('#kkPesanPratinjau img'), flag: window.__xss === 1 }));
    check(!xss.img && !xss.flag, 'pesan berisi HTML tidak dieksekusi (escape)', xss);
    await simpan(PESAN_A);
    await page.waitForFunction((t) => window.InsuranceHubPesanPersonal.teks() === t, PESAN_A);

    /* ---------- 7. Mode "Dibuat untuk agen lain" ---------- */
    console.log('\n## Mode atas nama agen lain');
    await page.fill('#kkAnNama', 'Agen Dibantu');
    await page.dispatchEvent('#kkAnNama', 'input');
    await page.click('#kkAnMode [data-nilai="Ya"]');
    await page.waitForTimeout(300);
    k = await keadaan();
    check(k.pratinjauHidden && k.nonaktif && /agen lain/i.test(k.info), 'atas nama: pesan tidak ditampilkan pada kartu dan kolom dikunci', k);
    await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('CRIS_ILUS'));
    await page.waitForFunction(() => document.getElementById('layarCRISIlus').classList.contains('aktif')); await page.waitForTimeout(400);
    c = await cetak('#layarCRISIlus');
    check(c.ada && /Agen Dibantu/.test(c.teks) && c.pesan === null, 'atas nama: cetakan memakai agen lain tanpa pesan milik pengguna', c);
    const n1 = await page.evaluate(() => window.InsuranceHubLibrary.read().length);
    await page.click('#layarCRISIlus .btn-simpan-library');
    await page.waitForFunction((n) => window.InsuranceHubLibrary.read().length > n, n1);
    const an = await page.evaluate(() => window.InsuranceHubLibrary.read()[0].konsultan);
    check(an.pesan === '' && an.nama !== KONSULTAN.nama, 'atas nama: snapshot Library tanpa pesan', an);
    await page.evaluate(() => document.getElementById('kkAnMatikan').click());
    await page.waitForTimeout(300);
    c = await cetak('#layarCRISIlus');
    check(c.pesan === PESAN_A, 'kembali ke nama sendiri: pesan tercetak lagi', c);

    /* ---------- 8. Gagal simpan, coba lagi, offline ---------- */
    console.log('\n## Gagal simpan');
    await bukaIdentitas();
    gangguan = 1;
    await simpan('Draf yang gagal disimpan');
    await page.waitForFunction(() => !document.getElementById('kkPesanUlang').hidden);
    k = await keadaan();
    check(/belum tersimpan/i.test(k.pesanStatus) && k.kolom === 'Draf yang gagal disimpan' && k.teks === PESAN_A, 'server gagal: status jelas, draf tetap, pesan lama tidak diklaim berubah', k);
    await page.click('#kkPesanUlang');
    await page.waitForFunction(() => window.InsuranceHubPesanPersonal.teks() === 'Draf yang gagal disimpan');
    k = await keadaan();
    check(/tersimpan/i.test(k.pesanStatus) && !k.ulang, 'Coba simpan lagi berhasil', k);
    await context.setOffline(true);
    await simpan('Draf offline');
    await page.waitForTimeout(300);
    k = await keadaan();
    check(/koneksi internet/i.test(k.pesanStatus) && k.ulang && k.kolom === 'Draf offline' && k.teks === 'Draf yang gagal disimpan', 'offline: tidak diklaim tersimpan, draf tetap, bisa coba lagi', k);
    await context.setOffline(false);
    await page.click('#kkPesanUlang');
    await page.waitForFunction(() => window.InsuranceHubPesanPersonal.teks() === 'Draf offline');
    await simpan(PESAN_A);
    await page.waitForFunction((t) => window.InsuranceHubPesanPersonal.teks() === t, PESAN_A);

    /* ---------- 9. Halaman ringkasan terpisah ---------- */
    console.log('\n## program-summary.html & comparison-summary.html');
    await page.evaluate(() => sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify({ customerName: 'Prospek Pesan', targets: { life: 1000000000, ci: 500000000 }, scenarios: [] })));
    for (const hal of ['comparison-summary.html', 'program-summary.html']) {
      await page.goto(base + hal, { waitUntil: 'load' });
      await page.waitForFunction(() => window.InsuranceHubPesanPersonal && window.InsuranceHubPesanPersonal.status() === 'siap');
      c = await cetak('body');
      check(c.ada && c.pesan === PESAN_A, hal + ': cetak memuat pesan dari server', c);
    }
    const simpanProgram = await page.evaluate(() => { const b = document.getElementById('programSimpanLibrary'); if (!b) return null; b.click();
      const x = JSON.parse(localStorage.getItem('insuranceHub.libraryIlustrasi.v1') || '[]')[0]; return x && x.screenKey === 'PROGRAM_SUMMARY' ? x.konsultan : null; });
    check(simpanProgram && simpanProgram.pesan === PESAN_A, 'program-summary.html: snapshot Library menyimpan pesan', simpanProgram);

    await masuk(null);
    const n404 = log.length;
    await page.goto(base + 'comparison-summary.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    check(log.length === n404 && await page.evaluate(() => window.InsuranceHubPesanPersonal.status()) === 'tidak-tersedia',
      'halaman ringkasan tanpa sesi Identity: API tidak dipanggil, tanpa pesan', log.slice(n404));
    await masuk(A);

    /* ---------- 10. Berganti akun di perangkat yang sama ---------- */
    console.log('\n## Berganti akun');
    await page.goto(base + 'index.html', { waitUntil: 'load' }); await siap(A.me.email);
    await masuk(null);
    await page.evaluate(() => window.insuranceHubLogout());
    await page.waitForLoadState('load'); await siap();
    const sesudahLogout = await page.evaluate(() => ({ teks: window.InsuranceHubPesanPersonal.teks(), status: window.InsuranceHubPesanPersonal.status() }));
    check(sesudahLogout.teks === '' && sesudahLogout.status === 'tidak-tersedia', 'sesudah logout: tidak ada pesan di memori', sesudahLogout);
    await masuk(B);
    await page.reload({ waitUntil: 'load' }); await siap(B.me.email);
    await bukaIdentitas();
    k = await keadaan();
    check(k.teks === '' && k.kolom === '' && k.pratinjauHidden, 'B login di perangkat yang sama: tidak melihat pesan A', k);
    await simpan('Pesan milik B');
    await page.waitForFunction(() => window.InsuranceHubPesanPersonal.teks() === 'Pesan milik B');
    check(JSON.parse(store.get('u/' + A.me.id + '/pesan.json')).teks === PESAN_A, 'pesan A tidak berubah oleh B');
    await masuk(A);
    await page.reload({ waitUntil: 'load' }); await siap(A.me.email);
    await bukaIdentitas();
    k = await keadaan();
    check(k.teks === PESAN_A && k.kolom === PESAN_A, 'A login lagi: pesan A kembali dari server', k);
    const tinggiDenganPesan = await page.evaluate(() => document.getElementById('kartuKonsultanPreview').closest('.blok').getBoundingClientRect().height);
    check(tinggiDenganPesan > tanpaPesan, 'blok kartu tumbuh hanya saat pesan ada', { tanpaPesan, tinggiDenganPesan });

    /* ---------- 11. Tanpa penyimpanan permanen di browser ---------- */
    const kunciAkhir = await kunciLokal();
    const baruLokal = kunciAkhir.filter((x) => !kunciAwal.includes(x) && x !== 'uji.disemai');
    check(baruLokal.every((x) => !/pesan|pribadi|personal/i.test(x)), 'tidak ada key localStorage baru untuk pesan', baruLokal);
    const salinan = await page.evaluate((t) => Object.keys(localStorage).filter((x) => x !== 'insuranceHub.libraryIlustrasi.v1' && (localStorage.getItem(x) || '').includes(t)), PESAN_A);
    check(salinan.length === 0, 'pesan tidak tersalin ke localStorage selain snapshot Library', salinan);
    const sess = await page.evaluate((t) => Object.keys(sessionStorage).filter((x) => (sessionStorage.getItem(x) || '').includes(t)), PESAN_A);
    check(sess.length === 0, 'pesan tidak tersalin ke sessionStorage', sess);
    check(pageErrors.length === 0, 'tidak ada JavaScript error', pageErrors);
  } finally {
    await browser.close();
    server.close();
  }
  console.log('\n' + (failures.length ? 'GAGAL ' + failures.length + ' dari ' + checks : 'LULUS ' + checks + '/' + checks));
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
