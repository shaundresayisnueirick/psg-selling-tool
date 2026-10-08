/* PSG Selling Tools — Invite Agen.
   Identity administration uses the short-lived admin token supplied to the
   Netlify Function in context.clientContext.identity. Browser session is
   still verified with getUser(). No password/token is stored in browser. */

import { randomBytes } from 'node:crypto'
import { getUser, requestPasswordRecovery } from '@netlify/identity'
import type { User, AdminUserUpdates } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { jawabJson, profilAman, ROLE_SISTEM, JENJANG, type Jenjang } from '../lib/psg-auth.mts'

type IdentityContext = {
  clientContext?: {
    identity?: {
      url?: string
      token?: string
    }
  }
}

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

function identityFromContext(context: IdentityContext) {
  const identity = context?.clientContext?.identity
  if (!identity?.url || !identity?.token) {
    throw new Error('Netlify Function tidak menerima short-lived Identity admin token (context.clientContext.identity).')
  }
  return identity
}

async function identityRequest(context: IdentityContext, path: string, init: RequestInit = {}) {
  const identity = identityFromContext(context)
  const response = await fetch(identity.url.replace(/\/$/, '') + path, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${identity.token}`,
      ...(init.headers || {}),
    },
  })
  const raw = await response.text()
  let data: any = null
  try { data = raw ? JSON.parse(raw) : null } catch (_) {}
  if (!response.ok) {
    const msg = data?.msg || data?.message || raw.trim().slice(0, 300) || `Identity API HTTP ${response.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = response.status
    throw err
  }
  return data
}

async function actorOrThrow(): Promise<User> {
  const u = await getUser()
  if (!u) throw fail(401, 'unauthenticated', 'Silakan login dengan akun PSG.')
  if (!isOwner(u) && !isAdmin(u)) throw fail(403, 'forbidden', 'Akses Invite Agen hanya untuk PSG Owner/Admin.')
  return u
}

async function listPsgUsers(context: IdentityContext) {
  const data = await identityRequest(context, '/admin/users?per_page=100')
  const all = Array.isArray(data?.users) ? data.users as User[] : []
  return all.filter(psgUser).map(safe).sort((a,b) => {
    const rank = (u: ReturnType<typeof safe>) => u.roles.includes('psg_owner') ? 0 : u.roles.includes('psg_admin') ? 1 : 2
    return rank(a) - rank(b) || String(a.nama || a.email || '').localeCompare(String(b.nama || b.email || ''), 'id')
  })
}

function bootstrapPassword() {
  return 'Psg!' + randomBytes(32).toString('base64url')
}

async function findUserByEmail(context: IdentityContext, email: string): Promise<User | null> {
  const data = await identityRequest(context, '/admin/users?per_page=100')
  const users = Array.isArray(data?.users) ? data.users as User[] : []
  return users.find((u) => String(u.email || '').toLowerCase() === email.toLowerCase()) || null
}

async function createAgent(body: Record<string, unknown>, actor: User, context: IdentityContext) {
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

  let invited: User
  try {
    /* Gunakan jalur Invite yang sama konsepnya dengan Identity Dashboard:
       POST /invite menghasilkan akun invited + email invitation. */
    await identityRequest(context, '/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    invited = await findUserByEmail(context, email)
    if (!invited) throw new Error('Undangan dikirim, tetapi akun belum muncul saat dibaca ulang dari Identity.')
  } catch (err) {
    const status = (err as { status?: number })?.status || 0
    const msg = errorText(err)
    const duplicate = status === 409 || status === 422 || /already|exist|registered|taken|duplicate/i.test(msg)
    return fail(duplicate ? 409 : 502, duplicate ? 'already_exists' : 'invite_failed',
      duplicate ? 'Akun tidak dibuat. Email tersebut sudah terdaftar di Netlify Identity.'
                : `Undangan Identity gagal.${status ? ` HTTP ${status}.` : ''} ${msg || 'Netlify tidak memberikan detail error.'}`.trim())
  }

  try {
    const roles = role === 'psg_admin' ? ['psg_admin'] : []
    const updates: AdminUserUpdates = {
      app_metadata: {
        ...(invited.appMetadata || {}),
        roles,
        psg: { nama, kodeAgen: kodeAgen || null, level, status: 'aktif' },
      },
      user_metadata: { ...(invited.userMetadata || {}), full_name: nama },
    }
    const updated = await identityRequest(context, `/admin/users/${encodeURIComponent(invited.id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as User
    return jawabJson(201, { ok: true, message: 'Undangan berhasil dikirim. Agen akan menerima email untuk membuat password.', user: safe(updated) })
  } catch (err) {
    return jawabJson(502, {
      error: 'profile_update_failed',
      invitationSent: true,
      user: safe(invited),
      message: 'Undangan berhasil dikirim, tetapi data profil agen belum tersimpan. Jangan kirim undangan baru; periksa lalu Edit akun ini.',
    })
  }
}

function errorText(err: unknown): string {
  const e = err as { message?: unknown; cause?: { message?: unknown } } | null
  const msg = typeof e?.message === 'string' ? e.message : (typeof e?.cause?.message === 'string' ? e.cause.message : '')
  return msg.trim()
}

async function resend(body: Record<string, unknown>, actor: User, context: IdentityContext) {
  const id = text(body.id, 100)
  if (!id) return fail(400,'invalid_id','ID agen wajib diisi.')
  let target: User
  try { target = await identityRequest(context, `/admin/users/${encodeURIComponent(id)}`) as User } catch (_) { return fail(404,'not_found','Agen tidak ditemukan.') }
  if (!psgUser(target) || !targetAllowed(actor,target)) return fail(403,'forbidden_target','Kamu tidak berwenang mengelola akun ini.')
  if (!target.email) return fail(409,'missing_email','Akun tidak memiliki email.')
  if (psgMeta(target).status === 'nonaktif') return fail(409,'inactive','Akun nonaktif tidak dikirimi link akses.')
  try {
    await requestPasswordRecovery(target.email)
    return jawabJson(200,{ok:true,message:'Link untuk membuat atau mengatur ulang password sudah dikirim ulang.'})
  } catch (err) {
    return fail(502,'delivery_failed',`Email akses tidak dapat dikirim. ${errorText(err)}`.trim())
  }
}

async function updateAgent(body: Record<string, unknown>, actor: User, context: IdentityContext) {
  const id=text(body.id,100)
  if(!id) return fail(400,'invalid_id','ID agen wajib diisi.')
  let target: User
  try { target=await identityRequest(context, `/admin/users/${encodeURIComponent(id)}`) as User } catch (_) { return fail(404,'not_found','Agen tidak ditemukan.') }
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
    const updated=await identityRequest(context, `/admin/users/${encodeURIComponent(target.id)}`, { method:'PUT', body:JSON.stringify(updates) }) as User
    return jawabJson(200,{ok:true,message:'Data agen diperbarui.',user:safe(updated)})
  } catch (err) { return fail(502,'update_failed',`Data agen tidak dapat diperbarui. ${errorText(err)}`.trim()) }
}

export default async (req: Request, context: IdentityContext) => {
  let actor: User
  try { actor=await actorOrThrow() } catch (e) { return e instanceof Response ? e : fail(500,'server_error','Terjadi kesalahan pada server.') }
  try {
    if(req.method==='GET') return jawabJson(200,{ok:true,users:await listPsgUsers(context)})
    let body: Record<string,unknown>={}
    try { body=await req.json() } catch (_) { return fail(400,'invalid_json','Data permintaan tidak valid.') }
    if(req.method==='POST') return text(body.action,30)==='resend_access' ? resend(body,actor,context) : createAgent(body,actor,context)
    if(req.method==='PATCH') return updateAgent(body,actor,context)
    return jawabJson(405,{error:'method_not_allowed'},{Allow:'GET, POST, PATCH'})
  } catch(e) {
    if(e instanceof Response) return e
    return fail(500,'server_error','Terjadi kesalahan pada server.')
  }
}
export const config: Config = { path: '/api/psg/agents' }
