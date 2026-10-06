#!/usr/bin/env node
/* Contract test statis — tanpa dependensi.

     node tests/contract-static.test.js [root]

   Memastikan redesign tidak menyentuh kontrak teknis aplikasi:
   - seluruh berkas JavaScript produksi identik byte per byte dengan baseline
     (engine, data tarif, rumus, navigasi, storage, print, Android bridge)
   - skrip inline di ketiga halaman identik dan urutannya sama
   - urutan 48 classic script tidak berubah (skrip baru hanya boleh ditambah)
   - cetak-besar.css tetap stylesheet terakhir
   - tidak ada ID, class legacy, atribut data- / aria- yang hilang atau berubah
   - segmen (data-nilai + aria-pressed awal) identik
   - tombol hook cetak (teks Cetak/Print/PDF) tetap ada
   - storage key tidak hilang
   - seluruh JS lolos pemeriksaan sintaks
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { snapshot } = require('./lib/snapshot');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'contract-baseline.json'), 'utf8')).static;
const cur = snapshot(root);
const fails = [];
const notes = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };
const isSubseq = (sub, arr) => { let i = 0; for (const x of arr) if (x === sub[i]) i++; return i === sub.length; };

/* Perubahan skrip inline yang disetujui. Setiap entri harus menyebut hash lama,
   hash baru, dan alasannya; selain entri ini skrip inline wajib identik. */
const INLINE_DIIZINKAN = {
  'program-summary.html': [{
    dari: 'a677e3718adabddb70d89776b699908b108cd7c3cccc030d915ac7e539819893',
    ke: 'bf869d58a69fb4adebf048754824d61944312dc39660a5960b5b3d7342061889',
    alasan: 'Tabel Manfaat Gabungan dibungkus <table> bila isinya hanya <thead>/<tbody>/<tr> (sebelumnya tampil sebagai teks menyambung). Tidak menyentuh angka. Detail komponen pembentuk program tetap bagian dokumen nasabah: <details> diberi data-cetak-buka (dibuka preview-cetak.js di Preview dan saat mencetak, termasuk dari Library) dan tabelnya data-print-label=Polis yang disusun untuk judul pecahan cetak. catatanSlot tidak lagi dimasukkan ke Prompt Flyer AI. Tidak menyentuh angka.',
  }],
};

/* Perubahan berkas JS dilindungi yang disetujui. Setiap entri menyebut hash
   lama, hash baru, dan alasannya; selain entri ini berkas JS wajib identik. */
