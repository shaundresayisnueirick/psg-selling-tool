# Sales Idea 08 — Sandwich Generation: Naskah Narasi untuk ElevenLabs

Naskah ini sama persis, kata per kata, dengan naskah yang dipakai aplikasi
(`NARASI` di `src/sales-idea-sandwich.js`). Tes
`tests/sales-idea-sandwich.test.js` memeriksa keduanya tetap identik. Bila
naskah diubah, ubah di kedua tempat sekaligus.

Status audio: **belum ada rekaman.** Selama manifest
`src/sales-idea-sandwich-audio.js` belum dipasang, aplikasi memakai suara
browser sebagai narasi sementara. Suara browser bukan hasil akhir.

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

## SCENE 01 — SURAT UNTUK MENANTUKU DI MASA DEPAN

**Nama file:** `sandwich-S01-01.mp3`

**Arahan suara:** Hangat dan reflektif, seperti membaca surat pribadi. Jeda singkat sesudah "Untuk menantuku di masa depan", lalu jeda kecil sebelum "gajimu bukan rencana masa tuaku" agar kalimat itu terasa.

**NASKAH AUDIO**

```text
Untuk menantuku di masa depan, ada satu hal yang ingin aku pastikan: gajimu bukan rencana masa tuaku.
```

**Estimasi durasi:** ±7 detik.

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

**Catatan jeda:** Jeda ±0,8 detik setelah "Rantai itu putus di aku." dan ±0,6 detik sebelum kalimat tanya.

---

## Memasang rekaman ke aplikasi (tahap finalisasi, bukan sekarang)

Kirimkan kedelapan berkas MP3 dengan nama di atas. Pemasangannya
mengikuti pola Proteksi Kredit:

1. Berkas disimpan di `assets/narasi/sandwich/`:
   `sandwich-S01-01.mp3` … `sandwich-S08-01.mp3`.
2. Manifest baru `src/sales-idea-sandwich-audio.js`, bentuknya sama dengan
   `src/sales-idea-kredit-audio.js`:

   ```js
   window.PSGSandwichAudio = {
     versi: 'sgw-bian-<tanggal>',
     suara: 'Bian — Neutral, Calm and Clear',
     folder: 'assets/narasi/sandwich/',
     segmen: {
       'S01-01': [{ audio: 'sandwich-S01-01.mp3', start: 0.000, end: <durasi> }],
       /* … sampai S08-01 */
     }
   };
   ```

   `end` adalah durasi berkas yang diukur dari decode Chromium. Berkas
   diputar utuh.
3. Manifest dimuat di `index.html` tepat sebelum `src/sales-idea-sandwich.js`.
   Kedelapan MP3 dan manifest masuk daftar precache `sw.js`, lalu `VERSI`
   dinaikkan.

Begitu manifest termuat, narator bersama (`PSGNarasi.rekamanDari`) memutar
MP3 dan tidak pernah jatuh ke suara browser. Lama tiap scene mengikuti
durasi rekaman ditambah jeda 700 md. Tanpa manifest, narator memakai suara
browser sebagai pengganti sementara.
