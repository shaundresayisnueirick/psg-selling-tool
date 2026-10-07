/* Identity event function.

   PSG Selling Tools bersifat Invite Only: akun dibuat oleh owner/admin,
   bukan lewat pendaftaran mandiri. Setelan "Registration: Invite only" di
   dashboard tetap disarankan; penolakan di sini adalah pengaman kedua bila
   setelan itu terbuka, misalnya tepat setelah Identity diaktifkan.

   userValidate hanya berjalan untuk pendaftaran mandiri (signup). Undangan
   dari dashboard dan akun yang dibuat lewat admin API tidak melewati hook
   ini, jadi tidak ikut tertolak. */

import type { UserValidateEvent } from '@netlify/functions'

export default {
  userValidate(event: UserValidateEvent) {
    return event.deny()
  },
}
