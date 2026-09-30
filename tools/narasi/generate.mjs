#!/usr/bin/env node
/* ============================================================
   Generator narasi Sales Idea — Pocket TTS Indonesian (lokal)
   ------------------------------------------------------------
   Dijalankan di komputer admin/creator saat menyusun konten, BUKAN di
   PWA agen. Tidak memakai API, API key, atau kuota: suara dibuat lokal
   oleh Pocket TTS (Python), lalu dikonversi ke MP3 oleh ffmpeg. Hasilnya
   (MP3 + lock) di-commit sebagai aset statis; PWA tetap 100% offline.

     naskah Sales Idea → Pocket TTS → WAV sementara → MP3
       → assets/narasi/gen/<sumber>/SNN-MM.<kunci12>.mp3

     node tools/narasi/generate.mjs bantuan

   Prinsip:
   - 1 segmen naskah = 1 MP3.
   - kunci = sha256(teks kanonik + model + suara + format MP3 + nomor
     ambil). Segmen yang teksnya tidak berubah TIDAK dibuat ulang; ganti
     model/suara pun hanya dibuat ulang dengan --paksa.
   - Semua tulisan audio hanya di bawah KONFIG.keluaran; berkas sementara
     hanya di KONFIG.sementara.
   - Bekerja di Singapura dikecualikan sepenuhnya (audio Bian ElevenLabs
     yang sudah berjalan tidak pernah disentuh).
   ============================================================ */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AKAR, SUMBER, DIKECUALIKAN, cariSumber, bacaNaskah, daftarSegmen, normalTeks, hashTeks, sha256 } from './naskah.mjs';

const HELPER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pocket_tts_wav.py');

/* Konfigurasi (tanpa rahasia). Model & suara ikut menentukan kunci segmen. */
const KONFIG = {
  keluaran: 'assets/narasi/gen',
  sementara: 'tools/narasi/.tmp',
  dilindungi: ['assets/narasi/singapore'],
  mesin: {
    nama: 'pocket-tts',
    model: process.env.NARASI_POCKET_MODEL || 'hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml',
    /* sama dengan suara bawaan CLI pocket-tts 3.3 untuk config kustom */
    suara: process.env.NARASI_POCKET_SUARA || 'hf://kyutai/tts-voices/alba-mackenna/casual.wav',
    mp3: { bitrate: '96k', sampleRate: 44100, kanal: 1 }
  },
  python: process.env.NARASI_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
  ffmpeg: process.env.NARASI_FFMPEG || 'ffmpeg'
};

/* ---------------- kunci & jalur ---------------- */

/* Kunci segmen: berubah bila teks, model, suara, format MP3, atau nomor
   ambil berubah. Nomor ambil dinaikkan dengan --paksa (take ulang). */
function kunciSegmen(teks, mesin, ambil) {
  return sha256(JSON.stringify({ f: 1, teks: normalTeks(teks), mesin: mesin.nama, model: mesin.model, suara: mesin.suara, mp3: mesin.mp3, ambil }));
}
function formatMp3(m) { return m.mp3.bitrate + '/' + m.mp3.sampleRate + 'Hz/' + m.mp3.kanal + 'ch'; }
/* model/suara/format dicatat per segmen: segmen boleh dibuat dengan konfigurasi berbeda */
function samaMesin(l, m) { return l.mesin === m.nama && l.model === m.model && l.suara === m.suara && l.mp3 === formatMp3(m); }
function namaBerkas(id, kunci) { return id + '.' + kunci.slice(0, 12) + '.mp3'; }
function folderSumber(id) { return path.join(KONFIG.keluaran, id); }
function jalurLock(id) { return path.join(folderSumber(id), 'narasi.lock.json'); }
function benih(kunci) { return parseInt(kunci.slice(0, 8), 16); }

function di(dasar, abs) { const r = path.relative(path.resolve(AKAR, dasar), abs); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); }

