/* ============================================================
   Sales Idea — Proteksi Kredit (interactive story)
   ------------------------------------------------------------
   Sepuluh scene mengikuti 10 langkah kreditSteps di sales-idea.js
   dengan urutan yang sama; judul, fokus, dan isi kartu teks diambil
   dari data itu. Tokoh utama: Pak Leo, 40 tahun (PSGKarakter, tampilan
   sama di semua scene: rambut, kacamata, proporsi).

    1. Impian memiliki aset — Pak Leo dan keluarga; macam kredit: properti
       (rumah, apartemen) dan kendaraan roda empat (mobil); contoh cerita
       ini rumah: garis impian rumah berubah menjadi rumah utuh.
    2. Rencana Pak Leo — kartu rencana: Rp2 M, DP 15%, cicilan ±Rp15 jt
       per bulan (asumsi ilustrasi), tenor 15 tahun; bilah DP / kredit.
    3. Ketika semua lancar — jalur 15 tahun terisi; sehat, bekerja,
       cicilan; KREDIT SELESAI, keluarga di rumah.
    4. Risiko meninggal dunia — lembut, tanpa kesan menakutkan: sosok
       Pak Leo memudar; kartu asuransi jiwa kredit dengan tiga syarat
       (ada, masih aktif, klaim sesuai ketentuan polis).
    5. Risiko penyakit kritis — Pak Leo pulih; penghasilan terganggu,
       biaya bertambah, cicilan tetap jatuh tempo; perlindungan kredit
       yang ada belum tentu mencakup.
    6. Pertanyaan penting — kartu pertanyaan + jeda visual.
    7. Proteksi Kredit — perisai terbentuk di sekitar rumah; jiwa kredit
       (bila ada) + perlindungan penyakit kritis.
    8. Pak Leo menambah Proteksi Kredit — satu kartu tanpa nama produk:
       bayar 10 th, lindung 15 th (sama dengan tenor), UP Rp2,7 M, premi,
       manfaat sakit kritis, nilai akhir kontrak / meninggal dunia. Angka
       dari kalkulator Cristal Prime aplikasi (TARIF_CRIS, pria 40 th,
       bulanan); ilustrasi, bukan jaminan, mengikuti ketentuan polis.
    9. Simulasi 3 skenario — tabel: kiri KPR (+ asuransi jiwa kredit bila
       ada), kanan Proteksi Kredit: (1) lancar: KPR lunas, dana kembali
       120% premi; (2) meninggal dunia: sisa KPR dilunasi asuransi jiwa
       kredit bila ada & aktif, keluarga menerima manfaat meninggal;
       (3) sakit kritis tahun ke-5: total sisa angsuran Rp15 jt × 12 × 10
       = Rp1,8 M (penjumlahan angsuran, bukan sisa pokok resmi bank) vs
       manfaat Rp2,9 M.
   10. Ajakan — logo resmi PSG + ajakan menghitung. Kartu akhir "Mari
       Kita Hitung" (sales-idea-lanjut.js) muncul sesudah scene ini.

   Tidak ada klaim bahwa proteksi kredit otomatis melunasi kredit bank
   atau sama dengan asuransi jiwa kredit; skenario 3 hanya menunjukkan
   bahwa dalam ilustrasi ini manfaatnya lebih besar dari total sisa
   angsuran.

   Teknik: satu <svg> per panggung (viewBox mengikuti rasio panggung,
   area inti selalu utuh). Hanya transform, opacity, dan stroke yang
   dianimasikan lewat timeline pemutar (Web Animations). Render =
   keadaan akhir (statis, juga untuk gerak dikurangi).

   Narasi: narator bersama (window.PSGNarasi). Naskah tiap scene berupa
   segmen; tiap segmen punya satu ketukan visual. Lama ketukan =
   maks(kebutuhan gerak, perkiraan lama narasi, lama rekaman bila ada)
   + jeda. data-ketuk pada node scene memberi tahu narator ketukan mana
   yang sudah mulai. Rekaman voice Bian belum tersedia: tanpa manifest
   PSGKreditAudio narator memakai suara browser (Web Speech). Begitu
   manifest dimuat, narator memakai MP3-nya (lihat
   tools/narasi/NASKAH-BIAN-PROTEKSI-KREDIT.md).

   API: PSGKreditStory.adegan({ langkah, header, padaLangkah })
   ============================================================ */
