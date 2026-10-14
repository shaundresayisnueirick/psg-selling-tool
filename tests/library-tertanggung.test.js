#!/usr/bin/env node
'use strict';
const { pasangSesiUji } = require('./lib/sesi-uji');
/* Tertanggung yang tersimpan di Library sama dengan tertanggung produk yang
   disimpan (src/library-ilustrasi.js saveCurrent + dropdown tertanggung
   src/core.js). Untuk tiap simpanan dibandingkan, menurut ID anggota (bukan
   nama), antara:
     - dropdown & identitas form produk saat disimpan,
     - rekaman yang benar-benar tersimpan (insuredPersonId, relationship,
       customerName, insuredDobSnapshot, insuredGenderSnapshot, profileId),
     - HTML hasil di layar vs HTML tersimpan vs isi saat dibuka lagi (Lihat).
   Skenario:
     A. CRIS pasangan → COMBO anak → kembali ke CRIS → simpan CRIS
     B. COMBO anak kedua → GPRO pasangan → kembali ke COMBO → simpan COMBO
     C. sesudah kembali dari program-summary.html (dimuat ulang) → simpan CRIS & DP
     D. GPRO profil utama + CRIS "Ketik manual" → keduanya tersimpan sebagai
        orang berbeda (relationship "Ketik manual", ID manual:…), dan
        Ringkasan 1 Halaman / Paket Meeting menampilkan keduanya.
   Fixture fiktif; dua anak sengaja bernama sama.

     node tests/library-tertanggung.test.js [--root <dir>] [--browser <path>] */

const fs = require('fs');
const http = require('http');
const path = require('path');

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

const PRODUK = {
  CRIS: { l: 'layarCRIS', n: 'cNama', t: 'cTgl', j: 'cJK', u: 'cInfoUsia', hasil: 'CRIS_ILUS' },
  COMBO: { l: 'layarCOMBO', n: 'oNama', t: 'oTgl', j: 'oJK', u: 'oInfoUsia', hasil: 'COMBO_RINGKAS' },
  GPRO: { l: 'layarGPRO', n: 'qNama', t: 'qTgl', j: 'qJK', u: 'qInfoUsia', hasil: 'GPRO_RINGKAS' },
  DP: { l: 'layarDP', n: 'dNama', t: 'dTgl', j: null, u: 'dInfoUsia', hasil: 'DP_RINGKAS' }
};
const PROFIL = { id: 'fx-lib-01', nama: 'Prospek Lib', tglLahir: '1981-04-12', jk: 'PRIA', status: 'Menikah', pasangan: 'Pasangan Lib',
  family: [
    { id: 'self', nama: 'Prospek Lib', tglLahir: '1981-04-12', jk: 'PRIA', hubungan: 'Diri Sendiri' },
    { id: 'spouse', nama: 'Pasangan Lib', tglLahir: '1987-09-03', jk: 'WANITA', hubungan: 'Istri' },
    { id: 'child-0', nama: 'Anak Lib', tglLahir: '2012-06-15', jk: 'PRIA', hubungan: 'Anak' },
    { id: 'child-1', nama: 'Anak Lib', tglLahir: '2016-11-20', jk: 'WANITA', hubungan: 'Anak' }],
  children: [{ nama: 'Anak Lib', tglLahir: '2012-06-15', jk: 'PRIA' }, { nama: 'Anak Lib', tglLahir: '2016-11-20', jk: 'WANITA' }] };
const MANUAL = { nama: 'Orang Ketik Manual', tgl: '1970-01-05' };

const SKENARIO = [
  { label: 'A · CRIS pasangan → COMBO anak → kembali ke CRIS → simpan CRIS', langkah: [['pilih', 'CRIS', 'spouse'], ['pilih', 'COMBO', 'child-0'], ['buka', 'CRIS'], ['simpan', 'CRIS']] },
  { label: 'B · COMBO anak kedua → GPRO pasangan → kembali ke COMBO → simpan COMBO', langkah: [['pilih', 'COMBO', 'child-1'], ['pilih', 'GPRO', 'spouse'], ['buka', 'COMBO'], ['simpan', 'COMBO']] },
  { label: 'C · kembali dari program-summary.html (dimuat ulang) → simpan CRIS & DP', langkah: [['pilih', 'CRIS', 'spouse'], ['pilih', 'DP', 'child-1'], ['muatUlang'], ['buka', 'CRIS'], ['simpan', 'CRIS'], ['buka', 'DP'], ['simpan', 'DP']] },
  { label: 'D · GPRO profil utama + CRIS Ketik manual → Ringkasan 1 Halaman & Paket Meeting', langkah: [['pilih', 'GPRO', 'self'], ['simpan', 'GPRO'], ['manual', 'CRIS'], ['simpan', 'CRIS'], ['paket']] }
];

let checks = 0; const failures = [];
const check = (ok, message, detail) => {
  checks++;
  console.log((ok ? 'PASS ' : 'FAIL ') + checks + '. ' + message + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1200)));
  if (!ok) failures.push(message);
};

