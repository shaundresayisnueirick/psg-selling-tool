#!/usr/bin/env node
/* Behavioral test Invite Agen (/api/psg/agents) — tanpa jaringan.

     node tests/agent-invite.test.js

   netlify/lib/psg-agents.mts dijalankan langsung (Node >= 22.18, type
   stripping) dengan Identity GoTrue tiruan. Host Deploy Preview disimulasikan
   berada di balik login tim Netlify: setiap permintaan ke sana dijawab 401
   halaman login dan dicatat sebagai pelanggaran. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
let gagal = 0, jumlah = 0;
function cek(ok, pesan, detail) {
  jumlah++;
  if (ok) console.log('  ✓ ' + pesan);
  else { gagal++; console.log('  ✗ ' + pesan + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); }
}
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const UTAMA = 'https://psgproducertools.netlify.app';
const PREVIEW = 'https://deploy-preview-21--psgproducertools.netlify.app';
const OPERATOR = 'OPERATOR-TOKEN-UJI';

/* GoTrue tiruan: data mentah snake_case seperti admin API asli. */
function gotrue(awal, opsi = {}) {
  const users = new Map(awal.map((u) => [u.id, JSON.parse(JSON.stringify(u))]));
  const log = [], pelanggaran = [];
  const json = (status, isi) => new Response(isi === undefined ? null : JSON.stringify(isi),
    { status, headers: { 'content-type': 'application/json' } });
  const fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = (init.method || 'GET').toUpperCase();
    const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || '';
    let body = null;
    try { body = init.body ? JSON.parse(init.body) : null; } catch (_) {}
    const p = u.pathname.replace(/^\/\.netlify\/identity/, '');
    log.push({ host: u.origin, method, path: p + u.search, auth, body });
    if (u.origin !== UTAMA) {
      pelanggaran.push(u.origin + u.pathname);
      return new Response('<!doctype html><html><body>Log in to Netlify</body></html>', { status: 401, headers: { 'content-type': 'text/html' } });
    }
    if (opsi.lindungi) return new Response('<!doctype html><html>Log in</html>', { status: 401, headers: { 'content-type': 'text/html' } });
    const butuhAdmin = p.startsWith('/admin/') || p === '/invite';
    if (butuhAdmin && auth !== 'Bearer ' + OPERATOR) return json(401, { code: 401, msg: 'Invalid token' });
    if (method === 'GET' && p === '/admin/users') {
      const page = Number(u.searchParams.get('page') || 1), per = Number(u.searchParams.get('per_page') || 50);
      const semua = [...users.values()];
      return json(200, { users: semua.slice((page - 1) * per, page * per) });
    }
    const m = p.match(/^\/admin\/users\/([^/]+)$/);
    if (m) {
      const t = users.get(decodeURIComponent(m[1]));
      if (!t) return json(404, { code: 404, msg: 'User not found' });
      if (method === 'GET') return json(200, t);
      if (method === 'PUT') {
        if (body.app_metadata) t.app_metadata = body.app_metadata;
        if (body.user_metadata) t.user_metadata = body.user_metadata;
        return json(200, t);
      }
    }
    if (method === 'POST' && p === '/invite') {
      const ada = [...users.values()].find((x) => x.email === body.email);
      if (ada && ada.confirmed_at) return json(422, { code: 422, msg: 'A user with this email address has already been registered' });
      const baru = ada || { id: crypto.randomUUID(), email: body.email, aud: '', role: '', confirmed_at: null,
        invited_at: '2026-10-08T01:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {} };
      users.set(baru.id, baru);
      return opsi.invite204 ? new Response(null, { status: 204 }) : json(200, baru);
    }
    if (method === 'POST' && p === '/recover') return json(200, {});
    return json(404, { code: 404, msg: 'Not found' });
  };
  return { users, log, pelanggaran, fetch };
}

const raw = (id, email, app, extra = {}) => ({ id, email, aud: '', role: '', confirmed_at: '2026-10-01T00:00:00Z',
  invited_at: '2026-09-30T00:00:00Z', app_metadata: { provider: 'email', ...app }, user_metadata: { full_name: app.psg ? app.psg.nama : email }, ...extra });
