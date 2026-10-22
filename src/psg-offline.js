/* PSG Selling Tools — akses offline terbatas (maksimal 14 hari).

   Dimuat paling awal (sebelum src/access-gate.js) di index.html dan halaman
   ringkasan. Isinya:
   - Catatan verifikasi lokal `psg.offline.v1`: ditulis HANYA sesudah server
     (GET /api/psg/me) mengakui sesi. Isi: uid, waktu verifikasi, waktu terakhir
     dilihat, dan salinan profil (nama, level, role) untuk tampilan/komisi.
     TIDAK berisi kata sandi atau token. Catatan ini bukan bukti autentikasi dan
     tidak pernah dikirim ke server; ia hanya mengizinkan kalkulator lokal dibuka
     ketika server tidak terjangkau.
   - Aturan: berlaku <= 14 hari sejak verifikasi online terakhir; kegagalan
     jaringan tidak memperpanjang; jam perangkat yang mundur dari waktu terakhir
     dilihat (toleransi 5 menit) membuat catatan tidak dipercaya sampai ada
     verifikasi online. KETERBATASAN: localStorage dapat diubah pemilik perangkat,
     sehingga batas ini bukan perlindungan terhadap pengguna yang sengaja
     memanipulasi perangkatnya; ia membatasi akses yang tidak disengaja/usang.
     Pencabutan akun di server baru diketahui aplikasi saat online lagi.
   - Mode offline: /api/psg/* dan /.netlify/* (kecuali /.netlify/identity/, jalur pemulihan sesi) dijawab 503 dengan pesan koneksi
     (bukan respons sukses palsu); pemberitahuan sementara "Mode offline" (hilang ±4,5 dtk)
     dan kapsul Online/Offline di header; unduhan video ditahan.
   - Indikator kesiapan cache (status ditulis service worker). */
