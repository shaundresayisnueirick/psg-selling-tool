/* Insurance Hub — satu-satunya sumber rumus usia.
 *
 * Aturan usia Generali: ROUND(YEARFRAC(tanggal lahir, hari ini), 0) dengan
 * basis 0 (US 30/360), yaitu usia pada ulang tahun TERDEKAT — bukan selisih
 * tahun kalender biasa. Usia bertambah satu setelah lewat setengah tahun
 * sejak ulang tahun terakhir.
 *
 * Sebelumnya rumus ini disalin di lima tempat: liteFuture.js, cristalPrime.js,
 * ghp.js, iflexyguard.js, dan core.js. Kelimanya menghasilkan angka yang sama
 * persis, tetapi kalau suatu saat aturannya berubah, semuanya harus diingat
 * satu per satu. Sekarang kelima nama lama tetap ada dan meneruskan ke sini,
 * sehingga tidak ada pemanggil yang perlu diubah.
 *
 * Berkas ini WAJIB dimuat sebelum seluruh mesin produk dan core.js.
 */

function ihHariTerakhirFeb(y, m, d) {
  if (m !== 2) return false;
  const kabisat = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return d === (kabisat ? 29 : 28);
}

// YEARFRAC basis 0 (US 30/360), sama seperti Excel.
function ihYearFrac(d1, d2) {
  let y1 = d1.getUTCFullYear(), m1 = d1.getUTCMonth() + 1, day1 = d1.getUTCDate();
  let y2 = d2.getUTCFullYear(), m2 = d2.getUTCMonth() + 1, day2 = d2.getUTCDate();
  if (ihHariTerakhirFeb(y1, m1, day1) && ihHariTerakhirFeb(y2, m2, day2)) day2 = 30;
  if (ihHariTerakhirFeb(y1, m1, day1)) day1 = 30;
  if (day2 === 31 && day1 >= 30) day2 = 30;
  if (day1 === 31) day1 = 30;
  return ((y2 - y1) * 360 + (m2 - m1) * 30 + (day2 - day1)) / 360;
}

// ROUND ala Excel: setengah dibulatkan menjauhi nol.
function ihExcelRound(x, digits) {
  const f = Math.pow(10, digits);
  return Math.sign(x) * Math.round(Math.abs(x) * f) / f;
}

/* Menerima objek Date maupun teks 'YYYY-MM-DD'. Mengembalikan null bila
   tanggalnya kosong atau tidak sah, supaya pemanggil bisa membedakan
   "belum diisi" dari usia 0. */
function ihUsiaGenerali(tglLahir, hariIni) {
  if (!tglLahir) return null;
  const d = tglLahir instanceof Date ? tglLahir
    : new Date(String(tglLahir).includes('T') ? tglLahir : tglLahir + 'T00:00:00Z');
  const kini = hariIni instanceof Date ? hariIni
    : (hariIni ? new Date(hariIni) : new Date());
  if (Number.isNaN(d.getTime()) || Number.isNaN(kini.getTime())) return null;
  return ihExcelRound(ihYearFrac(d, kini), 0);
}

if (typeof globalThis !== 'undefined') {
  globalThis.ihHariTerakhirFeb = ihHariTerakhirFeb;
  globalThis.ihYearFrac = ihYearFrac;
  globalThis.ihExcelRound = ihExcelRound;
  globalThis.ihUsiaGenerali = ihUsiaGenerali;
}
