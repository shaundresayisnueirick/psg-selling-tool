#!/usr/bin/env node
'use strict';
/* Persistensi login PWA + mode offline 14 hari.

     node tests/offline-sesi.test.js [--root <dir>] [--bagian A,B,...]

   Memakai vendor Identity ASLI (src/vendor/netlify-identity.js, gotrue-js) dan
   Service Worker ASLI di Chromium. Server dan Identity ditiru lewat Playwright:
   POST /token (password/refresh_token), GET /user, POST /logout, dan
   GET /api/psg/me yang menilai cookie nf_jwt seperti server nyata (cookie yang
   lebih tua dari UMUR_TOKEN_MS dianggap kedaluwarsa → 401).
   Pengujian ini simulasi di Chromium desktop, BUKAN pengujian perangkat nyata. */
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');

function loadPlaywright() {
  for (const m of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) { try { return require(m); } catch (_) {} }
  console.log('Playwright tidak tersedia — dilewati.'); process.exit(2);
}
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ROOT = path.resolve(opt('--root') || path.join(__dirname, '..'));
const BAGIAN = (opt('--bagian') || '').split(',').filter(Boolean);
const ikut = (k) => !BAGIAN.length || BAGIAN.includes(k);
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml',
  png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', mp3: 'audio/mpeg', mp4: 'video/mp4', webmanifest: 'application/manifest+json' };
let gagal = 0, jumlah = 0;
function cek(ok, pesan, detail) {
  jumlah++;
  console.log((ok ? '  OK    ' : '  GAGAL ') + pesan + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
  if (!ok) gagal++;
}
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split(/[?#]/)[0]); if (rel.endsWith('/')) rel += 'index.html';
  const f = path.resolve(ROOT, '.' + rel);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  const h = { 'content-type': MIME[path.extname(f).slice(1)] || 'application/octet-stream' };
  h['cache-control'] = /sw\.js$/.test(f) ? 'no-store' : 'no-cache';
  res.writeHead(200, h); fs.createReadStream(f).pipe(res);
});

const UMUR_TOKEN_MS = 4000;          // simulasi: cookie nf_jwt dianggap kedaluwarsa server sesudah 4 dtk
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const PROFIL = { id: 'uji-agen-0001', email: 'agen.uji@psg.test', nama: 'Agen Uji', roles: [], level: 'FC', kodeAgen: 'UJI01', status: 'aktif', emailTerkonfirmasi: true };

/* Satu "dunia" server tiruan per konteks. */
function dunia() {
  const st = { refreshValid: true, refreshN: 0, tokenN: 0, meN: 0, logoutN: 0, tolakMe: null, tolakIdentity: false, tokenSah: new Set() };
  const buatToken = () => {
    const iat = Math.floor(Date.now() / 1000), t = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: PROFIL.id, email: PROFIL.email, iat, exp: iat + 70, jti: ++st.tokenN }) + '.sig';
    st.tokenSah.add(t); return t;
  };
  st.pasang = async (ctx) => {
    await ctx.route('**/.netlify/identity/**', async (route) => {
      const rq = route.request(), p = new URL(rq.url()).pathname.replace(/^\/\.netlify\/identity/, '');
      if (st.tolakIdentity) return route.abort('internetdisconnected');
      const json = (s, b) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
      if (p === '/token' && rq.method() === 'POST') {
        const body = rq.postData() || '';
        if (/grant_type=refresh_token/.test(body)) { if (!st.refreshValid) return json(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' }); st.refreshN++; }
        else if (!/grant_type=password/.test(body)) return json(400, { error: 'unsupported_grant_type' });
        return json(200, { access_token: buatToken(), token_type: 'bearer', expires_in: 70, refresh_token: 'R-' + (++st.tokenN) });
      }
      if (p === '/user' && rq.method() === 'GET') return json(200, { id: PROFIL.id, email: PROFIL.email, confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', roles: [], psg: { nama: PROFIL.nama, level: 'FC', kodeAgen: 'UJI01', status: 'aktif' } }, user_metadata: { full_name: PROFIL.nama } });
      if (p === '/logout') { st.logoutN++; return route.fulfill({ status: 204, body: '' }); }
      return json(404, { msg: 'tidak ada' });
    });
    await ctx.route('**/api/psg/me', async (route) => {
      st.meN++;
      if (st.tolakMe === 'jaringan') return route.abort('internetdisconnected');
      if (st.tolakMe === '5xx') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"x"}' });
      const cookie = (await route.request().allHeaders()).cookie || '';
      const m = /(?:^|;\s*)nf_jwt=([^;]*)/.exec(cookie);
      let ok = false;
      if (m && st.tolakMe !== '401') {
        try { const c = JSON.parse(Buffer.from(decodeURIComponent(m[1]).split('.')[1], 'base64url').toString()); ok = Date.now() - c.iat * 1000 <= UMUR_TOKEN_MS && c.exp * 1000 > Date.now(); } catch (_) {}
      }
      return ok ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: PROFIL }) })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"authenticated":false,"error":"unauthenticated"}' });
    });
    await ctx.route('**/api/psg/pribadi**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"penyimpanan":"preview","pesan":null,"polis":[]}' }));
  };
  return st;
}

