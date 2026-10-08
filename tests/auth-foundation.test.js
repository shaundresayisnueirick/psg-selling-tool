#!/usr/bin/env node
/* Test terarah fondasi autentikasi (v1.7 PR 1) — tanpa browser.

     node tests/auth-foundation.test.js

   Memeriksa:
   - netlify.toml: direktori functions, no-store untuk /api/*, path internal diblokir
   - function psg-me & identity: sintaks TypeScript valid, path /api/psg/me
   - /api/psg/me: anonim -> 401, mock user -> 200 hanya berisi field aman,
     role/jenjang hanya dari app_metadata, method lain -> 405, selalu no-store
   - sw.js: /.netlify/ dan /api/ tidak pernah ditangani (tidak masuk cache),
     halaman/src/asset tetap ditangani seperti sebelumnya
   - access-gate.js (login lama) tidak berubah

   Butuh Node >= 22.18 (type stripping .mts bawaan). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
let gagal = 0, cekJumlah = 0;
function cek(ok, pesan, detail) {
  cekJumlah++;
  if (ok) console.log('  ✓ ' + pesan);
  else { gagal++; console.log('  ✗ ' + pesan + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); }
}
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

async function main() {
  console.log('Config Netlify');
  const toml = baca('netlify.toml');
  cek(/\[functions\][^\[]*directory\s*=\s*"netlify\/functions"/.test(toml), 'functions.directory = netlify/functions');
  cek(/for\s*=\s*"\/api\/\*"[\s\S]*?Cache-Control\s*=\s*"no-store/.test(toml), 'header no-store untuk /api/*');
  for (const p of ['/netlify/*', '/node_modules/*', '/package.json', '/package-lock.json']) {
    const re = new RegExp('from\\s*=\\s*"' + p.replace(/[.*/]/g, (m) => '\\' + m) + '"[\\s\\S]*?status\\s*=\\s*404[\\s\\S]*?force\\s*=\\s*true');
    cek(re.test(toml), 'path internal diblokir: ' + p);
  }
  cek(!/^\s*publish\s*=/m.test(toml) && !/^\s*command\s*=/m.test(toml), 'publish/build command tidak diubah');
  const pkg = JSON.parse(baca('package.json'));
  cek(pkg.dependencies && pkg.dependencies['@netlify/identity'], 'dependensi @netlify/identity (npm, bukan CDN)');
  cek(/node_modules/.test(baca('.gitignore')), 'node_modules diabaikan git');

  console.log('Sintaks function');
  // Node >= 22.18 memeriksa sintaks .mts lewat type stripping bawaan.
  const { execFileSync } = require('child_process');
  for (const f of ['netlify/functions/psg-me.mts', 'netlify/functions/identity.mts', 'netlify/lib/psg-auth.mts']) {
    let err = null;
    try { execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }); }
    catch (e) { err = String(e.stderr || e.message).split('\n').slice(0, 4).join(' '); }
    cek(!err, 'sintaks valid: ' + f, err);
  }
  const me = baca('netlify/functions/psg-me.mts');
  cek(/path:\s*'\/api\/psg\/me'/.test(me), "psg-me config.path = '/api/psg/me'");
  cek(/export default async/.test(me) && /from '@netlify\/identity'/.test(me), 'psg-me: format function v2 + @netlify/identity');
  /* Hook userValidate deny-all ikut berjalan saat undangan diproses
     ("422 Failed to handle signup webhook"); Invite Only diatur di dashboard. */
  const identitas = baca('netlify/functions/identity.mts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  cek(/export default\b/.test(identitas) && !/userValidate/.test(identitas) && !/\.deny\(/.test(identitas),
    'identity: tanpa hook userValidate deny-all (undangan tidak tertolak)');
  const semuaFn = ['netlify/functions/psg-me.mts', 'netlify/functions/identity.mts', 'netlify/lib/psg-auth.mts'].map(baca).join('\n');
  cek(!/https?:\/\/(cdn|unpkg|jsdelivr)/i.test(semuaFn), 'tidak ada CDN eksternal');

  console.log('Endpoint /api/psg/me (mock)');
  const lib = await import(pathToFileURL(path.join(ROOT, 'netlify/lib/psg-auth.mts')).href);
  const req = (m = 'GET') => new Request('https://psg.test/api/psg/me', { method: m });
  const noStore = (r) => /no-store/.test(r.headers.get('cache-control') || '');

  let r = await lib.tanganiMe(req(), async () => null);
  let b = await r.json();
  cek(r.status === 401 && b.authenticated === false, 'anonim -> 401', { status: r.status, b });
  cek(noStore(r), 'anonim: Cache-Control no-store');

  r = await lib.tanganiMe(req(), async () => { throw new Error('jaringan'); });
  cek(r.status === 401, 'getUser gagal -> 401, bukan 500', r.status);

  r = await lib.tanganiMe(req('POST'), async () => ({ id: 'x' }));
  cek(r.status === 405 && r.headers.get('allow') === 'GET', 'POST -> 405 Allow: GET', r.status);

  const mock = {
    id: 'u-123', email: 'agen@psg.test', name: 'Nama Metadata', confirmedAt: '2026-10-01T00:00:00Z',
    roles: ['psg_admin', 'editor'],
    appMetadata: { provider: 'email', roles: ['psg_admin', 'editor'],
      psg: { level: 'BM', kodeAgen: ' A123 ', nama: 'Budi', status: 'aktif', catatanInternal: 'rahasia' } },
    userMetadata: { full_name: 'Nama Metadata', level: 'BD', roles: ['psg_owner'] },
    token: { access_token: 'JWT-RAHASIA', refresh_token: 'REFRESH-RAHASIA' },
    access_token: 'JWT-RAHASIA',
  };
  r = await lib.tanganiMe(req(), async () => mock);
  const mentah = await r.text();
  b = JSON.parse(mentah);
  cek(r.status === 200 && b.authenticated === true, 'user login -> 200', r.status);
  cek(noStore(r) && /Cookie/.test(r.headers.get('vary') || ''), 'login: no-store + Vary Cookie');
  cek(JSON.stringify(Object.keys(b.user).sort()) === JSON.stringify(
    ['email', 'emailTerkonfirmasi', 'id', 'kodeAgen', 'level', 'nama', 'roles', 'status']), 'hanya field aman', Object.keys(b.user));
  cek(!/RAHASIA|rahasia|access_token|refresh_token|userMetadata|appMetadata/.test(mentah), 'tidak ada token/secret/metadata mentah');
  cek(JSON.stringify(b.user.roles) === '["psg_admin"]', 'role asing dibuang', b.user.roles);
  cek(b.user.level === 'BM', 'jenjang dari app_metadata, bukan user_metadata', b.user.level);
  cek(b.user.kodeAgen === 'A123' && b.user.nama === 'Budi', 'kodeAgen/nama dirapikan', b.user);

  r = await lib.tanganiMe(req(), async () => ({ id: 'u-9', email: 'x@psg.test',
    userMetadata: { roles: ['psg_owner'], level: 'BD' }, appMetadata: { psg: { level: 'XX' } } }));
  b = await r.json();
  cek(b.user.roles.length === 0 && b.user.level === null, 'user_metadata tidak bisa menaikkan role/jenjang', b.user);

  console.log('Service worker');
  const src = baca('sw.js');
  /* VERSI terus naik bersama aset baru; yang dijaga hanya batas bawahnya. */
  const v = (src.match(/const VERSI = 'insurance-hub-v(\d+)\.(\d+)\.(\d+)'/) || []).slice(1).map(Number);
  cek(v.length === 3 && (v[0] - 117 || v[1] - 1 || v[2] - 6) >= 0, 'VERSI minimal v117.1.6', v.join('.'));
  const listeners = {};
  const ctx = {
    self: { addEventListener: (t, f) => { listeners[t] = f; }, location: { origin: 'https://psg.test' },
      skipWaiting() {}, clients: { claim() {} } },
    caches: { match: async () => null, open: async () => ({ put() {}, add: async () => {} }), keys: async () => [] },
    fetch: async () => new Response('ok'), Response, URL, Promise, console,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const ditangani = (url, accept = '*/*', mode = 'no-cors', method = 'GET') => {
    let dipakai = false;
    listeners.fetch({ request: { url, method, mode, headers: { get: (h) => (h === 'accept' ? accept : null) } },
      respondWith: () => { dipakai = true; } });
    return dipakai;
  };
  for (const u of ['/.netlify/identity/user', '/.netlify/identity/settings', '/.netlify/functions/psg-me',
    '/api/psg/me', '/api/psg/agents?x=1', '/api']) {
    cek(!ditangani('https://psg.test' + u), 'bypass cache: ' + u);
    cek(!ditangani('https://psg.test' + u, 'text/html', 'navigate'), 'bypass cache (navigate/html): ' + u);
  }
  cek(ditangani('https://psg.test/index.html', 'text/html', 'navigate'), 'halaman tetap ditangani SW');
  cek(ditangani('https://psg.test/src/app.js'), '/src/ tetap ditangani SW');
  cek(ditangani('https://psg.test/assets/logo-psg.png'), 'asset tetap ditangani SW');
  cek(ditangani('https://psg.test/apiku.png') && ditangani('https://psg.test/src/api/x.js'), 'path mirip /api tidak ikut di-bypass');

  console.log('Login lama');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/access-gate.js'))).digest('hex');
  const base = JSON.parse(baca('tests/contract-baseline.json')).static.protectedFiles['src/access-gate.js'];
  cek(hash === base, 'src/access-gate.js identik dengan baseline');

  console.log('\nAUTH FOUNDATION: ' + (gagal ? 'GAGAL — ' + gagal : 'LULUS — ' + cekJumlah) + ' pemeriksaan');
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
