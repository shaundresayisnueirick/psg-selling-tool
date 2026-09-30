#!/usr/bin/env node
/* Narasi rekaman voice Bian: 10 Jari (BAB 1–2), 10 Jari BAB 3 (3 alasan),
   Asset Creation (29 berkas MP3 ElevenLabs).

     node tests/sales-idea-rekaman-jari-asset.test.js [--root <dir>] [--bagian M,A,P,K,L,O]
                                                     [--laju 4] [--cerita jari,asset] [--rinci]

   Satu presentasi 10 Jari memakai dua sumber narasi: scene 1–6 = `jari`
   (.jps, scene 1 bersegmen dengan data-ketuk), scene 7–9 = `jari-alasan`
   ([data-jps-alasan], adegan 1–3). Asset: 6 scene bersegmen (.acs).
   Yang dijaga:
   M. manifest: kunci = segmen naskah PWA (= tools/narasi/MASTER-SCRIPT-72.md
      bila ada); satu klip per segmen <sumber>-SNN-MM.mp3, start 0; berkas
      ada; manifest dimuat sebelum modulnya; service worker menyimpan
      3 manifest + 29 berkas; 43 rekaman lama & 13 rekaman Singapura tetap
      terdaftar.
   A. aset: 29 berkas baru dimuat & di-decode Chromium (end = durasi
      berkas); 43 lama + 13 Singapura tetap dimuat & di-decode.
   P. pemutaran penuh (animasi & audio --laju ×, bawaan 4): tiap scene
      memutar klipnya berurutan sesuai manifest, dari awal sampai habis,
      tanpa melewati batas dan tanpa tumpang tindih; segmen bergerbang
      menunggu ketukan visualnya; pada --laju 1 juga: audio segmen
      sebelumnya sudah selesai saat ketukan berikutnya mulai dan narasi
      selesai sebelum timeline scene selesai; satu elemen audio;
      speechSynthesis tidak dipakai.
   K. kontrol (Jari, Jari-Alasan, Asset): OPEN diam, PLAY, PAUSE, RESUME
      dari posisi, NEXT, BACK, REPLAY, Narasi OFF/ON, CLOSE (sumber
      dilepas), play() dari luar engine tidak berbunyi, keluar ke hub.
   L. tidak bocor: Jari → Jari-Alasan → Asset → Retirement → Singapura;
      tiap bagian hanya memutar rekamannya sendiri.
   T. timing 1× segmen yang durasinya ditentukan rekaman: Jari BAB 1
      (S01-06 → S01-07, akhir scene), Jari-Alasan S01-01 (timeline tidak
      selesai sebelum audio; alasan 2 mulai benar sesudah NEXT), Asset
      S05-02 → S05-03 dan S06-01 → S06-02 (tidak tertinggal, tanpa overlap).
   O. offline: 29 berkas + 3 manifest di cache service worker (bersama 43
      lama + 13 Singapura); Jari, Jari-Alasan, Asset tetap berbunyi.

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

/* sumber narasi baru (29 berkas) */
const SUMBER = {
  jari: { id: 'jari', glob: 'PSGJariAudio', modul: 'sales-idea-jari.js', jumlah: 12, sel: '.jps', attr: 'data-jps' },
  'jari-alasan': { id: 'jari-alasan', glob: 'PSGJariAlasanAudio', modul: 'sales-idea-jari.js', jumlah: 3, sel: '[data-jps-alasan]', attr: 'data-jps-alasan' },
  asset: { id: 'asset', glob: 'PSGAssetAudio', modul: 'sales-idea-asset.js', jumlah: 14, sel: '.acs', attr: 'data-acs' }
};
/* presentasi di hub → urutan scene [sumber, adegan] */
const PRESENTASI = {
  jari: { pilih: 'jari', scene: [1, 2, 3, 4, 5, 6].map((n) => ['jari', n]).concat([1, 2, 3].map((n) => ['jari-alasan', n])) },
  asset: { pilih: 'asset', scene: [1, 2, 3, 4, 5, 6].map((n) => ['asset', n]) }
};
/* rekaman yang sudah ada sebelumnya: harus tetap terdeteksi */
const LAMA = [
  { id: 'retirement', glob: 'PSGRetirementAudio', jumlah: 6 },
  { id: 'keranjang', glob: 'PSGKeranjangAudio', jumlah: 10 },
  { id: 'education', glob: 'PSGEducationAudio', jumlah: 27 }
];
const ID = (n, j) => 'S' + String(n).padStart(2, '0') + '-' + String(j).padStart(2, '0');
/* teks final yang dipakai membuat 3 rekaman (dikonfirmasi pemilik): PWA & MASTER harus sama persis */
const TEKS_FINAL = {
  'jari-alasan/S01-01': 'Alasan kenapa orang memiliki asuransi.\n\nPertama adalah bukti nyata. Bukti itu sudah banyak di sekitar kita. Kita sering mendengar teman, keluarga, kenalan, atau tokoh publik mengalami sakit berat atau musibah dan membutuhkan bantuan. Artinya, risiko itu bukan sekadar teori.',
  'asset/S05-02': 'Contoh dalam materi menyebut sekitar Rp6 juta per bulan dicicil selama 20 tahun dengan target aset Rp5 miliar.',
  'asset/S06-01': 'Jadi, inti percakapannya, bagaimana seseorang dapat membangun aset baru dan menyiapkan warisan dengan cara lebih simpel, ringan, dan pasti.'
};

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

