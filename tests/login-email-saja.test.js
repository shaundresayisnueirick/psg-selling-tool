#!/usr/bin/env node
/* Login email saja (invite-only) dan detail daftar undangan — PR #35.

     node tests/login-email-saja.test.js [--root <dir>] [--browser <exe>]

   1. Login kode akses lama ditolak: tidak ada formulir kode; penanda perangkat
      lama (insuranceHub.access.*) tidak membuka index.html maupun halaman
      ringkasan, dan penanda itu dicabut tanpa menghapus data kerja.
   2. Login email akun yang diundang tetap membuka aplikasi.
   3. Akun tanpa hak PSG / nonaktif / sesi yang ditolak server tetap terkunci.
   4–6. Manajemen Agen di browser memakai logika server asli
      (netlify/lib/psg-agents.mts) dengan Identity tiruan: lima akun yang
      ditunjuk melihat detail undangan; admin lain hanya total/aktif/nonaktif
      dan tidak menerima data per orang, termasuk lewat permintaan langsung.

   @netlify/identity dan /api/psg/me ditiru lewat Playwright (Identity tidak
   bisa dijalankan lokal). Playwright opsional: exit 2 bila tidak tersedia. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');

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
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', webp: 'image/webp', mp3: 'audio/mpeg',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webmanifest: 'application/manifest+json' };
let gagal = 0, jumlah = 0;
function cek(ok, pesan, detail) {
  jumlah++;
  console.log((ok ? '  OK    ' : '  GAGAL ') + pesan + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) gagal++;
}
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

/* Data kerja lama yang tidak boleh terhapus saat penanda login lama dicabut. */
const DATA_LAMA = {
  'insuranceHub.customerProfiles.v1': JSON.stringify([{ id: 'p1', nama: 'Nasabah Uji' }]),
  'insuranceHub.level.v1': JSON.stringify({ level: 'BD', nama: 'Business Director', namaAgen: 'Agen Lama', kodeAgen: 'L001' }),
  'insuranceHub.agen.v1': JSON.stringify({ nama: 'Agen Lama', kode: 'L001', hp: '0812' }),
};

/* Akun Identity tiruan (bentuk GoTrue admin API, snake_case). */
const raw = (id, email, app, extra = {}) => ({ id, email, confirmed_at: '2026-10-01T00:00:00Z', invited_at: '2026-09-30T00:00:00Z',
  app_metadata: { provider: 'email', ...app }, user_metadata: { full_name: app.psg ? app.psg.nama : email }, ...extra });
const AKUN = {
  erwin: raw('b1111111-1111-4111-8111-111111111111', 'erwineffendi06@gmail.com', { roles: ['psg_owner'], psg: { nama: 'Erwin Effendi', level: 'BD', status: 'aktif' } }),
  setiawan: raw('b2222222-2222-4222-8222-222222222222', 'askstw.f523@gmail.com', { roles: ['psg_admin'], psg: { nama: 'Setiawan', level: 'BM', status: 'aktif' } }),
  hendra: raw('b3333333-3333-4333-8333-333333333333', 'hendrago.generali@gmail.com', { roles: ['psg_admin'], psg: { nama: 'Hendra Gowanto', level: 'BM', status: 'aktif' } }),
  juliana: raw('b4444444-4444-4444-8444-444444444444', 'julixu.f523@gmail.com', { roles: ['psg_admin'], psg: { nama: 'Juliana', level: 'BM', status: 'aktif' } }),
  elisa: raw('b5555555-5555-4555-8555-555555555555', 'elisawinoto.generali@gmail.com', { roles: ['psg_admin'], psg: { nama: 'Elisa Winoto', level: 'BM', status: 'aktif' } }),
  adminLain: raw('b6666666-6666-4666-8666-666666666666', 'admin.lain@psg.test', { roles: ['psg_admin'], psg: { nama: 'Admin Lain', level: 'BM', status: 'aktif' } }),
  fc: raw('b7777777-7777-4777-8777-777777777777', 'fc.diundang@psg.test', { roles: [], psg: { nama: 'FC Diundang', kodeAgen: 'F1', level: 'FC', status: 'aktif' } }),
  baru: raw('b8888888-8888-4888-8888-888888888888', 'belum.konfirmasi@psg.test', { roles: [], psg: { nama: 'Belum Konfirmasi', level: 'FC', status: 'aktif' } }, { confirmed_at: null }),
  nonaktif: raw('b9999999-9999-4999-8999-999999999999', 'nonaktif@psg.test', { roles: [], psg: { nama: 'Nonaktif', level: 'FC', status: 'nonaktif' } }),
  tanpaHak: raw('c1111111-1111-4111-8111-111111111111', 'tanpa.hak@psg.test', {}),
};
const DIIZINKAN = ['erwin', 'setiawan', 'hendra', 'juliana', 'elisa'];
const TOTAL_PSG = Object.keys(AKUN).length - 1;   // tanpaHak bukan akun PSG
const NONAKTIF = 1;

