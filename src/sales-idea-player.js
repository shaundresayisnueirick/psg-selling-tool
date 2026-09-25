/* ============================================================
   PSG Story Player — engine presentasi interaktif Sales Idea.
   ------------------------------------------------------------
   Engine generik; isi tiap Sales Idea tetap di sales-idea.js.

   Scene:
     { id, render(stage), animate(timeline, stage), siapDi }
     render   : menggambar isi scene ke dalam stage (DOM baru).
     animate  : mendaftarkan animasi scene ke timeline (opsional).
     siapDi   : 'awal' | 'akhir' — frame yang tampil sebelum PLAY.

   Timeline:
     - Semua gerak memakai Web Animations API. Satu "jam" induk
       (animasi kosong pada elemen lepas) menentukan durasi dan
       akhir scene; animasi anak digerakkan bersama, jadi posisinya
       selalu sama. Tidak ada setTimeout/setInterval.
     - Animasi CSS yang sudah ada di dalam scene ikut diadopsi, jadi
       ikut PAUSE/RESUME/REPLAY.
     - Animasi tak berujung = ambient: hanya berjalan saat scene
       berputar atau selesai, dan berhenti saat pause, saat player
       ditutup, atau saat tab tidak terlihat.
     - Frame dari rAF hanya dipakai bila scene mendaftarkan tick().

   Player:
     status: 'siap' | 'berputar' | 'jeda' | 'selesai'
     PLAY / PAUSE / RESUME / REPLAY / NEXT / BACK. NEXT dan REPLAY
     selalu menggambar ulang scene (DOM baru, timeline baru), jadi
     tidak ada state animasi lama yang terbawa. BACK menampilkan
     scene sebelumnya dalam keadaan siap.

   Gerak dikurangi (prefers-reduced-motion): tidak ada animasi yang
   dibuat; scene langsung tampil di keadaan akhirnya dan navigasi
   tetap berjalan. Semua listener dipasang sekali per player.
   ============================================================ */
