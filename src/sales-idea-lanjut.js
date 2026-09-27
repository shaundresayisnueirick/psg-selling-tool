/* ============================================================
   Sales Idea → "Mari Kita Hitung" (kartu akhir)
   ------------------------------------------------------------
   Setelah scene terakhir sebuah Sales Idea benar-benar selesai
   (timeline selesai DAN narasi tuntas) muncul kartu:

       Apakah Anda ingin melanjutkan?
       [ Mari Kita Hitung → ]   [ Bahas Topik Lain ]

   Mari Kita Hitung membuka layar Profil yang sama dengan Dashboard
   lewat InsuranceHubCustomerProfile.bukaUntuk({source, topic, target}).
   Sesudah profil dipilih atau disimpan, aplikasi lanjut ke target:
     10 Jari → SEGITIGA (Financial Triangle; Leo tetap default dan
               profil dipilih lewat dropdown yang sudah ada),
     Keranjang → NEEDS, Education → PDK, Retirement → DP, Asset → R2.
   Konteks tidak membawa profileId dan hanya ada di memori.
   Bahas Topik Lain kembali ke pilihan Sales Idea.

   Modul ini tidak mengubah pemutar maupun narator; ia hanya membaca
   status pemutar (atribut data-sip-status), posisi scene
   (SalesIdea10Jari.keadaan()) dan tanda narasi sedang berbicara
   (.kbs-suara-bicara pada tombol Narasi).
   ============================================================ */
(function () {
  'use strict';

  var TUJUAN = {
    jari: { topic: '10_jari', target: 'SEGITIGA' },
    basket: { topic: 'keranjang', target: 'NEEDS' },
    education: { topic: 'education', target: 'PDK' },
    retirement: { topic: 'retirement', target: 'DP' },
    asset: { topic: 'asset', target: 'R2' }
  };

  var root = null, kartu = null;
  var aktif = false;     // layar Sales Idea sedang tampil
  var status = null;     // status pemutar terakhir yang diamati selama layar tampil
  var indeks = -1;       // scene terakhir yang diamati
  var diputar = false;   // scene terakhir sedang/sudah diputar pada kunjungan ini
  var tunggu = 0;        // penantian narasi tuntas

  function keadaan() {
    var S = window.SalesIdea10Jari;
    try { return S && typeof S.keadaan === 'function' ? S.keadaan() : null; } catch (e) { return null; }
  }
  function diAkhir(k) { return !!(k && TUJUAN[k.mode] && k.total > 0 && k.indeks === k.total - 1); }
  function bicara() { return !!(root && root.querySelector('.kbs-suara-bicara')); }

  function buatKartu() {
    kartu = document.createElement('div');
    kartu.className = 'sil-kartu';
    kartu.hidden = true;
    kartu.setAttribute('role', 'region');
    kartu.setAttribute('aria-labelledby', 'silJudul');
    kartu.innerHTML =
      '<p class="sil-judul" id="silJudul">Apakah Anda ingin melanjutkan?</p>' +
      '<div class="sil-aksi">' +
        '<button type="button" class="sil-hitung" id="silHitung">Mari Kita Hitung <span aria-hidden="true">→</span></button>' +
        '<button type="button" class="sil-lain" id="silLain">Bahas Topik Lain</button>' +
      '</div>';
    root.appendChild(kartu);
    kartu.querySelector('#silHitung').addEventListener('click', hitung);
    kartu.querySelector('#silLain').addEventListener('click', topikLain);
  }

  /* Kartu melayang tepat di atas bar kontrol pemutar, tidak menutupinya. */
  function posisikan() {
    if (!kartu || !root) return;
    var footer = root.querySelector('.si-footer');
    var r = root.getBoundingClientRect(), f = footer ? footer.getBoundingClientRect() : null;
    var bawah = f && f.height ? Math.max(0, r.bottom - f.top) : 0;
    kartu.style.bottom = Math.round(bawah + 10) + 'px';
  }

  function tampilkan() {
    if (!kartu) buatKartu();
    posisikan();
    if (!kartu.hidden) return;
    kartu.hidden = false;
    requestAnimationFrame(function () { if (kartu && !kartu.hidden) kartu.classList.add('sil-tampil'); });
  }
  function sembunyikan() {
    clearTimeout(tunggu); tunggu = 0;
    if (!kartu || kartu.hidden) return;
    kartu.classList.remove('sil-tampil');
    kartu.hidden = true;
  }

  /* Scene terakhir selesai diputar: tunggu narasi tuntas, baru tampilkan. */
  function cobaTampil() {
    clearTimeout(tunggu); tunggu = 0;
    if (!aktif || status !== 'selesai' || !diputar || !diAkhir(keadaan())) return;
    if (bicara()) { tunggu = setTimeout(cobaTampil, 300); return; }
    tampilkan();
  }

  function periksa() {
    if (!root) return;
    var tampil = root.classList.contains('aktif');
    var st = root.getAttribute('data-sip-status');
    var k = keadaan();
    if (!tampil || !k || !TUJUAN[k.mode]) {
      aktif = tampil; status = st; indeks = -1; diputar = false; sembunyikan();
      return;
    }
    if (!aktif) {
      /* Baru (kembali) tampil: status yang tertinggal dari kunjungan
         sebelumnya bukan peristiwa baru. */
      aktif = true; status = st; indeks = k.indeks; diputar = false; sembunyikan();
      return;
    }
    if (k.indeks !== indeks) { indeks = k.indeks; diputar = false; sembunyikan(); }
    var berubah = st !== status;
    status = st;
    if (st === 'berputar') { diputar = diAkhir(k); sembunyikan(); return; }
    if (st === 'selesai') { if (berubah || !kartu || kartu.hidden) cobaTampil(); return; }
    if (st === 'siap') diputar = false;
    sembunyikan();
  }

  function hitung() {
    var k = keadaan(), t = k && TUJUAN[k.mode];
    var P = window.InsuranceHubCustomerProfile;
    if (!t || !P || typeof P.bukaUntuk !== 'function') return;
    sembunyikan();
    P.bukaUntuk({ source: 'sales_idea', topic: t.topic, target: t.target });
  }
  function topikLain() {
    sembunyikan();
    var S = window.SalesIdea10Jari;
    if (S && typeof S.setMode === 'function') S.setMode('hub');
  }

  function mulai() {
    root = document.getElementById('layarSalesIdea');
    if (!root || !window.MutationObserver) return;
    new MutationObserver(periksa).observe(root, { attributes: true, attributeFilter: ['class', 'data-sip-status'] });
    var hitungan = document.getElementById('siStepCount');
    if (hitungan) new MutationObserver(periksa).observe(hitungan, { childList: true, characterData: true, subtree: true });
    window.addEventListener('resize', function () { if (kartu && !kartu.hidden) posisikan(); });
    periksa();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