function gotrue() {
  const users = new Map(Object.values(AKUN).map((u) => [u.id, JSON.parse(JSON.stringify(u))]));
  const json = (status, isi) => new Response(JSON.stringify(isi), { status, headers: { 'content-type': 'application/json' } });
  return async (url, init = {}) => {
    const u = new URL(url), method = (init.method || 'GET').toUpperCase();
    const p = u.pathname.replace(/^\/\.netlify\/identity/, '');
    if (method === 'GET' && p === '/admin/users') {
      const page = Number(u.searchParams.get('page') || 1), per = Number(u.searchParams.get('per_page') || 50);
      return json(200, { users: [...users.values()].slice((page - 1) * per, page * per) });
    }
    const m = p.match(/^\/admin\/users\/([^/]+)$/);
    if (m && method === 'GET') { const t = users.get(decodeURIComponent(m[1])); return t ? json(200, t) : json(404, { msg: 'User not found' }); }
    return json(404, { msg: 'Not found' });
  };
}

let lib, auth;
const profil = (r) => {
  const u = { id: r.id, email: r.email, confirmedAt: r.confirmed_at || undefined, appMetadata: r.app_metadata, userMetadata: r.user_metadata, name: r.user_metadata.full_name };
  return auth.profilAman(u);
};

/* Konteks browser dengan sesi Identity tiruan untuk satu akun (atau tanpa sesi). */
async function konteks(br, opsi = {}) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  const akun = opsi.akun ? AKUN[opsi.akun] : null;
  await ctx.addInitScript(({ data, lama }) => {
    if (!sessionStorage.getItem('__uji_awal')) {
      sessionStorage.setItem('__uji_awal', '1');
      Object.keys(data).forEach((k) => localStorage.setItem(k, data[k]));
      if (lama) { localStorage.setItem('insuranceHub.access.remember.v3', 'ok'); sessionStorage.setItem('insuranceHub.access.v3', 'ok'); }
    }
  }, { data: DATA_LAMA, lama: !!opsi.penandaLama });
  const keadaan = { sesi: opsi.sesiLangsung ? akun : null, login: [] };
  await ctx.exposeBinding('__ujiLogin', (_src, email) => {
    keadaan.login.push(email);
    const cocok = Object.values(AKUN).find((u) => u.email === String(email).trim().toLowerCase());
    keadaan.sesi = cocok || null;
    return !!cocok;
  });
  await ctx.exposeBinding('__ujiSesi', () => (keadaan.sesi ? { id: keadaan.sesi.id, email: keadaan.sesi.email } : null));
  await ctx.exposeBinding('__ujiKeluar', () => { keadaan.sesi = null; });
  await ctx.route('**/src/vendor/netlify-identity.js', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: `
    window.PSGNetlifyIdentity = {
      login: async (email) => { if (!(await window.__ujiLogin(email))) throw new Error('invalid_grant: Email or password invalid'); return {}; },
      logout: async () => { await window.__ujiKeluar(); },
      requestPasswordRecovery: async () => {}, handleAuthCallback: async () => null, acceptInvite: async () => ({}), updateUser: async () => ({}),
      getUser: async () => window.__ujiSesi() };` }));
  await ctx.route('**/api/psg/me', (route) => {
    if (opsi.meStatus) return route.fulfill({ status: opsi.meStatus, contentType: 'application/json', body: '{"authenticated":false}' });
    const s = keadaan.sesi;
    return s ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: profil(s) }) })
      : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ authenticated: false, error: 'unauthenticated' }) });
  });
  /* /api/psg/agents dijawab logika server asli; sesi = akun yang sedang masuk. */
  const g = gotrue();
  await ctx.route('**/api/psg/agents**', async (route) => {
    const rq = route.request();
    const s = keadaan.sesi;
    const req = new Request(rq.url(), { method: rq.method(), headers: rq.headers(), body: /^(GET|HEAD)$/.test(rq.method()) ? undefined : (rq.postData() || '') });
    const r = await lib.tanganiAgents(req, {
      ambilUser: async () => (s ? { id: s.id, email: s.email, appMetadata: s.app_metadata, roles: s.app_metadata.roles || [] } : null),
      identitas: () => ({ url: 'https://psgproducertools.netlify.app/.netlify/identity', token: 'OPERATOR-UJI' }),
      fetch: g,
    });
    const hdr = {}; r.headers.forEach((v, k) => { hdr[k] = v; });
    return route.fulfill({ status: r.status, headers: hdr, body: await r.text() });
  });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e)));
  pg.on('dialog', (d) => d.dismiss());
  return { ctx, pg, keadaan, errors };
}

