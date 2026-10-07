/* Profil agen yang sedang masuk, diverifikasi di server.
   Belum dipakai aplikasi: login kode akses FC/BM/BD tetap berjalan seperti
   biasa. Endpoint ini fondasi untuk login email pada tahap berikutnya. */

import { getUser } from '@netlify/identity'
import type { Config } from '@netlify/functions'
import { tanganiMe } from '../lib/psg-auth.mts'

export default async (req: Request) => tanganiMe(req, getUser)

export const config: Config = {
  path: '/api/psg/me',
}
