/* PSG Selling Tools — email/password Identity login (PR #20)
   Jalur utama: @netlify/identity -> GET /api/psg/me (server-side source of truth).
   Jalur lama tetap dipertahankan oleh src/access-gate.js dan hanya disembunyikan
   di balik tombol "Masuk dengan Kode Akses Lama" saat layar Identity aktif.

   Tidak menyimpan password/token sendiri. Sesi dikelola sepenuhnya oleh
   @netlify/identity. Data kerja nasabah/Library tidak disentuh. */
(function () {
  'use strict';

  var ID_GATE = 'insuranceAccessGate';
  var ID_IDENTITY_FORM = 'psgIdentityForm';
  var ID_FORGOT_FORM = 'psgIdentityForgotForm';
  var ID_RESTORE_STATUS = 'psgIdentityRestoreStatus';
  var bootSedangBerjalan = false;

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

  function bukaAplikasi(profile) {
    setIdentityMemory(profile);
    var gate = document.getElementById(ID_GATE);
    if (gate) gate.remove();
    document.documentElement.classList.remove('insurance-auth-locked');
    window.dispatchEvent(new Event('psg:identity-ready'));
  }

  function tampilkanStatusPemulihan(gate, status, message) {
    var node = document.getElementById(ID_RESTORE_STATUS);
    var identity = gate && gate.querySelector('.psg-identity-login');
    var legacy = document.getElementById('psgIdentityLegacyWrap');
    if (!node) return;
    if (identity) identity.hidden = status !== 'login';
    if (legacy) legacy.hidden = true;
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

  async function profilServer() {
    var response = await fetch('/api/psg/me', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    var data = {};
    try { data = await response.json(); } catch (_) {}
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('server_profile_failed');
    if (!data.authenticated) return null;
    if (!data.user) throw new Error('server_profile_failed');
    return data.user;
  }

  async function validasiSesiAda(identityUser) {
    var api = lib();
    if (!api) return null;
    if (!identityUser) identityUser = await api.getUser();
    if (!identityUser) return null;

    var profile = await profilServer();
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

  function pasangFormEmail(gate) {
    if (!gate || gate.dataset.psgIdentityReady === '1') return;
    var card = gate.querySelector('.insurance-access-card');
    var legacyForm = gate.querySelector('#insuranceAccessForm');
    if (!card || !legacyForm) return;

    gate.dataset.psgIdentityReady = '1';

    var existingKicker = card.querySelector('.insurance-access-kicker');
    var existingTitle = card.querySelector('#insuranceAccessTitle');
    var existingSub = card.querySelector('.insurance-access-sub');
    if (existingKicker) existingKicker.style.display = 'none';
    if (existingTitle) existingTitle.style.display = 'none';
    if (existingSub) existingSub.style.display = 'none';

    var sapaan = gate.querySelector('#insuranceSapaan');
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
      '<div class="psg-identity-divider" aria-hidden="true"><span>atau</span></div>' +
      '<button type="button" class="psg-identity-legacy-toggle" id="psgIdentityLegacyToggle">MASUK DENGAN KODE AKSES LAMA</button>' +
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

    var legacyWrap = document.createElement('div');
    legacyWrap.id = 'psgIdentityLegacyWrap';
    legacyWrap.hidden = true;
    legacyWrap.innerHTML = '<div class="psg-identity-legacy-title">Login Kode Akses Lama</div>';
    if (sapaan) legacyWrap.appendChild(sapaan);
    legacyWrap.appendChild(legacyForm);
    card.insertBefore(legacyWrap, card.querySelector('.insurance-access-note') || null);

    function toggleLegacy(show) {
      legacyWrap.hidden = !show;
      identity.hidden = show;
      if (show) {
        var input = document.getElementById('insuranceAccessCode');
        if (input) setTimeout(function () { input.focus(); }, 30);
      } else {
        var email = document.getElementById('psgIdentityEmail');
        if (email) setTimeout(function () { email.focus(); }, 30);
      }
    }

    document.getElementById('psgIdentityLegacyToggle').addEventListener('click', function () {
      toggleLegacy(true);
    });

    var legacyBack = document.createElement('button');
    legacyBack.type = 'button';
    legacyBack.className = 'psg-identity-link';
    legacyBack.textContent = 'Kembali ke login email';
    legacyBack.addEventListener('click', function () { toggleLegacy(false); });
    legacyWrap.appendChild(legacyBack);

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

  async function boot() {
    if (bootSedangBerjalan) return;
    bootSedangBerjalan = true;
    try {
    var api = lib();
    var gate = document.getElementById(ID_GATE);
    var identityUser = null;

    /* Kode akses lama boleh membuka gate lebih awal. Bila itu terjadi, cek
       sesi Identity tetap wajib dilakukan; jangan berhenti hanya karena gate
       sudah dihapus oleh sesi perangkat lama. */
    if (!gate) {
      if (!api) return;
      try { identityUser = await api.getUser(); } catch (_) { return; }
      if (!identityUser) return;
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
    tampilkanStatusPemulihan(gate, 'restoring', 'Memulihkan sesi dan memeriksa profil PSG…');
    var profile;
    try {
      profile = await validasiSesiAda(identityUser);
    } catch (_) {
      tampilkanStatusPemulihan(gate, 'error', 'Sesi belum dapat diverifikasi. Periksa koneksi, lalu coba lagi.');
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
    var api = lib();
    if (api) {
      try { await api.logout(); } catch (_) {}
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