const tunggu = async (pg, fn, ms, arg) => { try { await pg.waitForFunction(fn, arg, { timeout: ms || 15000 }); return true; } catch (_) { return false; } };
const jeda = (ms) => new Promise((r) => setTimeout(r, ms));
const keadaan = (pg) => pg.evaluate(() => ({
  gate: !!document.getElementById('insuranceAccessGate'),
  terkunci: document.documentElement.classList.contains('insurance-auth-locked'),
  formEmail: !!(document.getElementById('psgIdentityEmail') && document.getElementById('psgIdentityEmail').offsetParent),
  pesan: ((document.getElementById('psgIdentityServerError') || {}).textContent || '') + ' ' + ((document.getElementById('psgIdentityRestoreStatus') || {}).textContent || ''),
  identitas: window.InsuranceHubIdentity ? window.InsuranceHubIdentity.email : null,
  offlineMode: !!(window.PSGOffline && window.PSGOffline.aktif),
  banner: !!document.getElementById('psgOfflineBanner'),
  gotrue: localStorage.getItem('gotrue.user') !== null,
  rekam: localStorage.getItem('psg.offline.v1') !== null,
  tandaKeluar: localStorage.getItem('psg.keluar.v1') !== null,
}));
async function login(pg, base) {
  await pg.goto(base + 'index.html');
  await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 20000 });
  await pg.fill('#psgIdentityEmail', PROFIL.email); await pg.fill('#psgIdentityPassword', 'RahasiaUji#2026');
  await pg.click('#psgIdentityMasuk');
  return tunggu(pg, () => !document.getElementById('insuranceAccessGate') && window.InsuranceHubIdentity, 20000);
}
async function siapOffline(pg) {
  /* waitForFunction tidak menunggu fungsi async: polling lewat evaluate. */
  const batas = Date.now() + 90000;
  while (Date.now() < batas) {
    const ok = await pg.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (!r || !r.active || !navigator.serviceWorker.controller) return false;
      const st = await window.PSGOffline.statusSiap(); return !!st && st.gagal.length === 0; }).catch(() => false);
    if (ok) return true; await jeda(300);
  }
  return false;
}
async function konteks(br, opsi = {}) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: opsi.sw ? 'allow' : 'block' });
  const w = dunia(); await w.pasang(ctx);
  const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(String(e))); pg.on('dialog', (d) => d.accept());
  return { ctx, pg, w, err };
}
const ubahRekam = (pg, f) => pg.evaluate((src) => { const r = JSON.parse(localStorage.getItem('psg.offline.v1')); (new Function('r', src))(r); localStorage.setItem('psg.offline.v1', JSON.stringify(r)); }, f);
const HARI = 24 * 3600 * 1000;
/* Rute tiruan tetap menjawab walau setOffline: putuskan juga server tiruan. */
const putus = async (ctx, w, ya) => { await ctx.setOffline(!!ya); w.tolakIdentity = !!ya; w.tolakMe = ya ? 'jaringan' : null; };

