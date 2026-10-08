#!/usr/bin/env node
/* Test terarah callback Netlify Identity: undangan (Buat Password), atur
   ulang password, dan login kode akses lama yang tetap berjalan.

   node tests/identity-invite.test.js [--browser <chromium-or-edge-exe>] [--root <dir>]

   Endpoint /.netlify/identity/* ditiru lewat Playwright (Identity tidak bisa
   dijalankan lokal). Playwright opsional: exit 2 bila tidak tersedia. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { sourceHash } = require('./lib/snapshot');

function loadPlaywright() {
  const tries = ['playwright'];
  if (process.env.NODE_PATH) tries.push(path.join(process.env.NODE_PATH, 'playwright'));
  for (const p of tries) { try { return require(p); } catch (_) {} }
  console.log('Playwright tidak tersedia — test targeted dilewati.');
  process.exit(2);
}
const { chromium } = loadPlaywright();
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const ROOT = path.resolve(option('--root') || path.join(__dirname, '..'));
const browserExe = option('--browser') || undefined;
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', webp: 'image/webp',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
let gagal = 0, jumlah = 0;
function cek(ok, pesan, detail) {
  jumlah++;
  console.log((ok ? '  OK    ' : '  GAGAL ') + pesan + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) gagal++;
}
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(ROOT, '.' + rel);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}

const TOKEN_UNDANGAN = 'TOKEN-UNDANGAN-123';
const TOKEN_RECOVERY = 'TOKEN-RECOVERY-456';
const ACCESS = 'JWT-RAHASIA-ACCESS';
const REFRESH = 'REFRESH-RAHASIA';
const PASSWORD = 'RahasiaBaru#2026';
const EMAIL = 'agen.baru@psg.test';
/* Hash kode akses FC di access-gate.js; digest dipalsukan untuk kode uji
   seperti tests/contract-browser.test.js. */
const FC_HASH = '9e8209fdd3b744bec823f769d4f920104a976b15891718b2d7d5f63b00fe9afa';
const DATA_LAMA = {
  'insuranceHub.customerProfiles.v1': JSON.stringify([{ id: 'p1', nama: 'Nasabah Uji' }]),
  'insuranceHub.libraryIlustrasi.v1': JSON.stringify([{ id: 'l1', judul: 'Ilustrasi Uji' }]),
  'insuranceHub.agen.v1': JSON.stringify({ nama: 'Agen Lama', kode: 'A001', hp: '0812' }),
};

/* Server Identity tiruan. Mencatat setiap permintaan untuk diperiksa. */
async function pasangIdentityTiruan(ctx, log) {
  await ctx.route('**/.netlify/identity/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/\.netlify\/identity/, '');
    let body = null;
    try { body = req.postData() ? JSON.parse(req.postData()) : null; } catch (_) {}
    log.push({ method: req.method(), path: p, body, auth: req.headers()['authorization'] || '' });
    const json = (status, obj) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(obj) });
    const tokenOk = { access_token: ACCESS, token_type: 'bearer', expires_in: 3600, refresh_token: REFRESH };
    const user = { id: '0d6f8c1e-1111-4222-8333-944455556666', email: EMAIL, aud: '', role: '',
      app_metadata: { provider: 'email' }, user_metadata: {}, confirmed_at: '2026-10-07T00:00:00Z',
      created_at: '2026-10-07T00:00:00Z', updated_at: '2026-10-07T00:00:00Z' };
    if (req.method() === 'POST' && p === '/verify') {
      if (body && body.type === 'signup' && body.token === TOKEN_UNDANGAN && body.password) return json(200, tokenOk);
      if (body && body.type === 'recovery' && body.token === TOKEN_RECOVERY) return json(200, tokenOk);
      return json(422, { code: 422, msg: 'Verify requires a verification type' });
    }
    if (req.method() === 'GET' && p === '/user') return json(200, user);
    if (req.method() === 'PUT' && p === '/user') return json(200, user);
    return json(404, { code: 404, msg: 'Not found' });
  });
}

