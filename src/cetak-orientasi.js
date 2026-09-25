/* ============================================================
   Orientasi kertas untuk dokumen cetak yang lebar.
   ------------------------------------------------------------
   app.js menandai body.print-wide saat beforeprint bila halaman
   memuat tabel lebar, dan styles.css memberi body itu named page
   lanskap (@page pwa-wide). Keduanya baru berlaku SESUDAH beforeprint.
   Pada printer sistem Windows (mis. "Microsoft Print to PDF")
   orientasi job ditentukan lebih awal dari gaya halaman yang sedang
   aktif, sehingga job tetap potret dan setiap halaman lanskap diputar
   90° agar muat — terbukti dari PDF hasil uji nyata.

   Karena itu @page bawaan lanskap (ukuran dan margin sama persis
   dengan pwa-wide) di sini sudah AKTIF SELAMA layar lebar tampil,
   bukan baru dinyalakan saat beforeprint. Penilaian "lebar" meniru
   persis assessPwaPrintWidth di app.js: tabel dengan 7 kolom atau
   lebih, atau tabel yang lebar alaminya melebihi wadahnya. Saat
   beforeprint keputusannya diselaraskan lagi dengan body.print-wide
   agar isi dan orientasi selalu cocok.

   @page hanya berlaku saat mencetak, jadi tampilan layar tidak
   berubah. Layar yang tidak lebar tetap memakai @page size:auto.
   ============================================================ */
(function () {
  'use strict';

  var gaya = document.createElement('style');
  gaya.id = 'psgCetakLanskap';
  gaya.media = 'not all';
  gaya.textContent = '@page{size:A4 landscape;margin:8mm}';
  document.head.appendChild(gaya);

  function pasang(lebar) {
    var m = lebar ? 'print' : 'not all';
    if (gaya.media !== m) gaya.media = m;
  }

  /* Salinan kriteria assessPwaPrintWidth (app.js) tanpa mengubah body. */
  function layarLebar() {
    var aktif = document.querySelector('.layar.aktif') || document.body;
    var tabel = aktif.querySelectorAll('table');
    var i, t;
    for (i = 0; i < tabel.length; i++) {
      t = tabel[i];
      if (((t.tHead && t.tHead.rows[0] && t.tHead.rows[0].cells.length) || 0) >= 7) return true;
    }
    var lebar = false;
    for (i = 0; i < tabel.length && !lebar; i++) {
      t = tabel[i];
      var lama = [t.style.width, t.style.maxWidth, t.style.tableLayout];
      var w = t.closest('.gulir,.banding-gulir');
      t.style.width = 'max-content'; t.style.maxWidth = 'none'; t.style.tableLayout = 'auto';
      var ruang = w ? w.clientWidth : document.documentElement.clientWidth;
      if (t.scrollWidth > Math.max(ruang + 40, 760)) lebar = true;
      t.style.width = lama[0]; t.style.maxWidth = lama[1]; t.style.tableLayout = lama[2];
    }
    return lebar;
  }

  var mencetak = false, jadwal = 0;
  function nilai() {
    jadwal = 0;
    if (!mencetak) pasang(layarLebar());
  }
  function nilaiNanti() {
    if (mencetak || jadwal) return;
    jadwal = setTimeout(nilai, 150);
  }

  window.addEventListener('beforeprint', function () {
    mencetak = true;
    if (jadwal) { clearTimeout(jadwal); jadwal = 0; }
    pasang(!!(document.body && document.body.classList.contains('print-wide')));
  });
  window.addEventListener('afterprint', function () {
    mencetak = false;
    nilaiNanti();
  });
  window.addEventListener('resize', nilaiNanti);

  /* Pengaman: begitu tombol cetak mulai ditekan (atau Ctrl+P), nilai ulang
     seketika — sebelum window.print() dipanggil — supaya keputusan tidak
     pernah tertinggal oleh jeda penilaian di atas. */
  function segarkan() {
    if (mencetak) return;
    if (jadwal) { clearTimeout(jadwal); jadwal = 0; }
    pasang(layarLebar());
  }
  document.addEventListener('pointerdown', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button,a,[role="button"]');
    if (b && /(cetak|print|pdf)/i.test(b.textContent || '')) segarkan();
  }, true);
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) segarkan();
  }, true);

  function mulai() {
    /* Layar berganti (kelas .aktif) dan tabel digambar ulang sama-sama
       tercatat sebagai mutasi; penilaian dijalankan sekali sesudahnya. */
    new MutationObserver(function (catatan) {
      /* Layar berganti: nilai seketika, supaya tidak ada jeda sesudah
         pindah dari layar lebar ke layar potret (atau sebaliknya). Isi
         yang digambar sesudahnya tetap dinilai ulang lewat jeda. */
      for (var i = 0; i < catatan.length; i++) {
        var c = catatan[i];
        if (c.type === 'attributes' && c.target.classList && c.target.classList.contains('layar')) {
          segarkan();
          break;
        }
      }
      nilaiNanti();
    }).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class']
    });
    nilai();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai, { once: true });
  else mulai();
})();
