/* Fondasi autentikasi PSG di sisi server.

   Modul ini sengaja berada di luar netlify/functions supaya tidak dibundel
   sebagai function tersendiri. Semua function PSG memakai aturan yang sama
   dari sini: bentuk jawaban JSON, header no-store, dan daftar data apa saja
   yang boleh keluar dari akun Identity.

   Data nasabah, Library, dan isian kalkulator TIDAK pernah lewat sini. Server
   hanya mengenal identitas dan hak akses agen. */

import type { User } from '@netlify/identity'

/* Role sistem yang dikenal. Role lain di akun Identity diabaikan, supaya
   role yang tidak sengaja ditambahkan lewat dashboard tidak ikut dianggap
   hak akses PSG. */
export const ROLE_SISTEM = ['psg_owner', 'psg_admin'] as const

/* Jenjang karier. Dipakai aplikasi untuk komisi dan override, sama seperti
   kode akses FC/BM/BD yang berlaku sekarang. */
export const JENJANG = ['FC', 'BM', 'BD'] as const

export type RoleSistem = (typeof ROLE_SISTEM)[number]
export type Jenjang = (typeof JENJANG)[number]

export interface ProfilAman {
  id: string
  email: string | null
  nama: string | null
  roles: RoleSistem[]
  level: Jenjang | null
  kodeAgen: string | null
  status: 'aktif' | 'nonaktif'
  emailTerkonfirmasi: boolean
}

/* Jawaban API tidak boleh disimpan oleh peramban, CDN, maupun service
   worker: isinya bergantung pada siapa yang sedang masuk. */
const HEADER_API: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Vary: 'Cookie, Authorization',
  'X-Content-Type-Options': 'nosniff',
}

export function jawabJson(status: number, isi: unknown, tambahan: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(isi), { status, headers: { ...HEADER_API, ...tambahan } })
}

function teks(v: unknown, maks = 120): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, maks) : null
}

/* Hak akses hanya dibaca dari app_metadata, yang hanya bisa ditulis server
   (dashboard Netlify, admin API, atau Identity event function).
   user_metadata bisa diubah sendiri oleh pemilik akun, jadi TIDAK PERNAH
   dipakai untuk role atau jenjang — hanya untuk nama tampilan. */
export function profilAman(user: User): ProfilAman {
  const app = (user.appMetadata || {}) as Record<string, unknown>
  const psg = (app.psg && typeof app.psg === 'object' ? app.psg : {}) as Record<string, unknown>
  const rolesMentah = Array.isArray(app.roles) ? (app.roles as unknown[]) : []
  const roles = ROLE_SISTEM.filter((r) => rolesMentah.includes(r))
  const level = JENJANG.find((j) => j === psg.level) ?? null

  return {
    id: String(user.id),
    email: teks(user.email, 254),
    nama: teks(psg.nama) ?? teks(user.name),
    roles,
    level,
    kodeAgen: teks(psg.kodeAgen, 40),
    status: psg.status === 'nonaktif' ? 'nonaktif' : 'aktif',
    emailTerkonfirmasi: Boolean(user.confirmedAt),
  }
}

type AmbilUser = () => Promise<User | null>

/* GET /api/psg/me — hanya membaca. Tidak ada data yang diubah.
   getUser() memverifikasi JWT dari cookie nf_jwt / header Authorization dan
   mengembalikan null (tidak melempar) bila tidak ada sesi yang sah. */
export async function tanganiMe(req: Request, ambilUser: AmbilUser): Promise<Response> {
  if (req.method !== 'GET') {
    return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'GET' })
  }

  let user: User | null = null
  try {
    user = await ambilUser()
  } catch {
    user = null
  }

  if (!user || !user.id) {
    return jawabJson(401, { authenticated: false, error: 'unauthenticated' })
  }

  return jawabJson(200, { authenticated: true, user: profilAman(user) })
}
