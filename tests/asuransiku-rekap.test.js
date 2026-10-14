#!/usr/bin/env node
/* Rekap Total Perlindungan Asuransiku — tes perhitungan murni (tanpa browser).

     node tests/asuransiku-rekap.test.js

   src/asuransiku-rekap.js dihitung terhadap data polis fiktif dengan angka
   yang diketahui pasti. Bentuk data mengikuti hasil normalisasi server
   (netlify/lib/psg-pribadi.mts): mataUang, jenisPolis, perlindungan[] dengan
   peran DASAR/RIDER, jenis, dan manfaat. */
'use strict';
const path = require('path');
const R = require(path.join(__dirname, '..', 'src', 'asuransiku-rekap.js'));

let gagal = 0, jumlah = 0;
function cek(ok, pesan, detail) {
  jumlah++;
  if (ok) console.log('  ✓ ' + pesan);
  else { gagal++; console.log('  ✗ ' + pesan + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 600) : '')); }
}

let n = 0;
const id = () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0');
const polis = (o) => ({ id: id(), perusahaan: 'P', produk: 'X', jenisPolis: 'TRADISIONAL', mulai: '2020-01-01', mataUang: 'IDR', catatanPribadi: 'RAHASIA', nomorAkhir: '1234', perlindungan: [], ...o });
const cov = (peran, jenis, manfaat, nama) => ({ id: id(), peran, jenis, manfaat: manfaat || {}, ...(nama ? { nama } : {}) });
const jiwaIDR = (r) => r.jiwa.find((g) => g.mataUang === 'IDR');

console.log('1. Satu polis dengan UP jiwa');
{
  const r = R.hitung([polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 1000000000 })] })]);
  const g = jiwaIDR(r);
  cek(g.total === 1000000000 && g.lengkap && g.tercatat === 1 && g.jumlahPolis === 1, 'total UP jiwa = Rp1.000.000.000, lengkap, 1 polis', g);
  cek(r.jumlahPolis === 1 && r.jumlahManfaat === 1, 'jumlah polis 1, manfaat 1');
}

console.log('2–4. Beberapa polis, perusahaan, Unit Link dan Tradisional');
{
  const r = R.hitung([
    polis({ perusahaan: 'Generali', jenisPolis: 'UNIT_LINK', perlindungan: [cov('DASAR', 'JIWA', { up: 1000000000 })] }),
    polis({ perusahaan: 'Prudential', jenisPolis: 'TRADISIONAL', perlindungan: [cov('DASAR', 'JIWA', { up: 500000000 })] }),
    polis({ perusahaan: 'AIA', jenisPolis: 'TRADISIONAL', perlindungan: [cov('DASAR', 'JIWA', { up: 250000000 }), cov('RIDER', 'JIWA', { up: 100000000 }, 'Rider Term')] }),
  ]);
  const g = jiwaIDR(r);
  cek(g.total === 1850000000, 'contoh soal: 1 M + 500 jt + 250 jt + rider 100 jt = Rp1.850.000.000', g.total);
  cek(g.lengkap && g.tercatat === 4 && g.jumlahPolis === 3 && g.jumlahManfaat === 4, 'dari 4 manfaat jiwa pada 3 polis', g);
  cek(g.sumber.map((e) => e.sumber.perusahaan).join(',') === 'Generali,Prudential,AIA,AIA', 'sumber menyebut perusahaan setiap manfaat');
  cek(g.sumber.filter((e) => e.sumber.peran === 'RIDER').length === 1 && g.sumber.find((e) => e.sumber.peran === 'RIDER').sumber.namaRider === 'Rider Term', 'rider tercatat sekali, dengan namanya');
}

