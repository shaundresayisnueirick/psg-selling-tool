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
const akun = (id, email, opsi = {}) => ({
  id, email, confirmedAt: opsi.belumKonfirmasi ? undefined : '2026-01-01T00:00:00Z', name: email,
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
    cek(!b.log.some((x) => x.op !== 'get' && x.op !== 'list'), 'permintaan yang ditolak tidak menulis apa pun', b.log);
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
    cek(b.log.filter((x) => x.op !== 'get' && x.op !== 'list').every((x) => x.nama === lib.STORE_PREVIEW), 'semua tulis terjadi di store preview', b.log);
  }

  console.log('Asuransiku: polis');
  {
    const b = blobs();
    const uuid = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
    const P1 = uuid(1), P2 = uuid(2), P3 = uuid(3);
    const polis = (o = {}) => ({
      perusahaan: 'Generali', produk: 'Produk Jiwa A', jenisPolis: 'UNIT_LINK', mulai: '2019-03-01', nomorAkhir: '4821', mataUang: 'IDR',
      perlindungan: [
        { id: uuid(101), peran: 'DASAR', jenis: 'JIWA', manfaat: { up: 1000000000 } },
        { id: uuid(102), peran: 'RIDER', jenis: 'PK', nama: 'Rider PK', manfaat: { up: 500000000, sifat: 'DIPERCEPAT' } },
        { id: uuid(103), peran: 'RIDER', jenis: 'KESEHATAN', nama: 'Rider Kesehatan', manfaat: { sistem: 'TAHUNAN', plan: 'Gold', limitTahunan: 2000000000, limitBooster: 4000000000, syaratBooster: 'Setelah limit dasar habis' } },
      ],
      catatanPribadi: 'Jatuh tempo Maret', ...o,
    });
    const jalur = (id) => '/api/psg/pribadi/polis/' + id;
    let r = await jalan(b, A, 'PUT', jalur(P1), polis());
    cek(r.status === 201 && r.body.polis.id === P1 && r.body.polis.jenisPolis === 'UNIT_LINK' && r.body.polis.perlindungan.length === 3, 'A membuat polis Unit Link dengan rider PK dan kesehatan (201)', r);
    const dibuat = r.body.polis.dibuat;
    r = await jalan(b, A, 'PUT', jalur(P2), polis({ perusahaan: 'Prudential', produk: 'Produk PK B', jenisPolis: 'TRADISIONAL', mulai: '2021-07-15', nomorAkhir: '',
      perlindungan: [{ id: uuid(201), peran: 'DASAR', jenis: 'PK', manfaat: { up: 750000000, sifat: 'BERDIRI_SENDIRI' } }], catatanPribadi: '' }));
    cek(r.status === 201 && r.body.polis.jenisPolis === 'TRADISIONAL' && !('nomorAkhir' in r.body.polis) && !('catatanPribadi' in r.body.polis), 'A membuat polis Tradisional kedua; field opsional kosong tidak disimpan', r.body);
    r = await jalan(b, A, 'PUT', jalur(P3), polis({ perusahaan: 'Perusahaan C', produk: 'Plan Kesehatan', jenisPolis: 'TRADISIONAL', perlindungan: [
      { id: uuid(301), peran: 'DASAR', jenis: 'KESEHATAN', manfaat: { sistem: 'PER_KEJADIAN', limitPerKejadian: 150000000, kamarPerHari: 1500000 } },
      { id: uuid(302), peran: 'RIDER', jenis: 'KESEHATAN', nama: 'Santunan RS', manfaat: { sistem: 'HARIAN', santunanHarian: 500000, maksHari: 180 } },
      { id: uuid(303), peran: 'RIDER', jenis: 'KECELAKAAN', nama: 'Rider Kecelakaan', manfaat: { upMeninggal: 300000000, cacatTetap: 300000000 } },
      { id: uuid(304), peran: 'RIDER', jenis: 'LAINNYA', nama: 'Lainnya', manfaat: { namaJenis: 'Pendidikan', manfaatUtama: 'Dana kuliah', nilai: 200000000 } }] }));
    cek(r.status === 201, 'polis ketiga: limit per kejadian, santunan harian, kecelakaan, dan lainnya diterima', r);
    r = await jalan(b, A, 'GET', '/api/psg/pribadi');
    cek(r.body.polis.length === 3 && r.body.polis[0].id === P1, 'GET mengembalikan 3 polis A', r.body.polis && r.body.polis.map((x) => x.id));

    /* Edit satu polis tidak mengubah polis lain. */
    const sebelumP2 = b.store.get('psg-pribadi-preview').get('u/' + A.id + '/polis/' + P2 + '.json');
    r = await jalan(b, A, 'PUT', jalur(P1), polis({ jenisPolis: 'TRADISIONAL', produk: 'Produk Jiwa A (revisi)' }));
    cek(r.status === 200 && r.body.polis.dibuat === dibuat && r.body.polis.jenisPolis === 'TRADISIONAL', 'edit polis: 200, waktu dibuat dipertahankan, jenis polis ikut diedit', r.body.polis);
    cek(b.store.get('psg-pribadi-preview').get('u/' + A.id + '/polis/' + P2 + '.json') === sebelumP2, 'edit P1 tidak menyentuh berkas P2 (jenis polis P2 tetap)');
    const tulisEdit = b.log.filter((x) => x.op === 'set').slice(-1)[0];
    cek(tulisEdit.key === 'u/' + A.id + '/polis/' + P1 + '.json', 'edit hanya menulis berkas polis yang diedit', tulisEdit);

    /* Pemisahan antar akun. */
    r = await jalan(b, B, 'GET', '/api/psg/pribadi');
    cek(r.status === 200 && r.body.polis.length === 0, 'B tidak memperoleh polis A', r.body);
    r = await jalan(b, B, 'DELETE', jalur(P1));
    cek(r.status === 404, 'B menghapus ID polis milik A: tidak ditemukan di ruang B (404)', r);
    r = await jalan(b, B, 'PUT', jalur(P1), polis({ produk: 'Ditimpa B' }));
    cek(r.status === 201, 'B memakai ID yang sama hanya membuat polis di ruangnya sendiri', r.status);
    r = await jalan(b, A, 'GET', '/api/psg/pribadi');
    cek(r.body.polis.find((x) => x.id === P1).produk === 'Produk Jiwa A (revisi)' && r.body.polis.length === 3, 'polis A tetap utuh sesudah percobaan B', r.body.polis.map((x) => x.produk));
    r = await jalan(b, OWNER, 'GET', '/api/psg/pribadi');
    cek(r.body.polis.length === 0, 'owner tidak otomatis melihat polis agen', r.body.polis);
    r = await jalan(b, B, 'PUT', jalur(uuid(9)), { ...polis(), userId: A.id });
    cek(r.status === 400 && r.body.error === 'unknown_field', 'userId palsu di body polis ditolak', r);

    /* Validasi. */
    const tolak = async (label, isi, kode, id) => {
      const x = await jalan(b, A, 'PUT', jalur(id || uuid(77)), isi);
      cek(x.status === 400 && (!kode || x.body.error === kode), 'ditolak: ' + label, x);
    };
    await tolak('nomor polis lengkap', polis({ nomorAkhir: '1234567890123456' }), 'invalid_policy_number');
    await tolak('nomor polis bukan angka', polis({ nomorAkhir: 'ab12' }), 'invalid_policy_number');
    await tolak('jenis polis kosong', polis({ jenisPolis: '' }), 'required');
    await tolak('jenis polis tidak dikenal', polis({ jenisPolis: 'INVESTASI' }), 'invalid_enum');
    await tolak('tanggal tidak valid', polis({ mulai: '2021-02-30' }), 'invalid_date');
    await tolak('tanggal format lain', polis({ mulai: '01/03/2019' }), 'invalid_date');
    await tolak('tanpa perlindungan dasar', polis({ perlindungan: [{ id: uuid(401), peran: 'RIDER', jenis: 'PK', manfaat: {} }] }), 'base_coverage');
    await tolak('dua perlindungan dasar', polis({ perlindungan: [{ id: uuid(402), peran: 'DASAR', jenis: 'JIWA', manfaat: {} }, { id: uuid(403), peran: 'DASAR', jenis: 'PK', manfaat: {} }] }), 'base_coverage');
    await tolak('rider dengan jenis polis sendiri', polis({ perlindungan: [{ id: uuid(404), peran: 'DASAR', jenis: 'JIWA', manfaat: {} }, { id: uuid(405), peran: 'RIDER', jenis: 'PK', jenisPolis: 'UNIT_LINK', manfaat: {} }] }), 'unknown_field');
    await tolak('11 rider', polis({ perlindungan: [{ id: uuid(500), peran: 'DASAR', jenis: 'JIWA', manfaat: {} }, ...Array.from({ length: 11 }, (_, i) => ({ id: uuid(501 + i), peran: 'RIDER', jenis: 'PK', manfaat: {} }))] }), 'too_many_riders');
    await tolak('UP berupa teks', polis({ perlindungan: [{ id: uuid(601), peran: 'DASAR', jenis: 'JIWA', manfaat: { up: '1000000' } }] }), 'invalid_number');
    await tolak('UP negatif', polis({ perlindungan: [{ id: uuid(602), peran: 'DASAR', jenis: 'JIWA', manfaat: { up: -1 } }] }), 'invalid_number');
    await tolak('field limit tahunan pada sistem harian', polis({ perlindungan: [{ id: uuid(603), peran: 'DASAR', jenis: 'KESEHATAN', manfaat: { sistem: 'HARIAN', limitTahunan: 1 } }] }), 'unknown_field');
    await tolak('kesehatan tanpa sistem', polis({ perlindungan: [{ id: uuid(604), peran: 'DASAR', jenis: 'KESEHATAN', manfaat: {} }] }), 'required');
    await tolak('ID perlindungan ganda', polis({ perlindungan: [{ id: uuid(605), peran: 'DASAR', jenis: 'JIWA', manfaat: {} }, { id: uuid(605), peran: 'RIDER', jenis: 'PK', manfaat: {} }] }), 'duplicate_id');
    await tolak('perusahaan terlalu panjang', polis({ perusahaan: 'x'.repeat(81) }), 'too_long');
    await tolak('catatan pribadi terlalu panjang', polis({ catatanPribadi: 'x'.repeat(501) }), 'too_long');
    await tolak('ID dari body', { ...polis(), id: P2 }, 'unknown_field');
    for (const idJahat of ['..%2F..%2Fpesan', '../pesan', 'abc', uuid(1) + '.json', 'ABCDEF12-0000-4000-8000-0000000000AB']) {
      const x = await jalan(b, A, 'PUT', '/api/psg/pribadi/polis/' + idJahat, polis());
      cek(x.status === 400 || x.status === 404, 'ID polis tidak sah ditolak: ' + idJahat, x.status);
    }
    cek(![...b.store.get('psg-pribadi-preview').keys()].some((k) => /\.\.|polis\/[^/]*\/|pesan\.json\.json/.test(k)), 'tidak ada kunci di luar pola u/<uid>/polis/<uuid>.json');

    /* Batas 30 polis. */
    const C = akun('77777777-1111-4111-8111-777777777777', 'agen.c@psg.test');
    for (let i = 0; i < 30; i++) await jalan(b, C, 'PUT', jalur(uuid(1000 + i)), polis());
    r = await jalan(b, C, 'PUT', jalur(uuid(2000)), polis());
    cek(r.status === 409 && r.body.error === 'too_many_policies', 'polis ke-31 ditolak (409)', r);
    r = await jalan(b, C, 'PUT', jalur(uuid(1000)), polis({ produk: 'Edit tetap boleh' }));
    cek(r.status === 200, 'pada batas 30, edit polis yang ada tetap boleh', r.status);

    /* Hapus. */
    r = await jalan(b, A, 'DELETE', jalur(P2));
    cek(r.status === 200 && r.body.dihapus === P2, 'A menghapus satu polis', r);
    r = await jalan(b, A, 'GET', '/api/psg/pribadi');
    cek(r.body.polis.length === 2 && !r.body.polis.some((x) => x.id === P2), 'polis lain A tetap ada sesudah hapus', r.body.polis.map((x) => x.id));
    r = await jalan(b, A, 'PATCH', jalur(P1), {});
    cek(r.status === 405, 'metode lain pada polis: 405', r.status);
  }

  console.log('Penyimpanan gagal');
  {
    const rusak = { async get() { throw new Error('blobs down'); }, async setJSON() { throw new Error('blobs down'); }, async delete() { throw new Error('blobs down'); }, async list() { throw new Error('blobs down'); } };
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
