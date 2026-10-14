/* PSG Selling Tools — data pribadi agen (/api/psg/pribadi).

   Sesi diverifikasi dengan getUser() dari @netlify/identity. Data disimpan
   di Netlify Blobs per user.id. Nama store ditentukan dari konteks deploy
   runtime (context.deploy.context): hanya "production" yang memakai store
   production. Logika lengkap: netlify/lib/psg-pribadi.mts. */

import { getUser } from '@netlify/identity'
import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'
import { namaStore, tanganiPribadi } from '../lib/psg-pribadi.mts'

export default async (req: Request, context: Context) => {
  const nama = namaStore(context?.deploy?.context)
  return tanganiPribadi(req, {
    ambilUser: getUser,
    toko: () => getStore({ name: nama, consistency: 'strong' }),
    namaStore: nama,
  })
}

export const config: Config = { path: ['/api/psg/pribadi', '/api/psg/pribadi/*'] }
