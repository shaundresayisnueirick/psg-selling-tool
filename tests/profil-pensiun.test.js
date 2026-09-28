#!/usr/bin/env node
/* Regresi: data Profil Nasabah dan Kebutuhan Dana Pensiun milik masing-masing
   profil.

     node tests/profil-pensiun.test.js [--root <dir>]

   Perilaku yang dijaga:
   A. profil baru selalu mulai dari form bersih — tidak mewarisi data
      non-identitas profil lain (sesudah Simpan, sesudah muat ulang, lewat
      janji temu, atau dari isian lama yang tersimpan di Isian Terakhir)
   B. profil tanpa data pensiun → Dana Pensiun kosong
   C. profil dengan data pensiun → Dana Pensiun terisi otomatis
   D. pindah profil B → A → B → data selalu mengikuti profil aktif
   E. tanpa profil aktif → Dana Pensiun kosong, juga sesudah muat ulang
   F. Edit → tanpa perubahan → Batal → data asli profil tetap tampil
   G. Edit → ubah komponen pensiun → Batal → perubahan tidak tersimpan dan
      data asli profil yang diedit kembali (bukan data profil lain atau
      Isian Terakhir; profil aktif tidak berubah)
   H. Edit → ubah data → Simpan → tersimpan benar (p.snapshot.pensiun utuh,
      hanya kolom yang diubah berubah, lengkap saat dibuka kembali)
   I. Edit cepat (< 340 ms, sebelum jadwal Isian Terakhir) → tidak ada data
      profil lain yang masuk ke form maupun ke rekaman
   J. angka bawaan lama Rp19 juta tidak muncul di kalkulator maupun profil
   K. sesudah Batal edit form berisi data asli profil (mode edit selesai);
      "+ Buat Profil Baru" (pintu Sales Idea) dan "Kosongkan form" (pintu
      Dashboard) selalu mengosongkan form, sehingga profil baru yang disimpan
      sesudahnya tidak membawa data profil yang tadi diedit

   Playwright tidak menjadi dependensi repo: dipakai dari instalasi global
   (NODE_PATH) bila tersedia. Keluar 0 = lulus, 1 = gagal, 2 = dilewati. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

function loadPlaywright() {
  const tries = ['playwright', path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright')];
  for (const t of tries) { try { return require(t); } catch (_) {} }
  console.log('Playwright tidak tersedia — test browser dilewati.');
  process.exit(2);
}
const { chromium } = loadPlaywright();

const args = process.argv.slice(2);
const ri = args.indexOf('--root');
const ROOT = path.resolve(ri >= 0 ? args[ri + 1] : path.join(__dirname, '..'));

const K_PROFIL = 'insuranceHub.customerProfiles.v1';
const K_AKTIF = 'insuranceHub.customerProfile.active.v1';
const K_ISIAN = 'insuranceHub.isianTerakhir.v1';

const KOMPONEN = ['rutin', 'liburan', 'hobi', 'keluarga', 'sehat', 'lain'];
const KOLOM = { rutin: 'cpDPRutin', liburan: 'cpDPLiburan', hobi: 'cpDPHobi', keluarga: 'cpDPKeluarga', sehat: 'cpDPSehat', lain: 'cpDPLain' };
/* Nilai sengaja berbeda semua, supaya kolom yang tertukar ikut tertangkap. */
const PENSIUN = { rutin: 12500000, liburan: 3250000, hobi: 1750000, keluarga: 2000000, sehat: 1100000, lain: 650000 };
const NOL = { rutin: 0, liburan: 0, hobi: 0, keluarga: 0, sehat: 0, lain: 0 };
const AWAL_LAMA = ['15.000.000', '2.000.000', '1.000.000', '1.000.000'];

/* Seluruh isian non-identitas profil B. */
const DATA_B = {
  cpStatus: 'Menikah', cpPekerjaan: 'Arsitek', cpPenghasilan: '30.000.000', cpHP: '081211112222', cpPasangan: 'Rina',
  cpAnak: '1', cpCatatan: 'Catatan B', cpPengeluaran: '9.000.000', cpAset: '500.000.000', cpUtang: '20.000.000',
  cpKPR: '150.000.000', cpDanaDarurat: '30.000.000', cpUPJiwa: '750.000.000', cpUPCI: '200.000.000', cpHealth: 'ADA',
  cpPasanganDob: '1978-02-02', cpAyah: 'Pak Budi', cpAyahDob: '1950-01-01', cpIbu: 'Bu Sari', cpIbuDob: '1952-02-02',
};
for (const k of KOMPONEN) DATA_B[KOLOM[k]] = PENSIUN[k].toLocaleString('id-ID');

