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

const customer = JSON.stringify([{ id: 'c-1', nama: 'Nasabah tersimpan' }]);
const library = JSON.stringify([{ id: 'l-1', judul: 'Library tersimpan' }]);
const calculator = JSON.stringify({ data: 'kalkulator lokal' });
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
    const localAfterHp = await ownerPage.evaluate(() => ({ agent: JSON.parse(localStorage.getItem('insuranceHub.agen.v1')),
      customer: localStorage.getItem('insuranceHub.customerProfiles.v1'), library: localStorage.getItem('insuranceHub.libraryIlustrasi.v1'),
      calc: localStorage.getItem('insuranceHub.isianTerakhir.v1') }));
    check(localAfterHp.agent.nama === 'PSG TEAM' && localAfterHp.agent.kode === '68000001' && localAfterHp.agent.hp === '08125551234',
      'nomor HP lokal disimpan tanpa menimpa data demo lama atau identitas server');
    check(localAfterHp.customer === customer && localAfterHp.library === library && localAfterHp.calc === calculator,
      'Customer, Library, dan data kalkulator lokal tetap utuh');

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
