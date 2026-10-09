/* Setup satu kali profil PSG untuk akun Owner lama.
   Endpoint ini hanya mengisi kode/level yang belum ada. Role, nama, status,
   dan profil yang sudah lengkap tidak dapat diubah melalui endpoint ini. */

import type { User } from '@netlify/identity'
import { jawabJson, JENJANG, profilAman, type Jenjang } from './psg-auth.mts'

export interface IdentitasAdminOwner { url: string; token: string }
export interface DepsOwnerProfile {
  ambilUser: () => Promise<User | null>
  identitas: () => IdentitasAdminOwner
  fetch?: typeof fetch
}

type Objek = Record<string, unknown>
const objek = (v: unknown): Objek => v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Objek) } : {}
const gagal = (status: number, error: string, message: string) => jawabJson(status, { error, message })
const bersih = (v: unknown) => typeof v === 'string' ? v.trim() : ''
const roleOwner = (u: User) => profilAman(u).roles.includes('psg_owner')

function userDariIdentity(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Objek
  if (typeof r.id !== 'string' || !r.id) return null
  const app = objek(r.app_metadata ?? r.appMetadata)
  const metadata = objek(r.user_metadata ?? r.userMetadata)
  const nama = bersih(metadata.full_name) || bersih(metadata.name)
  return {
    id: r.id,
    email: bersih(r.email) || undefined,
    confirmedAt: bersih(r.confirmed_at ?? r.confirmedAt) || undefined,
    name: nama || undefined,
    roles: Array.isArray(app.roles) ? app.roles.filter((x): x is string => typeof x === 'string') : [],
    appMetadata: app as User['appMetadata'],
    userMetadata: metadata,
  }
}

async function panggilIdentity(deps: DepsOwnerProfile, path: string, init?: RequestInit): Promise<Response> {
  const admin = deps.identitas()
  if (!admin.url || !admin.token) throw new Error('identity_config_missing')
  const fetchFn = deps.fetch ?? fetch
  return fetchFn(admin.url.replace(/\/+$/, '') + path, {
    ...init,
    headers: {
      Accept: 'application/json', 'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
      ...((init?.headers as Record<string, string>) || {}),
    },
  })
}

async function jsonIdentity(res: Response): Promise<unknown> {
  const text = await res.text()
  let parsed: unknown = null
  try { parsed = text ? JSON.parse(text) : null } catch (_) {}
  if (!res.ok) throw new Error('identity_admin_failed')
  return parsed
}

export async function tanganiOwnerProfile(req: Request, deps: DepsOwnerProfile): Promise<Response> {
  if (req.method !== 'POST') return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'POST' })

  const origin = req.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(req.url).origin) return gagal(403, 'origin_forbidden', 'Permintaan tidak diizinkan.')
    } catch (_) { return gagal(403, 'origin_forbidden', 'Permintaan tidak diizinkan.') }
  }

  let sesi: User | null = null
  try { sesi = await deps.ambilUser() } catch (_) { sesi = null }
  if (!sesi?.id) return gagal(401, 'unauthenticated', 'Silakan masuk dengan akun PSG Owner.')
  if (!roleOwner(sesi)) return gagal(403, 'owner_required', 'Setup ini hanya tersedia untuk PSG Owner.')

  let body: Objek
  try {
    const parsed = await req.json()
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Objek : {}
  } catch (_) { return gagal(400, 'invalid_json', 'Data setup tidak valid.') }
  if (Object.keys(body).some((k) => k !== 'kodeAgen' && k !== 'level')) {
    return gagal(400, 'invalid_fields', 'Hanya kode agen dan level yang dapat disiapkan.')
  }
  const kodeInput = bersih(body.kodeAgen)
  const levelInput = bersih(body.level) as Jenjang
  if (!/^[A-Za-z0-9-]{3,40}$/.test(kodeInput)) return gagal(400, 'invalid_agent_code', 'Kode agen harus 3–40 karakter huruf, angka, atau tanda hubung.')
  if (!JENJANG.includes(levelInput)) return gagal(400, 'invalid_level', 'Level harus FC, BM, atau BD.')

  let current: User | null
  try {
    const res = await panggilIdentity(deps, `/admin/users/${encodeURIComponent(sesi.id)}`)
    current = userDariIdentity(await jsonIdentity(res))
  } catch (_) { return gagal(502, 'identity_unavailable', 'Profil Identity tidak dapat diverifikasi. Coba lagi.') }
  if (!current || current.id !== sesi.id || !roleOwner(current)) return gagal(403, 'owner_required', 'Akses PSG Owner tidak lagi aktif.')
  if (profilAman(current).status === 'nonaktif') return gagal(403, 'account_inactive', 'Akun PSG nonaktif.')

  const app = objek(current.appMetadata)
  const psg = objek(app.psg)
  const kodeLama = bersih(psg.kodeAgen)
  const levelMentah = bersih(psg.level)
  const levelLama = JENJANG.find((x) => x === levelMentah) || ''
  if (levelMentah && !levelLama) return gagal(409, 'profile_needs_admin', 'Data level yang sudah ada perlu diperiksa oleh admin.')
  if (kodeLama && kodeInput !== kodeLama) return gagal(409, 'profile_already_set', 'Kode agen sudah tersimpan dan tidak dapat diubah di sini.')
  if (levelLama && levelInput !== levelLama) return gagal(409, 'profile_already_set', 'Level sudah tersimpan dan tidak dapat diubah di sini.')
  if (kodeLama && levelLama) return gagal(409, 'profile_already_set', 'Profil PSG Owner sudah lengkap dan terkunci.')

  const metadataBaru = { ...app, psg: { ...psg, kodeAgen: kodeLama || kodeInput, level: levelLama || levelInput } }
  try {
    const res = await panggilIdentity(deps, `/admin/users/${encodeURIComponent(current.id)}`, {
      method: 'PUT', body: JSON.stringify({ app_metadata: metadataBaru, user_metadata: objek(current.userMetadata) }),
    })
    const diperbarui = userDariIdentity(await jsonIdentity(res))
    const hasil = diperbarui || ({ ...current, appMetadata: metadataBaru } as User)
    return jawabJson(200, { ok: true, user: profilAman(hasil) })
  } catch (_) { return gagal(502, 'profile_update_failed', 'Profil PSG Owner tidak dapat disimpan ke Identity. Coba lagi.') }
}
