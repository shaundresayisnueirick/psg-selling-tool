/* PSG Selling Tools — Pesan Personal pada Identitas Konsultan.

   Satu kalimat personal (quote, prestasi, pesan) yang tampil tepat di bawah
   identitas konsultan: pada pratinjau kartu, Preview/Cetak dokumen, Ringkasan
   1 Halaman, dan potret identitas yang tersimpan bersama item Library.

   - Disimpan di server per akun Identity (src/psg-pribadi-api.js), bukan di
     localStorage. Di browser hanya ada di memori halaman.
   - Hanya untuk login email terverifikasi. Login kode akses lama melihat
     keterangan dan kolomnya nonaktif.
   - Tidak pernah ditempel pada identitas agen lain: selama mode "Dibuat untuk
     agen lain" aktif, untukIdentitasSendiri() mengembalikan teks kosong.
   - Mengikuti tombol "Simpan identitas dokumen" yang sudah ada. Bila server
     gagal, isian tetap di kolom dan tombol "Coba simpan lagi" muncul. */
(function () {
  'use strict';

  var MAKS = 280;
  var el = function (id) { return document.getElementById(id); };

  /* Keadaan di memori. pemilik = email sesi yang datanya sedang dipegang;
     berganti akun membuang semuanya sebelum memuat yang baru. */
  var st = { status: 'menunggu', pemilik: '', teks: '', penyimpanan: '', alasan: '', kode: '', urutan: 0 };
  var aksiUlang = '';

  function api() { return window.PSGPribadi; }
  function halamanIdentitas() { return !!el('layarKartuKonsultan'); }

  function atasNamaAktif() {
    try {
      var an = window.InsuranceHubAtasNama;
      if (an && typeof an.aktif === 'function') return !!an.aktif();
      /* Halaman ringkasan: mode atas nama milik akun yang sedang masuk. */
      var d = window.InsuranceHubDataAkun;
      var v = (d ? d.baca('atasNama') : JSON.parse(localStorage.getItem('insuranceHub.konsultan.atasNama.v1') || '{}')) || {};
      return !!(v.aktif && v.nama);
    } catch (_) { return false; }
  }

  function teksSiap() { return st.status === 'siap' ? st.teks : ''; }

  /* ---------- Memuat ---------- */

  /* Halaman ringkasan terpisah tidak memuat identity-login.js. Sesi Identity
     dikenali dari cookie nf_jwt yang ditulis src/vendor/netlify-identity.js
     saat login; tanpa cookie itu (login kode akses lama) server tidak
     dipanggil sama sekali. */
  function adaSesiIdentity() {
    try { return /(?:^|;\s*)nf_jwt=/.test(document.cookie || ''); } catch (_) { return false; }
  }

  function emailSesi() {
    var id = window.InsuranceHubIdentity;
    return id && id.source === 'server:/api/psg/me' ? String(id.email || '').toLowerCase() : '';
  }

  function kosongkan(status) {
    st.status = status; st.pemilik = ''; st.teks = ''; st.penyimpanan = ''; st.alasan = ''; st.kode = '';
    st.urutan++;
  }

  function muat() {
    var p = api();
    if (!p) { kosongkan('gagal'); gambar(); return; }
    var email = emailSesi();
    if (halamanIdentitas() ? !email : !adaSesiIdentity()) { kosongkan('tidak-tersedia'); status(''); gambar(); return; }
    kosongkan('memuat');
    st.pemilik = email;
    var nomor = st.urutan;
    gambar();
    p.ambil().then(function (d) {
      if (nomor !== st.urutan) return;              // sesi sudah berganti
      st.status = 'siap';
      st.teks = d.pesan && typeof d.pesan.teks === 'string' ? d.pesan.teks : '';
      st.penyimpanan = d.penyimpanan || '';
      isiKolom();
      gambar();
    }).catch(function (e) {
      if (nomor !== st.urutan) return;
      /* Server menolak (401/403) = fitur tidak tersedia untuk sesi ini, dengan
         alasan dari server; selain itu (503, jaringan) = gagal sementara. Di
         kedua keadaan kolom tetap nonaktif dan tombol muat ulang tersedia. */
      st.status = (e && (e.status === 401 || e.status === 403)) ? 'tidak-tersedia' : 'gagal';
      st.teks = '';
      st.kode = (e && e.kode) || '';
      st.alasan = (e && e.message) || '';
      status('', 'muat');
      gambar();
    });
  }

  function sesiBerubah() {
    var email = emailSesi();
    if (email && email === st.pemilik && st.status !== 'gagal') return;
    muat();
  }

  /* ---------- Formulir ---------- */

  function status(teks, ulang) {
    var s = el('kkPesanStatus'); if (s) s.textContent = teks || '';
    aksiUlang = ulang || '';
    var b = el('kkPesanUlang');
    if (b) {
      b.hidden = !aksiUlang;
      b.textContent = aksiUlang === 'muat' ? 'Muat ulang pesan' : 'Coba simpan lagi';
    }
  }

  function hitung() {
    var t = el('kkPesan'), h = el('kkPesanHitung');
    if (!t || !h) return;
    var n = t.value.length;
    h.textContent = n + '/' + MAKS;
    h.classList.toggle('kk-pesan-hampir', n > MAKS - 20);
  }

  function isiKolom() {
    var t = el('kkPesan'); if (!t) return;
    t.value = st.teks;
    hitung();
  }

  function aturKolom() {
    var t = el('kkPesan'), info = el('kkPesanInfo');
    if (!t) return;
    var an = atasNamaAktif();
    var bisa = st.status === 'siap' && !an;
    t.disabled = !bisa;
    if (!info) return;
    var kode = st.kode ? ' (kode: ' + st.kode + ')' : '';
    if (st.status === 'tidak-tersedia' && st.alasan) info.textContent = 'Pesan personal tidak tersedia untuk sesi ini: ' + st.alasan + kode;
    else if (st.status === 'tidak-tersedia') info.textContent = 'Pesan personal hanya tersedia untuk login email terverifikasi. Masuk dengan email untuk memakainya.';
    else if (st.status === 'memuat' || st.status === 'menunggu') info.textContent = 'Memuat pesan personal…';
    else if (st.status === 'gagal') info.textContent = 'Pesan personal belum bisa dimuat: ' + (st.alasan || 'koneksi internet diperlukan.') + kode;
    else if (an) info.textContent = 'Mode "Dibuat untuk agen lain" aktif: pesan personalmu tidak ditampilkan dan tidak bisa diubah.';
    else info.textContent = 'Tampil di bawah identitasmu dan ikut tercetak pada dokumen nasabah. Boleh dikosongkan.';
  }

  function simpan() {
    var t = el('kkPesan'), p = api();
    if (!t || !p) return;
    if (atasNamaAktif()) { status('Pesan personal tidak disimpan selama mode "Dibuat untuk agen lain" aktif.'); return; }
    if (st.status !== 'siap') return;
    var teks = t.value;
    if (teks.length > MAKS) { status('Pesan personal maksimal ' + MAKS + ' karakter.'); return; }
    if (teks.trim() === st.teks) { status(''); return; }
    var nomor = st.urutan;
    status('Menyimpan pesan personal…');
    t.disabled = true;
    p.simpanPesan(teks).then(function (d) {
      if (nomor !== st.urutan) return;
      st.teks = d.pesan && typeof d.pesan.teks === 'string' ? d.pesan.teks : '';
      isiKolom();
      status(st.teks ? 'Pesan personal tersimpan di akunmu.' : 'Pesan personal dikosongkan.');
      gambar();
    }).catch(function (e) {
      if (nomor !== st.urutan) return;
      /* Isian tidak dibuang: agen bisa langsung menekan "Coba simpan lagi". */
      status('Pesan personal belum tersimpan. ' + ((e && e.message) || ''), 'simpan');
      gambar();
    });
  }

  /* ---------- Pratinjau di bawah kartu konsultan ---------- */

  function gambar() {
    aturKolom();
    var box = el('kkPesanPratinjau');
    if (!box) return;
    var teks = atasNamaAktif() ? '' : teksSiap();
    box.textContent = '';
    if (!teks) { box.hidden = true; return; }
    var q = document.createElement('blockquote');
    q.className = 'kk-pesan-kutipan';
    q.textContent = teks;
    box.appendChild(q);
    box.hidden = false;
  }

  function pasang() {
    var t = el('kkPesan');
    if (t) {
      t.setAttribute('maxlength', String(MAKS));
      t.addEventListener('input', function () { hitung(); if (aksiUlang === 'simpan') status(''); });
    }
    var s = el('kkSimpan');
    if (s) s.addEventListener('click', simpan);
    var u = el('kkPesanUlang');
    if (u) u.addEventListener('click', function () { if (aksiUlang === 'muat') { status(''); muat(); } else simpan(); });
    window.addEventListener('insurancehub:consultant-refresh', gambar);
    /* Tombol "Kembali ke nama saya" di spanduk dan segmen mode atas nama
       memicu consultant-refresh; klik pada blok atas nama juga dipantau
       supaya pratinjau langsung menyesuaikan. */
    var blok = el('kkAtasNamaBlok');
    if (blok) blok.addEventListener('click', function () { setTimeout(gambar, 0); });
    /* "Pulihkan identitas saya" mematikan mode atas nama tanpa event. */
    var reset = el('kkReset');
    if (reset) reset.addEventListener('click', function () { setTimeout(gambar, 0); });
    window.addEventListener('psg:identity-ready', sesiBerubah);
    window.addEventListener('online', function () { if (st.status === 'gagal') muat(); });
    hitung();
    /* Sesi Identity dipulihkan di balik layar masuk lalu memicu
       psg:identity-ready; sampai itu terjadi (atau bila login memakai kode
       akses lama) fitur ini belum tersedia. */
    muat();
  }

  window.InsuranceHubPesanPersonal = {
    MAKS: MAKS,
    /* Teks pesan milik akun yang sedang masuk (kosong bila belum dimuat). */
    teks: teksSiap,
    /* Teks yang boleh ditempel pada identitas yang tercetak: kosong selama
       dokumen dibuat atas nama agen lain. */
    untukIdentitasSendiri: function () { return atasNamaAktif() ? '' : teksSiap(); },
    status: function () { return st.status; },
    penyimpanan: function () { return st.penyimpanan; },
    muatUlang: muat
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang, { once: true });
  else pasang();
})();
