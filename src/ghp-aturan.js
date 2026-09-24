/* ============================================================
   Aturan Bersama Rider GHP
   ------------------------------------------------------------
   Dipakai oleh semua produk dasar yang bisa menempelkan rider
   GEN HealthCare Protection: GHP GenPro, Gen Aman (GSPA), dan
   BeSMART Lite.

   Isinya tiga hal yang sebelumnya tersebar atau belum ada:

   1. Aturan dari memo 027/GNR-AGC/07/2026
      - Usia masuk 66-70 tahun hanya boleh Gold Standard,
        Gold Deluxe, Diamond Superior, dan Diamond Deluxe.
      - Minimum uang pertanggungan produk dasar: Rp50 juta untuk
        keempat plan itu, Rp100 juta untuk Platinum Deluxe dan
        Titanium.

   2. Tabel seluruh plan berisi premi per bulan dan per tahun.

   3. Banding plan berdampingan, maksimal tiga plan, lengkap
      dengan tombol cetak.

   Tarifnya tetap milik DATA_GHPS. Tidak ada tarif yang ditulis
   ulang di sini.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => (n === null || n === undefined) ? '—'
    : 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  const MAKS_BANDING = 3;

  /* Plan yang masih boleh diambil pada usia masuk 66 sampai 70 tahun. */
  const PLAN_66_70 = ['Gold Standard', 'Gold Deluxe', 'Diamond Superior', 'Diamond Deluxe'];

  /* Minimum uang pertanggungan produk dasar menurut plan. */
  const UP_MIN_PLAN = {
    'Gold Standard': 50000000, 'Gold Deluxe': 50000000,
    'Diamond Superior': 50000000, 'Diamond Deluxe': 50000000,
    'Platinum Deluxe': 100000000, 'Titanium': 100000000
  };

  function data() { return (typeof DATA_GHPS !== 'undefined') ? DATA_GHPS : null; }

  function semuaPlan() {
    const D = data();
    return D && D.urutan ? D.urutan.slice() : [];
  }

  /* Plan yang boleh ditawarkan pada usia tertentu: mengikuti batas memo dan
     ketersediaan tarif di tabel. */
  /* Batas usia 66-70 hanya berlaku untuk rider GHP pada BeSMART Lite,
     sesuai memo 027/GNR-AGC/07/2026. Produk dasar lain tidak dibatasi, jadi
     pembatasan ini harus diminta secara tegas lewat parameter kedua. */
  function planTersedia(usia, pakaiBatas66) {
    const D = data();
    if (!D) return [];
    const baris = D.tarif[String(usia)];
    if (!baris) return [];
    let daftar = D.urutan.filter(p => baris[p]);
    if (pakaiBatas66 && usia >= 66 && usia <= 70) {
      daftar = daftar.filter(p => PLAN_66_70.indexOf(p) !== -1);
    }
    return daftar;
  }

  function alasanPlanDibatasi(usia, pakaiBatas66) {
    if (pakaiBatas66 && usia >= 66 && usia <= 70) {
      return 'Usia masuk ' + usia + ' tahun hanya boleh mengambil Gold Standard, Gold Deluxe, ' +
        'Diamond Superior, dan Diamond Deluxe.';
    }
    return '';
  }

  function upMinimum(plan) { return UP_MIN_PLAN[plan] || 50000000; }

  /* Nilai di tabel adalah premi BULANAN. Premi tahunan sebelas kali premi
     bulanan, mengikuti ghpsHitung di Gen Aman dan mesin GHP GenPro.
     Sebelumnya di sini nilainya dikira tahunan lalu dibagi dua belas,
     sehingga premi yang ditampilkan meleset jauh. */
  const PENGALI_TAHUNAN = 11;

  function premiBulanan(usia, plan) {
    const D = data();
    if (!D) return null;
    const baris = D.tarif[String(usia)];
    if (!baris || !baris[plan]) return null;
    return baris[plan];
  }

  function premiTahunan(usia, plan) {
    const b = premiBulanan(usia, plan);
    return b === null ? null : b * PENGALI_TAHUNAN;
  }

  /* Batas usia masuk rider berbeda menurut masa bayar produk dasarnya. */
  function batasUsiaMasuk(mpp) {
    const D = data();
    if (!D || !D.batasUsia) return null;
    const b = D.batasUsia[String(mpp)];
    return (b === undefined) ? null : b;
  }

  function bolehPadaMpp(usia, mpp) {
    const b = batasUsiaMasuk(mpp);
    return b === null ? true : usia <= b;
  }

  function manfaatPlan(plan) {
    const G = (typeof DATA_GHP !== 'undefined') ? DATA_GHP : null;
    return (G && G.plan && G.plan[plan]) ? G.plan[plan] : null;
  }

  /* ---------- Tabel seluruh plan ---------- */

  function tabelSemuaPlan(usia, planTerpilih, pakaiBatas66) {
    if (usia === null || usia === undefined) {
      return '<p class="catatan">Isi tanggal lahir untuk melihat premi seluruh plan.</p>';
    }
    const daftar = planTersedia(usia, pakaiBatas66);
    if (!daftar.length) {
      return '<p class="catatan akt-peringatan">Tidak ada plan GHP yang tersedia untuk usia ' +
        usia + ' tahun.</p>';
    }
    const batas = alasanPlanDibatasi(usia, pakaiBatas66);
    return '<table class="akt-tabel"><thead><tr>' +
      '<th>Plan</th><th>Wilayah</th><th>Kamar</th>' +
      '<th class="ka">Limit tahunan</th>' +
      '<th class="ka">Premi / bulan</th><th class="ka">Premi / tahun</th>' +
      '</tr></thead><tbody>' +
      daftar.map(function (p) {
        const m = manfaatPlan(p);
        const pilih = (p === planTerpilih) ? ' class="tandai"' : '';
        return '<tr' + pilih + '>' +
          '<td><b>' + esc(p) + '</b></td>' +
          '<td>' + esc(m ? m.wilayah : '—') + '</td>' +
          '<td>' + esc(m ? m.kamar : '—') + '</td>' +
          '<td class="ka">' + (m ? rp(m.limit) : '—') + '</td>' +
          '<td class="ka">' + rp(premiBulanan(usia, p)) + '</td>' +
          '<td class="ka">' + rp(premiTahunan(usia, p)) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>' +
      '<p class="catatan">Premi di atas untuk usia masuk ' + usia + ' tahun, di luar premi ' +
      'produk dasar. Minimum uang pertanggungan produk dasar: Rp50.000.000 untuk Gold dan ' +
      'Diamond, Rp100.000.000 untuk Platinum Deluxe dan Titanium.' +
      (batas ? ' ' + esc(batas) : '') + '</p>';
  }

  /* ---------- Pemilih banding ---------- */

  function pemilihBanding(idWadah, kodeSumber, usia, pakaiBatas66) {
    const wadah = el(idWadah);
    if (!wadah) return;
    const daftar = planTersedia(usia, pakaiBatas66);
    if (!daftar.length) {
      wadah.innerHTML = '<p class="catatan">Isi tanggal lahir dulu untuk membandingkan plan.</p>';
      return;
    }
    wadah.innerHTML =
      '<h3>Bandingkan plan GHP</h3>' +
      '<p class="catatan">Pilih sampai ' + MAKS_BANDING + ' plan untuk dilihat berdampingan, ' +
      'lalu bisa dicetak untuk dikirim ke nasabah.</p>' +
      '<div class="akt-tab" data-ghp-nilai="' + esc(kodeSumber) + '">' +
      daftar.map(p => '<button type="button" data-nilai="' + esc(p) + '" aria-pressed="false">' +
        esc(p) + '</button>').join('') +
      '</div>' +
      '<button class="aksi" type="button" data-ghp-jalan="' + esc(kodeSumber) + '" ' +
      'style="margin-top:9px">Bandingkan plan terpilih</button>' +
      '<p class="catatan" data-ghp-pesan="' + esc(kodeSumber) + '"></p>';
  }

  function terpilih(kodeSumber) {
    const bar = document.querySelector('[data-ghp-nilai="' + kodeSumber + '"]');
    if (!bar) return [];
    return Array.prototype.slice.call(bar.querySelectorAll('button'))
      .filter(b => b.getAttribute('aria-pressed') === 'true')
      .map(b => b.dataset.nilai);
  }

  /* ---------- Layar banding ---------- */

  let aktif = null;

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.GHP_PLAN_BANDING = {
      el: 'layarGhpPlanBanding', judul: 'Banding Plan GHP',
      sub: 'Bandingkan manfaat dan premi antar plan', kiri: 'PRODUK'
    };
    return true;
  }

  function gambar() {
    const w = el('layarGhpPlanBanding');
    if (!w) return;
    if (!aktif) {
      w.innerHTML = '<div class="blok"><p class="catatan">Pilih plan yang ingin dibandingkan ' +
        'di layar produk.</p></div>';
      return;
    }
    const { usia, plan, nama, asal } = aktif;

    const k = aktif.k || {};
    const bulanan = (k.metode || 'Bulanan') !== 'Tahunan';
    const satuan = bulanan ? 'per bulan' : 'per tahun';
    const dasarPremi = bulanan ? (k.premiDasarBulanan || 0) : (k.premiDasarTahunan || 0);
    const waiverPremi = k.waiver ? (bulanan ? (k.premiWaiverBulanan || 0) : (k.premiWaiverTahunan || 0)) : 0;
    const bslTanpaWaiver = asal === 'BeSMART Lite';
    const konteksBanding = bslTanpaWaiver
      ? 'uang pertanggungan dasar sama di semua kolom.'
      : 'uang pertanggungan dasar dan waiver sama di semua kolom.';

    w.innerHTML =
      '<div class="kop"><h2>Banding Plan GHP</h2>' +
      '<p>Untuk ' + esc(nama || 'nasabah') + ', usia masuk ' + usia + ' tahun, pada ' +
      esc(asal) + '. Yang berbeda antar kolom hanya plan GHP-nya; ' + konteksBanding + '</p></div>' +

      '<div class="banding-gulir"><div class="banding-baris">' +
      plan.map(function (p) {
        const m = manfaatPlan(p);
        const riderPremi = bulanan ? premiBulanan(usia, p) : premiTahunan(usia, p);
        const total = dasarPremi + waiverPremi + (riderPremi || 0);
        const upKurang = k.upDasar && k.upDasar < upMinimum(p);
        return '<div class="banding-kolom">' +
          '<div class="banding-judul">' + esc(p) + '</div>' +
          '<table class="akt-tabel banding-tabel"><tbody>' +
          brs('UP dasar dipilih', k.upDasar ? rp(k.upDasar) : '—') +
          (bslTanpaWaiver ? '' : brs('Waiver', k.waiver ? 'Diambil' : 'Tidak diambil')) +
          brs('Wilayah', esc(m ? m.wilayah : '—')) +
          brs('Kamar', esc(m ? m.kamar : '—')) +
          brs('Limit tahunan', m ? rp(m.limit) : '—') +
          brs('Limit booster', m ? rp(m.booster) : '—') +
          '</tbody></table>' +
          '<table class="akt-tabel banding-tabel"><tbody>' +
          brs('Premi UP dasar', rp(dasarPremi)) +
          (k.waiver ? brs('Premi waiver', rp(waiverPremi)) : '') +
          brs('Premi plan GHP', rp(riderPremi)) +
          '</tbody></table>' +
          (upKurang ? '<p class="catatan akt-peringatan">UP dasar yang dipilih di bawah ' +
            'minimum plan ini.</p>' : '') +
          '<div class="banding-premi"><span>Total premi ' + satuan + '</span>' +
          '<b>' + rp(total) + '</b></div>' +
          '</div>';
      }).join('') +
      '</div></div>' +

      '<p class="catatan" style="margin-top:10px">' +
      (alasanPlanDibatasi(usia, aktif.batas66) || 'Seluruh plan di atas tersedia untuk usia masuk ini.') +
      ' Premi rider dibayar selama masa pertanggungan dan menyesuaikan usia tertanggung ' +
      'pada tahun berjalan.</p>' +

      '<div class="akt-aksi tanpa-cetak" style="margin-top:12px">' +
      '<button class="aksi" id="ghpBandingCetak" type="button">Cetak / simpan PDF</button>' +
      '</div>';

    /* Jika asalnya Gen Aman, rincian jiwa + booster + waiver harus tetap
       terlihat pada halaman banding plan GHP, bukan hanya sisi GHP. */
    if (aktif && aktif.asal === 'Gen Aman') {
      const dasar = rincianDasarGspa(aktif.k);
      if (dasar) {
        const holder = document.createElement('div');
        holder.innerHTML = dasar;
        const root = holder.firstElementChild;
        const target = w.querySelector('.banding-gulir');
        if (root && target) target.parentNode.insertBefore(root, target);
      }
    }
  }

  function brs(k, v) { return '<tr><td>' + k + '</td><td><b>' + v + '</b></td></tr>'; }

  /* ---------- Lampiran penjelasan ----------
     Versi single sudah memuat NCB, NCD, dan masa tunggu. Halaman banding
     harus selengkap itu juga, jadi bagian yang sama disusun ulang di sini
     memakai sumber yang sama: booster tiap plan dan tabel NCD dari mesin. */

  /* Satu tabel untuk semua plan yang dibandingkan. Persentase kenaikannya
     sama di semua plan, yang berbeda hanya nilai limit boosternya, jadi
     keterangan tidak perlu diulang per plan. */
  function tabelNcb(planTerpilih) {
    const G = window.InsuranceHubGHP;
    const daftar = Array.isArray(planTerpilih) ? planTerpilih : [planTerpilih];
    const sah = daftar.filter(function (p) { return manfaatPlan(p); });
    if (!G || !G.ncb || !sah.length) return '';

    const acuan = G.ncb(manfaatPlan(sah[0]).booster);
    return '<h3>NCB \u2014 kenaikan limit booster tanpa klaim</h3>' +
      '<table class="akt-tabel"><thead><tr>' +
      '<th>Tahun polis tanpa klaim</th><th class="ka">Kenaikan</th>' +
      sah.map(function (p) { return '<th class="ka">' + esc(p) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      acuan.map(function (b, i) {
        const tandai = (i === acuan.length - 1) ? ' class="tandai"' : '';
        return '<tr' + tandai + '>' +
          '<td>' + (b.tahun === 0 ? 'Dasar' : 'Tahun ' + b.tahun) + '</td>' +
          '<td class="ka">' + Math.round(b.kenaikan * 100) + '%</td>' +
          sah.map(function (p) {
            const baris = G.ncb(manfaatPlan(p).booster)[i];
            return '<td class="ka">' + rp(baris.nilai) + '</td>';
          }).join('') +
          '</tr>';
      }).join('') + '</tbody></table>';
  }

  function tabelNcd() {
    const G = window.InsuranceHubGHP;
    if (!G || !G.NCD) return '';
    return '<h3>NCD \u2014 diskon premi tahun berikutnya</h3>' +
      '<table class="akt-tabel"><thead><tr>' +
      '<th>Tanpa klaim berturut-turut</th><th class="ka">Diskon</th></tr></thead><tbody>' +
      G.NCD.map(function (d) {
        return '<tr><td>' + esc(d.lama) + '</td><td class="ka">' +
          Math.round(d.diskon * 100) + '%</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="catatan">Syarat NCB: tidak ada klaim pada tahun polis berjalan dan total klaim ' +
      'selama polis aktif tidak melebihi 10% limit tahunan. Kenaikan 10% dari limit booster dasar ' +
      'setiap ulang tahun polis, maksimal 5 kali atau 50%. Kalau terjadi klaim pada tahun berjalan, ' +
      'diskon tahun berikutnya tidak berlaku dan hitungan tanpa klaim mulai dari awal lagi.</p>';
  }

  function tabelMasaTunggu() {
    return '<h3>Masa tunggu</h3>' +
      '<table class="akt-tabel"><thead><tr><th>Jenis risiko</th><th>Masa tunggu</th></tr></thead><tbody>' +
      '<tr><td>Perawatan rumah sakit karena kecelakaan</td><td>Tidak ada masa tunggu</td></tr>' +
      '<tr><td>Sakit akut seperti DBD, tipes, usus buntu, infeksi virus</td><td>30 hari</td></tr>' +
      '<tr><td>Sakit kronis seperti kanker, jantung, stroke, darah tinggi, diabetes, ' +
      'sinus, polip, amandel, TBC</td><td>12 bulan</td></tr>' +
      '<tr class="tandai"><td>Contestable period</td>' +
      '<td>24 bulan \u2014 sebelum lewat, klaim dapat diarahkan ke reimbursement</td></tr>' +
      '</tbody></table>';
  }

  /* ------------------------------------------------------------
     Rincian produk dasar saat yang dibandingkan hanya PLAN GHP.
     Khusus Gen Aman, plan GHP adalah sumbu pembanding; manfaat jiwa,
     booster 7,5%, dan waiver tetap merujuk pada ilustrasi Gen Aman
     utama dan ditampilkan SATU KALI di luar kolom plan.
     ------------------------------------------------------------ */
  function rincianDasarGspa(k) {
    if (!k || k.asal !== 'Gen Aman') return '';
    try {
      if (typeof InsuranceHubEngine === 'undefined' || typeof DATA_GSPA === 'undefined') return '';
      const tgl = el('gTgl') ? el('gTgl').value : '';
      if (!tgl) return '';
      const inp = {
        nama: el('gNama') ? el('gNama').value : (k.nama || ''),
        jk: typeof nilaiSegmen === 'function' ? nilaiSegmen('gJK') : '',
        tglLahir: new Date(tgl + 'T00:00:00Z'),
        mpp: +(k.mpp || (typeof nilaiSegmen === 'function' ? nilaiSegmen('gMpp') : 5)),
        metode: k.metode || (typeof nilaiSegmen === 'function' ? nilaiSegmen('gMetode') : 'Bulanan'),
        mode: typeof nilaiSegmen === 'function' ? nilaiSegmen('gMode') : 'By UP',
        upDasar: Number(k.upDasar || 0),
        premiNet: typeof bAngka === 'function' && el('gPremiNet') ? bAngka(el('gPremiNet').value) : 0,
        modeWakaf: typeof nilaiSegmen === 'function' && nilaiSegmen('gWakaf') === 'Wakaf' ? 'Wakaf' : 'Non Wakaf',
        nilaiWakaf: typeof bAngka === 'function' && el('gNilaiWakaf') ? bAngka(el('gNilaiWakaf').value) : 0,
        persenWakaf: el('gPersenWakaf') ? +(el('gPersenWakaf').value || 0) : 0
      };
      const r = InsuranceHubEngine.calculate('GSPA', inp, { rates: DATA_GSPA });
      if (!r || !r.tersedia) return '';

      let html = '<div class="gspa-dasar-banding">' +
        '<h2>Ringkasan Gen Aman</h2>' +
        '<p class="catatan">Manfaat jiwa Gen Aman dan waiver di bawah ini <b>tetap sama pada semua kolom</b>. Yang dibandingkan hanya plan GHP.</p>' +
        '<table class="akt-tabel"><thead><tr><th>Manfaat Gen Aman</th><th class="ka">Nilai</th><th>Dasar</th></tr></thead><tbody>' +
        '<tr><td>Meninggal dunia karena sebab apa pun</td><td class="ka">' + rp(r.santunanNet) + '</td><td>UP Dasar</td></tr>' +
        '<tr class="tandai"><td>Booster Gen Aman</td><td class="ka">+' + rp(r.kenaikanPer5Tahun) + ' / 5 tahun</td><td>7,5% UP Dasar setiap 5 tahun</td></tr>' +
        '<tr><td>Potensi santunan di usia 100</td><td class="ka">' + rp(r.santunanUsia100) + '</td><td>Booster maksimal 150% dari UP Dasar</td></tr>' +
        '<tr><td>Meninggal karena kecelakaan transportasi umum</td><td class="ka">' + rp(r.tambahanTransportasi) + '</td><td>Tambahan manfaat Gen Aman</td></tr>' +
        '<tr><td>Meninggal di luar wilayah Indonesia</td><td class="ka">' + rp(r.tambahanLuarNegeri) + '</td><td>Tambahan manfaat Gen Aman</td></tr>' +
        '<tr><td>Meninggal saat haji / umrah</td><td class="ka">' + rp(r.tambahanHaji) + '</td><td>Tambahan manfaat Gen Aman</td></tr>' +
        '</tbody></table>';

      if (r.timeline && r.timeline.length) {
        const penting = r.timeline.filter(function (b) {
          return b.tahun <= inp.mpp + 1 || b.tahun % 5 === 0 || b.tahun === r.timeline.length;
        });
        html += '<h3>Perkembangan Booster Gen Aman</h3>' +
          '<table class="akt-tabel"><thead><tr><th>Thn</th><th>Usia</th><th class="ka">Santunan dasar</th><th class="ka">Booster</th><th class="ka">Santunan berjalan</th></tr></thead><tbody>' +
          penting.map(function (b) {
            return '<tr' + (b.akhirMasa ? ' class="tandai"' : '') + '><td>' + b.tahun + '</td><td>' + b.usia + '</td>' +
              '<td class="ka">' + rp(b.santunan) + '</td>' +
              '<td class="ka">' + (b.booster ? rp(b.booster) + ' (' + (b.boosterPersen * 100).toLocaleString('id-ID', {maximumFractionDigits:1}) + '%)' : '—') + '</td>' +
              '<td class="ka">' + rp(b.santunan + b.booster) + '</td></tr>';
          }).join('') + '</tbody></table>';
      }

      if (k.waiver) {
        const w = (typeof waiverHitung === 'function')
          ? waiverHitung(r.usia, inp.mpp, inp.jk, r.upDasar, r.diskon) : null;
        if (w && w.sah) {
          const satuan = inp.metode === 'Bulanan' ? 'per bulan' : 'per tahun';
          const waiverSetoran = inp.metode === 'Bulanan' ? w.bulanan : w.tahunan;
          const total = (inp.metode === 'Bulanan' ? w.bulanan * 12 : w.tahunan) * inp.mpp;
          html += '<h3>Waiver Gen Aman — merujuk ilustrasi utama</h3>' +
            '<table class="akt-tabel"><thead><tr><th>Keterangan</th><th class="ka">Nilai</th></tr></thead><tbody>' +
            '<tr><td>Tarif waiver per Rp100 juta UP Dasar</td><td class="ka">' + rp(w.tarif) + '</td></tr>' +
            '<tr><td>Premi waiver sebelum diskon</td><td class="ka">' + rp(w.sebelumDiskon) + ' /bulan</td></tr>' +
            '<tr><td>Diskon mengikuti tier UP Dasar</td><td class="ka">' + Math.round(w.diskon * 100) + '%</td></tr>' +
            '<tr class="bayar"><td>Premi waiver ' + satuan + '</td><td class="ka">' + rp(waiverSetoran) + '</td></tr>' +
            '<tr><td>Total waiver selama ' + inp.mpp + ' tahun masa bayar</td><td class="ka">' + rp(total) + '</td></tr>' +
            '<tr class="tandai"><td>Kontribusi santunan dasar yang dibebaskan bila klaim terjadi di awal</td><td class="ka">' + rp(inp.metode === 'Bulanan' ? r.totalBulanan : r.totalTahunan) + '</td></tr>' +
            '</tbody></table>' +
            '<p class="catatan">Waiver membebaskan kontribusi santunan dasar bila peserta terdiagnosa salah satu dari 66 penyakit kritis sesuai ketentuan polis. Premi rider GHP tetap menjadi komponen terpisah dan tidak ikut dibebaskan.</p>';
        }
      }
      return html + '</div>';
    } catch (_) { return ''; }
  }

  function lampiranDetail(planTerpilih, konteks) {
    return '<div class="lampiran-banding">' +
      rincianDasarGspa(konteks) +
      '<h2>Penjelasan Manfaat GHP</h2>' +
      tabelNcb(planTerpilih) +
      tabelNcd() +
      tabelMasaTunggu() +
      '<p class="catatan">Premi kesehatan dibayar selama polis aktif, maksimal sampai usia ' +
      '90 tahun. Premi dapat meningkat sesuai pertambahan usia. Ilustrasi ini dihitung dari ' +
      'tarif yang berlaku saat ini untuk membantu penjelasan produk kepada calon nasabah. ' +
      'Bukan bagian dari polis dan tidak mengikat secara hukum. Nilai final tunduk pada ' +
      'Ketentuan Polis resmi PT Asuransi Jiwa Generali Indonesia dan hasil underwriting.</p>' +
      '</div>';
  }

  /* konteks berisi seluruh isian paket: usia, nama, produk dasar, UP dasar,
     masa bayar, cara bayar, waiver, dan premi produk dasarnya. */
  function buka(kodeSumber, konteks) {
    const plan = terpilih(kodeSumber);
    const pesan = document.querySelector('[data-ghp-pesan="' + kodeSumber + '"]');
    if (plan.length < 2) {
      if (pesan) pesan.textContent = 'Pilih minimal dua plan untuk dibandingkan.';
      return;
    }
    aktif = {
      usia: konteks.usia, nama: konteks.nama, asal: konteks.asal,
      batas66: !!konteks.batas66, k: konteks,
      plan: plan.slice(0, MAKS_BANDING)
    };
    const nav = window.InsuranceHubNavigation;
    if (nav && nav.LAYAR.GHP_PLAN_BANDING) {
      nav.LAYAR.GHP_PLAN_BANDING.kiri = konteks.layarAsal || 'PRODUK';
    }
    gambar();
    window.bukaLayar('GHP_PLAN_BANDING');
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const bar = t.closest('[data-ghp-nilai]');
      if (bar) {
        const b = t.closest('button');
        if (!b) return;
        const kode = bar.dataset.ghpNilai;
        const nyala = b.getAttribute('aria-pressed') === 'true';
        const jml = bar.querySelectorAll('button[aria-pressed="true"]').length;
        const pesan = document.querySelector('[data-ghp-pesan="' + kode + '"]');
        if (!nyala && jml >= MAKS_BANDING) {
          if (pesan) pesan.textContent = 'Paling banyak ' + MAKS_BANDING + ' plan sekaligus.';
          return;
        }
        b.setAttribute('aria-pressed', String(!nyala));
        if (pesan) pesan.textContent = (jml + (nyala ? -1 : 1)) + ' plan ditandai.';
        return;
      }

      if (t.closest('#ghpBandingCetak')) {
        const asli = document.title;
        document.title = 'Banding Plan GHP - ' + ((aktif && aktif.nama) || 'Nasabah');
        window.print();
        setTimeout(() => { document.title = asli; }, 1000);
        return;
      }
    });
  }

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    pasang();
  }

  window.InsuranceHubGhpAturan = {
    PLAN_66_70, UP_MIN_PLAN, MAKS_BANDING, PENGALI_TAHUNAN,
    semuaPlan, planTersedia, alasanPlanDibatasi, upMinimum,
    premiTahunan, premiBulanan, batasUsiaMasuk, bolehPadaMpp, manfaatPlan,
    tabelSemuaPlan, pemilihBanding, buka,
    lampiranDetail, tabelNcb, tabelNcd, tabelMasaTunggu
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
