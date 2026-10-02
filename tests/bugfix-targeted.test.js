#!/usr/bin/env node
/* Targeted checks for Education S07/S09, Financial Planning summary data,
   and print/preview controls on a saved Library illustration.

   node tests/bugfix-targeted.test.js [--browser <chromium-or-edge-exe>] [--root <dir>]
   Playwright is optional; exit 2 means the browser dependency is unavailable.
*/
'use strict';
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
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
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
      if (!file.startsWith(ROOT + path.sep) || !require('fs').existsSync(file) || require('fs').statSync(file).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
      require('fs').createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}
const accessInit = () => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {} };
const angka = (value) => Number(String(value || '').replace(/\D/g, '')) || 0;
const hampir = (a, b, batas = 2) => Math.abs(a - b) <= batas;

/* The renderer seeks its production timeline deterministically. Mirror that
   here so each comparison reads the same end frame regardless of wall time. */
const educationInit = () => {
  try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {}
  const state = window.__educationTargetTest = { timeline: null, id: 0 };
  let player;
  Object.defineProperty(window, 'PSGStoryPlayer', {
    configurable: true,
    get: () => player,
    set: (value) => {
      player = value;
      const Timeline = value.Timeline.prototype, ready = Timeline.siapkan;
      Timeline.siapkan = function () { this.__targetId = ++state.id; state.timeline = this; return ready.apply(this, arguments); };
      Timeline.play = function () {};
    }
  });
};
const educationRenderCss = [
  '#layarSalesIdea .si-footer{display:none!important}',
  '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
  '#layarSalesIdea .eps > .si-presentation-topbar .si-back-hub,#layarSalesIdea .eps > .si-presentation-topbar .si-close,#layarSalesIdea .eps > .si-presentation-topbar [data-kbs-suara]{display:none!important}',
  '#layarSalesIdea .eps > .si-presentation-topbar{grid-template-columns:minmax(0,1fr)!important;min-height:48px!important}',
  '#layarSalesIdea .eps > .si-presentation-topbar .si-presentation-brand{grid-column:1!important}',
  '#layarSalesIdea .eps > .si-presentation-topbar .si-presentation-brand span{display:inline-flex!important}',
  '#layarSalesIdea .eps > .si-presentation-topbar .si-presentation-brand b{font-size:17px!important}',
  '#layarSalesIdea .eps-body{grid-template-rows:minmax(0,1fr) auto!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important}',
  '#layarSalesIdea .eps-text{align-content:center!important;padding:16px 20px 40px!important;gap:10px!important}',
  '#layarSalesIdea .eps-title{font-size:22px!important;line-height:1.2!important}',
  '#layarSalesIdea .eps-focus{font-size:15px!important;line-height:1.35!important}',
  '#layarSalesIdea .eps-isi{font-size:16.5px!important;line-height:1.5!important}',
  '#layarSalesIdea .eps[data-eps="6"] .eps-chip-row{display:none!important}'
].join('\n');

