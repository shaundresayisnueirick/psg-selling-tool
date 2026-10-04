#!/usr/bin/env node
/* Focused homepage carousel checks.

   node tests/home-carousel-targeted.test.js --browser <chromium-or-edge-exe>
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
const args = process.argv.slice(2);
function arg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
const browserExe = arg('--browser');
const screenshotsDir = arg('--screenshots');
const PRODUCTS = [
  ['Cemerlang Prime', '01-cemerlang-prime.webp'],
  ['CRISTAL Prime', '02-cristal-prime.webp'],
  ['iFLEXYGUARD', '03-iflexyguard.webp'],
  ['RIZQIA', '04-rizqia.webp'],
  ['GEN Aman', '05-gen-aman.webp'],
  ['BeSMART Lite / Lite Future', '06-besmart-lite-future.webp'],
  ['GEN HealthCare Protection', '07-gen-healthcare-protection.webp'],
  ['Referral Fiesta', '08-referral-fiesta.webp']
];
const EXPECTED_CACHE_VERSION = 'insurance-hub-v117.1.1';
const MIME = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json', svg: 'image/svg+xml',
  png: 'image/png', webp: 'image/webp', mp3: 'audio/mpeg',
  webmanifest: 'application/manifest+json', woff2: 'font/woff2'
};

let checks = 0;
let failures = 0;
function check(ok, label, detail) {
  checks++;
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
      if (rel === '/src/home-carousel.js') {
        const timerAudit = `(function(){
          if (window.__carouselTimerAudit) return;
          var setTimer = window.setTimeout;
          var clearTimer = window.clearTimeout;
          var audit = window.__carouselTimerAudit = { active: new Set(), maxActive: 0, scheduled: 0, fired: 0, cleared: 0, lastScheduledAt: 0 };
          window.setTimeout = function(callback, delay) {
            var args = Array.prototype.slice.call(arguments, 2);
            if (Number(delay) !== 5500) return setTimer.apply(window, [callback, delay].concat(args));
            var id;
            var wrapped = function() {
              audit.active.delete(id);
              audit.fired++;
              return callback.apply(this, arguments);
            };
            audit.lastScheduledAt = Date.now();
            id = setTimer.apply(window, [wrapped, delay].concat(args));
            audit.active.add(id);
            audit.scheduled++;
            audit.maxActive = Math.max(audit.maxActive, audit.active.size);
            return id;
          };
          window.clearTimeout = function(id) {
            if (audit.active.delete(id)) audit.cleared++;
            return clearTimer.call(window, id);
          };
        })();\n`;
        res.writeHead(200, {
          'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'no-store'
        });
        res.end(timerAudit + fs.readFileSync(file, 'utf8'));
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).slice(1)] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}

function staticChecks() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'src/home-carousel.css'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const sectionStart = html.indexOf('<section class="psg-home-carousel');
  const sectionEnd = html.indexOf('</section>', sectionStart);
  const section = html.slice(sectionStart, sectionEnd + '</section>'.length);
  const products = Array.from(section.matchAll(/data-product="([^"]+)"/g), (match) => match[1]);

  check(sectionStart >= 0 && sectionStart < html.indexOf('<p class="pengantar">'),
    'markup carousel berada sebelum banner PSG Selling Tools');
  check(products.length === PRODUCTS.length && products.every((name, i) => name === PRODUCTS[i][0]),
    'delapan slide mengikuti urutan produk yang disetujui', products.length === 8 ? undefined : products);
  check(!/<a\b/i.test(section), 'slide artwork tidak berisi link atau CTA');
  check(section.includes('data-carousel-prev') && section.includes('data-carousel-next') &&
    (section.match(/data-carousel-dot=/g) || []).length === 8,
  'kontrol prev/next dan delapan dot tersedia');
  check(css.includes('aspect-ratio:16/9') && css.includes('object-fit:contain'),
    'CSS menjaga rasio 16:9 tanpa crop agresif');
  check(css.includes('overflow:hidden') && css.includes('display:flex') &&
    css.includes('transition:transform .52s cubic-bezier(.4,0,.6,1)'),
  'viewport memotong track horizontal dengan transisi slide 520 ms');
  check((section.match(/data-carousel-slide\b/g) || []).length === PRODUCTS.length &&
    /class="psg-home-carousel__track"[\s\S]*data-carousel-slide/.test(section),
  'semua flyer berada serentak di dalam satu track DOM');
  check(!/filter\s*:|invert\s*\(/i.test(css), 'CSS carousel tidak memakai filter atau invert');
  check(css.includes('prefers-reduced-motion:reduce'), 'CSS menghormati prefers-reduced-motion');
  const carouselJs = fs.readFileSync(path.join(ROOT, 'src/home-carousel.js'), 'utf8');
  check(!/userAgent|Android|iPhone|iPad|devicePixelRatio/i.test(carouselJs),
    'implementasi tidak mendeteksi atau mengunci jenis perangkat');
  check(sw.includes("const VERSI = '" + EXPECTED_CACHE_VERSION + "'"), 'cache service worker dinaikkan untuk paket carousel');

  const referralSourcePath = path.join(ROOT, 'referral-fiesta-final.png');
  const referralSource = fs.existsSync(referralSourcePath) ? fs.readFileSync(referralSourcePath) : null;
  const referralSourceOkay = !!referralSource && referralSource.length > 24 &&
    referralSource.toString('ascii', 1, 4) === 'PNG' &&
    referralSource.readUInt32BE(16) === 1672 && referralSource.readUInt32BE(20) === 941;
  check(referralSourceOkay, 'PNG final Referral Fiesta tersedia sebagai sumber 1672×941');

  let assetsValid = true;
  const missing = [];
  PRODUCTS.forEach(([, filename]) => {
    const assetPath = path.join(ROOT, 'assets/home-carousel', filename);
    const exists = fs.existsSync(assetPath);
    if (!exists) { assetsValid = false; missing.push(filename); return; }
    const bytes = fs.readFileSync(assetPath);
    const webp = bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    const listed = sw.includes("'./assets/home-carousel/" + filename + "'");
    if (!webp || !listed) { assetsValid = false; missing.push({ filename, webp, serviceWorkerListed: listed }); }
  });
  check(assetsValid, 'delapan WebP valid tersedia dan tercantum di precache service worker', assetsValid ? undefined : missing);
}

async function waitForStableLayout(page) {
  const stable = page.evaluate(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.clock.runFor(40);
  await stable;
}

async function clickInPage(page, selector) {
  await page.locator(selector).evaluate((node) => node.click());
}

async function waitForSlideTransition(page) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return page.evaluate(() => ({
    activeIndex: document.getElementById('psgHomeCarousel').dataset.activeIndex,
    transform: document.querySelector('.psg-home-carousel__track').style.transform,
    transitionEvents: window.__carouselTransitionEvents || 0
  }));
}

async function verifyMidTransition(page, from, to, screenshotPath) {
  const before = await page.evaluate(({ from, to }) => {
    const track = document.querySelector('.psg-home-carousel__track');
    const viewport = document.getElementById('psgHomeCarouselViewport');
    const children = Array.from(track.children);
    const outgoingIndex = from + 1;
    const incomingIndex = from === 7 && to === 0 ? 9 : to + 1;
    const rect = (node) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width };
    };
    return {
      index: Number(document.getElementById('psgHomeCarousel').dataset.activeIndex),
      trackLeft: rect(track).left,
      viewport: rect(viewport),
      outgoing: rect(children[outgoingIndex]),
      incoming: rect(children[incomingIndex]),
      outgoingProduct: children[outgoingIndex].dataset.product,
      incomingProduct: children[incomingIndex].dataset.product,
      childCount: children.length,
      cloneFirst: children[9].dataset.carouselClone,
      targetTransform: 'translate3d(-' + ((to === 0 && from === 7 ? 9 : to + 1) * 100) + '%, 0px, 0px)'
    };
  }, { from, to });

  await clickInPage(page, '[data-carousel-next]');
  const activeDuring = Number(await page.locator('#psgHomeCarousel').getAttribute('data-active-index'));
  await new Promise((resolve) => setTimeout(resolve, 260));
  const middle = await page.evaluate(({ from, to }) => {
    const track = document.querySelector('.psg-home-carousel__track');
    const viewport = document.getElementById('psgHomeCarouselViewport');
    const children = Array.from(track.children);
    const outgoingIndex = from + 1;
    const incomingIndex = from === 7 && to === 0 ? 9 : to + 1;
    const rect = (node) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width };
    };
    const intersects = (node) => {
      const a = rect(node), b = rect(viewport);
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    };
    const visual = (node) => {
      const style = getComputedStyle(node);
      return { display: style.display, visibility: style.visibility, opacity: style.opacity };
    };
    const animations = track.getAnimations().map((animation) => ({
      state: animation.playState,
      progress: animation.effect && animation.effect.getComputedTiming().progress
    }));
    return {
      trackLeft: rect(track).left,
      computedTransform: getComputedStyle(track).transform,
      targetTransform: track.style.transform,
      transitionProperty: getComputedStyle(track).transitionProperty,
      duration: getComputedStyle(track).transitionDuration,
      animations,
      outgoing: rect(children[outgoingIndex]),
      incoming: rect(children[incomingIndex]),
      outgoingVisibleWidth: intersects(children[outgoingIndex]),
      incomingVisibleWidth: intersects(children[incomingIndex]),
      viewportWidth: viewport.clientWidth,
      outgoingVisual: visual(children[outgoingIndex]),
      incomingVisual: visual(children[incomingIndex]),
      childCount: children.length,
      outgoingProduct: children[outgoingIndex].dataset.product,
      incomingProduct: children[incomingIndex].dataset.product
    };
  }, { from, to });
  if (screenshotPath) await page.locator('#psgHomeCarouselViewport').screenshot({ path: screenshotPath });

  const transition = await waitForSlideTransition(page);
  const settled = await page.evaluate(({ to }) => {
    const track = document.querySelector('.psg-home-carousel__track');
    const viewport = document.getElementById('psgHomeCarouselViewport');
    const children = Array.from(track.children);
    const expectedIndex = to + 1;
    const rect = (node) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width };
    };
    const visibleWidths = children.map((node) => {
      const a = rect(node), b = rect(viewport);
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    });
    return {
      index: Number(document.getElementById('psgHomeCarousel').dataset.activeIndex),
      transform: track.style.transform,
      transitionEvents: window.__carouselTransitionEvents || 0,
      visibleWidths,
      expectedIndex,
      viewportWidth: viewport.clientWidth
    };
  }, { to });

  const endIndex = to === 0 && from === 7 ? 1 : to + 1;
  const expectedSettledTransform = 'translate3d(-' + (endIndex * 100) + '%, 0px, 0px)';
  const progress = middle.animations.some((animation) => animation.state === 'running' &&
    typeof animation.progress === 'number' && animation.progress > 0 && animation.progress < 1);
  const visual = [middle.outgoingVisual, middle.incomingVisual].every((style) =>
    style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0.99);
  const bothVisible = middle.outgoingVisibleWidth >= middle.viewportWidth * 0.2 &&
    middle.incomingVisibleWidth >= middle.viewportWidth * 0.2;
  const slideDirection = middle.outgoing.left < before.outgoing.left - 1 &&
    middle.incoming.left < before.incoming.left - 1;
  const normalizedAfterWrap = from !== 7 || to !== 0 || settled.transform === 'translate3d(-100%, 0px, 0px)';
  const fullySettled = settled.index === to && settled.transform === expectedSettledTransform &&
    Math.abs(settled.visibleWidths[endIndex] - settled.viewportWidth) <= 2 &&
    settled.visibleWidths.every((width, i) => i === endIndex || width <= 1);
  const okay = before.index === from && activeDuring === to && before.childCount === 10 &&
    before.outgoingProduct === PRODUCTS[from][0] && before.incomingProduct === PRODUCTS[to][0] &&
    before.trackLeft - middle.trackLeft > 1 && middle.targetTransform === before.targetTransform &&
    middle.transitionProperty.includes('transform') && middle.duration === '0.52s' && progress &&
    bothVisible && visual && slideDirection && transition.transitionEvents > 0 &&
    normalizedAfterWrap && fullySettled;
  check(okay,
    'transisi runtime ' + from + ' → ' + to + ' menampilkan dua flyer bergerak bersamaan lalu settle penuh',
    { before, activeDuring, middle, transition, settled, progress, bothVisible, visual, slideDirection, fullySettled });
  return settled;
}

async function readTimerAudit(page) {
  return page.evaluate(() => {
    const audit = window.__carouselTimerAudit;
    return { active: audit.active.size, maxActive: audit.maxActive, scheduled: audit.scheduled, fired: audit.fired, cleared: audit.cleared, lastScheduledAt: audit.lastScheduledAt };
  });
}

async function advanceToTimerElapsed(page, elapsedMs) {
  const remaining = await page.evaluate((target) => {
    const audit = window.__carouselTimerAudit;
    return target - (Date.now() - audit.lastScheduledAt);
  }, elapsedMs);
  if (remaining > 0) await page.clock.fastForward(remaining);
}

(async () => {
  staticChecks();
  const server = await serve();
  let browser;
  try {
    if (screenshotsDir) fs.mkdirSync(screenshotsDir, { recursive: true });
    const baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
    browser = await chromium.launch({ headless: true, ...(browserExe ? { executablePath: browserExe } : {}) });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      reducedMotion: 'no-preference', serviceWorkers: 'block'
    });
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('insuranceHub.access.v3', 'ok');
        localStorage.setItem('insuranceHub.theme.v3', 'original');
        localStorage.setItem('insuranceHub.level.v1', JSON.stringify({
          level: 'FC', nama: 'Financial Consultant', namaAgen: 'QA Carousel', kodeAgen: 'QA'
        }));
      } catch (_) {}
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.clock.install();
    const pageErrors = [];
    const popups = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('popup', (popup) => popups.push(popup.url()));
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.evaluate(() => {
      if (!document.querySelector('#psgHomeCarousel[data-carousel-ready="1"]')) {
        throw new Error('carousel belum diinisialisasi setelah DOMContentLoaded');
      }
      if (!document.getElementById('sambutanAgen')) throw new Error('welcome card belum terpasang');
    });
    await waitForStableLayout(page);

    const desktop = await page.evaluate(async () => {
      const home = document.getElementById('layarProduk');
      const welcome = document.getElementById('sambutanAgen');
      const carousel = document.getElementById('psgHomeCarousel');
      const heading = home.querySelector(':scope > .pengantar');
      const children = Array.from(home.children);
      const stage = document.getElementById('psgHomeCarouselViewport');
      const images = Array.from(carousel.querySelectorAll('[data-carousel-slide] img'));
      images.forEach((image) => { image.loading = 'eager'; });
      await Promise.all(images.map((image) => image.decode()));
      const bounds = (node) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const rect = bounds(stage);
      return {
        order: [children.indexOf(welcome), children.indexOf(carousel), children.indexOf(heading)],
        gridColumns: getComputedStyle(home).gridTemplateColumns,
        stage: rect,
        ratio: rect.width / rect.height,
        images: images.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight, filter: getComputedStyle(image).filter, src: image.getAttribute('src') })),
        products: Array.from(carousel.querySelectorAll('[data-carousel-slide]'), (slide) => slide.dataset.product),
        links: carousel.querySelectorAll('a').length,
        index: carousel.dataset.activeIndex,
        dotsCurrent: carousel.querySelectorAll('[data-carousel-dot][aria-current="true"]').length,
        orderSpacing: bounds(welcome).bottom <= bounds(carousel).top && bounds(carousel).bottom <= bounds(heading).top
      };
    });
    check(desktop.order[0] >= 0 && desktop.order[0] < desktop.order[1] && desktop.order[1] < desktop.order[2] && desktop.orderSpacing,
      'homepage render: Welcome Card → carousel → banner PSG Selling Tools', desktop.orderSpacing ? undefined : desktop.order);
    check(desktop.products.length === 8 && desktop.products.every((name, i) => name === PRODUCTS[i][0]),
      'homepage render: urutan slide sesuai daftar');
    check(desktop.images.length === 8 && desktop.images.slice(0, 7).every((image) => image.width === 1920 && image.height === 1080) &&
      desktop.images[7].width === 1672 && desktop.images[7].height === 941,
    'slide 1–7 tetap 1920×1080 dan artwork final slide 8 termuat 1672×941',
    desktop.images.map(({ width, height, src }) => ({ width, height, src })));
    check(desktop.images[7].src === 'assets/home-carousel/08-referral-fiesta.webp',
      'slide #8 memakai WebP runtime Referral Fiesta final', desktop.images[7]);
    const referralPixelCheck = await page.evaluate(async () => {
      async function loadImage(src) {
        const image = new Image();
        image.src = src;
        await image.decode();
        return image;
      }
      const source = await loadImage('referral-fiesta-final.png');
      const runtime = await loadImage('assets/home-carousel/08-referral-fiesta.webp');
      if (source.naturalWidth !== runtime.naturalWidth || source.naturalHeight !== runtime.naturalHeight) {
        return { source: [source.naturalWidth, source.naturalHeight], runtime: [runtime.naturalWidth, runtime.naturalHeight], meanAbsoluteError: Infinity };
      }
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(source, 0, 0);
      const sourcePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(runtime, 0, 0);
      const runtimePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let difference = 0, samples = 0;
      for (let i = 0; i < sourcePixels.length; i += 4) {
        difference += Math.abs(sourcePixels[i] - runtimePixels[i]);
        difference += Math.abs(sourcePixels[i + 1] - runtimePixels[i + 1]);
        difference += Math.abs(sourcePixels[i + 2] - runtimePixels[i + 2]);
        samples += 3;
      }
      return {
        source: [source.naturalWidth, source.naturalHeight],
        runtime: [runtime.naturalWidth, runtime.naturalHeight],
        meanAbsoluteError: difference / samples
      };
    });
    check(referralPixelCheck.source.join('x') === '1672x941' &&
      referralPixelCheck.runtime.join('x') === '1672x941' && referralPixelCheck.meanAbsoluteError < 3,
    'piksel WebP slide #8 cocok dekat dengan PNG final tanpa resize/crop', referralPixelCheck);
    check(Math.abs(desktop.ratio - 16 / 9) < 0.005 && desktop.stage.width <= 1366,
      'layout desktop 1366px menjaga rasio 16:9', { width: desktop.stage.width, height: desktop.stage.height, ratio: desktop.ratio });
    check(desktop.order[0] < desktop.order[1] && desktop.order[1] < desktop.order[2] &&
      desktop.gridColumns.trim().split(/\s+/).length === 1,
    'Welcome, carousel, dan banner tersusun vertikal pada desktop');
    check(desktop.index === '0' && desktop.dotsCurrent === 1 && desktop.links === 0,
      'slide pertama aktif, satu dot aktif, slide non-clickable');
    check(desktop.images.every((image) => image.filter === 'none'), 'Light Theme menampilkan artwork tanpa filter');

    const lightSrc = await page.locator('#psgHomeCarousel img').first().getAttribute('src');
    const lightBackground = await page.locator('#psgHomeCarouselViewport').evaluate((node) => getComputedStyle(node).backgroundColor);
    const darkTheme = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
      const stage = document.getElementById('psgHomeCarouselViewport');
      const image = stage.querySelector('img');
      return { background: getComputedStyle(stage).backgroundColor, filter: getComputedStyle(image).filter, src: image.getAttribute('src') };
    });
    check(darkTheme.background !== lightBackground && darkTheme.filter === 'none' && darkTheme.src === lightSrc,
      'Dark Theme mengganti container tanpa mengubah atau memfilter artwork', darkTheme);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'original');
      document.body.setAttribute('data-theme', 'original');
    });

    // Deterministic browser-clock verification of the live carousel runtime.
    // Hover and keyboard focus stay active while the normal-motion track slides.
    await page.clock.pauseAt(new Date());
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.mouse.move(500, 400);
    await page.evaluate(() => {
      document.querySelector('[data-carousel-next]').focus();
      window.__carouselTransitionEvents = 0;
      document.querySelector('.psg-home-carousel__track').addEventListener('transitionend', (event) => {
        if (event.target === event.currentTarget && event.propertyName === 'transform') window.__carouselTransitionEvents++;
      });
    });
    await clickInPage(page, '[data-carousel-dot="0"]');
    let index = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    let timerAudit = await readTimerAudit(page);
    const initialTrack = await page.locator('.psg-home-carousel__track').evaluate((track) => ({
      transform: track.style.transform,
      duration: getComputedStyle(track).transitionDuration,
      viewportOverflow: getComputedStyle(document.getElementById('psgHomeCarouselViewport')).overflow
    }));
    check(index === '0' && initialTrack.transform === 'translate3d(-100%, 0px, 0px)',
      'autoplay runtime dimulai di index 0 pada posisi pertama track', { index, initialTrack });
    check(initialTrack.duration === '0.52s' && initialTrack.viewportOverflow === 'hidden',
      'track memakai slide horizontal 520 ms di dalam viewport terklip', initialTrack);
    check(timerAudit.active === 1 && timerAudit.maxActive === 1,
      'tepat satu timeout autoplay aktif setelah inisialisasi', timerAudit);

    if (screenshotsDir) {
      const midTransitionScreenshot = path.join(screenshotsDir, 'carousel-transition-mid-0-to-1.png');
      await verifyMidTransition(page, 0, 1, midTransitionScreenshot);
      console.log('SCREENSHOT ' + midTransitionScreenshot);
    } else {
      await verifyMidTransition(page, 0, 1);
    }
    await verifyMidTransition(page, 1, 2);
    await verifyMidTransition(page, 2, 3);
    await clickInPage(page, '[data-carousel-dot="7"]');
    await waitForSlideTransition(page);
    await verifyMidTransition(page, 7, 0);

    const crossDeviceCases = [
      { label: 'desktop', width: 1366, height: 900 },
      { label: 'laptop/tablet landscape', width: 1024, height: 768 },
      { label: 'tablet portrait / iPad', width: 768, height: 1024 },
      { label: 'phone', width: 390, height: 844 },
      { label: 'phone landscape', width: 844, height: 390 },
      { label: 'small phone landscape', width: 640, height: 360 },
      { label: 'small phone', width: 360, height: 780 },
      { label: 'small phone narrow', width: 320, height: 700 },
      { label: 'foldable narrow viewport', width: 280, height: 653 }
    ];
    const crossDeviceResults = [];
    for (const device of crossDeviceCases) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await waitForStableLayout(page);
      const startingIndex = Number(await page.locator('#psgHomeCarousel').getAttribute('data-active-index'));
      const result = await verifyMidTransition(page, 0, 1);
      crossDeviceResults.push({ label: device.label, viewport: device.width + 'x' + device.height, startingIndex, settledIndex: result.index });
      await clickInPage(page, '[data-carousel-dot="0"]');
      await waitForSlideTransition(page);
    }
    check(crossDeviceResults.every((result) => result.startingIndex === 0 && result.settledIndex === 1),
      'perpindahan 0 → 1 bekerja dengan mekanisme track yang sama di seluruh viewport target', crossDeviceResults);
    await page.evaluate(() => { window.__carouselTransitionEvents = 0; });

    await advanceToTimerElapsed(page, 5499);
    index = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    timerAudit = await readTimerAudit(page);
    check(index === '0' && timerAudit.fired === 0,
      'slide tetap di index 0 sebelum jeda 5,5 detik penuh', { index, timerAudit });
    await advanceToTimerElapsed(page, 5500);
    index = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    timerAudit = await readTimerAudit(page);
    let trackTransform = await page.locator('.psg-home-carousel__track').evaluate((track) => track.style.transform);
    check(index === '1' && trackTransform === 'translate3d(-200%, 0px, 0px)' && timerAudit.fired === 1 &&
      timerAudit.active === 0 && timerAudit.maxActive === 1,
    'timeout pertama menggeser track dari slide 0 ke slide 1 setelah 5,5 detik', { index, trackTransform, timerAudit });
    let transition = await waitForSlideTransition(page);
    timerAudit = await readTimerAudit(page);
    check(transition.transitionEvents === 1 && timerAudit.active === 1 && timerAudit.maxActive === 1,
      'timer berikutnya baru dimulai setelah transisi horizontal selesai', { transition, timerAudit });

    await advanceToTimerElapsed(page, 5500);
    index = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    timerAudit = await readTimerAudit(page);
    trackTransform = await page.locator('.psg-home-carousel__track').evaluate((track) => track.style.transform);
    check(index === '2' && trackTransform === 'translate3d(-300%, 0px, 0px)' && timerAudit.fired === 2 &&
      timerAudit.active === 0 && timerAudit.maxActive === 1,
    'timeout berikutnya menggeser track dari slide 1 ke slide 2', { index, trackTransform, timerAudit });
    await waitForSlideTransition(page);

    const cycle = [0, 1, 2];
    for (const expected of [3, 4, 5, 6, 7, 0]) {
      await advanceToTimerElapsed(page, 5500);
      index = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
      trackTransform = await page.locator('.psg-home-carousel__track').evaluate((track) => track.style.transform);
      const physicalTarget = expected === 0 ? 9 : expected + 1;
      const expectedTransform = 'translate3d(-' + (physicalTarget * 100) + '%, 0px, 0px)';
      if (Number(index) !== expected || trackTransform !== expectedTransform) {
        cycle.push(Number(index));
        break;
      }
      await waitForSlideTransition(page);
      const settledTransform = await page.locator('.psg-home-carousel__track').evaluate((track) => track.style.transform);
      const expectedSettled = expected === 0 ? 'translate3d(-100%, 0px, 0px)' : expectedTransform;
      if (settledTransform !== expectedSettled) {
        cycle.push(Number(index));
        break;
      }
      cycle.push(Number(index));
    }
    timerAudit = await readTimerAudit(page);
    check(cycle.join(',') === '0,1,2,3,4,5,6,7,0' && timerAudit.fired === 8 &&
      timerAudit.active === 1 && timerAudit.maxActive === 1,
    'siklus runtime dan wrap alami track lengkap 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 0', { cycle, timerAudit });

    async function checkManualReset(selector, expectedAfterAction, expectedAfterTimer, label) {
      await advanceToTimerElapsed(page, 2000);
      const beforeAction = await readTimerAudit(page);
      await clickInPage(page, selector);
      const afterAction = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
      const duringTransition = await readTimerAudit(page);
      const settled = await waitForSlideTransition(page);
      const afterReset = await readTimerAudit(page);
      await advanceToTimerElapsed(page, 5499);
      const beforeDeadline = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
      await advanceToTimerElapsed(page, 5500);
      const afterDeadline = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
      const duringAutoTransition = await readTimerAudit(page);
      await waitForSlideTransition(page);
      const afterTimer = await readTimerAudit(page);
      check(afterAction === String(expectedAfterAction) && beforeDeadline === String(expectedAfterAction) &&
        afterDeadline === String(expectedAfterTimer) && duringTransition.active === 0 && afterReset.active === 1 &&
        duringAutoTransition.active === 0 && afterTimer.active === 1 && afterTimer.maxActive === 1 &&
        afterReset.scheduled === beforeAction.scheduled + 1 && afterReset.cleared === beforeAction.cleared + 1,
      label, { afterAction, beforeDeadline, afterDeadline, settled, afterReset, afterTimer });
    }

    await checkManualReset('[data-carousel-next]', 1, 2, 'Next mereset timer penuh dan tidak menggandakan timeout');
    await checkManualReset('[data-carousel-prev]', 1, 2, 'Prev mereset timer penuh dan tidak menggandakan timeout');
    await checkManualReset('[data-carousel-dot="7"]', 7, 0, 'dot mereset timer penuh dan siklus kembali ke slide 0');

    await advanceToTimerElapsed(page, 2000);
    const beforeSwipe = await readTimerAudit(page);
    await page.evaluate(() => {
      const viewport = document.getElementById('psgHomeCarouselViewport');
      viewport.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, pointerId: 19, pointerType: 'touch', isPrimary: true, clientX: 290, clientY: 130
      }));
      viewport.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, pointerId: 19, pointerType: 'touch', isPrimary: true, clientX: 120, clientY: 134
      }));
    });
    const swipeIndex = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    const duringSwipeTransition = await readTimerAudit(page);
    const swipeSettled = await waitForSlideTransition(page);
    const afterSwipeAudit = await readTimerAudit(page);
    await advanceToTimerElapsed(page, 5499);
    const swipeBeforeDeadline = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    await advanceToTimerElapsed(page, 5500);
    const swipeAfterDeadline = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    const duringSwipeAutoTransition = await readTimerAudit(page);
    await waitForSlideTransition(page);
    timerAudit = await readTimerAudit(page);
    check(swipeIndex === '1' && swipeBeforeDeadline === '1' && swipeAfterDeadline === '2' &&
      duringSwipeTransition.active === 0 && afterSwipeAudit.active === 1 && afterSwipeAudit.maxActive === 1 &&
      afterSwipeAudit.scheduled === beforeSwipe.scheduled + 1 && afterSwipeAudit.cleared === beforeSwipe.cleared + 1 &&
      duringSwipeAutoTransition.active === 0 && timerAudit.active === 1 && timerAudit.maxActive === 1 &&
      timerAudit.fired === afterSwipeAudit.fired + 1,
    'swipe kiri berpindah slide lalu memulai ulang satu timer autoplay',
    { swipeIndex, swipeBeforeDeadline, swipeAfterDeadline, swipeSettled, afterSwipeAudit, timerAudit });

    const beforeDuplicateInit = await readTimerAudit(page);
    const duplicateScript = await page.evaluate(() => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'src/home-carousel.js?duplicate-init-check=1';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('script kedua gagal dimuat'));
      document.body.appendChild(script);
    }));
    const duplicateGuardAudit = await readTimerAudit(page);
    check(duplicateScript && duplicateGuardAudit.active === 1 && duplicateGuardAudit.maxActive === 1 &&
      duplicateGuardAudit.scheduled === beforeDuplicateInit.scheduled &&
      duplicateGuardAudit.fired === beforeDuplicateInit.fired,
    'memuat ulang script tidak memasang timer carousel duplikat', { beforeDuplicateInit, duplicateGuardAudit });

    const urlBeforeClick = page.url();
    const indexBeforeClick = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    await page.evaluate(() => document.getElementById('psgHomeCarouselViewport').click());
    check(page.url() === urlBeforeClick &&
      await page.locator('#psgHomeCarousel').getAttribute('data-active-index') === indexBeforeClick && popups.length === 0,
    'klik artwork tidak membuka halaman, popup, atau aksi');

    const beforeKeyboard = Number(await page.locator('#psgHomeCarousel').getAttribute('data-active-index'));
    await page.evaluate(() => document.querySelector('[data-carousel-prev]').focus());
    await page.keyboard.press('ArrowRight');
    const keyboardIndex = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    check(Number(keyboardIndex) === (beforeKeyboard + 1) % PRODUCTS.length,
      'navigasi keyboard panah kanan berjalan saat fokus di carousel');

    await waitForSlideTransition(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const beforeReduced = Number(await page.locator('#psgHomeCarousel').getAttribute('data-active-index'));
    const reducedTrackBefore = await page.locator('.psg-home-carousel__track').evaluate((node) => ({
      duration: getComputedStyle(node).transitionDuration,
      transform: node.style.transform,
      events: window.__carouselTransitionEvents || 0
    }));
    await clickInPage(page, '[data-carousel-next]');
    const reducedManual = Number(await page.locator('#psgHomeCarousel').getAttribute('data-active-index'));
    const reducedTrackDuring = await page.locator('.psg-home-carousel__track').evaluate((node) => node.style.transform);
    const reducedTimerDuring = await readTimerAudit(page);
    const reducedManualSettled = await waitForSlideTransition(page);
    const reducedTimerAfter = await readTimerAudit(page);
    await advanceToTimerElapsed(page, 5500);
    const reducedAuto = Number(await page.locator('#psgHomeCarousel').getAttribute('data-active-index'));
    const reducedAutoDuring = await readTimerAudit(page);
    const reducedAutoSettled = await waitForSlideTransition(page);
    timerAudit = await readTimerAudit(page);
    check(reducedTrackBefore.duration === '0.18s' &&
      reducedManual === (beforeReduced + 1) % PRODUCTS.length &&
      reducedTrackDuring === 'translate3d(-' + ((reducedManual + 1) * 100) + '%, 0px, 0px)' &&
      reducedManualSettled.transitionEvents === reducedTrackBefore.events + 1 &&
      reducedTimerDuring.active === 0 && reducedTimerAfter.active === 1 &&
      reducedAuto === (reducedManual + 1) % PRODUCTS.length && reducedAutoDuring.active === 0 &&
      reducedAutoSettled.transitionEvents === reducedManualSettled.transitionEvents + 1 &&
      timerAudit.active === 1 && timerAudit.maxActive === 1,
    'reduced motion tetap memakai slide horizontal singkat dan autoplay dengan satu timer',
    { duration: reducedTrackBefore.duration, beforeReduced, reducedManual, reducedTrackDuring,
      reducedManualSettled, reducedTimerDuring, reducedTimerAfter, reducedAuto,
      reducedAutoDuring, reducedAutoSettled, timerAudit });

    await clickInPage(page, '[data-carousel-dot="0"]');
    if (screenshotsDir) {
      await page.clock.runFor(400);
      const screenshot = path.join(screenshotsDir, 'homepage-carousel-desktop-1366.png');
      await page.screenshot({ path: screenshot, fullPage: true, type: 'png' });
      console.log('SCREENSHOT ' + screenshot);
    }

    await page.setViewportSize({ width: 360, height: 780 });
    await waitForStableLayout(page);
    const mobile = await page.evaluate(() => {
      const root = document.getElementById('psgHomeCarousel');
      const stage = document.getElementById('psgHomeCarouselViewport');
      const controls = root.querySelector('.psg-home-carousel__controls');
      const dots = root.querySelector('.psg-home-carousel__dots');
      const r = stage.getBoundingClientRect(), cr = controls.getBoundingClientRect();
      return {
        width: r.width, height: r.height, ratio: r.width / r.height,
        left: r.left, right: r.right, clientWidth: document.documentElement.clientWidth,
        controlsWidth: cr.width, dotsWidth: dots.clientWidth, dotsScrollWidth: dots.scrollWidth,
        arrows: Array.from(root.querySelectorAll('.psg-home-carousel__arrow'), (button) => button.getBoundingClientRect().width)
      };
    });
    check(Math.abs(mobile.ratio - 16 / 9) < 0.005 && mobile.left >= -1 && mobile.right <= mobile.clientWidth + 1,
      'layout small phone 360px menjaga rasio dan tidak melampaui viewport', mobile);
    check(mobile.dotsScrollWidth <= mobile.dotsWidth + 1 && mobile.arrows.every((width) => width >= 38),
      'kontrol dan dot tetap muat pada lebar 360px', mobile);

    const responsiveCases = [
      { label: 'tablet landscape', width: 1024, height: 768 },
      { label: 'tablet portrait / iPad portrait', width: 768, height: 1024 },
      { label: 'phone', width: 390, height: 844 },
      { label: 'small phone', width: 320, height: 700 },
      { label: 'foldable narrow viewport', width: 280, height: 653 }
    ];
    const responsiveResults = [];
    for (const device of responsiveCases) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await waitForStableLayout(page);
      const result = await page.evaluate(() => {
        const carousel = document.getElementById('psgHomeCarousel');
        const stage = document.getElementById('psgHomeCarouselViewport');
        const dots = carousel.querySelector('.psg-home-carousel__dots');
        const rect = stage.getBoundingClientRect();
        return {
          width: rect.width, height: rect.height, ratio: rect.width / rect.height,
          left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth,
          rootWidth: carousel.clientWidth, rootScrollWidth: carousel.scrollWidth,
          dotsWidth: dots.clientWidth, dotsScrollWidth: dots.scrollWidth
        };
      });
      responsiveResults.push({ device: device.label, viewport: device.width + 'x' + device.height, ...result });
    }
    const responsiveOkay = responsiveResults.every((result) =>
      Math.abs(result.ratio - 16 / 9) < 0.005 && result.width <= result.rootWidth + 1 &&
      result.left >= -1 && result.right <= result.viewport + 1 &&
      result.rootScrollWidth <= result.rootWidth + 1 && result.dotsScrollWidth <= result.dotsWidth + 1);
    check(responsiveOkay,
      'aspect ratio, fluid container, artwork stage, dan controls tetap usable pada tablet/phone/foldable',
      responsiveOkay ? undefined : responsiveResults);
    await page.setViewportSize({ width: 360, height: 780 });
    await waitForStableLayout(page);

    const swipeFrom = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    await page.evaluate(() => {
      const viewport = document.getElementById('psgHomeCarouselViewport');
      const down = new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: 290, clientY: 130 });
      const up = new PointerEvent('pointerup', { bubbles: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: 120, clientY: 134 });
      viewport.dispatchEvent(down);
      viewport.dispatchEvent(up);
    });
    const swipeTo = await page.locator('#psgHomeCarousel').getAttribute('data-active-index');
    check(Number(swipeTo) === (Number(swipeFrom) + 1) % PRODUCTS.length,
      'swipe kiri pada viewport touch berpindah ke slide berikutnya', { swipeFrom, swipeTo });

    const fileResponses = await page.evaluate(async (products) => Promise.all(products.map(async ([, filename]) => {
      const response = await fetch('assets/home-carousel/' + filename, { method: 'HEAD' });
      return { filename, status: response.status, type: response.headers.get('content-type') };
    })), PRODUCTS);
    check(fileResponses.length === 8 && fileResponses.every((file) => file.status === 200 && file.type.includes('image/webp')),
      'aset carousel dapat diminta dari homepage dan tersedia untuk cache PWA', fileResponses.filter((file) => file.status !== 200 || !file.type.includes('image/webp')));

    if (screenshotsDir) {
      const screenshot = path.join(screenshotsDir, 'homepage-carousel-mobile-360.png');
      await page.screenshot({ path: screenshot, fullPage: true, type: 'png' });
      console.log('SCREENSHOT ' + screenshot);
    }
    check(pageErrors.length === 0, 'homepage carousel tanpa JavaScript error', pageErrors.length ? pageErrors : undefined);
    await context.close();
  } catch (error) {
    failures++;
    console.error('FAIL test harness — ' + (error && error.stack || error));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(failures ? 'FAIL: ' + failures + ' dari ' + checks + ' targeted checks gagal.' : 'PASS: seluruh ' + checks + ' targeted checks lulus.');
  process.exitCode = failures ? 1 : 0;
})();
