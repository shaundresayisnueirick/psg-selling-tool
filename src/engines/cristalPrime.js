/* Insurance Hub — Cristal Prime calculation engine.
 * Extracted from the working application without changing the calculation formula.
 * Standard engine contract: calculate(input, rates, hariIni) -> result.
 */

/* Usia memakai rumus bersama di src/engines/usia.js. Nama ini
   dipertahankan supaya pemanggil Cristal Prime tidak perlu diubah. */
function crisUsia(tglLahir, hariIni) {
  return ihUsiaGenerali(tglLahir, hariIni);
}

function crisROP(lamaLindung) {
  return lamaLindung === 15 ? 1.2 : (lamaLindung === 20 ? 1.35 : 1.5);
}

function crisHitung(inp, tarifCRIS, hariIni) {
  const usia = inp.usia != null ? inp.usia : crisUsia(inp.tglLahir, hariIni);
  const out = { usia, kodePlan: null, tarifDasar: null, tersedia: false, alasan: null,
                ilustrasi: [] };

  const bayarSah = [3, 5, 10].indexOf(inp.lamaBayar) >= 0;
  const lindungSah = [15, 20, 25].indexOf(inp.lamaLindung) >= 0;
  if (!bayarSah || !lindungSah || usia < 0 || usia > CRIS_USIA_MAKS) {
    out.alasan = (usia > CRIS_USIA_MAKS)
      ? ('Usia masuk Cristal Prime maksimal ' + CRIS_USIA_MAKS + ' tahun.')
      : 'Kombinasi usia, lama bayar, dan lama perlindungan ini tidak ada di database.';
    return out;
  }
  if (inp.lamaBayar > inp.lamaLindung) {
    out.alasan = 'Lama bayar tidak boleh melebihi lama perlindungan.';
    return out;
  }

  out.kodePlan = 'CP ' + inp.lamaBayar + '-' + inp.lamaLindung + ' ' + String(inp.jk).toUpperCase();
  const baris = tarifCRIS[String(usia)];
  const tarif = baris ? baris[out.kodePlan] : null;
  if (!tarif) {
    out.alasan = 'Tarif untuk usia ' + usia + ' tidak tersedia di database ' +
      '(database memuat usia 0 sampai 60).';
    return out;
  }

  out.tersedia = true;
  out.tarifDasar = tarif;
  out.rop = crisROP(inp.lamaLindung);
  out.premiBulanan = inp.up / CRIS_UP_ACUAN * tarif;
  out.premiTahunan = out.premiBulanan * 11;
  out.premiSesuaiMetode = inp.metode === 'Bulanan' ? out.premiBulanan : out.premiTahunan;
  out.premiPerTahun = inp.metode === 'Bulanan' ? out.premiBulanan * 12 : out.premiTahunan;
  out.totalDibayar = out.premiPerTahun * inp.lamaBayar;

  out.upKritis = inp.up;
  out.bonus = Math.min(inp.up * 0.2, CRIS_BATAS_BONUS);
  out.totalKritis = out.upKritis + out.bonus;
  out.angioplasty = Math.min(out.upKritis * 0.1, CRIS_BATAS_BONUS);
  out.sisaSetelahAngio = out.upKritis + out.bonus - out.angioplasty;

  out.akhirKontrakBulanan = out.premiBulanan * inp.lamaBayar * 12 * out.rop;
  out.akhirKontrakTahunan = out.premiTahunan * inp.lamaBayar * out.rop;
  out.akhirKontrak = inp.metode === 'Bulanan' ? out.akhirKontrakBulanan : out.akhirKontrakTahunan;
  out.manfaatMeninggal = out.akhirKontrak;

  for (let th = 1; th <= inp.lamaLindung; th++) {
    out.ilustrasi.push({
      tahun: th,
      premi: th <= inp.lamaBayar ? out.premiPerTahun : 0,
      pengembalian: th === inp.lamaLindung ? out.akhirKontrak : 0,
      manfaatKritis: out.totalKritis,
      manfaatMeninggal: out.akhirKontrak,
    });
  }
  out.totalPremiIlustrasi = out.ilustrasi.reduce((s, b) => s + b.premi, 0);
  return out;
}

if (typeof InsuranceHubEngines !== 'undefined') {
  InsuranceHubEngines.CRIS = {
    id: 'CRIS',
    version: '2.3.0',
    calculate: crisHitung,
  };
}
