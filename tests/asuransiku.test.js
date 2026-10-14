#!/usr/bin/env node
'use strict';
/* Asuransiku — tes browser (Playwright).

   /api/psg/pribadi dijawab oleh logika server ASLI (netlify/lib/psg-pribadi.mts)
   di proses tes, dengan sesi Identity dan Netlify Blobs tiruan. Tidak ada
   permintaan ke store production maupun preview yang sebenarnya.

   Cakupan: login kode akses lama, pengantar → form bertahap → tinjau → simpan
   → ringkasan, beberapa polis dari beberapa perusahaan (Unit Link dan
   Tradisional), rider penyakit kritis dan kesehatan, limit tahunan + booster,
   limit per tindakan, santunan harian, field opsional kosong, edit satu polis
   tanpa mengubah polis lain, hapus rider, hapus polis, batal, gagal simpan +
   coba lagi tanpa duplikat, offline, perangkat lain, berganti akun, batas 30
   polis dan 10 rider, 4 digit nomor polis, aturan total UP, tampilan HP dan
   desktop, tanpa salinan di localStorage.

     node tests/asuransiku.test.js [--root <dir>] [--browser <path>] [--shots <dir>] */

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
const shots = arg('--shots');
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

function akun(id, email, nama) {
  return {
    me: { id, email, nama, roles: [], level: 'FC', kodeAgen: '6800' + id.slice(0, 4), status: 'aktif', emailTerkonfirmasi: true },
    user: { id, email, confirmedAt: '2026-01-01T00:00:00Z', name: nama, appMetadata: { roles: [], psg: { level: 'FC', status: 'aktif', nama } }, userMetadata: {} }
  };
}
const A = akun('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'agen.a@psg.test', 'Agen Alfa');
const B = akun('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'agen.b@psg.test', 'Agen Beta');
const C = akun('cccccccc-3333-4333-8333-cccccccccccc', 'agen.c@psg.test', 'Agen Cakra');

async function main() {
  const lib = await import(pathToFileURL(path.join(root, 'netlify/lib/psg-pribadi.mts')).href);
  const { chromium } = loadPlaywright();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browserPath = arg('--browser');
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const pageErrors = [];

  /* Netlify Blobs tiruan, dipakai bersama oleh semua "perangkat". */
  const store = new Map();
  const toko = {
    async get(k) { return store.has(k) ? JSON.parse(store.get(k)) : null; },
    async setJSON(k, v) { store.set(k, JSON.stringify(v)); },
    async delete(k) { store.delete(k); },
    async list(o) { return { blobs: [...store.keys()].filter((k) => k.startsWith(o.prefix)).map((key) => ({ key, etag: '' })) }; }
  };
  const blob = (a, id) => store.get('u/' + a.me.id + '/polis/' + id + '.json');
  const polisServer = (a) => [...store.keys()].filter((k) => k.startsWith('u/' + a.me.id + '/polis/')).map((k) => JSON.parse(store.get(k)));

  async function perangkat(lebar) {
    const st = { sesi: null, gangguan: 0, log: [] };
    const context = await browser.newContext({ viewport: { width: lebar || 390, height: lebar && lebar > 800 ? 900 : 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('dialog', (d) => { st.dialog = d.message(); return st.tolakDialog ? d.dismiss() : d.accept(); });
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('insuranceHub.access.v3', 'ok');
        if (!localStorage.getItem('uji.disemai')) { localStorage.clear(); localStorage.setItem('uji.disemai', '1'); }
      } catch (_) {}
    });
    await context.route('**/src/vendor/netlify-identity.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
      window.PSGNetlifyIdentity = { login: async () => ({}), logout: async () => {}, requestPasswordRecovery: async () => {},
        getUser: async () => (window.__ujiSesi || null) };` }));
    await context.route('**/api/psg/me', (route) => st.sesi
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: st.sesi.me }) })
      : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ authenticated: false }) }));
    await context.route('**/api/psg/pribadi**', async (route) => {
      const rq = route.request();
      const h = await rq.allHeaders();
      st.log.push({ method: rq.method(), url: rq.url() });
      if (st.gangguan > 0 && rq.method() !== 'GET') { st.gangguan--; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'storage_unavailable', message: 'x' }) }); }
      const headers = {}; for (const [k, v] of Object.entries(h)) if (!/^(content-length|connection|accept-encoding)$/i.test(k) && !k.startsWith(':')) headers[k] = v;
      const req = new Request(rq.url(), { method: rq.method(), headers, body: /^(GET|HEAD|DELETE)$/.test(rq.method()) ? undefined : (rq.postData() || '') });
      const r = await lib.tanganiPribadi(req, { ambilUser: async () => (st.sesi ? st.sesi.user : null), toko: () => toko, namaStore: lib.STORE_PREVIEW });
      const hdr = {}; r.headers.forEach((v, k) => { hdr[k] = v; });
      return route.fulfill({ status: r.status, headers: hdr, body: await r.text() });
    });
    const masuk = async (a) => {
      st.sesi = a;
      await context.addInitScript((s) => { window.__ujiSesi = s; }, a ? { id: a.me.id, email: a.me.email } : null);
      if (a) await context.addCookies([{ name: 'nf_jwt', value: 'jwt-uji', url: base }]); else await context.clearCookies();
    };
    const siap = async (email) => {
      await page.waitForFunction(() => window.InsuranceHubNavigation && window.PSGAsuransiku && !document.getElementById('insuranceAccessGate'));
      if (email) await page.waitForFunction((e) => window.InsuranceHubIdentity?.email === e, email);
      await page.waitForTimeout(300);
    };
    return { context, page, st, masuk, siap };
  }

  const keadaan = (page) => page.evaluate(() => window.PSGAsuransiku.keadaan());
  const tunggu = (page, tampilan) => page.waitForFunction((t) => window.PSGAsuransiku.keadaan().tampilan === t, tampilan);
  const teksLayar = (page) => page.evaluate(() => document.getElementById('asuransikuIsi').innerText);
  const bukaKartu = async (page) => {
    await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('PRODUK'));
    await page.click('#btnAsuransiku');
    await page.waitForFunction(() => document.getElementById('layarAsuransiku').classList.contains('aktif'));
  };
  const lanjut = (page) => page.click('#asBerikutnya');
  const kelola = async (page) => { if (!(await keadaan(page)).kelola) await page.click('#asKelola'); };
  const isiUang = async (page, id, nilai) => { await page.fill('#' + id, String(nilai)); await page.dispatchEvent('#' + id, 'change'); };

  /* Mengisi seluruh langkah form untuk satu polis (sudah di langkah 0). */
  async function isiPolis(page, p) {
    await page.fill('#asPerusahaan', p.perusahaan);
    await page.fill('#asProduk', p.produk);
    await page.selectOption('#asJenisPolis', p.jenisPolis);
    await page.fill('#asMulai', p.mulai);
    if (p.nomor) await page.fill('#asNomorAkhir', p.nomor);
    await lanjut(page);
    await page.click('[data-aw="asD_"] [data-jenis="' + p.dasar.jenis + '"]');
    await isiManfaat(page, 'asD_', p.dasar);
    await lanjut(page);
    for (let i = 0; i < (p.rider || []).length; i++) {
      const r = p.rider[i];
      await page.click('#asTambahRider');
      await page.fill('#asR' + i + '_nama', r.nama);
      await page.click('[data-aw="asR' + i + '_"] [data-jenis="' + r.jenis + '"]');
      await isiManfaat(page, 'asR' + i + '_', r);
    }
    if (shots && p.perusahaan === 'Generali') await page.screenshot({ path: path.join(shots, 'asuransiku-form-rider.png'), fullPage: true });
    await lanjut(page);
    if (p.catatan) await page.fill('#asCatatan', p.catatan);
    await lanjut(page);
  }
  async function isiManfaat(page, aw, x) {
    if (x.sistem) { await page.selectOption('#' + aw + 'sistem', x.sistem); await page.waitForSelector('#' + aw + 'sistem'); }
    if (x.sifat) await page.selectOption('#' + aw + 'sifat', x.sifat);
    for (const [k, v] of Object.entries(x.uang || {})) await isiUang(page, aw + k, v);
    for (const [k, v] of Object.entries(x.teks || {})) await page.fill('#' + aw + k, v);
  }

  const P_GENERALI = { perusahaan: 'Generali', produk: 'Produk Jiwa A', jenisPolis: 'UNIT_LINK', mulai: '2019-03-01', nomor: '48219999',
    dasar: { jenis: 'JIWA', uang: { up: 1000000000 } },
    rider: [{ nama: 'Rider PK', jenis: 'PK', sifat: 'DIPERCEPAT', uang: { up: 500000000 } },
      { nama: 'Rider Kesehatan Gold', jenis: 'KESEHATAN', sistem: 'TAHUNAN', uang: { limitTahunan: 2000000000, limitBooster: 4000000000 }, teks: { plan: 'Gold', syaratBooster: 'Setelah limit dasar habis' } }],
    catatan: 'RAHASIA-catatan-pribadi jatuh tempo Maret' };
  const P_PRU = { perusahaan: 'Prudential', produk: 'Produk PK B', jenisPolis: 'TRADISIONAL', mulai: '2021-07-15',
    dasar: { jenis: 'PK', sifat: 'BERDIRI_SENDIRI', uang: { up: 750000000 } } };
  const P_C = { perusahaan: 'Perusahaan C', produk: 'Plan Kesehatan Keluarga', jenisPolis: 'TRADISIONAL', mulai: '2023-01-10',
    dasar: { jenis: 'KESEHATAN', sistem: 'PER_KEJADIAN', uang: { limitPerKejadian: 150000000 } },
    rider: [{ nama: 'Santunan RS', jenis: 'KESEHATAN', sistem: 'HARIAN', uang: { santunanHarian: 500000 } },
      { nama: 'Proteksi Kecelakaan', jenis: 'KECELAKAAN', uang: { upMeninggal: 300000000 } }] };

  try {
    /* ---------- 1. Login kode akses lama ---------- */
    console.log('\n## Login kode akses lama');
    const d1 = await perangkat(390);
    let page = d1.page;
    await d1.masuk(null);
    await page.goto(base + 'index.html', { waitUntil: 'load' }); await d1.siap();
    const kartu = await page.evaluate(() => { const b = document.getElementById('btnAsuransiku'); const prev = b && b.previousElementSibling; return b && { judul: b.querySelector('.mode-title').textContent, desc: b.querySelector('.mode-desc').textContent, sesudah: prev && prev.id }; });
    check(kartu && kartu.judul === 'Asuransiku' && kartu.desc === 'Kenali dan tampilkan perlindungan yang sudah kamu miliki.' && kartu.sesudah === 'btnKartuKonsultan', 'kartu Asuransiku di dashboard, sesudah Identitas Konsultan', kartu);
    const nav = await page.evaluate(() => [...document.querySelectorAll('[data-psg-nav="asuransiku"]')].map((n) => n.className));
    check(nav.some((c) => /psg-link/.test(c)) && nav.some((c) => /psg-sheet-item/.test(c)), 'item navigasi samping dan menu', nav);
    await bukaKartu(page);
    let k = await keadaan(page);
    check(k.tampilan === 'tidak-tersedia' && /email terverifikasi/i.test(await teksLayar(page)), 'kode akses lama: keterangan login email terverifikasi', k);
    check(d1.st.log.length === 0, 'kode akses lama: server tidak dipanggil', d1.st.log);
    const tanpaSimpan = await page.evaluate(() => document.getElementById('layarAsuransiku').classList.contains('tanpa-simpan'));
    check(tanpaSimpan, 'layar bertanda tanpa-simpan (tidak direkam Isian Terakhir)');

    /* ---------- 2. A: pengantar → form → ringkasan ---------- */
    console.log('\n## Akun A: polis pertama');
    await d1.masuk(A);
    await page.reload({ waitUntil: 'load' }); await d1.siap(A.me.email);
    await bukaKartu(page); await tunggu(page, 'pengantar');
    check(/Mulai Isi Data/.test(await teksLayar(page)), 'belum ada data: halaman pengantar dan tombol Mulai Isi Data');
    check(/Mode uji/.test(await teksLayar(page)), 'store preview: penanda mode uji tampil');
    await page.click('#asMulai'); await tunggu(page, 'form');
    await lanjut(page);
    check(/perusahaan/i.test(await page.textContent('#asGalat')), 'langkah 1 kosong: diminta mengisi perusahaan');
    await page.fill('#asPerusahaan', 'Generali'); await page.fill('#asProduk', 'Produk Jiwa A'); await page.fill('#asMulai', '2019-03-01');
    await lanjut(page);
    check(/Jenis Polis/.test(await page.textContent('#asGalat')), 'Jenis Polis wajib dipilih');
    const opsiJenis = await page.evaluate(() => [...document.querySelectorAll('#asJenisPolis option')].map((o) => o.textContent));
    check(JSON.stringify(opsiJenis) === JSON.stringify(['Pilih jenis polis', 'Unit Link', 'Tradisional']), 'dropdown Jenis Polis: Unit Link / Tradisional', opsiJenis);
    await page.fill('#asNomorAkhir', '1234567890123456');
    const nomor = await page.inputValue('#asNomorAkhir');
    check(nomor === '1234', 'kolom nomor polis hanya menerima 4 digit', nomor);
    await page.evaluate(() => { const b = document.getElementById('asBatal'); b.click(); });
    await tunggu(page, 'pengantar');
    await page.click('#asMulai'); await tunggu(page, 'form');
    await isiPolis(page, P_GENERALI);
    if (shots) await page.screenshot({ path: path.join(shots, 'asuransiku-tinjau.png'), fullPage: true });
    const tinjau = await teksLayar(page);
    check(/Tinjau/.test(tinjau) && /Unit Link/.test(tinjau) && /Rider PK/.test(tinjau) && /•••• 4821/.test(tinjau), 'langkah Tinjau menampilkan pratinjau polis', tinjau.slice(0, 400));
    check(!tinjau.includes('RAHASIA-catatan-pribadi'), 'pratinjau tidak menampilkan isi catatan pribadi');
    await page.click('#asSimpan'); await tunggu(page, 'ringkasan');
    let srv = polisServer(A);
    check(srv.length === 1 && srv[0].jenisPolis === 'UNIT_LINK' && srv[0].nomorAkhir === '4821' && srv[0].perlindungan.length === 3 && srv[0].catatanPribadi === P_GENERALI.catatan,
      'tersimpan di server: Unit Link, 4 digit nomor, dasar + 2 rider, catatan pribadi', srv);
    const rk = srv[0].perlindungan.find((x) => x.jenis === 'KESEHATAN');
    check(rk.peran === 'RIDER' && rk.manfaat.sistem === 'TAHUNAN' && rk.manfaat.limitTahunan === 2000000000 && rk.manfaat.limitBooster === 4000000000 && rk.manfaat.syaratBooster && !('jenisPolis' in rk),
      'rider kesehatan: limit tahunan + booster, tanpa Jenis Polis sendiri', rk);
    let teks = await teksLayar(page);
    check(!teks.includes('RAHASIA-catatan-pribadi'), 'ringkasan umum tidak menampilkan catatan pribadi');
    check(await page.evaluate(() => document.querySelectorAll('.as-polis').length === 1 && document.querySelectorAll('.as-polis .as-cover-rider').length === 2),
      'rider tampil di dalam kartu polis induknya, bukan kartu sendiri');
    check(await page.evaluate(() => !document.querySelector('.as-edit, .as-hapus, #asTambah')), 'mode tampilan bersih: tanpa tombol edit/hapus');

    /* ---------- 3. Polis kedua dan ketiga ---------- */
    console.log('\n## Beberapa polis');
    await kelola(page);
    check(await page.evaluate(() => !!document.querySelector('.as-edit') && !!document.getElementById('asTambah')), 'ikon pensil membuka mode kelola (edit, hapus, tambah)');
    await page.click('#asTambah'); await tunggu(page, 'form');
    await isiPolis(page, P_PRU);
    await page.click('#asSimpan'); await tunggu(page, 'ringkasan');
    await kelola(page); await page.click('#asTambah'); await tunggu(page, 'form');
    await isiPolis(page, P_C);
    await page.click('#asSimpan'); await tunggu(page, 'ringkasan');
    srv = polisServer(A);
    check(srv.length === 3, 'tiga polis dari tiga perusahaan tersimpan', srv.map((x) => x.perusahaan));
    const pc = srv.find((x) => x.perusahaan === 'Perusahaan C');
    check(pc && pc.perlindungan[0].manfaat.sistem === 'PER_KEJADIAN' && pc.perlindungan[0].manfaat.limitPerKejadian === 150000000 && !('kamarPerHari' in pc.perlindungan[0].manfaat),
      'limit per tindakan tersimpan; field opsional kosong tidak disimpan', pc && pc.perlindungan[0]);
    check(pc && pc.perlindungan[1].manfaat.sistem === 'HARIAN' && pc.perlindungan[1].manfaat.santunanHarian === 500000, 'santunan harian tersimpan', pc && pc.perlindungan[1]);
    const stat = await page.evaluate(() => [...document.querySelectorAll('.as-stat')].map((n) => n.innerText.replace(/\s+/g, ' ')));
    check(stat[0] === '3 Polis' && stat[1] === '4 Kategori perlindungan' && stat[2] === '3 Perusahaan', 'statistik: 3 polis, 4 kategori (jiwa, PK, kesehatan, kecelakaan), 3 perusahaan', stat);
    const badge = await page.evaluate(() => [...document.querySelectorAll('.as-badge')].map((n) => n.textContent));
    check(badge.filter((b) => b === 'Unit Link').length === 1 && badge.filter((b) => b === 'Tradisional').length === 2, 'badge Jenis Polis per kartu', badge);
    teks = await teksLayar(page);
    check(/Total UP Penyakit Kritis tercatat\s*Rp1\.250\.000\.000/.test(teks), 'total UP penyakit kritis (500 jt + 750 jt) dalam satu kategori', teks.match(/Total UP[^\n]*\n?[^\n]*/g));
    check(!/Total UP Jiwa/.test(teks), 'total UP jiwa tidak ditampilkan untuk satu entri');
    check(!/Total[^\n]*Kesehatan|Total[^\n]*Kecelakaan/i.test(teks), 'manfaat kesehatan dan kecelakaan tidak dijumlahkan');
    check(/dipercepat[\s\S]*mengurangi UP jiwa/i.test(teks), 'penjelasan manfaat PK dipercepat tampil');
    check(/Aktif sejak 1 Maret 2019/.test(teks) && /Limit tahunan\s*Rp2\.000\.000\.000/.test(teks) && /Limit booster\s*Rp4\.000\.000\.000/.test(teks), 'tanggal mulai dan limit tahunan/booster tampil', teks.slice(0, 600));

    /* ---------- 4. Edit satu polis tidak mengubah polis lain ---------- */
    console.log('\n## Edit, rider, batal, hapus');
    const idGen = srv.find((x) => x.perusahaan === 'Generali').id, idPru = srv.find((x) => x.perusahaan === 'Prudential').id, idC = pc.id;
    const blobPru = blob(A, idPru), blobC = blob(A, idC);
    await kelola(page); await page.click('.as-edit[data-id="' + idGen + '"]'); await tunggu(page, 'form');
    check(await page.inputValue('#asProduk') === 'Produk Jiwa A' && await page.inputValue('#asJenisPolis') === 'UNIT_LINK', 'edit membuka data tersimpan');
    await page.selectOption('#asJenisPolis', 'TRADISIONAL');
    await lanjut(page); await lanjut(page);
    await page.click('.as-hapus-rider[data-rider="1"]');
    check(/Rider Kesehatan Gold/.test(d1.st.dialog || ''), 'hapus rider meminta konfirmasi', d1.st.dialog);
    await lanjut(page); await lanjut(page);
    await page.click('#asSimpan'); await tunggu(page, 'ringkasan');
    const gen = JSON.parse(blob(A, idGen));
    check(gen.jenisPolis === 'TRADISIONAL' && gen.perlindungan.length === 2 && gen.perlindungan[1].nama === 'Rider PK', 'polis diedit: Jenis Polis berubah, rider kesehatan terhapus, rider PK tetap', gen);
    check(blob(A, idPru) === blobPru && blob(A, idC) === blobC, 'polis lain identik byte per byte (termasuk Jenis Polis)');

    /* Batal dengan perubahan: data tersimpan tidak berubah. */
    await kelola(page); await page.click('.as-edit[data-id="' + idPru + '"]'); await tunggu(page, 'form');
    await page.fill('#asProduk', 'Diubah lalu batal');
    await page.click('#asBatal'); await tunggu(page, 'ringkasan');
    check(/Buang perubahan/.test(d1.st.dialog || '') && blob(A, idPru) === blobPru, 'Batal meminta konfirmasi dan tidak menyimpan apa pun', d1.st.dialog);

    /* Hapus polis dengan konfirmasi; menolak konfirmasi tidak menghapus. */
    await kelola(page);
    d1.st.tolakDialog = true;
    await page.click('.as-hapus[data-id="' + idC + '"]');
    await page.waitForTimeout(300);
    check(!!blob(A, idC), 'konfirmasi hapus ditolak: polis tetap ada');
    d1.st.tolakDialog = false;
    await page.click('.as-hapus[data-id="' + idC + '"]');
    await page.waitForFunction(() => window.PSGAsuransiku.keadaan().polis.length === 2);
    check(/Rider yang ikut terhapus[\s\S]*Santunan RS/.test(d1.st.dialog || '') && !blob(A, idC) && blob(A, idPru) === blobPru, 'hapus polis: konfirmasi menyebut rider, polis lain tetap', d1.st.dialog);

    /* ---------- 5. Gagal simpan, coba lagi tanpa duplikat ---------- */
    console.log('\n## Gagal simpan dan offline');
    await kelola(page); await page.click('#asTambah'); await tunggu(page, 'form');
    await isiPolis(page, { ...P_PRU, perusahaan: 'Allianz', produk: 'Produk Gagal Dulu' });
    d1.st.gangguan = 1;
    await page.click('#asSimpan');
    await page.waitForSelector('#asStatusSimpan.gagal');
    k = await keadaan(page);
    check(k.tampilan === 'form' && polisServer(A).length === 2 && /Belum tersimpan/.test(await page.textContent('#asStatusSimpan')), 'server gagal: tidak diklaim tersimpan, draf tetap di form', k);
    check(/Coba simpan lagi/.test(await page.textContent('#asSimpan')), 'tombol berubah menjadi Coba simpan lagi');
    await page.click('#asSimpan'); await tunggu(page, 'ringkasan');
    check(polisServer(A).filter((x) => x.produk === 'Produk Gagal Dulu').length === 1, 'coba lagi berhasil tanpa polis ganda');

    await d1.context.setOffline(true);
    await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('PRODUK'));
    await bukaKartu(page); await tunggu(page, 'gagal');
    teks = await teksLayar(page);
    check(/Koneksi internet diperlukan/.test(teks) && !/Generali/.test(teks), 'offline: pesan koneksi, data lama tidak ditampilkan', teks.slice(0, 300));
    check(await page.evaluate(() => !!document.getElementById('asMuatUlang')), 'offline: tombol Coba lagi tersedia');
    await d1.context.setOffline(false);
    await tunggu(page, 'ringkasan');
    check((await keadaan(page)).polis.length === 3, 'koneksi kembali: data dimuat ulang dari server');

    /* ---------- 6. Tampilan HP & desktop ---------- */
    for (const [w, h] of [[390, 844], [1280, 900]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300);
      const m = await page.evaluate(() => ({ dok: document.documentElement.scrollWidth <= window.innerWidth + 1,
        kartu: [...document.querySelectorAll('.as-polis')].every((n) => n.scrollWidth <= n.clientWidth + 1) }));
      check(m.dok && m.kartu, 'ringkasan tidak meluber pada lebar ' + w, m);
      if (shots) await page.screenshot({ path: path.join(shots, 'asuransiku-ringkasan-' + w + '.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });

    /* ---------- 7. Perangkat lain ---------- */
    console.log('\n## Perangkat lain dan berganti akun');
    const d2 = await perangkat(1280);
    await d2.masuk(A);
    await d2.page.goto(base + 'index.html', { waitUntil: 'load' }); await d2.siap(A.me.email);
    await bukaKartu(d2.page); await tunggu(d2.page, 'ringkasan');
    k = await keadaan(d2.page);
    check(k.polis.length === 3 && k.polis.some((x) => x.jenisPolis === 'TRADISIONAL' && x.perusahaan === 'Generali'), 'perangkat lain: data A muncul dari server, Jenis Polis tetap', k.polis.map((x) => x.perusahaan + ':' + x.jenisPolis));
    await d2.context.close();

    /* ---------- 8. Berganti akun di perangkat yang sama ---------- */
    await d1.masuk(null);
    await page.evaluate(() => window.insuranceHubLogout());
    await page.waitForLoadState('load'); await d1.siap();
    k = await keadaan(page);
    check(k.polis.length === 0 && k.tampilan === 'tidak-tersedia', 'sesudah logout: tidak ada data di memori', k);
    await d1.masuk(B);
    await page.reload({ waitUntil: 'load' }); await d1.siap(B.me.email);
    await bukaKartu(page); await tunggu(page, 'pengantar');
    k = await keadaan(page);
    check(k.polis.length === 0 && !/Generali|Prudential/.test(await teksLayar(page)), 'B login: tidak melihat polis A', k);

    /* ---------- 9. Batas rider dan polis ---------- */
    console.log('\n## Batas');
    await page.click('#asMulai'); await tunggu(page, 'form');
    await page.fill('#asPerusahaan', 'X'); await page.fill('#asProduk', 'Y'); await page.selectOption('#asJenisPolis', 'TRADISIONAL'); await page.fill('#asMulai', '2020-01-01');
    await lanjut(page); await page.click('[data-aw="asD_"] [data-jenis="JIWA"]'); await lanjut(page);
    for (let i = 0; i < 10; i++) await page.click('#asTambahRider');
    check(await page.evaluate(() => document.getElementById('asTambahRider').disabled && document.querySelectorAll('.as-rider-form').length === 10), '10 rider: tombol tambah rider nonaktif');
    await page.click('#asBatal'); await tunggu(page, 'pengantar');

    for (let i = 0; i < 30; i++) {
      const id = '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
      store.set('u/' + C.me.id + '/polis/' + id + '.json', JSON.stringify({ versi: 1, id, perusahaan: 'P' + i, produk: 'Produk ' + i, jenisPolis: 'TRADISIONAL', mulai: '2020-01-01', mataUang: 'IDR',
        perlindungan: [{ id: '00000000-0000-4000-9000-' + String(i).padStart(12, '0'), peran: 'DASAR', jenis: 'JIWA', manfaat: { up: 1000000 } }], dibuat: '2026-01-01T00:00:00Z', diperbarui: '2026-01-01T00:00:00Z' }));
    }
    await d1.masuk(C);
    await page.reload({ waitUntil: 'load' }); await d1.siap(C.me.email);
    await bukaKartu(page); await tunggu(page, 'ringkasan');
    await kelola(page);
    check(await page.evaluate(() => document.getElementById('asTambah').disabled) && /Batas 30 polis/.test(await teksLayar(page)), '30 polis: tombol Tambah Polis nonaktif dengan keterangan');
    teks = await teksLayar(page);
    check(/Total UP Jiwa tercatat\s*Rp30\.000\.000/.test(teks), 'total UP jiwa satu kategori satu mata uang saat semua terisi', teks.match(/Total UP[^\n]*\n?[^\n]*/g));

    /* ---------- 10. Tidak ada salinan di browser ---------- */
    const lokal = await page.evaluate(() => Object.keys(localStorage).filter((x) => /Generali|Prudential|Allianz|Produk Jiwa A|Produk PK B|Produk 29|4821|RAHASIA-catatan/.test(localStorage.getItem(x) || '') || /asuransi|pribadi/i.test(x)));
    check(lokal.length === 0, 'tidak ada data Asuransiku di localStorage', lokal);
    const sesi = await page.evaluate(() => Object.keys(sessionStorage).filter((x) => /Generali|Prudential|Produk 29|4821|RAHASIA-catatan/.test(sessionStorage.getItem(x) || '')));
    check(sesi.length === 0, 'tidak ada data Asuransiku di sessionStorage', sesi);
    check(pageErrors.length === 0, 'tidak ada JavaScript error', pageErrors);
    await d1.context.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log('\n' + (failures.length ? 'GAGAL ' + failures.length + ' dari ' + checks : 'LULUS ' + checks + '/' + checks));
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
