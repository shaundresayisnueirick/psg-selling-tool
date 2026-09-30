/* ============================================================
   Sales Idea — Bekerja di Singapura (interactive story, V2)
   ------------------------------------------------------------
   Delapan scene mengikuti 8 langkah singapuraSteps di sales-idea.js
   dengan urutan yang sama; judul, fokus, dan isi kartu teks diambil
   dari data itu. "Satu dunia, satu keluarga, satu garis penghasilan":

    1. Leo di Indonesia — blok kota isometrik (rumah & kantor); Leo di
       meja kerjanya; Rp15 JUTA / BULAN; garis penghasilan emas dari
       kantor ke rumah; istri & anak di depan rumah saat senja.
    2. Kesempatan dari atasan — ruang kantor; atasan memanggil, Leo
       bertanya, mempertimbangkan keluarga (foto keluarga di mejanya),
       lalu "Baik, Pak. Saya bersedia." + jabat tangan.
    3. Babak baru — foto keluarga → rumah saat fajar; pamit; peta
       wilayah, pesawat terbang Indonesia → Singapura (garis emas ikut
       membentang); tiba di kantor Singapura.
    4. Penghasilan berubah — tumpukan emas di meja: Rp15 JUTA →
       Rp30–50 JUTA / BULAN, lencana 2–3×; lalu dunia: garis menebal,
       ikon Keluarga, Masa Depan, Aset.
    5. Waktu berjalan — dunia terbelah; denyut bulanan; TAHUN 1 →
       TAHUN 2; anak tumbuh; kebutuhan rumah tangga bertambah.
    6. Bagaimana jika… — kantor Singapura malam; suasana mendingin;
       Leo memudar (kursi kosong); denyut berhenti, garis menjadi
       abu-abu; rumah di Indonesia tetap hangat.
    7. Klimaks — kamera mendekati rumah; kebutuhan muncul satu per satu;
       PENGHASILAN BERHENTI vs KEBUTUHAN TETAP BERJALAN; jeda; perisai
       PERLINDUNGAN menjadi jembatan.
    8. Alasan yang sama — kembali ke Leo hari ini (menelepon keluarga);
       dunia malam, jendela-jendela lain ikut menyala; kerangka perisai
       bergaris putus-putus. Kartu akhir "Mari Kita Hitung"
       (sales-idea-lanjut.js) muncul sesudah scene ini selesai.

   Teknik: satu <svg> per panggung; dunia isometrik digambar langsung
   sebagai SVG berlapis (3 nada per bidang), tokoh 3/4 lokal (Leo, atasan,
   istri, anak) yang sama di semua scene. Kamera = satu grup transform
   per komposisi (push in, pull out, pan) + lapisan parallax jauh/depan.
   Hanya transform & opacity (dan stroke garis) yang dianimasikan lewat
   timeline pemutar (Web Animations); viewBox tidak pernah dianimasikan.
   Render = keadaan akhir (statis, juga untuk gerak dikurangi); animasi
   bergerak dari awal ke keadaan akhir itu. Awal tiap scene = akhir
   scene sebelumnya (match cut), tetapi tiap scene tetap utuh bila
   dibuka langsung.

   Narasi: narator bersama (window.PSGNarasi). Naskah tiap scene berupa
   segmen; tiap segmen punya satu ketukan visual. Lama ketukan =
   maks(kebutuhan gerak, perkiraan lama narasi) + jeda dramatis; "awal"
   = momen visual sebelum segmen pertama, "ekor" = momen visual sesudah
   segmen terakhir. data-ketuk pada node scene memberi tahu narator
   ketukan mana yang sudah mulai.

   Suara: rekaman voice Bian (MP3), bukan suara browser. Klip tiap
   segmen dibaca dari PSGSingapuraAudio (sales-idea-singapura-audio.js)
   dan diputar narator bersama saat ketukan segmennya dimulai; animasi
   tetap menjadi jam utama.

   API: PSGSingapuraStory.adegan({ langkah, header, padaLangkah })
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var LEMBUT = 'cubic-bezier(.45,.05,.3,1)';
  var PEGAS = 'cubic-bezier(.34,1.4,.5,1)';
  var KAMERA = 'cubic-bezier(.5,0,.25,1)';
  var JUMLAH = 8;

  /* teks alternatif panggung (role="img"): isi visual tiap scene */
  var ARIA = [
    'Kota di Indonesia. Leo bekerja di meja kantornya; penghasilan sekitar Rp15 juta per bulan. Garis penghasilan menghubungkan kantor dengan rumah, tempat istri dan anaknya menunggu saat senja.',
    'Ruang kantor. Atasan menawarkan proyek ekspansi ke Singapura. Leo memikirkan keluarganya — foto keluarga di mejanya — lalu menjawab "Baik, Pak. Saya bersedia." dan berjabat tangan.',
    'Leo berpamitan dengan istri dan anaknya di depan rumah, lalu terbang dari Indonesia ke Singapura. Garis penghasilan membentang melintasi laut. Leo tiba di kantor barunya di Singapura.',
    'Tumpukan emas: sekitar Rp15 juta per bulan di Indonesia, sekitar Rp30 sampai 50 juta per bulan di Singapura, sekitar dua sampai tiga kali lipat. Garis penghasilan menebal: keluarga, masa depan, aset.',
    'Singapura dan Indonesia terhubung garis penghasilan yang berdenyut setiap bulan. Tahun pertama, lalu tahun kedua. Anak tumbuh, kebutuhan rumah tangga bertambah.',
    'Kantor Singapura pada malam hari. Suasana mendingin; kursi Leo kosong. Garis penghasilan berhenti dan menjadi abu-abu, sementara rumah di Indonesia tetap hangat.',
    'Rumah keluarga Leo. Rumah, pendidikan, kebutuhan sehari-hari, dan masa depan tetap berjalan. Penghasilan berhenti, kebutuhan tetap berjalan. Perisai perlindungan menjadi jembatan ke rumah.',
    'Leo di Singapura menelepon keluarganya. Garis penghasilan kembali ke rumah; jendela-jendela lain ikut menyala. Kerangka perisai bergaris putus-putus: sudah cukupkah rencana kita?'
  ];
  var CUE = 'Biarkan cerita berjalan, lalu tanyakan kondisi keluarga prospek dengan bahasa sehari-hari.';

  /* Naskah narasi final (disetujui): satu larik segmen per scene, urutan =
     ketukan visual. 27 segmen. Angka ditulis sebagai kata (tanpa digit,
     "Rp", atau "…"): pemecah kalimat narator memotong di tanda titik. */
  var NARASI = [
    ['Ini Leo. Setiap hari, ia bekerja di Indonesia untuk memenuhi kebutuhan keluarganya. Saat ini, penghasilannya sekitar lima belas juta rupiah per bulan.',
      'Di rumah, istri dan anaknya selalu menunggunya pulang. Setiap sore, senyum mereka membuat lelahnya terasa lebih ringan. Merekalah alasan Leo bekerja keras.'],
    ['Suatu hari, atasan Leo memanggilnya ke ruangan. Leo, perusahaan kita sedang ekspansi ke Singapura, dan kami ingin kamu ikut menangani proyek ini di sana.',
      'Leo bertanya, di Singapura, Pak? Atasannya mengangguk. Tanggung jawabnya lebih besar, tapi ini kesempatan baik untuk kariermu.',
      'Leo terdiam sejenak, memikirkan istri dan anaknya. Jauh dari rumah memang tidak mudah, tetapi ini kesempatan untuk memberi mereka kehidupan yang lebih baik.',
      'Leo menarik napas, lalu menjawab dengan mantap. Baik, Pak. Saya bersedia.'],
    ['Tidak lama kemudian, Leo berpamitan dengan istri dan anaknya. Mereka tetap tinggal di Indonesia, sementara Leo berangkat ke Singapura untuk bekerja.',
      'Leo meninggalkan rutinitas lamanya. Kini ia bekerja di Singapura, memulai babak baru dengan tanggung jawab yang lebih besar.'],
    ['Di Indonesia, Leo sebelumnya berpenghasilan sekitar lima belas juta rupiah per bulan.',
      'Setelah bekerja di Singapura, penghasilannya meningkat menjadi sekitar tiga puluh sampai lima puluh juta rupiah per bulan.',
      'Artinya, sekitar dua sampai tiga kali lipat dari penghasilannya sebelumnya.',
      'Bagi Leo, ini bukan sekadar angka. Ini berarti lebih banyak ruang untuk membantu keluarganya, menyiapkan masa depan, dan mulai membangun aset.'],
    ['Bulan demi bulan berlalu, dan setiap bulan, penghasilan Leo mengalir untuk keluarganya di rumah.',
      'Satu tahun berlalu. Lalu tahun kedua.',
      'Anaknya tumbuh, sekolahnya berlanjut, dan kebutuhan rumah tangga datang setiap bulan. Penghasilan Leo meningkat, tetapi tanggung jawabnya juga bertambah.'],
    ['Sekarang, mari kita bayangkan sesuatu yang berbeda.',
      'Bagaimana jika suatu hari Leo tidak lagi bisa bekerja?',
      'Bukan karena ia ingin berhenti, tetapi karena sebuah risiko membuat penghasilannya terhenti.',
      'Kiriman setiap bulan tidak lagi datang. Tetapi di rumah, keluarganya masih menjalani hari seperti biasa.'],
    ['Di rumah, kehidupan keluarga Leo tetap berjalan. Rumah tetap perlu dijaga, pendidikan anak tetap berlanjut, kebutuhan sehari-hari tetap datang, dan masa depan tetap perlu disiapkan.',
      'Ketika penghasilan berhenti, kebutuhan keluarga tidak ikut berhenti.',
      'Karena itu, bagi siapa pun yang bekerja jauh dari rumah demi keluarganya, pertanyaannya bukan hanya bagaimana mendapatkan penghasilan yang lebih besar.',
      'Tetapi bagaimana memastikan keluarga tetap memiliki perlindungan, ketika penghasilan itu suatu hari berhenti.'],
    ['Kembali ke Leo hari ini. Ia masih bekerja di Singapura, dan malam ini, seperti biasa, ia menelepon keluarganya.',
      'Leo bekerja jauh dari rumah karena ingin memberikan kehidupan yang lebih baik untuk keluarganya.',
      'Dan mungkin, kita juga punya alasan yang sama.',
      'Sekarang, mari kita lihat, sudah cukupkah rencana kita untuk melindungi keluarga?']
  ];

  /* Perkiraan lama bicara (kecepatan 0,96): 80 md per huruf dari teks yang
     diucapkan, +300 md tiap pergantian kalimat, +900 md jeda segmen — sama
     dengan Education dan Asset Creation. */
  var MD_HURUF = 80, JEDA_KALIMAT = 300, JEDA_SEGMEN = 900, JEDA_UCAP = 80;
  function lamaBicara(t) {
    var kalimat = (String(t).match(/[.!?…](\s|$)/g) || []).length;
    return Math.round(String(t).length * MD_HURUF) + kalimat * JEDA_KALIMAT;
  }
  function lamaSegmen(t) { return lamaBicara(t) + JEDA_SEGMEN; }

  /* ---------------- utilitas ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function f(v) { return Math.round(v * 100) / 100; }
  function satu(st, sel) { return st ? st.querySelector(sel) : null; }
  function semua(st, sel) { return st ? Array.prototype.slice.call(st.querySelectorAll(sel)) : []; }

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
  function urut(frames) {
    /* frame berurutan & tidak mundur (ketukan bisa berdempetan) */
    var t = 0;
    return frames.map(function (fr) { t = Math.max(t, fr[0]); return [t, fr[1], fr[2]]; });
  }
  function jejak(tl, el, frames) {
    if (!tl || !el || !frames || !frames.length) return null;
    var j = kunciJejak(urut(frames));
    return tl.add(el, j.kf, { duration: Math.max(1, j.total), easing: 'linear', fill: 'backwards' });
  }
  function muncul(tl, el, t, d, dari) { jejak(tl, el, [[t, { opacity: 0, transform: dari || 'translateY(10px)' }], [t + (d || 520), { opacity: 1, transform: 'none' }]]); }
  function pop(tl, el, t, d) { jejak(tl, el, [[t, { opacity: 0, transform: 'scale(.4)' }], [t + (d || 460), { opacity: 1, transform: 'none' }, PEGAS]]); }
  function pudar(tl, el, t, d) { jejak(tl, el, [[t, { opacity: 0 }], [t + (d || 500), { opacity: 1 }]]); }
  /* garis tergambar: path ber-pathLength="1" */
  function gambarGaris(tl, el, t, d, e) { jejak(tl, el, [[t, { strokeDashoffset: 1 }], [t + d, { strokeDashoffset: 0 }, e || LEMBUT]]); }
  function asal(x, y) { return 'transform-origin:' + f(x) + 'px ' + f(y) + 'px'; }
  function rot(a) { return 'rotate(' + f(a) + 'deg)'; }
  function geser(x, y) { return 'translate(' + f(x) + 'px,' + f(y) + 'px)'; }

  /* kurva kuadrat: titik dan sudut singgung pada t */
  function kurva(p0, c, p1, t) {
    var u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
  }
  function sudut(p0, c, p1, t) {
    var dx = 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
    var dy = 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }
  function dKurva(p0, c, p1) { return 'M' + f(p0[0]) + ' ' + f(p0[1]) + ' Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(p1[0]) + ' ' + f(p1[1]); }
  /* potongan kurva t0..t1 sebagai polyline halus */
  function dPotong(k, t0, t1, n) {
    var d = '';
    for (var i = 0; i <= (n || 16); i++) {
      var p = kurva(k.p0, k.c, k.p1, t0 + (t1 - t0) * i / (n || 16));
      d += (i ? ' L' : 'M') + f(p[0]) + ' ' + f(p[1]);
    }
    return d;
  }
  /* panjang busur kumulatif (0..1) pada parameter t — sinkron garis & pesawat */
  function busur(k, t) {
    var n = 60, total = 0, sampai = 0, prev = k.p0;
    for (var i = 1; i <= n; i++) {
      var p = kurva(k.p0, k.c, k.p1, i / n), l = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      total += l; if (i / n <= t + 1e-9) sampai += l; prev = p;
    }
    return total ? sampai / total : 0;
  }
  function mulus(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------------- isometrik ----------------
     P(o, u, v, z): u ke kanan-atas, v ke kiri-atas, z ke atas (2:1).
     Bidang yang terlihat: u = u0 (kiri, terang), v = v0 (kanan, lebih
     gelap), atas (paling terang) — cahaya utama dari kiri atas. */
  function P(o, u, v, z) { return [o[0] + u - v, o[1] - (u + v) / 2 - (z || 0)]; }
  function jalur(ps) { return 'M' + ps.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join(' L') + ' Z'; }
  function poli(ps, kls, gaya) { return '<path class="' + kls + '" d="' + jalur(ps) + '"' + (gaya ? ' style="' + gaya + '"' : '') + '/>'; }
  function bidU(o, u, v1, v2, z1, z2) { return [P(o, u, v1, z1), P(o, u, v2, z1), P(o, u, v2, z2), P(o, u, v1, z2)]; }
  function bidV(o, v, u1, u2, z1, z2) { return [P(o, u1, v, z1), P(o, u2, v, z1), P(o, u2, v, z2), P(o, u1, v, z2)]; }
  function bidZ(o, z, u1, u2, v1, v2) { return [P(o, u1, v1, z), P(o, u2, v1, z), P(o, u2, v2, z), P(o, u1, v2, z)]; }
  function balok(o, u0, v0, w, d, h, mat, z0) {
    var za = z0 || 0, zb = za + h;
    return poli(bidU(o, u0, v0, v0 + d, za, zb), 'sgs-m-' + mat + '-l') +
      poli(bidV(o, v0, u0, u0 + w, za, zb), 'sgs-m-' + mat + '-r') +
      poli(bidZ(o, zb, u0, u0 + w, v0, v0 + d), 'sgs-m-' + mat + '-a');
  }
  /* atap limas (bubungan sejajar u): sisi depan (kanan) + ujung limas (kiri) */
  function atap(o, u0, v0, w, d, z, rh, e) {
    var u1 = u0 + w, v1 = v0 + d, vm = v0 + d / 2, r1 = u0 + d / 2, r2 = u1 - d / 2;
    var A = P(o, u0 - e, v0 - e, z), B = P(o, u1 + e, v0 - e, z), D = P(o, u0 - e, v1 + e, z);
    var R1 = P(o, r1, vm, z + rh), R2 = P(o, r2, vm, z + rh);
    var garis = '';
    [0.34, 0.67].forEach(function (k) {
      var a = [A[0] + (R1[0] - A[0]) * k, A[1] + (R1[1] - A[1]) * k], b = [B[0] + (R2[0] - B[0]) * k, B[1] + (R2[1] - B[1]) * k];
      garis += 'M' + f(a[0]) + ' ' + f(a[1]) + ' L' + f(b[0]) + ' ' + f(b[1]) + ' ';
    });
    return poli([A, D, R1], 'sgs-m-atap-l') + poli([A, B, R2, R1], 'sgs-m-atap-r') +
      '<path class="sgs-atap-garis" d="' + garis + '"/>' +
      '<path class="sgs-atap-tepi" d="M' + f(D[0]) + ' ' + f(D[1]) + ' L' + f(A[0]) + ' ' + f(A[1]) + ' L' + f(B[0]) + ' ' + f(B[1]) + '"/>';
  }
  /* pulau berbentuk bebas: tepi depan diekstrusi ke bawah setebal h */
  function pulau(o, pts, h, mat) {
    var atas = pts.map(function (q) { return P(o, q[0], q[1], 0); });
    var sisi = '';
    for (var i = 0; i < atas.length; i++) {
      var a = atas[i], b = atas[(i + 1) % atas.length];
      /* bidang tepi terlihat bila normal luarnya menghadap ke bawah layar */
      if (b[0] - a[0] > 0) sisi += poli([a, b, [b[0], b[1] + h], [a[0], a[1] + h]], 'sgs-m-' + mat + '-r');
    }
    return sisi + poli(atas, 'sgs-m-' + mat + '-a');
  }
  /* teks di bidang v tetap (dinding kiri-belakang) */
  function teksBidV(x, y, isi, kls) { return '<g transform="matrix(1,-0.5,0,1,' + f(x) + ',' + f(y) + ')"><text class="sgs-teks ' + kls + '" text-anchor="start">' + esc(isi) + '</text></g>'; }
  /* tanaman pot: pot isometrik + rimbun daun */
  function tanaman(o, u, v, s, z0) {
    var k = s || 1, z = z0 || 0, p = P(o, u + 7 * k, v + 7 * k, z + 16 * k);
    return balok(o, u, v, 14 * k, 14 * k, 14 * k, 'pot', z) + '<g class="sgs-tanaman" transform="translate(' + f(p[0]) + ' ' + f(p[1]) + ') scale(' + k + ')">' +
      '<circle class="sgs-daun-g" cx="-7" cy="-2" r="8"/><circle class="sgs-daun-g" cx="7" cy="-1" r="7.5"/><circle class="sgs-daun" cx="0" cy="-9" r="9"/><circle class="sgs-daun-t" cx="-3" cy="-12" r="3.8"/></g>';
  }
  /* kursi kantor: kaki, dudukan, sandaran (sandaran di sisi belakang, v besar) */
  function kursi(o, u, v, k) {
    var s = k || 1;
    return '<g class="sgs-kursi">' + balok(o, u + 6 * s, v + 6 * s, 4 * s, 4 * s, 12 * s, 'kursi') + balok(o, u, v, 16 * s, 16 * s, 3 * s, 'kursi', 12 * s) +
      balok(o, u, v + 13 * s, 16 * s, 3 * s, 18 * s, 'kursi', 15 * s) + '</g>';
  }
  /* laptop di meja: alas + bagian belakang layar (menghadap pemakai di belakang meja) + cahaya layar */
  function laptop(o, u, v, z, kls) {
    var c = P(o, u + 11, v + 10, z + 18);
    return '<g class="sgs-laptop ' + (kls || '') + '">' + poli(bidZ(o, z + 0.3, u, u + 22, v, v + 12), 'sgs-laptop-alas') +
      '<ellipse class="sgs-laptop-sinar" cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" rx="20" ry="14" fill="url(#sgsDingin)"/>' +
      poli(bidV(o, v + 12, u, u + 22, z, z + 15), 'sgs-laptop-tutup-b') + '<circle class="sgs-laptop-logo" cx="' + f(P(o, u + 11, v + 12, z + 8)[0]) + '" cy="' + f(P(o, u + 11, v + 12, z + 8)[1]) + '" r="1.6"/></g>';
  }

  /* ---------------- teks & label ---------------- */
  function teks(x, y, isi, kelas, anchor) {
    return '<text class="sgs-teks ' + (kelas || '') + '" x="' + f(x) + '" y="' + f(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(isi) + '</text>';
  }
  function kotak(x, y, w, h, kelas, r) {
    return '<rect class="' + (kelas || 'sgs-kartu') + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(r == null ? Math.min(16, h / 2) : r) + '"/>';
  }
  /* pil label berpusat di (cx, cy); lebar dari panjang teks */
  function pil(cx, cy, isi, fs, kelasKotak, kelasTeks, kelasGrup, w) {
    var lebar = w || Math.round(String(isi).length * fs * 0.64 + fs * 1.5), tinggi = fs * 1.9;
    return '<g class="' + (kelasGrup || '') + '" style="' + asal(cx, cy) + '">' + kotak(cx - lebar / 2, cy - tinggi / 2, lebar, tinggi, kelasKotak || 'sgs-pil', tinggi / 2) +
      '<text class="sgs-teks ' + (kelasTeks || 'sgs-teks-1') + '" x="' + f(cx) + '" y="' + f(cy + fs * 0.36) + '" style="font-size:' + fs + 'px">' + esc(isi) + '</text></g>';
  }
  /* gelembung dialog: ujung menunjuk ke (ax, ay) */
  function gelembung(cx, cy, baris, fs, ax, ay, kelasGrup, gaya) {
    var lebar = Math.max.apply(null, baris.map(function (b) { return b.length; })) * fs * 0.6 + fs * 2, tinggi = baris.length * fs * 1.3 + fs * 1.1;
    var x0 = cx - lebar / 2, y0 = cy - tinggi / 2, bx = Math.max(x0 + 14, Math.min(x0 + lebar - 14, ax));
    var ekor = 'M' + f(bx - 8) + ' ' + f(y0 + tinggi - 1) + ' L' + f(ax) + ' ' + f(ay) + ' L' + f(bx + 8) + ' ' + f(y0 + tinggi - 1) + ' Z';
    return '<g class="sgs-gelembung ' + (kelasGrup || '') + '" style="' + asal(ax, ay) + (gaya ? ';' + gaya : '') + '">' +
      '<path class="sgs-gel-ekor" d="' + ekor + '"/>' + kotak(x0, y0, lebar, tinggi, 'sgs-gel', 14) +
      baris.map(function (b, i) { return '<text class="sgs-teks sgs-gel-teks" x="' + f(cx) + '" y="' + f(y0 + fs * 1.25 + i * fs * 1.3) + '" style="font-size:' + fs + 'px">' + esc(b) + '</text>'; }).join('') + '</g>';
  }
  function bendera(x, y, w, kode) {
    var h = w * 2 / 3, isi = '<rect class="sgs-bdr-tepi" x="-1" y="-1" width="' + f(w + 2) + '" height="' + f(h + 2) + '" rx="2"/>' +
      '<rect class="sgs-bdr-merah" width="' + f(w) + '" height="' + f(h / 2) + '"/><rect class="sgs-bdr-putih" y="' + f(h / 2) + '" width="' + f(w) + '" height="' + f(h / 2) + '"/>';
    if (kode === 'SG') {
      isi += '<circle class="sgs-bdr-putih" cx="' + f(w * 0.22) + '" cy="' + f(h * 0.25) + '" r="' + f(h * 0.16) + '"/>' +
        '<circle class="sgs-bdr-merah" cx="' + f(w * 0.27) + '" cy="' + f(h * 0.25) + '" r="' + f(h * 0.15) + '"/>';
    }
    return '<g class="sgs-bendera" transform="translate(' + f(x) + ' ' + f(y) + ')">' + isi + '</g>';
  }
  /* ikon kecil berpusat di (0,0), ukuran ±9 */
  var IKON = {
    rumah: '<path class="sgs-ik-isi" d="M-9 -1 L0 -9 L9 -1 L6.5 -1 L6.5 8 L-6.5 8 L-6.5 -1 Z"/><rect class="sgs-ik-lubang" x="-2.2" y="2" width="4.4" height="6"/>',
    buku: '<path class="sgs-ik-isi" d="M-9 -6 Q-4.5 -8.5 0 -6 Q4.5 -8.5 9 -6 L9 7 Q4.5 4.5 0 7 Q-4.5 4.5 -9 7 Z"/><path class="sgs-ik-garis" d="M0 -6 V7"/>',
    keranjang: '<path class="sgs-ik-garis" d="M-5 -3 L-2 -9 M5 -3 L2 -9"/><path class="sgs-ik-isi" d="M-9 -3 H9 L6.5 8 H-6.5 Z"/><path class="sgs-ik-lubang-g" d="M-3 0 V5 M0 0 V5 M3 0 V5"/>',
    tunas: '<path class="sgs-ik-garis" d="M0 8 V-2"/><path class="sgs-ik-isi" d="M0 -1 Q-9 -2 -8 -9 Q-1 -9 0 -1 Z M0 1 Q8 0 8 -7 Q1 -7 0 1 Z"/>',
    keluarga: '<circle class="sgs-ik-isi" cx="-4" cy="-5" r="3.2"/><circle class="sgs-ik-isi" cx="5" cy="-2" r="2.5"/><path class="sgs-ik-isi" d="M-9 8 Q-9 -1 -4 -1 Q1 -1 1 8 Z M1.5 8 Q1.5 1.5 5 1.5 Q8.5 1.5 8.5 8 Z"/>',
    aset: '<path class="sgs-ik-isi" d="M-8 8 V-2 H-2 V8 Z M-1 8 V-8 H6 V8 Z"/><path class="sgs-ik-lubang-g" d="M1.5 -5 H3.5 M1.5 -2 H3.5 M1.5 1 H3.5 M-5.5 1 H-4.5"/>'
  };
  function ikon(nama, x, y, s, kelas) {
    return '<g class="sgs-ikon-pos" transform="translate(' + f(x) + ' ' + f(y) + ')"><g class="sgs-ikon ' + (kelas || '') + '"><circle class="sgs-ik-lingkar" r="15"/><g transform="scale(' + (s || 1) + ')">' + IKON[nama] + '</g></g></g>';
  }
  /* chip: ikon + label (dipakai scene 7) */
  function chip(x, y, nama, label, kelas) {
    var fs = 14.5, lebar = Math.round(label.length * fs * 0.64) + 46, h = 32;
    return '<g class="sgs-chip-pos" transform="translate(' + f(x) + ' ' + f(y) + ')"><g class="sgs-chip ' + (kelas || '') + '">' +
      kotak(-lebar / 2, -h / 2, lebar, h, 'sgs-chip-kotak', h / 2) +
      '<g transform="translate(' + f(-lebar / 2 + 16) + ' 0) scale(.82)">' + IKON[nama] + '</g>' +
      '<text class="sgs-teks sgs-chip-teks" x="' + f(-lebar / 2 + 30) + '" y="4.6" text-anchor="start" style="font-size:' + fs + 'px">' + esc(label) + '</text>' +
      '</g></g>';
  }
  var PERISAI = 'M0 -24 L19 -17 Q19 6 0 22 Q-19 6 -19 -17 Z';

  /* ---------------- tokoh 3/4 (lokal, konsisten di semua scene) ----------------
     Koordinat lokal: kaki di (0,0), menghadap kanan. Bagian: lengan-b (belakang),
     kaki-b, kaki-d, badan (+ kepala), lengan-d (depan). Poros tiap bagian
     dipasang sebagai transform-origin lokal. */
  var TOKOH = {
    leo: { tipe: 'pria', L: 56, T: 42, hw: 16, kx: 11.5, ky: 13, rambut: 'pendek', atas: 'jas', bawah: 'celana', dasi: true },
    bos: { tipe: 'pria', L: 56, T: 43, hw: 17.5, kx: 11.8, ky: 13, rambut: 'uban', atas: 'jas', bawah: 'celana', dasi: true, kacamata: true },
    istri: { tipe: 'wanita', L: 52, T: 38, hw: 14, kx: 11, ky: 12.5, rambut: 'panjang', atas: 'blus', bawah: 'rok' },
    anak: { tipe: 'anak', L: 30, T: 26, hw: 11, kx: 10.5, ky: 11.2, rambut: 'pendek', atas: 'seragam', bawah: 'pendek', dasi: true },
    anakBesar: { tipe: 'anak', L: 38, T: 31, hw: 12.5, kx: 10.8, ky: 11.6, rambut: 'pendek', atas: 'seragam', bawah: 'pendek', dasi: true }
  };
  function tokohSVG(nama, ops) {
    var op = ops || {}, c = TOKOH[nama], anak = c.tipe === 'anak', L = c.L, T = c.T, hw = c.hw;
    var hip = -L, sh = hip - T, leher = anak ? 3 : 5, hx = 3, hc = sh - leher - c.ky + 3;
    var lw = anak ? 8 : 10, aw = anak ? 6.5 : 8, al = anak ? 25 : (c.tipe === 'wanita' ? 36 : 40);
    var kb = -4, kd = 5, sb = -hw + 3, sd = hw - 1;
    function kaki(x, gelap) {
      var s = '<g class="ak-kaki-' + (gelap ? 'b' : 'd') + '" style="' + asal(x, hip) + '">';
      var x0 = x - lw / 2, x1 = x + lw / 2;
      if (c.bawah === 'celana') s += '<path class="ak-bawah' + (gelap ? '-g' : '') + '" d="M' + f(x0) + ' ' + f(hip - 2) + ' H' + f(x1) + ' L' + f(x1 - 0.8) + ' -5 H' + f(x0 + 0.8) + ' Z"/>';
      else if (c.bawah === 'pendek') s += '<path class="ak-kulit' + (gelap ? '-g' : '') + '" d="M' + f(x0 + 1) + ' ' + f(hip) + ' H' + f(x1 - 1) + ' L' + f(x1 - 1.5) + ' -5 H' + f(x0 + 1.5) + ' Z"/>' +
        '<rect class="ak-kaos-kaki" x="' + f(x0 + 1.3) + '" y="-10" width="' + f(lw - 2.6) + '" height="5.5"/>' +
        '<path class="ak-bawah' + (gelap ? '-g' : '') + '" d="M' + f(x0 - 0.5) + ' ' + f(hip - 2) + ' H' + f(x1 + 0.5) + ' L' + f(x1 + 0.5) + ' ' + f(hip + L * 0.42) + ' H' + f(x0 - 0.5) + ' Z"/>';
      else s += '<path class="ak-kulit' + (gelap ? '-g' : '') + '" d="M' + f(x0 + 1) + ' ' + f(hip) + ' H' + f(x1 - 1) + ' L' + f(x1 - 1.6) + ' -5 H' + f(x0 + 1.6) + ' Z"/>';
      s += '<path class="ak-sepatu" d="M' + f(x0) + ' -6 H' + f(x1 - 1) + ' Q' + f(x1 + 6) + ' -6 ' + f(x1 + 6.5) + ' -1 V0 H' + f(x0) + ' Z"/>';
      return s + '</g>';
    }
    function lengan(x, gelap) {
      var cls = gelap ? 'ak-atas-g' : 'ak-atas', y0 = sh + 1, y1 = sh + al;
      var s = '<g class="ak-lengan-' + (gelap ? 'b' : 'd') + '" style="' + asal(x, sh + 3) + '">';
      var lengkap = 'M' + f(x - aw / 2) + ' ' + f(y0 + 2) + ' Q' + f(x) + ' ' + f(y0 - 3) + ' ' + f(x + aw / 2) + ' ' + f(y0 + 2) +
        ' L' + f(x + aw / 2 - 0.6) + ' ' + f(y1 - 4) + ' Q' + f(x) + ' ' + f(y1 - 1) + ' ' + f(x - aw / 2 + 0.6) + ' ' + f(y1 - 4) + ' Z';
      if (c.atas === 'seragam' || c.atas === 'blus') {
        /* lengan pendek: kain di atas, kulit di bawah */
        s += '<path class="ak-kulit' + (gelap ? '-g' : '') + '" d="' + lengkap + '"/>';
        s += '<path class="' + (c.atas === 'seragam' ? 'ak-seragam' + (gelap ? '-g' : '') : cls) + '" d="M' + f(x - aw / 2 - 0.6) + ' ' + f(y0 + 2) + ' Q' + f(x) + ' ' + f(y0 - 3.5) + ' ' + f(x + aw / 2 + 0.6) + ' ' + f(y0 + 2) + ' L' + f(x + aw / 2 + 0.4) + ' ' + f(y0 + al * 0.42) + ' H' + f(x - aw / 2 - 0.4) + ' Z"/>';
      } else {
        s += '<path class="' + cls + '" d="' + lengkap + '"/>';
        s += '<rect class="ak-kemeja" x="' + f(x - aw / 2 + 0.8) + '" y="' + f(y1 - 5.5) + '" width="' + f(aw - 1.6) + '" height="2.4" rx="1"/>';
      }
      if (!gelap && op.hp) s += '<rect class="sgs-hp" x="' + f(x - 2) + '" y="' + f(y1 - 2) + '" width="9" height="13" rx="1.6"/><rect class="sgs-hp-layar" x="' + f(x - 1) + '" y="' + f(y1 - 1) + '" width="7" height="10" rx="1"/>';
      s += '<circle class="ak-kulit' + (gelap ? '-g' : '') + '" cx="' + f(x) + '" cy="' + f(y1) + '" r="' + f(aw * 0.52) + '"/>';
      return s + '</g>';
    }
    /* badan */
    var badan = '<g class="ak-badan" style="' + asal(0, hip) + '">';
    if (c.bawah === 'rok') badan += '<path class="ak-bawah" d="M' + f(-hw + 1) + ' ' + f(hip - 3) + ' H' + f(hw) + ' L' + f(hw + 5) + ' ' + f(hip + L * 0.62) + ' Q0 ' + f(hip + L * 0.68) + ' ' + f(-hw - 3) + ' ' + f(hip + L * 0.62) + ' Z"/>' +
      '<path class="ak-bawah-g" d="M' + f(-hw + 1) + ' ' + f(hip - 3) + ' H' + f(-hw + 6) + ' L' + f(-hw + 3) + ' ' + f(hip + L * 0.64) + ' Q' + f(-hw) + ' ' + f(hip + L * 0.64) + ' ' + f(-hw - 3) + ' ' + f(hip + L * 0.62) + ' Z"/>';
    var torso = 'M' + f(-hw) + ' ' + f(sh + 4) + ' Q' + f(-hw + 1) + ' ' + f(sh - 1) + ' ' + f(-hw + 6) + ' ' + f(sh - 2) + ' L' + f(hw - 4) + ' ' + f(sh - 2) + ' Q' + f(hw + 0.5) + ' ' + f(sh - 1) + ' ' + f(hw + 1) + ' ' + f(sh + 4) +
      ' L' + f(hw + (c.atas === 'blus' ? 0 : 1)) + ' ' + f(hip + 3) + ' L' + f(-hw + (c.atas === 'blus' ? 1 : 0)) + ' ' + f(hip + 3) + ' Z';
    var sisi = 'M' + f(-hw) + ' ' + f(sh + 4) + ' L' + f(-hw + 5) + ' ' + f(sh + 1) + ' L' + f(-hw + 5) + ' ' + f(hip + 3) + ' L' + f(-hw) + ' ' + f(hip + 3) + ' Z';
    var baju = c.atas === 'seragam' ? 'ak-seragam' : 'ak-atas';
    badan += '<path class="' + baju + '" d="' + torso + '"/><path class="' + baju + '-g" d="' + sisi + '"/>';
    if (c.atas === 'jas') {
      badan += '<path class="ak-kemeja" d="M1.5 ' + f(sh - 2) + ' L9.5 ' + f(sh - 2) + ' L5.5 ' + f(sh + 15) + ' Z"/>';
      if (c.dasi) badan += '<path class="ak-dasi" d="M4.6 ' + f(sh - 1) + ' H6.4 L7.4 ' + f(sh + 12) + ' L5.5 ' + f(sh + 15.5) + ' L3.6 ' + f(sh + 12) + ' Z"/>';
      badan += '<path class="ak-kerah" d="M1.5 ' + f(sh - 2) + ' L5.5 ' + f(sh + 15) + ' L9.5 ' + f(sh - 2) + '"/>' +
        '<circle class="ak-kancing" cx="6.5" cy="' + f(sh + 21) + '" r="0.9"/><circle class="ak-kancing" cx="6.5" cy="' + f(sh + 28) + '" r="0.9"/>';
    } else if (c.atas === 'seragam') {
      badan += '<path class="ak-kerah-putih" d="M0.5 ' + f(sh - 2) + ' L5.5 ' + f(sh + 4) + ' L10.5 ' + f(sh - 2) + ' L7 ' + f(sh + 1) + ' L5.5 ' + f(sh + 5) + ' L4 ' + f(sh + 1) + ' Z"/>';
      if (c.dasi) badan += '<path class="ak-dasi" d="M4.6 ' + f(sh + 1.5) + ' H6.4 L7 ' + f(sh + 9) + ' L5.5 ' + f(sh + 11) + ' L4 ' + f(sh + 9) + ' Z"/>';
      badan += '<rect class="ak-sabuk" x="' + f(-hw + 0.5) + '" y="' + f(hip - 1) + '" width="' + f(2 * hw) + '" height="2.2"/>';
    } else if (c.atas === 'blus') {
      badan += '<path class="ak-kulit" d="M1 ' + f(sh - 2) + ' Q5.5 ' + f(sh + 6) + ' 10 ' + f(sh - 2) + ' Z"/>' +
        '<path class="ak-atas-g" d="M' + f(-hw + 1) + ' ' + f(hip - 5) + ' H' + f(hw) + ' V' + f(hip - 3) + ' H' + f(-hw + 1) + ' Z"/>';
    }
    /* leher + kepala */
    badan += '<rect class="ak-kulit-g" x="' + f(hx - 3.5) + '" y="' + f(sh - leher - 2) + '" width="8" height="' + f(leher + 3) + '" rx="2"/>';
    var kp = '<g class="ak-kepala" style="' + asal(hx, sh - 1) + '">';
    if (c.rambut === 'panjang') kp += '<path class="ak-rambut" d="M' + f(hx - c.kx - 1) + ' ' + f(hc - 3) + ' Q' + f(hx - c.kx - 4) + ' ' + f(hc + c.ky + 12) + ' ' + f(hx - 7) + ' ' + f(sh + 11) + ' L' + f(hx + 1) + ' ' + f(sh + 7) + ' Q' + f(hx - 3) + ' ' + f(hc + 4) + ' ' + f(hx + 2) + ' ' + f(hc - 4) + ' Z"/>';
    kp += '<ellipse class="ak-kulit" cx="' + f(hx) + '" cy="' + f(hc) + '" rx="' + c.kx + '" ry="' + c.ky + '"/>' +
      '<ellipse class="ak-kulit-g" cx="' + f(hx - c.kx + 1.6) + '" cy="' + f(hc + 1) + '" rx="2.4" ry="3.4"/>';
    var atasK = hc - c.ky;
    if (c.rambut === 'pendek') kp += '<path class="ak-rambut" d="M' + f(hx - c.kx - 0.6) + ' ' + f(hc + 2) + ' Q' + f(hx - c.kx - 1.5) + ' ' + f(atasK - 3) + ' ' + f(hx + 1) + ' ' + f(atasK - 1.5) + ' Q' + f(hx + c.kx + 1.5) + ' ' + f(atasK) + ' ' + f(hx + c.kx + 0.2) + ' ' + f(hc - 3) +
      ' Q' + f(hx + 4) + ' ' + f(atasK + 3.5) + ' ' + f(hx - 2) + ' ' + f(atasK + 5) + ' Q' + f(hx - c.kx + 3) + ' ' + f(hc - 3) + ' ' + f(hx - c.kx + 2.4) + ' ' + f(hc + 3) + ' Z"/>';
    else if (c.rambut === 'uban') kp += '<path class="ak-rambut" d="M' + f(hx - c.kx - 0.6) + ' ' + f(hc + 3) + ' Q' + f(hx - c.kx - 1.2) + ' ' + f(atasK - 2) + ' ' + f(hx) + ' ' + f(atasK - 1) + ' Q' + f(hx + c.kx) + ' ' + f(atasK) + ' ' + f(hx + c.kx - 0.5) + ' ' + f(hc - 5) +
      ' Q' + f(hx + 3) + ' ' + f(atasK + 2) + ' ' + f(hx - 3) + ' ' + f(atasK + 3.5) + ' Q' + f(hx - c.kx + 3) + ' ' + f(hc - 2) + ' ' + f(hx - c.kx + 2.6) + ' ' + f(hc + 4) + ' Z"/>';
    else kp += '<path class="ak-rambut" d="M' + f(hx - c.kx - 0.8) + ' ' + f(hc + 2) + ' Q' + f(hx - c.kx - 1.5) + ' ' + f(atasK - 3.5) + ' ' + f(hx + 1) + ' ' + f(atasK - 2) + ' Q' + f(hx + c.kx + 2) + ' ' + f(atasK) + ' ' + f(hx + c.kx + 0.6) + ' ' + f(hc - 1) +
      ' Q' + f(hx + 6) + ' ' + f(atasK + 3) + ' ' + f(hx + 1) + ' ' + f(atasK + 4) + ' Q' + f(hx - 4) + ' ' + f(atasK + 5) + ' ' + f(hx - c.kx + 2.6) + ' ' + f(hc + 4) + ' Z"/>';
    var ey = hc + (anak ? 1 : 0), er = anak ? 1.45 : 1.25;
    kp += '<circle class="ak-mata" cx="' + f(hx + 1.6) + '" cy="' + f(ey) + '" r="' + er + '"/><circle class="ak-mata" cx="' + f(hx + 7.6) + '" cy="' + f(ey) + '" r="' + f(er - 0.1) + '"/>' +
      '<path class="ak-garis" d="M' + f(hx - 0.6) + ' ' + f(ey - 3.8) + ' h4 M' + f(hx + 5.8) + ' ' + f(ey - 3.8) + ' h3.6 M' + f(hx + c.kx - 2) + ' ' + f(hc + 0.5) + ' q2.2 2.6 -0.2 3.6 M' + f(hx + 2.6) + ' ' + f(hc + 6) + ' q2.8 2.1 5.6 0"/>';
    if (c.tipe !== 'pria') kp += '<ellipse class="ak-pipi" cx="' + f(hx + 9) + '" cy="' + f(hc + 4) + '" rx="2.2" ry="1.4"/>';
    if (c.kacamata) kp += '<path class="ak-kacamata" d="M' + f(hx - 1.6) + ' ' + f(ey - 2.2) + ' h6.2 v4.4 h-6.2 Z M' + f(hx + 5.2) + ' ' + f(ey - 2.2) + ' h5.2 v4.4 h-5.2 Z M' + f(hx + 4.6) + ' ' + f(ey - 0.6) + ' h0.6 M' + f(hx - 1.6) + ' ' + f(ey - 1.2) + ' L' + f(hx - c.kx + 2.6) + ' ' + f(ey - 0.4) + '"/>';
    kp += '</g>';
    badan += kp + '</g>';
    return '<ellipse class="ak-bayang" cx="3" cy="0" rx="' + (anak ? 14 : 20) + '" ry="' + (anak ? 3.6 : 5) + '"/>' +
      '<g class="ak-tubuh" style="' + asal(0, 0) + '">' + lengan(sb, true) + kaki(kb, true) + kaki(kd, false) + badan + lengan(sd, false) + '</g>';
  }
  /* aktor diletakkan dengan kaki di (x, y), skala s; opsi.kiri = menghadap kiri */
  function aktor(id, nama, x, y, s, opsi) {
    var o = opsi || {};
    return '<g class="sgs-ak sgs-ak-' + nama + ' ' + id + '" transform="translate(' + f(x) + ' ' + f(y) + ')"' + (o.gaya ? ' style="' + o.gaya + '"' : '') + '>' +
      '<g class="ak-gerak"' + (o.gerak ? ' style="transform:' + o.gerak + '"' : '') + '><g transform="scale(' + s + ')">' +
      '<g class="ak-hadap" style="transform-origin:0 0' + (o.kiri ? ';transform:scaleX(-1)' : '') + '">' + tokohSVG(nama, { hp: o.hp }) + (o.tambah || '') + '</g></g></g></g>';
  }
  /* frame ayunan rotate: n putaran di sekitar sudut dasar */
  function ayun(t0, dur, amp, per, dasar, fase) {
    var fr = [], n = Math.max(1, Math.round(dur / per)), b = dasar || 0, ph = fase || 1;
    fr.push([t0, { transform: rot(b) }]);
    for (var i = 0; i < n; i++) {
      var t = t0 + i * per;
      fr.push([t + per * 0.25, { transform: rot(b + amp * ph) }, LEMBUT], [t + per * 0.75, { transform: rot(b - amp * ph) }, LEMBUT]);
    }
    fr.push([t0 + n * per, { transform: rot(b) }, LEMBUT]);
    return fr;
  }
  /* berjalan: ak-gerak dari (dx,dy) ke 0; kaki & lengan berayun; tubuh naik-turun */
  function berjalan(tl, root, t0, dur, dx, dy, lainTubuh) {
    if (!root) return;
    var per = 560;
    jejak(tl, satu(root, '.ak-gerak'), [[t0, { transform: geser(dx, dy) }], [t0 + dur, { transform: 'none' }, 'cubic-bezier(.3,.1,.5,1)']]);
    jejak(tl, satu(root, '.ak-kaki-b'), ayun(t0, dur, 17, per, 0, 1));
    jejak(tl, satu(root, '.ak-kaki-d'), ayun(t0, dur, 17, per, 0, -1));
    jejak(tl, satu(root, '.ak-lengan-b'), ayun(t0, dur, 12, per, 0, -1));
    if (!lainTubuh) {
      var fr = [[t0, { transform: 'none' }]], n = Math.round(dur / (per / 2));
      for (var i = 0; i < n; i++) fr.push([t0 + i * per / 2 + per / 4, { transform: 'translateY(-1.6px)' }, LEMBUT], [t0 + (i + 1) * per / 2, { transform: 'none' }, LEMBUT]);
      jejak(tl, satu(root, '.ak-tubuh'), fr);
    }
  }

  /* ---------------- pemandangan ---------------- */
  function latar(kelas) { return '<rect class="' + kelas + '" x="-700" y="-700" width="1880" height="1760"/>'; }
  function awan(x, y, s, kls) {
    return '<g class="sgs-awan-pos" transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')"><path class="sgs-awan ' + (kls || '') + '" d="M-30 6 Q-32 -6 -18 -6 Q-14 -18 0 -16 Q10 -24 20 -12 Q34 -12 32 6 Z"/></g>';
  }
  function pohon(x, y, s, varian) {
    var g = '<g class="sgs-pohon" transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + (s || 1) + ')">' +
      '<ellipse class="sgs-bayang-isi" cx="4" cy="1" rx="17" ry="5"/>' +
      '<path class="sgs-batang" d="M-2.5 0 L-1.5 -20 H1.5 L2.5 0 Z"/>';
    if (varian === 'palem') g += '<path class="sgs-daun-g" d="M0 -22 Q-16 -30 -24 -18 Q-12 -24 0 -20 Z M0 -22 Q16 -30 24 -18 Q12 -24 0 -20 Z"/><path class="sgs-daun" d="M0 -22 Q-8 -38 -20 -36 Q-8 -32 0 -21 Z M0 -22 Q8 -38 20 -36 Q8 -32 0 -21 Z"/>';
    else g += '<circle class="sgs-daun-g" cx="-6" cy="-24" r="11"/><circle class="sgs-daun-g" cx="7" cy="-22" r="10"/><circle class="sgs-daun" cx="0" cy="-32" r="12"/><circle class="sgs-daun-t" cx="-4" cy="-36" r="5.5"/>';
    return g + '</g>';
  }
  function kotaJauh(x0, y, w, kls, seed) {
    var g = '', x = x0, i = 0, s = seed || 3;
    while (x < x0 + w) {
      s = (s * 9301 + 49297) % 233280;
      var bw = 14 + (s % 16), bh = 18 + ((s >> 3) % 46);
      g += '<rect x="' + f(x) + '" y="' + f(y - bh) + '" width="' + bw + '" height="' + f(bh + 40) + '"/>';
      x += bw + (i % 3 === 0 ? 3 : 1); i++;
    }
    return '<g class="' + kls + '">' + g + '</g>';
  }
  /* rumah keluarga (limasan): dinding, jendela (+ nyala), pintu, atap */
  function rumah(o, u0, v0, w, d, h, rh, kls) {
    var s = '<g class="sgs-rumah ' + (kls || '') + '">' + balok(o, u0 - 2, v0 - 2, w + 4, d + 4, 3, 'pondasi') + balok(o, u0, v0, w, d, h, 'dinding', 3);
    var jR = bidV(o, v0, u0 + 8, u0 + 24, 14, 27), jL = bidU(o, u0, v0 + d * 0.3, v0 + d * 0.62, 14, 27), pintu = bidV(o, v0, u0 + w * 0.55, u0 + w * 0.55 + 12, 3, 26);
    s += poli(jR, 'sgs-jendela') + poli(jL, 'sgs-jendela') + '<g class="sgs-nyala">' + poli(jR, 'sgs-jendela-nyala') + poli(jL, 'sgs-jendela-nyala') + '</g>' +
      poli(pintu, 'sgs-pintu') + atap(o, u0, v0, w, d, h + 3, rh, 5);
    return s + '</g>';
  }
  /* gedung kaca: lantai dan kisi jendela dalam satu path */
  function gedung(o, u0, v0, w, d, h, mat, z0, lantai) {
    var z = z0 || 0, s = balok(o, u0, v0, w, d, h, mat, z), kisi = '', step = lantai || 12;
    for (var zz = z + step; zz < z + h - 2; zz += step) {
      var a = P(o, u0, v0 + d, zz), b = P(o, u0, v0, zz), c = P(o, u0 + w, v0, zz);
      kisi += 'M' + f(a[0]) + ' ' + f(a[1]) + ' L' + f(b[0]) + ' ' + f(b[1]) + ' L' + f(c[0]) + ' ' + f(c[1]) + ' ';
    }
    for (var uu = u0 + 12; uu < u0 + w - 3; uu += 12) { var p = P(o, uu, v0, z), q = P(o, uu, v0, z + h); kisi += 'M' + f(p[0]) + ' ' + f(p[1]) + ' L' + f(q[0]) + ' ' + f(q[1]) + ' '; }
    for (var vv = v0 + 12; vv < v0 + d - 3; vv += 12) { var p2 = P(o, u0, vv, z), q2 = P(o, u0, vv, z + h); kisi += 'M' + f(p2[0]) + ' ' + f(p2[1]) + ' L' + f(q2[0]) + ' ' + f(q2[1]) + ' '; }
    return s + '<path class="sgs-kisi" d="' + kisi + '"/>';
  }
  /* jendela menyala (malam) pada gedung: kotak kecil di bidang kanan */
  function lampuGedung(o, u0, v0, w, z0, h, pola, kls) {
    var d = '', i = 0;
    for (var zz = z0 + 4; zz < z0 + h - 8; zz += 12) {
      for (var uu = u0 + 3; uu < u0 + w - 8; uu += 12) {
        if ((pola >> (i % 12)) & 1) d += jalur(bidV(o, v0, uu, uu + 7, zz, zz + 6)) + ' ';
        i++;
      }
    }
    return '<path class="' + (kls || 'sgs-lampu-gedung') + '" d="' + d + '"/>';
  }
  function menaraSG(o, u0, v0) {
    /* tiga menara + dek (siluet ikonik kota, tanpa merek) */
    var s = '';
    [0, 14, 28].forEach(function (du) { s += balok(o, u0 + du, v0, 9, 12, 70, 'kota'); });
    s += balok(o, u0 - 6, v0 + 1, 50, 10, 3, 'kota2', 70);
    return s;
  }

  /* ---------------- gradien & klip ---------------- */
  function defs() {
    function lin(id, stops, x2, y2) {
      return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' +
        stops.map(function (s) { return '<stop offset="' + s[0] + '" class="' + s[1] + '"/>'; }).join('') + '</linearGradient>';
    }
    function rad(id, cls) { return '<radialGradient id="' + id + '"><stop offset="0" class="' + cls + '" stop-opacity="1"/><stop offset="1" class="' + cls + '" stop-opacity="0"/></radialGradient>'; }
    return '<defs>' +
      lin('sgsPagi', [[0, 'sgs-st-pagi-1'], [0.7, 'sgs-st-pagi-2'], [1, 'sgs-st-pagi-3']]) +
      lin('sgsSenja', [[0, 'sgs-st-senja-1'], [0.6, 'sgs-st-senja-2'], [1, 'sgs-st-senja-3']]) +
      lin('sgsMalam', [[0, 'sgs-st-malam-1'], [1, 'sgs-st-malam-2']]) +
      lin('sgsLaut', [[0, 'sgs-st-laut-1'], [1, 'sgs-st-laut-2']]) +
      lin('sgsEmas', [[0, 'sgs-st-emas-1'], [1, 'sgs-st-emas-2']]) +
      lin('sgsKacaLangit', [[0, 'sgs-st-kl-1'], [1, 'sgs-st-kl-2']]) +
      rad('sgsBayang', 'sgs-st-bayang') + rad('sgsHangat', 'sgs-st-hangat') + rad('sgsCahaya', 'sgs-st-cahaya') + rad('sgsDingin', 'sgs-st-dingin') +
      '<clipPath id="sgsFotoKlip"><rect x="-54" y="-40" width="108" height="80" rx="4"/></clipPath>' +
      '</defs>';
  }

  /* ---------------- kamera & komposisi ----------------
     kam(s, fx, fy): titik dunia (fx, fy) tampil di tengah area inti (240,180)
     pada skala s. Satu grup .sgs-kamera per komposisi; lapisan
     .sgs-plx-jauh bergerak ±45% dan .sgs-plx-depan ±130% dari kamera. */
  function kam(s, fx, fy, ax, ay) { return { s: s, x: (ax == null ? 240 : ax) - 240 - (fx - 240) * s, y: (ay == null ? 180 : ay) - 180 - (fy - 180) * s }; }
  function tfKam(k) { return 'translate(' + f(k.x) + 'px,' + f(k.y) + 'px) scale(' + f(k.s) + ')'; }
  /* posisi layar (area inti) titik dunia p pada kamera k */
  function layar(k, p) { return [240 + (p[0] - 240) * k.s + k.x, 180 + (p[1] - 180) * k.s + k.y]; }
  function komposisi(nama, akhir, isi, gaya) {
    return '<g class="sgs-komp sgs-komp-' + nama + '"' + (gaya ? ' style="' + gaya + '"' : '') + '><g class="sgs-kamera" style="transform-origin:240px 180px;transform:' + tfKam(akhir) + '">' +
      '<g class="sgs-plx-jauh">' + (isi.jauh || '') + '</g><g class="sgs-plx-tengah">' + (isi.tengah || '') + '</g><g class="sgs-plx-depan">' + (isi.depan || '') + '</g>' +
      '</g></g>';
  }
  function kamera(tl, st, nama, frames) {
    var root = satu(st, '.sgs-komp-' + nama);
    if (!root) return;
    var akhir = frames[frames.length - 1][1];
    jejak(tl, satu(root, '.sgs-kamera'), frames.map(function (fr) { return [fr[0], { transform: tfKam(fr[1]) }, fr[2] || KAMERA]; }));
    [['.sgs-plx-jauh', -0.55], ['.sgs-plx-depan', 0.3]].forEach(function (L) {
      var el = satu(root, L[0]);
      if (!el || !el.firstChild) return;
      jejak(tl, el, frames.map(function (fr) {
        return [fr[0], { transform: geser((fr[1].x - akhir.x) * L[1] / fr[1].s, (fr[1].y - akhir.y) * L[1] / fr[1].s) }, fr[2] || KAMERA];
      }));
    });
  }
  function silang(tl, st, nama, frames) { jejak(tl, satu(st, '.sgs-komp-' + nama), frames); }

  /* ================= KOMPOSISI 1: blok kota Indonesia =================
     Pulau-diorama: rumah keluarga (kiri), jalan di depan, gedung kantor
     (kanan) dengan lobi terbuka tempat Leo bekerja. */
  var O1 = [196, 318];
  var C1 = {
    pintuKantor: P(O1, 168, 60, 8), pintuRumah: P(O1, 67, 62, 8),
    leoLobi: P(O1, 190, 90, 0), istri: P(O1, 50, 52, 0), anak: P(O1, 68, 50, 0), leoKoper: P(O1, 96, 46, 0)
  };
  C1.garis = { p0: C1.pintuKantor, c: [250, 142], p1: C1.pintuRumah };
  C1.tengahGaris = kurva(C1.garis.p0, C1.garis.c, C1.garis.p1, 0.5);
  function kompBlok(o) {
    var jauh = '<rect class="sgs-langit ' + (o.langit || 'sgs-langit-pagi') + '" x="-700" y="-700" width="1880" height="1760"/>' +
      (o.senja ? '<rect class="sgs-ovl-senja sgs-langit-senja" x="-700" y="-700" width="1880" height="1760"' + (o.senjaGaya ? ' style="' + o.senjaGaya + '"' : '') + '/>' : '') +
      '<g class="sgs-matahari" style="' + (o.matahariGaya || '') + '"><circle class="sgs-mh-halo" cx="92" cy="74" r="46" fill="url(#sgsCahaya)"/><circle class="sgs-mh" cx="92" cy="74" r="15"/></g>' +
      '<g class="sgs-awan-grup">' + awan(60, 52, 0.9) + awan(330, 34, 1.15) + awan(430, 78, 0.8) + '</g>' +
      kotaJauh(-120, 150, 720, 'sgs-kota-jauh', 7) + kotaJauh(-90, 170, 680, 'sgs-kota-dekat', 13);
    var t = '';
    t += balok(O1, 0, 0, 250, 170, 16, 'tanah', -16);
    t += poli(bidZ(O1, 0.3, 0, 250, 14, 42), 'sgs-jalan');
    var marka = '';
    for (var u = 8; u < 245; u += 22) { var a = P(O1, u, 28, 0.6), b = P(O1, u + 11, 28, 0.6); marka += 'M' + f(a[0]) + ' ' + f(a[1]) + ' L' + f(b[0]) + ' ' + f(b[1]) + ' '; }
    t += '<path class="sgs-marka" d="' + marka + '"/>';
    t += poli(bidZ(O1, 0.4, 0, 250, 42, 50), 'sgs-trotoar');
    /* pohon belakang */
    t += pohon.apply(null, P(O1, 118, 150).concat([0.9])) + pohon.apply(null, P(O1, 20, 150).concat([0.95])) + pohon.apply(null, P(O1, 238, 146).concat([0.8, 'palem']));
    /* kantor: lobi terbuka (belakang → depan) lalu blok atas */
    var H1 = 84, u0 = 150, v0 = 60, w = 72, d = 66, H = 196;
    t += '<g class="sgs-kantor-id">' + poli(bidZ(O1, 0.6, u0, u0 + w, v0, v0 + d), 'sgs-lobi-lantai') +
      poli(bidU(O1, u0 + w, v0, v0 + d, 0, H1), 'sgs-lobi-dinding-r') + poli(bidV(O1, v0 + d, u0, u0 + w, 0, H1), 'sgs-lobi-dinding-l') +
      tanaman(O1, 204, 108, 1.1);
    if (o.leoLobi) t += kursi(O1, 188, 86, 1) + aktor('sgs-leo-lobi', 'leo', C1.leoLobi[0], C1.leoLobi[1], 0.3);
    t += balok(O1, 166, 66, 36, 14, 13, 'meja') + laptop(O1, 174, 68, 13, 'sgs-laptop-lobi');
    t += poli(bidU(O1, u0, v0, v0 + d, 0, H1), 'sgs-kaca-depan') + poli(bidV(O1, v0, u0, u0 + w, 0, H1), 'sgs-kaca-depan') +
      '<path class="sgs-kaca-rangka" d="' + ['M', P(O1, u0, v0, 0), 'L', P(O1, u0, v0, H1), 'M', P(O1, u0 + w / 2, v0, 0), 'L', P(O1, u0 + w / 2, v0, H1), 'M', P(O1, u0, v0 + d / 2, 0), 'L', P(O1, u0, v0 + d / 2, H1)].map(function (x) { return typeof x === 'string' ? x : f(x[0]) + ' ' + f(x[1]); }).join(' ') + '"/>' +
      gedung(O1, u0, v0, w, d, H - H1, 'kaca', H1, 13) + (o.malam ? lampuGedung(O1, u0, v0, w, H1, H - H1, 0x5a3) : '') +
      balok(O1, u0 + 2, v0 + 2, w - 4, d - 4, 4, 'beton', H) + '</g>';
    t += rumah(O1, 24, 64, 70, 58, 32, 26, 'sgs-rumah-leo');
    /* lampu jalan */
    var lj = P(O1, 108, 46, 0);
    t += '<path class="sgs-tiang" d="M' + f(lj[0]) + ' ' + f(lj[1]) + ' V' + f(lj[1] - 40) + ' q0 -4 6 -4"/><circle class="sgs-lampu-jalan" cx="' + f(lj[0] + 7) + '" cy="' + f(lj[1] - 43) + '" r="2.6"/>';
    if (o.keluarga) t += aktor('sgs-istri-blok', 'istri', C1.istri[0], C1.istri[1], 0.34, { gaya: o.keluargaGaya }) + aktor('sgs-anak-blok', 'anak', C1.anak[0], C1.anak[1], 0.34, { gaya: o.keluargaGaya });
    if (o.leoKoper) t += aktor('sgs-leo-koper', 'leo', C1.leoKoper[0], C1.leoKoper[1], 0.34, { tambah: '<g class="sgs-koper-g"><rect class="sgs-koper" x="-26" y="-26" width="14" height="22" rx="2.5"/><path class="sgs-koper-tali" d="M-22 -26 v-4 h6 v4"/></g>' });
    if (o.garis) t += '<g class="sgs-garis-blok"><path class="sgs-garis-emas-halo" d="' + dKurva(C1.garis.p0, C1.garis.c, C1.garis.p1) + '" pathLength="1"/><path class="sgs-garis-emas" d="' + dKurva(C1.garis.p0, C1.garis.c, C1.garis.p1) + '" pathLength="1"/></g>';
    if (o.label) t += '<g class="sgs-label-15-pos" transform="translate(' + f(C1.tengahGaris[0]) + ' ' + f(C1.tengahGaris[1] - 16) + ')"><g class="sgs-label-15">' + pil(0, 0, 'Rp15 JUTA / BULAN', 12, 'sgs-pil-emas', 'sgs-teks-emas') + '</g></g>';
    if (o.senja) t += '<rect class="sgs-ovl-senja sgs-ovl-hangat" x="-700" y="-700" width="1880" height="1760"' + (o.senjaGaya ? ' style="' + o.senjaGaya + '"' : '') + '/>';
    t += '<g class="sgs-semak">' + [[4, 70], [100, 56], [10, 100]].map(function (q) { var p = P(O1, q[0], q[1], 0); return '<ellipse class="sgs-daun-g" cx="' + f(p[0]) + '" cy="' + f(p[1] - 3) + '" rx="9" ry="5"/>'; }).join('') + '</g>' +
      pohon.apply(null, P(O1, 6, 30).concat([1.05])) + pohon.apply(null, P(O1, 246, 10).concat([0.95]));
    var depan = '';
    return { jauh: jauh, tengah: t, depan: depan };
  }

  /* ================= KOMPOSISI 2: ruang kantor Indonesia ================= */
  var O3 = [228, 332];
  var C3 = { bos: P(O3, 190, 104, 0), leoAkhir: P(O3, 168, 126, 0), leoAwal: P(O3, 100, 14, 0), foto: P(O3, 50, 40, 22) };
  function fotoKeluarga(x, y, s, kls) {
    /* foto berbingkai: rumah keluarga + istri & anak (dari sudut yang sama dengan scene 3) */
    var isi = '<rect class="sgs-foto-langit" x="-54" y="-40" width="108" height="80"/>' +
      '<g transform="translate(0 6) scale(.62) translate(-150 -238)">' + rumah(O1, 24, 64, 70, 58, 32, 26, '') +
      aktor('', 'istri', C1.istri[0], C1.istri[1], 0.34) + aktor('', 'anak', C1.anak[0], C1.anak[1], 0.34) + '</g>';
    return '<g class="sgs-foto-pos" transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')"><g class="sgs-foto ' + (kls || '') + '">' +
      '<rect class="sgs-foto-bingkai" x="-60" y="-46" width="120" height="92" rx="6"/>' +
      '<g clip-path="url(#sgsFotoKlip)">' + isi + '</g>' +
      '<rect class="sgs-foto-kilap" x="-54" y="-40" width="108" height="80" rx="4"/></g></g>';
  }
  function kompRuang(o) {
    var H = 104, t = '';
    t += balok(O3, 0, 0, 250, 200, 10, 'lantai-ruang', -10);
    t += poli(bidV(O3, 200, 0, 250, 0, H), 'sgs-dinding-l') + poli(bidU(O3, 250, 0, 200, 0, H), 'sgs-dinding-r');
    /* jendela kota di dinding kanan */
    [[18, 92], [108, 182]].forEach(function (r) {
      t += poli(bidU(O3, 250, r[0], r[1], 22, 94), 'sgs-jendela-kota');
      var gd = '', v = r[0] + 4, s = r[0];
      while (v < r[1] - 6) { s = (s * 37 + 11) % 97; var bw = 8 + s % 9, bh = 24 + (s * 3) % 36; gd += jalur(bidU(O3, 250, v, Math.min(v + bw, r[1] - 3), 22, 22 + bh)) + ' '; v += bw + 3; }
      t += '<path class="sgs-jendela-gedung" d="' + gd + '"/>' + poli(bidU(O3, 250, r[0], r[1], 22, 94), 'sgs-jendela-bingkai');
    });
    /* rak buku & layar dinding */
    t += balok(O3, 24, 186, 52, 14, 70, 'rak');
    [14, 32, 50].forEach(function (z) { t += poli(bidV(O3, 186, 27, 73, z, z + 13), 'sgs-rak-isi'); });
    var L = bidV(O3, 200, 138, 214, 44, 86);
    t += poli(L, 'sgs-layar-tv');
    var tv0 = P(O3, 150, 200, 54), tv1 = P(O3, 200, 200, 74);
    t += '<g class="sgs-layar-peta"><circle class="sgs-layar-titik" cx="' + f(tv0[0]) + '" cy="' + f(tv0[1]) + '" r="3"/><circle class="sgs-layar-titik" cx="' + f(tv1[0]) + '" cy="' + f(tv1[1]) + '" r="3"/>' +
      '<path class="sgs-layar-busur" d="' + dKurva(tv0, [(tv0[0] + tv1[0]) / 2 - 4, Math.min(tv0[1], tv1[1]) - 22], tv1) + '" pathLength="1"/></g>';
    t += teksBidV(P(O3, 144, 200, 80)[0], P(O3, 144, 200, 80)[1], 'SINGAPURA', 'sgs-teks-tv');
    /* area atasan */
    t += kursi(O3, 200, 158, 1.3) + balok(O3, 176, 126, 60, 30, 22, 'meja-gelap') +
      poli(bidZ(O3, 22.2, 196, 214, 138, 150), 'sgs-map-kertas') + tanaman(O3, 226, 140, 0.55, 22);
    t += aktor('sgs-bos', 'bos', C3.bos[0], C3.bos[1], 0.5, { kiri: true, gaya: o.bosGaya });
    t += tanaman(O3, 16, 150, 1.4);
    /* meja Leo (depan) */
    t += kursi(O3, 52, 60, 1.3) + balok(O3, 30, 26, 62, 32, 22, 'meja');
    t += poli(bidV(O3, 50, 62, 82, 22, 36), 'sgs-laptop-layar') + poli(bidV(O3, 49.6, 63, 81, 23, 35), 'sgs-laptop-cahaya') + poli(bidZ(O3, 22.2, 62, 82, 40, 50), 'sgs-laptop-alas');
    t += '<ellipse class="sgs-foto-cahaya" cx="' + f(C3.foto[0]) + '" cy="' + f(C3.foto[1] - 6) + '" rx="30" ry="22" fill="url(#sgsHangat)"/>' +
      fotoKeluarga(C3.foto[0], C3.foto[1] - 7, 0.14, 'sgs-foto-meja');
    t += aktor('sgs-leo-ruang', 'leo', C3.leoAkhir[0], C3.leoAkhir[1], 0.5, { gaya: o.leoGaya, gerak: o.leoGerak });
    t += '<rect class="sgs-redup-ruang" x="-700" y="-700" width="1880" height="1760" style="opacity:0"/>';
    t += '<ellipse class="sgs-sorot-foto" cx="' + f(C3.foto[0]) + '" cy="' + f(C3.foto[1] - 6) + '" rx="34" ry="26" fill="url(#sgsHangat)"/>';
    var jauh = latar('sgs-latar-ruang');
    var depan = '';
    return { jauh: jauh, tengah: t, depan: depan };
  }

  /* ================= KOMPOSISI 3: peta wilayah ================= */
  var O4 = [118, 300], O4S = [356, 128];
  var C4 = { rumah: P(O4, 104, 46, 6), sg: P(O4S, 26, 16, 5) };
  C4.rute = { p0: C4.rumah, c: [168, 118], p1: C4.sg };
  function kompPeta() {
    var jauh = '<rect class="sgs-laut" x="-700" y="-700" width="1880" height="1760" fill="url(#sgsLaut)"/>';
    var ombak = '';
    for (var i = 0; i < 9; i++) { var x = -40 + (i * 73) % 520, y = 30 + (i * 61) % 320; ombak += 'M' + x + ' ' + y + ' q6 -4 12 0 q6 4 12 0 '; }
    jauh += '<path class="sgs-ombak" d="' + ombak + '"/>';
    var t = pulau(O4, [[0, 0], [70, -16], [150, -6], [214, 18], [236, 46], [200, 70], [120, 82], [40, 96], [-10, 64], [-18, 24]], 10, 'pulau') +
      pulau(O4S, [[0, 0], [30, -6], [56, 8], [58, 30], [30, 40], [4, 30]], 8, 'pulau');
    /* hutan & kota kecil */
    [[30, 30], [60, 60], [170, 30], [196, 52], [140, 64]].forEach(function (q) { var p = P(O4, q[0], q[1], 0); t += '<circle class="sgs-daun-g" cx="' + f(p[0]) + '" cy="' + f(p[1] - 4) + '" r="7"/>'; });
    t += '<g transform="translate(' + f(C4.rumah[0]) + ' ' + f(C4.rumah[1]) + ') scale(.34) translate(' + f(-C1.pintuRumah[0]) + ' ' + f(-C1.pintuRumah[1] + 8) + ')">' + rumah(O1, 24, 64, 70, 58, 32, 26, '') + '</g>';
    t += '<g transform="translate(' + f(C4.sg[0] + 10) + ' ' + f(C4.sg[1] + 4) + ') scale(.42)">' + menaraSG([0, 0], -20, -10) + '</g>';
    t += '<g class="sgs-rute"><path class="sgs-rute-titik" d="' + dKurva(C4.rute.p0, C4.rute.c, C4.rute.p1) + '"/>' +
      '<path class="sgs-garis-emas-halo" d="' + dKurva(C4.rute.p0, C4.rute.c, C4.rute.p1) + '" pathLength="1"/><path class="sgs-garis-emas sgs-garis-rute" d="' + dKurva(C4.rute.p0, C4.rute.c, C4.rute.p1) + '" pathLength="1"/></g>';
    t += '<g class="sgs-pin-sg" style="' + asal(C4.sg[0], C4.sg[1]) + '"><circle class="sgs-pin-gel" cx="' + f(C4.sg[0]) + '" cy="' + f(C4.sg[1]) + '" r="12"/><circle class="sgs-pin" cx="' + f(C4.sg[0]) + '" cy="' + f(C4.sg[1]) + '" r="5"/></g>';
    t += '<circle class="sgs-pin" cx="' + f(C4.rumah[0]) + '" cy="' + f(C4.rumah[1]) + '" r="5"/>';
    t += '<g class="sgs-label-peta">' + pil(132, 334, 'INDONESIA', 14.5, 'sgs-pil', 'sgs-teks-2') + bendera(60, 329, 15, 'ID') + pil(412, 70, 'SINGAPURA', 14.5, 'sgs-pil', 'sgs-teks-2') + bendera(340, 65, 15, 'SG') + '</g>';
    t += '<g class="sgs-welcome">' + pil(C4.sg[0], C4.sg[1] + 32, 'WELCOME TO SINGAPORE', 14.5, 'sgs-pil-merah', 'sgs-teks-putih') + '</g>';
    t += '<g class="sgs-bayang-pesawat-pos" style="opacity:0"><g class="sgs-bayang-pesawat"><path class="sgs-bayang-isi" d="' + PESAWAT_D + '"/></g></g>';
    t += '<g class="sgs-pesawat-pos"><g class="sgs-pesawat">' + PESAWAT + '</g></g>';
    var depan = '<g class="sgs-awan-depan">' + awan(40, 190, 1.5, 'sgs-awan-tipis') + awan(420, 250, 1.8, 'sgs-awan-tipis') + awan(250, 40, 1.3, 'sgs-awan-tipis') + '</g>';
    return { jauh: jauh, tengah: t, depan: depan };
  }
  var PESAWAT_D = 'M-20 -2.6 L14 -3.2 C19 -3.2 22.5 -1.6 22.5 0 C22.5 1.6 19 3.2 14 3.2 L-20 2.6 Z M-3 -2.8 L-12 -19 L-6 -19 L8 -2.8 Z M-3 2.8 L-12 19 L-6 19 L8 2.8 Z M-17 -2.6 L-22 -9.5 L-18.5 -9.5 L-11 -2.6 Z M-17 2.6 L-22 9.5 L-18.5 9.5 L-11 2.6 Z';
  var PESAWAT = '<path class="sgs-pesawat-sayap" d="M-3 -2.8 L-12 -19 L-6 -19 L8 -2.8 Z M-3 2.8 L-12 19 L-6 19 L8 2.8 Z M-17 -2.6 L-22 -9.5 L-18.5 -9.5 L-11 -2.6 Z M-17 2.6 L-22 9.5 L-18.5 9.5 L-11 2.6 Z"/>' +
    '<path class="sgs-pesawat-badan" d="M-20 -2.6 L14 -3.2 C19 -3.2 22.5 -1.6 22.5 0 C22.5 1.6 19 3.2 14 3.2 L-20 2.6 Z"/><circle class="sgs-pesawat-kaca" cx="17" cy="-0.6" r="1.6"/>';

  /* ================= KOMPOSISI 4: kantor Singapura (meja di jendela) ================= */
  var O5 = [236, 338];
  var C5 = { leoBerdiri: P(O5, 170, 32, 0), leoDuduk: P(O5, 104, 96, 0), meja: { u: 56, v: 44, w: 94, d: 40, h: 26 } };
  function kompSG(o) {
    var H = 112, t = '', malam = !!o.malam;
    t += balok(O5, 0, 0, 230, 170, 10, 'lantai-sg', -10);
    t += poli(bidV(O5, 170, 0, 230, 0, H), 'sgs-dinding-l');
    /* dinding kaca kanan dengan cakrawala Singapura */
    var kaca = bidU(O5, 230, 8, 166, 8, H - 4);
    t += poli(kaca, malam ? 'sgs-kaca-malam' : 'sgs-kaca-senja');
    var gd = '', v = 12, s = 5;
    while (v < 160) { s = (s * 53 + 17) % 101; var bw = 7 + s % 8, bh = 18 + (s * 7) % 40; gd += jalur(bidU(O5, 230, v, Math.min(v + bw, 162), 8, 8 + bh)) + ' '; v += bw + 2; }
    t += '<path class="sgs-cakrawala" d="' + gd + '"/>';
    /* tiga menara + dek di bidang kaca */
    var mb = '';
    [70, 84, 98].forEach(function (vv) { mb += jalur(bidU(O5, 230, vv, vv + 9, 8, 78)) + ' '; });
    mb += jalur([P(O5, 230, 64, 78), P(O5, 230, 112, 80), P(O5, 230, 112, 84), P(O5, 230, 64, 83)]);
    t += '<path class="sgs-cakrawala-ikon" d="' + mb + '"/>';
    if (malam) t += '<path class="sgs-cakrawala-lampu" d="' + (function () { var d = '', k = 0; for (var vv = 14; vv < 160; vv += 7) for (var zz = 12; zz < 44; zz += 8) { if ((k++ * 7) % 5 === 0) d += jalur(bidU(O5, 230, vv, vv + 2.4, zz, zz + 2.4)) + ' '; } return d; })() + '"/>';
    var rangka = '';
    [8, 48, 88, 128, 166].forEach(function (vv) { var a = P(O5, 230, vv, 8), b = P(O5, 230, vv, H - 4); rangka += 'M' + f(a[0]) + ' ' + f(a[1]) + ' L' + f(b[0]) + ' ' + f(b[1]) + ' '; });
    t += '<path class="sgs-kaca-rangka" d="' + rangka + '"/>' + poli(kaca, 'sgs-jendela-bingkai');
    /* jam dinding & kalender di dinding kiri */
    var jam = P(O5, 60, 170, 84);
    t += '<g transform="matrix(1,-0.5,0,1,' + f(jam[0]) + ',' + f(jam[1]) + ')"><circle class="sgs-jam" r="11"/><g class="sgs-jarum-pos"><path class="sgs-jarum sgs-jarum-panjang" d="M0 0 V-8"/><path class="sgs-jarum sgs-jarum-pendek" d="M0 0 L5 2"/></g><circle class="sgs-jam-pusat" r="1.4"/></g>';
    var kal = P(O5, 100, 170, 90);
    t += '<g transform="matrix(1,-0.5,0,1,' + f(kal[0]) + ',' + f(kal[1]) + ')"><rect class="sgs-kal-badan" width="30" height="28" rx="3"/><rect class="sgs-kal-atas" width="30" height="8" rx="3"/><path class="sgs-kal-garis" d="M5 14 h20 M5 19 h20 M5 24 h14"/></g>';
    t += tanaman(O5, 186, 148, 1.5);
    /* kursi & (Leo duduk) & meja */
    t += kursi(O5, 94, 96, 1.5);
    if (o.leoDuduk) t += aktor('sgs-leo-duduk', 'leo', C5.leoDuduk[0], C5.leoDuduk[1], 0.52, { gaya: o.dudukGaya });
    var M = C5.meja;
    t += balok(O5, M.u, M.v, M.w, M.d, M.h, 'meja-gelap');
    /* laptop */
    t += '<g class="sgs-laptop-buka"' + (o.laptopTutup ? ' style="opacity:0"' : '') + '>' + laptop(O5, 92, 56, 26) + '</g>' +
      '<g class="sgs-laptop-tutup"' + (o.laptopTutup ? '' : ' style="opacity:0"') + '>' + balok(O5, 92, 56, 22, 12, 1.6, 'laptop', 26.2) + '</g>';
    /* lampu meja */
    var lm = P(O5, 136, 74, 26);
    t += '<path class="sgs-tiang" d="M' + f(lm[0]) + ' ' + f(lm[1]) + ' v-20 l-8 -4"/><path class="sgs-kap-lampu" d="M' + f(lm[0] - 14) + ' ' + f(lm[1] - 22) + ' l8 -6 l6 4 z"/>';
    if (malam) t += '<ellipse class="sgs-cahaya-lampu" cx="' + f(lm[0] - 12) + '" cy="' + f(lm[1] - 4) + '" rx="40" ry="18" fill="url(#sgsHangat)"/>';
    if (o.tumpukan) t += tumpukan();
    if (o.leoBerdiri) t += aktor('sgs-leo-sg', 'leo', C5.leoBerdiri[0], C5.leoBerdiri[1], 0.52, { kiri: o.hadapKiri, gaya: o.berdiriGaya, hp: o.telepon });
    t += '<rect class="sgs-ovl-emas" x="-700" y="-700" width="1880" height="1760" style="opacity:0"/>';
    var jauh = latar(malam ? 'sgs-latar-malam' : 'sgs-latar-ruang');
    return { jauh: jauh, tengah: t, depan: '' };
  }
  /* tumpukan emas scene 4 (di permukaan meja): 3 blok Indonesia, 6 + 4 (rentang) Singapura */
  var TB = 9;
  function tumpukan() {
    var M = C5.meja, z = M.h, s = '<g class="sgs-tumpukan">';
    for (var i = 0; i < 3; i++) s += '<g class="sgs-blok sgs-blok-id sgs-blok-id-' + i + '">' + balok(O5, 60, 52, 20, 20, TB - 1, 'emas', z + i * TB) + '</g>';
    for (var j = 0; j < 10; j++) s += '<g class="sgs-blok sgs-blok-sg sgs-blok-sg-' + j + (j >= 6 ? ' sgs-blok-rentang' : '') + '">' + balok(O5, 122, 52, 20, 20, TB - 1, j >= 6 ? 'emas2' : 'emas', z + j * TB) + '</g>';
    var la = P(O5, 60, 72, z + 2 * TB), lb = P(O5, 142, 52, z + 9 * TB);
    s += '<g class="sgs-label-id-15">' + pil(la[0] - 40, la[1], 'Rp15 JUTA / BULAN', 10, 'sgs-pil-emas', 'sgs-teks-emas') + pil(la[0] - 40, la[1] + 22, 'INDONESIA', 10, 'sgs-pil', 'sgs-teks-2') + '</g>';
    s += '<g class="sgs-label-sg-30">' + pil(lb[0] + 50, lb[1], 'Rp30–50 JUTA / BULAN', 10, 'sgs-pil-emas', 'sgs-teks-emas') + pil(lb[0] + 50, lb[1] + 22, 'SINGAPURA', 10, 'sgs-pil', 'sgs-teks-2') + '</g>';
    var bd = P(O5, 101, 62, z + 5 * TB + 4);
    s += '<g class="sgs-lencana" style="' + asal(bd[0], bd[1]) + '"><circle class="sgs-lencana-isi" cx="' + f(bd[0]) + '" cy="' + f(bd[1]) + '" r="17"/><text class="sgs-teks sgs-lencana-teks" x="' + f(bd[0]) + '" y="' + f(bd[1] + 5) + '">2–3×</text></g>';
    return s + '</g>';
  }

  /* ================= KOMPOSISI 5: dunia terbelah (Indonesia ↔ Singapura) ================= */
  var O6A = [150, 334], O6B = [356, 178];
  var C6 = {
    pintu: P(O6A, 76, 44, 6), istri: P(O6A, 60, 34, 0), anak: P(O6A, 78, 32, 0), menaraLeo: P(O6B, 30, 14, 6)
  };
  C6.garis = { p0: C6.menaraLeo, c: [306, 262], p1: C6.pintu };
  C6.tengah = kurva(C6.garis.p0, C6.garis.c, C6.garis.p1, 0.5);
  C6.celah = 0.72;
  function kompDunia(o) {
    var jauh = '<rect class="sgs-laut" x="-700" y="-700" width="1880" height="1760" fill="url(#sgsLaut)"/>' +
      '<rect class="sgs-ovl-malam" x="-700" y="-700" width="1880" height="1760" style="opacity:' + (o.malam ? 1 : 0) + '"/>';
    var ombak = '';
    for (var i = 0; i < 12; i++) { var x = -60 + (i * 83) % 600, y = -30 + (i * 67) % 440; ombak += 'M' + x + ' ' + y + ' q6 -4 12 0 q6 4 12 0 '; }
    jauh += '<path class="sgs-ombak" d="' + ombak + '"/>';
    var t = '';
    /* pulau Singapura */
    t += balok(O6B, 0, 0, 112, 86, 10, 'pulau', -10);
    t += gedung(O6B, 70, 12, 22, 20, 56, 'kota2', 0, 10) + gedung(O6B, 22, 54, 20, 22, 66, 'kota2', 0, 10);
    t += '<g class="sgs-menara-leo">' + gedung(O6B, 18, 10, 26, 26, 84, 'kaca', 0, 10) + '</g>' + menaraSG(O6B, 56, 46);
    t += '<g class="sgs-lampu-sg" style="opacity:' + (o.malam ? 1 : 0) + '">' + lampuGedung(O6B, 18, 10, 26, 0, 84, 0x9b5) + lampuGedung(O6B, 70, 12, 22, 0, 56, 0x6c3) + '</g>';
    var jl = P(O6B, 30, 10, 50);
    t += '<g class="sgs-jendela-leo" style="opacity:' + (o.jendelaLeo == null ? 1 : o.jendelaLeo) + '">' + poli(bidV(O6B, 10, 26, 34, 46, 54), 'sgs-jendela-leo-isi') + '<circle cx="' + f(jl[0]) + '" cy="' + f(jl[1]) + '" r="16" fill="url(#sgsHangat)"/></g>';
    t += pohon.apply(null, P(O6B, 100, 70).concat([0.55, 'palem'])) + pohon.apply(null, P(O6B, 8, 76).concat([0.5]));
    /* pulau Indonesia */
    t += balok(O6A, 0, 0, 150, 118, 12, 'pulau', -12);
    t += poli(bidZ(O6A, 0.3, 4, 146, 4, 114), 'sgs-rumput');
    t += pohon.apply(null, P(O6A, 128, 40).concat([0.7])) + pohon.apply(null, P(O6A, 20, 64).concat([0.66]));
    t += rumah(O6A, 44, 44, 62, 50, 28, 22, 'sgs-rumah-leo');
    t += '<circle class="sgs-rumah-hangat" cx="' + f(P(O6A, 74, 68, 20)[0]) + '" cy="' + f(P(O6A, 74, 68, 20)[1]) + '" r="54" fill="url(#sgsHangat)"/>';
    if (o.uap) { var up = P(O6A, 96, 62, 56); t += '<g class="sgs-uap-pos" transform="translate(' + f(up[0]) + ' ' + f(up[1]) + ')"><path class="sgs-uap" style="opacity:0" d="M0 0 q-5 -6 0 -12 q5 -6 0 -12"/></g>'; }
    t += aktor('sgs-istri-dunia', 'istri', C6.istri[0], C6.istri[1], 0.27) +
      aktor('sgs-anak-kecil', 'anak', C6.anak[0], C6.anak[1], 0.27, { gaya: o.anakKecilGaya }) +
      (o.anakBesar ? aktor('sgs-anak-besar', 'anakBesar', C6.anak[0], C6.anak[1], 0.27, { gaya: o.anakBesarGaya, tambah: o.buku ? '<rect class="sgs-buku-kecil" x="10" y="-52" width="9" height="11" rx="1"/>' : '' }) : '');
    /* garis penghasilan */
    var g = C6.garis, d = dKurva(g.p0, g.c, g.p1);
    t += '<g class="sgs-garis-dunia">';
    if (o.garisAbu) t += '<path class="sgs-garis-abu" d="' + (o.celah ? dPotong(g, 0, C6.celah - 0.06) : d) + '" pathLength="1"/>';
    if (o.celahSisa) t += '<path class="sgs-garis-abu sgs-garis-abu-sisa" d="' + dPotong(g, C6.celah - 0.06, 1) + '" pathLength="1" style="opacity:0"/>';
    t += '<g class="sgs-garis-emas-grup" style="opacity:' + (o.emas === 0 ? 0 : 1) + '"><path class="sgs-garis-emas-halo ' + (o.tebal ? 'sgs-tebal' : '') + '" d="' + d + '" pathLength="1"/><path class="sgs-garis-emas ' + (o.tebal ? 'sgs-tebal' : '') + '" d="' + d + '" pathLength="1"/></g>';
    if (o.denyut) {
      t += '<g class="sgs-denyut-grup">' + [0.2, 0.5, 0.8].map(function (q, i) { var p = kurva(g.p0, g.c, g.p1, q); return '<g class="sgs-denyut-pos sgs-denyut-' + i + '"' + (o.denyutMati ? ' style="opacity:0"' : '') + ' transform="translate(' + f(p[0]) + ' ' + f(p[1]) + ')"><circle class="sgs-denyut-halo" r="9"/><circle class="sgs-denyut" r="3.6"/></g>'; }).join('') + '</g>';
    }
    t += '</g>';
    t += '<g class="sgs-label-dunia">' + bendera(56, 322, 16, 'ID') + teks(80, 337, 'INDONESIA', 'sgs-f16 sgs-teks-2', 'start') + bendera(372, 190, 16, 'SG') + teks(396, 205, 'SINGAPURA', 'sgs-f16 sgs-teks-2', 'start') + '</g>';
    var tg = sudut(g.p0, g.c, g.p1, 0.5) * Math.PI / 180, nb = [Math.sin(tg), -Math.cos(tg)];
    if (o.labelGaris) t += '<g class="sgs-label-garis-pos" transform="translate(' + f(C6.tengah[0] + nb[0] * 40) + ' ' + f(C6.tengah[1] + nb[1] * 40) + ')"><g class="sgs-label-garis">' + pil(0, 0, 'Rp30–50 JUTA / BULAN', 15, 'sgs-pil-emas', 'sgs-teks-emas') + pil(0, 33, '2–3× SEBELUMNYA', 14.5, 'sgs-pil', 'sgs-teks-2') + '</g></g>';
    if (o.ikonManfaat) {
      var ik = [['keluarga', 0.84, 'KELUARGA'], ['tunas', 0.55, 'MASA DEPAN'], ['aset', 0.24, 'ASET']];
      t += '<g class="sgs-manfaat">' + ik.map(function (q, i) {
        var p = kurva(g.p0, g.c, g.p1, q[1]), a = sudut(g.p0, g.c, g.p1, q[1]) * Math.PI / 180, nx = -Math.sin(a), ny = Math.cos(a), x = p[0] + nx * 30, y = p[1] + ny * 30;
        return '<g class="sgs-manfaat-' + i + '" style="' + asal(x, y) + '">' + ikon(q[0], x, y, 0.9, 'sgs-ikon-emas') + teks(x + nx * 28, y + ny * 28 + 5, q[2], 'sgs-f14 sgs-teks-emas') + '</g>';
      }).join('') + '</g>';
    }
    if (o.kalender) t += '<g class="sgs-kal-dunia" style="' + asal(112, 112) + '">' + kotak(70, 86, 84, 56, 'sgs-kal-badan', 8) + '<rect class="sgs-kal-atas" x="70" y="86" width="84" height="15" rx="7"/><rect class="sgs-kal-atas" x="70" y="94" width="84" height="7"/>' +
      '<g class="sgs-kal-1" style="opacity:0">' + teks(112, 130, 'TAHUN 1', 'sgs-f15 sgs-teks-1') + '</g><g class="sgs-kal-2">' + teks(112, 130, 'TAHUN 2', 'sgs-f15 sgs-teks-aksen') + '</g></g>';
    if (o.butuh) t += '<g class="sgs-butuh">' + [['buku', 96, 224], ['rumah', 120, 208], ['keranjang', 72, 240]].map(function (q, i) { return '<g class="sgs-butuh-' + i + '" style="' + asal(q[1], q[2]) + '">' + ikon(q[0], q[1], q[2], 0.8, 'sgs-ikon-hangat') + '</g>'; }).join('') + '</g>';
    if (o.perisai) {
      var ps = kurva(g.p0, g.c, g.p1, C6.celah);
      t += '<g class="sgs-jembatan"><path class="sgs-garis-emas-halo sgs-tebal" d="' + dPotong(g, C6.celah, 1) + '" pathLength="1"/><path class="sgs-garis-emas sgs-tebal sgs-garis-jembatan" d="' + dPotong(g, C6.celah, 1) + '" pathLength="1"/></g>' +
        '<g class="sgs-perisai-pos" transform="translate(' + f(ps[0]) + ' ' + f(ps[1]) + ')"><g class="sgs-perisai-g"><circle class="sgs-perisai-halo" r="34" fill="url(#sgsCahaya)"/><path class="sgs-perisai" d="' + PERISAI + '"/><path class="sgs-perisai-garis" d="M-8 0 l6 6 l11 -12"/></g></g>' +
        '<g class="sgs-label-perisai">' + pil(ps[0], ps[1] + 40, 'PERLINDUNGAN', 14, 'sgs-pil-biru', 'sgs-teks-putih') + '</g>';
    }
    if (o.tetangga) {
      /* keluarga lain: pulau kecil dengan rumah menyala, masing-masing terhubung ke Singapura */
      var pk = [[[392, 316], P(O6B, 96, 20, 30), [470, 240]], [[64, 176], P(O6B, 28, 58, 40), [170, 70]]];
      t += '<g class="sgs-tetangga">' + pk.map(function (q, i) {
        var o2 = q[0], pintu = P(o2, 14, 8, 4);
        return balok(o2, 0, 0, 40, 30, 7, 'pulau', -7) + rumah(o2, 10, 10, 20, 14, 11, 10, '') +
          '<circle class="sgs-rumah-hangat" cx="' + f(P(o2, 20, 16, 10)[0]) + '" cy="' + f(P(o2, 20, 16, 10)[1]) + '" r="22" fill="url(#sgsHangat)"/>' +
          '<path class="sgs-garis-tipis sgs-garis-tipis-' + i + '" d="' + dKurva(q[1], q[2], pintu) + '" pathLength="1"/>';
      }).join('') + '</g>';
    }
    if (o.perisaiRencana) {
      var pr = kurva(g.p0, g.c, g.p1, C6.celah);
      t += '<g class="sgs-rencana-pos" transform="translate(' + f(pr[0]) + ' ' + f(pr[1]) + ')"><g class="sgs-rencana"><path class="sgs-perisai-putus" d="' + PERISAI + '"/><text class="sgs-teks sgs-teks-tanya" y="6">?</text></g></g>';
    }
    return { jauh: jauh, tengah: t, depan: awan(40, 60, 1.2, 'sgs-awan-tipis') + awan(460, 300, 1.4, 'sgs-awan-tipis') };
  }
  /* HUD scene 7: kolom kebutuhan (kiri) dan penghasilan berhenti (kanan atas) — tetap di layar, kamera bergerak di belakangnya */
  var CHIP = [['rumah', 'RUMAH'], ['buku', 'PENDIDIKAN'], ['keranjang', 'SEHARI-HARI'], ['tunas', 'MASA DEPAN']];
  function hudKebutuhan(gaya) {
    return '<g class="sgs-hud sgs-hud-7"' + (gaya ? ' style="' + gaya + '"' : '') + '>' +
      '<g class="sgs-kontras-2">' + pil(128, 24, 'KEBUTUHAN TETAP BERJALAN', 14.5, 'sgs-pil-hangat', 'sgs-teks-hangat') + '</g>' +
      '<g class="sgs-chip-grup">' + CHIP.map(function (c, i) { return '<g class="sgs-chip-' + i + '" style="' + asal(86, 66 + i * 40) + '">' + chip(86, 66 + i * 40, c[0], c[1], 'sgs-chip-hangat') + '</g>'; }).join('') + '</g>' +
      '<g class="sgs-kontras-1">' + pil(370, 24, 'PENGHASILAN BERHENTI', 14.5, 'sgs-pil-abu', 'sgs-teks-abu') + '</g></g>';
  }
  /* denyut bulanan di sepanjang garis (ambient) */
  function alirkan(tl, root, t, durasi) {
    var g = C6.garis, n = 24, kf = [];
    for (var i = 0; i <= n; i++) {
      var tt = i / n, p = kurva(g.p0, g.c, g.p1, tt);
      kf.push({ transform: 'translate(' + f(p[0]) + 'px,' + f(p[1]) + 'px)', opacity: tt < 0.08 ? tt / 0.08 : (tt > 0.92 ? (1 - tt) / 0.08 : 1), offset: tt });
    }
    semua(root, '.sgs-denyut-pos').forEach(function (el, k) {
      tl.loop(el, kf.map(function (x) { return Object.assign({}, x); }), { duration: durasi || 3000, delay: t, iterationStart: k / 3, easing: 'linear', fill: 'none' });
    });
  }
  /* denyut terbatas: berjalan dari t sampai berhenti lalu hilang */
  function denyutSampai(tl, root, t, berhenti, durasi) {
    var g = C6.garis, dur = durasi || 3000;
    semua(root, '.sgs-denyut-pos').forEach(function (el, k) {
      var fr = [], mulai = t - dur * k / 3;
      for (var s = mulai; s < berhenti; s += dur) {
        for (var i = 0; i <= 8; i++) {
          var tt = i / 8, tk = s + dur * tt;
          if (tk < t || tk > berhenti) continue;
          var p = kurva(g.p0, g.c, g.p1, tt);
          fr.push([tk, { transform: 'translate(' + f(p[0]) + 'px,' + f(p[1]) + 'px)', opacity: tt < 0.1 || tt > 0.9 ? 0.3 : 1 }, 'linear']);
        }
      }
      if (!fr.length) return;
      var last = fr[fr.length - 1];
      fr.push([last[0] + 500, { opacity: 0 }]);
      jejak(tl, el, fr);
    });
  }

  /* ================= SCENE ================= */
  var S = [];

  /* ---------- 1. Leo di Indonesia ---------- */
  var K1 = { awal: kam(1.08, 240, 186), luas: kam(1, 240, 180), kantor: kam(2.3, 288, 150), rumah: kam(1.45, 226, 214) };
  S[1] = {
    awal: 2500,
    set: function () {
      return komposisi('blok', K1.rumah, kompBlok({ senja: true, leoLobi: true, keluarga: true, garis: true, label: true, langit: 'sgs-langit-pagi', matahariGaya: 'opacity:0' }));
    },
    animate: function (tl, st, K) {
      kamera(tl, st, 'blok', [[0, K1.awal], [2400, K1.luas], [K.B[0] + 200, K1.luas], [K.B[0] + 3000, K1.kantor], [K.B[1] + 200, K1.kantor], [K.B[1] + 3400, K1.rumah]]);
      var tSore = K.kata(1, 'sore');
      jejak(tl, satu(st, '.sgs-matahari'), [[0, { opacity: 0, transform: 'translateY(26px)' }], [2200, { opacity: 1, transform: 'none' }], [tSore, { opacity: 1, transform: 'none' }], [tSore + 2400, { opacity: 0, transform: 'translate(40px,40px)' }]]);
      semua(st, '.sgs-ovl-senja').forEach(function (el) { jejak(tl, el, [[0, { opacity: 0 }], [tSore, { opacity: 0 }], [tSore + 2600, { opacity: 1 }, LEMBUT]]); });
      jejak(tl, satu(st, '.sgs-rumah-leo .sgs-nyala'), [[0, { opacity: 0 }], [tSore + 1200, { opacity: 0 }], [tSore + 2400, { opacity: 1 }]]);
      tl.loop(satu(st, '.sgs-awan-grup'), [{ transform: 'translateX(-10px)' }, { transform: 'translateX(12px)' }], { duration: 9000, direction: 'alternate', easing: 'ease-in-out' });
      /* Leo mengetik (sampai akhir segmen 1) */
      var leo = satu(st, '.sgs-leo-lobi');
      jejak(tl, satu(leo, '.ak-lengan-d'), ayun(K.B[0], K.B[1] - K.B[0], 5, 420, -18).concat([[K.B[1] + 400, { transform: rot(-18) }]]));
      jejak(tl, satu(leo, '.ak-kepala'), [[K.B[0] + 1200, { transform: 'none' }], [K.B[0] + 1700, { transform: rot(5) }], [K.B[0] + 3400, { transform: rot(5) }], [K.B[0] + 3900, { transform: 'none' }]]);
      /* Rp15 JUTA / BULAN: muncul di dekat Leo, lalu menumpang garis penghasilan */
      var tRp = K.kata(0, 'lima belas') - 150, lbl = satu(st, '.sgs-label-15');
      var dA = [C1.leoLobi[0] + 4 - C1.tengahGaris[0], C1.leoLobi[1] - 58 - (C1.tengahGaris[1] - 16)];
      var tGaris = K.kata(1, 'pulang');
      jejak(tl, lbl, [[0, { opacity: 0, transform: geser(dA[0], dA[1]) + ' scale(.5)' }], [tRp, { opacity: 0, transform: geser(dA[0], dA[1]) + ' scale(.5)' }],
        [tRp + 520, { opacity: 1, transform: geser(dA[0], dA[1]) + ' scale(.72)' }, PEGAS], [tGaris + 300, { opacity: 1, transform: geser(dA[0], dA[1]) + ' scale(.72)' }], [tGaris + 1800, { opacity: 1, transform: 'none' }, LEMBUT]]);
      semua(st, '.sgs-garis-blok path').forEach(function (p) { gambarGaris(tl, p, tGaris, 1800); });
      /* istri & anak menunggu di depan rumah; anak melambai saat "senyum" */
      var tIstri = K.kata(1, 'istri');
      muncul(tl, satu(st, '.sgs-istri-blok'), tIstri, 700, 'translateX(-10px)');
      muncul(tl, satu(st, '.sgs-anak-blok'), tIstri + 250, 700, 'translateX(10px)');
      jejak(tl, satu(st, '.sgs-anak-blok .ak-lengan-d'), [[0, { transform: 'none' }], [K.kata(1, 'senyum') - 200, { transform: 'none' }], [K.kata(1, 'senyum') + 200, { transform: rot(-150) }]]
        .concat(ayun(K.kata(1, 'senyum') + 200, 1800, 14, 450, -150)).concat([[K.kata(1, 'senyum') + 2400, { transform: 'none' }]]));
    }
  };

  /* ---------- 2. Kesempatan dari atasan ---------- */
  var K2 = { blokMasuk: kam(3.4, 296, 188), masuk: kam(1.3, 250, 200), dialog: kam(1.32, 286, 172), akhir: kam(1.45, 276, 190) };
  S[2] = {
    awal: 2300,
    jeda: [0, 0, 1000, 0],
    set: function () {
      return komposisi('blok', K1.rumah, kompBlok({ senja: true, leoLobi: true, keluarga: true, garis: true, label: true, langit: 'sgs-langit-pagi', senjaGaya: 'opacity:0' }), 'opacity:0') +
        komposisi('ruang', K2.akhir, kompRuang({})) + hud2();
    },
    siap: function (st) {
      var leo = satu(st, '.sgs-leo-ruang'), bos = satu(st, '.sgs-bos');
      if (leo) { satu(leo, '.ak-lengan-d').style.transform = rot(-78); satu(leo, '.ak-tubuh').style.transform = 'translateY(-2px) scaleY(1.02)'; }
      if (bos) satu(bos, '.ak-lengan-d').style.transform = rot(-78);
    },
    animate: function (tl, st, K) {
      /* match cut: rumah saat senja → pagi → masuk ke kantor */
      kamera(tl, st, 'blok', [[0, K1.rumah], [500, K1.rumah], [2000, K2.blokMasuk]]);
      semua(st, '.sgs-komp-blok .sgs-ovl-senja').forEach(function (el) { jejak(tl, el, [[0, { opacity: 1 }], [900, { opacity: 0 }, LEMBUT]]); });
      silang(tl, st, 'blok', [[0, { opacity: 1 }], [1500, { opacity: 1 }], [2200, { opacity: 0 }]]);
      silang(tl, st, 'ruang', [[0, { opacity: 0 }], [1500, { opacity: 0 }], [2200, { opacity: 1 }]]);
      kamera(tl, st, 'ruang', [[0, K2.masuk], [1500, K2.masuk], [K.B[0] + 900, K2.dialog], [K.B[2], K2.dialog], [K.B[2] + 2800, K2.akhir]]);
      /* atasan memanggil, menunjuk layar, mengangguk, lalu berjabat tangan */
      var bos = satu(st, '.sgs-bos'), leo = satu(st, '.sgs-leo-ruang');
      var tPanggil = K.kata(0, 'memanggilnya'), tEks = K.kata(0, 'ekspansi'), tJabat = K.kata(3, 'bersedia') + 350;
      jejak(tl, satu(bos, '.ak-lengan-d'), [[0, { transform: 'none' }], [tPanggil - 100, { transform: 'none' }], [tPanggil + 350, { transform: rot(-140) }]]
        .concat(ayun(tPanggil + 350, 1100, 12, 550, -140)).concat([[tPanggil + 1750, { transform: 'none' }], [tEks - 200, { transform: 'none' }], [tEks + 400, { transform: rot(-112) }],
          [tEks + 2600, { transform: rot(-112) }], [tEks + 3200, { transform: 'none' }], [tJabat, { transform: 'none' }], [tJabat + 600, { transform: rot(-78) }]])
        .concat(ayun(tJabat + 600, 1500, 5, 500, -78)));
      jejak(tl, satu(bos, '.ak-kepala'), [[0, { transform: 'none' }], [K.kata(1, 'mengangguk'), { transform: 'none' }], [K.kata(1, 'mengangguk') + 260, { transform: rot(9) }], [K.kata(1, 'mengangguk') + 520, { transform: 'none' }],
        [K.kata(1, 'mengangguk') + 780, { transform: rot(9) }], [K.kata(1, 'mengangguk') + 1040, { transform: 'none' }]]);
      semua(st, '.sgs-layar-peta, .sgs-teks-tv').forEach(function (el) { pudar(tl, el, tEks + 200, 700); });
      gambarGaris(tl, satu(st, '.sgs-layar-busur'), tEks + 500, 1200);
      /* Leo berjalan ke area atasan */
      var dW = [C3.leoAwal[0] - C3.leoAkhir[0], C3.leoAwal[1] - C3.leoAkhir[1]], tJalan = tPanggil + 900, dJalan = 3200;
      berjalan(tl, leo, tJalan, dJalan, dW[0], dW[1], true);
      jejak(tl, satu(leo, '.ak-hadap'), [[0, { transform: 'none' }], [tJalan - 1, { transform: 'none' }], [tJalan, { transform: 'scaleX(-1)' }, 'step-end'], [tJalan + dJalan - 60, { transform: 'scaleX(-1)' }], [tJalan + dJalan, { transform: 'none' }, 'step-end']]);
      var bob = [[tJalan, { transform: 'none' }]];
      for (var i = 0; i < Math.round(dJalan / 280); i++) bob.push([tJalan + i * 280 + 140, { transform: 'translateY(-1.6px)' }, LEMBUT], [tJalan + (i + 1) * 280, { transform: 'none' }, LEMBUT]);
      var tTegak = K.kata(3, 'napas');
      bob.push([tTegak, { transform: 'none' }], [tTegak + 700, { transform: 'translateY(-2px) scaleY(1.02)' }]);
      jejak(tl, satu(leo, '.ak-tubuh'), bob);
      jejak(tl, satu(leo, '.ak-lengan-d'), ayun(tJalan, dJalan, 12, 560, 0, 1).concat([[tJabat, { transform: 'none' }], [tJabat + 600, { transform: rot(-78) }]]).concat(ayun(tJabat + 600, 1500, 5, 500, -78)));
      jejak(tl, satu(leo, '.ak-kepala'), [[0, { transform: 'none' }], [K.B[2] + 300, { transform: 'none' }], [K.B[2] + 1000, { transform: rot(7) }], [K.B[3], { transform: rot(7) }], [K.B[3] + 600, { transform: 'none' }]]);
      /* merenung: ruang meredup, foto keluarga menyala */
      jejak(tl, satu(st, '.sgs-redup-ruang'), [[0, { opacity: 0 }], [K.B[2], { opacity: 0 }], [K.B[2] + 1600, { opacity: 0.42 }], [K.B[3], { opacity: 0.42 }], [K.B[3] + 900, { opacity: 0 }]]);
      jejak(tl, satu(st, '.sgs-sorot-foto'), [[0, { opacity: 0 }], [K.kata(2, 'istri'), { opacity: 0 }], [K.kata(2, 'istri') + 900, { opacity: 1 }]]);
      /* gelembung dialog */
      var gb = satu(st, '.sgs-gel-bos'), gl = satu(st, '.sgs-gel-leo-1'), g2 = satu(st, '.sgs-gel-leo-2');
      var tBos = K.kata(0, 'perusahaan');
      jejak(tl, gb, [[0, { opacity: 0, transform: 'scale(.6)' }], [tBos, { opacity: 0, transform: 'scale(.6)' }], [tBos + 420, { opacity: 1, transform: 'none' }, PEGAS], [K.B[1] - 100, { opacity: 1, transform: 'none' }], [K.B[1] + 300, { opacity: 0, transform: 'none' }]]);
      jejak(tl, gl, [[0, { opacity: 0, transform: 'scale(.6)' }], [K.B[1] + 350, { opacity: 0, transform: 'scale(.6)' }], [K.B[1] + 770, { opacity: 1, transform: 'none' }, PEGAS], [K.B[2] - 200, { opacity: 1, transform: 'none' }], [K.B[2] + 200, { opacity: 0, transform: 'none' }]]);
      var tBaik = K.kata(3, 'Baik');
      jejak(tl, g2, [[0, { opacity: 0, transform: 'scale(.6)' }], [tBaik - 150, { opacity: 0, transform: 'scale(.6)' }], [tBaik + 300, { opacity: 1, transform: 'none' }, PEGAS]]);
    }
  };
  function hud2() {
    var bosL = layar(K2.dialog, [C3.bos[0] - 6, C3.bos[1] - 66]), leoL = layar(K2.dialog, [C3.leoAkhir[0] + 4, C3.leoAkhir[1] - 68]), leoA = layar(K2.akhir, [C3.leoAkhir[0] + 2, C3.leoAkhir[1] - 70]);
    return '<g class="sgs-hud">' +
      gelembung(Math.min(bosL[0] + 36, 392), bosL[1] - 42, ['Proyek ekspansi', 'ke Singapura'], 15, bosL[0], bosL[1], 'sgs-gel-bos', 'opacity:0') +
      gelembung(Math.max(leoL[0] - 40, 96), leoL[1] - 36, ['Di Singapura, Pak?'], 15, leoL[0], leoL[1], 'sgs-gel-leo-1', 'opacity:0') +
      gelembung(Math.max(leoA[0] - 30, 108), Math.max(leoA[1] - 44, 38), ['Baik, Pak.', 'Saya bersedia.'], 16, leoA[0], leoA[1], 'sgs-gel-leo-2') +
      '</g>';
  }

  /* ---------- 3. Babak baru di Singapura ---------- */
  var K3 = { rumah: kam(1.75, 170, 236), rumahLebar: kam(1.5, 186, 230), naik: kam(0.8, 200, 60), peta: kam(1, 240, 190), petaSG: kam(3, C4.sg[0], C4.sg[1]), sgMasuk: kam(1.35, 300, 230), sg: kam(1.12, 282, 214) };
  S[3] = {
    jeda: [5500, 0],
    set: function () {
      return komposisi('blok', K3.naik, kompBlok({ keluarga: true, leoKoper: true, langit: 'sgs-langit-fajar', senja: true, senjaGaya: 'opacity:.35', matahariGaya: 'opacity:.8' }), 'opacity:0') +
        komposisi('peta', K3.petaSG, kompPeta(), 'opacity:0') +
        komposisi('sg', K3.sg, kompSG({ leoBerdiri: true, hadapKiri: false })) +
        '<g class="sgs-hud sgs-foto-awal" style="opacity:0">' + fotoKeluarga(240, 180, 1.9, '') + '</g>';
    },
    animate: function (tl, st, K) {
      /* match cut: foto keluarga → rumah yang sama saat fajar */
      jejak(tl, satu(st, '.sgs-foto-awal'), [[0, { opacity: 1, transform: 'none' }], [300, { opacity: 1, transform: 'none' }], [1500, { opacity: 0, transform: 'scale(1.6)' }, LEMBUT]]);
      satu(st, '.sgs-foto-awal').style.transformOrigin = '240px 180px';
      silang(tl, st, 'blok', [[0, { opacity: 0 }], [300, { opacity: 0 }], [1300, { opacity: 1 }], [K.B[1] - 5200, { opacity: 1 }], [K.B[1] - 4300, { opacity: 0 }]]);
      var tBerangkat = K.kata(0, 'berangkat');
      kamera(tl, st, 'blok', [[0, K3.rumah], [1400, K3.rumah], [tBerangkat - 400, K3.rumahLebar], [K.B[1] - 5400, K3.rumahLebar], [K.B[1] - 4200, K3.naik]]);
      /* pamit: Leo melambai, anak & istri melambai; Leo berjalan ke jalan */
      var leo = satu(st, '.sgs-leo-koper'), tPamit = K.kata(0, 'berpamitan');
      jejak(tl, satu(leo, '.ak-lengan-d'), [[0, { transform: 'none' }], [tPamit, { transform: 'none' }], [tPamit + 400, { transform: rot(-150) }]].concat(ayun(tPamit + 400, 1700, 14, 425, -150)).concat([[tPamit + 2500, { transform: 'none' }]]));
      jejak(tl, satu(st, '.sgs-anak-blok .ak-lengan-d'), [[0, { transform: 'none' }], [tPamit + 300, { transform: 'none' }], [tPamit + 700, { transform: rot(-150) }]].concat(ayun(tPamit + 700, 4200, 14, 420, -150)).concat([[tPamit + 5300, { transform: 'none' }]]));
      jejak(tl, satu(st, '.sgs-istri-blok .ak-lengan-d'), [[0, { transform: 'none' }], [tPamit + 600, { transform: 'none' }], [tPamit + 1000, { transform: rot(-140) }]].concat(ayun(tPamit + 1000, 3400, 10, 480, -140)).concat([[tPamit + 4800, { transform: 'none' }]]));
      /* posisi akhir Leo di blok = di jalan (ke kanan-depan), lalu pudar */
      var tJalan = tBerangkat - 200;
      jejak(tl, satu(leo, '.ak-gerak'), [[0, { transform: 'none', opacity: 1 }], [tJalan, { transform: 'none', opacity: 1 }], [tJalan + 2600, { transform: 'translate(48px,20px)', opacity: 1 }, 'linear'], [tJalan + 3100, { transform: 'translate(56px,24px)', opacity: 0 }]]);
      jejak(tl, satu(leo, '.ak-hadap'), [[0, { transform: 'scaleX(-1)' }], [tJalan - 1, { transform: 'scaleX(-1)' }], [tJalan, { transform: 'none' }, 'step-end']]);
      jejak(tl, satu(leo, '.ak-kaki-b'), ayun(tJalan, 2600, 17, 560, 0, 1));
      jejak(tl, satu(leo, '.ak-kaki-d'), ayun(tJalan, 2600, 17, 560, 0, -1));
      /* terbang */
      var tF = K.B[1] - 5500, tTerbang = tF + 600, lama = 3900;
      silang(tl, st, 'peta', [[0, { opacity: 0 }], [tF - 900, { opacity: 0 }], [tF + 100, { opacity: 1 }], [K.B[1] + 900, { opacity: 1 }], [K.B[1] + 1700, { opacity: 0 }]]);
      kamera(tl, st, 'peta', [[0, K3.peta], [tTerbang + lama, K3.peta], [K.B[1] + 200, K3.peta], [K.B[1] + 1700, K3.petaSG]]);
      terbang(tl, st, tTerbang, lama);
      pop(tl, satu(st, '.sgs-welcome'), tTerbang + lama - 100, 520);
      jejak(tl, satu(st, '.sgs-pin-sg'), [[0, { transform: 'none' }], [tTerbang + lama - 200, { transform: 'none' }], [tTerbang + lama + 150, { transform: 'scale(1.5)' }, PEGAS], [tTerbang + lama + 600, { transform: 'none' }]]);
      tl.loop(satu(st, '.sgs-awan-depan'), [{ transform: 'translateX(24px)' }, { transform: 'translateX(-24px)' }], { duration: 7000, direction: 'alternate', easing: 'ease-in-out' });
      /* tiba di kantor Singapura */
      silang(tl, st, 'sg', [[0, { opacity: 0 }], [K.B[1] + 900, { opacity: 0 }], [K.B[1] + 1700, { opacity: 1 }]]);
      kamera(tl, st, 'sg', [[0, K3.sgMasuk], [K.B[1] + 900, K3.sgMasuk], [K.B[1] + 4200, K3.sg]]);
      var ls = satu(st, '.sgs-leo-sg');
      berjalan(tl, ls, K.B[1] + 1400, 2600, 60, 30);
      jejak(tl, satu(ls, '.ak-hadap'), [[0, { transform: 'scaleX(-1)' }], [K.B[1] + 3960, { transform: 'scaleX(-1)' }], [K.B[1] + 4000, { transform: 'none' }, 'step-end']]);
      jejak(tl, satu(ls, '.ak-lengan-d'), ayun(K.B[1] + 1400, 2600, 12, 560, 0, 1));
    }
  };
  /* pesawat & bayangannya mengikuti rute (sampel mulus), garis emas ikut tergambar */
  function terbang(tl, st, t0, lama) {
    var r = C4.rute, pos = satu(st, '.sgs-pesawat-pos'), bay = satu(st, '.sgs-bayang-pesawat-pos'), n = 36, kf = [], kb = [], kg = [];
    for (var i = 0; i <= n; i++) {
      var te = mulus(i / n), p = kurva(r.p0, r.c, r.p1, te), a = sudut(r.p0, r.c, r.p1, te), sk = 0.72 + Math.sin(Math.PI * te) * 0.42;
      kf.push({ transform: 'translate(' + f(p[0]) + 'px,' + f(p[1]) + 'px) rotate(' + f(a) + 'deg) scale(' + f(sk) + ')', offset: i / n });
      kb.push({ transform: 'translate(' + f(p[0] + 6 + 26 * Math.sin(Math.PI * te)) + 'px,' + f(p[1] + 10 + 30 * Math.sin(Math.PI * te)) + 'px) rotate(' + f(a) + 'deg) scale(' + f(sk * 0.8) + ')', offset: i / n });
      kg.push({ strokeDashoffset: 1 - busur(r, te), offset: i / n });
    }
    var akhir = kf[n].transform;
    [[pos, kf], [bay, kb]].forEach(function (x) {
      if (!x[0]) return;
      jejak(tl, x[0], [[0, { opacity: 0 }], [t0 - 300, { opacity: 0 }], [t0, { opacity: 1 }], [t0 + lama + 200, { opacity: 1 }], [t0 + lama + 700, { opacity: x[0] === bay ? 0 : 1 }]]);
      tl.add(satu(x[0], x[0] === pos ? '.sgs-pesawat' : '.sgs-bayang-pesawat'), x[1], { duration: lama, delay: t0, easing: 'linear', fill: 'both' });
    });
    if (pos) satu(pos, '.sgs-pesawat').style.transform = akhir.replace(/px/g, 'px');
    semua(st, '.sgs-rute .sgs-garis-emas, .sgs-rute .sgs-garis-emas-halo').forEach(function (el) { tl.add(el, kg.map(function (x) { return Object.assign({}, x); }), { duration: lama, delay: t0, easing: 'linear', fill: 'backwards' }); });
  }

  /* ---------- 4. Penghasilan berubah ---------- */
  var K4 = { meja: kam(1.45, 285, 206), jendela: kam(1.5, 330, 176), dekatSG: kam(2.6, C6.menaraLeo[0], C6.menaraLeo[1] - 30), dunia: kam(1, 250, 196) };
  S[4] = {
    awal: 800, ekor: 2200,
    jeda: [0, 0, 1000, 0],
    set: function () {
      return komposisi('sg', K4.jendela, kompSG({ leoBerdiri: true, hadapKiri: false, tumpukan: true }), 'opacity:0') +
        komposisi('dunia', K4.dunia, kompDunia({ tebal: true, labelGaris: true, ikonManfaat: true, denyut: false }));
    },
    animate: function (tl, st, K) {
      kamera(tl, st, 'sg', [[0, K3.sg], [800, K3.sg], [2600, K4.meja], [K.B[3], K4.meja], [K.B[3] + 2200, K4.jendela]]);
      var ls = satu(st, '.sgs-leo-sg');
      jejak(tl, satu(ls, '.ak-hadap'), [[0, { transform: 'none' }], [900, { transform: 'none' }], [960, { transform: 'scaleX(-1)' }, 'step-end'], [K.B[3] + 400, { transform: 'scaleX(-1)' }], [K.B[3] + 460, { transform: 'none' }, 'step-end']]);
      /* tumpukan tumbuh blok demi blok, selaras dengan angka yang diucapkan */
      var tId = K.kata(0, 'lima belas') - 600;
      semua(st, '.sgs-blok-id').forEach(function (b, i) { jejak(tl, b, [[0, { opacity: 0, transform: 'translateY(-22px)' }], [tId + i * 260, { opacity: 0, transform: 'translateY(-22px)' }], [tId + i * 260 + 360, { opacity: 1, transform: 'none' }, PEGAS]]); });
      pop(tl, satu(st, '.sgs-label-id-15'), tId + 900, 520);
      var tSg = K.kata(1, 'tiga puluh') - 700, tRentang = K.kata(1, 'lima puluh') - 300;
      semua(st, '.sgs-blok-sg').forEach(function (b, i) {
        var t = i < 6 ? tSg + i * 220 : tRentang + (i - 6) * 220;
        jejak(tl, b, [[0, { opacity: 0, transform: 'translateY(-22px)' }], [t, { opacity: 0, transform: 'translateY(-22px)' }], [t + 360, { opacity: i < 6 ? 1 : 0.62, transform: 'none' }, PEGAS]]);
      });
      pop(tl, satu(st, '.sgs-label-sg-30'), tRentang + 900, 520);
      pop(tl, satu(st, '.sgs-lencana'), K.kata(2, 'dua sampai') - 200, 560);
      /* bukan sekadar angka: cahaya emas, lalu dunia */
      jejak(tl, satu(st, '.sgs-ovl-emas'), [[0, { opacity: 0 }], [K.kata(3, 'bukan'), { opacity: 0 }], [K.kata(3, 'bukan') + 1400, { opacity: 0.8 }], [K.kata(3, 'membantu') + 600, { opacity: 0.8 }]]);
      var tDunia = K.kata(3, 'membantu') - 700;
      silang(tl, st, 'sg', [[0, { opacity: 1 }], [tDunia, { opacity: 1 }], [tDunia + 1000, { opacity: 0 }]]);
      silang(tl, st, 'dunia', [[0, { opacity: 0 }], [tDunia, { opacity: 0 }], [tDunia + 1000, { opacity: 1 }]]);
      kamera(tl, st, 'dunia', [[0, K4.dekatSG], [tDunia, K4.dekatSG], [tDunia + 2600, K4.dunia]]);
      semua(st, '.sgs-garis-dunia .sgs-garis-emas, .sgs-garis-dunia .sgs-garis-emas-halo').forEach(function (p) { gambarGaris(tl, p, tDunia + 300, 1800); });
      pop(tl, satu(st, '.sgs-label-garis'), tDunia + 1700, 600);
      [['keluarganya', 0], ['masa depan', 1], ['aset', 2]].forEach(function (q) { pop(tl, satu(st, '.sgs-manfaat-' + q[1]), Math.max(tDunia + 1400, K.kata(3, q[0]) - 150), 520); });
    }
  };

  /* ---------- 5. Waktu terus berjalan ---------- */
  var K5 = { dunia: K4.dunia, akhir: kam(1.1, 272, 190) };
  S[5] = {
    ekor: 1500,
    jeda: [0, 600, 0],
    set: function () {
      return komposisi('dunia', K5.akhir, kompDunia({ tebal: true, labelGaris: true, denyut: true, kalender: true, butuh: true, anakBesar: true, anakKecilGaya: 'opacity:0', ikonManfaat: true }));
    },
    siap: function (st) {
      var m = satu(st, '.sgs-manfaat');
      if (m) m.style.opacity = '0';
    },
    animate: function (tl, st, K) {
      kamera(tl, st, 'dunia', [[0, K5.dunia], [K.B[2] + K.D[2], K5.dunia], [K.akhir, K5.akhir]]);
      jejak(tl, satu(st, '.sgs-manfaat'), [[0, { opacity: 1 }], [700, { opacity: 1 }], [1900, { opacity: 0 }]]);
      var root = satu(st, '.sgs-komp-dunia');
      alirkan(tl, root, K.B[0] + 300, 3000);
      pudar(tl, satu(st, '.sgs-denyut-grup'), K.B[0], 600);
      /* siang–malam bergantian (ambient) */
      tl.loop(satu(st, '.sgs-ovl-malam'), [{ opacity: 0 }, { opacity: 0.5 }, { opacity: 0 }], { duration: 5200, delay: K.B[0] + 800, easing: 'ease-in-out' });
      tl.loop(satu(st, '.sgs-lampu-sg'), [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 5200, delay: K.B[0] + 800, easing: 'ease-in-out' });
      /* kalender: TAHUN 1 → TAHUN 2 */
      pop(tl, satu(st, '.sgs-kal-dunia'), K.B[1] - 200, 520);
      var t1 = K.kata(1, 'Satu tahun') - 100, t2 = K.kata(1, 'tahun kedua') - 100;
      jejak(tl, satu(st, '.sgs-kal-1'), [[0, { opacity: 0 }], [t1, { opacity: 0 }], [t1 + 300, { opacity: 1 }], [t2, { opacity: 1 }], [t2 + 220, { opacity: 0 }]]);
      jejak(tl, satu(st, '.sgs-kal-2'), [[0, { opacity: 0, transform: 'translateY(-6px)' }], [t2 + 120, { opacity: 0, transform: 'translateY(-6px)' }], [t2 + 460, { opacity: 1, transform: 'none' }, PEGAS]]);
      satu(st, '.sgs-kal-2').style.transformOrigin = '112px 124px';
      /* anak tumbuh; kebutuhan datang */
      var tTumbuh = K.kata(2, 'tumbuh') - 200;
      jejak(tl, satu(st, '.sgs-anak-kecil'), [[0, { opacity: 1 }], [tTumbuh, { opacity: 1 }], [tTumbuh + 900, { opacity: 0 }]]);
      jejak(tl, satu(st, '.sgs-anak-besar'), [[0, { opacity: 0 }], [tTumbuh, { opacity: 0 }], [tTumbuh + 900, { opacity: 1 }]]);
      pop(tl, satu(st, '.sgs-butuh-0'), K.kata(2, 'sekolahnya') - 100, 480);
      pop(tl, satu(st, '.sgs-butuh-1'), K.kata(2, 'kebutuhan rumah') - 100, 480);
      pop(tl, satu(st, '.sgs-butuh-2'), K.kata(2, 'rumah tangga') + 250, 480);
      var tBeban = K.kata(2, 'tanggung jawabnya');
      jejak(tl, satu(st, '.sgs-butuh'), [[0, { transform: 'none' }], [tBeban, { transform: 'none' }], [tBeban + 300, { transform: 'translateY(3px)' }], [tBeban + 800, { transform: 'none' }, LEMBUT]]);
      satu(st, '.sgs-butuh').style.transformOrigin = '96px 232px';
    }
  };

  /* ---------- 6. Bagaimana jika… ---------- */
  var K6 = { dunia: K5.akhir, masukSG: kam(3, C6.menaraLeo[0], C6.menaraLeo[1] - 40), meja: kam(1.3, 262, 206), dekat: kam(1.55, 256, 196), duniaLagi: kam(1.05, 260, 196), rumah: kam(1.25, 200, 236) };
  S[6] = {
    awal: 2000,
    jeda: [1400, 1600, 600, 0],
    set: function () {
      return komposisi('dunia', K6.rumah, kompDunia({ denyut: true, denyutMati: true, garisAbu: true, emas: 0, jendelaLeo: 0, uap: true, anakBesar: true, buku: true, anakKecilGaya: 'opacity:0', kalender: true, butuh: true, labelGaris: true, tebal: true })) +
        komposisi('sg', K6.dekat, kompSG({ malam: true, leoDuduk: true, dudukGaya: 'opacity:0', laptopTutup: true }), 'opacity:0') +
        '<rect class="sgs-ovl-dingin" x="-700" y="-700" width="1880" height="1760" style="opacity:0"/>';
    },
    siap: function (st) {
      semua(st, '.sgs-kal-dunia, .sgs-butuh, .sgs-label-garis-pos').forEach(function (el) { el.style.opacity = '0'; });
    },
    animate: function (tl, st, K) {
      semua(st, '.sgs-kal-dunia, .sgs-butuh, .sgs-label-garis-pos').forEach(function (el) { jejak(tl, el, [[0, { opacity: 1 }], [600, { opacity: 1 }], [1500, { opacity: 0 }]]); });
      /* masuk ke kantor Singapura, malam */
      kamera(tl, st, 'dunia', [[0, K6.dunia], [1900, K6.masukSG], [K.B[3] - 1600, K6.masukSG], [K.B[3] + 200, K6.duniaLagi], [K.B[3] + 1200, K6.duniaLagi], [K.B[3] + 4200, K6.rumah]]);
      silang(tl, st, 'dunia', [[0, { opacity: 1 }], [1300, { opacity: 1 }], [2000, { opacity: 0 }], [K.B[3] - 1600, { opacity: 0 }], [K.B[3] - 600, { opacity: 1 }]]);
      silang(tl, st, 'sg', [[0, { opacity: 0 }], [1300, { opacity: 0 }], [2000, { opacity: 1 }], [K.B[3] - 1600, { opacity: 1 }], [K.B[3] - 600, { opacity: 0 }]]);
      kamera(tl, st, 'sg', [[0, K6.meja], [1400, K6.meja], [K.B[2], K6.dekat]]);
      /* suasana mendingin */
      jejak(tl, satu(st, '.sgs-ovl-dingin'), [[0, { opacity: 0 }], [K.B[0] + 200, { opacity: 0 }], [K.B[0] + 2400, { opacity: 0.5 }, LEMBUT], [K.B[3] + 600, { opacity: 0.5 }], [K.B[3] + 3200, { opacity: 0 }, LEMBUT]]);
      /* Leo mengetik, terhenti, lalu memudar; laptop tertutup; jam berhenti */
      var ld = satu(st, '.sgs-leo-duduk'), tHenti = K.B[1] + 400, tPudar = K.kata(2, 'risiko') - 300;
      jejak(tl, ld, [[0, { opacity: 1 }], [tPudar, { opacity: 1 }], [tPudar + 2600, { opacity: 0 }, LEMBUT]]);
      jejak(tl, satu(ld, '.ak-lengan-d'), ayun(1400, tHenti - 1400, 5, 420, -24).concat([[tHenti + 300, { transform: rot(-24) }]]));
      jejak(tl, satu(st, '.sgs-laptop-buka'), [[0, { opacity: 1 }], [tPudar + 1800, { opacity: 1 }], [tPudar + 2400, { opacity: 0 }]]);
      jejak(tl, satu(st, '.sgs-laptop-tutup'), [[0, { opacity: 0 }], [tPudar + 1800, { opacity: 0 }], [tPudar + 2400, { opacity: 1 }]]);
      var jr = satu(st, '.sgs-jarum-pos');
      jejak(tl, jr, [[0, { transform: 'none' }], [tPudar + 1200, { transform: rot(300) }, 'linear']]);
      satu(st, '.sgs-jarum-pos').style.transform = rot(300);
      /* garis: denyut berhenti, emas → abu-abu; jendela Leo padam */
      var root = satu(st, '.sgs-komp-dunia'), tAbu = K.B[3] - 400;
      denyutSampai(tl, root, 0, tAbu, 3000);
      jejak(tl, satu(st, '.sgs-garis-emas-grup'), [[0, { opacity: 1 }], [tAbu, { opacity: 1 }], [tAbu + 1600, { opacity: 0 }, LEMBUT]]);
      jejak(tl, satu(st, '.sgs-garis-abu'), [[0, { opacity: 0 }], [tAbu, { opacity: 0 }], [tAbu + 1600, { opacity: 1 }, LEMBUT]]);
      jejak(tl, satu(st, '.sgs-jendela-leo'), [[0, { opacity: 1 }], [tAbu, { opacity: 1 }], [tAbu + 1200, { opacity: 0 }]]);
      /* rumah tetap hangat; hari tetap berjalan */
      tl.loop(satu(st, '.sgs-uap'), [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 0.8, transform: 'translateY(-2px)' }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 2600, delay: K.B[3] });
      jejak(tl, satu(st, '.sgs-istri-dunia .ak-lengan-d'), [[0, { transform: 'none' }], [K.kata(3, 'rumah') + 400, { transform: 'none' }]].concat(ayun(K.kata(3, 'rumah') + 400, 3000, 12, 750, -40)));
    }
  };

  /* ---------- 7. Kebutuhan tidak ikut berhenti ---------- */
  var K7 = { awal: K6.rumah, rumah: kam(1.85, 124, 231), kontras: kam(1.45, 135, 232), celah: kam(1.28, 136, 228) };
  S[7] = {
    awal: 1500, ekor: 2500,
    jeda: [1400, 0, 1800, 0],
    set: function () {
      return komposisi('dunia', K7.celah, kompDunia({ garisAbu: true, celah: true, celahSisa: true, emas: 0, jendelaLeo: 0, anakBesar: true, buku: true, anakKecilGaya: 'opacity:0', perisai: true, denyut: false })) + hudKebutuhan();
    },
    animate: function (tl, st, K) {
      kamera(tl, st, 'dunia', [[0, K7.awal], [K.B[0] + K.D[0] - 600, K7.rumah, LEMBUT], [K.B[1] + 400, K7.rumah], [K.B[1] + 2600, K7.kontras], [K.B[2] + 300, K7.kontras], [K.B[2] + 3200, K7.celah]]);
      /* kebutuhan muncul satu per satu */
      [['Rumah tetap', 0], ['pendidikan', 1], ['kebutuhan sehari', 2], ['masa depan', 3]].forEach(function (q) { pop(tl, satu(st, '.sgs-chip-' + q[1]), K.kata(0, q[0]) - 120, 520); });
      semua(st, '.sgs-chip').forEach(function (c, i) { tl.loop(c, [{ transform: 'none' }, { transform: 'translateX(2px)' }, { transform: 'none' }], { duration: 2400, delay: K.B[0] + 600 + i * 300, easing: 'ease-in-out' }); });
      /* PENGHASILAN BERHENTI vs KEBUTUHAN TETAP BERJALAN */
      muncul(tl, satu(st, '.sgs-kontras-1'), K.kata(1, 'penghasilan berhenti') - 100, 600, 'translateY(-8px)');
      muncul(tl, satu(st, '.sgs-kontras-2'), K.kata(1, 'kebutuhan keluarga') - 100, 600, 'translateY(-8px)');
      /* ujung garis yang mati memudar → celah */
      jejak(tl, satu(st, '.sgs-garis-abu-sisa'), [[0, { opacity: 1 }], [K.B[1] + 200, { opacity: 1 }], [K.B[1] + 1800, { opacity: 0 }]]);
      /* PERLINDUNGAN menjadi jembatan */
      var tP = K.kata(3, 'perlindungan') - 200;
      jejak(tl, satu(st, '.sgs-perisai-g'), [[0, { opacity: 0, transform: 'scale(.3)' }], [tP, { opacity: 0, transform: 'scale(.3)' }], [tP + 700, { opacity: 1, transform: 'none' }, PEGAS]]);
      pop(tl, satu(st, '.sgs-label-perisai'), tP + 500, 520);
      semua(st, '.sgs-jembatan path').forEach(function (p) { gambarGaris(tl, p, tP + 900, 1700); });
      jejak(tl, satu(st, '.sgs-rumah-hangat'), [[0, { opacity: 0.6 }], [tP + 1600, { opacity: 0.6 }], [tP + 2600, { opacity: 1 }]]);
      tl.loop(satu(st, '.sgs-perisai-halo'), [{ opacity: 0.55 }, { opacity: 1 }, { opacity: 0.55 }], { duration: 2400, delay: tP + 1200, easing: 'ease-in-out' });
    }
  };

  /* ---------- 8. Alasan yang sama ---------- */
  var K8 = { awal: K7.celah, keSG: kam(2.6, C6.menaraLeo[0], C6.menaraLeo[1] - 40), jendela: kam(1.45, 344, 176), dunia: kam(1.12, 254, 208), luas: kam(0.94, 250, 196) };
  S[8] = {
    awal: 2500,
    jeda: [0, 0, 1600, 0],
    set: function () {
      return komposisi('dunia', K8.luas, kompDunia({ malam: true, tetangga: true, garisLain: true, perisaiRencana: true, anakBesar: true, anakKecilGaya: 'opacity:0',
        garisAbu: true, celah: true, perisai: true })) + hudKebutuhan('opacity:0') +
        komposisi('sg', K8.jendela, kompSG({ malam: true, leoBerdiri: true, hadapKiri: false, telepon: true }), 'opacity:0') + hud8();
    },
    siap: function (st) {
      /* keadaan akhir: dunia nyata (tanpa bayangan skenario scene 7) */
      semua(st, '.sgs-komp-dunia .sgs-garis-abu, .sgs-komp-dunia .sgs-jembatan, .sgs-komp-dunia .sgs-perisai-pos, .sgs-komp-dunia .sgs-label-perisai').forEach(function (el) { el.style.opacity = '0'; });
      var ls = satu(st, '.sgs-leo-sg');
      if (ls) satu(ls, '.ak-lengan-d').style.transform = rot(-66);
    },
    animate: function (tl, st, K) {
      kamera(tl, st, 'dunia', [[0, K8.awal], [2300, K8.keSG], [K.B[1] - 900, K8.keSG], [K.B[1] + 1600, K8.dunia], [K.B[2], K8.dunia], [K.B[2] + 3200, K8.luas]]);
      silang(tl, st, 'dunia', [[0, { opacity: 1 }], [1700, { opacity: 1 }], [2500, { opacity: 0 }], [K.B[1] - 900, { opacity: 0 }], [K.B[1] + 100, { opacity: 1 }]]);
      silang(tl, st, 'sg', [[0, { opacity: 0 }], [1700, { opacity: 0 }], [2500, { opacity: 1 }], [K.B[1] - 900, { opacity: 1 }], [K.B[1] + 100, { opacity: 0 }]]);
      kamera(tl, st, 'sg', [[0, kam(1.9, 360, 150)], [1700, kam(1.9, 360, 150)], [3600, K8.jendela]]);
      /* skenario scene 7 memudar: kembali ke hari ini */
      semua(st, '.sgs-komp-dunia .sgs-garis-abu, .sgs-komp-dunia .sgs-jembatan, .sgs-komp-dunia .sgs-perisai-pos, .sgs-komp-dunia .sgs-label-perisai, .sgs-hud-7').forEach(function (el) {
        jejak(tl, el, [[0, { opacity: 1 }], [300, { opacity: 1 }], [1500, { opacity: 0 }]]);
      });
      jejak(tl, satu(st, '.sgs-komp-dunia .sgs-garis-emas-grup'), [[0, { opacity: 0 }], [600, { opacity: 0 }], [1800, { opacity: 1 }]]);
      jejak(tl, satu(st, '.sgs-komp-dunia .sgs-ovl-malam'), [[0, { opacity: 0 }], [400, { opacity: 0 }], [2200, { opacity: 1 }]]);
      jejak(tl, satu(st, '.sgs-komp-dunia .sgs-lampu-sg'), [[0, { opacity: 0 }], [900, { opacity: 0 }], [2200, { opacity: 1 }]]);
      jejak(tl, satu(st, '.sgs-komp-dunia .sgs-jendela-leo'), [[0, { opacity: 0 }], [900, { opacity: 0 }], [2200, { opacity: 1 }]]);
      /* Leo menelepon keluarganya */
      var ls = satu(st, '.sgs-leo-sg'), tTelp = K.kata(0, 'menelepon') - 400;
      jejak(tl, satu(ls, '.ak-lengan-d'), [[0, { transform: rot(-66) }]]);
      jejak(tl, satu(ls, '.ak-kepala'), [[0, { transform: 'none' }], [tTelp, { transform: 'none' }], [tTelp + 500, { transform: rot(6) }], [K.B[1] - 600, { transform: rot(6) }], [K.B[1], { transform: 'none' }]]);
      jejak(tl, satu(st, '.sgs-panggilan'), [[0, { opacity: 0, transform: 'scale(.7)' }], [tTelp + 500, { opacity: 0, transform: 'scale(.7)' }], [tTelp + 1100, { opacity: 1, transform: 'none' }, PEGAS], [K.B[1] - 1000, { opacity: 1, transform: 'none' }], [K.B[1] - 300, { opacity: 0, transform: 'none' }]]);
      jejak(tl, satu(st, '.sgs-panggilan .sgs-istri-telp .ak-lengan-d'), [[0, { transform: 'none' }], [tTelp + 1100, { transform: 'none' }], [tTelp + 1400, { transform: rot(-140) }]].concat(ayun(tTelp + 1400, 2400, 12, 480, -140)).concat([[tTelp + 4200, { transform: 'none' }]]));
      jejak(tl, satu(st, '.sgs-panggilan .sgs-anak-telp .ak-lengan-d'), [[0, { transform: 'none' }], [tTelp + 1100, { transform: 'none' }], [tTelp + 1400, { transform: rot(-150) }]].concat(ayun(tTelp + 1400, 2800, 14, 400, -150)).concat([[tTelp + 4600, { transform: 'none' }]]));
      /* cahaya panggilan menyusuri garis ke rumah */
      var cp = satu(st, '.sgs-cahaya-telp'), g = C6.garis, kf = [];
      for (var i = 0; i <= 20; i++) { var p = kurva(g.p0, g.c, g.p1, i / 20); kf.push({ transform: 'translate(' + f(p[0]) + 'px,' + f(p[1]) + 'px)', opacity: i === 0 || i === 20 ? 0 : 1, offset: i / 20 }); }
      if (cp) tl.add(cp, kf, { duration: 2600, delay: K.B[1] + 300, easing: 'ease-in-out', fill: 'none' });
      jejak(tl, satu(st, '.sgs-komp-dunia .sgs-rumah-hangat'), [[0, { opacity: 0.6 }], [K.B[1] + 2600, { opacity: 0.6 }], [K.B[1] + 3400, { opacity: 1 }]]);
      /* kita juga punya alasan yang sama: rumah & garis lain menyala */
      pudar(tl, satu(st, '.sgs-tetangga'), K.B[2] - 400, 900);
      semua(st, '.sgs-tetangga .sgs-rumah-hangat').forEach(function (h, i) { jejak(tl, h, [[0, { opacity: 0 }], [K.B[2] + 900 + i * 500, { opacity: 0 }], [K.B[2] + 1900 + i * 500, { opacity: 1 }]]); });
      semua(st, '.sgs-garis-tipis').forEach(function (p, i) { gambarGaris(tl, p, K.B[2] + 300 + i * 500, 1500); });
      /* rencana: kerangka perisai putus-putus */
      pop(tl, satu(st, '.sgs-rencana'), K.kata(3, 'rencana') - 200, 600);
      tl.loop(satu(st, '.sgs-rencana-pos'), [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 2600, delay: K.kata(3, 'rencana') + 800, easing: 'ease-in-out' });
    }
  };
  function hud8() {
    /* kartu panggilan video (istri & anak melambai) di dekat Leo */
    var x = 116, y = 128;
    return '<g class="sgs-hud"><g class="sgs-panggilan" style="' + asal(x + 60, y + 50) + ';opacity:0">' +
      kotak(x, y, 120, 100, 'sgs-telp-kartu', 16) + '<rect class="sgs-telp-layar" x="' + (x + 8) + '" y="' + (y + 8) + '" width="104" height="72" rx="10"/>' +
      '<circle cx="' + (x + 60) + '" cy="' + (y + 50) + '" r="40" fill="url(#sgsHangat)"/>' +
      aktor('sgs-istri-telp', 'istri', x + 46, y + 80, 0.46) + aktor('sgs-anak-telp', 'anak', x + 78, y + 80, 0.46) +
      teks(x + 60, y + 95, 'KELUARGA', 'sgs-f14 sgs-teks-2') + '</g>' +
      '<g class="sgs-cahaya-telp" style="opacity:0"><circle r="14" fill="url(#sgsCahaya)"/><circle class="sgs-denyut" r="4"/></g></g>';
  }

  /* ---------------- kerangka scene ---------------- */
  var INTI = [0, 0, 480, 360];
  function kerangka(opsi, step, i, sc) {
    var n = i + 1;
    return '<div class="sgs" data-sgs="' + n + '" data-ketuk="0">' + (opsi.header || '') +
      '<div class="sgs-body">' +
        '<figure class="sgs-stage sgs-s' + n + '" role="img" aria-label="' + esc('Ilustrasi langkah ' + n + ': ' + step.title + '. ' + (ARIA[i] || '')) + '">' +
          '<svg class="sgs-rig" data-inti="' + INTI.join(' ') + '" viewBox="' + INTI.join(' ') + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + defs() + sc.set() + '</svg>' +
          '<div class="sgs-vignette"></div>' +
        '</figure>' +
        '<div class="sgs-text">' +
          '<span class="sgs-kicker">INTI PESAN • ' + n + '/' + JUMLAH + '</span>' +
          '<h3 class="sgs-title">' + esc(step.title) + '</h3>' +
          '<p class="sgs-focus">' + esc(step.focus) + '</p>' +
          '<p class="sgs-isi">' + esc(step.body) + '</p>' +
          '<div class="sgs-cue"><span aria-hidden="true">💡</span><div><b>Panduan untuk agen</b><p>' + esc(CUE) + '</p></div></div>' +
        '</div>' +
      '</div></div>';
  }
  function animasiTeks(tl, stage) {
    muncul(tl, satu(stage, '.sgs-title'), 120, 520);
    muncul(tl, satu(stage, '.sgs-focus'), 300, 520);
    muncul(tl, satu(stage, '.sgs-isi'), 480, 560);
  }

  /* viewBox mengikuti rasio panggung: area inti utuh, sisanya dunia */
  function paskan(svg) {
    var w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) { var r = svg.getBoundingClientRect(); w = r.width; h = r.height; }
    if (!w || !h) return;
    var I = svg.getAttribute('data-inti').split(' ').map(Number);
    var a = w / h, w0 = I[2] - I[0], h0 = I[3] - I[1], vb;
    if (a >= w0 / h0) { var ww = h0 * a; vb = [(I[0] + I[2]) / 2 - ww / 2, I[1], ww, h0]; }
    else { var hh = w0 / a, ekstra = hh - h0; vb = [I[0], I[1] - ekstra * 0.5, w0, hh]; }
    svg.setAttribute('viewBox', vb.map(f).join(' '));
  }
  var pengamat = null;
  function amati(stage) {
    var rigs = semua(stage, '.sgs-rig');
    rigs.forEach(paskan);
    if (!window.ResizeObserver) return;
    if (!pengamat) pengamat = new ResizeObserver(function (e) { e.forEach(function (x) { paskan(x.target); }); });
    pengamat.disconnect();
    rigs.forEach(function (r) { pengamat.observe(r); });
  }

  /* Ketukan scene: B = saat mulai tiap ketukan, D = lamanya, akhir = ujung
     timeline. Lama ketukan = maks(kebutuhan gerak, perkiraan narasi) + jeda;
     "awal" menunda ketukan pertama, "ekor" memperpanjang ujung scene. */
  function ketukan(n) {
    var sc = S[n] || S[1], naskah = NARASI[n - 1] || [], vis = sc.ketuk || [], jeda = sc.jeda || [], B = [], D = [], t = sc.awal || 0;
    naskah.forEach(function (seg, j) {
      var d = Math.max(vis[j] || 0, lamaSegmen(seg)) + (jeda[j] || 0);
      B.push(t); D.push(d); t += d;
    });
    t += sc.ekor || 0;
    return {
      B: B, D: D, akhir: t,
      /* perkiraan saat kata k pada segmen j mulai diucapkan */
      kata: function (j, k) {
        var seg = naskah[j] || '', i = seg.indexOf(k);
        return (B[j] || 0) + JEDA_UCAP + (i > 0 ? lamaBicara(seg.slice(0, i)) : 0);
      }
    };
  }

  /* Klip rekaman per segmen (kunci "SNN-MM" = scene NN, segmen MM).
     Singapura selalu memakai rekaman: segmen tanpa klip tetap sunyi dan
     tidak pernah dibacakan suara browser. */
  function rekaman() {
    var A = window.PSGSingapuraAudio || {}, seg = A.segmen || {};
    return {
      folder: A.folder || '',
      klip: NARASI.map(function (sc, i) {
        return sc.map(function (_, j) { return seg['S0' + (i + 1) + '-0' + (j + 1)] || []; });
      })
    };
  }

  var N = null;
  function adegan(opsi) {
    var o = opsi || {};
    var langkah = Array.isArray(o.langkah) ? o.langkah : [];
    N = window.PSGNarasi || null;
    if (N) {
      N.daftar('.sgs', 'data-sgs', NARASI, rekaman());
      N.pasang();
      o = Object.assign({}, o, { header: N.tombol(o.header || '') });
    }
    return langkah.map(function (step, i) {
      var n = i + 1, sc = S[n] || S[1];
      return {
        id: 'singapura-' + n,
        fit: true,
        siapDi: 'akhir',
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, step, i, sc);
          var st = stage.querySelector('.sgs-stage');
          amati(stage);
          if (sc.siap) sc.siap(st);
          if (N) N.tandai();
        },
        animate: function (tl, stage) {
          var st = stage.querySelector('.sgs-stage'), node = stage.querySelector('.sgs'), K = ketukan(n);
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

  /* untuk pengujian (baca saja): naskah, perkiraan durasi, dan ketukan */
  window.PSGSingapuraStory = {
    adegan: adegan,
    naskah: function () { return NARASI.map(function (s) { return s.slice(); }); },
    durasi: function () { return S.slice(1).map(function (sc, i) { return ketukan(i + 1).akhir; }); },
    ketukan: function (n) { var k = ketukan(n); return { B: k.B.slice(), D: k.D.slice(), akhir: k.akhir }; }
  };
})();
