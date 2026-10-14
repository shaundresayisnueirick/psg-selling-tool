#!/usr/bin/env node
/* Behavioral test data pribadi agen (/api/psg/pribadi) — tanpa jaringan.

     node tests/psg-pribadi.test.js

   netlify/lib/psg-pribadi.mts dijalankan langsung (Node >= 22.18, type
   stripping). Sesi Identity dan Netlify Blobs diganti tiruan; tidak ada
   permintaan ke store production maupun preview yang sebenarnya. */
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
let gagal = 0, jumlah = 0;
function cek(ok, pesan, detail) {
  jumlah++;
  if (ok) console.log('  ✓ ' + pesan);
  else { gagal++; console.log('  ✗ ' + pesan + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); }
}
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const kode = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const SITUS = 'https://deploy-preview-31--psgproducertools.netlify.app';

/* Akun Identity tiruan, bentuk User @netlify/identity. */
/* opsi.klaim: bentuk yang dikembalikan getUser() bila hanya klaim JWT yang
   terbaca (claimsToUser): tanpa confirmedAt dan tanpa createdAt. */
const akun = (id, email, opsi = {}) => ({
  id, email, confirmedAt: (opsi.belumKonfirmasi || opsi.klaim) ? undefined : '2026-01-01T00:00:00Z',
  createdAt: opsi.klaim ? undefined : '2025-12-01T00:00:00Z', name: email,
  appMetadata: { roles: opsi.roles || [], psg: { level: opsi.level === undefined ? 'FC' : opsi.level, status: opsi.status || 'aktif', nama: email } },
  userMetadata: {},
});
const A = akun('11111111-aaaa-4aaa-8aaa-111111111111', 'agen.a@psg.test');
const B = akun('22222222-bbbb-4bbb-8bbb-222222222222', 'agen.b@psg.test');
const OWNER = akun('33333333-cccc-4ccc-8ccc-333333333333', 'owner@psg.test', { roles: ['psg_owner'], level: null });
const BELUM = akun('44444444-dddd-4ddd-8ddd-444444444444', 'baru@psg.test', { belumKonfirmasi: true });
const NONAKTIF = akun('55555555-eeee-4eee-8eee-555555555555', 'off@psg.test', { status: 'nonaktif' });
const TANPA_HAK = akun('66666666-ffff-4fff-8fff-666666666666', 'tamu@psg.test', { level: null });

/* Netlify Blobs tiruan per nama store. Setiap akses dicatat. */
function blobs() {
  const store = new Map();
  const log = [];
  const buka = (nama) => {
    if (!store.has(nama)) store.set(nama, new Map());
    const m = store.get(nama);
    return {
      async get(key, opsi) { log.push({ nama, op: 'get', key }); const v = m.get(key); return v === undefined ? null : (opsi && opsi.type === 'json' ? JSON.parse(v) : v); },
      async setJSON(key, data) { log.push({ nama, op: 'set', key }); m.set(key, JSON.stringify(data)); return { modified: true }; },
      async delete(key) { log.push({ nama, op: 'delete', key }); m.delete(key); },
      async list(opsi = {}) { log.push({ nama, op: 'list', prefix: opsi.prefix }); return { blobs: [...m.keys()].filter((k) => k.startsWith(opsi.prefix || '')).map((key) => ({ key, etag: '' })), directories: [] }; },
    };
  };
  return { store, log, buka };
}

