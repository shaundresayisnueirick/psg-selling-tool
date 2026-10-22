/* Insurance Hub — Access Gate */
(function(){
  'use strict';

  /* Login kode akses lama (FC/BM/BD) DICABUT sejak 15 Oktober 2026.
     Aplikasi hanya terbuka lewat login email Netlify Identity (invite-only)
     yang diverifikasi server di GET /api/psg/me:
       - index.html: src/identity-login.js memeriksa sesi dan membuka layar;
       - halaman ringkasan: gate ini sendiri memeriksa /api/psg/me.
     Tidak ada lagi kode akses, hash kode, atau penanda "perangkat diingat"
     yang bisa membuka layar. Penanda lama di bawah hanya dihapus (dicabut);
     data kerja agen tidak disentuh. */
  const SESSION_KEY = 'insuranceHub.access.v3';
  const REMEMBER_KEY = 'insuranceHub.access.remember.v3';
  const LEVEL_KEY = 'insuranceHub.level.v1';   // data lama: hanya dibaca, tidak lagi memberi akses

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

  /* Mencabut penanda kode akses lama (sesi tab dan "ingat perangkat").
     Penanda ini tidak lagi membuka layar; dihapus saat halaman dimuat dan saat
     logout supaya tidak tersisa di perangkat. Data kerja agen tidak disentuh. */
  function cabutOtorisasi(){
    try{
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }catch(e){}
  }

  function logout(){
    /* Hak akses offline dicabut; logout yang belum diselesaikan Identity (halaman
       ringkasan tidak memuat Identity, atau logout offline) ditandai supaya
       index.html menyelesaikannya dan tidak memulihkan sesi. */
    if(window.PSGOffline){
      window.PSGOffline.hapus();
      if(!window.PSGNetlifyIdentity && !window.PSGOffline.bacaTandaKeluar()) window.PSGOffline.tandaiKeluar(false);
    }
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

    /* Kartu masuk tanpa formulir kode akses. Di index.html formulir email
       dipasang src/identity-login.js; di halaman ringkasan kartu ini hanya
       menampilkan hasil pemeriksaan sesi server. */
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
          Masuk dengan email akun PSG yang sudah diundang.
        </p>
        <div id="insuranceGateStatus" class="insurance-access-error"
             role="status" aria-live="polite"></div>
        <div class="insurance-access-note">
          &copy; 2026 PSG Selling Tools • Internal Use Only <span id="psgVersiLogin"></span>
        </div>
      </div>`;

    document.body.appendChild(gate);

    /* Versi ditulis di sini juga: gate bisa tampil sebelum umum.js sempat
       menjalankan segarkan(), sehingga badge versinya akan kosong. */
    try{
      const v=document.getElementById('psgVersiLogin');
      if(v) v.textContent = window.PSG_APP_VERSION_LABEL
        || ('Aplikasi Web ' + (window.PSG_APP_VERSION || ''));
    }catch(e){}
  }

  /* Halaman ringkasan (program-summary.html, comparison-summary.html) tidak
     memuat identity-login.js. Layarnya hanya dibuka bila server mengakui sesi
     Identity yang sah (cookie nf_jwt diverifikasi getUser() di /api/psg/me)
     dengan aturan hak akses yang sama dengan index.html. */
  function sesiServerDiizinkan(p){
    if(!p || p.status==='nonaktif') return false;
    const roles=Array.isArray(p.roles)?p.roles:[];
    return roles.indexOf('psg_owner')>=0 || roles.indexOf('psg_admin')>=0 ||
      ['FC','BM','BD'].indexOf(p.level)>=0;
  }

  function statusGate(pesan, kembali){
    const node=document.getElementById('insuranceGateStatus');
    if(!node) return;
    node.textContent=pesan||'';
    if(kembali){
      const a=document.createElement('a');
      a.href='index.html';
      a.className='insurance-access-btn';
      a.textContent='MASUK DENGAN EMAIL';
      a.style.display='block';
      a.style.marginTop='12px';
      a.style.textAlign='center';
      node.appendChild(a);
    }
  }

  function verifikasiSesiServer(){
    statusGate('Memeriksa sesi login…');
    var po=window.PSGOffline;
    var ambil=(po&&po.fetchAsli)||fetch;
    /* Galat jaringan/5xx ≠ penolakan: hanya penolakan yang mengunci. Saat server
       tidak terjangkau, catatan verifikasi online (<= 14 hari) boleh membuka
       kalkulator offline; catatan itu bukan bukti autentikasi. */
    var offlineAtauTutup=function(){
      if(po && po.bukaJikaBerlaku()){ reveal(); return; }
      statusGate(po ? po.pesanAlasan(po.periksa().alasan) : 'Sesi belum dapat diverifikasi. Periksa koneksi, lalu muat ulang halaman.', true);
    };
    ambil('/api/psg/me',{method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{'Accept':'application/json'}})
      .then(function(r){
        return r.json().catch(function(){ return {}; })
          .then(function(d){ return { ok:r.ok, status:r.status, data:d }; });
      })
      .then(function(x){
        if(x.ok && x.data && x.data.authenticated && sesiServerDiizinkan(x.data.user)){
          if(po){ po.keluar(); po.catat(x.data.user); }
          reveal();
          return;
        }
        if(!x.ok && x.status!==401){ offlineAtauTutup(); return; }
        if(po) po.hapus();
        statusGate('Sesi login tidak ditemukan atau sudah berakhir. Masuk kembali dengan email akun PSG.', true);
      })
      .catch(offlineAtauTutup);
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
  /* Halaman ringkasan dalam mode offline: saat koneksi kembali, server memutuskan. */
  window.addEventListener('online',function(){
    var po=window.PSGOffline;
    if(!po||!po.aktif||typeof window.InsuranceHubRefreshIdentityProfile==='function') return;
    po.verifikasiOnline().then(function(h){
      if(h&&h.user){ po.keluar(); po.catat(h.user); }
      else if(h==='ditolak'){ po.hapus(); window.location.reload(); }
    });
  });

  /* Selalu terkunci saat dimuat. Penanda kode akses lama yang masih
     tersimpan di perangkat dicabut, sehingga tidak ada jalur yang membuka
     layar tanpa sesi Identity yang diverifikasi server. */
  cabutOtorisasi();
  document.documentElement.classList.add('insurance-auth-locked');
  function mulai(){
    renderGate();
    /* index.html: identity-login.js (dimuat di akhir body) yang memeriksa sesi. */
    if(typeof window.InsuranceHubRefreshIdentityProfile!=='function') verifikasiSesiServer();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',mulai,{once:true});
  }else{
    mulai();
  }
})();
