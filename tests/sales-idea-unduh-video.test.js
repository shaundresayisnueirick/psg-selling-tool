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
   RET1       Retirement (tema Original) ditonton utuh → tombol tampil
              (tidak pernah sebelumnya); href retirement-terang.mp4, unduhan
              PSG-Retirement-Light.mp4 = berkas repo; ganti ke Dark lalu klik →
              PSG-Retirement-Dark.mp4.
   RET2       Retirement (tema Dark) ditonton utuh → href retirement-gelap.mp4,
              unduhan PSG-Retirement-Dark.mp4 = berkas repo.
   RET3       Retirement: Next sebelum scene 1 selesai → tidak sah, tombol
              tersembunyi.
   KBS1       Keranjang Kehidupan (tema Original) 10 scene ditonton utuh →
              tombol tampil (tidak pernah sebelumnya); href basket-terang.mp4,
              unduhan PSG-Basket-Light.mp4 = berkas repo; ganti ke Dark lalu
              klik → PSG-Basket-Dark.mp4.
   KBS2       Keranjang (tema Dark) ditonton utuh → href basket-gelap.mp4,
              unduhan PSG-Basket-Dark.mp4 = berkas repo.
   KBS3       Keranjang: Next sebelum scene 1 selesai → tidak sah, tombol
              tersembunyi.
   RET4–RET6  seperti KBS4–KBS6 untuk Retirement: HP (potret Original → unduhan
              retirement-terang-portrait.mp4; diputar + Dark → tetap
              retirement-gelap-portrait.mp4), tablet (Dark → retirement-gelap.mp4;
              diputar + Original → retirement-terang.mp4), foldable terbuka
              (Original/Dark → retirement-terang/gelap.mp4).
   ACS4–ACS6  sama untuk Asset Creation: HP (potret Original → unduhan
              asset-terang-portrait.mp4; diputar + Dark → tetap
              asset-gelap-portrait.mp4), tablet (Dark → asset-gelap.mp4;
              diputar + Original → asset-terang.mp4), foldable terbuka
              (Original/Dark → asset-terang/gelap.mp4).
   EDU1       Education Planning (tema Original) 10 scene ditonton utuh, dengan
              PAUSE/RESUME di scene 3 → tombol tampil (tidak pernah sebelumnya);
              href education-terang.mp4, unduhan PSG-Education-Light.mp4 = berkas
              repo; ganti ke Dark lalu klik → PSG-Education-Dark.mp4.
   EDU2       Education (tema Dark) ditonton utuh → href education-gelap.mp4,
              unduhan PSG-Education-Dark.mp4 = berkas repo.
   EDU3       Education: Next sebelum scene 1 selesai → tidak sah, tombol
              tersembunyi.
   EDUX       Education, putaran gugur: seek maju, seek mundur, laju ×4 (CDP),
              BACK, lompat scene (Next dari frame siap), muat ulang lalu lanjut
              dari scene 2 → masing-masing tidak sah, tombol tersembunyi.
   EDU4–EDU6  seperti ACS4–ACS6 untuk Education (HP → education-*-portrait.mp4,
              tablet & foldable terbuka → education-*.mp4).
   JARI1      10 Jari (tema Original) 9 scene ditonton utuh → MOMEN tombol:
              tersembunyi sebelum dan selama scene 9 (termasuk selama narasinya),
              tampil sesudah jam scene 9 DAN narasi selesai (≤ 1,5 dtk sesudah
              narasi diam, ≥ lama rekaman S03-01 sejak scene 9 mulai); href
              jari-terang.mp4, unduhan PSG-10-Jari-Light.mp4 = berkas repo; ganti ke
              Dark lalu klik → PSG-10-Jari-Dark.mp4.
              Juga per scene 2–6 (pertanyaan): status 'selesai' tidak datang
              sebelum narasinya selesai dan tidak lebih cepat dari rekamannya.
   JARI2      10 Jari (tema Dark) dengan PAUSE/RESUME di scene 4, 7 & 9 → tetap
              sah, momen tombol sama seperti JARI1; href jari-gelap.mp4.
   JARI3      10 Jari: Next 3 dtk setelah scene 8 (alasan 2) dimulai, saat
              narasinya masih berjalan → tidak sah; scene 9 utuh → tersembunyi.
   JARI4      10 Jari: seek maju 20 dtk di scene 9 → tidak sah; tersembunyi.
   JARI6      10 Jari: Next 3 dtk setelah scene 2 (pertanyaan 1) dimulai, saat
              narasinya masih berjalan → tidak sah; sampai akhir → tersembunyi.
   JARI7      10 Jari, scene pertanyaan: seek maju 5 dtk di scene 3, laju ×4
              (CDP) di scene 2 → masing-masing tidak sah, tombol tersembunyi.
   JARI5      10 Jari smartphone (emulasi HP potret → diputar ke landscape +
              Dark) → jari-terang-portrait.mp4 lalu jari-gelap-portrait.mp4.
   JARIX      10 Jari, putaran gugur di scene 1: Next sebelum selesai, seek maju,
              laju ×4 (CDP) → masing-masing tidak sah, tombol tersembunyi.
   SG1        Bekerja di Singapura (tema Original) 8 scene ditonton utuh, dengan
              PAUSE/RESUME di scene 3 → tombol tampil (tidak pernah sebelumnya);
              href singapura-terang.mp4, unduhan PSG-Singapura-Light.mp4 = berkas
              repo; ganti ke Dark lalu klik → PSG-Singapura-Dark.mp4.
   SG2        Singapura (tema Dark) ditonton utuh → href singapura-gelap.mp4,
              unduhan PSG-Singapura-Dark.mp4 = berkas repo.
   SG3        Singapura: Next sebelum scene 1 selesai → tidak sah, tombol
              tersembunyi.
   SGX        Singapura, putaran gugur: seek maju, seek mundur, laju ×4 (CDP),
              BACK, lompat scene (Next dari frame siap), muat ulang lalu lanjut
              dari scene 2 → masing-masing tidak sah, tombol tersembunyi.
   SG4–SG6    seperti EDU4–EDU6 untuk Singapura (HP → singapura-*-portrait.mp4,
              tablet & foldable terbuka → singapura-*.mp4).
   PERANGKAT  untuk Asset, Basket, Retirement, Education, dan Singapura: kelas perangkat
              (PSGUnduhVideo.keadaan().perangkat) dan berkas
              yang dipilih SAAT KLIK pada 23 profil emulasi Chromium (HP
              Android/iPhone potret & landscape, HP diputar di halaman yang sama,
              layar luar foldable, tablet potret & landscape, foldable terbuka,
              laptop, desktop, layar lebar/ultrawide, layar sentuh besar, jendela
              desktop sempit, HP "situs desktop", HP + mouse dan tablet +
              trackpad → desktop) × tema Original/Dark: smartphone →
              <cerita>-<tema>-portrait.mp4, lainnya → <cerita>-<tema>.mp4.
              Hanya simulasi browser (screen, viewport, sentuh, pointer, hover) —
              bukan perangkat fisik.
   KBS4       HP Android potret (emulasi), tema Original: 10 scene ditonton utuh →
              unduhan PSG-Basket-Light-Portrait.mp4 = basket-terang-portrait.mp4;
              HP diputar ke landscape + ganti ke Dark lalu klik →
              basket-gelap-portrait.mp4 (tetap portrait).
   KBS5       tablet (emulasi) tema Dark: ditonton utuh → basket-gelap.mp4;
              diputar ke potret + ganti ke Original → basket-terang.mp4.
   KBS6       foldable terbuka / layar besar sentuh (emulasi) tema Original:
              ditonton utuh → basket-terang.mp4; ganti ke Dark → basket-gelap.mp4.
   R          pemutar, narator & naskah Keranjang, scene Asset, CSS Retirement
              & Keranjang, manifest audio, service worker tidak berubah;
              index.html hanya +1 skrip; semua berkas video yang dirujuk modul
              ada di repo.

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
const VIDEO_RET = {
  terang: { href: 'assets/video/retirement-terang.mp4', nama: 'PSG-Retirement-Light.mp4' },
  gelap: { href: 'assets/video/retirement-gelap.mp4', nama: 'PSG-Retirement-Dark.mp4' }
};
const VIDEO_KBS = {
  terang: { href: 'assets/video/basket-terang.mp4', nama: 'PSG-Basket-Light.mp4' },
  gelap: { href: 'assets/video/basket-gelap.mp4', nama: 'PSG-Basket-Dark.mp4' }
};
const VIDEO_P = {
  terang: { href: 'assets/video/asset-terang-portrait.mp4', nama: 'PSG-Asset-Light-Portrait.mp4' },
  gelap: { href: 'assets/video/asset-gelap-portrait.mp4', nama: 'PSG-Asset-Dark-Portrait.mp4' }
};
const VIDEO_EDU = {
  terang: { href: 'assets/video/education-terang.mp4', nama: 'PSG-Education-Light.mp4' },
  gelap: { href: 'assets/video/education-gelap.mp4', nama: 'PSG-Education-Dark.mp4' }
};
const VIDEO_EDU_P = {
  terang: { href: 'assets/video/education-terang-portrait.mp4', nama: 'PSG-Education-Light-Portrait.mp4' },
  gelap: { href: 'assets/video/education-gelap-portrait.mp4', nama: 'PSG-Education-Dark-Portrait.mp4' }
};
const VIDEO_SG = {
  terang: { href: 'assets/video/singapura-terang.mp4', nama: 'PSG-Singapura-Light.mp4' },
  gelap: { href: 'assets/video/singapura-gelap.mp4', nama: 'PSG-Singapura-Dark.mp4' }
};
const VIDEO_SG_P = {
  terang: { href: 'assets/video/singapura-terang-portrait.mp4', nama: 'PSG-Singapura-Light-Portrait.mp4' },
  gelap: { href: 'assets/video/singapura-gelap-portrait.mp4', nama: 'PSG-Singapura-Dark-Portrait.mp4' }
};
const VIDEO_RET_P = {
  terang: { href: 'assets/video/retirement-terang-portrait.mp4', nama: 'PSG-Retirement-Light-Portrait.mp4' },
  gelap: { href: 'assets/video/retirement-gelap-portrait.mp4', nama: 'PSG-Retirement-Dark-Portrait.mp4' }
};
const VIDEO_JARI = {
  terang: { href: 'assets/video/jari-terang.mp4', nama: 'PSG-10-Jari-Light.mp4' },
  gelap: { href: 'assets/video/jari-gelap.mp4', nama: 'PSG-10-Jari-Dark.mp4' }
};
const VIDEO_JARI_P = {
  terang: { href: 'assets/video/jari-terang-portrait.mp4', nama: 'PSG-10-Jari-Light-Portrait.mp4' },
  gelap: { href: 'assets/video/jari-gelap-portrait.mp4', nama: 'PSG-10-Jari-Dark-Portrait.mp4' }
};
const VIDEO_KBS_P = {
  terang: { href: 'assets/video/basket-terang-portrait.mp4', nama: 'PSG-Basket-Light-Portrait.mp4' },
  gelap: { href: 'assets/video/basket-gelap-portrait.mp4', nama: 'PSG-Basket-Dark-Portrait.mp4' }
};
/* profil emulasi Chromium (px CSS). sentuh = isMobile + hasTouch (pointer coarse, tanpa hover);
   tanpa sentuh = mouse (pointer fine + hover). putar = viewport diubah di halaman yang sama
   (screen tetap, seperti iOS). Simulasi browser, bukan perangkat fisik. */
