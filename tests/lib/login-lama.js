'use strict';
/* Login kode akses lama dicabut sejak 15 Oktober 2026 (PR #35).
   Dipakai tes statis untuk memastikan src/access-gate.js tidak lagi punya
   jalur yang membuka aplikasi tanpa sesi Identity yang diverifikasi server.
   Mengembalikan daftar pelanggaran (kosong = aman). */
const HASH_KODE_LAMA = [
  '9e8209fdd3b744bec823f769d4f920104a976b15891718b2d7d5f63b00fe9afa',
  'eb4dda38adebde8da2c577a6a58583f434d43c4b765561e597bbe988bc412c01',
  '8d2c60f81e04f6be48c1a9337d03425adcb9e52e1ca165541b9ece8988918093',
];
function pelanggaranLoginLama(gate, login) {
  const kode = (s) => String(s || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const g = kode(gate), l = kode(login);
  const salah = [];
  for (const h of HASH_KODE_LAMA) if (g.includes(h)) salah.push('hash kode akses lama masih ada');
  if (/insuranceAccessCode|insuranceAccessForm|SANDI_LEVEL/.test(g)) salah.push('formulir kode akses lama masih ada');
  if (/isUnlocked|getItem\(\s*REMEMBER_KEY|getItem\(\s*SESSION_KEY/.test(g)) salah.push('penanda perangkat lama masih membuka layar');
  if (!/\/api\/psg\/me/.test(g)) salah.push('halaman ringkasan tidak memverifikasi sesi di /api/psg/me');
  if (l && /psgIdentityLegacy|KODE AKSES LAMA/i.test(l)) salah.push('identity-login.js masih menawarkan login kode akses lama');
  return salah;
}
module.exports = { pelanggaranLoginLama, HASH_KODE_LAMA };
