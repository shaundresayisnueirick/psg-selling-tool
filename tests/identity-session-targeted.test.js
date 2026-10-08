#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadPlaywright() {
  const paths = ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')];
  for (const item of paths) { try { return require(item); } catch (_) {} }
  console.error('Playwright tidak tersedia; Identity session test tidak dijalankan.');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const types = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json' };
const server = http.createServer((req, res) => {
  let name = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'content-type': types[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

const profile = { id: 'identity-1', email: 'budi@psg.test', nama: 'Budi Server', kodeAgen: 'BM2048', level: 'BM',
  roles: ['psg_admin'], status: 'aktif', emailTerkonfirmasi: true };

async function main() {
  const { chromium } = loadPlaywright();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browserExe = process.argv.find((arg, i, all) => all[i - 1] === '--browser');
  const browser = await chromium.launch(browserExe ? { executablePath: browserExe } : {});
  let checks = 0;
  const fails = [];
  const check = (condition, label) => { checks++; console.log((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) fails.push(label); };

  async function openCase({ failFirstProfile = false, identityUser = true, profileOverride = profile } = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    let profileCalls = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('insuranceHub.level.v1', JSON.stringify({ level: 'FC', namaAgen: 'Demo Lama', kodeAgen: '1111111' }));
      localStorage.setItem('insuranceHub.agen.v1', JSON.stringify({ nama: 'Demo Lama', kode: '1111111', hp: '0812000000' }));
      window.__psgIdentityFixture = { profileCalls: 0 };
    });
    await page.route('**/src/vendor/netlify-identity.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
      window.PSGNetlifyIdentity = {
        login: async (email, password) => { window.__psgIdentityFixture.login = { email, password }; return {}; },
        logout: async () => { window.__psgIdentityFixture.loggedOut = true; },
        requestPasswordRecovery: async () => {},
        getUser: async () => { await new Promise(r => setTimeout(r, 1000)); return ${identityUser ? "{ id: 'identity-1', email: 'budi@psg.test' }" : 'null'}; }
      };
    ` }));
    await page.route('**/api/psg/me', async route => {
      const calls = ++profileCalls;
      await new Promise(resolve => setTimeout(resolve, 250));
      if (failFirstProfile && calls === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'temporarily_unavailable' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: profileOverride }) });
    });
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    return { context, page, errors };
  }

  try {
    console.log('[1] Restore sesi + profile server mengalahkan data lokal');
    {
      const { context, page, errors } = await openCase();
      await page.waitForSelector('#psgIdentityRestoreStatus:not([hidden])');
      await page.waitForTimeout(120);
      check((await page.locator('#psgIdentityRestoreStatus').innerText()).includes('Memulihkan sesi'), 'status pemulihan terlihat selama validasi');
      check(!(await page.locator('#psgIdentityForm').isVisible()), 'form login tidak berkedip selama sesi dipulihkan');
      await page.waitForFunction(() => !document.getElementById('insuranceAccessGate'));
      await page.waitForFunction(() => [...document.querySelectorAll('.psg-admin-only[data-psg-nav="manajemen"]')].some(node => !node.hidden));
      const result = await page.evaluate(() => ({
        identity: window.InsuranceHubIdentity,
        level: window.InsuranceHubLevel,
        storedLevel: JSON.parse(localStorage.getItem('insuranceHub.level.v1')),
        storedAgent: JSON.parse(localStorage.getItem('insuranceHub.agen.v1')),
        welcome: document.getElementById('sambutanAgen')?.innerText || '',
        sidebar: document.getElementById('psgSideAgen')?.innerText || '',
        inviteVisible: [...document.querySelectorAll('.psg-admin-only[data-psg-nav="manajemen"]')].some(node => !node.hidden)
      }));
      check(result.identity?.email === profile.email && result.identity?.nama === profile.nama, 'InsuranceHubIdentity menerima profil /api/psg/me');
      check(result.level?.namaAgen === profile.nama && result.level?.kodeAgen === profile.kodeAgen && result.level?.level === profile.level, 'InsuranceHubLevel mengikuti profil server');
      check(result.storedLevel.namaAgen === 'Demo Lama' && result.storedAgent.kode === '1111111', 'data profil lokal lama tidak ditimpa atau dijadikan sumber tampilan');
      check(result.welcome.includes('Budi Server') && result.welcome.includes('BM2048'), 'Welcome/dashboard menampilkan nama dan kode server');
      check(result.sidebar.includes('Budi Server') && result.sidebar.includes('Business Manager (BM)'), 'kartu agen navigasi menampilkan identitas server');
      check(result.inviteVisible, 'menu Invite Agen muncul dari role psg_admin server');
      check(errors.length === 0, 'restore tanpa JavaScript error');
      await context.close();
    }

    console.log('[2] Gangguan API sementara tidak berubah menjadi layar login');
    {
      const { context, page, errors } = await openCase({ failFirstProfile: true });
      await page.waitForSelector('#psgIdentityRestoreStatus:not([hidden])');
      await page.waitForFunction(() => document.getElementById('psgIdentityRestoreStatus')?.classList.contains('psg-identity-restore-error'), null, { timeout: 5000 });
      check(!(await page.locator('#psgIdentityForm').isVisible()), 'kegagalan sementara mempertahankan status pemeriksaan, bukan menampilkan login');
      await page.getByRole('button', { name: 'Coba lagi' }).click();
      await page.waitForFunction(() => !document.getElementById('insuranceAccessGate'), null, { timeout: 5000 });
      check(await page.evaluate(() => window.InsuranceHubIdentity?.email) === profile.email, 'retry memulihkan sesi setelah API kembali tersedia');
      check(errors.length === 0, 'retry tanpa JavaScript error');
      await context.close();
    }

    console.log('[3] Sesi Identity invalid tidak diizinkan masuk');
    {
      const { context, page, errors } = await openCase({ identityUser: false });
      await page.waitForSelector('#psgIdentityForm:not([hidden])');
      check(await page.locator('#insuranceAccessGate').count() === 1, 'gate tetap terkunci saat sesi Identity tidak valid');
      check(await page.evaluate(() => !window.InsuranceHubIdentity), 'profil lokal lama tidak menjadi authorization');
      check(errors.length === 0, 'sesi invalid tanpa JavaScript error');
      await context.close();
    }

    console.log('[4] Profile nonaktif tidak diizinkan masuk');
    {
      const { context, page, errors } = await openCase({ profileOverride: { ...profile, status: 'nonaktif' } });
      await page.waitForSelector('#psgIdentityForm:not([hidden])');
      check(await page.locator('#insuranceAccessGate').count() === 1, 'gate tetap terkunci saat server menyatakan nonaktif');
      check(await page.evaluate(() => window.__psgIdentityFixture.loggedOut === true && !window.InsuranceHubIdentity),
        'sesi nonaktif dicabut; localStorage lama tidak memulihkan akses');
      check(errors.length === 0, 'profile nonaktif tanpa JavaScript error');
      await context.close();
    }

    console.log('[5] Perubahan role/level di server langsung tercermin');
    {
      const changed = { ...profile, roles: [], level: 'FC' };
      const { context, page, errors } = await openCase({ profileOverride: changed });
      await page.waitForFunction(() => !document.getElementById('insuranceAccessGate'));
      const current = await page.evaluate(() => ({ identity: window.InsuranceHubIdentity, level: window.InsuranceHubLevel,
        inviteVisible: [...document.querySelectorAll('.psg-admin-only[data-psg-nav="manajemen"]')].some(node => !node.hidden) }));
      check(current.identity?.roles?.length === 0 && current.level?.level === 'FC', 'role dan level mengikuti data server terbaru');
      check(!current.inviteVisible, 'menu Invite Agen hilang setelah role admin dicabut di server');
      check(errors.length === 0, 'perubahan role tanpa JavaScript error');
      await context.close();
    }

    console.log('[6] Login email memuat profile dari /api/psg/me');
    {
      const { context, page, errors } = await openCase({ identityUser: false });
      await page.waitForSelector('#psgIdentityForm:not([hidden])');
      await page.fill('#psgIdentityEmail', 'budi@psg.test');
      await page.fill('#psgIdentityPassword', 'password-uji');
      await page.click('#psgIdentityMasuk');
      await page.waitForFunction(() => !document.getElementById('insuranceAccessGate'));
      const result = await page.evaluate(() => ({
        login: window.__psgIdentityFixture.login,
        identity: window.InsuranceHubIdentity,
        level: window.InsuranceHubLevel,
        welcome: document.getElementById('sambutanAgen')?.innerText || '',
        sidebar: document.getElementById('psgSideAgen')?.innerText || '',
        local: JSON.parse(localStorage.getItem('insuranceHub.agen.v1') || '{}'),
      }));
      check(result.login?.email === profile.email && result.login?.password === 'password-uji', 'form login memakai email/password yang diinput');
      check(result.identity?.email === profile.email && result.identity?.nama === profile.nama && result.identity?.kodeAgen === profile.kodeAgen,
        'login mengambil identitas dari /api/psg/me');
      check(result.level?.level === profile.level && result.level?.namaAgen === profile.nama, 'InsuranceHubLevel mengikuti profile server');
      check(result.welcome.includes(profile.nama) && result.welcome.includes(profile.kodeAgen) && result.sidebar.includes(profile.nama),
        'Welcome dan Dashboard mengikuti profile server');
      check(result.local.nama === 'Demo Lama' && result.local.kode === '1111111', 'localStorage demo tetap bukan source of truth');
      check(errors.length === 0, 'login email dan profile server tanpa JavaScript error');
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log('\n' + (fails.length ? 'FAIL' : 'PASS') + ': ' + (checks - fails.length) + '/' + checks + ' checks');
  if (fails.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); try { server.close(); } catch (_) {} process.exitCode = 1; });
