#!/usr/bin/env node
'use strict';
const { pasangSesiUji } = require('./lib/sesi-uji');
/* Tertanggung keluarga tetap konsisten di semua produk yang punya dropdown
   "Data tertanggung" (src/core.js: cpRenderInsuredSelector):
     1. sesudah memilih anggota: nama, tanggal lahir, dan jenis kelamin form
        produk = data anggota itu (dibaca dari InsuranceHubCustomerProfile.family
        menurut ID anggota, bukan nama) — termasuk COMBO (oTgl/oJK);
     2. buka Ringkasan/Ilustrasi sebuah produk lalu Back: produk itu DAN semua
        produk lain di latar belakang tetap memakai anggota pilihannya — dropdown,
        ID profil, identitas, usia, hasil hitung, dan isian lain tidak berubah;
        identitas produk latar yang anggotanya bukan profil utama tidak ditulis
        ulang (tanpa event input);
     3. membuka lagi setiap produk: tetap sama;
     4. kembali dari program-summary.html (index.html dimuat ulang): pilihan
        tiap produk pulih — termasuk Dana Pensiun (layar .tanpa-simpan) — dan
        hasil hitung sama;
     5. Dana Pensiun: yang tersimpan di Isian Terakhir HANYA pilihan
        tertanggungnya; isian kebutuhan pensiun lain tetap tidak disimpan dan
        tidak dipulihkan sesudah dimuat ulang;
     6. Edit Profil lewat form (tanggal lahir pasangan diubah, satu anak
        dihapus, Simpan perubahan): produk di latar belakang langsung memakai
        data anggota terbaru menurut ID — anggota yang dihapus kembali ke
        profil utama — tanpa perlu dibuka, dan membukanya tidak mengubah apa pun.
   Pembanding hasil = hasil hitung aplikasi sendiri sesudah pilihan dibuat.
   Fixture fiktif dengan dua struktur keluarga; dua anak sengaja bernama sama
   (ID, tanggal lahir, dan jenis kelamin berbeda) untuk membuktikan pemilihan
   berdasarkan ID; kedua profil memakai ID anggota 'child-0' untuk
   membuktikan pilihan terikat pada ID profil.

     node tests/profil-keluarga-ringkasan.test.js [--root <dir>] [--browser <path>] */

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadPlaywright() {
  for (const item of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) {
    try { return require(item); } catch (_) {}
  }
  console.error('Playwright tidak tersedia; tes browser tidak dijalankan.');
  process.exit(2);
}

const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const root = path.resolve(arg('--root') || path.join(__dirname, '..'));
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', webmanifest: 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let target = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  if (target.endsWith('/')) target += 'index.html';
  const file = path.resolve(root, '.' + target);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

/* Produk yang memakai dropdown keluarga: layar, isian nama / tanggal lahir /
   segmen jenis kelamin yang ada di form produk (null = form tidak punya). */
const PRODUK = {
  LF: { l: 'layarLF', n: 'fNama', t: 'fTgl', j: 'fJK' },
  BSL: { l: 'layarBSL', n: 'bNama', t: 'bTgl', j: 'bJK' },
  CRIS: { l: 'layarCRIS', n: 'cNama', t: 'cTgl', j: 'cJK' },
  CEM: { l: 'layarCEM', n: 'mNama', t: 'mTgl', j: 'mJK' },
  KMB: { l: 'layarKMB', n: 'kNama', t: 'kTgl', j: 'kJK' },
  GSPA: { l: 'layarGSPA', n: 'gNama', t: 'gTgl', j: 'gJK' },
  FLEX: { l: 'layarFLEX', n: 'xNama', t: 'xTgl', j: null },
  GHP: { l: 'layarGHP', n: 'hNama', t: 'hTgl', j: 'hJK' },
  DP: { l: 'layarDP', n: 'dNama', t: 'dTgl', j: null },
  KPR: { l: 'layarKPR', n: 'pNama', t: null, j: null },
  R2: { l: 'layarR2', n: 'rNama', t: 'rTgl', j: 'rJK' },
  PDK: { l: 'layarPDK', n: 'nNama', t: null, j: null },
  COMBO: { l: 'layarCOMBO', n: 'oNama', t: 'oTgl', j: 'oJK' },
  GPRO: { l: 'layarGPRO', n: 'qNama', t: 'qTgl', j: 'qJK' },
  RAYA: { l: 'layarRAYA', n: 'rayaNama', t: 'rayaTglLahir', j: null }
};
const KUNCI = Object.keys(PRODUK);