console.log('5. Penyakit kritis berdiri sendiri, dipercepat, dan belum diketahui');
{
  const r = R.hitung([
    polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 1000000000 }), cov('RIDER', 'PK', { up: 500000000, sifat: 'DIPERCEPAT' })] }),
    polis({ perlindungan: [cov('DASAR', 'PK', { up: 750000000, sifat: 'BERDIRI_SENDIRI' })] }),
    polis({ perlindungan: [cov('DASAR', 'PK', { up: 300000000, sifat: 'BERDIRI_SENDIRI' })] }),
    polis({ perlindungan: [cov('DASAR', 'PK', { up: 200000000, sifat: 'TIDAK_TAHU' }), cov('RIDER', 'PK', { up: 100000000 })] }),
  ]);
  const bs = r.pk.BERDIRI_SENDIRI[0], dp = r.pk.DIPERCEPAT[0], tt = r.pk.TIDAK_DIKETAHUI[0];
  cek(bs.total === 1050000000 && bs.lengkap, 'PK berdiri sendiri: 750 jt + 300 jt = Rp1.050.000.000', bs);
  cek(dp.total === 500000000 && dp.jumlahManfaat === 1, 'PK dipercepat dipisah: Rp500.000.000', dp);
  cek(tt.jumlahManfaat === 2, 'PK sifat TIDAK_TAHU dan tanpa sifat masuk kelompok belum diketahui', tt);
  cek(r.adaDipercepat && r.adaSifatTidakDiketahui, 'penanda dipercepat dan sifat belum diketahui');
  cek(jiwaIDR(r).total === 1000000000, 'UP jiwa tidak tercampur dengan PK dipercepat', jiwaIDR(r));
  cek(!Object.prototype.hasOwnProperty.call(r, 'totalSemua') && !Object.keys(r).some((k) => /gabung/i.test(k)), 'tidak ada angka gabungan UP jiwa + PK');
}

console.log('6. Kecelakaan per kategori');
{
  const r = R.hitung([
    polis({ perlindungan: [cov('DASAR', 'KECELAKAAN', { upMeninggal: 300000000, cacatTetap: 300000000, catatan: 'Cacat tetap maks. 100% UP sesuai tabel' })] }),
    polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 1 }), cov('RIDER', 'KECELAKAAN', { upMeninggal: 200000000, biayaMedis: 25000000 })] }),
    polis({ perlindungan: [cov('DASAR', 'KECELAKAAN', {})] }),
  ]);
  const k = r.kecelakaan.kategori;
  cek(k.upMeninggal[0].total === 500000000 && k.upMeninggal[0].tercatat === 2, 'UP meninggal kecelakaan: 300 jt + 200 jt = Rp500.000.000', k.upMeninggal);
  cek(k.cacatTetap[0].total === 300000000 && k.cacatTetap[0].tercatat === 1, 'cacat tetap: Rp300.000.000 (tidak digabung dengan kategori lain)', k.cacatTetap);
  cek(k.biayaMedis[0].total === 25000000, 'biaya medis: Rp25.000.000', k.biayaMedis);
  cek(r.kecelakaan.tanpaNilai.length === 1 && r.kelompokBelumLengkap.includes('KECELAKAAN'), 'manfaat kecelakaan tanpa nilai ditandai belum lengkap');
  cek(k.cacatTetap[0].sumber[0].catatan === 'Cacat tetap maks. 100% UP sesuai tabel', 'catatan batas manfaat dipertahankan');
}

console.log('7. Kesehatan per sistem, tanpa penjumlahan');
{
  const r = R.hitung([
    polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 1 }), cov('RIDER', 'KESEHATAN', { sistem: 'TAHUNAN', plan: 'Gold', limitTahunan: 2000000000, limitBooster: 4000000000, syaratBooster: 'Setelah limit dasar habis' })] }),
    polis({ perlindungan: [cov('DASAR', 'KESEHATAN', { sistem: 'TAHUNAN', plan: 'Silver', limitTahunan: 1000000000, limitBooster: 1000000000 })] }),
    polis({ perlindungan: [cov('DASAR', 'KESEHATAN', { sistem: 'PER_KEJADIAN', limitPerKejadian: 150000000, kamarPerHari: 1500000 }), cov('RIDER', 'KESEHATAN', { sistem: 'HARIAN', santunanHarian: 500000, maksHari: 180 })] }),
    polis({ perlindungan: [cov('DASAR', 'KESEHATAN', { sistem: 'LAINNYA', catatan: 'Reimburse rawat jalan' })] }),
  ]);
  const s = r.kesehatan.sistem;
  cek(s.TAHUNAN.length === 2 && s.PER_KEJADIAN.length === 1 && s.HARIAN.length === 1 && s.LAINNYA.length === 1, 'breakdown per sistem: 2 tahunan, 1 per kejadian, 1 harian, 1 lainnya');
  cek(s.TAHUNAN[0].limitTahunan === 2000000000 && s.TAHUNAN[0].limitBooster === 4000000000 && s.TAHUNAN[0].syaratBooster === 'Setelah limit dasar habis' && !s.TAHUNAN[0].syaratBoosterKosong, 'limit dasar, booster, dan syarat booster tercatat per sumber');
  cek(s.TAHUNAN[1].syaratBoosterKosong === true, 'booster tanpa syarat ditandai');
  cek(!JSON.stringify(r.kesehatan).includes('"total"'), 'tidak ada total kesehatan sama sekali');
  cek(s.HARIAN[0].santunanHarian === 500000 && s.HARIAN[0].maksHari === 180 && s.PER_KEJADIAN[0].limitPerKejadian === 150000000, 'santunan harian dan limit per kejadian tetap pada sistemnya');
}

