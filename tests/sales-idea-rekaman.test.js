#!/usr/bin/env node
/* Narasi rekaman voice Bian: Retirement Planning, Keranjang Kehidupan,
   Education Planning (43 berkas MP3 ElevenLabs).

     node tests/sales-idea-rekaman.test.js [--root <dir>] [--bagian M,A,P,K,L,O]
                                           [--laju 4] [--cerita education] [--rinci]

   Yang dijaga:
   M. manifest: kunci = segmen naskah PWA (= tools/narasi/MASTER-SCRIPT-72.md
      bila ada); satu klip per segmen, nama berkas <cerita>-SNN-MM.mp3,
      start 0; berkas ada; manifest dimuat sebelum modul ceritanya;
      service worker menyimpan 3 manifest + 43 berkas.
   A. aset: ke-43 berkas dimuat & di-decode Chromium; end = durasi berkas.
   P. pemutaran penuh (animasi & audio --laju ×, bawaan 4; --laju 1 =
      kecepatan normal): tiap scene memutar klipnya berurutan sesuai
      manifest, dari awal sampai habis, tanpa melewati batas dan tanpa
      tumpang tindih; segmen Education menunggu ketukan visualnya, audio
      segmen sebelumnya sudah selesai saat ketukan berikutnya mulai
      (tidak tertinggal), dan narasi selesai sebelum timeline scene
      selesai (dua syarat sinkron ini hanya pada --laju 1); satu elemen
      audio; speechSynthesis tidak dipakai.
      --rinci mencetak waktu per segmen.
   K. kontrol (ketiga cerita): OPEN diam, PLAY, PAUSE, RESUME dari
      posisi, NEXT, BACK, REPLAY, Narasi OFF/ON, CLOSE (sumber dilepas),
      play() dari luar engine tidak berbunyi, keluar ke hub.
   L. tidak bocor: Retirement → Keranjang → Singapura → Asset; tiap cerita
      hanya memutar rekamannya sendiri (Asset juga berekaman sejak 29 audio
      Jari/Asset; cakupannya di tests/sales-idea-rekaman-jari-asset.test.js).
   O. offline: berkas di cache service worker; ketiga cerita tetap berbunyi.

   Playwright tidak menjadi dependensi repo: dipakai dari instalasi global
   (NODE_PATH) bila tersedia. Keluar 0 = lulus, 1 = gagal, 2 = dilewati. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const { pathToFileURL } = require('url');

function loadPlaywright() {
  const tries = ['playwright', path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright')];
  for (const t of tries) { try { return require(t); } catch (_) {} }
  console.log('Playwright tidak tersedia — test browser dilewati.');
  process.exit(2);
}
const { chromium } = loadPlaywright();

const args = process.argv.slice(2);
const ri = args.indexOf('--root');
const ROOT = path.resolve(ri >= 0 ? args[ri + 1] : path.join(__dirname, '..'));
const bi = args.indexOf('--bagian');
const BAGIAN = bi >= 0 ? args[bi + 1].split(',') : null;
const ikut = (b) => !BAGIAN || BAGIAN.includes(b);
const li = args.indexOf('--laju');
const LAJU = li >= 0 ? +args[li + 1] : 4;
const ci = args.indexOf('--cerita');
const PILIH = ci >= 0 ? args[ci + 1].split(',') : null;
const RINCI = args.includes('--rinci');

const CERITA = [
  { id: 'retirement', pilih: 'retirement', sel: '.rps', attr: 'data-rps', glob: 'PSGRetirementAudio', modul: 'sales-idea-retirement.js', jumlah: 6 },
  { id: 'keranjang', pilih: 'basket', sel: '.kbs', attr: 'data-kbs', glob: 'PSGKeranjangAudio', modul: 'sales-idea-keranjang.js', jumlah: 10 },
  { id: 'education', pilih: 'education', sel: '.eps', attr: 'data-eps', glob: 'PSGEducationAudio', modul: 'sales-idea-education.js', jumlah: 27 }
];
const ID = (n, j) => 'S' + String(n).padStart(2, '0') + '-' + String(j).padStart(2, '0');

const TYPES = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', png: 'image/png',
  svg: 'image/svg+xml', webmanifest: 'application/manifest+json', json: 'application/json', txt: 'text/plain', mp3: 'audio/mpeg' };
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

/* narator palsu (Web Speech): mencatat ucapan tanpa suara */
function mockTTS() {
  window.__tts = { log: [], ms: 6 };
  let cur = null, timer = null; const q = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.onend = null; this.onerror = null; };
  const mulai = () => {
    if (cur || !q.length) return;
    cur = q.shift(); window.__tts.log.push({ t: 'mulai', x: cur.text, lang: cur.lang });
    timer = setTimeout(() => { const u = cur; cur = null; if (u.onend) u.onend({}); mulai(); }, window.__tts.ms * cur.text.length);
  };
  const ss = {
    speak(u) { q.push(u); mulai(); },
    cancel() { const u = cur; q.length = 0; cur = null; clearTimeout(timer); if (u && u.onerror) u.onerror({ error: 'interrupted' }); },
    pause() {}, resume() {},
    getVoices() { return [{ name: 'Uji Bahasa Indonesia', lang: 'id-ID', localService: true }]; },
    get speaking() { return !!cur; }, get pending() { return q.length > 0; }, addEventListener() {}, removeEventListener() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true });
}

