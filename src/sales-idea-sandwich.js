/* ============================================================
   Sales Idea 08 — Sandwich Generation ("Rantai itu putus di aku")
   ------------------------------------------------------------
   Delapan scene untuk pemutar bersama (src/sales-idea-player.js):

     1. Surat untuk anakku kelak  — hook reflektif
     2. Kasih sayang, bukan beban tanpa rencana
     3. Masa pensiun perlu disiapkan
     4. Kesehatan bisa mengubah rencana
     5. Lindungi keluarga dari risiko (penyakit kritis & meninggal)
     6. Rantai tiga generasi
     7. Mulai dengan perencanaan
     8. Rantai itu putus di aku — penutup, lalu halaman pilihan

   Teks layar dan naskah narasi di sini adalah naskah utama; dokumen
   docs/sales-idea-sandwich-generation-elevenlabs.md menyalinnya kata
   per kata (tes memeriksa keduanya sama persis).

   Visual: ilustrasi animasi berlapis. Manusia tampil sebagai siluet tanpa
   wajah, kecuali scene 6 (Generasi Sandwich) yang atas pilihan pemilik
   memakai tokoh ilustrasi berekspresi sebagai puncak emosi cerita. Arah visual mengikuti referensi
   pemilik: meja kerja malam dengan lampu, surat yang ditulis, foto
   keluarga, toples dana pensiun, perisai kesehatan, himpitan sandwich,
   dan rantai yang putus saat fajar. Tiap scene = latar (ruangan/langit)
   + objek utama yang bergerak (tulisan tergambar, pena, koin jatuh,
   kubah perisai, rantai terbelah) + dorongan kamera pelan. Warna dari
   token CSS sehingga ikut tema terang/gelap.
   Bila aset foto/video realistis sudah dibuat, daftarkan di manifest
   window.PSGSandwichVisual (lihat storyboard); scene memakainya sebagai
   latar penuh (ilustrasi disembunyikan) tanpa perubahan kode lain.
   Saat ini manifest itu belum ada, jadi ilustrasi yang dipakai.

   Narasi: narator bersama (window.PSGNarasi). Satu segmen per scene.
   Rekaman MP3 dipakai bila manifest window.PSGSandwichAudio dimuat
   (format sama dengan PSGKreditAudio: kunci "SNN-01"); tanpa manifest
   narator memakai suara browser, jadi pemutar tetap berjalan.

   Sesudah scene 8 selesai (timeline dan narasi tuntas), kartu akhir
   bersama (src/sales-idea-lanjut.js) menampilkan halaman pilihan dari
   PSGSandwichPilihan di bawah ini, bukan tombol "Mari Kita Hitung".
   Setiap pilihan membuka layar yang sudah ada lewat
   InsuranceHubCustomerProfile.bukaUntuk() (Profil dulu, lalu tujuan),
   sama seperti Sales Idea lain:

     A. Belum tahu mulai dari mana  → SEGITIGA (Segitiga Financial)
     B. Masa pensiun                → DP (Kebutuhan Dana Pensiun); sesudah
                                      dihitung, tombol "Solusi — penuhi dengan
                                      Lite Future" (src/dp-solusi.js) membuka
                                      evaluasi BeSMART Lite Future
     C. Biaya kesehatan             → pilihan tiga tools:
                                      GSPA (Gen Aman + Rider GHPS & Waiver),
                                      BSL (BeSMART Lite - 100, rider GHP),
                                      GHP (GenPro + Rider GHP); rider kesehatan
                                      dipilih lewat tombol segmen resminya
                                      sesudah tools terbuka (#gRider, #bRider,
                                      #hRider), aturan produk tetap berlaku
     D. Penyakit kritis             → NEEDS (Analisis Kebutuhan), digulir ke
                                      kolom critical illness
     E. Perlindungan keluarga       → NEEDS, digulir ke kolom perlindungan jiwa

   Analisis Kebutuhan tidak punya parameter fokus; D dan E hanya
   menggulir dan menyorot kolom yang relevan, tanpa mengubah logikanya.
   Tidak ada penyimpanan baru: tindak lanjut hanya di memori dan batal
   bila pengguna meninggalkan Profil ke layar lain.

   API: PSGSandwichStory.adegan({ header, padaLangkah })
        PSGSandwichPilihan.buat({ lain }) → elemen halaman pilihan
   ============================================================ */