(function () {
  'use strict';
  var KUNCI = 'psg.offline.v1';
  var KUNCI_KELUAR = 'psg.keluar.v1';
  var KUNCI_TOAST = 'psg.offlineToast.v1';
  var MAKS_MS = 14 * 24 * 60 * 60 * 1000;
  var TOLERANSI_MS = 5 * 60 * 1000;
  var PESAN = 'Fitur ini memerlukan koneksi internet. Silakan sambungkan perangkat ke jaringan, lalu coba kembali.';
  var fetchAsli = window.fetch ? window.fetch.bind(window) : null;
  var banner = null, bannerTimer = null;
  var DURASI_NOTIF_MS = 4500;

  function baca() {
    try { var t = localStorage.getItem(KUNCI); return t ? JSON.parse(t) : null; } catch (_) { return null; }
  }
  function tulis(r) { try { localStorage.setItem(KUNCI, JSON.stringify(r)); return true; } catch (_) { return false; } }
  function hapus() { try { localStorage.removeItem(KUNCI); } catch (_) {} }

  var PSGOffline = {
    aktif: false,
    PESAN: PESAN,
    MAKS_MS: MAKS_MS,
    fetchAsli: fetchAsli,

    /* Dipanggil sesudah /api/psg/me berhasil dan akun diizinkan. */
    catat: function (profil, sekarang) {
      if (!profil || !profil.id) return false;
      var n = typeof sekarang === 'number' ? sekarang : Date.now();
      return tulis({
        v: 1, uid: String(profil.id), t: n, lihat: n,
        profil: {
          id: String(profil.id), email: profil.email || null, nama: profil.nama || null,
          roles: Array.isArray(profil.roles) ? profil.roles.slice() : [], level: profil.level || null,
          kodeAgen: profil.kodeAgen || null, status: profil.status || null,
          emailTerkonfirmasi: !!profil.emailTerkonfirmasi
        }
      });
    },
    hapus: hapus,
    /* Sisa sesi lokal gotrue (kunci milik vendor) setelah logout yang tertunda. */
    hapusSesiLokal: function () { try { localStorage.removeItem('gotrue.user'); } catch (_) {} },

    /* id akun pada sesi lokal (gotrue.user), tanpa jaringan; null bila tidak ada. */
    idSesiLokal: function () {
      try { var u = JSON.parse(localStorage.getItem('gotrue.user') || 'null'); return u && u.id ? String(u.id) : null; } catch (_) { return null; }
    },

    /* {ok, alasan: 'tidak-ada'|'rusak'|'jam-mundur'|'kedaluwarsa', rekam, berlakuSampai} */
    periksa: function (sekarang) {
      var r = baca();
      if (!r) return { ok: false, alasan: 'tidak-ada' };
      if (r.v !== 1 || typeof r.uid !== 'string' || !r.uid || typeof r.t !== 'number' || !r.profil || typeof r.profil !== 'object') {
        return { ok: false, alasan: 'rusak' };
      }
      var n = typeof sekarang === 'number' ? sekarang : Date.now();
      var lihat = typeof r.lihat === 'number' ? r.lihat : r.t;
      if (n < r.t - TOLERANSI_MS || n < lihat - TOLERANSI_MS) return { ok: false, alasan: 'jam-mundur', rekam: r };
      if (n - r.t > MAKS_MS) return { ok: false, alasan: 'kedaluwarsa', rekam: r };
      if (n > lihat) { r.lihat = n; tulis(r); }
      return { ok: true, rekam: r, berlakuSampai: r.t + MAKS_MS };
    },

    pesanAlasan: function (alasan) {
      if (alasan === 'kedaluwarsa') return 'Masa akses offline (14 hari sejak verifikasi online terakhir) sudah habis. Sambungkan internet lalu masuk kembali.';
      if (alasan === 'jam-mundur') return 'Jam perangkat tidak sesuai dengan penggunaan terakhir. Sambungkan internet agar akun dapat diverifikasi ulang.';
      return 'Kamu sedang offline dan belum ada verifikasi online yang masih berlaku di perangkat ini. Sambungkan internet lalu masuk.';
    },

    /* Tanda logout: logout dari halaman yang tidak memuat Identity (ringkasan)
       dan logout saat offline diselesaikan oleh identity-login.js pada pemuatan
       berikutnya, tanpa pernah memulihkan sesi. */
    tandaiKeluar: function (belumTerkonfirmasi) {
      try { localStorage.setItem(KUNCI_KELUAR, JSON.stringify({ t: Date.now(), belumTerkonfirmasi: !!belumTerkonfirmasi })); } catch (_) {}
    },
    bacaTandaKeluar: function () {
      try { var t = localStorage.getItem(KUNCI_KELUAR); return t ? (JSON.parse(t) || {}) : null; } catch (_) { return null; }
    },
    bersihTandaKeluar: function () { try { localStorage.removeItem(KUNCI_KELUAR); } catch (_) {} },

    /* Masuk mode offline (aplikasi dibuka tanpa server). */
    masuk: function () { PSGOffline.aktif = true; tampilBanner(); },
    keluar: function () { PSGOffline.aktif = false; tutupBanner(); },

    /* Dipakai halaman ringkasan: buka bila catatan masih berlaku. */
    bukaJikaBerlaku: function () {
      var p = PSGOffline.periksa();
      if (!p.ok) return false;
      PSGOffline.masuk();
      return true;
    },

    /* Cek ke server tanpa pembungkus offline: 'ok' | 'ditolak' | 'jaringan'. */
    /* batasMs: batas tunggu (default 10 dtk). Boot memakai batas pendek supaya server yang
       menggantung (Wi-Fi tersambung tanpa internet) tidak menahan pembukaan aplikasi. */
    verifikasiOnline: function (batasMs) {
      if (!fetchAsli) return Promise.resolve('jaringan');
      var kendali = typeof AbortController === 'function' ? new AbortController() : null;
      var t = kendali ? setTimeout(function () { kendali.abort(); }, batasMs || 10000) : null;
      return fetchAsli('/api/psg/me', { method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json' }, signal: kendali ? kendali.signal : undefined })
        .then(function (r) {
          if (t) clearTimeout(t);
          if (r.status === 401) return 'ditolak';
          if (!r.ok) return 'jaringan';
          return r.json().then(function (d) { return d && d.authenticated && d.user ? { user: d.user } : 'ditolak'; }, function () { return 'jaringan'; });
        }, function () { if (t) clearTimeout(t); return 'jaringan'; });
    },

    /* Status cache yang ditulis service worker saat pemasangan. */
    statusSiap: function () {
      if (!window.caches || !caches.match) return Promise.resolve(null);
      return caches.match('./__status-offline').then(function (r) { return r ? r.json() : null; }, function () { return null; });
    },
    lengkapiCache: function () {
      try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ tipe: 'lengkapi' }); } catch (_) {}
    }
  };

  function pakaiGaya() {
    if (document.getElementById('psgOfflineGaya')) return;
    var s = document.createElement('style'); s.id = 'psgOfflineGaya';
    s.textContent = '.psg-offline-banner,.psg-offline-toast{position:fixed;left:50%;transform:translateX(-50%);z-index:2147483000;max-width:min(92vw,560px);box-sizing:border-box;padding:8px 14px;border-radius:14px;font:600 12.5px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.28);display:flex;align-items:center;gap:10px}' +
      '.psg-offline-banner{top:calc(var(--psg-notif-top,64px));background:#1f2937;color:#fff}' +
      '.psg-offline-banner button{all:unset;cursor:pointer;font-size:16px;line-height:1;padding:0 2px;opacity:.8}' +
      '.psg-offline-toast{bottom:calc(84px + env(safe-area-inset-bottom,0px));background:#166534;color:#fff}' +
      '@media(min-width:900px){.psg-offline-toast{bottom:16px}}' +
      '.psg-koneksi{display:inline-flex;align-items:center;gap:6px;flex:none;box-sizing:border-box;padding:4px 10px 4px 5px;border-radius:999px;border:2px solid #fff;font:700 12px/1 system-ui,sans-serif;color:#fff;white-space:nowrap;background:#16a34a}' +
      '.psg-koneksi::before{content:"";width:12px;height:12px;border-radius:50%;background:#fff}' +
      '.psg-koneksi[data-status=offline]{background:#dc2626}' +
      '.psg-koneksi[data-status=offline]::before{background:#fff}' +
      '@media(max-width:480px){.psg-koneksi{padding:3px 8px 3px 4px;font-size:11px;gap:4px}.psg-koneksi::before{width:10px;height:10px}}';
    (document.head || document.documentElement).appendChild(s);
  }
  function tanggalId(ms) {
    try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms)); } catch (_) { return ''; }
  }
  function tutupBanner() {
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    if (banner) { banner.remove(); banner = null; }
  }
  /* Pemberitahuan sementara: hilang sendiri sesudah ±4,5 dtk, dapat ditutup,
     diletakkan di bawah header (tidak menutupi navigasi bawah). Status offline
     yang menetap ditunjukkan indikator di header (#psgKoneksi). */
  function tampilBanner() {
    if (banner || !document.body) { if (!document.body) document.addEventListener('DOMContentLoaded', tampilBanner, { once: true }); return; }
    pakaiGaya();
    var p = PSGOffline.periksa(); var sampai = p.ok ? ' · akses offline sampai ' + tanggalId(p.berlakuSampai) : '';
    var bilah = document.getElementById('bilah'), atas = 64;
    try { if (bilah) atas = Math.round(bilah.getBoundingClientRect().bottom) + 8; } catch (_) {}
    banner = document.createElement('div'); banner.className = 'psg-offline-banner'; banner.setAttribute('role', 'status'); banner.id = 'psgOfflineBanner';
    banner.style.setProperty('--psg-notif-top', atas + 'px');
    var teks = document.createElement('span'); teks.textContent = 'Mode offline: kalkulator tetap bisa dipakai, fitur server tidak tersedia' + sampai;
    var tutup = document.createElement('button'); tutup.type = 'button'; tutup.setAttribute('aria-label', 'Tutup pemberitahuan'); tutup.textContent = '×';
    tutup.addEventListener('click', tutupBanner);
    banner.appendChild(teks); banner.appendChild(tutup);
    document.body.appendChild(banner);
    bannerTimer = setTimeout(tutupBanner, DURASI_NOTIF_MS);
  }

  /* ---- Indikator koneksi (kapsul Online/Offline di header) ----
     Hanya melaporkan keterjangkauan jaringan/server; TIDAK menentukan hak akses
     offline (itu catatan 14 hari) dan tidak menghapus sesi. Online = peramban
     melaporkan jaringan DAN server menjawab (status apa pun selain 502/503/504)
     pada GET /api/psg/me yang tidak mengubah data. Tanpa polling saat online;
     saat offline dicoba ulang dengan jeda 15 → 45 dtk. */
  var koneksi = { status: null, alasan: null, jalan: false, timer: null, jeda: 15000, terakhir: 0 };
  function cobaServer() {
    if (!fetchAsli) return Promise.resolve(false);
    var kendali = typeof AbortController === 'function' ? new AbortController() : null;
    var t = kendali ? setTimeout(function () { kendali.abort(); }, 6000) : null;
    return fetchAsli('/api/psg/me', { method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: kendali ? kendali.signal : undefined })
      .then(function (r) { if (t) clearTimeout(t); return r.status !== 502 && r.status !== 503 && r.status !== 504; },
            function () { if (t) clearTimeout(t); return false; });
  }
  function pasangKapsul() {
    var el = document.getElementById('psgKoneksi');
    if (el) return el;
    var h = document.querySelector('.header-actions');
    if (!h) return null;
    pakaiGaya();
    el = document.createElement('span'); el.id = 'psgKoneksi'; el.className = 'psg-koneksi'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    h.insertBefore(el, h.firstChild);
    return el;
  }
  function setKoneksi(status, alasan) {
    var sebelum = koneksi.status;
    koneksi.status = status; koneksi.alasan = alasan || null;
    /* Server terjangkau lagi saat aplikasi masih di mode offline (tanpa event 'online'
       dari peramban, mis. Wi-Fi tanpa internet yang pulih): minta verifikasi ulang. */
    if (sebelum === 'offline' && status === 'online' && PSGOffline.aktif) {
      setTimeout(function () { window.dispatchEvent(new Event('psg:koneksi-pulih')); }, 0);
    }
    var el = pasangKapsul(); if (!el) return;
    el.dataset.status = status;
    el.textContent = status === 'online' ? 'Online' : 'Offline';
    el.title = status === 'online' ? 'Terhubung ke server'
      : (alasan === 'server' ? 'Internet tersambung, tetapi server tidak dapat dijangkau' : 'Internet tidak tersedia');
  }
  function jadwalUlang() {
    if (koneksi.timer) { clearTimeout(koneksi.timer); koneksi.timer = null; }
    if (koneksi.status !== 'offline' || navigator.onLine === false) return;
    koneksi.timer = setTimeout(function () { periksaKoneksi(true); }, koneksi.jeda);
    koneksi.jeda = Math.min(koneksi.jeda * 2, 45000);
  }
  function periksaKoneksi(paksa) {
    if (koneksi.jalan) return Promise.resolve(koneksi.status);
    if (!paksa && Date.now() - koneksi.terakhir < 5000) return Promise.resolve(koneksi.status);
    koneksi.jalan = true; koneksi.terakhir = Date.now();
    var hasil;
    if (navigator.onLine === false) hasil = Promise.resolve({ ok: false, alasan: 'internet' });
    else hasil = cobaServer().then(function (ok) {
      if (ok) return { ok: true };
      /* satu percobaan ulang singkat agar gangguan sesaat tidak membuat indikator berkedip */
      return new Promise(function (r) { setTimeout(r, 1500); }).then(cobaServer).then(function (ok2) { return ok2 ? { ok: true } : { ok: false, alasan: 'server' }; });
    });
    return hasil.then(function (h) {
      koneksi.jalan = false;
      if (h.ok) { koneksi.jeda = 15000; setKoneksi('online'); } else setKoneksi('offline', h.alasan);
      jadwalUlang();
      return koneksi.status;
    }, function () { koneksi.jalan = false; return koneksi.status; });
  }
  /* Hasil pemeriksaan server dari modul lain (mis. verifikasi profil saat boot). */
  PSGOffline.laporKoneksi = function (ok, alasan) {
    koneksi.terakhir = Date.now(); koneksi.dilaporkan = true;
    if (ok) { koneksi.jeda = 15000; setKoneksi('online'); } else setKoneksi('offline', alasan || 'server');
    jadwalUlang();
  };
  PSGOffline.koneksi = function () { return { status: koneksi.status, alasan: koneksi.alasan }; };
  PSGOffline.periksaKoneksi = function () { return periksaKoneksi(true); };
  window.addEventListener('offline', function () { setKoneksi('offline', 'internet'); jadwalUlang(); });
  window.addEventListener('online', function () { koneksi.jeda = 15000; periksaKoneksi(true); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(function () { periksaKoneksi(false); }, 1500); }); /* jeda: beri kesempatan verifikasi profil melapor lebih dulu */
  window.addEventListener('pageshow', function (e) { if (e.persisted) periksaKoneksi(false); });
  /* Awal: bila peramban melaporkan offline langsung Offline; bila tidak, tunggu hasil
     verifikasi boot (laporKoneksi). Probe mandiri hanya bila belum ada laporan
     dalam 4 dtk, supaya tidak menambah request saat pemuatan. */
  function mulaiKoneksi() {
    if (navigator.onLine === false) { setKoneksi('offline', 'internet'); return; }
    setTimeout(function () { if (!koneksi.dilaporkan && koneksi.status === null) periksaKoneksi(true); }, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulaiKoneksi, { once: true }); else mulaiKoneksi();

  function toastSiap() {
    PSGOffline.statusSiap().then(function (st) {
      if (!st) return;
      if (st.gagal && st.gagal.length) { PSGOffline.lengkapiCache(); return; }
      var tandai = String(st.versi || '');
      try { if (localStorage.getItem(KUNCI_TOAST) === tandai) return; localStorage.setItem(KUNCI_TOAST, tandai); } catch (_) {}
      if (PSGOffline.aktif || !document.body) return;
      pakaiGaya();
      var t = document.createElement('div'); t.className = 'psg-offline-toast'; t.setAttribute('role', 'status');
      t.textContent = 'Aplikasi siap dipakai offline'; document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 6000);
    });
  }

  /* Fitur server dijawab 503 + pesan koneksi selama mode offline. */
  if (fetchAsli) {
    window.fetch = function (input, init) {
      if (PSGOffline.aktif) {
        var u = '';
        try { u = new URL(typeof input === 'string' ? input : (input && input.url) || '', location.href).pathname; } catch (_) {}
        if (u.indexOf('/.netlify/identity/') !== 0 && (u.indexOf('/api/psg/') === 0 || u.indexOf('/.netlify/') === 0)) {
          return Promise.resolve(new Response(JSON.stringify({ ok: false, error: 'offline', message: PESAN }),
            { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }));
        }
      }
      return fetchAsli(input, init);
    };
  }

  /* Unduhan video tidak ada di cache: tahan dan beri tahu. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="assets/video/"]') : null;
    if (!a || !(PSGOffline.aktif || navigator.onLine === false)) return;
    e.preventDefault(); e.stopPropagation();
    try { alert(PESAN); } catch (_) {}
  }, true);

  /* QR WhatsApp memakai layanan eksternal (quickchart.io) yang tidak ada di
     cache: bila gambar gagal dimuat, ganti dengan keterangan, bukan ikon rusak. */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || String(img.src || '').indexOf('quickchart.io/qr') < 0 || img.dataset.psgQrGagal) return;
    img.dataset.psgQrGagal = '1';
    var ket = document.createElement('span');
    ket.className = 'psg-qr-offline'; ket.style.cssText = 'font:600 11px/1.3 system-ui,sans-serif;color:#6b7280';
    ket.textContent = 'QR tidak tersedia tanpa internet';
    if (img.parentNode) { img.style.display = 'none'; img.parentNode.insertBefore(ket, img.nextSibling); }
  }, true);

  window.PSGOffline = PSGOffline;
  window.addEventListener('load', function () { setTimeout(toastSiap, 1500); });
})();
