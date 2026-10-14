#!/usr/bin/env node
/* Sales Idea 08 — Sandwich Generation (src/sales-idea-sandwich.js) — tes browser.

   A. registri: hub 8 kartu (SALES IDEA 08 terakhir), pemutar bersama, 8 scene
      berurutan, tanpa autoplay, tombol Narasi.
   B. naskah: teks layar + naskah runtime sama persis dengan prompt dan dengan
      dokumen ElevenLabs/storyboard; NASKAH AUDIO hanya berisi naskah.
   C. pemutar: 8 scene diputar berurutan; halaman pilihan muncul SATU kali
      sesudah scene 8 selesai DAN narasi rekaman tuntas; tidak ada kartu "Mari
      Kita Hitung"; tidak macet; replay/buka ulang tidak mewarisi pilihan lama;
      tanpa Web Speech rekaman tetap dipakai; MP3 gagal dimuat → sunyi (tanpa
      suara browser), pemutar tetap selesai dan halaman pilihan tampil.
   D. routing (tujuan sesungguhnya, lewat Profil "Gunakan"):
      A→SEGITIGA, B→DP lalu "Solusi — penuhi dengan Lite Future"→DP_SOLUSI,
      C→halaman tiga tools: GSPA/BSL/GHP dengan rider kesehatan "Ya",
      D→NEEDS + sorot kolom critical illness, E→NEEDS + sorot kolom jiwa.
      Konteks profil ikut terisi; meninggalkan Profil membatalkan tindak lanjut.
   E. Sales Idea lain tetap memakai kartu "Mari Kita Hitung".
   F. media realistis opsional (PSGSandwichVisual) dipakai bila ada.
   G. responsif HP/desktop, terang/gelap: teks layar dalam panggung, halaman
      pilihan dalam layar, tombol ≥44 px.
   H. tanpa storage key baru, tanpa error/404.
   I. narasi rekaman Bian: manifest 8 segmen = naskah, 8 MP3 dimuat & di-decode
      (end = durasi berkas), ketukan ≥ rekaman + 0,7 dtk; putar penuh waktu nyata:
      klip berurutan, utuh, tanpa tumpang tindih, suara browser tidak dipakai;
      PAUSE/RESUME tanpa dobel, NEXT menghentikan klip lama, CLOSE diam.
   J. unduh video: gerbang tonton utuh; sesudah tonton utuh dua tombol
      "Download Video Portrait (9:16)" & "Download Video Landscape (16:9)"
      (HP & desktop, terang & gelap), unduhan = berkas repo (SHA-256);
      keempat MP4: resolusi 720×1280 / 1280×720, ada trek audio, durasi = total
      timeline (tidak memotong narasi).

     node tests/sales-idea-sandwich.test.js [--root <dir>] [--bagian A,B,...]
   Keluar 0 = lulus, 1 = gagal, 2 = dilewati. */
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

/* Naskah & teks layar dari prompt pemilik proyek (kontrak). */
const LAYAR = ['Untuk Anakku Kelak', 'Kasih Sayang, Bukan Beban Tanpa Rencana', 'Kebutuhan Hidup Tetap Berjalan', 'Kesehatan Dapat Mengubah Rencana',
  'Siapkan Perlindungan Keluarga', 'Tiga Generasi. Satu Rantai.', 'Mulai dari Kebutuhan yang Nyata', 'RANTAI ITU PUTUS DI AKU'];
const PENDUKUNG_8 = 'Tiga Generasi. Satu Keputusan.';
const NASKAH = [
  'Untuk anakku kelak, ada satu hal yang ingin aku pastikan: gajimu bukan rencana masa tuaku.',
  'Kami tentu ingin saling membantu dalam keluarga. Tetapi aku tak ingin kasih sayang berubah menjadi beban finansial yang tidak pernah direncanakan.',
  'Saat kita berhenti bekerja, kebutuhan hidup tetap berjalan. Pensiun yang tidak disiapkan bisa membuat anak harus ikut menanggung biaya hidup orang tuanya.',
  'Biaya kesehatan juga bisa datang di luar rencana. Tanpa perlindungan dan dana yang memadai, tabungan keluarga bahkan rencana pendidikan anak bisa ikut terganggu.',
  'Penyakit kritis dapat memengaruhi penghasilan dan kebutuhan sehari-hari. Dan bila pencari nafkah meninggal, keluarga yang ditinggalkan tetap memerlukan biaya untuk melanjutkan hidup.',
  'Di sinilah rantai beban bisa terbentuk: anak membesarkan anaknya sendiri, sambil menopang orang tua. Lalu ia bisa mewariskan tekanan yang sama ke generasi berikutnya.',
  'Kita tidak bisa mengendalikan semua hal. Tapi kita bisa mulai dengan mengenali kebutuhan, menilai perlindungan yang sudah ada, dan menyiapkan langkah sesuai kemampuan.',
  'Rantai itu putus di aku. Bukan karena semua risiko hilang, tetapi karena aku mulai merencanakan. Beban finansial apa yang paling ingin kamu cegah agar tidak berpindah ke anak?'
];
const TOMBOL = { A: 'Petakan Kebutuhan Saya', B: 'Hitung Kebutuhan Dana Pensiun', C: 'Pilih Tools Perlindungan Kesehatan', D: 'Analisis Kebutuhan Penyakit Kritis', E: 'Analisis Perlindungan Keluarga' };
const LAMA = ['jari', 'basket', 'education', 'retirement', 'asset', 'singapura', 'kredit'];
const PROFIL = { id: 'fx-sandwich-01', nama: 'Andi Sandwich', tglLahir: '1984-03-14', jk: 'PRIA', status: 'Menikah',
  family: [{ id: 'self', nama: 'Andi Sandwich', tglLahir: '1984-03-14', jk: 'PRIA', hubungan: 'Diri Sendiri' }], children: [] };

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

/* narator palsu (Web Speech): mencatat ucapan tanpa suara */
function mockTTS() {
  window.__tts = { log: [], ms: 4 };
  let cur = null, timer = null; const q = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.onend = null; this.onerror = null; };
  const mulai = () => {
    if (cur || !q.length) return;
    cur = q.shift(); window.__tts.log.push({ t: 'mulai', x: cur.text });
    timer = setTimeout(() => { const u = cur; cur = null; window.__tts.log.push({ t: 'akhir', x: u.text }); if (u.onend) u.onend({}); mulai(); }, window.__tts.ms * cur.text.length);
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

/* pengamat rekaman (pola tes Proteksi Kredit): tiap frame membaca PSGNarasi.rekaman() */
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
    const N = window.PSGNarasi, R = window.__rek;
    if (this === R.el && N && N.rekaman) {
      const r = N.rekaman();
      if (r.berkas) R.play = { key: r.adegan + '|' + r.segmen + '|' + r.klip + '|' + r.berkas, pos: Math.round(this.currentTime * 1000) / 1000, t: performance.now() };
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
          const x = { key, adegan: r.adegan, segmen: r.segmen, berkas: r.berkas, awal: r.waktu, akhir: r.waktu, mulai: p ? p.pos : null, tPlay: p ? p.t : null };
          R.klip.push(x); R.aktif = x;
        } else { a.akhir = Math.max(a.akhir, r.waktu); }
      } else if (a) { if (!a.berhenti && r.berkas === '' && r.waktu > 0) a.berhenti = r.waktu; R.aktif = null; }
    }
    requestAnimationFrame(loop);
  })();
}

