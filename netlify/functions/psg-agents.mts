/* PSG Selling Tools — Invite Agen (/api/psg/agents).

   Sesi pengguna diverifikasi dengan getUser(). Token operator Identity
   diambil dari getIdentityConfig(), tetapi permintaan admin diarahkan ke URL
   utama situs (context.site.url / URL), bukan ke URL Deploy Preview yang bisa
   terkunci login tim Netlify. Logika lengkap: netlify/lib/psg-agents.mts. */

import { getIdentityConfig, getUser } from '@netlify/identity'
import type { Config, Context } from '@netlify/functions'
import { alamatSitus, identitasAdmin, tanganiAgents } from '../lib/psg-agents.mts'

function urlUtamaSitus(context: Context | undefined): string | null {
  let dariEnv: string | undefined
  try { dariEnv = typeof Netlify !== 'undefined' ? Netlify.env.get('URL') : undefined } catch (_) { dariEnv = undefined }
  return alamatSitus(context?.site?.url, dariEnv, typeof process !== 'undefined' ? process.env?.URL : undefined)
}

export default async (req: Request, context: Context) =>
  tanganiAgents(req, {
    ambilUser: getUser,
    identitas: () => identitasAdmin(getIdentityConfig(), urlUtamaSitus(context)),
  })

export const config: Config = { path: '/api/psg/agents' }
