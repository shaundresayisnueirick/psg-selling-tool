#!/usr/bin/env node
'use strict';
/* API Pusat Informasi: role, publikasi, lampiran privat, dan isolasi Blob. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = path.join(__dirname, '..');
const OWNER = { id: '11111111-1111-4111-8111-111111111111', email: 'owner@psg.test', confirmedAt: '2026-01-01', appMetadata: { roles: ['psg_owner'], psg: { level: 'BD', status: 'aktif' } } };
const MEMBER = { id: '22222222-2222-4222-8222-222222222222', email: 'member@psg.test', confirmedAt: '2026-01-01', appMetadata: { roles: [], psg: { level: 'FC', status: 'aktif' } } };
const ANON = null;
const UUIDS = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
let checks = 0;
async function test(name, fn) { await fn(); console.log('PASS ' + (++checks) + '. ' + name); }
function fixture(session, name = 'psg-informasi-preview', maps = new Map()) {
  if (!maps.has(name)) maps.set(name, new Map());
  const data = maps.get(name);
  return {
    data,
    deps: {
      ambilUser: async () => session,
      namaStore: name,
      sekarang: () => new Date('2026-10-15T04:00:00.000Z'),
      uuid: (() => { let i = 0; return () => UUIDS[i++] || 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; })(),
      toko: () => ({
        async get(key, options) {
          if (options.type === 'json') return data.has(key) ? structuredClone(data.get(key)) : null;
          return data.has(key) ? new Uint8Array(data.get(key)) : null;
        },
        async setJSON(key, value) { data.set(key, structuredClone(value)); },
        async set(key, value) { data.set(key, new Uint8Array(value)); },
        async delete(key) { data.delete(key); },
        async list(options) { return { blobs: [...data.keys()].filter((key) => key.startsWith(options.prefix)).map((key) => ({ key })) }; },
      }),
    },
  };
}
function req(pathname, { method = 'GET', body, multipart } = {}) {
  const headers = { 'x-psg-request': '1', origin: 'https://psg.test', 'sec-fetch-site': 'same-origin' };
  if (body) headers['content-type'] = 'application/json';
  if (multipart) headers['content-type'] = 'multipart/form-data';
  return new Request('https://psg.test' + pathname, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), ...(multipart ? { body: multipart } : {}) });
}
const payload = (status = 'draft') => ({ judul: 'Pengumuman uji', kategori: 'Training', tanggal: '2026-10-15', isi: 'Isi informasi untuk anggota.', status });

async function main() {
  const mod = await import(pathToFileURL(path.join(ROOT, 'netlify/lib/psg-informasi.mts')).href);
  const { tanganiInformasi, namaStoreInformasi, STORE_PRODUKSI, STORE_PREVIEW } = mod;
  await test('hanya production context persis memilih store Production; Deploy Preview/default memilih store Preview', async () => {
    assert.equal(namaStoreInformasi('production'), STORE_PRODUKSI);
    for (const context of ['deploy-preview', 'branch-deploy', 'dev', undefined, null, 'Production']) assert.equal(namaStoreInformasi(context), STORE_PREVIEW);
  });
  await test('anggota tanpa sesi tidak dapat membaca informasi', async () => {
    const r = await tanganiInformasi(req('/api/psg/informasi'), fixture(ANON).deps); assert.equal(r.status, 401);
  });
  await test('akun aktif dengan level PSG dapat membaca daftar informasi', async () => {
    const r = await tanganiInformasi(req('/api/psg/informasi'), fixture(MEMBER).deps); assert.equal(r.status, 200);
  });
  await test('non-owner ditolak membuat konten oleh backend', async () => {
    const f = fixture(MEMBER); const r = await tanganiInformasi(req('/api/psg/informasi', { method: 'POST', body: payload() }), f.deps);
    assert.equal(r.status, 403); assert.equal(f.data.size, 0);
  });
  await test('email belum terkonfirmasi ditolak', async () => {
    const f = fixture({ ...OWNER, confirmedAt: null }); const r = await tanganiInformasi(req('/api/psg/informasi', { method: 'POST', body: payload() }), f.deps);
    assert.equal(r.status, 403); assert.equal(f.data.size, 0);
  });
  await test('klaim sesi Preview tanpa confirmedAt harus diverifikasi ke Identity', async () => {
    const claimsOnly = { ...OWNER, confirmedAt: undefined, createdAt: undefined };
    const verified = fixture(claimsOnly); verified.deps.cekKonfirmasi = async () => 'ya';
    assert.equal((await tanganiInformasi(req('/api/psg/informasi'), verified.deps)).status, 200);
    const rejected = fixture(claimsOnly); rejected.deps.cekKonfirmasi = async () => 'tidak';
    assert.equal((await tanganiInformasi(req('/api/psg/informasi'), rejected.deps)).status, 403);
  });
  let f = fixture(OWNER), created;
  await test('owner dapat menyimpan draft, dengan kunci server-generated', async () => {
    const r = await tanganiInformasi(req('/api/psg/informasi', { method: 'POST', body: payload() }), f.deps); created = await r.json();
    assert.equal(r.status, 201); assert.equal(created.informasi.status, 'draft'); assert.match(created.informasi.id, /^[0-9a-f-]{36}$/);
  });
  await test('anggota tidak melihat draft di daftar maupun detail', async () => {
    const list = await tanganiInformasi(req('/api/psg/informasi'), fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, f.data]])).deps);
    const detail = await tanganiInformasi(req('/api/psg/informasi/' + created.informasi.id), fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, f.data]])).deps);
    assert.equal((await list.json()).informasi.length, 0); assert.equal(detail.status, 404);
  });
  await test('owner dapat mengubah draft menjadi published', async () => {
    const r = await tanganiInformasi(req('/api/psg/informasi/' + created.informasi.id, { method: 'PUT', body: payload('published') }), f.deps);
    assert.equal(r.status, 200); assert.equal((await r.json()).informasi.status, 'published');
  });
  await test('anggota melihat konten published dan filter kategori berfungsi', async () => {
    const member = fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, f.data]]));
    const list = await tanganiInformasi(req('/api/psg/informasi'), member.deps); const filtered = await tanganiInformasi(req('/api/psg/informasi?kategori=Training'), member.deps);
    assert.equal((await list.json()).informasi.length, 1); assert.equal((await filtered.json()).informasi[0].kategori, 'Training');
  });
  await test('anggota biasa tidak dapat mengedit konten terbit', async () => {
    const member = fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, f.data]]));
    const r = await tanganiInformasi(req('/api/psg/informasi/' + created.informasi.id, { method: 'PUT', body: payload('archived') }), member.deps);
    assert.equal(r.status, 403);
    const ownerRead = await tanganiInformasi(req('/api/psg/informasi/' + created.informasi.id), f.deps);
    assert.equal((await ownerRead.json()).informasi.status, 'published');
  });
  await test('owner dapat mengarsipkan; anggota tidak melihat arsip', async () => {
    const r = await tanganiInformasi(req('/api/psg/informasi/' + created.informasi.id, { method: 'PUT', body: payload('archived') }), f.deps); assert.equal(r.status, 200);
    const member = fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, f.data]])); const list = await tanganiInformasi(req('/api/psg/informasi'), member.deps);
    const ownerList = await tanganiInformasi(req('/api/psg/informasi?admin=1'), f.deps);
    assert.equal((await list.json()).informasi.length, 0); assert.equal((await ownerList.json()).informasi[0].status, 'archived');
  });
  await test('preview dan production memakai namespace store terpisah', async () => {
    const maps = new Map([[STORE_PREVIEW, new Map()], [STORE_PRODUKSI, new Map()]]);
    const preview = fixture(OWNER, STORE_PREVIEW, maps); const prod = fixture(OWNER, STORE_PRODUKSI, maps);
    const r = await tanganiInformasi(req('/api/psg/informasi', { method: 'POST', body: payload() }), preview.deps); assert.equal(r.status, 201);
    assert.equal(maps.get(STORE_PREVIEW).size, 1); assert.equal(maps.get(STORE_PRODUKSI).size, 0);
  });
  const uploadFixture = fixture(OWNER);
  const made = await tanganiInformasi(req('/api/psg/informasi', { method: 'POST', body: payload('published') }), uploadFixture.deps);
  const info = (await made.json()).informasi;
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  await test('owner dapat mengunggah flyer PNG ke Blob privat', async () => {
    const data = new FormData(); data.append('file', new File([pngBytes], 'flyer.png', { type: 'image/png' }));
    const requestUpload = new Request('https://psg.test/api/psg/informasi/' + info.id + '/lampiran', { method: 'POST', headers: { 'x-psg-request': '1', origin: 'https://psg.test', 'sec-fetch-site': 'same-origin' }, body: data });
    const r = await tanganiInformasi(requestUpload, uploadFixture.deps); assert.equal(r.status, 201);
    assert([...uploadFixture.data.keys()].some((key) => key.startsWith('lampiran/')));
  });
  const uploaded = await tanganiInformasi(req('/api/psg/informasi/' + info.id), uploadFixture.deps); const fileId = (await uploaded.json()).informasi.lampiran[0].id;
  await test('anggota login dapat membaca lampiran published lewat endpoint privat', async () => {
    const member = fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, uploadFixture.data]]));
    const r = await tanganiInformasi(req('/api/psg/informasi/' + info.id + '/lampiran/' + fileId), member.deps);
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/png'); assert.equal(r.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [...pngBytes]);
  });
  await test('unduh lampiran memakai Content-Disposition attachment', async () => {
    const r = await tanganiInformasi(req('/api/psg/informasi/' + info.id + '/lampiran/' + fileId + '?download=1'), fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, uploadFixture.data]])).deps);
    assert.match(r.headers.get('content-disposition'), /^attachment;/);
  });
  await test('non-owner ditolak upload dan hapus lampiran', async () => {
    const member = fixture(MEMBER, STORE_PREVIEW, new Map([[STORE_PREVIEW, uploadFixture.data]]));
    const data = new FormData(); data.append('file', new File([pngBytes], 'another.png', { type: 'image/png' }));
    const post = new Request('https://psg.test/api/psg/informasi/' + info.id + '/lampiran', { method: 'POST', headers: { 'x-psg-request': '1', origin: 'https://psg.test' }, body: data });
    const del = req('/api/psg/informasi/' + info.id + '/lampiran/' + fileId, { method: 'DELETE' });
    assert.equal((await tanganiInformasi(post, member.deps)).status, 403); assert.equal((await tanganiInformasi(del, member.deps)).status, 403);
  });
  await test('tipe file yang tidak didukung ditolak tanpa menyimpan blob', async () => {
    const before = uploadFixture.data.size; const data = new FormData(); data.append('file', new File(['not a PDF'], 'fake.pdf', { type: 'application/pdf' }));
    const r = await tanganiInformasi(new Request('https://psg.test/api/psg/informasi/' + info.id + '/lampiran', { method: 'POST', headers: { 'x-psg-request': '1', origin: 'https://psg.test' }, body: data }), uploadFixture.deps);
    assert.equal(r.status, 400); assert.equal(uploadFixture.data.size, before);
  });
  await test('owner dapat menghapus lampiran dari konten', async () => {
    const r = await tanganiInformasi(req('/api/psg/informasi/' + info.id + '/lampiran/' + fileId, { method: 'DELETE' }), uploadFixture.deps);
    assert.equal(r.status, 200); assert.equal(uploadFixture.data.has('lampiran/' + info.id + '/' + fileId), false);
  });
  await test('regresi 503: simpan draft + upload JPEG memakai pembuat UUID bawaan runtime (tanpa deps.uuid)', async () => {
    const g = fixture(OWNER); delete g.deps.uuid;
    const r = await tanganiInformasi(req('/api/psg/informasi', { method: 'POST', body: payload('draft') }), g.deps);
    assert.equal(r.status, 201); const b = await r.json();
    assert.match(b.informasi.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); assert.equal(b.informasi.status, 'draft');
    const d = new FormData(); d.append('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'flyer.jpg', { type: 'image/jpeg' }));
    const u = await tanganiInformasi(new Request('https://psg.test/api/psg/informasi/' + b.informasi.id + '/lampiran', { method: 'POST', headers: { 'x-psg-request': '1', origin: 'https://psg.test' }, body: d }), g.deps);
    assert.equal(u.status, 201); assert.equal((await u.json()).lampiran.tipe, 'image/jpeg');
  });
  await test('galat storage tak terduga: 503 generik tanpa membocorkan detail', async () => {
    const g = fixture(OWNER); const toko = g.deps.toko(); g.deps.toko = () => ({ ...toko, setJSON: async () => { throw new Error('SECRET-TOKEN-xyz at /var/task/x.js'); } });
    const orig = console.error; let log = ''; console.error = (...a) => { log += a.join(' '); };
    const r = await tanganiInformasi(req('/api/psg/informasi', { method: 'POST', body: payload() }), g.deps); console.error = orig;
    const t = await r.text(); assert.equal(r.status, 503); assert.ok(!/SECRET|var\/task/.test(t + log));
  });
  /* ---------- Badge belum dibaca ---------- */
  const MEMBER2 = { id: '33333333-3333-4333-8333-333333333333', email: 'member2@psg.test', confirmedAt: '2026-01-01', appMetadata: { roles: [], psg: { level: 'FC', status: 'aktif' } } };
  const maps = new Map(); const u = (() => { let n = 0; return () => '1000000' + (n++) + '-0000-4000-8000-000000000000'; })();
  const dep = (user) => { const g = fixture(user, 'psg-informasi-preview', maps); g.deps.uuid = u; return g.deps; };
  const call = async (user, p, o) => { const r = await tanganiInformasi(req(p, o), dep(user)); return { status: r.status, body: await r.json() }; };
  const buat = async (status) => (await call(OWNER, '/api/psg/informasi', { method: 'POST', body: payload(status) })).body.informasi.id;
  const iD = await buat('draft'), iA = await buat('published'), iB = await buat('published'), iX = await buat('archived');
  await test('badge: hanya Published yang dihitung (Draft/Archived tidak)', async () => {
    const r = await call(MEMBER, '/api/psg/informasi/belum-dibaca'); assert.equal(r.status, 200);
    assert.equal(r.body.jumlah, 2); assert.deepEqual([...r.body.ids].sort(), [iA, iB].sort());
  });
  await test('membuka daftar/panel tidak menandai dibaca', async () => {
    await call(MEMBER, '/api/psg/informasi'); await call(MEMBER, '/api/psg/informasi');
    assert.equal((await call(MEMBER, '/api/psg/informasi/belum-dibaca')).body.jumlah, 2);
  });
  await test('membaca satu per satu mengurangi badge; ulang tidak mengurangi dua kali', async () => {
    let r = await call(MEMBER, '/api/psg/informasi/' + iA + '/dibaca', { method: 'POST' }); assert.equal(r.body.jumlah, 1);
    r = await call(MEMBER, '/api/psg/informasi/' + iA + '/dibaca', { method: 'POST' }); assert.equal(r.body.jumlah, 1);
    r = await call(MEMBER, '/api/psg/informasi/' + iB + '/dibaca', { method: 'POST' }); assert.equal(r.body.jumlah, 0);
  });
  await test('persisten (refresh/login ulang): yang sudah dibaca tidak muncul lagi', async () => {
    const r = await call(MEMBER, '/api/psg/informasi/belum-dibaca'); assert.equal(r.body.jumlah, 0); assert.deepEqual(r.body.ids, []);
  });
  await test('status baca terpisah per anggota', async () => {
    assert.equal((await call(MEMBER2, '/api/psg/informasi/belum-dibaca')).body.jumlah, 2);
    await call(MEMBER2, '/api/psg/informasi/' + iA + '/dibaca', { method: 'POST' });
    assert.equal((await call(MEMBER2, '/api/psg/informasi/belum-dibaca')).body.jumlah, 1);
    assert.equal((await call(MEMBER, '/api/psg/informasi/belum-dibaca')).body.jumlah, 0);
  });
  await test('publikasi baru menambah badge; Draft yang dipublikasikan menghitung', async () => {
    const iC = await buat('published'); assert.equal((await call(MEMBER, '/api/psg/informasi/belum-dibaca')).body.jumlah, 1);
    await call(OWNER, '/api/psg/informasi/' + iD, { method: 'PUT', body: payload('published') });
    const r = await call(MEMBER, '/api/psg/informasi/belum-dibaca'); assert.equal(r.body.jumlah, 2); assert.ok(r.body.ids.includes(iC) && r.body.ids.includes(iD));
  });
  await test('diarsipkan keluar dari hitungan; Draft/Archived tidak bisa ditandai', async () => {
    const r = await call(MEMBER, '/api/psg/informasi/' + iX + '/dibaca', { method: 'POST' }); assert.equal(r.status, 404);
    await call(OWNER, '/api/psg/informasi/' + iD, { method: 'PUT', body: payload('archived') });
    assert.equal((await call(MEMBER, '/api/psg/informasi/belum-dibaca')).body.jumlah, 1);
  });
  await test('keamanan: tanpa sesi 401, tanpa header X-PSG-Request 403, id dari klien tidak dipakai', async () => {
    assert.equal((await call(ANON, '/api/psg/informasi/belum-dibaca')).status, 401);
    const bad = await tanganiInformasi(new Request('https://psg.test/api/psg/informasi/' + iB + '/dibaca', { method: 'POST', headers: { origin: 'https://psg.test' } }), dep(MEMBER)); assert.equal(bad.status, 403);
    const g = fixture(MEMBER, 'psg-informasi-preview', maps); const raw = [...g.data.keys()].filter((k) => k.startsWith('dibaca/'));
    assert.deepEqual(raw.sort(), ['dibaca/' + MEMBER.id + '.json', 'dibaca/' + MEMBER2.id + '.json'].sort());
  });
  console.log(`\n${checks} assertion PASS`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
