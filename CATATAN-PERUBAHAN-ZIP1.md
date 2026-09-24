# PSG Selling Tools — ZIP 1 + 1b

Baseline: **v37.4** (`PSG_SELLING_TOOLS_v37_4_SEGITIGA_PROFILE_SWITCH_RESET`)
Cache service worker: `insurance-hub-v90.37.2` → **`insurance-hub-v90.40.1`**

Isi ZIP ini: perbaikan bug, penyelarasan data, dan rapi-rapi.
**Tidak ada** workspace multi-agen. **Tidak ada** perubahan tarif.

---

## 1. Berkas yang diubah (19), baru (1), dihapus (1)

### Diubah

| Berkas | Alasan |
|---|---|
| `index.html` | teks konfirmasi logout, skrip anti-kedip tema, daftar script |
| `comparison-summary.html` | logout diselaraskan, skrip anti-kedip tema |
| `program-summary.html` | logout diselaraskan, skrip anti-kedip tema |
| `sw.js` | 6 berkas ditambahkan ke precache, fallback offline, VERSI naik |
| `src/access-gate.js` | logout tidak menghapus data, dialog ganti agen, tema per agen |
| `src/theme-switcher.js` | tema diingat per kode agen |
| `src/core.js` | selector tertanggung, reset pilihan saat ganti profil, `esc()`, rumus usia |
| `src/umum.js` | deteksi halaman Home |
| `src/app.js` | dropdown masa bayar, kombinasi NCP, GSPA akhir kontrak, tarif GSPA disatukan |
| `src/banding-produk.js` | kartu banding GSPA: premi per setoran + rider |
| `src/aktivitas.js` | tombol Cadangkan, tema dikecualikan, pencocokan prospek |
| `src/aktivitas-ui.js` | penanganan galat tombol Cadangkan |
| `src/data/catalog.js` | `TARIF_BSL` & `TARIF_GSPA` dihapus, `CRIS_USIA_MAKS` 70→60 |
| `src/engines/gspa.js` | timeline sampai usia 100, batas booster |
| `src/engines/ghp.js` | anti-crash, penulisan jenis kelamin |
| `src/engines/cristalPrime.js` | pesan batas usia, rumus usia |
| `src/engines/liteFuture.js` | rumus usia |
| `src/engines/iflexyguard.js` | rumus usia |

### Baru

- `src/engines/usia.js` — satu-satunya sumber rumus usia Generali

### Dihapus

- `src/engines/besmartLite.js` — mesin BSL lama, tidak pernah dipanggil

### Tidak diubah — 40 berkas identik byte per byte

Termasuk seluruh mesin dan modul berikut:
`besmartLiteLengkap.js`, `newCemerlangPrime.js`, `productRegistry.js`,
`bsl-lengkap.js`, `bsl-ui.js`, `segitiga.js`, `segitiga-solusi.js`,
`dp-solusi.js`, `solusi-pendidikan.js`, `ghp-aturan.js`, `ghp-sambung.js`,
`banding-ghp.js`, `banding-gpro.js`, `banding-cetak.js`, `banding-genwealth.js`,
`gen-wealth.js`, `rizqia.js`, `slip-komisi.js`, `kartu-konsultan.js`,
`library-ilustrasi.js`, `preview-cetak.js`, `isian-terakhir.js`,
`catatan-ghp.js`, `prompt-flyer.js`, `styles.css`, seluruh aset dan ikon.

---

## 2. Yang sengaja TIDAK disentuh

- **`waiverHitung`** — rumus waiver Gen Aman. Rasio tahunan/bulanan 10,0833
  memang berbeda dari ×11; kedua basisnya sudah dicocokkan terpisah ke tarif
  master dan ilustrasi resmi. Hanya ditambah komentar pelindung.
- **Seluruh mesin BeSMART Lite Future** — premi, waiver LF, diskon 5%,
  batas premi minimum, optimasi kombinasi UP.
- **Aturan konteks Segitiga** (reset ke Leo saat profil aktif berganti).
- **Rumus kebutuhan Segitiga** — health, critical illness, life, pensiun.
- **Aturan poin** — 2 poin presentasi, dedup 30 hari, batas 30, HNW ≥ Rp100 jt,
  target 100 poin, tanggal kontes.
- **Seluruh angka tarif produk.** Sudah diverifikasi setia pada master Excel:
  2.449 sel dibandingkan, nol perbedaan.
- **Faktor ×11 untuk premi tahunan** di semua produk.
- Tampilan, tata letak, warna, dan teks penjualan.

---

## 3. Klasifikasi kunci penyimpanan

### GLOBAL / PERANGKAT — tidak dihapus saat logout, tidak ikut cadangan

| Kunci | Isi |
|---|---|
| `insuranceHub.theme.v3` | tema yang sedang aktif |
| `insuranceHub.theme.byAgent.v1` | tema terakhir tiap kode agen |

**Dicabut saat logout — bukan data, melainkan izin masuk**

| Kunci | Isi |
|---|---|
| `insuranceHub.access.remember.v3` | otorisasi perangkat ("Ingat saya") |
| `insuranceHub.access.v3` (sessionStorage) | otorisasi sesi |


### SESI — dibersihkan saat logout

| Kunci | Isi |
|---|---|
| `insuranceHub.isianTerakhir.v1` | isian sementara kalkulator |
| `insuranceHub.segitiga.globalContext.v1` | penanda konteks Segitiga |
| seluruh `sessionStorage` | `comboImport`, `comboGeneratedSummary`, `comparisonSummary`, `externalReturn.v1`, `returnContext.v1`, `selectedProgram`, `access.v3` |

### DATA KERJA AGEN — tidak pernah dihapus, ikut cadangan

`customerProfiles.v1` · `customerProfile.active.v1` · `konsultan.v1` ·
`libraryIlustrasi.v1` · `aktivitas.kejadian.v1` · `aktivitas.klaim.v1` ·
`agen.v1` · `agen.foto.v1` · `level.v1` · `needsAnalysis.v2` ·
`comparison.v6` · `segitiga.v1` · `segitiga.profiles.v2` ·
`segitiga.solusi.v2` · `segitiga.compare.v1` · `segitiga.calculate.v1` ·
`segitiga.alternatives.v1` · `segitiga.lfTarget.v2` ·
`segitiga.solutionBridge.v1` · `segitiga.programBuilder.v1`

### SISTEM — tidak ada di penyimpanan

Formula, tarif, aturan diskon, aturan waiver, metadata produk, dan seluruh
logika perhitungan berada di dalam berkas JavaScript, **nol** di localStorage.

---

## 4. Hasil pengujian

### Syntax check
45 berkas JavaScript, **0 gagal**.
Seluruh script digabung berurutan (1.322 KB) dan diperiksa ulang — tidak ada
deklarasi `const`/`let` ganda antarberkas.

### Regresi hasil hitung — 1.139 kasus

Mesin produk dari v37.4 asli dan dari build ini dipanggil dengan input yang
sama, lalu **seluruh field hasilnya** dibandingkan.

| Mesin | Kasus | Berbeda |
|---|---|---|
| Lite Future | 224 | 0 |
| BeSMART Lite (lengkap) | 210 | 0 |
| Cristal Prime | 108 | 0 |
| New Cemerlang Prime | 189 | 0 |
| iFLEXYGUARD | 60 | 0 |
| GHP GenPro | 60 | 0 |
| Gen Aman (GSPA) | 288 | 272 — hanya field `timeline` |
| **Total** | **1.139** | **272, semuanya disengaja** |

Verifikasi rinci 272 kasus GSPA:

```
Timeline bertambah tepat 1 baris           : 272 / 272
Baris lama hanya berubah penanda akhir masa: 272 / 272
Baris baru = usia 100 & cocok ringkasan    : ya, semua
Perubahan lain yang tidak diharapkan       : 0
```

Seluruh field ringkasan GSPA — premi, diskon, booster, santunan usia 100,
total dibayar — identik di 272 kasus.

### Uji integrasi
22 pemeriksaan, semuanya lulus: logout mencabut otorisasi lalu layar masuk
muncul lagi saat aplikasi dibuka, data agen tetap utuh (15 kunci),
tema per agen lintas 5 skenario, identitas dan deteksi ganti agen,
pilihan tertanggung mengikuti profil aktif.

### Uji cadangan
`cadangkan()` → berhasil (sebelumnya `ReferenceError`).
Putaran penuh cadangkan → hapus semua → pulihkan: Kartu Konsultan, Library,
dan profil kembali utuh; tema perangkat tidak ditimpa.

### Uji integritas berkas
- Setiap script di `index.html` ada di disk: **0 hilang**
- Setiap script di `index.html` ada di precache SW: **0 hilang**
- Setiap entri precache ada di disk: **0 hilang**
- Berkas di disk tapi tidak dimuat: **0**
- ID ganda di `index.html`: **0**
- Ketiga HTML terparsir tanpa galat

---

## 5. Tingkat pengujian — batasnya

**Browser E2E belum dapat dijalankan.** Tidak ada browser di lingkungan tempat
ZIP ini dibuat.

Yang benar-benar dilakukan:
- pemeriksaan sintaks seluruh berkas
- pemanggilan langsung mesin produk dengan pembandingan hasil
- menjalankan `access-gate.js` dan `theme-switcher.js` apa adanya di atas
  localStorage dan DOM tiruan
- pemeriksaan silang berkas dan kunci penyimpanan

Yang **belum** diverifikasi dan perlu kamu coba di perangkat:
- tampilan dan tata letak di layar HP
- alur klik antar layar
- hasil cetak PDF
- pemasangan PWA dan perilaku offline sebenarnya
- kedipan tema saat halaman dibuka

---

## 6. Yang perlu diperiksa setelah dipasang

1. **Kartu banding GSPA** — angka premi kini sama dengan ringkasan.
   Sebelumnya pada metode Bulanan angkanya 12× terlalu tinggi.
