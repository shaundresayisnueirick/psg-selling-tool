/* ============================================================
   Sales Idea — Bekerja di Singapura (interactive story)
   ------------------------------------------------------------
   Dua belas scene mengikuti 12 langkah singapuraSteps di
   sales-idea.js dengan urutan yang sama; judul, fokus, dan isi
   kartu teks diambil dari data itu.

    1. Pak Leo bekerja; lalu Leo bersama keluarga di rumah.
       Rp15 JUTA / BULAN • Rp180 JUTA / TAHUN.
    2. Atasan memanggil Leo; Leo berjalan ke ruang rapat; dialog
       ekspansi ke Singapura.
    3. Tanggung jawab bertambah; Rp15 JUTA → Rp30–50 JUTA / BULAN;
       2–3× PENGHASILAN; Leo menerima.
    4. Peta Indonesia → Singapura; pesawat BERGERAK di sepanjang
       rute; WELCOME TO SINGAPORE. (Tanpa narasi — momen visual.)
    5. Satu tahun: kalender bulan → 1 TAHUN; aliran penghasilan
       Leo (Singapura) → keluarga (Indonesia).
    6. Dua tahun: kalender TAHUN 1 → TAHUN 2; aliran tetap berjalan.
    7. Pertanyaan: keluarga juga membutuhkan penghasilan; bagaimana
       kalau Leo tidak bisa lagi bekerja?
    8. Tenang dan simbolis: Leo berjalan menuju cahaya di cakrawala.
       Tidak ada rumah sakit, kecelakaan, atau visual yang menakutkan.
    9. Aliran yang SAMA dengan scene 5–7 berhenti dan terputus.
   10. Alur: PENGHASILAN LEO → KEBUTUHAN KELUARGA → PROTEKSI →
       PENGHASILAN YANG DITERUSKAN.
   11. Rumah yang hangat; pertanyaan penutup.
   12. Penutup; kartu akhir "Mari Kita Hitung" (sales-idea-lanjut.js)
       muncul sesudah scene ini selesai.

   Teknik: SVG datar ringan (satu <svg> per panggung), hanya
   transform/opacity/stroke yang dianimasikan lewat timeline pemutar
   (Web Animations). Render = keadaan akhir (statis, juga untuk gerak
   dikurangi); animasi bergerak dari awal ke keadaan akhir itu.
   Komponen aliran penghasilan (scene 5, 6, 7, 9) memakai tata letak
   dan elemen yang sama, jadi aliran yang berhenti di scene 9 adalah
   aliran yang sama dengan scene 5–6.

   Narasi: narator bersama (window.PSGNarasi). Naskah tiap scene
   berupa segmen; tiap segmen punya satu ketukan visual. Lama ketukan =
   maks(kebutuhan gerak, perkiraan lama narasi) + jeda dramatis,
   jadi JEDA di naskah menjadi hening yang nyata dan PAUSE / RESUME
   berlaku sepanjang narasi. data-ketuk pada node scene memberi tahu
   narator ketukan mana yang sudah mulai.

   API: PSGSingapuraStory.adegan({ langkah, header, padaLangkah })
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var LEMBUT = 'cubic-bezier(.45,.05,.3,1)';
  var PEGAS = 'cubic-bezier(.34,1.4,.5,1)';
  var JATUH = 'cubic-bezier(.55,0,.8,.45)';
  var JUMLAH = 12;

  /* teks alternatif panggung (role="img"): isi visual tiap scene */
  var ARIA = [
    'Pak Leo bekerja di kantor, lalu bersama istri dan anaknya di rumah. Penghasilan Rp15 juta per bulan, Rp180 juta per tahun.',
    'Atasan memanggil Leo ke ruang rapat: perusahaan melakukan ekspansi ke Singapura dan ingin Leo menangani project ini.',
    'Tanggung jawab bertambah. Penghasilan Rp15 juta naik menjadi Rp30 sampai 50 juta per bulan, dua sampai tiga kali lipat. Leo menerima.',
    'Peta Indonesia dan Singapura. Pesawat terbang dari Jakarta menuju Singapura. Welcome to Singapore.',
    'Leo bekerja di Singapura, keluarganya di Indonesia. Kalender menuju satu tahun. Penghasilan mengalir dari Leo ke keluarga.',
    'Kalender dari tahun pertama ke tahun kedua. Penghasilan Leo tetap mengalir ke keluarga.',
    'Aliran penghasilan dari Leo ke keluarga. Pertanyaan: bagaimana kalau suatu hari Leo tidak bisa lagi bekerja?',
    'Senja yang tenang. Leo berjalan menuju cahaya di cakrawala dan tidak kembali.',
    'Aliran penghasilan dari Leo ke keluarga berhenti dan terputus. Pertanyaan: siapa yang akan membawa pulang penghasilan untuk keluarganya?',
    'Alur: penghasilan Leo, kebutuhan keluarga, proteksi, penghasilan yang diteruskan kepada keluarga.',
    'Rumah yang hangat bersama keluarga. Pertanyaan: siapa yang akan membawa pulang penghasilan itu untuk keluarga?',
    'Penutup: keluarga di rumah. Lanjutkan ke Mari Kita Hitung atau bahas topik lain.'
  ];
  var CUE = 'Biarkan cerita berjalan, lalu tanyakan kondisi keluarga prospek dengan bahasa sehari-hari.';

  /* Naskah narasi: satu larik segmen per scene, urutan = ketukan visual.
     Kalimat pendek dan bahasa sehari-hari; JEDA di naskah = batas segmen. */
  var NARASI = [
    ['Kenalkan, Pak Leo.',
      'Seorang pekerja keras, berprestasi, dan sangat bertanggung jawab kepada keluarganya.'],
    ['Suatu hari, atasannya memanggil Leo.',
      'Leo, perusahaan kita sedang melakukan ekspansi ke Singapura.',
      'Kami ingin kamu menangani project ini.'],
    ['Tanggung jawabnya tentu lebih besar.',
      'Tapi penghasilannya juga meningkat.',
      'Hampir dua sampai tiga kali lipat.'],
    [],
    ['Leo memang tidak bisa pulang setiap hari.',
      'Tapi setiap bulan, ada satu hal yang tetap sampai ke rumah…',
      'Penghasilannya.'],
    ['Satu tahun…',
      'Dua tahun…',
      'Selama Leo masih bisa bekerja, penghasilannya tetap bisa dikirim untuk memenuhi kebutuhan keluarganya.'],
    ['Karena sebenarnya, keluarga tidak hanya membutuhkan kita pulang ke rumah.',
      'Keluarga juga membutuhkan penghasilan kita untuk terus memenuhi kebutuhan sehari-hari.',
      'Tapi bagaimana kalau suatu hari Leo tidak bisa lagi bekerja?'],
    ['Bagaimana kalau suatu hari… bukan perusahaan yang memanggil Leo?',
      'Tapi Tuhan Yang Maha Kuasa?',
      'Sebuah pekerjaan yang tidak pernah selesai…',
      'Dan kali ini, Leo tidak pernah kembali.'],
    ['Kalau Leo sudah tidak bisa bekerja…',
      'Siapa yang akan membawa pulang penghasilan untuk keluarganya?'],
    ['Karena mempersiapkan masa depan keluarga bukan hanya tentang meninggalkan uang.',
      'Tetapi memastikan kebutuhan keluarga tetap bisa berjalan, meskipun suatu hari kita tidak bisa lagi menghasilkan.'],
    ['Selama kita masih bisa menghasilkan, mungkin kita merasa semuanya baik-baik saja.',
      'Tapi kita tidak pernah tahu apa yang akan terjadi besok.',
      'Kalau suatu hari kita tidak bisa lagi bekerja…',
      'Siapa yang akan membawa pulang penghasilan itu untuk keluarga?'],
    []
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
  function jejak(tl, el, frames) {
    if (!tl || !el || !frames || !frames.length) return null;
    var j = kunciJejak(frames);
    return tl.add(el, j.kf, { duration: Math.max(1, j.total), easing: 'linear', fill: 'backwards' });
  }
  function muncul(tl, el, t, d, dari) { jejak(tl, el, [[t, { opacity: 0, transform: dari || 'translateY(10px)' }], [t + (d || 520), { opacity: 1, transform: 'none' }]]); }
  function pop(tl, el, t, d) { jejak(tl, el, [[t, { opacity: 0, transform: 'scale(.4)' }], [t + (d || 460), { opacity: 1, transform: 'none' }, PEGAS]]); }
  function pudar(tl, el, t, d) { jejak(tl, el, [[t, { opacity: 0 }], [t + (d || 500), { opacity: 1 }]]); }
  function denyut(tl, el, t, s) { jejak(tl, el, [[t, { transform: 'none' }], [t + 280, { transform: 'scale(' + (s || 1.12) + ')' }], [t + 760, { transform: 'none' }, LEMBUT]]); }
  /* garis tergambar: path ber-pathLength="1" */
  function gambarGaris(tl, el, t, d, e) { jejak(tl, el, [[t, { strokeDashoffset: 1 }], [t + d, { strokeDashoffset: 0 }, e || LEMBUT]]); }
  function asal(x, y) { return 'transform-origin:' + f(x) + 'px ' + f(y) + 'px'; }

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

  /* ---------------- teks & kartu ---------------- */
  function teks(x, y, isi, kelas, anchor) {
    return '<text class="sgs-teks ' + (kelas || '') + '" x="' + f(x) + '" y="' + f(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(isi) + '</text>';
  }
  function kotak(x, y, w, h, kelas, r) {
    return '<rect class="' + (kelas || 'sgs-kartu') + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(r == null ? Math.min(16, h / 2) : r) + '"/>';
  }
  function garis(d, kelas) { return '<path class="sgs-garis ' + (kelas || '') + '" d="' + d + '" pathLength="1"/>'; }
  /* pil teks: kotak membulat + teks di tengah */
  function pil(cx, cy, w, h, isi, kelasKotak, kelasTeks, gaya) {
    return '<g class="' + (gaya || '') + '" style="' + asal(cx, cy) + '">' + kotak(cx - w / 2, cy - h / 2, w, h, kelasKotak) +
      teks(cx, cy + 6.5, isi, kelasTeks) + '</g>';
  }
  /* bendera sederhana (merah-putih; Singapura + bulan sabit & bintang) */
  function bendera(x, y, w, kode) {
    var h = w * 2 / 3, isi = '<rect class="sgs-bdr-tepi" x="-1" y="-1" width="' + f(w + 2) + '" height="' + f(h + 2) + '" rx="2.5"/>' +
      '<rect class="sgs-bdr-merah" width="' + f(w) + '" height="' + f(h / 2) + '"/><rect class="sgs-bdr-putih" y="' + f(h / 2) + '" width="' + f(w) + '" height="' + f(h / 2) + '"/>';
    if (kode === 'SG') {
      isi += '<circle class="sgs-bdr-putih" cx="' + f(w * 0.22) + '" cy="' + f(h * 0.25) + '" r="' + f(h * 0.16) + '"/>' +
        '<circle class="sgs-bdr-merah" cx="' + f(w * 0.27) + '" cy="' + f(h * 0.25) + '" r="' + f(h * 0.15) + '"/>';
      [[0.36, 0.16], [0.44, 0.16], [0.33, 0.26], [0.47, 0.26], [0.40, 0.33]].forEach(function (p) {
        isi += '<circle class="sgs-bdr-putih" cx="' + f(w * p[0]) + '" cy="' + f(h * p[1]) + '" r="' + f(h * 0.028 + 0.4) + '"/>';
      });
    }
    return '<g class="sgs-bendera" transform="translate(' + f(x) + ' ' + f(y) + ')">' + isi + '</g>';
  }
  /* koin "Rp" berpusat di (0,0) */
  function koin(kelas) {
    return '<g class="sgs-koin ' + (kelas || '') + '"><circle class="sgs-koin-luar" r="14"/><circle class="sgs-koin-dalam" r="10.5"/>' +
      '<text class="sgs-teks sgs-koin-teks" y="4.6">Rp</text></g>';
  }
  /* pesawat menghadap kanan (0°), berpusat di (0,0) */
  var PESAWAT = '<path class="sgs-pesawat-badan" d="M-20 -2.6 L14 -3.2 C19 -3.2 22.5 -1.6 22.5 0 C22.5 1.6 19 3.2 14 3.2 L-20 2.6 Z"/>' +
    '<path class="sgs-pesawat-sayap" d="M-3 -2.8 L-12 -19 L-6 -19 L8 -2.8 Z M-3 2.8 L-12 19 L-6 19 L8 2.8 Z"/>' +
    '<path class="sgs-pesawat-sayap" d="M-17 -2.6 L-22 -9.5 L-18.5 -9.5 L-11 -2.6 Z M-17 2.6 L-22 9.5 L-18.5 9.5 L-11 2.6 Z"/>' +
    '<circle class="sgs-pesawat-kaca" cx="17" cy="-0.6" r="1.6"/>';

  /* ---------------- tokoh ---------------- */
  var LEO = { sendi: true, usia: 'dewasa', pakaian: 'kerja' };
  var BOS = { sendi: true, usia: 'senior', pakaian: 'kerja', kacamata: true };
  var ISTRI = { sendi: true, jenis: 'wanita', usia: 'dewasa' };
  var ANAK = { sendi: true, usia: 'anak', pakaian: 'muda', gaya: '--k-muda:#4f8fcf;--k-celana:#3b4a63' };
  /* ukuran nested <svg> lewat atribut: tidak semua browser menerapkan
     width/height CSS pada <svg> di dalam SVG */
  function tokoh(o) { return window.PSGKarakter ? window.PSGKarakter.svg(o).replace('<svg class="psg-k', '<svg width="120" height="240" class="psg-k') : ''; }
  /* orang berdiri: kaki di (x, y), skala s, cermin bila arah -1 */
  function orang(kelas, x, y, s, o, arah) {
    var tx = arah === -1 ? x + 61 * s : x - 61 * s;
    return '<g class="sgs-orang ' + kelas + '" style="' + asal(x, y) + '"><g transform="translate(' + f(tx) + ' ' + f(y - 226 * s) + ') scale(' + (arah === -1 ? -s : s) + ' ' + s + ')">' + tokoh(o) + '</g></g>';
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

  /* ---------------- latar ---------------- */
  /* langit/dinding dunia: jauh melebihi area inti supaya layar lebar & tinggi tetap penuh */
  function latar(kelas) { return '<rect class="' + kelas + '" x="-700" y="-700" width="1880" height="1760"/>'; }
  function lantai(y, kelas) { return '<rect class="' + (kelas || 'sgs-lantai') + '" x="-700" y="' + f(y) + '" width="1880" height="900"/>'; }
  /* gedung-gedung (siluet) di dalam jendela atau di latar */
  function kota(x, y, w, h, kelas) {
    var g = '', pola = [[0, .62], [.1, .86], [.2, .5], [.3, .74], [.42, .95], [.54, .58], [.64, .8], [.76, .46], [.86, .7]];
    pola.forEach(function (p, i) {
      var bw = w * 0.1, bh = h * p[1];
      g += '<rect x="' + f(x + w * p[0]) + '" y="' + f(y + h - bh) + '" width="' + f(bw + (i % 2 ? 2 : 0)) + '" height="' + f(bh) + '"/>';
    });
    return '<g class="' + (kelas || 'sgs-kota') + '">' + g + '</g>';
  }
  /* cakrawala Singapura sederhana: tiga menara + dek di atasnya */
  function kotaSG(cx, y, s) {
    var g = '<g class="sgs-kota-sg" transform="translate(' + f(cx) + ' ' + f(y) + ') scale(' + s + ')">' +
      '<rect x="-46" y="-58" width="16" height="58"/><rect x="-8" y="-62" width="16" height="62"/><rect x="30" y="-58" width="16" height="58"/>' +
      '<path d="M-54 -64 L62 -70 L62 -64 L-54 -58 Z"/>' +
      '<rect x="-78" y="-30" width="18" height="30"/><rect x="-100" y="-44" width="14" height="44"/><rect x="62" y="-36" width="14" height="36"/><rect x="82" y="-24" width="18" height="24"/></g>';
    return g;
  }
  /* rumah sederhana (garis atap + dinding) */
  function rumahIkon(cx, y, w, kelas) {
    var h = w * 0.62, x0 = cx - w / 2;
    return '<g class="' + (kelas || 'sgs-rumah') + '">' +
      '<path class="sgs-rumah-atap" d="M' + f(x0 - 8) + ' ' + f(y + h * 0.42) + ' L' + f(cx) + ' ' + f(y) + ' L' + f(x0 + w + 8) + ' ' + f(y + h * 0.42) + '"/>' +
      '<rect class="sgs-rumah-dinding" x="' + f(x0) + '" y="' + f(y + h * 0.36) + '" width="' + f(w) + '" height="' + f(h * 0.64) + '" rx="3"/>' +
      '<rect class="sgs-rumah-jendela" x="' + f(x0 + w * 0.16) + '" y="' + f(y + h * 0.52) + '" width="' + f(w * 0.26) + '" height="' + f(h * 0.24) + '" rx="2"/>' +
      '<rect class="sgs-rumah-pintu" x="' + f(x0 + w * 0.58) + '" y="' + f(y + h * 0.56) + '" width="' + f(w * 0.2) + '" height="' + f(h * 0.44) + '" rx="2"/>' +
    '</g>';
  }
  function defs() {
    return '<defs>' +
      '<radialGradient id="sgsCahaya"><stop offset="0" class="sgs-st-cahaya" stop-opacity="1"/><stop offset="1" class="sgs-st-cahaya" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="sgsHangat"><stop offset="0" class="sgs-st-hangat" stop-opacity="1"/><stop offset="1" class="sgs-st-hangat" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="sgsSenja" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sgs-st-senja-1"/><stop offset=".55" class="sgs-st-senja-2"/><stop offset="1" class="sgs-st-senja-3"/></linearGradient>' +
      '<linearGradient id="sgsLaut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sgs-st-laut-1"/><stop offset="1" class="sgs-st-laut-2"/></linearGradient>' +
    '</defs>';
  }

  /* ---------------- panel kantor & rumah (scene 1) ---------------- */
  function panelKantor(x, y, w, h) {
    return kotak(x, y, w, h, 'sgs-panel sgs-panel-kantor', 18) +
      '<rect class="sgs-jendela" x="' + f(x + 14) + '" y="' + f(y + 34) + '" width="' + f(w - 28) + '" height="' + f(h * 0.4) + '" rx="8"/>' +
      kota(x + 20, y + 44, w - 40, h * 0.4 - 12, 'sgs-kota sgs-kota-jendela');
  }
  function mejaKerja(x, y, w) {
    return '<g class="sgs-meja-kerja"><rect class="sgs-meja" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="12" rx="3"/>' +
      '<rect class="sgs-meja-depan" x="' + f(x + 6) + '" y="' + f(y + 12) + '" width="' + f(w - 12) + '" height="30" rx="3"/>' +
      '<g class="sgs-laptop"><path class="sgs-laptop-layar" d="M' + f(x + w - 62) + ' ' + f(y) + ' L' + f(x + w - 54) + ' ' + f(y - 34) + ' L' + f(x + w - 12) + ' ' + f(y - 34) + ' L' + f(x + w - 18) + ' ' + f(y) + ' Z"/>' +
      '<path class="sgs-laptop-cahaya" d="M' + f(x + w - 57) + ' ' + f(y - 4) + ' L' + f(x + w - 51) + ' ' + f(y - 29) + ' L' + f(x + w - 17) + ' ' + f(y - 29) + ' L' + f(x + w - 22) + ' ' + f(y - 4) + ' Z"/></g></g>';
  }
  function panelRumah(x, y, w, h) {
    var cx = x + w / 2;
    return kotak(x, y, w, h, 'sgs-panel sgs-panel-rumah', 18) +
      '<circle class="sgs-hangat" cx="' + f(cx) + '" cy="' + f(y + h * 0.4) + '" r="' + f(w * 0.55) + '" fill="url(#sgsHangat)"/>' +
      '<path class="sgs-rumah-atap sgs-atap-besar" d="M' + f(x + 18) + ' ' + f(y + 70) + ' L' + f(cx) + ' ' + f(y + 22) + ' L' + f(x + w - 18) + ' ' + f(y + 70) + '"/>' +
      '<rect class="sgs-jendela-rumah" x="' + f(x + w - 62) + '" y="' + f(y + 84) + '" width="40" height="44" rx="6"/>' +
      '<path class="sgs-jendela-silang" d="M' + f(x + w - 42) + ' ' + f(y + 84) + ' V' + f(y + 128) + ' M' + f(x + w - 62) + ' ' + f(y + 106) + ' H' + f(x + w - 22) + '"/>';
  }

  /* ---------------- komponen aliran penghasilan (scene 5, 6, 7, 9) ----------------
     Tata letak tetap: Singapura (Leo) kiri, Indonesia (keluarga) kanan,
     kurva aliran di antaranya. Koin bergerak di sepanjang kurva yang sama. */
  var AL = { p0: [182, 208], c: [240, 150], p1: [298, 208] };
  var KOIN_T = [0.24, 0.5, 0.76];
  function aliran(opsi) {
    var o = opsi || {};
    var sg = '<g class="sgs-sisi sgs-sisi-sg">' + kotak(14, 98, 168, 206, 'sgs-panel sgs-panel-sg', 18) +
      '<g class="sgs-sg-langit">' + kotaSG(98, 176, 0.72) + '</g>' +
      orang('sgs-leo', 98, 290, 0.6, LEO, 1) + '</g>' +
      '<g class="sgs-label-sg">' + bendera(58, 316, 24, 'SG') + teks(90, 331, 'LEO', 'sgs-f18 sgs-teks-1', 'start') + teks(98, 353, 'SINGAPURA', 'sgs-f17 sgs-teks-2') + '</g>';
    var id = '<g class="sgs-sisi sgs-sisi-id">' + kotak(298, 98, 168, 206, 'sgs-panel sgs-panel-id', 18) +
      '<circle class="sgs-hangat" cx="382" cy="210" r="96" fill="url(#sgsHangat)"/>' +
      rumahIkon(382, 114, 92, 'sgs-rumah sgs-rumah-id') +
      orang('sgs-istri', 360, 290, 0.6, ISTRI, -1) + orang('sgs-anak', 410, 290, 0.6, ANAK, -1) + '</g>' +
      '<g class="sgs-label-id">' + bendera(318, 316, 24, 'ID') + teks(350, 331, 'KELUARGA', 'sgs-f18 sgs-teks-1', 'start') + teks(382, 353, 'INDONESIA', 'sgs-f17 sgs-teks-2') + '</g>';
    var d = dKurva(AL.p0, AL.c, AL.p1);
    var jalur = '<g class="sgs-jalur">' +
      '<path class="sgs-rute-dasar" d="' + d + '"/>' +
      '<path class="sgs-rute-alir" d="' + d + '" pathLength="1"/>' +
      '<path class="sgs-rute-panah" d="M' + f(AL.p1[0] - 12) + ' ' + f(AL.p1[1] - 12) + ' L' + f(AL.p1[0]) + ' ' + f(AL.p1[1]) + ' L' + f(AL.p1[0] - 15) + ' ' + f(AL.p1[1] + 4) + '"/></g>';
    var koinG = '<g class="sgs-koin-grup">' + KOIN_T.map(function (t, i) {
      var p = kurva(AL.p0, AL.c, AL.p1, t);
      return '<g class="sgs-koin-pos sgs-koin-' + (i + 1) + '" transform="translate(' + f(p[0]) + ' ' + f(p[1]) + ')"><g class="sgs-koin-gerak">' + koin() + '</g></g>';
    }).join('') + '</g>';
    var baris = [].concat(o.label || 'PENGHASILAN');
    var label = '<g class="sgs-label-alir" style="' + asal(240, 238 + (baris.length - 1) * 11) + '">' +
      baris.map(function (b, i) { return teks(240, 244 + i * 22, b, 'sgs-f17 ' + (o.labelKelas || 'sgs-teks-emas')); }).join('') + '</g>';
    return sg + id + jalur + (o.tanpaKoin ? '' : koinG) + label;
  }
  /* koin mengalir (ambient, mulai pada t): fase tiap koin berbeda, bukan tunda,
     jadi tidak ada koin yang diam lalu melompat */
  function alirkan(tl, st, t, durasi) {
    var grup = satu(st, '.sgs-koin-grup');
    if (!grup) return;
    jejak(tl, grup, [[t, { opacity: 0 }], [t + 400, { opacity: 1 }]]);
    var n = 24, kf = [];
    for (var i = 0; i <= n; i++) {
      var tt = i / n, p = kurva(AL.p0, AL.c, AL.p1, tt);
      kf.push({ transform: 'translate(' + f(p[0]) + 'px,' + f(p[1]) + 'px)', opacity: tt < 0.08 ? tt / 0.08 : (tt > 0.92 ? (1 - tt) / 0.08 : 1), offset: tt });
    }
    semua(st, '.sgs-koin-pos').forEach(function (el, k) {
      /* posisi statis dipindah ke transform animasi: pembungkus di (0,0) selama mengalir */
      tl.loop(el, kf.map(function (x) { return Object.assign({}, x); }), { duration: durasi || 2400, delay: t, iterationStart: k / 3, easing: 'linear', fill: 'none' });
    });
  }
  /* kalender: halaman bertumpuk; halaman berikutnya membalik masuk */
  function kalender(cx, y, halaman) {
    var w = 118, h = 78, x0 = cx - w / 2;
    return '<g class="sgs-kalender" style="' + asal(cx, y) + '">' +
      kotak(x0, y, w, h, 'sgs-kal-badan', 12) + '<rect class="sgs-kal-atas" x="' + f(x0) + '" y="' + f(y) + '" width="' + w + '" height="22" rx="10"/>' +
      '<rect class="sgs-kal-atas" x="' + f(x0) + '" y="' + f(y + 12) + '" width="' + w + '" height="10"/>' +
      '<circle class="sgs-kal-cincin" cx="' + f(x0 + 30) + '" cy="' + f(y + 4) + '" r="4"/><circle class="sgs-kal-cincin" cx="' + f(x0 + w - 30) + '" cy="' + f(y + 4) + '" r="4"/>' +
      halaman.map(function (hl, i) {
        return '<g class="sgs-hal sgs-hal-' + (i + 1) + '" style="' + asal(cx, y + 22) + (i < halaman.length - 1 ? ';opacity:0' : '') + '">' + teks(cx, y + 60, hl, i === halaman.length - 1 ? 'sgs-f22 sgs-teks-aksen' : 'sgs-f20 sgs-teks-1') + '</g>';
      }).join('') + '</g>';
  }
  /* halaman kalender berganti berurutan pada waktu w[i]; halaman terakhir tetap */
  function balikKalender(tl, st, waktu) {
    var hal = semua(st, '.sgs-hal');
    hal.forEach(function (el, i) {
      var masuk = waktu[i], keluar = waktu[i + 1];
      var fr = [[0, { opacity: 0, transform: 'scaleY(.2)' }], [masuk, { opacity: 0, transform: 'scaleY(.2)' }], [masuk + 180, { opacity: 1, transform: 'none' }, PEGAS]];
      if (keluar != null) fr.push([keluar, { opacity: 1, transform: 'none' }], [keluar + 140, { opacity: 0, transform: 'scaleY(.2)' }, JATUH]);
      jejak(tl, el, fr);
    });
  }
  /* kartu pertanyaan (dua baris) */
  function tanya(y, baris, kelas) {
    var h = 30 + baris.length * 26;
    return '<g class="sgs-tanya ' + (kelas || '') + '" style="' + asal(240, y + h / 2) + '">' + kotak(26, y, 428, h, 'sgs-kartu-tanya', 16) +
      baris.map(function (b, i) { return teks(240, y + 35 + i * 26, b, 'sgs-f20 sgs-teks-1'); }).join('') + '</g>';
  }

  var S = [];

  /* ---------------- scene 1: Pak Leo dan keluarganya ---------------- */
  S[1] = {
    set: function () {
      return latar('sgs-langit-studio') + lantai(300, 'sgs-lantai') +
        teks(240, 36, 'KENALKAN, PAK LEO', 'sgs-f20 sgs-judul') +
        '<g class="sgs-kantor" style="' + asal(125, 170) + '">' + panelKantor(18, 54, 214, 226) +
          orang('sgs-leo-kerja', 96, 262, 0.72, LEO, 1) + mejaKerja(40, 226, 176) +
          '<g class="sgs-bintang" style="' + asal(196, 116) + '"><circle class="sgs-bintang-lingkar" cx="196" cy="116" r="17"/>' +
            '<path class="sgs-bintang-isi" d="M196 104 L199.6 111.6 L207.8 112.4 L201.6 118 L203.4 126 L196 121.8 L188.6 126 L190.4 118 L184.2 112.4 L192.4 111.6 Z"/></g>' +
          pil(82, 72, 110, 26, 'DI KANTOR', 'sgs-chip', 'sgs-f17 sgs-teks-2') +
        '</g>' +
        '<g class="sgs-rumah-panel" style="' + asal(355, 170) + '">' + panelRumah(248, 54, 214, 226) +
          orang('sgs-leo-rumah', 290, 268, 0.66, LEO, 1) + orang('sgs-istri', 350, 268, 0.66, ISTRI, -1) + orang('sgs-anak', 402, 268, 0.66, ANAK, -1) +
          pil(310, 72, 104, 26, 'DI RUMAH', 'sgs-chip', 'sgs-f17 sgs-teks-2') +
        '</g>' +
        '<g class="sgs-hati" style="' + asal(240, 166) + '"><circle class="sgs-hati-lingkar" cx="240" cy="166" r="17"/>' +
          '<path class="sgs-hati-isi" d="M240 175 C230 167 227 161 231 157 C234 154 238 155 240 158 C242 155 246 154 249 157 C253 161 250 167 240 175 Z"/></g>' +
        pil(128, 316, 212, 34, 'Rp15 JUTA / BULAN', 'sgs-pil-emas', 'sgs-f18 sgs-teks-emas', 'sgs-gaji-1') +
        pil(352, 316, 212, 34, 'Rp180 JUTA / TAHUN', 'sgs-pil', 'sgs-f18 sgs-teks-1', 'sgs-gaji-2');
    },
    /* ketukan: (a) Pak Leo di kantor · (b) pekerja keras, berprestasi → keluarga di rumah, penghasilan */
    ketuk: [2600, 5600],
    animate: function (tl, st, K) {
      pudar(tl, satu(st, '.sgs-judul'), 0, 600);
      jejak(tl, satu(st, '.sgs-kantor'), [[150, { opacity: 0, transform: 'translateY(16px) scale(.97)' }], [900, { opacity: 1, transform: 'none' }]]);
      pop(tl, satu(st, '.sgs-leo-kerja'), 500, 600);
      var tKeras = Math.max(K.B[1] + 100, K.kata(1, 'pekerja keras') - 150);
      var tPrestasi = Math.max(tKeras + 900, K.kata(1, 'berprestasi') - 150);
      var tKeluarga = Math.max(tPrestasi + 900, K.kata(1, 'keluarganya') - 900);
      jejak(tl, satu(st, '.sgs-laptop-cahaya'), [[tKeras, { opacity: 0.4 }], [tKeras + 300, { opacity: 1 }], [tKeras + 700, { opacity: 0.6 }], [tKeras + 1100, { opacity: 1 }]]);
      pop(tl, satu(st, '.sgs-bintang'), tPrestasi, 520);
      jejak(tl, satu(st, '.sgs-rumah-panel'), [[tKeluarga, { opacity: 0, transform: 'translateX(40px)' }], [tKeluarga + 800, { opacity: 1, transform: 'none' }]]);
      var tH = tKeluarga + 600;
      jejak(tl, satu(st, '.sgs-hati'), [[tH, { opacity: 0, transform: 'scale(.4)' }], [tH + 520, { opacity: 1, transform: 'none' }, PEGAS],
        [tH + 700, { transform: 'none' }], [tH + 980, { transform: 'scale(1.18)' }], [tH + 1460, { transform: 'none' }, LEMBUT]]);
      var tGaji = Math.min(K.akhir - 1400, tKeluarga + 1200);
      pop(tl, satu(st, '.sgs-gaji-1'), tGaji, 560);
      pop(tl, satu(st, '.sgs-gaji-2'), tGaji + 500, 560);
      tl.loop(satu(st, '.sgs-hangat'), [{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }], { duration: 4200, delay: tKeluarga + 800 });
    }
  };

  /* ---------------- scene 2: panggilan dari atasan ---------------- */
  var L2 = { dari: 104, ke: 262 };
  S[2] = {
    set: function () {
      return latar('sgs-langit-studio') + lantai(302, 'sgs-lantai') +
        '<rect class="sgs-dinding-kantor" x="-700" y="140" width="1880" height="162"/>' +
        kota(-40, 150, 250, 120, 'sgs-kota sgs-kota-jauh') +
        '<g class="sgs-ruang-rapat"><rect class="sgs-kaca" x="296" y="140" width="176" height="162" rx="6"/>' +
          '<path class="sgs-kaca-garis" d="M296 186 H472 M384 140 V302"/>' +
          '<rect class="sgs-meja" x="330" y="262" width="130" height="12" rx="4"/></g>' +
        orang('sgs-bos', 414, 302, 0.72, BOS, -1) +
        orang('sgs-leo', L2.ke, 302, 0.72, LEO, 1) +
        mejaKerja(24, 252, 150) +
        '<g class="sgs-panggil" style="' + asal(430, 118) + '">' + kotak(392, 98, 78, 38, 'sgs-bubble', 14) + teks(431, 124, 'Leo!', 'sgs-f20 sgs-teks-1') +
          '<path class="sgs-bubble-ekor" d="M420 136 L416 150 L432 136 Z"/></g>' +
        '<g class="sgs-dialog sgs-dialog-1" style="' + asal(300, 44) + '">' + kotak(96, 12, 374, 62, 'sgs-bubble', 16) +
          teks(283, 37, '“Leo, perusahaan kita sedang', 'sgs-f18 sgs-teks-1') + teks(283, 61, 'ekspansi ke Singapura.”', 'sgs-f18 sgs-teks-aksen') +
          '<path class="sgs-bubble-ekor" d="M398 74 L410 92 L420 74 Z"/></g>' +
        '<g class="sgs-dialog sgs-dialog-2" style="' + asal(300, 108) + '">' + kotak(96, 82, 374, 58, 'sgs-bubble', 16) +
          teks(283, 106, '“Kami ingin kamu menangani', 'sgs-f18 sgs-teks-1') + teks(283, 129, 'project ini.”', 'sgs-f18 sgs-teks-1') + '</g>';
    },
    siap: function (st) { var p = satu(st, '.sgs-panggil'); if (p) p.style.opacity = '0'; },
    /* ketukan: (a) atasan memanggil · (b) Leo masuk, ekspansi ke Singapura · (c) project untuk Leo */
    ketuk: [2800, 4400, 3200],
    animate: function (tl, st, K) {
      var leo = satu(st, '.sgs-leo'), dx = 'translateX(' + (L2.dari - L2.ke) + 'px)', tA = Math.max(K.B[1] + 2100, K.B[2] + 900);
      /* satu jejak transform: berjalan ke ruang rapat, lalu mengangguk */
      jejak(tl, leo, [[0, { transform: dx }], [K.B[1] + 200, { transform: dx }], [K.B[1] + 2000, { transform: 'none' }, 'linear'],
        [tA, { transform: 'none' }], [tA + 250, { transform: 'translateY(-4px)' }], [tA + 500, { transform: 'none' }], [tA + 750, { transform: 'translateY(-4px)' }], [tA + 1000, { transform: 'none' }]]);
      jalan(tl, leo, K.B[1] + 200, 1800, 6);
      jejak(tl, satu(st, '.sgs-bos'), [[300, { opacity: 0, transform: 'translateX(26px)' }], [1100, { opacity: 1, transform: 'none' }]]);
      var tPanggil = Math.max(900, K.kata(0, 'memanggil') - 200);
      jejak(tl, satu(st, '.sgs-panggil'), [[tPanggil, { opacity: 0, transform: 'scale(.4)' }], [tPanggil + 420, { opacity: 1, transform: 'none' }, PEGAS], [K.B[1] + 600, { opacity: 1, transform: 'none' }], [K.B[1] + 1000, { opacity: 0, transform: 'scale(.8)' }]]);
      pop(tl, satu(st, '.sgs-dialog-1'), K.B[1] + 900, 520);
      pop(tl, satu(st, '.sgs-dialog-2'), K.B[2] + 150, 520);
    }
  };

  /* ---------------- scene 3: kesempatan besar ---------------- */
  S[3] = {
    set: function () {
      var map = '';
      [0, 1, 2].forEach(function (i) {
        map += '<g class="sgs-map sgs-map-' + (i + 1) + '"><rect class="sgs-map-isi" x="' + (206 + i * 4) + '" y="' + (282 - i * 14) + '" width="68" height="12" rx="3"/>' +
          '<rect class="sgs-map-tab" x="' + (212 + i * 4) + '" y="' + (278 - i * 14) + '" width="22" height="6" rx="2"/></g>';
      });
      return latar('sgs-langit-studio') + lantai(312, 'sgs-lantai') +
        '<rect class="sgs-dinding-kantor" x="-700" y="120" width="1880" height="192"/>' +
        orang('sgs-leo', 70, 312, 0.66, LEO, 1) + orang('sgs-bos', 412, 312, 0.66, BOS, -1) +
        '<g class="sgs-tanggung">' + map + teks(244, 334, 'TANGGUNG JAWAB', 'sgs-f17 sgs-teks-2') + '</g>' +
        '<g class="sgs-gaji-lama" style="' + asal(240, 52) + '">' + kotak(146, 30, 188, 44, 'sgs-pil', 22) + teks(240, 59, 'Rp15 JUTA / BULAN', 'sgs-f18 sgs-teks-2') + '</g>' +
        garis('M240 80 L240 112', 'sgs-panah-garis') + '<path class="sgs-panah-ujung" d="M231 104 L240 116 L249 104"/>' +
        '<g class="sgs-gaji-baru" style="' + asal(240, 148) + '">' + kotak(92, 120, 296, 56, 'sgs-pil-emas', 22) + teks(240, 156, 'Rp30–50 JUTA / BULAN', 'sgs-f22 sgs-teks-emas') + '</g>' +
        '<g class="sgs-kali" style="' + asal(240, 206) + '">' + kotak(144, 188, 192, 36, 'sgs-pil-merah', 18) + teks(240, 212.5, '2–3× PENGHASILAN', 'sgs-f18 sgs-teks-putih') + '</g>' +
        '<g class="sgs-terima" style="' + asal(70, 134) + '"><circle class="sgs-terima-lingkar" cx="70" cy="134" r="18"/><path class="sgs-terima-centang" d="M61 134 L68 141 L80 127" pathLength="1"/></g>';
    },
    siap: function (st) { var g = satu(st, '.sgs-gaji-lama'); if (g) g.style.opacity = '0.55'; },
    /* ketukan: (a) tanggung jawab bertambah · (b) penghasilan naik · (c) 2–3 kali lipat, Leo menerima */
    ketuk: [2800, 3200, 3000],
    animate: function (tl, st, K) {
      jejak(tl, satu(st, '.sgs-leo'), [[0, { opacity: 0, transform: 'translateX(-20px)' }], [700, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.sgs-bos'), [[150, { opacity: 0, transform: 'translateX(20px)' }], [850, { opacity: 1, transform: 'none' }]]);
      [1, 2, 3].forEach(function (i) {
        var t = Math.max(700, K.kata(0, 'lebih besar') - 900) + (i - 1) * 420;
        jejak(tl, satu(st, '.sgs-map-' + i), [[t, { opacity: 0, transform: 'translateY(-30px)' }], [t + 360, { opacity: 1, transform: 'none' }, JATUH]]);
      });
      pudar(tl, satu(st, '.sgs-tanggung text'), 900, 500);
      var tNaik = Math.max(K.B[1] + 100, K.kata(1, 'meningkat') - 400);
      gambarGaris(tl, satu(st, '.sgs-panah-garis'), tNaik, 500);
      pudar(tl, satu(st, '.sgs-panah-ujung'), tNaik + 350, 300);
      var tKali = Math.max(K.B[2] + 100, K.kata(2, 'dua sampai tiga') - 200);
      jejak(tl, satu(st, '.sgs-gaji-lama'), [[500, { opacity: 0, transform: 'translateY(10px)' }], [1100, { opacity: 1, transform: 'none' }], [tNaik + 450, { opacity: 1 }], [tNaik + 900, { opacity: 0.55 }]]);
      jejak(tl, satu(st, '.sgs-gaji-baru'), [[tNaik + 450, { opacity: 0, transform: 'translateY(18px) scale(.8)' }], [tNaik + 1050, { opacity: 1, transform: 'none' }, PEGAS],
        [tKali + 400, { transform: 'none' }], [tKali + 680, { transform: 'scale(1.06)' }], [tKali + 1160, { transform: 'none' }, LEMBUT]]);
      pop(tl, satu(st, '.sgs-kali'), tKali, 520);
      pop(tl, satu(st, '.sgs-terima'), tKali + 1100, 520);
      gambarGaris(tl, satu(st, '.sgs-terima-centang'), tKali + 1300, 420);
    }
  };

  /* ---------------- scene 4: Indonesia → Singapura (peta, pesawat bergerak) ---------------- */
  var R4 = { p0: [262, 298], c: [334, 176], p1: [176, 112] };
  var T4 = { terbang: 2200, lama: 3800 };
  S[4] = {
    set: function () {
      var d = dKurva(R4.p0, R4.c, R4.p1), ujung = sudut(R4.p0, R4.c, R4.p1, 1);
      var darat =
        '<path class="sgs-darat" d="M40 -80 L118 -80 L150 30 L168 92 L150 106 L122 84 L90 20 Z"/>' +
        '<path class="sgs-darat" d="M10 76 L58 62 L142 148 L236 246 L242 292 L206 302 L108 208 L26 124 Z"/>' +
        '<path class="sgs-darat" d="M246 290 L332 294 L424 306 L500 324 L496 342 L384 338 L290 332 L242 316 Z"/>' +
        '<path class="sgs-darat" d="M272 86 L360 64 L432 92 L454 168 L414 232 L330 244 L288 204 L268 142 Z"/>' +
        '<path class="sgs-darat" d="M520 120 L560 110 L566 170 L600 200 L570 214 L548 180 L526 230 L506 200 Z"/>' +
        '<path class="sgs-darat" d="M-120 60 L-40 40 L-10 120 L-80 150 Z"/>';
      return '<rect class="sgs-laut" x="-700" y="-700" width="1880" height="1760" fill="url(#sgsLaut)"/>' +
        '<g class="sgs-garis-lintang"><path d="M-700 60 H1180 M-700 180 H1180 M-700 300 H1180 M60 -700 V1060 M240 -700 V1060 M420 -700 V1060"/></g>' +
        '<g class="sgs-peta">' + darat +
          '<ellipse class="sgs-darat-sg" cx="176" cy="112" rx="10" ry="5.5"/>' +
          teks(372, 186, 'INDONESIA', 'sgs-f22 sgs-peta-label') + '</g>' +
        '<path class="sgs-rute-titik" d="' + d + '"/>' +
        '<path class="sgs-rute-jejak" d="' + d + '" pathLength="1"/>' +
        '<g class="sgs-asal" style="' + asal(262, 298) + '"><circle class="sgs-pin-gelombang" cx="262" cy="298" r="16" style="' + asal(262, 298) + '"/><circle class="sgs-pin" cx="262" cy="298" r="6.5"/>' +
          teks(262, 327, 'JAKARTA', 'sgs-f17 sgs-teks-1') + bendera(304, 314, 21, 'ID') + '</g>' +
        '<g class="sgs-tujuan" style="' + asal(176, 112) + '"><circle class="sgs-pin-gelombang sgs-pin-sg" cx="176" cy="112" r="18" style="' + asal(176, 112) + '"/><circle class="sgs-pin sgs-pin-sg" cx="176" cy="112" r="7"/>' +
          bendera(196, 122, 24, 'SG') + teks(226, 139, 'SINGAPURA', 'sgs-f18 sgs-teks-1', 'start') + '</g>' +
        '<g class="sgs-pesawat" transform="translate(' + f(R4.p1[0]) + ' ' + f(R4.p1[1]) + ') rotate(' + f(ujung) + ')"><g class="sgs-pesawat-isi" transform="scale(.9)">' + PESAWAT + '</g></g>' +
        '<g class="sgs-strip" style="' + asal(240, 36) + '">' + kotak(84, 14, 312, 44, 'sgs-pil', 22) +
          teks(186, 43, 'INDONESIA', 'sgs-f18 sgs-teks-1', 'end') + '<g transform="translate(240 36) scale(.62)">' + PESAWAT + '</g>' + teks(294, 43, 'SINGAPURA', 'sgs-f18 sgs-teks-1', 'start') + '</g>' +
        '<g class="sgs-welcome" style="' + asal(240, 36) + '">' + kotak(64, 12, 352, 48, 'sgs-pil-merah', 24) + teks(240, 43.5, 'WELCOME TO SINGAPORE', 'sgs-f22 sgs-teks-putih') + '</g>';
    },
    siap: function (st) { var s = satu(st, '.sgs-strip'); if (s) s.style.opacity = '0'; },
    ketuk: [],
    durasi: 8200,
    animate: function (tl, st) {
      pudar(tl, satu(st, '.sgs-peta'), 0, 900);
      jejak(tl, satu(st, '.sgs-strip'), [[500, { opacity: 0, transform: 'translateY(-10px)' }], [1100, { opacity: 1, transform: 'none' }], [T4.terbang + T4.lama + 500, { opacity: 1, transform: 'none' }], [T4.terbang + T4.lama + 800, { opacity: 0, transform: 'scale(.94)' }]]);
      pop(tl, satu(st, '.sgs-asal'), 900, 500);
      tl.loop(satu(st, '.sgs-asal .sgs-pin-gelombang'), [{ opacity: 0.9, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 1600, easing: 'ease-out', delay: 900 });
      jejak(tl, satu(st, '.sgs-rute-titik'), [[1200, { opacity: 0 }], [1800, { opacity: 1 }]]);
      /* pesawat benar-benar menempuh rute: 36 titik pada kurva, arah = garis singgung */
      var n = 36, t0 = T4.terbang, D = t0 + T4.lama, kf = [];
      function pose(e) {
        var p = kurva(R4.p0, R4.c, R4.p1, e), a = sudut(R4.p0, R4.c, R4.p1, Math.min(0.999, Math.max(0.001, e)));
        return 'translate(' + f(p[0]) + 'px,' + f(p[1]) + 'px) rotate(' + f(a) + 'deg) scale(' + f(0.8 + 0.35 * Math.sin(Math.PI * e)) + ')';
      }
      /* tersembunyi di Jakarta, muncul saat lepas landas, lalu menempuh rute (ease in-out) */
      kf.push({ transform: pose(0), opacity: 0, offset: 0 });
      kf.push({ transform: pose(0), opacity: 0, offset: (t0 - 350) / D });
      kf.push({ transform: pose(0), opacity: 1, offset: t0 / D });
      for (var i = 1; i <= n; i++) {
        var tt = i / n, e = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2;
        kf.push({ transform: pose(e), opacity: 1, offset: (t0 + tt * T4.lama) / D });
      }
      tl.add(satu(st, '.sgs-pesawat'), kf, { duration: D, easing: 'linear', fill: 'backwards' });
      gambarGaris(tl, satu(st, '.sgs-rute-jejak'), t0, T4.lama, 'cubic-bezier(.45,0,.55,1)');
      var tiba = t0 + T4.lama;
      pop(tl, satu(st, '.sgs-tujuan'), tiba - 300, 520);
      tl.loop(satu(st, '.sgs-tujuan .sgs-pin-gelombang'), [{ opacity: 0.9, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.8)' }], { duration: 1600, easing: 'ease-out', delay: tiba });
      jejak(tl, satu(st, '.sgs-welcome'), [[tiba + 600, { opacity: 0, transform: 'scale(.5)' }], [tiba + 1150, { opacity: 1, transform: 'none' }, PEGAS]]);
    }
  };

  /* ---------------- scene 5: satu tahun ---------------- */
  S[5] = {
    set: function () {
      return latar('sgs-langit-studio') + lantai(304, 'sgs-lantai') + aliran({ label: 'PENGHASILAN' }) +
        kalender(240, 12, ['JAN', 'APR', 'JUL', 'OKT', 'DES', '1 TAHUN']);
    },
    /* ketukan: (a) jauh dari rumah, kalender menuju 1 tahun · (b) setiap bulan ada yang sampai · (c) Penghasilannya. */
    ketuk: [3400, 3600, 2800],
    jeda: [600, 1500, 0],
    animate: function (tl, st, K) {
      jejak(tl, satu(st, '.sgs-sisi-sg'), [[0, { opacity: 0, transform: 'translateX(-24px)' }], [800, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.sgs-sisi-id'), [[250, { opacity: 0, transform: 'translateX(24px)' }], [1050, { opacity: 1, transform: 'none' }]]);
      pudar(tl, satu(st, '.sgs-label-sg'), 600, 500);
      pudar(tl, satu(st, '.sgs-label-id'), 800, 500);
      pop(tl, satu(st, '.sgs-kalender'), 700, 500);
      var a = 1000, b = Math.max(a + 2200, K.B[1] - 200), w = [];
      for (var i = 0; i < 6; i++) w.push(a + (b - a) * i / 5);
      balikKalender(tl, st, w);
      pudar(tl, satu(st, '.sgs-rute-dasar'), K.B[1], 500);
      gambarGaris(tl, satu(st, '.sgs-rute-alir'), K.B[1] + 200, 1100);
      pudar(tl, satu(st, '.sgs-rute-panah'), K.B[1] + 1100, 300);
      alirkan(tl, st, K.B[1] + 900, 2400);
      var tP = K.B[2] + 80;
      jejak(tl, satu(st, '.sgs-label-alir'), [[tP, { opacity: 0, transform: 'scale(.5)' }], [tP + 480, { opacity: 1, transform: 'scale(1.18)' }, PEGAS], [tP + 1300, { opacity: 1, transform: 'none' }, LEMBUT]]);
      jejak(tl, satu(st, '.sgs-sisi-id .sgs-hangat'), [[tP, { opacity: 0.5 }], [tP + 500, { opacity: 1 }]]);
      denyut(tl, satu(st, '.sgs-rumah-id'), tP + 200, 1.08);
    }
  };

  /* ---------------- scene 6: dua tahun ---------------- */
  /* ikon kebutuhan keluarga: makan, sekolah, rumah (berpusat di 0,0) */
  var IKON_BUTUH = [
    '<path class="sgs-ikon" d="M-9 -1 H9 C9 6 5 9 0 9 C-5 9 -9 6 -9 -1 Z"/><path class="sgs-ikon-garis" d="M-4 -5 C-6 -8 -2 -9 -4 -12 M2 -5 C0 -8 4 -9 2 -12"/>',
    '<path class="sgs-ikon" d="M-10 -6 L0 -10 L10 -6 L0 -2 Z"/><path class="sgs-ikon-garis" d="M-6 -4 V3 C-3 6 3 6 6 3 V-4 M10 -6 V2"/>',
    '<path class="sgs-ikon" d="M-10 0 L0 -9 L10 0 L10 9 L-10 9 Z"/><rect class="sgs-ikon-lubang" x="-3" y="2" width="6" height="7" rx="1"/>'
  ];
  S[6] = {
    set: function () {
      return latar('sgs-langit-studio') + lantai(304, 'sgs-lantai') + aliran({ label: 'PENGHASILAN' }) +
        kalender(240, 12, ['TAHUN 1', 'TAHUN 2']) +
        '<g class="sgs-butuh">' + IKON_BUTUH.map(function (b, i) {
          var x = 336 + i * 46;
          return '<g class="sgs-butuh-' + (i + 1) + '" style="' + asal(x, 86) + '"><circle class="sgs-butuh-lingkar" cx="' + x + '" cy="86" r="17"/>' +
            '<g transform="translate(' + x + ' 86)">' + b + '</g></g>';
        }).join('') + '</g>';
    },
    /* ketukan: (a) Satu tahun… · (b) Dua tahun… · (c) selama masih bekerja, penghasilan dikirim untuk kebutuhan */
    ketuk: [2000, 2000, 5200],
    jeda: [900, 900, 0],
    animate: function (tl, st, K) {
      pudar(tl, satu(st, '.sgs-rute-dasar'), 0, 300);
      jejak(tl, satu(st, '.sgs-rute-alir'), [[0, { opacity: 0.4 }], [600, { opacity: 1 }]]);
      alirkan(tl, st, 300, 2400);
      balikKalender(tl, st, [200, K.B[1] + 100]);
      denyut(tl, satu(st, '.sgs-kalender'), K.B[1] + 100, 1.08);
      var tB = Math.max(K.B[2] + 200, K.kata(2, 'kebutuhan keluarganya') - 500);
      [1, 2, 3].forEach(function (i) { pop(tl, satu(st, '.sgs-butuh-' + i), tB + (i - 1) * 260, 420); });
      jejak(tl, satu(st, '.sgs-label-alir'), [[K.B[2] + 200, { opacity: 0.6 }], [K.B[2] + 700, { opacity: 1 }]]);
    }
  };

  /* ---------------- scene 7: pertanyaan ---------------- */
  S[7] = {
    set: function () {
      return latar('sgs-langit-studio') + lantai(304, 'sgs-lantai') + aliran({ label: 'PENGHASILAN' }) +
        '<g class="sgs-pulang" style="' + asal(240, 56) + '">' + kotak(128, 38, 224, 36, 'sgs-chip', 18) + teks(240, 62, 'BUKAN HANYA PULANG', 'sgs-f17 sgs-teks-2') + '</g>' +
        '<g class="sgs-sehari" style="' + asal(240, 276) + '">' + kotak(186, 264, 108, 30, 'sgs-pil-emas', 15) + teks(240, 285, 'SEHARI-HARI', 'sgs-f17 sgs-teks-emas') + '</g>' +
        '<rect class="sgs-redup" x="-700" y="-700" width="1880" height="1760"/>' +
        tanya(118, ['Bagaimana kalau suatu hari', 'Leo tidak bisa lagi bekerja?'], 'sgs-tanya-7');
    },
    /* ketukan: (a) bukan hanya pulang · (b) keluarga butuh penghasilan · JEDA panjang · (c) pertanyaan */
    ketuk: [3200, 3600, 3400],
    jeda: [700, 2400, 0],
    animate: function (tl, st, K) {
      pudar(tl, satu(st, '.sgs-rute-dasar'), 0, 300);
      jejak(tl, satu(st, '.sgs-rute-alir'), [[0, { opacity: 0.4 }], [600, { opacity: 1 }]]);
      alirkan(tl, st, 200, 2400);
      pop(tl, satu(st, '.sgs-pulang'), Math.max(500, K.kata(0, 'pulang ke rumah') - 500), 480);
      var tB = Math.max(K.B[1] + 100, K.kata(1, 'penghasilan kita') - 300);
      denyut(tl, satu(st, '.sgs-label-alir'), tB, 1.16);
      pop(tl, satu(st, '.sgs-sehari'), Math.max(tB + 500, K.kata(1, 'sehari-hari') - 300), 480);
      jejak(tl, satu(st, '.sgs-sisi-id .sgs-hangat'), [[tB, { opacity: 0.6 }], [tB + 600, { opacity: 1 }]]);
      var tQ = K.B[2] + 100;
      jejak(tl, satu(st, '.sgs-redup'), [[tQ, { opacity: 0 }], [tQ + 700, { opacity: 1 }]]);
      jejak(tl, satu(st, '.sgs-tanya-7'), [[tQ + 200, { opacity: 0, transform: 'translateY(16px) scale(.94)' }], [tQ + 900, { opacity: 1, transform: 'none' }]]);
    }
  };

  /* ---------------- scene 8: panggilan yang berbeda (tenang, simbolis) ---------------- */
  var L8 = { dari: 112, ke: 346 };
  S[8] = {
    set: function () {
      var sinar = '';
      for (var i = 0; i < 9; i++) {
        var a = -80 + i * 20, r = a * Math.PI / 180;
        sinar += '<path d="M372 238 L' + f(372 + Math.sin(r) * 520) + ' ' + f(238 - Math.cos(r) * 520) + '"/>';
      }
      return '<rect class="sgs-senja" x="-700" y="-700" width="1880" height="1760" fill="url(#sgsSenja)"/>' +
        '<g class="sgs-sinar" style="' + asal(372, 238) + '">' + sinar + '</g>' +
        '<circle class="sgs-cahaya-besar" cx="372" cy="238" r="210" fill="url(#sgsCahaya)" style="' + asal(372, 238) + '"/>' +
        '<circle class="sgs-cahaya-inti" cx="372" cy="238" r="46" fill="url(#sgsCahaya)" style="' + asal(372, 238) + '"/>' +
        '<rect class="sgs-bumi" x="-700" y="240" width="1880" height="900"/>' +
        '<path class="sgs-jalan-cahaya" d="M40 360 L150 360 L372 244 L366 244 Z"/>' +
        '<g class="sgs-partikel"><circle cx="300" cy="170" r="2.4"/><circle cx="420" cy="140" r="1.8"/><circle cx="250" cy="120" r="1.6"/><circle cx="455" cy="200" r="2.2"/><circle cx="330" cy="96" r="1.4"/></g>' +
        '<g class="sgs-leo-pergi" style="opacity:.16">' + orang('sgs-leo', L8.ke, 250, 0.42, LEO, 1) + '</g>';
    },
    /* ketukan: (a) bukan perusahaan · (b) Tuhan Yang Maha Kuasa · (c) pekerjaan yang tidak pernah selesai · (d) tidak kembali */
    ketuk: [3000, 2400, 3400, 3400],
    jeda: [1400, 1600, 1200, 1400],
    animate: function (tl, st, K) {
      pudar(tl, satu(st, '.sgs-senja'), 0, 1600);
      jejak(tl, satu(st, '.sgs-cahaya-besar'), [[0, { opacity: 0.25, transform: 'scale(.6)' }], [K.B[1], { opacity: 0.55, transform: 'scale(.8)' }], [K.B[1] + 1600, { opacity: 1, transform: 'none' }, LEMBUT]]);
      jejak(tl, satu(st, '.sgs-cahaya-inti'), [[0, { opacity: 0.4 }], [K.B[1] + 1200, { opacity: 1 }]]);
      jejak(tl, satu(st, '.sgs-sinar'), [[K.B[1], { opacity: 0, transform: 'scale(.7)' }], [K.B[1] + 1800, { opacity: 1, transform: 'none' }, LEMBUT]]);
      var grup = satu(st, '.sgs-leo-pergi'), leo = satu(st, '.sgs-leo');
      /* berdiri dekat, lalu berjalan menjauh menuju cahaya: mengecil dan memudar */
      var tJalan = K.B[2] + 200, lama = Math.max(3200, K.B[3] + 1600 - tJalan);
      jejak(tl, leo, [[0, { transform: 'translate(' + (L8.dari - L8.ke) + 'px,96px) scale(1.9)' }], [tJalan, { transform: 'translate(' + (L8.dari - L8.ke) + 'px,96px) scale(1.9)' }], [tJalan + lama, { transform: 'none' }, 'cubic-bezier(.3,.1,.5,1)']]);
      jalan(tl, leo, tJalan, lama, 10);
      jejak(tl, grup, [[0, { opacity: 0 }], [900, { opacity: 1 }], [K.B[3] + 200, { opacity: 1 }], [K.B[3] + 2600, { opacity: 0.16 }, LEMBUT]]);
      tl.loop(satu(st, '.sgs-partikel'), [{ transform: 'none', opacity: 0.8 }, { transform: 'translate(0px,-10px)', opacity: 0.4 }, { transform: 'none', opacity: 0.8 }], { duration: 7000 });
    }
  };

  /* ---------------- scene 9: penghasilan berhenti ---------------- */
  S[9] = {
    set: function () {
      return latar('sgs-langit-studio') + lantai(304, 'sgs-lantai') + aliran({ label: ['PENGHASILAN', 'BERHENTI'], labelKelas: 'sgs-teks-aksen' }) +
        '<g class="sgs-putus" style="' + asal(240, 166) + '"><circle class="sgs-putus-lingkar" cx="240" cy="166" r="15"/><path class="sgs-putus-x" d="M233 159 L247 173 M247 159 L233 173"/></g>' +
        '<g class="sgs-koin-jatuh" transform="translate(240 286)">' + koin() + '</g>' +
        tanya(12, ['Siapa yang akan membawa pulang', 'penghasilan untuk keluarganya?'], 'sgs-tanya-9');
    },
    siap: function (st) {
      gaya(st, { '.sgs-leo': { opacity: 0.14 }, '.sgs-panel-sg': { opacity: 0.55 }, '.sgs-sg-langit': { opacity: 0.4 }, '.sgs-koin-grup': { opacity: 0 }, '.sgs-rute-alir': { opacity: 0 }, '.sgs-sisi-id .sgs-hangat': { opacity: 0.35 } });
    },
    /* ketukan: (a) Leo tidak bisa bekerja, aliran berhenti · JEDA · (b) siapa yang membawa pulang? */
    ketuk: [4200, 3600],
    jeda: [1800, 0],
    animate: function (tl, st, K) {
      /* aliran yang sama dengan scene 5–6 masih berjalan … */
      var n = 24, kf = [];
      for (var i = 0; i <= n; i++) {
        var tt = i / n, p = kurva(AL.p0, AL.c, AL.p1, tt);
        kf.push({ transform: 'translate(' + f(p[0]) + 'px,' + f(p[1]) + 'px)', opacity: tt < 0.08 ? tt / 0.08 : (tt > 0.92 ? (1 - tt) / 0.08 : 1), offset: tt });
      }
      var tHenti = Math.max(1400, K.kata(0, 'tidak bisa bekerja') - 300);
      jejak(tl, satu(st, '.sgs-koin-grup'), [[0, { opacity: 1 }], [tHenti, { opacity: 1 }], [tHenti + 500, { opacity: 0 }]]);
      semua(st, '.sgs-koin-pos').forEach(function (el, k) {
        tl.add(el, kf, { duration: 2400, iterationStart: k / 3, iterations: Math.max(1, (tHenti + 400) / 2400), easing: 'linear', fill: 'none' });
      });
      jejak(tl, satu(st, '.sgs-rute-alir'), [[0, { opacity: 1 }], [tHenti, { opacity: 1 }], [tHenti + 700, { opacity: 0 }]]);
      /* … lalu berhenti: Leo memudar, jalur terputus, satu koin jatuh */
      jejak(tl, satu(st, '.sgs-leo'), [[tHenti, { opacity: 1 }], [tHenti + 1400, { opacity: 0.14 }, LEMBUT]]);
      jejak(tl, satu(st, '.sgs-panel-sg'), [[tHenti, { opacity: 1 }], [tHenti + 1400, { opacity: 0.55 }]]);
      jejak(tl, satu(st, '.sgs-sg-langit'), [[tHenti, { opacity: 1 }], [tHenti + 1400, { opacity: 0.4 }]]);
      pop(tl, satu(st, '.sgs-putus'), tHenti + 600, 480);
      jejak(tl, satu(st, '.sgs-koin-jatuh'), [[tHenti + 300, { opacity: 0, transform: 'translate(240px,166px)' }], [tHenti + 400, { opacity: 1, transform: 'translate(240px,166px)' }], [tHenti + 1100, { opacity: 1, transform: 'translate(240px,286px)' }, JATUH], [tHenti + 1260, { opacity: 1, transform: 'translate(240px,278px)' }], [tHenti + 1400, { opacity: 1, transform: 'translate(240px,286px)' }]]);
      jejak(tl, satu(st, '.sgs-label-alir'), [[tHenti + 900, { opacity: 0, transform: 'scale(.7)' }], [tHenti + 1400, { opacity: 1, transform: 'none' }]]);
      var tQ = K.B[1] + 100;
      jejak(tl, satu(st, '.sgs-tanya-9'), [[tQ, { opacity: 0, transform: 'translateY(-12px) scale(.95)' }], [tQ + 700, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.sgs-sisi-id .sgs-hangat'), [[tQ, { opacity: 1 }], [tQ + 900, { opacity: 0.35 }]]);
    }
  };
  function gaya(root, peta) {
    Object.keys(peta).forEach(function (sel) {
      semua(root, sel).forEach(function (el) {
        Object.keys(peta[sel]).forEach(function (p) { el.style[p] = String(peta[sel][p]); });
      });
    });
  }

  /* ---------------- scene 10: proteksi ---------------- */
  var ALUR = [
    { y: 14, teks: 'PENGHASILAN LEO', kelas: 'sgs-alur-kartu', t: 'sgs-teks-1' },
    { y: 98, teks: 'KEBUTUHAN KELUARGA', kelas: 'sgs-alur-kartu', t: 'sgs-teks-1' },
    { y: 182, teks: 'PROTEKSI', kelas: 'sgs-alur-proteksi', t: 'sgs-teks-putih' },
    { y: 266, teks: 'PENGHASILAN YANG DITERUSKAN', kelas: 'sgs-alur-emas', t: 'sgs-teks-emas', f: 'sgs-f17' }
  ];
  S[10] = {
    set: function () {
      var kartu = ALUR.map(function (k, i) {
        return '<g class="sgs-alur sgs-alur-' + (i + 1) + '" style="' + asal(240, k.y + 27) + '">' + kotak(84, k.y, 312, 54, k.kelas, 16) +
          (i === 2 ? '<path class="sgs-perisai" d="M154 ' + (k.y + 12) + ' L168 ' + (k.y + 17) + ' L168 ' + (k.y + 29) + ' C168 ' + (k.y + 38) + ' 161 ' + (k.y + 43) + ' 154 ' + (k.y + 46) + ' C147 ' + (k.y + 43) + ' 140 ' + (k.y + 38) + ' 140 ' + (k.y + 29) + ' L140 ' + (k.y + 17) + ' Z"/>' : '') +
          teks(i === 2 ? 258 : 240, k.y + 33.5, k.teks, (k.f || 'sgs-f18') + ' ' + k.t) + '</g>';
      }).join('');
      var panah = [68, 152, 236].map(function (y, i) {
        return '<g class="sgs-alur-panah sgs-alur-panah-' + (i + 1) + '">' + garis('M240 ' + (y + 2) + ' L240 ' + (y + 26), 'sgs-panah-garis') +
          '<path class="sgs-panah-ujung" d="M232 ' + (y + 20) + ' L240 ' + (y + 29) + ' L248 ' + (y + 20) + '"/></g>';
      }).join('');
      return latar('sgs-langit-studio') +
        '<circle class="sgs-cahaya-proteksi" cx="240" cy="209" r="150" fill="url(#sgsHangat)" style="' + asal(240, 209) + '"/>' +
        panah + kartu +
        '<g class="sgs-koin-turun" transform="translate(240 262)">' + koin() + '</g>' +
        '<g class="sgs-keluarga-kecil">' + orang('sgs-istri', 432, 346, 0.4, ISTRI, -1) + orang('sgs-anak', 460, 346, 0.4, ANAK, -1) + '</g>' +
        '<g class="sgs-leo-kecil" style="opacity:.3">' + orang('sgs-leo', 44, 104, 0.36, LEO, 1) + '</g>';
    },
    /* ketukan: (a) bukan hanya meninggalkan uang · JEDA · (b) kebutuhan tetap berjalan: proteksi → diteruskan */
    ketuk: [4200, 6400],
    jeda: [1500, 0],
    animate: function (tl, st, K) {
      pop(tl, satu(st, '.sgs-alur-1'), 200, 520);
      jejak(tl, satu(st, '.sgs-leo-kecil'), [[200, { opacity: 0 }], [800, { opacity: 0.3 }]]);
      gambarGaris(tl, satu(st, '.sgs-alur-panah-1 .sgs-panah-garis'), 900, 500);
      pudar(tl, satu(st, '.sgs-alur-panah-1 .sgs-panah-ujung'), 1300, 200);
      pop(tl, satu(st, '.sgs-alur-2'), 1400, 520);
      var tP = Math.max(K.B[1] + 100, K.kata(1, 'memastikan') - 250);
      gambarGaris(tl, satu(st, '.sgs-alur-panah-2 .sgs-panah-garis'), tP, 500);
      pudar(tl, satu(st, '.sgs-alur-panah-2 .sgs-panah-ujung'), tP + 400, 200);
      jejak(tl, satu(st, '.sgs-alur-3'), [[tP + 500, { opacity: 0, transform: 'scale(.5)' }], [tP + 1100, { opacity: 1, transform: 'none' }, PEGAS]]);
      jejak(tl, satu(st, '.sgs-cahaya-proteksi'), [[tP + 700, { opacity: 0, transform: 'scale(.5)' }], [tP + 1600, { opacity: 1, transform: 'none' }, LEMBUT]]);
      var tD = Math.max(tP + 1700, K.kata(1, 'tetap bisa berjalan') - 200);
      gambarGaris(tl, satu(st, '.sgs-alur-panah-3 .sgs-panah-garis'), tD, 500);
      pudar(tl, satu(st, '.sgs-alur-panah-3 .sgs-panah-ujung'), tD + 400, 200);
      jejak(tl, satu(st, '.sgs-alur-4'), [[tD + 500, { opacity: 0, transform: 'translateY(14px)' }], [tD + 1100, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.sgs-keluarga-kecil'), [[tD + 800, { opacity: 0, transform: 'translateX(14px)' }], [tD + 1400, { opacity: 1, transform: 'none' }]]);
      /* penghasilan kembali mengalir: dari proteksi ke kebutuhan keluarga */
      jejak(tl, satu(st, '.sgs-koin-turun'), [[tD + 1200, { opacity: 0, transform: 'translate(240px,226px)' }], [tD + 1400, { opacity: 1, transform: 'translate(240px,232px)' }], [tD + 2000, { opacity: 1, transform: 'translate(240px,262px)' }]]);
      tl.loop(satu(st, '.sgs-cahaya-proteksi'), [{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }], { duration: 3600, delay: tD + 1600 });
    }
  };

  /* ---------------- scene 11: pesan penutup (hangat) ---------------- */
  function rumahHangat() {
    return latar('sgs-dinding-rumah') + lantai(300, 'sgs-lantai-rumah') +
      '<circle class="sgs-hangat" cx="330" cy="150" r="220" fill="url(#sgsHangat)"/>' +
      '<g class="sgs-jendela-besar"><rect class="sgs-jendela-rumah" x="232" y="54" width="168" height="120" rx="10"/>' +
        '<rect class="sgs-jendela-langit" x="240" y="62" width="152" height="104" rx="6"/>' +
        '<path class="sgs-jendela-silang" d="M316 62 V166 M240 114 H392"/></g>' +
      '<g class="sgs-bayang-awan"><rect class="sgs-awan-bayang" x="240" y="62" width="152" height="104" rx="6"/></g>' +
      '<g class="sgs-bingkai" style="' + asal(96, 110) + '"><rect class="sgs-bingkai-luar" x="62" y="74" width="68" height="76" rx="6"/>' +
        '<rect class="sgs-bingkai-dalam" x="70" y="82" width="52" height="60" rx="3"/>' +
        '<circle class="sgs-foto-kepala" cx="96" cy="104" r="10"/><path class="sgs-foto-badan" d="M78 142 C80 124 112 124 114 142 Z"/></g>' +
      '<g class="sgs-meja-makan"><rect class="sgs-meja" x="40" y="248" width="150" height="10" rx="3"/><rect class="sgs-meja-kaki" x="52" y="258" width="8" height="42"/><rect class="sgs-meja-kaki" x="170" y="258" width="8" height="42"/>' +
        '<ellipse class="sgs-mangkuk" cx="84" cy="244" rx="16" ry="6"/><ellipse class="sgs-mangkuk" cx="140" cy="244" rx="16" ry="6"/></g>' +
      orang('sgs-istri', 300, 300, 0.74, ISTRI, 1) + orang('sgs-anak', 372, 300, 0.74, ANAK, -1) +
      '<g class="sgs-tas" style="' + asal(398, 236) + '"><rect class="sgs-tas-isi" x="388" y="226" width="22" height="26" rx="5"/><path class="sgs-tas-tali" d="M392 226 C392 216 406 216 406 226"/></g>';
  }
  S[11] = {
    set: function () {
      return rumahHangat() + tanya(12, ['Siapa yang akan membawa pulang', 'penghasilan itu untuk keluarga?'], 'sgs-tanya-11');
    },
    /* ketukan: (a) semuanya baik-baik saja · (b) tidak tahu besok · (c) tidak bisa lagi bekerja · (d) siapa yang membawa pulang? */
    ketuk: [3600, 3000, 3000, 3600],
    jeda: [1400, 1400, 1400, 0],
    animate: function (tl, st, K) {
      pudar(tl, satu(st, '.sgs-hangat'), 0, 1200);
      jejak(tl, satu(st, '.sgs-istri'), [[200, { opacity: 0, transform: 'translateX(-18px)' }], [1000, { opacity: 1, transform: 'none' }]]);
      jejak(tl, satu(st, '.sgs-anak'), [[400, { opacity: 0, transform: 'translateX(18px)' }], [1200, { opacity: 1, transform: 'none' }],
        [1400, { transform: 'none' }], [1650, { transform: 'translateY(-6px)' }], [1900, { transform: 'none' }], [2150, { transform: 'translateY(-6px)' }], [2400, { transform: 'none' }]]);
      pudar(tl, satu(st, '.sgs-meja-makan'), 300, 800);
      pop(tl, satu(st, '.sgs-tas'), 1600, 420);
      /* besok tidak pasti: bayangan melintas di jendela */
      var tB = K.B[1] + 100;
      jejak(tl, satu(st, '.sgs-bayang-awan'), [[tB, { opacity: 0 }], [tB + 900, { opacity: 1 }], [tB + 2600, { opacity: 1 }], [tB + 3600, { opacity: 0.55 }]]);
      var tC = K.B[2] + 100;
      jejak(tl, satu(st, '.sgs-bingkai'), [[0, { opacity: 0.7 }], [tC, { opacity: 0.7 }], [tC + 700, { opacity: 1 }]]);
      denyut(tl, satu(st, '.sgs-bingkai'), tC + 200, 1.08);
      var tQ = K.B[3] + 100;
      jejak(tl, satu(st, '.sgs-tanya-11'), [[tQ, { opacity: 0, transform: 'translateY(-12px) scale(.95)' }], [tQ + 700, { opacity: 1, transform: 'none' }]]);
    }
  };

  /* ---------------- scene 12: penutup (kartu akhir yang sudah ada) ---------------- */
  S[12] = {
    set: function () {
      return rumahHangat() +
        '<g class="sgs-penutup" style="' + asal(240, 36) + '">' + kotak(90, 12, 300, 48, 'sgs-pil', 24) + teks(240, 43.5, 'BEKERJA DI SINGAPURA', 'sgs-f20 sgs-judul') + '</g>';
    },
    siap: function (st) { var b = satu(st, '.sgs-bayang-awan'); if (b) b.style.opacity = '0'; },
    ketuk: [],
    durasi: 2600,
    animate: function (tl, st) {
      pudar(tl, satu(st, '.sgs-hangat'), 0, 1200);
      muncul(tl, satu(st, '.sgs-penutup'), 300, 700);
    }
  };

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
     timeline. Lama ketukan = maks(kebutuhan gerak, perkiraan narasi) + jeda. */
  function ketukan(n) {
    var sc = S[n] || S[1], naskah = NARASI[n - 1] || [], vis = sc.ketuk || [], jeda = sc.jeda || [], B = [], D = [], t = 0;
    naskah.forEach(function (seg, j) {
      var d = Math.max(vis[j] || 0, lamaSegmen(seg)) + (jeda[j] || 0);
      B.push(t); D.push(d); t += d;
    });
    if (!naskah.length) t = sc.durasi || 3000;
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
      N.daftar('.sgs', 'data-sgs', NARASI);
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
          pasangPoros(st);
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

  window.PSGSingapuraStory = { adegan: adegan };
})();
