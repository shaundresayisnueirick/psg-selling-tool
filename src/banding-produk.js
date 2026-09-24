/* ============================================================
   Banding Skenario Produk
   ------------------------------------------------------------
   Satu nasabah, beberapa skenario, ditampilkan berdampingan.
   Polanya sama dengan Banding Plan GHP: agen memilih beberapa
   nilai pada satu sumbu perbandingan, lalu memilih salah satu
   untuk diproses jadi ringkasan dan cetak.

   Yang dibandingkan berbeda menurut produknya:
   - BeSMART Lite Future : masa pembayaran premi
   - BeSMART Lite 3/5-100: masa pembayaran premi
   - Cristal Prime       : masa perlindungan, atau masa bayar
   - New Cemerlang Prime : masa perlindungan, atau masa bayar
   - Gen Aman (GSPA)     : masa pembayaran kontribusi
   - iFLEXYGUARD 5       : masa pembayaran premi
   - RIZQIA              : skema bayar 5 atau 10 tahun

   Seluruh angka tetap dihitung mesin produk masing-masing.
   Modul ini hanya mengatur input, memanggil mesin, dan menyusun
   tampilannya. Tidak ada rumus premi yang ditulis ulang di sini.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => (n === null || n === undefined || n === '') ? '—'
    : 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const seg = (id) => (typeof nilaiSegmen === 'function') ? nilaiSegmen(id) : null;
  const ang = (v) => (typeof bAngka === 'function') ? bAngka(v) : Number(v) || 0;
  const tglDari = (id) => {
    const v = el(id) ? el(id).value : '';
    return v ? new Date(v + 'T00:00:00Z') : null;
  };

  /* Format hanya input angka yang dibuat khusus oleh modul Bandingkan.
     Field UP utama produk tidak disentuh. */
  function formatAngkaBandingInput(input) {
    if (!input) return;
    const raw = String(input.value || '');
    const digitsBefore = raw.slice(0, input.selectionStart == null ? raw.length : input.selectionStart)
      .replace(/\D/g, '').length;
    const digits = raw.replace(/\D/g, '');
    if (!digits) { input.value = ''; return; }
    const formatted = Number(digits).toLocaleString('id-ID');
    input.value = formatted;
    if (document.activeElement === input && input.setSelectionRange) {
      let pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBefore) {
        if (/\d/.test(formatted[pos])) seen++;
        pos++;
      }
      input.setSelectionRange(pos, pos);
    }
  }

  const MAKS = 3;
  let aktif = null;      // { produk, sumbu, hasil: [] }

  /* ---------- Susunan tiap produk ---------- */

  /* Tiap produk menyebutkan: di layar mana tombolnya dipasang, mesin apa yang
     dipakai, tabel tarif mana, cara membaca isian dasarnya, sumbu apa saja yang
     boleh dibandingkan, dan baris apa yang ditampilkan di kolom banding. */
  const PRODUK = {
BSL: {
      /* Memakai mesin BSL2 dengan tabel lengkap. Sebelumnya masih menunjuk
         mesin lama yang hanya punya masa bayar 3 dan 5, sehingga pilihan 10,
         15, dan 20 tahun ditolak dengan pesan "belum tersedia di database". */
      layar: 'BSL', nama: 'BeSMART Lite - 100', mesin: 'BSL2', maks: 3,
      tarif: () => (typeof TARIF_BSL_LENGKAP !== 'undefined' ? TARIF_BSL_LENGKAP : null),
      dasar: () => ({
        nama: el('bNama').value, jk: seg('bJK'), tglLahir: tglDari('bTgl'),
        mpp: +seg('bMPP'), metode: seg('bMetode'),
        upDasar: ang(el('bUP').value),
        pakaiLiteUp: seg('bLiteUp') !== 'Tidak',
        pakaiGhp: seg('bRider') === 'Ya',
        plan: el('bPlanGhp') ? el('bPlanGhp').value : ''
      }),
      siap: (d) => d.tglLahir && d.upDasar,
      pesanSiap: 'Isi tanggal lahir dan UP Dasar dulu.',
      sumbu: [
        { kunci: 'mpp', label: 'Masa pembayaran premi', pilihan: [3, 5, 10, 15, 20],
          teks: (v) => v + ' tahun', pasang: (v) => pasangSegmen('bMPP', v) },
        { kunci: 'upDasar', label: 'UP Dasar', pilihan: 'angka',
          teks: (v) => rp(v) + (seg('bLiteUp') !== 'Tidak'
            ? ' + Lite UP ' + rp(v * 4) : ''),
          pasang: (v) => pasangTeks('bUP', v) }
      ],
      baris: (h, d) => {
        const bulanan = d.metode !== 'Tahunan';
        const G = window.InsuranceHubGhpAturan;
        const pGhp = (d.pakaiGhp && G && h.usia != null && d.plan)
          ? (bulanan ? G.premiBulanan(h.usia, d.plan) : G.premiTahunan(h.usia, d.plan)) || 0 : 0;
        const baris = [
          ['Masa bayar', d.mpp + ' tahun'],
          ['UP Dasar', rp(h.upDasar)]
        ];
        if (h.pakaiLiteUp) baris.push(['Rider Lite UP 400%', rp(h.upLiteUp)]);
        baris.push(['Total uang pertanggungan', rp(h.upTotal)]);
        baris.push(['Premi UP Dasar', rp(bulanan ? h.premiDasarBulanan : h.premiDasarTahunan)]);
        if (h.pakaiLiteUp) {
          baris.push(['Premi rider Lite UP', rp(bulanan ? h.premiLiteUpBulanan : h.premiLiteUpTahunan)]);
        }
        if (d.pakaiGhp) baris.push(['Premi rider GHP ' + esc(d.plan), rp(pGhp)]);
        baris.push(['Manfaat meninggal', rp(h.manfaatMeninggal)]);
        baris.push(['Manfaat hidup usia 100', rp(h.manfaatHidup)]);
        /* Total dibayar hanya sah tanpa rider kesehatan: premi GHP dibayar
           selama masa pertanggungan rider, bukan selama masa bayar. */
        baris.push(['Total dibayar', d.pakaiGhp
          ? 'Tidak ditampilkan (ada rider kesehatan)' : rp(h.totalSesuaiMetode)]);
        return baris;
      },
      premi: (h, d) => {
        const bulanan = d.metode !== 'Tahunan';
        const G = window.InsuranceHubGhpAturan;
        const pGhp = (d.pakaiGhp && G && h.usia != null && d.plan)
          ? (bulanan ? G.premiBulanan(h.usia, d.plan) : G.premiTahunan(h.usia, d.plan)) || 0 : 0;
        return {
          nilai: h.premiSesuaiMetode + pGhp,
          satuan: bulanan ? 'per bulan' : 'per tahun'
        };
      }
    },

    CRIS: {
      layar: 'CRIS', nama: 'Cristal Prime', mesin: 'CRIS',
      tarif: () => (typeof TARIF_CRIS !== 'undefined' ? TARIF_CRIS : null),
      dasar: () => ({
        nama: el('cNama').value, jk: seg('cJK'), tglLahir: tglDari('cTgl'),
        lamaBayar: +seg('cBayar'), lamaLindung: +seg('cLindung'),
        metode: seg('cMetode'), up: ang(el('cUP').value)
      }),
      siap: (d) => d.tglLahir && d.up,
      pesanSiap: 'Isi tanggal lahir dan uang pertanggungan dulu.',
      sumbu: [
        { kunci: 'lamaLindung', label: 'Masa perlindungan', pilihan: [15, 20, 25],
          teks: (v) => v + ' tahun', pasang: (v) => pasangSegmen('cLindung', v) },
        { kunci: 'lamaBayar', label: 'Masa pembayaran premi', pilihan: [3, 5, 10],
          teks: (v) => v + ' tahun', pasang: (v) => pasangSegmen('cBayar', v) },
        { kunci: 'up', label: 'Uang pertanggungan', pilihan: 'angka',
          teks: (v) => rp(v), pasang: (v) => pasangTeks('cUP', v) }
      ],
      baris: (h, d) => [
        ['Masa bayar', d.lamaBayar + ' tahun'],
        ['Masa perlindungan', d.lamaLindung + ' tahun'],
        ['UP sakit kritis', rp(d.up)],
        ['Bonus 20% sakit kritis', rp(h.bonus)],
        ['Total manfaat kritis', rp(h.totalKritis)],
        ['Manfaat angioplasti 10%', rp(h.angioplasty)],
        ['Sisa manfaat setelah angioplasti', rp(h.sisaSetelahAngio)],
        ['Manfaat meninggal', rp(h.manfaatMeninggal)],
        ['Dana kembali akhir', rp(h.akhirKontrak) +
          (h.rop ? ' (' + Math.round(h.rop * 100) + '% premi)' : '')],
        ['Total dibayar', rp(h.totalDibayar)]
      ],
      premi: (h, d) => ({ nilai: h.premiSesuaiMetode, satuan: d.metode === 'Bulanan' ? 'per bulan' : 'per tahun' })
    },

    CEM: {
      layar: 'CEM', nama: 'New Cemerlang Prime', mesin: 'NCP',
      tarif: () => (typeof TARIF_CEM !== 'undefined' ? TARIF_CEM : null),
      dasar: () => ({
        nama: el('mNama').value, jk: seg('mJK'), tglLahir: tglDari('mTgl'),
        lamaBayar: +seg('mBayar'), lamaLindung: +seg('mLindung'),
        metode: seg('mMetode'), up: ang(el('mUP').value)
      }),
      siap: (d) => d.tglLahir && d.up,
      pesanSiap: 'Isi tanggal lahir dan uang pertanggungan dulu.',
      sumbu: [
        { kunci: 'lamaLindung', label: 'Masa perlindungan', pilihan: [15, 20, 25],
          teks: (v) => v + ' tahun', pasang: (v) => pasangSegmen('mLindung', v) },
        { kunci: 'lamaBayar', label: 'Masa pembayaran premi', pilihan: [3, 5, 10],
          teks: (v) => v + ' tahun', pasang: (v) => pasangSegmen('mBayar', v) },
        { kunci: 'up', label: 'Uang pertanggungan', pilihan: 'angka',
          teks: (v) => rp(v), pasang: (v) => pasangTeks('mUP', v) }
      ],
      baris: (h, d) => [
        ['Masa bayar', d.lamaBayar + ' tahun'],
        ['Masa perlindungan', d.lamaLindung + ' tahun'],
        ['Uang pertanggungan', rp(d.up)],
        ['Meninggal dunia karena sebab apa pun', rp(h.meninggal ?? d.up)],
        ['Meninggal karena kecelakaan', rp(h.meninggalKecelakaan)],
        ['Dana kembali akhir', rp(h.akhirKontrak) +
          (h.rop ? ' (' + Math.round(h.rop * 100) + '% premi)' : '')],
        ['Total dibayar', rp(h.totalDibayar)]
      ],
      premi: (h, d) => ({ nilai: h.premiSesuaiMetode, satuan: d.metode === 'Bulanan' ? 'per bulan' : 'per tahun' })
    },

    FLEX: {
      layar: 'FLEX', nama: 'iFLEXYGUARD 5', mesin: 'FLEX',
      tarif: () => (typeof TARIF_FLEX !== 'undefined' ? TARIF_FLEX : null),
      dasar: () => ({
        nama: el('xNama').value, tglLahir: tglDari('xTgl'),
        mpp: +seg('xMpp'), metode: seg('xMetode'), up: ang(el('xUP').value)
      }),
      siap: (d) => d.tglLahir && d.up,
      pesanSiap: 'Isi tanggal lahir dan UP Dasar dulu.',
      sumbu: [
        { kunci: 'mpp', label: 'Masa pembayaran premi', pilihan: [5, 10],
          teks: (v) => v + ' tahun', pasang: (v) => pasangSegmen('xMpp', v) },
        { kunci: 'up', label: 'UP Dasar', pilihan: 'angka',
          teks: (v) => rp(v), pasang: (v) => pasangTeks('xUP', v) }
      ],
      baris: (h, d) => [
        ['Masa bayar', d.mpp + ' tahun'],
        ['UP Dasar', rp(d.up)],
        ['Manfaat tahun 1-5', rp(h.manfaatTahun1)],
        ['Manfaat tahun 6-10', rp(h.manfaatTahun6)],
        ['Manfaat tahun 11+', rp(h.manfaatTahun11)],
        ['Bonus 75', rp(h.bonus75)],
        /* Manfaat kecelakaan sebelumnya hanya ada di ringkasan single,
           padahal justru di kolom banding inilah nasabah membandingkan. */
        ['Tambahan meninggal karena kecelakaan',
          rp(h.tambahanKecelakaan) + ' (100% UP Dasar, maksimal Rp1.000.000.000)'],
        ['Total dibayar', rp(h.totalDibayar)]
      ],
      premi: (h, d) => ({ nilai: h.premiAktif, satuan: d.metode === 'Bulanan' ? 'per bulan' : 'per tahun' })
    },

    GSPA: {
      layar: 'GSPA', nama: 'Gen Aman (GSPA)', mesin: 'GSPA',
      tarif: () => (typeof DATA_GSPA !== 'undefined' ? DATA_GSPA : null),
      dasar: () => ({
        nama: el('gNama').value, jk: seg('gJK'), tglLahir: tglDari('gTgl'),
        mpp: +seg('gMpp'), metode: seg('gMetode'), mode: seg('gMode'),
        upDasar: ang(el('gUpDasar').value), premiNet: ang(el('gPremiNet').value),
        modeWakaf: seg('gWakaf') === 'Wakaf' ? 'Wakaf' : 'Non Wakaf',
        nilaiWakaf: ang(el('gNilaiWakaf').value),
        persenWakaf: +(el('gPersenWakaf') ? el('gPersenWakaf').value : 0),
        /* Gen Aman satu-satunya produk yang ridernya dirakit DI LUAR mesin:
           waiver dan GHPS dihitung di layar GSPA lalu ditambahkan ke premi.
           Kalau pilihan itu tidak ikut dibawa ke sini, kartu banding hanya
           menampilkan kontribusi dasar dan angkanya beda dengan ringkasan. */
        pakaiWaiver: seg('gWaiverRider') === 'Ya',
        pakaiGhps: seg('gRider') === 'Ya',
        planGhps: el('gPlanGhps') ? el('gPlanGhps').value : null
      }),
      /* Rider dihitung dengan memanggil fungsi yang sama persis dipakai layar
         GSPA (waiverHitung / ghpsHitung), bukan menyalin rumusnya, supaya
         tidak pernah ada dua versi rumus yang bisa berbeda. */
      sesudahHitung: (h, d) => {
        if (!h || !h.tersedia) return h;
        const w = (d.pakaiWaiver && typeof waiverHitung === 'function')
          ? waiverHitung(h.usia, d.mpp, d.jk, h.upDasar, h.diskon) : null;
        const g = (d.pakaiGhps && d.planGhps && typeof ghpsHitung === 'function')
          ? ghpsHitung(h.usia, d.mpp, d.planGhps) : null;
        h.waiver = (w && w.sah) ? w : null;
        h.ghps = (g && g.sah) ? g : null;
        const wB = h.waiver ? h.waiver.bulanan : 0;
        const wT = h.waiver ? h.waiver.tahunan : 0;
        const gB = h.ghps ? h.ghps.bulanan : 0;
        const gT = h.ghps ? h.ghps.tahunan : 0;
        h.gabunganBulanan = h.bulanan + wB + gB;
        h.gabunganTahunan = h.tahunan + wT + gT;
        /* Dipakai untuk angka besar di kartu. Harus PER SETORAN, bukan
           h.sesuaiMetode: pada metode Bulanan, sesuaiMetode berisi
           kontribusi setahun (bulanan x 12) karena dipakai baris timeline.
           Kartu banding sebelumnya menampilkan angka itu dengan label
           "per bulan", sehingga preminya tampak 12 kali lipat. */
        h.gabunganPerSetoran = (d.metode === 'Bulanan')
          ? h.gabunganBulanan : h.gabunganTahunan;
        /* Total dibayar mengikuti cara layar GSPA: premi per tahun dikali
           masa bayar. Untuk metode Bulanan, satu tahun = 12 setoran. */
        const perTahun = (b, t) => (d.metode === 'Bulanan' ? b * 12 : t);
        h.gabunganTotal = (d.metode === 'Bulanan' ? h.totalBulanan : h.totalTahunan)
          + perTahun(wB, wT) * d.mpp + perTahun(gB, gT) * d.mpp;
        return h;
      },
      siap: (d) => d.tglLahir && (d.upDasar || d.premiNet),
      pesanSiap: 'Isi tanggal lahir dan UP Dasar atau premi net dulu.',
      sumbu: [
        { kunci: 'mpp', label: 'Masa pembayaran kontribusi', pilihan: [5, 10, 15],
          teks: (v) => v + ' tahun', pasang: (v) => pasangSegmen('gMpp', v) },
        { kunci: 'upDasar', label: 'UP Dasar', pilihan: 'angka',
          teks: (v) => rp(v), pasang: (v) => pasangTeks('gUpDasar', v) }
      ],
      baris: (h, d) => {
        const satuan = d.metode === 'Bulanan' ? '/bln' : '/thn';
        const nilaiRider = (x) => x
          ? rp(d.metode === 'Bulanan' ? x.bulanan : x.tahunan) + ' ' + satuan
          : 'Tidak diambil';
        return [
          ['Masa bayar', d.mpp + ' tahun'],
          ['UP Dasar', rp(h.upDasar)],
          ['Santunan usia 100', rp(h.santunanUsia100)],
          ['Diskon', h.diskon ? Math.round(h.diskon * 100) + '%' : '—'],
          ['Wakaf', h.wakaf ? rp(h.nilaiWakaf) : 'Tanpa wakaf'],
          ['Kontribusi dasar', rp(h.perSetoran) + ' ' + satuan],
          ['Rider waiver', d.pakaiWaiver
            ? (h.waiver ? nilaiRider(h.waiver) : 'Tarif tidak tersedia')
            : 'Tidak diambil'],
          ['Rider kesehatan GHPS', d.pakaiGhps
            ? (h.ghps ? (esc(h.ghps.plan) + ' · ' + nilaiRider(h.ghps))
                      : 'Tarif tidak tersedia')
            : 'Tidak diambil'],
          /* Total dibayar hanya sah bila tanpa rider kesehatan: premi kesehatan
             dibayar selama masa pertanggungan rider, bukan selama masa bayar. */
          ['Total dibayar', d.pakaiGhps
            ? 'Tidak ditampilkan (ada rider kesehatan)'
            : rp(h.gabunganTotal != null ? h.gabunganTotal : h.totalTahunan)]
        ];
      },
      premi: (h, d) => ({
        nilai: h.gabunganPerSetoran != null ? h.gabunganPerSetoran : h.perSetoran,
        satuan: d.metode === 'Bulanan' ? 'per bulan' : 'per tahun' })
    },

    GHP: {
      layar: 'GHP', nama: 'GHP GenPro', mesin: 'GHP',
      tarif: () => (typeof DATA_GHP !== 'undefined' ? DATA_GHP : null),
      dasar: () => ({
        tglLahir: tglDari('hTgl'), jk: seg('hJK'), skema: seg('hSkema'),
        metode: seg('hMetode'), plan: el('hPlan') ? el('hPlan').value : null,
        pakaiRider: seg('hRider') === 'Ya',
        upJiwa: ang(el('hUP').value)
      }),
      siap: (d) => d.tglLahir && d.upJiwa,
      pesanSiap: 'Isi tanggal lahir dan UP jiwa dasar dulu.',
      sumbu: [
        { kunci: 'upJiwa', label: 'UP jiwa dasar', pilihan: 'angka',
          teks: (v) => rp(v), pasang: (v) => pasangTeks('hUP', v) },
        { kunci: 'skema', label: 'Skema jiwa (paket GenPro)', pilihan: ['10-90', '90-90'],
          teks: (v) => 'Paket ' + v, pasang: (v) => pasangSegmen('hSkema', v) }
      ],
      baris: (h, d) => [
        ['Skema jiwa', esc(d.skema)],
        ['UP jiwa dasar', rp(d.upJiwa)],
        ['Premi jiwa / bulan', rp(h.premiJiwaBulanan)],
        ['Premi jiwa / tahun', rp(h.premiJiwaTahunan)],
        ['Rider kesehatan', d.pakaiRider ? esc(d.plan || '—') : 'Tidak diambil'],
        ['Premi rider / bulan', d.pakaiRider ? rp(h.premiSehatBulanan) : '—']
      ],
      premi: (h, d) => ({
        nilai: d.metode === 'Tahunan' ? h.totalTahunan : h.totalBulanan,
        satuan: d.metode === 'Tahunan' ? 'per tahun' : 'per bulan'
      })
    },

RIZQIA: {
      layar: 'RIZQIA', nama: 'RIZQIA', mesin: null,
      dasar: () => ({
        nama: el('rzNama') ? el('rzNama').value : '',
        tgl: el('rzTgl') ? el('rzTgl').value : '',
        plan: el('rzPlan') ? el('rzPlan').value : 'R10',
        mode: el('rzMode') ? el('rzMode').value : 'tahunan',
        up: ang(el('rzUp') ? el('rzUp').value : 0)
      }),
      siap: (d) => d.tgl && d.up,
      pesanSiap: 'Isi tanggal lahir dan manfaat asuransi dulu.',
      sumbu: [
        { kunci: 'plan', label: 'Skema pembayaran', pilihan: ['R10', 'R5'],
          teks: (v) => v === 'R10' ? 'Bayar 10 tahun' : 'Bayar 5 tahun',
          pasang: (v) => { if (el('rzPlan')) el('rzPlan').value = v; } },
        { kunci: 'up', label: 'Manfaat asuransi', pilihan: 'angka',
          teks: (v) => rp(v), pasang: (v) => pasangTeks('rzUp', v) }
      ],
      hitungSendiri: (d) => {
        const R = window.InsuranceHubRizqia;
        if (!R) return null;
        const usia = usiaDariTgl(d.tgl);
        const h = R.hitung({ plan: d.plan, mode: d.mode, usia: usia, up: d.up });
        if (!h || !h.ok) return { tersedia: false, alasan: h ? h.pesan : 'Gagal menghitung.' };
        h.tersedia = true;
        return h;
      },
      baris: (h, d) => [
        ['Masa bayar', h.masaBayar + ' tahun'],
        ['Masa perlindungan', h.masaAsuransi + ' tahun'],
        ['Manfaat asuransi', rp(h.up)],
        ['Meninggal kecelakaan', rp(h.manfaatKecelakaan)],
        ['Kembali di akhir', rp(h.manfaatAkhir)],
        ['Total kontribusi', rp(h.totalKontribusi)]
      ],
      premi: (h, d) => ({ nilai: h.kontribusi, satuan: d.mode === 'bulanan' ? 'per bulan' : 'per tahun' })
    }
  };

  /* ---------- Alat bantu ---------- */

  function usiaDariTgl(teks) {
    if (!teks) return null;
    if (typeof usiaGenerali === 'function') return usiaGenerali(new Date(teks + 'T00:00:00Z'));
    const l = new Date(teks + 'T00:00:00'), k = new Date();
    let u = k.getFullYear() - l.getFullYear();
    const m = k.getMonth() - l.getMonth();
    if (m < 0 || (m === 0 && k.getDate() < l.getDate())) u--;
    return u;
  }

  // Menekan tombol segmen yang nilainya cocok, supaya kalkulator ikut berubah.
  function pasangSegmen(id, nilai) {
    const kotak = el(id);
    if (!kotak) return;
    const tombol = Array.prototype.slice.call(kotak.querySelectorAll('button'))
      .find(b => String(b.dataset.nilai !== undefined ? b.dataset.nilai : b.textContent).trim()
        .replace(/[^0-9A-Za-z]/g, '') === String(nilai).replace(/[^0-9A-Za-z]/g, ''));
    if (tombol) { tombol.click(); return; }
    // Kalau ternyata select biasa.
    if (kotak.tagName === 'SELECT') { kotak.value = String(nilai); kotak.dispatchEvent(new Event('change')); }
  }

  function pasangPilihan(id, nilai) {
    const n = el(id);
    if (!n) return;
    n.value = String(nilai);
    n.dispatchEvent(new Event('change'));
  }

  function pasangTeks(id, nilai) {
    const n = el(id);
    if (!n) return;
    n.value = Number(nilai).toLocaleString('id-ID');
    n.dispatchEvent(new Event('input'));
  }

  /* ---------- Perhitungan satu skenario ---------- */

  function hitungSkenario(kodeProduk, sumbu, nilai) {
    const P = PRODUK[kodeProduk];
    const dasar = P.dasar();
    const d = Object.assign({}, dasar);
    d[sumbu.kunci] = nilai;

    if (P.hitungSendiri) {
      const h = P.hitungSendiri(d);
      return { nilai: nilai, dasar: d, hasil: h, tersedia: !!(h && h.tersedia), alasan: h ? h.alasan : null };
    }

    const mesin = window.InsuranceHubEngine;
    const rates = P.tarif ? P.tarif() : null;
    if (!mesin || !rates) return { nilai: nilai, dasar: d, tersedia: false, alasan: 'Tabel tarif belum siap.' };
    let h;
    try { h = mesin.calculate(P.mesin, d, { rates: rates }); }
    catch (e) { return { nilai: nilai, dasar: d, tersedia: false, alasan: 'Perhitungan gagal.' }; }
    if (!h) return { nilai: nilai, dasar: d, tersedia: false, alasan: 'Perhitungan kosong.' };
    /* Produk yang ridernya dihitung di luar mesin menambahkannya di sini,
       supaya kartu banding memakai angka yang sama dengan layar produknya. */
    if (typeof P.sesudahHitung === 'function') {
      try { h = P.sesudahHitung(h, d) || h; } catch (e) {}
    }
    return { nilai: nilai, dasar: d, hasil: h, tersedia: !!h.tersedia, alasan: h.alasan };
  }

  /* ---------- Pemilih di layar produk ---------- */

  function pasangPemilih(kodeProduk) {
    const P = PRODUK[kodeProduk];
    if (!P) return;
    const wadah = el('bandingKotak_' + kodeProduk);
    if (!wadah || wadah.dataset.siap) return;
    wadah.dataset.siap = '1';

    if (P.dwiSumbu) { pemilihDwi(kodeProduk, P, wadah); return; }

    wadah.innerHTML =
      '<h3>Bandingkan beberapa pilihan</h3>' +
      '<p class="catatan">Pilih apa yang mau dibandingkan, lalu tandai sampai ' + MAKS +
      ' pilihan. Isian lain mengikuti yang sedang kamu isi di atas.</p>' +
      '<div class="baris satu"><div><label for="bandingSumbu_' + kodeProduk + '">Yang dibandingkan</label>' +
      '<select id="bandingSumbu_' + kodeProduk + '" data-banding-sumbu="' + kodeProduk + '">' +
      P.sumbu.map((s, i) => '<option value="' + i + '">' + esc(s.label) + '</option>').join('') +
      '</select></div></div>' +
      '<div id="bandingNilai_' + kodeProduk + '"></div>' +
      '<button class="aksi" type="button" data-banding-jalan="' + kodeProduk + '" style="margin-top:9px">' +
      'Bandingkan</button>' +
      '<p class="catatan" data-banding-pesan="' + kodeProduk + '"></p>';

    gambarPilihanNilai(kodeProduk, 0);
  }

  /* Dua baris pilihan: Gen Aman di atas, Lite Future di bawah. Baris yang
     dibiarkan kosong memakai isian utama di kalkulator. */
  function pemilihDwi(kodeProduk, P, wadah) {
    const maks = P.maks || MAKS;
    const baris = function (kunciBaris, def) {
      return '<div class="baris satu"><div>' +
        '<label for="bandingSumbu' + kunciBaris + '_' + kodeProduk + '">' + esc(def.judul) + '</label>' +
        '<select id="bandingSumbu' + kunciBaris + '_' + kodeProduk + '" ' +
        'data-banding-sumbu-dwi="' + kodeProduk + '" data-baris="' + kunciBaris + '">' +
        '<option value="">— tidak dibandingkan, pakai isian utama —</option>' +
        def.sumbu.map((sb, i) => '<option value="' + i + '">' + esc(sb.label) + '</option>').join('') +
        '</select></div></div>' +
        '<div id="bandingNilai' + kunciBaris + '_' + kodeProduk + '"></div>';
    };

    wadah.innerHTML =
      '<h3>Bandingkan beberapa paket</h3>' +
      '<p class="catatan">Kalkulator ini menggabungkan dua produk, jadi pilihannya dipisah. ' +
      'Isi salah satu baris atau keduanya, paling banyak ' + maks + ' paket. ' +
      'Baris yang dibiarkan kosong memakai isian utama di atas.</p>' +
      baris('A', P.dwiSumbu.A) +
      baris('B', P.dwiSumbu.B) +
      '<button class="aksi" type="button" data-banding-jalan="' + kodeProduk + '" ' +
      'style="margin-top:9px">Bandingkan paket</button>' +
      '<p class="catatan" data-banding-pesan="' + kodeProduk + '"></p>';
  }

  function gambarPilihanNilaiDwi(kodeProduk, kunciBaris, iSumbu) {
    const P = PRODUK[kodeProduk];
    const wadah = el('bandingNilai' + kunciBaris + '_' + kodeProduk);
    if (!wadah) return;
    if (iSumbu === '' || iSumbu === null) { wadah.innerHTML = ''; return; }
    const s = P.dwiSumbu[kunciBaris].sumbu[+iSumbu];
    if (!s) { wadah.innerHTML = ''; return; }

    if (s.pilihan === 'angka') {
      wadah.innerHTML = '<div class="baris">' +
        [0, 1, 2].map(i => '<div><label>Nilai ' + (i + 1) + '</label>' +
          '<input type="text" inputmode="numeric" data-banding-angka-dwi="' + kodeProduk +
          '" data-baris="' + kunciBaris + '" placeholder="Boleh dikosongkan"></div>').join('') +
        '</div>';
      return;
    }
    wadah.innerHTML = '<div class="akt-tab" data-banding-nilai-dwi="' + kodeProduk +
      '" data-baris="' + kunciBaris + '">' +
      s.pilihan.map(v => '<button type="button" data-nilai="' + esc(v) + '" aria-pressed="false">' +
        esc(s.teks(v)) + '</button>').join('') + '</div>';
  }

  function nilaiTerpilihDwi(kodeProduk, kunciBaris, s) {
    if (!s) return [];
    if (s.pilihan === 'angka') {
      return Array.prototype.slice.call(document.querySelectorAll(
        '[data-banding-angka-dwi="' + kodeProduk + '"][data-baris="' + kunciBaris + '"]'))
        .map(n => ang(n.value)).filter(v => v > 0);
    }
    const bar = document.querySelector(
      '[data-banding-nilai-dwi="' + kodeProduk + '"][data-baris="' + kunciBaris + '"]');
    if (!bar) return [];
    return Array.prototype.slice.call(bar.querySelectorAll('button'))
      .filter(b => b.getAttribute('aria-pressed') === 'true')
      .map(b => { const v = b.dataset.nilai; return /^-?\d+$/.test(v) ? +v : v; });
  }

  function gambarPilihanNilai(kodeProduk, iSumbu) {
    const P = PRODUK[kodeProduk];
    const s = P.sumbu[iSumbu];
    const wadah = el('bandingNilai_' + kodeProduk);
    if (!wadah || !s) return;

    if (s.pilihan === 'angka') {
      wadah.innerHTML = '<div class="baris">' +
        [0, 1, 2].map(i => '<div><label>Pilihan ' + (i + 1) + '</label>' +
          '<input type="text" inputmode="numeric" data-banding-angka="' + kodeProduk + '" ' +
          'placeholder="' + (i === 0 ? 'Wajib diisi' : 'Boleh dikosongkan') + '"></div>').join('') +
        '</div>';
      return;
    }
    wadah.innerHTML = '<div class="akt-tab" data-banding-nilai="' + kodeProduk + '">' +
      s.pilihan.map(v => '<button type="button" data-nilai="' + esc(v) + '" aria-pressed="false">' +
        esc(s.teks(v)) + '</button>').join('') + '</div>';
  }

  function nilaiTerpilih(kodeProduk, s) {
    if (s.pilihan === 'angka') {
      return Array.prototype.slice.call(
        document.querySelectorAll('[data-banding-angka="' + kodeProduk + '"]'))
        .map(n => ang(n.value)).filter(v => v > 0);
    }
    const bar = document.querySelector('[data-banding-nilai="' + kodeProduk + '"]');
    if (!bar) return [];
    return Array.prototype.slice.call(bar.querySelectorAll('button'))
      .filter(b => b.getAttribute('aria-pressed') === 'true')
      .map(b => {
        const v = b.dataset.nilai;
        return /^-?\d+$/.test(v) ? +v : v;
      });
  }

  /* ---------- Layar banding ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.BANDING_PRODUK = {
      el: 'layarBandingProduk', judul: 'Banding Pilihan',
      sub: 'Bandingkan beberapa skenario sekaligus', kiri: 'PRODUK'
    };
    return true;
  }

  function gambar() {
    const w = el('layarBandingProduk');
    if (!w) return;
    if (!aktif || !aktif.hasil.length) {
      w.innerHTML = '<div class="blok"><p class="catatan">Pilih dulu apa yang mau ' +
        'dibandingkan di layar produk.</p></div>';
      return;
    }
    const P = PRODUK[aktif.produk];
    const nama = aktif.namaNasabah || 'Nasabah';

    w.setAttribute('data-produk-banding', aktif.produk);
    w.innerHTML =
      '<div class="kop"><h2>' + esc(P.nama) + '</h2>' +
      '<p>Untuk <b>' + esc(nama) + '</b>' +
      (aktif.usia != null ? ', usia ' + aktif.usia + ' tahun' : '') +
      '. Membandingkan <b>' + esc(aktif.sumbu.label.toLowerCase()) +
      '</b>; isian lainnya sama di semua kolom.</p></div>' +
      '<div class="banding-gulir"><div class="banding-baris">' +
      aktif.hasil.map(kartu).join('') +
      '</div></div>' +
      '<p class="catatan" style="margin-top:10px">Centang pilihan yang ingin ikut dicetak. ' +
      'Semua pilihan tetap tampil di layar, tetapi hanya yang dicentang yang masuk ke PDF.</p>' +
      '<div class="akt-aksi tanpa-cetak" style="margin-top:12px">' +
      '<button class="aksi" id="bandingProdukCetak" type="button">Cetak / simpan PDF</button></div>';
  }

  function kartu(r) {
    const P = PRODUK[aktif.produk];
    if (!r.tersedia) {
      return '<div class="banding-kolom banding-mati">' +
        '<div class="banding-judul">' + esc(aktif.sumbu.teks(r.nilai)) + '</div>' +
        '<p class="catatan akt-peringatan">' + esc(r.alasan || 'Tidak tersedia.') + '</p></div>';
    }
    const pr = P.premi(r.hasil, r.dasar);
    return '<div class="banding-kolom">' +
      '<div class="banding-judul">' + esc(aktif.sumbu.teks(r.nilai)) + '</div>' +
      '<table class="akt-tabel banding-tabel"><tbody>' +
      P.baris(r.hasil, r.dasar).map(b =>
        '<tr><td>' + esc(b[0]) + '</td><td><b>' + b[1] + '</b></td></tr>').join('') +
      '</tbody></table>' +
      '<div class="banding-premi"><span>Premi ' + esc(pr.satuan) + '</span>' +
      '<b>' + rp(pr.nilai) + '</b></div>' +
      '<label class="banding-centang"><input type="checkbox" checked ' +
      'data-kolom-cetak="' + (aktif.hasil.slice(0, aktif.hasil.indexOf(r) + 1).filter(function (x) { return x.tersedia; }).length) + '"><span>Ikut dicetak</span></label>' +
      '</div>';
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('change', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.dataset.bandingSumbu) { gambarPilihanNilai(t.dataset.bandingSumbu, +t.value); return; }
      if (t.dataset.bandingSumbuDwi) {
        gambarPilihanNilaiDwi(t.dataset.bandingSumbuDwi, t.dataset.baris, t.value);
      }
    });

    document.addEventListener('input', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      /* Hanya field angka di panel Bandingkan yang diformat.
         Input produk utama dan field lain tidak disentuh. */
      if (t.matches('[data-banding-angka], [data-banding-angka-dwi]')) {
        formatAngkaBandingInput(t);
      }
    });

    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const barDwi = t.closest('[data-banding-nilai-dwi]');
      if (barDwi) {
        const b = t.closest('button');
        if (!b) return;
        const kode = barDwi.dataset.bandingNilaiDwi;
        const P = PRODUK[kode];
        const maks = (P && P.maks) || MAKS;
        const nyala = b.getAttribute('aria-pressed') === 'true';
        const jml = barDwi.querySelectorAll('button[aria-pressed="true"]').length;
        const pesan = document.querySelector('[data-banding-pesan="' + kode + '"]');
        if (!nyala && jml >= maks) {
          if (pesan) pesan.textContent = 'Paling banyak ' + maks + ' pilihan pada satu baris.';
          return;
        }
        b.setAttribute('aria-pressed', String(!nyala));
        if (pesan) pesan.textContent = '';
        return;
      }

      const bar = t.closest('[data-banding-nilai]');
      if (bar) {
        const b = t.closest('button');
        if (!b) return;
        const kode = bar.dataset.bandingNilai;
        const nyala = b.getAttribute('aria-pressed') === 'true';
        const jml = bar.querySelectorAll('button[aria-pressed="true"]').length;
        const pesan = document.querySelector('[data-banding-pesan="' + kode + '"]');
        if (!nyala && jml >= MAKS) {
          if (pesan) pesan.textContent = 'Paling banyak ' + MAKS + ' pilihan sekaligus.';
          return;
        }
        b.setAttribute('aria-pressed', String(!nyala));
        if (pesan) pesan.textContent = (jml + (nyala ? -1 : 1)) + ' pilihan ditandai.';
        return;
      }

      const jalan = t.closest('[data-banding-jalan]');
      if (jalan) {
        const kode = jalan.dataset.bandingJalan;
        jalankan(kode);
        return;
      }

      if (t.closest('#bandingProdukCetak')) {
        const asli = document.title;
        document.title = 'Banding Pilihan - ' + ((aktif && aktif.namaNasabah) || 'Nasabah');
        window.print();
        setTimeout(() => { document.title = asli; }, 1000);
        return;
      }

    });
  }

  function jalankanDwi(kode) {
    const P = PRODUK[kode];
    const pesan = document.querySelector('[data-banding-pesan="' + kode + '"]');
    const dasar = P.dasar();
    if (!P.siap(dasar)) { if (pesan) pesan.textContent = P.pesanSiap; return; }

    const ambil = function (kunciBaris) {
      const sel = el('bandingSumbu' + kunciBaris + '_' + kode);
      const v = sel ? sel.value : '';
      if (v === '') return null;
      const sb = P.dwiSumbu[kunciBaris].sumbu[+v];
      const nilai = nilaiTerpilihDwi(kode, kunciBaris, sb);
      return nilai.length ? { sumbu: sb, nilai: nilai } : null;
    };
    const A = ambil('A'), B = ambil('B');
    if (!A && !B) {
      if (pesan) pesan.textContent = 'Pilih dulu apa yang mau dibandingkan pada salah satu baris.';
      return;
    }

    // Paket dibentuk berpasangan. Baris yang kosong memakai isian utama.
    const maks = P.maks || MAKS;
    const paket = [];
    const daftarA = A ? A.nilai : [null];
    const daftarB = B ? B.nilai : [null];
    for (let i = 0; i < daftarA.length && paket.length < maks; i++) {
      for (let j = 0; j < daftarB.length && paket.length < maks; j++) {
        paket.push({ a: daftarA[i], b: daftarB[j] });
      }
    }

    aktif = {
      produk: kode, namaNasabah: dasar.nama || 'Nasabah',
      sumbu: {
        label: [A ? A.sumbu.label : null, B ? B.sumbu.label : null].filter(Boolean).join(' dan '),
        teks: function (x) {
          const bagian = [];
          if (A && x.a !== null) bagian.push(A.sumbu.teks(x.a));
          if (B && x.b !== null) bagian.push(B.sumbu.teks(x.b));
          return bagian.join(' · ') || 'Paket utama';
        },
        pasang: function (x) {
          if (A && x.a !== null) A.sumbu.pasang(x.a);
          if (B && x.b !== null) B.sumbu.pasang(x.b);
        }
      },
      hasil: paket.map(function (x) {
        const d = Object.assign({}, dasar);
        if (A && x.a !== null) d[A.sumbu.kunci] = x.a;
        if (B && x.b !== null) d[B.sumbu.kunci] = x.b;
        const h = P.hitungSendiri ? P.hitungSendiri(d) : null;
        return { nilai: x, dasar: d, hasil: h,
          tersedia: !!(h && h.tersedia), alasan: h ? h.alasan : 'Perhitungan gagal.' };
      })
    };
    gambar();
    window.bukaLayar('BANDING_PRODUK');
  }

  function jalankan(kode) {
    const P = PRODUK[kode];
    if (P.dwiSumbu) { jalankanDwi(kode); return; }
    const pesan = document.querySelector('[data-banding-pesan="' + kode + '"]');
    const iSumbu = +(el('bandingSumbu_' + kode) ? el('bandingSumbu_' + kode).value : 0);
    const sumbu = P.sumbu[iSumbu];
    const dasar = P.dasar();

    if (!P.siap(dasar)) {
      if (pesan) pesan.textContent = P.pesanSiap;
      return;
    }
    const maks = P.maks || MAKS;
    const nilai = nilaiTerpilih(kode, sumbu);
    if (nilai.length < 2) {
      if (pesan) pesan.textContent = 'Pilih minimal dua nilai untuk dibandingkan.';
      return;
    }

    aktif = {
      produk: kode, sumbu: sumbu,
      namaNasabah: dasar.nama || 'Nasabah',
      /* Tiap produk menyimpan tanggal lahir dengan nama medan berbeda:
         sebagian memakai tglLahir berupa Date, RIZQIA memakai tgl berupa
         teks. Keduanya diterima supaya usia nasabah selalu muncul di kop. */
      usia: (function () {
        if (dasar.usia != null) return dasar.usia;
        if (typeof usiaGenerali !== 'function') return null;
        if (dasar.tglLahir) return usiaGenerali(dasar.tglLahir);
        if (dasar.tgl) {
          try { return usiaGenerali(new Date(dasar.tgl + 'T00:00:00Z')); } catch (_) {}
        }
        return null;
      })(),
      hasil: nilai.slice(0, maks).map(v => hitungSkenario(kode, sumbu, v))
    };
    gambar();
    window.bukaLayar('BANDING_PRODUK');
  }

  /* ---------- Mulai ---------- */

  function segarkanSemua() {
    Object.keys(PRODUK).forEach(pasangPemilih);
  }

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    // Layar banding kembali ke layar produk asalnya.
    pasang();
    segarkanSemua();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__bandingProdukHook) {
      const asli = window.bukaLayar;
      const bungkus = function (nama) {
        if (nama === 'BANDING_PRODUK' && aktif) {
          const nav = window.InsuranceHubNavigation;
          if (nav && nav.LAYAR.BANDING_PRODUK) nav.LAYAR.BANDING_PRODUK.kiri = PRODUK[aktif.produk].layar;
        }
        const hasil = asli.apply(this, arguments);
        setTimeout(segarkanSemua, 20);
        return hasil;
      };
      bungkus.__bandingProdukHook = true;
      ['__naHook', '__rzHook', '__promptHook', '__umumHook', '__ghpBandingHook']
        .forEach(k => { bungkus[k] = asli[k]; });
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
  }

  window.InsuranceHubBandingProduk = { PRODUK, hitungSkenario, MAKS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 40);
  }
})();
