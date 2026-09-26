/* ============================================================
   Sales Idea — Keranjang Kehidupan (interactive story)
   ------------------------------------------------------------
   Metafora: pencari nafkah = penyangga utama kehidupan keluarga.
   Ia berdiri tepat di tengah, di bawah landasan, dan menopang
   keranjang batu di atas kepala dengan kedua tangan (seperti
   mengangkat barbel): keranjang → kedua tangan → pencari nafkah →
   keluarga. Istri di kirinya, anak-anak di kanannya. Beban terlihat
   lewat perubahan tubuh (bahu, siku, lutut, condong, gemetar),
   bukan lewat keranjang yang membesar. Saat penopang tidak mampu,
   genggaman kanan lepas dan keranjang miring ke arah anak-anak;
   dua pilar di kiri dan kanan lalu mengambil alih beban.

   Sepuluh scene mengikuti 10 langkah basketSteps di sales-idea.js
   dengan urutan yang sama. Judul dan isi diambil dari data itu;
   fokus, panduan agen, label batu (Makan … Investasi), dan label
   pilar (PROTEKSI, UANG) memakai teks yang sudah tampil di versi
   sebelumnya. Tidak ada angka atau klaim baru.

   Teknik:
   - Satu rig SVG (koordinat tetap). viewBox dihitung dari ukuran
     panggung sehingga area inti selalu utuh dan mengisi layar;
     ResizeObserver memperbaruinya tanpa menyentuh animasi.
   - Penopang memakai tokoh tampak depan (PSGKarakter hadap:'depan').
     Pose memakai kinematika maju: tangan dihitung dari bahu/siku/
     lutut/condong/skala, dan landasan mengikuti tangan.
   - Tiap langkah punya keadaan akhir (STATUS). Render = keadaan
     akhir sebagai gaya statis; animasi bergerak dari keadaan akhir
     langkah sebelumnya. Satu elemen, satu jejak animasi.

   API: PSGKeranjangStory.adegan({ langkah, header, padaLangkah })
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var LEMBUT = 'cubic-bezier(.45,.05,.3,1)';
  var BERAT = 'cubic-bezier(.2,.7,.3,1)';
  var PEGAS = 'cubic-bezier(.34,1.4,.5,1)';

  /* teks yang sudah tampil pada versi sebelumnya (renderBasket) */
  var FOKUS = [
    'KEHIDUPAN ADALAH SEBUAH KERANJANG BATU',
    'SETIAP BATU MEMILIKI UKURAN YANG BERBEDA',
    'KITA MENOPANG BEBAN KEHIDUPAN',
    'HIDUP PENUH KETIDAKPASTIAN',
    'BATU-BATU ITU ADALAH BIAYA KEHIDUPAN',
    'KITA BISA LELAH MENOPANGNYA',
    'JIKA PENOPANG TIDAK MAMPU, KELUARGA TERDAMPAK',
    'BAGAIMANA AGAR KERANJANG TETAP BERADA DI TEMPATNYA?',
    'BANGUN DUA PILAR',
    'PROTEKSI + UANG'
  ];
  function panduan(i) {
    return i === 9 ? 'Arahkan perhatian prospek pada dua pilar. Jelaskan makna proteksi dan uang dengan bahasa Anda sendiri.'
      : i === 6 ? 'Biarkan visual risiko dan keluarga menjadi pemantik. Tidak perlu membaca narasi kata demi kata.'
      : 'Tampilkan visual, berhenti sejenak, lalu kembangkan percakapan berdasarkan respons prospek.';
  }
  var LABEL_BATU = ['Makan', 'Pendidikan', 'Kesehatan', 'Cicilan', 'Orang tua', 'Pensiun', 'Tabungan', 'Investasi'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function f(v) { return Math.round(v * 100) / 100; }
  function satu(st, sel) { return st.querySelector(sel); }
  function semua(st, sel) { return Array.prototype.slice.call(st.querySelectorAll(sel)); }
  function klon(o) { return JSON.parse(JSON.stringify(o)); }
  function ubah(dasar, patch) {
    var h = klon(dasar);
    (function gabung(t, p) {
      Object.keys(p).forEach(function (k) {
        if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) && t[k] && typeof t[k] === 'object') gabung(t[k], p[k]);
        else t[k] = klon(p[k]);
      });
    })(h, patch || {});
    return h;
  }

  /* jejak(tl, el, [[ms, {props}, easingMenujuFrameIni], ...]) — lihat Retirement */
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

  /* ---------------- geometri rig ---------------- */
  var SK = 0.86, PX = 240, PY = 406;            // penopang: skala, x tengah, tanah depan
  var SKK = 0.62, KY = 394;                      // keluarga: skala, tanah belakang
  /* istri di kiri menghadap kanan; anak-anak di kanan menghadap kiri */
  var ANGGOTA = [['istri', 176], ['anak1', 302], ['anak2', 334]];
  var INTI = { x0: 56, x1: 424, y0: 26, y1: 420 };  // area yang selalu utuh di layar
  var CAM_O = [240, 223];
  var PILAR_X = [96, 384];
  var BATU = [ // cx, cy, rx, ry, warna, indeks label
    [172, 148, 23, 16, 'abu', 0], [240, 124, 22, 14, 'hijau', 1], [262, 148, 24, 16, 'merah', 2], [305, 149, 20, 14, 'kuning', 3],
    [190, 172, 26, 17, 'biru', 4], [216, 147, 23, 15, 'ungu', 5], [240, 175, 24, 16, 'toska', 6], [288, 171, 25, 17, 'oranye', 7],
    [160, 176, 10, 7, 'abu', -1], [322, 178, 9, 6, 'kuning', -1], [196, 126, 9, 6, 'toska', -1], [282, 125, 10, 7, 'merah', -1],
    [218, 116, 8, 5, 'hijau', -1], [262, 115, 8, 5, 'ungu', -1]
  ];
  var BATU_KECIL = 12, BATU_BESAR = 7, BATU_UJUNG = 11;
  var KOLOM = [111, 197, 283, 369], BARIS = [44, 74];

  function putar(p, c, deg) {
    var r = deg * Math.PI / 180, s = Math.sin(r), co = Math.cos(r), x = p[0] - c[0], y = p[1] - c[1];
    return [c[0] + x * co - y * s, c[1] + x * s + y * co];
  }
  /* posisi tangan (koordinat rig) dari pose penopang tampak depan;
     'b' = tangan kiri layar, 'd' = tangan kanan layar */
  function tangan(p, sisi) {
    var d = sisi === 'd', x = d ? 76 : 44;
    var h = putar([x, 120], [x, 90], d ? p.sD : p.sB);
    h = putar(h, [x, 64], d ? p.lD : p.lB);
    h = putar(h, [60, 126], p.condong);
    h[1] += p.bahu + 95 * (1 - Math.cos(p.lutut * Math.PI / 180));
    var s = p.skala == null ? 1 : p.skala;
    var x0 = PX + (h[0] - 60) * SK, y0 = PY - (226 - h[1]) * SK;
    return [PX + p.x + s * (x0 - PX), PY + p.gy + s * (y0 - PY)];
  }
  /* pose menopang: kedua lengan terangkat lebar, siku sedikit menekuk */
  var ISTIRAHAT = { x: 0, gy: 0, skala: 1, bahu: 0, condong: 0, lutut: 0, lD: -150, lB: 150, sD: -15, sB: 15, kepala: 0 };
  var T0D = tangan(ISTIRAHAT, 'd'), T0B = tangan(ISTIRAHAT, 'b');
  var POROS = [f(T0B[0]), f(T0B[1] - 5.6 * SK)];  // puncak tangan kiri = alas landasan
  var ALAS = POROS[1];
  var TENGAH = [f((T0B[0] + T0D[0]) / 2), ALAS];      // tengah kedua tangan (= PX)

  function transformMuatan(s) {
    var m = s.muatan, t;
    if (m.mode === 'tangan') {
      /* ikut titik tengah kedua tangan; miring berporos di tengah (bukan di tangan kiri) */
      var a = tangan(s.pencari, 'd'), b = tangan(s.pencari, 'b');
      var r = m.r * Math.PI / 180, dx = POROS[0] - TENGAH[0], dy = POROS[1] - TENGAH[1];
      t = [(a[0] + b[0] - T0D[0] - T0B[0]) / 2 - (dx - (dx * Math.cos(r) - dy * Math.sin(r))),
        (a[1] + b[1] - T0D[1] - T0B[1]) / 2 - (dy - (dx * Math.sin(r) + dy * Math.cos(r)))];
    } else if (m.mode === 'kiri') {
      /* genggaman kanan lepas: landasan bertumpu pada tangan kiri saja */
      var bb = tangan(s.pencari, 'b');
      t = [bb[0] - T0B[0], bb[1] - T0B[1]];
    } else t = [m.tx, m.ty];
    return 'translate(' + f(t[0]) + 'px,' + f(t[1]) + 'px) rotate(' + f(m.r) + 'deg)';
  }
  function kamera(c) {
    var s = c[2];
    return 'translate(' + f(-s * (c[0] - CAM_O[0])) + 'px,' + f(-s * (c[1] - CAM_O[1])) + 'px) scale(' + f(s) + ')';
  }

  /* ---------------- keadaan akhir tiap langkah ---------------- */
  var DASAR = {
    cam: [240, 223, 1], redup: 0, beku: 0, hangat: 0, cahaya: 0, tanah: 0,
    pencari: { o: 0, x: 0, gy: 0, skala: 1, bahu: 0, condong: 0, lutut: 0, lD: 0, lB: 0, sD: 0, sB: 0, kepala: 0 },
    muatan: { mode: 'bebas', tx: 0, ty: -34, r: 0 },
    batu: { geser: 0, ujung: 0 }, label: 0, tag: 0,
    kel: { o: 0, istri: [0, 0, 0], anak1: [0, 0, 0], anak2: [0, 0, 0] },
    bayang: [0, 0.82, 0.1],
    pilar: { kiri: 196, kanan: 196, hantu: 0, label: 0 },
    tanya: 0
  };
  var ST = [];
  ST[1] = klon(DASAR);
  ST[2] = ubah(ST[1], { tag: 1 });
  ST[3] = ubah(ST[2], { tag: 0, pencari: Object.assign({ o: 1 }, ISTIRAHAT), muatan: { mode: 'tangan', r: 0 }, kel: { o: 1 }, bayang: [0, 1, 0.16] });
  /* tanah tidak rata: istri di punuk, anak pertama di cekungan, anak kedua di punuk kecil */
  var KEL_TANAH = { istri: [0, -10, 0], anak1: [0, 4, 0], anak2: [0, -7, 0] };
  ST[4] = ubah(ST[3], { tanah: 1, pencari: { gy: 2 }, kel: KEL_TANAH });
  /* lelah: bahu turun, siku makin menekuk (lengan atas turun, lengan bawah tetap tegak) */
  ST[5] = ubah(ST[4], { label: 1, pencari: { bahu: 1.8, lB: 144, sB: 26, lD: -144, sD: -26, lutut: 5 } });
  ST[6] = ubah(ST[5], { pencari: { bahu: 3.2, lB: 134, sB: 42, lD: -134, sD: -42, lutut: 12 },
    kel: { istri: [0, -10, -8], anak1: [0, 4, -12], anak2: [0, -7, -12] } });
  /* risiko: genggaman kanan lepas, landasan bertumpu di tangan kiri dan miring ke arah anak-anak */
  ST[7] = ubah(ST[6], { label: 0, redup: 0.38,
    pencari: { bahu: 4, condong: 5, lutut: 16, lB: 132, sB: 44, lD: -118, sD: -12, kepala: 10 }, muatan: { mode: 'kiri', r: 7 },
    batu: { geser: 8, ujung: 1 }, bayang: [78, 1.35, 0.42],
    kel: { istri: [5, -10, -14], anak1: [7, 4, -16], anak2: [9, -7, -16] } });
  ST[8] = ubah(ST[7], { beku: 1, tanya: 1, pilar: { hantu: 1 } });
  ST[9] = ubah(ST[8], { beku: 0, tanya: 0, redup: 0, hangat: 0.5, pilar: { kiri: 0, kanan: 0, hantu: 0 },
    pencari: Object.assign({ o: 1 }, ISTIRAHAT, { gy: 2 }), muatan: { mode: 'tangan', r: 0 }, batu: { geser: 0, ujung: 0 },
    bayang: [0, 1, 0.16], kel: KEL_TANAH });
  ST[10] = ubah(ST[9], { hangat: 1, cahaya: 1, pilar: { label: 1 } });

  /* gaya CSS untuk satu keadaan, dikelompokkan per subsistem */
  var GRUP = {
    kamera: function (s) { return { '.kbs-cam': { transform: kamera(s.cam) } }; },
    cahaya: function (s) {
      return { '.kbs-redup': { opacity: s.redup }, '.kbs-beku': { opacity: s.beku }, '.kbs-hangat': { opacity: s.hangat }, '.kbs-cahaya-pilar': { opacity: s.cahaya } };
    },
    tanah: function (s) {
      return { '.kbs-tanah-rata': { opacity: 1 - s.tanah }, '.kbs-tanah-naik': { opacity: s.tanah, transform: 'translateY(' + f((1 - s.tanah) * 12) + 'px)' } };
    },
    penopang: function (s) {
      var p = s.pencari, drop = 95 * (1 - Math.cos(p.lutut * Math.PI / 180)), g = {};
      g['.kbs-pencari'] = { opacity: p.o, transform: 'translate(' + f(p.x) + 'px,' + f(p.gy) + 'px) scale(' + f(p.skala) + ')' };
      g['.kbs-pencari .k-tubuh'] = { transform: 'translateY(' + f(drop) + 'px)' };
      g['.kbs-pencari .k-atas'] = { transform: 'translateY(' + f(p.bahu) + 'px) rotate(' + f(p.condong) + 'deg)' };
      /* tampak depan: lutut menekuk ke luar (kuda-kuda), telapak tetap di bawah pinggul */
      ['d', 'b'].forEach(function (x) {
        var a = x === 'b' ? p.lutut : -p.lutut;
        g['.kbs-pencari .k-kaki-' + x] = { transform: 'rotate(' + f(a) + 'deg)' };
        g['.kbs-pencari .k-betis-' + x] = { transform: 'rotate(' + f(-2 * a) + 'deg)' };
      });
      g['.kbs-pencari .k-lengan-d'] = { transform: 'rotate(' + f(p.lD) + 'deg)' };
      g['.kbs-pencari .k-hasta-d'] = { transform: 'rotate(' + f(p.sD) + 'deg)' };
      g['.kbs-pencari .k-lengan-b'] = { transform: 'rotate(' + f(p.lB) + 'deg)' };
      g['.kbs-pencari .k-hasta-b'] = { transform: 'rotate(' + f(p.sB) + 'deg)' };
      g['.kbs-pencari .k-kepala'] = { transform: 'rotate(' + f(p.kepala) + 'deg)' };
      g['.kbs-muatan'] = { transform: transformMuatan(s) };
      return g;
    },
    batu: function (s) {
      return { '.kbs-batu': { transform: 'translateX(' + f(s.batu.geser) + 'px)' },
        '.kbs-batu-ujung': { transform: 'translate(' + f(44 * s.batu.ujung) + 'px,' + f(-16 * s.batu.ujung) + 'px) rotate(' + f(18 * s.batu.ujung) + 'deg)' } };
    },
    label: function (s) { return { '.kbs-label-semua': { opacity: s.label } }; },
    tag: function (s) { return { '.kbs-tag-semua': { opacity: s.tag } }; },
    keluarga: function (s) {
      var g = {};
      ANGGOTA.forEach(function (a) {
        var v = s.kel[a[0]];
        g['.kbs-' + a[0]] = { opacity: s.kel.o, transform: 'translate(' + f(v[0]) + 'px,' + f(v[1]) + 'px)' };
        g['.kbs-' + a[0] + ' .k-kepala'] = { transform: 'rotate(' + f(v[2]) + 'deg)' };
      });
      return g;
    },
    bayang: function (s) { return { '.kbs-bayang-muatan': { opacity: s.bayang[2], transform: 'translateX(' + f(s.bayang[0]) + 'px) scale(' + f(s.bayang[1]) + ')' } }; },
    pilar: function (s) {
      return { '.kbs-pilar-kiri': { transform: 'translateY(' + f(s.pilar.kiri) + 'px)' }, '.kbs-pilar-kanan': { transform: 'translateY(' + f(s.pilar.kanan) + 'px)' },
        '.kbs-hantu': { opacity: s.pilar.hantu }, '.kbs-pilar-label-semua': { opacity: s.pilar.label } };
    },
    tanya: function (s) { return { '.kbs-tanya': { opacity: s.tanya, transform: s.tanya ? 'none' : 'scale(.6)' } }; }
  };
  function terapkan(st, s) {
    Object.keys(GRUP).forEach(function (k) {
      var g = GRUP[k](s);
      Object.keys(g).forEach(function (sel) {
        var el = satu(st, sel);
        if (!el) return;
        Object.keys(g[sel]).forEach(function (p) { el.style[p] = String(g[sel][p]); });
      });
    });
  }
  /* urut(tl, st, 'penopang', [[ms, keadaan, easing], ...]) — satu jejak per elemen grup */
  function urut(tl, st, grup, frames) {
    var per = frames.map(function (fr) { return GRUP[grup](fr[1]); });
    Object.keys(per[0]).forEach(function (sel) {
      var jalur = frames.map(function (fr, i) { return [fr[0], per[i][sel], fr[2]]; });
      var beda = jalur.some(function (j) { return JSON.stringify(j[1]) !== JSON.stringify(jalur[0][1]); });
      if (beda) jejak(tl, satu(st, sel), jalur);
    });
  }

  /* ---------------- markup rig ---------------- */
  function tokoh(o) { return window.PSGKarakter ? window.PSGKarakter.svg(o) : ''; }
  function batuSvg(b, i) {
    var cls = 'kbs-b kbs-b-' + b[4] + (i === BATU_UJUNG ? ' kbs-batu-ujung' : '');
    return '<g class="' + cls + '" data-i="' + i + '" style="transform-origin:' + b[0] + 'px ' + b[1] + 'px">' +
      '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="' + b[2] + '" ry="' + b[3] + '"/>' +
      '<ellipse class="kbs-kilap" cx="' + f(b[0] - b[2] * 0.3) + '" cy="' + f(b[1] - b[3] * 0.35) + '" rx="' + f(Math.max(2.5, b[2] * 0.26)) + '" ry="' + f(Math.max(1.6, b[3] * 0.18)) + '"/></g>';
  }
  function pilarSvg(cx, sisi) {
    return '<g class="kbs-pilar kbs-pilar-' + sisi + '">' +
      '<rect class="kbs-pilar-alas" x="' + (cx - 22) + '" y="392" width="44" height="14" rx="3"/>' +
      '<rect class="kbs-pilar-batang" x="' + (cx - 13) + '" y="226" width="26" height="168"/>' +
      '<rect class="kbs-pilar-sisi" x="' + (cx + 5) + '" y="226" width="8" height="168"/>' +
      '<path class="kbs-pilar-alur" d="M' + (cx - 6) + ' 232 V388 M' + (cx + 1) + ' 232 V388"/>' +
      '<rect class="kbs-pilar-kepala" x="' + (cx - 18) + '" y="' + (ALAS) + '" width="36" height="13" rx="2"/>' +
      '</g>';
  }
  function labelPilar(cx, teks, sisi) {
    var panah = sisi === 'kiri' ? '◀ ' : '', panahK = sisi === 'kanan' ? ' ▶' : '';
    var w = 26 + (panah + teks + panahK).length * 9.2;
    /* tetap di dalam area inti agar tidak terpotong di layar sempit */
    var x = sisi === 'kiri' ? Math.max(cx, INTI.x0 + w / 2 + 6) : Math.min(cx, INTI.x1 - w / 2 - 6);
    return '<g class="kbs-pilar-label kbs-pilar-label-' + sisi + '" style="transform-origin:' + x + 'px 174px">' +
      '<rect x="' + f(x - w / 2) + '" y="160" width="' + f(w) + '" height="28" rx="14"/>' +
      '<text x="' + x + '" y="179">' + esc(panah + teks + panahK) + '</text></g>';
  }
  function rig(n) {
    var pusatBatu = BATU.map(batuSvg).join('');
    var labels = LABEL_BATU.map(function (t, i) {
      var b = BATU.filter(function (x) { return x[5] === i; })[0], x = KOLOM[i % 4], y = BARIS[Math.floor(i / 4)];
      return '<g class="kbs-label kbs-label-' + i + '" style="transform-origin:' + x + 'px ' + y + 'px">' +
        '<path class="kbs-garis-label" d="M' + x + ' ' + (y + 11) + ' L' + b[0] + ' ' + (b[1] - b[3] + 3) + '" pathLength="1"/>' +
        '<rect class="kbs-pil" data-x="' + x + '" x="' + (x - 40) + '" y="' + (y - 11) + '" width="80" height="22" rx="11"/>' +
        '<text x="' + x + '" y="' + (y + 4.5) + '">' + esc(t) + '</text></g>';
    }).join('');
    var bk = BATU[BATU_KECIL], bb = BATU[BATU_BESAR];
    var tags = '<g class="kbs-tag-semua">' +
      '<ellipse class="kbs-cincin kbs-cincin-kecil" cx="' + bk[0] + '" cy="' + bk[1] + '" rx="' + (bk[2] + 7) + '" ry="' + (bk[3] + 6) + '" style="transform-origin:' + bk[0] + 'px ' + bk[1] + 'px"/>' +
      '<ellipse class="kbs-cincin kbs-cincin-besar" cx="' + bb[0] + '" cy="' + bb[1] + '" rx="' + (bb[2] + 8) + '" ry="' + (bb[3] + 7) + '" style="transform-origin:' + bb[0] + 'px ' + bb[1] + 'px"/>' +
      '<g class="kbs-tag kbs-tag-kecil" style="transform-origin:128px 76px"><path class="kbs-garis-label" d="M160 82 L' + (bk[0] - 8) + ' ' + (bk[1] - 4) + '"/><rect x="84" y="64" width="88" height="24" rx="12"/><text x="128" y="80.5">batu kecil</text></g>' +
      '<g class="kbs-tag kbs-tag-besar" style="transform-origin:356px 76px"><path class="kbs-garis-label" d="M330 84 L' + (bb[0] + 8) + ' ' + (bb[1] - 14) + '"/><rect x="312" y="64" width="88" height="24" rx="12"/><text x="356" y="80.5">batu besar</text></g>' +
      '</g>';
    var anggota = ANGGOTA.map(function (a) {
      var nama = a[0], x = a[1];
      var o = nama === 'istri' ? { jenis: 'wanita' } : nama === 'anak1' ? { usia: 'anak', jenis: 'wanita', gaya: '--k-wanita:#d9894a;--k-rok:#d9894a' } : { usia: 'anak', pakaian: 'muda', gaya: '--k-muda:#4f8fcf;--k-celana:#3b4a63' };
      /* anak-anak di kanan dicerminkan agar menghadap penopang */
      var cermin = nama !== 'istri';
      var pos = cermin ? 'translate(' + f(x + 61 * SKK) + ' ' + f(KY - 226 * SKK) + ') scale(' + (-SKK) + ' ' + SKK + ')'
        : 'translate(' + f(x - 61 * SKK) + ' ' + f(KY - 226 * SKK) + ') scale(' + SKK + ')';
      return '<g class="kbs-anggota kbs-' + nama + '"><g transform="' + pos + '">' + tokoh(o) + '</g></g>';
    }).join('');
    return '' +
      '<svg class="kbs-rig" viewBox="' + INTI.x0 + ' ' + INTI.y0 + ' ' + (INTI.x1 - INTI.x0) + ' ' + (INTI.y1 - INTI.y0) + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="kbsBayang"><stop offset="0" class="kbs-st-bayang"/><stop offset="1" class="kbs-st-bayang" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="kbsHangat" cx=".5" cy=".62" r=".6"><stop offset="0" class="kbs-st-hangat"/><stop offset="1" class="kbs-st-hangat" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="kbsSinar"><stop offset="0" class="kbs-st-sinar"/><stop offset="1" class="kbs-st-sinar" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="kbsAnyam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="kbs-st-anyam-a"/><stop offset="1" class="kbs-st-anyam-b"/></linearGradient>' +
        '<linearGradient id="kbsPilar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="kbs-st-pilar-a"/><stop offset=".55" class="kbs-st-pilar-b"/><stop offset="1" class="kbs-st-pilar-c"/></linearGradient>' +
        '<clipPath id="kbsIsi"><path d="M146 -400 H334 V104 L320 190 H160 L146 104 Z"/></clipPath>' +
        '<clipPath id="kbsDiatasTanah"><rect x="-800" y="-800" width="2000" height="1206"/></clipPath>' +
      '</defs>' +
      '<g class="kbs-cam">' +
        /* latar jauh */
        '<g class="kbs-jauh">' +
          '<circle class="kbs-matahari-sinar" cx="398" cy="78" r="70" fill="url(#kbsSinar)"/><circle class="kbs-matahari" cx="398" cy="78" r="17"/>' +
          '<path class="kbs-bukit-1" d="M-800 330 C -560 300, -380 318, -220 332 C -60 346, 60 300, 200 306 C 330 312, 420 336, 560 322 C 700 308, 900 318, 1200 330 V420 H-800 Z"/>' +
          '<path class="kbs-bukit-2" d="M-800 362 C -560 350, -360 360, -160 368 C 0 374, 120 350, 260 354 C 400 358, 520 372, 700 366 C 900 360, 1050 364, 1200 368 V420 H-800 Z"/>' +
          '<g class="kbs-pohon"><path d="M-8 392 V352"/><circle cx="-8" cy="342" r="22"/><circle cx="12" cy="356" r="14"/><path d="M22 392 V368"/></g>' +
          '<g class="kbs-rumah"><path class="kbs-rumah-dinding" d="M436 392 V350 L468 326 L500 350 V392 Z"/><path class="kbs-rumah-atap" d="M428 352 L468 318 L508 352"/><rect class="kbs-rumah-jendela" x="448" y="360" width="13" height="12" rx="1.5"/><rect class="kbs-rumah-jendela" x="475" y="360" width="13" height="12" rx="1.5"/></g>' +
        '</g>' +
        /* tanah */
        '<g class="kbs-tanah">' +
          '<path class="kbs-tanah-rata" d="M-800 394 H1200 V800 H-800 Z"/>' +
          '<path class="kbs-tanah-naik" d="M-800 396 L50 396 C 80 396, 104 400, 128 399 C 146 398, 158 384, 176 384 C 192 384, 202 393, 216 397 C 234 401, 258 400, 276 399 C 288 398, 294 398, 302 398 C 314 398, 320 387, 334 387 C 350 387, 362 393, 386 393 C 410 393, 430 397, 470 397 L1200 397 V800 H-800 Z"/>' +
          '<path class="kbs-tanah-depan" d="M-800 404 C -200 402, 100 408, 240 408 C 400 408, 700 402, 1200 404 V800 H-800 Z"/>' +
        '</g>' +
        '<ellipse class="kbs-hangat" cx="240" cy="330" rx="260" ry="190" fill="url(#kbsHangat)"/>' +
        '<ellipse class="kbs-bayang-muatan" cx="240" cy="404" rx="118" ry="9" fill="url(#kbsBayang)" style="transform-origin:240px 404px"/>' +
        /* pilar (muncul dari tanah) */
        '<g class="kbs-hantu"><rect x="' + (PILAR_X[0] - 18) + '" y="' + ALAS + '" width="36" height="' + f(406 - ALAS) + '" rx="3"/><rect x="' + (PILAR_X[1] - 18) + '" y="' + ALAS + '" width="36" height="' + f(406 - ALAS) + '" rx="3"/></g>' +
        '<g class="kbs-cahaya-pilar"><g class="kbs-denyut"><ellipse cx="' + PILAR_X[0] + '" cy="300" rx="46" ry="120" fill="url(#kbsSinar)"/><ellipse cx="' + PILAR_X[1] + '" cy="300" rx="46" ry="120" fill="url(#kbsSinar)"/></g></g>' +
        '<g clip-path="url(#kbsDiatasTanah)">' + pilarSvg(PILAR_X[0], 'kiri') + pilarSvg(PILAR_X[1], 'kanan') + '</g>' +
        '<g class="kbs-debu-semua">' + PILAR_X.map(function (x) { return '<ellipse class="kbs-debu" cx="' + x + '" cy="404" rx="34" ry="7" style="transform-origin:' + x + 'px 404px"/>'; }).join('') + '</g>' +
        /* keluarga di belakang */
        '<g class="kbs-keluarga">' + anggota + '</g>' +
        /* penopang + landasan + keranjang */
        '<g class="kbs-getar">' +
          '<g class="kbs-pencari" style="transform-origin:' + PX + 'px ' + PY + 'px"><g transform="translate(' + f(PX - 60 * SK) + ' ' + f(PY - 226 * SK) + ') scale(' + SK + ')">' +
            tokoh({ hadap: 'depan', usia: 'dewasa', pakaian: 'kerja' }) + '</g></g>' +
          '<g class="kbs-muatan" style="transform-origin:' + POROS[0] + 'px ' + POROS[1] + 'px">' +
            '<path class="kbs-balok-atas" d="M86 ' + f(ALAS - 24) + ' H404 L400 ' + f(ALAS - 18) + ' H80 Z"/>' +
            '<rect class="kbs-balok" x="80" y="' + f(ALAS - 18) + '" width="320" height="18" rx="3"/>' +
            '<path class="kbs-balok-garis" d="M84 ' + f(ALAS - 17) + ' H396"/>' +
            '<path class="kbs-keranjang" d="M140 101 Q240 86 340 101 L321 ' + f(ALAS - 24) + ' Q240 ' + f(ALAS - 16) + ' 159 ' + f(ALAS - 24) + ' Z"/>' +
            '<path class="kbs-keranjang-dalam" d="M146 104 Q240 90 334 104 L320 186 Q240 196 160 186 Z"/>' +
            '<g clip-path="url(#kbsIsi)"><g class="kbs-batu">' + pusatBatu + '</g></g>' +
            '<path class="kbs-anyaman" d="M151 124 Q240 136 329 124 M154 144 Q240 157 326 144 M157 164 Q240 178 323 164 M190 106 L194 188 M240 100 V190 M290 106 L286 188"/>' +
            '<path class="kbs-bibir" d="M140 101 Q240 86 340 101"/>' +
            '<g class="kbs-label-semua">' + labels + '</g>' +
            tags +
          '</g>' +
        '</g>' +
        '<g class="kbs-pilar-label-semua">' + labelPilar(PILAR_X[0], 'PROTEKSI', 'kiri') + labelPilar(PILAR_X[1], 'UANG', 'kanan') + '</g>' +
        '<rect class="kbs-redup" x="-800" y="-600" width="2000" height="1600"/>' +
        '<rect class="kbs-beku" x="-800" y="-600" width="2000" height="1600"/>' +
        '<g class="kbs-tanya" style="transform-origin:274px 60px"><circle cx="274" cy="58" r="23"/><text class="kbs-tanya-tanda" x="274" y="68.5">?</text><text class="kbs-tanya-sub" x="274" y="99">Bagaimana menjaganya?</text></g>' +
      '</g>' +
      '</svg>';
  }

  /* viewBox mengikuti rasio panggung: area inti utuh, sisanya dunia */
  function paskan(stage) {
    var svg = stage.querySelector('.kbs-rig');
    if (!svg) return;
    var w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) return;
    var a = w / h, w0 = INTI.x1 - INTI.x0, h0 = INTI.y1 - INTI.y0, vb;
    if (a >= w0 / h0) { var ww = h0 * a; vb = [(INTI.x0 + INTI.x1) / 2 - ww / 2, INTI.y0, ww, h0]; }
    else { var hh = w0 / a, ekstra = hh - h0; vb = [INTI.x0, INTI.y0 - ekstra * 0.62, w0, hh]; }
    svg.setAttribute('viewBox', vb.map(f).join(' '));
    /* latar tepi (rumah, pohon) hanya tampil bila muat utuh */
    svg.classList.toggle('kbs-tanpa-rumah', vb[0] + vb[2] < 516);
    svg.classList.toggle('kbs-tanpa-pohon', vb[0] > -34);
  }
  function ukurLabel(stage) {
    semua(stage, '.kbs-label').forEach(function (g) {
      var t = g.querySelector('text'), r = g.querySelector('.kbs-pil');
      var w = 0;
      try { w = t.getComputedTextLength(); } catch (e) { w = 0; }
      if (!w) w = t.textContent.length * 7.4;
      var x = +r.getAttribute('data-x'), lebar = Math.max(56, w + 18);
      r.setAttribute('x', f(x - lebar / 2)); r.setAttribute('width', f(lebar));
    });
  }
  var pengamat = null;
  function amati(stage) {
    var st = stage.querySelector('.kbs-stage');
    if (!st) return;
    paskan(st);
    if (!window.ResizeObserver) return;
    if (!pengamat) pengamat = new ResizeObserver(function (e) { e.forEach(function (x) { paskan(x.target); }); });
    pengamat.disconnect();
    pengamat.observe(st);
  }

  /* ---------------- kerangka scene ---------------- */
  function kerangka(opsi, step, i) {
    var n = i + 1;
    return '<div class="kbs" data-kbs="' + n + '">' + (opsi.header || '') +
      '<div class="kbs-body">' +
        '<figure class="kbs-stage kbs-s' + n + '" role="img" aria-label="' + esc('Ilustrasi langkah ' + n + ': ' + step.title) + '">' +
          '<div class="kbs-langit"></div>' + rig(n) + '<div class="kbs-vignette"></div>' +
        '</figure>' +
        '<div class="kbs-text">' +
          '<span class="kbs-kicker">FOKUS PRESENTASI • ' + n + '/10</span>' +
          '<h3 class="kbs-title">' + esc(step.title) + '</h3>' +
          '<p class="kbs-focus">' + esc(FOKUS[i] || '') + '</p>' +
          '<p class="kbs-isi">' + esc(step.body) + '</p>' +
          '<div class="kbs-cue"><span aria-hidden="true">💡</span><div><b>Panduan untuk agen</b><p>' + esc(panduan(i)) + '</p></div></div>' +
        '</div>' +
      '</div></div>';
  }
  function animasiTeks(tl, st) {
    muncul(tl, satu(st, '.kbs-title'), 120, 520);
    muncul(tl, satu(st, '.kbs-focus'), 300, 520);
    muncul(tl, satu(st, '.kbs-isi'), 480, 560);
  }
  function jalan(tl, st, sel, mulai, durasi, langkah) {
    if (window.PSGKarakter) window.PSGKarakter.jalan(tl, satu(st, sel + ' .psg-k'), { mulai: mulai, durasi: durasi, langkah: langkah });
  }
  function cam(x, y, s) { return function (b) { return ubah(b, { cam: [x, y, s] }); }; }

  /* ---------------- koreografi 10 langkah ---------------- */
  var ANIM = [];

  /* 1 · keranjang batu: landasan turun, batu-batu mengisi keranjang */
  ANIM[1] = function (tl, st) {
    var S = ST[1];
    urut(tl, st, 'kamera', [[0, cam(240, 150, 1.12)(S)], [1700, S, LEMBUT]]);
    urut(tl, st, 'penopang', [[0, ubah(S, { muatan: { ty: -200 } })], [1500, S, LEMBUT]]);
    urut(tl, st, 'bayang', [[0, ubah(S, { bayang: [0, 0.4, 0] })], [1500, S]]);
    var urutan = BATU.map(function (b, i) { return i; }).sort(function (a, b) { return BATU[b][1] - BATU[a][1]; });
    urutan.forEach(function (idx, k) {
      var t = 1250 + k * 165, el = satu(st, '.kbs-b[data-i="' + idx + '"]');
      jejak(tl, el, [[t, { opacity: 0, transform: 'translateY(-150px)' }], [t + 60, { opacity: 1 }],
        [t + 430, { transform: 'translateY(2px)' }, 'cubic-bezier(.55,0,.85,.55)'], [t + 580, { transform: 'none' }, 'ease-out']]);
    });
  };

  /* 2 · batu kecil & besar */
  ANIM[2] = function (tl, st) {
    var S = ST[2];
    urut(tl, st, 'kamera', [[0, ST[1]], [1300, cam(240, 150, 1.3)(S), LEMBUT], [3300, cam(240, 150, 1.3)(S)], [4500, S, LEMBUT]]);
    jejak(tl, satu(st, '.kbs-cincin-kecil'), [[1300, { opacity: 0, transform: 'scale(1.8)' }], [1800, { opacity: 1, transform: 'none' }]]);
    muncul(tl, satu(st, '.kbs-tag-kecil'), 1500, 480, 'translateY(8px) scale(.92)');
    jejak(tl, satu(st, '.kbs-cincin-besar'), [[2200, { opacity: 0, transform: 'scale(1.6)' }], [2700, { opacity: 1, transform: 'none' }]]);
    muncul(tl, satu(st, '.kbs-tag-besar'), 2400, 480, 'translateY(8px) scale(.92)');
  };

  /* 3 · penopang berjalan mendekat ke tengah, mengangkat kedua tangan, landasan turun
         ke tangannya; istri datang dari kiri, anak-anak dari kanan */
  ANIM[3] = function (tl, st) {
    var S = ST[3], turun = { lD: 0, lB: 0, sD: 0, sB: 0 };
    var awal = ubah(S, { pencari: Object.assign({ o: 0, skala: 0.74, gy: -18 }, turun), muatan: { mode: 'bebas', tx: 0, ty: -34 } });
    urut(tl, st, 'tag', [[0, ST[2]], [450, S]]);
    urut(tl, st, 'penopang', [
      [0, awal], [250, ubah(awal, { pencari: { o: 1 } })],
      [2200, ubah(awal, { pencari: { o: 1, skala: 1, gy: 0 } }), 'linear'],
      [3000, ubah(S, { muatan: { mode: 'bebas', tx: 0, ty: -34 } }), LEMBUT],
      [3900, S, 'cubic-bezier(.5,0,.6,1)'],
      [4250, ubah(S, { pencari: { lutut: 10, bahu: 2.5 } }), 'ease-out'],
      [4800, S, 'ease-in-out']
    ]);
    urut(tl, st, 'bayang', [[0, ST[2]], [3900, ST[2]], [4300, S]]);
    ANGGOTA.forEach(function (a, i) {
      var t0 = 2500 + i * 150, sel = '.kbs-' + a[0], dari = a[0] === 'istri' ? -170 : 170;
      jejak(tl, satu(st, sel), [[t0, { opacity: 0, transform: 'translate(' + dari + 'px,0px)' }], [t0 + 200, { opacity: 1 }], [t0 + 2000, { transform: 'translate(0px,0px)' }, 'linear']]);
      if (a[0] !== 'istri') jejak(tl, satu(st, sel + ' .k-kepala'), [[4800, { transform: 'rotate(0deg)' }], [5200, { transform: 'rotate(-10deg)' }], [5700, { transform: 'rotate(-10deg)' }], [6100, { transform: 'rotate(0deg)' }]]);
    });
    jalan(tl, st, '.kbs-pencari', 250, 1950, 6);
    ANGGOTA.forEach(function (a, i) { jalan(tl, st, '.kbs-' + a[0], 2500 + i * 150, 2000, a[0] === 'istri' ? 6 : 8); });
  };

  /* 4 · tanah tidak rata: keluarga naik-turun, landasan goyah lalu seimbang */
  ANIM[4] = function (tl, st) {
    var A = ST[3], S = ST[4];
    urut(tl, st, 'kamera', [[0, A], [1200, cam(240, 330, 1.12)(A), LEMBUT], [3000, cam(240, 330, 1.12)(A)], [4300, S, LEMBUT]]);
    urut(tl, st, 'tanah', [[800, A], [2400, S, LEMBUT]]);
    urut(tl, st, 'keluarga', [[800, A], [2400, S, LEMBUT]]);
    urut(tl, st, 'penopang', [
      [800, A], [1500, ubah(S, { muatan: { r: -3 }, pencari: { condong: 2 } })],
      [2200, ubah(S, { muatan: { r: 2.5 }, pencari: { condong: -1.5 } }), 'ease-in-out'],
      [2900, ubah(S, { muatan: { r: -1.2 }, pencari: { condong: 0.8 } }), 'ease-in-out'],
      [3600, S, 'ease-in-out']
    ]);
  };

  /* 5 · batu = biaya hidup: label muncul satu per satu, bahu mulai turun */
  ANIM[5] = function (tl, st) {
    var A = ST[4], S = ST[5];
    urut(tl, st, 'kamera', [[0, A], [1500, cam(240, 118, 1.2)(A), LEMBUT], [3900, cam(240, 118, 1.2)(A)], [5000, S, LEMBUT]]);
    semua(st, '.kbs-label').forEach(function (g, i) {
      var t = 500 + i * 420;
      jejak(tl, g, [[t, { opacity: 0, transform: 'translateY(8px) scale(.9)' }], [t + 400, { opacity: 1, transform: 'none' }, PEGAS]]);
      jejak(tl, g.querySelector('.kbs-garis-label'), [[t + 150, { strokeDashoffset: 1 }], [t + 500, { strokeDashoffset: 0 }]]);
    });
    urut(tl, st, 'penopang', [[400, A], [4000, S, 'ease-in-out']]);
  };

  /* 6 · lelah: bahu turun, siku menekuk, tubuh membungkuk, langkah pelan, tangan hampir lepas */
  ANIM[6] = function (tl, st) {
    var A = ST[5], S = ST[6], lelah = S;
    urut(tl, st, 'kamera', [[0, A], [2600, cam(240, 232, 1.1)(A), LEMBUT], [4900, cam(240, 232, 1.1)(A)], [5800, S, LEMBUT]]);
    urut(tl, st, 'penopang', [
      [0, A],
      [1300, ubah(A, { pencari: { bahu: 2.4, condong: 0.8, lB: 139, sB: 34, lD: -139, sD: -34, lutut: 8 } }), 'ease-in-out'],
      [2600, lelah, 'ease-in-out'],
      [3000, lelah],
      /* genggaman kanan hampir lepas, lalu kembali */
      [3500, ubah(lelah, { pencari: { lD: -126, sD: -30 }, muatan: { r: 4.5 } }), 'ease-out'],
      [4300, ubah(lelah, { pencari: { lD: -136, sD: -40 } }), 'cubic-bezier(.3,0,.2,1)'],
      [4800, S]
    ]);
    urut(tl, st, 'keluarga', [[3100, A], [3700, S]]);
    tl.loop(satu(st, '.kbs-getar'), [{ transform: 'translate(0px,0px)' }, { transform: 'translate(.35px,-.25px)' }, { transform: 'translate(-.3px,.2px)' }, { transform: 'translate(0px,0px)' }], { duration: 420, easing: 'linear' });
  };

  /* 7 · risiko: fokus ke tangan, genggaman kanan lepas, landasan miring ke arah anak-anak */
  ANIM[7] = function (tl, st) {
    var A = ST[6], S = ST[7];
    urut(tl, st, 'label', [[0, A], [700, S]]);
    urut(tl, st, 'kamera', [[0, A], [1200, cam(244, 214, 1.6)(A), LEMBUT], [2700, cam(244, 214, 1.6)(A)],
      [3500, cam(272, 196, 1.3)(A), LEMBUT], [4300, cam(304, 300, 1.35)(A), LEMBUT], [5200, cam(304, 300, 1.35)(A)], [6400, S, LEMBUT]]);
    urut(tl, st, 'cahaya', [[400, A], [3000, S, 'ease-in']]);
    urut(tl, st, 'penopang', [
      [0, A],
      [1300, ubah(A, { pencari: { lD: -142, sD: -34 }, muatan: { r: 2.8 } }), 'ease-in'],
      [1900, ubah(A, { pencari: { lD: -128, sD: -20, lB: 133, sB: 43, condong: 3, lutut: 13 }, muatan: { mode: 'kiri', r: 3.5 } }), 'ease-in'],
      [2950, ubah(S, {}), 'cubic-bezier(.45,0,.35,1)'],
      [3300, S]
    ]);
    urut(tl, st, 'batu', [[2100, A], [3300, S, 'ease-in']]);
    urut(tl, st, 'bayang', [[2600, A], [3900, S, LEMBUT]]);
    urut(tl, st, 'keluarga', [[2600, A], [3900, S, LEMBUT]]);
  };

  /* 8 · pertanyaan: waktu berhenti; tempat penopang tambahan tersirat */
  ANIM[8] = function (tl, st) {
    var A = ST[7], S = ST[8];
    urut(tl, st, 'cahaya', [[0, A], [900, S]]);
    urut(tl, st, 'tanya', [[600, A], [1200, S, PEGAS]]);
    urut(tl, st, 'pilar', [[1800, A], [2800, S]]);
    urut(tl, st, 'kamera', [[0, A], [2200, cam(240, 200, 1.05)(A), LEMBUT], [4200, S, LEMBUT]]);
  };

  /* 9 · dua pilar naik dari tanah, mengambil beban, keranjang kembali datar */
  ANIM[9] = function (tl, st) {
    var A = ST[8], S = ST[9];
    var kontak = kontakKanan(A);
    urut(tl, st, 'tanya', [[0, A], [500, ubah(A, { tanya: 0 })]]);
    urut(tl, st, 'cahaya', [[0, A], [600, ubah(A, { beku: 0 })], [1900, ubah(A, { beku: 0 })], [3400, S, 'ease-in-out']]);
    /* pilar kanan (sisi yang turun) menyentuh landasan lebih dulu */
    jejak(tl, satu(st, '.kbs-pilar-kanan'), [[300, { transform: 'translateY(196px)' }], [1900, { transform: 'translateY(' + f(kontak) + 'px)' }, BERAT], [3100, { transform: 'translateY(0px)' }, LEMBUT]]);
    jejak(tl, satu(st, '.kbs-pilar-kiri'), [[700, { transform: 'translateY(196px)' }], [3100, { transform: 'translateY(0px)' }, BERAT]]);
    jejak(tl, satu(st, '.kbs-hantu'), [[300, { opacity: 1 }], [2300, { opacity: 0 }]]);
    semua(st, '.kbs-debu').forEach(function (el, i) {
      var t = i ? 1700 : 2200;
      jejak(tl, el, [[t - 300, { opacity: 0, transform: 'scale(.6)' }], [t, { opacity: 0.7, transform: 'none' }], [t + 900, { opacity: 0, transform: 'scale(1.3)' }]]);
    });
    var lega = ubah(A, { muatan: { mode: 'bebas', tx: 0, ty: 0, r: 0 } });
    urut(tl, st, 'penopang', [
      [0, A], [1900, A], [3100, lega, LEMBUT],
      [4200, ubah(lega, { pencari: { lutut: 8, condong: 3, kepala: 4, bahu: 2 } }), 'ease-in-out'],
      [5100, S, 'ease-in-out']
    ]);
    urut(tl, st, 'batu', [[1900, A], [3100, S, LEMBUT]]);
    urut(tl, st, 'bayang', [[1900, A], [3100, S, LEMBUT]]);
    urut(tl, st, 'keluarga', [[3000, A], [4300, S, LEMBUT]]);
    urut(tl, st, 'kamera', [[0, A], [1300, cam(240, 300, 1.08)(A), LEMBUT], [3100, cam(240, 236, 1.03)(A), LEMBUT], [4700, S, LEMBUT]]);
  };
  function kontakKanan(s) {
    /* tinggi alas landasan di atas pilar kanan saat miring */
    var m = transformMuatan(s).match(/translate\(([-\d.]+)px,([-\d.]+)px\) rotate\(([-\d.]+)deg\)/);
    var t = [+m[1], +m[2]], r = +m[3];
    var p = putar([PILAR_X[1] + 18, ALAS], POROS, r);
    return p[1] + t[1] - ALAS;
  }

  /* 10 · proteksi + uang: label pilar, cahaya hangat, keluarga tertopang */
  ANIM[10] = function (tl, st) {
    var A = ST[9], S = ST[10];
    urut(tl, st, 'kamera', [[0, cam(240, 300, 1.12)(A)], [4000, S, LEMBUT]]);
    urut(tl, st, 'cahaya', [[800, A], [3600, S, 'ease-in-out']]);
    muncul(tl, satu(st, '.kbs-pilar-label-kiri'), 900, 700, 'translateY(10px)');
    muncul(tl, satu(st, '.kbs-pilar-label-kanan'), 1300, 700, 'translateY(10px)');
    tl.loop(satu(st, '.kbs-cahaya-pilar .kbs-denyut'), [{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }], { duration: 3600, easing: 'ease-in-out' });
  };

  function adegan(opsi) {
    var o = opsi || {};
    var langkah = Array.isArray(o.langkah) ? o.langkah : [];
    return langkah.map(function (step, i) {
      var n = i + 1;
      return {
        id: 'basket-' + n,
        fit: true,
        siapDi: 'akhir',
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, step, i);
          var st = stage.querySelector('.kbs-stage');
          terapkan(st, ST[n] || ST[1]);
          ukurLabel(st);
          amati(stage);
        },
        animate: function (tl, stage) {
          var st = stage.querySelector('.kbs-stage');
          animasiTeks(tl, stage);
          if (ANIM[n]) ANIM[n](tl, st);
        }
      };
    });
  }

  window.PSGKeranjangStory = { adegan: adegan };
})();
