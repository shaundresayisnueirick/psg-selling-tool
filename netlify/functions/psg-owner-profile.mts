/* Endpoint setup profil satu kali untuk PSG Owner lama. Tidak dipakai oleh
   Invite Agen dan tidak dapat mengubah profil yang sudah lengkap. */

import { getIdentityConfig, getUser } from '@netlify/identity'
import type { Config, Context } from '@netlify/functions'
import { tanganiOwnerProfile } from '../lib/psg-owner-profile.mts'

function urlUtamaSitus(context: Context | undefined): string | null {
  const candidates: unknown[] = [context?.site?.url]
  try { candidates.push(typeof Netlify !== 'undefined' ? Netlify.env.get('URL') : undefined) } catch (_) {}
  try { candidates.push(typeof process !== 'undefined' ? process.env?.URL : undefined) } catch (_) {}
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue
    try {
      const url = new URL(candidate.trim())
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin
    } catch (_) {}
  }
  return null
}

export default async (req: Request, context: Context) => {
  return tanganiOwnerProfile(req, {
    ambilUser: getUser,
    identitas: () => {
      const config = getIdentityConfig()
      const url = urlUtamaSitus(context) || (typeof config?.url === 'string' ? config.url : '')
      const token = typeof config?.token === 'string' ? config.token : ''
      return { url: url ? url.replace(/\/+$/, '') + '/.netlify/identity' : '', token }
    },
  })
}

export const config: Config = { path: '/api/psg/profile-setup' }
