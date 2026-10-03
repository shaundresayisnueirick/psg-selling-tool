#!/usr/bin/env node
/* Targeted responsive-camera checks for Education scenes S07–S09.

   node tests/education-camera-targeted.test.js [--browser <chromium-or-edge-exe>]
*/
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadPlaywright() {
  const tries = ['playwright'];
  if (process.env.NODE_PATH) tries.push(path.join(process.env.NODE_PATH, 'playwright'));
  for (const candidate of tries) {
    try { return require(candidate); } catch (_) {}
  }
  console.error('FAIL: Playwright tidak tersedia.');
  process.exit(2);
}

const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, '..');
const browserIndex = process.argv.indexOf('--browser');
const browserExe = browserIndex >= 0 ? process.argv[browserIndex + 1] : undefined;
const MIME = {
  html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
  webmanifest: 'application/manifest+json'
};
const PRESETS = {
  7: { landscape: [-15.12, 30, 510.23, 380], portrait: [18.11, 30, 443.78, 380] },
  8: { landscape: [-15.12, 30, 510.23, 380], portrait: [20, -3.63, 440, 436.05] },
  9: { landscape: [-28.54, 10, 537.09, 400], portrait: [3.96, 10, 472.08, 400] }
};
const VIEWPORTS = [
  { name: 'desktop-landscape', width: 1280, height: 720, orientation: 'landscape' },
  { name: 'android-portrait', width: 360, height: 640, orientation: 'portrait' },
  { name: 'iphone-portrait', width: 390, height: 844, orientation: 'portrait' },
  { name: 'tablet-landscape', width: 1024, height: 768, orientation: 'landscape' },
  { name: 'phone-landscape', width: 844, height: 390, orientation: 'landscape' }
];

let failures = 0;
function check(ok, label, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
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
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).slice(1)] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}

function almost(a, b, tolerance = 0.03) { return Math.abs(a - b) <= tolerance; }
function expectedViewBox(camera, aspect) {
  const [x, y, width, height] = camera;
  if (aspect > width / height) {
    const expandedWidth = height * aspect;
    return [x + width / 2 - expandedWidth / 2, y, expandedWidth, height].map((n) => Math.round(n * 100) / 100);
  }
  return [x, y, width, width / aspect].map((n) => Math.round(n * 100) / 100);
}

const installTimelineHook = () => {
  try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {}
  const state = window.__educationCameraAudit = { timeline: null, id: 0 };
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
    }
  });
};

async function enterScene(page, target) {
  const current = await page.evaluate(() => Number(document.querySelector('.eps').dataset.eps));
  for (let n = current + 1; n <= target; n++) {
    const before = await page.evaluate(() => window.__educationCameraAudit.id);
    await page.evaluate(() => document.getElementById('siNext').click());
    await page.waitForFunction(([id, scene]) =>
      window.__educationCameraAudit.id > id && document.querySelector('.eps[data-eps="' + scene + '"]'),
    [before, n]);
  }
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)))));
}

async function measureScene(page, scene, sampleTime) {
  return page.evaluate(async ([n, t]) => {
    const state = window.__educationCameraAudit;
    const timeline = state.timeline;
    const root = document.querySelector('.eps[data-eps="' + n + '"]');
    const stage = root.querySelector('.eps-stage');
    const svg = stage.querySelector('.eps-rig');
    const text = root.querySelector('.eps-text');
    timeline.seek(t);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const sr = stage.getBoundingClientRect(), tr = text.getBoundingClientRect();
    const gr = svg.getBoundingClientRect();
    const orientation = tr.left >= sr.right - 1 ? 'landscape' :
      tr.top >= sr.bottom - 1 ? 'portrait' : 'unresolved';
    const chars = ['.eps-ortu', '.eps-anak'].map((selector) => {
      const node = root.querySelector(selector);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }).filter(Boolean);
    return {
      scene: Number(root.dataset.eps),
      duration: timeline.durasi,
      orientation,
      stage: { x: sr.x, y: sr.y, right: sr.right, bottom: sr.bottom, width: sr.width, height: sr.height },
      svg: { width: svg.clientWidth, height: svg.clientHeight, rect: { x: gr.x, y: gr.y, right: gr.right, bottom: gr.bottom } },
      viewBox: svg.getAttribute('viewBox').trim().split(/\s+/).map(Number),
      chars
    };
  }, [scene, sampleTime]);
}

