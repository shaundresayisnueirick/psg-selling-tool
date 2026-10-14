/* PSG Selling Tools — klien API data pribadi agen (/api/psg/pribadi).

   Data pribadi (pesan personal, Asuransiku) hanya disimpan di server, per
   akun Identity yang diverifikasi server. Modul ini tidak menulis apa pun ke
   localStorage/sessionStorage; hasilnya hanya dipegang di memori halaman.

   Sesi dikirim lewat cookie Identity (credentials: same-origin), sama seperti
   /api/psg/me. Header X-PSG-Request wajib untuk setiap permintaan. */
(function () {
  'use strict';

  var BASE = '/api/psg/pribadi';

  function GalatPribadi(status, kode, pesan) {
    this.status = status;
    this.kode = kode;
    this.message = pesan;
  }
  GalatPribadi.prototype = Object.create(Error.prototype);

  /* Pesan yang bisa dibaca agen untuk setiap kegagalan. */
  function pesanGagal(status, kode, pesanServer) {
    if (status === 0) return 'Koneksi internet diperlukan. Periksa koneksi lalu coba lagi.';
    if (status === 401) return 'Sesi login berakhir. Masuk lagi dengan email untuk melanjutkan.';
    if (kode === 'email_unverified') return 'Email akun belum terkonfirmasi.';
    if (kode === 'account_inactive') return 'Akun PSG kamu berstatus nonaktif.';
    if (kode === 'psg_access_missing') return 'Akun belum mendapat hak akses PSG.';
    if (status === 400 || status === 413) return pesanServer || 'Data tidak valid.';
    return 'Server belum bisa menyimpan atau membaca data. Coba lagi sebentar lagi.';
  }

  async function minta(metode, jalur, isi) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new GalatPribadi(0, 'offline', pesanGagal(0));
    }
    var opsi = {
      method: metode,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Accept': 'application/json', 'X-PSG-Request': '1' }
    };
    if (isi !== undefined) {
      opsi.headers['Content-Type'] = 'application/json';
      opsi.body = JSON.stringify(isi);
    }
    var r;
    try { r = await fetch(BASE + jalur, opsi); }
    catch (_) { throw new GalatPribadi(0, 'network', pesanGagal(0)); }
    var data = {};
    try { data = await r.json(); } catch (_) { data = {}; }
    if (!r.ok || !data || data.ok !== true) {
      var kode = (data && data.error) || 'http_' + r.status;
      throw new GalatPribadi(r.status, kode, pesanGagal(r.status, kode, data && data.message));
    }
    return data;
  }

  /* Fitur pribadi hanya untuk sesi Identity yang profilnya dari server.
     Login kode akses lama tidak memenuhi syarat ini. Halaman tanpa
     identity-login.js (ringkasan terpisah) tidak bisa memeriksanya di
     browser; di sana server yang memutuskan lewat 401/403. */
  function sesiEmail() {
    var id = window.InsuranceHubIdentity;
    return !!(id && id.source === 'server:/api/psg/me' && id.email);
  }

  window.PSGPribadi = {
    sesiEmail: sesiEmail,
    ambil: function () { return minta('GET', ''); },
    simpanPesan: function (teks) { return minta('PUT', '/pesan', { teks: String(teks == null ? '' : teks) }); },
    /* Asuransiku: satu polis per permintaan; ID polis berupa UUID. */
    simpanPolis: function (id, polis) { return minta('PUT', '/polis/' + encodeURIComponent(id), polis); },
    hapusPolis: function (id) { return minta('DELETE', '/polis/' + encodeURIComponent(id)); },
    minta: minta,
    pesanGagal: pesanGagal
  };
})();
