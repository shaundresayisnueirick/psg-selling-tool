#!/usr/bin/env node
/* Pilot "⬇ Download Video" Sales Idea Asset (src/sales-idea-video.js):
   tombol baru tampil sesudah Asset ditonton utuh dari awal secara normal.

     node tests/sales-idea-unduh-video.test.js [--bagian 1,2,3,…]
                                               [--paralel 4] [--bukti <folder>]

   Semua skenario berjalan pada waktu nyata (laju 1×; mempercepat animasi
   sendiri termasuk pelanggaran). Video dilayani dari repo:
   assets/video/asset-terang.mp4 (tema Original) dan asset-gelap.mp4 (tema
   Dark); yang diunduh mengikuti tema aktif SAAT tombol diklik.
   1 NORMAL   (tema Original) Play → scene 1–6 masing-masing sampai selesai
              → Next → tombol tampil (sebelumnya tidak pernah terlihat);
              href asset-terang.mp4, unduhan PSG-Asset-Light.mp4 = berkas
              repo; ganti ke Dark lalu klik → PSG-Asset-Dark.mp4. Sesudah sah:
              Back tetap sah; ke hub, cerita lain, Asset dibuka lagi, muat
              ulang → tersembunyi.
   2 PAUSE    (tema Dark) pause/resume (scene 2 & 5) → tetap sah → tombol
              tampil; href asset-gelap.mp4, unduhan PSG-Asset-Dark.mp4; ganti
              ke Original lalu klik → PSG-Asset-Light.mp4.
   3 NEXT     Next sebelum scene 1 selesai → tidak sah; scene 2–6 utuh →
              tombol tetap tersembunyi.
   4 BACK     Back di scene 3 → tidak sah; scene 2–6 utuh → tersembunyi.
     BACK1    Back ke scene 1 juga tidak sah; Replay memulai putaran baru.
   5 LOMPAT   Next ×5 dari frame siap → scene 6 utuh → tersembunyi.
   6 SEEK     animasi dimajukan 5 dtk → tidak sah; ditonton sampai akhir →
              tersembunyi. MUNDUR (−1,5 dtk), LAJU (×4 lewat CDP), PAKSA
              (status 'selesai' dipaksa lewat atribut) → tidak sah.
   7 RELOAD   scene 1 utuh + scene 2 sebagian, muat ulang, lanjut dari
              scene 2 sampai akhir → tersembunyi.
   R          pemutar, narator, scene & manifest Asset, service worker tidak
              berubah; index.html hanya +1 skrip; kedua berkas video yang
              dirujuk modul ada di repo.

   Playwright tidak menjadi dependensi repo: dipakai dari instalasi global
   (NODE_PATH) bila tersedia. Keluar 0 = lulus, 1 = gagal, 2 = dilewati. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function loadPlaywright() {
  const tries = ['playwright', path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright')];
  for (const t of tries) { try { return require(t); } catch (_) {} }
  console.log('Playwright tidak tersedia — test browser dilewati.');
  process.exit(2);
}
const { chromium } = loadPlaywright();

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const BUKTI = arg('--bukti') ? path.resolve(arg('--bukti')) : null;
const BAGIAN = arg('--bagian') ? arg('--bagian').split(',') : null;
const PARALEL = Math.max(1, +(arg('--paralel') || 4));
const VIDEO = {
  terang: { href: 'assets/video/asset-terang.mp4', nama: 'PSG-Asset-Light.mp4' },
  gelap: { href: 'assets/video/asset-gelap.mp4', nama: 'PSG-Asset-Dark.mp4' }
};

const hasil = [];
function cek(grup, ok, label, info) { hasil.push({ grup, ok: !!ok, label, info }); }
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json', mp3: 'audio/mpeg', mp4: 'video/mp4', png: 'image/png', svg: 'image/svg+xml', txt: 'text/plain' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const URL = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await chromium.launch();

  const tunggu = async (pg, fn, a, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (await pg.evaluate(fn, a)) return true; await pg.waitForTimeout(80); } return false; };
  async function bukaAsset(pg) {
    await tunggu(pg, () => !!document.getElementById('btnSalesIdea') && !!window.PSGUnduhVideo, null, 15000);
    for (let i = 0; i < 4; i++) {
      await pg.evaluate(() => document.getElementById('btnSalesIdea').click());
      if (await tunggu(pg, () => !!document.querySelector('[data-si-choice="asset"]'), null, 3000)) break;
    }
    await pg.evaluate(() => document.querySelector('[data-si-choice="asset"]').click());
    await tunggu(pg, () => !!document.querySelector('#salesIdeaContent .acs'), null, 10000);
    await pg.waitForTimeout(250);
  }
  async function buka(tema) {
    const ctx = await br.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {} });
    if (tema) await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('uji.tema')) { localStorage.setItem('insuranceHub.theme.v3', t); sessionStorage.setItem('uji.tema', t); } } catch (_) {} }, tema);
    await pg.goto(URL);
    await bukaAsset(pg);
    return { ctx, pg, errs };
  }
  const temaHalaman = (pg) => pg.evaluate(() => document.documentElement.getAttribute('data-theme'));
  /* ganti tema lewat tombol tema aplikasi (theme-switcher.js) */
  const gantiTema = (pg) => pg.evaluate(() => { document.getElementById('btnThemeSwitch').click(); return document.documentElement.getAttribute('data-theme'); });
  const atributUnduh = (pg) => pg.evaluate(() => { const a = document.querySelector('#layarSalesIdea .sip-unduh'); return a && { href: a.getAttribute('href'), unduh: a.getAttribute('download') }; });
  /* tema diganti lalu tombol diklik pada tick yang sama (sebelum sampling 200 md
     modul sempat jalan); href & nama dibaca saat aksi bawaan tautan, unduhan dibatalkan */
  const gantiTemaLaluKlik = (pg) => pg.evaluate(() => {
    const a = document.querySelector('#layarSalesIdea .sip-unduh');
    let saatKlik = null;
    const tangkap = (e) => { if (e.target === a) { saatKlik = { href: a.getAttribute('href'), unduh: a.getAttribute('download') }; e.preventDefault(); } };
    document.addEventListener('click', tangkap);
    document.getElementById('btnThemeSwitch').click();
    const sebelumKlik = { href: a.getAttribute('href'), unduh: a.getAttribute('download') };
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    document.removeEventListener('click', tangkap);
    return { tema: document.documentElement.getAttribute('data-theme'), sebelumKlik, saatKlik };
  });
  /* klik tombol sungguhan → unduhan; nama & isi dibandingkan dengan berkas repo */
  async function unduh(pg, tema) {
    const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }), pg.click('#layarSalesIdea .sip-unduh')]);
    const isi = fs.readFileSync(await dl.path()), asli = fs.readFileSync(path.join(ROOT, VIDEO[tema].href));
    return { ok: dl.suggestedFilename() === VIDEO[tema].nama && isi.length === asli.length && sha256(isi) === sha256(asli), nama: dl.suggestedFilename(), ukuran: isi.length };
  }
  const status = (pg) => pg.evaluate(() => document.getElementById('layarSalesIdea').getAttribute('data-sip-status'));
  const uv = (pg) => pg.evaluate(() => window.PSGUnduhVideo.keadaan());
  const adegan = (pg) => pg.evaluate(() => { const n = document.querySelector('#salesIdeaContent .acs'); return n ? +n.getAttribute('data-acs') : 0; });
  const terlihat = (pg) => pg.evaluate(() => {
    const b = document.querySelector('#layarSalesIdea .sip-unduh');
    return !!(b && !b.hidden && b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden');
  });
  const klik = async (pg, id) => { await pg.click('#' + id); await pg.waitForTimeout(200); };
  /* scene aktif ditonton sampai status 'selesai'; tombol yang terlihat sebelum itu dicatat */
  async function tonton(pg, jejak) {
    const t0 = Date.now();
    while (Date.now() - t0 < 70000) {
      const s = await status(pg);
      if (s === 'selesai') return true;
      if (jejak && await terlihat(pg)) jejak.terlihat = true;
      await pg.waitForTimeout(250);
    }
    return false;
  }
  /* dari scene aktif (sudah berputar) sampai scene 6 selesai; jeda: { n: true } → pause/resume */
  async function tontonSampaiAkhir(pg, dari, jejak, jeda) {
    for (let n = dari; n <= 6; n++) {
      if (await adegan(pg) !== n) return 'scene aktif ' + (await adegan(pg)) + ', diharapkan ' + n;
      if (jeda && jeda[n]) {
        await pg.waitForTimeout(2000);
        await klik(pg, 'siPlay');
        jeda.hasil.push({ n, jeda: await status(pg), selama: (await uv(pg)).status });
        await pg.waitForTimeout(3000);
        jeda.hasil.push({ n, masihJeda: await status(pg), selama: (await uv(pg)).status });
        await klik(pg, 'siPlay');
        jeda.hasil.push({ n, lanjut: await status(pg) });
      }
      if (!(await tonton(pg, jejak))) return 'scene ' + n + ' tidak selesai';
      if (n < 6) {
        if (jejak && await terlihat(pg)) jejak.terlihat = true;
        await klik(pg, 'siNext');
      }
    }
    return '';
  }
  /* seek: semua animasi berhingga di panggung digeser (manipulasi currentTime) */
  const geser = (pg, md) => pg.evaluate((md) => {
    document.getElementById('salesIdeaContent').getAnimations({ subtree: true }).forEach((a) => {
      if (isFinite(a.effect.getComputedTiming().endTime)) a.currentTime = Math.max(0, (a.currentTime || 0) + md);
    });
  }, md);

  const SKENARIO = {
    1: async () => {
      const g = '1/8 NORMAL';
      const { ctx, pg, errs } = await buka();
      const jejak = { terlihat: false };
      const k0 = await uv(pg);
      cek(g, !(await terlihat(pg)) && k0.status === 'belum', 'Asset dibuka (frame siap): tombol tersembunyi, status belum', k0);
      await klik(pg, 'siPlay');
      cek(g, (await uv(pg)).status === 'berjalan', 'Play scene 1 dari awal → putaran berjalan', await uv(pg));
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err, 'scene 1–6 ditonton sampai selesai, Next di antaranya', err);
      cek(g, !jejak.terlihat, 'tombol tidak pernah terlihat sebelum scene 6 selesai');
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && k.tombol, 'scene 6 selesai → completion sah', k);
      const b = await pg.evaluate(() => { const a = document.querySelector('#layarSalesIdea .sip-unduh'); return a && { teks: a.textContent, href: a.getAttribute('href'), unduh: a.getAttribute('download'), tag: a.tagName, induk: a.parentNode.className }; });
      cek(g, (await temaHalaman(pg)) === 'original' && (await terlihat(pg)) && b && b.teks === '⬇ Download Video' && b.href === VIDEO.terang.href && b.unduh === VIDEO.terang.nama,
        'tema Original: tombol "⬇ Download Video" tampil, mengarah ke ' + VIDEO.terang.href + ' (unduh sebagai ' + VIDEO.terang.nama + ')', b);
      const u1 = await unduh(pg, 'terang');
      cek(g, u1.ok, 'klik (Original) → unduhan ' + VIDEO.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO.terang.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO.gelap.href && s1.saatKlik.unduh === VIDEO.gelap.nama,
        'ganti ke Dark lalu klik pada tick yang sama → saat klik mengarah ke ' + VIDEO.gelap.href + ' / ' + VIDEO.gelap.nama + ' (tema saat klik, bukan saat putar)', s1);
      const u2 = await unduh(pg, 'gelap');
      cek(g, u2.ok && (await terlihat(pg)), 'klik (Dark) → unduhan ' + VIDEO.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO.gelap.href + '); tombol tetap tampil', u2);
      await gantiTema(pg);
      /* tanpa klik, href ikut tema pada sampling modul berikutnya (≤ 200 md) */
      const ikut = await tunggu(pg, (v) => { const a = document.querySelector('#layarSalesIdea .sip-unduh'); return a.getAttribute('href') === v.href && a.getAttribute('download') === v.nama; }, VIDEO.terang, 1000);
      cek(g, (await temaHalaman(pg)) === 'original' && ikut,
        'kembali ke Original tanpa klik → dalam ≤ 1 dtk tombol mengarah ke ' + VIDEO.terang.href, await atributUnduh(pg));
      if (BUKTI) {
        fs.mkdirSync(BUKTI, { recursive: true });
        await pg.screenshot({ path: path.join(BUKTI, 'unduh-tombol-terang.png') });
        await pg.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); document.body.setAttribute('data-theme', 'dark'); });
        await pg.waitForTimeout(200);
        await pg.screenshot({ path: path.join(BUKTI, 'unduh-tombol-gelap.png') });
        await pg.evaluate(() => { document.documentElement.setAttribute('data-theme', 'original'); document.body.setAttribute('data-theme', 'original'); });
      }
      await klik(pg, 'siPrev');
      cek(g, (await terlihat(pg)) && (await uv(pg)).status === 'selesai', 'sesudah sah, Back tidak mencabut tombol (sampai keluar dari Asset)', await uv(pg));
      await pg.click('#salesIdeaContent [data-si-hub]'); await pg.waitForTimeout(400);
      cek(g, !(await terlihat(pg)), 'kembali ke hub → tombol tersembunyi');
      await pg.evaluate(() => document.querySelector('[data-si-choice="retirement"]').click()); await pg.waitForTimeout(600);
      cek(g, !(await terlihat(pg)), 'cerita lain (Retirement) → tombol tersembunyi');
      await pg.click('#salesIdeaContent [data-si-hub]'); await pg.waitForTimeout(400);
      await pg.evaluate(() => document.querySelector('[data-si-choice="asset"]').click()); await pg.waitForTimeout(600);
      cek(g, !(await terlihat(pg)) && (await uv(pg)).status === 'belum', 'Asset dibuka lagi → status belum, harus menonton ulang', await uv(pg));
      await pg.reload(); await bukaAsset(pg);
      cek(g, !(await terlihat(pg)) && (await uv(pg)).status === 'belum', 'muat ulang → tombol tersembunyi (status tidak disimpan)', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    2: async () => {
      const g = '2 PAUSE/RESUME';
      const { ctx, pg, errs } = await buka('dark');
      cek(g, (await temaHalaman(pg)) === 'dark', 'Asset diputar dalam tema Dark', await temaHalaman(pg));
      const jejak = { terlihat: false }, jeda = { 2: true, 5: true, hasil: [] };
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak, jeda);
      cek(g, !err, 'scene 1–6 ditonton sampai selesai dengan pause/resume di scene 2 & 5', err);
      const j = jeda.hasil;
      cek(g, j.length === 6 && j.filter((x) => x.jeda).every((x) => x.jeda === 'jeda' && x.selama === 'berjalan') &&
        j.filter((x) => x.masihJeda).every((x) => x.masihJeda === 'jeda' && x.selama === 'berjalan') && j.filter((x) => x.lanjut).every((x) => x.lanjut === 'berputar'),
      'PAUSE (3 dtk) lalu RESUME: putaran tetap berjalan', j);
      cek(g, !jejak.terlihat, 'tombol tidak terlihat sebelum selesai');
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && (await terlihat(pg)), 'pause/resume tetap sah → tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO.gelap.href, unduh: VIDEO.gelap.nama }),
        'tema Dark: tombol mengarah ke ' + VIDEO.gelap.href + ' (unduh sebagai ' + VIDEO.gelap.nama + ')', await atributUnduh(pg));
      const u1 = await unduh(pg, 'gelap');
      cek(g, u1.ok, 'klik (Dark) → unduhan ' + VIDEO.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO.gelap.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'original' && s1.saatKlik && s1.saatKlik.href === VIDEO.terang.href && s1.saatKlik.unduh === VIDEO.terang.nama,
        'diputar dalam Dark, ganti ke Original lalu klik pada tick yang sama → ' + VIDEO.terang.href + ' / ' + VIDEO.terang.nama, s1);
      const u2 = await unduh(pg, 'terang');
      cek(g, u2.ok, 'klik (Original) → unduhan ' + VIDEO.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO.terang.href + ')', u2);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    3: async () => {
      const g = '3 NEXT SEBELUM SELESAI';
      const { ctx, pg, errs } = await buka();
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(1500);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /NEXT/.test(k.alasan), 'Next sebelum scene 1 selesai → tidak sah', k);
      const err = await tontonSampaiAkhir(pg, 2, null);
      cek(g, !err, 'scene 2–6 tetap ditonton utuh sampai akhir', err);
      await pg.waitForTimeout(300);
      cek(g, !(await terlihat(pg)) && (await uv(pg)).status === 'tidak-sah', 'akhir cerita: tombol tetap tersembunyi', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    4: async () => {
      const g = '4 BACK';
      const { ctx, pg, errs } = await buka();
      await klik(pg, 'siPlay');
      let err = '';
      for (const n of [1, 2]) { if (!(await tonton(pg))) err = 'scene ' + n + ' tidak selesai'; await klik(pg, 'siNext'); }
      await pg.waitForTimeout(2000);
      await klik(pg, 'siPrev');
      const k = await uv(pg);
      cek(g, !err && (await adegan(pg)) === 2 && k.status === 'tidak-sah' && /BACK/.test(k.alasan), 'scene 1–2 utuh, Back di scene 3 → tidak sah', { err, k });
      err = await tontonSampaiAkhir(pg, 2, null);
      cek(g, !err, 'scene 2–6 ditonton utuh sampai akhir', err);
      await pg.waitForTimeout(300);
      cek(g, !(await terlihat(pg)) && (await uv(pg)).status === 'tidak-sah', 'akhir cerita: tombol tetap tersembunyi', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    BACK1: async () => {
      const g = '4b BACK KE SCENE 1';
      const { ctx, pg, errs } = await buka();
      await klik(pg, 'siPlay');
      const ok1 = await tonton(pg);
      await klik(pg, 'siNext');
      await pg.waitForTimeout(1500);
      await klik(pg, 'siPrev');
      const k = await uv(pg);
      cek(g, ok1 && (await adegan(pg)) === 1 && k.status === 'tidak-sah' && /BACK ke scene 1/.test(k.alasan), 'Back ke scene 1 (diputar dari awal) tetap tidak sah', k);
      await klik(pg, 'siReplay');
      const k2 = await uv(pg);
      cek(g, (await adegan(pg)) === 1 && k2.status === 'berjalan', 'Replay → putaran baru dari scene 1 (sah lagi)', k2);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    5: async () => {
      const g = '5 LOMPAT KE SCENE TERAKHIR';
      const { ctx, pg, errs } = await buka();
      for (let i = 0; i < 5; i++) await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, (await adegan(pg)) === 6 && k.status === 'tidak-sah', 'Next ×5 dari frame siap → scene 6, tidak sah', k);
      const ok = await tonton(pg);
      await pg.waitForTimeout(300);
      cek(g, ok && !(await terlihat(pg)) && (await uv(pg)).status === 'tidak-sah', 'scene 6 ditonton sampai selesai → tombol tersembunyi', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    6: async () => {
      const g = '6 SEEK';
      const { ctx, pg, errs } = await buka();
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(2000);
      await geser(pg, 5000);
      await pg.waitForTimeout(600);
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /seek/.test(k.alasan), 'animasi scene 1 dimajukan 5 dtk → tidak sah', k);
      const err = await tontonSampaiAkhir(pg, 1, null);
      cek(g, !err, 'cerita tetap ditonton sampai scene 6 selesai', err);
      await pg.waitForTimeout(300);
      cek(g, !(await terlihat(pg)) && (await uv(pg)).status === 'tidak-sah', 'akhir cerita: tombol tetap tersembunyi', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    MUNDUR: async () => {
      const g = '6b SEEK MUNDUR';
      const { ctx, pg } = await buka();
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(3000);
      await geser(pg, -1500);
      await pg.waitForTimeout(600);
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /mundur/.test(k.alasan), 'animasi dimundurkan 1,5 dtk → tidak sah', k);
      await ctx.close();
    },
    LAJU: async () => {
      const g = '6c LAJU ×4';
      const { ctx, pg } = await buka();
      await klik(pg, 'siPlay');
      const cdp = await ctx.newCDPSession(pg);
      await cdp.send('Animation.enable');
      await cdp.send('Animation.setPlaybackRate', { playbackRate: 4 });
      await pg.waitForTimeout(1500);
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /lebih cepat|laju/.test(k.alasan), 'animasi dipercepat ×4 (DevTools/CDP) → tidak sah', k);
      await ctx.close();
    },
    PAKSA: async () => {
      const g = '6d STATUS DIPAKSA';
      const { ctx, pg } = await buka();
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(1000);
      await pg.evaluate(() => document.getElementById('layarSalesIdea').setAttribute('data-sip-status', 'selesai'));
      await pg.waitForTimeout(400);
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /ujung/.test(k.alasan) && !(await terlihat(pg)), "atribut status dipaksa 'selesai' → tidak sah", k);
      await ctx.close();
    },
    7: async () => {
      const g = '7 RELOAD DARI TENGAH';
      const { ctx, pg, errs } = await buka();
      await klik(pg, 'siPlay');
      const ok1 = await tonton(pg);
      await klik(pg, 'siNext');
      await pg.waitForTimeout(3000);
      await pg.reload();
      await bukaAsset(pg);
      const k0 = await uv(pg);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, ok1 && k0.status === 'belum' && (await adegan(pg)) === 2 && k.status === 'tidak-sah', 'muat ulang lalu lanjut dari scene 2 → tidak sah', { k0, k });
      const err = await tontonSampaiAkhir(pg, 2, null);
      cek(g, !err, 'scene 2–6 ditonton utuh sampai akhir', err);
      await pg.waitForTimeout(300);
      cek(g, !(await terlihat(pg)) && (await uv(pg)).status === 'tidak-sah', 'akhir cerita: tombol tetap tersembunyi', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    }
  };

  const t0 = Date.now();
  const antre = Object.keys(SKENARIO).filter((k) => !BAGIAN || BAGIAN.includes(k));
  /* panjang dulu, pendek mengisi slot */
  const urut = ['1', '2', '3', '4', '6', '7', '5', 'BACK1', 'MUNDUR', 'LAJU', 'PAKSA'].filter((k) => antre.includes(k));
  await Promise.all(Array.from({ length: Math.min(PARALEL, urut.length) }, async () => {
    while (urut.length) {
      const k = urut.shift();
      try { await SKENARIO[k](); } catch (e) { cek('skenario ' + k, false, 'galat skenario', String(e && e.stack || e).slice(0, 400)); }
    }
  }));
  await br.close(); srv.close();

  /* R. berkas yang tidak boleh berubah */
  if (!BAGIAN || BAGIAN.includes('R')) {
    const jaga = ['src/sales-idea-player.js', 'src/sales-idea-keranjang.js', 'src/sales-idea-asset.js', 'src/sales-idea-asset.css', 'src/sales-idea.js', 'sw.js', 'assets/narasi'];
    const audio = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /-audio\.js$/.test(f)).map((f) => 'src/' + f);
    const d = spawnSync('git', ['diff', '--name-only', 'HEAD', '--'].concat(jaga, audio), { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    cek('R REPO', !d, 'pemutar, narator, scene Asset, manifest audio, service worker tidak berubah', d);
    const idx = spawnSync('git', ['diff', '-U0', 'HEAD', '--', 'index.html'], { cwd: ROOT, encoding: 'utf8' }).stdout;
    const tambah = idx.split('\n').filter((l) => /^\+[^+]/.test(l)), hapus = idx.split('\n').filter((l) => /^-[^-]/.test(l));
    cek('R REPO', hapus.length === 0 && tambah.length <= 1 && (tambah.length === 0 || /src\/sales-idea-video\.js/.test(tambah[0])), 'index.html: hanya +1 tag skrip sales-idea-video.js', { tambah, hapus });
    /* tanpa 404 statis: setiap video yang dirujuk modul ada di repo, dan sebaliknya */
    const modul = fs.readFileSync(path.join(ROOT, 'src/sales-idea-video.js'), 'utf8');
    const dirujuk = [...new Set(modul.match(/assets\/video\/[\w.-]+\.mp4/g) || [])].sort();
    const harus = Object.values(VIDEO).map((v) => v.href).sort();
    const ada = harus.map((h) => { const f = path.join(ROOT, h); return fs.existsSync(f) ? fs.statSync(f).size : 0; });
    cek('R REPO', JSON.stringify(dirujuk) === JSON.stringify(harus) && ada.every((n) => n > 0), 'video yang dirujuk modul = ' + harus.join(' + ') + ', keduanya ada di repo', { dirujuk, ukuran: ada });
  }

  let grup = '';
  hasil.sort((a, b) => a.grup.localeCompare(b.grup, 'id', { numeric: true }));
  for (const h of hasil) {
    if (h.grup !== grup) { grup = h.grup; console.log('— ' + grup); }
    console.log((h.ok ? '  OK   ' : '  GAGAL') + ' ' + h.label + (!h.ok && h.info !== undefined ? ' — ' + (typeof h.info === 'string' ? h.info : JSON.stringify(h.info)) : ''));
  }
  const gagal = hasil.filter((h) => !h.ok).length;
  console.log('waktu: ' + Math.round((Date.now() - t0) / 1000) + ' dtk; paralel ' + PARALEL);
  console.log(gagal ? 'HASIL: GAGAL (' + gagal + ')' : 'HASIL: SEMUA LULUS (' + hasil.length + ' cek)');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
