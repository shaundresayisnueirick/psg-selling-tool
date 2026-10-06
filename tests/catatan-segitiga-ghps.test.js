#!/usr/bin/env node
/* Test terarah: catatan produk dinamis, kebersihan catatan internal di
   Preview/cetak, Segitiga Financial di Preview dan cetakan, lama bayar
   Gen Aman + GHPS dari database, dan area akhir Ringkasan Program di tema
   gelap.

   node tests/catatan-segitiga-ghps.test.js [--browser <exe>] [--root <dir>]
   Playwright opsional; exit 2 berarti dependensi browser tidak tersedia.
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
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', json: 'application/json',
  svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', mp3: 'audio/mpeg', mp4: 'video/mp4',
  webmanifest: 'application/manifest+json', woff2: 'font/woff2' };
let gagal = 0, lulus = 0;
function cek(ok, pesan, detail) {
  console.log((ok ? '  OK    ' : '  GAGAL ') + pesan + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1200)));
  if (ok) lulus++; else gagal++;
}
function bagian(judul) { console.log('\n' + judul); }
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(ROOT, '.' + rel);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}

/* ---------- data uji ---------- */
const GSPA12_W10 = { productKey: 'GSPA', productName: 'GSPA', paymentTerm: 10, protectionTerm: 99, up: 12000000000, pakaiWaiver: true };
const CRIS3 = { productKey: 'CRIS', productName: 'Cristal Prime', paymentTerm: 10, protectionTerm: 25, up: 3000000000 };
const FLEX1 = { productKey: 'FLEX', productName: 'iFLEXYGUARD', paymentTerm: 5, protectionTerm: 99, up: 1000000000 };
const CATATAN_FLEX = 'Untuk iFLEXYGUARD, Bonus 75 adalah 50% dari UP dasar awal';
/* Teks internal yang tidak boleh sampai ke dokumen nasabah (Preview, cetak, PDF). */
const INTERNAL = ['COMBO_Summary', 'sourceField', 'normalized', 'programModel', 'Program Financial Engine', 'engine kalkulator',
  'kalkulator existing', 'existing', 'Prompt Flyer AI', 'Salin prompt',
  'Nama produk disimpan sebagai detail sumber perhitungan', 'Isi nama dan kontak agen', 'Cetak atau Simpan sebagai PDF',
  'Preview', 'GPHS', '–null', 'null'];

/* tanggal lahir dengan usia Generali (ulang tahun terdekat) = n, dua bulan sesudah ulang tahun */
const tglUsia = (n) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear() - n, d.getUTCMonth(), d.getUTCDate()) - 60 * 864e5).toISOString().slice(0, 10); };

async function konteks(browser, opsi = {}) {
  const ctx = await browser.newContext({ viewport: { width: opsi.lebar || 1280, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript((o) => {
    try {
      sessionStorage.setItem('insuranceHub.access.v3', 'ok');
      if (o.tema) localStorage.setItem('insuranceHub.theme.v3', o.tema);
      if (o.konsultan) localStorage.setItem('insuranceHub.konsultan.v1', JSON.stringify(o.konsultan));
      /* sekali per tab: dipasang sebelum skrip aplikasi berjalan */
      if (o.comboImport && !sessionStorage.getItem('__ujiImport')) {
        sessionStorage.setItem('__ujiImport', '1');
        sessionStorage.setItem('insuranceHub.comboImport', JSON.stringify(o.comboImport));
      }
      if (o.hitung && !sessionStorage.getItem('__ujiHitung')) {
        sessionStorage.setItem('__ujiHitung', '1');
        localStorage.setItem('insuranceHub.segitiga.calculate.v1', JSON.stringify(o.hitung));
        localStorage.removeItem('insuranceHub.segitiga.programBuilder.v1');
      }
    } catch (_) {}
  }, opsi);
  const pg = await ctx.newPage();
  const galat = [];
  pg.on('pageerror', (e) => galat.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|quickchart/i.test(m.text())) galat.push(m.text()); });
  return { ctx, pg, galat };
}
const comboImport = (scenarios, extra) => Object.assign({ scenarios, customerName: 'Budi Uji', customerTgl: '1985-05-10', customerJk: 'PRIA',
  targets: { life: 12000000000, ci: 3000000000 }, agentName: 'Agen Uji', agentHP: '0812000' }, extra || {});

async function ringkasanCombo(browser, url, scenarios, opsi = {}) {
  const k = await konteks(browser, Object.assign({ comboImport: comboImport(scenarios, opsi.extra) }, opsi));
  await k.pg.goto(url + 'index.html');
  await k.pg.waitForURL(/program-summary\.html/, { timeout: 20000 });
  await k.pg.waitForFunction(() => document.getElementById('comboOutput') && document.getElementById('comboOutput').children.length > 2);
  await k.pg.waitForTimeout(300);
  return k;
}
/* Program Builder Segitiga: komponen dibaca dari alternatif uji. */
const hitungPayload = (items, tgl) => ({ source: 'UJI', alternativeId: 'ALT-UJI',
  alternative: { id: 'ALT-UJI', name: 'Alternatif Uji', items }, profile: { nama: 'Sari Uji', tglLahir: tgl, jk: 'WANITA', penghasilan: 20000000 } });
async function builder(browser, url, items, tgl, opsi = {}) {
  const k = await konteks(browser, Object.assign({ hitung: hitungPayload(items, tgl) }, opsi));
  await k.pg.goto(url + 'index.html');
  await k.pg.waitForFunction(() => !!window.renderCalculationHub && !!window.bukaLayar);
  await k.pg.evaluate(() => { window.bukaLayar('SOLUSI_HITUNG'); window.renderCalculationHub(); });
  await k.pg.waitForSelector('#layarSolusiHitung .sgs-pb-card');
  return k;
}
const draftUji = (pg) => pg.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('insuranceHub.segitiga.programBuilder.v1') || '{}');
  return d['ALT-UJI'] || null;
});
const kartuGhps = '#layarSolusiHitung .sgs-pb-card:has([data-field="healthPlan"])';
async function opsiLamaBayar(pg) {
  return pg.evaluate((sel) => {
    const card = document.querySelector(sel); const s = card && card.querySelector('[data-field="paymentTerm"]');
    return { opsi: s ? [...s.options].map((o) => Number(o.value)) : null, nilai: s ? Number(s.value) : null,
      catatan: card ? [...card.querySelectorAll('.catatan')].map((n) => n.textContent.trim()).filter(Boolean) : [] };
  }, kartuGhps);
}
async function hitungKartu(pg) {
  await pg.click(kartuGhps + ' .sgs-pb-calc');
  await pg.waitForTimeout(250);
  const d = await draftUji(pg);
  const item = d && d.items.find((i) => i.produk === 'GSPA_HEALTH');
  return item && d.calculated ? d.calculated[item.id] : null;
}
/* Premi Gen Aman + GHPS (+ Waiver) dihitung langsung dari engine dan fungsi
   tarif yang sama, untuk memastikan tidak ada angka buatan. */
