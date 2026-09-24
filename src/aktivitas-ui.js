/* ============================================================
   Kotak Aktivitas Agen — antarmuka
   Seluruh tampilannya dibangun dari sini, supaya index.html
   cukup menyediakan dua wadah kosong.
   ============================================================ */
(function () {
  'use strict';

  const A = window.InsuranceHubAktivitas;
  if (!A) return;

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  let tabAktif = 'JANJI';
  let closingSedangDiedit = null;
  let comboDraft = [];

  const KOMBO_AKTIVITAS = [
    { value: 'New Cemerlang Prime', label: 'New Cemerlang Prime', bayar: [3, 5, 10], lindung: [15, 20, 25] },
    { value: 'Cristal Prime', label: 'Cristal Prime', bayar: [3, 5, 10], lindung: [15, 20, 25] },
    { value: 'BSL', label: 'BeSMART Lite (BSL)', bayar: [3, 5, 10, 15, 20], lindung: [100] },
    { value: 'GSPA', label: 'Gen Aman (GSPA)', bayar: [5, 10, 15], lindung: [99] },
    { value: 'iFLEXYGUARD', label: 'iFLEXYGUARD', bayar: [5, 10], lindung: [99] }
  ];
  const comboInfo = (v) => KOMBO_AKTIVITAS.find(x => x.value === v) || KOMBO_AKTIVITAS[0];
  const comboLindungLabel = (v) => Number(v) >= 99 ? 'Sampai usia 100' : (Number(v) + ' tahun');

  /* ---------- Pendaftaran layar ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.AKTIVITAS = {
      el: 'layarAktivitas', judul: 'Aktivitas & Poin',
      sub: 'Catatan kerja agen, tersimpan di perangkat ini', kiri: 'PRODUK'
    };
    nav.LAYAR.AKT_REKAP = {
      el: 'layarAktRekap', judul: 'Rekap Klaim',
      sub: 'Siap dicetak dan dikirim ke agency', kiri: 'AKTIVITAS'
    };
    return true;
  }

  /* ---------- Kerangka layar utama ---------- */

  function kerangka() {
    const wadah = el('layarAktivitas');
    if (!wadah) return;
    wadah.innerHTML =
      '<div class="kop"><h2>Aktivitas & Poin</h2>' +
      '<p>Catat janji temu, presentasi, dan closing. Poin dihitung otomatis.</p></div>' +

      '<div class="blok tanpa-cetak" id="aktIdentitas"></div>' +
      '<div class="blok" id="aktRingkasPoin"></div>' +

      '<div class="blok tanpa-cetak">' +
      '<div class="akt-tab" id="aktTab">' +
      '<button type="button" data-tab="JANJI">Janji Temu</button>' +
      '<button type="button" data-tab="PRESENTASI">Presentasi</button>' +
      '<button type="button" data-tab="CLOSING">Closing</button>' +
      '</div>' +
      '<div id="aktIsiTab"></div>' +
      '</div>' +

      '<div class="blok tanpa-cetak">' +
      '<h2>Cadangan data</h2>' +
      '<p class="catatan">Simpan cadangan sebagai snapshot kondisi terakhir. File JSON dapat dipulihkan di browser atau perangkat lain.</p>' +
      '<ol class="catatan akt-cara">' +
      '<li><b>Cadangkan</b> &mdash; tekan tombolnya, lalu satu berkas ' +
      '<b>.json</b> tersimpan di folder Unduhan HP. Kirim berkas itu ke diri ' +
      'sendiri lewat email atau simpan di Google Drive pribadi.</li>' +
      '<li><b>Pulihkan</b> &mdash; di HP baru atau browser lain, buka aplikasi ini, tekan ' +
      'Pulihkan, lalu pilih berkas .json tadi. Kondisi data akan dikembalikan sesuai saat cadangan dibuat.</li>' +
      '<li>Berkas cadangan memuat nama dan nomor HP nasabah. Jangan dikirim ' +
      'ke grup, cukup ke diri sendiri.</li>' +
      '<li>Selama kontes berjalan, cadangkan sekali seminggu.</li>' +
      '</ol>' +
      '<div class="akt-aksi">' +
      '<button class="sakelar" id="aktCadangkan" type="button">Cadangkan ke berkas</button>' +
      '<button class="sakelar" id="aktPulihkan" type="button">Pulihkan dari berkas</button>' +
      '<button class="sakelar" id="aktAuditCadangan" type="button">Cek isi backup</button>' +
      '<input type="file" id="aktBerkasPulih" accept=".json,application/json" hidden>' +
      '</div>' +
      '<div class="catatan akt-audit-box" id="aktAuditBox" hidden></div></div>';
  }

  /* ---------- Identitas agen ---------- */

  function gambarIdentitas() {
    const kotak = el('aktIdentitas');
    if (!kotak) return;
    const a = A.agenBaca();
    kotak.innerHTML =
      '<h2>Identitas agen</h2>' +
      '<p class="catatan">Diisi sekali. Dipakai sebagai kepala rekap klaim agar ' +
      'admin bisa mencocokkan ke portal Generali.</p>' +
      '<div class="baris">' +
      '<div><label for="aktAgenNama">Nama agen</label>' +
      '<input id="aktAgenNama" type="text" value="' + esc(a.nama) + '" placeholder="Nama lengkap"></div>' +
      '<div><label for="aktAgenKode">Kode agen</label>' +
      '<input id="aktAgenKode" type="text" value="' + esc(a.kode) + '" placeholder="Kode keagenan"></div>' +
      '</div>' +
      '<div class="baris"><div><label>Foto agen</label>' +
      '<div class="akt-foto-baris">' +
      '<label class="sambutan-foto" title="Ketuk untuk mengganti foto">' +
      (fotoAgen() ? '<img src="' + esc(fotoAgen()) + '" alt="Foto agen">'
        : '<span class="sambutan-ikon">\u{1F464}</span>') +
      '<input type="file" id="fotoAgen" accept="image/*" hidden></label>' +
      '<div class="akt-foto-aksi">' +
      '<button class="sakelar" id="aktGantiFoto" type="button">' +
      (fotoAgen() ? 'Ganti foto' : 'Unggah foto') + '</button>' +
      (fotoAgen() ? '<button class="sakelar" id="hapusFotoAgen" type="button">Hapus foto</button>' : '') +
      '</div></div>' +
      '<p class="catatan">Opsional. Tampil di halaman utama setelah masuk.</p></div>' +
      '<div><label for="aktAgenHp">Nomor HP</label>' +
      '<input id="aktAgenHp" type="tel" inputmode="numeric" value="' + esc(a.hp) + '" placeholder="0812..."></div></div>' +
      '<button class="aksi" id="aktSimpanAgen" type="button">Simpan identitas</button>';
  }

  function fotoAgen() {
    try { return localStorage.getItem('insuranceHub.agen.foto.v1') || ''; } catch (_) { return ''; }
  }

  /* ---------- Ringkasan poin ---------- */

  function gambarRingkasPoin() {
    const kotak = el('aktRingkasPoin');
    if (!kotak) return;
    const h = A.hitung();
    const klaim = A.klaimBaca();
    const hariIni = A.hariKontes(A.tglIso(new Date()));
    const sisa = Math.max(0, h.target - h.total);

    let tingkatSekarang = '';
    if (hariIni !== null && hariIni >= 1) {
      const hariIniIso = A.tglIso(new Date());
      const t = A.KONTES.periode.find(x => hariIniIso <= x.sampaiTanggal);
      tingkatSekarang = t
        ? 'Klaim hari ini masuk periode sampai ' + A.tglTampil(t.sampaiTanggal) +
          ', voucher MAP ' + A.rupiah(t.hadiah) + '.'
        : 'Periode kontes sudah berakhir ' + A.tglTampil(A.KONTES.selesai) + '.';
    } else {
      tingkatSekarang = 'Kontes dimulai ' + A.tglTampil(A.KONTES.mulai) + '.';
    }

    let isiKlaim;
    if (klaim.length) {
      const k = klaim[0];
      isiKlaim = '<p class="akt-sukses">Klaim <b>' + esc(k.nomor) + '</b> sudah diajukan pada ' +
        esc(A.waktuTampil(k.tanggal)) + ' — ' + k.poin + ' poin, hari ke-' + k.hariKe +
        ', hadiah ' + A.rupiah(k.hadiah) + '.</p>' +
        '<button class="aksi" id="aktLihatRekap" type="button">Lihat & cetak rekap klaim</button>';
    } else if (h.cukupUntukKlaim) {
      isiKlaim = '<p class="akt-sukses">Poin sudah cukup untuk diklaim.</p>' +
        '<button class="aksi" id="aktAjukanKlaim" type="button">Ajukan klaim</button>';
    } else {
      isiKlaim = '<p class="catatan">Kurang <b>' + sisa + ' poin</b> lagi untuk bisa mengajukan klaim.</p>' +
        '<button class="aksi" id="aktAjukanKlaim" type="button" disabled>Ajukan klaim</button>';
    }

    /* Ringkasan alasan closing yang belum berpoin. Alasannya sebenarnya sudah
       tertulis di tabel rincian, tetapi agen yang melihat angka closing masih
       nol jarang menggulir ke sana — sehingga terkesan poinnya tidak masuk
       padahal ada syarat yang belum terpenuhi. */
    let peringatanClosing = '';
    try {
      const belum = (h.rincianClosing || []).filter(r => !r.poin && r.alasan);
      if (belum.length) {
        const hitungan = {};
        belum.forEach(r => { hitungan[r.alasan] = (hitungan[r.alasan] || 0) + 1; });
        peringatanClosing =
          '<div class="akt-peringatan" style="margin-top:8px">' +
          '<b>' + belum.length + ' closing belum berpoin.</b><br>' +
          Object.keys(hitungan).map(a2 =>
            '&bull; ' + esc(a2) + ' — ' + hitungan[a2] + ' closing').join('<br>') +
          '<br><span class="catatan">Poin closing sah bila: status <b>Inforce</b>, ' +
          'ada presentasi tercatat untuk prospek yang sama, ' +
          'dan tanggal SPAJ tidak sebelum kontes dimulai. ' +
          'Urutan tanggal presentasi dan SPAJ tidak diperiksa.</span></div>';
      }
    } catch (_) {}

    kotak.innerHTML =
      '<h2>Poin kamu</h2>' +
      '<div class="akt-skor">' +
      '<div class="akt-skor-utama"><span class="angka">' + h.total + '</span>' +
      '<span class="dari">dari ' + h.target + ' poin</span></div>' +
      '<div class="akt-skor-rinci">' +
      '<div><span>Dari closing inforce</span><b>' + h.poinClosing + '</b></div>' +
      '<div><span>Dari presentasi</span><b>' + h.poinPresentasi +
      (h.poinPresentasiMentah > h.poinPresentasi
        ? ' <i>(dibatasi dari ' + h.poinPresentasiMentah + ')</i>' : '') + '</b></div>' +
      '</div></div>' +
      '<p class="catatan">Maksimal ' + h.aturan.batasPresentasi + ' poin boleh berasal dari presentasi. ' +
      esc(tingkatSekarang) + '</p>' +
      peringatanClosing +
      isiKlaim +
      '<div class="akt-aksi" style="margin-top:10px">' +
      '<button class="sakelar" id="aktEkspor" type="button">Ekspor ke Excel</button>' +
      '<button class="sakelar" id="aktRekapCepat" type="button">Lihat rekap</button>' +
      '<button class="sakelar" id="aktSlipKomisi" type="button">Proyeksi komisi</button>' +
      '</div>';
  }

  /* ---------- Tab ---------- */

  function gambarTab() {
    const bar = el('aktTab');
    if (bar) {
      Array.prototype.forEach.call(bar.querySelectorAll('button'), b => {
        b.setAttribute('aria-pressed', b.dataset.tab === tabAktif);
      });
    }
    if (tabAktif === 'JANJI') gambarJanji();
    else if (tabAktif === 'PRESENTASI') gambarPresentasi();
    else gambarClosing();
  }

  /* ---------- Janji temu ---------- */

  function gambarJanji() {
    const kotak = el('aktIsiTab');
    if (!kotak) return;
    const daftar = A.kejadianBaca().filter(k => k.tipe === 'janji')
      .sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));

    let profilPilihan = '<option value="">— pilih dari profil nasabah —</option>';
    try {
      const profil = A.baca('insuranceHub.customerProfiles.v1', []);
      profil.forEach(p => {
        profilPilihan += '<option value="' + esc(p.id) + '">' + esc(p.nama || '(tanpa nama)') + '</option>';
      });
    } catch (_) {}

    kotak.innerHTML =
      '<h3>Tambah janji temu</h3>' +
      '<p class="catatan">Janji temu tidak menghasilkan poin. Gunanya sebagai catatan ' +
      'aktivitas untuk dibahas dengan leader.</p>' +
      '<div class="baris"><div><label for="jtProfil">Ambil dari profil</label>' +
      '<select id="jtProfil">' + profilPilihan + '</select></div>' +
      '<div><label for="jtNama">Nama prospek</label>' +
      '<input id="jtNama" type="text" placeholder="Nama prospek"></div></div>' +
      '<div class="baris"><div><label for="jtHp">Nomor HP</label>' +
      '<input id="jtHp" type="tel" inputmode="numeric" placeholder="0812..."></div>' +
      '<div><label for="jtStatus">Status</label><select id="jtStatus">' +
      '<option value="BELUM">Belum ada janji</option>' +
      '<option value="BERHASIL">Berhasil dapat janji</option>' +
      '<option value="TIDAK">Tidak berhasil</option></select></div></div>' +
      '<div class="baris"><div><label for="jtTgl">Tanggal janji</label>' +
      '<input id="jtTgl" type="date"></div>' +
      '<div><label for="jtJam">Jam janji</label><input id="jtJam" type="time"></div></div>' +
      '<div class="baris satu"><div><label for="jtCatatan">Catatan</label>' +
      '<input id="jtCatatan" type="text" placeholder="Opsional"></div></div>' +
      '<button class="aksi" id="jtSimpan" type="button">Simpan janji temu</button>' +
      '<h3 style="margin-top:16px">Daftar janji temu (' + daftar.length + ')</h3>' +
      (daftar.length ? daftar.map(kartuJanji).join('') :
        '<p class="catatan">Belum ada catatan janji temu.</p>');
    const jp=el('jtProfil');
    if(jp) jp.addEventListener('change',function(){
      const p=daftarProfil().find(x=>x.id===jp.value);
      if(p){ if(el('jtNama')) el('jtNama').value=p.nama||''; if(el('jtHp')) el('jtHp').value=A.rapikanHp(p.hp||''); }
    });
  }

  function kartuJanji(k) {
    const lencana = { BELUM: 'Belum ada janji', BERHASIL: 'Berhasil', TIDAK: 'Tidak berhasil' };
    const kelas = { BELUM: 'netral', BERHASIL: 'hijau', TIDAK: 'merah' };
    const wa = A.hpWa(k.hp);
    const jadwal = k.tglJanji
      ? A.tglTampil(k.tglJanji) + (k.jamJanji ? ', ' + esc(k.jamJanji) : '')
      : 'Belum dijadwalkan';
    return '<div class="akt-kartu">' +
      '<div class="akt-kartu-atas"><b>' + esc(k.nama) + '</b>' +
      '<span class="akt-lencana ' + kelas[k.status] + '">' + lencana[k.status] + '</span></div>' +
      '<div class="akt-meta">' + esc(k.hp || 'Tanpa nomor HP') + ' &middot; ' + jadwal + '</div>' +
      (k.catatan ? '<div class="akt-meta">' + esc(k.catatan) + '</div>' : '') +
      '<div class="akt-aksi">' +
      (wa ? '<a class="akt-tbl wa" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' +
        '<a class="akt-tbl telp" href="tel:' + esc(A.rapikanHp(k.hp)) + '">Telepon</a>' : '') +
      '<button class="akt-tbl profil" data-janji-profil="' + esc(k.id) + '" type="button">Profil prospek</button>' +
      '<button class="akt-tbl netral" data-janji-status="' + esc(k.id) + '" type="button">Ubah status</button>' +
      '<button class="akt-tbl netral" data-janji-hapus="' + esc(k.id) + '" type="button">Hapus</button>' +
      '</div></div>';
  }

  /* ---------- Presentasi ---------- */

  function gambarPresentasi() {
    const kotak = el('aktIsiTab');
    if (!kotak) return;
    const h = A.hitung();
    const baris = h.presentasi.slice().reverse();

    kotak.innerHTML =
      '<h3>Presentasi (' + baris.length + ')</h3>' +
      '<p class="catatan">Tercatat otomatis setiap kali kamu menekan tombol cetak pada ' +
      'halaman ringkasan atau ilustrasi. Waktunya terkunci dan tidak bisa diubah. ' +
      'Prospek yang sama baru berpoin lagi setelah lewat ' + h.aturan.dedupHari + ' hari.</p>' +
      (baris.length ? baris.map(r => {
        const k = r.kejadian;
        return '<div class="akt-kartu">' +
          '<div class="akt-kartu-atas"><b>' + esc(k.nama) + '</b>' +
          '<span class="akt-lencana ' + (r.berpoin ? 'hijau' : 'netral') + '">' +
          (r.berpoin ? '+' + r.poin + ' poin' : '0 poin') + '</span></div>' +
          '<div class="akt-meta">' + esc(k.produk) + ' &middot; ' + esc(A.waktuTampil(k.waktu)) + '</div>' +
          '<div class="akt-meta">' + (k.hp ? esc(k.hp) : 'Nomor HP belum ada') + '</div>' +
          (r.alasan ? '<div class="akt-meta akt-peringatan">' + esc(r.alasan) + '</div>' : '') +
          (!k.hp && !k.klaimId
            ? '<div class="akt-aksi"><button class="akt-tbl profil" data-pres-hp="' + esc(k.id) +
              '" type="button">Lengkapi nomor HP</button></div>' : '') +
          '</div>';
      }).join('') :
        '<p class="catatan">Belum ada presentasi tercatat. Buat ilustrasi lalu tekan tombol cetak.</p>');
  }

  /* ---------- Closing ---------- */

  function comboDraftAwal(s) {
    if (s && Array.isArray(s.komponen) && s.komponen.length) return s.komponen.map(c => ({
      produk: c.produk || 'New Cemerlang Prime', mpp: Number(c.mpp) || 10,
      lamaLindung: Number(c.lamaLindung) || 25, premi: Number(c.premi) || 0
    }));
    return [{ produk: 'New Cemerlang Prime', mpp: 10, lamaLindung: 25, premi: 0 }];
  }

  function gambarKomponenCombo() {
    const w = el('clKomponenCombo');
    if (!w) return;
    if (!comboDraft.length) comboDraft = comboDraftAwal({});
    w.innerHTML = '<div class="blok" style="background:#FBFAF7">' +
      '<h4 style="margin:0 0 8px">Rincian produk dalam kombinasi</h4>' +
      '<p class="catatan">Tambahkan semua produk yang benar-benar ada dalam closing. Setiap produk punya masa bayar, masa perlindungan, dan premi sendiri.</p>' +
      comboDraft.map((c, i) => {
        const info = comboInfo(c.produk);
        const used = comboDraft.map((x,j) => j !== i ? x.produk : null);
        const options = KOMBO_AKTIVITAS.filter(x =>
          (x.value !== 'GSPA' && x.value !== 'iFLEXYGUARD') || used.indexOf(x.value) < 0 || x.value === c.produk
        ).map(x => '<option value="' + esc(x.value) + '"' + (x.value === c.produk ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('');
        return '<div class="blok" style="margin:8px 0;background:#fff">' +
          '<div class="baris"><div><label>Produk ' + (i+1) + '</label><select data-combo-field="produk" data-combo-index="' + i + '">' + options + '</select></div>' +
          '<div><label>Masa bayar</label><select data-combo-field="mpp" data-combo-index="' + i + '">' +
          info.bayar.map(v => '<option value="' + v + '"' + (Number(c.mpp) === v ? ' selected' : '') + '>' + v + ' tahun</option>').join('') + '</select></div></div>' +
          '<div class="baris"><div><label>Masa perlindungan</label><select data-combo-field="lamaLindung" data-combo-index="' + i + '">' +
          info.lindung.map(v => '<option value="' + v + '"' + (Number(c.lamaLindung) === v ? ' selected' : '') + '>' + comboLindungLabel(v) + '</option>').join('') + '</select></div>' +
          '<div><label>Premi per pembayaran</label><input type="text" inputmode="numeric" data-uang data-combo-field="premi" data-combo-index="' + i + '" value="' + (Number(c.premi) ? Number(c.premi).toLocaleString('id-ID') : '') + '" placeholder="Rp 0"></div></div>' +
          (comboDraft.length > 1 ? '<button type="button" class="sakelar" data-combo-hapus="' + i + '">Hapus produk ini</button>' : '') +
          '</div>';
      }).join('') +
      '<button type="button" class="sakelar" data-combo-tambah>+ Tambah produk</button>' +
      '<p class="catatan">Maksimal mengikuti jumlah produk yang tersedia di kalkulator kombinasi. GHP tidak dimasukkan sebagai produk terpisah di sini.</p>' +
      '</div>';
  }

  function gambarClosing() {
    const kotak = el('aktIsiTab');
    if (!kotak) return;
    const h = A.hitung();
    const baris = h.closing.slice().reverse();
    /* Formulir baru sebelumnya berangkat dari objek kosong. Akibatnya
       s.produk dan s.status undefined, sementara <select> menampilkan opsi
       pertama — sehingga masa bayar dan masa perlindungan dicari dengan
       MASA_PRODUK[undefined] dan selalu jatuh ke "tidak berlaku", padahal
       produknya terlihat sudah terpilih di layar. Status pun tersimpan
       "Pengajuan" tanpa disadari, membuat poin closing tetap nol.
       Nilai awal kini disamakan dengan yang benar-benar tampil. */
    const s = closingSedangDiedit || { produk: A.PRODUK[0], status: 'PENGAJUAN', frekuensi: 'BULANAN' };
    if (s.produk === 'Kombinasi' && !comboDraft.length) comboDraft = comboDraftAwal(s);
    else if (s.produk !== 'Kombinasi' && !closingSedangDiedit) comboDraft = [];

    const opsiProduk = A.PRODUK.map(p =>
      '<option value="' + esc(p) + '"' + (s.produk === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('');
    const opsiFrek = [['BULANAN', 'Bulanan'], ['TRIWULANAN', 'Triwulanan'],
      ['SEMESTERAN', 'Semesteran'], ['TAHUNAN', 'Tahunan']]
      .map(([v, t]) => '<option value="' + v + '"' + (s.frekuensi === v ? ' selected' : '') + '>' + t + '</option>').join('');
    const opsiStatus = [['PENGAJUAN', 'Pengajuan'], ['INFORCE', 'Inforce'], ['DITOLAK', 'Ditolak']]
      .map(([v, t]) => '<option value="' + v + '"' + (s.status === v ? ' selected' : '') + '>' + t + '</option>').join('');

    kotak.innerHTML =
      '<h3>' + (closingSedangDiedit ? 'Ubah closing' : 'Tambah closing') + '</h3>' +
      '<p class="catatan">Poin baru sah setelah status Inforce. Tanggal SPAJ yang menentukan ' +
      'tingkat hadiah, jadi isi apa adanya.</p>' +
      '<div class="baris"><div><label for="clProfil">Nama prospek</label>' +
      '<select id="clProfil">' + opsiProfil(s.nama) + '</select>' +
      '<input id="clNama" type="text" value="' + esc(s.nama || '') +
      '" placeholder="Ketik nama prospek"' + (adaProfil() ? ' hidden' : '') + '>' +
      '<p class="catatan">Diambil dari Profil Nasabah. Pilih "Ketik manual" bila ' +
      'ilustrasinya dibuat belakangan. Nama harus sama persis dengan nama di ilustrasi.</p></div>' +
      '<div><label for="clHp">Nomor HP</label>' +
      '<input id="clHp" type="tel" inputmode="numeric" value="' + esc(s.hp || '') + '" placeholder="0812..."></div></div>' +
      '<div class="baris"><div><label for="clPemegang">Nama pemegang polis</label>' +
      '<input id="clPemegang" type="text" value="' + esc(s.pemegang || '') + '"></div>' +
      '<div><label for="clTertanggung">Tertanggung utama (bila berbeda)</label>' +
      '<input id="clTertanggung" type="text" value="' + esc(s.tertanggung || '') + '" placeholder="Kosongkan bila sama"></div></div>' +
      '<div class="baris"><div><label for="clSpaj">Nomor SPAJ</label>' +
      '<input id="clSpaj" type="text" value="' + esc(s.spaj || '') + '"></div>' +
      '<div><label for="clPolis">Nomor polis</label>' +
      '<input id="clPolis" type="text" value="' + esc(s.polis || '') + '" placeholder="Diisi setelah polis terbit"></div></div>' +
      '<div class="baris"><div><label for="clProduk">Produk</label>' +
      '<select id="clProduk">' + opsiProduk + '</select></div>' +
      '<div><label for="clFrek">Frekuensi bayar</label><select id="clFrek">' + opsiFrek + '</select></div></div>' +
      (s.produk === 'Kombinasi'
        ? '<div id="clKomponenCombo"></div>'
        : '<div class="baris"><div><label for="clMpp">Masa bayar premi</label>' +
          '<select id="clMpp">' + opsiMasa(s.produk, 'bayar', s.mpp) + '</select>' +
          '<p class="catatan">Pilihannya mengikuti produk yang dipilih.</p></div>' +
          '<div><label for="clLindung">Masa perlindungan</label>' +
          '<select id="clLindung">' + opsiMasa(s.produk, 'lindung', s.lamaLindung) + '</select>' +
          '<p class="catatan">Terisi sendiri bila produknya hanya punya satu pilihan.</p></div></div>') +
      (s.produk === 'Kombinasi' ? '' :
      '<div class="baris"><div><label for="clPremiRider">Premi rider kesehatan per pembayaran</label>' +
      '<input id="clPremiRider" type="text" inputmode="numeric" value="' +
      (s.premiRider ? Number(s.premiRider).toLocaleString('id-ID') : '') + '" placeholder="Rp 0">' +
      '<p class="catatan">Kosongkan bila tidak ada rider. Rate komisinya berbeda dari premi dasar.</p></div>' +
      '<div><label>&nbsp;</label><p class="catatan">Premi dasar dan rider dihitung terpisah, mengikuti cara slip resmi Generali.</p></div></div>') +
      (s.produk === 'Kombinasi' ? '' :
      '<div class="baris"><div><label for="clPremi">Premi dasar per pembayaran</label>' +
      '<input id="clPremi" type="text" inputmode="numeric" value="' +
      (s.premi ? Number(s.premi).toLocaleString('id-ID') : '') + '" placeholder="Rp 0"></div>' +
      '<div><label for="clStatus">Status polis</label><select id="clStatus">' + opsiStatus + '</select></div></div>') +
      (s.produk === 'Kombinasi' ? '<div class="baris satu"><div><label for="clStatus">Status polis</label><select id="clStatus">' + opsiStatus + '</select></div></div>' : '') +
      '<div class="baris"><div><label for="clTglSpaj">Tanggal SPAJ</label>' +
      '<input id="clTglSpaj" type="date" value="' + esc(s.tglSpaj || '') + '"></div>' +
      '<div><label for="clTglInforce">Tanggal inforce</label>' +
      '<input id="clTglInforce" type="date" value="' + esc(s.tglInforce || '') + '"></div></div>' +
      '<p class="catatan" id="clPratinjau"></p>' +
      '<div class="akt-aksi">' +
      '<button class="aksi" id="clSimpan" type="button">' +
      (closingSedangDiedit ? 'Simpan perubahan' : 'Simpan closing') + '</button>' +
      (closingSedangDiedit ? '<button class="sakelar" id="clBatal" type="button">Batal</button>' : '') +
      '</div>' +
      '<h3 style="margin-top:16px">Daftar closing (' + baris.length + ')</h3>' +
      (baris.length ? baris.map(kartuClosing).join('') :
        '<p class="catatan">Belum ada closing tercatat.</p>');

    if (s.produk === 'Kombinasi') gambarKomponenCombo();
    hitungPratinjau();
    ['clPremi', 'clFrek'].forEach(id => {
      const n = el(id);
      if (n) n.addEventListener('input', hitungPratinjau);
    });
    const nProfil = el('clProfil');
    if (nProfil) nProfil.addEventListener('change', function () {
      const n = el('clNama'); const hp = el('clHp');
      if (!n) return;
      if (nProfil.value === '__manual__' || nProfil.value === '') {
        n.hidden = false; n.value = ''; if(hp) hp.value=''; n.focus();
      } else {
        n.hidden = true; n.value = nProfil.value;
        const p=daftarProfil().find(x=>String(x.nama||'').trim()===nProfil.value);
        if(hp && p && p.hp) hp.value=A.rapikanHp(p.hp);
      }
    });

    const nProduk = el('clProduk');
    if (nProduk) nProduk.addEventListener('change', function () {
      const p = nProduk.value;
      if (p === 'Kombinasi') {
        comboDraft = comboDraftAwal({});
        gambarClosing();
        return;
      }
      if (el('clMpp')) el('clMpp').innerHTML = opsiMasa(p, 'bayar', '');
      if (el('clLindung')) el('clLindung').innerHTML = opsiMasa(p, 'lindung', '');
    });
  }

  /* Masa bayar dan masa perlindungan yang benar-benar tersedia per produk,
     supaya agen tidak mengetik angka yang tidak ada. */
  const MASA_PRODUK = {
    /* Lite Future: "masa perlindungan" pada produk ini adalah USIA PENSIUN,
       jadi pilihannya diberi label sendiri supaya tidak terbaca "55 tahun"
       seolah lama perlindungan. Masa bayar 3 tahun tidak dicantumkan karena
       tabel tarifnya memang tidak menyediakannya — sama seperti kalkulator. */
    'BeSMART Lite Future':  { bayar: [5, 10, 15, 20], lindung: [55, 60, 65, 70, 75],
                              labelLindung: 'Usia pensiun ', satuanLindung: '' },
    'BeSMART Lite - 100': { bayar: [3, 5, 10, 15, 20], lindung: [80, 100] },
    'Cristal Prime':        { bayar: [3, 5, 10], lindung: [15, 20, 25] },
    'New Cemerlang Prime':  { bayar: [3, 5, 10], lindung: [15, 20, 25] },
    'Gen Aman (GSPA)':      { bayar: [5, 10, 15], lindung: [] },
    'iFLEXYGUARD 5':        { bayar: [5, 10], lindung: [] },
    'GHP GenPro':           { bayar: [5, 10, 15, 20, 'seumur'], lindung: [] },
    'Kombinasi':            { bayar: [3, 5, 10, 15, 20], lindung: [] },
    'RIZQIA':               { bayar: [5, 10], lindung: [10] }
  };

  function daftarProfil() {
    try { return A.baca('insuranceHub.customerProfiles.v1', []) || []; }
    catch (_) { return []; }
  }
  function adaProfil() { return daftarProfil().length > 0; }

  function opsiProfil(terpilih) {
    const daftar = daftarProfil();
    const opsi = daftar.map(function (p) {
      const n = String(p.nama || '').trim();
      if (!n) return '';
      return '<option value="' + esc(n) + '"' + (n === terpilih ? ' selected' : '') + '>' +
        esc(n) + '</option>';
    }).join('');
    const manual = '<option value="__manual__"' +
      ((!terpilih || !daftar.some(function (p) { return String(p.nama || '').trim() === terpilih; }))
        ? ' selected' : '') + '>Ketik manual</option>';
    return (daftar.length ? '<option value="">— pilih dari profil —</option>' : '') + opsi + manual;
  }

  function opsiMasa(produk, jenis, terpilih) {
    const m = MASA_PRODUK[produk];
    const daftar = m ? m[jenis] : [];
    if (!daftar || !daftar.length) {
      return '<option value="">— tidak berlaku —</option>';
    }
    const kosong = (daftar.length === 1) ? '' : '<option value="">— pilih —</option>';
    return kosong + daftar.map(function (v) {
      const pilih = (String(v) === String(terpilih) || daftar.length === 1) ? ' selected' : '';
      const awalan = (jenis === 'lindung' && m && m.labelLindung) ? m.labelLindung : '';
      const satuan = (jenis === 'lindung' && m && m.satuanLindung !== undefined)
        ? m.satuanLindung : ' tahun';
      const teks = (v === 'seumur') ? 'Seumur hidup' : (awalan + v + satuan);
      return '<option value="' + esc(v) + '"' + pilih + '>' + teks + '</option>';
    }).join('');
  }

  function angkaBersih(teks) {
    return Number(String(teks || '').replace(/[^0-9]/g, '')) || 0;
  }

  function hitungPratinjau() {
    const p = el('clPratinjau');
    if (!p) return;
    const produk = el('clProduk') ? el('clProduk').value : '';
    const premi = produk === 'Kombinasi'
      ? comboDraft.reduce((t, c) => t + (Number(c.premi) || 0), 0)
      : angkaBersih(el('clPremi') ? el('clPremi').value : '');
    const frek = el('clFrek') ? el('clFrek').value : 'BULANAN';
    if (!premi) { p.textContent = produk === 'Kombinasi' ? 'Isi premi setiap komponen untuk melihat total FYAPE dan poinnya.' : 'Isi premi untuk melihat FYAPE dan poinnya.'; return; }
    const nilai = A.fyape(premi, frek);
    const aturan = A.aturanBerlaku();
    const kategori = A.labelKategori(nilai, aturan);
    const poin = aturan.closing.find(b => nilai >= b.minFyape);
    p.innerHTML = 'FYAPE <b>' + A.rupiah(nilai) + '</b> &middot; kategori <b>' + kategori +
      '</b> &middot; bernilai <b>' + (poin ? poin.poin : 0) + ' poin</b> setelah status Inforce.';
  }

  function kartuClosing(r) {
    const k = r.kejadian;
    const kelas = { PENGAJUAN: 'netral', INFORCE: 'hijau', DITOLAK: 'merah' };
    const teks = { PENGAJUAN: 'Pengajuan', INFORCE: 'Inforce', DITOLAK: 'Ditolak' };
    return '<div class="akt-kartu">' +
      '<div class="akt-kartu-atas"><b>' + esc(k.pemegang || k.nama) + '</b>' +
      '<span class="akt-lencana ' + kelas[k.status] + '">' + teks[k.status] + '</span></div>' +
      '<div class="akt-meta">' + esc(k.produk) + ' &middot; FYAPE ' + A.rupiah(r.fyape) +
      ' &middot; ' + esc(r.kategori) + '</div>' +
      '<div class="akt-meta">SPAJ ' + esc(k.spaj || '—') + ' &middot; Polis ' + esc(k.polis || '—') +
      ' &middot; SPAJ ' + esc(A.tglTampil(k.tglSpaj)) + '</div>' +
      '<div class="akt-meta"><b>' + (r.berpoin ? '+' + r.poin + ' poin' : '0 poin') + '</b>' +
      (r.alasan ? ' — ' + esc(r.alasan) : '') + '</div>' +
      (k.klaimId ? '<div class="akt-meta akt-terkunci">Sudah dipakai dalam klaim — terkunci</div>' :
        '<div class="akt-aksi">' +
        '<button class="sakelar" data-closing-edit="' + esc(k.id) + '" type="button">Ubah</button>' +
        '<button class="sakelar" data-closing-hapus="' + esc(k.id) + '" type="button">Hapus</button>' +
        '</div>') +
      '</div>';
  }

  /* ---------- Rekap ---------- */

  function gambarRekap() {
    const wadah = el('layarAktRekap');
    if (!wadah) return;
    const h = A.hitung();
    const agen = A.agenBaca();
    const klaim = A.klaimBaca()[0] || null;

    const dipakai = {};
    if (klaim) klaim.kejadian.forEach(id => { dipakai[id] = true; });

    // Sebelum klaim diajukan, laporan menampilkan seluruh aktivitas beserta
    // status poinnya. Setelah klaim, hanya kejadian yang terkunci di klaim itu.
    const closingTampil = klaim
      ? h.closing.filter(r => dipakai[r.kejadian.id])
      : h.closing;
    const presentasiTampil = klaim
      ? h.presentasi.filter(r => dipakai[r.kejadian.id])
      : h.presentasi;
    const janjiTampil = klaim ? [] : A.kejadianBaca()
      .filter(k => k.tipe === 'janji')
      .sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));

    const totalPoin = klaim ? klaim.poin : h.total;
    const dariClosing = klaim ? klaim.poinDariClosing : h.poinClosing;
    const dariPresentasi = klaim ? klaim.poinDariPresentasi : h.poinPresentasi;

    wadah.innerHTML =
      '<div class="akt-rekap">' +
      '<div class="akt-rekap-kop">' +
      '<h2>' + (klaim ? 'Rekap Klaim' : 'Laporan Aktivitas Agen') + '</h2>' +
      '<table class="akt-kop-tabel"><tbody>' +
      '<tr><td>Nama agen</td><td><b>' + esc(agen.nama || '—') + '</b></td>' +
      '<td>Kode agen</td><td><b>' + esc(agen.kode || '—') + '</b></td></tr>' +
      '<tr><td>Nomor klaim</td><td><b>' + esc(klaim ? klaim.nomor : '(belum diajukan)') + '</b></td>' +
      '<td>Tanggal cetak</td><td>' + esc(A.tglTampil(A.tglIso(new Date()))) + '</td></tr>' +
      '<tr><td>Kontes mulai</td><td>' + esc(A.tglTampil(A.KONTES.mulai)) + '</td>' +
      '<td>SPAJ terakhir</td><td>' + esc(klaim ? A.tglTampil(klaim.spajTerakhir) : '—') +
      (klaim ? ' (hari ke-' + klaim.hariKe + ')' : '') + '</td></tr>' +
      '</tbody></table></div>' +

      '<div class="akt-rekap-total">' +
      '<div><span>Total poin</span><b>' + totalPoin + '</b></div>' +
      '<div><span>Dari closing</span><b>' + dariClosing + '</b></div>' +
      '<div><span>Dari presentasi</span><b>' + dariPresentasi + '</b></div>' +
      '<div><span>Hadiah</span><b>' + (klaim ? A.rupiah(klaim.hadiah) : '—') + '</b></div>' +
      '</div>' +

      '<h3>Closing</h3>' +
      (closingTampil.length ?
        '<table class="akt-tabel"><thead><tr>' +
        '<th>Tgl SPAJ</th><th>Tgl inforce</th><th>Pemegang polis</th><th>No polis</th>' +
        '<th>Produk</th><th class="ka">FYAPE</th><th>Status</th><th class="ka">Poin</th>' +
        '</tr></thead><tbody>' +
        closingTampil.map(r => '<tr>' +
          '<td>' + esc(A.tglTampil(r.kejadian.tglSpaj)) + '</td>' +
          '<td>' + esc(A.tglTampil(r.kejadian.tglInforce)) + '</td>' +
          '<td>' + esc(r.kejadian.pemegang || r.kejadian.nama) + '</td>' +
          '<td>' + esc(r.kejadian.polis || '—') + '</td>' +
          '<td>' + esc(r.kejadian.produk) + '</td>' +
          '<td class="ka">' + A.rupiah(r.fyape) + '</td>' +
          '<td>' + esc({PENGAJUAN:'Pengajuan',INFORCE:'Inforce',DITOLAK:'Ditolak'}[r.kejadian.status] || '') +
            (r.alasan ? '<br><span style="color:#8A94A3">' + esc(r.alasan) + '</span>' : '') + '</td>' +
          '<td class="ka">' + r.poin + '</td></tr>').join('') +
        '</tbody></table>'
        : '<p class="catatan">Belum ada closing tercatat.</p>') +

      '<h3>Presentasi</h3>' +
      (presentasiTampil.length ?
        '<table class="akt-tabel"><thead><tr>' +
        '<th>Tanggal</th><th>Nama prospek</th><th>No HP</th><th>Produk</th>' +
        '<th>Keterangan</th><th class="ka">Poin</th></tr></thead><tbody>' +
        presentasiTampil.map(r => '<tr>' +
          '<td>' + esc(A.tglTampil(A.tglIso(r.kejadian.waktu))) + '</td>' +
          '<td>' + esc(r.kejadian.nama) + '</td>' +
          '<td>' + esc(r.kejadian.hp || '—') + '</td>' +
          '<td>' + esc(r.kejadian.produk) + '</td>' +
          '<td>' + esc(r.alasan || 'Berpoin') + '</td>' +
          '<td class="ka">' + r.poin + '</td></tr>').join('') +
        '</tbody></table>'
        : '<p class="catatan">Belum ada presentasi tercatat.</p>') +

      (janjiTampil.length ?
        '<h3>Janji Temu</h3>' +
        '<table class="akt-tabel"><thead><tr>' +
        '<th>Dicatat</th><th>Nama prospek</th><th>No HP</th><th>Jadwal</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        janjiTampil.map(k => '<tr>' +
          '<td>' + esc(A.tglTampil(A.tglIso(k.dibuat))) + '</td>' +
          '<td>' + esc(k.nama) + '</td>' +
          '<td>' + esc(k.hp || '—') + '</td>' +
          '<td>' + (k.tglJanji ? esc(A.tglTampil(k.tglJanji)) +
            (k.jamJanji ? ' ' + esc(k.jamJanji) : '') : '—') + '</td>' +
          '<td>' + esc({BELUM:'Belum ada janji',BERHASIL:'Berhasil',TIDAK:'Tidak berhasil'}[k.status] || '') +
          '</td></tr>').join('') +
        '</tbody></table>' +
        '<p class="catatan">Janji temu tidak menghasilkan poin. Dicantumkan sebagai catatan aktivitas.</p>'
        : '') +

      '<p class="catatan akt-kaki">Aturan poin versi ' + esc(h.aturan.versi) +
      ', berlaku sejak ' + esc(A.tglTampil(h.aturan.berlakuSejak)) + '. ' +
      'Dihitung ulang dari catatan aktivitas di perangkat agen.</p>' +
      '</div>' +

      '<div class="akt-aksi tanpa-cetak" style="margin-top:14px">' +
      '<button class="aksi" id="aktCetakRekap" type="button">Cetak / simpan PDF</button>' +
      '<button class="sakelar" id="aktEksporRekap" type="button">Ekspor ke Excel</button>' +
      '</div>';
  }

  /* ---------- Menyegarkan seluruh layar ---------- */

  function segarkan() {
    if (!el('aktIdentitas')) return;
    gambarIdentitas();
    gambarRingkasPoin();
    gambarTab();
  }
  window.aktivitasSegarkan = segarkan;

  /* ---------- Peristiwa ---------- */

  function pasangPeristiwa() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      // Masuk ke layar aktivitas
      if (t.closest('#btnAktivitas')) {
        window.InsuranceHubNavigation.bukaLayar('AKTIVITAS');
        segarkan();
        return;
      }

      // Identitas
      if (t.closest('#aktSimpanAgen')) {
        A.agenTulis({
          nama: el('aktAgenNama').value.trim(),
          kode: el('aktAgenKode').value.trim(),
          hp: A.rapikanHp(el('aktAgenHp').value)
        });
        segarkan();
        alert('Identitas agen tersimpan.');
        return;
      }

      if (t.closest('#aktGantiFoto')) {
        const f = el('fotoAgen');
        if (f) f.click();
        return;
      }

      // Tab
      const tab = t.closest('[data-tab]');
      if (tab && tab.closest('#aktTab')) {
        tabAktif = tab.dataset.tab;
        closingSedangDiedit = null;
        gambarTab();
        return;
      }

      // Janji temu
      if (t.closest('#jtSimpan')) { simpanJanji(); return; }
      const jHapus = t.closest('[data-janji-hapus]');
      if (jHapus) {
        if (confirm('Hapus catatan janji temu ini?')) {
          const sisa = A.kejadianBaca().filter(k => k.id !== jHapus.dataset.janjiHapus);
          A.kejadianTulis(sisa);
          segarkan();
        }
        return;
      }
      const jProfil = t.closest('[data-janji-profil]');
      if (jProfil) {
        const k = A.kejadianBaca().find(x => x.id === jProfil.dataset.janjiProfil);
        if (k) bukaProfilProspek(k);
        return;
      }
      const jStatus = t.closest('[data-janji-status]');
      if (jStatus) {
        const daftar = A.kejadianBaca();
        const k = daftar.find(x => x.id === jStatus.dataset.janjiStatus);
        if (k) {
          const urut = ['BELUM', 'BERHASIL', 'TIDAK'];
          k.status = urut[(urut.indexOf(k.status) + 1) % urut.length];
          A.kejadianTulis(daftar);
          segarkan();
        }
        return;
      }

      const presHp = t.closest('[data-pres-hp]');
      if (presHp) {
        const k = A.kejadianBaca().find(x => x.id === presHp.dataset.presHp);
        if (!k) return;
        const nomor = prompt('Nomor HP ' + (k.nama || 'prospek') + ':', '');
        if (nomor === null) return;
        const hasil = A.lengkapiHp(k.id, nomor, '');
        if (!hasil.ok) { alert(hasil.pesan); return; }
        segarkan();
        return;
      }

      // Komponen closing kombinasi
      const comboAdd = t.closest('[data-combo-tambah]');
      if (comboAdd) {
        if (comboDraft.length >= 9) { alert('Maksimal 9 produk dalam satu kombinasi.'); return; }
        const used = comboDraft.map(x => x.produk);
        const next = KOMBO_AKTIVITAS.find(x => used.indexOf(x.value) < 0) || KOMBO_AKTIVITAS[1];
        comboDraft.push({ produk: next.value, mpp: next.bayar[0], lamaLindung: next.lindung[0], premi: 0 });
        gambarKomponenCombo(); hitungPratinjau(); return;
      }
      const comboDel = t.closest('[data-combo-hapus]');
      if (comboDel) { comboDraft.splice(+comboDel.dataset.comboHapus, 1); gambarKomponenCombo(); hitungPratinjau(); return; }

      // Closing
      if (t.closest('#clSimpan')) { simpanClosing(); return; }
      if (t.closest('#clBatal')) { closingSedangDiedit = null; gambarClosing(); return; }
      const cEdit = t.closest('[data-closing-edit]');
      if (cEdit) {
        closingSedangDiedit = A.kejadianBaca().find(k => k.id === cEdit.dataset.closingEdit) || null;
        gambarClosing();
        window.scrollTo(0, 0);
        return;
      }
      const cHapus = t.closest('[data-closing-hapus]');
      if (cHapus) {
        if (confirm('Hapus catatan closing ini?')) {
          const sisa = A.kejadianBaca().filter(k => k.id !== cHapus.dataset.closingHapus);
          A.kejadianTulis(sisa);
          closingSedangDiedit = null;
          segarkan();
        }
        return;
      }

      // Klaim dan rekap
      if (t.closest('#aktAjukanKlaim')) {
        const hasil = A.ajukanKlaim();
        if (!hasil.ok) { alert(hasil.pesan); return; }
        alert('Klaim ' + hasil.klaim.nomor + ' berhasil dibuat.\n' +
          hasil.klaim.poin + ' poin, hari ke-' + hasil.klaim.hariKe +
          ', hadiah ' + A.rupiah(hasil.klaim.hadiah) + '.');
        segarkan();
        gambarRekap();
        window.InsuranceHubNavigation.bukaLayar('AKT_REKAP');
        return;
      }
      if (t.closest('#aktLihatRekap') || t.closest('#aktRekapCepat')) {
        gambarRekap();
        window.InsuranceHubNavigation.bukaLayar('AKT_REKAP');
        return;
      }
      if (t.closest('#aktCetakRekap')) {
        // Sengaja tidak lewat cetak(), supaya tidak terhitung sebagai presentasi.
        const asli = document.title;
        const agen = A.agenBaca();
        document.title = 'Rekap Aktivitas - ' + (agen.nama || 'Agen');
        window.print();
        setTimeout(() => { document.title = asli; }, 1000);
        return;
      }
      if (t.closest('#aktEkspor') || t.closest('#aktEksporRekap')) { A.eksporCsv(); return; }

      // Cadangan
      if (t.closest('#aktCadangkan')) {
        /* Kalau pembuatan cadangan gagal, agen harus tahu. Sebelumnya
           kegagalan berlalu tanpa pesan sehingga agen mengira sudah punya
           berkas cadangan padahal tidak ada yang terunduh. */
        try {
          const hasil = A.cadangkan();
          if (hasil && hasil.ok === false) {
            alert('Cadangan gagal dibuat: ' + (hasil.pesan || 'penyebab tidak diketahui.'));
          }
        } catch (err) {
          alert('Cadangan gagal dibuat.\n\n' + (err && err.message ? err.message : err));
        }
        return;
      }
      if (t.closest('#aktAuditCadangan')) {
        const r = A.auditCadangan();
        const box = el('aktAuditBox');
        if (box) {
          const p = r.manifest.persistentPenting.map(x => (x.ada ? '✓ ' : '⚠ ') + x.key).join('<br>');
          box.hidden = false;
          box.innerHTML = '<b>Audit backup</b><br>' + r.pesan + '<br><br><b>' + r.jumlahKey + ' key persistent terdeteksi.</b><br>' + p;
        }
        return;
      }
      if (t.closest('#aktPulihkan')) { el('aktBerkasPulih').click(); return; }
    });

    document.addEventListener('input', function (e) {
      const t = e.target;
      if (!(t instanceof Element) || !t.hasAttribute('data-combo-field')) return;
      const i = +t.dataset.comboIndex, f = t.dataset.comboField;
      if (!comboDraft[i]) return;
      if (f === 'premi') { const n = angkaBersih(t.value); t.value = n ? n.toLocaleString('id-ID') : ''; comboDraft[i].premi = n; }
      else if (f === 'mpp' || f === 'lamaLindung') comboDraft[i][f] = +t.value;
      else if (f === 'produk') comboDraft[i].produk = t.value;
      hitungPratinjau();
    });

    document.addEventListener('change', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.hasAttribute('data-combo-field')) {
        const i = +t.dataset.comboIndex, f = t.dataset.comboField;
        if (!comboDraft[i]) return;
        if (f === 'produk') {
          comboDraft[i].produk = t.value;
          const info = comboInfo(t.value);
          comboDraft[i].mpp = info.bayar[0];
          comboDraft[i].lamaLindung = info.lindung[0];
          comboDraft[i].premi = 0;
          gambarKomponenCombo();
        } else {
          comboDraft[i][f] = +t.value;
        }
        hitungPratinjau();
        return;
      }

      // Mengambil data dari profil nasabah
      if (t.id === 'jtProfil') {
        const profil = A.baca('insuranceHub.customerProfiles.v1', []);
        const p = profil.find(x => x.id === t.value);
        if (p) {
          if (el('jtNama')) el('jtNama').value = p.nama || '';
          if (el('jtHp')) el('jtHp').value = A.rapikanHp(p.hp || '');
        }
        return;
      }

      if (t.id === 'aktBerkasPulih' && t.files && t.files[0]) {
        const pembaca = new FileReader();
        pembaca.onload = () => {
          const teks = String(pembaca.result || '');
          let cadanganBaru = false;
          try {
            const cek = JSON.parse(teks);
            cadanganBaru = !!(cek && Number(cek.versi) >= 2 && (cek.format === 'snapshot-localstorage-v2' || cek.format === 'snapshot-localstorage-v3'));
          } catch (_) {}
          if (cadanganBaru && !confirm('Pulihkan cadangan ini? Data PSG Selling Tools yang ada sekarang akan digantikan oleh kondisi saat cadangan dibuat.')) {
            t.value = '';
            return;
          }
          const hasil = A.pulihkan(teks);
          alert(hasil.pesan);
          /* Aplikasi dimuat ulang, bukan sekadar menggambar ulang layar
             Aktivitas. Profil nasabah, Kartu Konsultan, Library, foto agen,
             dan Segitiga sudah memuat isinya ke memori saat aplikasi dibuka;
             menulis localStorage saja tidak mengubah apa yang sudah terlanjur
             dibaca, sehingga pemulihan terlihat "tidak sempurna" padahal
             datanya sudah masuk. */
          if (hasil.ok) {
            try { window.location.reload(); }
            catch (_) { segarkan(); }
          }
        };
        pembaca.readAsText(t.files[0]);
        t.value = '';
      }
    });
  }

  /* Membuka layar Profil Nasabah dengan nama dan nomor HP sudah terisi,
     supaya agen tinggal melengkapi tanggal lahir sampai data anak. */
  function bukaProfilProspek(janji) {
    const nav = window.InsuranceHubNavigation;
    if (!nav) return;
    // Kalau profil dengan nama sama sudah ada, buka profil itu untuk diedit.
    let sudahAda = null;
    try {
      sudahAda = A.baca('insuranceHub.customerProfiles.v1', []).find(p =>
        String(p.nama || '').trim().toLowerCase() === String(janji.nama || '').trim().toLowerCase());
    } catch (_) {}

    nav.bukaLayar('PROFILE');
    setTimeout(function () {
      if (sudahAda) {
        // Menekan tombol Edit pada kartu profil yang cocok.
        const tombol = document.querySelector('[data-cp-edit="' + sudahAda.id + '"]');
        if (tombol) { tombol.click(); return; }
      }
      // Profil baru: isi nama dan nomor HP, sisanya dilengkapi agen.
      const nama = el('cpNama'), hp = el('cpHP');
      if (nama) nama.value = janji.nama || '';
      if (hp) hp.value = A.rapikanHp(janji.hp || '');
      const bar = el('cpStatusBar');
      if (bar) {
        bar.dataset.editId = '';
        bar.textContent = 'Nama dan nomor HP diambil dari janji temu. Lengkapi sisanya lalu simpan.';
      }
      if (nama) nama.focus();
    }, 80);
  }

  function simpanJanji() {
    const nama = el('jtNama').value.trim();
    if (!nama) { alert('Nama prospek belum diisi.'); return; }
    const daftar = A.kejadianBaca();
    daftar.push({
      id: A.uid('janji'), tipe: 'janji',
      nama: nama, hp: A.rapikanHp(el('jtHp').value),
      tglJanji: el('jtTgl').value, jamJanji: el('jtJam').value,
      status: el('jtStatus').value, catatan: el('jtCatatan').value.trim(),
      dibuat: new Date().toISOString()
    });
    A.kejadianTulis(daftar);
    segarkan();
  }

  /* Semua isian nilai uang memakai pemisah ribuan saat diketik. */
  function pasangPemisahRibuan() {
    if (document.__pemisahSiap) return;
    document.__pemisahSiap = true;
    const kolomUang = ['clPremi', 'clPremiRider'];
    document.addEventListener('input', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (kolomUang.indexOf(t.id) === -1 && !t.hasAttribute('data-uang')) return;
      const n = angkaBersih(t.value);
      t.value = n ? n.toLocaleString('id-ID') : '';
    });
  }

  function simpanClosing() {
    const nama = el('clNama').value.trim();
    let premi = el('clPremi') ? angkaBersih(el('clPremi').value) : 0;
    const status = el('clStatus').value;
    const tglSpaj = el('clTglSpaj').value;
    if (!nama) { alert('Nama prospek belum diisi. Nama ini yang dipakai mencocokkan ilustrasi.'); return; }
    if (!premi && el('clProduk').value !== 'Kombinasi') { alert('Premi belum diisi.'); return; }
    if (el('clProduk').value === 'Kombinasi') {
      if (!comboDraft.length) { alert('Tambahkan minimal satu produk ke kombinasi.'); return; }
      if (comboDraft.some(c => !c.produk || !Number(c.mpp) || !Number(c.lamaLindung) || !Number(c.premi))) {
        alert('Lengkapi produk, masa bayar, masa perlindungan, dan premi pada setiap komponen kombinasi.'); return;
      }
    }
    if (!tglSpaj) { alert('Tanggal SPAJ belum diisi. Tanggal ini yang menentukan tingkat hadiah.'); return; }
    if (status === 'INFORCE' && !el('clTglInforce').value) {
      alert('Status Inforce perlu tanggal inforce.'); return;
    }

    if (el('clProduk').value === 'Kombinasi') {
      const totalPremiCombo = comboDraft.reduce((t, c) => t + (Number(c.premi) || 0), 0);
      if (!totalPremiCombo) { alert('Premi kombinasi belum diisi.'); return; }
      // FYAPE/poin tetap dihitung dari total premi seluruh komponen, dengan frekuensi pembayaran yang sama.
      // Rincian komisi nantinya dipecah kembali per produk di Proyeksi Komisi.
      premi = totalPremiCombo;
    }

    const isi = {
      tipe: 'closing',
      nama: nama, hp: A.rapikanHp(el('clHp').value),
      tglLahir: cariTglLahir(nama),
      pemegang: el('clPemegang').value.trim() || nama,
      tertanggung: el('clTertanggung').value.trim(),
      spaj: el('clSpaj').value.trim(), polis: el('clPolis').value.trim(),
      premiRider: el('clPremiRider') ? angkaBersih(el('clPremiRider').value) : 0,
      mpp: (el('clMpp') && el('clMpp').value) || '',
      lamaLindung: (el('clLindung') && el('clLindung').value) || '',
      produk: el('clProduk').value, premi: premi, frekuensi: el('clFrek').value,
      komponen: el('clProduk').value === 'Kombinasi' ? comboDraft.map(c => ({
        produk: c.produk, mpp: Number(c.mpp), lamaLindung: Number(c.lamaLindung), premi: Number(c.premi) || 0
      })) : undefined,
      tglSpaj: tglSpaj, tglInforce: el('clTglInforce').value,
      status: status, diubah: new Date().toISOString()
    };

    const daftar = A.kejadianBaca();
    if (closingSedangDiedit) {
      const k = daftar.find(x => x.id === closingSedangDiedit.id);
      if (k) Object.assign(k, isi);
      closingSedangDiedit = null;
    } else {
      isi.id = A.uid('closing');
      isi.dibuat = new Date().toISOString();
      daftar.push(isi);
    }
    A.kejadianTulis(daftar);
    segarkan();
  }

  // Tanggal lahir diambil dari presentasi atau profil dengan nama sama,
  // supaya kunci prospeknya cocok dengan catatan presentasi.
  function cariTglLahir(nama) {
    const n = nama.trim().toLowerCase();
    const pres = A.kejadianBaca().find(k =>
      k.tipe === 'presentasi' && String(k.nama || '').trim().toLowerCase() === n);
    if (pres && pres.tglLahir) return pres.tglLahir;
    const profil = A.baca('insuranceHub.customerProfiles.v1', []);
    const p = profil.find(x => String(x.nama || '').trim().toLowerCase() === n);
    return p ? (p.tglLahir || '') : '';
  }

  /* ---------- Mulai ---------- */

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    kerangka();
    pasangPeristiwa();
    pasangPemisahRibuan();
    segarkan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
