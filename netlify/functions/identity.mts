/* Identity event function.

   PSG Selling Tools bersifat Invite Only lewat setelan dashboard
   "Registration: Invite only". Tidak ada hook lifecycle yang mengubah
   proses login/signup di sini. Admin/owner PSG dikelola sebagai role
   Identity di app_metadata.roles melalui operasi admin atau dashboard.
 */
import type { NetlifyFunction } from '@netlify/functions'

export default {} satisfies NetlifyFunction
