#!/usr/bin/env node
/* Contract + smoke test runtime (Chromium headless via Playwright).

     node tests/contract-browser.test.js                 bandingkan working tree dengan baseline
     node tests/contract-browser.test.js --record --root <dir>   rekam baseline runtime

   Playwright tidak menjadi dependensi repo: dipakai dari instalasi global
   (NODE_PATH) bila tersedia. Jam dibekukan pada 2026-09-24 10:00 WIB supaya
   usia dan hasil hitung stabil.

   Yang diperiksa:
   - login gate: terkunci, kode salah ditolak, kode benar (digest disimulasikan)
     membuka aplikasi + sambutan, level tersimpan
   - 62 kunci LAYAR, API global, semua layar terbuka tanpa error
   - hook: tombol cetak mendapat Preview, input "Tanggal lahir" mendapat usia live,
     judul "Ilustrasi … - …" mencatat presentasi di Aktivitas
   - hasil 15 kalkulator identik teks demi teks dengan baseline
   - Profil Nasabah + auto-fill, Library, Preview cetak, CSS cetak, PDF
   - alur Analisis → Perbandingan → comparison-summary → program-summary
   - tema Dark, overflow horizontal di 6 lebar layar, offline (service worker)
   - tidak ada error console */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

function loadPlaywright() {
  const tries = ['playwright', path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright')];
  for (const t of tries) { try { return require(t); } catch (_) {} }
  console.log('Playwright tidak tersedia — test browser dilewati.');
  process.exit(2);
}
const { chromium } = loadPlaywright();

const args = process.argv.slice(2);
const RECORD = args.includes('--record');
const ri = args.indexOf('--root');
const ROOT = path.resolve(ri >= 0 ? args[ri + 1] : path.join(__dirname, '..'));
const BASE_FILE = path.join(__dirname, 'contract-baseline.json');
const NOW = new Date('2026-09-24T10:00:00+07:00');
const VIEWPORTS = [360, 390, 430, 768, 1024, 1366];
const FC_HASH = '9e8209fdd3b744bec823f769d4f920104a976b15891718b2d7d5f63b00fe9afa';
const GLOBALS = ['bukaLayar', 'kembaliLayar', 'tekanKembali', 'InsuranceHubNavigation', 'InsuranceHubEngine',
  'InsuranceHubEngines', 'RayaProMaximaEngine', 'InsuranceHubBSL2', 'InsuranceHubGHP', 'InsuranceHubCustomerProfile',
  'InsuranceHubConsultantCard', 'InsuranceHubAtasNama', 'InsuranceHubLibrary', 'InsuranceHubAktivitas', 'PSGPrintPreview',
  'PSGTheme', 'insuranceHubLogout', 'insuranceHubBersihkanSesi', 'insuranceHubCabutOtorisasi', 'insuranceHubIdentitas',
  'InsuranceHubNaming', 'InsuranceHubUmum', 'InsuranceHubIsianTerakhir', 'InsuranceHubSegitiga', 'InsuranceHubSegitigaSolusi',
  'InsuranceHubDpSolusi', 'InsuranceHubSolusiPdk', 'InsuranceHubGenWealth', 'InsuranceHubRizqia', 'InsuranceHubRaya',
  'InsuranceHubSlipKomisi', 'InsuranceHubPromptFlyer', 'InsuranceHubBandingProduk', 'InsuranceHubCetakBanding',
  'InsuranceHubGhpAturan', 'InsuranceHubTunggu12', 'SalesIdea10Jari', 'renderComparisonFromSaved', 'renderCalculationHub',
  'ihUsiaGenerali', 'PSG_APP_VERSION', 'InsuranceHubLevel'];

/* ---------- server statis ---------- */
const TYPES = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', png: 'image/png',
  svg: 'image/svg+xml', webmanifest: 'application/manifest+json', json: 'application/json', txt: 'text/plain' };
