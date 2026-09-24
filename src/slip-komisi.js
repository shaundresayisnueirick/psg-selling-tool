/* ============================================================
   Slip Proyeksi Komisi
   ------------------------------------------------------------
   Menghitung perkiraan komisi dari closing CASE BARU yang sudah
   dicatat agen di kotak Aktivitas & Poin, pada rentang tanggal
   yang dipilih sendiri.

   Bukan pengganti slip resmi Generali. Gunanya supaya agen tahu
   lebih dulu kira-kira berapa hasil closingnya di periode itu,
   sebelum rincian resmi keluar.

   Yang dihitung hanya komisi tahun pertama atas penjualan
   pribadi. Polis tahun berjalan atau tahun sebelumnya tidak ikut.

   Level menentukan isinya, dan level datang dari kata sandi yang
   dipakai masuk — bukan dari pilihan yang bisa diubah agen:
     FC : komisi produk saja
     BM : komisi produk + override BM 40% dari komisi produk
     BD : komisi produk + override BD 70% dari komisi produk
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const persen = (n) => (Math.round(n * 1000) / 10).toString().replace('.', ',') + '%';

  /* ---------- Aturan ---------- */

  const OVERRIDE = { FC: 0, BM: 0.40, BD: 0.70 };

  /* Rate komisi tahun pertama, disalin dari tools kompensasi PSG Agency
     Builder. Kuncinya nama produk seperti yang dipakai di dropdown closing. */
  const RATE_Y1 = {
    'BeSMART Lite Future': {
      sumbu: 'mpp', label: 'Masa bayar',
      pilihan: [3, 5, 10, 15, 20],
      rate: (mpp) => ({ 3: 0.05, 5: 0.10, 10: 0.15, 15: 0.20, 20: 0.25 })[mpp] || 0
    },
    'BeSMART Lite - 100': {
      sumbu: 'mpp', label: 'Masa bayar',
      pilihan: [3, 5, 10, 15, 20],
      rate: (mpp, tahunan) => {
        const t = { 3: 0.11, 5: 0.20, 10: 0.25, 15: 0.30, 20: 0.30 };
        const b = { 3: 0.08, 5: 0.17, 10: 0.22, 15: 0.27, 20: 0.27 };
        return (tahunan ? t : b)[mpp] || 0;
      }
    },
    'New Cemerlang Prime': {
      sumbu: 'mpp-lindung', label: 'Masa bayar & perlindungan',
      pilihan: ['5-15', '10-15', '3-20', '5-20', '10-20', '3-25', '5-25', '10-25'],
      rate: (kunci, tahunan) => {
        const t = {
          '5-15': 0.175, '10-15': 0.23,
          '3-20': 0.125, '5-20': 0.225, '10-20': 0.33,
          '3-25': 0.125, '5-25': 0.225, '10-25': 0.33
        };
        const b = {
          '5-15': 0.15, '10-15': 0.20,
          '3-20': 0.10, '5-20': 0.20, '10-20': 0.30,
          '3-25': 0.10, '5-25': 0.20, '10-25': 0.30
        };
        return (tahunan ? t : b)[kunci] || 0;
      }
    },
    'Cristal Prime': {
      sumbu: 'mpp', label: 'Masa bayar',
      pilihan: [3, 5, 10],
      rate: (mpp, tahunan) => {
        const b = { 3: 0.10, 5: 0.15, 10: 0.20 }[mpp];
        if (!b) return 0;
        return tahunan ? b + (mpp === 10 ? 0.03 : 0.025) : b;
      }
    },
    'GHP GenPro': {
      sumbu: 'mpp', label: 'Masa bayar',
      pilihan: [5, 10, 15, 20, 'seumur'],
      rate: (mpp) => ({ 5: 0.15, 10: 0.20, 15: 0.25, 20: 0.25, seumur: 0.17 })[mpp] || 0
    },
    'Gen Aman (GSPA)': {
      sumbu: 'mpp', label: 'Masa bayar',
      pilihan: [5, 10, 15],
      rate: (mpp, tahunan) => {
        const t = { 5: 0.15, 10: 0.25, 15: 0.30 };
        const b = { 5: 0.10, 10: 0.20, 15: 0.25 };
        return (tahunan ? t : b)[mpp] || 0;
      }
    },
    'iFLEXYGUARD 5': {
      sumbu: 'mpp', label: 'Masa bayar',
      pilihan: [5, 10],
      rate: (mpp) => ({ 5: 0.10, 10: 0.15 })[mpp] || 0
    },
    'Kombinasi': {
      sumbu: 'komponen', label: 'Per komponen',
      pilihan: [],
      rate: () => 0
    },
    'RIZQIA': {
      sumbu: 'mpp', label: 'Masa bayar',
      pilihan: [5, 10],
      rate: (mpp) => ({ 5: 0.15, 10: 0.20 })[mpp] || 0
    }
  };

  /* Rider kesehatan punya rate sendiri, bukan mengikuti rate produk dasarnya. */
  const RATE_RIDER_Y1 = { tahunan: 0.18, bulanan: 0.15 };

  /* Pajak. Dasar pengenaan 50% dari bruto, lalu tarif Pasal 17 berlapis.
     Lapisan dihitung dari penghasilan kumulatif setahun yang diisi agen. */
  const LAPISAN_PAJAK = [
    { sampai: 60000000, tarif: 0.05 },
    { sampai: 250000000, tarif: 0.15 },
    { sampai: 500000000, tarif: 0.25 },
    { sampai: 5000000000, tarif: 0.30 },
    { sampai: Infinity, tarif: 0.35 }
  ];
  const PPN_PERKIRAAN = 0.0109;   // dari slip resmi: 273.672 dari 25.152.952

  function pajakBertingkat(brutoBaru, dppSebelumnya) {
    let dpp = brutoBaru * 0.5;
    let sudah = dppSebelumnya * 0.5;
    let pajak = 0;
    for (let i = 0; i < LAPISAN_PAJAK.length && dpp > 0; i++) {
      const batas = LAPISAN_PAJAK[i].sampai;
      if (sudah >= batas) continue;
      const ruang = batas - sudah;
      const kena = Math.min(dpp, ruang);
      pajak += kena * LAPISAN_PAJAK[i].tarif;
      dpp -= kena;
      sudah += kena;
    }
    return pajak;
  }

  /* ---------- Level ---------- */

  function levelSekarang() {
    const L = window.InsuranceHubLevel;
    if (L && L.level && OVERRIDE[L.level] !== undefined) return L;
    try {
      const s = JSON.parse(localStorage.getItem('insuranceHub.level.v1') || 'null');
      if (s && s.level) return s;
    } catch (_) {}
    return { level: 'FC', nama: 'Financial Consultant' };
  }

  /* ---------- Perhitungan ---------- */

  function pengaliTahunan(frekuensi) {
    return { BULANAN: 12, TRIWULANAN: 4, SEMESTERAN: 2, TAHUNAN: 1 }[frekuensi] || 0;
  }

  function rateProduk(k) {
    const P = RATE_Y1[k.produk];
    if (!P) return 0;
    const tahunan = k.frekuensi === 'TAHUNAN';
    if (P.sumbu === 'mpp-lindung') {
      return P.rate(String(k.mpp || '') + '-' + String(k.lamaLindung || ''), tahunan);
    }
    return P.rate(k.mpp, tahunan);
  }

  function normalisasiKomponen(k) {
    const mapa = {
      'New Cemerlang Prime': 'New Cemerlang Prime',
      'Cristal Prime': 'Cristal Prime',
      'BSL': 'BeSMART Lite - 100',
      'BeSMART Lite - 100': 'BeSMART Lite - 100',
      'GSPA': 'Gen Aman (GSPA)',
      'Gen Aman (GSPA)': 'Gen Aman (GSPA)',
      'iFLEXYGUARD': 'iFLEXYGUARD 5',
      'iFLEXYGUARD 5': 'iFLEXYGUARD 5'
    };
    return mapa[k] || k;
  }

  function rateKomponen(c, frekuensi) {
    const produk = normalisasiKomponen(c.produk);
    const P = RATE_Y1[produk];
    if (!P) return 0;
    const tahunan = frekuensi === 'TAHUNAN';
    if (P.sumbu === 'mpp-lindung') {
      return P.rate(String(c.mpp || '') + '-' + String(c.lamaLindung || ''), tahunan);
    }
    return P.rate(c.mpp, tahunan);
  }

  function hitung(dari, sampai) {
    const A = window.InsuranceHubAktivitas;
    if (!A) return null;
    const L = levelSekarang();
    const orate = OVERRIDE[L.level] || 0;

    const baris = A.kejadianBaca()
      .filter(k => k.tipe === 'closing')
      .filter(k => {
        const t = String(k.tglSpaj || '').slice(0, 10);
        return t && (!dari || t >= dari) && (!sampai || t <= sampai);
      })
      .sort((a, b) => String(a.tglSpaj).localeCompare(String(b.tglSpaj)))
      .map(k => {
        const pengali = pengaliTahunan(k.frekuensi);
        const premiDasar = Number(k.premi) || 0;
        const premiRider = Number(k.premiRider) || 0;
        const tahunan = k.frekuensi === 'TAHUNAN';

        let rDasar = rateProduk(k);
        let komisiDasar = 0;
        let komponenHasil = [];

        if (k.produk === 'Kombinasi' && Array.isArray(k.komponen) && k.komponen.length) {
          komponenHasil = k.komponen.map(c => {
            const premi = Number(c.premi) || 0;
            const rate = rateKomponen(c, k.frekuensi);
            const komisi = premi * rate;
            return {
              produk: normalisasiKomponen(c.produk),
              labelProduk: c.produk, mpp: c.mpp, lamaLindung: c.lamaLindung,
              premi, rate, komisi, lengkap: !!(premi && rate)
            };
          });
          komisiDasar = komponenHasil.reduce((t, c) => t + c.komisi, 0);
          rDasar = 0;
        } else {
          // Dasar komisi adalah premi per pembayaran x rate. Untuk proyeksi
          // income, tidak ada lagi pengalian FYAPE lalu dibagi ulang: premi
          // yang dicatat memang premi per pembayaran.
          komisiDasar = premiDasar * rDasar;
        }

        const rRider = tahunan ? RATE_RIDER_Y1.tahunan : RATE_RIDER_Y1.bulanan;
        const basisDasar = premiDasar * pengali;
        const basisRider = premiRider * pengali;
        const komisiRider = premiRider * rRider;
        const komisiProduk = komisiDasar + komisiRider;

        return {
          k, premiDasar, premiRider, pengali, tahunan,
          basisDasar, basisRider, rDasar, rRider, komisiDasar, komisiRider,
          komisiProduk, komponenHasil,
          override: komisiProduk * orate,
          total: komisiProduk * (1 + orate),
          lengkap: k.produk === 'Kombinasi'
            ? (komponenHasil.length > 0 && komponenHasil.every(c => c.lengkap))
            : !!(rDasar && pengali)
        };
      });

    const komisiProduk = baris.reduce((s, b) => s + b.komisiProduk, 0);
    const override = baris.reduce((s, b) => s + b.override, 0);
    const bruto = komisiProduk + override;

    return { level: L, orate, baris, komisiProduk, override, bruto };
  }

  /* ---------- Layar ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.SLIP_KOMISI = {
      el: 'layarSlipKomisi', judul: 'Proyeksi Komisi',
      sub: 'Perkiraan dari closing case baru', kiri: 'AKTIVITAS'
    };
    return true;
  }

  function awalBulan() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
  }
  function hariIni() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }

  function kerangka() {
    const w = el('layarSlipKomisi');
    if (!w || w.dataset.siap) return;
    w.dataset.siap = '1';
    const L = levelSekarang();

    w.innerHTML =
      '<div class="kop"><h2>Proyeksi Komisi</h2>' +
      '<p>Perkiraan hasil closing <b>case baru</b> pada periode yang kamu pilih, ' +
      'dari catatan closing di kotak Aktivitas & Poin.</p></div>' +

      '<div class="blok tanpa-cetak">' +
      '<h2>Periode</h2>' +
      '<div class="baris">' +
      '<div><label for="skDari">Dari tanggal</label><input id="skDari" type="date" value="' + awalBulan() + '"></div>' +
      '<div><label for="skSampai">Sampai tanggal</label><input id="skSampai" type="date" value="' + hariIni() + '"></div>' +
      '</div>' +
      '<div class="akt-aksi" style="margin-bottom:8px">' +
      '<button class="akt-tbl netral" type="button" data-sk-cepat="1">Tanggal 1–15</button>' +
      '<button class="akt-tbl netral" type="button" data-sk-cepat="2">Tanggal 16–akhir</button>' +
      '</div>' +
      '<div class="baris satu"><div>' +
      '<label for="skKumulatif">Penghasilan kumulatif tahun ini (opsional)</label>' +
      '<input id="skKumulatif" type="text" inputmode="numeric" placeholder="Rp 0">' +
      '<p class="catatan">Diisi dari slip resmi terakhir. Dipakai menentukan lapisan pajak. ' +
      'Kalau dikosongkan, dihitung memakai lapisan pertama.</p></div></div>' +
      '<button class="aksi" id="skHitung" type="button">Hitung proyeksi</button>' +
      '<p class="catatan">Masuk sebagai <b>' + esc(L.nama) + ' (' + esc(L.level) + ')</b>. ' +
      'Level menentukan apakah override ikut dihitung.</p>' +
      '</div>' +

      '<div id="skHasil"></div>';
  }

  function gambarHasil(h, dari, sampai, kumulatif) {
    const kotak = el('skHasil');
    if (!kotak) return;
    if (!h || !h.baris.length) {
      kotak.innerHTML = '<div class="blok"><p class="catatan">Belum ada closing dengan ' +
        'tanggal SPAJ pada periode itu. Catat dulu closingnya di kotak Aktivitas & Poin.</p></div>';
      return;
    }

    const pajak = pajakBertingkat(h.bruto, kumulatif);
    const ppn = h.bruto * PPN_PERKIRAAN;
    const bersih = h.bruto - pajak - ppn;
    const agen = window.InsuranceHubAktivitas ? window.InsuranceHubAktivitas.agenBaca() : {};
    const belumLengkap = h.baris.filter(b => !b.lengkap);

    kotak.innerHTML =
      '<div class="blok">' +
      '<h2>Perkiraan Slip Komisi</h2>' +
      '<table class="akt-tabel"><tbody>' +
      brs('Nama agen', esc(agen.nama || '—')) +
      brs('Kode agen', esc(agen.kode || '—')) +
      brs('Level', esc(h.level.nama + ' (' + h.level.level + ')')) +
      brs('Periode SPAJ', tgl(dari) + ' sampai ' + tgl(sampai)) +
      brs('Jumlah case baru', h.baris.length + ' polis') +
      '</tbody></table>' +

      '<div class="akt-rekap-total" style="margin-top:12px">' +
      '<div><span>Komisi produk</span><b>' + rp(h.komisiProduk) + '</b></div>' +
      (h.orate ? '<div><span>Override ' + esc(h.level.level) + ' ' + persen(h.orate) +
        '</span><b>' + rp(h.override) + '</b></div>' : '') +
      '<div><span>Bruto</span><b>' + rp(h.bruto) + '</b></div>' +
      '<div><span>Perkiraan diterima</span><b>' + rp(bersih) + '</b></div>' +
      '</div>' +

      '<table class="akt-tabel" style="margin-top:10px"><tbody>' +
      brs('Bruto', rp(h.bruto)) +
      brs('PPh 21 (50% bruto x tarif berlapis)', '&minus; ' + rp(pajak) +
        ' <span style="color:#8A94A3">(' + persen(h.bruto ? pajak / h.bruto : 0) + ' dari bruto)</span>') +
      brs('PPN (perkiraan)', '&minus; ' + rp(ppn)) +
      brs('<b>Perkiraan masuk rekening</b>', '<b>' + rp(bersih) + '</b>') +
      '</tbody></table>' +
      (kumulatif ? '<p class="catatan">Lapisan pajak dihitung di atas penghasilan kumulatif ' +
        rp(kumulatif) + ' yang kamu isi.</p>'
        : '<p class="catatan akt-peringatan">Penghasilan kumulatif belum diisi, jadi pajak dihitung ' +
          'pada lapisan pertama (efektif 2,5% dari bruto). Begitu penghasilan setahun menembus ' +
          'sekitar Rp120 juta, potongan sebenarnya naik ke 7,5%.</p>') +
      '</div>' +

      '<div class="blok">' +
      '<h2>Rincian per polis</h2>' +
      '<table class="akt-tabel"><thead><tr>' +
      '<th>Tgl SPAJ</th><th>Pemegang polis</th><th>Produk</th>' +
      '<th class="ka">Premi setahun</th><th class="ka">Rate</th><th class="ka">Komisi</th>' +
      '</tr></thead><tbody>' +
      h.baris.map(b => '<tr>' +
        '<td>' + tgl(b.k.tglSpaj) + '</td>' +
        '<td>' + esc(b.k.pemegang || b.k.nama) + '</td>' +
        '<td>' + esc(b.k.produk) + (b.komponenHasil.length ? '<br><span style="color:#8A94A3">' +
          b.komponenHasil.map(c => esc(c.labelProduk) + ' ' + c.mpp + '-' + c.lamaLindung + ' &middot; ' + rp(c.premi) + ' &middot; ' + persen(c.rate)).join('<br>') + '</span>' :
          (b.premiRider ? '<br><span style="color:#8A94A3">+ rider</span>' : '')) + '</td>' +
        '<td class="ka">' + (b.komponenHasil.length
          ? b.komponenHasil.map(c => rp(c.premi * b.pengali)).join('<br>')
          : rp(b.basisDasar) + (b.premiRider ? '<br>' + rp(b.basisRider) : '')) + '</td>' +
        '<td class="ka">' + (b.komponenHasil.length
          ? b.komponenHasil.map(c => persen(c.rate)).join('<br>')
          : persen(b.rDasar) + (b.premiRider ? '<br>' + persen(b.rRider) : '')) + '</td>' +
        '<td class="ka">' + rp(b.komisiProduk) + '</td></tr>').join('') +
      '</tbody></table>' +
      (belumLengkap.length ? '<p class="catatan akt-peringatan">' + belumLengkap.length +
        ' polis belum bisa dihitung ratenya — lengkapi masa bayar di catatan closingnya.</p>' : '') +
      '</div>' +

      '<div class="blok">' +
      '<p class="catatan"><b>Ini bukan slip resmi.</b> Angka di atas perkiraan dari data yang ' +
      'kamu catat sendiri, hanya untuk case baru pada periode yang dipilih. Komisi yang berlaku ' +
      'adalah yang tertera pada slip resmi PT Asuransi Jiwa Generali Indonesia, dan bisa berbeda ' +
      'karena penerbitan polis, pembayaran premi pertama, penyesuaian, serta potongan lain.</p>' +
      '</div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="skCetak" type="button">Cetak / simpan PDF</button>' +
      '</div>';
  }

  function brs(k, v) { return '<tr><td>' + k + '</td><td><b>' + v + '</b></td></tr>'; }
  function tgl(iso) {
    const A = window.InsuranceHubAktivitas;
    return A ? A.tglTampil(iso) : String(iso || '—');
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const cepat = t.closest('[data-sk-cepat]');
      if (cepat) {
        const d = new Date();
        const th = d.getFullYear(), bl = String(d.getMonth() + 1).padStart(2, '0');
        if (cepat.dataset.skCepat === '1') {
          el('skDari').value = th + '-' + bl + '-01';
          el('skSampai').value = th + '-' + bl + '-15';
        } else {
          const akhir = new Date(th, d.getMonth() + 1, 0).getDate();
          el('skDari').value = th + '-' + bl + '-16';
          el('skSampai').value = th + '-' + bl + '-' + akhir;
        }
        return;
      }

      if (t.closest('#skHitung')) {
        const dari = el('skDari').value, sampai = el('skSampai').value;
        const kum = (typeof bAngka === 'function') ? bAngka(el('skKumulatif').value) : 0;
        gambarHasil(hitung(dari, sampai), dari, sampai, kum);
        return;
      }

      if (t.closest('#skCetak')) {
        const agen = window.InsuranceHubAktivitas ? window.InsuranceHubAktivitas.agenBaca() : {};
        const asli = document.title;
        document.title = 'Proyeksi Komisi - ' + (agen.nama || 'Agen');
        window.print();
        setTimeout(() => { document.title = asli; }, 1000);
        return;
      }

      if (t.closest('#aktSlipKomisi')) {
        kerangka();
        window.bukaLayar('SLIP_KOMISI');
        return;
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'skKumulatif' && typeof bAngka === 'function') {
        const n = bAngka(e.target.value);
        e.target.value = n ? n.toLocaleString('id-ID') : '';
      }
    });
  }

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    kerangka();
    pasang();
  }

  window.InsuranceHubSlipKomisi = {
    hitung, pajakBertingkat, rateProduk, levelSekarang, RATE_Y1, RATE_RIDER_Y1, OVERRIDE
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 60);
  }
})();
