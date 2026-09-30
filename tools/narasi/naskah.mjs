/* ============================================================
   Generator narasi — pembaca naskah Sales Idea (read-only)
   ------------------------------------------------------------
   Naskah tiap Sales Idea tinggal di dalam modul PWA (larik NARASI di
   src/sales-idea-*.js) dan tidak diekspos. Modul ini membaca literal
   larik itu langsung dari berkas sumbernya, lalu mengevaluasinya di
   konteks VM kosong (tanpa window, document, require, atau jaringan).
   Berkas PWA tidak pernah diubah.

   Satuan audio mengikuti narator PSGNarasi (src/sales-idea-keranjang.js):
   - scene berupa string  → satu segmen (seluruh teks scene)
   - scene berupa larik   → satu segmen per elemen (bergerbang data-ketuk)
   ID segmen: SNN-MM (scene NN, segmen MM), konvensi yang sama dengan
   manifest audio rekaman yang sudah dipakai PWA.

   Bekerja di Singapura TIDAK termasuk: cerita itu memakai audio Bian
   (ElevenLabs) yang sudah berjalan dan tidak boleh dibuat ulang.
   ============================================================ */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

/* akar repo (tools/narasi/ → ../../) */
export const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* Daftar sumber narasi. `variabel` = larik naskah yang didaftarkan ke
   PSGNarasi; `butuh` = deklarasi lain di berkas yang sama yang dirujuk
   oleh larik itu (dievaluasi lebih dulu). */
export const SUMBER = [
  { id: 'retirement', judul: 'Retirement Planning', berkas: 'src/sales-idea-retirement.js', variabel: 'NARASI', selektor: '.rps' },
  { id: 'keranjang', judul: 'Keranjang Kehidupan', berkas: 'src/sales-idea-keranjang.js', variabel: 'NARASI', selektor: '.kbs' },
  { id: 'education', judul: 'Education Planning', berkas: 'src/sales-idea-education.js', variabel: 'NARASI', selektor: '.eps' },
  { id: 'jari', judul: '10 Jari (BAB 1–2)', berkas: 'src/sales-idea-jari.js', variabel: 'NARASI_JARI', butuh: ['NARASI_BAB1'], selektor: '.jps' },
  { id: 'jari-alasan', judul: '10 Jari (BAB 3: 3 alasan)', berkas: 'src/sales-idea-jari.js', variabel: 'NARASI_ALASAN', selektor: '[data-jps-alasan]' },
  { id: 'asset', judul: 'Asset Creation', berkas: 'src/sales-idea-asset.js', variabel: 'NARASI', selektor: '.acs' }
];

/* Sales Idea yang sengaja tidak dilayani generator ini */
export const DIKECUALIKAN = {
  singapura: 'Bekerja di Singapura memakai audio Bian (ElevenLabs) yang sudah berjalan; generator ini tidak pernah membuat, mengganti, atau menghapus audionya.'
};

export function cariSumber(id) {
  if (DIKECUALIKAN[id]) throw new Error('Sumber "' + id + '" dikecualikan. ' + DIKECUALIKAN[id]);
  const s = SUMBER.find((x) => x.id === id);
  if (!s) throw new Error('Sumber "' + id + '" tidak dikenal. Pilihan: ' + SUMBER.map((x) => x.id).join(', '));
  return s;
}

/* Ambil teks literal larik `var <nama> = [ ... ]` dari kode sumber.
   Pemindai memahami string ('…', "…", `…` tanpa ${}), komentar, dan
   escape, sehingga kurung di dalam teks narasi tidak mengacaukan
   pencocokan kurung. */
export function ambilLiteral(kode, nama) {
  const pola = new RegExp('\\bvar\\s+' + nama + '\\s*=\\s*\\[', 'g');
  const cocok = [...kode.matchAll(pola)];
  if (cocok.length !== 1) throw new Error('Deklarasi "var ' + nama + ' = [" ditemukan ' + cocok.length + ' kali (harus tepat 1).');
  const mulai = cocok[0].index + cocok[0][0].length - 1;
  let dalam = 0;
  for (let i = mulai; i < kode.length; i++) {
    const c = kode[i];
    if (c === '/' && kode[i + 1] === '/') { i = kode.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && kode[i + 1] === '*') { i = kode.indexOf('*/', i + 2) + 1; if (i <= 0) break; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < kode.length && kode[i] !== c; i++) {
        if (kode[i] === '\\') i++;
        else if (c === '`' && kode[i] === '$' && kode[i + 1] === '{') throw new Error('Template literal ${} di ' + nama + ' tidak didukung.');
      }
      continue;
    }
    if (c === '[') dalam++;
    else if (c === ']' && --dalam === 0) return kode.slice(mulai, i + 1);
  }
  throw new Error('Literal "' + nama + '" tidak tertutup.');
}

/* Evaluasi deklarasi di konteks VM kosong. Rujukan ke apa pun selain
   deklarasi yang disebut (fungsi, window, dsb.) langsung gagal. */
function evaluasi(kode, sumber) {
  const nama = [...(sumber.butuh || []), sumber.variabel];
  const skrip = nama.map((n) => 'var ' + n + ' = ' + ambilLiteral(kode, n) + ';').join('\n') + '\n' + sumber.variabel + ';';
  return vm.runInNewContext(skrip, Object.create(null), { timeout: 1000, filename: sumber.berkas });
}

/* Naskah satu sumber: { sumber, adegan: [{ nomor, bergerbang, segmen: [teks] }] } */
export function bacaNaskah(idAtauSumber) {
  const sumber = typeof idAtauSumber === 'string' ? cariSumber(idAtauSumber) : idAtauSumber;
  const kode = readFileSync(path.join(AKAR, sumber.berkas), 'utf8');
  const larik = evaluasi(kode, sumber);
  if (!Array.isArray(larik) || !larik.length) throw new Error(sumber.id + ': naskah bukan larik berisi.');
  const adegan = larik.map((isi, i) => {
    const bergerbang = Array.isArray(isi);
    const segmen = bergerbang ? isi : [isi];
    segmen.forEach((t, j) => {
      if (typeof t !== 'string' || !normalTeks(t)) throw new Error(sumber.id + ': scene ' + (i + 1) + ' segmen ' + (j + 1) + ' bukan teks berisi.');
    });
    return { nomor: i + 1, bergerbang, segmen: segmen.slice() };
  });
  return { sumber, adegan };
}

export function idSegmen(adegan, segmen) {
  return 'S' + String(adegan).padStart(2, '0') + '-' + String(segmen).padStart(2, '0');
}

/* Daftar datar segmen: satu entri = nantinya satu MP3 */
export function daftarSegmen(naskah) {
  const hasil = [];
  naskah.adegan.forEach((a) => a.segmen.forEach((teks, j) => {
    hasil.push({ id: idSegmen(a.nomor, j + 1), adegan: a.nomor, segmen: j + 1, bergerbang: a.bergerbang, teks, huruf: normalTeks(teks).length, hashTeks: hashTeks(teks) });
  }));
  return hasil;
}

/* Teks kanonik untuk hash: NFC, spasi dirapikan. Perubahan yang hanya
   berupa spasi/baris baru di kode sumber tidak memicu generate ulang. */
export function normalTeks(t) {
  return String(t).normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function hashTeks(t) {
  return sha256(normalTeks(t));
}