const OWNER = raw('11111111-1111-4111-8111-111111111111', 'owner@psg.test', { roles: ['psg_owner'], psg: { nama: 'Owner Uji', level: 'BD', status: 'aktif' } });
const ADMIN = raw('22222222-2222-4222-8222-222222222222', 'admin@psg.test', { roles: ['psg_admin'], psg: { nama: 'Admin Uji', level: 'BM', status: 'aktif' } });
const ADMIN2 = raw('33333333-3333-4333-8333-333333333333', 'admin2@psg.test', { roles: ['psg_admin'], psg: { nama: 'Admin Dua', level: 'BM', status: 'aktif' } });
const FC = raw('44444444-4444-4444-8444-444444444444', 'fc@psg.test', { roles: [], psg: { nama: 'FC Uji', kodeAgen: 'A1', level: 'FC', status: 'aktif' } });
const FC_BARU = raw('55555555-5555-4555-8555-555555555555', 'fcbaru@psg.test', { roles: [], psg: { nama: 'FC Baru', level: 'FC', status: 'aktif' } }, { confirmed_at: null });
const FC_NONAKTIF = raw('66666666-6666-4666-8666-666666666666', 'fcoff@psg.test', { roles: [], psg: { nama: 'FC Off', level: 'FC', status: 'nonaktif' } });
const LUAR = raw('77777777-7777-4777-8777-777777777777', 'bukan-psg@psg.test', {});
const SEMUA = [FC, OWNER, LUAR, ADMIN, ADMIN2, FC_BARU, FC_NONAKTIF];

