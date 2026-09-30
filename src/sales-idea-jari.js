/* ============================================================
   Sales Idea — 10 Jari (cerita tangan interaktif)
   ------------------------------------------------------------
   Identitas visual: satu tangan di tengah panggung. 9 langkah:
     1   BAB 1 — satu scene sinematik: pembuka, lalu tangan produk
         menghitung S K C M T (jempol → kelingking) dalam satu PLAY,
         lalu penutup. Tiap ketukan punya fokus, label, dan narasi.
     2–6 BAB 2 — tangan produk menjadi ringkasan, tangan pertanyaan
         (cermin) menghitung lima pertanyaan, satu scene per pertanyaan.
     7–9 BAB 3 — 3 alasan dengan renderer lama (sales-idea.js), hanya
         ditambah narasi dan tombol Narasi.

   Teks panel memakai data `fingers`/`reasons` dan teks fokus renderer
   lama di sales-idea.js; label jari memakai legenda tangan lama.
   Narasi dibacakan narator bersama (window.PSGNarasi). Tidak ada isi
   bisnis baru.

   Keadaan akhir = keadaan CSS statis. Frame awal (OPEN) = keadaan
   sebelum jari diangkat. Gerak dikurangi: cerita tetap diputar oleh
   aksi presenter; hanya gerak dekoratif (ambient, dorongan kamera)
   yang ditiadakan. Satu SVG tanpa <svg> bersarang; semua gerak lewat
   timeline pemutar (Web Animations API), tanpa timer dan listener.
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var PEGAS = 'cubic-bezier(.34,1.3,.5,1)';
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  /* legenda tangan pertanyaan lama (handHtml di sales-idea.js) */
  var TANYA = ['Kebal?', 'Bisa memilih?', 'Tahu kapan?', 'Butuh uang besar?', 'Kantong sendiri / orang lain?'];
  var CUE = 'Gunakan visual ini sebagai alat bantu presentasi. Agen bebas mengembangkan percakapan sesuai respons prospek.';

  /* ---------------- narasi (Bahasa Indonesia) ----------------
     Dasar: dialog presenter & teks di data fingers/reasons (sales-idea.js).
     BAB 1 berupa segmen: pembuka, S, K, C, M, T, penutup — satu segmen
     per ketukan visual. */
  var NARASI_BAB1 = [
    'Kalau kita bicara tentang produk asuransi, ujung-ujungnya bisa kita sederhanakan menjadi lima hal.',
    'Yang pertama adalah sakit kritis, yaitu risiko ketika kita terkena penyakit berat.',
    'Yang kedua adalah kecelakaan. Di sini kita belum membahas nama produk, tetapi memahami risiko yang ingin kita siapkan dan lindungi.',
    'Berikutnya adalah risiko cacat tetap. Kondisi ini bisa terjadi karena kecelakaan maupun penyakit, dan dampaknya bisa membuat kemampuan kita untuk bekerja atau beraktivitas terganggu.',
    'Yang keempat adalah meninggal. Ini juga bagian dari lima ujung kebutuhan perlindungan.',
    'Dan yang kelima adalah tua. Artinya, hidup kita bisa panjang, sementara setelah masa produktif selesai, kebutuhan hidup tetap perlu dibiayai.',
    'Jadi, lima jari pertama: sakit kritis, kecelakaan, cacat, meninggal, dan tua. S, K, C, M, T.'
  ];
  var NARASI_JARI = [
    NARASI_BAB1,
    'Pertanyaan pertama: adakah orang di dunia ini yang kebal terhadap sakit kritis, kecelakaan, cacat, meninggal, dan tua? Kita tidak kebal.',
    'Pertanyaan kedua: kalau tidak ada yang kebal, apakah kita bisa memilih mau terkena yang mana? Misalnya, Tuhan, jangan kena yang macam-macam, saya sakit gigi saja. Kita tidak bisa memilih.',
    'Pertanyaan ketiga: apakah kita bisa tahu kapan itu terjadi? Misalnya, kalau saya masih muda jangan dulu, nanti saja umur 70 atau 80 tahun. Kita tidak tahu kapan.',
    'Pertanyaan keempat: kalau terkena salah satu dari sakit kritis, kecelakaan, cacat, meninggal, atau tua, kira-kira butuh uang kecil atau uang besar? Risiko besar dapat membutuhkan dana besar.',
    'Pertanyaan kelima: kalau ingin mendapatkan uang besar, maunya pakai kantong sendiri atau kantong orang lain?'
  ];
  var NARASI_ALASAN = [
    'Alasan kenapa orang memiliki asuransi.\n\nPertama adalah bukti nyata. Bukti itu sudah banyak di sekitar kita. Kita sering mendengar teman, keluarga, kenalan, atau tokoh publik mengalami sakit berat atau musibah dan membutuhkan bantuan. Artinya, risiko itu bukan sekadar teori.',
    'Alasan kedua: tidak ada pilihan. Ketika risiko besar terjadi, dana besar tetap harus tersedia. Menabung membutuhkan waktu, sementara musibah tidak menunggu dana terkumpul. Kalau musibah datang sebelum dana cukup, kita bisa terpaksa meminjam, meminta bantuan, atau menjual harta. Jadi pertanyaannya: bagaimana menyiapkan dana besar sebelum risiko terjadi?',
    'Alasan ketiga adalah cinta keluarga. Asuransi dapat diposisikan sebagai salah satu bentuk persiapan, agar keluarga tetap memiliki dukungan finansial ketika kita sudah tidak ada. Kita tentu ingin membahagiakan anak. Pertanyaannya: kita ingin membahagiakan anak selama seumur hidup kita, atau seumur hidup anak kita? Kalau punya kesempatan menyayangi dan membahagiakan anak, kita bisa mempersiapkannya sejak sekarang.'
  ];
  /* Rekaman narasi (manifest voice Bian, bila dimuat): lama satu segmen
     dalam md + jeda kecil, dipakai sebagai batas minimum timeline supaya
     visual tidak selesai sebelum narasinya selesai. 0 = tanpa rekaman. */
  var JEDA_REKAMAN = 300;
  function lamaRekaman(manifest, id) {
    var klip = manifest && manifest.segmen && manifest.segmen[id];
    if (!klip || !klip.length) return 0;
    return Math.round(klip.reduce(function (t, c) { return t + (c.end - c.start); }, 0) * 1000) + JEDA_REKAMAN;
  }
  /* Ketukan BAB 1: durasi tiap ketukan mengikuti perkiraan lama narasinya
     (±70 md per huruf pada kecepatan 0,96) plus jeda, minimal 4,5 detik,
     dan tidak lebih pendek dari rekaman segmennya. */
  var KETUK = (function () {
    var mulai = [], t = 0;
    NARASI_BAB1.forEach(function (seg, j) {
      mulai.push(t);
      t += Math.max(4500, Math.round(seg.length * 70) + 900, lamaRekaman(window.PSGJariAudio, 'S01-' + (j < 9 ? '0' : '') + (j + 1)));
    });
    return { mulai: mulai, akhir: t };
  })();

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
  function kunciProduk(langkah) { return langkah.slice(0, 5).map(function (s) { return s.key; }); }
  function svgPanggung(cx, isi) {
    return '<svg class="jps-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + defs() +
      '<g class="jps-kamera"><ellipse class="jps-halo" cx="' + cx + '" cy="170" rx="176" ry="150" fill="url(#jpsHalo)"/>' + isi + '</g></svg>';
  }
  /* BAB 1: tangan produk dengan kelima jari terhitung (keadaan akhir) dan
     label tiap risiko (tampil bergiliran saat diputar) */
  function panggungBab1(langkah) {
    return svgPanggung(205, tangan('p', POS.pTengah, keadaanJari(6), kunciProduk(langkah)) +
      langkah.slice(0, 5).map(function (s, i) { return label(s.title, ujung(POS.pTengah, JARI[i], 7), arahLabel(i + 1, 1), i + 1); }).join(''));
  }
  /* BAB 2: pertanyaan q — tangan produk sebagai ringkasan, tangan pertanyaan di tengah */
  function panggungTanya(q, langkah) {
    return svgPanggung(220, tangan('p', POS.pRekap, keadaanJari(6), kunciProduk(langkah), REDUP_REKAP) +
      tangan('q', POS.qTengah, keadaanJari(q), ['1', '2', '3', '4', '5']) +
      label(TANYA[q - 1], ujung(POS.qTengah, JARI[q - 1], 7), arahLabel(q, -1), q));
  }
  function ubin(isi, fokus) {
    return '<span class="jps-ubin-deret">' + isi.map(function (x, i) {
      var k = i + 1, kelas = fokus == null ? ' jps-ubin-hitung' : (k < fokus ? ' jps-ubin-hitung' : (k === fokus ? ' jps-ubin-fokus' : ''));
      return '<span class="jps-ubin' + kelas + '" data-k="' + k + '"><i class="jps-ubin-isi"></i><b>' + esc(x) + '</b></span>';
    }).join('') + '</span>';
  }
  function teksLangkah(o, i) { return typeof o.teks === 'function' ? (o.teks(i) || {}) : {}; }
  function kerangkaBab1(o) {
    var produk = o.langkah.slice(0, 5);
    var judul = produk.map(function (s) { return s.title; });
    var inti = teksLangkah(o, 0).supporting;
    return '<div class="jps" data-jps="1" data-ketuk="0">' + (o.header || '') +
      '<div class="jps-body">' +
        '<figure class="jps-stage jps-bab1" role="img" aria-label="' + esc('Ilustrasi tangan: lima jari produk — ' + judul.join(', ')) + '">' +
          '<div class="jps-latar"></div>' + panggungBab1(o.langkah) +
        '</figure>' +
        '<div class="jps-text">' +
          '<div class="jps-ringkas"><span class="jps-ringkas-label">5 JARI PRODUK</span>' + ubin(kunciProduk(o.langkah), null) + '</div>' +
          '<span class="jps-kicker">BAB 1 • JARI PRODUK • 1–5 / 10 JARI</span>' +
          '<h3 class="jps-title">5 Jari Produk</h3>' +
          '<div class="jps-fokus-tumpuk"><p class="jps-focus jps-fk0">' + esc(judul.join(' • ').toUpperCase()) + '</p>' +
            produk.map(function (s, i) { return '<p class="jps-focus jps-fk' + (i + 1) + '" aria-hidden="true">' + esc(teksLangkah(o, i).focus || s.title) + '</p>'; }).join('') +
          '</div>' +
          (inti ? '<div class="jps-inti"><b>Inti yang disampaikan</b><p>' + esc(inti) + '</p></div>' : '') +
          '<p class="jps-cue">' + esc(CUE) + '</p>' +
        '</div>' +
      '</div></div>';
  }
  function kerangkaTanya(o, q) {
    var step = o.langkah[4 + q], n = 5 + q, t = teksLangkah(o, n - 1), kunci = kunciProduk(o.langkah);
    return '<div class="jps" data-jps="' + (q + 1) + '">' + (o.header || '') +
      '<div class="jps-body">' +
        '<figure class="jps-stage jps-s' + n + '" role="img" aria-label="' + esc('Ilustrasi tangan: jari pertanyaan ' + step.q + ' — ' + step.title) + '">' +
          '<div class="jps-latar"></div>' + panggungTanya(q, o.langkah) +
        '</figure>' +
        '<div class="jps-text">' +
          '<div class="jps-ringkas"><span class="jps-ringkas-selesai">' + esc(kunci.join('')) + ' ✓</span>' +
            '<span class="jps-ringkas-label">5 JARI PERTANYAAN</span>' + ubin(['1', '2', '3', '4', '5'], q) + '</div>' +
          '<span class="jps-kicker">BAB 2 • JARI PERTANYAAN ' + esc(step.q) + ' • ' + n + ' / 10 JARI</span>' +
          '<h3 class="jps-title">' + esc(step.title) + '</h3>' +
          (t.focus ? '<p class="jps-focus">' + esc(t.focus) + '</p>' : '') +
          '<p class="jps-isi">' + esc(step.body) + '</p>' +
          (t.supporting ? '<div class="jps-inti"><b>Inti yang disampaikan</b><p>' + esc(t.supporting) + '</p></div>' : '') +
          (q === 5 ? '<div class="jps-lanjut"><b>10 Jari selesai.</b><span>Lanjutkan ke 3 alasan untuk menambahkan unsur emosional.</span></div>' : '') +
          '<p class="jps-cue">' + esc(CUE) + '</p>' +
        '</div>' +
      '</div></div>';
  }

  /* ---------------- gerak ---------------- */
  function gerakDikurangi() { return !!(MQ && MQ.matches); }
  /* jejak yang berakhir bersama timeline scene: RESUME tidak pernah memulai
     ulang animasi yang sudah lewat */
  function penjejak(tl, akhir) {
    return function (el, frames) {
      if (!el) return;
      if (frames[frames.length - 1][0] < akhir) frames = frames.concat([[akhir, {}, 'linear']]);
      jejakDasar(tl, el, frames);
    };
  }
  function ambient(tl, sv) {
    semua(sv, '.jps-napas').forEach(function (el, i) {
      tl.loop(el, [{ transform: 'none' }, { transform: 'translate(0px,-1.6px) rotate(' + (i ? 0.4 : -0.5) + 'deg)' }, { transform: 'none' }], { duration: 5600 + i * 700, easing: 'ease-in-out' });
    });
    tl.loop(satu(sv, '.jps-halo'), [{ transform: 'none' }, { transform: 'translate(6px,-3px)' }, { transform: 'none' }], { duration: 9000, easing: 'ease-in-out' });
  }
  /* BAB 1: satu sekuens sinematik — pembuka, S K C M T, penutup. Tiap
     ketukan berdurasi sesuai panjang narasinya; data-ketuk pada node scene
     memberi tahu narator ketukan mana yang sudah mulai. */
  function animasiBab1(tl, stage) {
    var sv = satu(stage, '.jps-svg'), node = satu(stage, '.jps');
    if (!sv || !node) return;
    var B = KETUK.mulai, jj = penjejak(tl, KETUK.akhir), tg = satu(sv, '.jps-tangan-p');
    if (!gerakDikurangi()) jj(satu(sv, '.jps-kamera'), [[0, { transform: 'translate(0px,4px) scale(.985)' }], [1000, { transform: 'none' }]]);
    /* condong halus ke tiap jari fokus, lalu gestur penutup */
    var g = [[0, { transform: 'none' }]];
    [-2.5, -1.2, 0, 1.2, 2.5].forEach(function (m, i) {
      var t = B[i + 1];
      g.push([t, { transform: 'none' }], [t + 550, { transform: 'rotate(' + m + 'deg) translate(0px,-3px)' }], [t + 1600, { transform: 'none' }]);
    });
    g.push([B[6], { transform: 'none' }], [B[6] + 700, { transform: 'translate(0px,-5px)' }], [B[6] + 1800, { transform: 'none' }]);
    jj(satu(tg, '.jps-gestur'), g);
    /* akhir pembuka: kelima jari melipat pelan, siap dihitung */
    var lipat = B[1] - 1100;
    for (var k = 1; k <= 5; k++) {
      var fj = satu(tg, '.jps-j' + k), t = B[k], t2 = B[k + 1], d = (k - 1) * 70;
      var lip = k === 1 ? LIPAT_JEMPOL : LIPAT, ang = k === 1 ? ANGKAT_JEMPOL : ANGKAT;
      jj(satu(fj, '.jps-gerak'), [[lipat + d, { transform: 'none' }], [lipat + 800 + d, { transform: lip }], [t + 200, { transform: lip }],
        [t + 1000, { transform: ang }, PEGAS], [t2 + 100, { transform: ang }], [t2 + 700, { transform: 'none' }]]);
      jj(satu(fj, '.jps-teduh'), [[lipat + d, { opacity: 0 }], [lipat + 800 + d, { opacity: 0.3 }], [t + 200, { opacity: 0.3 }], [t + 800, { opacity: 0 }],
        [t2 + 100, { opacity: 0 }], [t2 + 700, { opacity: 0.07 }]]);
      jj(satu(fj, '.jps-sinar'), [[t + 600, { opacity: 0 }], [t + 1200, { opacity: 1 }], [t2 + 100, { opacity: 1 }], [t2 + 600, { opacity: 0 }]]);
      jj(satu(fj, '.jps-lencana'), [[t + 800, { opacity: 0 }], [t + 1200, { opacity: 1 }]]);
      jj(satu(sv, '.jps-chip[data-k="' + k + '"] .jps-chip-isi'), [[t + 900, { opacity: 0, transform: 'translate(0px,6px)' }], [t + 1400, { opacity: 1, transform: 'none' }],
        [t2, { opacity: 1 }], [t2 + 400, { opacity: 0 }]]);
      jj(satu(stage, '.jps-ubin[data-k="' + k + '"] .jps-ubin-isi'), [[t + 800, { opacity: 0 }], [t + 1200, { opacity: 0.45 }]]);
      jj(satu(stage, '.jps-ubin[data-k="' + k + '"]'), [[t + 800, { transform: 'none' }], [t + 1050, { transform: 'scale(1.18)' }], [t + 1450, { transform: 'none' }]]);
      jj(satu(stage, '.jps-fk' + k), [[t, { opacity: 0 }], [t + 400, { opacity: 1 }], [t2, { opacity: 1 }], [t2 + 300, { opacity: 0 }]]);
    }
    jj(satu(stage, '.jps-fk0'), [[B[1], { opacity: 1 }], [B[1] + 300, { opacity: 0 }], [B[6], { opacity: 0 }], [B[6] + 400, { opacity: 1 }]]);
    tl.tick(function (t) {
      var n = 0;
      while (n < B.length && B[n] <= t) n++;
      if (node.getAttribute('data-ketuk') !== String(n)) node.setAttribute('data-ketuk', n);
    });
    ambient(tl, sv);
  }
  /* BAB 2: pertanyaan q — Q1 membawa pergantian tangan dari BAB 1 */
  function animasiTanya(tl, stage, q) {
    var sv = satu(stage, '.jps-svg');
    if (!sv) return;
    var t0 = q === 1 ? 800 : 0, jj = penjejak(tl, t0 + 1600), tg = satu(sv, '.jps-tangan-q');
    if (!gerakDikurangi()) jj(satu(sv, '.jps-kamera'), [[0, { transform: 'translate(0px,4px) scale(.985)' }], [1000, { transform: 'none' }]]);
    if (q === 1) {
      /* produk menjadi ringkasan, tangan pertanyaan masuk */
      jj(satu(sv, '.jps-tangan-p'), [[0, { transform: tf(POS.pTengah), opacity: 1 }], [950, { transform: tf(POS.pRekap), opacity: REDUP_REKAP }]]);
      jj(tg, [[150, { transform: tf(POS.qLuar), opacity: 0 }], [1050, { transform: tf(POS.qTengah), opacity: 1 }]]);
      jj(satu(tg, '.jps-gestur'), [[150, { transform: 'rotate(8deg)' }], [1250, { transform: 'rotate(-4deg)' }]]);
    } else {
      /* gestur bertanya: pergelangan sedikit memiring lalu kembali */
      jj(satu(tg, '.jps-gestur'), [[0, { transform: 'rotate(-4deg)' }], [600, { transform: 'rotate(-8deg)' }], [1600, { transform: 'rotate(-4deg)' }]]);
    }
    var fj = satu(tg, '.jps-j' + q), jempol = q === 1;
    jj(satu(fj, '.jps-gerak'), [[t0 + 300, { transform: jempol ? LIPAT_JEMPOL : LIPAT }], [t0 + 1100, { transform: jempol ? ANGKAT_JEMPOL : ANGKAT }, PEGAS]]);
    jj(satu(fj, '.jps-teduh'), [[t0 + 300, { opacity: 0.3 }], [t0 + 900, { opacity: 0 }]]);
    jj(satu(fj, '.jps-sinar'), [[t0 + 700, { opacity: 0 }], [t0 + 1300, { opacity: 1 }]]);
    jj(satu(fj, '.jps-lencana'), [[t0 + 900, { opacity: 0 }], [t0 + 1300, { opacity: 1 }]]);
    jj(satu(sv, '.jps-chip-isi'), [[t0 + 1000, { opacity: 0, transform: 'translate(0px,6px)' }], [t0 + 1500, { opacity: 1, transform: 'none' }]]);
    jj(satu(stage, '.jps-ubin-fokus .jps-ubin-isi'), [[t0 + 1100, { opacity: 0 }], [t0 + 1500, { opacity: 1 }]]);
    ambient(tl, sv);
  }

  /* BAB 3: 3 alasan memakai renderer lama; di sini hanya diberi penanda
     narasi dan tombol Narasi di bilah judulnya */
  function tandaiAlasan(stage, k) {
    var kartu = satu(stage, '.si-presentation-card');
    if (kartu) kartu.setAttribute('data-jps-alasan', k + 1);
    if (!N) return;
    var bar = satu(stage, '.si-presentation-topbar'), tutup = bar ? satu(bar, '.si-close') : null;
    if (tutup && !satu(bar, '[data-kbs-suara]')) {
      tutup.insertAdjacentHTML('beforebegin', N.tombolHtml());
      bar.classList.add('jps-bar-suara');
    }
    N.tandai();
  }

  var N = null;
  /* 9 langkah: BAB 1 (5 risiko, satu scene) · BAB 2 (5 pertanyaan) · BAB 3 (3 alasan) */
  function adegan(opsi) {
    var o = opsi || {};
    var langkah = Array.isArray(o.langkah) ? o.langkah.slice(0, 10) : [];
    o = Object.assign({}, o, { langkah: langkah });
    if (langkah.length < 10) return [];
    N = window.PSGNarasi || null;
    if (N) {
      N.daftar('.jps', 'data-jps', NARASI_JARI, N.rekamanDari ? N.rekamanDari(window.PSGJariAudio, NARASI_JARI) : null);
      N.daftar('[data-jps-alasan]', 'data-jps-alasan', NARASI_ALASAN, N.rekamanDari ? N.rekamanDari(window.PSGJariAlasanAudio, NARASI_ALASAN) : null);
      N.pasang();
      o.header = N.tombol(o.header || '');
    }
    var pada = function (i) { if (typeof o.padaLangkah === 'function') o.padaLangkah(i); };
    var daftar = [{
      id: 'jari-bab1',
      fit: true,
      siapDi: 'awal',
      render: function (stage) { pada(0); stage.innerHTML = kerangkaBab1(o); tataLabel(stage); if (N) N.tandai(); },
      animate: function (tl, stage) { animasiBab1(tl, stage); }
    }];
    [1, 2, 3, 4, 5].forEach(function (q) {
      daftar.push({
        id: 'jari-tanya-' + q,
        fit: true,
        siapDi: 'awal',
        render: function (stage) { pada(4 + q); stage.innerHTML = kerangkaTanya(o, q); tataLabel(stage); if (N) N.tandai(); },
        animate: function (tl, stage) { animasiTanya(tl, stage, q); }
      });
    });
    var a = o.alasan;
    if (a && typeof a.render === 'function') {
      for (var k = 0; k < (a.jumlah || 0); k++) {
        (function (k) {
          daftar.push({
            id: 'jari-alasan-' + (k + 1),
            siapDi: 'akhir',
            render: function (stage) { a.render(stage, k); tandaiAlasan(stage, k); },
            /* alasan 1 (teks final dengan kalimat pembuka): jam scene minimal
               selama rekamannya, supaya timeline tidak selesai sebelum narasi */
            animate: k === 0 ? function (tl, stage) {
              if (typeof a.animate === 'function') a.animate(tl, stage);
              var kartu = satu(stage, '[data-jps-alasan]'), ms = lamaRekaman(window.PSGJariAlasanAudio, 'S01-01');
              if (kartu && ms) tl.add(kartu, [], { duration: ms });
            } : a.animate
          });
        })(k);
      }
    }
    return daftar;
  }

  window.PSGJariStory = { adegan: adegan };
})();
