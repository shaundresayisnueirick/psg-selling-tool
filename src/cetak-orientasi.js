/* ============================================================
   Orientasi kertas untuk dokumen cetak yang lebar.
   ------------------------------------------------------------
   app.js menandai body.print-wide saat beforeprint bila halaman
   memuat tabel lebar, dan styles.css memberi body itu named page
   lanskap (@page pwa-wide). Named page mengatur ukuran tiap halaman,
   tetapi orientasi JOB cetak (Layout Portrait/Landscape di dialog)
   ditentukan dari @page bawaan dokumen — yang di sini size:auto.
   Pada printer sistem seperti "Microsoft Print to PDF" job tetap
   potret, lalu setiap halaman lanskap diputar 90° agar muat.

   Berkas ini menyalakan @page bawaan lanskap — ukuran dan margin sama
   persis dengan pwa-wide — hanya selama mencetak dokumen yang memang
   print-wide, dan mematikannya lagi sesudah mencetak. Dokumen potret
   tidak tersentuh. Dimuat sesudah app.js, sehingga pendengar
   beforeprint di sini berjalan setelah penilaian lebar di app.js.
   ============================================================ */
(function () {
  'use strict';

  var gaya = document.createElement('style');
  gaya.id = 'psgCetakLanskap';
  gaya.media = 'not all';
  gaya.textContent = '@page{size:A4 landscape;margin:8mm}';
  document.head.appendChild(gaya);

  function atur() {
    var lebar = !!(document.body && document.body.classList.contains('print-wide'));
    gaya.media = lebar ? 'print' : 'not all';
  }

  window.addEventListener('beforeprint', atur);
  window.addEventListener('afterprint', function () { gaya.media = 'not all'; });
})();
