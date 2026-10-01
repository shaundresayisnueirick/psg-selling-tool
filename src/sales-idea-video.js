/* ============================================================
   Sales Idea → "⬇ Download Video" (Asset Creation, Retirement Planning,
   Keranjang Kehidupan)
   ------------------------------------------------------------
   Tombol unduh video pre-render (assets/video/<cerita>-terang.mp4 atau
   <cerita>-gelap.mp4, menurut tema aktif saat tombol diklik; cerita yang punya
   versi 9:16 memberi <cerita>-<tema>-portrait.mp4 kepada smartphone — lihat
   kelasPerangkat()) baru tampil
   sesudah presentasi ditonton UTUH, dari awal sampai akhir, secara
   normal di sesi ini. Modul ini tidak mengubah pemutar, narator, maupun
   scene; ia hanya membaca:
     - status pemutar : atribut data-sip-status pada #layarSalesIdea
     - scene aktif    : node scene cerita (.acs[data-acs], .rps[data-rps],
                        .kbs[data-kbs])
                        di panggung + SalesIdea10Jari.keadaan()
     - jam scene      : animasi berhingga terpanjang di panggung saat scene
                        mulai berputar (ujungnya = durasi timeline scene)
   Satu putaran:
     - mulai : scene 1 berputar dari awal lewat Play / Replay (jam ≈ 0);
     - lanjut: tiap scene berputar sampai selesai (status 'selesai' dengan
               jam di ujung), baru NEXT ke scene berikutnya yang juga
               berputar dari awal; PAUSE / RESUME boleh; Play pada scene
               yang sudah selesai memutarnya ulang dari awal (tetap sah);
     - gugur : NEXT sebelum scene selesai, BACK (termasuk ke scene 1),
               lompat scene, scene tidak mulai dari awal, tidak dimulai dari
               scene 1, jam maju lebih cepat dari waktu nyata (seek /
               currentTime / playbackRate), jam mundur, atau status
               'selesai' padahal jam belum di ujung.
   BACK dan REPLAY sama-sama menggambar ulang scene 1, jadi klik/tombol
   keyboard pemutar dicatat (hanya dibaca) untuk membedakannya.
   Putaran gugur hanya bisa diganti putaran baru dari scene 1. Scene
   terakhir selesai dalam putaran sah → tombol tampil dan tetap tampil
   sampai keluar dari cerita itu atau halaman dimuat ulang (status hanya di
   memori, tidak disimpan).
   Ini gerbang tampilan, bukan pengaman berkas: video tetap bisa diunduh
   langsung lewat URL-nya.
   ============================================================ */