(function () {
  'use strict';

  var JUMLAH = 8;

  /* Judul scene (kartu teks), teks layar, dan teks pendukung. */
  var SCENE = [
    { judul: 'Surat untuk Anakku Kelak', layar: 'Untuk Anakku Kelak', suasana: 'hangat', motif: 'surat' },
    { judul: 'Kasih Sayang, Bukan Beban Tanpa Rencana', layar: 'Kasih Sayang, Bukan Beban Tanpa Rencana', suasana: 'hangat', motif: 'keluarga' },
    { judul: 'Masa Pensiun Perlu Disiapkan', layar: 'Kebutuhan Hidup Tetap Berjalan', suasana: 'teduh', motif: 'pensiun' },
    { judul: 'Kesehatan Bisa Mengubah Rencana', layar: 'Kesehatan Dapat Mengubah Rencana', suasana: 'redup', motif: 'kesehatan' },
    { judul: 'Lindungi Keluarga dari Risiko', layar: 'Siapkan Perlindungan Keluarga', suasana: 'redup', motif: 'perisai' },
    { judul: 'Rantai Tiga Generasi', layar: 'Tiga Generasi. Satu Rantai.', suasana: 'redup', motif: 'rantai' },
    { judul: 'Mulai dengan Perencanaan', layar: 'Mulai dari Kebutuhan yang Nyata', suasana: 'teduh', motif: 'langkah' },
    { judul: 'Rantai Itu Putus di Aku', layar: 'RANTAI ITU PUTUS DI AKU', pendukung: 'Tiga Generasi. Satu Keputusan.', suasana: 'fajar', motif: 'putus' }
  ];

  /* Naskah narasi — satu segmen per scene, sama persis dengan dokumen
     ElevenLabs. */
  var NARASI = [
    ['Untuk anakku kelak, ada satu hal yang ingin aku pastikan: gajimu bukan rencana masa tuaku.'],
    ['Kami tentu ingin saling membantu dalam keluarga. Tetapi aku tak ingin kasih sayang berubah menjadi beban finansial yang tidak pernah direncanakan.'],
    ['Saat kita berhenti bekerja, kebutuhan hidup tetap berjalan. Pensiun yang tidak disiapkan bisa membuat anak harus ikut menanggung biaya hidup orang tuanya.'],
    ['Biaya kesehatan juga bisa datang di luar rencana. Tanpa perlindungan dan dana yang memadai, tabungan keluarga bahkan rencana pendidikan anak bisa ikut terganggu.'],
    ['Penyakit kritis dapat memengaruhi penghasilan dan kebutuhan sehari-hari. Dan bila pencari nafkah meninggal, keluarga yang ditinggalkan tetap memerlukan biaya untuk melanjutkan hidup.'],
    ['Di sinilah rantai beban bisa terbentuk: anak membesarkan anaknya sendiri, sambil menopang orang tua. Lalu ia bisa mewariskan tekanan yang sama ke generasi berikutnya.'],
    ['Kita tidak bisa mengendalikan semua hal. Tapi kita bisa mulai dengan mengenali kebutuhan, menilai perlindungan yang sudah ada, dan menyiapkan langkah sesuai kemampuan.'],
    ['Rantai itu putus di aku. Bukan karena semua risiko hilang, tetapi karena aku mulai merencanakan. Beban finansial apa yang paling ingin kamu cegah agar tidak berpindah ke anak?']
  ];

  /* teks alternatif panggung (role="img") */
  var ARIA = [
    'Meja kerja di malam hari dengan lampu menyala. Sebuah buku terbuka bertuliskan "Untuk anakku," ditulis perlahan dengan pena, di samping amplop bersegel hati, foto keluarga, dan secangkir minuman hangat.',
    'Jendela rumah yang hangat memperlihatkan siluet tiga generasi di meja makan, hati melayang naik. Di sebelahnya ponsel menampilkan pengeluaran rutin yang bertambah: kiriman bulanan orang tua, cicilan rumah, biaya sekolah.',
    'Matahari terbenam di jendela. Kalender di meja berganti bulan, koin jatuh mengisi toples Dana Pensiun, dan catatan kebutuhan bulanan tetap berjalan: makan, listrik dan air, obat, transportasi.',
    'Ruang perawatan yang tenang: monitor detak jantung, infus, dan lembar rincian biaya perawatan. Toples tabungan menyusut dan buku dana pendidikan ikut goyah.',
    'Rumah keluarga di tengah hujan senja. Kubah perisai terbentuk melindungi rumah, dengan dua risiko yang dijaga: penyakit kritis dan pencari nafkah.',
    'Ilustrasi Generasi Sandwich: kakek dan nenek duduk penuh harap di roti atas, aku terhimpit di tengah dengan wajah cemas dan berkeringat sambil kedua lengan menahan roti, anak-anak ceria di depan roti bawah. Gelembung kata: "Mama Papa butuh perhatian ya, Nak", "Papa, temenin main yuk!", "Capek? Iya. Tapi siapa lagi kalau bukan aku?". Tagihan datang lagi, lalu rantai mengikat sandwich.',
    'Pagi yang cerah. Buku Rencana Langkah dengan tiga butir dicentang satu per satu: kenali kebutuhan, nilai perlindungan yang sudah ada, siapkan langkah sesuai kemampuan. Sebuah tunas tumbuh di pot.',
    'Fajar terbit di atas bukit dan rumah. Mata rantai tengah terbelah dalam kilau cahaya, rantai ke depan terlepas, dan sebuah hati muncul: rantai beban berhenti di generasi ini.'
  ];


  /* Ketukan: minimal lama gerak visual (md) dan ekor scene. */
  var KETUK_MIN = 3400, EKOR = 700;

  /* ---------------- narasi & ketukan ---------------- */
  var MD_HURUF = 80, JEDA_KALIMAT = 300, JEDA_SEGMEN = 900, JEDA_REKAMAN = 700;
  function lamaBicara(t) {
    var kalimat = (String(t).match(/[.!?…](\s|$)/g) || []).length;
    return Math.round(String(t).length * MD_HURUF) + kalimat * JEDA_KALIMAT;
  }
  function dua(x) { return (x < 10 ? '0' : '') + x; }
  function lamaRekaman(n, j) {
    var m = window.PSGSandwichAudio, klip = m && m.segmen && m.segmen['S' + dua(n) + '-' + dua(j)];
    if (!klip || !klip.length) return 0;
    return Math.round(klip.reduce(function (t, c) { return t + (c.end - c.start); }, 0) * 1000);
  }
  function ketukan(n) {
    var naskah = NARASI[n - 1] || [], B = [], D = [], t = 0;
    naskah.forEach(function (seg, j) {
      var r = lamaRekaman(n, j + 1);
      var d = Math.max(KETUK_MIN, r ? r + JEDA_REKAMAN : lamaBicara(seg) + JEDA_SEGMEN);
      B.push(t); D.push(d); t += d;
    });
    return { B: B, D: D, akhir: t + EKOR };
  }

  /* ---------------- utilitas ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function satu(st, sel) { return st ? st.querySelector(sel) : null; }
  function semua(st, sel) { return st ? Array.prototype.slice.call(st.querySelectorAll(sel)) : []; }
  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  function muncul(tl, el, t, d, dari) {
    if (!el) return;
    tl.add(el, [{ opacity: 0, transform: dari || 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: d || 700, delay: t || 0, easing: EASE });
  }


  /* ---------------- ilustrasi ----------------
     Tiap scene = dua lapis SVG:
       .sgw-latar-svg (960×540, slice)  — ruangan / langit, mengisi panggung
       .sgw-motif     (560×380, meet, menempel di garis meja) — objek utama
     Warna dari token CSS (--sw-*) sehingga terang/gelap ikut tema;
     atribut fill/stroke SVG tidak menerima var(), jadi lewat style.
     Gerak dideklarasikan di markup: data-a = jenis, data-t = tunda (md),
     data-d = lama (md); animasi() menerjemahkannya ke timeline pemutar.
     Tanpa tokoh kartun: manusia hanya tampil sebagai siluet tanpa wajah. */
  function F(t, x) { return ' style="fill:var(--sw-' + t + ')' + (x ? ';' + x : '') + '"'; }
  function S(t, w, x) {
    return ' style="fill:none;stroke:var(--sw-' + t + ');stroke-width:' + (w || 2) +
      ';stroke-linecap:round;stroke-linejoin:round' + (x ? ';' + x : '') + '"';
  }
  function FS(f, t, w) {
    return ' style="fill:var(--sw-' + f + ');stroke:var(--sw-' + t + ');stroke-width:' + (w || 2) + ';stroke-linejoin:round"';
  }
  function A(jenis, t, d) {
    return ' data-a="' + jenis + '"' + (t != null ? ' data-t="' + t + '"' : '') + (d ? ' data-d="' + d + '"' : '');
  }
  var PL = ' pathLength="1" class="sgw-gores"';
  function stopW(o, t, op) { return '<stop offset="' + o + '" style="stop-color:var(--sw-' + t + ')' + (op != null ? ';stop-opacity:' + op : '') + '"/>'; }
  function gradV(id, a, b) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stopW(0, a) + stopW(1, b) + '</linearGradient>'; }
  function teks(x, y, isi, ukuran, warna, x2) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + ukuran + '"' + F(warna || 'tinta') + (x2 || '') + '>' + esc(isi) + '</text>';
  }
  /* bilangan semu tetap (tiap render sama persis) */
  function acak(benih) { var s = benih; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  /* tulisan tangan: rangkaian lengkung kecil, spasi antar kata */
  function tulisan(x, y, w, benih) {
    var r = acak(benih), d = 'M' + x + ' ' + y, cx = x;
    while (cx < x + w - 10) {
      var a = 4 + r() * 6, h = 3 + r() * 5;
      d += ' q' + (a / 2).toFixed(1) + ' ' + (-h).toFixed(1) + ' ' + a.toFixed(1) + ' 0';
      cx += a;
      if (r() < 0.16) { d += ' m6 0'; cx += 6; }
    }
    return d;
  }
  /* siluet manusia tanpa wajah: kepala + bahu membulat */
  function sosok(x, kaki, h, warna, x2) {
    var r = h * 0.12, b = h * 0.27, atas = kaki - h, y0 = atas + r * 2.75;
    return '<g' + (x2 || '') + '><circle cx="' + x + '" cy="' + (atas + r) + '" r="' + r.toFixed(1) + '"' + F(warna || 'siluet') + '/>' +
      '<path d="M' + (x - b) + ' ' + y0.toFixed(1) + ' C' + (x - b) + ' ' + (y0 - r * 1.1).toFixed(1) + ' ' + (x + b) + ' ' + (y0 - r * 1.1).toFixed(1) + ' ' + (x + b) + ' ' + y0.toFixed(1) +
      ' L' + (x + b * 0.62).toFixed(1) + ' ' + kaki + ' L' + (x - b * 0.62).toFixed(1) + ' ' + kaki + ' Z"' + F(warna || 'siluet') + '/></g>';
  }
  /* mata rantai: elips berselang tegak/datar di sepanjang garis */
  function rantai(x1, y1, x2, y2, n, warna, x3) {
    var s = '';
    for (var k = 0; k < n; k++) {
      var t = (k + 0.5) / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      var sudut = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      s += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + (k % 2 ? 9 : 11) + '" ry="' + (k % 2 ? 3 : 6) + '"' +
        ' transform="rotate(' + sudut.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"' + S(warna || 'rantai', k % 2 ? 4 : 3.4) + PL + '/>';
    }
    return '<g' + (x3 || '') + '>' + s + '</g>';
  }
  /* hati berpusat di x, puncak di y; dibungkus <g> bila dianimasikan
     (transform CSS menimpa atribut transform) */
  function hati(x, y, s) {
    return '<path d="M0 6c-8-9-20-3-20 6 0 9 11 15 20 23 9-8 20-14 20-23 0-9-12-15-20-6z" transform="translate(' + x + ' ' + y + ') scale(' + s + ')"' + F('aksen') + '/>';
  }
  function uap(x, y, t0) {
    var s = '';
    for (var k = 0; k < 3; k++) s += '<path d="M' + (x + k * 9) + ' ' + y + 'c-7-9 7-15 0-25"' + S('uap', 3) + A('uap', t0 + k * 900, 3200) + '/>';
    return s;
  }
  function cangkir(x, y, warna) {
    return '<g' + A('muncul', 150) + '><path d="M' + x + ' ' + y + 'h44v38a10 10 0 0 1-10 10h-24a10 10 0 0 1-10-10z"' + F(warna || 'buku-2') + '/>' +
      '<path d="M' + (x + 44) + ' ' + (y + 9) + 'c14 0 14 20 0 20"' + S(warna || 'buku-2', 5) + '/>' +
      '<ellipse cx="' + (x + 22) + '" cy="' + y + '" rx="22" ry="4"' + F('meja-tepi') + '/></g>' + uap(x + 12, y - 8, 400);
  }

  /* ----- latar 960×540 ----- */
  function latarKamar(P, o) {
    var wx = o.jendela === 'kanan' ? 560 : 90, r = acak(o.benih || 7), lampuKota = '', gedung = '';
    var gx = wx;
    while (gx < wx + 310) {
      var lebar = 26 + r() * 34, tinggi = 50 + r() * 120;
      gedung += '<rect x="' + gx.toFixed(0) + '" y="' + (330 - tinggi).toFixed(0) + '" width="' + lebar.toFixed(0) + '" height="' + tinggi.toFixed(0) + '"' + F('kota') + '/>';
      for (var j = 0; j < 3; j++) {
        if (r() < 0.55) lampuKota += '<rect x="' + (gx + 5 + r() * (lebar - 12)).toFixed(0) + '" y="' + (338 - tinggi + 10 + r() * (tinggi - 30)).toFixed(0) + '" width="4" height="5"' + F('lampu-kota') + A('kedip', Math.round(r() * 2000), 1400 + Math.round(r() * 1600)) + '/>';
      }
      gx += lebar + 3;
    }
    var rak = o.jendela === 'kanan' ? 90 : 640;
    return '<defs>' + gradV(P + 'dd', 'dinding-1', 'dinding-2') + gradV(P + 'lg', 'langit-1', 'langit-2') +
        '<clipPath id="' + P + 'jc"><rect x="' + wx + '" y="60" width="310" height="270"/></clipPath>' +
        '<radialGradient id="' + P + 'pd">' + stopW(0, 'lampu', 0.55) + stopW(1, 'lampu', 0) + '</radialGradient></defs>' +
      '<rect width="960" height="540" fill="url(#' + P + 'dd)"/>' +
      '<g clip-path="url(#' + P + 'jc)"><rect x="' + wx + '" y="60" width="310" height="270" fill="url(#' + P + 'lg)"/>' +
        '<circle cx="' + (wx + 220) + '" cy="' + (o.surya || 140) + '" r="26"' + F('surya') + (o.suryaGerak ? A(o.suryaGerak, 0, 9000) : '') + '/>' +
        gedung + lampuKota + '</g>' +
      '<rect x="' + wx + '" y="60" width="310" height="270" rx="4"' + S('kusen', 10) + '/>' +
      '<path d="M' + (wx + 155) + ' 60v270M' + wx + ' 180h310"' + S('kusen', 6) + '/>' +
      '<path d="M' + (wx - 30) + ' 40h70c-8 90-6 200 6 310h-76z"' + F('tirai') + '/>' +
      '<g>' +
        '<rect x="' + rak + '" y="150" width="230" height="10"' + F('kayu') + '/>' +
        '<rect x="' + (rak + 12) + '" y="92" width="18" height="58"' + F('buku-1') + '/>' +
        '<rect x="' + (rak + 32) + '" y="100" width="14" height="50"' + F('buku-2') + '/>' +
        '<rect x="' + (rak + 48) + '" y="86" width="20" height="64"' + F('buku-3') + '/>' +
        '<rect x="' + (rak + 70) + '" y="104" width="12" height="46" transform="rotate(12 ' + (rak + 76) + ' 150)"' + F('buku-2') + '/>' +
        '<path d="M' + (rak + 170) + ' 150c-4-26 6-40 14-46M' + (rak + 184) + ' 150c2-22 14-32 24-34M' + (rak + 178) + ' 150c-10-18-22-22-30-22"' + S('daun', 5) + '/>' +
        '<rect x="' + (rak + 160) + '" y="132" width="44" height="18" rx="3"' + F('kayu') + '/>' +
        '<rect x="' + (rak + 40) + '" y="200" width="120" height="86" rx="4"' + FS('kertas', 'bingkai', 6) + '/>' +
        '<path d="M' + (rak + 60) + ' 230h80M' + (rak + 60) + ' 246h80M' + (rak + 72) + ' 262h56"' + S('kertas-garis', 3) + '/>' +
      '</g>' +
      '<circle cx="' + (o.lampuX || 300) + '" cy="300" r="320" fill="url(#' + P + 'pd)"' + A('nafas', 0, 2800) + '/>' +
      '<rect x="0" y="398" width="960" height="10"' + F('meja-tepi') + '/>' +
      '<rect x="0" y="406" width="960" height="134"' + F('meja') + '/>';
  }
  function latarKlinik(P) {
    var tirai = '';
    for (var y = 72; y < 318; y += 14) tirai += '<path d="M600 ' + y + 'h300"' + S('kusen', 4, 'opacity:.55') + '/>';
    return '<defs>' + gradV(P + 'dd', 'dinding-1', 'dinding-2') + gradV(P + 'lg', 'langit-1', 'langit-2') + '</defs>' +
      '<rect width="960" height="540" fill="url(#' + P + 'dd)"/>' +
      '<rect x="600" y="60" width="300" height="270" fill="url(#' + P + 'lg)"/>' + tirai +
      '<rect x="600" y="60" width="300" height="270" rx="4"' + S('kusen', 8) + '/>' +
      '<rect x="0" y="250" width="560" height="6"' + F('kertas-garis', 'opacity:.5') + '/>' +
      '<rect x="0" y="398" width="960" height="10"' + F('meja-tepi') + '/>' +
      '<rect x="0" y="406" width="960" height="134"' + F('meja') + '/>';
  }
  function latarLuar(P, o) {
    var awan = '', hujan = '';
    var r = acak(o.benih || 3);
    for (var k = 0; k < 4; k++) {
      var x = 60 + k * 230 + r() * 60, y = 70 + r() * 70;
      awan += '<g' + A('awan', 0, 9000 + k * 1700) + '><ellipse cx="' + x + '" cy="' + y + '" rx="70" ry="18"' + F('awan') + '/>' +
        '<ellipse cx="' + (x + 30) + '" cy="' + (y - 12) + '" rx="40" ry="16"' + F('awan') + '/></g>';
    }
    if (o.hujan) {
      var garis = '';
      for (var h = 0; h < 70; h++) garis += 'M' + Math.round(r() * 960) + ' ' + Math.round(r() * 600 - 60) + 'l-6 22';
      hujan = '<g' + A('hujan', 0, 900) + '><path d="' + garis + '"' + S('hujan', 2) + '/></g>';
    }
    return '<defs>' + gradV(P + 'lg', 'langit-1', 'langit-2') +
        '<radialGradient id="' + P + 'sr">' + stopW(0, 'surya', 0.9) + stopW(0.35, 'surya', 0.35) + stopW(1, 'surya', 0) + '</radialGradient></defs>' +
      '<rect width="960" height="540" fill="url(#' + P + 'lg)"/>' +
      '<g' + (o.suryaGerak ? A(o.suryaGerak, 0, 9000) : '') + '><circle cx="' + (o.suryaX || 700) + '" cy="' + (o.surya || 330) + '" r="150" fill="url(#' + P + 'sr)"/>' +
        '<circle cx="' + (o.suryaX || 700) + '" cy="' + (o.surya || 330) + '" r="40"' + F('surya') + '/></g>' +
      awan +
      '<path d="M0 360 C160 300 300 330 460 320 S760 280 960 330 V540 H0Z"' + F('bukit-2') + '/>' +
      '<path d="M0 410 C200 370 380 400 560 386 S820 360 960 392 V540 H0Z"' + F('bukit-1') + '/>' +
      (o.rumah ? '<g><path d="M786 352l34-26 34 26v26h-68z"' + F('siluet') + '/><rect x="808" y="356" width="12" height="12"' + F('lampu-kota') + A('kedip', 600, 2600) + '/></g>' : '') +
      '<rect x="0" y="430" width="960" height="110"' + F('tanah') + '/>' + hujan;
  }

  /* ----- objek utama 560×380 (garis meja/tanah di y≈372) ----- */
  var ADEGAN = [];
  /* 1. Surat untuk anakku */
  ADEGAN[1] = {
    latar: function (P) { return latarKamar(P, { jendela: 'kanan', lampuX: 260, surya: 110, benih: 11 }); },
    objek: function (P) {
      var baris = [], titik = [], k;
      for (k = 0; k < 4; k++) {
        var y = 304 + k * 14, w = k === 3 ? 70 : 118;
        baris.push('<path d="' + tulisan(148, y, w, 20 + k) + '"' + S('tinta', 1.4) + PL + A('tulis', 1300 + k * 700, 680) + '/>');
        titik.push('148,' + y + ',' + (1300 + k * 700), (148 + w) + ',' + y + ',' + (1980 + k * 700));
      }
      for (k = 0; k < 3; k++) {
        var y2 = 290 + k * 14;
        baris.push('<path d="' + tulisan(296, y2, 112, 40 + k) + '"' + S('tinta', 1.4) + PL + A('tulis', 4100 + k * 700, 680) + '/>');
        titik.push('296,' + y2 + ',' + (4100 + k * 700), '408,' + y2 + ',' + (4780 + k * 700));
      }
      return '<defs><linearGradient id="' + P + 'kr" x1="0" y1="0" x2="0" y2="1">' + stopW(0, 'lampu', 0.55) + stopW(1, 'lampu', 0) + '</linearGradient>' +
          '<linearGradient id="' + P + 'ft" x1="0" y1="0" x2="1" y2="1">' + stopW(0, 'foto-1') + stopW(1, 'foto-2') + '</linearGradient>' +
          '<clipPath id="' + P + 'fk"><rect x="458" y="270" width="58" height="84"/></clipPath></defs>' +
        /* lampu meja */
        '<path d="M178 186 L120 368 L340 370 L222 176Z" fill="url(#' + P + 'kr)"' + A('nafas', 0, 2600) + '/>' +
        '<ellipse cx="62" cy="366" rx="32" ry="7"' + F('logam') + '/>' +
        '<path d="M62 364V196L156 154"' + S('logam', 6) + '/>' +
        '<path d="M146 146l62-12 20 40-70 14z"' + F('logam') + '/>' +
        '<circle cx="196" cy="182" r="9"' + F('lampu') + A('nafas', 0, 1800) + '/>' +
        /* buku terbuka */
        '<g' + A('muncul', 0, 900) + '>' +
          '<path d="M280 266Q210 254 136 268L124 368Q204 358 280 370Z"' + F('kertas') + '/>' +
          '<path d="M280 266Q350 254 424 268L436 368Q356 358 280 370Z"' + F('kertas') + '/>' +
          '<path d="M280 266V370"' + S('kertas-garis', 2) + '/>' +
          '<path d="M146 312h124M146 326h124M146 340h124M146 354h124M294 298h118M294 312h118M294 326h118M294 340h118"' + S('kertas-garis', 1) + '/>' +
        '</g>' +
        teks(148, 292, 'Untuk anakku,', 15, 'tinta', ' font-style="italic" font-weight="700"' + A('muncul', 700, 700)) +
        baris.join('') +
        /* pena mengikuti baris tulisan */
        '<g class="sgw-pena"' + A('pena') + ' data-titik="' + titik.join(' ') + '"><path d="M0 0l4-10 70-52 6 8-70 52z"' + F('pena') + '/><path d="M0 0l4-10 6 8z"' + F('emas') + '/></g>' +
        /* amplop dengan segel hati */
        '<g' + A('skala', 2600, 800) + '><g transform="rotate(-8 360 350)"><rect x="318" y="326" width="96" height="56" rx="4"' + FS('label', 'kertas-garis', 2) + '/>' +
          '<path d="M318 330l48 30 48-30"' + S('kertas-garis', 2) + '/></g>' + hati(366, 346, 0.5) + '</g>' +
        /* foto keluarga */
        '<g' + A('muncul', 400, 900) + '><rect x="452" y="264" width="70" height="96" rx="3"' + F('bingkai') + '/>' +
          '<rect x="458" y="270" width="58" height="84" fill="url(#' + P + 'ft)"/>' +
          '<g clip-path="url(#' + P + 'fk)">' + sosok(474, 362, 66) + sosok(500, 362, 60) + sosok(487, 362, 38, 'siluet-2') + '</g>' +
          '<path d="M498 360l14 12"' + S('bingkai', 4) + '/></g>' +
        cangkir(498, 330, 'buku-1') +
        debu([[200, 230], [236, 280], [180, 300], [250, 220], [214, 330], [270, 300]]);
    }
  };
  function debu(daftar) {
    return daftar.map(function (p, k) {
      return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.8"' + F('lampu', 'opacity:.9') + A('debu', k * 450, 2800 + k * 300) + '/>';
    }).join('');
  }
  /* 2. Kasih sayang, bukan beban tanpa rencana */
  ADEGAN[2] = {
    latar: function (P) { return latarKamar(P, { jendela: 'kiri', lampuX: 640, surya: 120, benih: 5 }); },
    objek: function (P) {
      var notif = [['Kiriman bulanan', 'Orang tua · tgl 1', 'aksen'], ['Cicilan rumah', 'Keluarga · tgl 5', 'emas'], ['Biaya sekolah', 'Anak · tgl 10', 'perisai']];
      var kartu = notif.map(function (n, k) {
        var y = 150 + k * 66;
        return '<g' + A('geser', 1500 + k * 1100, 700) + '><rect x="378" y="' + y + '" width="148" height="56" rx="10"' + F('label') + '/>' +
          '<circle cx="396" cy="' + (y + 28) + '" r="9"' + F(n[2]) + '/>' +
          teks(412, y + 24, n[0], 13, 'label-teks', ' font-weight="800"') + teks(412, y + 42, n[1], 11, 'label-teks', ' opacity=".75"') + '</g>';
      }).join('');
      var hatiNaik = [[150, 120], [196, 96], [244, 116], [120, 100]].map(function (p, k) {
        return '<g' + A('naik', 300 + k * 800, 3400) + '>' + hati(p[0], p[1], 0.55 + (k % 2) * 0.2) + '</g>';
      }).join('');
      return '<defs><linearGradient id="' + P + 'dl" x1="0" y1="0" x2="0" y2="1">' + stopW(0, 'foto-1') + stopW(1, 'foto-2') + '</linearGradient>' +
          '<clipPath id="' + P + 'jk"><rect x="40" y="150" width="300" height="200" rx="6"/></clipPath></defs>' +
        /* jendela rumah: tiga generasi di meja makan */
        '<g' + A('muncul', 0, 900) + '><rect x="32" y="142" width="316" height="216" rx="10"' + F('kusen') + '/>' +
          '<rect x="40" y="150" width="300" height="200" rx="6" fill="url(#' + P + 'dl)"/>' +
          '<g clip-path="url(#' + P + 'jk)">' +
            '<circle cx="190" cy="196" r="22"' + F('lampu', 'opacity:.85') + A('nafas', 0, 2400) + '/>' +
            '<path d="M190 150v24"' + S('siluet', 2) + '/>' +
            sosok(80, 350, 120, 'siluet', ' transform="rotate(-5 80 350)"') + sosok(124, 350, 112) +
            sosok(196, 350, 150) + sosok(246, 350, 140) + sosok(298, 350, 92, 'siluet-2') +
            '<rect x="40" y="318" width="300" height="12"' + F('kayu') + '/>' +
          '</g>' +
          '<path d="M190 150v200M40 250h300"' + S('kusen', 5, 'opacity:.6') + '/></g>' +
        hatiNaik +
        /* ponsel: pengeluaran rutin bertambah */
        '<g' + A('muncul', 900, 800) + '><rect x="364" y="84" width="176" height="292" rx="22"' + F('pena') + '/>' +
          '<rect x="372" y="96" width="160" height="268" rx="14"' + F('dinding-1') + '/>' +
          teks(384, 128, 'Pengeluaran rutin', 13, 'label-teks', ' font-weight="800"') + '</g>' +
        kartu;
    }
  };
  /* 3. Masa pensiun perlu disiapkan */
  ADEGAN[3] = {
    latar: function (P) { return latarKamar(P, { jendela: 'kanan', lampuX: 420, surya: 120, suryaGerak: 'turun', benih: 9 }); },
    objek: function (P) {
      var bulan = ['Jan', 'Feb', 'Mar', 'Apr'], hal = '';
      for (var k = bulan.length - 1; k >= 0; k--) {
        hal += '<g' + (k < bulan.length - 1 ? A('balik', 900 + k * 900, 600) : '') + '><rect x="44" y="252" width="122" height="108" rx="6"' + FS('kertas', 'kertas-garis', 2) + '/>' +
          '<rect x="44" y="252" width="122" height="26" rx="6"' + F('aksen') + '/>' +
          teks(105, 270, bulan[k], 14, 'kertas', ' text-anchor="middle" font-weight="800"') +
          teks(105, 336, String(1), 40, 'tinta', ' text-anchor="middle" font-weight="800"') + '</g>';
      }
      var koin = [0, 1, 2, 3, 4].map(function (k) {
        return '<ellipse cx="' + (262 + (k % 2) * 14) + '" cy="250" rx="11" ry="4"' + F('koin') + A('koin', 1100 + k * 750, 900) + '/>';
      }).join('');
      var butir = ['Makan & dapur', 'Listrik & air', 'Obat & kontrol', 'Transportasi'].map(function (b, k) {
        var y = 262 + k * 26;
        return '<g' + A('muncul', 1600 + k * 650, 600) + '>' + teks(392, y, b, 13, 'tinta') + '<path d="M482 ' + (y - 4) + 'h24"' + S('aksen', 3) + '/></g>';
      }).join('');
      return '<defs><clipPath id="' + P + 'tg"><path d="M232 262h88v92a14 14 0 0 1-14 14h-60a14 14 0 0 1-14-14z"/></clipPath></defs>' +
        hal + '<path d="M58 252v-8M152 252v-8"' + S('logam', 4) + '/>' +
        /* toples dana pensiun terisi */
        '<g' + A('muncul', 200, 800) + '>' +
          '<g clip-path="url(#' + P + 'tg)"><rect class="sgw-tingkat" x="232" y="262" width="88" height="110"' + F('koin') + A('isi', 1200, 4200) + '/></g>' +
          '<path d="M232 262h88v92a14 14 0 0 1-14 14h-60a14 14 0 0 1-14-14z"' + FS('kaca', 'kaca-garis', 3) + '/>' +
          '<rect x="226" y="246" width="100" height="18" rx="5"' + F('kayu') + '/>' +
          '<rect x="246" y="300" width="60" height="34" rx="4"' + F('label') + '/>' +
          teks(276, 314, 'Dana', 11, 'label-teks', ' text-anchor="middle" font-weight="800"') + teks(276, 328, 'Pensiun', 11, 'label-teks', ' text-anchor="middle" font-weight="800"') +
        '</g>' + koin +
        /* catatan kebutuhan bulanan */
        '<g' + A('muncul', 900, 800) + '><g transform="rotate(3 450 300)"><rect x="378" y="214" width="146" height="160" rx="6"' + F('kertas') + '/>' +
          teks(392, 238, 'Kebutuhan bulanan', 13, 'tinta', ' font-weight="800"') + butir + '</g></g>' +
        /* kacamata baca */
        '<g' + A('muncul', 600, 700) + '><circle cx="188" cy="360" r="12"' + S('pena', 3) + '/><circle cx="216" cy="360" r="12"' + S('pena', 3) + '/><path d="M200 358q2-4 4 0"' + S('pena', 3) + '/></g>';
    }
  };
  /* 4. Kesehatan bisa mengubah rencana */
  ADEGAN[4] = {
    latar: function (P) { return latarKlinik(P); },
    objek: function (P) {
      var baris = '';
      for (var k = 0; k < 5; k++) baris += '<path d="M284 ' + (214 + k * 22) + 'h64M362 ' + (214 + k * 22) + 'h24"' + S('kertas-garis', 3) + '/>';
      return '<defs><clipPath id="' + P + 'tb"><path d="M436 290h72v66a12 12 0 0 1-12 12h-48a12 12 0 0 1-12-12z"/></clipPath></defs>' +
        /* monitor detak jantung */
        '<g' + A('muncul', 0, 800) + '><rect x="40" y="110" width="170" height="118" rx="12"' + F('pena') + '/>' +
          '<rect x="50" y="120" width="150" height="98" rx="6"' + F('layar') + '/>' +
          '<path d="M54 178h40l8-22 12 44 10-34 8 12h64"' + S('ekg', 3) + PL + A('ekg', 0, 2200) + '/>' +
          hati(180, 128, 0.35) + teks(150, 146, '72', 16, 'ekg', ' font-weight="800"') +
          '<path d="M125 228v120M90 368h70"' + S('logam', 6) + '/></g>' +
        /* infus */
        '<g' + A('muncul', 300, 800) + '><path d="M236 372V96M218 96h36"' + S('logam', 5) + '/>' +
          '<rect x="222" y="104" width="30" height="46" rx="8"' + FS('kaca', 'kaca-garis', 2) + '/>' +
          '<path d="M237 150v70"' + S('kaca-garis', 2) + '/>' +
          '<circle cx="237" cy="160" r="3"' + F('perisai') + A('tetes', 400, 1400) + '/></g>' +
        /* rincian biaya */
        '<g' + A('naikMasuk', 900, 900) + '><rect x="270" y="160" width="132" height="212" rx="6"' + F('kertas') + '/>' +
          teks(284, 186, 'Rincian Biaya', 13, 'tinta', ' font-weight="800"') + teks(284, 202, 'Perawatan', 12, 'tinta') + baris +
          '<path d="M284 336h104"' + S('tinta', 2) + '/>' + teks(284, 358, 'Total', 13, 'aksen', ' font-weight="800"') +
          '<path d="M340 354h48"' + S('aksen', 4) + PL + A('tulis', 2000, 700) + '/></g>' +
        /* tabungan menyusut & dana pendidikan goyah */
        '<g' + A('muncul', 600, 800) + '><g clip-path="url(#' + P + 'tb)"><rect class="sgw-tingkat" x="436" y="290" width="72" height="80"' + F('koin') + A('kuras', 2400, 3200) + '/></g>' +
          '<path d="M436 290h72v66a12 12 0 0 1-12 12h-48a12 12 0 0 1-12-12z"' + FS('kaca', 'kaca-garis', 3) + '/>' +
          '<rect x="430" y="276" width="84" height="16" rx="4"' + F('kayu') + '/>' + teks(472, 330, 'Tabungan', 11, 'label-teks', ' text-anchor="middle" font-weight="800"') + '</g>' +
        '<g class="sgw-miring"' + A('miring', 3200, 1400) + '><rect x="520" y="246" width="34" height="126" rx="3"' + F('buku-2') + '/>' +
          '<text x="0" y="0" font-size="11" font-weight="800" transform="translate(541 362) rotate(-90)"' + F('kertas') + '>Dana Pendidikan</text></g>';
    }
  };
  /* 5. Lindungi keluarga dari risiko */
  ADEGAN[5] = {
    latar: function (P) { return latarLuar(P, { hujan: true, surya: 300, suryaX: 820, benih: 4 }); },
    objek: function (P) {
      return '<defs><linearGradient id="' + P + 'jd" x1="0" y1="0" x2="0" y2="1">' + stopW(0, 'foto-1') + stopW(1, 'foto-2') + '</linearGradient></defs>' +
        /* rumah */
        '<g' + A('muncul', 0, 900) + '><path d="M170 238 280 150 390 238z"' + F('atap') + '/>' +
          '<rect x="190" y="236" width="180" height="136"' + F('rumah') + '/>' +
          '<rect x="208" y="262" width="62" height="56" rx="3" fill="url(#' + P + 'jd)"/>' +
          sosok(226, 318, 40) + sosok(246, 318, 36) + sosok(259, 318, 22, 'siluet-2') +
          '<rect x="298" y="262" width="52" height="44" rx="3" fill="url(#' + P + 'jd)"' + A('nafas', 0, 2400) + '/>' +
          '<rect x="296" y="318" width="40" height="54" rx="3"' + F('kusen') + '/></g>' +
        /* perisai membentuk kubah */
        '<path d="M96 372C96 150 190 64 280 64S464 150 464 372"' + F('perisai', 'fill-opacity:.14') + A('muncul', 1800, 1200) + '/>' +
        '<path d="M96 372C96 150 190 64 280 64S464 150 464 372"' + S('perisai', 5) + PL + A('tulis', 500, 1800) + '/>' +
        '<g' + A('skala', 1700, 700) + '><path d="M280 92c14 6 27 8 38 8 0 38-12 62-38 75-26-13-38-37-38-75 11 0 24-2 38-8z"' + F('perisai') + '/>' +
          '<path d="M266 132l10 10 18-20"' + S('kertas', 4) + '/></g>' +
        /* dua risiko */
        '<g' + A('geser', 2600, 700) + '><rect x="0" y="160" width="150" height="40" rx="20"' + F('label') + '/>' +
          '<path d="M12 181h8l4-9 5 17 4-11 3 3h6"' + S('aksen', 2.5) + '/>' + teks(50, 185, 'Penyakit kritis', 12, 'label-teks', ' font-weight="800"') + '</g>' +
        '<g' + A('geser', 4400, 700) + '><rect x="406" y="122" width="154" height="40" rx="20"' + F('label') + '/>' +
          '<rect x="420" y="134" width="20" height="16" rx="3"' + S('emas', 2.5) + '/><path d="M426 134v-4h8v4"' + S('emas', 2.5) + '/>' +
          teks(448, 147, 'Pencari nafkah', 12, 'label-teks', ' font-weight="800"') + '</g>';
    }
  };
  /* 6. Rantai tiga generasi — "Generasi Sandwich" (arah visual pilihan
     pemilik: ilustrasi ekspresif). Orang tua di roti atas penuh harap,
     "aku" terhimpit di tengah — cemas, berkeringat, lengan gemetar menahan
     roti — anak-anak ceria di bawah. Gelembung kata muncul bergantian,
     tagihan datang, lalu rantai mengikat sandwich. Satu-satunya scene
     bertokoh berwajah; scene lain tetap siluet. */
  function rotiGaya(P) { return ' style="fill:url(#' + P + 'rt);stroke:var(--sw-kerak);stroke-width:4;stroke-linejoin:round"'; }
  /* wajah bulat: suasana 'cemas' | 'senyum' | 'harap' */
  function wajah(x, y, r, suasana, o) {
    o = o || {};
    var ex = r * 0.36, ey = y - r * 0.06, s = '';
    s += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + F('kulit') + '/>';
    s += o.rambut || '';
    if (suasana === 'senyum') {
      s += '<path d="M' + (x - ex - r * 0.17) + ' ' + ey + 'q' + (r * 0.17) + ' ' + (-r * 0.22) + ' ' + (r * 0.34) + ' 0M' + (x + ex - r * 0.17) + ' ' + ey + 'q' + (r * 0.17) + ' ' + (-r * 0.22) + ' ' + (r * 0.34) + ' 0"' + S('rambut', 2.4) + '/>';
      s += '<path d="M' + (x - r * 0.34) + ' ' + (y + r * 0.24) + 'Q' + x + ' ' + (y + r * 0.78) + ' ' + (x + r * 0.34) + ' ' + (y + r * 0.24) + 'Z"' + F('mulut') + '/>';
    } else if (suasana === 'harap') {
      s += '<g' + A('kedipMata', 900, 3600) + '><circle cx="' + (x - ex) + '" cy="' + ey + '" r="' + (r * 0.09) + '"' + F('rambut') + '/><circle cx="' + (x + ex) + '" cy="' + ey + '" r="' + (r * 0.09) + '"' + F('rambut') + '/></g>';
      s += '<path d="M' + (x - ex - r * 0.16) + ' ' + (ey - r * 0.26) + 'q' + (r * 0.16) + ' ' + (-r * 0.12) + ' ' + (r * 0.32) + ' 0M' + (x + ex - r * 0.16) + ' ' + (ey - r * 0.26) + 'q' + (r * 0.16) + ' ' + (-r * 0.12) + ' ' + (r * 0.32) + ' 0"' + S('uban-gelap', 2) + '/>';
      s += '<path d="M' + (x - r * 0.24) + ' ' + (y + r * 0.42) + 'q' + (r * 0.24) + ' ' + (r * 0.2) + ' ' + (r * 0.48) + ' 0"' + S('mulut', 2.2) + '/>';
    } else {
      /* cemas: mata lebar, alis naik di tengah, mulut meringis */
      s += '<g' + A('kedipMata', 700, 2600) + '>' +
        '<ellipse cx="' + (x - ex) + '" cy="' + ey + '" rx="' + (r * 0.19) + '" ry="' + (r * 0.24) + '"' + F('putih') + '/>' +
        '<ellipse cx="' + (x + ex) + '" cy="' + ey + '" rx="' + (r * 0.19) + '" ry="' + (r * 0.24) + '"' + F('putih') + '/>' +
        '<circle cx="' + (x - ex + r * 0.03) + '" cy="' + (ey + r * 0.04) + '" r="' + (r * 0.1) + '"' + F('rambut') + '/>' +
        '<circle cx="' + (x + ex - r * 0.03) + '" cy="' + (ey + r * 0.04) + '" r="' + (r * 0.1) + '"' + F('rambut') + '/></g>';
      s += '<path d="M' + (x - ex - r * 0.22) + ' ' + (ey - r * 0.3) + 'L' + (x - ex + r * 0.2) + ' ' + (ey - r * 0.44) +
        'M' + (x + ex + r * 0.22) + ' ' + (ey - r * 0.3) + 'L' + (x + ex - r * 0.2) + ' ' + (ey - r * 0.44) + '"' + S('rambut', 2.6) + '/>';
      s += '<path d="M' + (x - r * 0.34) + ' ' + (y + r * 0.42) + 'Q' + x + ' ' + (y + r * 0.2) + ' ' + (x + r * 0.34) + ' ' + (y + r * 0.42) +
        'Q' + x + ' ' + (y + r * 0.7) + ' ' + (x - r * 0.34) + ' ' + (y + r * 0.42) + 'Z"' + F('mulut') + '/>';
      s += '<path d="M' + (x - r * 0.24) + ' ' + (y + r * 0.36) + 'h' + (r * 0.48) + '"' + S('putih', 2) + '/>';
    }
    if (suasana !== 'cemas') s += '<circle cx="' + (x - r * 0.56) + '" cy="' + (y + r * 0.2) + '" r="' + (r * 0.14) + '"' + F('pipi', 'opacity:.6') + '/>' +
      '<circle cx="' + (x + r * 0.56) + '" cy="' + (y + r * 0.2) + '" r="' + (r * 0.14) + '"' + F('pipi', 'opacity:.6') + '/>';
    if (o.kacamata) s += '<circle cx="' + (x - ex) + '" cy="' + ey + '" r="' + (r * 0.25) + '"' + S('pena', 1.8) + '/><circle cx="' + (x + ex) + '" cy="' + ey + '" r="' + (r * 0.25) + '"' + S('pena', 1.8) + '/>' +
      '<path d="M' + (x - ex + r * 0.25) + ' ' + ey + 'h' + (2 * ex - r * 0.5) + '"' + S('pena', 1.8) + '/>';
    if (o.kumis) s += '<path d="M' + (x - r * 0.36) + ' ' + (y + r * 0.34) + 'q' + (r * 0.18) + ' ' + (-r * 0.2) + ' ' + (r * 0.36) + ' -0.02q' + (r * 0.18) + ' ' + (-r * 0.18) + ' ' + (r * 0.36) + ' 0.02q' + (-r * 0.36) + ' ' + (r * 0.12) + ' ' + (-r * 0.72) + ' 0z"' + F('uban') + '/>';
    return s;
  }
  /* gelembung kata; sisi ekor: 'bawah' | 'kiri' | 'kanan' */
  function balon(x, y, w, baris, sisi, ex, ey, t) {
    var h = 12 + baris.length * 15, ekor;
    if (sisi === 'kiri') ekor = 'M' + x + ' ' + (y + h / 2 - 7) + 'L' + ex + ' ' + ey + 'L' + x + ' ' + (y + h / 2 + 7) + 'Z';
    else if (sisi === 'kanan') ekor = 'M' + (x + w) + ' ' + (y + h / 2 - 7) + 'L' + ex + ' ' + ey + 'L' + (x + w) + ' ' + (y + h / 2 + 7) + 'Z';
    else ekor = 'M' + (ex - 8) + ' ' + (y + h) + 'L' + ex + ' ' + ey + 'L' + (ex + 8) + ' ' + (y + h) + 'Z';
    return '<g class="sgw-balon"' + A('skala', t, 500) + '>' +
      '<path d="' + ekor + '"' + F('label') + '/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="14"' + FS('label', 'kertas-garis', 1.5) + '/>' +
      baris.map(function (b, k) { return teks(x + w / 2, y + 19 + k * 15, b, 12.5, 'label-teks', ' text-anchor="middle" font-weight="700"'); }).join('') + '</g>';
  }
  function badan(x, y0, w, h, warna) {
    return '<path d="M' + (x - w) + ' ' + y0 + 'C' + (x - w) + ' ' + (y0 - h) + ' ' + (x + w) + ' ' + (y0 - h) + ' ' + (x + w) + ' ' + y0 + 'Z"' + F(warna) + '/>';
  }
  function topi(x, y, r, warna) {   /* rambut menutup ubun-ubun */
    return '<path d="M' + (x - r) + ' ' + (y - r * 0.05) + 'C' + (x - r * 1.06) + ' ' + (y - r * 1.3) + ' ' + (x + r * 1.06) + ' ' + (y - r * 1.3) + ' ' + (x + r) + ' ' + (y - r * 0.05) +
      'C' + (x + r * 0.7) + ' ' + (y - r * 0.62) + ' ' + (x - r * 0.7) + ' ' + (y - r * 0.62) + ' ' + (x - r) + ' ' + (y - r * 0.05) + 'Z"' + F(warna) + '/>';
  }
  function rambutAku(x, y, r) {
    var t = [[-1.04, -0.1], [-0.82, -0.66], [-0.56, -0.36], [-0.3, -0.8], [0, -0.42], [0.26, -0.82], [0.52, -0.38], [0.8, -0.64], [1.04, -0.1]];
    return '<path d="M' + (x - r * 1.04) + ' ' + (y - r * 0.1) + 'C' + (x - r * 1.2) + ' ' + (y - r * 1.5) + ' ' + (x + r * 1.2) + ' ' + (y - r * 1.5) + ' ' + (x + r * 1.04) + ' ' + (y - r * 0.1) +
      t.slice().reverse().map(function (p) { return 'L' + (x + r * p[0]).toFixed(1) + ' ' + (y + r * p[1]).toFixed(1); }).join('') + 'Z"' + F('rambut') + '/>';
  }
  ADEGAN[6] = {
    latar: function (P) { return latarLuar(P, { surya: 360, suryaX: 480, benih: 8 }); },
    objek: function (P) {
      var wijen = [[170, 122], [226, 108], [300, 106], [366, 112], [410, 128], [200, 142], [270, 130], [340, 136], [392, 150]].map(function (w) {
        return '<ellipse cx="' + w[0] + '" cy="' + w[1] + '" rx="6" ry="2.6"' + F('roti-1', 'opacity:.9') + '/>';
      }).join('');
      function isian(x1, x2) {
        var d = 'M' + x1 + ' 252';
        for (var x = x1; x + 20 <= x2; x += 20) d += ' q5 -10 10 0 t10 0';
        return '<path d="' + d + ' L' + x2 + ' 266 H' + x1 + 'Z"' + F('selada') + '/>' +
          '<rect x="' + (x1 + 4) + '" y="256" width="' + (x2 - x1 - 8) + '" height="9" rx="4.5"' + F('tomat') + '/>';
      }
      var AX = 280, AY = 214, AR = 32;                 /* aku */
      var NX = 222, NY = 64, NR = 25, KX = 338, KY = 64, KR = 26;   /* nenek, kakek */
      var PX = 196, PY = 330, PR = 25, LX = 364, LY = 332, LR = 24; /* anak */
      return '<defs><linearGradient id="' + P + 'rt" x1="0" y1="0" x2="0" y2="1">' + stopW(0, 'roti-1') + stopW(1, 'roti-2') + '</linearGradient></defs>' +
        /* rantai yang mengikat sandwich (muncul terakhir) */
        rantai(72, 104, 72, 300, 9, 'rantai', A('tulisGrup', 6200, 1100)) +
        /* roti bawah */
        '<g' + A('muncul', 0, 700) + '><path d="M90 276Q90 262 106 262H454Q470 262 470 276V308Q470 324 452 324H108Q90 324 90 308Z"' + rotiGaya(P) + '/></g>' +
        /* aku: terhimpit, cemas, lengan menahan roti atas */
        '<g class="sgw-isian"' + A('himpit', 1900, 900) + '><g' + A('muncul', 250, 700) + '>' +
          badan(AX, 272, 46, 50, 'hoodie') +
          '<g' + A('getar', 2000, 110) + '><path d="M244 250L126 200M316 250L434 200"' + S('hoodie', 22) + '/>' +
            '<circle cx="118" cy="194" r="13"' + F('kulit') + '/><circle cx="442" cy="194" r="13"' + F('kulit') + '/></g>' +
          wajah(AX, AY, AR, 'cemas', { rambut: rambutAku(AX, AY, AR) }) +
          teks(AX, 268, 'AKU', 14, 'putih', ' text-anchor="middle" font-weight="900" letter-spacing="1.5"') +
          isian(94, 232) + isian(328, 466) +
        '</g></g>' +
        /* keringat & tanda tekanan */
        '<g' + A('skala', 2300, 400) + '><path d="M318 196c5 8 8 12 8 16a8 8 0 0 1-16 0c0-4 3-8 8-16z"' + F('keringat') + A('tetes', 2400, 1300) + '/>' +
          '<path d="M244 204c4 6 6 10 6 13a6 6 0 0 1-12 0c0-3 2-7 6-13z"' + F('keringat') + A('tetes', 3000, 1500) + '/>' +
          '<path d="M232 186l-12-8M328 186l12-8M226 206h-14M334 206h14"' + S('emas', 3) + '/></g>' +
        /* roti atas + orang tua penuh harap (turun lalu menekan) */
        '<g class="sgw-atas"' + A('tekanAtas', 1900, 900) + '><g' + A('jatuh', 700, 900) + '>' +
          badan(NX, 112, 30, 36, 'ungu') + wajah(NX, NY, NR, 'harap', {
            rambut: '<circle cx="' + NX + '" cy="' + (NY - NR * 1.12) + '" r="' + (NR * 0.48) + '"' + F('uban') + '/>' + topi(NX, NY, NR, 'uban'), kacamata: true }) +
          '<circle cx="' + (NX - 20) + '" cy="' + (NY + 20) + '" r="8"' + F('kulit') + '/><circle cx="' + (NX + 20) + '" cy="' + (NY + 20) + '" r="8"' + F('kulit') + '/>' +
          badan(KX, 112, 32, 36, 'hijau-baju') + wajah(KX, KY, KR, 'harap', {
            rambut: '<path d="M' + (KX - KR * 0.95) + ' ' + KY + 'C' + (KX - KR * 1.08) + ' ' + (KY - KR * 0.6) + ' ' + (KX - KR * 0.8) + ' ' + (KY - KR * 0.86) + ' ' + (KX - KR * 0.5) + ' ' + (KY - KR * 0.8) +
              'M' + (KX + KR * 0.95) + ' ' + KY + 'C' + (KX + KR * 1.08) + ' ' + (KY - KR * 0.6) + ' ' + (KX + KR * 0.8) + ' ' + (KY - KR * 0.86) + ' ' + (KX + KR * 0.5) + ' ' + (KY - KR * 0.8) + '"' + S('uban', 7) + '/>', kumis: true }) +
          '<path d="M374 86l5 30"' + S('kayu', 5) + '/><circle cx="373" cy="90" r="8"' + F('kulit') + '/>' +
          '<path d="M90 166Q90 98 280 94Q470 98 470 166Q470 178 456 178H104Q90 178 90 166Z"' + rotiGaya(P) + '/>' + wijen +
        '</g></g>' +
        /* anak-anak ceria di depan roti bawah */
        '<g' + A('muncul', 400, 700) + '>' +
          badan(PX, 380, 32, 40, 'pink') + wajah(PX, PY, PR, 'senyum', {
            rambut: topi(PX, PY, PR, 'rambut') + '<circle cx="' + (PX - PR * 1.12) + '" cy="' + (PY - PR * 0.5) + '" r="' + (PR * 0.42) + '"' + F('rambut') + '/>' +
              '<circle cx="' + (PX + PR * 1.12) + '" cy="' + (PY - PR * 0.5) + '" r="' + (PR * 0.42) + '"' + F('rambut') + '/><circle cx="' + (PX + PR * 0.86) + '" cy="' + (PY - PR * 0.8) + '" r="5"' + F('pink') + '/>' }) +
          '<circle cx="176" cy="366" r="11"' + F('kayu') + '/><circle cx="168" cy="355" r="5"' + F('kayu') + '/><circle cx="184" cy="355" r="5"' + F('kayu') + '/>' +
          badan(LX, 380, 32, 40, 'hijau-baju') + wajah(LX, LY, LR, 'senyum', { rambut: topi(LX, LY, LR, 'rambut') }) +
          '<g transform="rotate(-6 364 362)"><rect x="340" y="350" width="48" height="30" rx="2"' + FS('kertas', 'kertas-garis', 1.5) + '/>' +
            '<path d="M352 372v-9l12-8 12 8v9z"' + S('aksen', 1.8) + '/><circle cx="381" cy="356" r="3.5"' + F('emas') + '/></g>' +
        '</g>' +
        /* tagihan datang */
        '<g' + A('geser', 4600, 600) + '><g' + A('goyang', 5200, 500) + '>' +
          '<rect x="474" y="286" width="84" height="78" rx="4"' + FS('kertas', 'kertas-garis', 1.5) + '/>' +
          '<rect x="474" y="286" width="84" height="20" rx="4"' + F('aksen') + '/>' + teks(516, 300, 'TAGIHAN', 11, 'putih', ' text-anchor="middle" font-weight="900"') +
          teks(516, 322, 'datang', 12, 'tinta', ' text-anchor="middle" font-weight="700"') + teks(516, 337, 'lagi!', 12, 'tinta', ' text-anchor="middle" font-weight="700"') +
          '<path d="M488 350h56"' + S('kertas-garis', 3) + '/></g></g>' +
        /* gelembung kata bergantian */
        balon(0, 6, 160, ['Mama Papa butuh', 'perhatian ya, Nak…'], 'kanan', 196, 46, 2400) +
        balon(0, 300, 136, ['Papa, temenin', 'main yuk!'], 'kanan', 168, 322, 3400) +
        balon(444, 212, 116, ['Capek? Iya.', 'Tapi siapa lagi', 'kalau bukan aku?'], 'kiri', 412, 232, 5400);
    }
  };
  /* 7. Mulai dengan perencanaan */
  ADEGAN[7] = {
    latar: function (P) { return latarKamar(P, { jendela: 'kiri', lampuX: 230, surya: 230, suryaGerak: 'terbit', benih: 13 }); },
    objek: function () {
      var item = [['Kenali kebutuhan'], ['Nilai perlindungan', 'yang sudah ada'], ['Siapkan langkah', 'sesuai kemampuan']], titik = [];
      var daftar = item.map(function (b, k) {
        var y = 196 + k * 56, t = 1200 + k * 1500;
        titik.push('176,' + (y - 6) + ',' + (t - 300), '176,' + (y - 6) + ',' + t, '194,' + (y - 16) + ',' + (t + 500));
        return '<rect x="170" y="' + (y - 16) + '" width="22" height="22" rx="4"' + S('tinta', 2.4) + '/>' +
          teks(206, y, b[0], 16, 'tinta', ' font-weight="700"') + (b[1] ? teks(206, y + 18, b[1], 16, 'tinta', ' font-weight="700"') : '') +
          '<path d="M173 ' + (y - 6) + 'l7 8 14-18"' + S('aksen', 4) + PL + A('tulis', t, 500) + '/>';
      }).join('');
      return '<g' + A('muncul', 0, 900) + '><g transform="rotate(-2 290 260)"><rect x="146" y="128" width="290" height="244" rx="8"' + F('kertas') + '/>' +
          '<path d="M146 166h290"' + S('aksen', 2, 'opacity:.6') + '/>' +
          teks(170, 156, 'Rencana Langkah', 18, 'tinta', ' font-weight="800"') + daftar + '</g></g>' +
        '<g class="sgw-pena"' + A('pena') + ' data-titik="' + titik.join(' ') + '"><path d="M0 0l4-10 70-52 6 8-70 52z"' + F('pena') + '/><path d="M0 0l4-10 6 8z"' + F('emas') + '/></g>' +
        cangkir(60, 330, 'buku-2') +
        /* tunas tumbuh */
        '<g><path d="M462 340h64l-8 32h-48z"' + F('kayu') + '/>' +
          '<path d="M494 340c0-30 2-60-4-90"' + S('daun', 5) + PL + A('tulis', 800, 2600) + '/>' +
          '<path d="M492 300c-24-4-34-18-34-30 18 0 32 10 34 30z"' + F('daun') + A('skala', 2400, 700) + '/>' +
          '<path d="M494 280c20-6 30-22 30-34-18 2-30 14-30 34z"' + F('daun') + A('skala', 3600, 700) + '/>' +
          '<path d="M490 254c-14-8-18-20-16-30 12 4 18 16 16 30z"' + F('daun') + A('skala', 4800, 700) + '/></g>';
    }
  };
  /* 8. Rantai itu putus di aku */
  ADEGAN[8] = {
    latar: function (P) { return latarLuar(P, { surya: 262, suryaX: 480, suryaGerak: 'terbit', rumah: true, benih: 2 }); },
    objek: function () {
      var pecahan = [[-70, -60], [-40, 70], [10, -90], [60, -50], [80, 60], [-90, 20], [30, 90]].map(function (d, k) {
        return '<path d="M280 ' + (212 + (k % 3) * 6) + 'l6-6 6 8-8 4z"' + F('emas') + A('pecah', 2000, 1200) + ' data-dx="' + d[0] + '" data-dy="' + d[1] + '"/>';
      }).join('');
      var sinar = '';
      for (var k = 0; k < 12; k++) {
        var s = k * 30 * Math.PI / 180;
        sinar += 'M' + (280 + Math.cos(s) * 34).toFixed(1) + ' ' + (216 + Math.sin(s) * 34).toFixed(1) + 'L' + (280 + Math.cos(s) * 70).toFixed(1) + ' ' + (216 + Math.sin(s) * 70).toFixed(1);
      }
      return '<circle cx="280" cy="216" r="70"' + F('emas', 'opacity:.55') + A('ledak', 1950, 1300) + '/>' +
        '<path d="' + sinar + '"' + S('emas', 3) + A('skala', 2050, 900) + '/>' +
        /* rantai masa lalu (kiri) tetap, rantai ke depan (kanan) lepas */
        rantai(-20, 216, 252, 216, 10, 'rantai-gelap') +
        '<g' + A('lepas', 2700, 1600) + '>' + rantai(308, 216, 590, 216, 10, 'rantai-gelap') + '</g>' +
        /* mata rantai tengah terbelah */
        '<path d="M282 204h-16a12 12 0 0 0 0 24h16"' + S('rantai', 5) + A('belahKiri', 2000, 900) + '/>' +
        '<path d="M278 204h16a12 12 0 0 1 0 24h-16"' + S('rantai', 5) + A('belahKanan', 2000, 900) + '/>' +
        pecahan +
        '<g' + A('skala', 3600, 900) + '>' + hati(280, 300, 1.1) + '</g>';
    }
  };

  /* ----- gerak deklaratif ----- */
  var GERAK = {
    muncul: [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
    skala: [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.7 }, { opacity: 1, transform: 'none' }],
    geser: [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }],
    naikMasuk: [{ opacity: 0, transform: 'translateY(60px)' }, { opacity: 1, transform: 'none' }],
    jatuh: [{ opacity: 0, transform: 'translateY(-150px)' }, { opacity: 1, transform: 'translateY(8px)', offset: 0.72 }, { opacity: 1, transform: 'none' }],
    koin: [{ opacity: 0, transform: 'translateY(-150px)' }, { opacity: 1, offset: 0.2 }, { opacity: 1, transform: 'translateY(40px)', offset: 0.85 }, { opacity: 0, transform: 'translateY(52px)' }],
    balik: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-50px) rotate(-8deg)' }],
    isi: [{ transform: 'scaleY(.18)' }, { transform: 'scaleY(.62)' }],
    kuras: [{ transform: 'scaleY(.9)' }, { transform: 'scaleY(.32)' }],
    miring: [{ transform: 'none' }, { transform: 'rotate(-12deg)' }],
    himpit: [{ transform: 'none' }, { transform: 'scaleY(.9)' }],
    tekanAtas: [{ transform: 'none' }, { transform: 'translateY(13px)' }],
    lepas: [{ opacity: 1, transform: 'none' }, { opacity: 0.18, transform: 'translate(40px,46px) rotate(8deg)' }],
    belahKiri: [{ transform: 'none' }, { transform: 'translate(-26px,8px) rotate(-24deg)' }],
    belahKanan: [{ transform: 'none' }, { transform: 'translate(26px,-8px) rotate(24deg)' }],
    ledak: [{ opacity: 0, transform: 'scale(0)' }, { opacity: 0.9, transform: 'scale(.8)', offset: 0.35 }, { opacity: 0, transform: 'scale(2.2)' }],
    turun: [{ transform: 'none' }, { transform: 'translateY(110px)' }],
    terbit: [{ transform: 'translateY(90px)' }, { transform: 'none' }],
    tulis: [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }]
  };
  /* gerak yang berakhir di luar keadaan dasar → isi 'both' */
  var TETAP = { isi: 1, kuras: 1, miring: 1, himpit: 1, tekanAtas: 1, lepas: 1, belahKiri: 1, belahKanan: 1, turun: 1, terbit: 1, balik: 1, koin: 1, ledak: 1, pecah: 1 };
  var ULANG = {
    uap: [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 0.8, offset: 0.4 }, { opacity: 0, transform: 'translateY(-26px)' }],
    kedip: [{ opacity: 0.25 }, { opacity: 1 }],
    debu: [{ opacity: 0.15, transform: 'none' }, { opacity: 0.95, transform: 'translate(7px,-16px)' }],
    nafas: [{ opacity: 0.72 }, { opacity: 1 }],
    naik: [{ opacity: 0, transform: 'translateY(0) scale(.6)' }, { opacity: 1, offset: 0.3 }, { opacity: 0, transform: 'translateY(-90px) scale(1.1)' }],
    tetes: [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(46px)' }],
    hujan: [{ transform: 'translateY(-60px)' }, { transform: 'translateY(60px)' }],
    ekg: [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    awan: [{ transform: 'none' }, { transform: 'translateX(34px)' }],
    kedipMata: [{ transform: 'none' }, { transform: 'scaleY(.1)', offset: 0.05 }, { transform: 'none', offset: 0.1 }, { transform: 'none' }],
    getar: [{ transform: 'translateX(-1.4px)' }, { transform: 'translateX(1.4px)' }],
    goyang: [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }]
  };
  var BOLAK = { kedip: 1, debu: 1, nafas: 1, awan: 1, getar: 1, goyang: 1 };
  var LINEAR = { hujan: 1, ekg: 1, getar: 1 };

  /* gerak berulang dibatasi sepanjang scene (bukan tak berujung) sehingga ikut
     timeline: pause/seek pemutar dan render video (tools/video/render-video.mjs)
     menggerakkannya juga; gerak dikurangi → tidak dibuat (sama dengan ambient) */
  function gerakkan(tl, el, akhir) {
    var j = el.getAttribute('data-a'), t = +el.getAttribute('data-t') || 0, d = +el.getAttribute('data-d') || 800;
    if (ULANG[j]) {
      if (tl.tanpaAmbient) return;
      var kali = Math.floor((akhir - t) / d);
      if (kali < 1) return;
      tl.add(el, ULANG[j], { duration: d, delay: t, iterations: kali, fill: 'none', direction: BOLAK[j] ? 'alternate' : 'normal', easing: LINEAR[j] ? 'linear' : 'ease-in-out' });
      return;
    }
    if (j === 'pena') {
      /* titik "x,y,t": posisi ujung pena pada waktu t (md, sejak awal scene) */
      var titik = (el.getAttribute('data-titik') || '').split(' ').map(function (p) { return p.split(',').map(Number); });
      if (titik.length < 2) return;
      var t0 = titik[0][2], lama = Math.max(1, titik[titik.length - 1][2] - t0);
      var akhir = titik[titik.length - 1], lamaTotal = lama + 600;
      var kf = titik.map(function (p) { return { transform: 'translate(' + p[0] + 'px,' + p[1] + 'px)', opacity: 1, offset: (p[2] - t0) / lamaTotal }; });
      /* sesudah selesai menulis, pena diletakkan (memudar) agar tidak menutupi tulisan */
      kf.push({ transform: 'translate(' + (akhir[0] + 18) + 'px,' + (akhir[1] + 10) + 'px)', opacity: 0, offset: 1 });
      tl.add(el, kf, { duration: lamaTotal, delay: t0, easing: 'linear', fill: 'both' });
      return;
    }
    if (j === 'tulisGrup') {
      Array.prototype.forEach.call(el.children, function (c, k) {
        tl.add(c, GERAK.tulis, { duration: Math.max(200, d / 2), delay: t + k * (d / Math.max(1, el.children.length)), easing: EASE });
      });
      return;
    }
    if (j === 'pecah') {
      var dx = +el.getAttribute('data-dx') || 0, dy = +el.getAttribute('data-dy') || 0;
      tl.add(el, [{ opacity: 0, transform: 'none' }, { opacity: 1, offset: 0.1 }, { opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 3) + 'deg)' }],
        { duration: d, delay: t, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
      return;
    }
    var kf2 = GERAK[j];
    if (!kf2) return;
    tl.add(el, kf2, { duration: d, delay: t, easing: j === 'tulis' ? 'cubic-bezier(.45,.05,.3,1)' : EASE, fill: TETAP[j] ? 'both' : 'backwards' });
  }

  function animasi(tl, stage, n, K) {
    var st = satu(stage, '.sgw-stage');
    semua(st, '[data-a]').forEach(function (el) { gerakkan(tl, el, K.akhir); });
    /* kamera: dorongan pelan sepanjang scene */
    var kamera = satu(st, '.sgw-kamera');
    if (kamera) tl.add(kamera, [{ transform: 'scale(1.0)' }, { transform: 'scale(1.045)' }], { duration: K.akhir, easing: 'linear', fill: 'both' });
    muncul(tl, satu(st, '.sgw-layar-utama'), 500, 900, 'translateY(16px)');
    muncul(tl, satu(st, '.sgw-layar-pendukung'), 1500, 800);
    muncul(tl, satu(stage, '.sgw-title'), 150, 560);
    muncul(tl, satu(stage, '.sgw-isi'), 380, 620);
  }

  /* ---------------- latar media (opsional) ---------------- */
  function media(n) {
    var m = window.PSGSandwichVisual, s = m && m.scene && m.scene['S' + dua(n)];
    if (!s) return '';
    var folder = m.folder || '';
    if (s.video) {
      return '<video class="sgw-media" src="' + esc(folder + s.video) + '"' + (s.poster ? ' poster="' + esc(folder + s.poster) + '"' : '') +
        ' muted playsinline autoplay loop preload="metadata" aria-hidden="true"></video>';
    }
    if (s.gambar) return '<img class="sgw-media" src="' + esc(folder + s.gambar) + '" alt="" aria-hidden="true">';
    return '';
  }

  /* ---------------- kerangka scene ---------------- */
  function kerangka(opsi, i) {
    var n = i + 1, sc = SCENE[i], m = media(n), P = 'sgw' + n + '-';
    return '<div class="sgw" data-sgw="' + n + '" data-ketuk="0">' + (opsi.header || '') +
      '<div class="sgw-body">' +
        '<figure class="sgw-stage sgw-' + sc.suasana + ' sgw-a' + n + (m ? ' sgw-ada-media' : '') + '" role="img" aria-label="' + esc('Scene ' + n + ': ' + sc.judul + '. ' + ARIA[i]) + '">' +
          '<div class="sgw-latar"></div>' + m +
          '<div class="sgw-kamera">' +
            '<svg class="sgw-latar-svg" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + ADEGAN[n].latar(P) + '</svg>' +
            '<svg class="sgw-motif sgw-motif-' + sc.motif + '" viewBox="0 0 560 380" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' + ADEGAN[n].objek(P) + '</svg>' +
          '</div>' +
          '<div class="sgw-cahaya"></div>' +
          '<div class="sgw-butir"></div>' +
          '<div class="sgw-layar">' +
            '<p class="sgw-layar-utama">' + esc(sc.layar) + '</p>' +
            (sc.pendukung ? '<p class="sgw-layar-pendukung">' + esc(sc.pendukung) + '</p>' : '') +
          '</div>' +
        '</figure>' +
        '<div class="sgw-text">' +
          '<span class="sgw-kicker">SANDWICH GENERATION • ' + n + '/' + JUMLAH + '</span>' +
          '<h3 class="sgw-title">' + esc(sc.judul) + '</h3>' +
          '<p class="sgw-isi">' + esc(NARASI[i].join(' ')) + '</p>' +
        '</div>' +
      '</div></div>';
  }

  var N = null;
  function adegan(opsi) {
    var o = opsi || {};
    N = window.PSGNarasi || null;
    if (N) {
      /* tanpa manifest rekaman → suara browser (Web Speech) lewat narator bersama */
      N.daftar('.sgw', 'data-sgw', NARASI, N.rekamanDari ? N.rekamanDari(window.PSGSandwichAudio, NARASI) : null);
      N.pasang();
      o = Object.assign({}, o, { header: N.tombol(o.header || '') });
    }
    return SCENE.map(function (sc, i) {
      var n = i + 1;
      return {
        id: 'sandwich-' + n,
        fit: true,
        siapDi: 'akhir',
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, i);
          if (N) N.tandai();
        },
        animate: function (tl, stage) {
          var node = satu(stage, '.sgw'), K = ketukan(n);
          animasi(tl, stage, n, K);
          if (!node) return;
          /* jam scene sepanjang narasi, dan penanda ketukan untuk narator */
          tl.add(node, [], { duration: K.akhir });
          tl.tick(function (t) {
            var k = 0;
            while (k < K.B.length && K.B[k] <= t) k++;
            if (node.getAttribute('data-ketuk') !== String(k)) node.setAttribute('data-ketuk', k);
          });
        }
      };
    });
  }

  /* ============================================================
     Halaman pilihan sesudah video
     ============================================================ */
  var PILIHAN = [
    { kode: 'A', judul: 'Belum tahu harus mulai dari mana',
      isi: 'Petakan kondisi finansial dan tentukan kebutuhan yang perlu diprioritaskan.',
      tombol: 'Petakan Kebutuhan Saya', target: 'SEGITIGA', topik: 'segitiga' },
    { kode: 'B', judul: 'Saya ingin menyiapkan masa pensiun',
      isi: 'Hitung kebutuhan dana hari tua agar rencana pensiun tidak bergantung pada penghasilan anak.',
      tombol: 'Hitung Kebutuhan Dana Pensiun', target: 'DP', topik: 'pensiun' },
    { kode: 'C', judul: 'Saya khawatir biaya kesehatan membebani keluarga',
      isi: 'Evaluasi alternatif perlindungan kesehatan yang sesuai dengan kebutuhan dan kondisi keluarga.',
      tombol: 'Pilih Tools Perlindungan Kesehatan', kesehatan: true },
    { kode: 'D', judul: 'Saya ingin mengantisipasi risiko penyakit kritis',
      isi: 'Evaluasi kebutuhan dana jika penyakit kritis memengaruhi penghasilan atau kondisi finansial keluarga.',
      tombol: 'Analisis Kebutuhan Penyakit Kritis', target: 'NEEDS', topik: 'penyakit_kritis', fokus: ['naCI', 'naCIMonths'] },
    { kode: 'E', judul: 'Saya ingin melindungi keluarga jika saya meninggal',
      isi: 'Evaluasi kebutuhan finansial keluarga jika pencari nafkah meninggal.',
      tombol: 'Analisis Perlindungan Keluarga', target: 'NEEDS', topik: 'perlindungan_keluarga', fokus: ['naCoverage', 'naMasaPengganti'] }
  ];
  /* Tiga tools kombinasi kesehatan yang sudah ada. Nama dan keterangan
     dibaca dari daftar layar resmi (core.js) saat ditampilkan. */
  var KESEHATAN = [
    { kode: 'GSPA', alternatif: 'Alternatif 1', rider: 'gRider', catatan: 'Rider kesehatan GHPS dipilih saat tools terbuka. Waiver tetap opsional. Kelayakan, plan, dan kontribusi mengikuti aturan produk di tools.' },
    { kode: 'BSL', alternatif: 'Alternatif 2', rider: 'bRider', catatan: 'Rider kesehatan GHP dipilih saat tools terbuka; plan GHP dipilih di tools. Kelayakan dan premi mengikuti aturan produk.' },
    { kode: 'GHP', alternatif: 'Alternatif 3', rider: 'hRider', catatan: 'Rider GHP dipastikan aktif saat tools terbuka. Kelayakan, plan, dan premi mengikuti aturan produk.' }
  ];

  function layarResmi(kode) {
    var nav = window.InsuranceHubNavigation, L = nav && nav.LAYAR && nav.LAYAR[kode];
    return L ? { judul: L.judul || kode, sub: L.sub || '', el: L.el || '' } : null;
  }

  /* --- tindak lanjut sesudah Profil (hanya di memori) --- */
  var tindak = null, pengamat = null;
  function layarAktif() { var a = document.querySelector('section.layar.aktif'); return a ? a.id : ''; }
  function hentikanPengamat() { if (pengamat) { pengamat.disconnect(); pengamat = null; } }
  function jalankan(t) {
    if (t.rider) {
      var ya = document.querySelector('#' + t.rider + ' button[data-nilai="Ya"]');
      if (ya && ya.getAttribute('aria-pressed') !== 'true' && !ya.disabled) ya.click();
    }
    if (t.fokus && t.fokus.length) {
      var kolom = t.fokus.map(function (id) { var x = document.getElementById(id); return x && (x.closest('div') || x); }).filter(Boolean);
      if (kolom[0] && kolom[0].scrollIntoView) kolom[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      kolom.forEach(function (k) {
        k.classList.add('sgw-sorot');
        setTimeout(function () { k.classList.remove('sgw-sorot'); }, 4000);
      });
    }
    terakhir = { target: t.target, rider: t.rider || '', fokus: (t.fokus || []).slice() };
  }
  var terakhir = null;
  function periksaTindak() {
    if (!tindak) { hentikanPengamat(); return; }
    var id = layarAktif(), L = layarResmi(tindak.target);
    if (id === 'layarProfile') return;            // masih memilih/menyimpan profil
    var t = tindak; tindak = null; hentikanPengamat();
    if (L && id === L.el) setTimeout(function () { jalankan(t); }, 80);
  }
  function pasangTindak(t) {
    tindak = t;
    hentikanPengamat();
    if (!t || !window.MutationObserver) return;
    pengamat = new MutationObserver(periksaTindak);
    pengamat.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    periksaTindak();
  }

  function buka(target, topik, ekstra, sebelum) {
    var P = window.InsuranceHubCustomerProfile;
    if (!P || typeof P.bukaUntuk !== 'function' || !layarResmi(target)) return false;
    if (typeof sebelum === 'function') sebelum();
    var ok = P.bukaUntuk({ source: 'sales_idea', topic: 'sandwich_generation/' + topik, target: target });
    pasangTindak(ok ? Object.assign({ target: target }, ekstra || {}) : null);
    return ok;
  }

  function htmlUtama() {
    return '<div class="sgw-pilihan-isi" data-sgw-tampilan="utama">' +
      '<h2 class="sgw-pilihan-judul" id="sgwPilihanJudul">Rantai Itu Putus di Aku. Mulai dari Mana?</h2>' +
      '<p class="sgw-pilihan-pengantar">Setiap keluarga memiliki kondisi finansial dan kebutuhan yang berbeda. Pilih hal yang paling ingin Anda siapkan terlebih dahulu. Anda tidak harus memutuskan produk sekarang.</p>' +
      '<ol class="sgw-pilihan-daftar">' + PILIHAN.map(function (p) {
        return '<li class="sgw-opsi"><span class="sgw-opsi-huruf" aria-hidden="true">' + p.kode + '</span>' +
          '<div class="sgw-opsi-teks"><h3>' + esc(p.judul) + '</h3><p>' + esc(p.isi) + '</p></div>' +
          '<button type="button" class="sgw-opsi-tombol" data-sgw-pilih="' + p.kode + '">' + esc(p.tombol) + ' <span aria-hidden="true">→</span></button></li>';
      }).join('') + '</ol>' +
      '<div class="sgw-pilihan-kaki"><button type="button" class="sgw-lain" data-sgw-lain>Bahas Topik Lain</button></div>' +
    '</div>';
  }
  function htmlKesehatan() {
    return '<div class="sgw-pilihan-isi" data-sgw-tampilan="kesehatan">' +
      '<h2 class="sgw-pilihan-judul" id="sgwPilihanJudul">Pilih Tools Perlindungan Kesehatan</h2>' +
      '<p class="sgw-pilihan-pengantar">Tiga alternatif kombinasi di bawah ini memiliki manfaat, ketentuan, dan biaya yang berbeda. Ini bukan rekomendasi untuk semua orang; pilihan akhir mengikuti kebutuhan, ketentuan produk, dan kemampuan membayar.</p>' +
      '<ol class="sgw-pilihan-daftar">' + KESEHATAN.map(function (k) {
        var L = layarResmi(k.kode) || { judul: k.kode, sub: '' };
        return '<li class="sgw-opsi"><span class="sgw-opsi-huruf sgw-opsi-alt" aria-hidden="true">' + k.alternatif.slice(-1) + '</span>' +
          '<div class="sgw-opsi-teks"><span class="sgw-opsi-kecil">' + esc(k.alternatif) + '</span><h3>' + esc(L.judul) + '</h3>' +
          '<p>' + esc(L.sub) + '</p><p class="sgw-opsi-catatan">' + esc(k.catatan) + '</p></div>' +
          '<button type="button" class="sgw-opsi-tombol" data-sgw-kesehatan="' + k.kode + '">Buka tools <span aria-hidden="true">→</span></button></li>';
      }).join('') + '</ol>' +
      '<div class="sgw-pilihan-kaki"><button type="button" class="sgw-kembali" data-sgw-kembali>← Kembali ke pilihan</button>' +
      '<button type="button" class="sgw-lain" data-sgw-lain>Bahas Topik Lain</button></div>' +
    '</div>';
  }

  var panel = null, opsiPanel = {};
  function tampilan(nama) {
    if (!panel) return;
    panel.innerHTML = nama === 'kesehatan' ? htmlKesehatan() : htmlUtama();
    panel.setAttribute('data-tampilan', nama === 'kesehatan' ? 'kesehatan' : 'utama');
    panel.scrollTop = 0;
  }
  function buatPanel(opsi) {
    opsiPanel = opsi || {};
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'sgw-pilihan';
    panel.id = 'sgwPilihan';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'sgwPilihanJudul');
    tampilan('utama');
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !panel.contains(b)) return;
      if (b.hasAttribute('data-sgw-lain')) { if (typeof opsiPanel.lain === 'function') opsiPanel.lain(); return; }
      if (b.hasAttribute('data-sgw-kembali')) { tampilan('utama'); return; }
      var kode = b.getAttribute('data-sgw-pilih');
      if (kode) {
        var p = PILIHAN.filter(function (x) { return x.kode === kode; })[0];
        if (!p) return;
        if (p.kesehatan) { tampilan('kesehatan'); return; }
        buka(p.target, p.topik, p.fokus ? { fokus: p.fokus } : null, opsiPanel.tutup);
        return;
      }
      var alat = b.getAttribute('data-sgw-kesehatan');
      if (alat) {
        var k = KESEHATAN.filter(function (x) { return x.kode === alat; })[0];
        if (k) buka(k.kode, 'kesehatan_' + k.kode.toLowerCase(), { rider: k.rider }, opsiPanel.tutup);
      }
    });
    return panel;
  }

  window.PSGSandwichStory = {
    adegan: adegan,
    /* untuk pengujian & dokumen (baca saja) */
    naskah: function () { return NARASI.map(function (s) { return s.slice(); }); },
    scene: function () { return SCENE.map(function (s) { return Object.assign({}, s); }); },
    ketukan: function (n) { var k = ketukan(n); return { B: k.B.slice(), D: k.D.slice(), akhir: k.akhir }; },
    durasi: function () { return SCENE.map(function (_, i) { return ketukan(i + 1).akhir; }); }
  };
  window.PSGSandwichPilihan = {
    buat: buatPanel,
    /* setiap kali halaman pilihan tampil lagi, mulai dari daftar utama */
    reset: function () { tampilan('utama'); },
    pilihan: function () { return PILIHAN.map(function (p) { return { kode: p.kode, judul: p.judul, tombol: p.tombol, target: p.target || null, kesehatan: !!p.kesehatan, fokus: (p.fokus || []).slice() }; }); },
    kesehatan: function () { return KESEHATAN.map(function (k) { return { kode: k.kode, rider: k.rider }; }); },
    tindakLanjut: function () { return tindak ? Object.assign({}, tindak) : null; },
    terakhir: function () { return terakhir ? Object.assign({}, terakhir) : null; }
  };
})();
