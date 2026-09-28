#!/usr/bin/env node
/* Sales Idea 06 — Bekerja di Singapura (V2, storyboard final).

     node tests/sales-idea-singapura.test.js [--root <dir>] [--bagian A,B,...] [--ukuran 390x844,...]

   Yang dijaga:
   A. registri: hub 6 kartu, Sales Idea 06 membuka 8 scene (8 langkah).
   B. naskah: 27 segmen, persis versi yang disetujui; frasa & angka wajib
      terucap sebagai kata; pertanyaan risiko hanya sekali; klimaks & penutup.
   C. narasi diucapkan lewat narator bersama (PSGNarasi, id-ID) kalimat demi
      kalimat sesuai naskah; tidak ada ucapan bertumpuk; PAUSE menghentikan.
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
  svg: 'image/svg+xml', webmanifest: 'application/manifest+json', json: 'application/json', txt: 'text/plain' };
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
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.addInitScript(mockTTS);
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

  /* ---------- C. narasi diucapkan ---------- */
  console.log('[C] Narasi diucapkan per scene');
  if (ikut('C')) {
    const { ctx, pg } = await buka({ cepat: 8 });
    await bukaSG(pg);
    for (let n = 1; n <= 8; n++) {
      await pg.evaluate(() => { window.__tts.log = []; window.__tts.tumpang = 0; });
      if (n === 1) await klik(pg, '#siPlay'); else await pg.keyboard.press('ArrowRight');
      const harap = NASKAH[n - 1].flatMap(pecah);
      const ok = await tunggu(pg, (h) => window.__tts.log.filter((x) => x.t === 'akhir').length >= h, 120000, harap.length);
      const log = await pg.evaluate(() => window.__tts.log);
      const diucap = log.filter((x) => x.t === 'mulai').map((x) => x.x);
      const lang = [...new Set(log.filter((x) => x.t === 'mulai').map((x) => x.lang))];
      cek(ok !== false && JSON.stringify(diucap.slice(0, harap.length)) === JSON.stringify(harap) && lang.join() === 'id-ID', 'scene ' + n + ': ' + harap.length + ' kalimat diucapkan berurutan (id-ID)', { diucap: diucap.length, harap: harap.length, lang });
      const tumpang = await pg.evaluate(() => window.__tts.tumpang);
      cek(tumpang === 0, 'scene ' + n + ': tidak ada ucapan bertumpuk', tumpang);
    }
    await ctx.close();
    /* PAUSE menghentikan suara */
    const b = await buka();
    await bukaSG(b.pg); await klik(b.pg, '#siPlay');
    await tunggu(b.pg, () => window.__tts.log.some((x) => x.t === 'mulai'), 10000);
    await klik(b.pg, '#siPlay'); await b.pg.waitForTimeout(400);
    const n0 = await b.pg.evaluate(() => window.__tts.log.filter((x) => x.t === 'mulai').length);
    await b.pg.waitForTimeout(1200);
    const n1 = await b.pg.evaluate(() => window.__tts.log.filter((x) => x.t === 'mulai').length);
    const bicara = await b.pg.evaluate(() => window.speechSynthesis.speaking);
    cek(n1 === n0 && !bicara, 'PAUSE: narasi berhenti, tidak ada kalimat baru', { n0, n1, bicara });
    await b.ctx.close();
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
    const z = await pg.evaluate(() => ({ aktif: document.getElementById('layarSalesIdea').classList.contains('aktif'), bicara: window.speechSynthesis.speaking,
      jalan: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && document.getElementById('salesIdeaContent').contains(a.effect.target)).length }));
    cek(!z.aktif && z.jalan === 0 && !z.bicara, lbl + ': CLOSE bersih (animasi & suara berhenti)', z);
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
