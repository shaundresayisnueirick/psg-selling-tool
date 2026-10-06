#!/usr/bin/env node
/* Pre-render video Sales Idea (tools/video/render-video.mjs) — cerita
   Asset Creation (bawaan), Retirement Planning, Keranjang Kehidupan, Education
   Planning, dan Bekerja di Singapura (16:9 `retirement` / `basket` / `education` /
   `singapura`; 9:16 `asset-portrait` / `retirement-portrait` / `basket-portrait` /
   `education-portrait` / `singapura-portrait`).

     node tests/sales-idea-video.test.js [--cerita asset|asset-portrait|retirement|retirement-portrait|basket|basket-portrait|education|education-portrait|singapura|singapura-portrait] [--hasil <folder>] [--out <folder>]

   Tanpa --hasil: cerita di-render ke folder di luar repo (bawaan: folder
   sementara sistem), lalu hasilnya diperiksa. Dengan --hasil: hanya
   memeriksa render yang sudah ada di folder itu.
   Yang dijaga:
   F. frame: jumlah = ceil(total durasi × fps), berurutan tanpa celah;
      6 scene (Asset & Retirement) / 10 scene (Keranjang), tiap scene punya frame dan hanya
      menampilkan scene-nya;
      panjang scene = maks(durasi timeline, akhir audio) + jeda scene;
      frame awal & akhir tiap scene tersimpan 1280×720 (9:16: 720×1280) dan sama dengan
      catatan frame; render hanya maju (τ naik, tidak ada seek turun).
   J. jadwal audio dihitung ulang di sini dari manifest production,
      ketukan scene, dan jeda awal narator (dibaca dari sumbernya) —
      harus sama dengan jadwal render; semua segmen manifest (Asset 14,
      Retirement 6, Keranjang 10) masing-masing sekali; scene tanpa ketukan = 1 segmen;
      tidak ada tumpang tindih; audio selesai di dalam scene.
   K. ketukan yang terlihat di frame = ketukan analisis (≤ 1 frame).
   S. sinkron: di WAV hasil render, tiap segmen ditemukan lewat korelasi
      silang dengan MP3 aslinya, selisih dari jadwal ≤ 1 frame.
   U. UI PWA (← Sales Idea, Narasi, ✕, kontrol, Panduan untuk agen, kartu
      akhir) tersembunyi dan tidak ada animasi jam dinding.
   V. video: MP4 dibuat (diperiksa bila ffprobe ada) ATAU terblokir codec
      dengan alasan jelas dan tanpa berkas MP4.
   R. repo: berkas yang dilacak Git tidak berubah, git status sama,
      tidak ada MP4/WAV/PNG render di repo selain MP4 resmi tombol
      Download Video (assets/video/asset-terang.mp4, asset-gelap.mp4,
      retirement-terang.mp4, retirement-gelap.mp4, retirement-terang-portrait.mp4,
      retirement-gelap-portrait.mp4, basket-terang.mp4,
      basket-gelap.mp4, basket-terang-portrait.mp4, basket-gelap-portrait.mp4),
      output di luar repo; --cek menyatakan render segar dan mendeteksi
      input yang berubah serta parameter render efektif yang berubah (CSS
      halaman render, resolusi, branding, encode, versi mesin) — perubahan
      berkas alat saja tidak membuat render usang.

   Playwright tidak menjadi dependensi repo: dipakai dari instalasi global
   (NODE_PATH) bila tersedia. Keluar 0 = lulus, 1 = gagal, 2 = dilewati. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const vm = require('vm');
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
const ALAT = path.join(ROOT, 'tools/video/render-video.mjs');
const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? path.resolve(args[i + 1]) : null; };
const HASIL = arg('--hasil');
const OUT = HASIL || arg('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'psg-video-uji-'));
const K = args.includes('--cerita') ? args[args.indexOf('--cerita') + 1] : 'asset';
/* yang diharapkan per cerita (render dari kode production yang sama) */
const HARAP = {
  asset: { manifest: 'src/sales-idea-asset-audio.js', glob: 'PSGAssetAudio', scene: 6, segmen: 14, totalMin: 120000, totalMaks: 140000, kira: '≈ 129 dtk' },
  'asset-portrait': { manifest: 'src/sales-idea-asset-audio.js', glob: 'PSGAssetAudio', scene: 6, segmen: 14, totalMin: 120000, totalMaks: 140000, kira: '≈ 129 dtk', lebar: 720, tinggi: 1280 },
  retirement: { manifest: 'src/sales-idea-retirement-audio.js', glob: 'PSGRetirementAudio', scene: 6, segmen: 6, totalMin: 115000, totalMaks: 135000, kira: '≈ 125 dtk' },
  'retirement-portrait': { manifest: 'src/sales-idea-retirement-audio.js', glob: 'PSGRetirementAudio', scene: 6, segmen: 6, totalMin: 115000, totalMaks: 135000, kira: '≈ 125 dtk', lebar: 720, tinggi: 1280 },
  basket: { manifest: 'src/sales-idea-keranjang-audio.js', glob: 'PSGKeranjangAudio', scene: 10, segmen: 10, totalMin: 115000, totalMaks: 135000, kira: '≈ 126 dtk' },
  'basket-portrait': { manifest: 'src/sales-idea-keranjang-audio.js', glob: 'PSGKeranjangAudio', scene: 10, segmen: 10, totalMin: 115000, totalMaks: 135000, kira: '≈ 126 dtk', lebar: 720, tinggi: 1280 },
  education: { manifest: 'src/sales-idea-education-audio.js', glob: 'PSGEducationAudio', scene: 10, segmen: 27, totalMin: 225000, totalMaks: 250000, kira: '≈ 237 dtk' },
  'education-portrait': { manifest: 'src/sales-idea-education-audio.js', glob: 'PSGEducationAudio', scene: 10, segmen: 27, totalMin: 225000, totalMaks: 250000, kira: '≈ 237 dtk', lebar: 720, tinggi: 1280 },
  singapura: { manifest: 'src/sales-idea-singapura-audio.js', glob: 'PSGSingapuraAudio', scene: 8, segmen: 27, totalMin: 295000, totalMaks: 320000, kira: '≈ 307 dtk' },
  'singapura-portrait': { manifest: 'src/sales-idea-singapura-audio.js', glob: 'PSGSingapuraAudio', scene: 8, segmen: 27, totalMin: 295000, totalMaks: 320000, kira: '≈ 307 dtk', lebar: 720, tinggi: 1280 }
}[K];
if (!HARAP) { console.log('cerita tidak dikenal: ' + K); process.exit(1); }
const LB = HARAP.lebar || 1280, TG = HARAP.tinggi || 720, UK = LB + '×' + TG;
const FRAME_MD = 1000 / 30;
/* satu-satunya video yang boleh ada di repo: MP4 resmi tombol Download Video */
const MP4_RESMI = ['assets/video/asset-terang.mp4', 'assets/video/asset-gelap.mp4',
  'assets/video/asset-terang-portrait.mp4', 'assets/video/asset-gelap-portrait.mp4',
  'assets/video/retirement-terang.mp4', 'assets/video/retirement-gelap.mp4',
  'assets/video/retirement-terang-portrait.mp4', 'assets/video/retirement-gelap-portrait.mp4',
  'assets/video/basket-terang.mp4', 'assets/video/basket-gelap.mp4',
  'assets/video/basket-terang-portrait.mp4', 'assets/video/basket-gelap-portrait.mp4',
  'assets/video/education-terang.mp4', 'assets/video/education-gelap.mp4',
  'assets/video/education-terang-portrait.mp4', 'assets/video/education-gelap-portrait.mp4',
  'assets/video/jari-terang.mp4', 'assets/video/jari-gelap.mp4',
  'assets/video/jari-terang-portrait.mp4', 'assets/video/jari-gelap-portrait.mp4',
  'assets/video/singapura-terang.mp4', 'assets/video/singapura-gelap.mp4',
  'assets/video/singapura-terang-portrait.mp4', 'assets/video/singapura-gelap-portrait.mp4'];
