#!/usr/bin/env node
/* Sales Idea 07 — Proteksi Kredit (Cristal Prime).

     node tests/sales-idea-kredit.test.js [--root <dir>] [--bagian A,B,...]

   Yang dijaga:
   A. registri: hub 7 kartu (Proteksi Kredit = SALES IDEA 07, terakhir),
      membuka 10 scene berurutan sesuai storyboard, OPEN diam.
   B. naskah & klaim: 10 scene / 24 segmen; scene 1 menyebut macam kredit
      (properti: rumah, apartemen; kendaraan: mobil) dengan contoh rumah;
      pertanyaan inti dan kalimat ajakan persis; tanpa digit/"Rp" di naskah
      suara; "lunas" hanya untuk asuransi jiwa kredit / KPR, tidak ada klaim
      otomatis atau dijamin; asuransi jiwa kredit dengan syarat (tidak semua
      kredit, aktif, ketentuan polis); scene 8–9 tanpa nama produk; naskah
      Bian di tools/narasi identik dengan source. Angka scene 8–9 = hasil
      engine CRIS aplikasi (pria 40 th, UP Rp2,7 M, bayar 10 / lindung 15,
      bulanan); skenario 3: Rp15 jt × 12 × 10 = Rp1,8 M vs manfaat Rp2,9 M.
   C. narasi rekaman (voice Bian, MP3): manifest 24 segmen = naskah,
      tepat 24 berkas kredit-SNN-MM.mp3, di-decode Chromium dengan end =
      durasi berkas dan berisi suara; ketukan mengikuti rekaman (total
      3½–4 menit); pemutaran penuh waktu nyata: klip berurutan, utuh, tanpa
      tumpang tindih, mulai pada ketukannya, selesai sebelum timeline scene;
      satu elemen audio, suara browser tidak dipakai; PAUSE / RESUME dari
      posisi / NEXT di tengah narasi / CLOSE menghentikan audio lama.
   D. kontrol pemutar desktop & HP: OPEN diam, PLAY, PAUSE, RESUME tanpa
      ulang, NEXT, BACK, REPLAY, CLOSE bersih.
   E. kartu akhir sesudah scene 10 → Profil dengan target Cristal Prime
      (CRIS); profil tidak dipilih otomatis; profil BARU (Simpan) dan profil
      yang SUDAH ADA (Gunakan) sama-sama berakhir di kalkulator Cristal Prime
      dengan data profil terisi; label kartu khusus Proteksi Kredit "Mari
      Hitung Kebutuhan Anda" / "Topik Lain"; Topik Lain → hub 7 Sales Idea;
      Sales Idea lain (Asset) tetap berlabel "Mari Kita Hitung" / "Bahas
      Topik Lain" pada kartu yang sama.
   F. gerak dikurangi: keadaan akhir statis.
   G. responsif 320–1920 × terang/gelap (+ HP landscape): tanpa overflow
      horizontal, teks di dalam area inti & kotaknya, label/pil tidak
      bertumpuk, tokoh utuh, teks visual ≥ 9 px.
   H. hemat & bersih: elemen SVG per scene, tanpa 4xx, logo resmi termuat,
      tanpa storage key baru, tanpa error konsol.
   I. PWA: berkas baru (modul, manifest audio, 24 MP3) ada di precache
      sw.js dengan ?v= yang sama dengan index.html; offline (service
      worker) Proteksi Kredit tetap terbuka dan rekamannya tetap berbunyi.
   J. Sales Idea lain tetap terbuka (scene 1 siap, tanpa error).
   K. unduh video (src/sales-idea-video.js): keempat MP4 ada di repo dan
      videoSiap true; skip/lompat → putaran tidak sah, tombol tidak tampil;
      tonton utuh waktu nyata dari scene 1 di layar HP → baru sesudah
      scene 10 selesai tampil SATU tombol "Download Video" (aturan sama dengan
      Sales Idea lain: smartphone → portrait), tidak tertutup kartu akhir;
      href/nama ikut tema dan berkas yang terunduh = berkas repo (SHA-256).
      Tablet/laptop/foldable → landscape diuji di sales-idea-unduh-video
      (PERANGKAT).
      Bagian C dan K masing-masing berjalan ±4–5 menit (waktu nyata).

   Playwright tidak menjadi dependensi repo: dipakai dari instalasi global
   (NODE_PATH) bila tersedia. Keluar 0 = lulus, 1 = gagal, 2 = dilewati. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

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

const JUDUL = ['Impian memiliki aset', 'Rencana Pak Leo', 'Ketika semua berjalan lancar', 'Risiko meninggal dunia', 'Risiko penyakit kritis',
  'Pertanyaan penting', 'Memperkenalkan Proteksi Kredit', 'Pak Leo menambah Proteksi Kredit', 'Simulasi 3 skenario', 'Mari kita hitung'];
const TANYA = 'Jika kita masih harus membayar cicilan, tetapi kesehatan dan penghasilan terganggu, dari mana dana untuk melanjutkan semuanya?';
const AJAK_1 = 'Jangan hanya merencanakan cara memiliki aset. Rencanakan juga perlindungan finansialnya.';
const AJAK_2 = 'Mari hitung kebutuhan proteksi kredit Anda bersama kami.';
const LAIN = ['jari', 'basket', 'education', 'retirement', 'asset', 'singapura'];

const TYPES = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp',
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

/* narator palsu (Web Speech): mencatat ucapan tanpa suara; "tumpang" naik
   bila speak() dipanggil saat suara lain masih berbicara/antre */
function mockTTS() {
  window.__tts = { log: [], ms: 4, tumpang: 0 };
  let cur = null, timer = null; const q = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.onend = null; this.onerror = null; };
  const mulai = () => {
    if (cur || !q.length) return;
    cur = q.shift(); window.__tts.log.push({ t: 'mulai', x: cur.text, lang: cur.lang });
    timer = setTimeout(() => { const u = cur; cur = null; window.__tts.log.push({ t: 'akhir', x: u.text }); if (u.onend) u.onend({}); mulai(); }, window.__tts.ms * cur.text.length);
  };
  const ss = {
    speak(u) { if (cur || q.length) window.__tts.tumpang++; q.push(u); mulai(); },
    cancel() { window.__tts.log.push({ t: 'cancel' }); const u = cur; q.length = 0; cur = null; clearTimeout(timer); if (u && u.onerror) u.onerror({ error: 'interrupted' }); },
    pause() {}, resume() {},
    getVoices() { return [{ name: 'Uji Bahasa Indonesia', lang: 'id-ID', localService: true }]; },
    get speaking() { return !!cur; }, get pending() { return q.length > 0; }, addEventListener() {}, removeEventListener() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true });
}
/* pemantau audio: jumlah play() pada elemen media */
function pantauAudio() {
  window.__audio = { play: 0, src: [] };
  const p = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__audio.play++; window.__audio.src.push(this.currentSrc || this.src || ''); return p.apply(this, arguments); };
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

