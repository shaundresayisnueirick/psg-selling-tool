/* Versi aplikasi yang terlihat oleh agen.

   Dipakai di dua tempat: badge kecil di kaki halaman login dan di kaki
   dashboard. Tujuannya supaya agen bisa memastikan sendiri apakah aplikasi
   di perangkatnya sudah versi terbaru — tanpa perlu bertanya.

   Naikkan angkanya setiap kali ada rilis yang dibagikan ke agen. */
window.PSG_APP_VERSION = 'v1.5';
window.PSG_APP_VERSION_LABEL = 'Aplikasi Web v1.5';

/* Nama lama dipertahankan supaya kode yang mungkin masih membacanya tidak
   mendadak mendapat undefined. */
window.INSURANCE_HUB_APP_VERSION = window.PSG_APP_VERSION;
