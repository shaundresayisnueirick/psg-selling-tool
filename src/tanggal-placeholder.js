/* ============================================================
   Placeholder DD/MM/YYYY untuk input tanggal.
   ------------------------------------------------------------
   input[type="date"] tidak punya placeholder, dan CSS tidak bisa
   mengetahui apakah nilainya kosong. Berkas ini hanya memasang
   atribut data-kosong pada input tanggal yang nilainya kosong;
   tampilannya diatur di styles.css (bagian Formulir).

   Aturan yang dipegang berkas ini:
   - Date picker bawaan tidak diganti. Nilai dan formatnya
     (YYYY-MM-DD) tidak disentuh.
   - Nilai yang diisi lewat kode (profil, isian terakhir, auto-fill)
     sering tidak mengirim event. Supaya tanda "kosong" tidak pernah
     tertinggal dan menutupi tanggal yang sebenarnya ada, setter
     value pada setiap input tanggal dibungkus di tingkat elemen:
     nilai tetap diteruskan apa adanya, lalu tandanya diperbarui.
   - Tidak menambah storage key dan tidak membungkus fungsi global.
   Dimuat paling akhir, sesudah skrip aplikasi.
   ============================================================ */
(function () {
  'use strict';

  var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function perbarui(el) {
    var kosong = !desc.get.call(el);
    if (kosong !== el.hasAttribute('data-kosong')) {
      if (kosong) el.setAttribute('data-kosong', '');
      else el.removeAttribute('data-kosong');
    }
  }

  function pasangPada(el) {
    if (!el || el.tagName !== 'INPUT' || el.type !== 'date') return;
    if (!el.__tglPlaceholder) {
      el.__tglPlaceholder = true;
      try {
        Object.defineProperty(el, 'value', {
          configurable: true,
          get: function () { return desc.get.call(this); },
          set: function (v) { desc.set.call(this, v); perbarui(this); }
        });
      } catch (_) {}
    }
    perbarui(el);
  }

  function pindai(root) {
    var r = root || document;
    if (r.nodeType === 1 && r.matches && r.matches('input[type="date"]')) { pasangPada(r); return; }
    if (r.querySelectorAll) r.querySelectorAll('input[type="date"]').forEach(pasangPada);
  }

  function mulai() {
    pindai(document);
    ['input', 'change', 'blur', 'focusout', 'reset'].forEach(function (t) {
      document.addEventListener(t, function (e) {
        var t2 = e.target;
        if (t2 && t2.tagName === 'INPUT' && t2.type === 'date') pasangPada(t2);
        else if (t2 && t2.tagName === 'FORM') setTimeout(function () { pindai(t2); }, 0);
      }, true);
    });
    /* Input tanggal yang dibuat belakangan (daftar anggota keluarga,
       aktivitas, slip komisi) ikut dipasangi. */
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var added = ms[i].addedNodes;
        for (var j = 0; j < added.length; j++) if (added[j].nodeType === 1) pindai(added[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai, { once: true });
  else mulai();
})();
