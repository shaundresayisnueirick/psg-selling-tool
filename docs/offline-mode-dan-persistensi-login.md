# Mode offline & persistensi login

Dokumen ini menjelaskan perilaku, batasan, dan alasan teknis perubahan pada
cabang `fix/offline-mode-session-persistence`. Perubahan ini belum masuk
Production dan memerlukan persetujuan eksplisit pemilik aplikasi.

## Keputusan pemilik yang diterapkan

1. Akses kalkulator offline dibatasi **14 hari** sejak verifikasi online
   terakhir yang berhasil.
2. Setelah logout, kalkulator **tidak** dapat dibuka offline sampai pengguna
   login ulang secara online.
3. Tambalan kecil pada vendor Identity diperbolehkan bila beralasan, diuji,
   dan didokumentasikan (lihat bagian *Tambalan vendor*).
4. Service Worker dan cache boleh diubah dengan pengujian memadai.

## Pemulihan sesi (online)

- Kegagalan jaringan **tidak lagi menghapus sesi**. Sebelumnya `gotrue-js`
  memanggil `clearSession()` pada semua galat refresh token.
- Cookie `nf_jwt`/`nf_rf` (cookie sesi, ±1 jam) ditulis ulang saat sesi
  dipulihkan dari `localStorage`, sehingga PWA yang dibuka kembali setelah
  >1 jam tidak otomatis ditolak server.
- Pemulihan dipicu saat boot, `pageshow` (dari bfcache), `visibilitychange`,
  dan `online`. Hanya satu pemulihan berjalan pada satu waktu dan dibatasi
  60 detik antar-percobaan (tidak ada badai refresh).
- Dibedakan: **kegagalan jaringan** (sesi dipertahankan, mode offline bila
  catatan sah) vs **penolakan server** (401/400/403 atau akun nonaktif:
  sesi dan catatan offline dihapus, login diminta).

## Catatan verifikasi offline (`psg.offline.v1`)

Disimpan di `localStorage`: `{v, uid, t (waktu verifikasi), lihat (terakhir
dilihat), profil{id,email,nama,roles,level,kodeAgen,status,emailTerkonfirmasi}}`.

- Tidak menyimpan kata sandi, access token, maupun refresh token.
- **Bukan bukti autentikasi**: hanya bukti bahwa server pernah memverifikasi
  akun ini dalam 14 hari terakhir. Mode offline juga mensyaratkan sesi lokal
  `gotrue.user` dengan `id` yang sama dengan `uid` pada catatan.
- Ditulis hanya setelah `/api/psg/me` sukses. Kegagalan jaringan **tidak**
  memperpanjang masa; verifikasi online yang berhasil memulai ulang 14 hari.
- Jam perangkat mundur (lebih dari 5 menit sebelum `lihat`/`t`) ditolak
  (`jam-mundur`). Catatan rusak/tidak dikenal ditolak (`rusak`).
- Penolakan server selalu menang atas catatan: catatan dihapus.

## Perilaku mode offline

- Kalkulator dan data lokal tetap berjalan; banner "Mode offline" tampil.
- `/api/psg/*` dan `/.netlify/*` dijawab 503 sintetis berisi pesan
  "Fitur ini memerlukan koneksi internet. Silakan sambungkan perangkat ke
  jaringan, lalu coba kembali." Pengecualian: `/.netlify/identity/*`
  tidak diblokir agar pemulihan sesi dapat menjangkau server saat jaringan
  kembali.
- QR eksternal (quickchart.io) menampilkan "QR tidak tersedia tanpa internet".
- Unduhan video (`assets/video/*`) tidak di-cache; diberi pesan yang sama.
- Saat koneksi kembali: verifikasi ulang; sukses → keluar dari mode offline
  dan catatan diperbarui; ditolak → catatan dihapus dan muat ulang ke login.

## Logout

- Logout menghapus catatan offline dan sesi lokal, lalu mengunci kalkulator.
- Logout **saat offline** tidak bisa mencabut sesi di server. Ditandai
  (`psg.keluar.v1`, `belumTerkonfirmasi`), pengguna diberi tahu, dan pencabutan
  server dicoba saat online berikutnya.

## Service Worker

- `VERSI = insurance-hub-v117.1.34`. Precache ditambah aset login
  (`netlify-identity.js`, `identity-callback.*`, `agent-management.css`,
  `psg-offline.js`, `sales-idea-video.js?v=123`).
- Halaman dan `/src/` memakai network-first dengan batas 4 dtk lalu jatuh ke
  cache (jaringan yang menggantung tidak membekukan aplikasi).
- Status pemasangan (`./__status-offline`) berisi `{versi,total,gagal[],waktu}`;
  toast "Aplikasi siap dipakai offline" tampil sekali per versi. Berkas yang
  gagal di-cache dilengkapi lewat pesan `lengkapi`.
- `/api` dan `/.netlify` tidak pernah masuk Cache Storage.

## Tambalan vendor (`tools/identity/patch-vendor.mjs`)

Dijalankan sesudah bundel `src/vendor/netlify-identity.js` dibuat ulang;
`--cek` memverifikasi kelengkapan. Setiap target harus ditemukan tepat satu
kali, bila tidak skrip berhenti. Empat tambalan: (1) refresh gagal karena
jaringan tidak menghapus sesi; (2) `getUser()` menulis ulang cookie dan
menjalankan timer refresh; (3) `refreshSession(paksa)` mengembalikan
`{ok, alasan}`; (4) ekspor `refreshSession`. Tidak ada token yang dibuat
atau diperpanjang di sisi klien.

## Batasan yang diketahui

- `localStorage` dapat dimanipulasi pengguna yang paham teknis (mis. membuat
  catatan palsu). Dampaknya terbatas pada kalkulator lokal; data/fitur server
  tetap memerlukan sesi sah. Ini bukan kontrol keamanan.
- Mengatur ulang jam perangkat ke masa lalu akan ditolak; memajukan jam
  hanya mempercepat kedaluwarsa.
- Saat offline, pencabutan akun di server tidak diketahui sampai online.
  Risiko dibatasi oleh masa 14 hari.
- Masa berlaku access token (±1 jam) adalah konfigurasi Netlify Identity di
  luar repositori; tidak dapat diverifikasi dari kode.
- Kunci baru (`psg.offline.v1`, `psg.keluar.v1`, `psg.offlineToast.v1`) tidak
  memakai awalan `insuranceHub.` sehingga tidak ikut migrasi data per akun.
- Pembukaan pertama sesaat setelah pemasangan SW (sebelum precache selesai)
  dapat gagal offline; indikator "siap offline" menandai kesiapan.
- Belum diuji pada perangkat fisik (Chrome Android PWA terpasang, Safari iOS).

## Pengujian

`node tests/offline-sesi.test.js` (Playwright, vendor + Service Worker asli,
server Identity tiruan; 42 pemeriksaan: A pemulihan sesi, B kegagalan jaringan
vs penolakan, C offline dengan SW, D masa 14 hari/jam/catatan hilang,
E logout, F Service Worker).
