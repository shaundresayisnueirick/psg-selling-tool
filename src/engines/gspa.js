/* Insurance Hub — Gen Aman (GSPA) calculation engine.
 * Extracted from the working application without changing the calculation formula.
 * Standard engine contract: calculate(input, rates, hariIni) -> result.
 */
function gspaTierEngine(up, aturan) { let d = 0; for (const [batas, nilai] of aturan) if (up >= batas) d = nilai; return d; }
function gspaTarifEngine(tabel, mpp, jk, usia) { const a=tabel[String(mpp)]; const b=a?a[String(jk).toUpperCase()]:null; return b?(b[String(usia)] ?? null):null; }
function gspaUPdariPremiEngine(premiNetBulanan, tarifDasar, aturan) { for (const [batasBawah,diskon,batasAtas] of aturan) { const up=premiNetBulanan/(tarifDasar*(1-diskon))*100000000; if(up>=batasBawah&&up<batasAtas)return {up,diskon}; } return null; }
function gspaUsiaMaksBeliEngine(tabel,mpp,jk){const b=tabel[String(mpp)]?tabel[String(mpp)][String(jk).toUpperCase()]:null; if(!b)return null; return Math.max.apply(null,Object.keys(b).map(Number));}
function gspaBoosterGratisEngine(inp,data,usia,upDasar){const mpp=inp.mpp,jk=inp.jk,usiaMaks=gspaUsiaMaksBeliEngine(data.dasar,mpp,jk),jumlah=Math.max(0,Math.floor((99-usia-4)/5)+1),nilaiBooster=upDasar*0.075,baris=[];let totalBeli=0,bisaBeli=0;for(let n=1;n<=jumlah;n++){const tahunPolis=n*5,usiaSaatNaik=usia+tahunPolis-1,b={no:n,tahunPolis,usia:usiaSaatNaik,nilaiBooster,premiBaru:null,totalBaru:null,bisa:false,catatan:'Sudah tidak dapat membeli produk ini (batas usia '+usiaMaks+' tahun)'};if(usiaSaatNaik<=usiaMaks){const tarif=gspaTarifEngine(data.dasar,mpp,jk,usiaSaatNaik);if(tarif){const potongan=1-gspaTierEngine(nilaiBooster,data.diskon),bulanan=tarif*nilaiBooster/100000000*potongan;b.premiBaru=inp.metode==='Tahunan'?bulanan*11:bulanan;b.totalBaru=b.premiBaru*mpp*(inp.metode==='Tahunan'?1:12);b.bisa=true;b.catatan='';totalBeli+=b.totalBaru;bisaBeli++;}}baris.push(b);}return {usiaMaks,baris,totalBeli,bisaBeli,nilaiBooster};}