const status = (pg) => pg.evaluate(() => ({
  gate: !!document.getElementById('insuranceAccessGate'),
  terkunci: document.documentElement.classList.contains('insurance-auth-locked'),
  formKode: !!document.getElementById('insuranceAccessCode') || !!document.getElementById('insuranceAccessForm'),
  tombolLama: !!document.getElementById('psgIdentityLegacyToggle') || /KODE AKSES LAMA/i.test(document.body.innerText),
  formEmail: !!document.getElementById('psgIdentityEmail'),
  ingat: localStorage.getItem('insuranceHub.access.remember.v3'), sesiLama: sessionStorage.getItem('insuranceHub.access.v3'),
  identitas: window.InsuranceHubIdentity ? window.InsuranceHubIdentity.email : null,
  pesan: (document.getElementById('psgIdentityServerError') || document.getElementById('insuranceGateStatus') || {}).textContent || '',
  dataUtuh: ['insuranceHub.customerProfiles.v1', 'insuranceHub.level.v1', 'insuranceHub.agen.v1'].every((k) => localStorage.getItem(k) !== null),
}));

async function main() {
  lib = await import(pathToFileURL(path.join(ROOT, 'netlify/lib/psg-agents.mts')).href);
  auth = await import(pathToFileURL(path.join(ROOT, 'netlify/lib/psg-auth.mts')).href);
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await chromium.launch({ executablePath: browserExe });
  const SUM = { customerName: 'Prospek Uji', targets: { life: 1000000000 }, scenarios: [] };

  console.log('[1] Login kode akses lama ditolak');
  {
    const { ctx, pg, errors } = await konteks(br, { penandaLama: true });
    await pg.goto(base + 'index.html');
    await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 15000 });
    await pg.waitForTimeout(800);
    const st = await status(pg);
    cek(st.gate && st.terkunci && !st.identitas, 'penanda "ingat perangkat" lama tidak membuka index.html', st);
    cek(!st.formKode && !st.tombolLama && st.formEmail, 'tidak ada formulir/tombol kode akses; hanya formulir email', st);
    cek(st.ingat === null && st.sesiLama === null && st.dataUtuh, 'penanda lama dicabut; data kerja (nasabah, level, agen) tetap ada', st);
    const tembus = await pg.evaluate(() => { localStorage.setItem('insuranceHub.access.remember.v3', 'ok'); sessionStorage.setItem('insuranceHub.access.v3', 'ok'); return true; });
    await pg.reload(); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible' }); await pg.waitForTimeout(500);
    const st2 = await status(pg);
    cek(tembus && st2.gate && st2.terkunci, 'menulis ulang penanda lama lalu memuat ulang tetap terkunci', st2);
    for (const hal of ['program-summary.html', 'comparison-summary.html']) {
      await pg.evaluate((s) => { sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify(s)); localStorage.setItem('insuranceHub.access.remember.v3', 'ok'); }, SUM);
      await pg.goto(base + hal);
      await pg.waitForFunction(() => /Sesi login tidak ditemukan/.test((document.getElementById('insuranceGateStatus') || {}).textContent || ''), null, { timeout: 15000 });
      const s = await status(pg);
      cek(s.gate && s.terkunci && !s.formKode && s.ingat === null, hal + ': tanpa sesi Identity tetap terkunci walau ada penanda lama', s);
    }
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  console.log('[2] Login email akun yang diundang');
  {
    const { ctx, pg, keadaan, errors } = await konteks(br, { penandaLama: true });
    await pg.goto(base + 'index.html');
    await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 15000 });
    await pg.fill('#psgIdentityEmail', ' FC.Diundang@psg.test ');
    await pg.fill('#psgIdentityPassword', 'RahasiaUji#2026');
    await pg.click('#psgIdentityMasuk');
    await pg.waitForFunction(() => !document.getElementById('insuranceAccessGate'), null, { timeout: 15000 });
    const st = await status(pg);
    cek(!st.gate && !st.terkunci && st.identitas === 'fc.diundang@psg.test' && keadaan.login.length === 1,
      'login email membuka aplikasi dengan profil dari /api/psg/me', st);
    const lv = await pg.evaluate(() => window.InsuranceHubLevel && window.InsuranceHubLevel.level);
    cek(lv === 'FC', 'jenjang mengikuti profil server (bukan level.v1 lama = BD)', lv);
    await pg.reload();
    await pg.waitForFunction(() => !document.getElementById('insuranceAccessGate') && window.InsuranceHubIdentity, null, { timeout: 15000 });
    cek(true, 'sesi Identity dipulihkan sesudah muat ulang');
    for (const hal of ['program-summary.html', 'comparison-summary.html']) {
      await pg.evaluate((s) => sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify(s)), SUM);
      await pg.goto(base + hal);
      await pg.waitForFunction(() => !document.getElementById('insuranceAccessGate'), null, { timeout: 15000 });
      const s = await status(pg);
      cek(!s.gate && !s.terkunci, hal + ': terbuka untuk sesi Identity yang diakui server', s);
    }
    await pg.goto(base + 'index.html');
    await pg.waitForFunction(() => !document.getElementById('insuranceAccessGate'), null, { timeout: 15000 });
    await pg.evaluate(() => window.insuranceHubLogout());
    await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 15000 });
    const keluar = await status(pg);
    cek(keluar.gate && keluar.terkunci && keluar.dataUtuh, 'logout: kembali ke formulir email, data kerja tetap ada', keluar);
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }

  console.log('[3] Akun yang tidak berhak tidak melewati invite-only');
  {
    const { ctx, pg, errors } = await konteks(br);
    await pg.goto(base + 'index.html');
    await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 15000 });
    await pg.fill('#psgIdentityEmail', 'bukan.undangan@psg.test');
    await pg.fill('#psgIdentityPassword', 'apa saja');
    await pg.click('#psgIdentityMasuk');
    await pg.waitForFunction(() => /tidak benar/.test((document.getElementById('psgIdentityServerError') || {}).textContent || ''), null, { timeout: 15000 });
    let st = await status(pg);
    cek(st.gate && st.terkunci && !st.identitas, 'email yang tidak diundang (tidak ada di Identity): ditolak', st.pesan);
    for (const [akun, pola, judul] of [['tanpaHak', /belum mendapat hak akses PSG/, 'akun Identity tanpa role/jenjang PSG'], ['nonaktif', /nonaktif/, 'akun PSG nonaktif']]) {
      await pg.reload(); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible' });
      await pg.fill('#psgIdentityEmail', AKUN[akun].email);
      await pg.fill('#psgIdentityPassword', 'RahasiaUji#2026');
      await pg.click('#psgIdentityMasuk');
      await pg.waitForFunction((p) => new RegExp(p).test((document.getElementById('psgIdentityServerError') || {}).textContent || ''), pola.source, { timeout: 15000 });
      st = await status(pg);
      cek(st.gate && st.terkunci && !st.identitas, judul + ': tetap terkunci', st.pesan);
    }
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }
  {
    /* Sesi pustaka ada, tetapi server menolak (401): misalnya token dicabut. */
    const { ctx, pg } = await konteks(br, { akun: 'fc', sesiLangsung: true, meStatus: 401 });
    await pg.goto(base + 'index.html');
    await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 15000 });
    const st = await status(pg);
    cek(st.gate && st.terkunci && !st.identitas, 'sesi yang ditolak server (/api/psg/me 401) tetap terkunci', st);
    await pg.evaluate((s) => sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify(s)), SUM);
    await pg.goto(base + 'program-summary.html');
    await pg.waitForFunction(() => /Sesi login tidak ditemukan/.test((document.getElementById('insuranceGateStatus') || {}).textContent || ''), null, { timeout: 15000 });
    cek((await status(pg)).terkunci, 'program-summary.html: sesi yang ditolak server tetap terkunci');
    await ctx.close();
  }
  {
    const { ctx, pg } = await konteks(br, { akun: 'tanpaHak', sesiLangsung: true });
    await pg.evaluate(() => 0).catch(() => {});
    await pg.goto(base + 'comparison-summary.html');
    await pg.waitForFunction(() => /Sesi login tidak ditemukan/.test((document.getElementById('insuranceGateStatus') || {}).textContent || ''), null, { timeout: 15000 });
    cek((await status(pg)).terkunci, 'comparison-summary.html: akun tanpa hak PSG tetap terkunci');
    await ctx.close();
  }

  console.log('[4–6] Daftar undangan di Manajemen Agen');
  const bukaManajemen = async (pg) => {
    await pg.waitForFunction(() => !document.getElementById('insuranceAccessGate') && window.PSGAgentManagement, null, { timeout: 15000 });
    await pg.evaluate(() => window.bukaLayar('AGENT_MANAGEMENT'));
    await pg.waitForFunction(() => { const l = document.getElementById('agentMgmtList'); return l && !/Memuat/.test(l.textContent) && document.getElementById('agentMgmtSummary').textContent; }, null, { timeout: 15000 });
    return pg.evaluate(() => {
      const stat = [...document.querySelectorAll('#agentMgmtSummary .agent-mgmt-stat b')].map((b) => Number(b.textContent));
      const list = document.getElementById('agentMgmtList');
      return { stat, kartu: list.querySelectorAll('.agent-mgmt-card').length, teks: list.textContent, html: document.getElementById('layarAgentManagement').innerHTML,
        cari: !document.getElementById('agentMgmtSearch').hidden, undang: !!document.getElementById('btnAgentMgmtInvite') };
    });
  };
  for (const nama of DIIZINKAN) {
    const { ctx, pg, errors } = await konteks(br, { akun: nama, sesiLangsung: true });
    await pg.goto(base + 'index.html');
    const m = await bukaManajemen(pg);
    cek(m.kartu === TOTAL_PSG && m.html.includes('belum.konfirmasi@psg.test') && /EMAIL BELUM TERKONFIRMASI/.test(m.html) && m.cari &&
      JSON.stringify(m.stat) === JSON.stringify([TOTAL_PSG, TOTAL_PSG - NONAKTIF, NONAKTIF]),
      AKUN[nama].app_metadata.psg.nama + ': melihat daftar detail undangan dan status konfirmasi', { kartu: m.kartu, stat: m.stat });
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }
  {
    const { ctx, pg, errors } = await konteks(br, { akun: 'adminLain', sesiLangsung: true });
    await pg.goto(base + 'index.html');
    const m = await bukaManajemen(pg);
    cek(m.kartu === 0 && JSON.stringify(m.stat) === JSON.stringify([TOTAL_PSG, TOTAL_PSG - NONAKTIF, NONAKTIF]) && !m.cari && m.undang,
      'PSG Admin di luar daftar: hanya total, aktif, nonaktif (tombol undang tetap ada)', { kartu: m.kartu, stat: m.stat, cari: m.cari });
    cek(!/@psg\.test|@gmail\.com|TERKONFIRMASI/.test(m.html), 'layar admin di luar daftar tanpa email atau status konfirmasi per orang');
    const langsung = await pg.evaluate(async () => {
      const hasil = [];
      for (const u of ['/api/psg/agents', '/api/psg/agents?detail=1', '/api/psg/agents?email=erwineffendi06@gmail.com']) {
        const r = await fetch(u, { credentials: 'same-origin', headers: { 'x-psg-email': 'erwineffendi06@gmail.com' } });
        hasil.push({ status: r.status, teks: await r.text() });
      }
      return hasil;
    });
    cek(langsung.every((x) => x.status === 200 && !/@|"users"|emailTerkonfirmasi/.test(x.teks) && /"detail":false/.test(x.teks)),
      'permintaan langsung ke /api/psg/agents (dengan parameter/header manipulasi) tidak membocorkan detail', langsung.map((x) => x.teks.slice(0, 90)));
    cek(!errors.length, 'tanpa error halaman', errors);
    await ctx.close();
  }
  {
    const { ctx, pg } = await konteks(br, { akun: 'fc', sesiLangsung: true });
    await pg.goto(base + 'index.html');
    await pg.waitForFunction(() => !document.getElementById('insuranceAccessGate'), null, { timeout: 15000 });
    const r = await pg.evaluate(async () => { const x = await fetch('/api/psg/agents'); return { status: x.status, teks: await x.text() }; });
    cek(r.status === 403 && !/@/.test(r.teks), 'agen FC: /api/psg/agents 403 tanpa data', r);
    await ctx.close();
  }

  await br.close();
  srv.close();
  console.log('\nHASIL: ' + (gagal ? 'GAGAL (' + gagal + ' dari ' + jumlah + ')' : 'LULUS (' + jumlah + ' pemeriksaan)'));
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
