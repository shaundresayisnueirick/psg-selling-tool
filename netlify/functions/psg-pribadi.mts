/* PSG Selling Tools — data pribadi agen (/api/psg/pribadi).

   Sesi diverifikasi dengan getUser() dari @netlify/identity. Data disimpan
   di Netlify Blobs per user.id. Nama store ditentukan dari konteks deploy
   runtime (context.deploy.context): hanya "production" yang memakai store
   production. Bila getUser() hanya bisa membaca klaim JWT (profil lengkap
   gagal diambil, misalnya di Deploy Preview), status konfirmasi email
   diverifikasi ulang ke Identity lewat URL utama situs.
   Logika lengkap: netlify/lib/psg-pribadi.mts. */

import { getUser } from '@netlify/identity'
import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'
import { cekKonfirmasiIdentity, namaStore, tanganiPribadi, tokenSesi } from '../lib/psg-pribadi.mts'
import { alamatSitus } from '../lib/psg-agents.mts'

/* URL utama situs (bukan URL Deploy Preview), sama seperti Invite Agen. */
function urlUtamaSitus(context: Context | undefined): string | null {
  let dariEnv: string | undefined
  try { dariEnv = typeof Netlify !== 'undefined' ? Netlify.env.get('URL') : undefined } catch (_) { dariEnv = undefined }
  return alamatSitus(context?.site?.url, dariEnv, typeof process !== 'undefined' ? process.env?.URL : undefined)
}

export default async (req: Request, context: Context) => {
  const nama = namaStore(context?.deploy?.context)
  return tanganiPribadi(req, {
    ambilUser: getUser,
    toko: () => getStore({ name: nama, consistency: 'strong' }),
    namaStore: nama,
    cekKonfirmasi: (userId) => cekKonfirmasiIdentity(urlUtamaSitus(context), tokenSesi(req), userId),
  })
}

export const config: Config = { path: ['/api/psg/pribadi', '/api/psg/pribadi/*'] }