/* Fixture fiktif. A: utama + pasangan + dua anak bernama sama. B: utama wanita,
   satu anak, satu relasi lain; ID anggota 'child-0' juga dipakai A. */
const A = { id: 'fx-a-01', nama: 'Prospek Alfa', tglLahir: '1981-04-12', jk: 'PRIA', status: 'Menikah', pasangan: 'Pasangan Alfa',
  family: [
    { id: 'self', nama: 'Prospek Alfa', tglLahir: '1981-04-12', jk: 'PRIA', hubungan: 'Diri Sendiri' },
    { id: 'spouse', nama: 'Pasangan Alfa', tglLahir: '1987-09-03', jk: 'WANITA', hubungan: 'Istri' },
    { id: 'child-0', nama: 'Anak Alfa', tglLahir: '2012-06-15', jk: 'PRIA', hubungan: 'Anak' },
    { id: 'child-1', nama: 'Anak Alfa', tglLahir: '2016-11-20', jk: 'WANITA', hubungan: 'Anak' }],
  children: [{ nama: 'Anak Alfa', tglLahir: '2012-06-15', jk: 'PRIA' }, { nama: 'Anak Alfa', tglLahir: '2016-11-20', jk: 'WANITA' }] };
const B = { id: 'fx-b-07', nama: 'Prospek Beta', tglLahir: '1975-01-30', jk: 'WANITA', status: 'Cerai',
  family: [
    { id: 'self', nama: 'Prospek Beta', tglLahir: '1975-01-30', jk: 'WANITA', hubungan: 'Diri Sendiri' },
    { id: 'child-0', nama: 'Anak Beta', tglLahir: '2005-08-08', jk: 'PRIA', hubungan: 'Anak' },
    { id: 'ortu-1', nama: 'Orang Tua Beta', tglLahir: '1950-03-15', jk: 'PRIA', hubungan: 'Orang Tua' }],
  children: [{ nama: 'Anak Beta', tglLahir: '2005-08-08', jk: 'PRIA' }] };

const semua = (id) => Object.fromEntries(KUNCI.map((k) => [k, id]));
const SKENARIO = [
  { label: 'A · profil utama (kontrol)', profil: A, pilihan: semua('self'), sumber: ['GPRO'] },
  { label: 'A · pasangan', profil: A, pilihan: semua('spouse'), sumber: ['COMBO'] },
  { label: 'A · anak (child-0)', profil: A, pilihan: semua('child-0'), sumber: ['LF'] },
  { label: 'A · anak bernama sama (child-1)', profil: A, pilihan: semua('child-1'), sumber: ['CRIS'], cekDp: true },
  { label: 'B · profil utama wanita (kontrol)', profil: B, pilihan: semua('self'), sumber: ['KPR'] },
  { label: 'B · anak (child-0, ID sama dengan A)', profil: B, pilihan: semua('child-0'), sumber: ['PDK'] },
  { label: 'B · relasi lain (ortu-1)', profil: B, pilihan: semua('ortu-1'), sumber: ['DP'] },
  { label: 'A · campuran per produk', profil: A,
    pilihan: Object.fromEntries(KUNCI.map((k, i) => [k, ['spouse', 'child-0', 'child-1', 'self'][i % 4]])), sumber: ['GPRO', 'COMBO'], cekEdit: true }
];

let checks = 0; const failures = [];
const check = (ok, message, detail) => {
  checks++;
  console.log((ok ? 'PASS ' : 'FAIL ') + checks + '. ' + message + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail).slice(0, 1500)));
  if (!ok) failures.push(message);
};

