/* Insurance Hub — callback Netlify Identity (undangan & atur ulang password)

   Tautan di email Netlify Identity membuka halaman utama dengan token di
   hash, mis. "/#invite_token=…". Berkas ini memanggil handleAuthCallback()
   dari @netlify/identity (src/vendor/netlify-identity.js) saat halaman
   dimuat, lalu:
     - undangan  : menampilkan formulir "Buat Password"; acceptInvite(token,
                   password) baru dipanggil setelah agen mengisi password.
     - recovery  : agen sudah masuk lewat token, lalu mengisi password baru
                   lewat updateUser({ password }).
     - lainnya   : cukup pemberitahuan singkat.

   Login lama (src/access-gate.js, kode akses FC/BM/BD) tidak disentuh dan
   tetap menjadi satu-satunya kunci aplikasi selama masa migrasi: token atau
   akun Identity tidak membuka aplikasi. Password dan token hanya hidup di
   variabel selama formulir terbuka; berkas ini tidak menulis apa pun ke
   localStorage, sessionStorage, maupun cookie. Penyimpanan sesi Identity
   sepenuhnya diurus pustaka @netlify/identity. */
(function () {
  'use strict';

  var PARAM_CALLBACK = /(?:^|&)(invite_token|recovery_token|confirmation_token|email_change_token|access_token)=/;
  var MIN_PASSWORD = 8;
  var ID = 'psgIdentityGate';

  function adaCallback() {
    var h = String(window.location.hash || '').replace(/^#/, '');
    return !!h && PARAM_CALLBACK.test(h);
  }

  /* Tanpa token di alamat, tidak ada yang dikerjakan: tidak ada permintaan
     jaringan dan tidak ada perubahan tampilan. */
  if (!adaCallback()) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function wadah() {
    var w = document.getElementById(ID);
    if (!w) {
      w = document.createElement('div');
      w.id = ID;
      document.body.appendChild(w);
    }
    return w;
  }

  function tutup() {
    var w = document.getElementById(ID);
    if (w) w.remove();
  }

  function kartu(isi) {
    wadah().innerHTML =
      '<div class="insurance-access-card" role="dialog" aria-modal="true" aria-labelledby="psgIdentityTitle">' +
        '<img class="insurance-access-logo" src="assets/logo-psg.png" alt="PSG — Patriot Shining Generation">' +
        isi +
      '</div>';
  }

  function tampilkanProses() {
    kartu(
      '<div class="insurance-access-kicker">AKUN PSG</div>' +
      '<h1 id="psgIdentityTitle">Memproses tautan…</h1>' +
      '<p class="insurance-access-sub" aria-live="polite">Mohon tunggu sebentar.</p>'
    );
  }

  function tampilkanPesan(kicker, judul, teks, tombol) {
    kartu(
      '<div class="insurance-access-kicker">' + esc(kicker) + '</div>' +
      '<h1 id="psgIdentityTitle">' + esc(judul) + '</h1>' +
      '<p class="insurance-access-sub">' + teks + '</p>' +
      '<button type="button" class="insurance-access-btn" id="psgIdentityLanjut">' + esc(tombol) + '</button>'
    );
    var b = document.getElementById('psgIdentityLanjut');
    b.addEventListener('click', tutup);
    b.focus();
  }

  /* AuthError.from() pustaka tidak membawa status HTTP; status asli ada di
     cause (HTTPError gotrue-js). Tanpa status berarti gagal jaringan. */
  function statusGalat(err) {
    if (err && typeof err.status === 'number') return err.status;
    if (err && err.cause && typeof err.cause.status === 'number') return err.cause.status;
    return 0;
  }

  function pesanGagal(err, konteks) {
    var status = statusGalat(err);
    if (!status) {
      return 'Tidak dapat terhubung ke server akun. Periksa koneksi internet lalu coba lagi.';
    }
    if (konteks === 'callback') {
      return 'Tautan ini tidak valid, sudah dipakai, atau kedaluwarsa. Minta admin mengirim email baru.';
    }
    if (konteks === 'invite') {
      return 'Password belum tersimpan. Tautan undangan mungkin sudah dipakai atau kedaluwarsa; ' +
        'minta admin mengirim undangan baru.';
    }
    return 'Password belum tersimpan. Coba lagi, atau minta admin mengirim email atur ulang password.';
  }

  /* Formulir password untuk undangan baru (mode "invite") maupun atur ulang
     password (mode "recovery"). simpan(password) memanggil API resmi dan
     mengembalikan user Identity. */
  function tampilkanFormPassword(mode, simpan) {
    var undangan = mode === 'invite';
    kartu(
      '<div class="insurance-access-kicker">' + (undangan ? 'AKTIVASI AKUN' : 'ATUR ULANG PASSWORD') + '</div>' +
      '<h1 id="psgIdentityTitle">' + (undangan ? 'Buat Password' : 'Password Baru') + '</h1>' +
      '<p class="insurance-access-sub">' +
        (undangan
          ? 'Undangan diterima. Buat password untuk akun PSG Selling Tools kamu.'
          : 'Buat password baru untuk akun PSG Selling Tools kamu.') +
      '</p>' +
      '<form id="psgIdentityForm" class="psg-identity-form" novalidate>' +
        '<label class="insurance-access-label" for="psgIdentityPassword">Password baru</label>' +
        '<input id="psgIdentityPassword" type="password" autocomplete="new-password" autocapitalize="off"' +
          ' spellcheck="false" minlength="' + MIN_PASSWORD + '" required' +
          ' placeholder="Minimal ' + MIN_PASSWORD + ' karakter" aria-describedby="psgIdentityError">' +
        '<label class="insurance-access-label" for="psgIdentityPassword2">Ulangi password</label>' +
        '<input id="psgIdentityPassword2" type="password" autocomplete="new-password" autocapitalize="off"' +
          ' spellcheck="false" minlength="' + MIN_PASSWORD + '" required placeholder="Ketik ulang password"' +
          ' aria-describedby="psgIdentityError">' +
        '<button type="submit" class="insurance-access-btn" id="psgIdentitySimpan">SIMPAN PASSWORD</button>' +
        '<div id="psgIdentityError" class="insurance-access-error" aria-live="polite"></div>' +
      '</form>'
    );

    var form = document.getElementById('psgIdentityForm');
    var p1 = document.getElementById('psgIdentityPassword');
    var p2 = document.getElementById('psgIdentityPassword2');
    var tombol = document.getElementById('psgIdentitySimpan');
    var galat = document.getElementById('psgIdentityError');
    var sibuk = false;
    setTimeout(function () { p1.focus(); }, 30);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (sibuk) return;
      galat.textContent = '';
      if (p1.value.length < MIN_PASSWORD) {
        galat.textContent = 'Password minimal ' + MIN_PASSWORD + ' karakter.';
        p1.focus();
        return;
      }
      if (p1.value !== p2.value) {
        galat.textContent = 'Kedua password tidak sama.';
        p2.value = '';
        p2.focus();
        return;
      }
      sibuk = true;
      tombol.disabled = true;
      tombol.textContent = 'MENYIMPAN…';
      Promise.resolve()
        .then(function () { return simpan(p1.value); })
        .then(function (user) {
          p1.value = '';
          p2.value = '';
          var email = user && user.email ? '<b>' + esc(user.email) + '</b>' : 'kamu';
          tampilkanPesan('AKUN AKTIF', 'Password tersimpan',
            'Akun ' + email + ' sudah aktif. Selama masa transisi, masuk aplikasi tetap memakai ' +
            'kode akses seperti biasa.', 'LANJUT KE APLIKASI');
        })
        .catch(function (err) {
          sibuk = false;
          tombol.disabled = false;
          tombol.textContent = 'SIMPAN PASSWORD';
          galat.textContent = pesanGagal(err, mode);
        });
    });
  }

  function proses(lib) {
    tampilkanProses();
    Promise.resolve()
      .then(function () { return lib.handleAuthCallback(); })
      .then(function (hasil) {
        if (!hasil) { tutup(); return; }
        if (hasil.type === 'invite' && hasil.token) {
          /* Token undangan tetap di closure ini dan hanya diteruskan ke
             acceptInvite(); tidak disimpan dan tidak ditampilkan. */
          var token = hasil.token;
          tampilkanFormPassword('invite', function (password) {
            return lib.acceptInvite(token, password);
          });
          return;
        }
        if (hasil.type === 'recovery') {
          tampilkanFormPassword('recovery', function (password) {
            return lib.updateUser({ password: password });
          });
          return;
        }
        var email = hasil.user && hasil.user.email ? ' <b>' + esc(hasil.user.email) + '</b>' : '';
        tampilkanPesan('AKUN PSG', 'Berhasil', 'Akun' + email + ' sudah terverifikasi.', 'LANJUT KE APLIKASI');
      })
      .catch(function (err) {
        tampilkanPesan('AKUN PSG', 'Tautan tidak dapat dipakai', esc(pesanGagal(err, 'callback')), 'TUTUP');
      });
  }

  function mulai() {
    var lib = window.PSGNetlifyIdentity;
    if (!lib || typeof lib.handleAuthCallback !== 'function') {
      tampilkanPesan('AKUN PSG', 'Layanan akun belum termuat',
        'Muat ulang dengan membuka kembali tautan dari email saat perangkat terhubung ke internet.', 'TUTUP');
      return;
    }
    proses(lib);
  }

  /* Dijalankan setelah DOM siap supaya kartu ini berada di atas layar masuk
     kode akses (yang dipasang access-gate.js pada DOMContentLoaded). */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai, { once: true });
  } else {
    mulai();
  }
})();
