/* PSG Selling Tools — Invite Agen (logika server).

   Dipanggil oleh netlify/functions/psg-agents.mts. Dipisah ke sini supaya
   alurnya bisa diuji tanpa jaringan: semua akses ke luar lewat deps.

   Identity Admin API:
   - Token operator diambil dari getIdentityConfig() (@netlify/identity).
   - URL diarahkan ke instance Identity milik situs lewat URL utama situs,
     BUKAN URL Deploy Preview. Deploy Preview bisa berada di balik login tim
     Netlify; permintaan server-ke-server ke sana dijawab 401/halaman login.
   - Jawaban admin API GoTrue memakai snake_case (app_metadata, confirmed_at,
     invited_at, …) dan dinormalkan ke bentuk User @netlify/identity sebelum
     aturan PSG (profilAman) dipakai.

   Data nasabah, Library, dan isian kalkulator tidak pernah lewat sini. */

import type { User } from '@netlify/identity'
import { jawabJson, profilAman, JENJANG, type Jenjang } from './psg-auth.mts'

export interface IdentitasAdmin {
  url: string
  token: string
}

export interface DepsAgents {
  ambilUser: () => Promise<User | null>
  identitas: () => IdentitasAdmin
  fetch?: typeof fetch
}

const IDENTITY_PATH = '/.netlify/identity'
const PER_HALAMAN = 100

class GalatAgen extends Error {
  status: number
  kode: string
  constructor(status: number, kode: string, pesan: string) {
    super(pesan)
    this.status = status
    this.kode = kode
  }
}

const gagal = (status: number, error: string, message: string) => jawabJson(status, { error, message })

/* URL utama situs: kandidat pertama yang berupa URL http(s) yang sah. */
export function alamatSitus(...kandidat: unknown[]): string | null {
  for (const k of kandidat) {
    if (typeof k !== 'string' || !k.trim()) continue
    try {
      const u = new URL(k.trim())
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.origin
    } catch (_) { /* kandidat berikutnya */ }
  }
  return null
}

/* config = getIdentityConfig() di function; situs = URL utama situs.
   Tanpa URL utama, URL dari config dipakai sebagai cadangan. */
export function identitasAdmin(config: { url?: string; token?: string } | null, situs: string | null): IdentitasAdmin {
  const token = config && typeof config.token === 'string' ? config.token : ''
  if (!token) {
    throw new GalatAgen(503, 'identity_token_missing',
      'Token operator Netlify Identity tidak tersedia di function. Pastikan Identity aktif untuk situs ini.')
  }
  const url = situs ? situs + IDENTITY_PATH : (config && typeof config.url === 'string' ? config.url : '')
  if (!url) throw new GalatAgen(503, 'identity_url_missing', 'URL Netlify Identity tidak dapat ditentukan.')
  return { url: url.replace(/\/+$/, ''), token }
}

const objek = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {}
const teksOpsional = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)

/* Jawaban admin API (snake_case) -> User @netlify/identity (camelCase). */
export function keUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  const app = objek(r.app_metadata ?? r.appMetadata)
  const meta = objek(r.user_metadata ?? r.userMetadata)
  const nama = teksOpsional(meta.full_name) ?? teksOpsional(meta.name)
  return {
    id: r.id,
    email: teksOpsional(r.email),
    confirmedAt: teksOpsional(r.confirmed_at ?? r.confirmedAt),
    invitedAt: teksOpsional(r.invited_at ?? r.invitedAt),
    lastSignInAt: teksOpsional(r.last_sign_in_at ?? r.lastSignInAt),
    createdAt: teksOpsional(r.created_at ?? r.createdAt),
    name: nama,
    roles: Array.isArray(app.roles) ? (app.roles as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    appMetadata: app as User['appMetadata'],
    userMetadata: meta,
  }
}

const peran = (u: User) => profilAman(u).roles
const isOwner = (u: User) => peran(u).includes('psg_owner')
const isAdmin = (u: User) => peran(u).includes('psg_admin')
const teks = (v: unknown, n = 120) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
const emailSah = (v: string) => /^\S+@\S+\.\S+$/.test(v)
const metaPsg = (u: User) => objek(objek(u.appMetadata).psg)
const userPsg = (u: User) => !!objek(u.appMetadata).psg || peran(u).length > 0
const aman = (u: User) => ({ ...profilAman(u), lastSignInAt: u.lastSignInAt ?? null, invitedAt: u.invitedAt ?? null })
/* Owner: semua akun kecuali owner (termasuk dirinya). Admin: hanya FC/BM/BD. */
const bolehKelola = (pelaku: User, target: User) =>
  target.id !== pelaku.id &&
  (isOwner(pelaku) ? !isOwner(target) : isAdmin(pelaku) && !isOwner(target) && !isAdmin(target))

