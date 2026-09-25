/* ============================================================
   Sales Idea — Retirement Planning (pilot interactive story)
   ------------------------------------------------------------
   Metafora: SATU KEHIDUPAN, DUA FASE — masa produktif dipakai
   untuk menyiapkan masa pensiun.

   Enam scene mengikuti 6 langkah yang sudah ada di sales-idea.js
   (retirementSteps) dengan urutan yang sama. Judul, fokus, dan isi
   pesan diambil dari data itu; label di dalam visual memakai teks
   visual lama (mis. "30 TAHUN BEKERJA", "TARGET DANA PERLU
   DIHITUNG") atau pecahan string fokus. Tidak ada angka baru.

     1 risks     → pembuka: tokoh masuk, garis hidup terbentuk,
                   tiga risiko, fokus hidup terlalu lama
     2 timeline  → dua fase dalam satu layar: 25 → 55 → 85
     3 ratio     → masa produktif: EARN 100% → SAVE 50% • SPEND 50%
     4 target    → transisi ke pensiun: penghasilan kerja berhenti,
                   kebutuhan tetap ada, target perlu dihitung
     5 compound  → waktu berjalan: Rp1 JT/BLN • 30 TAHUN • 6%/TAHUN
     6 complete  → penutup: START EARLY + COMPOUNDING + PROTECTION

   Tiap scene: ENTER → SETUP → ACTION → CONSEQUENCE → FINAL.
   Keadaan akhir = keadaan CSS statis, sehingga tampilan "siap",
   gerak-dikurangi, dan akhir animasi selalu sama. Semua gerak
   memakai timeline pemutar (Web Animations API); satu elemen
   hanya punya satu jejak animasi per properti.

   API: PSGRetirementStory.adegan({ langkah, header, padaLangkah })
        → daftar scene untuk PSGStoryPlayer.
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var PEGAS = 'cubic-bezier(.34,1.45,.5,1)';
  var CUE = '💡 Tampilkan visual ini, lalu kembangkan pertanyaan sesuai kondisi prospek.';
  var TAHAP = ['USIA MUDA', 'MASA PRODUKTIF', 'PERSIAPAN', 'PENSIUN', 'MASA PENSIUN'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pecah(teks, pemisah) {
    return String(teks || '').split(pemisah).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function tokoh(opsi) { return window.PSGKarakter ? window.PSGKarakter.svg(opsi) : ''; }

  /* ---------------- helper animasi ----------------
     jejak(tl, el, [[ms, {props}, easingMenujuFrameIni], ...])
     Satu animasi per elemen; properti yang belum disebut di frame
     awal diisi dari kemunculan pertamanya. Frame terakhir harus
     sama dengan keadaan CSS. */
  function jejak(tl, el, frames) {
    if (!tl || !el || !frames || !frames.length) return;
    var total = frames[frames.length - 1][0];
    var kunci = {};
    frames.forEach(function (f) { Object.keys(f[1]).forEach(function (k) { if (!(k in kunci)) kunci[k] = f[1][k]; }); });
    var cur = Object.assign({}, kunci), kf = [];
    frames.forEach(function (f, i) {
      cur = Object.assign({}, cur, f[1]);
      var k = Object.assign({}, cur, { offset: total ? f[0] / total : 1 });
      if (i > 0) kf[kf.length - 1].easing = f[2] || EASE;
      kf.push(k);
    });
    if (kf[0].offset > 0) kf.unshift(Object.assign({}, kf[0], { offset: 0, easing: 'linear' }));
    if (kf.length === 1) kf.push(Object.assign({}, kf[0], { offset: 1 }));
    tl.add(el, kf, { duration: Math.max(1, total), easing: 'linear', fill: 'backwards' });
  }
  function semua(stage, sel) { return Array.prototype.slice.call(stage.querySelectorAll(sel)); }
  function satu(stage, sel) { return stage.querySelector(sel); }
  /* muncul: naik halus + fokus */
  function muncul(tl, el, t, d, dari) {
    jejak(tl, el, [[t, { opacity: 0, transform: dari || 'translateY(10px)' }], [t + (d || 520), { opacity: 1, transform: 'none' }]]);
  }
  function letup(tl, el, t, d) {
    jejak(tl, el, [[t, { opacity: 0, transform: 'scale(.4)' }], [t + (d || 460), { opacity: 1, transform: 'none' }, PEGAS]]);
  }
  function gambarGaris(tl, el, t, d, ease) {
    jejak(tl, el, [[t, { strokeDashoffset: 1 }], [t + (d || 800), { strokeDashoffset: 0 }, ease || 'cubic-bezier(.5,0,.3,1)']]);
  }
  function kamera(tl, stage, dari, d) {
    jejak(tl, satu(stage, '.rps-cam'), [[0, { transform: dari || 'scale(1.07)' }], [d || 1500, { transform: 'none' }, 'cubic-bezier(.25,.7,.25,1)']]);
  }
  function alirAmbient(tl, stage) {
    semua(stage, '.rps-alir-titik').forEach(function (el) {
      tl.loop(el, [{ strokeDashoffset: 0 }, { strokeDashoffset: -0.12 }], { duration: 2600, easing: 'linear' });
    });
  }
  function jalan(tl, stage, sel, mulai, durasi, langkah) {
    if (window.PSGKarakter) window.PSGKarakter.jalan(tl, satu(stage, sel), { mulai: mulai, durasi: durasi, langkah: langkah });
  }
  function ganti(tl, stage, sel, bagian, urutan, d) {
    if (window.PSGKarakter) window.PSGKarakter.ganti(tl, satu(stage, sel), bagian, urutan, d);
  }

  /* ---------------- dunia (lapisan latar) ---------------- */
  var KOTA = (function () {
    var b = [[0, 70, 38], [40, 96, 30], [74, 58, 34], [112, 120, 26], [142, 84, 40], [186, 104, 30], [220, 64, 36],
      [260, 138, 28], [292, 92, 38], [334, 72, 30], [368, 116, 34], [406, 80, 28], [438, 126, 32], [474, 70, 40],
      [518, 98, 30], [552, 60, 34], [590, 132, 28], [622, 88, 38], [664, 110, 30], [698, 66, 36], [738, 94, 30], [772, 76, 28]];
    var jauh = '', dekat = '', jendela = '';
    b.forEach(function (x, i) {
      var tinggiJauh = Math.round(x[1] * 0.72 + 26);
      jauh += '<rect x="' + (x[0] + 14) + '" y="' + (160 - tinggiJauh) + '" width="' + x[2] + '" height="' + tinggiJauh + '" rx="2"/>';
      dekat += '<rect x="' + x[0] + '" y="' + (160 - x[1]) + '" width="' + (x[2] - 4) + '" height="' + x[1] + '" rx="2.5"/>';
      for (var r = 0; r < 3; r++) {
        if ((i + r) % 3 === 0) continue;
        jendela += '<rect x="' + (x[0] + 6 + (r % 2) * 10) + '" y="' + (160 - x[1] + 10 + r * 16) + '" width="4" height="6" rx="1"/>';
      }
    });
    return '<svg class="rps-jauh rps-kota" viewBox="0 0 800 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<g class="rps-kota-jauh">' + jauh + '</g><g class="rps-kota-dekat">' + dekat + '</g><g class="rps-jendela">' + jendela + '</g></svg>';
  })();
  var ALAM = '<svg class="rps-jauh rps-alam" viewBox="0 0 800 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
    '<path class="rps-bukit-jauh" d="M0 112 C90 70 170 78 250 98 C330 118 410 64 520 72 C610 78 690 104 800 86 V160 H0 Z"/>' +
    '<path class="rps-bukit-dekat" d="M0 134 C110 112 220 116 330 128 C450 142 560 108 680 112 C740 114 780 122 800 126 V160 H0 Z"/>' +
    '<g class="rps-pohon"><path d="M596 118 V84"/><circle cx="596" cy="76" r="17"/><circle cx="610" cy="88" r="12"/><path d="M148 124 V98"/><circle cx="148" cy="90" r="13"/><path d="M700 114 V92"/><circle cx="700" cy="84" r="11"/></g>' +
    '</svg>';

  /* dunia: { kota, alam, senja, matahari } */
  function dunia(o) {
    o = o || {};
    return '' +
      '<div class="rps-langit"></div>' +
      '<div class="rps-langit rps-langit-senja' + (o.senja ? ' rps-on' : '') + '"></div>' +
      '<div class="rps-matahari' + (o.matahari ? ' rps-on' : '') + '"></div>' +
      (o.kota ? KOTA.replace('rps-jauh rps-kota"', 'rps-jauh rps-kota' + (o.kota === 'redup' ? ' rps-redup' : '') + '"') : '') +
      (o.alam ? ALAM.replace('rps-jauh rps-alam"', 'rps-jauh rps-alam' + (o.alam === 'redup' ? ' rps-redup' : '') + '"') : '') +
      '<div class="rps-tanah"></div>';
  }

  /* Lapisan garis penghubung. Koordinat ditulis 0..100 (persen
     panggung) di data-d, lalu dipetakan ke piksel nyata: viewBox =
     ukuran kanvas, jadi tebal garis, pola titik, dan pathLength tetap
     presisi di rasio apa pun. ResizeObserver memetakan ulang saat
     ukuran berubah tanpa menyentuh animasi yang sedang berjalan. */
  function kanvas(isi, kelas) {
    return '<svg class="rps-kanvas' + (kelas ? ' ' + kelas : '') + '" viewBox="0 0 100 100" aria-hidden="true">' + isi + '</svg>';
  }
  function garis(d, kelas) { return '<path class="' + kelas + '" data-d="' + d + '" d="' + d + '" pathLength="1"/>'; }
  function alir(d, kelas) { return garis(d, 'rps-alir-garis ' + (kelas || '')) + garis(d, 'rps-alir-titik ' + (kelas || '')); }
  function petakan(d, w, h) {
    var i = 0, cmd = '';
    return d.replace(/[A-Za-z]|-?\d*\.?\d+/g, function (tok) {
      if (/[A-Za-z]/.test(tok)) { cmd = tok.toUpperCase(); i = 0; return tok; }
      var n = parseFloat(tok), v;
      if (cmd === 'H') v = n * w / 100;
      else if (cmd === 'V') v = n * h / 100;
      else { v = (i % 2 === 0 ? n * w : n * h) / 100; i++; }
      return (Math.round(v * 10) / 10).toString();
    });
  }
  function tataKanvas(stage) {
    Array.prototype.forEach.call(stage.querySelectorAll('.rps-kanvas'), function (svg) {
      var w = svg.clientWidth, h = svg.clientHeight;
      if (!w || !h) return;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      Array.prototype.forEach.call(svg.querySelectorAll('path[data-d]'), function (p) {
        p.setAttribute('d', petakan(p.getAttribute('data-d'), w, h));
      });
    });
  }
  var pengamat = null;
  function amati(stage) {
    var st = stage.querySelector('.rps-stage');
    if (!st) return;
    tataKanvas(st);
    if (!window.ResizeObserver) return;
    if (!pengamat) pengamat = new ResizeObserver(function (e) { e.forEach(function (x) { tataKanvas(x.target); }); });
    pengamat.disconnect();
    pengamat.observe(st);
  }

  /* garis hidup lima tahap (scene 1 dan 6) */
  function garisHidup() {
    var titik = TAHAP.map(function (t, i) {
      return '<div class="rps-tahap rps-tahap-' + (i + 1) + '"><i class="rps-tahap-titik"></i><span class="rps-tahap-label">' + esc(t) + '</span></div>';
    }).join('');
    return '<div class="rps-jalur"><i class="rps-jalur-dasar"></i><i class="rps-jalur-produktif"></i><i class="rps-jalur-pensiun"></i><i class="rps-jalur-cahaya"></i></div>' + titik;
  }

  /* ---------------- kerangka scene ---------------- */
  function kerangka(opsi, step, n, set, duniaOpsi, kelasStage) {
    return '<div class="rps" data-rps="' + n + '">' + (opsi.header || '') +
      '<div class="rps-body">' +
        '<figure class="rps-stage rps-s' + n + (kelasStage ? ' ' + kelasStage : '') + '" role="img" aria-label="' + esc('Ilustrasi langkah ' + n + ': ' + step.title) + '">' +
          '<div class="rps-cam">' + dunia(duniaOpsi) + '<div class="rps-set">' + set + '</div></div>' +
          '<div class="rps-vignette"></div>' +
        '</figure>' +
        '<div class="rps-text">' +
          '<span class="rps-kicker">INTI PESAN • ' + n + '/6</span>' +
          '<h3 class="rps-title">' + esc(step.title) + '</h3>' +
          '<p class="rps-focus">' + esc(step.focus) + '</p>' +
          '<p class="rps-isi">' + esc(step.body) + '</p>' +
          '<p class="rps-cue">' + CUE + '</p>' +
        '</div>' +
      '</div></div>';
  }
  function animasiTeks(tl, stage) {
    muncul(tl, satu(stage, '.rps-title'), 120, 520);
    muncul(tl, satu(stage, '.rps-focus'), 300, 520);
    muncul(tl, satu(stage, '.rps-isi'), 480, 560);
  }

  /* ================= SCENE 1 — pembuka & tiga risiko ================= */
  var S1 = {
    set: function (step) {
      var r = pecah(step.focus, '•');
      return garisHidup() +
        '<div class="rps-aktor rps-aktor-1">' + tokoh({ usia: 'muda', pakaian: 'muda' }) + '</div>' +
        kanvas(garis('M50 31 C 52 50, 80 44, 83.5 70', 'rps-sorot')) +
        r.map(function (t, i) {
          return '<div class="rps-risiko rps-risiko-' + (i + 1) + (i === 1 ? ' rps-fokus' : ' rps-redup') + '"><i class="rps-cincin"><i class="rps-denyut"></i></i><span>' + esc(t) + '</span></div>';
        }).join('') +
        '<div class="rps-catatan rps-catatan-1">Fokus: hidup terlalu lama</div>';
    },
    dunia: { kota: 'redup', alam: 'redup' },
    kelas: 'rps-panorama',
    animate: function (tl, st) {
      kamera(tl, st, 'scale(1.08) translateY(1.5%)', 1600);
      var ak = satu(st, '.rps-aktor-1');
      jejak(tl, ak, [[0, { opacity: 0, transform: 'translateX(-24cqw)' }], [260, { opacity: 1 }], [1500, { transform: 'none' }, 'cubic-bezier(.3,.1,.3,1)']]);
      jalan(tl, st, '.rps-aktor-1', 0, 1500, 4);
      jejak(tl, satu(st, '.rps-jalur'), [[700, { transform: 'scaleX(0)' }], [2300, { transform: 'none' }, 'cubic-bezier(.55,0,.25,1)']]);
      semua(st, '.rps-tahap').forEach(function (el, i) {
        var t = 820 + i * 330;
        letup(tl, el.querySelector('.rps-tahap-titik'), t, 420);
        muncul(tl, el.querySelector('.rps-tahap-label'), t + 90, 420, 'translateY(7px)');
      });
      semua(st, '.rps-risiko').forEach(function (el, i) {
        var t = 2500 + i * 170;
        var f = [[t, { opacity: 0, transform: 'translateY(-18px) scale(.94)' }], [t + 520, { opacity: 1, transform: 'none' }]];
        if (el.classList.contains('rps-fokus')) f.push([3900, { transform: 'none' }], [4400, { transform: 'scale(1.08)' }, PEGAS]);
        else f.push([3900, { opacity: 1 }], [4400, { opacity: .42 }]);
        jejak(tl, el, f);
      });
      jejak(tl, satu(st, '.rps-fokus .rps-cincin'), [[3950, { opacity: 0, transform: 'scale(.85)' }], [4500, { opacity: 1, transform: 'none' }]]);
      gambarGaris(tl, satu(st, '.rps-sorot'), 4150, 800);
      jejak(tl, satu(st, '.rps-jalur-cahaya'), [[4450, { opacity: 0 }], [5000, { opacity: 1 }]]);
      muncul(tl, satu(st, '.rps-catatan-1'), 4800, 560);
      tl.loop(satu(st, '.rps-fokus .rps-denyut'), [{ opacity: 1 }, { opacity: .45 }, { opacity: 1 }], { duration: 2800 });
    }
  };

  /* ================= SCENE 2 — dua fase dalam satu layar ================= */
  var S2 = {
    set: function (step) {
      var u = pecah(step.focus, '→');
      return '' +
        '<div class="rps-panel rps-panel-kiri"><div class="rps-panel-dunia">' + KOTA + '</div>' +
          '<span class="rps-panel-judul">MASA PRODUKTIF</span>' +
          '<ul class="rps-daftar"><li>bekerja</li><li>income aktif</li><li>mempersiapkan</li></ul>' +
          '<div class="rps-aktor rps-aktor-2a">' + tokoh({ usia: 'dewasa', pakaian: 'kerja', tas: true }) + '</div></div>' +
        '<div class="rps-panel rps-panel-kanan"><div class="rps-panel-dunia">' + ALAM + '</div><i class="rps-panel-hangat"></i>' +
          '<span class="rps-panel-judul">MASA PENSIUN</span>' +
          '<ul class="rps-daftar"><li>tidak bekerja</li><li>dana pensiun</li><li>menggunakan</li></ul>' +
          '<div class="rps-aktor rps-aktor-2b">' + tokoh({ usia: 'senior', pakaian: 'santai', kacamata: true, arah: -1 }) + '</div></div>' +
        '<i class="rps-sekat"></i>' +
        kanvas(alir('M21 41 C 32 41, 40 38, 50 38 C 60 38, 68 41, 79 41', 'rps-alir-l'), 'rps-land') +
        kanvas(alir('M25 44 C 34 44, 40 40, 50 40 C 60 40, 66 44, 75 44', 'rps-alir-p'), 'rps-port') +
        '<div class="rps-kapsul">PERSIAPAN</div>' +
        '<div class="rps-penggaris"><i class="rps-pg-a"></i><i class="rps-pg-b"></i>' +
          '<b class="rps-umur rps-umur-1"><i></i><span>' + esc(u[0] || '') + '</span></b>' +
          '<b class="rps-umur rps-umur-2"><i></i><span>' + esc(u[1] || '') + '</span></b>' +
          '<b class="rps-umur rps-umur-3"><i></i><span>' + esc(u[2] || '') + '</span></b>' +
          '<em class="rps-pg-label rps-pg-label-a">30 TAHUN BEKERJA</em><em class="rps-pg-label rps-pg-label-b">30 TAHUN PENSIUN</em></div>' +
        '<div class="rps-catatan rps-catatan-2">Penghasilan saat bekerja perlu menopang dua fase.</div>';
    },
    dunia: {},
    animate: function (tl, st) {
      jejak(tl, satu(st, '.rps-sekat'), [[0, { transform: 'scaleY(0)', opacity: 0 }], [700, { transform: 'none', opacity: 1 }]]);
      jejak(tl, satu(st, '.rps-panel-kiri'), [[150, { opacity: 0, transform: 'perspective(900px) translateX(6cqw) rotateY(24deg)' }], [1150, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.rps-panel-kanan'), [[150, { opacity: 0, transform: 'perspective(900px) translateX(-6cqw) rotateY(-24deg)' }], [1150, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.rps-aktor-2a'), [[700, { opacity: 0, transform: 'translateX(-10cqw)' }], [900, { opacity: 1 }], [1700, { transform: 'none' }]]);
      jalan(tl, st, '.rps-aktor-2a', 700, 1000, 2);
      muncul(tl, satu(st, '.rps-aktor-2b'), 1000, 800, 'translateY(4%) scale(.97)');
      var kiri = semua(st, '.rps-panel-kiri li'), kanan = semua(st, '.rps-panel-kanan li');
      for (var i = 0; i < 3; i++) {
        muncul(tl, kiri[i], 1500 + i * 360, 420, 'translateX(-8px)');
        muncul(tl, kanan[i], 1680 + i * 360, 420, 'translateX(8px)');
      }
      jejak(tl, satu(st, '.rps-pg-a'), [[2700, { transform: 'scaleX(0)' }], [3300, { transform: 'none' }, 'cubic-bezier(.5,0,.3,1)']]);
      jejak(tl, satu(st, '.rps-pg-b'), [[3300, { transform: 'scaleX(0)' }], [3900, { transform: 'none' }, 'cubic-bezier(.5,0,.3,1)']]);
      letup(tl, satu(st, '.rps-umur-1'), 2600, 420);
      letup(tl, satu(st, '.rps-umur-2'), 3200, 420);
      letup(tl, satu(st, '.rps-umur-3'), 3800, 420);
      muncul(tl, satu(st, '.rps-pg-label-a'), 3000, 420, 'translateY(6px)');
      muncul(tl, satu(st, '.rps-pg-label-b'), 3600, 420, 'translateY(6px)');
      letup(tl, satu(st, '.rps-kapsul'), 4100, 480);
      semua(st, '.rps-alir-garis').forEach(function (el) { gambarGaris(tl, el, 4200, 900); });
      semua(st, '.rps-alir-titik').forEach(function (el) { jejak(tl, el, [[4700, { opacity: 0 }], [5200, { opacity: 1 }]]); });
      jejak(tl, satu(st, '.rps-panel-hangat'), [[4700, { opacity: 0 }], [5500, { opacity: 1 }]]);
      muncul(tl, satu(st, '.rps-catatan-2'), 5100, 560);
      alirAmbient(tl, st);
    }
  };

  /* ================= SCENE 3 — masa produktif: EARN → SAVE / SPEND ================= */
  var S3 = {
    set: function () {
      return '' +
        '<div class="rps-meja"><i class="rps-meja-kaki"></i><i class="rps-laptop"><i class="rps-laptop-layar"></i></i></div>' +
        '<div class="rps-aktor rps-aktor-3">' + tokoh({ usia: 'dewasa', pakaian: 'kerja' }) + '</div>' +
        '<i class="rps-koin rps-koin-1"></i><i class="rps-koin rps-koin-2"></i><i class="rps-koin rps-koin-3"></i>' +
        '<div class="rps-earn"><i class="rps-earn-ikon"></i><span>EARN 100%</span></div>' +
        kanvas(alir('M31 25 C 31 40, 56 36, 57 50', 'rps-alir-spend') + alir('M31 25 C 31 44, 80 30, 81 50', 'rps-alir-save') +
          garis('M89 66 H99', 'rps-masa-depan'), 'rps-land') +
        kanvas(alir('M38 21 C 38 33, 60 30, 60 45', 'rps-alir-spend') + alir('M38 21 C 38 35, 86 27, 86 45', 'rps-alir-save'), 'rps-port') +
        '<div class="rps-wadah rps-wadah-spend"><span class="rps-wadah-kata"><b>TODAY</b>kebutuhan</span><div class="rps-gelas"><i class="rps-isi-air"></i></div><span class="rps-wadah-chip">SPEND 50%</span></div>' +
        '<div class="rps-wadah rps-wadah-save"><span class="rps-wadah-kata"><b>FUTURE</b>persiapan</span><div class="rps-gelas"><i class="rps-isi-air"></i><i class="rps-gelas-sinar"></i></div><span class="rps-wadah-chip">SAVE 50%</span></div>' +
        '<i class="rps-cakrawala"></i>' +
        '<div class="rps-catatan rps-catatan-3"><b>Belum bisa 50%?</b> Mulai dari yang realistis.</div>';
    },
    dunia: { kota: true },
    animate: function (tl, st) {
      kamera(tl, st, 'scale(1.06) translateX(2%)', 1400);
      jejak(tl, satu(st, '.rps-kota'), [[0, { transform: 'translateX(3%)' }], [1800, { transform: 'none' }]]);
      jejak(tl, satu(st, '.rps-aktor-3'), [[0, { opacity: 0, transform: 'translateX(-14cqw)' }], [200, { opacity: 1 }], [1100, { transform: 'none' }]]);
      jalan(tl, st, '.rps-aktor-3', 0, 1100, 3);
      muncul(tl, satu(st, '.rps-meja'), 300, 600, 'translateY(8px)');
      jejak(tl, satu(st, '.rps-laptop-layar'), [[900, { opacity: .35 }], [1300, { opacity: 1 }]]);
      semua(st, '.rps-koin').forEach(function (el, i) {
        var t = 1150 + i * 180;
        jejak(tl, el, [[t, { opacity: 0, transform: 'translate(0,0) scale(.6)' }], [t + 150, { opacity: 1 }],
          [t + 650, { opacity: 1, transform: 'translate(0,-9cqh) scale(1)' }, 'cubic-bezier(.3,.6,.3,1)'], [t + 820, { opacity: 0, transform: 'translate(0,-11cqh) scale(.7)' }]]);
      });
      jejak(tl, satu(st, '.rps-earn'), [[1500, { opacity: 0, transform: 'scale(.6)' }], [2000, { opacity: 1, transform: 'none' }, PEGAS]]);
      semua(st, '.rps-alir-garis').forEach(function (el) { gambarGaris(tl, el, 2100, 900); });
      semua(st, '.rps-alir-titik').forEach(function (el) { jejak(tl, el, [[2300, { opacity: 0 }], [2700, { opacity: 1 }]]); });
      semua(st, '.rps-wadah').forEach(function (el, i) { muncul(tl, el, 1900 + i * 150, 520, 'translateY(12px)'); });
      semua(st, '.rps-isi-air').forEach(function (el) {
        jejak(tl, el, [[2750, { transform: 'scaleY(0)' }], [3700, { transform: 'none' }, 'cubic-bezier(.4,0,.2,1)']]);
      });
      semua(st, '.rps-wadah-chip').forEach(function (el, i) { letup(tl, el, 3600 + i * 120, 420); });
      jejak(tl, satu(st, '.rps-gelas-sinar'), [[3900, { opacity: 0 }], [4500, { opacity: 1 }]]);
      semua(st, '.rps-masa-depan').forEach(function (el) { gambarGaris(tl, el, 4000, 700); });
      jejak(tl, satu(st, '.rps-cakrawala'), [[4100, { opacity: 0 }], [4900, { opacity: 1 }]]);
      muncul(tl, satu(st, '.rps-catatan-3'), 4700, 600, 'translateY(12px)');
      alirAmbient(tl, st);
    }
  };

  /* ================= SCENE 4 — transisi ke pensiun ================= */
  var S4 = {
    set: function () {
      return '' +
        '<div class="rps-aktor rps-aktor-4">' + tokoh({ usia: 'senior', pakaian: 'santai', kacamata: true }) + '</div>' +
        '<div class="rps-kerja"><span class="rps-kerja-label">INCOME FROM WORK</span><div class="rps-kerja-baris"><div class="rps-kerja-garis"><i class="rps-kerja-isi"></i><i class="rps-kerja-alir"></i></div><b class="rps-silang" aria-hidden="true">✕</b></div></div>' +
        '<div class="rps-kartu rps-kartu-kini"><span>HARI INI</span><b>Rp10 JT</b><small>/ BULAN</small></div>' +
        '<i class="rps-panah rps-panah-4"></i>' +
        '<div class="rps-kartu rps-kartu-nanti"><span>PENSIUN</span><b class="rps-tanya">?</b></div>' +
        '<div class="rps-target">TARGET DANA PERLU DIHITUNG</div>' +
        '<div class="rps-dana"><i class="rps-dana-garis"></i><span class="rps-dana-label">RETIREMENT FUND</span><span class="rps-dana-hidup">LIFE</span></div>' +
        '<i class="rps-redam"></i>';
    },
    dunia: { kota: true, alam: true, senja: true, matahari: true },
    animate: function (tl, st) {
      kamera(tl, st, 'scale(1.05)', 1200);
      var ak = '.rps-aktor-4';
      ganti(tl, st, ak, 'o', [[0, 'kerja'], [2700, 'santai']], 700);
      jejak(tl, satu(st, ak + ' .k-tas'), [[0, { opacity: 1 }], [2500, { opacity: 1 }], [2900, { opacity: 0 }]]);
      muncul(tl, satu(st, ak), 0, 700, 'translateY(3%)');
      /* penghasilan kerja mengalir ke gaya hidup hari ini */
      muncul(tl, satu(st, '.rps-kerja-label'), 150, 500, 'translateX(-8px)');
      jejak(tl, satu(st, '.rps-kerja-isi'), [[300, { transform: 'scaleX(0)' }], [1100, { transform: 'none' }]]);
      jejak(tl, satu(st, '.rps-kerja-alir'), [[500, { opacity: 0, backgroundPositionX: '0px' }], [900, { opacity: 1 }], [2000, { opacity: 1, backgroundPositionX: '48px' }, 'linear'], [2250, { opacity: 0, backgroundPositionX: '54px' }, 'ease-out']]);
      /* momen pensiun: penghasilan berhenti */
      jejak(tl, satu(st, '.rps-silang'), [[2050, { opacity: 0, transform: 'scale(1.8) rotate(-20deg)' }], [2400, { opacity: 1, transform: 'none' }, PEGAS]]);
      jejak(tl, satu(st, '.rps-kerja-garis'), [[2100, { opacity: 1 }], [2500, { opacity: .38 }]]);
      jejak(tl, satu(st, '.rps-redam'), [[2050, { opacity: 0 }], [2350, { opacity: 1 }], [3300, { opacity: 0 }]]);
      /* lingkungan kerja → pensiun */
      jejak(tl, satu(st, '.rps-kota'), [[2400, { opacity: 1, transform: 'none' }], [3600, { opacity: 0, transform: 'translateX(-6%)' }, 'cubic-bezier(.5,0,.3,1)']]);
      jejak(tl, satu(st, '.rps-alam'), [[2400, { opacity: 0, transform: 'translateX(6%)' }], [3600, { opacity: 1, transform: 'none' }, 'cubic-bezier(.3,0,.2,1)']]);
      jejak(tl, satu(st, '.rps-langit-senja'), [[2400, { opacity: 0 }], [3800, { opacity: 1 }]]);
      jejak(tl, satu(st, '.rps-matahari'), [[2600, { opacity: 0, transform: 'translateY(18%)' }], [4000, { opacity: 1, transform: 'none' }]]);
      /* kebutuhan tetap ada */
      jejak(tl, satu(st, '.rps-kartu-kini'), [[700, { opacity: 0, transform: 'perspective(700px) rotateX(-28deg) translateY(10px)' }], [1300, { opacity: 1, transform: 'none' }], [3350, { transform: 'none' }], [3600, { transform: 'scale(1.05)' }], [3900, { transform: 'none' }]]);
      jejak(tl, satu(st, '.rps-panah-4'), [[3600, { transform: 'scaleX(0)' }], [4000, { transform: 'none' }]]);
      jejak(tl, satu(st, '.rps-kartu-nanti'), [[3900, { opacity: 0, transform: 'perspective(700px) rotateY(-30deg) translateX(10px)' }], [4400, { opacity: 1, transform: 'none' }]]);
      letup(tl, satu(st, '.rps-tanya'), 4300, 500);
      /* dana pensiun mulai menopang kehidupan */
      jejak(tl, satu(st, '.rps-dana-garis'), [[4400, { transform: 'scaleX(0)' }], [5300, { transform: 'none' }, 'cubic-bezier(.5,0,.3,1)']]);
      muncul(tl, satu(st, '.rps-dana-label'), 4450, 450, 'translateY(6px)');
      muncul(tl, satu(st, '.rps-dana-hidup'), 5150, 450, 'translateX(-8px)');
      muncul(tl, satu(st, '.rps-target'), 5300, 600, 'translateY(10px)');
    }
  };
  /* ================= SCENE 5 — waktu berjalan ================= */
  var UMUR5 = [25, 30, 35, 40, 45, 50, 55];
  var S5 = {
    set: function (step) {
      var c = pecah(step.focus, '•');
      return '' +
        c.map(function (t, i) { return '<span class="rps-chip rps-chip-' + (i + 1) + '">' + esc(t) + '</span>'; }).join('') +
        '<div class="rps-kurva">' + kanvas(
          '<defs><linearGradient id="rpsLuas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rps-luas-a"/><stop offset="1" class="rps-luas-b"/></linearGradient></defs>' +
          garis('M12 79 C 38 77.5, 55 69, 67 55 C 75 45, 80 34, 86 24 L 86 79 Z', 'rps-luas') +
          garis('M12 79 C 38 77.5, 55 69, 67 55 C 75 45, 80 34, 86 24', 'rps-garis-bunga')) + '</div>' +
        '<i class="rps-garis-dasar"></i>' +
        '<i class="rps-ujung"><i class="rps-denyut"></i></i>' +
        '<div class="rps-rumus">WAKTU + HASIL = COMPOUNDING</div>' +
        UMUR5.map(function (u, i) { return '<b class="rps-tik rps-tik-' + (i + 1) + '"><i></i><span>' + u + '</span></b>'; }).join('') +
        '<em class="rps-tik-kata rps-tik-kata-a">MULAI</em><em class="rps-tik-kata rps-tik-kata-b">30 TAHUN</em>' +
        '<div class="rps-aktor rps-aktor-5">' +
          '<div class="rps-usia">' + UMUR5.map(function (u, i) { return '<span class="rps-usia-' + (i + 1) + '">' + u + '</span>'; }).join('') + '</div>' +
          tokoh({ usia: 'senior', pakaian: 'kerja', kacamata: true }) + '</div>';
    },
    dunia: { alam: 'redup', senja: true },
    animate: function (tl, st) {
      var T0 = 900, T1 = 4900, D = T1 - T0;
      semua(st, '.rps-chip').forEach(function (el, i) { muncul(tl, el, 100 + i * 170, 480, 'translateY(-10px)'); });
      jejak(tl, satu(st, '.rps-garis-dasar'), [[200, { transform: 'scaleX(0)' }], [900, { transform: 'none' }]]);
      semua(st, '.rps-tik').forEach(function (el, i) {
        var t = T0 + (D * i) / 6;
        jejak(tl, el, [[Math.max(0, t - 350), { opacity: .35 }], [t, { opacity: 1 }]]);
      });
      muncul(tl, satu(st, '.rps-tik-kata-a'), 500, 450, 'translateY(6px)');
      /* tokoh berjalan 25 → 55; kurva tumbuh mengikuti posisinya */
      var ak = satu(st, '.rps-aktor-5');
      jejak(tl, ak, [[0, { opacity: 0, transform: 'translateX(-74cqw)' }], [300, { opacity: 1 }], [T0, { transform: 'translateX(-74cqw)' }], [T1, { transform: 'none' }, 'linear']]);
      jalan(tl, st, '.rps-aktor-5', T0, D, 10);
      jejak(tl, satu(st, '.rps-kurva'), [[T0, { clipPath: 'inset(0 88% 0 0)' }], [T1, { clipPath: 'inset(0 0% 0 0)' }, 'linear']]);
      /* umur berganti; tokoh menua halus */
      semua(st, '.rps-usia span').forEach(function (el, i) {
        var t = T0 + (D * i) / 6;
        var f = i === 0 ? [[0, { opacity: 1 }]] : [[t - 160, { opacity: 0, transform: 'translateY(40%)' }], [t + 80, { opacity: 1, transform: 'none' }]];
        if (i < 6) f.push([T0 + (D * (i + 1)) / 6 - 160, { opacity: 1, transform: 'none' }], [T0 + (D * (i + 1)) / 6 + 80, { opacity: 0, transform: 'translateY(-40%)' }]);
        jejak(tl, el, f);
      });
      ganti(tl, st, '.rps-aktor-5', 'h', [[0, 'muda'], [T0 + D * .55, 'tua']], 900);
      ganti(tl, st, '.rps-aktor-5', 'o', [[0, 'muda'], [T0 + D * .12, 'kerja']], 500);
      jejak(tl, satu(st, '.rps-aktor-5 .k-kacamata'), [[T0 + D * .72, { opacity: 0 }], [T0 + D * .72 + 500, { opacity: 1 }]]);
      jejak(tl, satu(st, '.rps-aktor-5 .k-atas'), [[T0 + D * .7, { transform: 'none' }], [T1, { transform: 'rotate(2.5deg)' }]]);
      /* langit pagi → senja */
      jejak(tl, satu(st, '.rps-langit-senja'), [[T0, { opacity: 0 }], [T1, { opacity: 1 }, 'linear']]);
      jejak(tl, satu(st, '.rps-alam'), [[T0, { transform: 'translateX(4%)' }], [T1, { transform: 'none' }, 'linear']]);
      /* akibat: waktu + hasil */
      jejak(tl, satu(st, '.rps-ujung'), [[T1 - 100, { opacity: 0, transform: 'scale(.3)' }], [T1 + 450, { opacity: 1, transform: 'none' }, PEGAS]]);
      muncul(tl, satu(st, '.rps-rumus'), T1 + 150, 600, 'translateY(10px)');
      muncul(tl, satu(st, '.rps-tik-kata-b'), T1, 450, 'translateY(6px)');
      tl.loop(satu(st, '.rps-ujung .rps-denyut'), [{ transform: 'none', opacity: 1 }, { transform: 'scale(1.25)', opacity: .55 }, { transform: 'none', opacity: 1 }], { duration: 2600 });
    }
  };

  /* ================= SCENE 6 — penutup ================= */
  var S6 = {
    set: function (step) {
      var p = pecah(step.focus, '+');
      return garisHidup() +
        kanvas(garis('M5 76 C 8 28, 92 28, 95 76', 'rps-kubah')) +
        '<div class="rps-perisai"><svg class="rps-perisai-ikon" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 1 L19 4.5 V11 C19 17 15 21.5 10 23 C5 21.5 1 17 1 11 V4.5 Z"/></svg><span>' + esc(p[2] || '') + '</span></div>' +
        '<div class="rps-suar rps-suar-1"><i></i><span>' + esc(p[0] || '') + '</span></div>' +
        '<div class="rps-suar rps-suar-2"><i></i><span>' + esc(p[1] || '') + '</span></div>' +
        '<i class="rps-hangat"><i class="rps-denyut"></i></i>' +
        '<div class="rps-aktor rps-aktor-6">' + tokoh({ usia: 'senior', pakaian: 'santai', kacamata: true }) + '</div>' +
        '<div class="rps-pesan"><b>RETIREMENT PLANNING</b><span>Bangun dana • manfaatkan waktu • lindungi rencana</span></div>';
    },
    dunia: { kota: true, alam: true, senja: true, matahari: true },
    kelas: 'rps-panorama',
    animate: function (tl, st) {
      var J0 = 300, J1 = 4000, D = J1 - J0;
      jejak(tl, satu(st, '.rps-cam'), [[0, { transform: 'scale(1.22) translate(14%, 4%)' }], [J0, { transform: 'scale(1.22) translate(14%, 4%)' }], [J1 + 300, { transform: 'none' }, 'cubic-bezier(.45,.05,.3,1)']]);
      jejak(tl, satu(st, '.rps-kota'), [[J0, { transform: 'translateX(4%)' }], [J1, { transform: 'none' }, 'linear']]);
      jejak(tl, satu(st, '.rps-alam'), [[J0, { transform: 'translateX(-3%)' }], [J1, { transform: 'none' }, 'linear']]);
      jejak(tl, satu(st, '.rps-aktor-6'), [[0, { transform: 'translateX(-78cqw)' }], [J0, { transform: 'translateX(-78cqw)' }], [J1, { transform: 'none' }, 'cubic-bezier(.35,0,.45,1)']]);
      jalan(tl, st, '.rps-aktor-6', J0, D, 12);
      ganti(tl, st, '.rps-aktor-6', 'o', [[0, 'muda'], [J0 + D * .2, 'kerja'], [J0 + D * .7, 'santai']], 500);
      ganti(tl, st, '.rps-aktor-6', 'h', [[0, 'muda'], [J0 + D * .55, 'tua']], 800);
      jejak(tl, satu(st, '.rps-aktor-6 .k-kacamata'), [[J0 + D * .6, { opacity: 0 }], [J0 + D * .6 + 400, { opacity: 1 }]]);
      jejak(tl, satu(st, '.rps-aktor-6 .k-atas'), [[J0 + D * .7, { transform: 'none' }], [J1, { transform: 'rotate(2.5deg)' }]]);
      /* jalur menyala mengikuti langkah */
      jejak(tl, satu(st, '.rps-jalur-produktif'), [[J0, { transform: 'scaleX(0)' }], [J0 + D * .75, { transform: 'none' }, 'cubic-bezier(.35,0,.45,1)']]);
      jejak(tl, satu(st, '.rps-jalur-pensiun'), [[J0 + D * .75, { transform: 'scaleX(0)' }], [J1, { transform: 'none' }, 'cubic-bezier(.35,0,.45,1)']]);
      semua(st, '.rps-tahap').forEach(function (el, i) {
        var t = J0 + D * [0.01, .24, .5, .75, .99][i];
        jejak(tl, el.querySelector('.rps-tahap-titik'), [[Math.max(0, t - 120), { transform: 'scale(.7)', opacity: .5 }], [t + 250, { transform: 'none', opacity: 1 }, PEGAS]]);
      });
      letup(tl, satu(st, '.rps-suar-1'), J0 + D * .18, 520);
      letup(tl, satu(st, '.rps-suar-2'), J0 + D * .5, 520);
      gambarGaris(tl, satu(st, '.rps-kubah'), J0 + D * .62, 1300);
      jejak(tl, satu(st, '.rps-perisai'), [[J0 + D * .9, { opacity: 0, transform: 'translateY(8px) scale(.8)' }], [J1 + 500, { opacity: 1, transform: 'none' }, PEGAS]]);
      jejak(tl, satu(st, '.rps-hangat'), [[J1 - 300, { opacity: 0, transform: 'scale(.5)' }], [J1 + 800, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.rps-jalur-cahaya'), [[J1, { opacity: 0 }], [J1 + 700, { opacity: 1 }]]);
      jejak(tl, satu(st, '.rps-pesan'), [[J1 + 500, { opacity: 0, transform: 'translateY(14px)', filter: 'blur(6px)' }], [J1 + 1400, { opacity: 1, transform: 'none', filter: 'blur(0px)' }]]);
      tl.loop(satu(st, '.rps-hangat .rps-denyut'), [{ opacity: 1 }, { opacity: .7 }, { opacity: 1 }], { duration: 3600 });
    }
  };

  var PETA = { risks: S1, timeline: S2, ratio: S3, target: S4, compound: S5, complete: S6 };

  function adegan(opsi) {
    var o = opsi || {};
    var langkah = Array.isArray(o.langkah) ? o.langkah : [];
    return langkah.map(function (step, i) {
      var sc = PETA[step.scene];
      var n = i + 1;
      return {
        id: 'retirement-' + n,
        fit: true,
        siapDi: 'akhir',
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, step, n, sc ? sc.set(step) : '', sc ? sc.dunia : {}, sc ? sc.kelas : '');
          amati(stage);
        },
        animate: function (tl, stage) {
          animasiTeks(tl, stage);
          if (sc) sc.animate(tl, stage);
        }
      };
    });
  }

  window.PSGRetirementStory = { adegan: adegan };
})();