let lib;
function deps(b, user, nama) {
  const n = nama || lib.STORE_PREVIEW;
  return { ambilUser: async () => user, toko: () => b.buka(n), namaStore: n };
}
function minta(method, jalur, body, opsi = {}) {
  const headers = { 'x-psg-request': '1', origin: SITUS, 'sec-fetch-site': 'same-origin',
    ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(opsi.headers || {}) };
  for (const k of opsi.hapus || []) delete headers[k];
  return new Request(SITUS + jalur, { method, headers, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
}
async function jalan(b, user, method, jalur, body, opsi = {}) {
  const r = await lib.tanganiPribadi(minta(method, jalur, body, opsi), deps(b, user, opsi.store));
  let isi = null; try { isi = await r.json(); } catch (_) {}
  return { status: r.status, body: isi, cache: r.headers.get('cache-control') || '' };
}

async function main() {
  lib = await import(pathToFileURL(path.join(ROOT, 'netlify/lib/psg-pribadi.mts')).href);

  console.log('Statis');
  const fn = baca('netlify/functions/psg-pribadi.mts');
  cek(/from '@netlify\/identity'/.test(fn) && /getUser/.test(kode(fn)), 'function memakai getUser() dari @netlify/identity');
  cek(/from '@netlify\/blobs'/.test(fn) && /getStore\(\{ name: nama, consistency: 'strong' \}\)/.test(fn), 'function memakai getStore Netlify Blobs dengan konsistensi strong');
  cek(/namaStore\(context\?\.deploy\?\.context\)/.test(fn), 'nama store dari context.deploy.context runtime');
  cek(/path: \['\/api\/psg\/pribadi', '\/api\/psg\/pribadi\/\*'\]/.test(fn), 'endpoint /api/psg/pribadi');
  const libSrc = kode(baca('netlify/lib/psg-pribadi.mts'));
  cek(!/localStorage|sessionStorage/.test(libSrc + kode(fn)), 'server tidak menyentuh storage browser');
  cek(!/listStores|getDeployStore/.test(libSrc + kode(fn)), 'tidak ada akses lintas store');
  const pkg = JSON.parse(baca('package.json'));
  cek(pkg.dependencies && /^\^?11\./.test(pkg.dependencies['@netlify/blobs'] || ''), '@netlify/blobs terdaftar sebagai dependensi', pkg.dependencies);
  const sw = baca('sw.js');
  cek(/p === '\/api' \|\| p\.indexOf\('\/api\/'\) === 0/.test(sw), 'service worker tidak meng-cache /api/*');

  console.log('Store per konteks deploy');
  cek(lib.namaStore('production') === 'psg-pribadi', 'production → psg-pribadi');
  for (const k of ['deploy-preview', 'branch-deploy', 'dev', '', undefined, null, 'Production', 'production ']) {
    cek(lib.namaStore(k) === 'psg-pribadi-preview', 'konteks ' + JSON.stringify(k) + ' → psg-pribadi-preview');
  }

  console.log('Sesi dan hak akses');
  {
    const b = blobs();
    let r = await jalan(b, null, 'GET', '/api/psg/pribadi');
    cek(r.status === 401 && r.body.error === 'unauthenticated', 'tanpa sesi: 401', r);
    cek(/no-store/.test(r.cache), 'jawaban no-store', r.cache);
    r = await jalan(b, BELUM, 'GET', '/api/psg/pribadi');
    cek(r.status === 403 && r.body.error === 'email_unverified', 'email belum terkonfirmasi: 403', r);
    r = await jalan(b, NONAKTIF, 'GET', '/api/psg/pribadi');
    cek(r.status === 403 && r.body.error === 'account_inactive', 'akun nonaktif: 403', r);
    r = await jalan(b, TANPA_HAK, 'GET', '/api/psg/pribadi');
    cek(r.status === 403 && r.body.error === 'psg_access_missing', 'tanpa role/jenjang: 403', r);
    r = await jalan(b, { ...A, id: '../owner' }, 'GET', '/api/psg/pribadi');
    cek(r.status === 403 && r.body.error === 'invalid_user', 'user.id tidak sah: 403', r);
    r = await lib.tanganiPribadi(minta('GET', '/api/psg/pribadi'), { ambilUser: async () => { throw new Error('jwt rusak'); }, toko: () => b.buka('x'), namaStore: 'x' });
    cek(r.status === 401, 'getUser melempar: 401', r.status);
    cek(b.log.length === 0, 'permintaan yang ditolak tidak menyentuh penyimpanan', b.log);
  }

  console.log('Pengaman permintaan');
  {
    const b = blobs();
    let r = await jalan(b, A, 'GET', '/api/psg/pribadi', undefined, { hapus: ['x-psg-request'] });
    cek(r.status === 403 && r.body.error === 'request_rejected', 'tanpa X-PSG-Request: 403', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: 'x' }, { headers: { origin: 'https://jahat.example' } });
    cek(r.status === 403 && r.body.error === 'origin_rejected', 'Origin situs lain: 403', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: 'x' }, { headers: { 'sec-fetch-site': 'cross-site' } });
    cek(r.status === 403 && r.body.error === 'cross_site', 'Sec-Fetch-Site cross-site: 403', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: 'x' }, { hapus: ['origin'] });
    cek(r.status === 403 && r.body.error === 'origin_missing', 'tulis tanpa Origin: 403', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: 'x' }, { headers: { 'content-type': 'text/plain' } });
    cek(r.status === 415, 'tulis bukan JSON: 415', r);
    r = await jalan(b, A, 'POST', '/api/psg/pribadi/pesan', { teks: 'x' });
    cek(r.status === 405, 'metode lain: 405', r);
    r = await jalan(b, A, 'GET', '/api/psg/pribadi/../agents');
    cek(r.status === 404 || r.status === 403, 'jalur lain di luar /api/psg/pribadi ditolak', r);
    r = await jalan(b, A, 'GET', '/api/psg/pribadi/semua');
    cek(r.status === 404, 'tidak ada endpoint daftar semua data', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', '{rusak');
    cek(r.status === 400 && r.body.error === 'invalid_json', 'JSON rusak: 400', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', JSON.stringify({ teks: 'x'.repeat(40000) }));
    cek(r.status === 413, 'body > 32 KB: 413', r);
    cek(!b.log.some((x) => x.op !== 'get'), 'permintaan yang ditolak tidak menulis apa pun', b.log);
  }

  console.log('Pesan personal');
  {
    const b = blobs();
    let r = await jalan(b, A, 'GET', '/api/psg/pribadi');
    cek(r.status === 200 && r.body.pesan === null && r.body.penyimpanan === 'preview', 'awal: belum ada pesan, store preview', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: '  Melindungi keluarga adalah komitmen saya.  ' });
    cek(r.status === 200 && r.body.pesan.teks === 'Melindungi keluarga adalah komitmen saya.', 'A menyimpan pesan (dipangkas)', r);
    r = await jalan(b, B, 'PUT', '/api/psg/pribadi/pesan', { teks: 'Pesan milik B' });
    cek(r.status === 200, 'B menyimpan pesannya sendiri');
    r = await jalan(b, A, 'GET', '/api/psg/pribadi');
    cek(r.body.pesan.teks === 'Melindungi keluarga adalah komitmen saya.', 'A membaca pesannya sendiri, bukan milik B', r.body);
    r = await jalan(b, B, 'GET', '/api/psg/pribadi');
    cek(r.body.pesan.teks === 'Pesan milik B', 'B tidak memperoleh pesan A', r.body);
    r = await jalan(b, OWNER, 'GET', '/api/psg/pribadi');
    cek(r.status === 200 && r.body.pesan === null, 'owner tidak otomatis melihat pesan agen', r.body);
    r = await jalan(b, B, 'PUT', '/api/psg/pribadi/pesan', { teks: 'menimpa A', userId: A.id });
    cek(r.status === 400 && r.body.error === 'unknown_field', 'userId palsu di body ditolak', r);
    r = await jalan(b, B, 'PUT', '/api/psg/pribadi/pesan', { teks: 'menimpa A', email: A.email });
    cek(r.status === 400, 'email palsu di body ditolak', r);
    r = await jalan(b, A, 'GET', '/api/psg/pribadi');
    cek(r.body.pesan.teks === 'Melindungi keluarga adalah komitmen saya.', 'pesan A tetap utuh sesudah percobaan B', r.body);
    const kunci = [...b.store.get('psg-pribadi-preview').keys()].sort();
    cek(JSON.stringify(kunci) === JSON.stringify(['u/' + A.id + '/pesan.json', 'u/' + B.id + '/pesan.json']), 'kunci penyimpanan per user.id', kunci);

    const panjang = 'Kata' + 'x'.repeat(276);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: panjang });
    cek(r.status === 200 && r.body.pesan.teks.length === 280, '280 karakter diterima', r.body && r.body.pesan && r.body.pesan.teks.length);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: panjang + 'y' });
    cek(r.status === 400 && r.body.error === 'too_long', '281 karakter ditolak', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: 123 });
    cek(r.status === 400 && r.body.error === 'invalid_field', 'teks bukan string ditolak', r);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: 'Baris 1\r\n\r\n\r\n\r\nBaris 2\u0007' });
    cek(r.status === 200 && r.body.pesan.teks === 'Baris 1\n\nBaris 2', 'baris baru dirapikan, karakter kontrol dibuang', r.body);
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: '<img src=x onerror=alert(1)>' });
    cek(r.status === 200 && r.body.pesan.teks === '<img src=x onerror=alert(1)>', 'teks disimpan apa adanya (di-escape saat ditampilkan)');
    r = await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: '   ' });
    cek(r.status === 200 && r.body.pesan === null, 'pesan kosong menghapus data', r.body);
    r = await jalan(b, A, 'GET', '/api/psg/pribadi');
    cek(r.body.pesan === null, 'sesudah dikosongkan: tidak ada pesan', r.body);
    r = await jalan(b, B, 'GET', '/api/psg/pribadi');
    cek(r.body.pesan.teks === 'Pesan milik B', 'mengosongkan pesan A tidak menyentuh B', r.body);
  }

  console.log('Pemisahan store production dan preview');
  {
    const b = blobs();
    await jalan(b, A, 'PUT', '/api/psg/pribadi/pesan', { teks: 'Pesan uji di preview' }, { store: lib.STORE_PREVIEW });
    let r = await jalan(b, A, 'GET', '/api/psg/pribadi', undefined, { store: lib.STORE_PRODUKSI });
    cek(r.body.pesan === null && r.body.penyimpanan === 'production', 'data preview tidak terbaca dari store production', r.body);
    cek(!b.store.has(lib.STORE_PRODUKSI) || b.store.get(lib.STORE_PRODUKSI).size === 0, 'store production tetap kosong sesudah uji preview');
    cek(b.log.filter((x) => x.op !== 'get').every((x) => x.nama === lib.STORE_PREVIEW), 'semua tulis terjadi di store preview', b.log);
  }

  console.log('Konfirmasi email bila getUser() hanya membaca klaim JWT (kasus Deploy Preview)');
  {
    const b = blobs();
    const OWNER_KLAIM = akun('88888888-aaaa-4aaa-8aaa-888888888888', 'erwin@psg.test', { roles: ['psg_owner'], level: 'BD', klaim: true });
    const panggil = [];
    const dengan = (hasil, user = OWNER_KLAIM) => ({ ambilUser: async () => user, toko: () => b.buka(lib.STORE_PREVIEW), namaStore: lib.STORE_PREVIEW,
      cekKonfirmasi: async (uid) => { panggil.push(uid); if (hasil instanceof Error) throw hasil; return hasil; } });
    const kirim = async (d, method = 'GET', jalur = '/api/psg/pribadi', body) => {
      const r = await lib.tanganiPribadi(minta(method, jalur, body), d); let isi = null; try { isi = await r.json(); } catch (_) {} return { status: r.status, body: isi };
    };
    let r = await kirim({ ambilUser: async () => OWNER_KLAIM, toko: () => b.buka(lib.STORE_PREVIEW), namaStore: lib.STORE_PREVIEW });
    cek(r.status === 403 && r.body.error === 'email_unverified', 'REPRODUKSI: owner klaim-saja tanpa verifikasi ulang ditolak email_unverified (perilaku #31 sebelum perbaikan)', r);
    r = await kirim(dengan('ya'));
    cek(r.status === 200 && panggil.slice(-1)[0] === OWNER_KLAIM.id, 'owner klaim-saja + Identity menyatakan terkonfirmasi: 200, dicek dengan user.id hasil verifikasi', r);
    r = await kirim(dengan('ya'), 'PUT', '/api/psg/pribadi/pesan', { teks: 'Pesan owner' });
    cek(r.status === 200 && r.body.pesan.teks === 'Pesan owner', 'owner klaim-saja bisa menyimpan pesan', r);
    r = await kirim(dengan('tidak'));
    cek(r.status === 403 && r.body.error === 'email_unverified', 'Identity menyatakan belum terkonfirmasi: 403', r);
    r = await kirim(dengan('sesi-tidak-sah'));
    cek(r.status === 401 && r.body.error === 'unauthenticated', 'token ditolak Identity: 401', r);
    r = await kirim(dengan('gagal'));
    cek(r.status === 503 && r.body.error === 'identity_unavailable', 'Identity tidak terjangkau: 503 (bukan "belum terkonfirmasi")', r);
    r = await kirim(dengan(new Error('putus')));
    cek(r.status === 503 && r.body.error === 'identity_unavailable', 'cekKonfirmasi melempar: 503', r);
    const n = panggil.length;
    r = await kirim(dengan('ya', BELUM));
    cek(r.status === 403 && r.body.error === 'email_unverified' && panggil.length === n, 'profil lengkap dari GoTrue tanpa confirmed_at: 403 tanpa verifikasi ulang', r);
    r = await kirim(dengan('ya', A));
    cek(r.status === 200 && panggil.length === n, 'profil lengkap terkonfirmasi: tidak memanggil verifikasi ulang', r.status);
    r = await kirim(dengan('ya', akun('99999999-aaaa-4aaa-8aaa-999999999999', 'x@psg.test', { level: null, klaim: true })));
    cek(r.status === 403 && r.body.error === 'psg_access_missing', 'klaim-saja terkonfirmasi tetapi tanpa hak PSG: 403', r);
    r = await kirim(dengan('ya', akun('99999999-bbbb-4bbb-8bbb-999999999999', 'y@psg.test', { status: 'nonaktif', klaim: true })));
    cek(r.status === 403 && r.body.error === 'account_inactive', 'klaim-saja terkonfirmasi tetapi nonaktif: 403', r);
  }

  console.log('cekKonfirmasiIdentity dan tokenSesi');
  {
    const UTAMA = 'https://psgproducertools.netlify.app';
    const jejak = [];
    const fetchPalsu = (status, isi, ct = 'application/json') => async (url, init) => { jejak.push({ url, auth: init.headers.Authorization });
      if (status === 0) throw new Error('jaringan'); return new Response(typeof isi === 'string' ? isi : JSON.stringify(isi), { status, headers: { 'content-type': ct } }); };
    const uid = '88888888-aaaa-4aaa-8aaa-888888888888';
    cek(await lib.cekKonfirmasiIdentity(UTAMA, 'tok', uid, fetchPalsu(200, { id: uid, confirmed_at: '2026-01-01T00:00:00Z' })) === 'ya', 'Identity 200 + confirmed_at: ya');
    cek(jejak[0].url === UTAMA + '/.netlify/identity/user' && jejak[0].auth === 'Bearer tok', 'memanggil /.netlify/identity/user di URL utama dengan token sesi', jejak[0]);
    cek(await lib.cekKonfirmasiIdentity(UTAMA + '/', 'tok', uid, fetchPalsu(200, { id: uid })) === 'tidak', 'Identity 200 tanpa confirmed_at: tidak');
    cek(await lib.cekKonfirmasiIdentity(UTAMA, 'tok', uid, fetchPalsu(200, { id: 'akun-lain', confirmed_at: 'x' })) === 'sesi-tidak-sah', 'ID dari Identity berbeda dengan user.id: sesi-tidak-sah');
    cek(await lib.cekKonfirmasiIdentity(UTAMA, 'tok', uid, fetchPalsu(401, { code: 401, msg: 'Invalid token' })) === 'sesi-tidak-sah', 'Identity 401 JSON: sesi-tidak-sah');
    cek(await lib.cekKonfirmasiIdentity(UTAMA, 'tok', uid, fetchPalsu(401, '<html>Log in to Netlify</html>', 'text/html')) === 'gagal', 'halaman login tim Netlify (401 HTML): gagal, bukan sesi tidak sah');
    cek(await lib.cekKonfirmasiIdentity(UTAMA, 'tok', uid, fetchPalsu(500, {})) === 'gagal', 'Identity 500: gagal');
    cek(await lib.cekKonfirmasiIdentity(UTAMA, 'tok', uid, fetchPalsu(0)) === 'gagal', 'jaringan putus: gagal');
    cek(await lib.cekKonfirmasiIdentity(UTAMA, '', uid, fetchPalsu(200, {})) === 'sesi-tidak-sah', 'tanpa token: sesi-tidak-sah');
    cek(await lib.cekKonfirmasiIdentity(null, 'tok', uid, fetchPalsu(200, {})) === 'gagal', 'tanpa URL utama: gagal');
    cek(lib.tokenSesi(new Request(UTAMA, { headers: { authorization: 'Bearer abc.def.ghi' } })) === 'abc.def.ghi', 'tokenSesi dari header Authorization');
    cek(lib.tokenSesi(new Request(UTAMA, { headers: { cookie: 'a=1; nf_jwt=xyz%2E1; b=2' } })) === 'xyz.1', 'tokenSesi dari cookie nf_jwt');
    cek(lib.tokenSesi(new Request(UTAMA)) === '', 'tanpa token: kosong');
    const fnSrc = kode(baca('netlify/functions/psg-pribadi.mts'));
    cek(/cekKonfirmasi: \(userId\) => cekKonfirmasiIdentity\(urlUtamaSitus\(context\), tokenSesi\(req\), userId\)/.test(fnSrc) && /context\?\.site\?\.url/.test(fnSrc), 'function memverifikasi ulang lewat URL utama situs');
  }

  console.log('Penyimpanan gagal');
  {
    const rusak = { async get() { throw new Error('blobs down'); }, async setJSON() { throw new Error('blobs down'); }, async delete() { throw new Error('blobs down'); } };
    let r = await lib.tanganiPribadi(minta('GET', '/api/psg/pribadi'), { ambilUser: async () => A, toko: () => rusak, namaStore: 'x' });
    let isi = await r.json();
    cek(r.status === 503 && isi.error === 'storage_unavailable' && !/blobs down/.test(JSON.stringify(isi)), 'Blobs gagal: 503 tanpa membocorkan detail', isi);
    r = await lib.tanganiPribadi(minta('PUT', '/api/psg/pribadi/pesan', { teks: 'x' }), { ambilUser: async () => A, toko: () => rusak, namaStore: 'x' });
    cek(r.status === 503, 'simpan gagal: 503 (browser menampilkan status dan tombol coba lagi)');
  }

  console.log('\n' + (gagal ? 'GAGAL ' + gagal + ' dari ' + jumlah : 'LULUS ' + jumlah + '/' + jumlah));
  process.exit(gagal ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
