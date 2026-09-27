#!/usr/bin/env node
/* Regresi: komponen gaya hidup pensiun di Profil Nasabah harus tetap utuh
   setelah Profil → Edit → Simpan → buka kembali.

     node tests/profil-pensiun-edit.test.js [--root <dir>]

   Latar: cpFormValue menyimpan keenam komponen di p.snapshot.pensiun, dan
   kalkulator Kebutuhan Dana Pensiun membacanya dari jalur yang sama.
   cpFillForm pernah membaca p.snapshot.snapshot.pensiun, jalur yang tidak
   pernah ditulis. Akibatnya keenam kolom kosong saat Edit dibuka, lalu
   Simpan menimpa data pensiun profil dengan 0.

   Isian Terakhir bisa menutupi bug ini bila Edit diklik sebelum pemulihan
   layar berjalan (±340 ms). Karena itu Edit di sini baru diklik setelah
   jeda itu lewat, dan satu skenario menghapus data Isian Terakhir.

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

/* Nilai sengaja berbeda semua, supaya kolom yang tertukar ikut tertangkap. */
const PENSIUN = { rutin: 12500000, liburan: 3250000, hobi: 1750000, keluarga: 2000000, sehat: 1100000, lain: 650000 };
const KOLOM = { rutin: 'cpDPRutin', liburan: 'cpDPLiburan', hobi: 'cpDPHobi', keluarga: 'cpDPKeluarga', sehat: 'cpDPSehat', lain: 'cpDPLain' };
const LAIN = { cpPengeluaran: 8000000, cpAset: 150000000, cpDanaDarurat: 24000000 };

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
const buka = async (pg, layar, jeda = 1200) => { await pg.evaluate((k) => window.bukaLayar(k), layar); await pg.waitForTimeout(jeda); };
const klik = (pg, sel) => pg.evaluate((s) => { const n = document.querySelector(s); if (n) n.click(); return !!n; }, sel);
const isi = (pg, id, v) => pg.evaluate(([id, v]) => {
  const n = document.getElementById(id); if (!n) return false;
  n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); return true;
}, [id, v]);
const daftar = (pg) => pg.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), K_PROFIL);
const bacaKolom = (pg, peta) => pg.evaluate((peta) => {
  const o = {}; Object.entries(peta).forEach(([k, id]) => { o[k] = (document.getElementById(id) || {}).value; }); return o;
}, peta);
const keAngka = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, angka(v)]));
const nol = Object.fromEntries(Object.keys(PENSIUN).map((k) => [k, 0]));

async function edit(pg, id) {
  const ada = await klik(pg, '[data-cp-edit="' + id + '"]');
  await pg.waitForTimeout(500);
  const mode = await pg.evaluate(() => document.getElementById('cpStatusBar').dataset.editId || '');
  return { ada, mode };
}
async function simpan(pg) { await klik(pg, '#cpSimpan'); await pg.waitForTimeout(600); }

