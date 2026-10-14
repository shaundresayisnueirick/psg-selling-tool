/* PSG Selling Tools — data pribadi agen (logika server).

   Dipanggil oleh netlify/functions/psg-pribadi.mts. Dipisah ke sini supaya
   bisa diuji tanpa jaringan: sesi dan penyimpanan masuk lewat deps.

   Aturan kepemilikan:
   - Pemilik data HANYA user.id dari getUser() (JWT sesi Identity yang
     diverifikasi Netlify). Email atau ID dari browser tidak pernah dipakai;
     field yang tidak dikenal di body ditolak.
   - Tidak ada endpoint yang membaca data pengguna lain, termasuk untuk owner.
   - Hanya akun email terkonfirmasi, aktif, dan punya hak akses PSG.

   Penyimpanan: Netlify Blobs. Production memakai store psg-pribadi; Deploy
   Preview, branch deploy, dan konteks lain memakai psg-pribadi-preview supaya
   uji coba tidak pernah menulis data production. */

import type { User } from '@netlify/identity'
import { jawabJson, profilAman } from './psg-auth.mts'

export const STORE_PRODUKSI = 'psg-pribadi'
export const STORE_PREVIEW = 'psg-pribadi-preview'

/* Hanya konteks "production" yang memakai store production. Konteks yang
   tidak dikenal atau kosong jatuh ke store preview: lebih aman menaruh data
   production di store preview daripada sebaliknya. */
export function namaStore(konteksDeploy: unknown): string {
  return konteksDeploy === 'production' ? STORE_PRODUKSI : STORE_PREVIEW
}

/* Bagian dari Store @netlify/blobs yang dipakai. Tes memakai tiruan. */
export interface TokoPribadi {
  get(key: string, opsi: { type: 'json' }): Promise<unknown>
  setJSON(key: string, data: unknown): Promise<unknown>
  delete(key: string): Promise<unknown>
}

/* Hasil verifikasi ulang status konfirmasi email ke Identity:
   ya / tidak (Identity menyatakan belum terkonfirmasi) / sesi-tidak-sah
   (token ditolak atau milik akun lain) / gagal (Identity tidak terjangkau). */
export type HasilKonfirmasi = 'ya' | 'tidak' | 'sesi-tidak-sah' | 'gagal'

export interface DepsPribadi {
  ambilUser: () => Promise<User | null>
  toko: () => TokoPribadi
  namaStore: string
  /* Dipanggil hanya bila getUser() mengembalikan user dari klaim JWT saja
     (tanpa confirmedAt), lihat pemilik(). Menerima user.id hasil verifikasi. */
  cekKonfirmasi?: (userId: string) => Promise<HasilKonfirmasi>
}

export const BATAS = {
  bodyByte: 32 * 1024,
  pesan: 280,
}

type Objek = Record<string, unknown>
const BASE = '/api/psg/pribadi'
const ID_PENGGUNA = /^[A-Za-z0-9-]{8,64}$/

class Galat extends Error {
  status: number
  kode: string
  constructor(status: number, kode: string, pesan: string) {
    super(pesan)
    this.status = status
    this.kode = kode
  }
}
const gagal = (status: number, error: string, message: string) => jawabJson(status, { error, message })

/* ---------- Sesi ---------- */

async function pemilik(deps: DepsPribadi): Promise<string> {
  let user: User | null = null
  try { user = await deps.ambilUser() } catch { user = null }
  if (!user || !user.id) throw new Galat(401, 'unauthenticated', 'Sesi login tidak ditemukan. Masuk dengan email terlebih dahulu.')
  const p = profilAman(user)
  /* getUser() di server mengambil profil lengkap dari GoTrue (/user) lewat
     URL Identity konteks. Bila panggilan itu gagal — misalnya Deploy Preview
     di balik login tim Netlify menjawab 401 untuk permintaan server-ke-server
     (lihat psg-agents.mts) — getUser() jatuh ke klaim JWT yang sudah
     diverifikasi platform tetapi TIDAK memuat confirmed_at maupun created_at.
     Dalam keadaan itu status konfirmasi bukan "belum", melainkan "tidak
     diketahui", sehingga diverifikasi ulang ke Identity lewat URL utama situs. */
  if (!p.emailTerkonfirmasi) {
    const klaimSaja = !user.createdAt
    if (!klaimSaja || !deps.cekKonfirmasi) throw new Galat(403, 'email_unverified', 'Email akun belum terkonfirmasi.')
    let hasil: HasilKonfirmasi = 'gagal'
    try { hasil = await deps.cekKonfirmasi(String(user.id)) } catch { hasil = 'gagal' }
    if (hasil === 'sesi-tidak-sah') throw new Galat(401, 'unauthenticated', 'Sesi login tidak dapat diverifikasi. Masuk lagi dengan email.')
    if (hasil === 'gagal') throw new Galat(503, 'identity_unavailable', 'Status akun belum bisa diverifikasi. Coba lagi sebentar lagi.')
    if (hasil !== 'ya') throw new Galat(403, 'email_unverified', 'Email akun belum terkonfirmasi.')
  }
  if (p.status === 'nonaktif') throw new Galat(403, 'account_inactive', 'Akun PSG berstatus nonaktif.')
  const berhak = p.roles.includes('psg_owner') || p.roles.includes('psg_admin') || p.level !== null
  if (!berhak) throw new Galat(403, 'psg_access_missing', 'Akun belum mendapat hak akses PSG.')
  if (!ID_PENGGUNA.test(p.id)) throw new Galat(403, 'invalid_user', 'Identitas akun tidak dikenali.')
  return p.id
}