2. **Tombol Cadangkan** — pastikan berkas JSON benar-benar terunduh.
3. **Logout lalu masuk lagi** — Kartu Konsultan, Library, poin, dan profil
   harus utuh.
4. **Ganti profil aktif** lalu buka layar produk — dropdown "Data tertanggung"
   harus berisi keluarga profil yang baru, dan kembali ke "Diri Sendiri".
5. **Tema** — pilih Dark, logout, masuk lagi dengan kode agen yang sama →
   tetap Dark.
6. **Timeline GSPA** — baris terakhir kini usia 100.

---

## 7. Belum dikerjakan

| | Isi |
|---|---|
| ~~ZIP 1b~~ | **sudah termasuk di ZIP ini** |
| **ZIP 1c** | Empat tarif — **dibatalkan**, PWA terbukti setia pada master |
| **ZIP 2** | Workspace multi-agen (isolasi data antaragen) |
| Terbuka | Tarif GPRO belum bisa diverifikasi — sheet-nya tidak ada di workbook master yang dikirim |


---

# TAMBAHAN ZIP 1b — Kartu Konsultan atas nama agen lain

## Cara pakai

Buka **Kartu Konsultan**, gulir ke blok **"Dibuat untuk agen lain"**.

1. Pilih **Atas nama agen lain**
2. Isi nama agen, kode agen, jabatan, WhatsApp (opsional)
3. **Simpan ke tim** kalau agennya sering kamu bantu — lain kali tinggal pilih
   dari dropdown "Tim tersimpan"
4. Spanduk kuning muncul di atas layar selama mode ini aktif, dengan tombol
   **"Kembali ke nama saya"**

## Yang berubah saat mode aktif

| | Saat aktif |
|---|---|
| Nama, jabatan, WhatsApp di dokumen | milik agen yang dibantu |
| Kolom penyaji di semua layar kalkulator | ikut diganti |
| Foto, media sosial, email, QR WhatsApp | **milik agen tersebut** — diunggah dan diisi sendiri per anggota tim |
| Kontak dan foto milikmu | tidak ikut sama sekali |

Foto diperkecil otomatis ke 320x320 JPEG sebelum disimpan. Kalau penyimpanan
perangkat penuh, muncul pesan jelas — bukan gagal diam-diam.

## Penanda di Library

Ilustrasi yang dibuat saat mode ini aktif diberi label oranye
**"Atas nama Wulan (12345)"** di kartu Library, dan tersimpan sebagai
`atasNamaAgen` + `atasNamaKode` pada entrinya. Jadi berbulan-bulan kemudian
masih jelas mana ilustrasi milikmu dan mana yang kamu bantu buatkan.

## Yang TIDAK berubah

Poin, presentasi, closing, klaim, profil nasabah, Library, dan seluruh data
kerja tetap tercatat **atas namamu**. Kamu tetap masuk sebagai dirimu sendiri.
Yang berubah hanya identitas yang tercetak di dokumen.

## Penyimpanan

`insuranceHub.konsultan.atasNama.v1` — masuk kategori **data kerja agen**:
ikut dicadangkan, tidak dihapus saat logout, daftar tim tetap tersimpan
walaupun modenya dimatikan.

## Berkas yang diubah untuk 1b

`index.html` (blok baru), `src/kartu-konsultan.js` (modul + spanduk),
`src/app.js` (2 titik baca identitas), `src/umum.js` (kolom penyaji).

## Pengujian 1b

16 pemeriksaan, semuanya lulus: identitas berganti dengan benar, media sosial
dan foto tidak terbawa, mode gagal aktif kalau nama kosong, daftar tim
bertahan setelah mode dimatikan, tidak terhapus saat logout.

Regresi 1.139 kasus dijalankan ulang setelah 1b — hasilnya tidak berubah.


## Perbaikan: identitas sendiri vs identitas cetak

Formulir Kartu Konsultan **selalu berisi identitasmu sendiri**, tidak pernah
ikut berubah saat mode "dibuat untuk agen lain" aktif. Yang berubah hanya
pratinjau dan dokumen yang tercetak.

Sebelum perbaikan ini, formulir ikut terisi data agen yang dibantu. Menekan
"Simpan identitas dokumen" akan menimpa identitas aslimu dengan data agen
tersebut — dan sesudah mode dimatikan, identitasmu tidak bisa kembali karena
aslinya sudah tertulis ulang.

Dua lapis pengaman sekarang:
1. Formulir diisi dari `getSendiri()`, bukan dari identitas cetak.
2. Tombol "Simpan identitas dokumen" ditolak selama mode masih aktif, dengan
   pesan untuk mematikannya dulu.

Pratinjau kartu diberi keterangan oranye saat mode aktif, agar jelas bahwa
yang terlihat adalah dokumen milik agen lain — bukan identitasmu.


## Tombol "Pulihkan identitas saya"

Tombol lama "Reset identitas" diganti menjadi **"Pulihkan identitas saya"**
dan kini melakukan pemulihan menyeluruh:

1. mematikan mode "Dibuat untuk agen lain"
2. menghapus `insuranceHub.konsultan.v1`
3. mengembalikan nama pada `insuranceHub.agen.v1` ke nama login (`level.v1`)

Langkah ketiga yang penting. Saat menyimpan Kartu Konsultan, namanya ikut
disalin ke `agen.v1`. Kalau pernah tertimpa identitas agen lain, nama itu
tetap muncul sebagai cadangan walaupun `konsultan.v1` sudah dihapus — sehingga
identitas terasa "tidak bisa kembali". Data login adalah satu-satunya sumber
yang tidak pernah tersentuh mode atas nama.

Foto profil dan daftar tim tidak ikut terhapus.


## Perbaikan: tombol Solusi Dana Pensiun memakai isian lama

Di layar Dana Pensiun, susunan polis (`polisAktif`) disimpan di memori dan
hanya dibangun ulang saat kosong. Kalau agen mengubah **lama siapkan dana**
atau **usia pensiun** sesudah pernah membuka salah satu tombol Solusi,
kedua halaman tujuan masih memakai masa bayar yang lama — padahal halaman
hitungnya sudah menampilkan angka baru.

Sekarang isian dicatat sebagai sidik jari (tanggal lahir, usia pensiun, lama
siapkan, target, dana tersedia, pertumbuhan). Begitu salah satu berubah,
susunan polis dibangun ulang. Kalau tidak ada yang berubah, susunan lama tetap
dipakai sehingga penyesuaian manual per kartu tidak hilang.

Berlaku untuk kedua tombol: "Solusi — penuhi dengan Lite Future" dan
"Bandingkan cara manual dengan Lite Future".


## Perbaikan: kolom penyaji tidak kembali ke nama sendiri

Saat mode "dibuat untuk agen lain" aktif, kolom penyaji di seluruh layar
kalkulator (`xAgenNama`, `xAgenHP`) ditimpa nama agen tersebut. Ketika mode
dimatikan, `isiIdentitasAgen()` melewati kolom yang sudah berisi — aturan
lama yang benar untuk melindungi ketikan agen — sehingga nama agen lain
tertinggal di sana.

Sekarang kolom yang ditimpa mode atas nama diberi penanda
`data-psg-atas-nama`. Penanda itulah yang mengizinkan penulisan ulang saat
mode dimatikan, dan dihapus setelahnya. Kolom yang kamu ketik sendiri tetap
tidak diganggu.

Kolom penyaji juga langsung disegarkan setiap kali mode berganti — lewat
segmen, lewat tombol spanduk, maupun lewat "Pulihkan identitas saya" — jadi
tidak perlu berpindah layar dulu.


## Perbaikan: media sosial tidak pernah ikut tercetak

Blok konsultan pada dokumen cetak (`consultantNode` di `src/preview-cetak.js`)
hanya merakit nama, jabatan, WhatsApp, email, dan QR. Kolom Instagram, TikTok,
Facebook, LinkedIn, dan YouTube tersimpan dengan benar tetapi tidak pernah
muncul di dokumen mana pun — untuk siapa pun, bukan hanya saat mode "dibuat
untuk agen lain" aktif.

Sekarang media sosial ikut tercetak, ditulis sebagai nama akun alih-alih URL
penuh (`instagram.com/wulan` menjadi `wulan`) supaya dokumen nasabah lebih
enak dibaca.


## Blok "Pilih cara kerja" bisa dilipat

Tombol **Sembunyikan / Tampilkan** di samping judulnya. Saat dilipat, Kalkulator
Cepat langsung terlihat tanpa menggulir.

Pilihannya diingat di `insuranceHub.ui.caraKerjaTertutup.v1` — preferensi
tampilan per perangkat, bukan data nasabah. Tidak dihapus saat logout, tetapi
tidak ikut dicadangkan sebagai data agen karena kunci ini berawalan
`insuranceHub.ui.` dan hanya mengatur tampilan.


## Perbaikan: ilustrasi lama di Library berganti identitas

Nama penyaji ikut tersimpan di dalam cuplikan HTML ilustrasi, jadi tetap benar.
Tetapi kartu konsultan digambar ulang setiap kali ilustrasi dibuka, memakai
identitas yang sedang aktif saat itu. Akibatnya ilustrasi yang dibuat atas nama
agen lain menampilkan penyaji agen itu, tetapi kartu konsultan di bawahnya
berubah menjadi identitas pemilik perangkat.

Sekarang potret identitas konsultan — nama, jabatan, WhatsApp, email, seluruh
media sosial, pengaturan QR, dan foto — ikut disimpan bersama ilustrasinya di
`item.konsultan`. Saat ilustrasi lama dibuka atau dicetak, potret itulah yang
dipakai. Dokumen yang sudah jadi tetap utuh apa adanya, berapa kali pun
identitas aktif berganti sesudahnya.

Berlaku untuk ringkasan Library, detail ilustrasi, dan cetak PDF. Ilustrasi
yang disimpan sebelum versi ini belum punya potret, jadi tetap mengikuti
identitas aktif seperti perilaku lama.


