#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

function loadPlaywright() {
  for (const item of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) {
    try { return require(item); } catch (_) {}
  }
  console.error('Playwright tidak tersedia.');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', png: 'image/png' };
const server = http.createServer((req, res) => {
  let name = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

const customer = JSON.stringify([{ id: 'c-1', nama: 'Nasabah tersimpan' }, { id: 'c-2', nama: 'Nasabah kedua' }]);
const library = JSON.stringify([{ id: 'l-1', judul: 'Library tersimpan' }]);
/* Isian kalkulator berbentuk asli src/isian-terakhir.js: { profil: { idLayar: { idIsian: nilai } } },
   tanpa profil aktif (TANPA_PROFIL) maupun untuk profil tertentu. */
const calculator = JSON.stringify({
  TANPA_PROFIL: { layarCRIS: { cUp: '2700000000', cMasa: '10', cRider: true }, layarDP: { dUsiaPensiun: '55' } },
  'p-123': { layarKPR: { pPinjaman: '1700000000', pTenor: '15' } }
});
const KEY_ISIAN = 'insuranceHub.isianTerakhir.v1';

/* Bandingkan isian kalkulator sebelum/sesudah alur. Satu-satunya tambahan yang sah:
   entri layarAktivitas milik profil aktif (simpan-otomatis isian-terakhir.js), berisi
   hanya isian yang ada di layar Aktivitas, bernilai teks/centang, dan — bila nomor HP
   ikut tersimpan — sama dengan yang diketik tes. Apa pun selain itu dilaporkan. */
function bandingkanIsian(awal, akhir, aturan) {
  const hasil = { hilang: [], berubah: [], tambahanTakDiizinkan: [], tambahanDiizinkan: [] };
  const objek = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const jenis = (x) => Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x;
  const telusuri = (a, b, jalur) => {
    if (objek(a)) {
      if (!objek(b)) { hasil.berubah.push({ jalur, awal: jenis(a), akhir: jenis(b) }); return; }
      for (const k of Object.keys(a)) {
        if (!(k in b)) hasil.hilang.push({ jalur: jalur.concat(k).join('/'), awal: a[k] });
        else telusuri(a[k], b[k], jalur.concat(k));
      }
      for (const k of Object.keys(b)) if (!(k in a)) tambahan(jalur.concat(k), b[k]);
    } else if (JSON.stringify(a) !== JSON.stringify(b)) hasil.berubah.push({ jalur: jalur.join('/'), awal: a, akhir: b });
  };
  const tambahan = (jalur, nilai) => {
    const lokasi = jalur.join('/');
    /* profil aktif yang belum pernah punya isian: boleh muncul bila isinya hanya layarAktivitas */
    if (jalur.length === 1 && jalur[0] === aturan.profilAktif && objek(nilai)) {
      for (const k of Object.keys(nilai)) tambahan(jalur.concat(k), nilai[k]);
      return;
    }
    const alasan = [];
    if (!(jalur.length === 2 && jalur[0] === aturan.profilAktif && jalur[1] === 'layarAktivitas')) alasan.push('lokasi bukan ' + aturan.profilAktif + '/layarAktivitas');
    else if (!objek(nilai)) alasan.push('bukan objek isian');
    else {
      for (const [id, v] of Object.entries(nilai)) {
        if (!aturan.isianAktivitas.includes(id)) alasan.push('isian ' + id + ' tidak ada di layar Aktivitas');
        if (typeof v !== 'string' && typeof v !== 'boolean') alasan.push('nilai ' + id + ' bertipe ' + jenis(v));
      }
      if ('aktAgenHp' in nilai && nilai.aktAgenHp !== aturan.hp) alasan.push('aktAgenHp ' + JSON.stringify(nilai.aktAgenHp) + ' ≠ ' + aturan.hp);
    }
    if (alasan.length) hasil.tambahanTakDiizinkan.push({ jalur: lokasi, nilai, alasan });
    else hasil.tambahanDiizinkan.push(lokasi);
  };
  telusuri(awal, akhir, []);
  return hasil;
}
const demoAgent = { nama: 'PSG TEAM', kode: '68000001', hp: '0812000000' };
const demoLevel = { level: 'FC', nama: 'Financial Consultant', namaAgen: 'PSG TEAM', kodeAgen: '68000001' };

async function main() {
  const { chromium } = loadPlaywright();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browserPath = process.argv.find((arg, i, all) => all[i - 1] === '--browser');
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  let checks = 0; const failures = []; const pageErrors = [];
  const check = (ok, message, detail) => {
    checks++;
    console.log((ok ? 'PASS ' : 'FAIL ') + checks + '. ' + message + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
    if (!ok) failures.push(message);
  };
  let profile = { id: 'owner-1', email: 'erwin.effendi@psg.test', nama: 'Erwin Effendi', kodeAgen: null,
    level: null, roles: ['psg_owner'], status: 'aktif', emailTerkonfirmasi: true };

  async function preparePage(context) {
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.addInitScript(({ agent, level, customerData, libraryData, calcData }) => {
      localStorage.setItem('insuranceHub.agen.v1', JSON.stringify(agent));
      localStorage.setItem('insuranceHub.level.v1', JSON.stringify(level));
      localStorage.setItem('insuranceHub.agen.foto.v1', 'data:image/png;base64,OLD_DEMO_PHOTO');
      localStorage.setItem('insuranceHub.customerProfiles.v1', customerData);
      localStorage.setItem('insuranceHub.libraryIlustrasi.v1', libraryData);
      localStorage.setItem('insuranceHub.isianTerakhir.v1', calcData);
    }, { agent: demoAgent, level: demoLevel, customerData: customer, libraryData: library, calcData: calculator });
    await page.route('**/src/vendor/netlify-identity.js', route => route.fulfill({
      status: 200, contentType: 'application/javascript', body: `window.PSGNetlifyIdentity={getUser:async()=>({id:'${profile.id}',email:'${profile.email}'}),login:async()=>({}),logout:async()=>{},requestPasswordRecovery:async()=>{}};`
    }));
    await page.route('**/api/psg/me', route => route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user: profile }) }));
    await page.route('**/api/psg/profile-setup', async route => {
      const body = route.request().postDataJSON();
      if (!profile.roles.includes('psg_owner')) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'owner_required' }) });
      if (profile.kodeAgen || profile.level) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'profile_already_set' }) });
      profile = { ...profile, kodeAgen: body.kodeAgen, level: body.level };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: profile }) });
    });
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.InsuranceHubIdentity?.source === 'server:/api/psg/me');
    await page.waitForFunction(() => !document.getElementById('insuranceAccessGate'));
    return page;
  }

  try {
    const ownerContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const ownerPage = await preparePage(ownerContext);
    await ownerPage.evaluate(() => { window.InsuranceHubNavigation.bukaLayar('AKTIVITAS'); window.aktivitasSegarkan(); });
    await ownerPage.waitForSelector('#aktAgenNama');
    check(await ownerPage.locator('#aktAgenNama').inputValue() === 'Erwin Effendi' && await ownerPage.locator('#aktAgenNama').isDisabled().catch(() => false) === false &&
      await ownerPage.locator('#aktAgenNama').getAttribute('readonly') !== null, 'Nama Identity ditampilkan dan read-only');
    check(await ownerPage.locator('#aktAgenKode').inputValue() === '' && await ownerPage.locator('#aktAgenKode').getAttribute('readonly') === null &&
      await ownerPage.locator('#aktAgenLevel').evaluate(n => n.tagName === 'SELECT'), 'Owner lama hanya mendapat input kode dan pilihan level untuk setup awal');
    check(await ownerPage.locator('#aktSetupProfilOwner').count() === 1 && await ownerPage.locator('#aktAgenNama').inputValue() === 'Erwin Effendi',
      'form setup tidak menyediakan pengeditan nama/role/status');
    check((await ownerPage.locator('#aktIdentitas input[readonly]').evaluateAll(nodes => nodes.map(n => n.value))).includes('PSG Owner · Aktif'),
      'role PSG Owner dan status aktif ditampilkan read-only dari Identity');

    await ownerPage.locator('#aktAgenKode').fill('68073640');
    await ownerPage.locator('#aktAgenLevel').selectOption('BD');
    await ownerPage.locator('#aktSetupProfilOwner').click();
    await ownerPage.waitForFunction(() => window.InsuranceHubIdentity?.kodeAgen === '68073640' && window.InsuranceHubIdentity?.level === 'BD');
    check(await ownerPage.locator('#aktAgenKode').getAttribute('readonly') !== null && await ownerPage.locator('#aktAgenLevel').evaluate(n => n.tagName === 'INPUT' && n.readOnly),
      'setelah setup kode dan level terkunci berdasarkan profile server');
    check(await ownerPage.locator('#sambutanAgen').innerText().then(t => t.includes('Erwin Effendi') && t.includes('68073640') && t.includes('Business Director (BD)')),
      'Welcome mengikuti nama, kode, dan level server setelah setup');
    check(await ownerPage.locator('#aktAgenNama').inputValue() === 'Erwin Effendi' && !await ownerPage.locator('#aktSetupProfilOwner').count(),
      'Aktivitas & Poin tetap memakai identitas Identity yang sudah lengkap');
    await ownerPage.reload({ waitUntil: 'load' });
    await ownerPage.waitForFunction(() => window.InsuranceHubIdentity?.kodeAgen === '68073640' && window.InsuranceHubIdentity?.level === 'BD');
    await ownerPage.evaluate(() => { window.InsuranceHubNavigation.bukaLayar('AKTIVITAS'); window.aktivitasSegarkan(); });
    await ownerPage.waitForFunction(() => document.querySelector('#aktAgenKode')?.value === '68073640');
    check(await ownerPage.locator('#aktAgenKode').getAttribute('readonly') !== null &&
      await ownerPage.locator('#aktAgenNama').inputValue() === 'Erwin Effendi',
      'setelah reload, Identity server tetap menampilkan profil owner yang tersimpan dan terkunci');

    await ownerPage.locator('#aktAgenHp').fill('08125551234');
    await ownerPage.locator('#aktSimpanHp').click();
    const localAfterHp = await ownerPage.evaluate(() => ({ agent: JSON.parse(localStorage.getItem('insuranceHub.agen.v1')) }));
    check(localAfterHp.agent.nama === 'PSG TEAM' && localAfterHp.agent.kode === '68000001' && localAfterHp.agent.hp === '08125551234',
      'nomor HP lokal disimpan tanpa menimpa data demo lama atau identitas server');
    /* simpan-otomatis isian-terakhir.js menulis 600 md sesudah ketikan terakhir: tunggu sampai
       entri layarAktivitas profil aktif tertulis (maks 5 dtk), baru bandingkan */
    const profilAktif = await ownerPage.evaluate(() => localStorage.getItem('insuranceHub.customerProfile.active.v1') || 'TANPA_PROFIL');
    const simpanSelesai = await ownerPage.waitForFunction(({ key, profil }) => {
      try { const d = JSON.parse(localStorage.getItem(key) || 'null'); return !!(d && d[profil] && d[profil].layarAktivitas); } catch (_) { return false; }
    }, { key: KEY_ISIAN, profil: profilAktif }, { timeout: 5000 }).then(() => true, () => false);
    const isianAktivitas = await ownerPage.evaluate(() =>
      [...document.querySelectorAll('#layarAktivitas input, #layarAktivitas select, #layarAktivitas textarea')].map(n => n.id).filter(Boolean));
    const lokal = await ownerPage.evaluate((key) => ({ customer: localStorage.getItem('insuranceHub.customerProfiles.v1'),
      library: localStorage.getItem('insuranceHub.libraryIlustrasi.v1'), calc: localStorage.getItem(key) }), KEY_ISIAN);
    const masalah = {};
    if (lokal.customer !== customer) masalah['insuranceHub.customerProfiles.v1'] = { awal: customer, akhir: lokal.customer };
    if (lokal.library !== library) masalah['insuranceHub.libraryIlustrasi.v1'] = { awal: library, akhir: lokal.library };
    if (!simpanSelesai) masalah[KEY_ISIAN + ' (tunggu)'] = 'simpan-otomatis tidak menulis ' + profilAktif + '/layarAktivitas dalam 5 dtk; isi sekarang: ' + lokal.calc;
    else {
      let akhir = null;
      try { akhir = JSON.parse(lokal.calc); } catch (e) { masalah[KEY_ISIAN] = { galat: 'bukan JSON valid', akhir: lokal.calc }; }
      if (akhir !== null) {
        const beda = bandingkanIsian(JSON.parse(calculator), akhir, { profilAktif, isianAktivitas, hp: '08125551234' });
        if (beda.hilang.length || beda.berubah.length || beda.tambahanTakDiizinkan.length || beda.tambahanDiizinkan.length !== 1)
          masalah[KEY_ISIAN] = { hilang: beda.hilang, berubah: beda.berubah, tambahanTakDiizinkan: beda.tambahanTakDiizinkan, tambahanDiizinkan: beda.tambahanDiizinkan };
      }
    }
    check(!Object.keys(masalah).length, 'Customer, Library, dan data kalkulator lokal tetap utuh', masalah);

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Xn8AAAAASUVORK5CYII=', 'base64');
    await ownerPage.locator('#aktFotoAgen').setInputFiles({ name: 'erwin.png', mimeType: 'image/png', buffer: png });
    const ownKey = 'insuranceHub.agen.foto.identity.v1.erwin.effendi%40psg.test';
    await ownerPage.waitForFunction(key => !!localStorage.getItem(key), ownKey);
    await ownerPage.waitForFunction(() => !!document.querySelector('#sambutanAgen img') && !!document.querySelector('#aktIdentitas img'));
    check(await ownerPage.evaluate(key => !!localStorage.getItem(key), ownKey), 'foto Aktivitas disimpan pada key Identity per email');
    check(await ownerPage.locator('#sambutanAgen img').count() === 1 && await ownerPage.locator('#aktIdentitas img').count() === 1,
      'foto yang sama tampil pada Welcome dan Aktivitas & Poin');

    profile = { id: 'agent-2', email: 'budi@psg.test', nama: 'Budi', kodeAgen: 'TEST123', level: 'BM',
      roles: [], status: 'aktif', emailTerkonfirmasi: true };
    const agentPage = await preparePage(ownerContext);
    await agentPage.evaluate(() => { window.InsuranceHubNavigation.bukaLayar('AKTIVITAS'); window.aktivitasSegarkan(); });
    await agentPage.waitForSelector('#aktAgenNama');
    check(await agentPage.locator('#aktAgenNama').inputValue() === 'Budi' && await agentPage.locator('#aktAgenNama').getAttribute('readonly') !== null &&
      await agentPage.locator('#aktAgenKode').inputValue() === 'TEST123' && await agentPage.locator('#aktAgenKode').getAttribute('readonly') !== null &&
      await agentPage.locator('#aktAgenLevel').inputValue() === 'Business Manager (BM)' && await agentPage.locator('#aktAgenLevel').getAttribute('readonly') !== null,
      'akun hasil Invite hanya melihat nama/kode/level server dalam mode read-only');
    check(await agentPage.locator('#aktSetupProfilOwner').count() === 0, 'akun agen tidak mendapat setup Owner');
    check(await agentPage.locator('#sambutanAgen img').count() === 0 && await agentPage.locator('#aktIdentitas img').count() === 0,
      'akun lain pada perangkat yang sama tidak mengambil foto Erwin atau foto demo global');
    check(await agentPage.evaluate(() => localStorage.getItem('insuranceHub.agen.foto.v1')) === 'data:image/png;base64,OLD_DEMO_PHOTO',
      'foto legacy/global dipertahankan tanpa dijadikan foto akun Identity');
    check(await agentPage.evaluate(key => !!localStorage.getItem(key), ownKey), 'foto Erwin tetap tersimpan terpisah saat akun lain memakai perangkat yang sama');
    await ownerPage.locator('#hapusFotoAgen').click();
    await ownerPage.waitForFunction(key => !localStorage.getItem(key), ownKey);
    check(await ownerPage.locator('#sambutanAgen img').count() === 0 && await ownerPage.locator('#aktIdentitas img').count() === 0,
      'hapus foto dari Aktivitas juga menghapusnya dari Welcome');
    check(pageErrors.length === 0, 'tidak ada JavaScript error', pageErrors);
    await ownerContext.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(`\n${failures.length ? 'FAIL' : 'PASS'}: ${checks - failures.length}/${checks} activity identity checks`);
  if (failures.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); try { server.close(); } catch (_) {} process.exitCode = 1; });
