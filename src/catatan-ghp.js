/* ============================================================
   Catatan Premi Rider Kesehatan
   ------------------------------------------------------------
   Premi rider GHP dan GHPS dibayar selama masa pertanggungan
   rider, bukan hanya selama masa bayar produk dasar, dan
   besarnya menyesuaikan usia tiap tahun. Karena itu:

   1. Setiap angka premi pada ilustrasi yang mengambil rider
      diberi tanda bintang, dengan keterangan bahwa premi
      asuransi kesehatan GHP tidak mengikat.

   2. Total premi keseluruhan tidak ditampilkan ketika rider
      diambil, karena menjumlahkan premi yang berhenti setelah
      masa bayar dengan premi yang dibayar terus menghasilkan
      angka yang menyesatkan.

   Modul ini bekerja dari tampilan yang sudah tergambar, jadi
   satu berkas ini berlaku untuk Gen Pro, Gen Aman, dan
   BeSMART Lite sekaligus.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);

  const CATATAN = 'Premi untuk asuransi kesehatan GHP tidak mengikat. ' +
    'Premi rider dibayar selama masa pertanggungan rider dan menyesuaikan ' +
    'usia tertanggung tiap tahun, sehingga tidak berhenti bersama masa bayar ' +
    'produk dasar. Karena itu total premi keseluruhan tidak ditampilkan.';

  /* Layar mana memakai rider apa. Kunci: id layar, nilai: id segmen ridernya. */
  const LAYAR_RIDER = {
    layarGHP: 'hRider',
    layarGHPIlus: 'hRider',
    layarGSPA: 'gRider',
    layarGSPATime: 'gRider',
    layarBSL: 'bRider',
    layarBSLTime: 'bRider'
  };

  function seg(id) {
    return (typeof nilaiSegmen === 'function') ? nilaiSegmen(id) : '';
  }

  function riderAktifDi(idLayar) {
    const segmen = LAYAR_RIDER[idLayar];
    if (!segmen) return false;
    return seg(segmen) === 'Ya';
  }

  function layarTampil() {
    return Object.keys(LAYAR_RIDER)
      .map(el)
      .filter(function (n) { return n && n.classList.contains('aktif'); });
  }

  /* Menandai angka premi dengan bintang, satu kali saja per elemen. */
  function tandaiPremi(layar) {
    layar.querySelectorAll('.kartu .k, .sorotan .k, td, th').forEach(function (n) {
      if (n.dataset.bintangSiap) return;
      const teks = n.textContent.trim().toLowerCase();
      const premi = teks.indexOf('premi') === 0 || teks.indexOf('total premi') === 0
        || teks.indexOf('yang dibayar') === 0 || teks.indexOf('kontribusi') === 0;
      if (!premi) return;
      n.dataset.bintangSiap = '1';
      const b = document.createElement('sup');
      b.className = 'bintang-ghp';
      b.textContent = '*';
      n.appendChild(b);
    });
  }

  function pasangCatatan(layar) {
    let p = layar.querySelector('.catatan-ghp');
    if (!p) {
      p = document.createElement('p');
      p.className = 'catatan catatan-ghp';
      const blok = layar.querySelector('.blok') || layar;
      blok.appendChild(p);
    }
    const isi = '<b>*</b> ' + CATATAN;
    if (p.innerHTML !== isi) p.innerHTML = isi;
    if (p.hidden) p.hidden = false;
  }

  function lepasCatatan(layar) {
    const p = layar.querySelector('.catatan-ghp');
    if (p && !p.hidden) p.hidden = true;
    layar.querySelectorAll('.bintang-ghp').forEach(function (b) {
      const induk = b.parentNode;
      b.remove();
      if (induk) delete induk.dataset.bintangSiap;
    });
  }

  function segarkan() {
    layarTampil().forEach(function (layar) {
      if (riderAktifDi(layar.id)) {
        tandaiPremi(layar);
        pasangCatatan(layar);
      } else {
        lepasCatatan(layar);
      }
    });
  }

  function mulai() {
    segarkan();

    // Isi layar digambar ulang setiap kali isian berubah, jadi dipantau.
    if (typeof MutationObserver === 'function' && !document.__pengamatCatatanGhp) {
      document.__pengamatCatatanGhp = true;
      let sedangMenata = false;
      const pengamat = new MutationObserver(function () {
        if (sedangMenata) return;
        clearTimeout(mulai.__jeda);
        mulai.__jeda = setTimeout(function () {
          sedangMenata = true;
          try { segarkan(); } catch (_) {}
          // Perubahan buatan modul ini sendiri dibuang dari antrean.
          pengamat.takeRecords();
          sedangMenata = false;
        }, 120);
      });
      Object.keys(LAYAR_RIDER).forEach(function (id) {
        const n = el(id);
        if (n) pengamat.observe(n, { childList: true, subtree: true });
      });
    }

    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#hRider, #gRider, #bRider')) setTimeout(segarkan, 80);
    });
  }

  window.InsuranceHubCatatanGhp = { segarkan, CATATAN };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 150);
  }
})();
