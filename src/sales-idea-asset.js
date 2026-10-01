/* ============================================================
   Sales Idea — Asset Creation (interactive story)
   ------------------------------------------------------------
   Enam scene mengikuti 6 langkah assetCreationSteps di
   sales-idea.js dengan urutan yang sama; judul, fokus, dan isi
   diambil dari data itu. Angka hanya yang ada di materi.

   1. Piramida 3 fungsi asuransi dibangun dari bawah; puncak
      ASSET CREATION menjadi fokus.
   2. Aset dibangun: lahan → fondasi → struktur → dinding → atap →
      jendela; orang tua + anak; TARGET ASET Rp5 MILIAR.
   3. Pilihan 1: maket rumah 10 irisan — 3 irisan DP (emas), 7 sisa
      pembiayaan (kaca); jalur 7% • 20 tahun; cicilan ≈ Rp27 jt.
   4. Pilihan 2: maket yang sama; irisan DP terangkat, seluruh
      maket dibiayai; cicilan ≈ Rp39,5 jt.
   5. Pilihan 3: dunia visual berbeda (cahaya senja, alas, kristal
      sebagai metafora abstrak penciptaan aset). Tidak ada rumah,
      jalur waktu, tumpukan uang, atau pertumbuhan saldo; angka
      contoh muncul SESUDAH kristal tercipta.
   6. Aset → orang tua → miniatur rumah → anak: WARISAN UNTUK ANAK.

   Teknik: pseudo-3D SVG (proyeksi isometrik, tiga bidang shading,
   bayangan kontak, ekstrusi) + parallax tiga lapis kamera (tiga <svg>
   bertumpuk; kamera hanya menggeser pembungkusnya). Hanya
   transform/opacity/stroke yang dianimasikan (Web Animations lewat
   timeline pemutar). Render = keadaan akhir (statis, juga untuk gerak
   dikurangi); animasi bergerak dari awal ke keadaan akhir itu.

   Narasi: narator bersama (window.PSGNarasi). Naskah tiap scene
   berupa segmen; tiap segmen punya satu ketukan visual. Durasi
   ketukan = maks(kebutuhan gerak, perkiraan lama narasi segmennya,
   lama rekamannya bila ada), jadi timeline tetap berputar selama
   narasi berjalan dan PAUSE /
   RESUME berlaku sepanjang narasi. data-ketuk pada node scene memberi
   tahu narator ketukan mana yang sudah mulai.

   API: PSGAssetStory.adegan({ langkah, header, padaLangkah })
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var LEMBUT = 'cubic-bezier(.45,.05,.3,1)';
  var PEGAS = 'cubic-bezier(.34,1.4,.5,1)';
  var JATUH = 'cubic-bezier(.55,0,.8,.45)';

  /* teks alternatif panggung (role="img"): isi visual tiap scene */
  var ARIA = [
    'Piramida tiga tingkat dibangun dari bawah: income protection, asset protection, lalu asset creation di puncak yang disorot.',
    'Rumah dibangun dari lahan sampai selesai, didatangi orang tua dan anak. Label: target aset Rp5 miliar, aset baru, rencana warisan.',
    'Maket rumah terbagi 10 bagian: 3 bagian uang muka 30 persen Rp1,5 miliar dan 7 bagian sisa Rp3,5 miliar. Bunga 7 persen selama 20 tahun, cicilan sekitar Rp27 juta per bulan.',
    'Maket yang sama tanpa uang muka: DP Rp0, pembiayaan Rp5 miliar. Bunga 7 persen selama 20 tahun, cicilan sekitar Rp39,5 juta per bulan.',
    'Kristal cahaya di atas alas pada latar senja. Pilihan 3, mekanisme berbeda: sekitar Rp6 juta per bulan, target aset Rp5 miliar. Contoh materi, bukan simulasi KPR dengan asumsi yang sama.',
    'Miniatur rumah berpindah dari aset baru Rp5 miliar ke tangan orang tua lalu ke tangan anak: warisan untuk anak.'
  ];

  /* Naskah narasi: satu larik segmen per scene, urutan = ketukan visual.
     Hanya pesan dan angka dari materi; nominal ditulis "... rupiah" supaya
     dibaca wajar oleh suara Indonesia. */
  var NARASI = [
    ['Asuransi dapat kita bahas melalui tiga fungsi.',
      'Pertama, melindungi penghasilan. Kedua, melindungi aset.',
      'Ketiga, membantu menciptakan aset baru. Inilah yang kita bahas sekarang: penciptaan aset.'],
    ['Contoh dari materi: seseorang ingin memiliki properti senilai 5 miliar rupiah.',
      'Properti ini menjadi aset baru, sekaligus rencana warisan untuk anak.'],
    ['Pilihan pertama, dengan uang muka. Uang mukanya 30 persen, atau 1,5 miliar rupiah.',
      'Sisanya 3,5 miliar rupiah. Dengan ilustrasi bunga 7 persen selama 20 tahun, cicilannya sekitar 27 juta rupiah per bulan.'],
    ['Pilihan kedua, tanpa uang muka. Seluruh 5 miliar rupiah perlu dibiayai.',
      'Dengan ilustrasi bunga 7 persen selama 20 tahun, cicilannya sekitar 39,5 juta rupiah per bulan.'],
    ['Materi juga memperkenalkan pilihan ketiga: pendekatan yang berbeda untuk menciptakan aset baru, dengan beban bulanan yang lebih ringan.',
      'Contoh dalam materi menyebut sekitar Rp6 juta per bulan dicicil selama 20 tahun dengan target aset Rp5 miliar.',
      'Angka ini adalah contoh dari materi dengan mekanisme yang berbeda, dan bukan simulasi KPR dengan asumsi yang sama.'],
    ['Jadi, inti percakapannya, bagaimana seseorang dapat membangun aset baru dan menyiapkan warisan dengan cara lebih simpel, ringan, dan pasti.',
      'Aset baru ini nantinya dapat dipersiapkan sebagai warisan untuk anak.']
  ];

  /* Perkiraan lama bicara (kecepatan 0,96): 80 md per huruf dari teks yang
     diucapkan (angka dieja), +300 md tiap pergantian kalimat, +900 md jeda
     segmen — sama dengan Education. */
  var MD_HURUF = 80, JEDA_KALIMAT = 300, JEDA_SEGMEN = 900, JEDA_UCAP = 80;
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
  function lamaBicara(t) {
    var kalimat = (String(t).match(/[.!?](\s|$)/g) || []).length;
    return Math.round(diucapkan(t).length * MD_HURUF) + kalimat * JEDA_KALIMAT;
  }
  function lamaSegmen(t) { return lamaBicara(t) + JEDA_SEGMEN; }
  /* Rekaman narasi (manifest voice Bian, bila dimuat): lama segmen SNN-MM
     dalam md + jeda kecil, dipakai sebagai batas minimum ketukan supaya
     visual tidak berpindah sebelum narasinya selesai. 0 = tanpa rekaman. */
  var JEDA_REKAMAN = 300;
  function lamaRekaman(n, j) {
    var dua = function (x) { return (x < 10 ? '0' : '') + x; };
    var m = window.PSGAssetAudio, klip = m && m.segmen && m.segmen['S' + dua(n) + '-' + dua(j)];
    if (!klip || !klip.length) return 0;
    return Math.round(klip.reduce(function (t, c) { return t + (c.end - c.start); }, 0) * 1000) + JEDA_REKAMAN;
  }

  /* ---------------- utilitas ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function f(v) { return Math.round(v * 100) / 100; }
  function satu(st, sel) { return st.querySelector(sel); }
  function semua(st, sel) { return Array.prototype.slice.call(st.querySelectorAll(sel)); }

  /* jejak(tl, el, [[ms, {props}, easingMenujuFrameIni], ...]) — satu jejak per elemen per properti */
  function kunciJejak(frames) {
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
    return { kf: kf, total: total };
  }
  function jejak(tl, el, frames) {
    if (!tl || !el || !frames || !frames.length) return null;
    var j = kunciJejak(frames);
    return tl.add(el, j.kf, { duration: Math.max(1, j.total), easing: 'linear', fill: 'backwards' });
  }
  function fMuncul(t, d, dari) { return [[t, { opacity: 0, transform: dari || 'translateY(10px)' }], [t + (d || 520), { opacity: 1, transform: 'none' }]]; }
  function fPop(t, d) { return [[t, { opacity: 0, transform: 'scale(.4)' }], [t + (d || 460), { opacity: 1, transform: 'none' }, PEGAS]]; }
  function fDenyut(t, s) { return [[t, { transform: 'none' }], [t + 300, { transform: 'scale(' + (s || 1.1) + ')' }], [t + 760, { transform: 'none' }, LEMBUT]]; }
  function muncul(tl, el, t, d, dari) { jejak(tl, el, fMuncul(t, d, dari)); }
  function pop(tl, el, t, d) { jejak(tl, el, fPop(t, d)); }
  function pudar(tl, el, t, d) { jejak(tl, el, [[t, { opacity: 0 }], [t + (d || 500), { opacity: 1 }]]); }
  /* garis tergambar: path ber-pathLength="1" */
  function gambarGaris(tl, el, t, d, e) { jejak(tl, el, [[t, { strokeDashoffset: 1 }], [t + d, { strokeDashoffset: 0 }, e || LEMBUT]]); }
  function gaya(root, peta) {
    Object.keys(peta).forEach(function (sel) {
      semua(root, sel).forEach(function (el) {
        Object.keys(peta[sel]).forEach(function (p) { el.style[p] = String(peta[sel][p]); });
      });
    });
  }

  /* ---------------- proyeksi isometrik ----------------
     o = [x layar titik asal, y layar titik asal, skala]. Sumbu x dunia ke
     kanan-bawah, y ke kiri-bawah, z ke atas. */
  var C30 = Math.cos(Math.PI / 6);
  function iso(o, x, y, z) { return [o[0] + (x - y) * C30 * o[2], o[1] + (x + y) * 0.5 * o[2] - (z || 0) * o[2]]; }
  function titik(o, p) { var q = iso(o, p[0], p[1], p[2]); return f(q[0]) + ' ' + f(q[1]); }
  function poli(o, pts) { return 'M' + pts.map(function (p) { return titik(o, p); }).join(' L') + ' Z'; }
  function asal(q) { return 'transform-origin:' + f(q[0]) + 'px ' + f(q[1]) + 'px'; }
  /* balok: bidang yang terlihat — kanan (x = x1), kiri (y = y1), atas */
  function balok(o, x0, y0, z0, w, d, h, kelas) {
    var x1 = x0 + w, y1 = y0 + d, z1 = z0 + h;
    return '<g class="' + (kelas || '') + '">' +
      '<path class="acs-sisi-kanan" d="' + poli(o, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]) + '"/>' +
      '<path class="acs-sisi-kiri" d="' + poli(o, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]) + '"/>' +
      '<path class="acs-sisi-atas" d="' + poli(o, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]) + '"/>' +
    '</g>';
  }
  /* limas segi empat: alas ±r di z0, puncak di z0 + tinggi */
  function limas(o, r, z0, tinggi, kelas) {
    var A = [0, 0, z0 + tinggi];
    return '<g class="' + (kelas || '') + '">' +
      '<path class="acs-sisi-kiri" d="' + poli(o, [[-r, r, z0], [r, r, z0], A]) + '"/>' +
      '<path class="acs-sisi-kanan" d="' + poli(o, [[r, -r, z0], [r, r, z0], A]) + '"/>' +
    '</g>';
  }

  /* ---------------- teks & kartu ---------------- */
  function teks(x, y, isi, kelas, anchor) {
    return '<text class="acs-teks ' + (kelas || '') + '" x="' + f(x) + '" y="' + f(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(isi) + '</text>';
  }
  function kotakKartu(x, y, w, h, kelas) {
    return '<rect class="acs-kartu ' + (kelas || '') + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(Math.min(16, h / 2)) + '"/>';
  }
  function garis(d, kelas) { return '<path class="acs-garis ' + (kelas || '') + '" d="' + d + '" pathLength="1"/>'; }

  /* ---------------- tokoh ---------------- */
  var ORTU = { sendi: true, usia: 'dewasa', pakaian: 'santai' };
  var ANAK = { sendi: true, usia: 'anak', pakaian: 'muda', gaya: '--k-muda:#4f8fcf;--k-celana:#3b4a63' };
  /* ukuran nested <svg> lewat atribut: tidak semua browser menerapkan
     width/height CSS pada <svg> di dalam SVG */
  function tokoh(o) { return window.PSGKarakter ? window.PSGKarakter.svg(o).replace('<svg class="psg-k', '<svg width="120" height="240" class="psg-k') : ''; }
  /* orang berdiri: kaki di (x, y), skala s, cermin bila arah -1 */
  function orang(kelas, x, y, s, o, arah) {
    var tx = arah === -1 ? x + 61 * s : x - 61 * s;
    return '<g class="acs-orang ' + kelas + '"><g transform="translate(' + f(tx) + ' ' + f(y - 226 * s) + ') scale(' + (arah === -1 ? -s : s) + ' ' + s + ')">' + tokoh(o) + '</g></g>';
  }
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
  function jalan(tl, root, mulai, durasi, langkah) {
    if (window.PSGKarakter && root) window.PSGKarakter.jalan(tl, root.querySelector('.psg-k'), { mulai: mulai, durasi: durasi, langkah: langkah });
  }

  /* ---------------- kamera berlapis (parallax) ----------------
     tiga lapis = tiga <svg> bertumpuk: l1 jauh, l2 tengah, l3 depan;
     c = [dx, dy] dalam satuan viewBox (maks ±24). Kamera menggeser <div>
     pembungkus tiap <svg> (transform CSS pada kotak HTML) sehingga isi SVG tidak
     di-raster ulang tiap frame. Hanya translate: skala pada lapis berteks memaksa
     layout ulang teks SVG tiap frame (terukur p95 50 ms vs 16,7 ms, CPU 4×).
     Satuan viewBox → px memakai skala dari paskan(); bila ukuran panggung
     berubah, keyframe kamera dihitung ulang. */
  var FAKTOR = { l1: 0.25, l2: 0.55, l3: 1 };
  var PEMISAH_LAPIS = '<!--acs-lapis-->';
  function tfKamera(k, c, s) { s = s || 1; return 'translate(' + f(c[0] * k * s) + 'px,' + f(c[1] * k * s) + 'px)'; }
  function kfKamera(el) {
    var k = FAKTOR[el.getAttribute('data-lapis')], s = el.__s;
    return el.__kamera.map(function (fr) { return [fr[0], { transform: tfKamera(k, fr[1], s) }, fr[2]]; });
  }
  function kamera(tl, st, frames) {
    Object.keys(FAKTOR).forEach(function (l) {
      var el = satu(st, '.acs-' + l);
      if (!el) return;
      el.__kamera = frames;
      el.__animKamera = jejak(tl, el, kfKamera(el));
    });
  }
  function kameraDiam(st, c) {
    Object.keys(FAKTOR).forEach(function (l) {
      var el = satu(st, '.acs-' + l);
      if (!el) return;
      el.__diam = c;
      el.style.transform = tfKamera(FAKTOR[l], c, el.__s);
    });
  }
  function lapis(fokus, l1, l2, l3) { return l1 + PEMISAH_LAPIS + l2 + PEMISAH_LAPIS + l3; }

  function defs() {
    return '<defs>' +
      '<radialGradient id="acsCahaya"><stop offset="0" class="acs-st-cahaya"/><stop offset="1" class="acs-st-cahaya" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="acsBayang"><stop offset="0" class="acs-st-bayang"/><stop offset="1" class="acs-st-bayang" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="acsHalo"><stop offset="0" class="acs-st-halo"/><stop offset="1" class="acs-st-halo" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="acsSapu" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="acs-st-sapu" stop-opacity="0"/><stop offset=".5" class="acs-st-sapu"/><stop offset="1" class="acs-st-sapu" stop-opacity="0"/></linearGradient>' +
    '</defs>';
  }

  /* ---------------- dunia luar ruang (S2, S6) ---------------- */
  function duniaLuar(o) {
    o = o || {};
    var mx = o.matahari || [360, 92], aw = o.awan || [[70, 70], [250, 44]];
    var kota = '';
    [[-60, 196, 22, 36], [-32, 184, 18, 48], [-10, 204, 26, 28], [352, 190, 20, 42], [376, 178, 16, 54], [396, 200, 28, 32], [436, 188, 20, 44]].forEach(function (b) {
      kota += '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="2"/>';
    });
    var l1 = '<circle class="acs-matahari-cahaya" cx="' + mx[0] + '" cy="' + mx[1] + '" r="120" fill="url(#acsCahaya)"/>' +
      '<circle class="acs-matahari" cx="' + mx[0] + '" cy="' + mx[1] + '" r="24"/>' +
      '<g class="acs-awan"><ellipse cx="' + aw[0][0] + '" cy="' + aw[0][1] + '" rx="42" ry="11"/><ellipse cx="' + (aw[0][0] + 26) + '" cy="' + (aw[0][1] - 8) + '" rx="26" ry="10"/><ellipse cx="' + aw[1][0] + '" cy="' + aw[1][1] + '" rx="34" ry="9"/></g>' +
      '<g class="acs-kota">' + kota + '</g>' +
      '<path class="acs-bukit-1" d="M-700 236 C -400 214, -120 232, 60 222 C 180 214, 250 196, 330 206 C 420 218, 560 226, 1100 232 V900 H-700 Z"/>' +
      '<path class="acs-bukit-2" d="M-700 252 C -300 244, 0 256, 120 246 C 230 236, 300 236, 380 244 C 520 256, 800 252, 1100 256 V900 H-700 Z"/>';
    var l2 = '<path class="acs-tanah" d="M-700 262 C -200 256, 200 270, 480 258 C 760 248, 900 258, 1100 258 V900 H-700 Z"/>' +
      '<g class="acs-pohon"><path d="M8 276 V238"/><circle cx="8" cy="228" r="20"/><circle cx="26" cy="242" r="13"/><path d="M414 280 V246"/><circle cx="414" cy="236" r="18"/></g>';
    return { l1: l1, l2: l2 };
  }

  /* rumah pseudo-3D: fondasi, dinding kiri/kanan, pelana, atap dua bidang,
     jendela, pintu, rangka (untuk animasi membangun) */
  var RM = { w: 110, d: 80, z0: 8, dinding: 58, ridge: 104 };
  function rumah(o, kelas) {
    var w = RM.w, d = RM.d, z0 = RM.z0, zt = z0 + RM.dinding, zr = RM.ridge, m = d / 2;
    var jendelaKiri = function (x0, x1) { return poli(o, [[x0, d, z0 + 22], [x1, d, z0 + 22], [x1, d, z0 + 44], [x0, d, z0 + 44]]); };
    var jendelaKanan = function (y0, y1) { return poli(o, [[w, y0, z0 + 22], [w, y1, z0 + 22], [w, y1, z0 + 44], [w, y0, z0 + 44]]); };
    var rangka = [[0, 0], [w, 0], [w, d], [0, d]].map(function (p) { return 'M' + titik(o, [p[0], p[1], z0]) + ' L' + titik(o, [p[0], p[1], zt]); }).join(' ') +
      ' M' + titik(o, [0, 0, zt]) + ' L' + titik(o, [w, 0, zt]) + ' L' + titik(o, [w, d, zt]) + ' L' + titik(o, [0, d, zt]) + ' Z' +
      ' M' + titik(o, [0, m, zt]) + ' L' + titik(o, [0, m, zr]) + ' L' + titik(o, [w, m, zr]) + ' L' + titik(o, [w, m, zt]);
    return '<g class="acs-rumah ' + (kelas || '') + '">' +
      '<ellipse class="acs-rumah-bayang" cx="' + f(iso(o, w / 2, d / 2, 0)[0]) + '" cy="' + f(iso(o, w / 2, d / 2, 0)[1] + 8 * o[2]) + '" rx="' + f(118 * o[2]) + '" ry="' + f(40 * o[2]) + '" fill="url(#acsBayang)"/>' +
      '<g class="acs-fondasi" style="' + asal(iso(o, w + 6, d + 6, 0)) + '">' + balok(o, -6, -6, 0, w + 12, d + 12, z0, 'acs-m-fondasi') + '</g>' +
      '<path class="acs-rangka" d="' + rangka + '" pathLength="1"/>' +
      '<g class="acs-dinding acs-dinding-kanan" style="' + asal(iso(o, w, d, z0)) + '"><path class="acs-m-dinding-kanan" d="' + poli(o, [[w, 0, z0], [w, d, z0], [w, d, zt], [w, 0, zt]]) + '"/>' +
        '<path class="acs-jendela" d="' + jendelaKanan(22, 48) + '"/><path class="acs-jendela-nyala" d="' + jendelaKanan(22, 48) + '"/></g>' +
      '<g class="acs-dinding acs-dinding-kiri" style="' + asal(iso(o, w, d, z0)) + '"><path class="acs-m-dinding-kiri" d="' + poli(o, [[0, d, z0], [w, d, z0], [w, d, zt], [0, d, zt]]) + '"/>' +
        '<path class="acs-jendela" d="' + jendelaKiri(12, 34) + '"/><path class="acs-jendela-nyala" d="' + jendelaKiri(12, 34) + '"/>' +
        '<path class="acs-jendela" d="' + jendelaKiri(78, 100) + '"/><path class="acs-jendela-nyala" d="' + jendelaKiri(78, 100) + '"/>' +
        '<path class="acs-pintu" d="' + poli(o, [[48, d, z0], [64, d, z0], [64, d, z0 + 34], [48, d, z0 + 34]]) + '"/></g>' +
      '<g class="acs-pelana" style="' + asal(iso(o, w, m, zt)) + '"><path class="acs-m-pelana" d="' + poli(o, [[w, 0, zt], [w, d, zt], [w, m, zr]]) + '"/></g>' +
      '<g class="acs-atap acs-atap-belakang"><path class="acs-m-atap-belakang" d="' + poli(o, [[-4, -6, zt], [w + 4, -6, zt], [w + 4, m, zr + 2], [-4, m, zr + 2]]) + '"/></g>' +
      '<g class="acs-atap acs-atap-depan"><path class="acs-m-atap-depan" d="' + poli(o, [[-4, d + 6, zt], [w + 4, d + 6, zt], [w + 4, m, zr + 2], [-4, m, zr + 2]]) + '"/></g>' +
    '</g>';
  }
  /* miniatur rumah (simbol aset) berpusat di (cx, cy) */
  function miniatur(cx, cy, s) {
    var o = [cx - 12 * s, cy - 8 * s, 0.2 * s];
    return '<circle class="acs-miniatur-cahaya" cx="' + f(cx) + '" cy="' + f(cy - 4 * s) + '" r="' + f(30 * s) + '" fill="url(#acsCahaya)"/>' +
      balok(o, 0, 0, 0, RM.w, RM.d, RM.z0 + RM.dinding, 'acs-m-miniatur') +
      '<path class="acs-m-atap-depan" d="' + poli(o, [[-4, RM.d + 6, 66], [RM.w + 4, RM.d + 6, 66], [RM.w + 4, 40, 106], [-4, 40, 106]]) + '"/>' +
      '<path class="acs-m-pelana" d="' + poli(o, [[RM.w, 0, 66], [RM.w, RM.d, 66], [RM.w, 40, 104]]) + '"/>';
  }

  var S = [];

  /* ---------------- scene 1: 3 fungsi asuransi ---------------- */
  var O1 = [140, 262, 1];
  var TINGKAT = [
    { kelas: 'acs-tingkat-1', r: 62, z0: 0, h: 34, m: 'acs-m-t1', label: ['INCOME', 'PROTECTION'], y: [284, 306], ujung: iso(O1, 62, 0, 17), f: 'acs-f17' },
    { kelas: 'acs-tingkat-2', r: 44, z0: 34, h: 32, m: 'acs-m-t2', label: ['ASSET', 'PROTECTION'], y: [218, 240], ujung: iso(O1, 44, 0, 50), f: 'acs-f17' }
  ];
  var PUNCAK = { r: 30, z0: 66, h: 70 };
  S[1] = {
    inti: [0, 0, 420, 380],
    fokus: [140, 200],
    set: function () {
      var hantu = TINGKAT.map(function (t, i) { return '<g class="acs-hantu acs-hantu-' + (i + 1) + '">' + balok(O1, -t.r, -t.r, t.z0, 2 * t.r, 2 * t.r, t.h, 'acs-m-hantu') + '</g>'; }).join('') +
        '<g class="acs-hantu acs-hantu-3">' + limas(O1, PUNCAK.r, PUNCAK.z0, PUNCAK.h, 'acs-m-hantu') + '</g>';
      var tingkat = TINGKAT.map(function (t) {
        return '<g class="acs-tingkat ' + t.kelas + '" style="' + asal(iso(O1, t.r, t.r, t.z0)) + '">' + balok(O1, -t.r, -t.r, t.z0, 2 * t.r, 2 * t.r, t.h, t.m) + '</g>';
      }).join('');
      var puncakAlas = iso(O1, PUNCAK.r, PUNCAK.r, PUNCAK.z0), apex = iso(O1, 0, 0, PUNCAK.z0 + PUNCAK.h);
      var label = TINGKAT.map(function (t, i) {
        return '<g class="acs-label acs-label-' + (i + 1) + '">' + garis('M252 ' + (t.y[0] + 2) + ' L' + f(t.ujung[0] + 4) + ' ' + f(t.ujung[1]), 'acs-penunjuk') +
          '<circle class="acs-titik" cx="' + f(t.ujung[0] + 4) + '" cy="' + f(t.ujung[1]) + '" r="3.5"/>' +
          teks(258, t.y[0], t.label[0], t.f + ' acs-teks-t' + (i + 1), 'start') + teks(258, t.y[1], t.label[1], t.f + ' acs-teks-t' + (i + 1), 'start') + '</g>';
      }).join('');
      var kanan = iso(O1, 20, 0, 89);
      var l1 = '<circle class="acs-halo" cx="140" cy="190" r="170" fill="url(#acsHalo)"/>' +
        '<g class="acs-bokeh"><circle cx="330" cy="92" r="5"/><circle cx="366" cy="130" r="3"/><circle cx="46" cy="96" r="4"/><circle cx="300" cy="60" r="2.5"/></g>';
      var l2 = '<ellipse class="acs-lantai-bayang" cx="140" cy="300" rx="200" ry="62" fill="url(#acsBayang)"/>' +
        '<ellipse class="acs-lantai-cincin" cx="140" cy="300" rx="178" ry="52"/>';
      var l3 = teks(210, 40, '3 FUNGSI ASURANSI', 'acs-f20 acs-judul') +
        '<g class="acs-alas" style="' + asal(iso(O1, 76, 76, -8)) + '">' + balok(O1, -76, -76, -8, 152, 152, 8, 'acs-m-alas') + '</g>' +
        hantu + tingkat +
        '<g class="acs-puncak" style="' + asal(puncakAlas) + '"><circle class="acs-puncak-cahaya" cx="' + f(apex[0]) + '" cy="' + f(apex[1] + 40) + '" r="64" fill="url(#acsCahaya)"/>' +
          limas(O1, PUNCAK.r, PUNCAK.z0, PUNCAK.h, 'acs-m-emas') + '</g>' +
        '<g clip-path="url(#acsKlipPuncak)"><rect class="acs-sapu" x="80" y="110" width="44" height="130" fill="url(#acsSapu)"/></g>' +
        '<circle class="acs-kilat" cx="' + f(apex[0]) + '" cy="' + f(apex[1] + 50) + '" r="46" fill="url(#acsCahaya)" style="transform-origin:' + f(apex[0]) + 'px ' + f(apex[1] + 50) + 'px"/>' +
        label +
        '<g class="acs-label acs-label-3">' + garis('M252 158 L' + f(kanan[0] + 4) + ' ' + f(kanan[1]), 'acs-penunjuk') +
          '<circle class="acs-titik" cx="' + f(kanan[0] + 4) + '" cy="' + f(kanan[1]) + '" r="3.5"/>' +
          teks(258, 146, 'ASSET', 'acs-f22 acs-teks-t3', 'start') + teks(258, 174, 'CREATION', 'acs-f22 acs-teks-t3', 'start') + '</g>';
      var klip = '<clipPath id="acsKlipPuncak"><path d="' + poli(O1, [[-PUNCAK.r, PUNCAK.r, PUNCAK.z0], [PUNCAK.r, PUNCAK.r, PUNCAK.z0], [0, 0, PUNCAK.z0 + PUNCAK.h]]) + ' ' +
        poli(O1, [[PUNCAK.r, -PUNCAK.r, PUNCAK.z0], [PUNCAK.r, PUNCAK.r, PUNCAK.z0], [0, 0, PUNCAK.z0 + PUNCAK.h]]) + '"/></clipPath>';
      return '<defs>' + klip + '</defs>' + lapis(this.fokus, l1, l2, l3);
    },
    siap: function (st) {
      gaya(st, { '.acs-tingkat-1': { opacity: 0.72 }, '.acs-tingkat-2': { opacity: 0.72 }, '.acs-label-1': { opacity: 0.8 }, '.acs-label-2': { opacity: 0.8 } });
      kameraDiam(st, [0, 8]);
    },
    /* ketukan: (a) tiga slot fungsi · (b) melindungi penghasilan, melindungi aset ·
       (c) puncak: menciptakan aset baru → fokus penciptaan aset */
    ketuk: [2600, 3600, 3400],
    animate: function (tl, st, K) {
      var t1 = Math.max(K.B[1] + 150, K.kata(1, 'melindungi penghasilan') - 250);
      var t2 = Math.max(t1 + 1300, K.kata(1, 'melindungi aset') - 250);
      var t3 = Math.max(K.B[2] + 150, K.kata(2, 'menciptakan aset baru') - 300);
      var tp = Math.max(t3 + 1600, K.kata(2, 'penciptaan aset') - 250);
      var redup = t3 + 900;
      kamera(tl, st, [[0, [0, 22]], [2400, [0, 0], LEMBUT], [tp, [0, 0]], [tp + 1800, [0, 8], LEMBUT]]);
      pudar(tl, satu(st, '.acs-halo'), 0, 900);
      jejak(tl, satu(st, '.acs-alas'), [[150, { opacity: 0, transform: 'translateY(14px)' }], [900, { opacity: 1, transform: 'none' }, PEGAS]]);
      /* slot hantu berdenyut satu per satu, hilang saat tingkatnya mendarat */
      [[1300, t1 + 700], [1800, t2 + 700], [2300, t3 + 800]].forEach(function (p, i) {
        jejak(tl, satu(st, '.acs-hantu-' + (i + 1)), [[900, { opacity: 0 }], [1300, { opacity: 0.45 }], [p[0], { opacity: 0.45 }], [p[0] + 260, { opacity: 0.95 }], [p[0] + 760, { opacity: 0.45 }], [p[1], { opacity: 0.45 }], [p[1] + 300, { opacity: 0 }]]);
      });
      /* (b) tingkat 1 naik dari alas; tingkat 2 jatuh lalu mendarat */
      jejak(tl, satu(st, '.acs-tingkat-1'), [[t1, { opacity: 0, transform: 'scaleY(.04)' }], [t1 + 150, { opacity: 1 }], [t1 + 850, { transform: 'none' }, PEGAS], [redup, { opacity: 1 }], [redup + 800, { opacity: 0.72 }]]);
      jejak(tl, satu(st, '.acs-tingkat-2'), [[t2, { opacity: 0, transform: 'translateY(-80px)' }], [t2 + 120, { opacity: 1 }], [t2 + 620, { transform: 'none' }, JATUH], [t2 + 760, { transform: 'translateY(-5px)' }], [t2 + 900, { transform: 'none' }], [redup, { opacity: 1 }], [redup + 800, { opacity: 0.72 }]]);
      [[1, t1], [2, t2]].forEach(function (p) {
        jejak(tl, satu(st, '.acs-label-' + p[0]), [[p[1] + 350, { opacity: 0, transform: 'translateX(-12px)' }], [p[1] + 850, { opacity: 1, transform: 'none' }], [redup, { opacity: 1 }], [redup + 800, { opacity: 0.8 }]]);
        gambarGaris(tl, satu(st, '.acs-label-' + p[0] + ' .acs-penunjuk'), p[1] + 350, 600);
      });
      /* (c) puncak turun bercahaya; tingkat bawah meredup */
      jejak(tl, satu(st, '.acs-puncak'), [[t3, { opacity: 0, transform: 'translateY(-78px)' }], [t3 + 150, { opacity: 1 }], [t3 + 760, { transform: 'none' }, JATUH], [t3 + 900, { transform: 'translateY(-6px)' }], [t3 + 1060, { transform: 'none' }]]);
      jejak(tl, satu(st, '.acs-kilat'), [[t3 + 700, { opacity: 0, transform: 'scale(.4)' }], [t3 + 900, { opacity: 0.9 }], [t3 + 1700, { opacity: 0, transform: 'scale(1.9)' }]]);
      muncul(tl, satu(st, '.acs-label-3'), t3 + 800, 600, 'translateX(-12px)');
      gambarGaris(tl, satu(st, '.acs-label-3 .acs-penunjuk'), t3 + 800, 600);
      /* sorotan menyapu puncak saat "penciptaan aset" */
      jejak(tl, satu(st, '.acs-sapu'), [[tp, { opacity: 0, transform: 'translateX(-60px)' }], [tp + 150, { opacity: 0.95 }], [tp + 1150, { opacity: 0.95, transform: 'translateX(90px)' }], [tp + 1350, { opacity: 0 }]]);
      tl.loop(satu(st, '.acs-puncak-cahaya'), [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 3000, delay: t3 + 1200 });
      tl.loop(satu(st, '.acs-bokeh'), [{ transform: 'none' }, { transform: 'translate(0px,-6px)' }, { transform: 'none' }], { duration: 6200 });
    }
  };

  /* ---------------- scene 2: membangun aset ---------------- */
  var O2 = [250, 250, 1];
  S[2] = {
    inti: [0, 0, 420, 380],
    fokus: [240, 240],
    set: function () {
      var w = duniaLuar();
      var lahan = [[-24, -24, 0], [134, -24, 0], [134, 104, 0], [-24, 104, 0]];
      var patok = lahan.map(function (p, i) { var q = iso(O2, p[0], p[1], 0); return '<g class="acs-patok acs-patok-' + i + '" style="' + asal(q) + '"><path d="M' + f(q[0]) + ' ' + f(q[1]) + ' V' + f(q[1] - 14) + '"/></g>'; }).join('');
      var puncak = iso(O2, 55, 40, 106);
      var l3 = '<path class="acs-lahan" d="' + poli(O2, lahan) + '"/>' +
        '<path class="acs-lahan-garis" d="' + poli(O2, lahan) + '" pathLength="1"/>' + patok +
        rumah(O2) +
        '<g class="acs-kilau-rumah" style="transform-origin:' + f(puncak[0]) + 'px ' + f(puncak[1] - 8) + 'px"><path d="M' + f(puncak[0]) + ' ' + f(puncak[1] - 22) + ' l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z"/></g>' +
        '<g class="acs-target" style="transform-origin:300px 77px">' + garis('M300 110 L' + f(puncak[0]) + ' ' + f(puncak[1] - 4), 'acs-penunjuk') + kotakKartu(202, 44, 196, 66, 'acs-kartu-tujuan') +
          teks(300, 68, 'TARGET ASET', 'acs-f17 acs-teks-2') + teks(300, 98, 'Rp5 MILIAR', 'acs-f28 acs-teks-aksen') + '</g>' +
        '<g class="acs-chip acs-chip-1">' + kotakKartu(30, 102, 136, 36, 'acs-kartu-chip') + teks(98, 126, 'ASET BARU', 'acs-f17 acs-teks-emas') + '</g>' +
        '<g class="acs-chip acs-chip-2">' + kotakKartu(4, 146, 188, 36, 'acs-kartu-chip') + teks(98, 170, 'RENCANA WARISAN', 'acs-f17 acs-teks-emas') + '</g>' +
        '<g class="acs-keluarga"><ellipse class="acs-orang-bayang" cx="96" cy="356" rx="50" ry="7" fill="url(#acsBayang)"/>' +
          orang('acs-ortu', 74, 354, 0.46, ORTU) + orang('acs-anak', 118, 358, 0.46, ANAK) + '</g>';
      return lapis(this.fokus, w.l1, w.l2, l3);
    },
    siap: function (st) {
      gaya(st, { '.acs-anak .k-lengan-d': { transform: 'rotate(-120deg)' }, '.acs-anak .k-hasta-d': { transform: 'rotate(-10deg)' }, '.acs-ortu .k-kepala': { transform: 'rotate(-4deg)' } });
    },
    /* ketukan: (a) lahan → fondasi → struktur → dinding → atap → jendela; target ·
       (b) keluarga datang: aset baru, rencana warisan */
    ketuk: [7200, 4400],
    animate: function (tl, st, K) {
      var tw = Math.max(3100, K.kata(0, 'properti') - 250), ta = tw + 1000;
      var tt = Math.max(ta + 500, K.kata(0, '5 miliar') - 250), tj = Math.max(ta + 1200, tt + 500);
      var tf = K.B[1] + 150;
      var c1 = Math.max(tf + 700, K.kata(1, 'aset baru') - 250), c2 = Math.max(c1 + 800, K.kata(1, 'warisan') - 250);
      kamera(tl, st, [[0, [-24, 6]], [1500, [0, 0], LEMBUT]]);
      tl.loop(satu(st, '.acs-awan'), [{ transform: 'none' }, { transform: 'translate(18px,0px)' }, { transform: 'none' }], { duration: 16000 });
      pudar(tl, satu(st, '.acs-lahan'), 300, 700);
      gambarGaris(tl, satu(st, '.acs-lahan-garis'), 300, 1100);
      semua(st, '.acs-patok').forEach(function (el, i) { pop(tl, el, 800 + i * 120, 380); });
      jejak(tl, satu(st, '.acs-rumah-bayang'), [[1200, { opacity: 0 }], [2000, { opacity: 1 }]]);
      jejak(tl, satu(st, '.acs-fondasi'), [[1200, { opacity: 0, transform: 'scaleY(.05)' }], [1300, { opacity: 1 }], [1900, { transform: 'none' }, PEGAS]]);
      /* struktur: rangka tergambar, lalu memudar saat dinding menutup */
      gambarGaris(tl, satu(st, '.acs-rangka'), 1900, 1300);
      jejak(tl, satu(st, '.acs-rangka'), [[1900, { opacity: 1 }], [tw + 700, { opacity: 1 }], [ta + 700, { opacity: 0 }]]);
      jejak(tl, satu(st, '.acs-dinding-kiri'), [[tw, { opacity: 0, transform: 'scaleY(.05)' }], [tw + 150, { opacity: 1 }], [tw + 800, { transform: 'none' }, PEGAS]]);
      jejak(tl, satu(st, '.acs-dinding-kanan'), [[tw + 250, { opacity: 0, transform: 'scaleY(.05)' }], [tw + 400, { opacity: 1 }], [tw + 1050, { transform: 'none' }, PEGAS]]);
      jejak(tl, satu(st, '.acs-pelana'), [[tw + 600, { opacity: 0, transform: 'scaleY(.05)' }], [tw + 1100, { opacity: 1, transform: 'none' }]]);
      [['.acs-atap-belakang', 0], ['.acs-atap-depan', 140]].forEach(function (p) {
        var t = ta + p[1];
        jejak(tl, satu(st, p[0]), [[t, { opacity: 0, transform: 'translateY(-46px)' }], [t + 100, { opacity: 1 }], [t + 560, { transform: 'none' }, JATUH], [t + 680, { transform: 'translateY(-4px)' }], [t + 800, { transform: 'none' }]]);
      });
      jejak(tl, satu(st, '.acs-target'), fPop(tt, 560));
      gambarGaris(tl, satu(st, '.acs-target .acs-penunjuk'), tt + 200, 600);
      semua(st, '.acs-jendela-nyala').forEach(function (el, i) { jejak(tl, el, [[tj + i * 120, { opacity: 0 }], [tj + i * 120 + 500, { opacity: 1 }]]); });
      jejak(tl, satu(st, '.acs-kilau-rumah'), [[tj + 500, { opacity: 0, transform: 'scale(.2) rotate(0deg)' }], [tj + 800, { opacity: 1, transform: 'scale(1.1) rotate(45deg)' }], [tj + 1300, { opacity: 0, transform: 'scale(.4) rotate(90deg)' }]]);
      /* (b) keluarga masuk dari kiri */
      jejak(tl, satu(st, '.acs-keluarga'), [[tf, { opacity: 0, transform: 'translate(-150px,0px)' }], [tf + 250, { opacity: 1 }], [tf + 2100, { transform: 'translate(0px,0px)' }, 'linear']]);
      jejak(tl, satu(st, '.acs-anak .k-lengan-d'), [[c2, { transform: 'rotate(0deg)' }], [c2 + 700, { transform: 'rotate(-120deg)' }, PEGAS]]);
      jejak(tl, satu(st, '.acs-anak .k-hasta-d'), [[c2, { transform: 'rotate(0deg)' }], [c2 + 700, { transform: 'rotate(-10deg)' }]]);
      jejak(tl, satu(st, '.acs-ortu .k-kepala'), [[c2 + 100, { transform: 'rotate(0deg)' }], [c2 + 700, { transform: 'rotate(-4deg)' }]]);
      jalan(tl, satu(st, '.acs-ortu'), tf, 2100, 6);
      jalan(tl, satu(st, '.acs-anak'), tf, 2100, 8);
      muncul(tl, satu(st, '.acs-chip-1'), c1, 520, 'translateY(10px)');
      muncul(tl, satu(st, '.acs-chip-2'), c2, 520, 'translateY(10px)');
      tl.loop(satu(st, '.acs-jendela-nyala'), [{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }], { duration: 3400, delay: tj + 900 });
    }
  };

  /* ---------------- scene 3–4: maket 10 irisan (pembiayaan) ---------------- */
  var O3 = [70, 150, 1];
  var IR = { w: 14, jarak: 15, d: 60, h: 64, m: 30, r: 94, n: 10 };
  function irisan(x0, kelas) {
    var o = O3, x1 = x0 + IR.w, D = IR.d, H = IR.h, M = IR.m, R = IR.r;
    return '<g class="' + kelas + '">' +
      '<path class="acs-sisi-belakang" d="' + poli(o, [[x0, M, R], [x1, M, R], [x1, 0, H], [x0, 0, H]]) + '"/>' +
      '<path class="acs-sisi-kanan" d="' + poli(o, [[x1, 0, 0], [x1, D, 0], [x1, D, H], [x1, M, R], [x1, 0, H]]) + '"/>' +
      '<path class="acs-sisi-kiri" d="' + poli(o, [[x0, D, 0], [x1, D, 0], [x1, D, H], [x0, D, H]]) + '"/>' +
      '<path class="acs-sisi-atas" d="' + poli(o, [[x0, D, H], [x1, D, H], [x1, M, R], [x0, M, R]]) + '"/>' +
    '</g>';
  }
  function studio() {
    var gridA = '', gridB = '';
    for (var k = -2; k <= 12; k++) { gridA += 'M' + titik(O3, [k * 20 - 20, -40, 0]) + ' L' + titik(O3, [k * 20 - 20, 150, 0]) + ' '; }
    for (var j = -2; j <= 7; j++) { gridB += 'M' + titik(O3, [-60, j * 20, 0]) + ' L' + titik(O3, [240, j * 20, 0]) + ' '; }
    return {
      l1: '<rect class="acs-sorot-studio" x="10" y="-60" width="200" height="340" fill="url(#acsHalo)"/>' +
        '<circle class="acs-halo" cx="110" cy="150" r="190" fill="url(#acsHalo)"/>',
      l2: '<path class="acs-lantai-grid" d="' + gridA + gridB + '"/>' +
        '<ellipse class="acs-lantai-bayang" cx="' + f(iso(O3, 75, 30, 0)[0]) + '" cy="' + f(iso(O3, 75, 30, 0)[1] + 6) + '" rx="150" ry="46" fill="url(#acsBayang)"/>'
    };
  }
  function maket(opsi) {
    var s = '';
    for (var i = 0; i < IR.n; i++) {
      var x0 = i * IR.jarak, q = iso(O3, x0 + IR.w, IR.d, 0);
      s += '<g class="acs-irisan acs-irisan-' + i + '" style="' + asal(q) + '">' + irisan(x0, 'acs-m-maket') +
        (opsi.emas(i) ? '<g class="acs-lapis-emas">' + irisan(x0, 'acs-m-emas') + '</g>' : '') +
        (opsi.kaca(i) ? '<g class="acs-lapis-kaca">' + irisan(x0, 'acs-m-kaca') + '</g>' : '') +
        (opsi.hantu && i < 3 ? '<g class="acs-lapis-hantu">' + irisan(x0, 'acs-m-hantu') + '</g>' : '') +
      '</g>';
    }
    return '<g class="acs-blok" style="' + asal(iso(O3, 75, 30, 0)) + '">' + s + '</g>';
  }
  /* jalur waktu 20 tahun + chip cicilan (kolom bawah) */
  function jalurCicilan(nilai) {
    var tanda = '';
    for (var i = 0; i < 20; i++) { var x = 24 + i * (212 / 19); tanda += '<path class="acs-tanda acs-tanda-' + i + '" d="M' + f(x) + ' 312 V324" style="transform-origin:' + f(x) + 'px 318px"/>'; }
    var koin = '';
    for (var k = 0; k < 5; k++) koin += '<g class="acs-koin acs-koin-' + k + '"><ellipse class="acs-koin-sisi" cx="182" cy="248" rx="8" ry="4.6"/><ellipse class="acs-koin-atas" cx="182" cy="245.5" rx="8" ry="4.2"/></g>';
    return '<g class="acs-jalur"><path class="acs-jalur-garis" d="M24 318 H236" pathLength="1"/>' + tanda +
        teks(24, 300, '7%', 'acs-f18 acs-teks-biru acs-jalur-bunga', 'start') + teks(58, 300, '• 20 TAHUN', 'acs-f17 acs-teks-2 acs-jalur-tahun', 'start') + '</g>' +
      koin +
      '<g class="acs-cicilan" style="transform-origin:330px 315px">' + kotakKartu(250, 282, 160, 66, 'acs-kartu-cicilan') +
        teks(330, 314, '≈ ' + nilai, 'acs-f22 acs-teks-aksen') + teks(330, 337, '/ BLN', 'acs-f17 acs-teks-2') + '</g>';
  }
  var TITIK_DP = iso(O3, 22, 45, 79), TITIK_SISA = iso(O3, 149, 30, 40);
  function kartuKanan(kelas, y, baris1, kls1, baris2, ujung) {
    return '<g class="acs-kartu-grup ' + kelas + '">' + garis('M232 ' + (y + 30) + ' L' + f(ujung[0] + 3) + ' ' + f(ujung[1]), 'acs-penunjuk') +
      '<circle class="acs-titik" cx="' + f(ujung[0] + 3) + '" cy="' + f(ujung[1]) + '" r="3.5"/>' +
      kotakKartu(232, y, 176, 60, 'acs-kartu-info') +
      '<g class="acs-baris-1">' + teks(320, y + 25, baris1, kls1) + '</g>' +
      '<g class="acs-baris-2">' + teks(320, y + 50, baris2, 'acs-f20 acs-teks-1') + '</g></g>';
  }
  function siluetRumah() {
    return '<path class="acs-siluet" d="' + poli(O3, [[0, IR.d, 0], [149, IR.d, 0], [149, IR.d, IR.h], [149, IR.m, IR.r], [0, IR.m, IR.r], [0, IR.d, IR.h]]) + '"/>';
  }
  S[3] = {
    inti: [0, 0, 420, 380],
    fokus: [140, 190],
    set: function () {
      var w = studio();
      var l3 = teks(110, 26, 'TARGET ASET', 'acs-f17 acs-teks-2 acs-total-a') + teks(110, 54, 'Rp5 MILIAR', 'acs-f24 acs-teks-1 acs-total-b') +
        siluetRumah() +
        maket({ emas: function (i) { return i < 3; }, kaca: function (i) { return i >= 3; } }) +
        kartuKanan('acs-kartu-dp', 66, 'DP 30%', 'acs-f18 acs-teks-emas', 'Rp1,5 MILIAR', TITIK_DP) +
        kartuKanan('acs-kartu-sisa', 142, 'SISA', 'acs-f17 acs-teks-biru', 'Rp3,5 MILIAR', TITIK_SISA) +
        jalurCicilan('Rp27 JT');
      return lapis(this.fokus, w.l1, w.l2, l3);
    },
    siap: function (st) {
      for (var i = 0; i < 3; i++) { var p = {}; p['.acs-irisan-' + i] = { transform: 'translateY(-8px)' }; gaya(st, p); }
    },
    /* ketukan: (a) maket Rp5 M; DP 30% = Rp1,5 M (irisan emas) ·
       (b) sisa Rp3,5 M (kaca) → 7% • 20 tahun → ≈ Rp27 jt/bln */
    ketuk: [4200, 5200],
    animate: function (tl, st, K) {
      var tdp = Math.max(1900, K.kata(0, '30 persen') - 250), t15 = Math.max(tdp + 700, K.kata(0, '1,5 miliar') - 250);
      var t35 = Math.max(K.B[1] + 100, K.kata(1, '3,5 miliar') - 250);
      var t7 = Math.max(t35 + 900, K.kata(1, '7 persen') - 250), t20 = Math.max(t7 + 700, K.kata(1, '20 tahun') - 250);
      var tc = Math.max(t20 + 900, K.kata(1, '27 juta') - 250);
      kamera(tl, st, [[0, [-16, 10]], [2600, [0, 0], LEMBUT]]);
      jejak(tl, satu(st, '.acs-siluet'), [[0, { opacity: 0.9 }], [900, { opacity: 0 }]]);
      for (var i = 0; i < IR.n; i++) {
        var fr = [[200 + i * 70, { opacity: 0, transform: 'translateY(22px)' }], [700 + i * 70, { opacity: 1, transform: 'none' }, PEGAS]];
        if (i < 3) fr.push([tdp + i * 90, { transform: 'none' }], [tdp + i * 90 + 500, { transform: 'translateY(-8px)' }, PEGAS]);
        jejak(tl, satu(st, '.acs-irisan-' + i), fr);
        if (i < 3) pudar(tl, satu(st, '.acs-irisan-' + i + ' .acs-lapis-emas'), tdp + i * 90, 500);
        else pudar(tl, satu(st, '.acs-irisan-' + i + ' .acs-lapis-kaca'), t35 + (i - 3) * 80, 520);
      }
      muncul(tl, satu(st, '.acs-total-a'), 900, 500);
      muncul(tl, satu(st, '.acs-total-b'), 1050, 500);
      muncul(tl, satu(st, '.acs-kartu-dp'), tdp + 150, 520, 'translateX(16px)');
      gambarGaris(tl, satu(st, '.acs-kartu-dp .acs-penunjuk'), tdp + 300, 600);
      pudar(tl, satu(st, '.acs-kartu-dp .acs-baris-2'), t15, 450);
      muncul(tl, satu(st, '.acs-kartu-sisa'), t35 + 200, 520, 'translateX(16px)');
      gambarGaris(tl, satu(st, '.acs-kartu-sisa .acs-penunjuk'), t35 + 350, 600);
      animasiJalur(tl, st, t7, t20, tc, 3);
    }
  };
  /* jalur waktu, tanda tahun, chip, dan koin mengalir dari chip ke maket */
  function animasiJalur(tl, st, t7, t20, tc, nKoin) {
    gambarGaris(tl, satu(st, '.acs-jalur-garis'), t7, 900);
    muncul(tl, satu(st, '.acs-jalur-bunga'), t7 + 100, 450);
    semua(st, '.acs-tanda').forEach(function (el, i) { jejak(tl, el, [[t20 + i * 40, { opacity: 0, transform: 'scaleY(.2)' }], [t20 + i * 40 + 260, { opacity: 1, transform: 'none' }]]); });
    muncul(tl, satu(st, '.acs-jalur-tahun'), t20 + 100, 450);
    jejak(tl, satu(st, '.acs-cicilan'), fPop(tc, 560));
    semua(st, '.acs-koin').forEach(function (el, k) {
      if (k >= nKoin) return;
      var t = tc + 500 + k * (nKoin > 3 ? 300 : 450);
      jejak(tl, el, [[t, { opacity: 0, transform: 'translate(118px,70px)' }], [t + 150, { opacity: 1 }], [t + 600, { transform: 'translate(60px,-8px)' }, 'linear'], [t + 1000, { opacity: 1, transform: 'none' }, LEMBUT], [t + 1150, { opacity: 0 }]]);
    });
  }
  S[4] = {
    inti: [0, 0, 420, 380],
    fokus: [140, 190],
    set: function () {
      var w = studio();
      var l3 = teks(110, 26, 'TARGET ASET', 'acs-f17 acs-teks-2 acs-total-a') + teks(110, 54, 'Rp5 MILIAR', 'acs-f24 acs-teks-1 acs-total-b') +
        maket({ emas: function (i) { return i < 3; }, kaca: function () { return true; }, hantu: true }) +
        kartuKanan('acs-kartu-dp', 66, 'DP 0', 'acs-f18 acs-teks-emas', 'Rp0', TITIK_DP) +
        kartuKanan('acs-kartu-sisa', 142, 'PEMBIAYAAN', 'acs-f17 acs-teks-biru', 'Rp5 MILIAR', TITIK_SISA) +
        jalurCicilan('Rp39,5 JT');
      return lapis(this.fokus, w.l1, w.l2, l3);
    },
    siap: function (st) { gaya(st, { '.acs-lapis-emas': { opacity: 0 }, '.acs-lapis-hantu': { opacity: 0 } }); },
    /* ketukan: (a) tanpa uang muka: irisan DP terangkat, seluruh Rp5 M dibiayai ·
       (b) 7% • 20 tahun → ≈ Rp39,5 jt/bln */
    ketuk: [4200, 5000],
    animate: function (tl, st, K) {
      var tu = Math.max(1300, K.kata(0, 'tanpa uang muka') - 200), ts = Math.max(tu + 1400, K.kata(0, 'Seluruh') - 250);
      var t7 = Math.max(K.B[1] + 150, K.kata(1, '7 persen') - 250), t20 = Math.max(t7 + 700, K.kata(1, '20 tahun') - 250);
      var tc = Math.max(t20 + 900, K.kata(1, '39,5 juta') - 250);
      kamera(tl, st, [[0, [16, 10]], [2600, [0, 0], LEMBUT]]);
      for (var i = 0; i < IR.n; i++) {
        var fr = [[80 + i * 45, { opacity: 0, transform: 'translateY(22px)' }], [480 + i * 45, { opacity: 1, transform: 'none' }, PEGAS]];
        if (i < 3) fr.push([tu + i * 100 + 250, { opacity: 1 }], [tu + i * 100 + 700, { opacity: 0.3 }], [ts + i * 80, { opacity: 0.3 }], [ts + i * 80 + 420, { opacity: 1 }]);
        jejak(tl, satu(st, '.acs-irisan-' + i), fr);
        pudar(tl, satu(st, '.acs-irisan-' + i + ' .acs-lapis-kaca'), ts + i * 80, 450);
        if (i < 3) {
          /* irisan DP (emas) dari Pilihan 1 terangkat dan hilang */
          jejak(tl, satu(st, '.acs-irisan-' + i + ' .acs-lapis-emas'), [[0, { opacity: 1, transform: 'none' }], [tu + i * 100, { opacity: 1, transform: 'none' }], [tu + i * 100 + 750, { opacity: 0, transform: 'translateY(-46px)' }, LEMBUT]]);
          jejak(tl, satu(st, '.acs-irisan-' + i + ' .acs-lapis-hantu'), [[tu + 500, { opacity: 0 }], [tu + 900, { opacity: 1 }], [ts + i * 80, { opacity: 1 }], [ts + i * 80 + 450, { opacity: 0 }]]);
        }
      }
      muncul(tl, satu(st, '.acs-total-a'), 900, 500);
      muncul(tl, satu(st, '.acs-total-b'), 1050, 500);
      muncul(tl, satu(st, '.acs-kartu-dp'), tu + 250, 520, 'translateX(16px)');
      gambarGaris(tl, satu(st, '.acs-kartu-dp .acs-penunjuk'), tu + 400, 600);
      muncul(tl, satu(st, '.acs-kartu-sisa'), ts + 300, 520, 'translateX(16px)');
      gambarGaris(tl, satu(st, '.acs-kartu-sisa .acs-penunjuk'), ts + 450, 600);
      animasiJalur(tl, st, t7, t20, tc, 5);
      /* beban lebih besar: maket sedikit menekan saat cicilan muncul */
      jejak(tl, satu(st, '.acs-blok'), [[tc + 300, { transform: 'none' }], [tc + 550, { transform: 'translateY(4px)' }], [tc + 950, { transform: 'none' }, PEGAS]]);
    }
  };

  /* ---------------- scene 5: pilihan 3 — dunia berbeda ---------------- */
  var KR = { x: 210, y: 148 };
  var PARTIKEL = (function () {
    var hasil = [], s = 7;
    function acak() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 18; i++) {
      var a = i / 18 * Math.PI * 2 + acak() * 0.3, r = 120 + acak() * 60;
      hasil.push([f(Math.cos(a) * r), f(Math.sin(a) * r * 0.62), f(2 + acak() * 2.6), Math.round(acak() * 260)]);
    }
    return hasil;
  })();
  S[5] = {
    inti: [0, 0, 420, 380],
    fokus: [210, 170],
    set: function () {
      var x = KR.x, y = KR.y;
      var A = [x, y - 72], L = [x - 44, y - 4], FL = [x - 18, y + 12], FR = [x + 22, y + 12], R = [x + 44, y - 6], B = [x, y + 58];
      var sisi = function (p, kelas) { return '<path class="' + kelas + '" d="M' + p.map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join(' L') + ' Z"/>'; };
      var kristal = sisi([A, L, FL], 'acs-kr-1') + sisi([A, FL, FR], 'acs-kr-2') + sisi([A, FR, R], 'acs-kr-3') +
        sisi([B, L, FL], 'acs-kr-4') + sisi([B, FL, FR], 'acs-kr-5') + sisi([B, FR, R], 'acs-kr-6') +
        '<path class="acs-kr-tepi" d="M' + [A, L, B, R].map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join(' L') + ' Z M' + f(L[0]) + ' ' + f(L[1]) + ' L' + f(FL[0]) + ' ' + f(FL[1]) + ' L' + f(FR[0]) + ' ' + f(FR[1]) + ' L' + f(R[0]) + ' ' + f(R[1]) + '"/>';
      var klip = '<clipPath id="acsKlipKristal"><path d="M' + [A, L, B, R].map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join(' L') + ' Z"/></clipPath>';
      var partikel = PARTIKEL.map(function (p, i) { return '<circle class="acs-partikel acs-partikel-' + i + '" cx="' + x + '" cy="' + y + '" r="' + p[2] + '"/>'; }).join('');
      var l1 = '<circle class="acs-halo acs-halo-besar" cx="' + x + '" cy="' + y + '" r="200" fill="url(#acsHalo)"/>' +
        '<g class="acs-cincin" style="transform-origin:' + x + 'px ' + (y + 10) + 'px"><ellipse cx="' + x + '" cy="' + (y + 10) + '" rx="150" ry="150"/><ellipse cx="' + x + '" cy="' + (y + 10) + '" rx="104" ry="104"/></g>' +
        '<g class="acs-bintang"><circle cx="40" cy="80" r="1.8"/><circle cx="92" cy="40" r="1.4"/><circle cx="360" cy="70" r="1.8"/><circle cx="392" cy="130" r="1.2"/><circle cx="300" cy="26" r="1.3"/></g>';
      var l2 = '<ellipse class="acs-lantai-cahaya" cx="' + x + '" cy="' + (y + 100) + '" rx="220" ry="44" fill="url(#acsCahaya)"/>' +
        '<path class="acs-busur" d="M92 ' + (y + 52) + ' A120 40 0 0 0 328 ' + (y + 52) + '" pathLength="1"/>';
      var l3 = '<g class="acs-banner" style="transform-origin:210px 38px">' + kotakKartu(72, 12, 276, 52, 'acs-kartu-banner') +
          teks(210, 33, 'PILIHAN 3', 'acs-f17 acs-teks-2') + teks(210, 56, 'MEKANISME BERBEDA', 'acs-f20 acs-teks-aksen') + '</g>' +
        '<g class="acs-alas-kristal"><ellipse class="acs-alas-sisi" cx="' + x + '" cy="' + (y + 90) + '" rx="64" ry="15"/>' +
          '<path class="acs-alas-sisi" d="M' + (x - 64) + ' ' + (y + 72) + ' V' + (y + 90) + ' A64 15 0 0 0 ' + (x + 64) + ' ' + (y + 90) + ' V' + (y + 72) + ' Z"/>' +
          '<ellipse class="acs-alas-atas" cx="' + x + '" cy="' + (y + 72) + '" rx="64" ry="15"/>' +
          '<ellipse class="acs-alas-cahaya" cx="' + x + '" cy="' + (y + 72) + '" rx="46" ry="9" fill="url(#acsCahaya)"/></g>' +
        garis('M91 256 C 88 190, 120 146, ' + f(L[0] - 4) + ' ' + f(L[1]), 'acs-berkas') +
        garis('M329 256 C 332 190, 300 146, ' + f(R[0] + 4) + ' ' + f(R[1]), 'acs-penunjuk acs-penunjuk-target') +
        '<g class="acs-kristal" style="transform-origin:' + x + 'px ' + y + 'px">' + kristal + '</g>' +
        '<g clip-path="url(#acsKlipKristal)"><rect class="acs-sapu acs-sapu-kristal" x="' + (x - 80) + '" y="' + (y - 80) + '" width="40" height="150" fill="url(#acsSapu)"/></g>' +
        '<circle class="acs-kilat" cx="' + x + '" cy="' + y + '" r="60" fill="url(#acsCahaya)" style="transform-origin:' + x + 'px ' + y + 'px"/>' +
        partikel +
        '<g class="acs-kartu-bulan" style="transform-origin:91px 283px">' + kotakKartu(16, 258, 150, 52, 'acs-kartu-ringan') +
          '<g class="acs-isi-bulan" style="transform-origin:91px 292px">' + teks(91, 282, '≈ Rp6 JT', 'acs-f22 acs-teks-aksen') + teks(91, 302, '/ BULAN', 'acs-f17 acs-teks-2') + '</g></g>' +
        '<g class="acs-kartu-target">' + kotakKartu(254, 258, 150, 52, 'acs-kartu-tujuan') +
          teks(329, 279, 'TARGET ASET', 'acs-f17 acs-teks-2') + teks(329, 302, 'Rp5 MILIAR', 'acs-f20 acs-teks-1') + '</g>' +
        '<g class="acs-catatan-1">' + teks(210, 332, 'CONTOH MATERI', 'acs-f18 acs-teks-aksen') + '</g>' +
        '<g class="acs-catatan-2">' + teks(210, 352, 'BUKAN SIMULASI KPR', 'acs-f17 acs-teks-2') + teks(210, 372, 'DENGAN ASUMSI YANG SAMA', 'acs-f17 acs-teks-2') + '</g>';
      return '<defs>' + klip + '</defs>' + lapis(this.fokus, l1, l2, l3);
    },
    /* ketukan: (a) pendekatan berbeda: kristal aset tercipta, beban ringan ·
       (b) ≈ Rp6 jt/bulan → target aset Rp5 M · (c) contoh materi, bukan simulasi KPR */
    ketuk: [7400, 3200, 3400],
    animate: function (tl, st, K) {
      var tb = Math.max(1600, K.kata(0, 'pendekatan yang berbeda') - 250);
      var tc = Math.max(tb + 1300, K.kata(0, 'menciptakan aset baru') - 300);
      var tr = Math.max(tc + 2300, K.kata(0, 'lebih ringan') - 250);
      var t6 = Math.max(K.B[1] + 150, tr + 1800, K.kata(1, '6 juta') - 250);
      var tt = Math.max(t6 + 800, K.kata(1, 'target aset') - 350);
      var tm = Math.max(K.B[2] + 150, K.kata(2, 'contoh dari materi') - 250);
      var tmb = Math.max(tm + 700, K.kata(2, 'mekanisme yang berbeda') - 250);
      var tbs = Math.max(tmb + 800, K.kata(2, 'bukan simulasi') - 250);
      kamera(tl, st, [[0, [0, 24]], [2800, [0, 0], LEMBUT]]);
      pudar(tl, satu(st, '.acs-halo-besar'), 0, 1200);
      jejak(tl, satu(st, '.acs-cincin'), [[200, { opacity: 0, transform: 'scale(.7)' }], [1600, { opacity: 1, transform: 'none' }, LEMBUT]]);
      pudar(tl, satu(st, '.acs-lantai-cahaya'), 300, 1000);
      jejak(tl, satu(st, '.acs-alas-kristal'), [[200, { opacity: 0, transform: 'translateY(40px)' }], [1300, { opacity: 1, transform: 'none' }, PEGAS]]);
      jejak(tl, satu(st, '.acs-banner'), [[1000, { opacity: 0, transform: 'translateY(-26px)' }], [1600, { opacity: 1, transform: 'none' }, PEGAS]].concat(fDenyut(tb, 1.06), fDenyut(tmb, 1.08)));
      gambarGaris(tl, satu(st, '.acs-busur'), tb + 200, 1400);
      /* penciptaan: partikel dari segala arah membentuk kristal (bukan tumpukan) */
      PARTIKEL.forEach(function (p, i) {
        var t = tc + p[3];
        jejak(tl, satu(st, '.acs-partikel-' + i), [[t, { opacity: 0, transform: 'translate(' + p[0] + 'px,' + p[1] + 'px)' }], [t + 200, { opacity: 1 }], [t + 1100, { opacity: 1, transform: 'none' }, LEMBUT], [t + 1300, { opacity: 0 }]]);
      });
      jejak(tl, satu(st, '.acs-kristal'), [[tc + 1050, { opacity: 0, transform: 'scale(.15)' }], [tc + 1800, { opacity: 1, transform: 'none' }, PEGAS],
        [tr, { transform: 'none' }], [tr + 800, { transform: 'translateY(-9px)' }, LEMBUT], [tr + 1700, { transform: 'none' }, LEMBUT]]);
      jejak(tl, satu(st, '.acs-kilat'), [[tc + 1150, { opacity: 0, transform: 'scale(.5)' }], [tc + 1350, { opacity: 0.85 }], [tc + 2250, { opacity: 0, transform: 'scale(1.9)' }]]);
      /* beban bulanan lebih ringan: kristal melayang ringan (di atas); kartu bulanan
         muncul utuh saat angkanya disebut */
      jejak(tl, satu(st, '.acs-kartu-bulan'), [[t6, { opacity: 0, transform: 'translateY(28px)' }], [t6 + 900, { opacity: 1, transform: 'translateY(-4px)' }, LEMBUT], [t6 + 1400, { transform: 'none' }, LEMBUT]]);
      muncul(tl, satu(st, '.acs-isi-bulan'), t6 + 250, 500, 'scale(.8)');
      gambarGaris(tl, satu(st, '.acs-berkas'), tt, 800);
      muncul(tl, satu(st, '.acs-kartu-target'), tt + 300, 520, 'translateY(12px)');
      gambarGaris(tl, satu(st, '.acs-penunjuk-target'), tt + 400, 700);
      muncul(tl, satu(st, '.acs-catatan-1'), tm, 500);
      muncul(tl, satu(st, '.acs-catatan-2'), tbs, 560);
      tl.loop(satu(st, '.acs-sapu-kristal'), [{ opacity: 0, transform: 'translateX(0px)' }, { opacity: 0.9, transform: 'translateX(60px)', offset: 0.35 }, { opacity: 0, transform: 'translateX(130px)', offset: 0.6 }, { opacity: 0, transform: 'translateX(130px)' }], { duration: 4200, delay: tc + 2400 });
      tl.loop(satu(st, '.acs-alas-cahaya'), [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 3200, delay: tc + 1800 });
      tl.loop(satu(st, '.acs-bintang'), [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 5000 });
    }
  };

  /* ---------------- scene 6: aset → orang tua → anak ---------------- */
  var O6 = [96, 214, 0.62];
  var M6 = { akhir: [284, 292], pintu: iso(O6, 56, RM.d, 20), ortu: [242, 262] };
  S[6] = {
    inti: [0, 0, 420, 380],
    fokus: [240, 250],
    set: function () {
      var w = duniaLuar({ matahari: [338, 206], awan: [[-40, 128], [402, 132]] });
      var a = M6.akhir, h = M6.pintu, p = M6.ortu;
      var jejakCahaya = 'M' + f(h[0]) + ' ' + f(h[1]) + ' C ' + f(h[0] + 60) + ' ' + f(h[1] - 60) + ', ' + f(p[0] - 50) + ' ' + f(p[1] - 60) + ', ' + f(p[0]) + ' ' + f(p[1]) + ' S ' + f(a[0] - 10) + ' ' + f(a[1] - 20) + ', ' + f(a[0]) + ' ' + f(a[1]);
      var l3 = rumah(O6, 'acs-rumah-kecil') +
        '<g class="acs-tag-aset">' + kotakKartu(18, 30, 172, 62, 'acs-kartu-tujuan') + teks(104, 54, 'ASET BARU', 'acs-f17 acs-teks-2') + teks(104, 80, 'Rp5 MILIAR', 'acs-f22 acs-teks-aksen') + '</g>' +
        '<g class="acs-panah">' + teks(222, 72, '→', 'acs-f28 acs-teks-aksen') + '</g>' +
        '<g class="acs-judul-warisan">' + teks(330, 56, 'WARISAN', 'acs-f24 acs-teks-emas') + teks(330, 84, 'UNTUK ANAK', 'acs-f24 acs-teks-emas') + '</g>' +
        '<path class="acs-jejak-cahaya" d="' + jejakCahaya + '" pathLength="1"/>' +
        '<ellipse class="acs-orang-bayang" cx="258" cy="344" rx="86" ry="9" fill="url(#acsBayang)"/>' +
        orang('acs-ortu', 212, 336, 0.5, ORTU) + orang('acs-anak', 302, 344, 0.5, ANAK, -1) +
        '<g class="acs-miniatur" style="transform-origin:' + f(a[0]) + 'px ' + f(a[1]) + 'px">' + miniatur(a[0], a[1], 1) + '</g>';
      return lapis(this.fokus, w.l1, w.l2, l3);
    },
    siap: function (st) {
      gaya(st, { '.acs-ortu .k-lengan-d': { transform: 'rotate(-25deg)' }, '.acs-ortu .k-hasta-d': { transform: 'rotate(-20deg)' },
        '.acs-anak .k-lengan-d': { transform: 'rotate(-70deg)' }, '.acs-anak .k-hasta-d': { transform: 'rotate(-30deg)' }, '.acs-anak .k-kepala': { transform: 'rotate(-6deg)' } });
      kameraDiam(st, [-10, 6]);
    },
    /* ketukan: (a) aset baru; miniatur rumah ke tangan orang tua ·
       (b) diserahkan kepada anak: WARISAN UNTUK ANAK */
    ketuk: [5400, 4600],
    animate: function (tl, st, K) {
      var a = M6.akhir, h = M6.pintu, p = M6.ortu;
      var tm = Math.max(2700, K.kata(0, 'membangun aset baru') - 300);
      var tk = Math.max(K.B[1] + 600, K.kata(1, 'dipersiapkan') - 250);
      var tw = Math.max(tk + 1300, K.kata(1, 'warisan untuk anak') - 300);
      var d = function (q, dy) { return 'translate(' + f(q[0] - a[0]) + 'px,' + f(q[1] - a[1] + (dy || 0)) + 'px)'; };
      kamera(tl, st, [[0, [0, 0]], [tw, [0, 0]], [tw + 2200, [-10, 6], LEMBUT]]);
      jejak(tl, satu(st, '.acs-jendela-nyala'), [[0, { opacity: 0.2 }], [900, { opacity: 1 }]]);
      muncul(tl, satu(st, '.acs-tag-aset'), 500, 560);
      /* orang tua melangkah dari rumah ke tengah */
      jejak(tl, satu(st, '.acs-ortu'), [[700, { transform: 'translate(-72px,0px)' }], [2500, { transform: 'none' }, 'linear']]);
      jejak(tl, satu(st, '.acs-anak .k-kepala'), [[2400, { transform: 'rotate(0deg)' }], [3000, { transform: 'rotate(-6deg)' }]]);
      /* miniatur: rumah → tangan orang tua → tangan anak */
      jejak(tl, satu(st, '.acs-miniatur'), [[tm, { opacity: 0, transform: d(h) + ' scale(.3)' }], [tm + 300, { opacity: 1 }], [tm + 800, { transform: d([(h[0] + p[0]) / 2, Math.min(h[1], p[1]) - 60]) + ' scale(.85)' }, LEMBUT],
        [tm + 1400, { transform: d(p) + ' scale(1)' }, LEMBUT], [tk, { transform: d(p) + ' scale(1)' }], [tk + 600, { transform: d([(p[0] + a[0]) / 2, Math.min(p[1], a[1]) - 34]) + ' scale(1)' }, LEMBUT],
        [tk + 1200, { transform: 'none' }, LEMBUT], [tw + 1400, { transform: 'none' }], [tw + 1800, { transform: 'translate(0px,-7px)' }], [tw + 2300, { transform: 'none' }, LEMBUT]]);
      jejak(tl, satu(st, '.acs-ortu .k-lengan-d'), [[tm + 600, { transform: 'rotate(0deg)' }], [tm + 1200, { transform: 'rotate(-62deg)' }], [tk + 900, { transform: 'rotate(-62deg)' }], [tk + 1500, { transform: 'rotate(-25deg)' }]]);
      jejak(tl, satu(st, '.acs-ortu .k-hasta-d'), [[tm + 600, { transform: 'rotate(0deg)' }], [tm + 1200, { transform: 'rotate(-30deg)' }], [tk + 900, { transform: 'rotate(-30deg)' }], [tk + 1500, { transform: 'rotate(-20deg)' }]]);
      jejak(tl, satu(st, '.acs-ortu .k-atas'), [[tk, { transform: 'rotate(0deg)' }], [tk + 500, { transform: 'rotate(7deg)' }], [tk + 1400, { transform: 'rotate(7deg)' }], [tk + 1900, { transform: 'rotate(0deg)' }]]);
      jejak(tl, satu(st, '.acs-anak .k-lengan-d'), [[tk + 500, { transform: 'rotate(0deg)' }], [tk + 1100, { transform: 'rotate(-70deg)' }, PEGAS]]);
      jejak(tl, satu(st, '.acs-anak .k-hasta-d'), [[tk + 500, { transform: 'rotate(0deg)' }], [tk + 1100, { transform: 'rotate(-30deg)' }]]);
      /* jejak cahaya rumah → orang tua → anak, lalu judul */
      gambarGaris(tl, satu(st, '.acs-jejak-cahaya'), tw, 1400);
      muncul(tl, satu(st, '.acs-panah'), tw + 200, 500, 'translateX(-10px)');
      muncul(tl, satu(st, '.acs-judul-warisan'), tw + 400, 620, 'translateY(10px)');
      jalan(tl, satu(st, '.acs-ortu'), 700, 1800, 6);
      tl.loop(satu(st, '.acs-miniatur-cahaya'), [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 2600, delay: tw + 2400 });
      tl.loop(satu(st, '.acs-matahari-cahaya'), [{ opacity: 1 }, { opacity: 0.75 }, { opacity: 1 }], { duration: 5200 });
    }
  };

  /* ---------------- kerangka scene ---------------- */
  function kerangka(opsi, step, i, sc) {
    var n = i + 1;
    var I = sc.inti, bagian = sc.set().split(PEMISAH_LAPIS);
    var rig = function (l, isi) {
      return '<div class="acs-kam acs-' + l + '" data-lapis="' + l + '">' +
        '<svg class="acs-rig" data-inti="' + I.join(' ') + '" data-fokus="' + sc.fokus.join(' ') + '" viewBox="' + [I[0], I[1], I[2] - I[0], I[3] - I[1]].join(' ') + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + isi + '</svg></div>';
    };
    return '<div class="acs" data-acs="' + n + '" data-ketuk="0">' + (opsi.header || '') +
      '<div class="acs-body">' +
        '<figure class="acs-stage acs-s' + n + '" role="img" aria-label="' + esc('Ilustrasi langkah ' + n + ': ' + step.title + '. ' + (ARIA[i] || '')) + '">' +
          '<div class="acs-langit"></div>' +
          rig('l1', defs() + bagian[0]) + rig('l2', bagian[1] || '') + rig('l3', bagian[2] || '') +
          '<div class="acs-vignette"></div>' +
        '</figure>' +
        '<div class="acs-text">' +
          '<span class="acs-kicker">INTI PESAN • ' + n + '/6</span>' +
          '<h3 class="acs-title">' + esc(step.title) + '</h3>' +
          '<p class="acs-focus">' + esc(step.focus) + '</p>' +
          '<p class="acs-isi">' + esc(step.body) + '</p>' +
        '</div>' +
      '</div></div>';
  }
  function animasiTeks(tl, stage) {
    muncul(tl, satu(stage, '.acs-title'), 120, 520);
    muncul(tl, satu(stage, '.acs-focus'), 300, 520);
    muncul(tl, satu(stage, '.acs-isi'), 480, 560);
  }

  /* viewBox mengikuti rasio panggung: area inti utuh, sisanya dunia */
  function paskan(svg) {
    var w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) { var r = svg.getBoundingClientRect(); w = r.width; h = r.height; }
    if (!w || !h) return;
    var I = svg.getAttribute('data-inti').split(' ').map(Number);
    var a = w / h, w0 = I[2] - I[0], h0 = I[3] - I[1], vb;
    if (a >= w0 / h0) { var ww = h0 * a; vb = [(I[0] + I[2]) / 2 - ww / 2, I[1], ww, h0]; }
    else { var hh = w0 / a, ekstra = hh - h0; vb = [I[0], I[1] - ekstra * 0.6, w0, hh]; }
    svg.setAttribute('viewBox', vb.map(f).join(' '));
    /* skala viewBox → px, titik fokus kamera dalam px kotak pembungkus */
    var kam = svg.parentNode, s = w / vb[2], fo = (svg.getAttribute('data-fokus') || '').split(' ').map(Number);
    if (!kam || !kam.getAttribute || !kam.getAttribute('data-lapis')) return;
    if (fo.length === 2) kam.style.transformOrigin = f((fo[0] - vb[0]) * s) + 'px ' + f((fo[1] - vb[1]) * s) + 'px';
    if (kam.__s === s) return;
    kam.__s = s;
    if (kam.__diam) kam.style.transform = tfKamera(FAKTOR[kam.getAttribute('data-lapis')], kam.__diam, s);
    if (kam.__animKamera && kam.__animKamera.effect) kam.__animKamera.effect.setKeyframes(kunciJejak(kfKamera(kam)).kf);
  }
  var pengamat = null;
  function amati(stage) {
    var rigs = semua(stage, '.acs-rig');
    rigs.forEach(paskan);
    if (!window.ResizeObserver) return;
    if (!pengamat) pengamat = new ResizeObserver(function (e) { e.forEach(function (x) { paskan(x.target); }); });
    pengamat.disconnect();
    rigs.forEach(function (r) { pengamat.observe(r); });
  }

  /* Ketukan scene: B = saat mulai tiap ketukan, D = lamanya, akhir = ujung
     timeline. Lama ketukan = maks(kebutuhan gerak, perkiraan narasi). */
  function ketukan(n) {
    var sc = S[n] ? n : 1, naskah = NARASI[sc - 1] || [], vis = S[sc].ketuk || [], B = [], D = [], t = 0;
    naskah.forEach(function (seg, j) {
      var d = Math.max(vis[j] || 0, lamaSegmen(seg), lamaRekaman(sc, j + 1));
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
      N.daftar('.acs', 'data-acs', NARASI, N.rekamanDari ? N.rekamanDari(window.PSGAssetAudio, NARASI) : null);
      N.pasang();
      o = Object.assign({}, o, { header: N.tombol(o.header || '') });
    }
    return langkah.map(function (step, i) {
      var n = i + 1, sc = S[n] || S[1];
      return {
        id: 'asset-' + n,
        fit: true,
        siapDi: 'akhir',
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, step, i, sc);
          var st = stage.querySelector('.acs-stage');
          pasangPoros(st);
          if (sc.siap) sc.siap(st);
          amati(stage);
          if (N) N.tandai();
        },
        animate: function (tl, stage) {
          var st = stage.querySelector('.acs-stage'), node = stage.querySelector('.acs'), K = ketukan(n);
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

  window.PSGAssetStory = { adegan: adegan };
})();