function checkCamera(scene, viewport, result) {
  const label = 'S' + String(scene).padStart(2, '0') + ' ' + viewport.name;
  const aspect = result.svg.width / result.svg.height;
  const expected = expectedViewBox(PRESETS[scene][viewport.orientation], aspect);
  const sameBox = result.viewBox.every((value, index) => almost(value, expected[index]));
  const vbAspect = result.viewBox[2] / result.viewBox[3];
  const fullStage = almost(vbAspect, aspect, 0.001);
  const correctLayout = result.orientation === viewport.orientation;
  const anchorPreserved = aspect > PRESETS[scene][viewport.orientation][2] / PRESETS[scene][viewport.orientation][3]
    ? almost(result.viewBox[0] + result.viewBox[2] / 2,
      PRESETS[scene][viewport.orientation][0] + PRESETS[scene][viewport.orientation][2] / 2) &&
      almost(result.viewBox[1], PRESETS[scene][viewport.orientation][1]) &&
      almost(result.viewBox[3], PRESETS[scene][viewport.orientation][3])
    : almost(result.viewBox[0], PRESETS[scene][viewport.orientation][0]) &&
      almost(result.viewBox[1], PRESETS[scene][viewport.orientation][1]) &&
      almost(result.viewBox[2], PRESETS[scene][viewport.orientation][2]);
  const focusVisible = result.chars.length >= 2 && result.chars.every((box) =>
    box.width > 0 && box.height > 0 && box.x >= result.stage.x - 2 && box.y >= result.stage.y - 2 &&
    box.right <= result.stage.right + 2 && box.bottom <= result.stage.bottom + 2);
  const ok = result.scene === scene && sameBox && fullStage && correctLayout && anchorPreserved && focusVisible;
  check(ok, label + ' camera, anchor, fokus, dan clipping', ok ? undefined : {
    viewBox: result.viewBox, expected, aspect, orientation: result.orientation,
    expectedOrientation: viewport.orientation, anchorPreserved, focusVisible, chars: result.chars, stage: result.stage
  });
}

async function checkS8Animation(page, viewport) {
  const result = await page.evaluate(async () => {
    const state = window.__educationCameraAudit, timeline = state.timeline;
    const scene = document.querySelector('.eps[data-eps="8"]');
    const svg = scene.querySelector('.eps-rig'), cam = scene.querySelector('.eps-cam');
    const originalViewBox = svg.getAttribute('viewBox');
    const cameraAnimations = cam.getAnimations().map((animation) => ({
      duration: animation.effect.getTiming().duration,
      frames: animation.effect.getKeyframes()
    }));
    const points = [];
    for (const time of [0, 2600, 10200, 12000]) {
      timeline.seek(time);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const style = getComputedStyle(cam);
      points.push({ time, transform: style.transform, origin: style.transformOrigin, viewBox: svg.getAttribute('viewBox') });
    }
    return { duration: timeline.durasi, originalViewBox, cameraAnimations, points };
  });
  const matrix = (value) => {
    if (value === 'none') return [1, 0, 0, 1, 0, 0];
    const m = value.match(/^matrix\(([^)]+)\)$/);
    return m ? m[1].split(',').map(Number) : [];
  };
  const expected = [
    [1, 0, 0, 1, 0, 0],
    [1.12, 0, 0, 1.12, -30, 20],
    [1.12, 0, 0, 1.12, -30, 20],
    [1, 0, 0, 1, 0, 0]
  ];
  const transformsMatch = result.points.every((point, i) => {
    const actual = matrix(point.transform);
    return actual.length === 6 && actual.every((value, j) => almost(value, expected[i][j], 0.001)) &&
      point.origin === '240px 220px' && point.viewBox === result.originalViewBox;
  });
  const targetTransform = (value) => String(value || '').replace(/\s+/g, '');
  const trackExists = result.cameraAnimations.some((animation) => animation.duration === 12000 &&
    animation.frames.some((frame) => targetTransform(frame.transform) === 'translate(-30px,20px)scale(1.12)'));
  check(result.duration === 22380 && transformsMatch && trackExists,
    'S08 ' + viewport.name + ' .eps-cam aktif, origin/transform/waktu benar, viewBox tidak ditimpa',
    transformsMatch && trackExists ? undefined : result);
}

(async () => {
  const server = await serve();
  let browser;
  try {
    const baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
    browser = await chromium.launch({ headless: true, ...(browserExe ? { executablePath: browserExe } : {}) });
    console.log('Education camera targeted audit — S07/S08/S09, five responsive layouts');
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'no-preference'
      });
      await context.addInitScript(installTimelineHook);
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto(baseUrl, { waitUntil: 'load' });
      await page.locator('#btnSalesIdea').click();
      await page.locator('[data-si-choice="education"]').waitFor({ state: 'visible' });
      await page.locator('[data-si-choice="education"]').click();
      await page.locator('.eps[data-eps="1"]').waitFor({ state: 'attached' });
      for (const scene of [7, 8, 9]) {
        await enterScene(page, scene);
        const sampleTime = scene === 7 ? 10000 : scene === 8 ? 6000 : 16000;
        const measurement = await measureScene(page, scene, sampleTime);
        checkCamera(scene, viewport, measurement);
        if (scene === 8) await checkS8Animation(page, viewport);
      }
      check(pageErrors.length === 0, viewport.name + ' tanpa JavaScript error', pageErrors);
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
