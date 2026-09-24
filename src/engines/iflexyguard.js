/* Insurance Hub — iFLEXYGUARD calculation engine.
 * Extracted from the working application without changing the calculation formula.
 * Standard engine contract: calculate(input, rates, hariIni) -> result.
 */
/* Usia memakai rumus bersama di src/engines/usia.js. Nama ini
   dipertahankan supaya pemanggil iFLEXYGUARD tidak perlu diubah. */
function flexUsiaEngine(tglLahir, hariIni) {
  return ihUsiaGenerali(tglLahir, hariIni);
}

function flexHitungEngine(inp, tarifFLEX, hariIni) {
  const usia = inp.usia != null ? inp.usia : flexUsiaEngine(inp.tglLahir, hariIni);
  const out = { usia, tersedia: false, alasan: null, ilustrasi: [] };

  const baris = tarifFLEX[String(usia)];
  const paket = baris ? baris[String(inp.mpp)] : null;
  const bulanan = paket ? paket['Bulanan'] : null;
  const tahunan = paket ? paket['Tahunan'] : null;
  if (!bulanan || !tahunan) {
    out.alasan = 'Tarif untuk usia ' + usia + ' dengan masa bayar ' + inp.mpp
      + ' tahun tidak ada di database.';
    return out;
  }

  const basisUP = bulanan[0];
  out.tersedia = true;
  out.basisUP = basisUP;
  out.tarifBulanan = bulanan[1];
  out.tarifTahunan = tahunan[1];
  out.premiBulanan = inp.up / basisUP * bulanan[1];
  out.premiTahunan = inp.up / basisUP * tahunan[1];
  out.premiAktif = inp.metode === 'Bulanan' ? out.premiBulanan : out.premiTahunan;
  out.premiPerTahun = inp.metode === 'Bulanan' ? out.premiBulanan * 12 : out.premiTahunan;
  out.totalDibayar = out.premiPerTahun * inp.mpp;

  out.manfaatTahun1 = inp.up;
  out.manfaatTahun6 = inp.up * 1.5;
  out.manfaatTahun11 = inp.up * 2;
  out.bonus75 = inp.up * 0.5;
  out.tambahanKecelakaan = Math.min(inp.up, 1000000000);
  /* Layar ringkasan memakai nama medan premiSesuaiMetode, sama seperti mesin
     produk lain. Mesin ini hanya menyediakan premiAktif, sehingga kartu premi
     di layar hasil tampil sebagai tanda hubung. Disediakan sebagai nama
     kedua supaya seragam dengan produk lain, tanpa mengubah nilainya. */
  out.premiSesuaiMetode = out.premiAktif;
  out.totalSesuaiMetode = out.totalDibayar;
  out.akhirMasa = inp.up * 1.5;

  for (let th = 1; usia + th - 1 <= FLEX_USIA_AKHIR; th++) {
    const usiaTh = usia + th - 1;
    const dasar = th <= 5 ? out.manfaatTahun1
      : (th <= 10 ? out.manfaatTahun6 : out.manfaatTahun11);
    const rip = dasar - (usiaTh >= FLEX_USIA_BONUS ? out.bonus75 : 0);
    out.ilustrasi.push({
      tahun: th, usia: usiaTh,
      premi: th <= inp.mpp ? out.premiPerTahun : 0,
      bonus75: usiaTh === FLEX_USIA_BONUS ? out.bonus75 : 0,
      rip,
      ripKecelakaan: rip + out.tambahanKecelakaan,
      akhirMasa: usiaTh === FLEX_USIA_AKHIR ? out.akhirMasa : 0,
      keterangan: usiaTh === FLEX_USIA_BONUS ? 'Bonus 75 cair'
        : (usiaTh === FLEX_USIA_AKHIR ? 'Akhir masa asuransi' : ''),
    });
  }
  out.totalPremiIlustrasi = out.ilustrasi.reduce((s, b) => s + b.premi, 0);
  return out;
}

if (typeof InsuranceHubEngines !== 'undefined') {
  InsuranceHubEngines.FLEX = {
    id: 'FLEX',
    version: '2.6.0',
    calculate: flexHitungEngine,
  };
}
