/* ============================================================
   PSG Karakter — tokoh SVG bergaya untuk scene Sales Idea.
   ------------------------------------------------------------
   Satu tokoh, proporsi tetap, tampilan 3/4 menghadap kanan.
   Semua lapisan (rambut muda/tua, pakaian muda/kerja/santai,
   kacamata, tas) selalu ada di DOM; atribut data-* pada <svg>
   menentukan lapisan mana yang tampil. Scene bisa menukar
   lapisan dengan animasi (opacity), jadi usia dan pakaian dapat
   berubah halus tanpa menggambar ulang.

   Warna memakai token CSS (--k-*) dari psg-karakter.css, jadi
   ikut tema terang/gelap tanpa mengubah markup.

   PSGKarakter.svg(opsi) -> string
     usia     : 'muda' | 'dewasa' | 'senior'  (postur + rambut)
     pakaian  : 'muda' | 'kerja' | 'santai'
     kacamata : true/false
     tas      : true/false (tas kerja di tangan depan)
     arah     : 1 (kanan) | -1 (kiri)
     kelas    : kelas tambahan pada <svg>
   PSGKarakter.jalan(tl, root, { mulai, durasi, langkah })
     Mendaftarkan siklus jalan (kaki, lengan, ayunan badan) ke
     timeline pemutar. Jumlah langkah dibulatkan ke genap supaya
     pose akhir kembali berdiri.
   PSGKarakter.ganti(tl, root, bagian, urutan, durasi)
     Silang-pudar lapisan berurutan: bagian 'o' (pakaian) atau 'h'
     (rambut), mis. [[0,'muda'],[1800,'kerja'],[3200,'santai']].
   PSGKarakter.tukar(tl, root, bagian, dari, ke, mulai, durasi)
     Satu kali pergantian (pintasan ganti).
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.45,.05,.55,.95)';

  function svg(opsi) {
    var o = opsi || {};
    var usia = o.usia || 'dewasa';
    var pakaian = o.pakaian || 'kerja';
    var rambut = usia === 'senior' ? 'tua' : 'muda';
    var kelas = 'psg-k' + (o.arah === -1 ? ' psg-k--kiri' : '') + (o.kelas ? ' ' + o.kelas : '');
    return '' +
      '<svg class="' + kelas + '" viewBox="0 0 120 240" aria-hidden="true" focusable="false"' +
      ' data-usia="' + usia + '" data-pakaian="' + pakaian + '" data-rambut="' + rambut + '"' +
      (o.kacamata ? ' data-kacamata=""' : '') + (o.tas ? ' data-tas=""' : '') + '>' +
      '<ellipse class="k-bayang" cx="61" cy="233" rx="30" ry="4.6"/>' +
      '<g class="k-tubuh">' +
        /* kaki belakang */
        '<g class="k-kaki k-kaki-b"><path class="k-celana" d="M56 124 L54 219"/><path class="k-sepatu" d="M46 216 H61 C67 216 71 220 71 226 H46 Z"/></g>' +
        /* kaki depan */
        '<g class="k-kaki k-kaki-d"><path class="k-celana" d="M67 124 L69 219"/><path class="k-sepatu" d="M61 216 H76 C82 216 86 220 86 226 H61 Z"/></g>' +
        '<g class="k-atas">' +
          /* lengan belakang */
          '<g class="k-lengan k-lengan-b">' +
            '<path class="k-o k-o-muda k-lengan-kain" d="M48 64 L45 108"/>' +
            '<path class="k-o k-o-kerja k-lengan-kain" d="M48 64 L45 108"/>' +
            '<path class="k-o k-o-santai k-lengan-kain" d="M48 64 L45 108"/>' +
            '<circle class="k-kulit" cx="45" cy="113" r="5.6"/>' +
          '</g>' +
          '<rect class="k-kulit" x="57" y="42" width="11" height="14" rx="4.5"/>' +
          /* pakaian */
          '<g class="k-o k-o-muda">' +
            '<path class="k-kain" d="M44 64 C44 57 50 53 58 53 H68 C77 53 82 58 81 66 L78 122 C78 126 75 128 71 128 H51 C47 128 45 126 45 122 Z"/>' +
            '<path class="k-kulit" d="M57 53 Q63 61 69 53 Z"/>' +
          '</g>' +
          '<g class="k-o k-o-kerja">' +
            '<path class="k-kain" d="M44 64 C44 57 50 53 58 53 H68 C77 53 82 58 81 66 L78 122 C78 126 75 128 71 128 H51 C47 128 45 126 45 122 Z"/>' +
            '<path class="k-kemeja" d="M57 53 L63 76 L69 53 Z"/>' +
            '<path class="k-dasi" d="M61.8 56 H64.4 L66 77 L63.1 81 L60.2 77 Z"/>' +
            '<path class="k-garis" d="M56.5 53.5 L61 80 M69.5 53.5 L65.5 80"/>' +
          '</g>' +
          '<g class="k-o k-o-santai">' +
            '<path class="k-kain" d="M44 64 C44 57 50 53 58 53 H68 C77 53 82 58 81 66 L78 122 C78 126 75 128 71 128 H51 C47 128 45 126 45 122 Z"/>' +
            '<path class="k-dalam" d="M57.5 53 L63 70 L68.5 53 Z"/>' +
            '<path class="k-garis" d="M63 70 V126"/>' +
            '<circle class="k-kancing" cx="65.2" cy="86" r="1.5"/><circle class="k-kancing" cx="65.2" cy="102" r="1.5"/>' +
          '</g>' +
          /* kepala */
          '<g class="k-kepala">' +
            '<circle class="k-kulit" cx="63" cy="31" r="16"/>' +
            '<path class="k-kulit" d="M78 28 C82 31 82 35 78 37 Z"/>' +
            '<ellipse class="k-kulit-2" cx="55.5" cy="34" rx="3.2" ry="4.3"/>' +
            '<path class="k-h k-h-muda" d="M46.5 33 C45 19 53 12.5 64 12.5 C74.5 12.5 80.5 18.5 80 27 C76 24 70 23 64.5 24 C60 26 58 30 58.2 36 L55 40.5 C51 40.5 48 37.5 46.5 33 Z"/>' +
            '<path class="k-h k-h-tua" d="M47.2 34 C46.2 21.5 54 15.5 64 15.5 C73 15.5 78.8 20.5 79 26.5 C75 24.8 69.5 24.4 64.3 25 C60.2 27 58.6 31 58.6 36 L55.2 40.2 C51.4 40.2 48.6 37.6 47.2 34 Z"/>' +
            '<g class="k-kacamata"><rect x="68.5" y="26.8" width="10.5" height="7.4" rx="2.6"/><path d="M68.5 29.6 H57.5"/></g>' +
          '</g>' +
          /* lengan depan */
          '<g class="k-lengan k-lengan-d">' +
            '<path class="k-o k-o-muda k-lengan-kain" d="M74 64 L77 108"/>' +
            '<path class="k-o k-o-kerja k-lengan-kain" d="M74 64 L77 108"/>' +
            '<path class="k-o k-o-santai k-lengan-kain" d="M74 64 L77 108"/>' +
            '<circle class="k-kulit" cx="77" cy="113" r="5.6"/>' +
            '<g class="k-tas"><path class="k-tas-tali" d="M73 118 V114 H83 V118"/><rect class="k-tas-badan" x="68" y="117" width="21" height="16" rx="3.2"/></g>' +
          '</g>' +
        '</g>' +
      '</g>' +
      '</svg>';
  }

  function tambah(tl, el, kf, o) { if (el) tl.add(el, kf, o); }

  function jalan(tl, root, opsi) {
    if (!tl || !root) return;
    var o = opsi || {};
    var langkah = Math.max(2, Math.round((o.langkah || 4) / 2) * 2);
    var putaran = langkah / 2;
    var durasi = Math.max(200, o.durasi || 1200);
    var satu = durasi / putaran;
    var dasar = { duration: satu, iterations: putaran, delay: o.mulai || 0, easing: 'linear', fill: 'none' };
    var ayun = function (a) {
      return [
        { transform: 'rotate(0deg)', easing: EASE },
        { transform: 'rotate(' + a + 'deg)', offset: .25, easing: EASE },
        { transform: 'rotate(0deg)', offset: .5, easing: EASE },
        { transform: 'rotate(' + (-a) + 'deg)', offset: .75, easing: EASE },
        { transform: 'rotate(0deg)' }
      ];
    };
    var q = function (s) { return root.querySelector(s); };
    tambah(tl, q('.k-kaki-d'), ayun(-19), dasar);
    tambah(tl, q('.k-kaki-b'), ayun(19), dasar);
    tambah(tl, q('.k-lengan-d'), ayun(14), dasar);
    tambah(tl, q('.k-lengan-b'), ayun(-14), dasar);
    tambah(tl, q('.k-tubuh'), [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-2.2px)', offset: .25 },
      { transform: 'translateY(0)', offset: .5 },
      { transform: 'translateY(-2.2px)', offset: .75 },
      { transform: 'translateY(0)' }
    ], dasar);
  }

  /* Ganti lapisan secara berurutan dengan satu jejak keyframe per
     lapisan (tidak ada dua animasi opacity pada elemen yang sama).
     bagian : 'o' (pakaian) | 'h' (rambut)
     urutan : [[0, 'muda'], [1800, 'kerja'], [3200, 'santai']]
     Nilai terakhir harus sama dengan atribut data-* pada <svg>,
     karena itulah keadaan akhir (dan keadaan gerak-dikurangi). */
  function ganti(tl, root, bagian, urutan, durasi) {
    if (!tl || !root || !urutan || urutan.length < 2) return;
    var d = durasi || 600;
    var akhir = urutan[urutan.length - 1][0] + d;
    var nilai = [];
    urutan.forEach(function (u) { if (nilai.indexOf(u[1]) === -1) nilai.push(u[1]); });
    nilai.forEach(function (v) {
      var op = urutan[0][1] === v ? 1 : 0;
      var kf = [{ offset: 0, opacity: op }];
      for (var i = 1; i < urutan.length; i++) {
        var t = urutan[i][0], baru = urutan[i][1] === v ? 1 : 0;
        kf.push({ offset: t / akhir, opacity: op, easing: 'ease-in-out' });
        kf.push({ offset: (t + d) / akhir, opacity: baru });
        op = baru;
      }
      if (kf[kf.length - 1].offset < 1) kf.push({ offset: 1, opacity: op });
      Array.prototype.forEach.call(root.querySelectorAll('.k-' + bagian + '-' + v), function (el) {
        tl.add(el, kf, { duration: akhir, easing: 'linear', fill: 'backwards' });
      });
    });
  }
  function tukar(tl, root, bagian, dari, ke, mulai, durasi) {
    if (dari !== ke) ganti(tl, root, bagian, [[0, dari], [mulai || 0, ke]], durasi);
  }

  window.PSGKarakter = { svg: svg, jalan: jalan, ganti: ganti, tukar: tukar };
})();
