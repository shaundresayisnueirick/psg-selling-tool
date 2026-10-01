# Pre-render video Sales Idea (prototype)

Alat developer, **bukan** bagian runtime PWA: tidak dimuat `index.html` / `sw.js`
dan tidak mengubah berkas production. Cerita: **Asset Creation** (`asset` 16:9 dan
`asset-portrait` 9:16 untuk HP),
**Retirement Planning** (`retirement` 16:9 dan `retirement-portrait` 9:16 untuk HP),
**Keranjang Kehidupan** (`basket` 16:9 dan `basket-portrait` 9:16 untuk HP),
dan **Education Planning** (`education` 16:9 dan `education-portrait` 9:16 untuk HP).

```sh
node tools/video/render-video.mjs --cerita asset|asset-portrait|retirement|retirement-portrait|basket|basket-portrait|education|education-portrait --out <folder-di-luar-repo>
node tools/video/render-video.mjs --cek <folder>/<cerita>.json   # render masih segar?
node tests/sales-idea-video.test.js [--cerita asset|asset-portrait|retirement|retirement-portrait|basket|basket-portrait|education|education-portrait] [--hasil <folder>]
```

Opsi: `--fps 30` (bawaan), `--jeda-scene <md>` (bawaan 0 = tanpa timing baru),
`--ffmpeg <path>`, `--tanpa-encode`, `--branding` (logo `assets/logo-psg.png`
kecil di kanan atas + watermark logo opasitas 6% di bawah-kanan panel teks,
ditanam saat encode lewat filter overlay ffmpeg; hanya berkas video).
`--tema gelap` merender tema Dark Gold (kunci localStorage tema PWA yang sama);
bawaan terang (Original). Folder output wajib di luar repo; bawaan
folder sementara sistem. Video/WAV/PNG hasil render tidak boleh masuk Git,
kecuali MP4 resmi tombol Download Video yang disalin manual dari hasil
render: `assets/video/asset-terang.mp4`, `asset-gelap.mp4`,
`asset-terang-portrait.mp4`, `asset-gelap-portrait.mp4`,
`retirement-terang.mp4`, `retirement-gelap.mp4`, `retirement-terang-portrait.mp4`,
`retirement-gelap-portrait.mp4`, `basket-terang.mp4`,
`basket-gelap.mp4`, `basket-terang-portrait.mp4`, `basket-gelap-portrait.mp4`,
`education-terang.mp4`, `education-gelap.mp4`, `education-terang-portrait.mp4`, dan
`education-gelap-portrait.mp4`.

## 9:16 untuk HP (`basket-portrait`, `retirement-portrait`, `asset-portrait`, `education-portrait`)

Halaman render 360×640 px CSS dengan skala piksel 2 → video 720×1280: tata letak
responsif PWA versi ponsel (panggung di atas, teks di bawah), bukan video 16:9 yang
diputar, dipotong, atau diperkecil. Scene, timing, narasi, dan audio sama dengan
16:9 (jadwal & WAV identik). CSS khusus halaman render: tombol tersembunyi keluar
dari tata letak, panggung ±1,08:1 (zoom kamera tidak memotong label di tepi), teks
diperbesar. Branding 9:16 sendiri (logo 44 px kanan atas sejajar judul, watermark
120 px opasitas 6% yang tidak menyentuh teks); branding 16:9 tetap. Tombol Download memberi berkas 9:16
hanya kepada smartphone (`kelasPerangkat()` di `src/sales-idea-video.js`).

`retirement-portrait` memakai pola yang sama, tetapi panel teks mengikuti tinggi
isinya dan panggung mengisi sisa layar (seperti PWA ponsel): panggung Retirement
responsif (posisi %, huruf `cqmin`), dan panggung bertinggi tetap yang pendek
membuat tokoh menutupi teks kartu S2. Logo sama dengan Basket; watermark 116 px
(opasitas 6%) diukur agar tidak menyentuh teks yang terlihat, termasuk saat teks
masuk.

`asset-portrait` mengikuti pola `retirement-portrait` (panel teks mengikuti isi,
panggung mengisi sisa; viewBox panggung dipaskan `paskan()` sehingga seluruh area
inti tetap terlihat). Padding bawah kartu teks dibuat lebih besar sebagai zona
watermark, karena baris terakhir S2 memanjang hampir selebar kartu; logo & watermark
sama dengan Retirement.

`education-portrait` memakai pola `asset-portrait` (CSS, logo & watermark sama). Khusus
S6, baris chip setoran di kartu teks disembunyikan: angka yang sama sudah tampil di label
panggung dan di teks isi, dan tanpa itu panggung S6 menyusut ke ±240 px CSS (label
panggung ±8 px). Durasi Education mengikuti timeline PWA (perkiraan 80 md/huruf, lebih
panjang dari rekaman di semua scene), jadi tiap scene berakhir dengan jeda tanpa suara.

## `--cek`: render masih segar?

Render dinyatakan **usang** (keluar 3) bila salah satu input berubah (sumber scene,
CSS, pemutar/narator, manifest & MP3 audio, logo branding) atau parameter render
efektif cerita itu berbeda: CSS halaman render, ukuran halaman & skala piksel,
resolusi, jumlah scene, jeda narator, manifest, branding (nilai + filter ffmpeg),
parameter encode, dan versi mesin render (`MESIN` di `render-video.mjs`, dinaikkan
bila cara capture/jadwal audio/encode berubah). Perubahan berkas
`render-video.mjs` saja (mis. konfigurasi cerita lain bertambah) tidak membuat
render usang; perubahannya dilaporkan.

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
  manifest audio cerita (`src/sales-idea-<cerita>-audio.js`; Keranjang:
  `src/sales-idea-keranjang-audio.js`). Segmen mulai saat ketukannya
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
| `<cerita>.json` | cerita, resolusi, fps, durasi & jadwal audio tiap scene/segmen, hash input (deteksi render usang), bukti UI tersembunyi & render maju, hasil validasi |
| `<cerita>.frame.json` | per frame: nomor, scene, τ (md), ketukan, sha1 PNG |
| `<cerita>.wav` | audio tersusun, 48 kHz mono PCM 16-bit |
| `frame/<cerita>-SNN-awal.png`, `-akhir.png` | frame pertama & terakhir tiap scene |
| `<cerita>-lembar-frame.png` | lembar kontak frame awal/akhir |
| `<cerita>.mp4` | hanya bila encoder tersedia |

UI PWA (← Sales Idea, Narasi, ✕, bar kontrol, Panduan untuk agen, kartu akhir)
disembunyikan lewat CSS yang hanya disuntikkan ke halaman render.
