/* Daftar penyakit khusus dengan masa tunggu 12 bulan untuk rider GHP / GHPS.

   Sumber: kutipan Ketentuan Polis Asuransi Tambahan (butir 3, huruf a-t) yang
   diunggah user. Satu sumber dipakai di empat tempat supaya isinya tidak
   pernah berbeda:
     1. Ringkasan Program Segitiga Financial (bila komponen Health/GHP diambil)
     2. Ringkasan Gen Aman + waiver + GHPS (bila GHPS diambil)
     3. Ringkasan BeSMART Lite 100 + Lite UP + GHP (bila GHP diambil)
     4. Ringkasan Gen Pro + rider GHP (bila rider GHP diambil)

   Modul ini hanya MENGHASILKAN teks HTML. Ia tidak mengubah hitungan,
   premi, maupun tampilan lain. Pemanggil yang memutuskan kapan ditampilkan
   (hanya saat rider GHP/GHPS aktif). */
(function () {
  'use strict';

  const DAFTAR = [
    'Setiap jenis hernia',
    'Penyakit-penyakit pada sistem reproduksi termasuk endometriosis, uterine fibroid/myoma, histerektomi, varikokel, hidrokel',
    'Segala jenis benjolan/kista, segala jenis tumor jinak maupun ganas pada organ manapun termasuk Kanker',
    'TBC (tuberkulosis) dan asma, termasuk namun tidak terbatas pada Penyakit Paru Obstruktif Kronis (PPOK)',
    'Anal fistula dan haemorrhoid',
    'Kencing manis, radang empedu (Kolesistitis), batu empedu, semua jenis hepatitis termasuk didalamnya sirosis hepatis kecuali hepatitis A',
    'Amandel dan semua Penyakit pada tonsil, dan/atau Penyakit adenoid, yang dapat dilakukan Tindakan Bedah',
    'Batu pada saluran kemih (ginjal, ureter, urethra, bladder/kandung kemih) juga turbinatum kandung kemih termasuk didalamnya gagal ginjal',
    'Semua jenis kelainan telinga, kelainan hidung, kondisi abnormal rongga hidung, sekat hidung/kerang hidung termasuk sinus, septum atau turbinatum',
    'Radang atau tukak pada lambung (gastritis, dispepsia, ulcus pepticum) atau tukak usus dua belas jari',
    'Katarak, pterygium, ablasio retina',
    'Haluks valgus',
    'Semua jenis epilepsi (grand mal atau petit mal)',
    'Gangguan pada tulang belakang termasuk low back pain, prolaps cakram antar ruas tulang belakang (HNP, disc prolaps)',
    'Semua jenis kelainan di daerah lutut, termasuk tulang, sendi, otot dan ligamennya',
    'Hipertensi, Penyakit jantung dan pembuluh darah, Penyakit pembuluh darah otak/Cerebrovascular disease, termasuk TIA, stroke, sakit kepala/cephalgia, migrain, vertigo',
    'Kelainan darah (anemia, lupus, leukemia, dan lain lain)',
    'Kelainan kelenjar thyroid',
    'Varises vena dan ulkus varises',
    'Biaya Perawatan yang disebabkan baik langsung maupun tidak langsung oleh semua jenis virus HIV (human immunodeficiency virus) dan/atau yang berhubungan dengan Penyakit tersebut, termasuk AIDS (acquired immune deficiency syndrome) dan/atau mutasinya, turunannya atau variasi dari virus tersebut, yang disebabkan oleh transfusi darah atau karena Kecelakaan dalam bekerja dan dipertanggungkan dalam Asuransi Tambahan ini'
  ];

  const HURUF = 'abcdefghijklmnopqrst';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* opsi.judul: false untuk menyembunyikan judul (bila tempatnya sudah
     punya judul sendiri). Tidak memakai <b>/<span> karena di halaman
     ringkasan program keduanya diberi gaya besar oleh .program-benefit-line. */
  function html(opsi) {
    opsi = opsi || {};
    const judul = opsi.judul === false ? '' :
      '<div class="tunggu12-judul">Daftar penyakit khusus dengan masa tunggu 12 bulan (rider GHP/GHPS)</div>';
    return '<div class="tunggu12">' + judul +
      '<p class="tunggu12-pengantar">Penyakit khusus berikut, apa pun penyebabnya, beserta segala ' +
      'komplikasi dan perawatan yang diperlukan, <strong>tidak ditanggung bila diderita dalam 12 bulan ' +
      'pertama</strong> sejak Tanggal Berlaku Pertanggungan Asuransi Tambahan, Tanggal Pemulihan Polis, ' +
      'atau tanggal disetujuinya perubahan Manfaat Asuransi atas Asuransi Tambahan (mana yang paling ' +
      'akhir terjadi):</p>' +
      '<ol class="tunggu12-daftar">' +
      DAFTAR.map(function (t, i) {
        return '<li><em class="tunggu12-huruf">' + HURUF[i] + '.</em>' + esc(t) + '</li>';
      }).join('') +
      '</ol>' +
      '<p class="tunggu12-kaki">Ringkasan ini merujuk Ketentuan Polis Asuransi Tambahan. ' +
      'Rumusan yang mengikat adalah Ketentuan Polis resmi PT Asuransi Jiwa Generali Indonesia.</p>' +
      '</div>';
  }

  window.InsuranceHubTunggu12 = { DAFTAR: DAFTAR.slice(), html: html };
})();
