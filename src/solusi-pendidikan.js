/* ============================================================
   Solusi Dana Pendidikan
   ------------------------------------------------------------
   Setelah kebutuhan pendidikan dihitung, tiap anak mendapat satu
   tombol Solusi. Halaman solusinya dibagi dua, karena keduanya
   menjawab pertanyaan yang berbeda:

   A. Jaminan rencana kuliah
      Kalau pencari nafkah meninggal, uang pertanggungan menutup
      biaya kuliah. Berlaku berapa pun sisa waktunya.

   B. Persiapan dana kuliah
      Menyiapkan dananya sendiri lewat produk yang dana kembalinya
      cair tepat waktu atau lebih awal — tidak pernah terlambat.

   Yang dipakai di bagian B hanya produk yang dana kembalinya
   benar-benar tumbuh (Cristal Prime dan New Cemerlang Prime:
   120% pada tahun ke-15, 135% pada ke-20, 150% pada ke-25).
   RIZQIA dan iFLEXYGUARD hanya mengembalikan modal, jadi tempatnya
   di bagian A, bukan sebagai wadah menabung.

   Tidak ada rumus produk yang digandakan di sini: besar premi dan
   dana kembali tetap dihitung oleh mesin produk aslinya.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  let anakAktif = null;      // anak yang sedang dilihat solusinya
  let tglLahirOrtu = '';     // dipakai mengisi kalkulator produk

  /* Dana kembali sebagai persentase total premi, menurut masa perlindungan. */
  const PENGEMBALIAN = { 15: 1.20, 20: 1.35, 25: 1.50 };
  const MASA_TERSEDIA = [15, 20, 25];
  const LAMA_BAYAR = [3, 5, 10];

  /* ---------- Layar ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.SOLUSI_PDK = {
      el: 'layarSolusiPdk', judul: 'Solusi Dana Pendidikan',
      sub: 'Menjamin dan menyiapkan biaya kuliah', kiri: 'PDK'
    };
    return true;
  }

  /* ---------- Perhitungan ---------- */

  /* Berapa uang pertanggungan yang diperlukan agar dana kembali produk
     mencapai kebutuhan pendidikan. Premi produk lurus terhadap uang
     pertanggungan, jadi cukup satu perhitungan lalu diskalakan. */
  function upUntukDanaKembali(kode, usiaAcuan, tglLahir, jk, lamaBayar, lamaLindung, target, metode) {
    const usia = (usiaAcuan !== null && usiaAcuan !== undefined) ? usiaAcuan
      : (typeof usiaGenerali === 'function' ? usiaGenerali(tglLahir) : null);
    const mesin = window.InsuranceHubEngine;
    if (!mesin) return null;
    const rates = kode === 'CRIS'
      ? (typeof TARIF_CRIS !== 'undefined' ? TARIF_CRIS : null)
      : (typeof TARIF_CEM !== 'undefined' ? TARIF_CEM : null);
    const kodeMesin = kode === 'CEM' ? 'NCP' : kode;
    if (!rates) return null;

    const upCoba = 1000000000;
    let hasil;
    try {
      hasil = mesin.calculate(kodeMesin, {
        nama: 'x', jk: jk || 'PRIA', tglLahir: tglLahir, usia: usia,
        up: upCoba, lamaBayar: lamaBayar, lamaLindung: lamaLindung,
        metode: metode || 'Tahunan'
      }, { rates: rates });
    } catch (_) { return null; }
    if (!hasil || !hasil.tersedia || !hasil.akhirKontrak) return null;

    const skala = target / hasil.akhirKontrak;
    const up = Math.ceil(upCoba * skala / 1000000) * 1000000;   // dibulatkan ke atas, kelipatan 1 juta

    let akhir;
    try {
      akhir = mesin.calculate(kodeMesin, {
        nama: 'x', jk: jk || 'PRIA', tglLahir: tglLahir, usia: usia,
        up: up, lamaBayar: lamaBayar, lamaLindung: lamaLindung,
        metode: metode || 'Tahunan'
      }, { rates: rates });
    } catch (_) { return null; }
    if (!akhir || !akhir.tersedia) return null;

    return {
      up: up,
      premiPerTahun: akhir.premiPerTahun,
      totalDibayar: akhir.totalDibayar,
      akhirKontrak: akhir.akhirKontrak,
      manfaatKritis: akhir.totalKritis
    };
  }

  /* Masa perlindungan yang dananya cair tepat waktu atau lebih awal.
     Tidak pernah memilih yang cair setelah anak masuk kuliah. */
  function masaYangCocok(tahunLagi) {
    const cocok = MASA_TERSEDIA.filter(m => m <= tahunLagi);
    return cocok.length ? Math.max.apply(null, cocok) : null;
  }

  /* Lama bayar terbesar yang tidak melebihi sisa waktu maupun masa perlindungan. */
  function lamaBayarCocok(tahunLagi, masa) {
    const cocok = LAMA_BAYAR.filter(b => b <= Math.min(tahunLagi, masa));
    return cocok.length ? Math.max.apply(null, cocok) : null;
  }

  /* Beberapa kombinasi memang tidak ada di tabel tarif — misalnya New
     Cemerlang Prime tidak menyediakan bayar 3 tahun untuk perlindungan 15
     tahun. Kartu produknya dilewati, bukan menampilkan angka kosong. */

  /* ---------- Tampilan ---------- */

  function gambar() {
    const w = el('layarSolusiPdk');
    if (!w) return;
    if (!anakAktif) {
      w.innerHTML = '<div class="blok"><p class="catatan">Hitung dulu kebutuhan pendidikan, ' +
        'lalu pilih tombol Solusi pada anak yang ingin dibahas.</p></div>';
      return;
    }

    const a = anakAktif;
    const butuh = a.gap > 0 ? a.gap : a.estimasi;
    const jk = jkProfil();

    w.innerHTML =
      '<div class="kop"><h2>Solusi untuk ' + esc(a.nama || 'anak ini') + '</h2>' +
      '<p>Kuliah ' + a.tahunLagi + ' tahun lagi, saat ' + esc(a.nama || 'anak') +
      ' berusia ' + a.usiaKuliah + ' tahun. Perkiraan biaya saat itu <b>' + rp(a.estimasi) + '</b>' +
      (a.danaAda ? ', sudah tersedia ' + rp(a.danaAda) + ', kekurangan <b>' + rp(a.gap) + '</b>' : '') +
      '.</p></div>' +
      bagianJaminan(butuh, a) +
      bagianPersiapan(butuh, a, jk);
  }

  function bagianJaminan(butuh, a) {
    return '<div class="blok">' +
      '<h2>A. Menjamin rencana kuliahnya</h2>' +
      '<p class="catatan">Kalau pencari nafkah meninggal sebelum ' + esc(a.nama || 'anak') +
      ' masuk kuliah, uang pertanggungan langsung menutup biayanya. Ini berlaku sejak polis ' +
      'terbit, tidak perlu menunggu dana terkumpul.</p>' +
      '<div class="na-kartu"><div class="k">Uang pertanggungan yang disarankan</div>' +
      '<div class="v angka">' + rp(butuh) + '</div>' +
      '<p class="catatan">Sebesar perkiraan biaya kuliah pada waktunya.</p></div>' +
      '<div class="akt-aksi" style="margin-top:10px">' +
      tombol('CRIS', 'Cristal Prime', butuh) +
      tombol('CEM', 'New Cemerlang Prime', butuh) +
      tombol('RIZQIA', 'RIZQIA', Math.min(butuh, 1000000000)) +
      tombol('FLEX', 'iFLEXYGUARD 5', butuh) +
      '</div>' +
      (butuh > 1000000000
        ? '<p class="catatan">Uang pertanggungan RIZQIA paling besar Rp1.000.000.000, ' +
          'jadi kebutuhan di atas itu perlu ditutup produk lain atau digabung.</p>' : '') +
      '</div>';
  }

  function tombol(layar, nama, up) {
    return '<button class="akt-tbl profil" type="button" data-solusi-buka="' + layar +
      '" data-solusi-up="' + Math.round(up) + '">' + esc(nama) + '</button>';
  }

  function bagianPersiapan(butuh, a, jk) {
    const masa = masaYangCocok(a.tahunLagi);
    if (!masa) {
      return '<div class="blok">' +
        '<h2>B. Menyiapkan dananya sendiri</h2>' +
        '<p class="catatan">Dengan sisa waktu ' + a.tahunLagi + ' tahun, belum ada produk ' +
        'yang dana kembalinya cair sebelum ' + esc(a.nama || 'anak') + ' masuk kuliah. ' +
        'Pencairan paling cepat ada di tahun ke-15.</p>' +
        '<p class="catatan">Yang bisa dilakukan sekarang adalah menjamin rencananya lewat ' +
        'bagian A, sambil menyiapkan dananya di luar produk asuransi.</p></div>';
    }

    const bayar = lamaBayarCocok(a.tahunLagi, masa);
    if (!bayar) {
      return '<div class="blok"><h2>B. Menyiapkan dananya sendiri</h2>' +
        '<p class="catatan">Sisa waktunya terlalu pendek untuk masa pembayaran yang tersedia.</p></div>';
    }

    const tglOrtu = tglLahirOrtu || (el('fTgl') ? el('fTgl').value : '');
    const tgl = tglOrtu ? new Date(tglOrtu + 'T00:00:00Z') : null;
    const persen = Math.round(PENGEMBALIAN[masa] * 100);

    let kartu = '';
    [['CRIS', 'Cristal Prime'], ['CEM', 'New Cemerlang Prime']].forEach(function (p) {
      const h = tgl ? upUntukDanaKembali(p[0], null, tgl, jk, bayar, masa, butuh, 'Tahunan') : null;
      if (!h) {
        kartu += '<div class="akt-kartu"><div class="akt-kartu-atas"><b>' + esc(p[1]) + '</b></div>' +
          '<div class="akt-meta">Perlu tanggal lahir pemegang polis untuk menghitung preminya. ' +
          'Isi di kalkulator produk.</div>' +
          '<div class="akt-aksi">' + tombol(p[0] === 'CEM' ? 'CEM' : 'CRIS', 'Buka ' + p[1], butuh) + '</div></div>';
        return;
      }
      kartu += '<div class="akt-kartu">' +
        '<div class="akt-kartu-atas"><b>' + esc(p[1]) + '</b>' +
        '<span class="akt-lencana hijau">Cair tahun ke-' + masa + '</span></div>' +
        '<div class="akt-meta">Dana cair saat ' + esc(a.nama || 'anak') + ' berusia ' +
        (a.usiaSekarang + masa) + ' tahun' +
        (masa < a.tahunLagi ? ' — ' + (a.tahunLagi - masa) + ' tahun lebih awal' : ' — tepat waktu') +
        '.</div>' +
        '<table class="akt-tabel" style="margin:6px 0"><tbody>' +
        bar('Dana yang akan diterima', rp(h.akhirKontrak)) +
        bar('Uang pertanggungan', rp(h.up)) +
        bar('Premi per tahun', rp(h.premiPerTahun) + ' selama ' + bayar + ' tahun') +
        bar('Total yang dibayar', rp(h.totalDibayar)) +
        '</tbody></table>' +
        '<div class="akt-aksi">' +
        '<button class="akt-tbl profil" type="button" data-solusi-buka="' + p[0] +
        '" data-solusi-up="' + h.up + '" data-solusi-bayar="' + bayar +
        '" data-solusi-lindung="' + masa + '">Hitung di ' + esc(p[1]) + '</button></div>' +
        '</div>';
    });

    return '<div class="blok">' +
      '<h2>B. Menyiapkan dananya sendiri</h2>' +
      '<p class="catatan">Menyisihkan dana secara rutin, dan pada tahun ke-' + masa +
      ' dana kembali sebesar ' + persen + '% dari total yang dibayarkan. ' +
      'Kalau pencari nafkah meninggal di tengah jalan, dananya tetap diterima ' +
      'tanpa perlu melanjutkan pembayaran.</p>' +
      kartu +
      '<p class="catatan">Besar premi di atas dihitung mundur dari kebutuhan ' + rp(butuh) +
      ', bukan angka penawaran. Angkanya bisa diubah di kalkulator produk. ' +
      'Produk ini wadah menyisihkan dana yang terlindungi, bukan sarana investasi — ' +
      'kenaikan biaya pendidikan bisa lebih cepat daripada pertumbuhan dananya, ' +
      'jadi perhitungannya sebaiknya ditinjau ulang setiap beberapa tahun.</p>' +
      '</div>';
  }

  function bar(k, v) {
    return '<tr><td style="color:#5B6573">' + k + '</td><td><b>' + v + '</b></td></tr>';
  }

  /* ---------- Tombol solusi di kalkulator pendidikan ---------- */

  function pasangTombolSolusi(hasil) {
    const wadah = el('nTombolSolusi');
    if (!wadah) return;
    const aktif = (hasil && hasil.aktif) ? hasil.aktif : [];
    if (!aktif.length) { wadah.innerHTML = ''; return; }

    wadah.innerHTML = '<h3>Bahas solusinya</h3>' +
      '<p class="catatan">Pilih anak yang ingin dibahas. Setiap anak punya sisa waktu ' +
      'berbeda, jadi solusinya juga berbeda.</p>' +
      '<div class="akt-aksi">' +
      aktif.map(function (a, i) {
        return '<button class="akt-tbl profil" type="button" data-solusi-anak="' + i + '">' +
          'Solusi — ' + esc(a.nama || ('Anak ' + (i + 1))) + '</button>';
      }).join('') + '</div>';
    wadah.__anak = aktif;
  }

  window.pdkPasangSolusi = pasangTombolSolusi;

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const btnAnak = t.closest('[data-solusi-anak]');
      if (btnAnak) {
        const wadah = el('nTombolSolusi');
        const daftar = wadah && wadah.__anak ? wadah.__anak : [];
        anakAktif = daftar[+btnAnak.dataset.solusiAnak] || null;
        ambilTglLahirProfil();
        gambar();
        window.bukaLayar('SOLUSI_PDK');
        return;
      }

      const buka = t.closest('[data-solusi-buka]');
      if (buka) {
        bukaProduk(buka.dataset.solusiBuka, +buka.dataset.solusiUp,
          buka.dataset.solusiBayar ? +buka.dataset.solusiBayar : null,
          buka.dataset.solusiLindung ? +buka.dataset.solusiLindung : null);
        return;
      }
    });
  }

  function jkProfil() {
    try {
      const aktif = localStorage.getItem('insuranceHub.customerProfile.active.v1');
      const daftar = JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1') || '[]');
      const p = daftar.find(x => x.id === aktif);
      if (p && p.jk) return String(p.jk).toUpperCase().indexOf('W') === 0 ? 'WANITA' : 'PRIA';
    } catch (_) {}
    return 'PRIA';
  }

  function ambilTglLahirProfil() {
    try {
      const aktif = localStorage.getItem('insuranceHub.customerProfile.active.v1');
      const daftar = JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1') || '[]');
      const p = daftar.find(x => x.id === aktif);
      if (p && p.tglLahir) tglLahirOrtu = p.tglLahir;
    } catch (_) {}
  }

  /* Membuka kalkulator produk yang sudah ada, dengan isian awal terisi.
     Rumusnya tetap milik kalkulator itu — di sini hanya mengisi kolom. */
  function bukaProduk(layar, up, bayar, lindung) {
    const isi = (id, nilai) => { const n = el(id); if (n && nilai !== null && nilai !== undefined) n.value = nilai; };
    const angka = (n) => Number(n || 0).toLocaleString('id-ID');
    const nama = anakAktif ? ('Untuk pendidikan ' + (anakAktif.nama || 'anak')) : '';

    if (layar === 'CRIS') {
      isi('cUP', angka(up));
      if (bayar) isi('cBayar', String(bayar));
      if (lindung) isi('cLindung', String(lindung));
      if (tglLahirOrtu) isi('cTgl', tglLahirOrtu);
    } else if (layar === 'CEM') {
      isi('mUP', angka(up));
      if (bayar) isi('mBayar', String(bayar));
      if (lindung) isi('mLindung', String(lindung));
      if (tglLahirOrtu) isi('mTgl', tglLahirOrtu);
    } else if (layar === 'RIZQIA') {
      isi('rzUp', angka(Math.min(up, 1000000000)));
      if (tglLahirOrtu) isi('rzTgl', tglLahirOrtu);
    } else if (layar === 'FLEX') {
      isi('xUP', angka(up));
      if (tglLahirOrtu) isi('xTgl', tglLahirOrtu);
    }

    const catatan = el('catatanAsalSolusi');
    if (catatan && nama) catatan.textContent = nama;
    window.bukaLayar(layar === 'RIZQIA' ? 'RIZQIA' : layar);
  }

  /* ---------- Mulai ---------- */

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    pasang();
  }

  window.InsuranceHubSolusiPdk = { masaYangCocok, lamaBayarCocok, upUntukDanaKembali, PENGEMBALIAN };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
