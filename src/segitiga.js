/* ============================================================
   Perlindungan Segitiga Financial
   ------------------------------------------------------------
   Alat bantu percakapan, bukan kalkulator produk. Dipakai agen
   untuk membuka pikiran prospek sebelum masuk ke angka premi.

   Alurnya sengaja memakai contoh orang lain lebih dulu — nama
   bawaannya Leo — supaya prospek tidak merasa sedang ditodong.
   Semua isian bisa diubah, jadi begitu percakapannya hangat,
   agen tinggal mengganti nama dan penghasilannya menjadi milik
   prospek sendiri tanpa berpindah halaman.

   Tiga lapis segitiga, dari yang paling sering terjadi:
     HEALTH           : membayar tagihan rumah sakit
     CRITICAL ILLNESS : mengganti penghasilan saat sakit kritis
     LIFE             : mengganti penghasilan dan mewariskan

   Tiap lapis punya kotak centang "sudah punya", karena prospek
   yang sudah memiliki sebagian perlindungan tetap perlu tahu
   sisanya berapa. Yang dihitung adalah kekurangannya, bukan
   kebutuhan kotornya.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (t) => String(t === null || t === undefined ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  // Format ringkas khusus angka yang ditampilkan di dalam bentuk Segitiga,
  // supaya nominal besar tidak terpotong oleh lebar lapisan.
  const rpRingkas = (n) => {
    const v = Math.round(Number(n) || 0);
    const a = Math.abs(v);
    if (a >= 1000000000) {
      const m = Math.round((v / 1000000000) * 10) / 10;
      return 'Rp' + String(m).replace('.', ',') + ' M';
    }
    if (a >= 1000000) {
      const jt = Math.round((v / 1000000) * 10) / 10;
      return 'Rp' + String(jt).replace('.', ',') + ' jt';
    }
    if (a >= 1000) {
      const rb = Math.round((v / 1000) * 10) / 10;
      return 'Rp' + String(rb).replace('.', ',') + ' rb';
    }
    return rp(v);
  };
  const ang = (v) => (typeof bAngka === 'function') ? bAngka(v) : (Number(v) || 0);

  /* Nilai awal yang dipakai saat bercerita. Semuanya bisa diubah agen. */
  const AWAL = {
    nama: 'Leo',
    tgl: '1984-08-06',
    jk: 'Pria',
    penghasilanBulanan: 10000000,
    tahunPenggantiCI: 5,      // pengganti penghasilan saat sakit kritis
    tahunPengobatan: 5,       // biaya pengobatan selama masa pemulihan
    tahunWarisan: 20,         // pengganti penghasilan untuk ahli waris
    tagihanBawah: 50000000,
    tagihanAtas: 500000000,
    persenBiayaPensiun: 70,   // biaya hidup saat pensiun, persen dari penghasilan kini
    usiaPensiun: 55,
    /* Masa bayar BeSMART Lite Future. Dijadikan pilihan agen, bukan hasil
       kurangan dari usia pensiun, karena inilah yang menentukan produknya. */
    lamaSiapkan: 15,
    usiaProduktif: 60,
    usiaHarapan: 80
  };

  const CARA_BAYAR_RS = [
    { kunci: 'debit', judul: 'Kartu debit atau kredit',
      isi: 'Uang keluar dari tabungan sendiri. Tagihan Rp50 juta sampai Rp500 juta ' +
        'bisa menghabiskan dana darurat, bahkan memaksa menjual aset.' },
    { kunci: 'kantor', judul: 'Asuransi kantor',
      isi: 'Ada plafon dan biasanya berhenti ketika berhenti bekerja atau pensiun — ' +
        'padahal risiko sakit justru naik setelah itu.' },
    { kunci: 'bpjs', judul: 'BPJS',
      isi: 'Menanggung banyak hal, tetapi berjenjang, antre, dan terbatas pada kelas ' +
        'serta tindakan tertentu.' },
    { kunci: 'ghp', judul: 'Asuransi kesehatan sesuai tagihan',
      isi: 'Tagihan rumah sakit dibayar sesuai tagihannya, tanpa plafon per jenis ' +
        'tindakan, dan berjalan terus selama polis aktif.' }
  ];

  const PUNYA_HEALTH = ['BPJS', 'Asuransi kantor',
    'Asuransi swasta dengan inner limit', 'Asuransi kesehatan sesuai tagihan'];

  /* ---------- Keadaan ---------- */

  const KEY = 'insuranceHub.segitiga.v1';
  const PROFILE_STATE_KEY = 'insuranceHub.segitiga.profiles.v2';
  // Konteks ini mencatat profile GLOBAL terakhir saat Segitiga dibuka.
  // Berbeda dari S.profileId: S.profileId adalah pilihan profil di dalam
  // Segitiga, sedangkan konteks ini dipakai untuk mendeteksi pergantian
  // nasabah dari halaman Profil Nasabah.
  const GLOBAL_CONTEXT_KEY = 'insuranceHub.segitiga.globalContext.v1';
  let S = null;

  function globalProfileId(){
    try { return String(localStorage.getItem('insuranceHub.customerProfile.active.v1') || ''); } catch (_) { return ''; }
  }
  function readGlobalContext(){
    try {
      const x=JSON.parse(localStorage.getItem(GLOBAL_CONTEXT_KEY)||'null');
      return x && typeof x==='object' ? x : null;
    } catch (_) { return null; }
  }
  function writeGlobalContext(id){
    try { localStorage.setItem(GLOBAL_CONTEXT_KEY, JSON.stringify({profileId:String(id||''), updatedAt:new Date().toISOString()})); } catch (_) {}
  }

  /*
   * Aturan konteks yang disepakati:
   * - Saat pertama kali Segitiga dibuka, selalu mulai dari Leo — Demo / Sharing,
   *   meskipun sudah ada profile global (mis. Shaundre).
   * - Setelah user memilih profile di Segitiga, selama profile global tidak berubah,
   *   pilihan di Segitiga dipertahankan.
   * - Bila profile global berubah, Segitiga kembali ke Leo — Demo / Sharing.
   * - Pemilihan manual profile di dropdown Segitiga tidak dianggap sebagai
   *   pergantian profile global.
   */
  function sinkronKonteksGlobal(){
    const gid=globalProfileId();
    const ctx=readGlobalContext();

    if(!ctx){
      // First entry: always start from Leo for demo / sharing.
      S=cleanState(awalBaru());
      S.profileId='DEMO_LEO';
      S.nama=AWAL.nama; S.tgl=AWAL.tgl; S.jk=AWAL.jk;
      S.penghasilanBulanan=AWAL.penghasilanBulanan;
      writeGlobalContext(gid);
      simpan();
      return;
    }

    if(String(ctx.profileId||'')!==gid){
      // Global customer changed: start a fresh Segitiga session from Leo.
      S=cleanState(awalBaru());
      S.profileId='DEMO_LEO';
      S.nama=AWAL.nama; S.tgl=AWAL.tgl; S.jk=AWAL.jk;
      S.penghasilanBulanan=AWAL.penghasilanBulanan;
      writeGlobalContext(gid);
      simpan();
      return;
    }
  }

  function profileSignatureOf(s) {
    s = s || {};
    return [String(s.profileId || 'DEMO_LEO'), s.nama || '', s.tgl || '', s.jk || '', Number(s.penghasilanBulanan) || 0].join('|');
  }

  function cleanState(raw) {
    return Object.assign({}, awalBaru(), raw || {});
  }

  function readProfileStates() {
    try {
      const x = JSON.parse(localStorage.getItem(PROFILE_STATE_KEY) || 'null');
      if (x && typeof x === 'object' && x.profiles && typeof x.profiles === 'object') return x;
    } catch (_) {}
    return { version: 2, activeProfileId: null, profiles: {} };
  }

  function profileState(id) {
    const all = readProfileStates();
    const p = all.profiles && all.profiles[String(id)];
    return p && p.state ? cleanState(p.state) : null;
  }

  function writeProfileState(state) {
    const all = readProfileStates();
    const id = String((state && state.profileId) || 'DEMO_LEO');
    all.version = 2;
    all.activeProfileId = id;
    all.profiles = all.profiles || {};
    all.profiles[id] = {
      updatedAt: new Date().toISOString(),
      profileSignature: profileSignatureOf(state),
      state: cleanState(state)
    };
    try { localStorage.setItem(PROFILE_STATE_KEY, JSON.stringify(all)); } catch (_) {}
  }

  function pastikanKeadaan() { if (!S) S = bacaSimpanan(); return S; }

  function bacaSimpanan() {
    const all = readProfileStates();
    const legacy = (function(){
      try {
        const t = JSON.parse(localStorage.getItem(KEY) || 'null');
        return t && typeof t === 'object' ? t : null;
      } catch (_) { return null; }
    })();

    const activeId = String(all.activeProfileId || (legacy && legacy.profileId) || 'DEMO_LEO');
    const saved = all.profiles && all.profiles[activeId] && all.profiles[activeId].state
      ? all.profiles[activeId].state
      : (legacy && String(legacy.profileId || 'DEMO_LEO') === activeId ? legacy : null);

    const state = cleanState(saved);
    state.profileId = activeId;

    // Migrasi satu kali dari penyimpanan global lama ke penyimpanan per-profile.
    if (!all.profiles || !all.profiles[activeId]) writeProfileState(state);
    return state;
  }

  function awalBaru() {
    return {
      nama: AWAL.nama, tgl: AWAL.tgl, jk: AWAL.jk, profileId: 'DEMO_LEO',
      penghasilanBulanan: AWAL.penghasilanBulanan,
      tahunPenggantiCI: AWAL.tahunPenggantiCI,
      tahunPengobatan: AWAL.tahunPengobatan,
      tahunWarisan: AWAL.tahunWarisan,
      punyaHealth: false, jenisHealth: PUNYA_HEALTH[0],
      punyaCI: false, upCIDimiliki: 0,
      punyaLife: false, upLifeDimiliki: 0,
      persenBiayaPensiun: AWAL.persenBiayaPensiun,
      usiaPensiun: AWAL.usiaPensiun,
      lamaSiapkan: null,          // null berarti belum dipilih agen
      usiaProduktif: AWAL.usiaProduktif,
      usiaHarapan: AWAL.usiaHarapan,
      punyaPensiun: false, danaPensiunDimiliki: 0,
      /* Urutan prioritas diisi dengan mencentang. Yang dicentang lebih dulu
         berada lebih atas, dan urutan itulah yang dipakai menyusun solusi. */
      prioritas: [],
      terbuka: 'health'
    };
  }

  function simpan() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      writeProfileState(S);
    } catch (_) {}
  }

  /* ---------- Perhitungan ---------- */

  function usia() {
    pastikanKeadaan();
    if (!S.tgl) return null;
    return (typeof usiaGenerali === 'function')
      ? usiaGenerali(new Date(S.tgl + 'T00:00:00Z')) : null;
  }

  /* Masa bayar BeSMART Lite Future. Dibaca dari tabel tarif bila tersedia,
     supaya tidak perlu diperbarui manual bila produknya berubah. */
  /* Uang pertanggungan BeSMART Lite Future di basis data kita bertingkat,
     sehingga angka kebutuhan jarang jatuh pas. Susunan yang dipakai dicari
     dari gabungan paling banyak dua polis, lalu selisihnya diberitahukan
     apa adanya di sini — supaya agen tidak kaget melihat angka di halaman
     solusi berbeda dari angka kebutuhan. */
  function catatanPembulatanUp(h) {
    const target = Number(h.pensiunKurang || h.pensiunIdeal || 0);
    if (!target) return '';
    let bagian = [];
    try {
      if (typeof window.optimasiLiteFutureRingkas === 'function') {
        bagian = window.optimasiLiteFutureRingkas(target) || [];
      }
    } catch (_) { bagian = []; }
    if (!bagian.length) return '';
    const jumlah = bagian.reduce(function (a, b) { return a + b; }, 0);
    if (jumlah === target) return '';
    const rincian = bagian.map(rp).join(' + ');
    return '<p class="catatan"><b>Catatan pembulatan.</b> Kebutuhannya ' + rp(target) +
      ', tetapi uang pertanggungan BeSMART Lite Future tersedia dalam tingkatan ' +
      'tertentu. Kombinasi terdekat yang dipakai adalah ' + rincian + ' = <b>' +
      rp(jumlah) + '</b>, jadi perhitungan solusinya memakai angka itu ' +
      '(lebih ' + rp(jumlah - target) + ' dari kebutuhan). ' +
      'Tingkatan ini hanya ada pada basis data alat bantu ini; aplikasi ' +
      'quotation resmi Generali menerima uang pertanggungan berapa pun dalam ' +
      'satu polis, jadi angka di sini adalah gambaran dan penerbitannya tetap ' +
      'mengikuti ilustrasi resmi.</p>';
  }

  function masaBayarTersedia() {
    const bawaan = [3, 5, 10, 15, 20];
    try {
      if (typeof TARIF === 'undefined' || !TARIF) return bawaan;
      const set = {};
      Object.keys(TARIF).forEach(function (k) {
        const m = /^LF[BT] (\d+)-\d+$/.exec(k);
        if (m) set[Number(m[1])] = true;
      });
      const ada = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
      return ada.length ? ada : bawaan;
    } catch (_) { return bawaan; }
  }

  function lamaSiapkanAwal(usiaSekarang) {
    const pilihan = masaBayarTersedia();
    if (usiaSekarang === null) return pilihan[pilihan.length - 1];
    const sisaProduktif = Math.max(0, (Number(S.usiaProduktif) || 60) - usiaSekarang);
    // Dibulatkan ke bawah: lebih aman kekurangan waktu daripada kelebihan.
    const muat = pilihan.filter(function (v) { return v <= sisaProduktif; });
    return muat.length ? muat[muat.length - 1] : pilihan[0];
  }

  const USIA_PENSIUN_PILIHAN = [55, 60, 65, 70, 75];
  const JEDA_MENGENDAP = 10;

  function usiaPensiunTersediaSegitiga(usiaSekarang, lamaSiapkan) {
    if (usiaSekarang === null) return USIA_PENSIUN_PILIHAN.slice();
    const batas = usiaSekarang + (Number(lamaSiapkan) || 0) + JEDA_MENGENDAP;
    const boleh = USIA_PENSIUN_PILIHAN.filter(function (u) { return u >= batas; });
    // Bila tak satu pun memenuhi, pilihan tertinggi tetap ditawarkan.
    return boleh.length ? boleh : [USIA_PENSIUN_PILIHAN[USIA_PENSIUN_PILIHAN.length - 1]];
  }

  function usiaPensiunAwal(usiaSekarang, lamaSiapkan) {
    // Yang terdekat dipilih lebih dulu; agen bebas memanjangkan.
    return usiaPensiunTersediaSegitiga(usiaSekarang, lamaSiapkan)[0];
  }

  function hitung() {
    pastikanKeadaan();
    const bulanan = Number(S.penghasilanBulanan) || 0;
    const tahunan = bulanan * 12;

    const ciPengganti = tahunan * (Number(S.tahunPenggantiCI) || 0);
    const ciPengobatan = tahunan * (Number(S.tahunPengobatan) || 0);
    const ciIdeal = ciPengganti + ciPengobatan;
    const ciPunya = S.punyaCI ? (Number(S.upCIDimiliki) || 0) : 0;

    const lifeIdeal = tahunan * (Number(S.tahunWarisan) || 0);
    const lifePunya = S.punyaLife ? (Number(S.upLifeDimiliki) || 0) : 0;

    /* Pensiun bukan risiko melainkan kepastian: kalau tidak meninggal lebih
       dulu, hari itu pasti datang. Perhitungannya sengaja dibuat sederhana
       dan konservatif — biaya hidup tahunan saat pensiun dikali lama masa
       pensiun, tanpa memperhitungkan inflasi maupun hasil investasi. Jadi
       angkanya adalah lantai kebutuhan, bukan angka pas. */
    const biayaPensiunBulanan = bulanan * ((Number(S.persenBiayaPensiun) || 0) / 100);
    const usiaSekarang = usia();

    /* Lama menyiapkan dana dipilih agen dari masa bayar yang tersedia pada
       BeSMART Lite Future. Nilai awalnya dihitung dari sisa masa produktif
       — usia produktif dikurangi usia sekarang — lalu DIBULATKAN KE BAWAH ke
       masa bayar terdekat. Contoh usia 42: 60 - 42 = 18 tahun, jadi 15. */
    const lamaSiapkan = Number(S.lamaSiapkan) || lamaSiapkanAwal(usiaSekarang);

    /* Usia pensiun yang masuk akal: usia sekarang + lama menyiapkan + 10
       tahun jeda mengendap. Yang ditampilkan hanya pilihan di atas itu. */
    /* Nilai tersimpan dari sesi lama bisa saja sudah tidak masuk akal —
       misalnya usia 55 yang tersimpan sebelum aturan ini ada. Kalau dipakai
       apa adanya, dropdown menampilkan 70 sementara perhitungan memakai 55,
       dan lama masa pensiun jadi 25 tahun padahal seharusnya 10. Karena itu
       nilainya dicocokkan dulu ke daftar yang benar-benar ditawarkan. */
    const pilihanUsia = usiaPensiunTersediaSegitiga(usiaSekarang, lamaSiapkan);
    let usiaPensiun = Number(S.usiaPensiun) || 0;
    if (pilihanUsia.indexOf(usiaPensiun) === -1) {
      usiaPensiun = pilihanUsia[0];
      S.usiaPensiun = usiaPensiun;     // disimpan supaya tidak menyimpang lagi
    }

    const lamaPensiun = Math.max(0, (Number(S.usiaHarapan) || 0) - usiaPensiun);
    const pensiunIdeal = biayaPensiunBulanan * 12 * lamaPensiun;
    const pensiunPunya = S.punyaPensiun ? (Number(S.danaPensiunDimiliki) || 0) : 0;
    const tahunMenyiapkan = lamaSiapkan;

    return {
      biayaPensiunBulanan: biayaPensiunBulanan,
      lamaPensiun: lamaPensiun,
      lamaSiapkan: lamaSiapkan,
      usiaPensiun: usiaPensiun,
      usiaPensiunPilihan: pilihanUsia,
      pensiunIdeal: pensiunIdeal,
      pensiunPunya: pensiunPunya,
      pensiunKurang: Math.max(0, pensiunIdeal - pensiunPunya),
      tahunMenyiapkan: tahunMenyiapkan,
      setoranBulananPensiun: (tahunMenyiapkan && tahunMenyiapkan > 0)
        ? Math.max(0, pensiunIdeal - pensiunPunya) / (tahunMenyiapkan * 12) : null,
      prioritas: (S.prioritas || []).slice(),
      usia: usia(),
      penghasilanBulanan: bulanan,
      penghasilanTahunan: tahunan,
      ciPengganti: ciPengganti,
      ciPengobatan: ciPengobatan,
      ciIdeal: ciIdeal,
      ciPunya: ciPunya,
      ciKurang: Math.max(0, ciIdeal - ciPunya),
      lifeIdeal: lifeIdeal,
      lifePunya: lifePunya,
      lifeKurang: Math.max(0, lifeIdeal - lifePunya),
      healthPunya: S.punyaHealth,
      healthJenis: S.punyaHealth ? S.jenisHealth : null,
      /* Hanya asuransi sesuai tagihan yang dianggap menutup lapis kesehatan.
         BPJS, asuransi kantor, dan plan berinner limit tetap menyisakan
         selisih tagihan yang harus ditanggung sendiri. */
      healthTertutup: S.punyaHealth && S.jenisHealth === 'Asuransi kesehatan sesuai tagihan'
    };
  }

  /* ---------- Segitiga ---------- */

  const LAPIS_INFO = {
    life: { judul: 'LIFE', ket: 'Warisan & pengganti penghasilan' },
    ci: { judul: 'CRITICAL ILLNESS', ket: 'Pengganti penghasilan saat sakit kritis' },
    health: { judul: 'HEALTH', ket: 'Membayar tagihan rumah sakit' },
    pensiun: { judul: 'TUA / PENSIUN', ket: 'Biaya hidup saat berhenti bekerja' }
  };

  function nilaiLapis(h, kunci) {
    if (kunci === 'life') return h.lifeKurang ? rpRingkas(h.lifeKurang) : 'Sudah cukup';
    if (kunci === 'ci') return h.ciKurang ? rpRingkas(h.ciKurang) : 'Sudah cukup';
    if (kunci === 'pensiun') return h.pensiunKurang ? rpRingkas(h.pensiunKurang) : 'Sudah cukup';
    return h.healthTertutup ? 'Sudah cukup' : 'Belum tertutup';
  }

  /* Nomor urut prioritas: hanya tampil jika kebutuhan sudah dipilih;
     angkanya mengikuti urutan centang prospek secara dinamis. */
  function urutan(kunci) {
    const i = (S.prioritas || []).indexOf(kunci);
    return i === -1 ? null : i + 1;
  }

  function kotakPrioritas(kunci) {
    const n = urutan(kunci);
    return '<label class="sgt-prio' + (n ? ' nyala' : '') + '" title="Tandai bila ini ' +
      'yang paling dipedulikan prospek">' +
      '<input type="checkbox" data-sgt-prio="' + kunci + '"' + (n ? ' checked' : '') + '>' +
      '<span>' + (n ? 'Prioritas ' + n : 'Jadikan prioritas') + '</span></label>';
  }

  /* Segitiga tetap tiga lapis karena ketiganya adalah RISIKO — mungkin
     terjadi, mungkin tidak. Pensiun berbeda sifatnya: kalau tidak meninggal
     lebih dulu, hari tua pasti datang. Secara visual ia menjadi atap rumah,
     tanpa mengubah logic maupun formula perhitungannya. */
  function segitiga(h, ringkas) {
    const lapis = ['life', 'ci', 'health'];
    return '<div class="sgt-bungkus">' +
      '<div class="sgt-gambar sgt-rumah">' +
      '<div class="sgt-atap-wrap sgt-lapis-wrap sgt-pensiun-wrap">' +
      (urutan('pensiun') ? '<span class="sgt-nomor">' + urutan('pensiun') + '</span>' : '') +
      '<button type="button" class="sgt-atap sgt-pensiun' +
      ((!ringkas && S.terbuka === 'pensiun') ? ' aktif' : '') + '" data-sgt-lapis="pensiun">' +
      '<span class="sgt-judul">TUA / PENSIUN</span>' +
      (ringkas ? '<span class="sgt-nilai">' + nilaiLapis(h, 'pensiun') + '</span>' : '') +
      '</button></div>' +
      '<div class="sgt-rumah-badan sgt-house-stack">' +
      lapis.map(function (k, i) {
        const l = LAPIS_INFO[k];
        const aktif = (!ringkas && S.terbuka === k) ? ' aktif' : '';
        const n = urutan(k);
        return '<div class="sgt-lapis-wrap">' +
          (n ? '<span class="sgt-nomor">' + n + '</span>' : '') +
          '<button type="button" class="sgt-lapis sgt-' + k + aktif + '" ' +
          'data-sgt-lapis="' + k + '">' +
          '<span class="sgt-judul">' + l.judul + '</span>' +
          (ringkas ? '<span class="sgt-nilai">' + nilaiLapis(h, k) + '</span>' : '') +
          '</button></div>';
      }).join('') +
      '</div>' +
      '</div>' +
      '<div class="sgt-arti">' +
      ['pensiun', 'life', 'ci', 'health'].map(function (k) {
        const l = LAPIS_INFO[k];
        return '<div class="sgt-arti-baris"><b>' + l.judul + '</b><span>' + l.ket + '</span>' +
          (ringkas ? '' : kotakPrioritas(k)) + '</div>';
      }).join('') +
      '</div></div>' +
      (ringkas ? '' :
        '<p class="catatan">Tiga lapis segitiga adalah risiko yang mungkin terjadi. ' +
        'Hari tua bukan risiko melainkan kepastian, jadi ia digambar sebagai landasan ' +
        'yang menopang seluruhnya. Centang sesuai urutan yang paling dipedulikan prospek.</p>');
  }

  /* ---------- Layar utama ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.SEGITIGA = {
      el: 'layarSegitiga', judul: 'Perlindungan Segitiga Financial',
      sub: 'Bangun kebutuhan bersama prospek', kiri: 'FINANCIAL_CALC'
    };
    nav.LAYAR.SEGITIGA_RINGKAS = {
      el: 'layarSegitigaRingkas', judul: 'Ringkasan Kebutuhan',
      sub: 'Siap dicetak untuk prospek', kiri: 'SEGITIGA'
    };
    return true;
  }


  /* Profil Segitiga memakai database Profil Nasabah utama.
     Leo tetap menjadi contoh default; daftar prospek dibaca dari CP_KEY
     yang sama dengan halaman Profil Nasabah. */
  function daftarProfilUtama(){
    const out=[{id:'DEMO_LEO',nama:'Leo',demo:true}];
    try{
      const list=(typeof cpRead==='function')?cpRead():JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1')||'[]');
      if(Array.isArray(list)) list.forEach(p=>{
        if(p&&p.id&&p.nama) out.push({id:p.id,nama:p.nama,profile:p});
      });
    }catch(_){}
    return out;
  }
  function profilTerpilih(id){
    if(id==='DEMO_LEO') return {id:'DEMO_LEO',nama:AWAL.nama,tglLahir:AWAL.tgl,jk:AWAL.jk,penghasilan:AWAL.penghasilanBulanan,snapshot:{}};
    const x=daftarProfilUtama().find(p=>p.id===id);
    return x&&x.profile?x.profile:null;
  }
  function pilihProfilUtama(id){
    const p=profilTerpilih(id);
    if(!p) return;

    // Simpan state profile aktif sebelum pindah, lalu restore state profile tujuan.
    if(S && S.profileId) writeProfileState(S);

    const saved=profileState(id);
    if(saved){
      S=saved;
      // Identitas utama selalu mengikuti database Profile Nasabah terbaru.
      S.profileId=id;
      S.nama=p.nama||S.nama||AWAL.nama;
      S.tgl=p.tglLahir||S.tgl||AWAL.tgl;
      S.jk=(String(p.jk||S.jk||AWAL.jk).toUpperCase()==='WANITA')?'Wanita':'Pria';
      S.penghasilanBulanan=Number(p.penghasilan)||Number(S.penghasilanBulanan)||AWAL.penghasilanBulanan;
      simpan();
      return;
    }

    // Profile baru: mulai dari state bersih tetapi existing coverage diambil dari snapshot profile.
    S=awalBaru();
    S.profileId=id;
    S.nama=p.nama||AWAL.nama;
    S.tgl=p.tglLahir||AWAL.tgl;
    S.jk=(String(p.jk||AWAL.jk).toUpperCase()==='WANITA')?'Wanita':'Pria';
    S.penghasilanBulanan=Number(p.penghasilan)||AWAL.penghasilanBulanan;
    const snap=p.snapshot||{};
    S.upLifeDimiliki=Number(snap.upJiwa)||0;
    S.punyaLife=S.upLifeDimiliki>0;
    S.upCIDimiliki=Number(snap.upCI)||0;
    S.punyaCI=S.upCIDimiliki>0;
    if(snap.kesehatan==='ADA'){
      S.punyaHealth=true;
      S.jenisHealth='Asuransi swasta dengan inner limit';
    }else{
      S.punyaHealth=false;
      S.jenisHealth=PUNYA_HEALTH[0];
    }
    S.prioritas=[];
    simpan();
  }
  function htmlProfilOptions(){
    const id=S.profileId||'DEMO_LEO';
    return daftarProfilUtama().map(p=>'<option value="'+esc(p.id)+'"'+(String(p.id)===String(id)?' selected':'')+'>'+esc(p.nama)+'</option>').join('');
  }

  function gambar() {
    const w = el('layarSegitiga');
    if (!w) return;
    const h = hitung();

    w.innerHTML =
      '<div class="kop"><h2>Perlindungan Segitiga Financial</h2>' +
      '<p>Tiga lapis perlindungan, disusun dari risiko yang paling sering terjadi. ' +
      'Ketuk tiap lapis untuk membahasnya satu per satu.</p></div>' +

      '<div class="blok tanpa-cetak">' +
      '<h2>Contoh yang dibahas</h2>' +
      '<div class="baris">' +
      '<div><label for="sgtNama">Profil</label>' +
      '<select id="sgtNama" aria-label="Pilih profil nasabah">' + htmlProfilOptions() + '</select></div>' +
      '<div><label for="sgtTgl">Tanggal lahir</label>' +
      '<input id="sgtTgl" type="date" value="' + esc(S.tgl) + '"></div>' +
      '</div>' +
      '<div class="baris">' +
      '<div><label for="sgtJK">Jenis kelamin</label>' +
      '<select id="sgtJK">' +
      ['Pria', 'Wanita'].map(function (v) {
        return '<option value="' + v + '"' + (S.jk === v ? ' selected' : '') + '>' + v + '</option>';
      }).join('') + '</select></div>' +
      '<div><label for="sgtPenghasilan">Penghasilan per bulan</label>' +
      '<input id="sgtPenghasilan" type="text" inputmode="numeric" value="' +
      Number(S.penghasilanBulanan).toLocaleString('id-ID') + '"></div>' +
      '</div>' +
      '<p class="catatan">' +
      (h.usia === null ? 'Isi tanggal lahir untuk menghitung usia.'
        : esc(S.nama) + ', ' + h.usia + ' tahun, penghasilan ' + rp(h.penghasilanTahunan) +
          ' per tahun.') +
      ' Pilih Leo untuk sharing contoh. Setelah prospek siap dihitung, pilih nama prospek yang sudah tersimpan di Profil Nasabah.</p>' +
      '</div>' +

      '<div class="blok">' + segitiga(h, false) + '</div>' +

      '<div class="blok" id="sgtPanel">' + panel(h) + '</div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="sgtTblRingkas" type="button">Summary kebutuhan</button>' +
      '<button class="sakelar" id="sgtTblSolusi" type="button">Solusi</button>' +
      '</div>';
  }

  function panel(h) {
    if (S.terbuka === 'health') return panelHealth(h);
    if (S.terbuka === 'ci') return panelCI(h);
    if (S.terbuka === 'pensiun') return panelPensiun(h);
    return panelLife(h);
  }

  function panelPensiun(h) {
    return judulPanel('Tua — dana pensiun',
      'Sehat sekalipun, tidak sakit, tidak meninggal, hari tua tetap datang. ' +
      'Bedanya dengan tiga lapis di atas: yang ini pasti, bukan kemungkinan.') +

      '<div class="sgt-cerita">' +
      '<div class="sgt-langkah"><b>Hari ini</b><span>' + esc(S.nama) + ' bekerja, ' +
      'penghasilan ' + rp(h.penghasilanBulanan) + ' per bulan</span></div>' +
      '<div class="sgt-langkah sgt-sorot"><b>Usia ' + h.usiaPensiun + '</b>' +
      '<span>Berhenti bekerja. Penghasilan berhenti, biaya hidup tidak</span></div>' +
      '<div class="sgt-langkah"><b>' + h.lamaPensiun + ' tahun berikutnya</b>' +
      '<span>Hidup tetap harus berjalan tanpa gaji</span></div>' +
      '</div>' +

      '<div class="baris">' +
      '<div><label for="sgtPersenPensiun">Biaya hidup saat pensiun (% dari penghasilan kini)</label>' +
      '<input id="sgtPersenPensiun" type="number" min="10" max="150" step="5" value="' +
      S.persenBiayaPensiun + '">' +
      '<p class="catatan">Setara ' + rp(h.biayaPensiunBulanan) + ' per bulan.</p></div>' +
      '<div><label for="sgtLamaSiapkan">Lama menyiapkan dana</label>' +
      '<select id="sgtLamaSiapkan">' +
      masaBayarTersedia().map(function (v) {
        return '<option value="' + v + '"' + (v === h.lamaSiapkan ? ' selected' : '') +
          '>' + v + ' tahun</option>';
      }).join('') + '</select>' +
      '<p class="catatan">Mengikuti masa bayar BeSMART Lite Future.</p></div>' +
      '</div>' +
      '<div class="baris">' +
      '<div><label for="sgtUsiaPensiun">Usia pensiun yang diinginkan</label>' +
      '<select id="sgtUsiaPensiun">' +
      h.usiaPensiunPilihan.map(function (v) {
        return '<option value="' + v + '"' + (v === h.usiaPensiun ? ' selected' : '') +
          '>' + v + ' tahun</option>';
      }).join('') + '</select>' +
      '<p class="catatan">Hanya usia yang masuk akal yang ditawarkan: usia sekarang ' +
      'ditambah lama menyiapkan, ditambah 10 tahun dana mengendap.</p></div>' +
      '<div><label for="sgtUsiaHarapan">Dana disiapkan sampai usia</label>' +
      '<input id="sgtUsiaHarapan" type="number" min="60" max="100" value="' +
      S.usiaHarapan + '"></div>' +
      '</div>' +

      '<table class="akt-tabel"><tbody>' +
      brs('Biaya hidup saat pensiun', rp(h.biayaPensiunBulanan) + ' per bulan') +
      brs('Lama masa pensiun', h.lamaPensiun + ' tahun') +
      '<tr class="tandai"><td><b>Dana pensiun yang dibutuhkan</b></td>' +
      '<td><b>' + rp(h.pensiunIdeal) + '</b></td></tr>' +
      brs('Lama menyiapkan dana', h.lamaSiapkan + ' tahun') +
      (h.setoranBulananPensiun
        ? brs('Kalau ditabung sendiri tanpa hasil investasi',
            rp(h.setoranBulananPensiun) + ' per bulan')
        : '') +
      '</tbody></table>' +
      catatanPembulatanUp(h) +
      '<p class="catatan">Perhitungan ini sengaja tidak memperhitungkan inflasi maupun ' +
      'hasil investasi, jadi angkanya adalah kebutuhan paling dasar. Dengan inflasi, ' +
      'kebutuhan sesungguhnya lebih besar.</p>' +

      '<label class="sgt-centang"><input type="checkbox" id="sgtPunyaPensiun"' +
      (S.punyaPensiun ? ' checked' : '') + '><span>' + esc(S.nama) +
      ' sudah menyiapkan dana pensiun</span></label>' +
      (S.punyaPensiun
        ? '<div class="baris satu"><div><label for="sgtDanaPensiun">Dana pensiun yang sudah ada</label>' +
          '<input id="sgtDanaPensiun" type="text" inputmode="numeric" value="' +
          Number(S.danaPensiunDimiliki).toLocaleString('id-ID') + '"></div></div>' +
          '<p class="catatan' + (h.pensiunKurang ? ' akt-peringatan' : '') + '">' +
          (h.pensiunKurang ? 'Masih kurang ' + rp(h.pensiunKurang) + ' dari kebutuhannya.'
            : 'Kebutuhan dana pensiun sudah tertutup.') + '</p>'
        : '');
  }

  function judulPanel(t, k) {
    return '<h2>' + t + '</h2><p class="catatan">' + k + '</p>';
  }

  function panelHealth(h) {
    return judulPanel('Health — membayar tagihan rumah sakit',
      'Asuransi yang membayar tagihan rumah sakit ketika ' + esc(S.nama) +
      ' harus diopname, baik karena penyakit ringan maupun berat.') +

      '<div class="sgt-cerita">' +
      '<div class="sgt-langkah"><b>1</b><span>' + esc(S.nama) + ' sakit dan harus diopname</span></div>' +
      '<div class="sgt-langkah"><b>2</b><span>Rumah sakit menerbitkan tagihan</span></div>' +
      '<div class="sgt-langkah sgt-sorot"><b>3</b><span>' +
      rp(AWAL.tagihanBawah) + ' sampai ' + rp(AWAL.tagihanAtas) + '</span></div>' +
      '</div>' +
      '<p class="catatan">Pertanyaannya cuma satu: uangnya dari mana?</p>' +

      '<div class="sgt-kartu-grid">' +
      CARA_BAYAR_RS.map(function (c) {
        const sorot = (c.kunci === 'ghp') ? ' sgt-kartu-sorot' : '';
        return '<div class="sgt-kartu' + sorot + '"><b>' + esc(c.judul) + '</b>' +
          '<span>' + esc(c.isi) + '</span></div>';
      }).join('') +
      '</div>' +

      '<label class="sgt-centang"><input type="checkbox" id="sgtPunyaHealth"' +
      (S.punyaHealth ? ' checked' : '') + '><span>' + esc(S.nama) +
      ' sudah punya perlindungan kesehatan</span></label>' +
      (S.punyaHealth
        ? '<div class="baris satu"><div><label for="sgtJenisHealth">Jenisnya</label>' +
          '<select id="sgtJenisHealth">' +
          PUNYA_HEALTH.map(function (v) {
            return '<option value="' + esc(v) + '"' + (S.jenisHealth === v ? ' selected' : '') +
              '>' + esc(v) + '</option>';
          }).join('') + '</select></div></div>' +
          '<p class="catatan' + (h.healthTertutup ? '' : ' akt-peringatan') + '">' +
          (h.healthTertutup
            ? 'Lapis kesehatan sudah tertutup. Pembahasan bisa langsung naik ke lapis berikutnya.'
            : 'Masih ada selisih tagihan yang harus ditanggung sendiri, karena ' +
              esc(S.jenisHealth) + ' punya batas plafon atau berhenti saat tidak lagi bekerja.') +
          '</p>'
        : '');
  }

  function panelCI(h) {
    return judulPanel('Critical Illness — pengganti penghasilan',
      'Kanker, stroke, tumor, gagal ginjal, serangan jantung. Yang berhenti bukan hanya ' +
      'kesehatannya, tetapi penghasilannya.') +

      '<div class="sgt-cerita">' +
      '<div class="sgt-langkah"><b>Sehat</b><span>Penghasilan ' +
      rp(h.penghasilanBulanan) + ' per bulan mengalir</span></div>' +
      '<div class="sgt-langkah sgt-merah"><b>Sakit kritis</b><span>Penghasilan berhenti, ' +
      'biaya hidup jalan terus</span></div>' +
      '</div>' +

      '<div class="sgt-gunung">' +
      '<div class="sgt-gunung-atas"><b>Yang terlihat</b>' +
      '<span>Biaya pengobatan di rumah sakit — ini yang ditanggung asuransi kesehatan</span></div>' +
      '<div class="sgt-gunung-bawah"><b>Yang tidak terlihat</b>' +
      '<span>Penghasilan yang hilang selama tidak bekerja, obat di luar plafon, pengobatan ' +
      'alternatif, akomodasi berobat di luar kota, biaya sekolah anak, perawat pribadi, ' +
      'dan biaya rumah tangga yang tetap berjalan</span></div>' +
      '</div>' +
      '<p class="catatan">Masa pemulihan sakit kritis umumnya dihitung lima tahun. ' +
      'Selama itu keluarga tetap harus makan, sekolah tetap berjalan, cicilan tetap ditagih.</p>' +

      '<div class="baris">' +
      '<div><label for="sgtTahunCI">Pengganti penghasilan (tahun)</label>' +
      '<input id="sgtTahunCI" type="number" min="1" max="20" value="' +
      S.tahunPenggantiCI + '"></div>' +
      '<div><label for="sgtTahunObat">Biaya pengobatan (tahun)</label>' +
      '<input id="sgtTahunObat" type="number" min="0" max="20" value="' +
      S.tahunPengobatan + '"></div>' +
      '</div>' +

      '<table class="akt-tabel"><tbody>' +
      brs('Pengganti penghasilan ' + S.tahunPenggantiCI + ' tahun', rp(h.ciPengganti)) +
      brs('Biaya pengobatan ' + S.tahunPengobatan + ' tahun', rp(h.ciPengobatan)) +
      '<tr class="tandai"><td><b>UP sakit kritis yang ideal</b></td>' +
      '<td><b>' + rp(h.ciIdeal) + '</b></td></tr>' +
      '</tbody></table>' +

      '<label class="sgt-centang"><input type="checkbox" id="sgtPunyaCI"' +
      (S.punyaCI ? ' checked' : '') + '><span>' + esc(S.nama) +
      ' sudah punya asuransi sakit kritis</span></label>' +
      (S.punyaCI
        ? '<div class="baris satu"><div><label for="sgtUpCI">UP sakit kritis yang dimiliki</label>' +
          '<input id="sgtUpCI" type="text" inputmode="numeric" value="' +
          Number(S.upCIDimiliki).toLocaleString('id-ID') + '"></div></div>' +
          '<p class="catatan' + (h.ciKurang ? ' akt-peringatan' : '') + '">' +
          (h.ciKurang ? 'Masih kurang ' + rp(h.ciKurang) + ' dari kebutuhan idealnya.'
            : 'Kebutuhan sakit kritis sudah tertutup.') + '</p>'
        : '');
  }

  function panelLife(h) {
    return judulPanel('Life — warisan dan pengganti penghasilan',
      'Bila tulang punggung keluarga tutup usia, penghasilannya berhenti hari itu juga. ' +
      'Kebutuhan keluarganya tidak.') +

      '<div class="sgt-cerita">' +
      '<div class="sgt-langkah"><b>Hari ini</b><span>' + esc(S.nama) + ' menghasilkan ' +
      rp(h.penghasilanBulanan) + ' per bulan, ' + rp(h.penghasilanTahunan) + ' per tahun</span></div>' +
      '<div class="sgt-langkah sgt-merah"><b>Risiko datang</b><span>Penghasilan berhenti. ' +
      'Keluarga tetap harus berjalan</span></div>' +
      '</div>' +

      '<div class="baris satu"><div>' +
      '<label for="sgtTahunWaris">Penghasilan diganti berapa tahun</label>' +
      '<input id="sgtTahunWaris" type="number" min="1" max="40" value="' +
      S.tahunWarisan + '">' +
      '<p class="catatan">Lazimnya 20 tahun — cukup untuk mengantar anak sampai mandiri.</p>' +
      '</div></div>' +

      '<table class="akt-tabel"><tbody>' +
      brs('Penghasilan per tahun', rp(h.penghasilanTahunan)) +
      brs('Dikali ' + S.tahunWarisan + ' tahun', rp(h.lifeIdeal)) +
      '<tr class="tandai"><td><b>UP jiwa yang ideal</b></td>' +
      '<td><b>' + rp(h.lifeIdeal) + '</b></td></tr>' +
      '</tbody></table>' +

      '<label class="sgt-centang"><input type="checkbox" id="sgtPunyaLife"' +
      (S.punyaLife ? ' checked' : '') + '><span>' + esc(S.nama) +
      ' sudah punya asuransi jiwa</span></label>' +
      (S.punyaLife
        ? '<div class="baris satu"><div><label for="sgtUpLife">UP jiwa yang dimiliki</label>' +
          '<input id="sgtUpLife" type="text" inputmode="numeric" value="' +
          Number(S.upLifeDimiliki).toLocaleString('id-ID') + '"></div></div>' +
          '<p class="catatan' + (h.lifeKurang ? ' akt-peringatan' : '') + '">' +
          (h.lifeKurang ? 'Masih kurang ' + rp(h.lifeKurang) + ' dari kebutuhan idealnya.'
            : 'Kebutuhan jiwa sudah tertutup.') + '</p>'
        : '');
  }

  function brs(k, v) { return '<tr><td>' + k + '</td><td><b>' + v + '</b></td></tr>'; }

  /* ---------- Ringkasan ---------- */

  function gambarRingkas() {
    const w = el('layarSegitigaRingkas');
    if (!w) return;
    const h = hitung();

    w.innerHTML =
      '<div class="kop"><h2>Ringkasan Kebutuhan Perlindungan</h2>' +
      '<p>Disusun bersama dalam percakapan hari ini.</p>' +
      '<div class="identitas">' +
      '<div>Nama<b>' + esc(S.nama) + '</b></div>' +
      '<div>Usia<b>' + (h.usia === null ? '\u2014' : h.usia + ' tahun') + '</b></div>' +
      '<div>Jenis kelamin<b>' + esc(S.jk) + '</b></div>' +
      '<div>Penghasilan<b>' + rp(h.penghasilanBulanan) + ' / bulan</b></div>' +
      '</div></div>' +

      '<div class="blok">' + segitiga(h, true) + '</div>' +

      '<div class="blok"><h2>Rincian kebutuhan</h2>' +
      '<table class="akt-tabel"><thead><tr>' +
      '<th>Lapis</th><th class="ka">Ideal</th><th class="ka">Sudah dimiliki</th>' +
      '<th class="ka">Masih kurang</th></tr></thead><tbody>' +

      '<tr><td><b>Health</b><br><span class="catatan">Tagihan rumah sakit</span></td>' +
      '<td class="ka">Sesuai tagihan</td>' +
      '<td class="ka">' + (h.healthPunya ? esc(h.healthJenis) : 'Belum ada') + '</td>' +
      '<td class="ka"><b>' + (h.healthTertutup ? 'Tertutup' : 'Belum tertutup') + '</b></td></tr>' +

      '<tr><td><b>Critical Illness</b><br><span class="catatan">Penghasilan ' +
      S.tahunPenggantiCI + ' th + pengobatan ' + S.tahunPengobatan + ' th</span></td>' +
      '<td class="ka">' + rp(h.ciIdeal) + '</td>' +
      '<td class="ka">' + rp(h.ciPunya) + '</td>' +
      '<td class="ka"><b>' + rp(h.ciKurang) + '</b></td></tr>' +

      '<tr><td><b>Life</b><br><span class="catatan">Penghasilan ' + S.tahunWarisan +
      ' tahun</span></td>' +
      '<td class="ka">' + rp(h.lifeIdeal) + '</td>' +
      '<td class="ka">' + rp(h.lifePunya) + '</td>' +
      '<td class="ka"><b>' + rp(h.lifeKurang) + '</b></td></tr>' +

      '<tr><td><b>Tua / Pensiun</b><br><span class="catatan">' +
      rp(h.biayaPensiunBulanan) + ' per bulan selama ' + h.lamaPensiun + ' tahun</span></td>' +
      '<td class="ka">' + rp(h.pensiunIdeal) + '</td>' +
      '<td class="ka">' + rp(h.pensiunPunya) + '</td>' +
      '<td class="ka"><b>' + rp(h.pensiunKurang) + '</b></td></tr>' +

      '</tbody></table>' +
      (h.prioritas.length
        ? '<h3 style="margin-top:12px">Urutan prioritas yang dipilih adalah</h3><p class="catatan">Urutan ini adalah concern yang dipilih langsung oleh prospek pada Segitiga Financial.</p><ol class="sgt-urut">' +
          h.prioritas.map(function (k) {
            return '<li><b>' + LAPIS_INFO[k].judul + '</b> \u2014 ' +
              nilaiLapis(h, k) + '</li>';
          }).join('') + '</ol>'
        : '') +
      '<p class="catatan">Angka ideal dihitung dari penghasilan ' + rp(h.penghasilanTahunan) +
      ' per tahun. Lapis kesehatan tidak dinyatakan dalam nominal karena manfaatnya ' +
      'mengikuti tagihan rumah sakit yang sesungguhnya.</p></div>' +

      '<div class="blok"><p class="catatan">Ringkasan ini alat bantu percakapan, bukan ' +
      'ilustrasi produk. Angka premi dan manfaat mengikuti ilustrasi resmi PT Asuransi Jiwa ' +
      'Generali Indonesia serta hasil underwriting.</p></div>' +

      '<div class="akt-aksi tanpa-cetak">' +
      '<button class="aksi" id="sgtCetak" type="button">Cetak / simpan PDF</button>' +
      '<button class="sakelar" id="sgtTblSolusi2" type="button">Lanjut ke solusi</button>' +
      '</div>';
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const prio = t.closest('[data-sgt-prio]');
      if (prio) {
        const k = prio.dataset.sgtPrio;
        S.prioritas = S.prioritas || [];
        const i = S.prioritas.indexOf(k);
        if (i === -1) S.prioritas.push(k); else S.prioritas.splice(i, 1);
        simpan(); gambar();
        return;
      }

      const lapis = t.closest('[data-sgt-lapis]');
      if (lapis && el('layarSegitiga') && el('layarSegitiga').contains(lapis)) {
        S.terbuka = lapis.dataset.sgtLapis;
        simpan(); gambar();
        return;
      }
      if (t.closest('#sgtTblRingkas')) { gambarRingkas(); window.bukaLayar('SEGITIGA_RINGKAS'); return; }
      if (t.closest('#sgtCetak')) {
        const asli = document.title;
        document.title = 'Kebutuhan Perlindungan - ' + S.nama;
        window.print();
        setTimeout(function () { document.title = asli; }, 1000);
        return;
      }
      if (t.closest('#sgtTblSolusi') || t.closest('#sgtTblSolusi2')) {
        bukaSolusi();
        return;
      }
    });

    document.addEventListener('input', function (e) {
      const t = e.target;
      if (!(t instanceof Element) || !t.id || t.id.indexOf('sgt') !== 0) return;
      bacaIsian(t);
    });
    document.addEventListener('change', function (e) {
      const t = e.target;
      if (!(t instanceof Element) || !t.id || t.id.indexOf('sgt') !== 0) return;
      bacaIsian(t, true);
    });
  }

  /* Isian dibaca satu per satu supaya mengetik tidak memicu penggambaran ulang
     seluruh layar — kursor akan melompat kalau itu terjadi. Hanya perubahan
     yang mengubah bentuk panel yang menggambar ulang. */
  function bacaIsian(t, ubahBentuk) {
    let gambarUlang = !!ubahBentuk;
    switch (t.id) {
      case 'sgtNama': pilihProfilUtama(t.value); gambarUlang = true; break;
      case 'sgtTgl': S.tgl = t.value; gambarUlang = true; break;
      case 'sgtJK': S.jk = t.value; break;
      case 'sgtPenghasilan': {
        const n = ang(t.value);
        S.penghasilanBulanan = n;
        t.value = n ? n.toLocaleString('id-ID') : '';
        segarkanAngka();
        break;
      }
      case 'sgtTahunCI': S.tahunPenggantiCI = Number(t.value) || 0; segarkanAngka(); break;
      case 'sgtTahunObat': S.tahunPengobatan = Number(t.value) || 0; segarkanAngka(); break;
      case 'sgtTahunWaris': S.tahunWarisan = Number(t.value) || 0; segarkanAngka(); break;
      case 'sgtPunyaHealth': S.punyaHealth = t.checked; gambarUlang = true; break;
      case 'sgtJenisHealth': S.jenisHealth = t.value; gambarUlang = true; break;
      case 'sgtPunyaCI': S.punyaCI = t.checked; gambarUlang = true; break;
      case 'sgtPunyaLife': S.punyaLife = t.checked; gambarUlang = true; break;
      case 'sgtPunyaPensiun': S.punyaPensiun = t.checked; gambarUlang = true; break;
      case 'sgtPersenPensiun': S.persenBiayaPensiun = Number(t.value) || 0; segarkanAngka(); break;
      case 'sgtUsiaPensiun': S.usiaPensiun = Number(t.value) || 0; segarkanAngka(); break;
      case 'sgtLamaSiapkan': {
        S.lamaSiapkan = Number(t.value) || 0;
        /* Mengubah lama menyiapkan menggeser batas usia pensiun. Bila pilihan
           lama sudah tidak masuk akal, langsung dikoreksi ke yang terdekat. */
        const boleh = usiaPensiunTersediaSegitiga(usia(), S.lamaSiapkan);
        if (boleh.indexOf(Number(S.usiaPensiun)) === -1) S.usiaPensiun = boleh[0];
        gambarUlang = true;
        break;
      }
      case 'sgtUsiaHarapan': S.usiaHarapan = Number(t.value) || 0; segarkanAngka(); break;
      case 'sgtDanaPensiun': {
        const n = ang(t.value);
        S.danaPensiunDimiliki = n;
        t.value = n ? n.toLocaleString('id-ID') : '';
        segarkanAngka();
        break;
      }
      case 'sgtUpCI': {
        const n = ang(t.value);
        S.upCIDimiliki = n;
        t.value = n ? n.toLocaleString('id-ID') : '';
        segarkanAngka();
        break;
      }
      case 'sgtUpLife': {
        const n = ang(t.value);
        S.upLifeDimiliki = n;
        t.value = n ? n.toLocaleString('id-ID') : '';
        segarkanAngka();
        break;
      }
      default: return;
    }
    simpan();
    if (gambarUlang) gambar();
  }

  /* Hanya bagian tabel dan catatan yang diperbarui, tanpa menyentuh isian. */
  function segarkanAngka() {
    const kotak = el('sgtPanel');
    if (!kotak) return;
    const h = hitung();
    const fokus = document.activeElement ? document.activeElement.id : null;
    kotak.innerHTML = panel(h);
    if (fokus && el(fokus)) {
      const n = el(fokus);
      n.focus();
      if (n.setSelectionRange && n.type === 'text') {
        const p = n.value.length;
        try { n.setSelectionRange(p, p); } catch (_) {}
      }
    }
  }

  function bukaSolusi() {
    // Kalkulator kombinasi khusus untuk segitiga ini dibangun terpisah.
    if (window.InsuranceHubSegitigaSolusi &&
        typeof window.InsuranceHubSegitigaSolusi.buka === 'function') {
      window.InsuranceHubSegitigaSolusi.buka(hitung(), S);
      return;
    }
    alert('Kalkulator solusi belum tersedia di versi ini.');
  }

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    pastikanKeadaan();
    sinkronKonteksGlobal();
    pasang();
    gambar();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__sgtHook) {
      const asli = window.bukaLayar;
      const bungkus = function (nama) {
        // Re-check the GLOBAL active customer every time Segitiga is opened.
        // This is intentionally done on navigation, not only on initial page load,
        // because the customer profile can be changed while this JS instance stays alive.
        if (nama === 'SEGITIGA') { try { sinkronKonteksGlobal(); } catch (_) {} }
        if (nama === 'SEGITIGA_RINGKAS') { try { gambarRingkas(); } catch (_) {} }
        const hasil = asli.apply(this, arguments);
        if (nama === 'SEGITIGA') setTimeout(gambar, 30);
        return hasil;
      };
      bungkus.__sgtHook = true;
      Object.keys(asli).forEach(function (k) { bungkus[k] = asli[k]; });
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
  }

  window.InsuranceHubSegitiga = { hitung, keadaan: function () { return S; }, gambar };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 140);
  }
})();