/* pengamat rekaman (pola tes Singapura): tiap frame membaca PSGNarasi.rekaman();
   waktu mulai klip diambil dari sisi engine saat play() dipanggil; perubahan
   data-ketuk dicatat untuk memeriksa sinkron segmen bergerbang */
function pantauRekaman() {
  window.__rek = { klip: [], aktif: null, nAudio: 0, play: null, ketuk: [], status: [] };
  /* saat audio klip berhenti: pause() dari engine atau ended, mana yang lebih dulu */
  const henti = () => { const x = window.__rek.klip[window.__rek.klip.length - 1]; if (x && x.tStop == null) x.tStop = performance.now(); };
  const A = window.Audio;
  window.Audio = function (s) { window.__rek.nAudio++; const e = new A(s); window.__rek.el = e; e.addEventListener('ended', henti); return e; };
  window.Audio.prototype = A.prototype;
  const pause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.pause = function () { if (this === window.__rek.el && !this.paused) henti(); return pause.call(this); };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (window.__laju) this.playbackRate = window.__laju;
    const N = window.PSGNarasi, R = window.__rek;
    if (this === R.el && N && N.rekaman) {
      const r = N.rekaman();
      if (r.berkas) R.play = { key: r.adegan + '|' + r.segmen + '|' + r.klip + '|' + r.berkas, pos: Math.round(this.currentTime * 1000) / 1000, t: performance.now(), laju: this.playbackRate };
    }
    return play.call(this);
  };
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((ms) => ms.forEach((m) => {
      if (m.attributeName === 'data-sip-status') { window.__rek.status.push({ t: performance.now(), s: m.target.getAttribute('data-sip-status') }); return; }
      const k = m.target.getAttribute('data-ketuk'); if (k != null) window.__rek.ketuk.push({ t: performance.now(), k: +k, el: m.target });
    })).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-ketuk', 'data-sip-status'] });
  });
  (function loop() {
    const N = window.PSGNarasi;
    if (N && N.rekaman) {
      const r = N.rekaman(), R = window.__rek, a = R.aktif;
      if (r.main) {
        const key = r.adegan + '|' + r.segmen + '|' + r.klip + '|' + r.berkas;
        if (!a || a.key !== key) {
          const p = R.play && R.play.key === key ? R.play : null;
          const x = { key, adegan: r.adegan, segmen: r.segmen, klip: r.klip, berkas: r.berkas, awal: r.waktu, akhir: r.waktu, t0: performance.now(), t1: performance.now(),
            mulai: p ? p.pos : null, tPlay: p ? p.t : null, laju: p ? p.laju : null };
          R.klip.push(x); R.aktif = x;
        } else { a.akhir = Math.max(a.akhir, r.waktu); a.t1 = performance.now(); }
      } else if (a) { if (!a.berhenti && r.berkas === '' && r.waktu > 0) a.berhenti = r.waktu; R.aktif = null; }
    }
    requestAnimationFrame(loop);
  })();
}

let gagal = 0;
function cek(ok, label, info) {
  console.log((ok ? '  OK   ' : '  GAGAL') + ' ' + label + (!ok && info !== undefined ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''));
  if (!ok) gagal++;
}

