/* Menyimpan seluruh aplikasi di HP supaya bisa dibuka tanpa internet.

   PENTING: naikkan nomor VERSI di bawah setiap kali ada berkas yang diganti
   (v7 -> v8 -> v9 dan seterusnya). Itulah yang memberi tahu HP agen bahwa ada
   versi baru. Kalau lupa dinaikkan, cache lama tidak dibersihkan.

   Cara kerja (v7):
   - Halaman (index.html dsb.) : jaringan dulu, cache sebagai cadangan.
     Jadi begitu kamu unggah versi baru ke Netlify, agen langsung dapat.
   - Kode program (src/*.js dan styles.css) : jaringan dulu juga, supaya kode
     tidak pernah tertinggal versi dibanding halamannya.
   - Gambar (assets, icons) : cache dulu supaya cepat, diperbarui diam-diam.
   - Rekaman narasi (assets/narasi/<cerita>/*.mp3) : cache saja, tanpa unduh ulang
     diam-diam (berkas besar yang tidak berubah tanpa kenaikan VERSI).
   - Hanya jawaban yang benar-benar berhasil (status 200) yang disimpan,
     sehingga halaman error tidak pernah ikut tersimpan. */

const VERSI = 'insurance-hub-v117.1.9';

/* Semua berkas inti ikut disimpan sejak pemasangan, supaya aplikasi tetap
   utuh walaupun kunjungan pertama terputus di tengah jalan.

   Modul cerita Sales Idea dimuat dengan ?v=<versi> (sama dengan tag di
   index.html). Modul-modul ini saling bergantung (pemutar, tokoh, cerita);
   URL berversi mencegah campuran versi lama-baru bila satu permintaan
   jatuh ke cache atau cache HTTP. Naikkan ?v= bersama VERSI bila salah
   satunya berubah. */