/* info MP4 dari kotak ISO-BMFF (tanpa dekoder): durasi, trek video (lebar×tinggi) & audio */
function infoMp4(berkas) {
  const b = fs.readFileSync(berkas), out = { durasi: 0, trek: [] };
  const kotak = (a, z, cb) => { let i = a; while (i + 8 <= z) { let n = b.readUInt32BE(i), h = 8; const t = b.toString('latin1', i + 4, i + 8);
    if (n === 1) { n = Number(b.readBigUInt64BE(i + 8)); h = 16; } else if (n === 0) n = z - i; if (n < h) break; cb(t, i + h, i + n); i += n; } };
  kotak(0, b.length, (t, a, z) => { if (t !== 'moov') return;
    kotak(a, z, (t2, a2, z2) => {
      if (t2 === 'mvhd') { const v = b[a2]; out.durasi = v === 1 ? Number(b.readBigUInt64BE(a2 + 24)) / b.readUInt32BE(a2 + 20) : b.readUInt32BE(a2 + 16) / b.readUInt32BE(a2 + 12); }
      if (t2 === 'trak') { const tr = {}; kotak(a2, z2, (t3, a3, z3) => {
        if (t3 === 'tkhd') { tr.lebar = b.readUInt32BE(z3 - 8) / 65536; tr.tinggi = b.readUInt32BE(z3 - 4) / 65536; }
        if (t3 === 'mdia') kotak(a3, z3, (t4, a4) => { if (t4 === 'hdlr') tr.jenis = b.toString('latin1', a4 + 8, a4 + 12); });
      }); out.trek.push(tr); }
    });
  });
  return out;
}

let gagal = 0;
function cek(ok, label, info) {
  console.log((ok ? '  OK   ' : '  GAGAL') + ' ' + label + (!ok && info !== undefined ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 700) : ''));
  if (!ok) gagal++;
}

/* NASKAH AUDIO di dokumen ElevenLabs: isi kotak ```text sesudah penanda */
function naskahDokumen(md) {
  const out = [];
  const re = /## SCENE (\d\d) — ([^\n]+)\n[\s\S]*?\*\*NASKAH AUDIO\*\*\s*\n\s*```text\n([\s\S]*?)\n```/g;
  let m; while ((m = re.exec(md))) out.push({ n: +m[1], judul: m[2].trim(), teks: m[3] });
  return out;
}

