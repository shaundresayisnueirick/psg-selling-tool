/* PSG Selling Tools — Management Agen API (PR #21). Admin operations stay server-side. */
import { admin, getIdentityConfig, getUser, requestPasswordRecovery, verifyRequestOrigin } from '@netlify/identity'
import type { AdminUserUpdates, User } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { jawabJson, profilAman, ROLE_SISTEM, JENJANG, type Jenjang } from '../lib/psg-auth.mts'

const okRoles = (u: User) => {
  const roles = u.appMetadata?.roles
  return Array.isArray(roles) ? roles.filter((x): x is string => typeof x === 'string') : []
}
const isOwner = (u: User) => okRoles(u).includes('psg_owner')
const isAdmin = (u: User) => okRoles(u).includes('psg_admin')
const text = (v: unknown, n = 120) => typeof v === 'string' ? v.trim().slice(0, n) : ''
const validEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v)
const psgMeta = (u: User) => (u.appMetadata?.psg && typeof u.appMetadata.psg === 'object') ? { ...(u.appMetadata.psg as Record<string, unknown>) } : {}
const psgUser = (u: User) => !!u.appMetadata?.psg || okRoles(u).some((r) => ROLE_SISTEM.includes(r as (typeof ROLE_SISTEM)[number]))
const safe = (u: User) => ({ ...profilAman(u), lastSignInAt: u.lastSignInAt ?? null, invitedAt: u.invitedAt ?? null })
const targetAllowed = (actor: User, target: User) =>
  target.id !== actor.id && (isOwner(actor) ? !isOwner(target) : isAdmin(actor) && !isOwner(target) && !isAdmin(target))
const fail = (status: number, error: string, message: string) => jawabJson(status, { error, message })

async function actorOrThrow(): Promise<User> {
  const u = await getUser()
  if (!u) throw fail(401, 'unauthenticated', 'Silakan login dengan akun PSG.')
  if (!isOwner(u) && !isAdmin(u)) throw fail(403, 'forbidden', 'Akses Management Agen hanya untuk PSG Owner/Admin.')
  return u
}

async function listPsgUsers() {
  const all: User[] = []
  for (let page = 1; page <= 50; page++) {
    const batch = await admin.listUsers({ page, perPage: 100 })
    all.push(...batch)
    if (batch.length < 100) break
  }
  return all.filter(psgUser).map(safe).sort((a,b) => {
    const rank = (u: ReturnType<typeof safe>) => u.roles.includes('psg_owner') ? 0 : u.roles.includes('psg_admin') ? 1 : 2
    const d = rank(a) - rank(b)
    return d || String(a.nama || a.email || '').localeCompare(String(b.nama || b.email || ''), 'id')
  })
}