/* pengamat rekaman (pola tes rekaman lain): klip yang terdengar, waktu play() dari
   engine, saat audio berhenti (pause() engine / ended), perubahan data-ketuk & status */
function pantauRekaman() {
  window.__rek = { klip: [], aktif: null, nAudio: 0, play: null, ketuk: [], status: [] };
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

function bacaManifest(id, glob) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src', 'sales-idea-' + id + '-audio.js'), 'utf8'), ctx);
  return ctx.window[glob];
}
function bacaMaster() {
  const f = path.join(ROOT, 'tools/narasi/MASTER-SCRIPT-72.md');
  if (!fs.existsSync(f)) return null;
  const b = fs.readFileSync(f, 'utf8').split(/\r?\n/), hasil = {};
  let idea = null;
  /* blok ```text boleh lebih dari satu baris: digabung dengan "\n" (sama dengan tools/narasi/generate-eleven.mjs) */
  b.forEach((x, i) => {
    const h = /^## (.+)$/.exec(x); if (h) idea = h[1].trim().toLowerCase();
    const s = /^### (S\d{2}-\d{2})$/.exec(x);
    if (s && b[i + 1] === '```text') { const isi = []; for (let j = i + 2; j < b.length && b[j] !== '```'; j++) isi.push(b[j]); hasil[idea + '/' + s[1]] = isi.join('\n'); }
  });
  return hasil;
}

