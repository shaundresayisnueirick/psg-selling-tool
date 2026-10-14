# Sales Idea 08 — Sandwich Generation: Storyboard & Daftar Aset

Pesan utama: **"Rantai itu putus di aku."** Cerita ini membangun kesadaran
tentang beban finansial lintas generasi, bukan menakut-nakuti. Tiga
komitmen yang dibangun: menyiapkan pensiun, mengantisipasi risiko kesehatan
dan penyakit kritis, serta menyiapkan perlindungan keluarga bila pencari
nafkah meninggal.

Naskah narasi untuk perekaman ada di dokumen terpisah:
[`docs/sales-idea-sandwich-generation-elevenlabs.md`](sales-idea-sandwich-generation-elevenlabs.md).
Naskah di bawah ini sama persis dengan dokumen itu dan dengan aplikasi
(`src/sales-idea-sandwich.js`).

## Status implementasi visual

| Bagian | Status |
|---|---|
| Delapan scene di pemutar Sales Idea (teks layar, naskah, ilustrasi animasi berlapis terang/gelap) | **Tersedia** di aplikasi |
| Foto/video realistis per scene | **Belum ada, harus dibuat** (lihat daftar aset) |
| Audio narasi ElevenLabs (voice Bian) | **Terpasang**: 8 MP3 di `assets/narasi/sandwich/`, manifest `src/sales-idea-sandwich-audio.js`. |
| Video unduhan (MP4) | **Tersedia** sesudah presentasi ditonton utuh: tombol "Download Video Portrait (9:16)" (720×1280) dan "Download Video Landscape (16:9)" (1280×720), tema terang/gelap, dirender dari scene & rekaman yang sama. |

