/* Insurance Hub — application layer.
 * Phase 1 refactor: calculation/UI behavior preserved from the working build.
 * Future product engines can be extracted from this file incrementally.
 */

// Rider Waiver (pembebasan kontribusi) pada produk Gen Aman.
// Tarif per Rp100 juta UP Dasar, dibedakan menurut masa bayar dan jenis
// kelamin, diambil dari kolom WAIVER pada master Gen Syariah.
// Preminya mengikuti tier diskon yang sama dengan UP Dasar.
function waiverHitung(usia, mpp, jk, upDasar, diskon) {
  const tabel = DATA_WAIVER[String(mpp)];
  const baris = tabel ? tabel[String(jk).toUpperCase()] : null;
  const tarif = baris ? baris[String(usia)] : null;
  if (!tarif) {
    return { sah: false, alasan: 'Tarif waiver untuk usia ' + usia + ' dengan masa bayar '
      + mpp + ' tahun tidak ada di database.' };
  }
  /* v90 mempertahankan hasil TAHUNAN yang sudah sesuai baseline, tetapi
     tarif BULANAN harus kembali memakai tarif database asli. Karena angka
     tahunan baseline sebelumnya berasal dari tarif terkoreksi 11/12 lalu
     dikalikan 11, kedua basis ini sengaja dihitung terpisah.

     BULANAN  : tarif database asli × UP × (1-diskon)
     TAHUNAN  : tarif database × 11/12 × UP × (1-diskon) × 11

     Dengan contoh usia 39, pria, MPP 5, UP 12,5 M, diskon 45%:
     bulanan = Rp1.972.162,50 → Rp1.972.163.
     Formula tahunan baseline tidak diubah.

     JANGAN "diperbaiki" menjadi tahunan = bulanan × 11.
     Rasio tahunan/bulanan waiver memang 10,0833 dan berbeda dari ×11 yang
     dipakai kontribusi dasar serta produk lain. Itu BUKAN kekeliruan: kedua
     angka sudah dicocokkan terpisah — bulanan ke tarif master, tahunan ke
     ilustrasi resmi Generali. Menyamakannya ke ×11 akan menaikkan premi
     waiver tahunan 9,09% dan membuatnya menyimpang dari ilustrasi resmi. */
  const KOREKSI_WAIVER_TAHUNAN = 11 / 12;
  const sebelumDiskonBulanan = tarif * upDasar / 100000000;
  const bulanan = sebelumDiskonBulanan * (1 - diskon);
  const tarifTahunan = tarif * KOREKSI_WAIVER_TAHUNAN;
  const sebelumDiskonTahunan = tarifTahunan * upDasar / 100000000;
  const tahunan = sebelumDiskonTahunan * (1 - diskon) * 11;
  return { sah: true, tarif: tarif, tarifTabel: tarif,
           tarifTahunan: tarifTahunan, sebelumDiskon: sebelumDiskonBulanan,
           sebelumDiskonTahunan: sebelumDiskonTahunan, diskon: diskon,
           bulanan: bulanan, tahunan: tahunan };
}



// Rider kesehatan GHPS pada produk Gen Aman.
// Tarif diambil dari kolom GHPS 'TABEL GSPA 5' pada master Gen Syariah.
// Tiga sifatnya, semuanya sudah diperiksa terhadap seluruh baris tabel:
// tidak membedakan pria dan wanita, tidak bergantung masa bayar, dan tidak
// mendapat diskon seperti santunan dasar. Yang dibatasi hanya usia masuknya,
// mengikuti batas masa bayar santunan dasar.
function ghpsHitung(usia, mpp, plan) {
  const batas = DATA_GHPS.batasUsia[String(mpp)];
  if (!batas) return { sah: false, alasan: 'Masa bayar tidak dikenal.' };
  if (usia > batas) {
    return { sah: false, alasan: 'Usia ' + usia + ' melebihi batas usia masuk ' + batas
      + ' tahun untuk masa bayar ' + mpp + ' tahun.' };
  }
  const baris = DATA_GHPS.tarif[String(usia)];
  const bulanan = baris ? baris[plan] : null;
  if (!bulanan) return { sah: false, alasan: 'Tarif GHPS untuk usia ' + usia + ' tidak ada.' };
  return { sah: true, plan: plan, bulanan: bulanan, tahunan: bulanan * 11 };
}

/* Mesin BSL yang dipakai adalah src/engines/besmartLiteLengkap.js (bsl2Hitung)
 * dengan tabel TARIF_BSL_LENGKAP — masa bayar 3, 5, 10, 15, dan 20 tahun.
 * Mesin lama src/engines/besmartLite.js sudah dihapus karena tidak pernah
 * dipanggil dan tabelnya hanya memuat masa bayar 3 dan 5.
 */

/* Cristal Prime calculation engine is maintained in src/engines/cristalPrime.js.
 * The application layer only prepares inputs and renders the result.
 */

/* New Cemerlang Prime calculation engine is maintained in src/engines/newCemerlangPrime.js.
 * The application layer only prepares inputs and renders the result.
 */



/* ============ New Cemerlang Prime ============ */
el('mUP').addEventListener('input', () => {
  const kotak = el('mUP');
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  mGambar();
});
['mNama', 'mTgl', 'mAgenNama', 'mAgenHP'].forEach(id =>
  el(id).addEventListener('input', mGambar));
['mJK', 'mBayar', 'mLindung', 'mMetode'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.disabled || b.getAttribute('aria-disabled') === 'true') return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  mSesuaikanPilihan();
  mGambar();
}));

/* Kombinasi New Cemerlang Prime yang tidak dijual dimatikan tombolnya, bukan
   dibiarkan lalu berhenti dengan pesan. Daftarnya dibaca dari tabel tarif,
   sehingga tidak ada aturan yang perlu diingat di dua tempat: kombinasi yang
   kolomnya kosong di database otomatis tidak bisa dipilih. NCP 3-15 adalah
   satu-satunya yang kosong saat ini — produk itu memang tidak dijual. */
function mKombinasiAda(bayar, lindung) {
  try {
    if (typeof TARIF_CEM === 'undefined' || !TARIF_CEM) return true;
    const kode = 'NCP ' + bayar + '-' + lindung;
    return Object.keys(TARIF_CEM).some(u => {
      const v = TARIF_CEM[u] ? TARIF_CEM[u][kode] : null;
      return v != null && v !== 0;
    });
  } catch (_) { return true; }
}

function mSesuaikanPilihan() {
  const boxBayar = el('mBayar'), boxLindung = el('mLindung');
  if (!boxBayar || !boxLindung) return;
  const bayar = nilaiSegmen('mBayar');
  let aktifMasihSah = false, gantiKe = null;
  boxLindung.querySelectorAll('button').forEach(b => {
    const sah = mKombinasiAda(bayar, b.dataset.nilai);
    b.disabled = !sah;
    b.setAttribute('aria-disabled', sah ? 'false' : 'true');
    b.style.opacity = sah ? '' : '0.4';
    b.title = sah ? '' : 'Kombinasi ' + bayar + '-' + b.dataset.nilai + ' tidak tersedia';
    if (sah && !gantiKe) gantiKe = b;
    if (sah && b.getAttribute('aria-pressed') === 'true') aktifMasihSah = true;
  });
  if (!aktifMasihSah && gantiKe) {
    boxLindung.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === gantiKe));
  }
}

function mGambar() {
  const tgl = el('mTgl').value;
  const up = bAngka(el('mUP').value);
  const inp = {
    nama: el('mNama').value,
    jk: nilaiSegmen('mJK'),
    tglLahir: tgl ? new Date(tgl + 'T00:00:00Z') : null,
    lamaBayar: +nilaiSegmen('mBayar'),
    lamaLindung: +nilaiSegmen('mLindung'),
    metode: nilaiSegmen('mMetode'),
    up: up,
  };
  mAturan();

  if (!tgl || !up) {
    el('mInfoUsia').textContent = !tgl
      ? 'Isi tanggal lahir untuk menghitung usia.'
      : 'Isi uang pertanggungan untuk melihat premi.';
    ['mHasil', 'mFase', 'mFaseIlus', 'mIdentitas', 'mKotakRingkas', 'mTabel', 'mKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('mSangkalan').textContent = '';
    el('mCatatanTabel').textContent = '';
    return;
  }

  const r = InsuranceHubEngine.calculate('NCP', inp, { rates: TARIF_CEM });
  const satuan = inp.metode === 'Bulanan' ? 'bulan' : 'tahun';
  el('mInfoUsia').textContent = 'Usia ' + r.usia + ' tahun'
    + (inp.nama ? ' \u2022 ' + inp.nama : '');

  if (!r.tersedia) {
    el('mHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    ['mFase', 'mFaseIlus', 'mIdentitas', 'mKotakRingkas', 'mTabel', 'mKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('mSangkalan').textContent = '';
    el('mCatatanTabel').textContent = '';
    return;
  }

  el('mHasil').innerHTML =
    '<div class="sorotan"><div class="k">Yang dibayar nasabah</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + ' <small>/' + satuan + '</small></div>'
    + '<div class="t">Dibayar selama ' + inp.lamaBayar + ' tahun, perlindungan berjalan '
    + inp.lamaLindung + ' tahun. Total ' + rp(r.totalDibayar) + '.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Kontribusi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + '</div></div>'
    + '<div class="kartu"><div class="k">Meninggal sebab apa pun</div>'
    + '<div class="v angka">' + rp(r.meninggal) + '</div></div>'
    + '<div class="kartu"><div class="k">Meninggal karena kecelakaan</div>'
    + '<div class="v angka">' + rp(r.meninggalKecelakaan) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Premi kembali di akhir kontrak ('
    + Math.round(r.rop * 100) + '%)</div>'
    + '<div class="v angka">' + rp(r.akhirKontrak) + '</div>'
    + '<div class="k" style="margin-top:6px">Selisih terhadap total premi: <b>'
    + rp(r.akhirKontrak - r.totalDibayar) + '</b></div></div>'
    + '<div class="kartu penuh"><div class="k">Kode plan</div>'
    + '<div class="v">' + esc(r.kodePlan) + '</div>'
    + '<div class="k" style="margin-top:6px">Tarif dasar per Rp1 miliar: <b>'
    + rp(r.tarifDasar) + '</b></div></div></div>';

  const fase =
    '<div class="tahap"><b>Tahun 1 sampai ' + inp.lamaBayar + '</b>'
    + '<span>Membayar ' + rp(r.premiSesuaiMetode) + ' per ' + satuan
    + '. Total ' + rp(r.totalDibayar) + '.</span></div>'
    + '<div class="tahap tenang"><b>Tahun ' + (inp.lamaBayar + 1) + ' sampai '
    + inp.lamaLindung + '</b>'
    + '<span>Tidak ada pembayaran lagi, perlindungan tetap berjalan.</span></div>'
    + '<div class="tahap"><b>Kalau meninggal dalam masa perlindungan</b>'
    + '<span>Dibayar ' + rp(r.meninggal) + ' untuk sebab apa pun, atau '
    + rp(r.meninggalKecelakaan) + ' kalau karena kecelakaan.</span></div>'
    + '<div class="tahap"><b>Di akhir tahun ke-' + inp.lamaLindung + '</b>'
    + '<span>Premi dikembalikan ' + rp(r.akhirKontrak) + ', setara '
    + Math.round(r.rop * 100) + '% dari total premi yang dibayarkan.</span></div>';
  el('mFase').innerHTML = fase;
  el('mFaseIlus').innerHTML = fase;

  el('mIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(inp.nama || '\u2014') + '</b></div>'
    + '<div>Usia<b>' + r.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + '<div>Plan<b>NCP ' + inp.lamaBayar + '-' + inp.lamaLindung + '</b></div>';

  el('mKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + '</div></div>'
    + '<div class="kartu"><div class="k">' + (inp.metode === 'Bulanan' ? 'Premi per Tahun' : 'Premi Tahunan') + '</div>'
    + '<div class="v angka">' + rp(r.premiPerTahun) + '</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + inp.lamaBayar + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Total dibayar</div>'
    + '<div class="v angka">' + rp(r.totalDibayar) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Premi kembali di akhir kontrak</div>'
    + '<div class="v angka">' + rp(r.akhirKontrak) + '</div>'
    + '<div class="k" style="margin-top:6px">Perlindungan jiwa selama kontrak: <b>'
    + rp(r.meninggal) + '</b></div></div></div>';

  el('mTabel').innerHTML =
    '<thead><tr><th>Thn</th><th class="kanan">Premi setahun</th>'
    + '<th class="kanan">Premi kembali</th>'
    + '<th class="kanan">Meninggal sebab apa pun</th>'
    + '<th class="kanan">Meninggal kecelakaan</th></tr></thead><tbody>'
    + r.ilustrasi.map(b =>
        '<tr class="' + (b.premi ? 'bayar' : '') + (b.pengembalian ? ' tandai' : '') + '">'
        + '<td>' + b.tahun + '</td>'
        + '<td class="kanan angka">' + (b.premi ? rp(b.premi) : '\u2014') + '</td>'
        + '<td class="kanan angka">' + (b.pengembalian ? rp(b.pengembalian) : '\u2014') + '</td>'
        + '<td class="kanan angka">' + rp(b.meninggal) + '</td>'
        + '<td class="kanan angka">' + rp(b.meninggalKecelakaan) + '</td></tr>').join('')
    + '<tr class="tandai"><td>Total</td>'
    + '<td class="kanan angka">' + rp(r.totalPremiIlustrasi) + '</td>'
    + '<td class="kanan angka">' + rp(r.akhirKontrak) + '</td><td></td><td></td></tr></tbody>';

  el('mCatatanTabel').textContent = 'Tabel memuat ' + inp.lamaLindung + ' tahun kontrak. '
    + 'Kolom premi memakai angka setahun '
    + (inp.metode === 'Bulanan' ? '(premi bulanan dikali 12).' : '(premi tahunan).');

  el('mSangkalan').textContent = 'Ilustrasi ini dihitung dari tarif yang berlaku saat ini dan '
    + 'dipakai untuk membantu penjelasan produk kepada calon nasabah. Bukan bagian dari polis '
    + 'dan tidak mengikat secara hukum. Nilai final tunduk pada Ketentuan Polis resmi '
    + 'PT Asuransi Jiwa Generali Indonesia dan hasil underwriting.';

  const na = el('mAgenNama').value, hp = el('mAgenHP').value;
  el('mKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function mAturan() {
  el('mAturan').innerHTML =
  '<details><summary>Cara premi dihitung</summary><div class="isi"><ul>'
  + '<li>Tarif dasar diambil dari database New Cemerlang Prime sesuai usia, lama bayar, dan lama perlindungan, dinyatakan per Rp1 miliar uang pertanggungan.</li>'
  + '<li>Berbeda dari produk lain, tarif Cemerlang Prime tidak membedakan pria dan wanita.</li>'
  + '<li>Premi bulanan = uang pertanggungan dibagi Rp1 miliar, dikali tarif dasar.</li>'
  + '<li>Premi tahunan dihitung 11 kali premi bulanan.</li>'
  + '<li>Database memuat usia 0 sampai 70 tahun.</li>'
  + '</ul></div></details>'

  + '<details><summary>Manfaat polis</summary><div class="isi"><ul>'
  + '<li>Meninggal karena sebab apa pun dibayar sebesar uang pertanggungan.</li>'
  + '<li>Meninggal karena kecelakaan dibayar dua kali lipat, tetapi tambahannya dibatasi Rp2 miliar. Jadi untuk UP di atas Rp2 miliar, manfaatnya UP ditambah Rp2 miliar, bukan dikali dua.</li>'
  + '<li>Jika kontrak selesai, premi dikembalikan: 120% untuk 15 tahun, 135% untuk 20 tahun, 150% untuk 25 tahun, dihitung dari total premi yang dibayarkan.</li>'
  + '<li>Nilai pengembalian mengikuti metode bayar yang dipilih, karena total premi bulanan dan tahunan berbeda.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas kalkulator ini</summary><div class="isi"><ul>'
  + '<li>Plan NCP 3-15 tidak tersedia: kolom tarifnya kosong di database untuk semua usia.</li>'
  + '<li>Plan dengan perlindungan 25 tahun tidak tersedia untuk usia 66 sampai 70.</li>'
  + '<li>Pada kombinasi tersebut file Excel menampilkan premi Rp 0. Di sini sengaja dihentikan dengan pesan, supaya angka nol tidak terbaca sebagai gratis.</li>'
  + '</ul></div></details>';
}

mGambar();


/* ============ Kombinasi GSPA + Lite Future ============ */
el('kPensiun').innerHTML = USIA_PENSIUN
  .map(a => '<option value="' + a + '"' + (a === 60 ? ' selected' : '') + '>Usia ' + a + '</option>').join('');
el('kMppL').innerHTML = [3, 5, 10, 15, 20]
  .map(m => '<option value="' + m + '"' + (m === 5 ? ' selected' : '') + '>' + m + ' tahun</option>').join('');
el('kUpL').innerHTML = META.tierUP
  .map(v => '<option value="' + v + '"' + (v === 1000000000 ? ' selected' : '') + '>' + rp(v) + '</option>').join('');

el('kUpG').addEventListener('input', () => {
  const kotak = el('kUpG');
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  kGambar();
});
['kNama', 'kTgl', 'kPensiun', 'kMppL', 'kUpL', 'kAgenNama', 'kAgenHP'].forEach(id =>
  el(id).addEventListener('input', kGambar));
['kJK', 'kMppG', 'kMetG', 'kMetL'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  kGambar();
}));

/* Dua fungsi bantu milik perhitungan Kombinasi, ikut hilang saat pemecahan
   berkas. Dipulihkan apa adanya dari index.legacy.html. */
/* Baris "Disajikan oleh" di kaki dokumen.
   Kolom nama agen pada sebagian layar ringkasan tidak selalu sempat terisi
   sebelum dokumen digambar, sehingga dulu muncul pesan "Isi nama dan kontak
   agen..." padahal Kartu Konsultan sudah lengkap. Sekarang Kartu Konsultan
   dipakai sebagai cadangan — dan karena dibaca lewat
   InsuranceHubConsultantCard.read(), mode "dibuat untuk agen lain" ikut
   berlaku di sini. Pesan lama hanya muncul kalau memang belum ada identitas
   sama sekali. */
function kakiAgenHtml(na, hp) {
  let nama = String(na || '').trim();
  let kontak = String(hp || '').trim();
  if (!nama || !kontak) {
    try {
      const k = (window.InsuranceHubConsultantCard && window.InsuranceHubConsultantCard.read()) || {};
      let a = {};
      try { a = JSON.parse(localStorage.getItem('insuranceHub.agen.v1') || '{}') || {}; } catch (_) {}
      let l = {};
      try { l = JSON.parse(localStorage.getItem('insuranceHub.level.v1') || '{}') || {}; } catch (_) {}
      if (!nama) nama = String(k.nama || a.nama || l.namaAgen || '').trim();
      if (!kontak) kontak = String(k.whatsapp || a.hp || '').trim();
    } catch (_) {}
  }
  if (!nama && !kontak) return 'Isi nama dan kontak agen di layar kalkulator agar tampil di sini.';
  return 'Disajikan oleh <b>' + esc(nama || '\u2014') + '</b>'
    + (kontak ? ' \u2022 <b>' + esc(kontak) + '</b>' : '');
}

function gspaDiskon(up, aturan) {
  let d = 0;
  for (const [batas, nilai] of aturan) if (up >= batas) d = nilai;
  return d;
}

function gspaBooster(upGSPA, usia, usiaPensiun) {
  const periode = Math.max(0, Math.floor((usiaPensiun - usia) / 5));   // O2
  return { periode, nilai: upGSPA * periode * 0.075 };
}

/* Perhitungan Kombinasi Gen Aman + Lite Future.
   Fungsi ini hilang saat berkas dipecah dari versi lama, sehingga tombol
   hitung di kotak Kombinasi tidak menghasilkan apa-apa dan kotak booster
   tampil kosong. Dipulihkan apa adanya dari index.legacy.html. */
function kombinasiHitung(inp, gspa, tarifLF, hariIni) {
  const usia = inp.usia != null ? inp.usia : usiaDari(inp.tglLahir, hariIni);
  const out = { usia, gspa: {}, lf: {}, total: {}, catatan: [] };

  // ---------- Bagian GSPA ----------
  /* Dulu layar Kombinasi memakai TARIF_GSPA dan layar GSPA memakai DATA_GSPA:
     dua salinan tarif yang isinya identik (396 sel, nol selisih) tapi bisa
     terpisah kalau salah satu diperbarui. Sekarang keduanya membaca
     DATA_GSPA, jadi hanya ada satu sumber tarif Gen Aman. */
  const tabel = gspa.dasar[String(inp.mppGSPA)];
  const tarifGSPA = tabel && tabel[String(inp.jk).toUpperCase()]
    ? tabel[String(inp.jk).toUpperCase()][String(usia)] : null;      // B17

  if (!tarifGSPA) {
    out.gspa.tersedia = false;
    out.gspa.alasan = 'Tarif GSPA untuk usia ' + usia + ' dengan masa bayar '
      + inp.mppGSPA + ' tahun tidak ada di database.';
  } else {
    const sebelumDiskon = tarifGSPA * inp.upGSPA / 100000000;         // B18
    const diskon = gspaDiskon(inp.upGSPA, gspa.diskon);              // B19
    const bulanan = sebelumDiskon * (1 - diskon);                    // B20
    const tahunan = bulanan * 11;                                    // B21

    // Pada kombinasi GSPA + Lite Future, Waiver Gen Aman sejak awal
    // merupakan bagian dari premi GSPA (bukan toggle terpisah). Gunakan
    // helper yang sama agar tarif bulanan kembali ke database asli,
    // sementara formula tahunan tetap mengikuti baseline v90.
    const pakaiWaiver = inp.pakaiWaiverGSPA !== false;
    const waiver = (pakaiWaiver && typeof waiverHitung === 'function')
      ? waiverHitung(usia, inp.mppGSPA, inp.jk, inp.upGSPA, diskon)
      : {sah:false, alasan: pakaiWaiver ? 'Perhitungan Waiver tidak tersedia.' : 'Waiver tidak diambil.'};
    const waiverBulanan = waiver && waiver.sah ? Math.round(Number(waiver.bulanan || 0)) : 0;
    const waiverTahunan = waiver && waiver.sah ? Math.round(Number(waiver.tahunan || 0)) : 0;
    out.gspa = {
      tersedia: true, tarif: tarifGSPA, sebelumDiskon, diskon, bulanan, tahunan,
      waiver: waiver, pakaiWaiver: pakaiWaiver,
      premiWaiverBulanan: waiverBulanan, premiWaiverTahunan: waiverTahunan,
      /* Dasar tanpa waiver — inilah yang dibebaskan bila terjadi klaim. */
      dasarPerTahunTanpaWaiver: inp.metodeGSPA === 'Tahunan' ? tahunan : bulanan * 12,
      bulananGabungan: bulanan + waiverBulanan,
      tahunanGabungan: tahunan + waiverTahunan,
      // B22: apa pun metodenya, angka ini sudah disetahunkan
      sesuaiMetode: inp.metodeGSPA === 'Tahunan' ? tahunan + waiverTahunan : (bulanan + waiverBulanan) * 12,
      perTahun: inp.metodeGSPA === 'Tahunan' ? tahunan + waiverTahunan : (bulanan + waiverBulanan) * 12,
      // yang benar-benar dibayar tiap kali setor
      perSetoran: inp.metodeGSPA === 'Tahunan' ? tahunan + waiverTahunan : bulanan + waiverBulanan,
      santunan: inp.upGSPA,                                          // B23
      totalDibayar: (tahunan + waiverTahunan) * inp.mppGSPA,         // termasuk Waiver
    };
  }

  // ---------- Bagian Lite Future ----------
  const booster = gspaBooster(inp.upGSPA, usia, inp.usiaPensiun);
  out.booster = booster;

  const sheet = 'LF' + (inp.metodeLF === 'Bulanan' ? 'B' : 'T')
    + ' ' + inp.mppLF + '-' + inp.usiaPensiun;                        // O22
  out.lf.sheet = sheet;                       // O22 selalu terbentuk
  const barisLF = tarifLF[sheet] ? tarifLF[sheet][String(usia)] : null;
  const tarif = barisLF ? barisLF[inp.jk === 'PRIA' ? 'P' : 'W'] : null;

  if (!tarif) {
    out.lf.tersedia = false;
    out.lf.alasan = 'Data premi Lite Future tidak tersedia untuk kombinasi usia '
      + usia + ', masa bayar ' + inp.mppLF + ' tahun, dan usia pensiun '
      + inp.usiaPensiun + '. Coba masa bayar atau usia pensiun lain.';
  } else {
    const pengali = inp.upLF / 100000000;                            // O25
    const potongan = inp.upLF >= 1000000000 ? 0.95 : 1;              // O26
    const mentah = Math.round((tarif[0] + tarif[1]) * pengali * potongan);  // O27
    const batasMin = inp.metodeLF === 'Bulanan' ? 300000 : 3300000;  // E18
    if (mentah < batasMin) {
      out.lf.tersedia = false;
      out.lf.alasan = 'Setoran Lite Future di bawah batas minimum '
        + (inp.metodeLF === 'Bulanan' ? 'Rp 300.000 per bulan' : 'Rp 3.300.000 per tahun') + '.';
    } else {
      /* Waiver Lite Future WAJIB, jadi selalu ikut di setoran. Bagian dasar
         dipisahkan di sini karena itulah yang dibebaskan bila terjadi klaim
         — premi waiver sendiri tetap dibayar. */
      const lfDasar = Math.round(tarif[0] * pengali * potongan);
      const lfWaiver = Math.max(0, mentah - lfDasar);
      out.lf = {
        tersedia: true, tarifUP: tarif[0], tarifWaiver: tarif[1], sheet: sheet,
        up: inp.upLF, setoran: mentah,                                // E18
        premiDasar: lfDasar, premiWaiver: lfWaiver,
        dasarPerTahunTanpaWaiver: inp.metodeLF === 'Tahunan' ? lfDasar : lfDasar * 12,
        totalBayar: inp.metodeLF === 'Bulanan'                        // E19
          ? mentah * 12 * inp.mppLF : mentah * inp.mppLF,
        perTahun: inp.metodeLF === 'Tahunan' ? mentah : mentah * 12,  // E20
      };
    }
  }

  // ---------- Gabungan ----------
  if (out.gspa.tersedia && out.lf.tersedia) {
    out.total.perTahun = out.gspa.perTahun + out.lf.perTahun;   // annualized display follows selected frequency
    out.total.keseluruhan = (out.gspa.perTahun * inp.mppGSPA) + out.lf.totalBayar;  // total actual payments over each selected payment term
    out.status = 'OK';
  } else {
    out.status = out.gspa.alasan || out.lf.alasan;                    // E26
  }
  return out;
}

/* Kombinasi dijual sebagai satu program, jadi ringkasannya menampilkan
   manfaat kedua produk dalam satu daftar, bukan dua ilustrasi terpisah. */
function gambarManfaatKombinasi(inp, r) {
  const wadah = el('kManfaatGabungan');
  if (!wadah) return;

  const upG = Number(inp.upGSPA || 0);
  const upL = Number(inp.upLF || 0);
  const usia = Number(r.usia || 0);
  const pensiun = Number(inp.usiaPensiun || 0);
  const b = r.booster || {};

  // Nilai Gen Aman mengikuti mesin produk: kenaikan 7,5% dari UP Dasar
  // setiap 5 tahun, dengan maksimum kenaikan kumulatif +150% dari UP Dasar.
  const boosterPersenPadaUsia = (targetUsia) =>
    Math.min(1.5, Math.max(0, Math.floor((targetUsia - usia) / 5) * 0.075));
  const upGenPadaUsia = (targetUsia) =>
    upG * (1 + boosterPersenPadaUsia(targetUsia));

  const upGenPensiun = upGenPadaUsia(pensiun);
  const upGenUsia100 = upGenPadaUsia(100);
  const boosterPensiun = upGenPensiun - upG;

  const tTransportasi = Math.min(upG, 2000000000);
  const tLuarNegeri = Math.min(upG * 0.10, 500000000);
  const tHaji = Math.min(upG, 1000000000);

  // Satu angka utama untuk skenario meninggal sebelum pensiun mengikuti
  // formula kombinasi yang sudah ada: Gen Aman + booster yang sudah terbentuk
  // + manfaat Lite Future.
  const meninggalSebelumPensiun = upGenPensiun + upL;

  wadah.innerHTML =
    '<div class="kmb-manifesto">'
    + '<div class="kmb-eyebrow">SATU PROGRAM · DUA TUJUAN</div>'
    + '<div class="kmb-lead">Proteksi jiwa tetap berjalan, sambil menyiapkan dana yang cair di usia pensiun.</div>'
    + '</div>'

    + '<div class="kmb-hero-grid">'
    + '<div class="kmb-hero-card"><div class="kmb-label">PROTEKSI JIWA GEN AMAN</div>'
    + '<div class="kmb-big">' + rp(upG) + '</div>'
    + '<div class="kmb-small">UP Dasar · berlaku sampai usia 100</div></div>'
    + '<div class="kmb-hero-card accent"><div class="kmb-label">DANA PENSIUN LITE FUTURE</div>'
    + '<div class="kmb-big">' + rp(upL) + '</div>'
    + '<div class="kmb-small">Cair 100% di usia ' + pensiun + ' bila tertanggung hidup sampai usia pensiun</div></div>'
    + '</div>'

    + '<h3>Bagaimana satu program ini bekerja?</h3>'
    + '<div class="kmb-timeline">'
    + '<div class="kmb-step"><span class="kmb-dot">1</span><div><b>Saat ini → sebelum pensiun</b>'
    + '<p>Gen Aman memberikan proteksi jiwa. UP bertambah <b>7,5% dari UP Dasar setiap 5 tahun</b> tanpa tambahan premi untuk booster tersebut.</p></div></div>'
    + '<div class="kmb-step"><span class="kmb-dot">2</span><div><b>Usia ' + pensiun + ' → dana pensiun cair</b>'
    + '<p>Lite Future mencairkan <strong>' + rp(upL) + '</strong>. Pada saat yang sama, Gen Aman <strong>tidak ikut berhenti</strong> dan tetap memberikan proteksi sebesar <strong>' + rp(upGenPensiun) + '</strong>.</p></div></div>'
    + '<div class="kmb-step"><span class="kmb-dot">3</span><div><b>Setelah dana pensiun cair → Gen Aman tetap berjalan</b>'
    + '<p>Proteksi Gen Aman terus mengikuti mekanisme booster sampai usia 100. Potensi proteksi Gen Aman pada usia 100 mencapai <strong>' + rp(upGenUsia100) + '</strong>.</p></div></div>'
    + '</div>'

    + '<div class="kmb-highlight">'
    + '<div><div class="kmb-label">FITUR KHAS GEN AMAN</div><div class="kmb-big">+7,5%</div>'
    + '<div class="kmb-small">kenaikan UP setiap 5 tahun · maksimum kenaikan kumulatif +150% dari UP Dasar</div></div>'
    + '<div class="kmb-highlight-number"><span>UP Gen Aman di usia ' + pensiun + '</span><b>' + rp(upGenPensiun) + '</b>'
    + '<small>termasuk booster ' + rp(boosterPensiun) + '</small></div>'
    + '</div>'

    + '<h3>Manfaat bila terjadi risiko</h3>'
    + '<div class="kmb-benefit-grid">'
    + '<div class="kmb-benefit"><div class="kmb-label">MENINGGAL SEBELUM PENSIUN</div><b>hingga ' + rp(meninggalSebelumPensiun) + '</b>'
    + '<span>Jika terjadi tepat sebelum usia pensiun: Gen Aman ' + rp(upGenPensiun) + ' + Lite Future ' + rp(upL) + '. Sebelum itu, nilai Gen Aman mengikuti booster yang sudah terbentuk saat kejadian.</span></div>'
    + '<div class="kmb-benefit"><div class="kmb-label">HIDUP SAMPAI PENSIUN</div><b>' + rp(upL) + '</b>'
    + '<span>Lite Future cair 100% di usia ' + pensiun + '. Gen Aman tetap aktif sebesar ' + rp(upGenPensiun) + '.</span></div>'
    + '<div class="kmb-benefit"><div class="kmb-label">MENINGGAL SETELAH PENSIUN</div><b>' + rp(upGenPensiun) + '+</b>'
    + '<span>Gen Aman tetap aktif dan nilainya terus mengikuti booster setelah pencairan Lite Future.</span></div>'
    + '</div>'

    + '<h3>Manfaat tambahan Gen Aman</h3>'
    + '<div class="kmb-benefit-grid small">'
    + '<div class="kmb-benefit"><div class="kmb-label">KECELAKAAN TRANSPORTASI UMUM</div><b>+' + rp(tTransportasi) + '</b><span>100% UP Dasar · maksimum Rp2 M</span></div>'
    + '<div class="kmb-benefit"><div class="kmb-label">MENINGGAL DI LUAR NEGERI</div><b>+' + rp(tLuarNegeri) + '</b><span>10% UP Dasar · maksimum Rp500 jt</span></div>'
    + '<div class="kmb-benefit"><div class="kmb-label">HAJI / UMRAH</div><b>+' + rp(tHaji) + '</b><span>100% UP Dasar · maksimum Rp1 M</span></div>'
    + '</div>'
    + '<p class="catatan">Manfaat tambahan Gen Aman dihitung dari UP Dasar awal; booster 7,5% tidak ikut dikalikan ke manfaat tambahan. Berlaku sesuai Ketentuan Polis.</p>'

    + '<h3>Progres Gen Aman setelah dana pensiun cair</h3>'
    + '<p class="catatan">Setelah Lite Future cair di usia ' + pensiun + ', Gen Aman tetap berjalan. Tabel ini menunjukkan perkembangan UP Gen Aman sampai usia 100 dan menandai bahwa manfaat Lite Future sudah dicairkan.</p>'
    + '<div class="gulir kmb-progress-wrap"><table class="tahunan kmb-progress-table"><thead><tr>'
    + '<th>Usia</th><th class="kanan">Gen Aman — UP</th><th>BeSMART Lite Future</th>'
    + '</tr></thead><tbody>'
    + Array.from(new Set([pensiun].concat(Array.from({length: Math.max(0, Math.floor((100 - pensiun) / 5)),}, (_, i) => pensiun + (i + 1) * 5)).concat([100])))
        .filter(function(u){ return u >= pensiun && u <= 100; })
        .sort(function(a,b){ return a-b; })
        .map(function(u){
          const lfStatus = u === pensiun
            ? '<b class="kmb-lf-cair">CAIR ' + rp(upL) + '</b>'
            : '<span class="kmb-lf-selesai">Sudah cair</span>';
          return '<tr><td><b>Usia ' + u + '</b></td><td class="kanan angka"><b>' + rp(upGenPadaUsia(u)) + '</b></td><td>' + lfStatus + '</td></tr>';
        }).join('')
    + '</tbody></table></div>'

    + '<div class="kmb-product-note">'
    + '<b>Ringkasnya:</b> Lite Future berfungsi menyiapkan dana yang cair di usia pensiun, sedangkan Gen Aman menjadi lapisan proteksi jiwa yang tetap berjalan setelah dana pensiun cair. Keduanya tetap merupakan dua polis yang berdiri sendiri, tetapi disajikan sebagai satu rencana perlindungan dan dana masa depan.'
    + '</div>';
}

function brsK(k, v) {
  return '<tr><td>' + esc(k) + '</td><td class="kanan"><b>' + esc(v) + '</b></td></tr>';
}

/* Tabel pembebasan premi Waiver Gen Aman untuk layar Kombinasi GSPA + LF.
   Yang dibebaskan hanya kontribusi dasar GSPA; kontribusi waiver sendiri dan
   premi Lite Future tidak ikut — Lite Future punya waivernya sendiri dengan
   tabel tarif yang berbeda. */
/* Tabel pembebasan premi untuk Kombinasi Gen Aman + Lite Future.

   Dua waiver berbeda produk, tapi cara kerjanya sama: membebaskan sisa premi
   dasar sampai akhir masa bayar. Karena itu tabelnya digabung — nasabah hanya
   perlu tahu total yang dibebaskan bila terjadi klaim.

   Waiver Lite Future WAJIB, jadi selalu ikut. Waiver Gen Aman opsional, jadi
   kolomnya hilang bila sakelarnya dimatikan — tabelnya tetap tampil karena
   Lite Future masih ada.

   Masa bayar kedua produk bisa berbeda. Baris dibuat sampai masa bayar
   terpanjang, dan tiap kolom berhenti sendiri saat masa bayarnya habis. */
function kTabelWaiver(r, inp, usia){
  const g = r.gspa || {}, lf = r.lf || {};

  const gAktif = g.tersedia && g.pakaiWaiver !== false
    && g.waiver && g.waiver.sah && Number(g.dasarPerTahunTanpaWaiver) > 0;
  const lfAktif = lf.tersedia && Number(lf.dasarPerTahunTanpaWaiver) > 0;
  if(!gAktif && !lfAktif) return '';

  const gMpp = gAktif ? Number(inp.mppGSPA) || 0 : 0;
  const lfMpp = lfAktif ? Number(inp.mppLF) || 0 : 0;
  const maks = Math.max(gMpp, lfMpp);
  if(!maks) return '';

  const gPerTahun = gAktif ? Number(g.dasarPerTahunTanpaWaiver) : 0;
  const lfPerTahun = lfAktif ? Number(lf.dasarPerTahunTanpaWaiver) : 0;
  const dua = gAktif && lfAktif;

  let baris = '';
  /* Berhenti satu tahun sebelum masa bayar terpanjang: klaim pada tahun
     terakhir tidak membebaskan apa pun karena preminya sudah dibayar. */
  for(let th = 1; th < maks; th++){
    const sisaG = Math.max(0, gMpp - th);
    const sisaL = Math.max(0, lfMpp - th);
    const nilaiG = gPerTahun * sisaG;
    const nilaiL = lfPerTahun * sisaL;
    baris += '<tr><td>Tahun ke-' + th + (usia ? ' (usia ' + (usia + th - 1) + ')' : '') + '</td>'
      + (dua
          ? '<td class="kanan angka">' + (sisaG ? rp(Math.round(nilaiG)) : '\u2014') + '</td>'
            + '<td class="kanan angka">' + (sisaL ? rp(Math.round(nilaiL)) : '\u2014') + '</td>'
          : '')
      + '<td class="kanan angka"><b>' + rp(Math.round(nilaiG + nilaiL)) + '</b></td></tr>';
  }

  const kepala = '<tr><th>Kejadian pada</th>'
    + (dua ? '<th class="kanan">Gen Aman</th><th class="kanan">Lite Future</th>' : '')
    + '<th class="kanan">Total premi yang dibebaskan</th></tr>';

  const waiverGspa = gAktif
    ? rp(inp.metodeGSPA === 'Tahunan' ? g.premiWaiverTahunan : g.premiWaiverBulanan)
      + ' per ' + (inp.metodeGSPA === 'Tahunan' ? 'tahun' : 'bulan')
    : '';
  const waiverLf = lfAktif
    ? rp(lf.premiWaiver) + ' per ' + (inp.metodeLF === 'Tahunan' ? 'tahun' : 'bulan')
    : '';

  let catatan = 'Premi dasar yang BELUM dibayar dibebaskan sampai akhir masa bayar. Sisa masa bayar dihitung setelah premi tahun berjalan dibayar. Premi waiver sendiri tidak ikut dibebaskan karena rider berakhir begitu klaim disetujui. ';
  if(dua && gMpp !== lfMpp){
    catatan += 'Masa bayar kedua produk berbeda (' + gMpp + ' dan ' + lfMpp
      + ' tahun), jadi kolomnya berhenti pada tahun yang berbeda. ';
  }
  if(!gAktif && lfAktif){
    catatan += 'Rider Waiver Gen Aman tidak diambil, jadi yang dibebaskan hanya '
      + 'premi Lite Future. ';
  }
  catatan += 'Premi waiver itu sendiri tetap dibayar'
    + (dua ? ' (Gen Aman ' + waiverGspa + ', Lite Future ' + waiverLf + ')'
           : (gAktif ? ' (' + waiverGspa + ')' : ' (' + waiverLf + ')'))
    + ', sesuai ketentuan polis. Premi rider kesehatan GHP/GHPS tidak termasuk.';

  return '<div class="blok" style="margin-top:12px"><h3>Bila terdiagnosa penyakit kritis</h3>'
    + '<p class="catatan">' + catatan + '</p>'
    + '<div class="gulir"><table class="tahunan">'
    + '<thead>' + kepala + '</thead><tbody>' + baris + '</tbody></table></div></div>';
}

function kGambar() {
  /* Bersihkan wadah Waiver yang dipindahkan ke bawah manfaat dari hasil
     perhitungan sebelumnya sebelum membangun ulang tampilan. */
  document.querySelectorAll('.kmb-waiver-ringkas').forEach(function(n){ n.remove(); });
  const tgl = el('kTgl').value;
  const upG = bAngka(el('kUpG').value);
  const inp = {
    nama: el('kNama').value,
    jk: nilaiSegmen('kJK'),
    tglLahir: tgl ? new Date(tgl + 'T00:00:00Z') : null,
    mppGSPA: +nilaiSegmen('kMppG'),
    upGSPA: upG,
    metodeGSPA: nilaiSegmen('kMetG'),
    /* Waiver Gen Aman di layar ini sejak awal SUDAH termasuk di premi GSPA,
       bukan tambahan. Karena itu sakelarnya bekerja sebagai pengurang saat
       dimatikan, bukan penambah saat dinyalakan — kalau dibalik, preminya
       akan terhitung dua kali. */
    pakaiWaiverGSPA: nilaiSegmen('kWaiverG') !== 'Tidak',
    usiaPensiun: +el('kPensiun').value,
    mppLF: +el('kMppL').value,
    upLF: +el('kUpL').value,
    metodeLF: nilaiSegmen('kMetL'),
  };
  kAturan();

  if (!tgl || !upG) {
    el('kInfoUsia').textContent = !tgl
      ? 'Isi tanggal lahir untuk menghitung usia.'
      : 'Isi UP GSPA untuk melihat kontribusi.';
    ['kHasil', 'kBooster', 'kFase', 'kIdentitas', 'kKotakRingkas', 'kTabel', 'kKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('kSangkalan').textContent = '';
    return;
  }

  const r = kombinasiHitung(inp, DATA_GSPA, TARIF);
  el('kInfoUsia').textContent = 'Usia ' + r.usia + ' tahun'
    + (inp.nama ? ' \u2022 ' + inp.nama : '');

  // Booster: rekomendasi UP Lite Future, sifatnya acuan bukan pembatas
  el('kBooster').innerHTML =
    '<div class="k">Kenaikan booster GSPA sampai usia ' + inp.usiaPensiun + '</div>'
    + '<div class="v angka">' + (r.booster.nilai > 0 ? rp(r.booster.nilai) : '\u2014') + '</div>'
    + '<div class="t">' + (r.booster.periode > 0
        ? r.booster.periode + ' periode kenaikan 5 tahunan \u00d7 7,5% dari UP GSPA. '
          + 'Angka ini rekomendasi UP Lite Future, bukan batas \u2014 kamu tetap bebas memilih tier lain.'
        : 'Usia pensiun yang dipilih kurang dari 5 tahun dari usia sekarang, '
          + 'jadi belum ada periode kenaikan booster.') + '</div>';

  const kotakGSPA = r.gspa.tersedia
    /* Label menyesuaikan pilihan waiver. Sebelumnya selalu berbunyi
       "Termasuk Waiver" dan "bulanan + Waiver" karena waiver dianggap selalu
       ikut — begitu sakelarnya dimatikan, angkanya benar tetapi labelnya
       menyesatkan. */
    ? (function(){
        const adaWaiver = r.gspa.pakaiWaiver !== false
          && (Number(r.gspa.premiWaiverTahunan) || 0) > 0;
        if(!adaWaiver){
          /* Tanpa waiver, kontribusi gabungan sama dengan kontribusi dasar —
             menampilkan keduanya hanya mengulang angka yang sama. Cukup dua
             kartu: bulanan dan tahunan. */
          return '<div class="kartu"><div class="k">Kontribusi GSPA bulanan</div>'
            + '<div class="v angka">' + rp(r.gspa.bulanan) + '</div>'
            + '<div class="t">Tanpa rider Waiver</div></div>'
            + '<div class="kartu"><div class="k">Kontribusi GSPA tahunan</div>'
            + '<div class="v angka">' + rp(r.gspa.tahunanGabungan) + '</div>'
            + '<div class="t">Tanpa rider Waiver</div></div>';
        }
        return '<div class="kartu"><div class="k">Kontribusi dasar GSPA bulanan</div>'
          + '<div class="v angka">' + rp(r.gspa.bulanan) + '</div>'
          + '<div class="t">Belum termasuk Waiver</div></div>'
          + '<div class="kartu"><div class="k">Kontribusi GSPA tahunan + Waiver</div>'
          + '<div class="v angka">' + rp(r.gspa.tahunanGabungan) + '</div>'
          + '<div class="t">Termasuk Waiver ' + rp(r.gspa.premiWaiverTahunan) + ' /tahun</div></div>'
          + '<div class="kartu"><div class="k">Kontribusi GSPA bulanan + Waiver</div>'
          + '<div class="v angka">' + rp(r.gspa.bulananGabungan) + '</div>'
          + '<div class="t">Waiver ' + rp(r.gspa.premiWaiverBulanan) + ' /bulan</div></div>';
      })()
      + '<div class="kartu"><div class="k">Diskon premi</div>'
      + '<div class="v angka">' + Math.round(r.gspa.diskon * 100) + '%</div></div>'
      + '<div class="kartu"><div class="k">Santunan ahli waris</div>'
      + '<div class="v angka">' + rp(r.gspa.santunan) + '</div></div>'
    : '';

  const kotakLF = r.lf.tersedia
    ? '<div class="kartu"><div class="k">Setoran Lite Future per '
      + (inp.metodeLF === 'Bulanan' ? 'bulan' : 'tahun') + '</div>'
      + '<div class="v angka">' + rp(r.lf.setoran) + '</div></div>'
      + '<div class="kartu"><div class="k">Dana pensiun di usia ' + inp.usiaPensiun + '</div>'
      + '<div class="v angka">' + rp(r.lf.up) + '</div></div>'
    : '';

  const gagal = [];
  if (!r.gspa.tersedia) gagal.push('<div class="peringatan">' + esc(r.gspa.alasan) + '</div>');
  if (!r.lf.tersedia) gagal.push('<div class="peringatan">' + esc(r.lf.alasan) + '</div>');

  el('kHasil').innerHTML = gagal.join('')
    + (r.status === 'OK'
      ? '<div class="sorotan"><div class="k">Total per tahun (GSPA + Lite Future)</div>'
        + '<div class="v angka">' + rp(r.total.perTahun) + '</div>'
        + '<div class="t">Total yang dibayar sampai kedua masa bayar selesai: '
        + rp(r.total.keseluruhan) + '.</div></div>'
      : '')
    + '<div class="ikhtisar">' + kotakGSPA + kotakLF + '</div>'
    /* Tabel pembebasan juga ditampilkan di layar kalkulator, bukan hanya di
       layar Ringkasan. Layar kalkulator hanya memiliki elemen kHasil, jadi
       tanpa baris ini agen tidak melihat angkanya sampai membuka Ringkasan —
       dan cetakan dari layar kalkulator pun kehilangan bagian ini. */
    + (r.status === 'OK'
        ? kTabelWaiver(r, inp, r.usia)
        : '');

  if (r.status !== 'OK') {
    ['kFase', 'kIdentitas', 'kKotakRingkas', 'kTabel', 'kKakiAgen', 'kManfaatGabungan']
      .forEach(i => { if (el(i)) el(i).innerHTML = ''; });
    el('kSangkalan').textContent = '';
    return;
  }

  gambarManfaatKombinasi(inp, r);

  el('kIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(inp.nama || '\u2014') + '</b></div>'
    + '<div>Usia<b>' + r.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + '<div>Usia pensiun<b>' + inp.usiaPensiun + ' tahun</b></div>';

  const upGenPensiun = upG * (1 + Math.min(1.5, Math.max(0, Math.floor((inp.usiaPensiun - r.usia) / 5) * 0.075)));
  const upGen100 = upG * (1 + Math.min(1.5, Math.max(0, Math.floor((100 - r.usia) / 5) * 0.075)));
  const boosterPensiun = upGenPensiun - upG;

  const kMasaBayarMax = Math.max(Number(inp.mppGSPA || 0), Number(inp.mppLF || 0));
  const kMetodeSama = inp.metodeGSPA === inp.metodeLF;
  // If both components use the same payment frequency, keep the familiar
  // single-program display. If frequencies differ, use annualized values so
  // the combined figure never mixes monthly and annual units.
  const kSatuanRingkas = kMetodeSama ? (inp.metodeGSPA === 'Bulanan' ? 'bulan' : 'tahun') : 'tahun';
  const kPremiRingkas = kMetodeSama
    ? (inp.metodeGSPA === 'Bulanan' ? r.total.perTahun / 12 : r.total.perTahun)
    : r.total.perTahun;
  const kTitikBayar = Array.from(new Set([Number(inp.mppGSPA), Number(inp.mppLF)]))
    .filter(function(v){ return v > 0; }).sort(function(a,b){ return a-b; });
  const kAdaPerbedaanMasaBayar = kTitikBayar.length > 1;
  const kRincianPremi = kAdaPerbedaanMasaBayar
    ? '<div class="kartu penuh"><div class="k">Rincian premi berdasarkan masa bayar</div>'
      + '<div class="v" style="font-size:1rem;line-height:1.65">'
      + kTitikBayar.map(function(akhir, i){
          const mulai = i === 0 ? 1 : kTitikBayar[i - 1] + 1;
          const premiTahun = (Number(inp.mppGSPA) >= mulai ? r.gspa.perTahun : 0)
            + (Number(inp.mppLF) >= mulai ? r.lf.perTahun : 0);
          const premiTampil = kMetodeSama && inp.metodeGSPA === 'Bulanan' ? premiTahun / 12 : premiTahun;
          return '<div><b>Premi per ' + kSatuanRingkas + ', Tahun ' + mulai + (mulai === akhir ? '' : '–' + akhir)
            + ':</b> ' + rp(premiTampil) + '</div>';
        }).join('')
      + '</div></div>'
    : '';

  el('kKotakRingkas').innerHTML =
    '<h2>Ringkasan Program</h2>'
    + '<p class="catatan" style="margin-top:-4px">Satu rencana yang menggabungkan proteksi jiwa hari ini dengan dana yang disiapkan untuk usia pensiun.</p>'
    + '<div class="kmb-hero-grid">'
    + '<div class="kmb-hero-card"><div class="kmb-label">PROTEKSI JIWA GEN AMAN</div>'
    + '<div class="kmb-big">' + rp(r.gspa.santunan) + '</div>'
    + '<div class="kmb-small">UP Dasar · proteksi tetap berjalan sampai usia 100</div></div>'
    + '<div class="kmb-hero-card accent"><div class="kmb-label">DANA PENSIUN LITE FUTURE</div>'
    + '<div class="kmb-big">' + rp(r.lf.up) + '</div>'
    + '<div class="kmb-small">Cair 100% di usia ' + inp.usiaPensiun + ' bila hidup sampai usia pensiun</div></div></div>'
    + '<div class="kmb-highlight">'
    + '<div><div class="kmb-label">BOOSTER GEN AMAN</div><div class="kmb-big">+7,5%</div>'
    + '<div class="kmb-small">setiap 5 tahun · sampai usia ' + inp.usiaPensiun + ' sudah bertambah ' + rp(boosterPensiun) + '</div></div>'
    + '<div class="kmb-highlight-number"><span>Proteksi Gen Aman saat pensiun</span><b>' + rp(upGenPensiun) + '</b>'
    + '<small>dan tetap berjalan setelah Lite Future cair</small></div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + kSatuanRingkas + '</div><div class="v angka">' + rp(kPremiRingkas) + '</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + kMasaBayarMax + ' tahun</div></div>'
    + kRincianPremi
    + '<div class="kartu"><div class="k">Total keseluruhan</div><div class="v angka">' + rp(r.total.keseluruhan) + '</div></div>'
    + '</div>'
    + '<p class="catatan"><b>Setelah Lite Future cair:</b> dana pensiun sudah diterima, sementara Gen Aman tidak ikut cair/berakhir dan tetap melindungi sampai usia 100. Potensi UP Gen Aman pada usia 100: <b>' + rp(upGen100) + '</b>.</p>';

  /* Di layar Ringkasan Kombinasi, tabel Waiver ditempatkan setelah seluruh
     bagian manfaat program, agar urutannya konsisten dengan hasil cetak.
     Hanya posisi tampilan yang diubah; isi dan perhitungannya tetap sama. */
  const blokManfaatKMB = el('kBlokManfaat');
  if (blokManfaatKMB && blokManfaatKMB.parentNode) {
    blokManfaatKMB.parentNode.querySelectorAll('.kmb-waiver-ringkas').forEach(function(n){ n.remove(); });
    const waiverKMB = kTabelWaiver(r, inp, r.usia);
    if (waiverKMB) {
      const wrap = document.createElement('div');
      wrap.className = 'kmb-waiver-ringkas';
      wrap.innerHTML = waiverKMB;
      blokManfaatKMB.insertAdjacentElement('afterend', wrap);
    }
  }

  el('kFase').innerHTML =
    '<div class="tahap"><b>Mulai sekarang</b>'
    + '<span>Gen Aman memberi proteksi jiwa <b>' + rp(r.gspa.santunan) + '</b>. Lite Future menyiapkan dana pensiun <b>' + rp(r.lf.up) + '</b>.</span></div>'
    + '<div class="tahap"><b>Menuju usia ' + inp.usiaPensiun + '</b>'
    + '<span>UP Gen Aman naik otomatis <b>7,5% setiap 5 tahun</b>. Pada usia pensiun, proteksinya menjadi <b>' + rp(upGenPensiun) + '</b>.</span></div>'
    + '<div class="tahap tenang"><b>Usia ' + inp.usiaPensiun + ' dan seterusnya</b>'
    + '<span>Lite Future cair <b>' + rp(r.lf.up) + '</b>. Gen Aman tetap aktif dan terus mengikuti mekanisme booster sampai usia 100.</span></div>';

  el('kTabel').innerHTML =
    '<thead><tr><th>Komponen</th><th class="kanan">Per setoran</th>'
    + '<th class="kanan">Per tahun</th><th class="kanan">Masa bayar</th>'
    + '<th class="kanan">Total dibayar</th></tr></thead><tbody>'
    + '<tr class="bayar"><td>Gen Aman (GSPA)</td>'
    + '<td class="kanan angka">' + rp(r.gspa.perSetoran) + '</td>'
    + '<td class="kanan angka">' + rp(r.gspa.perTahun) + '</td>'
    + '<td class="kanan">' + inp.mppGSPA + ' thn</td>'
    + '<td class="kanan angka">' + rp(r.gspa.perTahun * inp.mppGSPA) + '</td></tr>'
    + '<tr class="bayar"><td>Lite Future</td>'
    + '<td class="kanan angka">' + rp(r.lf.setoran) + '</td>'
    + '<td class="kanan angka">' + rp(r.lf.perTahun) + '</td>'
    + '<td class="kanan">' + inp.mppLF + ' thn</td>'
    + '<td class="kanan angka">' + rp(r.lf.totalBayar) + '</td></tr>'
    + '<tr class="tandai"><td>Total</td><td class="kanan">\u2014</td>'
    + '<td class="kanan angka">' + rp(r.total.perTahun) + '</td><td class="kanan">\u2014</td>'
    + '<td class="kanan angka">' + rp(r.total.keseluruhan) + '</td></tr></tbody>';

  el('kSangkalan').textContent = 'Ilustrasi ini menggabungkan dua polis yang berdiri sendiri, '
    + 'dihitung dari tarif yang berlaku saat ini. Bukan bagian dari polis dan tidak mengikat '
    + 'secara hukum. Nilai final tunduk pada Ketentuan Polis resmi PT Asuransi Jiwa Generali '
    + 'Indonesia dan hasil underwriting masing-masing produk.';

  const na = el('kAgenNama').value, hp = el('kAgenHP').value;
  el('kKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function kAturan() {
  el('kAturan').innerHTML =
  '<details><summary>Cara kontribusi GSPA dihitung</summary><div class="isi"><ul>'
  + '<li>Tarif dasar diambil per Rp100 juta UP, sesuai masa bayar, jenis kelamin, dan usia.</li>'
  + '<li>Kontribusi bulanan sebelum diskon = tarif dikali UP dibagi Rp100 juta.</li>'
  + '<li>Diskon mengikuti besar UP: mulai 15% pada Rp500 juta, 25% pada Rp850 juta, 30% pada Rp1 miliar, 35% pada Rp1,7 miliar, 40% pada Rp2,5 miliar, dan 45% mulai Rp5 miliar.</li>'
  + '<li>Kontribusi tahunan dihitung 11 kali kontribusi bulanan setelah diskon.</li>'
  + '<li>Masa bayar tersedia 5, 10, atau 15 tahun, dengan batas usia berbeda: 5 tahun sampai usia 70, 10 tahun sampai 65, 15 tahun sampai 60.</li>'
  + '</ul></div></details>'

  + '<details><summary>Kenaikan booster dan UP Lite Future</summary><div class="isi"><ul>'
  + '<li>UP Gen Aman naik 7,5% setiap 5 tahun. Kenaikan yang terkumpul sampai usia pensiun dipakai sebagai rekomendasi UP Lite Future.</li>'
  + '<li>Rekomendasi itu acuan, bukan pembatas. UP Lite Future tetap bebas dipilih dari 15 tier yang ada.</li>'
  + '<li>Kalau usia pensiun kurang dari 5 tahun dari usia sekarang, belum ada periode kenaikan, jadi rekomendasinya kosong.</li>'
  + '</ul></div></details>'

  + '<details><summary>Bagian Lite Future</summary><div class="isi"><ul>'
  + '<li>Perhitungannya persis sama dengan produk Lite Future di layar tersendiri, termasuk diskon 5% untuk dana mulai Rp1 miliar dan batas setoran minimum.</li>'
  + '<li>Masa bayar GSPA dan Lite Future berdiri sendiri, boleh sama boleh berbeda.</li>'
  + '<li>Kalau kombinasi usia, masa bayar, dan usia pensiun tidak ada di database, bagian Lite Future dikosongkan dan totalnya tidak dihitung.</li>'
  + '</ul></div></details>';
}

kGambar();


/* ============ Gen Aman (GSPA) ============ */
el('gPlanGhps').innerHTML = DATA_GHPS.urutan.map(p =>
  '<option' + (p === 'Gold Standard' ? ' selected' : '') + '>' + p + '</option>').join('');

el('gPersenWakaf').innerHTML = [10, 15, 20, 25, 30, 35, 40, 45]
  .map(v => '<option value="' + (v / 100) + '"' + (v === 40 ? ' selected' : '') + '>' + v + '%</option>').join('');

['gUpDasar', 'gPremiNet', 'gNilaiWakaf'].forEach(id =>
  el(id).addEventListener('input', () => {
    const kotak = el(id);
    const n = bAngka(kotak.value);
    kotak.value = n ? n.toLocaleString('id-ID') : '';
    gGambar();
  }));
['gNama', 'gTgl', 'gPersenWakaf', 'gPlanGhps', 'gAgenNama', 'gAgenHP'].forEach(id =>
  el(id).addEventListener('input', gGambar));
['gJK', 'gMpp', 'gMetode', 'gMode', 'gWakaf', 'gRider', 'gWaiverRider'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  gGambar();
}));

function gGambar() {
  const mode = nilaiSegmen('gMode');
  const wakaf = nilaiSegmen('gWakaf') === 'Wakaf';
  // Kotak isian menyesuaikan pendekatan yang dipilih, supaya agen tidak
  // mengisi kolom yang justru diabaikan perhitungan.
  el('gBarisUP').style.display = mode === 'By UP' ? '' : 'none';
  el('gBarisPremi').style.display = mode === 'By UP' ? 'none' : '';
  el('gBarisWakaf').style.display = wakaf ? '' : 'none';
  el('gPetunjuk').textContent = mode === 'By UP'
    ? 'Isi UP Dasar minimal Rp100 juta. Diskon premi mengikuti tier UP.'
    : 'Isi premi net yang diinginkan, UP Dasar dan tier diskonnya dihitung mundur otomatis.';

  const tgl = el('gTgl').value;
  const inp = {
    nama: el('gNama').value,
    jk: nilaiSegmen('gJK'),
    tglLahir: tgl ? new Date(tgl + 'T00:00:00Z') : null,
    mpp: +nilaiSegmen('gMpp'),
    metode: nilaiSegmen('gMetode'),
    mode: mode,
    upDasar: bAngka(el('gUpDasar').value),
    premiNet: bAngka(el('gPremiNet').value),
    modeWakaf: wakaf ? 'Wakaf' : 'Non Wakaf',
    nilaiWakaf: bAngka(el('gNilaiWakaf').value),
    persenWakaf: +el('gPersenWakaf').value,
  };
  gAturan();

  if (!tgl) {
    el('gInfoUsia').textContent = 'Isi tanggal lahir untuk menghitung usia.';
    ['gHasil', 'gFase', 'gFaseTime', 'gIdentitas', 'gKotakRingkas', 'gTabel', 'gKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('gSangkalan').textContent = '';
    el('gCatatanTabel').textContent = '';
    return;
  }

  // Masa bayar 15 tahun mensyaratkan rider GHPS ikut diambil. Tombolnya
  // dinyalakan sendiri dan pilihan "Tidak" dikunci, supaya agen tidak
  // terlanjur membuat ilustrasi yang tidak bisa diterbitkan.
  const wajibRider = inp.mpp === 15;
  const tblTidak = el('gRider').querySelector('button[data-nilai="Tidak"]');
  const tblYa = el('gRider').querySelector('button[data-nilai="Ya"]');
  if (wajibRider && nilaiSegmen('gRider') !== 'Ya') {
    tblYa.setAttribute('aria-pressed', 'true');
    tblTidak.setAttribute('aria-pressed', 'false');
  }
  tblTidak.disabled = wajibRider;
  tblTidak.style.opacity = wajibRider ? '0.45' : '';
  el('gWajibRider').textContent = wajibRider
    ? 'Masa bayar 15 tahun mensyaratkan rider GHPS diambil, jadi pilihannya dikunci di Ya.'
    : '';

  const pakaiRider = nilaiSegmen('gRider') === 'Ya';
  el('gBlokGhps').style.display = pakaiRider ? '' : 'none';

  const r = InsuranceHubEngine.calculate('GSPA', inp, { rates: DATA_GSPA });
  el('gInfoUsia').textContent = 'Usia ' + r.usia + ' tahun'
    + (inp.nama ? ' \u2022 ' + inp.nama : '');

  if (!r.tersedia) {
    el('gHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    ['gFase', 'gFaseTime', 'gIdentitas', 'gKotakRingkas', 'gTabel', 'gKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('gSangkalan').textContent = '';
    el('gCatatanTabel').textContent = '';
    return;
  }

  const satuan = inp.metode === 'Bulanan' ? 'bulan' : 'tahun';

  // ---------- rider pembebasan kontribusi (Waiver) ----------
  /* Waiver Gen Aman dibuka kembali setelah tarifnya dicocokkan dengan empat
     ilustrasi resmi Generali dan selisihnya turun di bawah 0,0001%. Tombolnya
     kembali bisa dipilih agen seperti semula. */
  const pakaiWaiver = nilaiSegmen('gWaiverRider') === 'Ya';
  const waiver = pakaiWaiver
    ? waiverHitung(r.usia, inp.mpp, inp.jk, r.upDasar, r.diskon) : null;
  const waiverAktif = waiver && waiver.sah;
  const waiverPerSetoran = waiverAktif
    ? (inp.metode === 'Bulanan' ? waiver.bulanan : waiver.tahunan) : 0;
  const waiverPerTahun = waiverAktif
    ? (inp.metode === 'Bulanan' ? waiver.bulanan * 12 : waiver.tahunan) : 0;
  const waiverTotal = waiverPerTahun * inp.mpp;

  el('gCatatanWaiver').textContent = !pakaiWaiver
    ? 'Waiver membebaskan kontribusi santunan dasar bila peserta terdiagnosa salah satu '
      + 'dari 66 penyakit kritis sesuai ketentuan polis.'
    : (waiverAktif
      ? 'Kontribusi waiver ' + rp(waiver.bulanan) + ' per bulan atau ' + rp(waiver.tahunan)
        + ' per tahun, sudah dipotong diskon ' + Math.round(waiver.diskon * 100)
        + '% mengikuti tier UP Dasar. Sebelum diskon ' + rp(waiver.sebelumDiskon)
        + ' per bulan.'
      : waiver.alasan);

  // ---------- rider kesehatan GHPS ----------
  const rider = pakaiRider ? ghpsHitung(r.usia, inp.mpp, el('gPlanGhps').value) : null;
  const riderAktif = rider && rider.sah;
  const riderPerSetoran = riderAktif
    ? (inp.metode === 'Bulanan' ? rider.bulanan : rider.tahunan) : 0;
  const riderPerTahun = riderAktif
    ? (inp.metode === 'Bulanan' ? rider.bulanan * 12 : rider.tahunan) : 0;
  const riderTotal = riderPerTahun * inp.mpp;
  const gabunganPerSetoran = r.perSetoran + riderPerSetoran + waiverPerSetoran;
  const gabunganBulanan = r.bulanan + (riderAktif ? rider.bulanan : 0)
    + (waiverAktif ? waiver.bulanan : 0);
  const gabunganTahunan = r.tahunan + (riderAktif ? rider.tahunan : 0)
    + (waiverAktif ? waiver.tahunan : 0);
  const gabunganTotal = (inp.metode === 'Bulanan' ? r.totalBulanan : r.totalTahunan)
    + riderTotal + waiverTotal;
  const adaRider = riderAktif || waiverAktif;

  if (pakaiRider) {
    el('gCatatanRider').textContent = riderAktif
      ? 'Plan ' + rider.plan + ': ' + rp(rider.bulanan) + ' per bulan atau '
        + rp(rider.tahunan) + ' per tahun. Premi rider tidak mendapat diskon seperti '
        + 'santunan dasar, dan dibayar penuh sesuai usia masuk.'
      : rider.alasan;
    el('gTabelPlan').innerHTML =
      '<thead><tr><th>Plan</th><th class="kanan">Premi bulanan</th>'
      + '<th class="kanan">Premi tahunan</th></tr></thead><tbody>'
      + DATA_GHPS.urutan.map(pl => {
          const x = ghpsHitung(r.usia, inp.mpp, pl);
          return '<tr class="' + (pl === el('gPlanGhps').value ? 'tandai' : '') + '">'
            + '<td>' + esc(pl) + '</td>'
            + '<td class="kanan angka">' + (x.sah ? rp(x.bulanan) : '\u2014') + '</td>'
            + '<td class="kanan angka">' + (x.sah ? rp(x.tahunan) : '\u2014') + '</td></tr>';
        }).join('')
      + '</tbody>';
  } else {
    el('gCatatanRider').textContent = 'Rider ini menambah premi. Kalau tidak diambil, '
      + 'seluruh angka di bawah hanya menghitung santunan dasar.';
    el('gTabelPlan').innerHTML = '';
  }

  el('gHasil').innerHTML =
    '<div class="sorotan"><div class="k">Yang dibayar nasabah'
    + (adaRider ? ' (santunan dasar'
        + (waiverAktif ? ' + waiver' : '') + (riderAktif ? ' + GHPS' : '') + ')' : '')
    + '</div>'
    + '<div class="v angka">' + rp(gabunganPerSetoran) + ' <small>/' + satuan + '</small></div>'
    + '<div class="t">'
    + (riderAktif
      ? 'Kontribusi kesehatan GHPS tetap mengikuti plan yang dipilih dan masa perlindungan rider.'
      : 'Selama ' + inp.mpp + ' tahun, sampai usia ' + r.usiaAkhirBayar + '. Total ' + rp(gabunganTotal) + '.')
    + (adaRider && !riderAktif ? ' Santunan dasar ' + rp(r.perSetoran)
        + (waiverAktif ? ', waiver ' + rp(waiverPerSetoran) : '') + '.' : '')
    + (riderAktif ? ' Santunan dasar ' + rp(r.perSetoran)
        + (waiverAktif ? ', waiver ' + rp(waiverPerSetoran) : '')
        + ', rider GHPS ' + rp(riderPerSetoran) + '.' : '')
    + '</div></div>'
    + (adaRider
      ? '<div class="ikhtisar">'
        + '<div class="kartu"><div class="k">Premi gabungan per ' + satuan + '</div>'
        + '<div class="v angka">' + rp(gabunganPerSetoran) + '</div></div>'
        + (waiverAktif
          ? '<div class="kartu penuh"><div class="k">Rider Waiver</div>'
            + '<div class="v angka">' + rp(waiverPerSetoran) + ' /' + satuan + '</div>'
            + '<div class="k" style="margin-top:6px">Total waiver selama masa bayar '
            + rp(waiverTotal) + '. Sudah dipotong diskon '
            + Math.round(waiver.diskon * 100) + '% mengikuti tier UP Dasar.</div></div>'
          : '')
        + (riderAktif
          ? '<div class="kartu penuh"><div class="k">Rider GHPS plan ' + esc(rider.plan)
            + '</div><div class="v angka">' + rp(riderPerSetoran) + ' /' + satuan + '</div>'
            + '<div class="k" style="margin-top:6px">Total rider selama masa bayar '
            + rp(riderTotal) + '. Premi rider tidak mendapat diskon.</div></div>'
          : '')
        + '</div>'
      : '')
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">UP Dasar</div>'
    + '<div class="v angka">' + rp(r.upDasar) + '</div></div>'
    + '<div class="kartu"><div class="k">Diskon premi (tier)</div>'
    + '<div class="v angka">' + Math.round(r.diskon * 100) + '%</div></div>'
    + '<div class="kartu"><div class="k">Kontribusi per ' + satuan + ' setelah diskon</div>'
    + '<div class="v angka">' + rp(r.perSetoran) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Penghematan dari diskon (per bulan)</div>'
    + '<div class="v angka">' + rp(r.penghematanBulanan) + '</div>'
    + '<div class="k" style="margin-top:6px">Sebelum diskon: <b>' + rp(r.sebelumDiskon)
    + '</b> per bulan. Tarif dasar per Rp100 juta: <b>' + rp(r.tarifDasar) + '</b></div></div>'
    + (r.wakaf
      ? '<div class="kartu"><div class="k">Term Life (UP Wakaf)</div>'
        + '<div class="v angka">' + rp(r.termLife) + '</div></div>'
        + '<div class="kartu"><div class="k">Nilai diwakafkan</div>'
        + '<div class="v angka">' + rp(r.nilaiWakaf) + '</div></div>'
        + '<div class="kartu penuh"><div class="k">Sisa UP wakaf untuk ahli waris</div>'
        + '<div class="v angka">' + rp(r.sisaWakafAhliWaris) + '</div>'
        + '<div class="k" style="margin-top:6px">Total UP dibeli: <b>' + rp(r.totalUPDibeli)
        + '</b></div></div>'
      : '')
    + '<div class="kartu penuh"><div class="k">Santunan untuk ahli waris saat klaim</div>'
    + '<div class="v angka">' + rp(r.santunanNet) + '</div>'
    + (adaRider
      ? '<div class="k" style="margin-top:6px">Dibanding total premi termasuk rider '
        + rp(gabunganTotal) + ', setara <b>'
        + (r.santunanNet / gabunganTotal).toLocaleString('id-ID',
            { maximumFractionDigits: 1 }) + ' kali</b>.</div>'
      : '')
    + '</div>'
    + '<div class="kartu penuh"><div class="k">Estimasi santunan di usia 100 (dengan booster)</div>'
    + '<div class="v angka">' + rp(r.santunanUsia100) + '</div>'
    + '<div class="k" style="margin-top:6px">Naik ' + rp(r.kenaikanPer5Tahun)
    + ' setiap 5 tahun, sampai ' + r.jumlahBooster + ' kali.</div></div>'
    + '<div class="kartu"><div class="k">Tambahan meninggal di luar negeri</div>'
    + '<div class="v angka">' + rp(r.tambahanLuarNegeri) + '</div></div>'
    + '<div class="kartu"><div class="k">Tambahan kecelakaan transportasi umum</div>'
    + '<div class="v angka">' + rp(r.tambahanTransportasi) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Tambahan meninggal saat haji atau umrah</div>'
    + '<div class="v angka">' + rp(r.tambahanHaji) + '</div>'
    + '<div class="k" style="margin-top:6px">Potensi maksimum seluruh skenario: <b>'
    + rp(r.maksSeluruh) + '</b></div></div></div>';

  const fase =
    '<div class="tahap"><b>Tahun 1 sampai ' + inp.mpp + '</b>'
    + '<span>Membayar ' + rp(r.perSetoran) + ' per ' + satuan + ', berhenti di usia '
    + r.usiaAkhirBayar + '.</span></div>'
    + '<div class="tahap tenang"><b>Setelah masa bayar selesai</b>'
    + '<span>Tidak ada pembayaran lagi, perlindungan tetap berjalan sampai usia 100 tahun.</span></div>'
    + '<div class="tahap"><b>Santunan yang terus tumbuh</b>'
    + '<span>Setiap 5 tahun santunan naik ' + rp(r.kenaikanPer5Tahun)
    + ', maksimal 150% dari UP Dasar. Di usia 100 diperkirakan '
    + rp(r.santunanUsia100) + '.</span></div>'
    + (r.wakaf
      ? '<div class="tahap"><b>Porsi wakaf</b><span>Dari Term Life ' + rp(r.termLife)
        + ', sebesar ' + rp(r.nilaiWakaf) + ' diwakafkan dan ' + rp(r.sisaWakafAhliWaris)
        + ' tetap untuk ahli waris.</span></div>'
      : '');
  el('gFase').innerHTML = fase;
  el('gFaseTime').innerHTML = fase;

  el('gSubKop').textContent = 'Santunan yang tumbuh 7,5% setiap 5 tahun, sampai usia 100'
    + (waiverAktif && riderAktif ? ' — dengan rider Waiver dan GHPS'
      : (waiverAktif ? ' — dengan rider Waiver'
        : (riderAktif ? ' — dengan rider kesehatan GHPS' : '')));

  el('gIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(inp.nama || '\u2014') + '</b></div>'
    + '<div>Usia<b>' + r.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + (riderAktif
      ? '<div>Plan<b>Gen Aman ' + inp.mpp + '</b></div>'
        + '<div>Cara bayar<b>' + inp.metode + '</b></div>'
        + '<div>Lama bayar premi dasar + rider non-GHPS<b>' + inp.mpp + ' tahun</b></div>'
      : '<div>Masa bayar<b>' + inp.mpp + ' tahun, ' + inp.metode + '</b></div>')
    + (waiverAktif ? '<div>Rider waiver<b>Aktif</b></div>' : '')
    + (riderAktif ? '<div>Rider kesehatan<b>GHPS ' + esc(rider.plan) + '</b></div>' : '');

  const totalPremiTahunanTampil = inp.metode === 'Bulanan'
    ? gabunganBulanan * 12
    : gabunganTahunan;

  el('gKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">' + (riderAktif ? 'Kontribusi dasar per ' : 'Kontribusi per ') + satuan + '</div>'
    + '<div class="v angka">' + rp(riderAktif ? r.perSetoran : gabunganPerSetoran) + '</div></div>'
    + (riderAktif ? '<div class="kartu"><div class="k">Kontribusi GHPS per ' + satuan + '</div>'
      + '<div class="v angka">' + rp(riderPerSetoran) + '</div></div>' : '')
    + (riderAktif
      /* Saat cara bayar bulanan, total per bulan ditampilkan lebih dulu:
         itulah angka yang benar-benar dikeluarkan nasabah tiap bulan.
         Sebelumnya hanya ada total per tahun, sehingga agen harus
         menjumlahkan sendiri kontribusi dasar dengan kontribusi GHPS. */
      ? (inp.metode === 'Bulanan'
          ? '<div class="kartu penuh"><div class="k">TOTAL KONTRIBUSI PER BULAN *</div>'
            + '<div class="v angka">' + rp(gabunganPerSetoran) + ' *</div>'
            + '<div class="k" style="margin-top:6px">Kontribusi dasar ' + rp(r.perSetoran)
            + (waiverAktif ? ' + waiver ' + rp(waiverPerSetoran) : '')
            + ' + GHPS ' + rp(riderPerSetoran) + '.</div></div>'
          : '')
        + '<div class="kartu penuh"><div class="k">TOTAL KONTRIBUSI PER TAHUN *</div>'
        + '<div class="v angka">' + rp(totalPremiTahunanTampil) + ' *</div>'
        + '<div class="k" style="margin-top:6px">* Kontribusi asuransi kesehatan GHPS tidak mengikat.</div></div>'
      : '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + inp.mpp + ' tahun</div></div>'
        + '<div class="kartu"><div class="k">Total bayar</div><div class="v angka">' + rp(gabunganTotal) + '</div></div>'
        + '<div class="kartu"><div class="k">' + (inp.metode === 'Bulanan' ? 'Kontribusi per Tahun' : 'Kontribusi Tahunan') + '</div><div class="v angka">' + rp(totalPremiTahunanTampil) + '</div></div>')
    + '<div class="kartu penuh"><div class="k">Santunan untuk ahli waris</div>'
    + '<div class="v angka">' + rp(r.santunanNet) + '</div>'
    + '<div class="k" style="margin-top:6px">Di usia 100 dengan booster: <b>'
    + rp(r.santunanUsia100) + '</b></div></div></div>';

  // Timeline bisa mencapai 100 baris. Tabel dipecah tiga supaya tetap terbaca
  // di HP dan tidak terpotong saat dicetak, tanpa membuang satu pun angka.
  // Tabel 1: yang berubah tiap tahun. Tabel 2: manfaat tambahan yang nilainya
  // sama sepanjang polis, jadi cukup ditulis sekali. Tabel 3: nilai kenaikan
  // 7,5% seandainya harus dibeli sendiri.
  const penting = r.timeline.filter(b =>
    b.tahun <= inp.mpp + 1 || b.tahun % 5 === 0 || b.tahun === r.timeline.length);
  el('gTabel').innerHTML =
    '<thead><tr><th>Thn</th><th>Usia</th><th class="kanan">Kontribusi per Tahun</th>'
    + '<th class="kanan">Santunan dasar</th><th class="kanan">Booster</th>'
    + '<th class="kanan">Santunan berjalan</th></tr></thead><tbody>'
    + penting.map(b =>
        '<tr class="' + (b.kontribusi ? 'bayar' : '') + (b.akhirMasa ? ' tandai' : '') + '">'
        + '<td>' + b.tahun + '</td><td>' + b.usia + '</td>'
        + '<td class="kanan angka">'
        + ((b.kontribusi + riderPerTahun)
            ? rp(b.kontribusi + (b.kontribusi ? waiverPerTahun : 0) + riderPerTahun)
              + (riderAktif && !b.kontribusi ? ' *' : '') : '\u2014') + '</td>'
        + '<td class="kanan angka">' + rp(b.santunan) + '</td>'
        + '<td class="kanan angka">' + (b.booster
            ? rp(b.booster) + ' ('
              + (b.boosterPersen * 100).toLocaleString('id-ID', {maximumFractionDigits: 1})
              + '%)' : '\u2014') + '</td>'
        + '<td class="kanan angka">' + rp(b.santunan + b.booster) + '</td></tr>').join('')
    + '</tbody>';

  el('gCatatanTabel').textContent = 'Polis berjalan ' + r.timeline.length
    + ' tahun, dari usia ' + r.usia + ' sampai 100. Tabel menampilkan seluruh tahun masa '
    + 'bayar, tahun pertama setelah lunas, setiap kelipatan 5 tahun saat booster naik, dan '
    + 'tahun terakhir. Kolom santunan berjalan adalah santunan dasar ditambah booster pada '
    + 'tahun itu, belum termasuk manfaat tambahan di tabel berikutnya.'
    + (waiverAktif ? ' Kolom kontribusi sudah termasuk kontribusi waiver ' + rp(waiverPerTahun)
        + ' per tahun selama masa bayar.' : '')
    + (riderAktif
      ? ' Kolom kontribusi sudah termasuk premi rider GHPS ' + rp(riderPerTahun)
        + ' per tahun. Kontribusi santunan dasar berhenti setelah ' + inp.mpp
        + ' tahun, tetapi premi kesehatan tetap dibayar selama perlindungan berjalan — '
        + 'baris bertanda bintang berisi premi GHPS saja. '
        + '*Belum termasuk kenaikan premi karena bertambahnya usia. '
        + '**Belum termasuk penyesuaian premi karena inflasi medis, bila ada.'
      : '');

  el('gBlokWaiverRingkas').style.display = waiverAktif ? '' : 'none';
  if (waiverAktif) {
    el('gTabelWaiver').innerHTML =
      '<thead><tr><th>Keterangan</th><th class="kanan">Nilai</th></tr></thead><tbody>'
      + '<tr><td>Tarif waiver per Rp100 juta UP Dasar</td>'
      + '<td class="kanan angka">' + rp(waiver.tarif) + '</td></tr>'
      + '<tr><td>Kontribusi waiver sebelum diskon</td>'
      + '<td class="kanan angka">' + rp(waiver.sebelumDiskon) + ' /bulan</td></tr>'
      + '<tr><td>Diskon mengikuti tier UP Dasar</td>'
      + '<td class="kanan angka">' + Math.round(waiver.diskon * 100) + '%</td></tr>'
      + '<tr class="bayar"><td>Kontribusi waiver bulanan</td>'
      + '<td class="kanan angka">' + rp(waiver.bulanan) + '</td></tr>'
      + '<tr class="bayar"><td>Kontribusi waiver tahunan</td>'
      + '<td class="kanan angka">' + rp(waiver.tahunan) + '</td></tr>'
      + '<tr><td>Total waiver selama ' + inp.mpp + ' tahun masa bayar</td>'
      + '<td class="kanan angka">' + rp(waiverTotal) + '</td></tr>'
      + '<tr class="tandai"><td>Kontribusi santunan dasar yang dibebaskan bila klaim '
      + 'terjadi di awal</td>'
      + '<td class="kanan angka">'
      + rp(inp.metode === 'Bulanan' ? r.totalBulanan : r.totalTahunan) + '</td></tr>'
      + '</tbody>';
    el('gCatatanWaiverRingkas').textContent = 'Waiver membebaskan kontribusi santunan dasar '
      + 'bila peserta terdiagnosa salah satu dari 66 penyakit kritis dan memenuhi ketentuan '
      + 'polis. Pembebasan berjalan sejak kejadian sampai akhir masa bayar santunan dasar, '
      + 'yaitu ' + inp.mpp + ' tahun. Yang dibebaskan hanya kontribusi santunan dasar; premi '
      + 'rider apa pun, termasuk kontribusi waiver sendiri'
      + (r.wakaf ? ' dan kontribusi Term Life wakaf' : '')
      + ', tetap harus dibayar. Karena masa perlindungannya mengikuti masa bayar, nilainya '
      + 'paling terasa bila kejadian berlangsung di tahun-tahun awal.';
  } else {
    el('gTabelWaiver').innerHTML = '';
    el('gCatatanWaiverRingkas').textContent = '';
  }

  el('gBlokRiderRingkas').style.display = riderAktif ? '' : 'none';
  if (riderAktif) {
    el('gTabelRider').innerHTML =
      '<thead><tr><th>Keterangan</th><th class="kanan">Nilai</th></tr></thead><tbody>'
      + '<tr><td>Plan yang diambil</td><td class="kanan">' + esc(rider.plan) + '</td></tr>'
      + '<tr><td>Kontribusi rider bulanan</td>'
      + '<td class="kanan angka">' + rp(rider.bulanan) + '</td></tr>'
      + '<tr><td>Kontribusi rider tahunan</td>'
      + '<td class="kanan angka">' + rp(rider.tahunan) + '</td></tr>'
      + '<tr class="bayar"><td>Kontribusi santunan dasar per ' + satuan + '</td>'
      + '<td class="kanan angka">' + rp(r.perSetoran) + '</td></tr>'
      + '<tr class="bayar"><td>Kontribusi rider per ' + satuan + '</td>'
      + '<td class="kanan angka">' + rp(riderPerSetoran) + '</td></tr>'
      + '<tr class="tandai"><td>Total dibayar per ' + satuan + '</td>'
      + '<td class="kanan angka">' + rp(gabunganPerSetoran) + '</td></tr>'
      /* Total selama masa bayar sengaja tidak ditampilkan saat rider kesehatan
         diambil. Kontribusi santunan dasar berhenti setelah masa bayar, sedangkan
         premi kesehatan dibayar seumur masa pertanggungan, jadi menjumlahkan
         keduanya menghasilkan angka yang menyesatkan. */
      + '<tr><td colspan="2" class="catatan">Total selama masa bayar tidak '
      + 'ditampilkan karena premi rider kesehatan dibayar selama masa '
      + 'pertanggungan rider, bukan hanya selama masa bayar santunan dasar.</td></tr>'
      + '</tbody>';
    // Nama plan dan limitnya sama dengan GHP GenPro, jadi keterangannya
    // diambil dari sumber yang sama supaya tidak ada dua versi.
    const m = DATA_GHP.plan[rider.plan];
    el('gTabelPlanGhps').innerHTML = m
      ? '<thead><tr><th>Keterangan plan</th><th>Isi</th></tr></thead><tbody>'
        + '<tr class="tandai"><td>Plan</td><td>' + esc(rider.plan) + '</td></tr>'
        + '<tr><td>Kamar</td><td>' + esc(m.kamar) + '</td></tr>'
        + '<tr><td>Wilayah pertanggungan</td><td>' + esc(m.wilayah) + '</td></tr>'
        + '<tr class="bayar"><td>Limit tahunan</td>'
        + '<td class="angka">' + rp(m.limit) + '</td></tr>'
        + '<tr class="bayar"><td>Limit booster</td>'
        + '<td class="angka">' + rp(m.booster) + '</td></tr>'
        + '<tr><td>Cara pembayaran klaim</td><td>' + esc(m.cover) + '</td></tr>'
        + '</tbody>'
      : '';

    el('gTabelNcbGhps').innerHTML = m
      ? '<thead><tr><th colspan="3">NCB — kenaikan limit booster tanpa klaim</th></tr>'
        + '<tr><th>Tahun polis tanpa klaim</th><th class="kanan">Kenaikan</th>'
        + '<th class="kanan">Limit booster</th></tr></thead><tbody>'
        + InsuranceHubGHP.ncb(m.booster).map(b =>
            '<tr class="' + (b.tahun === 5 ? 'tandai' : '') + '">'
            + '<td>' + (b.tahun === 0 ? 'Dasar' : 'Tahun ' + b.tahun) + '</td>'
            + '<td class="kanan angka">' + Math.round(b.kenaikan * 100) + '%</td>'
            + '<td class="kanan angka">' + rp(b.nilai) + '</td></tr>').join('')
        + '</tbody>'
      : '';

    el('gTabelNcdGhps').innerHTML =
      '<thead><tr><th colspan="2">NCD — diskon premi tahun berikutnya</th></tr>'
      + '<tr><th>Tanpa klaim berturut-turut</th><th class="kanan">Diskon</th></tr></thead>'
      + '<tbody>'
      + InsuranceHubGHP.NCD.map(x => '<tr><td>' + x.lama + '</td>'
          + '<td class="kanan angka">' + Math.round(x.diskon * 100) + '%</td></tr>').join('')
      + '</tbody>';

    el('gCatatanRiderRingkas').textContent = 'GHPS adalah rider kesehatan yang membayar '
      + 'biaya perawatan sesuai tagihan menurut plan yang dipilih. Preminya tidak mendapat '
      + 'potongan seperti santunan dasar, dan besarnya mengikuti usia masuk peserta. '
      + 'Satu peserta hanya boleh mengambil satu plan. Kontribusi kesehatan dibayar selama '
      + 'perlindungan berjalan, tidak berhenti bersama masa bayar santunan dasar. '
      + 'Syarat NCB: tidak ada klaim pada tahun berjalan dan total klaim selama polis aktif '
      + 'tidak melebihi 10% limit tahunan; kenaikan 10% dari limit booster dasar tiap ulang '
      + 'tahun polis, maksimal 5 kali. Kalau terjadi klaim, diskon NCD tahun berikutnya '
      + 'tidak berlaku dan hitungan tanpa klaim mulai dari awal.';
    /* Tabel masa tunggu disamakan dengan Gen Pro dan BeSMART Lite, lalu
       daftar penyakit 12 bulan tepat di bawah baris contestable period. */
    if (el('gTungguGhps')) el('gTungguGhps').innerHTML =
      '<h2 style="margin-top:18px">Masa tunggu</h2>'
      + '<div class="gulir"><table class="tahunan">'
      + '<thead><tr><th>Jenis risiko</th><th>Masa tunggu</th></tr></thead><tbody>'
      + '<tr><td>Perawatan rumah sakit karena kecelakaan</td><td>Tidak ada masa tunggu</td></tr>'
      + '<tr><td>Sakit akut seperti DBD, tipes, usus buntu, infeksi virus</td>'
      + '<td>30 hari</td></tr>'
      + '<tr><td>Sakit kronis seperti kanker, jantung, stroke, darah tinggi, diabetes, '
      + 'sinus, polip, amandel, TBC</td><td>12 bulan</td></tr>'
      + '<tr class="tandai"><td>Contestable period</td>'
      + '<td>24 bulan \u2014 sebelum lewat, klaim dapat diarahkan ke reimbursement</td></tr>'
      + '</tbody></table></div>';
    if (el('gTunggu12')) el('gTunggu12').innerHTML = (window.InsuranceHubTunggu12 ? window.InsuranceHubTunggu12.html() : '');
  } else {
    el('gTabelRider').innerHTML = '';
    el('gTabelPlanGhps').innerHTML = '';
    el('gTabelNcbGhps').innerHTML = '';
    el('gTabelNcdGhps').innerHTML = '';
    el('gCatatanRiderRingkas').textContent = '';
    if (el('gTungguGhps')) el('gTungguGhps').innerHTML = '';
    if (el('gTunggu12')) el('gTunggu12').innerHTML = '';
  }

  const maksMeninggal = r.santunanUsia100 + r.tambahanLuarNegeri
    + r.tambahanTransportasi + r.tambahanHaji;
  el('gTabelTambahan').innerHTML =
    '<thead><tr><th>Manfaat</th><th class="kanan">Nilai</th><th>Dasar perhitungan</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Santunan dasar' + (r.wakaf ? ' (termasuk Term Life)' : '') + '</td>'
    + '<td class="kanan angka">' + rp(r.santunanNet + (r.wakaf ? r.nilaiWakaf : 0)) + '</td>'
    + '<td>UP Dasar' + (r.wakaf ? ' + Term Life wakaf' : '') + '</td></tr>'
    + '<tr><td>Booster maksimum di usia 100</td>'
    + '<td class="kanan angka">' + rp(r.santunanUsia100 - r.upDasar) + '</td>'
    + '<td>7,5% UP Dasar tiap 5 tahun, dibatasi 150%</td></tr>'
    + '<tr class="bayar"><td>Meninggal di luar wilayah Indonesia</td>'
    + '<td class="kanan angka">' + rp(r.tambahanLuarNegeri) + '</td>'
    + '<td>10% UP Dasar, maksimal Rp500 juta</td></tr>'
    + '<tr class="bayar"><td>Kecelakaan transportasi umum</td>'
    + '<td class="kanan angka">' + rp(r.tambahanTransportasi) + '</td>'
    + '<td>100% UP Dasar, maksimal Rp2 miliar</td></tr>'
    + '<tr class="bayar"><td>Meninggal saat haji atau umrah</td>'
    + '<td class="kanan angka">' + rp(r.tambahanHaji) + '</td>'
    + '<td>100% UP Dasar, maksimal Rp1 miliar, khusus Muslim</td></tr>'
    + '<tr class="tandai"><td>Potensi manfaat meninggal tertinggi</td>'
    + '<td class="kanan angka">' + rp(maksMeninggal) + '</td>'
    + '<td>Seluruh skenario terjadi bersamaan di usia 100</td></tr>'
    + '</tbody>';

  el('gCatatanTambahan').textContent = 'Ketiga manfaat tambahan ini nilainya sama sepanjang '
    + 'polis, tidak berubah tiap tahun, sehingga cukup ditulis sekali di sini. '
    + 'Kombinasi lain: dengan luar negeri ' + rp(r.maksLuarNegeri)
    + ', dengan transportasi umum ' + rp(r.maksTransportasi) + '.';

  const bg = r.boosterGratis;
  el('gPengantarBooster').textContent = 'Setiap 5 tahun santunan naik ' + rp(bg.nilaiBooster)
    + ' tanpa menambah kontribusi sepeser pun. Tabel di bawah menjawab pertanyaan '
    + 'sebaliknya: seandainya kenaikan itu harus dibeli sendiri sebagai polis baru di usia '
    + 'saat kenaikan terjadi, berapa yang harus dikeluarkan.';

  el('gTabelBooster').innerHTML =
    '<thead><tr><th>No</th><th>Thn</th><th>Usia</th><th class="kanan">Tambahan UP</th>'
    + '<th class="kanan">Premi jika beli baru</th><th class="kanan">Total bayar</th>'
    + '</tr></thead><tbody>'
    + bg.baris.map(b =>
        '<tr class="' + (b.bisa ? 'bayar' : '') + '">'
        + '<td>' + b.no + '</td><td>' + b.tahunPolis + '</td><td>' + b.usia + '</td>'
        + '<td class="kanan angka">' + rp(b.nilaiBooster) + '</td>'
        + '<td class="kanan angka">' + (b.bisa ? rp(b.premiBaru) : 'Tidak bisa dibeli') + '</td>'
        + '<td class="kanan angka">' + (b.bisa ? rp(b.totalBaru) : '\u2014') + '</td></tr>').join('')
    + '<tr class="tandai"><td colspan="4">Total jika dibeli sendiri</td>'
    + '<td class="kanan">\u2014</td>'
    + '<td class="kanan angka">' + rp(bg.totalBeli) + '</td></tr>'
    + '<tr class="tandai"><td colspan="4">Yang sebenarnya dibayar nasabah untuk kenaikan ini</td>'
    + '<td class="kanan">\u2014</td><td class="kanan angka">Rp 0</td></tr>'
    + '</tbody>';

  el('gCatatanBooster').textContent = 'Dari ' + bg.baris.length + ' kali kenaikan, hanya '
    + bg.bisaBeli + ' yang masih mungkin dibeli sebagai polis baru karena batas usia masuk '
    + bg.usiaMaks + ' tahun untuk masa bayar ' + inp.mpp + ' tahun. Sisanya tidak bisa dibeli '
    + 'dengan harga berapa pun. Premi polis baru dihitung memakai tarif pada usia saat '
    + 'kenaikan terjadi dan masa bayar yang sama, mengikuti metode bayar ' + inp.metode + '.';

  el('gSangkalan').textContent = 'Ilustrasi ini dihitung dari tarif yang berlaku saat ini dan '
    + 'dipakai untuk membantu penjelasan produk kepada calon nasabah. Manfaat tambahan haji '
    + 'atau umrah khusus untuk peserta Muslim. Bukan bagian dari polis dan tidak mengikat '
    + 'secara hukum. Nilai final tunduk pada Ketentuan Polis resmi PT Asuransi Jiwa Generali '
    + 'Indonesia dan hasil underwriting.';

  const na = el('gAgenNama').value, hp = el('gAgenHP').value;
  el('gKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function gAturan() {
  el('gAturan').innerHTML =
  '<details><summary>Cara kontribusi dihitung</summary><div class="isi"><ul>'
  + '<li>Tarif dasar diambil per Rp100 juta UP Dasar, sesuai masa bayar, jenis kelamin, dan usia.</li>'
  + '<li>Diskon mengikuti besar UP Dasar: 15% mulai Rp500 juta, 25% mulai Rp850 juta, 30% mulai Rp1 miliar, 35% mulai Rp1,7 miliar, 40% mulai Rp2,5 miliar, 45% mulai Rp5 miliar.</li>'
  + '<li>Kontribusi tahunan dihitung 11 kali kontribusi bulanan setelah diskon.</li>'
  + '<li>Masa bayar 5 tahun tersedia sampai usia 70, 10 tahun sampai 65, dan 15 tahun sampai 60.</li>'
  + '</ul></div></details>'

  + '<details><summary>Dua cara menentukan UP</summary><div class="isi"><ul>'
  + '<li>Dari UP: agen memasukkan UP Dasar, preminya dihitung maju.</li>'
  + '<li>Dari premi: agen memasukkan premi net yang sanggup dibayar nasabah, UP Dasar dihitung mundur. Karena diskon bergantung pada UP, tiap tier dicoba dan yang dipakai adalah tier yang hasilnya benar-benar jatuh di rentang tier itu sendiri.</li>'
  + '<li>Pada mode dari premi, angka UP Dasar yang diketik manual diabaikan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Aturan wakaf</summary><div class="isi"><ul>'
  + '<li>UP Dasar tidak dapat diwakafkan. Yang diwakafkan berasal dari Term Life.</li>'
  + '<li>Term Life dihitung otomatis: nilai wakaf dibagi persentase wakaf.</li>'
  + '<li>Persentase wakaf yang diperbolehkan 10% sampai 45%.</li>'
  + '<li>Premi wakaf tidak mendapat diskon; diskon hanya berlaku untuk UP Dasar.</li>'
  + '<li>Mode wakaf tidak tersedia untuk masa bayar 15 tahun.</li>'
  + '<li>Sisa Term Life di luar porsi wakaf tetap menjadi hak ahli waris.</li>'
  + '</ul></div></details>'

  + '<details><summary>Rider pembebasan kontribusi (Waiver)</summary><div class="isi"><ul>'
  + '<li>Waiver membebaskan kontribusi santunan dasar bila peserta terdiagnosa salah satu dari 66 penyakit kritis dan memenuhi ketentuan polis.</li>'
  + '<li>Pembebasan berjalan sejak kejadian sampai akhir masa bayar santunan dasar. Untuk masa bayar 10 tahun, kejadian di awal tahun keempat berarti kontribusi tahun keempat sampai kesepuluh dibebaskan.</li>'
  + '<li>Yang dibebaskan hanya kontribusi santunan dasar. Premi rider apa pun, termasuk kontribusi waiver sendiri dan kontribusi Term Life wakaf, tetap harus dibayar.</li>'
  + '<li>Kontribusi waiver mengikuti tier diskon yang sama dengan UP Dasar. Kalau UP Dasar mendapat diskon 45%, kontribusi waiver juga dipotong 45%.</li>'
  + '<li>Tarifnya per Rp100 juta UP Dasar, berbeda menurut masa bayar dan jenis kelamin, dan naik cukup tajam seiring usia.</li>'
  + '<li>Karena masa perlindungannya mengikuti masa bayar, nilainya paling terasa bila kejadian berlangsung di tahun-tahun awal. Untuk masa bayar 5 tahun, perlindungannya hanya 5 tahun pertama.</li>'
  + '</ul></div></details>'

  + '<details><summary>Rider kesehatan GHPS</summary><div class="isi"><ul>'
  + '<li>GHPS adalah rider kesehatan yang membayar biaya perawatan sesuai tagihan menurut plan yang dipilih.</li>'
  + '<li>Preminya tidak mendapat potongan seperti santunan dasar; dibayar penuh sesuai usia masuk peserta.</li>'
  + '<li>Premi tahunan dihitung 11 kali premi bulanan, sama seperti santunan dasar.</li>'
  + '<li>Tarifnya tidak membedakan pria dan wanita, dan tidak berubah menurut masa bayar. Yang membatasi hanya usia masuk: 70 tahun untuk masa bayar 5 tahun, 65 untuk 10 tahun, dan 60 untuk 15 tahun.</li>'
  + '<li>Satu peserta hanya boleh mengambil satu plan.</li>'
  + '<li>Masa bayar 15 tahun mensyaratkan rider GHPS diambil. Saat masa bayar itu dipilih, tombolnya otomatis menyala dan pilihan Tidak dikunci.</li>'
  + '<li>Premi rider ikut dihitung saat membandingkan santunan terhadap total premi.</li>'
  + '</ul></div></details>'

  + '<details><summary>Manfaat dan booster</summary><div class="isi"><ul>'
  + '<li>Santunan naik 7,5% dari UP Dasar setiap 5 tahun polis berjalan, dibatasi 150%.</li>'
  + '<li>Tambahan meninggal di luar wilayah Indonesia: 10% UP Dasar, maksimal Rp500 juta.</li>'
  + '<li>Tambahan kecelakaan transportasi umum: 100% UP Dasar, maksimal Rp2 miliar.</li>'
  + '<li>Tambahan meninggal saat haji atau umrah: 100% UP Dasar, maksimal Rp1 miliar, khusus peserta Muslim.</li>'
  + '<li>Perlindungan berjalan sampai usia 100 tahun.</li>'
  + '</ul></div></details>';
}

gGambar();


/* ============ iFLEXYGUARD 5 ============ */
el('xUP').addEventListener('input', () => {
  const kotak = el('xUP');
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  xGambar();
});
['xNama', 'xTgl', 'xAgenNama', 'xAgenHP'].forEach(id =>
  el(id).addEventListener('input', xGambar));
['xMpp', 'xMetode'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  xGambar();
}));

function xGambar() {
  const tgl = el('xTgl').value;
  const up = bAngka(el('xUP').value);
  const inp = {
    nama: el('xNama').value,
    tglLahir: tgl ? new Date(tgl + 'T00:00:00Z') : null,
    mpp: +nilaiSegmen('xMpp'),
    metode: nilaiSegmen('xMetode'),
    up: up,
  };
  xAturan();

  if (!tgl || !up) {
    el('xInfoUsia').textContent = !tgl
      ? 'Isi tanggal lahir untuk menghitung usia masuk.'
      : 'Isi UP Dasar untuk melihat premi.';
    ['xHasil', 'xFase', 'xFaseIlus', 'xIdentitas', 'xKotakRingkas', 'xTabel',
     'xTabelManfaat', 'xKakiAgen'].forEach(i => el(i).innerHTML = '');
    el('xSangkalan').textContent = '';
    el('xCatatanTabel').textContent = '';
    el('xCatatanManfaat').textContent = '';
    return;
  }

  const r = InsuranceHubEngine.calculate('FLEX', inp, { rates: TARIF_FLEX });
  const satuan = inp.metode === 'Bulanan' ? 'bulan' : 'tahun';
  el('xInfoUsia').textContent = 'Usia masuk ' + r.usia + ' tahun'
    + (inp.nama ? ' \u2022 ' + inp.nama : '');

  if (!r.tersedia) {
    el('xHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    ['xFase', 'xFaseIlus', 'xIdentitas', 'xKotakRingkas', 'xTabel', 'xTabelManfaat',
     'xKakiAgen'].forEach(i => el(i).innerHTML = '');
    el('xSangkalan').textContent = '';
    el('xCatatanTabel').textContent = '';
    el('xCatatanManfaat').textContent = '';
    return;
  }

  el('xHasil').innerHTML =
    '<div class="sorotan"><div class="k">Yang dibayar nasabah</div>'
    + '<div class="v angka">' + rp(r.premiAktif) + ' <small>/' + satuan + '</small></div>'
    + '<div class="t">Dibayar selama ' + inp.mpp + ' tahun, lalu berhenti. Total '
    + rp(r.totalDibayar) + '. Proteksi berjalan sampai usia 99.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + '</div></div>'
    + '<div class="kartu"><div class="k">Manfaat tahun 1\u20135</div>'
    + '<div class="v angka">' + rp(r.manfaatTahun1) + '</div></div>'
    + '<div class="kartu"><div class="k">Manfaat tahun 6\u201310 (150%)</div>'
    + '<div class="v angka">' + rp(r.manfaatTahun6) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Manfaat tahun 11 ke atas (200%)</div>'
    + '<div class="v angka">' + rp(r.manfaatTahun11) + '</div></div>'
    + '<div class="kartu"><div class="k">Bonus 75 (50% UP)</div>'
    + '<div class="v angka">' + rp(r.bonus75) + '</div></div>'
    + '<div class="kartu"><div class="k">Tambahan kecelakaan</div>'
    + '<div class="v angka">' + rp(r.tambahanKecelakaan) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Manfaat akhir masa asuransi (usia 99)</div>'
    + '<div class="v angka">' + rp(r.akhirMasa) + '</div>'
    + '<div class="k" style="margin-top:6px">Tarif dasar per '
    + rpSingkat(r.basisUP) + ': <b>' + rp(r.tarifBulanan) + '</b> bulanan, <b>'
    + rp(r.tarifTahunan) + '</b> tahunan.</div></div></div>';

  const fase =
    '<div class="tahap"><b>Tahun 1 sampai ' + inp.mpp + '</b>'
    + '<span>Membayar ' + rp(r.premiAktif) + ' per ' + satuan + '. Total '
    + rp(r.totalDibayar) + '.</span></div>'
    + '<div class="tahap"><b>Manfaat meninggal naik sendiri</b>'
    + '<span>Tahun 1\u20135 sebesar ' + rp(r.manfaatTahun1) + ', tahun 6\u201310 naik jadi '
    + rp(r.manfaatTahun6) + ', tahun 11 ke atas menjadi ' + rp(r.manfaatTahun11)
    + '. Tanpa tambahan premi.</span></div>'
    + '<div class="tahap"><b>Di usia 75 tahun</b>'
    + '<span>Bonus 75 cair sebesar ' + rp(r.bonus75)
    + '. Setelah itu manfaat meninggal berkurang sebesar bonus yang sudah dibayarkan.</span></div>'
    + '<div class="tahap tenang"><b>Di usia 99 tahun</b>'
    + '<span>Manfaat akhir masa asuransi ' + rp(r.akhirMasa)
    + ', yaitu 150% dari UP Dasar.</span></div>';
  el('xFase').innerHTML = fase;
  el('xFaseIlus').innerHTML = fase;

  el('xIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(inp.nama || '\u2014') + '</b></div>'
    + '<div>Usia masuk<b>' + r.usia + ' tahun</b></div>'
    + '<div>Masa bayar<b>' + inp.mpp + ' tahun</b></div>'
    + '<div>Metode bayar<b>' + inp.metode + '</b></div>';

  el('xKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiAktif) + '</div></div>'
    + '<div class="kartu"><div class="k">' + (inp.metode === 'Bulanan' ? 'Premi per Tahun' : 'Premi Tahunan') + '</div>'
    + '<div class="v angka">' + rp(r.premiPerTahun) + '</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + inp.mpp + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Total dibayar</div><div class="v angka">' + rp(r.totalDibayar) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Manfaat meninggal tertinggi (tahun 11 ke atas)</div>'
    + '<div class="v angka">' + rp(r.manfaatTahun11) + '</div>'
    + '<div class="k" style="margin-top:6px">Ditambah tambahan kecelakaan <b>'
    + rp(r.tambahanKecelakaan) + '</b>, menjadi <b>'
    + rp(r.manfaatTahun11 + r.tambahanKecelakaan) + '</b>.</div></div></div>';

  // Nilai yang tidak berubah tiap tahun ditulis sekali di sini
  el('xTabelManfaat').innerHTML =
    '<thead><tr><th>Manfaat</th><th class="kanan">Nilai</th><th>Dasar perhitungan</th></tr></thead>'
    + '<tbody>'
    + '<tr><td>Meninggal tahun polis 1\u20135</td>'
    + '<td class="kanan angka">' + rp(r.manfaatTahun1) + '</td><td>100% UP Dasar</td></tr>'
    + '<tr><td>Meninggal tahun polis 6\u201310</td>'
    + '<td class="kanan angka">' + rp(r.manfaatTahun6) + '</td><td>150% UP Dasar</td></tr>'
    + '<tr><td>Meninggal tahun polis 11 ke atas</td>'
    + '<td class="kanan angka">' + rp(r.manfaatTahun11) + '</td><td>200% UP Dasar</td></tr>'
    + '<tr class="bayar"><td>Tambahan akibat kecelakaan</td>'
    + '<td class="kanan angka">' + rp(r.tambahanKecelakaan) + '</td>'
    + '<td>100% UP Dasar, maksimal Rp1 miliar</td></tr>'
    + '<tr class="bayar"><td>Bonus 75 di usia 75</td>'
    + '<td class="kanan angka">' + rp(r.bonus75) + '</td>'
    + '<td>50% UP Dasar, mengurangi manfaat setelahnya</td></tr>'
    + '<tr class="tandai"><td>Manfaat akhir masa asuransi di usia 99</td>'
    + '<td class="kanan angka">' + rp(r.akhirMasa) + '</td><td>150% UP Dasar</td></tr>'
    + '</tbody>';
  el('xCatatanManfaat').textContent = 'Nilai di tabel ini tidak berubah tiap tahun, '
    + 'sehingga cukup ditulis sekali. Yang berubah adalah manfaat mana yang berlaku pada '
    + 'tahun tertentu, dan itu terlihat di tabel berikutnya.';

  const penting = r.ilustrasi.filter(b =>
    b.tahun <= inp.mpp + 1 || b.tahun === 5 || b.tahun === 6 || b.tahun === 10
    || b.tahun === 11 || b.usia === 75 || b.usia === 74 || b.tahun % 10 === 0
    || b.tahun === r.ilustrasi.length);
  el('xTabel').innerHTML =
    '<thead><tr><th>Thn</th><th>Usia</th><th class="kanan">Premi setahun</th>'
    + '<th class="kanan">Bonus 75</th><th class="kanan">Meninggal</th>'
    + '<th class="kanan">Meninggal kecelakaan</th><th>Catatan</th></tr></thead><tbody>'
    + penting.map(b =>
        '<tr class="' + (b.premi ? 'bayar' : '') + (b.keterangan ? ' tandai' : '') + '">'
        + '<td>' + b.tahun + '</td><td>' + b.usia + '</td>'
        + '<td class="kanan angka">' + (b.premi ? rp(b.premi) : '\u2014') + '</td>'
        + '<td class="kanan angka">' + (b.bonus75 ? rp(b.bonus75) : '\u2014') + '</td>'
        + '<td class="kanan angka">' + rp(b.rip) + '</td>'
        + '<td class="kanan angka">' + rp(b.ripKecelakaan) + '</td>'
        + '<td>' + (b.akhirMasa ? 'Akhir masa, cair ' + rp(b.akhirMasa) : b.keterangan)
        + '</td></tr>').join('')
    + '<tr class="tandai"><td colspan="2">Total premi</td>'
    + '<td class="kanan angka">' + rp(r.totalPremiIlustrasi) + '</td>'
    + '<td colspan="4"></td></tr></tbody>';

  el('xCatatanTabel').textContent = 'Polis berjalan ' + r.ilustrasi.length
    + ' tahun, dari usia ' + r.usia + ' sampai 99. Tabel menampilkan tahun masa bayar, '
    + 'tahun saat manfaat naik, tahun Bonus 75 cair, setiap kelipatan 10 tahun, dan tahun '
    + 'terakhir. Kolom premi memakai angka setahun'
    + (inp.metode === 'Bulanan' ? ' (premi bulanan dikali 12).' : ' (premi tahunan).');

  el('xSangkalan').textContent = 'Ilustrasi ini dihitung dari tarif yang berlaku saat ini dan '
    + 'dipakai untuk membantu penjelasan produk kepada calon nasabah. Nilai tunai umumnya '
    + 'mulai mencapai titik impas terhadap premi sekitar tahun ke-13; rinciannya mengikuti '
    + 'proposal resmi perusahaan. Bukan bagian dari polis dan tidak mengikat secara hukum. '
    + 'Nilai final tunduk pada Ketentuan Polis resmi PT Asuransi Jiwa Generali Indonesia '
    + 'dan hasil underwriting.';

  const na = el('xAgenNama').value, hp = el('xAgenHP').value;
  el('xKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function xAturan() {
  el('xAturan').innerHTML =
  '<details><summary>Cara premi dihitung</summary><div class="isi"><ul>'
  + '<li>Tarif diambil dari database iFLEXYGUARD sesuai usia masuk, masa bayar, dan metode bayar.</li>'
  + '<li>Premi dihitung proporsional dari UP Dasar terhadap basis UP pada database.</li>'
  + '<li>Premi bulanan dan tahunan punya tarif sendiri-sendiri, bukan sekadar dibagi dua belas.</li>'
  + '<li>Tarif tidak membedakan pria dan wanita.</li>'
  + '<li>Database memuat usia masuk 0 sampai 60 tahun untuk masa bayar 5 tahun.</li>'
  + '</ul></div></details>'

  + '<details><summary>Manfaat polis</summary><div class="isi"><ul>'
  + '<li>Manfaat meninggal naik otomatis: tahun polis 1 sampai 5 sebesar 100% UP Dasar, tahun 6 sampai 10 sebesar 150%, tahun 11 ke atas sebesar 200%.</li>'
  + '<li>Kenaikan itu tidak menambah premi.</li>'
  + '<li>Tambahan meninggal akibat kecelakaan sebesar 100% UP Dasar, maksimal Rp1 miliar.</li>'
  + '<li>Bonus 75 dibayarkan sebesar 50% UP Dasar saat tertanggung mencapai usia 75 tahun.</li>'
  + '<li>Bonus 75 mengurangi manfaat meninggal dan nilai tunai setelah usia 75 tahun.</li>'
  + '<li>Manfaat akhir masa asuransi di usia 99 sebesar 150% UP Dasar.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas kalkulator ini</summary><div class="isi"><ul>'
  + '<li>Database masa bayar 10 tahun baru terisi untuk usia 0 sampai 2, sehingga di luar itu pilihannya ditolak dengan pesan.</li>'
  + '<li>Nilai tunai tidak dihitung di sini; angkanya mengikuti proposal resmi perusahaan.</li>'
  + '</ul></div></details>';
}

xGambar();


/* ============ GHP GenPro ============ */
const GHP_PLAN = DATA_GHP.urutan;
const opsiPlan = terpilih => GHP_PLAN.map(p =>
  '<option value="' + p + '"' + (p === terpilih ? ' selected' : '') + '>' + p + '</option>').join('');
el('hPlan').innerHTML = opsiPlan('Gold Standard');

// Daftar anggota keluarga. Baris pertama menentukan skema jiwa dan metode
// bayar untuk seluruh keluarga, mengikuti perilaku sheet Excel-nya.
let hAnggota = [
  { nama: '', tgl: '', jk: 'Pria',   plan: 'Gold Standard', up: 10000000 },
  { nama: '', tgl: '', jk: 'Wanita', plan: 'Gold Standard', up: 10000000 },
];

/* Anggota keluarga Gen Pro diisi dari Profil Nasabah bila profilnya sudah
   memuat pasangan dan anak. Tujuannya agar agen tidak mengetik ulang data
   yang sudah ada. Baris yang sudah diisi manual tidak ditimpa, dan pengisian
   ini hanya berjalan sekali per profil supaya perubahan agen tidak dibatalkan
   setiap layar digambar ulang. */
let hProfilTerpakai = '';

function hIsiDariProfil(paksa) {
  try {
    if (typeof cpGetActive !== 'function' || typeof cpRead !== 'function') return false;
    const id = cpGetActive();
    /* Selalu ikuti PROFIL AKTIF, bukan profil terakhir yang pernah dibuka.
       Jika profil aktif dikosongkan/dihapus, bersihkan juga data keluarga
       agar anggota dari profil sebelumnya tidak tertinggal. */
    if (!id) {
      hProfilTerpakai = '';
      hAnggota = [{ nama: '', tgl: '', jk: 'Pria', plan: 'Gold Standard', up: 10000000 }];
      return true;
    }
    if (!paksa && hProfilTerpakai === id) return false;
    const p = (cpRead() || []).find(x => x.id === id);
    if (!p) {
      hProfilTerpakai = '';
      hAnggota = [{ nama: '', tgl: '', jk: 'Pria', plan: 'Gold Standard', up: 10000000 }];
      return true;
    }
    hProfilTerpakai = id;

    const daftar = [];
    if (p.nama) {
      daftar.push({ nama: p.nama, tgl: p.tglLahir || '',
        jk: String(p.jk || 'Pria').toUpperCase() === 'WANITA' ? 'Wanita' : 'Pria',
        plan: 'Gold Standard', up: 10000000 });
    }
    /* Pasangan mengambil NAMA dari Data Utama, sedangkan TANGGAL LAHIR
       mengambil data keluarga/relasi yang sudah diisi. Jadi bila profile
       sudah punya nama pasangan + DOB di Keluarga & relasi, keduanya langsung
       masuk ke Gen Pro/GHP Family tanpa mengetik ulang. */
    const fam = Array.isArray(p.family) ? p.family : [];
    const spouse = fam.find(x => x && (x.id === 'spouse' || /^(istri|suami|pasangan)$/i.test(x.hubungan || '')));
    const namaPasangan = (p.pasangan || spouse?.nama || '').trim();
    if (namaPasangan) {
      daftar.push({ nama: namaPasangan, tgl: spouse?.tglLahir || '',
        jk: (daftar[0] && daftar[0].jk === 'Pria') ? 'Wanita' : 'Pria',
        plan: 'Gold Standard', up: 10000000 });
    }
    (p.children || []).forEach(function (a) {
      if (!a || (!a.nama && !a.tglLahir)) return;
      daftar.push({ nama: a.nama || 'Anak', tgl: a.tglLahir || '',
        jk: 'Pria', plan: 'Gold Standard', up: 10000000 });
    });

    /* Profil adalah sumber awal data keluarga. Ketika profil aktif berganti,
       daftar lama WAJIB dibersihkan, termasuk saat profil baru tidak memiliki
       pasangan/anak. Sebelumnya fungsi berhenti di `if (!daftar.length) return`
       sehingga data keluarga profil sebelumnya tetap terbawa. Jangan menahan
       pengisian hanya karena nama utama sudah ada di baris pertama: nama itu
       memang berasal dari profil aktif. */
    if (!daftar.length) {
      hAnggota = [{ nama: '', tgl: '', jk: 'Pria', plan: 'Gold Standard', up: 10000000 }];
      return true;
    }
    hAnggota = daftar;
    return true;
  } catch (_) {}
}

function hGambarDaftar() {
  hIsiDariProfil(false);
  el('hDaftar').innerHTML = hAnggota.map((a, i) => `
    <div class="blok" style="margin-bottom:10px;background:#FBFAF7">
      <div class="baris satu">
        <div><label for="hn${i}">Nama tertanggung ${i + 1}</label>
          <input id="hn${i}" data-i="${i}" data-f="nama" type="text"
                 value="${esc(a.nama)}" placeholder="Tulis nama" autocomplete="off"></div>
      </div>
      <div class="baris">
        <div><label for="ht${i}">Tanggal lahir</label>
          <input id="ht${i}" data-i="${i}" data-f="tgl" type="date" value="${a.tgl}"></div>
        <div><label for="hj${i}">Jenis kelamin</label>
          <select id="hj${i}" data-i="${i}" data-f="jk">
            <option${a.jk === 'Pria' ? ' selected' : ''}>Pria</option>
            <option${a.jk === 'Wanita' ? ' selected' : ''}>Wanita</option>
          </select></div>
      </div>
      <div class="baris">
        <div><label for="hp${i}">Plan kesehatan</label>
          <select id="hp${i}" data-i="${i}" data-f="plan">
            <option value=""${a.plan ? '' : ' selected'}>Tanpa rider GHP</option>
            ${opsiPlan(a.plan)}</select></div>
        <div><label for="hu${i}">UP jiwa</label>
          <input id="hu${i}" data-i="${i}" data-f="up" type="text" inputmode="numeric"
                 value="${a.up.toLocaleString('id-ID')}" autocomplete="off"></div>
      </div>
      ${hAnggota.length > 1
        ? '<button type="button" class="sakelar" data-hapus="' + i + '">Hapus anggota ini</button>'
        : ''}
    </div>`).join('');

  el('hDaftar').querySelectorAll('input, select').forEach(k =>
    k.addEventListener('input', () => {
      const i = +k.dataset.i, f = k.dataset.f;
      if (f === 'up') {
        const n = bAngka(k.value);
        k.value = n ? n.toLocaleString('id-ID') : '';
        hAnggota[i].up = n;
      } else {
        hAnggota[i][f] = k.value;
      }
      hHitung();
    }));
  el('hDaftar').querySelectorAll('[data-hapus]').forEach(b =>
    b.addEventListener('click', () => {
      hAnggota.splice(+b.dataset.hapus, 1);
      hGambarDaftar(); hHitung();
    }));
}
hGambarDaftar();

/* Saat profil aktif diganti di halaman Profil Nasabah lalu agen membuka
   Gen Pro/GHP, sinkronkan ulang daftar keluarga dari PROFIL AKTIF.
   Ini mencegah data istri/anak profil sebelumnya terbawa ke profil baru. */
if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__gproFamilyProfileHook) {
  const bukaAsliGpro = window.bukaLayar;
  const bungkusGpro = function (nama) {
    if (nama === 'GHP') {
      try {
        if (hIsiDariProfil(true)) hGambarDaftar();
      } catch (_) {}
    }
    return bukaAsliGpro.apply(this, arguments);
  };
  bungkusGpro.__gproFamilyProfileHook = true;
  ['__naHook','__rzHook','__promptHook','__umumHook','__ghpBandingHook','__bandingProdukHook','__pdkAnakHook']
    .forEach(k => { bungkusGpro[k] = bukaAsliGpro[k]; });
  window.bukaLayar = bungkusGpro;
  if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkusGpro;
}

el('hTambah').addEventListener('click', () => {
  if (hAnggota.length >= 12) return;
  hAnggota.push({ nama: '', tgl: '', jk: 'Pria', plan: 'Gold Standard', up: 10000000 });
  hGambarDaftar(); hHitung();
});

el('hUP').addEventListener('input', () => {
  const kotak = el('hUP');
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  hHitung();
});
['hNama', 'hTgl', 'hPlan', 'hAgenNama', 'hAgenHP'].forEach(id =>
  el(id).addEventListener('input', hHitung));
['hMode', 'hJK', 'hSkema', 'hMetode', 'hRider'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  /* Mode Individu dan Keluarga sama-sama harus memakai PROFIL AKTIF.
     Jangan pernah mempertahankan state dari profil/ mode sebelumnya. */
  if (id === 'hMode') {
    if (b.dataset.nilai === 'Keluarga') {
      hIsiDariProfil(true);
      hGambarDaftar();
    } else {
      try {
        const p = typeof cpGetActive === 'function' && typeof cpRead === 'function'
          ? (cpRead() || []).find(x => x.id === cpGetActive()) : null;
        if (p) {
          if (el('hNama')) el('hNama').value = p.nama || '';
          if (el('hTgl')) el('hTgl').value = p.tglLahir || '';
          if (el('hJK')) {
            const jk = String(p.jk || 'PRIA').toUpperCase() === 'WANITA' ? 'Wanita' : 'Pria';
            el('hJK').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.nilai === jk));
          }
        } else {
          if (el('hNama')) el('hNama').value = '';
          if (el('hTgl')) el('hTgl').value = '';
          if (el('hJK')) el('hJK').querySelectorAll('button').forEach((x,i) => x.setAttribute('aria-pressed', i === 0));
        }
      } catch (_) {}
    }
  }
  hHitung();
}));

function hBarisPremi(judul, h, metode) {
  const premiPerTahunTampil = metode === 'Bulanan' ? Number(h.totalBulanan || 0) * 12 : Number(h.totalTahunan || 0);
  return '<tr><td>' + esc(judul) + '</td>'
    + '<td class="kanan angka">' + rp(h.premiJiwaBulanan) + '</td>'
    + '<td class="kanan angka">' + rp(h.premiSehatBulanan) + '</td>'
    + '<td class="kanan angka">' + rp(h.totalBulanan) + '</td>'
    + '<td class="kanan angka">' + rp(premiPerTahunTampil) + '</td></tr>';
}

function hHitung() {
  const keluarga = nilaiSegmen('hMode') === 'Keluarga';
  el('hBlokIndv').style.display = keluarga ? 'none' : '';
  el('hBlokFam').style.display = keluarga ? '' : 'none';
  hAturan();

  const skema = nilaiSegmen('hSkema'), metode = nilaiSegmen('hMetode');
  const kosong = () => {
    ['hHasil', 'hIdentitas', 'hKotakRingkas', 'hTabelPremi', 'hTabelManfaat',
     'hTabelNCB', 'hTabelNCD', 'hTabelTunggu', 'hTunggu12', 'hKakiAgen'].forEach(i => { if (el(i)) el(i).innerHTML = ''; });
    el('hSangkalan').textContent = '';
    el('hCatatanPremi').textContent = '';
    el('hCatatanNC').textContent = '';
  };

  let daftar, ringkas, judul;
  if (keluarga) {
    const isi = hAnggota.filter(a => a.tgl && a.nama);
    if (!isi.length) {
      el('hHasil').innerHTML = '<div class="peringatan">Isi minimal satu anggota '
        + 'dengan nama dan tanggal lahir.</div>';
      kosong(); el('hHasil').innerHTML = '<div class="peringatan">Isi minimal satu '
        + 'anggota dengan nama dan tanggal lahir.</div>';
      return;
    }
    const k = InsuranceHubEngine.calculate('GHP', {
      mode: 'family',
      members: isi.map(a => ({
        nama: a.nama, tglLahir: new Date(a.tgl + 'T00:00:00Z'), jk: a.jk,
        plan: a.plan, upJiwa: a.up, skema, metode,
      }))
    }, { rates: DATA_GHP });
    daftar = k.baris;
    ringkas = k;
    judul = 'Keluarga ' + k.jumlahAktif + ' tertanggung';
  } else {
    const tgl = el('hTgl').value;
    if (!tgl) {
      el('hInfoUsia').textContent = 'Isi tanggal lahir untuk menghitung usia.';
      kosong(); return;
    }
    const pakaiRider = nilaiSegmen('hRider') === 'Ya';
    el('hBarisPlan').style.display = pakaiRider ? '' : 'none';
    const h = InsuranceHubEngine.calculate('GHP', {
      tglLahir: new Date(tgl + 'T00:00:00Z'), jk: nilaiSegmen('hJK'),
      skema, metode, plan: pakaiRider ? el('hPlan').value : null,
      pakaiRider: pakaiRider, upJiwa: bAngka(el('hUP').value),
    }, { rates: DATA_GHP });
    el('hInfoUsia').textContent = 'Usia ' + h.usia + ' tahun'
      + (el('hNama').value ? ' \u2022 ' + el('hNama').value : '');
    if (!h.tersedia) {
      el('hHasil').innerHTML = '<div class="peringatan">' + esc(h.alasan) + '</div>';
      kosong(); el('hHasil').innerHTML = '<div class="peringatan">' + esc(h.alasan) + '</div>';
      return;
    }
    /* jk ikut disertakan supaya label rincian menampilkan jenis kelamin yang
       benar juga pada mode tertanggung tunggal, bukan hanya mode keluarga. */
    daftar = [{ nama: el('hNama').value || 'Nasabah', plan: h.plan,
                jk: nilaiSegmen('hJK'), hasil: h }];
    ringkas = {
      jumlahAktif: 1, totalJiwaBulanan: h.premiJiwaBulanan,
      totalSehatBulanan: h.premiSehatBulanan, totalBulanan: h.totalBulanan,
      totalTahunan: h.totalTahunan, totalAktif: h.premiAktif, rataRata: h.premiAktif,
    };
    judul = el('hNama').value || 'Nasabah';
  }

  const sah = daftar.filter(b => b.hasil.tersedia);
  const gagal = daftar.filter(b => !b.hasil.tersedia);
  const satuan = metode === 'Bulanan' ? 'bulan' : 'tahun';
  const denganRider = sah.filter(b => b.hasil.pakaiRider);
  const totalHemat = sah.reduce((t, b) => t + (b.hasil.hematJiwaBulanan || 0), 0);
  const totalJiwaSebelumDiskon = sah.reduce(
    (t, b) => t + (b.hasil.premiJiwaSebelumDiskon || 0), 0);
  const adaRiderGhp = denganRider.length > 0;
  const totalPremiTahunanTampil = metode === 'Bulanan'
    ? ringkas.totalBulanan * 12
    : ringkas.totalTahunan;

  el('hHasil').innerHTML =
    gagal.map(b => '<div class="peringatan">' + esc(b.nama || 'Tanpa nama') + ': '
      + esc(b.hasil.alasan) + '</div>').join('')
    + (sah.length
      ? '<div class="sorotan"><div class="k">Yang dibayar' + (keluarga ? ' sekeluarga' : '') + '</div>'
        + '<div class="v angka">' + rp(ringkas.totalAktif) + ' <small>/' + satuan + '</small></div>'
        + '<div class="t">Basis ringkasan mengikuti metode bayar yang dipilih.'
        + (adaRiderGhp ? ' Total premi per tahun: ' + rp(totalPremiTahunanTampil) + ' *.' : '')
        + '</div></div>'
        + '<div class="ikhtisar">'
        + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
        + '<div class="v angka">' + rp(ringkas.totalAktif) + '</div></div>'
        + (adaRiderGhp ? '<div class="kartu"><div class="k">Premi GHP per ' + satuan + '</div><div class="v angka">' + rp(ringkas.totalSehatBulanan * (metode === 'Bulanan' ? 1 : 11)) + ' *</div></div>' : '')
        + (metode === 'Bulanan' ? '<div class="kartu"><div class="k">Premi per Tahun</div><div class="v angka">' + rp(ringkas.totalAktif * 12) + '</div></div>' : '<div class="kartu"><div class="k">Premi Tahunan</div><div class="v angka">' + rp(ringkas.totalAktif) + '</div></div>')
        + (totalHemat > 0
          ? '<div class="kartu penuh"><div class="k">Diskon premi UP jiwa dasar</div>'
            + '<div class="v angka">' + rp(totalHemat) + ' /bulan</div>'
            + '<div class="k" style="margin-top:6px">Sebelum diskon premi jiwa '
            + rp(totalJiwaSebelumDiskon) + ' per bulan'
            + (keluarga ? '' : ', potongan ' + Math.round(sah[0].hasil.diskonJiwa * 100) + '%')
            + '. Diskon hanya berlaku untuk UP jiwa dasar, bukan premi rider '
            + 'kesehatan.</div></div>'
          : '')
        + (keluarga
          ? '<div class="kartu"><div class="k">Tertanggung aktif</div>'
            + '<div class="v angka">' + ringkas.jumlahAktif + ' orang</div></div>'
            + '<div class="kartu"><div class="k">Rata-rata per orang</div>'
            + '<div class="v angka">' + rp(ringkas.rataRata) + '</div></div>'
          : (daftar[0].hasil.pakaiRider
            ? '<div class="kartu penuh"><div class="k">Plan ' + esc(daftar[0].plan) + '</div>'
              + '<div class="v angka">' + rp(daftar[0].hasil.manfaat.limit) + '</div>'
              + '<div class="k" style="margin-top:6px">Limit tahunan. Kamar '
              + esc(daftar[0].hasil.manfaat.kamar) + ', wilayah '
              + esc(daftar[0].hasil.manfaat.wilayah) + '.</div></div>'
            : '<div class="kartu penuh"><div class="k">Tanpa rider kesehatan</div>'
              + '<div class="v angka">UP jiwa dasar saja</div>'
              + '<div class="k" style="margin-top:6px">Nyalakan rider GHP kalau nasabah '
              + 'juga menginginkan perlindungan kesehatan.</div></div>'))
        + '</div>'
      : '');

  if (!sah.length) { return; }

  el('hIdentitas').innerHTML =
    '<div>Tertanggung<b>' + esc(judul) + '</b></div>'
    + '<div>Skema jiwa<b>' + skema + '</b></div>'
    + '<div>Metode bayar<b>' + metode + '</b></div>'
    + '<div>Premi per ' + satuan + '<b>' + rp(ringkas.totalAktif) + '</b></div>'
    + (denganRider.length && !keluarga
      ? '<div>Plan<b>Gen Pro ' + esc(skema) + '</b></div>'
        + '<div>Lama bayar<b>' + esc(skema.split('-')[0]) + ' tahun</b></div>'
      : '')
    + '<div>Rider kesehatan<b>' + (denganRider.length
        ? (keluarga ? denganRider.length + ' dari ' + sah.length + ' tertanggung'
          : 'GHP ' + esc(denganRider[0].plan)) : 'Tidak diambil') + '</b></div>';

  el('hKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(ringkas.totalAktif) + '</div></div>'
    + (adaRiderGhp
      ? '<div class="kartu penuh"><div class="k">TOTAL PREMI PER TAHUN *</div>'
        + '<div class="v angka">' + rp(totalPremiTahunanTampil) + ' *</div>'
        + '<div class="k" style="margin-top:6px">* Premi asuransi kesehatan GHP tidak mengikat.</div></div>'
        + (!keluarga ? '<div class="kartu"><div class="k">Plan</div><div class="v">Gen Pro ' + esc(skema) + '</div></div>'
          + '<div class="kartu"><div class="k">Lama bayar premi dasar + rider non-GHP</div><div class="v angka">' + esc(skema.split('-')[0]) + ' tahun</div></div>' : '')
      : '<div class="kartu"><div class="k">Skema jiwa</div><div class="v">' + esc(skema) + '</div></div>')
    + '<div class="kartu penuh"><div class="k">Rincian premi per ' + satuan + '</div>'
    + '<div class="v angka">'
    + rp(metode === 'Bulanan' ? ringkas.totalJiwaBulanan : ringkas.totalJiwaBulanan * 11)
    + ' jiwa' + (adaRiderGhp ? ' + ' + rp(metode === 'Bulanan' ? ringkas.totalSehatBulanan : ringkas.totalSehatBulanan * 11) + ' kesehatan' : '')
    + '</div>'
    + '<div class="k" style="margin-top:6px">Total premi per ' + satuan + ': <b>' + rp(ringkas.totalAktif) + '</b></div></div></div>';

  const labelPremiPerTahun = metode === 'Bulanan' ? 'Premi per Tahun' : 'Premi Tahunan';
  el('hTabelPremi').innerHTML =
    '<thead><tr><th>Tertanggung</th><th class="kanan">Jiwa /bln</th>'
    + '<th class="kanan">Kesehatan /bln</th><th class="kanan">Premi Bulanan</th>'
    + '<th class="kanan">' + labelPremiPerTahun + '</th></tr></thead><tbody>'
    /* Jenis kelamin ikut ditulis di label. Tarif jiwa pria dan wanita berbeda
       cukup jauh, dan nilai bawaan kartu anggota baru adalah Pria — tanpa
       penanda ini, anggota perempuan yang lupa diubah tidak terlihat sampai
       angkanya dibandingkan dengan ilustrasi resmi. */
    + sah.map(b => hBarisPremi(
        (b.nama || 'Tanpa nama') + ' (' + b.hasil.usia + ' th, '
        + (String(b.jk || '').toUpperCase() === 'WANITA' ? 'Wanita' : 'Pria') + ', '
        + (b.plan || 'tanpa rider') + ')', b.hasil, metode)).join('')
    + (sah.length > 1
      ? '<tr class="tandai"><td>Total</td>'
        + '<td class="kanan angka">' + rp(ringkas.totalJiwaBulanan) + '</td>'
        + '<td class="kanan angka">' + rp(ringkas.totalSehatBulanan) + '</td>'
        + '<td class="kanan angka">' + rp(ringkas.totalBulanan) + '</td>'
        + '<td class="kanan angka">' + rp(metode === 'Bulanan' ? ringkas.totalBulanan * 12 : ringkas.totalTahunan) + '</td></tr>'
      : '')
    + '</tbody>';
  el('hCatatanPremi').textContent = 'Premi jiwa dihitung proporsional dari basis UP '
    + 'Rp10 juta memakai skema ' + skema + ', lalu dipotong diskon menurut besar UP jiwa: '
    + '20% mulai Rp1 miliar dan 30% mulai Rp2,5 miliar. Premi kesehatan mengikuti plan dan '
    + 'usia masing-masing tertanggung dan tidak mendapat diskon. Premi tahunan dihitung 11 '
    + 'kali premi bulanan untuk frekuensi bayar tahunan. Jika frekuensi bayar yang dipilih adalah bulanan, kolom Premi per Tahun pada rincian adalah premi bulanan × 12. Premi dapat '
    + 'meningkat sesuai pertambahan usia; angka di sini adalah premi saat masuk.';

  const planTampil = [];
  denganRider.forEach(b => {
    if (b.plan && planTampil.indexOf(b.plan) < 0) planTampil.push(b.plan);
  });
  el('hTabelManfaat').innerHTML =
    '<thead><tr><th>Plan</th><th>Kamar</th><th>Wilayah</th>'
    + '<th class="kanan">Limit tahunan</th><th class="kanan">Limit booster</th>'
    + '<th>Cover</th></tr></thead><tbody>'
    + planTampil.map(p => {
        const m = DATA_GHP.plan[p];
        return '<tr><td>' + esc(p) + '</td><td>' + esc(m.kamar) + '</td>'
          + '<td>' + esc(m.wilayah) + '</td>'
          + '<td class="kanan angka">' + rp(m.limit) + '</td>'
          + '<td class="kanan angka">' + rp(m.booster) + '</td>'
          + '<td>' + esc(m.cover) + '</td></tr>';
      }).join('')
    + '</tbody>';

  const acuanRider = denganRider[0];
  const boosterAcuan = acuanRider ? DATA_GHP.plan[acuanRider.plan].booster : 0;
  el('hTabelNCB').innerHTML =
    '<thead><tr><th colspan="3">NCB \u2014 kenaikan limit booster tanpa klaim ('
    + esc(acuanRider ? acuanRider.plan : '\u2014') + ')</th></tr>'
    + '<tr><th>Tahun polis tanpa klaim</th><th class="kanan">Kenaikan</th>'
    + '<th class="kanan">Limit booster</th></tr></thead><tbody>'
    + InsuranceHubGHP.ncb(boosterAcuan).map(b =>
        '<tr class="' + (b.tahun === 5 ? 'tandai' : '') + '">'
        + '<td>' + (b.tahun === 0 ? 'Dasar' : 'Tahun ' + b.tahun) + '</td>'
        + '<td class="kanan angka">' + Math.round(b.kenaikan * 100) + '%</td>'
        + '<td class="kanan angka">' + rp(b.nilai) + '</td></tr>').join('')
    + '</tbody>';

  el('hTabelNCD').innerHTML =
    '<thead><tr><th colspan="2">NCD \u2014 diskon premi tahun berikutnya</th></tr>'
    + '<tr><th>Tanpa klaim berturut-turut</th><th class="kanan">Diskon</th></tr></thead><tbody>'
    + InsuranceHubGHP.NCD.map(x => '<tr><td>' + x.lama + '</td>'
        + '<td class="kanan angka">' + Math.round(x.diskon * 100) + '%</td></tr>').join('')
    + '</tbody>';

  el('hCatatanNC').textContent = 'Syarat NCB: tidak ada klaim pada tahun polis berjalan '
    + 'dan total klaim selama polis aktif tidak melebihi 10% limit tahunan. Kenaikan 10% '
    + 'dari limit booster dasar setiap ulang tahun polis, maksimal 5 kali atau 50%. '
    + 'Kalau terjadi klaim pada tahun berjalan, diskon tahun berikutnya tidak berlaku dan '
    + 'hitungan tanpa klaim mulai dari awal lagi.';

  if (!denganRider.length) {
    el('hTabelManfaat').innerHTML = '';
    el('hTabelNCB').innerHTML = '';
    el('hTabelNCD').innerHTML = '';
    el('hTabelTunggu').innerHTML = '';
    if (el('hTunggu12')) el('hTunggu12').innerHTML = '';
    el('hCatatanNC').textContent = 'Rider kesehatan GHP tidak diambil, sehingga manfaat '
      + 'plan, NCB, NCD, dan masa tunggu tidak berlaku.';
  } else {
  el('hTabelTunggu').innerHTML =
    '<thead><tr><th>Jenis risiko</th><th>Masa tunggu</th></tr></thead><tbody>'
    + '<tr><td>Perawatan rumah sakit karena kecelakaan</td><td>Tidak ada masa tunggu</td></tr>'
    + '<tr><td>Sakit akut seperti DBD, tipes, usus buntu, infeksi virus</td>'
    + '<td>30 hari</td></tr>'
    + '<tr><td>Sakit kronis seperti kanker, jantung, stroke, darah tinggi, diabetes, '
    + 'sinus, polip, amandel, TBC</td><td>12 bulan</td></tr>'
    + '<tr class="tandai"><td>Contestable period</td>'
    + '<td>24 bulan \u2014 sebelum lewat, klaim dapat diarahkan ke reimbursement</td></tr>'
    + '</tbody>';
  /* Daftar penyakit masa tunggu 12 bulan — hanya saat rider GHP diambil,
     tepat di bawah tabel yang berakhir dengan contestable period. */
  if (el('hTunggu12')) el('hTunggu12').innerHTML = (window.InsuranceHubTunggu12 ? window.InsuranceHubTunggu12.html() : '');
  }

  el('hSangkalan').textContent = 'Premi kesehatan dibayar selama polis aktif, maksimal '
    + 'sampai usia 90 tahun. Premi dapat meningkat sesuai pertambahan usia. Ilustrasi ini '
    + 'dihitung dari tarif yang berlaku saat ini untuk membantu penjelasan produk kepada '
    + 'calon nasabah. Bukan bagian dari polis dan tidak mengikat secara hukum. Nilai final '
    + 'tunduk pada Ketentuan Polis resmi PT Asuransi Jiwa Generali Indonesia dan hasil '
    + 'underwriting.';

  const na = el('hAgenNama').value, hp = el('hAgenHP').value;
  el('hKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function hAturan() {
  el('hAturan').innerHTML =
  '<details><summary>Cara premi dihitung</summary><div class="isi"><ul>'
  + '<li>Premi jiwa diambil dari tabel per Rp10 juta UP sesuai usia, jenis kelamin, dan skema yang dipilih.</li>'
  + '<li>Skema 10-90 berarti premi jiwa dibayar sampai usia 10 tahun setelah masuk; skema 90-90 preminya lebih rendah.</li>'
  + '<li>Premi kesehatan diambil langsung dari tabel sesuai plan dan usia, tidak bergantung jenis kelamin.</li>'
  + '<li>Premi UP jiwa dasar mendapat diskon menurut besarnya: di bawah Rp1 miliar tidak ada diskon, mulai Rp1 miliar sampai di bawah Rp2,5 miliar 20%, dan mulai Rp2,5 miliar 30%.</li>'
  + '<li>Premi rider kesehatan GHP tidak mendapat diskon itu; dibayar penuh sesuai plan dan usia.</li>'
  + '<li>Rider kesehatan bisa tidak diambil. Kalau dimatikan, yang dihitung hanya UP jiwa dasar.</li>'
  + '<li>Premi tahunan dihitung 11 kali premi bulanan, berlaku untuk UP jiwa dasar maupun rider kesehatan, jadi bayar tahunan lebih hemat.</li>'
  + '<li>Usia masuk yang tersedia 0 sampai 65 tahun. UP jiwa minimum Rp10 juta.</li>'
  + '</ul></div></details>'

  + '<details><summary>Reward tanpa klaim</summary><div class="isi"><ul>'
  + '<li>NCB menaikkan limit booster 10% dari limit dasar setiap ulang tahun polis tanpa klaim, maksimal 5 kali atau 50%.</li>'
  + '<li>Syarat NCB: tidak ada klaim pada tahun berjalan dan total klaim selama polis aktif tidak melebihi 10% limit tahunan.</li>'
  + '<li>NCD memberi diskon premi tahun berikutnya: 5% setelah 1 tahun tanpa klaim, 10% setelah 2 tahun, 15% setelah 3 tahun atau lebih.</li>'
  + '<li>Kalau ada klaim pada tahun berjalan, diskon tahun berikutnya hangus dan hitungan mulai dari awal.</li>'
  + '</ul></div></details>'

  + '<details><summary>Masa tunggu dan batas</summary><div class="isi"><ul>'
  + '<li>Perawatan karena kecelakaan tidak punya masa tunggu.</li>'
  + '<li>Sakit akut seperti DBD, tipes, usus buntu, dan infeksi virus punya masa tunggu 30 hari.</li>'
  + '<li>Sakit kronis seperti kanker, jantung, stroke, darah tinggi, dan diabetes punya masa tunggu 12 bulan.</li>'
  + '<li>Berlaku contestable period 24 bulan: walaupun masa tunggu 12 bulan sudah lewat, sebelum 24 bulan perusahaan berhak mengarahkan klaim ke skema reimbursement.</li>'
  + '<li>Premi kesehatan dibayar selama polis aktif, maksimal sampai usia 90 tahun.</li>'
  + '</ul></div></details>';
}

hHitung();

// Mesin hitung kebutuhan dana pensiun — mengikuti
// PSG_Tools_Kebutuhan_Dana_Pensiun_v2.xlsx sel demi sel.
// Sheet KALKULATOR PENSIUN dan SIMULASI PERSIAPAN.

function dpAnuitas(tahun, bunga, perBulan) {
  if (tahun <= 0) return null;
  if (bunga === 0) return perBulan ? tahun * 12 : tahun;
  if (perBulan) {
    const im = bunga / 12, n = tahun * 12;
    return (Math.pow(1 + im, n) - 1) / im;
  }
  return (Math.pow(1 + bunga, tahun) - 1) / bunga;
}

function dpHitung(inp) {
  const out = { sah: false, alasan: null, alasanSetoran: null };
  const usia = inp.usia, usiaPensiun = inp.usiaPensiun, usiaAkhir = inp.usiaAkhir;
  const inflasi = inp.inflasi, pertumbuhan = inp.pertumbuhan;
  const lamaSiapkan = inp.lamaSiapkan, danaAwal = inp.danaAwal;

  out.sisaTahun = Math.max(usiaPensiun - usia, 0);                       // B8
  out.lamaPensiun = Math.max(usiaAkhir - usiaPensiun, 0);                // B17
  out.totalBulanIni = inp.komponen.reduce(function (s, k) { return s + (k || 0); }, 0);

  if (out.sisaTahun === 0) {
    out.alasan = 'Usia pensiun yang dipilih (' + usiaPensiun + ') sudah dilewati atau sama '
      + 'dengan usia sekarang (' + usia + ').';
    return out;
  }
  if (out.lamaPensiun === 0) {
    out.alasan = 'Usia akhir dana (' + usiaAkhir + ') harus lebih tinggi dari usia pensiun ('
      + usiaPensiun + ').';
    return out;
  }

  // B18 & B19
  out.biayaSaatPensiun = out.totalBulanIni * Math.pow(1 + inflasi, out.sisaTahun);
  out.target = out.biayaSaatPensiun * 12
    * ((Math.pow(1 + inflasi, out.lamaPensiun) - 1) / inflasi);

  // B20, B21, F21
  out.danaTersediaNanti = danaAwal * Math.pow(1 + pertumbuhan, out.sisaTahun);
  out.kekurangan = Math.max(out.target - out.danaTersediaNanti, 0);
  out.porsiTertutup = out.target === 0 ? 0 : Math.min(1, out.danaTersediaNanti / out.target);
  out.sah = true;
  out.lamaSiapkan = lamaSiapkan;

  // B11: penjaga pilihan lama siapkan
  if (lamaSiapkan > out.sisaTahun) {
    out.alasanSetoran = 'Lama siapkan ' + lamaSiapkan + ' tahun melebihi sisa waktu '
      + out.sisaTahun + ' tahun menuju pensiun.';
    return out;
  }

  // B13: dana tetap berkembang antara akhir setoran dan usia pensiun
  out.tahunTumbuhLanjut = Math.max(out.sisaTahun - lamaSiapkan, 0);
  out.perluTerkumpul = out.kekurangan / Math.pow(1 + pertumbuhan, out.tahunTumbuhLanjut);

  out.setoranBulanan = out.perluTerkumpul / dpAnuitas(lamaSiapkan, pertumbuhan, true);
  out.setoranTahunan = out.perluTerkumpul / dpAnuitas(lamaSiapkan, pertumbuhan, false);

  // B22 & B23: pembanding bila pertumbuhan lanjutan diabaikan
  out.setoranTanpaTumbuhLanjut = out.kekurangan / dpAnuitas(lamaSiapkan, pertumbuhan, true);
  out.selisihPembanding = out.setoranTanpaTumbuhLanjut - out.setoranBulanan;

  // Baris 27-29: efek menunda
  out.efekMenunda = [0, 5, 10].map(function (tunda) {
    var sisa = Math.max(out.sisaTahun - tunda, 0);
    var lama = Math.min(lamaSiapkan, sisa);
    var setoran = lama <= 0 ? null
      : (out.kekurangan / Math.pow(1 + pertumbuhan, sisa - lama))
        / dpAnuitas(lama, pertumbuhan, true);
    return { tunda: tunda, sisa: sisa, lama: lama, setoran: setoran };
  });
  return out;
}

// Perbandingan target pada beberapa asumsi inflasi (baris 25-27 sheet kalkulator)
function dpSensitivitas(inp, daftar) {
  return daftar.map(function (i) {
    var salinan = {};
    for (var kunci in inp) salinan[kunci] = inp[kunci];
    salinan.inflasi = i;
    var r = dpHitung(salinan);
    return { inflasi: i, biayaSaatPensiun: r.biayaSaatPensiun,
             target: r.target, kekurangan: r.kekurangan };
  });
}


/* ============ Tampilan Kebutuhan Dana Pensiun ============ */

const dNilai = {};
/* Kalkulator Kebutuhan Dana Pensiun mulai KOSONG, bukan dari angka demo.
   Sebelumnya keenam komponen terisi bawaan bertotal Rp19 juta, dan angka itu
   ikut terbawa ke ilustrasi nasabah tanpa disadari agen.

   Isinya kini datang dari Profil Nasabah aktif bila profil itu menyimpan
   komponen pensiun. Kalau tidak ada profil aktif, atau profilnya tidak diisi,
   kolomnya tetap kosong dan agen mengisi manual. */
DP_KOMPONEN.forEach(k => dNilai[k.id] = 0);

let dProfilTerakhir = null;
let dProfilPensiunSignature = '';

function dProfilPensiunData(p) {
  const s = p && p.snapshot && p.snapshot.pensiun ? p.snapshot.pensiun : {};
  const out = {};
  DP_KOMPONEN.forEach(k => { out[k.id] = Math.max(0, Number(s[k.id]) || 0); });
  return out;
}

function dProfilPensiunSignatureOf(p) {
  const d = dProfilPensiunData(p);
  return DP_KOMPONEN.map(k => k.id + ':' + d[k.id]).join('|');
}

function dMuatPensiunDariProfil(p) {
  const d = dProfilPensiunData(p);
  DP_KOMPONEN.forEach(k => {
    dNilai[k.id] = d[k.id];
    const node = document.getElementById('dk_' + k.id);
    if (node) node.value = d[k.id] ? d[k.id].toLocaleString('id-ID') : '';
  });
}

window.InsuranceHubDanaPensiun = window.InsuranceHubDanaPensiun || {};
window.InsuranceHubDanaPensiun.loadActiveProfile = function (p) {
  const id = p ? String(p.id || '') : '';
  const sig = p ? dProfilPensiunSignatureOf(p) : '';
  /* Profil yang sama tidak menimpa isian manual setiap kali layar dibuka.
     Sinkron ulang hanya bila profilnya berganti atau datanya berubah. */
  if (id === dProfilTerakhir && sig === dProfilPensiunSignature) return;
  dProfilTerakhir = id; dProfilPensiunSignature = sig;
  dMuatPensiunDariProfil(p);
  if (typeof dSegarkanUsiaPensiun === 'function') dSegarkanUsiaPensiun();
  if (typeof dGambar === 'function') dGambar();
};

const opsi = (daftar, pilih, akhiran) => daftar.map(v =>
  '<option value="' + v + '"' + (v === pilih ? ' selected' : '') + '>'
  + (akhiran === 'usia' ? 'Usia ' + v : v + akhiran) + '</option>').join('');

el('dPensiun').innerHTML = opsi([55, 60, 65, 70, 75], 65, 'usia');

/* Usia pensiun yang ditawarkan harus masuk akal terhadap lama menyiapkan
   dana. Aturannya: usia sekarang + lama siapkan dana + 10 tahun, lalu hanya
   pilihan yang sama atau lebih besar dari angka itu yang ditampilkan.
   Contoh usia 42 dengan siapkan 20 tahun menghasilkan 72, sehingga hanya 75
   yang muncul. Tambahan 10 tahun itu jeda wajar antara dana selesai
   disiapkan dan dana mulai dipakai. */
const DP_USIA_PENSIUN = [55, 60, 65, 70, 75];

/* Pemecahan target dana pensiun menjadi polis Lite Future.
   Pilihan UP produk ini bertingkat, jadi target seperti Rp8,3 miliar tidak
   pernah pas. Aturannya: ambil satu tingkat terbesar yang tidak melebihi
   target, lalu sisanya dibulatkan ke atas ke tingkat terdekat — sehingga
   jadi dua polis, bukan satu polis yang melompat terlalu jauh.
   Contoh Rp8,3 miliar menjadi Rp5 miliar ditambah Rp3,5 miliar, totalnya
   Rp8,5 miliar; jauh lebih dekat daripada membulatkan ke Rp10 miliar. */
function pecahUpLiteFuture(target) {
  const tier = (typeof META !== 'undefined' && Array.isArray(META.tierUP))
    ? META.tierUP.slice().sort((a, b) => a - b) : [];
  const t = Number(target) || 0;
  if (!tier.length || t <= 0) return [];
  const dibawah = tier.filter(x => x <= t);
  if (!dibawah.length) return [tier[0]];
  const utama = dibawah[dibawah.length - 1];
  if (utama === t) return [utama];
  const sisa = t - utama;
  const penutup = tier.find(x => x >= sisa);
  return penutup ? [utama, penutup] : [utama];
}
if (typeof window !== 'undefined') window.pecahUpLiteFuture = pecahUpLiteFuture;
function dSegarkanUsiaPensiun() {
  const sel = el('dPensiun');
  if (!sel) return;
  const tgl = el('dTgl') ? el('dTgl').value : '';
  const usiaKini = (tgl && typeof usiaGenerali === 'function')
    ? usiaGenerali(new Date(tgl + 'T00:00:00Z')) : null;
  const lama = +(el('dLama') ? el('dLama').value : 0) || 0;
  const dipilih = sel.value;

  let boleh = DP_USIA_PENSIUN.slice();
  if (usiaKini !== null && lama) {
    const batas = usiaKini + lama + 10;
    const saring = DP_USIA_PENSIUN.filter(u => u >= batas);
    // Kalau tidak ada satu pun yang memenuhi, pilihan tertinggi tetap
    // ditawarkan supaya layarnya tidak pernah kosong.
    boleh = saring.length ? saring : [DP_USIA_PENSIUN[DP_USIA_PENSIUN.length - 1]];
  }
  sel.innerHTML = boleh.map(u =>
    '<option value="' + u + '"' + (String(u) === dipilih ? ' selected' : '') +
    '>' + u + ' tahun</option>').join('');
  if (boleh.indexOf(+dipilih) === -1) sel.value = String(boleh[0]);
}
['dTgl', 'dLama'].forEach(function (id) {
  const n = el(id);
  if (n) { n.addEventListener('change', dSegarkanUsiaPensiun); n.addEventListener('input', dSegarkanUsiaPensiun); }
});
dSegarkanUsiaPensiun();
el('dAkhir').innerHTML   = opsi([70, 75, 80, 85, 90], 80, 'usia');
el('dLama').innerHTML    = opsi([5, 10, 15, 20], 20, ' tahun');
el('dInflasi').innerHTML = [2, 2.5, 3, 3.5, 4, 5].map(v =>
  '<option value="' + (v / 100) + '"' + (v === 3 ? ' selected' : '') + '>'
  + String(v).replace('.', ',') + '% per tahun</option>').join('');
/* Pertumbuhan dana dimulai dari 0% dan bawaannya 0%. Tanpa asumsi
   pertumbuhan, kebutuhan menyisihkan dana terlihat apa adanya — dan dari
   situ baru terlihat bahwa menyiapkan sendiri menuntut setoran jauh lebih
   besar daripada lewat produk. Persentase lain tetap bisa dipilih. */
el('dTumbuh').innerHTML  = [0, 3, 4, 5, 6, 7, 8].map(v =>
  '<option value="' + (v / 100) + '"' + (v === 0 ? ' selected' : '') + '>'
  + (v === 0 ? 'Tanpa pertumbuhan' : v + '% per tahun') + '</option>').join('');

el('dKomponen').innerHTML = DP_KOMPONEN.map(k =>
  '<div class="baris satu"><div><label for="dk_' + k.id + '">' + k.label + '</label>'
  + '<input id="dk_' + k.id + '" data-k="' + k.id + '" type="text" inputmode="numeric"'
  + ' autocomplete="off"></div></div>').join('');

function dAngkaRapi(kotak, simpan) {
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  if (simpan) simpan(n);
  dGambar();
}
el('dKomponen').querySelectorAll('input').forEach(k =>
  k.addEventListener('input', () => dAngkaRapi(k, n => dNilai[k.dataset.k] = n)));
el('dDanaAwal').addEventListener('input', () => dAngkaRapi(el('dDanaAwal')));
['dNama', 'dTgl', 'dPensiun', 'dAkhir', 'dLama', 'dInflasi', 'dTumbuh',
 'dAgenNama', 'dAgenHP'].forEach(id => el(id).addEventListener('input', dGambar));

let dTerakhir = null;   // dipakai tombol lanjut ke Lite Future

function fpIsiIdentitasKonsultan(prefix) {
  const namaEl = el(prefix + 'AgenNama');
  const hpEl = el(prefix + 'AgenHP');
  if (!namaEl || !hpEl) return;
  try {
    let k = {};
    /* Lewat InsuranceHubConsultantCard.read() supaya mode "atas nama agen
       lain" ikut berlaku. Membaca localStorage langsung akan melewatkannya. */
    try { k = (window.InsuranceHubConsultantCard && window.InsuranceHubConsultantCard.read())
      || JSON.parse(localStorage.getItem('insuranceHub.konsultan.v1') || '{}') || {}; } catch (_) {}
    let a = {};
    try { a = JSON.parse(localStorage.getItem('insuranceHub.agen.v1') || '{}') || {}; } catch (_) {}
    const nama = String(k.nama || a.nama || '').trim();
    const hp = String(k.whatsapp || a.hp || '').trim();
    if (!String(namaEl.value || '').trim() && nama) namaEl.value = nama;
    if (!String(hpEl.value || '').trim() && hp) hpEl.value = hp;
  } catch (_) {}
}

function dGambar() {
  fpIsiIdentitasKonsultan('d');
  dAturan();
  const tgl = el('dTgl').value;
  const total = DP_KOMPONEN.reduce((s, k) => s + dNilai[k.id], 0);
  el('dTotalHariIni').innerHTML =
    '<div class="k">Total kebutuhan hari ini</div>'
    + '<div class="v angka">' + rp(total) + ' <small>/bulan</small></div>'
    + '<div class="t">Harga hari ini, belum dinaikkan inflasi.</div>';

  const bersihkan = () => {
    ['dHasil', 'dTabelSensitif', 'dSimulasi', 'dIdentitas', 'dKotakRingkas',
     'dTabelKomponen', 'dTabelSensitif2', 'dTabelSiap', 'dTabelTunda', 'dKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    ['dSangkalan', 'dCatatanKomponen', 'dCatatanSiap'].forEach(i => el(i).textContent = '');
    dTerakhir = null;
  };

  if (!tgl) {
    el('dInfoUsia').textContent = 'Isi tanggal lahir untuk menghitung usia.';
    bersihkan();
    return;
  }

  const inflasi = +el('dInflasi').value, pertumbuhan = +el('dTumbuh').value;
  const inp = {
    usia: usiaDari(new Date(tgl + 'T00:00:00Z')),
    usiaPensiun: +el('dPensiun').value,
    usiaAkhir: +el('dAkhir').value,
    lamaSiapkan: +el('dLama').value,
    danaAwal: bAngka(el('dDanaAwal').value),
    inflasi: inflasi, pertumbuhan: pertumbuhan,
    komponen: DP_KOMPONEN.map(k => dNilai[k.id]),
  };
  const r = dpHitung(inp);
  el('dInfoUsia').textContent = 'Usia ' + inp.usia + ' tahun'
    + (el('dNama').value ? ' \u2022 ' + el('dNama').value : '');

  if (!r.sah) {
    el('dHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    bersihkan();
    el('dHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    return;
  }

  /* Target disimpan supaya tombol Solusi bisa memecahnya jadi polis
     Lite Future tanpa menghitung ulang. */
  window.__dpTargetTerakhir = r.target;

  el('dHasil').innerHTML =
    '<div class="sorotan"><div class="k">Target dana saat usia ' + inp.usiaPensiun + '</div>'
    + '<div class="v angka">' + rp(r.target) + '</div>'
    + '<div class="t">Untuk membiayai ' + r.lamaPensiun + ' tahun masa pensiun, sampai usia '
    + inp.usiaAkhir + '.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Waktu menuju pensiun</div>'
    + '<div class="v angka">' + r.sisaTahun + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Lama masa pensiun</div>'
    + '<div class="v angka">' + r.lamaPensiun + ' tahun</div></div>'
    + '<div class="kartu penuh"><div class="k">Biaya hidup setara saat pensiun</div>'
    + '<div class="v angka">' + rp(r.biayaSaatPensiun) + ' /bulan</div>'
    + '<div class="k" style="margin-top:6px">Hari ini ' + rp(r.totalBulanIni)
    + ' per bulan, naik ' + (inflasi * 100).toLocaleString('id-ID')
    + '% per tahun selama ' + r.sisaTahun + ' tahun.</div></div>'
    + '<div class="kartu"><div class="k">Dana sudah tersedia, nilainya saat pensiun</div>'
    + '<div class="v angka">' + rp(r.danaTersediaNanti) + '</div></div>'
    + '<div class="kartu"><div class="k">Porsi kebutuhan yang sudah tertutup</div>'
    + '<div class="v angka">' + (r.porsiTertutup * 100).toLocaleString('id-ID',
        { maximumFractionDigits: 1 }) + '%</div></div>'
    + '<div class="kartu penuh"><div class="k">KEKURANGAN YANG PERLU DISIAPKAN</div>'
    + '<div class="v angka">' + rp(r.kekurangan) + '</div>'
    + '<div class="k" style="margin-top:6px">Dana yang sudah ada ' + rp(inp.danaAwal)
    + ' dikembangkan ' + (pertumbuhan * 100).toLocaleString('id-ID')
    + '% per tahun selama ' + r.sisaTahun + ' tahun, lalu dikurangkan dari target.</div></div>'
    + '</div>';

  const sens = dpSensitivitas(inp, [0.02, 0.03, 0.04]);
  const tabelSens =
    '<thead><tr><th>Inflasi</th><th class="kanan">Biaya /bln saat pensiun</th>'
    + '<th class="kanan">Target dana</th><th class="kanan">Kekurangan</th></tr></thead><tbody>'
    + sens.map(x =>
        '<tr class="' + (Math.abs(x.inflasi - inflasi) < 1e-9 ? 'tandai' : '') + '">'
        + '<td>' + (x.inflasi * 100).toLocaleString('id-ID') + '%</td>'
        + '<td class="kanan angka">' + rp(x.biayaSaatPensiun) + '</td>'
        + '<td class="kanan angka">' + rp(x.target) + '</td>'
        + '<td class="kanan angka">' + rp(x.kekurangan) + '</td></tr>').join('')
    + '</tbody>';
  el('dTabelSensitif').innerHTML = tabelSens;
  el('dTabelSensitif2').innerHTML = tabelSens;

  // ---------- cara menyiapkan ----------
  if (r.alasanSetoran) {
    el('dSimulasi').innerHTML = '<div class="peringatan">' + esc(r.alasanSetoran)
      + ' Pilih lama siapkan ' + r.sisaTahun + ' tahun atau kurang.</div>';
    ['dTabelSiap', 'dTabelTunda'].forEach(i => el(i).innerHTML = '');
    el('dCatatanSiap').textContent = '';
  } else {
    el('dSimulasi').innerHTML =
      '<div class="sorotan"><div class="k">Setoran untuk menutup kekurangan</div>'
      + '<div class="v angka">' + rp(r.setoranBulanan) + ' <small>/bulan</small></div>'
      + '<div class="t">Selama ' + r.lamaSiapkan + ' tahun, atau ' + rp(r.setoranTahunan)
      + ' per tahun.</div></div>'
      + '<div class="ikhtisar">'
      + '<div class="kartu"><div class="k">Perlu terkumpul di akhir masa setoran</div>'
      + '<div class="v angka">' + rp(r.perluTerkumpul) + '</div></div>'
      + '<div class="kartu"><div class="k">Dana berkembang sendiri setelah itu</div>'
      + '<div class="v angka">' + r.tahunTumbuhLanjut + ' tahun</div></div>'
      + (r.selisihPembanding > 0.5
        ? '<div class="kartu penuh"><div class="k">Kalau pertumbuhan setelah setoran '
          + 'selesai diabaikan</div>'
          + '<div class="v angka">' + rp(r.setoranTanpaTumbuhLanjut) + ' /bulan</div>'
          + '<div class="k" style="margin-top:4px">Setara ' + rp(r.setoranTanpaTumbuhLanjut * 12) + ' /tahun</div>'
          + '<div class="k" style="margin-top:6px">Lebih berat ' + rp(r.selisihPembanding)
          + ' per bulan dari yang sebenarnya diperlukan.</div></div>'
        : '')
      + '</div>';

    el('dTabelSiap').innerHTML =
      '<thead><tr><th>Keterangan</th><th class="kanan">Nilai</th></tr></thead><tbody>'
      + '<tr><td>Target dana saat pensiun</td>'
      + '<td class="kanan angka">' + rp(r.target) + '</td></tr>'
      + '<tr><td>Dana sudah tersedia, nilainya saat pensiun</td>'
      + '<td class="kanan angka">' + rp(r.danaTersediaNanti) + '</td></tr>'
      + '<tr class="bayar"><td>Kekurangan yang perlu disiapkan</td>'
      + '<td class="kanan angka">' + rp(r.kekurangan) + '</td></tr>'
      + '<tr><td>Lama siapkan dana</td>'
      + '<td class="kanan angka">' + r.lamaSiapkan + ' tahun</td></tr>'
      + '<tr><td>Dana berkembang sendiri setelah setoran selesai</td>'
      + '<td class="kanan angka">' + r.tahunTumbuhLanjut + ' tahun</td></tr>'
      + '<tr><td>Perlu terkumpul di akhir masa setoran</td>'
      + '<td class="kanan angka">' + rp(r.perluTerkumpul) + '</td></tr>'
      + '<tr class="tandai"><td>Setoran per bulan</td>'
      + '<td class="kanan angka">' + rp(r.setoranBulanan) + '</td></tr>'
      + '<tr class="tandai"><td>Setoran per tahun</td>'
      + '<td class="kanan angka">' + rp(r.setoranTahunan) + '</td></tr>'
      + '</tbody>';
    el('dCatatanSiap').textContent = 'Setoran dihitung dari kekurangan dana, bukan dari '
      + 'target penuh, karena dana yang sudah dimiliki ikut berkembang sampai usia pensiun. '
      + 'Setoran juga berhenti di akhir masa siapkan, sementara dananya masih berkembang '
      + r.tahunTumbuhLanjut + ' tahun berikutnya sampai usia pensiun. Asumsi pertumbuhan '
      + (pertumbuhan * 100).toLocaleString('id-ID') + '% per tahun, bukan janji imbal hasil.';

    /* Bila seluruh baris menghasilkan setoran yang sama — lazim terjadi saat
       pertumbuhan 0% dan sisa waktu masih lebih panjang daripada masa
       menyiapkan — tabel ini tidak mengajarkan apa pun. Yang benar-benar
       berguna justru batas amannya: sampai berapa tahun boleh menunda
       sebelum setorannya melonjak. */
    const setoranSama = r.efekMenunda.every(function (x) {
      return x.setoran && r.efekMenunda[0].setoran &&
        Math.abs(x.setoran - r.efekMenunda[0].setoran) < 1;
    });

    if (setoranSama) {
      const batasTunda = Math.max(0, r.sisaTahun - r.efekMenunda[0].lama);
      const sesudah = [1, 3, 5].map(function (lewat) {
        const sisa = Math.max(0, r.sisaTahun - (batasTunda + lewat));
        return { lewat: lewat, sisa: sisa,
          setoran: sisa > 0 ? r.kekurangan / (sisa * 12) : null };
      });
      el('dTabelTunda').innerHTML =
        '<thead><tr><th>Kalau menunda</th><th class="kanan">Sisa waktu</th>'
        + '<th class="kanan">Setoran /bulan</th><th class="kanan">Selisih</th>'
        + '</tr></thead><tbody>'
        + '<tr class="tandai"><td>Mulai sekarang</td>'
        + '<td class="kanan angka">' + r.sisaTahun + ' thn</td>'
        + '<td class="kanan angka">' + rp(r.efekMenunda[0].setoran) + '</td>'
        + '<td class="kanan">\u2014</td></tr>'
        + '<tr><td>Sampai ' + batasTunda + ' tahun lagi</td>'
        + '<td class="kanan angka">' + r.efekMenunda[0].lama + ' thn</td>'
        + '<td class="kanan angka">' + rp(r.efekMenunda[0].setoran) + '</td>'
        + '<td class="kanan">Masih sama</td></tr>'
        + sesudah.map(function (x) {
            return '<tr><td>' + (batasTunda + x.lewat) + ' tahun lagi</td>'
              + '<td class="kanan angka">' + x.sisa + ' thn</td>'
              + '<td class="kanan angka">' + (x.setoran ? rp(x.setoran) : 'Tidak ada waktu') + '</td>'
              + '<td class="kanan angka">' + (x.setoran
                  ? '+' + rp(x.setoran - r.efekMenunda[0].setoran) : '\u2014') + '</td></tr>';
          }).join('')
        + '</tbody>';
      const ket = el('dCatatanTunda') || el('dCatatanEfek');
      if (ket) {
        ket.textContent = 'Tanpa asumsi pertumbuhan, menunda belum mengubah setoran '
          + 'selama sisa waktu masih lebih panjang daripada masa menyiapkan. Batas amannya '
          + batasTunda + ' tahun. Lewat dari itu, waktunya memendek dan setoran per bulan '
          + 'langsung melonjak.';
      }
      return;
    }

    el('dTabelTunda').innerHTML =
      '<thead><tr><th>Kalau mulai</th><th class="kanan">Sisa waktu</th>'
      + '<th class="kanan">Lama setoran</th><th class="kanan">Setoran /bulan</th>'
      + '<th class="kanan">Selisih</th></tr></thead><tbody>'
      + r.efekMenunda.map(x =>
          '<tr class="' + (x.tunda === 0 ? 'tandai' : '') + '">'
          + '<td>' + (x.tunda === 0 ? 'Sekarang' : x.tunda + ' tahun lagi') + '</td>'
          + '<td class="kanan angka">' + x.sisa + ' thn</td>'
          + '<td class="kanan angka">' + x.lama + ' thn</td>'
          + '<td class="kanan angka">' + (x.setoran ? rp(x.setoran) : 'Tidak ada waktu') + '</td>'
          + '<td class="kanan angka">' + (x.setoran && x.tunda > 0
              ? '+' + rp(x.setoran - r.efekMenunda[0].setoran) : '\u2014') + '</td></tr>').join('')
      + '</tbody>';
  }

  // ---------- ringkasan untuk prospek ----------
  el('dIdentitas').innerHTML =
    '<div>Nama prospek<b>' + esc(el('dNama').value || '\u2014') + '</b></div>'
    + '<div>Usia sekarang<b>' + inp.usia + ' tahun</b></div>'
    + '<div>Rencana pensiun<b>Usia ' + inp.usiaPensiun + '</b></div>'
    + '<div>Dana dipakai sampai<b>Usia ' + inp.usiaAkhir + '</b></div>';

  el('dKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu penuh"><div class="k">Target dana saat usia ' + inp.usiaPensiun + '</div>'
    + '<div class="v angka">' + rp(r.target) + '</div></div>'
    + '<div class="kartu"><div class="k">Dana sudah tersedia, nanti menjadi</div>'
    + '<div class="v angka">' + rp(r.danaTersediaNanti) + '</div></div>'
    + '<div class="kartu"><div class="k">Kekurangan</div>'
    + '<div class="v angka">' + rp(r.kekurangan) + '</div></div>'
    + '<div class="kartu"><div class="k">Kebutuhan hari ini</div>'
    + '<div class="v angka">' + rp(r.totalBulanIni) + ' /bln</div></div>'
    + '<div class="kartu"><div class="k">Setara saat pensiun</div>'
    + '<div class="v angka">' + rp(r.biayaSaatPensiun) + ' /bln</div></div></div>';

  el('dTabelKomponen').innerHTML =
    '<thead><tr><th>Kebutuhan</th><th class="kanan">Hari ini /bln</th>'
    + '<th class="kanan">Setara saat pensiun /bln</th></tr></thead><tbody>'
    + DP_KOMPONEN.filter(k => dNilai[k.id] > 0).map(k =>
        '<tr><td>' + k.label + '</td>'
        + '<td class="kanan angka">' + rp(dNilai[k.id]) + '</td>'
        + '<td class="kanan angka">' + rp(dNilai[k.id]
            * Math.pow(1 + inflasi, r.sisaTahun)) + '</td></tr>').join('')
    + '<tr class="tandai"><td>Total</td>'
    + '<td class="kanan angka">' + rp(r.totalBulanIni) + '</td>'
    + '<td class="kanan angka">' + rp(r.biayaSaatPensiun) + '</td></tr></tbody>';
  el('dCatatanKomponen').textContent = 'Kolom kanan adalah nilai yang setara pada '
    + r.sisaTahun + ' tahun mendatang dengan asumsi inflasi '
    + (inflasi * 100).toLocaleString('id-ID') + '% per tahun. Barang yang sama, harga '
    + 'yang berbeda.';

  el('dSangkalan').textContent = 'Perhitungan ini gambaran kebutuhan dana pensiun untuk '
    + 'edukasi awal, bukan ilustrasi premi maupun manfaat produk asuransi. Model sengaja '
    + 'sederhana dan belum memasukkan risiko meninggal dunia sebelum pensiun, pajak, biaya '
    + 'instrumen, maupun perubahan inflasi dan pertumbuhan yang sesungguhnya. Asumsi '
    + 'pertumbuhan dana bukan janji imbal hasil dan tidak merujuk pada instrumen tertentu.';

  const na = el('dAgenNama').value, hp = el('dAgenHP').value;
  el('dKakiAgen').innerHTML = kakiAgenHtml(na, hp);

  dTerakhir = { tgl: tgl, nama: el('dNama').value, kekurangan: r.kekurangan,
    target: r.target, danaTersediaNanti: r.danaTersediaNanti,
    pertumbuhan: pertumbuhan, setoranBulanan: r.setoranBulanan,
    setoranTahunan: r.setoranTahunan,
    usiaPensiun: +el('dPensiun').value || null, lamaSiapkan: +el('dLama').value || null };
  // Snapshot lengkap untuk halaman "Menyiapkan Sendiri vs BeSMART Lite Future".
  // Perbandingan harus memakai hasil kalkulator kebutuhan yang baru saja dihitung,
  // termasuk asumsi pertumbuhan dan setoran hasil perhitungannya.
  window.__dpHasilTerakhir = {
    target: r.target, kekurangan: r.kekurangan,
    danaTersediaNanti: r.danaTersediaNanti,
    pertumbuhan: pertumbuhan,
    setoranBulanan: r.setoranBulanan,
    setoranTahunan: r.setoranTahunan,
    usiaPensiun: inp.usiaPensiun, lamaSiapkan: inp.lamaSiapkan,
    usia: inp.usia
  };
}

// Tombol khusus agen: bawa angka kekurangan ke kalkulator Lite Future
/* Tombol lanjut ke Lite Future dihapus atas permintaan: tidak ada produk
   yang benar-benar cocok mengakomodasi kekurangan dana pensiun. */


function dAturan() {
  el('dAturan').innerHTML =
  '<details><summary>Cara target dana dihitung</summary><div class="isi"><ul>'
  + '<li>Seluruh kebutuhan bulanan hari ini dijumlahkan, lalu dinaikkan dengan asumsi inflasi sampai usia pensiun.</li>'
  + '<li>Target dana adalah jumlah seluruh biaya hidup selama masa pensiun, dengan biaya tiap tahun ikut naik mengikuti inflasi.</li>'
  + '<li>Model ini belum memperhitungkan hasil pengembangan dana selama masa pensiun berlangsung, sehingga hasilnya cenderung konservatif.</li>'
  + '<li>Asumsi inflasi paling menentukan. Selisih 2% ke 4% bisa membuat targetnya hampir dua kali lipat.</li>'
  + '</ul></div></details>'

  + '<details><summary>Dana yang sudah tersedia</summary><div class="isi"><ul>'
  + '<li>Diisi sesuai keadaan prospek. Kalau belum menyiapkan apa pun, isi nol.</li>'
  + '<li>Dana itu dikembangkan lebih dulu dengan asumsi pertumbuhan sampai usia pensiun, baru dikurangkan dari target.</li>'
  + '<li>Alasannya: target adalah angka di masa depan, jadi yang dibandingkan harus sama-sama nilai saat pensiun.</li>'
  + '<li>Sisanya itulah kekurangan yang benar-benar perlu disiapkan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Cara setoran dihitung</summary><div class="isi"><ul>'
  + '<li>Setoran dihitung dari kekurangan, bukan dari target penuh.</li>'
  + '<li>Setoran berhenti di akhir masa siapkan, tetapi dananya masih berkembang sampai usia pensiun. Efek itu ikut diperhitungkan, sehingga setorannya lebih ringan.</li>'
  + '<li>Lama siapkan dana tidak boleh melebihi sisa waktu menuju pensiun.</li>'
  + '<li>Setoran bulanan memakai bunga berbunga dengan pembagian dua belas dari asumsi tahunan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas pemakaian</summary><div class="isi"><ul>'
  + '<li>Perhitungan ini bukan ilustrasi premi maupun manfaat produk asuransi.</li>'
  + '<li>Jangan menyebut instrumen investasi tertentu; pakai istilah asumsi pertumbuhan dana.</li>'
  + '<li>Hasil bukan janji imbal hasil.</li>'
  + '<li>Halaman ringkasan untuk prospek sengaja tidak memuat tombol maupun nama produk apa pun.</li>'
  + '</ul></div></details>';
}

dGambar();

// Mesin hitung cicilan KPR — terjemahan sheet 'KALKULATOR KPR'
// pada PSG Kalkulator Cicilan Rumah.

function kprHitung(inp) {
  const out = {};
  out.hargaRumah = inp.hargaRumah;
  out.nilaiDP = inp.hargaRumah * inp.persenDP;                 // B12
  out.pokokKPR = inp.hargaRumah - out.nilaiDP;                 // B13
  out.jumlahBulan = inp.tenor * 12;                            // B10

  // F9: anuitas standar
  const i = inp.rate / 12, n = out.jumlahBulan;
  out.cicilanBulanan = inp.rate === 0
    ? out.pokokKPR / n
    : out.pokokKPR * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1);

  out.cicilanTahunan = out.cicilanBulanan * 12;                // F11
  out.totalCicilan = out.cicilanTahunan * inp.tenor;           // F12
  out.totalUangKeluar = out.nilaiDP + out.totalCicilan;        // F13
  out.totalBunga = out.totalCicilan - out.pokokKPR;            // F15
  out.rasioBunga = out.pokokKPR > 0 ? out.totalBunga / out.pokokKPR : 0;

  // Sisa pokok tiap akhir tahun — dipakai menunjukkan beban yang masih
  // menempel pada keluarga bila terjadi sesuatu di tengah jalan.
  out.jadwal = [];
  let sisa = out.pokokKPR, bungaKumulatif = 0;
  for (let bulan = 1; bulan <= n; bulan++) {
    const bunga = sisa * i;
    const pokok = out.cicilanBulanan - bunga;
    sisa = Math.max(sisa - pokok, 0);
    bungaKumulatif += bunga;
    if (bulan % 12 === 0) {
      out.jadwal.push({
        tahun: bulan / 12, sisaPokok: sisa,
        sudahDibayar: out.cicilanBulanan * bulan,
        bungaKumulatif: bungaKumulatif,
      });
    }
  }
  return out;
}


/* ============ Tampilan Simulasi Cicilan Rumah ============ */
el('pDP').innerHTML = [0, 10, 20, 30].map(v =>
  '<option value="' + (v / 100) + '"' + (v === 20 ? ' selected' : '') + '>' + v + '%</option>').join('');
el('pTenor').innerHTML = [5, 10, 15, 20, 25].map(v =>
  '<option value="' + v + '"' + (v === 10 ? ' selected' : '') + '>' + v + ' tahun</option>').join('');

el('pHarga').addEventListener('input', () => {
  const n = bAngka(el('pHarga').value);
  el('pHarga').value = n ? n.toLocaleString('id-ID') : '';
  pGambar();
});
['pNama', 'pDP', 'pTenor', 'pRate', 'pAgenNama', 'pAgenHP']
  .forEach(id => el(id).addEventListener('input', pGambar));

function pGambar() {
  pAturan();
  const harga = bAngka(el('pHarga').value);
  const rate = (+el('pRate').value || 0) / 100;
  if (!harga) {
    ['pHasil', 'pTabelJadwal', 'pIdentitas', 'pKotakRingkas', 'pTabelRinci',
     'pTabelJadwal2', 'pKakiAgen'].forEach(i => el(i).innerHTML = '');
    ['pCatatanJadwal', 'pCatatanJadwal2', 'pSangkalan'].forEach(i => el(i).textContent = '');
    el('pHasil').innerHTML = '<div class="peringatan">Isi harga rumah untuk melihat simulasi.</div>';
    return;
  }

  const inp = { hargaRumah: harga, persenDP: +el('pDP').value,
                tenor: +el('pTenor').value, rate: rate };
  const r = kprHitung(inp);

  el('pHasil').innerHTML =
    '<div class="sorotan"><div class="k">Cicilan per bulan</div>'
    + '<div class="v angka">' + rp(r.cicilanBulanan) + '</div>'
    + '<div class="t">Selama ' + inp.tenor + ' tahun, atau ' + r.jumlahBulan
    + ' kali angsuran.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Uang muka (DP)</div>'
    + '<div class="v angka">' + rp(r.nilaiDP) + '</div></div>'
    + '<div class="kartu"><div class="k">Pokok yang dibiayai KPR</div>'
    + '<div class="v angka">' + rp(r.pokokKPR) + '</div></div>'
    + '<div class="kartu"><div class="k">Cicilan per tahun</div>'
    + '<div class="v angka">' + rp(r.cicilanTahunan) + '</div></div>'
    + '<div class="kartu"><div class="k">Total seluruh cicilan</div>'
    + '<div class="v angka">' + rp(r.totalCicilan) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">TOTAL UANG KELUAR SAMPAI LUNAS</div>'
    + '<div class="v angka">' + rp(r.totalUangKeluar) + '</div>'
    + '<div class="k" style="margin-top:6px">DP ditambah seluruh cicilan, untuk rumah '
    + 'seharga ' + rp(r.hargaRumah) + '.</div></div>'
    + '<div class="kartu penuh"><div class="k">Total bunga dan biaya pembiayaan</div>'
    + '<div class="v angka">' + rp(r.totalBunga) + '</div>'
    + '<div class="k" style="margin-top:6px">Setara '
    + (r.rasioBunga * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    + '% dari pokok KPR — uang yang keluar tanpa menambah nilai rumah.</div></div></div>';

  const tabelJadwal =
    '<thead><tr><th>Akhir tahun</th><th class="kanan">Sudah dibayar</th>'
    + '<th class="kanan">Bunga terbayar</th><th class="kanan">Sisa utang</th>'
    + '</tr></thead><tbody>'
    + r.jadwal.map(x =>
        '<tr class="' + (x.sisaPokok === 0 ? 'tandai' : '') + '">'
        + '<td>Tahun ' + x.tahun + '</td>'
        + '<td class="kanan angka">' + rp(x.sudahDibayar) + '</td>'
        + '<td class="kanan angka">' + rp(x.bungaKumulatif) + '</td>'
        + '<td class="kanan angka">' + rp(x.sisaPokok) + '</td></tr>').join('')
    + '</tbody>';
  el('pTabelJadwal').innerHTML = tabelJadwal;
  el('pTabelJadwal2').innerHTML = tabelJadwal;
  const catatanJadwal = 'Di awal tenor sebagian besar cicilan masih membayar bunga, '
    + 'sehingga sisa utang turun pelan. Kolom sisa utang berguna untuk melihat posisi '
    + 'pinjaman pada tahun tertentu, misalnya bila ingin melunasi lebih cepat.';
  el('pCatatanJadwal').textContent = catatanJadwal;
  el('pCatatanJadwal2').textContent = catatanJadwal;

  // ---------- ringkasan ----------
  el('pIdentitas').innerHTML =
    '<div>Nama pembeli<b>' + esc(el('pNama').value || '\u2014') + '</b></div>'
    + '<div>Harga rumah<b>' + rp(r.hargaRumah) + '</b></div>'
    + '<div>DP<b>' + (inp.persenDP * 100) + '% \u2014 ' + rp(r.nilaiDP) + '</b></div>'
    + '<div>Tenor<b>' + inp.tenor + ' tahun, bunga '
    + (+el('pRate').value).toLocaleString('id-ID') + '%</b></div>';

  el('pKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Cicilan per bulan</div>'
    + '<div class="v angka">' + rp(r.cicilanBulanan) + '</div></div>'
    + '<div class="kartu"><div class="k">Cicilan per tahun</div>'
    + '<div class="v angka">' + rp(r.cicilanTahunan) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Total uang keluar sampai lunas</div>'
    + '<div class="v angka">' + rp(r.totalUangKeluar) + '</div>'
    + '<div class="k" style="margin-top:6px">Untuk rumah seharga ' + rp(r.hargaRumah)
    + '. Selisihnya ' + rp(r.totalUangKeluar - r.hargaRumah) + '.</div></div></div>';

  el('pTabelRinci').innerHTML =
    '<thead><tr><th>Keterangan</th><th class="kanan">Nilai</th></tr></thead><tbody>'
    + '<tr><td>Harga rumah</td><td class="kanan angka">' + rp(r.hargaRumah) + '</td></tr>'
    + '<tr><td>Uang muka (DP)</td><td class="kanan angka">' + rp(r.nilaiDP) + '</td></tr>'
    + '<tr><td>Pokok yang dibiayai KPR</td>'
    + '<td class="kanan angka">' + rp(r.pokokKPR) + '</td></tr>'
    + '<tr><td>Jumlah angsuran</td>'
    + '<td class="kanan angka">' + r.jumlahBulan + ' bulan</td></tr>'
    + '<tr class="bayar"><td>Cicilan per bulan</td>'
    + '<td class="kanan angka">' + rp(r.cicilanBulanan) + '</td></tr>'
    + '<tr><td>Total seluruh cicilan</td>'
    + '<td class="kanan angka">' + rp(r.totalCicilan) + '</td></tr>'
    + '<tr><td>Total bunga dan biaya pembiayaan</td>'
    + '<td class="kanan angka">' + rp(r.totalBunga) + '</td></tr>'
    + '<tr class="tandai"><td>Total uang keluar sampai lunas</td>'
    + '<td class="kanan angka">' + rp(r.totalUangKeluar) + '</td></tr></tbody>';

  el('pSangkalan').textContent = 'Simulasi edukasi, bukan penawaran kredit. Angka bank '
    + 'dapat berbeda karena provisi, administrasi, asuransi, pajak, notaris, biaya lain, '
    + 'serta perubahan bunga floating. Bunga yang dimasukkan diperlakukan sebagai bunga '
    + 'tahunan tetap dengan metode anuitas.';

  const na = el('pAgenNama').value, hp = el('pAgenHP').value;
  el('pKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function pAturan() {
  el('pAturan').innerHTML =
  '<details><summary>Cara cicilan dihitung</summary><div class="isi"><ul>'
  + '<li>Metode anuitas: cicilan tetap tiap bulan, terdiri dari bunga dan pokok yang porsinya bergeser tiap bulan.</li>'
  + '<li>Bunga tahunan dibagi dua belas menjadi bunga bulanan, lalu dipakai selama seluruh tenor sebagai bunga tetap.</li>'
  + '<li>Cicilan tahunan adalah cicilan bulanan dikali dua belas; total cicilan adalah cicilan tahunan dikali tenor.</li>'
  + '<li>Total uang keluar adalah uang muka ditambah seluruh cicilan sampai lunas.</li>'
  + '</ul></div></details>'

  + '<details><summary>Yang belum dihitung di sini</summary><div class="isi"><ul>'
  + '<li>Biaya provisi, administrasi, asuransi jiwa dan kebakaran dari bank, pajak, dan notaris.</li>'
  + '<li>Perubahan bunga floating setelah masa bunga tetap berakhir — di lapangan ini yang paling sering membuat cicilan naik.</li>'
  + '<li>Kenaikan atau penurunan harga properti.</li>'
  + '<li>Karena itu angka sesungguhnya dari bank hampir selalu lebih besar daripada simulasi ini.</li>'
  + '</ul></div></details>'

  ;
}

pGambar();


/* ============ Rumah Kedua: KPR dibandingkan Gen Aman ============ */
el('rDP').innerHTML = [0, 10, 20, 30].map(v =>
  '<option value="' + (v / 100) + '"' + (v === 20 ? ' selected' : '') + '>' + v + '%</option>').join('');
el('rTenor').innerHTML = [5, 10, 15, 20, 25].map(v =>
  '<option value="' + v + '"' + (v === 15 ? ' selected' : '') + '>' + v + ' tahun</option>').join('');
el('rMpp').innerHTML = [5, 10, 15].map(v =>
  '<option value="' + v + '"' + (v === 10 ? ' selected' : '') + '>' + v + ' tahun</option>').join('');

el('rNilai').addEventListener('input', () => {
  const n = bAngka(el('rNilai').value);
  el('rNilai').value = n ? n.toLocaleString('id-ID') : '';
  rGambar();
});
['rNama', 'rDP', 'rTenor', 'rRate', 'rTgl', 'rMpp', 'rAgenNama', 'rAgenHP']
  .forEach(id => el(id).addEventListener('input', rGambar));
['rJK', 'rMetode', 'rWaiver'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  rGambar();
}));

function rGambar() {
  rAturan();
  const nilai = bAngka(el('rNilai').value);
  const tgl = el('rTgl').value;
  const bersih = () => {
    ['rIdentitas', 'rKotakRingkas', 'rTabelBanding', 'rTabelDapat', 'rKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    ['rSangkalan', 'rCatatanBanding'].forEach(i => el(i).textContent = '');
  };

  if (!nilai) {
    el('rHasil').innerHTML = '<div class="peringatan">Isi nilai aset yang ingin '
      + 'dibandingkan.</div>';
    bersih(); return;
  }
  if (!tgl) {
    el('rInfoUsia').textContent = 'Isi tanggal lahir untuk menghitung usia.';
    el('rHasil').innerHTML = '<div class="peringatan">Isi tanggal lahir untuk menghitung '
      + 'kontribusi Gen Aman.</div>';
    bersih(); return;
  }

  const usia = usiaDari(new Date(tgl + 'T00:00:00Z'));
  const jk = nilaiSegmen('rJK'), mpp = +el('rMpp').value, metode = nilaiSegmen('rMetode');
  el('rInfoUsia').textContent = 'Usia ' + usia + ' tahun'
    + (el('rNama').value ? ' \u2022 ' + el('rNama').value : '');

  const tarif = gspaTarif(DATA_GSPA.dasar, mpp, jk, usia);
  if (!tarif) {
    el('rHasil').innerHTML = '<div class="peringatan">Tarif Gen Aman untuk usia ' + usia
      + ' dengan masa bayar ' + mpp + ' tahun tidak ada di database. Masa bayar 5 tahun '
      + 'sampai usia 70, 10 tahun sampai 65, 15 tahun sampai 60.</div>';
    bersih(); return;
  }

  // --- jalur KPR ---
  const tenor = +el('rTenor').value, persenDP = +el('rDP').value;
  const bunga = (+el('rRate').value || 0) / 100;
  const k = kprHitung({ hargaRumah: nilai, persenDP: persenDP, tenor: tenor, rate: bunga });

  // --- jalur Gen Aman ---
  const diskon = gspaTier(nilai, DATA_GSPA.diskon);
  const gDasarBulanan = tarif * nilai / 100000000 * (1 - diskon);
  const gDasarTahunan = gDasarBulanan * 11;

  /* Rider Waiver Gen Aman. Inilah inti pembanding halaman ini: cicilan KPR
     tetap harus dibayar walau debitur terdiagnosa penyakit kritis, sedangkan
     kontribusi dasar Gen Aman dibebaskan sampai akhir masa bayar.
     Preminya memakai waiverHitung() — fungsi yang sama dipakai layar Gen
     Aman, bukan salinan rumus. */
  const rPakaiWaiver = nilaiSegmen('rWaiver') !== 'Tidak';
  const rWv = (rPakaiWaiver && typeof waiverHitung === 'function')
    ? waiverHitung(usia, mpp, jk, nilai, diskon) : null;
  const rWaiverSah = !!(rWv && rWv.sah);
  const gWaiverBulanan = rWaiverSah ? Math.round(Number(rWv.bulanan) || 0) : 0;
  const gWaiverTahunan = rWaiverSah ? Math.round(Number(rWv.tahunan) || 0) : 0;

  const gBulanan = gDasarBulanan + gWaiverBulanan;
  const gTahunan = gDasarTahunan + gWaiverTahunan;
  const gPerSetoran = metode === 'Bulanan' ? gBulanan : gTahunan;
  const gPerTahun = metode === 'Bulanan' ? gBulanan * 12 : gTahunan;
  const gTotal = gPerTahun * mpp;
  /* Yang dibebaskan hanya kontribusi dasar; kontribusi waiver sendiri tidak. */
  const gDasarPerTahun = metode === 'Bulanan' ? gDasarBulanan * 12 : gDasarTahunan;
  const gSatuan = metode === 'Bulanan' ? 'bulan' : 'tahun';
  const kSetara = metode === 'Bulanan' ? k.cicilanBulanan : k.cicilanTahunan;

  const rasio = kSetara > 0 ? gPerSetoran / kSetara : 0;
  const hemat = kSetara - gPerSetoran;
  const hematTotal = k.totalUangKeluar - gTotal;

  // santunan ikut tumbuh 7,5% tiap 5 tahun, dibatasi 150%
  const santunan100 = nilai * (1 + Math.min(1.5, Math.floor((100 - usia) / 5) * 0.075));

  /* Tabel pembebasan — sekaligus pembanding langsung dengan KPR.
     Kolom KPR sengaja ditampilkan berdampingan: pada tahun yang sama, sisa
     cicilan KPR tetap menjadi kewajiban, sedangkan kontribusi Gen Aman
     dibebaskan. Itu perbedaan yang ingin dilihat nasabah. */
  /* Tabel pembebasan premi versus cicilan KPR dihapus dari halaman hitung.
     Intinya kini disampaikan sebagai dua baris pembanding di tabel "Yang
     didapat nasabah" pada layar Ringkasan — lebih ringkas dan tidak
     mengulang informasi yang sama di dua tempat. */

  el('rHasil').innerHTML =
    '<div class="sorotan"><div class="k">Untuk nilai yang sama ' + rp(nilai) + '</div>'
    + '<div class="v angka">' + rp(gPerSetoran) + ' <small>/' + gSatuan + '</small></div>'
    + '<div class="t">Gen Aman, tanpa uang muka. Jalur KPR ' + rp(kSetara) + ' per '
    + gSatuan + ' ditambah uang muka ' + rp(k.nilaiDP) + ' di depan.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Uang muka KPR</div>'
    + '<div class="v angka">' + rp(k.nilaiDP) + '</div></div>'
    + '<div class="kartu"><div class="k">Uang muka Gen Aman</div>'
    + '<div class="v angka">Rp 0</div></div>'
    + '<div class="kartu"><div class="k">Cicilan KPR per ' + gSatuan + '</div>'
    + '<div class="v angka">' + rp(kSetara) + '</div></div>'
    + '<div class="kartu"><div class="k">Kontribusi Gen Aman per ' + gSatuan + '</div>'
    + '<div class="v angka">' + rp(gPerSetoran) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Selisih beban per ' + gSatuan + '</div>'
    + '<div class="v angka">' + rp(hemat) + '</div>'
    + '<div class="k" style="margin-top:6px">Kontribusi Gen Aman setara '
    + (rasio * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    + '% dari cicilan KPR untuk nilai yang sama.</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar KPR</div>'
    + '<div class="v angka">' + tenor + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar Gen Aman</div>'
    + '<div class="v angka">' + mpp + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Total uang keluar KPR</div>'
    + '<div class="v angka">' + rp(k.totalUangKeluar) + '</div></div>'
    + '<div class="kartu"><div class="k">Total kontribusi Gen Aman</div>'
    + '<div class="v angka">' + rp(gTotal) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Selisih total sampai selesai</div>'
    + '<div class="v angka">' + rp(hematTotal) + '</div>'
    + '<div class="k" style="margin-top:6px">Diskon kontribusi Gen Aman '
    + Math.round(diskon * 100) + '% untuk UP sebesar ini, dan tidak ada bunga '
    + 'pembiayaan.</div></div></div>';

  // ---------- ringkasan untuk prospek ----------
  el('rIdentitas').innerHTML =
    '<div>Nama prospek<b>' + esc(el('rNama').value || '\u2014') + '</b></div>'
    + '<div>Usia<b>' + usia + ' tahun</b></div>'
    + '<div>Nilai aset<b>' + rp(nilai) + '</b></div>'
    + '<div>Metode bayar<b>' + metode + '</b></div>';

  el('rKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Rumah lewat KPR, per ' + gSatuan + '</div>'
    + '<div class="v angka">' + rp(kSetara) + '</div></div>'
    + '<div class="kartu"><div class="k">Rumah kedua lewat Gen Aman</div>'
    + '<div class="v angka">' + rp(gPerSetoran) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Selisih beban per ' + gSatuan + '</div>'
    + '<div class="v angka">' + rp(hemat) + '</div>'
    + '<div class="k" style="margin-top:6px">Untuk nilai aset yang sama, '
    + rp(nilai) + ', dan tanpa uang muka.</div></div></div>';

  el('rTabelBanding').innerHTML =
    '<thead><tr><th>Hal</th><th class="kanan">Rumah lewat KPR</th>'
    + '<th class="kanan">Rumah kedua lewat Gen Aman</th></tr></thead><tbody>'
    + '<tr><td>Nilai aset</td><td class="kanan angka">' + rp(nilai) + '</td>'
    + '<td class="kanan angka">' + rp(nilai) + '</td></tr>'
    + '<tr class="bayar"><td>Uang muka di depan</td>'
    + '<td class="kanan angka">' + rp(k.nilaiDP) + '</td>'
    + '<td class="kanan angka">Rp 0</td></tr>'
    + '<tr class="tandai"><td>Setoran per ' + gSatuan + '</td>'
    + '<td class="kanan angka">' + rp(kSetara) + '</td>'
    + '<td class="kanan angka">' + rp(gPerSetoran) + '</td></tr>'
    + '<tr><td>Lama membayar</td><td class="kanan angka">' + tenor + ' tahun</td>'
    + '<td class="kanan angka">' + mpp + ' tahun</td></tr>'
    + '<tr><td>Bunga atau biaya pembiayaan</td>'
    + '<td class="kanan angka">' + rp(k.totalBunga) + '</td>'
    + '<td class="kanan angka">Tidak ada</td></tr>'
    + '<tr><td>Potongan harga</td><td class="kanan angka">Tidak ada</td>'
    + '<td class="kanan angka">Diskon ' + Math.round(diskon * 100) + '%</td></tr>'
    + '<tr class="tandai"><td>Total uang keluar sampai selesai</td>'
    + '<td class="kanan angka">' + rp(k.totalUangKeluar) + '</td>'
    + '<td class="kanan angka">' + rp(gTotal) + '</td></tr>'
    + '</tbody>';

  el('rCatatanBanding').textContent = 'Kedua jalur memakai nilai aset yang sama, '
    + rp(nilai) + '. Jalur KPR memakai uang muka ' + (persenDP * 100) + '%, tenor '
    + tenor + ' tahun, dan bunga ' + (+el('rRate').value).toLocaleString('id-ID')
    + '% per tahun. Jalur Gen Aman memakai tarif usia ' + usia + ' ' + jk
    + ' dengan masa bayar ' + mpp + ' tahun.';

  el('rTabelDapat').innerHTML =
    '<thead><tr><th>Hal</th><th>Rumah lewat KPR</th>'
    + '<th>Rumah kedua lewat Gen Aman</th></tr></thead><tbody>'
    + '<tr><td>Wujudnya</td><td>Bangunan dan tanah atas nama pembeli</td>'
    + '<td>Santunan tunai untuk ahli waris</td></tr>'
    + '<tr><td>Bisa ditempati atau disewakan</td><td>Bisa</td><td>Tidak bisa</td></tr>'
    + '<tr><td>Kapan bisa dinikmati</td><td>Sejak serah terima</td>'
    + '<td>Saat risiko terjadi, atau di usia 100</td></tr>'
    + '<tr><td>Nilainya ke depan</td><td>Bisa naik, bisa turun, mengikuti pasar</td>'
    + '<td>Naik 7,5% setiap 5 tahun sampai batas 150%</td></tr>'
    + '<tr class="tandai"><td>Nilainya di usia 100</td>'
    + '<td>Tergantung harga pasar saat itu</td>'
    + '<td class="angka">' + rp(santunan100) + '</td></tr>'
    + '<tr><td>Kalau pembayaran berhenti di tengah jalan</td>'
    + '<td>Berisiko disita bank</td>'
    + '<td>Mengikuti ketentuan polis</td></tr>'
    /* Dua baris ini menggantikan tabel pembebasan premi yang sebelumnya
       berdiri sendiri di halaman hitung. Keduanya adalah inti pembandingnya:
       satu tentang meninggal dunia, satu tentang sakit kritis. */
    + '<tr class="tandai"><td>Kalau meninggal dunia dalam masa cicilan</td>'
    + '<td>KPR lunas bila ada asuransi jiwa kredit yang diambil saat akad; '
    + 'rumah menjadi milik ahli waris</td>'
    + '<td>Santunan Gen Aman sudah pasti menjadi milik ahli waris</td></tr>'
    + '<tr class="tandai"><td>Kalau terdiagnosa penyakit kritis</td>'
    + '<td>Cicilan KPR tetap harus dibayar sampai lunas</td>'
    + '<td>' + (rPakaiWaiver
        ? 'Kontribusi dasar yang belum dibayar dibebaskan sampai akhir masa bayar'
        : 'Dibebaskan bila rider Waiver diambil') + '</td></tr>'
    + '</tbody>';

  el('rSangkalan').textContent = 'Rumah dan polis adalah dua hal berbeda dan tidak saling '
    + 'menggantikan. Perbandingan di atas hanya menyandingkan besaran uang yang keluar '
    + 'untuk nilai aset yang sama, supaya terlihat bebannya. Simulasi KPR bersifat edukasi '
    + 'dan angka bank dapat berbeda karena provisi, administrasi, pajak, notaris, biaya '
    + 'lain, serta bunga floating. Angka Gen Aman adalah ilustrasi kontribusi berdasarkan '
    + 'tarif yang berlaku saat ini, tunduk pada Ketentuan Polis resmi PT Asuransi Jiwa '
    + 'Generali Indonesia dan hasil underwriting.';

  const na = el('rAgenNama').value, hp = el('rAgenHP').value;
  el('rKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function rAturan() {
  el('rAturan').innerHTML =
  '<details><summary>Cara membawakan perbandingan ini</summary><div class="isi"><ul>'
  + '<li>Pakai setelah prospek melihat simulasi cicilan rumahnya sendiri, ketika angka cicilan masih segar di kepalanya.</li>'
  + '<li>Sebut Gen Aman sebagai rumah kedua yang melengkapi, bukan pengganti rumah yang ditinggali.</li>'
  + '<li>Dua hal yang paling terasa: tidak ada uang muka, dan tidak ada bunga pembiayaan.</li>'
  + '<li>Sampaikan juga apa yang tidak didapat, supaya prospek tidak merasa keliru di kemudian hari. Tabel "yang didapat dari masing-masing" sudah memuatnya.</li>'
  + '</ul></div></details>'

  + '<details><summary>Cara angka dihitung</summary><div class="isi"><ul>'
  + '<li>Nilai aset yang sama dipakai sebagai harga rumah sekaligus uang pertanggungan Gen Aman.</li>'
  + '<li>Cicilan KPR memakai metode anuitas dengan bunga tetap sesuai yang dimasukkan.</li>'
  + '<li>Kontribusi Gen Aman memakai tarif per Rp100 juta sesuai usia, jenis kelamin, dan masa bayar, lalu dipotong diskon menurut besar uang pertanggungan.</li>'
  + '<li>Kontribusi tahunan dihitung 11 kali kontribusi bulanan.</li>'
  + '<li>Nilai di usia 100 memakai kenaikan 7,5% setiap 5 tahun dengan batas 150% dari uang pertanggungan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Yang perlu dijaga</summary><div class="isi"><ul>'
  + '<li>Jangan menyatakan polis lebih menguntungkan daripada properti; yang dibandingkan hanya beban uang keluar, bukan hasil investasi.</li>'
  + '<li>Jangan menjanjikan kenaikan harga properti maupun imbal hasil.</li>'
  + '<li>Angka KPR di sini belum memasukkan biaya bank, pajak, dan notaris, jadi jangan disebut sebagai angka final dari bank.</li>'
  + '</ul></div></details>';
}

rGambar();

// Mesin hitung kebutuhan dana pendidikan — terjemahan sheet
// 'KALKULATOR PENDIDIKAN' pada PSG Kalkulator Kebutuhan Dana Pendidikan.

function pdkHitung(inp) {
  const anak = inp.anak.map(function (a, i) {
    const tahunLagi = (a.usiaSekarang === null || a.usiaKuliah === null)
      ? null : Math.max(a.usiaKuliah - a.usiaSekarang, 0);            // D9
    const inflasi = a.inflasi === null || a.inflasi === undefined
      ? inp.inflasi : a.inflasi;                                      // G9
    const estimasi = (!a.biayaSekarang || tahunLagi === null)         // H9
      ? 0 : a.biayaSekarang * Math.pow(1 + inflasi, tahunLagi);
    return {
      no: i + 1, nama: a.nama, target: a.target,
      usiaSekarang: a.usiaSekarang, usiaKuliah: a.usiaKuliah,
      tahunLagi: tahunLagi, inflasi: inflasi,
      biayaSekarang: a.biayaSekarang || 0,
      estimasi: estimasi,
      danaAda: a.danaAda || 0,
      gap: Math.max(estimasi - (a.danaAda || 0), 0),                  // J9
      kenaikan: estimasi - (a.biayaSekarang || 0),
    };
  });

  const jumlah = function (ambil) {
    return anak.reduce(function (s, a) { return s + ambil(a); }, 0);
  };
  const out = {
    anak: anak,
    aktif: anak.filter(function (a) { return a.estimasi > 0; }),
    totalKebutuhan: jumlah(function (a) { return a.estimasi; }),      // B16
    totalBiayaHariIni: jumlah(function (a) { return a.biayaSekarang; }),
    danaPerAnak: jumlah(function (a) { return a.danaAda; }),          // F16
  };
  // H5 pada file asli tidak terpakai; di sini dijadikan dana bersama
  // yang belum dialokasikan ke anak tertentu.
  out.danaBersama = inp.danaBersama || 0;
  out.totalDana = out.danaPerAnak + out.danaBersama;
  out.totalGap = Math.max(out.totalKebutuhan - out.totalDana, 0);     // I16
  out.totalKenaikan = out.totalKebutuhan - out.totalBiayaHariIni;
  out.porsiTertutup = out.totalKebutuhan === 0 ? 0
    : Math.min(1, out.totalDana / out.totalKebutuhan);

  // Urutan kapan dana dibutuhkan — anak yang paling dekat lebih dulu
  out.urutan = out.aktif.slice().sort(function (a, b) {
    return a.tahunLagi - b.tahunLagi;
  });
  out.palingDekat = out.urutan.length ? out.urutan[0] : null;
  return out;
}

// Perbandingan total kebutuhan pada beberapa asumsi inflasi pendidikan
function pdkSensitivitas(inp, daftar) {
  return daftar.map(function (i) {
    const salinan = { inflasi: i, danaBersama: inp.danaBersama,
      anak: inp.anak.map(function (a) {
        const b = {}; for (var k in a) b[k] = a[k];
        b.inflasi = null;                 // paksa ikut asumsi global
        return b;
      }) };
    const r = pdkHitung(salinan);
    return { inflasi: i, total: r.totalKebutuhan, gap: r.totalGap };
  });
}


/* ============ Tampilan Kebutuhan Dana Pendidikan ============ */
el('nInflasi').innerHTML = [4, 5, 6, 7, 8, 10].map(v =>
  '<option value="' + (v / 100) + '"' + (v === 5 ? ' selected' : '') + '>'
  + v + '% per tahun</option>').join('');

let nAnak = [
  { nama: 'Anak 1', usiaSekarang: '', usiaKuliah: 18, target: '',
    biaya: 300000000, danaAda: 0, inflasi: '' },
];

/* Mengambil daftar anak dari Profil Nasabah yang aktif, supaya agen tidak
   mengisi data yang sama dua kali. Baris yang sudah diketik manual tidak
   ditimpa; yang diambil hanya nama, usia dari tanggal lahir, dan target biaya
   bila sudah diisi di profil. */
let nProfilTerakhir = null;
function nAmbilAnakDariProfil(paksa) {
  let p = null;
  try {
    const aktif = localStorage.getItem('insuranceHub.customerProfile.active.v1');
    const daftar = JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1') || '[]');
    p = daftar.find(x => x.id === aktif) || null;
  } catch (_) { return false; }
  if (!p) return false;
  if (!paksa && nProfilTerakhir === p.id) return false;

  const anak = (Array.isArray(p.children) ? p.children : [])
    .filter(c => c && (c.nama || c.tglLahir));
  nProfilTerakhir = p.id;
  if (!anak.length) {
    /* Profil baru tanpa data anak harus mengosongkan daftar profil sebelumnya. */
    nAnak = [{ nama: 'Anak 1', usiaSekarang: '', usiaKuliah: 18, target: '',
      biaya: 300000000, danaAda: 0, inflasi: '' }];
    return true;
  }

  nAnak = anak.map((c, i) => {
    const usia = c.tglLahir ? usiaGenerali(c.tglLahir) : '';
    return {
      nama: c.nama || ('Anak ' + (i + 1)),
      usiaSekarang: (usia === null || usia === undefined) ? '' : usia,
      usiaKuliah: 18,
      target: '',
      biaya: c.biayaPendidikanHariIni || 300000000,
      danaAda: 0,
      inflasi: ''
    };
  });
  if (el('nUsiaOrtu') && p.tglLahir) {
    const uo = usiaGenerali(p.tglLahir);
    if (uo != null) el('nUsiaOrtu').value = uo;
  }
  // Nama prospek mengikuti profile aktif sebagai default, tanpa menimpa
  // nama yang sudah diketik agen secara manual.
  if (el('nNama') && !String(el('nNama').value || '').trim() && p.nama) {
    el('nNama').value = p.nama;
  }
  return true;
}

function nGambarDaftar() {
  el('nDaftar').innerHTML = nAnak.map((a, i) => `
    <div class="blok" style="margin-bottom:10px;background:#FBFAF7">
      <div class="baris">
        <div><label for="na${i}">Nama anak</label>
          <input id="na${i}" data-i="${i}" data-f="nama" type="text"
                 value="${esc(a.nama)}" placeholder="Nama anak" autocomplete="off"></div>
        <div><label for="nt${i}">Target pendidikan</label>
          <input id="nt${i}" data-i="${i}" data-f="target" type="text"
                 value="${esc(a.target)}" placeholder="Misal: Kedokteran" autocomplete="off"></div>
      </div>
      <div class="baris">
        <div><label for="nu${i}">Usia sekarang</label>
          <input id="nu${i}" data-i="${i}" data-f="usiaSekarang" type="number"
                 min="0" max="30" value="${a.usiaSekarang}"></div>
        <div><label for="nk${i}">Usia mulai kuliah</label>
          <input id="nk${i}" data-i="${i}" data-f="usiaKuliah" type="number"
                 min="15" max="30" value="${a.usiaKuliah}"></div>
      </div>
      <div class="baris">
        <div><label for="nb${i}">Biaya kuliah harga hari ini</label>
          <input id="nb${i}" data-i="${i}" data-f="biaya" type="text" inputmode="numeric"
                 value="${a.biaya.toLocaleString('id-ID')}" autocomplete="off"></div>
        <div><label for="nd${i}">Dana khusus anak ini</label>
          <input id="nd${i}" data-i="${i}" data-f="danaAda" type="text" inputmode="numeric"
                 value="${a.danaAda.toLocaleString('id-ID')}" autocomplete="off"></div>
      </div>
      <div class="baris satu">
        <div><label for="ni${i}">Inflasi khusus anak ini (%)</label>
          <input id="ni${i}" data-i="${i}" data-f="inflasi" type="number" min="0" max="30"
                 step="0.5" value="${a.inflasi === '' ? '' : a.inflasi}"
                 placeholder="Kosongkan untuk ikut asumsi umum"></div>
      </div>
      ${nAnak.length > 1
        ? '<button type="button" class="sakelar" data-hapus="' + i + '">Hapus anak ini</button>'
        : ''}
    </div>`).join('');

  el('nDaftar').querySelectorAll('input').forEach(k =>
    k.addEventListener('input', () => {
      const i = +k.dataset.i, f = k.dataset.f;
      if (f === 'biaya' || f === 'danaAda') {
        const n = bAngka(k.value);
        k.value = n ? n.toLocaleString('id-ID') : '';
        nAnak[i][f] = n;
      } else if (f === 'usiaSekarang' || f === 'usiaKuliah' || f === 'inflasi') {
        nAnak[i][f] = k.value === '' ? '' : +k.value;
      } else {
        nAnak[i][f] = k.value;
      }
      nHitung();
    }));
  el('nDaftar').querySelectorAll('[data-hapus]').forEach(b =>
    b.addEventListener('click', () => {
      nAnak.splice(+b.dataset.hapus, 1);
      nGambarDaftar(); nHitung();
    }));
}
// Saat layar Kebutuhan Dana Pendidikan dibuka, daftar anaknya diambil dari
// profil nasabah yang sedang aktif bila belum pernah diambil untuk profil itu.
nAmbilAnakDariProfil(false);
nGambarDaftar();
if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__pdkAnakHook) {
  const bukaAsliPdk = window.bukaLayar;
  const bungkusPdk = function (nama) {
    if (nama === 'PDK') {
      try { if (nAmbilAnakDariProfil(false)) { nGambarDaftar(); } } catch (_) {}
    }
    return bukaAsliPdk.apply(this, arguments);
  };
  bungkusPdk.__pdkAnakHook = true;
  ['__naHook','__rzHook','__promptHook','__umumHook','__ghpBandingHook','__bandingProdukHook']
    .forEach(k => { bungkusPdk[k] = bukaAsliPdk[k]; });
  window.bukaLayar = bungkusPdk;
  if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkusPdk;
}

el('nTambah').addEventListener('click', () => {
  if (nAnak.length >= 5) return;
  nAnak.push({ nama: 'Anak ' + (nAnak.length + 1), usiaSekarang: '', usiaKuliah: 18,
               target: '', biaya: 300000000, danaAda: 0, inflasi: '' });
  nGambarDaftar(); nHitung();
});

el('nDanaBersama').addEventListener('input', () => {
  const n = bAngka(el('nDanaBersama').value);
  el('nDanaBersama').value = n ? n.toLocaleString('id-ID') : '';
  nHitung();
});
['nNama', 'nUsiaOrtu', 'nInflasi', 'nAgenNama', 'nAgenHP'].forEach(id =>
  el(id).addEventListener('input', nHitung));

function nHitung() {
  fpIsiIdentitasKonsultan('n');
  nAturan();
  const inflasi = +el('nInflasi').value;
  const usiaOrtu = +el('nUsiaOrtu').value || 0;
  const inp = {
    inflasi: inflasi,
    danaBersama: bAngka(el('nDanaBersama').value),
    anak: nAnak.map(a => ({
      nama: a.nama || 'Tanpa nama', target: a.target,
      usiaSekarang: a.usiaSekarang === '' ? null : a.usiaSekarang,
      usiaKuliah: a.usiaKuliah === '' ? null : a.usiaKuliah,
      biayaSekarang: a.biaya, danaAda: a.danaAda,
      // kosong berarti ikut asumsi umum, sama seperti kolom G di Excel
      inflasi: (a.inflasi === '' || a.inflasi === null || a.inflasi === undefined)
        ? null : a.inflasi / 100,
    })),
  };
  const r = pdkHitung(inp);

  // Validasi ringan untuk mencegah agen melewatkan data pendidikan yang
  // secara logika belum masuk akal. Tidak mengubah rumus pdkHitung().
  const masalah = [];
  nAnak.forEach((a, i) => {
    const uNow = a.usiaSekarang === '' ? null : Number(a.usiaSekarang);
    const uKuliah = a.usiaKuliah === '' ? null : Number(a.usiaKuliah);
    const biaya = Number(a.biaya || 0);
    if (uNow !== null && uKuliah !== null && uKuliah <= uNow) {
      masalah.push((a.nama || ('Anak ' + (i + 1))) + ': usia kuliah harus lebih besar dari usia sekarang.');
    }
    if (biaya < 0) masalah.push((a.nama || ('Anak ' + (i + 1))) + ': biaya pendidikan tidak boleh negatif.');
  });

  const bersih = () => {
    ['nIdentitas', 'nKotakRingkas', 'nTabelAnak', 'nTabelUrutan', 'nKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    ['nSangkalan', 'nCatatanAnak', 'nCatatanUrutan'].forEach(i => el(i).textContent = '');
  };

  if (!r.aktif.length) {
    el('nHasil').innerHTML = '<div class="peringatan">Isi usia anak sekarang dan biaya '
      + 'kuliah harga hari ini untuk melihat kebutuhannya.</div>';
    bersih(); return;
  }

  if (masalah.length) {
    el('nHasil').innerHTML = '<div class="peringatan"><b>Cek data pendidikan</b><ul>'
      + masalah.map(x => '<li>' + esc(x) + '</li>').join('')
      + '</ul><span class="catatan">Perbaiki data di bagian anak sebelum memakai hasil ini untuk prospek.</span></div>';
    bersih(); return;
  }

  el('nHasil').innerHTML =
    '<div class="sorotan"><div class="k">Total kebutuhan saat anak kuliah</div>'
    + '<div class="v angka">' + rp(r.totalKebutuhan) + '</div>'
    + '<div class="t">Untuk ' + r.aktif.length + ' anak. Harga hari ini '
    + rp(r.totalBiayaHariIni) + '.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Kenaikan karena inflasi</div>'
    + '<div class="v angka">' + rp(r.totalKenaikan) + '</div></div>'
    + '<div class="kartu"><div class="k">Dana yang sudah ada</div>'
    + '<div class="v angka">' + rp(r.totalDana) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">KEKURANGAN YANG PERLU DISIAPKAN</div>'
    + '<div class="v angka">' + rp(r.totalGap) + '</div>'
    + '<div class="k" style="margin-top:6px">Porsi kebutuhan yang sudah tertutup '
    + (r.porsiTertutup * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    + '%.</div></div>'
    + (r.palingDekat
      ? '<div class="kartu penuh"><div class="k">Yang paling dekat: ' + esc(r.palingDekat.nama)
        + '</div><div class="v angka">' + r.palingDekat.tahunLagi + ' tahun lagi</div>'
        + '<div class="k" style="margin-top:6px">Perlu ' + rp(r.palingDekat.estimasi)
        + ' saat masuk kuliah, kekurangannya ' + rp(r.palingDekat.gap) + '.'
        + (usiaOrtu ? ' Usia orang tua saat itu ' + (usiaOrtu + r.palingDekat.tahunLagi)
            + ' tahun.' : '') + '</div></div>'
      : '')
    + '</div>';

  // ---------- ringkasan untuk prospek ----------
  el('nIdentitas').innerHTML =
    '<div>Nama prospek<b>' + esc(el('nNama').value || '\u2014') + '</b></div>'
    + '<div>Jumlah anak<b>' + r.aktif.length + ' anak</b></div>'
    + '<div>Usia orang tua<b>' + (usiaOrtu || '\u2014') + ' tahun</b></div>'
    + '<div>Inflasi pendidikan<b>' + (inflasi * 100).toLocaleString('id-ID') + '% / tahun</b></div>';

  el('nKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu penuh"><div class="k">Total kebutuhan saat anak kuliah</div>'
    + '<div class="v angka">' + rp(r.totalKebutuhan) + '</div></div>'
    + '<div class="kartu"><div class="k">Dana yang sudah ada</div>'
    + '<div class="v angka">' + rp(r.totalDana) + '</div></div>'
    + '<div class="kartu"><div class="k">Kekurangan</div>'
    + '<div class="v angka">' + rp(r.totalGap) + '</div></div></div>';

  el('nTabelAnak').innerHTML =
    '<thead><tr><th>Anak</th><th>Target</th><th class="kanan">Usia</th>'
    + '<th class="kanan">Kuliah</th><th class="kanan">Thn lagi</th>'
    + '<th class="kanan">Inflasi</th><th class="kanan">Biaya hari ini</th>'
    + '<th class="kanan">Estimasi saat kuliah</th>'
    + '<th class="kanan">Dana ada</th><th class="kanan">Kekurangan</th></tr></thead><tbody>'
    + r.aktif.map(a =>
        '<tr><td>' + esc(a.nama) + '</td><td>' + esc(a.target || '\u2014') + '</td>'
        + '<td class="kanan angka">' + a.usiaSekarang + '</td>'
        + '<td class="kanan angka">' + a.usiaKuliah + '</td>'
        + '<td class="kanan angka">' + a.tahunLagi + '</td>'
        + '<td class="kanan angka">' + (a.inflasi * 100).toLocaleString('id-ID',
            { maximumFractionDigits: 1 }) + '%</td>'
        + '<td class="kanan angka">' + rp(a.biayaSekarang) + '</td>'
        + '<td class="kanan angka">' + rp(a.estimasi) + '</td>'
        + '<td class="kanan angka">' + rp(a.danaAda) + '</td>'
        + '<td class="kanan angka">' + rp(a.gap) + '</td></tr>').join('')
    + '<tr class="tandai"><td colspan="6">Total</td>'
    + '<td class="kanan angka">' + rp(r.totalBiayaHariIni) + '</td>'
    + '<td class="kanan angka">' + rp(r.totalKebutuhan) + '</td>'
    + '<td class="kanan angka">' + rp(r.danaPerAnak) + '</td>'
    + '<td class="kanan angka">' + rp(r.totalKebutuhan - r.danaPerAnak) + '</td></tr>'
    + (r.danaBersama > 0
      ? '<tr class="bayar"><td colspan="8">Dana bersama yang belum dialokasikan</td>'
        + '<td class="kanan angka">' + rp(r.danaBersama) + '</td>'
        + '<td class="kanan angka">\u2014</td></tr>'
        + '<tr class="tandai"><td colspan="8">Kekurangan setelah dana bersama</td>'
        + '<td class="kanan angka">' + rp(r.totalDana) + '</td>'
        + '<td class="kanan angka">' + rp(r.totalGap) + '</td></tr>'
      : '')
    + '</tbody>';
  el('nCatatanAnak').textContent = 'Kolom estimasi saat kuliah adalah biaya hari ini yang '
    + 'dinaikkan inflasi pendidikan ' + (inflasi * 100).toLocaleString('id-ID')
    + '% per tahun sampai anak masuk kuliah. Biaya hari ini diisi sesuai target kampus dan '
    + 'jurusan yang dibicarakan dengan prospek.';

  el('nTabelUrutan').innerHTML =
    '<thead><tr><th>Urutan</th><th>Anak</th><th class="kanan">Tahun lagi</th>'
    + '<th class="kanan">Usia orang tua saat itu</th>'
    + '<th class="kanan">Yang harus siap</th><th class="kanan">Kekurangan</th>'
    + '</tr></thead><tbody>'
    + r.urutan.map((a, i) =>
        '<tr class="' + (i === 0 ? 'tandai' : '') + '">'
        + '<td>' + (i + 1) + '</td><td>' + esc(a.nama) + '</td>'
        + '<td class="kanan angka">' + a.tahunLagi + ' tahun</td>'
        + '<td class="kanan angka">' + (usiaOrtu ? (usiaOrtu + a.tahunLagi) + ' tahun'
            : '\u2014') + '</td>'
        + '<td class="kanan angka">' + rp(a.estimasi) + '</td>'
        + '<td class="kanan angka">' + rp(a.gap) + '</td></tr>').join('')
    + '</tbody>';
  el('nCatatanUrutan').textContent = r.palingDekat
    ? 'Dana untuk ' + r.palingDekat.nama + ' dibutuhkan paling cepat, '
      + r.palingDekat.tahunLagi + ' tahun lagi. Waktu persiapan yang pendek berarti '
      + 'setoran bulanannya paling berat, jadi biasanya itu yang didahulukan.'
    : '';

  el('nSangkalan').textContent = 'Simulasi edukasi. Biaya sesungguhnya berbeda menurut '
    + 'universitas, jurusan, lokasi, kebijakan kampus, serta kondisi ekonomi. Biaya hari '
    + 'ini diisi berdasarkan target prospek, bukan angka resmi kampus mana pun. Perhitungan '
    + 'ini tidak mengilustrasikan premi, manfaat, maupun produk asuransi.';

  const na = el('nAgenNama').value, hp = el('nAgenHP').value;
  el('nKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function nAturan() {
  el('nAturan').innerHTML =
  '<details><summary>Cara kebutuhan dihitung</summary><div class="isi"><ul>'
  + '<li>Tahun lagi dihitung dari usia mulai kuliah dikurangi usia anak sekarang.</li>'
  + '<li>Biaya kuliah harga hari ini dinaikkan dengan inflasi pendidikan sampai tahun anak masuk kuliah.</li>'
  + '<li>Kekurangan tiap anak adalah estimasi biayanya dikurangi dana yang sudah khusus disiapkan untuk anak itu.</li>'
  + '<li>Dana bersama yang belum dialokasikan dikurangkan dari total, bukan dari anak tertentu.</li>'
  + '<li>Biaya yang dimasukkan adalah biaya total sampai selesai kuliah, sesuai target yang dibicarakan dengan prospek.</li>'
  + '</ul></div></details>'

  + '<details><summary>Soal asumsi inflasi pendidikan</summary><div class="isi"><ul>'
  + '<li>Inflasi pendidikan biasanya lebih tinggi daripada inflasi biaya hidup umum.</li>'
  + '<li>Karena itu pilihan asumsinya di sini dimulai dari 4% sampai 10%.</li>'
  + '<li>Semakin jauh jarak ke tahun kuliah, semakin besar pengaruh asumsi ini. Untuk anak yang masih kecil, selisih 2% bisa mengubah kebutuhan sangat jauh.</li>'
  + '<li>Kolom inflasi khusus per anak boleh dikosongkan; kalau kosong, anak itu mengikuti asumsi umum. Isi hanya bila satu anak berbeda, misalnya kuliah di luar negeri.</li>'
  + '<li>Ubah angka asumsinya di depan prospek supaya terlihat bahwa hasilnya bergantung pada asumsi yang mereka pilih sendiri, bukan kepastian.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas pemakaian</summary><div class="isi"><ul>'
  + '<li>Perhitungan ini tahap menggali kebutuhan, bukan penawaran produk.</li>'
  + '<li>Belum memperhitungkan biaya hidup anak selama kuliah, uang pangkal terpisah, maupun kemungkinan beasiswa.</li>'
  + '<li>Belum memperhitungkan hasil pengembangan dana yang sudah tersedia.</li>'
  + '<li>Setelah kebutuhan dan kekurangannya jelas, barulah cara menyiapkannya dibicarakan.</li>'
  + '</ul></div></details>';
}

nHitung();

// Mesin hitung Kombinasi Produk — terjemahan COMBO_SLOT_1..9 dan
// COMBO_Summary pada Insurance Hub v6. Produk yang ditangani:
// New Cemerlang Prime, Cristal Prime, BSL 3/5-100, Gen Aman (GSPA), dan
// iFLEXYGUARD.

   // hanya boleh satu slot

// D10 pada 'COMBO_GSPA Input Data & Summary'. Tangga diskonnya ditulis
// langsung di file kombinasi dan berbeda dari tabel GSPA_Aturan_Diskon
// yang dipakai kalkulator Gen Aman tersendiri.
function comboDiskonGSPA(up) {
  if (up < 500000000) return 0;
  if (up < 1000000000) return 0.15;
  if (up < 1500000000) return 0.30;
  if (up < 2000000000) return 0.35;
  if (up < 5000000000) return 0.40;
  return 0.45;
}

function comboTarifGSPA(tabel, mpp, jk, usia) {
  const a = tabel[String(mpp)];
  const b = a ? a[String(jk).toUpperCase()] : null;
  return b ? (b[String(usia)] || 0) : 0;
}

function comboSlot(inp, s, tarifSemua) {
  const o = { produk: s.produk, lamaBayar: s.lamaBayar, lamaLindung: s.lamaLindung,
              up: s.up, sah: false, status: 'Nonaktif' };

  // B13: rantai penjaga, urutannya sama seperti di Excel
  if (!s.produk) { o.status = 'Produk belum dipilih'; return o; }
  if (!inp.tglLahir) { o.status = 'Tanggal lahir belum diisi'; return o; }
  if (!s.lamaBayar) { o.status = 'Lama bayar belum dipilih'; return o; }
  /* Lite Future tidak memakai "lama lindung" — masa perlindungannya ditentukan
     oleh usia pensiun yang dipilih, sama seperti GSPA dan iFLEXYGUARD yang
     juga dikecualikan di sini. */
  if (s.produk !== 'GSPA' && s.produk !== 'iFLEXYGUARD' && s.produk !== 'Lite Future'
      && !s.lamaLindung) {
    o.status = 'Lama lindung belum dipilih'; return o;
  }
  if (!s.up) { o.status = 'UP belum diisi'; return o; }
  if (s.up < COMBO_MIN_UP) { o.status = 'Minimal UP Rp100.000.000'; return o; }
  if (s.produk === 'New Cemerlang Prime' && s.lamaBayar === 3 && s.lamaLindung === 15) {
    o.status = 'Plan tidak tersedia'; return o;
  }
  if (s.produk === 'BSL' && s.lamaLindung !== 100) {
    o.status = 'BSL harus pilih lama lindung 100'; return o;
  }

  const usia = inp.usia;

  // ---------- GSPA ----------
  if (s.produk === 'GSPA') {
    const tarif = comboTarifGSPA(tarifSemua.gspa.dasar, s.lamaBayar, inp.jk, usia);
    if (!tarif) {
      o.status = 'Tarif GSPA untuk usia ' + usia + ' dengan masa bayar ' + s.lamaBayar
        + ' tahun tidak ada di database';
      return o;
    }
    const wakaf = s.modeWakaf === 'Wakaf';
    let termLife = 0, premiWakaf = 0;
    if (wakaf) {
      if (s.lamaBayar === 15) { o.status = 'Wakaf tidak tersedia untuk masa bayar 15 tahun'; return o; }
      if (!s.nilaiWakaf) { o.status = 'Isi nilai yang ingin diwakafkan'; return o; }
      if (s.persenWakaf < 0.10 || s.persenWakaf > 0.45) {
        o.status = 'Persentase wakaf harus 10% sampai 45%'; return o;
      }
      termLife = s.nilaiWakaf / s.persenWakaf;
      const tw = comboTarifGSPA(tarifSemua.gspa.wakaf, s.lamaBayar, inp.jk, usia);
      if (!tw) { o.status = 'Tarif Term Life wakaf tidak ada di database'; return o; }
      premiWakaf = tw * termLife / 100000000;
      o.tarifWakaf = tw;
    }
    o.sah = true;
    o.status = 'Valid';
    o.kode = 'GSPA ' + s.lamaBayar + ' tahun' + (wakaf ? ' (Wakaf)' : '');
    o.tarifDasar = tarif;
    o.diskon = comboDiskonGSPA(s.up);
    o.premiBulanan = tarif * s.up / 100000000 * (1 - o.diskon) + premiWakaf;   // D11
    o.premiTahunan = o.premiBulanan * 11;                                      // D12

    /* Rider Waiver Gen Aman. Sebelumnya tidak ada sama sekali di layar
       Kombinasi, sehingga premi Gen Aman di sini selalu lebih kecil daripada
       kalkulator Gen Aman aslinya — dan tabel pembebasan preminya tidak
       pernah ikut ke ringkasan gabungan.

       Preminya dihitung dengan waiverHitung(), fungsi yang SAMA dipakai layar
       Gen Aman, bukan salinan rumus. Yang dibebaskan hanya premi dasar;
       premi waiver sendiri tidak, sesuai ketentuan polis. */
    o.pakaiWaiver = s.pakaiWaiver !== false;
    const wvGspa = (o.pakaiWaiver && typeof waiverHitung === 'function')
      ? waiverHitung(usia, s.lamaBayar, inp.jk, s.up, o.diskon) : null;
    o.waiverSah = !!(wvGspa && wvGspa.sah);
    o.waiverBulanan = o.waiverSah ? Math.round(Number(wvGspa.bulanan) || 0) : 0;
    o.waiverTahunan = o.waiverSah ? Math.round(Number(wvGspa.tahunan) || 0) : 0;
    o.premiBulanan += o.waiverBulanan;
    o.premiTahunan += o.waiverTahunan;
    /* Premi dasar tanpa waiver disimpan terpisah — inilah yang dibebaskan. */
    o.dasarPerTahunTanpaWaiver = inp.metode === 'Bulanan'
      ? (o.premiBulanan - o.waiverBulanan) * 12
      : (o.premiTahunan - o.waiverTahunan);

    o.premiMetode = inp.metode === 'Bulanan' ? o.premiBulanan : o.premiTahunan;
    o.premiPerTahun = inp.metode === 'Bulanan' ? o.premiBulanan * 12 : o.premiTahunan;
    o.totalDibayar = o.premiPerTahun * s.lamaBayar;
    o.termLife = termLife;
    o.nilaiWakaf = wakaf ? s.nilaiWakaf : 0;
    o.sisaWakaf = wakaf ? termLife - s.nilaiWakaf : 0;
    o.mdBiasa = wakaf ? s.up + o.sisaWakaf : s.up;                             // F7
    o.mdKecelakaan = o.mdBiasa;
    o.extraAccident = 0;
    o.extraAccidentFlex = 0;
    o.ciDasar = 0; o.bonusCI = 0; o.totalCI = 0; o.angioplasty = 0; o.sisaCI = 0;
    o.rop = 0;
    o.akhirKontrak = s.up * (1 + Math.min(1.5, Math.floor((100 - usia) / 5) * 0.075));
    o.luarNegeri = Math.min(s.up * 0.1, 500000000);      // B27
    o.transportasi = Math.min(s.up, 2000000000);         // B28
    o.haji = Math.min(s.up, 1000000000);                 // B29
    /* Sama seperti mesin GSPA: masa perlindungan berjalan sampai usia 100,
       jadi baris terakhirnya usia 100 (bukan 99). BSL memakai 101 - usia
       dengan alasan yang sama. */
    o.tahunCair = 101 - usia;
    return o;
  }

  // ---------- iFLEXYGUARD ----------
  if (s.produk === 'Lite Future') {
    /* BeSMART Lite Future di dalam Kombinasi.

       Versi sederhana yang disepakati: satu usia pensiun per slot, UP dari
       dropdown tier, masa bayar disaring dari isi tabel. TIDAK ada optimasi
       pemecahan UP — itu milik layar Segitiga dan tidak dibawa ke sini.

       Tarifnya diambil dari tabel yang sama dengan kalkulator Lite Future:
       TARIF['LFB <mpp>-<usiaPensiun>'] untuk setoran bulanan dan 'LFT ...'
       untuk tahunan, berisi [tarif UP, tarif waiver] per Rp100 juta UP.

       Waiver Lite Future WAJIB, jadi selalu ikut — tidak ada sakelarnya. */
    const usiaPensiun = Number(s.usiaPensiun) || 0;
    if (!usiaPensiun) { o.status = 'Usia pensiun belum dipilih'; return o; }
    if (usiaPensiun <= usia) {
      o.status = 'Usia pensiun harus lebih besar dari usia masuk (' + usia + ' tahun)';
      return o;
    }
    const bulanan = inp.metode === 'Bulanan';
    const kunci = (bulanan ? 'LFB ' : 'LFT ') + s.lamaBayar + '-' + usiaPensiun;
    /* Struktur tabelnya TARIF[kunci][usia][jk], dengan jenis kelamin ditulis
       satu huruf: 'W' untuk wanita, 'P' untuk pria. Nilainya sepasang:
       [tarif UP, tarif waiver] per Rp100 juta UP. */
    const tabel = (typeof TARIF !== 'undefined' && TARIF) ? TARIF[kunci] : null;
    const baris = tabel ? tabel[String(usia)] : null;
    const kodeJk = String(inp.jk).toUpperCase().charAt(0) === 'W' ? 'W' : 'P';
    const pasangan = baris ? baris[kodeJk] : null;
    if (!pasangan) {
      o.status = 'Tarif Lite Future untuk usia ' + usia + ', masa bayar ' + s.lamaBayar
        + ' tahun, pensiun ' + usiaPensiun + ' tidak ada di database';
      return o;
    }
    const pengali = s.up / 100000000;
    /* Diskon 5% untuk UP mulai Rp1 miliar — aturan yang sama dipakai mesin
       Lite Future (S23). Tanpa ini premi di Kombinasi akan 5% lebih tinggi
       daripada kalkulator Lite Future untuk UP yang sama. */
    const diskonLF = s.up >= 1000000000 ? 0.95 : 1;
    const bulat = function (x) { return Math.sign(x) * Math.round(Math.abs(x)); };
    const dasarSetoran = bulat((Number(pasangan[0]) || 0) * pengali * diskonLF);
    const waiverSetoran = bulat((Number(pasangan[1]) || 0) * pengali * diskonLF);
    o.sah = true;
    o.status = 'Valid';
    o.kode = 'Lite Future ' + s.lamaBayar + ' tahun, pensiun ' + usiaPensiun;
    o.usiaPensiun = usiaPensiun;
    o.tarifDasar = Number(pasangan[0]) || 0;
    o.premiDasarSetoran = dasarSetoran;
    o.premiWaiverSetoran = waiverSetoran;
    o.waiverWajib = true;
    const setoran = dasarSetoran + waiverSetoran;
    o.premiBulanan = bulanan ? setoran : setoran / 11;
    o.premiTahunan = bulanan ? setoran * 11 : setoran;
    o.premiMetode = setoran;
    o.premiPerTahun = bulanan ? setoran * 12 : setoran;
    o.totalDibayar = o.premiPerTahun * s.lamaBayar;
    /* Dasar pembebasan waiver: premi dasar setahun tanpa premi waiver. */
    o.dasarPerTahunTanpaWaiver = bulanan ? dasarSetoran * 12 : dasarSetoran;
    o.rop = 0;
    o.akhirKontrak = s.up;                 // cair 100% di usia pensiun
    o.mdBiasa = s.up;
    o.extraAccident = 0; o.extraAccidentFlex = 0;
    o.mdKecelakaan = o.mdBiasa;
    o.bonus75 = 0;
    o.ciDasar = 0; o.bonusCI = 0; o.totalCI = 0; o.angioplasty = 0; o.sisaCI = 0;
    o.luarNegeri = 0; o.transportasi = 0; o.haji = 0;
    /* Berakhir saat dana pensiun cair. Setelah itu UP-nya keluar dari
       gabungan, ditangani oleh fungsi berjalan() lewat tahunCair. */
    o.tahunCair = usiaPensiun - usia;
    return o;
  }

  if (s.produk === 'iFLEXYGUARD') {
    const baris = tarifSemua.flex[String(usia)];
    const paket = baris ? baris[String(s.lamaBayar)] : null;
    if (!paket || !paket['Bulanan'] || !paket['Tahunan']) {
      o.status = 'Tarif iFLEXYGUARD untuk usia ' + usia + ' dengan masa bayar '
        + s.lamaBayar + ' tahun tidak ada di database';
      return o;
    }
    const basisUP = paket['Bulanan'][0];
    o.sah = true;
    o.status = 'Valid';
    o.kode = 'iFLEXYGUARD ' + s.lamaBayar + ' tahun';
    o.tarifDasar = paket['Bulanan'][1];
    o.premiBulanan = s.up / basisUP * paket['Bulanan'][1];    // E4
    o.premiTahunan = s.up / basisUP * paket['Tahunan'][1];    // E5, tarif sendiri
    o.premiMetode = inp.metode === 'Bulanan' ? o.premiBulanan : o.premiTahunan;
    o.premiPerTahun = inp.metode === 'Bulanan' ? o.premiBulanan * 12 : o.premiTahunan;
    o.totalDibayar = o.premiPerTahun * s.lamaBayar;
    o.rop = 0;
    o.akhirKontrak = s.up * 1.5;                             // E12
    o.mdBiasa = s.up;                                        // E7
    // Batas Rp2 miliar hanya berlaku untuk tambahan NCP. Tambahan
    // iFLEXYGUARD dijumlahkan terpisah, sesuai K7 pada COMBO_Summary.
    o.extraAccident = 0;
    o.extraAccidentFlex = Math.min(s.up, 1000000000);        // E11
    o.mdKecelakaan = o.mdBiasa + o.extraAccidentFlex;
    o.bonus75 = s.up * 0.5;                                  // E10
    o.ciDasar = 0; o.bonusCI = 0; o.totalCI = 0; o.angioplasty = 0; o.sisaCI = 0;
    o.luarNegeri = 0; o.transportasi = 0; o.haji = 0;
    o.tahunCair = 100 - usia;
    return o;
  }

  let dasar = 0, basis = 0, kode = '';
  if (s.produk === 'New Cemerlang Prime') {
    kode = 'NCP ' + s.lamaBayar + '-' + s.lamaLindung;
    dasar = (tarifSemua.cem[String(usia)] || {})[kode] || 0;
    basis = 1000000000;
  } else if (s.produk === 'Cristal Prime') {
    kode = 'CP ' + s.lamaBayar + '-' + s.lamaLindung + ' ' + String(inp.jk).toUpperCase();
    dasar = (tarifSemua.cris[String(usia)] || {})[kode] || 0;
    basis = 500000000;
  } else if (s.produk === 'BSL') {
    kode = 'BSL ' + s.lamaBayar + '-100 ' + String(inp.jk).toUpperCase();
    /*
       BSL pada COMBO memakai premi gabungan UP dasar + Lite UP 400%,
       tanpa rider GHP. Mesin BSL terbaru menyimpan keduanya terpisah
       di TARIF_BSL_LENGKAP.mpp[mpp][jk][usia] = [dasar, Lite UP].
       Karena satu paket lama COMBO sebelumnya memakai tarif gabungan
       per Rp500 juta, kita jumlahkan dua komponen dari database lengkap
       lalu tetap memakai basis UP Rp500 juta. Tidak ada rumus premi baru.
    */
    const lengkap = (typeof TARIF_BSL_LENGKAP !== 'undefined') ? TARIF_BSL_LENGKAP : null;
    const tabelMpp = lengkap && lengkap.mpp ? lengkap.mpp[String(s.lamaBayar)] : null;
    const tabelJK = tabelMpp ? tabelMpp[String(inp.jk).toUpperCase()] : null;
    const komponen = tabelJK ? tabelJK[String(usia)] : null;
    dasar = komponen ? (Number(komponen[0]) || 0) + (Number(komponen[1]) || 0) : 0;
    basis = 500000000;
  }
  if (!dasar) {
    o.status = 'Tarif untuk usia ' + usia + ' tidak ada di database';
    return o;
  }

  o.sah = true;
  o.status = 'Valid';
  o.kode = kode;
  o.tarifDasar = dasar;
  o.premiBulanan = s.up / basis * dasar;                              // B21
  o.premiTahunan = o.premiBulanan * 11;                               // B22
  o.premiMetode = inp.metode === 'Bulanan' ? o.premiBulanan : o.premiTahunan;
  o.premiPerTahun = inp.metode === 'Bulanan' ? o.premiBulanan * 12 : o.premiTahunan;
  o.totalDibayar = o.premiPerTahun * s.lamaBayar;                     // B24

  // B25 & B26
  o.rop = (s.produk === 'BSL') ? 0
    : (s.lamaLindung === 15 ? 1.2 : (s.lamaLindung === 20 ? 1.35 : 1.5));
  o.akhirKontrak = s.produk === 'BSL' ? s.up : o.totalDibayar * o.rop;

  // B27 sampai B33
  o.mdBiasa = s.produk === 'Cristal Prime' ? o.akhirKontrak : s.up;
  o.extraAccident = s.produk === 'New Cemerlang Prime' ? Math.min(s.up, 2000000000) : 0;
  o.mdKecelakaan = s.produk === 'New Cemerlang Prime'
    ? (s.up <= 2000000000 ? s.up * 2 : s.up + 2000000000) : o.mdBiasa;
  o.ciDasar = s.produk === 'Cristal Prime' ? s.up : 0;
  o.bonusCI = s.produk === 'Cristal Prime' ? Math.min(o.ciDasar * 0.2, 200000000) : 0;
  o.totalCI = o.ciDasar + o.bonusCI;
  o.angioplasty = s.produk === 'Cristal Prime' ? Math.min(o.ciDasar * 0.1, 200000000) : 0;
  o.sisaCI = s.produk === 'Cristal Prime' ? o.totalCI - o.angioplasty : 0;
  o.luarNegeri = 0; o.transportasi = 0; o.haji = 0;
  o.nilaiWakaf = 0; o.termLife = 0; o.sisaWakaf = 0;
  o.extraAccidentFlex = 0;

  // B35: tahun polis saat manfaat akhir cair
  o.tahunCair = s.produk === 'BSL' ? 101 - usia : s.lamaLindung;
  return o;
}

function comboHitung(inp, tarifSemua) {
  const slot = inp.slot.map(function (s) { return comboSlot(inp, s, tarifSemua); });
  const aktif = slot.filter(function (s) { return s.sah; });
  const jumlah = function (ambil) {
    return aktif.reduce(function (t, s) { return t + ambil(s); }, 0);
  };

  const out = { slot: slot, aktif: aktif, usia: inp.usia };
  // Ringkasan mengikuti COMBO_Summary Excel: H3/H4/H5/K3/K4/K5/K6/K7/K8.
  out.totalBulanan = jumlah(function (s) { return s.premiBulanan; });
  out.totalTahunan = jumlah(function (s) { return s.premiTahunan; });
  out.totalMetode = jumlah(function (s) { return s.premiMetode; });
  out.totalDibayar = jumlah(function (s) { return s.totalDibayar; });
  out.totalAkhirKontrak = jumlah(function (s) { return s.akhirKontrak; });
  out.selisihAkhir = out.totalAkhirKontrak - out.totalDibayar;
  out.totalMD = jumlah(function (s) { return s.mdBiasa; });
  out.totalCI = jumlah(function (s) { return s.totalCI; });
  out.totalAngioplasty = Math.min(jumlah(function (s) { return s.angioplasty; }), 200000000);
  out.totalMDKecelakaan = out.totalMD
    + Math.min(jumlah(function (s) { return s.extraAccident; }), 2000000000)
    + jumlah(function (s) { return s.extraAccidentFlex || 0; });
  out.tambahanTransportasi = Math.min(jumlah(function (s) { return s.transportasi || 0; }), 2000000000);
  out.tambahanLuarNegeri = jumlah(function (s) { return s.luarNegeri || 0; });
  out.tambahanHaji = jumlah(function (s) { return s.haji || 0; });
  out.totalMDTransportasi = out.totalMDKecelakaan + out.tambahanTransportasi;
  out.totalMDLuarNegeri = out.totalMD + out.tambahanLuarNegeri;
  out.totalMDHaji = out.totalMD + out.tambahanHaji;
  out.totalWakaf = jumlah(function (s) { return s.nilaiWakaf || 0; });
  out.totalTermLife = jumlah(function (s) { return s.termLife || 0; });
  out.maxTahun = aktif.length ? Math.max.apply(null, aktif.map(function (s) { return s.tahunCair; })) : 0;
  out.maxLamaBayar = aktif.length ? Math.max.apply(null, aktif.map(function (s) { return s.lamaBayar; })) : 0;
  out.ambangPenuh = out.maxTahun <= 25 ? out.maxTahun : out.maxLamaBayar;

  // Helper timeline yang mengikuti COMBO_Summary dan COMBO_FLEX Input & Summary.
  const berjalan = function (s, th) { return s.sah && th <= s.tahunCair; };
  const bayar = function (s, th) { return s.sah && th <= s.lamaBayar; };
  const akhir = function (s, th) { return s.sah && th === s.tahunCair; };
  const sum = function (daftar, fn) { return daftar.reduce(function (t, s) { return t + fn(s); }, 0); };
  const gspaBoosterPct = function (th) { return Math.min(1.5, Math.floor(th / 5) * 0.075); };
  const iFlexMD = function (s, th) {
    if (s.produk !== 'iFLEXYGUARD' || !berjalan(s, th)) return 0;
    const pct = th <= 5 ? 1 : (th <= 10 ? 1.5 : 2);
    // Persis formula COMBO_FLEX: RIP sebab apapun dikurangi Bonus 75 mulai usia 75.
    const bonus75 = (inp.usia + th - 1) >= 75 ? (s.bonus75 || 0) : 0;
    return s.up * pct - bonus75;
  };
  const baseMDNonGSPA = function (th) {
    return sum(aktif.filter(function (s) { return s.produk !== 'GSPA' && s.produk !== 'iFLEXYGUARD' && berjalan(s, th); }),
      function (s) { return s.mdBiasa; });
  };
  const gspaMD = function (th) {
    return sum(aktif.filter(function (s) { return s.produk === 'GSPA' && berjalan(s, th); }), function (s) {
      // Excel COMBO_Summary memakai D+E dan, untuk Wakaf, mengurangi Nilai Wakaf.
      return s.mdBiasa + s.up * gspaBoosterPct(th) - (s.nilaiWakaf || 0);
    });
  };
  const flexMD = function (th) {
    return sum(aktif.filter(function (s) { return s.produk === 'iFLEXYGUARD'; }), function (s) { return iFlexMD(s, th); });
  };

  out.timeline = [];
  for (let th = 1; th <= out.maxTahun; th++) {
    const berjalanSemua = aktif.filter(function (s) { return berjalan(s, th); });
    const jatuhTempo = aktif.filter(function (s) { return akhir(s, th); });
    const md = baseMDNonGSPA(th) + gspaMD(th) + flexMD(th);
    const premi = sum(aktif.filter(function (s) { return bayar(s, th); }), function (s) { return s.premiPerTahun; });
    const accidentNCP = Math.min(sum(aktif.filter(function (s) { return s.produk === 'New Cemerlang Prime' && berjalan(s, th); }), function (s) { return s.extraAccident; }), 2000000000);
    const accidentFlex = sum(aktif.filter(function (s) { return s.produk === 'iFLEXYGUARD' && berjalan(s, th); }), function (s) { return s.extraAccidentFlex || 0; });
    const gspaTransport = Math.min(sum(aktif.filter(function (s) { return s.produk === 'GSPA' && berjalan(s, th); }), function (s) { return s.transportasi || 0; }), 2000000000);
    const gspaLuar = sum(aktif.filter(function (s) { return s.produk === 'GSPA' && berjalan(s, th); }), function (s) { return s.luarNegeri || 0; });
    const gspaHaji = sum(aktif.filter(function (s) { return s.produk === 'GSPA' && berjalan(s, th); }), function (s) { return s.haji || 0; });
    const ci = sum(aktif.filter(function (s) { return s.produk !== 'GSPA' && s.produk !== 'iFLEXYGUARD' && berjalan(s, th); }), function (s) { return s.totalCI; });
    const angioplasty = Math.min(sum(aktif.filter(function (s) { return s.produk !== 'GSPA' && s.produk !== 'iFLEXYGUARD' && berjalan(s, th); }), function (s) { return s.angioplasty; }), 200000000);
    const pencairanPolis = sum(jatuhTempo.filter(function (s) { return s.produk !== 'iFLEXYGUARD'; }), function (s) { return s.akhirKontrak; });
    const flexAkhir = sum(aktif.filter(function (s) { return s.produk === 'iFLEXYGUARD' && th === s.tahunCair; }), function (s) { return s.akhirKontrak; });
    const pencairan = pencairanPolis + flexAkhir;
    const upTersisa = sum(aktif.filter(function (s) { return s.produk !== 'iFLEXYGUARD' ? th < s.tahunCair : th <= s.tahunCair; }), function (s) { return s.up; });
    const jatuhCount = jatuhTempo.length;
    let keterangan = jatuhCount ? jatuhCount + ' polis jatuh tempo / cair' : '';
    const flex = aktif.find(function (s) { return s.produk === 'iFLEXYGUARD'; });
    if (flex && inp.usia + th - 1 === 75) keterangan = keterangan ? keterangan + ' | Bonus 75 cair' : 'Bonus 75 cair';
    if (flex && inp.usia + th - 1 === 99) keterangan = keterangan ? keterangan + ' | Akhir masa asuransi' : 'Akhir masa asuransi';
    out.timeline.push({
      tahun: th,
      usia: inp.usia + th - 1,
      premi: premi,
      booster: sum(aktif.filter(function (s) { return s.produk === 'GSPA' && berjalan(s, th); }), function (s) { return s.up * gspaBoosterPct(th); }),
      mdBiasa: md,
      mdKecelakaan: md + accidentNCP + accidentFlex,
      mdTransportasi: md + accidentNCP + accidentFlex + gspaTransport,
      mdLuarNegeri: md + gspaLuar,
      mdHaji: md + gspaHaji,
      wakaf: sum(aktif.filter(function (s) { return s.produk === 'GSPA' && berjalan(s, th); }), function (s) { return s.nilaiWakaf || 0; }),
      ci: ci,
      angioplasty: angioplasty,
      pencairan: pencairan,
      upTersisa: upTersisa,
      jatuhTempo: jatuhCount,
      keterangan: keterangan,
      // iFLEXY-specific data retained for future rendering/AI export.
      bonus75: flex && inp.usia + th - 1 === 75 ? flex.bonus75 || 0 : 0,
      flexAccident: accidentFlex
    });
  }
  return out;
}

/* ============ Tampilan Kombinasi Produk ============ */




let oSlot = [
  { produk: 'New Cemerlang Prime', lamaBayar: 10, lamaLindung: 25, up: 1000000000,
    modeWakaf: 'Non Wakaf', nilaiWakaf: 0, persenWakaf: 0.4, pakaiWaiver: true },
];

function oBaruSlot(produk) {
  const mppLF = (typeof comboLFMasaBayar === 'function') ? comboLFMasaBayar() : [5];
  return { produk: produk,
           lamaBayar: produk === 'Lite Future' ? mppLF[0] : COMBO_BAYAR[produk][0],
           /* Usia pensiun hanya dipakai Lite Future; diambil dari daftar yang
              tarifnya benar-benar tersedia untuk masa bayar itu. */
           usiaPensiun: produk === 'Lite Future'
             ? (comboLFUsiaPensiun(mppLF[0])[1] || comboLFUsiaPensiun(mppLF[0])[0])
             : null,
           lamaLindung: produk === 'BSL' ? 100 : 25, up: 1000000000,
           modeWakaf: 'Non Wakaf', nilaiWakaf: 0, persenWakaf: 0.4,
           /* Rider Waiver Gen Aman. Hanya berlaku untuk slot GSPA; slot
              produk lain mengabaikannya. Default diambil, sesuai keputusan
              bahwa pembebasan kontribusi adalah bagian utama nilai jualnya. */
           pakaiWaiver: true };
}

/* Menyesuaikan usia pensiun slot Lite Future agar selalu berada di dalam
   daftar yang benar-benar tersedia untuk usia nasabah dan masa bayar saat ini.
   Dipanggil setiap kali masa bayar, produk, tanggal lahir, atau jenis kelamin
   berubah — karena keempatnya mengubah daftar pilihannya. */
function oSesuaikanPensiunLF(i) {
  const sl = oSlot[i];
  if (!sl || sl.produk !== 'Lite Future') return;
  let usia = null;
  try { const t = el('oTgl') && el('oTgl').value; if (t) usia = usiaGenerali(t); } catch (_) {}
  let jk = 'PRIA';
  try { jk = nilaiSegmen('oJK') || 'PRIA'; } catch (_) {}
  const daftarBayar = comboLFMasaBayarUntuk(usia, jk);
  if (daftarBayar.length && daftarBayar.indexOf(Number(sl.lamaBayar)) < 0) {
    sl.lamaBayar = daftarBayar[0];
  }
  const daftar = comboLFUsiaPensiun(sl.lamaBayar, usia, jk);
  if (!daftar.length) { sl.usiaPensiun = null; return; }
  if (daftar.indexOf(Number(sl.usiaPensiun)) < 0) {
    sl.usiaPensiun = daftar[1] || daftar[0];
  }
}

function oSesuaikanSemuaPensiunLF() {
  oSlot.forEach(function (_, i) { oSesuaikanPensiunLF(i); });
}

function oGambarDaftar() {
  /* Usia nasabah dipakai untuk menyaring pilihan Lite Future. Kalau tanggal
     lahir belum diisi, penyaringan dilewati dan seluruh pilihan ditampilkan —
     comboSlot tetap menolak kombinasi yang tarifnya tidak ada. */
  const oUsiaNasabah = (function(){
    try{
      const t = el('oTgl') && el('oTgl').value;
      if(!t) return null;
      return usiaGenerali(t);
    }catch(_){ return null; }
  })();
  const oJkNasabah = (function(){ try{ return nilaiSegmen('oJK') || 'PRIA'; }catch(_){ return 'PRIA'; } })();
  el('oDaftar').innerHTML = oSlot.map((x, i) => {
    const bsl = x.produk === 'BSL';
    const gspa = x.produk === 'GSPA';
    const flex = x.produk === 'iFLEXYGUARD';
    const adaLindung = !gspa && !flex;
    // GSPA dan iFLEXYGUARD hanya boleh satu slot, mengikuti aturan file Excel
    const terpakai = oSlot.map((y, j) => j !== i ? y.produk : null);
    /* Produk bertanda tunggal hanya boleh muncul sekali di seluruh slot. */
    const pilihanProduk = COMBO_PRODUK.filter(pr =>
      COMBO_PRODUK_TUNGGAL.indexOf(pr) < 0 || terpakai.indexOf(pr) < 0 || pr === x.produk);
    return `
    <div class="blok" style="margin-bottom:10px;background:#FBFAF7">
      <div class="baris satu">
        <div><label for="op${i}">Polis ${i + 1}</label>
          <select id="op${i}" data-i="${i}" data-f="produk">
            ${pilihanProduk.map(pr => '<option' + (pr === x.produk ? ' selected' : '') + '>'
              + pr + '</option>').join('')}
          </select></div>
      </div>
      <div class="baris">
        <div><label for="ob${i}">Lama bayar</label>
          <select id="ob${i}" data-i="${i}" data-f="lamaBayar">
            ${(x.produk === 'Lite Future'
                ? (comboLFMasaBayarUntuk(oUsiaNasabah, oJkNasabah).length
                    ? comboLFMasaBayarUntuk(oUsiaNasabah, oJkNasabah) : comboLFMasaBayar())
                : COMBO_BAYAR[x.produk])
              .map(v => '<option value="' + v + '"'
              + (v === x.lamaBayar ? ' selected' : '') + '>' + v + ' tahun</option>').join('')}
          </select></div>
        ${x.produk === 'Lite Future' ? `
        <div><label for="oup${i}">Usia pensiun</label>
          <select id="oup${i}" data-i="${i}" data-f="usiaPensiun">
            ${(function(){
                const daftar = comboLFUsiaPensiun(x.lamaBayar, oUsiaNasabah, oJkNasabah);
                if(!daftar.length) return '<option value="">— tidak tersedia untuk usia ini —</option>';
                return daftar.map(v => '<option value="' + v + '"'
                  + (v === Number(x.usiaPensiun) ? ' selected' : '') + '>Usia ' + v + '</option>').join('');
              })()}
          </select></div>
        ` : `
        <div><label for="ol${i}">Lama lindung</label>
          <select id="ol${i}" data-i="${i}" data-f="lamaLindung"
                  ${adaLindung && !bsl ? '' : 'disabled'}>
            ${(bsl ? [100] : (adaLindung ? [15, 20, 25] : [99])).map(v =>
              '<option value="' + v + '"' + (v === x.lamaLindung ? ' selected' : '') + '>'
              + (v === 100 ? 'Sampai usia 100' : (v === 99 ? 'Sampai usia 100' : v + ' tahun'))
              + '</option>').join('')}
          </select></div>
        `}
      </div>
      <div class="baris satu">
        <div><label for="ou${i}">${gspa ? 'UP Dasar' : 'Uang pertanggungan'}</label>
          <input id="ou${i}" data-i="${i}" data-f="up" type="text" inputmode="numeric"
                 value="${x.up.toLocaleString('id-ID')}" autocomplete="off"></div>
      </div>
      ${gspa ? `
      <div class="baris">
        <div><label for="ow${i}">Mode wakaf</label>
          <select id="ow${i}" data-i="${i}" data-f="modeWakaf">
            <option${x.modeWakaf === 'Non Wakaf' ? ' selected' : ''}>Non Wakaf</option>
            <option${x.modeWakaf === 'Wakaf' ? ' selected' : ''}>Wakaf</option>
          </select></div>
        ${x.produk === 'GSPA' ? `
        <div><label for="orw${i}">Rider Waiver Gen Aman</label>
          <select id="orw${i}" data-i="${i}" data-f="pakaiWaiver">
            <option value="1"${x.pakaiWaiver !== false ? ' selected' : ''}>Ambil</option>
            <option value="0"${x.pakaiWaiver === false ? ' selected' : ''}>Tidak</option>
          </select>
          <p class="catatan">Membebaskan kontribusi dasar bila peserta terdiagnosa penyakit kritis.</p></div>
        ` : ''}
        <div><label for="oq${i}">Persentase wakaf</label>
          <select id="oq${i}" data-i="${i}" data-f="persenWakaf"
                  ${x.modeWakaf === 'Wakaf' ? '' : 'disabled'}>
            ${[10, 15, 20, 25, 30, 35, 40, 45].map(v => '<option value="' + (v / 100) + '"'
              + (Math.abs(x.persenWakaf - v / 100) < 1e-9 ? ' selected' : '') + '>'
              + v + '%</option>').join('')}
          </select></div>
      </div>
      <div class="baris satu">
        <div><label for="ov${i}">Nilai yang diwakafkan</label>
          <input id="ov${i}" data-i="${i}" data-f="nilaiWakaf" type="text" inputmode="numeric"
                 value="${x.nilaiWakaf.toLocaleString('id-ID')}" autocomplete="off"
                 ${x.modeWakaf === 'Wakaf' ? '' : 'disabled'}></div>
      </div>` : ''}
      ${oSlot.length > 1
        ? '<button type="button" class="sakelar" data-hapus="' + i + '">Hapus polis ini</button>'
        : ''}
    </div>`;
  }).join('');

  el('oDaftar').querySelectorAll('input, select').forEach(k =>
    k.addEventListener('input', () => {
      const i = +k.dataset.i, f = k.dataset.f;
      if (f === 'up' || f === 'nilaiWakaf') {
        const n = bAngka(k.value);
        k.value = n ? n.toLocaleString('id-ID') : '';
        oSlot[i][f] = n;
        oHitung();
      } else if (f === 'usiaPensiun') {
        oSlot[i].usiaPensiun = +k.value;
        oHitung();
      } else if (f === 'pakaiWaiver') {
        /* Sakelar waiver hanya mengubah premi, tidak mengubah struktur kartu,
           jadi cukup hitung ulang tanpa menggambar ulang daftarnya. */
        oSlot[i].pakaiWaiver = k.value === '1';
        oHitung();
      } else if (f === 'produk' || f === 'modeWakaf') {
        oSlot[i][f] = k.value;
        if (f === 'produk') {
          const pr = k.value;
          oSlot[i].lamaLindung = pr === 'BSL' ? 100
            : (pr === 'GSPA' || pr === 'iFLEXYGUARD') ? 99
            : ([15, 20, 25].indexOf(oSlot[i].lamaLindung) >= 0 ? oSlot[i].lamaLindung : 25);
          const daftarBayar = pr === 'Lite Future' ? comboLFMasaBayar() : COMBO_BAYAR[pr];
          if (daftarBayar.indexOf(oSlot[i].lamaBayar) < 0) {
            oSlot[i].lamaBayar = daftarBayar[0];
          }
          if (pr === 'Lite Future') {
            oSesuaikanPensiunLF(i);
          } else {
            oSlot[i].usiaPensiun = null;
          }
        }
        oGambarDaftar(); oHitung();
      } else if (f === 'persenWakaf') {
        oSlot[i][f] = +k.value; oHitung();
      } else if (f === 'lamaBayar' && oSlot[i].produk === 'Lite Future') {
        /* Usia pensiun yang tersedia berbeda tiap masa bayar, jadi daftarnya
           diperiksa ulang dan kartunya digambar ulang. */
        oSlot[i].lamaBayar = +k.value;
        oSesuaikanPensiunLF(i);
        oGambarDaftar(); oHitung();
      } else {
        oSlot[i][f] = +k.value; oHitung();
      }
    }));
  el('oDaftar').querySelectorAll('[data-hapus]').forEach(b =>
    b.addEventListener('click', () => {
      oSlot.splice(+b.dataset.hapus, 1);
      oGambarDaftar(); oHitung();
    }));
}
oGambarDaftar();

// Combo summary button: the summary is already rendered by oHitung().
// This button only needs to open the existing COMBO_RINGKAS screen.
if (el('oTblRingkas')) {
  el('oTblRingkas').type = 'button';
  el('oTblRingkas').addEventListener('click', () => {
    oHitung();
    bukaLayar('COMBO_RINGKAS');
  });
}

el('oTambah').addEventListener('click', () => {
  if (oSlot.length >= 9) return;
  const adaGSPA = oSlot.some(x => x.produk === 'GSPA');
  const pilih = adaGSPA ? 'Cristal Prime' : 'Cristal Prime';
  oSlot.push(oBaruSlot(pilih));
  oGambarDaftar(); oHitung();
});
['oNama', 'oTgl', 'oAgenNama', 'oAgenHP'].forEach(id =>
  el(id).addEventListener('input', () => {
    /* Tanggal lahir mengubah daftar masa bayar dan usia pensiun yang tersedia
       untuk Lite Future, jadi kartunya perlu digambar ulang. */
    if (id === 'oTgl') { oSesuaikanSemuaPensiunLF(); oGambarDaftar(); }
    oHitung();
  }));
['oJK', 'oMetode'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  if (id === 'oJK') { oSesuaikanSemuaPensiunLF(); oGambarDaftar(); }
  oHitung();
}));

/* Tabel pembebasan premi Waiver Gen Aman untuk layar Kombinasi.
   Dibangun dari hasil tiap slot, memakai premi dasar TANPA waiver sebagai
   dasar perhitungan — premi waiver sendiri tidak ikut dibebaskan karena
   ridernya berakhir begitu klaim disetujui. */
function oTabelWaiverKombinasi(hasil){
  try{
    const daftar = (hasil && Array.isArray(hasil.aktif)) ? hasil.aktif : [];
    /* Slot GSPA yang memakai waiver, DAN slot Lite Future yang waivernya
       wajib. Keduanya membebaskan premi dasar yang belum dibayar. */
    const w = daftar.filter(o => o && o.sah && o.dasarPerTahunTanpaWaiver > 0
      && (o.waiverSah || o.waiverWajib));
    if(!w.length) return '';
    return w.map(function(o){
      const mpp = Number(o.lamaBayar) || 0;
      if(mpp < 2) return '';
      let baris = '';
      for(let th = 1; th < mpp; th++){
        const sisa = mpp - th;
        baris += '<tr><td>Tahun ke-' + th + '</td>'
          + '<td class="kanan angka">' + sisa + ' tahun</td>'
          + '<td class="kanan angka">' + rp(Math.round(o.dasarPerTahunTanpaWaiver * sisa)) + '</td></tr>';
      }
      return '<div class="blok"><h3>Bila terdiagnosa penyakit kritis — ' + esc(o.kode || 'Gen Aman') + '</h3>'
        + '<p class="catatan">Premi dasar yang BELUM dibayar dibebaskan sampai akhir masa bayar. '
        + 'Sisa masa bayar dihitung setelah premi tahun berjalan dibayar. Premi waiver '
        + 'sendiri tidak ikut dibebaskan karena rider berakhir begitu klaim disetujui.'
        + (o.waiverWajib ? ' Rider waiver pada BeSMART Lite Future bersifat wajib dan preminya sudah termasuk setoran.' : '')
        + '</p>'
        + '<div class="gulir"><table class="tahunan">'
        + '<thead><tr><th>Kejadian pada</th><th class="kanan">Sisa masa bayar</th>'
        + '<th class="kanan">Kontribusi dasar yang dibebaskan</th></tr></thead><tbody>'
        + baris + '</tbody></table></div></div>';
    }).join('');
  }catch(_){ return ''; }
}

function oHitung() {
  oAturan();
  const tgl = el('oTgl').value;
  const bersih = () => {
    ['oIdentitas', 'oKotakRingkas', 'oTabelSlot', 'oTabelManfaat', 'oTabelTimeline',
     'oTabelSkenario', 'oKakiAgen'].forEach(i => el(i).innerHTML = '');
    ['oSangkalan', 'oCatatanSlot', 'oCatatanManfaat', 'oCatatanTimeline', 'oCatatanSkenario']
      .forEach(i => el(i).textContent = '');
  };

  if (!tgl) {
    el('oInfoUsia').textContent = 'Isi tanggal lahir untuk menghitung usia.';
    el('oHasil').innerHTML = '<div class="peringatan">Isi tanggal lahir lebih dulu.</div>';
    bersih(); return;
  }

  const metode = nilaiSegmen('oMetode');
  const inp = {
    usia: usiaDari(new Date(tgl + 'T00:00:00Z')),
    jk: nilaiSegmen('oJK'), metode: metode, tglLahir: tgl, slot: oSlot,
  };
  const r = comboHitung(inp, COMBO_TARIF);
  /* Disimpan supaya penyusun ringkasan gabungan bisa membaca hasil tiap
     slot — termasuk nilai waiver Gen Aman — tanpa menghitung ulang. */
  window.__comboHasilTerakhir = r;
  if (el('oWaiverBlok')) el('oWaiverBlok').innerHTML = oTabelWaiverKombinasi(r);

  // Benefit flags are calculated before rendering so the summary/timeline can
  // safely hide columns that do not exist in the selected program.
  const activeProducts = r.aktif.map(function(s){ return s.produk; });
  const hasProduct = function(p){ return activeProducts.indexOf(p) >= 0; };
  const hasCI = r.aktif.some(function(s){ return (s.totalCI || 0) > 0; });
  const hasAngio = r.aktif.some(function(s){ return (s.angioplasty || 0) > 0; });
  const hasWakaf = r.aktif.some(function(s){ return (s.nilaiWakaf || 0) > 0; });
  const hasAccidentUmum = hasProduct('New Cemerlang Prime') || hasProduct('iFLEXYGUARD');
  const hasTransport = hasProduct('GSPA');
  const hasLuar = hasProduct('GSPA');
  const hasHaji = hasProduct('GSPA');
  const hasBonus75 = hasProduct('iFLEXYGUARD');
  const hasPencairan = r.aktif.some(function(s){ return (s.akhirKontrak || 0) > 0; });

  const satuan = metode === 'Bulanan' ? 'bulan' : 'tahun';
  el('oInfoUsia').textContent = 'Usia ' + inp.usia + ' tahun'
    + (el('oNama').value ? ' \u2022 ' + el('oNama').value : '');

  const gagal = r.slot.filter(x => !x.sah);
  const adaGSPA = r.aktif.some(x => x.produk === 'GSPA');
  const pesanGagal = gagal.map(x => '<div class="peringatan">Polis '
    + (r.slot.indexOf(x) + 1) + ' (' + esc(x.produk || 'belum dipilih') + '): '
    + esc(x.status) + '</div>').join('');
  const totalPremiTahunanTampil = metode === 'Bulanan'
    ? r.totalBulanan * 12
    : r.totalTahunan;

  if (!r.aktif.length) {
    el('oHasil').innerHTML = pesanGagal
      || '<div class="peringatan">Belum ada polis yang bisa dihitung.</div>';
    bersih(); return;
  }

  el('oHasil').innerHTML = pesanGagal
    + '<div class="sorotan"><div class="k">Total yang dibayar nasabah</div>'
    + '<div class="v angka">' + rp(r.totalMetode) + ' <small>/' + satuan + '</small></div>'
    + '<div class="t">' + r.aktif.length + ' polis digabung. Total sampai seluruh masa '
    + 'bayar selesai ' + rp(r.totalDibayar) + '.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Total premi per bulan</div>'
    + '<div class="v angka">' + rp(r.totalBulanan) + '</div></div>'
    + '<div class="kartu"><div class="k">Total premi per tahun</div>'
    + '<div class="v angka">' + rp(totalPremiTahunanTampil) + '</div></div>'
    + '<div class="kartu"><div class="k">Meninggal sebab apa pun</div>'
    + '<div class="v angka">' + rp(r.totalMD) + '</div></div>'
    + '<div class="kartu"><div class="k">Meninggal karena kecelakaan</div>'
    + '<div class="v angka">' + rp(r.totalMDKecelakaan) + '</div></div>'
    + (adaGSPA
      ? '<div class="kartu"><div class="k">Kecelakaan transportasi umum</div>'
        + '<div class="v angka">' + rp(r.totalMDTransportasi) + '</div></div>'
        + '<div class="kartu"><div class="k">Meninggal di luar negeri</div>'
        + '<div class="v angka">' + rp(r.totalMDLuarNegeri) + '</div></div>'
        + '<div class="kartu penuh"><div class="k">Meninggal saat haji atau umrah</div>'
        + '<div class="v angka">' + rp(r.totalMDHaji) + '</div>'
        + (r.totalWakaf > 0
          ? '<div class="k" style="margin-top:6px">UP yang diwakafkan <b>'
            + rp(r.totalWakaf) + '</b> dari Term Life <b>' + rp(r.totalTermLife)
            + '</b>.</div>' : '')
        + '</div>'
      : '')
    + (r.totalCI > 0
      ? '<div class="kartu"><div class="k">Manfaat penyakit kritis</div>'
        + '<div class="v angka">' + rp(r.totalCI) + '</div></div>'
        + '<div class="kartu"><div class="k">Manfaat Angioplasty</div>'
        + '<div class="v angka">' + rp(r.totalAngioplasty) + '</div></div>'
      : '')
    + '<div class="kartu penuh"><div class="k">Total dana kembali di akhir kontrak</div>'
    + '<div class="v angka">' + rp(r.totalAkhirKontrak) + '</div>'
    + '<div class="k" style="margin-top:6px">Selisih terhadap total premi yang dibayar: <b>'
    + rp(r.selisihAkhir) + '</b>' + (r.selisihAkhir >= 0 ? ' lebih besar.' : '.')
    + '</div></div></div>';

  // ---------- ringkasan untuk nasabah ----------
  el('oIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(el('oNama').value || '\u2014') + '</b></div>'
    + '<div>Usia<b>' + inp.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + '<div>Metode bayar<b>' + metode + '</b></div>';

  // Ringkasan kombinasi harus terasa sebagai SATU PROGRAM, bukan daftar
  // masa bayar per produk. Jika semua masa bayar sama, tampilkan satu masa
  // bayar seperti biasa. Jika berbeda, pecah premi berdasarkan titik perubahan
  // masa bayar dan jumlahkan hanya komponen yang masih membayar pada periode itu.
  const titikBayarCombo = Array.from(new Set(r.aktif.map(function(s){ return Number(s.lamaBayar); })))
    .filter(function(v){ return v > 0; }).sort(function(a,b){ return a-b; });
  const comboSemuaSama = titikBayarCombo.length <= 1;
  const comboPeriodeBayar = titikBayarCombo.map(function(akhir, i){
    const mulai = i === 0 ? 1 : titikBayarCombo[i - 1] + 1;
    const premiTahun = r.aktif.reduce(function(t, s){
      return t + (s.lamaBayar >= mulai ? s.premiPerTahun : 0);
    }, 0);
    const premiTampil = metode === 'Bulanan' ? premiTahun / 12 : premiTahun;
    return { mulai: mulai, akhir: akhir, premi: premiTampil };
  });
  const comboPremiRingkas = '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.totalMetode) + '</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">'
    + (r.maxLamaBayar || 0) + ' tahun</div></div>';
  const comboLamaRingkas = comboSemuaSama
    ? ''
    : '<div class="kartu penuh"><div class="k">Rincian premi berdasarkan masa bayar</div>'
      + '<div class="v" style="font-size:1rem;line-height:1.65">'
      + comboPeriodeBayar.map(function(x){
          return '<div><b>Premi per ' + satuan + ', Tahun ' + x.mulai + (x.mulai === x.akhir ? '' : '–' + x.akhir)
            + ':</b> ' + rp(x.premi) + '</div>';
        }).join('')
      + '</div></div>';

  el('oKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + comboPremiRingkas
    + comboLamaRingkas
    + '<div class="kartu"><div class="k">Total sampai lunas</div>'
    + '<div class="v angka">' + rp(r.totalDibayar) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Perlindungan meninggal sebab apa pun</div>'
    + '<div class="v angka">' + rp(r.totalMD) + '</div>'
    + '<div class="k" style="margin-top:6px">Karena kecelakaan menjadi <b>'
    + rp(r.totalMDKecelakaan) + '</b>'
    + (r.totalCI > 0 ? ', penyakit kritis <b>' + rp(r.totalCI) + '</b>' : '')
    + '.</div></div>'
    + '<div class="kartu penuh"><div class="k">Dana kembali di akhir kontrak</div>'
    + '<div class="v angka">' + rp(r.totalAkhirKontrak) + '</div>'
    + '<div class="k" style="margin-top:6px">Lebih besar <b>' + rp(r.selisihAkhir)
    + '</b> dari total premi yang dibayarkan.</div></div></div>';

  // Ringkasan kombinasi mengikuti struktur COMBO_Summary Excel.
  // Input/engine produk tidak diubah; yang disamakan di sini adalah hasil summary.
  el('oTabelSlot').innerHTML =
    '<thead><tr><th>Slot</th><th>Produk</th><th>Plan</th><th class="kanan">UP</th>'
    + '<th class="kanan">Premi</th><th class="kanan">MD Biasa</th><th class="kanan">MD Kecelakaan</th>'
    + '<th class="kanan">CI</th><th class="kanan">Angioplasty</th><th class="kanan">Akhir Kontrak</th><th>Status</th></tr></thead><tbody>'
    + r.slot.map((x, i) => x.sah
      ? '<tr class="bayar"><td>' + (i + 1) + '</td><td>' + esc(x.produk) + '</td>'
        + '<td>' + esc(x.kode) + '</td><td class="kanan angka">' + rp(x.up) + '</td>'
        + '<td class="kanan angka">' + rp(x.premiMetode) + '</td>'
        + '<td class="kanan angka">' + rp(x.mdBiasa) + '</td>'
        + '<td class="kanan angka">' + rp(x.mdKecelakaan) + '</td>'
        + '<td class="kanan angka">' + (x.totalCI ? rp(x.totalCI) : '—') + '</td>'
        + '<td class="kanan angka">' + (x.angioplasty ? rp(x.angioplasty) : '—') + '</td>'
        + '<td class="kanan angka">' + rp(x.akhirKontrak) + '</td><td>Valid</td></tr>'
      : '<tr><td>' + (i + 1) + '</td><td>' + esc(x.produk || '—') + '</td>'
        + '<td colspan="8">' + esc(x.status) + '</td><td>' + esc(x.status) + '</td></tr>').join('')
    + '<tr class="tandai"><td colspan="4">Total</td><td class="kanan angka">' + rp(r.totalMetode)
    + '</td><td class="kanan angka">' + rp(r.totalMD) + '</td><td class="kanan angka">' + rp(r.totalMDKecelakaan)
    + '</td><td class="kanan angka">' + (r.totalCI ? rp(r.totalCI) : '—') + '</td><td class="kanan angka">'
    + (r.totalAngioplasty ? rp(r.totalAngioplasty) : '—') + '</td><td class="kanan angka">' + rp(r.totalAkhirKontrak)
    + '</td><td>—</td></tr></tbody>';
  el('oCatatanSlot').textContent = 'Setiap slot dihitung sendiri. Status yang tidak valid tidak masuk total summary/timeline, sesuai aturan COMBO_Summary.';

  // Summary benefit dinamis: hanya benefit yang benar-benar ada di program yang dipilih.
  const benefitRows = [];
  benefitRows.push('<tr><td>Meninggal sebab apa pun</td><td class="kanan angka">' + rp(r.totalMD) + '</td><td>Total manfaat meninggal sesuai timeline</td></tr>');
  if(hasAccidentUmum) benefitRows.push('<tr><td>Meninggal karena kecelakaan umum</td><td class="kanan angka">' + rp(r.totalMDKecelakaan) + '</td><td>Tambahan kecelakaan sesuai produk yang dipilih</td></tr>');
  if(hasTransport) benefitRows.push('<tr><td>Meninggal kecelakaan transportasi umum</td><td class="kanan angka">' + rp(r.totalMDTransportasi) + '</td><td>Tambahan manfaat Gen Aman</td></tr>');
  if(hasLuar) benefitRows.push('<tr><td>Meninggal di luar negeri</td><td class="kanan angka">' + rp(r.totalMDLuarNegeri) + '</td><td>Tambahan manfaat Gen Aman</td></tr>');
  if(hasHaji) benefitRows.push('<tr><td>Meninggal saat haji / umrah</td><td class="kanan angka">' + rp(r.totalMDHaji) + '</td><td>Tambahan manfaat Gen Aman</td></tr>');
  if(hasWakaf) benefitRows.push('<tr><td>UP yang diwakafkan</td><td class="kanan angka">' + rp(r.totalWakaf) + '</td><td>Dari polis wakaf yang dipilih</td></tr>');
  if(hasCI) benefitRows.push('<tr><td>Penyakit kritis</td><td class="kanan angka">' + rp(r.totalCI) + '</td><td>Total CI dari polis yang dipilih</td></tr>');
  if(hasAngio) benefitRows.push('<tr><td>Angioplasty</td><td class="kanan angka">' + rp(r.totalAngioplasty) + '</td><td>Total manfaat sesuai batas gabungan</td></tr>');
  if(hasBonus75) {
    const flexBonus = r.aktif.filter(function(s){return s.produk==='iFLEXYGUARD';})
      .reduce(function(t,s){return t+(s.bonus75||0);},0);
    benefitRows.push('<tr><td>Bonus 75 iFLEXYGUARD</td><td class="kanan angka">' + rp(flexBonus) + '</td><td>50% dari UP dasar iFLEXYGUARD yang dibeli di awal, dibayarkan saat usia 75</td></tr>');
  }
  if(hasPencairan) benefitRows.push('<tr class="tandai"><td>Dana kembali / akhir kontrak</td><td class="kanan angka">' + rp(r.totalAkhirKontrak) + '</td><td>Manfaat akhir kontrak sesuai produk</td></tr>');

  el('oTabelManfaat').innerHTML =
    '<thead><tr><th>Manfaat</th><th class="kanan">Nilai</th><th>Dasar / aturan</th></tr></thead><tbody>'
    + benefitRows.join('') + '</tbody>';
  el('oCatatanManfaat').textContent = 'Summary mengikuti aturan agregasi COMBO_Summary: benefit sejenis digabung, cap gabungan tetap diterapkan, dan benefit produk berbeda tetap memiliki jalur masing-masing.';

  // Timeline dinamis. Kolom hanya ditampilkan bila benefit tersebut benar-benar
  // tersedia pada polis yang aktif. Kenaikan benefit iFLEXYGUARD ditampilkan di
  // nilai timeline, sementara UP pada alternatif tetap UP dasar yang di-input.
  const penting = r.timeline.filter(function(b){
    return b.tahun <= r.ambangPenuh || b.tahun % 5 === 0 ||
      b.pencairan > 0 || b.bonus75 > 0 || b.tahun === r.timeline.length;
  });

  const cols = [
    {key:'tahun', label:'Tahun Polis', val:function(b){return b.tahun;}, cls:''},
    {key:'usia', label:'Usia', val:function(b){return b.usia;}, cls:''},
    {key:'premi', label:'Premi Per Tahun', val:function(b){return b.premi ? rp(b.premi) : '—';}, cls:'kanan angka'},
    {key:'md', label:'Meninggal Sebab Apa Pun', val:function(b){return rp(b.mdBiasa);}, cls:'kanan angka'}
  ];
  if(hasAccidentUmum) cols.push({key:'mdKecelakaan', label:'Meninggal Karena Kecelakaan Umum', val:function(b){return rp(b.mdKecelakaan);}, cls:'kanan angka'});
  if(hasTransport) cols.push({key:'mdTransportasi', label:'Meninggal Kec. Transportasi Umum', val:function(b){return rp(b.mdTransportasi);}, cls:'kanan angka'});
  if(hasLuar) cols.push({key:'mdLuarNegeri', label:'Meninggal di Luar Negeri', val:function(b){return rp(b.mdLuarNegeri);}, cls:'kanan angka'});
  if(hasHaji) cols.push({key:'mdHaji', label:'Meninggal Saat Haji / Umrah', val:function(b){return rp(b.mdHaji);}, cls:'kanan angka'});
  if(hasWakaf) cols.push({key:'wakaf', label:'UP yang Diwakafkan', val:function(b){return b.wakaf ? rp(b.wakaf) : '—';}, cls:'kanan angka'});
  if(hasCI) cols.push({key:'ci', label:'Penyakit Kritis', val:function(b){return b.ci ? rp(b.ci) : '—';}, cls:'kanan angka'});
  if(hasAngio) cols.push({key:'angioplasty', label:'Angioplasty', val:function(b){return b.angioplasty ? rp(b.angioplasty) : '—';}, cls:'kanan angka'});
  if(hasBonus75) cols.push({key:'bonus75', label:'Bonus 75', val:function(b){return b.bonus75 ? rp(b.bonus75) : '—';}, cls:'kanan angka'});
  if(hasPencairan) cols.push({key:'pencairan', label:'Pencairan Sehat / Akhir Kontrak', val:function(b){return b.pencairan ? rp(b.pencairan) : '—';}, cls:'kanan angka'});
  cols.push({key:'upTersisa', label:'UP Aktif Tersisa', val:function(b){return b.upTersisa ? rp(b.upTersisa) : '—';}, cls:'kanan angka'});
  cols.push({key:'keterangan', label:'Keterangan', val:function(b){return esc(b.keterangan || '');}, cls:''});

  el('oTabelTimeline').innerHTML =
    '<thead><tr>' + cols.map(function(c){
      return '<th class="' + (c.cls && c.cls.indexOf('kanan')>=0 ? 'kanan' : '') + '">' + c.label + '</th>';
    }).join('') + '</tr></thead><tbody>' +
    penting.map(function(b){
      const marked = b.pencairan > 0 || b.bonus75 > 0;
      return '<tr class="' + (b.premi ? 'bayar ' : '') + (marked ? 'tandai' : '') + '">' +
        cols.map(function(c){ return '<td class="' + (c.cls||'') + '">' + c.val(b) + '</td>'; }).join('') +
        '</tr>';
    }).join('') + '</tbody>';

  el('oCatatanTimeline').textContent =
    'Timeline dinamis mengikuti benefit yang benar-benar tersedia pada produk yang dipilih. ' +
    'Kolom yang tidak relevan disembunyikan. Benefit yang sejenis tetap digabung. ' +
    'Untuk iFLEXYGUARD, Bonus 75 adalah 50% dari UP dasar awal dan ditampilkan sebagai peristiwa terpisah pada usia 75; ' +
    'kenaikan manfaat 150%/200% tetap terlihat pada kolom Meninggal Sebab Apa Pun sesuai tahun polis.';
  // Excel COMBO_Summary tidak memakai tabel skenario terpisah; semua skenario GSPA masuk
  // ke kolom timeline. Kita kosongkan blok lama agar summary tidak menggandakan informasi.
  el('oTabelSkenario').innerHTML = '';
  el('oCatatanSkenario').textContent = '';
  const skenarioBlok = el('oTabelSkenario').closest('.blok');
  if (skenarioBlok) skenarioBlok.style.display = 'none';

  el('oSangkalan').textContent = 'Ilustrasi gabungan beberapa polis yang berdiri sendiri, '
    + 'dihitung dari tarif yang berlaku saat ini. Bukan bagian dari polis dan tidak '
    + 'mengikat secara hukum. Setiap polis tunduk pada Ketentuan Polis resmi PT Asuransi '
    + 'Jiwa Generali Indonesia dan hasil underwriting masing-masing.';

  const na = el('oAgenNama').value, hp = el('oAgenHP').value;
  el('oKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function oAturan() {
  el('oAturan').innerHTML =
  '<details><summary>Produk yang bisa dikombinasikan</summary><div class="isi"><ul>'
  + '<li>New Cemerlang Prime, Cristal Prime, dan BSL boleh dipakai berkali-kali dalam satu rencana.</li>'
  + '<li>GSPA dan iFLEXYGUARD hanya boleh satu polis, sama seperti aturan di file Excel.</li>'
  + '<li>Maksimal 9 polis dalam satu rencana.</li>'
  + '<li>Metode bayar berlaku untuk seluruh polis sekaligus, tidak bisa berbeda per polis.</li>'
  + '</ul></div></details>'

  + '<details><summary>Cara premi tiap produk dihitung</summary><div class="isi"><ul>'
  + '<li>New Cemerlang Prime memakai tarif per Rp1 miliar UP dan tidak membedakan pria atau wanita.</li>'
  + '<li>Cristal Prime dan BSL memakai tarif per Rp500 juta UP serta membedakan jenis kelamin.</li>'
  + '<li>GSPA memakai tarif per Rp100 juta UP Dasar, dipotong diskon menurut besar UP, dan premi wakaf tidak mendapat diskon.</li>'
  + '<li>iFLEXYGUARD punya tarif bulanan dan tarif tahunan sendiri, bukan sekadar dikali sebelas.</li>'
  + '<li>Untuk produk selain iFLEXYGUARD, premi tahunan dihitung sebelas kali premi bulanan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas yang berlaku gabungan</summary><div class="isi"><ul>'
  + '<li>Tambahan kecelakaan New Cemerlang Prime dibatasi Rp2 miliar untuk seluruh polis digabung.</li>'
  + '<li>Tambahan kecelakaan iFLEXYGUARD dihitung terpisah di luar batas tersebut, maksimal Rp1 miliar.</li>'
  + '<li>Manfaat Angioplasty dibatasi Rp200 juta untuk seluruh polis digabung.</li>'
  + '<li>Manfaat tambahan GSPA berlaku sendiri: luar negeri 10% UP maksimal Rp500 juta, transportasi umum 100% UP maksimal Rp2 miliar, haji atau umrah 100% UP maksimal Rp1 miliar.</li>'
  + '</ul></div></details>'

  + '<details><summary>Kombinasi yang ditolak</summary><div class="isi"><ul>'
  + '<li>New Cemerlang Prime 3 tahun bayar dengan 15 tahun lindung tidak tersedia.</li>'
  + '<li>BSL wajib berlindung sampai usia 100, jadi pilihannya dikunci.</li>'
  + '<li>BSL masa bayar 10 tahun perlu dihitung manual di iPropose dan tidak masuk ringkasan.</li>'
  + '<li>GSPA mode wakaf tidak tersedia untuk masa bayar 15 tahun.</li>'
  + '<li>UP tiap polis minimal Rp100.000.000.</li>'
  + '</ul></div></details>'

  + '<details><summary>Bedanya dengan kalkulator Gen Aman tersendiri</summary><div class="isi"><ul>'
  + '<li>Tangga diskon GSPA di file kombinasi ditulis langsung dan berbeda dari tabel diskon yang dipakai kalkulator Gen Aman tersendiri.</li>'
  + '<li>Di sini dipakai versi file kombinasi, supaya angkanya sama persis dengan Excel-mu.</li>'
  + '<li>Akibatnya untuk UP tertentu, misalnya Rp900 juta atau Rp1,6 miliar, diskonnya bisa berbeda dengan layar Gen Aman.</li>'
  + '<li>Kalau ingin keduanya disamakan, tinggal beri tahu tangga diskon mana yang benar.</li>'
  + '</ul></div></details>';
}

oHitung();


/* ============ Gen Pro (berdiri sendiri) ============ */
// Tabel premi Gen Pro sudah memuat diskon. Yang disimpan adalah tarif kotor
// per Rp1 miliar plus penanda UP mana yang tersedia; nilai yang dibulatkan
// berbeda di master disimpan terpisah sebagai koreksi. Seluruh 24.380 sel
// sudah dicocokkan kembali ke master, tanpa selisih.


function gproDiskon(up) {
  let d = 0;
  for (const [batas, nilai] of GPRO_DISKON) if (up >= batas) d = nilai;
  return d;
}

function gproPremi(kombinasi, jk, usia, indeksUP) {
  const a = DATA_GPRO.tarif[kombinasi];
  const b = a ? a[String(jk).toUpperCase()] : null;
  const baris = b ? b[String(usia)] : null;
  if (!baris) return null;
  const [kotor, mask] = baris;
  if (!((mask >> indeksUP) & 1)) return null;
  const kunci = String(usia) + ':' + indeksUP;
  const k = ((DATA_GPRO.koreksi[kombinasi] || {})[String(jk).toUpperCase()] || {})[kunci];
  if (k !== undefined) return k;
  const up = DATA_GPRO.up[indeksUP];
  return Math.round(kotor * (up / 1000000000) * (1 - gproDiskon(up)));
}

function gproHitung(inp) {
  const out = { sah: false, alasan: null };
  const kombinasi = (inp.paket || (inp.bayar + '-' + inp.lindung));
  out.kombinasi = kombinasi;
  if (!DATA_GPRO.tarif[kombinasi]) {
    out.alasan = 'Kombinasi Gen Pro ' + kombinasi + ' tidak tersedia.';
    return out;
  }
  const bulanan = gproPremi(kombinasi, inp.jk, inp.usia, inp.indeksUP);
  if (!bulanan) {
    out.alasan = 'Gen Pro ' + kombinasi + ' dengan UP ' + rp(DATA_GPRO.up[inp.indeksUP])
      + ' tidak tersedia untuk usia masuk ' + inp.usia + ' tahun.';
    return out;
  }

  const up = DATA_GPRO.up[inp.indeksUP];
  out.sah = true;
  out.up = up;
  out.diskon = gproDiskon(up);
  out.premiBulanan = bulanan;
  out.premiTahunan = bulanan * 11;                         // tertulis di master
  out.premiPerSetoran = inp.metode === 'Bulanan' ? out.premiBulanan : out.premiTahunan;
  out.premiPerTahun = inp.metode === 'Bulanan' ? out.premiBulanan * 12 : out.premiTahunan;
  out.totalDibayar = out.premiPerTahun * inp.bayar;

  // Empat manfaat bawaan, batasnya sama dengan Gen Aman
  out.meninggal = up;
  out.tambahanTransportasi = Math.min(up, 2000000000);
  out.tambahanLuarNegeri = Math.min(up * 0.1, 500000000);
  out.meninggalTransportasi = up + out.tambahanTransportasi;
  out.meninggalLuarNegeri = up + out.tambahanLuarNegeri;

  // Perlindungan: angka 70 ke atas berarti sampai usia itu; angka 20 berarti
  // 20 tahun sejak polis mulai, karena usia masuk bisa sampai 65 tahun.
  out.sampaiUsia = inp.lindung >= 70 ? inp.lindung : inp.usia + inp.lindung;
  out.lamaLindung = out.sampaiUsia - inp.usia;
  out.usiaAkhirBayar = inp.usia + inp.bayar;

  // Pembebasan premi: sisa kontribusi sejak kejadian sampai akhir masa bayar
  out.waiver = [];
  for (let th = 1; th <= inp.bayar; th++) {
    out.waiver.push({
      tahun: th, usia: inp.usia + th - 1,
      sudahDibayar: out.premiPerTahun * th,
      dibebaskan: out.premiPerTahun * (inp.bayar - th),
    });
  }

  out.timeline = [];
  for (let th = 1; th <= out.lamaLindung; th++) {
    out.timeline.push({
      tahun: th, usia: inp.usia + th - 1,
      premi: th <= inp.bayar ? out.premiPerTahun : 0,
      meninggal: up,
      transportasi: out.meninggalTransportasi,
      luarNegeri: out.meninggalLuarNegeri,
    });
  }
  return out;
}

// Paket diambil langsung dari database supaya agen tidak perlu menghafal
// kombinasi mana yang ada. Kombinasi yang tidak tersedia memang tidak muncul.
const GPRO_PAKET = Object.keys(DATA_GPRO.tarif).sort((a, b) => {
  const [ab, al] = a.split('-').map(Number), [bb, bl] = b.split('-').map(Number);
  return ab - bb || al - bl;
});

function gproLabel(paket) {
  const [bayar, lindung] = paket.split('-').map(Number);
  if (bayar === 70) {
    // 70-70 dan 70-90 adalah penamaan khusus di tabel premi: kontribusi
    // dibayar sampai usia 70, bukan selama 70 tahun.
    return paket + '  \u2014  bayar sampai usia 70, lindung sampai usia ' + lindung;
  }
  return paket + '  \u2014  bayar ' + bayar + ' tahun, '
    + (lindung >= 70 ? 'lindung sampai usia ' + lindung
      : 'lindung ' + lindung + ' tahun');
}

// Setiap kali usia atau jenis kelamin berubah, paket yang tidak tersedia
// untuk usia itu diberi keterangan supaya agen langsung tahu.
function qIsiPaket(usia, jk) {
  const terpilih = el('qPaket').value || '10-90';
  el('qPaket').innerHTML = GPRO_PAKET.map(k => {
    let ket = '';
    if (usia != null) {
      const b = DATA_GPRO.tarif[k][String(jk).toUpperCase()];
      if (!b || !b[String(usia)]) ket = '  (tidak tersedia untuk usia ' + usia + ')';
    }
    return '<option value="' + k + '"' + (k === terpilih ? ' selected' : '') + '>'
      + gproLabel(k) + ket + '</option>';
  }).join('');
}
qIsiPaket(null, 'PRIA');

el('qUP').innerHTML = DATA_GPRO.up.map((v, i) =>
  '<option value="' + i + '"' + (i === 2 ? ' selected' : '') + '>' + rp(v) + '</option>').join('');

['qNama', 'qTgl', 'qPaket', 'qUP', 'qAgenNama', 'qAgenHP'].forEach(id =>
  el(id).addEventListener('input', qGambar));
['qJK', 'qMetode'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  qGambar();
}));

function qGambar() {
  qAturan();
  const tgl = el('qTgl').value;
  const bersih = () => {
    ['qIdentitas', 'qKotakRingkas', 'qTabelManfaat', 'qTabelWaiver', 'qTabelTimeline',
     'qTabelUP', 'qKakiAgen'].forEach(i => el(i).innerHTML = '');
    ['qSangkalan', 'qCatatanManfaat', 'qCatatanWaiver', 'qCatatanTimeline', 'qCatatanUP']
      .forEach(i => el(i).textContent = '');
  };

  if (!tgl) {
    el('qInfoUsia').textContent = 'Isi tanggal lahir untuk menghitung usia.';
    el('qHasil').innerHTML = '<div class="peringatan">Isi tanggal lahir lebih dulu.</div>';
    bersih(); return;
  }

  const usiaKini = usiaDari(new Date(tgl + 'T00:00:00Z'));
  const jkKini = nilaiSegmen('qJK');
  qIsiPaket(usiaKini, jkKini);
  const paket = (el('qPaket').value || '10-90').split('-').map(Number);
  const lamaBayar = paket[0] === 70 ? Math.max(70 - usiaKini, 1) : paket[0];
  const inp = {
    usia: usiaKini, jk: jkKini, bayar: lamaBayar, lindung: paket[1],
    paket: el('qPaket').value || '10-90',
    indeksUP: +el('qUP').value, metode: nilaiSegmen('qMetode'),
  };
  const r = gproHitung(inp);
  const satuan = inp.metode === 'Bulanan' ? 'bulan' : 'tahun';
  el('qInfoUsia').textContent = 'Usia masuk ' + inp.usia + ' tahun'
    + (el('qNama').value ? ' \u2022 ' + el('qNama').value : '');

  // daftar UP yang tersedia pada usia dan kombinasi ini
  const tersedia = DATA_GPRO.up.map((v, i) => ({
    up: v, i: i, premi: gproPremi(r.kombinasi, inp.jk, inp.usia, i),
  }));
  el('qTabelUP').innerHTML = DATA_GPRO.tarif[r.kombinasi]
    ? '<thead><tr><th>Uang pertanggungan</th><th class="kanan">Diskon</th>'
      + '<th class="kanan">Premi bulanan</th><th class="kanan">Premi tahunan</th>'
      + '</tr></thead><tbody>'
      + tersedia.map(x =>
          '<tr class="' + (x.i === inp.indeksUP ? 'tandai' : '') + '">'
          + '<td>' + rp(x.up) + '</td>'
          + '<td class="kanan angka">' + Math.round(gproDiskon(x.up) * 100) + '%</td>'
          + '<td class="kanan angka">' + (x.premi ? rp(x.premi) : 'Tidak tersedia') + '</td>'
          + '<td class="kanan angka">' + (x.premi ? rp(x.premi * 11) : '\u2014')
          + '</td></tr>').join('')
      + '</tbody>'
    : '';
  el('qCatatanUP').textContent = 'Diskon premi sudah termasuk dalam angka di tabel ini, '
    + 'jadi tidak dipotong lagi: 20% mulai UP Rp1 miliar dan 30% mulai Rp2,5 miliar. '
    + 'Baris bertanda "Tidak tersedia" memang tidak ada di tabel premi resmi untuk usia '
    + 'masuk ' + inp.usia + ' tahun.';

  if (!r.sah) {
    el('qHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    bersih();
    el('qTabelUP').innerHTML = el('qTabelUP').innerHTML;
    return;
  }

  el('qHasil').innerHTML =
    '<div class="sorotan"><div class="k">Yang dibayar nasabah</div>'
    + '<div class="v angka">' + rp(r.premiPerSetoran) + ' <small>/' + satuan + '</small></div>'
    + '<div class="t">Selama ' + inp.bayar + ' tahun, sampai usia ' + r.usiaAkhirBayar
    + '. Total ' + rp(r.totalDibayar) + '. Perlindungan berjalan sampai usia '
    + r.sampaiUsia + '.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiPerSetoran) + '</div></div>'
    + '<div class="kartu"><div class="k">Manfaat meninggal</div>'
    + '<div class="v angka">' + rp(r.meninggal) + '</div></div>'
    + '<div class="kartu"><div class="k">Diskon yang sudah termasuk</div>'
    + '<div class="v angka">' + Math.round(r.diskon * 100) + '%</div></div>'
    + '<div class="kartu"><div class="k">Kecelakaan transportasi umum</div>'
    + '<div class="v angka">' + rp(r.meninggalTransportasi) + '</div></div>'
    + '<div class="kartu"><div class="k">Meninggal di luar Indonesia</div>'
    + '<div class="v angka">' + rp(r.meninggalLuarNegeri) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Pembebasan premi sudah termasuk</div>'
    + '<div class="v angka">Tanpa premi tambahan</div>'
    + '<div class="k" style="margin-top:6px">Bila terdiagnosa salah satu kondisi kritis '
    + 'yang dipertanggungkan, sisa premi sampai akhir masa bayar dibebaskan.</div>'
    + '</div></div>';

  // ---------- ringkasan ----------
  el('qSubKop').textContent = 'Perlindungan sampai usia ' + r.sampaiUsia
    + ', premi dibayar ' + inp.bayar + ' tahun, pembebasan premi sudah termasuk';

  el('qIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(el('qNama').value || '\u2014') + '</b></div>'
    + '<div>Usia masuk<b>' + inp.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + '<div>Plan<b>Gen Pro ' + r.kombinasi + '</b></div>';

  el('qKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiPerSetoran) + '</div></div>'
    + '<div class="kartu"><div class="k">' + (inp.metode === 'Bulanan' ? 'Premi per Tahun' : 'Premi Tahunan') + '</div>'
    + '<div class="v angka">' + rp(r.premiPerTahun) + '</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + inp.bayar + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Total selama masa bayar</div>'
    + '<div class="v angka">' + rp(r.totalDibayar) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Manfaat meninggal</div>'
    + '<div class="v angka">' + rp(r.meninggal) + '</div>'
    + '<div class="k" style="margin-top:6px">Setara <b>'
    + (r.meninggal / r.totalDibayar).toLocaleString('id-ID',
        { maximumFractionDigits: 1 }) + ' kali</b> total premi yang dibayar.</div>'
    + '</div></div>';

  el('qTabelManfaat').innerHTML =
    '<thead><tr><th>Manfaat</th><th class="kanan">Nilai</th><th>Dasar perhitungan</th>'
    + '</tr></thead><tbody>'
    + '<tr><td>Meninggal dunia</td>'
    + '<td class="kanan angka">' + rp(r.meninggal) + '</td>'
    + '<td>100% uang pertanggungan</td></tr>'
    + '<tr class="bayar"><td>Meninggal karena kecelakaan pada transportasi umum</td>'
    + '<td class="kanan angka">' + rp(r.meninggalTransportasi) + '</td>'
    + '<td>Ditambah 100% UP, maksimal Rp2 miliar</td></tr>'
    + '<tr class="bayar"><td>Meninggal di luar wilayah Indonesia</td>'
    + '<td class="kanan angka">' + rp(r.meninggalLuarNegeri) + '</td>'
    + '<td>Ditambah 10% UP, maksimal Rp500 juta</td></tr>'
    + '<tr class="tandai"><td>Pembebasan premi karena kondisi kritis</td>'
    + '<td class="kanan">Sudah termasuk</td>'
    + '<td>Tanpa premi rider terpisah</td></tr>'
    + '</tbody>';
  el('qCatatanManfaat').textContent = 'Keempat manfaat ini sudah melekat pada produk dan '
    + 'tidak ada premi rider terpisah. Batas Rp2 miliar dan Rp500 juta mengikuti ketentuan '
    + 'yang sama dengan Gen Aman.';

  el('qTabelWaiver').innerHTML =
    '<thead><tr><th>Kondisi kritis terjadi</th><th>Usia</th>'
    + '<th class="kanan">Sudah dibayar</th><th class="kanan">Sisa premi yang dibebaskan</th>'
    + '</tr></thead><tbody>'
    + r.waiver.map(x =>
        '<tr class="' + (x.tahun === 1 ? 'tandai' : '') + '">'
        + '<td>Setelah tahun ke-' + x.tahun + '</td><td>' + (x.usia + 1) + '</td>'
        + '<td class="kanan angka">' + rp(x.sudahDibayar) + '</td>'
        + '<td class="kanan angka">'
        + (x.dibebaskan ? rp(x.dibebaskan) : 'Masa bayar sudah selesai') + '</td></tr>')
        .join('')
    + '</tbody>';
  el('qCatatanWaiver').textContent = 'Bila peserta terdiagnosa salah satu kondisi kritis '
    + 'yang dipertanggungkan, kontribusi yang tersisa sampai akhir masa bayar dibebaskan, '
    + 'sementara perlindungan tetap berjalan sampai usia ' + r.sampaiUsia + '. Contoh: '
    + 'pada Gen Pro ' + r.kombinasi + ', kejadian setelah membayar tahun kelima berarti '
    + 'kontribusi tahun keenam sampai tahun ke-' + inp.bayar + ' tidak perlu dibayar. '
    + 'Manfaat ini sudah termasuk dalam premi, bukan rider berbayar terpisah.';

  const penting = r.timeline.filter(x =>
    x.tahun <= inp.bayar + 1 || x.tahun % 5 === 0 || x.tahun === r.timeline.length);
  el('qTabelTimeline').innerHTML =
    '<thead><tr><th>Thn</th><th>Usia</th><th class="kanan">Premi per Tahun</th>'
    + '<th class="kanan">Meninggal</th><th class="kanan">Kecelakaan transportasi umum</th>'
    + '<th class="kanan">Di luar Indonesia</th></tr></thead><tbody>'
    + penting.map(x =>
        '<tr class="' + (x.premi ? 'bayar' : '')
        + (x.tahun === r.timeline.length ? ' tandai' : '') + '">'
        + '<td>' + x.tahun + '</td><td>' + x.usia + '</td>'
        + '<td class="kanan angka">' + (x.premi ? rp(x.premi) : '\u2014') + '</td>'
        + '<td class="kanan angka">' + rp(x.meninggal) + '</td>'
        + '<td class="kanan angka">' + rp(x.transportasi) + '</td>'
        + '<td class="kanan angka">' + rp(x.luarNegeri) + '</td></tr>').join('')
    + '</tbody>';
  el('qCatatanTimeline').textContent = 'Premi dibayar ' + inp.bayar + ' tahun pertama, '
    + 'lalu berhenti, sementara perlindungan berjalan sampai usia ' + r.sampaiUsia
    + ' — seluruhnya ' + r.lamaLindung + ' tahun. Tabel menampilkan seluruh tahun masa '
    + 'bayar, tahun pertama setelah lunas, setiap kelipatan 5 tahun, dan tahun terakhir.';

  el('qSangkalan').textContent = 'Ilustrasi dihitung dari tabel premi Gen Pro yang berlaku '
    + 'saat ini. Diskon premi sudah termasuk dalam tabel tersebut. Bukan bagian dari polis '
    + 'dan tidak mengikat secara hukum. Nilai final tunduk pada Ketentuan Polis resmi '
    + 'PT Asuransi Jiwa Generali Indonesia dan hasil underwriting.';

  const na = el('qAgenNama').value, hp = el('qAgenHP').value;
  el('qKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function qAturan() {
  el('qAturan').innerHTML =
  '<details><summary>Cara membaca nama plan</summary><div class="isi"><ul>'
  + '<li>Angka pertama adalah lama pembayaran kontribusi. Gen Pro 10-90 berarti premi dibayar 10 tahun.</li>'
  + '<li>Angka kedua 70 sampai 90 berarti perlindungan berjalan sampai usia tersebut.</li>'
  + '<li>Angka kedua 20 diperlakukan sebagai perlindungan selama 20 tahun sejak polis mulai, karena usia masuknya bisa sampai 65 tahun sehingga tidak mungkin bermakna sampai usia 20.</li>'
  + '<li>Tersedia 26 paket, termasuk dua paket khusus 70-70 dan 70-90. Daftarnya diambil langsung dari tabel premi, jadi paket yang tidak ada memang tidak muncul di pilihan.</li>'
  + '<li>Paket yang tidak tersedia untuk usia nasabah diberi keterangan di daftar pilihan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Diskon premi</summary><div class="isi"><ul>'
  + '<li>Diskon sudah termasuk dalam tabel premi resmi, jadi tidak dipotong lagi oleh kalkulator ini.</li>'
  + '<li>Besarannya: di bawah Rp1 miliar tidak ada diskon, mulai Rp1 miliar sampai di bawah Rp2,5 miliar 20%, dan mulai Rp2,5 miliar 30%.</li>'
  + '<li>Karena itu kenaikan UP dari Rp2 miliar ke Rp2,5 miliar sering membuat preminya justru turun sedikit. Ini bahan penawaran yang kuat.</li>'
  + '<li>Premi tahunan dihitung 11 kali premi bulanan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Manfaat bawaan</summary><div class="isi"><ul>'
  + '<li>Meninggal dunia 100% uang pertanggungan.</li>'
  + '<li>Tambahan 100% bila meninggal karena kecelakaan pada transportasi umum, maksimal Rp2 miliar.</li>'
  + '<li>Tambahan 10% bila meninggal di luar wilayah Indonesia, maksimal Rp500 juta.</li>'
  + '<li>Pembebasan kontribusi bila terdiagnosa salah satu kondisi kritis yang dipertanggungkan, tanpa premi rider terpisah.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas usia masuk</summary><div class="isi"><ul>'
  + '<li>Batasnya berbeda tiap kombinasi: perlindungan sampai usia 70 hanya sampai usia masuk 50, sampai 75 hanya sampai 55, sampai 80 sampai 85 dan 90 umumnya sampai 60, dan masa bayar 5 tahun bisa sampai 65.</li>'
  + '<li>Perlindungan 20 tahun punya batas bawah usia masuk 10 sampai 12 tahun.</li>'
  + '<li>Tidak semua pilihan UP tersedia di setiap usia. Tabel pilihan UP di layar kalkulator menunjukkan mana yang bisa diambil.</li>'
  + '</ul></div></details>';
}

qGambar();

// Dipanggil tombol "kembali" Android.
window.tekanKembali = function () {
  const kiri = LAYAR[layarAktif].kiri;
  if (kiri) { bukaLayar(kiri); return true; }
  return false;
};

// Pengaman: fungsi ini hanya boleh berjalan sekali. Sebelumnya dipanggil dua
// kali, sehingga seluruh pemasang tombol di dalamnya terpasang dobel.
let __uiSudahDibangun = false;
/* Masa bayar Lite Future yang benar-benar bisa dipakai, dibaca dari isi tabel
   tarif — bukan daftar tetap. Sebuah masa bayar dianggap tersedia bila punya
   tarif untuk sedikitnya dua usia pensiun. Masa bayar 3 tahun tidak lolos:
   di database hanya ada satu sel (LFB 3-55, usia 18, wanita), sehingga
   memilihnya hampir selalu berakhir dengan pesan "tarif tidak tersedia".
   Begitu tabel MPP 3 dilengkapi, pilihannya muncul sendiri tanpa ubah kode. */
function lfMasaBayarTersedia() {
  const bawaan = [5, 10, 15, 20];
  try {
    if (typeof TARIF === 'undefined' || !TARIF) return bawaan;
    const usiaPensiun = {};
    Object.keys(TARIF).forEach(k => {
      const m = /^LF[BT] (\d+)-(\d+)$/.exec(k);
      if (!m) return;
      const isi = TARIF[k];
      if (!isi || !Object.keys(isi).length) return;
      (usiaPensiun[m[1]] = usiaPensiun[m[1]] || {})[m[2]] = true;
    });
    const ada = Object.keys(usiaPensiun)
      .filter(mpp => Object.keys(usiaPensiun[mpp]).length >= 2)
      .map(Number).sort((a, b) => a - b);
    return ada.length ? ada : bawaan;
  } catch (_) { return bawaan; }
}
window.lfMasaBayarTersedia = lfMasaBayarTersedia;

/* Masa bayar iFLEXYGUARD yang datanya memadai. MPP 10 hanya punya usia 0, 1,
   dan 2 di database, jadi tombolnya disembunyikan sampai tabelnya lengkap. */
function flexMasaBayarTersedia() {
  const bawaan = [5];
  try {
    if (typeof TARIF_FLEX === 'undefined' || !TARIF_FLEX) return bawaan;
    const jumlah = {};
    Object.keys(TARIF_FLEX).forEach(u => {
      Object.keys(TARIF_FLEX[u] || {}).forEach(m => { jumlah[m] = (jumlah[m] || 0) + 1; });
    });
    const ada = Object.keys(jumlah).filter(m => jumlah[m] >= 10)
      .map(Number).sort((a, b) => a - b);
    return ada.length ? ada : bawaan;
  } catch (_) { return bawaan; }
}

/* Menyembunyikan tombol pilihan yang datanya tidak ada, lalu memastikan yang
   sedang aktif masih termasuk pilihan yang tersisa. */
function saringSegmen(idSegmen, nilaiBoleh) {
  const box = el(idSegmen);
  if (!box) return;
  const boleh = nilaiBoleh.map(String);
  let adaAktif = false, pertama = null;
  box.querySelectorAll('button').forEach(b => {
    const sah = boleh.indexOf(String(b.dataset.nilai)) >= 0;
    b.hidden = !sah;
    b.style.display = sah ? '' : 'none';
    if (sah) {
      if (!pertama) pertama = b;
      if (b.getAttribute('aria-pressed') === 'true') adaAktif = true;
    } else {
      b.setAttribute('aria-pressed', 'false');
    }
  });
  if (!adaAktif && pertama) pertama.setAttribute('aria-pressed', 'true');
}

function bangunAntarmuka() {
if (__uiSudahDibangun) return;
__uiSudahDibangun = true;
el('fMPP').innerHTML = lfMasaBayarTersedia()
  .map(m => `<option value="${m}"${m === 5 ? ' selected' : ''}>${m} tahun</option>`).join('');
el('fUP').innerHTML = META.tierUP
  .map(v => `<option value="${v}"${v === 1000000000 ? ' selected' : ''}>${rp(v)}</option>`).join('');

/* Pilihan yang datanya belum ada disembunyikan, bukan dibiarkan lalu gagal
   dengan pesan "tarif tidak tersedia" yang membuat agen mengira usianya yang
   bermasalah. Semuanya dibaca dari isi tabel, jadi begitu datanya dilengkapi
   pilihannya muncul kembali sendiri. */
saringSegmen('xMpp', flexMasaBayarTersedia());
mSesuaikanPilihan();

USIA_PENSIUN.forEach(a => { pilihan[a] = true; kustom[a] = null; });

el('relUsia').innerHTML = USIA_PENSIUN.map(a => `
  <div class="stasiun" id="st${a}">
    <div class="kepala"><span class="usia">USIA ${a}</span><span class="up" id="up${a}"></span></div>
    <div class="premi" id="premi${a}"></div>
    <div class="rinci" id="rinci${a}"></div>
    <div class="atur">
      <button type="button" class="sakelar" data-usia="${a}" aria-pressed="true">Tawarkan</button>
      <label for="ku${a}">Dana</label>
      <select id="ku${a}" data-usia="${a}">
        <option value="">Ikut target</option>
        ${META.tierUP.map(v => `<option value="${v}">${rpSingkat(v)}</option>`).join('')}
      </select>
    </div>
  </div>`).join('');

// Kotak pilihan usia di layar ringkasan — kembarannya sakelar di kalkulator.
el('cipUsia').innerHTML = USIA_PENSIUN.map(a =>
  '<button type="button" data-usia="' + a + '" aria-pressed="true">Usia ' + a + '</button>').join('');

// Satu sumber kebenaran: apa pun yang diklik, kedua kendali ikut menyesuaikan.
function setPilih(a, nilai, tanpaGambar) {
  pilihan[a] = nilai;
  const s = document.querySelector('.sakelar[data-usia="' + a + '"]');
  if (s) {
    s.setAttribute('aria-pressed', nilai);
    s.textContent = nilai ? 'Tawarkan' : 'Lewati';
  }
  const c = document.querySelector('#cipUsia button[data-usia="' + a + '"]');
  if (c) c.setAttribute('aria-pressed', nilai);
  if (!tanpaGambar) gambar();
}

document.querySelectorAll('.sakelar').forEach(b =>
  b.addEventListener('click', () => setPilih(+b.dataset.usia, !pilihan[+b.dataset.usia])));
el('cipUsia').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b && !b.disabled) setPilih(+b.dataset.usia, !pilihan[+b.dataset.usia]);
});

// Tombol cetak. Di dalam aplikasi Android, pencetakan ditangani oleh sistem
// lewat jembatan Android; di peramban biasa memakai dialog cetak bawaan.
function cetak(judulDokumen) {
  // Pencatatan Presentasi dilakukan di fungsi cetak itu sendiri agar
  // tidak bergantung pada urutan loading / wrapper fungsi global.
  try {
    const judul = String(judulDokumen || '');
    if (/^Ilustrasi\s/i.test(judul) &&
        window.InsuranceHubAktivitas &&
        typeof window.InsuranceHubAktivitas.catatPresentasi === 'function') {
      window.InsuranceHubAktivitas.catatPresentasi(judul);
    }
  } catch (_) {}
  if (window.Android && window.Android.cetak) { window.Android.cetak(judulDokumen); return; }
  const asli = document.title;
  document.title = judulDokumen;          // menjadi nama berkas PDF di peramban
  window.print();
  setTimeout(() => { document.title = asli; }, 1000);
}
const namaBerkas = t => String(t || 'Nasabah').replace(/[\\/:*?"<>|]/g, '').trim() || 'Nasabah';
function namaIlustrasi(produk, nama, tambahan='') { return [produk, namaBerkas(nama), tambahan].filter(Boolean).join(' - '); }
window.InsuranceHubNaming = { illustrationName:namaIlustrasi, fileName:(produk,nama,tambahan='')=>namaBerkas(namaIlustrasi(produk,nama,tambahan)).replace(/\s+/g,'_')+'.pdf' };

el('tblCetak').addEventListener('click', () =>
  cetak('Ilustrasi Lite Future - ' + namaBerkas(el('fNama').value)));
el('bTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi BeSMART Lite - ' + namaBerkas(el('bNama').value)));
el('cTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi Cristal Prime - ' + namaBerkas(el('cNama').value)));
el('mTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi Cemerlang Prime - ' + namaBerkas(el('mNama').value)));
el('kTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi Kombinasi - ' + namaBerkas(el('kNama').value)));
el('gTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi Gen Aman - ' + namaBerkas(el('gNama').value)));
el('xTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi iFLEXYGUARD - ' + namaBerkas(el('xNama').value)));
el('hTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi GHP GenPro - ' + namaBerkas(el('hNama').value)));
el('qTblCetak').addEventListener('click', () =>
  cetak('Ilustrasi Gen Pro - ' + namaBerkas(el('qNama').value)));
el('dTblCetak').addEventListener('click', () =>
  cetak('Kebutuhan Dana Pensiun - ' + namaBerkas(el('dNama').value)));
el('pTblCetak').addEventListener('click', () =>
  cetak('Simulasi Cicilan Rumah - ' + namaBerkas(el('pNama').value)));
el('rTblCetak').addEventListener('click', () =>
  cetak('Rumah Kedua - ' + namaBerkas(el('rNama').value)));
el('nTblCetak').addEventListener('click', () =>
  cetak('Kebutuhan Dana Pendidikan - ' + namaBerkas(el('nNama').value)));
el('oTblCetak').addEventListener('click', () =>
  cetak('Kombinasi Produk - ' + namaBerkas(el('oNama').value)));
document.querySelectorAll('.atur select').forEach(s => s.addEventListener('change', () => {
  kustom[+s.dataset.usia] = s.value ? +s.value : null;
  gambar();
}));
document.querySelectorAll('.segmen').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  gambar();
}));
['fTgl','fMPP','fUP','fAgen','fNama','fAgenNama','fAgenHP']
  .forEach(id => el(id).addEventListener('input', gambar));
  gambar();
}


function lfIsiIdentitasKonsultan(){
  const namaEl=el('fAgenNama'), hpEl=el('fAgenHP');
  if(!namaEl && !hpEl) return;
  try{
    let k={}; try{k=(window.InsuranceHubConsultantCard&&window.InsuranceHubConsultantCard.read())
      ||JSON.parse(localStorage.getItem('insuranceHub.konsultan.v1')||'{}')||{}}catch(_){}
    let a={}; try{a=JSON.parse(localStorage.getItem('insuranceHub.agen.v1')||'{}')||{}}catch(_){}
    const nama=String(k.nama||a.nama||'').trim();
    const hp=String(k.whatsapp||a.hp||'').trim();
    if(namaEl && !String(namaEl.value||'').trim() && nama){namaEl.value=nama;}
    if(hpEl && !String(hpEl.value||'').trim() && hp){hpEl.value=hp;}
  }catch(_){}
}

function gambar() {
  lfIsiIdentitasKonsultan();
  const tgl = el('fTgl').value;
  const inp = {
    nama: el('fNama').value, jk: nilaiSegmen('fJK'),
    tglLahir: tgl ? new Date(tgl + 'T00:00:00Z') : null,
    setoran: nilaiSegmen('fSetoran'), mpp: +el('fMPP').value,
    pensiunUP: +el('fUP').value, statusAgen: el('fAgen').value,
    customUP: kustom, pilih: pilihan,
  };
  aturan(inp);

  if (!tgl) {
    el('infoUsia').textContent = 'Isi tanggal lahir untuk menghitung usia.';
    el('nmBiasa').textContent = '\u2014';
    el('nmHNW').textContent = '\u2014';
    el('nmKet').textContent = '';
    USIA_PENSIUN.forEach(a => {
      el('premi' + a).textContent = ''; el('rinci' + a).textContent = '';
      el('up' + a).textContent = ''; el('st' + a).className = 'stasiun mati';
    });
    ['ikhtisar','grafikPensiun','grafikJiwa','relRingkas','identitas','kakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('sangkalan').textContent = '';
    return;
  }

  const r = hitung(inp, TARIF, META);
  const satuan = inp.setoran === 'Bulanan' ? 'bulan' : 'tahun';
  el('infoUsia').textContent = 'Usia masuk ' + r.usia + ' tahun' + (inp.nama ? ' \u2022 ' + inp.nama : '');

  el('nmBiasa').textContent = teksBatas(r.batasNM);
  el('nmHNW').textContent = teksBatas(r.batasNMHNW);
  el('nmKet').textContent = 'Dana pensiun sampai nilai di atas masih bisa diajukan tanpa pemeriksaan '
    + 'kesehatan pada usia ' + r.usia + ' dengan status ' + inp.statusAgen + '. Di atas nilai itu, '
    + 'kategori medis pada tiap usia pensiun di bawah menunjukkan pemeriksaan yang diminta.';

  r.hasil.forEach((h, i) => {
    const a = USIA_PENSIUN[i];
    el('st' + a).className = 'stasiun' + (h.setoran != null ? ' ada' : '') + (pilihan[a] ? '' : ' mati');
    el('up' + a).textContent = 'Dana cair ' + rpSingkat(h.up);
    if (h.setoran == null) {
      el('premi' + a).innerHTML = '<span class="kosong">Tidak tersedia</span>';
      el('rinci' + a).innerHTML = '<span class="kosong">' + esc(h.alasan) + '</span>';
      return;
    }
    const lewatNM = !r.batasNM.takTerbatas && r.batasNM.nilai != null && h.up > r.batasNM.nilai;
    el('premi' + a).innerHTML = rp(h.setoran) + ' <small>/' + satuan + '</small>';
    el('rinci' + a).innerHTML =
      '<span class="tag ' + (h.hnw === 'HNW' ? 'hnw' : 'non') + '">' + h.hnw + '</span>'
      + '<span class="tag ' + (h.medis === 'NM' ? 'medis' : 'awas') + '">Medis: ' + esc(h.medis) + '</span>'
      + (lewatNM ? '<span class="tag awas">Di atas batas NM</span>' : '')
      /* Premi dasar dan premi waiver dipisahkan. Totalnya tidak berubah —
         keduanya memang selalu digabung di setoran — tetapi agen perlu
         melihat besaran waiver secara terpisah saat menjelaskan manfaat
         pembebasan premi. Waiver pada Lite Future wajib, tidak bisa dilepas. */
      + ((h.premiDasar != null && h.premiWaiver != null)
          ? '<br>Premi dasar ' + rp(h.premiDasar) + ' /' + satuan
            + ' + waiver ' + rp(h.premiWaiver) + ' /' + satuan + ' (wajib)'
          : '')
      + '<br>Total dibayar ' + rp(h.total) + ' selama ' + inp.mpp + ' tahun'
      + '<br>Premi disetahunkan ' + rp(h.premiDisetahunkan)
      + ' \u2014 syarat HNW ' + rp(r.syaratPremiHNW) + ' dan dana minimal ' + rp(1000000000);
  });

  /* Tabel pembebasan premi waiver BeSMART Lite Future.

     Waiver pada produk ini WAJIB dan preminya selalu menyatu di setoran.
     Cara kerja pembebasannya sama dengan waiver Gen Aman: premi dasar yang
     BELUM dibayar dibebaskan sampai akhir masa bayar. Premi waiver sendiri
     tidak ikut — rider berakhir begitu klaim disetujui. */
  (function(){
    const wadah = el('lfWaiverBlok');
    if(!wadah) return;
    const dipilih = (r.hasil || []).filter(h => h && h.setoran != null && pilihan[h.retAge]);
    if(!dipilih.length){ wadah.innerHTML = ''; return; }
    const bulanan = inp.setoran === 'Bulanan';
    const mpp = Number(inp.mpp) || 0;
    if(mpp < 2){ wadah.innerHTML = ''; return; }
    /* Kolom total hanya muncul bila lebih dari satu usia pensiun dipilih —
       kalau hanya satu, kolomnya akan mengulang angka yang sama. */
    const banyak = dipilih.length > 1;
    const kepala = '<tr><th>Kejadian pada</th><th class="kanan">Sisa masa bayar</th>'
      + dipilih.map(h => '<th class="kanan">Pensiun ' + h.retAge + '</th>').join('')
      + (banyak ? '<th class="kanan">Total kontribusi yang dibebaskan</th>' : '')
      + '</tr>';
    let baris = '';
    for(let th = 1; th < mpp; th++){
      const sisa = mpp - th;
      let total = 0;
      const kolom = dipilih.map(h => {
        const perTahun = bulanan ? h.premiDasar * 12 : h.premiDasar;
        const nilai = perTahun * sisa;
        total += nilai;
        return '<td class="kanan angka">' + rp(Math.round(nilai)) + '</td>';
      }).join('');
      baris += '<tr><td>Tahun ke-' + th + ' (usia ' + (r.usia + th - 1) + ')</td>'
        + '<td class="kanan angka">' + sisa + ' tahun</td>'
        + kolom
        + (banyak ? '<td class="kanan angka"><b>' + rp(Math.round(total)) + '</b></td>' : '')
        + '</tr>';
    }
    const waiverInfo = dipilih.map(h => 'pensiun ' + h.retAge + ' ' + rp(h.premiWaiver)
      + '/' + (bulanan ? 'bulan' : 'tahun')).join(', ');
    wadah.innerHTML = '<div class="blok"><h3>Bila terdiagnosa penyakit kritis</h3>'
      + '<p class="catatan">Premi dasar yang BELUM dibayar dibebaskan sampai akhir masa bayar. '
      + 'Sisa masa bayar dihitung setelah premi tahun berjalan dibayar. '
      + 'Rider waiver pada BeSMART Lite Future bersifat wajib dan preminya menyatu di setoran '
      + '(' + waiverInfo + '); premi waiver itu sendiri tidak ikut dibebaskan karena rider '
      + 'berakhir begitu klaim disetujui.</p>'
      + '<div class="gulir"><table class="tahunan">'
      + '<thead>' + kepala + '</thead><tbody>' + baris + '</tbody></table></div></div>';
  })();

  el('identitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(inp.nama || '\u2014') + '</b></div>'
    + '<div>Usia saat ini<b>' + r.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + '<div>Masa bayar<b>' + inp.mpp + ' tahun, ' + inp.setoran + '</b></div>';

  // Usia yang tarifnya tidak ada tidak bisa ditawarkan — kotak pilihannya dimatikan.
  r.hasil.forEach((h, i) => {
    const c = document.querySelector('#cipUsia button[data-usia="' + USIA_PENSIUN[i] + '"]');
    c.disabled = h.setoran == null;
    c.title = h.setoran == null ? h.alasan : '';
  });

  el('relRingkas').innerHTML = r.hasil.map((h, i) => {
    const a = USIA_PENSIUN[i];
    if (!r.aktif[i]) {
      return '<div class="stasiun mati"><div class="kepala"><span class="usia">USIA ' + a + '</span></div>'
        + '<div class="rinci">' + (h.setoran == null ? 'Tidak tersedia' : 'Tidak ditawarkan') + '</div></div>';
    }
    return '<div class="stasiun ada">'
      + '<div class="kepala"><span class="usia">USIA ' + a + '</span>'
      + '<span class="up">Setoran ' + rp(h.setoran) + '/' + satuan + '</span></div>'
      + '<div class="premi">' + rp(h.up) + ' <small>cair</small></div>'
      + '<div class="rinci"><span class="tag ' + (h.hnw === 'HNW' ? 'hnw' : 'non') + '">' + h.hnw + '</span>'
      + '<span class="tag ' + (h.medis === 'NM' ? 'medis' : 'awas') + '">Medis: ' + esc(h.medis) + '</span></div></div>';
  }).join('');

  el('ikhtisar').innerHTML =
    '<div class="kartu"><div class="k">Setoran gabungan / ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.totalSetoran) + '</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + inp.mpp + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Total premi dibayar</div>'
    + '<div class="v angka">' + rp(r.totalPremi) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Total dana pensiun yang disiapkan</div>'
    + '<div class="v angka">' + rp(r.totalUP) + '</div>'
    + '<div class="k" style="margin-top:7px">Kategori medis gabungan: <b>' + esc(r.medisGabungan) + '</b>'
    + ' \u2022 Batas NM: <b>' + teksBatas(r.batasNM) + '</b></div></div>';

  // Dua diagram manfaat: batang vertikal dinamis.
  // Semua nilai berasal langsung dari hasil engine Lite Future (r.hasil / r.periode).
  function lfBarChart(items, opts) {
    const vals = items.map(x => Number(x.value) || 0);
    const max = Math.max(...vals, 1);
    const ticks = 4;
    const grid = Array.from({length: ticks + 1}, (_, i) => {
      const v = max * (ticks - i) / ticks;
      const y = 18 + i * 42;
      return '<div class="lf-chart-gridline" style="top:' + y + '%"><span>' + rpSingkat(v) + '</span></div>';
    }).join('');
    const bars = items.map((x, i) => {
      const pct = Math.max(0, Math.min(100, (Number(x.value) || 0) / max * 100));
      const unavailable = x.available === false;
      return '<div class="lf-chart-item' + (unavailable ? ' unavailable' : '') + '">' +
        '<div class="lf-chart-value">' + (unavailable ? '—' : rpSingkat(x.value)) + '</div>' +
        '<div class="lf-chart-track"><div class="lf-chart-bar ' + (opts.kind || '') + '" style="height:' + (unavailable ? 0 : pct) + '%"></div></div>' +
        '<div class="lf-chart-label">' + esc(x.label) + '</div>' +
        (x.sub ? '<div class="lf-chart-sub">' + esc(x.sub) + '</div>' : '') +
      '</div>';
    }).join('');
    return '<div class="lf-chart-shell">' +
      '<div class="lf-chart-title">' + esc(opts.title) + '</div>' +
      '<div class="lf-chart-subtitle">' + esc(opts.subtitle) + '</div>' +
      '<div class="lf-chart-area">' + grid + '<div class="lf-chart-bars">' + bars + '</div></div>' +
      (opts.note ? '<div class="lf-chart-note">' + opts.note + '</div>' : '') +
    '</div>';
  }

  const pensiunItems = r.hasil.filter((h,i)=>r.aktif[i]).map((h, i, arr) => {
    const originalIndex = r.hasil.indexOf(h);
    return { label:'Usia '+USIA_PENSIUN[originalIndex], value:h.up, available:h.setoran != null, sub:h.setoran != null?'Dana cair':'Tidak tersedia' };
  });
  const jiwaItems = r.periode.map((p) => ({
    label: p.label === 'Saat ini - 55' ? 'Saat ini–55' : p.label.replace(' - ', '–'),
    value: p.nilai,
    available: true,
    sub: 'Jika meninggal'
  }));

  el('grafikPensiun').className = 'lf-chart-wrap';
  el('grafikPensiun').innerHTML = lfBarChart(pensiunItems, {
    kind: 'pensiun',
    title: 'Nilai Dana Pensiun per Usia',
    subtitle: '(Jika Sehat)',
    note: 'Setiap batang menunjukkan nilai dana yang dicairkan jika tertanggung hidup sampai usia tersebut.'
  });

  el('grafikJiwa').className = 'lf-chart-wrap lf-chart-wrap-jiwa';
  el('grafikJiwa').innerHTML = lfBarChart(jiwaItems, {
    kind: 'jiwa',
    title: 'Total Santunan Jika Meninggal',
    subtitle: '(Per Periode, Menurun Seiring Waktu)',
    note: 'Nilai setiap periode mengikuti sisa santunan yang dihitung oleh engine Lite Future berdasarkan pilihan usia yang aktif.'
  });

  el('sangkalan').textContent = 'Dokumen ini ilustrasi simulasi untuk membantu penjelasan produk kepada '
    + 'calon nasabah, dihitung dari tarif premi yang berlaku saat ini. Setiap titik usia akhir kontrak '
    + 'adalah polis yang berdiri sendiri \u2014 begitu dicairkan karena nasabah sehat, proteksi pada titik '
    + 'itu berakhir dan tidak lagi dihitung dalam santunan meninggal periode berikutnya. Bukan bagian '
    + 'dari polis dan tidak mengikat secara hukum. Nilai final tunduk pada Ketentuan Polis resmi '
    + 'PT Asuransi Jiwa Generali Indonesia dan hasil underwriting.';

  const na = el('fAgenNama').value, hp = el('fAgenHP').value;
  el('kakiAgen').innerHTML = kakiAgenHtml(na, hp);
}



function aturan(inp) {
  const minimum = inp.setoran === 'Bulanan' ? 'Rp 300.000 per bulan' : 'Rp 3.300.000 per tahun';
  const syarat = rp(inp.mpp === 3 ? 200000000 : (inp.mpp === 5 ? 120000000 : 100000000));
  el('aturan').innerHTML =
  '<details><summary>Cara premi dihitung</summary><div class="isi"><ul>'
  + '<li>Tarif dasar diambil dari kolom UP Rp100 juta pada database Lite Future, sesuai jenis kelamin, usia masuk, masa bayar, dan usia pensiun.</li>'
  + '<li>Untuk dana pensiun di bawah Rp1 miliar, premi dihitung proporsional lurus dari tarif per Rp100 juta.</li>'
  + '<li>Untuk dana pensiun mulai Rp1 miliar berlaku diskon 5%, dan diskon itu mengenai seluruh nominal, bukan hanya kelebihannya.</li>'
  + '<li>Setoran di bawah ' + minimum + ' tidak bisa diterbitkan, sehingga baris usia itu dikosongkan.</li>'
  + '<li>Baris juga dikosongkan kalau kombinasi usia masuk, masa bayar, dan usia pensiun belum ada di database.</li>'
  + '</ul></div></details>'

  + '<details><summary>Syarat status HNW</summary><div class="isi"><ul>'
  + '<li>Satu titik usia pensiun berstatus HNW kalau premi tahunan disetahunkan mencapai ' + syarat + ' <b>dan</b> dana pensiunnya minimal Rp 1.000.000.000.</li>'
  + '<li>Syarat premi berbeda per masa bayar: MPP 3 tahun Rp 200 juta, MPP 5 tahun Rp 120 juta, MPP 10 tahun ke atas Rp 100 juta.</li>'
  + '<li>Status dinilai per usia pensiun, tidak digabung. Satu nasabah bisa HNW di usia 60 tetapi Non-HNW di usia 65.</li>'
  + '<li>Tabel medis HNW berlaku sama untuk agen Reguler maupun Previllage.</li>'
  + '</ul></div></details>'

  + '<details><summary>Kategori medis dan batas NM</summary><div class="isi"><ul>'
  + '<li>NM berarti non-medis: pengajuan tidak perlu pemeriksaan kesehatan.</li>'
  + '<li>Huruf A sampai F menandakan paket pemeriksaan yang diminta; makin jauh hurufnya, makin lengkap pemeriksaannya.</li>'
  + '<li>PF berarti perlu bukti keuangan, Medical berarti pemeriksaan penuh, N/A berarti kombinasi itu tidak dapat diajukan.</li>'
  + '<li>Titik yang berstatus HNW memakai tabel medis HNW yang batasnya lebih longgar. Titik Non-HNW memakai tabel sesuai status agen.</li>'
  + '<li>Sumber ketentuan: EM 030/GNR-PD/08/2026 Lampiran 1 dan EM 022/GNR-PD/06/2026 Lampiran 2.</li>'
  + '</ul></div></details>'

  + '<details><summary>Bedanya dengan file Excel</summary><div class="isi"><ul>'
  + '<li>Di file Excel, satu baris pada tabel medis agen Reguler bergeser satu kolom, sehingga ambang Rp1.000.000.001 terbaca sebagai teks.</li>'
  + '<li>Akibatnya kategori medis gabungan bisa meleset, dan batas NM untuk usia 56 sampai 60 memunculkan pesan error di Excel.</li>'
  + '<li>Aplikasi ini memakai posisi yang benar, mengikuti tabel agen Previllage yang strukturnya sama.</li>'
  + '</ul></div></details>';
}


// Menyimpan aplikasi di HP supaya bisa dibuka lagi tanpa internet.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

bangunAntarmuka();


/* ============ BeSMART Lite 3/5-100 ============ */
// Kotak UP diformat langsung saat diketik: 1000000000 -> 1.000.000.000
el('bUP').addEventListener('input', () => {
  const kotak = el('bUP');
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  bGambar();
});
['bNama', 'bTgl', 'bAgenNama', 'bAgenHP'].forEach(id =>
  el(id).addEventListener('input', bGambar));
['bJK', 'bMPP', 'bMetode'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  bGambar();
}));



function bGambar() {
  const tgl = el('bTgl').value;
  const up = bAngka(el('bUP').value);
  const inp = {
    nama: el('bNama').value,
    jk: nilaiSegmen('bJK'),
    tglLahir: tgl ? new Date(tgl + 'T00:00:00Z') : null,
    mpp: +nilaiSegmen('bMPP'),
    metode: nilaiSegmen('bMetode'),
    up: up,
  };
  bAturan(inp);

  if (!tgl || !up) {
    el('bInfoUsia').textContent = !tgl
      ? 'Isi tanggal lahir untuk menghitung usia masuk.'
      : 'Isi uang pertanggungan untuk melihat premi.';
    ['bHasil', 'bFase', 'bFaseTime', 'bIdentitas', 'bKotakRingkas', 'bTabel', 'bKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('bSangkalan').textContent = '';
    el('bCatatanTabel').textContent = '';
    return;
  }

  /* Kolom UP di layar ini sekarang berisi UP DASAR, bukan uang pertanggungan
     gabungan. Mesin lama menghitungnya sebagai UP gabungan terhadap acuan
     Rp500 juta, sehingga premi dan seluruh tabel timeline jadi salah.
     Karena itu layar ini memakai mesin versi lengkap. */
  const r = bsl2Hitung({
    jk: inp.jk, tglLahir: inp.tglLahir, mpp: inp.mpp, metode: inp.metode,
    upDasar: up, pakaiLiteUp: nilaiSegmen('bLiteUp') !== 'Tidak'
  }, TARIF_BSL_LENGKAP);
  const riderAktifBsl = nilaiSegmen('bRider') === 'Ya';
  const planBsl = el('bPlanGhp') ? el('bPlanGhp').value : '';
  const satuan = inp.metode === 'Bulanan' ? 'bulan' : 'tahun';
  el('bInfoUsia').textContent = 'Usia masuk ' + r.usia + ' tahun'
    + (inp.nama ? ' \u2022 ' + inp.nama : '');

  if (!r.tersedia) {
    el('bHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    ['bFase', 'bFaseTime', 'bIdentitas', 'bKotakRingkas', 'bTabel', 'bKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('bSangkalan').textContent = '';
    el('bCatatanTabel').textContent = '';
    return;
  }

  const kurang = up < 50000000
    ? '<div class="peringatan">UP Dasar di bawah minimum Rp 50.000.000.</div>' : '';

  /* Premi rider kesehatan dibayar selama masa pertanggungan rider, bukan hanya
     selama masa bayar produk dasar, jadi total dibayar tidak ditampilkan
     ketika rider diambil. */
  const G = window.InsuranceHubGhpAturan;
  const premiGhpBsl = (riderAktifBsl && G && planBsl)
    ? (inp.metode === 'Bulanan' ? G.premiBulanan(r.usia, planBsl) : G.premiTahunan(r.usia, planBsl)) || 0
    : 0;
  const premiGabunganBsl = r.premiSesuaiMetode + premiGhpBsl;
  const ketTotal = riderAktifBsl
    ? 'Total tidak ditampilkan karena premi rider kesehatan dibayar selama masa pertanggungan rider.'
    : 'Total ' + rp(r.totalSesuaiMetode) + '.';
  const lebih = r.catatanUP ? '<div class="peringatan">' + esc(r.catatanUP) + '</div>' : '';

  el('bHasil').innerHTML = kurang + lebih
    + '<div class="sorotan"><div class="k">Yang dibayar nasabah</div>'
    + '<div class="v angka">' + rp(premiGabunganBsl) + ' <small>/' + satuan + '</small></div>'
    + '<div class="t">'
    + (riderAktifBsl
      ? 'Premi UP Dasar' + (r.pakaiLiteUp ? ' dan Lite UP' : '') + ' ' + rp(r.premiSesuaiMetode)
        + '. Premi rider ' + esc(planBsl) + ' ' + rp(premiGhpBsl)
        + ' dibayar selama masa pertanggungan rider. ' + ketTotal
      : 'Dibayar selama ' + inp.mpp + ' tahun, lalu berhenti. ' + ketTotal)
    + '</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + '</div></div>'
    + '<div class="kartu"><div class="k">Manfaat meninggal dunia</div>'
    + '<div class="v angka">' + rp(r.manfaatMeninggal) + '</div></div>'
    + '<div class="kartu"><div class="k">Manfaat hidup di usia 100</div>'
    + '<div class="v angka">' + rp(r.manfaatHidup) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Kode plan</div>'
    + '<div class="v">' + esc(r.kodePlan) + '</div>'
    + '<div class="k" style="margin-top:6px">Tarif UP Dasar per Rp100 juta: <b>'
    + rp(r.tarif) + '</b>'
    + (r.pakaiLiteUp ? ' &middot; tarif Lite UP 400%: <b>' + rp(r.tarifLiteUp) + '</b>' : '')
    + '</div></div></div>';

  const fase =
    '<div class="tahap"><b>Tahun 1 sampai ' + inp.mpp + '</b>'
    + '<span>Membayar ' + rp(premiGabunganBsl) + ' per ' + satuan + '. ' + ketTotal + '</span></div>'
    + '<div class="tahap tenang"><b>Tahun ' + (inp.mpp + 1) + ' sampai usia 100</b>'
    + '<span>'
    + (riderAktifBsl
      ? 'Premi UP Dasar berhenti. Premi rider kesehatan ' + rp(premiGhpBsl) + ' per ' + satuan
        + ' tetap dibayar selama rider berjalan. '
      : 'Tidak ada pembayaran lagi. ')
    + 'Proteksi jiwa ' + rp(r.manfaatMeninggal)
    + ' tetap berjalan sampai usia 100 tahun.</span></div>'
    + '<div class="tahap"><b>Di usia 100 tahun</b>'
    + '<span>Kalau tertanggung masih hidup, manfaat hidup ' + rp(r.manfaatHidup)
    + ' dibayarkan, yaitu 100% dari uang pertanggungan.</span></div>';
  el('bFase').innerHTML = fase;
  el('bFaseTime').innerHTML = fase;

  el('bIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(inp.nama || '\u2014') + '</b></div>'
    + '<div>Usia masuk<b>' + r.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + (riderAktifBsl
      ? '<div>Plan<b>BeSMART Lite ' + inp.mpp + '-100</b></div>'
        + '<div>Cara bayar<b>' + inp.metode + '</b></div>'
        + '<div>Lama bayar premi dasar + Lite UP<b>' + inp.mpp + ' tahun</b></div>'
        + '<div>Total premi per ' + satuan + '<b>' + rp(premiGabunganBsl) + '</b></div>'
      : '<div>Masa bayar<b>' + inp.mpp + ' tahun, ' + inp.metode + '</b></div>');

  const ghpManfaatBsl = (riderAktifBsl && planBsl && window.InsuranceHubGhpAturan && typeof window.InsuranceHubGhpAturan.manfaatPlan === 'function')
    ? window.InsuranceHubGhpAturan.manfaatPlan(planBsl) : null;
  const ghpNcb = (riderAktifBsl && window.InsuranceHubGHP && ghpManfaatBsl)
    ? window.InsuranceHubGHP.ncb(ghpManfaatBsl.booster) : [];
  const ghpNcd = (riderAktifBsl && window.InsuranceHubGHP)
    ? window.InsuranceHubGHP.NCD : [];
  /* Ringkasan GHP — struktur informasi mengikuti referensi ilustrasi GHP,
     tetapi seluruh angka/manfaat tetap mengambil DATA_GHP + engine yang sama. */
  const ghpDetail = riderAktifBsl
    ? (function () {
        const m = ghpManfaatBsl;
        const ncb = ghpNcb;
        const ncd = ghpNcd;
        const limitDasar = m ? Number(m.booster || 0) : 0;
        const premiGhpTahunan = inp.metode === 'Bulanan' ? premiGhpBsl * 12 : premiGhpBsl;
        const hematNcdTertinggi = premiGhpTahunan * 0.15;
        const ncbRows = ncb.length ? ncb.map(function (x) {
          const pct = Math.round((Number(x.kenaikan) || 0) * 100);
          return '<tr><td>' + (x.tahun === 0 ? 'Dasar' : 'Tahun ' + x.tahun) + '</td>'
            + '<td class="kanan">' + pct + '%</td>'
            + '<td class="kanan">' + rp(x.nilai) + '</td></tr>';
        }).join('') : '';
        const ncdRows = ncd.map(function (x) {
          return '<tr><td>' + esc(x.lama) + '</td><td class="kanan">' + Math.round((Number(x.diskon) || 0) * 100) + '%</td></tr>';
        }).join('');

        return '<div class="kartu penuh ghp-ringkas-detail">'
          + '<div class="k">Perlindungan Kesehatan Sesuai Tagihan</div>'
          + '<div class="v">GHP — rawat inap dibayar sesuai tagihan menurut plan yang dipilih, ditambah proteksi jiwa dari produk dasar.</div>'
          + '<div class="ghp-mini-grid" style="margin-top:10px">'
          + '<div><span>Plan kesehatan</span><b>' + esc(planBsl || '—') + '</b></div>'
          + '<div><span>Kamar</span><b>' + esc(m ? (m.kamar || '—') : '—') + '</b></div>'
          + '<div><span>Wilayah</span><b>' + esc(m ? (m.wilayah || '—') : '—') + '</b></div>'
          + '<div><span>Limit tahunan</span><b>' + (m ? rp(m.limit) : '—') + '</b></div>'
          + '<div><span>Limit booster</span><b>' + (m ? rp(m.booster) : '—') + '</b></div>'
          
          + '</div>'

          + '<div class="ghp-subjudul">Rincian Premi Rider</div>'
          + '<div class="k">Premi GHP saat usia masuk: <b>' + rp(premiGhpBsl) + ' / ' + satuan + '</b>.</div>'
          + '<div class="k">Premi kesehatan dibayar selama polis/rider aktif. Setelah masa bayar UP Dasar dan Lite UP selesai, premi GHP tetap berjalan selama masa perlindungan yang berlaku.</div>'

          + '<div class="ghp-subjudul">Reward Tanpa Klaim</div>'
          + '<div class="k"><b>NCB — kenaikan limit booster tanpa klaim</b></div>'
          + '<div class="gulir"><table class="tahunan ghp-mini-table"><thead><tr><th>Tahun polis tanpa klaim</th><th class="kanan">Kenaikan</th><th class="kanan">Limit booster</th></tr></thead><tbody>'
          + ncbRows
          + '</tbody></table></div>'
          + '<div class="k catatan">Kenaikan 10% dari limit booster dasar setiap ulang tahun polis tanpa klaim, maksimal 5 kali atau 50%, sesuai ketentuan rider.</div>'

          + '<div class="k" style="margin-top:10px"><b>NCD — diskon premi tahun berikutnya</b></div>'
          + '<div class="gulir"><table class="tahunan ghp-mini-table"><thead><tr><th>Tanpa klaim berturut-turut</th><th class="kanan">Diskon</th></tr></thead><tbody>'
          + ncdRows
          + '</tbody></table></div>'

          + '<div class="ghp-subjudul">Masa Tunggu</div>'
          + '<div class="gulir"><table class="tahunan ghp-mini-table"><thead><tr><th>Jenis risiko</th><th>Masa tunggu</th></tr></thead><tbody>'
          + '<tr><td>Perawatan rumah sakit karena kecelakaan</td><td>Tidak ada masa tunggu</td></tr>'
          + '<tr><td>Sakit akut seperti DB, tipus, infeksi virus</td><td>30 hari</td></tr>'
          + '<tr><td>Sakit kronis seperti kanker, jantung, stroke, darah tinggi, diabetes, usus buntu, TBC</td><td>12 bulan</td></tr>'
          + '<tr><td>Contestable period</td><td>24 bulan — sebelum lewat, klaim dapat diarahkan ke reimbursement</td></tr>'
          + '</tbody></table></div>'
          + (window.InsuranceHubTunggu12 ? window.InsuranceHubTunggu12.html() : '')

          + '<div class="k" style="margin-top:10px"><b>* Premi GHP pada timeline:</b> mulai tahun ke-2, angka yang ditampilkan merupakan gambaran berdasarkan usia masuk. Premi aktual dapat berubah mengikuti pertambahan usia dan tarif yang berlaku.</div>'
          + '<div class="k" style="margin-top:6px"><b>** Repricing:</b> tarif rider kesehatan dapat mengalami penyesuaian sesuai ketentuan yang berlaku, termasuk bila biaya pelayanan kesehatan dan rumah sakit meningkat.</div>'
          + '</div>';
      }()) : '';

  el('bKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi produk dasar per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + '</div></div>'
    + (riderAktifBsl
      ? '<div class="kartu"><div class="k">Premi GHP per ' + satuan + '</div><div class="v angka">' + rp(premiGhpBsl) + ' *</div></div>'
      : '<div class="kartu"><div class="k">' + (inp.metode === 'Bulanan' ? 'Premi per Tahun' : 'Premi Tahunan') + '</div><div class="v angka">' + rp(r.premiPerTahun) + '</div></div>')
    + (riderAktifBsl
      ? (function(){
          const premiDasarTahunan = inp.metode === 'Bulanan' ? r.premiSesuaiMetode * 12 : r.premiSesuaiMetode;
          const premiGhpTahunan = inp.metode === 'Bulanan' ? premiGhpBsl * 12 : premiGhpBsl;
          const totalPremiTahunan = premiDasarTahunan + premiGhpTahunan;
          /* Saat cara bayar bulanan, yang paling dicari nasabah adalah total
             yang keluar tiap bulan, bukan totalnya setahun. */
          const totalPerBulan = (inp.metode === 'Bulanan')
            ? '<div class="kartu penuh"><div class="k">TOTAL PREMI PER BULAN *</div>'
              + '<div class="v angka">' + rp(r.premiSesuaiMetode + premiGhpBsl) + ' *</div>'
              + '<div class="k" style="margin-top:6px">Premi produk dasar '
              + rp(r.premiSesuaiMetode) + ' + premi GHP ' + rp(premiGhpBsl) + '.</div></div>'
            : '';
          return totalPerBulan
            + '<div class="kartu penuh"><div class="k">TOTAL PREMI PER TAHUN *</div>'
            + '<div class="v angka">' + rp(totalPremiTahunan) + ' *</div>'
            + '<div class="k" style="margin-top:6px">* Premi asuransi kesehatan GHP tidak mengikat.</div></div>';
        }())
      : '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + inp.mpp + ' tahun</div></div>'
        + '<div class="kartu"><div class="k">Total dibayar</div><div class="v angka">' + rp(r.totalSesuaiMetode) + '</div></div>')
    + '<div class="kartu penuh"><div class="k">Manfaat meninggal dunia sampai usia 100</div>'
    + '<div class="v angka">' + rp(r.manfaatMeninggal) + '</div>'
    + '<div class="k" style="margin-top:6px">Manfaat hidup di usia 100: <b>'
    + rp(r.manfaatHidup) + '</b></div></div>'
    + ghpDetail
    + '</div>';

  /* Tabel timeline: tetap memakai seluruh data engine, tetapi tampilan diringkas
     setelah usia 70 agar tidak menjadi puluhan/100 baris saat dibaca atau dicetak. */
  const GHP_USIA_AKHIR = 90;
  const premiGhpPerTahun = riderAktifBsl
    ? (inp.metode === 'Bulanan' ? premiGhpBsl * 12 : premiGhpBsl) : 0;

  function barisTimelineTampil(b) {
    // Sampai usia 70 ditampilkan lengkap; setelah itu cukup setiap 5 tahun.
    return b.usia <= 70 || b.usia === 100 || (b.usia > 70 && b.usia % 5 === 0);
  }

  const timelineTampil = r.timeline.filter(barisTimelineTampil);
  let akumBsl = 0;
  const htmlTimeline = r.timeline.map(function (b) {
    const rider = (riderAktifBsl && b.usia <= GHP_USIA_AKHIR) ? premiGhpPerTahun : 0;
    const totalTh = b.kontribusi + rider;
    akumBsl += totalTh;
    if (!barisTimelineTampil(b)) return '';
    const bayar = b.status === 'Bayar' || rider > 0;
    // Mulai tahun ke-2, tanda * menunjukkan premi GHP adalah gambaran berdasarkan
    // usia masuk; premi aktual dapat berubah mengikuti usia/tarif yang berlaku.
    const tandaGhp = rider ? (b.tahun >= 2 ? ' *' : '') : '';
    return '<tr class="' + (bayar ? 'bayar' : '')
      + (b.keterangan ? ' tandai' : '') + '">' 
      + '<td>' + b.tahun + '</td><td>' + b.usia + '</td>'
      + '<td>' + (b.status === 'Bayar' ? 'Bayar' : (rider > 0 ? 'Rider saja' : 'Lunas')) + '</td>'
      + '<td class="kanan angka">' + (b.kontribusi ? rp(b.kontribusi) : '—') + '</td>'
      + (riderAktifBsl
        ? '<td class="kanan angka">' + (rider ? rp(rider) + tandaGhp : '—') + '</td>'
          + '<td class="kanan angka">' + (totalTh ? rp(totalTh) : '—') + '</td>'
        : '')
      + '<td class="kanan angka">' + rp(akumBsl) + '</td>'
      + '<td class="kanan angka">' + rp(b.manfaatMeninggal) + '</td>'
      + '<td>' + b.keterangan + '</td></tr>';
  }).join('');

  el('bTabel').innerHTML =
    '<thead><tr><th>Thn</th><th>Usia</th><th>Status</th>'
    + '<th class="kanan">Premi dasar</th>'
    + (riderAktifBsl ? '<th class="kanan">Premi rider GHP</th><th class="kanan">Total per tahun</th>' : '')
    + '<th class="kanan">Akumulasi</th>'
    + '<th class="kanan">Manfaat meninggal</th><th>Keterangan</th></tr></thead><tbody>'
    + htmlTimeline
    + '</tbody>';

  el('bCatatanTabel').textContent = 'Tabel memuat ' + r.timeline.length + ' tahun polis, dari usia ' + r.usia + ' sampai 100 tahun. '
    + 'Sampai usia 70 ditampilkan per tahun; setelah usia 70 diringkas tiap 5 tahun (75, 80, 85, 90, 95, 100). '
    + 'Kolom kontribusi memakai angka setahun ' + (inp.metode === 'Bulanan' ? '(premi bulanan dikali 12).' : '(premi tahunan).')
    + (riderAktifBsl
      ? ' * Mulai tahun ke-2, premi GHP pada tabel adalah gambaran berdasarkan usia masuk; kontribusi aktual dapat berubah mengikuti pertambahan usia dan tarif yang berlaku. ** Tarif rider kesehatan juga dapat mengalami penyesuaian/repricing sesuai ketentuan yang berlaku, termasuk apabila biaya pelayanan kesehatan dan rumah sakit meningkat.'
      : '');

  el('bSangkalan').textContent = 'Ilustrasi ini dihitung dari tarif yang berlaku saat ini dan '
    + 'dipakai untuk membantu penjelasan produk kepada calon nasabah. Bukan bagian dari polis '
    + 'dan tidak mengikat secara hukum. Nilai final tunduk pada Ketentuan Polis resmi '
    + 'PT Asuransi Jiwa Generali Indonesia dan hasil underwriting.';

  const na = el('bAgenNama').value, hp = el('bAgenHP').value;
  el('bKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function bAturan(inp) {
  el('bAturan').innerHTML =
  '<details><summary>Cara premi dihitung</summary><div class="isi"><ul>'
  + '<li>Tarif premi diambil dari database BeSMART Lite lengkap berdasarkan usia masuk, jenis kelamin, dan masa bayar yang tersedia: 3, 5, 10, 15, dan 20 tahun.</li>'
  + '<li>UP Dasar merupakan uang pertanggungan jiwa produk utama. Minimum UP Dasar yang dihitung di kalkulator ini adalah Rp50 juta.</li>'
  + '<li>Jika Lite UP diaktifkan, Rider Lite UP memberikan tambahan 400% dari UP Dasar. Total UP menjadi 500% dari UP Dasar.</li>'
  + '<li>Premi UP Dasar dan Lite UP dihitung terpisah dari database, lalu dijumlahkan sesuai pilihan metode pembayaran.</li>'
  + '<li>Untuk pembayaran tahunan, premi tahunan dihitung sebesar 11 kali premi bulanan.</li>'
  + '</ul></div></details>'

  + '<details><summary>Manfaat polis</summary><div class="isi"><ul>'
  + '<li>Proteksi jiwa berjalan sampai usia 100 tahun.</li>'
  + '<li>Masa bayar dapat dipilih 3, 5, 10, 15, atau 20 tahun sesuai ketersediaan tarif dan batas usia masuk pada database.</li>'
  + '<li>Setelah masa bayar selesai, perlindungan tetap berjalan sampai usia 100 tahun tanpa membayar premi produk dasar lagi.</li>'
  + '<li>Jika tertanggung meninggal dunia selama masa perlindungan, manfaat meninggal mengikuti total uang pertanggungan yang berlaku pada pilihan UP.</li>'
  + '<li>Jika tertanggung hidup sampai usia 100 tahun, manfaat hidup dibayarkan sebesar 100% uang pertanggungan yang berlaku.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas kalkulator ini</summary><div class="isi"><ul>'
  + '<li>Usia masuk mengikuti ketersediaan tarif pada database untuk masing-masing masa bayar dan jenis kelamin.</li>'
  + '<li>Untuk total uang pertanggungan di atas Rp2 miliar, premi final berpotensi berbeda dari hasil kalkulator. Periksa ilustrasi resmi perusahaan atau iPropose.</li>'
  + '<li>Seluruh angka mengambil database master BeSMART Lite yang digunakan oleh mesin kalkulator ini.</li>'
  + '</ul></div></details>';
}

bGambar();


/* ============ Cristal Prime ============ */
el('cUP').addEventListener('input', () => {
  const kotak = el('cUP');
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  cGambar();
});
['cNama', 'cTgl', 'cAgenNama', 'cAgenHP'].forEach(id =>
  el(id).addEventListener('input', cGambar));
['cJK', 'cBayar', 'cLindung', 'cMetode'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  cGambar();
}));



function cGambar() {
  const tgl = el('cTgl').value;
  const up = bAngka(el('cUP').value);
  const inp = {
    nama: el('cNama').value,
    jk: nilaiSegmen('cJK'),
    tglLahir: tgl ? new Date(tgl + 'T00:00:00Z') : null,
    lamaBayar: +nilaiSegmen('cBayar'),
    lamaLindung: +nilaiSegmen('cLindung'),
    metode: nilaiSegmen('cMetode'),
    up: up,
  };
  cAturan();

  if (!tgl || !up) {
    el('cInfoUsia').textContent = !tgl
      ? 'Isi tanggal lahir untuk menghitung usia.'
      : 'Isi uang pertanggungan untuk melihat premi.';
    ['cHasil', 'cFase', 'cFaseIlus', 'cIdentitas', 'cKotakRingkas', 'cTabel', 'cKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('cSangkalan').textContent = '';
    el('cCatatanTabel').textContent = '';
    return;
  }

  const r = crisHitung(inp, TARIF_CRIS);
  const satuan = inp.metode === 'Bulanan' ? 'bulan' : 'tahun';
  el('cInfoUsia').textContent = 'Usia ' + r.usia + ' tahun'
    + (inp.nama ? ' \u2022 ' + inp.nama : '');

  if (!r.tersedia) {
    el('cHasil').innerHTML = '<div class="peringatan">' + esc(r.alasan) + '</div>';
    ['cFase', 'cFaseIlus', 'cIdentitas', 'cKotakRingkas', 'cTabel', 'cKakiAgen']
      .forEach(i => el(i).innerHTML = '');
    el('cSangkalan').textContent = '';
    el('cCatatanTabel').textContent = '';
    return;
  }

  el('cHasil').innerHTML =
    '<div class="sorotan"><div class="k">Yang dibayar nasabah</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + ' <small>/' + satuan + '</small></div>'
    + '<div class="t">Dibayar selama ' + inp.lamaBayar + ' tahun, perlindungan berjalan '
    + inp.lamaLindung + ' tahun. Total ' + rp(r.totalDibayar) + '.</div></div>'
    + '<div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + '</div></div>'
    + '<div class="kartu"><div class="k">UP sakit kritis</div>'
    + '<div class="v angka">' + rp(r.upKritis) + '</div></div>'
    + '<div class="kartu"><div class="k">Bonus 20% (maks Rp200 jt)</div>'
    + '<div class="v angka">' + rp(r.bonus) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Total manfaat sakit kritis</div>'
    + '<div class="v angka">' + rp(r.totalKritis) + '</div></div>'
    + '<div class="kartu"><div class="k">Manfaat Angioplasty</div>'
    + '<div class="v angka">' + rp(r.angioplasty) + '</div></div>'
    + '<div class="kartu"><div class="k">Sisa UP setelah Angioplasty</div>'
    + '<div class="v angka">' + rp(r.sisaSetelahAngio) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Jika sehat sampai akhir kontrak ('
    + Math.round(r.rop * 100) + '% premi)</div>'
    + '<div class="v angka">' + rp(r.akhirKontrak) + '</div>'
    + '<div class="k" style="margin-top:6px">Nilai yang sama juga menjadi manfaat meninggal dunia.</div></div>'
    + '<div class="kartu penuh"><div class="k">Kode plan</div>'
    + '<div class="v">' + esc(r.kodePlan) + '</div>'
    + '<div class="k" style="margin-top:6px">Tarif dasar per Rp500 juta: <b>'
    + rp(r.tarifDasar) + '</b></div></div></div>';

  const fase =
    '<div class="tahap"><b>Tahun 1 sampai ' + inp.lamaBayar + '</b>'
    + '<span>Membayar ' + rp(r.premiSesuaiMetode) + ' per ' + satuan
    + '. Total ' + rp(r.totalDibayar) + '.</span></div>'
    + '<div class="tahap"><b>Kalau terdiagnosa salah satu dari 66 kondisi kritis</b>'
    + '<span>Manfaat dibayar ' + rp(r.totalKritis) + ', yaitu UP ' + rp(r.upKritis)
    + ' ditambah bonus ' + rp(r.bonus) + '.</span></div>'
    + '<div class="tahap"><b>Kalau yang terjadi Angioplasty (pasang ring jantung)</b>'
    + '<span>Dibayar ' + rp(r.angioplasty) + '. Sisa manfaat kritis untuk klaim berikutnya menjadi '
    + rp(r.sisaSetelahAngio) + '.</span></div>'
    + '<div class="tahap tenang"><b>Kalau tetap sehat sampai tahun ke-' + inp.lamaLindung + '</b>'
    + '<span>Dana kembali ' + rp(r.akhirKontrak) + ', setara '
    + Math.round(r.rop * 100) + '% dari total premi yang dibayarkan.</span></div>';
  el('cFase').innerHTML = fase;
  el('cFaseIlus').innerHTML = fase;

  el('cIdentitas').innerHTML =
    '<div>Nama nasabah<b>' + esc(inp.nama || '\u2014') + '</b></div>'
    + '<div>Usia<b>' + r.usia + ' tahun</b></div>'
    + '<div>Jenis kelamin<b>' + inp.jk + '</b></div>'
    + '<div>Plan<b>CP ' + inp.lamaBayar + '-' + inp.lamaLindung + '</b></div>';

  el('cKotakRingkas').innerHTML =
    '<h2>Ringkasan</h2><div class="ikhtisar">'
    + '<div class="kartu"><div class="k">Premi per ' + satuan + '</div>'
    + '<div class="v angka">' + rp(r.premiSesuaiMetode) + '</div></div>'
    + '<div class="kartu"><div class="k">' + (inp.metode === 'Bulanan' ? 'Premi per Tahun' : 'Premi Tahunan') + '</div>'
    + '<div class="v angka">' + rp(r.premiPerTahun) + '</div></div>'
    + '<div class="kartu"><div class="k">Lama bayar</div><div class="v angka">' + inp.lamaBayar + ' tahun</div></div>'
    + '<div class="kartu"><div class="k">Total dibayar</div>'
    + '<div class="v angka">' + rp(r.totalDibayar) + '</div></div>'
    + '<div class="kartu penuh"><div class="k">Total manfaat sakit kritis</div>'
    + '<div class="v angka">' + rp(r.totalKritis) + '</div>'
    + '<div class="k" style="margin-top:6px">Jika sehat sampai akhir kontrak: <b>'
    + rp(r.akhirKontrak) + '</b></div></div></div>';

  el('cTabel').innerHTML =
    '<thead><tr><th>Thn</th><th class="kanan">Premi setahun</th>'
    + '<th class="kanan">Dana kembali jika sehat</th>'
    + '<th class="kanan">Manfaat sakit kritis</th>'
    + '<th class="kanan">Manfaat meninggal</th></tr></thead><tbody>'
    + r.ilustrasi.map(b =>
        '<tr class="' + (b.premi ? 'bayar' : '') + (b.pengembalian ? ' tandai' : '') + '">'
        + '<td>' + b.tahun + '</td>'
        + '<td class="kanan angka">' + (b.premi ? rp(b.premi) : '\u2014') + '</td>'
        + '<td class="kanan angka">' + (b.pengembalian ? rp(b.pengembalian) : '\u2014') + '</td>'
        + '<td class="kanan angka">' + rp(b.manfaatKritis) + '</td>'
        + '<td class="kanan angka">' + rp(b.manfaatMeninggal) + '</td></tr>').join('')
    + '<tr class="tandai"><td>Total</td>'
    + '<td class="kanan angka">' + rp(r.totalPremiIlustrasi) + '</td>'
    + '<td class="kanan angka">' + rp(r.akhirKontrak) + '</td>'
    + '<td class="kanan angka">' + rp(r.totalKritis) + '</td><td></td></tr></tbody>';

  el('cCatatanTabel').textContent = 'Tabel memuat ' + inp.lamaLindung + ' tahun kontrak. '
    + 'Kolom premi memakai angka setahun '
    + (inp.metode === 'Bulanan' ? '(premi bulanan dikali 12).' : '(premi tahunan).');

  el('cSangkalan').textContent = 'Ilustrasi ini dihitung dari tarif yang berlaku saat ini dan '
    + 'dipakai untuk membantu penjelasan produk kepada calon nasabah. Bukan bagian dari polis '
    + 'dan tidak mengikat secara hukum. Daftar 66 kondisi kritis, definisi tiap kondisi, dan '
    + 'masa tunggu mengikuti Ketentuan Polis resmi PT Asuransi Jiwa Generali Indonesia.';

  const na = el('cAgenNama').value, hp = el('cAgenHP').value;
  el('cKakiAgen').innerHTML = kakiAgenHtml(na, hp);
}

function cAturan() {
  el('cAturan').innerHTML =
  '<details><summary>Cara premi dihitung</summary><div class="isi"><ul>'
  + '<li>Tarif dasar diambil dari database Cristal Prime sesuai usia, jenis kelamin, lama bayar, dan lama perlindungan, dinyatakan per Rp500 juta uang pertanggungan.</li>'
  + '<li>Premi bulanan = uang pertanggungan dibagi Rp500 juta, dikali tarif dasar.</li>'
  + '<li>Premi tahunan dihitung 11 kali premi bulanan.</li>'
  + '<li>Database memuat usia 0 sampai 60 tahun, lama bayar 3, 5, atau 10 tahun, dan lama perlindungan 15, 20, atau 25 tahun.</li>'
  + '<li>Usia di sini dibulatkan ke ulang tahun terdekat: bertambah satu begitu lewat setengah tahun sejak ulang tahun terakhir.</li>'
  + '</ul></div></details>'

  + '<details><summary>Manfaat polis</summary><div class="isi"><ul>'
  + '<li>Perlindungan mencakup hingga 66 kondisi penyakit kritis sesuai ketentuan polis.</li>'
  + '<li>Manfaat sakit kritis dibayar sebesar uang pertanggungan ditambah bonus 20%, dengan bonus dibatasi Rp200 juta.</li>'
  + '<li>Khusus Angioplasty atau pasang ring jantung, yang dibayar 10% dari uang pertanggungan, maksimal Rp200 juta.</li>'
  + '<li>Pembayaran manfaat Angioplasty mengurangi sisa manfaat kritis untuk klaim berikutnya.</li>'
  + '<li>Jika tetap sehat sampai akhir kontrak, dana dikembalikan: 120% untuk 15 tahun, 135% untuk 20 tahun, 150% untuk 25 tahun, dihitung dari total premi.</li>'
  + '<li>Nilai pengembalian itu juga menjadi besaran manfaat meninggal dunia karena sebab apa pun.</li>'
  + '</ul></div></details>'

  + '<details><summary>Batas kalkulator ini</summary><div class="isi"><ul>'
  + '<li>Daftar lengkap 66 kondisi kritis, definisi medisnya, dan masa tunggu ada di Ketentuan Polis, tidak di kalkulator ini.</li>'
  + '<li>Seluruh angka mengambil database master yang sama dengan file Excel Insurance Hub.</li>'
  + '</ul></div></details>';
}

cGambar();


/* ============ New Cemerlang Prime ============ */
el('mUP').addEventListener('input', () => {
  const kotak = el('mUP');
  const n = bAngka(kotak.value);
  kotak.value = n ? n.toLocaleString('id-ID') : '';
  mGambar();
});
['mNama', 'mTgl', 'mAgenNama', 'mAgenHP'].forEach(id =>
  el(id).addEventListener('input', mGambar));
['mJK', 'mBayar', 'mLindung', 'mMetode'].forEach(id => el(id).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  el(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  mGambar();
}));



// ===== STEP 9 startup =====
// Pendaftaran service worker dan bangunAntarmuka() sudah dilakukan di atas.
// Blok kembar di sini sengaja dikosongkan agar tidak berjalan dua kali.

/* ================= STEP 10: NEEDS ANALYSIS + PRODUCT COMPARISON ================= */
const NA_KEY = 'insuranceHub.needsAnalysis.v2';
function naKey(){ const p=naActiveProfile(); return p ? NA_KEY+':'+p.id : NA_KEY+':standalone'; }
function naRpValue(id){ return bAngka(el(id)?.value || ''); }
function naSetRp(id,n){ if(el(id)) el(id).value = n ? Math.round(n).toLocaleString('id-ID') : ''; }
function naActiveProfile(){ return window.InsuranceHubCustomerProfile?.active?.() || null; }
let naProfilTerakhir = null;
function needsLoadActiveProfile(paksa){
  const p=naActiveProfile();
  if(!p) {
    if(el('naProfilInfo')) el('naProfilInfo').innerHTML='Belum ada profil aktif. <b>Semua field tetap bisa diisi manual.</b>';
    return;
  }
  if(!paksa && p && naProfilTerakhir===p.id) return;
  naProfilTerakhir=p.id;

  const s=p.snapshot||{}; const children=Array.isArray(p.children)?p.children:[];
  if(el('naProfilInfo')) el('naProfilInfo').innerHTML='Profil aktif: <b>'+esc(p.nama)+'</b>. Data bertanda <b>✓ dari profil</b> diisi otomatis dan tetap bisa diubah khusus untuk analisis ini.';

  // Load the saved analysis for THIS profile first, then overlay the profile's
  // financial snapshot. This prevents an older saved analysis (often containing
  // zeros/old values) from overwriting the current profile's UP/utang/UP CI.
  const prior=needsRead();
  if(prior && prior._profileId===p.id) needsFill(prior);

  const usia=p.tglLahir ? hitungUsiaNA(p.tglLahir) : '';
  if(usia!=='' && el('naUsia')) { el('naUsia').value=usia; el('naUsia').dataset.source='profile'; }
  if(p.penghasilan!=null && el('naPenghasilan')) { naSetRp('naPenghasilan',p.penghasilan||0); el('naPenghasilan').dataset.source='profile'; }
  if(el('naAnak')) { el('naAnak').value=children.length || Number(p.anak||0); el('naAnak').dataset.source='profile'; }

  // Financial snapshot fields are the source of truth whenever the profile
  // actually contains a value. If a field is blank in the profile, leave the
  // analysis field available for manual entry instead of inventing a value.
  const profileUtang = bAngka(s.utang ?? s.totalHutang ?? s.hutang ?? 0);
  const profileKpr = bAngka(s.kpr ?? s.KPR ?? s.sisaKpr ?? s.sisaKPR ?? 0);
  const profileTotalKewajiban = profileUtang + profileKpr;
  if(el('naUtang') && profileTotalKewajiban>0) { naSetRp('naUtang',profileTotalKewajiban); el('naUtang').dataset.source='profile'; }
  if(el('naCoverage') && Number(s.upJiwa||0)>0) { naSetRp('naCoverage',s.upJiwa); el('naCoverage').dataset.source='profile'; }
  if(el('naCI') && Number(s.upCI||0)>0) { naSetRp('naCI',s.upCI); el('naCI').dataset.source='profile'; }
  if(el('naPendidikan') && children.length){
    const edu=children.reduce((a,c)=>a+(Number(c.biayaPendidikanHariIni)||0),0);
    if(edu) { naSetRp('naPendidikan',edu/children.length); el('naPendidikan').dataset.source='profile'; }
  }
}
function hitungUsiaNA(tgl){ return usiaGenerali(tgl); }
function needsRead(){ try{return JSON.parse(localStorage.getItem(naKey())||'null')}catch(_){return null} }
function needsSave(x){try{localStorage.setItem(naKey(),JSON.stringify(x))}catch(_){}
}
function needsFill(x){ if(!x)return; ['naUsia','naAnak','naUsiaPensiun','naMasaPengganti','naCIMonths','naInflasi','naTahunPensiun','naTahunPendidikan'].forEach(id=>{if(el(id)&&x[id]!=null)el(id).value=x[id]}); ['naPenghasilan','naUtang','naCoverage','naCI','naPendidikan','naPensiunBulanan'].forEach(id=>{if(el(id)&&x[id]!=null)naSetRp(id,x[id])}); }
/* Dana pendidikan: biaya hari ini dinaikkan dengan inflasi sampai anak masuk
   kuliah (patokan usia 18). Jaraknya dihitung dari usia MASING-MASING ANAK.
   Sebelumnya dipakai usia nasabah, sehingga inflasi tidak pernah berlaku. */
const USIA_MASUK_KULIAH = 18;
function hitungDanaPendidikan(biayaPerAnak, jumlahAnak, inflasi){
  if(!biayaPerAnak) return {total:0, cara:'Belum ada perkiraan biaya pendidikan.'};
  const p = naActiveProfile();
  const anakProfil = (p && Array.isArray(p.children) ? p.children : [])
    .filter(c => c && c.tglLahir);

  if(anakProfil.length){
    let total = 0; const rinci = [];
    anakProfil.forEach(c => {
      const usiaAnak = Math.max(0, Number(usiaGenerali(c.tglLahir)) || 0);
      const tahun = Math.max(0, USIA_MASUK_KULIAH - usiaAnak);
      total += biayaPerAnak * Math.pow(1+inflasi, tahun);
      rinci.push((c.nama || 'Anak') + ' ' + usiaAnak + ' th, ' + tahun + ' th lagi');
    });
    return {total, cara:'Dihitung per anak sampai usia '+USIA_MASUK_KULIAH+
      ' tahun: '+rinci.join('; ')+'.'};
  }

  // Tidak ada tanggal lahir anak di profil: pakai jarak waktu yang diisi agen.
  const tahun = Math.max(0, Number(el('naTahunPendidikan')?.value || 0));
  return {
    total: biayaPerAnak * jumlahAnak * Math.pow(1+inflasi, tahun),
    cara: jumlahAnak + ' anak, dana dibutuhkan ' + tahun + ' tahun lagi. ' +
      'Isi tanggal lahir anak di profil agar dihitung per anak.'
  };
}

function needsCalculate(){
  const usia=Math.max(0,Number(el('naUsia')?.value||0)), income=naRpValue('naPenghasilan'), anak=Math.max(0,Number(el('naAnak')?.value||0));
  const pensiunUsia=Math.max(40,Number(el('naUsiaPensiun')?.value||60)), masa=Math.max(1,Number(el('naMasaPengganti')?.value||10));
  const utang=naRpValue('naUtang'), coverage=naRpValue('naCoverage'), ci=naRpValue('naCI'), pendidikan=naRpValue('naPendidikan');
  const ciMonths=Math.max(1,Number(el('naCIMonths')?.value||36));
  const inflasi=Math.max(0,Number(el('naInflasi')?.value||5))/100, pensiunBulanan=naRpValue('naPensiunBulanan'), tahunPensiun=Math.max(5,Number(el('naTahunPensiun')?.value||25));
  const edu=hitungDanaPendidikan(pendidikan,anak,inflasi);
  const pendidikanFuture=edu.total;
  const proteksi=Math.max(0,income*12*masa+utang+pendidikanFuture-coverage);
  const ciTarget=Math.max(0,income*ciMonths-ci);
  const pensiunFutureMonthly=pensiunBulanan*Math.pow(1+inflasi, Math.max(0,pensiunUsia-usia));
  const pensiunTarget=pensiunFutureMonthly*12*tahunPensiun;
  const profile=naActiveProfile();
  const result={usia,income,anak,pensiunUsia,masa,utang,coverage,ci,ciMonths,pendidikan,inflasi,pensiunBulanan,tahunPensiun,pendidikanFuture,eduCara:edu.cara,proteksi,ciTarget,pensiunFutureMonthly,pensiunTarget,_profileId:profile?.id||null,calculatedAt:new Date().toISOString()};
  needsSave(result); renderNeeds(result); renderComparison(result); bukaLayar('NEEDS');
}
function naCetak(){
  const p=(typeof naActiveProfile==='function')?naActiveProfile():null;
  const nama=(p&&p.nama)?p.nama:'Nasabah';
  const judul='Analisis Kebutuhan - '+String(nama).replace(/[\\/:*?"<>|]/g,'').trim();
  if(typeof cetak==='function'){ cetak(judul); return; }
  window.print();
}

function renderNeeds(r){
  if(!el('naHasil'))return;
  const cards=[['Kebutuhan proteksi jiwa',rpSingkat(r.proteksi),'Pendekatan: pengganti penghasilan + utang − UP yang sudah dimiliki.'],['Kebutuhan critical illness',rpSingkat(r.ciTarget),'Patokan awal '+r.ciMonths+'× penghasilan bulanan − UP CI yang sudah dimiliki.']];
  el('naHasil').innerHTML='<h2>Hasil analisis awal</h2><div class="na-kartu-grid">'+cards.map(c=>'<div class="na-kartu"><div class="k">'+esc(c[0])+'</div><div class="v angka">'+c[1]+'</div><p class="catatan">'+esc(c[2])+'</p></div>').join('')+'</div>'
  +'<p class="catatan" style="margin-top:12px">Ini adalah kebutuhan awal untuk percakapan perencanaan. Bukan keputusan underwriting, bukan jaminan manfaat, dan bukan pengganti ilustrasi resmi produk.</p>'
  +'<div class="aksi-row tanpa-cetak" style="margin-top:12px">'
  +'<button class="aksi" id="naTblCetak" type="button">Cetak / simpan PDF</button>'
  +'<button class="sakelar" id="naSolusi" type="button">Solusi</button></div>';
  const tblCetakNa=el('naTblCetak');
  if(tblCetakNa) tblCetakNa.addEventListener('click', naCetak);
  const sol=el('naSolusi'); if(sol) sol.addEventListener('click',()=>bukaLayar('COMPARE'));
  // Tombol salin prompt flyer menempel sendiri di sebelah tombol cetak.
  if(window.InsuranceHubPromptFlyer) setTimeout(()=>window.InsuranceHubPromptFlyer.tempelkan(),20);
}
function cmpOpenProduct(kode){ const map={LF:'LF',CRIS:'CRIS',GSPA:'GSPA',GHP:'GHP',FLEX:'FLEX',NCP:'CEM'}; if(map[kode]) bukaLayar(map[kode]); }
function renderComparison(r){
  if(!el('cmpSummary')||!el('cmpCards'))return;

  const KEY='insuranceHub.comparison.v6';
  const profile=naActiveProfile ? naActiveProfile() : null;
  const profileName=profile?.nama||'Nasabah';
  const tgl=profile?.tglLahir||'';
  const jk=(profile?.jk||'PRIA').toUpperCase()==='WANITA'?'WANITA':'PRIA';
  const money=v=>Number(v||0).toLocaleString('id-ID');
  const num=v=>Number(String(v??'').replace(/[^\d]/g,''))||0;
  const escHtml=v=>esc(String(v??''));

  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}}
  function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){} return s}

  const initial={
    _profileId:profile?.id||null,customerName:profileName,customerTgl:tgl,customerJk:jk,
    targets:{life:Number(r?.proteksi||0),ci:Number(r?.ciTarget||0),education:Number(r?.pendidikanFuture||0),retirement:Number(r?.pensiunTarget||0)},
    ciMonths:Number(r?.ciMonths||36),scenarios:[]
  };
  let state=read();
  if(!state||state._profileId!==(profile?.id||null)) state=initial;
  else {
    state.targets={...state.targets,life:Number(r?.proteksi||state.targets.life||0),ci:Number(r?.ciTarget||state.targets.ci||0),
      education:Number(r?.pendidikanFuture||state.targets.education||0),retirement:Number(r?.pensiunTarget||state.targets.retirement||0)};
    state.ciMonths=Number(r?.ciMonths||state.ciMonths||36);
    state.customerName=profileName;state.customerTgl=tgl;state.customerJk=jk;
  }
  save(state);

  const products={
    life:[
      {key:'GSPA',name:'Gen Aman',pay:[5,10]},
      {key:'NCP',name:'New Cemerlang Prime',pay:[3,5,10]},
      {key:'BSL',name:'BeSMART Lite 100',pay:[3,5,10,15,20]},
      {key:'FLEX',name:'iFLEXYGUARD',pay:[5,10]}
    ],
    ci:[
      {key:'CRIS',name:'Cristal Prime',pay:[3,5,10],protect:[15,20,25]}
    ]
  };
  function listProducts(type){return products[type]||[]}
  function getProduct(type,key){return listProducts(type).find(x=>x.key===key)}
  function targetFor(type){return Number(state.targets[type]||0)}
  function setSeg(id,value){
    const n=el(id); if(!n)return;
    const b=n.querySelector('button[data-nilai="'+value+'"]');
    if(b)n.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
  }

  /* Tabel simulasi pembebasan kontribusi Gen Aman.
     Menjawab pertanyaan yang paling sering muncul saat presentasi: "kalau
     saya sakit kritis di tahun ke-N, sisa kontribusi yang dibebaskan berapa?"
     Yang dibebaskan hanya kontribusi santunan dasar — kontribusi waiver
     sendiri tetap harus dibayar, sesuai ketentuan polis. */
  function cmpTabelWaiverGSPA(rr, sc, waiverPerSetoran){
    const mpp = Number(sc.paymentTerm||0);
    if(!mpp) return '';
    const bulanan = (sc.metode==='Bulanan');
    const dasarPerTahun = bulanan ? Number(rr.bulanan||0)*12 : Number(rr.tahunan||0);
    const usiaMasuk = Number(rr.usia||0);
    let baris = '';
    for(let th=1; th<mpp; th++){
      const sisaTahun = Math.max(0, mpp - th);
      const dibebaskan = Math.round(dasarPerTahun * sisaTahun);
      baris += '<tr><td>Tahun ke-' + th + (usiaMasuk ? ' (usia ' + (usiaMasuk+th-1) + ')' : '') + '</td>'
        + '<td class="kanan angka">' + sisaTahun + ' tahun</td>'
        + '<td class="kanan angka">' + rp(dibebaskan) + '</td></tr>';
    }
    return '<div class="blok" style="margin-top:12px"><h3>Bila terdiagnosa penyakit kritis</h3>'
      + '<p class="catatan">Kontribusi santunan dasar yang BELUM dibayar dibebaskan sampai akhir masa bayar. Sisa masa bayar dihitung setelah premi tahun berjalan dibayar. Premi waiver sendiri tidak ikut dibebaskan karena rider berakhir begitu klaim disetujui. '
      + 'Kontribusi waiver sendiri (' + rp(waiverPerSetoran) + ' per ' + (bulanan?'bulan':'tahun') + ') '
      + 'tetap dibayar, sesuai ketentuan polis.</p>'
      + '<div class="gulir"><table class="tahunan">'
      + '<thead><tr><th>Kejadian pada</th><th class="kanan">Sisa masa bayar</th>'
      + '<th class="kanan">Kontribusi dasar yang dibebaskan</th></tr></thead><tbody>'
      + baris + '</tbody></table></div></div>';
  }

  function calcGSPA(sc){
    if(!tgl)return {ok:false,error:'Tanggal lahir nasabah belum tersedia di Profil Nasabah.'};
    try{
      el('gNama').value=profileName;el('gTgl').value=tgl;el('gUpDasar').value=money(sc.up);el('gPremiNet').value='';
      setSeg('gJK',jk);setSeg('gMpp',String(sc.paymentTerm));setSeg('gMetode',sc.metode||'Tahunan');setSeg('gMode','By UP');
      /* Waiver mengikuti pilihan agen di formulir alternatif, tidak lagi
         dipaksa mati. Sebelumnya baris ini selalu menulis 'Tidak' sehingga
         premi Gen Aman di layar ini selalu tanpa waiver — berbeda dari
         kalkulator Gen Aman aslinya. */
      const pakaiWaiver = sc.pakaiWaiver !== false;
      setSeg('gWakaf','Non Wakaf');setSeg('gRider','Tidak');
      setSeg('gWaiverRider', pakaiWaiver ? 'Ya' : 'Tidak');
      const rr=InsuranceHubEngine.calculate('GSPA',{nama:profileName,jk,tglLahir:new Date(tgl+'T00:00:00Z'),
        mpp:Number(sc.paymentTerm),metode:(sc.metode||'Tahunan'),mode:'By UP',upDasar:Number(sc.up),premiNet:0,modeWakaf:'Non Wakaf',
        nilaiWakaf:0,persenWakaf:0},{rates:DATA_GSPA});
      if(!rr?.tersedia)return {ok:false,error:rr?.alasan||'Gen Aman tidak tersedia.'};
      gGambar();
      const bulanan=(sc.metode==='Bulanan');
      /* Premi waiver dihitung dengan fungsi yang SAMA dipakai layar Gen Aman
         (waiverHitung), bukan menyalin rumusnya, supaya tidak pernah ada dua
         versi rumus yang bisa berbeda. */
      const wv = pakaiWaiver ? waiverHitung(rr.usia, Number(sc.paymentTerm), jk, Number(rr.upDasar||sc.up), rr.diskon) : null;
      const waiverSah = !!(wv && wv.sah);
      /* Dibulatkan ke rupiah penuh di sini. Rumus waiver menghasilkan pecahan
         (mis. Rp3.055.057,9166), dan layar ini menampilkan angka lewat money()
         yang TIDAK membulatkan — berbeda dari layar Gen Aman yang memakai rp().
         Akibatnya premi tampil dengan koma. Pembulatan dilakukan pada nilai
         yang dipakai, bukan di dalam waiverHitung, supaya rumusnya tidak
         tersentuh sama sekali. */
      const waiverBulanan = waiverSah ? Math.round(Number(wv.bulanan||0)) : 0;
      const waiverTahunan = waiverSah ? Math.round(Number(wv.tahunan||0)) : 0;
      const premiTampil=Math.round((bulanan?Number(rr.bulanan||0):Number(rr.tahunan||0))
        + (bulanan?waiverBulanan:waiverTahunan));
      const premiTahunan=Math.round(bulanan?(Number(rr.bulanan||0)+waiverBulanan)*12
        :(Number(rr.tahunan||0)+waiverTahunan));
      const totalDibayar=Math.round(premiTahunan*Number(sc.paymentTerm||0));
      return {ok:true,premium:premiTampil,metode:(sc.metode||'Tahunan'),totalPaid:totalDibayar,result:rr,
        pakaiWaiver:pakaiWaiver, waiverSah:waiverSah,
        waiverPerSetoran:(bulanan?waiverBulanan:waiverTahunan),
        resultHtml:el('gHasil')?.innerHTML||'',phaseHtml:el('gFase')?.innerHTML||'',
        timelineHtml:el('gFaseTime')?.innerHTML||'',detailHtml:(el('gKotakRingkas')?.innerHTML||'')+'<div class="gulir"><table class="tahunan">'+(el('gTabel')?.innerHTML||'')+'</table></div>',
        waiverHtml:(waiverSah?cmpTabelWaiverGSPA(rr,sc,(bulanan?waiverBulanan:waiverTahunan)):'')};
    }catch(e){return {ok:false,error:e?.message||'Gen Aman gagal dihitung.'}}
  }

  function calcNCP(sc){
    if(!tgl)return {ok:false,error:'Tanggal lahir nasabah belum tersedia di Profil Nasabah.'};
    try{
      el('mNama').value=profileName;el('mTgl').value=tgl;el('mUP').value=money(sc.up);
      setSeg('mJK',jk);setSeg('mBayar',String(sc.paymentTerm));setSeg('mLindung',String(sc.protectionTerm||25));setSeg('mMetode',sc.metode||'Tahunan');
      const rr=InsuranceHubEngine.calculate('NCP',{nama:profileName,jk,tglLahir:new Date(tgl+'T00:00:00Z'),
        lamaBayar:Number(sc.paymentTerm),lamaLindung:Number(sc.protectionTerm||25),metode:(sc.metode||'Tahunan'),up:Number(sc.up)},{rates:TARIF_CEM});
      if(!rr?.tersedia)return {ok:false,error:rr?.alasan||'New Cemerlang Prime tidak tersedia.'};
      mGambar();
      return {ok:true,premium:Number(rr.premiSesuaiMetode||0),result:rr,
        resultHtml:el('mHasil')?.innerHTML||'',phaseHtml:el('mFase')?.innerHTML||'',
        timelineHtml:el('mFaseIlus')?.innerHTML||'',detailHtml:(el('mKotakRingkas')?.innerHTML||'')+'<div class="gulir"><table class="tahunan">'+(el('mTabel')?.innerHTML||'')+'</table></div>'};
    }catch(e){return {ok:false,error:e?.message||'New Cemerlang Prime gagal dihitung.'}}
  }

  function calcBSL(sc){
    if(!tgl)return {ok:false,error:'Tanggal lahir nasabah belum tersedia di Profil Nasabah.'};
    try{
      /* Perbandingan Solusi memakai UP gabungan yang dipilih agen. Pada
         BeSMART Lite, UP gabungan = UP Dasar x 5 bila rider Lite UP diambil,
         jadi UP Dasarnya dihitung mundur dari angka itu. */
      const upGabungan=Number(sc.up);
      const inp={nama:profileName,jk,tglLahir:new Date(tgl+'T00:00:00Z'),mpp:Number(sc.paymentTerm),metode:(sc.metode||'Tahunan'),
        upDasar:Math.round(upGabungan/5),pakaiLiteUp:true};
      const rr=bsl2Hitung(inp,TARIF_BSL_LENGKAP);
      if(!rr?.tersedia)return {ok:false,error:rr?.alasan||'BeSMART Lite 100 tidak tersedia.'};
      return {ok:true,premium:Number(rr.premiSesuaiMetode||rr.premiTahunan||0),totalPaid:Number(rr.totalSesuaiMetode||rr.totalTahunan||0),result:rr,
        resultHtml:'<div class="sorotan"><div class="k">Yang dibayar nasabah</div><div class="v angka">'+rp(rr.premiSesuaiMetode)+' <small>/tahun</small></div><div class="t">Dibayar selama '+sc.paymentTerm+' tahun. Total '+rp(rr.totalSesuaiMetode)+'.</div></div>',
        phaseHtml:'<div class="tahap"><b>Tahun 1 sampai '+sc.paymentTerm+'</b><span>Membayar '+rp(rr.premiSesuaiMetode)+' per tahun.</span></div><div class="tahap tenang"><b>Setelah masa bayar</b><span>Tidak ada pembayaran lagi. Proteksi jiwa tetap berjalan sampai usia 100 tahun.</span></div><div class="tahap"><b>Usia 100 tahun</b><span>Manfaat hidup '+rp(rr.manfaatHidup)+' dibayarkan.</span></div>',
        timelineHtml:'',
        detailHtml:'<div class="ikhtisar"><div class="kartu"><div class="k">Premi per tahun</div><div class="v angka">'+rp(rr.premiTahunan)+'</div></div><div class="kartu"><div class="k">Total dibayar</div><div class="v angka">'+rp(rr.totalSesuaiMetode)+'</div></div><div class="kartu"><div class="k">Manfaat meninggal</div><div class="v angka">'+rp(rr.manfaatMeninggal)+'</div></div><div class="kartu"><div class="k">Manfaat hidup usia 100</div><div class="v angka">'+rp(rr.manfaatHidup)+'</div></div></div>'};
    }catch(e){return {ok:false,error:e?.message||'BeSMART Lite 100 gagal dihitung.'}}
  }

  function calcFLEX(sc){
    if(!tgl)return {ok:false,error:'Tanggal lahir nasabah belum tersedia di Profil Nasabah.'};
    try{
      const inp={nama:profileName,tglLahir:new Date(tgl+'T00:00:00Z'),mpp:Number(sc.paymentTerm),metode:(sc.metode||'Tahunan'),up:Number(sc.up)};
      const rr=InsuranceHubEngine.calculate('FLEX',inp,{rates:TARIF_FLEX});
      if(!rr?.tersedia)return {ok:false,error:rr?.alasan||'iFLEXYGUARD tidak tersedia.'};
      return {ok:true,premium:Number(rr.premiAktif||rr.premiTahunan||0),totalPaid:Number(rr.totalDibayar||0),result:rr,
        resultHtml:'<div class="sorotan"><div class="k">Yang dibayar nasabah</div><div class="v angka">'+rp(rr.premiAktif)+' <small>/tahun</small></div><div class="t">Dibayar selama '+sc.paymentTerm+' tahun. Total '+rp(rr.totalDibayar)+'. Proteksi berjalan sampai usia 99.</div></div>',
        phaseHtml:'<div class="tahap"><b>Tahun 1–5</b><span>Manfaat dasar '+rp(rr.manfaatTahun1)+'.</span></div><div class="tahap"><b>Tahun 6–10</b><span>Manfaat naik menjadi '+rp(rr.manfaatTahun6)+'.</span></div><div class="tahap"><b>Tahun 11 ke atas</b><span>Manfaat menjadi '+rp(rr.manfaatTahun11)+'. Bonus 75 dan akhir masa mengikuti ilustrasi produk.</span></div>',
        timelineHtml:'',
        detailHtml:'<div class="ikhtisar"><div class="kartu"><div class="k">Premi per tahun</div><div class="v angka">'+rp(rr.premiTahunan)+'</div></div><div class="kartu"><div class="k">Total dibayar</div><div class="v angka">'+rp(rr.totalDibayar)+'</div></div><div class="kartu"><div class="k">Manfaat tahun 1–5</div><div class="v angka">'+rp(rr.manfaatTahun1)+'</div></div><div class="kartu"><div class="k">Manfaat tahun 6–10</div><div class="v angka">'+rp(rr.manfaatTahun6)+'</div></div><div class="kartu"><div class="k">Manfaat tahun 11+</div><div class="v angka">'+rp(rr.manfaatTahun11)+'</div></div><div class="kartu"><div class="k">Bonus 75</div><div class="v angka">'+rp(rr.bonus75)+'</div></div><div class="kartu penuh"><div class="k">Akhir masa usia 99</div><div class="v angka">'+rp(rr.akhirMasa)+'</div></div></div>'};
    }catch(e){return {ok:false,error:e?.message||'iFLEXYGUARD gagal dihitung.'}}
  }

  function calcCRIS(sc){
    if(!tgl)return {ok:false,error:'Tanggal lahir nasabah belum tersedia di Profil Nasabah.'};
    try{
      el('cNama').value=profileName;el('cTgl').value=tgl;el('cUP').value=money(sc.up);
      setSeg('cJK',jk);setSeg('cBayar',String(sc.paymentTerm));setSeg('cLindung',String(sc.protectionTerm||20));setSeg('cMetode',sc.metode||'Tahunan');
      const rr=InsuranceHubEngine.calculate('CRIS',{nama:profileName,jk,tglLahir:new Date(tgl+'T00:00:00Z'),
        lamaBayar:Number(sc.paymentTerm),lamaLindung:Number(sc.protectionTerm||20),metode:(sc.metode||'Tahunan'),up:Number(sc.up)},{rates:TARIF_CRIS});
      if(!rr?.tersedia)return {ok:false,error:rr?.alasan||'Cristal Prime tidak tersedia.'};
      cGambar();
      return {ok:true,premium:Number(rr.premiSesuaiMetode||0),result:rr,
        resultHtml:el('cHasil')?.innerHTML||'',phaseHtml:el('cFase')?.innerHTML||'',
        timelineHtml:el('cFaseIlus')?.innerHTML||'',detailHtml:(el('cKotakRingkas')?.innerHTML||'')+'<div class="gulir"><table class="tahunan">'+(el('cTabel')?.innerHTML||'')+'</table></div>'};
    }catch(e){return {ok:false,error:e?.message||'Cristal Prime gagal dihitung.'}}
  }

  function calculate(sc){
    if(sc.productKey==='GSPA')return calcGSPA(sc);
    if(sc.productKey==='NCP')return calcNCP(sc);
    if(sc.productKey==='CRIS')return calcCRIS(sc);
    if(sc.productKey==='BSL')return calcBSL(sc);
    if(sc.productKey==='FLEX')return calcFLEX(sc);
    return {ok:false,error:'Produk belum terhubung ke kalkulator asli.'};
  }

  function status(up,target){
    if(!target)return {txt:'Target belum tersedia',cls:'',gap:0};
    if(up===target)return {txt:'✓ Memenuhi kebutuhan',cls:'ok',gap:0};
    if(up<target)return {txt:'⚠ Di bawah kebutuhan',cls:'warn',gap:up-target};
    return {txt:'↑ Di atas kebutuhan',cls:'over',gap:up-target};
  }

  function render(){
    el('cmpSummary').innerHTML=
      '<h2>Bandingkan Solusi</h2>'
      +'<p class="catatan">Gunakan hasil Analisa Kebutuhan sebagai UP default. Hitung dulu dengan kalkulator produk asli, periksa hasilnya, lalu simpan jika ingin memasukkannya ke perbandingan.</p>'
      +'<div class="na-kartu-grid">'
      +'<div class="na-kartu"><div class="k">Target UP Jiwa</div><div class="v angka">Rp'+money(state.targets.life)+'</div></div>'
      +'<div class="na-kartu"><div class="k">Target UP Critical Illness</div><div class="v angka">Rp'+money(state.targets.ci)+'</div><div class="k">Asumsi '+state.ciMonths+' bulan pengganti penghasilan</div></div>'
      +'</div>'
      +'<div class="blok" style="margin-top:14px"><h3>Buat Alternatif</h3>'
      +'<div class="baris"><div><label>Jenis kebutuhan</label><select id="cmpNeedType"><option value="life">Proteksi Jiwa</option><option value="ci">Critical Illness</option></select></div>'
      +'<div><label>Produk</label><select id="cmpProduct"></select></div></div>'
      +'<div class="baris"><div><label>UP</label><input id="cmpUP" type="text" inputmode="numeric"></div>'
      +'<div><label>Lama bayar</label><select id="cmpPay"></select></div></div>'
      +'<div class="baris"><div><label>Cara bayar</label>'
      +'<select id="cmpMetode"><option value="Tahunan">Tahunan</option>'
      +'<option value="Bulanan">Bulanan</option></select></div><div></div></div>'
      +'<div class="baris" id="cmpProtectionRow" style="display:none"><div><label>Lama perlindungan</label><select id="cmpProtection"></select></div><div></div></div>'
      /* Waiver Gen Aman hanya relevan untuk GSPA, jadi barisnya muncul saat
         produk itu dipilih. Default ON karena pembebasan kontribusi saat
         sakit kritis adalah bagian utama nilai jual produknya. */
      +'<div class="baris" id="cmpWaiverRow" style="display:none"><div><label>Rider Waiver Gen Aman</label>'
      +'<select id="cmpWaiver"><option value="Ya">Ya — ambil waiver</option><option value="Tidak">Tidak</option></select>'
      +'<p class="catatan">Membebaskan kontribusi dasar bila peserta terdiagnosa penyakit kritis sesuai ketentuan polis.</p></div><div></div></div>'
      +'<div class="aksi-row"><button class="aksi" type="button" id="cmpCalculate">Hitung</button></div>'
      +'<div id="cmpHint" class="catatan" style="margin-top:8px"></div><div id="cmpPreview" style="margin-top:14px"></div></div>';

    el('cmpCards').innerHTML=
      '<div class="blok"><h3>Alternatif yang Sedang Dibandingkan</h3><div id="cmpScenarioRows"></div>'
      +'<div class="aksi-row" style="margin-top:14px"><button class="aksi" type="button" id="cmpOpenSummaryPage">Ringkasan Perbandingan</button></div></div>';

    const needSel=el('cmpNeedType'),prodSel=el('cmpProduct'),upInp=el('cmpUP'),paySel=el('cmpPay'),proSel=el('cmpProtection');
    const metSel=el('cmpMetode');
    function cmpSetWaiverRow(kode){
      const row=el('cmpWaiverRow');
      if(row) row.style.display=(kode==='GSPA')?'':'none';
    }
    function populate(){
      const type=needSel.value,list=listProducts(type);
      prodSel.innerHTML=list.map(x=>'<option value="'+x.key+'">'+escHtml(x.name)+'</option>').join('');
      const p=getProduct(type,prodSel.value);
      paySel.innerHTML=(p?.pay||[]).map(v=>'<option value="'+v+'">'+v+' tahun</option>').join('');
      if(type==='ci'){
        el('cmpProtectionRow').style.display='';
        proSel.innerHTML=(p?.protect||[]).map(v=>'<option value="'+v+'">'+v+' tahun</option>').join('');
      }else{el('cmpProtectionRow').style.display='none';proSel.innerHTML=''}
      cmpSetWaiverRow(prodSel.value);
      const target=targetFor(type);upInp.value=target?money(target):'';
      el('cmpHint').textContent=target?'UP otomatis mengikuti Analisa Kebutuhan: Rp'+money(target)+'. Boleh diedit untuk simulasi lebih kecil/besar.':'Belum ada target; UP dapat diisi manual.';
    }
    needSel.addEventListener('change',populate);
    prodSel.addEventListener('change',()=>{
      const p=getProduct(needSel.value,prodSel.value);
      paySel.innerHTML=(p?.pay||[]).map(v=>'<option value="'+v+'">'+v+' tahun</option>').join('');
      if(needSel.value==='ci')proSel.innerHTML=(p?.protect||[]).map(v=>'<option value="'+v+'">'+v+' tahun</option>').join('');
      cmpSetWaiverRow(prodSel.value);
    });
    upInp.addEventListener('input',()=>{const n=num(upInp.value);upInp.value=n?money(n):''});
    populate();

    function renderRows(){
      const host=el('cmpScenarioRows');
      if(!state.scenarios.length){host.innerHTML='<div class="catatan">Belum ada alternatif tersimpan.</div>';return}
      host.innerHTML=state.scenarios.map((s,i)=>{
        const st=status(s.up,targetFor(s.needType));
        return '<div class="cmp-saved-card" style="border:1px solid var(--border,#e5e5e5);border-radius:14px;padding:14px;margin-top:10px">'
          +'<div style="display:flex;justify-content:space-between;gap:10px"><div><div class="k">Alternatif '+String.fromCharCode(65+i)+'</div>'
          +'<div style="font-size:18px;font-weight:800">'+escHtml(s.productName)+'</div>'
          +'<div class="catatan">'+(s.needType==='life'?'Proteksi Jiwa':'Critical Illness')+' · UP Rp'+money(s.up)+' · Bayar '+s.paymentTerm+' tahun'
          +(s.protectionTerm?' · Lindung '+s.protectionTerm+' tahun':'')
          +' · '+((s.metode==='Bulanan')?'Bulanan':'Tahunan')+'</div></div>'
          +'<button class="sakelar" title="Hapus alternatif ini" data-cmp-delete="'+s.id+'" style="font-size:20px">🗑</button></div>'
          +'<div class="na-kartu-grid" style="margin-top:10px"><div class="na-kartu"><div class="k">Premi / '+((s.metode==='Bulanan')?'bulan':'tahun')+'</div><div class="v angka">Rp'+money(s.premium)+'</div></div>'
          +'<div class="na-kartu"><div class="k">Total bayar</div><div class="v angka">Rp'+money(s.totalPaid)+'</div></div>'
          +'<div class="na-kartu"><div class="k">Status</div><div class="v '+st.cls+'">'+st.txt+'</div></div></div>'
          +'<details style="margin-top:10px"><summary>Lihat hasil kalkulator</summary><div style="margin-top:10px">'+(s.resultHtml||'')+(s.detailHtml||'')+(s.waiverHtml||'')+'</div></details></div>';
      }).join('');
      host.querySelectorAll('[data-cmp-delete]').forEach(b=>b.addEventListener('click',()=>{state.scenarios=state.scenarios.filter(x=>x.id!==b.dataset.cmpDelete);save(state);render()}));
    }

    el('cmpCalculate').addEventListener('click',()=>{
      const p=getProduct(needSel.value,prodSel.value);
      const sc={needType:needSel.value,productKey:prodSel.value,productName:p?.name||prodSel.value,up:num(upInp.value),
        paymentTerm:Number(paySel.value||0),protectionTerm:Number(proSel.value||0),
        metode:(metSel&&metSel.value==='Bulanan')?'Bulanan':'Tahunan',
        pakaiWaiver:(prodSel.value==='GSPA') && (el('cmpWaiver')?.value!=='Tidak')};
      if(!sc.up||!sc.paymentTerm){el('cmpHint').textContent='UP dan lama bayar wajib diisi.';return}
      if(sc.needType==='ci'&&!sc.protectionTerm){el('cmpHint').textContent='Lama perlindungan wajib dipilih untuk Cristal Prime.';return}
      const res=calculate(sc);
      if(!res.ok){el('cmpHint').textContent=res.error;el('cmpPreview').innerHTML='<div class="peringatan">'+escHtml(res.error)+'</div>';return}
      const preview={...sc,premium:Number(res.premium||0),totalPaid:Number(res.totalPaid||res.result?.totalDibayar||0),result:res.result,resultHtml:res.resultHtml,phaseHtml:res.phaseHtml,timelineHtml:res.timelineHtml,detailHtml:res.detailHtml,waiverHtml:res.waiverHtml||''};
      window.__cmpPreview110=preview;
      el('cmpHint').textContent='Hasil berasal dari kalkulator produk asli. Periksa dulu sebelum disimpan.';
      el('cmpPreview').innerHTML='<div class="blok" style="border:2px solid var(--border,#ddd);border-radius:14px;padding:14px"><h3>Hasil Kalkulator '+escHtml(sc.productName)+'</h3>'
        +'<div class="catatan">UP Rp'+money(sc.up)+' · Bayar '+sc.paymentTerm+' tahun'+(sc.protectionTerm?' · Lindung '+sc.protectionTerm+' tahun':'')+'</div>'
        +'<div style="margin-top:12px">'+res.resultHtml+'</div><details open style="margin-top:12px"><summary>Detail manfaat & ilustrasi</summary><div style="margin-top:10px">'+res.detailHtml+res.phaseHtml+(res.waiverHtml||'')+'</div></details>'
        +'<button class="aksi" type="button" id="cmpSavePreview" style="margin-top:14px">💾 Simpan & Tambahkan ke Perbandingan</button></div>';
      el('cmpSavePreview').addEventListener('click',()=>{
        const x=window.__cmpPreview110;if(!x)return;
        state.scenarios.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),selected:false,...x});
        save(state);window.__cmpPreview110=null;render();
      });
    });

    renderRows();
    el('cmpOpenSummaryPage').addEventListener('click',()=>{
      if(!state.scenarios.length){el('cmpHint').textContent='Simpan minimal satu alternatif terlebih dahulu.';return}
      sessionStorage.setItem('insuranceHub.comparisonSummary',JSON.stringify(state));
      sessionStorage.setItem('insuranceHub.externalReturn.v1',JSON.stringify({
        type:'comparison-summary',
        returnPage:'index.html',
        returnScreen:'NEEDS'
      }));
      window.location.href='comparison-summary.html';
    });
  }
  render();
}
function renderComparisonFromSaved(){
  const saved=needsRead();
  if(saved){ renderNeeds(saved); renderComparison(saved); }
  else if(el('cmpSummary')&&el('cmpCards')){
    el('cmpSummary').innerHTML='<h2>Belum ada analisis aktif</h2><p class="catatan">Perbandingan solusi membutuhkan hasil Analisis Kebutuhan. Kamu bisa mulai dari tombol di atas, atau kembali ke dashboard untuk menghitung produk secara langsung.</p>';
    el('cmpCards').innerHTML='<p class="catatan">Belum ada hasil analisis untuk dibandingkan.</p>';
  }
}
window.renderComparisonFromSaved=renderComparisonFromSaved;
function naInit(){
  if(!el('naHitung'))return;
  ['naPenghasilan','naUtang','naCoverage','naCI','naPendidikan','naPensiunBulanan'].forEach(id=>el(id)?.addEventListener('input',()=>{const n=bAngka(el(id).value);el(id).value=n?n.toLocaleString('id-ID'):'';}));
  el('naHitung').addEventListener('click',needsCalculate);
  const saved=needsRead(); if(saved){needsFill(saved);renderNeeds(saved);renderComparison(saved);}
  needsLoadActiveProfile();
  // Profil bisa dibuat atau diganti setelah halaman terbuka. Karena itu isian
  // otomatis diulang setiap kali layar Analisis Kebutuhan ditampilkan.
  if(typeof window.bukaLayar==='function' && !window.bukaLayar.__naHook){
    const bukaAsli = window.bukaLayar;
    const bungkus = function(nama){
      const hasil = bukaAsli.apply(this, arguments);
      if(nama==='NEEDS'){ try{ needsLoadActiveProfile(); }catch(_){} }
      return hasil;
    };
    bungkus.__naHook = true;
    window.bukaLayar = bungkus;
    if(window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
  }
}
naInit();

/* ============================================================
   Needs Analysis -> Existing Combination Engine handoff
   Uses the same oSlot/comboHitung/oHitung engine as the Dashboard's
   Combination Products box. No second combination calculator.
   ============================================================ */
function consumeNeedsComboHandoff(){
  let payload=null;
  try{ payload=JSON.parse(sessionStorage.getItem('insuranceHub.comboImport')||'null'); }catch(_){ payload=null; }
  if(!payload || !Array.isArray(payload.scenarios) || !payload.scenarios.length) return;

  const selected=payload.scenarios.slice(0,9);
  const mapKey={GSPA:'GSPA',NCP:'New Cemerlang Prime',CRIS:'Cristal Prime',BSL:'BSL',FLEX:'iFLEXYGUARD',iFLEXYGUARD:'iFLEXYGUARD',
    'New Cemerlang Prime':'New Cemerlang Prime','Cristal Prime':'Cristal Prime'};
  const slots=selected.map(sc=>{
    const produk=mapKey[sc.productKey]||mapKey[sc.productName]||sc.productName;
    return {
      produk:produk,
      lamaBayar:Number(sc.paymentTerm||COMBO_BAYAR[produk]?.[0]||0),
      lamaLindung:produk==='BSL'?100:(produk==='GSPA'||produk==='iFLEXYGUARD'?99:Number(sc.protectionTerm||25)),
      up:Number(sc.up||0), modeWakaf:'Non Wakaf', nilaiWakaf:0, persenWakaf:0.4,
      /* Pilihan waiver dibawa dari alternatif yang disimpan di Perbandingan
         Solusi, supaya premi dan tabel pembebasannya tetap sama sampai ke
         ringkasan gabungan. Alternatif lama yang belum punya field ini
         dianggap memakai waiver, mengikuti default di formulirnya. */
      pakaiWaiver: (produk==='GSPA') ? (sc.pakaiWaiver !== false) : false
    };
  });
  if(!slots.length) return;

  try{
    oSlot=slots;
    if(el('oNama')) el('oNama').value=payload.customerName||'';
    if(el('oTgl')) el('oTgl').value=payload.customerTgl||'';
    if(el('oAgenNama') && payload.agentName!=null) el('oAgenNama').value=payload.agentName;
    if(el('oAgenHP') && payload.agentHP!=null) el('oAgenHP').value=payload.agentHP;
    const setComboSeg=(id,value)=>{const box=el(id);if(!box)return;box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.nilai)===String(value)));};
    setComboSeg('oJK',payload.customerJk||'PRIA');
    setComboSeg('oMetode','Tahunan');
    oGambarDaftar();
    oHitung();

    /* Tabel pembebasan premi oleh Waiver Gen Aman untuk ringkasan gabungan.
       Dibangun dari slot yang sudah dihitung, bukan dari HTML layar, supaya
       tetap ada walaupun layar Kombinasi belum menampilkan bagian ini. */
    const waiverGabunganHtml = oTabelWaiverKombinasi(window.__comboHasilTerakhir);

    const capture=id=>el(id)?.innerHTML||'';
    const text=id=>el(id)?.textContent||'';
    const generated={version:'combo-engine-handoff-1',customerName:payload.customerName||'Nasabah',customerTgl:payload.customerTgl||'',customerAge:(payload.customerTgl&&typeof usiaGenerali==='function'?usiaGenerali(payload.customerTgl):null),customerJk:payload.customerJk||'PRIA',targets:payload.targets||{},selected:selected,slots:slots,
      html:{hasil:capture('oHasil'),identitas:capture('oIdentitas'),ringkasan:capture('oKotakRingkas'),polis:capture('oTabelSlot'),manfaat:capture('oTabelManfaat'),timeline:capture('oTabelTimeline'),waiver:waiverGabunganHtml,skenario:capture('oTabelSkenario'),kakiAgen:capture('oKakiAgen'),catatanSlot:text('oCatatanSlot'),catatanManfaat:text('oCatatanManfaat'),catatanTimeline:text('oCatatanTimeline'),catatanSkenario:text('oCatatanSkenario'),sangkalan:text('oSangkalan')}};
    sessionStorage.setItem('insuranceHub.comboGeneratedSummary',JSON.stringify(generated));
    sessionStorage.setItem('insuranceHub.selectedProgram',JSON.stringify({...payload,scenarios:selected}));
    sessionStorage.removeItem('insuranceHub.comboImport');
    window.location.href='program-summary.html';
  }catch(err){
    console.error('Needs Analysis -> Combination Engine handoff failed',err);
    sessionStorage.removeItem('insuranceHub.comboImport');
    alert(err?.message||'Gagal membuat ringkasan gabungan.');
  }
}
setTimeout(consumeNeedsComboHandoff,0);


(function(){function assessPwaPrintWidth(){const active=document.querySelector('.layar.aktif')||document.body;let wide=false;[...active.querySelectorAll('table')].forEach(function(t){const old=[t.style.width,t.style.maxWidth,t.style.tableLayout];const w=t.closest('.gulir,.banding-gulir');t.style.width='max-content';t.style.maxWidth='none';t.style.tableLayout='auto';const a=w?w.clientWidth:document.documentElement.clientWidth;if(t.scrollWidth>Math.max(a+40,760))wide=true;/* Jumlah kolom ikut diperiksa. Pengukuran lebar bisa meleset bila tabel sedang berada di dalam pembungkus yang menggulir, sehingga tabel timeline 8 kolom tetap tercetak potret lalu kolom terakhir tergencet sampai satu huruf per baris. */if(((t.tHead&&t.tHead.rows[0]&&t.tHead.rows[0].cells.length)||0)>=7)wide=true;t.style.width=old[0];t.style.maxWidth=old[1];t.style.tableLayout=old[2]});document.body.classList.toggle('print-wide',wide)}window.addEventListener('beforeprint',assessPwaPrintWidth);window.addEventListener('afterprint',()=>document.body.classList.remove('print-wide'));})();
