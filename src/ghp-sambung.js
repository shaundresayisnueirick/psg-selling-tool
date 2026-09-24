/* ============================================================
   Penyambung Rider GHP ke Layar Produk
   ------------------------------------------------------------
   Memasang tabel seluruh plan dan pembanding plan pada layar
   yang punya rider GHP, memakai aturan bersama di ghp-aturan.js.

   Gen Aman (GSPA)  : tabel seluruh plan sudah ada sejak awal,
                      di sini ditambah pembanding plan.
   GHP GenPro       : pembanding plan sudah ada, di sini
                      ditambah tabel seluruh plan.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const G = () => window.InsuranceHubGhpAturan;

  function usiaDari(idTanggal) {
    const n = el(idTanggal);
    if (!n || !n.value) return null;
    if (typeof usiaGenerali === 'function') {
      return usiaGenerali(new Date(n.value + 'T00:00:00Z'));
    }
    return null;
  }

  function riderNyala(idSegmen) {
    if (typeof nilaiSegmen !== 'function') return false;
    const v = nilaiSegmen(idSegmen);
    return v === 'Ya' || v === 'Aktif' || v === 'On' || v === true;
  }

  /* ---------- Gen Aman ---------- */

  function segarkanGspa() {
    const A = G();
    if (!A) return;
    const wadahTabel = el('gTabelSemuaGhp'), wadahBanding = el('gBandingGhp');
    if (!wadahTabel && !wadahBanding) return;

    const usia = usiaDari('gTgl');
    const aktifRider = riderNyala('gRider');
    if (!aktifRider || usia === null) {
      if (wadahTabel) wadahTabel.innerHTML = '';
      if (wadahBanding) wadahBanding.innerHTML = '';
      return;
    }
    const terpilih = el('gPlanGhps') ? el('gPlanGhps').value : null;
    if (wadahTabel) {
      wadahTabel.innerHTML = '<h3>Premi seluruh plan GHP</h3>' + A.tabelSemuaPlan(usia, terpilih, false);
    }
    if (wadahBanding) A.pemilihBanding('gBandingGhp', 'GSPA', usia, false);
  }

  /* ---------- GHP GenPro ---------- */

  function segarkanGhp() {
    const A = G();
    if (!A) return;
    const wadah = el('hTabelSemuaGhp');
    if (!wadah) return;

    const usia = usiaDari('hTgl');
    const aktifRider = riderNyala('hRider');
    if (!aktifRider || usia === null) { wadah.innerHTML = ''; return; }

    const terpilih = el('hPlan') ? el('hPlan').value : null;
    wadah.innerHTML = '<h3>Premi seluruh plan GHP</h3>' + A.tabelSemuaPlan(usia, terpilih, false);
  }

  /* Mengambil rincian premi produk dasar Gen Aman yang sedang tampil, supaya
     kolom banding menampilkan TOTAL yang dibayar nasabah, bukan premi rider
     saja. Angkanya dihitung mesin Gen Aman, tidak dihitung ulang di sini. */
  function konteksGspa() {
    /* Usia, nama, dan asal WAJIB ikut. Tanpa usia, tarif GHPS dicari dengan
       usia kosong sehingga seluruh premi di kolom banding tampil kosong. */
    const k = {
      metode: (typeof nilaiSegmen === 'function') ? nilaiSegmen('gMetode') : 'Bulanan',
      usia: usiaDari('gTgl'),
      nama: el('gNama') ? el('gNama').value : '',
      asal: 'Gen Aman', layarAsal: 'GSPA', batas66: false
    };
    try {
      const tgl = el('gTgl') ? el('gTgl').value : '';
      if (!tgl) return k;
      const inp = {
        nama: el('gNama') ? el('gNama').value : '',
        jk: nilaiSegmen('gJK'), tglLahir: new Date(tgl + 'T00:00:00Z'),
        mpp: +nilaiSegmen('gMpp'), metode: k.metode, mode: nilaiSegmen('gMode'),
        upDasar: bAngka(el('gUpDasar').value),
        premiNet: bAngka(el('gPremiNet').value),
        modeWakaf: nilaiSegmen('gWakaf') === 'Wakaf' ? 'Wakaf' : 'Non Wakaf',
        nilaiWakaf: bAngka(el('gNilaiWakaf') ? el('gNilaiWakaf').value : ''),
        persenWakaf: +(el('gPersenWakaf') ? el('gPersenWakaf').value : 0)
      };
      const r = window.InsuranceHubEngine.calculate('GSPA', inp,
        { rates: (typeof DATA_GSPA !== 'undefined') ? DATA_GSPA : null });
      if (!r || !r.tersedia) return k;
      k.upDasar = r.upDasar;
      k.mpp = inp.mpp;
      if (k.usia === null || k.usia === undefined) k.usia = r.usia;
      /* out.totalBulanan dan out.totalTahunan adalah TOTAL sepanjang masa bayar,
         bukan premi per periode. Sebelumnya keduanya dipakai sebagai premi
         sehingga angka di kolom banding jauh lebih besar dari seharusnya. */
      k.premiDasarBulanan = r.bulanan;
      k.premiDasarTahunan = r.tahunan;

      k.waiver = nilaiSegmen('gWaiverRider') === 'Ya';
      if (k.waiver && typeof waiverHitung === 'function') {
        const w = waiverHitung(r.usia, inp.mpp, inp.jk, r.upDasar, r.diskon);
        if (w && w.sah) { k.premiWaiverBulanan = w.bulanan; k.premiWaiverTahunan = w.tahunan; }
        else { k.waiver = false; }
      }
    } catch (_) {}
    return k;
  }

  /* Plan yang tidak boleh diambil pada usia itu dilepas dari daftar pilihan,
     bukan sekadar diberi catatan. Mengikuti memo 027/GNR-AGC/07/2026. */
  function batasiPilihanPlan(idSelect, usia, pakaiBatas66) {
    const A = G();
    const sel = el(idSelect);
    if (!A || !sel || usia === null) return;
    const boleh = A.planTersedia(usia, pakaiBatas66);
    if (!boleh.length) return;
    Array.prototype.slice.call(sel.options).forEach(function (o) {
      const ok = boleh.indexOf(o.value) !== -1;
      o.disabled = !ok;
      o.hidden = !ok;
    });
    if (boleh.indexOf(sel.value) === -1) {
      sel.value = boleh[0];
      sel.dispatchEvent(new Event('change'));
    }
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const jalan = t.closest('[data-ghp-jalan]');
      if (!jalan) return;
      const A = G();
      if (!A) return;
      if (jalan.dataset.ghpJalan === 'GSPA') A.buka('GSPA', konteksGspa());
    });

    ['gTgl', 'gPlanGhps', 'gRider', 'gMpp'].forEach(function (id) {
      const n = el(id);
      if (n) { n.addEventListener('change', segarkanGspa); n.addEventListener('input', segarkanGspa); }
    });
    ['hTgl', 'hPlan', 'hRider'].forEach(function (id) {
      const n = el(id);
      if (n) { n.addEventListener('change', segarkanGhp); n.addEventListener('input', segarkanGhp); }
    });
    // Tombol segmen tidak memicu change, jadi disadap lewat klik.
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#gRider') || t.closest('#gMpp')) setTimeout(segarkanGspa, 30);
      if (t.closest('#hRider')) setTimeout(segarkanGhp, 30);
      if (t.closest('#gTblIlustrasi')) setTimeout(segarkanGspa, 30);
      if (t.closest('#hTblIlustrasi')) setTimeout(segarkanGhp, 30);
    });
  }

  function mulai() {
    if (!G()) { setTimeout(mulai, 200); return; }
    pasang();
    segarkanGspa();
    segarkanGhp();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__ghpSambungHook) {
      const asli = window.bukaLayar;
      const bungkus = function (nama) {
        const hasil = asli.apply(this, arguments);
        if (nama === 'GSPA') setTimeout(segarkanGspa, 30);
        if (nama === 'GHP') setTimeout(segarkanGhp, 30);
        return hasil;
      };
      bungkus.__ghpSambungHook = true;
      ['__naHook', '__rzHook', '__promptHook', '__umumHook', '__ghpBandingHook',
        '__bandingProdukHook', '__pdkAnakHook'].forEach(k => { bungkus[k] = asli[k]; });
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
  }

  window.InsuranceHubGhpSambung = { segarkanGspa, segarkanGhp, batasiPilihanPlan };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 80);
  }
})();