const JS_DIIZINKAN = {
  'src/preview-cetak.js': [{
    dari: 'abe686a05ed724852a36ff89e964940514f9f719686b4e0fcd09e21fc3c92d29',
    ke: 'f80fa13fcbb7facfb9af39a91f8ac581758cd1857c471397c9a0c2565f220987',
    alasan: 'Pemecah tabel cetak memetakan sel menurut posisi kolom (colspan), bukan urutan DOM. Sebelumnya baris Total ber-colspan mendapat kolom lebih banyak dari judulnya: angka bertumpuk dan Total bergeser ke kolom yang salah. Tidak menyentuh nilai. cleanClone membuang tombol kontrol kecuali yang ditandai data-preview-preserve (atap dan lapis Segitiga Financial, yang sekaligus gambar dokumen); tombol itu dibuat tidak bisa difokus/diklik di Preview. Sebelumnya seluruh button dibuang sehingga Segitiga kosong di Preview. <details data-cetak-buka> dibuka di Preview dan selama mencetak (beforeprint/afterprint) karena browser hanya mencetak judul <details> yang tertutup. makePrintSplit memakai data-print-label tabel sebagai judul pecahan bila ada (bawaan tetap Timeline Program).',
  }],
  'src/core.js': [{
    dari: '385c5f77851f6b5b5c94b6e3bf6d65d3df77faef9b21a1c9cd4aa137c1833c7c',
    ke: '9460f684972a05b0bef06db1bd8534ed4d0e2e174b648d3b28d9395ad36adbd7',
    alasan: 'Profil dengan kelanjutan untuk alur Sales Idea → Mari Kita Hitung: konteks {source, topic, target} hanya di memori (tanpa profileId, tanpa storage key baru), dipasang lewat InsuranceHubCustomerProfile.bukaUntuk(). cpApply (titik akhir Simpan/Gunakan) lanjut ke target konteks dan mengangkat PROFILE dari riwayat; tanpa konteks tetap bukaLayar(\'PRODUK\'). bukaLayar dan tombol btnProfil membersihkan konteks saat meninggalkan Profil. Banner + tombol Buat Profil Baru (mekanisme Kosongkan form) dibuat hanya saat ada konteks. Penyimpanan profil, Financial Triangle, dan alur Dashboard tidak berubah. Perbaikan Edit Profil: cpFillForm membaca komponen pensiun dari p.snapshot.pensiun (jalur yang ditulis cpFormValue dan dibaca kalkulator Dana Pensiun), bukan p.snapshot.snapshot.pensiun yang tidak pernah ada — sebelumnya Edit → Simpan menimpa keenam komponen dengan 0. Form Profil dikosongkan (cpFillForm({})) sesudah Simpan berhasil, supaya profil baru tidak mewarisi data non-identitas profil lain; rekaman tersimpan tidak disentuh. Batal edit tetap mengembalikan data asli profil yang diedit.',
  }],
  'src/app.js': [{
    dari: '34593519c233710ed358d93f3392c048f3b6614be086daef8f0f50dffcf69164',
    ke: '5232e3cc2f2bcc5d1d2658e2c92f3082d2f6b55b7f31aeaa9e0d45379c4b980b',
    alasan: 'Input komponen Kebutuhan Dana Pensiun (dk_*) dirender tanpa atribut value dari DP_KOMPONEN.awal (sisa angka demo Rp19 juta). Kalkulator memang mulai kosong (dNilai 0) dan hanya diisi dari profil aktif; angka demo sebelumnya sempat tampil di DOM sampai layar DP dibuka. Tidak ada rumus yang berubah. Education Planning (dGambar): saat setoran sama (pertumbuhan 0%) cabang itu tidak lagi return lebih awal, sehingga bagian "ringkasan untuk prospek" tetap dirender; tabel efek menunda hanya dibangun pada cabang lain. Tidak ada rumus yang berubah. Ringkasan Kombinasi: kalimat iFLEXYGUARD/Bonus 75 pada catatan timeline hanya ditulis bila iFLEXYGUARD ada di hasil hitungan (r.aktif); sebelumnya statis dan ikut terbawa ke Ringkasan Program tanpa iFLEXYGUARD. Catatan slot/manfaat ditulis ulang tanpa istilah internal (COMBO_Summary, slot). Petunjuk agen bila nama/kontak agen kosong dibungkus tanpa-cetak. Tidak ada rumus, agregasi, atau timeline yang berubah.',
  }],
  'src/library-ilustrasi.js': [{
    dari: '57a58e17a4e9c117431f3d52c24e40bc11c3c26fec0be12b18a2b5d885ebc4d7',
    ke: 'd48676bfb12d3c028201a6669541aa6f6afb6dea9f11ebfbba4b83a696d90a17',
    alasan: 'Detail Library: tombol Preview basi (.psg-preview-btn) dan penanda data-preview-attached yang ikut tersimpan di snapshot dibuang, supaya attach() membuat satu tombol Preview baru dengan handler aktif. Tombol cetak/print/PDF di dalam snapshot (listener-nya tidak ikut tersimpan) diberi handler cetakIlustrasi yang sama dengan tombol Cetak modal. Data Library, storage, dan isi snapshot tidak berubah.',
  }],
  'src/aktivitas-ui.js': [{
    dari: 'f79804459cb8b93f3ebbfa4380299a2f4bca485155cf79c844aa703d31aba0cf',
    ke: 'b5d89aa3053620d5d50412694f300f375036d3977917c99b422b250a78eca9ef',
    alasan: 'Janji temu → Profil prospek (profil baru): form Profil dikosongkan dulu lewat cpFillForm({}) sebelum nama dan HP prospek diisi, supaya prospek tidak mewarisi isian profil lain (mis. profil yang tadi diedit lalu ditinggalkan).',
  }],
  'src/sales-idea.js': [{
    dari: 'dfd143970d9e79bc8ec46687724748da98147b9ae78985619a71c83c7a0c747f',
    ke: 'c2bc0b382ebc2d1b6a0d5e6e9727c08df9dec9a322d53cb50918f2f2a658afff',
    alasan: 'Sales Idea memakai pemutar interaktif (src/sales-idea-player.js): tiap langkah yang ada menjadi scene dengan Play/Pause/Replay/Next/Back. init() kini idempoten sehingga listener klik dokumen tidak lagi menumpuk tiap kali layar dibuka. Retirement Planning memakai cerita interaktif (src/sales-idea-retirement.js) dengan data retirementSteps yang sama. Keranjang Kehidupan memakai cerita interaktif (src/sales-idea-keranjang.js) dengan data basketSteps yang sama. Education Planning memakai cerita interaktif (src/sales-idea-education.js) dengan data educationSteps yang sama. 10 Jari memakai cerita tangan interaktif (src/sales-idea-jari.js) dalam 9 langkah (BAB 1: 5 risiko dalam satu scene, BAB 2: 5 pertanyaan, BAB 3: 3 alasan dengan renderer lama) dengan data fingers dan reasons yang sama; teks fokus/inti jari dipindah ke teksJari() tanpa perubahan isi. Asset Creation memakai cerita interaktif (src/sales-idea-asset.js) dengan data assetCreationSteps yang sama; renderer lama tetap sebagai cadangan. SalesIdea10Jari.keadaan() (hanya dibaca: mode, indeks scene, jumlah scene) dipakai kartu akhir "Mari Kita Hitung" (src/sales-idea-lanjut.js). Data, ID, kelas, dan API SalesIdea10Jari tidak berubah. Sales Idea 06 "Bekerja di Singapura": data singapuraSteps (12 langkah), kartu hub, dispatch adeganMode ke PSGSingapuraStory (src/sales-idea-singapura.js), mode baru di setMode dan jumlahLangkah. Sales Idea lain tidak berubah. Sales Idea 06 V2: data singapuraSteps menjadi 8 langkah (storyboard final); pemutaran, dispatch, dan hub tidak berubah. Pembersihan catatan internal agen dari tampilan: catatan .si-hub-note di hub, paragraf pengantar 3 Alasan, body/insight jari 10 (dikosongkan), kalimat "Untuk Sales Idea ini…" di Retirement S1, dan label "Inti percakapan:" di Asset S6; ID, data lain, dan API tidak berubah.',
  }],
  'src/segitiga-solusi.js': [{
    dari: '5b966b2719a2edf471e097e56cca6058a03e08aeca6d895a9bcd370b6c4a6af7',
    ke: '6066ba377b14607b3afe190f427809978206f5399ed283eac6c63ca74073b010',
    alasan: 'Lama bayar dasar Gen Aman + GHPS dibaca dari database (gspaHealthPaymentTermsAvailable: key DATA_GSPA.dasar yang juga ada di DATA_GHPS.batasUsia, divalidasi lewat engine GSPA, ghpsHitung, dan waiverHitung bila Waiver ON) menggantikan daftar tetap [5,10]; lama bayar tersimpan yang tidak tersedia diganti yang terdekat sebelum dihitung dan saat kartu digambar, plan/Waiver memicu validasi ulang. programNarrative memfilter fase memakai toYear (sebelumnya properti to yang tidak ada, sehingga tercetak Tahun 16–null). Catatan, sangkalan, dan teks cadangan deskripsi plan Health di Ringkasan Program tanpa istilah internal (engine, kalkulator existing, Program Financial Engine); typo GPHS menjadi GHPS. catatanSlot (ikut tercetak di Detail komponen pembentuk program) ditulis untuk nasabah, bukan instruksi agen. Formula premi, manfaat, agregasi, dan timeline tidak berubah.',
  }],
  'src/segitiga.js': [{
    dari: '4391f3d4d282245e34ccb988c4a1b82c812c40e4c7ea1b9cea9984fd835eaa38',
    ke: 'd702eb252e275bfb2f5b4cef8ddd338fd7aea70bab258405de38cde6d8b90398',
    alasan: 'Tombol atap dan lapis Segitiga Financial diberi data-preview-preserve agar ikut tampil di Preview (bagian dari gambar dokumen). Logika dan perhitungan tidak berubah.',
  }],
  'src/app-version.js': [{
    dari: 'f1cb8c2a2a673cb4a3719bb6deee684426995715f5c77637138f0aad6c9f2c80',
    ke: '53d50e28821ed9328b0d136b337292678356e1c5d5072e5737b4176854703abe',
    alasan: 'Label versi yang terlihat agen (halaman login dan kaki dashboard) naik dari v1.5 ke v1.6 untuk rilis flyer campaign tanpa medical di Home Carousel. Hanya teks PSG_APP_VERSION/PSG_APP_VERSION_LABEL; manifest dan versi cache service worker tidak berubah.',
  }],
};