function serve(root) {
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

/* ---------- skenario kalkulator (input sama untuk baseline & redesign) ---------- */
const SCENARIOS = [
  { name: 'LF', screen: 'LF', set: { fNama: 'Budi Uji', fTgl: '1990-05-20' }, read: ['relUsia', 'nmBiasa', 'nmHNW', 'nmKet', 'aturan'],
    then: { screen: 'LF_RINGKAS', read: ['relRingkas', 'ikhtisar', 'identitas'] } },
  { name: 'BSL', screen: 'BSL', set: { bNama: 'Budi Uji', bTgl: '1987-11-02' }, seg: { bLiteUp: 'Ya' }, read: ['bHasil', 'bFase', 'bInfoUP'],
    then: { screen: 'BSL_TIME', read: ['bKotakRingkas', 'bTabel'] } },
  { name: 'CRIS', screen: 'CRIS', set: { cNama: 'Budi Uji', cTgl: '1992-01-15' }, read: ['cHasil', 'cFase'],
    then: { screen: 'CRIS_ILUS', read: ['cKotakRingkas', 'cTabel'] } },
  { name: 'CEM', screen: 'CEM', set: { mNama: 'Budi Uji', mTgl: '1985-07-30' }, read: ['mHasil'],
    then: { screen: 'CEM_ILUS', read: ['mKotakRingkas', 'mTabel'] } },
  { name: 'GSPA', screen: 'GSPA', set: { gNama: 'Budi Uji', gTgl: '1982-02-11' }, seg: { gWaiverRider: 'Ya' }, read: ['gHasil', 'gFase'],
    then: { screen: 'GSPA_TIME', read: ['gKotakRingkas', 'gTabel', 'gTabelWaiver'] } },
  { name: 'FLEX', screen: 'FLEX', set: { xNama: 'Budi Uji', xTgl: '1991-09-09' }, read: ['xHasil'],
    then: { screen: 'FLEX_ILUS', read: ['xKotakRingkas', 'xTabel'] } },
  { name: 'GHP', screen: 'GHP', set: { hNama: 'Budi Uji', hTgl: '1989-06-06' }, read: ['hHasil'],
    then: { screen: 'GHP_ILUS', read: ['hKotakRingkas', 'hTabelPremi'] } },
  { name: 'GPRO', screen: 'GPRO', set: { qNama: 'Budi Uji', qTgl: '1990-03-03' }, read: ['qHasil', 'qTabelUP'] },
  { name: 'KMB', screen: 'KMB', set: { kNama: 'Budi Uji', kTgl: '1984-04-04' }, read: ['kHasil'] },
  { name: 'KPR', screen: 'KPR', set: { pNama: 'Rumah Uji' }, read: ['pHasil', 'pTabelJadwal'] },
  { name: 'R2', screen: 'R2', set: { rNama: 'Budi Uji', rTgl: '1983-08-08' }, read: ['rHasil'] },
  { name: 'DP', screen: 'DP', set: { dNama: 'Budi Uji', dTgl: '1986-10-10' }, firstInput: { in: 'dKomponen', value: '10.000.000' },
    read: ['dHasil', 'dSimulasi', 'dTabelSensitif'] },
  { name: 'RAYA', screen: 'RAYA', set: { rayaNama: 'Budi Uji', rayaTglLahir: '1985-05-05', rayaKontribusi: '30.000.000' },
    click: ['#rayaHitung'], read: ['rayaHasil'] },
  { name: 'COMBO', screen: 'COMBO', set: { oNama: 'Budi Uji', oTgl: '1980-12-12' }, click: ['#oTambah'], read: ['oHasil'] },
  { name: 'PDK', screen: 'PDK', set: { nNama: 'Budi Uji' }, click: ['#nTambah'], read: ['nHasil'] },
];

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function newContext(browser, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, timezoneId: 'Asia/Jakarta',
    serviceWorkers: opts.sw ? 'allow' : 'block', locale: 'id-ID' });
  await ctx.clock.setFixedTime(NOW);
  return ctx;
}

async function openApp(ctx, url, { login = true, stubPrint = true } = {}) {
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  pg.on('dialog', (d) => d.accept());
  await pg.addInitScript(([login, stubPrint]) => {
    if (login) try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {}
    if (stubPrint) window.print = function () { window.__printCount = (window.__printCount || 0) + 1; };
  }, [login, stubPrint]);
  await pg.goto(url, { waitUntil: 'load' });
  await pg.waitForTimeout(500);
  return { pg, errors };
}

const setVal = (pg, id, v) => pg.evaluate(([id, v]) => {
  const n = document.getElementById(id); if (!n) return false;
  n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); return true;
}, [id, v]);
const clickSeg = (pg, id, nilai) => pg.evaluate(([id, nilai]) => {
  const b = document.querySelector('#' + id + ' button[data-nilai="' + nilai + '"]'); if (b) b.click(); return !!b;
}, [id, nilai]);
const readText = (pg, ids) => pg.evaluate((ids) => {
  const o = {}; ids.forEach((id) => { const n = document.getElementById(id); o[id] = n ? n.textContent : null; }); return o;
}, ids);
const open = async (pg, key) => { await pg.evaluate((k) => window.bukaLayar(k), key); await pg.waitForTimeout(220); };

