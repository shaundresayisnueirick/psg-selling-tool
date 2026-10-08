/* Identity lifecycle hooks for PSG system roles.

   PSG application roles live in app_metadata.roles:
   - psg_owner
   - psg_admin

   Netlify/GoTrue admin endpoints use the user's built-in admin role for
   privileged Identity administration. We keep that infrastructure role
   separate from PSG's business/system roles: only PSG Owner/Admin users get
   role="admin". Ordinary FC/BM/BD agents remain ordinary Identity users.
   
   On login, this hook normalizes the built-in Identity role to "admin" for
   PSG Owner/Admin accounts. The change is persisted by the Identity event
   system and becomes effective with the fresh login session. */

import type { UserLoginEvent } from '@netlify/functions'

export default {
  userLogin(event: UserLoginEvent) {
    const roles = Array.isArray(event.user.roles) ? event.user.roles : []
    const isPsgManager = roles.includes('psg_owner') || roles.includes('psg_admin')
    if (!isPsgManager || event.user.role === 'admin') return

    return {
      user: {
        ...event.user,
        role: 'admin',
      },
    }
  },
}
