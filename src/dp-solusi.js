/* ============================================================
   Solusi Dana Pensiun — BeSMART Lite Future
   ------------------------------------------------------------
   Target dana pensiun jarang jatuh pas di salah satu tingkat UP
   Lite Future. Membulatkannya ke atas ke satu tingkat sering
   melompat terlalu jauh: target Rp8,3 miliar akan menjadi
   Rp10 miliar.

   Karena itu targetnya dipecah menjadi DUA polis: satu tingkat
   terbesar yang tidak melebihi target, lalu sisanya dibulatkan
   ke atas ke tingkat terdekat. Rp8,3 miliar menjadi Rp5 miliar
   ditambah Rp3,5 miliar, totalnya Rp8,5 miliar.

   Masa bayar mengikuti lama menyiapkan dana, dan masa
   perlindungan mengikuti usia pensiun yang sudah dipilih agen
   di halaman kebutuhan dana pensiun — jadi agen tidak mengisi
   ulang apa pun.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (t) => String(t === null || t === undefined ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  let terakhir = null;


  /* Tabel pembebasan premi waiver BeSMART Lite Future.

     Waiver pada produk ini wajib dan preminya menyatu di setoran. Cara kerja
     pembebasannya sama dengan waiver Gen Aman: premi dasar yang BELUM dibayar
     dibebaskan sampai akhir masa bayar. Sisa masa bayar dihitung setelah
     premi tahun berjalan dibayar, dan premi waiver sendiri tidak ikut karena
     rider berakhir begitu klaim disetujui. */
  function tabelPembebasanLF(polis){
    try{
      const aktif = (polis || []).filter(function(p){
        return p && Number(p._premiDasar) > 0 && Number(p.mpp) > 1;
      });
      if(!aktif.length) return '';
      const maks = aktif.reduce(function(m,p){ return Math.max(m, Number(p.mpp)||0); }, 0);
      if(maks < 2) return '';
      const banyak = aktif.length > 1;
      const kepala = '<tr><th>Kejadian pada</th><th class="kanan">Sisa masa bayar</th>' +
        (banyak ? aktif.map(function(p,i){
          return '<th class="kanan">Polis ' + (i+1) + '</th>'; }).join('') : '') +
        '<th class="kanan">Total premi yang dibebaskan</th></tr>';
      let baris = '';
      for(let th = 1; th < maks; th++){
        let total = 0;
        const kolom = aktif.map(function(p){
          const mpp = Number(p.mpp) || 0;
          const sisa = Math.max(0, mpp - th);
          const perTahun = p.setoran === 'Bulanan' ? p._premiDasar * 12 : p._premiDasar;
          const nilai = perTahun * sisa;
          total += nilai;
          return '<td class="kanan angka">' + (sisa ? rp(Math.round(nilai)) : '\u2014') + '</td>';
        }).join('');
        const sisaTerpanjang = Math.max.apply(null, aktif.map(function(p){
          return Math.max(0, (Number(p.mpp)||0) - th); }));
        baris += '<tr><td>Tahun ke-' + th + '</td>' +
          '<td class="kanan angka">' + sisaTerpanjang + ' tahun</td>' +
          (banyak ? kolom : '') +
          '<td class="kanan angka"><b>' + rp(Math.round(total)) + '</b></td></tr>';
      }
      const waiverInfo = aktif.map(function(p,i){
        return (banyak ? 'polis ' + (i+1) + ' ' : '') + rp(p._premiWaiver) +
          '/' + (p.setoran === 'Bulanan' ? 'bulan' : 'tahun'); }).join(', ');
      return '<div class="blok"><h3>Bila terdiagnosa penyakit kritis</h3>' +
        '<p class="catatan">Premi dasar yang BELUM dibayar dibebaskan sampai akhir masa bayar. ' +
        'Sisa masa bayar dihitung setelah premi tahun berjalan dibayar. Rider waiver pada ' +
        'BeSMART Lite Future bersifat wajib dan preminya menyatu di setoran (' + waiverInfo +
        '); premi waiver itu sendiri tidak ikut dibebaskan karena rider berakhir begitu klaim ' +
        'disetujui. Dana pensiun tetap cair penuh pada usia yang direncanakan.</p>' +
        '<div class="gulir"><table class="tahunan">' +
        '<thead>' + kepala + '</thead><tbody>' + baris + '</tbody></table></div></div>';
    }catch(_){ return ''; }
  }

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.DP_SOLUSI = {
      el: 'layarDpSolusi', judul: 'Solusi Dana Pensiun',
      sub: 'Disusun dari BeSMART Lite Future', kiri: 'DP'
    };
    nav.LAYAR.DP_BANDING_MANUAL = {
      el: 'layarDpBandingManual', judul: 'Menyiapkan Sendiri vs Lite Future',
      sub: 'Dua cara menuju dana pensiun yang sama', kiri: 'DP'
    };
    nav.LAYAR.DP_SOLUSI_RINGKAS = {
      el: 'layarDpSolusiRingkas', judul: 'Rencana Dana Pensiun',
      sub: 'Siap dicetak untuk nasabah', kiri: 'DP_SOLUSI'
    };
    return true;
  }

  function pecah(target) {
    if (typeof window.pecahUpLiteFuture === 'function') {
      return window.pecahUpLiteFuture(target);
    }
    return [];
  }

  /* Angka dari layar kebutuhan dana pensiun dibaca apa adanya. */
  function konteks() {
    const tgl = el('dTgl') ? el('dTgl').value : '';
    const usia = (tgl && typeof usiaGenerali === 'function')
      ? usiaGenerali(new Date(tgl + 'T00:00:00Z')) : null;
    return {
      nama: el('dNama') ? el('dNama').value : '',
      tgl: tgl,
      usia: usia,
      usiaPensiun: +(el('dPensiun') ? el('dPensiun').value : 0) || 0,
      lamaSiapkan: +(el('dLama') ? el('dLama').value : 0) || 0,
      target: (window.__dpHasilTerakhir && Number(window.__dpHasilTerakhir.target)) || window.__dpTargetTerakhir || 0,
      pertumbuhan: window.__dpHasilTerakhir ? Number(window.__dpHasilTerakhir.pertumbuhan) || 0 : 0,
      danaTersediaNanti: window.__dpHasilTerakhir ? Number(window.__dpHasilTerakhir.danaTersediaNanti) || 0 : 0,
      setoranBulanan: window.__dpHasilTerakhir ? Number(window.__dpHasilTerakhir.setoranBulanan) || 0 : 0,
      setoranTahunan: window.__dpHasilTerakhir ? Number(window.__dpHasilTerakhir.setoranTahunan) || 0 : 0
    };
  }

  /* Satu kalkulator per polis, isian bisa diubah agen. Nilai awalnya
     mengikuti hasil kebutuhan, tetapi nasabah sering ingin menggeser masa
     bayar atau uang pertanggungannya di tempat — jadi ini bukan tampilan
     mati, melainkan kalkulator sungguhan seperti di kotak Lite Future. */
  const MPP_PILIHAN = [3, 5, 10, 15, 20];
  let polisAktif = [];
  /* Sidik jari isian yang dipakai saat polisAktif terakhir dibangun. Kalau
     agen mengubah lama siapkan, usia pensiun, atau targetnya, susunan polis
     harus dibangun ulang. Tanpa ini, kedua tombol Solusi masih memakai masa
     bayar lama padahal halaman hitungnya sudah berubah. */
  let tandaPolis = '';
  function tandaKonteks(k) {
    if (!k) return '';
    return [k.tgl, k.usiaPensiun, k.lamaSiapkan, Math.round(Number(k.target) || 0),
      Math.round(Number(k.danaTersediaNanti) || 0), Math.round(Number(k.pertumbuhan) || 0)].join('|');
  }
  function perluBangunUlang(k) {
    return tandaKonteks(k) !== tandaPolis;
  }

  function tierUP() {
    return (typeof META !== 'undefined' && Array.isArray(META.tierUP))
      ? META.tierUP.slice().sort(function (a, b) { return a - b; }) : [];
  }

  function hitungSatu(k, p) {
    /* Mesin Lite Future membutuhkan TARIF sekaligus META. Sebelumnya META
       tidak dikirim, sehingga setiap kombinasi selalu dinyatakan tidak
       tersedia padahal tabelnya ada. Dipanggil langsung seperti layar
       Lite Future aslinya supaya perilakunya persis sama. */
    const rates = (typeof TARIF !== 'undefined') ? TARIF : null;
    const meta = (typeof META !== 'undefined') ? META : null;
    if (!rates || !meta || !k.tgl) return null;
    const pilih = {}, custom = {};
    [55, 60, 65, 70, 75].forEach(function (a) {
      pilih[a] = (a === p.usiaPensiun);
      custom[a] = null;
    });
    try {
      if (typeof hitung !== 'function') return null;
      return hitung({
        nama: k.nama, jk: p.jk || 'PRIA',
        tglLahir: new Date(k.tgl + 'T00:00:00Z'),
        setoran: p.setoran || 'Tahunan',
        mpp: p.mpp, pensiunUP: p.up,
        statusAgen: 'Bukan agen',
        customUP: custom, pilih: pilih
      }, rates, meta);
    } catch (_) { return null; }
  }

  /* Angka yang dipakai ringkasan diambil dari usia pensiun yang dipilih. */
  /* Tiap baris hasil memakai medan retAge, up, setoran, total, dan alasan. */
  function ambilBaris(h, usiaPensiun) {
    if (!h || !Array.isArray(h.hasil)) return null;
    return h.hasil.find(function (x) {
      return Number(x.retAge) === Number(usiaPensiun);
    }) || null;
  }

  function kartuKalkulator(k, p, i) {
    const t = tierUP();
    return '<div class="blok dp-kalk" data-polis="' + i + '">' +
      '<h3>Polis ' + (i + 1) + '</h3>' +
      '<div class="baris">' +
      '<div><label>Uang pertanggungan</label>' +
      '<select data-dp="up" data-i="' + i + '">' +
      t.map(function (v) {
        return '<option value="' + v + '"' + (v === p.up ? ' selected' : '') + '>' + rp(v) + '</option>';
      }).join('') + '</select></div>' +
      '<div><label>Masa bayar</label>' +
      '<select data-dp="mpp" data-i="' + i + '">' +
      MPP_PILIHAN.map(function (v) {
        return '<option value="' + v + '"' + (v === p.mpp ? ' selected' : '') + '>' + v + ' tahun</option>';
      }).join('') + '</select></div>' +
      '</div>' +
      '<div class="baris">' +
      '<div><label>Usia pensiun</label>' +
      '<select data-dp="usiaPensiun" data-i="' + i + '">' +
      [55, 60, 65, 70, 75].map(function (v) {
        return '<option value="' + v + '"' + (v === p.usiaPensiun ? ' selected' : '') + '>' + v + ' tahun</option>';
      }).join('') + '</select></div>' +
      '<div><label>Cara setor</label>' +
      '<select data-dp="setoran" data-i="' + i + '">' +
      ['Tahunan', 'Bulanan'].map(function (v) {
        return '<option value="' + v + '"' + (v === p.setoran ? ' selected' : '') + '>' + v + '</option>';
      }).join('') + '</select></div>' +
      '</div>' +
      '<div class="dp-hasil" data-hasil="' + i + '">' + hasilKartu(k, p) + '</div>' +
      '</div>';
  }

  function hasilKartu(k, p) {
    const h = hitungSatu(k, p);
    const b = ambilBaris(h, p.usiaPensiun);
    if (!b || b.setoran == null) {
      p._setoran = 0;
      // Mesin menyebutkan alasannya sendiri; itu jauh lebih berguna
      // daripada pesan umum buatan sendiri.
      const alasan = (b && b.alasan)
        ? b.alasan
        : 'Kombinasi ini tidak tersedia di tabel tarif.';
      return '<p class="catatan akt-peringatan">' + esc(alasan) +
        ' Coba ubah uang pertanggungan, masa bayar, atau usia pensiunnya.</p>';
    }
    p._setoran = Number(b.setoran) || 0;
    p._up = Number(b.up || p.up) || p.up;
    /* Premi dasar dan premi waiver disimpan terpisah. Waiver pada BeSMART
       Lite Future wajib dan preminya menyatu di setoran, tetapi yang
       dibebaskan saat klaim hanya premi dasarnya. */
    p._premiDasar = Number(b.premiDasar) || 0;
    p._premiWaiver = Number(b.premiWaiver) || 0;
    return '<table class="akt-tabel"><tbody>' +
      '<tr><td>Setoran per ' + (p.setoran === 'Bulanan' ? 'bulan' : 'tahun') + '</td>' +
      '<td><b>' + rp(p._setoran) + '</b></td></tr>' +
      (p._premiDasar ? '<tr><td>Rincian setoran</td>' +
        '<td><b>Premi dasar ' + rp(p._premiDasar) + ' + waiver ' + rp(p._premiWaiver) +
        ' (wajib)</b></td></tr>' : '') +
      '<tr><td>Dibayar selama</td><td><b>' + p.mpp + ' tahun</b></td></tr>' +
      '<tr><td>Dana cair di usia</td><td><b>' + p.usiaPensiun + ' tahun</b></td></tr>' +
      '<tr><td>Total disetor</td><td><b>' + rp(b.total || 0) + '</b></td></tr>' +
      '<tr class="tandai"><td><b>Dana yang diterima</b></td>' +
      '<td><b>' + rp(p._up) + '</b></td></tr>' +
      '</tbody></table>';
  }

  /* Susunan polis awal: hasil pemecahan target, dengan masa bayar dan usia
     pensiun mengikuti isian di halaman kebutuhan. Sesudah itu agen bebas
     mengubahnya di tiap kartu. */
  function susunAwal(k) {
    const bagian = pecah(k.target);
    return bagian.map(function (up) {
      return {
        up: up,
        mpp: k.lamaSiapkan || 5,
        usiaPensiun: k.usiaPensiun || 65,
        setoran: 'Tahunan',
        jk: 'PRIA'
      };
    });
  }

  function totalSetoran() {
    return polisAktif.reduce(function (t, p) { return t + (Number(p._setoran) || 0); }, 0);
  }
  /* Total yang benar-benar dikeluarkan sampai masa bayar selesai. Setoran
     bulanan disetarakan ke setahun dulu supaya tidak tercampur. */
  function totalDibayar() {
    return polisAktif.reduce(function (t, p) {
      const perTahun = (p.setoran === 'Bulanan')
        ? (Number(p._setoran) || 0) * 12 : (Number(p._setoran) || 0);
      return t + perTahun * (Number(p.mpp) || 0);
    }, 0);
  }

  function totalDana() {
    return polisAktif.reduce(function (t, p) { return t + (Number(p._up || p.up) || 0); }, 0);
  }

  function gambar(bangunUlang) {
    const w = el('layarDpSolusi');
    if (!w) return;
    const k = terakhir || konteks();

    if (!k.target) {
      w.innerHTML = '<div class="kop"><h2>Solusi Dana Pensiun</h2>' +
        '<p class="catatan">Hitung dulu kebutuhan dana pensiunnya, lalu tekan Solusi.</p></div>';
      return;
    }
    if (bangunUlang || !polisAktif.length || perluBangunUlang(k)) {
      polisAktif = susunAwal(k);
      tandaPolis = tandaKonteks(k);
    }

    const kartu = polisAktif.map(function (p, i) { return kartuKalkulator(k, p, i); }).join('');
    const dana = totalDana();
    const selisih = dana - k.target;

    w.innerHTML =
      '<div class="kop"><h2>Solusi Dana Pensiun</h2>' +
      '<p>Target dana dipenuhi dengan BeSMART Lite Future. Semua isian sudah terisi ' +
      'sesuai hasil kebutuhan, dan tetap bisa diubah.</p>' +
      '<div class="identitas">' +
      '<div>Nama<b>' + esc(k.nama || '\u2014') + '</b></div>' +
      '<div>Usia<b>' + (k.usia !== null ? k.usia + ' tahun' : '\u2014') + '</b></div>' +
      '<div>Target dana<b>' + rp(k.target) + '</b></div>' +
      '<div>Lama menyiapkan<b>' + (k.lamaSiapkan || '\u2014') + ' tahun</b></div>' +
      '</div></div>' +

      '<div class="blok">' +
      '<div class="sorotan"><div class="k">Dana yang akan diterima</div>' +
      '<div class="v angka">' + rp(dana) + '</div>' +
      '<div class="t">Dari ' + polisAktif.length + ' polis. ' +
      (selisih === 0 ? 'Pas dengan target.'
        : (selisih > 0 ? 'Lebih ' + rp(selisih) + ' dari target ' + rp(k.target) + '.'
          : 'Kurang ' + rp(-selisih) + ' dari target ' + rp(k.target) + '.')) +
      '</div></div>' +
      '<p class="catatan">Pilihan uang pertanggungan produk ini bertingkat, jadi jarang ' +
      'jatuh pas. Targetnya dipecah menjadi dua polis supaya jumlahnya jauh lebih dekat ' +
      'daripada membulatkan ke satu tingkat di atasnya.</p></div>' +

      kartu +

      '<div class="blok"><h2>Gabungan</h2>' +
      '<table class="akt-tabel"><tbody>' +
      '<tr><td>Total setoran</td><td><b>' + rp(totalSetoran()) + '</b></td></tr>' +
      '<tr><td>Total dana diterima</td><td><b>' + rp(dana) + '</b></td></tr>' +
      '</tbody></table>' +
      '<p class="catatan">Kedua polis berdiri sendiri tetapi disajikan sebagai satu rencana. ' +
      'Nasabah boleh mengambil salah satunya lebih dulu dan menambah sisanya kemudian.</p>' +
      '</div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="dpSolusiRingkas" type="button">Ringkasan untuk nasabah</button>' +
      '<button class="sakelar" id="dpSolusiUlang" type="button">Kembalikan ke hasil awal</button>' +
      '</div>';
  }

  /* ---------- Ringkasan ---------- */

  function gambarRingkas() {
    const w = el('layarDpSolusiRingkas');
    if (!w) return;
    const k = terakhir || konteks();
    if (!polisAktif.length) {
      w.innerHTML = '<div class="blok"><p class="catatan">Belum ada polis yang disusun.</p></div>';
      return;
    }
    const dana = totalDana(), setoran = totalSetoran();

    w.innerHTML =
      '<div class="kop"><h2>Rencana Dana Pensiun</h2>' +
      '<p>Disusun dengan BeSMART Lite Future.</p>' +
      '<div class="identitas">' +
      '<div>Nama<b>' + esc(k.nama || '\u2014') + '</b></div>' +
      '<div>Usia<b>' + (k.usia !== null ? k.usia + ' tahun' : '\u2014') + '</b></div>' +
      '<div>Dana cair di usia<b>' + polisAktif[0].usiaPensiun + ' tahun</b></div>' +
      '<div>Lama menyetor<b>' + polisAktif[0].mpp + ' tahun</b></div>' +
      '</div></div>' +

      '<div class="blok"><h2>Ringkasan</h2><div class="ikhtisar">' +
      '<div class="kartu"><div class="k">Total setoran per ' +
      (polisAktif[0].setoran === 'Bulanan' ? 'bulan' : 'tahun') + '</div>' +
      '<div class="v angka">' + rp(setoran) + '</div></div>' +
      '<div class="kartu"><div class="k">Lama bayar</div>' +
      '<div class="v angka">' + polisAktif[0].mpp + ' tahun</div></div>' +
      '<div class="kartu"><div class="k">Total dibayar selama ' + polisAktif[0].mpp +
      ' tahun</div><div class="v angka">' + rp(totalDibayar()) + '</div></div>' +
      '<div class="kartu penuh"><div class="k">Dana yang diterima saat pensiun</div>' +
      '<div class="v angka">' + rp(dana) + '</div></div>' +
      '</div></div>' +

      '<div class="blok"><h2>Rincian polis</h2>' +
      '<div class="gulir"><table class="tahunan"><thead><tr>' +
      '<th>Polis</th><th class="kanan">Dana diterima</th><th class="kanan">Setoran</th>' +
      '<th class="kanan">Lama setor</th><th class="kanan">Cair di usia</th>' +
      '</tr></thead><tbody>' +
      polisAktif.map(function (p, i) {
        return '<tr><td>Polis ' + (i + 1) + '</td>' +
          '<td class="kanan angka">' + rp(p._up || p.up) + '</td>' +
          '<td class="kanan angka">' + rp(p._setoran || 0) +
          ' <small>/' + (p.setoran === 'Bulanan' ? 'bln' : 'th') + '</small></td>' +
          '<td class="kanan">' + p.mpp + ' tahun</td>' +
          '<td class="kanan">' + p.usiaPensiun + ' tahun</td></tr>';
      }).join('') +
      '<tr class="tandai"><td><b>Total</b></td>' +
      '<td class="kanan angka"><b>' + rp(dana) + '</b></td>' +
      '<td class="kanan angka"><b>' + rp(setoran) + '</b></td>' +
      '<td class="kanan">\u2014</td><td class="kanan">\u2014</td></tr>' +
      '</tbody></table></div></div>' +

      '<div class="blok"><h2>Manfaat</h2><table class="akt-tabel"><tbody>' +
      '<tr><td>Hidup sampai usia ' + polisAktif[0].usiaPensiun + '</td>' +
      '<td><b>' + rp(dana) + ' dicairkan</b></td></tr>' +
      /* Angkanya disebut langsung. "Uang pertanggungan dibayarkan" memaksa
         nasabah menebak nilainya, padahal nilainya sudah pasti. */
      '<tr><td>Meninggal sebelum usia ' + polisAktif[0].usiaPensiun + '</td>' +
      '<td><b>' + rp(dana) + ' dibayarkan kepada ahli waris</b></td></tr>' +
      '<tr><td>Pembebasan setoran (waiver)</td>' +
      '<td><b>Sisa setoran dibebaskan, dana ' + rp(dana) + ' tetap cair penuh</b></td></tr>' +
      '<tr><td>Setoran berhenti</td>' +
      '<td><b>Setelah ' + polisAktif[0].mpp + ' tahun</b></td></tr>' +
      '</tbody></table>' +
      '<p class="catatan"><b>Pembebasan setoran sudah termasuk.</b> Premi BeSMART Lite ' +
      'Future sudah mencakup waiver, tanpa premi rider terpisah. Bila tertanggung ' +
      'terdiagnosa salah satu penyakit kritis sesuai ketentuan polis, sisa setoran ' +
      'sampai akhir masa bayar dibebaskan dan ditanggung penanggung, sementara dana ' +
      'pensiun ' + rp(dana) + ' tetap cair penuh pada usia ' + polisAktif[0].usiaPensiun +
      '.</p></div>' +

      tabelPembebasanLF(polisAktif) +

      '<div class="blok"><p class="catatan">Ilustrasi ini dihitung dari tarif yang berlaku ' +
      'saat ini dan dipakai untuk membantu penjelasan. Bukan bagian dari polis dan tidak ' +
      'mengikat secara hukum. Nilai final tunduk pada Ketentuan Polis resmi PT Asuransi ' +
      'Jiwa Generali Indonesia serta hasil underwriting.</p></div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="dpSolusiCetak" type="button">Cetak / simpan PDF</button>' +
      '<button class="sakelar" id="dpSolusiPrompt" type="button">Salin prompt flyer</button>' +
      '</div>';
  }

  function promptFlyer() {
    const k = terakhir || konteks();
    return 'Buatkan flyer rencana dana pensiun untuk ' + (k.nama || 'nasabah') +
      ', usia ' + (k.usia !== null ? k.usia : '-') + ' tahun. ' +
      'Produk BeSMART Lite Future, ' + polisAktif.length + ' polis. ' +
      'Total setoran ' + rp(totalSetoran()) + ' per tahun selama ' + polisAktif[0].mpp +
      ' tahun. Dana yang diterima saat usia ' + polisAktif[0].usiaPensiun + ' tahun sebesar ' +
      rp(totalDana()) + '. Sertakan logo PSG, gaya bersih dan profesional, ' +
      'tekankan bahwa setoran berhenti tetapi dana tetap cair di usia pensiun.';
  }

  /* Menyandingkan cara menyiapkan sendiri dengan produk, apa adanya.
     Kelebihan cara manual tetap disebut — menyembunyikannya justru melemahkan
     kepercayaan begitu prospek memikirkannya sendiri. */
  function gambarBandingManual() {
    const w = el('layarDpBandingManual');
    if (!w) return;
    const k = terakhir || konteks();
    if (!k.target) {
      w.innerHTML = '<div class="kop"><h2>Menyiapkan Sendiri vs BeSMART Lite Future</h2>' +
        '<p class="catatan">Hitung dulu kebutuhan dana pensiunnya.</p></div>';
      return;
    }
    if (!polisAktif.length) polisAktif = susunAwal(k);

    /* Banding harus memakai hasil kalkulator LF yang benar-benar sudah dihitung.
       Saat tombol Bandingkan ditekan langsung dari halaman kebutuhan, polisAktif
       baru berisi UP/MPP/usia pensiun tetapi _setoran belum pernah diisi oleh
       kartu solusi. Karena itu total premi sebelumnya terbaca Rp0. Hitung ulang
       setiap polis di sini dengan engine LF yang sama sebelum mengambil angka. */
    polisAktif.forEach(function (p) {
      try {
        const h = hitungSatu(k, p);
        const b = ambilBaris(h, p.usiaPensiun);
        if (b && b.setoran != null) {
          p._setoran = Number(b.setoran) || 0;
          p._up = Number(b.up || p.up) || p.up;
          p._total = Number(b.total) || 0;
        } else {
          p._setoran = 0;
          p._up = Number(p.up) || 0;
          p._total = 0;
        }
      } catch (_) {
        p._setoran = 0;
        p._up = Number(p.up) || 0;
        p._total = 0;
      }
    });

    /* Banding ini sengaja memakai angka inti dari hasil profil/kebutuhan,
       bukan membuat target baru. Target financial tetap k.target; Lite Future
       memakai UP program yang benar-benar terbentuk di polisAktif. */
    const targetFinancial = Number(k.target) || 0;
    const targetProgram = totalDana();
    const tahunSiapkan = Math.max(1, Number(k.lamaSiapkan) || 1);
    const usiaPensiun = Number(k.usiaPensiun) || 0;
    const setoranProduk = totalSetoran();
    const mode = polisAktif[0] && polisAktif[0].setoran === 'Bulanan' ? 'Bulanan' : 'Tahunan';
    const premiBulanan = mode === 'Bulanan' ? setoranProduk : setoranProduk / 11;
    const premiTahunan = mode === 'Bulanan' ? setoranProduk * 12 : setoranProduk;
    const totalProduk = totalDibayar();
    // Cara "menyiapkan sendiri" HARUS mengambil setoran hasil dpHitung terakhir.
    // Sebelumnya dipakai target/(tahun*12), sehingga asumsi pertumbuhan 0%, 3%, dst.
    // tidak pernah memengaruhi halaman perbandingan.
    const manualBulanan = k.setoranBulanan > 0
      ? k.setoranBulanan
      : targetFinancial / (tahunSiapkan * 12);
    const manualTahunan = k.setoranTahunan > 0
      ? k.setoranTahunan
      : manualBulanan * 12;
    const danaTersediaNanti = Number(k.danaTersediaNanti) || 0;
    const pertumbuhan = Number(k.pertumbuhan) || 0;
    const selisihTarget = targetProgram - targetFinancial;

    const targetText = selisihTarget === 0
      ? 'Pas dengan kebutuhan financial.'
      : (selisihTarget > 0
        ? 'Lebih ' + rp(selisihTarget) + ' dari kebutuhan financial.'
        : 'Kurang ' + rp(-selisihTarget) + ' dari kebutuhan financial.');

    w.innerHTML =
      '<div class="kop"><h2>Menyiapkan Sendiri vs BeSMART Lite Future</h2>' +
      '<p>Perbandingan sederhana berdasarkan hasil perhitungan profil nasabah.</p>' +
      '<div class="identitas">' +
      '<div>Nama<b>' + esc(k.nama || '—') + '</b></div>' +
      '<div>Usia sekarang<b>' + (k.usia !== null ? k.usia + ' tahun' : '—') + '</b></div>' +
      '<div>Kebutuhan dana pensiun<b>' + rp(targetFinancial) + '</b></div>' +
      '<div>Usia pensiun<b>' + (usiaPensiun || '—') + ' tahun</b></div>' +
      '<div>Lama menyiapkan<b>' + tahunSiapkan + ' tahun</b></div>' +
      '</div></div>' +

      '<div class="blok"><h2>Angka utama</h2>' +
      '<div class="ikhtisar">' +
      '<div class="kartu"><div class="k">Kebutuhan financial</div><div class="v angka">' + rp(targetFinancial) + '</div></div>' +
      '<div class="kartu"><div class="k">UP BeSMART Lite Future</div><div class="v angka">' + rp(targetProgram) + '</div></div>' +
      '<div class="kartu"><div class="k">Premi Lite Future / bulan (ekuivalen)</div><div class="v angka">' + rp(premiBulanan) + '</div></div>' +
      '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + tahunSiapkan + ' tahun</div></div>' +
      '</div>' +
      '<p class="catatan">' + targetText + '</p></div>' +

      '<div class="blok"><h2>Perbandingan yang penting untuk nasabah</h2>' +
      '<div class="gulir"><table class="tahunan"><thead><tr>' +
      '<th>Hal</th><th class="kanan">Menyiapkan sendiri</th><th class="kanan">BeSMART Lite Future</th></tr></thead><tbody>' +
      brsB('Target dana pensiun', rp(targetFinancial), rp(targetProgram)) +
      brsB('Asumsi pertumbuhan dana', (pertumbuhan * 100).toLocaleString('id-ID') + '% / tahun', '—') +
      brsB('Dana yang sudah tersedia saat pensiun', rp(danaTersediaNanti), '—') +
      brsB('Disisihkan / bulan', rp(manualBulanan), rp(premiBulanan)) +
      brsB('Disisihkan / tahun', rp(manualTahunan), rp(premiTahunan)) +
      brsB('Lama menyiapkan / bayar', tahunSiapkan + ' tahun', tahunSiapkan + ' tahun') +
      brsB('Total dana yang dituju saat usia ' + usiaPensiun,
        rp(targetFinancial), rp(targetProgram)) +
      brsB('Jika meninggal sebelum usia pensiun',
        'Tidak ada manfaat jiwa khusus dari dana yang sedang disiapkan',
        rp(targetProgram) + ' dibayarkan kepada ahli waris sesuai ketentuan polis') +
      brsB('Jika terdiagnosa penyakit kritis sesuai ketentuan',
        'Setoran pribadi tetap harus dilanjutkan',
        'Sisa setoran dibebaskan sesuai ketentuan waiver; target tetap berjalan') +
      '</tbody></table></div></div>' +

      '<div class="blok"><h2>Inti perbedaannya</h2>' +
      '<table class="akt-tabel"><tbody>' +
      brs('Menyiapkan sendiri', 'Fokus pada mengumpulkan dana sebesar kebutuhan. Dana tetap fleksibel untuk digunakan, tetapi hasil akhirnya bergantung pada kedisiplinan dan kondisi finansial.') +
      brs('BeSMART Lite Future', 'Setoran diarahkan menjadi program dana pensiun dengan target UP yang jelas, manfaat meninggal untuk ahli waris, dan pembebasan sisa setoran sesuai ketentuan waiver.') +
      brs('Usia pensiun', 'Keduanya dibandingkan pada usia pensiun ' + usiaPensiun + ' tahun berdasarkan input nasabah.') +
      brs('Catatan UP program', 'UP BeSMART Lite Future dapat sedikit lebih besar dari kebutuhan financial karena mengikuti tier UP yang tersedia.') +
      '</tbody></table></div>' +

      '<div class="blok"><p class="catatan">Angka BeSMART Lite Future diambil dari hasil kalkulator produk dan polis yang sedang dipilih. Perbandingan ini adalah alat bantu percakapan, bukan ilustrasi polis resmi. Manfaat dan pembebasan setoran tunduk pada ketentuan polis dan underwriting.</p></div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="dpBandingCetak" type="button">Cetak / simpan PDF</button>' +
      '<button class="sakelar" id="dpBandingPrompt" type="button">Salin prompt flyer</button>' +
      '</div>';
  }

  function brs(hal, isi) {
    return '<tr><td>' + hal + '</td><td><b>' + isi + '</b></td></tr>';
  }

  function brsB(hal, manual, produk) {
    return '<tr><td>' + hal + '</td>' +
      '<td class="kanan">' + manual + '</td>' +
      '<td class="kanan"><b>' + produk + '</b></td></tr>';
  }

  function promptBanding() {
    const k = terakhir || konteks();
    return 'Buatkan flyer perbandingan untuk ' + (k.nama || 'nasabah') + ', usia ' +
      (k.usia !== null ? k.usia : '-') + ' tahun. Bandingkan dua cara menyiapkan dana ' +
      'pensiun ' + rp(totalDana()) + ': menyiapkan sendiri versus BeSMART Lite Future, ' +
      'keduanya selama ' + (k.lamaSiapkan || '-') + ' tahun. Tonjolkan bahwa dana tetap ' +
      'cair penuh bila terjadi risiko dan setoran dibebaskan bila terdiagnosa penyakit ' +
      'kritis, tetapi sebutkan apa adanya bahwa dananya terikat sampai usia pensiun. ' +
      'Sertakan logo PSG. Saya melampirkan hasil cetak PDF halaman ini sebagai sumber ' +
      'angka dan tampilan.';
  }

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.closest('#dTblSolusi')) {
        terakhir = konteks();
        gambar(true);
        window.bukaLayar('DP_SOLUSI');
        return;
      }
      if (t.closest('#dpSolusiUlang')) { gambar(true); return; }
      if (t.closest('#dTblBandingManual')) {
        terakhir = konteks();
        /* Dibangun ulang juga ketika isiannya berubah, bukan hanya saat
           kosong. Sebelumnya susunan polis lama tetap dipakai sehingga
           perbandingan memakai masa bayar yang sudah tidak berlaku. */
        if (!polisAktif.length || perluBangunUlang(terakhir)) {
          polisAktif = susunAwal(terakhir);
          tandaPolis = tandaKonteks(terakhir);
        }
        if (typeof window.bukaLayar === 'function') window.bukaLayar('DP_BANDING_MANUAL');
        /* Render sesudah layar aktif agar tidak kalah oleh hook navigasi / re-render SPA. */
        try { gambarBandingManual(); } catch (_) {}
        setTimeout(function () { try { gambarBandingManual(); } catch (_) {} }, 30);
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(function () { try { gambarBandingManual(); } catch (_) {} });
        }
        return;
      }
      if (t.closest('#dpBandingCetak')) {
        const asli = document.title;
        document.title = 'Menyiapkan Sendiri vs Lite Future - ' +
          ((terakhir && terakhir.nama) || 'Nasabah');
        window.print();
        setTimeout(function () { document.title = asli; }, 1000);
        return;
      }
      if (t.closest('#dpBandingPrompt')) {
        const teks = promptBanding();
        try {
          if (navigator.clipboard) navigator.clipboard.writeText(teks);
          t.textContent = 'Prompt tersalin';
          setTimeout(function () { t.textContent = 'Salin prompt flyer'; }, 1800);
        } catch (_) {}
        return;
      }
      if (t.closest('#dpSolusiRingkas')) {
        /* Dibuat tahan banting: kalau layarnya belum ada di halaman atau
           belum terdaftar, keduanya disiapkan dulu. Sebelumnya bila salah
           satu belum siap, penanganan berhenti diam-diam dan tombolnya
           terasa seperti tidak bisa diklik. */
        try {
          if (!el('layarDpSolusiRingkas')) {
            const sec = document.createElement('section');
            sec.className = 'layar';
            sec.id = 'layarDpSolusiRingkas';
            const induk = el('layarDpSolusi');
            if (induk && induk.parentNode) induk.parentNode.insertBefore(sec, induk.nextSibling);
            else document.body.appendChild(sec);
          }
          daftarkanLayar();
          gambarRingkas();
        } catch (err) {
          const w = el('layarDpSolusiRingkas');
          if (w) w.innerHTML = '<div class="blok"><p class="catatan akt-peringatan">' +
            'Ringkasan gagal disusun. Coba tekan Hitung lagi di halaman sebelumnya.</p></div>';
        }
        if (typeof window.bukaLayar === 'function') window.bukaLayar('DP_SOLUSI_RINGKAS');
        return;
      }
      if (t.closest('#dpSolusiCetak')) {
        const asli = document.title;
        document.title = 'Rencana Dana Pensiun - ' + ((terakhir && terakhir.nama) || 'Nasabah');
        window.print();
        setTimeout(function () { document.title = asli; }, 1000);
        return;
      }
      if (t.closest('#dpSolusiPrompt')) {
        const teks = promptFlyer();
        try {
          if (navigator.clipboard) navigator.clipboard.writeText(teks);
          else {
            const ta = document.createElement('textarea');
            ta.value = teks; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
          }
          t.textContent = 'Prompt tersalin';
          setTimeout(function () { t.textContent = 'Salin prompt flyer'; }, 1800);
        } catch (_) {}
        return;
      }
    });

    /* Mengubah isian satu kartu hanya menghitung ulang kartu itu, supaya
       pilihan di kartu lain tidak ikut tersetel ulang. */
    document.addEventListener('change', function (e) {
      const t = e.target;
      if (!(t instanceof Element) || !t.hasAttribute('data-dp')) return;
      const i = +t.dataset.i;
      const p = polisAktif[i];
      if (!p) return;
      const bidang = t.dataset.dp;
      if (bidang === 'setoran') p.setoran = t.value;
      else p[bidang] = +t.value;

      const k = terakhir || konteks();
      const kotak = document.querySelector('[data-hasil="' + i + '"]');
      if (kotak) kotak.innerHTML = hasilKartu(k, p);
      segarkanGabungan(k);
    });
  }

  /* Hanya bagian gabungan dan sorotan yang diperbarui, supaya isian yang
     sedang dipegang agen tidak tergambar ulang. */
  function segarkanGabungan(k) {
    const w = el('layarDpSolusi');
    if (!w) return;
    const dana = totalDana(), selisih = dana - (k.target || 0);
    const sorot = w.querySelector('.sorotan');
    if (sorot) {
      const nilai = sorot.querySelector('.v');
      const ket = sorot.querySelector('.t');
      if (nilai) nilai.textContent = rp(dana);
      if (ket) {
        ket.textContent = 'Dari ' + polisAktif.length + ' polis. ' +
          (selisih === 0 ? 'Pas dengan target.'
            : (selisih > 0 ? 'Lebih ' + rp(selisih) + ' dari target ' + rp(k.target) + '.'
              : 'Kurang ' + rp(-selisih) + ' dari target ' + rp(k.target) + '.'));
      }
    }
    const baris = w.querySelectorAll('.akt-tabel tbody tr');
    if (baris.length >= 2) {
      const a = baris[baris.length - 2].querySelectorAll('td');
      const b = baris[baris.length - 1].querySelectorAll('td');
      if (a.length > 1) a[1].innerHTML = '<b>' + rp(totalSetoran()) + '</b>';
      if (b.length > 1) b[1].innerHTML = '<b>' + rp(dana) + '</b>';
    }
  }

  /* Tombol Solusi diletakkan paling bawah, tepat di bawah tombol ringkasan
     kebutuhan — bukan menempel pada kotak angka target. Urutannya mengikuti
     alur percakapan: pahami kebutuhannya dulu, baru cari solusinya. */
  function pasangTombol() {
    const acuan = el('dTblRingkas');
    const kotak = el('dHasil');
    if (!acuan || document.getElementById('dTblSolusi')) return;
    if (!kotak || !kotak.innerHTML || kotak.querySelector('.peringatan')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'aksi tanpa-cetak';
    b.id = 'dTblSolusi';
    b.style.marginTop = '10px';
    b.textContent = 'Solusi — penuhi dengan Lite Future';
    acuan.insertAdjacentElement('afterend', b);

    /* Tombol kedua: menyandingkan cara menyiapkan sendiri dengan produk.
       Diletakkan tepat di bawah tombol solusi karena itulah urutan
       percakapannya — lihat solusinya dulu, lalu bandingkan dengan cara yang
       selama ini dibayangkan prospek. */
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'sakelar tanpa-cetak';
    c.id = 'dTblBandingManual';
    c.style.marginTop = '8px';
    c.textContent = 'Bandingkan cara manual dengan Lite Future';
    b.insertAdjacentElement('afterend', c);
  }

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    pasang();
    // Tombol dipasang ulang tiap kali hasil kebutuhan digambar ulang.
    if (typeof MutationObserver === 'function') {
      const kotak = el('dHasil');
      if (kotak) {
        let sibuk = false;
        const pengamat = new MutationObserver(function () {
          if (sibuk) return;
          sibuk = true;
          try { pasangTombol(); } catch (_) {}
          pengamat.takeRecords();
          sibuk = false;
        });
        pengamat.observe(kotak, { childList: true });
      }
    }
    pasangTombol();
  }

  window.InsuranceHubDpSolusi = { pecah, gambar, gambarRingkas, konteks };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 160);
  }
})();