/* Jalur tulis audio wajib di bawah folder keluaran dan di luar folder dilindungi. */
export function jalurAman(relatif) {
  const abs = path.resolve(AKAR, relatif);
  if (!di(KONFIG.keluaran, abs)) throw new Error('Jalur tulis di luar ' + KONFIG.keluaran + ': ' + relatif);
  if (KONFIG.dilindungi.some((d) => di(d, abs))) throw new Error('Jalur tulis masuk folder dilindungi: ' + relatif);
  return abs;
}
function jalurSementara(relatif) {
  const abs = path.resolve(AKAR, relatif);
  if (!di(KONFIG.sementara, abs)) throw new Error('Jalur sementara di luar ' + KONFIG.sementara + ': ' + relatif);
  return abs;
}

function bacaLock(id) {
  const f = path.join(AKAR, jalurLock(id));
  if (!existsSync(f)) return { format: 1, sumber: id, segmen: {} };
  const j = JSON.parse(readFileSync(f, 'utf8'));
  if (j.format !== 1 || j.sumber !== id) throw new Error('Lock tidak cocok: ' + jalurLock(id));
  return j;
}
function tulisLock(id, lock) {
  const f = jalurAman(jalurLock(id)), tmp = f + '.part';
  const urut = {};
  Object.keys(lock.segmen).sort().forEach((k) => { urut[k] = lock.segmen[k]; });
  writeFileSync(tmp, JSON.stringify(Object.assign({}, lock, { segmen: urut }), null, 2) + '\n');
  renameSync(tmp, f);
}

/* Durasi WAV PCM dari header RIFF (tanpa ffprobe). */
export function durasiWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('bukan WAV');
  let fmt = null;
  for (let o = 12; o + 8 <= buf.length;) {
    const id = buf.toString('ascii', o, o + 4), n = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { kanal: buf.readUInt16LE(o + 10), sr: buf.readUInt32LE(o + 12), bit: buf.readUInt16LE(o + 22) };
    if (id === 'data') { if (!fmt) throw new Error('chunk fmt tidak ada'); return n / (fmt.sr * fmt.kanal * (fmt.bit / 8)); }
    o += 8 + n + (n % 2);
  }
  throw new Error('chunk data tidak ada');
}

/* ---------------- rencana ---------------- */

/* Status tiap segmen dibanding lock:
   baru     — belum pernah dibuat                                  → dibuat
   berubah  — teks naskah berubah                                  → dibuat
   hilang   — tercatat di lock, berkas MP3-nya tidak ada           → dibuat
   mesin    — teks sama, model/suara/format berbeda dari lock      → hanya dengan --paksa
   sama     — tidak perlu dibuat ulang                             → hanya dengan --paksa
   yatim    — ada di lock, sudah tidak ada di naskah (dilaporkan) */
const PERLU = new Set(['baru', 'berubah', 'hilang']);

function susunRencana(id) {
  const naskah = bacaNaskah(id), seg = daftarSegmen(naskah), lock = bacaLock(id), m = KONFIG.mesin;
  const baris = seg.map((s) => {
    const l = lock.segmen[s.id];
    let status = 'sama';
    if (!l) status = 'baru';
    else if (l.hashTeks !== s.hashTeks) status = 'berubah';
    else if (!existsSync(path.join(AKAR, folderSumber(id), l.berkas))) status = 'hilang';
    else if (!samaMesin(l, m)) status = 'mesin';
    const ambil = l ? l.ambil || 1 : 1;
    const berkas = PERLU.has(status) ? namaBerkas(s.id, kunciSegmen(s.teks, m, ambil)) : l.berkas;
    return Object.assign({}, s, { status, ambil, berkas, lock: l || null });
  });
  const yatim = Object.keys(lock.segmen).filter((k) => !seg.some((s) => s.id === k));
  return { sumber: naskah.sumber, baris, yatim, lock };
}

/* ---------------- lingkungan (Python + Pocket TTS + ffmpeg) ---------------- */

