# Sales Idea 08 — Sandwich Generation: Naskah Narasi untuk ElevenLabs

Naskah ini sama persis, kata per kata, dengan naskah yang dipakai aplikasi
(`NARASI` di `src/sales-idea-sandwich.js`). Tes
`tests/sales-idea-sandwich.test.js` memeriksa keduanya tetap identik. Bila
naskah diubah, ubah di kedua tempat sekaligus.

Status audio: **terpasang (2026-10-14).** Delapan rekaman Bian ada di
`assets/narasi/sandwich/` dan dipetakan di `src/sales-idea-sandwich-audio.js`
(satu berkas per scene, diputar utuh). Suara browser tidak dipakai selama
manifest termuat; bila sebuah MP3 gagal dimuat, scene itu sunyi (animasi
tetap berjalan) dan narator tidak beralih ke suara browser.

## Suara dan cara generate (mengikuti Sales Idea yang sudah final)

- **Suara:** Bian — Neutral, Calm and Clear (ElevenLabs). Suara ini sama
  dengan semua Sales Idea berekaman: 10 Jari, 3 Alasan, Keranjang
  Kehidupan, Education Planning, Retirement Planning, Asset Creation,
  Bekerja di Singapura, dan Proteksi Kredit. Kedelapan manifest
  `src/sales-idea-*-audio.js` mencatat `suara: 'Bian — Neutral, Calm and Clear'`.
- **Pengaturan acuan:** sama dengan rekaman Bian sebelumnya, yaitu
  `pvc_sp100_s50_sb75_v4` (diambil dari nama berkas rekaman lama, seperti
  dicatat di `tools/narasi/NASKAH-BIAN-PROTEKSI-KREDIT.md`). Voice ID dan
  API key tidak disimpan di repository.
- **Satu scene = satu generate = satu berkas MP3.** Salin **hanya** isi
  kotak NASKAH AUDIO, tanpa judul, arahan, atau tanda kutip.
- **Nama berkas** persis seperti tertulis di tiap scene (huruf kecil,
  tanda hubung): `sandwich-SNN-01.mp3`. `SNN` adalah nomor scene, `01`
  adalah segmen tunggal per scene. Polanya sama dengan Proteksi Kredit
  (`kredit-SNN-MM.mp3`).
- **Konsistensi:** pakai suara dan pengaturan yang sama untuk kedelapan
  scene, dalam satu sesi bila memungkinkan. Dengarkan satu scene dulu,
  lalu bandingkan dengan rekaman Proteksi Kredit di aplikasi sebelum
  melanjutkan.

8 scene · 1.252 karakter · perkiraan total suara ±86 detik.

Estimasi durasi dihitung dari kecepatan rekaman Bian Proteksi Kredit
(24 rekaman, rata-rata 14,6 karakter per detik). Total suara ±86 detik, ±90–95
detik termasuk jeda antar-scene.

---

## SCENE 01 — SURAT UNTUK ANAKKU KELAK

**Nama file:** `sandwich-S01-01.mp3`

**Arahan suara:** Hangat dan reflektif, seperti membaca surat pribadi. Jeda singkat sesudah "Untuk anakku kelak", lalu jeda kecil sebelum "gajimu bukan rencana masa tuaku" agar kalimat itu terasa.

**NASKAH AUDIO**

```text
Untuk anakku kelak, ada satu hal yang ingin aku pastikan: gajimu bukan rencana masa tuaku.
```

**Estimasi durasi:** ±7 detik.

**Durasi rekaman terpasang:** 7,158 detik.

**Catatan jeda:** Jeda ±0,5 detik setelah koma pertama dan ±0,4 detik setelah titik dua.

---

## SCENE 02 — KASIH SAYANG, BUKAN BEBAN TANPA RENCANA

**Nama file:** `sandwich-S02-01.mp3`

**Arahan suara:** Lembut dan tulus. Kalimat pertama hangat; kalimat kedua sedikit lebih pelan dan tegas, tanpa nada menyalahkan.

**NASKAH AUDIO**

```text
Kami tentu ingin saling membantu dalam keluarga. Tetapi aku tak ingin kasih sayang berubah menjadi beban finansial yang tidak pernah direncanakan.
```

**Estimasi durasi:** ±10 detik.

**Durasi rekaman terpasang:** 9,091 detik.

**Catatan jeda:** Jeda ±0,6 detik setelah kalimat pertama.

---

## SCENE 03 — MASA PENSIUN PERLU DISIAPKAN

**Nama file:** `sandwich-S03-01.mp3`

**Arahan suara:** Tenang dan realistis, bermartabat. Bukan sedih.

**NASKAH AUDIO**

```text
Saat kita berhenti bekerja, kebutuhan hidup tetap berjalan. Pensiun yang tidak disiapkan bisa membuat anak harus ikut menanggung biaya hidup orang tuanya.
```

**Estimasi durasi:** ±10,5 detik.

**Durasi rekaman terpasang:** 10,266 detik.

**Catatan jeda:** Jeda ±0,6 detik setelah "kebutuhan hidup tetap berjalan."

---

## SCENE 04 — KESEHATAN BISA MENGUBAH RENCANA

**Nama file:** `sandwich-S04-01.mp3`