/* Token sesi dari permintaan: header Authorization atau cookie nf_jwt yang
   ditulis klien Identity saat login. Hanya diteruskan ke Identity milik situs
   ini untuk membaca profil pemiliknya sendiri. */
export function tokenSesi(req: Request): string {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer\s+(\S+)$/i)
  if (m) return m[1]
  const cookie = req.headers.get('cookie') || ''
  for (const bagian of cookie.split(';')) {
    const i = bagian.indexOf('=')
    if (i > 0 && bagian.slice(0, i).trim() === 'nf_jwt') {
      try { return decodeURIComponent(bagian.slice(i + 1).trim()) } catch { return '' }
    }
  }
  return ''
}

/* GET <URL utama>/.netlify/identity/user dengan token sesi. Identity situs
   sama untuk production dan Deploy Preview; URL utama dipakai karena URL
   Deploy Preview bisa berada di balik login tim Netlify. */
export async function cekKonfirmasiIdentity(urlUtama: string | null, token: string, userId: string, f: typeof fetch = fetch): Promise<HasilKonfirmasi> {
  if (!token) return 'sesi-tidak-sah'
  if (!urlUtama) return 'gagal'
  let r: Response
  try {
    r = await f(urlUtama.replace(/\/+$/, '') + '/.netlify/identity/user', {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
  } catch { return 'gagal' }
  if (r.status === 401 || r.status === 403) {
    /* Halaman login tim Netlify (HTML) bukan penolakan token oleh Identity. */
    const ct = r.headers.get('content-type') || ''
    return /json/i.test(ct) ? 'sesi-tidak-sah' : 'gagal'
  }
  if (!r.ok) return 'gagal'
  let d: Objek = {}
  try { d = await r.json() as Objek } catch { return 'gagal' }
  if (typeof d.id !== 'string' || d.id !== userId) return 'sesi-tidak-sah'
  return typeof d.confirmed_at === 'string' && d.confirmed_at ? 'ya' : 'tidak'
}

/* ---------- Pengaman permintaan ----------
   Header X-PSG-Request memaksa preflight CORS untuk situs lain (dan tidak ada
   CORS yang diizinkan), Origin harus sama dengan situs ini, dan permintaan
   lintas situs yang ditandai browser ditolak. */
function asalDiizinkan(req: Request): string[] {
  const asal: string[] = []
  try { asal.push(new URL(req.url).origin) } catch (_) {}
  const host = req.headers.get('host')
  if (host) { asal.push('https://' + host); asal.push('http://' + host) }
  return asal
}

function periksaPermintaan(req: Request, tulis: boolean) {
  if (req.headers.get('x-psg-request') !== '1') throw new Galat(403, 'request_rejected', 'Permintaan ditolak.')
  const situs = req.headers.get('sec-fetch-site')
  if (situs && situs !== 'same-origin') throw new Galat(403, 'cross_site', 'Permintaan lintas situs ditolak.')
  const origin = req.headers.get('origin')
  if (origin && !asalDiizinkan(req).includes(origin)) throw new Galat(403, 'origin_rejected', 'Asal permintaan tidak diizinkan.')
  if (tulis && !origin) throw new Galat(403, 'origin_missing', 'Asal permintaan tidak diketahui.')
  if (tulis && !/^application\/json\b/i.test(req.headers.get('content-type') || '')) {
    throw new Galat(415, 'unsupported_media_type', 'Data harus berupa JSON.')
  }
}

async function bacaBody(req: Request): Promise<Objek> {
  const panjang = Number(req.headers.get('content-length') || 0)
  if (panjang > BATAS.bodyByte) throw new Galat(413, 'payload_too_large', 'Data terlalu besar.')
  const teks = await req.text()
  if (new TextEncoder().encode(teks).length > BATAS.bodyByte) throw new Galat(413, 'payload_too_large', 'Data terlalu besar.')
  let isi: unknown
  try { isi = JSON.parse(teks) } catch { throw new Galat(400, 'invalid_json', 'Data permintaan tidak valid.') }
  if (!isi || typeof isi !== 'object' || Array.isArray(isi)) throw new Galat(400, 'invalid_json', 'Data permintaan tidak valid.')
  return isi as Objek
}

function hanyaField(isi: Objek, izin: string[]) {
  const asing = Object.keys(isi).filter((k) => !izin.includes(k))
  if (asing.length) throw new Galat(400, 'unknown_field', 'Field tidak dikenal: ' + asing.slice(0, 5).join(', '))
}

/* Teks bebas: karakter kontrol dibuang (kecuali baris baru), baris baru
   dirapikan, spasi di ujung dipangkas. Panjang dihitung sesudah dirapikan. */
export function rapikanTeks(v: unknown, maks: number, nama: string): string {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') throw new Galat(400, 'invalid_field', nama + ' harus berupa teks.')
  const t = v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').replace(/\n{3,}/g, '\n\n').trim()
  if (t.length > maks) throw new Galat(400, 'too_long', nama + ' maksimal ' + maks + ' karakter.')
  return t
}

/* ---------- Kunci penyimpanan ----------
   Kunci selalu dirakit dari user.id hasil verifikasi; tidak ada bagian kunci
   yang berasal dari browser kecuali ID yang lolos pola ketat. */
const kunciPesan = (uid: string) => 'u/' + uid + '/pesan.json'

function bentukPesan(v: unknown): { teks: string; diperbarui: string } | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Objek
  if (typeof o.teks !== 'string' || !o.teks) return null
  return { teks: o.teks, diperbarui: typeof o.diperbarui === 'string' ? o.diperbarui : '' }
}

async function bacaPesan(toko: TokoPribadi, uid: string) {
  return bentukPesan(await toko.get(kunciPesan(uid), { type: 'json' }))
}

/* ---------- Rute ---------- */

function penyimpanan(deps: DepsPribadi) {
  return deps.namaStore === STORE_PRODUKSI ? 'production' : 'preview'
}

async function ringkasan(deps: DepsPribadi, uid: string): Promise<Response> {
  const toko = deps.toko()
  const pesan = await bacaPesan(toko, uid)
  return jawabJson(200, { ok: true, penyimpanan: penyimpanan(deps), pesan })
}

async function simpanPesan(req: Request, deps: DepsPribadi, uid: string): Promise<Response> {
  const isi = await bacaBody(req)
  hanyaField(isi, ['teks'])
  const teks = rapikanTeks(isi.teks, BATAS.pesan, 'Pesan personal')
  const toko = deps.toko()
  if (!teks) {
    await toko.delete(kunciPesan(uid))
    return jawabJson(200, { ok: true, penyimpanan: penyimpanan(deps), pesan: null })
  }
  const data = { teks, diperbarui: new Date().toISOString() }
  await toko.setJSON(kunciPesan(uid), data)
  return jawabJson(200, { ok: true, penyimpanan: penyimpanan(deps), pesan: data })
}

/* GET  /api/psg/pribadi        — data pribadi milik akun yang sedang masuk
   PUT  /api/psg/pribadi/pesan  — simpan atau kosongkan pesan personal */
export async function tanganiPribadi(req: Request, deps: DepsPribadi): Promise<Response> {
  try {
    let jalur = ''
    try { jalur = new URL(req.url).pathname.replace(/\/+$/, '') } catch (_) {}
    if (jalur !== BASE && !jalur.startsWith(BASE + '/')) return gagal(404, 'not_found', 'Alamat tidak dikenal.')
    const sisa = jalur.slice(BASE.length)
    const metode = req.method.toUpperCase()

    if (sisa === '') {
      if (metode !== 'GET') return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'GET' })
      periksaPermintaan(req, false)
      const uid = await pemilik(deps)
      return await ringkasan(deps, uid)
    }
    if (sisa === '/pesan') {
      if (metode !== 'PUT') return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'PUT' })
      periksaPermintaan(req, true)
      const uid = await pemilik(deps)
      return await simpanPesan(req, deps, uid)
    }
    return gagal(404, 'not_found', 'Alamat tidak dikenal.')
  } catch (e) {
    if (e instanceof Galat) return gagal(e.status, e.kode, e.message)
    return gagal(503, 'storage_unavailable', 'Penyimpanan sedang tidak dapat diakses. Coba lagi.')
  }
}
