#!/usr/bin/env node
/* Sales Idea 06 — Bekerja di Singapura (V2, storyboard final).

     node tests/sales-idea-singapura.test.js [--root <dir>] [--bagian A,B,...] [--ukuran 390x844,...]

   Yang dijaga:
   A. registri: hub 6 kartu, Sales Idea 06 membuka 8 scene (8 langkah).
   B. naskah: 27 segmen, persis versi yang disetujui; frasa & angka wajib
      terucap sebagai kata; pertanyaan risiko hanya sekali; klimaks & penutup.
   C. narasi rekaman (voice Bian, MP3): manifest 27 segmen (S05-03 dua klip,
      13 berkas, tanpa tumpang tindih); tiap klip diputar sesuai start/end
      tanpa melewati batas (bagian di luar klip tidak pernah terdengar);
      PLAY/PAUSE/RESUME (lanjut dari posisi)/NEXT/BACK/REPLAY/CLOSE, Narasi
      ON/OFF, gerak dikurangi, berkas gagal → sunyi, offline; satu elemen
      audio; speechSynthesis tidak pernah dipakai untuk Singapura; play()
      dari luar engine (tombol media/headset) tanpa klip aktif tidak berbunyi.
   D. kontrol pemutar: OPEN diam, PLAY, PAUSE, RESUME tanpa ulang, NEXT,
      BACK, REPLAY, CLOSE bersih (animasi & suara berhenti).
   E. CTA: kartu akhir sesudah scene 8 → Profil (target NEEDS) → Analisis
      Kebutuhan; Bahas Topik Lain → hub; profil tidak dipilih otomatis.
   F. gerak dikurangi: keadaan akhir statis, tanpa animasi ambient.
   G. responsif 360/390/430/768/1024/1366 × terang/gelap: tanpa overflow
      horizontal, panggung & kartu teks utuh, tokoh & label inti di dalam
      panggung, label tidak bertumpuk, teks visual ≥ 9 px, CTA dapat diklik.
   H. hemat: jumlah elemen SVG per scene, tanpa error konsol, tanpa storage
      key baru.

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

/* Naskah final yang disetujui (Phase 1). Test gagal bila satu huruf pun berubah. */
const NASKAH = [
  ['Ini Leo. Setiap hari, ia bekerja di Indonesia untuk memenuhi kebutuhan keluarganya. Saat ini, penghasilannya sekitar lima belas juta rupiah per bulan.',
    'Di rumah, istri dan anaknya selalu menunggunya pulang. Setiap sore, senyum mereka membuat lelahnya terasa lebih ringan. Merekalah alasan Leo bekerja keras.'],
  ['Suatu hari, atasan Leo memanggilnya ke ruangan. Leo, perusahaan kita sedang ekspansi ke Singapura, dan kami ingin kamu ikut menangani proyek ini di sana.',
    'Leo bertanya, di Singapura, Pak? Atasannya mengangguk. Tanggung jawabnya lebih besar, tapi ini kesempatan baik untuk kariermu.',
    'Leo terdiam sejenak, memikirkan istri dan anaknya. Jauh dari rumah memang tidak mudah, tetapi ini kesempatan untuk memberi mereka kehidupan yang lebih baik.',
    'Leo menarik napas, lalu menjawab dengan mantap. Baik, Pak. Saya bersedia.'],
  ['Tidak lama kemudian, Leo berpamitan dengan istri dan anaknya. Mereka tetap tinggal di Indonesia, sementara Leo berangkat ke Singapura untuk bekerja.',
    'Leo meninggalkan rutinitas lamanya. Kini ia bekerja di Singapura, memulai babak baru dengan tanggung jawab yang lebih besar.'],
  ['Di Indonesia, Leo sebelumnya berpenghasilan sekitar lima belas juta rupiah per bulan.',
    'Setelah bekerja di Singapura, penghasilannya meningkat menjadi sekitar tiga puluh sampai lima puluh juta rupiah per bulan.',
    'Artinya, sekitar dua sampai tiga kali lipat dari penghasilannya sebelumnya.',
    'Bagi Leo, ini bukan sekadar angka. Ini berarti lebih banyak ruang untuk membantu keluarganya, menyiapkan masa depan, dan mulai membangun aset.'],
  ['Bulan demi bulan berlalu, dan setiap bulan, penghasilan Leo mengalir untuk keluarganya di rumah.',
    'Satu tahun berlalu. Lalu tahun kedua.',
    'Anaknya tumbuh, sekolahnya berlanjut, dan kebutuhan rumah tangga datang setiap bulan. Penghasilan Leo meningkat, tetapi tanggung jawabnya juga bertambah.'],
  ['Sekarang, mari kita bayangkan sesuatu yang berbeda.',
    'Bagaimana jika suatu hari Leo tidak lagi bisa bekerja?',
    'Bukan karena ia ingin berhenti, tetapi karena sebuah risiko membuat penghasilannya terhenti.',
    'Kiriman setiap bulan tidak lagi datang. Tetapi di rumah, keluarganya masih menjalani hari seperti biasa.'],
  ['Di rumah, kehidupan keluarga Leo tetap berjalan. Rumah tetap perlu dijaga, pendidikan anak tetap berlanjut, kebutuhan sehari-hari tetap datang, dan masa depan tetap perlu disiapkan.',
    'Ketika penghasilan berhenti, kebutuhan keluarga tidak ikut berhenti.',
    'Karena itu, bagi siapa pun yang bekerja jauh dari rumah demi keluarganya, pertanyaannya bukan hanya bagaimana mendapatkan penghasilan yang lebih besar.',
    'Tetapi bagaimana memastikan keluarga tetap memiliki perlindungan, ketika penghasilan itu suatu hari berhenti.'],
  ['Kembali ke Leo hari ini. Ia masih bekerja di Singapura, dan malam ini, seperti biasa, ia menelepon keluarganya.',
    'Leo bekerja jauh dari rumah karena ingin memberikan kehidupan yang lebih baik untuk keluarganya.',
    'Dan mungkin, kita juga punya alasan yang sama.',
    'Sekarang, mari kita lihat, sudah cukupkah rencana kita untuk melindungi keluarga?']
];
const pecah = (t) => (String(t).match(/[^.!?]+[.!?]+/g) || [t]).map((x) => x.trim()).filter(Boolean);

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
  window.__tts = { log: [], ms: 6, tumpang: 0 };
  let cur = null, timer = null; const q = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.onend = null; this.onerror = null; };
  const mulai = () => {
    if (cur || !q.length) return;
    cur = q.shift(); window.__tts.log.push({ t: 'mulai', x: cur.text, lang: cur.lang, w: Date.now() });
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

/* pengamat rekaman: tiap frame membaca PSGNarasi.rekaman() dan mencatat
   klip yang berbunyi (waktu pertama & terakhir terdengar, posisi berhenti);
   window.__laju mempercepat audio; jumlah elemen Audio dihitung.
   Waktu mulai klip diambil dari sisi engine: posisi & waktu saat engine
   memanggil play() (mulai, tPlay). Sampel frame pertama (awal, t0) bisa
   terlambat dibaca bila frame Chromium headless tertunda, jadi tidak
   dipakai sebagai satu-satunya patokan waktu mulai. */
function pantauRekaman() {
  window.__rek = { klip: [], aktif: null, nAudio: 0, play: null };
  const A = window.Audio;
  window.Audio = function (s) { window.__rek.nAudio++; const e = new A(s); window.__rek.el = e; return e; };
  window.Audio.prototype = A.prototype;
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
        }
        else { a.akhir = Math.max(a.akhir, r.waktu); a.t1 = performance.now(); }
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

(async () => {
  const srv = await serve(ROOT);
  const URL = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await chromium.launch();
  const errs = [];

  async function buka(o) {
    o = o || {};
    const ctx = await br.newContext(Object.assign({ viewport: { width: 1366, height: 768 } }, o.ctx || {}));
    const pg = await ctx.newPage();
    if (!o.tanpaLog) {
      pg.on('pageerror', (e) => errs.push(e.message));
      pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    }
    if (o.rute) await o.rute(pg);
    await pg.addInitScript(mockTTS);
    await pg.addInitScript(pantauRekaman);
    await pg.addInitScript((t) => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); localStorage.setItem('insuranceHub.theme.v3', t); } catch (_) {} }, o.tema || 'original');
    await pg.goto(URL);
    await pg.waitForTimeout(500);
    if (o.cepat) { const cdp = await ctx.newCDPSession(pg); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: o.cepat }); }
    return { ctx, pg };
  }
  const bukaSG = async (pg) => {
    await pg.evaluate(() => document.getElementById('btnSalesIdea').click()); await pg.waitForTimeout(300);
    await pg.evaluate(() => document.querySelector('[data-si-choice="singapura"]').click()); await pg.waitForTimeout(350);
  };
  const st = (pg) => pg.evaluate(() => {
    const c = document.getElementById('salesIdeaContent');
    const an = document.getAnimations().filter((a) => a.effect && a.effect.target && c.contains(a.effect.target));
    const inf = (a) => !isFinite(a.effect.getComputedTiming().endTime);
    const node = c.querySelector('.sgs');
    return { status: document.getElementById('layarSalesIdea').getAttribute('data-sip-status'), count: document.getElementById('siStepCount').textContent,
      scene: node ? +node.dataset.sgs : 0, t: Math.round(Math.max(0, ...an.filter((a) => !inf(a)).map((a) => a.currentTime || 0))),
      run: an.filter((a) => a.playState === 'running').length, amb: an.filter((a) => inf(a) && a.playState === 'running').length };
  });
  const klik = (pg, s) => pg.evaluate((q) => document.querySelector(q).click(), s);
  const keScene = async (pg, n) => { for (let i = 0; i < 20; i++) { const s = await st(pg); if (s.scene === n) return; await pg.keyboard.press(s.scene < n ? 'ArrowRight' : 'ArrowLeft'); await pg.waitForTimeout(120); } };
  const tunggu = async (pg, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { if (await pg.evaluate(fn, arg)) return true; await pg.waitForTimeout(80); } return false; };
  /* bekukan scene aktif pada waktu t (md) atau di akhir */
  const beku = (pg, t) => pg.evaluate((tt) => {
    const c = document.getElementById('salesIdeaContent');
    const an = document.getAnimations().filter((a) => a.effect && a.effect.target && c.contains(a.effect.target));
    const end = (a) => a.effect.getComputedTiming().endTime;
    const akhir = Math.max(0, ...an.filter((a) => isFinite(end(a))).map(end));
    const w = tt === 'akhir' ? akhir : tt;
    an.forEach((a) => { a.pause(); a.currentTime = isFinite(end(a)) ? Math.min(w, end(a)) : w; });
    return akhir;
  }, t);

  const kunciAwal = await (async () => { const { ctx, pg } = await buka(); const k = await pg.evaluate(() => Object.keys(localStorage).sort()); await ctx.close(); return k; })();

  /* ---------- A. registri ---------- */
  console.log('[A] Registri & pembukaan');
  if (ikut('A')) {
    const { ctx, pg } = await buka();
    await pg.evaluate(() => document.getElementById('btnSalesIdea').click()); await pg.waitForTimeout(300);
    const kartu = await pg.evaluate(() => [...document.querySelectorAll('[data-si-choice]')].map((b) => b.dataset.siChoice).join(','));
    cek(kartu === 'jari,basket,education,retirement,asset,singapura', 'hub: 5 Sales Idea lama + Bekerja di Singapura', kartu);
    await pg.evaluate(() => document.querySelector('[data-si-choice="singapura"]').click()); await pg.waitForTimeout(350);
    const a = await st(pg);
    const k = await pg.evaluate(() => window.SalesIdea10Jari.keadaan());
    cek(a.status === 'siap' && a.scene === 1 && /Langkah 1 \/ 8/.test(a.count) && k.mode === 'singapura' && k.total === 8, 'buka: 8 scene terdaftar, scene 1 siap (OPEN diam)', { a, k });
    const kicker = await pg.evaluate(() => document.querySelector('.sgs-kicker').textContent);
    cek(kicker === 'INTI PESAN • 1/8', 'kartu teks: INTI PESAN • 1/8', kicker);
    const narasi = await pg.evaluate(() => !!document.querySelector('.sgs .kbs-suara'));
    cek(narasi, 'tombol Narasi dari narator bersama');
    await ctx.close();
  }

  /* ---------- B. naskah ---------- */
  console.log('[B] Naskah voiceover (versi disetujui)');
  if (ikut('B')) {
    const { ctx, pg } = await buka();
    const naskah = await pg.evaluate(() => window.PSGSingapuraStory.naskah());
    const seg = naskah.reduce((n, s) => n + s.length, 0);
    cek(naskah.length === 8 && seg === 27, '8 scene, 27 segmen narasi', { scene: naskah.length, seg });
    cek(JSON.stringify(naskah) === JSON.stringify(NASKAH), 'naskah persis versi yang disetujui');
    const semua = naskah.map((s) => s.join(' ')).join(' ');
    ['lima belas juta rupiah per bulan', 'tiga puluh sampai lima puluh juta rupiah per bulan', 'sekitar dua sampai tiga kali lipat'].forEach((f) => cek(semua.includes(f), 'angka terucap: "' + f + '"'));
    cek(!/\d/.test(semua) && !/…/.test(semua) && !/\bRp/.test(semua), 'tanpa digit, "…", atau "Rp" di naskah suara');
    cek(naskah[1][3].endsWith('Baik, Pak. Saya bersedia.'), 'scene 2: "Baik, Pak. Saya bersedia."');
    cek((semua.match(/Bagaimana jika/g) || []).length === 1 && naskah[5][1] === 'Bagaimana jika suatu hari Leo tidak lagi bisa bekerja?', 'scene 6: pertanyaan risiko hanya sekali');
    cek(naskah[6][1] === 'Ketika penghasilan berhenti, kebutuhan keluarga tidak ikut berhenti.' && /perlindungan, ketika penghasilan itu suatu hari berhenti\.$/.test(naskah[6][3]), 'scene 7: kalimat klimaks');
    cek(naskah[7][0].startsWith('Kembali ke Leo hari ini.') && naskah[7][2] === 'Dan mungkin, kita juga punya alasan yang sama.' && naskah[7][3] === 'Sekarang, mari kita lihat, sudah cukupkah rencana kita untuk melindungi keluarga?', 'scene 8: penutup');
    const maks = Math.max(...naskah.flat().map((s) => Math.max(...pecah(s).map((k) => k.length))));
    cek(maks <= 160, 'kalimat terpanjang ≤ 160 huruf (aman untuk TTS)', maks);
    const dur = await pg.evaluate(() => window.PSGSingapuraStory.durasi());
    const total = dur.reduce((a, b) => a + b, 0) / 1000;
    console.log('         durasi per scene (dtk): ' + dur.map((d) => Math.round(d / 1000)).join(' · ') + ' — total ±' + Math.round(total) + ' dtk');
    cek(total >= 240 && total <= 330, 'total durasi ±4–5 menit', total);
    const teks = await pg.evaluate(() => document.body.innerText);
    cek(!/breadwinner/i.test(teks) && !/breadwinner/i.test(semua), 'tidak ada istilah "breadwinner"');
    await ctx.close();
  }

  /* ---------- C. narasi rekaman (voice Bian) ---------- */
  console.log('[C] Narasi rekaman (MP3 voice Bian)');
  const ID = (n, j) => 'S0' + n + '-0' + j;
  const rek = (pg) => pg.evaluate(() => window.PSGNarasi.rekaman());
  const ucapTTS = (pg) => pg.evaluate(() => window.__tts.log.filter((x) => x.t === 'mulai').length);
  const tungguMain = (pg, n, ms) => tunggu(pg, (a) => { const r = window.PSGNarasi.rekaman(); return r.main && (!a || r.adegan === a); }, ms || 8000, n);
  /* periksa klip yang terdengar untuk satu scene terhadap manifest */
  const periksaKlip = (M, n, klip, tolAkhir, tolAwal, label) => {
    const harap = NASKAH[n - 1].flatMap((_, j) => (M.segmen[ID(n, j + 1)] || []).map((c, k) => Object.assign({ segmen: j + 1, klip: k + 1 }, c)));
    const dengar = klip.filter((x) => x.adegan === n);
    const urut = dengar.map((x) => x.segmen + '.' + x.klip + ':' + x.berkas).join(' ');
    const ok1 = urut === harap.map((c) => c.segmen + '.' + c.klip + ':' + c.audio).join(' ');
    const buruk = [];
    dengar.forEach((x, i) => {
      const c = harap[i]; if (!c) return;
      const henti = x.berhenti != null ? x.berhenti : x.akhir;
      /* waktu mulai = posisi saat engine memanggil play(); klip tanpa catatan play() engine = gagal */
      if (x.mulai == null) buruk.push(ID(n, c.segmen) + ' tanpa catatan play() dari engine');
      else if (x.mulai < c.start - 0.02 || x.mulai > c.start + tolAwal) buruk.push(ID(n, c.segmen) + ' mulai ' + x.mulai);
      /* bacaan frame pertama harus sesuai waktu nyata sejak play(): audio tidak
         pernah di depan start, dan tidak lebih maju dari yang mungkin diputar */
      if (x.mulai != null) {
        const batas = Math.round((x.mulai + ((x.t0 - x.tPlay) / 1000) * x.laju + 0.02) * 1000) / 1000;
        if (x.awal < c.start - 0.02 || x.awal > batas) buruk.push(ID(n, c.segmen) + ' bacaan pertama ' + x.awal + ' tidak sesuai waktu sejak play() (maks ' + batas + ')');
      }
      if (x.akhir > c.end + tolAkhir || henti > c.end + tolAkhir) buruk.push(ID(n, c.segmen) + ' melewati akhir ' + c.end + ' → ' + Math.max(x.akhir, henti));
      if (henti < c.end - 0.3) buruk.push(ID(n, c.segmen) + ' berhenti terlalu awal ' + henti + ' < ' + c.end);
    });
    cek(ok1 && !buruk.length, label + 'scene ' + n + ': ' + harap.length + ' klip berurutan sesuai manifest, tanpa melewati batas', { urut, harap: harap.length, buruk });
    return dengar;
  };
  if (ikut('C')) {
    /* C1. manifest */
    {
      const { ctx, pg } = await buka();
      const M = await pg.evaluate(() => window.PSGSingapuraAudio);
      const kunci = Object.keys(M.segmen);
      const harapKunci = NASKAH.flatMap((sc, i) => sc.map((_, j) => ID(i + 1, j + 1)));
      cek(kunci.length === 27 && JSON.stringify(kunci) === JSON.stringify(harapKunci), '27 segmen punya manifest (tanpa kurang/lebih/duplikat)', kunci.length);
      const klip = kunci.flatMap((k) => M.segmen[k].map((c) => Object.assign({ k }, c)));
      cek(kunci.every((k) => Array.isArray(M.segmen[k]) && M.segmen[k].length >= 1) && M.segmen['S05-03'].length === 2 &&
        M.segmen['S05-03'][0].audio === 'S05-01.mp3' && M.segmen['S05-03'][1].audio === 'S05-02.mp3', 'tiap segmen larik klip; S05-03 = 2 klip (S05-01.mp3 lalu S05-02.mp3)');
      const berkas = [...new Set(klip.map((c) => c.audio))].sort();
      cek(berkas.length === 13 && berkas.join() === 'S01-01.mp3,S01-02.mp3,S01-03.mp3,S02-01.mp3,S02-02.mp3,S05-01.mp3,S05-02.mp3,S06-01.mp3,S06-02.mp3,S07-01.mp3,S07-02.mp3,S08-01.mp3,S08-02.mp3', 'manifest memakai tepat 13 berkas', berkas);
      const per = {}; klip.forEach((c) => (per[c.audio] = per[c.audio] || []).push(c));
      const tumpang = Object.values(per).flatMap((cs) => cs.sort((a, b) => a.start - b.start).filter((c, i) => c.start >= c.end || (i && c.start < cs[i - 1].end - 1e-9)).map((c) => c.k));
      cek(tumpang.length === 0, 'klip dalam satu berkas tidak tumpang tindih (start < end)', tumpang);
      const dur = await pg.evaluate(async (M) => {
        const out = {};
        for (const f of [...new Set(Object.values(M.segmen).flat().map((c) => c.audio))]) {
          const r = await fetch(M.folder + f); if (!r.ok) { out[f] = -r.status; continue; }
          const b = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(await r.arrayBuffer()); out[f] = b.duration;
        }
        return out;
      }, M);
      const kurang = Object.entries(per).filter(([f, cs]) => !(dur[f] > 0) || Math.max(...cs.map((c) => c.end)) > dur[f] + 0.01).map(([f]) => f + ':' + dur[f]);
      cek(kurang.length === 0, '13 berkas ada, dapat di-decode, dan durasinya mencakup semua klip', kurang);
      await ctx.close();
    }

    /* C2. seluruh cerita (animasi & audio 4×): urutan & batas tiap klip */
    {
      const { ctx, pg } = await buka({ cepat: 4 });
      const M = await pg.evaluate(() => window.PSGSingapuraAudio);
      await pg.evaluate(() => { window.__laju = 4; });
      await bukaSG(pg);
      await pg.click('#siPlay');
      for (let n = 1; n <= 8; n++) {
        if (n > 1) await pg.keyboard.press('ArrowRight');
        const jml = NASKAH[n - 1].reduce((a, _, j) => a + (M.segmen[ID(n, j + 1)] || []).length, 0);
        await tunggu(pg, (a) => { const R = window.__rek; return R.klip.filter((x) => x.adegan === a[0]).length >= a[1] && !window.PSGNarasi.rekaman().main; }, 120000, [n, jml]);
        await pg.waitForTimeout(150);
        periksaKlip(M, n, await pg.evaluate(() => window.__rek.klip), 0.12, 0.3, '4×: ');
      }
      const x = await pg.evaluate(() => ({ nAudio: window.__rek.nAudio }));
      cek(x.nAudio === 1, 'satu elemen audio dipakai ulang (tidak ada audio tumpang tindih)', x);
      cek(await ucapTTS(pg) === 0, 'speechSynthesis tidak dipakai untuk Singapura', await ucapTTS(pg));
      await ctx.close();
    }

    /* C3. presisi batas pada kecepatan normal: scene 4 (3 batas dalam satu berkas,
       jeda terpendek 335 md) dan scene 5 (S05-03 dua berkas) */
    {
      const { ctx, pg } = await buka();
      const M = await pg.evaluate(() => window.PSGSingapuraAudio);
      await bukaSG(pg);
      for (const n of [4, 5]) {
        await keScene(pg, n);
        const s = await st(pg); if (s.status !== 'berputar') await pg.click('#siPlay');
        const jml = NASKAH[n - 1].reduce((a, _, j) => a + (M.segmen[ID(n, j + 1)] || []).length, 0);
        await tunggu(pg, (a) => window.__rek.klip.filter((x) => x.adegan === a[0]).length >= a[1] && !window.PSGNarasi.rekaman().main, 90000, [n, jml]);
        await pg.waitForTimeout(150);
        const d = periksaKlip(M, n, await pg.evaluate(() => window.__rek.klip), 0.04, 0.12, '1×: ');
        if (n === 5) {
          const a = d.find((x) => x.segmen === 3 && x.klip === 1), b = d.find((x) => x.segmen === 3 && x.klip === 2);
          /* klip 2 dianggap mulai saat engine memanggil play() */
          const celah = a && b && b.tPlay != null ? (b.tPlay - a.t1) / 1000 : null;
          cek(a && b && b.berkas === 'S05-02.mp3' && b.akhir <= 4.855 + 0.04 && celah != null && celah < 0.5, 'S05-03: klip 1 (S05-01.mp3) lalu klip 2 (S05-02.mp3), pergantian ±' + (celah == null ? '?' : celah.toFixed(2)) + ' dtk, narasi tambahan S05-02.mp3 tidak terdengar', { a, b });
        }
      }
      cek(await ucapTTS(pg) === 0, '1×: speechSynthesis tidak dipakai', await ucapTTS(pg));
      await ctx.close();
    }

    /* C4. kontrol pemutar dengan audio (klik nyata) */
    for (const mob of [false, true]) {
      const lbl = mob ? 'HP' : 'desktop';
      const { ctx, pg } = await buka(mob ? { ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } } : {});
      await bukaSG(pg);
      const r0 = await rek(pg);
      cek(!r0.main, lbl + ': OPEN tanpa audio', r0);
      await pg.click('#siPlay');
      const main = await tungguMain(pg, 1, 8000); await pg.waitForTimeout(700);
      const r1 = await rek(pg);
      cek(main && r1.berkas === 'S01-01.mp3' && r1.segmen === 1 && r1.waktu > 0, lbl + ': PLAY → animasi + audio S01-01', r1);
      await pg.click('#siPlay'); await pg.waitForTimeout(250); const r2 = await rek(pg); await pg.waitForTimeout(700); const r3 = await rek(pg); const sp = await st(pg);
      cek(!r2.main && !r3.main && r3.waktu === r2.waktu && sp.status === 'jeda', lbl + ': PAUSE → audio jeda, posisi tersimpan', [r2, r3, sp.status]);
      await pg.click('#siPlay'); await tungguMain(pg, 1, 3000); await pg.waitForTimeout(300); const r4 = await rek(pg);
      cek(r4.main && r4.waktu >= r2.waktu - 0.02 && r4.waktu < r2.waktu + 1.2, lbl + ': RESUME → lanjut dari posisi (tidak mulai dari 0)', [r2.waktu, r4.waktu]);
      await pg.click('#siNext'); await pg.waitForTimeout(120); const r5 = await rek(pg);
      await tungguMain(pg, 2, 8000); const r6 = await rek(pg);
      cek(!(r5.main && r5.adegan === 1) && r6.adegan === 2 && r6.berkas === 'S01-02.mp3' && r6.waktu < 1.5, lbl + ': NEXT → audio lama berhenti, S01-02 dari awal', [r5, r6]);
      await pg.click('#siPrev'); await tungguMain(pg, 1, 8000); const r7 = await rek(pg);
      cek(r7.adegan === 1 && r7.berkas === 'S01-01.mp3' && r7.waktu < 1.5, lbl + ': BACK → S01-01 dari awal', r7);
      await pg.click('#siNext'); await tungguMain(pg, 2, 8000); await pg.click('#siReplay'); await tungguMain(pg, 1, 8000); const r8 = await rek(pg);
      cek(r8.adegan === 1 && r8.segmen === 1 && r8.waktu < 1.5, lbl + ': REPLAY → scene 1 segmen 1 dari awal', r8);
      await pg.click('.sgs [data-kbs-suara]'); await pg.waitForTimeout(250); const r9 = await rek(pg); await pg.waitForTimeout(1200); const r10 = await rek(pg); const s10 = await st(pg);
      cek(!r9.main && !r10.main && s10.status === 'berputar', lbl + ': Narasi OFF → audio diam, animasi tetap berjalan', [r9, r10, s10.status]);
      await pg.click('.sgs [data-kbs-suara]'); const on = await tungguMain(pg, 1, 3000); const r11 = await rek(pg);
      cek(on && r11.waktu >= r10.waktu - 0.02, lbl + ': Narasi ON → audio lanjut', [r10.waktu, r11]);
      await pg.click('#layarSalesIdea .si-close'); await pg.waitForTimeout(300); const r12 = await rek(pg); await pg.waitForTimeout(1000); const r13 = await rek(pg);
      cek(!r12.main && !r13.main && r13.waktu === 0, lbl + ': CLOSE → audio berhenti, posisi direset, tidak ada suara tersisa', [r12, r13]);
      const nA = await pg.evaluate(() => window.__rek.nAudio);
      cek(nA === 1 && await ucapTTS(pg) === 0, lbl + ': satu elemen audio, tanpa speechSynthesis', { nA, tts: await ucapTTS(pg) });
      await ctx.close();
    }

    /* C5. gerak dikurangi: PLAY tetap memutar cerita + audio */
    {
      const { ctx, pg } = await buka({ ctx: { reducedMotion: 'reduce' } });
      await bukaSG(pg); await pg.click('#siPlay');
      const main = await tungguMain(pg, 1, 8000); const r = await rek(pg); const s = await st(pg);
      cek(main && r.berkas === 'S01-01.mp3' && s.status === 'berputar', 'gerak dikurangi: PLAY tetap memutar animasi + audio', [r, s.status]);
      await ctx.close();
    }

    /* C6. berkas gagal dimuat: animasi jalan, sunyi, tanpa suara browser */
    {
      const { ctx, pg } = await buka({ tanpaLog: true, ctx: { serviceWorkers: 'block' }, rute: (p) => p.route('**/S01-01.mp3', (r) => r.fulfill({ status: 404, body: '' })) });
      const perr = []; pg.on('pageerror', (e) => perr.push(e.message));
      await bukaSG(pg); await pg.click('#siPlay'); await pg.waitForTimeout(4500);
      const r = await rek(pg), s = await st(pg);
      cek(!perr.length && s.status === 'berputar' && s.t > 3000 && !r.main && await ucapTTS(pg) === 0, 'berkas gagal: tanpa crash, animasi jalan, segmen sunyi, tanpa suara browser', { perr, s, r });
      await ctx.close();
    }

    /* C8. keamanan pemutaran dari luar engine (tombol media, headset, keyboard):
       play() pada elemen audio tanpa klip aktif tidak boleh menghasilkan suara */
    {
      const luar = async (pg) => {
        await pg.evaluate(() => {
          const el = window.__rek.el; window.__luar = { bunyi: 0, t0: el.currentTime };
          const p = el.play(); if (p && p.catch) p.catch(() => {});
          const t1 = performance.now();
          (function amati() { if (!el.paused && !el.muted && el.volume > 0) window.__luar.bunyi++; if (performance.now() - t1 < 900) requestAnimationFrame(amati); })();
        });
        await pg.waitForTimeout(1000);
        return pg.evaluate(() => { const el = window.__rek.el; return { bunyi: window.__luar.bunyi, paused: el.paused, muted: el.muted, maju: Math.round((el.currentTime - window.__luar.t0) * 1000) / 1000, sumber: !!el.getAttribute('src') }; });
      };
      const aman = (x) => x.bunyi === 0 && x.paused && Math.abs(x.maju) < 0.05;
      const { ctx, pg } = await buka();
      await bukaSG(pg); await pg.click('#siPlay');
      /* E1: sesudah engine berhenti di akhir klip S01-01 */
      await tunggu(pg, () => { const r = window.PSGNarasi.rekaman(); return !r.main && r.waktu >= 10.2; }, 30000);
      const e1 = await luar(pg);
      cek(aman(e1) && (await rek(pg)).waktu < 10.3, 'E1: sesudah END klip, play() dari luar engine tidak berbunyi dan tidak lanjut ke kalimat berikutnya', e1);
      /* E3: NEXT/BACK tetap normal sesudah percobaan dari luar */
      await pg.click('#siNext'); const n1 = await tungguMain(pg, 2, 8000); const rn = await rek(pg);
      await pg.click('#siPrev'); const b1 = await tungguMain(pg, 1, 8000); const rb = await rek(pg);
      cek(n1 && rn.berkas === 'S01-02.mp3' && b1 && rb.berkas === 'S01-01.mp3' && rb.waktu < 1.5, 'E3: NEXT/BACK sesudahnya tetap memutar klip baru dengan normal', [rn, rb]);
      /* E4: PAUSE → (percobaan dari luar ditolak) → RESUME lewat tombol PWA */
      await pg.waitForTimeout(600);
      await pg.click('#siPlay'); await pg.waitForTimeout(250); const rp = await rek(pg);
      const e4 = await luar(pg);
      await pg.click('#siPlay'); const lanjut = await tungguMain(pg, 1, 3000); await pg.waitForTimeout(300); const rr = await rek(pg);
      cek(aman(e4) && lanjut && rr.waktu >= rp.waktu - 0.02 && rr.waktu < rp.waktu + 1.2, 'E4: saat PAUSE play() dari luar ditolak; RESUME lewat tombol PWA tetap lanjut dari posisi', { e4, rp: rp.waktu, rr: rr.waktu });
      /* E5: Narasi OFF */
      await pg.click('.sgs [data-kbs-suara]'); await pg.waitForTimeout(250);
      const e5 = await luar(pg); const s5 = await st(pg);
      cek(aman(e5) && s5.status === 'berputar', 'E5: Narasi OFF — play() dari luar tidak berbunyi, animasi tetap berjalan', { e5, status: s5.status });
      await pg.click('.sgs [data-kbs-suara]'); const on = await tungguMain(pg, 1, 3000);
      cek(on, 'E5: Narasi ON sesudahnya tetap memutar audio lewat engine');
      /* E2: CLOSE */
      await pg.click('#layarSalesIdea .si-close'); await pg.waitForTimeout(300);
      const e2 = await luar(pg);
      cek(aman(e2) && !e2.sumber, 'E2: sesudah CLOSE sumber audio dilepas; play() dari luar tidak berbunyi', e2);
      await ctx.close();
      /* E6: keluar dari Singapura ke hub Sales Idea */
      const c6 = await buka();
      await bukaSG(c6.pg); await c6.pg.click('#siPlay'); await tungguMain(c6.pg, 1, 8000);
      await c6.pg.click('[data-si-hub]'); await c6.pg.waitForTimeout(300);
      const e6 = await luar(c6.pg); const h6 = await c6.pg.evaluate(() => window.SalesIdea10Jari.keadaan().mode);
      cek(aman(e6) && !e6.sumber && h6 === 'hub', 'E6: keluar ke hub Sales Idea — sumber dilepas; play() dari luar tidak berbunyi', { e6, h6 });
      /* E7: Sales Idea lain tetap memakai speechSynthesis */
      await c6.pg.evaluate(() => { window.__tts.log = []; document.querySelector('[data-si-choice="basket"]').click(); });
      await c6.pg.waitForTimeout(400); await c6.pg.click('#siPlay');
      const ucap = await tunggu(c6.pg, () => window.__tts.log.some((x) => x.t === 'mulai'), 8000);
      const e7 = await c6.pg.evaluate(() => ({ lang: [...new Set(window.__tts.log.filter((x) => x.t === 'mulai').map((x) => x.lang))].join(), audio: window.PSGNarasi.rekaman().main, el: window.__rek.el ? { paused: window.__rek.el.paused, sumber: !!window.__rek.el.getAttribute('src') } : null }));
      cek(ucap && e7.lang === 'id-ID' && !e7.audio && (!e7.el || (e7.el.paused && !e7.el.sumber)), 'E7: Keranjang tetap dinarasikan speechSynthesis (id-ID), elemen audio Singapura diam', e7);
      await c6.ctx.close();
    }

    /* C7. offline: 13 berkas di cache service worker, audio tetap berbunyi */
    {
      const { ctx, pg } = await buka();
      await pg.evaluate(() => navigator.serviceWorker.ready);
      const penuh = await tunggu(pg, async () => { const k = await caches.keys(); if (!k.length) return false; const c = await caches.open(k[k.length - 1]); const u = (await c.keys()).map((r) => r.url); return u.filter((x) => /\/assets\/narasi\/singapore\/S\d\d-\d\d\.mp3$/.test(x)).length === 13; }, 30000);
      cek(penuh, 'cache service worker berisi 13 berkas rekaman');
      await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(600);
      await bukaSG(pg); await pg.click('#siPlay');
      const main = await tungguMain(pg, 1, 8000); const r = await rek(pg);
      cek(main && r.berkas === 'S01-01.mp3', 'offline: audio S01-01 berbunyi dari cache', r);
      await ctx.setOffline(false); await ctx.close();
    }
  }

  /* ---------- D. kontrol pemutar ---------- */
  console.log('[D] Kontrol pemutar');
  for (const mob of (ikut('D') ? [false, true] : [])) {
    const lbl = mob ? 'HP' : 'desktop';
    const { ctx, pg } = await buka(mob ? { ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } } : {});
    await bukaSG(pg);
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
    cek(g.scene === 1 && g.status === 'berputar' && g.t < 800, lbl + ': REPLAY → scene 1 dari awal', g);
    if (!mob) {
      await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(200); cek((await st(pg)).scene === 2, 'keyboard →: next');
      await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(200); cek((await st(pg)).scene === 1, 'keyboard ←: back');
      await pg.keyboard.press(' '); await pg.waitForTimeout(150); cek((await st(pg)).status === 'jeda', 'keyboard spasi: pause');
      await pg.keyboard.press(' '); await pg.waitForTimeout(150); cek((await st(pg)).status === 'berputar', 'keyboard spasi: resume');
    }
    await klik(pg, '#layarSalesIdea .si-close'); await pg.waitForTimeout(300);
    const z = await pg.evaluate(() => ({ aktif: document.getElementById('layarSalesIdea').classList.contains('aktif'), bicara: window.speechSynthesis.speaking, audio: window.PSGNarasi.rekaman().main,
      jalan: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && document.getElementById('salesIdeaContent').contains(a.effect.target)).length }));
    cek(!z.aktif && z.jalan === 0 && !z.bicara && !z.audio, lbl + ': CLOSE bersih (animasi & suara berhenti)', z);
    await ctx.close();
  }

  /* ---------- E. CTA ---------- */
  console.log('[E] Kartu akhir & CTA');
  if (ikut('E')) {
    const { ctx, pg } = await buka({ cepat: 12 });
    const profil = await pg.evaluate(() => ({ list: localStorage.getItem('insuranceHub.customerProfiles.v1'), aktif: localStorage.getItem('insuranceHub.customerProfile.active.v1') }));
    await bukaSG(pg); await keScene(pg, 8);
    await pg.evaluate(() => { const s = document.getElementById('layarSalesIdea').getAttribute('data-sip-status'); if (s !== 'berputar') document.getElementById('siPlay').click(); });
    const kartu = await tunggu(pg, () => [...document.querySelectorAll('#layarSalesIdea button')].some((x) => /Mari Kita Hitung/.test(x.textContent) && x.getBoundingClientRect().height > 0), 120000);
    const teks = await pg.evaluate(() => document.getElementById('layarSalesIdea').innerText);
    cek(kartu && /Apakah Anda ingin melanjutkan\?/.test(teks) && /Mari Kita Hitung/.test(teks) && /Bahas Topik Lain/.test(teks), 'kartu akhir muncul sesudah scene 8 (Mari Kita Hitung / Bahas Topik Lain)');
    const tombol = await pg.evaluate(() => {
      const b = [...document.querySelectorAll('#layarSalesIdea button')].find((x) => /Mari Kita Hitung/.test(x.textContent));
      if (!b) return null; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { ok: !!el && (el === b || b.contains(el)), dalam: r.bottom <= innerHeight && r.right <= innerWidth };
    });
    cek(tombol && tombol.ok && tombol.dalam, 'tombol Mari Kita Hitung terlihat & dapat diklik', tombol);
    await pg.evaluate(() => [...document.querySelectorAll('#layarSalesIdea button')].find((x) => /Mari Kita Hitung/.test(x.textContent)).click());
    await pg.waitForTimeout(400);
    const k = await pg.evaluate(() => ({ layar: (document.querySelector('.layar.aktif') || {}).id, konteks: window.InsuranceHubCustomerProfile.konteks() }));
    cek(k.layar === 'layarProfile' && k.konteks && k.konteks.topic === 'bekerja_singapura' && k.konteks.target === 'NEEDS', 'Mari Kita Hitung → Profil dengan target Analisis Kebutuhan (NEEDS)', k);
    const profil2 = await pg.evaluate(() => ({ list: localStorage.getItem('insuranceHub.customerProfiles.v1'), aktif: localStorage.getItem('insuranceHub.customerProfile.active.v1') }));
    cek(JSON.stringify(profil) === JSON.stringify(profil2), 'profil tidak dipilih/diubah/dibuat otomatis');
    await ctx.close();
    const b = await buka({ cepat: 12 });
    await bukaSG(b.pg); await keScene(b.pg, 8);
    await b.pg.evaluate(() => { const s = document.getElementById('layarSalesIdea').getAttribute('data-sip-status'); if (s !== 'berputar') document.getElementById('siPlay').click(); });
    await tunggu(b.pg, () => [...document.querySelectorAll('#layarSalesIdea button')].some((x) => /Bahas Topik Lain/.test(x.textContent) && x.getBoundingClientRect().height > 0), 120000);
    await b.pg.evaluate(() => [...document.querySelectorAll('#layarSalesIdea button')].find((x) => /Bahas Topik Lain/.test(x.textContent)).click());
    await b.pg.waitForTimeout(350);
    const h = await b.pg.evaluate(() => window.SalesIdea10Jari.keadaan());
    cek(h.mode === 'hub', 'Bahas Topik Lain → kembali ke hub Sales Idea', h);
    await b.ctx.close();
  }

  /* ---------- F. gerak dikurangi ---------- */
  console.log('[F] Gerak dikurangi');
  if (ikut('F')) {
    const { ctx, pg } = await buka({ ctx: { reducedMotion: 'reduce' } });
    await bukaSG(pg);
    const a = await st(pg);
    cek(a.status !== 'berputar' && a.run === 0, 'OPEN: keadaan akhir statis tanpa gerak', a);
    let amb = 0;
    for (let n = 1; n <= 8; n++) { await keScene(pg, n); await pg.waitForTimeout(250); amb += (await st(pg)).amb; }
    cek(amb === 0, 'tidak ada animasi ambient (loop) di 8 scene', amb);
    await ctx.close();
  }

  /* ---------- G. responsif ---------- */
  console.log('[G] Responsif 6 lebar × 2 tema × 8 scene');
  const ui = args.indexOf('--ukuran');
  const UKURAN = ui >= 0 ? args[ui + 1].split(',').map((x) => x.split('x').map(Number)) : [[360, 740], [390, 844], [430, 932], [768, 1024], [1024, 768], [1366, 768], [844, 390]];
  const INTI = { 1: ['.sgs-rumah-leo', '.sgs-istri-blok', '.sgs-anak-blok', '.sgs-label-15'], 2: ['.sgs-leo-ruang', '.sgs-bos', '.sgs-gel-leo-2', '.sgs-foto-meja'],
    3: ['.sgs-komp-sg .sgs-leo-sg'], 4: ['.sgs-komp-dunia .sgs-rumah-leo', '.sgs-label-garis', '.sgs-manfaat'], 5: ['.sgs-kal-dunia', '.sgs-komp-dunia .sgs-rumah-leo', '.sgs-anak-besar'],
    6: ['.sgs-komp-dunia .sgs-rumah-leo', '.sgs-istri-dunia'], 7: ['.sgs-perisai-g', '.sgs-label-perisai', '.sgs-chip-grup', '.sgs-kontras-1', '.sgs-kontras-2'], 8: ['.sgs-rencana', '.sgs-komp-dunia .sgs-rumah-leo', '.sgs-tetangga'] };
  const TENGAH = { 2: [2, 200], 4: [2, 1400], 7: [1, 2500] };
  const INTI_TENGAH = { 2: ['.sgs-leo-ruang', '.sgs-bos', '.sgs-foto-meja'], 4: ['.sgs-tumpukan', '.sgs-lencana', '.sgs-label-id-15', '.sgs-label-sg-30', '.sgs-komp-sg .sgs-leo-sg'],
    7: ['.sgs-chip-grup', '.sgs-kontras-1', '.sgs-kontras-2', '.sgs-komp-dunia .sgs-rumah-leo'] };
  let kombinasi = 0, masalah = 0;
  for (const tema of (ikut('G') ? ['original', 'dark'] : [])) {
    for (const [w, h] of UKURAN) {
      const { ctx, pg } = await buka({ tema, ctx: { viewport: { width: w, height: h }, isMobile: w < 1024, hasTouch: w < 1024 } });
      await bukaSG(pg);
      for (let n = 1; n <= 8; n++) {
        await keScene(pg, n); await pg.waitForTimeout(150);
        const s0 = await st(pg); if (s0.status === 'berputar') await klik(pg, '#siPlay');
        const momen = TENGAH[n] ? [TENGAH[n], 'akhir'] : ['akhir'];
        for (const m of momen) {
          if (m === 'akhir') await beku(pg, 'akhir');
          else { const k = await pg.evaluate((nn) => window.PSGSingapuraStory.ketukan(nn), n); await beku(pg, k.B[m[0]] + m[1]); }
          await pg.waitForTimeout(60);
          kombinasi++;
          const r = await pg.evaluate(([sel, n]) => {
            const out = [];
            const vw = innerWidth, vh = innerHeight;
            const stg = document.querySelector('.sgs-stage').getBoundingClientRect();
            const txt = document.querySelector('.sgs-text').getBoundingClientRect();
            if (document.documentElement.scrollWidth > vw + 1) out.push('overflow horizontal ' + document.documentElement.scrollWidth);
            if (stg.bottom > vh + 1 || stg.top < 0 || txt.bottom > vh + 1) out.push('terpotong vertikal');
            if (stg.width < 200 || stg.height < 150) out.push('panggung terlalu kecil ' + Math.round(stg.width) + 'x' + Math.round(stg.height));
            const pot = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
            if (pot(stg, txt)) out.push('kartu teks menimpa panggung');
            const terlihat = (el) => { let e = el, o = 1; while (e && e.nodeType === 1 && e.tagName !== 'figure' && e.tagName !== 'FIGURE') { o *= +getComputedStyle(e).opacity; e = e.parentNode; } return o > 0.5; };
            sel.forEach((s) => {
              const el = document.querySelector('.sgs-stage ' + s);
              if (!el) { out.push('tidak ada ' + s); return; }
              if (!terlihat(el)) { out.push('tidak terlihat ' + s); return; }
              const b = el.getBoundingClientRect();
              if (b.left < stg.left - 2 || b.right > stg.right + 2 || b.top < stg.top - 2 || b.bottom > stg.bottom + 2) out.push('keluar panggung ' + s + ' ' + [b.left - stg.left, b.top - stg.top, stg.right - b.right, stg.bottom - b.bottom].map(Math.round).join(','));
            });
            /* tokoh tidak terpotong */
            document.querySelectorAll('.sgs-stage .sgs-ak').forEach((a) => {
              if (!terlihat(a) || a.closest('.sgs-foto')) return;
              const b = a.getBoundingClientRect(); if (b.width < 2) return;
              const dalam = Math.max(0, Math.min(b.right, stg.right) - Math.max(b.left, stg.left)) * Math.max(0, Math.min(b.bottom, stg.bottom) - Math.max(b.top, stg.top));
              if (dalam > 0 && dalam < b.width * b.height * 0.97) out.push('tokoh terpotong ' + (a.getAttribute('class') || '').replace('sgs-ak ', ''));
            });
            /* label tidak bertumpuk; teks ≥ 9 px */
            const lbl = [...document.querySelectorAll('.sgs-stage .sgs-pil, .sgs-stage .sgs-gel, .sgs-stage .sgs-chip-kotak, .sgs-stage .sgs-kal-badan, .sgs-stage .sgs-lencana-isi')].filter(terlihat).map((e) => e.getBoundingClientRect()).filter((b) => b.width > 4 && pot(b, stg));
            for (let i = 0; i < lbl.length; i++) for (let j = i + 1; j < lbl.length; j++) {
              const a = lbl[i], b = lbl[j]; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (ix > 3 && iy > 3) out.push('label bertumpuk');
            }
            let kecil = 99;
            document.querySelectorAll('.sgs-stage svg text').forEach((t) => {
              if (!terlihat(t) || t.closest('.sgs-foto') || t.closest('.sgs-laptop')) return;
              const b = t.getBoundingClientRect(); if (!pot(b, stg) || !t.textContent.trim()) return;
              const fs = parseFloat(getComputedStyle(t).fontSize) * (t.getScreenCTM() ? Math.hypot(t.getScreenCTM().a, t.getScreenCTM().b) : 1);
              kecil = Math.min(kecil, fs);
            });
            if (kecil < 9) out.push('teks kecil ' + kecil.toFixed(1) + 'px');
            return out;
          }, [(m === 'akhir' ? INTI[n] : INTI_TENGAH[n]) || [], n]);
          const unik = [...new Set(r)];
          if (unik.length) { masalah++; console.log('  GAGAL  ' + tema + ' ' + w + 'x' + h + ' scene ' + n + ' (' + (m === 'akhir' ? 'akhir' : 'ketuk ' + m[0]) + '): ' + unik.join('; ')); }
        }
      }
      if (tema === 'original') {
        const c2 = await buka({ tema, cepat: 20, ctx: { viewport: { width: w, height: h }, isMobile: w < 1024, hasTouch: w < 1024 } });
        await bukaSG(c2.pg); await keScene(c2.pg, 8);
        await c2.pg.evaluate(() => { const s = document.getElementById('layarSalesIdea').getAttribute('data-sip-status'); if (s !== 'berputar') document.getElementById('siPlay').click(); });
        const ada = await tunggu(c2.pg, () => [...document.querySelectorAll('#layarSalesIdea button')].some((x) => /Mari Kita Hitung/.test(x.textContent) && x.getBoundingClientRect().height > 0), 90000);
        const cta = ada && await c2.pg.evaluate(() => {
          const b = [...document.querySelectorAll('#layarSalesIdea button')].find((x) => /Mari Kita Hitung/.test(x.textContent));
          b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && !!el && (el === b || b.contains(el));
        });
        kombinasi++;
        if (!cta) { masalah++; console.log('  GAGAL  ' + w + 'x' + h + ': CTA tidak dapat dipakai'); }
        await c2.ctx.close();
      }
      await ctx.close();
    }
  }
  console.log('  kombinasi diperiksa: ' + kombinasi + ' | masalah: ' + masalah);
  if (ikut('G')) cek(masalah === 0, 'responsif: tanpa overflow, clipping, tokoh terpotong, label bertumpuk, teks < 9 px; CTA dapat dipakai');

  /* ---------- H. hemat & bersih ---------- */
  console.log('[H] Elemen, error, storage');
  if (ikut('H')) {
    const { ctx, pg } = await buka();
    await bukaSG(pg);
    const jumlah = [];
    for (let n = 1; n <= 8; n++) { await keScene(pg, n); await pg.waitForTimeout(150); jumlah.push(await pg.evaluate(() => document.querySelectorAll('.sgs-rig *').length)); }
    console.log('         elemen SVG per scene: ' + jumlah.join(' · '));
    cek(Math.max(...jumlah) <= 800, 'elemen SVG per scene ≤ 800', jumlah);
    await klik(pg, '#layarSalesIdea .si-close'); await pg.waitForTimeout(250);
    const kunci = await pg.evaluate(() => Object.keys(localStorage).sort());
    const baru = kunci.filter((k) => !kunciAwal.includes(k) && k !== 'insuranceHub.theme.v3');
    cek(baru.length === 0, 'tidak ada storage key baru', baru);
    await ctx.close();
  }
  cek(errs.length === 0, 'tanpa error halaman/konsol', errs.slice(0, 5));

  await br.close(); srv.close();
  console.log(gagal ? 'HASIL: GAGAL (' + gagal + ')' : 'HASIL: SEMUA LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
