/* PSG Selling Tools — Asuransiku.

   Catatan pribadi agen tentang polis yang ia miliki sendiri, untuk
   ditunjukkan kepada calon nasabah. Bukan kalkulator premi, bukan alat jual
   polis, dan bukan pengganti dokumen polis resmi.

   - Data hanya di server per akun Identity (src/psg-pribadi-api.js), satu
     berkas per polis. Di browser hanya ada di memori halaman; tidak ada
     salinan di localStorage/sessionStorage.
   - Hanya untuk login email terverifikasi. Login kode akses lama melihat
     keterangan.
   - Rider berada di dalam polis induknya dan mengikuti Jenis Polis induk.
   - Layar bertanda .tanpa-simpan sehingga Isian Terakhir tidak merekamnya.
   - Semua teks dari agen ditulis lewat textContent / esc(). */
(function () {
  'use strict';

  var MAKS_POLIS = 30, MAKS_RIDER = 10;
  var el = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var JENIS = {
    JIWA: { label: 'Jiwa', ikon: '🛡️' },
    PK: { label: 'Penyakit Kritis', ikon: '❤️' },
    KECELAKAAN: { label: 'Kecelakaan', ikon: '🦺' },
    KESEHATAN: { label: 'Kesehatan', ikon: '🏥' },
    LAINNYA: { label: 'Lainnya', ikon: '📄' }
  };
  var URUT_JENIS = ['JIWA', 'PK', 'KECELAKAAN', 'KESEHATAN', 'LAINNYA'];
  var JENIS_POLIS = { UNIT_LINK: 'Unit Link', TRADISIONAL: 'Tradisional' };
  var SIFAT_PK = { BERDIRI_SENDIRI: 'Berdiri sendiri', DIPERCEPAT: 'Dipercepat (mengurangi UP jiwa)', TIDAK_TAHU: 'Belum tahu' };
  var SISTEM = {
    TAHUNAN: 'Limit tahunan (dengan opsi booster)',
    PER_KEJADIAN: 'Limit per tindakan / kejadian',
    HARIAN: 'Santunan harian rawat inap',
    LAINNYA: 'Lainnya / belum yakin'
  };
  var PERUSAHAAN_SARAN = ['Generali', 'Prudential', 'Allianz', 'AIA', 'Manulife', 'AXA Mandiri', 'BNI Life', 'Sun Life', 'FWD', 'Sequis', 'Zurich', 'Tokio Marine', 'Great Eastern', 'Chubb', 'BPJS Kesehatan'];

  /* ---------- Keadaan di memori ---------- */
  var st = {
    tampilan: 'tidak-tersedia',  // tidak-tersedia | memuat | gagal | pengantar | ringkasan | form
    pemilik: '', urutan: 0,
    polis: [], penyimpanan: '', pesanGagal: '', kodeGagal: '',
    kelola: false,
    draf: null, idEdit: null, idDraf: '', langkah: 0, ubah: false, galat: '', statusSimpan: '', simpanGagal: false, sedangSimpan: false
  };

  function api() { return window.PSGPribadi; }
  function emailSesi() {
    var id = window.InsuranceHubIdentity;
    return id && id.source === 'server:/api/psg/me' ? String(id.email || '').toLowerCase() : '';
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function salin(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- Format ---------- */
  function uang(n, mu) {
    if (n === undefined || n === null || n === '') return '';
    var t = Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
    return (mu === 'USD' ? 'US$' : 'Rp') + t;
  }
  function tgl(v) {
    if (!v) return '';
    var d = new Date(v + 'T00:00:00');
    return isNaN(d) ? v : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function angkaDariTeks(v) {
    var s = String(v == null ? '' : v).replace(/[^\d]/g, '');
    return s ? Number(s) : null;
  }

  /* ---------- Memuat ---------- */
  function wadah() { return el('asuransikuIsi'); }
  function layarAktif() { var s = el('layarAsuransiku'); return !!(s && s.classList.contains('aktif')); }

  function bersihkan(tampilan) {
    st.urutan++;
    st.pemilik = ''; st.polis = []; st.penyimpanan = ''; st.pesanGagal = ''; st.kodeGagal = '';
    st.kelola = false; st.draf = null; st.idEdit = null; st.idDraf = ''; st.langkah = 0; st.ubah = false; st.galat = '';
    st.statusSimpan = ''; st.simpanGagal = false; st.sedangSimpan = false; st.pengumuman = '';
    st.tampilan = tampilan;
  }

  function pulihkanDraf(d) { st.draf = d.draf; st.idEdit = d.idEdit; st.idDraf = d.idDraf; st.langkah = d.langkah; st.ubah = d.ubah; }

  function muat() {
    var email = emailSesi(), p = api();
    if (!email || !p) { bersihkan('tidak-tersedia'); gambar(); return; }
    /* Draf yang belum tersimpan milik akun yang sama dipertahankan. */
    var draf = st.pemilik === email && st.draf ? { draf: st.draf, idEdit: st.idEdit, idDraf: st.idDraf, langkah: st.langkah, ubah: st.ubah } : null;
    bersihkan('memuat');
    st.pemilik = email;
    var nomor = st.urutan;
    gambar();
    p.ambil().then(function (d) {
      if (nomor !== st.urutan) return;
      st.polis = Array.isArray(d.polis) ? d.polis : [];
      st.penyimpanan = d.penyimpanan || '';
      if (draf && draf.draf) { pulihkanDraf(draf); st.tampilan = 'form'; }
      else st.tampilan = st.polis.length ? 'ringkasan' : 'pengantar';
      gambar();
    }).catch(function (e) {
      if (nomor !== st.urutan) return;
      /* Penolakan server (401/403) dan kegagalan sementara (503, jaringan)
         sama-sama menampilkan alasan + kode dari server dan tombol coba lagi. */
      if (e && (e.status === 401 || e.status === 403)) { bersihkan('tidak-tersedia'); st.pemilik = email; st.pesanGagal = e.message || ''; st.kodeGagal = e.kode || ''; }
      else { st.tampilan = 'gagal'; st.pesanGagal = (e && e.message) || 'Data belum bisa dimuat.'; st.kodeGagal = (e && e.kode) || ''; if (draf && draf.draf) pulihkanDraf(draf); }
      gambar();
    });
  }

  /* ---------- Ringkasan ---------- */

  function semuaPerlindungan() {
    var out = [];
    st.polis.forEach(function (p) { (p.perlindungan || []).forEach(function (x) { out.push({ polis: p, x: x }); }); });
    return out;
  }

  /* Total UP hanya dalam satu jenis (Jiwa / Penyakit Kritis) dan satu mata
     uang, minimal dua entri, dan hanya bila semuanya mencantumkan UP. */
  function totalUP() {
    var hasil = [];
    ['JIWA', 'PK'].forEach(function (j) {
      var grup = {};
      semuaPerlindungan().forEach(function (e) {
        if (e.x.jenis !== j) return;
        var mu = e.polis.mataUang || 'IDR';
        (grup[mu] = grup[mu] || []).push(e);
      });
      Object.keys(grup).forEach(function (mu) {
        var g = grup[mu];
        if (g.length < 2) return;
        var terisi = g.filter(function (e) { return typeof (e.x.manfaat || {}).up === 'number'; });
        if (terisi.length === g.length) {
          hasil.push({ jenis: j, mu: mu, lengkap: true, jumlah: g.length, total: g.reduce(function (s, e) { return s + e.x.manfaat.up; }, 0) });
        } else {
          hasil.push({ jenis: j, mu: mu, lengkap: false, jumlah: g.length, terisi: terisi.length });
        }
      });
    });
    return hasil;
  }

  function barisManfaat(x, mu) {
    var m = x.manfaat || {}, b = [];
    var tambah = function (label, nilai) { if (nilai !== '' && nilai !== undefined && nilai !== null) b.push([label, nilai]); };
    if (x.jenis === 'JIWA') {
      tambah('UP jiwa', uang(m.up, mu));
    } else if (x.jenis === 'PK') {
      tambah('UP penyakit kritis', uang(m.up, mu));
      if (m.sifat) tambah('Sifat manfaat', SIFAT_PK[m.sifat]);
    } else if (x.jenis === 'KECELAKAAN') {
      tambah('UP meninggal karena kecelakaan', uang(m.upMeninggal, mu));
      tambah('Cacat tetap', uang(m.cacatTetap, mu));
      tambah('Biaya medis kecelakaan', uang(m.biayaMedis, mu));
    } else if (x.jenis === 'KESEHATAN') {
      tambah('Plan', m.plan);
      tambah('Sistem manfaat', SISTEM[m.sistem]);
      if (m.sistem === 'TAHUNAN') {
        tambah('Limit tahunan', uang(m.limitTahunan, mu));
        tambah('Limit booster', uang(m.limitBooster, mu));
        tambah('Syarat booster', m.syaratBooster);
      } else if (m.sistem === 'PER_KEJADIAN') {
        tambah('Limit per tindakan/kejadian', uang(m.limitPerKejadian, mu));
        tambah('Kamar per hari', uang(m.kamarPerHari, mu));
      } else if (m.sistem === 'HARIAN') {
        tambah('Santunan harian', uang(m.santunanHarian, mu));
        if (m.maksHari) tambah('Maksimal', m.maksHari + ' hari');
      }
      tambah('Kamar', m.kamar);
    } else {
      tambah('Jenis', m.namaJenis);
      tambah('Manfaat utama', m.manfaatUtama);
      tambah('Nilai', uang(m.nilai, mu));
    }
    if (m.catatan) tambah('Catatan manfaat', m.catatan);
    return b;
  }

  function htmlPerlindungan(x, mu) {
    var info = JENIS[x.jenis] || JENIS.LAINNYA;
    var judul = x.peran === 'RIDER' ? (x.nama || 'Rider ' + info.label) : 'Perlindungan dasar';
    var baris = barisManfaat(x, mu);
    return '<div class="as-cover' + (x.peran === 'RIDER' ? ' as-cover-rider' : '') + '">' +
      '<div class="as-cover-head"><span class="as-cover-ikon" aria-hidden="true">' + info.ikon + '</span>' +
      '<span class="as-cover-judul">' + esc(judul) + '</span>' +
      '<span class="as-chip">' + esc(info.label) + '</span>' + (x.peran === 'RIDER' ? '<span class="as-chip as-chip-rider">Rider</span>' : '') + '</div>' +
      (baris.length ? '<dl class="as-manfaat">' + baris.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>'
        : '<p class="as-kosong">Manfaat belum dicatat.</p>') +
      '</div>';
  }

  function htmlKartuPolis(p) {
    var mu = p.mataUang || 'IDR';
    return '<article class="as-polis" data-id="' + esc(p.id) + '">' +
      '<header class="as-polis-head"><div><div class="as-perusahaan">' + esc(p.perusahaan) + '</div>' +
      '<h3>' + esc(p.produk) + '</h3></div>' +
      '<span class="as-badge as-badge-' + (p.jenisPolis === 'UNIT_LINK' ? 'ul' : 'trad') + '">' + esc(JENIS_POLIS[p.jenisPolis] || '') + '</span></header>' +
      '<div class="as-polis-meta"><span>Aktif sejak ' + esc(tgl(p.mulai)) + '</span>' + (p.nomorAkhir ? '<span>No. polis •••• ' + esc(p.nomorAkhir) + '</span>' : '') + (mu === 'USD' ? '<span>Mata uang USD</span>' : '') + '</div>' +
      (p.perlindungan || []).map(function (x) { return htmlPerlindungan(x, mu); }).join('') +
      (st.kelola ? '<div class="as-polis-aksi"><button type="button" class="sakelar as-edit" data-id="' + esc(p.id) + '">✎ Edit</button><button type="button" class="sakelar as-hapus" data-id="' + esc(p.id) + '">🗑 Hapus</button></div>' : '') +
      '</article>';
  }

  function htmlRingkasan() {
    var semua = semuaPerlindungan();
    var kategori = URUT_JENIS.filter(function (j) { return semua.some(function (e) { return e.x.jenis === j; }); });
    var perusahaan = {};
    st.polis.forEach(function (p) { perusahaan[String(p.perusahaan).trim().toLowerCase()] = 1; });
    var totals = totalUP();
    var dipercepat = semua.some(function (e) { return e.x.jenis === 'PK' && (e.x.manfaat || {}).sifat === 'DIPERCEPAT'; });
    var urut = st.polis.slice().sort(function (a, b) { return String(a.mulai).localeCompare(String(b.mulai)); });
    return '<div class="as-hero"><div><div class="as-kicker">ASURANSIKU</div>' +
      '<h2>Perlindungan yang saya miliki</h2>' +
      '<p>Saya tidak hanya berbagi tentang pentingnya asuransi. Saya juga memahami dan memiliki perlindungan untuk diri saya sendiri.</p></div>' +
      '<button type="button" class="as-pensil' + (st.kelola ? ' aktif' : '') + '" id="asKelola" aria-pressed="' + st.kelola + '" title="' + (st.kelola ? 'Selesai mengelola' : 'Kelola polis') + '" aria-label="' + (st.kelola ? 'Selesai mengelola' : 'Kelola polis') + '">' + (st.kelola ? '✓' : '✎') + '</button></div>' +
      '<div class="as-statistik">' +
      '<div class="as-stat"><b>' + st.polis.length + '</b><span>Polis</span></div>' +
      '<div class="as-stat"><b>' + kategori.length + '</b><span>Kategori perlindungan</span></div>' +
      '<div class="as-stat"><b>' + Object.keys(perusahaan).length + '</b><span>Perusahaan</span></div></div>' +
      '<div class="as-kategori">' + kategori.map(function (j) { return '<span class="as-chip as-chip-besar">' + JENIS[j].ikon + ' ' + esc(JENIS[j].label) + '</span>'; }).join('') + '</div>' +
      (totals.length ? '<div class="as-total">' + totals.map(function (t) {
        var nama = t.jenis === 'JIWA' ? 'Total UP Jiwa tercatat' : 'Total UP Penyakit Kritis tercatat';
        return t.lengkap
          ? '<div class="as-total-baris"><span>' + nama + (t.mu === 'USD' ? ' (USD)' : '') + '</span><b>' + esc(uang(t.total, t.mu)) + '</b><small>dari ' + t.jumlah + ' perlindungan</small></div>'
          : '<div class="as-total-baris as-total-kurang"><span>' + nama + (t.mu === 'USD' ? ' (USD)' : '') + '</span><small>' + t.terisi + ' dari ' + t.jumlah + ' perlindungan mencantumkan UP, total tidak ditampilkan.</small></div>';
      }).join('') + '</div>' : '') +
      (dipercepat ? '<p class="as-catatan-penting">Manfaat penyakit kritis yang <b>dipercepat</b> dapat mengurangi UP jiwa sesuai ketentuan polis. Total di atas tidak berarti seluruhnya dapat dicairkan bersamaan.</p>' : '') +
      (st.kelola ? '<div class="aksi-row as-kelola-bar"><button type="button" class="aksi" id="asTambah"' + (st.polis.length >= MAKS_POLIS ? ' disabled' : '') + '>+ Tambah Polis</button>' +
        (st.polis.length >= MAKS_POLIS ? '<span class="catatan">Batas ' + MAKS_POLIS + ' polis tercapai.</span>' : '') + '</div>' : '') +
      '<div class="as-daftar">' + urut.map(htmlKartuPolis).join('') + '</div>' +
      '<p class="as-sangkalan">Catatan pribadi agen. Bukan dokumen polis resmi; manfaat mengikuti ketentuan polis masing-masing.</p>';
  }

  /* ---------- Formulir bertahap ---------- */

  var LANGKAH = ['Polis', 'Perlindungan dasar', 'Rider', 'Catatan', 'Tinjau'];

  function perlindunganBaru(peran, jenis) {
    var x = { id: uuid(), peran: peran, jenis: jenis || '', manfaat: {} };
    if (peran === 'RIDER') x.nama = '';
    return x;
  }
  function polisBaru() {
    return { perusahaan: '', produk: '', jenisPolis: '', mulai: '', nomorAkhir: '', mataUang: 'IDR', perlindungan: [perlindunganBaru('DASAR', '')], catatanPribadi: '' };
  }

  function fieldUang(id, label, nilai, mu, bantu) {
    return '<div><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="text" inputmode="numeric" autocomplete="off" data-uang placeholder="' + (mu === 'USD' ? 'US$' : 'Rp') + ' 0 (kosongkan bila belum tahu)" value="' + esc(nilai === undefined || nilai === null ? '' : Number(nilai).toLocaleString('id-ID')) + '">' + (bantu ? '<small class="catatan">' + esc(bantu) + '</small>' : '') + '</div>';
  }
  function fieldTeks(id, label, nilai, maks, ph) {
    return '<div><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="text" maxlength="' + maks + '" autocomplete="off" placeholder="' + esc(ph || 'Opsional') + '" value="' + esc(nilai || '') + '"></div>';
  }
  function fieldPilih(id, label, nilai, opsi, kosong) {
    return '<div><label for="' + id + '">' + esc(label) + '</label><select id="' + id + '">' + (kosong !== undefined ? '<option value="">' + esc(kosong) + '</option>' : '') +
      Object.keys(opsi).map(function (k) { return '<option value="' + k + '"' + (nilai === k ? ' selected' : '') + '>' + esc(opsi[k]) + '</option>'; }).join('') + '</select></div>';
  }

  /* Kolom manfaat per jenis; awalan id membedakan dasar dan tiap rider. */
  function htmlManfaat(x, aw, mu) {
    var m = x.manfaat || {};
    if (!x.jenis) return '<p class="catatan">Pilih jenis perlindungan untuk mengisi manfaatnya.</p>';
    if (x.jenis === 'JIWA') return '<div class="baris">' + fieldUang(aw + 'up', 'Uang pertanggungan (UP) jiwa', m.up, mu) + fieldTeks(aw + 'catatan', 'Catatan manfaat', m.catatan, 300) + '</div>';
    if (x.jenis === 'PK') return '<div class="baris">' + fieldUang(aw + 'up', 'Uang pertanggungan penyakit kritis', m.up, mu) +
      fieldPilih(aw + 'sifat', 'Sifat manfaat', m.sifat, SIFAT_PK, 'Pilih bila diketahui') + '</div><div class="baris satu">' + fieldTeks(aw + 'catatan', 'Catatan manfaat', m.catatan, 300, 'Mis. jumlah penyakit, tahap awal') + '</div>';
    if (x.jenis === 'KECELAKAAN') return '<div class="baris">' + fieldUang(aw + 'upMeninggal', 'UP meninggal karena kecelakaan', m.upMeninggal, mu) + fieldUang(aw + 'cacatTetap', 'Cacat tetap', m.cacatTetap, mu) + '</div>' +
      '<div class="baris">' + fieldUang(aw + 'biayaMedis', 'Biaya medis kecelakaan', m.biayaMedis, mu) + fieldTeks(aw + 'catatan', 'Batas atau manfaat lain', m.catatan, 300) + '</div>';
    if (x.jenis === 'KESEHATAN') {
      var s = m.sistem || '';
      var isi = '<div class="baris">' + fieldTeks(aw + 'plan', 'Nama plan / kelas plan', m.plan, 80) + fieldPilih(aw + 'sistem', 'Sistem manfaat plan ini', s, SISTEM, 'Pilih sistem manfaat') + '</div>';
      if (s === 'TAHUNAN') isi += '<div class="baris">' + fieldUang(aw + 'limitTahunan', 'Limit tahunan (dasar)', m.limitTahunan, mu) + fieldUang(aw + 'limitBooster', 'Limit booster / tambahan', m.limitBooster, mu, 'Manfaat di luar limit dasar, bila ada.') + '</div><div class="baris satu">' + fieldTeks(aw + 'syaratBooster', 'Syarat booster', m.syaratBooster, 300, 'Mis. aktif setelah limit dasar habis') + '</div>';
      else if (s === 'PER_KEJADIAN') isi += '<div class="baris">' + fieldUang(aw + 'limitPerKejadian', 'Limit per tindakan / kejadian', m.limitPerKejadian, mu) + fieldUang(aw + 'kamarPerHari', 'Biaya kamar per hari', m.kamarPerHari, mu) + '</div>';
      else if (s === 'HARIAN') isi += '<div class="baris">' + fieldUang(aw + 'santunanHarian', 'Santunan per hari', m.santunanHarian, mu) + '<div><label for="' + aw + 'maksHari">Maksimal hari per tahun</label><input id="' + aw + 'maksHari" type="number" min="0" max="366" step="1" placeholder="Opsional" value="' + esc(m.maksHari || '') + '"></div></div>';
      if (s) isi += '<div class="baris">' + fieldTeks(aw + 'kamar', 'Kamar', m.kamar, 80, 'Mis. 1 bed standar') + fieldTeks(aw + 'catatan', 'Catatan manfaat', m.catatan, 300) + '</div>';
      return isi;
    }
    return '<div class="baris">' + fieldTeks(aw + 'namaJenis', 'Nama jenis perlindungan *', m.namaJenis, 80, 'Mis. Asuransi pendidikan') + fieldUang(aw + 'nilai', 'Nilai manfaat', m.nilai, mu) + '</div><div class="baris satu">' + fieldTeks(aw + 'manfaatUtama', 'Manfaat utama', m.manfaatUtama, 300) + '</div>';
  }

  function htmlPilihJenis(x, aw) {
    return '<div class="as-jenis-pilih" role="radiogroup" aria-label="Jenis perlindungan" data-aw="' + aw + '">' + URUT_JENIS.map(function (j) {
      return '<button type="button" role="radio" aria-checked="' + (x.jenis === j) + '" data-jenis="' + j + '" class="as-jenis-btn' + (x.jenis === j ? ' aktif' : '') + '"><span aria-hidden="true">' + JENIS[j].ikon + '</span>' + esc(JENIS[j].label) + '</button>';
    }).join('') + '</div>';
  }

  function htmlLangkah() {
    var d = st.draf, mu = d.mataUang || 'IDR';
    var dasar = d.perlindungan[0];
    var riders = d.perlindungan.slice(1);
    var isi = '';
    if (st.langkah === 0) {
      isi = '<h3>Identitas polis</h3><p class="catatan">Siapa perusahaan asuransinya dan produk apa yang kamu miliki?</p>' +
        '<div class="baris">' + '<div><label for="asPerusahaan">Perusahaan asuransi *</label><input id="asPerusahaan" type="text" maxlength="80" list="asSaranPerusahaan" autocomplete="off" placeholder="Mis. Generali" value="' + esc(d.perusahaan) + '"><datalist id="asSaranPerusahaan">' + PERUSAHAAN_SARAN.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div>' +
        fieldTeks('asProduk', 'Nama produk / plan *', d.produk, 100, 'Nama produk sesuai polis') + '</div>' +
        '<div class="baris">' + fieldPilih('asJenisPolis', 'Jenis Polis *', d.jenisPolis, JENIS_POLIS, 'Pilih jenis polis') +
        '<div><label for="asMulai">Tanggal mulai aktif *</label><input id="asMulai" type="date" min="1950-01-01" value="' + esc(d.mulai) + '"></div></div>' +
        '<div class="baris"><div><label for="asNomorAkhir">4 digit terakhir nomor polis</label><input id="asNomorAkhir" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Opsional, mis. 4821" value="' + esc(d.nomorAkhir) + '"><small class="catatan">Demi privasi, nomor polis lengkap tidak disimpan.</small></div>' +
        fieldPilih('asMataUang', 'Mata uang polis', mu, { IDR: 'Rupiah (IDR)', USD: 'Dolar AS (USD)' }) + '</div>';
    } else if (st.langkah === 1) {
      isi = '<h3>Perlindungan dasar</h3><p class="catatan">Apa manfaat utama polis ini? Kosongkan nilai yang belum kamu ketahui.</p>' +
        htmlPilihJenis(dasar, 'asD_') + '<div class="as-manfaat-form" id="asManfaatDasar">' + htmlManfaat(dasar, 'asD_', mu) + '</div>';
    } else if (st.langkah === 2) {
      isi = '<h3>Rider</h3><p class="catatan">Rider adalah manfaat tambahan yang melekat pada polis ini dan ikut Jenis Polis ' + esc(JENIS_POLIS[d.jenisPolis] || '') + '. Lewati bila tidak ada.</p>' +
        riders.map(function (r, i) {
          var aw = 'asR' + i + '_';
          return '<div class="as-rider-form" data-rider="' + i + '"><div class="as-rider-head"><b>Rider ' + (i + 1) + '</b><button type="button" class="sakelar as-hapus-rider" data-rider="' + i + '">Hapus rider</button></div>' +
            '<div class="baris satu">' + fieldTeks(aw + 'nama', 'Nama rider', r.nama, 80, 'Mis. Rider Kesehatan Plan Gold') + '</div>' +
            htmlPilihJenis(r, aw) + '<div class="as-manfaat-form">' + htmlManfaat(r, aw, mu) + '</div></div>';
        }).join('') +
        '<div class="aksi-row"><button type="button" class="sakelar" id="asTambahRider"' + (riders.length >= MAKS_RIDER ? ' disabled' : '') + '>+ Tambah rider</button>' +
        (riders.length >= MAKS_RIDER ? '<span class="catatan">Maksimal ' + MAKS_RIDER + ' rider per polis.</span>' : '') + '</div>';
    } else if (st.langkah === 3) {
      isi = '<h3>Catatan pribadi</h3><p class="catatan">Opsional. Catatan ini hanya terlihat di formulir dan <b>tidak tampil</b> di ringkasan yang kamu tunjukkan ke nasabah.</p>' +
        '<div class="baris satu"><div><label for="asCatatan">Catatan pribadi</label><textarea id="asCatatan" rows="3" maxlength="500" placeholder="Mis. jatuh tempo premi, nama agen polis">' + esc(d.catatanPribadi) + '</textarea></div></div>' +
        '<p class="as-peringatan">Jangan mencatat data sensitif yang tidak perlu: NIK, data medis, nomor polis lengkap, atau dokumen polis.</p>';
    } else {
      var pratinjau = salin(d); pratinjau.id = st.idDraf;
      isi = '<h3>Tinjau sebelum disimpan</h3><p class="catatan">Beginilah polis ini tampil di ringkasan.</p>' + htmlKartuPolis(pratinjau) +
        (d.catatanPribadi ? '<p class="catatan">Catatan pribadi tersimpan, tidak tampil di ringkasan.</p>' : '');
    }
    var navigasi = LANGKAH.map(function (n, i) { return '<li class="' + (i === st.langkah ? 'aktif' : i < st.langkah ? 'selesai' : '') + '"><span>' + (i + 1) + '</span>' + esc(n) + '</li>'; }).join('');
    return '<div class="as-form-kepala"><div class="as-kicker">' + (st.idEdit ? 'EDIT POLIS' : 'POLIS BARU') + '</div><h2>' + esc(d.produk || d.perusahaan || 'Polis asuransi') + '</h2></div>' +
      '<ol class="as-langkah" aria-label="Langkah">' + navigasi + '</ol>' +
      '<div class="as-langkah-isi">' + isi + '</div>' +
      '<p class="as-galat" id="asGalat" role="alert">' + esc(st.galat) + '</p>' +
      (st.statusSimpan ? '<p class="as-status' + (st.simpanGagal ? ' gagal' : '') + '" id="asStatusSimpan" role="status">' + esc(st.statusSimpan) + '</p>' : '') +
      '<div class="as-form-nav">' +
      '<button type="button" class="sakelar" id="asBatal">Batal</button>' +
      (st.idEdit && st.langkah === 4 ? '<button type="button" class="sakelar as-hapus-polis" id="asHapusPolis">🗑 Hapus polis</button>' : '') +
      '<span class="as-spacer"></span>' +
      (st.langkah > 0 ? '<button type="button" class="sakelar" id="asSebelumnya">‹ Sebelumnya</button>' : '') +
      (st.langkah < 4 ? '<button type="button" class="aksi" id="asBerikutnya">Berikutnya ›</button>'
        : '<button type="button" class="aksi" id="asSimpan"' + (st.sedangSimpan ? ' disabled' : '') + '>' + (st.sedangSimpan ? 'Menyimpan…' : st.simpanGagal ? 'Coba simpan lagi' : 'Simpan') + '</button>') +
      '</div>';
  }

  /* Baca isian langkah yang sedang tampil ke draf. */
  function bacaManfaat(x, aw) {
    var m = {}, f = function (k) { return el(aw + k); };
    var uangDari = function (k) { var n = f(k); if (n) { var v = angkaDariTeks(n.value); if (v !== null) m[k] = v; } };
    var teksDari = function (k) { var n = f(k); if (n && n.value.trim()) m[k] = n.value.trim(); };
    var pilihDari = function (k) { var n = f(k); if (n && n.value) m[k] = n.value; };
    if (x.jenis === 'JIWA') { uangDari('up'); teksDari('catatan'); }
    else if (x.jenis === 'PK') { uangDari('up'); pilihDari('sifat'); teksDari('catatan'); }
    else if (x.jenis === 'KECELAKAAN') { uangDari('upMeninggal'); uangDari('cacatTetap'); uangDari('biayaMedis'); teksDari('catatan'); }
    else if (x.jenis === 'KESEHATAN') {
      pilihDari('sistem'); teksDari('plan');
      if (m.sistem === 'TAHUNAN') { uangDari('limitTahunan'); uangDari('limitBooster'); teksDari('syaratBooster'); }
      else if (m.sistem === 'PER_KEJADIAN') { uangDari('limitPerKejadian'); uangDari('kamarPerHari'); }
      else if (m.sistem === 'HARIAN') { uangDari('santunanHarian'); var h = f('maksHari'); if (h && h.value !== '') m.maksHari = Math.round(Number(h.value)); }
      if (m.sistem) { teksDari('kamar'); teksDari('catatan'); }
    } else if (x.jenis === 'LAINNYA') { teksDari('namaJenis'); teksDari('manfaatUtama'); uangDari('nilai'); }
    x.manfaat = m;
  }

  function bacaLangkah() {
    var d = st.draf;
    if (!d) return;
    if (st.langkah === 0) {
      if (!el('asPerusahaan')) return;
      d.perusahaan = el('asPerusahaan').value.trim();
      d.produk = el('asProduk').value.trim();
      d.jenisPolis = el('asJenisPolis').value;
      d.mulai = el('asMulai').value;
      d.nomorAkhir = el('asNomorAkhir').value.trim();
      d.mataUang = el('asMataUang').value || 'IDR';
    } else if (st.langkah === 1) {
      if (el('asManfaatDasar')) bacaManfaat(d.perlindungan[0], 'asD_');
    } else if (st.langkah === 2) {
      d.perlindungan.slice(1).forEach(function (r, i) {
        var aw = 'asR' + i + '_';
        if (!el(aw + 'nama')) return;
        r.nama = el(aw + 'nama').value.trim();
        bacaManfaat(r, aw);
      });
    } else if (st.langkah === 3) {
      if (el('asCatatan')) d.catatanPribadi = el('asCatatan').value.trim();
    }
  }

  function validasiLangkah(i) {
    var d = st.draf;
    if (i === 0) {
      if (!d.perusahaan) return 'Isi nama perusahaan asuransi.';
      if (!d.produk) return 'Isi nama produk atau plan.';
      if (!d.jenisPolis) return 'Pilih Jenis Polis: Unit Link atau Tradisional.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.mulai)) return 'Isi tanggal mulai aktif.';
      if (d.nomorAkhir && !/^\d{4}$/.test(d.nomorAkhir)) return 'Isi hanya 4 digit terakhir nomor polis.';
    }
    if (i === 1) {
      var x = d.perlindungan[0];
      if (!x.jenis) return 'Pilih jenis perlindungan dasar.';
      if (x.jenis === 'KESEHATAN' && !(x.manfaat || {}).sistem) return 'Pilih sistem manfaat plan kesehatan.';
      if (x.jenis === 'LAINNYA' && !(x.manfaat || {}).namaJenis) return 'Isi nama jenis perlindungan.';
    }
    if (i === 2) {
      var riders = d.perlindungan.slice(1);
      for (var r = 0; r < riders.length; r++) {
        if (!riders[r].jenis) return 'Pilih jenis perlindungan untuk rider ' + (r + 1) + '.';
        if (riders[r].jenis === 'KESEHATAN' && !(riders[r].manfaat || {}).sistem) return 'Pilih sistem manfaat untuk rider ' + (r + 1) + '.';
        if (riders[r].jenis === 'LAINNYA' && !(riders[r].manfaat || {}).namaJenis) return 'Isi nama jenis perlindungan untuk rider ' + (r + 1) + '.';
      }
    }
    return '';
  }

  function bukaForm(polis) {
    st.draf = polis ? salin(polis) : polisBaru();
    st.idEdit = polis ? polis.id : null;
    /* ID ditetapkan sekali per draf: mencoba simpan lagi tidak membuat polis ganda. */
    st.idDraf = polis ? polis.id : uuid();
    if (st.draf.nomorAkhir === undefined) st.draf.nomorAkhir = '';
    if (st.draf.catatanPribadi === undefined) st.draf.catatanPribadi = '';
    delete st.draf.id; delete st.draf.dibuat; delete st.draf.diperbarui;
    st.langkah = 0; st.ubah = false; st.galat = ''; st.statusSimpan = ''; st.simpanGagal = false;
    st.tampilan = 'form';
    gambar();
  }

  function tutupForm() {
    st.draf = null; st.idEdit = null; st.idDraf = ''; st.langkah = 0; st.ubah = false; st.galat = ''; st.statusSimpan = ''; st.simpanGagal = false;
    st.tampilan = st.polis.length ? 'ringkasan' : 'pengantar';
    gambar();
  }

  function muatanSimpan() {
    var d = salin(st.draf);
    var hasil = { perusahaan: d.perusahaan, produk: d.produk, jenisPolis: d.jenisPolis, mulai: d.mulai, mataUang: d.mataUang || 'IDR',
      perlindungan: d.perlindungan.map(function (x) { var o = { id: x.id, peran: x.peran, jenis: x.jenis, manfaat: x.manfaat || {} }; if (x.peran === 'RIDER' && x.nama) o.nama = x.nama; return o; }) };
    if (d.nomorAkhir) hasil.nomorAkhir = d.nomorAkhir;
    if (d.catatanPribadi) hasil.catatanPribadi = d.catatanPribadi;
    return hasil;
  }

  function simpan() {
    var p = api(); if (!p || st.sedangSimpan) return;
    for (var i = 0; i < 3; i++) { var g = validasiLangkah(i); if (g) { st.langkah = i; st.galat = g; gambar(); return; } }
    var id = st.idDraf;
    var nomor = st.urutan;
    st.sedangSimpan = true; st.statusSimpan = 'Menyimpan ke server…'; st.simpanGagal = false; gambar();
    p.simpanPolis(id, muatanSimpan()).then(function (d) {
      if (nomor !== st.urutan) return;
      st.sedangSimpan = false;
      var polis = d.polis;
      var ada = st.polis.findIndex(function (x) { return x.id === polis.id; });
      if (ada >= 0) st.polis[ada] = polis; else st.polis.push(polis);
      st.kelola = false;
      tutupForm();
      umumkan('Polis tersimpan.');
    }).catch(function (e) {
      if (nomor !== st.urutan) return;
      /* Draf dipertahankan selama halaman aktif; agen bisa langsung mencoba lagi. */
      st.sedangSimpan = false; st.simpanGagal = true;
      st.statusSimpan = 'Belum tersimpan. ' + ((e && e.message) || '');
      gambar();
    });
  }

  function hapusPolis(id) {
    var polis = st.polis.find(function (x) { return x.id === id; });
    if (!polis) return;
    var riders = (polis.perlindungan || []).filter(function (x) { return x.peran === 'RIDER'; });
    var pesan = 'Hapus polis ' + polis.produk + ' (' + polis.perusahaan + ')?' +
      (riders.length ? '\n\nRider yang ikut terhapus:\n- ' + riders.map(function (r) { return r.nama || JENIS[r.jenis].label; }).join('\n- ') : '') +
      '\n\nPolis lain tidak berubah.';
    if (!window.confirm(pesan)) return;
    var nomor = st.urutan;
    api().hapusPolis(id).then(function () {
      if (nomor !== st.urutan) return;
      st.polis = st.polis.filter(function (x) { return x.id !== id; });
      if (st.tampilan === 'form') tutupForm(); else { st.tampilan = st.polis.length ? 'ringkasan' : 'pengantar'; gambar(); }
      umumkan('Polis dihapus.');
    }).catch(function (e) {
      if (nomor !== st.urutan) return;
      umumkan('Polis belum terhapus. ' + ((e && e.message) || ''), true);
    });
  }

  function umumkan(t, gagal) {
    st.pengumuman = t; st.pengumumanGagal = !!gagal;
    gambar();
  }

  /* ---------- Gambar ---------- */

  function gambar() {
    var w = wadah(); if (!w) return;
    var catatanPreview = st.penyimpanan === 'preview'
      ? '<p class="as-mode-uji">Mode uji: data Asuransiku di Deploy Preview disimpan terpisah dari production.</p>' : '';
    var pengumuman = st.pengumuman ? '<p class="as-status' + (st.pengumumanGagal ? ' gagal' : '') + '" id="asPengumuman" role="status">' + esc(st.pengumuman) + '</p>' : '';
    var html = '';
    if (st.tampilan === 'tidak-tersedia') {
      html = '<div class="as-kosong-besar"><div class="as-ikon-besar" aria-hidden="true">🔒</div><h2>Khusus akun email terverifikasi</h2>' +
        '<p>Asuransiku menyimpan data pribadimu di akun PSG. Masuk dengan email dan password akun PSG kamu untuk memakainya.</p>' +
        (st.pesanGagal ? '<p class="catatan">' + esc(st.pesanGagal) + (st.kodeGagal ? ' (kode: ' + esc(st.kodeGagal) + ')' : '') + '</p>' +
          '<button type="button" class="sakelar" id="asMuatUlang">Muat ulang</button>' : '') + '</div>';
    } else if (st.tampilan === 'memuat') {
      html = '<div class="as-kosong-besar"><p>Memuat Asuransiku…</p></div>';
    } else if (st.tampilan === 'gagal') {
      html = '<div class="as-kosong-besar"><div class="as-ikon-besar" aria-hidden="true">📶</div><h2>Asuransiku belum bisa dimuat</h2><p>' + esc(st.pesanGagal) + (st.kodeGagal ? ' (kode: ' + esc(st.kodeGagal) + ')' : '') + '</p>' +
        '<p class="catatan">Data tidak ditampilkan dari salinan lama.</p>' +
        '<button type="button" class="aksi" id="asMuatUlang">Coba lagi</button></div>';
    } else if (st.tampilan === 'pengantar') {
      html = '<div class="as-hero as-hero-pengantar"><div><div class="as-kicker">ASURANSIKU</div><h2>Kenali dan tampilkan perlindungan yang sudah kamu miliki.</h2>' +
        '<p>Catat polis asuransi milikmu sendiri: jiwa, penyakit kritis, kecelakaan, kesehatan, dan lainnya. Ringkasannya bisa kamu tunjukkan kepada calon nasabah.</p></div></div>' +
        '<ul class="as-poin"><li>Satu ringkasan untuk semua polis, dari perusahaan mana pun.</li><li>Rider dicatat di dalam polis induknya.</li><li>Tersimpan di akun PSG-mu, bisa dibuka dari perangkat lain.</li></ul>' +
        '<p class="as-peringatan">Bukan pengganti dokumen polis resmi. Jangan mencatat NIK, data medis, atau nomor polis lengkap.</p>' +
        '<div class="aksi-row"><button type="button" class="aksi" id="asMulai">Mulai Isi Data</button></div>';
    } else if (st.tampilan === 'ringkasan') {
      html = htmlRingkasan();
    } else if (st.tampilan === 'form' && st.draf) {
      html = htmlLangkah();
    }
    w.innerHTML = catatanPreview + pengumuman + html;
  }

  /* ---------- Interaksi ---------- */

  function tandaiUbah() { st.ubah = true; }

  function klik(e) {
    var t = e.target.closest('button'); if (!t || !wadah().contains(t)) return;
    st.pengumuman = '';
    if (t.id === 'asMuatUlang') { muat(); return; }
    if (t.id === 'asMulai' || t.id === 'asTambah') { if (st.polis.length >= MAKS_POLIS) return; bukaForm(null); return; }
    if (t.id === 'asKelola') { st.kelola = !st.kelola; gambar(); return; }
    if (t.classList.contains('as-edit')) { var p = st.polis.find(function (x) { return x.id === t.dataset.id; }); if (p) bukaForm(p); return; }
    if (t.classList.contains('as-hapus')) { hapusPolis(t.dataset.id); return; }
    if (t.id === 'asHapusPolis') { hapusPolis(st.idEdit); return; }
    if (!st.draf) return;
    if (t.classList.contains('as-jenis-btn')) {
      bacaLangkah();
      var aw = t.closest('[data-aw]').dataset.aw;
      var x = aw === 'asD_' ? st.draf.perlindungan[0] : st.draf.perlindungan[1 + Number(aw.replace(/\D/g, ''))];
      if (x && x.jenis !== t.dataset.jenis) { x.jenis = t.dataset.jenis; x.manfaat = {}; tandaiUbah(); }
      gambar(); return;
    }
    if (t.id === 'asTambahRider') {
      bacaLangkah();
      if (st.draf.perlindungan.length - 1 >= MAKS_RIDER) return;
      st.draf.perlindungan.push(perlindunganBaru('RIDER', '')); tandaiUbah(); gambar(); return;
    }
    if (t.classList.contains('as-hapus-rider')) {
      bacaLangkah();
      var i = Number(t.dataset.rider), r = st.draf.perlindungan[1 + i];
      if (r && window.confirm('Hapus ' + (r.nama || 'rider ' + (i + 1)) + ' dari polis ini?')) { st.draf.perlindungan.splice(1 + i, 1); tandaiUbah(); }
      gambar(); return;
    }
    if (t.id === 'asBerikutnya') {
      bacaLangkah();
      var g = validasiLangkah(st.langkah);
      st.galat = g;
      if (!g) st.langkah++;
      gambar(); window.scrollTo(0, 0); return;
    }
    if (t.id === 'asSebelumnya') { bacaLangkah(); st.galat = ''; st.langkah--; gambar(); return; }
    if (t.id === 'asSimpan') { bacaLangkah(); simpan(); return; }
    if (t.id === 'asBatal') {
      bacaLangkah();
      if (st.ubah && !window.confirm('Buang perubahan yang belum disimpan? Data yang sudah tersimpan tidak berubah.')) return;
      tutupForm(); return;
    }
  }

  function ubahIsian(e) {
    var n = e.target; if (!n || !wadah().contains(n)) return;
    tandaiUbah();
    if (n.hasAttribute('data-uang') && e.type === 'change') {
      var v = angkaDariTeks(n.value); n.value = v === null ? '' : v.toLocaleString('id-ID');
    }
    if (n.id === 'asNomorAkhir') n.value = n.value.replace(/\D/g, '').slice(0, 4);
    /* Sistem manfaat kesehatan menentukan kolom yang tampil. */
    if (e.type === 'change' && /sistem$/.test(n.id)) { bacaLangkah(); gambar(); }
    if (e.type === 'change' && n.id === 'asMataUang') { bacaLangkah(); }
  }

  /* ---------- Pemasangan ---------- */

  function daftarkanLayar() {
    var nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.ASURANSIKU = { el: 'layarAsuransiku', judul: 'Asuransiku', sub: 'Perlindungan pribadi yang saya miliki', kiri: 'PRODUK' };
    return true;
  }

  function buka() {
    daftarkanLayar();
    if (typeof window.bukaLayar === 'function') window.bukaLayar('ASURANSIKU');
  }

  function pasang() {
    var w = wadah(); if (!w) return;
    daftarkanLayar();
    var tombol = el('btnAsuransiku');
    if (tombol) tombol.addEventListener('click', buka);
    w.addEventListener('click', klik);
    w.addEventListener('input', ubahIsian);
    w.addEventListener('change', ubahIsian);
    /* Setiap kali layar dibuka, data dimuat ulang dari server. */
    var s = el('layarAsuransiku');
    new MutationObserver(function () {
      if (layarAktif() && st.tampilan !== 'form') muat();
    }).observe(s, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('psg:identity-ready', function () {
      var email = emailSesi();
      if (email !== st.pemilik) { bersihkan(email ? 'memuat' : 'tidak-tersedia'); if (layarAktif()) muat(); else gambar(); }
    });
    window.addEventListener('online', function () { if (st.tampilan === 'gagal' && layarAktif()) muat(); });
    bersihkan(emailSesi() ? 'memuat' : 'tidak-tersedia');
    gambar();
  }

  window.PSGAsuransiku = {
    buka: buka,
    keadaan: function () { return { tampilan: st.tampilan, polis: salin(st.polis), kelola: st.kelola, langkah: st.langkah, penyimpanan: st.penyimpanan }; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang, { once: true });
  else pasang();
})();
