/* PSG Selling Tools — data pribadi agen (logika server).

   Dipanggil oleh netlify/functions/psg-pribadi.mts. Dipisah ke sini supaya
   bisa diuji tanpa jaringan: sesi dan penyimpanan masuk lewat deps.

   Aturan kepemilikan:
   - Pemilik data HANYA user.id dari getUser() (JWT sesi Identity yang
     diverifikasi Netlify). Email atau ID dari browser tidak pernah dipakai;
     field yang tidak dikenal di body ditolak.
   - Tidak ada endpoint yang membaca data pengguna lain, termasuk untuk owner.
   - Hanya akun email terkonfirmasi, aktif, dan punya hak akses PSG.

   Data: pesan personal (Identitas Konsultan) dan polis Asuransiku.

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
  list(opsi: { prefix: string }): Promise<{ blobs: { key: string }[] }>
}

export interface DepsPribadi {
  ambilUser: () => Promise<User | null>
  toko: () => TokoPribadi
  namaStore: string
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
  if (!p.emailTerkonfirmasi) throw new Galat(403, 'email_unverified', 'Email akun belum terkonfirmasi.')
  if (p.status === 'nonaktif') throw new Galat(403, 'account_inactive', 'Akun PSG berstatus nonaktif.')
  const berhak = p.roles.includes('psg_owner') || p.roles.includes('psg_admin') || p.level !== null
  if (!berhak) throw new Galat(403, 'psg_access_missing', 'Akun belum mendapat hak akses PSG.')
  if (!ID_PENGGUNA.test(p.id)) throw new Galat(403, 'invalid_user', 'Identitas akun tidak dikenali.')
  return p.id
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
  if (tulis && req.method.toUpperCase() !== 'DELETE' && !/^application\/json\b/i.test(req.headers.get('content-type') || '')) {
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

/* ---------- Asuransiku: polis milik agen ----------
   Satu blob per polis: u/<uid>/polis/<polisId>.json. Mengubah satu polis
   tidak pernah menulis polis lain. Rider berada DI DALAM polis induknya. */

export const JENIS_POLIS = ['UNIT_LINK', 'TRADISIONAL'] as const
export const JENIS_PERLINDUNGAN = ['JIWA', 'PK', 'KECELAKAAN', 'KESEHATAN', 'LAINNYA'] as const
export const SIFAT_PK = ['BERDIRI_SENDIRI', 'DIPERCEPAT', 'TIDAK_TAHU'] as const
export const SISTEM_KESEHATAN = ['TAHUNAN', 'PER_KEJADIAN', 'HARIAN', 'LAINNYA'] as const
export const MATA_UANG = ['IDR', 'USD'] as const

export const BATAS_POLIS = {
  polis: 30,
  rider: 10,
  perusahaan: 80,
  produk: 100,
  nama: 80,
  catatan: 300,
  catatanPribadi: 500,
  nilai: 1e15,
  maksHari: 366,
}

const ID_POLIS = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const kunciPolis = (uid: string, id: string) => 'u/' + uid + '/polis/' + id + '.json'
const awalanPolis = (uid: string) => 'u/' + uid + '/polis/'

function wajibTeks(v: unknown, maks: number, nama: string): string {
  const t = rapikanTeks(v, maks, nama)
  if (!t) throw new Galat(400, 'required', nama + ' wajib diisi.')
  return t
}

function pilihan<T extends string>(v: unknown, daftar: readonly T[], nama: string, wajib = true): T | undefined {
  if (v === undefined || v === null || v === '') {
    if (wajib) throw new Galat(400, 'required', nama + ' wajib dipilih.')
    return undefined
  }
  if (typeof v !== 'string' || !(daftar as readonly string[]).includes(v)) throw new Galat(400, 'invalid_enum', nama + ' tidak dikenal.')
  return v as T
}

/* Angka manfaat: boleh kosong (tidak diketahui), selain itu angka >= 0.
   String ditolak supaya teks bebas tidak bisa disisipkan lewat kolom angka. */
function nilai(v: unknown, nama: string, maks = BATAS_POLIS.nilai): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > maks) throw new Galat(400, 'invalid_number', nama + ' harus berupa angka 0 sampai ' + maks + '.')
  return Math.round(v * 100) / 100
}