## Perbaikan: kaki dokumen mengira nama agen belum diisi

Baris "Disajikan oleh" di 14 layar dibangun hanya dari kolom `xAgenNama` dan
`xAgenHP` di layar itu. Pada sebagian layar ringkasan, kolom tersebut tidak
selalu sempat terisi sebelum dokumen digambar, sehingga muncul pesan
"Isi nama dan kontak agen di layar kalkulator agar tampil di sini." padahal
Kartu Konsultan sudah lengkap.

Keempat belas titik itu kini memakai satu fungsi `kakiAgenHtml()` yang jatuh
ke Kartu Konsultan bila kolomnya kosong, lalu ke `agen.v1`, lalu ke nama login.
Karena dibaca lewat `InsuranceHubConsultantCard.read()`, mode "dibuat untuk
agen lain" ikut berlaku di kaki dokumen. Pesan lama hanya muncul kalau memang
tidak ada identitas sama sekali.


## Tambahan: Simpan ke Library di halaman Program Perlindungan Nasabah

Halaman itu berkas HTML terpisah (`program-summary.html`), sedangkan tombol
Simpan ke Library dipasang oleh `library-ilustrasi.js` yang hanya dimuat di
`index.html`. Karena itu tombolnya tidak pernah muncul di sana.

Sekarang halaman tersebut punya tombolnya sendiri, menulis ke kunci Library
yang sama (`insuranceHub.libraryIlustrasi.v1`) dengan bentuk item yang sama,
sehingga hasilnya bisa dibuka, dicari, difavoritkan, dan dicetak seperti
ilustrasi lain. Potret identitas konsultan ikut disimpan — termasuk mode
"dibuat untuk agen lain" beserta penanda oranyenya. Kalau penyimpanan penuh,
muncul pesan yang jelas.


## Perbaikan: kontrol ganda pada komponen Health (Program Builder)

Pada komponen Health, kontrol produknya dirakit di dua tempat: blok
`need==='health'` dan rantai per-produk di bawahnya. Keduanya berjalan, jadi
di layar muncul dua "Plan Health" dan dua sakelar "Waiver Gen Aman" — dan
tidak jelas mana yang dipakai perhitungan.

Blok `need==='health'` kini hanya memuat keterangannya. Seluruh kontrol
dirakit sekali saja oleh rantai per-produk, yang memang paling lengkap.

Hasil setelah perbaikan, tiap kontrol muncul tepat sekali:

| Kode | Plan | Waiver | UP | Lama bayar | Cara bayar | Lite UP |
|---|---|---|---|---|---|---|
| GSPA_HEALTH | 1 | 1 | 1 | 1 | 1 | — |
| GPRO_HEALTH | 1 | — | 1 | — | 1 | — |
| BSL_HEALTH | 1 | — | 1 | 1 | — | 1 |

Kedua catatan penjelas ("Health menggunakan …" dan "Premi GHP dibayar terus …")
tetap ada.


## Halaman pertama kosong sesudah header saat mencetak

`.blok` diberi `break-inside:avoid` supaya kartu tidak pernah terbelah. Bagus
untuk kartu pendek, tetapi kalau tinggi sebuah blok melebihi sisa ruang di
halaman itu, blok tersebut pindah utuh ke halaman berikutnya — meninggalkan
ruang kosong besar di bawah header.

Saat mencetak, blok yang lebih tinggi dari 620 px kini boleh terbelah
antarhalaman. Yang di dalamnya tetap dijaga utuh: baris tabel, kartu, kotak
angka, dan stasiun tidak pernah terbelah, dan judul tidak pernah terpisah dari
isinya.

Blok pendek tidak disentuh sama sekali, sehingga tata letak yang sudah rapi
tidak berubah. Kelasnya dipasang pada `beforeprint` dan dilepas pada
`afterprint`, jadi tampilan layar sama persis seperti sebelumnya.

Kalau hasilnya justru kurang pas, ambangnya ada di satu tempat:
`AMBANG_BLOK_PANJANG` di `src/preview-cetak.js`. Menaikkannya membuat lebih
sedikit blok terpengaruh; mengubahnya menjadi angka sangat besar
mengembalikan perilaku lama sepenuhnya.


## Data agen yang dibantu pada cadangan

`insuranceHub.konsultan.atasNama.v1` — daftar tim beserta foto, media sosial,
dan pengaturan QR-nya — **sudah ikut tercadangkan sejak awal**, karena snapshot
menyapu seluruh kunci berawalan `insuranceHub.`. Yang kurang adalah hasil
audit: daftar "persisten penting" tidak menyebutnya, sehingga terlihat seolah
tidak ikut. Kunci itu kini ditampilkan di hasil Audit backup.

## Ukuran logo pada hasil cetak

`.logo-cetak` sudah dibatasi 22 mm, tetapi sebagian halaman mencetak logo
aplikasi `.logo-psg-app` yang ukurannya memakai `clamp()` dengan satuan `vw`.
Pada media cetak, `vw` mengacu pada lebar kertas sehingga logonya membesar jauh
melebihi proporsi dokumen. Ukuran logo saat mencetak kini dikunci 22 mm,
selaras dengan `.logo-cetak`.


## Pemulihan cadangan tidak sempurna — tiga penyebab

**1. Aplikasi tidak dimuat ulang sesudah pulihkan.** Profil nasabah, Kartu
Konsultan, Library, foto agen, dan Segitiga sudah memuat isinya ke memori saat
aplikasi dibuka. Menulis localStorage saja tidak mengubah apa yang sudah
terlanjur dibaca, sehingga sebagian layar tetap menampilkan keadaan lama.
Sebelumnya hanya layar Aktivitas yang digambar ulang. Sekarang aplikasi dimuat
ulang setelah pemulihan berhasil.

**2. Berkas cadangan lama ditolak seluruhnya.** Sejak tema dikecualikan dari
cadangan, kunci tema masuk daftar CADANGAN_SKIP_KEYS. Pemeriksaan lama
menganggap kehadiran kunci itu di dalam berkas sebagai tanda rusak, sehingga
berkas yang dibuat sebelum perubahan tersebut ditolak dan tidak ada satu pun
data yang kembali. Sekarang kunci semacam itu cukup dilewati saat menulis.

**3. Kuota penuh membatalkan sisanya tanpa penjelasan.** Seluruh penulisan
dibungkus satu try, jadi begitu satu kunci besar (mis. foto agen) melebihi
kuota, sisanya batal ditulis dan agen hanya melihat pesan umum. Sekarang setiap
kunci ditulis sendiri, dan pesan menyebutkan bagian mana yang gagal.

## Mode "Ketik manual" pada kalkulator

Dropdown "Data tertanggung" mendapat pilihan baru **Ketik manual (tanpa
profil)**. Saat dipilih, isian nama, tanggal lahir, dan jenis kelamin di layar
itu tidak lagi ditimpa profil aktif — agen bisa langsung memakai kalkulator
tanpa membuat Profil Nasabah lebih dulu.

Mode ini berlaku per layar, dan otomatis berakhir bila agen memilih anggota
keluarga lagi atau mengganti profil aktif.


## Formulir closing: masa bayar dan masa perlindungan selalu "tidak berlaku"

Formulir closing baru berangkat dari objek kosong, sehingga `s.produk` dan
`s.status` undefined sementara elemen <select> menampilkan opsi pertama.
Akibatnya `MASA_PRODUK[undefined]` selalu kosong dan kedua dropdown jatuh ke
"— tidak berlaku —", padahal produknya terlihat sudah terpilih. Status pun
tersimpan "Pengajuan" tanpa disadari — inilah sebab poin closing tetap nol.
Nilai awal kini disamakan dengan yang benar-benar tampil di layar.

Untuk BeSMART Lite Future, "masa perlindungan" adalah usia pensiun, jadi
pilihannya kini 55/60/65/70/75 dengan label "Usia pensiun", bukan "tahun".
Masa bayar mengikuti kalkulator: 5/10/15/20.

## Panel Library gelap saat tema terang

`.library-detail-body`, `.library-batch-body`, `.library-summary-body`, dan
`.psg-print-preview-body` memakai `var(--bg)` dan `var(--text)` — dua variabel
yang tidak pernah didefinisikan di berkas ini, sehingga selalu jatuh ke nilai
cadangan gelap. Di tema gelap kebetulan terlihat benar. Sekarang memakai
`--kertas-2` dan `--tinta` yang memang berubah mengikuti tema.


## Delapan variabel CSS yang tidak pernah didefinisikan

Audit seluruh berkas menemukan delapan variabel yang dipakai 62 kali tetapi
tidak pernah punya definisi: --bg, --text, --surface, --surface-2, --surface-3,
--border, --accent, --sig-shadow-sm. CSS karena itu selalu memakai nilai
cadangan di dalam var(), dan nilai cadangan itu semuanya warna gelap.

Paling terasa di Library Nasabah (.library-family, .library-relation,
.library-item-card, .library-card): daftarnya tetap hitam walaupun aplikasi
memakai tema bawaan yang terang. Pada tema gelap kebetulan cocok, sehingga
selama ini tidak terlihat sebagai masalah.

Kedelapannya kini dipetakan ke variabel tema yang memang sudah ada dan berubah
mengikuti tema (--kertas, --kertas-2, --tinta, --garis, --emas). Tema gelap
menimpa kelima variabel itu dengan !important, jadi pemetaan ini ikut berubah
sendiri tanpa aturan tambahan.

Perubahan ini hanya MENAMBAH definisi, tidak mengubah satu pun aturan yang
sudah ada, sehingga halaman yang selama ini sudah benar tidak ikut berubah.


## Poin closing: syarat urutan tanggal dilonggarkan

