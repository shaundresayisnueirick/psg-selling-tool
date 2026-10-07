/* Identity event function.

   PSG Selling Tools bersifat Invite Only lewat setelan dashboard
   "Registration: Invite only"; penolakan pendaftaran publik tidak dilakukan
   di sini.

   Hook userValidate yang dulu selalu menjalankan event.deny() sudah dihapus:
   hook itu ikut berjalan saat undangan dari dashboard diproses, sehingga
   "Invite users" gagal dengan "422 Failed to handle signup webhook".
   Saat ini tidak ada handler event Identity yang aktif. */

import type { NetlifyFunction } from '@netlify/functions'

export default {} satisfies NetlifyFunction
