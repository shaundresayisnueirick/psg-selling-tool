/* Insurance Hub — Lite Future calculation engine.
 * Extracted from the original working formula without changing calculation logic.
 * This file contains calculation-only logic; UI/rendering stays in app.js.
 */

// Mesin hitung Lite Future — terjemahan langsung dari formula
// sheet 'Kalkulator pensiun' pada Insurance Hub.
// Setiap fungsi diberi catatan sel Excel asalnya agar mudah diaudit.


/* YEARFRAC, ROUND, dan usia sekarang berasal dari src/engines/usia.js —
   satu sumber untuk seluruh aplikasi. Nama lama dipertahankan sebagai
   penerus supaya seluruh pemanggil di berkas ini tidak perlu diubah. */
const isLastDayOfFeb = ihHariTerakhirFeb;
const yearFrac = ihYearFrac;
const excelRound = ihExcelRound;
// B9: =ROUND(YEARFRAC(tgl_lahir, TODAY()), 0)
function usiaDari(tglLahir, hariIni) {
  return ihUsiaGenerali(tglLahir, hariIni || new Date());
}

// ---- MATCH(nilai, array, 1) : nilai terbesar yang <= nilai --------------
function matchApprox(value, arr) {
  let idx = -1;
  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] === 'number' && arr[i] <= value) idx = i;
  }
  return idx;                                          // -1 = tidak ketemu
}

// ---- Perhitungan satu usia pensiun -------------------------------------
// Cermin baris 23-27 kolom O..AE pada 'Kalkulator pensiun'.
function hitungSatuUsia(inp, retAge, upEfektif, rates, meta) {
  const out = { retAge, up: upEfektif, setoran: null, total: null,
                hnw: null, medis: null, alasan: null };

  // O23: nama sheet tarif = "LF" + B/T + " " + MPP + "-" + usia pensiun
  const sheet = 'LF' + (inp.setoran === 'Bulanan' ? 'B' : 'T') + ' ' + inp.mpp + '-' + retAge;
  const tabel = rates[sheet];
  const baris = tabel ? tabel[String(inp.usia)] : null;
  const kunci = inp.jk === 'PRIA' ? 'P' : 'W';
  const tarif = baris ? baris[kunci] : null;           // P23 & Q23

  if (!tarif) {                                        // IFERROR -> "NA"
    out.alasan = 'Tarif untuk usia ' + inp.usia + ' tidak tersedia di database ' + sheet;
    return out;
  }

  const [tarifUP, tarifWaiver] = tarif;
  const pengali = upEfektif / 100000000;               // R23
  const diskon = upEfektif >= 1000000000 ? 0.95 : 1;   // S23: UP >= 1 M diskon 5%
  // Keep the existing LF total exactly unchanged, but expose its two source
  // tariff components separately for the Program Summary. Waiver is already
  // included in the existing Lite Future setoran calculation.
  const premiDasar = excelRound(tarifUP * pengali * diskon, 0);
  const premiWaiver = excelRound(tarifWaiver * pengali * diskon, 0);
  const mentah = excelRound(premiDasar + premiWaiver, 0); // W23

  // T23: premi minimum. Bulanan < 300.000 atau Tahunan < 3.300.000 -> kosong
  const batasMin = inp.setoran === 'Bulanan' ? 300000 : 3300000;
  if (mentah < batasMin) {
    out.alasan = 'Premi di bawah batas minimum ' + (inp.setoran === 'Bulanan'
      ? 'Rp 300.000/bulan' : 'Rp 3.300.000/tahun');
    return out;
  }
  out.setoran = mentah;
  out.premiDasar = premiDasar;
  out.premiWaiver = premiWaiver;
  out.tarifUP = tarifUP;
  out.tarifWaiver = tarifWaiver;
  // U23: total premi selama masa bayar
  out.total = inp.setoran === 'Bulanan' ? mentah * 12 * inp.mpp : mentah * inp.mpp;

  // AA23 & AD23: status HNW dinilai per usia pensiun
  const disetahunkan = inp.setoran === 'Bulanan' ? mentah * 12 : mentah;
  const syaratPremi = inp.mpp === 3 ? 200000000 : (inp.mpp === 5 ? 120000000 : 100000000);
  out.hnw = (disetahunkan >= syaratPremi && upEfektif >= 1000000000) ? 'HNW' : 'Non-HNW';
  out.premiDisetahunkan = disetahunkan;

  // AE23: kategori medis
  out.medis = kategoriMedis(out.hnw === 'HNW', inp, upEfektif, meta);
  return out;
}