Sebelumnya closing hanya berpoin bila ada presentasi yang tanggalnya TIDAK
MELEWATI tanggal SPAJ. Tanggal presentasi tercatat otomatis saat agen menekan
Cetak dan tidak bisa diedit, sedangkan tanggal SPAJ diisi manual. Agen yang
presentasi lebih dulu tetapi baru mencetak ilustrasinya beberapa hari kemudian
kehilangan poin closing tanpa kesalahan apa pun — dan kontes jadi terasa
dipersulit.

Sekarang syaratnya cukup: pernah ada presentasi tercatat untuk prospek yang
sama. Urutan tanggal tidak lagi diperiksa.

Risiko penyalahgunaan tetap kecil karena poin presentasi dibatasi 30 dari 100,
bernilai 2 poin per presentasi, dan prospek yang sama baru berpoin lagi setelah
30 hari.

Dua gerbang lain tidak berubah: status harus Inforce, dan tanggal SPAJ tidak
boleh sebelum kontes dimulai.


## Penggabungan fitur dana pensiun dari repositori

Enam kolom "Kebutuhan gaya hidup saat pensiun" ditambahkan ke Profil Nasabah:
biaya hidup rutin, jalan-jalan/liburan, hobi & aktivitas, membantu keluarga,
kesehatan, kebutuhan lain — semuanya per bulan, tersimpan di
`snapshot.pensiun`.

Kalkulator Kebutuhan Dana Pensiun kini mulai KOSONG. Sebelumnya keenam
komponen terisi angka bawaan bertotal Rp19 juta, dan angka itu ikut terbawa ke
ilustrasi nasabah tanpa disadari agen.

Perilakunya:
- profil aktif punya data pensiun -> kalkulator terisi otomatis
- profil aktif tidak mengisinya -> kalkulator kosong, agen isi manual
- pindah dari profil terisi ke profil kosong -> kalkulator ikut kosong
- tanpa profil aktif -> kalkulator kosong
- profil yang SAMA tidak menimpa isian manual setiap layar dibuka; sinkron
  ulang hanya bila profilnya berganti atau datanya berubah

`vendor/qrcode.js` sengaja TIDAK ikut. Berkas itu menganggur di repositori —
tidak dimuat index.html maupun sw.js, dan tidak dipanggil kode mana pun. QR
WhatsApp saat ini masih dibuat oleh layanan luar quickchart.io, sehingga tidak
muncul saat offline. Menyambungkan qrcode.js adalah pekerjaan tersendiri.

## Teks kaki halaman

Halaman login: "Aplikasi internal PSG Agency - Offline" menjadi
"(c) 2026 PSG Selling Tools - Internal Use Only".
Dashboard: "Seluruh kalkulator sudah aktif..." menjadi teks yang sama.

## Model lipat "Pilih cara kerja"

Sebelumnya tombol Tampilkan/Sembunyikan — tampilannya berbeda sendiri di
halaman yang sama. Sekarang memakai <details class="quick-group">, persis
seperti model lipat Quick Calculator, lengkap dengan ikon dan keterangan di
baris ringkasannya. Pilihan buka/tutup tetap diingat per perangkat.


## Waiver Gen Aman — TEMPAT 1: layar Perbandingan Solusi

Sebelumnya calcGSPA (app.js) selalu menulis setSeg('gWaiverRider','Tidak'),
sehingga premi Gen Aman di layar ini SELALU tanpa waiver — berbeda dari
kalkulator Gen Aman aslinya.

Yang ditambahkan:
- baris "Rider Waiver Gen Aman" di formulir Buat Alternatif, muncul hanya
  saat produk GSPA dipilih, default Ya
- premi waiver dihitung dengan waiverHitung() — fungsi yang SAMA dipakai layar
  Gen Aman, bukan salinan rumus
- premi waiver masuk ke premi per setoran dan ke total dibayar
- tabel "Bila terdiagnosa penyakit kritis": per tahun masa bayar, menampilkan
  sisa masa bayar dan kontribusi dasar yang dibebaskan. Tabel muncul di
  pratinjau hasil dan di kartu alternatif tersimpan
- catatan bahwa kontribusi waiver sendiri tetap dibayar, sesuai ketentuan polis

Contoh usia masuk 42, pria, bayar 5 tahun, UP Rp1 M, Bulanan:
- waiver OFF: Rp3.339.700 per bulan, total Rp200.382.000
- waiver ON : Rp3.642.681 per bulan (dasar + waiver Rp302.981),
              total Rp218.560.860

Tempat 2, 3, dan 4 belum dikerjakan.


### Angka waiver tampil dengan koma

Rumus waiver menghasilkan pecahan (mis. Rp3.055.057,9166). Layar Gen Aman
menampilkannya lewat rp() yang membulatkan, sedangkan layar Perbandingan
Solusi memakai money() yang tidak — sehingga premi tampil dengan koma begitu
waiver diambil.

Nilai waiver, premi per setoran, premi per tahun, total dibayar, dan angka di
tabel simulasi kini dibulatkan ke rupiah penuh. Pembulatan dilakukan pada
nilai yang dipakai, BUKAN di dalam waiverHitung, supaya rumusnya tidak
tersentuh sama sekali.


## Tabel lebar dipecah saat mencetak

Timeline gabungan bisa punya 10-11 kolom. Dipaksa muat ke satu halaman, kolom
angka yang nowrap merebut seluruh ruang dan kolom teks terakhir tergencet
sampai tumpang tindih — tidak tertolong walaupun skala cetak diturunkan.

Mekanisme pemecahan tabel sebenarnya SUDAH ADA di program-summary.html sejak
lama, tetapi tidak pernah ada di dalam aplikasi. Karena itu cetakan dari
halaman ringkasan rapi sedangkan cetakan dari layar program rusak. Fungsinya
dipindahkan apa adanya ke preview-cetak.js beserta gaya CSS-nya.

Syarat pemecahan sengaja dibuat dua lapis supaya tabel yang selama ini sudah
rapi tidak ikut berubah:
1. jumlah kolom lebih dari 6, DAN
2. lebar alami tabel melebihi 1040px (A4 lanskap dikurangi margin)

Dengan syarat kedua, tabel seperti Rekap closing (8 kolom) dan GEN Wealth
(8-10 kolom) tetap tercetak utuh seperti sebelumnya; hanya timeline gabungan
dan tabel polis yang benar-benar melebihi kertas yang dipecah.


## Tabel pembebasan premi waiver di Ringkasan Program

Ringkasan Program selama ini hanya memuat satu kalimat peringatan tentang
waiver, tanpa angka. Nilai jual waiver jadi tidak terlihat.

Sekarang ada tabel "Bila terdiagnosa penyakit kritis": per tahun masa bayar,
menampilkan sisa masa bayar dan premi yang dibebaskan. Tabel muncul hanya bila
program memang memuat rider waiver.

Komponen yang dihitung mengikuti aturan yang sudah berlaku di mesin: hanya
premi berjangka dengan waiverEligible !== false. Premi GHP/GHPS (recurring)
dan premi waiver itu sendiri tidak ikut dibebaskan, dan keduanya disebut
eksplisit di catatan tabel.


### Perbaikan: tabel pembebasan waiver tidak pernah muncul

Filternya memakai nama field yang salah: amountPerYear dan years. Objek
komponen yang dihasilkan addFinite() memakai annual dan paymentTerm. Akibatnya
jumlah premi selalu 0 dan fungsi mengembalikan string kosong — tabelnya tidak
pernah tergambar sama sekali.

Nama field diperbaiki, dan usia masuk diambil dari currentAge yang memang
dihitung tepat di atas blok ringkasan. Nama komponen pada catatan pengecualian
juga diperbaiki dari c.label menjadi c.name.


### Tabel waiver hilang setelah alternatif disimpan

Tabel muncul saat menghitung, tetapi tidak di halaman Ringkasan Perbandingan
maupun cetaknya. Penyebabnya: comparison-summary.html hanya merender tabel
ringkas (produk, UP, premi, total) dan bagian Summary Benefit. Field
waiverHtml ikut tersimpan di tiap skenario tetapi tidak pernah dipakai.

Sekarang halaman itu menampilkan bagian "Pembebasan Premi (Waiver Gen Aman)"
untuk setiap alternatif TERPILIH yang memakai waiver, lengkap dengan nama
produk, UP, dan masa bayarnya. Bagian ini ikut tercetak.


## Waiver Gen Aman — TEMPAT 2: kalkulator Kombinasi

Cabang GSPA di comboSlot sebelumnya tidak mengenal waiver sama sekali,
sehingga premi Gen Aman di layar Kombinasi selalu lebih kecil daripada
kalkulator Gen Aman aslinya — dan tabel pembebasan premi tidak pernah sampai
ke Ringkasan Gabungan.

Yang ditambahkan:
- premi waiver dihitung dengan waiverHitung(), fungsi yang sama dipakai layar
  Gen Aman, lalu masuk ke premi bulanan/tahunan dan total dibayar
- pilihan waiver dibawa dari alternatif yang disimpan di Perbandingan Solusi
  (slot GSPA), sehingga angka tetap konsisten sampai ringkasan gabungan
- premi dasar tanpa waiver disimpan terpisah sebagai dasar perhitungan tabel
  pembebasan
- tabel "Bila terdiagnosa penyakit kritis" ikut dikirim ke program-summary.html
  bersama tabel manfaat gabungan

Contoh usia 22, bayar 5 tahun, UP Rp1 M, Tahunan:
- waiver OFF: premi Rp14.583.800/tahun, total Rp72.919.000
- waiver ON : premi Rp15.069.907/tahun (waiver Rp486.107), total Rp75.349.535


## Waiver Gen Aman — TEMPAT 3: Kombinasi Gen Aman + Lite Future

Berbeda dari tempat lain: di layar ini premi waiver SUDAH termasuk sejak awal
(app.js kombinasiHitung), bukan tambahan. Karena itu sakelarnya dibuat sebagai
PENGURANG saat dimatikan, bukan penambah saat dinyalakan — kalau dibalik,
preminya akan terhitung dua kali.

