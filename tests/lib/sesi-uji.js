'use strict';
/* Sesi Identity tiruan untuk tes browser.

   Login kode akses lama sudah dicabut (PR #35): aplikasi hanya terbuka
   sesudah /api/psg/me mengakui sesi Identity. Tes yang dulu membuka aplikasi
   dengan penanda insuranceHub.access.v3 kini memasang sesi tiruan ini pada
   page atau context Playwright sebelum halaman dimuat.

   - @netlify/identity (src/vendor/netlify-identity.js) diganti tiruan yang
     getUser()-nya mengembalikan akun uji; logout() menandai sesi berakhir.
   - /api/psg/me menjawab profil akun uji (atau 401 sesudah logout).
   - /api/psg/pribadi (Pesan Personal, Asuransiku) dijawab logika server asli
     (netlify/lib/psg-pribadi.mts) dengan penyimpanan di memori per tes.
   Rute yang didaftarkan tes sesudah helper ini tetap didahulukan Playwright. */
const PROFIL_UJI = {
  id: 'uji-agen-0001', email: 'agen.uji@psg.test', nama: 'Agen Uji', roles: [], level: 'FC',
  kodeAgen: 'UJI01', status: 'aktif', emailTerkonfirmasi: true,
};
const KELUAR = /(?:^|;\s*)uji_keluar=1/;
const path = require('path');
const { pathToFileURL } = require('url');
let libPribadi = null;
const muatPribadi = () => libPribadi || (libPribadi = import(pathToFileURL(path.join(__dirname, '..', '..', 'netlify/lib/psg-pribadi.mts')).href));

async function pasangSesiUji(target, ubah = {}) {
  const profil = { ...PROFIL_UJI, ...ubah };
  const user = JSON.stringify({ id: profil.id, email: profil.email });
  await target.route('**/src/vendor/netlify-identity.js', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: 'window.PSGNetlifyIdentity={' +
      'login:async()=>{document.cookie="uji_keluar=; path=/; max-age=0";return {};},' +
      'logout:async()=>{document.cookie="uji_keluar=1; path=/";},' +
      'requestPasswordRecovery:async()=>{},handleAuthCallback:async()=>null,' +
      'acceptInvite:async()=>({}),updateUser:async()=>({}),' +
      'getUser:async()=>(' + KELUAR.toString() + '.test(document.cookie)?null:' + user + ')};',
  }));
  await target.route('**/api/psg/me', async (route) => {
    const h = await route.request().allHeaders();
    const keluar = KELUAR.test(h.cookie || '');
    return route.fulfill({ status: keluar ? 401 : 200, contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(keluar ? { authenticated: false, error: 'unauthenticated' } : { authenticated: true, user: profil }) });
  });
  const data = new Map();
  const toko = { get: async (k) => (data.has(k) ? JSON.parse(data.get(k)) : null), setJSON: async (k, v) => { data.set(k, JSON.stringify(v)); }, delete: async (k) => { data.delete(k); }, list: async (o) => ({ blobs: [...data.keys()].filter((k) => k.startsWith(o.prefix)).map((key) => ({ key })) }) };
  await target.route('**/api/psg/pribadi**', async (route) => {
    const lib = await muatPribadi();
    const rq = route.request();
    const h = await rq.allHeaders();
    const keluar = KELUAR.test(h.cookie || '');
    const headers = {};
    for (const [k, v] of Object.entries(h)) if (!/^(content-length|connection|accept-encoding|host)$/i.test(k) && !k.startsWith(':')) headers[k] = v;
    const req = new Request(rq.url(), { method: rq.method(), headers, body: /^(GET|HEAD)$/.test(rq.method()) ? undefined : (rq.postData() || '') });
    const r = await lib.tanganiPribadi(req, {
      ambilUser: async () => (keluar ? null : { id: profil.id, email: profil.email, confirmedAt: '2026-10-01T00:00:00Z', appMetadata: { roles: profil.roles, psg: { nama: profil.nama, level: profil.level, kodeAgen: profil.kodeAgen, status: profil.status } } }),
      toko: () => toko, namaStore: lib.STORE_PREVIEW, cekKonfirmasi: async () => 'ya',
    });
    const hdr = {}; r.headers.forEach((v, k) => { hdr[k] = v; });
    return route.fulfill({ status: r.status, headers: hdr, body: await r.text() });
  });
  return profil;
}

module.exports = { pasangSesiUji, PROFIL_UJI };