const bukanResmi = (berkas) => berkas.filter((f) => !MP4_RESMI.includes(f));

let gagal = 0;
function cek(ok, label, info) {
  console.log((ok ? '  OK   ' : '  GAGAL') + ' ' + label + (!ok && info !== undefined ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''));
  if (!ok) gagal++;
}
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');
const dua = (n) => (n < 10 ? '0' : '') + n;
const git = (a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }).stdout;
function jejakRepo() {
  const h = {};
  git(['ls-files', '-z']).split('\0').filter(Boolean).forEach((f) => { const p = path.join(ROOT, f); h[f] = fs.existsSync(p) ? sha1(fs.readFileSync(p)) : null; });
  return { h, status: git(['status', '--porcelain', '--untracked-files=all']) };
}
function ukuranPng(file) { const b = fs.readFileSync(file); return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; }

(async () => {
  const sebelum = jejakRepo();
  const relOut = path.relative(ROOT, OUT);
  cek(relOut.startsWith('..') || path.isAbsolute(relOut), 'R: folder output di luar repo', OUT);

  let kodeAlat = null;
  if (!HASIL) {
    console.log('render ' + K + ' → ' + OUT);
    const r = spawnSync(process.execPath, [ALAT, '--cerita', K, '--out', OUT], { encoding: 'utf8', timeout: 45 * 60 * 1000 });
    process.stdout.write((r.stdout || '').split('\n').map((x) => '  | ' + x).join('\n') + '\n');
    if (r.stderr) process.stdout.write(r.stderr);
    kodeAlat = r.status;
    cek(r.status === 0 || r.status === 4, 'alat render selesai (0 = MP4 dibuat, 4 = encode terblokir codec)', 'keluar ' + r.status);
  }
  const fMeta = path.join(OUT, K + '.json');
  if (!fs.existsSync(fMeta)) { cek(false, 'metadata ' + K + '.json ada', fMeta); console.log('HASIL: GAGAL (' + gagal + ')'); process.exit(1); }
  const meta = JSON.parse(fs.readFileSync(fMeta, 'utf8'));
  const frame = JSON.parse(fs.readFileSync(path.join(OUT, meta.frameLog), 'utf8')).frame;

  /* ---------- F. frame ---------- */
  cek(meta.cerita === K && meta.resolusi.lebar === LB && meta.resolusi.tinggi === TG && meta.fps === 30, 'F: cerita ' + K + ', ' + UK + ', 30 fps', [meta.cerita, meta.resolusi, meta.fps]);
  cek(meta.scene.length === HARAP.scene && meta.scene.every((s, i) => s.n === i + 1), 'F: ' + HARAP.scene + ' scene berurutan', meta.scene.map((s) => s.n));
  const total = meta.scene.reduce((t, s) => t + s.panjangMd, 0);
  cek(Math.abs(total - meta.totalMd) < 1e-6 && meta.totalMd > HARAP.totalMin && meta.totalMd < HARAP.totalMaks, 'F: total durasi = jumlah panjang scene (' + HARAP.kira + ')', meta.totalMd);
  const target = Math.ceil(meta.totalMd * 30 / 1000 - 1e-9);
  cek(meta.frameTotal === target && frame.length === target, 'F: jumlah frame = ceil(total × 30 fps)', { meta: meta.frameTotal, log: frame.length, target });
  cek(frame.every((x, i) => x[0] === i), 'F: frame berurutan tanpa celah');
  let awal = 0;
  for (const s of meta.scene) {
    const fr = frame.slice(s.frame.awal, s.frame.awal + s.frame.jumlah);
    cek(s.frame.awal === awal && s.frame.jumlah > 0, 'F: scene ' + s.n + ' punya frame, menyambung scene sebelumnya', s.frame);
    awal += s.frame.jumlah;
    cek(Math.abs(s.panjangMd - (Math.max(s.durasiTimelineMd, s.akhirAudioMd) + meta.jedaSceneMd)) < 1e-6, 'F: scene ' + s.n + ' panjang = maks(timeline, audio) + jeda', s);
    cek(fr.every((x) => x[1] === s.n), 'F: scene ' + s.n + ' semua frame menampilkan scene ' + s.n);
    cek(fr.every((x, i) => Math.abs(x[2] - (x[0] * FRAME_MD - s.mulaiMd)) < 0.01 && x[2] >= -1e-6 && x[2] < s.panjangMd && (i === 0 || x[2] > fr[i - 1][2])), 'F: scene ' + s.n + ' τ tiap frame = t − awal scene dan selalu naik (render maju)');
    for (const [x, fx] of [['awal', fr[0]], ['akhir', fr[fr.length - 1]]]) {
      const f = path.join(OUT, 'frame', K + '-S' + dua(s.n) + '-' + x + '.png');
      const ada = fs.existsSync(f);
      const uk = ada ? ukuranPng(f) : null;
      cek(ada && uk && uk[0] === LB && uk[1] === TG && sha1(fs.readFileSync(f)).slice(0, 16) === fx[4], 'F: scene ' + s.n + ' frame ' + x + ' tersimpan ' + UK + ' = frame ' + fx[0] + ' di catatan', { ada, uk });
    }
  }
  cek(awal === frame.length, 'F: semua frame milik salah satu scene', awal);
  cek(Array.isArray(meta.bukti.seekTurun) && meta.bukti.seekTurun.length === 0 && Object.keys(meta.bukti.seekPerTimeline).length === HARAP.scene, 'F: tidak ada seek turun pada ' + HARAP.scene + ' timeline yang di-capture', meta.bukti);

  /* ---------- J. jadwal audio dihitung ulang ---------- */
  const ctxM = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, HARAP.manifest), 'utf8'), ctxM);
  const M = ctxM.window[HARAP.glob];
  const mJeda = /suara\.jeda\s*=\s*setTimeout\(\s*lanjut\s*,\s*(\d+)\s*\)/.exec(fs.readFileSync(path.join(ROOT, 'src/sales-idea-keranjang.js'), 'utf8'));
  const JEDA = mJeda ? +mJeda[1] : NaN;
  cek(JEDA === meta.aturanAudio.jedaAwalNaratorMd, 'J: jeda awal narator sama dengan sumber PSGNarasi', [JEDA, meta.aturanAudio.jedaAwalNaratorMd]);
  const dipakai = [];
  for (const s of meta.scene) {
    let akhir = JEDA, beda = [];
    s.segmen.forEach((g, j) => {
      const klip = M.segmen[g.id] || [];
      const buka = s.ketukMd.length ? s.ketukMd[j] : 0;
      const mulai = buka <= akhir ? akhir : buka + JEDA;
      const lama = klip.reduce((t, c) => t + (c.end - c.start) * 1000, 0);
      if (g.id !== 'S' + dua(s.n) + '-' + dua(j + 1) || Math.abs(g.mulaiMd - mulai) > 1e-6 || Math.abs(g.akhirMd - (mulai + lama)) > 1e-6 ||
          Math.abs(g.mulaiGlobalMd - (s.mulaiMd + mulai)) > 1e-6 || JSON.stringify(g.klip.map((k) => [k.audio, k.start, k.end])) !== JSON.stringify(klip.map((c) => [c.audio, c.start, c.end]))) beda.push(g.id);
      cek(j === 0 || g.mulaiMd >= s.segmen[j - 1].akhirMd - 1e-6, 'J: ' + g.id + ' tidak tumpang tindih', [g.mulaiMd, j ? s.segmen[j - 1].akhirMd : null]);
      akhir = mulai + lama;
      dipakai.push(g.id);
    });
    cek(!beda.length, 'J: scene ' + s.n + ' jadwal render = hitung ulang (manifest + ketukan + aturan narator)', beda);
    cek(s.segmen.length === Math.max(1, s.ketukMd.length), 'J: scene ' + s.n + ' satu segmen per ketukan (tanpa ketukan: satu segmen)', [s.segmen.length, s.ketukMd.length]);
    cek(akhir <= s.panjangMd + 1e-6, 'J: scene ' + s.n + ' audio selesai di dalam scene', [akhir, s.panjangMd]);
  }
  const kunci = Object.keys(M.segmen).sort();
  cek(dipakai.length === HARAP.segmen && JSON.stringify(dipakai.slice().sort()) === JSON.stringify(kunci), 'J: ' + HARAP.segmen + ' segmen manifest dipakai tepat sekali', { dipakai: dipakai.length, manifest: kunci.length });

  /* ---------- K. ketukan terlihat di frame ---------- */
  for (const s of meta.scene) {
    const fr = frame.slice(s.frame.awal, s.frame.awal + s.frame.jumlah);
    const salah = s.ketukMd.filter((b, j) => { const f = fr.find((x) => x[3] >= j + 1); return !f || f[2] < b - 1e-6 || f[2] - b >= FRAME_MD; });
    cek(!salah.length, 'K: scene ' + s.n + ' ' + s.ketukMd.length + ' ketukan terlihat di frame ≤ 1 frame dari jadwal', salah);
  }

  /* ---------- S. sinkron di WAV (korelasi silang dengan MP3 asli) ---------- */
  const wav = fs.readFileSync(path.join(OUT, meta.audio.berkas));
  cek(sha1(wav) === meta.audio.sha1 && wav.readUInt32LE(24) === 48000 && wav.readUInt16LE(22) === 1, 'S: WAV 48 kHz mono = metadata', meta.audio);
  cek(wav.readUInt32LE(40) / 2 === Math.ceil(meta.totalMd * 48), 'S: panjang WAV = total durasi', [wav.readUInt32LE(40) / 2, Math.ceil(meta.totalMd * 48)]);
  const srv = await new Promise((res) => {
    const s = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      const f = u.startsWith('/keluaran/') ? path.join(OUT, u.slice(10)) : path.join(ROOT, u);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'content-type': f.endsWith('.mp3') ? 'audio/mpeg' : f.endsWith('.wav') ? 'audio/wav' : 'text/plain' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(s));
  });
  const br = await chromium.launch();
  const pg = await (await br.newContext()).newPage();
  await pg.goto('http://127.0.0.1:' + srv.address().port + '/robots.txt');
  const segmen = [];
  meta.scene.forEach((s) => s.segmen.forEach((g) => g.klip.forEach((k) => segmen.push({ id: g.id, url: '/' + M.folder + k.audio, start: k.start, mulaiGlobalMd: k.mulaiGlobalMd }))));
  const sinkron = await pg.evaluate(async ({ segmen, wav }) => {
    const sr = 48000;
    const dekode = async (u) => new OfflineAudioContext(1, 1, sr).decodeAudioData(await (await fetch(u)).arrayBuffer());
    const W = (await dekode(wav)).getChannelData(0);
    const hasil = [];
    for (const g of segmen) {
      const ab = await dekode(g.url), ch = [];
      for (let c = 0; c < ab.numberOfChannels; c++) ch.push(ab.getChannelData(c));
      const x = (i) => { let v = 0; for (const d of ch) v += d[i]; return v / ch.length; };
      /* templat: 100 md pertama sesudah suara mulai (bukan hening awal berkas) */
      const a = Math.round(g.start * sr);
      let v = a; while (v < ab.length && Math.abs(x(v)) < 0.02) v++;
      const T = new Float32Array(4800); for (let i = 0; i < 4800; i++) T[i] = x(v + i);
      const harap = Math.round(g.mulaiGlobalMd * sr / 1000) + (v - a);
      const skor = (p) => { let s = 0, n = 0; for (let i = 0; i < 4800; i++) { const w = W[p + i] || 0; s += T[i] * w; n += w * w; } return n ? s / Math.sqrt(n) : 0; };
      let nT = 0; for (let i = 0; i < 4800; i++) nT += T[i] * T[i]; nT = Math.sqrt(nT);
      /* cari ±500 md (kasar per 8 sampel, lalu halus) — jauh lebih lebar dari toleransi */
      let best = -Infinity, lag = 0;
      for (let L = -24000; L <= 24000; L += 8) { const s = skor(harap + L); if (s > best) { best = s; lag = L; } }
      for (let L = lag - 8; L <= lag + 8; L++) { const s = skor(harap + L); if (s > best) { best = s; lag = L; } }
      hasil.push({ id: g.id, lagMd: lag / sr * 1000, korelasi: best / nT });
    }
    return hasil;
  }, { segmen, wav: '/keluaran/' + meta.audio.berkas });
  await br.close(); srv.close();
  sinkron.forEach((x) => cek(Math.abs(x.lagMd) <= FRAME_MD && x.korelasi > 0.95, 'S: ' + x.id + ' di WAV pada jadwal (selisih ' + x.lagMd.toFixed(2) + ' md, korelasi ' + x.korelasi.toFixed(4) + ')', x));
  /* satu segmen bisa terdiri dari beberapa klip (Singapura S05-03: dua berkas) */
  cek(new Set(sinkron.map((x) => x.id)).size === HARAP.segmen && sinkron.length === segmen.length,
    'S: ' + HARAP.segmen + ' segmen (' + segmen.length + ' klip) diperiksa', { segmen: new Set(sinkron.map((x) => x.id)).size, klip: sinkron.length });

  /* ---------- U. UI tersembunyi ---------- */
  const tersembunyi = (v) => v === 'hidden' || v === 'tidak-ada';
  meta.bukti.ui.forEach((u) => cek(tersembunyi(u.kembali) && tersembunyi(u.tutup) && tersembunyi(u.narasi) && u.kontrol === 'none' &&
    ['none', 'tidak-ada'].includes(u.panduan) && ['none', 'tidak-ada'].includes(u.kartuAkhir) && u.liar === 0,
  'U: scene ' + u.n + ' ← Sales Idea, Narasi, ✕, kontrol, Panduan, kartu akhir tersembunyi; tanpa animasi jam dinding', u));

  /* ---------- V. video ---------- */
  const mp4 = path.join(OUT, K + '.mp4');
  if (meta.video.status === 'dibuat') {
    cek(fs.existsSync(mp4) && fs.statSync(mp4).size > 0, 'V: MP4 dibuat', meta.video);
    const pr = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,avg_frame_rate:format=duration', '-of', 'json', mp4], { encoding: 'utf8' });
    if (pr.status === 0) {
      const j = JSON.parse(pr.stdout), v = j.streams.find((s) => s.width), a = j.streams.find((s) => !s.width);
      cek(v && v.codec_name === 'h264' && v.width === LB && v.height === TG && v.avg_frame_rate === '30/1', 'V: video H.264 ' + UK + ' 30 fps', v);
      cek(a && a.codec_name === 'aac', 'V: audio AAC', a);
      cek(Math.abs(+j.format.duration * 1000 - meta.totalMd) <= 2 * FRAME_MD, 'V: durasi MP4 = total durasi (±2 frame)', j.format.duration);
    } else console.log('  info  ffprobe tidak ada — stream MP4 tidak diperiksa');
    /* logo branding ada di SEMUA frame: kecerahan area logo tiap frame = frame 0 (latar
       bar judul statis). Menangkap logo/watermark yang hilang di tengah video. */
    const b = meta.branding;
    if (b && b.diterapkan) {
      const png = fs.readFileSync(path.join(ROOT, b.logo)), lh = b.logoTinggi, lw = Math.round(lh * png.readUInt32BE(16) / png.readUInt32BE(20));
      const area = 'crop=' + lw + ':' + lh + ':' + (LB - lw - b.logoKanan) + ':' + b.logoAtas;
      const fl = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', area + ',format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
      if (fl.status === 0) {
        const yv = ((fl.stdout || '') + (fl.stderr || '')).match(/YAVG=[\d.]+/g).map((x) => +x.slice(5));
        const beda = yv.findIndex((v) => Math.abs(v - yv[0]) > 3);
        cek(yv.length === meta.frameTotal && beda < 0, 'V: logo branding ada di semua ' + meta.frameTotal + ' frame (area logo = frame 0)', { frame: yv.length, menyimpangMulai: beda });
      } else console.log('  info  ffmpeg tidak ada — logo per frame tidak diperiksa');
    }
  } else {
    cek(meta.video.status === 'terblokir' && /libx264/.test(meta.video.alasan) && !fs.existsSync(mp4), 'V: encode terblokir codec dengan alasan jelas, tanpa berkas MP4', meta.video);
    if (kodeAlat !== null) cek(kodeAlat === 4, 'V: alat keluar 4 saat encode terblokir', kodeAlat);
    (meta.video.diperiksa || []).forEach((x) => console.log('  info  ' + x.bin + ': kurang ' + x.kurang.join(', ')));
  }

  /* ---------- R. repo tidak berubah; --cek ---------- */
  const c1 = spawnSync(process.execPath, [ALAT, '--cek', fMeta], { encoding: 'utf8' });
  cek(c1.status === 0, 'R: --cek: render segar (input sama dengan saat render)', (c1.stdout || '') + (c1.stderr || ''));
  const usang = path.join(os.tmpdir(), 'psg-video-uji-usang-' + process.pid + '.json');
  const m2 = JSON.parse(JSON.stringify(meta)); m2.input[HARAP.manifest] = '0'.repeat(40);
  fs.writeFileSync(usang, JSON.stringify(m2));
  const c2 = spawnSync(process.execPath, [ALAT, '--cek', usang], { encoding: 'utf8' });
  fs.unlinkSync(usang);
  cek(c2.status === 3 && c2.stdout.includes(HARAP.manifest), 'R: --cek mendeteksi input berubah (render usang)', c2.status);
  /* parameter render efektif (bukan hash berkas alat) juga menentukan usang */
  const ubahParam = [
    ['CSS halaman render', (m) => { m.renderCss += '\n/* uji */'; }],
    ['resolusi video', (m) => { m.resolusi = { lebar: m.resolusi.lebar + 2, tinggi: m.resolusi.tinggi }; }],
    ['branding', (m) => { if (m.branding) m.branding.watermarkLebar += 1; else m.branding = { logo: 'assets/logo-psg.png' }; }],
    ['parameter encode', (m) => { m.enkode = '-c:v libx264 -crf 28'; }],
    ['versi mesin render', (m) => { m.mesin = 999; }]
  ];
  ubahParam.forEach(([nama, ubah]) => {
    const m3 = JSON.parse(JSON.stringify(meta)); ubah(m3);
    const f3 = path.join(os.tmpdir(), 'psg-video-uji-param-' + process.pid + '.json');
    fs.writeFileSync(f3, JSON.stringify(m3));
    const c3 = spawnSync(process.execPath, [ALAT, '--cek', f3], { encoding: 'utf8' });
    fs.unlinkSync(f3);
    cek(c3.status === 3 && c3.stdout.includes('parameter: ' + nama), 'R: --cek mendeteksi parameter render berubah: ' + nama, (c3.stdout || '') + (c3.stderr || ''));
  });
  const dilacak = bukanResmi(git(['ls-files', '*.mp4', '*.wav']).split('\n').filter(Boolean));
  cek(!dilacak.length, 'R: tidak ada MP4/WAV yang dilacak Git selain ' + MP4_RESMI.join(' & '), dilacak);
  const sesudah = jejakRepo();
  const berubah = Object.keys(sebelum.h).filter((f) => sebelum.h[f] !== sesudah.h[f]);
  cek(!berubah.length, 'R: berkas yang dilacak Git tidak berubah (' + Object.keys(sebelum.h).length + ' berkas)', berubah);
  const render = bukanResmi(sesudah.status.split('\n').map((l) => l.slice(3)).filter((f) => /\.(mp4|wav|png)$/.test(f)));
  cek(sebelum.status === sesudah.status && !render.length, 'R: git status sama sebelum & sesudah, tanpa berkas render di repo selain ' + MP4_RESMI.join(' & '), render.length ? render : sesudah.status);

  console.log(gagal ? 'HASIL: GAGAL (' + gagal + ')' : 'HASIL: SEMUA LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