/* pemeriksa tata letak scene aktif pada keadaan akhir (dijalankan di halaman) */
function periksa() {
  const c = document.getElementById('salesIdeaContent');
  document.getAnimations().filter((a) => a.effect && a.effect.target && c.contains(a.effect.target)).forEach((a) => { const e = a.effect.getComputedTiming().endTime; a.pause(); a.currentTime = isFinite(e) ? e : 0; });
  const svg = document.querySelector('.pks-rig'), stage = document.querySelector('.pks-stage');
  const M = svg.getScreenCTM(); const pt = (x, y) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(M); };
  const a = pt(0, 0), b = pt(480, 360); const inti = { l: a.x, t: a.y, r: b.x, b: b.y };
  const sr = stage.getBoundingClientRect();
  const vis = (el) => { let e = el; while (e && e !== svg) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; e = e.parentNode; } return true; };
  const texts = [...svg.querySelectorAll('text')].filter(vis).map((t) => ({ t: t.textContent, r: t.getBoundingClientRect(), el: t }));
  const masalah = [];
  for (const x of texts) {
    if (x.r.left < inti.l - 1 || x.r.right > inti.r + 1 || x.r.top < inti.t - 1 || x.r.bottom > inti.b + 1) masalah.push('di luar inti: ' + x.t);
    if (x.r.left < sr.left - 1 || x.r.right > sr.right + 1 || x.r.top < sr.top - 1 || x.r.bottom > sr.bottom + 1) masalah.push('di luar panggung: ' + x.t);
    let g = x.el.parentNode, rect = null;
    while (g && g !== svg) { const k = [...g.children].find((e) => e.tagName === 'rect' && e.classList.contains('pks-kartu')); if (k) { rect = k; break; } g = g.parentNode; }
    if (rect) { const rr = rect.getBoundingClientRect(); if (x.r.left < rr.left - 1 || x.r.right > rr.right + 1) masalah.push('luber dari kotak: ' + x.t); }
  }
  /* bbox teks SVG memuat ruang aksen: tinggi dipangkas 20% atas-bawah */
  const susut = (r) => { const h = r.height * 0.2; return { l: r.left, r: r.right, t: r.top + h, b: r.bottom - h }; };
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const p = susut(texts[i].r), q = susut(texts[j].r);
    if (Math.min(p.r, q.r) - Math.max(p.l, q.l) > 1 && Math.min(p.b, q.b) - Math.max(p.t, q.t) > 1) masalah.push('teks bertumpuk: "' + texts[i].t + '" × "' + texts[j].t + '"');
  }
  const pil = [...svg.querySelectorAll('rect.pks-kartu-pil,rect.pks-kartu-nama,rect.pks-kartu-lunas')].filter(vis).map((r) => r.getBoundingClientRect());
  for (let i = 0; i < pil.length; i++) for (let j = i + 1; j < pil.length; j++) {
    const p = pil[i], q = pil[j];
    if (Math.min(p.right, q.right) - Math.max(p.left, q.left) > 1 && Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > 1) masalah.push('pil bertumpuk #' + i + '×#' + j);
  }
  [...svg.querySelectorAll('.pks-orang')].filter(vis).map((o) => o.getBoundingClientRect()).filter((r) => r.width > 0).forEach((r, i) => {
    if (r.left < sr.left - 2 || r.right > sr.right + 2 || r.top < sr.top - 2 || r.bottom > sr.bottom + 2) masalah.push('tokoh ' + i + ' terpotong');
  });
  const tr = document.querySelector('.pks-text').getBoundingClientRect();
  if (tr.right > innerWidth + 1 || tr.left < -1) masalah.push('kartu teks keluar layar');
  const minPx = Math.min(...texts.map((x) => parseFloat(getComputedStyle(x.el).fontSize) * M.a));
  return { n: +document.querySelector('.pks').dataset.pks, masalah, minPx: Math.round(minPx * 10) / 10 };
}

let gagal = 0;
function cek(ok, label, info) {
  console.log((ok ? '  OK   ' : '  GAGAL') + ' ' + label + (!ok && info !== undefined ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''));
  if (!ok) gagal++;
}
const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');

