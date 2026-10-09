/* ============================================================
   Kotak Aktivitas Agen — Insurance Hub
   ------------------------------------------------------------
   Mencatat janji temu, presentasi, dan closing; menghitung poin;
   mencetak rekap klaim.

   Prinsip yang dipegang (jangan diubah tanpa alasan):
   1. Yang disimpan adalah KEJADIAN, bukan angka poin. Totalnya
      selalu dihitung ulang, sehingga aturan boleh berubah tanpa
      merusak riwayat lama.
   2. Yang disimpan adalah BAHAN MENTAH (premi + frekuensi),
      bukan hasilnya (FYAPE). Supaya bisa dihitung ulang.
   3. Aturan poin dan kontes ada di daftar terpisah di bawah,
      lengkap dengan tanggal berlaku. Mengubah kebijakan cukup
      menambah baris.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. ATURAN POIN (berversi) ---------- */

  const ATURAN_POIN = [
    {
      versi: '1.0',
      berlakuSejak: '2026-08-21',
      presentasi: 2,              // poin per presentasi yang memenuhi syarat
      dedupHari: 30,              // prospek sama baru berpoin lagi setelah sekian hari
      target: 100,                // poin untuk satu klaim
      batasPresentasi: 30,        // maksimal poin presentasi dalam satu klaim
      closing: [                  // urut dari ambang tertinggi
        { minFyape: 100000000, poin: 20, label: 'HNW' },
        { minFyape: 0, poin: 10, label: 'Non-HNW' }
      ]
    }
  ];

  /* ---------- 2. KONTES ---------- */

  /* Periode penukaran mengikuti flyer resmi PSG Point Reward Contest 2026.
     Semua periode dimulai 21 Agustus; yang membedakan tanggal berakhirnya,
     dan makin cepat tercapai makin besar vouchernya. */
  const KONTES = {
    nama: 'PSG Point Reward Contest 2026',
    mulai: '2026-08-21',
    selesai: '2026-11-30',
    hariPertamaAdalahSatu: true,
    periode: [
      { sampaiTanggal: '2026-09-20', hadiah: 300000 },
      { sampaiTanggal: '2026-10-20', hadiah: 200000 },
      { sampaiTanggal: '2026-11-30', hadiah: 100000 }
    ],
    klaimPerAgen: 1,
    catatan: 'Satu agen hanya boleh satu kali klaim selama periode kontes. ' +
      'Tidak berlaku kelipatan, dan poin antar periode tidak dapat digabungkan.'
  };

  const PENGALI_FREKUENSI = { BULANAN: 12, TRIWULANAN: 4, SEMESTERAN: 2, TAHUNAN: 1 };

  const PRODUK = [
    'BeSMART Lite Future',
    'BeSMART Lite - 100',
    'Cristal Prime',
    'New Cemerlang Prime',
    'Gen Aman (GSPA)',
    'iFLEXYGUARD 5',
    'GHP GenPro',
    'Kombinasi'
  ];

  /* ---------- 3. PENYIMPANAN ---------- */

  const K_AGEN = 'insuranceHub.agen.v1';
  const K_KEJADIAN = 'insuranceHub.aktivitas.kejadian.v1';
  const K_KLAIM = 'insuranceHub.aktivitas.klaim.v1';

  function baca(kunci, bawaan) {
    try { return JSON.parse(localStorage.getItem(kunci) || JSON.stringify(bawaan)); }
    catch (_) { return bawaan; }
  }
  function tulis(kunci, isi) {
    try { localStorage.setItem(kunci, JSON.stringify(isi)); return true; }
    catch (_) { return false; }
  }
  function uid(awalan) {
    if (globalThis.crypto && crypto.randomUUID) return awalan + '-' + crypto.randomUUID();
    return awalan + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  const agenLokalBaca = () => baca(K_AGEN, { nama: '', kode: '', hp: '' });
  const agenBaca = () => {
    const a = agenLokalBaca();
    const identity = window.InsuranceHubIdentity;
    if (identity && identity.source === 'server:/api/psg/me') {
      a.nama = identity.nama || '';
      a.kode = identity.kodeAgen || '';
    }
    return a;
  };
  const agenTulis = (a) => tulis(K_AGEN, a);
  const agenHpTulis = (hp) => {
    const a = agenLokalBaca();
    a.hp = rapikanHp(hp);
    return agenTulis(a);
  };
  const kejadianBaca = () => baca(K_KEJADIAN, []);
  const kejadianTulis = (l) => tulis(K_KEJADIAN, l);
  const klaimBaca = () => baca(K_KLAIM, []);
  const klaimTulis = (l) => tulis(K_KLAIM, l);

  /* ---------- 4. ALAT BANTU ---------- */

  // Nomor HP disimpan dan ditampilkan sebagai 0812..., apa pun cara agen mengetiknya.
  function rapikanHp(teks) {
    let a = String(teks || '').replace(/[^0-9+]/g, '');
    a = a.replace(/\+/g, '');
    if (a.startsWith('62')) a = '0' + a.slice(2);
    if (a && !a.startsWith('0')) a = '0' + a;
    return a;
  }
  // Bentuk yang diterima WhatsApp.
  function hpWa(teks) {
    const a = rapikanHp(teks);
    return a ? '62' + a.replace(/^0/, '') : '';
  }
  function normalNama(nama) {
    return String(nama || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function normalTgl(tgl) {
    return String(tgl || '').trim().slice(0, 10);
  }
  /* Nomor HP TIDAK lagi dipakai sebagai penanda orang. Satu keluarga inti
     kerap memakai satu nomor yang sama, sehingga ilustrasi untuk istri dan
     anak ikut dianggap orang yang sama dan poin presentasinya hanya dihitung
     sekali. Yang membedakan orang adalah nama beserta tanggal lahirnya. */
  function kunciProspek(nama, tglLahir, hp) {
    const n = normalNama(nama), t = normalTgl(tglLahir);
    if (n && t) return 'DOB|' + n + '|' + t;
    return 'NAMA|' + n;
  }
  function prospekCocok(a, b) {
    const na = normalNama(a.nama), nb = normalNama(b.nama);
    const ta = normalTgl(a.tglLahir), tb = normalTgl(b.tglLahir);
    // Nomor HP sengaja tidak diperiksa, dengan alasan yang sama seperti di atas.
    if (!na || !nb || na !== nb) return false;
    /* Dua-duanya punya tanggal lahir tapi berbeda berarti dua orang berbeda
       yang kebetulan senama. Sebelumnya baris ini tidak ada, sehingga
       presentasi ke "Budi lahir 1990" bisa mengesahkan poin closing untuk
       "Budi lahir 1975" — padahal kunciProspek() sudah memisahkan keduanya
       saat menghitung poin presentasi. Kedua fungsi kini sepakat tentang
       apa artinya "orang yang sama". */
    if (ta && tb && ta !== tb) return false;
    return true;
  }
  function rupiah(n) {
    return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  }
  function tglIso(d) {
    const t = d instanceof Date ? d : new Date(d);
    if (isNaN(t)) return '';
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') +
      '-' + String(t.getDate()).padStart(2, '0');
  }
  function tglTampil(iso) {
    if (!iso) return '—';
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return iso;
    return Number(p[2]) + ' ' + bulan[Number(p[1]) - 1] + ' ' + p[0];
  }
  function waktuTampil(isoPanjang) {
    if (!isoPanjang) return '—';
    const d = new Date(isoPanjang);
    if (isNaN(d)) return '—';
    return tglTampil(tglIso(d)) + ', ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function selisihHari(dariIso, sampaiIso) {
    const a = new Date(String(dariIso).slice(0, 10) + 'T00:00:00');
    const b = new Date(String(sampaiIso).slice(0, 10) + 'T00:00:00');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }
  // Hari ke berapa sejak kontes dimulai.
  function hariKontes(iso) {
    const s = selisihHari(KONTES.mulai, iso);
    if (s === null) return null;
    return KONTES.hariPertamaAdalahSatu ? s + 1 : s;
  }
  function aturanBerlaku() {
    // Aturan terbaru yang tanggal berlakunya sudah lewat.
    const kini = tglIso(new Date());
    let dipakai = ATURAN_POIN[0];
    ATURAN_POIN.forEach(a => { if (a.berlakuSejak <= kini) dipakai = a; });
    return dipakai;
  }
  // FYAPE = premi dasar tahunan + premi rider tahunan.
  // Masing-masing memakai faktor frekuensi yang sama.
  function fyape(premi, frekuensi, premiRider) {
    const faktor = PENGALI_FREKUENSI[frekuensi] || 0;
    return ((Number(premi) || 0) + (Number(premiRider) || 0)) * faktor;
  }
  function poinClosing(nilaiFyape, aturan) {
    const baris = aturan.closing.find(b => nilaiFyape >= b.minFyape);
    return baris ? baris.poin : 0;
  }
  function labelKategori(nilaiFyape, aturan) {
    const baris = aturan.closing.find(b => nilaiFyape >= b.minFyape);
    return baris ? baris.label : '—';
  }

  /* ---------- 5. MESIN POIN ---------- */

  /* Menghitung ulang seluruh poin dari daftar kejadian.
     Tidak ada angka poin yang disimpan; semuanya dihitung di sini. */
  function hitung() {
    const aturan = aturanBerlaku();
    const semua = kejadianBaca();
    const mulai = KONTES.mulai;

    // --- Presentasi ---
    const presentasi = semua
      .filter(k => k.tipe === 'presentasi')
      .sort((a, b) => String(a.waktu).localeCompare(String(b.waktu)));

    const terakhirBerpoin = {};      // kunci prospek -> tanggal terakhir yang berpoin
    const rincianPresentasi = [];
    presentasi.forEach(k => {
      const kunci = kunciProspek(k.nama, k.tglLahir, k.hp);
      let berpoin = false;
      let alasan = '';
      if (tglIso(k.waktu) < mulai) {
        alasan = 'Sebelum kontes dimulai ' + tglTampil(mulai);
      } else {
        const sebelum = terakhirBerpoin[kunci];
        const jarak = sebelum ? selisihHari(sebelum, tglIso(k.waktu)) : null;
        if (sebelum && jarak !== null && jarak <= aturan.dedupHari) {
          alasan = 'Prospek sama, belum lewat ' + aturan.dedupHari + ' hari';
        } else {
          berpoin = true;
          terakhirBerpoin[kunci] = tglIso(k.waktu);
        }
      }
      rincianPresentasi.push({
        kejadian: k, kunci: kunci,
        poin: berpoin ? aturan.presentasi : 0,
        berpoin: berpoin, alasan: alasan
      });
    });

    // Prospek yang pernah dipresentasikan — syarat closing berpoin.
    const daftarPresentasi = semua.filter(k => k.tipe === 'presentasi');

    // --- Closing ---
    const rincianClosing = semua
      .filter(k => k.tipe === 'closing')
      .sort((a, b) => String(a.tglSpaj || '').localeCompare(String(b.tglSpaj || '')))
      .map(k => {
        const nilai = fyape(k.premi, k.frekuensi, k.premiRider);
        /* Syaratnya cukup: pernah ada presentasi untuk prospek yang sama.
           Urutan tanggal tidak lagi diperiksa.

           Tanggal presentasi tercatat otomatis saat agen menekan Cetak dan
           tidak bisa diedit, sedangkan tanggal SPAJ diisi manual. Agen yang
           presentasi lebih dulu tetapi baru mencetak ilustrasinya beberapa
           hari kemudian jadi kehilangan poin closing tanpa kesalahan apa pun
           — dan itu membuat kontes terasa dipersulit. Risiko penyalahgunaan
           tetap kecil karena poin presentasi sudah dibatasi 30 dari 100,
           bernilai 2 poin, dan prospek yang sama baru berpoin lagi setelah
           30 hari. */
        const cocokPresentasi = daftarPresentasi.some(p => prospekCocok(p, k));
        const kunci = kunciProspek(k.nama, k.tglLahir, k.hp);
        let poin = 0, alasan = '';
        if (k.status !== 'INFORCE') {
          alasan = 'Poin menunggu status Inforce';
        } else if (!cocokPresentasi) {
          alasan = 'Belum ada presentasi tercatat untuk prospek ini';
        } else if (tglIso(k.tglSpaj) < mulai) {
          alasan = 'Tanggal SPAJ sebelum kontes dimulai ' + tglTampil(mulai);
        } else {
          poin = poinClosing(nilai, aturan);
        }
        return {
          kejadian: k, kunci: kunci, fyape: nilai,
          kategori: labelKategori(nilai, aturan),
          poin: poin, berpoin: poin > 0, alasan: alasan
        };
      });

    // --- Total, dengan batas presentasi ---
    const belumDiklaim = (r) => !r.kejadian.klaimId;

    const poinClosingSah = rincianClosing.filter(r => r.berpoin && belumDiklaim(r))
      .reduce((s, r) => s + r.poin, 0);
    const poinPresentasiMentah = rincianPresentasi.filter(r => r.berpoin && belumDiklaim(r))
      .reduce((s, r) => s + r.poin, 0);
    const poinPresentasiTerpakai = Math.min(poinPresentasiMentah, aturan.batasPresentasi);

    return {
      aturan: aturan,
      presentasi: rincianPresentasi,
      closing: rincianClosing,
      poinClosing: poinClosingSah,
      poinPresentasiMentah: poinPresentasiMentah,
      poinPresentasi: poinPresentasiTerpakai,
      total: poinClosingSah + poinPresentasiTerpakai,
      target: aturan.target,
      cukupUntukKlaim: (poinClosingSah + poinPresentasiTerpakai) >= aturan.target
    };
  }

  /* Menentukan tingkat hadiah dari tanggal SPAJ terakhir yang dipakai.
     Kecepatan diukur dari SPAJ; poinnya sendiri baru sah saat Inforce. */
  function tingkatHadiah(tglSpajTerakhir) {
    const hari = hariKontes(tglSpajTerakhir);
    const t = tglIso(tglSpajTerakhir);
    if (!t) return { hari: null, hadiah: 0, sampaiTanggal: null };
    const p = KONTES.periode.find(x => t <= x.sampaiTanggal);
    return {
      hari: hari, hadiah: p ? p.hadiah : 0,
      sampaiTanggal: p ? p.sampaiTanggal : null
    };
  }

  /* ---------- 6. MENCATAT PRESENTASI ---------- */

  /* Dipanggil otomatis saat tombol cetak ilustrasi ditekan.
     Tanggalnya diambil dari jam perangkat saat itu dan tidak bisa diedit. */
  function catatPresentasi(judulDokumen) {
    try {
      const judul = String(judulDokumen || '');
      const pisah = judul.split(' - ');
      const produk = pisah[0] || 'Ilustrasi';
      const nama = (pisah.slice(1).join(' - ') || '').trim();
      if (!nama || nama === 'Nasabah') return;   // tanpa nama, tidak dicatat

      // Melengkapi tanggal lahir dan nomor HP dari profil nasabah bila ada.
      const cocokNama = (x) => String(x || '').trim().toLowerCase() === nama.toLowerCase();
      let tglLahir = '', hp = '';
      try {
        const daftar = JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1') || '[]');
        const cocok = daftar.find(p => cocokNama(p.nama));
        if (cocok) { tglLahir = cocok.tglLahir || ''; hp = cocok.hp || ''; }
      } catch (_) {}
      // Kalau profilnya belum ada, nomor HP diambil dari catatan aktivitas
      // dengan nama yang sama — janji temu atau closing.
      if (!hp || !tglLahir) {
        kejadianBaca().forEach(x => {
          if (!cocokNama(x.nama)) return;
          if (!hp && x.hp) hp = x.hp;
          if (!tglLahir && x.tglLahir) tglLahir = x.tglLahir;
        });
      }

      const daftar = kejadianBaca();
      daftar.push({
        id: uid('pres'), tipe: 'presentasi',
        nama: nama, tglLahir: tglLahir, hp: rapikanHp(hp),
        produk: produk,
        waktu: new Date().toISOString(),     // terkunci
        versiAturan: aturanBerlaku().versi
      });
      kejadianTulis(daftar);
      if (typeof window.aktivitasSegarkan === 'function') window.aktivitasSegarkan();
    } catch (_) { /* pencatatan tidak boleh mengganggu pencetakan */ }
  }

  /* Nomor HP boleh dilengkapi belakangan bila saat mencetak profilnya belum ada.
     Tanggal presentasi tetap terkunci — yang diubah hanya data prospeknya. */
  function lengkapiHp(idKejadian, nomor, tglLahir) {
    const daftar = kejadianBaca();
    const k = daftar.find(x => x.id === idKejadian);
    if (!k) return { ok: false, pesan: 'Catatan tidak ditemukan.' };
    if (k.klaimId) return { ok: false, pesan: 'Catatan ini sudah terkunci dalam klaim.' };
    k.hp = rapikanHp(nomor);
    if (tglLahir) k.tglLahir = tglLahir;
    // Prospek yang sama pada catatan lain ikut dilengkapi.
    const nama = String(k.nama || '').trim().toLowerCase();
    daftar.forEach(x => {
      if (x.klaimId) return;
      if (String(x.nama || '').trim().toLowerCase() !== nama) return;
      if (!x.hp) x.hp = k.hp;
      if (!x.tglLahir && k.tglLahir) x.tglLahir = k.tglLahir;
    });
    kejadianTulis(daftar);
    return { ok: true };
  }

  /* ---------- 7. KLAIM ---------- */

  function ajukanKlaim() {
    const h = hitung();
    if (!h.cukupUntukKlaim) return { ok: false, pesan: 'Poin belum mencapai ' + h.target + '.' };
    if (klaimBaca().length >= KONTES.klaimPerAgen) {
      return { ok: false, pesan: 'Satu agen hanya boleh satu klaim dalam kontes ini.' };
    }
    const agen = agenBaca();
    if (!agen.nama || !agen.kode) {
      return { ok: false, pesan: 'Isi dulu nama dan kode agen di bagian Identitas Agen.' };
    }

    // Mengambil kejadian sampai target tercapai: closing dulu (SPAJ paling awal),
    // lalu presentasi sampai batasnya.
    const dipakai = [];
    let poin = 0;
    let spajTerakhir = '';
    h.closing.filter(r => r.berpoin && !r.kejadian.klaimId).forEach(r => {
      if (poin >= h.target) return;
      dipakai.push(r.kejadian.id);
      poin += r.poin;
      if (String(r.kejadian.tglSpaj || '') > spajTerakhir) spajTerakhir = r.kejadian.tglSpaj;
    });
    let poinPres = 0;
    h.presentasi.filter(r => r.berpoin && !r.kejadian.klaimId).forEach(r => {
      if (poin >= h.target || poinPres >= h.aturan.batasPresentasi) return;
      dipakai.push(r.kejadian.id);
      poin += r.poin; poinPres += r.poin;
    });

    const tingkat = tingkatHadiah(spajTerakhir);
    const nomor = 'PSG-' + tglIso(new Date()).replace(/-/g, '') + '-' +
      String(klaimBaca().length + 1).padStart(2, '0');

    const klaim = {
      id: uid('klaim'), nomor: nomor,
      tanggal: new Date().toISOString(),
      poin: poin, poinDariClosing: poin - poinPres, poinDariPresentasi: poinPres,
      spajTerakhir: spajTerakhir,
      hariKe: tingkat.hari, hadiah: tingkat.hadiah,
      versiAturan: h.aturan.versi,
      kontesMulai: KONTES.mulai,
      agen: { nama: agen.nama, kode: agen.kode, hp: rapikanHp(agen.hp) },
      kejadian: dipakai
    };

    const semua = kejadianBaca();
    semua.forEach(k => { if (dipakai.indexOf(k.id) !== -1) k.klaimId = klaim.id; });
    kejadianTulis(semua);

    const daftarKlaim = klaimBaca();
    daftarKlaim.push(klaim);
    klaimTulis(daftarKlaim);

    return { ok: true, klaim: klaim };
  }

  /* ---------- 8. CADANGKAN / PULIHKAN ---------- */

  /*
   * Cadangan v2 adalah SNAPSHOT kondisi data pengguna saat tombol Cadangkan
   * ditekan. Semua key localStorage milik PSG/InsuranceHub ikut disimpan,
   * kecuali kunci otorisasi perangkat. Kunci otorisasi sengaja tidak ikut
   * dipindahkan agar backup JSON tidak dapat dipakai untuk melewati layar
   * akses di perangkat lain.
   */
  const CADANGAN_VERSI = 3;
  const CADANGAN_PREFIX = 'insuranceHub.';
  // Semua fitur persisten baru (termasuk Library Ilustrasi & Kartu Konsultan)
  // otomatis ikut snapshot selama memakai namespace insuranceHub.*.
  const CADANGAN_SKIP_KEYS = new Set([
    'insuranceHub.access.remember.v3',
    // Tema adalah preferensi perangkat, bukan data agen. Kalau ikut
    // dicadangkan, memulihkan berkas agen lain akan mengubah tema perangkat
    // ini — persis yang tidak boleh terjadi.
    'insuranceHub.theme.v3',
    'insuranceHub.theme.byAgent.v1'
  ]);

  function snapshotDataPengguna() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf(CADANGAN_PREFIX) !== 0 || CADANGAN_SKIP_KEYS.has(k)) continue;
      try {
        const v = localStorage.getItem(k);
        if (v !== null) data[k] = v;
      } catch (_) {}
    }
    return data;
  }

  function buatManifestSnapshot(data) {
    const keys = Object.keys(data || {}).sort();
    const kelompok = {};
    keys.forEach(k => {
      const nama = k.slice(CADANGAN_PREFIX.length);
      const bagian = nama.split('.')[0] || 'lainnya';
      kelompok[bagian] = (kelompok[bagian] || 0) + 1;
    });
    return {
      jumlahKey: keys.length,
      kelompok: kelompok,
      key: keys,
      persistentPenting: [
        'insuranceHub.customerProfiles.v1',
        'insuranceHub.libraryIlustrasi.v1',
        'insuranceHub.konsultan.v1',
        // Daftar agen yang dibantu ("Dibuat untuk agen lain") beserta foto dan
        // media sosialnya. Sudah ikut tercadangkan sejak awal karena snapshot
        // menyapu seluruh awalan insuranceHub., tetapi dulu tidak disebut di
        // hasil audit sehingga terlihat seolah tidak ikut.
        'insuranceHub.konsultan.atasNama.v1',
        'insuranceHub.agen.v1',
        'insuranceHub.agen.foto.v1'
      ].map(k => ({ key: k, ada: Object.prototype.hasOwnProperty.call(data || {}, k) }))
    };
  }

  function auditCadangan() {
    const data = snapshotDataPengguna();
    const manifest = buatManifestSnapshot(data);
    return {
      ok: true,
      versi: CADANGAN_VERSI,
      jumlahKey: manifest.jumlahKey,
      manifest: manifest,
      skipKeys: Array.from(CADANGAN_SKIP_KEYS),
      pesan: 'Backup mengambil seluruh data persistent dengan namespace insuranceHub.* kecuali kunci yang sengaja dikecualikan.'
    };
  }

  function cadangkan() {
    /* Snapshot diambil lebih dulu, baru manifestnya disusun. Sebelumnya
       manifest dihitung dari 'isi.data' di dalam deklarasi 'const isi' itu
       sendiri — variabelnya belum ada saat baris itu dijalankan, sehingga
       seluruh fungsi berhenti dengan ReferenceError dan tombol Cadangkan
       gagal tanpa pesan apa pun. */
    const data = snapshotDataPengguna();
    const isi = {
      jenis: 'insurance-hub-cadangan',
      versi: CADANGAN_VERSI,
      dibuat: new Date().toISOString(),
      format: 'snapshot-localstorage-v3',
      // Manifest membantu agen memastikan data persistent baru ikut tercadangkan.
      manifest: buatManifestSnapshot(data),
      aplikasi: 'PSG Selling Tools',
      data: data
    };
    let namaAgen = 'Agen';
    try {
      namaAgen = JSON.parse(data['insuranceHub.agen.v1'] || '{}').nama || 'Agen';
    } catch (_) {}
    const nama = 'Cadangan PSG Selling Tools ' + namaAgen + ' ' +
      tglIso(new Date()) + '.json';
    unduh(nama, JSON.stringify(isi, null, 2), 'application/json');
    return { ok: true, pesan: 'Cadangan lengkap berhasil dibuat.' };
  }

  function pulihkan(teks) {
    let isi;
    try { isi = JSON.parse(teks); } catch (_) {
      return { ok: false, pesan: 'Berkas tidak terbaca.' };
    }
    if (!isi || isi.jenis !== 'insurance-hub-cadangan') {
      return { ok: false, pesan: 'Berkas ini bukan cadangan PSG Selling Tools.' };
    }

    /* Format baru: RESTORE SNAPSHOT, bukan merge. */
    if (Number(isi.versi) >= 2 && (isi.format === 'snapshot-localstorage-v2' || isi.format === 'snapshot-localstorage-v3') &&
        isi.data && typeof isi.data === 'object' && !Array.isArray(isi.data)) {
      const data = isi.data;
      const keys = Object.keys(data);
      if (isi.format === 'snapshot-localstorage-v3' && isi.manifest &&
          Number(isi.manifest.jumlahKey) !== keys.length) {
        return { ok: false, pesan: 'Berkas cadangan tidak valid: manifest data tidak cocok.' };
      }
      /* Hanya awalan yang diperiksa. Kunci yang SEKARANG dikecualikan dari
         cadangan (tema) dulu ikut tersimpan, jadi berkas cadangan lama memuat
         kunci itu. Kalau kehadirannya dianggap rusak, seluruh berkas lama
         ditolak dan tidak ada satu pun data yang kembali. Kunci semacam itu
         cukup dilewati saat menulis, bukan membatalkan pemulihan. */
      if (!keys.every(k => typeof k === 'string' && k.indexOf(CADANGAN_PREFIX) === 0)) {
        return { ok: false, pesan: 'Berkas cadangan tidak valid atau rusak.' };
      }
      const kunciDitulis = keys.filter(k => !CADANGAN_SKIP_KEYS.has(k));

      try {
        /* Bersihkan seluruh data kerja PSG yang sekarang agar kondisi akhir
           benar-benar mengikuti snapshot, bukan gabungan dengan data lama. */
        const hapus = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf(CADANGAN_PREFIX) === 0 && !CADANGAN_SKIP_KEYS.has(k)) {
            hapus.push(k);
          }
        }
        hapus.forEach(k => localStorage.removeItem(k));

        /* Ditulis satu per satu dan kegagalannya dicatat. Sebelumnya seluruh
           penulisan dibungkus satu try: begitu satu kunci besar (mis. foto
           agen) melebihi kuota, sisanya batal ditulis dan agen hanya melihat
           pesan umum tanpa tahu data mana yang tidak kembali. */
        const gagal = [];
        kunciDitulis.forEach(k => {
          try { localStorage.setItem(k, String(data[k])); }
          catch (_) { gagal.push(k); }
        });

        const dilewati = keys.length - kunciDitulis.length;
        if (gagal.length) {
          return {
            ok: true,
            sebagian: true,
            gagal: gagal,
            pesan: 'Sebagian data tidak dapat dipulihkan karena penyimpanan perangkat penuh.\n\n'
              + gagal.length + ' dari ' + kunciDitulis.length + ' bagian gagal ditulis:\n'
              + gagal.map(k => '- ' + k.replace('insuranceHub.', '')).join('\n')
              + '\n\nKosongkan penyimpanan browser lalu pulihkan ulang dari berkas yang sama.'
          };
        }
        return {
          ok: true,
          pesan: 'Cadangan berhasil dipulihkan. ' + kunciDitulis.length + ' bagian data dikembalikan'
            + (dilewati ? ' (' + dilewati + ' bagian preferensi tampilan dilewati)' : '') + '.'
        };
      } catch (_) {
        return { ok: false, pesan: 'Pemulihan gagal. Penyimpanan perangkat tidak dapat menampung seluruh cadangan.' };
      }
    }

    /* Kompatibilitas dengan cadangan v1 yang dibuat sebelum snapshot v2.
       Data lama tetap dapat dibaca, tetapi format lama memang tidak mungkin
       mengembalikan key yang dahulu tidak pernah dicadangkan. */
    if (Number(isi.versi) === 1) {
      const adaSekarang = kejadianBaca();
      const idAda = {};
      adaSekarang.forEach(k => { idAda[k.id] = true; });
      let masuk = 0;
      (isi.kejadian || []).forEach(k => { if (!idAda[k.id]) { adaSekarang.push(k); masuk++; } });
      kejadianTulis(adaSekarang);

      const klaimSekarang = klaimBaca();
      const idKlaim = {};
      klaimSekarang.forEach(k => { idKlaim[k.id] = true; });
      (isi.klaim || []).forEach(k => { if (!idKlaim[k.id]) klaimSekarang.push(k); });
      klaimTulis(klaimSekarang);

      if (isi.foto) {
        try { if (!localStorage.getItem('insuranceHub.agen.foto.v1')) localStorage.setItem('insuranceHub.agen.foto.v1', isi.foto); }
        catch (_) {}
      }
      if (isi.agen && (isi.agen.nama || isi.agen.kode)) {
        const a = agenBaca();
        if (!a.nama && !a.kode) agenTulis(isi.agen);
      }
      if (Array.isArray(isi.profilNasabah) && isi.profilNasabah.length) {
        const p = baca('insuranceHub.customerProfiles.v1', []);
        const idP = {};
        p.forEach(x => { idP[x.id] = true; });
        isi.profilNasabah.forEach(x => { if (!idP[x.id]) p.push(x); });
        tulis('insuranceHub.customerProfiles.v1', p);
      }
      return { ok: true, pesan: 'Cadangan lama v1 dipulihkan (format lama, bukan snapshot 100%). Untuk backup 100% gunakan cadangan terbaru.' };
    }

    return { ok: false, pesan: 'Versi cadangan tidak didukung.' };
  }

  function unduh(namaBerkas, isi, tipe) {
    try {
      const blob = new Blob([isi], { type: tipe || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = namaBerkas;
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    } catch (_) { alert('Perangkat ini tidak mengizinkan pengunduhan berkas.'); }
  }

  /* ---------- 9. EKSPOR EXCEL (CSV) ---------- */

  function csvBaris(kolom) {
    return kolom.map(s => {
      const t = String(s === null || s === undefined ? '' : s);
      return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }).join(';');
  }

  function eksporCsv() {
    const h = hitung();
    const agen = agenBaca();
    const baris = [];
    baris.push(csvBaris(['REKAP AKTIVITAS AGEN']));
    baris.push(csvBaris(['Nama agen', agen.nama, 'Kode agen', agen.kode]));
    baris.push(csvBaris(['Kontes mulai', tglTampil(KONTES.mulai), 'Dicetak', tglTampil(tglIso(new Date()))]));
    baris.push(csvBaris(['Total poin', h.total, 'Dari closing', h.poinClosing, 'Dari presentasi', h.poinPresentasi]));
    baris.push('');
    baris.push(csvBaris(['CLOSING']));
    baris.push(csvBaris(['Tgl SPAJ', 'Tgl Inforce', 'No SPAJ', 'No Polis', 'Pemegang Polis',
      'Tertanggung', 'Produk', 'Premi', 'Frekuensi', 'FYAPE', 'Kategori', 'Status', 'Poin', 'Keterangan']));
    h.closing.forEach(r => {
      const k = r.kejadian;
      baris.push(csvBaris([k.tglSpaj, k.tglInforce, k.spaj, k.polis, k.pemegang, k.tertanggung,
        k.produk, k.premi, k.frekuensi, r.fyape, r.kategori, k.status, r.poin, r.alasan]));
    });
    baris.push('');
    baris.push(csvBaris(['JANJI TEMU']));
    baris.push(csvBaris(['Dibuat', 'Nama prospek', 'No HP', 'Tanggal janji', 'Jam', 'Status', 'Catatan']));
    kejadianBaca().filter(k => k.tipe === 'janji')
      .sort((a, b) => String(a.dibuat).localeCompare(String(b.dibuat)))
      .forEach(k => {
        const teks = { BELUM: 'Belum ada janji', BERHASIL: 'Berhasil', TIDAK: 'Tidak berhasil' };
        baris.push(csvBaris([waktuTampil(k.dibuat), k.nama, k.hp, k.tglJanji, k.jamJanji,
          teks[k.status] || k.status, k.catatan]));
      });
    baris.push('');
    baris.push(csvBaris(['PRESENTASI']));
    baris.push(csvBaris(['Waktu cetak', 'Nama prospek', 'No HP', 'Produk', 'Poin', 'Keterangan']));
    h.presentasi.forEach(r => {
      const k = r.kejadian;
      baris.push(csvBaris([waktuTampil(k.waktu), k.nama, k.hp, k.produk, r.poin, r.alasan]));
    });

    // BOM supaya Excel membaca huruf beraksen dengan benar.
    unduh('Rekap Aktivitas ' + (agen.nama || 'Agen') + ' ' + tglIso(new Date()) + '.csv',
      '\ufeff' + baris.join('\r\n'), 'text/csv;charset=utf-8');
  }

  /* ---------- 10. DIBUKA KE LUAR ---------- */

  window.InsuranceHubAktivitas = {
    ATURAN_POIN: ATURAN_POIN, KONTES: KONTES, PRODUK: PRODUK,
    PENGALI_FREKUENSI: PENGALI_FREKUENSI,
    baca: baca, tulis: tulis, uid: uid,
    agenBaca: agenBaca, agenTulis: agenTulis, agenLokalBaca: agenLokalBaca, agenHpTulis: agenHpTulis,
    kejadianBaca: kejadianBaca, kejadianTulis: kejadianTulis,
    klaimBaca: klaimBaca, klaimTulis: klaimTulis,
    rapikanHp: rapikanHp, hpWa: hpWa, kunciProspek: kunciProspek,
    rupiah: rupiah, tglIso: tglIso, tglTampil: tglTampil, waktuTampil: waktuTampil,
    hariKontes: hariKontes, aturanBerlaku: aturanBerlaku,
    fyape: fyape, labelKategori: labelKategori,
    hitung: hitung, tingkatHadiah: tingkatHadiah,
    catatPresentasi: catatPresentasi, lengkapiHp: lengkapiHp, ajukanKlaim: ajukanKlaim,
    cadangkan: cadangkan, pulihkan: pulihkan, auditCadangan: auditCadangan, unduh: unduh, eksporCsv: eksporCsv
  };

  /* Pencatatan cetak sekarang dilakukan langsung oleh fungsi cetak()
     di app.js, sehingga tidak bergantung pada wrapper/load order dan
     tidak berisiko tercatat dua kali. */

})();
