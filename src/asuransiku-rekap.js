/* PSG Selling Tools — Rekap Total Perlindungan Asuransiku (perhitungan murni).

   Dihitung di browser dari polis milik akun yang sedang masuk (yang sudah
   dimuat src/asuransiku.js dari /api/psg/pribadi). Tidak ada penyimpanan,
   tidak ada panggilan server, dan catatan pribadi tidak pernah dibaca.

   Aturan:
   - Hanya manfaat sejenis dengan mata uang sama yang dijumlahkan. IDR dan USD
     terpisah, tanpa konversi.
   - Nilai kosong bukan nol. Bila sebagian manfaat sejenis tidak mencantumkan
     nilai, kelompoknya ditandai belum lengkap dan angkanya hanya subtotal
     dari nilai yang tercatat.
   - Setiap perlindungan (dasar atau rider) dihitung tepat satu kali, sebagai
     bagian dari polis induknya.
   - Penyakit kritis dipisah menurut sifat manfaat: berdiri sendiri,
     dipercepat (dapat mengurangi UP jiwa), dan belum diketahui (tanpa total).
   - Kecelakaan direkap per kategori (meninggal, cacat tetap, biaya medis),
     tidak pernah dijumlahkan antarkategori.
   - Kesehatan dan manfaat lainnya hanya dirinci per sumber; limit tidak
     dijumlahkan karena syarat klaim antarpolis berbeda.

   Dipakai di browser sebagai window.PSGAsuransikuRekap dan di tes Node
   lewat module.exports. */