let lib;
/* Sesi dari klaim JWT (bentuk User @netlify/identity, camelCase). */
const sesi = (r, appOverride) => ({ id: r.id, email: r.email, appMetadata: appOverride || r.app_metadata, roles: (appOverride || r.app_metadata).roles || [] });
function deps(g, aktor, opsi = {}) {
  return {
    ambilUser: async () => aktor,
    identitas: () => lib.identitasAdmin(opsi.config === undefined ? { url: PREVIEW + '/.netlify/identity', token: OPERATOR } : opsi.config,
      opsi.situs === undefined ? UTAMA : opsi.situs),
    fetch: g.fetch,
  };
}
const minta = (method, body) => new Request(PREVIEW + '/api/psg/agents', {
  method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
async function jalan(g, aktor, method, body, opsi) {
  const r = await lib.tanganiAgents(minta(method, body), deps(g, aktor, opsi));
  return { status: r.status, body: await r.json(), cache: r.headers.get('cache-control') || '' };
}
const lewat = (g, method, p) => g.log.filter((x) => x.method === method && x.path.startsWith(p));

async function main() {
  lib = await import(pathToFileURL(path.join(ROOT, 'netlify/lib/psg-agents.mts')).href);

  console.log('Statis');
  const fn = baca('netlify/functions/psg-agents.mts');
  const kode = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  cek(/getIdentityConfig\(\)/.test(kode(fn)) && /from '@netlify\/identity'/.test(fn), 'function memakai getIdentityConfig() dari @netlify/identity');
  cek(/context\?\.site\?\.url/.test(fn) && /Netlify\.env\.get\('URL'\)/.test(fn) && /process\.env\?\.URL/.test(fn), 'URL Identity diarahkan ke URL utama situs');
  cek(!/clientContext|requestPasswordRecovery|admin\./.test(kode(fn)), 'tanpa clientContext, tanpa requestPasswordRecovery / admin.* berbasis URL konteks');
  cek(/path: '\/api\/psg\/agents'/.test(fn), "endpoint tetap '/api/psg/agents'");
  const libSrc = kode(baca('netlify/lib/psg-agents.mts'));
  cek(/'\/invite'/.test(libSrc) && /'\/recover'/.test(libSrc), 'memakai endpoint resmi /invite dan /recover');
  cek(!/localStorage|sessionStorage/.test(libSrc + fn), 'server tidak menyentuh storage browser');
  const identity = kode(baca('netlify/functions/identity.mts'));
  cek(!/userValidate|userLogin|userSignup/.test(identity), 'identity.mts tanpa hook userValidate/userLogin/userSignup');
  const gate = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/access-gate.js'))).digest('hex');
  cek(gate === JSON.parse(baca('tests/contract-baseline.json')).static.protectedFiles['src/access-gate.js'], 'src/access-gate.js tidak berubah');

  console.log('Alamat Identity');
  cek(lib.alamatSitus(undefined, '', 'bukan url', UTAMA + '/x?y=1') === UTAMA, 'alamatSitus: kandidat sah pertama, hanya origin');
  const id = lib.identitasAdmin({ url: PREVIEW + '/.netlify/identity', token: OPERATOR }, UTAMA);
  cek(id.url === UTAMA + '/.netlify/identity' && id.token === OPERATOR, 'token dari getIdentityConfig, URL dari situs utama (bukan Deploy Preview)', id.url);
  cek(lib.identitasAdmin({ url: UTAMA + '/.netlify/identity/', token: OPERATOR }, null).url === UTAMA + '/.netlify/identity',
    'tanpa URL situs: memakai URL dari getIdentityConfig sebagai cadangan');
  {
    const g = gotrue(SEMUA);
    const r = await jalan(g, sesi(OWNER), 'GET', null, { config: { url: PREVIEW + '/.netlify/identity' } });
    cek(r.status === 503 && r.body.error === 'identity_token_missing' && g.log.length === 0, 'tanpa token operator: 503 jelas, tanpa permintaan', r);
  }

  console.log('Otorisasi');
  {
    const g = gotrue(SEMUA);
    let r = await jalan(g, null, 'GET');
    cek(r.status === 401 && r.body.error === 'unauthenticated' && /no-store/.test(r.cache), 'anonim -> 401 (no-store)', r.status);
    r = await jalan(g, sesi(FC), 'GET');
    cek(r.status === 403 && g.log.length === 0, 'FC/BM/BD tidak bisa membuka Invite Agen (403, tanpa panggilan Identity)', r.status);
    r = await jalan(g, sesi(FC), 'POST', { email: 'x@psg.test', nama: 'X', level: 'FC' });
    cek(r.status === 403 && lewat(g, 'POST', '/invite').length === 0, 'FC tidak bisa mengundang', r.status);
    r = await jalan(g, sesi(LUAR, { provider: 'email', roles: ['psg_admin'] }), 'GET');
    cek(r.status === 403, 'klaim JWT basi (psg_admin dicabut di Identity) -> 403', r.status);
    const g2 = gotrue([...SEMUA, raw('88888888-8888-4888-8888-888888888888', 'adminoff@psg.test', { roles: ['psg_admin'], psg: { nama: 'Admin Off', level: 'BM', status: 'nonaktif' } })]);
    r = await jalan(g2, sesi(g2.users.get('88888888-8888-4888-8888-888888888888')), 'GET');
    cek(r.status === 403 && r.body.error === 'inactive', 'admin nonaktif tidak bisa mengelola', r.body);
  }

  console.log('Daftar agen');
  {
    const g = gotrue(SEMUA);
    const r = await jalan(g, sesi(OWNER), 'GET');
    const emails = (r.body.users || []).map((u) => u.email);
    cek(r.status === 200 && emails[0] === 'owner@psg.test' && emails.slice(1, 3).every((e) => /admin/.test(e)) && !emails.includes('bukan-psg@psg.test') && emails.length === 6,
      'owner: akun PSG saja, urut owner → admin → agen', emails);
    const fc = (r.body.users || []).find((u) => u.email === 'fc@psg.test') || {};
    cek(fc.level === 'FC' && fc.kodeAgen === 'A1' && fc.status === 'aktif' && fc.emailTerkonfirmasi === true && Array.isArray(fc.roles) && !('appMetadata' in fc),
      'jawaban admin API (snake_case) dinormalkan: level/kode/status/konfirmasi terbaca', fc);
    cek(g.log.every((x) => x.host === UTAMA), 'semua permintaan ke Identity situs utama');
  }

  console.log('Undang agen');
  {
    const g = gotrue(SEMUA);
    const r = await jalan(g, sesi(OWNER), 'POST', { email: 'Agen.Baru@PSG.test', nama: 'Agen Baru', kodeAgen: 'B9', level: 'BM', role: 'agent' });
    const inv = lewat(g, 'POST', '/invite');
    const put = g.log.find((x) => x.method === 'PUT');
    cek(r.status === 201 && inv.length === 1 && inv[0].body.email === 'agen.baru@psg.test' && inv[0].auth === 'Bearer ' + OPERATOR,
      'owner mengundang: POST /invite {email} dengan token operator', inv.map((x) => x.body));
    cek(put && put.body.app_metadata.provider === 'email' && JSON.stringify(put.body.app_metadata.roles) === '[]' &&
      JSON.stringify(put.body.app_metadata.psg) === JSON.stringify({ nama: 'Agen Baru', kodeAgen: 'B9', level: 'BM', status: 'aktif' }) &&
      put.body.user_metadata.full_name === 'Agen Baru', 'role & level disimpan di app_metadata (registry PSG), provider tetap', put && put.body);
    cek(r.body.user && r.body.user.level === 'BM' && r.body.user.status === 'aktif' && r.body.user.emailTerkonfirmasi === false,
      'jawaban: profil aman agen undangan', r.body.user);
  }
  {
    const g = gotrue(SEMUA, { invite204: true });
    const r = await jalan(g, sesi(ADMIN), 'POST', { email: 'fc2@psg.test', nama: 'FC Dua', level: 'FC', role: 'agent' });
    cek(r.status === 201 && lewat(g, 'GET', '/admin/users?').length >= 1 && g.log.some((x) => x.method === 'PUT'),
      '/invite 204 tanpa body: akun dicari ulang lalu profil disimpan (admin boleh mengundang FC/BM/BD)', r.status);
  }
  {
    const g = gotrue(SEMUA);
    let r = await jalan(g, sesi(ADMIN), 'POST', { email: 'adm@psg.test', nama: 'Adm', level: 'BM', role: 'psg_admin' });
    cek(r.status === 403 && lewat(g, 'POST', '/invite').length === 0, 'admin tidak bisa mengundang PSG Admin', r.status);
    r = await jalan(g, sesi(OWNER), 'POST', { email: 'adm@psg.test', nama: 'Adm', level: 'BM', role: 'psg_admin' });
    cek(r.status === 201 && JSON.stringify(r.body.user.roles) === '["psg_admin"]', 'owner mengundang PSG Admin', r.body.user);
    r = await jalan(g, sesi(OWNER), 'POST', { email: 'fc@psg.test', nama: 'FC', level: 'FC' });
    cek(r.status === 409 && r.body.error === 'already_exists' && g.log.filter((x) => x.method === 'PUT').length === 1,
      'email sudah terdaftar -> 409, profil tidak ditimpa', r.body);
    r = await jalan(g, sesi(OWNER), 'POST', { email: 'bukan-email', nama: 'X', level: 'FC' });
    cek(r.status === 400 && r.body.error === 'invalid_email', 'email tidak valid -> 400');
    r = await jalan(g, sesi(OWNER), 'POST', { email: 'y@psg.test', nama: 'Y', level: 'XX' });
    cek(r.status === 400 && r.body.error === 'invalid_level', 'level di luar FC/BM/BD -> 400');
  }

  console.log('Ubah agen');
  {
    const g = gotrue(SEMUA);
    const dasar = (u, tambah) => ({ id: u.id, nama: u.app_metadata.psg.nama, kodeAgen: '', level: u.app_metadata.psg.level, status: 'aktif', role: 'agent', ...tambah });
    let r = await jalan(g, sesi(ADMIN), 'PATCH', dasar(FC, { level: 'BM' }));
    cek(r.status === 200 && r.body.user.level === 'BM', 'admin mengubah FC (form selalu mengirim role "agent")', r.body);
    r = await jalan(g, sesi(ADMIN), 'PATCH', dasar(FC, { role: 'psg_admin' }));
    cek(r.status === 403 && r.body.error === 'forbidden_role', 'admin tidak bisa mengubah role sistem', r.body);
    r = await jalan(g, sesi(ADMIN), 'PATCH', dasar(ADMIN2, { role: 'psg_admin' }));
    cek(r.status === 403, 'admin tidak bisa mengelola admin lain', r.status);
    r = await jalan(g, sesi(ADMIN), 'PATCH', dasar(OWNER));
    cek(r.status === 403, 'admin tidak bisa mengelola owner', r.status);
    r = await jalan(g, sesi(OWNER), 'PATCH', dasar(OWNER, { status: 'nonaktif' }));
    cek(r.status === 403 && g.users.get(OWNER.id).app_metadata.psg.status === 'aktif', 'owner tidak bisa menonaktifkan/mengunci akunnya sendiri', r.status);
    r = await jalan(g, sesi(OWNER), 'PATCH', dasar(FC, { status: 'nonaktif' }));
    cek(r.status === 200 && r.body.user.status === 'nonaktif', 'owner menonaktifkan FC', r.body.user);
    r = await jalan(g, sesi(OWNER), 'PATCH', dasar(ADMIN2, { role: 'agent' }));
    cek(r.status === 200 && JSON.stringify(r.body.user.roles) === '[]', 'owner mencabut PSG Admin', r.body.user);
  }

  console.log('Kirim ulang akses');
  {
    const g = gotrue(SEMUA);
    let r = await jalan(g, sesi(ADMIN), 'POST', { action: 'resend_access', id: FC_BARU.id });
    const inv = lewat(g, 'POST', '/invite');
    cek(r.status === 200 && inv.length === 1 && inv[0].body.email === 'fcbaru@psg.test', 'belum menerima undangan -> undangan dikirim ulang (/invite)', r.body);
    r = await jalan(g, sesi(ADMIN), 'POST', { action: 'resend_access', id: FC.id });
    const rec = lewat(g, 'POST', '/recover');
    cek(r.status === 200 && rec.length === 1 && rec[0].body.email === 'fc@psg.test' && !rec[0].auth,
      'akun aktif -> link atur ulang password (/recover, tanpa token operator)', rec);
    r = await jalan(g, sesi(OWNER), 'POST', { action: 'resend_access', id: FC_NONAKTIF.id });
    cek(r.status === 409 && r.body.error === 'inactive', 'akun nonaktif tidak dikirimi link', r.body);
    r = await jalan(g, sesi(ADMIN), 'POST', { action: 'resend_access', id: OWNER.id });
    cek(r.status === 403, 'admin tidak bisa mengirim link ke owner', r.status);
    r = await jalan(g, sesi(OWNER), 'POST', { action: 'resend_access', id: '99999999-9999-4999-8999-999999999999' });
    cek(r.status === 404 && r.body.error === 'not_found', 'agen tidak ditemukan -> 404', r.body);
  }

  console.log('Deploy Preview terlindungi');
  {
    const g = gotrue(SEMUA);
    const r = await jalan(g, sesi(OWNER), 'POST', { email: 'pv@psg.test', nama: 'PV', level: 'FC' }, { situs: null });
    cek(r.status === 502 && g.pelanggaran.length >= 1 && /401/.test(r.body.message),
      'kontrol: tanpa URL utama, permintaan ke Deploy Preview terkena login tim (401 → 502 jelas)', r.body);
    const g2 = gotrue(SEMUA, { lindungi: true });
    const r2 = await jalan(g2, sesi(OWNER), 'GET');
    cek(r2.status === 502 && r2.body.error === 'identity_error' && /HTTP 401/.test(r2.body.message) && /halaman login/.test(r2.body.message),
      'Identity menjawab halaman login: 502 dengan pesan jelas, bukan 401 "belum login"', r2.body);
  }

  console.log('\nAGENT INVITE: ' + (gagal ? 'GAGAL — ' + gagal + ' dari ' + jumlah : 'LULUS — ' + jumlah) + ' pemeriksaan');
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