Yang ditambahkan:
- segmen "Rider Waiver Gen Aman" (Ambil / Tidak) di blok Gen Aman, default Ambil
- inp.pakaiWaiverGSPA dihormati kombinasiHitung; saat Tidak, waiver tidak
  dihitung dan premi kembali ke kontribusi dasar saja
- nilai waiver dibulatkan ke rupiah penuh, seperti layar lain
- tabel "Bila terdiagnosa penyakit kritis" di atas Ringkasan Program

Yang dibebaskan hanya kontribusi dasar Gen Aman. Kontribusi waiver sendiri dan
premi Lite Future tidak ikut — Lite Future punya waivernya sendiri dengan
tabel tarif berbeda, dan itu disebut eksplisit di catatan tabel.

Contoh usia 42, bayar 5 tahun, UP Rp1 M:
- Tahunan: OFF Rp36.736.700 -> ON Rp39.791.758 (waiver Rp3.055.058)
- Bulanan: OFF Rp3.339.700 -> ON Rp3.642.681 (waiver Rp302.981)
Angka ini cocok persis dengan layar Perbandingan Solusi.


## Waiver Gen Aman — TEMPAT 4: Financial Calculator, KPR vs Gen Aman

Kotak ini sebelumnya menghitung Gen Aman tanpa waiver sama sekali, padahal
justru di sinilah nilai jual waiver paling terasa.

Yang ditambahkan:
- segmen "Rider Waiver Gen Aman" (Ambil / Tidak), default Ambil
- premi waiver dihitung dengan waiverHitung(), masuk ke premi per setoran dan
  total dibayar
- tabel "Bila terdiagnosa penyakit kritis" dengan DUA kolom berdampingan:
  kontribusi Gen Aman yang dibebaskan, dan sisa cicilan KPR yang tetap harus
  dibayar pada tahun yang sama

Kolom KPR sengaja ditampilkan bersebelahan karena itulah inti pembandingnya:
sisa pinjaman tetap menjadi kewajiban debitur walau terdiagnosa penyakit
kritis, sedangkan kontribusi Gen Aman dibebaskan.

Contoh usia 42, nilai Rp1,5 M, bayar 10 tahun, Bulanan:
- waiver OFF: Rp2.501.100/bulan, total Rp300.132.000
- waiver ON : Rp2.719.899/bulan (waiver Rp218.799), total Rp326.387.880
- sakit kritis tahun ke-3: Gen Aman membebaskan Rp240.105.600

Dengan ini keempat tempat waiver Gen Aman selesai.


### Label kartu GSPA mengikuti pilihan waiver

Kartu ringkas di layar Kombinasi GSPA + Lite Future selalu berbunyi
"Termasuk Waiver" dan "bulanan + Waiver" karena waiver dianggap selalu ikut.
Begitu sakelarnya dimatikan, angkanya benar tetapi labelnya menyesatkan, dan
dua kartu terakhir mengulang angka yang sama.

Sekarang:
- waiver ON  : tiga kartu — dasar bulanan (belum termasuk Waiver), tahunan +
  Waiver, bulanan + Waiver
- waiver OFF : dua kartu — bulanan dan tahunan, keduanya berketerangan
  "Tanpa rider Waiver"


### Tabel pembebasan waiver kombinasi GSPA + LF juga di layar kalkulator

Tabelnya sudah dibuat sejak v90.48.0, tetapi hanya disisipkan ke kKotakRingkas
— elemen yang letaknya di layar Ringkasan nasabah. Layar kalkulator KMB sendiri
hanya punya elemen kHasil, sehingga agen tidak melihat angkanya sampai membuka
Ringkasan, dan cetakan dari layar kalkulator kehilangan bagian ini.

Sekarang tabel ditampilkan di kedua layar: kHasil (kalkulator) dan
kKotakRingkas (Ringkasan nasabah, ikut tercetak).


## Tabel pembebasan premi gabungan: Gen Aman + Lite Future

Waiver Lite Future WAJIB dan selama ini tidak pernah muncul di tabel
pembebasan — hanya Gen Aman. Padahal cara kerjanya sama: membebaskan sisa
premi dasar sampai akhir masa bayar.

Sekarang tabelnya digabung:
- waiver Gen Aman ON  : tiga kolom — Gen Aman, Lite Future, Total
- waiver Gen Aman OFF : satu kolom Total, isinya Lite Future saja; tabel
  TETAP tampil karena waiver Lite Future wajib
- masa bayar berbeda  : baris dibuat sampai masa bayar terpanjang, kolom yang
  masa bayarnya sudah habis diisi tanda pisah

out.lf kini memisahkan premiDasar dan premiWaiver (sebelumnya hanya setoran
gabungan), karena yang dibebaskan adalah premi dasar — premi waiver sendiri
tetap dibayar. Premi rider kesehatan GHP/GHPS tidak termasuk, dan itu disebut
eksplisit di catatan tabel.

Contoh usia 43, UP masing-masing Rp1 M, bayar 5 dan 5 tahun, Tahunan:
- Tahun ke-1: Gen Aman Rp183.683.500 + Lite Future Rp425.785.250
  = Total Rp609.468.750

## 12 September 2026 — RAYA Pro Maxima
- Menambahkan RAYA Pro Maxima ke kelompok **Dana Masa Depan**.
- Plan TJA1 5–15 dan TJA2 5–20; masa bayar 5 tahun.
- UP dasar contribution-driven: 5,5× untuk 5–15 dan 6× untuk 5–20.
- ADB Syariah wajib: 100% UP dasar, minimum Rp7,5 juta, maksimum Rp500 juta.
- Rate ADB baseline: 0,288%/tahun untuk 15 tahun dan 0,300%/tahun untuk 20 tahun, berdasarkan golden cases yang telah diaudit.
- Usia masuk: 5–15 maksimal 55 tahun; 5–20 maksimal 50 tahun.
- Menambahkan manfaat tahunan, manfaat akhir masa asuransi, manfaat meninggal, dan tabel penebusan sesuai materi training.
- Gender tidak digunakan dalam formula UP dasar.

## 12 September 2026 — RAYA v4 identity/input correction
- Memperbaiki regresi v3: input Nama Nasabah dan Tanggal Lahir sebelumnya hilang dari HTML, sementara JavaScript sudah mengharapkan `rayaNama` dan `rayaTglLahir`.
- Profil aktif sekarang hanya menjadi nilai awal; nama/tanggal lahir tetap dapat diketik manual.
- Identitas nasabah dirender di hasil client-facing sehingga ikut Preview/Cetak/Library.
- Menambahkan aksi eksplisit Preview, Cetak, Simpan ke Library, dan Bandingkan.
- Toggle Bandingkan menggunakan `aria-pressed` agar pilihan aktif jelas.

## 12 September 2026 — RAYA v5 duplicate-HTML cleanup
- Menghapus blok Data RAYA yang terduplikasi akibat patch v4.
- Memastikan setiap ID input RAYA (`rayaNama`, `rayaTglLahir`, `rayaPlan`, `rayaFreq`, `rayaKontribusi`, `rayaHitung`) hanya muncul sekali.


# v90.51.0 / v90.52.0 — audit logika waiver

Baseline: InsuranceHub_PWA_RAYA_ProMaxima_12Sep2026_v8.zip (v90.50.0).

## 1. Rumus sisa masa bayar diperbaiki di 5 tempat

Sebelumnya `mpp - th + 1` — tahun kejadian ikut dihitung sebagai dibebaskan.
Itu keliru: kalau klaim disetujui di tahun ke-N, premi tahun ke-N sudah
dibayar, sehingga yang dibebaskan adalah sisanya `mpp - th`.

Baris tahun terakhir juga dihapus: klaim pada tahun terakhir masa bayar tidak
membebaskan apa pun.

Tempat yang diperbaiki:
- Kombinasi Gen Aman + Lite Future (kTabelWaiver)
- Financial Calculator, KPR vs Gen Aman (rTabelWaiver)
- Perbandingan Solusi, Buat Alternatif (cmpTabelWaiverGSPA)
- Ringkasan Gabungan kombinasi (waiverGabunganHtml)
- Ringkasan Program, Segitiga (tabelPembebasanWaiver)

Catatan tiap tabel diperbarui: premi waiver sendiri TIDAK ikut dibebaskan
karena rider berakhir begitu klaim disetujui dan preminya tidak ditagihkan
lagi.

Contoh bayar 5 tahun, Gen Aman + Lite Future:
  Tahun ke-1  sisa 4 tahun  Rp49.002.800 + Rp133.885.400 = Rp182.888.200
  Tahun ke-2  sisa 3 tahun  Rp36.752.100 + Rp100.414.050 = Rp137.166.150
  Tahun ke-3  sisa 2 tahun  Rp24.501.400 +  Rp66.942.700 =  Rp91.444.100
  Tahun ke-4  sisa 1 tahun  Rp12.250.700 +  Rp33.471.350 =  Rp45.722.050

## 2. Posisi tabel dipindah ke bawah

Seluruh tabel pembebasan kini berada di bagian paling bawah ringkasan dan
cetak. Untuk halaman program-summary.html ditambahkan slot html.waiver yang
dirender SESUDAH tabel Timeline Program — sebelumnya tabel ikut di dalam
html.ringkasan sehingga muncul di atas.

## 3. BeSMART Lite Future: pemisahan premi dasar dan waiver

Layar Lite Future kini menampilkan rincian per usia pensiun:
  "Premi dasar Rp33.471.350 /tahun + waiver Rp1.115.604 /tahun (wajib)"

Total setoran tidak berubah — keduanya memang selalu digabung. Terverifikasi
premiDasar + premiWaiver = setoran pada kelima usia pensiun.

## 4. BeSMART Lite Future: tabel pembebasan premi