**Arahan suara:** Serius tetapi menenangkan. Hindari nada dramatis atau menakut-nakuti.

**NASKAH AUDIO**

```text
Biaya kesehatan juga bisa datang di luar rencana. Tanpa perlindungan dan dana yang memadai, tabungan keluarga bahkan rencana pendidikan anak bisa ikut terganggu.
```

**Estimasi durasi:** ±11 detik.

**Durasi rekaman terpasang:** 10,606 detik.

**Catatan jeda:** Jeda ±0,6 detik setelah kalimat pertama; jeda pendek setelah "memadai".

---

## SCENE 05 — LINDUNGI KELUARGA DARI RISIKO

**Nama file:** `sandwich-S05-01.mp3`

**Arahan suara:** Tenang dan jelas. Dua risiko disebut terpisah; beri ruang di antara keduanya. Kata "meninggal" diucapkan lembut, tidak ditekan.

**NASKAH AUDIO**

```text
Penyakit kritis dapat memengaruhi penghasilan dan kebutuhan sehari-hari. Dan bila pencari nafkah meninggal, keluarga yang ditinggalkan tetap memerlukan biaya untuk melanjutkan hidup.
```

**Estimasi durasi:** ±12,5 detik.

**Durasi rekaman terpasang:** 11,468 detik.

**Catatan jeda:** Jeda ±0,7 detik sebelum "Dan bila pencari nafkah meninggal".

---

## SCENE 06 — RANTAI TIGA GENERASI

**Nama file:** `sandwich-S06-01.mp3`

**Arahan suara:** Reflektif, sedikit lebih berat. Setelah titik dua, baca bagian tiga generasi dengan ritme yang jelas.

**NASKAH AUDIO**

```text
Di sinilah rantai beban bisa terbentuk: anak membesarkan anaknya sendiri, sambil menopang orang tua. Lalu ia bisa mewariskan tekanan yang sama ke generasi berikutnya.
```

**Estimasi durasi:** ±11,5 detik.

**Durasi rekaman terpasang:** 11,546 detik.

**Catatan jeda:** Jeda ±0,4 detik setelah titik dua; ±0,6 detik sebelum "Lalu ia bisa mewariskan".

---

## SCENE 07 — MULAI DENGAN PERENCANAAN

**Nama file:** `sandwich-S07-01.mp3`

**Arahan suara:** Nada mulai terangkat: realistis, memberi harapan, tidak menggurui.

**NASKAH AUDIO**

```text
Kita tidak bisa mengendalikan semua hal. Tapi kita bisa mulai dengan mengenali kebutuhan, menilai perlindungan yang sudah ada, dan menyiapkan langkah sesuai kemampuan.
```

**Estimasi durasi:** ±11,5 detik.

**Durasi rekaman terpasang:** 11,154 detik.

**Catatan jeda:** Jeda ±0,6 detik setelah kalimat pertama; jeda pendek di setiap koma daftar langkah.

---

## SCENE 08 — RANTAI ITU PUTUS DI AKU

**Nama file:** `sandwich-S08-01.mp3`

**Arahan suara:** Penutup yang hangat dan mantap. "Rantai itu putus di aku" diucapkan pelan dan yakin. Kalimat tanya terakhir diucapkan lembut, mengajak berpikir.

**NASKAH AUDIO**

```text
Rantai itu putus di aku. Bukan karena semua risiko hilang, tetapi karena aku mulai merencanakan. Beban finansial apa yang paling ingin kamu cegah agar tidak berpindah ke anak?
```

**Estimasi durasi:** ±12 detik.

**Durasi rekaman terpasang:** 12,356 detik.

**Catatan jeda:** Jeda ±0,8 detik setelah "Rantai itu putus di aku." dan ±0,6 detik sebelum kalimat tanya.

---

## Rekaman di aplikasi

Kedelapan MP3 sudah dipasang dengan pola Proteksi Kredit:

1. Berkas: `assets/narasi/sandwich/sandwich-S01-01.mp3` … `sandwich-S08-01.mp3`
   (isi persis berkas ElevenLabs yang dikirim, tidak diubah).
2. Manifest `src/sales-idea-sandwich-audio.js` (`window.PSGSandwichAudio`,
   suara Bian — Neutral, Calm and Clear). `end` = durasi berkas dari decode
   Chromium (sama dengan ffprobe sampai milidetik); total 83,645 detik.
3. Manifest dimuat di `index.html` tepat sebelum `src/sales-idea-sandwich.js`;
   delapan MP3 dan manifest ada di daftar precache `sw.js`.

Narator bersama (`PSGNarasi.rekamanDari`) memutar MP3 scene yang sedang
tampil. Lama tiap scene = durasi rekaman + jeda 700 md (minimal 3,4 dtk) +
ekor 700 md, jadi animasi tidak memotong narasi. Halaman pilihan kebutuhan
muncul sesudah scene 8 selesai DAN rekaman S08 tuntas.

Bila naskah diubah, rekaman scene itu harus dibuat ulang dengan nama berkas
yang sama, lalu `end` di manifest diukur ulang dan video unduhan dirender ulang
(`tools/video/render-video.mjs --cerita sandwich` dan `sandwich-portrait`).