(async () => {
  const { bacaNaskah, daftarSegmen } = await import(pathToFileURL(path.join(ROOT, 'tools/narasi/naskah.mjs')).href);
  const NASKAH = {}, MANIFEST = {};
  Object.values(SUMBER).forEach((s) => { NASKAH[s.id] = bacaNaskah(s.id); MANIFEST[s.id] = bacaManifest(s.id, s.glob); });
  const LAMA_M = {};
  LAMA.forEach((c) => { LAMA_M[c.id] = bacaManifest(c.id, c.glob); });
  const SG = bacaManifest('singapura', 'PSGSingapuraAudio');
  const klipDari = (M) => Object.values(M.segmen).flat().map((k) => M.folder + k.audio);

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
  const tunggu = async (pg, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { if (await pg.evaluate(fn, arg)) return true; await pg.waitForTimeout(80); } return false; };
  /* tunggu hub benar-benar tampil (klik diulang; membuka hub dua kali tidak berefek) */
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
  const rek = (pg) => pg.evaluate(() => window.PSGNarasi.rekaman());
  const ucapTTS = (pg) => pg.evaluate(() => window.__tts.log.filter((x) => x.t === 'mulai').length);
  const status = (pg) => pg.evaluate(() => document.getElementById('layarSalesIdea').getAttribute('data-sip-status'));
  const langkah = (pg) => pg.evaluate(() => window.SalesIdea10Jari.keadaan().indeks + 1);
  const tungguBerkas = (pg, b, ms) => tunggu(pg, (x) => { const r = window.PSGNarasi.rekaman(); return r.main && r.berkas === x; }, ms || 8000, b);
  /* tombol Narasi yang tampil (10 Jari BAB 3 memasangnya di bilah judul lama) */
  const klikNarasi = (pg) => pg.evaluate(() => { const b = [...document.querySelectorAll('#layarSalesIdea [data-kbs-suara]')].find((x) => x.offsetParent !== null); if (b) b.click(); return !!b; });
  /* NEXT berulang sampai langkah ke-n */
  const keLangkah = async (pg, n) => { for (let i = 0; i < 12 && await langkah(pg) < n; i++) { await pg.click('#siNext'); await pg.waitForTimeout(250); } return (await langkah(pg)) === n; };
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
    for (const s of Object.values(SUMBER)) {
      const M = MANIFEST[s.id], seg = daftarSegmen(NASKAH[s.id]);
      total += seg.length;
      cek(!!M && M.folder === 'assets/narasi/' + s.id + '/' && /Bian/.test(M.suara || ''), s.id + ': manifest ' + s.glob + ' dimuat, folder assets/narasi/' + s.id + '/, voice Bian', M && { folder: M.folder, suara: M.suara });
      const kunci = Object.keys(M.segmen);
      cek(seg.length === s.jumlah && JSON.stringify(kunci) === JSON.stringify(seg.map((x) => x.id)), s.id + ': ' + s.jumlah + ' segmen manifest = segmen naskah PWA (urutan sama)', { naskah: seg.length, manifest: kunci.length });
      const buruk = seg.filter((x) => { const k = M.segmen[x.id]; return !Array.isArray(k) || k.length !== 1 || k[0].audio !== s.id + '-' + x.id + '.mp3' || k[0].start !== 0 || !(k[0].end > 0) || !fs.existsSync(path.join(ROOT, M.folder, k[0].audio)); }).map((x) => x.id);
      cek(!buruk.length, s.id + ': satu klip per segmen <sumber>-SNN-MM.mp3, start 0, berkas ada', buruk);
      if (master) {
        const beda = seg.filter((x) => master[s.id + '/' + x.id] !== x.teks).map((x) => x.id);
        cek(!beda.length, s.id + ': teks naskah PWA = MASTER-SCRIPT-72.md', beda);
      } else console.log('  info  MASTER-SCRIPT-72.md tidak ada — perbandingan teks dilewati');
      const iM = html.indexOf('src/sales-idea-' + s.id + '-audio.js'), iS = html.indexOf('src/' + s.modul);
      cek(iM > 0 && iS > iM, s.id + ': manifest dimuat sebelum ' + s.modul);
      const tidak = seg.filter((x) => sw.indexOf("'./assets/narasi/" + s.id + '/' + s.id + '-' + x.id + ".mp3'") < 0).map((x) => x.id);
      cek(!tidak.length && sw.indexOf("'./src/sales-idea-" + s.id + "-audio.js?v=") > 0, s.id + ': service worker menyimpan manifest + ' + seg.length + ' berkas', tidak);
    }
    cek(total === 29, 'total 29 segmen rekaman baru', total);
    for (const [k, t] of Object.entries(TEKS_FINAL)) {
      const [sid, id] = k.split('/'), pwa = (daftarSegmen(NASKAH[sid]).find((x) => x.id === id) || {}).teks, M = MANIFEST[sid].segmen[id];
      cek(pwa === t && (!master || master[k] === t) && M && M[0].audio === sid + '-' + id + '.mp3', 'teks final ' + sid + '-' + id + ': PWA & MASTER sama persis dengan teks audio; manifest → ' + sid + '-' + id + '.mp3',
        { pwa: pwa === t, master: master ? master[k] === t : 'dilewati', audio: M && M[0].audio });
    }
    const tag = [...html.matchAll(/src="(src\/sales-idea-(?:jari|jari-alasan|asset)(?:-audio)?\.js\?v=\d+)"/g)].map((x) => x[1]);
    cek(tag.length === 5 && tag.every((t) => sw.indexOf("'./" + t + "'") > 0), 'index.html & service worker memakai versi skrip yang sama (3 manifest + 2 modul)', tag);
    const lama = LAMA.map((c) => { const M = LAMA_M[c.id], k = Object.keys(M.segmen); const f = klipDari(M); return { id: c.id, n: k.length, ada: f.every((u) => fs.existsSync(path.join(ROOT, u)) && sw.indexOf("'./" + u + "'") > 0) }; });
    cek(lama.every((x, i) => x.n === LAMA[i].jumlah && x.ada), '43 rekaman lama tetap terdaftar (6 + 10 + 27): manifest, berkas, service worker', lama);
    const sgF = [...new Set(klipDari(SG))];
    cek(sgF.length === 13 && sgF.every((u) => fs.existsSync(path.join(ROOT, u)) && sw.indexOf("'./" + u + "'") > 0) && /sales-idea-singapura-audio\.js\?v=114/.test(html),
      'Singapura tetap: 13 berkas terdaftar di manifest & service worker, tag skrip tidak berubah', sgF.length);
  }

  /* ---------- A. aset ---------- */
  if (ikut('A')) {
    console.log('[A] Aset audio');
    const { ctx, pg } = await buka();
    const baru = Object.values(SUMBER).flatMap((s) => Object.values(MANIFEST[s.id].segmen).map((k) => ({ u: MANIFEST[s.id].folder + k[0].audio, end: k[0].end })));
    const lama = LAMA.flatMap((c) => klipDari(LAMA_M[c.id]).map((u) => ({ u }))).concat([...new Set(klipDari(SG))].map((u) => ({ u })));
    const hasil = await pg.evaluate(async (d) => {
      const ac = new OfflineAudioContext(1, 44100, 44100), o = [];
      for (const x of d) {
        try { const r = await fetch(x.u); const b = await r.arrayBuffer(); const dec = await ac.decodeAudioData(b); o.push({ u: x.u, ok: r.ok, dur: dec.duration, end: x.end }); }
        catch (e) { o.push({ u: x.u, ok: false, galat: String(e) }); }
      }
      return o;
    }, baru.concat(lama));
    const hb = hasil.slice(0, baru.length), hl = hasil.slice(baru.length);
    const buruk = hb.filter((x) => !x.ok || !(x.end <= x.dur + 0.001 && x.end >= x.dur - 0.05)).map((x) => x.u + (x.galat ? ' ' + x.galat : ' end ' + x.end + ' dur ' + (x.dur || 0).toFixed(3)));
    cek(hb.length === 29 && !buruk.length, '29 berkas baru dimuat & di-decode; end manifest = durasi berkas (±50 md)', buruk);
    const burukL = hl.filter((x) => !x.ok || !(x.dur > 0)).map((x) => x.u);
    cek(hl.length === 56 && !burukL.length, '43 rekaman lama + 13 rekaman Singapura tetap dimuat & di-decode', burukL);
    await ctx.close();
  }

  /* ---------- P. pemutaran penuh (--laju ×) ---------- */
  if (ikut('P')) {
    console.log('[P] Pemutaran penuh (animasi & audio ' + LAJU + '×)');
    for (const [pid, p] of Object.entries(PRESENTASI).filter(([k]) => !PILIH || PILIH.includes(k))) {
      const { ctx, pg } = await buka(LAJU !== 1 ? { cepat: LAJU } : {});
      if (LAJU !== 1) await pg.evaluate((l) => { window.__laju = l; }, LAJU);
      await bukaHub(pg); await pilihCerita(pg, p.pilih); await pg.click('#siPlay');
      const buruk = [], lambat = [], tumpang = [], tertinggal = [], lewatScene = [], rinci = [];
      let awalMaks = 0, sisaMaks = 0, nKlip = 0;
      for (let i = 1; i <= p.scene.length; i++) {
        const [sid, n] = p.scene[i - 1], S = SUMBER[sid], M = MANIFEST[sid], A = NASKAH[sid].adegan[n - 1], pre = sid + '-S';
        if (i > 1) await pg.keyboard.press('ArrowRight');
        const jml = A.segmen.length; nKlip += jml;
        const ok = await tunggu(pg, (a) => window.__rek.klip.filter((x) => x.adegan === a[0] && x.berkas.startsWith(a[2])).length >= a[1] && !window.PSGNarasi.rekaman().main, 120000, [n, jml, pre]);
        await pg.waitForTimeout(150);
        const dengar = await pg.evaluate((a) => window.__rek.klip.filter((x) => x.adegan === a[0] && x.berkas.startsWith(a[1])).map((x) => Object.assign({}, x)), [n, pre]);
        const urut = dengar.map((x) => x.segmen + ':' + x.berkas).join(' '), harap = A.segmen.map((_, j) => (j + 1) + ':' + M.segmen[ID(n, j + 1)][0].audio).join(' ');
        if (!ok || urut !== harap) { buruk.push('scene ' + i + ' urutan "' + urut + '" ≠ "' + harap + '"'); continue; }
        dengar.forEach((x) => {
          const k = M.segmen[ID(n, x.segmen)][0], henti = x.berhenti != null ? x.berhenti : x.akhir, nama = sid + ' ' + ID(n, x.segmen);
          if (x.mulai == null || Math.abs(x.mulai - k.start) > 0.02) buruk.push(nama + ' mulai ' + x.mulai);
          const batas = x.mulai + ((x.t0 - x.tPlay) / 1000) * x.laju + 0.02;
          if (x.awal < -0.02 || x.awal > batas) buruk.push(nama + ' bacaan pertama ' + x.awal + ' > ' + batas.toFixed(3));
          if (x.akhir > k.end + 0.12 || henti > k.end + 0.12) buruk.push(nama + ' melewati akhir ' + k.end + ' → ' + Math.max(x.akhir, henti));
          if (henti < k.end - 0.3) buruk.push(nama + ' berhenti terlalu awal ' + henti + ' < ' + k.end);
          if (x.mulai != null) awalMaks = Math.max(awalMaks, Math.abs(x.mulai - k.start));
          sisaMaks = Math.max(sisaMaks, k.end - henti);
        });
        /* tanpa tumpang tindih: klip berikut baru play() sesudah audio klip sebelumnya berhenti */
        dengar.forEach((x, j) => { const y = dengar[j - 1]; if (j && (y.tStop == null || x.tPlay < y.tStop)) tumpang.push(sid + ' ' + ID(n, x.segmen) + ' play ' + (y.tStop == null ? '(tanpa catatan berhenti)' : ((x.tPlay - y.tStop) / 1000).toFixed(3) + ' dtk')); });
        if (A.bergerbang) {
          /* segmen ke-j (1-based) baru boleh mulai setelah node scene ber-data-ketuk ≥ j */
          const g = await pg.evaluate((a) => {
            const node = document.querySelector(a.sel + '[' + a.attr + '="' + a.n + '"]');
            return window.__rek.klip.filter((x) => x.adegan === a.n && x.berkas.startsWith(a.pre)).map((x) => {
              const e = window.__rek.ketuk.find((k) => k.el === node && k.k >= x.segmen);
              return { segmen: x.segmen, tKetuk: e ? e.t : null, tPlay: x.tPlay };
            });
          }, { sel: S.sel, attr: S.attr, n, pre });
          g.forEach((x, j) => {
            const nama = sid + ' ' + ID(n, x.segmen);
            if (x.tKetuk == null || x.tPlay == null || x.tPlay < x.tKetuk - 5) { buruk.push(nama + ' mulai sebelum ketukan ' + x.segmen); return; }
            lambat.push((x.tPlay - x.tKetuk) / 1000);
            /* tidak tertinggal: audio segmen sebelumnya sudah berhenti saat ketukan segmen ini mulai */
            const y = dengar[j - 1], lewat = y && y.tStop != null ? (y.tStop - x.tKetuk) / 1000 : null;
            if (lewat != null && lewat > 0.02) tertinggal.push(sid + ' ' + ID(n, y.segmen) + ' masih berbunyi ' + lewat.toFixed(3) + ' dtk sesudah ketukan ' + x.segmen);
            const d = dengar[j];
            rinci.push({ id: nama, ketukAudio: (x.tPlay - x.tKetuk) / 1000, sisaSebelum: lewat, jedaDariSebelum: y && y.tStop != null ? (x.tPlay - y.tStop) / 1000 : null,
              durasi: d.tStop != null ? (d.tStop - d.tPlay) / 1000 : null });
          });
          /* narasi scene selesai sebelum timeline scene selesai (status 'selesai') */
          const z = dengar[dengar.length - 1];
          const sc = await pg.evaluate((t) => { const e = window.__rek.status.find((x) => x.t > t && x.s === 'selesai'); return { tSelesai: e ? e.t : null, sekarang: document.getElementById('layarSalesIdea').getAttribute('data-sip-status') }; }, dengar[0].tPlay);
          const lebih = sc.tSelesai != null && z.tStop != null ? (z.tStop - sc.tSelesai) / 1000 : null;
          if (z.tStop == null || (lebih != null && lebih > 0.02) || (sc.tSelesai == null && sc.sekarang !== 'berputar')) lewatScene.push(sid + ' scene ' + n + ' audio ' + (lebih != null ? lebih.toFixed(3) + ' dtk sesudah timeline selesai' : 'status ' + sc.sekarang));
          rinci.push({ id: sid + ' scene ' + n, statusSaatAudioSelesai: sc.tSelesai == null ? sc.sekarang : 'selesai', akhirAudioVsTimeline: lebih });
        }
      }
      const x = await pg.evaluate(() => ({ nAudio: window.__rek.nAudio }));
      cek(!buruk.length, pid + ': ' + p.scene.length + ' scene, ' + nKlip + ' klip diputar berurutan sesuai manifest, dari awal sampai habis, tanpa melewati batas', buruk.slice(0, 6));
      cek(!tumpang.length, pid + ': tanpa tumpang tindih antar segmen (klip berikut mulai sesudah klip sebelumnya berhenti)', tumpang);
      console.log('  info  ' + LAJU + '×: selisih posisi mulai vs start maks ' + awalMaks.toFixed(3) + ' dtk; berhenti paling awal ' + sisaMaks.toFixed(3) + ' dtk sebelum end');
      if (lambat.length) {
        const u = lambat.slice().sort((a, b) => a - b), med = u[Math.floor(u.length / 2)];
        cek(true, pid + ': ' + lambat.length + ' segmen bergerbang tidak mulai sebelum ketukan visualnya (jeda ketukan→audio min ' + u[0].toFixed(3) + ' · median ' + med.toFixed(3) + ' · maks ' + u[u.length - 1].toFixed(3) + ' dtk, ' + LAJU + '×)');
        /* sinkron waktu nyata hanya bermakna pada 1× (latensi play() tidak ikut dipercepat) */
        if (LAJU === 1) {
          cek(!tertinggal.length, pid + ': audio tidak tertinggal — segmen sebelumnya selesai sebelum ketukan berikutnya mulai', tertinggal);
          cek(!lewatScene.length, pid + ': narasi tiap scene bersegmen selesai sebelum timeline scene selesai', lewatScene);
        } else console.log('  info  ' + LAJU + '× (sinkron waktu nyata diperiksa pada --laju 1): ' + (tertinggal.concat(lewatScene).join('; ') || 'tanpa catatan'));
      }
      if (RINCI) rinci.forEach((r) => console.log('  rinci ' + JSON.stringify(r, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
      cek(x.nAudio === 1 && await ucapTTS(pg) === 0, pid + ': satu elemen audio, speechSynthesis tidak dipakai', { nAudio: x.nAudio, tts: await ucapTTS(pg) });
      await ctx.close();
    }
  }

  /* ---------- K. kontrol pemutar ---------- */
  if (ikut('K')) {
    console.log('[K] Kontrol pemutar (klik nyata)');
    const KASUS = [
      { lbl: 'jari', pilih: 'jari', mulai: 1, f1: 'jari-S01-01.mp3', f2: 'jari-S02-01.mp3', replay: 'jari-S01-01.mp3' },
      { lbl: 'jari-alasan', pilih: 'jari', mulai: 7, f1: 'jari-alasan-S01-01.mp3', f2: 'jari-alasan-S02-01.mp3', replay: 'jari-S01-01.mp3' },
      { lbl: 'asset', pilih: 'asset', mulai: 1, f1: 'asset-S01-01.mp3', f2: 'asset-S02-01.mp3', replay: 'asset-S01-01.mp3' }
    ];
    for (const c of KASUS) {
      const { ctx, pg } = await buka(), lbl = c.lbl;
      await bukaHub(pg); await pilihCerita(pg, c.pilih);
      const r0 = await rek(pg); cek(!r0.main, lbl + ': OPEN tanpa audio', r0);
      if (c.mulai > 1) {
        const sampai = await keLangkah(pg, c.mulai);
        cek(sampai, lbl + ': NEXT sampai langkah ' + c.mulai + ' (BAB 3 alasan pertama)', await langkah(pg));
      } else await pg.click('#siPlay');
      /* BAB 3 memakai renderer lama: timeline scene hanya ±820 md, sesudahnya status
         'selesai' (tombol menjadi Play = putar ulang) sementara narasi berjalan terus;
         PAUSE diuji di dalam jendela animasi itu */
      const main = await tungguBerkas(pg, c.f1, 8000); await pg.waitForTimeout(c.mulai > 1 ? 150 : 700); const r1 = await rek(pg);
      cek(main && r1.berkas === c.f1 && r1.segmen === 1 && r1.waktu > 0 && await status(pg) === 'berputar', lbl + ': PLAY → animasi + audio ' + c.f1, r1);
      await pg.click('#siPlay'); await pg.waitForTimeout(250); const r2 = await rek(pg); await pg.waitForTimeout(700); const r3 = await rek(pg);
      cek(!r2.main && !r3.main && r3.waktu === r2.waktu && await status(pg) === 'jeda', lbl + ': PAUSE → audio jeda, posisi tersimpan', [r2, r3]);
      await pg.click('#siPlay'); await tungguBerkas(pg, c.f1, 3000); await pg.waitForTimeout(300); const r4 = await rek(pg);
      cek(r4.main && r4.berkas === c.f1 && r4.waktu >= r2.waktu - 0.02 && r4.waktu < r2.waktu + 1.2, lbl + ': RESUME → lanjut dari posisi (tidak mulai dari 0)', [r2.waktu, r4]);
      await pg.click('#siNext'); await pg.waitForTimeout(120); const r5 = await rek(pg);
      await tungguBerkas(pg, c.f2, 8000); const r6 = await rek(pg);
      cek(!(r5.main && r5.berkas === c.f1) && r6.berkas === c.f2 && r6.waktu < 1.5, lbl + ': NEXT → audio lama berhenti, ' + c.f2 + ' dari awal', [r5, r6]);
      await pg.click('#siPrev'); await tungguBerkas(pg, c.f1, 8000); const r7 = await rek(pg);
      cek(r7.berkas === c.f1 && r7.waktu < 1.5, lbl + ': BACK → ' + c.f1 + ' dari awal', r7);
      await pg.click('#siReplay'); await tungguBerkas(pg, c.replay, 8000); const r8 = await rek(pg);
      cek(r8.berkas === c.replay && r8.segmen === 1 && r8.waktu < 1.5 && await langkah(pg) === 1, lbl + ': REPLAY → langkah 1 segmen 1 dari awal (' + c.replay + ')', r8);
      if (c.mulai > 1) { await keLangkah(pg, c.mulai); await tungguBerkas(pg, c.f1, 8000); await pg.waitForTimeout(400); }
      const sb = await status(pg), ada = await klikNarasi(pg); await pg.waitForTimeout(250); const r9 = await rek(pg); await pg.waitForTimeout(1000); const r10 = await rek(pg);
      /* BAB 3: animasi scene hanya ±820 md dan bisa selesai sendiri selama pengamatan —
         Narasi OFF tidak boleh menjeda atau mengulang pemutar (bukan 'jeda'/'siap') */
      const sOff = await status(pg), okS = c.mulai > 1 ? (sOff === 'berputar' || sOff === 'selesai') : sOff === 'berputar';
      cek(ada && !r9.main && !r10.main && okS, lbl + ': Narasi OFF → audio diam, animasi tidak dijeda (' + (c.mulai > 1 ? 'berputar/selesai' : 'berputar') + ')', [r9, r10, sb, sOff]);
      const e5 = await luar(pg);
      cek(aman(e5), lbl + ': Narasi OFF — play() dari luar engine tidak berbunyi', e5);
      await klikNarasi(pg); const on = await tunggu(pg, () => window.PSGNarasi.rekaman().main, 3000); const r11 = await rek(pg);
      cek(on && r11.berkas === (c.mulai > 1 ? c.f1 : c.replay) && r11.waktu >= r10.waktu - 0.02, lbl + ': Narasi ON → audio lanjut', [r10.waktu, r11]);
      await pg.click('#layarSalesIdea .si-close'); await pg.waitForTimeout(300); const r12 = await rek(pg); await pg.waitForTimeout(800); const r13 = await rek(pg);
      const e2 = await luar(pg);
      cek(!r12.main && !r13.main && r13.berkas === '' && aman(e2) && !e2.sumber, lbl + ': CLOSE → audio berhenti, sumber dilepas, play() dari luar tidak berbunyi', [r12, r13, e2]);
      await bukaHub(pg); await pilihCerita(pg, c.pilih);
      if (c.mulai > 1) await keLangkah(pg, c.mulai); else await pg.click('#siPlay');
      await tungguBerkas(pg, c.f1, 8000);
      await pg.click('[data-si-hub]'); await pg.waitForTimeout(300); const e6 = await luar(pg);
      cek(aman(e6) && !e6.sumber, lbl + ': keluar ke hub → sumber dilepas, tidak ada suara tersisa', e6);
      const nA = await pg.evaluate(() => window.__rek.nAudio);
      cek(nA === 1 && await ucapTTS(pg) === 0, lbl + ': satu elemen audio, tanpa speechSynthesis', { nA, tts: await ucapTTS(pg) });
      await ctx.close();
    }
  }

  /* ---------- L. tidak bocor antar bagian / Sales Idea ---------- */
  if (ikut('L')) {
    console.log('[L] Jari → Jari-Alasan → Asset → Retirement → Singapura');
    const { ctx, pg } = await buka();
    const bersih = () => pg.evaluate(() => { window.__tts.log = []; window.__rek.klip = []; });
    const hanya = (pola) => pg.evaluate((p) => window.__rek.klip.length > 0 && window.__rek.klip.every((x) => new RegExp(p).test(x.berkas)), pola);
    const keHub = async () => { await pg.click('[data-si-hub]'); await pg.waitForTimeout(300); return luar(pg); };
    await bukaHub(pg); await pilihCerita(pg, 'jari'); await bersih(); await pg.click('#siPlay');
    const a1 = await tungguBerkas(pg, 'jari-S01-01.mp3', 8000); await pg.waitForTimeout(500);
    cek(a1 && await hanya('^jari-S\\d\\d-\\d\\d\\.mp3$') && await ucapTTS(pg) === 0, 'Jari BAB 1 hanya memutar rekaman jari-S01-01.mp3', await rek(pg));
    await keLangkah(pg, 7);
    const a2 = await tungguBerkas(pg, 'jari-alasan-S01-01.mp3', 8000); await bersih(); await pg.waitForTimeout(600);
    /* sesudah tiba di BAB 3: tidak ada klip lain yang mulai, yang berbunyi rekaman alasan */
    const b2 = await rek(pg), lain = await pg.evaluate(() => window.__rek.klip.filter((x) => !/^jari-alasan-S\d\d-\d\d\.mp3$/.test(x.berkas)).map((x) => x.berkas));
    cek(a2 && b2.main && b2.berkas === 'jari-alasan-S01-01.mp3' && !lain.length && await ucapTTS(pg) === 0, 'Jari BAB 3 (alasan) hanya memutar rekaman jari-alasan (tanpa sisa BAB 1–2, tanpa suara browser)', { b2, lain });
    const h2 = await keHub();
    cek(aman(h2) && !h2.sumber, 'keluar dari Jari ke hub: diam & sumber dilepas', h2);
    await pilihCerita(pg, 'asset'); await bersih(); await pg.click('#siPlay');
    const a3 = await tungguBerkas(pg, 'asset-S01-01.mp3', 8000); await pg.waitForTimeout(600);
    cek(a3 && await hanya('^asset-S\\d\\d-\\d\\d\\.mp3$') && await ucapTTS(pg) === 0, 'Asset hanya memutar rekamannya sendiri (tanpa sisa Jari, tanpa suara browser)', await rek(pg));
    await keHub();
    await pilihCerita(pg, 'retirement'); await bersih(); await pg.click('#siPlay');
    const a4 = await tungguBerkas(pg, 'retirement-S01-01.mp3', 8000); await pg.waitForTimeout(600);
    cek(a4 && await hanya('^retirement-S\\d\\d-\\d\\d\\.mp3$'), 'Retirement (rekaman lama) tetap memutar rekamannya sendiri', await rek(pg));
    await keHub();
    await pilihCerita(pg, 'singapura'); await bersih(); await pg.click('#siPlay');
    const a5 = await tungguBerkas(pg, 'S01-01.mp3', 8000); await pg.waitForTimeout(600);
    cek(a5 && await hanya('^S\\d\\d-\\d\\d\\.mp3$'), 'Singapura tetap memutar rekamannya sendiri (S01-01.mp3)', await rek(pg));
    const h5 = await keHub();
    cek(aman(h5) && !h5.sumber && await pg.evaluate(() => window.__rek.nAudio) === 1, 'akhir: diam, sumber dilepas, satu elemen audio sepanjang perpindahan', h5);
    await ctx.close();
  }

  /* ---------- T. timing 1× (durasi rekaman sebagai batas minimum timeline) ---------- */
  if (ikut('T')) {
    console.log('[T] Timing 1×: Jari BAB 1, Jari-Alasan S01-01, Asset S05-02 & S06-01');
    const dt = (a, b) => Math.round(a - b) / 1000;
    /* satu scene: klip sumber `pre` pada adegan n, saat tiap ketukan dimulai, saat status 'selesai' */
    const dataScene = (pg, sel, attr, n, pre) => pg.evaluate((a) => {
      const node = document.querySelector(a.sel + '[' + a.attr + '="' + a.n + '"]');
      const klip = window.__rek.klip.filter((x) => x.adegan === a.n && x.berkas.startsWith(a.pre)).map((x) => ({ segmen: x.segmen, berkas: x.berkas, tPlay: x.tPlay, tStop: x.tStop, mulai: x.mulai }));
      const ketuk = {}; window.__rek.ketuk.filter((k) => k.el === node).forEach((k) => { if (ketuk[k.k] == null) ketuk[k.k] = k.t; });
      const t0 = klip.length ? klip[0].tPlay : 0, e = window.__rek.status.find((x) => x.t > t0 && x.s === 'selesai');
      return { klip, ketuk, tSelesai: e ? e.t : null, status: document.getElementById('layarSalesIdea').getAttribute('data-sip-status') };
    }, { sel, attr, n, pre });
    /* segmen j bergerbang: audio sebelumnya berhenti sebelum ketukan j; segmen j mulai dari 0
       sesudah ketukannya dan sesudah audio sebelumnya berhenti (tanpa overlap) */
    const transisi = (d, j, lbl) => {
      const x = d.klip.find((k) => k.segmen === j), y = d.klip.find((k) => k.segmen === j - 1), tk = d.ketuk[j];
      const ok = !!(x && y && tk != null && y.tStop != null && y.tStop <= tk + 20 && x.tPlay >= tk - 5 && x.tPlay >= y.tStop && x.mulai === 0);
      cek(ok, lbl, x && y && tk != null ? { audioSebelumnyaSelesaiSebelumKetukan: dt(tk, y.tStop), mulaiSesudahKetukan: dt(x.tPlay, tk), jedaAntarAudio: dt(x.tPlay, y.tStop) } : { klip: d.klip.length, ketuk: Object.keys(d.ketuk) });
      return ok;
    };
    /* timeline scene tidak selesai sebelum audio terakhirnya berhenti */
    const akhirScene = async (pg, sel, attr, n, pre, lbl) => {
      await tunggu(pg, () => document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 4000);
      const d = await dataScene(pg, sel, attr, n, pre), z = d.klip[d.klip.length - 1];
      const ok = !!(z && z.tStop != null && (d.tSelesai == null ? d.status === 'berputar' : d.tSelesai >= z.tStop - 20));
      cek(ok, lbl + ' (timeline selesai ' + (d.tSelesai == null ? '—, masih ' + d.status : dt(d.tSelesai, z.tStop) + ' dtk sesudah audio terakhir berhenti') + ')', z ? { tSelesai: d.tSelesai, audioStop: z.tStop } : d);
      return d;
    };
    /* (a) Jari BAB 1: 7 segmen bergerbang, S01-07 segmen terakhir */
    {
      const { ctx, pg } = await buka();
      await bukaHub(pg); await pilihCerita(pg, 'jari'); await pg.click('#siPlay');
      await tunggu(pg, () => window.__rek.klip.filter((x) => x.adegan === 1 && /^jari-S01-/.test(x.berkas)).length >= 7 && !window.PSGNarasi.rekaman().main, 150000);
      const d = await akhirScene(pg, '.jps', 'data-jps', 1, 'jari-S', 'jari BAB 1: timeline scene tidak selesai sebelum jari-S01-07 selesai');
      const semua = [2, 3, 4, 5, 6, 7].map((j) => transisi(d, j, 'jari S01-0' + (j - 1) + ' → S01-0' + j + ': selesai sebelum ketukan berikutnya, tanpa overlap'));
      cek(d.klip.length === 7 && semua.every(Boolean), 'jari BAB 1: 7 segmen berurutan', d.klip.map((k) => k.berkas));
      await ctx.close();
    }
    /* (b) Jari-Alasan S01-01 (scene 7), lalu NEXT ke alasan 2 */
    {
      const { ctx, pg } = await buka();
      await bukaHub(pg); await pilihCerita(pg, 'jari'); await keLangkah(pg, 7);
      await tunggu(pg, () => window.__rek.klip.some((x) => x.berkas === 'jari-alasan-S01-01.mp3' && x.tStop != null), 40000);
      const d = await akhirScene(pg, '[data-jps-alasan]', 'data-jps-alasan', 1, 'jari-alasan-S', 'jari-alasan S01-01: timeline tidak selesai sebelum audio selesai');
      const z = d.klip[0];
      cek(!!z && z.mulai === 0 && z.tStop - z.tPlay >= (MANIFEST['jari-alasan'].segmen['S01-01'][0].end - 0.3) * 1000, 'jari-alasan S01-01: rekaman diputar utuh dari 0 sampai akhir', z);
      await pg.click('#siNext'); const lanjut = await tungguBerkas(pg, 'jari-alasan-S02-01.mp3', 3000); const r = await rek(pg);
      cek(lanjut && r.waktu < 1.5 && await langkah(pg) === 8, 'segmen berikutnya: NEXT → jari-alasan-S02-01.mp3 mulai dari awal', r);
      await ctx.close();
    }
    /* (c) Asset scene 5 (S05-02 → S05-03) dan scene 6 (S06-01 → S06-02) */
    {
      const { ctx, pg } = await buka();
      await bukaHub(pg); await pilihCerita(pg, 'asset'); await keLangkah(pg, 5);
      await tunggu(pg, () => window.__rek.klip.filter((x) => x.adegan === 5 && /^asset-S05-/.test(x.berkas)).length >= 3 && !window.PSGNarasi.rekaman().main, 90000);
      const d5 = await akhirScene(pg, '.acs', 'data-acs', 5, 'asset-S', 'asset scene 5: timeline tidak selesai sebelum S05-03 selesai');
      transisi(d5, 2, 'asset S05-01 → S05-02: selesai sebelum ketukan berikutnya, tanpa overlap');
      transisi(d5, 3, 'asset S05-02 → S05-03: S05-02 selesai sebelum ketukan S05-03, tanpa overlap');
      await pg.click('#siNext');
      await tunggu(pg, () => window.__rek.klip.filter((x) => x.adegan === 6 && /^asset-S06-/.test(x.berkas)).length >= 2 && !window.PSGNarasi.rekaman().main, 90000);
      const d6 = await akhirScene(pg, '.acs', 'data-acs', 6, 'asset-S', 'asset scene 6: timeline tidak selesai sebelum S06-02 selesai');
      transisi(d6, 2, 'asset S06-01 → S06-02: S06-01 selesai sebelum ketukan S06-02, tanpa overlap');
      cek(await pg.evaluate(() => window.__rek.nAudio) === 1 && await ucapTTS(pg) === 0, 'asset: satu elemen audio, tanpa speechSynthesis');
      await ctx.close();
    }
  }

  /* ---------- O. offline ---------- */
  if (ikut('O')) {
    console.log('[O] Offline');
    const { ctx, pg } = await buka();
    await pg.evaluate(() => navigator.serviceWorker.ready);
    const baru = Object.values(SUMBER).flatMap((s) => klipDari(MANIFEST[s.id]).map((u) => '/' + u));
    const lama = LAMA.flatMap((c) => klipDari(LAMA_M[c.id]).map((u) => '/' + u)).concat([...new Set(klipDari(SG))].map((u) => '/' + u));
    const isi = await (async () => {
      let hasil = null;
      await tunggu(pg, async (a) => {
        const k = await caches.keys(); if (!k.length) return false;
        const c = await caches.open(k[k.length - 1]); const u = (await c.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search);
        const ada = (x) => u.indexOf(x) >= 0;
        window.__isi = { baru: a[0].filter(ada).length, lama: a[1].filter(ada).length, manifest: ['jari', 'jari-alasan', 'asset'].filter((s) => u.some((x) => x.indexOf('/src/sales-idea-' + s + '-audio.js') === 0)).length, mp3: u.filter((x) => /\.mp3$/.test(x)).length };
        return window.__isi.baru === a[0].length && window.__isi.manifest === 3;
      }, 45000, [baru, lama]);
      hasil = await pg.evaluate(() => window.__isi);
      return hasil;
    })();
    cek(isi && isi.baru === 29 && isi.manifest === 3, 'cache service worker berisi 29 berkas rekaman baru + 3 manifest', isi);
    cek(isi && isi.lama === 56 && isi.mp3 === 85, 'cache tetap berisi 43 rekaman lama + 13 rekaman Singapura (total 85 MP3)', isi);
    await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(600);
    for (const c of [{ pilih: 'jari', f: 'jari-S01-01.mp3' }, { pilih: 'jari', langkah: 7, f: 'jari-alasan-S01-01.mp3' }, { pilih: 'asset', f: 'asset-S01-01.mp3' }]) {
      await bukaHub(pg); await pilihCerita(pg, c.pilih);
      if (c.langkah) await keLangkah(pg, c.langkah); else await pg.click('#siPlay');
      const main = await tungguBerkas(pg, c.f, 8000); const r = await rek(pg);
      cek(main && r.berkas === c.f, 'offline: ' + c.f + ' berbunyi dari cache', r);
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
