# Pre-render video Sales Idea (prototype)

Alat developer, **bukan** bagian runtime PWA: tidak dimuat `index.html` / `sw.js`
dan tidak mengubah berkas production. Saat ini hanya untuk **Asset Creation**.

```sh
node tools/video/render-video.mjs --cerita asset --out <folder-di-luar-repo>
node tools/video/render-video.mjs --cek <folder>/asset.json   # render masih segar?
node tests/sales-idea-video.test.js [--hasil <folder>]        # validasi prototype
```

Opsi: `--fps 30` (bawaan), `--jeda-scene <md>` (bawaan 0 = tanpa timing baru),
`--ffmpeg <path>`, `--tanpa-encode`, `--branding` (logo `assets/logo-psg.png`
kecil di kanan atas + watermark logo opasitas 6% di bawah-kanan panel teks,
ditanam saat encode lewat filter overlay ffmpeg; hanya berkas video).
`--tema gelap` merender tema Dark Gold (kunci localStorage tema PWA yang sama);
bawaan terang (Original). Folder output wajib di luar repo; bawaan
folder sementara sistem. Video/WAV/PNG hasil render tidak boleh masuk Git,
kecuali dua MP4 resmi tombol Download Video yang disalin manual dari hasil
render: `assets/video/asset-terang.mp4` dan `assets/video/asset-gelap.mp4`.

## Kebutuhan

- Playwright (Chromium) dari instalasi global, sama seperti test browser lain.
- Untuk MP4: `ffmpeg` dengan encoder **libx264** dan **aac**, muxer **mp4**, dan
  dekoder **png**. Tanpa itu alat tetap membuat frame, WAV, dan metadata, lalu
  keluar dengan kode **4** (encode terblokir). ffmpeg bawaan Playwright
  (`/opt/pw-browsers/ffmpeg-*`) tidak cukup: hanya VP8/WebM dengan input MJPEG.
- Jalur encode sudah diuji (ffmpeg 9.0 statis GPL lewat `--ffmpeg`): hasilnya
  tervalidasi H.264 High, yuv420p, 1280×720, 30 fps + AAC-LC 48 kHz mono dalam
  MP4 (`+faststart`), dengan branding PSG tema terang & gelap sesuai
  konfigurasi `--branding`.

## Sumber waktu (tidak ada timing baru)

- Visual: timeline scene production (`PSGStoryPlayer`), di-seek **maju** per
  frame. Jam dinding tidak dipakai; seek mundur ditolak.
- Ketukan: fungsi `tick` scene dipanggil langsung (fungsi murni dari waktu).
- Audio: aturan narator `PSGNarasi` (`src/sales-idea-keranjang.js`) + klip
  manifest `src/sales-idea-asset-audio.js`. Segmen mulai saat ketukannya
  terbuka dan segmen sebelumnya tuntas; bila narator menunggu ketukan, mulai
  sesudah jeda awal `setTimeout(lanjut, 80)` (dibaca dari sumber).
- Panjang scene = maks(durasi timeline, akhir audio) + `--jeda-scene`.
- Transisi UI di luar timeline scene (mis. animasi masuk layar `psgMasuk`,
  200 md) dituntaskan sebelum frame pertama; animasi tak berujung di luar
  timeline membuat validasi gagal.
- Hasil render deterministik pada isinya; antar-render bisa ada noise
  rasterisasi Chromium yang sangat kecil (terukur ≤ 29 px, ≤ 9/255 per frame).

## Keluaran

| Berkas | Isi |
|---|---|
| `asset.json` | cerita, resolusi, fps, durasi & jadwal audio tiap scene/segmen, hash input (deteksi render usang), bukti UI tersembunyi & render maju, hasil validasi |
| `asset.frame.json` | per frame: nomor, scene, τ (md), ketukan, sha1 PNG |
| `asset.wav` | audio tersusun, 48 kHz mono PCM 16-bit |
| `frame/asset-SNN-awal.png`, `-akhir.png` | frame pertama & terakhir tiap scene |
| `asset-lembar-frame.png` | lembar kontak frame awal/akhir |
| `asset.mp4` | hanya bila encoder tersedia |

UI PWA (← Sales Idea, Narasi, ✕, bar kontrol, Panduan untuk agen, kartu akhir)
disembunyikan lewat CSS yang hanya disuntikkan ke halaman render.