async function runScenarios(pg) {
  const out = {};
  for (const s of SCENARIOS) {
    await open(pg, s.screen);
    for (const [id, v] of Object.entries(s.set || {})) await setVal(pg, id, v);
    for (const [id, v] of Object.entries(s.seg || {})) await clickSeg(pg, id, v);
    if (s.firstInput) {
      await pg.evaluate(([c, v]) => { const n = document.querySelector('#' + c + ' input'); if (n) { n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); } }, [s.firstInput.in, s.firstInput.value]);
    }
    for (const sel of s.click || []) { await pg.click(sel); }
    await pg.waitForTimeout(300);
    const r = await readText(pg, s.read);
    if (s.then) { await open(pg, s.then.screen); Object.assign(r, await readText(pg, s.then.read)); }
    for (const k of Object.keys(r)) r[k] = norm(r[k]);
    out[s.name] = r;
  }
  return out;
}

async function main() {
  const srv = await serve(ROOT);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };
  const R = {};

  /* 1. Login gate */
  {
    const ctx = await newContext(browser, 390);
    await ctx.addInitScript((FC_HASH) => {
      const asli = crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest = function (alg, data) {
        try {
          if (new TextDecoder().decode(data) === 'uji-kontrak-fc') {
            const b = new Uint8Array(32); for (let i = 0; i < 32; i++) b[i] = parseInt(FC_HASH.substr(i * 2, 2), 16);
            return Promise.resolve(b.buffer);
          }
        } catch (_) {}
        return asli(alg, data);
      };
    }, FC_HASH);
    const { pg, errors } = await openApp(ctx, url + 'index.html', { login: false });
    const legacyToggle = pg.locator('#psgIdentityLegacyToggle');
    if (await legacyToggle.isVisible()) await legacyToggle.click();
    const locked = await pg.evaluate(() => ({ gate: !!document.getElementById('insuranceAccessGate'),
      cls: document.documentElement.classList.contains('insurance-auth-locked'),
      mainHidden: getComputedStyle(document.querySelector('main')).visibility === 'hidden' }));
    ok(locked.gate && locked.cls && locked.mainHidden, 'Login gate tidak mengunci aplikasi: ' + JSON.stringify(locked));
    await pg.fill('#insuranceAgenNama', 'Agen Uji'); await pg.fill('#insuranceAgenKode', 'UJI001');
    await pg.fill('#insuranceAccessCode', 'salah'); await pg.click('#psgIdentityLegacyWrap .insurance-access-btn'); await pg.waitForTimeout(250);
    ok(/tidak valid/i.test(await pg.textContent('#insuranceAccessError')), 'Kode salah tidak ditolak');
    await pg.fill('#insuranceAccessCode', 'uji-kontrak-fc'); await pg.click('#psgIdentityLegacyWrap .insurance-access-btn'); await pg.waitForTimeout(500);
    const after = await pg.evaluate(() => ({ gate: !!document.getElementById('insuranceAccessGate'),
      cls: document.documentElement.classList.contains('insurance-auth-locked'), welcome: !!document.getElementById('insuranceWelcome'),
      level: JSON.parse(localStorage.getItem('insuranceHub.level.v1') || '{}').level, remember: localStorage.getItem('insuranceHub.access.remember.v3') }));
    ok(!after.gate && !after.cls && after.welcome && after.level === 'FC' && after.remember === 'ok', 'Login berhasil tidak berjalan normal: ' + JSON.stringify(after));
    await pg.click('#insuranceWelcomeStart'); await pg.waitForTimeout(400);
    ok(!(await pg.$('#insuranceWelcome')), 'Sambutan tidak tertutup');
    /* logout mencabut otorisasi */
    await Promise.all([pg.waitForNavigation({ waitUntil: 'load' }), pg.evaluate(() => window.insuranceHubLogout())]);
    await pg.waitForTimeout(500);
    const lo = await pg.evaluate(() => ({ gate: !!document.getElementById('insuranceAccessGate'), remember: localStorage.getItem('insuranceHub.access.remember.v3'),
      level: JSON.parse(localStorage.getItem('insuranceHub.level.v1') || '{}').level }));
    ok(lo.gate && lo.remember === null && lo.level === 'FC', 'Logout tidak mencabut otorisasi / data kerja hilang: ' + JSON.stringify(lo));
    errors.forEach((e) => fails.push('[login] ' + e));
    await ctx.close();
  }

  /* 2. Aplikasi utama @390: layar, API, hook, kalkulator, profil, library, preview, print */
  {
    const ctx = await newContext(browser, 390);
    const { pg, errors } = await openApp(ctx, url + 'index.html');
    R.layarKeys = await pg.evaluate(() => Object.keys(window.InsuranceHubNavigation.LAYAR).sort());
    R.globals = await pg.evaluate((names) => { const o = {}; names.forEach((n) => { o[n] = typeof window[n]; }); return o; }, GLOBALS);
    R.engines = await pg.evaluate(() => window.InsuranceHubEngine.list().map((x) => x.id + '@' + x.version));
    const screens = [];
    for (const k of R.layarKeys) {
      await pg.evaluate((k) => window.bukaLayar(k), k); await pg.waitForTimeout(90);
      screens.push(await pg.evaluate((k) => { const L = window.InsuranceHubNavigation.LAYAR[k]; const n = document.getElementById(L.el);
        return { k, active: !!n && n.classList.contains('aktif') && document.querySelectorAll('.layar.aktif').length === 1,
          shown: !!n && n.getBoundingClientRect().height > 0 }; }, k));
    }
    screens.filter((s) => !s.active).forEach((s) => fails.push('Layar tidak aktif: ' + s.k));
    /* Layar kontekstual (banding, solusi, rekap) memang kosong bila dibuka tanpa alur. */
    R.shownScreens = screens.filter((s) => s.shown).map((s) => s.k).sort();
    await open(pg, 'PRODUK');

    R.calc = await runScenarios(pg);

    /* hook tanggal lahir + tombol cetak (dikumpulkan setelah semua layar pernah terbuka) */
    R.dateHooks = await pg.evaluate(() => [...document.querySelectorAll('input[type=date][data-usia-live-terpasang="1"]')].map((n) => n.id).filter(Boolean).sort());
    R.printHooks = await pg.evaluate(() => [...document.querySelectorAll('button[data-preview-attached="1"]')].map((n) => n.id).filter(Boolean).sort());
    const liveAge = await pg.evaluate(() => { const n = document.getElementById('fTgl'); const d = n && n.closest('div'); const u = d && d.querySelector('.usia-live'); return u ? u.textContent : null; });
    ok(/Usia \d+ tahun/.test(liveAge || ''), 'Usia live di bawah Tanggal lahir tidak muncul: ' + liveAge);

    /* Profil Nasabah + auto-fill */
    await open(pg, 'PROFILE');
    await setVal(pg, 'cpNama', 'Sinta Kontrak'); await setVal(pg, 'cpTgl', '1988-04-12'); await setVal(pg, 'cpPenghasilan', '15.000.000');
    await clickSeg(pg, 'cpJK', 'WANITA');
    await pg.click('#cpSimpan'); await pg.waitForTimeout(400);
    R.profile = await pg.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1') || '[]').length,
      active: !!localStorage.getItem('insuranceHub.customerProfile.active.v1'), screen: document.querySelector('.layar.aktif').id,
      fill: ['fNama', 'bNama', 'cNama', 'mNama', 'gNama', 'xNama', 'hNama', 'qNama', 'rayaNama'].map((id) => (document.getElementById(id) || {}).value) }));
    ok(R.profile.saved === 1 && R.profile.active && R.profile.fill.every((v) => v === 'Sinta Kontrak'), 'Profil / auto-fill gagal: ' + JSON.stringify(R.profile));

    /* Hook judul ilustrasi -> presentasi tercatat */
    await open(pg, 'LF'); await setVal(pg, 'fTgl', '1988-04-12'); await pg.waitForTimeout(200);
    await open(pg, 'LF_RINGKAS');
    await pg.click('#tblCetak'); await pg.waitForTimeout(300);
    const pres = await pg.evaluate(() => ({ printed: window.__printCount || 0,
      events: JSON.parse(localStorage.getItem('insuranceHub.aktivitas.kejadian.v1') || '[]').filter((x) => /presentasi/i.test(JSON.stringify(x))).length }));
    ok(pres.printed === 1 && pres.events >= 1, 'Cetak ilustrasi tidak mencatat presentasi: ' + JSON.stringify(pres));

    /* Preview cetak */
    const prev = await pg.$('#layarRingkasan .psg-preview-btn');
    ok(!!prev, 'Tombol Preview tidak terpasang di Ringkasan LF');
    if (prev) {
      await prev.click(); await pg.waitForTimeout(300);
      const m = await pg.evaluate(() => { const x = document.getElementById('psgPrintPreviewModal'); return x ? { vis: x.getBoundingClientRect().height > 100, text: x.textContent.length } : null; });
      ok(m && m.vis && m.text > 200, 'Modal Preview tidak tampil: ' + JSON.stringify(m));
      await pg.evaluate(() => { const x = document.querySelector('#psgPrintPreviewModal .psg-print-preview-actions .sakelar'); if (x) x.click(); });
      await pg.waitForTimeout(200);
      ok(!(await pg.$('#psgPrintPreviewModal')), 'Modal Preview tidak bisa ditutup');
    }

    /* Library */
    await open(pg, 'LF_RINGKAS');
    const lib = await pg.$('#layarRingkasan .btn-simpan-library');
    ok(!!lib, 'Tombol Simpan ke Library tidak ada di Ringkasan LF');
    if (lib) {
      await lib.click(); await pg.waitForTimeout(400);
      await pg.evaluate(() => { const b = document.querySelector('#libSimpanKonfirmasi, .library-save-confirm'); if (b) b.click(); });
      await open(pg, 'LIBRARY_ILUSTRASI'); await pg.waitForTimeout(300);
      R.library = await pg.evaluate(() => ({ items: JSON.parse(localStorage.getItem('insuranceHub.libraryIlustrasi.v1') || '[]').length,
        listed: /Sinta Kontrak/.test(document.getElementById('libraryIlustrasiList').textContent) }));
      ok(R.library.items >= 1 && R.library.listed, 'Library tidak menyimpan / menampilkan ilustrasi: ' + JSON.stringify(R.library));
    }

    /* CSS cetak */
    await open(pg, 'LF_RINGKAS');
    const scr = await pg.evaluate(() => ({ disc: getComputedStyle(document.getElementById('sangkalanCetak')).display,
      logo: getComputedStyle(document.querySelector('.logo-cetak')).display,
      inactive: [...document.querySelectorAll('.layar:not(.aktif)')].every((n) => getComputedStyle(n).display === 'none') }));
    ok(scr.disc === 'none' && scr.logo === 'none' && scr.inactive, 'CSS layar fungsional rusak: ' + JSON.stringify(scr));
    await pg.emulateMedia({ media: 'print' });
    const prt = await pg.evaluate(() => ({ disc: getComputedStyle(document.getElementById('sangkalanCetak')).display,
      logo: getComputedStyle(document.querySelector('.logo-cetak')).display, header: getComputedStyle(document.getElementById('bilah')).display,
      tanpa: [...document.querySelectorAll('#layarRingkasan .tanpa-cetak')].every((n) => getComputedStyle(n).display === 'none'),
      shell: [...document.querySelectorAll('.psg-shell, .psg-nav')].every((n) => getComputedStyle(n).display === 'none') }));
    ok(prt.disc === 'block' && prt.logo === 'block' && prt.header === 'none' && prt.tanpa && prt.shell, 'CSS cetak rusak: ' + JSON.stringify(prt));
    const pdf = await pg.pdf({ format: 'A4', printBackground: true });
    ok(pdf.length > 20000, 'PDF gagal dibuat');
    if (process.env.PDF_OUT) fs.writeFileSync(process.env.PDF_OUT, pdf);
    await pg.emulateMedia({ media: 'screen' });

    /* Tema gelap */
    await open(pg, 'PRODUK');
    /* Jalur yang terlihat pengguna: menu shell (HP) bila ada, atau tombol tema di header. */
    const gantiTema = async () => {
      const menu = await pg.$('.psg-tab[data-psg-nav="menu"]');
      if (menu && await menu.isVisible()) {
        await menu.click(); await pg.waitForTimeout(250);
        await pg.click('#psgSheet [data-psg-nav="tema"]');
      } else {
        await pg.click('#btnThemeSwitch');
      }
      await pg.waitForTimeout(200);
    };
    await gantiTema();
    const th = await pg.evaluate(() => [document.documentElement.dataset.theme, document.body.dataset.theme, localStorage.getItem('insuranceHub.theme.v3')]);
    ok(th.every((t) => t === 'dark'), 'Tema gelap tidak aktif: ' + th);
    await gantiTema();

    /* overflow setelah terisi hasil */
    for (const k of ['LF', 'LF_RINGKAS', 'GSPA', 'GSPA_TIME', 'BSL_TIME', 'CRIS_ILUS', 'GHP_ILUS', 'COMBO', 'KPR', 'DP', 'RAYA', 'PROFILE']) {
      await open(pg, k);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(ov <= 1, 'Overflow horizontal (terisi) @390 ' + k + ': +' + ov + 'px');
    }
    errors.filter((e) => !/favicon/.test(e)).forEach((e) => fails.push('[app] ' + e));
    await ctx.close();
  }

  /* 3. Alur Analisis -> Perbandingan -> comparison-summary -> program-summary */
  {
    const ctx = await newContext(browser, 390);
    const { pg, errors } = await openApp(ctx, url + 'index.html');
    await open(pg, 'PROFILE');
    await setVal(pg, 'cpNama', 'Budi Santoso'); await setVal(pg, 'cpTgl', '1988-04-12'); await setVal(pg, 'cpPenghasilan', '15.000.000');
    await pg.click('#cpSimpan'); await pg.waitForTimeout(300);
    await pg.evaluate(() => document.getElementById('btnNeeds').click()); await pg.waitForTimeout(250);
    await pg.click('#naHitung'); await pg.waitForTimeout(400);
    const na = norm(await pg.textContent('#naHasil'));
    await pg.evaluate(() => document.getElementById('btnCompare').click()); await pg.waitForTimeout(300);
    await pg.click('#cmpCalculate'); await pg.waitForTimeout(400);
    await pg.click('#cmpSavePreview'); await pg.waitForTimeout(400);
    const cards = norm(await pg.textContent('#cmpCards'));
    await Promise.all([pg.waitForURL(/comparison-summary\.html/), pg.click('#cmpOpenSummaryPage')]);
    await pg.waitForTimeout(500);
    const cs = await pg.evaluate(() => ({ targets: document.getElementById('targets').textContent, rows: document.querySelectorAll('#life tbody tr').length }));
    await pg.click('#life .switch'); await pg.waitForTimeout(200);
    const benefits = norm(await pg.textContent('#benefits'));
    await Promise.all([pg.waitForURL(/program-summary\.html/, { timeout: 15000 }), pg.click('#generate')]);
    await pg.waitForTimeout(700);
    const ps = await pg.evaluate(() => ({ who: document.getElementById('whoName').textContent, targets: document.getElementById('targets').textContent,
      sections: [...document.querySelectorAll('#comboOutput h2')].map((h) => h.textContent), len: document.getElementById('comboOutput').textContent.length }));
    R.flow = { needs: na, cards, targets: norm(cs.targets), rows: cs.rows, benefits, programWho: ps.who, programTargets: norm(ps.targets), programSections: ps.sections };
    ok(cs.rows >= 1 && ps.len > 500 && ps.sections.includes('Ringkasan Program'), 'Alur perbandingan/program summary gagal: ' + JSON.stringify({ rows: cs.rows, len: ps.len, s: ps.sections }));
    const ovps = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(ovps <= 1, 'Overflow horizontal program-summary @390: +' + ovps + 'px');
    /* kembali ke aplikasi */
    await Promise.all([pg.waitForURL(/index\.html/), pg.click('#programHome')]);
    await pg.waitForTimeout(400);
    ok(await pg.evaluate(() => document.getElementById('layarProduk').classList.contains('aktif')), 'Tombol Home program-summary tidak kembali ke dashboard');
    errors.filter((e) => !/favicon/.test(e)).forEach((e) => fails.push('[flow] ' + e));
    await ctx.close();
  }

  /* 4. Overflow horizontal di 6 lebar layar, kedua tema */
  R.overflow = {};
  for (const theme of ['original', 'dark']) {
    for (const w of VIEWPORTS) {
      const ctx = await newContext(browser, w);
      await ctx.addInitScript((t) => { try { localStorage.setItem('insuranceHub.theme.v3', t); } catch (_) {} }, theme);
      const { pg, errors } = await openApp(ctx, url + 'index.html');
      const keys = await pg.evaluate(() => Object.keys(window.InsuranceHubNavigation.LAYAR));
      const bad = [];
      for (const k of keys) {
        await pg.evaluate((k) => window.bukaLayar(k), k); await pg.waitForTimeout(60);
        const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ov > 1) bad.push(k + ':+' + ov);
      }
      for (const page of ['comparison-summary.html', 'program-summary.html']) {
        await pg.goto(url + page); await pg.waitForTimeout(300);
        const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (ov > 1) bad.push(page + ':+' + ov);
      }
      if (bad.length) fails.push('Overflow horizontal @' + w + ' (' + theme + '): ' + bad.join(', '));
      errors.filter((e) => !/favicon/.test(e)).forEach((e) => fails.push('[' + theme + '@' + w + '] ' + e));
      R.overflow[theme + '@' + w] = bad.length;
      await ctx.close();
    }
  }

  /* 5. Offline (service worker) */
  {
    const ctx = await newContext(browser, 390, { sw: true });
    const { pg } = await openApp(ctx, url + 'index.html');
    await pg.evaluate(async () => { await navigator.serviceWorker.ready; });
    await pg.waitForTimeout(2500);
    const cached = await pg.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k[0]); return { name: k[0], n: (await c.keys()).length }; });
    await ctx.setOffline(true);
    await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(600);
    const off = await pg.evaluate(() => ({ app: !!window.bukaLayar, css: [...document.styleSheets].some((s) => /styles\.css/.test(s.href || '') && s.cssRules.length > 100) }));
    ok(cached.n >= 60 && off.app && off.css, 'Offline gagal: ' + JSON.stringify({ cached, off }));
    R.offline = { cache: cached.name, entries: cached.n };
    await ctx.close();
  }

  await browser.close(); srv.close();

  /* ---------- rekam atau bandingkan ---------- */
  const runtime = { shownScreens: R.shownScreens, layarKeys: R.layarKeys, globals: R.globals, engines: R.engines, dateHooks: R.dateHooks, printHooks: R.printHooks, calc: R.calc, flow: R.flow };
  if (RECORD) {
    const data = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
    data.runtime = runtime;
    fs.writeFileSync(BASE_FILE, JSON.stringify(data, null, 1) + '\n');
    console.log('baseline runtime direkam (' + R.layarKeys.length + ' layar, ' + Object.keys(R.calc).length + ' skenario kalkulator).');
  } else {
    const b = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')).runtime;
    ok(JSON.stringify(runtime.layarKeys) === JSON.stringify(b.layarKeys), 'Kunci LAYAR berubah');
    for (const [n, t] of Object.entries(b.globals)) ok(runtime.globals[n] === t, 'API global berubah: ' + n + ' ' + t + ' -> ' + runtime.globals[n]);
    ok(JSON.stringify(runtime.engines) === JSON.stringify(b.engines), 'Registry engine berubah');
    b.shownScreens.forEach((k) => ok(runtime.shownScreens.includes(k), 'Layar tidak tampil: ' + k));
    b.dateHooks.forEach((id) => ok(runtime.dateHooks.includes(id), 'Hook usia live hilang: #' + id));
    b.printHooks.forEach((id) => ok(runtime.printHooks.includes(id), 'Hook Preview cetak hilang: #' + id));
    for (const [sc, vals] of Object.entries(b.calc)) for (const [id, txt] of Object.entries(vals)) {
      ok(runtime.calc[sc] && runtime.calc[sc][id] === txt, 'Hasil kalkulator berbeda: ' + sc + ' #' + id);
    }
    for (const k of Object.keys(b.flow)) ok(JSON.stringify(runtime.flow[k]) === JSON.stringify(b.flow[k]), 'Hasil alur perbandingan berbeda: ' + k);
  }

  if (fails.length) {
    console.log('\nCONTRACT BROWSER: GAGAL (' + fails.length + ')');
    [...new Set(fails)].slice(0, 80).forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('CONTRACT BROWSER: LULUS — login, ' + R.layarKeys.length + ' layar, ' + Object.keys(R.calc).length +
    ' skenario kalkulator identik, profil, library, preview, cetak/PDF, alur perbandingan, tema gelap, overflow ' +
    VIEWPORTS.join('/') + ' px (2 tema), offline (' + R.offline.entries + ' berkas di cache).');
}

main().catch((e) => { console.error(e); process.exit(1); });