(function () {
  'use strict';

  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function gerakDikurangi() { return !!(MQ && MQ.matches); }
  function akhirAnimasi(a) {
    try { return a.effect.getComputedTiming().endTime; } catch (e) { return 0; }
  }

  /* ---------------- Timeline ---------------- */
  function Timeline() {
    this.anak = [];      // animasi berdurasi
    this.ambient = [];   // animasi tak berujung
    this.ticks = [];
    this.durasi = 0;
    this.jam = null;
    this.raf = 0;
    this.onSelesai = null;
    this._frame = this._frame.bind(this);
  }
  Timeline.prototype.add = function (el, keyframes, opsi) {
    if (!el || typeof el.animate !== 'function') return null;
    var o = Object.assign({ fill: 'backwards', easing: 'cubic-bezier(.16,.84,.24,1)' }, opsi || {});
    var a = el.animate(keyframes, o);
    a.pause();
    this._daftar(a);
    return a;
  };
  Timeline.prototype.loop = function (el, keyframes, opsi) {
    return this.add(el, keyframes, Object.assign({ iterations: Infinity, fill: 'none', easing: 'ease-in-out' }, opsi || {}));
  };
  Timeline.prototype.tick = function (fn) { if (typeof fn === 'function') this.ticks.push(fn); };
  Timeline.prototype._daftar = function (a) {
    var akhir = akhirAnimasi(a);
    if (!isFinite(akhir)) { this.ambient.push(a); return; }
    this.anak.push(a);
    if (akhir > this.durasi) this.durasi = akhir;
  };
  /* Animasi CSS yang sudah berjalan di dalam scene ikut dikendalikan. */
  Timeline.prototype.adopsi = function (root) {
    if (!root || typeof root.getAnimations !== 'function') return;
    var sudah = this.anak.concat(this.ambient);
    root.getAnimations({ subtree: true }).forEach(function (a) {
      if (sudah.indexOf(a) !== -1) return;
      a.pause();
      a.currentTime = 0;
      this._daftar(a);
    }, this);
  };
  Timeline.prototype.siapkan = function () {
    var jamEl = document.createElement('i');
    this.jam = jamEl.animate([], { duration: Math.max(1, this.durasi), fill: 'forwards' });
    this.jam.pause();
    this.jam.currentTime = 0;
    var self = this;
    this.jam.onfinish = function () {
      self._hentikanFrame();
      self._tick(self.durasi);
      if (self.onSelesai) self.onSelesai();
    };
  };
  Timeline.prototype.waktu = function () { return this.jam ? (this.jam.currentTime || 0) : 0; };
  Timeline.prototype.play = function () {
    if (!this.jam) return;
    var t = this.waktu();
    if (t >= this.durasi) return;
    this.anak.forEach(function (a) { a.currentTime = t; a.play(); });
    this.jam.play();
    this.putarAmbient();
    if (this.ticks.length && !this.raf) this.raf = requestAnimationFrame(this._frame);
  };
  Timeline.prototype.pause = function () {
    if (!this.jam) return;
    this.jam.pause();
    var t = this.waktu();
    this.anak.forEach(function (a) { a.pause(); a.currentTime = t; });
    this.jedaAmbient();
    this._hentikanFrame();
  };
  Timeline.prototype.seek = function (t) {
    if (!this.jam) return;
    t = Math.max(0, Math.min(this.durasi, t));
    this.jam.pause();
    this.jam.currentTime = t;
    this.anak.forEach(function (a) { a.pause(); a.currentTime = t; });
    this._hentikanFrame();
    this._tick(t);
  };
  Timeline.prototype.selesaikan = function () { this.seek(this.durasi); };
  Timeline.prototype.putarAmbient = function () { this.ambient.forEach(function (a) { a.play(); }); };
  Timeline.prototype.jedaAmbient = function () { this.ambient.forEach(function (a) { a.pause(); }); };
  Timeline.prototype._tick = function (t) { this.ticks.forEach(function (fn) { fn(t); }); };
  Timeline.prototype._frame = function () {
    this.raf = 0;
    this._tick(this.waktu());
    if (this.jam && this.jam.playState === 'running') this.raf = requestAnimationFrame(this._frame);
  };
  Timeline.prototype._hentikanFrame = function () { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; } };
  Timeline.prototype.hancurkan = function () {
    this._hentikanFrame();
    this.onSelesai = null;
    this.anak.concat(this.ambient).forEach(function (a) { try { a.cancel(); } catch (e) {} });
    if (this.jam) { this.jam.onfinish = null; try { this.jam.cancel(); } catch (e) {} }
    this.anak = []; this.ambient = []; this.ticks = []; this.jam = null;
  };

  /* ---------------- Player ---------------- */
  var LABEL = {
    siap: ['▶', 'Play', 'Putar scene'],
    berputar: ['⏸', 'Pause', 'Jeda'],
    jeda: ['▶', 'Resume', 'Lanjutkan'],
    selesai: ['▶', 'Play', 'Putar ulang scene']
  };

  function Player(opsi) {
    this.root = opsi.root;
    this.stage = opsi.stage;
    this.ui = opsi.ui || {};
    this.aktif = opsi.aktif || function () { return true; };
    this.onTutup = opsi.onTutup || null;
    this.scenes = [];
    this.i = 0;
    this.status = 'siap';
    this.tl = null;
    this._lanjutSaatTampil = false;
    this._pasangSekali();
  }

  Player.prototype._pasangSekali = function () {
    var self = this;
    if (this.ui.play) this.ui.play.addEventListener('click', function () { self.toggle(); });
    if (this.ui.replay) this.ui.replay.addEventListener('click', function () { self.replay(); });

    document.addEventListener('keydown', function (e) { self._tombol(e); });
    document.addEventListener('visibilitychange', function () { self._visibilitas(); });
    if (MQ) {
      var ubah = function () { self._gerakBerubah(); };
      if (MQ.addEventListener) MQ.addEventListener('change', ubah); else if (MQ.addListener) MQ.addListener(ubah);
    }
    /* Layar ditutup (kelas .aktif hilang) = player berhenti bersih. */
    if (this.root && window.MutationObserver) {
      new MutationObserver(function () {
        if (!self.root.classList.contains('aktif')) self.berhenti();
      }).observe(this.root, { attributes: true, attributeFilter: ['class'] });
    }
  };

  Player.prototype.muat = function (scenes, awal) {
    this.scenes = Array.isArray(scenes) ? scenes : [];
    if (!this.scenes.length) { this.berhenti(); this._ui(); return; }
    this.tampilkan(Math.max(0, Math.min(this.scenes.length - 1, awal || 0)), 'siap');
  };

  /* cara: 'siap' | 'putar' */
  Player.prototype.tampilkan = function (i, cara) {
    var scene = this.scenes[i];
    if (!scene) return;
    this._bersihkan();
    this.i = i;
    if (this.stage) {
      scene.render(this.stage);
      this.stage.scrollTop = 0;
      this.stage.classList.toggle('sip-fit', !!scene.fit);
    }
    var tl = new Timeline();
    this.tl = tl;
    var kurang = gerakDikurangi();
    if (!kurang && typeof scene.animate === 'function') scene.animate(tl, this.stage);
    if (!kurang) tl.adopsi(this.stage);
    tl.siapkan();
    var self = this;
    tl.onSelesai = function () {
      if (self.tl !== tl) return;
      self.status = 'selesai';
      if (self._bolehAmbient()) tl.putarAmbient();
      self._ui();
    };

    if (kurang) {
      tl.selesaikan();
      this.status = 'selesai';
    } else if (cara === 'putar') {
      tl.seek(0);
      this.status = 'berputar';
      tl.play();
    } else {
      if (scene.siapDi === 'awal') tl.seek(0); else tl.selesaikan();
      this.status = 'siap';
    }
    this._ui();
  };

  Player.prototype.play = function () {
    if (!this.tl || !this.scenes.length) return;
    if (gerakDikurangi()) { this.tampilkan(this.i, 'siap'); return; }
    if (this.status === 'berputar') return;
    if (this.status === 'selesai' || (this.status === 'siap' && this.tl.waktu() >= this.tl.durasi)) {
      this.replay();
      return;
    }
    this.status = 'berputar';
    this.tl.play();
    this._ui();
  };
  Player.prototype.pause = function () {
    if (!this.tl || this.status !== 'berputar') return;
    this.tl.pause();
    this.status = 'jeda';
    this._ui();
  };
  Player.prototype.toggle = function () { if (this.status === 'berputar') this.pause(); else this.play(); };
  Player.prototype.replay = function () { if (this.scenes.length) this.tampilkan(this.i, 'putar'); };
  Player.prototype.next = function () { if (this.i < this.scenes.length - 1) this.tampilkan(this.i + 1, 'putar'); };
  Player.prototype.back = function () { if (this.i > 0) this.tampilkan(this.i - 1, 'siap'); };

  /* Bersihkan timeline; isi scene yang tampil tidak disentuh. */
  Player.prototype._bersihkan = function () {
    if (this.tl) { this.tl.hancurkan(); this.tl = null; }
    this._lanjutSaatTampil = false;
  };
  Player.prototype.berhenti = function () {
    this._bersihkan();
    this.status = 'siap';
  };

  Player.prototype._bolehAmbient = function () {
    return !gerakDikurangi() && document.visibilityState !== 'hidden' && this.aktif();
  };
  Player.prototype._visibilitas = function () {
    if (!this.tl) return;
    if (document.visibilityState === 'hidden') {
      if (this.status === 'berputar') { this.tl.pause(); this._lanjutSaatTampil = true; }
      this.tl.jedaAmbient();
    } else {
      if (this._lanjutSaatTampil && this.status === 'berputar' && this.aktif()) this.tl.play();
      else if (this.status === 'selesai' && this._bolehAmbient()) this.tl.putarAmbient();
      this._lanjutSaatTampil = false;
    }
  };
  Player.prototype._gerakBerubah = function () {
    if (!this.tl || !this.scenes.length || !this.aktif()) return;
    if (gerakDikurangi()) {
      this.tl.jedaAmbient();
      this.tl.selesaikan();
      this.status = 'selesai';
      this._ui();
    }
  };

  function sedangMengetik(t) {
    if (!t || t === document.body) return false;
    var tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!t.isContentEditable;
  }
  Player.prototype._tombol = function (e) {
    if (!this.aktif() || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (sedangMengetik(e.target)) return;
    var k = e.key;
    if (k === 'Escape') { if (this.onTutup) { e.preventDefault(); this.onTutup(); } return; }
    if (!this.scenes.length) return;
    var diTombol = e.target && e.target.closest && e.target.closest('button,a,[role="button"]');
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); this.next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); this.back(); }
    else if (k === ' ' || k === 'Spacebar') { if (diTombol) return; e.preventDefault(); this.toggle(); }
    else if ((k === 'r' || k === 'R') && !e.repeat) { e.preventDefault(); this.replay(); }
  };

  Player.prototype._ui = function () {
    var u = this.ui, n = this.scenes.length, i = this.i;
    if (this.root) this.root.setAttribute('data-sip-status', n ? this.status : 'kosong');
    var fokus = document.activeElement;
    if (u.prev) u.prev.disabled = !n || i <= 0;
    if (u.next) u.next.disabled = !n || i >= n - 1;
    if (u.replay) u.replay.disabled = !n;
    if (u.play) {
      var l = LABEL[this.status] || LABEL.siap;
      u.play.disabled = !n;
      u.play.innerHTML = '<span aria-hidden="true">' + l[0] + '</span> <span class="sip-label">' + l[1] + '</span>';
      u.play.setAttribute('aria-label', l[2]);
      u.play.setAttribute('aria-pressed', this.status === 'berputar' ? 'true' : 'false');
    }
    if (u.count) u.count.textContent = n ? ('Langkah ' + (i + 1) + ' / ' + n) : '';
    if (u.progress) {
      if (u.progress.childElementCount !== n) {
        var html = '';
        for (var k = 0; k < n; k++) html += '<li></li>';
        u.progress.innerHTML = html;
      }
      Array.prototype.forEach.call(u.progress.children, function (li, k) {
        li.className = k < i ? 'sip-sudah' : (k === i ? 'sip-kini' : '');
      });
    }
    /* Tombol yang sedang difokus lalu dinonaktifkan: pindahkan fokus. */
    if (fokus && fokus.disabled && u.play && !u.play.disabled) u.play.focus();
  };

  window.PSGStoryPlayer = {
    Timeline: Timeline,
    buat: function (opsi) { return new Player(opsi); },
    gerakDikurangi: gerakDikurangi
  };
})();
