/* ============================================================
   Banding Plan GHP GenPro
   ------------------------------------------------------------
   Satu nasabah, beberapa plan kesehatan, ditampilkan berdampingan
   supaya agen tidak perlu menghitung ulang satu per satu.

   Setelah plan dipilih, agen kembali ke kalkulator GHP dengan plan
   itu sudah terpasang, lalu memakai halaman ringkasan dan cetak
   yang sudah ada. Tidak ada rumus premi yang digandakan di sini —
   semua angka tetap dihitung mesin GHP.

   Mode keluarga: seluruh anggota dihitung memakai plan yang sama,
   lalu preminya dijumlahkan. Kalau agen ingin plan berbeda per
   anggota, itu tetap diatur di kalkulator seperti biasa.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  const MAKS_BANDING = 3;      // lebih dari tiga kolom tidak terbaca di layar HP
  let hasilBanding = [];

  /* ---------- Layar ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.GHP_BANDING = {
      el: 'layarGhpBanding', judul: 'Banding Plan GHP',
      sub: 'Bandingkan beberapa plan sekaligus', kiri: 'GHP'
    };
    return true;
  }

  function daftarPlan() {
    const D = (typeof DATA_GHP !== 'undefined') ? DATA_GHP : null;
    return (D && D.urutan) ? D.urutan.slice() : [];
  }

  /* ---------- Pemilih plan di layar GHP ---------- */

  function pasangPemilih() {
    const wadah = el('hPilihBanding');
    if (!wadah || wadah.dataset.siap) return;
    wadah.dataset.siap = '1';
    const plan = daftarPlan();
    if (!plan.length) return;

    wadah.innerHTML =
      '<h3>Bandingkan beberapa plan</h3>' +
      '<p class="catatan">Pilih sampai ' + MAKS_BANDING + ' plan, lalu lihat premi dan ' +
      'manfaatnya berdampingan sebelum memutuskan.</p>' +
      '<div class="akt-tab" id="hPlanBanding">' +
      plan.map(p => '<button type="button" data-plan-banding="' + esc(p) +
        '" aria-pressed="false">' + esc(p) + '</button>').join('') +
      '</div>' +
      '<button class="aksi" id="hTblBanding" type="button" style="margin-top:9px">' +
      'Bandingkan plan terpilih</button>' +
      '<p class="catatan" id="hCatatanBanding"></p>';
  }

  function planTerpilih() {
    const bar = el('hPlanBanding');
    if (!bar) return [];
    return Array.prototype.slice.call(bar.querySelectorAll('button'))
      .filter(b => b.getAttribute('aria-pressed') === 'true')
      .map(b => b.dataset.planBanding);
  }

  /* ---------- Menghitung ---------- */

  function hitungSatuPlan(plan) {
    const mesin = window.InsuranceHubEngine;
    const rates = (typeof DATA_GHP !== 'undefined') ? DATA_GHP : null;
    if (!mesin || !rates) return null;

    const seg = (typeof nilaiSegmen === 'function') ? nilaiSegmen : function () { return null; };
    const skema = seg('hSkema');
    const metode = seg('hMetode') || 'Bulanan';
    const keluarga = seg('hMode') === 'Keluarga';

    try {
      if (keluarga) {
        const semua = (typeof hAnggota !== 'undefined' && Array.isArray(hAnggota)) ? hAnggota : [];
        const anggota = semua.filter(a => a.tgl && a.nama);
        if (!anggota.length) return { plan: plan, tersedia: false, alasan: 'Belum ada anggota keluarga.' };
        const k = mesin.calculate('GHP', {
          mode: 'family',
          members: anggota.map(a => ({
            nama: a.nama, tglLahir: new Date(a.tgl + 'T00:00:00Z'), jk: a.jk,
            plan: plan, upJiwa: a.up, skema: skema, metode: metode
          }))
        }, { rates: rates });
        if (!k) return null;
        const gagal = (k.baris || []).filter(b => b.hasil && !b.hasil.tersedia);
        return {
          plan: plan, keluarga: true, tersedia: gagal.length === 0,
          alasan: gagal.length ? gagal[0].hasil.alasan : null,
          jumlah: k.jumlahAktif,
          totalBulanan: k.totalBulanan, totalTahunan: k.totalTahunan,
          upJiwa: (k.baris || []).reduce((s, b) => s + (b.hasil && b.hasil.tersedia ?
            (b.upJiwa || 0) : 0), 0),
          metode: metode
        };
      }

      const tgl = el('hTgl') ? el('hTgl').value : '';
      if (!tgl) return { plan: plan, tersedia: false, alasan: 'Tanggal lahir belum diisi.' };
      const h = mesin.calculate('GHP', {
        tglLahir: new Date(tgl + 'T00:00:00Z'),
        jk: seg('hJK') || 'Pria',
        skema: skema, metode: metode, plan: plan, pakaiRider: true,
        upJiwa: (typeof bAngka === 'function') ? bAngka(el('hUP').value) : 0
      }, { rates: rates });
      if (!h) return null;
      return {
        plan: plan, keluarga: false, tersedia: h.tersedia, alasan: h.alasan,
        usia: h.usia,
        totalBulanan: h.totalBulanan, totalTahunan: h.totalTahunan,
        premiSehatBulanan: h.premiSehatBulanan, premiSehatTahunan: h.premiSehatTahunan,
        premiJiwaBulanan: h.premiJiwaBulanan, premiJiwaTahunan: h.premiJiwaTahunan,
        upJiwa: (typeof bAngka === 'function') ? bAngka(el('hUP').value) : 0,
        metode: metode
      };
    } catch (e) {
      return { plan: plan, tersedia: false, alasan: 'Perhitungan gagal untuk plan ini.' };
    }
  }

  function manfaatPlan(plan) {
    const D = (typeof DATA_GHP !== 'undefined') ? DATA_GHP : null;
    return (D && D.plan && D.plan[plan]) ? D.plan[plan] : null;
  }

  /* ---------- Tampilan banding ---------- */

  function gambar() {
    const w = el('layarGhpBanding');
    if (!w) return;
    if (!hasilBanding.length) {
      w.innerHTML = '<div class="blok"><p class="catatan">Pilih plan yang ingin ' +
        'dibandingkan di layar GHP GenPro, lalu tekan Bandingkan.</p></div>';
      return;
    }

    const nama = (el('hNama') && el('hNama').value.trim()) || 'Nasabah';
    const keluarga = hasilBanding[0].keluarga;
    const metode = hasilBanding[0].metode || 'Bulanan';
    const perBulan = metode !== 'Tahunan';

    w.innerHTML =
      '<div class="kop"><h2>Banding plan untuk ' + esc(nama) + '</h2>' +
      '<p>' + (keluarga
        ? 'Seluruh anggota keluarga dihitung memakai plan yang sama. Premi di bawah adalah total keluarga.'
        : 'Usia ' + (hasilBanding[0].usia !== undefined ? hasilBanding[0].usia + ' tahun' : '—') + '.') +
      ' Premi ditampilkan ' + (perBulan ? 'per bulan' : 'per tahun') + '.</p></div>' +

      '<div class="banding-gulir"><div class="banding-baris">' +
      hasilBanding.map(kartuPlan).join('') +
      '</div></div>' +

      '<p class="catatan" style="margin-top:10px">Centang plan yang ingin ikut dicetak. ' +
      'Semua plan tetap tampil di layar, tetapi hanya yang dicentang yang masuk ke PDF.</p>' +
      '<div class="akt-aksi tanpa-cetak" style="margin-top:12px">' +
      '<button class="aksi" id="bandingGhpCetak" type="button">Cetak / simpan PDF</button></div>';
  }

  function kartuPlan(h) {
    const m = manfaatPlan(h.plan);
    const perBulan = (h.metode || 'Bulanan') !== 'Tahunan';
    const premi = perBulan ? h.totalBulanan : h.totalTahunan;

    if (!h.tersedia) {
      return '<div class="banding-kolom banding-mati">' +
        '<div class="banding-judul">' + esc(h.plan) + '</div>' +
        '<p class="catatan akt-peringatan">' + esc(h.alasan || 'Tidak tersedia.') + '</p></div>';
    }

    return '<div class="banding-kolom">' +
      '<div class="banding-judul">' + esc(h.plan) + '</div>' +
      '<table class="akt-tabel banding-tabel"><tbody>' +
      brs('Kamar', m ? esc(m.kamar) : '—') +
      brs('Wilayah', m ? esc(m.wilayah) : '—') +
      brs('Limit tahunan', m ? rp(m.limit) : '—') +
      brs('Limit booster', m ? rp(m.booster) : '—') +
      brs('Penggantian', m ? esc(m.cover) : '—') +
      brs('UP jiwa', rp(h.upJiwa)) +
      (h.keluarga ? brs('Tertanggung', h.jumlah + ' orang') : '') +
      '</tbody></table>' +
      '<div class="banding-premi"><span>Premi ' + (perBulan ? 'per bulan' : 'per tahun') + '</span>' +
      '<b>' + rp(premi) + '</b></div>' +
      '<label class="banding-centang"><input type="checkbox" checked ' +
      'data-kolom-cetak="' + (hasilBanding.slice(0, hasilBanding.indexOf(h) + 1).filter(function (x) { return x.tersedia; }).length) + '"><span>Ikut dicetak</span></label>' +
      '</div>';
  }

  function brs(k, v) {
    return '<tr><td>' + k + '</td><td><b>' + v + '</b></td></tr>';
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const tombolPlan = t.closest('[data-plan-banding]');
      if (tombolPlan) {
        const nyala = tombolPlan.getAttribute('aria-pressed') === 'true';
        if (!nyala && planTerpilih().length >= MAKS_BANDING) {
          const c = el('hCatatanBanding');
          if (c) c.textContent = 'Paling banyak ' + MAKS_BANDING +
            ' plan sekaligus supaya kolomnya tetap terbaca di layar HP.';
          return;
        }
        tombolPlan.setAttribute('aria-pressed', String(!nyala));
        const c = el('hCatatanBanding');
        if (c) c.textContent = planTerpilih().length + ' plan dipilih.';
        return;
      }

      if (t.closest('#hTblBanding')) {
        const plan = planTerpilih();
        const c = el('hCatatanBanding');
        if (plan.length < 2) {
          if (c) c.textContent = 'Pilih minimal dua plan untuk dibandingkan.';
          return;
        }
        hasilBanding = plan.map(hitungSatuPlan).filter(Boolean);
        gambar();
        window.bukaLayar('GHP_BANDING');
        return;
      }

      if (t.closest('#bandingGhpCetak')) {
        const nm = (el('hNama') && el('hNama').value.trim()) || 'Nasabah';
        const asli = document.title;
        document.title = 'Banding Plan GHP - ' + nm;
        window.print();
        setTimeout(() => { document.title = asli; }, 1000);
        return;
      }

    });
  }

  /* ---------- Mulai ---------- */

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    pasangPemilih();
    pasang();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__ghpBandingHook) {
      const asli = window.bukaLayar;
      const bungkus = function (nama) {
        const hasil = asli.apply(this, arguments);
        if (nama === 'GHP') setTimeout(pasangPemilih, 20);
        return hasil;
      };
      bungkus.__ghpBandingHook = true;
      ['__naHook', '__rzHook', '__promptHook', '__umumHook'].forEach(k => { bungkus[k] = asli[k]; });
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
  }

  window.InsuranceHubBandingGhp = { hitungSatuPlan, manfaatPlan, daftarPlan, MAKS_BANDING };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