async function mintaIdentity(deps: DepsAgents, path: string, init: RequestInit = {}, denganToken = true): Promise<unknown> {
  const id = deps.identitas()
  const ambil = deps.fetch ?? fetch
  let res: Response
  try {
    res = await ambil(id.url + path, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(denganToken ? { Authorization: `Bearer ${id.token}` } : {}),
        ...((init.headers as Record<string, string>) || {}),
      },
    })
  } catch (_) {
    throw new GalatAgen(502, 'identity_unreachable', 'Netlify Identity tidak dapat dihubungi dari server.')
  }
  const raw = await res.text()
  let data: unknown = null
  try { data = raw ? JSON.parse(raw) : null } catch (_) { data = null }
  if (!res.ok) {
    const d = objek(data)
    const halamanLogin = !data && /<html|<!doctype/i.test(raw)
    const pesan = teks(d.msg, 300) || teks(d.error_description, 300) || teks(d.message, 300) ||
      (halamanLogin ? 'Jawaban berupa halaman login, bukan Identity API.' : raw.trim().slice(0, 300))
    throw new GalatAgen(res.status, 'identity_http_' + res.status, pesan || `Identity API HTTP ${res.status}`)
  }
  return data
}

async function ambilTarget(deps: DepsAgents, id: string): Promise<User> {
  let data: unknown
  try { data = await mintaIdentity(deps, `/admin/users/${encodeURIComponent(id)}`) } catch (e) {
    if (e instanceof GalatAgen && e.status === 404) throw new GalatAgen(404, 'not_found', 'Agen tidak ditemukan.')
    throw e
  }
  const u = keUser(data)
  if (!u) throw new GalatAgen(404, 'not_found', 'Agen tidak ditemukan.')
  return u
}

/* Hak akses dibaca dari klaim sesi, lalu diverifikasi ulang dari data
   Identity terbaru: klaim JWT bisa basi sampai token diperbarui, dan akun
   yang dinonaktifkan tidak boleh lagi mengelola agen. */
async function pelaku(deps: DepsAgents): Promise<User> {
  let sesi: User | null = null
  try { sesi = await deps.ambilUser() } catch (_) { sesi = null }
  if (!sesi || !sesi.id) throw new GalatAgen(401, 'unauthenticated', 'Silakan login dengan akun PSG.')
  if (!isOwner(sesi) && !isAdmin(sesi)) throw new GalatAgen(403, 'forbidden', 'Akses Invite Agen hanya untuk PSG Dev/Admin.')
  const segar = await ambilTarget(deps, sesi.id).catch((e) => {
    if (e instanceof GalatAgen && e.status === 404) throw new GalatAgen(403, 'forbidden', 'Akses Invite Agen hanya untuk PSG Dev/Admin.')
    throw e
  })
  if (profilAman(segar).status === 'nonaktif') throw new GalatAgen(403, 'inactive', 'Akun kamu nonaktif.')
  if (!isOwner(segar) && !isAdmin(segar)) throw new GalatAgen(403, 'forbidden', 'Akses Invite Agen hanya untuk PSG Dev/Admin.')
  return segar
}

async function semuaUser(deps: DepsAgents): Promise<User[]> {
  const hasil: User[] = []
  for (let halaman = 1; halaman <= 50; halaman++) {
    const data = objek(await mintaIdentity(deps, `/admin/users?page=${halaman}&per_page=${PER_HALAMAN}`))
    const users = Array.isArray(data.users) ? data.users : []
    for (const x of users) { const u = keUser(x); if (u) hasil.push(u) }
    if (users.length < PER_HALAMAN) break
  }
  return hasil
}

async function daftarAgen(deps: DepsAgents) {
  const urutan = (u: ReturnType<typeof aman>) => (u.roles.includes('psg_owner') ? 0 : u.roles.includes('psg_admin') ? 1 : 2)
  return (await semuaUser(deps)).filter(userPsg).map(aman).sort((a, b) =>
    urutan(a) - urutan(b) || String(a.nama || a.email || '').localeCompare(String(b.nama || b.email || ''), 'id'))
}