// AE23: tabel HNW jika berstatus HNW, selain itu tabel Reguler / Previllage
function kategoriMedis(isHNW, inp, up, meta) {
  const upB = isHNW ? meta.upBoundsHNW
    : (inp.statusAgen === 'Reguler Agen' ? meta.upBoundsReg : meta.upBoundsPrev);
  const ageB = isHNW ? meta.ageBoundsHNW : meta.ageBoundsReg;
  const grid = isHNW ? meta.medHNW
    : (inp.statusAgen === 'Reguler Agen' ? meta.medReg : meta.medPrev);
  const r = matchApprox(up, upB);
  const c = matchApprox(inp.usia, ageB);
  if (r < 0 || c < 0) return null;
  const row = grid[r];
  return row ? (row[c] ?? null) : null;
}


// ---- Batas Non-Medis (NM) ---------------------------------------------
// Cermin sel AA5:AB11 pada 'Kalkulator pensiun'. Batas NM = nilai UP
// tertinggi yang masih bisa diterima tanpa pemeriksaan medis, dihitung
// dari berapa banyak baris "NM" pada kolom usia nasabah.
function batasNM(usia, statusAgen, meta, modeHNW) {
  const bounds = modeHNW ? meta.upBoundsHNW
    : (statusAgen === 'Reguler Agen' ? meta.upBoundsReg : meta.upBoundsPrev);
  const grid = modeHNW ? meta.medHNW
    : (statusAgen === 'Reguler Agen' ? meta.medReg : meta.medPrev);
  const ageB = modeHNW ? meta.ageBoundsHNW : meta.ageBoundsReg;
  const c = matchApprox(usia, ageB);
  if (c < 0) return { nilai: null, takTerbatas: false, jumlah: 0 };
  const n = grid.reduce((s, row) => s + (row[c] === 'NM' ? 1 : 0), 0);
  if (n >= grid.length) return { nilai: null, takTerbatas: true, jumlah: n };
  return { nilai: bounds[n] - 1, takTerbatas: false, jumlah: n };
}

// Syarat premi tahunan minimum agar sebuah polis masuk kategori HNW (AB23)
function syaratPremiHNW(mpp) {
  return mpp === 3 ? 200000000 : (mpp === 5 ? 120000000 : 100000000);
}



// ---- Perhitungan lengkap -----------------------------------------------
// inp: {nama, jk, tglLahir, setoran, mpp, pensiunUP, statusAgen,
//       customUP: {55:null,...}, pilih: {55:true,...}}
function hitung(inp, rates, meta, hariIni) {
  const usia = inp.usia != null ? inp.usia : usiaDari(inp.tglLahir, hariIni);
  const dasar = { ...inp, usia };
  const hasil = RET_AGES.map(a => {
    const up = dasar.customUP && dasar.customUP[a] ? dasar.customUP[a] : dasar.pensiunUP; // V23
    return hitungSatuUsia(dasar, a, up, rates, meta);
  });

  // Ringkasan: hanya usia yang dipilih "Ya" DAN premi-nya tersedia (C52:C56)
  const aktif = hasil.map((h, i) => (dasar.pilih?.[RET_AGES[i]] !== false && h.setoran != null) ? 1 : 0);
  const totalSetoran = hasil.reduce((s, h, i) => s + (aktif[i] ? h.setoran : 0), 0);   // G14
  const totalPremi  = hasil.reduce((s, h, i) => s + (aktif[i] ? h.total   : 0), 0);   // K14
  const totalUP     = hasil.reduce((s, h, i) => s + (aktif[i] ? h.up      : 0), 0);   // G15

  // I15: kategori medis gabungan selalu memakai tabel Reguler/Previllage
  const medisGabungan = totalUP === 0 ? null
    : kategoriMedis(false, dasar, totalUP, meta);

  // Data diagram 2: sisa santunan per periode
  const periode = RET_AGES.map((a, i) =>
    ({ label: i === 0 ? 'Saat ini - 55' : (RET_AGES[i - 1] + ' - ' + a),
       nilai: hasil.reduce((s, h, j) => s + (j >= i && aktif[j] ? h.up : 0), 0) }));

  return {
    usia, hasil, aktif, totalSetoran, totalPremi, totalUP, medisGabungan, periode,
    batasNM: batasNM(usia, dasar.statusAgen, meta, false),
    batasNMHNW: batasNM(usia, dasar.statusAgen, meta, true),
    syaratPremiHNW: syaratPremiHNW(dasar.mpp),
    batasPremiMin: BATAS_PREMI_MIN[dasar.setoran],
  };
}



if (typeof InsuranceHubEngines !== 'undefined') {
  InsuranceHubEngines.LF = { id: 'LF', version: '2.2.0', calculate: function(input, rates, hariIni, meta) { return hitung(input, rates, meta, hariIni); } };
}
