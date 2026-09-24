/* ============================================================
   Penyimpanan Isian Terakhir
   ------------------------------------------------------------
   Agen sering berpindah antar tools dalam satu percakapan:
   hitung Cristal, lalu lihat Gen Aman, lalu kembali lagi.
   Sebelumnya isian yang ditinggalkan hilang dan harus diketik
   ulang di depan prospek.

   Isian disimpan per LAYAR dan per PROFIL NASABAH. Pemisahan
   per profil itu penting: angka milik prospek A tidak boleh
   muncul saat agen membuka tools untuk prospek B. Begitu profil
   aktif berganti, isian yang dipulihkan ikut berganti.

   Yang TIDAK disimpan:
   - isian identitas nasabah, karena itu sudah datang dari
     Profil Nasabah dan menimpanya justru berbahaya
   - isian yang sedang kosong
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'insuranceHub.isianTerakhir.v1';
  const el = (id) => document.getElementById(id);

  /* Sama seperti pada alat form: identitas dikenali dari akhiran namanya,
     karena seluruh tools memakai pola penamaan yang sama. */
  const AKHIRAN_IDENTITAS = ['Nama', 'Tgl', 'JK', 'Jk', 'AgenNama', 'AgenHP'];

  function identitas(node) {
    const id = node.id || '';
    if (!id) return true;              // tanpa id tidak bisa dipulihkan
    return AKHIRAN_IDENTITAS.some(function (a) { return id.endsWith(a); });
  }

  function profilAktif() {
    try { return localStorage.getItem('insuranceHub.customerProfile.active.v1') || 'TANPA_PROFIL'; }
    catch (_) { return 'TANPA_PROFIL'; }
  }

  function baca() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }

  function tulis(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
  }

  function isianLayar(layar) {
    return Array.prototype.slice.call(
      layar.querySelectorAll('input, select, textarea')
    ).filter(function (n) {
      if (n.type === 'button' || n.type === 'submit' || n.type === 'file') return false;
      if (n.disabled || n.readOnly) return false;
      if (n.closest('.tanpa-simpan')) return false;
      return !identitas(n);
    });
  }

  function simpanLayar(layar) {
    if (!layar || !layar.id) return;
    const isi = {};
    isianLayar(layar).forEach(function (n) {
      isi[n.id] = (n.type === 'checkbox' || n.type === 'radio') ? n.checked : n.value;
    });
    if (!Object.keys(isi).length) return;
    const data = baca();
    const kunci = profilAktif();
    data[kunci] = data[kunci] || {};
    data[kunci][layar.id] = isi;
    tulis(data);
  }

  function pulihkanLayar(layar) {
    if (!layar || !layar.id) return;
    const data = baca();
    const isi = (data[profilAktif()] || {})[layar.id];
    if (!isi) return;
    let adaYangDipulihkan = false;
    isianLayar(layar).forEach(function (n) {
      if (!(n.id in isi)) return;
      const nilai = isi[n.id];
      if (n.type === 'checkbox' || n.type === 'radio') {
        if (n.checked !== nilai) { n.checked = nilai; adaYangDipulihkan = true; }
        return;
      }
      /* Isian yang sudah terisi tidak ditimpa. Nilai bawaan hasil
         rekomendasi lebih baru daripada apa yang tersimpan, dan menimpanya
         akan membatalkan perhitungan yang baru saja dibuat. */
      if (n.value) return;
      if (nilai) { n.value = nilai; adaYangDipulihkan = true; }
    });
    if (!adaYangDipulihkan) return;
    isianLayar(layar).forEach(function (n) {
      try {
        n.dispatchEvent(new Event('input', { bubbles: true }));
        n.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (_) {}
    });
  }

  function layarAktif() { return document.querySelector('.layar.aktif'); }

  let layarSebelumnya = null;

  function segarkan() {
    const layar = layarAktif();
    if (!layar || layar === layarSebelumnya) return;
    // Simpan layar yang ditinggalkan, lalu pulihkan yang baru dibuka.
    if (layarSebelumnya) { try { simpanLayar(layarSebelumnya); } catch (_) {} }
    layarSebelumnya = layar;
    setTimeout(function () { try { pulihkanLayar(layar); } catch (_) {} }, 220);
  }

  function mulai() {
    segarkan();

    // Isian yang diubah disimpan sesaat setelah agen berhenti mengetik.
    let jeda = null;
    document.addEventListener('input', function (e) {
      const t = e.target;
      if (!(t instanceof Element) || !t.id) return;
      clearTimeout(jeda);
      jeda = setTimeout(function () {
        const layar = layarAktif();
        if (layar) { try { simpanLayar(layar); } catch (_) {} }
      }, 600);
    });

    if (typeof MutationObserver === 'function') {
      let sibuk = false;
      const pengamat = new MutationObserver(function () {
        if (sibuk) return;
        sibuk = true;
        setTimeout(function () {
          try { segarkan(); } catch (_) {}
          pengamat.takeRecords();
          sibuk = false;
        }, 120);
      });
      const induk = document.querySelector('main') || document.body;
      if (induk) pengamat.observe(induk, { attributes: true, subtree: true,
        attributeFilter: ['class'] });
    }

    // Sebelum halaman ditutup, isian layar aktif ikut disimpan.
    window.addEventListener('beforeunload', function () {
      const layar = layarAktif();
      if (layar) { try { simpanLayar(layar); } catch (_) {} }
    });
  }

  window.InsuranceHubIsianTerakhir = { simpanLayar, pulihkanLayar, profilAktif };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 500);
  }
})();