/* Hiasan yang modul lain pasang HANYA pada layar yang sedang tampil, dari
   keadaan layar aktif — bukan dari tertanggung:
   - src/catatan-ghp.js: bintang + catatan premi GHP (layarTampil());
   - src/prompt-flyer.js: SEMUA .prompt-flyer-panel disegarkan dari judul &
     ringkasan layar aktif.
   Di layar latar hiasan ini bisa tertinggal/hilang tanpa terlihat, jadi
   dibandingkan terpisah (field "hiasan") hanya ketika produknya sedang
   dibuka; hasil hitung lainnya selalu dibandingkan. */
const HIASAN_LAYAR_AKTIF = '.prompt-flyer-panel, .catatan-ghp, sup.bintang-ghp';

/* dibaca di halaman: keadaan form produk tanpa membuka layarnya */
function fotoProduk(c) {
  const e = (id) => (id ? document.getElementById(id) : null);
  const lay = document.getElementById(c.l);
  const wrap = lay && lay.querySelector('[data-cp-insured-selector]');
  const s = wrap && wrap.querySelector('select');
  const pressed = (box) => (box ? ((box.querySelector('[aria-pressed="true"]') || {}).dataset || {}).nilai || '' : null);
  const klon = lay.cloneNode(true);
  if (c.abaikan) klon.querySelectorAll(c.abaikan).forEach((n) => n.remove());
  klon.querySelectorAll('[data-cp-insured-selector],select,input,textarea,script,style').forEach((n) => n.remove());
  const hiasan = [...klon.querySelectorAll(c.hiasan)].map((n) => (n.hidden ? '[hidden]' : '') + n.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
  klon.querySelectorAll(c.hiasan).forEach((n) => n.remove());
  const isian = [...lay.querySelectorAll('input,select,textarea')]
    .filter((n) => n.id && !n.closest('[data-cp-insured-selector]') && !(c.abaikan && n.closest(c.abaikan)) && n.id !== c.n && n.id !== c.t)
    .map((n) => n.id + '=' + ((n.type === 'checkbox' || n.type === 'radio') ? n.checked : n.value)).join('|');
  const segmen = [...lay.querySelectorAll('.segmen[id]')].filter((b) => b.id !== c.j).map((b) => b.id + '=' + pressed(b)).join('|');
  return { dropdown: s ? s.value : null, profil: wrap ? wrap.dataset.cpProfileId : null, nama: e(c.n) ? e(c.n).value : null,
    tgl: c.t ? (e(c.t) ? e(c.t).value : null) : null, jk: c.j ? pressed(e(c.j)) : null,
    hasil: klon.textContent.replace(/\s+/g, ' ').trim(), hiasan, isian, segmen };
}

async function main() {
  const { chromium } = loadPlaywright();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browserPath = arg('--browser');
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const pageErrors = [];
  const jkSama = (a, b) => String(a || 'PRIA').toUpperCase() === String(b || 'PRIA').toUpperCase();
  /* potongan di sekitar karakter pertama yang berbeda */
  const potong = (x, y) => { x = String(x); y = String(y); let i = 0; while (i < x.length && x[i] === y[i]) i++;
    const a = Math.max(0, i - 60); return [x.slice(a, i + 100), y.slice(a, i + 100)]; };
  /* aktif = produk itu sedang dibuka, jadi hiasan layar aktifnya ikut dibandingkan */
  const beda = (a, b, aktif) => ['dropdown', 'profil', 'nama', 'tgl', 'jk', 'hasil', 'isian', 'segmen'].concat(aktif ? ['hiasan'] : []).filter((k) => a[k] !== b[k])
    .map((k) => { const [s, t] = potong(a[k], b[k]); return { field: k, sebelum: s, sesudah: t }; });

  try {
    for (const sk of SKENARIO) {
      console.log('\n## ' + sk.label + ' — Ringkasan dari ' + sk.sumber.join(', '));
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (e) => pageErrors.push(sk.label + ': ' + e.message));
      await pasangSesiUji(context);
      await context.addInitScript(({ profil, lain }) => {
        try {
          sessionStorage.setItem('insuranceHub.access.v3', 'ok');
          if (!sessionStorage.getItem('uji.disemai')) {
            localStorage.clear();
            localStorage.setItem('insuranceHub.customerProfiles.v1', JSON.stringify([profil, lain]));
            localStorage.setItem('insuranceHub.customerProfile.active.v1', profil.id);
            sessionStorage.setItem('uji.disemai', '1');
          }
        } catch (_) {}
        /* hitung event input per id isian (untuk memastikan produk latar tidak ditulis ulang) */
        window.__ev = {};
        document.addEventListener('input', (e) => { const id = e.target && e.target.id; if (id) window.__ev[id] = (window.__ev[id] || 0) + 1; }, true);
      }, { profil: sk.profil, lain: sk.profil === A ? B : A });

      const siap = async () => {
        await page.waitForFunction(() => window.InsuranceHubNavigation && window.InsuranceHubCustomerProfile && !document.getElementById('insuranceAccessGate'));
        await page.waitForTimeout(400);
      };
      /* tunggu sampai layar aktif stabil: isi sama pada 4 bacaan berturut-turut
         (±600 ms tenang). Isian Terakhir memulihkan isian ±340 ms sesudah layar
         dibuka dan catatan GHP dipasang 120 ms sesudah gambar ulang. */
      const tenang = async () => {
        await page.waitForTimeout(250);
        let lalu = null, sama = 0;
        for (let i = 0; i < 40 && sama < 3; i++) {
          const kini = await page.evaluate(() => { const l = document.querySelector('.layar.aktif'); return l ? l.id + ':' + l.textContent : ''; });
          sama = kini === lalu ? sama + 1 : 0;
          lalu = kini; await page.waitForTimeout(200);
        }
      };
      const buka = async (k) => {
        await page.evaluate((x) => window.InsuranceHubNavigation.bukaLayar(x), k);
        await page.waitForFunction((l) => document.getElementById(l)?.classList.contains('aktif') && !!document.querySelector('#' + l + ' [data-cp-insured-selector] select'), PRODUK[k].l);
        await tenang();
      };
      const foto = (k, abaikan) => page.evaluate(fotoProduk, { ...PRODUK[k], hiasan: HIASAN_LAYAR_AKTIF, abaikan });
      const harapan = await (async () => {
        await page.goto(base + 'index.html', { waitUntil: 'load' }); await siap();
        return page.evaluate(() => { const P = window.InsuranceHubCustomerProfile; return { aktif: P.active().id, anggota: P.family(P.active()) }; });
      })();
      const anggota = (id) => harapan.anggota.find((m) => m.id === id);

      /* 1. pilih anggota di tiap produk; hasil hitung aplikasi menjadi pembanding */
      const awal = {}; const salahIdentitas = [];
      for (const k of KUNCI) {
        await buka(k);
        await page.evaluate(({ l, id }) => { const s = document.querySelector('#' + l + ' [data-cp-insured-selector] select'); s.value = id;
          s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, { l: PRODUK[k].l, id: sk.pilihan[k] });
        await tenang();
        const f = await foto(k); awal[k] = f;
        const m = anggota(sk.pilihan[k]), c = PRODUK[k];
        const ok = m && f.dropdown === m.id && f.profil === harapan.aktif && f.nama === m.nama &&
          (!c.t || f.tgl === m.tglLahir) && (!c.j || jkSama(f.jk, m.jk));
        if (!ok) salahIdentitas.push({ produk: k, harap: m && { id: m.id, nama: m.nama, tgl: c.t ? m.tglLahir : '-', jk: c.j ? m.jk : '-' }, form: { dropdown: f.dropdown, profil: f.profil, nama: f.nama, tgl: f.tgl, jk: f.jk } });
      }
      check(!salahIdentitas.length, sk.label + ': sesudah memilih, identitas ' + KUNCI.length + ' produk = anggota pilihan menurut ID (nama, tanggal lahir, jenis kelamin; COMBO termasuk)', salahIdentitas);

      /* 2. Ringkasan → Back; produk lain diperiksa TANPA dibuka */
      for (const src of sk.sumber) {
        await buka(src);
        await page.evaluate(() => { window.__ev = {}; });
        await page.evaluate(() => document.getElementById('tblKanan').click());
        await page.waitForFunction((l) => !document.getElementById(l).classList.contains('aktif'), PRODUK[src].l);
        const layarRingkasan = await page.evaluate(() => document.querySelector('.layar.aktif')?.id);
        await page.evaluate(() => document.getElementById('tblKiri').click());
        await page.waitForFunction((l) => document.getElementById(l).classList.contains('aktif'), PRODUK[src].l);
        await tenang();
        const berubah = [], ditulisUlang = [];
        const ev = await page.evaluate(() => window.__ev);
        for (const k of KUNCI) {
          const f = await foto(k), d = beda(awal[k], f, k === src);
          if (d.length) berubah.push({ produk: k, beda: d });
          if (k !== src && sk.pilihan[k] !== 'self') {
            const n = (ev[PRODUK[k].n] || 0) + (PRODUK[k].t ? (ev[PRODUK[k].t] || 0) : 0);
            if (n) ditulisUlang.push({ produk: k, eventInput: n });
          }
        }
        check(!berubah.length, sk.label + ': ' + src + ' → ' + layarRingkasan + ' → Back: ' + KUNCI.length + ' produk (yang dibuka & latar) tetap — dropdown, ID profil, identitas, usia/hasil hitung, isian lain', berubah);
        check(!ditulisUlang.length, sk.label + ': Back dari ' + src + ' tidak menulis ulang identitas produk latar yang tertanggungnya bukan profil utama (0 event input)', ditulisUlang);
      }

      /* 3. membuka lagi setiap produk */
      const berubahBuka = [];
      for (const k of KUNCI) { await buka(k); const d = beda(awal[k], await foto(k), true); if (d.length) berubahBuka.push({ produk: k, beda: d }); }
      check(!berubahBuka.length, sk.label + ': membuka lagi setiap produk — pilihan, identitas, dan hasil hitung tetap', berubahBuka);

      /* 4. kembali dari program-summary.html (index.html dimuat ulang) */
      const kembaliDariProgramSummary = async () => {
        await page.goto(base + 'program-summary.html', { waitUntil: 'load' });
        await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.evaluate(() => document.getElementById('programBack').click())]);
        await siap();
      };
      await kembaliDariProgramSummary();
      const berubahMuat = [];
      for (const k of KUNCI) { await buka(k); const d = beda(awal[k], await foto(k), true); if (d.length) berubahMuat.push({ produk: k, beda: d }); }
      const aktif = await page.evaluate(() => localStorage.getItem('insuranceHub.customerProfile.active.v1'));
      check(!berubahMuat.length && aktif === harapan.aktif, sk.label + ': kembali dari program-summary.html (dimuat ulang) — pilihan tiap produk pulih (DP termasuk), hasil hitung sama, profil aktif tetap', { aktif, berubahMuat });

      /* 5. Dana Pensiun (layarDP, .tanpa-simpan): hanya pilihan tertanggung yang
         disimpan. Semua isian non-identitas DP diubah, layar ditinggalkan (saat
         itu Isian Terakhir menyimpan layar yang ditinggalkan), lalu dimuat ulang:
         pilihan tertanggung harus pulih, isian yang diubah TIDAK. */
      if (sk.cekDp) {
        const dpTersimpan = () => page.evaluate((p) => {
          const d = JSON.parse(localStorage.getItem('insuranceHub.isianTerakhir.v1') || '{}') || {};
          return (d[p] || {}).layarDP || null; }, harapan.aktif);
        const sebelumUbah = await dpTersimpan();
        check(JSON.stringify(sebelumUbah) === JSON.stringify({ cpTertanggungDP: sk.pilihan.DP }),
          sk.label + ': Isian Terakhir untuk layarDP hanya berisi pilihan tertanggung', sebelumUbah);
        await buka('DP');
        const dpAwal = await foto('DP');
        const ubahan = await page.evaluate(() => {
          const lay = document.getElementById('layarDP'), out = [];
          const identitas = /(Nama|Tgl|JK|Jk|AgenNama|AgenHP)$/;
          [...lay.querySelectorAll('input,select,textarea')].filter((n) => n.id && !n.closest('[data-cp-insured-selector]') && !identitas.test(n.id)
            && !n.disabled && !n.readOnly && !['button', 'submit', 'file', 'hidden'].includes(n.type)).forEach((n) => {
            const lama = (n.type === 'checkbox' || n.type === 'radio') ? n.checked : n.value;
            if (n.tagName === 'SELECT') { const lain = [...n.options].map((o) => o.value).filter((v) => v !== n.value); if (!lain.length) return; n.value = lain[lain.length - 1]; }
            else if (n.type === 'checkbox' || n.type === 'radio') n.checked = !n.checked;
            else n.value = n.value === '7' ? '8' : '7';
            n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true }));
            out.push({ id: n.id, lama, baru: (n.type === 'checkbox' || n.type === 'radio') ? n.checked : n.value });
          });
          return out;
        });
        await page.waitForTimeout(900);                 // lewat jeda simpan Isian Terakhir (600 ms)
        await tenang();
        const dpUbah = await foto('DP');                // perubahan harus benar-benar mengubah hasil DP
        await buka('LF');                               // tinggalkan layarDP: Isian Terakhir menyimpan layar yang ditinggalkan
        const sesudahUbah = await dpTersimpan();
        check(ubahan.length > 0 && dpUbah.hasil !== dpAwal.hasil && JSON.stringify(sesudahUbah) === JSON.stringify({ cpTertanggungDP: sk.pilihan.DP }),
          sk.label + ': sesudah ' + ubahan.length + ' isian kebutuhan pensiun DP diubah (hasil DP ikut berubah), Isian Terakhir layarDP tetap hanya berisi pilihan tertanggung',
          { ubahan: ubahan.map((u) => u.id), hasilBerubah: dpUbah.hasil !== dpAwal.hasil, sesudahUbah });
        await kembaliDariProgramSummary();
        await buka('DP');
        const dpMuat = await foto('DP');
        const nilaiKini = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => { const n = document.getElementById(id);
          return [id, !n ? null : (n.type === 'checkbox' || n.type === 'radio') ? n.checked : n.value]; })), ubahan.map((u) => u.id));
        const terpulihkan = ubahan.filter((u) => nilaiKini[u.id] === u.baru && u.baru !== u.lama).map((u) => ({ id: u.id, diubahKe: u.baru, kini: nilaiKini[u.id], awal: u.lama }));
        const bukanAwal = ubahan.filter((u) => nilaiKini[u.id] !== u.lama).map((u) => ({ id: u.id, awal: u.lama, kini: nilaiKini[u.id] }));
        const m = anggota(sk.pilihan.DP);
        check(dpMuat.dropdown === sk.pilihan.DP && dpMuat.nama === m.nama && dpMuat.tgl === m.tglLahir && !beda(dpAwal, dpMuat, true).length,
          sk.label + ': sesudah dimuat ulang, DP kembali ke anggota pilihan (identitas & hasil hitung sama seperti sebelum isian diubah)', { dropdown: dpMuat.dropdown, nama: dpMuat.nama, tgl: dpMuat.tgl, beda: beda(dpAwal, dpMuat, true) });
        check(!terpulihkan.length && !bukanAwal.length,
          sk.label + ': sesudah dimuat ulang, ' + ubahan.length + ' isian kebutuhan pensiun DP yang diubah TIDAK dipulihkan (kembali ke nilai awal)', { terpulihkan, bukanAwal });
      }
      /* 6. Edit Profil lewat form: DOB pasangan diubah, anak kedua dihapus. */
      if (sk.cekEdit) {
        const DOB_BARU = '1992-01-10';
        await page.evaluate(() => window.InsuranceHubNavigation.bukaLayar('PROFILE'));
        await page.waitForFunction((id) => !!document.querySelector('[data-cp-edit="' + id + '"]'), harapan.aktif);
        await page.evaluate((id) => document.querySelector('[data-cp-edit="' + id + '"]').click(), harapan.aktif);
        await page.waitForFunction(() => document.querySelectorAll('#cpAnakList [data-child-row]').length >= 2);
        await page.evaluate((dob) => {
          const d = document.getElementById('cpPasanganDob'); d.value = dob;
          d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true }));
          document.querySelectorAll('#cpAnakList [data-child-row]')[1].querySelector('[data-child-delete]').click();
        }, DOB_BARU);
        await page.evaluate(() => document.getElementById('cpSimpan').click());
        await page.waitForFunction(() => !document.getElementById('layarProfile').classList.contains('aktif'));
        await page.waitForTimeout(1200);
        const baru = await page.evaluate(() => { const P = window.InsuranceHubCustomerProfile; return P.family(P.active()); });
        const anggotaBaru = (id) => baru.find((m) => m.id === id);
        /* #hDaftar = daftar tertanggung mode Keluarga GHP. Isinya dikelola
           app.js (hIsiDariProfil) dan disinkronkan dari profil saat GHP
           digambar ulang/dibuka — mekanisme terpisah dari dropdown tertanggung
           dan sudah ada sebelum perbaikan ini; hasil GHP hanya tampil di layar
           GHP. Daftar itu dibandingkan terpisah di bawah. */
        const DAFTAR_GHP = '#hDaftar';
        const latar = {}, salahLatar = [];
        for (const k of KUNCI) {
          const f = await foto(k, DAFTAR_GHP); latar[k] = f;
          const harap = anggotaBaru(sk.pilihan[k]) ? sk.pilihan[k] : 'self', m = anggotaBaru(harap), c = PRODUK[k];
          if (!(m && f.dropdown === harap && f.nama === m.nama && (!c.t || f.tgl === m.tglLahir) && (!c.j || jkSama(f.jk, m.jk))))
            salahLatar.push({ produk: k, harap: { id: harap, nama: m && m.nama, tgl: c.t && m ? m.tglLahir : '-' }, form: { dropdown: f.dropdown, nama: f.nama, tgl: f.tgl, jk: f.jk } });
        }
        /* anggota yang dihapus bukan lagi pilihan: opsi tiap dropdown = anggota terbaru (+ Ketik manual) */
        const opsiSalah = await page.evaluate(({ ls, harap }) => ls.map((l) => {
          const s = document.querySelector('#' + l + ' [data-cp-insured-selector] select');
          const opsi = s ? [...s.options].map((o) => o.value) : null;
          return JSON.stringify(opsi) === JSON.stringify(harap) ? null : { layar: l, opsi };
        }).filter(Boolean), { ls: KUNCI.map((k) => PRODUK[k].l), harap: baru.map((m) => m.id).concat('__manual__') });
        check(!opsiSalah.length, sk.label + ': sesudah Edit Profil, opsi dropdown ' + KUNCI.length + ' produk = anggota terbaru (anggota yang dihapus tidak bisa dipilih)', opsiSalah);
        const pasangan = anggotaBaru('spouse');
        check(pasangan && pasangan.tglLahir === DOB_BARU && !anggotaBaru('child-1') && !salahLatar.length,
          sk.label + ': sesudah Edit Profil (DOB pasangan diubah, child-1 dihapus), ' + KUNCI.length + ' produk di latar langsung memakai data anggota terbaru menurut ID; anggota terhapus → profil utama',
          { pasangan, adaChild1: !!anggotaBaru('child-1'), salahLatar });
        const berubahEdit = [];
        for (const k of KUNCI) { await buka(k); const d = beda(latar[k], await foto(k, DAFTAR_GHP), false); if (d.length) berubahEdit.push({ produk: k, beda: d }); }
        check(!berubahEdit.length, sk.label + ': sesudah Edit Profil, membuka tiap produk tidak mengubah identitas maupun hasil hitung (hasil di latar sudah memakai data terbaru)', berubahEdit);
        await buka('GHP');
        const daftarGhp = await page.evaluate(() => [...document.querySelectorAll('#hDaftar [id^="ht"]')].map((n) => n.value));
        check(daftarGhp.includes(DOB_BARU) && !daftarGhp.includes('1987-09-03'),
          sk.label + ': GHP mode Keluarga — daftar anggota (app.js) memuat DOB pasangan terbaru saat GHP dibuka', daftarGhp);
      }
      await context.close();
    }
    check(pageErrors.length === 0, 'tidak ada JavaScript error', pageErrors.slice(0, 5));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`\n${failures.length ? 'FAIL' : 'PASS'}: ${checks - failures.length}/${checks} family insured checks`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); try { server.close(); } catch (_) {} process.exitCode = 1; });
