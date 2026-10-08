/* ============================================================
   Shell aplikasi — navigasi HP (tab bar + menu), tablet (rail),
   dan desktop (sidebar).
   ------------------------------------------------------------
   Aturan yang dipegang berkas ini:
   - Tidak mengubah mekanisme navigasi. Setiap tujuan dibuka lewat
     tombol yang SUDAH ADA di dashboard (sehingga langkah persiapannya
     ikut berjalan, mis. memuat profil aktif sebelum Analisis
     Kebutuhan), atau lewat window.bukaLayar() untuk Beranda.
   - Tidak membungkus window.bukaLayar dan tidak menambah storage key.
     Layar aktif dibaca dari kelas .aktif pada section.layar.
   - Layar kontekstual (banding, solusi, ringkasan) tidak punya tautan
     langsung; tautan hanya menuju layar pintu masuk.
   Dimuat paling akhir, sesudah 48 skrip aplikasi.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const klik = (id) => { const b = $(id); if (b) { b.click(); return true; } return false; };
  const buka = (layar) => { if (typeof window.bukaLayar === 'function') window.bukaLayar(layar); };

  /* Tujuan tiap item navigasi. */
  const AKSI = {
    beranda: () => buka('PRODUK'),
    produk: () => {
      buka('PRODUK');
      setTimeout(() => { if (!klik('btnQuick')) { const q = $('quickCalculator'); if (q) q.scrollIntoView({ block: 'start' }); } }, 80);
    },
    nasabah: () => klik('btnProfil') || buka('PROFILE'),
    analisis: () => klik('btnNeeds') || buka('NEEDS'),
    bandingkan: () => klik('btnCompare') || buka('COMPARE'),
    planning: () => klik('btnPlanning') || buka('PLANNING'),
    kalkulator: () => klik('btnFinancialCalc') || buka('FINANCIAL_CALC'),
    salesidea: () => klik('btnSalesIdea') || buka('SALES_IDEA'),
    aktivitas: () => klik('btnAktivitas'),
    library: () => klik('btnLibraryIlustrasi') || buka('LIBRARY_ILUSTRASI'),
    identitas: () => klik('btnKartuKonsultan') || buka('KARTU_KONSULTAN'),
    manajemen: () => buka('AGENT_MANAGEMENT'),
    tema: () => klik('btnThemeSwitch') || (window.PSGTheme && window.PSGTheme.toggle()),
    keluar: () => klik('btnLogout'),
    menu: () => bukaSheet(),
  };

  /* Kelompok navigasi untuk setiap layar (penanda aktif). Layar produk
     dan turunannya jatuh ke "produk". */
  const GRUP = {
    PRODUK: 'beranda', PROFILE: 'nasabah', NEEDS: 'analisis', COMPARE: 'bandingkan',
    PLANNING: 'planning', DP: 'planning', DP_RINGKAS: 'planning', DP_SOLUSI: 'planning', DP_SOLUSI_RINGKAS: 'planning',
    DP_BANDING_MANUAL: 'planning', PDK: 'planning', PDK_RINGKAS: 'planning', SOLUSI_PDK: 'planning',
    FINANCIAL_CALC: 'kalkulator', SEGITIGA: 'kalkulator', SEGITIGA_RINGKAS: 'kalkulator', SOLUSI_SEGITIGA: 'kalkulator',
    SOLUSI_HITUNG: 'kalkulator', SOLUSI_BANDING: 'kalkulator', KPR: 'kalkulator', KPR_RINGKAS: 'kalkulator',
    R2: 'kalkulator', R2_RINGKAS: 'kalkulator',
    SALES_IDEA: 'salesidea', AKTIVITAS: 'aktivitas', AKT_REKAP: 'aktivitas', SLIP_KOMISI: 'aktivitas',
    LIBRARY_ILUSTRASI: 'library', KARTU_KONSULTAN: 'identitas', AGENT_MANAGEMENT: 'manajemen',
  };
  const DI_TABBAR = ['beranda', 'produk', 'nasabah', 'library'];

  function layarAktif() {
    const n = document.querySelector('.layar.aktif');
    const nav = window.InsuranceHubNavigation;
    if (!n || !nav || !nav.LAYAR) return 'PRODUK';
    const k = Object.keys(nav.LAYAR).find((x) => nav.LAYAR[x].el === n.id);
    return k || 'PRODUK';
  }

  function tandai() {
    const grup = GRUP[layarAktif()] || 'produk';
    document.querySelectorAll('.psg-link[data-psg-nav], .psg-sheet-item[data-psg-nav]').forEach((b) => {
      const on = b.dataset.psgNav === grup;
      b.classList.toggle('aktif', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const tabGrup = DI_TABBAR.includes(grup) ? grup : 'menu';
    document.querySelectorAll('.psg-tab[data-psg-nav]').forEach((b) => {
      const on = b.dataset.psgNav === tabGrup;
      b.classList.toggle('aktif', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    kartuAgen();
  }

  /* Kartu agen kecil di kaki sidebar — hanya membaca data yang sudah ada. */
  function kartuAgen() {
    const box = $('psgSideAgen');
    if (!box) return;
    let nama = '', level = '', foto = '';
    try {
      const identity = window.InsuranceHubIdentity;
      const l = JSON.parse(localStorage.getItem('insuranceHub.level.v1') || 'null') || {};
      const a = JSON.parse(localStorage.getItem('insuranceHub.agen.v1') || '{}') || {};
      if (identity && identity.source === 'server:/api/psg/me') {
        nama = String(identity.nama || '').trim();
        level = identity.level ? (window.InsuranceHubLevel?.nama || '') + ' (' + identity.level + ')'
          : (identity.roles || []).includes('psg_owner') ? 'PSG Owner'
          : (identity.roles || []).includes('psg_admin') ? 'PSG Admin' : '';
      } else {
        nama = String(l.namaAgen || a.nama || '').trim();
        level = l.level ? (l.nama || '') + ' (' + l.level + ')' : '';
      }
      const fotoKey = identity && identity.source === 'server:/api/psg/me'
        ? (typeof window.InsuranceHubIdentityPhotoKey === 'function' ? window.InsuranceHubIdentityPhotoKey(identity.email) : '')
        : 'insuranceHub.agen.foto.v1';
      foto = fotoKey ? (localStorage.getItem(fotoKey) || '') : '';
    } catch (_) {}
    const tanda = nama + '|' + level + '|' + foto.length;
    if (box.dataset.tanda === tanda) return;
    box.dataset.tanda = tanda;
    box.textContent = '';
    const f = document.createElement('span');
    f.className = 'psg-side-agen-foto';
    if (foto) { const img = document.createElement('img'); img.src = foto; img.alt = ''; f.appendChild(img); }
    else f.textContent = (nama || 'A').charAt(0).toUpperCase();
    const t = document.createElement('span');
    t.className = 'psg-side-agen-teks';
    const b = document.createElement('b'); b.textContent = nama || 'Tenaga Pemasar';
    const s = document.createElement('small'); s.textContent = level || 'PSG Agency';
    t.appendChild(b); t.appendChild(s);
    box.appendChild(f); box.appendChild(t);
  }

  /* ---- lembar menu (HP) ---- */
  let fokusSebelum = null;
  function bukaSheet() {
    const sh = $('psgSheet'); if (!sh) return;
    fokusSebelum = document.activeElement;
    sh.classList.add('terbuka');
    const first = sh.querySelector('.psg-sheet-item.aktif') || sh.querySelector('.psg-sheet-item');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }
  function tutupSheet() {
    const sh = $('psgSheet'); if (!sh || !sh.classList.contains('terbuka')) return;
    sh.classList.remove('terbuka');
    if (fokusSebelum && fokusSebelum.focus) try { fokusSebelum.focus({ preventScroll: true }); } catch (_) {}
  }

  function pasang() {
    if (document.__psgShellSiap) return;
    document.__psgShellSiap = true;

    document.addEventListener('click', (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      if (t.closest('[data-psg-tutup]')) { tutupSheet(); return; }
      const b = t.closest('[data-psg-nav]');
      if (!b || !b.closest('.psg-nav, .psg-sheet')) return;
      e.preventDefault();
      const k = b.dataset.psgNav;
      if (k !== 'menu') tutupSheet();
      const f = AKSI[k];
      if (f) f();
      setTimeout(tandai, 60);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutupSheet(); });

    /* Penanda aktif mengikuti perubahan kelas .aktif pada setiap layar. */
    const mo = new MutationObserver(() => { clearTimeout(pasang._t); pasang._t = setTimeout(tandai, 30); });
    document.querySelectorAll('section.layar').forEach((n) => mo.observe(n, { attributes: true, attributeFilter: ['class'] }));
    window.addEventListener('storage', kartuAgen);
    window.addEventListener('psg:identity-ready', kartuAgen);
    tandai();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang, { once: true });
  else pasang();
})();
