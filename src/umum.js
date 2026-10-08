/* ============================================================
   Perapian umum
   ------------------------------------------------------------
   Tiga hal yang berlaku di seluruh aplikasi, dikumpulkan di sini
   supaya tidak perlu menambal tiap layar satu per satu:

   1. Tombol Home di bilah atas, di samping tombol kembali.
   2. Nama dan nomor HP agen terisi sendiri di semua kolom penyaji.
   3. Tombol "Buka ringkasan..." yang belum punya penanganan
      disambungkan ke layar ringkasan milik layar yang sedang aktif.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (t) => String(t === null || t === undefined ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- 1. Tombol Home ---------- */

  function pasangHome() {
    if (el('tblHome')) return;
    const bilah = el('bilah');
    const kiri = el('tblKiri');
    if (!bilah || !kiri) return;

    const b = document.createElement('button');
    b.id = 'tblHome';
    b.type = 'button';
    b.className = 'kiri tbl-home';
    b.setAttribute('aria-label', 'Kembali ke halaman utama');
    b.innerHTML = '&#8962;';                  // lambang rumah
    b.addEventListener('click', function () {
      if (typeof window.bukaLayar === 'function') window.bukaLayar('PRODUK');
    });
    kiri.parentNode.insertBefore(b, kiri.nextSibling);
    segarkanHome();
  }

  // Tombol Home disembunyikan saat sudah berada di halaman utama.
  function segarkanHome() {
    const b = el('tblHome');
    if (!b) return;
    /* Layar aktif dikenali dari nama layarnya, bukan dari teks judul.
       Sebelumnya perbandingannya judul === 'Insurance Hub', sehingga
       mengubah judul dashboard satu huruf saja membuat tombol Home berhenti
       bersembunyi. */
    let diHome = false;
    try {
      const n = document.querySelector('.layar.aktif');
      const idLayar = n ? n.id : '';
      const nav = window.InsuranceHubNavigation;
      if (nav && nav.LAYAR && nav.LAYAR.PRODUK) diHome = idLayar === nav.LAYAR.PRODUK.el;
      else diHome = idLayar === 'layarProduk';
    } catch (_) {}
    b.style.display = diHome ? 'none' : '';
  }

  /* ---------- Sambutan dan foto agen ---------- */

  const FOTO_KEY = 'insuranceHub.agen.foto.v1';

  function levelAgen() {
    if (window.InsuranceHubLevel && window.InsuranceHubLevel.level) return window.InsuranceHubLevel;
    try { return JSON.parse(localStorage.getItem('insuranceHub.level.v1') || 'null') || {}; }
    catch (_) { return {}; }
  }

  function fotoTersimpan() {
    try { return localStorage.getItem(FOTO_KEY) || ''; } catch (_) { return ''; }
  }

  /* Panel sambutan di halaman utama: foto, nama, dan level dari data masuk. */
  function pasangSambutan() {
    const layar = el('layarProduk');
    if (!layar) return;
    let kotak = el('sambutanAgen');
    if (!kotak) {
      kotak = document.createElement('div');
      kotak.id = 'sambutanAgen';
      kotak.className = 'blok sambutan-agen tanpa-cetak';
      layar.insertBefore(kotak, layar.firstChild);
    }

    const L = levelAgen();
    const a = agenTersimpan();
    const nama = (L.namaAgen || a.nama || '').trim();
    const kode = (L.kodeAgen || a.kode || '').trim();
    const foto = fotoTersimpan();

    kotak.innerHTML =
      '<div class="sambutan-baris">' +
      '<label class="sambutan-foto" title="Ketuk untuk mengganti foto">' +
      (foto ? '<img src="' + foto + '" alt="Foto agen">'
        : '<span class="sambutan-ikon">\u{1F464}</span>') +
      '<input type="file" id="fotoAgen" accept="image/*" hidden></label>' +
      '<div class="sambutan-teks">' +
      '<div class="sambutan-halo">Selamat datang</div>' +
      '<div class="sambutan-nama">' + (nama ? esc(nama) : 'Tenaga Pemasar') + '</div>' +
      '<div class="sambutan-level">' +
      (L.level ? esc(L.nama + ' (' + L.level + ')') : 'Level belum terbaca') +
      (kode ? ' \u00b7 ' + esc(kode) : '') + '</div>' +
      '<div class="sambutan-peran">Konsultan Perencanaan Keuangan dan Asuransi Jiwa Anda</div>' +
      '</div></div>';
  }

  function pasangPeristiwaFoto() {
    if (document.__fotoAgenSiap) return;
    document.__fotoAgenSiap = true;

    document.addEventListener('change', function (e) {
      if (!e.target || e.target.id !== 'fotoAgen') return;
      const berkas = e.target.files && e.target.files[0];
      if (!berkas) return;
      const pembaca = new FileReader();
      pembaca.onload = function () {
        kecilkanFoto(String(pembaca.result), function (kecil) {
          try { localStorage.setItem(FOTO_KEY, kecil); } catch (_) {
            alert('Foto terlalu besar untuk disimpan di perangkat ini.');
            return;
          }
          pasangSambutan();
        });
      };
      pembaca.readAsDataURL(berkas);
    });

    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#hapusFotoAgen')) {
        try { localStorage.removeItem(FOTO_KEY); } catch (_) {}
        pasangSambutan();
      }
    });
  }

  /* Foto dipotong jadi kotak kecil sebelum disimpan, supaya tidak memenuhi
     ruang penyimpanan peramban. */
  function kecilkanFoto(dataUrl, selesai) {
    const img = new Image();
    img.onload = function () {
      const sisi = Math.min(img.width, img.height);
      const kanvas = document.createElement('canvas');
      kanvas.width = 160; kanvas.height = 160;
      const k = kanvas.getContext('2d');
      k.drawImage(img, (img.width - sisi) / 2, (img.height - sisi) / 2, sisi, sisi, 0, 0, 160, 160);
      selesai(kanvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = function () { selesai(dataUrl); };
    img.src = dataUrl;
  }

  /* ---------- 2. Identitas agen ---------- */

  function agenTersimpan() {
    let a = {};
    try { a = JSON.parse(localStorage.getItem('insuranceHub.agen.v1') || '{}') || {}; }
    catch (_) {}
    const identity = window.InsuranceHubIdentity;
    if (identity && identity.source === 'server:/api/psg/me') {
      a.nama = identity.nama || '';
      a.kode = identity.kodeAgen || '';
    }
    return a;
  }

  /* Semua kolom penyaji memakai pola id yang sama: xAgenNama dan xAgenHP.
     Yang kosong diisi; yang sudah diketik agen tidak diganggu. */
  function isiIdentitasAgen() {
    const a = agenTersimpan();
    const L = levelAgen();
    const identity = window.InsuranceHubIdentity;
    const identityAktif = identity && identity.source === 'server:/api/psg/me';
    if (!identityAktif && !a.nama && L.namaAgen) a.nama = L.namaAgen;
    /* Mode "dibuat untuk agen lain" mengganti identitas penyaji pada seluruh
       kolom cetak. Berbeda dari pengisian biasa, kolom yang sudah terisi ikut
       diganti — kalau tidak, nama pembuat sebelumnya akan tertinggal di
       dokumen milik agen lain. */
    let timpa = false;
    try {
      const an = window.InsuranceHubAtasNama && window.InsuranceHubAtasNama.baca();
      if (an && an.aktif && an.nama) {
        a.nama = an.nama; a.hp = an.whatsapp || ''; timpa = true;
      }
    } catch (_) {}
    if (!a.nama && !a.hp) return;
    document.querySelectorAll('input[id$="AgenNama"], input[id$="AgenHP"], #fAgen')
      .forEach(function (n) {
        /* Kolom yang pernah ditimpa mode "atas nama" ditandai. Saat mode
           dimatikan, tanda itu yang membuat kolomnya ditulis ulang dengan
           identitasmu. Tanpa penanda ini nama agen lain tertinggal di kolom
           penyaji, karena pengisian biasa melewati kolom yang sudah berisi. */
        const bekasAtasNama = n.dataset && n.dataset.psgAtasNama === '1';
        if (!identityAktif && !timpa && !bekasAtasNama && n.value && n.value.trim()) return;
        if (n.id === 'fAgen') return;
        if (/HP$/.test(n.id)) { n.value = a.hp || ''; }
        else if (identityAktif) n.value = a.nama || '';
        else if (a.nama) n.value = a.nama;
        if (n.dataset) {
          if (timpa) n.dataset.psgAtasNama = '1';
          else delete n.dataset.psgAtasNama;
        }
      });
  }

  /* ---------- 3. Tombol ringkasan yang belum tersambung ---------- */

  function layarAktifSekarang() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return null;
    const judul = el('judul') ? el('judul').textContent : '';
    const kunci = Object.keys(nav.LAYAR).find(function (k) {
      const node = el(nav.LAYAR[k].el);
      return node && node.classList.contains('aktif');
    });
    return kunci || null;
  }

  function sambungkanTombolRingkasan() {
    // Tombol di bagian bawah layar kalkulator: "Buka ilustrasi untuk nasabah"
    // dan "Lihat timeline". Sebagian tidak pernah punya penanganan sama sekali,
    // jadi semuanya disambungkan ke layar ringkasan milik layar yang aktif.
    document.querySelectorAll(
      'button[id$="TblRingkas"], button[id$="TblIlustrasi"], button[id$="TblTimeline"], #tblRingkasan')
      .forEach(function (b) {
        if (b.dataset.ringkasSudah) return;
        b.dataset.ringkasSudah = '1';
        b.type = 'button';
        b.addEventListener('click', function () {
          const nav = window.InsuranceHubNavigation;
          const kunci = layarAktifSekarang();
          if (!nav || !kunci) return;
          const s = nav.LAYAR[kunci];
          if (s && s.kanan && s.kanan.ke) window.bukaLayar(s.kanan.ke);
        });
      });
  }

  /* ---------- Tombol cetak pada halaman Perbandingan Solusi ---------- */

  /* Halaman ini menampilkan alternatif berdampingan seperti halaman banding
     lainnya, jadi ikut diberi tombol cetak supaya bisa dikirim ke nasabah. */
  function pasangCetakPerbandingan() {
    const b = el('cmpTblCetak');
    if (!b || b.dataset.siap) return;
    b.dataset.siap = '1';
    b.addEventListener('click', function () {
      const asli = document.title;
      const nama = (el('cmpNamaNasabah') && el('cmpNamaNasabah').textContent) || 'Nasabah';
      document.title = 'Perbandingan Solusi - ' + String(nama).trim();
      window.print();
      setTimeout(function () { document.title = asli; }, 1000);
    });
  }

  /* ---------- Penamaan tombol yang lebih jelas ---------- */

  const NAMA_TOMBOL = {
    pTblRingkas: 'Ringkasan ilustrasi Cicilan Rumah',
    nTblRingkas: 'Ringkasan kebutuhan dana pendidikan anak',
    dTblRingkas: 'Ringkasan kebutuhan dana pensiun'
  };

  function perbaikiNamaTombol() {
    Object.keys(NAMA_TOMBOL).forEach(function (id) {
      const b = el(id);
      if (b && b.textContent.trim() !== NAMA_TOMBOL[id]) b.textContent = NAMA_TOMBOL[id];
    });
  }

  /* ---------- Mulai ---------- */

  /* Tombol kembali dan Home diikat ulang dengan cara mengganti simpulnya,
     sehingga hanya ada satu penangan dan tidak mungkin tertimpa modul lain.
     Dilaporkan tidak berfungsi di layar Perbandingan Solusi. */
  function ikatUlangNavigasi() {
    const kiri = el('tblKiri');
    if (kiri && !kiri.dataset.navSiap) {
      const baru = kiri.cloneNode(true);
      baru.dataset.navSiap = '1';
      kiri.parentNode.replaceChild(baru, kiri);
      baru.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.kembaliLayar === 'function') {
          if (window.kembaliLayar()) return;
        }
        if (typeof window.bukaLayar === 'function') window.bukaLayar('PRODUK');
      });
    }
    const home = el('tblHome');
    if (home && !home.dataset.navSiap) {
      const baru = home.cloneNode(true);
      baru.dataset.navSiap = '1';
      home.parentNode.replaceChild(baru, home);
      baru.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.bukaLayar === 'function') window.bukaLayar('PRODUK');
      });
    }
  }

  function segarkan() {
    ikatUlangNavigasi();
    pasangSambutan();
    pasangPeristiwaFoto();
    pasangCetakPerbandingan();
    isiIdentitasAgen();
    pasangLipat();
    tulisVersi();
    sambungkanTombolRingkasan();
    perbaikiNamaTombol();
    segarkanHome();
  }

  /* Halaman ringkasan berada di berkas terpisah. Saat kembali, ia mengirim
     nama layar lewat alamat, tetapi tidak ada yang membacanya sehingga selalu
     mendarat di halaman utama. Di sini layar itu dipulihkan. */
  function pulihkanLayarDariAlamat() {
    try {
      const p = new URLSearchParams(window.location.search || '');
      const layar = p.get('returnScreen');
      if (!layar) return;
      const nav = window.InsuranceHubNavigation;
      if (!nav || !nav.LAYAR || !nav.LAYAR[layar]) return;
      if (typeof window.bukaLayar === 'function') {
        setTimeout(function () {
          window.bukaLayar(layar);
          /* Membuka layar saja tidak menggambar isinya: sebagian layar hanya
             terisi ketika modulnya diminta menggambar. Tanpa ini, kembali
             dari halaman ringkasan mendarat di layar kosong. */
          setTimeout(function () {
            try {
              const M = window.InsuranceHubSegitigaSolusi;
              if (layar === 'SOLUSI_SEGITIGA' && M && M.render) M.render();
              if (layar === 'SOLUSI_HITUNG' && M && M.renderCalculationHub) M.renderCalculationHub();
              if (layar === 'SOLUSI_BANDING' && M && M.renderBanding) M.renderBanding();
              const D = window.InsuranceHubDpSolusi;
              if (layar === 'DP_SOLUSI' && D && D.gambar) D.gambar();
              if (layar === 'DP_SOLUSI_RINGKAS' && D && D.gambarRingkas) D.gambarRingkas();
              const S = window.InsuranceHubSegitiga;
              if (layar === 'SEGITIGA' && S && S.gambar) S.gambar();
            } catch (_) {}
          }, 80);
        }, 120);
      }
      // Alamat dibersihkan supaya menyegarkan halaman tidak mengulangi ini.
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (_) {}
  }

  function mulai() {
    pulihkanLayarDariAlamat();
    pasangHome();
    segarkan();
    window.addEventListener('psg:identity-ready', segarkan);

    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__umumHook) {
      const asli = window.bukaLayar;
      const bungkus = function () {
        const hasil = asli.apply(this, arguments);
        setTimeout(segarkan, 20);
        return hasil;
      };
      bungkus.__umumHook = true;
      bungkus.__naHook = asli.__naHook;
      bungkus.__rzHook = asli.__rzHook;
      bungkus.__promptHook = asli.__promptHook;
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
  }

  /* ---------- Blok "Pilih cara kerja" bisa dilipat ----------
     Agen yang sudah hafal menu ini biasanya langsung memakai Kalkulator
     Cepat. Melipatnya membuat kalkulator itu terlihat tanpa menggulir.
     Pilihannya diingat per perangkat — bukan data nasabah, jadi disimpan
     sebagai preferensi tampilan biasa. */
  /* ---------- Blok "Pilih cara kerja" bisa dilipat ----------
     Memakai <details> supaya modelnya sama persis dengan Quick Calculator
     (.quick-group). Sebelumnya berupa tombol Tampilkan/Sembunyikan yang
     tampilannya berbeda sendiri di halaman yang sama.
     Pilihannya diingat per perangkat. */
  const LIPAT_KEY = 'insuranceHub.ui.caraKerjaTertutup.v1';

  function pasangLipat() {
    const d = el('lipatCaraKerja');
    if (!d || d.dataset.psgLipat === '1') return;
    d.dataset.psgLipat = '1';
    try { d.open = localStorage.getItem(LIPAT_KEY) !== '1'; } catch (_) {}
    d.addEventListener('toggle', function () {
      try { localStorage.setItem(LIPAT_KEY, d.open ? '0' : '1'); } catch (_) {}
    });
  }

  /* Menuliskan versi aplikasi ke kaki halaman. Dipanggil ulang tiap kali
     layar disegarkan karena badge login baru ada setelah gate dirender. */
  function tulisVersi(){
    try{
      const teks = window.PSG_APP_VERSION_LABEL
        || ('Aplikasi Web ' + (window.PSG_APP_VERSION || ''));
      ['psgVersiApp','psgVersiLogin'].forEach(function(id){
        const n = document.getElementById(id);
        if(n && n.textContent !== teks) n.textContent = teks;
      });
    }catch(_){}
  }

  window.InsuranceHubUmum = { isiIdentitasAgen, segarkan, pasangLipat, tulisVersi };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 60);
  }
})();