async function main() {
  const { chromium } = loadPlaywright(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const br = await chromium.launch({ headless: true });
  try {
    if (ikut('A')) {
      console.log('[A] Pemulihan sesi saat PWA dibuka kembali (token kedaluwarsa, refresh token valid)');
      for (const varian of ['cookie-kedaluwarsa', 'cookie-hilang']) {
        const { ctx, pg, w, err } = await konteks(br);
        cek(await login(pg, base), 'login online membuka aplikasi (' + varian + ')');
        const st0 = await keadaan(pg);
        cek(st0.rekam && st0.gotrue, 'catatan verifikasi offline ditulis dan sesi gotrue tersimpan');
        await jeda(UMUR_TOKEN_MS + 1500);
        if (varian === 'cookie-hilang') await ctx.clearCookies();   // PWA ditutup: cookie sesi hilang
        await pg.reload();
        const buka = await tunggu(pg, () => !document.getElementById('insuranceAccessGate') && window.InsuranceHubIdentity, 20000);
        const st = await keadaan(pg);
        cek(buka && !st.formEmail && st.identitas === PROFIL.email && !st.offlineMode, 'dibuka kembali tanpa login ulang, terverifikasi server (bukan mode offline)', st);
        cek(w.refreshN >= 1 || varian === 'cookie-hilang', 'refresh token dipakai lewat endpoint resmi bila perlu (refreshN=' + w.refreshN + ')');
        cek(!err.length, 'tanpa error halaman', err); await ctx.close();
      }
    }
    if (ikut('B')) {
      console.log('[B] Kegagalan jaringan tidak menghapus sesi; penolakan server menghapusnya');
      { // jaringan putus: Identity dan /api/psg/me tidak terjangkau, aset tetap ada
        const { ctx, pg, w, err } = await konteks(br); await login(pg, base); await jeda(UMUR_TOKEN_MS + 1500);
        w.tolakIdentity = true; w.tolakMe = 'jaringan'; await pg.reload();
        await tunggu(pg, () => window.InsuranceHubIdentity || document.getElementById('psgIdentityRestoreStatus'), 20000);
        const st = await keadaan(pg);
        cek(st.gotrue && st.rekam, 'refresh/me gagal karena jaringan: sesi gotrue dan catatan TIDAK dihapus', st);
        cek(st.offlineMode && !st.formEmail && st.banner, 'dibuka dalam mode offline terbatas dengan banner', st);
        w.tolakIdentity = false; w.tolakMe = null; await ctx.close();
      }
      { // server 5xx = gangguan sementara, bukan penolakan
        const { ctx, pg, w } = await konteks(br); await login(pg, base); w.tolakMe = '5xx'; await pg.reload();
        await tunggu(pg, () => window.InsuranceHubIdentity, 20000); const st = await keadaan(pg);
        cek(st.gotrue && st.offlineMode, '5xx dari server: sesi dipertahankan (mode offline), tidak dipaksa logout', st); await ctx.close();
      }
      { // refresh token ditolak server → login ulang
        const { ctx, pg, w } = await konteks(br); await login(pg, base); await jeda(UMUR_TOKEN_MS + 1500);
        w.refreshValid = false; await ctx.clearCookies(); await pg.reload();
        await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 20000 }); const st = await keadaan(pg);
        cek(st.formEmail && !st.gotrue && !st.offlineMode && st.terkunci, 'refresh token ditolak (dicabut/kedaluwarsa): sesi dihapus, diminta login ulang', st);
        cek(!st.rekam, 'catatan offline ikut dihapus saat server menolak sesi', st); await ctx.close();
      }
      { // 401 dari server saat online (akun dicabut): keputusan server berlaku
        const { ctx, pg, w } = await konteks(br); await login(pg, base); w.tolakMe = '401'; w.refreshValid = false; await pg.reload();
        await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 20000 }); const st = await keadaan(pg);
        cek(st.formEmail && !st.offlineMode && !st.rekam, 'server menjawab 401 saat online: catatan offline tidak mengalahkan server', st); await ctx.close();
      }
    }
    if (ikut('C')) {
      console.log('[C] Offline dengan Service Worker asli (cache terisi)');
      const { ctx, pg, w, err } = await konteks(br, { sw: true });
      cek(await login(pg, base), 'login online + SW terpasang');
      cek(await siapOffline(pg), 'precache selesai tanpa berkas gagal; status "siap offline" tersedia');
      const hasilOnline = await pg.evaluate(async () => { window.bukaLayar('LF'); await new Promise((r) => setTimeout(r, 300));
        const set = (id, v) => { const n = document.getElementById(id); n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); };
        set('fNama', 'Uji Offline'); set('fTgl', '1984-12-31'); set('fMPP', '5'); set('fUP', '1000000000'); await new Promise((r) => setTimeout(r, 400));
        window.bukaLayar('LF_RINGKAS'); await new Promise((r) => setTimeout(r, 400)); return document.getElementById('layarRingkasan').innerText.replace(/\s+/g, ' ').trim(); });
      cek(hasilOnline.length > 50, 'kalkulator BeSMART LF menghasilkan ringkasan online', hasilOnline.slice(0, 60));
      await putus(ctx, w, true); await pg.goto(base + 'index.html');
      const buka = await tunggu(pg, () => !document.getElementById('insuranceAccessGate') && window.InsuranceHubIdentity, 25000); const st = await keadaan(pg);
      cek(buka && st.offlineMode && st.banner && st.identitas === PROFIL.email, 'offline: PWA dibuka dari cache, mode offline + banner, akun dari catatan verifikasi', st);
      const hasilOffline = await pg.evaluate(async () => { window.bukaLayar('LF'); await new Promise((r) => setTimeout(r, 300));
        const set = (id, v) => { const n = document.getElementById(id); n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); };
        set('fNama', 'Uji Offline'); set('fTgl', '1984-12-31'); set('fMPP', '5'); set('fUP', '1000000000'); await new Promise((r) => setTimeout(r, 400));
        window.bukaLayar('LF_RINGKAS'); await new Promise((r) => setTimeout(r, 400)); return document.getElementById('layarRingkasan').innerText.replace(/\s+/g, ' ').trim(); });
      cek(hasilOffline === hasilOnline, 'hasil kalkulator offline identik dengan online (tanpa perubahan rumus/angka)', { on: hasilOnline.slice(0, 80), off: hasilOffline.slice(0, 80) });
      const srv = await pg.evaluate(async () => { const r = await fetch('/api/psg/pribadi'); const b = await r.json(); return { s: r.status, m: b.message }; });
      cek(srv.s === 503 && /Fitur ini memerlukan koneksi internet\. Silakan sambungkan perangkat ke jaringan, lalu coba kembali\./.test(srv.m), 'fitur server offline: 503 + pesan koneksi (bukan sukses palsu)', srv);
      const cacheSensitif = await pg.evaluate(async () => { const out = []; for (const n of await caches.keys()) { const c = await caches.open(n); for (const rq of await c.keys()) if (/\/api\/|\/\.netlify\/|nf_jwt/.test(rq.url)) out.push(rq.url); } return out; });
      cek(!cacheSensitif.length, 'tidak ada /api atau /.netlify (respons autentikasi/akun) di Cache Storage', cacheSensitif);
      // ringkasan
      await pg.evaluate(() => sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify({ customerName: 'Uji', targets: { life: 1e9 }, scenarios: [] })));
      await pg.goto(base + 'comparison-summary.html'); const ring = await tunggu(pg, () => !document.getElementById('insuranceAccessGate'), 20000);
      cek(ring && await pg.evaluate(() => window.PSGOffline.aktif), 'halaman ringkasan terbuka offline lewat catatan verifikasi');
      // koneksi kembali
      await pg.goto(base + 'index.html'); await tunggu(pg, () => window.PSGOffline && window.PSGOffline.aktif && window.InsuranceHubIdentity, 20000);
      await putus(ctx, w, false); await pg.evaluate(() => window.dispatchEvent(new Event('online')));
      const kembali = await tunggu(pg, () => window.PSGOffline && !window.PSGOffline.aktif && !document.getElementById('psgOfflineBanner'), 20000);
      cek(kembali, 'koneksi kembali: diverifikasi server, mode offline berakhir, banner hilang');
      cek(!err.length, 'tanpa error halaman', err); await ctx.close();
    }
    if (ikut('D')) {
      console.log('[D] Masa 14 hari, jam perangkat, dan catatan hilang (offline, tanpa SW: halaman dari server uji lalu server diputus)');
      const { ctx, pg, w } = await konteks(br); await login(pg, base);
      const uji = async (judul, ubah, diharapBuka, pola) => {
        await ubahRekam(pg, ubah); w.tolakIdentity = true; w.tolakMe = 'jaringan'; await pg.reload();
        await tunggu(pg, () => window.InsuranceHubIdentity || /offline|Sambungkan|habis|Jam perangkat/.test((document.getElementById('psgIdentityRestoreStatus') || {}).textContent || ''), 20000);
        const st = await keadaan(pg);
        cek(diharapBuka ? (st.offlineMode && !st.formEmail) : (!st.offlineMode && st.terkunci && !st.identitas && (!pola || pola.test(st.pesan))), judul, st);
        w.tolakIdentity = false; w.tolakMe = null;
        if (!diharapBuka) { await pg.reload(); await tunggu(pg, () => window.InsuranceHubIdentity, 20000); }
      };
      await uji('13 hari sejak verifikasi: offline masih diizinkan', 'r.t = Date.now() - 13*86400000; r.lihat = r.t;', true);
      await uji('15 hari sejak verifikasi: offline dikunci (masa 14 hari habis)', 'r.t = Date.now() - 15*86400000; r.lihat = r.t;', false, /14 hari/);
      await ubahRekam(pg, 'r.t = Date.now(); r.lihat = Date.now();');
      await uji('jam perangkat mundur dari waktu terakhir dilihat: dikunci sampai verifikasi online', 'r.lihat = Date.now() + 3600000;', false, /Jam perangkat/);
      await pg.evaluate(() => localStorage.removeItem('psg.offline.v1'));
      w.tolakIdentity = true; w.tolakMe = 'jaringan'; await pg.reload(); await tunggu(pg, () => document.getElementById('psgIdentityRestoreStatus') && document.getElementById('psgIdentityRestoreStatus').textContent, 20000);
      const st = await keadaan(pg);
      cek(!st.offlineMode && st.terkunci && /belum ada verifikasi online/.test(st.pesan), 'tanpa catatan verifikasi: tidak dibuka offline', st);
      w.tolakIdentity = false; w.tolakMe = null; await ctx.close();
      // kegagalan jaringan tidak memperpanjang masa
      const k2 = await konteks(br); await login(k2.pg, base); await ubahRekam(k2.pg, 'r.t = r.t - 5*86400000; r.lihat = r.t;');
      const awal = await k2.pg.evaluate(() => JSON.parse(localStorage.getItem('psg.offline.v1')).t);
      k2.w.tolakIdentity = true; k2.w.tolakMe = 'jaringan'; await k2.pg.reload(); await tunggu(k2.pg, () => window.InsuranceHubIdentity, 20000);
      const akhir = await k2.pg.evaluate(() => JSON.parse(localStorage.getItem('psg.offline.v1')).t);
      cek(akhir === awal, 'kegagalan jaringan tidak memperpanjang periode 14 hari (t tetap)', { awal, akhir });
      k2.w.tolakIdentity = false; k2.w.tolakMe = null; await k2.pg.reload(); await tunggu(k2.pg, () => window.InsuranceHubIdentity && !window.PSGOffline.aktif, 20000);
      const baru = await k2.pg.evaluate(() => JSON.parse(localStorage.getItem('psg.offline.v1')).t);
      cek(baru > awal + 4 * HARI, 'verifikasi online yang berhasil memulai ulang periode 14 hari', { awal, baru }); await k2.ctx.close();
    }
    if (ikut('E')) {
      console.log('[E] Logout');
      { // logout online
        const { ctx, pg, w } = await konteks(br, { sw: true }); await login(pg, base); await siapOffline(pg);
        await pg.evaluate(() => window.insuranceHubLogout()); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 20000 });
        const st = await keadaan(pg);
        cek(st.formEmail && !st.gotrue && !st.rekam && w.logoutN >= 1 && !st.tandaKeluar, 'logout online: sesi dicabut di server, catatan offline dihapus, kembali ke login', { ...st, logoutN: w.logoutN });
        await tunggu(pg, () => !!navigator.serviceWorker.controller, 20000); // SW mengendalikan halaman login pasca-logout sebelum jaringan diputus
        await putus(ctx, w, true); await pg.goto(base + 'index.html'); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 25000 });
        const off = await keadaan(pg);
        cek(!off.offlineMode && off.terkunci && !off.identitas, 'setelah logout, membuka PWA offline tidak memulihkan akses kalkulator', off);
        await putus(ctx, w, false); await pg.goto(base + 'index.html'); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 20000 });
        cek((await keadaan(pg)).terkunci, 'setelah online kembali, sesi yang sudah logout tidak dipulihkan'); await ctx.close();
      }
      { // logout saat offline
        const { ctx, pg, w } = await konteks(br, { sw: true }); await login(pg, base); await siapOffline(pg);
        await putus(ctx, w, true); await pg.goto(base + 'index.html'); await tunggu(pg, () => window.PSGOffline && window.PSGOffline.aktif && window.InsuranceHubIdentity, 25000);
        await pg.evaluate(() => window.insuranceHubLogout()); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 25000 });
        await tunggu(pg, () => /belum dapat dikonfirmasi/.test((document.getElementById('psgIdentityServerError') || {}).textContent || ''), 10000);
        const st = await keadaan(pg);
        cek(st.formEmail && !st.gotrue && !st.rekam && !st.offlineMode, 'logout offline: catatan dan sesi lokal dihapus, kalkulator terkunci', st);
        cek(/belum dapat dikonfirmasi/.test(st.pesan), 'logout offline: pengguna diberi tahu pencabutan server belum terkonfirmasi', st.pesan);
        await putus(ctx, w, false); await pg.reload(); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 20000 });
        cek(!(await keadaan(pg)).identitas, 'sesi yang di-logout offline tidak aktif kembali saat online'); await ctx.close();
      }
      { // logout dari halaman ringkasan (tanpa Identity di halaman itu)
        const { ctx, pg } = await konteks(br); await login(pg, base);
        await pg.evaluate(() => sessionStorage.setItem('insuranceHub.comparisonSummary', JSON.stringify({ customerName: 'Uji', targets: { life: 1e9 }, scenarios: [] })));
        await pg.goto(base + 'comparison-summary.html'); await tunggu(pg, () => !document.getElementById('insuranceAccessGate'), 20000);
        await pg.evaluate(() => window.insuranceHubLogout()); await pg.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 25000 });
        const st = await keadaan(pg);
        cek(st.formEmail && !st.gotrue && !st.rekam && !st.identitas, 'logout dari halaman ringkasan: tidak memulihkan sesi saat kembali ke index', st); await ctx.close();
      }
    }
    if (ikut('G')) {
      console.log('[G] PWA ditutup lalu dibuka kembali saat offline (token kedaluwarsa, cookie sesi hilang)');
      for (const varian of ['token-kedaluwarsa', 'token-kedaluwarsa+cookie-hilang', 'tab-baru']) {
        const { ctx, pg, w, err } = await konteks(br, { sw: true }); await login(pg, base); await siapOffline(pg);
        await jeda(12000); // access token (70 dtk, margin 60 dtk) dianggap kedaluwarsa oleh klien
        if (/cookie-hilang/.test(varian)) await ctx.clearCookies();
        await putus(ctx, w, true);
        let pg2 = pg; if (varian === 'tab-baru') { await pg.close(); pg2 = await ctx.newPage(); pg2.on('pageerror', (e) => err.push(String(e))); }
        else await pg.close(), pg2 = await ctx.newPage();
        await pg2.goto(base + 'index.html');
        const buka = await tunggu(pg2, () => !document.getElementById('insuranceAccessGate') && window.InsuranceHubIdentity, 25000);
        const st = await keadaan(pg2);
        cek(buka && st.offlineMode && !st.formEmail, 'buka ulang offline (' + varian + '): masuk mode offline tanpa email/kata sandi', st);
        await ctx.close();
      }
    }
    if (ikut('G')) {
      { // sesi lokal (gotrue.user) hilang tetapi catatan verifikasi masih berlaku
        const { ctx, pg, w } = await konteks(br, { sw: true }); await login(pg, base); await siapOffline(pg);
        await pg.evaluate(() => localStorage.removeItem('gotrue.user')); await ctx.clearCookies(); await putus(ctx, w, true); await pg.close();
        const pg2 = await ctx.newPage(); await pg2.goto(base + 'index.html');
        const buka = await tunggu(pg2, () => !document.getElementById('insuranceAccessGate') && window.InsuranceHubIdentity, 25000); const st = await keadaan(pg2);
        cek(buka && st.offlineMode && !st.formEmail, 'sesi lokal hilang + offline + catatan sah: kalkulator terbuka offline', st);
        await putus(ctx, w, false); await pg2.evaluate(() => window.dispatchEvent(new Event('online'))).catch(() => {}); // setOffline(false) sudah memicu 'online' dan muat ulang
        const kunci = await tunggu(pg2, () => !!document.getElementById('psgIdentityEmail') && document.getElementById('psgIdentityEmail').offsetParent !== null, 25000); const st2 = await keadaan(pg2);
        cek(kunci && !st2.rekam, 'koneksi kembali tanpa sesi sah: catatan dihapus dan login diminta', st2); await ctx.close();
      }
      { // sesi lokal hilang, offline, TANPA catatan: tetap terkunci
        const { ctx, pg, w } = await konteks(br, { sw: true }); await login(pg, base); await siapOffline(pg);
        await pg.evaluate(() => { localStorage.removeItem('gotrue.user'); localStorage.removeItem('psg.offline.v1'); }); await ctx.clearCookies(); await putus(ctx, w, true); await pg.close();
        const pg2 = await ctx.newPage(); await pg2.goto(base + 'index.html'); await pg2.waitForSelector('#psgIdentityEmail', { state: 'visible', timeout: 25000 }); const st = await keadaan(pg2);
        cek(!st.offlineMode && st.terkunci, 'sesi lokal hilang + offline + tanpa catatan: tetap terkunci', st); await ctx.close();
      }
    }
    if (ikut('H')) {
      console.log('[H] Indikator Online/Offline dan notifikasi sementara');
      const pil = (pg) => pg.evaluate(() => { const e = document.getElementById('psgKoneksi'); if (!e) return null; const r = e.getBoundingClientRect(), b = document.getElementById('btnPsgInformasi').getBoundingClientRect(), h = document.getElementById('bilah');
        return { teks: e.textContent, status: e.dataset.status, title: e.title, kiri: r.left, kanan: r.right, lebar: innerWidth, bell: [b.left, b.right], overflow: document.documentElement.scrollWidth > innerWidth + 1, hdrOver: h.scrollWidth > h.clientWidth + 1, warna: getComputedStyle(e).backgroundColor }; });
      for (const lebar of [1280, 390]) {
        const { ctx, pg, w } = await konteks(br); await pg.setViewportSize({ width: lebar, height: lebar === 390 ? 800 : 860 }); await login(pg, base);
        await tunggu(pg, () => { const e = document.getElementById('psgKoneksi'); return e && e.dataset.status === 'online'; }, 15000);
        let p = await pil(pg);
        cek(p && p.status === 'online' && p.teks === 'Online' && /22, 163, 74/.test(p.warna), 'online (' + lebar + 'px): kapsul hijau "Online"', p);
        cek(p && !p.overflow && !p.hdrOver && p.kanan <= p.lebar && (p.kanan <= p.bell[0] + 1 || p.kiri >= p.bell[1] - 1), 'kapsul tidak overflow dan tidak menimpa lonceng (' + lebar + 'px)', p);
        await pg.screenshot({ path: process.env.SS_DIR ? process.env.SS_DIR + '/online-' + lebar + '.png' : '/dev/null' }).catch(() => {});
        await ctx.setOffline(true); await pg.evaluate(() => window.dispatchEvent(new Event('offline')));
        p = await pil(pg); cek(p.status === 'offline' && p.teks === 'Offline' && /220, 38, 38/.test(p.warna) && /Internet tidak tersedia/.test(p.title), 'offline (' + lebar + 'px): kapsul merah "Offline" (internet tidak tersedia)', p);
        await pg.screenshot({ path: process.env.SS_DIR ? process.env.SS_DIR + '/offline-' + lebar + '.png' : '/dev/null' }).catch(() => {});
        await ctx.setOffline(false); await tunggu(pg, () => document.getElementById('psgKoneksi').dataset.status === 'online', 15000);
        p = await pil(pg); cek(p.status === 'online', 'koneksi kembali: kapsul berubah Online otomatis', p); await ctx.close();
      }
      { // internet ada, server tidak terjangkau
        const { ctx, pg, w } = await konteks(br); await login(pg, base);
        w.tolakMe = 'jaringan'; await pg.evaluate(() => window.PSGOffline.periksaKoneksi());
        let p = await pil(pg); cek(p.status === 'offline' && /server tidak dapat dijangkau/.test(p.title), 'server tidak terjangkau tetapi internet ada: Offline dengan keterangan server', p);
        w.tolakMe = null; await pg.evaluate(() => window.PSGOffline.periksaKoneksi()); p = await pil(pg); cek(p.status === 'online', 'server terjangkau lagi: Online', p);
        // tanpa polling saat online
        const n0 = w.meN; await jeda(8000); cek(w.meN - n0 === 0, 'tidak ada polling /api/psg/me saat online (8 dtk idle)', w.meN - n0);
        // background lalu aktif lagi: satu pemeriksaan
        const n1 = w.meN; await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await jeda(1500);
        cek(w.meN - n1 <= 2, 'kembali dari background memicu pemeriksaan terbatas', w.meN - n1); await ctx.close();
      }
      { // notifikasi sementara saat PWA dibuka offline
        const { ctx, pg, w } = await konteks(br, { sw: true }); await pg.setViewportSize({ width: 390, height: 800 }); await login(pg, base); await siapOffline(pg);
        await putus(ctx, w, true); await pg.close(); const pg2 = await ctx.newPage(); await pg2.goto(base + 'index.html');
        await tunggu(pg2, () => window.PSGOffline && window.PSGOffline.aktif && document.getElementById('psgOfflineBanner'), 25000);
        const info = await pg2.evaluate(() => { const b = document.getElementById('psgOfflineBanner'), r = b && b.getBoundingClientRect(), h = document.getElementById('bilah').getBoundingClientRect(); return { ada: !!b, atas: r && r.top, bawahHeader: h.bottom, bawah: r && r.bottom, tinggi: innerHeight }; });
        cek(info.ada && info.atas >= info.bawahHeader - 1 && info.bawah < info.tinggi - 100, 'notifikasi offline tampil di bawah header, tidak menutupi navigasi bawah', info);
        await pg2.screenshot({ path: process.env.SS_DIR ? process.env.SS_DIR + '/notif-390.png' : '/dev/null' }).catch(() => {});
        const hilang = await tunggu(pg2, () => !document.getElementById('psgOfflineBanner'), 8000);
        cek(hilang, 'notifikasi menghilang otomatis (±4,5 dtk)');
        const p = await pg2.evaluate(() => ({ s: document.getElementById('psgKoneksi').dataset.status, offlineMode: window.PSGOffline.aktif }));
        cek(p.s === 'offline' && p.offlineMode, 'indikator header tetap Offline dan mode offline tetap aktif setelah notifikasi hilang', p);
        await jeda(2000); cek(!(await pg2.evaluate(() => !!document.getElementById('psgOfflineBanner'))), 'notifikasi tidak muncul berulang'); await ctx.close();
      }
    }
    if (ikut('F')) {
      console.log('[F] Service Worker');
      const { ctx, pg } = await konteks(br, { sw: true }); await login(pg, base); await siapOffline(pg);
      const st = await pg.evaluate(() => window.PSGOffline.statusSiap());
      cek(st && st.gagal.length === 0 && /^insurance-hub-v/.test(st.versi) && st.total > 200, 'status pemasangan: semua berkas precache tersimpan', st && { versi: st.versi, total: st.total, gagal: st.gagal.length });
      const aset = await pg.evaluate(async () => { const c = await caches.open((await window.PSGOffline.statusSiap()).versi); const cek = ['./src/vendor/netlify-identity.js', './src/identity-callback.js', './src/identity-callback.css', './src/psg-offline.js', './src/agent-management.css', './src/sales-idea-video.js?v=123', './src/access-gate.js'];
        const r = {}; for (const u of cek) r[u] = !!(await c.match(u)); return r; });
      cek(Object.values(aset).every(Boolean), 'aset login & modul offline ada di precache', aset);
      // jaringan menggantung: halaman jatuh ke cache sesudah batas waktu, tidak menggantung
      await ctx.route('**/index.html', () => { /* tidak pernah dijawab */ });
      const t0 = Date.now(); const resp = await pg.evaluate(async () => { const r = await fetch('/index.html', { cache: 'no-store' }).catch(() => null); return r ? r.status : 0; });
      const dt = Date.now() - t0;
      cek(resp === 200 && dt < 8000, 'jaringan menggantung: dokumen dilayani dari cache sesudah ±4 dtk (bukan menunggu tanpa akhir)', { resp, dt });
      await ctx.unroute('**/index.html');
      await ctx.close();
    }
  } finally { await br.close(); server.close(); }
  console.log('\nHASIL: ' + (gagal ? 'GAGAL (' + gagal + ' dari ' + jumlah + ')' : 'LULUS (' + jumlah + ' pemeriksaan)'));
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
