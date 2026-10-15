/* Pusat Informasi PSG. Konten dan lampiran hanya dilayani melalui API ini;
   tidak ada URL Blob publik. Semua kunci berasal dari ID yang dibuat server. */
import type { User } from '@netlify/identity'
import { jawabJson, profilAman } from './psg-auth.mts'
import type { HasilKonfirmasi } from './psg-pribadi.mts'

export const STORE_PRODUKSI = 'psg-informasi'
export const STORE_PREVIEW = 'psg-informasi-preview'
export const KATEGORI = ['Kontes Generali', 'Memo', 'Training', 'Pengumuman Agency'] as const
export const BATAS_FILE = 4 * 1024 * 1024
export function namaStoreInformasi(konteksDeploy: unknown): string {
  return konteksDeploy === 'production' ? STORE_PRODUKSI : STORE_PREVIEW
}
const BASE = '/api/psg/informasi'
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type Obj = Record<string, unknown>
type Status = 'draft' | 'published' | 'archived'
type Attachment = { id: string; nama: string; tipe: string; ukuran: number }
type Item = { id: string; judul: string; kategori: typeof KATEGORI[number]; tanggal: string; isi: string; status: Status; lampiran: Attachment[]; dibuat: string; diperbarui: string }
export interface TokoInformasi {
  get(key: string, opsi: { type: 'json' }): Promise<unknown>
  get(key: string, opsi: { type: 'arrayBuffer' }): Promise<ArrayBuffer | Uint8Array | null>
  setJSON(key: string, data: unknown): Promise<unknown>
  set(key: string, data: ArrayBuffer, opsi: { metadata: Record<string, string> }): Promise<unknown>
  delete(key: string): Promise<unknown>
  list(opsi: { prefix: string }): Promise<{ blobs: { key: string }[] }>
}
export interface DepsInformasi { ambilUser: () => Promise<User | null>; toko: () => TokoInformasi; namaStore: string; cekKonfirmasi?: (userId: string) => Promise<HasilKonfirmasi>; sekarang?: () => Date; uuid?: () => string }
class Galat extends Error {
  status: number
  kode: string
  constructor(status: number, kode: string, pesan: string) { super(pesan); this.status = status; this.kode = kode }
}
const gagal = (status: number, error: string, message: string) => jawabJson(status, { error, message })
const kunciItem = (id: string) => `informasi/${id}.json`
const kunciFile = (id: string, file: string) => `lampiran/${id}/${file}`
const teks = (v: unknown, maks: number, nama: string, wajib = false): string => {
  if (v == null && !wajib) return ''
  if (typeof v !== 'string') throw new Galat(400, 'invalid_field', `${nama} tidak valid.`)
  const hasil = v.replace(/\r\n?/g, '\n').trim()
  if (wajib && !hasil) throw new Galat(400, 'required', `${nama} wajib diisi.`)
  if (hasil.length > maks) throw new Galat(400, 'too_long', `${nama} maksimal ${maks} karakter.`)
  return hasil
}
function validasi(raw: unknown, id: string, lama?: Item, sekarang = new Date()): Item {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Galat(400, 'invalid_json', 'Data informasi tidak valid.')
  const b = raw as Obj
  if (Object.keys(b).some((k) => !['judul', 'kategori', 'tanggal', 'isi', 'status'].includes(k))) throw new Galat(400, 'invalid_fields', 'Ada field informasi yang tidak dikenal.')
  const judul = teks(b.judul, 140, 'Judul', true)
  const kategori = b.kategori as typeof KATEGORI[number]
  if (!KATEGORI.includes(kategori)) throw new Galat(400, 'invalid_category', 'Kategori tidak dikenal.')
  const tanggal = teks(b.tanggal, 10, 'Tanggal', true)
  const d = new Date(`${tanggal}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== tanggal) throw new Galat(400, 'invalid_date', 'Tanggal harus berupa tanggal kalender yang valid.')
  const isi = teks(b.isi, 12000, 'Isi', true)
  const status = b.status as Status
  if (!['draft', 'published', 'archived'].includes(status)) throw new Galat(400, 'invalid_status', 'Status informasi tidak dikenal.')
  return { id, judul, kategori, tanggal, isi, status, lampiran: lama?.lampiran || [], dibuat: lama?.dibuat || sekarang.toISOString(), diperbarui: sekarang.toISOString() }
}
function bacaItem(raw: unknown): Item | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Item
  if (!ID.test(String(x.id)) || !KATEGORI.includes(x.kategori) || !['draft', 'published', 'archived'].includes(x.status) || !Array.isArray(x.lampiran)) return null
  return x
}
async function sesi(deps: DepsInformasi, owner = false): Promise<User> {
  let user: User | null = null
  try { user = await deps.ambilUser() } catch { user = null }
  if (!user?.id) throw new Galat(401, 'unauthenticated', 'Silakan masuk dengan akun PSG.')
  const p = profilAman(user)
  if (!p.emailTerkonfirmasi) {
    const klaimSaja = !user.createdAt
    if (!klaimSaja || !deps.cekKonfirmasi) throw new Galat(403, 'email_unverified', 'Email akun belum terkonfirmasi.')
    let hasil: HasilKonfirmasi = 'gagal'
    try { hasil = await deps.cekKonfirmasi(String(user.id)) } catch { hasil = 'gagal' }
    if (hasil === 'sesi-tidak-sah') throw new Galat(401, 'unauthenticated', 'Sesi login tidak dapat diverifikasi. Masuk lagi dengan email.')
    if (hasil === 'gagal') throw new Galat(503, 'identity_unavailable', 'Status akun belum bisa diverifikasi. Coba lagi.')
    if (hasil !== 'ya') throw new Galat(403, 'email_unverified', 'Email akun belum terkonfirmasi.')
  }
  if (p.status !== 'aktif') throw new Galat(403, 'account_inactive', 'Akun PSG berstatus nonaktif.')
  if (owner) {
    if (!p.roles.includes('psg_owner')) throw new Galat(403, 'owner_required', 'Fitur ini hanya untuk PSG Owner.')
  } else if (!p.roles.includes('psg_owner') && !p.roles.includes('psg_admin') && !p.level) {
    throw new Galat(403, 'psg_access_missing', 'Akun belum mendapat hak akses PSG.')
  }
  return user
}
function periksaTulis(req: Request) {
  if (req.headers.get('x-psg-request') !== '1') throw new Galat(403, 'request_rejected', 'Permintaan ditolak.')
  if (req.headers.get('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin') throw new Galat(403, 'cross_site', 'Permintaan lintas situs ditolak.')
  const origin = req.headers.get('origin')
  if (!origin) throw new Galat(403, 'origin_missing', 'Asal permintaan tidak diketahui.')
  try { if (new URL(origin).origin !== new URL(req.url).origin) throw new Galat(403, 'origin_rejected', 'Asal permintaan tidak diizinkan.') }
  catch (e) { if (e instanceof Galat) throw e; throw new Galat(403, 'origin_rejected', 'Asal permintaan tidak diizinkan.') }
}
async function json(req: Request): Promise<Obj> {
  const len = Number(req.headers.get('content-length') || 0)
  if (len > 24 * 1024) throw new Galat(413, 'payload_too_large', 'Data terlalu besar.')
  let b: unknown
  try { b = await req.json() } catch { throw new Galat(400, 'invalid_json', 'Data informasi tidak valid.') }
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new Galat(400, 'invalid_json', 'Data informasi tidak valid.')
  return b as Obj
}
async function semua(toko: TokoInformasi): Promise<Item[]> {
  const daftar = await toko.list({ prefix: 'informasi/' })
  const nilai = await Promise.all(daftar.blobs.map((x) => toko.get(x.key, { type: 'json' })))
  return nilai.map(bacaItem).filter((x): x is Item => Boolean(x))
}
/* Status baca per anggota: dibaca/<user.id>.json = { ids: [id informasi] }.
   user.id berasal dari sesi yang diverifikasi server, bukan dari permintaan.
   Hanya informasi Published yang dihitung; id yang sudah tidak ada atau tidak
   lagi Published dibuang saat penulisan berikutnya. */
const kunciBaca = (uid: string) => `dibaca/${uid}.json`
async function bacaSet(toko: TokoInformasi, uid: string): Promise<Set<string>> {
  const raw = await toko.get(kunciBaca(uid), { type: 'json' }) as { ids?: unknown } | null
  return new Set(Array.isArray(raw?.ids) ? (raw!.ids as unknown[]).filter((x): x is string => typeof x === 'string' && ID.test(x)) : [])
}
async function belumDibaca(toko: TokoInformasi, uid: string) {
  const [items, dibaca] = await Promise.all([semua(toko), bacaSet(toko, uid)])
  const terbit = items.filter((x) => x.status === 'published')
  const ids = terbit.filter((x) => !dibaca.has(x.id)).map((x) => x.id)
  return { jumlah: ids.length, ids }
}
const urutTerbaru = (a: Item, b: Item) => b.tanggal.localeCompare(a.tanggal) || b.diperbarui.localeCompare(a.diperbarui)
function validasiFile(bytes: Uint8Array, tipe: string) {
  const awal = (n: number) => bytes[n]
  let terdeteksi = ''
  if (awal(0) === 0x25 && awal(1) === 0x50 && awal(2) === 0x44 && awal(3) === 0x46 && tipe === 'application/pdf') terdeteksi = tipe
  else if (awal(0) === 0x89 && awal(1) === 0x50 && awal(2) === 0x4e && awal(3) === 0x47 && tipe === 'image/png') terdeteksi = tipe
  else if (awal(0) === 0xff && awal(1) === 0xd8 && awal(2) === 0xff && tipe === 'image/jpeg') terdeteksi = tipe
  else if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' && tipe === 'image/webp') terdeteksi = tipe
  if (!terdeteksi) throw new Galat(400, 'invalid_file_type', 'Lampiran harus PDF, PNG, JPEG, atau WebP yang valid.')
  return terdeteksi
}
/* crypto.randomUUID harus dipanggil pada objek crypto; memanggilnya terlepas
   melempar ERR_INVALID_THIS di runtime Node (penyebab HTTP 503 saat Simpan). */
const buatUuid = () => crypto.randomUUID()
function namaFile(v: string) { return v.replace(/[\\/\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) || 'lampiran' }
async function dapatkan(toko: TokoInformasi, id: string): Promise<Item> {
  const item = bacaItem(await toko.get(kunciItem(id), { type: 'json' }))
  if (!item) throw new Galat(404, 'not_found', 'Informasi tidak ditemukan.')
  return item
}
function bolehLihat(user: User, item: Item) { return item.status === 'published' || profilAman(user).roles.includes('psg_owner') }
function storeTag(deps: DepsInformasi) { return deps.namaStore === STORE_PRODUKSI ? 'production' : 'preview' }

export async function tanganiInformasi(req: Request, deps: DepsInformasi): Promise<Response> {
  try {
    const path = new URL(req.url).pathname.replace(/\/+$/, '')
    if (path !== BASE && !path.startsWith(BASE + '/')) return gagal(404, 'not_found', 'Alamat tidak dikenal.')
    const rest = path.slice(BASE.length)
    const method = req.method.toUpperCase()
    if (rest === '' && method === 'GET') {
      const user = await sesi(deps)
      const owner = new URL(req.url).searchParams.get('admin') === '1' && profilAman(user).roles.includes('psg_owner')
      const category = new URL(req.url).searchParams.get('kategori')
      const items = (await semua(deps.toko())).filter((x) => (owner || x.status === 'published') && (!category || x.kategori === category)).sort(urutTerbaru)
      return jawabJson(200, { ok: true, penyimpanan: storeTag(deps), informasi: items })
    }
    if (rest === '' && method === 'POST') {
      periksaTulis(req); await sesi(deps, true)
      const id = (deps.uuid || buatUuid)()
      if (!ID.test(id)) throw new Galat(500, 'id_generation_failed', 'Informasi tidak dapat dibuat.')
      const item = validasi(await json(req), id, undefined, (deps.sekarang || (() => new Date()))())
      await deps.toko().setJSON(kunciItem(id), item)
      return jawabJson(201, { ok: true, penyimpanan: storeTag(deps), informasi: item })
    }
    if (rest === '/belum-dibaca' && method === 'GET') {
      const user = await sesi(deps)
      return jawabJson(200, { ok: true, ...(await belumDibaca(deps.toko(), String(user.id))) })
    }
    const match = rest.match(/^\/([0-9a-f-]+)(?:\/dibaca|\/lampiran(?:\/([0-9a-f-]+))?)?$/i)
    if (!match || !ID.test(match[1])) return gagal(404, 'not_found', 'Alamat tidak dikenal.')
    const id = match[1], attachmentId = match[2], store = deps.toko()
    if (rest.endsWith('/dibaca') && method === 'POST') {
      periksaTulis(req)
      const user = await sesi(deps)
      const item = await dapatkan(store, id)
      /* Draft/Archived tidak dihitung dan tidak bisa ditandai (tidak terlihat anggota). */
      if (item.status !== 'published') throw new Galat(404, 'not_found', 'Informasi tidak ditemukan.')
      const uid = String(user.id)
      const dibaca = await bacaSet(store, uid)
      if (!dibaca.has(id)) {
        dibaca.add(id)
        const terbit = new Set((await semua(store)).filter((x) => x.status === 'published').map((x) => x.id))
        await store.setJSON(kunciBaca(uid), { ids: [...dibaca].filter((x) => terbit.has(x)) })
      }
      return jawabJson(200, { ok: true, ...(await belumDibaca(store, uid)) })
    }
    if (rest.endsWith('/lampiran') && method === 'POST') {
      periksaTulis(req); await sesi(deps, true)
      const item = await dapatkan(store, id)
      if (item.lampiran.length >= 5) throw new Galat(400, 'attachment_limit', 'Maksimal lima lampiran per informasi.')
      const len = Number(req.headers.get('content-length') || 0)
      if (len > BATAS_FILE + 64 * 1024) throw new Galat(413, 'file_too_large', 'Ukuran lampiran maksimal 4 MB.')
      let form: FormData
      try { form = await req.formData() } catch { throw new Galat(400, 'invalid_upload', 'Data lampiran tidak valid.') }
      const file = form.get('file')
      if (!(file instanceof File) || !file.size) throw new Galat(400, 'invalid_upload', 'Pilih file lampiran terlebih dahulu.')
      if (file.size > BATAS_FILE) throw new Galat(413, 'file_too_large', 'Ukuran lampiran maksimal 4 MB.')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const tipe = validasiFile(bytes, file.type)
      const fileId = (deps.uuid || buatUuid)()
      if (!ID.test(fileId)) throw new Galat(500, 'id_generation_failed', 'Lampiran tidak dapat disimpan.')
      const meta: Attachment = { id: fileId, nama: namaFile(file.name), tipe, ukuran: bytes.byteLength }
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      await store.set(kunciFile(id, fileId), buffer, { metadata: { contentType: tipe } })
      item.lampiran.push(meta); item.diperbarui = (deps.sekarang || (() => new Date()))().toISOString()
      await store.setJSON(kunciItem(id), item)
      return jawabJson(201, { ok: true, lampiran: meta })
    }
    if (attachmentId && ID.test(attachmentId) && rest.includes('/lampiran/')) {
      const user = await sesi(deps)
      const item = await dapatkan(store, id)
      if (!bolehLihat(user, item)) throw new Galat(404, 'not_found', 'Lampiran tidak ditemukan.')
      const meta = item.lampiran.find((x) => x.id === attachmentId)
      if (!meta) throw new Galat(404, 'not_found', 'Lampiran tidak ditemukan.')
      if (method === 'DELETE') {
        periksaTulis(req); await sesi(deps, true)
        await store.delete(kunciFile(id, attachmentId)); item.lampiran = item.lampiran.filter((x) => x.id !== attachmentId)
        item.diperbarui = (deps.sekarang || (() => new Date()))().toISOString(); await store.setJSON(kunciItem(id), item)
        return jawabJson(200, { ok: true })
      }
      if (method !== 'GET') return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'GET, DELETE' })
      const data = await store.get(kunciFile(id, attachmentId), { type: 'arrayBuffer' })
      if (!data) throw new Galat(404, 'not_found', 'Lampiran tidak ditemukan.')
      const download = new URL(req.url).searchParams.get('download') === '1'
      const safeName = meta.nama.replace(/["\r\n]/g, '_')
      return new Response(data as BodyInit, { status: 200, headers: {
        'Content-Type': meta.tipe, 'Content-Length': String(meta.ukuran),
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(meta.nama)}`,
        'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff',
      } })
    }
    if (rest.match(/^\/[0-9a-f-]+$/i) && method === 'GET') {
      const user = await sesi(deps), item = await dapatkan(store, id)
      if (!bolehLihat(user, item)) throw new Galat(404, 'not_found', 'Informasi tidak ditemukan.')
      return jawabJson(200, { ok: true, informasi: item })
    }
    if (rest.match(/^\/[0-9a-f-]+$/i) && method === 'PUT') {
      periksaTulis(req); await sesi(deps, true)
      const lama = await dapatkan(store, id)
      const item = validasi(await json(req), id, lama, (deps.sekarang || (() => new Date()))())
      await store.setJSON(kunciItem(id), item)
      return jawabJson(200, { ok: true, informasi: item })
    }
    return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'GET, POST, PUT, DELETE' })
  } catch (e) {
    if (e instanceof Galat) return gagal(e.status, e.kode, e.message)
    /* Hanya nama/kode galat yang dicatat; tanpa pesan, data, token, atau stack. */
    console.error('psg-informasi: galat tak terduga', (e as { code?: string; name?: string } | null)?.code || (e as Error | null)?.name || 'unknown')
    return gagal(503, 'storage_unavailable', 'Pusat informasi sedang tidak dapat diakses. Coba lagi.')
  }
}