function tanggal(v: unknown, nama: string): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Galat(400, 'invalid_date', nama + ' harus berformat YYYY-MM-DD.')
  const d = new Date(v + 'T00:00:00Z')
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw new Galat(400, 'invalid_date', nama + ' tidak valid.')
  const tahun = d.getUTCFullYear()
  const batasAtas = Date.now() + 366 * 864e5
  if (tahun < 1950 || d.getTime() > batasAtas) throw new Galat(400, 'invalid_date', nama + ' di luar rentang yang wajar.')
  return v
}

function objekWajib(v: unknown, nama: string): Objek {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Galat(400, 'invalid_field', nama + ' tidak valid.')
  return v as Objek
}

/* Field manfaat yang boleh untuk tiap jenis (dan sistem kesehatan). Field
   di luar daftar ditolak, supaya plan tidak dipaksa ke skema yang salah. */
function normalisasiManfaat(jenis: string, mentah: unknown): Objek {
  const m = objekWajib(mentah ?? {}, 'Manfaat')
  const hasil: Objek = {}
  const taruh = (k: string, v: unknown) => { if (v !== undefined && v !== '') hasil[k] = v }
  if (jenis === 'JIWA') {
    hanyaField(m, ['up', 'catatan'])
    taruh('up', nilai(m.up, 'Uang pertanggungan jiwa'))
    taruh('catatan', rapikanTeks(m.catatan, BATAS_POLIS.catatan, 'Catatan manfaat'))
  } else if (jenis === 'PK') {
    hanyaField(m, ['up', 'sifat', 'catatan'])
    taruh('up', nilai(m.up, 'Uang pertanggungan penyakit kritis'))
    taruh('sifat', pilihan(m.sifat, SIFAT_PK, 'Sifat manfaat penyakit kritis', false))
    taruh('catatan', rapikanTeks(m.catatan, BATAS_POLIS.catatan, 'Catatan manfaat'))
  } else if (jenis === 'KECELAKAAN') {
    hanyaField(m, ['upMeninggal', 'cacatTetap', 'biayaMedis', 'catatan'])
    taruh('upMeninggal', nilai(m.upMeninggal, 'UP meninggal karena kecelakaan'))
    taruh('cacatTetap', nilai(m.cacatTetap, 'Manfaat cacat tetap'))
    taruh('biayaMedis', nilai(m.biayaMedis, 'Biaya medis kecelakaan'))
    taruh('catatan', rapikanTeks(m.catatan, BATAS_POLIS.catatan, 'Catatan manfaat'))
  } else if (jenis === 'KESEHATAN') {
    const sistem = pilihan(m.sistem, SISTEM_KESEHATAN, 'Sistem manfaat kesehatan') as string
    const perSistem: Record<string, string[]> = {
      TAHUNAN: ['limitTahunan', 'limitBooster', 'syaratBooster'],
      PER_KEJADIAN: ['limitPerKejadian', 'kamarPerHari'],
      HARIAN: ['santunanHarian', 'maksHari'],
      LAINNYA: [],
    }
    hanyaField(m, ['sistem', 'plan', 'kamar', 'catatan', ...perSistem[sistem]])
    hasil.sistem = sistem
    taruh('plan', rapikanTeks(m.plan, BATAS_POLIS.nama, 'Nama plan'))
    taruh('kamar', rapikanTeks(m.kamar, BATAS_POLIS.nama, 'Kamar'))
    if (sistem === 'TAHUNAN') {
      taruh('limitTahunan', nilai(m.limitTahunan, 'Limit tahunan'))
      taruh('limitBooster', nilai(m.limitBooster, 'Limit booster'))
      taruh('syaratBooster', rapikanTeks(m.syaratBooster, BATAS_POLIS.catatan, 'Syarat booster'))
    } else if (sistem === 'PER_KEJADIAN') {
      taruh('limitPerKejadian', nilai(m.limitPerKejadian, 'Limit per tindakan/kejadian'))
      taruh('kamarPerHari', nilai(m.kamarPerHari, 'Biaya kamar per hari'))
    } else if (sistem === 'HARIAN') {
      taruh('santunanHarian', nilai(m.santunanHarian, 'Santunan harian'))
      const h = nilai(m.maksHari, 'Maksimal hari', BATAS_POLIS.maksHari)
      if (h !== undefined && !Number.isInteger(h)) throw new Galat(400, 'invalid_number', 'Maksimal hari harus bilangan bulat.')
      taruh('maksHari', h)
    }
    taruh('catatan', rapikanTeks(m.catatan, BATAS_POLIS.catatan, 'Catatan manfaat'))
  } else {
    hanyaField(m, ['namaJenis', 'manfaatUtama', 'nilai'])
    hasil.namaJenis = wajibTeks(m.namaJenis, BATAS_POLIS.nama, 'Nama jenis perlindungan')
    taruh('manfaatUtama', rapikanTeks(m.manfaatUtama, BATAS_POLIS.catatan, 'Manfaat utama'))
    taruh('nilai', nilai(m.nilai, 'Nilai manfaat'))
  }
  return hasil
}

