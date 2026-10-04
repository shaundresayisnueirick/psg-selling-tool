/* ============================================================
   Sales Idea — Education Planning (interactive story)
   ------------------------------------------------------------
   Metafora: perjalanan pendidikan anak.
   - Tujuan ada di ujung jalan (USIA 0 → USIA 18); biaya nanti
     tidak sama dengan biaya hari ini.
   - SEPEDA: orang tua mengayuh sambil memboncengkan anak. Target
     yang sama dengan waktu lebih pendek = tanjakan lebih curam,
     kayuhan lebih berat dan lebih lambat. Mulai lebih awal =
     jalan landai, kayuhan ringan.
   - TANGGA: menabung sendiri = naik selangkah demi selangkah dan
     bergantung pada kemampuan penopang untuk terus melangkah.
   - LIFT: lantai tujuan (18) ditetapkan sejak awal; walau orang
     tua terlepas dari perjalanan, lift tetap membawa anak ke
     tujuan.

   Sepuluh scene mengikuti 10 langkah educationSteps di
   sales-idea.js dengan urutan yang sama; judul, fokus, dan isi
   diambil dari data itu. Angka hanya yang sudah ada di materi
   (Rp300 JT, ≈ Rp1,0 M, inflasi 7% × 18 tahun, setoran usia 0/5/10).

   Teknik: tiap scene satu SVG (panggung tetap, viewBox mengikuti
   rasio panggung — area inti selalu utuh). Render = keadaan akhir
   (statis, juga untuk gerak dikurangi); animasi bergerak dari awal
   ke keadaan akhir itu. Pose pengayuh dihitung dengan kinematika
   (kaki mengikuti pedal, tangan memegang setang).

   Narasi: dibacakan narator bersama (window.PSGNarasi). Naskah tiap
   scene berupa segmen; tiap segmen punya satu ketukan visual. Durasi
   ketukan = maks(kebutuhan gerak, perkiraan lama narasi segmennya),
   jadi timeline tetap berputar selama narasi berjalan dan PAUSE /
   RESUME berlaku sepanjang narasi. data-ketuk pada node scene memberi
   tahu narator ketukan mana yang sudah mulai.

   API: PSGEducationStory.adegan({ langkah, header, padaLangkah })
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var LEMBUT = 'cubic-bezier(.45,.05,.3,1)';
  var PEGAS = 'cubic-bezier(.34,1.4,.5,1)';
  var RAD = Math.PI / 180;

  /* teks yang sudah tampil pada versi sebelumnya (renderEducation) */
  var CHIP_SETORAN = ['Usia 0 • Rp2,6 jt/bln', 'Usia 5 • Rp4,3 jt/bln', 'Usia 10 • Rp8,2 jt/bln'];

  /* Naskah narasi: satu larik segmen per scene, urutan = ketukan visual.
     Angka hanya yang ada di materi; nominal ditulis "... rupiah" supaya
     dibaca wajar oleh suara Indonesia (sama seperti Retirement). */
  var NARASI = [
    ['Perjalanan pendidikan anak dimulai hari ini, saat anak masih kecil.',
      'Tetapi target pendidikannya ada di masa depan, di ujung jalan ini, saat anak berusia 18 tahun.',
      'Karena itu, mulailah dengan menentukan tujuan dan waktunya.'],
    ['Ini biaya kuliah hari ini.',
      'Tetapi anak baru akan kuliah bertahun-tahun lagi.',
      'Karena ada inflasi, biaya kuliah saat itu tidak sama dengan biaya kuliah hari ini. Nilai uang hari ini berbeda dengan nilainya di masa depan.'],
    ['Contoh ilustrasinya begini. Biaya pendidikan hari ini 300 juta rupiah.',
      'Dengan asumsi inflasi 7 persen per tahun, nilainya terus naik selama 18 tahun.',
      'Nilainya menjadi sekitar 1 miliar rupiah. Target pendidikan pun ikut berubah.'],
    ['Bayangkan persiapan pendidikan seperti mengayuh sepeda menuju tujuan.',
      'Jika mulai lebih awal, jalannya panjang dan landai. Semakin panjang waktu yang tersedia, semakin ringan beban yang perlu disiapkan setiap bulan.'],
    ['Sekarang bandingkan dua perjalanan menuju tujuan yang sama.',
      'Jika mulai saat anak berusia 5 tahun, waktu menuju usia 18 tahun tinggal 13 tahun.',
      'Jalannya lebih pendek, tetapi jauh lebih terjal. Menunda membuat perjalanan terasa lebih berat.'],
    ['Ini contoh ilustrasi dari materi. Jika mulai sejak anak lahir, setorannya sekitar 2,6 juta rupiah per bulan.',
      'Jika mulai saat anak berusia 5 tahun, sekitar 4,3 juta rupiah per bulan.',
      'Jika baru mulai saat anak berusia 10 tahun, sekitar 8,2 juta rupiah per bulan. Semakin dekat waktunya, semakin berat setorannya.'],
    ['Menabung itu seperti menaiki tangga, selangkah demi selangkah, dengan setoran di setiap anak tangga.',
      'Tetapi menabung saja mengandalkan kemampuan kita untuk terus menyetor. Bagaimana jika risiko terjadi di tengah perjalanan?'],
    ['Sekarang bayangkan penopang keluarga tidak bisa lagi melanjutkan di tengah jalan.',
      'Anak masih di tengah tangga, dan sisa perjalanan masih panjang. Tanpa proteksi, perjalanan menuju target pendidikan bisa berhenti ketika kemampuan menabung berhenti.'],
    ['Ada jalan alternatif, yaitu lift. Sejak awal, kita menetapkan lantai tujuannya: lantai 18.',
      'Lift membawa orang tua dan anak naik menuju tujuan itu.',
      'Walaupun terjadi sesuatu pada kita di tengah perjalanan, lift tetap naik.',
      'Mekanisme proteksi dirancang agar tujuan pendidikan tetap memiliki jalur menuju target. Tujuan tetap bisa dicapai.'],
    ['Jadi, perencanaan pendidikan terdiri dari tiga hal: tujuan, waktu, dan proteksi.',
      'Mulai sedini mungkin, hitung kebutuhan dengan realistis, dan pastikan rencana pendidikan memiliki proteksi.']
  ];

  /* Perkiraan lama bicara (kecepatan 0,96): 80 md per huruf dari teks
     yang diucapkan (angka dieja), +300 md tiap pergantian kalimat, +900 md
     jeda segmen. Sengaja lebih longgar dari BAB 1 10 Jari (70 md) supaya
     suara yang sedikit lebih lambat tetap selesai sebelum timeline habis. */
  var MD_HURUF = 80, JEDA_KALIMAT = 300, JEDA_SEGMEN = 900;
  var EJA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function terbilang(n) {
    if (n < 12) return EJA[n];
    if (n < 20) return EJA[n - 10] + ' belas';
    if (n < 100) return EJA[Math.floor(n / 10)] + ' puluh' + (n % 10 ? ' ' + EJA[n % 10] : '');
    if (n < 1000) return (n < 200 ? 'seratus' : EJA[Math.floor(n / 100)] + ' ratus') + (n % 100 ? ' ' + terbilang(n % 100) : '');
    return String(n);
  }
  function diucapkan(t) {
    return String(t).replace(/(\d+)(?:,(\d+))?/g, function (m, a, b) {
      return terbilang(+a) + (b ? ' koma ' + b.split('').map(function (d) { return EJA[+d]; }).join(' ') : '');
    });
  }
  /* lama bicara sebuah potongan teks (tanpa jeda segmen) */
  function lamaBicara(t) {
    var kalimat = (String(t).match(/[.!?](\s|$)/g) || []).length;
    return Math.round(diucapkan(t).length * MD_HURUF) + kalimat * JEDA_KALIMAT;
  }
  function lamaSegmen(t) { return lamaBicara(t) + JEDA_SEGMEN; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function f(v) { return Math.round(v * 100) / 100; }
  function satu(st, sel) { return st.querySelector(sel); }
  function semua(st, sel) { return Array.prototype.slice.call(st.querySelectorAll(sel)); }
  function tokoh(o) { return window.PSGKarakter ? window.PSGKarakter.svg(o) : ''; }
  /* Pengendara sepeda: ukuran nested <svg> lewat atribut, karena tidak
     semua browser menerapkan width/height CSS pada <svg> di dalam SVG
     (tanpa itu tokoh jadi 100% viewport dan lepas dari sepeda). */
  function pengendara(o) { return tokoh(o).replace('<svg class="psg-k', '<svg width="120" height="240" class="psg-k'); }

  /* jejak(tl, el, [[ms, {props}, easingMenujuFrameIni], ...]) — satu jejak per elemen */
  function jejak(tl, el, frames) {
    if (!tl || !el || !frames || !frames.length) return;
    var total = frames[frames.length - 1][0];
    var kunci = {};
    frames.forEach(function (fr) { Object.keys(fr[1]).forEach(function (k) { if (!(k in kunci)) kunci[k] = fr[1][k]; }); });
    var cur = Object.assign({}, kunci), kf = [];
    frames.forEach(function (fr, i) {
      cur = Object.assign({}, cur, fr[1]);
      var k = Object.assign({}, cur, { offset: total ? fr[0] / total : 1 });
      if (i > 0) kf[kf.length - 1].easing = fr[2] || EASE;
      kf.push(k);
    });
    if (kf[0].offset > 0) kf.unshift(Object.assign({}, kf[0], { offset: 0, easing: 'linear' }));
    if (kf.length === 1) kf.push(Object.assign({}, kf[0], { offset: 1 }));
    tl.add(el, kf, { duration: Math.max(1, total), easing: 'linear', fill: 'backwards' });
  }
  function muncul(tl, el, t, d, dari) {
    jejak(tl, el, [[t, { opacity: 0, transform: dari || 'translateY(10px)' }], [t + (d || 520), { opacity: 1, transform: 'none' }]]);
  }
  function pop(tl, el, t, d) { jejak(tl, el, fPop(t, d)); }
  /* bingkai siap pakai — digabung bila satu elemen punya beberapa gerak
     (satu jejak per elemen: jejak yang ditambah belakangan menutupi
     jejak lain pada properti yang sama sepanjang durasinya) */
  function fPop(t, d) { return [[t, { opacity: 0, transform: 'scale(.4)' }], [t + (d || 460), { opacity: 1, transform: 'none' }, PEGAS]]; }
  function fMuncul(t, d, dari) { return [[t, { opacity: 0, transform: dari || 'translateY(10px)' }], [t + (d || 520), { opacity: 1, transform: 'none' }]]; }
  /* denyut penegas: membesar sebentar lalu kembali */
  function fDenyut(t, s) { return [[t, { transform: 'none' }], [t + 300, { transform: 'scale(' + (s || 1.15) + ')' }], [t + 760, { transform: 'none' }, LEMBUT]]; }
  function gambarGaris(tl, el, t, d, e) { jejak(tl, el, [[t, { strokeDashoffset: 1 }], [t + d, { strokeDashoffset: 0 }, e || LEMBUT]]); }
  function jalan(tl, root, mulai, durasi, langkah) {
    if (window.PSGKarakter && root) window.PSGKarakter.jalan(tl, root.querySelector('.psg-k'), { mulai: mulai, durasi: durasi, langkah: langkah });
  }

  /* ---------------- geometri ---------------- */
  function putar(p, c, deg) {
    var r = deg * RAD, s = Math.sin(r), co = Math.cos(r), x = p[0] - c[0], y = p[1] - c[1];
    return [c[0] + x * co - y * s, c[1] + x * s + y * co];
  }
  function kurang(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function sudut(v) { return Math.atan2(v[1], v[0]) / RAD; }
  function bez(p, t) {
    var u = 1 - t;
    return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
      u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]];
  }
  /* dua ruas (paha–betis / lengan atas–bawah): titik sendi tengah */
  function ik(P, F, L1, L2, pilih) {
    var dx = F[0] - P[0], dy = F[1] - P[1], d = Math.sqrt(dx * dx + dy * dy);
    d = Math.max(Math.abs(L1 - L2) + 0.01, Math.min(L1 + L2 - 0.01, d));
    var a = Math.atan2(dy, dx), c = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
    return pilih([P[0] + L1 * Math.cos(a + c), P[1] + L1 * Math.sin(a + c)], [P[0] + L1 * Math.cos(a - c), P[1] + L1 * Math.sin(a - c)]);
  }
  /* jalan berperspektif: poligon dari kurva tengah, lebar mengecil */
  function jalanPoligon(p, w0, w1, n) {
    var kiri = [], kanan = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, a = bez(p, Math.max(0, t - 0.01)), b = bez(p, Math.min(1, t + 0.01)), c = bez(p, t);
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1, w = (w0 + (w1 - w0) * t) / 2;
      kiri.push([c[0] - dy / L * w, c[1] + dx / L * w]); kanan.push([c[0] + dy / L * w, c[1] - dx / L * w]);
    }
    var pts = kiri.concat(kanan.reverse());
    return 'M' + pts.map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join(' L') + ' Z';
  }
  function jalurD(p) { return 'M' + p[0].join(' ') + ' C' + p[1].join(' ') + ', ' + p[2].join(' ') + ', ' + p[3].join(' '); }

  /* ---------------- dunia bersama ---------------- */
  function dunia(o) {
    o = o || {};
    var sx = o.matahari ? o.matahari[0] : 392, sy = o.matahari ? o.matahari[1] : 138;
    return '' +
      '<g class="eps-jauh">' +
        '<circle class="eps-sinar" cx="' + sx + '" cy="' + sy + '" r="110" fill="url(#epsSinar)"/>' +
        '<circle class="eps-matahari" cx="' + sx + '" cy="' + sy + '" r="26"/>' +
        '<path class="eps-bukit-1" d="M-800 300 C -500 282, -200 300, 0 296 C 150 292, 250 244, 360 236 C 440 230, 520 252, 700 262 C 900 276, 1100 270, 1400 280 V900 H-800 Z"/>' +
        (o.bukit === false ? '' : '<path class="eps-bukit-2" d="M-800 344 C -400 336, 0 346, 160 336 C 260 328, 300 252, 380 216 C 420 200, 462 206, 520 232 C 640 282, 900 302, 1400 312 V900 H-800 Z"/>') +
        '<g class="eps-pohon"><path d="M-6 372 V330"/><circle cx="-6" cy="320" r="22"/><circle cx="16" cy="334" r="14"/><path d="M500 372 V336"/><circle cx="500" cy="326" r="20"/></g>' +
      '</g>' +
      '<path class="eps-tanah" d="M-800 372 C -200 366, 200 380, 480 368 C 800 358, 1000 366, 1400 368 V900 H-800 Z"/>';
  }
  function defs() {
    return '<defs>' +
      '<radialGradient id="epsSinar"><stop offset="0" class="eps-st-sinar"/><stop offset="1" class="eps-st-sinar" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="epsHangat" cx=".5" cy=".5" r=".5"><stop offset="0" class="eps-st-hangat"/><stop offset="1" class="eps-st-hangat" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="epsKaca" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="eps-st-kaca-a"/><stop offset="1" class="eps-st-kaca-b"/></linearGradient>' +
    '</defs>';
  }
  /* lencana tujuan: lingkaran "18" + topi wisuda */
  function lencana(x, y, r, kelas) {
    return '<g class="eps-lencana ' + (kelas || '') + '" style="transform-origin:' + x + 'px ' + y + 'px">' +
      '<circle class="eps-lencana-cahaya" cx="' + x + '" cy="' + y + '" r="' + f(r * 1.9) + '" fill="url(#epsHangat)"/>' +
      '<circle class="eps-lencana-bulat" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' +
      '<text class="eps-lencana-angka" x="' + x + '" y="' + f(y + r * 0.36) + '" style="font-size:' + f(Math.max(14, r * 0.95)) + 'px">18</text>' +
      topi(x, y - r - r * 0.18, r * 0.95) +
    '</g>';
  }
  function topi(x, y, s) {
    var k = s / 24;
    return '<g class="eps-topi" transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(k) + ')">' +
      '<path class="eps-topi-papan" d="M-26 -2 L0 -13 L26 -2 L0 9 Z"/>' +
      '<path class="eps-topi-dasar" d="M-15 3 V11 Q0 19 15 11 V3 L0 9 Z"/>' +
      '<path class="eps-topi-tali" d="M24 -1 V13"/><circle class="eps-topi-rumbai" cx="24" cy="15" r="2.6"/>' +
    '</g>';
  }
  function pil(x, y, teks, kelas, ukuran) {
    var fz = ukuran || 13, w = f(teks.length * fz * 0.62 + fz * 1.6), h = f(fz * 2);
    return '<g class="eps-pil ' + (kelas || '') + '" style="transform-origin:' + x + 'px ' + y + 'px">' +
      '<rect x="' + f(x - w / 2) + '" y="' + f(y - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + f(h / 2) + '"/>' +
      '<text x="' + x + '" y="' + f(y + fz * 0.36) + '" style="font-size:' + fz + 'px">' + esc(teks) + '</text></g>';
  }
  function pil2(x, y, baris, kelas, ukuran) {
    var fz = ukuran || 13, w = f(Math.max.apply(null, baris.map(function (b) { return b.length; })) * fz * 0.64 + fz * 1.6), h = f(fz * 1.25 * baris.length + fz * 0.9);
    return '<g class="eps-pil ' + (kelas || '') + '" style="transform-origin:' + x + 'px ' + y + 'px">' +
      '<rect x="' + f(x - w / 2) + '" y="' + f(y - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + f(fz * 0.9) + '"/>' +
      baris.map(function (b, i) { return '<text x="' + x + '" y="' + f(y - h / 2 + fz * 0.45 + fz * 1.25 * (i + 0.5) + fz * 0.36) + '" style="font-size:' + fz + 'px">' + esc(b) + '</text>'; }).join('') + '</g>';
  }
  function kartu(x, y, baris, kelas, ukuran) {
    var fz = ukuran || [15, 13.5], lebar = Math.max.apply(null, baris.map(function (b, i) { return b.length * (fz[i] || 13) * 0.66; })) + 30;
    var tinggi = 18 + baris.length * 20;
    return '<g class="eps-kartu ' + (kelas || '') + '" style="transform-origin:' + x + 'px ' + y + 'px">' +
      '<rect x="' + f(x - lebar / 2) + '" y="' + f(y - tinggi / 2) + '" width="' + f(lebar) + '" height="' + f(tinggi) + '" rx="14"/>' +
      baris.map(function (b, i) { return '<text class="eps-kartu-' + i + '" x="' + x + '" y="' + f(y - tinggi / 2 + 24 + i * 20) + '" style="font-size:' + (fz[i] || 13) + 'px">' + esc(b) + '</text>'; }).join('') +
    '</g>';
  }

  /* ---------------- tokoh ---------------- */
  var ORTU = { sendi: true, usia: 'dewasa', pakaian: 'santai' };
  var ANAK = { sendi: true, usia: 'anak', pakaian: 'muda', gaya: '--k-muda:#4f8fcf;--k-celana:#3b4a63' };
  /* orang berdiri: kaki di (x, y), skala s, cermin bila arah -1 */
  function orang(kelas, x, y, s, o, arah) {
    var tx = arah === -1 ? x + 61 * s : x - 61 * s;
    return '<g class="eps-orang ' + kelas + '"><g transform="translate(' + f(tx) + ' ' + f(y - 226 * s) + ') scale(' + (arah === -1 ? -s : s) + ' ' + s + ')">' + tokoh(o).replace('<svg class="psg-k', '<svg width="120" height="240" class="psg-k') + '</g></g>';
  }
  /* poros sendi ditulis inline supaya tidak bergantung pada versi CSS */
  var POROS_DEWASA = {
    '.k-atas': [62, 126], '.k-kepala': [63, 46], '.k-lengan-b': [48, 64], '.k-lengan-d': [74, 64], '.k-hasta-b': [48, 90], '.k-hasta-d': [74, 90],
    '.k-kaki-b': [56, 124], '.k-kaki-d': [67, 124], '.k-betis-b': [55, 171.5], '.k-betis-d': [68, 171.5], '.k-tubuh': [61, 230]
  };
  var POROS_ANAK = {
    '.k-atas': [62, 164], '.k-kepala': [62, 100], '.k-lengan-b': [50, 116], '.k-lengan-d': [74, 116], '.k-hasta-b': [50, 134], '.k-hasta-d': [74, 134],
    '.k-kaki-b': [56, 162], '.k-kaki-d': [66, 162], '.k-betis-b': [55.5, 190.5], '.k-betis-d': [66.5, 190.5], '.k-tubuh': [61, 230]
  };
  function pasangPoros(root) {
    semua(root, '.psg-k').forEach(function (k) {
      var P = k.getAttribute('data-usia') === 'anak' ? POROS_ANAK : POROS_DEWASA;
      Object.keys(P).forEach(function (s) { var el = k.querySelector(s); if (el) el.style.transformOrigin = P[s][0] + 'px ' + P[s][1] + 'px'; });
    });
  }
  function gaya(root, peta) {
    Object.keys(peta).forEach(function (sel) {
      var el = satu(root, sel); if (!el) return;
      Object.keys(peta[sel]).forEach(function (p) { el.style[p] = String(peta[sel][p]); });
    });
  }
  function rot(v) { return 'rotate(' + f(v) + 'deg)'; }

  /* ---------------- sepeda + pengayuh + anak dibonceng ----------------
     Koordinat lokal = koordinat tokoh (0..120 × 0..240); titik 0 grup
     gerak = tanah tepat di bawah poros pedal. */
  var SEP = {
    C: [75.5, 196.6], CR: 15, RB: [31.5, 190.6], RD: [137.5, 190.6], R: 34, tanah: 224.6,
    pegang: { b: [104, 101], d: [121, 96] }
  };
  function roda(k, c) {
    var jari = '';
    for (var i = 0; i < 6; i++) { var a = i * 30 * RAD; jari += 'M' + f(c[0] - 29 * Math.cos(a)) + ' ' + f(c[1] - 29 * Math.sin(a)) + ' L' + f(c[0] + 29 * Math.cos(a)) + ' ' + f(c[1] + 29 * Math.sin(a)) + ' '; }
    return '<g class="eps-roda eps-roda-' + k + '" style="transform-origin:' + c[0] + 'px ' + c[1] + 'px">' +
      '<circle class="eps-ban" cx="' + c[0] + '" cy="' + c[1] + '" r="' + SEP.R + '"/>' +
      '<circle class="eps-velg" cx="' + c[0] + '" cy="' + c[1] + '" r="29.5"/>' +
      '<path class="eps-jari" d="' + jari + '"/><circle class="eps-as" cx="' + c[0] + '" cy="' + c[1] + '" r="3.2"/></g>';
  }
  function sepedaSvg(nama, skala) {
    var C = SEP.C;
    return '<g class="eps-sepeda eps-sepeda-' + nama + '" style="transform-origin:0px 0px">' +
      '<g transform="scale(' + skala + ') translate(' + (-C[0]) + ' ' + (-SEP.tanah) + ')">' +
        '<ellipse class="eps-bayang" cx="' + (C[0] + 8) + '" cy="' + (SEP.tanah + 1) + '" rx="86" ry="5"/>' +
        roda('b', SEP.RB) + roda('d', SEP.RD) +
        '<g class="eps-rangka">' +
          '<path class="eps-rak" d="M20 150 H60 M24 150 L31.5 190.6 M52 150 L60 136"/>' +
          '<path d="M' + C.join(' ') + ' L31.5 190.6 L60 136 Z M60 136 L126 124 L' + C.join(' ') + ' M60 136 L58 128 M126 124 L131 142 L137.5 190.6"/>' +
          '<path class="eps-setang" d="M126 124 L118 100 M104 101 L122 95"/>' +
          '<path class="eps-sadel" d="M46 126 H70 Q72 131 66 132 H50 Q44 131 46 126 Z"/>' +
        '</g>' +
        '<g class="eps-engkol" style="transform-origin:' + C[0] + 'px ' + C[1] + 'px"><path d="M' + C.join(' ') + ' h' + SEP.CR + ' M' + C.join(' ') + ' h' + (-SEP.CR) + '"/>' +
          '<rect x="' + (C[0] + SEP.CR - 5) + '" y="' + (C[1] - 2) + '" width="10" height="4" rx="1.5"/><rect x="' + (C[0] - SEP.CR - 5) + '" y="' + (C[1] - 2) + '" width="10" height="4" rx="1.5"/>' +
          '<circle cx="' + C[0] + '" cy="' + C[1] + '" r="6"/></g>' +
        '<g class="eps-bonceng" transform="translate(-21 -16)">' + pengendara(ANAK) + '</g>' +
        '<g class="eps-pengayuh">' + pengendara(ORTU) + '</g>' +
      '</g></g>';
  }
  /* pose pengayuh untuk sudut pedal th, condong badan, dan tunduk kepala */
  function posePengayuh(th, condong, kepala) {
    var r = {};
    [['b', 0, [56, 124], [55, 171.5], [54, 219]], ['d', 180, [67, 124], [68, 171.5], [69, 219]]].forEach(function (s) {
      var a = (th + s[1]) * RAD, F = [SEP.C[0] + SEP.CR * Math.cos(a) - 1, SEP.C[1] + SEP.CR * Math.sin(a) - 5];
      var K = ik(s[2], F, 47.51, 47.51, function (k1, k2) { return k1[0] > k2[0] ? k1 : k2; });
      var paha = sudut(kurang(K, s[2])) - sudut(kurang(s[3], s[2]));
      var betis = sudut(kurang(F, K)) - sudut(kurang(s[4], s[3])) - paha;
      r['.eps-pengayuh .k-kaki-' + s[0]] = paha; r['.eps-pengayuh .k-betis-' + s[0]] = betis;
    });
    [['b', [48, 64]], ['d', [74, 64]]].forEach(function (s) {
      var S = putar(s[1], [62, 126], condong), G = SEP.pegang[s[0]];
      var E = ik(S, G, 26, 30, function (e1, e2) { return e1[1] > e2[1] ? e1 : e2; });
      var atas = sudut(kurang(E, S)) - 90 - condong;
      r['.eps-pengayuh .k-lengan-' + s[0]] = atas;
      r['.eps-pengayuh .k-hasta-' + s[0]] = sudut(kurang(G, E)) - 90 - condong - atas;
    });
    r['.eps-pengayuh .k-atas'] = condong;
    r['.eps-pengayuh .k-kepala'] = kepala;
    return r;
  }
  /* anak dibonceng: duduk, kaki menjuntai, tangan memeluk pinggang */
  var POSE_BONCENG = {
    '.eps-bonceng .k-kaki-b': 'rotate(-38deg)', '.eps-bonceng .k-betis-b': 'rotate(26deg)',
    '.eps-bonceng .k-kaki-d': 'rotate(-30deg)', '.eps-bonceng .k-betis-d': 'rotate(20deg)',
    '.eps-bonceng .k-lengan-b': 'rotate(-62deg)', '.eps-bonceng .k-hasta-b': 'rotate(-18deg)',
    '.eps-bonceng .k-lengan-d': 'rotate(-70deg)', '.eps-bonceng .k-hasta-d': 'rotate(-12deg)',
    '.eps-bonceng .k-atas': 'rotate(8deg)', '.eps-bonceng .k-kepala': 'rotate(-6deg)'
  };
  /* keadaan sepeda di jalan tanjakan: posisi u (0..1) di ruas A→B */
  function keadaanSepeda(seg, tau) {
    var e = seg.ease === 'rata' ? tau : (1 - Math.cos(Math.PI * tau)) / 2;
    var u = seg.u0 + (seg.u1 - seg.u0) * e;
    var A = seg.A, B = seg.B, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.sqrt(dx * dx + dy * dy);
    var th = seg.th0 + 360 * seg.putaran * e;
    var jarak = (u - seg.u0) * L + (seg.jarak0 || 0);
    var bob = seg.berat ? Math.sin(2 * th * RAD) * 1.8 * seg.berat : 0;
    var a = Math.atan2(dy, dx) / RAD;
    /* condong diukur terhadap sepeda: di tanjakan badan makin maju supaya tetap condong ke depan */
    var condong = Math.min(46, seg.condong + Math.abs(a) * 0.6);
    return {
      th: th, x: A[0] + dx * u, y: A[1] + dy * u, a: a,
      roda: jarak / (SEP.R * seg.skala) / RAD, condong: condong + bob, kepala: seg.kepala - (condong - Math.abs(a)) * 0.4 + bob * 0.8
    };
  }
  function petaSepeda(nama, k) {
    var p = posePengayuh(k.th, k.condong, k.kepala), g = {};
    var akar = '.eps-sepeda-' + nama;
    g[akar] = { transform: 'translate(' + f(k.x) + 'px,' + f(k.y) + 'px) rotate(' + f(k.a) + 'deg)' };
    g[akar + ' .eps-roda-b'] = { transform: rot(k.roda) };
    g[akar + ' .eps-roda-d'] = { transform: rot(k.roda) };
    g[akar + ' .eps-engkol'] = { transform: rot(k.th) };
    Object.keys(p).forEach(function (s) { g[akar + ' ' + s] = { transform: rot(p[s]) }; });
    Object.keys(POSE_BONCENG).forEach(function (s) { g[akar + ' ' + s] = { transform: POSE_BONCENG[s] }; });
    return g;
  }
  /* rute sepeda: beberapa ruas berurutan (pindah ruas = pudar-muncul) */
  /* tanda usaha (butir keringat) di kepala pengayuh saat tanjakan berat */
  function keringat(st, nama) {
    var kp = satu(st, '.eps-sepeda-' + nama + ' .eps-pengayuh .k-kepala');
    if (!kp || kp.querySelector('.eps-keringat')) return;
    kp.insertAdjacentHTML('beforeend', '<g class="eps-keringat"><path d="M86 17 q3.4 5.6 0 8.6 q-3.4 -3 0 -8.6 Z"/><path d="M93 27 q2.6 4.4 0 6.8 q-2.6 -2.4 0 -6.8 Z"/></g>');
  }
  function siapkanSepeda(st, nama, segs) {
    var akhir = segs[segs.length - 1];
    if (akhir.berat >= 1) keringat(st, nama);
    var g = petaSepeda(nama, keadaanSepeda(akhir, 1));
    g['.eps-sepeda-' + nama].opacity = 1;
    gaya(st, g);
  }
  function animasiSepeda(tl, st, nama, segs) {
    var T = segs[segs.length - 1].t1, jalur = {};
    function catat(t, k, op) {
      var g = petaSepeda(nama, k);
      Object.keys(g).forEach(function (sel) {
        var kf = Object.assign({}, g[sel]);
        if (sel === '.eps-sepeda-' + nama) kf.opacity = op;
        (jalur[sel] = jalur[sel] || []).push(Object.assign(kf, { offset: Math.min(1, Math.max(0, t / T)) }));
      });
    }
    segs.forEach(function (seg, j) {
      var n = Math.max(12, Math.ceil(seg.putaran * 16));
      if (j === 0) catat(0, keadaanSepeda(seg, 0), 1);
      else {
        var sb = segs[j - 1], kb = keadaanSepeda(sb, 1);
        catat(sb.t1 + 220, kb, 0);
        catat(seg.t0 - 180, keadaanSepeda(seg, 0), 0);
      }
      for (var i = 0; i <= n; i++) { var tau = i / n; catat(seg.t0 + (seg.t1 - seg.t0) * tau, keadaanSepeda(seg, tau), 1); }
    });
    Object.keys(jalur).forEach(function (sel) {
      var el = satu(st, sel);
      if (!el) return;
      var kf = jalur[sel];
      if (kf[kf.length - 1].offset < 1) kf.push(Object.assign({}, kf[kf.length - 1], { offset: 1 }));
      var beda = kf.some(function (x) { return x.transform !== kf[0].transform || x.opacity !== kf[0].opacity; });
      if (beda) tl.add(el, kf, { duration: T, easing: 'linear', fill: 'backwards' });
    });
  }

  /* ---------------- scene 1–3 & 10: jalan menuju tujuan ---------------- */
  var JALUR = [[96, 396], [250, 382], [300, 262], [392, 206]];
  var GOAL = [392, 138];
  function duniaJalan(o) {
    o = o || {};
    var titik = '';
    for (var i = 1; i < 6; i++) { var p = bez(JALUR, i / 6); titik += '<circle class="eps-tonggak eps-tonggak-' + i + '" cx="' + f(p[0]) + '" cy="' + f(p[1] - 1) + '" r="' + f(4.2 - i * 0.45) + '" style="transform-origin:' + f(p[0]) + 'px ' + f(p[1]) + 'px"/>'; }
    return dunia() +
      '<path class="eps-jalan" d="' + jalanPoligon(JALUR, 58, 10, 40) + '"/>' +
      '<path class="eps-jalan-garis" d="' + jalurD(JALUR) + '" pathLength="1"/>' +
      (o.cahaya ? '<path class="eps-jalan-cahaya" d="' + jalurD(JALUR) + '" pathLength="1"/>' : '') +
      titik +
      '<g class="eps-sekolah"><path class="eps-sekolah-dinding" d="M362 214 V190 L392 172 L422 190 V214 Z"/><path class="eps-sekolah-atap" d="M356 192 L392 168 L428 192"/><rect class="eps-sekolah-pintu" x="385" y="198" width="14" height="16" rx="2"/></g>' +
      lencana(GOAL[0], GOAL[1] - 16, 20, 'eps-goal') +
      pil(GOAL[0], 232, 'USIA 18', 'eps-pil-18', 13) +
      '<g class="eps-tiang"><path d="M70 396 V346"/></g>' + pil(70, 334, 'USIA 0', 'eps-pil-0', 13);
  }
  function keluargaDepan(o) {
    o = o || {};
    return '<g class="eps-keluarga">' +
      orang('eps-ortu', 158, 398, 0.66, ORTU) +
      orang('eps-anak', 200, 398, 0.66, ANAK) +
      (o.toga ? '<g class="eps-toga" style="transform-origin:201px 292px">' + topi(201, 291, 12.5) + '</g>' : '') +
    '</g>';
  }

  var S = [];
  S[1] = {
    inti: [20, 40, 460, 410],
    set: function () { return duniaJalan() + keluargaDepan(); },
    siap: function (st) {
      gaya(st, { '.eps-anak .k-lengan-d': { transform: 'rotate(-128deg)' }, '.eps-anak .k-hasta-d': { transform: 'rotate(-8deg)' }, '.eps-ortu .k-kepala': { transform: 'rotate(-5deg)' } });
    },
    /* ketukan: (a) keluarga masuk dari USIA 0 · (b) tujuan di ujung jalan,
       USIA 18, anak menunjuk · (c) tujuan dan waktunya ditegaskan */
    ketuk: [2800, 2400, 1400],
    animate: function (tl, st, K) {
      jejak(tl, satu(st, '.eps-cam'), [[0, { transform: 'translate(0px,-16px) scale(1.08)' }], [2600, { transform: 'none' }, LEMBUT]]);
      jejak(tl, satu(st, '.eps-jalan'), [[300, { opacity: 0 }], [1100, { opacity: 1 }]]);
      gambarGaris(tl, satu(st, '.eps-jalan-garis'), 700, 1900);
      jejak(tl, satu(st, '.eps-pil-0'), fMuncul(500, 450).concat(fDenyut(K.kata(2, 'waktunya'), 1.12)));
      jejak(tl, satu(st, '.eps-keluarga'), [[0, { opacity: 0, transform: 'translate(-190px,0px)' }], [250, { opacity: 1 }], [2200, { transform: 'translate(0px,0px)' }, 'linear']]);
      /* (b) */
      jejak(tl, satu(st, '.eps-goal'), fPop(K.kata(1, 'target'), 700).concat(fDenyut(K.kata(2, 'tujuan'), 1.2)));
      var ujung = K.kata(1, 'di ujung');
      semua(st, '.eps-tonggak').forEach(function (el, i) { pop(tl, el, ujung - 600 + i * 220, 360); });
      jejak(tl, satu(st, '.eps-sekolah'), [[ujung, { opacity: 0, transform: 'translateY(6px)' }], [ujung + 600, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.eps-pil-18'), fMuncul(K.kata(1, '18') - 250, 450).concat(fDenyut(K.kata(2, 'waktunya') + 250, 1.12)));
      /* pose akhir dulu, lalu siklus jalan (yang ditambah belakangan menang selama berjalan) */
      jejak(tl, satu(st, '.eps-anak .k-lengan-d'), [[ujung + 200, { transform: 'rotate(0deg)' }], [ujung + 900, { transform: 'rotate(-128deg)' }, PEGAS]]);
      jejak(tl, satu(st, '.eps-anak .k-hasta-d'), [[ujung + 200, { transform: 'rotate(0deg)' }], [ujung + 900, { transform: 'rotate(-8deg)' }]]);
      jejak(tl, satu(st, '.eps-ortu .k-kepala'), [[ujung + 300, { transform: 'rotate(0deg)' }], [ujung + 900, { transform: 'rotate(-5deg)' }]]);
      jalan(tl, satu(st, '.eps-ortu'), 0, 2200, 6);
      jalan(tl, satu(st, '.eps-anak'), 0, 2200, 8);
      tl.loop(satu(st, '.eps-goal .eps-lencana-cahaya'), [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 3200 });
    }
  };
  var TAG_KIRI = [80, 298], TAG_KANAN = [392, 66];
  S[2] = {
    inti: [20, 30, 460, 410],
    set: function () {
      return duniaJalan() + keluargaDepan() +
        '<circle class="eps-waktu" cx="' + GOAL[0] + '" cy="' + (JALUR[3][1] - 4) + '" r="7"/>' +
        pil2(TAG_KIRI[0], TAG_KIRI[1] - 6, ['BIAYA', 'HARI INI'], 'eps-tag eps-tag-kini', 13) +
        pil(TAG_KANAN[0], TAG_KANAN[1], 'BIAYA NANTI', 'eps-tag eps-tag-nanti', 16) +
        '<g class="eps-tidak-sama" style="transform-origin:236px 150px"><circle cx="236" cy="150" r="21"/><text x="236" y="159">≠</text></g>';
    },
    /* ketukan: (a) biaya hari ini · (b) waktu berjalan menuju usia kuliah ·
       (c) biaya nanti ≠ biaya hari ini */
    ketuk: [1000, 2800, 2000],
    animate: function (tl, st, K) {
      var b = K.B[1], c = K.B[2];
      muncul(tl, satu(st, '.eps-tag-kini'), 300, 500, 'translateY(8px) scale(.9)');
      /* titik waktu menempuh jalan selama kalimat (b) diucapkan */
      var el = satu(st, '.eps-waktu'), jalanT = Math.max(2400, K.D[1] - 600);
      var fr = [[b, { opacity: 0, transform: 'translate(' + f(JALUR[0][0] - GOAL[0]) + 'px,' + f(JALUR[0][1] - JALUR[3][1]) + 'px)' }], [b + 200, { opacity: 1 }]];
      for (var i = 1; i <= 10; i++) { var p = bez(JALUR, i / 10); fr.push([b + 200 + i * jalanT / 10, { transform: 'translate(' + f(p[0] - GOAL[0]) + 'px,' + f(p[1] - JALUR[3][1]) + 'px)' }, 'linear']); }
      jejak(tl, el, fr);
      jejak(tl, satu(st, '.eps-tag-nanti'), [[c, { opacity: 0, transform: 'scale(.55)' }], [c + 1200, { opacity: 1, transform: 'none' }, PEGAS]]);
      pop(tl, satu(st, '.eps-tidak-sama'), Math.max(c + 1000, K.kata(2, 'tidak sama')), 500);
      tl.loop(el, [{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], { duration: 1800, delay: b + 200 });
    }
  };
  S[3] = {
    inti: [20, 30, 460, 410],
    set: function () {
      return duniaJalan() + keluargaDepan() +
        pil(TAG_KIRI[0], TAG_KIRI[1], 'Rp300 JT', 'eps-tag eps-tag-kini', 13) +
        '<g class="eps-tag-jalan" style="transform-origin:' + GOAL[0] + 'px ' + TAG_KANAN[1] + 'px">' + pil(GOAL[0], TAG_KANAN[1], 'Rp300 JT', 'eps-tag', 13) + '</g>' +
        pil(TAG_KANAN[0], TAG_KANAN[1], '≈ Rp1,0 M', 'eps-tag eps-tag-nanti', 18) +
        kartu(150, 84, ['INFLASI 7% × 18 TAHUN', 'Rp300 JT → ≈ Rp1,0 M'], 'eps-inflasi');
    },
    siap: function (st) { gaya(st, { '.eps-tag-jalan': { opacity: 0 } }); },
    /* ketukan: (a) Rp300 JT hari ini · (b) nilainya naik sepanjang jalan
       (inflasi × waktu) · (c) ≈ Rp1,0 M, kartu ringkas */
    ketuk: [1200, 3000, 2200],
    animate: function (tl, st, K) {
      var b = K.B[1], c = K.B[2];
      muncul(tl, satu(st, '.eps-tag-kini'), Math.max(200, K.kata(0, '300') - 250), 450, 'translateY(8px) scale(.9)');
      /* label menempuh jalan dan membesar selama kalimat (b) diucapkan */
      var el = satu(st, '.eps-tag-jalan'), jalanT = Math.max(2640, K.D[1] - 600);
      var fr = [[b, { opacity: 0, transform: 'translate(' + f(TAG_KIRI[0] - GOAL[0]) + 'px,' + f(TAG_KIRI[1] - TAG_KANAN[1]) + 'px) scale(1)' }], [b + 200, { opacity: 1 }]];
      for (var i = 1; i <= 8; i++) {
        var p = bez(JALUR, i / 8), y = TAG_KIRI[1] + (TAG_KANAN[1] - TAG_KIRI[1]) * (i / 8);
        fr.push([b + 200 + i * jalanT / 8, { transform: 'translate(' + f(p[0] - GOAL[0]) + 'px,' + f(y - TAG_KANAN[1]) + 'px) scale(' + f(1 + 0.45 * i / 8) + ')' }, 'linear']);
      }
      fr.push([c, { opacity: 1 }], [c + 400, { opacity: 0 }]);
      jejak(tl, el, fr);
      jejak(tl, satu(st, '.eps-tag-nanti'), [[c, { opacity: 0, transform: 'scale(.8)' }], [c + 500, { opacity: 1, transform: 'none' }, PEGAS]]);
      muncul(tl, satu(st, '.eps-inflasi'), Math.max(c + 900, K.kata(2, 'Target')), 600, 'translateY(-10px)');
    }
  };
  S[10] = {
    inti: [20, 24, 460, 410],
    set: function () {
      var t = bez(JALUR, 0.5);
      return duniaJalan({ cahaya: true }) +
        '<g class="eps-rangkum">' +
          ikonBulat(122, 128, 'goal', 'GOAL') + '<text class="eps-plus eps-plus-1" x="171" y="134">+</text>' +
          ikonBulat(220, 128, 'waktu', 'WAKTU') + '<text class="eps-plus eps-plus-2" x="269" y="134">+</text>' +
          ikonBulat(318, 128, 'proteksi', 'PROTEKSI') +
        '</g>' +
        kartu(220, 58, ['START EARLY', '+ PROTEKSI = TUJUAN PENDIDIKAN'], 'eps-ringkas') +
        '<circle class="eps-kilau" cx="' + f(t[0]) + '" cy="' + f(t[1]) + '" r="5"/>' +
        keluargaDepan({ toga: true });
    },
    siap: function (st) {
      gaya(st, { '.eps-anak .k-lengan-d': { transform: 'rotate(-150deg)' }, '.eps-ortu .k-lengan-d': { transform: 'rotate(-18deg)' }, '.eps-ortu .k-kepala': { transform: 'rotate(-5deg)' } });
    },
    /* ketukan: (a) tujuan + waktu + proteksi · (b) ringkasan, toga */
    ketuk: [2600, 1800],
    animate: function (tl, st, K) {
      var b = K.B[1];
      jejak(tl, satu(st, '.eps-cam'), [[0, { transform: 'translate(0px,10px) scale(1.06)' }], [3200, { transform: 'none' }, LEMBUT]]);
      gambarGaris(tl, satu(st, '.eps-jalan-cahaya'), 300, 1800);
      /* ikon muncul saat katanya diucapkan */
      var tGoal = Math.max(1200, K.kata(0, 'tujuan') - 150), tWaktu = Math.max(tGoal + 400, K.kata(0, 'waktu') - 150), tProteksi = Math.max(tWaktu + 400, K.kata(0, 'proteksi') - 150);
      pop(tl, satu(st, '.eps-ikon-goal'), tGoal, 500);
      pop(tl, satu(st, '.eps-ikon-waktu'), tWaktu, 500);
      jejak(tl, satu(st, '.eps-ikon-proteksi'), fPop(tProteksi, 500).concat(fDenyut(Math.max(b + 1200, K.kata(1, 'proteksi') - 150), 1.18)));
      muncul(tl, satu(st, '.eps-plus-1'), tGoal + 300, 300, 'scale(.5)');
      muncul(tl, satu(st, '.eps-plus-2'), tWaktu + 300, 300, 'scale(.5)');
      muncul(tl, satu(st, '.eps-ringkas'), b, 600, 'translateY(-10px)');
      pop(tl, satu(st, '.eps-toga'), b + 400, 600);
      jejak(tl, satu(st, '.eps-anak .k-lengan-d'), [[b + 400, { transform: 'rotate(0deg)' }], [b + 1000, { transform: 'rotate(-150deg)' }, PEGAS]]);
      jejak(tl, satu(st, '.eps-ortu .k-lengan-d'), [[b + 500, { transform: 'rotate(0deg)' }], [b + 1100, { transform: 'rotate(-18deg)' }]]);
      jejak(tl, satu(st, '.eps-ortu .k-kepala'), [[b + 500, { transform: 'rotate(0deg)' }], [b + 1100, { transform: 'rotate(-5deg)' }]]);
      var fr = [[300, { opacity: 0, transform: 'translate(0px,0px)' }], [500, { opacity: 1 }]], a = bez(JALUR, 0.5);
      for (var i = 1; i <= 8; i++) { var p = bez(JALUR, i / 16); fr.push([500 + i * 160, { transform: 'translate(' + f(p[0] - a[0]) + 'px,' + f(p[1] - a[1]) + 'px)' }, 'linear']); }
      for (var j = 9; j <= 16; j++) { var q = bez(JALUR, j / 16); fr.push([500 + j * 160, { transform: 'translate(' + f(q[0] - a[0]) + 'px,' + f(q[1] - a[1]) + 'px)', opacity: j === 16 ? 0 : 1 }, 'linear']); }
      jejak(tl, satu(st, '.eps-kilau'), fr);
      tl.loop(satu(st, '.eps-goal .eps-lencana-cahaya'), [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 3200 });
    }
  };
  function ikonBulat(x, y, jenis, label) {
    var ikon = jenis === 'goal' ? '<path d="M-6 9 V-10 M-6 -10 H8 L4 -5 L8 0 H-6"/>'
      : jenis === 'waktu' ? '<circle cx="0" cy="0" r="10"/><path d="M0 -6 V0 L5 3"/>'
      : '<path d="M0 -11 L10 -7 V0 C10 6 5 10 0 12 C-5 10 -10 6 -10 0 V-7 Z"/><path d="M-4 0 L-1 3 L5 -4"/>';
    return '<g class="eps-ikon eps-ikon-' + jenis + '" style="transform-origin:' + x + 'px ' + y + 'px">' +
      '<circle class="eps-ikon-bulat" cx="' + x + '" cy="' + y + '" r="22"/>' +
      '<g class="eps-ikon-gambar" transform="translate(' + x + ' ' + y + ')">' + ikon + '</g>' +
      '<text class="eps-ikon-label" x="' + x + '" y="' + (y + 40) + '">' + label + '</text></g>';
  }

  /* ---------------- scene 4–6: sepeda di tanjakan ---------------- */
  var TANJAK = { A: [40, 372], B: [430, 250] };
  function jalanTanjak(A, B, kelas) {
    var tebal = 14;
    return '<g class="eps-tanjak ' + (kelas || '') + '">' +
      '<path class="eps-tanjak-isi" d="M' + A[0] + ' ' + A[1] + ' L' + B[0] + ' ' + B[1] + ' L' + (B[0] + 400) + ' ' + B[1] + ' L' + (B[0] + 400) + ' 900 L' + A[0] + ' 900 Z"/>' +
      '<path class="eps-tanjak-jalan" d="M' + A[0] + ' ' + A[1] + ' L' + B[0] + ' ' + B[1] + ' L' + B[0] + ' ' + (B[1] + tebal) + ' L' + A[0] + ' ' + (A[1] + tebal) + ' Z"/>' +
      '<path class="eps-tanjak-garis" d="M' + A[0] + ' ' + (A[1] + tebal / 2) + ' L' + B[0] + ' ' + (B[1] + tebal / 2) + '"/>' +
    '</g>';
  }
  function bendera(x, y, s) {
    return '<g class="eps-bendera" style="transform-origin:' + x + 'px ' + y + 'px"><path class="eps-bendera-tiang" d="M' + x + ' ' + y + ' V' + f(y - 58 * s) + '"/>' +
      '<path class="eps-bendera-kain" d="M' + x + ' ' + f(y - 58 * s) + ' L' + f(x + 30 * s) + ' ' + f(y - 50 * s) + ' L' + x + ' ' + f(y - 42 * s) + ' Z"/>' +
      lencana(x + 2, y - 84 * s, 16 * s, 'eps-goal') + '</g>';
  }
  /* Kayuhan mengikuti lama ketukan; jumlah putaran selalu bulat supaya
     pose akhir animasi sama persis dengan keadaan akhir statis. */
  function putaranKayuh(t0, t1, perDetik, minimal) { return Math.max(minimal, Math.round((t1 - t0) / 1000 * perDetik)); }
  function segS4(w) {
    var t0 = w ? w[0] : 500, t1 = w ? w[1] : 4900;
    return [{ A: TANJAK.A, B: TANJAK.B, u0: 0.1, u1: 0.64, t0: t0, t1: t1, putaran: putaranKayuh(t0, t1, 1, 5), th0: 20, condong: 17, kepala: -2, skala: 0.62, berat: 0 }];
  }
  S[4] = {
    inti: [20, 40, 460, 410],
    set: function () {
      return dunia({ bukit: false }) + jalanTanjak(TANJAK.A, TANJAK.B) +
        bendera(TANJAK.B[0] - 10, TANJAK.B[1] + 2, 1) +
        pil(TANJAK.A[0] + 30, 396, 'USIA 0', 'eps-pil-0', 13) +
        pil(120, 70, 'MULAI LEBIH AWAL', 'eps-label eps-label-awal', 14) +
        sepedaSvg('a', 0.62);
    },
    siap: function (st) { siapkanSepeda(st, 'a', segS4()); },
    /* ketukan: (a) mengayuh menuju tujuan · (b) mulai lebih awal = landai,
       ringan; sepeda terus melaju ringan sampai akhir narasi */
    ketuk: [2400, 1200],
    animate: function (tl, st, K) {
      jejak(tl, satu(st, '.eps-cam'), [[0, { transform: 'translate(40px,-10px) scale(1.1)' }], [4600, { transform: 'none' }, LEMBUT]]);
      muncul(tl, satu(st, '.eps-label-awal'), K.B[1], 500, 'translateY(-8px)');
      pop(tl, satu(st, '.eps-bendera'), Math.max(900, K.kata(0, 'menuju tujuan') - 200), 600);
      animasiSepeda(tl, st, 'a', segS4([500, K.akhir - 300]));
    }
  };
  /* scene 5: dua panel — target sama, waktu lebih pendek = lebih curam */
  var DUO = { tanah: 282, x0: 20, x18: 222, naik: 70 };
  function duoPanel(nama, mulaiUsia) {
    var xm = DUO.x0 + (DUO.x18 - DUO.x0) * mulaiUsia / 18, A = [xm, DUO.tanah], B = [DUO.x18, DUO.tanah - DUO.naik];
    var tengah = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    return '<svg class="eps-rig eps-rig-' + nama + '" data-inti="0 104 240 344" viewBox="0 104 240 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + defs() +
      '<g class="eps-cam">' +
        '<path class="eps-bukit-1" d="M-400 236 C -100 222, 100 234, 240 228 C 420 220, 600 232, 800 236 V900 H-400 Z"/>' +
        '<path class="eps-tanah" d="M-400 ' + DUO.tanah + ' H800 V900 H-400 Z"/>' +
        (mulaiUsia ? '<path class="eps-terlewat" d="M' + DUO.x0 + ' ' + (DUO.tanah + 6) + ' H' + f(xm) + '"/>' : '') +
        jalanTanjak(A, B, mulaiUsia ? 'eps-tanjak-curam' : '') +
        (mulaiUsia ? pil(f((DUO.x0 + xm) / 2 + 4), DUO.tanah + 26, 'USIA 0–5', 'eps-pil-lewat', 14) : '') +
        bendera(B[0] - 8, B[1] + 2, 0.72) +
        pil(f(A[0] + (mulaiUsia ? 30 : 26)), DUO.tanah + (mulaiUsia ? 58 : 26), 'USIA ' + mulaiUsia, 'eps-pil-0', 14) +
        '<text class="eps-lama eps-lama-' + nama + '" x="' + f(tengah[0] + 16) + '" y="' + f(tengah[1] + 34) + '" transform="rotate(' + f(Math.atan2(B[1] - A[1], B[0] - A[0]) / RAD) + ' ' + f(tengah[0] + 16) + ' ' + f(tengah[1] + 34) + ')">' + (18 - mulaiUsia) + ' TAHUN</text>' +
        sepedaSvg(nama, 0.5) +
      '</g></svg>';
  }
  function segDuo(nama, w) {
    var awal = nama === 'awal', xm = DUO.x0 + (DUO.x18 - DUO.x0) * (awal ? 0 : 5) / 18;
    var A = [xm, DUO.tanah], B = [DUO.x18, DUO.tanah - DUO.naik];
    var t0 = w ? w[0] : 800, t1 = w ? w[1] : 5400;
    return awal
      ? [{ A: A, B: B, u0: 0.17, u1: 0.68, t0: t0, t1: t1, putaran: putaranKayuh(t0, t1, 1, 5), th0: 10, condong: 17, kepala: -2, skala: 0.5, berat: 0 }]
      : [{ A: A, B: B, u0: 0.12, u1: 0.4, t0: t0, t1: t1, putaran: putaranKayuh(t0, t1, 0.6, 3), th0: 100, condong: 24, kepala: 10, skala: 0.5, berat: 1, ease: 'rata' }];
  }
  S[5] = {
    duo: true,
    set: function () {
      return '<div class="eps-duo">' +
        '<div class="eps-panel eps-panel-awal"><span class="eps-panel-judul">MULAI LEBIH AWAL</span>' + duoPanel('awal', 0) + '</div>' +
        '<div class="eps-panel eps-panel-lambat"><span class="eps-panel-judul">MULAI LEBIH TERLAMBAT</span>' + duoPanel('lambat', 5) + '</div>' +
      '</div>';
    },
    siap: function (st) {
      var tj = satu(st, '.eps-tanjak-curam');
      if (tj) tj.style.transformOrigin = DUO.x18 + 'px ' + (DUO.tanah - DUO.naik) + 'px';
      siapkanSepeda(st, 'awal', segDuo('awal')); siapkanSepeda(st, 'lambat', segDuo('lambat'));
    },
    /* ketukan: (a) dua perjalanan, tujuan sama · (b) mulai usia 5: tinggal
       13 tahun · (c) lebih terjal, lebih berat (keringat) */
    ketuk: [1400, 1400, 900],
    animate: function (tl, st, K) {
      muncul(tl, satu(st, '.eps-panel-awal .eps-panel-judul'), 100, 500, 'translateY(-8px)');
      muncul(tl, satu(st, '.eps-panel-lambat .eps-panel-judul'), 300, 500, 'translateY(-8px)');
      /* (b) tahun yang terlewat, lalu lama perjalanan tiap panel */
      var lima = Math.max(K.B[1], K.kata(1, '5 tahun') - 250);
      muncul(tl, satu(st, '.eps-pil-lewat'), lima, 500, 'translateY(6px)');
      jejak(tl, satu(st, '.eps-terlewat'), [[lima, { opacity: 0 }], [lima + 500, { opacity: 1 }]]);
      /* label tahun memakai atribut transform (miring mengikuti jalan):
         cukup pudar-muncul, transform CSS akan menimpa kemiringannya */
      var t18 = Math.max(lima + 500, K.kata(1, '18') - 250), t13 = Math.max(t18 + 400, K.kata(1, '13') - 250);
      jejak(tl, satu(st, '.eps-lama-awal'), [[t18, { opacity: 0 }], [t18 + 500, { opacity: 1 }]]);
      jejak(tl, satu(st, '.eps-lama-lambat'), [[t13, { opacity: 0 }], [t13 + 500, { opacity: 1 }]]);
      /* jalur kanan menanjak: jalan tumbuh dari landai ke curam */
      jejak(tl, satu(st, '.eps-tanjak-curam'), [[0, { transform: 'rotate(-8deg)' }], [800, { transform: 'none' }, LEMBUT]]);
      animasiSepeda(tl, st, 'awal', segDuo('awal', [800, K.akhir - 300]));
      animasiSepeda(tl, st, 'lambat', segDuo('lambat', [800, K.akhir - 300]));
      /* (c) */
      var berat = Math.max(K.B[2], K.kata(2, 'Menunda') - 200);
      jejak(tl, satu(st, '.eps-sepeda-lambat .eps-keringat'), [[berat, { opacity: 0, transform: 'translateY(-3px)' }], [berat + 600, { opacity: 1, transform: 'none' }]]);
    }
  };
  /* scene 6: titik mulai bergeser 0 → 5 → 10; tanjakan makin curam */
  var MULAI6 = [0, 5, 10], G6 = [430, 246];
  function tanjak6(i) { return { A: [40 + 390 * MULAI6[i] / 18, 372], B: G6 }; }
  /* w: jendela waktu tiap ruas [[t0, t1] × 3]; kayuhan makin berat = makin pelan */
  function segS6(w) {
    var hasil = [], cfg = [[0.05, 0.36, 3, 17, -2, 0, 1.4], [0.05, 0.3, 2.4, 21, 4, 0.6, 1], [0.05, 0.3, 2, 24, 10, 1, 0.6]];
    w = w || [[500, 1900], [2300, 3700], [4100, 5900]];
    MULAI6.forEach(function (m, i) {
      var r = tanjak6(i), c = cfg[i];
      hasil.push({ A: r.A, B: r.B, u0: c[0], u1: c[1], t0: w[i][0], t1: w[i][1], putaran: i === 2 ? putaranKayuh(w[i][0], w[i][1], c[6], c[2]) : Math.max(c[2], (w[i][1] - w[i][0]) / 1000 * c[6]),
        th0: 30 + i * 60, condong: c[3], kepala: c[4], skala: 0.5, berat: c[5], ease: i ? 'rata' : null });
    });
    return hasil;
  }
  S[6] = {
    inti: [20, 30, 460, 434],
    set: function () {
      var jalanan = MULAI6.map(function (m, i) { var r = tanjak6(i); return jalanTanjak(r.A, r.B, 'eps-tanjak-' + i); }).join('');
      var tag = [['Usia 0', 'Rp2,6 JT'], ['Usia 5', 'Rp4,3 JT'], ['Usia 10', 'Rp8,2 JT']].map(function (t, i) {
        var x = tanjak6(i).A[0] + [24, 6, 4][i];
        return '<g class="eps-setor eps-setor-' + i + '" style="transform-origin:' + f(x) + 'px 406px">' +
          '<rect x="' + f(x - 42) + '" y="384" width="84" height="44" rx="11"/>' +
          '<text class="eps-setor-usia" x="' + f(x) + '" y="402">' + t[0] + '</text><text class="eps-setor-nilai" x="' + f(x) + '" y="421">' + t[1] + '</text></g>';
      }).join('');
      return dunia({ bukit: false }) + jalanan + bendera(G6[0] - 10, G6[1] + 2, 1) + tag +
        kartu(182, 76, ['CONTOH ILUSTRASI SETORAN / BULAN'], 'eps-ilustrasi', [14]) + sepedaSvg('c', 0.5);
    },
    siap: function (st) {
      gaya(st, { '.eps-tanjak-0': { opacity: 0.4 }, '.eps-tanjak-1': { opacity: 0.55 } });
      siapkanSepeda(st, 'c', segS6());
    },
    /* ketukan: (a) usia 0 · Rp2,6 jt · (b) usia 5 · Rp4,3 jt ·
       (c) usia 10 · Rp8,2 jt, makin berat — satu titik mulai per ketukan */
    ketuk: [2200, 2200, 2600],
    animate: function (tl, st, K) {
      var a = K.B[0], b = K.B[1], c = K.B[2];
      muncul(tl, satu(st, '.eps-ilustrasi'), 100, 500, 'translateY(-8px)');
      pop(tl, satu(st, '.eps-bendera'), 300, 500);
      jejak(tl, satu(st, '.eps-tanjak-0'), [[0, { opacity: 1 }], [b, { opacity: 1 }], [b + 400, { opacity: 0.4 }]]);
      jejak(tl, satu(st, '.eps-tanjak-1'), [[b, { opacity: 0, transform: 'translateY(40px)' }], [b + 500, { opacity: 1, transform: 'none' }], [c, { opacity: 1 }], [c + 400, { opacity: 0.55 }]]);
      jejak(tl, satu(st, '.eps-tanjak-2'), [[c, { opacity: 0, transform: 'translateY(40px)' }], [c + 500, { opacity: 1, transform: 'none' }]]);
      /* nominal muncul saat disebut */
      pop(tl, satu(st, '.eps-setor-0'), Math.max(a + 500, K.kata(0, '2,6') - 250), 450);
      pop(tl, satu(st, '.eps-setor-1'), Math.max(b + 500, K.kata(1, '4,3') - 250), 450);
      pop(tl, satu(st, '.eps-setor-2'), Math.max(c + 500, K.kata(2, '8,2') - 250), 450);
      animasiSepeda(tl, st, 'c', segS6([[a + 500, b - 200], [b + 400, c - 200], [c + 400, K.akhir - 300]]));
      var berat = Math.max(c + 1400, K.kata(2, 'Semakin dekat') - 200);
      jejak(tl, satu(st, '.eps-sepeda-c .eps-keringat'), [[berat, { opacity: 0, transform: 'translateY(-3px)' }], [berat + 600, { opacity: 1, transform: 'none' }]]);
    }
  };

  /* ---------------- scene 7–8: tangga menabung ---------------- */
  var TG = { x0: 50, y0: 386, w: 27, h: 21, n: 12 };
  /* pijakan ke-k: dari tepi anak tangga k-1 sampai k, setinggi TG.y0 - TG.h*k */
  function anakTangga(k) { return [TG.x0 + TG.w * k - TG.w / 2, TG.y0 - TG.h * k]; }
  function duniaTangga() {
    var d = 'M' + (TG.x0 - 800) + ' ' + TG.y0;
    for (var k = 0; k < TG.n; k++) { var x = TG.x0 + TG.w * k, y = TG.y0 - TG.h * k; d += ' L' + x + ' ' + y + ' L' + x + ' ' + (y - TG.h); }
    var xt = TG.x0 + TG.w * TG.n, yt = TG.y0 - TG.h * TG.n;
    d += ' L' + (xt + 400) + ' ' + yt + ' L' + (xt + 400) + ' 900 L' + (TG.x0 - 800) + ' 900 Z';
    var koin = '';
    for (var i = 1; i <= 6; i++) { var p = anakTangga(i); koin += '<g class="eps-koin eps-koin-' + i + '" style="transform-origin:' + (p[0] - 6) + 'px ' + (p[1] - 4) + 'px"><circle cx="' + (p[0] - 6) + '" cy="' + (p[1] - 5) + '" r="5"/><circle class="eps-koin-dalam" cx="' + (p[0] - 6) + '" cy="' + (p[1] - 5) + '" r="2.4"/></g>'; }
    var redup = '';
    for (var j = 7; j <= TG.n; j++) { var q = anakTangga(j); redup += '<rect x="' + (q[0] - TG.w / 2) + '" y="' + q[1] + '" width="' + TG.w + '" height="' + (TG.h * (j - 6)) + '"/>'; }
    return dunia({ bukit: false, matahari: [420, 90] }) +
      '<path class="eps-tangga" d="' + d + '"/>' +
      '<g class="eps-tangga-atas">' + redup + '</g>' +
      '<g class="eps-puncak">' + lencana(xt + 34, yt - 52, 20, 'eps-goal') + '</g>' + koin;
  }
  function posTangga(k, s) { var p = anakTangga(k); return [p[0], p[1], s]; }
  S[7] = {
    inti: [20, 30, 460, 410],
    set: function () {
      var po = posTangga(5, 0.4), pa = posTangga(6, 0.4);
      return duniaTangga() +
        '<g class="eps-naik">' + orang('eps-ortu', po[0], po[1], 0.4, ORTU) + orang('eps-anak', pa[0], pa[1], 0.4, ANAK) + '</g>' +
        '<g class="eps-tanya" style="transform-origin:' + (po[0] - 16) + 'px ' + (po[1] - 110) + 'px"><path d="M' + (po[0] - 40) + ' ' + (po[1] - 128) + ' h46 a10 10 0 0 1 10 10 v14 a10 10 0 0 1 -10 10 h-20 l-8 9 l-2 -9 h-16 a10 10 0 0 1 -10 -10 v-14 a10 10 0 0 1 10 -10 Z"/><text x="' + (po[0] - 17) + '" y="' + (po[1] - 106) + '">?</text></g>';
    },
    siap: function (st) {
      gaya(st, { '.eps-ortu .k-lengan-d': { transform: 'rotate(-58deg)' }, '.eps-ortu .k-hasta-d': { transform: 'rotate(-10deg)' },
        '.eps-anak .k-lengan-b': { transform: 'rotate(38deg)' }, '.eps-anak .k-hasta-b': { transform: 'rotate(-6deg)' } });
    },
    /* ketukan: (a) naik selangkah demi selangkah, setoran tiap anak tangga ·
       (b) bergantung pada kemampuan menyetor — pertanyaan risiko */
    ketuk: [3600, 1200],
    animate: function (tl, st, K) {
      /* langkah melompat singkat lalu berhenti sejenak di tiap anak tangga,
         mengisi seluruh kalimat (a) */
      var dt = Math.max(640, (K.D[0] - 900) / 5);
      naikTangga(tl, st, '.eps-ortu', 0, 5, 300, dt, 0.4, 640);
      naikTangga(tl, st, '.eps-anak', 1, 6, 300, dt, 0.4, 640);
      for (var i = 1; i <= 5; i++) pop(tl, satu(st, '.eps-koin-' + i), 300 + i * dt - 120, 380);
      muncul(tl, satu(st, '.eps-koin-6'), 0, 1);
      pop(tl, satu(st, '.eps-tanya'), Math.max(K.B[1] + 600, K.kata(1, 'Bagaimana') - 200), 600);
      pop(tl, satu(st, '.eps-puncak .eps-goal'), 600, 600);
    }
  };
  /* satu jejak per figur: naik dari anak tangga a ke b, tiap langkah melompat
     kecil selama `lompat` md lalu diam di anak tangga sampai langkah berikutnya */
  function naikTangga(tl, st, sel, a, b, t0, dt, s, lompat) {
    var akhir = anakTangga(b), fr = [], L = Math.min(dt, lompat || dt), el = satu(st, sel);
    function di(p) { return { transform: 'translate(' + f(p[0] - akhir[0]) + 'px,' + f(p[1] - akhir[1]) + 'px)' }; }
    for (var k = a; k <= b; k++) {
      var p = anakTangga(k), t = t0 + (k - a) * dt;
      fr.push([t, di(p), k === a ? null : 'cubic-bezier(.3,0,.4,1)']);
      if (k < b) {
        var q = anakTangga(k + 1), mulai = t + dt - L;
        if (mulai > t) fr.push([mulai, di(p), 'linear']);
        fr.push([mulai + L * 0.5, { transform: 'translate(' + f((p[0] + q[0]) / 2 - akhir[0]) + 'px,' + f(Math.min(p[1], q[1]) - 9 - akhir[1]) + 'px)' }, 'cubic-bezier(.2,.6,.4,1)']);
        jalan(tl, el, mulai, L, 2);
      }
    }
    jejak(tl, el, fr);
  }
  S[8] = {
    inti: [20, 30, 460, 410],
    set: function () {
      var po = posTangga(5, 0.4), pa = posTangga(6, 0.4);
      return duniaTangga() +
        '<g class="eps-naik">' + orang('eps-ortu', po[0], po[1], 0.4, ORTU) + orang('eps-anak', pa[0], pa[1], 0.4, ANAK) + '</g>';
    },
    siap: function (st) {
      gaya(st, { '.eps-ortu': { opacity: 0.16, transform: 'translate(0px,4px)' }, '.eps-anak .k-kepala': { transform: 'rotate(10deg)' },
        '.eps-tangga-atas': { opacity: 1 }, '.eps-puncak': { opacity: 0.45 }, '.eps-koin-6': { opacity: 0 } });
    },
    /* ketukan: (a) penopang tidak bisa melanjutkan (orang tua memudar) ·
       (b) anak di tengah tangga, sisa jalan panjang, tujuan meredup */
    ketuk: [3400, 2600],
    animate: function (tl, st, K) {
      var pudar = Math.max(1200, K.kata(0, 'tidak bisa') - 300), sisa = Math.max(K.B[1] + 300, K.kata(1, 'sisa') - 200);
      var redup = Math.max(sisa + 1000, K.kata(1, 'bisa berhenti') - 300);
      jejak(tl, satu(st, '.eps-cam'), [[0, { transform: 'none' }], [2600, { transform: 'translate(-30px,20px) scale(1.12)' }, LEMBUT], [sisa, { transform: 'translate(-30px,20px) scale(1.12)' }], [sisa + 1800, { transform: 'none' }, LEMBUT]]);
      jejak(tl, satu(st, '.eps-ortu .k-lengan-d'), [[400, { transform: 'rotate(-58deg)' }], [1200, { transform: 'rotate(0deg)' }]]);
      jejak(tl, satu(st, '.eps-ortu .k-hasta-d'), [[400, { transform: 'rotate(-10deg)' }], [1200, { transform: 'rotate(0deg)' }]]);
      jejak(tl, satu(st, '.eps-anak .k-lengan-b'), [[500, { transform: 'rotate(38deg)' }], [1300, { transform: 'rotate(0deg)' }]]);
      jejak(tl, satu(st, '.eps-anak .k-hasta-b'), [[500, { transform: 'rotate(-6deg)' }], [1300, { transform: 'rotate(0deg)' }]]);
      jejak(tl, satu(st, '.eps-ortu'), [[pudar, { opacity: 1, transform: 'translate(0px,0px)' }], [pudar + 2000, { opacity: 0.16, transform: 'translate(0px,4px)' }, LEMBUT]]);
      /* (b) */
      jejak(tl, satu(st, '.eps-anak .k-kepala'), [[K.B[1], { transform: 'rotate(0deg)' }], [K.B[1] + 800, { transform: 'rotate(10deg)' }]]);
      jejak(tl, satu(st, '.eps-tangga-atas'), [[sisa, { opacity: 0 }], [sisa + 1000, { opacity: 1 }]]);
      jejak(tl, satu(st, '.eps-puncak'), [[redup, { opacity: 1 }], [redup + 1000, { opacity: 0.45 }]]);
    }
  };

  /* ---------------- scene 9: lift ke lantai 18 ---------------- */
  var LF = { x0: 168, x1: 264, lantai: 380, puncak: 110, naik: 270, kabin: [176, 256, 70] };
  function duniaLift() {
    var tanda = '';
    for (var i = 1; i < 18; i++) { var y = LF.lantai - i * 15; tanda += 'M' + LF.x0 + ' ' + y + ' h6 M' + (LF.x1 - 6) + ' ' + y + ' h6 '; }
    var jendela = '';
    for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) jendela += '<rect x="' + (284 + c * 36) + '" y="' + (152 + r * 32) + '" width="20" height="16" rx="2"/>';
    var kx = LF.kabin[0], kw = LF.kabin[1] - LF.kabin[0], kh = LF.kabin[2], ky = LF.lantai - kh;
    return dunia({ bukit: false, matahari: [420, 60] }) +
      '<g class="eps-gedung"><rect class="eps-gedung-dinding" x="264" y="' + LF.puncak + '" width="240" height="' + (LF.lantai - LF.puncak) + '"/>' +
        '<g class="eps-jendela">' + jendela + '</g>' +
        '<rect class="eps-lantai-atas" x="258" y="' + (LF.puncak - 5) + '" width="250" height="8" rx="2"/>' +
        '<rect class="eps-pintu-tujuan" x="382" y="' + (LF.puncak - 54) + '" width="46" height="54" rx="6"/>' +
        '<path class="eps-pintu-cahaya" d="M382 ' + LF.puncak + ' L372 ' + (LF.puncak + 4) + ' H438 L428 ' + LF.puncak + ' Z"/>' +
      '</g>' +
      pil(342, LF.puncak + 24, 'LANTAI 18', 'eps-pil-lantai', 13.5) +
      lencana(405, 38, 13, 'eps-goal') +
      '<g class="eps-poros"><rect class="eps-poros-bingkai" x="' + LF.x0 + '" y="' + (LF.puncak - 72) + '" width="' + (LF.x1 - LF.x0) + '" height="' + (LF.lantai - LF.puncak + 72) + '" rx="6"/>' +
        '<path class="eps-poros-tanda" d="' + tanda + '"/>' +
        '<rect class="eps-poros-kepala" x="182" y="' + (LF.puncak - 92) + '" width="68" height="22" rx="6"/><text class="eps-poros-teks" x="216" y="' + (LF.puncak - 76) + '">LIFT</text>' +
      '</g>' +
      '<g class="eps-kabin" style="transform-origin:0px 0px">' +
        '<rect class="eps-kabin-dalam" x="' + kx + '" y="' + ky + '" width="' + kw + '" height="' + kh + '" rx="4"/>' +
        '<ellipse class="eps-kabin-cahaya" cx="' + (kx + 24) + '" cy="' + (ky + 34) + '" rx="26" ry="30" fill="url(#epsHangat)"/>' +
        '<g class="eps-kabin-isi">' + orang('eps-ortu', kx + 24, LF.lantai, 0.28, ORTU) + orang('eps-anak', kx + 54, LF.lantai, 0.28, ANAK) + '</g>' +
        '<rect class="eps-pintu eps-pintu-kiri" x="' + kx + '" y="' + ky + '" width="' + (kw / 2) + '" height="' + kh + '" style="transform-origin:' + kx + 'px ' + ky + 'px"/>' +
        '<rect class="eps-pintu eps-pintu-kanan" x="' + (kx + kw / 2) + '" y="' + ky + '" width="' + (kw / 2) + '" height="' + kh + '" style="transform-origin:' + LF.kabin[1] + 'px ' + ky + 'px"/>' +
        '<rect class="eps-kabin-bingkai" x="' + kx + '" y="' + ky + '" width="' + kw + '" height="' + kh + '" rx="4"/>' +
      '</g>';
  }
  var KELUAR = 176;   // jarak anak berjalan dari kabin ke pintu tujuan
  S[9] = {
    inti: [20, 10, 460, 410],
    set: function () { return duniaLift(); },
    siap: function (st) {
      gaya(st, { '.eps-kabin': { transform: 'translate(0px,' + (-LF.naik) + 'px)' }, '.eps-pintu-kiri': { transform: 'scaleX(.12)' }, '.eps-pintu-kanan': { transform: 'scaleX(.12)' },
        '.eps-ortu': { opacity: 0 }, '.eps-anak': { transform: 'translate(' + KELUAR + 'px,0px)' }, '.eps-kabin-cahaya': { opacity: 0 } });
    },
    /* ketukan: (a) masuk lift, lantai 18 ditetapkan · (b) lift naik ·
       (c) terjadi sesuatu pada orang tua, lift tetap naik ·
       (d) pintu terbuka di lantai 18, anak sampai di tujuan */
    ketuk: [2800, 1400, 2200, 4000],
    animate: function (tl, st, K) {
      var W = -118, b = K.B[1], c = K.B[2], d = K.B[3];
      var tiba = d + 1800, keluar = tiba + 400, pudar = Math.max(c + 200, K.kata(2, 'terjadi sesuatu') - 300);
      var tuju = Math.max(2100, K.kata(0, 'lantai 18') - 200);
      jejak(tl, satu(st, '.eps-ortu'), [[0, { opacity: 1, transform: 'translate(' + W + 'px,0px)' }], [1500, { transform: 'translate(0px,0px)' }, 'linear'],
        [pudar, { opacity: 1, transform: 'translate(0px,0px)' }], [pudar + 1200, { opacity: 0, transform: 'translate(0px,-10px)' }, LEMBUT]]);
      jejak(tl, satu(st, '.eps-anak'), [[0, { transform: 'translate(' + W + 'px,0px)' }], [1500, { transform: 'translate(0px,0px)' }, 'linear'],
        [keluar, { transform: 'translate(0px,0px)' }], [keluar + 1300, { transform: 'translate(' + KELUAR + 'px,0px)' }, 'linear']]);
      jalan(tl, satu(st, '.eps-ortu'), 0, 1500, 4);
      jalan(tl, satu(st, '.eps-anak'), 0, 1500, 6);
      jalan(tl, satu(st, '.eps-anak'), keluar, 1300, 6);
      jejak(tl, satu(st, '.eps-pintu-kiri'), [[0, { transform: 'scaleX(.12)' }], [1500, { transform: 'scaleX(.12)' }], [2000, { transform: 'scaleX(1)' }], [tiba, { transform: 'scaleX(1)' }], [keluar, { transform: 'scaleX(.12)' }]]);
      jejak(tl, satu(st, '.eps-pintu-kanan'), [[0, { transform: 'scaleX(.12)' }], [1500, { transform: 'scaleX(.12)' }], [2000, { transform: 'scaleX(1)' }], [tiba, { transform: 'scaleX(1)' }], [keluar, { transform: 'scaleX(.12)' }]]);
      /* tujuan ditetapkan sejak awal: lencana dan label LANTAI 18 berdenyut saat disebut */
      jejak(tl, satu(st, '.eps-goal'), [[tuju, { transform: 'scale(1)' }], [tuju + 300, { transform: 'scale(1.25)' }, PEGAS], [tuju + 700, { transform: 'scale(1)' }]]);
      jejak(tl, satu(st, '.eps-pil-lantai'), fDenyut(tuju + 150, 1.12));
      /* (b)–(d) kabin naik terus, juga saat orang tua terlepas */
      jejak(tl, satu(st, '.eps-kabin'), [[b, { transform: 'translate(0px,0px)' }], [tiba, { transform: 'translate(0px,' + (-LF.naik) + 'px)' }, 'cubic-bezier(.45,0,.35,1)']]);
      jejak(tl, satu(st, '.eps-kabin-cahaya'), [[pudar - 100, { opacity: 0 }], [pudar + 500, { opacity: 0.9 }], [pudar + 1700, { opacity: 0 }]]);
      jejak(tl, satu(st, '.eps-pintu-cahaya'), [[tiba + 300, { opacity: 0.3 }], [tiba + 1500, { opacity: 1 }]]);
    }
  };

  /* ---------------- kerangka scene ---------------- */
  function kerangka(opsi, step, i, sc) {
    var n = i + 1;
    var isi = sc.duo ? sc.set() :
      '<svg class="eps-rig" data-inti="' + sc.inti.join(' ') + '" viewBox="' + [sc.inti[0], sc.inti[1], sc.inti[2] - sc.inti[0], sc.inti[3] - sc.inti[1]].join(' ') + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        defs() + '<g class="eps-cam">' + sc.set() + '</g></svg>';
    var chip = i === 5 ? '<div class="eps-chip-row">' + CHIP_SETORAN.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' : '';
    return '<div class="eps" data-eps="' + n + '" data-ketuk="0">' + (opsi.header || '') +
      '<div class="eps-body">' +
        '<figure class="eps-stage eps-s' + n + '" role="img" aria-label="' + esc('Ilustrasi langkah ' + n + ': ' + step.title) + '">' +
          '<div class="eps-langit"></div>' + isi + '<div class="eps-vignette"></div>' +
        '</figure>' +
        '<div class="eps-text">' +
          '<h3 class="eps-title">' + esc(step.title) + '</h3>' +
          '<p class="eps-focus">' + esc(step.focus) + '</p>' +
          '<p class="eps-isi">' + esc(step.body) + '</p>' + chip +
        '</div>' +
      '</div></div>';
  }
  function animasiTeks(tl, stage) {
    muncul(tl, satu(stage, '.eps-title'), 120, 520);
    muncul(tl, satu(stage, '.eps-focus'), 300, 520);
    muncul(tl, satu(stage, '.eps-isi'), 480, 560);
  }

  /* Kamera dasar renderer MP4: tiap scene punya frame tersendiri untuk
     layout panggung landscape dan portrait. Untuk stage live yang lebih
     lebar, frame melebar simetris pada anchor x referensi. Untuk stage yang
     lebih sempit/tinggi, tinggi bertambah ke bawah dari anchor y referensi. */
  var KAMERA_REFERENSI = {
    7: {
      landscape: [-15.12, 30, 510.23, 380],
      portrait: [18.11, 30, 443.78, 380]
    },
    8: {
      landscape: [-15.12, 30, 510.23, 380],
      portrait: [20, -3.63, 440, 436.05]
    },
    9: {
      landscape: [-28.54, 10, 537.09, 400],
      portrait: [3.96, 10, 472.08, 400]
    }
  };

  /* Tentukan orientasi dari susunan stage dan kartu yang benar-benar tampil,
     bukan dari lebar viewport perangkat. */
  function orientasiPanggung(svg, rasio) {
    var stage = svg.closest('.eps-stage'), body = stage && stage.parentElement;
    var teks = body && body.querySelector('.eps-text');
    if (stage && teks) {
      var rs = stage.getBoundingClientRect(), rt = teks.getBoundingClientRect();
      if (rt.left >= rs.right - 1) return 'landscape';
      if (rt.top >= rs.bottom - 1) return 'portrait';
    }
    return rasio >= 1.25 ? 'landscape' : 'portrait';
  }

  function kameraUntukStage(kamera, rasioStage) {
    var x = kamera[0], y = kamera[1], w = kamera[2], h = kamera[3];
    if (rasioStage > w / h) {
      var lebar = h * rasioStage;
      var pusatX = x + w / 2;
      return [pusatX - lebar / 2, y, lebar, h];
    }
    return [x, y, w, w / rasioStage];
  }

  /* viewBox mengikuti rasio tiap SVG: area inti utuh, sisanya dunia */
  function paskan(svg) {
    var w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) { var r = svg.getBoundingClientRect(); w = r.width; h = r.height; }
    if (!w || !h) return;
    var I = svg.getAttribute('data-inti').split(' ').map(Number);
    var a = w / h, w0 = I[2] - I[0], h0 = I[3] - I[1], vb;
    var scene = svg.closest('.eps'), n = scene ? +scene.getAttribute('data-eps') : 0;
    var preset = KAMERA_REFERENSI[n];
    var orientasi = preset ? orientasiPanggung(svg, a) : null;
    var kamera = preset && preset[orientasi];
    if (kamera) {
      vb = kameraUntukStage(kamera, a);
    } else if (a >= w0 / h0) { var ww = h0 * a; vb = [(I[0] + I[2]) / 2 - ww / 2, I[1], ww, h0]; }
    else { var hh = w0 / a, ekstra = hh - h0; vb = [I[0], I[1] - ekstra * 0.6, w0, hh]; }
    svg.setAttribute('viewBox', vb.map(f).join(' '));
  }
  var pengamat = null;
  function amati(stage) {
    var rigs = semua(stage, '.eps-rig');
    rigs.forEach(paskan);
    if (!window.ResizeObserver) return;
    if (!pengamat) pengamat = new ResizeObserver(function (e) { e.forEach(function (x) { paskan(x.target); }); });
    pengamat.disconnect();
    rigs.forEach(function (r) { pengamat.observe(r); });
  }

  /* Ketukan scene: B = saat mulai tiap ketukan, D = lamanya, akhir = ujung
     timeline. Lama ketukan = maks(kebutuhan gerak, perkiraan narasi). */
  var JEDA_UCAP = 80;   // narator mulai bicara ±80 md setelah ketukan
  function ketukan(n) {
    var sc = S[n] ? n : 1, naskah = NARASI[sc - 1] || [], vis = S[sc].ketuk || [], B = [], D = [], t = 0;
    naskah.forEach(function (seg, j) {
      var d = Math.max(vis[j] || 0, lamaSegmen(seg));
      B.push(t); D.push(d); t += d;
    });
    return {
      B: B, D: D, akhir: t,
      /* perkiraan saat kata k pada segmen j mulai diucapkan */
      kata: function (j, k) {
        var seg = naskah[j] || '', i = seg.indexOf(k);
        return (B[j] || 0) + JEDA_UCAP + (i > 0 ? lamaBicara(seg.slice(0, i)) : 0);
      }
    };
  }

  var N = null;
  function adegan(opsi) {
    var o = opsi || {};
    var langkah = Array.isArray(o.langkah) ? o.langkah : [];
    N = window.PSGNarasi || null;
    if (N) {
      N.daftar('.eps', 'data-eps', NARASI, N.rekamanDari ? N.rekamanDari(window.PSGEducationAudio, NARASI) : null);
      N.pasang();
      o = Object.assign({}, o, { header: N.tombol(o.header || '') });
    }
    return langkah.map(function (step, i) {
      var n = i + 1, sc = S[n] || S[1];
      return {
        id: 'education-' + n,
        fit: true,
        siapDi: 'akhir',
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, step, i, sc);
          var st = stage.querySelector('.eps-stage');
          pasangPoros(st);
          if (sc.siap) sc.siap(st);
          amati(stage);
          if (N) N.tandai();
        },
        animate: function (tl, stage) {
          var st = stage.querySelector('.eps-stage'), node = stage.querySelector('.eps'), K = ketukan(n);
          animasiTeks(tl, stage);
          if (sc.animate) sc.animate(tl, st, K);
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

  window.PSGEducationStory = { adegan: adegan };
})();