(async () => {
  const srv = await serve(ROOT);
  const URL = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await chromium.launch();
  const errs = [], gagalMuat = [];

  async function buka(o) {
    o = o || {};
    const ctx = await br.newContext(Object.assign({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' }, o.ctx || {}));
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    pg.on('response', (r) => { if (r.status() >= 400 && !/uji-sandwich/.test(r.url())) gagalMuat.push(r.status() + ' ' + r.url()); });
    pg.on('dialog', (d) => d.accept());
    if (o.rute) await o.rute(pg);
    if (o.rekam) await pg.addInitScript(pantauRekaman);
    if (!o.tanpaTTS) await pg.addInitScript(mockTTS);
    else await pg.addInitScript(() => { try { delete window.speechSynthesis; window.speechSynthesis = undefined; window.SpeechSynthesisUtterance = undefined; } catch (_) {} });
    await pg.addInitScript(({ t, profil }) => {
      try {
        sessionStorage.setItem('insuranceHub.access.v3', 'ok');
        localStorage.setItem('insuranceHub.theme.v3', t);
        if (!localStorage.getItem('uji.sandwich')) {
          localStorage.setItem('insuranceHub.customerProfiles.v1', JSON.stringify([profil]));
          localStorage.setItem('uji.sandwich', '1');
        }
      } catch (_) {}
    }, { t: o.tema || 'original', profil: PROFIL });
    if (o.init) await pg.addInitScript(o.init);
    await pg.goto(URL);
    await pg.waitForTimeout(500);
    if (o.cepat !== 0) { const cdp = await ctx.newCDPSession(pg); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: o.cepat || 10 }); }
    return { ctx, pg };
  }
  const tunggu = async (pg, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { if (await pg.evaluate(fn, arg)) return true; await pg.waitForTimeout(80); } return false; };
  /* tunggu hub benar-benar tergambar (bukan jeda tetap) agar tidak rapuh saat mesin sibuk */
  const bukaHub = async (pg) => {
    await pg.evaluate(() => document.getElementById('btnSalesIdea').click());
    await tunggu(pg, () => !!document.querySelector('[data-si-choice="sandwich"]'), 15000); await pg.waitForTimeout(150);
  };
  const bukaSandwich = async (pg) => {
    await bukaHub(pg);
    await pg.evaluate(() => document.querySelector('[data-si-choice="sandwich"]').click());
    await tunggu(pg, () => !!document.querySelector('#salesIdeaContent .sgw'), 15000); await pg.waitForTimeout(250);
  };
  const st = (pg) => pg.evaluate(() => {
    const node = document.querySelector('#salesIdeaContent .sgw');
    const p = document.getElementById('sgwPilihan');
    return { status: document.getElementById('layarSalesIdea').getAttribute('data-sip-status'), count: document.getElementById('siStepCount').textContent,
      scene: node ? +node.dataset.sgw : 0, layar: (document.querySelector('.sgw-layar-utama') || {}).textContent || '',
      pilihan: !!(p && !p.hidden && p.getBoundingClientRect().height > 0), tampilan: p ? p.getAttribute('data-tampilan') : null,
      nPilihan: document.querySelectorAll('#sgwPilihan').length,
      kartuBawaan: !!(document.querySelector('#layarSalesIdea .sil-kartu') && !document.querySelector('#layarSalesIdea .sil-kartu').hidden) };
  });
  const keScene = async (pg, n) => { for (let i = 0; i < 20; i++) { const s = await st(pg); if (s.scene === n) return; await pg.keyboard.press(s.scene < n ? 'ArrowRight' : 'ArrowLeft'); await pg.waitForTimeout(150); } };
  const putar = (pg) => pg.evaluate(() => { if (document.getElementById('layarSalesIdea').getAttribute('data-sip-status') !== 'berputar') document.getElementById('siPlay').click(); });
  const sampaiPilihan = async (pg) => {
    await bukaSandwich(pg); await keScene(pg, 8); await putar(pg);
    return tunggu(pg, () => { const p = document.getElementById('sgwPilihan'); return p && !p.hidden; }, 60000);
  };
  const layarAktif = (pg) => pg.evaluate(() => (document.querySelector('section.layar.aktif') || {}).id || '');
  const elTujuan = (pg, kode) => pg.evaluate((k) => { const L = window.InsuranceHubNavigation && window.InsuranceHubNavigation.LAYAR[k]; return L ? L.el : null; }, kode);

  const kunciAwal = await (async () => { const { ctx, pg } = await buka(); const k = await pg.evaluate(() => Object.keys(localStorage).sort()); await ctx.close(); return k; })();

  /* ---------- A. registri ---------- */
  console.log('[A] Registri & pembukaan');
  if (ikut('A')) {
    const { ctx, pg } = await buka();
    await bukaHub(pg);
    const kartu = await pg.evaluate(() => [...document.querySelectorAll('[data-si-choice]')].map((b) => b.dataset.siChoice).join(','));
    cek(kartu === LAMA.concat('sandwich').join(','), 'hub: 7 Sales Idea lama tetap + Sandwich Generation di akhir', kartu);
    const label = await pg.evaluate(() => { const b = document.querySelector('[data-si-choice="sandwich"]'); return { span: b.querySelector('span').textContent, h3: b.querySelector('h3').textContent }; });
    cek(label.span === 'SALES IDEA 08' && label.h3 === 'Sandwich Generation', 'kartu hub: SALES IDEA 08 — Sandwich Generation', label);
    await pg.evaluate(() => document.querySelector('[data-si-choice="sandwich"]').click()); await pg.waitForTimeout(400);
    const a = await st(pg), k = await pg.evaluate(() => window.SalesIdea10Jari.keadaan());
    cek(a.status === 'siap' && a.scene === 1 && /Langkah 1 \/ 8/.test(a.count) && k.mode === 'sandwich' && k.total === 8, 'pemutar bersama: 8 scene, scene 1 siap tanpa autoplay', { a, k });
    const kepala = await pg.evaluate(() => ({ narasi: !!document.querySelector('.sgw .kbs-suara'), judul: document.querySelector('.sgw .si-presentation-brand b').textContent,
      tts: window.__tts.log.filter((x) => x.t === 'mulai').length, pemutarBaru: document.querySelectorAll('#layarSalesIdea .si-footer').length }));
    cek(kepala.narasi && kepala.judul === 'Sandwich Generation' && kepala.tts === 0 && kepala.pemutarBaru === 1, 'tombol Narasi bersama, judul topbar, narasi tidak berbunyi sendiri, tidak ada pemutar kedua', kepala);
    const urut = [];
    const aksen = [];
    for (let n = 1; n <= 8; n++) {
      await keScene(pg, n); const s = await st(pg); urut.push(s.scene + ':' + s.layar);
      aksen.push(await pg.evaluate((n) => {
        const st = document.querySelector('.sgw-stage'), latar = st.querySelector('.sgw-kamera .sgw-latar-svg'), objek = st.querySelector('.sgw-kamera .sgw-motif');
        const gerak = st.querySelectorAll('[data-a]').length;
        /* warna dari token tema: tidak ada isian hitam bawaan (var() yang gagal) */
        const isi = [...st.querySelectorAll('.sgw-motif [style*="fill:var"]')].map((e) => getComputedStyle(e).fill);
        const ids = [...st.querySelectorAll('[id]')].map((e) => e.id);
        const ganda = [...st.querySelectorAll('*')].filter((e) => (e.getAttribute('style') || '').split('style').length > 1).length;
        return { n, ok: !!(latar && objek) && gerak >= 6 && isi.length >= 8 && !isi.includes('rgb(0, 0, 0)') && ids.every((i) => i.startsWith('sgw' + n + '-')) && new Set(ids).size === ids.length && !ganda,
          gerak, isi: isi.length, kelas: st.className };
      }, n));
    }
    cek(aksen.every((x) => x.ok && x.kelas.includes('sgw-a' + x.n)), 'tiap scene: ilustrasi dua lapis (latar + objek), ≥6 elemen bergerak, warna dari token tema, id SVG unik per scene', aksen.filter((x) => !x.ok));
    cek(urut.join('|') === LAYAR.map((t, i) => (i + 1) + ':' + t).join('|'), '8 scene berurutan dengan teks layar yang benar', urut);
    const s8 = await pg.evaluate(() => (document.querySelector('.sgw-layar-pendukung') || {}).textContent);
    cek(s8 === PENDUKUNG_8, 'scene 8: teks pendukung "Tiga Generasi. Satu Keputusan."', s8);
    await bukaHub(pg);
    const ikon = await pg.evaluate(() => {
      const v = document.querySelector('[data-si-choice="sandwich"] .si-choice-visual'), svg = v && v.querySelector('svg.si-sandwich-ikon');
      const r = svg ? svg.getBoundingClientRect() : { width: 0, height: 0 };
      const lain = [...document.querySelectorAll('[data-si-choice]:not([data-si-choice="sandwich"]) .si-choice-visual')].map((x) => x.textContent.trim());
      return { svg: !!svg, rantai: /⛓/.test(v ? v.textContent : ''), w: r.width, h: r.height, lapis: svg ? svg.querySelectorAll('path,rect').length : 0, lain };
    });
    cek(ikon.svg && !ikon.rantai && ikon.w >= 60 && ikon.h >= 50 && ikon.lapis >= 5 && ikon.lain.join(' ') === '🖐️ 🧺 🎓 ⌛ 🏠 ✈️ 🛡️',
      'kartu hub Sandwich: ikon sandwich bertumpuk (SVG, bukan rantai); ikon kartu lain tetap', ikon);
    await pg.evaluate(() => document.querySelector('[data-si-choice="sandwich"]').click()); await pg.waitForTimeout(400);
    const tanpaTokoh = await pg.evaluate(() => !document.querySelector('#salesIdeaContent .psg-k, #salesIdeaContent [class*="karakter"]'));
    cek(tanpaTokoh, 'tidak memakai komponen PSGKarakter (ilustrasi khusus Sandwich)');
    await ctx.close();
  }

  /* ---------- B. naskah runtime = prompt = dokumen ---------- */
  console.log('[B] Naskah');
  if (ikut('B')) {
    const { ctx, pg } = await buka();
    const r = await pg.evaluate(() => ({ naskah: window.PSGSandwichStory.naskah(), scene: window.PSGSandwichStory.scene() }));
    cek(r.naskah.length === 8 && r.naskah.every((s, i) => s.length === 1 && s[0] === NASKAH[i]), 'naskah runtime = naskah prompt (8 scene, satu segmen per scene)', r.naskah);
    cek(r.scene.map((s) => s.layar).join('|') === LAYAR.join('|') && r.scene[7].pendukung === PENDUKUNG_8, 'teks layar runtime = prompt', r.scene.map((s) => s.layar));
    const md = fs.readFileSync(path.join(ROOT, 'docs/sales-idea-sandwich-generation-elevenlabs.md'), 'utf8');
    const dok = naskahDokumen(md);
    cek(dok.length === 8 && dok.every((d, i) => d.n === i + 1 && d.teks === NASKAH[i]), 'dokumen ElevenLabs: 8 scene, NASKAH AUDIO sama persis dengan runtime', dok.map((d) => d.n + ':' + d.teks.slice(0, 40)));
    cek(dok.every((d) => !/\n|“|”|"|\*|Teks layar|Arahan|visual/i.test(d.teks)), 'NASKAH AUDIO hanya berisi naskah (tanpa kutip, arahan visual, atau teks layar)');
    const tiapScene = md.split(/\n## SCENE /).slice(1);
    cek(tiapScene.length === 8 && tiapScene.every((b) => /\*\*Arahan suara:\*\*/.test(b) && /\*\*Estimasi durasi:\*\*/.test(b) && /\*\*Catatan jeda:\*\*/.test(b)),
      'dokumen ElevenLabs: tiap scene punya arahan suara, estimasi durasi, catatan jeda');
    cek(!/voice[_ ]?id\s*[:=]/i.test(md), 'dokumen ElevenLabs tidak menetapkan voice ID');
    /* nama berkas mengikuti pola rekaman yang dipakai narator: <cerita>-SNN-MM.mp3, satu segmen per scene */
    cek(tiapScene.every((b, i) => b.includes('**Nama file:** `sandwich-S' + String(i + 1).padStart(2, '0') + '-01.mp3`')) && /assets\/narasi\/sandwich\//.test(md),
      'dokumen ElevenLabs: tiap scene punya nama file sandwich-SNN-01.mp3 dan folder assets/narasi/sandwich/');
    /* suara = suara yang tercatat di semua manifest rekaman Sales Idea lain */
    const suaraLain = [...new Set(fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /^sales-idea-.*-audio\.js$/.test(f))
      .map((f) => (fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').match(/suara:\s*'([^']+)'/) || [])[1]))];
    cek(suaraLain.length === 1 && md.includes(suaraLain[0]), 'dokumen ElevenLabs memakai suara yang sama dengan semua Sales Idea berekaman (' + suaraLain.join(' | ') + ')', suaraLain);
    const sb = fs.readFileSync(path.join(ROOT, 'docs/sales-idea-sandwich-generation-storyboard.md'), 'utf8');
    cek(NASKAH.every((t) => sb.includes(t)) && LAYAR.every((t) => sb.includes(t)) && /Prompt visual/.test(sb) && /Daftar aset visual/.test(sb) && /Harus dibuat/.test(sb),
      'storyboard: naskah, teks layar, prompt visual, daftar aset dengan status');
    /* rekaman Bian terpasang: nama berkas di dokumen = berkas di folder = manifest */
    const isiFolder = fs.existsSync(path.join(ROOT, 'assets/narasi/sandwich')) ? fs.readdirSync(path.join(ROOT, 'assets/narasi/sandwich')).sort() : [];
    const man = await pg.evaluate(() => window.PSGSandwichAudio ? Object.values(window.PSGSandwichAudio.segmen).map((k) => k[0].audio) : null);
    const harapBerkas = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => 'sandwich-S0' + n + '-01.mp3');
    cek(JSON.stringify(isiFolder) === JSON.stringify(harapBerkas) && JSON.stringify(man) === JSON.stringify(harapBerkas) && harapBerkas.every((f) => md.includes('`' + f + '`')),
      'rekaman terpasang: 8 berkas di assets/narasi/sandwich/ = manifest PSGSandwichAudio = nama file di dokumen', { isiFolder, man });
    await ctx.close();
  }

  /* ---------- C. pemutar & halaman pilihan ---------- */
  console.log('[C] Pemutar & halaman pilihan');
  if (ikut('C')) {
    const { ctx, pg } = await buka({ rekam: true });
    await bukaSandwich(pg);
    /* putar berurutan: tiap scene sampai selesai lalu NEXT */
    let urut = true, pilihanDini = false;
    for (let n = 1; n <= 8; n++) {
      await putar(pg);
      const ok = await tunggu(pg, (m) => +document.querySelector('.sgw').dataset.sgw === m && document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 90000, n);
      if (!ok) urut = false;
      const s = await st(pg);
      if (n < 8 && s.pilihan) pilihanDini = true;
      if (n < 8) { await pg.evaluate(() => document.getElementById('siNext').click()); await pg.waitForTimeout(150); }
    }
    cek(urut && !pilihanDini, 'scene 1–8 diputar berurutan sampai selesai; halaman pilihan tidak muncul sebelum scene 8');
    const tampil = await tunggu(pg, () => { const p = document.getElementById('sgwPilihan'); return p && !p.hidden; }, 20000);
    const narasi = await pg.evaluate(() => { const k = window.__rek.klip.filter((x) => x.berkas === 'sandwich-S08-01.mp3'); return { s08: k.length, main: window.PSGNarasi.rekaman().main, tts: window.__tts.log.filter((x) => x.t === 'mulai').length }; });
    cek(tampil && narasi.s08 >= 1 && !narasi.main && narasi.tts === 0, 'halaman pilihan tampil sesudah scene 8 selesai dan rekaman S08 tuntas (suara browser tidak dipakai)', narasi);
    await pg.waitForTimeout(1200);
    let s = await st(pg);
    const isi = await pg.evaluate(() => ({ judul: document.getElementById('sgwPilihanJudul').textContent, pengantar: document.querySelector('.sgw-pilihan-pengantar').textContent,
      tombol: Object.fromEntries([...document.querySelectorAll('[data-sgw-pilih]')].map((b) => [b.dataset.sgwPilih, b.textContent.replace(/\s*→\s*$/, '').trim()])),
      lain: !!document.querySelector('#sgwPilihan [data-sgw-lain]') }));
    cek(s.pilihan && s.nPilihan === 1 && !s.kartuBawaan && s.tampilan === 'utama', 'satu halaman pilihan (tanpa duplikat), tanpa kartu "Mari Kita Hitung"', s);
    cek(isi.judul === 'Rantai Itu Putus di Aku. Mulai dari Mana?' && isi.pengantar === 'Setiap keluarga memiliki kondisi finansial dan kebutuhan yang berbeda. Pilih hal yang paling ingin Anda siapkan terlebih dahulu. Anda tidak harus memutuskan produk sekarang.',
      'judul & pengantar halaman pilihan sesuai', isi);
    cek(JSON.stringify(isi.tombol) === JSON.stringify(TOMBOL) && isi.lain, 'lima pilihan A–E dengan label tombol sesuai + Bahas Topik Lain', isi.tombol);
    /* kesehatan → tiga tools, kembali */
    await pg.evaluate(() => document.querySelector('[data-sgw-pilih="C"]').click()); await pg.waitForTimeout(200);
    const kes = await pg.evaluate(() => ({ tampilan: document.getElementById('sgwPilihan').getAttribute('data-tampilan'), judul: document.getElementById('sgwPilihanJudul').textContent,
      alat: [...document.querySelectorAll('[data-sgw-kesehatan]')].map((b) => b.dataset.sgwKesehatan), h3: [...document.querySelectorAll('#sgwPilihan h3')].map((h) => h.textContent),
      layar: (document.querySelector('section.layar.aktif') || {}).id }));
    cek(kes.tampilan === 'kesehatan' && kes.judul === 'Pilih Tools Perlindungan Kesehatan' && kes.alat.join(',') === 'GSPA,BSL,GHP' && kes.layar === 'layarSalesIdea',
      'C: halaman tiga alternatif tools kesehatan (masih di Sales Idea)', kes);
    cek(kes.h3.join('|') === 'Gen Aman + Rider GHPS & Waiver|BeSMART Lite - 100|GenPro + Rider GHP', 'nama tools = judul layar resmi aplikasi', kes.h3);
    /* replay: halaman hilang; selesai lagi → mulai dari daftar utama */
    await pg.evaluate(() => document.getElementById('siReplay').click()); await pg.waitForTimeout(300);
    s = await st(pg);
    cek(!s.pilihan && s.scene === 1, 'Replay: halaman pilihan disembunyikan, kembali ke scene 1', s);
    await keScene(pg, 8); await putar(pg);
    await tunggu(pg, () => { const p = document.getElementById('sgwPilihan'); return p && !p.hidden; }, 60000);
    s = await st(pg);
    cek(s.pilihan && s.tampilan === 'utama' && s.nPilihan === 1, 'selesai lagi: halaman pilihan mulai dari daftar utama (pilihan lama tidak terbawa)', s);
    /* Bahas Topik Lain → hub */
    await pg.evaluate(() => document.querySelector('#sgwPilihan [data-sgw-lain]').click()); await pg.waitForTimeout(350);
    const hub = await pg.evaluate(() => ({ mode: window.SalesIdea10Jari.keadaan().mode, layar: (document.querySelector('section.layar.aktif') || {}).id, kartu: document.querySelectorAll('[data-si-choice]').length }));
    cek(hub.mode === 'hub' && hub.layar === 'layarSalesIdea' && hub.kartu === 8, 'Bahas Topik Lain → hub Sales Idea (8 kartu)', hub);
    /* buka ulang: tidak mewarisi halaman pilihan */
    await pg.evaluate(() => document.querySelector('[data-si-choice="sandwich"]').click()); await pg.waitForTimeout(400);
    s = await st(pg);
    cek(!s.pilihan && s.status === 'siap' && s.scene === 1, 'buka ulang video: scene 1 siap, halaman pilihan tidak tampil', s);
    await keScene(pg, 8); await pg.waitForTimeout(400);
    s = await st(pg);
    cek(!s.pilihan, 'pindah ke scene 8 tanpa memutar: halaman pilihan belum tampil', s);
    await ctx.close();

    /* tanpa Web Speech: rekaman tetap dipakai, pemutar selesai */
    const b = await buka({ tanpaTTS: true, rekam: true });
    const ok = await sampaiPilihan(b.pg);
    const s2 = await st(b.pg), r2 = await b.pg.evaluate(() => window.__rek.klip.map((x) => x.berkas));
    cek(ok && s2.status === 'selesai' && s2.pilihan && r2.includes('sandwich-S08-01.mp3'), 'tanpa Web Speech: rekaman S08 diputar, scene 8 selesai, halaman pilihan tampil', { s2, r2 });
    await b.ctx.close();
    /* MP3 gagal dimuat: segmen sunyi, TIDAK jatuh ke suara browser; pemutar & halaman pilihan tetap jalan */
    const nErr = errs.length;
    const c = await buka({ rekam: true, rute: (pg) => pg.route(/assets\/narasi\/sandwich\/.*\.mp3/, (r) => r.abort('failed')) });
    const ok3 = await sampaiPilihan(c.pg);
    const s3 = await st(c.pg), x3 = await c.pg.evaluate(() => ({ tts: window.__tts.log.filter((x) => x.t === 'mulai').length, main: window.PSGNarasi.rekaman().main }));
    cek(ok3 && s3.status === 'selesai' && s3.pilihan && x3.tts === 0 && !x3.main, 'MP3 gagal dimuat: scene 8 tetap selesai, halaman pilihan tampil, tanpa suara browser pengganti', { s3, x3 });
    await c.ctx.close();
    errs.splice(nErr);   /* galat muat MP3 yang disengaja bukan galat aplikasi */
  }

  /* ---------- D. routing ---------- */
  console.log('[D] Routing');
  if (ikut('D')) {
    const { ctx, pg } = await buka();
    const jalur = async (kode, alat) => {
      const ok = await sampaiPilihan(pg);
      await pg.evaluate((k) => document.querySelector('[data-sgw-pilih="' + k + '"]').click(), kode); await pg.waitForTimeout(200);
      if (alat) { await pg.evaluate((a) => document.querySelector('[data-sgw-kesehatan="' + a + '"]').click(), alat); await pg.waitForTimeout(200); }
      const profil = await pg.evaluate(() => ({ layar: (document.querySelector('section.layar.aktif') || {}).id, banner: !!(document.getElementById('cpLanjut') && !document.getElementById('cpLanjut').hidden),
        konteks: window.InsuranceHubCustomerProfile.konteks(), tindak: window.PSGSandwichPilihan.tindakLanjut() }));
      await pg.evaluate(() => document.querySelector('[data-cp-use]').click());
      await pg.waitForTimeout(700);
      return { ok, profil, layar: await layarAktif(pg) };
    };
    const riderYa = (id) => pg.evaluate((r) => { const b = document.querySelector('#' + r + ' button[data-nilai="Ya"]'); return b ? b.getAttribute('aria-pressed') : null; }, id);
    const nilai = (id) => pg.evaluate((i) => (document.getElementById(i) || {}).value || '', id);

    let r = await jalur('A');
    const segitiga = await elTujuan(pg, 'SEGITIGA');
    cek(r.ok && r.profil.layar === 'layarProfile' && r.profil.banner && r.profil.konteks && r.profil.konteks.target === 'SEGITIGA', 'A: lewat Profil dengan konteks lanjutan ke SEGITIGA', r.profil);
    cek(segitiga === 'layarSegitiga' && r.layar === segitiga, 'A → Segitiga Financial (layarSegitiga)', r);

    r = await jalur('B');
    cek(r.layar === (await elTujuan(pg, 'DP')) && r.layar === 'layarDP' && await nilai('dNama') === PROFIL.nama, 'B → Kebutuhan Dana Pensiun (layarDP), nama profil terisi', { r, nama: await nilai('dNama') });
    /* seperti agen: isi satu komponen biaya hidup bulanan, kebutuhan dihitung otomatis */
    await pg.evaluate(() => { const i = document.querySelector('#dKomponen input'); i.value = '8.000.000'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    await tunggu(pg, () => window.__dpHasilTerakhir && window.__dpHasilTerakhir.target > 0, 8000);
    const solusi = await tunggu(pg, () => !!document.getElementById('dTblSolusi'), 8000);
    const labelSolusi = await pg.evaluate(() => (document.getElementById('dTblSolusi') || {}).textContent);
    cek(solusi && /Lite Future/.test(labelSolusi), 'B: sesudah kebutuhan dihitung tersedia lanjutan "Solusi — penuhi dengan Lite Future"', labelSolusi);
    await pg.evaluate(() => document.getElementById('dTblSolusi').click()); await pg.waitForTimeout(500);
    const dps = await pg.evaluate(() => ({ layar: (document.querySelector('section.layar.aktif') || {}).id, isi: (document.querySelector('section.layar.aktif') || {}).textContent || '' }));
    cek(dps.layar === 'layarDpSolusi' && /BeSMART Lite Future|Lite Future/.test(dps.isi), 'B lanjutan → Solusi Dana Pensiun dari BeSMART Lite Future (layarDpSolusi)', { layar: dps.layar });

    for (const [alat, rider, namaId] of [['GSPA', 'gRider', 'gNama'], ['BSL', 'bRider', 'bNama'], ['GHP', 'hRider', 'hNama']]) {
      const sebelum = await pg.evaluate((x) => { const b = document.querySelector('#' + x + ' button[data-nilai="Ya"]'); return b ? b.getAttribute('aria-pressed') : null; }, rider);
      r = await jalur('C', alat);
      const el = await elTujuan(pg, alat);
      cek(r.profil.konteks && r.profil.konteks.target === alat && r.profil.tindak && r.profil.tindak.rider === rider, 'C/' + alat + ': lewat Profil, tindak lanjut rider ' + rider, r.profil);
      cek(r.layar === el, 'C/' + alat + ' → ' + el, r);
      const ya = await riderYa(rider);
      cek(ya === 'true' && await nilai(namaId) === PROFIL.nama, 'C/' + alat + ': rider kesehatan "Ya" lewat tombol segmen resmi (sebelumnya ' + sebelum + '), nama profil terisi', { ya, nama: await nilai(namaId) });
      cek(await pg.evaluate(() => window.PSGSandwichPilihan.tindakLanjut()) === null, 'C/' + alat + ': tindak lanjut selesai dan dihapus dari memori');
    }

    for (const [kode, sorot, bukan] of [['D', ['naCI', 'naCIMonths'], ['naCoverage', 'naMasaPengganti']], ['E', ['naCoverage', 'naMasaPengganti'], ['naCI', 'naCIMonths']]]) {
      r = await jalur(kode);
      const s = await pg.evaluate(([a, b]) => ({ ya: a.map((i) => document.getElementById(i).closest('div').classList.contains('sgw-sorot')), tidak: b.map((i) => document.getElementById(i).closest('div').classList.contains('sgw-sorot')) }), [sorot, bukan]);
      cek(r.layar === 'layarNeeds' && r.profil.konteks.target === 'NEEDS', kode + ' → Analisis Kebutuhan (layarNeeds)', r);
      cek(s.ya.every(Boolean) && !s.tidak.some(Boolean), kode + ': kolom ' + sorot.join('/') + ' disorot, kolom lain tidak', s);
      const solusiNa = await pg.evaluate(() => { document.getElementById('naPenghasilan').value = '15000000'; document.getElementById('naUsia').value = '40'; document.getElementById('naHitung').click(); return !!document.getElementById('naSolusi'); });
      cek(solusiNa, kode + ': hasil Analisis Kebutuhan menawarkan lanjutan "Solusi" (Perbandingan Solusi)');
    }

    /* meninggalkan Profil membatalkan tindak lanjut: rider tidak diubah diam-diam */
    await pg.evaluate(() => { document.querySelector('#gRider button[data-nilai="Tidak"]').click(); });
    await sampaiPilihan(pg);
    await pg.evaluate(() => document.querySelector('[data-sgw-pilih="C"]').click()); await pg.waitForTimeout(150);
    await pg.evaluate(() => document.querySelector('[data-sgw-kesehatan="GSPA"]').click()); await pg.waitForTimeout(200);
    await pg.evaluate(() => window.InsuranceHubNavigation.bukaLayar('PRODUK')); await pg.waitForTimeout(200);
    await pg.evaluate(() => window.InsuranceHubNavigation.bukaLayar('GSPA')); await pg.waitForTimeout(500);
    const batal = { tindak: await pg.evaluate(() => window.PSGSandwichPilihan.tindakLanjut()), ya: await riderYa('gRider'), konteks: await pg.evaluate(() => window.InsuranceHubCustomerProfile.konteks()) };
    cek(batal.tindak === null && batal.ya === 'false' && batal.konteks === null, 'keluar dari Profil sebelum memilih: tindak lanjut & konteks batal, rider GHPS tidak diubah', batal);
    await ctx.close();
  }

  /* ---------- E. Sales Idea lain ---------- */
  console.log('[E] Sales Idea lain');
  if (ikut('E')) {
    const { ctx, pg } = await buka();
    await bukaHub(pg);
    await pg.evaluate(() => document.querySelector('[data-si-choice="asset"]').click()); await pg.waitForTimeout(400);
    for (let i = 0; i < 12; i++) { const k = await pg.evaluate(() => window.SalesIdea10Jari.keadaan()); if (k.indeks >= k.total - 1) break; await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(150); }
    await putar(pg);
    const ok = await tunggu(pg, () => [...document.querySelectorAll('#layarSalesIdea .sil-kartu button')].some((x) => x.getBoundingClientRect().height > 0), 90000);
    const l = await pg.evaluate(() => ({ hitung: document.getElementById('silHitung').textContent, lain: document.getElementById('silLain').textContent, pilihan: !!(document.getElementById('sgwPilihan') && !document.getElementById('sgwPilihan').hidden) }));
    cek(ok && l.hitung === 'Mari Kita Hitung →' && l.lain === 'Bahas Topik Lain' && !l.pilihan, 'Asset Creation tetap memakai kartu "Mari Kita Hitung", tanpa halaman pilihan Sandwich', l);
    await pg.evaluate(() => document.getElementById('silHitung').click()); await pg.waitForTimeout(300);
    const k = await pg.evaluate(() => window.InsuranceHubCustomerProfile.konteks());
    cek(k && k.target === 'R2' && k.topic === 'asset', 'Asset: Mari Kita Hitung tetap ke R2 lewat Profil', k);
    await ctx.close();
  }

  /* ---------- F. media realistis opsional ---------- */
  console.log('[F] Media opsional');
  if (ikut('F')) {
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
    const { ctx, pg } = await buka({
      init: () => { window.PSGSandwichVisual = { folder: 'assets/uji-sandwich/', scene: { S01: { gambar: 's01.png' } } }; },
      rute: async (p) => { await p.route('**/assets/uji-sandwich/**', (rt) => rt.fulfill({ status: 200, contentType: 'image/png', body: PNG })); }
    });
    await bukaSandwich(pg);
    const m1 = await pg.evaluate(() => ({ img: !!document.querySelector('.sgw-stage img.sgw-media'), motif: getComputedStyle(document.querySelector('.sgw-motif')).display, kelas: document.querySelector('.sgw-stage').classList.contains('sgw-ada-media') }));
    await keScene(pg, 2);
    const m2 = await pg.evaluate(() => ({ img: !!document.querySelector('.sgw-stage .sgw-media'), motif: getComputedStyle(document.querySelector('.sgw-motif')).display }));
    cek(m1.img && m1.kelas && m1.motif === 'none' && !m2.img && m2.motif !== 'none', 'manifest PSGSandwichVisual: scene 1 memakai gambar, scene 2 tetap latar bawaan', { m1, m2 });
    await ctx.close();
  }

  /* ---------- G. responsif ---------- */
  console.log('[G] Responsif');
  if (ikut('G')) {
    let masalah = [];
    for (const u of ['320x568', '390x844', '768x1024', '1366x768', '844x390']) for (const tema of ['original', 'dark']) {
      const [w, h] = u.split('x').map(Number);
      const { ctx, pg } = await buka({ tema, ctx: { viewport: { width: w, height: h }, hasTouch: w < 900 } });
      await bukaSandwich(pg);
      for (let n = 1; n <= 8; n++) {
        await keScene(pg, n); await pg.waitForTimeout(80);
        const r = await pg.evaluate(() => {
          const s = document.querySelector('.sgw-stage').getBoundingClientRect(), t = document.querySelector('.sgw-layar-utama').getBoundingClientRect();
          const x = document.querySelector('.sgw-text').getBoundingClientRect();
          return { dalam: t.left >= s.left - 1 && t.right <= s.right + 1 && t.top >= s.top - 1 && t.bottom <= s.bottom + 1, tinggiPanggung: s.height, luber: document.documentElement.scrollWidth > innerWidth + 1, teks: x.right <= innerWidth + 1 };
        });
        if (!r.dalam || r.luber || !r.teks || r.tinggiPanggung < 120) masalah.push(u + '/' + tema + '/scene ' + n + ': ' + JSON.stringify(r));
      }
      await putar(pg);
      await tunggu(pg, () => { const p = document.getElementById('sgwPilihan'); return p && !p.hidden; }, 60000);
      /* ukur posisi akhir: panel masuk dengan translateY(12px) → 0 selama 0,28 s */
      await tunggu(pg, () => { const p = document.getElementById('sgwPilihan'); return p.classList.contains('sil-tampil') && getComputedStyle(p).transform === 'none'; }, 5000);
      const p = await pg.evaluate(() => {
        const r = document.getElementById('sgwPilihan').getBoundingClientRect();
        const tombol = [...document.querySelectorAll('#sgwPilihan button')].map((b) => b.getBoundingClientRect()).filter((b) => b.width > 0);
        const footer = document.querySelector('#layarSalesIdea .si-footer'); const f = footer ? footer.getBoundingClientRect() : null;
        return { kiri: r.left, kanan: r.right, atas: r.top, bawah: r.bottom, tombolKecil: tombol.filter((b) => b.height < 44).length, footerTerlihat: !f || f.top >= r.bottom - 1, gulir: getComputedStyle(document.getElementById('sgwPilihan')).overflowY };
      });
      if (p.kiri < 0 || p.kanan > w + 1 || p.atas < 0 || p.bawah > h + 1 || p.tombolKecil || !p.footerTerlihat || p.gulir !== 'auto') masalah.push(u + '/' + tema + '/pilihan: ' + JSON.stringify(p));
      await ctx.close();
    }
    cek(!masalah.length, 'responsif 5 ukuran × 2 tema: teks layar di dalam panggung, tanpa luber, halaman pilihan dalam layar dan di atas kontrol, tombol ≥44 px', masalah.slice(0, 6));
  }

  /* ---------- H. storage & error ---------- */
  console.log('[H] Storage & error');
  if (ikut('H')) {
    const { ctx, pg } = await buka();
    await sampaiPilihan(pg);
    const k = await pg.evaluate(() => Object.keys(localStorage).sort());
    const baru = k.filter((x) => !kunciAwal.includes(x));
    cek(!baru.length && !k.some((x) => /sandwich/i.test(x) && x !== 'uji.sandwich'), 'tidak ada storage key baru dari Sales Idea 08', baru);
    await ctx.close();
    const SRC = fs.readFileSync(path.join(ROOT, 'src/sales-idea-sandwich.js'), 'utf8');
    cek(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|elevenlabs/i.test(SRC.replace(/\/\*[\s\S]*?\*\//g, '')), 'modul tanpa penyimpanan, tanpa panggilan jaringan, tanpa layanan suara eksternal');
    cek(!errs.length, 'tidak ada error JavaScript', errs.slice(0, 5));
    cek(!gagalMuat.length, 'tidak ada berkas gagal dimuat', gagalMuat.slice(0, 5));
  }


  /* ---------- I. narasi rekaman Bian ---------- */
  console.log('[I] Narasi rekaman (MP3 voice Bian)');
  if (ikut('I')) {
    const ID = (n) => 'S' + String(n).padStart(2, '0') + '-01';
    const wM = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'src/sales-idea-sandwich-audio.js'), 'utf8'))(wM);
    const M = wM.PSGSandwichAudio || { segmen: {} };
    /* I1. manifest, berkas, decode, timing */
    {
      const { ctx, pg } = await buka();
      const naskah = await pg.evaluate(() => window.PSGSandwichStory.naskah());
      const kunci = Object.keys(M.segmen);
      cek(naskah.length === 8 && naskah.every((x) => x.length === 1) && JSON.stringify(kunci) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8].map(ID)),
        'manifest: 8 segmen S01-01 … S08-01 = naskah (satu segmen per scene)', kunci);
      cek(M.folder === 'assets/narasi/sandwich/' && M.suara === 'Bian — Neutral, Calm and Clear' &&
        kunci.every((k) => M.segmen[k].length === 1 && M.segmen[k][0].audio === 'sandwich-' + k + '.mp3' && M.segmen[k][0].start === 0 && M.segmen[k][0].end > 5),
        'satu klip per scene: sandwich-SNN-01.mp3, start 0, diputar utuh; suara Bian; folder assets/narasi/sandwich/');
      const dec = await pg.evaluate(async (daftar) => {
        const ac = new OfflineAudioContext(1, 1, 44100), out = [];
        for (const [k, f, end] of daftar) {
          try {
            const a = await ac.decodeAudioData(await (await fetch('assets/narasi/sandwich/' + f)).arrayBuffer()), d = a.getChannelData(0);
            let q = 0, n = 0; for (let i = 0; i < d.length; i += 7) { q += d[i] * d[i]; n++; }
            out.push({ k, durasi: Math.round(a.duration * 1000) / 1000, selisih: Math.round(Math.abs(a.duration - end) * 1000), rms: Math.round(Math.sqrt(q / n) * 1000) / 1000 });
          } catch (e) { out.push({ k, galat: String(e) }); }
        }
        return out;
      }, kunci.map((k) => [k, M.segmen[k][0].audio, M.segmen[k][0].end]));
      const buruk = dec.filter((x) => x.galat || x.selisih > 5 || !(x.rms > 0.01));
      cek(dec.length === 8 && !buruk.length, '8 berkas dimuat & di-decode Chromium; end manifest = durasi berkas (±5 md); berisi suara — ' + dec.map((x) => x.k + ' ' + x.durasi + ' dtk').join(', '), buruk);
      const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
      cek(html.indexOf('src/sales-idea-sandwich-audio.js') > 0 && html.indexOf('src/sales-idea-sandwich-audio.js') < html.indexOf('src/sales-idea-sandwich.js') &&
        kunci.every((k) => sw.includes("'./assets/narasi/sandwich/sandwich-" + k + ".mp3'")) && sw.includes('./src/sales-idea-sandwich-audio.js'),
        'manifest dimuat sebelum modul cerita; 8 MP3 + manifest di precache service worker');
      const tim = await pg.evaluate(() => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => window.PSGSandwichStory.ketukan(n)));
      const kurang = tim.map((k, i) => k.D[0] < Math.round(M.segmen[ID(i + 1)][0].end * 1000) + 700 ? ID(i + 1) : null).filter(Boolean);
      const total = tim.reduce((a, k) => a + k.akhir, 0) / 1000;
      cek(!kurang.length && total > 84 && total < 100, 'durasi scene mengikuti rekaman: tiap scene ≥ rekaman + 0,7 dtk; total timeline ' + total.toFixed(1) + ' dtk', kurang);
      await ctx.close();
    }
    /* I2. putar penuh waktu nyata (1×): klip berurutan, utuh, tanpa tumpang tindih */
    {
      const { ctx, pg } = await buka({ rekam: true, cepat: 0 });
      await bukaSandwich(pg); await putar(pg);
      const buruk = [], tumpang = [], lewat = [];
      for (let n = 1; n <= 8; n++) {
        if (n > 1) { await pg.evaluate(() => document.getElementById('siNext').click()); }
        const ok = await tunggu(pg, (a) => window.__rek.klip.some((x) => x.adegan === a) && !window.PSGNarasi.rekaman().main &&
          +document.querySelector('.sgw').dataset.sgw === a && document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 60000, n);
        await pg.waitForTimeout(150);
        const d = await pg.evaluate((a) => window.__rek.klip.filter((x) => x.adegan === a).map((x) => Object.assign({}, x)), n);
        const k = M.segmen[ID(n)][0];
        if (!ok || d.length !== 1 || d[0].berkas !== k.audio) { buruk.push('scene ' + n + ': ' + JSON.stringify(d.map((x) => x.berkas))); continue; }
        const henti = d[0].berhenti != null ? d[0].berhenti : d[0].akhir;
        if (d[0].mulai == null || d[0].mulai > 0.02) buruk.push(ID(n) + ' mulai ' + d[0].mulai);
        if (henti < k.end - 0.3) buruk.push(ID(n) + ' terpotong ' + henti + ' < ' + k.end);
        if (d[0].akhir > k.end + 0.12) buruk.push(ID(n) + ' melewati akhir');
        const g = await pg.evaluate((a) => { const kl = window.__rek.klip.find((x) => x.adegan === a); const sel = window.__rek.status.find((x) => x.s === 'selesai' && x.t > kl.tPlay); return { tStop: kl.tStop, tSel: sel ? sel.t : null }; }, n);
        if (g.tStop == null || g.tSel == null || g.tStop - g.tSel > 20) lewat.push('scene ' + n);
      }
      const all = await pg.evaluate(() => window.__rek.klip.map((x) => ({ tPlay: x.tPlay, tStop: x.tStop })));
      all.forEach((x, i) => { const y = all[i - 1]; if (i && (y.tStop == null || x.tPlay < y.tStop)) tumpang.push(i + 1); });
      const x = await pg.evaluate(() => ({ nAudio: window.__rek.nAudio, tts: window.__tts.log.filter((u) => u.t === 'mulai').length }));
      cek(!buruk.length, '8 scene: tiap scene memutar MP3-nya sendiri (S01→scene 1 … S08→scene 8), dari awal sampai habis (waktu nyata)', buruk);
      cek(!tumpang.length && !lewat.length, 'tanpa tumpang tindih antar-klip; narasi tiap scene selesai sebelum scene selesai', { tumpang, lewat });
      cek(x.nAudio === 1 && x.tts === 0, 'satu elemen audio; suara browser tidak pernah dipakai saat rekaman tersedia', x);
      const p = await tunggu(pg, () => { const q = document.getElementById('sgwPilihan'); return q && !q.hidden; }, 10000);
      cek(p, 'sesudah rekaman S08 selesai: halaman pilihan tampil');
      await ctx.close();
    }
    /* I3. PAUSE / RESUME / NEXT di tengah narasi / CLOSE */
    {
      const { ctx, pg } = await buka({ rekam: true, cepat: 0 });
      await bukaSandwich(pg); await keScene(pg, 5); await putar(pg);
      await tunggu(pg, () => { const r = window.PSGNarasi.rekaman(); return r.main && r.adegan === 5 && window.__rek.el.currentTime > 1.5; }, 15000);
      await pg.evaluate(() => document.getElementById('siPlay').click()); await pg.waitForTimeout(300);
      const sumber = () => pg.evaluate(() => ({ status: document.getElementById('layarSalesIdea').getAttribute('data-sip-status'), main: window.PSGNarasi.rekaman().main,
        jeda: window.__rek.el.paused, pos: window.__rek.el.currentTime, n: window.__rek.klip.length }));
      const a = await sumber();
      cek(a.status === 'jeda' && a.jeda && !a.main, 'PAUSE: audio berhenti', a);
      await pg.evaluate(() => document.getElementById('siPlay').click()); await pg.waitForTimeout(700);
      const b = await sumber();
      cek(b.main && b.pos > a.pos && b.pos < a.pos + 1.5 && b.n === a.n + 1 && await pg.evaluate(() => window.__rek.nAudio) === 1, 'RESUME: lanjut dari posisi jeda, satu elemen audio (tanpa dobel)', { a, b });
      const n0 = await pg.evaluate(() => window.__rek.klip.length);
      await pg.evaluate(() => document.getElementById('siNext').click());
      await tunggu(pg, (m) => window.__rek.klip.length > m && window.__rek.klip[window.__rek.klip.length - 1].adegan === 6, 10000, n0);
      const nx = await pg.evaluate((m) => { const k = window.__rek.klip; return { lamaStop: k[m - 1].tStop, baruPlay: (k.find((x, i) => i >= m && x.adegan === 6) || {}).tPlay, baru: (k.find((x, i) => i >= m && x.adegan === 6) || {}).berkas }; }, n0);
      cek(nx.baru === 'sandwich-S06-01.mp3' && nx.lamaStop != null && nx.baruPlay >= nx.lamaStop, 'NEXT di tengah narasi: S05 berhenti sebelum S06 mulai', nx);
      await pg.evaluate(() => document.querySelector('#layarSalesIdea .si-close').click()); await pg.waitForTimeout(800);
      const t = await pg.evaluate(() => ({ main: window.PSGNarasi.rekaman().main, jeda: window.__rek.el.paused, n: window.__rek.klip.length }));
      await pg.waitForTimeout(1500);
      cek(!t.main && t.jeda && await pg.evaluate(() => window.__rek.klip.length) === t.n, 'CLOSE: audio berhenti, tidak ada klip baru', t);
      await ctx.close();
    }
  }

  /* ---------- J. unduh video portrait & landscape ---------- */
  console.log('[J] Unduh video (dua format)');
  if (ikut('J')) {
    const crypto = require('crypto');
    const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    const V = { L: { terang: ['assets/video/sandwich-terang.mp4', 'PSG-Sandwich-Generation-Light.mp4'], gelap: ['assets/video/sandwich-gelap.mp4', 'PSG-Sandwich-Generation-Dark.mp4'] },
      P: { terang: ['assets/video/sandwich-terang-portrait.mp4', 'PSG-Sandwich-Generation-Light-Portrait.mp4'], gelap: ['assets/video/sandwich-gelap-portrait.mp4', 'PSG-Sandwich-Generation-Dark-Portrait.mp4'] } };
    /* J1. keempat MP4: resolusi, trek audio, durasi = total timeline (narasi tidak terpotong) */
    {
      const { ctx, pg } = await buka();
      const total = await pg.evaluate(() => [1, 2, 3, 4, 5, 6, 7, 8].reduce((a, n) => a + window.PSGSandwichStory.ketukan(n).akhir, 0) / 1000);
      await ctx.close();
      const audioTotal = Object.values((() => { const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'src/sales-idea-sandwich-audio.js'), 'utf8'))(w); return w.PSGSandwichAudio.segmen; })()).reduce((a, k) => a + k[0].end, 0);
      const info = [];
      for (const [jenis, lb, tg] of [['L', 1280, 720], ['P', 720, 1280]]) for (const tema of ['terang', 'gelap']) {
        const f = path.join(ROOT, V[jenis][tema][0]);
        if (!fs.existsSync(f)) { info.push({ f: V[jenis][tema][0], ada: false }); continue; }
        const m = infoMp4(f), vid = m.trek.find((t) => t.jenis === 'vide'), aud = m.trek.find((t) => t.jenis === 'soun');
        info.push({ f: V[jenis][tema][0], ada: true, mb: +(fs.statSync(f).size / 1e6).toFixed(1), durasi: +m.durasi.toFixed(2), lebar: vid && vid.lebar, tinggi: vid && vid.tinggi, audio: !!aud,
          ok: !!vid && vid.lebar === lb && vid.tinggi === tg && !!aud && Math.abs(m.durasi - total) < 0.5 && m.durasi > audioTotal + 5 });
      }
      cek(info.length === 4 && info.every((x) => x.ok), 'MP4: landscape 1280×720 & portrait 720×1280 (terang/gelap), ada trek audio, durasi ≈ total timeline ' + total.toFixed(1) + ' dtk (> audio ' + audioTotal.toFixed(1) + ' dtk)', info);
    }
    /* J2. lompat ke scene 8 → tidak sah, tombol tidak tampil */
    {
      const { ctx, pg } = await buka({ cepat: 16 });
      await bukaSandwich(pg); await keScene(pg, 8); await putar(pg);
      await tunggu(pg, () => document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 60000);
      const a = await pg.evaluate(() => window.PSGUnduhVideo.keadaan());
      cek(a.cerita === 'sandwich' && a.videoSiap === true && a.status === 'tidak-sah' && !a.tombol && !a.tombolPotret, 'lompat ke scene 8 → tidak sah, kedua tombol tidak tampil', a);
      await ctx.close();
    }
    /* J3. tonton utuh waktu nyata (HP & desktop) → dua tombol, unduhan = berkas repo */
    for (const [nama, opsiCtx] of [['HP', { acceptDownloads: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
      ['desktop', { acceptDownloads: true, viewport: { width: 1366, height: 768 } }]]) {
      const { ctx, pg } = await buka({ cepat: 0, ctx: opsiCtx });
      await bukaSandwich(pg);
      let ok = true, sebelum = null;
      for (let n = 1; n <= 8; n++) {
        await pg.evaluate((m) => document.getElementById(m === 1 ? 'siPlay' : 'siNext').click(), n);
        if (!await tunggu(pg, (m) => +document.querySelector('.sgw').dataset.sgw === m && document.getElementById('layarSalesIdea').getAttribute('data-sip-status') === 'selesai', 60000, n)) { ok = false; break; }
        if (n === 7) sebelum = await pg.evaluate(() => window.PSGUnduhVideo.keadaan());
      }
      await tunggu(pg, () => { const q = document.getElementById('sgwPilihan'); return q && !q.hidden; }, 15000);
      await pg.waitForTimeout(700);
      const akhir = await pg.evaluate(() => window.PSGUnduhVideo.keadaan());
      cek(ok && sebelum && !sebelum.tombol && !sebelum.tombolPotret, nama + ': sebelum scene 8 selesai kedua tombol belum tampil', sebelum);
      cek(ok && akhir.status === 'selesai' && akhir.tombol && akhir.tombolPotret, nama + ': tonton utuh tanpa skip → dua tombol unduh tampil', akhir);
      const link = () => pg.evaluate(() => [...document.querySelectorAll('#layarSalesIdea .sip-unduh')].filter((x) => !x.hidden).map((x) => {
        const r = x.getBoundingClientRect(), atas = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { teks: x.textContent, href: x.getAttribute('href'), nama: x.getAttribute('download'), potret: x.classList.contains('sip-unduh-potret'), kiri: r.left, atas: r.top,
          terlihat: r.width > 0 && r.bottom <= innerHeight && r.right <= innerWidth + 1, tinggi: r.height, tidakTertutup: !!atas && (atas === x || x.contains(atas)) };
      }).sort((a, b) => (a.atas - b.atas) || (a.kiri - b.kiri)));
      for (const tema of ['terang', 'gelap']) {
        if (tema === 'gelap') { await pg.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await pg.waitForTimeout(500); }
        const t = await link();
        const p = t.find((x) => x.potret), l = t.find((x) => !x.potret);
        cek(t.length === 2 && p && l && p.teks === '⬇ Download Video Portrait (9:16)' && l.teks === '⬇ Download Video Landscape (16:9)' &&
          p.href === V.P[tema][0] && p.nama === V.P[tema][1] && l.href === V.L[tema][0] && l.nama === V.L[tema][1] && t[0].potret &&
          t.every((x) => x.terlihat && x.tidakTertutup && x.tinggi >= 36), nama + ', ' + tema + ': Portrait (9:16) lalu Landscape (16:9), berkas sesuai tema, terlihat & tidak tertutup halaman pilihan', t);
        for (const [sel, harap] of [['#layarSalesIdea .sip-unduh-potret', V.P[tema]], ['#layarSalesIdea .sip-unduh:not(.sip-unduh-potret)', V.L[tema]]]) {
          const [d] = await Promise.all([pg.waitForEvent('download', { timeout: 60000 }), pg.click(sel)]);
          const f = await d.path();
          cek(d.suggestedFilename() === harap[1] && sha(f) === sha(path.join(ROOT, harap[0])), nama + ', ' + tema + ': klik → unduhan ' + harap[1] + ' = berkas repo (SHA-256)', d.suggestedFilename());
        }
      }
      const pilihan = await pg.evaluate(() => { const q = document.getElementById('sgwPilihan'); return !!q && !q.hidden && document.querySelectorAll('[data-sgw-pilih]').length === 5; });
      cek(pilihan, nama + ': halaman pilihan A–E tetap tampil bersama tombol unduh');
      await ctx.close();
    }
    /* J4. Sales Idea lain tetap satu tombol (tombol portrait tidak pernah tampil) */
    {
      const src = fs.readFileSync(path.join(ROOT, 'src/sales-idea-video.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');   /* kode saja, tanpa komentar */
      const dua = (src.match(/duaFormat:\s*true/g) || []).length;
      cek(dua === 1 && /sandwich: \{[\s\S]*?duaFormat: true/.test(src), 'hanya Sandwich Generation yang memakai dua tombol (duaFormat); cerita lain tetap satu tombol otomatis');
    }
  }

  await br.close(); srv.close();
  console.log(gagal ? '\nHASIL: GAGAL (' + gagal + ')' : '\nHASIL: LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