function bacaManifest(c) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src', 'sales-idea-' + c.id + '-audio.js'), 'utf8'), ctx);
  return ctx.window[c.glob];
}
function bacaMaster() {
  const f = path.join(ROOT, 'tools/narasi/MASTER-SCRIPT-72.md');
  if (!fs.existsSync(f)) return null;
  const b = fs.readFileSync(f, 'utf8').split(/\r?\n/), hasil = {};
  let idea = null;
  b.forEach((x, i) => { const h = /^## (.+)$/.exec(x); if (h) idea = h[1].trim().toLowerCase(); const s = /^### (S\d{2}-\d{2})$/.exec(x); if (s && b[i + 1] === '```text') hasil[idea + '/' + s[1]] = b[i + 2]; });
  return hasil;
}

(async () => {
  const { bacaNaskah, daftarSegmen } = await import(pathToFileURL(path.join(ROOT, 'tools/narasi/naskah.mjs')).href);
  const NASKAH = {}, MANIFEST = {};
  CERITA.forEach((c) => { NASKAH[c.id] = bacaNaskah(c.id); MANIFEST[c.id] = bacaManifest(c); });

  const srv = await serve(ROOT);
  const URL = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await chromium.launch();
  const errs = [];

  async function buka(o) {
    o = o || {};
    const ctx = await br.newContext(Object.assign({ viewport: { width: 1366, height: 768 } }, o.ctx || {}));
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.addInitScript(mockTTS);
    await pg.addInitScript(pantauRekaman);
    await pg.addInitScript(() => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {} });
    await pg.goto(URL);
    await pg.waitForTimeout(500);
    if (o.cepat) { const cdp = await ctx.newCDPSession(pg); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: o.cepat }); }
    return { ctx, pg };
  }
  /* tunggu hub benar-benar tampil, bukan jeda tetap: pada kunjungan pertama
     service worker memasang ±150 berkas dan klik bisa datang sebelum tombol
     Sales Idea terpasang (klik diulang; membuka hub dua kali tidak berefek) */
  const bukaHub = async (pg) => {
    for (let i = 0; i < 3; i++) {
      await pg.evaluate(() => document.getElementById('btnSalesIdea').click());
      if (await tunggu(pg, () => !!document.querySelector('[data-si-choice]'), 3000)) break;
    }
    await pg.waitForTimeout(300);
  };
  const pilihCerita = async (pg, pilih) => {
    await pg.waitForSelector('[data-si-choice="' + pilih + '"]', { state: 'attached', timeout: 10000 });
    await pg.evaluate((p) => document.querySelector('[data-si-choice="' + p + '"]').click(), pilih); await pg.waitForTimeout(400);
  };
  const tunggu = async (pg, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { if (await pg.evaluate(fn, arg)) return true; await pg.waitForTimeout(80); } return false; };
  const rek = (pg) => pg.evaluate(() => window.PSGNarasi.rekaman());
  const ucapTTS = (pg) => pg.evaluate(() => window.__tts.log.filter((x) => x.t === 'mulai').length);
  const status = (pg) => pg.evaluate(() => document.getElementById('layarSalesIdea').getAttribute('data-sip-status'));
  const tungguMain = (pg, adegan, ms) => tunggu(pg, (a) => { const r = window.PSGNarasi.rekaman(); return r.main && (!a || r.adegan === a); }, ms || 8000, adegan);
  /* play() dari luar engine (tombol media/headset): harus tidak berbunyi */
  const luar = async (pg) => {
    await pg.evaluate(() => {
      const el = window.__rek.el; window.__luar = { bunyi: 0, t0: el ? el.currentTime : 0 };
      if (!el) return;
      const p = el.play(); if (p && p.catch) p.catch(() => {});
      const t1 = performance.now();
      (function amati() { if (!el.paused && !el.muted && el.volume > 0) window.__luar.bunyi++; if (performance.now() - t1 < 900) requestAnimationFrame(amati); })();
    });
    await pg.waitForTimeout(1000);
    return pg.evaluate(() => { const el = window.__rek.el; return el ? { bunyi: window.__luar.bunyi, paused: el.paused, maju: Math.round((el.currentTime - window.__luar.t0) * 1000) / 1000, sumber: !!el.getAttribute('src') } : { bunyi: 0, paused: true, maju: 0, sumber: false }; });
  };
  const aman = (x) => x.bunyi === 0 && x.paused && Math.abs(x.maju) < 0.05;

  /* ---------- M. manifest & mapping ---------- */
  if (ikut('M')) {
    console.log('[M] Manifest & mapping');
    const master = bacaMaster();
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    let total = 0;
    for (const c of CERITA) {
      const M = MANIFEST[c.id], seg = daftarSegmen(NASKAH[c.id]);
      total += seg.length;
      cek(!!M && M.folder === 'assets/narasi/' + c.id + '/' && /Bian/.test(M.suara || ''), c.id + ': manifest ' + c.glob + ' dimuat, folder assets/narasi/' + c.id + '/, voice Bian', M && { folder: M.folder, suara: M.suara });
      const kunci = Object.keys(M.segmen);
      cek(seg.length === c.jumlah && JSON.stringify(kunci) === JSON.stringify(seg.map((s) => s.id)), c.id + ': ' + c.jumlah + ' segmen manifest = segmen naskah PWA (urutan sama)', { naskah: seg.length, manifest: kunci.length });
      const buruk = seg.filter((s) => { const k = M.segmen[s.id]; return !Array.isArray(k) || k.length !== 1 || k[0].audio !== c.id + '-' + s.id + '.mp3' || k[0].start !== 0 || !(k[0].end > 0) || !fs.existsSync(path.join(ROOT, M.folder, k[0].audio)); }).map((s) => s.id);
      cek(!buruk.length, c.id + ': satu klip per segmen <cerita>-SNN-MM.mp3, start 0, berkas ada', buruk);
      if (master) {
        const beda = seg.filter((s) => master[c.id + '/' + s.id] !== s.teks).map((s) => s.id);
        cek(!beda.length, c.id + ': teks naskah PWA = MASTER-SCRIPT-72.md', beda);
      } else console.log('  info  MASTER-SCRIPT-72.md tidak ada — perbandingan teks dilewati');
      const iM = html.indexOf('src/sales-idea-' + c.id + '-audio.js'), iS = html.indexOf('src/' + c.modul);
      cek(iM > 0 && iS > iM, c.id + ': manifest dimuat sebelum ' + c.modul);
      const tidak = seg.filter((s) => sw.indexOf("'./assets/narasi/" + c.id + '/' + c.id + '-' + s.id + ".mp3'") < 0).map((s) => s.id);
      cek(!tidak.length && sw.indexOf("'./src/sales-idea-" + c.id + "-audio.js?v=") > 0, c.id + ': service worker menyimpan manifest + ' + seg.length + ' berkas', tidak);
    }
    cek(total === 43, 'total 43 segmen rekaman baru', total);
    const sg = fs.readdirSync(path.join(ROOT, 'assets/narasi/singapore')).filter((f) => f.endsWith('.mp3')).length;
    cek(sg === 13 && /sales-idea-singapura-audio\.js\?v=114/.test(html), 'Singapura tetap: 13 berkas, manifest & tag skrip tidak berubah', sg);
  }

  /* ---------- A. aset ---------- */
  if (ikut('A')) {
    console.log('[A] Aset audio');
    const { ctx, pg } = await buka();
    const daftar = CERITA.flatMap((c) => Object.values(MANIFEST[c.id].segmen).map((k) => ({ u: MANIFEST[c.id].folder + k[0].audio, end: k[0].end })));
    const hasil = await pg.evaluate(async (d) => {
      const ac = new OfflineAudioContext(1, 44100, 44100), o = [];
      for (const x of d) {
        try { const r = await fetch(x.u); const b = await r.arrayBuffer(); const dec = await ac.decodeAudioData(b); o.push({ u: x.u, ok: r.ok, dur: dec.duration, end: x.end }); }
        catch (e) { o.push({ u: x.u, ok: false, galat: String(e) }); }
      }
      return o;
    }, daftar);
    const buruk = hasil.filter((x) => !x.ok || !(x.end <= x.dur + 0.001 && x.end >= x.dur - 0.05)).map((x) => x.u + (x.galat ? ' ' + x.galat : ' end ' + x.end + ' dur ' + (x.dur || 0).toFixed(3)));
    cek(hasil.length === 43 && !buruk.length, '43 berkas dimuat & di-decode; end manifest = durasi berkas (±50 md)', buruk);
    await ctx.close();
  }

  /* ---------- P. pemutaran penuh (--laju ×) ---------- */
  if (ikut('P')) {
    console.log('[P] Pemutaran penuh (animasi & audio ' + LAJU + '×)');
    for (const c of CERITA.filter((x) => !PILIH || PILIH.includes(x.id))) {
      const M = MANIFEST[c.id], A = NASKAH[c.id].adegan;
      const { ctx, pg } = await buka(LAJU !== 1 ? { cepat: LAJU } : {});
      if (LAJU !== 1) await pg.evaluate((l) => { window.__laju = l; }, LAJU);
      await bukaHub(pg); await pilihCerita(pg, c.pilih); await pg.click('#siPlay');
      const buruk = [], lambat = [], tumpang = [], tertinggal = [], lewatScene = [], rinci = [];
      let awalMaks = 0, sisaMaks = 0;
      for (let n = 1; n <= A.length; n++) {
        if (n > 1) await pg.keyboard.press('ArrowRight');
        const jml = A[n - 1].segmen.length;
        const ok = await tunggu(pg, (a) => window.__rek.klip.filter((x) => x.adegan === a[0]).length >= a[1] && !window.PSGNarasi.rekaman().main, 120000, [n, jml]);
        await pg.waitForTimeout(150);
        const dengar = await pg.evaluate((a) => window.__rek.klip.filter((x) => x.adegan === a).map((x) => Object.assign({}, x)), n);
        const urut = dengar.map((x) => x.segmen + ':' + x.berkas).join(' '), harap = A[n - 1].segmen.map((_, j) => (j + 1) + ':' + M.segmen[ID(n, j + 1)][0].audio).join(' ');
        if (!ok || urut !== harap) { buruk.push('scene ' + n + ' urutan "' + urut + '" ≠ "' + harap + '"'); continue; }
        dengar.forEach((x) => {
          const k = M.segmen[ID(n, x.segmen)][0], henti = x.berhenti != null ? x.berhenti : x.akhir;
          if (x.mulai == null || Math.abs(x.mulai - k.start) > 0.02) buruk.push(ID(n, x.segmen) + ' mulai ' + x.mulai);
          const batas = x.mulai + ((x.t0 - x.tPlay) / 1000) * x.laju + 0.02;
          if (x.awal < -0.02 || x.awal > batas) buruk.push(ID(n, x.segmen) + ' bacaan pertama ' + x.awal + ' > ' + batas.toFixed(3));
          if (x.akhir > k.end + 0.12 || henti > k.end + 0.12) buruk.push(ID(n, x.segmen) + ' melewati akhir ' + k.end + ' → ' + Math.max(x.akhir, henti));
          if (henti < k.end - 0.3) buruk.push(ID(n, x.segmen) + ' berhenti terlalu awal ' + henti + ' < ' + k.end);
          if (x.mulai != null) awalMaks = Math.max(awalMaks, Math.abs(x.mulai - k.start));
          sisaMaks = Math.max(sisaMaks, k.end - henti);
        });
        /* tanpa tumpang tindih: klip berikut baru play() sesudah audio klip sebelumnya berhenti */
        dengar.forEach((x, i) => { const y = dengar[i - 1]; if (i && (y.tStop == null || x.tPlay < y.tStop)) tumpang.push(ID(n, x.segmen) + ' play ' + (y.tStop == null ? '(tanpa catatan berhenti)' : ((x.tPlay - y.tStop) / 1000).toFixed(3) + ' dtk')); });
        if (A[n - 1].bergerbang) {
          /* segmen ke-j (1-based) baru boleh mulai setelah node scene ber-data-ketuk ≥ j */
          const g = await pg.evaluate((a) => {
            const node = document.querySelector(a.sel + '[' + a.attr + '="' + a.n + '"]');
            return window.__rek.klip.filter((x) => x.adegan === a.n).map((x) => {
              const e = window.__rek.ketuk.find((k) => k.el === node && k.k >= x.segmen);
              return { segmen: x.segmen, tKetuk: e ? e.t : null, tPlay: x.tPlay };
            });
          }, { sel: c.sel, attr: c.attr, n });
          g.forEach((x, i) => {
            if (x.tKetuk == null || x.tPlay == null || x.tPlay < x.tKetuk - 5) { buruk.push(ID(n, x.segmen) + ' mulai sebelum ketukan ' + x.segmen); return; }
            lambat.push((x.tPlay - x.tKetuk) / 1000);
            /* tidak tertinggal: audio segmen sebelumnya sudah berhenti saat ketukan segmen ini mulai */
            const y = dengar[i - 1], lewat = y && y.tStop != null ? (y.tStop - x.tKetuk) / 1000 : null;
            if (lewat != null && lewat > 0.02) tertinggal.push(ID(n, y.segmen) + ' masih berbunyi ' + lewat.toFixed(3) + ' dtk sesudah ketukan ' + x.segmen);
            const d = dengar[i];
            rinci.push({ id: ID(n, x.segmen), ketukAudio: (x.tPlay - x.tKetuk) / 1000, sisaSebelum: lewat, jedaDariSebelum: y && y.tStop != null ? (x.tPlay - y.tStop) / 1000 : null,
              durasi: d.tStop != null ? (d.tStop - d.tPlay) / 1000 : null });
          });
          /* narasi scene selesai sebelum timeline scene selesai (status 'selesai') */
          const z = dengar[dengar.length - 1];
          const sc = await pg.evaluate((t) => { const e = window.__rek.status.find((x) => x.t > t && x.s === 'selesai'); return { tSelesai: e ? e.t : null, sekarang: document.getElementById('layarSalesIdea').getAttribute('data-sip-status') }; }, dengar[0].tPlay);
          const lebih = sc.tSelesai != null && z.tStop != null ? (z.tStop - sc.tSelesai) / 1000 : null;
          if (z.tStop == null || (lebih != null && lebih > 0.02) || (sc.tSelesai == null && sc.sekarang !== 'berputar')) lewatScene.push('scene ' + n + ' audio ' + (lebih != null ? lebih.toFixed(3) + ' dtk sesudah timeline selesai' : 'status ' + sc.sekarang));
          rinci.push({ id: 'scene ' + n, statusSaatAudioSelesai: sc.tSelesai == null ? sc.sekarang : 'selesai', akhirAudioVsTimeline: lebih });
        }
      }
      const x = await pg.evaluate(() => ({ nAudio: window.__rek.nAudio }));
      cek(!buruk.length, c.id + ': ' + A.length + ' scene, ' + c.jumlah + ' klip diputar berurutan sesuai manifest, dari awal sampai habis, tanpa melewati batas', buruk.slice(0, 6));
      cek(!tumpang.length, c.id + ': tanpa tumpang tindih antar segmen (klip berikut mulai sesudah klip sebelumnya berhenti)', tumpang);
      console.log('  info  ' + LAJU + '×: selisih posisi mulai vs start maks ' + awalMaks.toFixed(3) + ' dtk; berhenti paling awal ' + sisaMaks.toFixed(3) + ' dtk sebelum end');
      if (lambat.length) {
        const u = lambat.slice().sort((a, b) => a - b), med = u[Math.floor(u.length / 2)];
        cek(true, c.id + ': ' + lambat.length + ' segmen bergerbang tidak mulai sebelum ketukan visualnya (jeda ketukan→audio min ' + u[0].toFixed(3) + ' · median ' + med.toFixed(3) + ' · maks ' + u[u.length - 1].toFixed(3) + ' dtk, ' + LAJU + '×)');
        /* sinkron waktu nyata hanya bermakna pada 1×: pada --laju > 1 latensi mulai
           play() (±0,1–0,3 dtk nyata) tidak ikut dipercepat, jadi ikut membesar
           relatif terhadap ketukan; di sana nilainya dicetak sebagai info */
        if (LAJU === 1) {
          cek(!tertinggal.length, c.id + ': audio tidak tertinggal — segmen sebelumnya selesai sebelum ketukan berikutnya mulai', tertinggal);
          cek(!lewatScene.length, c.id + ': narasi tiap scene selesai sebelum timeline scene selesai', lewatScene);
        } else console.log('  info  ' + LAJU + '× (sinkron waktu nyata diperiksa pada --laju 1): ' + (tertinggal.concat(lewatScene).join('; ') || 'tanpa catatan'));
      }
      if (RINCI) rinci.forEach((r) => console.log('  rinci ' + JSON.stringify(r, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
      cek(x.nAudio === 1 && await ucapTTS(pg) === 0, c.id + ': satu elemen audio, speechSynthesis tidak dipakai', { nAudio: x.nAudio, tts: await ucapTTS(pg) });
      await ctx.close();
    }
  }

  /* ---------- K. kontrol pemutar ---------- */
  if (ikut('K')) {
    console.log('[K] Kontrol pemutar (klik nyata)');
    for (const c of CERITA) {
      const M = MANIFEST[c.id], f1 = M.segmen['S01-01'][0].audio, f2 = M.segmen['S02-01'][0].audio, lbl = c.id;
      const { ctx, pg } = await buka();
      await bukaHub(pg); await pilihCerita(pg, c.pilih);
      const r0 = await rek(pg); cek(!r0.main, lbl + ': OPEN tanpa audio', r0);
      await pg.click('#siPlay');
      const main = await tungguMain(pg, 1, 8000); await pg.waitForTimeout(700); const r1 = await rek(pg);
      cek(main && r1.berkas === f1 && r1.segmen === 1 && r1.waktu > 0, lbl + ': PLAY → animasi + audio ' + f1, r1);
      await pg.click('#siPlay'); await pg.waitForTimeout(250); const r2 = await rek(pg); await pg.waitForTimeout(700); const r3 = await rek(pg);
      cek(!r2.main && !r3.main && r3.waktu === r2.waktu && await status(pg) === 'jeda', lbl + ': PAUSE → audio jeda, posisi tersimpan', [r2, r3]);
      await pg.click('#siPlay'); await tungguMain(pg, 1, 3000); await pg.waitForTimeout(300); const r4 = await rek(pg);
      cek(r4.main && r4.berkas === f1 && r4.waktu >= r2.waktu - 0.02 && r4.waktu < r2.waktu + 1.2, lbl + ': RESUME → lanjut dari posisi (tidak mulai dari 0)', [r2.waktu, r4]);
      await pg.click('#siNext'); await pg.waitForTimeout(120); const r5 = await rek(pg);
      await tungguMain(pg, 2, 8000); const r6 = await rek(pg);
      cek(!(r5.main && r5.adegan === 1) && r6.adegan === 2 && r6.berkas === f2 && r6.waktu < 1.5, lbl + ': NEXT → audio lama berhenti, ' + f2 + ' dari awal', [r5, r6]);
      await pg.click('#siPrev'); await tungguMain(pg, 1, 8000); const r7 = await rek(pg);
      cek(r7.adegan === 1 && r7.berkas === f1 && r7.waktu < 1.5, lbl + ': BACK → ' + f1 + ' dari awal', r7);
      await pg.click('#siNext'); await tungguMain(pg, 2, 8000); await pg.click('#siReplay'); await tungguMain(pg, 1, 8000); const r8 = await rek(pg);
      cek(r8.adegan === 1 && r8.segmen === 1 && r8.waktu < 1.5, lbl + ': REPLAY → scene 1 segmen 1 dari awal', r8);
      await pg.click(c.sel + ' [data-kbs-suara]'); await pg.waitForTimeout(250); const r9 = await rek(pg); await pg.waitForTimeout(1000); const r10 = await rek(pg);
      cek(!r9.main && !r10.main && await status(pg) === 'berputar', lbl + ': Narasi OFF → audio diam, animasi tetap berjalan', [r9, r10]);
      const e5 = await luar(pg);
      cek(aman(e5), lbl + ': Narasi OFF — play() dari luar engine tidak berbunyi', e5);
      await pg.click(c.sel + ' [data-kbs-suara]'); const on = await tungguMain(pg, 1, 3000); const r11 = await rek(pg);
      cek(on && r11.berkas === f1 && r11.waktu >= r10.waktu - 0.02, lbl + ': Narasi ON → audio lanjut', [r10.waktu, r11]);
      await pg.click('#layarSalesIdea .si-close'); await pg.waitForTimeout(300); const r12 = await rek(pg); await pg.waitForTimeout(800); const r13 = await rek(pg);
      const e2 = await luar(pg);
      cek(!r12.main && !r13.main && r13.berkas === '' && aman(e2) && !e2.sumber, lbl + ': CLOSE → audio berhenti, sumber dilepas, play() dari luar tidak berbunyi', [r12, r13, e2]);
      await bukaHub(pg); await pilihCerita(pg, c.pilih); await pg.click('#siPlay'); await tungguMain(pg, 1, 8000);
      await pg.click('[data-si-hub]'); await pg.waitForTimeout(300); const e6 = await luar(pg);
      cek(aman(e6) && !e6.sumber, lbl + ': keluar ke hub → sumber dilepas, tidak ada suara tersisa', e6);
      const nA = await pg.evaluate(() => window.__rek.nAudio);
      cek(nA === 1 && await ucapTTS(pg) === 0, lbl + ': satu elemen audio, tanpa speechSynthesis', { nA, tts: await ucapTTS(pg) });
      await ctx.close();
    }
  }

  /* ---------- L. tidak bocor antar Sales Idea ---------- */
  if (ikut('L')) {
    console.log('[L] Pindah antar Sales Idea');
    const { ctx, pg } = await buka();
    const jalan = async (pilih) => { await bukaHub(pg); await pilihCerita(pg, pilih); await pg.evaluate(() => { window.__tts.log = []; window.__rek.klip = []; }); await pg.click('#siPlay'); };
    const hanya = (pola) => pg.evaluate((p) => window.__rek.klip.every((x) => new RegExp(p).test(x.berkas)), pola);
    await jalan('retirement'); const a1 = await tungguMain(pg, 1, 8000); const b1 = await rek(pg);
    await pg.click('[data-si-hub]'); await pg.waitForTimeout(300); const h1 = await luar(pg);
    cek(a1 && b1.berkas === 'retirement-S01-01.mp3' && aman(h1) && !h1.sumber, 'Retirement berbunyi, lalu keluar ke hub: diam & sumber dilepas', [b1, h1]);
    await jalan('basket'); const a2 = await tungguMain(pg, 1, 8000); await pg.waitForTimeout(600); const b2 = await rek(pg);
    cek(a2 && b2.berkas === 'keranjang-S01-01.mp3' && await hanya('^keranjang-') && await ucapTTS(pg) === 0, 'Keranjang hanya memutar rekamannya sendiri (tanpa sisa Retirement, tanpa suara browser)', b2);
    await pg.click('[data-si-hub]'); await pg.waitForTimeout(300);
    await jalan('singapura'); const a3 = await tungguMain(pg, 1, 8000); await pg.waitForTimeout(600); const b3 = await rek(pg);
    cek(a3 && b3.berkas === 'S01-01.mp3' && await hanya('^S\\d\\d-\\d\\d\\.mp3$'), 'Singapura tetap memutar rekamannya sendiri (S01-01.mp3)', b3);
    await pg.click('[data-si-hub]'); await pg.waitForTimeout(300);
    await jalan('asset'); const a4 = await tungguMain(pg, 1, 8000); await pg.waitForTimeout(600); const b4 = await rek(pg);
    cek(a4 && b4.berkas === 'asset-S01-01.mp3' && await hanya('^asset-S\\d\\d-\\d\\d\\.mp3$') && await ucapTTS(pg) === 0, 'Asset memutar rekamannya sendiri (asset-S01-01.mp3), tanpa sisa Singapura, tanpa suara browser', b4);
    await pg.click('#layarSalesIdea .si-close'); await pg.waitForTimeout(300);
    await ctx.close();
  }

  /* ---------- O. offline ---------- */
  if (ikut('O')) {
    console.log('[O] Offline');
    const { ctx, pg } = await buka();
    await pg.evaluate(() => navigator.serviceWorker.ready);
    const pola = ['retirement', 'keranjang', 'education'].map((c) => '/assets/narasi/' + c + '/' + c + '-S\\d\\d-\\d\\d\\.mp3$').join('|');
    const penuh = await tunggu(pg, async (p) => {
      const k = await caches.keys(); if (!k.length) return false;
      const c = await caches.open(k[k.length - 1]); const u = (await c.keys()).map((r) => r.url);
      return u.filter((x) => new RegExp(p).test(x)).length === 43 && ['retirement', 'keranjang', 'education'].every((c) => u.some((x) => x.indexOf('/src/sales-idea-' + c + '-audio.js') > 0));
    }, 45000, pola);
    cek(penuh, 'cache service worker berisi 43 berkas rekaman + 3 manifest');
    await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(600);
    for (const c of CERITA) {
      await bukaHub(pg); await pilihCerita(pg, c.pilih); await pg.click('#siPlay');
      const main = await tungguMain(pg, 1, 8000); const r = await rek(pg);
      cek(main && r.berkas === c.id + '-S01-01.mp3', 'offline: ' + c.id + ' berbunyi dari cache (' + c.id + '-S01-01.mp3)', r);
      await pg.click('#layarSalesIdea .si-close'); await pg.waitForTimeout(300);
    }
    await ctx.setOffline(false); await ctx.close();
  }

  const galat = errs.filter((e) => !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(e));
  cek(!galat.length, 'tanpa error halaman/konsol', galat.slice(0, 5));
  await br.close(); srv.close();
  console.log(gagal ? 'HASIL: GAGAL (' + gagal + ')' : 'HASIL: SEMUA LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