async function main() {
  const { chromium } = loadPlaywright();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browserPath = arg('--browser');
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const pageErrors = [];

  try {
    for (const sk of SKENARIO) {
      console.log('\n## ' + sk.label);
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (e) => pageErrors.push(sk.label + ': ' + e.message));
      page.on('dialog', (d) => d.accept());
      await pasangSesiUji(context);
      await context.addInitScript((profil) => {
        try {
          sessionStorage.setItem('insuranceHub.access.v3', 'ok');
          if (!sessionStorage.getItem('uji.disemai')) {
            localStorage.clear();
            localStorage.setItem('insuranceHub.customerProfiles.v1', JSON.stringify([profil]));
            localStorage.setItem('insuranceHub.customerProfile.active.v1', profil.id);
            sessionStorage.setItem('uji.disemai', '1');
          }
        } catch (_) {}
      }, PROFIL);
      const siap = async () => {
        await page.waitForFunction(() => window.InsuranceHubNavigation && window.InsuranceHubCustomerProfile && window.InsuranceHubLibrary && !document.getElementById('insuranceAccessGate'));
        await page.waitForTimeout(500);
      };
      const buka = async (k) => {
        await page.evaluate((x) => window.InsuranceHubNavigation.bukaLayar(x), k);
        await page.waitForFunction((l) => document.getElementById(l)?.classList.contains('aktif') && !!document.querySelector('#' + l + ' [data-cp-insured-selector] select'), PRODUK[k].l);
        await page.waitForTimeout(1000);
      };
      const formProduk = (k) => page.evaluate((c) => {
        const s = document.querySelector('#' + c.l + ' [data-cp-insured-selector] select'), e = (i) => i && document.getElementById(i);
        const label = s && s.selectedOptions[0] ? s.selectedOptions[0].textContent : '';
        return { dropdown: s && s.value, nama: e(c.n).value, tgl: c.t ? e(c.t).value : '', jk: c.j ? String(((e(c.j).querySelector('[aria-pressed="true"]') || {}).dataset || {}).nilai || '').toUpperCase() : '',
          usiaLabel: (label.match(/(\d+) tahun/) || [])[1] || null, usiaForm: ((e(c.u) ? e(c.u).textContent : '').match(/(\d+) tahun/) || [])[1] || null };
      }, PRODUK[k]);
      const teks = (html) => page.evaluate((h) => { const d = document.createElement('div'); d.innerHTML = h;
        d.querySelectorAll('script,style,button,.prompt-flyer-panel,.psg-preview-btn').forEach((n) => n.remove()); return d.textContent.replace(/\s+/g, ' ').trim(); }, html);

      await page.goto(base + 'index.html', { waitUntil: 'load' }); await siap();
      const fam = await page.evaluate(() => { const C = window.InsuranceHubCustomerProfile; return C.family(C.active()); });
      const anggota = (id) => fam.find((m) => m.id === id);

      for (const [aksi, k, id] of sk.langkah) {
        if (aksi === 'pilih') { await buka(k); await page.selectOption('#' + PRODUK[k].l + ' [data-cp-insured-selector] select', id); await page.waitForTimeout(1000); continue; }
        if (aksi === 'buka') { await buka(k); continue; }
        if (aksi === 'manual') {
          await buka(k);
          await page.selectOption('#' + PRODUK[k].l + ' [data-cp-insured-selector] select', '__manual__');
          await page.fill('#' + PRODUK[k].n, MANUAL.nama); await page.dispatchEvent('#' + PRODUK[k].n, 'input');
          await page.fill('#' + PRODUK[k].t, MANUAL.tgl); await page.dispatchEvent('#' + PRODUK[k].t, 'input');
          await page.waitForTimeout(1000); continue;
        }
        if (aksi === 'muatUlang') {
          await page.goto(base + 'program-summary.html', { waitUntil: 'load' });
          await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.evaluate(() => document.getElementById('programBack').click())]);
          await siap(); continue;
        }
        if (aksi === 'paket') {
          await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('LIBRARY_ILUSTRASI')); await page.waitForTimeout(400);
          const item = await page.evaluate(() => window.InsuranceHubLibrary.read().map((x) => ({ id: x.id, insuredPersonId: x.insuredPersonId, nama: x.customerName, rel: x.relationship })));
          for (const x of item) await page.click('.library-batch-toggle[data-id="' + x.id + '"]');
          await page.click('#libOnePageSummary'); await page.waitForSelector('#libraryOnePageModal');
          const orang = await page.evaluate(() => [...document.querySelectorAll('#libraryOnePageModal .summary-person')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()));
          await page.evaluate(() => document.getElementById('summaryClose').click());
          check(orang.length === 2 && orang.some((t) => t.includes(MANUAL.nama)) && orang.some((t) => t.includes(anggota('self').nama)),
            sk.label + ': Ringkasan 1 Halaman menampilkan kedua tertanggung (profil utama dan orang Ketik manual) secara terpisah', { item, orang });
          await page.click('#libBatchMeeting'); await page.waitForSelector('#libraryBatchModal');
          const paket = await page.evaluate(() => [...document.querySelectorAll('#libraryBatchModal .library-batch-item > p')].filter((p) => /Tertanggung:/.test(p.textContent)).map((p) => p.textContent.replace(/\s+/g, ' ').trim()));
          check(paket.some((t) => t.includes(MANUAL.nama) && /Ketik manual/.test(t)) && paket.some((t) => t.includes(anggota('self').nama) && /Diri Sendiri/.test(t)),
            sk.label + ': Paket Meeting menulis hubungan tiap tertanggung dengan benar', paket);
          continue;
        }
        /* simpan: buka layar hasil produk lewat tombol kanan, Simpan ke Library, lalu Lihat */
        const aktif = await page.evaluate(() => { const L = window.InsuranceHubNavigation.LAYAR; return Object.keys(L).find((x) => document.getElementById(L[x].el)?.classList.contains('aktif')); });
        if (aktif !== k) await buka(k);
        const form = await formProduk(k);
        await page.evaluate(() => document.getElementById('tblKanan').click());
        await page.waitForFunction((x) => { const L = window.InsuranceHubNavigation.LAYAR; return document.getElementById(L[x].el)?.classList.contains('aktif'); }, PRODUK[k].hasil);
        await page.waitForSelector('.layar.aktif .btn-simpan-library', { timeout: 8000 });
        await page.waitForTimeout(500);
        const htmlLayar = await page.evaluate(() => document.querySelector('.layar.aktif').innerHTML);
        const n0 = await page.evaluate(() => window.InsuranceHubLibrary.read().length);
        await page.click('.layar.aktif .btn-simpan-library');
        await page.waitForFunction((n) => window.InsuranceHubLibrary.read().length > n, n0);
        const item = await page.evaluate(() => window.InsuranceHubLibrary.read()[0]);
        await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('LIBRARY_ILUSTRASI')); await page.waitForTimeout(400);
        const kartu = await page.evaluate((id) => { const b = document.querySelector('.lib-view[data-id="' + id + '"]'); const art = b && b.closest('.library-item-card'); const rel = art && art.closest('.library-relation');
          return { tertanggung: art ? (art.querySelector('p') || {}).textContent : null, kelompok: rel ? rel.querySelector('summary span').textContent.replace(/^\W+/, '').trim() : null }; }, item.id);
        await page.click('.lib-view[data-id="' + item.id + '"]');
        await page.waitForSelector('#libraryDetailModal .library-detail-source');
        const htmlLihat = await page.evaluate(() => { const s = document.querySelector('#libraryDetailModal .library-detail-source').cloneNode(true); s.querySelector('.kop')?.remove(); return s.innerHTML; });
        await page.evaluate(() => { [...document.querySelectorAll('#libraryDetailModal .library-detail-head button')].find((b) => /Tutup/.test(b.textContent)).click(); });
        const tLayar = await teks(htmlLayar), tSimpan = await teks(item.html), tLihat = await teks(htmlLihat);

        const manual = form.dropdown === '__manual__';
        const m = manual ? null : anggota(form.dropdown);
        const harap = manual
          ? { id: 'manual:' + form.nama.toLowerCase() + '|' + form.tgl, nama: form.nama, hubungan: 'Ketik manual', tgl: form.tgl, jk: form.jk }
          : { id: m.id, nama: m.nama, hubungan: m.hubungan, tgl: m.tglLahir, jk: String(m.jk || '').toUpperCase() };
        const tersimpan = { id: item.insuredPersonId, nama: item.customerName, hubungan: item.relationship, tgl: item.insuredDobSnapshot, jk: String(item.insuredGenderSnapshot || '').toUpperCase() };
        const formCocok = manual || (form.nama === m.nama && (!PRODUK[k].t || form.tgl === m.tglLahir) && (!form.usiaLabel || form.usiaForm === form.usiaLabel));
        check(formCocok && JSON.stringify(tersimpan) === JSON.stringify(harap) && item.profileId === PROFIL.id && kartu.kelompok === harap.hubungan,
          sk.label + ': ' + k + ' tersimpan dengan tertanggung ' + harap.id + ' (' + harap.hubungan + '), tanggal lahir & jenis kelamin sesuai; kartu Library di kelompok "' + kartu.kelompok + '"',
          { form, tersimpan, harap, profileId: item.profileId, kartu });
        const usiaAda = !form.usiaForm || new RegExp('(?:^|\\D)' + form.usiaForm + ' tahun').test(tSimpan);
        check(tSimpan === tLayar && tLihat === tSimpan && tSimpan.includes(form.nama) && usiaAda,
          sk.label + ': ' + k + ' — HTML tersimpan = hasil di layar = isi saat dibuka lagi; memuat nama & usia ' + form.usiaForm + ' tahun tertanggung',
          { samaLayar: tSimpan === tLayar, samaLihat: tLihat === tSimpan, nama: tSimpan.includes(form.nama), usiaAda });
      }
      await context.close();
    }
    check(pageErrors.length === 0, 'tidak ada JavaScript error', pageErrors.slice(0, 5));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`\n${failures.length ? 'FAIL' : 'PASS'}: ${checks - failures.length}/${checks} library insured checks`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); try { server.close(); } catch (_) {} process.exitCode = 1; });