/* 1. Berkas JS dilindungi */
for (const [f, h0] of Object.entries(base.protectedFiles)) {
  const z = (JS_DIIZINKAN[f] || []).find((x) => x.dari === h0);
  const h = z ? z.ke : h0;
  if (z) notes.push(f + ': diubah dengan izin — ' + z.alasan);
  ok(cur.protectedFiles[f] !== undefined, 'Berkas JS hilang: ' + f);
  if (cur.protectedFiles[f] !== undefined) ok(cur.protectedFiles[f] === h, 'Berkas JS berubah (dilarang): ' + f);
}
Object.keys(cur.protectedFiles).filter((f) => !base.protectedFiles[f]).forEach((f) => notes.push('JS baru: ' + f));

/* 2. Storage key */
for (const k of base.storageKeys) ok(cur.storageKeys.includes(k), 'Storage key hilang: ' + k);
cur.storageKeys.filter((k) => !base.storageKeys.includes(k)).forEach((k) => fails.push('Storage key BARU (tidak boleh): ' + k));

/* 3. Halaman */
for (const [name, b] of Object.entries(base.pages)) {
  const c = cur.pages[name];
  ok(!!c, 'Halaman hilang: ' + name);
  if (!c) continue;
  const izin = INLINE_DIIZINKAN[name] || [];
  const inlineBase = b.inlineScripts.map((h) => { const z = izin.find((x) => x.dari === h); return z ? z.ke : h; });
  izin.forEach((z) => notes.push(name + ': skrip inline diubah dengan izin — ' + z.alasan));
  ok(isSubseq(inlineBase, c.inlineScripts), name + ': skrip inline berubah/urutannya berubah');
  const extFiltered = c.externalScripts.filter((s) => b.externalScripts.includes(s));
  ok(JSON.stringify(extFiltered) === JSON.stringify(b.externalScripts), name + ': urutan classic script berubah');
  if (name === 'index.html') {
    const lastBase = c.externalScripts.lastIndexOf(b.externalScripts[b.externalScripts.length - 1]);
    const extra = c.externalScripts.filter((s) => !b.externalScripts.includes(s));
    extra.forEach((s) => ok(c.externalScripts.indexOf(s) > lastBase, name + ': skrip baru harus sesudah skrip baseline terakhir: ' + s));
  }
  b.stylesheets.forEach((s) => ok(c.stylesheets.includes(s), name + ': stylesheet hilang: ' + s));
  if (b.stylesheets[b.stylesheets.length - 1] === 'src/cetak-besar.css') {
    ok(c.stylesheets[c.stylesheets.length - 1] === 'src/cetak-besar.css', name + ': cetak-besar.css harus stylesheet terakhir');
  }
  ok(c.duplicateIds.length === 0, name + ': ID ganda: ' + c.duplicateIds.join(', '));
  for (const id of b.ids) ok(c.ids.includes(id), name + ': ID hilang: #' + id);
  for (const [id, a] of Object.entries(b.idAttrs)) {
    const ca = c.idAttrs[id];
    if (!ca) continue;
    ok(ca.tag === a.tag, name + ': tag #' + id + ' berubah ' + a.tag + ' -> ' + ca.tag);
    a.classes.forEach((cl) => ok(ca.classes.includes(cl), name + ': class legacy hilang pada #' + id + ': .' + cl));
    for (const [k, v] of Object.entries(a.attrs)) ok(ca.attrs[k] === v, name + ': atribut ' + k + ' pada #' + id + ' berubah');
  }
  for (const cl of b.classTokens) ok(c.classTokens.includes(cl), name + ': class legacy hilang: .' + cl);
  for (const [id, seg] of Object.entries(b.segments)) {
    ok(JSON.stringify(c.segments[id]) === JSON.stringify(seg), name + ': segmen #' + id + ' berubah (data-nilai/aria-pressed)');
  }
  for (const p of b.printButtons) ok(c.printButtons.includes(p), name + ': hook tombol cetak hilang: ' + p);
}

/* 4. Sintaks seluruh JS */
for (const f of Object.keys(cur.protectedFiles)) {
  try { new vm.Script(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }); checks++; }
  catch (e) { fails.push('Sintaks JS gagal: ' + f + ' — ' + e.message); }
}

notes.forEach((n) => console.log('  catatan: ' + n));
if (fails.length) {
  console.log('\nCONTRACT STATIC: GAGAL (' + fails.length + ' dari ' + checks + ' pemeriksaan)');
  fails.slice(0, 80).forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
const jsIzin = Object.keys(base.protectedFiles).filter((f) => (JS_DIIZINKAN[f] || []).some((x) => x.dari === base.protectedFiles[f])).length;
console.log('CONTRACT STATIC: LULUS — ' + checks + ' pemeriksaan, ' +
  (Object.keys(base.protectedFiles).length - jsIzin) + ' berkas JS identik' + (jsIzin ? ' + ' + jsIzin + ' diubah dengan izin' : '') + ', ' +
  base.pages['index.html'].ids.length + ' ID, ' + base.storageKeys.length + ' storage key.');