async function cariEmail(deps: DepsAgents, email: string): Promise<User | null> {
  return (await semuaUser(deps)).find((u) => String(u.email || '').toLowerCase() === email) || null
}

async function undang(body: Record<string, unknown>, aktor: User, deps: DepsAgents) {
  const email = teks(body.email, 254).toLowerCase()
  const nama = teks(body.nama)
  const kodeAgen = teks(body.kodeAgen, 40)
  const level = teks(body.level, 3) as Jenjang
  const role = teks(body.role, 20) || 'agent'
  if (!emailSah(email)) return gagal(400, 'invalid_email', 'Format email tidak valid.')
  if (!nama) return gagal(400, 'invalid_name', 'Nama agen wajib diisi.')
  if (!JENJANG.includes(level)) return gagal(400, 'invalid_level', 'Level harus FC, BM, atau BD.')
  if (!['agent', 'psg_admin'].includes(role)) return gagal(400, 'invalid_role', 'Role tidak valid.')
  if (role === 'psg_admin' && !isOwner(aktor) && !isAdmin(aktor)) return gagal(403, 'forbidden_role', 'Hanya PSG Dev/Admin yang boleh membuat PSG Admin.')

  /* Endpoint undangan resmi: membuat akun invited + mengirim email undangan. */
  let diundang: User | null
  try {
    diundang = keUser(await mintaIdentity(deps, '/invite', { method: 'POST', body: JSON.stringify({ email }) }))
    if (!diundang) diundang = await cariEmail(deps, email)
  } catch (e) {
    const status = e instanceof GalatAgen ? e.status : 0
    const pesan = e instanceof Error ? e.message : ''
    const ganda = status === 409 || /already|exist|registered|taken|duplicate/i.test(pesan)
    return gagal(ganda ? 409 : 502, ganda ? 'already_exists' : 'invite_failed',
      ganda ? 'Akun tidak dibuat. Email tersebut sudah terdaftar di Netlify Identity.'
        : `Undangan Identity gagal.${status ? ` HTTP ${status}.` : ''} ${pesan || 'Netlify tidak memberikan detail error.'}`.trim())
  }
  if (!diundang) {
    return jawabJson(502, { error: 'profile_update_failed', invitationSent: true,
      message: 'Undangan terkirim, tetapi akun belum terbaca dari Identity. Jangan kirim undangan baru; muat ulang daftar lalu Edit akun ini.' })
  }

  try {
    const app = objek(diundang.appMetadata)
    const diperbarui = keUser(await mintaIdentity(deps, `/admin/users/${encodeURIComponent(diundang.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        app_metadata: { ...app, roles: role === 'psg_admin' ? ['psg_admin'] : [], psg: { nama, kodeAgen: kodeAgen || null, level, status: 'aktif' } },
        user_metadata: { ...objek(diundang.userMetadata), full_name: nama },
      }),
    }))
    return jawabJson(201, { ok: true, message: 'Undangan berhasil dikirim. Agen akan menerima email untuk membuat password.',
      user: aman(diperbarui || diundang) })
  } catch (_) {
    return jawabJson(502, { error: 'profile_update_failed', invitationSent: true, user: aman(diundang),
      message: 'Undangan berhasil dikirim, tetapi data profil agen belum tersimpan. Jangan kirim undangan baru; periksa lalu Edit akun ini.' })
  }
}

/* Belum menerima undangan -> kirim ulang undangan (/invite).
   Sudah aktif -> link atur ulang password (/recover). */
async function kirimUlang(body: Record<string, unknown>, aktor: User, deps: DepsAgents) {
  const id = teks(body.id, 100)
  if (!id) return gagal(400, 'invalid_id', 'ID agen wajib diisi.')
  const target = await ambilTarget(deps, id)
  if (!userPsg(target) || !bolehKelola(aktor, target)) return gagal(403, 'forbidden_target', 'Kamu tidak berwenang mengelola akun ini.')
  if (!target.email) return gagal(409, 'missing_email', 'Akun tidak memiliki email.')
  if (metaPsg(target).status === 'nonaktif') return gagal(409, 'inactive', 'Akun nonaktif tidak dikirimi link akses.')
  try {
    if (!target.confirmedAt) {
      await mintaIdentity(deps, '/invite', { method: 'POST', body: JSON.stringify({ email: target.email }) })
      return jawabJson(200, { ok: true, message: 'Undangan dikirim ulang. Agen akan menerima email untuk membuat password.' })
    }
    await mintaIdentity(deps, '/recover', { method: 'POST', body: JSON.stringify({ email: target.email }) }, false)
    return jawabJson(200, { ok: true, message: 'Link untuk mengatur ulang password sudah dikirim.' })
  } catch (e) {
    return gagal(502, 'delivery_failed', `Email akses tidak dapat dikirim. ${e instanceof Error ? e.message : ''}`.trim())
  }
}

async function ubah(body: Record<string, unknown>, aktor: User, deps: DepsAgents) {
  const id = teks(body.id, 100)
  if (!id) return gagal(400, 'invalid_id', 'ID agen wajib diisi.')
  const target = await ambilTarget(deps, id)
  if (!userPsg(target) || !bolehKelola(aktor, target)) return gagal(403, 'forbidden_target', 'Kamu tidak berwenang mengelola akun ini.')
  const nama = teks(body.nama), kodeAgen = teks(body.kodeAgen, 40), level = teks(body.level, 3) as Jenjang, status = teks(body.status, 20)
  const role = body.role === undefined ? null : teks(body.role, 20)
  if (!nama) return gagal(400, 'invalid_name', 'Nama agen wajib diisi.')
  if (!JENJANG.includes(level)) return gagal(400, 'invalid_level', 'Level harus FC, BM, atau BD.')
  if (!['aktif', 'nonaktif'].includes(status)) return gagal(400, 'invalid_status', 'Status harus aktif atau nonaktif.')
  if (role !== null && !['agent', 'psg_admin'].includes(role)) return gagal(400, 'invalid_role', 'Role sistem tidak valid.')
  const sekarangAdmin = isAdmin(target)
  if (role !== null && (role === 'psg_admin') !== sekarangAdmin && !isOwner(aktor)) {
    return gagal(403, 'forbidden_role', 'PSG Admin tidak dapat mengubah role sistem.')
  }
  const app = objek(target.appMetadata)
  const roles = (Array.isArray(app.roles) ? (app.roles as unknown[]) : [])
    .filter((r): r is string => typeof r === 'string' && r !== 'psg_owner' && r !== 'psg_admin')
  if (role === null ? sekarangAdmin : role === 'psg_admin') roles.push('psg_admin')
  try {
    const diperbarui = keUser(await mintaIdentity(deps, `/admin/users/${encodeURIComponent(target.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        app_metadata: { ...app, roles, psg: { ...metaPsg(target), nama, kodeAgen: kodeAgen || null, level, status } },
        user_metadata: { ...objek(target.userMetadata), full_name: nama },
      }),
    }))
    return jawabJson(200, { ok: true, message: 'Data agen diperbarui.', user: aman(diperbarui || target) })
  } catch (e) {
    return gagal(502, 'update_failed', `Data agen tidak dapat diperbarui. ${e instanceof Error ? e.message : ''}`.trim())
  }
}

