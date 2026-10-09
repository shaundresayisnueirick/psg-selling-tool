#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
let tanganiOwnerProfile;
const OWNER = { id: 'owner-1', email: 'owner@psg.test', confirmedAt: '2026-10-01', appMetadata: { roles: ['psg_owner'], psg: {} } };
const NON_OWNER = { id: 'agent-1', email: 'agent@psg.test', appMetadata: { roles: [], psg: { level: 'BM' } } };
const request = (method, body) => new Request('https://psg.test/api/psg/profile-setup', {
  method, headers: { origin: 'https://psg.test', ...(body ? { 'content-type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});
const rawUser = (app = { roles: ['psg_owner'], psg: { status: 'aktif', catatan: 'keep' }, provider: 'email' }) => ({
  id: 'owner-1', email: 'owner@psg.test', confirmed_at: '2026-10-01T00:00:00Z',
  app_metadata: app, user_metadata: { full_name: 'Erwin Effendi', hp_lokal: 'never-server' }
});

let checks = 0;
async function expect(label, fn) {
  const result = await fn(); checks++; console.log('PASS ' + checks + '. ' + label); return result;
}
function makeDeps({ session = OWNER, saved = rawUser() } = {}) {
  let state = structuredClone(saved);
  const calls = [];
  return {
    calls,
    get state() { return state; },
    deps: {
      ambilUser: async () => session,
      identitas: () => ({ url: 'https://psg.test/.netlify/identity', token: 'server-token' }),
      fetch: async (url, init = {}) => {
        calls.push({ url: String(url), method: init.method || 'GET', body: init.body && JSON.parse(init.body) });
        if ((init.method || 'GET') === 'GET') return Response.json(state);
        const b = JSON.parse(init.body);
        state = { ...state, app_metadata: b.app_metadata, user_metadata: b.user_metadata };
        return Response.json(state);
      }
    }
  };
}

async function main() {
  ({ tanganiOwnerProfile } = await import(pathToFileURL(path.join(ROOT, 'netlify/lib/psg-owner-profile.mts')).href));
let r = await expect('hanya menerima POST', async () => tanganiOwnerProfile(request('GET'), makeDeps().deps));
assert.equal(r.status, 405);

r = await expect('anonim ditolak tanpa perubahan Identity', async () => tanganiOwnerProfile(request('POST', { kodeAgen: '68073640', level: 'BD' }), makeDeps({ session: null }).deps));
assert.equal(r.status, 401);

const nonOwnerDeps = makeDeps({ session: NON_OWNER });
r = await expect('agen biasa ditolak sebagai non-owner', async () => tanganiOwnerProfile(request('POST', { kodeAgen: 'TEST123', level: 'BM' }), nonOwnerDeps.deps));
assert.equal(r.status, 403); assert.equal(nonOwnerDeps.calls.length, 0);

const tamperDeps = makeDeps();
r = await expect('permintaan tidak dapat mengganti role, status, atau nama', async () => tanganiOwnerProfile(request('POST', { kodeAgen: '68073640', level: 'BD', roles: ['psg_admin'] }), tamperDeps.deps));
assert.equal(r.status, 400); assert.equal(tamperDeps.calls.length, 0);

const staleOwnerDeps = makeDeps({ saved: rawUser({ roles: [], psg: { status: 'aktif' } }) });
r = await expect('role owner diverifikasi ulang terhadap Identity terbaru', async () => tanganiOwnerProfile(request('POST', { kodeAgen: '68073640', level: 'BD' }), staleOwnerDeps.deps));
assert.equal(r.status, 403); assert.equal(staleOwnerDeps.calls.filter(x => x.method === 'PUT').length, 0);

const inactiveDeps = makeDeps({ saved: rawUser({ roles: ['psg_owner'], psg: { status: 'nonaktif' } }) });
r = await expect('akun owner nonaktif tidak dapat melakukan setup', async () => tanganiOwnerProfile(request('POST', { kodeAgen: '68073640', level: 'BD' }), inactiveDeps.deps));
assert.equal(r.status, 403); assert.equal(inactiveDeps.calls.filter(x => x.method === 'PUT').length, 0);

  const invalidDeps = makeDeps();
r = await expect('validasi kode dan level menolak nilai invalid', async () => tanganiOwnerProfile(request('POST', { kodeAgen: 'A', level: 'FC' }), invalidDeps.deps));
assert.equal(r.status, 400); assert.equal(invalidDeps.calls.length, 0);

const originDeps = makeDeps();
r = await expect('Origin lintas situs ditolak', async () => tanganiOwnerProfile(new Request('https://psg.test/api/psg/profile-setup', {
  method: 'POST', headers: { origin: 'https://attacker.test', 'content-type': 'application/json' },
  body: JSON.stringify({ kodeAgen: '68073640', level: 'BD' })
}), originDeps.deps));
assert.equal(r.status, 403); assert.equal(originDeps.calls.length, 0);

const setupDeps = makeDeps();
r = await expect('setup owner melengkapi metadata resmi tanpa mengubah field lain', async () => tanganiOwnerProfile(request('POST', { kodeAgen: '68073640', level: 'BD' }), setupDeps.deps));
assert.equal(r.status, 200);
assert.deepEqual(setupDeps.state.app_metadata.roles, ['psg_owner']);
assert.deepEqual(setupDeps.state.app_metadata.psg, { status: 'aktif', catatan: 'keep', kodeAgen: '68073640', level: 'BD' });
assert.deepEqual(setupDeps.state.user_metadata, { full_name: 'Erwin Effendi', hp_lokal: 'never-server' });
assert.equal(r.headers.get('cache-control').includes('no-store'), true);

r = await expect('setup kedua ditolak setelah profil lengkap (one-time)', async () => tanganiOwnerProfile(request('POST', { kodeAgen: '68073640', level: 'BD' }), setupDeps.deps));
assert.equal(r.status, 409); assert.equal(setupDeps.calls.filter(x => x.method === 'PUT').length, 1);

const partialDeps = makeDeps({ saved: rawUser({ roles: ['psg_owner'], psg: { status: 'aktif', kodeAgen: 'EXIST123' } }) });
r = await expect('setup parsial mempertahankan field Identity yang sudah ada', async () => tanganiOwnerProfile(request('POST', { kodeAgen: 'EXIST123', level: 'BM' }), partialDeps.deps));
assert.equal(r.status, 200);
assert.deepEqual(partialDeps.state.app_metadata.psg, { status: 'aktif', kodeAgen: 'EXIST123', level: 'BM' });

console.log(`\nPASS: ${checks}/${checks} owner profile setup assertions`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
