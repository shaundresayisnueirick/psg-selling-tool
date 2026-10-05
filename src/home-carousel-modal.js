/* Flyer carousel Beranda diperbesar dalam modal di dalam aplikasi (<dialog>,
   bukan Fullscreen API). Terpisah dari logika carousel: modul ini hanya
   membaca slide dan data-active-index, lalu menahan/melepas carousel lewat
   event 'psg-carousel:tahan' / 'psg-carousel:lepas' (src/home-carousel.js).
   Aset flyer yang dipakai sama dengan slide; isi dan urutannya tidak diubah. */
(function () {
  'use strict';

  function mulai() {
    var root = document.getElementById('psgHomeCarousel');
    if (!root || root.dataset.carouselReady !== '1' || root.dataset.flyerModalReady === '1') return;
    var viewport = root.querySelector('.psg-home-carousel__viewport');
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-slide]'));
    if (!viewport || !slides.length || typeof window.HTMLDialogElement !== 'function') return;
    root.dataset.flyerModalReady = '1';

    var layarBeranda = root.closest('.layar');
    var modal = null;
    var gambar = null;
    var tombolTutup = null;
    var terbuka = false;
    var tekan = null;

    /* Pemicu: satu tombol transparen seluas flyer, sehingga klik/tap pada
       flyer membukanya dan pengguna keyboard punya padanan yang bisa difokus.
       Swipe tetap sampai ke viewport karena event pointer menggelembung. */
    var pemicu = document.createElement('button');
    pemicu.type = 'button';
    pemicu.className = 'psg-home-carousel__perbesar';
    pemicu.setAttribute('data-flyer-perbesar', '');
    pemicu.setAttribute('aria-haspopup', 'dialog');
    viewport.appendChild(pemicu);

    function nama(slide) {
      var img = slide.querySelector('img');
      return slide.getAttribute('data-product') || (img && img.alt) || '';
    }
    function indeksAktif() {
      var i = Number(root.dataset.activeIndex);
      return i >= 0 && i < slides.length ? i : 0;
    }
    function perbaruiLabel() {
      var i = indeksAktif();
      pemicu.setAttribute('aria-label', 'Perbesar flyer ' + (i + 1) + ' dari ' + slides.length + ': ' + nama(slides[i]));
    }

    /* Flyer yang benar-benar berada di bawah titik klik (termasuk slide klon
       di ujung track saat transisi); aktivasi keyboard memakai slide aktif. */
    function slideDiklik(event) {
      if (event.detail > 0 && document.elementsFromPoint) {
        var di = document.elementsFromPoint(event.clientX, event.clientY);
        for (var j = 0; j < di.length; j++) {
          var fig = di[j].closest ? di[j].closest('.psg-home-carousel__slide') : null;
          if (!fig || !root.contains(fig)) continue;
          var produk = fig.getAttribute('data-product');
          for (var k = 0; k < slides.length; k++) if (nama(slides[k]) === produk) return k;
        }
      }
      return indeksAktif();
    }

    /* Klik di area letterbox <img> (object-fit: contain) dihitung sebagai
       klik overlay, bukan klik flyer. */
    function diLuarFlyer(event) {
      var r = gambar.getBoundingClientRect(), lw = gambar.naturalWidth, lt = gambar.naturalHeight;
      if (!lw || !lt || !r.width || !r.height) return false;
      var skala = Math.min(r.width / lw, r.height / lt), w = lw * skala, h = lt * skala;
      var x = r.left + (r.width - w) / 2, y = r.top + (r.height - h) / 2;
      return event.clientX < x || event.clientX > x + w || event.clientY < y || event.clientY > y + h;
    }

    function buatModal() {
      modal = document.createElement('dialog');
      modal.className = 'psg-flyer-modal tanpa-cetak';
      modal.id = 'psgFlyerModal';
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML =
        '<div class="psg-flyer-modal__bilah">' +
          '<button type="button" class="psg-flyer-modal__tutup" data-flyer-tutup>✕ Tutup</button>' +
        '</div>' +
        '<div class="psg-flyer-modal__panggung" data-flyer-panggung>' +
          '<img class="psg-flyer-modal__gambar" data-flyer-gambar alt="" decoding="async" draggable="false">' +
        '</div>';
      document.body.appendChild(modal);
      gambar = modal.querySelector('[data-flyer-gambar]');
      tombolTutup = modal.querySelector('[data-flyer-tutup]');

      tombolTutup.addEventListener('click', function () { tutup(true); });
      modal.addEventListener('click', function (event) {
        if (event.target === tombolTutup) return;
        if (event.target === gambar && !diLuarFlyer(event)) return;
        tutup(true);
      });
      modal.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') { event.preventDefault(); tutup(true); }
        /* Tombol Tutup satu-satunya kontrol: Tab tetap di dalam modal,
           Escape/Tutup selalu bisa keluar. */
        else if (event.key === 'Tab') { event.preventDefault(); tombolTutup.focus(); }
      });
      /* Escape lewat close watcher (mis. gestur Kembali Android) */
      modal.addEventListener('cancel', function (event) { event.preventDefault(); tutup(true); });
      modal.addEventListener('close', function () { if (terbuka) tutup(true); });
    }

    function buka(i) {
      if (terbuka) return;
      if (!modal) buatModal();
      var slide = slides[i], img = slide.querySelector('img');
      if (!img) return;
      terbuka = true;
      root.dispatchEvent(new CustomEvent('psg-carousel:tahan'));
      gambar.src = img.currentSrc || img.getAttribute('src');
      gambar.alt = img.alt || nama(slide);
      modal.setAttribute('aria-label', 'Flyer ' + nama(slide) + ' diperbesar');
      modal.dataset.flyerIndex = String(i);
      document.documentElement.classList.add('psg-flyer-modal-terbuka');
      modal.showModal();
      tombolTutup.focus();
    }

    function tutup(fokusKembali) {
      if (!terbuka) return;
      terbuka = false;
      if (modal.open) modal.close();
      document.documentElement.classList.remove('psg-flyer-modal-terbuka');
      root.dispatchEvent(new CustomEvent('psg-carousel:lepas'));
      if (fokusKembali && pemicu.isConnected) pemicu.focus({ preventScroll: true });
    }

    pemicu.addEventListener('pointerdown', function (event) { tekan = { x: event.clientX, y: event.clientY }; });
    pemicu.addEventListener('click', function (event) {
      var t = tekan;
      tekan = null;
      /* tarikan, bukan klik: biarkan sebagai gestur carousel */
      if (t && event.detail > 0 && Math.abs(event.clientX - t.x) + Math.abs(event.clientY - t.y) > 10) return;
      buka(slideDiklik(event));
    });

    perbaruiLabel();
    if (window.MutationObserver) {
      new MutationObserver(perbaruiLabel).observe(root, { attributes: true, attributeFilter: ['data-active-index'] });
      /* Beranda ditinggalkan saat modal terbuka: tutup tanpa memindah fokus */
      if (layarBeranda) {
        new MutationObserver(function () {
          if (terbuka && !layarBeranda.classList.contains('aktif')) tutup(false);
        }).observe(layarBeranda, { attributes: true, attributeFilter: ['class'] });
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai, { once: true });
  else mulai();
})();