/* ---------- server statis ---------- */
const TYPES = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', png: 'image/png',
  svg: 'image/svg+xml', webmanifest: 'application/manifest+json', json: 'application/json', txt: 'text/plain' };
function serve(root) {
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

let gagal = 0;
function cek(ok, pesan, detail) {
  console.log((ok ? '  OK    ' : '  GAGAL ') + pesan + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) gagal++;
}

const angka = (s) => Number(String(s || '').replace(/\D/g, '')) || 0;
const sama = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const beda = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !sama(a[k], b[k]))
  .map((k) => k + ': ' + JSON.stringify(b[k]) + ' (harap ' + JSON.stringify(a[k]) + ')');

async function bukaApp(ctx, url) {
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  pg.on('dialog', (d) => d.accept());
  await pg.addInitScript(() => { try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {} });
  await pg.goto(url, { waitUntil: 'load' });
  await pg.waitForTimeout(800);
  return { pg, errors };
}
const muatUlang = async (pg) => { await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(800); };
/* Pemulihan Isian Terakhir dijadwalkan ±340 ms sesudah layar berganti, tetapi
   terukur bisa mundur sampai ±1,2 dtk saat halaman sibuk. Jeda 2500 ms memberi
   waktu pemulihan itu — kalau masih terjadi — untuk terlihat. */
const JEDA_PULIH = 2500;
const buka = async (pg, layar, jeda = JEDA_PULIH) => { await pg.evaluate((k) => window.bukaLayar(k), layar); await pg.waitForTimeout(jeda); };
const klik = (pg, sel) => pg.evaluate((s) => { const n = document.querySelector(s); if (n) n.click(); return !!n; }, sel);
const isi = (pg, id, v) => pg.evaluate(([id, v]) => {
  const n = document.getElementById(id); if (!n) return false;
  n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); return true;
}, [id, v]);
const daftar = (pg) => pg.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), K_PROFIL);
const profil = async (pg, nama) => (await daftar(pg)).find((p) => p.nama === nama) || null;
const idOf = async (pg, nama) => ((await profil(pg, nama)) || {}).id;
const tanpaWaktu = (p) => { const c = JSON.parse(JSON.stringify(p)); delete c.updatedAt; if (c.snapshot) delete c.snapshot.capturedAt; return c; };

/* Isian form Profil (tanpa daftar profil dan banner kelanjutan). */
const formProfil = (pg) => pg.evaluate(() => {
  const o = {};
  document.getElementById('layarProfile').querySelectorAll('input, select, textarea').forEach((n, i) => {
    if (n.closest('#cpDaftar') || n.closest('#cpLanjut') || n.type === 'button' || n.type === 'submit') return;
    const k = n.id || ([...n.attributes].map((a) => a.name).find((a) => a.startsWith('data-')) + '#' + i);
    o[k] = (n.type === 'checkbox' || n.type === 'radio') ? n.checked : n.value;
  });
  o.__jk = [...document.querySelectorAll('#cpJK button')].map((b) => b.getAttribute('aria-pressed')).join(',');
  o.__anak = document.querySelectorAll('#cpAnakList [data-child-row]').length;
  o.__relasi = document.querySelectorAll('#cpRelasiLainList [data-other-family-row]').length;
  return o;
});
const tanpaIdentitas = (f) => { const c = Object.assign({}, f); ['cpNama', 'cpTgl', 'cpUsia', '__jk'].forEach((k) => delete c[k]); return c; };
const pensiunForm = (pg) => pg.evaluate((kolom) => {
  const o = {}; Object.entries(kolom).forEach(([k, id]) => { o[k] = document.getElementById(id).value; }); return o;
}, KOLOM).then((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, angka(v)])));
const kalkulatorDP = (pg) => pg.evaluate((ids) => ({
  tampil: ids.map((k) => document.getElementById('dk_' + k).value),
  nilai: ids.map((k) => dNilai[k]),
  danaAwal: document.getElementById('dDanaAwal').value,
}), KOMPONEN);
const dpKosong = (d) => d.tampil.every((v) => v === '') && d.nilai.every((v) => v === 0);
const dpSama = (d, pen) => sama(d.tampil.map(angka), KOMPONEN.map((k) => pen[k])) && sama(d.nilai, KOMPONEN.map((k) => pen[k]));