async function bukaKonteks(br, opsi) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(({ FC_HASH, data, ingat }) => {
    if (!sessionStorage.getItem('__uji_awal')) {
      sessionStorage.setItem('__uji_awal', '1');
      Object.keys(data).forEach((k) => localStorage.setItem(k, data[k]));
      if (ingat) localStorage.setItem('insuranceHub.access.remember.v3', 'ok');
    }
    const asli = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = function (alg, d) {
      try {
        if (new TextDecoder().decode(d) === 'uji-kontrak-fc') {
          const b = new Uint8Array(32);
          for (let i = 0; i < 32; i++) b[i] = parseInt(FC_HASH.substr(i * 2, 2), 16);
          return Promise.resolve(b.buffer);
        }
      } catch (_) {}
      return asli(alg, d);
    };
  }, { FC_HASH, data: DATA_LAMA, ingat: !!(opsi && opsi.ingat) });
  const log = [];
  await pasangIdentityTiruan(ctx, log);
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, pg, log, errors };
}

/* Keadaan halaman: kartu Identity, layar masuk lama, dan penyimpanan. */
const keadaan = (pg) => pg.evaluate(() => {
  const k = document.getElementById('psgIdentityGate');
  const g = document.getElementById('insuranceAccessGate');
  let atas = null;
  if (k) {
    const r = k.querySelector('.insurance-access-card').getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + 20);
    atas = !!(el && el.closest('#psgIdentityGate'));
  }
  const ls = {}, ss = {};
  for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); ls[key] = localStorage.getItem(key); }
  for (let i = 0; i < sessionStorage.length; i++) { const key = sessionStorage.key(i); ss[key] = sessionStorage.getItem(key); }
  return {
    kartu: !!k, kartuTerlihat: !!k && getComputedStyle(k).visibility === 'visible' && k.getBoundingClientRect().height > 0,
    kartuDiAtas: atas, judul: k ? (k.querySelector('h1') || {}).textContent : null,
    galat: k && k.querySelector('#psgIdentityError') ? k.querySelector('#psgIdentityError').textContent : null,
    teksKartu: k ? k.textContent.replace(/\s+/g, ' ').trim() : '',
    gateLama: !!g, terkunci: document.documentElement.classList.contains('insurance-auth-locked'),
    href: location.href, html: document.documentElement.outerHTML, ls, ss, cookie: document.cookie,
  };
});

async function isiPassword(pg, a, b) {
  await pg.fill('#psgIdentityGate #psgIdentityPassword', a);
  await pg.fill('#psgIdentityGate #psgIdentityPassword2', b);
  await pg.click('#psgIdentityGate #psgIdentitySimpan');
  await pg.waitForTimeout(300);
}

async function loginLama(pg) {
  const toggle = pg.locator('#psgIdentityLegacyToggle');
  if (await toggle.isVisible()) await toggle.click();
  await pg.waitForSelector('#insuranceAccessCode', { timeout: 10000 });
  await pg.fill('#insuranceAgenNama', 'Agen Uji');
  await pg.fill('#insuranceAgenKode', 'A001');
  await pg.fill('#insuranceAccessCode', 'uji-kontrak-fc');
  await pg.click('#psgIdentityLegacyWrap .insurance-access-btn');
  await pg.waitForTimeout(500);
  return pg.evaluate(() => ({ gate: !!document.getElementById('insuranceAccessGate'),
    terkunci: document.documentElement.classList.contains('insurance-auth-locked'),
    level: (JSON.parse(localStorage.getItem('insuranceHub.level.v1') || '{}')).level,
    ingat: localStorage.getItem('insuranceHub.access.remember.v3') }));
}

const RAHASIA = [ACCESS, REFRESH, PASSWORD, TOKEN_UNDANGAN, TOKEN_RECOVERY];
function bocorDi(teks) { return RAHASIA.filter((r) => String(teks).includes(r)); }
/* Kunci yang boleh memuat token: hanya sesi milik pustaka (gotrue-js). */
function penyimpananAman(st) {
  const masalah = [];
  Object.entries(st.ls).forEach(([k, v]) => {
    if (String(v).includes(PASSWORD)) masalah.push('password di localStorage: ' + k);
    if (k !== 'gotrue.user' && bocorDi(v).length) masalah.push('token di localStorage: ' + k);
  });
  Object.entries(st.ss).forEach(([k, v]) => { if (bocorDi(v).length) masalah.push('rahasia di sessionStorage: ' + k); });
  if (bocorDi(st.cookie).length && st.cookie.includes(PASSWORD)) masalah.push('password di cookie');
  return masalah;
}
function dataLamaUtuh(st) {
  return Object.keys(DATA_LAMA).every((k) => st.ls[k] === DATA_LAMA[k]);
}

