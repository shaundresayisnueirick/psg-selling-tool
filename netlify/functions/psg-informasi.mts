/* API privat Pusat Informasi. Deploy Preview memakai Blob store terpisah;
   hanya deploy context persis "production" yang dapat memilih store Production. */
import { getUser } from '@netlify/identity'
import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'
import { tanganiInformasi, namaStoreInformasi } from '../lib/psg-informasi.mts'
import { cekKonfirmasiIdentity, tokenSesi } from '../lib/psg-pribadi.mts'
import { alamatSitus } from '../lib/psg-agents.mts'

function urlUtamaSitus(context: Context | undefined): string | null {
  let dariEnv: string | undefined
  try { dariEnv = typeof Netlify !== 'undefined' ? Netlify.env.get('URL') : undefined } catch (_) { dariEnv = undefined }
  return alamatSitus(context?.site?.url, dariEnv, typeof process !== 'undefined' ? process.env?.URL : undefined)
}

export default async (req: Request, context: Context) => {
  const nama = namaStoreInformasi(context?.deploy?.context)
  return tanganiInformasi(req, {
    ambilUser: getUser,
    toko: () => getStore({ name: nama, consistency: 'strong' }),
    namaStore: nama,
    cekKonfirmasi: (userId) => cekKonfirmasiIdentity(urlUtamaSitus(context), tokenSesi(req), userId),
  })
}

export const config: Config = { path: ['/api/psg/informasi', '/api/psg/informasi/*'] }
