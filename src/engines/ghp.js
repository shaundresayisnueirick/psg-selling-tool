/* Insurance Hub — GHP GenPro calculation engine.
 * Extracted from the working application without changing the calculation formula.
 * Standard engine contract: calculate(input, rates, hariIni) -> result.
 * Supports both individual and family modes.
 */

const GHP_ENGINE_USIA_MAKS = 65;
const GHP_ENGINE_UP_MIN = 10000000;
const GHP_ENGINE_UP_ACUAN = 10000000;

/* Usia memakai rumus bersama di src/engines/usia.js. Nama ini
   dipertahankan supaya pemanggil GHP tidak perlu diubah. */
function ghpUsiaEngine(tglLahir, hariIni) {
  return ihUsiaGenerali(tglLahir, hariIni);
}

/* Satu titik untuk seluruh variasi penulisan jenis kelamin. */
function ghpAmbilTarifJk(kelompok, jk) {
  if (!kelompok) return null;
  const wanita = String(jk == null ? '' : jk).trim().toUpperCase() === 'WANITA';
  const urutan = wanita ? ['Wanita', 'WANITA', 'wanita'] : ['Pria', 'PRIA', 'pria'];
  for (const k of urutan) {
    if (Object.prototype.hasOwnProperty.call(kelompok, k)) return kelompok[k];
  }
  return null;
}

function ghpDiskonEngine(upJiwa) {
  if (upJiwa < 1000000000) return 0;
  if (upJiwa < 2500000000) return 0.20;
  return 0.30;
}

function ghpOrangEngine(orang, data, hariIni) {
  const usia = orang.usia != null ? orang.usia : ghpUsiaEngine(orang.tglLahir, hariIni);
  const hasil = { usia, tersedia: false, alasan: null };

  if (usia < 0 || usia > GHP_ENGINE_USIA_MAKS) {
    hasil.alasan = 'Usia ' + usia + ' di luar batas usia masuk 0 sampai ' + GHP_ENGINE_USIA_MAKS + ' tahun.';
    return hasil;
  }
  if (!orang.upJiwa || orang.upJiwa < GHP_ENGINE_UP_MIN) {
    hasil.alasan = 'UP jiwa minimum Rp10.000.000.';
    return hasil;
  }

  /* Tabel jiwa GHP memakai penulisan "Pria"/"Wanita", sedangkan layar lain
     di aplikasi ini memakai "PRIA"/"WANITA". Nilai apa pun yang masuk
     dipetakan dulu ke bentuk yang dipakai tabelnya, supaya pencarian tarif
     tidak diam-diam mengembalikan kosong hanya karena beda huruf besar.
     Skema juga diperiksa terpisah: sebelumnya baris[skema][jk] langsung
     dirangkai, sehingga skema yang belum terisi (mode keluarga) membuat
     seluruh perhitungan berhenti dengan TypeError, bukan pesan yang bisa
     dibaca agen. */
  const barisJiwa = data.jiwa[String(usia)];
  const kelompok = barisJiwa ? barisJiwa[orang.skema] : null;
  const tarifJiwa = kelompok ? (ghpAmbilTarifJk(kelompok, orang.jk) ?? null) : null;
  const pakaiRider = orang.pakaiRider !== false && !!orang.plan;
  const tarifSehat = pakaiRider && data.sehat[String(usia)]
    ? data.sehat[String(usia)][orang.plan] : null;
  if (!tarifJiwa || (pakaiRider && !tarifSehat)) {
    hasil.alasan = 'Tarif untuk usia ' + usia + ' tidak ada di database.';
    return hasil;
  }

  hasil.tersedia = true;
  hasil.tarifJiwa = tarifJiwa;
  hasil.pakaiRider = pakaiRider;
  hasil.diskonJiwa = ghpDiskonEngine(orang.upJiwa);
  hasil.premiJiwaSebelumDiskon = orang.upJiwa / GHP_ENGINE_UP_ACUAN * tarifJiwa;
  hasil.premiJiwaBulanan = hasil.premiJiwaSebelumDiskon * (1 - hasil.diskonJiwa);
  hasil.hematJiwaBulanan = hasil.premiJiwaSebelumDiskon - hasil.premiJiwaBulanan;
  hasil.premiSehatBulanan = pakaiRider ? tarifSehat : 0;
  hasil.totalBulanan = hasil.premiJiwaBulanan + hasil.premiSehatBulanan;
  hasil.premiJiwaTahunan = hasil.premiJiwaBulanan * 11;
  hasil.premiSehatTahunan = hasil.premiSehatBulanan * 11;
  hasil.totalTahunan = hasil.totalBulanan * 11;
  hasil.premiAktif = orang.metode === 'Bulanan' ? hasil.totalBulanan : hasil.totalTahunan;
  hasil.manfaat = pakaiRider ? data.plan[orang.plan] : null;
  hasil.plan = pakaiRider ? orang.plan : null;
  return hasil;
}

function ghpKeluargaEngine(anggota, data, hariIni) {
  const utama = anggota[0] || {};
  const baris = anggota.map(o => {
    const orang = { ...o, skema: utama.skema, metode: utama.metode, pakaiRider: !!o.plan };
    return { nama: o.nama, plan: o.plan, jk: o.jk, upJiwa: o.upJiwa, hasil: ghpOrangEngine(orang, data, hariIni) };
  });
  const sah = baris.filter(b => b.hasil.tersedia);
  const jumlah = ambil => sah.reduce((s, b) => s + ambil(b.hasil), 0);
  return {
    baris, jumlahAktif: sah.length,
    totalJiwaBulanan: jumlah(h => h.premiJiwaBulanan),
    totalSehatBulanan: jumlah(h => h.premiSehatBulanan),
    totalBulanan: jumlah(h => h.totalBulanan),
    totalTahunan: jumlah(h => h.totalTahunan),
    totalAktif: jumlah(h => h.premiAktif),
    rataRata: sah.length ? jumlah(h => h.premiAktif) / sah.length : 0,
  };
}

const GHP_NCD_ENGINE = [
  { lama: '1 tahun', diskon: 0.05 },
  { lama: '2 tahun', diskon: 0.10 },
  { lama: '3 tahun atau lebih', diskon: 0.15 },
];

function ghpNCBEngine(limitBooster) {
  const baris = [];
  for (let n = 0; n <= 5; n++) {
    baris.push({ tahun: n, kenaikan: n * 0.1, nilai: limitBooster * (1 + n * 0.1) });
  }
  return baris;
}

function ghpCalculateEngine(inp, rates, hariIni) {
  const data = rates || globalThis.DATA_GHP;
  if (!data) throw new Error('DATA_GHP belum tersedia.');
  if (inp && inp.mode === 'family') return ghpKeluargaEngine(inp.members || [], data, hariIni);
  return ghpOrangEngine(inp || {}, data, hariIni);
}

const InsuranceHubGHP = {
  ncb: ghpNCBEngine,
  NCD: GHP_NCD_ENGINE,
  version: '2.7.0',
};
globalThis.InsuranceHubGHP = InsuranceHubGHP;

if (typeof InsuranceHubEngines !== 'undefined') {
  InsuranceHubEngines.GHP = {
    id: 'GHP',
    version: '2.7.0',
    calculate: ghpCalculateEngine,
  };
}