async function inviteUser(email: string): Promise<User> {
  const identity = getIdentityConfig()
  if (!identity) {
    const err = new Error('Konfigurasi Netlify Identity tidak tersedia di runtime function.') as Error & { code?: string }
    err.code = 'identity_config_missing'
    throw err
  }
  if (!identity.url) {
    const err = new Error('URL Netlify Identity tidak tersedia di runtime function.') as Error & { code?: string }
    err.code = 'identity_url_missing'
    throw err
  }
  if (!identity.token) {
    const err = new Error('Operator token Netlify Identity tidak tersedia di runtime function.') as Error & { code?: string }
    err.code = 'identity_token_missing'
    throw err
  }

  const baseUrl = identity.url.replace(/\\/$/, '')
  const response = await fetch(`${baseUrl}/invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${identity.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email }),
  })
  const raw = await response.text()
  let data: unknown = null
  try { data = raw ? JSON.parse(raw) : null } catch (_) {}

  if (!response.ok) {
    const message = data && typeof data === 'object' && 'msg' in data && typeof (data as {msg?: unknown}).msg === 'string'
      ? (data as {msg: string}).msg
      : raw.trim().slice(0, 300)
    const err = new Error(message || `Identity invite gagal (HTTP ${response.status}).`) as Error & {
      status?: number
      code?: string
    }
    err.status = response.status
    err.code = 'identity_invite_rejected'
    throw err
  }
  return data as User
}

function errorStatus(err: unknown): number {
  const e = err as { status?: unknown; cause?: { status?: unknown } } | null
  return typeof e?.status === 'number' ? e.status : (typeof e?.cause?.status === 'number' ? e.cause.status : 0)
}

function errorText(err: unknown): string {
  const e = err as { message?: unknown; cause?: { message?: unknown } } | null
  const msg = typeof e?.message === 'string' ? e.message : (typeof e?.cause?.message === 'string' ? e.cause.message : '')
  return msg.trim()
}

async function createAgent(body: Record<string, unknown>, actor: User) {
  const email = text(body.email, 254).toLowerCase()
  const nama = text(body.nama)
  const kodeAgen = text(body.kodeAgen, 40)
  const level = text(body.level, 3) as Jenjang
  const role = text(body.role, 20) || 'agent'
  if (!validEmail(email)) return fail(400, 'invalid_email', 'Format email tidak valid.')
  if (!nama) return fail(400, 'invalid_name', 'Nama agen wajib diisi.')
  if (!JENJANG.includes(level)) return fail(400, 'invalid_level', 'Level harus FC, BM, atau BD.')
  if (!['agent','psg_admin'].includes(role)) return fail(400, 'invalid_role', 'Role tidak valid.')
  if (role === 'psg_admin' && !isOwner(actor)) return fail(403, 'forbidden_role', 'Hanya PSG Owner yang boleh membuat PSG Admin.')

  /* DIAGNOSTIC STEP — sengaja hanya menguji admin.createUser().
     Belum mengirim email/reset link. Tujuannya membuktikan apakah
     Netlify Function benar-benar diizinkan membuat Identity user. */
  let created: User
  try {
    created = await admin.createUser({
      email,
      password: 'PsgTest!' + cryptoRandomToken(),
      data: {
        app_metadata: { roles: role === 'psg_admin' ? ['psg_admin'] : [], psg: { nama, kodeAgen: kodeAgen || null, level, status: 'aktif' } },
        user_metadata: { full_name: nama },
      },
    })
  } catch (err) {
    const status = errorStatus(err)
    const message = errorText(err)
    const duplicate = status === 409 || status === 422 || /already|exist|registered|taken|duplicate/i.test(message)
    return fail(duplicate ? 409 : 502, duplicate ? 'already_exists' : 'create_failed',
      duplicate ? 'Akun tidak dibuat. Email tersebut sudah terdaftar di Netlify Identity.' :
      `admin.createUser() ditolak: ${message || (status ? `HTTP ${status}` : 'tanpa detail error')}.`)
  }

  return jawabJson(201, {
    ok: true,
    diagnostic: true,
    message: 'TES BERHASIL: akun Identity berhasil dibuat. Email/link belum dikirim. Cek Netlify Identity > Users.',
    user: safe(created),
  })
}
async function resend(body: Record<string, unknown>, actor: User) {
  const id = text(body.id, 100)
  if (!id) return fail(400,'invalid_id','ID agen wajib diisi.')
  let target: User
  try { target = await admin.getUser(id) } catch (_) { return fail(404,'not_found','Agen tidak ditemukan.') }
  if (!psgUser(target) || !targetAllowed(actor,target)) return fail(403,'forbidden_target','Kamu tidak berwenang mengelola akun ini.')
  if (!target.email) return fail(409,'missing_email','Akun tidak memiliki email.')
  if (psgMeta(target).status === 'nonaktif') return fail(409,'inactive','Akun nonaktif tidak dikirimi link akses.')
  try {
    if (!target.confirmedAt) {
      await inviteUser(target.email)
      return jawabJson(200,{ok:true,message:'Undangan akses sudah dikirim ulang.'})
    }
    await requestPasswordRecovery(target.email)
    return jawabJson(200,{ok:true,message:'Link atur ulang password sudah dikirim ulang.'})
  } catch (_) {
    return fail(502,'delivery_failed','Email akses tidak dapat dikirim saat ini.')
  }
}

async function updateAgent(body: Record<string, unknown>, actor: User) {
  const id=text(body.id,100)
  if(!id) return fail(400,'invalid_id','ID agen wajib diisi.')
  let target: User
  try { target=await admin.getUser(id) } catch (_) { return fail(404,'not_found','Agen tidak ditemukan.') }
  if(!psgUser(target) || !targetAllowed(actor,target)) return fail(403,'forbidden_target','Kamu tidak berwenang mengelola akun ini.')
  const nama=text(body.nama), kodeAgen=text(body.kodeAgen,40), level=text(body.level,3) as Jenjang, status=text(body.status,20)
  const role = body.role===undefined ? null : text(body.role,20)
  if(!nama) return fail(400,'invalid_name','Nama agen wajib diisi.')
  if(!JENJANG.includes(level)) return fail(400,'invalid_level','Level harus FC, BM, atau BD.')
  if(!['aktif','nonaktif'].includes(status)) return fail(400,'invalid_status','Status harus aktif atau nonaktif.')
  if(role!==null && !isOwner(actor)) return fail(403,'forbidden_role','PSG Admin tidak dapat mengubah role sistem.')
  if(role!==null && !['agent','psg_admin'].includes(role)) return fail(400,'invalid_role','Role sistem tidak valid.')
  const roles = okRoles(target).filter(r=>r!=='psg_owner' && r!=='psg_admin')
  if(role==='psg_admin') roles.push('psg_admin')
  const updates: AdminUserUpdates = {
    app_metadata: { ...(target.appMetadata || {}), roles, psg: { ...psgMeta(target), nama, kodeAgen: kodeAgen || null, level, status } },
    user_metadata: { ...(target.userMetadata || {}), full_name: nama },
  }
  try {
    const updated=await admin.updateUser(target.id,updates)
    return jawabJson(200,{ok:true,message:'Data agen diperbarui.',user:safe(updated)})
  } catch (_) { return fail(502,'update_failed','Data agen tidak dapat diperbarui saat ini.') }
}

export default async (req: Request) => {
  let actor: User
  try { actor=await actorOrThrow() } catch (e) { return e instanceof Response ? e : fail(500,'server_error','Terjadi kesalahan pada server.') }
  try {
    if(req.method==='GET') return jawabJson(200,{ok:true,users:await listPsgUsers()})
    verifyRequestOrigin(req)
    let body: Record<string,unknown>={}
    try { body=await req.json() } catch (_) { return fail(400,'invalid_json','Data permintaan tidak valid.') }
    if(req.method==='POST') return text(body.action,30)==='resend_access' ? resend(body,actor) : createAgent(body,actor)
    if(req.method==='PATCH') return updateAgent(body,actor)
    return jawabJson(405,{error:'method_not_allowed'},{Allow:'GET, POST, PATCH'})
  } catch(e) {
    if(e instanceof Response) return e
    return fail(500,'server_error','Terjadi kesalahan pada server.')
  }
}
export const config: Config = { path: '/api/psg/agents' }