async function educationScene(browser, baseUrl, sceneNumber, rendererLayout) {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
  await context.addInitScript(educationInit);
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.locator('#btnSalesIdea').click();
  await page.locator('[data-si-choice="education"]').waitFor({ state: 'visible' });
  await page.locator('[data-si-choice="education"]').click();
  await page.locator('.eps[data-eps="1"]').waitFor({ state: 'attached' });
  if (rendererLayout) await page.addStyleTag({ content: educationRenderCss });
  for (let n = 2; n <= sceneNumber; n++) {
    const before = await page.evaluate(() => window.__educationTargetTest.id);
    await page.evaluate(() => document.getElementById('siNext').click());
    await page.waitForFunction(([id, n]) => {
      const state = window.__educationTargetTest;
      return state.id > id && document.querySelector('.eps[data-eps="' + n + '"]');
    }, [before, n]);
  }
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  const measured = await page.evaluate(() => {
    const state = window.__educationTargetTest, timeline = state.timeline;
    timeline.seek(timeline.durasi);
    timeline.ambient.forEach((animation) => { animation.currentTime = timeline.durasi; });
    const stage = document.querySelector('.eps-stage'), rig = stage.querySelector('.eps-rig'), sr = stage.getBoundingClientRect();
    const rel = (node) => {
      const r = node.getBoundingClientRect();
      return { x: +(r.x - sr.x).toFixed(2), y: +(r.y - sr.y).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    };
    return {
      scene: +document.querySelector('.eps').dataset.eps,
      viewBox: rig.getAttribute('viewBox').split(/\s+/).map(Number),
      stage: { w: sr.width, h: sr.height },
      ayah: rel(stage.querySelector('.eps-ortu')),
      anak: rel(stage.querySelector('.eps-anak'))
    };
  });
  await context.close();
  return measured;
}

async function nilaiPensiun(page) {
  return page.evaluate(() => {
    const amount = (s) => Number(String(s || '').replace(/\D/g, '')) || 0;
    const byLabel = (root, match) => {
      const key = [...root.querySelectorAll('.k')].find((n) => match(n.textContent.trim()));
      return key ? amount(key.parentElement.querySelector('.v')?.textContent) : 0;
    };
    const source = document.getElementById('dHasil'), summary = document.getElementById('dKotakRingkas');
    return {
      source: {
        target: byLabel(source, (s) => s.startsWith('Target dana saat usia')),
        available: byLabel(source, (s) => s.startsWith('Dana sudah tersedia')),
        shortfall: byLabel(source, (s) => s.toLowerCase().includes('kekurangan yang perlu disiapkan')),
        today: amount(document.querySelector('#dTotalHariIni .v')?.textContent)
      },
      summary: {
        target: byLabel(summary, (s) => s.startsWith('Target dana saat usia')),
        available: byLabel(summary, (s) => s.startsWith('Dana sudah tersedia')),
        shortfall: byLabel(summary, (s) => s.toLowerCase() === 'kekurangan'),
        today: byLabel(summary, (s) => s.toLowerCase() === 'kebutuhan hari ini')
      },
      penundaan: document.getElementById('dTabelTunda').innerText
    };
  });
}

(async () => {
  const server = await serve();
  const baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ headless: true, ...(browserExe ? { executablePath: browserExe } : {}) });
  try {
    console.log('Targeted regressions — Education S07/S09, DP → Ringkasan, Library Print/Preview');
    for (const n of [7, 9]) {
      const live = await educationScene(browser, baseUrl, n, false);
      const renderer = await educationScene(browser, baseUrl, n, true);
      const cameraAnchorSame = [0, 1, 2].every((i) => hampir(live.viewBox[i], renderer.viewBox[i]));
      const figuresSame = ['ayah', 'anak'].every((who) =>
        ['x', 'y'].every((key) => hampir(live[who][key], renderer[who][key], 4)));
      cek(live.scene === n && renderer.scene === n && cameraAnchorSame && figuresSame,
        'Education S' + String(n).padStart(2, '0') + ' live mempertahankan posisi karakter portrait',
        { live: { viewBox: live.viewBox, ayah: live.ayah, anak: live.anak }, renderer: { viewBox: renderer.viewBox, ayah: renderer.ayah, anak: renderer.anak } });
    }

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
    await context.addInitScript(accessInit);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.evaluate(() => window.bukaLayar('PLANNING'));
    await page.locator('#planningPension').click();
    await page.locator('#dTgl').fill('1996-10-03');
    await page.locator('#dk_rutin').fill('12000000');
    await page.locator('#dDanaAwal').fill('50000000');
    await page.locator('#dTumbuh').selectOption('0');
    await page.locator('#dLama').selectOption('20');
    const sumberSebelum = await nilaiPensiun(page);
    cek(sumberSebelum.source.target > 0 && sumberSebelum.source.shortfall > 0 && sumberSebelum.source.today > 0,
      'Financial Planning menghasilkan nilai sumber non-zero', sumberSebelum.source);
    cek(sumberSebelum.penundaan.includes('Masih sama'), 'Kasus test memasuki cabang setoran sama');
    await page.locator('#dTblRingkas').click();
    await page.locator('#layarDPRingkas.aktif').waitFor({ state: 'attached' });
    const hasil = await nilaiPensiun(page);
    const semuaCocok = ['target', 'available', 'shortfall', 'today'].every((k) => hasil.source[k] > 0 && hasil.source[k] === hasil.summary[k]);
    cek(semuaCocok, 'Financial Planning → Ringkasan membawa keempat nilai secara numerik', { source: hasil.source, summary: hasil.summary });

    await page.evaluate(() => {
      window.__targetedPrintCount = 0;
      window.__targetedPreviewCount = 0;
      window.print = () => { window.__targetedPrintCount++; };
      new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.id === 'psgPrintPreviewModal') window.__targetedPreviewCount++;
      }))).observe(document.body, { childList: true, subtree: true });
      window.InsuranceHubLibrary.saveCurrent();
    });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('insuranceHub.libraryIlustrasi.v1') || '[]').length > 0);
    await page.evaluate(() => window.bukaLayar('LIBRARY_ILUSTRASI'));
    await page.locator('#libraryIlustrasiList .lib-view').first().click();
    await page.locator('#libraryDetailModal .library-detail-head .psg-preview-btn').waitFor({ state: 'attached' });
    const controlCount = await page.evaluate(() => ({
      topPrint: document.querySelectorAll('#libraryDetailModal .library-detail-head button.aksi').length,
      topPreview: document.querySelectorAll('#libraryDetailModal .library-detail-head .psg-preview-btn').length,
      bottomPrint: document.querySelectorAll('#libraryDetailModal .library-detail-source #dTblCetak').length,
      bottomPreview: document.querySelectorAll('#libraryDetailModal .library-detail-source .psg-preview-btn').length,
      staleMarkers: document.querySelectorAll('#libraryDetailModal .library-detail-source [data-preview-attached="1"]').length
    }));
    cek(controlCount.topPrint === 1 && controlCount.topPreview === 1 && controlCount.bottomPrint === 1 && controlCount.bottomPreview === 1 && controlCount.staleMarkers === 1,
      'Library membangun ulang satu Preview untuk masing-masing tombol dan mengikat snapshot Print', controlCount);

    for (const [label, selector] of [
      ['atas', '#libraryDetailModal .library-detail-head button.aksi'],
      ['bawah', '#libraryDetailModal .library-detail-source #dTblCetak']
    ]) {
      const before = await page.evaluate(() => window.__targetedPrintCount);
      await page.locator(selector).click();
      const after = await page.evaluate(() => window.__targetedPrintCount);
      cek(after === before + 1, 'Library Print ' + label + ' memanggil aksi tepat sekali', { before, after });
    }
    for (const [label, selector] of [
      ['atas', '#libraryDetailModal .library-detail-head .psg-preview-btn'],
      ['bawah', '#libraryDetailModal .library-detail-source .psg-preview-btn']
    ]) {
      const before = await page.evaluate(() => window.__targetedPreviewCount);
      await page.locator(selector).click();
      await page.locator('#psgPrintPreviewModal').waitFor({ state: 'visible' });
      const after = await page.evaluate(() => window.__targetedPreviewCount);
      cek(after === before + 1, 'Library Preview ' + label + ' membuka satu modal', { before, after });
      await page.locator('#psgPrintPreviewModal .psg-print-preview-head .sakelar').click();
      await page.locator('#psgPrintPreviewModal').waitFor({ state: 'detached' });
    }
    cek(pageErrors.length === 0, 'Tidak ada page error selama test targeted', pageErrors);
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  process.exitCode = gagal ? 1 : 0;
  console.log(gagal ? 'HASIL: FAIL (' + gagal + ')' : 'HASIL: PASS');
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