(function (root, buat) {
  'use strict';
  var api = buat();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PSGAsuransikuRekap = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var URUT_MU = ['IDR', 'USD'];

  function adaNilai(v) { return typeof v === 'number' && isFinite(v) && v >= 0; }
  function bulat(v) { return Math.round(v * 100) / 100; }
  function mataUang(p) { return p && p.mataUang === 'USD' ? 'USD' : 'IDR'; }
  function urutMu(a, b) { return URUT_MU.indexOf(a) - URUT_MU.indexOf(b); }

  /* Identitas sumber yang aman ditampilkan: tanpa catatan pribadi dan tanpa
     nomor polis. */
  function sumber(p, x) {
    return {
      polisId: String(p.id || ''),
      perusahaan: String(p.perusahaan || ''),
      produk: String(p.produk || ''),
      jenisPolis: p.jenisPolis || '',
      peran: x.peran === 'RIDER' ? 'RIDER' : 'DASAR',
      namaRider: x.peran === 'RIDER' ? String(x.nama || '') : '',
      mataUang: mataUang(p)
    };
  }

  /* Kelompok nilai per mata uang. entri: [{ sumber, nilai, catatan }]. */
  function kelompokNilai(entri) {
    var per = {};
    entri.forEach(function (e) {
      var mu = e.sumber.mataUang;
      var g = per[mu] || (per[mu] = { mataUang: mu, total: 0, tercatat: 0, tanpaNilai: 0, polis: {}, sumber: [] });
      g.sumber.push(e);
      g.polis[e.sumber.polisId] = 1;
      if (adaNilai(e.nilai)) { g.total += e.nilai; g.tercatat++; } else g.tanpaNilai++;
    });
    return Object.keys(per).sort(urutMu).map(function (mu) {
      var g = per[mu];
      return {
        mataUang: mu,
        total: g.tercatat ? bulat(g.total) : null,
        tercatat: g.tercatat,
        tanpaNilai: g.tanpaNilai,
        jumlahManfaat: g.sumber.length,
        jumlahPolis: Object.keys(g.polis).length,
        lengkap: g.tanpaNilai === 0 && g.tercatat > 0,
        sumber: g.sumber
      };
    });
  }

  var SIFAT_PK = ['BERDIRI_SENDIRI', 'DIPERCEPAT', 'TIDAK_DIKETAHUI'];
  var KATEGORI_KECELAKAAN = ['upMeninggal', 'cacatTetap', 'biayaMedis'];
  var SISTEM_KESEHATAN = ['TAHUNAN', 'PER_KEJADIAN', 'HARIAN', 'LAINNYA'];

  function hitung(daftarPolis) {
    var polis = Array.isArray(daftarPolis) ? daftarPolis : [];
    var jiwa = [], pk = {}, kecelakaan = {}, kecelakaanTanpaNilai = [], kesehatan = {}, lainnya = [];
    SIFAT_PK.forEach(function (s) { pk[s] = []; });
    KATEGORI_KECELAKAAN.forEach(function (k) { kecelakaan[k] = []; });
    SISTEM_KESEHATAN.forEach(function (s) { kesehatan[s] = []; });
    var jumlahManfaat = 0, mataUangDipakai = {};

    polis.forEach(function (p) {
      if (!p || !Array.isArray(p.perlindungan)) return;
      p.perlindungan.forEach(function (x) {
        if (!x || typeof x !== 'object') return;
        jumlahManfaat++;
        var m = x.manfaat || {}, s = sumber(p, x);
        mataUangDipakai[s.mataUang] = 1;
        if (x.jenis === 'JIWA') {
          jiwa.push({ sumber: s, nilai: m.up, catatan: m.catatan || '' });
        } else if (x.jenis === 'PK') {
          var sifat = m.sifat === 'BERDIRI_SENDIRI' || m.sifat === 'DIPERCEPAT' ? m.sifat : 'TIDAK_DIKETAHUI';
          pk[sifat].push({ sumber: s, nilai: m.up, catatan: m.catatan || '' });
        } else if (x.jenis === 'KECELAKAAN') {
          var ada = false;
          KATEGORI_KECELAKAAN.forEach(function (k) {
            if (adaNilai(m[k])) { ada = true; kecelakaan[k].push({ sumber: s, nilai: m[k], catatan: m.catatan || '' }); }
          });
          if (!ada) kecelakaanTanpaNilai.push({ sumber: s, catatan: m.catatan || '' });
        } else if (x.jenis === 'KESEHATAN') {
          var sistem = SISTEM_KESEHATAN.indexOf(m.sistem) >= 0 ? m.sistem : 'LAINNYA';
          var item = { sumber: s, plan: m.plan || '', kamar: m.kamar || '', catatan: m.catatan || '' };
          if (sistem === 'TAHUNAN') {
            item.limitTahunan = adaNilai(m.limitTahunan) ? m.limitTahunan : null;
            item.limitBooster = adaNilai(m.limitBooster) ? m.limitBooster : null;
            item.syaratBooster = m.syaratBooster || '';
            item.syaratBoosterKosong = item.limitBooster !== null && !item.syaratBooster;
          } else if (sistem === 'PER_KEJADIAN') {
            item.limitPerKejadian = adaNilai(m.limitPerKejadian) ? m.limitPerKejadian : null;
            item.kamarPerHari = adaNilai(m.kamarPerHari) ? m.kamarPerHari : null;
          } else if (sistem === 'HARIAN') {
            item.santunanHarian = adaNilai(m.santunanHarian) ? m.santunanHarian : null;
            item.maksHari = adaNilai(m.maksHari) ? m.maksHari : null;
          }
          kesehatan[sistem].push(item);
        } else {
          lainnya.push({ sumber: s, namaJenis: m.namaJenis || '', manfaatUtama: m.manfaatUtama || '', nilai: adaNilai(m.nilai) ? m.nilai : null });
        }
      });
    });

    var hasil = {
      jumlahPolis: polis.length,
      jumlahManfaat: jumlahManfaat,
      mataUang: Object.keys(mataUangDipakai).sort(urutMu),
      jiwa: kelompokNilai(jiwa),
      pk: {},
      kecelakaan: { kategori: {}, tanpaNilai: kecelakaanTanpaNilai, ada: false },
      kesehatan: { sistem: kesehatan, ada: false },
      lainnya: lainnya
    };
    SIFAT_PK.forEach(function (sf) { hasil.pk[sf] = kelompokNilai(pk[sf]); });
    KATEGORI_KECELAKAAN.forEach(function (k) { hasil.kecelakaan.kategori[k] = kelompokNilai(kecelakaan[k]); });
    hasil.kecelakaan.ada = kecelakaanTanpaNilai.length > 0 || KATEGORI_KECELAKAAN.some(function (k) { return kecelakaan[k].length > 0; });
    hasil.kesehatan.ada = SISTEM_KESEHATAN.some(function (sx) { return kesehatan[sx].length > 0; });
    hasil.adaPk = SIFAT_PK.some(function (sf) { return pk[sf].length > 0; });
    hasil.adaDipercepat = pk.DIPERCEPAT.length > 0;
    hasil.adaSifatTidakDiketahui = pk.TIDAK_DIKETAHUI.length > 0;
    hasil.multiMataUang = hasil.mataUang.length > 1;

    /* Ringkasan kelengkapan: kelompok mana yang punya manfaat tanpa nilai. */
    var belum = [];
    hasil.jiwa.forEach(function (g) { if (g.tanpaNilai) belum.push('JIWA'); });
    SIFAT_PK.forEach(function (sf) { hasil.pk[sf].forEach(function (g) { if (g.tanpaNilai) belum.push('PK_' + sf); }); });
    if (kecelakaanTanpaNilai.length) belum.push('KECELAKAAN');
    hasil.kelompokBelumLengkap = belum.filter(function (v, i, a) { return a.indexOf(v) === i; });
    return hasil;
  }

  return { hitung: hitung, SIFAT_PK: SIFAT_PK, KATEGORI_KECELAKAAN: KATEGORI_KECELAKAAN, SISTEM_KESEHATAN: SISTEM_KESEHATAN };
});
