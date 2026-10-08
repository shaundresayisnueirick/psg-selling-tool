/* Sumber bundel src/vendor/netlify-identity.js.
   
   Situs ini tanpa langkah build, jadi @netlify/identity (versi di
   package-lock.json) dibundel sekali menjadi satu berkas klasik yang
   memasang window.PSGNetlifyIdentity. Hanya fungsi yang dipakai halaman
   yang diekspor. Cara membuat ulang ada di kepala berkas bundelnya. */
export {
  handleAuthCallback,
  acceptInvite,
  updateUser,
  login,
  getUser,
  logout,
  requestPasswordRecovery,
  AuthError,
  MissingIdentityError
} from '@netlify/identity'