function normalisasiPerlindungan(mentah: unknown, idDipakai: Set<string>): Objek {
  const p = objekWajib(mentah, 'Perlindungan')
  hanyaField(p, ['id', 'peran', 'jenis', 'nama', 'manfaat'])
  if (typeof p.id !== 'string' || !ID_POLIS.test(p.id)) throw new Galat(400, 'invalid_id', 'ID perlindungan tidak valid.')
  if (idDipakai.has(p.id)) throw new Galat(400, 'duplicate_id', 'ID perlindungan ganda.')
  idDipakai.add(p.id)
  const peran = pilihan(p.peran, ['DASAR', 'RIDER'] as const, 'Peran perlindungan') as string
  const jenis = pilihan(p.jenis, JENIS_PERLINDUNGAN, 'Jenis perlindungan') as string
  const hasil: Objek = { id: p.id, peran, jenis }
  const nama = rapikanTeks(p.nama, BATAS_POLIS.nama, 'Nama rider')
  if (nama) hasil.nama = nama
  hasil.manfaat = normalisasiManfaat(jenis, p.manfaat)
  return hasil
}

/* Body PUT polis. ID, dibuat, dan diperbarui ditentukan server. */
export function normalisasiPolis(isi: Objek): Objek {
  hanyaField(isi, ['perusahaan', 'produk', 'jenisPolis', 'mulai', 'nomorAkhir', 'mataUang', 'perlindungan', 'catatanPribadi'])
  const hasil: Objek = {
    perusahaan: wajibTeks(isi.perusahaan, BATAS_POLIS.perusahaan, 'Perusahaan asuransi'),
    produk: wajibTeks(isi.produk, BATAS_POLIS.produk, 'Nama produk'),
    jenisPolis: pilihan(isi.jenisPolis, JENIS_POLIS, 'Jenis polis'),
    mulai: tanggal(isi.mulai, 'Tanggal mulai aktif'),
    mataUang: pilihan(isi.mataUang, MATA_UANG, 'Mata uang', false) || 'IDR',
  }
  /* Hanya 4 digit terakhir nomor polis. Nomor lengkap tidak boleh disimpan. */
  if (isi.nomorAkhir !== undefined && isi.nomorAkhir !== null && isi.nomorAkhir !== '') {
    if (typeof isi.nomorAkhir !== 'string' || !/^\d{4}$/.test(isi.nomorAkhir)) {
      throw new Galat(400, 'invalid_policy_number', 'Isi hanya 4 digit terakhir nomor polis.')
    }
    hasil.nomorAkhir = isi.nomorAkhir
  }
  if (!Array.isArray(isi.perlindungan)) throw new Galat(400, 'invalid_field', 'Perlindungan wajib diisi.')
  const ids = new Set<string>()
  const daftar = isi.perlindungan.map((p) => normalisasiPerlindungan(p, ids))
  const dasar = daftar.filter((p) => p.peran === 'DASAR')
  const rider = daftar.filter((p) => p.peran === 'RIDER')
  if (dasar.length !== 1) throw new Galat(400, 'base_coverage', 'Satu polis harus memiliki tepat satu perlindungan dasar.')
  if (rider.length > BATAS_POLIS.rider) throw new Galat(400, 'too_many_riders', 'Maksimal ' + BATAS_POLIS.rider + ' rider per polis.')
  hasil.perlindungan = [...dasar, ...rider]
  const catatan = rapikanTeks(isi.catatanPribadi, BATAS_POLIS.catatanPribadi, 'Catatan pribadi')
  if (catatan) hasil.catatanPribadi = catatan
  return hasil
}