/* GET daftar · POST undang / kirim ulang · PATCH ubah. */
export async function tanganiAgents(req: Request, deps: DepsAgents): Promise<Response> {
  try {
    const aktor = await pelaku(deps)
    if (req.method === 'GET') return jawabJson(200, { ok: true, users: await daftarAgen(deps) })
    if (req.method !== 'POST' && req.method !== 'PATCH') {
      return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'GET, POST, PATCH' })
    }
    let body: Record<string, unknown> = {}
    try { body = objek(await req.json()) } catch (_) { return gagal(400, 'invalid_json', 'Data permintaan tidak valid.') }
    if (req.method === 'PATCH') return await ubah(body, aktor, deps)
    return teks(body.action, 30) === 'resend_access' ? await kirimUlang(body, aktor, deps) : await undang(body, aktor, deps)
  } catch (e) {
    if (e instanceof GalatAgen) {
      /* Kegagalan dari Identity API bukan kesalahan sesi pengguna: dijawab 502
         dengan status asli di pesan, supaya 401 dari Identity tidak terbaca
         sebagai "belum login". */
      if (e.kode.startsWith('identity_http_')) return gagal(502, 'identity_error', `Identity API HTTP ${e.status}. ${e.message}`.trim())
      return gagal(e.status, e.kode, e.message)
    }
    return gagal(500, 'server_error', 'Terjadi kesalahan pada server.')
  }
}