function cekPocket() {
  const r = spawnSync(KONFIG.python, [HELPER, '--cek'], { encoding: 'utf8', timeout: 120000 });
  if (r.error) return { ok: false, pesan: 'Python "' + KONFIG.python + '" tidak dapat dijalankan (' + r.error.code + '). Set NARASI_PYTHON ke python.exe/python3 yang memuat pocket-tts.' };
  let j = null;
  try { j = JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch (e) { j = null; }
  if (!j) return { ok: false, pesan: 'Helper Pocket TTS tidak memberi jawaban (kode ' + r.status + '): ' + (r.stderr || '').trim().slice(0, 300) };
  if (!j.ok) return { ok: false, pesan: 'Pocket TTS belum terpasang di Python ' + j.python + ' (' + KONFIG.python + '): ' + j.galat + '. Pasang: ' + KONFIG.python + ' -m pip install pocket-tts' };
  return { ok: true, pesan: 'Python ' + j.python + ', pocket-tts ' + j.pocket_tts + ', torch ' + j.torch };
}

function cekFfmpeg() {
  const r = spawnSync(KONFIG.ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8', timeout: 30000 });
  if (r.error) return { ok: false, pesan: 'ffmpeg "' + KONFIG.ffmpeg + '" tidak ditemukan (' + r.error.code + '). Pasang ffmpeg atau set NARASI_FFMPEG ke ffmpeg.exe.' };
  if (r.status !== 0 || !/libmp3lame/.test(r.stdout || '')) return { ok: false, pesan: 'ffmpeg tidak memiliki encoder MP3 libmp3lame.' };
  return { ok: true, pesan: 'ffmpeg dengan libmp3lame' };
}

function keMp3(wav, mp3) {
  const m = KONFIG.mesin.mp3;
  const r = spawnSync(KONFIG.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-map_metadata', '-1', '-ac', String(m.kanal), '-ar', String(m.sampleRate), '-codec:a', 'libmp3lame', '-b:a', m.bitrate, mp3], { encoding: 'utf8', timeout: 120000 });
  if (r.error || r.status !== 0 || !existsSync(mp3) || !statSync(mp3).size) throw new Error('konversi MP3 gagal: ' + (r.error ? r.error.message : (r.stderr || '').trim().slice(0, 300)));
}

/* ---------------- perintah ---------------- */

function cetakTabel(rows) {
  const lebar = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
  rows.forEach((r) => console.log(r.map((c, i) => String(c).padEnd(lebar[i])).join('  ')));
}

function perintahDaftar() {
  const rows = [['sumber', 'judul', 'scene', 'segmen', 'huruf', 'berkas naskah']];
  SUMBER.forEach((s) => {
    const n = bacaNaskah(s), seg = daftarSegmen(n);
    rows.push([s.id, s.judul, n.adegan.length, seg.length, seg.reduce((a, x) => a + x.huruf, 0), s.berkas + ' (' + s.variabel + ')']);
  });
  cetakTabel(rows);
  console.log('\nDikecualikan: ' + Object.keys(DIKECUALIKAN).join(', ') + ' (audio yang sudah berjalan tidak disentuh).');
}

function perintahNaskah(id, opsi) {
  const seg = daftarSegmen(bacaNaskah(id));
  if (opsi.json) { console.log(JSON.stringify(seg, null, 2)); return; }
  seg.forEach((s) => console.log(s.id + '  [' + s.huruf + ' huruf, ' + s.hashTeks.slice(0, 12) + ']\n    ' + normalTeks(s.teks)));
}

function perintahRencana(id) {
  const r = susunRencana(id);
  console.log('Sumber: ' + r.sumber.id + ' — ' + r.sumber.judul + ' (' + r.sumber.berkas + ')');
  console.log('Mesin : Pocket TTS, model ' + KONFIG.mesin.model + ', suara ' + KONFIG.mesin.suara);
  console.log('Lock  : ' + jalurLock(id) + (Object.keys(r.lock.segmen).length ? '' : ' (belum ada)'));
  cetakTabel([['segmen', 'status', 'huruf', 'berkas']].concat(r.baris.map((b) => [b.id, b.status, b.huruf, (PERLU.has(b.status) ? '→ ' : '  ') + path.join(folderSumber(id), b.berkas)])));
  const perlu = r.baris.filter((b) => PERLU.has(b.status)), mesin = r.baris.filter((b) => b.status === 'mesin');
  console.log('\nAkan dibuat oleh "buat": ' + perlu.length + ' dari ' + r.baris.length + ' segmen (' + perlu.reduce((a, b) => a + b.huruf, 0) + ' huruf).' +
    (mesin.length ? ' ' + mesin.length + ' segmen beda model/suara: hanya dibuat ulang dengan --paksa.' : '') +
    (r.yatim.length ? ' Yatim di lock: ' + r.yatim.join(', ') + '.' : ''));
  return r;
}

function perintahBuat(id, opsi) {
  const r = susunRencana(id), m = KONFIG.mesin;
  const pilih = opsi.segmen ? new Set(opsi.segmen.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)) : null;
  if (pilih) { const asing = [...pilih].filter((x) => !r.baris.some((b) => b.id === x)); if (asing.length) throw new Error('Segmen tidak ada di naskah: ' + asing.join(', ')); }
  const target = r.baris.filter((b) => (!pilih || pilih.has(b.id)) && (opsi.paksa || PERLU.has(b.status))).map((b) => {
    const ambil = opsi.paksa && b.lock ? b.ambil + 1 : b.ambil;
    const kunci = kunciSegmen(b.teks, m, ambil);
    return Object.assign({}, b, { ambil, kunci, berkas: namaBerkas(b.id, kunci) });
  });

  console.log('Sumber: ' + r.sumber.id + ' — ' + target.length + ' segmen akan dibuat (' + target.reduce((a, b) => a + b.huruf, 0) + ' huruf).');
  target.forEach((b) => {
    jalurAman(path.join(folderSumber(id), b.berkas));
    console.log('  ' + b.id + '  ' + b.status.padEnd(7) + ' ambil ' + b.ambil + '  → ' + path.join(folderSumber(id), b.berkas));
  });
  if (!target.length) { console.log('Tidak ada yang perlu dibuat.'); return 0; }
  if (opsi.dryRun) { console.log('\n--dry-run: Pocket TTS tidak dijalankan dan tidak ada berkas yang ditulis.'); return 0; }

  /* prasyarat — gagal jelas sebelum ada apa pun yang ditulis */
  const pocket = cekPocket(), ffmpeg = cekFfmpeg();
  console.log('\nPocket TTS : ' + pocket.pesan + '\nKonverter  : ' + ffmpeg.pesan);
  if (!pocket.ok || !ffmpeg.ok) throw new Error('Prasyarat belum lengkap; tidak ada berkas yang dibuat.');

  const kerja = jalurSementara(path.join(KONFIG.sementara, id + '-' + Date.now()));
  mkdirSync(kerja, { recursive: true });
  const tugas = target.map((b) => ({ id: b.id, teks: normalTeks(b.teks), wav: path.join(kerja, b.id + '.wav'), seed: benih(b.kunci) }));
  const fTugas = path.join(kerja, 'tugas.json'), fHasil = path.join(kerja, 'hasil.json');
  writeFileSync(fTugas, JSON.stringify({ tugas }, null, 1));

  console.log('\nMenjalankan Pocket TTS (' + tugas.length + ' segmen)...');
  const py = spawnSync(KONFIG.python, [HELPER, '--model', m.model, '--suara', m.suara, '--tugas', fTugas, '--hasil', fHasil], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (py.error) throw new Error('Python gagal dijalankan: ' + py.error.message);
  const hasil = existsSync(fHasil) ? JSON.parse(readFileSync(fHasil, 'utf8')) : [];
  if (py.status === 3 || py.status === 4 || py.status === 2) throw new Error('Pocket TTS berhenti (kode ' + py.status + '); lihat pesan di atas. Berkas kerja: ' + path.relative(AKAR, kerja));

  /* WAV → MP3 → folder keluaran; lock diperbarui per segmen */
  const lock = r.lock;
  mkdirSync(jalurAman(folderSumber(id)), { recursive: true });
  let jadi = 0;
  const gagal = [];
  target.forEach((b) => {
    const h = hasil.find((x) => x.id === b.id), wav = path.join(kerja, b.id + '.wav');
    if (!h || !h.ok || !existsSync(wav)) { gagal.push(b.id + ': ' + (h && h.galat ? h.galat : 'WAV tidak dibuat')); return; }
    try {
      const durasi = Math.round(durasiWav(readFileSync(wav)) * 1000) / 1000;
      const mp3Sementara = path.join(kerja, b.berkas);
      keMp3(wav, mp3Sementara);
      const tujuan = jalurAman(path.join(folderSumber(id), b.berkas));
      renameSync(mp3Sementara, tujuan);
      const lama = lock.segmen[b.id] && lock.segmen[b.id].berkas;
      lock.segmen[b.id] = { hashTeks: b.hashTeks, berkas: b.berkas, durasi, ambil: b.ambil, huruf: b.huruf,
        mesin: m.nama, model: m.model, suara: m.suara, mp3: formatMp3(m), dibuat: new Date().toISOString() };
      tulisLock(id, lock);
      if (lama && lama !== b.berkas) { const f = jalurAman(path.join(folderSumber(id), lama)); if (existsSync(f)) unlinkSync(f); }
      jadi++;
      console.log('  OK   ' + b.id + '  ' + durasi.toFixed(2) + ' dtk  → ' + path.join(folderSumber(id), b.berkas));
    } catch (e) { gagal.push(b.id + ': ' + e.message); }
  });

  if (!gagal.length) rmSync(kerja, { recursive: true, force: true });
  console.log('\nSelesai: ' + jadi + ' dari ' + target.length + ' segmen dibuat.' + (gagal.length ? '\nGagal:\n  ' + gagal.join('\n  ') + '\nBerkas kerja disimpan: ' + path.relative(AKAR, kerja) : ''));
  if (r.yatim.length) console.log('Yatim di lock (tidak dihapus otomatis): ' + r.yatim.join(', '));
  return gagal.length ? 1 : 0;
}

/* Pemeriksaan mandiri: tidak menjalankan Pocket TTS, tidak menulis berkas. */
function perintahPeriksa() {
  let gagal = 0;
  const cek = (ok, label, info) => { console.log((ok ? '  OK    ' : '  GAGAL ') + label + (!ok && info ? ' — ' + info : '')); if (!ok) gagal++; };
  SUMBER.forEach((s) => {
    try {
      const seg = daftarSegmen(bacaNaskah(s));
      const unik = new Set(seg.map((x) => x.id)).size === seg.length, pola = seg.every((x) => /^S\d{2}-\d{2}$/.test(x.id));
      cek(seg.length > 0 && unik && pola, s.id + ': ' + seg.length + ' segmen terbaca, ID unik berpola SNN-MM');
    } catch (e) { cek(false, s.id + ': naskah terbaca', e.message); }
  });
  let tolakSg = false;
  try { cariSumber('singapura'); } catch (e) { tolakSg = /dikecualikan/.test(e.message); }
  cek(tolakSg && !SUMBER.some((s) => /singapura/i.test(s.id + s.berkas)), 'Singapura dikecualikan dari generator (tidak dibaca, tidak dibuat)');
  const tolak = (fn, p) => { try { fn(p); return false; } catch (e) { return true; } };
  cek(tolak(jalurAman, 'assets/narasi/singapore/S01-01.mp3'), 'penjaga jalur: folder audio Singapura ditolak');
  cek(tolak(jalurAman, 'src/sales-idea-singapura-audio.js') && tolak(jalurAman, '../luar.mp3') && tolak(jalurAman, KONFIG.keluaran + '/../x.mp3'), 'penjaga jalur: jalur di luar folder keluaran ditolak');
  cek(!tolak(jalurAman, KONFIG.keluaran + '/retirement/S01-01.abcdef012345.mp3'), 'penjaga jalur: folder keluaran diterima');
  cek(!tolak(jalurSementara, KONFIG.sementara + '/retirement-1/S01-01.wav') && tolak(jalurSementara, 'assets/x.wav'), 'penjaga jalur: berkas sementara hanya di ' + KONFIG.sementara);
  cek(hashTeks('  Halo,\n  dunia. ') === hashTeks('Halo, dunia.'), 'hash teks kebal spasi/baris baru');
  const m = KONFIG.mesin, m2 = Object.assign({}, m, { suara: 'lain.wav' });
  cek(kunciSegmen('a', m, 1) !== kunciSegmen('a', m, 2) && kunciSegmen('a', m, 1) !== kunciSegmen('b', m, 1) && kunciSegmen('a', m, 1) !== kunciSegmen('a', m2, 1),
    'kunci berubah bila teks, suara, atau nomor ambil berubah');
  const wav = Buffer.alloc(44 + 48000);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + 48000, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(48000, 40);
  cek(Math.abs(durasiWav(wav) - 1) < 1e-9, 'pembaca durasi WAV (24 kHz, 16-bit, 1 dtk)');
  /* informasi lingkungan: tidak dihitung gagal, tidak memuat model */
  const pocket = cekPocket(), ffmpeg = cekFfmpeg();
  console.log('\n  info  Pocket TTS : ' + (pocket.ok ? 'siap — ' : 'BELUM — ') + pocket.pesan);
  console.log('  info  Konverter  : ' + (ffmpeg.ok ? 'siap — ' : 'BELUM — ') + ffmpeg.pesan);
  console.log(gagal ? '\nPERIKSA: GAGAL (' + gagal + ')' : '\nPERIKSA: LULUS' + (pocket.ok && ffmpeg.ok ? '' : ' (lingkungan belum siap untuk "buat")'));
  return gagal ? 1 : 0;
}

/* ---------------- CLI ---------------- */

const BANTUAN = `Generator narasi Sales Idea — Pocket TTS Indonesian (lokal, tanpa API)

Pemakaian: node tools/narasi/generate.mjs <perintah> [opsi]

  daftar                      daftar sumber naskah (scene, segmen, jumlah huruf)
  naskah <sumber> [--json]    tampilkan segmen: ID, jumlah huruf, hash teks
  rencana <sumber>|--semua    status tiap segmen & berkas MP3 yang akan dibuat
  buat <sumber> [opsi]        buat MP3 untuk segmen baru/berubah/hilang
      --segmen S01-01,S02-03  batasi ke segmen tertentu
      --paksa                 take ulang walaupun tidak berubah (nomor ambil +1)
      --dry-run               hanya tampilkan rencana & nama berkas
  periksa                     pemeriksaan mandiri (tidak membuat audio)
  bantuan                     teks ini

Sumber    : ${SUMBER.map((s) => s.id).join(', ')}
Dikecualikan: ${Object.keys(DIKECUALIKAN).join(', ')}
Model     : ${KONFIG.mesin.model}
Suara     : ${KONFIG.mesin.suara}
Keluaran  : ${KONFIG.keluaran}/<sumber>/
Environment (opsional): NARASI_PYTHON, NARASI_FFMPEG, NARASI_POCKET_MODEL, NARASI_POCKET_SUARA`;

function uraiArgumen(argv) {
  const pos = [], opsi = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opsi.json = true;
    else if (a === '--semua') opsi.semua = true;
    else if (a === '--paksa') opsi.paksa = true;
    else if (a === '--dry-run') opsi.dryRun = true;
    else if (a === '--segmen') opsi.segmen = argv[++i] || '';
    else if (a.startsWith('--segmen=')) opsi.segmen = a.slice(9);
    else if (a.startsWith('--')) throw new Error('Opsi tidak dikenal: ' + a);
    else pos.push(a);
  }
  return { perintah: pos[0] || 'bantuan', arg: pos[1], opsi };
}

function main() {
  const { perintah, arg, opsi } = uraiArgumen(process.argv.slice(2));
  switch (perintah) {
    case 'daftar': perintahDaftar(); return 0;
    case 'naskah': perintahNaskah(cariSumber(arg || '').id, opsi); return 0;
    case 'rencana':
      if (opsi.semua) { SUMBER.forEach((s, i) => { if (i) console.log('\n' + '-'.repeat(60)); perintahRencana(s.id); }); return 0; }
      perintahRencana(cariSumber(arg || '').id); return 0;
    case 'buat': return perintahBuat(cariSumber(arg || '').id, opsi);
    case 'periksa': return perintahPeriksa();
    case 'bantuan': case 'help': case '--help': case '-h': console.log(BANTUAN); return 0;
    default: throw new Error('Perintah tidak dikenal: ' + perintah + ' (lihat: bantuan)');
  }
}

try { process.exitCode = main(); } catch (e) { console.error('Galat: ' + e.message); process.exitCode = 1; }