console.log('8. Mata uang berbeda');
{
  const r = R.hitung([
    polis({ mataUang: 'IDR', perlindungan: [cov('DASAR', 'JIWA', { up: 1000000000 })] }),
    polis({ mataUang: 'USD', perlindungan: [cov('DASAR', 'JIWA', { up: 100000 })] }),
    polis({ mataUang: 'USD', perlindungan: [cov('DASAR', 'JIWA', { up: 50000.5 })] }),
  ]);
  cek(r.jiwa.length === 2 && r.jiwa[0].mataUang === 'IDR' && r.jiwa[0].total === 1000000000 && r.jiwa[1].mataUang === 'USD' && r.jiwa[1].total === 150000.5, 'IDR dan USD terpisah, tanpa konversi (USD 150.000,5)', r.jiwa.map((g) => [g.mataUang, g.total]));
  cek(r.multiMataUang && r.mataUang.join() === 'IDR,USD', 'penanda multi mata uang');
}

console.log('9. Data UP kosong atau tidak lengkap');
{
  const r = R.hitung([
    polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 1000000000 })] }),
    polis({ perlindungan: [cov('DASAR', 'JIWA', {})] }),
    polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 0 })] }),
  ]);
  const g = jiwaIDR(r);
  cek(!g.lengkap && g.total === 1000000000 && g.tercatat === 2 && g.tanpaNilai === 1, 'UP kosong bukan nol: subtotal dari yang tercatat, ditandai belum lengkap', g);
  cek(r.kelompokBelumLengkap.includes('JIWA'), 'kelompok jiwa tercatat belum lengkap');
  const kosong = R.hitung([polis({ perlindungan: [cov('DASAR', 'JIWA', {})] })]);
  cek(jiwaIDR(kosong).total === null && !jiwaIDR(kosong).lengkap, 'semua UP kosong: total null (bukan 0)', jiwaIDR(kosong));
  cek(R.hitung([]).jumlahPolis === 0 && R.hitung(null).jiwa.length === 0, 'tanpa polis: rekap kosong tanpa error');
  cek(R.hitung([polis({ perlindungan: [cov('DASAR', 'JIWA', { up: -5 })] })]).jiwa[0].tercatat === 0, 'nilai negatif tidak dihitung');
  cek(R.hitung([polis({ perlindungan: [cov('DASAR', 'JIWA', { up: '1000' })] })]).jiwa[0].tercatat === 0, 'nilai berupa teks tidak dihitung');
}

console.log('10. Rider tidak dihitung ganda');
{
  const p = polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 1000000000 }), cov('RIDER', 'PK', { up: 500000000, sifat: 'BERDIRI_SENDIRI' }, 'Rider PK'), cov('RIDER', 'JIWA', { up: 200000000 }, 'Rider Term')] });
  const r = R.hitung([p]);
  cek(r.jumlahManfaat === 3 && jiwaIDR(r).total === 1200000000 && r.pk.BERDIRI_SENDIRI[0].total === 500000000, 'dasar + rider jiwa = 1,2 M; rider PK 500 jt; total manfaat 3', { m: r.jumlahManfaat, j: jiwaIDR(r).total });
  cek(jiwaIDR(r).jumlahPolis === 1, 'rider dan dasar dihitung sebagai satu polis');
}

console.log('Privasi');
{
  const r = R.hitung([polis({ perlindungan: [cov('DASAR', 'JIWA', { up: 1 })] })]);
  const teks = JSON.stringify(r);
  cek(!teks.includes('RAHASIA') && !teks.includes('1234'), 'rekap tidak membawa catatan pribadi maupun nomor polis');
}

console.log('\n' + (gagal ? 'GAGAL ' + gagal + ' dari ' + jumlah : 'LULUS ' + jumlah + '/' + jumlah));
process.exit(gagal ? 1 : 0);
