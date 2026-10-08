/* Insurance Hub — Offline Access Gate */
(function(){
  'use strict';

  const SESSION_KEY = 'insuranceHub.access.v3';
  const REMEMBER_KEY = 'insuranceHub.access.remember.v3';
  /* Tiga kata sandi, satu per jenjang. Tidak ada pilihan level di layar masuk:
     kata sandi yang diketik itulah yang menentukan levelnya, sehingga agen
     tidak bisa mengubah levelnya sendiri. */
  const SANDI_LEVEL = [
    { level: 'FC', nama: 'Financial Consultant',
      hash: '9e8209fdd3b744bec823f769d4f920104a976b15891718b2d7d5f63b00fe9afa' },
    { level: 'BM', nama: 'Business Manager',
      hash: 'eb4dda38adebde8da2c577a6a58583f434d43c4b765561e597bbe988bc412c01' },
    { level: 'BD', nama: 'Business Director',
      hash: '8d2c60f81e04f6be48c1a9337d03425adcb9e52e1ca165541b9ece8988918093' }
  ];
  const LEVEL_KEY = 'insuranceHub.level.v1';

  // Level dipulihkan saat aplikasi dibuka kembali dengan sesi tersimpan.
  try {
    const simpan = JSON.parse(localStorage.getItem(LEVEL_KEY) || 'null');
    if (simpan && simpan.level) window.InsuranceHubLevel = simpan;
  } catch (e) {}

  function digest(text){
    if(window.crypto && crypto.subtle){
      return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))
        .then(buf=>Array.from(new Uint8Array(buf))
          .map(b=>b.toString(16).padStart(2,'0')).join(''));
    }
    return Promise.resolve('');
  }

  function isUnlocked(){
    try{
      return sessionStorage.getItem(SESSION_KEY)==='ok' ||
             localStorage.getItem(REMEMBER_KEY)==='ok';
    }catch(e){ return false; }
  }


  /* Logout hanya mengakhiri sesi. Tidak ada data kerja agen yang dihapus:
     profil nasabah, Kartu Konsultan, Library, poin, Segitiga, Program Builder,
     dan seluruh isian tetap utuh dan kembali apa adanya saat agen masuk lagi.

     Yang dibersihkan hanya data sesi — barang yang memang hanya berlaku
     selama satu kali pemakaian:
       - seluruh sessionStorage (hasil antarhalaman: ringkasan kombinasi,
         konteks kembali, impor kombinasi, dsb)
       - isian sementara kalkulator
       - penanda konteks Segitiga, supaya membuka Segitiga sesudah login
         kembali dimulai dari nama demo seperti perilaku v37.4.

     Daftar ini dipakai bersama oleh halaman ringkasan terpisah lewat
     window.insuranceHubBersihkanSesi, supaya aturannya hanya ada di satu
     tempat dan tidak bisa berbeda antarhalaman. */
  const KUNCI_SESI = [
    'insuranceHub.isianTerakhir.v1',
    'insuranceHub.segitiga.globalContext.v1'
  ];

  function bersihkanSesi(){
    try{
      KUNCI_SESI.forEach(function(k){ localStorage.removeItem(k); });
      sessionStorage.clear();
    }catch(e){}
  }

  /* Mencabut otorisasi perangkat. Ini yang benar-benar membuat layar masuk
     muncul lagi: selama REMEMBER_KEY masih ada, isUnlocked() mengembalikan
     true dan gate langsung dilewati.

     Dulu kunci ini terhapus sebagai efek samping — logout menghapus semua
     insuranceHub.* kecuali daftar KEEP, dan REMEMBER_KEY tidak ada di daftar
     itu. Begitu penghapusan borongan dihentikan, logout ikut berhenti
     bekerja. Sekarang pencabutannya eksplisit, tidak menumpang pada
     penghapusan data. */
  function cabutOtorisasi(){
    try{
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }catch(e){}
  }

  function logout(){
    cabutOtorisasi();
    bersihkanSesi();
    // Return to the main entry point; the access gate will appear again.
    window.location.href='index.html';
  }


  /* ---------- Layar sambutan setelah login ---------- */
  function escHTML(v){
    return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function avatarWelcomeHTML(size){
    var foto='';
    var identity=window.InsuranceHubIdentity;
    var fotoKey=window.InsuranceHubCurrentPhotoKey
      ? window.InsuranceHubCurrentPhotoKey() : 'insuranceHub.agen.foto.v1';
    try{ foto=fotoKey?localStorage.getItem(fotoKey)||'':''; }catch(e){}
    if(foto){
      return '<img src="'+escHTML(foto)+'" alt="" class="insurance-welcome-avatar-img" style="width:'+size+'px;height:'+size+'px">';
    }
    var nama='';
    try{
      var a=JSON.parse(localStorage.getItem('insuranceHub.agen.v1')||'{}');
      var l=JSON.parse(localStorage.getItem('insuranceHub.level.v1')||'{}');
      nama=String(identity&&identity.source==='server:/api/psg/me'
        ? (identity.nama||'') : ((l&&l.namaAgen)||a.nama||'')).trim();
    }catch(e){}
    var ini=(nama||'A').charAt(0).toUpperCase();
    return '<span class="insurance-welcome-avatar-fallback" style="width:'+size+'px;height:'+size+'px">'+escHTML(ini)+'</span>';
  }

  function bacaFotoWelcome(file, cb){
    if(!file) return;
    if(file.size>4*1024*1024){ alert('Ukuran foto maksimal 4 MB.'); return; }
    var fr=new FileReader();
    fr.onload=function(){
      var img=new Image();
      img.onload=function(){
        var S=320, c=document.createElement('canvas'); c.width=S; c.height=S;
        var ctx=c.getContext('2d'), sisi=Math.min(img.width,img.height);
        ctx.drawImage(img,(img.width-sisi)/2,(img.height-sisi)/2,sisi,sisi,0,0,S,S);
        cb(c.toDataURL('image/jpeg',0.86));
      };
      img.onerror=function(){ cb(fr.result); };
      img.src=fr.result;
    };
    fr.readAsDataURL(file);
  }

  function tampilkanSambutan(){
    var old=document.getElementById('insuranceWelcome');
    if(old) old.remove();

    var identity=window.InsuranceHubIdentity;
    var level=window.InsuranceHubLevel||{};
    var fotoKey=window.InsuranceHubCurrentPhotoKey
      ? window.InsuranceHubCurrentPhotoKey() : 'insuranceHub.agen.foto.v1';
    var nama=(level.namaAgen||'').trim();
    var kode=(level.kodeAgen||'').trim();
    var levelNama=level.nama||'Financial Consultant';
    if(identity&&identity.source==='server:/api/psg/me'){
      nama=String(identity.nama||'').trim();
      kode=String(identity.kodeAgen||'').trim();
      levelNama=identity.level==='BD'?'Business Director':identity.level==='BM'?'Business Manager':identity.level==='FC'?'Financial Consultant':'';
    }
    var levelKode=identity&&identity.source==='server:/api/psg/me' ? (identity.level||'') : (level.level||'');

    var w=document.createElement('div');
    w.id='insuranceWelcome';
    w.innerHTML=
      '<div class="insurance-welcome-card" role="dialog" aria-modal="true" aria-labelledby="insuranceWelcomeTitle">'+
        '<div class="insurance-welcome-photo-wrap">'+
          '<div class="insurance-welcome-avatar" id="insuranceWelcomeAvatar">'+avatarWelcomeHTML(108)+'</div>'+
          '<label class="insurance-welcome-photo-btn">'+
            ' '+(function(){try{return fotoKey&&localStorage.getItem(fotoKey)?'Ganti Foto':'Unggah Foto'}catch(e){return 'Unggah Foto';}}())+
            '<input id="insuranceWelcomePhoto" type="file" accept="image/*" hidden>'+
          '</label>'+
        '</div>'+
        '<div class="insurance-welcome-kicker">Selamat datang,</div>'+
        '<h2 id="insuranceWelcomeTitle">'+escHTML(nama||'Tenaga Pemasar')+'</h2>'+
        '<div class="insurance-welcome-meta">'+
          '<span class="insurance-welcome-level">'+escHTML(levelKode||'—')+'</span>'+
          '<span>'+escHTML(levelNama)+'</span>'+
          (kode?'<span>· '+escHTML(kode)+'</span>':'')+
        '</div>'+
        '<div class="insurance-welcome-motto">Together Every One Achieve More</div>'+
        '<div class="insurance-welcome-sub">Bahagia · Berkat · Berlimpah</div>'+
        '<div class="insurance-welcome-info">Akses kamu aktif. Seluruh tools yang tersedia akan mengikuti jenjang <b>'+escHTML(levelKode)+'</b> dan hak akses yang berlaku.</div>'+
        '<button type="button" class="insurance-welcome-btn" id="insuranceWelcomeStart">MULAI</button>'+
      '</div>';

    document.body.appendChild(w);

    var photo=document.getElementById('insuranceWelcomePhoto');
    if(photo) photo.addEventListener('change',function(ev){
      if(!fotoKey){ alert('Email Identity tidak tersedia untuk menyimpan foto profil.'); return; }
      bacaFotoWelcome(ev.target.files&&ev.target.files[0],function(data){
        try{ localStorage.setItem(fotoKey,data); }catch(e){}
        var slot=document.getElementById('insuranceWelcomeAvatar');
        if(slot) slot.innerHTML=avatarWelcomeHTML(108);
        var lbl=document.querySelector('.insurance-welcome-photo-btn');
        if(lbl) lbl.firstChild.textContent=' Ganti Foto';
      });
    });

    document.getElementById('insuranceWelcomeStart').onclick=function(){
      w.classList.add('insurance-welcome-close');
      setTimeout(function(){ if(w.parentNode) w.remove(); },240);
    };
    w.addEventListener('click',function(ev){ if(ev.target===w){
      w.classList.add('insurance-welcome-close');
      setTimeout(function(){ if(w.parentNode) w.remove(); },240);
    }});
  }

  function reveal(){
    document.documentElement.classList.remove('insurance-auth-locked');
    const gate=document.getElementById('insuranceAccessGate');
    if(gate) gate.remove();
  }

  function renderGate(){
    document.documentElement.classList.add('insurance-auth-locked');
    if(document.getElementById('insuranceAccessGate')) return;

    const gate=document.createElement('div');
    gate.id='insuranceAccessGate';
    gate.innerHTML=`
      <div class="insurance-access-card" role="dialog" aria-modal="true"
           aria-labelledby="insuranceAccessTitle">
        <img class="insurance-access-logo"
             src="assets/logo-psg.png"
             alt="PSG — Patriot Shining Generation">
        <div class="insurance-access-kicker">AKSES INTERNAL</div>
        <h1 id="insuranceAccessTitle">Insurance Hub</h1>
        <p class="insurance-access-sub">
          Masukkan kode akses untuk menggunakan aplikasi.
        </p>
        <div id="insuranceSapaan"></div>
        <form id="insuranceAccessForm" autocomplete="off">
          <label class="insurance-access-label" for="insuranceAgenNama">
            Nama Tenaga Pemasar
          </label>
          <input id="insuranceAgenNama"
                 type="text"
                 autocomplete="off"
                 placeholder="Nama lengkap">
          <label class="insurance-access-label" for="insuranceAgenKode">
            Kode Agen
          </label>
          <input id="insuranceAgenKode"
                 type="text"
                 autocomplete="off"
                 autocapitalize="characters"
                 placeholder="Kode keagenan">
          <label class="insurance-access-label" for="insuranceAccessCode">
            Kode Akses
          </label>
          <input id="insuranceAccessCode"
                 type="password"
                 inputmode="text"
                 autocomplete="off"
                 autocapitalize="off"
                 spellcheck="false"
                 placeholder="Masukkan kode akses"
                 aria-describedby="insuranceAccessError">
          <label class="insurance-remember">
            <input id="insuranceRememberDevice" type="checkbox" checked>
            <span class="insurance-kotak" aria-hidden="true"></span>
            <span>Ingat saya di perangkat ini</span>
          </label>
          <button type="submit" class="insurance-access-btn">MASUK</button>
          <div id="insuranceAccessError"
               class="insurance-access-error"
               aria-live="polite"></div>
        </form>
        <div class="insurance-access-note">
          &copy; 2026 PSG Selling Tools • Internal Use Only <span id="psgVersiLogin"></span>
        </div>
      </div>`;

    document.body.appendChild(gate);

    const form=document.getElementById('insuranceAccessForm');
    const input=document.getElementById('insuranceAccessCode');
    const error=document.getElementById('insuranceAccessError');

    form.addEventListener('submit',async function(ev){
      ev.preventDefault();
      error.textContent='';
      const code=input.value || '';
      if(!code){
        error.textContent='Masukkan kode akses.';
        input.focus();
        return;
      }

      const ok=await digest(code);
      const cocok=SANDI_LEVEL.find(x=>x.hash===ok);
      if(cocok){
        const namaAgen=(document.getElementById('insuranceAgenNama')||{}).value||'';
        const kodeAgen=(document.getElementById('insuranceAgenKode')||{}).value||'';

        /* Perangkat ini masih menyimpan data agen sebelumnya. Pemisahan data
           antaragen belum tersedia di versi ini, jadi kalau kode agennya
           berbeda, keadaan itu ditampilkan apa adanya — bukan didiamkan. */
        const sebelumnya = identitasTersimpan();
        if(sebelumnya.kode && kodeAgen.trim() && !kodeSama(sebelumnya.kode, kodeAgen)){
          const lanjut = window.confirm(
            'Perangkat ini menyimpan data milik '
            + (sebelumnya.nama || 'agen lain') + ' (' + sebelumnya.kode + ').\n\n'
            + 'Pemisahan data antaragen belum aktif di versi ini, jadi data '
            + 'tersebut masih akan terlihat dan bisa tercampur.\n\n'
            + 'Lanjutkan masuk sebagai ' + (namaAgen.trim() || 'agen baru')
            + ' (' + kodeAgen.trim() + ')?');
          if(!lanjut){
            error.textContent='Masuk dibatalkan.';
            input.value='';
            return;
          }
        }

        try{ localStorage.setItem(LEVEL_KEY, JSON.stringify({
          level:cocok.level, nama:cocok.nama,
          namaAgen:namaAgen.trim(), kodeAgen:kodeAgen.trim()
        })); }catch(e){}
        window.InsuranceHubLevel = { level: cocok.level, nama: cocok.nama,
          namaAgen: namaAgen.trim(), kodeAgen: kodeAgen.trim() };
        /* Identitas agen dipakai bersama kotak Aktivitas & Poin supaya tidak
           diketik dua kali. Nomor HP tidak diminta di layar masuk, jadi kalau
           sudah pernah diisi nilainya dipertahankan. */
        try{
          const K='insuranceHub.agen.v1';
          const lama=JSON.parse(localStorage.getItem(K)||'{}');
          localStorage.setItem(K, JSON.stringify({
            nama: namaAgen.trim() || lama.nama || '',
            kode: kodeAgen.trim() || lama.kode || '',
            hp: lama.hp || ''
          }));
        }catch(e){}
        try{
          /* Bila kotak centangnya tidak ditemukan karena satu dan lain hal,
             perangkat tetap diingat. Meminta kode akses berulang kali pada
             perangkat milik agen sendiri lebih merugikan daripada risiko
             kelewat mengingat. */
          const kotak=document.getElementById('insuranceRememberDevice');
          const remember = kotak ? kotak.checked : true;
          if(remember){
            // Opt-in: persist authorization on this browser/device.
            localStorage.setItem(REMEMBER_KEY,'ok');
            sessionStorage.setItem(SESSION_KEY,'ok');
          }else{
            // Not remembered: authorization exists only for the current
            // browser tab/session and is gone when the session ends.
            localStorage.removeItem(REMEMBER_KEY);
            sessionStorage.setItem(SESSION_KEY,'ok');
          }
        }catch(e){}
        /* Tema diingat per kode agen. Agen yang sama kembali masuk mendapat
           temanya yang terakhir; agen yang belum punya catatan mulai dari
           tema bawaan (terang). */
        try{
          if(window.PSGTheme && typeof window.PSGTheme.pakaiAgen==='function'){
            window.PSGTheme.pakaiAgen(kodeAgen.trim());
          }
        }catch(e){}
        reveal();
        setTimeout(tampilkanSambutan, 60);
      }else{
        error.textContent='Kode akses tidak valid.';
        input.value='';
        input.focus();
      }
    });

    setTimeout(()=>input.focus(),60);

    /* Kalau agen pernah masuk dan mengunggah foto, foto dan sapaannya muncul
       di layar masuk. Isian nama dan kode agen ikut terisi supaya tidak
       diketik ulang setiap kali logout. */
    try{
      const sapaan=document.getElementById('insuranceSapaan');
      const foto=localStorage.getItem('insuranceHub.agen.foto.v1')||'';
      const simpan=JSON.parse(localStorage.getItem('insuranceHub.level.v1')||'null');
      let agen={};
      try{ agen=JSON.parse(localStorage.getItem('insuranceHub.agen.v1')||'{}'); }catch(e){}
      const nama=((simpan&&simpan.namaAgen)||agen.nama||'').trim();
      const kode=((simpan&&simpan.kodeAgen)||agen.kode||'').trim();
      if(sapaan&&(foto||nama)){
        sapaan.className='insurance-sapaan';
        sapaan.innerHTML=
          (foto?'<img src="'+foto+'" alt="Foto agen">':'<span class="insurance-sapaan-ikon">\u{1F464}</span>')+
          '<div class="insurance-sapaan-teks">Hi, <b>'+
          String(nama||'Tenaga Pemasar').replace(/</g,'&lt;')+'</b></div>';
      }
      const nNama=document.getElementById('insuranceAgenNama');
      const nKode=document.getElementById('insuranceAgenKode');
      if(nNama&&!nNama.value&&nama) nNama.value=nama;
      if(nKode&&!nKode.value&&kode) nKode.value=kode;
    }catch(e){}
    /* Versi ditulis di sini juga: gate bisa tampil sebelum umum.js sempat
       menjalankan segarkan(), sehingga badge versinya akan kosong. */
    try{
      const v=document.getElementById('psgVersiLogin');
      if(v) v.textContent = window.PSG_APP_VERSION_LABEL
        || ('Aplikasi Web ' + (window.PSG_APP_VERSION || ''));
    }catch(e){}
  }

  /* Kode agen dibandingkan tanpa membedakan huruf besar/kecil dan spasi di
     ujung, supaya "12345 " dan "12345" tidak dianggap dua agen berbeda. */
  function kodeSama(a,b){
    return String(a==null?'':a).trim().toUpperCase()
        === String(b==null?'':b).trim().toUpperCase();
  }

  function identitasTersimpan(){
    let nama='', kode='';
    try{
      const l=JSON.parse(localStorage.getItem(LEVEL_KEY)||'null');
      const a=JSON.parse(localStorage.getItem('insuranceHub.agen.v1')||'{}');
      nama=(((l&&l.namaAgen)||a.nama||'')+'').trim();
      kode=(((l&&l.kodeAgen)||a.kode||'')+'').trim();
    }catch(e){}
    return { nama: nama, kode: kode };
  }

  window.insuranceHubLogout=logout;
  window.insuranceHubBersihkanSesi=bersihkanSesi;
  window.insuranceHubCabutOtorisasi=cabutOtorisasi;
  window.insuranceHubIdentitas=identitasTersimpan;
  window.insuranceHubEnsureAccessGate=function(){
    renderGate();
    return document.getElementById('insuranceAccessGate');
  };

  window.addEventListener('psg:identity-ready',function(){
    if(document.getElementById('insuranceWelcome')) tampilkanSambutan();
  });

  if(isUnlocked()){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',reveal,{once:true});
    }else{
      reveal();
    }
  }else{
    document.documentElement.classList.add('insurance-auth-locked');
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',renderGate,{once:true});
    }else{
      renderGate();
    }
  }
})();
