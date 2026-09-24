/* ============================================================
   GEN Wealth
   ------------------------------------------------------------
   Asuransi jiwa dwiguna: premi kembali di akhir masa
   pertanggungan dengan persentase yang ditentukan kombinasi
   masa bayar dan masa pertanggungan.

   Produk ini tidak memakai tabel tarif per usia. Yang dihitung
   justru kebalikannya:

     Uang pertanggungan = total premi x persentase pengembalian

   Diperiksa terhadap contoh resmi: premi Rp4 miliar per tahun,
   bayar 2 tahun, pertanggungan 7 tahun, pengembalian 125%,
   menghasilkan uang pertanggungan Rp10 miliar.

   Manfaat meninggal dunia karena sebab apa pun:
     - selama masa pembayaran premi : 100% premi yang sudah dibayar
     - setelah masa pembayaran premi: 100% uang pertanggungan
   Tambahan bila meninggal karena kecelakaan:
     100% uang pertanggungan dikurangi premi yang sudah dibayar,
     dibatasi Rp2 miliar atau USD 153.846.

   Sumber: brosur GEN Wealth Ver.02/Sep/2025 dan tabel premi
   yang dipakai agensi.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (t) => String(t === null || t === undefined ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- Aturan produk ---------- */

  // Persentase pengembalian: [masa bayar]-[masa pertanggungan]
  const PENGEMBALIAN = {
    IDR: { '2-7': 1.25, '2-9': 1.35, '2-11': 1.47, '3-9': 1.30, '3-11': 1.40, '5-11': 1.35 },
    USD: { '2-7': 1.10, '2-9': 1.175, '2-11': 1.225, '3-9': 1.09, '3-11': 1.175, '5-11': 1.125 }
  };

  const MASA_BAYAR = [2, 3, 5];
  const MASA_LINDUNG = [7, 9, 11];

  // Premi minimum per tahun menurut masa bayar.
  const PREMI_MIN = {
    IDR: { 2: 50000000, 3: 30000000, 5: 30000000 },
    USD: { 2: 5000, 3: 3000, 5: 3000 }
  };

  // Batas tambahan manfaat kecelakaan.
  const BATAS_KECELAKAAN = { IDR: 2000000000, USD: 153846 };

  const USIA_MASUK_MIN = 0;    // 31 hari, dibulatkan menjadi usia 0
  const USIA_MASUK_MAKS = 70;

  /* Bila tertanggung meninggal bukan karena kecelakaan sebelum berusia
     4 tahun, manfaatnya dikalikan faktor berikut. */
  const FAKTOR_BALITA = [
    { sampaiUsia: 1, faktor: 0.2 },
    { sampaiUsia: 2, faktor: 0.4 },
    { sampaiUsia: 3, faktor: 0.6 },
    { sampaiUsia: 4, faktor: 0.8 }
  ];

  const PEMBAGI_FREKUENSI = { Tahunan: 1, Semesteran: 2, Kuartalan: 4, Bulanan: 12 };

  function mata() { return el('gwMata') ? el('gwMata').value : 'IDR'; }

  function uang(n, kode) {
    const m = kode || mata();
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (m === 'USD') {
      return 'USD ' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    return 'Rp' + Math.round(n).toLocaleString('id-ID');
  }

  function kunci(bayar, lindung) { return bayar + '-' + lindung; }

  /* Selama selisih uang pertanggungan dengan total premi tidak melebihi batas
     manfaat kecelakaan, pengajuan masuk jalur GIO. Dari situ bisa dihitung
     mundur berapa premi per tahun terbesar yang masih GIO:

       UP - total premi = total premi x (pengembalian - 1) <= batas
       total premi <= batas / (pengembalian - 1)
       premi per tahun <= total premi / masa bayar             */
  function batasGio(m, bayar, lindung) {
    const rop = pengembalian(m, bayar, lindung);
    if (rop === null || rop <= 1) return null;
    const batas = BATAS_KECELAKAAN[m];
    const totalMaks = batas / (rop - 1);
    return {
      premiTahunanMaks: totalMaks / bayar,
      totalPremiMaks: totalMaks,
      upMaks: totalMaks * rop,
      rop: rop
    };
  }

  function pengembalian(m, bayar, lindung) {
    const t = PENGEMBALIAN[m] || PENGEMBALIAN.IDR;
    const v = t[kunci(bayar, lindung)];
    return v === undefined ? null : v;
  }

  function kombinasiTersedia(m) {
    const t = PENGEMBALIAN[m] || PENGEMBALIAN.IDR;
    return Object.keys(t);
  }

  /* ---------- Perhitungan ---------- */

  function hitung(inp) {
    const m = inp.mata === 'USD' ? 'USD' : 'IDR';
    const out = { mata: m, tersedia: false, alasan: null };

    const rop = pengembalian(m, inp.bayar, inp.lindung);
    if (rop === null) {
      out.alasan = 'Masa bayar ' + inp.bayar + ' tahun dengan masa pertanggungan ' +
        inp.lindung + ' tahun tidak tersedia pada produk ini.';
      return out;
    }
    if (inp.usia === null || inp.usia === undefined) {
      out.alasan = 'Isi tanggal lahir tertanggung.';
      return out;
    }
    if (inp.usia < USIA_MASUK_MIN || inp.usia > USIA_MASUK_MAKS) {
      out.alasan = 'Usia masuk tertanggung ' + inp.usia + ' tahun di luar batas ' +
        USIA_MASUK_MIN + ' sampai ' + USIA_MASUK_MAKS + ' tahun.';
      return out;
    }
    const premiTahunan = Number(inp.premiTahunan) || 0;
    const minimum = PREMI_MIN[m][inp.bayar];
    if (premiTahunan < minimum) {
      out.alasan = 'Premi per tahun untuk masa bayar ' + inp.bayar + ' tahun paling kecil ' +
        uang(minimum, m) + '.';
      return out;
    }

    out.tersedia = true;
    out.rop = rop;
    out.premiTahunan = premiTahunan;
    out.bayar = inp.bayar;
    out.lindung = inp.lindung;
    out.usia = inp.usia;

    /* Cara bayar selain tahunan hanyalah pembagian premi tahunan, tanpa
       potongan maupun tambahan. */
    const pembagi = PEMBAGI_FREKUENSI[inp.frekuensi] || 1;
    out.frekuensi = inp.frekuensi || 'Tahunan';
    out.pembagi = pembagi;
    out.premiPerSetoran = premiTahunan / pembagi;

    out.totalPremi = premiTahunan * inp.bayar;
    out.up = out.totalPremi * rop;
    out.manfaatAkhir = out.up;
    out.batasKecelakaan = BATAS_KECELAKAAN[m];

    /* Metode underwriting mengikuti selisih antara uang pertanggungan dan
       total premi — inilah nilai yang benar-benar ditanggung penanggung.
       Selama selisih itu tidak melebihi batas manfaat kecelakaan, pengajuan
       masuk jalur GIO; di atas itu wajib full underwriting. Aturan ini
       disalin dari rumus di tabel premi yang dipakai agensi. */
    out.nilaiDitanggung = out.up - out.totalPremi;
    out.gio = out.nilaiDitanggung <= out.batasKecelakaan;
    out.validasi = out.gio ? 'GIO' : 'FULL UW';

    out.timeline = [];
    let dibayar = 0;
    for (let th = 1; th <= inp.lindung; th++) {
      const usiaTh = inp.usia + th - 1;
      const bayarTahunIni = th <= inp.bayar ? premiTahunan : 0;
      dibayar += bayarTahunIni;

      // Selama masa bayar manfaatnya sebesar premi yang sudah masuk,
      // setelah itu sebesar uang pertanggungan.
      let sebabApaPun = th <= inp.bayar ? dibayar : out.up;

      const faktor = faktorBalita(usiaTh);
      const sebabApaPunNet = sebabApaPun * faktor;

      const tambahanKecelakaan = Math.max(0,
        Math.min(out.up - dibayar, out.batasKecelakaan));

      out.timeline.push({
        tahun: th,
        usia: usiaTh,
        premiTahunIni: bayarTahunIni,
        totalDibayar: dibayar,
        sebabApaPun: sebabApaPunNet,
        faktorBalita: faktor,
        tambahanKecelakaan: tambahanKecelakaan,
        totalKecelakaan: sebabApaPunNet + tambahanKecelakaan,
        manfaatAkhir: th === inp.lindung ? out.up : null
      });
    }
    return out;
  }

  function faktorBalita(usia) {
    if (usia >= 4) return 1;
    const f = FAKTOR_BALITA.find(function (x) { return usia < x.sampaiUsia; });
    return f ? f.faktor : 1;
  }

  /* ---------- Layar ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.GENWEALTH = {
      el: 'layarGenWealth', judul: 'GEN Wealth',
      sub: 'Premi kembali di akhir masa pertanggungan', kiri: 'PRODUK',
      kanan: { ke: 'GENWEALTH_RINGKAS', teks: 'Ringkasan' }
    };
    nav.LAYAR.GENWEALTH_DEPOSITO = {
      el: 'layarGenWealthDeposito', judul: 'Deposito vs GEN Wealth',
      sub: 'Nominal sama, lama menabung sama, lama mengendap sama', kiri: 'GENWEALTH'
    };
    nav.LAYAR.GENWEALTH_RINGKAS = {
      el: 'layarGenWealthRingkas', judul: 'Ringkasan GEN Wealth',
      sub: 'Siap dicetak untuk nasabah', kiri: 'GENWEALTH'
    };
    return true;
  }

  function kerangka() {
    const w = el('layarGenWealth');
    if (!w || w.dataset.siap) return;
    w.dataset.siap = '1';

    w.innerHTML =
      '<div class="kop"><h2>GEN Wealth</h2>' +
      '<p>Asuransi jiwa dwiguna. Premi dibayar sebentar, lalu kembali di akhir masa ' +
      'pertanggungan dengan persentase tertentu, sambil tetap memberi warisan bila ' +
      'terjadi risiko meninggal dunia.</p></div>' +

      '<div class="blok tanpa-cetak">' +
      '<h2>Data tertanggung</h2>' +
      '<div class="baris">' +
      '<div><label for="gwNama">Nama tertanggung</label>' +
      '<input id="gwNama" type="text" placeholder="Nama calon nasabah"></div>' +
      '<div><label for="gwTgl">Tanggal lahir</label><input id="gwTgl" type="date"></div>' +
      '</div>' +
      '<p class="catatan" id="gwInfoUsia">Usia masuk 31 hari sampai 70 tahun.</p>' +

      '<h2 style="margin-top:14px">Pilihan program</h2>' +
      '<div class="baris">' +
      '<div><label for="gwMata">Mata uang</label><select id="gwMata">' +
      '<option value="IDR">Rupiah</option><option value="USD">US Dolar</option>' +
      '</select></div>' +
      '<div><label for="gwFrek">Cara pembayaran premi</label><select id="gwFrek">' +
      Object.keys(PEMBAGI_FREKUENSI).map(function (f) {
        return '<option value="' + f + '">' + f + '</option>';
      }).join('') +
      '</select></div>' +
      '</div>' +

      '<div class="baris">' +
      '<div><label for="gwBayar">Masa pembayaran premi</label><select id="gwBayar">' +
      MASA_BAYAR.map(function (v) {
        return '<option value="' + v + '">' + v + ' tahun</option>';
      }).join('') + '</select></div>' +
      '<div><label for="gwLindung">Masa pertanggungan</label><select id="gwLindung"></select></div>' +
      '</div>' +

      '<div class="baris satu"><div>' +
      '<label for="gwPremi">Premi per tahun</label>' +
      '<input id="gwPremi" type="text" inputmode="numeric" placeholder="Ketik nominal">' +
      '<p class="catatan" id="gwMinPremi"></p></div></div>' +

      '<div id="gwHasil"></div>' +
      '</div>' +

      '<div class="blok tanpa-cetak">' +
      '<button class="aksi" id="gwTblRingkas" type="button">Ringkasan ilustrasi GEN Wealth</button>' +
      '<button class="sakelar" id="gwTblDeposito" type="button" style="margin-top:8px">' +
      'Bandingkan dengan deposito</button>' +
      '<button class="sakelar" id="gwTblBanding" type="button" style="margin-top:8px">Bandingkan pilihan GEN Wealth</button>' +
      '<p class="catatan">Untuk berjaga bila prospek membandingkannya dengan deposito.</p>' +
      '</div>';

    isiMasaLindung();
    pasang();
    gambar();
  }

  /* Masa pertanggungan yang boleh dipilih menyesuaikan masa bayar, karena
     tidak semua kombinasi tersedia. */
  function isiMasaLindung() {
    const sel = el('gwLindung');
    if (!sel) return;
    const bayar = +(el('gwBayar') ? el('gwBayar').value : 2);
    const ada = MASA_LINDUNG.filter(function (l) {
      return pengembalian(mata(), bayar, l) !== null;
    });
    const dipilih = sel.value;
    sel.innerHTML = ada.map(function (l) {
      const rop = pengembalian(mata(), bayar, l);
      return '<option value="' + l + '"' + (String(l) === dipilih ? ' selected' : '') + '>' +
        l + ' tahun — premi kembali ' + Math.round(rop * 1000) / 10 + '%</option>';
    }).join('');
    if (ada.indexOf(+dipilih) === -1 && ada.length) sel.value = String(ada[ada.length - 1]);
  }

  function isian() {
    const tgl = el('gwTgl') ? el('gwTgl').value : '';
    const usia = tgl && typeof usiaGenerali === 'function'
      ? usiaGenerali(new Date(tgl + 'T00:00:00Z')) : null;
    return {
      nama: el('gwNama') ? el('gwNama').value : '',
      tgl: tgl, usia: usia,
      mata: mata(),
      frekuensi: el('gwFrek') ? el('gwFrek').value : 'Tahunan',
      bayar: +(el('gwBayar') ? el('gwBayar').value : 2),
      lindung: +(el('gwLindung') ? el('gwLindung').value : 7),
      premiTahunan: (typeof bAngka === 'function' && el('gwPremi'))
        ? bAngka(el('gwPremi').value) : 0
    };
  }

  function gambar() {
    if (!el('layarGenWealth')) return;
    const i = isian();
    const m = i.mata;

    const min = el('gwMinPremi');
    if (min) {
      const g = batasGio(m, i.bayar, i.lindung);
      min.innerHTML = 'Minimum ' + uang(PREMI_MIN[m][i.bayar], m) + ' per tahun untuk masa ' +
        'bayar ' + i.bayar + ' tahun. Nominalnya bebas, mengikuti keinginan nasabah.' +
        (g
          ? '<br><b>Batas tanpa pemeriksaan kesehatan penuh (GIO)</b> untuk pilihan ' +
            (m === 'USD' ? 'US Dolar' : 'Rupiah') + ', bayar ' + i.bayar + ' tahun, ' +
            'pertanggungan ' + i.lindung + ' tahun: premi sampai <b>' +
            uang(g.premiTahunanMaks, m) + '</b> per tahun, atau uang pertanggungan sampai <b>' +
            uang(g.upMaks, m) + '</b>. Di atas itu tetap bisa diajukan, tetapi lewat ' +
            'full underwriting.'
          : '');
    }
    const infoUsia = el('gwInfoUsia');
    if (infoUsia) {
      infoUsia.textContent = (i.usia === null)
        ? 'Usia masuk 31 hari sampai 70 tahun.'
        : 'Usia masuk ' + i.usia + ' tahun.';
    }

    const kotak = el('gwHasil');
    if (!kotak) return;
    if (!i.tgl || !i.premiTahunan) {
      kotak.innerHTML = '<p class="catatan">' +
        (!i.tgl ? 'Isi tanggal lahir untuk menghitung usia masuk.'
          : 'Isi premi per tahun untuk melihat manfaatnya.') + '</p>';
      return;
    }

    const r = hitung(i);
    window.__gwTerakhir = { hasil: r, isian: i };
    if (!r.tersedia) {
      kotak.innerHTML = '<p class="catatan akt-peringatan">' + esc(r.alasan) + '</p>';
      return;
    }

    kotak.innerHTML =
      '<div class="sorotan"><div class="k">Uang pertanggungan</div>' +
      '<div class="v angka">' + uang(r.up, m) + '</div>' +
      '<div class="t">Total premi ' + uang(r.totalPremi, m) + ' selama ' + r.bayar +
      ' tahun, kembali ' + Math.round(r.rop * 1000) / 10 + '% di akhir tahun ke-' +
      r.lindung + '.</div></div>' +

      '<table class="akt-tabel" style="margin-top:10px"><tbody>' +
      brs('Premi per tahun', uang(r.premiTahunan, m)) +
      (r.pembagi > 1
        ? brs('Premi per setoran (' + esc(r.frekuensi) + ')', uang(r.premiPerSetoran, m))
        : '') +
      brs('Total premi dibayar', uang(r.totalPremi, m)) +
      brs('Manfaat akhir masa pertanggungan', uang(r.manfaatAkhir, m)) +
      brs('Tambahan bila meninggal karena kecelakaan',
        'sampai ' + uang(r.batasKecelakaan, m)) +
      brs('Metode underwriting', '<span class="' + (r.gio ? 'gw-gio' : 'gw-uw') + '">' +
        r.validasi + '</span>') +
      '</tbody></table>' +
      '<p class="catatan">' +
      (r.gio
        ? 'Selisih uang pertanggungan dengan total premi ' + uang(r.nilaiDitanggung, m) +
          ', masih dalam batas ' + uang(r.batasKecelakaan, m) + ', sehingga pengajuan ' +
          'masuk jalur Guaranteed Issuance Offer (GIO) tanpa pemeriksaan kesehatan penuh.'
        : 'Selisih uang pertanggungan dengan total premi ' + uang(r.nilaiDitanggung, m) +
          ' melebihi batas ' + uang(r.batasKecelakaan, m) + ', sehingga pengajuan harus ' +
          'melalui full underwriting.') + '</p>';
  }

  function brs(k, v) { return '<tr><td>' + k + '</td><td><b>' + v + '</b></td></tr>'; }

  /* ---------- Ringkasan untuk nasabah ---------- */

  function gambarRingkas() {
    const w = el('layarGenWealthRingkas');
    if (!w) return;
    const d = window.__gwTerakhir;
    if (!d || !d.hasil || !d.hasil.tersedia) {
      w.innerHTML = '<div class="blok"><p class="catatan">Lengkapi dulu isian di ' +
        'kalkulator GEN Wealth.</p></div>';
      return;
    }
    const r = d.hasil, i = d.isian, m = r.mata;

    w.innerHTML =
      /* Identitas harus berada di dalam kop yang berlatar gelap, sama seperti
         ringkasan produk lain. Sebelumnya ditaruh di kotak putih sehingga
         tulisannya yang berwarna terang tidak terlihat sama sekali. */
      '<div class="kop"><h2>GEN Wealth — Tingkatkan Asetmu Sesuai Visimu</h2>' +
      '<p>Asuransi jiwa dwiguna: perlindungan jiwa disertai pengembalian premi di akhir ' +
      'masa pertanggungan.</p>' +
      '<div class="identitas" id="gwIdentitas">' +
      '<div>Nama tertanggung<b>' + esc(i.nama || '\u2014') + '</b></div>' +
      '<div>Usia<b>' + r.usia + ' tahun</b></div>' +
      '<div>Mata uang<b>' + (m === 'USD' ? 'US Dolar' : 'Rupiah') + '</b></div>' +
      '<div>Cara bayar<b>' + esc(r.frekuensi) + '</b></div>' +
      '<div>Masa pembayaran premi<b>' + r.bayar + ' tahun</b></div>' +
      '<div>Masa pertanggungan<b>' + r.lindung + ' tahun</b></div>' +
      '</div></div>' +

      '<div class="blok"><h2>Ringkasan</h2><div class="ikhtisar">' +
      '<div class="kartu"><div class="k">Premi per tahun</div>' +
      '<div class="v angka">' + uang(r.premiTahunan, m) + '</div></div>' +
      (r.pembagi > 1
        ? '<div class="kartu"><div class="k">Premi per setoran</div>' +
          '<div class="v angka">' + uang(r.premiPerSetoran, m) + '</div></div>'
        : '') +
      '<div class="kartu"><div class="k">Total premi dibayar</div>' +
      '<div class="v angka">' + uang(r.totalPremi, m) + '</div></div>' +
      '<div class="kartu penuh"><div class="k">Uang pertanggungan dan manfaat akhir ' +
      'masa pertanggungan (' + Math.round(r.rop * 1000) / 10 + '% dari total premi)</div>' +
      '<div class="v angka">' + uang(r.up, m) + '</div></div>' +
      '</div></div>' +

      '<div class="blok"><h2>Manfaat</h2>' +
      '<table class="akt-tabel"><tbody>' +
      brs('Meninggal dunia karena sebab apa pun, selama masa pembayaran premi',
        '100% premi yang sudah dibayar') +
      brs('Meninggal dunia karena sebab apa pun, setelah masa pembayaran premi',
        '100% uang pertanggungan — ' + uang(r.up, m)) +
      brs('Tambahan bila meninggal karena kecelakaan',
        '100% uang pertanggungan dikurangi premi yang sudah dibayar, maksimal ' +
        uang(r.batasKecelakaan, m)) +
      brs('Hidup sampai akhir masa pertanggungan',
        uang(r.manfaatAkhir, m) + ' dibayarkan sebagai manfaat akhir') +
      brs('Metode underwriting', r.validasi +
        (r.gio ? ' — tanpa pemeriksaan kesehatan penuh' : ' — pemeriksaan kesehatan penuh')) +
      '</tbody></table>' +
      (r.usia < 4
        ? '<p class="catatan akt-peringatan">Tertanggung berusia di bawah 4 tahun: ' +
          'manfaat meninggal dunia bukan karena kecelakaan dibayar 20% pada usia di bawah ' +
          '1 tahun, 40% pada usia 1 tahun, 60% pada usia 2 tahun, dan 80% pada usia 3 tahun. ' +
          'Penuh 100% mulai usia 4 tahun.</p>'
        : '') +
      '</div>' +

      '<div class="blok"><h2>Tabel manfaat pertanggungan</h2>' +
      '<div class="gulir"><table class="tahunan"><thead><tr>' +
      '<th>Tahun polis</th><th>Usia</th>' +
      '<th class="kanan">Premi tahun ini</th>' +
      '<th class="kanan">Total premi dibayar</th>' +
      '<th class="kanan">Meninggal sebab apa pun</th>' +
      '<th class="kanan">Tambahan kecelakaan</th>' +
      '<th class="kanan">Total bila kecelakaan</th>' +
      '<th class="kanan">Manfaat akhir</th>' +
      '</tr></thead><tbody>' +
      r.timeline.map(function (b) {
        const akhir = b.manfaatAkhir !== null;
        return '<tr class="' + (b.premiTahunIni ? 'bayar' : '') + (akhir ? ' tandai' : '') + '">' +
          '<td>' + b.tahun + '</td><td>' + b.usia + '</td>' +
          '<td class="kanan angka">' + (b.premiTahunIni ? uang(b.premiTahunIni, m) : '—') + '</td>' +
          '<td class="kanan angka">' + uang(b.totalDibayar, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.sebabApaPun, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.tambahanKecelakaan, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.totalKecelakaan, m) + '</td>' +
          '<td class="kanan angka">' + (akhir ? uang(b.manfaatAkhir, m) : '—') + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<p class="catatan">Premi tahun berjalan dianggap sudah diterima penuh pada tahun ' +
      'itu. Nilai penebusan polis sebelum akhir masa pertanggungan mengikuti ketentuan ' +
      'polis dan tidak ditampilkan di sini.</p></div>' +

      '<div class="blok"><h2>Ketentuan pokok</h2>' +
      '<table class="akt-tabel"><tbody>' +
      brs('Usia masuk tertanggung', '31 hari sampai 70 tahun') +
      brs('Usia masuk pemegang polis', '18 sampai 90 tahun') +
      brs('Masa pertanggungan', '7, 9, atau 11 tahun') +
      brs('Masa pembayaran premi', '2, 3, atau 5 tahun') +
      brs('Cara pembayaran premi', 'Tahunan, semesteran, kuartalan, atau bulanan') +
      brs('Premi minimum masa bayar 2 tahun', 'Rp50.000.000 atau USD 5.000 per tahun') +
      brs('Premi minimum masa bayar 3 dan 5 tahun', 'Rp30.000.000 atau USD 3.000 per tahun') +
      '</tbody></table></div>' +

      '<div class="blok"><p class="catatan" id="gwSangkalan">Ilustrasi ini dihitung dari ' +
      'ketentuan produk yang berlaku saat ini dan dipakai untuk membantu penjelasan kepada ' +
      'calon nasabah. Bukan bagian dari polis dan tidak mengikat secara hukum. Nilai final ' +
      'tunduk pada Ketentuan Polis resmi PT Asuransi Jiwa Generali Indonesia dan hasil ' +
      'underwriting.</p><div class="kaki" id="gwKakiAgen"></div></div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="gwTblCetak" type="button">Cetak / simpan PDF</button>' +
      '</div>';
  }

  /* ---------- Deposito vs GEN Wealth ----------
     Nominal setoran sama, lama menyetor sama, lama mengendap sama.
     Deposito dihitung bunga berbunga: saldo akhir tahun = (saldo awal +
     setoran tahun itu) x (1 + bunga). Bila nasabah meninggal di tahun mana
     pun, bank mengembalikan saldo berjalan — pokok beserta bunga yang sudah
     terkumpul. Tidak ada manfaat tambahan apa pun.
     GEN Wealth memakai angka dari perhitungan yang sudah ada di layar. */

  /* Bunga deposito di Indonesia dipotong PPh final Pasal 4 ayat (2) sebesar
     20%, dipotong bank langsung tiap kali bunga dibukukan. Jadi yang benar-
     benar menambah saldo adalah bunga bersih setelah potongan itu. */
  const PAJAK_BUNGA_BAWAAN = 20;

  function hitungDeposito(r, bungaPersen, pajakPersen) {
    const bunga = (Number(bungaPersen) || 0) / 100;
    const pajak = (pajakPersen === undefined || pajakPersen === null
      ? PAJAK_BUNGA_BAWAAN : Number(pajakPersen)) / 100;
    const baris = [];
    let saldo = 0;
    let totalBungaKotor = 0, totalPajak = 0;
    for (let th = 1; th <= r.lindung; th++) {
      const setoran = th <= r.bayar ? r.premiTahunan : 0;
      const bungaKotor = (saldo + setoran) * bunga;
      const potongan = bungaKotor * pajak;
      const bungaBersih = bungaKotor - potongan;
      totalBungaKotor += bungaKotor;
      totalPajak += potongan;
      saldo = saldo + setoran + bungaBersih;
      const gw = r.timeline[th - 1];
      baris.push({
        tahun: th,
        usia: r.usia + th - 1,
        setoran: setoran,
        bungaKotor: bungaKotor,
        pajak: potongan,
        bungaTahunIni: bungaBersih,
        saldo: saldo,
        gwSebabApaPun: gw ? gw.sebabApaPun : 0,
        gwKecelakaan: gw ? gw.totalKecelakaan : 0,
        gwAkhir: gw ? gw.manfaatAkhir : null
      });
    }
    return {
      bunga: bunga, pajak: pajak, baris: baris, saldoAkhir: saldo,
      totalBungaKotor: totalBungaKotor, totalPajak: totalPajak
    };
  }

  function gambarDeposito() {
    const w = el('layarGenWealthDeposito');
    if (!w) return;
    const d = window.__gwTerakhir;
    if (!d || !d.hasil || !d.hasil.tersedia) {
      w.innerHTML = '<div class="blok"><p class="catatan">Lengkapi dulu isian di ' +
        'kalkulator GEN Wealth.</p></div>';
      return;
    }
    const r = d.hasil, i = d.isian, m = r.mata;
    const nBunga = el('gwBunga');
    const bungaPersen = nBunga ? (parseFloat(nBunga.value) || 4) : 4;
    const nPajak = el('gwPajakBunga');
    const pajakPersen = nPajak ? (parseFloat(nPajak.value) || 0) : PAJAK_BUNGA_BAWAAN;
    const dep = hitungDeposito(r, bungaPersen, pajakPersen);

    const akhirGw = r.up;

    w.innerHTML =
      '<div class="kop"><h2>Deposito vs GEN Wealth</h2>' +
      '<p>Nominal setoran sama, lama menyetor sama, lama mengendap sama. ' +
      'Yang dibandingkan hanya apa yang diterima nasabah.</p>' +
      '<div class="identitas">' +
      '<div>Nama nasabah<b>' + esc(i.nama || '\u2014') + '</b></div>' +
      '<div>Usia<b>' + r.usia + ' tahun</b></div>' +
      '<div>Setoran per tahun<b>' + uang(r.premiTahunan, m) + '</b></div>' +
      '<div>Lama menyetor<b>' + r.bayar + ' tahun</b></div>' +
      '<div>Lama mengendap<b>' + r.lindung + ' tahun</b></div>' +
      '<div>Total disetor<b>' + uang(r.totalPremi, m) + '</b></div>' +
      '</div></div>' +

      '<div class="blok tanpa-cetak">' +
      '<div class="baris">' +
      '<div><label for="gwBunga">Bunga deposito per tahun (%)</label>' +
      '<input id="gwBunga" type="number" step="0.25" min="0" max="20" value="' +
      bungaPersen + '">' +
      '<p class="catatan">Ubah sesuai penawaran bank yang dibandingkan.</p></div>' +
      '<div><label for="gwPajakBunga">Pajak bunga deposito (%)</label>' +
      '<input id="gwPajakBunga" type="number" step="1" min="0" max="30" value="' +
      pajakPersen + '">' +
      '<p class="catatan">PPh final Pasal 4 ayat (2), 20% dipotong bank tiap kali ' +
      'bunga dibukukan.</p></div>' +
      '</div></div>' +

      /* Kartu selisih dilepas atas permintaan. Kedua nilai akhirnya tetap
         ditampilkan berdampingan supaya tidak ada yang disembunyikan, dan
         yang ditonjolkan adalah pembeda yang memang tidak dimiliki deposito:
         manfaat meninggal dunia sejak tahun pertama. */
      '<div class="blok"><h2>Bila bertahan sampai akhir</h2><div class="ikhtisar">' +
      '<div class="kartu"><div class="k">Deposito setelah ' + r.lindung + ' tahun</div>' +
      '<div class="v angka">' + uang(dep.saldoAkhir, m) + '</div></div>' +
      '<div class="kartu"><div class="k">GEN Wealth di akhir masa pertanggungan</div>' +
      '<div class="v angka">' + uang(akhirGw, m) + '</div></div>' +
      '<div class="kartu penuh"><div class="k">Yang tidak dimiliki deposito</div>' +
      '<div class="v angka">' + uang(r.timeline[0] ? r.timeline[0].totalKecelakaan : 0, m) + '</div>' +
      '<div class="k" style="margin-top:6px">Manfaat GEN Wealth bila meninggal karena ' +
      'kecelakaan pada tahun pertama, saat saldo deposito baru ' +
      uang(dep.baris[0] ? dep.baris[0].saldo : 0, m) + '. Perlindungan itu berjalan ' +
      'sejak polis terbit, berapa pun bunga yang ditawarkan bank.</div></div></div></div>' +

      '<div class="blok"><h2>Tahun per tahun</h2>' +
      '<div class="gulir"><table class="tahunan"><thead><tr>' +
      '<th>Tahun</th><th>Usia</th>' +
      '<th class="kanan">Setoran</th>' +
      '<th class="kanan">Bunga kotor</th>' +
      '<th class="kanan">Pajak ' + pajakPersen + '%</th>' +
      '<th class="kanan">Bunga bersih</th>' +
      '<th class="kanan">Saldo deposito</th>' +
      '<th class="kanan">Diterima bila meninggal — deposito</th>' +
      '<th class="kanan">Diterima bila meninggal — GEN Wealth</th>' +
      '<th class="kanan">Bila meninggal karena kecelakaan — GEN Wealth</th>' +
      '</tr></thead><tbody>' +
      dep.baris.map(function (b) {
        const akhir = b.gwAkhir !== null;
        return '<tr class="' + (b.setoran ? 'bayar' : '') + (akhir ? ' tandai' : '') + '">' +
          '<td>' + b.tahun + '</td><td>' + b.usia + '</td>' +
          '<td class="kanan angka">' + (b.setoran ? uang(b.setoran, m) : '\u2014') + '</td>' +
          '<td class="kanan angka">' + uang(b.bungaKotor, m) + '</td>' +
          '<td class="kanan angka">\u2212' + uang(b.pajak, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.bungaTahunIni, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.saldo, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.saldo, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.gwSebabApaPun, m) + '</td>' +
          '<td class="kanan angka">' + uang(b.gwKecelakaan, m) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<p class="catatan">Bila nasabah meninggal, deposito mengembalikan saldo berjalan ' +
      'apa adanya — pokok beserta bunga yang sudah terkumpul, tanpa manfaat tambahan. ' +
      'GEN Wealth membayar sesuai ketentuan produk, dan pada tahun-tahun awal nilainya ' +
      'jauh di atas saldo deposito.</p></div>' +

      '<div class="blok"><h2>Yang perlu disampaikan apa adanya</h2>' +
      '<table class="akt-tabel"><tbody>' +
      brs('Deposito', 'Dana bisa diambil sesuai jangka waktunya, bunga dijamin di muka, ' +
        'dijamin LPS sampai batas yang berlaku, tetapi bunganya dipotong PPh final 20% ' +
        'dan tidak ada manfaat meninggal dunia') +
      brs('GEN Wealth', 'Memberi manfaat meninggal dunia sejak tahun pertama dan ' +
        'pengembalian premi di akhir masa pertanggungan, tetapi dananya terikat sampai ' +
        'akhir masa pertanggungan dan penebusan lebih awal mengikuti ketentuan polis') +
      '</tbody></table>' +
      '<p class="catatan">Perbandingan ini memakai bunga tetap ' + bungaPersen + '% per ' +
      'tahun sepanjang ' + r.lindung + ' tahun, dengan pajak bunga ' + pajakPersen +
      '% sudah dipotong. Sepanjang ' + r.lindung + ' tahun, bunga kotornya ' +
      uang(dep.totalBungaKotor, m) + ' dan pajaknya ' + uang(dep.totalPajak, m) + '. ' +
      'Bunga deposito sesungguhnya berubah mengikuti pasar, dan manfaat GEN Wealth ' +
      'bukan bunga sehingga tidak dikenai pajak bunga.</p></div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="gwDepositoCetak" type="button">Cetak / simpan PDF</button>' +
      '</div>';

    const nb = el('gwBunga');
    if (nb && !nb.dataset.siap) {
      nb.dataset.siap = '1';
      nb.addEventListener('change', gambarDeposito);
    }
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    ['gwNama', 'gwTgl', 'gwPremi', 'gwFrek', 'gwMata', 'gwBayar', 'gwLindung']
      .forEach(function (id) {
        const n = el(id);
        if (!n) return;
        n.addEventListener('input', function () {
          if (id === 'gwBayar' || id === 'gwMata') isiMasaLindung();
          gambar();
        });
        n.addEventListener('change', function () {
          if (id === 'gwBayar' || id === 'gwMata') isiMasaLindung();
          gambar();
        });
      });

    const premi = el('gwPremi');
    if (premi) {
      premi.addEventListener('input', function () {
        if (typeof bAngka !== 'function') return;
        const n = bAngka(premi.value);
        premi.value = n ? n.toLocaleString('id-ID') : '';
      });
    }

    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#gwTblRingkas')) {
        gambarRingkas();
        window.bukaLayar('GENWEALTH_RINGKAS');
        return;
      }
      if (t.closest('#gwTblDeposito')) {
        gambarDeposito();
        window.bukaLayar('GENWEALTH_DEPOSITO');
        return;
      }
      if (t.closest('#gwBungaHitung') || (t.target && t.target.id === 'gwBunga')) {
        gambarDeposito();
        return;
      }
      if (t.closest('#gwDepositoCetak')) {
        const d = window.__gwTerakhir;
        const nama = (d && d.isian && d.isian.nama) ? d.isian.nama : 'Nasabah';
        const asli = document.title;
        document.title = 'Deposito vs GEN Wealth - ' + nama;
        window.print();
        setTimeout(function () { document.title = asli; }, 1000);
        return;
      }
      if (t.closest('#gwTblCetak')) {
        const d = window.__gwTerakhir;
        const nama = (d && d.isian && d.isian.nama) ? d.isian.nama : 'Nasabah';
        const asli = document.title;
        document.title = 'GEN Wealth - ' + nama;
        window.print();
        setTimeout(function () { document.title = asli; }, 1000);
      }
    });
  }

  /* Identitas diambil dari Profil Nasabah yang sedang aktif supaya agen
     tidak mengetik nama dan tanggal lahir dua kali. Isian yang sudah diketik
     manual tidak ditimpa. */
  function ambilProfil() {
    let p = null;
    try {
      const aktif = localStorage.getItem('insuranceHub.customerProfile.active.v1');
      const daftar = JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1') || '[]');
      p = daftar.find(function (x) { return x.id === aktif; }) || null;
    } catch (_) { return; }
    if (!p) return;

    const nama = el('gwNama'), tgl = el('gwTgl');
    if (nama && !nama.value && p.nama) nama.value = p.nama;
    if (tgl && !tgl.value && p.tglLahir) tgl.value = p.tglLahir;
  }

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    kerangka();
    ambilProfil();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__gwHook) {
      const asli = window.bukaLayar;
      const bungkus = function (nama) {
        if (nama === 'GENWEALTH_RINGKAS') { try { gambarRingkas(); } catch (_) {} }
        const hasil = asli.apply(this, arguments);
        if (nama === 'GENWEALTH') setTimeout(function () { ambilProfil(); gambar(); }, 30);
        return hasil;
      };
      bungkus.__gwHook = true;
      Object.keys(asli).forEach(function (k) { bungkus[k] = asli[k]; });
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
  }

  window.InsuranceHubGenWealth = {
    hitung, hitungDeposito, pengembalian, kombinasiTersedia, faktorBalita,
    batasGio, PENGEMBALIAN, PREMI_MIN, BATAS_KECELAKAAN, PEMBAGI_FREKUENSI,
    MASA_BAYAR, MASA_LINDUNG
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 120);
  }
})();
