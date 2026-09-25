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
   - Hanya jawaban yang benar-benar berhasil (status 200) yang disimpan,
     sehingga halaman error tidak pernah ikut tersimpan. */

const VERSI = 'insurance-hub-v97.0.0';

/* Semua berkas inti ikut disimpan sejak pemasangan, supaya aplikasi tetap
   utuh walaupun kunjungan pertama terputus di tengah jalan. */
const BERKAS = [
  './',
  './index.html',
  './comparison-summary.html',
  './program-summary.html',
  './manifest.webmanifest',
  './src/styles.css',
  './src/branding.css',
  './src/sales-idea-player.css',
  './src/cetak-besar.css',
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
  './src/sales-idea-player.js',
  './assets/logo-psg.png',
  './assets/logo-psg-terang.png',
  './icons/ikon-192.png',
  './icons/ikon-512.png',
  './icons/ikon-192-maskable.png',
  './icons/ikon-512-maskable.png',
  './icons/ikon-apple-180.png'
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

function bolehDisimpan(res) {
  return res && res.status === 200 && (res.type === 'basic' || res.type === 'default');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // biarkan permintaan luar apa adanya

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

  // Gambar dan ikon: tampilkan dari cache (cepat), perbarui di latar belakang.
  e.respondWith(
    caches.match(req).then(tersimpan => {
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
