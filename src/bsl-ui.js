/* ============================================================
   BeSMART Lite 3/5-100 — pengendali layar
   ------------------------------------------------------------
   Menyambungkan layar BSL ke mesin versi lengkap, dan menambah
   dua hal yang sebelumnya belum ada:

   1. UP Dasar dan rider Lite UP 400% dipisah, Lite UP bisa
      dimatikan. Total uang pertanggungan = UP Dasar x 5 bila
      Lite UP menyala.

   2. Rider kesehatan GHP, mengikuti memo 027/GNR-AGC/07/2026:
      - usia masuk 66 sampai 70 tahun hanya boleh Gold Standard,
        Gold Deluxe, Diamond Superior, dan Diamond Deluxe
      - minimum UP Dasar Rp50 juta untuk keempat plan itu, dan
        Rp100 juta untuk Platinum Deluxe serta Titanium
      - saat rider GHP dinyalakan, UP Dasar disetel 50 juta dan
        Lite UP dimatikan; keduanya tetap bisa diubah agen

   Perhitungan preminya tetap milik mesin. Modul ini mengurus
   isian, aturan, dan tampilan hasilnya.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (t) => String(t === null || t === undefined ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => (n === null || n === undefined) ? '—'
    : 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const seg = (id) => (typeof nilaiSegmen === 'function') ? nilaiSegmen(id) : '';
  const ang = (v) => (typeof bAngka === 'function') ? bAngka(v) : Number(v) || 0;

  let sedangMenyalakanGhp = false;

  function A() { return window.InsuranceHubGhpAturan; }

  function usiaSekarang() {
    const t = el('bTgl');
    if (!t || !t.value) return null;
    return (typeof usiaGenerali === 'function')
      ? usiaGenerali(new Date(t.value + 'T00:00:00Z')) : null;
  }

  function isian() {
    return {
      nama: el('bNama') ? el('bNama').value : '',
      jk: seg('bJK'),
      tglLahir: (el('bTgl') && el('bTgl').value)
        ? new Date(el('bTgl').value + 'T00:00:00Z') : null,
      usia: usiaSekarang(),
      mpp: +seg('bMPP'),
      metode: seg('bMetode'),
      upDasar: ang(el('bUP') ? el('bUP').value : 0),
      pakaiLiteUp: seg('bLiteUp') !== 'Tidak',
      pakaiGhp: seg('bRider') === 'Ya',
      plan: el('bPlanGhp') ? el('bPlanGhp').value : ''
    };
  }

  /* ---------- Plan GHP ---------- */

  function isiPilihanPlan(usia) {
    const G = A(), sel = el('bPlanGhp');
    if (!G || !sel) return;
    // Batas usia 66-70 hanya berlaku di BeSMART Lite, jadi diminta di sini.
    const boleh = (usia === null) ? G.semuaPlan() : G.planTersedia(usia, true);
    const dipilih = sel.value;
    sel.innerHTML = boleh.map(function (p) {
      return '<option value="' + esc(p) + '"' + (p === dipilih ? ' selected' : '') + '>' +
        esc(p) + '</option>';
    }).join('');
    if (boleh.indexOf(dipilih) === -1 && boleh.length) sel.value = boleh[0];
  }

  function premiGhp(usia, plan, bulanan) {
    const G = A();
    if (!G || usia === null || !plan) return 0;
    const n = bulanan ? G.premiBulanan(usia, plan) : G.premiTahunan(usia, plan);
    return n || 0;
  }

  /* ---------- Menggambar ---------- */

  function gambar() {
    if (!el('layarBSL')) return;
    const i = isian();
    const G = A();

    isiPilihanPlan(i.usia);

    const infoUp = el('bInfoUP');
    if (infoUp) {
      if (!i.upDasar) infoUp.textContent = '';
      else {
        const total = i.pakaiLiteUp ? i.upDasar * 5 : i.upDasar;
        infoUp.innerHTML = 'Total uang pertanggungan <b>' + rp(total) + '</b>' +
          (i.pakaiLiteUp
            ? ' — UP Dasar ' + rp(i.upDasar) + ' ditambah Lite UP ' + rp(i.upDasar * 4) + '.'
            : ' — hanya UP Dasar, rider Lite UP tidak diambil.');
      }
    }

    const catatanGhp = el('bCatatanGhp');
    if (catatanGhp) {
      if (!i.pakaiGhp) catatanGhp.textContent = '';
      else if (i.usia === null) catatanGhp.textContent = 'Isi tanggal lahir untuk melihat premi rider.';
      else {
        const minUp = G ? G.upMinimum(i.plan) : 50000000;
        const kurang = i.upDasar < minUp;
        const batas = G ? G.alasanPlanDibatasi(i.usia, true) : '';
        catatanGhp.innerHTML =
          (kurang ? '<span class="akt-peringatan">UP Dasar untuk plan ' + esc(i.plan) +
            ' paling kecil ' + rp(minUp) + '.</span> ' : '') +
          'Minimum UP Dasar: Rp50.000.000 untuk Gold dan Diamond, Rp100.000.000 untuk ' +
          'Platinum Deluxe dan Titanium.' + (batas ? ' ' + esc(batas) : '');
      }
    }

    // Tabel seluruh plan dan pembandingnya hanya muncul saat rider menyala.
    const wadahTabel = el('bTabelSemuaGhp'), wadahBanding = el('bBandingGhp');
    if (G && i.pakaiGhp && i.usia !== null) {
      if (wadahTabel) {
        wadahTabel.innerHTML = '<h3>Premi seluruh plan GHP</h3>' +
          G.tabelSemuaPlan(i.usia, i.plan, true);
      }
      if (wadahBanding) G.pemilihBanding('bBandingGhp', 'BSL', i.usia, true);
    } else {
      if (wadahTabel) wadahTabel.innerHTML = '';
      if (wadahBanding) wadahBanding.innerHTML = '';
    }

    gambarHasil(i);

    // Sinkronkan layar kalkulator lengkap dengan ringkasan/timeline legacy.
    // Perubahan Plan GHP, Lite UP, atau rider sebelumnya hanya memperbarui
    // panel hasil baru, sehingga ringkasan bisa tertinggal. Source of truth
    // tetap bsl2Hitung; bGambar hanya merender ulang tampilan ringkasan/timeline.
    if (typeof window.bGambar === 'function' && !window.__bslSyncingLegacy) {
      window.__bslSyncingLegacy = true;
      try { window.bGambar(); } finally { window.__bslSyncingLegacy = false; }
    }
  }

  function gambarHasil(i) {
    const kotak = el('bHasil');
    if (!kotak) return;
    const mesin = window.InsuranceHubEngine;
    const rates = (typeof TARIF_BSL_LENGKAP !== 'undefined') ? TARIF_BSL_LENGKAP : null;

    if (!i.tglLahir || !i.upDasar) {
      kotak.innerHTML = '<p class="catatan">' +
        (!i.tglLahir ? 'Isi tanggal lahir untuk menghitung usia masuk.'
          : 'Isi UP Dasar untuk melihat premi.') + '</p>';
      return;
    }
    if (!mesin || !rates) { kotak.innerHTML = '<p class="catatan">Tabel tarif belum siap.</p>'; return; }

    let h;
    try {
      h = mesin.calculate('BSL2', {
        jk: i.jk, tglLahir: i.tglLahir, usia: i.usia, mpp: i.mpp,
        metode: i.metode, upDasar: i.upDasar, pakaiLiteUp: i.pakaiLiteUp
      }, { rates: rates });
    } catch (e) { h = null; }

    if (!h || !h.tersedia) {
      kotak.innerHTML = '<p class="catatan akt-peringatan">' +
        esc((h && h.alasan) || 'Perhitungan tidak tersedia.') + '</p>';
      return;
    }

    const bulanan = i.metode !== 'Tahunan';
    const satuan = bulanan ? 'per bulan' : 'per tahun';
    const pDasar = bulanan ? h.premiDasarBulanan : h.premiDasarTahunan;
    const pLite = bulanan ? h.premiLiteUpBulanan : h.premiLiteUpTahunan;
    const pGhp = i.pakaiGhp ? premiGhp(i.usia, i.plan, bulanan) : 0;
    const total = (bulanan ? h.premiBulanan : h.premiTahunan) + pGhp;

    window.__bslTerakhir = { hasil: h, isian: i, premiGhp: pGhp, totalPremi: total };

    kotak.innerHTML =
      '<table class="akt-tabel"><tbody>' +
      brs('Usia masuk', h.usia + ' tahun') +
      brs('Masa bayar', i.mpp + ' tahun') +
      brs('UP Dasar', rp(h.upDasar)) +
      (h.pakaiLiteUp ? brs('Rider Lite UP 400%', rp(h.upLiteUp)) : '') +
      brs('Total uang pertanggungan', rp(h.upTotal)) +
      (i.pakaiGhp ? brs('Rider kesehatan', esc(i.plan)) : '') +
      '</tbody></table>' +

      '<h3 style="margin-top:12px">Rincian premi ' + esc(satuan) + '</h3>' +
      '<table class="akt-tabel"><tbody>' +
      brs('Premi UP Dasar', rp(pDasar)) +
      (h.pakaiLiteUp ? brs('Premi rider Lite UP', rp(pLite)) : '') +
      (i.pakaiGhp ? brs('Premi rider GHP ' + esc(i.plan), rp(pGhp)) : '') +
      '<tr><td><b>Total premi ' + esc(satuan) + '</b></td><td><b>' + rp(total) + '</b></td></tr>' +
      '</tbody></table>' +
      (h.catatanUP ? '<p class="catatan">' + esc(h.catatanUP) + '</p>' : '') +
      (i.pakaiGhp ? '<p class="catatan">Premi rider GHP dibayar selama masa pertanggungan ' +
        'rider dan menyesuaikan usia tertanggung tiap tahun, jadi tidak berhenti bersama ' +
        'masa bayar produk dasar.</p>' : '');
  }

  function brs(k, v) { return '<tr><td>' + k + '</td><td><b>' + v + '</b></td></tr>'; }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    ['bTgl', 'bUP', 'bPlanGhp'].forEach(function (id) {
      const n = el(id);
      if (!n) return;
      n.addEventListener('input', gambar);
      n.addEventListener('change', gambar);
    });

    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      // Menyalakan rider GHP: UP Dasar disetel minimum dan Lite UP dimatikan.
      if (t.closest('#bRider')) {
        setTimeout(function () {
          const nyala = seg('bRider') === 'Ya';
          if (nyala && !sedangMenyalakanGhp) {
            sedangMenyalakanGhp = true;
            if (el('bUP')) el('bUP').value = (50000000).toLocaleString('id-ID');
            matikanSegmen('bLiteUp', 'Tidak');
            sedangMenyalakanGhp = false;
          }
          gambar();
        }, 20);
        return;
      }

      if (t.closest('#bJK') || t.closest('#bMPP') || t.closest('#bMetode') || t.closest('#bLiteUp')) {
        setTimeout(gambar, 20);
        return;
      }

      const jalan = t.closest('[data-ghp-jalan]');
      if (jalan && jalan.dataset.ghpJalan === 'BSL') {
        const G = A();
        if (G) G.buka('BSL', konteks());
      }
    });
  }

  function matikanSegmen(id, nilai) {
    const kotak = el(id);
    if (!kotak) return;
    Array.prototype.slice.call(kotak.querySelectorAll('button')).forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.nilai === nilai));
    });
  }

  /* Konteks banding plan: kolomnya memuat paket utuh, bukan cuma plannya. */
  function konteks() {
    const i = isian();
    const d = window.__bslTerakhir;
    const bulanan = i.metode !== 'Tahunan';
    return {
      usia: i.usia, nama: i.nama, asal: 'BeSMART Lite', layarAsal: 'BSL', batas66: true,
      upDasar: i.upDasar, mpp: i.mpp, metode: i.metode, waiver: false,
      premiDasarBulanan: d && d.hasil ? d.hasil.premiBulanan : 0,
      premiDasarTahunan: d && d.hasil ? d.hasil.premiTahunan : 0,
      premiWaiverBulanan: 0, premiWaiverTahunan: 0
    };
  }

  function mulai() {
    if (!el('layarBSL')) { setTimeout(mulai, 200); return; }
    pasang();
    gambar();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__bslHook) {
      const asli = window.bukaLayar;
      const bungkus = function (nama) {
        const hasil = asli.apply(this, arguments);
        if (nama === 'BSL') setTimeout(gambar, 30);
        return hasil;
      };
      bungkus.__bslHook = true;
      ['__naHook', '__rzHook', '__promptHook', '__umumHook', '__ghpBandingHook',
        '__bandingProdukHook', '__pdkAnakHook', '__ghpSambungHook', '__cetakBandingHook']
        .forEach(function (k) { bungkus[k] = asli[k]; });
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
  }

  window.InsuranceHubBslUi = { gambar, isian, konteks, premiGhp };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 120);
  }
})();
