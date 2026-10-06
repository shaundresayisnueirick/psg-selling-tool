/* Small homepage carousel for the approved static product artwork. */
(function () {
  'use strict';

  function mulai() {
    var root = document.getElementById('psgHomeCarousel');
    if (!root || root.dataset.carouselReady === '1') return;

    var track = root.querySelector('.psg-home-carousel__track');
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-slide]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-dot]'));
    var sebelumnya = root.querySelector('[data-carousel-prev]');
    var berikutnya = root.querySelector('[data-carousel-next]');
    var viewport = root.querySelector('.psg-home-carousel__viewport');
    if (!track || !slides.length || dots.length !== slides.length || !sebelumnya || !berikutnya || !viewport) return;

    root.dataset.carouselReady = '1';
    var aktif = 0;
    var posisiTrack = 1;
    var timer = null;
    var sedangTransisi = false;
    var sentuhan = null;
    var ditahan = false;
    var jedaOtomatis = 5500;
    var gerakDikurangi = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var layarBeranda = root.closest('.layar');

    var klonTerakhir = slides[slides.length - 1].cloneNode(true);
    klonTerakhir.removeAttribute('data-carousel-slide');
    klonTerakhir.dataset.carouselClone = 'last';
    klonTerakhir.setAttribute('aria-hidden', 'true');
    var klonPertama = slides[0].cloneNode(true);
    klonPertama.removeAttribute('data-carousel-slide');
    klonPertama.dataset.carouselClone = 'first';
    klonPertama.setAttribute('aria-hidden', 'true');
    track.insertBefore(klonTerakhir, slides[0]);
    track.appendChild(klonPertama);

    function hapusTimer() {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    }

    function bolehPutarOtomatis() {
      return !ditahan && !document.hidden && (!layarBeranda || layarBeranda.classList.contains('aktif'));
    }

    function geserTrack(posisi, tanpaAnimasi) {
      posisiTrack = posisi;
      if (tanpaAnimasi) {
        track.style.transition = 'none';
        track.style.transform = 'translate3d(-' + (posisiTrack * 100) + '%,0,0)';
        void track.offsetWidth;
        track.style.transition = '';
      } else {
        track.style.transform = 'translate3d(-' + (posisiTrack * 100) + '%,0,0)';
      }
    }

    function jadwalkan() {
      hapusTimer();
      if (!bolehPutarOtomatis() || sedangTransisi) return;
      timer = window.setTimeout(function () {
        timer = null;
        navigasi(aktif + 1, 1);
      }, jedaOtomatis);
    }

    function selesaikanTransisi(aturTimer) {
      if (!sedangTransisi) return;
      sedangTransisi = false;
      if (posisiTrack === slides.length + 1) geserTrack(1, true);
      else if (posisiTrack === 0) geserTrack(slides.length, true);
      if (aturTimer !== false) jadwalkan();
    }

    function perbaruiAktif(indeks) {
      aktif = (indeks + slides.length) % slides.length;
      root.dataset.activeIndex = String(aktif);
      slides.forEach(function (slide, i) {
        slide.setAttribute('aria-hidden', i === aktif ? 'false' : 'true');
      });
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-current', i === aktif ? 'true' : 'false');
      });
    }

    function navigasi(indeks, arah) {
      if (ditahan) return;
      hapusTimer();
      if (sedangTransisi) selesaikanTransisi(false);

      var sebelumnyaAktif = aktif;
      var berikutnyaAktif = (indeks + slides.length) % slides.length;
      if (berikutnyaAktif === sebelumnyaAktif) {
        jadwalkan();
        return;
      }

      var tujuan = berikutnyaAktif + 1;
      if (arah > 0 && sebelumnyaAktif === slides.length - 1 && berikutnyaAktif === 0) {
        tujuan = slides.length + 1;
      } else if (arah < 0 && sebelumnyaAktif === 0 && berikutnyaAktif === slides.length - 1) {
        tujuan = 0;
      }

      perbaruiAktif(berikutnyaAktif);
      sedangTransisi = true;
      geserTrack(tujuan, false);
    }

    function arahKe(indeks) {
      var tujuan = (indeks + slides.length) % slides.length;
      var maju = (tujuan - aktif + slides.length) % slides.length;
      var mundur = (aktif - tujuan + slides.length) % slides.length;
      return maju <= mundur ? 1 : -1;
    }

    sebelumnya.addEventListener('click', function () { navigasi(aktif - 1, -1); });
    berikutnya.addEventListener('click', function () { navigasi(aktif + 1, 1); });
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var indeks = Number(dot.getAttribute('data-carousel-dot'));
        navigasi(indeks, arahKe(indeks));
      });
    });
    track.addEventListener('transitionend', function (event) {
      if (event.target === track && event.propertyName === 'transform') selesaikanTransisi(true);
    });
    root.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigasi(aktif - 1, -1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); navigasi(aktif + 1, 1); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hapusTimer();
      else if (sedangTransisi) selesaikanTransisi(true);
      else jadwalkan();
    });
    if (layarBeranda && window.MutationObserver) {
      new MutationObserver(function () {
        if (!bolehPutarOtomatis()) hapusTimer();
        else if (sedangTransisi) selesaikanTransisi(true);
        else jadwalkan();
      }).observe(layarBeranda, { attributes: true, attributeFilter: ['class'] });
    }

    viewport.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      sentuhan = { id: event.pointerId, x: event.clientX, y: event.clientY };
      hapusTimer();
    });
    viewport.addEventListener('pointerup', function (event) {
      if (!sentuhan || sentuhan.id !== event.pointerId) return;
      var dx = event.clientX - sentuhan.x;
      var dy = event.clientY - sentuhan.y;
      sentuhan = null;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        navigasi(aktif + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      } else {
        jadwalkan();
      }
    });
    viewport.addEventListener('pointercancel', function () { sentuhan = null; jadwalkan(); });

    /* Penahan dari luar, mis. flyer diperbesar (src/home-carousel-modal.js):
       selama ditahan tidak ada autoplay maupun pergantian slide; saat dilepas
       slide tetap sama dan jeda autoplay dimulai ulang penuh. */
    root.addEventListener('psg-carousel:tahan', function () {
      ditahan = true;
      sentuhan = null;
      hapusTimer();
    });
    root.addEventListener('psg-carousel:lepas', function () {
      if (!ditahan) return;
      ditahan = false;
      if (!sedangTransisi) jadwalkan();
    });

    if (gerakDikurangi) {
      var perubahanGerak = function () {
        if (!sedangTransisi) jadwalkan();
      };
      if (gerakDikurangi.addEventListener) gerakDikurangi.addEventListener('change', perubahanGerak);
      else if (gerakDikurangi.addListener) gerakDikurangi.addListener(perubahanGerak);
    }

    perbaruiAktif(0);
    geserTrack(1, true);
    jadwalkan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai, { once: true });
  else mulai();
})();