(function () {
  'use strict';

  var EASE = 'cubic-bezier(.22,.8,.26,1)';
  var LEMBUT = 'cubic-bezier(.45,.05,.3,1)';
  var PEGAS = 'cubic-bezier(.34,1.4,.5,1)';
  var JUMLAH = 10;

  /* teks alternatif panggung (role="img"): isi visual tiap scene */
  var ARIA = [
    'Pak Leo, 40 tahun, bersama istri dan anaknya. Macam kredit: kredit properti (rumah, apartemen) dan kredit kendaraan (mobil, roda empat). Contoh cerita ini rumah: garis impian berubah menjadi rumah utuh.',
    'Rumah senilai Rp2 miliar dengan bilah uang muka 15 persen dan kredit 85 persen. Kartu rencana: harga Rp2 miliar, DP 15 persen Rp300 juta, cicilan sekitar Rp15 juta per bulan sebagai asumsi ilustrasi, tenor 15 tahun.',
    'Jalur 15 tahun terisi. Pak Leo sehat, bekerja, dan membayar cicilan. Di tahun ke-15 kredit selesai dan keluarga berkumpul di rumah.',
    'Jalur kredit terhenti. Sosok Pak Leo memudar dengan lembut, keluarganya tetap di rumah. Kartu asuransi jiwa kredit: ada, masih aktif, klaim sesuai ketentuan polis. Tidak semua kredit memilikinya.',
    'Pak Leo dalam masa pemulihan. Garis penghasilan dari kantor ke rumah melemah, biaya pengobatan bertambah, cicilan tetap jatuh tempo. Perlindungan kredit yang ada belum tentu mencakup kondisi ini.',
    'Kartu pertanyaan: jika kita masih harus membayar cicilan, tetapi kesehatan dan penghasilan terganggu, dari mana dana untuk melanjutkan semuanya?',
    'Perisai Proteksi Kredit terbentuk di sekitar rumah Pak Leo: asuransi jiwa kredit bila ada, ditambah perlindungan penyakit kritis untuk cicilan, pemulihan, dan keluarga.',
    'Kartu ilustrasi Proteksi Kredit: bayar 10 tahun, perlindungan 15 tahun, uang pertanggungan Rp2,7 miliar. Premi Rp6.129.000 per bulan. Manfaat sakit kritis 66 kondisi Rp2,9 miliar. Akhir kontrak atau meninggal dunia Rp882.576.000. Ilustrasi, bukan jaminan.',
    'Tabel tiga skenario, kiri KPR, kanan Proteksi Kredit. Satu, lancar: KPR lunas, rumah milik Pak Leo; dana kembali 120 persen, Rp882.576.000. Dua, meninggal dunia: bila KPR dilengkapi asuransi jiwa kredit yang aktif, sisa KPR lunas; keluarga menerima Rp882.576.000. Tiga, sakit kritis di tahun ke-5: sisa angsuran Rp15 juta kali 12 kali 10 tahun, sekitar Rp1,8 miliar; manfaat cair Rp2,9 miliar, cukup, sisa sekitar Rp1,1 miliar.',
    'Logo PSG. Jangan hanya merencanakan cara memiliki aset. Rencanakan juga perlindungan finansialnya. Mari hitung kebutuhan Proteksi Kredit Anda bersama kami.'
  ];

  /* Naskah narasi: satu larik segmen per scene, urutan = ketukan visual.
     Angka ditulis sebagai kata (tanpa digit atau "Rp") supaya dibaca
     wajar oleh suara browser maupun voice Bian; pemecah kalimat narator
     memotong di tanda titik. Sumber kebenaran untuk perekaman:
     tools/narasi/NASKAH-BIAN-PROTEKSI-KREDIT.md menyalin teks ini. */
  var NARASI = [
    ['Ini Pak Leo, empat puluh tahun, kepala keluarga yang bekerja keras setiap hari.',
      'Banyak keluarga memiliki aset lewat kredit: kredit properti seperti rumah dan apartemen, atau kredit kendaraan seperti mobil.',
      'Dalam cerita ini, contohnya rumah: impian Pak Leo untuk keluarganya.'],
    ['Pak Leo membeli rumah senilai dua miliar rupiah dengan uang muka lima belas persen. Sisanya dibiayai kredit.',
      'Asumsi cicilannya sekitar lima belas juta rupiah per bulan selama lima belas tahun, bukan simulasi resmi bank.'],
    ['Jika semua lancar, Pak Leo tetap sehat, terus bekerja, dan membayar cicilan setiap bulan.',
      'Lima belas tahun kemudian, kreditnya selesai. Rumah itu sepenuhnya milik keluarga.'],
    ['Namun, bagaimana jika Pak Leo meninggal dunia sebelum kreditnya selesai?',
      'Sebagian kredit dilengkapi asuransi jiwa kredit yang dapat membantu melunasi sisa kredit. Tetapi tidak semua kredit memilikinya.',
      'Manfaatnya pun bergantung pada apakah perlindungan itu ada, masih aktif, dan klaimnya sesuai ketentuan polis.'],
    ['Ada juga risiko lain. Pak Leo masih hidup, tetapi terdiagnosis penyakit kritis.',
      'Ia perlu fokus pada pemulihan. Biaya bertambah, penghasilan bisa terganggu, sementara cicilan tetap datang setiap bulan.',
      'Perlindungan kredit yang ada belum tentu mencakup kondisi ini.'],
    ['Jika kita masih harus membayar cicilan, tetapi kesehatan dan penghasilan terganggu, dari mana dana untuk melanjutkan semuanya?'],
    ['Di sinilah proteksi kredit berperan: menjaga agar rencana tetap berjalan ketika risiko datang.',
      'Selain asuransi jiwa kredit bila ada, siapkan juga perlindungan penyakit kritis. Manfaatnya dapat dipakai untuk cicilan, pemulihan, dan kebutuhan keluarga.'],
    ['Untuk itu, Pak Leo menambah proteksi kredit berupa perlindungan penyakit kritis, dengan masa bayar sepuluh tahun dan perlindungan lima belas tahun, sama dengan tenor kreditnya.',
      'Dengan uang pertanggungan dua koma tujuh miliar rupiah, preminya sekitar enam koma satu juta rupiah per bulan. Bila terdiagnosis satu dari enam puluh enam kondisi kritis, manfaatnya dua koma sembilan miliar rupiah.',
      'Semua angka ini ilustrasi, bukan jaminan, dan mengikuti ketentuan polis.'],
    ['Mari lihat tiga kemungkinan. Pertama, jika lancar sampai kredit selesai, rumah menjadi milik Pak Leo, dan karena tetap sehat, proteksi kreditnya mengembalikan sekitar delapan ratus delapan puluh dua juta rupiah.',
      'Kedua, jika Pak Leo meninggal dunia dan kreditnya dilengkapi asuransi jiwa kredit yang aktif, sisa kredit dapat dilunasi sesuai ketentuan polis, dan rumah tetap milik keluarga. Keluarga juga menerima manfaat sekitar delapan ratus delapan puluh dua juta rupiah.',
      'Ketiga, jika Pak Leo sakit kritis di tahun kelima, sisa angsuran sepuluh tahun sekitar satu koma delapan miliar rupiah. Manfaatnya dua koma sembilan miliar rupiah, dalam ilustrasi ini cukup untuk menutup sisa angsuran, dan masih tersisa sekitar satu koma satu miliar rupiah.'],
    ['Jangan hanya merencanakan cara memiliki aset. Rencanakan juga perlindungan finansialnya.',
      'Mari hitung kebutuhan proteksi kredit Anda bersama kami.']
  ];

  /* Perkiraan lama bicara (kecepatan 0,96): 80 md per huruf, +300 md tiap
     pergantian kalimat, +900 md jeda segmen — sama dengan cerita lain. */
  var MD_HURUF = 80, JEDA_KALIMAT = 300, JEDA_SEGMEN = 900, JEDA_UCAP = 80;
  function lamaBicara(t) {
    var kalimat = (String(t).match(/[.!?…](\s|$)/g) || []).length;
    return Math.round(String(t).length * MD_HURUF) + kalimat * JEDA_KALIMAT;
  }
  function lamaSegmen(t) { return lamaBicara(t) + JEDA_SEGMEN; }
  /* Rekaman narasi (manifest PSGKreditAudio, bila kelak dimuat): lama
     segmen SNN-MM dalam md + jeda kecil, dipakai sebagai batas minimum
     ketukan supaya visual tidak berpindah sebelum narasinya selesai. */
  var JEDA_REKAMAN = 300;
  function dua(x) { return (x < 10 ? '0' : '') + x; }
  function lamaRekaman(n, j) {
    var m = window.PSGKreditAudio, klip = m && m.segmen && m.segmen['S' + dua(n) + '-' + dua(j)];
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
  function fMuncul(t, d, dari) { return [[t, { opacity: 0, transform: dari || 'translateY(10px)' }], [t + (d || 520), { opacity: 1, transform: 'none' }]]; }
  function fPop(t, d) { return [[t, { opacity: 0, transform: 'scale(.4)' }], [t + (d || 460), { opacity: 1, transform: 'none' }, PEGAS]]; }
  function fDenyut(t, s) { return [[t, { transform: 'none' }], [t + 300, { transform: 'scale(' + (s || 1.08) + ')' }], [t + 760, { transform: 'none' }, LEMBUT]]; }
  function muncul(tl, el, t, d, dari) { jejak(tl, el, fMuncul(t, d, dari)); }
  function pop(tl, el, t, d) { jejak(tl, el, fPop(t, d)); }
  function pudar(tl, el, t, d) { jejak(tl, el, [[t, { opacity: 0 }], [t + (d || 500), { opacity: 1 }]]); }
  /* muncul/pop lalu berdenyut: satu jejak supaya transform tidak saling menimpa */
  function munculDenyut(tl, el, t, d, dari, td, s) { jejak(tl, el, fMuncul(t, d, dari).concat(fDenyut(td, s))); }
  function popDenyut(tl, el, t, d, td, s) { jejak(tl, el, fPop(t, d).concat(fDenyut(td, s))); }
  /* garis tergambar: path ber-pathLength="1" */
  function gambarGaris(tl, el, t, d, e) { jejak(tl, el, [[t, { strokeDashoffset: 1 }], [t + d, { strokeDashoffset: 0 }, e || LEMBUT]]); }
  /* jejak yang sama untuk setiap elemen yang cocok */
  function jejakSemua(tl, st, sel, frames) { semua(st, sel).forEach(function (el) { jejak(tl, el, frames); }); }
  function asal(x, y) { return 'transform-origin:' + f(x) + 'px ' + f(y) + 'px'; }
  function gaya(root, peta) {
    Object.keys(peta).forEach(function (sel) {
      semua(root, sel).forEach(function (el) {
        Object.keys(peta[sel]).forEach(function (p) { el.style[p] = String(peta[sel][p]); });
      });
    });
  }

  /* ---------------- teks & kartu ---------------- */
  function teks(x, y, isi, kelas, anchor) {
    return '<text class="pks-teks ' + (kelas || '') + '" x="' + f(x) + '" y="' + f(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(isi) + '</text>';
  }
  function kotak(x, y, w, h, kelas, r) {
    return '<rect class="pks-kartu ' + (kelas || '') + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(r == null ? Math.min(16, h / 2) : r) + '"/>';
  }
  function garis(d, kelas) { return '<path class="pks-garis ' + (kelas || '') + '" d="' + d + '" pathLength="1"/>'; }
  /* grup dengan titik putar sendiri (untuk scale/pop) */
  function grup(kelas, x, y, isi) { return '<g class="' + kelas + '" style="' + asal(x, y) + '">' + isi + '</g>'; }
  /* pil satu baris berpusat di (cx, cy); lebar minimal mengikuti panjang
     teks (huruf kapital tebal 17 unit ±12,4 unit per huruf) */
  function pil(kelas, cx, cy, w, isi, kelasTeks) {
    w = Math.max(w, Math.ceil(isi.length * 12.4 + 26));
    return grup(kelas, cx, cy, kotak(cx - w / 2, cy - 16, w, 32, 'pks-kartu-pil') + teks(cx, cy + 6, isi, 'pks-f17 ' + (kelasTeks || 'pks-teks-emas')));
  }

  /* ---------------- dunia ---------------- */
  /* luar ruang: bukit jauh, tanah, matahari, awan (koordinat inti 480×360,
     garis tanah y≈300; dunia melebar ke kiri/kanan untuk layar lebar) */
  function duniaLuar(o) {
    o = o || {};
    var mx = o.matahari || [400, 70];
    return '<circle class="pks-matahari-cahaya" cx="' + mx[0] + '" cy="' + mx[1] + '" r="110" fill="url(#pksCahaya)"/>' +
      '<circle class="pks-matahari" cx="' + mx[0] + '" cy="' + mx[1] + '" r="20"/>' +
      '<g class="pks-awan"><ellipse cx="70" cy="64" rx="38" ry="10"/><ellipse cx="94" cy="56" rx="24" ry="9"/><ellipse cx="290" cy="40" rx="30" ry="8"/></g>' +
      '<path class="pks-bukit-1" d="M-700 262 C -380 238, -80 256, 90 246 C 210 238, 300 224, 380 234 C 470 244, 620 252, 1180 256 V900 H-700 Z"/>' +
      '<path class="pks-bukit-2" d="M-700 280 C -300 272, 20 284, 150 276 C 260 268, 330 268, 420 276 C 560 286, 860 282, 1180 284 V900 H-700 Z"/>' +
      '<path class="pks-tanah" d="M-700 298 C -200 294, 200 304, 480 296 C 760 290, 940 296, 1180 296 V900 H-700 Z"/>';
  }
  /* studio: cahaya lembut + lantai elips */
  function duniaStudio(cx) {
    cx = cx == null ? 240 : cx;
    return '<circle class="pks-halo" cx="' + cx + '" cy="170" r="210" fill="url(#pksHalo)"/>' +
      '<ellipse class="pks-lantai" cx="' + cx + '" cy="318" rx="260" ry="46" fill="url(#pksBayang)"/>';
  }
  function defs() {
    return '<defs>' +
      '<radialGradient id="pksCahaya"><stop offset="0" class="pks-st-cahaya"/><stop offset="1" class="pks-st-cahaya" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="pksBayang"><stop offset="0" class="pks-st-bayang"/><stop offset="1" class="pks-st-bayang" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="pksHalo"><stop offset="0" class="pks-st-halo"/><stop offset="1" class="pks-st-halo" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="pksHangat"><stop offset="0" class="pks-st-hangat"/><stop offset="1" class="pks-st-hangat" stop-opacity="0"/></radialGradient>' +
    '</defs>';
  }

  /* rumah: fasad depan berpelana + dinding samping + bidang atap (2,5D).
     (x, y) = tengah dasar fasad; s = skala. Satu bentuk dipakai di semua
     scene supaya rumah keluarga Pak Leo selalu sama. */
  function rumah(x, y, s, kelas) {
    return '<g class="pks-rumah ' + (kelas || '') + '" transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')">' +
      '<ellipse class="pks-rumah-bayang" cx="22" cy="2" rx="104" ry="12" fill="url(#pksBayang)"/>' +
      '<path class="pks-dinding-sisi" d="M60 0 L100 -16 V-84 L60 -68 Z"/>' +
      '<path class="pks-jendela" d="M72 -28 L88 -34.4 V-52.4 L72 -46 Z"/><path class="pks-jendela-nyala" d="M72 -28 L88 -34.4 V-52.4 L72 -46 Z"/>' +
      '<path class="pks-atap-sisi" d="M0 -118 L40 -134 L106 -80 L66 -64 Z"/>' +
      '<path class="pks-dinding" d="M-60 0 V-68 L0 -114 L60 -68 V0 Z"/>' +
      '<path class="pks-atap-tepi" d="M-68 -62 L0 -120 L68 -62"/>' +
      '<circle class="pks-jendela" cx="0" cy="-84" r="8"/><circle class="pks-jendela-nyala" cx="0" cy="-84" r="8"/>' +
      '<rect class="pks-jendela" x="-48" y="-52" width="22" height="20" rx="2"/><rect class="pks-jendela-nyala" x="-48" y="-52" width="22" height="20" rx="2"/>' +
      '<rect class="pks-jendela" x="26" y="-52" width="22" height="20" rx="2"/><rect class="pks-jendela-nyala" x="26" y="-52" width="22" height="20" rx="2"/>' +
      '<rect class="pks-pintu" x="-11" y="-40" width="22" height="40" rx="2"/>' +
    '</g>';
  }
  /* ikon apartemen: menara 44 × 52 berdiri di (cx, y) */
  function apartemen(cx, y) {
    var x0 = cx - 22, top = y - 52, jendela = '';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) jendela += '<rect class="pks-apt-jendela" x="' + (x0 + 6 + c * 12) + '" y="' + (top + 7 + r * 11) + '" width="8" height="6" rx="1"/>';
    return '<rect class="pks-apt-badan" x="' + x0 + '" y="' + top + '" width="44" height="52" rx="3"/>' +
      '<rect class="pks-apt-atap" x="' + (x0 - 3) + '" y="' + (top - 5) + '" width="50" height="6" rx="2"/>' + jendela +
      '<rect class="pks-pintu" x="' + (cx - 5) + '" y="' + (y - 10) + '" width="10" height="10" rx="1"/>';
  }
  /* ikon mobil (roda empat) berdiri di (cx, y) */
  function mobil(cx, y) {
    return '<path class="pks-mobil-kabin" d="M' + (cx - 24) + ' ' + (y - 22) + ' L' + (cx - 14) + ' ' + (y - 36) + ' H' + (cx + 14) + ' L' + (cx + 26) + ' ' + (y - 22) + ' Z"/>' +
      '<path class="pks-mobil-kaca" d="M' + (cx - 18) + ' ' + (y - 23) + ' L' + (cx - 11) + ' ' + (y - 33) + ' H' + (cx - 1) + ' V' + (y - 23) + ' Z M' + (cx + 3) + ' ' + (y - 23) + ' V' + (y - 33) + ' H' + (cx + 12) + ' L' + (cx + 20) + ' ' + (y - 23) + ' Z"/>' +
      '<rect class="pks-mobil-badan" x="' + (cx - 40) + '" y="' + (y - 24) + '" width="80" height="16" rx="7"/>' +
      '<circle class="pks-mobil-roda" cx="' + (cx - 22) + '" cy="' + (y - 7) + '" r="7"/><circle class="pks-mobil-roda" cx="' + (cx + 22) + '" cy="' + (y - 7) + '" r="7"/>' +
      '<circle class="pks-mobil-velg" cx="' + (cx - 22) + '" cy="' + (y - 7) + '" r="2.6"/><circle class="pks-mobil-velg" cx="' + (cx + 22) + '" cy="' + (y - 7) + '" r="2.6"/>';
  }
  /* perisai berpusat di (0,0): lebar 80, tinggi 104 sebelum skala */
  var D_PERISAI = 'M0 -50 L40 -36 V2 C40 28 22 44 0 54 C-22 44 -40 28 -40 2 V-36 Z';
  function perisai(kelas, x, y, s, isi) {
    return '<g class="' + kelas + '" style="' + asal(x, y) + '"><g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s + ')">' +
      '<path class="pks-perisai-isi" d="' + D_PERISAI + '"/>' +
      '<path class="pks-perisai-garis" d="' + D_PERISAI + '" pathLength="1"/>' + (isi || '') + '</g></g>';
  }
  /* jalur waktu kredit 15 tahun: garis dasar, garis isi (pathLength 1), titik tahun */
  function jalur(kelas, x0, x1, y, labelKiri, labelKanan) {
    var titik = '';
    for (var i = 0; i < 15; i++) {
      var x = x0 + (x1 - x0) * i / 14;
      titik += '<circle class="pks-jalur-titik" cx="' + f(x) + '" cy="' + y + '" r="3.2"/>';
    }
    return '<g class="pks-jalur ' + kelas + '">' +
      '<path class="pks-jalur-dasar" d="M' + x0 + ' ' + y + ' H' + x1 + '"/>' +
      '<path class="pks-jalur-isi" d="M' + x0 + ' ' + y + ' H' + x1 + '" pathLength="1"/>' + titik +
      (labelKiri ? teks(x0, y - 14, labelKiri, 'pks-f17 pks-teks-2', 'start') : '') +
      (labelKanan ? teks(x1, y - 14, labelKanan, 'pks-f17 pks-teks-2', 'end') : '') +
    '</g>';
  }
  function kalender(x, y) {
    return '<g class="pks-kalender" style="' + asal(x + 16, y + 16) + '">' +
      '<rect class="pks-kal-badan" x="' + x + '" y="' + y + '" width="32" height="32" rx="5"/>' +
      '<rect class="pks-kal-kepala" x="' + x + '" y="' + y + '" width="32" height="10" rx="4"/>' +
      '<path class="pks-kal-cincin" d="M' + (x + 9) + ' ' + (y - 4) + ' V' + (y + 5) + ' M' + (x + 23) + ' ' + (y - 4) + ' V' + (y + 5) + '"/>' +
      '<path class="pks-kal-centang" d="M' + (x + 9) + ' ' + (y + 21) + ' l5 5 l9 -10"/></g>';
  }
  function plusMedis(x, y, r) {
    return '<circle class="pks-medis" cx="' + x + '" cy="' + y + '" r="' + r + '"/>' +
      '<path class="pks-medis-plus" d="M' + x + ' ' + (y - r * 0.5) + ' V' + (y + r * 0.5) + ' M' + (x - r * 0.5) + ' ' + y + ' H' + (x + r * 0.5) + '"/>';
  }

  /* ---------------- tokoh ----------------
     Pak Leo: dewasa, kacamata, bersendi; pakaian kerja di luar rumah,
     santai saat di rumah / masa pemulihan. Wajah, rambut, kacamata, dan
     proporsi sama di semua scene. */
  function leo(pakaian, tas) { return { sendi: true, usia: 'dewasa', pakaian: pakaian || 'kerja', kacamata: true, tas: !!tas }; }
  var ISTRI = { sendi: true, jenis: 'wanita' };
  var ANAK = { sendi: true, usia: 'anak', pakaian: 'muda' };
  /* ukuran nested <svg> lewat atribut: tidak semua browser menerapkan
     width/height CSS pada <svg> di dalam SVG */
  function tokoh(o) { return window.PSGKarakter ? window.PSGKarakter.svg(o).replace('<svg class="psg-k', '<svg width="120" height="240" class="psg-k') : ''; }
  /* orang berdiri: kaki di (x, y), skala s, cermin bila arah -1 */
  function orang(kelas, x, y, s, o, arah) {
    var tx = arah === -1 ? x + 61 * s : x - 61 * s;
    return '<g class="pks-orang ' + kelas + '"><g transform="translate(' + f(tx) + ' ' + f(y - 226 * s) + ') scale(' + (arah === -1 ? -s : s) + ' ' + s + ')">' + tokoh(o) + '</g></g>';
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
  /* nama Pak Leo: pil kecil di atas kepala */
  function papanNama(kelas, cx, y, isi) {
    var w = Math.max(120, Math.ceil(isi.length * 12.4 + 26));
    return grup('pks-papan ' + kelas, cx, y, kotak(cx - w / 2, y - 15, w, 30, 'pks-kartu-nama') + teks(cx, y + 6, isi, 'pks-f17 pks-teks-1'));
  }

  var S = [];

  /* ---------------- scene 1: impian memiliki aset ----------------
     Pita atas: macam kredit — properti (rumah, apartemen) dan kendaraan
     roda empat (mobil). Di bawah: Pak Leo + keluarga dan rumah impian
     (contoh cerita ini). Apartemen & mobil meredup saat "contohnya rumah". */
  S[1] = {
    langit: 'pagi',
    set: function () {
      var titik = [[208, 200, 3], [232, 192, 4], [258, 188, 5]].map(function (p, i) {
        return '<circle class="pks-titik-impian pks-titik-' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" style="' + asal(p[0], p[1]) + '"/>';
      }).join('');
      return duniaLuar() +
        '<g class="pks-jenis pks-jenis-properti">' + kotak(10, 10, 246, 114, 'pks-kartu-besar', 16) +
          teks(133, 34, 'KREDIT PROPERTI', 'pks-f17 pks-teks-2') +
          '<g class="pks-pilihan-rumah"><circle class="pks-ikon-sorot" cx="76" cy="77" r="29"/>' +
            '<g class="pks-ikon-rumah" style="' + asal(76, 92) + '">' + rumah(68, 92, 0.32) + '</g>' +
            teks(76, 114, 'RUMAH', 'pks-f17 pks-teks-1') + '</g>' +
          '<g class="pks-pilihan-apartemen"><g class="pks-ikon-apartemen" style="' + asal(186, 92) + '">' + apartemen(186, 92) + '</g>' +
            teks(186, 114, 'APARTEMEN', 'pks-f17 pks-teks-1') + '</g>' +
        '</g>' +
        '<g class="pks-jenis pks-jenis-kendaraan">' + kotak(264, 10, 206, 114, 'pks-kartu-besar', 16) +
          teks(367, 34, 'KREDIT KENDARAAN', 'pks-f17 pks-teks-2') +
          '<g class="pks-pilihan-mobil"><g class="pks-ikon-mobil" style="' + asal(367, 92) + '">' + mobil(367, 92) + '</g>' +
            teks(367, 114, 'MOBIL', 'pks-f17 pks-teks-1') + '</g>' +
        '</g>' +
        '<g class="pks-impian-garis">' + rumah(362, 298, 0.82, 'pks-rumah-garis') + '</g>' +
        '<g class="pks-impian-isi">' + rumah(362, 298, 0.82) + '</g>' +
        '<circle class="pks-hangat-rumah" cx="362" cy="258" r="110" fill="url(#pksHangat)"/>' +
        titik +
        '<ellipse class="pks-orang-bayang" cx="148" cy="304" rx="78" ry="8" fill="url(#pksBayang)"/>' +
        orang('pks-istri', 102, 302, 0.5, ISTRI) +
        orang('pks-anak', 194, 306, 0.5, ANAK, -1) +
        orang('pks-leo', 150, 304, 0.52, leo('kerja')) +
        papanNama('pks-nama', 150, 152, 'PAK LEO • 40 TAHUN') +
        pil('pks-chip-impian', 362, 334, 180, 'CONTOH: RUMAH');
    },
    siap: function (st) {
      gaya(st, { '.pks-anak .k-lengan-d': { transform: 'rotate(-35deg)' }, '.pks-istri .k-kepala': { transform: 'rotate(5deg)' },
        '.pks-pilihan-apartemen': { opacity: 0.4 }, '.pks-pilihan-mobil': { opacity: 0.4 } });
    },
    /* ketukan: (a) Pak Leo & keluarga · (b) macam kredit · (c) contohnya rumah:
       impian → rumah utuh */
    ketuk: [4200, 5600, 5200],
    animate: function (tl, st, K) {
      var tn = Math.max(700, K.kata(0, 'Pak Leo') - 200);
      var tk = Math.max(tn + 800, K.kata(0, 'kepala keluarga') - 250);
      var tp = Math.max(K.B[1] + 100, K.kata(1, 'kredit properti') - 300);
      var tr1 = Math.max(tp + 500, K.kata(1, 'rumah') - 200);
      var ta = Math.max(tr1 + 500, K.kata(1, 'apartemen') - 200);
      var tv = Math.max(ta + 600, K.kata(1, 'kredit kendaraan') - 300);
      var tm = Math.max(tv + 500, K.kata(1, 'mobil') - 200);
      var tc = Math.max(K.B[2] + 100, K.kata(2, 'contohnya rumah') - 300);
      var ti = Math.max(tc + 700, K.kata(2, 'impian') - 300);
      var tr = Math.max(ti + 1400, K.kata(2, 'keluarganya') - 200);
      jejak(tl, satu(st, '.pks-leo'), [[0, { transform: 'translate(-150px,0px)' }], [2200, { transform: 'none' }, 'linear']]);
      jalan(tl, satu(st, '.pks-leo'), 0, 2200, 6);
      muncul(tl, satu(st, '.pks-nama'), Math.max(tn, 2000), 520, 'translateY(8px)');
      pudar(tl, satu(st, '.pks-istri'), tk, 700);
      pudar(tl, satu(st, '.pks-anak'), tk + 250, 700);
      jejak(tl, satu(st, '.pks-anak .k-lengan-d'), [[tk + 700, { transform: 'rotate(0deg)' }], [tk + 1200, { transform: 'rotate(-35deg)' }, PEGAS]]);
      /* macam kredit: properti (rumah, apartemen) lalu kendaraan (mobil) */
      muncul(tl, satu(st, '.pks-jenis-properti'), tp, 560, 'translateY(-10px)');
      popDenyut(tl, satu(st, '.pks-ikon-rumah'), tr1, 460, tc + 200, 1.12);
      pop(tl, satu(st, '.pks-ikon-apartemen'), ta, 460);
      muncul(tl, satu(st, '.pks-jenis-kendaraan'), tv, 560, 'translateY(-10px)');
      jejak(tl, satu(st, '.pks-ikon-mobil'), [[tm, { opacity: 0, transform: 'translateX(-30px)' }], [tm + 700, { opacity: 1, transform: 'none' }]]);
      /* contohnya rumah: pilihan lain meredup, rumah disorot */
      jejak(tl, satu(st, '.pks-pilihan-apartemen'), [[tc, { opacity: 1 }], [tc + 600, { opacity: 0.4 }]]);
      jejak(tl, satu(st, '.pks-pilihan-mobil'), [[tc, { opacity: 1 }], [tc + 600, { opacity: 0.4 }]]);
      pudar(tl, satu(st, '.pks-ikon-sorot'), tc, 600);
      /* impian: titik pikiran → garis rumah → rumah utuh */
      [0, 1, 2].forEach(function (i) { pop(tl, satu(st, '.pks-titik-' + i), ti + i * 220, 360); });
      jejak(tl, satu(st, '.pks-impian-garis'), [[ti + 500, { opacity: 0 }], [ti + 1000, { opacity: 1 }], [tr, { opacity: 1 }], [tr + 700, { opacity: 0 }]]);
      jejak(tl, satu(st, '.pks-impian-isi'), [[tr - 100, { opacity: 0 }], [tr + 800, { opacity: 1 }]]);
      jejakSemua(tl, st, '.pks-impian-isi .pks-jendela-nyala', [[tr + 300, { opacity: 0 }], [tr + 1100, { opacity: 1 }]]);
      pudar(tl, satu(st, '.pks-hangat-rumah'), tr + 400, 900);
      muncul(tl, satu(st, '.pks-chip-impian'), tc + 300, 520);
      tl.loop(satu(st, '.pks-hangat-rumah'), [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 4200, delay: tr + 1400 });
    }
  };

  /* ---------------- scene 2: rencana Pak Leo ---------------- */
  var BARIS2 = [
    ['HARGA', 'Rp2 MILIAR'],
    ['DP 15%', 'Rp300 JUTA'],
    ['CICILAN*', '±Rp15 JT/BLN'],
    ['TENOR', '15 TAHUN']
  ];
  S[2] = {
    langit: 'studio',
    set: function () {
      var baris = BARIS2.map(function (b, i) {
        var y = 112 + i * 40;
        return '<g class="pks-baris pks-baris-' + (i + 1) + '" style="' + asal(340, y) + '">' +
          (i ? '<path class="pks-pemisah" d="M222 ' + (y - 22) + ' H458"/>' : '') +
          teks(222, y + 6, b[0], 'pks-f17 pks-teks-2', 'start') + teks(458, y + 6, b[1], 'pks-f18 pks-teks-1', 'end') + '</g>';
      }).join('');
      return duniaStudio(230) +
        '<ellipse class="pks-alas" cx="118" cy="270" rx="80" ry="14"/>' +
        grup('pks-rumah-2', 118, 270, rumah(108, 268, 0.62)) +
        '<g class="pks-bilah">' +
          '<rect class="pks-bilah-dasar" x="38" y="290" width="160" height="14" rx="7"/>' +
          '<rect class="pks-bilah-dp" x="38" y="290" width="24" height="14" rx="7" style="' + asal(38, 297) + '"/>' +
          '<rect class="pks-bilah-kredit" x="64" y="290" width="134" height="14" rx="7" style="' + asal(64, 297) + '"/>' +
          teks(38, 326, 'DP 15%', 'pks-f17 pks-teks-emas pks-label-dp', 'start') +
          teks(38, 350, 'KREDIT 85%', 'pks-f17 pks-teks-biru pks-label-kredit', 'start') +
        '</g>' +
        orang('pks-leo', 22, 298, 0.46, leo('kerja')) +
        '<g class="pks-kartu-rencana" style="' + asal(340, 190) + '">' + kotak(206, 46, 268, 270, 'pks-kartu-besar', 18) +
          teks(222, 74, 'RENCANA PAK LEO', 'pks-f17 pks-teks-aksen', 'start') + baris +
          '<g class="pks-catatan-2">' + teks(222, 278, '*ASUMSI ILUSTRASI,', 'pks-f17 pks-teks-2', 'start') + teks(222, 300, 'BUKAN SIMULASI BANK', 'pks-f17 pks-teks-2', 'start') + '</g>' +
        '</g>';
    },
    siap: function (st) {
      gaya(st, { '.pks-leo .k-lengan-d': { transform: 'rotate(-58deg)' }, '.pks-leo .k-hasta-d': { transform: 'rotate(-22deg)' } });
    },
    /* ketukan: (a) harga & DP; bilah DP / kredit · (b) cicilan, tenor, catatan asumsi */
    ketuk: [4800, 5600],
    animate: function (tl, st, K) {
      var th = Math.max(600, K.kata(0, 'dua miliar') - 300);
      var td = Math.max(th + 900, K.kata(0, 'uang muka') - 200);
      var tk = Math.max(td + 900, K.kata(0, 'dibiayai') - 300);
      var tc = Math.max(K.B[1] + 100, K.kata(1, 'cicilannya') - 200);
      var tt = Math.max(tc + 900, K.kata(1, 'selama') - 200);
      var ta = Math.max(tt + 900, K.kata(1, 'bukan simulasi') - 300);
      jejak(tl, satu(st, '.pks-rumah-2'), [[0, { opacity: 0, transform: 'translateY(14px) scale(.94)' }], [800, { opacity: 1, transform: 'none' }, PEGAS]]);
      pudar(tl, satu(st, '.pks-leo'), 200, 700);
      jejak(tl, satu(st, '.pks-leo .k-lengan-d'), [[th, { transform: 'rotate(0deg)' }], [th + 600, { transform: 'rotate(-58deg)' }, PEGAS]]);
      jejak(tl, satu(st, '.pks-leo .k-hasta-d'), [[th, { transform: 'rotate(0deg)' }], [th + 600, { transform: 'rotate(-22deg)' }]]);
      muncul(tl, satu(st, '.pks-kartu-rencana'), th - 200, 600, 'translateX(16px)');
      muncul(tl, satu(st, '.pks-baris-1'), th, 520, 'translateX(-8px)');
      muncul(tl, satu(st, '.pks-baris-2'), td, 520, 'translateX(-8px)');
      pudar(tl, satu(st, '.pks-bilah-dasar'), th + 200, 500);
      jejak(tl, satu(st, '.pks-bilah-dp'), [[td, { transform: 'scaleX(0)' }], [td + 700, { transform: 'none' }, LEMBUT]]);
      pudar(tl, satu(st, '.pks-label-dp'), td + 300, 500);
      jejak(tl, satu(st, '.pks-bilah-kredit'), [[tk, { transform: 'scaleX(0)' }], [tk + 1100, { transform: 'none' }, LEMBUT]]);
      pudar(tl, satu(st, '.pks-label-kredit'), tk + 600, 500);
      munculDenyut(tl, satu(st, '.pks-baris-3'), tc, 520, 'translateX(-8px)', tc + 700, 1.03);
      muncul(tl, satu(st, '.pks-baris-4'), tt, 520, 'translateX(-8px)');
      pudar(tl, satu(st, '.pks-catatan-2'), ta, 600);
    }
  };

  /* ---------------- scene 3: ketika semua berjalan lancar ---------------- */
  var CHIP3 = [['SEHAT ✓', 94], ['BEKERJA ✓', 240], ['CICILAN ✓', 386]];
  S[3] = {
    langit: 'pagi',
    set: function () {
      return duniaLuar({ matahari: [420, 96] }) +
        jalur('pks-jalur-3', 60, 420, 64, 'TAHUN 1', 'TAHUN 15') +
        CHIP3.map(function (c, i) { return pil('pks-chip3 pks-chip3-' + i, c[1], 108, 118, c[0], 'pks-teks-hijau'); }).join('') +
        rumah(366, 298, 0.8) +
        '<circle class="pks-hangat-rumah" cx="366" cy="250" r="110" fill="url(#pksHangat)"/>' +
        '<ellipse class="pks-orang-bayang" cx="296" cy="304" rx="96" ry="8" fill="url(#pksBayang)"/>' +
        orang('pks-istri', 318, 302, 0.48, ISTRI, -1) +
        orang('pks-anak', 352, 306, 0.48, ANAK, -1) +
        orang('pks-leo', 262, 304, 0.5, leo('kerja', true)) +
        grup('pks-lunas', 366, 168, kotak(262, 148, 208, 42, 'pks-kartu-lunas', 21) + teks(366, 176, 'KREDIT SELESAI', 'pks-f18 pks-teks-hijau'));
    },
    siap: function (st) {
      gaya(st, { '.pks-anak .k-lengan-d': { transform: 'rotate(-120deg)' } });
    },
    /* ketukan: (a) sehat, bekerja, cicilan — jalur terisi · (b) tahun 15: selesai */
    ketuk: [5200, 4600],
    animate: function (tl, st, K) {
      var ts = Math.max(500, K.kata(0, 'sehat') - 200);
      var tb = Math.max(ts + 700, K.kata(0, 'bekerja') - 200);
      var tc = Math.max(tb + 700, K.kata(0, 'membayar cicilan') - 200);
      var t15 = Math.max(K.B[1] + 200, K.kata(1, 'Lima belas tahun') - 100);
      var tl5 = Math.max(t15 + 1600, K.kata(1, 'kreditnya selesai') - 200);
      var tr = Math.max(tl5 + 700, K.kata(1, 'milik keluarga') - 300);
      pudar(tl, satu(st, '.pks-jalur-3'), 100, 600);
      /* Pak Leo berangkat kerja: berjalan dari kiri */
      jejak(tl, satu(st, '.pks-leo'), [[0, { transform: 'translate(-200px,0px)' }], [3000, { transform: 'none' }, 'linear']]);
      jalan(tl, satu(st, '.pks-leo'), 0, 3000, 8);
      [ts, tb, tc].forEach(function (t, i) { pop(tl, satu(st, '.pks-chip3-' + i), t, 460); });
      /* jalur 15 tahun: bergerak sepanjang narasi, tuntas saat "lima belas tahun kemudian" */
      jejak(tl, satu(st, '.pks-jalur-3 .pks-jalur-isi'), [[600, { strokeDashoffset: 1 }], [t15, { strokeDashoffset: 0.45 }, 'linear'], [t15 + 1500, { strokeDashoffset: 0 }, LEMBUT]]);
      pop(tl, satu(st, '.pks-lunas'), tl5, 560);
      pudar(tl, satu(st, '.pks-istri'), tl5 + 200, 700);
      pudar(tl, satu(st, '.pks-anak'), tl5 + 400, 700);
      jejak(tl, satu(st, '.pks-anak .k-lengan-d'), [[tl5 + 900, { transform: 'rotate(0deg)' }], [tl5 + 1400, { transform: 'rotate(-120deg)' }, PEGAS]]);
      jejakSemua(tl, st, '.pks-jendela-nyala', [[tr - 200, { opacity: 0.25 }], [tr + 600, { opacity: 1 }]]);
      pudar(tl, satu(st, '.pks-hangat-rumah'), tr, 900);
    }
  };

  /* ---------------- scene 4: risiko meninggal dunia ---------------- */
  var SYARAT4 = ['ADA?', 'MASIH AKTIF?', 'KLAIM SESUAI POLIS?'];
  S[4] = {
    langit: 'teduh',
    set: function () {
      var titikHenti = 60 + 360 * 5 / 14;
      var syarat = SYARAT4.map(function (s, i) {
        var y = 184 + i * 32;
        return '<g class="pks-syarat pks-syarat-' + (i + 1) + '"><rect class="pks-centang-kotak" x="22" y="' + (y - 13) + '" width="18" height="18" rx="4"/>' +
          teks(48, y + 2, s, 'pks-f17 pks-teks-1', 'start') + '</g>';
      }).join('');
      return duniaLuar({ matahari: [430, 120] }) +
        jalur('pks-jalur-4', 60, 420, 56, 'TAHUN 1', 'TAHUN 15') +
        grup('pks-henti', titikHenti, 56, '<circle class="pks-henti-lingkar" cx="' + f(titikHenti) + '" cy="56" r="13"/>' + teks(titikHenti, 62, '?', 'pks-f18 pks-teks-aksen')) +
        rumah(370, 298, 0.78) +
        '<circle class="pks-hangat-keluarga" cx="352" cy="262" r="96" fill="url(#pksHangat)"/>' +
        '<ellipse class="pks-orang-bayang" cx="352" cy="304" rx="56" ry="7" fill="url(#pksBayang)"/>' +
        orang('pks-istri', 336, 302, 0.48, ISTRI, -1) +
        orang('pks-anak', 372, 306, 0.48, ANAK, -1) +
        '<circle class="pks-cahaya-lembut" cx="294" cy="226" r="70" fill="url(#pksCahaya)"/>' +
        orang('pks-leo', 294, 304, 0.5, leo('kerja')) +
        '<g class="pks-kartu-jiwa" style="' + asal(136, 190) + '">' + kotak(10, 94, 252, 196, 'pks-kartu-besar', 16) +
          perisai('pks-perisai-jiwa', 44, 128, 0.36) +
          teks(70, 124, 'ASURANSI', 'pks-f17 pks-teks-2', 'start') + teks(70, 146, 'JIWA KREDIT', 'pks-f18 pks-teks-1', 'start') +
          syarat + '</g>' +
        pil('pks-chip-tidak-semua', 240, 334, 330, 'TIDAK SEMUA KREDIT MEMILIKINYA', 'pks-teks-aksen');
    },
    siap: function (st) {
      gaya(st, { '.pks-leo': { opacity: 0.2 }, '.pks-jalur-4 .pks-jalur-isi': { strokeDashoffset: 1 - 5 / 14 } });
    },
    /* ketukan: (a) pertanyaan risiko; sosok memudar lembut · (b) asuransi jiwa
       kredit, tidak semua kredit memilikinya · (c) tiga syarat */
    ketuk: [4600, 4800, 4600],
    animate: function (tl, st, K) {
      var tm = Math.max(1600, K.kata(0, 'meninggal dunia') - 200);
      var ta = Math.max(K.B[1] + 100, K.kata(1, 'asuransi jiwa kredit') - 300);
      var tt = Math.max(ta + 1200, K.kata(1, 'tidak semua') - 200);
      var s1 = Math.max(K.B[2] + 100, K.kata(2, 'itu ada') - 200);
      var s2 = Math.max(s1 + 700, K.kata(2, 'masih aktif') - 200);
      var s3 = Math.max(s2 + 700, K.kata(2, 'klaimnya') - 200);
      pudar(tl, satu(st, '.pks-jalur-4'), 0, 500);
      jejak(tl, satu(st, '.pks-jalur-4 .pks-jalur-isi'), [[300, { strokeDashoffset: 1 }], [tm, { strokeDashoffset: 1 - 5 / 14 }, LEMBUT]]);
      pop(tl, satu(st, '.pks-henti'), tm, 520);
      /* sosok Pak Leo memudar perlahan; keluarga tetap dalam cahaya hangat */
      jejak(tl, satu(st, '.pks-leo'), [[0, { opacity: 1 }], [tm, { opacity: 1 }], [tm + 1800, { opacity: 0.2 }, LEMBUT]]);
      jejak(tl, satu(st, '.pks-cahaya-lembut'), [[tm, { opacity: 0 }], [tm + 900, { opacity: 0.8 }], [tm + 2600, { opacity: 0 }]]);
      pudar(tl, satu(st, '.pks-hangat-keluarga'), tm + 600, 1200);
      muncul(tl, satu(st, '.pks-kartu-jiwa'), ta, 620, 'translateX(-14px)');
      muncul(tl, satu(st, '.pks-chip-tidak-semua'), tt, 520);
      [s1, s2, s3].forEach(function (t, i) { muncul(tl, satu(st, '.pks-syarat-' + (i + 1)), t, 480, 'translateX(-8px)'); });
      tl.loop(satu(st, '.pks-hangat-keluarga'), [{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }], { duration: 4400, delay: tm + 2000 });
    }
  };

  /* ---------------- scene 5: risiko penyakit kritis ---------------- */
  var KANTOR = [36, 206];
  var GARIS5 = 'M86 236 C 160 214, 250 210, 330 246';
  S[5] = {
    langit: 'teduh',
    set: function () {
      var jendela = '';
      for (var r = 0; r < 4; r++) for (var c = 0; c < 2; c++) jendela += '<rect class="pks-kantor-jendela" x="' + (KANTOR[0] + 10 + c * 18) + '" y="' + (KANTOR[1] + 12 + r * 18) + '" width="10" height="10" rx="1.5"/>';
      return duniaLuar({ matahari: [440, 120] }) +
        '<g class="pks-kantor"><rect class="pks-kantor-badan" x="' + KANTOR[0] + '" y="' + KANTOR[1] + '" width="56" height="94" rx="3"/>' + jendela + '</g>' +
        '<path class="pks-penghasilan-abu" d="' + GARIS5 + '"/>' +
        '<path class="pks-penghasilan" d="' + GARIS5 + '" pathLength="1"/>' +
        rumah(390, 298, 0.72) +
        '<ellipse class="pks-orang-bayang" cx="214" cy="304" rx="40" ry="7" fill="url(#pksBayang)"/>' +
        orang('pks-leo', 214, 304, 0.5, leo('santai')) +
        grup('pks-medis-grup', 214, 162, plusMedis(214, 162, 17) +
          '<path class="pks-denyut-garis" d="M236 162 H250 L257 150 L265 176 L272 156 L277 162 H300" pathLength="1"/>' +
          teks(214, 130, 'PEMULIHAN', 'pks-f17 pks-teks-1')) +
        pil('pks-biaya', 122, 42, 180, 'BIAYA BERTAMBAH ↑', 'pks-teks-aksen') +
        '<g class="pks-cicilan5" style="' + asal(383, 56) + '">' + kotak(292, 18, 182, 74, 'pks-kartu-besar', 14) + kalender(304, 36) +
          teks(344, 48, 'CICILAN', 'pks-f17 pks-teks-2', 'start') + teks(344, 72, '±Rp15 JT/BLN', 'pks-f17 pks-teks-1', 'start') + '</g>' +
        pil('pks-chip-penghasilan', 140, 334, 248, 'PENGHASILAN TERGANGGU', 'pks-teks-abu') +
        pil('pks-chip-jatuh-tempo', 383, 116, 150, 'JATUH TEMPO', 'pks-teks-aksen') +
        perisai('pks-perisai-ragu', 448, 178, 0.34, teks(0, 10, '?', 'pks-f28 pks-teks-2'));
    },
    siap: function (st) {
      gaya(st, { '.pks-leo .k-kepala': { transform: 'rotate(8deg)' }, '.pks-leo .k-atas': { transform: 'rotate(3deg)' }, '.pks-penghasilan': { opacity: 0.15 } });
    },
    /* ketukan: (a) terdiagnosis penyakit kritis · (b) pemulihan, biaya,
       penghasilan, cicilan · (c) perlindungan kredit belum tentu mencakup */
    ketuk: [4200, 5400, 3400],
    animate: function (tl, st, K) {
      var tp = Math.max(1200, K.kata(0, 'penyakit kritis') - 300);
      var tb = Math.max(K.B[1] + 400, K.kata(1, 'Biaya') - 200);
      var tg = Math.max(tb + 900, K.kata(1, 'penghasilan') - 200);
      var tc = Math.max(tg + 1100, K.kata(1, 'cicilan tetap') - 200);
      var tr = Math.max(K.B[2] + 100, K.kata(2, 'belum tentu') - 300);
      pudar(tl, satu(st, '.pks-leo'), 0, 800);
      jejak(tl, satu(st, '.pks-leo .k-kepala'), [[tp, { transform: 'rotate(0deg)' }], [tp + 900, { transform: 'rotate(8deg)' }, LEMBUT]]);
      jejak(tl, satu(st, '.pks-leo .k-atas'), [[tp, { transform: 'rotate(0deg)' }], [tp + 900, { transform: 'rotate(3deg)' }, LEMBUT]]);
      /* penghasilan mengalir lalu melemah */
      jejak(tl, satu(st, '.pks-penghasilan'), [[0, { strokeDashoffset: 1, opacity: 1 }], [1400, { strokeDashoffset: 0 }, LEMBUT], [tg, { opacity: 1 }], [tg + 1200, { opacity: 0.15 }, LEMBUT]]);
      pop(tl, satu(st, '.pks-medis-grup'), tp, 560);
      gambarGaris(tl, satu(st, '.pks-denyut-garis'), tp + 300, 900, 'linear');
      muncul(tl, satu(st, '.pks-biaya'), tb, 520);
      muncul(tl, satu(st, '.pks-chip-penghasilan'), tg + 300, 520);
      muncul(tl, satu(st, '.pks-cicilan5'), tc, 560, 'translateY(-10px)');
      pop(tl, satu(st, '.pks-chip-jatuh-tempo'), tc + 500, 460);
      jejak(tl, satu(st, '.pks-perisai-ragu'), [[tr, { opacity: 0, transform: 'scale(.6)' }], [tr + 600, { opacity: 0.85, transform: 'none' }, PEGAS]]);
      tl.loop(satu(st, '.pks-kalender'), [{ transform: 'none' }, { transform: 'scale(1.12)', offset: 0.15 }, { transform: 'none', offset: 0.3 }, { transform: 'none' }], { duration: 2400, delay: tc + 800 });
      tl.loop(satu(st, '.pks-medis-grup .pks-medis'), [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 2600, delay: tp + 1200 });
    }
  };

  /* ---------------- scene 6: pertanyaan penting ---------------- */
  var TANYA = [
    ['Jika kita masih harus membayar cicilan,', 'Jika'],
    ['tetapi kesehatan dan penghasilan', 'tetapi'],
    ['terganggu, dari mana dana', 'dari mana'],
    ['untuk melanjutkan semuanya?', 'melanjutkan']
  ];
  var CHIP6 = [['CICILAN', 78, 104, 'membayar cicilan'], ['KESEHATAN', 215, 128, 'kesehatan'], ['PENGHASILAN', 378, 140, 'penghasilan']];
  S[6] = {
    langit: 'redup',
    set: function () {
      var baris = TANYA.map(function (b, i) {
        return '<g class="pks-tanya pks-tanya-' + (i + 1) + '">' + teks(240, 140 + i * 28, b[0], 'pks-f18 ' + (i >= 2 ? 'pks-teks-aksen' : 'pks-teks-1') + ' pks-kalimat') + '</g>';
      }).join('');
      return duniaStudio(240) +
        grup('pks-tanda-tanya', 240, 60, '<circle class="pks-tanya-cahaya" cx="240" cy="60" r="56" fill="url(#pksCahaya)" style="' + asal(240, 60) + '"/><circle class="pks-tanya-lingkar" cx="240" cy="60" r="25"/>' + teks(240, 70, '?', 'pks-f28 pks-teks-aksen')) +
        '<g class="pks-kartu-tanya" style="' + asal(240, 176) + '">' + kotak(26, 102, 428, 142, 'pks-kartu-besar', 18) + baris + '</g>' +
        CHIP6.map(function (c, i) { return pil('pks-chip6 pks-chip6-' + i, c[1], 282, c[2], c[0], 'pks-teks-aksen'); }).join('');
    },
    /* satu segmen; jeda visual sesudah pertanyaan (kartu ditahan, tanda
       tanya berdenyut pelan) sebelum scene boleh dianggap selesai */
    ketuk: [6000],
    jeda: [2600],
    ekor: 600,
    animate: function (tl, st, K) {
      muncul(tl, satu(st, '.pks-kartu-tanya'), 200, 600, 'scale(.96)');
      TANYA.forEach(function (b, i) { muncul(tl, satu(st, '.pks-tanya-' + (i + 1)), Math.max(300 + i * 500, K.kata(0, b[1]) - 150), 520, 'translateY(8px)'); });
      CHIP6.forEach(function (c, i) { pop(tl, satu(st, '.pks-chip6-' + i), Math.max(600 + i * 500, K.kata(0, c[3]) - 100), 460); });
      var tq = Math.max(1500, K.kata(0, 'dari mana') - 200);
      pop(tl, satu(st, '.pks-tanda-tanya'), tq, 620);
      /* jeda: tanda tanya bernapas pelan selama hening */
      tl.loop(satu(st, '.pks-tanya-cahaya'), [{ opacity: 1, transform: 'none' }, { opacity: 0.45, transform: 'scale(1.12)' }, { opacity: 1, transform: 'none' }], { duration: 3000, delay: tq + 700 });
    }
  };

  /* ---------------- scene 7: memperkenalkan Proteksi Kredit ---------------- */
  var ALIR7 = [['CICILAN', 132, 'cicilan'], ['PEMULIHAN', 182, 'pemulihan'], ['KELUARGA', 232, 'kebutuhan keluarga']];
  S[7] = {
    langit: 'studio',
    set: function () {
      var alir = ALIR7.map(function (a, i) {
        return '<g class="pks-alir pks-alir-' + i + '">' + garis('M326 ' + (a[1] + 10) + ' L356 ' + a[1], 'pks-panah') + pil('pks-alir-pil', 412, a[1], 106, a[0], 'pks-teks-biru') + '</g>';
      }).join('');
      return duniaStudio(240) +
        grup('pks-judul7', 240, 30, teks(240, 38, 'PROTEKSI KREDIT', 'pks-f24 pks-teks-aksen')) +
        perisai('pks-perisai-besar', 240, 176, 2.1) +
        rumah(240, 262, 0.62) +
        '<circle class="pks-hangat-rumah" cx="240" cy="226" r="90" fill="url(#pksHangat)"/>' +
        '<ellipse class="pks-orang-bayang" cx="84" cy="304" rx="40" ry="7" fill="url(#pksBayang)"/>' +
        orang('pks-leo', 84, 302, 0.5, leo('kerja')) +
        grup('pks-lapis-jiwa', 116, 330, kotak(30, 306, 172, 50, 'pks-kartu-pil', 16) + teks(116, 327, 'JIWA KREDIT', 'pks-f17 pks-teks-1') + teks(116, 348, 'BILA ADA', 'pks-f17 pks-teks-2')) +
        grup('pks-lapis-kritis', 364, 330, kotak(270, 306, 188, 50, 'pks-kartu-pil pks-kartu-sorot', 16) + teks(364, 327, 'PENYAKIT KRITIS', 'pks-f17 pks-teks-aksen') + teks(364, 348, 'TAMBAHAN', 'pks-f17 pks-teks-2')) +
        alir;
    },
    siap: function (st) {
      gaya(st, { '.pks-leo .k-lengan-d': { transform: 'rotate(-40deg)' }, '.pks-leo .k-hasta-d': { transform: 'rotate(-30deg)' } });
    },
    /* ketukan: (a) perisai terbentuk · (b) dua lapis + arah manfaat */
    ketuk: [5000, 6400],
    animate: function (tl, st, K) {
      var tp = Math.max(500, K.kata(0, 'proteksi kredit') - 300);
      var tj = Math.max(tp + 1600, K.kata(0, 'tetap berjalan') - 300);
      var tw = Math.max(K.B[1] + 100, K.kata(1, 'asuransi jiwa kredit') - 300);
      var tk = Math.max(tw + 900, K.kata(1, 'penyakit kritis') - 300);
      jejak(tl, satu(st, '.pks-rumah'), [[0, { opacity: 0 }], [700, { opacity: 1 }]]);
      pudar(tl, satu(st, '.pks-leo'), 300, 700);
      pop(tl, satu(st, '.pks-judul7'), tp, 560);
      gambarGaris(tl, satu(st, '.pks-perisai-besar .pks-perisai-garis'), tp + 200, 1500);
      jejak(tl, satu(st, '.pks-perisai-besar .pks-perisai-isi'), [[tp + 900, { opacity: 0 }], [tp + 1900, { opacity: 1 }]]);
      jejak(tl, satu(st, '.pks-leo .k-lengan-d'), [[tj, { transform: 'rotate(0deg)' }], [tj + 600, { transform: 'rotate(-40deg)' }, PEGAS]]);
      jejak(tl, satu(st, '.pks-leo .k-hasta-d'), [[tj, { transform: 'rotate(0deg)' }], [tj + 600, { transform: 'rotate(-30deg)' }]]);
      pudar(tl, satu(st, '.pks-hangat-rumah'), tj, 900);
      muncul(tl, satu(st, '.pks-lapis-jiwa'), tw, 520);
      munculDenyut(tl, satu(st, '.pks-lapis-kritis'), tk, 520, null, tk + 600, 1.05);
      ALIR7.forEach(function (a, i) {
        var t = Math.max(tk + 900 + i * 500, K.kata(1, a[2]) - 200);
        gambarGaris(tl, satu(st, '.pks-alir-' + i + ' .pks-panah'), t, 400);
        muncul(tl, satu(st, '.pks-alir-' + i + ' .pks-alir-pil'), t + 150, 460, 'translateX(-8px)');
      });
      tl.loop(satu(st, '.pks-perisai-besar .pks-perisai-isi'), [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 3600, delay: tj + 1000 });
    }
  };

  /* ---------------- scene 8: Pak Leo menambah Proteksi Kredit ----------------
     Nama produk tidak ditampilkan. Angka dari kalkulator Cristal Prime
     aplikasi (engine CRIS, TARIF_CRIS):
     pria 40 tahun, UP Rp2.700.000.000, bayar 10 / lindung 15, bulanan.
     Premi Rp6.129.000/bulan; total premi 10 tahun Rp735.480.000; manfaat
     sakit kritis Rp2.900.000.000 (UP + bonus 20% maks Rp200 jt);
     sehat sampai akhir kontrak 120% × total premi = Rp882.576.000; engine
     memakai nilai yang sama sebagai manfaat meninggal (manfaatMeninggal). */
  var KARTU8 = { x: 140, y: 26, w: 334, h: 324 };
  S[8] = {
    langit: 'studio',
    set: function () {
      var X = KARTU8.x + 16, XK = KARTU8.x + KARTU8.w - 16;
      var baris = function (kelas, y, label, nilai, kecil) {
        return '<g class="pks-baris8 ' + kelas + '" style="' + asal(X + 80, y + 14) + '"><path class="pks-pemisah" d="M' + X + ' ' + (y - 22) + ' H' + XK + '"/>' +
          teks(X, y, label, 'pks-f17 pks-teks-2', 'start') + teks(X, y + 28, nilai, 'pks-f22 pks-teks-1', 'start') +
          (kecil ? teks(X, y + 50, kecil, 'pks-f17 pks-teks-2', 'start') : '') + '</g>';
      };
      return duniaStudio(300) +
        '<ellipse class="pks-orang-bayang" cx="68" cy="304" rx="40" ry="7" fill="url(#pksBayang)"/>' +
        orang('pks-leo', 68, 302, 0.5, leo('kerja')) +
        grup('pks-tenor8', 68, 112, kotak(14, 84, 108, 56, 'pks-kartu-pil', 16) + teks(68, 106, 'TENOR', 'pks-f17 pks-teks-2') + teks(68, 129, '15 TH', 'pks-f17 pks-teks-biru')) +
        '<g class="pks-kartu8" style="' + asal(KARTU8.x + KARTU8.w / 2, KARTU8.y + KARTU8.h / 2) + '">' + kotak(KARTU8.x, KARTU8.y, KARTU8.w, KARTU8.h, 'pks-kartu-besar', 18) +
          teks(X, 64, 'PROTEKSI KREDIT', 'pks-f22 pks-teks-aksen', 'start') +
          '<g class="pks-up8">' + teks(X, 92, 'PRIA 40 TH • UP Rp2,7 M', 'pks-f17 pks-teks-1', 'start') + '</g>' +
          '<g class="pks-masa8" style="' + asal(X + 140, 110) + '">' + teks(X, 116, 'BAYAR 10 TH • LINDUNG 15 TH', 'pks-f17 pks-teks-1', 'start') + '</g>' +
          baris('pks-premi8', 152, 'PREMI', 'Rp6.129.000/BLN') +
          baris('pks-kritis8', 220, 'SAKIT KRITIS • 66 KONDISI', 'Rp2,9 MILIAR', 'UP + BONUS (MAKS Rp200 JT)') +
          baris('pks-akhir8', 304, 'AKHIR KONTRAK / MENINGGAL', 'Rp882.576.000') +
        '</g>' +
        grup('pks-lencana-ilustrasi', XK - 62, KARTU8.y, kotak(XK - 124, KARTU8.y - 15, 124, 30, 'pks-kartu-pil pks-kartu-sorot', 15) + teks(XK - 62, KARTU8.y + 6, 'ILUSTRASI', 'pks-f17 pks-teks-aksen'));
    },
    /* ketukan: (a) menambah proteksi kredit; masa bayar/lindung = tenor ·
       (b) UP, premi, sakit kritis · (c) akhir kontrak / meninggal; ilustrasi,
       bukan jaminan */
    ketuk: [4600, 7200, 4200],
    animate: function (tl, st, K) {
      var tm = Math.max(800, K.kata(0, 'masa bayar') - 200);
      var tn = Math.max(tm + 900, K.kata(0, 'tenor kredit') - 200);
      var tu = Math.max(K.B[1] + 100, K.kata(1, 'uang pertanggungan') - 100);
      var tp = Math.max(tu + 900, K.kata(1, 'preminya') - 200);
      var tk = Math.max(tp + 1100, K.kata(1, 'kondisi kritis') - 300);
      var tb = Math.max(tk + 900, K.kata(1, 'dua koma sembilan') - 200);
      var ta = K.B[2] + 100;
      var ti = Math.max(ta + 1200, K.kata(2, 'ilustrasi') - 200);
      pudar(tl, satu(st, '.pks-leo'), 0, 700);
      muncul(tl, satu(st, '.pks-kartu8'), 300, 640, 'translateX(16px)');
      popDenyut(tl, satu(st, '.pks-lencana-ilustrasi'), 700, 500, ti, 1.12);
      munculDenyut(tl, satu(st, '.pks-masa8'), tm, 520, 'translateX(-8px)', tn + 200, 1.04);
      pop(tl, satu(st, '.pks-tenor8'), tn, 500);
      muncul(tl, satu(st, '.pks-up8'), tu, 520, 'translateX(-8px)');
      muncul(tl, satu(st, '.pks-premi8'), tp, 520, 'translateX(-8px)');
      munculDenyut(tl, satu(st, '.pks-kritis8'), tk, 520, 'translateX(-8px)', tb, 1.03);
      muncul(tl, satu(st, '.pks-akhir8'), ta, 520, 'translateX(-8px)');
    }
  };

  /* ---------------- scene 9: simulasi 3 skenario ----------------
     Kiri: KPR (+ asuransi jiwa kredit bila ada). Kanan: Proteksi Kredit.
     Skenario 3: total sisa angsuran = Rp15 jt × 12 × 10 tahun (penjumlahan
     angsuran ilustrasi, bukan sisa pokok resmi bank) dibandingkan manfaat
     sakit kritis Rp2,9 M. */
  var SKENARIO9 = [
    { judul: 'LANCAR SAMPAI KREDIT SELESAI', kiri: ['KPR lunas', 'Rumah milik Pak Leo'], kanan: ['Dana kembali (120%)', 'Rp882.576.000'],
      kata: ['milik Pak Leo', 'mengembalikan'] },
    { judul: 'MENINGGAL DUNIA', kiri: ['Asuransi jiwa kredit*', 'Sisa KPR lunas'], kanan: ['Manfaat meninggal', 'Rp882.576.000'],
      kata: ['sisa kredit', 'Keluarga juga'] },
    { judul: 'SAKIT KRITIS DI TAHUN KE-5', kiri: ['Rp15 jt × 12 × 10 th', '= Rp1,8 MILIAR'], kanan: ['Cair Rp2,9 M, cukup', 'Sisa ±Rp1,1 M'],
      kata: ['sisa angsuran', 'Manfaatnya'] }
  ];
  S[9] = {
    langit: 'studio',
    set: function () {
      var baris = SKENARIO9.map(function (r, i) {
        var y = 46 + i * 104;
        var sel = function (kelas, x, isi) {
          return '<g class="pks-sel ' + kelas + '" style="' + asal(x + 112, y + 63) + '">' + kotak(x, y + 30, 224, 66, kelas === 'pks-sel-kanan' ? 'pks-kartu-proteksi' : 'pks-kartu-kpr', 12) +
            teks(x + 14, y + 55, isi[0], 'pks-f17 pks-teks-2 pks-kalimat', 'start') + teks(x + 14, y + 83, isi[1], 'pks-f18 pks-teks-1 pks-kalimat', 'start') + '</g>';
        };
        return '<g class="pks-skenario pks-skenario-' + (i + 1) + '">' +
          '<g class="pks-skenario-judul"><circle class="pks-nomor" cx="24" cy="' + (y + 14) + '" r="11"/>' + teks(24, y + 20, String(i + 1), 'pks-f17 pks-teks-ajakan') +
            teks(44, y + 20, r.judul, 'pks-f17 pks-teks-1', 'start') + '</g>' +
          sel('pks-sel-kiri', 12, r.kiri) + sel('pks-sel-kanan', 244, r.kanan) + '</g>';
      }).join('');
      return duniaStudio(240) +
        '<g class="pks-kepala9"><g>' + kotak(12, 6, 224, 30, 'pks-kartu-pil', 15) + teks(124, 27, 'KPR', 'pks-f17 pks-teks-1') + '</g>' +
          '<g>' + kotak(244, 6, 224, 30, 'pks-kartu-pil pks-kartu-sorot', 15) + teks(356, 27, 'PROTEKSI KREDIT', 'pks-f17 pks-teks-aksen') + '</g></g>' +
        baris;
    },
    /* ketukan: satu skenario per segmen narasi */
    ketuk: [6000, 6000, 6400],
    animate: function (tl, st, K) {
      muncul(tl, satu(st, '.pks-kepala9'), 100, 520, 'translateY(-8px)');
      SKENARIO9.forEach(function (r, i) {
        var g = satu(st, '.pks-skenario-' + (i + 1));
        var tj = K.B[i] + (i ? 100 : 1200);
        var tk = Math.max(tj + 600, K.kata(i, r.kata[0]) - 300);
        var tn = Math.max(tk + 700, K.kata(i, r.kata[1]) - 300);
        muncul(tl, satu(g, '.pks-skenario-judul'), tj, 480, 'translateX(-10px)');
        muncul(tl, satu(g, '.pks-sel-kiri'), tk, 520, 'translateY(8px)');
        if (i === 2) munculDenyut(tl, satu(g, '.pks-sel-kanan'), tn, 520, 'translateY(8px)', Math.max(tn + 900, K.kata(i, 'tersisa') - 200), 1.04);
        else muncul(tl, satu(g, '.pks-sel-kanan'), tn, 520, 'translateY(8px)');
      });
    }
  };

  /* ---------------- scene 10: ajakan ---------------- */
  S[10] = {
    langit: 'studio',
    set: function () {
      return duniaStudio(240) +
        '<g class="pks-logo-grup" style="' + asal(240, 64) + '">' +
          '<image class="pks-logo pks-logo-terang" href="assets/logo-psg.png" x="168" y="26" width="144" height="76" preserveAspectRatio="xMidYMid meet"/>' +
          '<image class="pks-logo pks-logo-gelap" href="assets/logo-psg-terang.png" x="168" y="26" width="144" height="76" preserveAspectRatio="xMidYMid meet"/>' +
        '</g>' +
        '<g class="pks-kalimat-1">' + teks(240, 146, 'Jangan hanya merencanakan', 'pks-f22 pks-teks-1 pks-kalimat') + teks(240, 174, 'cara memiliki aset.', 'pks-f22 pks-teks-1 pks-kalimat') + '</g>' +
        '<g class="pks-kalimat-2">' + teks(240, 214, 'Rencanakan juga', 'pks-f22 pks-teks-aksen pks-kalimat') + teks(240, 242, 'perlindungan finansialnya.', 'pks-f22 pks-teks-aksen pks-kalimat') + '</g>' +
        grup('pks-ajakan', 240, 300, kotak(36, 270, 408, 62, 'pks-kartu-ajakan', 31) +
          teks(240, 296, 'Mari hitung kebutuhan Proteksi Kredit', 'pks-f17 pks-teks-ajakan pks-kalimat') +
          teks(240, 318, 'Anda bersama kami →', 'pks-f17 pks-teks-ajakan pks-kalimat'));
    },
    /* ketukan: (a) dua kalimat penutup · (b) ajakan menghitung */
    ketuk: [4600, 3600],
    animate: function (tl, st, K) {
      var t2 = Math.max(1800, K.kata(0, 'Rencanakan juga') - 200);
      var tc = Math.max(K.B[1] + 100, K.kata(1, 'Mari hitung') - 200);
      jejak(tl, satu(st, '.pks-logo-grup'), [[0, { opacity: 0, transform: 'scale(.9)' }], [800, { opacity: 1, transform: 'none' }, PEGAS]]);
      muncul(tl, satu(st, '.pks-kalimat-1'), 300, 600);
      muncul(tl, satu(st, '.pks-kalimat-2'), t2, 600);
      pop(tl, satu(st, '.pks-ajakan'), tc, 600);
      tl.loop(satu(st, '.pks-ajakan'), [{ transform: 'none' }, { transform: 'scale(1.025)' }, { transform: 'none' }], { duration: 2600, delay: tc + 900 });
    }
  };

  /* ---------------- kerangka scene ---------------- */
  var INTI = [0, 0, 480, 360];
  function kerangka(opsi, step, i, sc) {
    var n = i + 1;
    return '<div class="pks" data-pks="' + n + '" data-ketuk="0">' + (opsi.header || '') +
      '<div class="pks-body">' +
        '<figure class="pks-stage pks-s' + n + ' pks-langit-' + (sc.langit || 'pagi') + '" role="img" aria-label="' + esc('Ilustrasi langkah ' + n + ': ' + step.title + '. ' + (ARIA[i] || '')) + '">' +
          '<div class="pks-langit"></div>' +
          '<svg class="pks-rig" data-inti="' + INTI.join(' ') + '" viewBox="' + INTI.join(' ') + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + defs() + sc.set() + '</svg>' +
          '<div class="pks-vignette"></div>' +
        '</figure>' +
        '<div class="pks-text">' +
          '<span class="pks-kicker">INTI PESAN • ' + n + '/' + JUMLAH + '</span>' +
          '<h3 class="pks-title">' + esc(step.title) + '</h3>' +
          '<p class="pks-focus">' + esc(step.focus) + '</p>' +
          '<p class="pks-isi">' + esc(step.body) + '</p>' +
        '</div>' +
      '</div></div>';
  }
  function animasiTeks(tl, stage) {
    muncul(tl, satu(stage, '.pks-title'), 120, 520);
    muncul(tl, satu(stage, '.pks-focus'), 300, 520);
    muncul(tl, satu(stage, '.pks-isi'), 480, 560);
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
    var rigs = semua(stage, '.pks-rig');
    rigs.forEach(paskan);
    if (!window.ResizeObserver) return;
    if (!pengamat) pengamat = new ResizeObserver(function (e) { e.forEach(function (x) { paskan(x.target); }); });
    pengamat.disconnect();
    rigs.forEach(function (r) { pengamat.observe(r); });
  }

  /* Ketukan scene: B = saat mulai tiap ketukan, D = lamanya, akhir = ujung
     timeline. Lama ketukan = maks(kebutuhan gerak, perkiraan narasi, lama
     rekaman) + jeda; "ekor" memperpanjang ujung scene. */
  function ketukan(n) {
    var sc = S[n] || S[1], naskah = NARASI[n - 1] || [], vis = sc.ketuk || [], jeda = sc.jeda || [], B = [], D = [], t = sc.awal || 0;
    naskah.forEach(function (seg, j) {
      var d = Math.max(vis[j] || 0, lamaSegmen(seg), lamaRekaman(n, j + 1)) + (jeda[j] || 0);
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

  var N = null;
  function adegan(opsi) {
    var o = opsi || {};
    var langkah = Array.isArray(o.langkah) ? o.langkah : [];
    N = window.PSGNarasi || null;
    if (N) {
      /* tanpa manifest rekaman → suara browser (Web Speech) lewat narator bersama */
      N.daftar('.pks', 'data-pks', NARASI, N.rekamanDari ? N.rekamanDari(window.PSGKreditAudio, NARASI) : null);
      N.pasang();
      o = Object.assign({}, o, { header: N.tombol(o.header || '') });
    }
    return langkah.map(function (step, i) {
      var n = i + 1, sc = S[n] || S[1];
      return {
        id: 'kredit-' + n,
        fit: true,
        siapDi: 'akhir',
        render: function (stage) {
          if (typeof o.padaLangkah === 'function') o.padaLangkah(i);
          stage.innerHTML = kerangka(o, step, i, sc);
          var st = stage.querySelector('.pks-stage');
          pasangPoros(st);
          amati(stage);
          if (sc.siap) sc.siap(st);
          if (N) N.tandai();
        },
        animate: function (tl, stage) {
          var st = stage.querySelector('.pks-stage'), node = stage.querySelector('.pks'), K = ketukan(n);
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
  window.PSGKreditStory = {
    adegan: adegan,
    naskah: function () { return NARASI.map(function (s) { return s.slice(); }); },
    durasi: function () { return S.slice(1).map(function (sc, i) { return ketukan(i + 1).akhir; }); },
    ketukan: function (n) { var k = ketukan(n); return { B: k.B.slice(), D: k.D.slice(), akhir: k.akhir }; }
  };
})();