const premiLangsung = (pg, tgl, mpp, plan, waiver) => pg.evaluate((a) => {
  const t = new Date(a.tgl + 'T00:00:00Z');
  const b = window.InsuranceHubEngine.calculate('GSPA', { nama: 'x', jk: 'WANITA', tglLahir: t, mpp: a.mpp, metode: 'Tahunan', mode: 'By UP', upDasar: 100000000,
    premiNet: 0, modeWakaf: 'Non Wakaf', nilaiWakaf: 0, persenWakaf: 0 }, { rates: DATA_GSPA });
  const g = ghpsHitung(b.usia, a.mpp, a.plan);
  const w = a.waiver ? waiverHitung(b.usia, a.mpp, 'WANITA', 100000000, b.diskon) : { tahunan: 0 };
  return { usia: b.usia, premi: b.tahunan + g.tahunan + w.tahunan };
}, { tgl, mpp, plan, waiver });

/* Elemen berlatar terang (luminansi > 0,85) yang terlihat di dalam root. */
const latarTerang = (pg, root, kecuali) => pg.evaluate((a) => {
  const R = document.querySelector(a.root); if (!R) return ['root tidak ada: ' + a.root];
  const lum = (c) => { const m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/); if (!m || (m[4] !== undefined && +m[4] < 0.5)) return null;
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255; };
  const out = [];
  [R, ...R.querySelectorAll('*')].forEach((el) => {
    if (a.kecuali && el.closest(a.kecuali)) return;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const L = lum(cs.backgroundColor); if (L !== null && L > 0.85) out.push(el.tagName + '.' + [...el.classList].join('.') + ' ' + cs.backgroundColor);
    for (const ps of ['::before', '::after']) {
      const p = getComputedStyle(el, ps); if (!p.content || p.content === 'none') continue;
      const L2 = lum(p.backgroundColor); if (L2 !== null && L2 > 0.85) out.push(el.tagName + '.' + [...el.classList].join('.') + ps + ' ' + p.backgroundColor);
    }
  });
  return out;
}, { root, kecuali });
const kontras = (fg, bg) => {
  const ch = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  const L = (c) => { const [r, g, b] = ch(c); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const a = L(fg), b = L(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const tanpaInternal = (teks) => INTERNAL.filter((w) => teks.includes(w));

/* "Detail komponen pembentuk program" adalah isi dokumen nasabah: ada di
   layar (dilipat), Preview, cetak/PDF, dan Library; isinya tabel produk yang
   benar-benar dipilih, tanpa catatan internal. */
const JUDUL_DETAIL = 'Detail komponen pembentuk program';
const rekamCetak = (pg) => pg.evaluate(() => {
  window.__ujiCetak = null;
  addEventListener('beforeprint', () => {
    const d = [...document.querySelectorAll('details.program-hidden-detail')].filter((x) => x.getClientRects().length).pop();
    window.__ujiCetak = { ada: !!d, buka: !!(d && d.open), teks: d ? d.innerText : '', tinggiTabel: d ? Math.max(0, ...[...d.querySelectorAll('table')].map((t) => Math.round(t.getBoundingClientRect().height))) : 0 };
  }, { once: true });
});
const judulPecahanSalah = (teks) => /Timeline Program — bagian/.test(teks);
async function cekDetailKomponen(pg, label, produk, root, opsi) {
  root = root || 'main'; opsi = opsi || {};
  /* layar: ada, dilipat, judul terlihat, tabel produk di dalamnya */
  const lay = await pg.evaluate((a) => {
    const d = document.querySelector(a.root + ' details.program-hidden-detail');
    return d && { buka: d.open, judul: d.querySelector('summary').innerText.trim(), terlihat: d.getBoundingClientRect().height > 0,
      cetak: !d.closest('.tanpa-cetak') && !d.classList.contains('tanpa-cetak'), penanda: d.hasAttribute('data-cetak-buka'), isi: [...d.querySelectorAll('table')].map((t) => t.textContent).join(' ') };
  }, { root });
  cek(lay && lay.terlihat && lay.judul === JUDUL_DETAIL && lay.cetak && lay.penanda && produk.every((n) => lay.isi.includes(n)),
    label + ': detail komponen ada di layar (dilipat, tanpa tanpa-cetak) dengan produk ' + produk.join(' + '), lay);
  /* Preview */
  await pg.evaluate(() => window.PSGPrintPreview.open()); await pg.waitForTimeout(300);
  const pv = await pg.evaluate(() => {
    const b = document.querySelector('.psg-print-preview-body'), d = b.querySelector('details.program-hidden-detail');
    return { ada: !!d, buka: !!(d && d.open), teks: d ? d.innerText : '', tinggiTabel: d ? Math.max(0, ...[...d.querySelectorAll('table')].map((t) => Math.round(t.getBoundingClientRect().height))) : 0 };
  });
  cek(pv.ada && pv.buka && pv.tinggiTabel > 0 && pv.teks.includes(JUDUL_DETAIL) && produk.every((n) => pv.teks.includes(n)) && !tanpaInternal(pv.teks).length,
    label + ': detail komponen terbuka di Preview, tabel produk terlihat, tanpa catatan internal', Object.assign({ bocor: tanpaInternal(pv.teks) }, pv));
  /* Preview → Cetak (PDF). Dari Library jalur ini dilewati: sejak sebelum
     perubahan ini PDF-nya kosong untuk seluruh isi (aturan cetak Library
     menyembunyikan modal Preview) — bug lama di luar cakupan. */
  if (opsi.previewCetak !== false) {
    await pg.evaluate(() => document.body.classList.add('psg-universal-preview-print'));
    await rekamCetak(pg);
    await pg.emulateMedia({ media: 'print' });
    const pdf1 = await pg.pdf({ format: 'A4', printBackground: true });
    const c1 = await pg.evaluate(() => window.__ujiCetak);
    cek(pdf1.length > 20000 && c1 && c1.buka && c1.tinggiTabel > 0 && produk.every((n) => c1.teks.includes(n)) && !tanpaInternal(c1.teks).length && !judulPecahanSalah(c1.teks),
      label + ': Preview → Cetak/PDF memuat tabel detail komponen (tanpa judul pecahan "Timeline Program")', c1);
    await pg.emulateMedia({ media: 'screen' });
    await pg.evaluate(() => document.body.classList.remove('psg-universal-preview-print'));
  }
  await pg.evaluate(() => document.querySelector('#psgPrintPreviewModal .sakelar').click());
  /* cetak langsung (Ctrl+P / tombol Cetak) → PDF; sesudahnya kembali dilipat */
  await rekamCetak(pg);
  await pg.emulateMedia({ media: 'print' });
  const pdf2 = await pg.pdf({ format: 'A4', printBackground: true });
  const c2 = await pg.evaluate(() => window.__ujiCetak);
  await pg.emulateMedia({ media: 'screen' });
  const sesudah = await pg.evaluate((r) => { const d = document.querySelector(r + ' details.program-hidden-detail'); return d && d.open; }, root);
  cek(pdf2.length > 20000 && c2 && c2.buka && c2.tinggiTabel > 0 && produk.every((n) => c2.teks.includes(n)) && !tanpaInternal(c2.teks).length && !judulPecahanSalah(c2.teks),
    label + ': cetak langsung/PDF memuat tabel detail komponen (tanpa judul pecahan "Timeline Program")', c2);
  cek(sesudah === false, label + ': sesudah cetak, detail kembali dilipat seperti di layar', sesudah);
}
/* Seluruh teks dokumen termasuk bagian tersembunyi (detail agen, prompt),
   tanpa isi <script>/<style>. */
const teksDokumen = () => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style').forEach((n) => n.remove());
  const p = document.getElementById('flyerPrompt'); return c.textContent + ' ' + (p ? p.value : ''); };

(async () => {
  const server = await serve();
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch(browserExe ? { executablePath: browserExe } : {});

  /* ================================================================ */
  bagian('1. Catatan produk hanya dari produk yang benar-benar dihitung');
  const KASUS = [
    { nama: 'GSPA + Waiver', sk: [GSPA12_W10], harus: ['Meninggal Kec. Transportasi Umum'], dilarang: ['iFLEXYGUARD', 'Bonus 75', 'Cristal', 'Cemerlang', 'BSL'] },
    { nama: 'Cristal Prime', sk: [CRIS3], harus: [], dilarang: ['iFLEXYGUARD', 'Bonus 75', 'Gen Aman', 'GSPA', 'Cemerlang'] },
    { nama: 'Gen Aman 12 M Waiver 10 + Cristal 3 M 10/25 (skenario A)', sk: [GSPA12_W10, CRIS3], harus: ['Meninggal Kec. Transportasi Umum'], dilarang: ['iFLEXYGUARD', 'Bonus 75', 'Cemerlang'] },
    { nama: 'iFLEXYGUARD dipilih', sk: [FLEX1], harus: [CATATAN_FLEX, 'Bonus 75 iFLEXYGUARD'], dilarang: ['Gen Aman', 'Cristal'] },
    { nama: 'Kombinasi GSPA + Cristal + iFLEXYGUARD (union)', sk: [GSPA12_W10, CRIS3, FLEX1], harus: [CATATAN_FLEX, 'Meninggal Kec. Transportasi Umum', 'Bonus 75 iFLEXYGUARD'], dilarang: ['Cemerlang', 'BSL'] },
  ];
  for (const ks of KASUS) {
    const { ctx, pg, galat } = await ringkasanCombo(browser, url, ks.sk);
    const r = await pg.evaluate((fn) => {
      const d = JSON.parse(sessionStorage.getItem('insuranceHub.comboGeneratedSummary') || '{}');
      return { semua: new Function('return (' + fn + ')()')(), catatan: d.html || {} };
    }, teksDokumen.toString());
    const ada = ks.harus.filter((w) => !r.semua.includes(w));
    const bocor = ks.dilarang.filter((w) => r.semua.includes(w));
    cek(!ada.length && !bocor.length, ks.nama + ': catatan dan nama produk sesuai produk terpilih', { kurang: ada, bocor });
    cek(!/COMBO_Summary/.test(r.catatan.catatanManfaat + r.catatan.catatanSlot + r.catatan.catatanTimeline), ks.nama + ': catatan sumber tanpa istilah internal', r.catatan);
    cek(!galat.length, ks.nama + ': tanpa error halaman', galat);
    await ctx.close();
  }

  /* Segitiga → Program Builder (Gen Aman + GHPS) → Ringkasan Program */
  const tgl45 = tglUsia(45);
  const ITEMS_GHPS = { health: { produk: 'GSPA_HEALTH', up: 100000000, healthPlan: 'Gold Standard', pakaiWaiver: true, paymentTerm: 15 },
    ci: { produk: 'CRIS', up: 500000000, paymentTerm: 10, protectionTerm: 25 } };
  let teksSegitigaLayar = '';
  {
    const { ctx, pg, galat } = await builder(browser, url, ITEMS_GHPS, tgl45);
    await pg.click('#sgsPbCalculateProgram'); await pg.waitForTimeout(400);
    await Promise.all([pg.waitForURL(/program-summary\.html/, { timeout: 20000 }), pg.click('#sgsPbSummary')]);
    await pg.waitForFunction(() => document.getElementById('comboOutput') && document.getElementById('comboOutput').children.length > 2);
    await pg.waitForTimeout(300);
    teksSegitigaLayar = await pg.evaluate(() => document.getElementById('comboOutput').innerText);
    const semua = await pg.evaluate((fn) => new Function('return (' + fn + ')()')(), teksDokumen.toString());
    cek(!/iFLEXYGUARD|Bonus 75/.test(semua), 'Segitiga Gen Aman + GHPS: tanpa catatan iFLEXYGUARD', semua.match(/.{40}(iFLEXYGUARD|Bonus 75).{40}/));
    cek(!/Tahun \d+–null/.test(teksSegitigaLayar) && /Mulai tahun 16/.test(teksSegitigaLayar), 'Segitiga: fase premi Health tanpa "Tahun 16–null", tetap "Mulai tahun 16"', teksSegitigaLayar.match(/Tahun[^\n]{0,40}null|Mulai tahun \d+/g));
    cek(/GHP\/GHPS/.test(semua) && !/GPHS/.test(semua), 'Segitiga: penulisan GHP/GHPS (bukan GPHS)');
    cek(!/kalkulator existing|engine kalkulator|Program Financial Engine/.test(semua), 'Segitiga: catatan/sangkalan tanpa istilah engine internal', semua.match(/.{30}(existing|engine|Engine).{30}/g));
    cek(!galat.length, 'Segitiga: tanpa error halaman', galat);

    /* 3. cetak & Preview bersih dari catatan internal; detail komponen tetap ada */
    const produkSeg = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('insuranceHub.comboGeneratedSummary')).selected.map((x) => x.productName));
    cek(produkSeg.length === 2, 'Segitiga: dua komponen terpilih', produkSeg);
    await cekDetailKomponen(pg, 'Segitiga', produkSeg);
    await pg.emulateMedia({ media: 'print' });
    await pg.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    const cetak = await pg.evaluate(() => document.body.innerText);
    await pg.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    cek(!tanpaInternal(cetak).length && /Rincian produk yang membentuk program/.test(cetak), 'Segitiga: teks cetak (detail terbuka) tanpa catatan internal/kontrol UI', tanpaInternal(cetak));
    await pg.emulateMedia({ media: 'screen' });
    await pg.evaluate(() => window.PSGPrintPreview.open()); await pg.waitForTimeout(300);
    const pv = await pg.evaluate(() => { const b = document.querySelector('.psg-print-preview-body');
      return { teks: b.innerText, tombol: b.querySelectorAll('button').length, internal: b.querySelectorAll('.tanpa-cetak,textarea').length }; });
    cek(!tanpaInternal(pv.teks).length && !pv.tombol && !pv.internal, 'Segitiga: Preview tanpa catatan internal, tombol, prompt', { bocor: tanpaInternal(pv.teks), tombol: pv.tombol, internal: pv.internal });
    await ctx.close();
  }

  /* ================================================================ */
  bagian('2. Stale state: catatan mengikuti hitungan terakhir saja');
  {
    const { ctx, pg, galat } = await ringkasanCombo(browser, url, [FLEX1]);
    const t1 = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('insuranceHub.comboGeneratedSummary')).html.catatanTimeline);
    /* tab yang sama, impor berikutnya tanpa iFLEXYGUARD */
    await pg.evaluate((p) => { sessionStorage.setItem('insuranceHub.comboImport', JSON.stringify(p)); }, comboImport([GSPA12_W10, CRIS3]));
    await pg.goto(url + 'index.html');
    await pg.waitForURL(/program-summary\.html/, { timeout: 20000 }); await pg.waitForTimeout(500);
    const r2 = await pg.evaluate((fn) => ({ t: JSON.parse(sessionStorage.getItem('insuranceHub.comboGeneratedSummary')).html.catatanTimeline, semua: new Function('return (' + fn + ')()')() }), teksDokumen.toString());
    cek(t1.includes(CATATAN_FLEX) && !r2.t.includes('iFLEXYGUARD') && !/iFLEXYGUARD|Bonus 75/.test(r2.semua), 'Ringkasan berikutnya tidak membawa catatan iFLEXYGUARD dari ringkasan sebelumnya', { t1, t2: r2.t });
    /* layar Kombinasi: hitung ulang dengan susunan berbeda */
    await pg.goto(url + 'index.html');
    await pg.waitForFunction(() => typeof oHitung === 'function');
    const lay = await pg.evaluate(() => {
      document.getElementById('oTgl').value = '1985-05-10';
      const slot = (produk, lamaBayar, up) => ({ produk, lamaBayar, lamaLindung: produk === 'Cristal Prime' ? 25 : 99, up, modeWakaf: 'Non Wakaf', nilaiWakaf: 0, persenWakaf: 0.4, pakaiWaiver: false });
      oSlot = [slot('iFLEXYGUARD', 5, 1000000000)]; oHitung();
      const a = document.getElementById('oCatatanTimeline').textContent;
      oSlot = [slot('Cristal Prime', 10, 3000000000)]; oHitung();
      const b = document.getElementById('oCatatanTimeline').textContent;
      oSlot = [slot('iFLEXYGUARD', 10, 1000000000)]; oHitung();   /* tidak sah untuk usia ini → tidak aktif */
      const c = document.getElementById('oCatatanTimeline').textContent;
      return { a, b, c, ls: Object.keys(localStorage).filter((k) => /combo|catatan/i.test(k)) };
    });
    cek(lay.a.includes(CATATAN_FLEX) && !lay.b.includes('iFLEXYGUARD') && !lay.c.includes('iFLEXYGUARD'),
      'Layar Kombinasi: catatan iFLEXYGUARD hilang setelah iFLEXYGUARD dikeluarkan atau tidak sah', lay);
    cek(!lay.ls.length, 'Catatan tidak disimpan di localStorage', lay.ls);
    cek(!galat.length, 'Stale state: tanpa error halaman', galat);
    await ctx.close();
  }

  /* ================================================================ */
  bagian('3. Ringkasan Program (Analisa Kebutuhan → Kombinasi): detail komponen tetap ada, catatan internal tidak tercetak');
  {
    /* agen sengaja dikosongkan: petunjuk "Isi nama dan kontak agen" hanya untuk layar */
    const { ctx, pg, galat } = await ringkasanCombo(browser, url, [GSPA12_W10, CRIS3], { extra: { agentName: '', agentHP: '' } });
    const layar = await pg.evaluate(() => document.body.innerText);
    cek(/Isi nama dan kontak agen/.test(layar) && /Prompt Flyer AI/.test(layar) && /Detail komponen pembentuk program/.test(layar),
      'Layar agen tetap menampilkan petunjuk, detail komponen, dan Prompt Flyer AI');
    await pg.emulateMedia({ media: 'print' });
    const cetak = await pg.evaluate(() => document.body.innerText);
    cek(!tanpaInternal(cetak).length, 'Teks cetak tanpa catatan internal/kontrol UI', tanpaInternal(cetak));
    cek(/Ilustrasi gabungan beberapa polis/.test(cetak) && /Manfaat sejenis dari beberapa polis digabung/.test(cetak), 'Sangkalan dan catatan nasabah tetap tercetak');
    const wm = await pg.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage);
    cek(/logo-psg/.test(wm), 'Watermark cetak tetap ada', wm);
    await pg.emulateMedia({ media: 'screen' });
    await pg.evaluate(() => window.PSGPrintPreview.open()); await pg.waitForTimeout(300);
    const pv = await pg.evaluate(() => { const b = document.querySelector('.psg-print-preview-body');
      return { teks: b.innerText, tombol: b.querySelectorAll('button').length, internal: b.querySelectorAll('.tanpa-cetak,textarea').length }; });
    cek(!tanpaInternal(pv.teks).length && !pv.tombol && !pv.internal, 'Preview tanpa catatan internal, tombol kontrol, prompt', { bocor: tanpaInternal(pv.teks), tombol: pv.tombol, internal: pv.internal });
    await pg.evaluate(() => document.querySelector('#psgPrintPreviewModal .sakelar').click());
    /* detail komponen: layar, Preview, cetak/PDF */
    const PRODUK_A = ['GSPA', 'Cristal Prime'];
    await cekDetailKomponen(pg, 'Ringkasan Program', PRODUK_A);
    /* Library: tersimpan, terbuka di Preview dan saat dicetak dari Library */
    await pg.click('#programSimpanLibrary'); await pg.waitForTimeout(300);
    const lib = await pg.evaluate(() => { const a = JSON.parse(localStorage.getItem('insuranceHub.libraryIlustrasi.v1') || '[]'); const x = a[0];
      return x && { id: x.id, adaDetail: /program-hidden-detail/.test(x.html) && /data-cetak-buka/.test(x.html), html: x.html }; });
    cek(lib && lib.adaDetail && PRODUK_A.every((n) => lib.html.includes(n)) && !/Nama produk disimpan|Prompt Flyer AI/.test(lib.html),
      'Library: detail komponen ikut tersimpan bersama produknya, tanpa prompt/catatan internal', lib && { adaDetail: lib.adaDetail });
    await pg.goto(url + 'index.html');
    await pg.waitForFunction(() => !!window.bukaLayar && !!window.InsuranceHubLibrary);
    await pg.evaluate(() => window.bukaLayar('LIBRARY_ILUSTRASI')); await pg.waitForTimeout(400);
    await pg.click('.lib-view[data-id="' + lib.id + '"]'); await pg.waitForTimeout(400);
    await cekDetailKomponen(pg, 'Library', PRODUK_A, '#libraryDetailModal', { previewCetak: false });
    cek(!galat.length, 'Cetak & Library: tanpa error halaman', galat);
    await ctx.close();
  }

  /* ================================================================ */
  bagian('4–5. Segitiga Financial di Preview dan cetakan');
  const WARNA = { atap: 'rgb(91, 107, 87)', life: 'rgb(62, 167, 214)', ci: 'rgb(242, 184, 198)', health: 'rgb(224, 163, 46)', nomor: 'rgb(18, 33, 46)' };
  const ukurSegitiga = (pg, root) => pg.evaluate((root) => {
    const R = document.querySelector(root); const q = (s) => R ? [...R.querySelectorAll(s)] : [];
    const cs = (n) => getComputedStyle(n);
    const atap = q('.sgt-atap')[0], life = q('.sgt-lapis.sgt-life')[0];
    const ra = atap && atap.getBoundingClientRect(), rl = life && life.getBoundingClientRect();
    return {
      bungkus: q('.sgt-bungkus').length, atap: q('.sgt-atap').length, lapis: q('.sgt-lapis').length,
      judul: q('.sgt-gambar .sgt-judul').map((n) => n.textContent.trim()),
      nomor: q('.sgt-gambar .sgt-nomor').map((n) => n.textContent.trim()),
      warna: { atap: atap && cs(atap).backgroundColor, life: life && cs(life).backgroundColor,
        ci: q('.sgt-lapis.sgt-ci')[0] && cs(q('.sgt-lapis.sgt-ci')[0]).backgroundColor,
        health: q('.sgt-lapis.sgt-health')[0] && cs(q('.sgt-lapis.sgt-health')[0]).backgroundColor,
        nomor: q('.sgt-gambar .sgt-nomor')[0] && cs(q('.sgt-gambar .sgt-nomor')[0]).backgroundColor },
      exact: [atap, life, q('.sgt-gambar .sgt-nomor')[0]].filter(Boolean).map((n) => cs(n).printColorAdjust || cs(n).webkitPrintColorAdjust),
      teksAtap: atap && cs(atap.querySelector('.sgt-judul')).webkitTextFillColor, teksLife: life && cs(life.querySelector('.sgt-judul')).webkitTextFillColor,
      celah: ra && rl ? Math.round(rl.top - ra.bottom) : null,
      tombolLain: q('button:not([data-preview-preserve])').length,
      fokus: q('button[data-preview-preserve]').map((b) => b.getAttribute('tabindex')),
    };
  }, root);
  for (const tema of ['original', 'dark']) {
    const { ctx, pg, galat } = await konteks(browser, { tema, konsultan: { nama: 'Wulan Konsultan', whatsapp: '08123456789' } });
    await pg.goto(url + 'index.html');
    await pg.waitForFunction(() => !!window.bukaLayar && !!window.PSGPrintPreview);
    await pg.evaluate(() => window.bukaLayar('SEGITIGA')); await pg.waitForTimeout(300);
    for (const k of ['ci', 'pensiun']) { await pg.click('[data-sgt-prio="' + k + '"]'); await pg.waitForTimeout(120); }
    /* perilaku layar asli tetap: lapis bisa diketuk */
    await pg.click('#layarSegitiga .sgt-lapis.sgt-life'); await pg.waitForTimeout(150);
    const aktif = await pg.evaluate(() => !!document.querySelector('#layarSegitiga .sgt-lapis.sgt-life.aktif'));
    cek(aktif, tema + ': lapis Segitiga di layar tetap bisa diketuk (tidak terganggu penanda Preview)');
    await pg.click('#sgtTblRingkas'); await pg.waitForTimeout(400);
    const layar = await ukurSegitiga(pg, '#layarSegitigaRingkas');
    await pg.evaluate(() => window.PSGPrintPreview.open()); await pg.waitForTimeout(400);
    const pv = await ukurSegitiga(pg, '.psg-print-preview-body');
    const JUDUL = ['TUA / PENSIUN', 'LIFE', 'CRITICAL ILLNESS', 'HEALTH'];
    cek(pv.bungkus === 1 && pv.atap === 1 && pv.lapis === 3 && JSON.stringify(pv.judul) === JSON.stringify(JUDUL),
      tema + ': Preview memuat .sgt-bungkus, atap TUA / PENSIUN, dan 3 lapis', pv);
    cek(JSON.stringify(pv.nomor) === JSON.stringify(layar.nomor) && pv.nomor.length === 2, tema + ': nomor prioritas ikut di Preview', { layar: layar.nomor, preview: pv.nomor });
    cek(JSON.stringify(pv.warna) === JSON.stringify(WARNA) && JSON.stringify(layar.warna) === JSON.stringify(WARNA), tema + ': warna Segitiga di layar dan Preview sama', { layar: layar.warna, preview: pv.warna });
    cek(pv.tombolLain === 0 && pv.fokus.every((t) => t === '-1'), tema + ': di Preview tombol kontrol dibuang, tombol gambar tidak bisa difokus', pv);
    /* Preview → Cetak */
    await pg.evaluate(() => document.body.classList.add('psg-universal-preview-print'));
    await pg.emulateMedia({ media: 'print' });
    const pc = await ukurSegitiga(pg, '.psg-print-preview-body');
    cek(JSON.stringify(pc.warna) === JSON.stringify(WARNA) && pc.exact.every((v) => v === 'exact'), tema + ': Preview → Cetak: warna Segitiga tercetak (print-color-adjust exact)', pc);
    cek(pc.teksAtap === 'rgb(247, 248, 244)' && pc.teksLife === 'rgb(18, 33, 46)', tema + ': Preview → Cetak: warna teks lapis sama dengan layar', { atap: pc.teksAtap, life: pc.teksLife });
    cek(pc.celah !== null && pc.celah >= 0 && pc.celah <= 12, tema + ': Preview → Cetak: atap tidak menimpa LIFE dan tanpa ruang kosong', pc.celah);
    const kartu = await pg.evaluate(() => { const k = document.querySelector('.psg-print-preview-body .psg-consultant-print'); return k && [getComputedStyle(k).backgroundColor, getComputedStyle(k).color]; });
    cek(kartu && kartu[0] === 'rgb(255, 255, 255)', tema + ': Preview → Cetak: identitas konsultan tetap putih/netral', kartu);
    const pdf1 = await pg.pdf({ format: 'A4', printBackground: true });
    cek(pdf1.length > 20000, tema + ': PDF dari Preview terbentuk', pdf1.length);
    await pg.emulateMedia({ media: 'screen' });
    await pg.evaluate(() => { document.body.classList.remove('psg-universal-preview-print'); document.querySelector('#psgPrintPreviewModal .sakelar').click(); });
    /* cetak langsung dari layar */
    await pg.emulateMedia({ media: 'print' });
    const pl = await ukurSegitiga(pg, '#layarSegitigaRingkas');
    cek(JSON.stringify(pl.warna) === JSON.stringify(WARNA) && pl.exact.every((v) => v === 'exact') && pl.teksAtap === 'rgb(247, 248, 244)',
      tema + ': cetak langsung: warna Segitiga tercetak', pl);
    cek(pl.celah !== null && pl.celah >= 0 && pl.celah <= 12 && pl.atap === 1 && pl.lapis === 3, tema + ': cetak langsung: susunan atap dan 3 lapis utuh', pl);
    const pdf2 = await pg.pdf({ format: 'A4', printBackground: false });
    cek(pdf2.length > 20000, tema + ': PDF cetak langsung terbentuk (opsi latar belakang mati)', pdf2.length);
    await pg.emulateMedia({ media: 'screen' });
    cek(!galat.length, tema + ': Segitiga tanpa error halaman', galat);
    await ctx.close();
  }

  /* ================================================================ */
  bagian('6. Lama bayar Gen Aman + GHPS dari database');
  const harapan = (pg, usia, plan, waiver) => pg.evaluate((a) => Object.keys(DATA_GSPA.dasar).filter((k) => k in DATA_GHPS.batasUsia).map(Number)
    .filter((m) => DATA_GSPA.dasar[m].WANITA[a.usia] != null && a.usia <= DATA_GHPS.batasUsia[m] && DATA_GHPS.tarif[a.usia] && DATA_GHPS.tarif[a.usia][a.plan]
      && (!a.waiver || DATA_WAIVER[m].WANITA[a.usia] != null)).sort((x, y) => x - y), { usia, plan, waiver });
  const KASUS_GHPS = [
    { usia: 45, simpan: 15, plan: 'Gold Standard', waiver: true, opsi: [5, 10, 15], jadi: 15 },
    { usia: 60, simpan: 15, plan: 'Gold Standard', waiver: true, opsi: [5, 10, 15], jadi: 15 },
    { usia: 61, simpan: 15, plan: 'Gold Standard', waiver: true, opsi: [5, 10], jadi: 10 },
    { usia: 65, simpan: 10, plan: 'Titanium', waiver: false, opsi: [5, 10], jadi: 10 },
    { usia: 65, simpan: 15, plan: 'Diamond Deluxe', waiver: true, opsi: [5, 10], jadi: 10 },
    { usia: 70, simpan: 10, plan: 'Gold Standard', waiver: true, opsi: [5], jadi: 5 },
    { usia: 71, simpan: 5, plan: 'Gold Standard', waiver: true, opsi: [], jadi: null },
  ];
  for (const ks of KASUS_GHPS) {
    const tgl = tglUsia(ks.usia);
    const label = 'usia ' + ks.usia + ', tersimpan ' + ks.simpan + ' th, ' + ks.plan + ', Waiver ' + (ks.waiver ? 'ON' : 'OFF');
    const { ctx, pg, galat } = await builder(browser, url, { health: { produk: 'GSPA_HEALTH', up: 100000000, healthPlan: ks.plan, pakaiWaiver: ks.waiver, paymentTerm: ks.simpan } }, tgl);
    const usiaEngine = await pg.evaluate((t) => usiaGenerali(new Date(t + 'T00:00:00Z')), tgl);
    const db = await harapan(pg, ks.usia, ks.plan, ks.waiver);
    const o = await opsiLamaBayar(pg);
    cek(usiaEngine === ks.usia && JSON.stringify(o.opsi) === JSON.stringify(ks.opsi) && JSON.stringify(db) === JSON.stringify(ks.opsi),
      label + ': pilihan lama bayar = ' + JSON.stringify(ks.opsi) + ' (sesuai database)', { usiaEngine, ui: o.opsi, database: db });
    const r = await hitungKartu(pg);
    if (ks.jadi === null) {
      cek(r && r.ok === false && o.catatan.some((c) => /Tidak ada lama bayar/.test(c)), label + ': tanpa pilihan, perhitungan gagal dengan alasan engine (tanpa angka)', { r, catatan: o.catatan });
    } else {
      const langsung = await premiLangsung(pg, tgl, ks.jadi, ks.plan, ks.waiver);
      cek(o.nilai === ks.jadi && r && r.ok && r.paymentTerm === ks.jadi && Math.abs(r.premium - langsung.premi) < 0.01,
        label + ': dipakai ' + ks.jadi + ' th, premi = engine GSPA + GHPS' + (ks.waiver ? ' + Waiver' : ''), { nilai: o.nilai, hasil: r && { ok: r.ok, pt: r.paymentTerm, premi: r.premium, err: r.error }, langsung });
      const disesuaikan = ks.simpan !== ks.jadi;
      cek(disesuaikan === o.catatan.some((c) => /disesuaikan menjadi/.test(c)), label + ': catatan penyesuaian ' + (disesuaikan ? 'muncul' : 'tidak muncul'), o.catatan);
    }
    if (ks.usia === 60) {
      /* ganti plan dan Waiver: daftar divalidasi ulang, pilihan 15 tetap */
      await pg.selectOption(kartuGhps + ' [data-field="healthPlan"]', 'Titanium'); await pg.waitForTimeout(250);
      const o2 = await opsiLamaBayar(pg);
      await pg.click(kartuGhps + ' .sgs-pb-switch:has([data-field="pakaiWaiver"])'); await pg.waitForTimeout(250);
      const o3 = await opsiLamaBayar(pg);
      const d = await draftUji(pg); const it = d.items.find((i) => i.produk === 'GSPA_HEALTH');
      cek(JSON.stringify(o2.opsi) === '[5,10,15]' && o2.nilai === 15 && JSON.stringify(o3.opsi) === '[5,10,15]' && it.healthPlan === 'Titanium' && it.pakaiWaiver === false,
        label + ': ganti plan/Waiver → daftar divalidasi ulang, 15 th tetap', { o2, o3, plan: it.healthPlan, waiver: it.pakaiWaiver });
    }
    cek(!galat.length, label + ': tanpa error halaman', galat);
    await ctx.close();
  }

  /* ================================================================ */
  bagian('7. Area akhir Ringkasan Program: tema gelap, terang, dan cetak');
  const KONSULTAN = { nama: 'Wulan Konsultan', jabatan: 'Financial Consultant', whatsapp: '08123456789', email: 'w@contoh.id', instagram: 'https://instagram.com/wulan' };
  for (const tema of ['dark', 'original']) {
    const { ctx, pg, galat } = await ringkasanCombo(browser, url, [GSPA12_W10, CRIS3], { tema, konsultan: KONSULTAN });
    if (tema === 'dark') {
      /* tombol tema adalah kontrol layar (tanpa-cetak), bukan isi ringkasan */
      const putihLayar = await latarTerang(pg, 'main', '.theme-switcher');
      cek(!putihLayar.length, 'Gelap: Ringkasan Program tanpa blok putih (timeline, waiver, sangkalan, kaki agen)', putihLayar);
    }
    await pg.evaluate(() => window.PSGPrintPreview.open()); await pg.waitForTimeout(400);
    const k = await pg.evaluate(() => {
      const kartu = document.querySelector('.psg-print-preview-body .psg-consultant-print');
      const nama = kartu && kartu.querySelector('.psg-consultant-name');
      const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
      const probe = document.createElement('div'); probe.style.background = surface; document.body.appendChild(probe);
      const surfaceRgb = getComputedStyle(probe).backgroundColor; probe.remove();
      return kartu && { bg: getComputedStyle(kartu).backgroundColor, fg: getComputedStyle(nama).color, surfaceRgb };
    });
    if (tema === 'dark') {
      const putih = await latarTerang(pg, '.psg-print-preview-body');
      cek(!putih.length, 'Gelap: Preview tanpa area putih di bagian akhir (termasuk identitas konsultan & pseudo-element)', putih);
      cek(k && k.bg === k.surfaceRgb && kontras(k.fg, k.bg) >= 4.5, 'Gelap: identitas konsultan memakai --surface dan terbaca (kontras ≥ 4,5)', k && Object.assign({ kontras: kontras(k.fg, k.bg).toFixed(2) }, k));
    } else {
      cek(k && k.bg === 'rgb(255, 255, 255)' && kontras(k.fg, k.bg) >= 4.5, 'Terang: identitas konsultan tetap putih dan terbaca', k);
    }
    await pg.evaluate(() => document.body.classList.add('psg-universal-preview-print'));
    await pg.emulateMedia({ media: 'print' });
    const c = await pg.evaluate(() => {
      const kartu = document.querySelector('.psg-print-preview-body .psg-consultant-print');
      const b = document.querySelector('.psg-print-preview-body');
      return { kartu: [getComputedStyle(kartu).backgroundColor, getComputedStyle(kartu).color], body: getComputedStyle(b).backgroundColor,
        html: getComputedStyle(document.body).backgroundColor, teks: b.innerText };
    });
    cek(c.kartu[0] === 'rgb(255, 255, 255)' && c.kartu[1] === 'rgb(17, 17, 17)' && c.body === 'rgb(255, 255, 255)' && c.html === 'rgb(255, 255, 255)',
      (tema === 'dark' ? 'Gelap' : 'Terang') + ': cetak/PDF tetap putih, identitas konsultan hitam di atas putih', c.kartu.concat([c.body, c.html]));
    cek(/Ilustrasi gabungan beberapa polis/.test(c.teks) && /Wulan Konsultan/.test(c.teks) && /Disajikan oleh/.test(c.teks), (tema === 'dark' ? 'Gelap' : 'Terang') + ': sangkalan, kaki agen, dan identitas konsultan tetap tercetak');
    await pg.emulateMedia({ media: 'screen' });
    cek(!galat.length, (tema === 'dark' ? 'Gelap' : 'Terang') + ': tanpa error halaman', galat);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log('\n' + (gagal ? 'GAGAL' : 'LULUS') + ' — ' + lulus + ' pemeriksaan lulus, ' + gagal + ' gagal.');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error('GALAT SKRIP', e); process.exit(1); });
