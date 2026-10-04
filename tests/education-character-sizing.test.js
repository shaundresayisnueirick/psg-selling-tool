#!/usr/bin/env node
/* Targeted nested-SVG character sizing check for Education scenes S07–S09.

   node tests/education-character-sizing.test.js --browser <chromium-or-edge-exe>
     [--screenshots <output-directory>]
*/
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadPlaywright() {
  const candidates = ['playwright'];
  if (process.env.NODE_PATH) candidates.push(path.join(process.env.NODE_PATH, 'playwright'));
  for (const candidate of candidates) {
    try { return require(candidate); } catch (_) {}
  }
  console.error('FAIL: Playwright tidak tersedia.');
  process.exit(2);
}

const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const browserExe = arg('--browser');
const screenshotsDir = arg('--screenshots');
const MIME = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json', svg: 'image/svg+xml',
  png: 'image/png', mp3: 'audio/mpeg', woff2: 'font/woff2',
  webmanifest: 'application/manifest+json'
};
const RENDER_CSS = [
  '#layarSalesIdea .si-footer{display:none!important}',
  '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
  '#layarSalesIdea .sil-kartu{display:none!important}'
].join('\n');
const PORTRAIT_CSS = [
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
const CASES = [
  { scene: 7, orientation: 'landscape', tau: 11980, width: 1280, height: 720, dpr: 1, expectedPct: [23.7, 17.75] },
  { scene: 7, orientation: 'portrait', tau: 11980, width: 360, height: 640, dpr: 2, expectedPct: [23.6, 17.7] },
  { scene: 8, orientation: 'landscape', tau: 6000, width: 1280, height: 720, dpr: 1, expectedPct: [26.5, 19.85] },
  { scene: 8, orientation: 'portrait', tau: 6000, width: 360, height: 640, dpr: 2, expectedPct: [23.04, 17.26] },
  { scene: 9, orientation: 'landscape', tau: 16000, width: 1280, height: 720, dpr: 1, expectedPct: [15.74, 11.79] },
  { scene: 9, orientation: 'portrait', tau: 16000, width: 360, height: 640, dpr: 2, expectedPct: [15.68, 11.75] }
];
const EXPECTED_DURATIONS = { 7: 20460, 8: 22380, 9: 32840 };

let failures = 0;
function check(ok, label, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) failures++;
}
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(ROOT, '.' + rel);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}
function timelineHook() {
  try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {}
  const state = window.__educationCharacterAudit = { timeline: null, id: 0 };
  let player;
  Object.defineProperty(window, 'PSGStoryPlayer', {
    configurable: true,
    get: () => player,
    set: (value) => {
      player = value;
      const Timeline = value.Timeline.prototype;
      const prepare = Timeline.siapkan;
      Timeline.siapkan = function () {
        state.id++;
        state.timeline = this;
        return prepare.apply(this, arguments);
      };
      Timeline.play = function () {};
      Timeline.putarAmbient = function () {};
    }
  });
}
async function enterScene(page, target) {
  const current = await page.evaluate(() => Number(document.querySelector('.eps').dataset.eps));
  for (let n = current + 1; n <= target; n++) {
    const before = await page.evaluate(() => window.__educationCharacterAudit.id);
    await page.evaluate(() => document.getElementById('siNext').click());
    await page.waitForFunction(([id, scene]) =>
      window.__educationCharacterAudit.id > id && document.querySelector('.eps[data-eps="' + scene + '"]'),
    [before, n]);
  }
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)))));
}
async function measure(page, testCase) {
  return page.evaluate(async ({ sceneNumber, tau }) => {
    const state = window.__educationCharacterAudit;
    const timeline = state.timeline;
    const scene = document.querySelector('.eps[data-eps="' + sceneNumber + '"]');
    const stage = scene.querySelector('.eps-stage');
    const rig = scene.querySelector('.eps-rig');
    timeline.seek(tau);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const stageRect = stage.getBoundingClientRect();
    const rigViewBox = rig.getAttribute('viewBox').trim().split(/\s+/).map(Number);
    const chars = ['.eps-ortu', '.eps-anak'].map((selector) => {
      const person = scene.querySelector(selector);
      const nested = person && person.querySelector('svg.psg-k');
      if (!nested) return null;
      const rect = nested.getBoundingClientRect();
      const inner = nested.querySelector('g');
      const bbox = inner && typeof inner.getBBox === 'function' ? inner.getBBox() : null;
      const transformedGroup = nested.parentElement;
      return {
        selector,
        widthAttr: nested.getAttribute('width'),
        heightAttr: nested.getAttribute('height'),
        widthBase: nested.width.baseVal.value,
        heightBase: nested.height.baseVal.value,
        cssWidth: getComputedStyle(nested).width,
        cssHeight: getComputedStyle(nested).height,
        viewBox: nested.getAttribute('viewBox'),
        preserveAspectRatio: nested.getAttribute('preserveAspectRatio') || 'xMidYMid meet (default)',
        parentTransform: transformedGroup.getAttribute('transform'),
        bbox: bbox && { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        stageRelativeHeight: rect.height / stageRect.height * 100,
        stageRelativeWidth: rect.width / stageRect.width * 100,
        personAnimations: timeline.anak.filter((animation) => {
          const target = animation.effect && animation.effect.target;
          return target && (target === person || person.contains(target));
        }).length
      };
    });
    return {
      scene: Number(scene.dataset.eps),
      duration: timeline.durasi,
      registeredAnimations: timeline.anak.length,
      stage: { width: stageRect.width, height: stageRect.height },
      rigViewBox,
      chars,
      camAnimations: timeline.anak.filter((animation) => animation.effect && animation.effect.target === scene.querySelector('.eps-cam')).map((animation) => ({
        duration: animation.effect.getTiming().duration,
        frames: animation.effect.getKeyframes()
      })),
      camOrigin: getComputedStyle(scene.querySelector('.eps-cam')).transformOrigin
    };
  }, { sceneNumber: testCase.scene, tau: testCase.tau });
}
function testMeasurement(testCase, result) {
  const name = 'S' + String(testCase.scene).padStart(2, '0') + ' ' + testCase.orientation;
  const chars = result.chars || [];
  const attrs = chars.length === 2 && chars.every((character) =>
    character.widthAttr === '120' && character.heightAttr === '240' &&
    character.viewBox === '0 0 120 240');
  check(attrs, name + ' nested SVG memakai width="120" height="240" dan viewBox karakter dipertahankan',
    attrs ? undefined : chars.map(({ selector, widthAttr, heightAttr, viewBox }) => ({ selector, widthAttr, heightAttr, viewBox })));

  const viewport = chars.length === 2 && chars.every((character) =>
    character.widthBase === 120 && character.heightBase === 240 &&
    character.cssWidth === '120px' && character.cssHeight === '240px' &&
    character.widthBase !== result.rigViewBox[2] && character.heightBase !== result.rigViewBox[3]);
  check(viewport, name + ' viewport aktual SVG 120×240, terpisah dari viewBox rig ' + result.rigViewBox.join(' '),
    viewport ? undefined : chars.map(({ selector, widthBase, heightBase, cssWidth, cssHeight }) => ({ selector, widthBase, heightBase, cssWidth, cssHeight })));

  const sizeRatios = chars.map((character, index) => character &&
    character.stageRelativeHeight / testCase.expectedPct[index]);
  const sizeNearReference = sizeRatios.length === 2 && sizeRatios.every((ratio) => ratio >= 0.9 && ratio <= 1.1);
  check(sizeNearReference, name + ' tinggi karakter relatif stage mendekati reference; faktor pembesaran ' + sizeRatios.map((ratio) => ratio.toFixed(3) + 'x').join(', '),
    sizeNearReference ? undefined : { actualPct: chars.map((character) => character && character.stageRelativeHeight), referencePct: testCase.expectedPct, ratios: sizeRatios });

  const parentTransformsPreserved = chars.length === 2 && chars.every((character) =>
    /^translate\(-?[\d.]+ -?[\d.]+\) scale\(-?[\d.]+ -?[\d.]+\)$/.test(character.parentTransform || '') && character.personAnimations > 0);
  check(parentTransformsPreserved, name + ' transform parent tetap terpasang dan animasi karakter terdaftar',
    parentTransformsPreserved ? undefined : chars.map(({ selector, parentTransform, personAnimations }) => ({ selector, parentTransform, personAnimations })));

  const durationOk = result.scene === testCase.scene && result.duration === EXPECTED_DURATIONS[testCase.scene] && result.registeredAnimations > 0;
  check(durationOk, name + ' timeline scene tetap aktif (' + result.duration + ' ms, ' + result.registeredAnimations + ' animasi)',
    durationOk ? undefined : { scene: result.scene, duration: result.duration, registeredAnimations: result.registeredAnimations });
}
async function checkS8Camera(page, orientation) {
  const result = await page.evaluate(async () => {
    const state = window.__educationCharacterAudit, timeline = state.timeline;
    const scene = document.querySelector('.eps[data-eps="8"]');
    const rig = scene.querySelector('.eps-rig'), cam = scene.querySelector('.eps-cam');
    const originalViewBox = rig.getAttribute('viewBox');
    const points = [];
    for (const time of [0, 2600, 6000, 10200, 12000]) {
      timeline.seek(time);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      points.push({ time, transform: getComputedStyle(cam).transform, origin: getComputedStyle(cam).transformOrigin, viewBox: rig.getAttribute('viewBox') });
    }
    return {
      duration: timeline.durasi,
      originalViewBox,
      animationCount: timeline.anak.filter((animation) => animation.effect && animation.effect.target === cam).length,
      animations: timeline.anak.filter((animation) => animation.effect && animation.effect.target === cam).map((animation) => ({ duration: animation.effect.getTiming().duration, frames: animation.effect.getKeyframes() })),
      points
    };
  });
  const asMatrix = (value) => {
    if (value === 'none') return [1, 0, 0, 1, 0, 0];
    const match = value.match(/^matrix\(([^)]+)\)$/);
    return match ? match[1].split(',').map(Number) : [];
  };
  const expected = [
    [1, 0, 0, 1, 0, 0], [1.12, 0, 0, 1.12, -30, 20],
    [1.12, 0, 0, 1.12, -30, 20], [1.12, 0, 0, 1.12, -30, 20],
    [1, 0, 0, 1, 0, 0]
  ];
  const transforms = result.points.every((point, index) => {
    const matrix = asMatrix(point.transform);
    return matrix.length === 6 && matrix.every((value, i) => Math.abs(value - expected[index][i]) < 0.002) &&
      point.origin === '240px 220px' && point.viewBox === result.originalViewBox;
  });
  const track = result.animations.some((animation) => animation.duration === 12000 &&
    animation.frames.some((frame) => String(frame.transform || '').replace(/\s+/g, '') === 'translate(-30px,20px)scale(1.12)'));
  const ok = result.duration === EXPECTED_DURATIONS[8] && result.animationCount > 0 && transforms && track;
  check(ok, 'S08 ' + orientation + ' .eps-cam tetap berjalan tanpa menimpa root viewBox', ok ? undefined : result);
}

