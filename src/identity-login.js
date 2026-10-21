/* PSG Selling Tools — email/password Identity login (PR #20)
   Satu-satunya jalur masuk: @netlify/identity -> GET /api/psg/me (server-side
   source of truth). Login kode akses lama dicabut sejak 15 Oktober 2026:
   src/access-gate.js tidak lagi punya formulir kode, dan layar hanya dibuka
   sesudah /api/psg/me mengakui sesi Identity (invite-only).

   Tidak menyimpan password/token sendiri. Sesi dikelola sepenuhnya oleh
   @netlify/identity. Data kerja nasabah/Library tidak disentuh. */
(function () {
  'use strict';

  var ID_GATE = 'insuranceAccessGate';
  var ID_IDENTITY_FORM = 'psgIdentityForm';
  var ID_FORGOT_FORM = 'psgIdentityForgotForm';
  var ID_RESTORE_STATUS = 'psgIdentityRestoreStatus';
  var bootSedangBerjalan = false;
  var penggunaLokal = null;   // pengguna dari sesi lokal (bukan bukti autentikasi server)

  function lib() {
    var x = window.PSGNetlifyIdentity;
    return x && typeof x.login === 'function' && typeof x.getUser === 'function'
      && typeof x.logout === 'function' && typeof x.requestPasswordRecovery === 'function'
      ? x : null;
  }

  function identityPhotoKey(email) {
    var normalized = String(email || '').trim().toLowerCase();
    return normalized ? 'insuranceHub.agen.foto.identity.v1.' + encodeURIComponent(normalized) : '';
  }

  window.InsuranceHubIdentityPhotoKey = identityPhotoKey;
  window.InsuranceHubCurrentPhotoKey = function () {
    var identity = window.InsuranceHubIdentity;
    if (identity && identity.source === 'server:/api/psg/me') return identityPhotoKey(identity.email);
    return 'insuranceHub.agen.foto.v1';
  };

  function setError(node, message) {
    if (node) node.textContent = message || '';
  }

  function friendlyAuthError(err) {
    var msg = String(err && err.message || '').toLowerCase();
    if (msg.includes('invalid') || msg.includes('password') || msg.includes('credentials')) {
      return 'Email atau password tidak benar.';
    }
    if (msg.includes('not confirmed') || msg.includes('confirm')) {
      return 'Email akun belum terkonfirmasi. Gunakan email konfirmasi dari Netlify Identity terlebih dahulu.';
    }
    if (msg.includes('disabled') || msg.includes('suspended')) {
      return 'Akun Identity sedang tidak aktif. Hubungi admin/owner PSG.';
    }
    return 'Login tidak dapat diproses. Periksa koneksi internet lalu coba lagi.';
  }

  function profileDiizinkan(profile) {
    if (!profile || profile.status === 'nonaktif') return false;
    var roles = Array.isArray(profile.roles) ? profile.roles : [];
    return roles.indexOf('psg_owner') >= 0 || roles.indexOf('psg_admin') >= 0 ||
      ['FC', 'BM', 'BD'].indexOf(profile.level) >= 0;
  }

  function setIdentityMemory(profile) {
    /* State runtime ini murni berasal dari /api/psg/me. Tidak ditulis ke storage.
       InsuranceHubLevel hanya jembatan kompatibilitas untuk modul lama. */
    window.InsuranceHubIdentity = {
      email: profile.email || null,
      nama: profile.nama || null,
      roles: Array.isArray(profile.roles) ? profile.roles.slice() : [],
      level: profile.level || null,
      kodeAgen: profile.kodeAgen || null,
      status: profile.status || null,
      emailTerkonfirmasi: !!profile.emailTerkonfirmasi,
      source: 'server:/api/psg/me'
    };
    window.InsuranceHubLevel = {
      level: profile.level || null,
      nama: profile.level === 'FC' ? 'Financial Consultant' :
            profile.level === 'BM' ? 'Business Manager' :
            profile.level === 'BD' ? 'Business Director' : '',
      namaAgen: profile.nama || '',
      kodeAgen: profile.kodeAgen || '',
      source: 'identity-server'
    };
  }

  function bukaAplikasi(profile, opsi) {
    var offline = !!(opsi && opsi.offline);
    setIdentityMemory(profile);
    window.InsuranceHubIdentity.offline = offline;
    if (offline) { if (window.PSGOffline) window.PSGOffline.masuk(); }
    else if (window.PSGOffline) {
      /* verifikasi server berhasil: catat (14 hari baru) dan keluar dari mode offline */
      window.PSGOffline.keluar(); window.PSGOffline.catat(profile); window.PSGOffline.bersihTandaKeluar();
    }
    var gate = document.getElementById(ID_GATE);
    if (gate) gate.remove();
    document.documentElement.classList.remove('insurance-auth-locked');
    window.dispatchEvent(new Event('psg:identity-ready'));
  }

  function tampilkanStatusPemulihan(gate, status, message) {
    var node = document.getElementById(ID_RESTORE_STATUS);
    var identity = gate && gate.querySelector('.psg-identity-login');
    if (!node) return;
    if (identity) identity.hidden = status !== 'login';
    node.hidden = status === 'login';
    node.textContent = message || '';
    node.classList.toggle('psg-identity-restore-error', status === 'error');
    if (status === 'error') {
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'psg-identity-link';
      retry.textContent = 'Coba lagi';
      retry.addEventListener('click', boot);
      node.appendChild(retry);
    }
  }

  /* Galat jaringan (fetch gagal, timeout, atau 5xx) dibedakan dari penolakan
     autentikasi yang sah (401 / authenticated:false → null). Hanya penolakan
     yang boleh mengakhiri sesi; galat jaringan membawa .jaringan = true. */
  function galatJaringan(pesan) { var e = new Error(pesan || 'jaringan'); e.jaringan = true; return e; }
  async function profilServer() {
    var kendali = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = kendali ? setTimeout(function () { kendali.abort(); }, 10000) : null;
    var response;
    try {
      /* fetch asli: pembungkus mode offline tidak boleh menahan pemeriksaan ini */
      var opsiMe = {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
        signal: kendali ? kendali.signal : undefined
      };
      var fetchAsli = window.PSGOffline && window.PSGOffline.fetchAsli;
      response = await (fetchAsli ? fetchAsli('/api/psg/me', opsiMe) : fetch('/api/psg/me', opsiMe));
    } catch (_) {
      throw galatJaringan('server_unreachable');
    } finally {
      if (timer) clearTimeout(timer);
    }
    var data = {};
    try { data = await response.json(); } catch (_) {}
    if (response.status === 401) return null;
    if (!response.ok) throw galatJaringan('server_profile_failed');
    if (!data.authenticated) return null;
    if (!data.user) throw galatJaringan('server_profile_failed');
    return data.user;
  }

  /* Sesi lokal ada tetapi server menolak token di cookie (mis. kedaluwarsa):
     perbarui lewat jalur refresh resmi lalu coba sekali lagi. Bila refresh gagal
     karena jaringan, sesi TIDAK dihapus (galat jaringan dilempar). */
  async function profilServerDenganPemulihan(api) {
    var profile = await profilServer();
    if (profile) return profile;
    if (typeof api.refreshSession !== 'function') return null;
    var r = await api.refreshSession(true);   // server menolak token: paksa refresh resmi
    if (r.ok) return profilServer();
    if (r.alasan === 'jaringan') throw galatJaringan('refresh_unreachable');
    return null;
  }

  async function validasiSesiAda(identityUser) {
    var api = lib();
    if (!api) return null;
    if (!identityUser) identityUser = await api.getUser();
    if (!identityUser) return null;
    penggunaLokal = identityUser;

    var profile = await profilServerDenganPemulihan(api);
    /* Server menolak atau menonaktifkan akun: hak offline ikut dicabut. */
    if (!profile || profile.status === 'nonaktif' || !profileDiizinkan(profile)) { if (window.PSGOffline) window.PSGOffline.hapus(); }
    if (!profile) {
      await api.logout().catch(function () {});
      return null;
    }
    if (profile.status === 'nonaktif') {
      await api.logout().catch(function () {});
      setError(document.getElementById('psgIdentityServerError'), 'Akun PSG kamu berstatus nonaktif. Hubungi admin/owner PSG.');
      return null;
    }
    if (!profileDiizinkan(profile)) {
      await api.logout().catch(function () {});
      setError(document.getElementById('psgIdentityServerError'), 'Akun Identity sudah terautentikasi, tetapi belum mendapat hak akses PSG. Tunggu assignment dari admin/owner.');
      return null;
    }
    return profile;
  }

  /* Dipakai setelah setup resmi owner tersimpan di app_metadata.psg.
     Muat ulang data melalui endpoint server sebelum memperbarui semua layar. */
  window.InsuranceHubRefreshIdentityProfile = async function () {
    var profile = await validasiSesiAda();
    if (!profile) return false;
    bukaAplikasi(profile);
    return true;
  };

  /* Profil dari respons function setup juga berasal langsung dari Identity
     Admin API. Cocokkan email dan role sesi sebelum menerapkannya ke runtime. */
  window.InsuranceHubApplyIdentityProfile = function (profile) {
    var current = window.InsuranceHubIdentity;
    var email = String(profile && profile.email || '').trim().toLowerCase();
    if (!current || current.source !== 'server:/api/psg/me' || !email ||
        email !== String(current.email || '').trim().toLowerCase() ||
        !(Array.isArray(profile.roles) && profile.roles.indexOf('psg_owner') >= 0) ||
        profile.status === 'nonaktif') return false;
    bukaAplikasi(profile);
    return true;
  };

  function pasangFormEmail(gate) {
    if (!gate || gate.dataset.psgIdentityReady === '1') return;
    var card = gate.querySelector('.insurance-access-card');
    if (!card) return;

    gate.dataset.psgIdentityReady = '1';

    var existingKicker = card.querySelector('.insurance-access-kicker');
    var existingTitle = card.querySelector('#insuranceAccessTitle');
    var existingSub = card.querySelector('.insurance-access-sub');
    if (existingKicker) existingKicker.style.display = 'none';
    if (existingTitle) existingTitle.style.display = 'none';
    if (existingSub) existingSub.style.display = 'none';

    var identity = document.createElement('section');
    identity.className = 'psg-identity-login';
    identity.setAttribute('aria-labelledby', 'psgIdentityLoginTitle');
    identity.innerHTML =
      '<div class="insurance-access-kicker">AKSES INTERNAL</div>' +
      '<h2 id="psgIdentityLoginTitle">Insurance Hub</h2>' +
      '<p class="insurance-access-sub">Masuk dengan email dan password akun PSG kamu.</p>' +
      '<form id="' + ID_IDENTITY_FORM + '" novalidate>' +
        '<label class="insurance-access-label" for="psgIdentityEmail">Email</label>' +
        '<input id="psgIdentityEmail" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required placeholder="nama@email.com">' +
        '<label class="insurance-access-label" for="psgIdentityPassword">Password</label>' +
        '<div class="psg-identity-password">' +
          '<input id="psgIdentityPassword" name="password" type="password" autocomplete="current-password" required placeholder="Password">' +
          '<button type="button" class="psg-identity-eye" id="psgIdentityTogglePassword" aria-label="Tampilkan password" aria-pressed="false">👁</button>' +
        '</div>' +
        '<button type="submit" class="insurance-access-btn" id="psgIdentityMasuk">MASUK</button>' +
        '<div id="psgIdentityServerError" class="insurance-access-error" aria-live="polite"></div>' +
        '<button type="button" class="psg-identity-link" id="psgIdentityForgotToggle">Lupa Password?</button>' +
      '</form>' +
      '<form id="' + ID_FORGOT_FORM + '" novalidate hidden>' +
        '<label class="insurance-access-label" for="psgIdentityForgotEmail">Email untuk pemulihan</label>' +
        '<input id="psgIdentityForgotEmail" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required placeholder="nama@email.com">' +
        '<button type="submit" class="insurance-access-btn">KIRIM LINK PEMULIHAN</button>' +
        '<div id="psgIdentityForgotError" class="insurance-access-error" aria-live="polite"></div>' +
        '<button type="button" class="psg-identity-link" id="psgIdentityForgotCancel">Kembali ke login</button>' +
      '</form>';

    var restoreStatus = document.createElement('div');
    restoreStatus.id = ID_RESTORE_STATUS;
    restoreStatus.className = 'psg-identity-restoring';
    restoreStatus.setAttribute('role', 'status');
    restoreStatus.setAttribute('aria-live', 'polite');
    restoreStatus.hidden = true;

    var logo = card.querySelector('.insurance-access-logo');
    if (logo && logo.nextSibling) card.insertBefore(identity, logo.nextSibling);
    else card.insertBefore(identity, card.firstChild);
    card.insertBefore(restoreStatus, identity);

    var eye = document.getElementById('psgIdentityTogglePassword');
    var password = document.getElementById('psgIdentityPassword');
    eye.addEventListener('click', function () {
      var shown = password.type === 'text';
      password.type = shown ? 'password' : 'text';
      eye.setAttribute('aria-pressed', shown ? 'false' : 'true');
      eye.setAttribute('aria-label', shown ? 'Tampilkan password' : 'Sembunyikan password');
    });

    document.getElementById(ID_IDENTITY_FORM).addEventListener('submit', async function (event) {
      event.preventDefault();
      var emailEl = document.getElementById('psgIdentityEmail');
      var passwordEl = document.getElementById('psgIdentityPassword');
      var button = document.getElementById('psgIdentityMasuk');
      var error = document.getElementById('psgIdentityServerError');
      setError(error, '');

      if (!emailEl.checkValidity()) {
        emailEl.reportValidity();
        return;
      }
      if (!passwordEl.value) {
        setError(error, 'Masukkan password.');
        passwordEl.focus();
        return;
      }

      var api = lib();
      if (!api) {
        setError(error, 'Layanan login belum termuat. Muat ulang halaman.');
        return;
      }

      button.disabled = true;
      button.textContent = 'MEMERIKSA…';

      try {
        await api.login(emailEl.value.trim(), passwordEl.value);
        passwordEl.value = '';
        var profile = await profilServer();

        if (!profile) {
          await api.logout().catch(function () {});
          throw new Error('unauthenticated_after_login');
        }
        if (profile.status === 'nonaktif') {
          await api.logout().catch(function () {});
          throw new Error('account_inactive');
        }
        if (!profileDiizinkan(profile)) {
          await api.logout().catch(function () {});
          throw new Error('psg_access_missing');
        }

        bukaAplikasi(profile);
      } catch (err) {
        var msg = String(err && err.message || '');
        if (msg === 'account_inactive') {
          setError(error, 'Akun PSG kamu berstatus nonaktif. Hubungi admin/owner PSG.');
        } else if (msg === 'psg_access_missing') {
          setError(error, 'Akun sudah terautentikasi, tetapi belum mendapat hak akses PSG. Tunggu assignment dari admin/owner.');
        } else if (msg === 'unauthenticated_after_login') {
          setError(error, 'Sesi berhasil dibuat tetapi verifikasi server belum berhasil. Coba login lagi.');
        } else {
          setError(error, friendlyAuthError(err));
        }
      } finally {
        button.disabled = false;
        button.textContent = 'MASUK';
      }
    });

    document.getElementById('psgIdentityForgotToggle').addEventListener('click', function () {
      document.getElementById(ID_IDENTITY_FORM).hidden = true;
      document.getElementById(ID_FORGOT_FORM).hidden = false;
      var email = document.getElementById('psgIdentityEmail');
      var forgotEmail = document.getElementById('psgIdentityForgotEmail');
      if (email && forgotEmail) forgotEmail.value = email.value;
      if (forgotEmail) setTimeout(function () { forgotEmail.focus(); }, 30);
    });

    document.getElementById('psgIdentityForgotCancel').addEventListener('click', function () {
      document.getElementById(ID_FORGOT_FORM).hidden = true;
      document.getElementById(ID_IDENTITY_FORM).hidden = false;
      setError(document.getElementById('psgIdentityForgotError'), '');
    });

    document.getElementById(ID_FORGOT_FORM).addEventListener('submit', async function (event) {
      event.preventDefault();
      var email = document.getElementById('psgIdentityForgotEmail');
      var button = event.currentTarget.querySelector('button[type="submit"]');
      var error = document.getElementById('psgIdentityForgotError');
      setError(error, '');

      if (!email.checkValidity()) {
        email.reportValidity();
        return;
      }

      button.disabled = true;
      button.textContent = 'MENGIRIM…';

      try {
        var api = lib();
        if (!api) throw new Error('identity_missing');
        await api.requestPasswordRecovery(email.value.trim());
        error.className = 'insurance-access-error psg-identity-success';
        error.textContent = 'Link pemulihan sudah diminta. Periksa email kamu, lalu buka link dari situs PSG Selling Tools.';
      } catch (err) {
        error.className = 'insurance-access-error';
        error.textContent = 'Permintaan pemulihan tidak dapat dikirim. Periksa email dan koneksi internet lalu coba lagi.';
      } finally {
        button.disabled = false;
        button.textContent = 'KIRIM LINK PEMULIHAN';
      }
    });
  }

  function pesanOfflineTertutup() {
    var po = window.PSGOffline;
    return po ? po.pesanAlasan(po.periksa().alasan) : 'Sesi belum dapat diverifikasi. Periksa koneksi, lalu coba lagi.';
  }

  /* Server tidak terjangkau: buka kalkulator hanya bila (1) ada sesi lokal untuk
     akun yang sama dengan catatan, dan (2) catatan verifikasi online masih
     berlaku (<= 14 hari, jam tidak mundur). Catatan bukan bukti autentikasi. */
  function bukaOffline(gate) {
    var po = window.PSGOffline;
    if (!po || !penggunaLokal) return false;
    var p = po.periksa();
    if (!p.ok || String(penggunaLokal.id) !== p.rekam.uid || !profileDiizinkan(p.rekam.profil)) return false;
    bukaAplikasi(p.rekam.profil, { offline: true });
    return true;
  }

  /* Sesi lokal diperbarui saat aplikasi aktif lagi / koneksi kembali, dan profil
     diverifikasi ulang ke server. Keputusan server berlaku: penolakan pasti
     (401 sesudah refresh) mengunci aplikasi; gangguan jaringan tidak. */
  var sedangMemulihkan = false, terakhirPulih = 0;
  async function pulihkanBerkala(paksa) {
    var api = lib();
    if (sedangMemulihkan || !api || !window.InsuranceHubIdentity) return;
    if (!paksa && Date.now() - terakhirPulih < 60000) return;
    sedangMemulihkan = true; terakhirPulih = Date.now();
    try {
      var profile = await validasiSesiAda(null);
      if (profile) { if (window.InsuranceHubIdentity.offline) bukaAplikasi(profile); else if (window.PSGOffline) window.PSGOffline.catat(profile); }
      else { if (window.PSGOffline) window.PSGOffline.hapus(); window.location.reload(); }
    } catch (_) { /* jaringan: sesi dan mode saat ini dipertahankan */ }
    finally { sedangMemulihkan = false; }
  }
  window.addEventListener('online', function () { pulihkanBerkala(true); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) pulihkanBerkala(false); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) pulihkanBerkala(false); });

  async function boot() {
    if (bootSedangBerjalan) return;
    bootSedangBerjalan = true;
    try {
    var api = lib();
    var gate = document.getElementById(ID_GATE);
    var identityUser = null;

    /* Gate selalu dipasang access-gate.js saat dimuat. Bila karena satu dan
       lain hal tidak ada, layar tetap dikunci dan gate dipasang ulang: tidak
       ada jalur yang membuka aplikasi tanpa sesi Identity yang diverifikasi. */
    if (!gate) {
      document.documentElement.classList.add('insurance-auth-locked');
      gate = typeof window.insuranceHubEnsureAccessGate === 'function'
        ? window.insuranceHubEnsureAccessGate() : null;
      if (!gate) return;
    }

    if (!api) {
      pasangFormEmail(gate);
      tampilkanStatusPemulihan(gate, 'login');
      return;
    }

    pasangFormEmail(gate);
    /* Logout yang belum selesai (dari halaman ringkasan, atau saat offline):
       selesaikan sekarang dan jangan pernah memulihkan sesi itu. */
    var tandaKeluar = window.PSGOffline && window.PSGOffline.bacaTandaKeluar();
    if (tandaKeluar) {
      try { await api.logout(); } catch (_) {}
      if (window.PSGOffline) { window.PSGOffline.hapusSesiLokal(); window.PSGOffline.hapus(); window.PSGOffline.bersihTandaKeluar(); }
      tampilkanStatusPemulihan(gate, 'login');
      if (tandaKeluar.belumTerkonfirmasi) {
        setError(document.getElementById('psgIdentityServerError'), 'Kamu keluar saat offline. Sesi di perangkat ini sudah dihapus, tetapi pencabutan di server belum dapat dikonfirmasi.');
      }
      return;
    }
    tampilkanStatusPemulihan(gate, 'restoring', 'Memulihkan sesi dan memeriksa profil PSG…');
    var profile;
    try {
      profile = await validasiSesiAda(identityUser);
    } catch (err) {
      if (err && err.jaringan && bukaOffline(gate)) return;
      tampilkanStatusPemulihan(gate, 'error', err && err.jaringan ? pesanOfflineTertutup() : 'Sesi belum dapat diverifikasi. Periksa koneksi, lalu coba lagi.');
      return;
    }
    if (profile) {
      bukaAplikasi(profile);
      return;
    }

    tampilkanStatusPemulihan(gate, 'login');
    var email = document.getElementById('psgIdentityEmail');
    if (email) setTimeout(function () { email.focus(); }, 50);
    } finally {
      bootSedangBerjalan = false;
    }
  }

  var previousLogout = window.insuranceHubLogout;
  window.insuranceHubLogout = async function () {
    var po = window.PSGOffline;
    /* Hak offline dicabut lebih dulu dan tanpa syarat. Saat offline, pencabutan di
       server belum dapat dikonfirmasi; sesi lokal tetap dihapus. */
    var belumTerkonfirmasi = !!(po && po.aktif) || navigator.onLine === false;
    if (po) { po.hapus(); po.tandaiKeluar(belumTerkonfirmasi); }
    var api = lib();
    var cabutDiServer = true;
    if (api) {
      try { await api.logout(); } catch (_) { cabutDiServer = false; }
    }
    /* Logout selesai di sini: tanda hanya dipertahankan bila pencabutan di server
       belum terkonfirmasi (offline / gagal), supaya boot berikutnya mengulanginya. */
    if (po) {
      if (cabutDiServer && !belumTerkonfirmasi) po.bersihTandaKeluar();
      else po.tandaiKeluar(true);
    }
    if (typeof previousLogout === 'function') return previousLogout();
    document.documentElement.classList.add('insurance-auth-locked');
    window.location.href = 'index.html';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