Blok baru di bagian paling bawah layar Ringkasan nasabah (#lfWaiverBlok),
dengan satu kolom per usia pensiun yang dipilih. Logikanya sama dengan waiver
Gen Aman: premi dasar yang belum dibayar dibebaskan; premi waiver sendiri
tidak.

## 5. Service worker

src/engines/rayaProMaxima.js dan src/raya-pro-maxima.js belum terdaftar di
daftar precache — ditambahkan. VERSI dinaikkan ke v90.51.0.

## BELUM DIKERJAKAN

- RAYA Pro Maxima: masa asuransi tidak berubah dinamis di Preview saat masa
  bayar 5 / asuransi 20 dipilih
- Financial planning > Kebutuhan dana pensiun > Solusi penuhi dengan Lite
  Future (dp-solusi.js): waiver belum diperiksa
- Financial calculator bagian tua/pensiun: belum diperiksa

## Pengujian

- Regresi hasil hitung: 1.139 kasus, 0 berbeda (tidak ada angka premi yang
  berubah)
- Syntax check: 47 berkas JS, 0 gagal
- Seluruh script digabung berurutan (1.405 KB): tidak ada deklarasi ganda
- HTML terparsir bersih, 0 id ganda
- Precache: 0 berkas hilang


# v90.52.0 — tiga item yang sebelumnya terbuka

## 1. RAYA Pro Maxima: masa asuransi tidak berubah di Preview

Penyebabnya bukan di modul RAYA. Pratinjau cetak menyalin layar dengan
cloneNode(true), dan cloneNode hanya menyalin ATRIBUT HTML — bukan keadaan
hidup elemen form. Akibatnya setiap <select> pada salinan kembali ke opsi
pertama, dan <input> kembali ke nilai awalnya.

Karena "Masa asuransi" RAYA memakai <select>, pilihannya selalu tampil
"5 tahun bayar - 15 tahun asuransi" di Preview walaupun yang dipilih 20 tahun.
Isian lain yang berupa teks biasa tidak terpengaruh, itu sebabnya hanya bagian
ini yang terlihat salah.

Ditambahkan salinKeadaanForm() di preview-cetak.js: keadaan select, input,
checkbox, radio, dan textarea disalin dari elemen asli ke salinan, lalu
ditulis balik ke atribut supaya ikut tercetak. Perbaikan ini berlaku untuk
SELURUH tools, bukan hanya RAYA.

## 2. Solusi Dana Pensiun (dp-solusi.js)

- rincian setoran kini memisahkan premi dasar dan premi waiver
  ("Premi dasar Rp33.471.350 + waiver Rp1.115.604 (wajib)")
- tabel "Bila terdiagnosa penyakit kritis" ditambahkan di bagian bawah,
  mendukung beberapa polis sekaligus dengan masa bayar berbeda; kolom polis
  yang masa bayarnya sudah habis diisi tanda pisah

## 3. Financial Calculator bagian pensiun

Diperiksa, tidak perlu diubah. Jalur ini bermuara ke Program Builder, dan
waiver Lite Future sudah terdaftar sebagai benefit category:'rider'
event:'waiver'. Diuji dengan model yang HANYA berisi Lite Future tanpa Gen
Aman: tabel pembebasan tetap muncul, dan premi waiver serta GHPS benar
dikecualikan.

## Pengujian

- Regresi hasil hitung: 1.139 kasus, 0 berbeda
- Syntax check: 47 berkas JS, 0 gagal
- Gabungan seluruh script (1.410 KB): tidak ada deklarasi ganda
- HTML terparsir bersih, 0 id ganda


# v90.53.0 — Aplikasi Web v1.2

## 1. Tabel waiver Lite Future: kolom total

Bila lebih dari satu usia pensiun dipilih, ditambahkan kolom "Total kontribusi
yang dibebaskan". Kalau hanya satu usia pensiun, kolom itu tidak muncul karena
akan mengulang angka yang sama.

## 2. Segitiga Financial: dua tabel pembebasan dengan angka berbeda

Ada DUA tabel. Yang lama ("Waiver Pembebasan Premi Program") memakai rumus
per-komponen: annual * (term - y) dijumlahkan untuk tiap komponen dengan masa
bayarnya masing-masing. Yang saya tambahkan di v90.51.0 memakai satu masa
bayar terpanjang untuk seluruh komponen.

Rumus saya SALAH untuk program dengan masa bayar campuran. Contoh dari PDF
(Gen Aman 5 th, Cristal 5 th, Gen Aman kesehatan 5 th, Lite Future 15 th):
komponen 5 tahun ikut dikalikan 14 tahun, sehingga angkanya menggelembung dari
Rp707.916.202 menjadi Rp2.667.838.956.

Tabel saya dihapus. Yang dipertahankan tabel lama yang rumusnya benar, dan
posisinya dipindahkan ke bagian paling bawah ringkasan — dikirim lewat
html.waiver sehingga dirender SESUDAH tabel timeline program.

Dengan rumus per-komponen, selisih masa bayar otomatis terlihat sebagai
penurunan nominal di tahun yang tepat.

## 3. Rumah Kedua: KPR vs Gen Aman

- tabel pembebasan premi versus cicilan KPR DIHAPUS dari halaman hitung
- dua baris baru di tabel "Yang didapat nasabah" pada layar Ringkasan:
  * Kalau meninggal dunia dalam masa cicilan — KPR lunas bila ada asuransi
    jiwa kredit yang diambil saat akad, rumah menjadi milik ahli waris;
    santunan Gen Aman sudah pasti menjadi milik ahli waris
  * Kalau terdiagnosa penyakit kritis — cicilan KPR tetap harus dibayar sampai
    lunas; kontribusi dasar Gen Aman dibebaskan sampai akhir masa bayar

## 4. Penanda versi aplikasi

src/app-version.js kini menyimpan window.PSG_APP_VERSION = 'v1.2'. Badge
"Aplikasi Web v1.2" ditampilkan di kaki halaman login dan kaki dashboard.
Nama variabel lama INSURANCE_HUB_APP_VERSION dipertahankan sebagai alias.

## 5. Nomor prioritas Segitiga

Nomor sebelumnya diposisikan di LUAR kotak lapis (left:-27px). Di layar HP
sempit angkanya terpotong. Sekarang ditempatkan di dalam kotak, menempel tepi
kiri, dengan ruang tambahan pada teks lapis supaya tidak tertimpa.

## 6. Waiver Gen Aman pada Kombinasi 5 produk

Mesin comboSlot sudah menghitung waiver sejak v90.47.0, tetapi tidak ada
kontrolnya di layar sehingga nilainya selalu mengikuti default.

Ditambahkan:
- sakelar "Rider Waiver Gen Aman" (Ambil / Tidak) pada kartu slot, hanya
  muncul bila produk slot itu GSPA, default Ambil
- tabel "Bila terdiagnosa penyakit kritis" di bagian paling bawah layar
  Kombinasi, satu tabel per slot GSPA yang memakai waiver
- fungsi tabel dipakai bersama oleh layar Kombinasi dan Ringkasan Gabungan
  sehingga tidak ada dua versi rumus

Contoh usia 42, bayar 5 tahun, UP Rp1 M, Tahunan:
  waiver Ambil : Rp36.571.888/tahun (waiver Rp2.714.988), total Rp182.859.440
  waiver Tidak : Rp33.856.900/tahun, total Rp169.284.500

## Pengujian

- Regresi hasil hitung: 1.139 kasus, 0 berbeda
- Syntax check: 47 berkas JS, 0 gagal
- Gabungan seluruh script: tidak ada deklarasi ganda
- HTML terparsir bersih, 0 id ganda


# v90.54.0 — BeSMART Lite Future masuk kalkulator Kombinasi

Kombinasi kini memuat ENAM produk: New Cemerlang Prime, Cristal Prime,
BSL 100, GSPA, iFLEXYGUARD, dan BeSMART Lite Future.

## Ruang lingkup yang disepakati

Satu usia pensiun per slot, UP dari isian, masa bayar dan usia pensiun dari
dropdown yang DISARING dari isi tabel tarif. Tidak ada optimasi pemecahan UP —
itu tetap milik layar Segitiga.

## Penyaringan pilihan

comboLFMasaBayar() dan comboLFUsiaPensiun(mpp) membaca kunci TARIF berbentuk
"LFB <mpp>-<usiaPensiun>". Masa bayar dianggap tersedia bila punya tarif untuk
sedikitnya dua usia pensiun — aturan yang sama dipakai kalkulator Lite Future,
sehingga MPP 3 (yang hanya punya satu sel) tidak pernah ditawarkan.

Hasil pembacaan: masa bayar 5, 10, 15, 20; tiap masa bayar punya usia pensiun
55, 60, 65, 70, 75.

## Perhitungan

Memakai tabel tarif yang sama dengan kalkulator Lite Future:
TARIF['LFB|LFT <mpp>-<usiaPensiun>'][usia][W|P] = [tarif UP, tarif waiver]
per Rp100 juta UP, dengan diskon 5% untuk UP mulai Rp1 miliar.

Waiver Lite Future WAJIB, jadi selalu ikut dan tidak ada sakelarnya —
berbeda dari waiver Gen Aman yang opsional.

Verifikasi: 186 kombinasi (2 jenis kelamin x 4 masa bayar x 5 usia pensiun
x 2 metode x 3 nilai UP) dibandingkan dengan kalkulator Lite Future —
0 berbeda.

## Perilaku di kombinasi

- tahunCair = usiaPensiun - usia, sehingga UP Lite Future keluar dari gabungan
  setelah dana pensiunnya cair. Mekanisme ini sudah ada (dipakai BSL dan
  GSPA), tidak ada logika timeline baru
- Lite Future masuk COMBO_PRODUK_TUNGGAL: hanya boleh satu slot, karena satu
  slot mewakili satu usia pensiun
- penjaga "Lama lindung belum dipilih" dikecualikan untuk Lite Future, sama
  seperti GSPA dan iFLEXYGUARD
- mengganti masa bayar akan memeriksa ulang daftar usia pensiun dan menyesuaikan
  bila pilihan lama tidak tersedia
- tabel "Bila terdiagnosa penyakit kritis" di bagian bawah layar Kombinasi kini
  juga memuat Lite Future, dengan catatan bahwa rider waivernya wajib

## Pengujian

- Regresi hasil hitung: 1.139 kasus, 0 berbeda
- Lite Future di Kombinasi vs kalkulator Lite Future: 186 kombinasi, 0 berbeda
- Syntax check: 47 berkas JS, 0 gagal
- Gabungan seluruh script: tidak ada deklarasi ganda
- HTML terparsir bersih, 0 id ganda


# v90.55.0 — rincian premi komponen Health di Segitiga

Kartu hasil komponen hanya menampilkan satu angka gabungan, misalnya
"Premi / setoran Rp14.115.855". Angka itu sebenarnya gabungan tiga hal:
kontribusi dasar Gen Aman, premi rider Waiver, dan premi kesehatan GHPS.
Tanpa rincian, agen tidak bisa menjawab pertanyaan yang paling sering muncul
saat presentasi: setelah masa bayar selesai, bayarnya tinggal berapa.

Masalah kedua yang lebih halus: premi GHPS TIDAK berhenti bersama masa bayar
kontribusi dasar. Ia terus dibayar selama perlindungan kesehatan aktif.
Penjelasannya sudah ada di paragraf ringkasan manfaat, tetapi angkanya sendiri
tidak menunjukkannya.

Ditambahkan tabel rincian di bawah kartu hasil:

  Kontribusi dasar          Rp9.418.733 /tahun    5 tahun
  Rider Waiver                Rp753.422 /tahun    5 tahun
  Premi kesehatan GHPS      Rp3.943.700 /tahun    selama perlindungan aktif
  Total tahun 1-5          Rp14.115.855 /tahun
  Sesudah tahun ke-5        Rp3.943.700 /tahun    premi kesehatan saja

Baris "Sesudah tahun ke-N" hanya muncul bila komponen itu memuat GHPS. Untuk
komponen tanpa GHPS, tabelnya berhenti di baris Total.

Tidak ada angka yang berubah — nilainya diambil dari premiumBase,
premiumWaiver, dan premiumHealth yang memang sudah tersimpan di hasil
perhitungan. Ini murni perubahan penyajian.

## Pengujian

- Regresi hasil hitung: 1.139 kasus, 0 berbeda
- Total rincian cocok dengan angka kartu: Rp14.115.855
- Syntax check: 47 berkas JS, 0 gagal
- Gabungan seluruh script: tidak ada deklarasi ganda
- HTML terparsir bersih


### Koreksi label rincian premi Health

Kode membaca field dengan benar sejak awal (premiumBase dari mesin GSPA,
premiumHealth dari ghpsHitung), tetapi labelnya terlalu umur sehingga mudah
tertukar saat dibaca — terutama karena pada komponen Health premi GHPS
biasanya JAUH LEBIH BESAR daripada kontribusi dasar Gen Aman. UP jiwa di
kendaraan Health hanya minimum produk, sedangkan premi kesehatan mengikuti
plan dan usia.

Label diperjelas:
  Kontribusi dasar Gen Aman - UP Rp100.000.000   Rp5.248.100 /tahun   5 tahun
  Rider Waiver Gen Aman                            Rp436.437 /tahun   5 tahun
  Premi kesehatan GHPS - Gold Standard           Rp9.396.200 /tahun   selama aktif
  Total tahun 1-5                               Rp15.080.737 /tahun
  Sesudah tahun ke-5                             Rp9.396.200 /tahun   kesehatan saja

UP jiwa diambil dari healthEmbeddedUp (UP kendaraan Gen Aman), bukan item.up
yang merupakan UP kebutuhan.


# v90.56.0 — koreksi Lite Future di kalkulator Kombinasi

## 1. Kolom yang keliru

Kartu slot masih menampilkan "Lama lindung 25 tahun" untuk Lite Future.
Produk ini tidak mengenal lama lindung — masa perlindungannya ditentukan oleh
USIA PENSIUN yang dipilih. Blok usia pensiun yang saya tambahkan di v90.54.0
muncul sebagai kolom TAMBAHAN, bukan pengganti.

Sekarang kolom kedua pada kartu slot Lite Future adalah "Usia pensiun", dan
kolom "Lama lindung" tidak lagi dirender untuk produk ini.

## 2. Penyaringan menurut usia nasabah

Sebelumnya daftar usia pensiun hanya diambil dari keberadaan kunci tarif,
tanpa memeriksa apakah USIA NASABAH ada di dalam tabel itu. Akibatnya pilihan
yang sebenarnya tidak bisa dibeli tetap ditawarkan, dan baru ditolak setelah
dihitung.

comboLFUsiaPensiun(mpp, usia, jk) kini memeriksa tiga hal: usia pensiun harus
lebih besar dari usia nasabah, tabel tarifnya harus memuat usia itu, dan jenis
kelaminnya harus ada. comboLFMasaBayarUntuk(usia, jk) menyaring masa bayar
yang masih menyisakan sedikitnya satu usia pensiun.

Hasil penyaringan (pria):
  usia 22 -> bayar 5/10/15/20, semuanya pensiun 55-75
  usia 42 -> bayar 5 (pensiun 60-75), 10 (65-75), 15 (70-75), 20 (70-75)
  usia 50 -> bayar 5 (65-75), 10 (70-75), 15 (75), 20 (75)
  usia 55 -> bayar 5 (70-75), 10 (75)
  usia 60 -> bayar 5 (pensiun 75) saja

## 3. Penyesuaian otomatis

oSesuaikanPensiunLF() dipanggil setiap kali masa bayar, produk, tanggal lahir,
atau jenis kelamin berubah — karena keempatnya mengubah daftar pilihan. Bila
pilihan lama tidak lagi tersedia, nilainya digeser ke pilihan terdekat yang
sah, bukan dibiarkan menghasilkan kombinasi yang ditolak.

Keterangan di bawah daftar polis juga diperbarui.


### Jenis kelamin ditampilkan pada rincian premi GHP

Label baris rincian premi sebelumnya hanya menulis nama, usia, dan plan —
misalnya "Cut Gienka (4 th, Gold Deluxe)". Jenis kelamin tidak terlihat,
padahal tarif jiwa pria dan wanita berbeda cukup jauh (usia 4, skema 10-90:
pria 308.000 vs wanita 249.000 per Rp1 M UP) dan nilai bawaan kartu anggota
baru adalah Pria.

Akibatnya anggota perempuan yang lupa diubah dari nilai bawaan tidak terlihat
sampai angkanya dibandingkan dengan ilustrasi resmi Generali.

Sekarang label memuat jenis kelamin: "Cut Gienka (4 th, Wanita, Gold Deluxe)".
Berlaku untuk mode keluarga maupun tertanggung tunggal — pada mode tunggal,
field jk sebelumnya memang tidak ikut disertakan ke daftar sehingga labelnya
akan selalu tertulis Pria.

Tidak ada perubahan perhitungan. Mesin dan tabel tarifnya sudah benar:
diuji dengan data ilustrasi resmi (Cut Gienka, lahir 20/05/2022, wanita,
Gold Deluxe, UP jiwa Rp10 juta, skema 10-90, tahunan) menghasilkan
Rp7.227.990 per tahun — sama persis dengan RIPLAY resmi.


# v90.57.0 — Aplikasi Web v1.3

## Diskon rider Lite UP pada BeSMART Lite 100

Premi rider Lite UP 400% terlalu tinggi dibanding ilustrasi resmi begitu total
uang pertanggungan mencapai Rp2,5 miliar. Selisihnya besar: pada UP dasar
Rp500 juta, PWA menghitung Rp43.098.000 sedangkan resmi Rp32.323.500 —
kelebihan Rp10.774.500 per tahun.

### Aturan yang berlaku

    premi dasar tahunan = tarifDasar  x (UPdasar / 100jt) x 11
    premi rider tahunan = tarifLiteUp x (UPdasar / 100jt) x 11 x F

    F = 1,00  bila total UP <  Rp2.500.000.000
    F = 0,75  bila total UP >= Rp2.500.000.000

Total UP = UP dasar + Lite UP. Diskon HANYA mengenai rider; premi UP dasar
tidak pernah dipotong.

Perhatikan tanda >=. Pada total tepat Rp2,5 miliar diskonnya SUDAH berlaku.
Memakai > akan membuat kasus tepat 2,5 miliar meleset.

### Dasar buktinya

Aturan ini tidak tertulis di memo produk mana pun. Angkanya diturunkan dengan
membandingkan 22 ilustrasi resmi iPropose: masa bayar 5, 10, 15, dan 20 tahun,
total UP dari Rp2 miliar sampai Rp12,5 miliar, usia 37 pria, frekuensi tahunan.

Ambangnya tajam dan tidak bergradasi:

    total Rp2,00 M -> faktor 1,00
    total Rp2,05 M -> faktor 1,00
    total Rp2,25 M -> faktor 1,00
    total Rp2,45 M -> faktor 1,00
    total Rp2,50 M -> faktor 0,75
    total Rp3,00 M -> faktor 0,75   ... sampai Rp12,50 M

Rasio terhitung tepat 0,750000 di seluruh titik, bukan hasil pembulatan.

Bahwa aturan ini tidak dipengaruhi usia maupun jenis kelamin dikonfirmasi
langsung oleh pengguna.

### Di mana dipasang

Hanya di src/engines/besmartLiteLengkap.js. Seluruh tools mengambil angka BSL
dari mesin yang sama — kalkulator BSL, Perbandingan Produk, Segitiga/Program
Builder, Library dan cetak — sehingga satu perubahan memperbaiki semuanya
tanpa risiko dua versi rumus.

Catatan lama di mesin yang berbunyi "di atas Rp2 miliar cek ilustrasi resmi"
diganti keterangan diskon yang benar, karena ambangnya keliru dan preminya
kini sudah dihitung sendiri.

### BELUM dikerjakan (sesuai keputusan)

Kalkulator Kombinasi (app.js cabang BSL) tidak memakai mesin BSL — ia
menjumlahkan tarif dasar + Lite UP langsung dari tabel dengan basis UP Rp500
juta, warisan paket lama COMBO. Faktor diskon di sana dikerjakan menyusul bila
diperlukan.

### Pengujian

Berkas baru: uji-bsl-diskon.js
- 22/22 ilustrasi resmi cocok persis
- ambang Rp2,5 miliar diuji ketat (Rp499 jt dan Rp490 jt masih penuh,
  Rp500 jt sudah terpotong)
- seluruh kombinasi usia x jenis kelamin x frekuensi konsisten
- premi UP dasar tetap penuh di seluruh titik

Regresi 1.139 kasus: 0 berbeda. Kasus BSL di harness lama tidak menyalakan
pakaiLiteUp, jadi memang tidak menyentuh rider — nol beda di situ benar dan
bukan berarti perubahan ini tidak bekerja.


# v90.58.0 — hasil cetak dengan tulisan lebih besar

Baseline: PSG_SELLING_TOOLS_v90_57_0_webapp-v1_3.zip. Perubahan ini HANYA
menyangkut tampilan cetak. Mesin hitung (src/engines, src/engine), tabel
tarif (src/data), dan app.js identik dengan baseline.

## Penyebab tulisan kecil

Aturan cetak lama memaksa isi mengecil sekitar 75% supaya muat sehalaman:
badan 8pt, tabel 7-7,6pt, dan timeline di ringkasan program sampai 5,8-6,5pt.
PDF harus diperbesar dulu baru terbaca.

## Perubahan

1. Berkas baru src/cetak-besar.css, dimuat PALING AKHIR di index.html,
   program-summary.html, dan comparison-summary.html sehingga menang atas
   aturan lama tanpa membongkarnya. Ukuran baru: badan 10,5pt, tabel 9,5pt,
   judul 11,5-15pt, angka kartu 13pt; tabel sangat lebar 8,8pt.
   Margin tepi dibuat tipis (6mm) supaya lebar kertas terpakai penuh.
   @page tetap margin:0 agar alamat situs tidak ikut tercetak.

2. Aturan lama di program-summary.html SENGAJA memotong nominal timeline
   lewat overflow:hidden + text-overflow:clip. Ditimpa: sel dibuka dan angka
   boleh turun baris — lebih baik terbungkus daripada hilang terpotong.

3. Judul kolom kini selalu boleh membungkus. Judul panjang yang dikunci satu
   baris (mis. "KETERANGAN") adalah bagian pertama yang terpotong di tepi
   kanan saat tulisan membesar.

4. Perbaikan pada src/preview-cetak.js. Di halaman ringkasan program ada DUA
   pemecah tabel yang berjalan pada beforeprint. Pemecah milik preview-cetak
   dulu menghapus SEMUA pecahan — termasuk pecahan timeline buatan halaman
   itu — lalu hanya memecah ulang bila lebarnya melewati ambang. Bila tidak,
   timeline 11 kolom dicetak utuh dan kolom kanannya tergencet sampai satu
   huruf per baris. Kini pecahan buatan preview-cetak diberi tanda
   data-psg-split="preview" dan hanya itu yang dibersihkan; tabel yang sudah
   dipecah pihak lain tidak disentuh. Masalah ini sudah ada di baseline;
   tulisan yang membesar hanya membuatnya terlihat.

## Pengujian (Chromium headless, cetak PDF sungguhan)

Ringkasan program, timeline 11 kolom nominal miliaran, A4 lanskap:
  baseline : badan 8pt, sel 7,6pt, 3 halaman, terpecah 2 bagian
  baru     : badan 10,5pt, sel 8,8pt, 3 halaman, terpecah 2 bagian,
             0 sel meluber, 0 elemen keluar kertas

Halaman utama, tabel 10 kolom, diuji pada kasus TERBURUK (tabel lolos tanpa
dipecah): muat utuh selebar kertas, judul panjang turun dua baris, nominal
tidak terpenggal, 0 sel meluber, 0 elemen keluar kertas.

Sempat ditemukan dan diperbaiki selama pengujian: versi awal tanpa perbaikan
nomor 4 menghasilkan 7 halaman dengan 60 sel meluber.

47 berkas JS lolos pemeriksaan sintaks.


## v1.4.1 — Penyempurnaan Sales Idea 10 Jari
- Visual telapak tangan Sales Idea diganti dari bentuk CSS sederhana menjadi ilustrasi SVG semi-realistis dengan shading, highlight, garis telapak, dan bentuk jari yang lebih natural.
- Keterangan 5 jari produk dan 5 jari pertanyaan dipindahkan ke panel legenda di samping/bawah tangan agar tidak tertutup oleh gambar telapak tangan.
- Jari aktif tetap berubah warna/highlight mengikuti tombol Berikutnya/Sebelumnya.
- Layout dibuat responsif untuk desktop, tablet, dan mobile.
- Versi aplikasi dinaikkan menjadi v1.4.1 dan cache Service Worker diperbarui.


## v1.4.2 — Sales Idea 02 Keranjang Kehidupan
- Menambahkan pilihan Sales Idea 02: Keranjang Kehidupan.
- Menambahkan 10 langkah visual berkesinambungan (keranjang, batu, penopang, keluarga, tanah tidak rata, biaya hidup, pelepasan, beban keluarga, dua pilar, proteksi & uang).
- Tetap offline-first: visual dibuat inline SVG/CSS tanpa asset eksternal.
- Menambahkan mode selector agar Sales Idea 10 Jari dan Keranjang Kehidupan dapat dipilih tanpa mengubah modul lama.
- Versi aplikasi dinaikkan ke v1.4.2 dan cache Service Worker dinaikkan.

## v1.4.3 — Refinement Sales Idea #2: Keranjang Kehidupan
- Rebuilt the Keranjang Kehidupan visual as a progressive SVG storytelling scene based on the user-provided video reference.
- Scene continuity across 10 steps: basket/beam -> stones -> family -> uneven life ground -> financial-cost labels -> fatigue -> risk/X -> tilted/falling burden -> two pillars -> complete protection + money.
- Added richer visual hierarchy: sky, sun, ground, house, trees, family figures, colorful labeled stones, beam, basket, pillars, and transitions.
- Kept the module offline-first with no external image dependency.
- Updated visible app version to v1.4.3 and service-worker cache version to insurance-hub-v90.58.4.


## v1.4.4 — Sales Idea Presentation Mode
- Mengubah Sales Idea 10 Jari menjadi presentation-first: script Kristian/Christine tidak ditampilkan di layar prospek.
- Mengubah 3 Alasan menjadi presentation-first tanpa role-play script.
- Mengubah Keranjang Kehidupan menjadi visual-first tanpa script dialog.
- Merapikan area visual dan menghapus teks yang sebelumnya menumpuk di dalam ilustrasi batu/pilar.
- Menambahkan headline fokus, pesan inti, dan panduan singkat agen yang tidak berupa script.
- Memperbesar area visual Keranjang Kehidupan dan memisahkan legenda beban dari ilustrasi agar terbaca jelas.
- Versi aplikasi v1.4.4; cache service worker v90.58.5.


## v1.4.5 — Perbaikan Keranjang Kehidupan
- Keranjang dibentuk ulang sebagai wadah yang terbuka ke atas.
- Posisi seluruh batu pada langkah 2–7 dipindahkan dan di-clip agar tetap berada di dalam keranjang.
- Bibir depan keranjang dibuat berada di depan batu untuk memperjelas kedalaman visual.
- Sales Idea 10 Jari dan Presentation Mode lainnya tidak diubah.

## v1.5.0 — Sales Idea Presentation Hub + Education Planning
- Sales Idea now opens as a full-screen presentation overlay with Back/Close controls.
- The Sales Idea hub shows three selectable cards: 10 Jari, Keranjang Kehidupan, and Education Planning.
- Presentation screens no longer show agent/prospect dialogue scripts; only visual cues, highlights, and concise presentation messages are shown.
- Added Sales Idea 03 — Education Planning with 10 sequential visual steps based on the supplied transcript/video reference: education goal, present/future value, inflation, start-early bicycle analogy, monthly saving burden, stairs/risk, elevator/protection analogy, and final protection message.
- Existing Sales Idea 01 and 02 content retained; only presentation navigation/container behavior was refined.
- App version: v1.5.0; service-worker cache version: insurance-hub-v90.58.7.


## v1.5.2 — Retirement Planning Simplified
- Sales Idea 04 disederhanakan dari 10 menjadi 6 langkah utama agar lebih ringan saat dipresentasikan.
- Fokus visual: 3 risiko → 25/55/85 → rasio mulai menabung → contoh kebutuhan aset → compounding → start early + protection.
- Mengurangi teks dan elemen visual yang tidak esensial.
- Tetap Presentation Mode: visual + inti pesan, tanpa script dialog agen/prospek.
- App version: v1.5.2; service-worker cache version: insurance-hub-v90.58.9.


## v1.6.0 — Sales Idea 05: Asset Creation
- Menambahkan Sales Idea 05 “Asset Creation” sebagai presentation mode full-screen.
- Alur 6 langkah: 3 fungsi asuransi → target aset Rp5 M → opsi DP 30%/≈Rp27 jt → opsi tanpa DP/≈Rp39,5 jt → konsep asset creation/≈Rp6 jt → aset Rp5 M sebagai warisan.
- Angka cicilan ditandai sebagai contoh dari materi; langkah asset creation diberi catatan bahwa mekanismenya berbeda dan bukan simulasi KPR dengan asumsi yang sama.
- Tetap menggunakan visual + inti pesan tanpa script dialog agen/prospek.
- App version: v1.6.0; service-worker cache version: insurance-hub-v90.58.10.