(async () => {
  const srv = await serve(ROOT);
  const URL = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await chromium.launch();
  const errs = [], gagalMuat = [];

  async function buka(o) {
    o = o || {};
    const ctx = await br.newContext(Object.assign({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' }, o.ctx || {}));
    const pg = await ctx.newPage();
    if (!o.tanpaLog) {
      pg.on('pageerror', (e) => errs.push(e.message));
      pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      pg.on('response', (r) => { if (r.status() >= 400) gagalMuat.push(r.status() + ' ' + r.url()); });
    }
    if (o.rute) await o.rute(pg);
    await pg.addInitScript(mockTTS);
    await pg.addInitScript(pantauAudio);
    await pg.addInitScript(pantauRekaman);
    await pg.addInitScript((t) => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); localStorage.setItem('insuranceHub.theme.v3', t); } catch (_) {} }, o.tema || 'original');
    await pg.goto(URL);
    await pg.waitForTimeout(500);
    if (o.cepat) { const cdp = await ctx.newCDPSession(pg); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: o.cepat }); }
    return { ctx, pg };
  }
  const bukaMode = async (pg, mode) => {
    await pg.evaluate(() => document.getElementById('btnSalesIdea').click()); await pg.waitForTimeout(300);
    await pg.evaluate((m) => document.querySelector('[data-si-choice="' + m + '"]').click(), mode || 'kredit'); await pg.waitForTimeout(400);
  };
  const st = (pg) => pg.evaluate(() => {
    const c = document.getElementById('salesIdeaContent');
    const an = document.getAnimations().filter((a) => a.effect && a.effect.target && c.contains(a.effect.target));
    const inf = (a) => !isFinite(a.effect.getComputedTiming().endTime);
    const node = c.querySelector('.pks');
    return { status: document.getElementById('layarSalesIdea').getAttribute('data-sip-status'), count: document.getElementById('siStepCount').textContent,
      scene: node ? +node.dataset.pks : 0, ketuk: node ? +node.dataset.ketuk : 0, t: Math.round(Math.max(0, ...an.filter((a) => !inf(a)).map((a) => a.currentTime || 0))),
      run: an.filter((a) => a.playState === 'running').length, amb: an.filter((a) => inf(a) && a.playState === 'running').length };
  });
  const klik = (pg, s) => pg.evaluate((q) => document.querySelector(q).click(), s);
  const label = (pg) => pg.evaluate(() => {
    const h = document.getElementById('silHitung'), l = document.getElementById('silLain');
    const teks = [...document.querySelectorAll('#layarSalesIdea button')].map((x) => x.textContent);
    return { mode: window.SalesIdea10Jari.keadaan().mode, hitung: h && h.textContent, lain: l && l.textContent,
      nama: h && h.firstChild.nodeValue.trim(), bawaan: teks.some((x) => /Mari Kita Hitung|Bahas Topik Lain/.test(x)) };
  });
  const keScene = async (pg, n) => { for (let i = 0; i < 24; i++) { const s = await st(pg); if (s.scene === n) return; await pg.keyboard.press(s.scene < n ? 'ArrowRight' : 'ArrowLeft'); await pg.waitForTimeout(120); } };
  const tunggu = async (pg, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { if (await pg.evaluate(fn, arg)) return true; await pg.waitForTimeout(80); } return false; };

  const kunciAwal = await (async () => { const { ctx, pg } = await buka(); const k = await pg.evaluate(() => Object.keys(localStorage).sort()); await ctx.close(); return k; })();

  /* ---------- A. registri ---------- */
  console.log('[A] Registri & pembukaan');
  if (ikut('A')) {
    const { ctx, pg } = await buka();
    await pg.evaluate(() => document.getElementById('btnSalesIdea').click()); await pg.waitForTimeout(300);
    const kartu = await pg.evaluate(() => [...document.querySelectorAll('[data-si-choice]')].map((b) => b.dataset.siChoice).join(','));
    cek(kartu === LAIN.concat('kredit', 'sandwich').join(','), 'hub: 6 Sales Idea lama tetap + Proteksi Kredit + Sandwich Generation', kartu);
    const label = await pg.evaluate(() => { const b = document.querySelector('[data-si-choice="kredit"]'); return { span: b.querySelector('span').textContent, h3: b.querySelector('h3').textContent }; });
    cek(label.span === 'SALES IDEA 07' && label.h3 === 'Proteksi Kredit', 'kartu hub: SALES IDEA 07 — Proteksi Kredit', label);
    await pg.evaluate(() => document.querySelector('[data-si-choice="kredit"]').click()); await pg.waitForTimeout(400);
    const a = await st(pg);
    const k = await pg.evaluate(() => window.SalesIdea10Jari.keadaan());
    cek(a.status === 'siap' && a.scene === 1 && a.run === 0 && /Langkah 1 \/ 10/.test(a.count) && k.mode === 'kredit' && k.total === 10, 'buka: 10 scene terdaftar, scene 1 siap, tanpa autoplay', { a, k });
    const tts0 = await pg.evaluate(() => window.__tts.log.filter((x) => x.t === 'mulai').length);
    cek(tts0 === 0, 'buka: narasi tidak berbunyi sendiri', tts0);
    const kepala = await pg.evaluate(() => ({ kicker: document.querySelector('.pks-kicker').textContent, narasi: !!document.querySelector('.pks .kbs-suara'), judul: document.querySelector('.pks .si-presentation-brand b').textContent }));
    cek(kepala.kicker === 'INTI PESAN • 1/10' && kepala.narasi && kepala.judul === 'Proteksi Kredit', 'header Proteksi Kredit + tombol Narasi + kicker 1/10', kepala);
    const judul = [];
    for (let n = 1; n <= 10; n++) { await keScene(pg, n); judul.push(await pg.evaluate(() => [+document.querySelector('.pks').dataset.pks, document.querySelector('.pks-title').textContent])); }
    cek(judul.every((j, i) => j[0] === i + 1 && j[1] === JUDUL[i]), '10 scene berurutan sesuai storyboard', judul);
    await ctx.close();
  }

  /* ---------- B. naskah, klaim, data produk ---------- */
  console.log('[B] Naskah, klaim, dan angka Cristal Prime');
  if (ikut('B')) {
    const { ctx, pg } = await buka();
    const naskah = await pg.evaluate(() => window.PSGKreditStory.naskah());
    const seg = naskah.reduce((n, s) => n + s.length, 0);
    cek(naskah.length === 10 && seg === 24, '10 scene, 24 segmen narasi', { scene: naskah.length, seg });
    cek(/kredit properti seperti rumah dan apartemen/.test(naskah[0][1]) && /kredit kendaraan seperti mobil/.test(naskah[0][1]) && /contohnya rumah/.test(naskah[0][2]),
      'scene 1: macam kredit (properti: rumah, apartemen; kendaraan: mobil), contoh cerita: rumah');
    const semua = naskah.map((s) => s.join(' ')).join(' ');
    cek(!/\d/.test(semua) && !/\bRp/.test(semua) && !/…/.test(semua), 'naskah suara tanpa digit, "Rp", atau "…"');
    cek(naskah[5].length === 1 && naskah[5][0] === TANYA, 'scene 6: pertanyaan inti persis');
    cek(naskah[9][0] === AJAK_1 && naskah[9][1] === AJAK_2, 'scene 10: kalimat ajakan persis');
    cek(/meninggal dunia/.test(naskah[3][0]) && /tidak semua kredit memilikinya/.test(naskah[3][1]) && /ada, masih aktif, dan klaimnya sesuai ketentuan polis/.test(naskah[3][2]),
      'scene 4: asuransi jiwa kredit bersyarat (tidak semua kredit, aktif, ketentuan polis)');
    cek(/terdiagnosis penyakit kritis/.test(naskah[4][0]) && /belum tentu mencakup/.test(naskah[4][2]), 'scene 5: penyakit kritis; perlindungan kredit yang ada belum tentu mencakup');
    const kalimat = naskah.flat().flatMap((s) => s.match(/[^.!?]+[.!?]+/g) || [s]);
    const kalimatLunas = kalimat.filter((k) => /lunas/i.test(k));
    cek(kalimatLunas.length === 2 && kalimatLunas.every((k) => /asuransi jiwa kredit/.test(k)), '"melunasi/dilunasi" hanya dalam kalimat asuransi jiwa kredit (scene 4 & 9)', kalimatLunas);
    const s78 = naskah[6].concat(naskah[7]).join(' ');
    cek(!/lunas|seluruh sisa|menanggung sisa/i.test(s78), 'scene 7–8: proteksi kredit tidak disebut melunasi / menanggung sisa kredit');
    cek(!/otomatis/i.test(semua), 'tidak ada klaim "otomatis"');
    cek(!/Cristal Prime/i.test(semua), 'naskah suara tanpa nama produk');
    cek(/meninggal dunia dan kreditnya dilengkapi asuransi jiwa kredit yang aktif/.test(naskah[8][1]) && /sesuai ketentuan polis/.test(naskah[8][1]) &&
      /tahun kelima/.test(naskah[8][2]) && /satu koma delapan miliar/.test(naskah[8][2]) && /dua koma sembilan miliar/.test(naskah[8][2]) && /dalam ilustrasi ini/.test(naskah[8][2]) && /satu koma satu miliar/.test(naskah[8][2]),
      'scene 9: tiga skenario (lancar, meninggal + jiwa kredit aktif, sakit kritis tahun ke-5 dengan angka)');
    cek(!/dijamin|pasti dibayar|pasti cair/i.test(semua) && (semua.match(/jaminan/g) || []).length === 1 && /bukan jaminan/.test(semua), '"jaminan" hanya sebagai "bukan jaminan"');
    cek(/^Asumsi cicilannya [^.]*bukan simulasi resmi bank\.$/.test(naskah[1][1]), 'scene 2: cicilan disebut asumsi ilustrasi, bukan simulasi bank');
    /* naskah Bian (tools/narasi) identik dengan source */
    const md = fs.readFileSync(path.join(ROOT, 'tools/narasi/NASKAH-BIAN-PROTEKSI-KREDIT.md'), 'utf8');
    const blok = [...md.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    cek(JSON.stringify(blok) === JSON.stringify(naskah.flat()), 'tools/narasi/NASKAH-BIAN-PROTEKSI-KREDIT.md = naskah source (24 blok)', blok.length);
    /* tiap blok: judul SCENE nn — SEGMEN mm, nama berkas kredit-Snn-mm.mp3, lalu teks; urutan = urutan NARASI */
    const berkas = [...md.matchAll(/### SCENE (\d\d) — SEGMEN (\d\d)\n\nNama file:\n`(kredit-S\d\d-\d\d\.mp3)`\n\nTEKS UNTUK ELEVENLABS:\n```text\n/g)].map((m) => [m[1], m[2], m[3]]);
    const harapID = naskah.flatMap((sc, i) => sc.map((_, j) => ['S' + String(i + 1).padStart(2, '0'), String(j + 1).padStart(2, '0')]));
    cek(berkas.length === 24 && berkas.every((b, k) => b[2] === 'kredit-S' + b[0] + '-' + b[1] + '.mp3' && 'S' + b[0] === harapID[k][0] && b[1] === harapID[k][1]),
      'naskah: 24 blok SCENE/SEGMEN berurutan, nama berkas kredit-SNN-MM.mp3 = ID segmen di kode', berkas.length);
    cek(blok.every((t) => !/kredit-S|SCENE|SEGMEN|\[|\]|\(|\)/.test(t)), 'teks ElevenLabs tanpa nama berkas, nomor scene, atau instruksi dalam kurung');
    cek(!/sk_[a-z0-9]{20,}|xi-api-key|ELEVENLABS_API_KEY\s*=/i.test(md), 'naskah tanpa API key');
    /* durasi */
    const dur = await pg.evaluate(() => window.PSGKreditStory.durasi());
    const total = dur.reduce((x, y) => x + y, 0) / 1000;
    const huruf = naskah.flat().join('').length;
    console.log('         durasi timeline per scene (dtk): ' + dur.map((d) => Math.round(d / 1000)).join(' · ') + ' — total ±' + Math.round(total) + ' dtk; ' + huruf + ' huruf ≈ ' + Math.round(huruf * 0.069) + '–' + Math.round(huruf * 0.077) + ' dtk suara Bian');
    /* target awal 2–3 menit; simulasi 3 skenario (revisi) menambah ±40 dtk */
    cek(huruf * 0.069 >= 120 && huruf * 0.077 <= 240, 'perkiraan narasi Bian ≤ 4 menit (69–77 md/huruf)', huruf);
    /* angka scene 8 = engine CRIS aplikasi */
    const hasil = await pg.evaluate(() => {
      const d = new Date(); d.setFullYear(d.getFullYear() - 40); d.setDate(d.getDate() - 10);
      const r = InsuranceHubEngine.calculate('CRIS', { nama: 'Pak Leo', jk: 'PRIA', tglLahir: d, lamaBayar: 10, lamaLindung: 15, metode: 'Bulanan', up: 2700000000 }, { rates: TARIF_CRIS });
      return { usia: r.usia, premi: r.premiSesuaiMetode, total: r.totalDibayar, upKritis: r.upKritis, bonus: r.bonus, kritis: r.totalKritis, akhir: r.akhirKontrak, meninggal: r.manfaatMeninggal, rop: r.rop };
    });
    cek(hasil.usia === 40 && hasil.premi === 6129000 && hasil.total === 735480000 && hasil.upKritis === 2700000000 && hasil.bonus === 200000000 && hasil.kritis === 2900000000 && hasil.akhir === 882576000 && hasil.meninggal === 882576000 && Math.round(hasil.rop * 100) === 120,
      'engine CRIS (pria 40, UP Rp2,7 M, 10/15, bulanan): premi Rp6.129.000, sakit kritis Rp2,9 M, akhir kontrak = manfaat meninggal Rp882.576.000 (120%)', hasil);
    await bukaMode(pg);
    const s1 = await pg.evaluate(() => [...document.querySelectorAll('.pks-rig text')].map((t) => t.textContent).join(' | '));
    cek(['KREDIT PROPERTI', 'RUMAH', 'APARTEMEN', 'KREDIT KENDARAAN', 'MOBIL', 'CONTOH: RUMAH'].every((x) => s1.includes(x)), 'scene 1: visual macam kredit + contoh rumah', s1);
    await keScene(pg, 8);
    const s8 = await pg.evaluate(() => ({ svg: [...document.querySelectorAll('.pks-rig text')].map((t) => t.textContent).join(' | '), kartu: document.querySelector('.pks-text').innerText }));
    cek(s8.svg.includes('PROTEKSI KREDIT') && s8.svg.includes(rp(hasil.premi) + '/BLN') && s8.svg.includes('Rp2,9 MILIAR') && s8.svg.includes(rp(hasil.akhir)) && s8.svg.includes('AKHIR KONTRAK / MENINGGAL') && s8.svg.includes('UP Rp2,7 M') &&
      s8.svg.includes('BAYAR 10 TH • LINDUNG 15 TH') && s8.svg.includes('66 KONDISI') && s8.svg.includes('ILUSTRASI') && s8.svg.includes('MAKS Rp200 JT'), 'scene 8: Proteksi Kredit, angka visual = engine; label ILUSTRASI', s8.svg);
    cek(s8.kartu.includes(rp(hasil.premi)) && s8.kartu.includes(rp(hasil.akhir)) && /bukan jaminan/i.test(s8.kartu) && /ketentuan polis/.test(s8.kartu) && !/10-25|25 tahun/.test(s8.svg + s8.kartu),
      'scene 8: kartu teks memuat angka engine, "bukan jaminan", "ketentuan polis"; tidak mencampur varian 10-25');
    await keScene(pg, 9);
    const s9 = await pg.evaluate(() => ({ svg: [...document.querySelectorAll('.pks-rig text')].map((t) => t.textContent).join(' | '), kartu: document.querySelector('.pks-text').innerText }));
    const sisa = 15000000 * 12 * 10, lebih = hasil.kritis - sisa;
    const jt = (n) => (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    cek(sisa === 1800000000 && lebih === 1100000000 && s9.svg.includes('KPR') && s9.svg.includes('PROTEKSI KREDIT') &&
      s9.svg.includes('LANCAR SAMPAI KREDIT SELESAI') && s9.svg.includes('MENINGGAL DUNIA') && s9.svg.includes('SAKIT KRITIS DI TAHUN KE-5') &&
      (s9.svg.match(new RegExp(rp(hasil.akhir).replace(/\./g, '\\.'), 'g')) || []).length === 2 && hasil.meninggal === hasil.akhir &&
      s9.svg.includes('Rp15 jt × 12 × 10 th') && s9.svg.includes('= Rp' + jt(sisa) + ' MILIAR') && s9.svg.includes('Cair Rp' + jt(hasil.kritis) + ' M') && s9.svg.includes('Sisa ±Rp' + jt(lebih) + ' M'),
      'scene 9: 3 skenario, kiri KPR / kanan Proteksi Kredit; angka = engine & Rp15 jt × 12 × 10 = Rp1,8 M; sisa Rp1,1 M', s9.svg);
    cek(/asuransi jiwa kredit yang aktif/.test(s9.kartu) && /bukan sisa pokok resmi bank/.test(s9.kartu) && /Bukan jaminan/.test(s9.kartu), 'scene 9: syarat jiwa kredit & catatan sisa angsuran tampil di kartu teks', s9.kartu);
    cek(!/Cristal Prime|CRISTAL/i.test(s8.svg + s8.kartu + s9.svg + s9.kartu), 'scene 8–9: tanpa nama produk');
    /* seluruh teks yang terlihat di 10 scene: tanpa klaim terlarang */
    let terlihat = '';
    for (let n = 1; n <= 10; n++) { await keScene(pg, n); terlihat += ' ' + await pg.evaluate(() => [...document.querySelectorAll('.pks-rig text')].map((t) => t.textContent).join(' ') + ' ' + document.querySelector('.pks-text').innerText); }
    cek(!/Cristal Prime/i.test(terlihat) && !/seluruh sisa|menanggung seluruh|dijamin|otomatis/i.test(terlihat), 'teks layar: tanpa nama produk; tidak ada klaim menanggung seluruh sisa / dijamin / otomatis');
    cek(/tidak semua kredit/i.test(terlihat) && /ketentuan polis/i.test(terlihat) && /bukan simulasi (resmi )?bank/i.test(terlihat), 'teks layar: syarat jiwa kredit & cicilan sebagai asumsi tampil');
    const s10 = await pg.evaluate(() => [...document.querySelectorAll('.pks-rig text')].map((t) => t.textContent).join(' '));
    cek(s10.includes('Jangan hanya merencanakan cara memiliki aset.') && s10.includes('Rencanakan juga perlindungan finansialnya.') && s10.includes('Mari hitung kebutuhan Proteksi Kredit Anda bersama kami'),
      'scene 10: kalimat ajakan tampil di visual', s10);
    await ctx.close();
  }

  /* ---------- C. narasi rekaman (voice Bian) ---------- */
  console.log('[C] Narasi rekaman (MP3 voice Bian)');
  if (ikut('C')) {
    const ID = (n, j) => 'S' + String(n).padStart(2, '0') + '-' + String(j).padStart(2, '0');
    const wM = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'src/sales-idea-kredit-audio.js'), 'utf8'))(wM);
    const M = wM.PSGKreditAudio || { segmen: {} };
    /* C1. manifest, berkas, decode, timing */
    let naskah = [];
    {
      const { ctx, pg } = await buka();
      naskah = await pg.evaluate(() => window.PSGKreditStory.naskah());
      const kunci = Object.keys(M.segmen), harapKunci = naskah.flatMap((sc, i) => sc.map((_, j) => ID(i + 1, j + 1)));
      cek(kunci.length === 24 && JSON.stringify(kunci) === JSON.stringify(harapKunci), 'manifest: 24 segmen, kunci & urutan = naskah (S01-01 … S10-02)', kunci);
      cek(kunci.every((k) => M.segmen[k].length === 1 && M.segmen[k][0].audio === 'kredit-' + k + '.mp3' && M.segmen[k][0].start === 0 && M.segmen[k][0].end > 1),
        'satu klip per segmen: kredit-SNN-MM.mp3, start 0, diputar utuh');
      const dir = path.join(ROOT, 'assets/narasi/kredit'), isi = fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
      cek(M.folder === 'assets/narasi/kredit/' && JSON.stringify(isi) === JSON.stringify(kunci.map((k) => 'kredit-' + k + '.mp3').sort()),
        'assets/narasi/kredit/ berisi tepat 24 MP3 yang dirujuk manifest', isi);
      const dec = await pg.evaluate(async (daftar) => {
        const ac = new OfflineAudioContext(1, 1, 44100), out = [];
        for (const [k, f, end] of daftar) {
          try {
            const a = await ac.decodeAudioData(await (await fetch('assets/narasi/kredit/' + f)).arrayBuffer()), d = a.getChannelData(0);
            let s = 0, n = 0; for (let i = 0; i < d.length; i += 7) { s += d[i] * d[i]; n++; }
            out.push({ k, selisih: Math.round(Math.abs(a.duration - end) * 1000), rms: Math.round(Math.sqrt(s / n) * 1000) / 1000 });
          } catch (e) { out.push({ k, galat: String(e) }); }
        }
        return out;
      }, kunci.map((k) => [k, M.segmen[k][0].audio, M.segmen[k][0].end]));
      const buruk = dec.filter((x) => x.galat || x.selisih > 50 || !(x.rms > 0.01));
      cek(dec.length === 24 && !buruk.length, '24 berkas dimuat & di-decode Chromium; end manifest = durasi berkas (±50 md); berisi suara (RMS > 0,01)', buruk.slice(0, 4));
      const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      cek(html.indexOf('src/sales-idea-kredit-audio.js') > 0 && html.indexOf('src/sales-idea-kredit-audio.js') < html.indexOf('src/sales-idea-kredit.js'), 'manifest dimuat sebelum modul cerita');
      const tim = await pg.evaluate((seg) => window.PSGKreditStory.durasi().map((akhir, i) => {
        const k = window.PSGKreditStory.ketukan(i + 1);
        return { akhir, D: k.D, R: k.D.map((_, j) => { const c = seg['S' + String(i + 1).padStart(2, '0') + '-' + String(j + 1).padStart(2, '0')][0]; return Math.round((c.end - c.start) * 1000); }) };
      }), M.segmen);
      const kurang = []; tim.forEach((s, i) => s.D.forEach((d, j) => { if (d < s.R[j] + 700) kurang.push(ID(i + 1, j + 1)); }));
      const total = tim.reduce((a, s) => a + s.akhir, 0) / 1000;
      cek(!kurang.length && total >= 200 && total <= 240, 'ketukan mengikuti rekaman: tiap ketukan ≥ rekaman + 0,7 dtk; total timeline ' + total.toFixed(1) + ' dtk (3½–4 menit)', kurang);
      await ctx.close();
    }
    /* C2. pemutaran penuh waktu nyata (1×): klip berurutan, utuh, tanpa tumpang tindih, sinkron dengan ketukan */
    {
      const { ctx, pg } = await buka();
      await bukaMode(pg); await klik(pg, '#siPlay');
      const buruk = [], tumpang = [], tertinggal = [], lewatScene = [], lambat = [];
      for (let n = 1; n <= 10; n++) {
        if (n > 1) await klik(pg, '#siNext');
        const jml = naskah[n - 1].length;
        const ok = await tunggu(pg, (a) => window.__rek.klip.filter((x) => x.adegan === a[0]).length >= a[1] && !window.PSGNarasi.rekaman().main &&
          document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 120000, [n, jml]);
        await pg.waitForTimeout(150);
        const dengar = await pg.evaluate((a) => window.__rek.klip.filter((x) => x.adegan === a).map((x) => Object.assign({}, x)), n);
        const urut = dengar.map((x) => x.segmen + ':' + x.berkas).join(' '), harap = naskah[n - 1].map((_, j) => (j + 1) + ':' + M.segmen[ID(n, j + 1)][0].audio).join(' ');
        if (!ok || urut !== harap) { buruk.push('scene ' + n + ' urutan "' + urut + '" ≠ "' + harap + '"'); continue; }
        dengar.forEach((x) => {
          const k = M.segmen[ID(n, x.segmen)][0], henti = x.berhenti != null ? x.berhenti : x.akhir;
          if (x.mulai == null || Math.abs(x.mulai - k.start) > 0.02) buruk.push(ID(n, x.segmen) + ' mulai ' + x.mulai);
          if (x.akhir > k.end + 0.12 || henti > k.end + 0.12) buruk.push(ID(n, x.segmen) + ' melewati akhir ' + k.end);
          if (henti < k.end - 0.3) buruk.push(ID(n, x.segmen) + ' berhenti terlalu awal ' + henti + ' < ' + k.end);
        });
        dengar.forEach((x, i) => { const y = dengar[i - 1]; if (i && (y.tStop == null || x.tPlay < y.tStop)) tumpang.push(ID(n, x.segmen)); });
        const g = await pg.evaluate((a) => {
          const node = document.querySelector('.pks[data-pks="' + a + '"]');
          const sel = window.__rek.status.find((x) => x.s === 'selesai' && x.t > window.__rek.klip.find((k) => k.adegan === a).tPlay);
          return { tSelesai: sel ? sel.t : null, seg: window.__rek.klip.filter((x) => x.adegan === a).map((x) => {
            const e = window.__rek.ketuk.find((k) => k.el === node && k.k >= x.segmen);
            return { segmen: x.segmen, tKetuk: e ? e.t : null, tPlay: x.tPlay, tStop: x.tStop };
          }) };
        }, n);
        g.seg.forEach((x, i) => {
          if (x.tKetuk == null || x.tPlay == null || x.tPlay < x.tKetuk - 5) { buruk.push(ID(n, x.segmen) + ' mulai sebelum ketukannya'); return; }
          lambat.push((x.tPlay - x.tKetuk) / 1000);
          const y = g.seg[i - 1];
          if (y && y.tStop != null && y.tStop - x.tKetuk > 20) tertinggal.push(ID(n, y.segmen) + ' masih berbunyi ' + ((y.tStop - x.tKetuk) / 1000).toFixed(2) + ' dtk sesudah ketukan ' + x.segmen);
        });
        const z = g.seg[g.seg.length - 1];
        if (z.tStop == null || g.tSelesai == null || z.tStop - g.tSelesai > 20) lewatScene.push('scene ' + n);
      }
      const x = await pg.evaluate(() => ({ nAudio: window.__rek.nAudio, tts: window.__tts.log.filter((u) => u.t === 'mulai').length }));
      cek(!buruk.length, '10 scene, 24 klip diputar berurutan sesuai manifest, dari awal sampai habis, tanpa melewati batas (waktu nyata)', buruk.slice(0, 6));
      cek(!tumpang.length, 'tanpa tumpang tindih: klip berikut mulai sesudah klip sebelumnya berhenti', tumpang);
      const u = lambat.slice().sort((a, b) => a - b);
      cek(lambat.length === 24 && !tertinggal.length, 'sinkron: tiap segmen mulai pada ketukan visualnya (jeda ketukan→audio median ' + (u[12] || 0).toFixed(3) + ' · maks ' + (u[u.length - 1] || 0).toFixed(3) + ' dtk), audio sebelumnya sudah selesai saat ketukan berikut mulai', tertinggal);
      cek(!lewatScene.length, 'narasi tiap scene selesai sebelum timeline scene selesai', lewatScene);
      cek(x.nAudio === 1 && x.tts === 0, 'satu elemen audio; suara browser tidak dipakai bila rekaman tersedia', x);
      await ctx.close();
    }
    /* C3. kontrol: PAUSE / RESUME / NEXT di tengah narasi / CLOSE */
    {
      const { ctx, pg } = await buka();
      /* scene 8 diputar dari awal lewat NEXT dari scene 7 (REPLAY selalu kembali ke scene 1) */
      await bukaMode(pg); await keScene(pg, 7); await klik(pg, '#siNext');
      await tunggu(pg, () => { const r = window.PSGNarasi.rekaman(); return r.main && r.adegan === 8 && window.__rek.el.currentTime > 1.5; }, 15000);
      await klik(pg, '#siPlay'); await pg.waitForTimeout(300);
      const sumber = () => pg.evaluate(() => ({ status: document.getElementById('layarSalesIdea').getAttribute('data-sip-status'), main: window.PSGNarasi.rekaman().main,
        jeda: window.__rek.el.paused, pos: window.__rek.el.currentTime, src: (window.__rek.el.currentSrc || '').split('/').pop() }));
      const p = await sumber();
      /* narator memutar rekaman dari blob yang sudah dimuat: sumber dibandingkan antara jeda & lanjut */
      cek(p.status === 'jeda' && p.jeda && !p.main && !!p.src, 'PAUSE: audio berhenti', p);
      await klik(pg, '#siPlay'); await pg.waitForTimeout(700);
      const r = await sumber();
      cek(r.main && r.src === p.src && r.pos > p.pos && r.pos < p.pos + 1.5, 'RESUME: audio lanjut dari posisi jeda (tanpa ulang)', { p, r });
      const n0 = await pg.evaluate(() => window.__rek.klip.length);
      await klik(pg, '#siNext');
      await tunggu(pg, (a) => window.__rek.klip.length > a && window.__rek.klip[window.__rek.klip.length - 1].adegan === 9, 10000, n0);
      const nx = await pg.evaluate((a) => { const k = window.__rek.klip; const lama = k[a - 1], baru = k.find((x, i) => i >= a && x.adegan === 9); return { lamaStop: lama.tStop, baruPlay: baru && baru.tPlay, baru: baru && baru.berkas }; }, n0);
      cek(nx.baru === 'kredit-S09-01.mp3' && nx.lamaStop != null && nx.baruPlay >= nx.lamaStop, 'NEXT di tengah narasi: audio scene 8 berhenti sebelum S09-01 mulai', nx);
      await klik(pg, '#layarSalesIdea .si-close'); await pg.waitForTimeout(800);
      const t = await pg.evaluate(() => ({ main: window.PSGNarasi.rekaman().main, jeda: window.__rek.el.paused, n: window.__rek.klip.length }));
      await pg.waitForTimeout(1500);
      const t2 = await pg.evaluate(() => window.__rek.klip.length);
      cek(!t.main && t.jeda && t2 === t.n, 'CLOSE: audio berhenti dan tidak ada klip baru', { t, t2 });
      await ctx.close();
    }
  }

  /* ---------- D. kontrol pemutar ---------- */
  console.log('[D] Kontrol pemutar');
  for (const mob of (ikut('D') ? [false, true] : [])) {
    const lbl = mob ? 'HP' : 'desktop';
    const { ctx, pg } = await buka(mob ? { ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } } : {});
    await bukaMode(pg);
    const o = await st(pg); cek(o.status === 'siap' && o.run === 0, lbl + ': OPEN diam (tanpa gerak)', o);
    await klik(pg, '#siPlay'); await pg.waitForTimeout(300); const b1 = await st(pg); await pg.waitForTimeout(300); const b2 = await st(pg);
    cek(b1.status === 'berputar' && b2.t > b1.t, lbl + ': PLAY memutar animasi', [b1, b2]);
    await klik(pg, '#siPlay'); await pg.waitForTimeout(80); const c1 = await st(pg); await pg.waitForTimeout(400); const c2 = await st(pg);
    cek(c1.status === 'jeda' && c1.run === 0 && c2.t === c1.t, lbl + ': PAUSE membekukan', [c1, c2]);
    await klik(pg, '#siPlay'); await pg.waitForTimeout(250); const d = await st(pg);
    cek(d.status === 'berputar' && d.t > c2.t && d.t < c2.t + 1500, lbl + ': RESUME lanjut dari posisi jeda (tanpa ulang)', [c2.t, d.t]);
    await klik(pg, '#siNext'); await pg.waitForTimeout(250); const e = await st(pg);
    cek(e.scene === 2 && e.status === 'berputar' && /Langkah 2 \//.test(e.count), lbl + ': NEXT → scene 2 langsung berputar', e);
    await klik(pg, '#siPrev'); await pg.waitForTimeout(250); const f = await st(pg);
    cek(f.scene === 1 && f.status === 'berputar', lbl + ': BACK → scene 1 langsung berputar', f);
    await klik(pg, '#siNext'); await klik(pg, '#siNext'); await pg.waitForTimeout(200); await klik(pg, '#siReplay'); await pg.waitForTimeout(150); const g = await st(pg);
    cek(g.scene === 1 && g.status === 'berputar' && g.t < 800, lbl + ': REPLAY → cerita dari scene 1 (perilaku pemutar bersama)', g);
    if (!mob) {
      await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(200); cek((await st(pg)).scene === 2, 'keyboard →: next');
      await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(200); cek((await st(pg)).scene === 1, 'keyboard ←: back');
      await pg.keyboard.press(' '); await pg.waitForTimeout(150); cek((await st(pg)).status === 'jeda', 'keyboard spasi: pause');
      await pg.keyboard.press(' '); await pg.waitForTimeout(150); cek((await st(pg)).status === 'berputar', 'keyboard spasi: resume');
    }
    await klik(pg, '#layarSalesIdea .si-close'); await pg.waitForTimeout(300);
    const z = await pg.evaluate(() => ({ aktif: document.getElementById('layarSalesIdea').classList.contains('aktif'), bicara: window.speechSynthesis.speaking,
      jalan: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && document.getElementById('salesIdeaContent').contains(a.effect.target)).length }));
    cek(!z.aktif && z.jalan === 0 && !z.bicara, lbl + ': CLOSE bersih (animasi & suara berhenti)', z);
    await ctx.close();
  }

  /* ---------- E. kartu akhir ---------- */
  console.log('[E] Kartu akhir & CTA');
  if (ikut('E')) {
    const { ctx, pg } = await buka({ cepat: 16 });
    const profil = await pg.evaluate(() => ({ list: localStorage.getItem('insuranceHub.customerProfiles.v1'), aktif: localStorage.getItem('insuranceHub.customerProfile.active.v1') }));
    await bukaMode(pg); await keScene(pg, 10);
    await pg.evaluate(() => { if (document.getElementById('layarSalesIdea').getAttribute('data-sip-status') !== 'berputar') document.getElementById('siPlay').click(); });
    const kartu = await tunggu(pg, () => [...document.querySelectorAll('#layarSalesIdea button')].some((x) => /Mari Hitung Kebutuhan Anda/.test(x.textContent) && x.getBoundingClientRect().height > 0), 120000);
    cek(kartu, 'kartu akhir "Mari Hitung Kebutuhan Anda" muncul sesudah scene 10');
    const lbl = await label(pg);
    cek(lbl.hitung === 'Mari Hitung Kebutuhan Anda →' && lbl.lain === 'Topik Lain' && lbl.nama === 'Mari Hitung Kebutuhan Anda' && !lbl.bawaan,
      'label khusus Proteksi Kredit: "Mari Hitung Kebutuhan Anda" & "Topik Lain" (tanpa label bawaan)', lbl);
    await pg.evaluate(() => [...document.querySelectorAll('#layarSalesIdea button')].find((x) => /Mari Hitung Kebutuhan Anda/.test(x.textContent)).click());
    await pg.waitForTimeout(400);
    const k = await pg.evaluate(() => ({ layar: (document.querySelector('.layar.aktif') || {}).id, konteks: window.InsuranceHubCustomerProfile.konteks() }));
    cek(k.layar === 'layarProfile' && k.konteks && k.konteks.topic === 'proteksi_kredit' && k.konteks.target === 'CRIS', 'Mari Hitung Kebutuhan Anda → Profil dengan target Cristal Prime (CRIS)', k);
    const profil2 = await pg.evaluate(() => ({ list: localStorage.getItem('insuranceHub.customerProfiles.v1'), aktif: localStorage.getItem('insuranceHub.customerProfile.active.v1') }));
    cek(JSON.stringify(profil) === JSON.stringify(profil2), 'profil tidak dipilih/diubah/dibuat otomatis');
    /* profil baru: isi data utama → Simpan → kalkulator Cristal Prime terisi */
    await pg.evaluate(() => { const b = document.getElementById('cpBuatBaru'); if (b) b.click(); });
    await pg.fill('#cpNama', 'Pak Leo Uji'); await pg.fill('#cpTglManual', '01/06/1986'); await pg.press('#cpTglManual', 'Tab');
    await pg.evaluate(() => document.getElementById('cpSimpan').click()); await pg.waitForTimeout(500);
    const baru = await pg.evaluate(() => ({ layar: (document.querySelector('.layar.aktif') || {}).id, nama: document.getElementById('cNama').value, tgl: document.getElementById('cTgl').value }));
    cek(baru.layar === 'layarCRIS' && baru.nama === 'Pak Leo Uji' && baru.tgl === '1986-06-01', 'profil baru → Simpan → kalkulator Cristal Prime dengan nama & tanggal lahir terisi', baru);
    /* profil yang sudah ada: Mari Hitung Kebutuhan Anda lagi → Gunakan → kalkulator Cristal Prime */
    await bukaMode(pg); await keScene(pg, 10);
    await pg.evaluate(() => { if (document.getElementById('layarSalesIdea').getAttribute('data-sip-status') !== 'berputar') document.getElementById('siPlay').click(); });
    await tunggu(pg, () => [...document.querySelectorAll('#layarSalesIdea button')].some((x) => /Mari Hitung Kebutuhan Anda/.test(x.textContent) && x.getBoundingClientRect().height > 0), 120000);
    await pg.evaluate(() => [...document.querySelectorAll('#layarSalesIdea button')].find((x) => /Mari Hitung Kebutuhan Anda/.test(x.textContent)).click());
    await pg.waitForTimeout(400);
    const ada = await pg.evaluate(() => document.querySelectorAll('[data-cp-use]').length);
    await pg.evaluate(() => document.querySelector('[data-cp-use]').click()); await pg.waitForTimeout(500);
    const pakai = await pg.evaluate(() => ({ layar: (document.querySelector('.layar.aktif') || {}).id, nama: document.getElementById('cNama').value }));
    cek(ada >= 1 && pakai.layar === 'layarCRIS' && pakai.nama === 'Pak Leo Uji', 'profil yang sudah ada → Gunakan → kalkulator Cristal Prime terisi', { ada, pakai });
    await ctx.close();
    const b = await buka({ cepat: 16 });
    await bukaMode(b.pg); await keScene(b.pg, 10);
    await b.pg.evaluate(() => { if (document.getElementById('layarSalesIdea').getAttribute('data-sip-status') !== 'berputar') document.getElementById('siPlay').click(); });
    await tunggu(b.pg, () => [...document.querySelectorAll('#layarSalesIdea button')].some((x) => x.textContent === 'Topik Lain' && x.getBoundingClientRect().height > 0), 120000);
    await b.pg.evaluate(() => [...document.querySelectorAll('#layarSalesIdea button')].find((x) => x.textContent === 'Topik Lain').click());
    await b.pg.waitForTimeout(350);
    const hub = await b.pg.evaluate(() => ({ mode: window.SalesIdea10Jari.keadaan().mode, layar: (document.querySelector('.layar.aktif') || {}).id,
      kartu: [...document.querySelectorAll('[data-si-choice]')].filter((x) => x.getBoundingClientRect().height > 0).length }));
    cek(hub.mode === 'hub' && hub.layar === 'layarSalesIdea' && hub.kartu === 8, 'Topik Lain → hub Sales Idea dengan 8 kartu (bukan dashboard)', hub);
    /* kartu akhir dipakai bersama: Sales Idea lain sesudah Proteksi Kredit kembali ke label bawaan */
    await bukaMode(b.pg, 'asset');
    for (let i = 0; i < 12; i++) { const k2 = await b.pg.evaluate(() => window.SalesIdea10Jari.keadaan()); if (k2.indeks >= k2.total - 1) break; await b.pg.keyboard.press('ArrowRight'); await b.pg.waitForTimeout(150); }
    await b.pg.evaluate(() => { if (document.getElementById('layarSalesIdea').getAttribute('data-sip-status') !== 'berputar') document.getElementById('siPlay').click(); });
    const lain = await tunggu(b.pg, () => [...document.querySelectorAll('#layarSalesIdea .sil-kartu button')].some((x) => x.getBoundingClientRect().height > 0), 120000);
    const lblA = await label(b.pg);
    cek(lain && lblA.mode === 'asset' && lblA.hitung === 'Mari Kita Hitung →' && lblA.lain === 'Bahas Topik Lain',
      'Sales Idea lain (Asset) sesudah Proteksi Kredit: label bawaan "Mari Kita Hitung" / "Bahas Topik Lain"', lblA);
    await b.ctx.close();
  }

  /* ---------- F. gerak dikurangi ---------- */
  console.log('[F] Gerak dikurangi');
  if (ikut('F')) {
    const { ctx, pg } = await buka({ ctx: { reducedMotion: 'reduce' } });
    await bukaMode(pg);
    let ok = true;
    for (let n = 1; n <= 10; n++) { await keScene(pg, n); await pg.waitForTimeout(120); const s = await st(pg); if (s.scene !== n || s.amb !== 0) ok = false; }
    cek(ok, 'gerak dikurangi: 10 scene tampil tanpa animasi ambient');
    await ctx.close();
  }

  /* ---------- G. responsif ---------- */
  console.log('[G] Responsif');
  if (ikut('G')) {
    const UKURAN = ['320x568', '360x740', '390x844', '430x932', '768x1024', '1024x768', '1366x768', '1920x1080', '844x390', '667x375'];
    let masalah = 0, kombinasi = 0, minPx = 99;
    for (const u of UKURAN) for (const tema of ['original', 'dark']) {
      const [w, h] = u.split('x').map(Number);
      const { ctx, pg } = await buka({ tema, ctx: { viewport: { width: w, height: h } } });
      await bukaMode(pg);
      for (let n = 1; n <= 10; n++) {
        await keScene(pg, n);
        const r = await pg.evaluate(`(${periksa.toString()})()`);
        kombinasi++; minPx = Math.min(minPx, r.minPx);
        if (r.masalah.length || r.minPx < 9) { masalah++; console.log('  GAGAL  ' + u + ' ' + tema + ' S' + r.n + ': ' + r.masalah.concat(r.minPx < 9 ? ['teks ' + r.minPx + ' px'] : []).join(' | ')); }
      }
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (ov > 0) { masalah++; console.log('  GAGAL  ' + u + ' ' + tema + ': overflow horizontal ' + ov + ' px'); }
      await ctx.close();
    }
    console.log('         kombinasi scene×ukuran×tema: ' + kombinasi + ' | teks visual terkecil: ' + minPx + ' px');
    cek(masalah === 0, 'responsif: tanpa overflow, teks di dalam area & kotak, label/pil tidak bertumpuk, tokoh utuh, teks ≥ 9 px');
  }

  /* ---------- H. hemat & bersih ---------- */
  console.log('[H] Elemen, berkas, storage');
  if (ikut('H')) {
    for (const tema of ['original', 'dark']) {
      const { ctx, pg } = await buka({ tema });
      await bukaMode(pg);
      const jumlah = [];
      for (let n = 1; n <= 10; n++) { await keScene(pg, n); await pg.waitForTimeout(120); jumlah.push(await pg.evaluate(() => document.querySelectorAll('.pks-rig *').length)); }
      if (tema === 'original') { console.log('         elemen SVG per scene: ' + jumlah.join(' · ')); cek(Math.max(...jumlah) <= 800, 'elemen SVG per scene ≤ 800', jumlah); }
      const logo = await pg.evaluate(async () => {
        const img = [...document.querySelectorAll('.pks-logo')].find((i) => getComputedStyle(i).display !== 'none');
        const href = img && img.getAttribute('href');
        const r = href ? await fetch(href) : null;
        return { href, status: r && r.status, tipe: r && r.headers.get('content-type') };
      });
      const harap = tema === 'dark' ? 'assets/logo-psg-terang.png' : 'assets/logo-psg.png';
      cek(logo.href === harap && logo.status === 200 && /png/.test(logo.tipe), 'scene 10 (' + tema + '): logo resmi ' + harap + ' termuat', logo);
      await klik(pg, '#layarSalesIdea .si-close'); await pg.waitForTimeout(250);
      if (tema === 'original') {
        const kunci = await pg.evaluate(() => Object.keys(localStorage).sort());
        const baru = kunci.filter((k) => !kunciAwal.includes(k) && k !== 'insuranceHub.theme.v3');
        cek(baru.length === 0, 'tidak ada storage key baru', baru);
      }
      await ctx.close();
    }
    cek(gagalMuat.length === 0, 'tanpa respons 4xx/5xx (gambar/skrip/gaya)', gagalMuat.slice(0, 5));
  }

  /* ---------- I. PWA ---------- */
  console.log('[I] PWA / service worker');
  if (ikut('I')) {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const ref = (re) => (html.match(re) || [])[1];
    const vJs = ref(/src="src\/sales-idea-kredit\.js\?v=(\d+)"/), vCss = ref(/href="src\/sales-idea-kredit\.css\?v=(\d+)"/), vLanjut = ref(/src="src\/sales-idea-lanjut\.js\?v=(\d+)"/);
    cek(!!vJs && !!vCss && sw.includes("'./src/sales-idea-kredit.js?v=" + vJs + "'") && sw.includes("'./src/sales-idea-kredit.css?v=" + vCss + "'") && sw.includes("'./src/sales-idea-lanjut.js?v=" + vLanjut + "'"),
      'precache sw.js memuat kredit.js/.css & lanjut.js dengan ?v= yang sama dengan index.html', { vJs, vCss, vLanjut });
    const vA = ref(/src="src\/sales-idea-kredit-audio\.js\?v=(\d+)"/);
    const mp3 = fs.existsSync(path.join(ROOT, 'assets/narasi/kredit')) ? fs.readdirSync(path.join(ROOT, 'assets/narasi/kredit')) : [];
    cek(!!vA && sw.includes("'./src/sales-idea-kredit-audio.js?v=" + vA + "'") && mp3.length === 24 && mp3.every((f) => sw.includes("'./assets/narasi/kredit/" + f + "'")),
      'precache sw.js memuat manifest audio (?v= sama dengan index.html) + 24 MP3 Proteksi Kredit', { vA, mp3: mp3.length });
    cek(fs.existsSync(path.join(ROOT, 'src/sales-idea-kredit.js')) && fs.existsSync(path.join(ROOT, 'src/sales-idea-kredit.css')), 'berkas modul ada');
    cek(html.indexOf('src/sales-idea-kredit.js') > html.indexOf('src/sales-idea-singapura.js') && html.indexOf('src/sales-idea-kredit.js') > html.indexOf('src/theme-switcher.js'), 'skrip baru dimuat sesudah skrip baseline');
    const { ctx, pg } = await buka({ ctx: { serviceWorkers: 'allow' } });
    const siap = await pg.evaluate(async () => { if (!navigator.serviceWorker) return false; await navigator.serviceWorker.ready; return true; });
    await pg.waitForTimeout(1500);
    const tersimpan = siap && await pg.evaluate(async () => { const k = await caches.keys(); for (const n of k) { const c = await caches.open(n); if (await c.match('./src/sales-idea-kredit.js?v=118') || (await c.keys()).some((r) => /sales-idea-kredit\.js/.test(r.url))) return true; } return false; });
    cek(siap && tersimpan, 'service worker aktif & modul Proteksi Kredit ada di cache');
    await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(800);
    await bukaMode(pg); await keScene(pg, 10);
    const off = await pg.evaluate(() => ({ scene: +(document.querySelector('.pks') || { dataset: {} }).dataset.pks || 0, svg: document.querySelectorAll('.pks-rig text').length }));
    cek(off.scene === 10 && off.svg > 3, 'offline: Proteksi Kredit tetap terbuka sampai scene 10', off);
    await klik(pg, '#siReplay');
    const bunyi = await tunggu(pg, () => { const r = window.PSGNarasi.rekaman(); return r.main && r.berkas === 'kredit-S01-01.mp3' && r.waktu > 0.2; }, 15000);
    cek(bunyi, 'offline: rekaman Bian (S01-01) tetap diputar dari cache service worker');
    await ctx.setOffline(false); await ctx.close();
  }

  /* ---------- J. Sales Idea lain ---------- */
  console.log('[J] Sales Idea lain tetap terbuka');
  if (ikut('J')) {
    const { ctx, pg } = await buka();
    for (const m of LAIN) {
      await pg.evaluate(() => { const s = window.SalesIdea10Jari; if (s) s.setMode('hub'); });
      await pg.waitForTimeout(150);
      await pg.evaluate((mm) => document.querySelector('[data-si-choice="' + mm + '"]').click(), m); await pg.waitForTimeout(400);
      const k = await pg.evaluate(() => ({ k: window.SalesIdea10Jari.keadaan(), status: document.getElementById('layarSalesIdea').getAttribute('data-sip-status'), isi: document.getElementById('salesIdeaContent').children.length }));
      cek(k.k.mode === m && k.k.total > 0 && k.status === 'siap' && k.isi > 0, 'Sales Idea "' + m + '" terbuka (scene 1 siap)', k);
    }
    await ctx.close();
    /* rekaman tidak bocor: sesudah Proteksi Kredit berbunyi, Singapura memutar rekamannya sendiri */
    const b = await buka();
    await bukaMode(b.pg); await klik(b.pg, '#siPlay');
    await tunggu(b.pg, () => window.PSGNarasi.rekaman().main, 10000);
    await b.pg.evaluate(() => window.SalesIdea10Jari.setMode('hub')); await b.pg.waitForTimeout(300);
    await bukaMode(b.pg, 'singapura'); await klik(b.pg, '#siPlay');
    await tunggu(b.pg, () => window.PSGNarasi.rekaman().main, 10000);
    await b.pg.waitForTimeout(1500);
    const iso = await b.pg.evaluate(() => { const k = window.__rek.klip; const i = k.findIndex((x) => !/^kredit-/.test(x.berkas)); return { kredit: k.filter((x) => /^kredit-/.test(x.berkas)).map((x) => x.berkas), sesudah: i < 0 ? [] : k.slice(i).map((x) => x.berkas) }; });
    cek(iso.kredit[0] === 'kredit-S01-01.mp3' && iso.sesudah.length > 0 && iso.sesudah.every((f) => !/^kredit-/.test(f)), 'rekaman tidak bocor: sesudah Proteksi Kredit, Singapura hanya memutar rekamannya sendiri', iso);
    await b.ctx.close();
  }

  /* ---------- K. unduh video (satu tombol, berkas menurut perangkat) ---------- */
  console.log('[K] Unduh video (gerbang tonton utuh)');
  if (ikut('K')) {
    const PS = { terang: 'assets/video/kredit-terang-portrait.mp4', gelap: 'assets/video/kredit-gelap-portrait.mp4' };
    const LS = { terang: 'assets/video/kredit-terang.mp4', gelap: 'assets/video/kredit-gelap.mp4' };
    const uv = (pg) => pg.evaluate(() => window.PSGUnduhVideo.keadaan());
    const crypto = require('crypto');
    const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    /* K1. keempat MP4 ada di repo, videoSiap true; lompat ke scene 10 → tidak sah */
    {
      const ukuran = [PS.terang, PS.gelap, LS.terang, LS.gelap].map((f) => fs.existsSync(path.join(ROOT, f)) ? fs.statSync(path.join(ROOT, f)).size : 0);
      const { ctx, pg } = await buka({ cepat: 16 });
      await bukaMode(pg); await pg.waitForTimeout(400);
      const a = await uv(pg);
      cek(a.cerita === 'kredit' && a.videoSiap === true && !a.tombol && ukuran.every((s) => s > 1e6),
        'keempat MP4 Proteksi Kredit ada di repo (> 1 MB), videoSiap true; saat dibuka tombol unduh belum tampil', { a, ukuran });
      await keScene(pg, 10);
      await pg.evaluate(() => { if (document.getElementById('layarSalesIdea').getAttribute('data-sip-status') !== 'berputar') document.getElementById('siPlay').click(); });
      await tunggu(pg, () => document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 60000);
      const b = await uv(pg);
      cek(b.status === 'tidak-sah' && !b.tombol, 'lompat ke scene terakhir → putaran tidak sah, tombol tidak tampil', b);
      await ctx.close();
    }
    /* K2. NEXT sebelum scene 1 selesai → tidak sah */
    {
      const { ctx, pg } = await buka();
      await bukaMode(pg); await pg.waitForTimeout(300);
      await klik(pg, '#siPlay'); await pg.waitForTimeout(1500); await klik(pg, '#siNext'); await pg.waitForTimeout(400);
      const a = await uv(pg);
      cek(a.videoSiap === true && a.status === 'tidak-sah' && !a.tombol, 'NEXT sebelum scene 1 selesai → tidak sah, tombol tetap tersembunyi', a);
      await ctx.close();
    }
    /* K3. HP (390×844, sentuh): tonton utuh waktu nyata dari scene 1 (Next hanya sesudah scene selesai),
       lalu satu tombol → video portrait sesuai tema; tombol tidak tertutup kartu akhir */
    {
      const { ctx, pg } = await buka({ ctx: { acceptDownloads: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
      await bukaMode(pg); await pg.waitForTimeout(300);
      let ok = true, sebelumAkhir = null;
      for (let n = 1; n <= 10; n++) {
        if (n === 1) await klik(pg, '#siPlay'); else await klik(pg, '#siNext');
        const selesai = await tunggu(pg, (m) => +document.querySelector('.pks').dataset.pks === m && document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 120000, n);
        if (!selesai) { ok = false; break; }
        if (n === 9) sebelumAkhir = await uv(pg);
      }
      await pg.waitForTimeout(800);
      const akhir = await uv(pg);
      cek(ok && sebelumAkhir && !sebelumAkhir.tombol && sebelumAkhir.status === 'berjalan', 'sebelum scene 10 selesai: tombol unduh belum tampil', sebelumAkhir);
      cek(ok && akhir.status === 'selesai' && akhir.tombol && akhir.perangkat === 'smartphone', 'tonton utuh tanpa skip di HP → satu tombol unduh tampil (kelas smartphone)', akhir);
      const link = () => pg.evaluate(() => {
        const a = [...document.querySelectorAll('#layarSalesIdea .sip-unduh')].filter((x) => !x.hidden);
        return a.map((x) => { const r = x.getBoundingClientRect(), atas = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { teks: x.textContent, href: x.getAttribute('href'), nama: x.getAttribute('download'), terlihat: r.width > 0 && r.bottom <= innerHeight, tidakTertutup: !!atas && (atas === x || x.contains(atas)) }; });
      });
      const unduh = async () => {
        const [d] = await Promise.all([pg.waitForEvent('download', { timeout: 60000 }), pg.click('#layarSalesIdea .sip-unduh:not([hidden])')]);
        return { nama: d.suggestedFilename(), sha: sha(await d.path()) };
      };
      const t = await link();
      cek(t.length === 1 && t[0].teks === '⬇ Download Video' && t[0].href === PS.terang && t[0].nama === 'PSG-Proteksi-Kredit-Light-Portrait.mp4' && t[0].terlihat && t[0].tidakTertutup,
        'HP, tema terang: satu tombol "Download Video" → portrait (PSG-Proteksi-Kredit-Light-Portrait.mp4), terlihat dan tidak tertutup kartu akhir', t);
      const pT = await unduh();
      cek(pT.nama === 'PSG-Proteksi-Kredit-Light-Portrait.mp4' && pT.sha === sha(path.join(ROOT, PS.terang)), 'klik (HP, terang) → unduhan Light-Portrait = berkas repo (SHA-256)', pT.nama);
      await pg.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await pg.waitForTimeout(500);
      const g = await link();
      cek(g.length === 1 && g[0].href === PS.gelap && g[0].nama === 'PSG-Proteksi-Kredit-Dark-Portrait.mp4' && g[0].tidakTertutup, 'HP, tema gelap: tombol berganti ke portrait gelap (PSG-Proteksi-Kredit-Dark-Portrait.mp4)', g);
      const pG = await unduh();
      cek(pG.nama === 'PSG-Proteksi-Kredit-Dark-Portrait.mp4' && pG.sha === sha(path.join(ROOT, PS.gelap)), 'klik (HP, gelap) → unduhan Dark-Portrait = berkas repo (SHA-256)', pG.nama);
      const kartu = await pg.evaluate(() => [...document.querySelectorAll('#layarSalesIdea button')].some((x) => /Mari Hitung Kebutuhan Anda/.test(x.textContent) && x.getBoundingClientRect().height > 0));
      cek(kartu, 'kartu akhir (Mari Hitung Kebutuhan Anda / Topik Lain) tampil bersama tombol unduh');
      await ctx.close();
    }
  }

  cek(errs.length === 0, 'tanpa error halaman/konsol', errs.slice(0, 5));
  await br.close(); srv.close();
  console.log(gagal ? 'HASIL: GAGAL (' + gagal + ')' : 'HASIL: SEMUA LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