/* Daftar data non-identitas yang terisi pada rekaman profil. */
function isiNonIdentitas(p) {
  const s = p.snapshot || {};
  const out = [];
  ['pekerjaan', 'hp', 'pasangan', 'catatan'].forEach((k) => { if (p[k]) out.push(k); });
  if (p.penghasilan) out.push('penghasilan');
  if (p.anak) out.push('anak');
  if ((p.status || 'Belum menikah') !== 'Belum menikah') out.push('status');
  ['pengeluaran', 'aset', 'utang', 'kpr', 'danaDarurat', 'upJiwa', 'upCI'].forEach((k) => { if (s[k]) out.push('snapshot.' + k); });
  if ((s.kesehatan || 'BELUM') !== 'BELUM') out.push('snapshot.kesehatan');
  KOMPONEN.forEach((k) => { if (s.pensiun && s.pensiun[k]) out.push('snapshot.pensiun.' + k); });
  if ((p.children || []).length) out.push('children');
  (p.family || []).filter((x) => x.id !== 'self').forEach((x) => out.push('family.' + x.id));
  return out;
}

async function edit(pg, id) {
  await klik(pg, '[data-cp-edit="' + id + '"]');
  await pg.waitForTimeout(500);
  return pg.evaluate(() => document.getElementById('cpStatusBar').dataset.editId || '');
}
async function simpan(pg) { await klik(pg, '#cpSimpan'); await pg.waitForTimeout(700); }
async function gunakan(pg, nama) {
  await buka(pg, 'PROFILE', 400);
  await klik(pg, '[data-cp-use="' + await idOf(pg, nama) + '"]');
  await pg.waitForTimeout(600);
}
async function profilBaru(pg, nama, tgl, data) {
  await buka(pg, 'PROFILE', 400);
  await isi(pg, 'cpNama', nama);
  await isi(pg, 'cpTgl', tgl);
  for (const [id, v] of Object.entries(data || {})) await isi(pg, id, v);
  if (data === DATA_B) {
    await klik(pg, '#cpTambahAnak');
    await pg.evaluate(() => {
      const r = [...document.querySelectorAll('#cpAnakList [data-child-row]')].pop();
      const set = (sel, v) => { const n = r.querySelector(sel); if (n) { n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('[data-child-name]', 'Anak B'); set('[data-child-dob]', '2012-12-12');
    });
    await klik(pg, '#cpTambahRelasi');
    await pg.evaluate(() => {
      const r = [...document.querySelectorAll('#cpRelasiLainList [data-other-family-row]')].pop();
      const n = r.querySelector('[data-other-family-name]'); n.value = 'Om B'; n.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  await simpan(pg);
}
/* Isian Terakhir versi lama sempat menyimpan form Profil dan Dana Pensiun per
   profil aktif; data seperti ini masih ada di perangkat agen. */
const tanamIsianLama = (pg, kunci, layar, isian) => pg.evaluate(([ki, kunci, layar, isian]) => {
  const d = JSON.parse(localStorage.getItem(ki) || '{}'); d[kunci] = d[kunci] || {}; d[kunci][layar] = isian;
  localStorage.setItem(ki, JSON.stringify(d));
}, [K_ISIAN, kunci, layar, isian]);

(async () => {
  const srv = await serve(ROOT);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  const konteks = () => browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
  const semuaError = [];
  console.log('Profil Nasabah & Kebutuhan Dana Pensiun per profil (' + ROOT + ')');

  const ctx = await konteks();
  const { pg, errors } = await bukaApp(ctx, url);

  /* ---------- J. bawaan lama Rp19 juta ---------- */
  const bersih = await formProfil(pg);
  let dp = await kalkulatorDP(pg);
  cek(dpKosong(dp) && !dp.tampil.some((v) => AWAL_LAMA.includes(v)), '[J] kalkulator DP tidak memuat angka bawaan Rp19 juta saat aplikasi dimuat', dp);

  /* ---------- C. profil B dengan data lengkap ---------- */
  await profilBaru(pg, 'Bapak B', '1975-05-05', DATA_B);
  const B0 = await profil(pg, 'Bapak B');
  cek(B0 && sama(B0.snapshot.pensiun, PENSIUN), '[C] data pensiun B tersimpan di p.snapshot.pensiun', B0 && B0.snapshot);
  await buka(pg, 'DP');
  dp = await kalkulatorDP(pg);
  cek(dpSama(dp, PENSIUN), '[C] B aktif → Dana Pensiun terisi otomatis dari profil B', dp);

  /* ---------- A. profil baru bersih dalam sesi yang sama ---------- */
  await klik(pg, '#btnProfil');
  await pg.waitForTimeout(JEDA_PULIH);
  let f = await formProfil(pg);
  cek(sama(f, bersih), '[A] sesudah Simpan B, form Profil (tombol Profil di Dashboard) kembali bersih', beda(bersih, f));
  await profilBaru(pg, 'Bapak A', '1980-01-01', null);
  let A = await profil(pg, 'Bapak A');
  cek(A && !isiNonIdentitas(A).length, '[A] profil A (hanya nama + tanggal lahir) tidak mewarisi data B', A && isiNonIdentitas(A));

  /* ---------- B. profil A tanpa data pensiun ---------- */
  cek(A && sama(A.snapshot.pensiun, NOL), '[B] A tersimpan tanpa data pensiun (semua 0)', A && A.snapshot.pensiun);
  await buka(pg, 'DP');
  dp = await kalkulatorDP(pg);
  cek(dpKosong(dp), '[B] A aktif → Dana Pensiun kosong', dp);

  /* ---------- D. B → A → B ---------- */
  await gunakan(pg, 'Bapak B'); await buka(pg, 'DP');
  cek(dpSama(await kalkulatorDP(pg), PENSIUN), '[D] ke B → data B');
  await gunakan(pg, 'Bapak A'); await buka(pg, 'DP');
  cek(dpKosong(await kalkulatorDP(pg)), '[D] ke A → kosong, data B tidak terbawa');
  await isi(pg, 'dk_rutin', '5.000.000'); await pg.waitForTimeout(800);
  await gunakan(pg, 'Bapak B'); await buka(pg, 'DP');
  dp = await kalkulatorDP(pg);
  cek(dpSama(dp, PENSIUN), '[D] isian manual di A tidak masuk ke B', dp);
  await gunakan(pg, 'Bapak A'); await buka(pg, 'DP');
  cek(dpKosong(await kalkulatorDP(pg)), '[D] kembali ke A → kosong lagi');
  await muatUlang(pg); await buka(pg, 'DP');
  cek(dpKosong(await kalkulatorDP(pg)), '[D] A aktif, muat ulang → kosong');
  await gunakan(pg, 'Bapak B'); await muatUlang(pg); await buka(pg, 'DP');
  cek(dpSama(await kalkulatorDP(pg), PENSIUN), '[D] B aktif, muat ulang → data B');
  A = await profil(pg, 'Bapak A');
  cek(sama(A.snapshot.pensiun, NOL), '[D] rekaman A tetap tanpa data pensiun', A.snapshot.pensiun);

  /* ---------- F. Edit → tanpa perubahan → Batal ---------- */
  const idB = await idOf(pg, 'Bapak B');
  const idA = await idOf(pg, 'Bapak A');
  const aktifSekarang = () => pg.evaluate((k) => localStorage.getItem(k), K_AKTIF);
  await buka(pg, 'PROFILE');
  cek(await edit(pg, idB) === idB, '[F] Edit membuka profil B');
  const formEditB = await formProfil(pg);
  cek(sama(await pensiunForm(pg), PENSIUN), '[F] form Edit menampilkan keenam komponen pensiun B', await pensiunForm(pg));
  await klik(pg, '#cpReset'); await pg.waitForTimeout(JEDA_PULIH);
  f = await formProfil(pg);
  cek(sama(f, formEditB), '[F] Batal tanpa perubahan: data asli B tetap tampil', beda(formEditB, f));
  cek(sama(tanpaWaktu(await profil(pg, 'Bapak B')), tanpaWaktu(B0)), '[F] rekaman B tidak berubah');
  cek(await aktifSekarang() === idB, '[F] profil aktif tidak berubah');
  cek(await pg.evaluate(() => document.getElementById('cpStatusBar').dataset.editId || '') === '', '[F] mode edit berakhir');

  /* ---------- H. Edit → ubah data → Simpan ---------- */
  await buka(pg, 'PROFILE');
  await edit(pg, idB);
  await simpan(pg);
  let B = await profil(pg, 'Bapak B');
  cek(sama(tanpaWaktu(B), tanpaWaktu(B0)), '[H] Edit → Simpan tanpa perubahan: rekaman B utuh', beda(tanpaWaktu(B0), tanpaWaktu(B)));
  await klik(pg, '#btnProfil'); await pg.waitForTimeout(JEDA_PULIH);
  cek(sama(await formProfil(pg), bersih), '[A] sesudah Simpan perubahan, form Profil bersih', beda(bersih, await formProfil(pg)));
  await edit(pg, idB);
  await isi(pg, 'cpDPHobi', '2.400.000');
  await simpan(pg);
  B = await profil(pg, 'Bapak B');
  const harapH = tanpaWaktu(B0); harapH.snapshot.pensiun.hobi = 2400000;
  cek(sama(tanpaWaktu(B), harapH), '[H] ubah Hobi → Simpan: hanya Hobi yang berubah', beda(harapH, tanpaWaktu(B)));
  const B1 = B;
  const formEditB1 = Object.assign({}, formEditB, { cpDPHobi: '2.400.000' });
  await muatUlang(pg);
  await buka(pg, 'PROFILE');
  await edit(pg, idB);
  f = await formProfil(pg);
  cek(sama(f, formEditB1), '[H] muat ulang → Edit: data B lengkap dengan Hobi baru', beda(formEditB1, f));
  await klik(pg, '#cpReset'); await pg.waitForTimeout(300);

  /* ---------- G. Edit → ubah satu komponen → Batal ---------- */
  /* Profil aktif A dan Isian Terakhir berisi angka penanda milik A: Batal
     harus mengembalikan data asli B, bukan data profil lain atau isian lama. */
  const penanda = {};
  Object.keys(DATA_B).forEach((id) => { penanda[id] = /Dob$/.test(id) ? '1999-09-09' : (id === 'cpStatus' ? 'Cerai' : (id === 'cpHealth' ? 'ADA' : (/^(cpPekerjaan|cpHP|cpPasangan|cpCatatan|cpAyah|cpIbu)$/.test(id) ? 'BOCOR' : '9.999.000'))); });
  await gunakan(pg, 'Bapak A');
  await tanamIsianLama(pg, idA, 'layarProfile', penanda);
  await buka(pg, 'PROFILE');
  await edit(pg, idB);
  await isi(pg, 'cpDPRutin', '1.000');
  await klik(pg, '#cpReset'); await pg.waitForTimeout(JEDA_PULIH);
  f = await formProfil(pg);
  cek(sama(f, formEditB1), '[G] ubah Rutin → Batal: data asli B kembali', beda(formEditB1, f));
  cek(sama(tanpaWaktu(await profil(pg, 'Bapak B')), tanpaWaktu(B1)), '[G] perubahan Rutin tidak tersimpan', beda(tanpaWaktu(B1), tanpaWaktu(await profil(pg, 'Bapak B'))));
  cek(await aktifSekarang() === idA, '[G] profil aktif tetap A');
  await edit(pg, idB);
  await isi(pg, 'cpDPLiburan', '7.000.000'); await isi(pg, 'cpPekerjaan', 'Diubah'); await isi(pg, 'cpAset', '1.000');
  await klik(pg, '#cpReset'); await pg.waitForTimeout(JEDA_PULIH);
  f = await formProfil(pg);
  cek(sama(f, formEditB1), '[G] ubah beberapa kolom → Batal: semua kembali ke data asli B', beda(formEditB1, f));
  cek(sama(tanpaWaktu(await profil(pg, 'Bapak B')), tanpaWaktu(B1)), '[G] rekaman B tetap');
  cek(sama(tanpaWaktu(await profil(pg, 'Bapak A')), tanpaWaktu(A)), '[G] rekaman A tidak berubah');
  await gunakan(pg, 'Bapak B');

  /* ---------- A. sesudah muat ulang, dengan isian lama di Isian Terakhir ---------- */
  await tanamIsianLama(pg, idB, 'layarProfile', DATA_B);
  await muatUlang(pg);
  await klik(pg, '#btnProfil'); await pg.waitForTimeout(JEDA_PULIH);
  f = await formProfil(pg);
  cek(sama(f, bersih), '[A] B aktif + isian lama B di Isian Terakhir, muat ulang → form Profil bersih', beda(bersih, f));
  await profilBaru(pg, 'Bapak D', '1991-01-01', null);
  const D = await profil(pg, 'Bapak D');
  cek(D && !isiNonIdentitas(D).length, '[A] profil D sesudah muat ulang tidak mewarisi data B', D && isiNonIdentitas(D));

  /* ---------- A. Edit B ditinggalkan → janji temu → profil prospek ---------- */
  await gunakan(pg, 'Bapak A');
  await buka(pg, 'PROFILE');
  await edit(pg, idB);
  await klik(pg, '#tblKiri'); await pg.waitForTimeout(600);
  await klik(pg, '#btnAktivitas'); await pg.waitForTimeout(500);
  await isi(pg, 'jtNama', 'Ibu Prospek'); await isi(pg, 'jtHp', '081299998888');
  await klik(pg, '#jtSimpan'); await pg.waitForTimeout(400);
  const adaJanji = await klik(pg, '[data-janji-profil]'); await pg.waitForTimeout(JEDA_PULIH);
  f = await formProfil(pg);
  const harapJanji = Object.assign({}, bersih, { cpHP: f.cpHP });
  cek(adaJanji && f.cpNama === 'Ibu Prospek' && String(angka(f.cpHP)).endsWith('81299998888'),
    '[A] janji temu → Profil prospek terisi nama & HP', { nama: f.cpNama, hp: f.cpHP });
  cek(sama(tanpaIdentitas(f), tanpaIdentitas(harapJanji)), '[A] janji temu sesudah Edit B ditinggalkan: kolom lain bersih', beda(tanpaIdentitas(harapJanji), tanpaIdentitas(f)));
  await isi(pg, 'cpTgl', '1995-09-09');
  await simpan(pg);
  const P = await profil(pg, 'Ibu Prospek');
  cek(P && sama(isiNonIdentitas(P), ['hp']), '[A] profil prospek hanya berisi nama, tanggal lahir, dan HP dari janji', P && isiNonIdentitas(P));
  B = await profil(pg, 'Bapak B');
  cek(sama(tanpaWaktu(B), tanpaWaktu(B1)), '[A] profil B tidak berubah oleh alur janji temu', beda(tanpaWaktu(B1), tanpaWaktu(B)));

  /* ---------- I. Edit cepat, isian lama milik profil aktif di Isian Terakhir ---------- */
  /* Z sengaja jarang terisi: kolom kosongnya adalah sasaran pemulihan. */
  await buka(pg, 'PROFILE', 400); await klik(pg, '#cpReset');
  await profilBaru(pg, 'Bapak Z', '1970-07-07', { cpPekerjaan: 'Guru', cpDPRutin: '8.000.000', cpDPHobi: '500.000', cpPengeluaran: '4.000.000' });
  const idZ = await idOf(pg, 'Bapak Z');
  const Z0 = await profil(pg, 'Bapak Z');
  cek(sama(isiNonIdentitas(Z0), ['pekerjaan', 'snapshot.pengeluaran', 'snapshot.pensiun.rutin', 'snapshot.pensiun.hobi']),
    '[I] prasyarat: Z hanya berisi pekerjaan, pengeluaran, rutin, hobi', isiNonIdentitas(Z0));
  await buka(pg, 'PROFILE');
  await edit(pg, idZ);
  const formEditZ = await formProfil(pg);
  await klik(pg, '#cpReset'); await pg.waitForTimeout(200);
  await gunakan(pg, 'Bapak A');
  await tanamIsianLama(pg, idA, 'layarProfile', penanda);
  await muatUlang(pg);
  await pg.evaluate(() => window.bukaLayar('PROFILE'));
  await pg.waitForTimeout(60);
  await klik(pg, '[data-cp-edit="' + idZ + '"]');
  await pg.waitForTimeout(JEDA_PULIH);
  f = await formProfil(pg);
  cek(sama(f, formEditZ), '[I] Edit cepat: form hanya berisi data Z sendiri', beda(formEditZ, f));
  await simpan(pg);
  let Z = await profil(pg, 'Bapak Z');
  cek(sama(tanpaWaktu(Z), tanpaWaktu(Z0)), '[I] Simpan sesudah Edit cepat tidak menulis data profil lain', beda(tanpaWaktu(Z0), tanpaWaktu(Z)));
  /* Balapan terburuk: jadwal pemulihan Isian Terakhir jatuh tepat sesudah
     Edit. Dipicu langsung lewat API yang sama dengan penjadwalnya, supaya
     hasilnya tidak bergantung pada kecepatan mesin. */
  await gunakan(pg, 'Bapak A');
  await tanamIsianLama(pg, idA, 'layarProfile', penanda);
  await muatUlang(pg);
  await pg.evaluate((id) => {
    window.bukaLayar('PROFILE');
    document.querySelector('[data-cp-edit="' + id + '"]').click();
    window.InsuranceHubIsianTerakhir.pulihkanLayar(document.getElementById('layarProfile'));
  }, idZ);
  await pg.waitForTimeout(JEDA_PULIH);
  f = await formProfil(pg);
  cek(sama(f, formEditZ), '[I] pemulihan Isian Terakhir tepat sesudah Edit: form tetap hanya data Z', beda(formEditZ, f));
  await simpan(pg);
  Z = await profil(pg, 'Bapak Z');
  cek(sama(tanpaWaktu(Z), tanpaWaktu(Z0)), '[I] Simpan sesudahnya tidak menulis data profil lain ke Z', beda(tanpaWaktu(Z0), tanpaWaktu(Z)));
  cek(sama(tanpaWaktu(await profil(pg, 'Bapak A')), tanpaWaktu(A)), '[I] rekaman A tidak berubah');

  /* ---------- J. tidak ada profil yang menyimpan bawaan lama ---------- */
  const semua = await daftar(pg);
  const pakaiAwal = semua.filter((p) => p.snapshot && p.snapshot.pensiun && p.snapshot.pensiun.rutin === 15000000);
  cek(!pakaiAwal.length, '[J] tidak ada profil dengan komponen pensiun bawaan lama', pakaiAwal.map((p) => p.nama));
  semuaError.push(...errors);
  await ctx.close();

  /* ---------- E. tanpa profil aktif ---------- */
  const ctxE = await konteks();
  const bE = await bukaApp(ctxE, url);
  await tanamIsianLama(bE.pg, 'TANPA_PROFIL', 'layarDP', { dk_rutin: '7.000.000', dk_hobi: '900.000', dDanaAwal: '50.000.000' });
  await muatUlang(bE.pg);
  await buka(bE.pg, 'DP');
  dp = await kalkulatorDP(bE.pg);
  cek(dpKosong(dp) && angka(dp.danaAwal) === 0, '[E] tanpa profil + isian lama TANPA_PROFIL → Dana Pensiun kosong', dp);
  await isi(bE.pg, 'dk_rutin', '8.000.000'); await isi(bE.pg, 'dDanaAwal', '40.000.000'); await bE.pg.waitForTimeout(800);
  await buka(bE.pg, 'PRODUK', 600);
  await muatUlang(bE.pg);
  await buka(bE.pg, 'DP');
  dp = await kalkulatorDP(bE.pg);
  cek(dpKosong(dp) && angka(dp.danaAwal) === 0, '[E] isian manual tanpa profil tidak dipulihkan sesudah muat ulang', dp);
  cek(!dp.tampil.some((v) => AWAL_LAMA.includes(v)), '[J] tanpa profil, bawaan lama tidak muncul', dp.tampil);
  semuaError.push(...bE.errors);
  await ctxE.close();

  /* ---------- K. Batal edit lalu profil baru, lewat dua pintu masuk ---------- */
  const ctxK = await konteks();
  const bK = await bukaApp(ctxK, url);
  const kp = bK.pg;
  const bersihK = await formProfil(kp);
  const DATA_BUDI = Object.assign({}, DATA_B, { cpPekerjaan: 'Direktur' });
  await profilBaru(kp, 'Budi', '1970-01-01', DATA_BUDI);
  const Budi0 = await profil(kp, 'Budi');
  const idBudi = Budi0.id;
  const modeEdit = () => kp.evaluate(() => ({ edit: document.getElementById('cpStatusBar').dataset.editId || '',
    simpan: document.getElementById('cpSimpan').textContent, reset: document.getElementById('cpReset').textContent }));
  for (const pintu of ['Sales Idea', 'Dashboard']) {
    if (pintu === 'Sales Idea') {
      await kp.evaluate(() => window.InsuranceHubCustomerProfile.bukaUntuk({ source: 'sales_idea', topic: 'retirement', target: 'DP' }));
    } else {
      await klik(kp, '#btnProfil');
    }
    await kp.waitForTimeout(JEDA_PULIH);
    await edit(kp, idBudi);
    const formEditBudi = await formProfil(kp);
    await klik(kp, '#cpReset'); await kp.waitForTimeout(300);
    f = await formProfil(kp);
    let m = await modeEdit();
    cek(sama(f, formEditBudi) && m.edit === '' && m.simpan === 'Simpan profil',
      '[K1] ' + pintu + ': Edit Budi → Batal → data Budi kembali, mode edit selesai', { beda: beda(formEditBudi, f), mode: m });
    await edit(kp, idBudi);
    await isi(kp, 'cpDPRutin', '1.000'); await isi(kp, 'cpDPHobi', '9.000.000');
    await klik(kp, '#cpReset'); await kp.waitForTimeout(300);
    const Budi = await profil(kp, 'Budi');
    cek(sama(tanpaWaktu(Budi), tanpaWaktu(Budi0)) && sama(await formProfil(kp), formEditBudi),
      '[K4] ' + pintu + ': ubah pensiun → Batal → pensiun Budi tidak berubah', Budi.snapshot.pensiun);
    const tombol = pintu === 'Sales Idea' ? '#cpBuatBaru' : '#cpReset';
    const label = await kp.evaluate((s) => { const n = document.querySelector(s); return n && n.offsetParent !== null ? n.textContent : null; }, tombol);
    cek(label === (pintu === 'Sales Idea' ? '+ Buat Profil Baru' : 'Kosongkan form'), '[K2] ' + pintu + ': tombol profil baru tersedia sesudah Batal', label);
    await klik(kp, tombol); await kp.waitForTimeout(300);
    f = await formProfil(kp);
    m = await modeEdit();
    cek(sama(f, bersihK) && m.edit === '', '[K2] ' + pintu + ': "' + label + '" → form bersih, mode profil baru', beda(bersihK, f));
    const namaBaru = 'Andi ' + pintu;
    await isi(kp, 'cpNama', namaBaru); await isi(kp, 'cpTgl', '1992-02-02');
    await simpan(kp);
    const Andi = await profil(kp, namaBaru);
    cek(Andi && !isiNonIdentitas(Andi).length, '[K3] ' + pintu + ': ' + namaBaru + ' tersimpan tanpa data Budi', Andi && isiNonIdentitas(Andi));
    cek(sama(tanpaWaktu(await profil(kp, 'Budi')), tanpaWaktu(Budi0)), '[K3] ' + pintu + ': rekaman Budi tetap');
  }
  semuaError.push(...bK.errors);
  await ctxK.close();

  /* ---------- profil lama tanpa snapshot.pensiun ---------- */
  const ctxL = await konteks();
  const bL = await bukaApp(ctxL, url);
  await bL.pg.evaluate(([kp, ka]) => {
    const now = new Date().toISOString();
    localStorage.setItem(kp, JSON.stringify([{ id: 'uji-lama', nama: 'Profil Lama', tglLahir: '1975-01-01', jk: 'PRIA',
      snapshot: { pengeluaran: 5000000, capturedAt: now }, createdAt: now, updatedAt: now }]));
    localStorage.setItem(ka, 'uji-lama');
  }, [K_PROFIL, K_AKTIF]);
  await muatUlang(bL.pg);
  await buka(bL.pg, 'DP');
  cek(dpKosong(await kalkulatorDP(bL.pg)), '[B] profil lama tanpa snapshot.pensiun → Dana Pensiun kosong');
  await buka(bL.pg, 'PROFILE');
  await edit(bL.pg, 'uji-lama');
  cek(Object.values(await pensiunForm(bL.pg)).every((v) => v === 0), '[F] profil lama: kolom pensiun kosong saat Edit');
  await simpan(bL.pg);
  const L = (await daftar(bL.pg)).find((p) => p.id === 'uji-lama');
  cek(L && sama(L.snapshot.pensiun, NOL) && L.snapshot.pengeluaran === 5000000, '[F] profil lama tersimpan dengan pensiun 0 tanpa NaN', L && L.snapshot);
  semuaError.push(...bL.errors);
  await ctxL.close();

  cek(!semuaError.length, 'tanpa error halaman / console', semuaError);

  await browser.close();
  srv.close();
  console.log(gagal ? 'HASIL: ' + gagal + ' GAGAL' : 'HASIL: SEMUA LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
