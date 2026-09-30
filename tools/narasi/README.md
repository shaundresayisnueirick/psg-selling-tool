# Generator narasi Sales Idea (Pocket TTS Indonesian, lokal)

Alat untuk **admin/creator** yang membuat audio narasi Sales Idea saat
menyusun konten, di komputer sendiri. Semuanya berjalan lokal:

- tanpa API
- tanpa API key
- tanpa kuota

```
naskah Sales Idea → Pocket TTS Indonesian → WAV sementara → MP3
  → assets/narasi/gen/<sumber>/SNN-MM.<kunci12>.mp3  (+ narasi.lock.json)
```

PWA tidak pernah menjalankan generator ini. MP3 hasilnya adalah aset
statis, jadi Sales Idea tetap 100% offline.

> **Bekerja di Singapura dikecualikan.** Cerita itu memakai audio Bian
> (ElevenLabs) yang sudah berjalan. Generator menolak sumber `singapura`
> dan tidak pernah menulis ke `assets/narasi/singapore/`.

## Kebutuhan

| Kebutuhan | Keterangan |
|---|---|
| Node.js 18+ | Menjalankan `generate.mjs`. Tidak perlu `npm install`. |
| Python 3.10–3.14 dengan `pocket-tts` | `python -m pip install pocket-tts`. Paket ini ikut memasang PyTorch versi CPU. |
| ffmpeg dengan encoder `libmp3lame` | Untuk konversi WAV → MP3. Di Windows, misalnya `winget install Gyan.FFmpeg`. |
| Akses ke huggingface.co | Hanya saat pertama kali dijalankan, untuk mengunduh model dan contoh suara. Setelah itu dipakai dari cache Hugging Face lokal. |

Environment variable (semuanya opsional):

| Variabel | Bawaan | Kegunaan |
|---|---|---|
| `NARASI_PYTHON` | `python` (Windows) / `python3` | Python yang memuat `pocket-tts`. |
| `NARASI_FFMPEG` | `ffmpeg` | Jalur ffmpeg bila tidak ada di PATH. |
| `NARASI_POCKET_MODEL` | `hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml` | Config model. |
| `NARASI_POCKET_SUARA` | `hf://kyutai/tts-voices/alba-mackenna/casual.wav` | Contoh suara yang ditiru (path WAV lokal, `https://`, atau `hf://`). |

Suara bawaan sama dengan yang dipakai CLI `pocket-tts` untuk config
kustom. Untuk memakai suara lain, arahkan `NARASI_POCKET_SUARA` ke rekaman
contoh (WAV) suara tersebut.

Contoh di Windows PowerShell, bila Python 3.13 dipanggil lewat `py -3.13`:

```powershell
$env:NARASI_PYTHON = (py -3.13 -c "import sys; print(sys.executable)")
node tools/narasi/generate.mjs periksa
```

## Perintah

Semua perintah dijalankan dari akar repo.

```sh
node tools/narasi/generate.mjs periksa                   # cek naskah, penjaga jalur & lingkungan (tidak membuat audio)
node tools/narasi/generate.mjs daftar                    # semua sumber: scene, segmen, jumlah huruf
node tools/narasi/generate.mjs naskah retirement         # teks tiap segmen + hash
node tools/narasi/generate.mjs rencana retirement        # status tiap segmen & berkas MP3 yang akan dibuat
node tools/narasi/generate.mjs rencana --semua
node tools/narasi/generate.mjs buat retirement --dry-run # rencana tanpa menjalankan Pocket TTS
node tools/narasi/generate.mjs buat retirement --segmen S01-01   # satu sampel
node tools/narasi/generate.mjs buat retirement           # semua yang baru/berubah/hilang
node tools/narasi/generate.mjs buat retirement --segmen S03-01 --paksa   # take ulang
```

Sumber yang tersedia: `retirement`, `keranjang`, `education`, `jari`,
`jari-alasan`, `asset`.

## Cara kerja

- **Membaca naskah.** Naskah dibaca langsung dari larik `NARASI` di
  `src/sales-idea-*.js` (read-only, dievaluasi di VM kosong).
- **Satu segmen, satu MP3.** Scene berupa string menjadi satu segmen.
  Scene berupa larik menjadi satu segmen per elemen, sama seperti cara
  narator PWA memotong naskah.
- **Nama berkas memakai kunci.** Kunci dihitung dengan `sha256` dari teks
  kanonik, model, suara, format MP3, dan nomor ambil. Nama berkas ikut
  berubah bila kuncinya berubah, sehingga cache PWA tidak pernah memakai
  audio lama.
- **Model dimuat sekali per `buat`** (`pocket_tts_wav.py`). Seed diturunkan
  dari kunci, jadi hasilnya dapat diulang di mesin yang sama.
- **Format MP3:** 96 kbps, 44,1 kHz, mono, tanpa metadata. WAV sementara
  disimpan di `tools/narasi/.tmp/` (diabaikan git) dan dihapus bila semua
  segmen berhasil. Bila ada yang gagal, berkas kerja disimpan untuk
  diperiksa.
- **Lock.** `assets/narasi/gen/<sumber>/narasi.lock.json` mencatat untuk
  tiap segmen: hash teks, berkas, durasi, nomor ambil, model, suara,
  format, dan waktu dibuat. Lock diperbarui per segmen, jadi proses yang
  terputus tidak kehilangan hasil yang sudah jadi.

Status di `rencana` dan kapan `buat` membuat ulang:

| Status | Arti | `buat` |
|---|---|---|
| `baru` | Belum pernah dibuat. | dibuat |
| `berubah` | Teks naskah berubah. | dibuat; MP3 lama dihapus |
| `hilang` | Tercatat di lock, tetapi MP3-nya tidak ada. | dibuat |
| `mesin` | Teks sama, tetapi model/suara/format berbeda dari lock. | hanya dengan `--paksa` |
| `sama` | Tidak ada perubahan. | hanya dengan `--paksa` |
| `yatim` | Ada di lock, tetapi segmennya sudah tidak ada di naskah. | hanya dilaporkan |

Kode keluar `buat`:

- `0`: semua target berhasil.
- `1`: prasyarat belum lengkap (Pocket TTS atau ffmpeg tidak tersedia),
  argumen salah, atau ada segmen yang gagal.

Prasyarat diperiksa **sebelum** ada berkas yang ditulis.

## Keamanan berkas

- Audio hanya boleh ditulis di bawah `assets/narasi/gen/`, dan berkas
  sementara hanya di `tools/narasi/.tmp/`. Fungsi `jalurAman` dan
  `jalurSementara` menolak jalur lain.
- `assets/narasi/singapore/`, `src/sales-idea-singapura.js`, dan
  `src/sales-idea-singapura-audio.js` tidak pernah dibaca maupun ditulis.
- Tidak ada rahasia yang dibutuhkan atau disimpan.

## Setelah generate

1. **Dengarkan setiap segmen.** TTS bisa salah melafalkan angka,
   singkatan, atau istilah. Jika perlu, perbaiki dengan take ulang
   (`--paksa`) atau dengan menulis ulang naskahnya.
2. Commit MP3 beserta `narasi.lock.json`.
3. **Menyambungkan audio ke PWA** adalah langkah terpisah yang perlu
   persetujuan tersendiri. Pekerjaannya:
   - membuat manifest audio per cerita;
   - menambahkan argumen `rekaman` pada `PSGNarasi.daftar`;
   - menambahkan tag `<script>` di `index.html`;
   - memperbarui `sw.js` (daftar berkas dan VERSI);
   - menambahkan tes.

   Sebelum langkah itu, audio hasil generate belum dipakai PWA.
