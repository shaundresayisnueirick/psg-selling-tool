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
     sendi    : true → lengan bersiku & kaki berlutut (pose menopang)
     jenis    : 'wanita' → rambut panjang + pakaian 'wanita'
     usia     : 'anak' juga didukung (proporsi anak)
     gaya     : override token --k-* per tokoh (mis. warna baju anak)
     hadap    : 'depan' → tampak depan simetris, bersendi (pose menopang
                di atas kepala); kelas lengan/kaki sama: -b = kiri
                layar, -d = kanan layar
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
    if (o.hadap === 'depan') return svgDepan(o);
    if (o.sendi || o.usia === 'anak' || o.jenis === 'wanita') return svgLanjut(o);
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

  /* ---------- Perluasan: tokoh bersendi, wanita, anak ----------
     Hanya dipakai bila opsi baru diminta, sehingga markup untuk
     opsi lama (Retirement) tetap sama persis.
       sendi : true     → lengan bersiku (.k-hasta-*) dan kaki berlutut
                          (.k-betis-*), untuk pose menopang/membungkuk
       jenis : 'wanita' → rambut panjang + pakaian 'wanita' (blus, rok)
       usia  : 'anak'   → proporsi anak: kepala relatif lebih besar
       gaya  : deklarasi CSS untuk menimpa token --k-* satu tokoh */
  var BADAN_DEWASA = 'M44 64 C44 57 50 53 58 53 H68 C77 53 82 58 81 66 L78 122 C78 126 75 128 71 128 H51 C47 128 45 126 45 122 Z';
  var GEO = {
    dewasa: {
      bayang: '<ellipse class="k-bayang" cx="61" cy="233" rx="30" ry="4.6"/>',
      pinggul: [[56, 124], [67, 124]], lutut: [[55, 171.5], [68, 171.5]], mata: [[54, 219], [69, 219]],
      sepatu: ['M46 216 H61 C67 216 71 220 71 226 H46 Z', 'M61 216 H76 C82 216 86 220 86 226 H61 Z'],
      bahu: [[48, 64], [74, 64]], siku: [[48, 90], [74, 90]], tangan: [[48, 120], [74, 120]],
      ujung: [[45, 108], [77, 108]], genggam: [[45, 113], [77, 113]], r: 5.6,
      leher: '<rect class="k-kulit" x="57" y="42" width="11" height="14" rx="4.5"/>',
      badan: BADAN_DEWASA,
      o: {
        muda: '<path class="k-kulit" d="M57 53 Q63 61 69 53 Z"/>',
        kerja: '<path class="k-kemeja" d="M57 53 L63 76 L69 53 Z"/><path class="k-dasi" d="M61.8 56 H64.4 L66 77 L63.1 81 L60.2 77 Z"/><path class="k-garis" d="M56.5 53.5 L61 80 M69.5 53.5 L65.5 80"/>',
        santai: '<path class="k-dalam" d="M57.5 53 L63 70 L68.5 53 Z"/><path class="k-garis" d="M63 70 V126"/><circle class="k-kancing" cx="65.2" cy="86" r="1.5"/><circle class="k-kancing" cx="65.2" cy="102" r="1.5"/>',
        wanita: '<path class="k-kulit" d="M57 53 Q63 62 69 53 Z"/><path class="k-rok" d="M46 116 H79 L86 168 C74 173 50 173 39 168 Z"/>'
      },
      kepala: '<circle class="k-kulit" cx="63" cy="31" r="16"/><path class="k-kulit" d="M78 28 C82 31 82 35 78 37 Z"/><ellipse class="k-kulit-2" cx="55.5" cy="34" rx="3.2" ry="4.3"/>',
      rambut: {
        muda: 'M46.5 33 C45 19 53 12.5 64 12.5 C74.5 12.5 80.5 18.5 80 27 C76 24 70 23 64.5 24 C60 26 58 30 58.2 36 L55 40.5 C51 40.5 48 37.5 46.5 33 Z',
        tua: 'M47.2 34 C46.2 21.5 54 15.5 64 15.5 C73 15.5 78.8 20.5 79 26.5 C75 24.8 69.5 24.4 64.3 25 C60.2 27 58.6 31 58.6 36 L55.2 40.2 C51.4 40.2 48.6 37.6 47.2 34 Z',
        panjang: 'M46 33 C44.5 18.5 53 12 64 12 C75 12 81 18.5 80.5 27.5 C76.5 24.5 70.5 23.5 65 24.2 C60.5 26 58.6 30.5 58.8 36.5 L58.6 52 C55 57 47.5 56.5 45.4 51 C45.6 45 46.2 39 46 33 Z'
      },
      kacamata: '<g class="k-kacamata"><rect x="68.5" y="26.8" width="10.5" height="7.4" rx="2.6"/><path d="M68.5 29.6 H57.5"/></g>'
    },
    anak: {
      bayang: '<ellipse class="k-bayang" cx="61" cy="233" rx="22" ry="4"/>',
      pinggul: [[56, 162], [66, 162]], lutut: [[55.5, 190.5], [66.5, 190.5]], mata: [[55, 219], [67, 219]],
      sepatu: ['M48 216 H60 C65 216 68 220 68 226 H48 Z', 'M60 216 H72 C77 216 80 220 80 226 H60 Z'],
      bahu: [[50, 116], [74, 116]], siku: [[50, 134], [74, 134]], tangan: [[50, 153], [74, 153]],
      ujung: [[48, 149], [76, 149]], genggam: [[48, 153.5], [76, 153.5]], r: 4.8,
      leher: '<rect class="k-kulit" x="58" y="99" width="9" height="11" rx="4"/>',
      badan: 'M47 118 C47 113 51 109 57 109 H67 C74 109 78 113 77 119 L75 162 C75 165 73 167 70 167 H53 C50 167 48 165 48 162 Z',
      o: {
        muda: '<path class="k-kulit" d="M57.5 109 Q62 115 66.5 109 Z"/>',
        wanita: '<path class="k-kulit" d="M57.5 109 Q62 116 66.5 109 Z"/><path class="k-rok" d="M48 152 H76 L81 184 C71 188 53 188 43 184 Z"/>'
      },
      kepala: '<circle class="k-kulit" cx="62" cy="86" r="15.5"/><path class="k-kulit" d="M76.5 83 C80 85.5 80 89 76.5 91 Z"/><ellipse class="k-kulit-2" cx="54.5" cy="89" rx="3" ry="4"/>',
      rambut: {
        muda: 'M46 88 C44.5 74 52.5 68.5 62.5 68.5 C72.5 68.5 78 74 77.5 82 C73.5 79 68 78.5 63.5 79 C59.5 81 58 85 58.2 90.5 L55 94.5 C51 94.5 47.5 92 46 88 Z',
        panjang: 'M45.8 88 C44.5 73.5 52.5 68 62.5 68 C72.5 68 78.5 74 78 82.5 C74 79.5 68.5 78.8 63.8 79.2 C59.8 81.2 58.3 85.5 58.6 91 L58.4 106 C55 110 48.6 109.5 46.6 105 C45.8 99 46 93.5 45.8 88 Z'
      },
      kacamata: ''
    }
  };
  function xy(p) { return p[0] + ' ' + p[1]; }
  function svgLanjut(o) {
    var anak = o.usia === 'anak';
    var G = anak ? GEO.anak : GEO.dewasa;
    var usia = o.usia || 'dewasa';
    var pakaian = o.pakaian || (o.jenis === 'wanita' ? 'wanita' : (anak ? 'muda' : 'kerja'));
    var rambut = o.jenis === 'wanita' ? 'panjang' : (usia === 'senior' ? 'tua' : 'muda');
    var daftarO = Object.keys(G.o);
    var sendi = !!o.sendi;
    var kaki = function (i, sisi) {
      var p = G.pinggul[i], l = G.lutut[i], a = G.mata[i];
      if (!sendi) return '<g class="k-kaki k-kaki-' + sisi + '"><path class="k-celana" d="M' + xy(p) + ' L' + xy(a) + '"/><path class="k-sepatu" d="' + G.sepatu[i] + '"/></g>';
      return '<g class="k-kaki k-kaki-' + sisi + '"><path class="k-celana" d="M' + xy(p) + ' L' + xy(l) + '"/>' +
        '<g class="k-betis k-betis-' + sisi + '"><path class="k-celana" d="M' + xy(l) + ' L' + xy(a) + '"/><path class="k-sepatu" d="' + G.sepatu[i] + '"/></g></g>';
    };
    var lengan = function (i, sisi) {
      var b = G.bahu[i], h = '';
      if (!sendi) {
        daftarO.forEach(function (k) { h += '<path class="k-o k-o-' + k + ' k-lengan-kain" d="M' + xy(b) + ' L' + xy(G.ujung[i]) + '"/>'; });
        h += '<circle class="k-kulit k-tangan" cx="' + G.genggam[i][0] + '" cy="' + G.genggam[i][1] + '" r="' + G.r + '"/>';
      } else {
        var s = G.siku[i], t = G.tangan[i], ujung = [t[0], t[1] - 5];
        daftarO.forEach(function (k) { h += '<path class="k-o k-o-' + k + ' k-lengan-kain" d="M' + xy(b) + ' L' + xy(s) + '"/>'; });
        h += '<g class="k-hasta k-hasta-' + sisi + '">';
        daftarO.forEach(function (k) { h += '<path class="k-o k-o-' + k + ' k-lengan-kain" d="M' + xy(s) + ' L' + xy(ujung) + '"/>'; });
        h += '<circle class="k-kulit k-tangan" cx="' + t[0] + '" cy="' + t[1] + '" r="' + G.r + '"/></g>';
      }
      if (sisi === 'd' && !anak) h += '<g class="k-tas"><path class="k-tas-tali" d="M73 118 V114 H83 V118"/><rect class="k-tas-badan" x="68" y="117" width="21" height="16" rx="3.2"/></g>';
      return '<g class="k-lengan k-lengan-' + sisi + '">' + h + '</g>';
    };
    var baju = daftarO.map(function (k) { return '<g class="k-o k-o-' + k + '"><path class="k-kain" d="' + G.badan + '"/>' + G.o[k] + '</g>'; }).join('');
    var rmb = Object.keys(G.rambut).map(function (k) { return '<path class="k-h k-h-' + k + '" d="' + G.rambut[k] + '"/>'; }).join('');
    var kelas = 'psg-k' + (o.arah === -1 ? ' psg-k--kiri' : '') + (o.kelas ? ' ' + o.kelas : '');
    return '' +
      '<svg class="' + kelas + '" viewBox="0 0 120 240" aria-hidden="true" focusable="false"' +
      ' data-usia="' + usia + '" data-pakaian="' + pakaian + '" data-rambut="' + rambut + '"' +
      (sendi ? ' data-sendi=""' : '') + (o.kacamata ? ' data-kacamata=""' : '') + (o.tas ? ' data-tas=""' : '') +
      (o.gaya ? ' style="' + String(o.gaya).replace(/"/g, '') + '"' : '') + '>' +
      G.bayang +
      '<g class="k-tubuh">' + kaki(0, 'b') + kaki(1, 'd') +
        '<g class="k-atas">' + lengan(0, 'b') + G.leher + baju +
          '<g class="k-kepala">' + G.kepala + rmb + G.kacamata + '</g>' +
          lengan(1, 'd') +
        '</g>' +
      '</g></svg>';
  }

  /* ---------- Tampak depan (dewasa, bersendi) ----------
     Simetris terhadap x = 60. Lengan digambar di belakang badan
     sehingga sendi bahu tertutup saat lengan diangkat. Poros:
     bahu 44/76,64 · siku 44/76,90 · tangan 44/76,120 ·
     pinggul 52/68,124 · lutut 51/69,171.5 · kepala 60,46. */
  var DEPAN = {
    badan: 'M40 64 C40 57 47 53 55 53 H65 C73 53 80 57 80 64 L77 122 C77 126 74 128 70 128 H50 C46 128 43 126 43 122 Z',
    o: {
      muda: '<path class="k-kulit" d="M54 53 Q60 61 66 53 Z"/>',
      kerja: '<path class="k-kemeja" d="M54 53 L60 76 L66 53 Z"/><path class="k-dasi" d="M58.7 56 H61.3 L62.9 77 L60 81 L57.1 77 Z"/><path class="k-garis" d="M53.5 53.5 L58 80 M66.5 53.5 L62 80"/>',
      santai: '<path class="k-dalam" d="M54.5 53 L60 70 L65.5 53 Z"/><path class="k-garis" d="M60 70 V126"/><circle class="k-kancing" cx="62.2" cy="86" r="1.5"/><circle class="k-kancing" cx="62.2" cy="102" r="1.5"/>'
    },
    kepala: '<ellipse class="k-kulit-2" cx="44.6" cy="33" rx="2.6" ry="4"/><ellipse class="k-kulit-2" cx="75.4" cy="33" rx="2.6" ry="4"/><circle class="k-kulit" cx="60" cy="31" r="15.5"/>',
    rambut: {
      muda: 'M44.6 31 C44 18.5 51 13 60 13 C69 13 76 18.5 75.4 31 C73 25 67.5 22.5 60 22.5 C52.5 22.5 47 25 44.6 31 Z',
      tua: 'M45.2 30 C45.2 20 51.6 15.6 60 15.6 C68.4 15.6 74.8 20 74.8 30 C72.4 25.6 67 24 60 24 C53 24 47.6 25.6 45.2 30 Z'
    },
    kacamata: '<g class="k-kacamata"><rect x="50.2" y="28" width="8.4" height="6.6" rx="2.4"/><rect x="61.4" y="28" width="8.4" height="6.6" rx="2.4"/><path d="M58.6 30.6 H61.4"/></g>'
  };
  /* titik putar ditulis inline di markup: geometri pose tidak bergantung
     pada versi psg-karakter.css yang kebetulan termuat */
  function poros(x, y) { return ' style="transform-origin:' + x + 'px ' + y + 'px"'; }
  function svgDepan(o) {
    var pakaian = DEPAN.o[o.pakaian] ? o.pakaian : 'kerja';
    var usia = o.usia === 'senior' ? 'senior' : 'dewasa';
    var rambut = usia === 'senior' ? 'tua' : 'muda';
    var daftarO = Object.keys(DEPAN.o);
    var kaki = function (sisi, p, l, a, sepatu) {
      return '<g class="k-kaki k-kaki-' + sisi + '"' + poros(p[0], p[1]) + '><path class="k-celana" d="M' + xy(p) + ' L' + xy(l) + '"/>' +
        '<g class="k-betis k-betis-' + sisi + '"' + poros(l[0], l[1]) + '><path class="k-celana" d="M' + xy(l) + ' L' + xy(a) + '"/><path class="k-sepatu" d="' + sepatu + '"/></g></g>';
    };
    var lengan = function (sisi, x) {
      var h = '';
      daftarO.forEach(function (k) { h += '<path class="k-o k-o-' + k + ' k-lengan-kain" d="M' + x + ' 64 L' + x + ' 90"/>'; });
      h += '<g class="k-hasta k-hasta-' + sisi + '"' + poros(x, 90) + '>';
      daftarO.forEach(function (k) { h += '<path class="k-o k-o-' + k + ' k-lengan-kain" d="M' + x + ' 90 L' + x + ' 115"/>'; });
      h += '<circle class="k-kulit k-tangan" cx="' + x + '" cy="120" r="5.6"/></g>';
      return '<g class="k-lengan k-lengan-' + sisi + '"' + poros(x, 64) + '>' + h + '</g>';
    };
    var baju = daftarO.map(function (k) { return '<g class="k-o k-o-' + k + '"><path class="k-kain" d="' + DEPAN.badan + '"/>' + DEPAN.o[k] + '</g>'; }).join('');
    var rmb = Object.keys(DEPAN.rambut).map(function (k) { return '<path class="k-h k-h-' + k + '" d="' + DEPAN.rambut[k] + '"/>'; }).join('');
    var kelas = 'psg-k psg-k--depan' + (o.kelas ? ' ' + o.kelas : '');
    return '' +
      '<svg class="' + kelas + '" viewBox="0 0 120 240" aria-hidden="true" focusable="false"' +
      ' data-hadap="depan" data-usia="' + usia + '" data-pakaian="' + pakaian + '" data-rambut="' + rambut + '" data-sendi=""' +
      (o.kacamata ? ' data-kacamata=""' : '') +
      (o.gaya ? ' style="' + String(o.gaya).replace(/"/g, '') + '"' : '') + '>' +
      '<ellipse class="k-bayang" cx="60" cy="233" rx="30" ry="4.6"/>' +
      '<g class="k-tubuh"' + poros(60, 230) + '>' +
        kaki('b', [52, 124], [51, 171.5], [50, 219], 'M40 226 C40 219 44 215 50 215 C56 215 59 219 59 226 Z') +
        kaki('d', [68, 124], [69, 171.5], [70, 219], 'M61 226 C61 219 64 215 70 215 C76 215 80 219 80 226 Z') +
        '<g class="k-atas"' + poros(60, 126) + '>' + lengan('b', 44) + lengan('d', 76) +
          '<rect class="k-kulit" x="55" y="42" width="10" height="13" rx="4.5"/>' + baju +
          '<g class="k-kepala"' + poros(60, 46) + '>' + DEPAN.kepala + rmb + DEPAN.kacamata + '</g>' +
        '</g>' +
      '</g></svg>';
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
    var bob = [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-2.2px)', offset: .25 },
      { transform: 'translateY(0)', offset: .5 },
      { transform: 'translateY(-2.2px)', offset: .75 },
      { transform: 'translateY(0)' }
    ];
    if (root.getAttribute && root.getAttribute('data-hadap') === 'depan') {
      /* tampak depan: berjalan mendekat — telapak bergantian terangkat,
         badan bergeser ke kaki tumpuan */
      var angkat = function (o) {
        return [
          { transform: 'translateY(0px)', offset: 0 },
          { transform: 'translateY(0px)', offset: o, easing: EASE },
          { transform: 'translateY(-4px)', offset: o + .25, easing: EASE },
          { transform: 'translateY(0px)', offset: o + .5 },
          { transform: 'translateY(0px)', offset: 1 }
        ];
      };
      tambah(tl, q('.k-betis-b'), angkat(0), dasar);
      tambah(tl, q('.k-betis-d'), angkat(.5), dasar);
      tambah(tl, q('.k-atas'), ayun(-1.6), dasar);
      tambah(tl, q('.k-tubuh'), bob, dasar);
      return;
    }
    tambah(tl, q('.k-kaki-d'), ayun(-19), dasar);
    tambah(tl, q('.k-kaki-b'), ayun(19), dasar);
    tambah(tl, q('.k-lengan-d'), ayun(14), dasar);
    tambah(tl, q('.k-lengan-b'), ayun(-14), dasar);
    tambah(tl, q('.k-tubuh'), bob, dasar);
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