(function () {
  'use strict';

  /* video pre-render per tema; yang diunduh mengikuti tema aktif saat tombol diklik */
  var CERITA = {
    asset: {
      sel: '.acs', attr: 'data-acs',
      video: { terang: 'assets/video/asset-terang.mp4', gelap: 'assets/video/asset-gelap.mp4' },
      nama: { terang: 'PSG-Asset-Light.mp4', gelap: 'PSG-Asset-Dark.mp4' }
    },
    retirement: {
      sel: '.rps', attr: 'data-rps',
      video: { terang: 'assets/video/retirement-terang.mp4', gelap: 'assets/video/retirement-gelap.mp4' },
      nama: { terang: 'PSG-Retirement-Light.mp4', gelap: 'PSG-Retirement-Dark.mp4' },
      /* 9:16 (720×1280) untuk smartphone */
      potret: {
        video: { terang: 'assets/video/retirement-terang-portrait.mp4', gelap: 'assets/video/retirement-gelap-portrait.mp4' },
        nama: { terang: 'PSG-Retirement-Light-Portrait.mp4', gelap: 'PSG-Retirement-Dark-Portrait.mp4' }
      }
    },
    basket: {
      sel: '.kbs', attr: 'data-kbs',
      video: { terang: 'assets/video/basket-terang.mp4', gelap: 'assets/video/basket-gelap.mp4' },
      nama: { terang: 'PSG-Basket-Light.mp4', gelap: 'PSG-Basket-Dark.mp4' },
      /* 9:16 (720×1280) untuk smartphone */
      potret: {
        video: { terang: 'assets/video/basket-terang-portrait.mp4', gelap: 'assets/video/basket-gelap-portrait.mp4' },
        nama: { terang: 'PSG-Basket-Light-Portrait.mp4', gelap: 'PSG-Basket-Dark-Portrait.mp4' }
      }
    }
  };
  var TOLERANSI_MULAI = 400;   /* md: jam scene saat terlihat mulai berputar */
  var TOLERANSI_MAJU = 300;    /* md: selisih jam vs waktu nyata (jitter frame) */
  var LAJU_MAKS = 1.1;         /* jam tidak boleh lebih cepat dari ini × waktu nyata */
  var TOLERANSI_AKHIR = 100;   /* md: jam saat status 'selesai' */
  var SAMPEL = 200;            /* md */

  var root = null, stage = null, tombol = null, timer = 0;
  var sesi = null;     /* { kunci, c, status, alasan, putaran, adegan, sah } */

  function SI() { return window.SalesIdea10Jari || null; }
  function modeAktif() {
    var si = SI();
    if (!root || !root.classList.contains('aktif') || !si || typeof si.keadaan !== 'function') return null;
    var m = si.keadaan().mode;
    return CERITA[m] ? m : null;
  }
  function sekarang() { return window.performance && performance.now ? performance.now() : Date.now(); }

  /* jam scene: animasi berhingga dengan ujung terjauh di panggung */
  function cariJam() {
    var jam = null, ujung = -1;
    if (!stage || typeof stage.getAnimations !== 'function') return null;
    stage.getAnimations({ subtree: true }).forEach(function (a) {
      var e;
      try { e = a.effect.getComputedTiming().endTime; } catch (x) { return; }
      if (isFinite(e) && e > ujung) { ujung = e; jam = a; }
    });
    return jam ? { jam: jam, durasi: ujung } : null;
  }
  function waktu(jam) { var t = jam && jam.currentTime; return typeof t === 'number' ? t : null; }

  function gugur(alasan) {
    if (!sesi || sesi.sah) return;
    if (sesi.putaran) sesi.putaran = null;
    sesi.status = 'tidak-sah';
    sesi.alasan = alasan;
  }

  /* bandingkan gerak jam scene dengan waktu nyata sejak sampel terakhir */
  function sampel() {
    var d = sesi && sesi.adegan;
    if (!d || !d.jam) return;
    var t = waktu(d.jam), w = sekarang();
    if (t === null) return;   /* scene sudah dibongkar pemutar */
    /* di ujung scene currentTime bisa terbaca beberapa md melewati akhir lalu
       dijepit ke akhir; tanpa batas ini terbaca sebagai jam mundur */
    t = Math.min(t, d.durasi);
    var dA = t - d.a, dW = w - d.w;
    if (d.jam.playbackRate !== 1) gugur('laju animasi diubah');
    else if (dA < -1) gugur('jam scene mundur (seek)');
    else if (dA > dW * LAJU_MAKS + TOLERANSI_MAJU) gugur('jam scene maju lebih cepat dari waktu nyata (seek)');
    d.a = t;
    d.w = w;
  }

  /* Niat terakhir pengguna (Back / Next / Play / Replay, klik atau tombol
     keyboard pemutar) — hanya dibaca, dipakai untuk membedakan BACK ke
     scene 1 dari REPLAY: keduanya menggambar ulang scene 1 dari awal. */
  var niat = null;
  function catatNiat(jenis) { niat = { jenis: jenis, t: sekarang() }; }
  function ambilNiat() { var n = niat && sekarang() - niat.t < 1500 ? niat.jenis : null; niat = null; return n; }

  /* scene (node) mulai berputar: aturan putaran */
  function mulaiAdegan(d, sebelumnya) {
    var j = cariJam();
    d.jam = j ? j.jam : null;
    d.durasi = j ? j.durasi : 0;
    d.a = waktu(d.jam);
    d.w = sekarang();
    d.dipantau = true;
    d.selesai = false;
    var dariAwal = d.a !== null && d.a <= TOLERANSI_MULAI;
    var n = ambilNiat(), p = sesi.putaran;
    if (n === 'back' || (sebelumnya && d.indeks < sebelumnya.indeks && n !== 'replay' && n !== 'play')) {
      gugur('BACK ke scene ' + (d.indeks + 1));
      return;
    }
    if (d.indeks === 0 && dariAwal) {
      if (!sesi.sah) { sesi.putaran = { indeks: 0, selesai: false }; sesi.status = 'berjalan'; sesi.alasan = ''; }
      return;
    }
    if (!p) {
      if (sesi.status === 'belum') gugur('tidak dimulai dari scene 1');
      return;
    }
    if (!dariAwal) gugur('scene ' + (d.indeks + 1) + ' tidak diputar dari awal');
    else if (d.indeks === p.indeks) p.selesai = false;   /* scene yang sama diputar ulang dari awal */
    else if (d.indeks === p.indeks + 1 && p.selesai) { p.indeks = d.indeks; p.selesai = false; }
    else if (d.indeks === p.indeks + 1) gugur('NEXT sebelum scene ' + (p.indeks + 1) + ' selesai');
    else gugur('lompat ke scene ' + (d.indeks + 1));
  }

  function selesaiAdegan(d) {
    d.selesai = true;
    var p = sesi.putaran;
    if (!d.jam || !p || p.indeks !== d.indeks) return;
    var t = waktu(d.jam);
    if (t === null || t < d.durasi - TOLERANSI_AKHIR) { gugur('scene ' + (d.indeks + 1) + ' selesai tanpa jam sampai ujung'); return; }
    p.selesai = true;
    if (d.indeks === sesi.total - 1) { sesi.sah = true; sesi.status = 'selesai'; sesi.alasan = ''; }
  }

  function periksa() {
    var kunci = modeAktif();
    if (!kunci) { if (sesi) keluar(); return; }
    if (!sesi || sesi.kunci !== kunci) masuk(kunci);
    sampel();
    var c = sesi.c, node = stage.querySelector(c.sel), status = root.getAttribute('data-sip-status');
    var si = SI();
    sesi.total = si.keadaan().total || 0;
    if (!node) { tampilkan(); return; }
    var d = sesi.adegan;
    if (!d || d.node !== node) {
      /* scene baru di panggung (NEXT / BACK / PLAY / REPLAY / dibuka) */
      var lama = d;
      d = sesi.adegan = { node: node, indeks: (+node.getAttribute(c.attr) || 1) - 1, dipantau: false, selesai: false, jam: null };
      if (status === 'berputar') mulaiAdegan(d, lama);
      else if (status !== 'siap') gugur('scene ' + (d.indeks + 1) + ' tidak diputar');
      else if (!sesi.sah) { sesi.putaran = null; sesi.status = 'belum'; sesi.alasan = ''; }   /* dibuka ulang: diam di frame siap */
    } else if (status === 'berputar' && !d.dipantau) {
      mulaiAdegan(d, null);
    }
    if (status === 'selesai' && d.dipantau && !d.selesai) selesaiAdegan(d);
    tampilkan();
  }

  function masuk(kunci) {
    sesi = { kunci: kunci, c: CERITA[kunci], status: 'belum', alasan: '', putaran: null, adegan: null, sah: false, total: 0 };
    pasangTombol();
    arahkanUnduhan();
    if (!timer) timer = setInterval(periksa, SAMPEL);
  }
  function keluar() {
    sesi = null;
    if (timer) { clearInterval(timer); timer = 0; }
    tampilkan();
  }

  function pasangTombol() {
    if (tombol) return;
    var meta = root.querySelector('.sip-meta');
    if (!meta) return;
    if (!document.getElementById('sipUnduhGaya')) {
      var s = document.createElement('style');
      s.id = 'sipUnduhGaya';
      s.textContent =
        '#layarSalesIdea .sip-meta .sip-unduh{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:none;' +
          'min-height:36px;padding:0 14px;border-radius:12px;border:1px solid #a60101;background:#a60101;color:#fff;' +
          'font:inherit;font-size:13px;font-weight:800;line-height:1;white-space:nowrap;text-decoration:none;cursor:pointer}' +
        '#layarSalesIdea .sip-meta .sip-unduh[hidden]{display:none}' +
        '#layarSalesIdea .sip-meta .sip-unduh:hover{filter:brightness(1.08)}' +
        '#layarSalesIdea .sip-meta .sip-unduh:focus-visible{outline:2px solid var(--focus);outline-offset:2px}' +
        '[data-theme="dark"] #layarSalesIdea .sip-meta .sip-unduh{border-color:var(--primary);background:var(--primary);color:var(--on-primary)}';
      document.head.appendChild(s);
    }
    tombol = document.createElement('a');
    tombol.className = 'sip-unduh';
    tombol.hidden = true;
    tombol.textContent = '⬇ Download Video';
    /* dipanggil sebelum aksi bawaan tautan: perangkat & tema yang berlaku saat klik */
    tombol.addEventListener('click', arahkanUnduhan);
    meta.appendChild(tombol);
  }
  /* tema aktif (atribut dari theme-switcher.js): Dark → gelap, selain itu terang */
  function temaAktif() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'gelap' : 'terang';
  }
  /* Kelas perangkat, dibaca ulang setiap kali dipakai (tidak disimpan), hanya dari
     kemampuan browser — tanpa daftar nama perangkat atau user-agent:
       1. penunjuk utama presisi + hover (mouse/trackpad)      → 'desktop'
       2. tidak ada layar sentuh sama sekali                    → 'desktop'
       3. layar sentuh: sisi pendek LAYAR (screen, px CSS)
          < 600 → 'smartphone', ≥ 600 → 'tablet'
     Ambang 600 = batas "smallest width 600dp" Android untuk tablet: HP terbesar
     ±430–480, tablet kecil ≥ 744, foldable terbuka ≥ 600, layar luar foldable
     < 600. Sisi pendek screen tidak berubah saat diputar, jadi orientasi tidak
     mengubah kelas (HP landscape tetap smartphone), dan tidak ikut mengecil saat
     jendela/split-screen atau "situs desktop" (viewport melebar, screen tetap).
     Viewport hanya cadangan bila screen tidak tersedia.
     Konsekuensi aturan 1 (disengaja): perangkat sentuh yang penunjuk utamanya
     mouse/trackpad (HP + mouse, mode desktop seperti DeX, tablet + trackpad)
     diperlakukan sebagai desktop → 16:9. Hasil video: smartphone → 9:16;
     tablet & desktop → 16:9. */
  var AMBANG_TABLET = 600;
  function cocok(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  function kelasPerangkat() {
    if (cocok('(pointer: fine)') && cocok('(hover: hover)')) return 'desktop';
    var sentuh = (navigator.maxTouchPoints || 0) > 0 || cocok('(any-pointer: coarse)') || 'ontouchstart' in window;
    if (!sentuh) return 'desktop';
    var l = window.screen || {}, pendek = Math.min(+l.width || 0, +l.height || 0);
    if (!pendek) pendek = Math.min(window.innerWidth || 0, window.innerHeight || 0);
    return pendek && pendek < AMBANG_TABLET ? 'smartphone' : 'tablet';
  }
  /* berkas unduhan: smartphone → 9:16 bila cerita punya; selain itu 16:9; lalu tema */
  function berkasUnduh(c) {
    var t = temaAktif(), v = c.potret && kelasPerangkat() === 'smartphone' ? c.potret : c;
    return { href: v.video[t], nama: v.nama[t] };
  }
  function arahkanUnduhan() {
    if (!tombol || !sesi) return;
    var b = berkasUnduh(sesi.c);
    if (tombol.getAttribute('href') !== b.href) tombol.setAttribute('href', b.href);
    if (tombol.getAttribute('download') !== b.nama) tombol.setAttribute('download', b.nama);
  }
  function tampilkan() {
    if (!tombol) return;
    var tampil = !!(sesi && sesi.sah && modeAktif() === sesi.kunci);
    if (tombol.hidden === tampil) tombol.hidden = !tampil;
    arahkanUnduhan();
  }

  function pasang() {
    root = document.getElementById('layarSalesIdea');
    stage = document.getElementById('salesIdeaContent');
    if (!root || !stage || !window.MutationObserver) return;
    var mo = new MutationObserver(periksa);
    mo.observe(root, { attributes: true, attributeFilter: ['class', 'data-sip-status'] });
    mo.observe(stage, { childList: true });
    /* fase capture: tercatat sebelum pemutar menanganinya */
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('#siPrev,#siNext,#siReplay,#siPlay');
      if (b) catatNiat(b.id === 'siPrev' ? 'back' : b.id === 'siNext' ? 'next' : b.id === 'siReplay' ? 'replay' : 'play');
    }, true);
    document.addEventListener('keydown', function (e) {
      if (!modeAktif() || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') catatNiat('back');
      else if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') catatNiat('next');
      else if (k === 'r' || k === 'R') catatNiat('replay');
      else if (k === ' ' || k === 'Spacebar') catatNiat('play');
    }, true);
    periksa();
  }

  /* keadaan (baca saja; salinan baru tiap panggilan) untuk pengujian */
  window.PSGUnduhVideo = Object.freeze({
    keadaan: function () {
      return {
        cerita: sesi ? sesi.kunci : null,
        status: sesi ? sesi.status : 'belum',
        alasan: sesi ? sesi.alasan : '',
        adegan: sesi && sesi.putaran ? sesi.putaran.indeks + 1 : 0,
        total: sesi ? sesi.total : 0,
        tombol: !!(tombol && !tombol.hidden),
        perangkat: kelasPerangkat()
      };
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang);
  else pasang();
})();
