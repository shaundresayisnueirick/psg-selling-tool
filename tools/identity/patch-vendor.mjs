/* Tambalan PSG untuk src/vendor/netlify-identity.js (dijalankan SESUDAH bundel dibuat ulang):

     node tools/identity/patch-vendor.mjs            # terapkan
     node tools/identity/patch-vendor.mjs --cek      # keluar 1 bila belum/tidak lengkap

   Setiap tambalan memeriksa teks target ada TEPAT SATU KALI; bila versi paket
   berubah dan teksnya bergeser, skrip berhenti (tidak menebak). Alasan teknis:

   1. gotrue-js _refreshToken memanggil clearSession() pada SEMUA galat. Satu
      kegagalan jaringan/timeout (HP offline, sinyal lemah) menghapus
      gotrue.user dan memaksa login ulang. Sesudah tambalan, sesi hanya
      dihapus bila server MENOLAK refresh token (HTTP 400/401/403).
   2. getUser() memulihkan sesi dari localStorage tetapi tidak menulis ulang
      cookie nf_jwt/nf_rf dan tidak menjalankan timer refresh (hanya
      login/hydrateSession yang melakukannya). Cookie nf_jwt adalah cookie
      sesi berumur sama dengan access token (±1 jam) yang dibaca server pada
      /api/psg/me, jadi PWA yang dibuka kembali sesudah >1 jam ditolak server
      (401) dan dipaksa login. Sesudah tambalan getUser menulis ulang cookie
      dari token yang valid dan menjalankan timer refresh.
   3. refreshSession(): jalur resmi (jwt() → refresh bila perlu → tulis ulang
      cookie) yang dapat dipanggil aplikasi saat pageshow/visibilitychange/online
      (paksa=true memaksa refresh, dipakai saat server menjawab 401) dan mengembalikan {ok, alasan: 'tanpa-sesi' | 'jaringan' | 'ditolak'}
      sehingga kegagalan jaringan dibedakan dari penolakan server.

   Tidak ada token yang dibuat atau diperpanjang di sisi klien. */
import fs from 'node:fs'
const ARAH = new URL('../../src/vendor/netlify-identity.js', import.meta.url)
let s = fs.readFileSync(ARAH, 'utf8')
const TANDA = '/* PSG-PATCH:'
const tambalan = [
  ['PSG-PATCH:refresh-tidak-hapus-sesi-karena-jaringan',
`      }).catch((error) => {
        delete refreshPromises[refresh_token];
        this.clearSession();
        throw error;
      });`,
`      }).catch((error) => {
        delete refreshPromises[refresh_token];
        /* PSG-PATCH:refresh-tidak-hapus-sesi-karena-jaringan — sesi hanya dihapus
           bila server menolak refresh token; jaringan/timeout tidak menghapusnya. */
        const status = error && error.status;
        if (status === 400 || status === 401 || status === 403) this.clearSession();
        throw error;
      });`],
  ['PSG-PATCH:getuser-tulis-ulang-cookie',
`    if (!currentUser2) return null;
    try {
      const freshUser = await currentUser2.getUserData();
      return toUser(freshUser);
    } catch {`,
`    if (!currentUser2) return null;
    try {
      const freshUser = await currentUser2.getUserData();
      /* PSG-PATCH:getuser-tulis-ulang-cookie — pulihkan cookie nf_jwt/nf_rf dan
         timer refresh dari token yang baru saja terbukti valid/diperbarui. */
      try {
        const jwtBaru = await currentUser2.jwt();
        const detail = currentUser2.tokenDetails();
        setBrowserAuthCookies(jwtBaru, detail == null ? void 0 : detail.refresh_token);
        startTokenRefresh();
      } catch {
      }
      return toUser(freshUser);
    } catch {`],
  ['PSG-PATCH:refreshsession',
`  var requestPasswordRecovery = async (email) => {`,
`  /* PSG-PATCH:refreshsession */
  var refreshSession = async (paksa) => {
    const client = getGoTrueClient();
    const user = client == null ? null : client.currentUser();
    if (!user) return { ok: false, alasan: "tanpa-sesi" };
    try {
      const jwtBaru = await user.jwt(!!paksa);
      const detail = user.tokenDetails();
      setBrowserAuthCookies(jwtBaru, detail == null ? void 0 : detail.refresh_token);
      startTokenRefresh();
      return { ok: true, alasan: "" };
    } catch {
      const masihAda = client.currentUser();
      return { ok: false, alasan: masihAda ? "jaringan" : "ditolak" };
    }
  };
  var requestPasswordRecovery = async (email) => {`],
  ['PSG-PATCH:export-refreshsession',
`    requestPasswordRecovery: () => requestPasswordRecovery,
    updateUser: () => updateUser
  });`,
`    requestPasswordRecovery: () => requestPasswordRecovery,
    refreshSession: () => refreshSession,
    updateUser: () => updateUser
  });`],
]
const cek = process.argv.includes('--cek')
let belum = 0
for (const [nama, dari, ke] of tambalan) {
  if (s.includes(ke)) continue
  const n = s.split(dari).length - 1
  if (n !== 1) { console.error(`tambalan ${nama}: teks target ditemukan ${n}x (harus 1x)`); process.exit(2) }
  belum++
  if (!cek) s = s.replace(dari, () => ke)
}
if (cek) { console.log(belum ? `BELUM lengkap (${belum})` : 'tambalan lengkap'); process.exit(belum ? 1 : 0) }
if (belum) fs.writeFileSync(ARAH, s)
console.log(belum ? `${belum} tambalan diterapkan` : 'sudah lengkap')