const BERKAS = [
  './',
  './index.html',
  './comparison-summary.html',
  './program-summary.html',
  './manifest.webmanifest',
  './src/styles.css',
  './src/branding.css',
  './src/home-carousel.css',
  './src/home-carousel-modal.css',
  './src/sales-idea-player.css?v=107',
  './src/psg-karakter.css?v=107',
  './src/sales-idea-retirement.css?v=107',
  './src/sales-idea-keranjang.css?v=107',
  './src/sales-idea-education.css?v=108',
  './src/sales-idea-jari.css?v=107',
  './src/sales-idea-asset.css?v=109',
  './src/sales-idea-lanjut.css?v=110',
  './src/sales-idea-singapura.css?v=112',
  './src/cetak-besar.css',
  './src/identity-login.css',
  './src/identity-login.js',
  './src/agent-management.css',
  './src/agent-management.js',
  './src/access-gate.js',
  './src/theme-switcher.js',
  './src/banding-genwealth.js',
  './src/kartu-konsultan.js',
  './src/library-ilustrasi.js',
  './src/preview-cetak.js',
  './src/app-version.js',
  './src/data/catalog.js',
  './src/data/rizqia.js',
  './src/rizqia.js',
  './src/gen-wealth.js',
  './src/segitiga.js',
  './src/dp-solusi.js',
  './src/segitiga-solusi.js',
  './src/program-financial-engine.js',
  './src/program-financial-normalizer.js',
  './src/banding-gpro.js',
  './src/solusi-pendidikan.js',
  './src/banding-ghp.js',
  './src/banding-produk.js',
  './src/slip-komisi.js',
  './src/ghp-aturan.js',
  './src/ghp-sambung.js',
  './src/banding-cetak.js',
  './src/bsl-ui.js',
  './src/engines/besmartLiteLengkap.js',
  './src/data/bsl-lengkap.js',
  './src/umum.js',
  './src/home-carousel.js',
  './src/home-carousel-modal.js',
  './src/isian-terakhir.js',
  './src/catatan-ghp.js',
  './src/tunggu-12-ghp.js',
  './src/prompt-flyer.js',
  './src/engines/usia.js',
  './src/engines/rayaProMaxima.js',
  './src/raya-pro-maxima.js',
  './src/engine/productRegistry.js',
  './src/engine/debugPanel.js',
  './src/engines/liteFuture.js',
  './src/engines/cristalPrime.js',
  './src/engines/newCemerlangPrime.js',
  './src/engines/gspa.js',
  './src/engines/iflexyguard.js',
  './src/engines/ghp.js',
  './src/core.js',
  './src/app.js',
  './src/aktivitas.js',
  './src/aktivitas-ui.js',
  './src/sales-idea.js',
  './src/app-shell.js',
  './src/tanggal-placeholder.js',
  './src/cetak-orientasi.js',
  './src/sales-idea-player.js?v=107',
  './src/psg-karakter.js?v=107',
  './src/sales-idea-retirement-audio.js?v=115',
  './src/sales-idea-retirement.js?v=115',
  './src/sales-idea-keranjang-audio.js?v=115',
  './src/sales-idea-keranjang.js?v=115',
  './src/sales-idea-education-audio.js?v=115',
  './src/sales-idea-education.js?v=115',
  './src/sales-idea-jari-audio.js?v=116',
  './src/sales-idea-jari-alasan-audio.js?v=116',
  './src/sales-idea-jari.js?v=117',
  './src/sales-idea-asset-audio.js?v=116',
  './src/sales-idea-asset.js?v=116',
  './src/sales-idea-lanjut.js?v=110',
  './src/sales-idea-singapura-audio.js?v=114',
  './src/sales-idea-singapura.js?v=114',
  './assets/home-carousel/01-cemerlang-prime.webp',
  './assets/home-carousel/02-cristal-prime.webp',
  './assets/home-carousel/03-iflexyguard.webp',
  './assets/home-carousel/04-rizqia.webp',
  './assets/home-carousel/05-gen-aman.webp',
  './assets/home-carousel/06-besmart-lite-future.webp',
  './assets/home-carousel/07-gen-healthcare-protection.webp',
  './assets/home-carousel/08-referral-fiesta.webp',
  './assets/home-carousel/09-campaign-tanpa-medical.webp',
  './assets/logo-psg.png',
  './assets/logo-psg-terang.png',
  './icons/ikon-psg-192.png',
  './icons/ikon-psg-512.png',
  './icons/ikon-psg-192-maskable.png',
  './icons/ikon-psg-512-maskable.png',
  './icons/ikon-psg-apple-180.png',
  /* rekaman narasi Bekerja di Singapura (voice Bian): hanya 13 berkas yang dipakai */
  './assets/narasi/singapore/S01-01.mp3',
  './assets/narasi/singapore/S01-02.mp3',
  './assets/narasi/singapore/S01-03.mp3',
  './assets/narasi/singapore/S02-01.mp3',
  './assets/narasi/singapore/S02-02.mp3',
  './assets/narasi/singapore/S05-01.mp3',
  './assets/narasi/singapore/S05-02.mp3',
  './assets/narasi/singapore/S06-01.mp3',
  './assets/narasi/singapore/S06-02.mp3',
  './assets/narasi/singapore/S07-01.mp3',
  './assets/narasi/singapore/S07-02.mp3',
  './assets/narasi/singapore/S08-01.mp3',
  './assets/narasi/singapore/S08-02.mp3',
  /* rekaman narasi Retirement Planning (voice Bian): 6 berkas */
  './assets/narasi/retirement/retirement-S01-01.mp3',
  './assets/narasi/retirement/retirement-S02-01.mp3',
  './assets/narasi/retirement/retirement-S03-01.mp3',
  './assets/narasi/retirement/retirement-S04-01.mp3',
  './assets/narasi/retirement/retirement-S05-01.mp3',
  './assets/narasi/retirement/retirement-S06-01.mp3',
  /* rekaman narasi Keranjang Kehidupan (voice Bian): 10 berkas */
  './assets/narasi/keranjang/keranjang-S01-01.mp3',
  './assets/narasi/keranjang/keranjang-S02-01.mp3',
  './assets/narasi/keranjang/keranjang-S03-01.mp3',
  './assets/narasi/keranjang/keranjang-S04-01.mp3',
  './assets/narasi/keranjang/keranjang-S05-01.mp3',
  './assets/narasi/keranjang/keranjang-S06-01.mp3',
  './assets/narasi/keranjang/keranjang-S07-01.mp3',
  './assets/narasi/keranjang/keranjang-S08-01.mp3',
  './assets/narasi/keranjang/keranjang-S09-01.mp3',
  './assets/narasi/keranjang/keranjang-S10-01.mp3',
  /* rekaman narasi Education Planning (voice Bian): 27 berkas */
  './assets/narasi/education/education-S01-01.mp3',
  './assets/narasi/education/education-S01-02.mp3',
  './assets/narasi/education/education-S01-03.mp3',
  './assets/narasi/education/education-S02-01.mp3',
  './assets/narasi/education/education-S02-02.mp3',
  './assets/narasi/education/education-S02-03.mp3',
  './assets/narasi/education/education-S03-01.mp3',
  './assets/narasi/education/education-S03-02.mp3',
  './assets/narasi/education/education-S03-03.mp3',
  './assets/narasi/education/education-S04-01.mp3',
  './assets/narasi/education/education-S04-02.mp3',
  './assets/narasi/education/education-S05-01.mp3',
  './assets/narasi/education/education-S05-02.mp3',
  './assets/narasi/education/education-S05-03.mp3',
  './assets/narasi/education/education-S06-01.mp3',
  './assets/narasi/education/education-S06-02.mp3',
  './assets/narasi/education/education-S06-03.mp3',
  './assets/narasi/education/education-S07-01.mp3',
  './assets/narasi/education/education-S07-02.mp3',
  './assets/narasi/education/education-S08-01.mp3',
  './assets/narasi/education/education-S08-02.mp3',
  './assets/narasi/education/education-S09-01.mp3',
  './assets/narasi/education/education-S09-02.mp3',
  './assets/narasi/education/education-S09-03.mp3',
  './assets/narasi/education/education-S09-04.mp3',
  './assets/narasi/education/education-S10-01.mp3',
  './assets/narasi/education/education-S10-02.mp3',
  /* rekaman narasi 10 Jari (BAB 1–2) (voice Bian): 12 berkas */
  './assets/narasi/jari/jari-S01-01.mp3',
  './assets/narasi/jari/jari-S01-02.mp3',
  './assets/narasi/jari/jari-S01-03.mp3',
  './assets/narasi/jari/jari-S01-04.mp3',
  './assets/narasi/jari/jari-S01-05.mp3',
  './assets/narasi/jari/jari-S01-06.mp3',
  './assets/narasi/jari/jari-S01-07.mp3',
  './assets/narasi/jari/jari-S02-01.mp3',
  './assets/narasi/jari/jari-S03-01.mp3',
  './assets/narasi/jari/jari-S04-01.mp3',
  './assets/narasi/jari/jari-S05-01.mp3',
  './assets/narasi/jari/jari-S06-01.mp3',
  /* rekaman narasi 10 Jari (BAB 3: 3 alasan) (voice Bian): 3 berkas */
  './assets/narasi/jari-alasan/jari-alasan-S01-01.mp3',
  './assets/narasi/jari-alasan/jari-alasan-S02-01.mp3',
  './assets/narasi/jari-alasan/jari-alasan-S03-01.mp3',
  /* rekaman narasi Asset Creation (voice Bian): 14 berkas */
  './assets/narasi/asset/asset-S01-01.mp3',
  './assets/narasi/asset/asset-S01-02.mp3',
  './assets/narasi/asset/asset-S01-03.mp3',
  './assets/narasi/asset/asset-S02-01.mp3',
  './assets/narasi/asset/asset-S02-02.mp3',
  './assets/narasi/asset/asset-S03-01.mp3',
  './assets/narasi/asset/asset-S03-02.mp3',
  './assets/narasi/asset/asset-S04-01.mp3',
  './assets/narasi/asset/asset-S04-02.mp3',
  './assets/narasi/asset/asset-S05-01.mp3',
  './assets/narasi/asset/asset-S05-02.mp3',
  './assets/narasi/asset/asset-S05-03.mp3',
  './assets/narasi/asset/asset-S06-01.mp3',
  './assets/narasi/asset/asset-S06-02.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI)
      // Satu berkas yang gagal tidak boleh menggagalkan seluruh pemasangan.
      .then(c => Promise.all(BERKAS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x !== VERSI).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

function bypassCache(url) {
  const p = url.pathname;
  return p.indexOf('/.netlify/') === 0 || p === '/api' || p.indexOf('/api/') === 0;
}

function bolehDisimpan(res) {
  return res && res.status === 200 && (res.type === 'basic' || res.type === 'default');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // biarkan permintaan luar apa adanya

  /* Autentikasi dan API tidak pernah disentuh cache: jawabannya bergantung
     pada siapa yang sedang masuk. Tanpa ini, permintaan GET ke
     /.netlify/identity/user atau /api/psg/me jatuh ke aturan "cache dulu" di
     bawah dan bisa menyajikan profil lama — bahkan milik agen lain. */
  if (bypassCache(url)) return;

  const halaman = req.mode === 'navigate' ||
                  (req.headers.get('accept') || '').includes('text/html');
  // Kode program ikut aturan halaman agar tidak pernah beda versi dengan HTML.
  const kode = url.pathname.indexOf('/src/') !== -1;

  if (halaman || kode) {
    // Jaringan dulu: versi baru langsung terpakai begitu diunggah.
    e.respondWith(
      fetch(req)
        .then(res => {
          if (bolehDisimpan(res)) {
            const salinan = res.clone();
            caches.open(VERSI).then(c => c.put(req, salinan));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => {
          if (r) return r;
          /* Hanya permintaan halaman yang boleh jatuh ke index.html. Kalau
             sebuah berkas .js yang dijawab dengan HTML, browser melaporkan
             error sintaks yang menyesatkan — jauh lebih sulit didiagnosa
             daripada berkas yang memang gagal dimuat. */
          if (halaman) return caches.match('./index.html');
          return Response.error();
        }))
    );
    return;
  }

  // Rekaman narasi: berkas besar yang tetap sama, cukup dari cache (tanpa unduh ulang).
  const rekaman = url.pathname.indexOf('/assets/narasi/') !== -1;

  // Gambar dan ikon: tampilkan dari cache (cepat), perbarui di latar belakang.
  e.respondWith(
    caches.match(req).then(tersimpan => {
      if (tersimpan && rekaman) return tersimpan;
      const dariJaringan = fetch(req)
        .then(res => {
          if (bolehDisimpan(res)) {
            const salinan = res.clone();
            caches.open(VERSI).then(c => c.put(req, salinan));
          }
          return res;
        })
        .catch(() => tersimpan);
      return tersimpan || dariJaringan;
    })
  );
});
