/* ============================================================
   Sales Idea — 10 Jari (cerita tangan interaktif)
   ------------------------------------------------------------
   Identitas visual: satu tangan di tengah panggung.
     Scene 1–5  : tangan produk menghitung lima ujung risiko SKCMT;
                  tiap scene mengangkat satu jari (jempol → kelingking),
                  jari lain yang belum dihitung sedikit melipat.
     Scene 6–10 : tangan produk bergeser menjadi ringkasan, tangan
                  pertanyaan (cermin) masuk ke tengah dan menghitung
                  lima pertanyaan dengan gestur bertanya.

   Teks panel (judul, fokus, isi, inti) memakai data `fingers` dan
   teks fokus renderer lama di sales-idea.js. Label jari memakai
   legenda tangan lama. Tidak ada isi bisnis baru.

   Keadaan akhir = keadaan CSS statis. Frame awal (OPEN / NEXT /
   BACK / REPLAY) = keadaan sebelum jari scene ini diangkat.
   Gerak dikurangi: tanpa animasi — selalu keadaan akhir.
   Satu SVG tanpa <svg> bersarang; semua gerak lewat timeline
   pemutar (Web Animations API), tanpa timer dan tanpa listener.
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var PEGAS = 'cubic-bezier(.34,1.3,.5,1)';
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  /* legenda tangan pertanyaan lama (handHtml di sales-idea.js) */
  var TANYA = ['Kebal?', 'Bisa memilih?', 'Tahu kapan?', 'Butuh uang besar?', 'Kantong sendiri / orang lain?'];
  var CUE = 'Gunakan visual ini sebagai alat bantu presentasi. Agen bebas mengembangkan percakapan sesuai respons prospek.';

  /* Geometri jari dalam koordinat tangan: pergelangan di (0,0), atas = -y.
     bx/by pangkal jari, a sudut (derajat), L panjang, w lebar. */
  var JARI = [
    { bx: -40, by: -34, a: -40, L: 70, w: 26 },
    { bx: -36, by: -97, a: -5, L: 86, w: 24 },
    { bx: -11, by: -100, a: 0, L: 96, w: 25 },
    { bx: 13, by: -98, a: 4, L: 90, w: 23.5 },
    { bx: 35, by: -91, a: 10, L: 70, w: 20 }
  ];
  /* posisi tangan di panggung (viewBox 400×300); m = -1 untuk cermin */
  var POS = {
    pTengah: { x: 205, y: 294, s: 1.15, m: 1 },
    pRekap: { x: 70, y: 292, s: 0.5, m: 1 },
    qTengah: { x: 238, y: 294, s: 1.15, m: -1 },
    qLuar: { x: 340, y: 294, s: 1.15, m: -1 }
  };
  var REDUP_REKAP = 0.62;
  /* pose jari — sama persis dengan keadaan CSS di sales-idea-jari.css */
  var LIPAT = 'translate(0px,3px) scale(.96,.72)';
  var LIPAT_JEMPOL = 'rotate(30deg) scale(.9,.8)';
  var ANGKAT = 'translate(0px,-7px) scale(1.03)';
  var ANGKAT_JEMPOL = 'rotate(-6deg) translate(0px,-5px) scale(1.03)';

  function f(n) { return Math.round(n * 10) / 10; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function satu(root, sel) { return root ? root.querySelector(sel) : null; }
  function semua(root, sel) { return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : []; }
  function tf(p) { return 'translate(' + p.x + 'px,' + p.y + 'px) scale(' + (p.m * p.s) + ',' + p.s + ')'; }

  /* jejak(tl, el, [[ms, {props}, easingMenujuFrameIni], ...]) — satu
     animasi per elemen; frame terakhir = keadaan CSS. */
  function jejakDasar(tl, el, frames) {
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

  /* ---------------- gambar tangan ---------------- */
  function stop(o, v, a) { return '<stop offset="' + o + '" style="stop-color:var(' + v + ')' + (a != null ? ';stop-opacity:' + a : '') + '"/>'; }
  function defs() {
    var jari = [stop(0, '--jps-kulit-3'), stop(0.3, '--jps-kulit-1'), stop(0.64, '--jps-kulit-2'), stop(1, '--jps-kulit-3')];
    return '<defs>' +
      '<linearGradient id="jpsJari" x1="0" y1="0" x2="1" y2="0">' + jari.join('') + '</linearGradient>' +
      '<linearGradient id="jpsJariC" x1="1" y1="0" x2="0" y2="0">' + jari.join('') + '</linearGradient>' +
      '<radialGradient id="jpsTelapak" cx=".42" cy=".36" r=".78">' + stop(0, '--jps-telapak-1') + stop(0.62, '--jps-telapak-2') + stop(1, '--jps-kulit-3') + '</radialGradient>' +
      '<radialGradient id="jpsTelapakC" cx=".58" cy=".36" r=".78">' + stop(0, '--jps-telapak-1') + stop(0.62, '--jps-telapak-2') + stop(1, '--jps-kulit-3') + '</radialGradient>' +
      '<linearGradient id="jpsLengan" x1="0" y1="0" x2="1" y2="0">' + stop(0, '--jps-kulit-3') + stop(0.34, '--jps-kulit-1') + stop(0.7, '--jps-kulit-2') + stop(1, '--jps-kulit-3') + '</linearGradient>' +
      '<linearGradient id="jpsLenganC" x1="1" y1="0" x2="0" y2="0">' + stop(0, '--jps-kulit-3') + stop(0.34, '--jps-kulit-1') + stop(0.7, '--jps-kulit-2') + stop(1, '--jps-kulit-3') + '</linearGradient>' +
      '<radialGradient id="jpsBayang">' + stop(0, '--jps-bayang') + stop(1, '--jps-bayang', 0) + '</radialGradient>' +
      '<radialGradient id="jpsHalo">' + stop(0, '--jps-sorot') + stop(1, '--jps-sorot', 0) + '</radialGradient>' +
      '<filter id="jpsKabur" x="-60%" y="-20%" width="220%" height="140%"><feGaussianBlur stdDeviation="3.4"/></filter>' +
      '</defs>';
  }
  function kapsul(j) {
    var w = j.w, t = w * 0.88, L = j.L, r = t / 2;
    return 'M' + f(-w / 2) + ' 10C' + f(-w / 2) + ' ' + f(-L * 0.45) + ' ' + f(-t / 2) + ' ' + f(-L * 0.7) + ' ' + f(-t / 2) + ' ' + f(-L + r) +
      'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(t / 2) + ' ' + f(-L + r) +
      'C' + f(t / 2) + ' ' + f(-L * 0.7) + ' ' + f(w / 2) + ' ' + f(-L * 0.45) + ' ' + f(w / 2) + ' 10Z';
  }
  function jari(j, k, keadaan, cermin, lencana) {
    var d = kapsul(j), t = j.w * 0.88;
    var lipatan = (k === 1 ? [0.52] : [0.36, 0.66]).map(function (u) {
      var y = -j.L * u;
      return 'M' + f(-t * 0.32) + ' ' + f(y) + 'Q0 ' + f(y + 2.4) + ' ' + f(t * 0.32) + ' ' + f(y);
    }).join('');
    return '<g class="jps-jari jps-j' + k + ' jps-' + keadaan + '" transform="translate(' + j.bx + ' ' + j.by + ') rotate(' + j.a + ')">' +
      '<g class="jps-gerak">' +
        '<path class="jps-sinar" d="' + d + '"/>' +
        '<path class="jps-kulit-jari" d="' + d + '" fill="url(#' + (cermin ? 'jpsJariC' : 'jpsJari') + ')"/>' +
        '<ellipse class="jps-ujung" cx="0" cy="' + f(-j.L + t * 0.56) + '" rx="' + f(t * 0.3) + '" ry="' + f(t * 0.42) + '"/>' +
        '<path class="jps-lipatan" d="' + lipatan + '"/>' +
        '<path class="jps-teduh" d="' + d + '"/>' +
        '<g class="jps-lencana" transform="translate(0 ' + f(-j.L + t * 0.62) + ') rotate(' + (-j.a) + ')' + (cermin ? ' scale(-1 1)' : '') + '">' +
          '<circle r="8.6"/><text y="3.5">' + esc(lencana) + '</text></g>' +
      '</g></g>';
  }
  /* telapak: tepi atas melengkung menutup pangkal jari, bergelombang di sela jari */
  var TELAPAK = 'M-31 0C-36 -14 -47 -24 -50 -44C-53 -62 -52 -84 -49 -96Q-44 -106 -36 -105Q-29 -104 -24 -97' +
    'Q-18 -108 -11 -108Q-4 -108 1 -99Q7 -107 13 -106Q20 -105 24 -96Q30 -101 35 -99Q43 -97 46 -88' +
    'C50 -70 51 -40 44 -20C40 -10 35 -4 31 0Z';
  var GARIS_TELAPAK = 'M44 -80C26 -76 2 -84 -26 -90M-49 -74C-26 -62 0 -58 30 -54M-40 -80C-26 -60 -26 -30 -18 -6' +
    'M-44 -100q8 2.5 16 0M-19 -103q8 2.5 16 0M6 -101q7.5 2.5 15 0M29 -95q6 2 12 0';
  function tangan(jenis, pos, keadaan, lencana, redup) {
    var c = pos.m < 0;
    return '<g class="jps-tangan jps-tangan-' + jenis + '" style="transform:' + tf(pos) + (redup != null ? ';opacity:' + redup : '') + '">' +
      '<g class="jps-gestur"><g class="jps-napas">' +
        '<ellipse class="jps-bayang" cx="4" cy="-100" rx="94" ry="120" fill="url(#jpsBayang)"/>' +
        '<path class="jps-lengan" d="M-31 -4C-33 60 -36 200 -38 420L38 420C36 200 33 60 31 -4Z" fill="url(#' + (c ? 'jpsLenganC' : 'jpsLengan') + ')"/>' +
        JARI.map(function (j, i) { return jari(j, i + 1, keadaan[i], c, lencana[i]); }).join('') +
        '<path class="jps-telapak" d="' + TELAPAK + '" fill="url(#' + (c ? 'jpsTelapakC' : 'jpsTelapak') + ')"/>' +
        '<ellipse class="jps-cekung" cx="2" cy="-58" rx="30" ry="26" fill="url(#jpsBayang)"/>' +
        '<ellipse class="jps-kilap" cx="' + (c ? 32 : -32) + '" cy="-38" rx="10" ry="24"/>' +
        '<path class="jps-garis-telapak" d="' + GARIS_TELAPAK + '"/>' +
      '</g></g></g>';
  }
  /* ujung jari (koordinat panggung) untuk label */
  function ujung(p, j, angkat) {
    var r = j.a * Math.PI / 180, L = j.L + (angkat || 0);
    return { x: p.x + p.m * p.s * (j.bx + Math.sin(r) * L), y: p.y + p.s * (j.by - Math.cos(r) * L) };
  }
  /* label fokus: jempol & kelingking condong ke sisi luar agar tidak menutupi jari lain */
  function label(teks, tip, arah, k) {
    var lebar = teks.length * 7.1 + 22;
    return '<g class="jps-chip" data-k="' + k + '" data-tx="' + f(tip.x) + '" data-ty="' + f(tip.y) + '" data-arah="' + arah + '" transform="translate(' + f(tip.x) + ' ' + f(tip.y - 32) + ')">' +
      '<g class="jps-chip-isi"><path class="jps-chip-tali" d="M0 12L0 30"/>' +
      '<rect class="jps-chip-pil" x="' + f(-lebar / 2) + '" y="-12" width="' + f(lebar) + '" height="24" rx="12"/>' +
      '<text class="jps-chip-teks" y="4.2">' + esc(teks) + '</text></g></g>';
  }
  function tataLabel(stage) {
    semua(stage, '.jps-chip').forEach(function (g) {
      var t = satu(g, 'text'), r = satu(g, 'rect'), tali = satu(g, 'path');
      var w = 0;
      try { w = t.getComputedTextLength(); } catch (e) { w = 0; }
      if (!w) w = t.textContent.length * 7.1;
      var lebar = w + 22, tx = +g.getAttribute('data-tx'), ty = +g.getAttribute('data-ty'), arah = +g.getAttribute('data-arah');
      var cx = Math.max(lebar / 2 + 6, Math.min(394 - lebar / 2, tx + arah * (lebar / 2 - 16)));
      /* jempol: label dekat ujungnya; jari lain: di baris atas agar tidak menutupi jari tetangga */
      var cy = Math.max(18, g.getAttribute('data-k') === '1' ? ty - 32 : Math.min(ty - 32, 46));
      g.setAttribute('transform', 'translate(' + f(cx) + ' ' + f(cy) + ')');
      r.setAttribute('x', f(-lebar / 2));
      r.setAttribute('width', f(lebar));
      var dx = tx - cx;
      tali.setAttribute('d', 'M' + f(Math.max(-lebar / 2 + 12, Math.min(lebar / 2 - 12, dx))) + ' 12L' + f(dx) + ' ' + f(ty - cy - 3));
    });
  }

  /* ---------------- susunan scene ---------------- */
  function keadaanJari(fokus) {
    return [1, 2, 3, 4, 5].map(function (k) { return k < fokus ? 'hitung' : (k === fokus ? 'fokus' : 'lipat'); });
  }
  function arahLabel(k, m) { return k === 1 ? -m : (k === 5 ? m : 0); }
  function panggung(n, langkah) {
    var kunci = langkah.slice(0, 5).map(function (s) { return s.key; });
    var isi;
    if (n <= 5) {
      isi = tangan('p', POS.pTengah, keadaanJari(n), kunci) +
        label(langkah[n - 1].title, ujung(POS.pTengah, JARI[n - 1], 7), arahLabel(n, 1), n);
    } else {
      var q = n - 5;
      isi = tangan('p', POS.pRekap, keadaanJari(6), kunci, REDUP_REKAP) +
        tangan('q', POS.qTengah, keadaanJari(q), ['1', '2', '3', '4', '5']) +
        label(TANYA[q - 1], ujung(POS.qTengah, JARI[q - 1], 7), arahLabel(q, -1), q);
    }
    return '<svg class="jps-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + defs() +
      '<g class="jps-kamera"><ellipse class="jps-halo" cx="' + (n <= 5 ? 205 : 220) + '" cy="170" rx="176" ry="150" fill="url(#jpsHalo)"/>' + isi + '</g></svg>';
  }
  function ubin(isi, fokus) {
    return '<span class="jps-ubin-deret">' + isi.map(function (x, i) {
      var k = i + 1;
      return '<span class="jps-ubin' + (k < fokus ? ' jps-ubin-hitung' : (k === fokus ? ' jps-ubin-fokus' : '')) + '"><i class="jps-ubin-isi"></i><b>' + esc(x) + '</b></span>';
    }).join('') + '</span>';
  }
  function ringkas(n, langkah) {
    if (n <= 5) {
      return '<div class="jps-ringkas"><span class="jps-ringkas-label">5 JARI PRODUK</span>' +
        ubin(langkah.slice(0, 5).map(function (s) { return s.key; }), n) + '</div>';
    }
    return '<div class="jps-ringkas"><span class="jps-ringkas-selesai">' + esc(langkah.slice(0, 5).map(function (s) { return s.key; }).join('')) + ' ✓</span>' +
      '<span class="jps-ringkas-label">5 JARI PERTANYAAN</span>' + ubin(['1', '2', '3', '4', '5'], n - 5) + '</div>';
  }
  function kerangka(o, step, n) {
    var t = typeof o.teks === 'function' ? (o.teks(n - 1) || {}) : {};
    var produk = step.type === 'produk';
    var aria = 'Ilustrasi tangan: ' + (produk ? 'jari produk ' + step.key : 'jari pertanyaan ' + step.q) + ' — ' + step.title;
    return '<div class="jps" data-jps="' + n + '">' + (o.header || '') +
      '<div class="jps-body">' +
        '<figure class="jps-stage jps-s' + n + '" role="img" aria-label="' + esc(aria) + '">' +
          '<div class="jps-latar"></div>' + panggung(n, o.langkah) +
        '</figure>' +
        '<div class="jps-text">' +
          ringkas(n, o.langkah) +
          '<span class="jps-kicker">' + (produk ? 'JARI PRODUK' : 'JARI PERTANYAAN ' + esc(step.q)) + ' • ' + n + ' / 10 JARI</span>' +
          '<h3 class="jps-title">' + esc(step.title) + '</h3>' +
          (t.focus ? '<p class="jps-focus">' + esc(t.focus) + '</p>' : '') +
          '<p class="jps-isi">' + esc(step.body) + '</p>' +
          (t.supporting ? '<div class="jps-inti"><b>Inti yang disampaikan</b><p>' + esc(t.supporting) + '</p></div>' : '') +
          (n === 10 ? '<div class="jps-lanjut"><b>10 Jari selesai.</b><span>Lanjutkan ke 3 alasan untuk menambahkan unsur emosional.</span></div>' : '') +
          '<p class="jps-cue">' + esc(CUE) + '</p>' +
        '</div>' +
      '</div></div>';
  }

  /* ---------------- gerak ---------------- */
  function animasi(tl, stage, n) {
    /* gerak dikurangi: tidak ada animasi; panggung tetap di keadaan akhir */
    if (MQ && MQ.matches) return;
    var sv = satu(stage, '.jps-svg');
    if (!sv) return;
    var produk = n <= 5, k = produk ? n : n - 5, t0 = n === 6 ? 800 : 0;
    var tg = satu(sv, produk ? '.jps-tangan-p' : '.jps-tangan-q');
    /* semua jejak berakhir bersama timeline: RESUME tidak pernah memulai
       ulang animasi yang sudah lewat (play() memutar ulang animasi yang
       sudah selesai) */
    var akhir = t0 + 1600;
    function jejak(tl2, el, frames) {
      if (frames[frames.length - 1][0] < akhir) frames = frames.concat([[akhir, {}, 'linear']]);
      jejakDasar(tl2, el, frames);
    }
    jejak(tl, satu(sv, '.jps-kamera'), [[0, { transform: 'translate(0px,4px) scale(.985)' }], [1000, { transform: 'none' }]]);
    if (n === 6) {
      /* pergantian tangan: produk menjadi ringkasan, pertanyaan masuk */
      jejak(tl, satu(sv, '.jps-tangan-p'), [[0, { transform: tf(POS.pTengah), opacity: 1 }], [950, { transform: tf(POS.pRekap), opacity: REDUP_REKAP }]]);
      jejak(tl, tg, [[150, { transform: tf(POS.qLuar), opacity: 0 }], [1050, { transform: tf(POS.qTengah), opacity: 1 }]]);
      jejak(tl, satu(tg, '.jps-gestur'), [[150, { transform: 'rotate(8deg)' }], [1250, { transform: 'rotate(-4deg)' }]]);
    } else if (!produk) {
      /* gestur bertanya: pergelangan sedikit memiring lalu kembali */
      jejak(tl, satu(tg, '.jps-gestur'), [[0, { transform: 'rotate(-4deg)' }], [600, { transform: 'rotate(-8deg)' }], [1600, { transform: 'rotate(-4deg)' }]]);
    } else {
      var miring = [-2.5, -1.2, 0, 1.2, 2.5][k - 1];
      jejak(tl, satu(tg, '.jps-gestur'), [[0, { transform: 'none' }], [550, { transform: 'rotate(' + miring + 'deg) translate(0px,-3px)' }], [1600, { transform: 'none' }]]);
    }
    if (n === 1) {
      /* tangan terbuka → jari lain melipat pelan, jempol yang diangkat */
      [2, 3, 4, 5].forEach(function (j, i) {
        var g = satu(tg, '.jps-j' + j), t = 250 + i * 60;
        jejak(tl, satu(g, '.jps-gerak'), [[t, { transform: 'none' }], [t + 800, { transform: LIPAT }]]);
        jejak(tl, satu(g, '.jps-teduh'), [[t, { opacity: 0 }], [t + 800, { opacity: 0.3 }]]);
      });
    }
    var fj = satu(tg, '.jps-j' + k), jempol = k === 1;
    jejak(tl, satu(fj, '.jps-gerak'), [[t0 + 300, { transform: n === 1 ? 'none' : (jempol ? LIPAT_JEMPOL : LIPAT) }], [t0 + 1100, { transform: jempol ? ANGKAT_JEMPOL : ANGKAT }, PEGAS]]);
    jejak(tl, satu(fj, '.jps-teduh'), [[t0 + 300, { opacity: n === 1 ? 0 : 0.3 }], [t0 + 900, { opacity: 0 }]]);
    jejak(tl, satu(fj, '.jps-sinar'), [[t0 + 700, { opacity: 0 }], [t0 + 1300, { opacity: 1 }]]);
    jejak(tl, satu(fj, '.jps-lencana'), [[t0 + 900, { opacity: 0 }], [t0 + 1300, { opacity: 1 }]]);
    jejak(tl, satu(sv, '.jps-chip-isi'), [[t0 + 1000, { opacity: 0, transform: 'translate(0px,6px)' }], [t0 + 1500, { opacity: 1, transform: 'none' }]]);
    jejak(tl, satu(stage, '.jps-ubin-fokus .jps-ubin-isi'), [[t0 + 1100, { opacity: 0 }], [t0 + 1500, { opacity: 1 }]]);
    /* ambient halus: napas tangan & cahaya bergeser (berhenti saat jeda) */
    semua(sv, '.jps-napas').forEach(function (el, i) {
      tl.loop(el, [{ transform: 'none' }, { transform: 'translate(0px,-1.6px) rotate(' + (i ? 0.4 : -0.5) + 'deg)' }, { transform: 'none' }], { duration: 5600 + i * 700, easing: 'ease-in-out' });
    });
    tl.loop(satu(sv, '.jps-halo'), [{ transform: 'none' }, { transform: 'translate(6px,-3px)' }, { transform: 'none' }], { duration: 9000, easing: 'ease-in-out' });
  }

  function adegan(opsi) {
    var o = opsi || {};
    var langkah = Array.isArray(o.langkah) ? o.langkah.slice(0, 10) : [];
    o = Object.assign({}, o, { langkah: langkah });
    return langkah.map(function (step, i) {
      var n = i + 1;
      return {
        id: 'jari-' + n,
        fit: true,
        siapDi: 'awal',
        manual: true,
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, step, n);
          tataLabel(stage);
        },
        animate: function (tl, stage) { animasi(tl, stage, n); }
      };
    });
  }

  window.PSGJariStory = { adegan: adegan };
})();