(async () => {
  console.log('[S] Statis');
  const html = baca('index.html');
  const skrip = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g), (m) => m[1]);
  const indexScript = (name) => skrip.findIndex(src => src.split('?')[0] === name);
  const iVendor = indexScript('src/vendor/netlify-identity.js');
  const iLogin = indexScript('src/identity-login.js');
  const iManagement = indexScript('src/agent-management.js');
  const iCallback = indexScript('src/identity-callback.js');
  cek(iVendor >= 0 && iLogin > iVendor && iManagement > iLogin && iCallback > iManagement && skrip.indexOf('src/access-gate.js') < iVendor,
    'index.html: Identity vendor, login, management, dan callback sesudah access-gate.js', { iVendor, iLogin, iManagement, iCallback });
  cek(iCallback === skrip.length - 1, 'index.html: identity-callback.js skrip terakhir (sesudah skrip baseline)');
  cek(html.includes('<link rel="stylesheet" href="src/identity-callback.css">'), 'index.html: identity-callback.css dimuat');
  for (const f of ['program-summary.html', 'comparison-summary.html']) {
    cek(!baca(f).includes('identity-callback'), f + ': tidak memuat callback (tautan email selalu ke halaman utama)');
  }
  const cb = baca('src/identity-callback.js');
  const kode = cb.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  cek(/lib\.handleAuthCallback\(\)/.test(kode), 'identity-callback.js memanggil handleAuthCallback()');
  cek(/lib\.acceptInvite\(token, password\)/.test(kode) && /lib\.updateUser\(\{ password: password \}\)/.test(kode),
    'password dikirim hanya lewat API resmi acceptInvite / updateUser');
  cek(!/localStorage|sessionStorage|document\.cookie|indexedDB/.test(kode), 'identity-callback.js tidak menyimpan apa pun ke storage/cookie');
  cek(!/console\.|alert\(/.test(kode), 'identity-callback.js tidak mencetak token/password ke console');
  cek(!/insuranceHub\.access|InsuranceHubLevel|insurance-auth-locked['"]?\)?\s*\.remove|classList\.remove/.test(kode),
    'identity-callback.js tidak membuka gerbang login lama');
  const vendor = baca('src/vendor/netlify-identity.js');
  const lock = JSON.parse(baca('package-lock.json')).packages;
  const vId = lock['node_modules/@netlify/identity'].version, vGt = lock['node_modules/gotrue-js'].version;
  cek(vendor.startsWith('/* @netlify/identity ' + vId + ' + gotrue-js ' + vGt + ' '),
    'bundel vendor sesuai versi package-lock (@netlify/identity ' + vId + ', gotrue-js ' + vGt + ')');
  cek(!/https?:\/\/(cdn|unpkg|jsdelivr|esm\.sh)/i.test(vendor + cb), 'tanpa CDN eksternal');
  const hashGate = sourceHash(ROOT, 'src/access-gate.js');
  cek(hashGate === JSON.parse(baca('tests/contract-baseline.json')).static.protectedFiles['src/access-gate.js'],
    'src/access-gate.js (login lama) identik dengan baseline');

  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await chromium.launch({ executablePath: browserExe });

  console.log('[A] Tanpa token di alamat');
  {
    const { ctx, pg, log, errors } = await bukaKonteks(br);
    await pg.goto(base);
    await pg.waitForSelector('#insuranceAccessGate');
    await pg.waitForTimeout(400);
    const st = await keadaan(pg);
    const api = await pg.evaluate(() => ['handleAuthCallback', 'acceptInvite', 'updateUser']
      .map((n) => typeof (window.PSGNetlifyIdentity || {})[n]));
    cek(api.every((t) => t === 'function'), 'window.PSGNetlifyIdentity menyediakan handleAuthCallback/acceptInvite/updateUser', api);
    cek(!st.kartu && st.gateLama && st.terkunci && log.length === 0,
      'tanpa token: tidak ada kartu Identity, tidak ada permintaan Identity, layar masuk lama tampil', { kartu: st.kartu, log });
    const lama = await loginLama(pg);
    cek(!lama.gate && !lama.terkunci && lama.level === 'FC' && lama.ingat === 'ok', 'login kode akses lama tetap berhasil', lama);
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  console.log('[B] Undangan → Buat Password');
  {
    const { ctx, pg, log, errors } = await bukaKonteks(br);
    await pg.goto(base + '#invite_token=' + TOKEN_UNDANGAN);
    await pg.waitForSelector('#psgIdentityGate #psgIdentityPassword', { timeout: 10000 });
    let st = await keadaan(pg);
    cek(st.kartuTerlihat && st.kartuDiAtas && /Buat Password/.test(st.judul),
      'kartu "Buat Password" tampil di atas layar masuk lama', { judul: st.judul, kartuDiAtas: st.kartuDiAtas });
    cek(st.gateLama && st.terkunci, 'aplikasi tetap terkunci oleh login lama (token tidak membuka aplikasi)');
    cek(!st.href.includes('#') && !bocorDi(st.href).length, 'token dihapus dari alamat (hash dibersihkan)', st.href);
    cek(log.length === 0, 'belum ada permintaan ke Identity sebelum password diisi', log);

    await pg.evaluate(() => {
      document.querySelector('#psgIdentityGate form').addEventListener('submit', (event) => {
        window.__inviteSubmitAudit = { defaultPrevented: event.defaultPrevented, form: event.currentTarget.outerHTML };
      });
    });

    await isiPassword(pg, 'pendek', 'pendek');
    st = await keadaan(pg);
    const submitPrevented = await pg.evaluate(() => window.__inviteSubmitAudit?.defaultPrevented === true);
    cek(submitPrevented && /minimal 8/.test(st.galat) && log.length === 0,
      'password < 8 karakter dicegah callback tanpa permintaan Identity', { prevented: submitPrevented, galat: st.galat });
    await isiPassword(pg, PASSWORD, PASSWORD + 'x');
    st = await keadaan(pg);
    cek(/tidak sama/.test(st.galat) && log.length === 0, 'konfirmasi berbeda ditolak tanpa permintaan', st.galat);

    await isiPassword(pg, PASSWORD, PASSWORD);
    await pg.waitForSelector('#psgIdentityLanjut', { timeout: 10000 });
    st = await keadaan(pg);
    const verify = log.filter((r) => r.method === 'POST' && r.path === '/verify');
    cek(verify.length === 1 && verify[0].body.type === 'signup' && verify[0].body.token === TOKEN_UNDANGAN &&
      verify[0].body.password === PASSWORD, 'acceptInvite: satu POST /verify {token, password, type: signup}',
    verify.map((r) => ({ type: r.body && r.body.type })));
    cek(/Password tersimpan/.test(st.judul) && st.teksKartu.includes(EMAIL) && /kode akses/.test(st.teksKartu),
      'sukses: email akun tampil, agen diberi tahu login kode akses masih dipakai', st.teksKartu);
    cek(!bocorDi(st.html).length, 'token/password tidak muncul di DOM', bocorDi(st.html));
    cek(!penyimpananAman(st).length, 'password tidak disimpan; token hanya di sesi milik pustaka (gotrue.user)', penyimpananAman(st));
    cek(dataLamaUtuh(st), 'data lama (nasabah, Library, agen) tidak berubah');
    cek(!('insuranceHub.access.remember.v3' in st.ls) && !('insuranceHub.access.v3' in st.ss) && !('insuranceHub.level.v1' in st.ls),
      'tidak ada otorisasi/level login lama yang dibuat');

    await pg.click('#psgIdentityLanjut');
    await pg.waitForTimeout(200);
    st = await keadaan(pg);
    cek(!st.kartu && st.gateLama && st.terkunci, 'LANJUT: kartu ditutup, aplikasi tetap di layar masuk lama (tanpa bypass)');
    const lama = await loginLama(pg);
    cek(!lama.gate && !lama.terkunci && lama.level === 'FC', 'sesudah undangan, login kode akses lama tetap berhasil', lama);
    /* Login lama memang menulis ulang nama/kode di insuranceHub.agen.v1 dari
       isian formulirnya; data nasabah dan Library harus tetap utuh. */
    const stLama = await keadaan(pg);
    cek(['insuranceHub.customerProfiles.v1', 'insuranceHub.libraryIlustrasi.v1'].every((k) => stLama.ls[k] === DATA_LAMA[k]),
      'data nasabah & Library tetap utuh sesudah login lama');
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  console.log('[C] Undangan kedaluwarsa / tidak valid');
  {
    const { ctx, pg, log, errors } = await bukaKonteks(br);
    await pg.goto(base + '#invite_token=SUDAH-DIPAKAI');
    await pg.waitForSelector('#psgIdentityGate #psgIdentityPassword', { timeout: 10000 });
    await isiPassword(pg, PASSWORD, PASSWORD);
    await pg.waitForTimeout(400);
    const st = await keadaan(pg);
    cek(/kedaluwarsa/.test(st.galat) && st.kartu && log.filter((r) => r.path === '/verify').length === 1,
      'token ditolak server: pesan jelas, formulir tetap terbuka', st.galat);
    cek(st.gateLama && st.terkunci && !('gotrue.user' in st.ls) && !penyimpananAman(st).length,
      'gagal: tidak ada sesi, aplikasi tetap terkunci, tidak ada password tersimpan');
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  console.log('[D] Atur ulang password (recovery)');
  {
    const { ctx, pg, log, errors } = await bukaKonteks(br);
    await pg.goto(base + '#recovery_token=' + TOKEN_RECOVERY);
    await pg.waitForSelector('#psgIdentityGate #psgIdentityPassword', { timeout: 10000 });
    let st = await keadaan(pg);
    cek(/Password Baru/.test(st.judul) && !st.href.includes('#') && st.terkunci,
      'recovery: kartu "Password Baru", hash dibersihkan, aplikasi tetap terkunci', st.judul);
    await isiPassword(pg, PASSWORD, PASSWORD);
    await pg.waitForSelector('#psgIdentityLanjut', { timeout: 10000 });
    st = await keadaan(pg);
    const put = log.filter((r) => r.method === 'PUT' && r.path === '/user');
    cek(put.length === 1 && put[0].body.password === PASSWORD && /^Bearer /.test(put[0].auth),
      'updateUser: satu PUT /user {password} dengan sesi recovery', put.length);
    cek(/Password tersimpan/.test(st.judul) && !bocorDi(st.html).length && !penyimpananAman(st).length,
      'sukses tanpa token/password di DOM maupun storage buatan sendiri');
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  console.log('[E] Perangkat yang sudah "diingat" (login lama aktif)');
  {
    const { ctx, pg, errors } = await bukaKonteks(br, { ingat: true });
    await pg.goto(base + '#invite_token=' + TOKEN_UNDANGAN);
    await pg.waitForSelector('#psgIdentityGate #psgIdentityPassword', { timeout: 10000 });
    let st = await keadaan(pg);
    cek(st.kartuTerlihat && st.kartuDiAtas && !st.gateLama && !st.terkunci,
      'kartu undangan tampil di atas aplikasi yang sudah terbuka oleh login lama');
    await isiPassword(pg, PASSWORD, PASSWORD);
    await pg.waitForSelector('#psgIdentityLanjut', { timeout: 10000 });
    await pg.click('#psgIdentityLanjut');
    await pg.waitForTimeout(200);
    st = await keadaan(pg);
    cek(!st.kartu && !st.gateLama && !st.terkunci && st.ls['insuranceHub.access.remember.v3'] === 'ok' && dataLamaUtuh(st),
      'sesudah LANJUT: aplikasi tetap terbuka seperti sebelumnya, otorisasi & data lama utuh');
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  console.log('[F] Tautan konfirmasi tidak valid');
  {
    const { ctx, pg, errors } = await bukaKonteks(br);
    await pg.goto(base + '#confirmation_token=SALAH');
    await pg.waitForSelector('#psgIdentityLanjut', { timeout: 10000 });
    const st = await keadaan(pg);
    cek(/tidak dapat dipakai/.test(st.judul) && st.gateLama && st.terkunci && !('gotrue.user' in st.ls),
      'callback gagal: pesan jelas, tanpa sesi, aplikasi tetap terkunci', st.judul);
    await pg.click('#psgIdentityLanjut');
    cek(!(await keadaan(pg)).kartu, 'TUTUP menutup kartu');
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  await br.close(); srv.close();
  console.log(gagal ? 'HASIL: GAGAL (' + gagal + ' dari ' + jumlah + ')' : 'HASIL: SEMUA LULUS (' + jumlah + ' cek)');
  process.exit(gagal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