Tanpa aset realistis, setiap scene tampil sebagai ilustrasi animasi
berlapis. Arah visualnya mengikuti referensi pemilik (PDF "sandwich
generation"): meja kerja malam dengan lampu, surat yang ditulis, foto
keluarga, toples dana pensiun, perisai kesehatan, himpitan sandwich, dan
rantai yang putus saat fajar. Gambar di PDF tidak dipakai langsung, karena
berupa hasil pindai yang sudah memuat teks berbeda dari naskah, nomor
halaman, dan tombol aplikasi pemindai.

Susunan setiap scene:

- **Latar:** ruangan, klinik, atau langit, mengisi seluruh panggung.
- **Objek utama yang bergerak:** tulisan tergambar diikuti pena, notifikasi
  masuk, kalender berganti bulan, koin jatuh, monitor detak jantung, kubah
  perisai terbentuk, roti sandwich menghimpit, centang, tunas tumbuh, dan
  rantai terbelah.
- **Suasana dan teks:** dorongan kamera pelan, cahaya lembut, butir film
  tipis, dan teks layar besar di atas lapisan gelap.

Manusia tampil sebagai siluet tanpa wajah, kecuali scene 6 (Generasi
Sandwich). Atas pilihan pemilik, scene 6 memakai tokoh ilustrasi
berekspresi sebagai puncak emosi cerita. Tidak ada karakter 3D.
Warna mengikuti tema: terang memakai senja keemasan, gelap
memakai malam.

## Panduan konsistensi tokoh dan lokasi

Pakai tokoh, pakaian, dan rumah yang sama di semua scene yang menampilkan orang.

| Tokoh | Deskripsi |
|---|---|
| **Andi** (narator, "aku") | Laki-laki Indonesia, ±42 tahun, karyawan kantor. Kemeja batik lengan pendek warna biru tua atau kemeja polos krem. Rambut pendek rapi, berkacamata tipis. |
| **Maya** (istri) | Perempuan Indonesia, ±39 tahun, berhijab warna sage/abu lembut, blus polos. |
| **Raka** (anak) | Laki-laki, ±10 tahun, kaos polos biru muda. |
| **Pak Hadi** (ayah Andi) | Laki-laki, ±68 tahun, rambut beruban, kemeja batik cokelat, peci hitam opsional. |
| **Bu Sri** (ibu Andi) | Perempuan, ±65 tahun, kerudung krem, kebaya/blus sederhana. |

**Rumah:** rumah tapak kelas menengah di kota Indonesia. Ruang keluarga
dengan sofa kayu, meja makan kayu, rak dengan foto keluarga berbingkai,
tanaman hijau, jendela besar dengan cahaya sore. Palet hangat: kayu, krem,
hijau tanaman.

**Rumah sakit (scene 4):** rumah sakit modern Indonesia, lorong dan ruang
konsultasi yang terang dan bersih. Suasana tenang.

**Gaya sinematik:** realistis seperti film pendek, lensa 35–50 mm, depth of
field dangkal, cahaya alami, gerak kamera pelan (dolly/slide), color grading
hangat-natural. Tanpa teks atau angka kecil di dalam gambar (teks layar
ditambahkan oleh aplikasi). Tanpa logo produk atau perusahaan.

## Ringkasan scene

| # | Judul | Teks layar | Durasi suara ± | Transisi ke scene berikutnya |
|---|---|---|---|---|
| 1 | Surat untuk Menantuku di Masa Depan | Untuk Menantuku di Masa Depan | 7 dtk | Crossfade lembut |
| 2 | Kasih Sayang, Bukan Beban Tanpa Rencana | Kasih Sayang, Bukan Beban Tanpa Rencana | 10 dtk | Crossfade |
| 3 | Masa Pensiun Perlu Disiapkan | Kebutuhan Hidup Tetap Berjalan | 10,5 dtk | Crossfade ke suasana lebih redup |
| 4 | Kesehatan Bisa Mengubah Rencana | Kesehatan Dapat Mengubah Rencana | 11 dtk | Crossfade |
| 5 | Lindungi Keluarga dari Risiko | Siapkan Perlindungan Keluarga | 12,5 dtk | Crossfade |
| 6 | Rantai Tiga Generasi | Tiga Generasi. Satu Rantai. | 11,5 dtk | Crossfade ke suasana lebih terang |
| 7 | Mulai dengan Perencanaan | Mulai dari Kebutuhan yang Nyata | 11,5 dtk | Crossfade |
| 8 | Rantai Itu Putus di Aku | RANTAI ITU PUTUS DI AKU / Tiga Generasi. Satu Keputusan. | 12 dtk | Halaman pilihan kebutuhan |

Total suara ±86 detik, ±90–95 detik dengan jeda. Lama tiap scene di aplikasi
mengikuti lama narasi (rekaman bila sudah dipasang), ditambah jeda singkat.

---

## Scene 1 — Surat untuk Menantuku di Masa Depan

- **Tujuan:** Hook emosional untuk menarik perhatian calon nasabah.
- **Teks layar:** Untuk Menantuku di Masa Depan
- **Naskah audio:** Untuk menantuku di masa depan, ada satu hal yang ingin aku pastikan: gajimu bukan rencana masa tuaku.
- **Estimasi durasi:** ±7 detik (scene ±8 detik).
- **Arahan visual:** Andi duduk di meja kayu ruang keluarga pada sore hari, menulis surat dengan pulpen. Di dekatnya ada foto keluarga berbingkai. Suasana hangat, tenang, intim, reflektif.
- **Ilustrasi aplikasi (tanpa aset):** meja malam berlampu, buku terbuka bertuliskan "Untuk menantuku," yang ditulis perlahan dengan pena, amplop bersegel hati, foto keluarga, minuman hangat beruap.
- **Prompt visual:** `Cinematic realistic short film shot, Indonesian man in his early 40s wearing a short-sleeve navy batik shirt and thin glasses, sitting at a wooden dining table in a warm middle-class Indonesian living room, writing a handwritten letter with a pen, framed family photo beside him, soft late-afternoon window light, shallow depth of field, slow dolly-in, warm natural color grade, no text, no logos`

## Scene 2 — Kasih Sayang, Bukan Beban Tanpa Rencana

- **Tujuan:** Saling membantu dalam keluarga itu wajar; ketergantungan finansial perlu diantisipasi.
- **Teks layar:** Kasih Sayang, Bukan Beban Tanpa Rencana
- **Naskah audio:** Kami tentu ingin saling membantu dalam keluarga. Tetapi aku tak ingin kasih sayang berubah menjadi beban finansial yang tidak pernah direncanakan.
- **Estimasi durasi:** ±10 detik (scene ±11 detik).
- **Arahan visual:** Keluarga tiga generasi di rumah: Pak Hadi dan Bu Sri bermain dengan Raka, Maya membawa teh, Andi tersenyum. Hangat, alami, tanpa konflik.
- **Ilustrasi aplikasi:** jendela rumah hangat dengan siluet tiga generasi di meja makan dan hati yang melayang; ponsel menampilkan pengeluaran rutin yang masuk satu per satu (kiriman orang tua, cicilan rumah, biaya sekolah).
- **Prompt visual:** `Cinematic realistic scene, three-generation Indonesian family in a warm living room: grandparents in their late 60s playing a board game with a 10-year-old boy, a mother in a sage hijab bringing tea, the father smiling, natural candid interaction, warm afternoon light, gentle handheld camera, shallow depth of field, no text, no logos`

## Scene 3 — Masa Pensiun Perlu Disiapkan

- **Tujuan:** Kebutuhan hari tua perlu direncanakan.
- **Teks layar:** Kebutuhan Hidup Tetap Berjalan
- **Naskah audio:** Saat kita berhenti bekerja, kebutuhan hidup tetap berjalan. Pensiun yang tidak disiapkan bisa membuat anak harus ikut menanggung biaya hidup orang tuanya.
- **Estimasi durasi:** ±10,5 detik (scene ±12 detik).
- **Arahan visual:** Pak Hadi (atau Andi yang lebih tua) di teras, memeriksa catatan pengeluaran rumah tangga dan kalender dinding. Masa tua yang realistis dan bermartabat, bukan menyedihkan.
- **Ilustrasi aplikasi:** matahari terbenam di jendela, kalender meja yang berganti bulan, koin jatuh mengisi toples Dana Pensiun, catatan kebutuhan bulanan, kacamata baca.
- **Prompt visual:** `Cinematic realistic shot, dignified Indonesian man in his late 60s with grey hair and brown batik shirt sitting on a home terrace, calmly reviewing a household expense notebook beside a wall calendar, soft golden hour light, slow lateral camera slide, warm realistic color grade, hopeful and dignified mood, no readable numbers, no text, no logos`

## Scene 4 — Kesehatan Bisa Mengubah Rencana

- **Tujuan:** Biaya kesehatan dapat mengganggu kondisi keuangan keluarga.
- **Teks layar:** Kesehatan Dapat Mengubah Rencana
- **Naskah audio:** Biaya kesehatan juga bisa datang di luar rencana. Tanpa perlindungan dan dana yang memadai, tabungan keluarga bahkan rencana pendidikan anak bisa ikut terganggu.
- **Estimasi durasi:** ±11 detik (scene ±12 detik).
- **Arahan visual:** Lorong atau ruang konsultasi rumah sakit modern di Indonesia. Andi dan Maya mendampingi Bu Sri berbicara tenang dengan dokter. Tidak ada peralatan medis yang menakutkan.
- **Ilustrasi aplikasi:** ruang perawatan tenang: monitor detak jantung yang berjalan, infus menetes, lembar rincian biaya, toples tabungan menyusut, buku Dana Pendidikan goyah.
- **Prompt visual:** `Cinematic realistic scene in a bright modern Indonesian hospital consultation room, a married couple in their early 40s (woman in sage hijab) accompanying an elderly mother in a cream headscarf, calmly talking with a doctor, reassuring atmosphere, soft daylight, shallow depth of field, slow dolly, no frightening medical equipment, no text, no logos`

## Scene 5 — Lindungi Keluarga dari Risiko

- **Tujuan:** Penyakit kritis dan meninggalnya pencari nafkah adalah dua risiko berbeda yang perlu dipersiapkan.
- **Teks layar:** Siapkan Perlindungan Keluarga
- **Naskah audio:** Penyakit kritis dapat memengaruhi penghasilan dan kebutuhan sehari-hari. Dan bila pencari nafkah meninggal, keluarga yang ditinggalkan tetap memerlukan biaya untuk melanjutkan hidup.
- **Estimasi durasi:** ±12,5 detik (scene ±14 detik).
- **Arahan visual:** Dua bagian: (a) Andi beristirahat di rumah dalam masa pemulihan, Maya menghitung kebutuhan rumah tangga; (b) aktivitas keluarga tetap berjalan: Maya mengantar Raka ke sekolah, belanja kebutuhan rumah. Hindari dramatisasi; tidak menampilkan pemakaman.
- **Ilustrasi aplikasi:** rumah di tengah hujan senja; kubah perisai terbentuk melingkupinya, dengan label Penyakit kritis dan Pencari nafkah.
- **Prompt visual:** `Cinematic realistic two-part sequence: an Indonesian father in his early 40s resting at home during recovery while his wife in a sage hijab reviews household needs at the table; then the same mother walking her 10-year-old son to school in a calm residential street, everyday life continuing, soft natural light, restrained emotional tone, no funeral imagery, no text, no logos`

## Scene 6 — Rantai Tiga Generasi

- **Tujuan:** Ketidaksiapan dapat meneruskan beban dari satu generasi ke generasi berikutnya.
- **Teks layar:** Tiga Generasi. Satu Rantai.
- **Naskah audio:** Di sinilah rantai beban bisa terbentuk: anak membesarkan anaknya sendiri, sambil menopang orang tua. Lalu ia bisa mewariskan tekanan yang sama ke generasi berikutnya.
- **Estimasi durasi:** ±11,5 detik (scene ±13 detik).
- **Arahan visual:** Komposisi tiga generasi dalam satu bingkai: Andi di tengah, satu tangan merangkul Raka, tangan lain menuntun Pak Hadi. Sinematik, konsisten dengan tokoh sebelumnya.
- **Ilustrasi aplikasi (atas pilihan pemilik: gaya ilustrasi ekspresif, satu-satunya scene bertokoh berwajah):** "Generasi Sandwich". Kakek dan nenek duduk penuh harap di roti atas. "Aku" (kaus AKU) terhimpit di tengah dengan wajah cemas, berkeringat, dan lengan gemetar menahan roti. Anak-anak ceria berdiri di depan roti bawah. Gelembung kata muncul bergantian: "Mama Papa butuh perhatian ya, Nak…", "Papa, temenin main yuk!", dan "Capek? Iya. Tapi siapa lagi kalau bukan aku?". Kertas TAGIHAN "datang lagi!" masuk sambil bergoyang, lalu rantai mengikat sisi sandwich.
- **Prompt visual:** `Cinematic realistic portrait composition of three generations in the same warm Indonesian home: a man in his early 40s in the center, one arm around his 10-year-old son, his other hand supporting his elderly father in a brown batik shirt, gentle backlight from a window, symbolic and calm, slow push-in, consistent characters, no text, no logos`

## Scene 7 — Mulai dengan Perencanaan

- **Tujuan:** Mengalihkan kesadaran menjadi langkah yang dapat dimulai secara realistis.
- **Teks layar:** Mulai dari Kebutuhan yang Nyata
- **Naskah audio:** Kita tidak bisa mengendalikan semua hal. Tapi kita bisa mulai dengan mengenali kebutuhan, menilai perlindungan yang sudah ada, dan menyiapkan langkah sesuai kemampuan.
- **Estimasi durasi:** ±11,5 detik (scene ±13 detik).
- **Arahan visual:** Andi dan Maya berdiskusi di meja makan dengan buku catatan dan kalender. Natural, tanpa angka atau dokumen kecil yang perlu dibaca.
- **Ilustrasi aplikasi:** pagi cerah; buku Rencana Langkah dengan tiga butir yang dicentang satu per satu, tunas yang tumbuh di pot.
- **Prompt visual:** `Cinematic realistic scene, Indonesian couple in their early 40s (woman in sage hijab) discussing family plans at a wooden dining table with a notebook and a calendar, collaborative and hopeful mood, morning light, shallow depth of field, slow orbit camera, no readable numbers or small documents, no text, no logos`

## Scene 8 — Rantai Itu Putus di Aku

- **Tujuan:** Penutup emosional dan pengantar menuju pemilihan kebutuhan.
- **Teks layar utama:** RANTAI ITU PUTUS DI AKU
- **Teks pendukung:** Tiga Generasi. Satu Keputusan.
- **Naskah audio:** Rantai itu putus di aku. Bukan karena semua risiko hilang, tetapi karena aku mulai merencanakan. Beban finansial apa yang paling ingin kamu cegah agar tidak berpindah ke anak?
- **Estimasi durasi:** ±12 detik (scene ±13 detik).
- **Arahan visual:** Seluruh keluarga tiga generasi di halaman rumah pada pagi yang cerah: hangat, penuh harapan. Akhiri dengan ruang kosong di bawah bingkai untuk teks utama, lalu transisi ke halaman pilihan kebutuhan.
- **Ilustrasi aplikasi:** fajar terbit di atas bukit dan rumah; mata rantai tengah terbelah dalam kilau cahaya, rantai ke depan terlepas, lalu muncul sebuah hati.
- **Prompt visual:** `Cinematic realistic wide shot, the same three-generation Indonesian family gathered in their home front yard on a bright hopeful morning, grandparents, parents and a 10-year-old boy smiling together, warm sunrise light, gentle crane-up, leave clean empty space in the lower third for title text, no text, no logos`

---

## Daftar aset visual

Semua aset di bawah **belum tersedia** dan perlu disiapkan.

| Aset | Format yang didukung aplikasi | Nama berkas | Status |
|---|---|---|---|
| Latar scene 1–8 (video) | MP4 H.264, tanpa audio, 16:9 (1920×1080 atau 1280×720), 6–12 detik dapat diulang, ±2–5 MB | `s01.mp4` … `s08.mp4` | Harus dibuat |
| Poster/cadangan scene 1–8 (gambar) | JPG atau WebP 16:9, ±1600×900, ≤400 KB | `s01.jpg` … `s08.jpg` | Harus dibuat |
| Audio narasi scene 1–8 | MP3 (lihat dokumen ElevenLabs) | `sandwich-S01-01.mp3` … `sandwich-S08-01.mp3` | Terpasang |
| Video unduhan portrait & landscape | MP4 H.264 + AAC, terang/gelap | `assets/video/sandwich-{terang,gelap}{,-portrait}.mp4` | Tersedia |

Satu scene cukup memakai gambar saja atau video saja. Video tampil
`object-fit: cover`: bagian tengah aman, tepi bisa terpotong di HP. Simpan
subjek utama di area tengah dan sisakan ruang kosong di sepertiga bawah,
tempat teks layar ditampilkan.

### Cara memasang aset visual ke pemutar

Pemutar sudah mendukung latar realistis per scene lewat manifest
`window.PSGSandwichVisual`. Selama manifest ini tidak ada (kondisi
sekarang), ilustrasi animasi bawaan yang dipakai.

1. Simpan berkas di `assets/sales-idea/sandwich/`.
2. Buat `src/sales-idea-sandwich-visual.js`:

   ```js
   window.PSGSandwichVisual = {
     folder: 'assets/sales-idea/sandwich/',
     scene: {
       S01: { video: 's01.mp4', poster: 's01.jpg' },
       S02: { gambar: 's02.jpg' }
       /* … sampai S08; scene tanpa entri tetap memakai ilustrasi bawaan */
     }
   };
   ```

3. Muat berkas itu di `index.html` sebelum `src/sales-idea-sandwich.js`,
   lalu tambahkan manifest dan berkas aset ke precache `sw.js` dan naikkan
   `VERSI`.

Bila manifest tersedia, scene itu menampilkan media sebagai latar penuh,
menyembunyikan ilustrasi, dan menaruh teks layar di atas lapisan gelap
agar tetap terbaca di tema terang maupun gelap.

## Setelah scene 8: halaman pilihan kebutuhan

Judul **"Rantai Itu Putus di Aku. Mulai dari Mana?"** dengan lima pilihan.
Setiap pilihan melewati layar Profil yang sama dengan Sales Idea lain,
lalu membuka tools yang sudah ada:

| Pilihan | Tombol | Tujuan (kunci layar) |
|---|---|---|
| A. Belum tahu harus mulai dari mana | Petakan Kebutuhan Saya | `SEGITIGA` (Segitiga Financial) |
| B. Masa pensiun | Hitung Kebutuhan Dana Pensiun | `DP`. Sesudah dihitung, tombol "Solusi — penuhi dengan Lite Future" membuka `DP_SOLUSI` (BeSMART Lite Future). |
| C. Biaya kesehatan | Pilih Tools Perlindungan Kesehatan | Halaman tiga alternatif: `GSPA` (Gen Aman + Rider GHPS & Waiver), `BSL` (BeSMART Lite - 100 + rider GHP), `GHP` (GenPro + Rider GHP) |
| D. Penyakit kritis | Analisis Kebutuhan Penyakit Kritis | `NEEDS`, digulir ke kolom critical illness |
| E. Perlindungan keluarga | Analisis Perlindungan Keluarga | `NEEDS`, digulir ke kolom perlindungan jiwa |