const HP = (w, h, dpr) => ({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
const PC = (w, h, vw, vh) => ({ viewport: { width: vw || w, height: vh || h }, screen: { width: w, height: h } });
const PROFIL = [
  { nama: 'HP Android potret 412×915', o: HP(412, 915, 2.625), kelas: 'smartphone' },
  { nama: 'HP Android landscape 915×412', o: HP(915, 412, 2.625), kelas: 'smartphone' },
  { nama: 'iPhone potret 390×844', o: HP(390, 844, 3), kelas: 'smartphone' },
  { nama: 'iPhone diputar ke landscape (viewport 844×390, screen tetap)', o: HP(390, 844, 3), putar: [844, 390], kelas: 'smartphone' },
  { nama: 'HP besar 430×932', o: HP(430, 932, 3), kelas: 'smartphone' },
  { nama: 'HP "situs desktop" (viewport 980×2130, screen 412×915)', o: Object.assign(HP(412, 915, 2.625), { viewport: { width: 980, height: 2130 } }), kelas: 'smartphone' },
  { nama: 'foldable tertutup / layar luar 344×882', o: HP(344, 882, 3), kelas: 'smartphone' },
  { nama: 'tablet potret 820×1180', o: HP(820, 1180, 2), kelas: 'tablet' },
  { nama: 'tablet landscape 1180×820', o: HP(1180, 820, 2), kelas: 'tablet' },
  { nama: 'tablet diputar ke potret (viewport 820×1180, screen tetap)', o: HP(1180, 820, 2), putar: [820, 1180], kelas: 'tablet' },
  { nama: 'tablet kecil potret 744×1133', o: HP(744, 1133, 2), kelas: 'tablet' },
  { nama: 'tablet Android 800×1280', o: HP(800, 1280, 2), kelas: 'tablet' },
  { nama: 'foldable terbuka potret 884×1104', o: HP(884, 1104, 2.5), kelas: 'tablet' },
  { nama: 'foldable terbuka landscape 1104×884', o: HP(1104, 884, 2.5), kelas: 'tablet' },
  { nama: 'layar sentuh besar tanpa mouse 1366×768 (mis. 2-in-1 mode tablet)', o: HP(1366, 768, 1), kelas: 'tablet' },
  /* aturan 1: penunjuk utama mouse/trackpad + hover → desktop, walau layar kecil (konsekuensi yang disengaja) */
  { nama: 'HP + mouse / mode desktop (screen 412×915, pointer presisi + hover)', o: PC(412, 915), kelas: 'desktop' },
  { nama: 'tablet + trackpad (screen 820×1180, pointer presisi + hover)', o: PC(820, 1180), kelas: 'desktop' },
  { nama: 'laptop 1366×768', o: PC(1366, 768), kelas: 'desktop' },
  { nama: 'laptop 1440×900', o: PC(1440, 900), kelas: 'desktop' },
  { nama: 'desktop 1920×1080', o: PC(1920, 1080), kelas: 'desktop' },
  { nama: 'layar lebar 2560×1440', o: PC(2560, 1440), kelas: 'desktop' },
  { nama: 'ultrawide 3440×1440', o: PC(3440, 1440), kelas: 'desktop' },
  { nama: 'desktop, jendela sempit 400×800 (screen 1920×1080)', o: PC(1920, 1080, 400, 800), kelas: 'desktop' }
];
/* cerita yang diuji: pilihan di hub + node scene di panggung + jumlah scene */
const CER = {
  asset: { pilih: 'asset', sel: '.acs', attr: 'data-acs', jumlah: 6 },
  retirement: { pilih: 'retirement', sel: '.rps', attr: 'data-rps', jumlah: 6 },
  basket: { pilih: 'basket', sel: '.kbs', attr: 'data-kbs', jumlah: 10 },
  education: { pilih: 'education', sel: '.eps', attr: 'data-eps', jumlah: 10 },
  /* 10 Jari: BAB 1–2 memakai .jps[data-jps] 1–6, BAB 3 [data-jps-alasan] 1–3 →
     nomor scene global dibaca dari SalesIdea10Jari.keadaan().indeks */
  jari: { pilih: 'jari', sel: '.jps', attr: 'data-jps', jumlah: 9, indeksKeadaan: true },
  singapura: { pilih: 'singapura', sel: '.sgs', attr: 'data-sgs', jumlah: 8 }
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
  async function bukaCerita(pg, c) {
    await tunggu(pg, () => !!document.getElementById('btnSalesIdea') && !!window.PSGUnduhVideo, null, 15000);
    for (let i = 0; i < 4; i++) {
      await pg.evaluate(() => document.getElementById('btnSalesIdea').click());
      if (await tunggu(pg, (p) => !!document.querySelector('[data-si-choice="' + p + '"]'), c.pilih, 3000)) break;
    }
    await pg.evaluate((p) => document.querySelector('[data-si-choice="' + p + '"]').click(), c.pilih);
    await tunggu(pg, (s) => !!document.querySelector('#salesIdeaContent ' + s), c.sel, 10000);
    await pg.waitForTimeout(250);
  }
  const bukaAsset = (pg) => bukaCerita(pg, CER.asset);
  const ceritaDi = new WeakMap();
  async function buka(tema, kunci, profil) {
    const c = CER[kunci || 'asset'];
    const ctx = await br.newContext(Object.assign({ viewport: { width: 1366, height: 768 }, acceptDownloads: true }, profil || {}));
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {} });
    if (tema) await ctx.addInitScript((t) => { try { if (!sessionStorage.getItem('uji.tema')) { localStorage.setItem('insuranceHub.theme.v3', t); sessionStorage.setItem('uji.tema', t); } } catch (_) {} }, tema);
    await pg.goto(URL);
    await bukaCerita(pg, c);
    ceritaDi.set(pg, c);
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
  /* klik tombol (dispatch, aksi bawaan dicegah) → atribut yang berlaku SAAT klik */
  const klikTangkap = (pg) => pg.evaluate(() => {
    const a = document.querySelector('#layarSalesIdea .sip-unduh');
    if (!a) return null;
    let saatKlik = null;
    const tangkap = (e) => { if (e.target === a) { saatKlik = { href: a.getAttribute('href'), unduh: a.getAttribute('download') }; e.preventDefault(); } };
    document.addEventListener('click', tangkap);
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    document.removeEventListener('click', tangkap);
    return saatKlik;
  });
  /* klik tombol sungguhan → unduhan; nama & isi dibandingkan dengan berkas repo */
  async function unduh(pg, tema, V) {
    const v = (V || VIDEO)[tema];
    const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }), pg.click('#layarSalesIdea .sip-unduh')]);
    const isi = fs.readFileSync(await dl.path()), asli = fs.readFileSync(path.join(ROOT, v.href));
    return { ok: dl.suggestedFilename() === v.nama && isi.length === asli.length && sha256(isi) === sha256(asli), nama: dl.suggestedFilename(), ukuran: isi.length };
  }
  const status = (pg) => pg.evaluate(() => document.getElementById('layarSalesIdea').getAttribute('data-sip-status'));
  const uv = (pg) => pg.evaluate(() => window.PSGUnduhVideo.keadaan());
  const adegan = (pg) => {
    const c = ceritaDi.get(pg) || CER.asset;
    if (c.indeksKeadaan) return pg.evaluate(() => { const k = window.SalesIdea10Jari.keadaan(); return k.mode === 'jari' ? k.indeks + 1 : 0; });
    return pg.evaluate(([s, a]) => { const n = document.querySelector('#salesIdeaContent ' + s); return n ? +n.getAttribute(a) : 0; }, [c.sel, c.attr]);
  };
  const terlihat = (pg) => pg.evaluate(() => {
    const b = document.querySelector('#layarSalesIdea .sip-unduh');
    return !!(b && !b.hidden && b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden');
  });
  const klik = async (pg, id) => { await pg.click('#' + id); await pg.waitForTimeout(200); };
  /* scene aktif ditonton sampai status 'selesai'; tombol yang terlihat sebelum itu dicatat.
     Status & tombol dibaca dalam satu evaluate: dibaca terpisah, scene terakhir bisa
     selesai di antara keduanya dan tombol yang sah tercatat "terlihat sebelum selesai". */
  async function tonton(pg, jejak) {
    const t0 = Date.now();
    while (Date.now() - t0 < 100000) {   /* scene 1 10 Jari ±66,5 dtk */
      const [s, v] = await pg.evaluate(() => {
        const b = document.querySelector('#layarSalesIdea .sip-unduh');
        return [document.getElementById('layarSalesIdea').getAttribute('data-sip-status'),
          !!(b && !b.hidden && b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden')];
      });
      if (s === 'selesai') return true;
      if (jejak && v) jejak.terlihat = true;
      await pg.waitForTimeout(250);
    }
    return false;
  }
  /* dari scene aktif (sudah berputar) sampai scene terakhir selesai; jeda: { n: true } → pause/resume */
  async function tontonSampaiAkhir(pg, dari, jejak, jeda) {
    const akhir = (ceritaDi.get(pg) || CER.asset).jumlah;
    for (let n = dari; n <= akhir; n++) {
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
      if (n < akhir) {
        if (jejak && await terlihat(pg)) jejak.terlihat = true;
        await klik(pg, 'siNext');
      }
    }
    return '';
  }
  /* Retirement / Asset / Education / Singapura di perangkat emulasi: ditonton utuh → unduhan V1
     (tema awal); lalu (opsional) diputar + tema diganti → klik memilih V2; unduhan
     dicocokkan SHA-256 */
  async function tontonUnduhPerangkat(o) {
    const kunci = o.kunci || 'retirement';
    const { ctx, pg, errs } = await buka(o.tema, kunci, o.profil);
    const jejak = { terlihat: false }, g = o.g;
    cek(g, (await uv(pg)).perangkat === o.kelas, o.ket + ' → kelas ' + o.kelas, await uv(pg));
    await klik(pg, 'siPlay');
    const err = await tontonSampaiAkhir(pg, 1, jejak);
    cek(g, !err && !jejak.terlihat, 'scene 1–' + CER[kunci].jumlah + ' ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
    await pg.waitForTimeout(300);
    cek(g, (await uv(pg)).status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', await uv(pg));
    const t1 = (await temaHalaman(pg)) === 'dark' ? 'gelap' : 'terang';
    const u1 = await unduh(pg, t1, { [t1]: o.V1 });
    cek(g, u1.ok, 'klik → unduhan ' + o.V1.nama + ' (ukuran & SHA-256 = ' + o.V1.href + ')', u1);
    if (o.putar) { await pg.setViewportSize({ width: o.putar[0], height: o.putar[1] }); await pg.waitForTimeout(300); }
    const s1 = await gantiTemaLaluKlik(pg);
    cek(g, s1.saatKlik && s1.saatKlik.href === o.V2.href && s1.saatKlik.unduh === o.V2.nama,
      (o.putar ? 'diputar + ' : '') + 'ganti tema lalu klik → ' + o.V2.href, s1);
    const t2 = s1.tema === 'dark' ? 'gelap' : 'terang';
    const u2 = await unduh(pg, t2, { [t2]: o.V2 });
    cek(g, u2.ok, 'klik → unduhan ' + o.V2.nama + ' (ukuran & SHA-256 = ' + o.V2.href + ')', u2);
    cek(g, !errs.length, 'tanpa error halaman', errs);
    await ctx.close();
  }
  /* 10 Jari: perekam di halaman (tiap 40 md, hanya perubahan) — nomor scene,
     status, narasi berbicara, tombol terlihat — untuk memastikan MOMEN tombol tampil */
  const pasangPerekam = (pg) => pg.evaluate(() => {
    const log = window.__ujiMomen = [];
    let akhir = '';
    setInterval(() => {
      const L = document.getElementById('layarSalesIdea');
      const k = window.SalesIdea10Jari.keadaan();
      const nb = L.querySelector('[data-kbs-suara]'), b = L.querySelector('.sip-unduh');
      const s = {
        n: k.mode === 'jari' ? k.indeks + 1 : 0,
        status: L.getAttribute('data-sip-status'),
        bicara: !!(nb && nb.classList.contains('kbs-suara-bicara')),
        tombol: !!(b && !b.hidden && b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden'),
        gerbang: window.PSGUnduhVideo.keadaan().status
      };
      const kunci = JSON.stringify(s);
      if (kunci !== akhir) { akhir = kunci; log.push(Object.assign({ t: Math.round(performance.now()) }, s)); }
    }, 40);
  });
  async function momenTombol(pg, terakhir) {
    const { log, rekaman } = await pg.evaluate((n) => {
      const klip = window.PSGJariAlasanAudio.segmen['S0' + (n - 6) + '-01'];
      return { log: window.__ujiMomen || [], rekaman: Math.round(klip.reduce((t, c) => t + (c.end - c.start), 0) * 1000) };
    }, terakhir);
    const awal = log.find((e) => e.n === terakhir && e.status === 'berputar');
    const diScene = awal ? log.filter((e) => e.t >= awal.t) : [];
    const selesai = diScene.find((e) => e.status === 'selesai');
    const bicaraTerakhir = diScene.filter((e) => e.bicara).pop();
    const diam = bicaraTerakhir ? diScene.find((e) => e.t > bicaraTerakhir.t && !e.bicara) : null;
    const tombol = log.find((e) => e.tombol);
    const r = {
      rekamanMd: rekaman, mulai: awal && awal.t, statusSelesai: selesai && selesai.t, narasiDiam: diam && diam.t, tombol: tombol && tombol.t,
      tombolSejakMulai: awal && tombol ? tombol.t - awal.t : null,
      tombolSesudahNarasi: diam && tombol ? tombol.t - diam.t : null,
      tombolSaatBicara: log.some((e) => e.tombol && e.bicara),
      tombolSebelumScene: !!(tombol && awal && tombol.t < awal.t), sampel: log.length,
      gugurDi: (log.find((e) => e.gerbang === 'tidak-sah') || {}).n || null
    };
    r.ok = !!(awal && selesai && diam && tombol) && !r.tombolSaatBicara && !r.tombolSebelumScene &&
      tombol.t >= selesai.t && tombol.t >= diam.t && r.tombolSejakMulai >= rekaman && r.tombolSesudahNarasi <= 1500;
    return r;
  }
  /* 10 Jari scene pertanyaan 2–6: dari log perekam, status 'selesai' tiap scene
     tidak boleh datang saat narasinya masih berbicara, harus sesudah narasi
     scene itu diam, dan tidak lebih cepat dari lama rekamannya (S0n-01) */
  async function selesaiTiapScene(pg, daftar) {
    const { log, rekaman } = await pg.evaluate((ns) => ({
      log: window.__ujiMomen || [],
      rekaman: ns.map((n) => Math.round(window.PSGJariAudio.segmen['S0' + n + '-01'].reduce((t, c) => t + (c.end - c.start), 0) * 1000))
    }), daftar);
    const hasil = daftar.map((n, i) => {
      const awal = log.find((e) => e.n === n && e.status === 'berputar');
      const selesai = log.find((e) => e.n === n && e.status === 'selesai');
      const diScene = awal && selesai ? log.filter((e) => e.n === n && e.t >= awal.t && e.t <= selesai.t) : [];
      const bicara = diScene.filter((e) => e.bicara);
      const diam = bicara.length ? diScene.find((e) => e.t > bicara[bicara.length - 1].t && !e.bicara) : null;
      const r = { n, rekamanMd: rekaman[i], selesaiSejakMulai: awal && selesai ? selesai.t - awal.t : null,
        narasiDiamSejakMulai: awal && diam ? diam.t - awal.t : null, selesaiSaatBicara: !!(selesai && selesai.bicara) };
      r.ok = !!(awal && selesai && bicara.length && diam) && !r.selesaiSaatBicara &&
        selesai.t >= diam.t && r.selesaiSejakMulai >= rekaman[i];
      return r;
    });
    return { ok: hasil.every((r) => r.ok), hasil };
  }
  /* 10 Jari: scene dari..sampai ditonton sampai status 'selesai', Next di antaranya */
  async function tontonJari(pg, dari, sampai) {
    for (let n = dari; n <= sampai; n++) {
      if (await adegan(pg) !== n) return 'scene aktif ' + (await adegan(pg)) + ', diharapkan ' + n;
      if (!(await tonton(pg))) return 'scene ' + n + ' tidak selesai';
      await klik(pg, 'siNext');
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
    },
    RET1: async () => {
      const g = 'RET1 RETIREMENT ORIGINAL';
      const { ctx, pg, errs } = await buka(null, 'retirement');
      const jejak = { terlihat: false };
      const k0 = await uv(pg);
      cek(g, (await temaHalaman(pg)) === 'original' && !(await terlihat(pg)) && k0.cerita === 'retirement' && k0.status === 'belum', 'Retirement dibuka (tema Original): tombol tersembunyi, status belum', k0);
      await klik(pg, 'siPlay');
      cek(g, (await uv(pg)).status === 'berjalan', 'Play scene 1 dari awal → putaran berjalan', await uv(pg));
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err, 'scene 1–6 ditonton sampai selesai, Next di antaranya', err);
      cek(g, !jejak.terlihat, 'tombol tidak pernah terlihat sebelum scene 6 selesai');
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && k.tombol && (await terlihat(pg)), 'scene 6 selesai → completion sah, tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_RET.terang.href, unduh: VIDEO_RET.terang.nama }),
        'tema Original: tombol mengarah ke ' + VIDEO_RET.terang.href + ' (unduh sebagai ' + VIDEO_RET.terang.nama + ')', await atributUnduh(pg));
      const u1 = await unduh(pg, 'terang', VIDEO_RET);
      cek(g, u1.ok, 'klik (Original) → unduhan ' + VIDEO_RET.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_RET.terang.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO_RET.gelap.href && s1.saatKlik.unduh === VIDEO_RET.gelap.nama,
        'ganti ke Dark lalu klik pada tick yang sama → ' + VIDEO_RET.gelap.href + ' / ' + VIDEO_RET.gelap.nama + ' (tema saat klik)', s1);
      const u2 = await unduh(pg, 'gelap', VIDEO_RET);
      cek(g, u2.ok, 'klik (Dark) → unduhan ' + VIDEO_RET.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_RET.gelap.href + ')', u2);
      if (BUKTI) { fs.mkdirSync(BUKTI, { recursive: true }); await pg.screenshot({ path: path.join(BUKTI, 'unduh-retirement-gelap.png') }); }
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    RET2: async () => {
      const g = 'RET2 RETIREMENT DARK';
      const { ctx, pg, errs } = await buka('dark', 'retirement');
      cek(g, (await temaHalaman(pg)) === 'dark', 'Retirement diputar dalam tema Dark', await temaHalaman(pg));
      const jejak = { terlihat: false };
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–6 ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_RET.gelap.href, unduh: VIDEO_RET.gelap.nama }),
        'tema Dark: tombol mengarah ke ' + VIDEO_RET.gelap.href + ' (unduh sebagai ' + VIDEO_RET.gelap.nama + ')', await atributUnduh(pg));
      const u = await unduh(pg, 'gelap', VIDEO_RET);
      cek(g, u.ok, 'klik (Dark) → unduhan ' + VIDEO_RET.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_RET.gelap.href + ')', u);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    RET3: async () => {
      const g = 'RET3 RETIREMENT NEXT SEBELUM SELESAI';
      const { ctx, pg, errs } = await buka(null, 'retirement');
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(1500);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /NEXT/.test(k.alasan) && !(await terlihat(pg)), 'Next sebelum scene 1 selesai → tidak sah, tombol tersembunyi', k);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    KBS1: async () => {
      const g = 'KBS1 KERANJANG ORIGINAL';
      const { ctx, pg, errs } = await buka(null, 'basket');
      const jejak = { terlihat: false };
      const k0 = await uv(pg);
      cek(g, (await temaHalaman(pg)) === 'original' && !(await terlihat(pg)) && k0.cerita === 'basket' && k0.status === 'belum', 'Keranjang dibuka (tema Original): tombol tersembunyi, status belum', k0);
      await klik(pg, 'siPlay');
      cek(g, (await uv(pg)).status === 'berjalan', 'Play scene 1 dari awal → putaran berjalan', await uv(pg));
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err, 'scene 1–10 ditonton sampai selesai, Next di antaranya', err);
      cek(g, !jejak.terlihat, 'tombol tidak pernah terlihat sebelum scene 10 selesai');
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && k.total === 10 && k.tombol && (await terlihat(pg)), 'scene 10 selesai → completion sah, tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_KBS.terang.href, unduh: VIDEO_KBS.terang.nama }),
        'tema Original: tombol mengarah ke ' + VIDEO_KBS.terang.href + ' (unduh sebagai ' + VIDEO_KBS.terang.nama + ')', await atributUnduh(pg));
      const u1 = await unduh(pg, 'terang', VIDEO_KBS);
      cek(g, u1.ok, 'klik (Original) → unduhan ' + VIDEO_KBS.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS.terang.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO_KBS.gelap.href && s1.saatKlik.unduh === VIDEO_KBS.gelap.nama,
        'ganti ke Dark lalu klik pada tick yang sama → ' + VIDEO_KBS.gelap.href + ' / ' + VIDEO_KBS.gelap.nama + ' (tema saat klik)', s1);
      const u2 = await unduh(pg, 'gelap', VIDEO_KBS);
      cek(g, u2.ok, 'klik (Dark) → unduhan ' + VIDEO_KBS.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS.gelap.href + ')', u2);
      if (BUKTI) { fs.mkdirSync(BUKTI, { recursive: true }); await pg.screenshot({ path: path.join(BUKTI, 'unduh-basket-gelap.png') }); }
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    KBS2: async () => {
      const g = 'KBS2 KERANJANG DARK';
      const { ctx, pg, errs } = await buka('dark', 'basket');
      cek(g, (await temaHalaman(pg)) === 'dark', 'Keranjang diputar dalam tema Dark', await temaHalaman(pg));
      const jejak = { terlihat: false };
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–10 ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_KBS.gelap.href, unduh: VIDEO_KBS.gelap.nama }),
        'tema Dark: tombol mengarah ke ' + VIDEO_KBS.gelap.href + ' (unduh sebagai ' + VIDEO_KBS.gelap.nama + ')', await atributUnduh(pg));
      const u = await unduh(pg, 'gelap', VIDEO_KBS);
      cek(g, u.ok, 'klik (Dark) → unduhan ' + VIDEO_KBS.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS.gelap.href + ')', u);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    PERANGKAT: async () => {
      const g = 'PERANGKAT KLASIFIKASI & PEMETAAN (EMULASI)';
      for (const [kunci, VL, VP] of [['basket', VIDEO_KBS, VIDEO_KBS_P], ['retirement', VIDEO_RET, VIDEO_RET_P], ['asset', VIDEO, VIDEO_P], ['education', VIDEO_EDU, VIDEO_EDU_P], ['singapura', VIDEO_SG, VIDEO_SG_P]])
      for (const p of PROFIL) {
        const { ctx, pg, errs } = await buka(null, kunci, p.o);
        if (p.putar) { await pg.setViewportSize({ width: p.putar[0], height: p.putar[1] }); await pg.waitForTimeout(150); }
        const hasil = { kelas: (await uv(pg)).perangkat, tema: {} };
        for (let i = 0; i < 2; i++) {
          const tema = await temaHalaman(pg), k = await klikTangkap(pg);
          hasil.tema[tema] = k;
          if (i === 0) { await gantiTema(pg); await pg.waitForTimeout(50); }
        }
        const V = p.kelas === 'smartphone' ? VP : VL;
        const benar = (t, v) => hasil.tema[t] && hasil.tema[t].href === v.href && hasil.tema[t].unduh === v.nama;
        cek(g, hasil.kelas === p.kelas && benar('original', V.terang) && benar('dark', V.gelap) && !errs.length,
          kunci + ' | ' + p.nama + ' → ' + p.kelas + ' → ' + (p.kelas === 'smartphone' ? 'Portrait' : 'Landscape') + ' (Original: ' + V.terang.href.split('/').pop() + ', Dark: ' + V.gelap.href.split('/').pop() + ')', Object.assign(hasil, { errs }));
        await ctx.close();
      }
    },
    KBS4: async () => {
      const g = 'KBS4 KERANJANG SMARTPHONE (EMULASI)';
      const { ctx, pg, errs } = await buka(null, 'basket', HP(412, 915, 2.625));
      const jejak = { terlihat: false };
      cek(g, (await uv(pg)).perangkat === 'smartphone' && (await temaHalaman(pg)) === 'original', 'HP potret, tema Original → kelas smartphone', await uv(pg));
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–10 ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(300);
      cek(g, (await uv(pg)).status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', await uv(pg));
      const u1 = await unduh(pg, 'terang', VIDEO_KBS_P);
      cek(g, u1.ok, 'klik (HP potret, Original) → unduhan ' + VIDEO_KBS_P.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS_P.terang.href + ')', u1);
      await pg.setViewportSize({ width: 915, height: 412 });
      await pg.waitForTimeout(300);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO_KBS_P.gelap.href && s1.saatKlik.unduh === VIDEO_KBS_P.gelap.nama,
        'HP diputar ke landscape + ganti ke Dark lalu klik → tetap Portrait: ' + VIDEO_KBS_P.gelap.href, s1);
      const u2 = await unduh(pg, 'gelap', VIDEO_KBS_P);
      cek(g, u2.ok, 'klik (HP landscape, Dark) → unduhan ' + VIDEO_KBS_P.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS_P.gelap.href + ')', u2);
      if (BUKTI) { fs.mkdirSync(BUKTI, { recursive: true }); await pg.screenshot({ path: path.join(BUKTI, 'unduh-basket-hp.png') }); }
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    KBS5: async () => {
      const g = 'KBS5 KERANJANG TABLET (EMULASI)';
      const { ctx, pg, errs } = await buka('dark', 'basket', HP(1180, 820, 2));
      const jejak = { terlihat: false };
      cek(g, (await uv(pg)).perangkat === 'tablet' && (await temaHalaman(pg)) === 'dark', 'tablet landscape, tema Dark → kelas tablet', await uv(pg));
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–10 ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(300);
      cek(g, (await uv(pg)).status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', await uv(pg));
      const u1 = await unduh(pg, 'gelap', VIDEO_KBS);
      cek(g, u1.ok, 'klik (tablet, Dark) → unduhan ' + VIDEO_KBS.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS.gelap.href + ')', u1);
      await pg.setViewportSize({ width: 820, height: 1180 });
      await pg.waitForTimeout(300);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'original' && s1.saatKlik && s1.saatKlik.href === VIDEO_KBS.terang.href && s1.saatKlik.unduh === VIDEO_KBS.terang.nama,
        'tablet diputar ke potret + ganti ke Original lalu klik → tetap Landscape: ' + VIDEO_KBS.terang.href, s1);
      const u2 = await unduh(pg, 'terang', VIDEO_KBS);
      cek(g, u2.ok, 'klik (tablet potret, Original) → unduhan ' + VIDEO_KBS.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS.terang.href + ')', u2);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    KBS6: async () => {
      const g = 'KBS6 KERANJANG FOLDABLE TERBUKA (EMULASI)';
      const { ctx, pg, errs } = await buka(null, 'basket', HP(884, 1104, 2.5));
      const jejak = { terlihat: false };
      cek(g, (await uv(pg)).perangkat === 'tablet', 'foldable terbuka 884×1104 (sentuh) → kelas tablet / layar besar', await uv(pg));
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–10 ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(300);
      cek(g, (await uv(pg)).status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', await uv(pg));
      const u1 = await unduh(pg, 'terang', VIDEO_KBS);
      cek(g, u1.ok, 'klik (foldable, Original) → unduhan ' + VIDEO_KBS.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS.terang.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO_KBS.gelap.href, 'ganti ke Dark lalu klik → ' + VIDEO_KBS.gelap.href, s1);
      const u2 = await unduh(pg, 'gelap', VIDEO_KBS);
      cek(g, u2.ok, 'klik (foldable, Dark) → unduhan ' + VIDEO_KBS.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_KBS.gelap.href + ')', u2);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    RET4: () => tontonUnduhPerangkat({ g: 'RET4 RETIREMENT SMARTPHONE (EMULASI)', profil: HP(412, 915, 2.625), tema: null, kelas: 'smartphone',
      V1: VIDEO_RET_P.terang, putar: [915, 412], V2: VIDEO_RET_P.gelap, ket: 'HP potret → diputar ke landscape (tetap Portrait)' }),
    RET5: () => tontonUnduhPerangkat({ g: 'RET5 RETIREMENT TABLET (EMULASI)', profil: HP(1180, 820, 2), tema: 'dark', kelas: 'tablet',
      V1: VIDEO_RET.gelap, putar: [820, 1180], V2: VIDEO_RET.terang, ket: 'tablet landscape → diputar ke potret (tetap Landscape)' }),
    RET6: () => tontonUnduhPerangkat({ g: 'RET6 RETIREMENT FOLDABLE TERBUKA (EMULASI)', profil: HP(884, 1104, 2.5), tema: null, kelas: 'tablet',
      V1: VIDEO_RET.terang, putar: null, V2: VIDEO_RET.gelap, ket: 'foldable terbuka 884×1104' }),
    ACS4: () => tontonUnduhPerangkat({ g: 'ACS4 ASSET SMARTPHONE (EMULASI)', kunci: 'asset', profil: HP(412, 915, 2.625), tema: null, kelas: 'smartphone',
      V1: VIDEO_P.terang, putar: [915, 412], V2: VIDEO_P.gelap, ket: 'HP potret → diputar ke landscape (tetap Portrait)' }),
    ACS5: () => tontonUnduhPerangkat({ g: 'ACS5 ASSET TABLET (EMULASI)', kunci: 'asset', profil: HP(1180, 820, 2), tema: 'dark', kelas: 'tablet',
      V1: VIDEO.gelap, putar: [820, 1180], V2: VIDEO.terang, ket: 'tablet landscape → diputar ke potret (tetap Landscape)' }),
    ACS6: () => tontonUnduhPerangkat({ g: 'ACS6 ASSET FOLDABLE TERBUKA (EMULASI)', kunci: 'asset', profil: HP(884, 1104, 2.5), tema: null, kelas: 'tablet',
      V1: VIDEO.terang, putar: null, V2: VIDEO.gelap, ket: 'foldable terbuka 884×1104' }),
    EDU1: async () => {
      const g = 'EDU1 EDUCATION ORIGINAL';
      const { ctx, pg, errs } = await buka(null, 'education');
      const jejak = { terlihat: false }, jeda = { 3: true, hasil: [] };
      const k0 = await uv(pg);
      cek(g, (await temaHalaman(pg)) === 'original' && !(await terlihat(pg)) && k0.cerita === 'education' && k0.status === 'belum', 'Education dibuka (tema Original): tombol tersembunyi, status belum', k0);
      await klik(pg, 'siPlay');
      cek(g, (await uv(pg)).status === 'berjalan', 'Play scene 1 dari awal → putaran berjalan', await uv(pg));
      const err = await tontonSampaiAkhir(pg, 1, jejak, jeda);
      cek(g, !err, 'scene 1–10 ditonton sampai selesai, Next di antaranya', err);
      const j = jeda.hasil;
      cek(g, j.length === 3 && j[0].jeda === 'jeda' && j[0].selama === 'berjalan' && j[1].masihJeda === 'jeda' && j[1].selama === 'berjalan' && j[2].lanjut === 'berputar',
        'PAUSE 3 dtk lalu RESUME di scene 3 → putaran tetap berjalan', j);
      cek(g, !jejak.terlihat, 'tombol tidak pernah terlihat sebelum scene 10 selesai');
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && k.tombol && (await terlihat(pg)), 'scene 10 selesai → completion sah, tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_EDU.terang.href, unduh: VIDEO_EDU.terang.nama }),
        'tema Original: tombol mengarah ke ' + VIDEO_EDU.terang.href + ' (unduh sebagai ' + VIDEO_EDU.terang.nama + ')', await atributUnduh(pg));
      const u1 = await unduh(pg, 'terang', VIDEO_EDU);
      cek(g, u1.ok, 'klik (Original) → unduhan ' + VIDEO_EDU.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_EDU.terang.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO_EDU.gelap.href && s1.saatKlik.unduh === VIDEO_EDU.gelap.nama,
        'ganti ke Dark lalu klik pada tick yang sama → ' + VIDEO_EDU.gelap.href + ' / ' + VIDEO_EDU.gelap.nama + ' (tema saat klik)', s1);
      const u2 = await unduh(pg, 'gelap', VIDEO_EDU);
      cek(g, u2.ok, 'klik (Dark) → unduhan ' + VIDEO_EDU.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_EDU.gelap.href + ')', u2);
      await pg.waitForTimeout(1200);
      cek(g, (await terlihat(pg)) && (await uv(pg)).status === 'selesai', 'tombol tetap tampil sesudah diunduh (masih di cerita yang sama)', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    EDU2: async () => {
      const g = 'EDU2 EDUCATION DARK';
      const { ctx, pg, errs } = await buka('dark', 'education');
      cek(g, (await temaHalaman(pg)) === 'dark', 'Education diputar dalam tema Dark', await temaHalaman(pg));
      const jejak = { terlihat: false };
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–10 ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_EDU.gelap.href, unduh: VIDEO_EDU.gelap.nama }),
        'tema Dark: tombol mengarah ke ' + VIDEO_EDU.gelap.href + ' (unduh sebagai ' + VIDEO_EDU.gelap.nama + ')', await atributUnduh(pg));
      const u = await unduh(pg, 'gelap', VIDEO_EDU);
      cek(g, u.ok, 'klik (Dark) → unduhan ' + VIDEO_EDU.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_EDU.gelap.href + ')', u);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    EDU3: async () => {
      const g = 'EDU3 EDUCATION NEXT SEBELUM SELESAI';
      const { ctx, pg, errs } = await buka(null, 'education');
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(1500);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /NEXT/.test(k.alasan) && !(await terlihat(pg)), 'Next sebelum scene 1 selesai → tidak sah, tombol tersembunyi', k);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    EDUX: async () => {
      const g = 'EDUX EDUCATION PUTARAN GUGUR';
      const gugur = async (label, aksi, pola) => {
        const { ctx, pg, errs } = await buka(null, 'education');
        await aksi(pg, ctx);
        const k = await uv(pg);
        cek(g, k.status === 'tidak-sah' && pola.test(k.alasan) && !(await terlihat(pg)) && !errs.length, label + ' → tidak sah, tombol tersembunyi', Object.assign({ errs }, k));
        await ctx.close();
      };
      await gugur('seek maju 5 dtk di scene 1', async (pg) => { await klik(pg, 'siPlay'); await pg.waitForTimeout(2000); await geser(pg, 5000); await pg.waitForTimeout(600); }, /seek/);
      await gugur('seek mundur 1,5 dtk di scene 1', async (pg) => { await klik(pg, 'siPlay'); await pg.waitForTimeout(3000); await geser(pg, -1500); await pg.waitForTimeout(600); }, /mundur/);
      await gugur('laju animasi ×4 (DevTools/CDP)', async (pg, ctx) => {
        await klik(pg, 'siPlay');
        const cdp = await ctx.newCDPSession(pg);
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 4 });
        await pg.waitForTimeout(1500);
      }, /lebih cepat|laju/);
      await gugur('scene 1 utuh, Next, lalu BACK di scene 2', async (pg) => { await klik(pg, 'siPlay'); await tonton(pg); await klik(pg, 'siNext'); await pg.waitForTimeout(1500); await klik(pg, 'siPrev'); }, /^BACK/);
      await gugur('lompat: Next ×9 dari frame siap → scene 10', async (pg) => { for (let i = 0; i < 9; i++) await klik(pg, 'siNext'); }, /tidak dimulai dari scene 1|tidak diputar|lompat/);
      await gugur('muat ulang di scene 2 lalu lanjut dari scene 2', async (pg) => {
        await klik(pg, 'siPlay'); await tonton(pg); await klik(pg, 'siNext'); await pg.waitForTimeout(2000);
        await pg.reload(); await bukaCerita(pg, CER.education); await klik(pg, 'siNext');
      }, /tidak dimulai dari scene 1|tidak diputar/);
    },
    EDU4: () => tontonUnduhPerangkat({ g: 'EDU4 EDUCATION SMARTPHONE (EMULASI)', kunci: 'education', profil: HP(412, 915, 2.625), tema: null, kelas: 'smartphone',
      V1: VIDEO_EDU_P.terang, putar: [915, 412], V2: VIDEO_EDU_P.gelap, ket: 'HP potret → diputar ke landscape (tetap Portrait)' }),
    EDU5: () => tontonUnduhPerangkat({ g: 'EDU5 EDUCATION TABLET (EMULASI)', kunci: 'education', profil: HP(1180, 820, 2), tema: 'dark', kelas: 'tablet',
      V1: VIDEO_EDU.gelap, putar: [820, 1180], V2: VIDEO_EDU.terang, ket: 'tablet landscape → diputar ke potret (tetap Landscape)' }),
    EDU6: () => tontonUnduhPerangkat({ g: 'EDU6 EDUCATION FOLDABLE TERBUKA (EMULASI)', kunci: 'education', profil: HP(884, 1104, 2.5), tema: null, kelas: 'tablet',
      V1: VIDEO_EDU.terang, putar: null, V2: VIDEO_EDU.gelap, ket: 'foldable terbuka 884×1104' }),
    JARI1: async () => {
      const g = 'JARI1 10 JARI NORMAL + MOMEN TOMBOL';
      const { ctx, pg, errs } = await buka(null, 'jari');
      const jejak = { terlihat: false };
      const k0 = await uv(pg);
      cek(g, (await temaHalaman(pg)) === 'original' && !(await terlihat(pg)) && k0.cerita === 'jari' && k0.status === 'belum', '10 Jari dibuka (tema Original): tombol tersembunyi, status belum', k0);
      await pasangPerekam(pg);
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–9 ditonton sampai selesai, Next di antaranya; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(1500);
      const m = await momenTombol(pg, 9);
      cek(g, m.ok, 'MOMEN: tombol tersembunyi sebelum & selama scene 9 (termasuk selama narasinya); tampil sesudah jam scene 9 dan narasi selesai (≤ 1,5 dtk sesudah narasi diam; ≥ lama rekaman S03-01 sejak scene 9 mulai)', m);
      const tiap = await selesaiTiapScene(pg, [2, 3, 4, 5, 6]);
      cek(g, tiap.ok, 'scene pertanyaan 2–6: status selesai baru datang sesudah narasinya diam (tidak pernah saat narasi berbicara), tidak lebih cepat dari rekaman S02-01 … S06-01', tiap.hasil);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && k.tombol && (await terlihat(pg)), 'scene 9 selesai → completion sah, tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_JARI.terang.href, unduh: VIDEO_JARI.terang.nama }),
        'tema Original: tombol mengarah ke ' + VIDEO_JARI.terang.href + ' (unduh sebagai ' + VIDEO_JARI.terang.nama + ')', await atributUnduh(pg));
      const u1 = await unduh(pg, 'terang', VIDEO_JARI);
      cek(g, u1.ok, 'klik (Original) → unduhan ' + VIDEO_JARI.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_JARI.terang.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO_JARI.gelap.href && s1.saatKlik.unduh === VIDEO_JARI.gelap.nama,
        'ganti ke Dark lalu klik pada tick yang sama → ' + VIDEO_JARI.gelap.href + ' / ' + VIDEO_JARI.gelap.nama + ' (tema saat klik)', s1);
      const u2 = await unduh(pg, 'gelap', VIDEO_JARI);
      cek(g, u2.ok, 'klik (Dark) → unduhan ' + VIDEO_JARI.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_JARI.gelap.href + ')', u2);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    JARI2: async () => {
      const g = 'JARI2 10 JARI DARK + PAUSE/RESUME';
      const { ctx, pg, errs } = await buka('dark', 'jari');
      cek(g, (await temaHalaman(pg)) === 'dark', '10 Jari diputar dalam tema Dark', await temaHalaman(pg));
      const jejak = { terlihat: false }, jeda = { 4: true, 7: true, 9: true, hasil: [] };
      await pasangPerekam(pg);
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak, jeda);
      cek(g, !err && !jejak.terlihat, 'scene 1–9 ditonton sampai selesai dengan pause/resume di scene 4, 7 & 9; tombol tidak terlihat sebelumnya', err);
      const j = jeda.hasil;
      cek(g, j.length === 9 && j.filter((x) => x.jeda).every((x) => x.jeda === 'jeda' && x.selama === 'berjalan') &&
        j.filter((x) => x.masihJeda).every((x) => x.masihJeda === 'jeda' && x.selama === 'berjalan') && j.filter((x) => x.lanjut).every((x) => x.lanjut === 'berputar'),
      'PAUSE (3 dtk) lalu RESUME: putaran tetap berjalan', j);
      await pg.waitForTimeout(1500);
      const tiap = await selesaiTiapScene(pg, [2, 3, 4, 5, 6]);
      cek(g, tiap.ok, 'scene pertanyaan 2–6 (pause/resume di scene 4): status selesai baru datang sesudah narasinya diam', tiap.hasil);
      const m = await momenTombol(pg, 9);
      cek(g, m.ok, 'MOMEN (dengan pause/resume di scene 9): tombol tampil sesudah jam scene 9 dan narasi selesai, tidak pernah saat narasi berbicara', m);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && (await terlihat(pg)), 'pause/resume tetap sah → tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_JARI.gelap.href, unduh: VIDEO_JARI.gelap.nama }),
        'tema Dark: tombol mengarah ke ' + VIDEO_JARI.gelap.href + ' (unduh sebagai ' + VIDEO_JARI.gelap.nama + ')', await atributUnduh(pg));
      const u = await unduh(pg, 'gelap', VIDEO_JARI);
      cek(g, u.ok, 'klik (Dark) → unduhan ' + VIDEO_JARI.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_JARI.gelap.href + ')', u);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    JARI3: async () => {
      const g = 'JARI3 10 JARI SKIP SAAT NARASI ALASAN 2';
      const { ctx, pg, errs } = await buka(null, 'jari');
      await klik(pg, 'siPlay');
      const err = await tontonJari(pg, 1, 7);
      cek(g, !err && (await adegan(pg)) === 8 && (await uv(pg)).status === 'berjalan', 'scene 1–7 ditonton utuh, scene 8 (alasan 2) berputar', err || await uv(pg));
      await pg.waitForTimeout(3000);
      const st = await status(pg);
      cek(g, st === 'berputar', 'scene 8 masih berputar 3 dtk setelah mulai (jam scene sepanjang rekaman alasan 2)', st);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /NEXT/.test(k.alasan) && !(await terlihat(pg)), 'Next saat narasi alasan 2 masih berjalan → tidak sah, tombol tersembunyi', k);
      const selesai9 = await tonton(pg);
      await pg.waitForTimeout(600);
      cek(g, selesai9 && !(await terlihat(pg)) && (await uv(pg)).status === 'tidak-sah', 'scene 9 ditonton sampai selesai → tombol tetap tersembunyi', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    JARI4: async () => {
      const g = 'JARI4 10 JARI SEEK DI SCENE 9';
      const { ctx, pg, errs } = await buka(null, 'jari');
      await klik(pg, 'siPlay');
      const err = await tontonJari(pg, 1, 8);
      cek(g, !err && (await adegan(pg)) === 9 && (await uv(pg)).status === 'berjalan', 'scene 1–8 ditonton utuh, scene 9 berputar', err || await uv(pg));
      await pg.waitForTimeout(2000);
      await geser(pg, 20000);
      await pg.waitForTimeout(600);
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /seek/.test(k.alasan) && !(await terlihat(pg)), 'seek maju 20 dtk di scene 9 → tidak sah, tombol tersembunyi', k);
      const selesai9 = await tonton(pg);
      await pg.waitForTimeout(600);
      cek(g, selesai9 && !(await terlihat(pg)), 'scene 9 sampai selesai → tombol tetap tersembunyi', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    JARI6: async () => {
      const g = 'JARI6 10 JARI SKIP SAAT NARASI PERTANYAAN';
      const { ctx, pg, errs } = await buka(null, 'jari');
      await klik(pg, 'siPlay');
      const err = await tontonJari(pg, 1, 1);
      cek(g, !err && (await adegan(pg)) === 2 && (await uv(pg)).status === 'berjalan', 'scene 1 ditonton utuh, scene 2 (pertanyaan 1) berputar', err || await uv(pg));
      await pg.waitForTimeout(3000);
      const saat = await pg.evaluate(() => {
        const L = document.getElementById('layarSalesIdea'), nb = L.querySelector('[data-kbs-suara]');
        return { status: L.getAttribute('data-sip-status'), bicara: !!(nb && nb.classList.contains('kbs-suara-bicara')) };
      });
      cek(g, saat.status === 'berputar' && saat.bicara, 'scene 2 masih berputar 3 dtk setelah mulai, narasinya masih berbicara (jam scene sepanjang rekaman S02-01)', saat);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /NEXT/.test(k.alasan) && !(await terlihat(pg)), 'Next saat narasi pertanyaan masih berjalan → tidak sah, tombol tersembunyi', k);
      const sisa = await tontonSampaiAkhir(pg, 3, null);
      await pg.waitForTimeout(600);
      cek(g, !sisa && !(await terlihat(pg)) && (await uv(pg)).status === 'tidak-sah', 'scene 3–9 ditonton sampai selesai → tombol tetap tersembunyi', sisa || await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    JARI7: async () => {
      const g = 'JARI7 10 JARI SEEK & LAJU DI SCENE PERTANYAAN';
      const gugur = async (label, aksi, pola) => {
        const { ctx, pg, errs } = await buka(null, 'jari');
        await klik(pg, 'siPlay');
        await aksi(pg, ctx);
        const k = await uv(pg);
        cek(g, k.status === 'tidak-sah' && pola.test(k.alasan) && !(await terlihat(pg)) && !errs.length, label + ' → tidak sah, tombol tersembunyi', Object.assign({ errs }, k));
        await ctx.close();
      };
      await gugur('seek maju 5 dtk di scene 3 (pertanyaan 2)', async (pg) => {
        await tontonJari(pg, 1, 2); await pg.waitForTimeout(2000); await geser(pg, 5000); await pg.waitForTimeout(600);
      }, /seek/);
      await gugur('laju animasi ×4 (DevTools/CDP) di scene 2 (pertanyaan 1)', async (pg, ctx) => {
        await tontonJari(pg, 1, 1);
        const cdp = await ctx.newCDPSession(pg);
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 4 });
        await pg.waitForTimeout(1500);
      }, /lebih cepat|laju/);
    },
    JARI5: () => tontonUnduhPerangkat({ g: 'JARI5 10 JARI SMARTPHONE (EMULASI)', kunci: 'jari', profil: HP(412, 915, 2.625), tema: null, kelas: 'smartphone',
      V1: VIDEO_JARI_P.terang, putar: [915, 412], V2: VIDEO_JARI_P.gelap, ket: 'HP potret → diputar ke landscape (tetap Portrait)' }),
    JARIX: async () => {
      const g = 'JARIX 10 JARI PUTARAN GUGUR';
      const gugur = async (label, aksi, pola) => {
        const { ctx, pg, errs } = await buka(null, 'jari');
        await aksi(pg, ctx);
        const k = await uv(pg);
        cek(g, k.status === 'tidak-sah' && pola.test(k.alasan) && !(await terlihat(pg)) && !errs.length, label + ' → tidak sah, tombol tersembunyi', Object.assign({ errs }, k));
        await ctx.close();
      };
      await gugur('Next sebelum scene 1 selesai', async (pg) => { await klik(pg, 'siPlay'); await pg.waitForTimeout(1500); await klik(pg, 'siNext'); }, /NEXT/);
      await gugur('seek maju 5 dtk di scene 1', async (pg) => { await klik(pg, 'siPlay'); await pg.waitForTimeout(2000); await geser(pg, 5000); await pg.waitForTimeout(600); }, /seek/);
      await gugur('laju animasi ×4 (DevTools/CDP)', async (pg, ctx) => {
        await klik(pg, 'siPlay');
        const cdp = await ctx.newCDPSession(pg);
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 4 });
        await pg.waitForTimeout(1500);
      }, /lebih cepat|laju/);
    },
    SG1: async () => {
      const g = 'SG1 SINGAPURA ORIGINAL';
      const { ctx, pg, errs } = await buka(null, 'singapura');
      const jejak = { terlihat: false }, jeda = { 3: true, hasil: [] };
      const k0 = await uv(pg);
      cek(g, (await temaHalaman(pg)) === 'original' && !(await terlihat(pg)) && k0.cerita === 'singapura' && k0.status === 'belum', 'Singapura dibuka (tema Original): tombol tersembunyi, status belum', k0);
      await klik(pg, 'siPlay');
      cek(g, (await uv(pg)).status === 'berjalan', 'Play scene 1 dari awal → putaran berjalan', await uv(pg));
      const err = await tontonSampaiAkhir(pg, 1, jejak, jeda);
      cek(g, !err, 'scene 1–8 ditonton sampai selesai, Next di antaranya', err);
      const j = jeda.hasil;
      cek(g, j.length === 3 && j[0].jeda === 'jeda' && j[0].selama === 'berjalan' && j[1].masihJeda === 'jeda' && j[1].selama === 'berjalan' && j[2].lanjut === 'berputar',
        'PAUSE 3 dtk lalu RESUME di scene 3 → putaran tetap berjalan', j);
      cek(g, !jejak.terlihat, 'tombol tidak pernah terlihat sebelum scene 8 selesai');
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && k.tombol && (await terlihat(pg)), 'scene 8 selesai → completion sah, tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_SG.terang.href, unduh: VIDEO_SG.terang.nama }),
        'tema Original: tombol mengarah ke ' + VIDEO_SG.terang.href + ' (unduh sebagai ' + VIDEO_SG.terang.nama + ')', await atributUnduh(pg));
      const u1 = await unduh(pg, 'terang', VIDEO_SG);
      cek(g, u1.ok, 'klik (Original) → unduhan ' + VIDEO_SG.terang.nama + ' (ukuran & SHA-256 = ' + VIDEO_SG.terang.href + ')', u1);
      const s1 = await gantiTemaLaluKlik(pg);
      cek(g, s1.tema === 'dark' && s1.saatKlik && s1.saatKlik.href === VIDEO_SG.gelap.href && s1.saatKlik.unduh === VIDEO_SG.gelap.nama,
        'ganti ke Dark lalu klik pada tick yang sama → ' + VIDEO_SG.gelap.href + ' / ' + VIDEO_SG.gelap.nama + ' (tema saat klik)', s1);
      const u2 = await unduh(pg, 'gelap', VIDEO_SG);
      cek(g, u2.ok, 'klik (Dark) → unduhan ' + VIDEO_SG.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_SG.gelap.href + ')', u2);
      await pg.waitForTimeout(1200);
      cek(g, (await terlihat(pg)) && (await uv(pg)).status === 'selesai', 'tombol tetap tampil sesudah diunduh (masih di cerita yang sama)', await uv(pg));
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    SG2: async () => {
      const g = 'SG2 SINGAPURA DARK';
      const { ctx, pg, errs } = await buka('dark', 'singapura');
      cek(g, (await temaHalaman(pg)) === 'dark', 'Singapura diputar dalam tema Dark', await temaHalaman(pg));
      const jejak = { terlihat: false };
      await klik(pg, 'siPlay');
      const err = await tontonSampaiAkhir(pg, 1, jejak);
      cek(g, !err && !jejak.terlihat, 'scene 1–8 ditonton sampai selesai; tombol tidak terlihat sebelumnya', err);
      await pg.waitForTimeout(300);
      const k = await uv(pg);
      cek(g, k.status === 'selesai' && (await terlihat(pg)), 'completion sah → tombol tampil', k);
      cek(g, JSON.stringify(await atributUnduh(pg)) === JSON.stringify({ href: VIDEO_SG.gelap.href, unduh: VIDEO_SG.gelap.nama }),
        'tema Dark: tombol mengarah ke ' + VIDEO_SG.gelap.href + ' (unduh sebagai ' + VIDEO_SG.gelap.nama + ')', await atributUnduh(pg));
      const u = await unduh(pg, 'gelap', VIDEO_SG);
      cek(g, u.ok, 'klik (Dark) → unduhan ' + VIDEO_SG.gelap.nama + ' (ukuran & SHA-256 = ' + VIDEO_SG.gelap.href + ')', u);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    SG3: async () => {
      const g = 'SG3 SINGAPURA NEXT SEBELUM SELESAI';
      const { ctx, pg, errs } = await buka(null, 'singapura');
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(1500);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /NEXT/.test(k.alasan) && !(await terlihat(pg)), 'Next sebelum scene 1 selesai → tidak sah, tombol tersembunyi', k);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    },
    SGX: async () => {
      const g = 'SGX SINGAPURA PUTARAN GUGUR';
      const gugur = async (label, aksi, pola) => {
        const { ctx, pg, errs } = await buka(null, 'singapura');
        await aksi(pg, ctx);
        const k = await uv(pg);
        cek(g, k.status === 'tidak-sah' && pola.test(k.alasan) && !(await terlihat(pg)) && !errs.length, label + ' → tidak sah, tombol tersembunyi', Object.assign({ errs }, k));
        await ctx.close();
      };
      await gugur('seek maju 5 dtk di scene 1', async (pg) => { await klik(pg, 'siPlay'); await pg.waitForTimeout(2000); await geser(pg, 5000); await pg.waitForTimeout(600); }, /seek/);
      await gugur('seek mundur 1,5 dtk di scene 1', async (pg) => { await klik(pg, 'siPlay'); await pg.waitForTimeout(3000); await geser(pg, -1500); await pg.waitForTimeout(600); }, /mundur/);
      await gugur('laju animasi ×4 (DevTools/CDP)', async (pg, ctx) => {
        await klik(pg, 'siPlay');
        const cdp = await ctx.newCDPSession(pg);
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 4 });
        await pg.waitForTimeout(1500);
      }, /lebih cepat|laju/);
      await gugur('scene 1 utuh, Next, lalu BACK di scene 2', async (pg) => { await klik(pg, 'siPlay'); await tonton(pg); await klik(pg, 'siNext'); await pg.waitForTimeout(1500); await klik(pg, 'siPrev'); }, /^BACK/);
      await gugur('lompat: Next ×7 dari frame siap → scene 8', async (pg) => { for (let i = 0; i < 7; i++) await klik(pg, 'siNext'); }, /tidak dimulai dari scene 1|tidak diputar|lompat/);
      await gugur('muat ulang di scene 2 lalu lanjut dari scene 2', async (pg) => {
        await klik(pg, 'siPlay'); await tonton(pg); await klik(pg, 'siNext'); await pg.waitForTimeout(2000);
        await pg.reload(); await bukaCerita(pg, CER.singapura); await klik(pg, 'siNext');
      }, /tidak dimulai dari scene 1|tidak diputar/);
    },
    SG4: () => tontonUnduhPerangkat({ g: 'SG4 SINGAPURA SMARTPHONE (EMULASI)', kunci: 'singapura', profil: HP(412, 915, 2.625), tema: null, kelas: 'smartphone',
      V1: VIDEO_SG_P.terang, putar: [915, 412], V2: VIDEO_SG_P.gelap, ket: 'HP potret → diputar ke landscape (tetap Portrait)' }),
    SG5: () => tontonUnduhPerangkat({ g: 'SG5 SINGAPURA TABLET (EMULASI)', kunci: 'singapura', profil: HP(1180, 820, 2), tema: 'dark', kelas: 'tablet',
      V1: VIDEO_SG.gelap, putar: [820, 1180], V2: VIDEO_SG.terang, ket: 'tablet landscape → diputar ke potret (tetap Landscape)' }),
    SG6: () => tontonUnduhPerangkat({ g: 'SG6 SINGAPURA FOLDABLE TERBUKA (EMULASI)', kunci: 'singapura', profil: HP(884, 1104, 2.5), tema: null, kelas: 'tablet',
      V1: VIDEO_SG.terang, putar: null, V2: VIDEO_SG.gelap, ket: 'foldable terbuka 884×1104' }),
    KBS3: async () => {
      const g = 'KBS3 KERANJANG NEXT SEBELUM SELESAI';
      const { ctx, pg, errs } = await buka(null, 'basket');
      await klik(pg, 'siPlay');
      await pg.waitForTimeout(1500);
      await klik(pg, 'siNext');
      const k = await uv(pg);
      cek(g, k.status === 'tidak-sah' && /NEXT/.test(k.alasan) && !(await terlihat(pg)), 'Next sebelum scene 1 selesai → tidak sah, tombol tersembunyi', k);
      cek(g, !errs.length, 'tanpa error halaman', errs);
      await ctx.close();
    }
  };

  const t0 = Date.now();
  const antre = Object.keys(SKENARIO).filter((k) => !BAGIAN || BAGIAN.includes(k));
  /* panjang dulu, pendek mengisi slot */
  const urut = ['JARI1', 'JARI2', 'JARI3', 'JARI4', 'JARI5', 'JARI6', 'JARI7', 'SG1', 'SG2', 'SG4', 'SG5', 'SG6', 'EDU1', 'EDU2', 'EDU4', 'EDU5', 'EDU6', 'KBS1', 'KBS2', 'KBS4', 'KBS5', 'KBS6', '1', '2', 'RET1', 'RET2', 'RET4', 'RET5', 'RET6', 'ACS4', 'ACS5', 'ACS6', '3', '4', '6', '7', '5', 'BACK1', 'MUNDUR', 'LAJU', 'PAKSA', 'PERANGKAT', 'EDUX', 'JARIX', 'SGX', 'RET3', 'KBS3', 'EDU3', 'SG3'].filter((k) => antre.includes(k));
  await Promise.all(Array.from({ length: Math.min(PARALEL, urut.length) }, async () => {
    while (urut.length) {
      const k = urut.shift();
      try { await SKENARIO[k](); } catch (e) { cek('skenario ' + k, false, 'galat skenario', String(e && e.stack || e).slice(0, 400)); }
    }
  }));
  await br.close(); srv.close();

  /* R. berkas yang tidak boleh berubah */
  if (!BAGIAN || BAGIAN.includes('R')) {
    /* timing scene Retirement (src/sales-idea-retirement.js) dan Keranjang (bagian koreografi
       src/sales-idea-keranjang.js) boleh disesuaikan dengan narasi; desainnya (CSS) tidak */
    const jaga = ['src/sales-idea-player.js', 'src/sales-idea-asset.js', 'src/sales-idea-asset.css',
      'src/sales-idea-retirement.css', 'src/sales-idea-keranjang.css', 'src/sales-idea.js', 'sw.js', 'assets/narasi'];
    const audio = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /-audio\.js$/.test(f)).map((f) => 'src/' + f);
    const d = spawnSync('git', ['diff', '--name-only', 'HEAD', '--'].concat(jaga, audio), { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    cek('R REPO', !d, 'pemutar, scene Asset, CSS Retirement & Keranjang, manifest audio, service worker tidak berubah', d);
    /* narator bersama (PSGNarasi) + naskah NARASI Keranjang: dari penanda bagian narasi sampai akhir berkas, identik dengan HEAD */
    const narator = (src) => { const i = src.indexOf('/* ---------------- narasi suara (Web Speech API)'); return i < 0 ? null : src.slice(i); };
    const nKini = narator(fs.readFileSync(path.join(ROOT, 'src/sales-idea-keranjang.js'), 'utf8'));
    const nHead = narator(spawnSync('git', ['show', 'HEAD:src/sales-idea-keranjang.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).stdout);
    cek('R REPO', nKini !== null && nKini === nHead, 'narator & naskah Keranjang (src/sales-idea-keranjang.js, bagian narasi) tidak berubah', { kini: nKini && nKini.length, head: nHead && nHead.length });
    const idx = spawnSync('git', ['diff', '-U0', 'HEAD', '--', 'index.html'], { cwd: ROOT, encoding: 'utf8' }).stdout;
    const tambah = idx.split('\n').filter((l) => /^\+[^+]/.test(l)), hapus = idx.split('\n').filter((l) => /^-[^-]/.test(l));
    cek('R REPO', hapus.length === 0 && tambah.length <= 1 && (tambah.length === 0 || /src\/sales-idea-video\.js/.test(tambah[0])), 'index.html: hanya +1 tag skrip sales-idea-video.js', { tambah, hapus });
    /* tanpa 404 statis: setiap video yang dirujuk modul ada di repo, dan sebaliknya */
    const modul = fs.readFileSync(path.join(ROOT, 'src/sales-idea-video.js'), 'utf8');
    const dirujuk = [...new Set(modul.match(/assets\/video\/[\w.-]+\.mp4/g) || [])].sort();
    const harus = Object.values(VIDEO).concat(Object.values(VIDEO_P), Object.values(VIDEO_EDU), Object.values(VIDEO_EDU_P), Object.values(VIDEO_SG), Object.values(VIDEO_SG_P), Object.values(VIDEO_RET), Object.values(VIDEO_RET_P), Object.values(VIDEO_KBS), Object.values(VIDEO_KBS_P), Object.values(VIDEO_JARI), Object.values(VIDEO_JARI_P)).map((v) => v.href).sort();
    const ada = harus.map((h) => { const f = path.join(ROOT, h); return fs.existsSync(f) ? fs.statSync(f).size : 0; });
    cek('R REPO', JSON.stringify(dirujuk) === JSON.stringify(harus) && ada.every((n) => n > 0), 'video yang dirujuk modul = ' + harus.join(' + ') + ', semuanya ada di repo', { dirujuk, ukuran: ada });
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
