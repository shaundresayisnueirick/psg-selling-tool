/* Insurance Hub — New Cemerlang Prime calculation engine.
 * Extracted from the working application without changing the calculation formula.
 * Standard engine contract: calculate(input, rates, hariIni) -> result.
 */

function cemROP(lamaLindung) {
  return lamaLindung === 15 ? 1.2 : (lamaLindung === 20 ? 1.35 : 1.5);
}

function cemHitung(inp, tarifCEM, hariIni) {
  const usia = inp.usia != null ? inp.usia : usiaDari(inp.tglLahir, hariIni);
  const out = { usia, kodePlan: null, tarifDasar: null, tersedia: false, alasan: null,
                ilustrasi: [] };

  const bayarSah = [3, 5, 10].indexOf(inp.lamaBayar) >= 0;
  const lindungSah = [15, 20, 25].indexOf(inp.lamaLindung) >= 0;
  if (!bayarSah || !lindungSah || usia < 0 || usia > CEM_USIA_MAKS) {
    out.alasan = 'Kombinasi usia, lama bayar, dan lama perlindungan ini tidak ada di database.';
    return out;
  }

  out.kodePlan = 'NCP ' + inp.lamaBayar + '-' + inp.lamaLindung;
  const baris = tarifCEM[String(usia)];
  const tarif = baris ? baris[out.kodePlan] : null;
  if (!tarif) {
    out.alasan = 'Tarif ' + out.kodePlan + ' untuk usia ' + usia
      + ' belum ada di database. Pilih kombinasi lain atau hitung lewat iPropose.';
    return out;
  }

  out.tersedia = true;
  out.tarifDasar = tarif;
  out.rop = cemROP(inp.lamaLindung);
  out.premiBulanan = inp.up / CEM_UP_ACUAN * tarif;
  out.premiTahunan = out.premiBulanan * 11;
  out.totalBulanan = out.premiBulanan * 12 * inp.lamaBayar;
  out.totalTahunan = out.premiTahunan * inp.lamaBayar;
  out.premiSesuaiMetode = inp.metode === 'Bulanan' ? out.premiBulanan : out.premiTahunan;
  out.premiPerTahun = inp.metode === 'Bulanan' ? out.premiBulanan * 12 : out.premiTahunan;
  out.totalDibayar = inp.metode === 'Bulanan' ? out.totalBulanan : out.totalTahunan;

  out.meninggal = inp.up;
  out.meninggalKecelakaan = inp.up <= 2000000000 ? inp.up * 2 : inp.up + 2000000000;

  out.akhirKontrakBulanan = out.totalBulanan * out.rop;
  out.akhirKontrakTahunan = out.totalTahunan * out.rop;
  out.akhirKontrak = inp.metode === 'Bulanan' ? out.akhirKontrakBulanan : out.akhirKontrakTahunan;

  for (let th = 1; th <= inp.lamaLindung; th++) {
    out.ilustrasi.push({
      tahun: th,
      premi: th <= inp.lamaBayar ? out.premiPerTahun : 0,
      pengembalian: th === inp.lamaLindung ? out.akhirKontrak : 0,
      meninggal: out.meninggal,
      meninggalKecelakaan: out.meninggalKecelakaan,
    });
  }
  out.totalPremiIlustrasi = out.ilustrasi.reduce((s, b) => s + b.premi, 0);
  return out;
}

if (typeof InsuranceHubEngines !== 'undefined') {
  InsuranceHubEngines.NCP = {
    id: 'NCP',
    version: '2.4.0',
    calculate: cemHitung,
  };
}