function gspaHitungEngine(inp, data, hariIni) {
  const usia = inp.usia != null ? inp.usia : usiaDari(inp.tglLahir, hariIni);
  const out = { usia, tersedia: false, alasan: null, timeline: [] };

  const tarifDasar = gspaTarifEngine(data.dasar, inp.mpp, inp.jk, usia);   // D5
  if (!tarifDasar) {
    out.alasan = 'Tarif GSPA untuk usia ' + usia + ' dengan masa bayar ' + inp.mpp
      + ' tahun tidak ada di database. Masa bayar 5 tahun sampai usia 70, '
      + '10 tahun sampai 65, 15 tahun sampai 60.';
    return out;
  }
  out.tarifDasar = tarifDasar;

  // ---------- UP Dasar dan diskon ----------
  let upDasar, diskon;
  if (inp.mode === 'By Premi Net') {
    // J4: premi net dijadikan basis bulanan lebih dulu
    const netBulanan = inp.metode === 'Tahunan' ? inp.premiNet / 11 : inp.premiNet;
    const hasil = gspaUPdariPremiEngine(netBulanan, tarifDasar, data.diskon);
    if (!hasil) {
      out.alasan = 'Premi net yang dimasukkan tidak menghasilkan UP Dasar yang '
        + 'cocok dengan satu pun tier diskon. Coba nilai lain.';
      return out;
    }
    upDasar = hasil.up;
    diskon = hasil.diskon;
  } else {
    if (!inp.upDasar || inp.upDasar < 100000000) {
      out.alasan = 'Mode By UP: isi UP Dasar minimal Rp100.000.000.';
      return out;
    }
    upDasar = inp.upDasar;                                            // J5
    diskon = gspaTierEngine(upDasar, data.diskon);                          // J6
  }
  out.upDasar = upDasar;
  out.diskon = diskon;

  // ---------- Wakaf ----------
  const wakaf = inp.modeWakaf === 'Wakaf';
  let termLife = 0, tarifWakaf = null, kontribusiTermLife = 0;
  if (wakaf) {
    if (!inp.nilaiWakaf || inp.nilaiWakaf <= 0) {
      out.alasan = 'Mode Wakaf: isi nilai yang ingin diwakafkan.'; return out;
    }
    if (inp.persenWakaf < 0.10 || inp.persenWakaf > 0.45) {
      out.alasan = 'Persentase wakaf harus antara 10% dan 45%.'; return out;
    }
    termLife = inp.nilaiWakaf / inp.persenWakaf;                      // B14
    if (inp.mpp === 15) {
      out.alasan = 'Mode Wakaf tidak tersedia untuk masa bayar 15 tahun.';
      return out;
    }
    tarifWakaf = gspaTarifEngine(data.wakaf, inp.mpp, inp.jk, usia);        // D6
    if (!tarifWakaf) {
      out.alasan = 'Tarif Term Life wakaf untuk usia ' + usia + ' dengan masa bayar '
        + inp.mpp + ' tahun tidak ada di database.';
      return out;
    }
    kontribusiTermLife = tarifWakaf * termLife / 100000000;           // D8
  }
  out.wakaf = wakaf;
  out.nilaiWakaf = wakaf ? inp.nilaiWakaf : 0;                        // F5
  out.termLife = termLife;                                            // B14/B18
  out.tarifWakaf = tarifWakaf;
  out.sisaWakafAhliWaris = wakaf ? termLife - inp.nilaiWakaf : 0;     // F6

  // ---------- Kontribusi ----------
  out.kontribusiDasarBulanan = tarifDasar * upDasar / 100000000;      // D7/J7
  out.kontribusiTermLifeBulanan = kontribusiTermLife;                 // D8
  out.sebelumDiskon = out.kontribusiDasarBulanan + kontribusiTermLife; // D9
  const dasarNet = out.kontribusiDasarBulanan * (1 - diskon);         // J8
  out.bulanan = dasarNet + kontribusiTermLife;                        // D11
  out.tahunan = out.bulanan * 11;                                     // D12
  out.penghematanBulanan = out.sebelumDiskon - out.bulanan;           // D13
  out.sesuaiMetode = inp.metode === 'Tahunan' ? out.tahunan : out.bulanan * 12;  // D15
  out.perSetoran = inp.metode === 'Tahunan' ? out.tahunan : out.bulanan;
  out.totalBulanan = out.bulanan * 12 * inp.mpp;                      // F10
  out.totalTahunan = out.tahunan * inp.mpp;                           // F11

  // ---------- Manfaat ----------
  out.santunanNet = wakaf ? upDasar + out.sisaWakafAhliWaris : upDasar;   // F7
  out.totalUPDibeli = wakaf ? upDasar + termLife : upDasar;               // F9
  out.rasio = out.totalTahunan ? out.santunanNet / out.totalTahunan : null; // F12
  out.usiaAkhirBayar = usia + inp.mpp;                                 // D17
  out.jumlahBooster = Math.floor((100 - usia) / 5);                     // D18
  out.kenaikanPer5Tahun = upDasar * 0.075;                              // D19
  out.santunanUsia100 = upDasar                                          // D20
    * (1 + Math.min(1.5, Math.floor((100 - usia) / 5) * 0.075));
  out.tambahanLuarNegeri = Math.min(upDasar * 0.1, 500000000);           // B27
  out.tambahanTransportasi = Math.min(upDasar, 2000000000);              // B28
  out.tambahanHaji = Math.min(upDasar, 1000000000);                      // B29
  out.maksLuarNegeri = out.santunanUsia100 + out.tambahanLuarNegeri;     // E27
  out.maksTransportasi = out.santunanUsia100 + out.tambahanTransportasi; // E28
  out.maksSeluruh = out.santunanUsia100 + out.tambahanLuarNegeri
    + out.tambahanTransportasi + out.tambahanHaji;                       // E29

  // ---------- Timeline (baris 10 ke bawah pada GSPA_Time) ----------
  const santunanAsuransi = wakaf ? upDasar + termLife : upDasar;         // M10
  /* Baris terakhir jatuh pada USIA 100, bukan 99. Sebelumnya batasnya
     100 - usia sehingga baris paling bawah berhenti di usia 99, padahal
     kartu ringkasan menyebut "santunan usia 100". Perlindungan Gen Aman
     berjalan sampai usia 100, jadi tabelnya kini ikut sampai ke sana. */
  const tahunTerakhir = 101 - usia;
  for (let th = 1; th <= tahunTerakhir; th++) {
    /* Jumlah booster dibatasi out.jumlahBooster. Tanpa batas ini, baris usia
       100 yang baru ditambahkan akan memicu satu booster tambahan yang tidak
       ada di produknya, sehingga manfaat akhir masa tidak lagi sama dengan
       "Santunan usia 100" di kartu ringkasan. Untuk seluruh baris lama nilai
       min() ini tidak mengubah apa pun. */
    const boosterPersen = Math.min(1.5,
      Math.min(Math.floor(th / 5), out.jumlahBooster) * 0.075);          // K10
    const booster = upDasar * boosterPersen;                             // E10
    out.timeline.push({
      tahun: th,
      usia: usia + th - 1,
      kontribusi: th <= inp.mpp ? out.sesuaiMetode : 0,                  // C10
      santunan: santunanAsuransi,
      booster, boosterPersen,
      totalMeninggal: santunanAsuransi + booster + out.tambahanTransportasi
        + out.tambahanLuarNegeri + out.tambahanHaji,                     // I10
      akhirMasa: th === tahunTerakhir                                    // J10
        ? (wakaf ? upDasar + booster : santunanAsuransi + booster) : null,
    });
  }
  out.boosterGratis = gspaBoosterGratisEngine(inp, data, usia, upDasar);
  out.tersedia = true;
  return out;
}



if (typeof InsuranceHubEngines !== 'undefined') { InsuranceHubEngines.GSPA = { id:'GSPA', version:'2.5.0', calculate:gspaHitungEngine }; }