(async () => {
  const server = await serve();
  let browser;
  try {
    if (screenshotsDir) fs.mkdirSync(screenshotsDir, { recursive: true });
    const baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
    browser = await chromium.launch({ headless: true, ...(browserExe ? { executablePath: browserExe } : {}) });
    console.log('Education nested-SVG character sizing — S07/S08/S09, Landscape + Portrait');
    for (const orientation of ['landscape', 'portrait']) {
      const cases = CASES.filter((testCase) => testCase.orientation === orientation);
      const context = await browser.newContext({
        viewport: { width: cases[0].width, height: cases[0].height },
        deviceScaleFactor: cases[0].dpr,
        reducedMotion: 'no-preference', serviceWorkers: 'block'
      });
      await context.addInitScript(timelineHook);
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto(baseUrl, { waitUntil: 'load' });
      await page.addStyleTag({ content: RENDER_CSS + (orientation === 'portrait' ? '\n' + PORTRAIT_CSS : '') });
      await page.locator('#btnSalesIdea').click();
      await page.locator('[data-si-choice="education"]').waitFor({ state: 'visible' });
      await page.locator('[data-si-choice="education"]').click();
      await page.locator('.eps[data-eps="1"]').waitFor({ state: 'attached' });
      for (const testCase of cases) {
        await enterScene(page, testCase.scene);
        const result = await measure(page, testCase);
        testMeasurement(testCase, result);
        if (screenshotsDir) {
          const filename = 'live-' + orientation + '-S' + String(testCase.scene).padStart(2, '0') + '-tau' + testCase.tau + '.png';
          await page.screenshot({ path: path.join(screenshotsDir, filename), type: 'png', scale: 'device' });
          console.log('SCREENSHOT ' + path.join(screenshotsDir, filename));
        }
        if (testCase.scene === 8) await checkS8Camera(page, orientation);
      }
      check(pageErrors.length === 0, orientation + ' tanpa JavaScript error', pageErrors.length ? pageErrors : undefined);
      await context.close();
    }
  } catch (error) {
    failures++;
    console.error('FAIL test harness — ' + (error && error.stack || error));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(failures ? 'FAIL: ' + failures + ' targeted assertion(s).' : 'PASS: seluruh targeted assertions lulus.');
  process.exitCode = failures ? 1 : 0;
})();
