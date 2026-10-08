#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadPlaywright() {
  for (const item of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) {
    try { return require(item); } catch (_) {}
  }
  console.error('Playwright tidak tersedia; Identity profile isolation test tidak dijalankan.');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json' };
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

const profile = {
  id: 'erwin-identity', email: 'erwin.effendi@psg.test', nama: 'Erwin Effendi', kodeAgen: '68073640',
  level: 'BD', roles: ['psg_agent'], status: 'aktif', emailTerkonfirmasi: true
};

async function main() {
  const { chromium } = loadPlaywright();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browserPath = process.argv.find((arg, i, all) => all[i - 1] === '--browser');
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {});
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [], failures = [];
  let checks = 0;
  const check = (ok, label, detail) => {
    checks++;
    console.log((ok ? 'PASS ' : 'FAIL ') + checks + '. ' + label + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
    if (!ok) failures.push(label);
  };
  page.on('pageerror', error => errors.push(error.message));

  const preserved = {
    customer: JSON.stringify([{ id: 'customer-1', nama: 'Nasabah tersimpan' }]),
    library: JSON.stringify([{ id: 'library-1', judul: 'Ilustrasi tersimpan' }]),
    calculator: JSON.stringify({ form: 'angka lokal tetap' })
  };
  const stalePhoto = 'data:image/png;base64,DEMO-PHOTO-PSG-TEAM';

  await page.addInitScript(({ data, photo }) => {
    localStorage.setItem('insuranceHub.level.v1', JSON.stringify({ level: 'FC', nama: 'Financial Consultant', namaAgen: 'PSG TEAM', kodeAgen: '68000001' }));
    localStorage.setItem('insuranceHub.agen.v1', JSON.stringify({ nama: 'PSG TEAM', kode: '68000001', hp: '0812000000' }));
    localStorage.setItem('insuranceHub.agen.foto.v1', photo);
    localStorage.setItem('insuranceHub.customerProfiles.v1', data.customer);
    localStorage.setItem('insuranceHub.libraryIlustrasi.v1', data.library);
    localStorage.setItem('insuranceHub.isianTerakhir.v1', data.calculator);
    /* Simulasikan sisa sesi kode akses pada perangkat demo yang sama. */
    sessionStorage.setItem('insuranceHub.access.v3', 'ok');
  }, { data: preserved, photo: stalePhoto });

  await page.route('**/src/vendor/netlify-identity.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: `
      window.PSGNetlifyIdentity = {
        login: async () => ({}), logout: async () => {}, requestPasswordRecovery: async () => {},
        getUser: async () => ({ id: 'erwin-identity', email: '${profile.email}' })
      };
    `
  }));
  let profileCalls = 0;
  await page.route('**/api/psg/me', route => {
    profileCalls++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: profile }) });
  });

  try {
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.InsuranceHubIdentity?.email === 'erwin.effendi@psg.test');
    await page.waitForFunction(() => !document.getElementById('insuranceAccessGate'));
    await page.waitForFunction(() => document.getElementById('sambutanAgen')?.innerText.includes('Erwin Effendi'));

    const state = await page.evaluate(() => {
      const read = key => localStorage.getItem(key);
      return {
        identity: window.InsuranceHubIdentity,
        level: window.InsuranceHubLevel,
        welcome: document.getElementById('sambutanAgen')?.innerText || '',
        sidebar: document.getElementById('psgSideAgen')?.innerText || '',
        welcomeHasImage: !!document.querySelector('#sambutanAgen img'),
        sidebarHasImage: !!document.querySelector('#psgSideAgen img'),
        currentPhotoKey: window.InsuranceHubCurrentPhotoKey?.(),
        legacyPhoto: read('insuranceHub.agen.foto.v1'),
        customer: read('insuranceHub.customerProfiles.v1'),
        library: read('insuranceHub.libraryIlustrasi.v1'),
        calculator: read('insuranceHub.isianTerakhir.v1'),
        localAgent: JSON.parse(read('insuranceHub.agen.v1') || '{}'),
        localLevel: JSON.parse(read('insuranceHub.level.v1') || '{}')
      };
    });
    check(profileCalls >= 1, '/api/psg/me tetap diperiksa walau sesi kode akses lama sebelumnya membuka gate', profileCalls);
    check(state.identity?.source === 'server:/api/psg/me' && state.identity?.email === profile.email, 'Identity runtime berasal dari profile server');
    check(state.welcome.includes('Erwin Effendi') && state.sidebar.includes('Erwin Effendi'), 'Welcome dan dashboard menampilkan Erwin Effendi');
    check(state.welcome.includes('68073640'), 'Welcome/dashboard menampilkan kode agen server');
    check(state.welcome.includes('Business Director (BD)') && state.sidebar.includes('Business Director (BD)'), 'Welcome dan dashboard menampilkan Business Director (BD)');
    check(state.sidebar.includes('Erwin Effendi'), 'kartu navigasi dashboard juga memakai nama server');
    check(JSON.stringify(state.identity.roles) === JSON.stringify(profile.roles) && state.identity.status === profile.status,
      'role dan status runtime sama dengan profile /api/psg/me', state.identity);
    check(!/PSG TEAM|68000001|Financial Consultant \(FC\)/.test(state.welcome + ' ' + state.sidebar), 'profile demo lama tidak tampil pada Welcome/dashboard');
    check(!state.welcomeHasImage && !state.sidebarHasImage && state.currentPhotoKey === 'insuranceHub.agen.foto.identity.v1.erwin.effendi%40psg.test',
      'foto global demo tidak dipakai oleh akun Identity; key foto terpisah berdasarkan email', state);
    check(state.legacyPhoto === stalePhoto, 'foto legacy dipertahankan tanpa dipakai oleh akun Identity');
    check(state.localAgent.nama === 'PSG TEAM' && state.localAgent.kode === '68000001' && state.localLevel.namaAgen === 'PSG TEAM',
      'rekaman identitas demo lokal tidak ditimpa sebagai bagian dari autentikasi');
    check(state.customer === preserved.customer && state.library === preserved.library && state.calculator === preserved.calculator,
      'data Customer, Library, dan kalkulator tetap utuh');

    const welcomeModal = await page.evaluate(() => {
      const old = document.createElement('div'); old.id = 'insuranceWelcome'; old.textContent = 'PSG TEAM'; document.body.appendChild(old);
      window.dispatchEvent(new Event('psg:identity-ready'));
      return { text: document.getElementById('insuranceWelcome')?.innerText || '',
        hasImage: !!document.querySelector('#insuranceWelcomeAvatar img') };
    });
    check(welcomeModal.text.includes('Erwin Effendi') && welcomeModal.text.includes('68073640') &&
      welcomeModal.text.includes('Business Director') && !welcomeModal.text.includes('PSG TEAM') && !welcomeModal.hasImage,
      'welcome modal lama diperbarui dari profile Identity saat psg:identity-ready');

    const identityPhoto = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221%22%20height=%221%22/%3E';
    const ownPhoto = await page.evaluate(photo => {
      const key = window.InsuranceHubIdentityPhotoKey(window.InsuranceHubIdentity.email);
      localStorage.setItem(key, photo);
      window.InsuranceHubUmum.segarkan();
      return { key, welcome: document.querySelector('#sambutanAgen img')?.getAttribute('src') || '',
        legacy: localStorage.getItem('insuranceHub.agen.foto.v1') };
    }, identityPhoto);
    check(ownPhoto.key === state.currentPhotoKey && ownPhoto.welcome === identityPhoto, 'dashboard uses only the photo assigned to this Identity email');
    check(ownPhoto.legacy === stalePhoto, 'saving the Identity-specific photo leaves the old demo photo unchanged');
    check(errors.length === 0, 'tidak ada JavaScript error', errors);
  } finally {
    await context.close();
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log('\n' + (failures.length ? 'FAIL' : 'PASS') + ': ' + (checks - failures.length) + '/' + checks + ' checks');
  if (failures.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); try { server.close(); } catch (_) {} process.exitCode = 1; });