async function bacaSemuaPolis(toko: TokoPribadi, uid: string): Promise<Objek[]> {
  const daftar = await toko.list({ prefix: awalanPolis(uid) })
  const kunci = (daftar.blobs || []).map((b) => b.key).filter((k) => k.startsWith(awalanPolis(uid)) && k.endsWith('.json'))
  const isi = await Promise.all(kunci.map((k) => toko.get(k, { type: 'json' })))
  return isi.filter((x): x is Objek => !!x && typeof x === 'object')
    .sort((a, b) => String(a.mulai).localeCompare(String(b.mulai)) || String(a.dibuat).localeCompare(String(b.dibuat)))
}

async function simpanPolis(req: Request, deps: DepsPribadi, uid: string, id: string): Promise<Response> {
  const isi = await bacaBody(req)
  const polis = normalisasiPolis(isi)
  const toko = deps.toko()
  const lama = await toko.get(kunciPolis(uid, id), { type: 'json' }) as Objek | null
  if (!lama) {
    const daftar = await toko.list({ prefix: awalanPolis(uid) })
    if ((daftar.blobs || []).length >= BATAS_POLIS.polis) throw new Galat(409, 'too_many_policies', 'Maksimal ' + BATAS_POLIS.polis + ' polis per akun.')
  }
  const sekarang = new Date().toISOString()
  const data = { versi: 1, id, ...polis, dibuat: (lama && typeof lama.dibuat === 'string') ? lama.dibuat : sekarang, diperbarui: sekarang }
  await toko.setJSON(kunciPolis(uid, id), data)
  return jawabJson(lama ? 200 : 201, { ok: true, penyimpanan: penyimpanan(deps), polis: data })
}

async function hapusPolis(deps: DepsPribadi, uid: string, id: string): Promise<Response> {
  const toko = deps.toko()
  const lama = await toko.get(kunciPolis(uid, id), { type: 'json' })
  if (!lama) throw new Galat(404, 'not_found', 'Polis tidak ditemukan.')
  await toko.delete(kunciPolis(uid, id))
  return jawabJson(200, { ok: true, penyimpanan: penyimpanan(deps), dihapus: id })
}

/* ---------- Rute ---------- */

function penyimpanan(deps: DepsPribadi) {
  return deps.namaStore === STORE_PRODUKSI ? 'production' : 'preview'
}

async function ringkasan(deps: DepsPribadi, uid: string): Promise<Response> {
  const toko = deps.toko()
  const [pesan, polis] = await Promise.all([bacaPesan(toko, uid), bacaSemuaPolis(toko, uid)])
  return jawabJson(200, { ok: true, penyimpanan: penyimpanan(deps), pesan, polis })
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

/* GET    /api/psg/pribadi             — data pribadi milik akun yang sedang masuk
   PUT    /api/psg/pribadi/pesan       — simpan atau kosongkan pesan personal
   PUT    /api/psg/pribadi/polis/:id   — buat atau perbarui satu polis (Asuransiku)
   DELETE /api/psg/pribadi/polis/:id   — hapus satu polis beserta ridernya */
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
    if (sisa.startsWith('/polis/')) {
      const id = sisa.slice('/polis/'.length)
      if (metode !== 'PUT' && metode !== 'DELETE') return jawabJson(405, { error: 'method_not_allowed' }, { Allow: 'PUT, DELETE' })
      periksaPermintaan(req, true)
      const uid = await pemilik(deps)
      if (!ID_POLIS.test(id)) return gagal(400, 'invalid_id', 'ID polis tidak valid.')
      return metode === 'PUT' ? await simpanPolis(req, deps, uid, id) : await hapusPolis(deps, uid, id)
    }
    return gagal(404, 'not_found', 'Alamat tidak dikenal.')
  } catch (e) {
    if (e instanceof Galat) return gagal(e.status, e.kode, e.message)
    return gagal(503, 'storage_unavailable', 'Penyimpanan sedang tidak dapat diakses. Coba lagi.')
  }
}