(async () => {
  const srv = await serve(ROOT);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  const konteks = () => browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
  const semuaError = [];
  console.log('Profil → Edit → Simpan: komponen pensiun (' + ROOT + ')');

  /* ---------- [1] profil baru dengan keenam komponen pensiun ---------- */
  const ctx = await konteks();
  const { pg, errors } = await bukaApp(ctx, url);
  await buka(pg, 'PROFILE', 400);
  await isi(pg, 'cpNama', 'Pensiun Uji');
  await isi(pg, 'cpTgl', '1980-04-04');
  for (const [k, id] of Object.entries(KOLOM)) await isi(pg, id, PENSIUN[k].toLocaleString('id-ID'));
  for (const [id, v] of Object.entries(LAIN)) await isi(pg, id, v.toLocaleString('id-ID'));
  await simpan(pg);
  let list = await daftar(pg);
  const id = list[0] && list[0].id;
  const snapAwal = list[0] && list[0].snapshot;
  cek(list.length === 1 && !!id, '[1] profil tersimpan', list.length);
  cek(sama(snapAwal && snapAwal.pensiun, PENSIUN), '[1] struktur tersimpan: p.snapshot.pensiun berisi keenam komponen', snapAwal && snapAwal.pensiun);
  cek(snapAwal && snapAwal.snapshot === undefined, '[1] tidak ada p.snapshot.snapshot pada rekaman yang ditulis cpFormValue', snapAwal && Object.keys(snapAwal));

  /* ---------- [2] buka kembali → Edit (setelah jeda Isian Terakhir) ---------- */
  await muatUlang(pg);
  await buka(pg, 'PROFILE');
  let e = await edit(pg, id);
  cek(e.ada && e.mode === id, '[2] Edit membuka profil yang benar', e);
  let form = keAngka(await bacaKolom(pg, KOLOM));
  cek(sama(form, PENSIUN), '[2] form Edit menampilkan keenam komponen pensiun', form);
  const formLain = keAngka(await bacaKolom(pg, { cpPengeluaran: 'cpPengeluaran', cpAset: 'cpAset', cpDanaDarurat: 'cpDanaDarurat' }));
  cek(sama(formLain, LAIN), '[2] kolom snapshot lain ikut terisi (pembanding)', formLain);

  /* ---------- [3] Simpan tanpa perubahan ---------- */
  await simpan(pg);
  list = await daftar(pg);
  const r3 = list.find((p) => p.id === id);
  cek(list.length === 1, '[3] Simpan perubahan tidak membuat profil baru', list.length);
  cek(r3 && sama(r3.snapshot.pensiun, PENSIUN), '[3] p.snapshot.pensiun tetap utuh setelah Edit → Simpan', r3 && r3.snapshot.pensiun);
  cek(r3 && LAIN.cpPengeluaran === r3.snapshot.pengeluaran && LAIN.cpAset === r3.snapshot.aset && LAIN.cpDanaDarurat === r3.snapshot.danaDarurat,
    '[3] snapshot lain tidak berubah', r3 && r3.snapshot);

  /* ---------- [4] buka kembali: kalkulator Dana Pensiun + Edit lagi ---------- */
  await muatUlang(pg);
  await buka(pg, 'DP', 800);
  const dk = keAngka(await bacaKolom(pg, Object.fromEntries(Object.keys(PENSIUN).map((k) => [k, 'dk_' + k]))));
  cek(sama(dk, PENSIUN), '[4] Kebutuhan Dana Pensiun memuat keenam komponen dari profil aktif', dk);
  await buka(pg, 'PROFILE');
  e = await edit(pg, id);
  form = keAngka(await bacaKolom(pg, KOLOM));
  cek(e.mode === id && sama(form, PENSIUN), '[4] Edit kedua kali tetap menampilkan keenam komponen', form);

  /* ---------- [5] ubah satu komponen: sisanya harus utuh ---------- */
  await isi(pg, 'cpDPHobi', '2.400.000');
  await simpan(pg);
  list = await daftar(pg);
  const harap5 = Object.assign({}, PENSIUN, { hobi: 2400000 });
  const r5 = list.find((p) => p.id === id);
  cek(r5 && sama(r5.snapshot.pensiun, harap5), '[5] mengubah Hobi tidak mengubah lima komponen lain', r5 && r5.snapshot.pensiun);
  await muatUlang(pg);
  await buka(pg, 'PROFILE');
  await edit(pg, id);
  form = keAngka(await bacaKolom(pg, KOLOM));
  cek(sama(form, harap5), '[5] buka kembali → Edit menampilkan nilai terbaru', form);
  semuaError.push(...errors);
  await ctx.close();

  /* ---------- [6] tanpa data Isian Terakhir: murni cpFillForm ---------- */
  const ctx6 = await konteks();
  const b6 = await bukaApp(ctx6, url);
  await b6.pg.evaluate(([kp, ka, ki, pen]) => {
    const now = new Date().toISOString();
    localStorage.setItem(kp, JSON.stringify([{ id: 'uji-pensiun', nama: 'Tanpa Isian', tglLahir: '1979-03-03', jk: 'WANITA', status: 'Menikah',
      snapshot: { pengeluaran: 6000000, kesehatan: 'BELUM', capturedAt: now, pensiun: pen }, children: [], family: [], createdAt: now, updatedAt: now }]));
    localStorage.setItem(ka, 'uji-pensiun');
    localStorage.removeItem(ki);
  }, [K_PROFIL, K_AKTIF, K_ISIAN, PENSIUN]);
  await muatUlang(b6.pg);
  await buka(b6.pg, 'PROFILE');
  await b6.pg.evaluate((ki) => localStorage.removeItem(ki), K_ISIAN);
  await edit(b6.pg, 'uji-pensiun');
  form = keAngka(await bacaKolom(b6.pg, KOLOM));
  cek(sama(form, PENSIUN), '[6] tanpa Isian Terakhir, Edit tetap menampilkan keenam komponen', form);
  await simpan(b6.pg);
  const r6 = (await daftar(b6.pg)).find((p) => p.id === 'uji-pensiun');
  cek(r6 && sama(r6.snapshot.pensiun, PENSIUN), '[6] Simpan mempertahankan keenam komponen', r6 && r6.snapshot.pensiun);

  /* Batal edit memakai cpFillForm(original) juga: form harus kembali ke data tersimpan. */
  await buka(b6.pg, 'PROFILE');
  await edit(b6.pg, 'uji-pensiun');
  await isi(b6.pg, 'cpDPRutin', '1.000');
  await isi(b6.pg, 'cpDPLain', '');
  await klik(b6.pg, '#cpReset');
  await b6.pg.waitForTimeout(300);
  form = keAngka(await bacaKolom(b6.pg, KOLOM));
  const r6b = (await daftar(b6.pg)).find((p) => p.id === 'uji-pensiun');
  cek(sama(form, PENSIUN), '[6] Batal edit mengembalikan keenam komponen di form', form);
  cek(r6b && sama(r6b.snapshot.pensiun, PENSIUN), '[6] Batal edit tidak mengubah data tersimpan', r6b && r6b.snapshot.pensiun);
  semuaError.push(...b6.errors);
  await ctx6.close();

  /* ---------- [7] profil lama tanpa snapshot.pensiun ---------- */
  const ctx7 = await konteks();
  const b7 = await bukaApp(ctx7, url);
  await b7.pg.evaluate(([kp]) => {
    const now = new Date().toISOString();
    localStorage.setItem(kp, JSON.stringify([{ id: 'uji-lama', nama: 'Profil Lama', tglLahir: '1975-01-01', jk: 'PRIA',
      snapshot: { pengeluaran: 5000000, capturedAt: now }, createdAt: now, updatedAt: now }]));
  }, [K_PROFIL]);
  await muatUlang(b7.pg);
  await buka(b7.pg, 'PROFILE');
  await edit(b7.pg, 'uji-lama');
  form = await bacaKolom(b7.pg, KOLOM);
  cek(Object.values(form).every((v) => v === ''), '[7] profil lama tanpa data pensiun: kolom kosong saat Edit', form);
  await simpan(b7.pg);
  const r7 = (await daftar(b7.pg)).find((p) => p.id === 'uji-lama');
  cek(r7 && sama(r7.snapshot.pensiun, nol) && r7.snapshot.pengeluaran === 5000000, '[7] profil lama tersimpan dengan pensiun 0 tanpa NaN', r7 && r7.snapshot);
  semuaError.push(...b7.errors);
  await ctx7.close();

  cek(!semuaError.length, 'tanpa error halaman / console', semuaError);

  await browser.close();
  srv.close();
  console.log(gagal ? 'HASIL: ' + gagal + ' GAGAL' : 'HASIL: SEMUA LULUS');
  process.exit(gagal ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
