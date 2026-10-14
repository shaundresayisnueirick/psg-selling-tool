/* Insurance Hub — Identitas Konsultan / identitas materi nasabah */
(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  /* Data Kartu Konsultan, Nomor HP Identitas Agen, dan mode atas nama milik
     akun yang sedang masuk (window.InsuranceHubDataAkun, src/preview-cetak.js):
     key lama untuk login kode akses lama, key per email untuk sesi Identity. */
  const DATA=()=>window.InsuranceHubDataAkun;
  const sesi=()=>{try{return DATA().sesi()}catch(_){return {mode:'menunggu',email:''}}};
  function bacaData(b){try{return Object.assign({},DATA().baca(b))}catch(_){return {}}}
  function read(){return bacaData('konsultan')}
  /* Nama dan level: login kode akses lama dari level.v1; sesi Identity dari
     profil /api/psg/me (InsuranceHubLevel), bukan level.v1 milik perangkat. */
  function level(){const m=sesi().mode;
    if(m==='identity')return Object.assign({},window.InsuranceHubLevel||{});
    if(m!=='lama')return {};
    try{return JSON.parse(localStorage.getItem('insuranceHub.level.v1')||'{}')||{}}catch(_){return {}}}
  function agent(){return bacaData('agen')}
  /* Foto profil akun yang sedang masuk. Aturannya satu, di src/preview-cetak.js
     (dimuat juga oleh halaman ringkasan): key foto per email untuk sesi
     Identity, kosong selama sesi Identity belum siap, key lama hanya untuk
     login kode akses lama. */
  function foto(){try{return typeof window.InsuranceHubFotoSendiri==='function'?window.InsuranceHubFotoSendiri()||'':''}catch(_){return ''}}
  function normalizeUrl(v){v=String(v||'').trim(); if(!v)return ''; return /^https?:\/\//i.test(v)?v:'https://'+v}
  /* Identitas MILIKMU SENDIRI. Inilah yang mengisi formulir Kartu Konsultan,
     dan tidak pernah terpengaruh mode "dibuat untuk agen lain".
     Nomor WhatsApp mengikuti Nomor HP Identitas Agen (insuranceHub.agen.v1.hp,
     yang juga ikut diperbarui setiap kali kartu ini disimpan). WhatsApp yang
     pernah tersimpan di kartu hanya cadangan bila Nomor HP kosong; dulu
     urutannya terbalik sehingga nomor lama selalu mengalahkan nomor baru. */
  function getSendiri(){const k=read(), a=agent(), l=level();
    return {nama:k.nama||a.nama||l.namaAgen||'',jabatan:k.jabatan||l.nama||'Financial Consultant',whatsapp:a.hp||k.whatsapp||'',email:k.email||'',instagram:k.instagram||'',tiktok:k.tiktok||'',facebook:k.facebook||'',linkedin:k.linkedin||'',youtube:k.youtube||'',qr:k.qr||'TIDAK'};}

  /* Identitas yang TERCETAK di dokumen. Sama dengan getSendiri(), kecuali
     saat mode "dibuat untuk agen lain" aktif. */
  function get(){const d=getSendiri();
    /* Foto ikut di identitas cetak supaya Preview/cetak dan snapshot Library
       memakai foto akun yang sama dengan kartu ini. */
    d.foto=foto();
    /* Mode "atas nama agen lain" hanya menimpa identitas yang TERCETAK.
       Media sosial dan QR ikut dikosongkan supaya dokumen tidak mencampur
       nama agen lain dengan kontak milikmu. */
    const an=anBaca();
    if(an.aktif && an.nama){
      /* Seluruh identitas cetak diganti dengan milik agen yang dibantu —
         termasuk foto, media sosial, dan QR WhatsApp-nya sendiri. Tidak ada
         satu pun kontak milikmu yang tertinggal di dokumen. */
      d.nama=an.nama;
      d.jabatan=an.jabatan||'Financial Consultant';
      d.whatsapp=an.whatsapp||'';
      d.email=an.email||'';
      d.instagram=an.instagram||''; d.tiktok=an.tiktok||'';
      d.facebook=an.facebook||''; d.linkedin=an.linkedin||'';
      d.youtube=an.youtube||'';
      d.qr=an.whatsapp?(an.qr||'TIDAK'):'TIDAK';
      d.atasNama=true;
      d.kodeAgen=an.kode||'';
      d.fotoAgen=an.foto||'';        // foto milik agen tersebut
      d.foto=d.fotoAgen;
      d.tanpaFoto=!an.foto;          // fotomu sendiri tetap tidak dipakai
      d.atasNamaLabel='Ilustrasi atas nama '+an.nama+(an.kode?' ('+an.kode+')':'');
    }
    return d;}
  function save(){
    /* Pengaman ganda: walaupun formulir kini selalu berisi identitasmu
       sendiri, penyimpanan tetap ditolak selama mode "dibuat untuk agen lain"
       aktif. Satu klik keliru tidak boleh bisa menimpa identitas aslimu. */
    if(anBaca().aktif){
      if(el('kkStatus'))el('kkStatus').textContent='Matikan dulu mode "Dibuat untuk agen lain" sebelum menyimpan identitasmu sendiri.';
      return;
    }
    const data={nama:el('kkNama')?.value.trim()||'',jabatan:el('kkJabatan')?.value.trim()||'',whatsapp:el('kkWhatsApp')?.value.trim()||'',email:el('kkEmail')?.value.trim()||'',instagram:el('kkInstagram')?.value.trim()||'',tiktok:el('kkTikTok')?.value.trim()||'',facebook:el('kkFacebook')?.value.trim()||'',linkedin:el('kkLinkedIn')?.value.trim()||'',youtube:el('kkYouTube')?.value.trim()||'',qr:el('kkQr')?.value||'TIDAK',updatedAt:new Date().toISOString()};
    try{if(!DATA().tulis('konsultan',data))throw 0;}catch(_){if(el('kkStatus'))el('kkStatus').textContent='Gagal menyimpan identitas di perangkat.';return;}
    // Keep the agent identity of this account in sync so all presenter fields continue to autofill.
    try{const a=agent(); if(data.nama)a.nama=data.nama; if(data.whatsapp)a.hp=data.whatsapp; DATA().tulis('agen',a);}catch(_){}
    render(); if(el('kkStatus'))el('kkStatus').textContent='Identitas konsultan tersimpan di perangkat ini.';
  }
  let sesiDigambar='';
  const kunciSesi=()=>{const x=sesi();return x.mode+':'+x.email};
  function render(){const d=get(); sesiDigambar=kunciSesi(); dataLama();
    /* PENTING: formulir diisi dari getSendiri(), BUKAN dari get().
       Sebelumnya formulir ikut terisi identitas agen yang dibantu, sehingga
       menekan "Simpan identitas dokumen" akan menimpa identitasmu sendiri
       dengan data agen tersebut — dan setelah mode dimatikan, identitasmu
       tidak bisa kembali karena aslinya sudah tertulis ulang. */
    const sendiri=getSendiri();
    ['kkNama','kkJabatan','kkWhatsApp','kkEmail','kkInstagram','kkTikTok','kkFacebook','kkLinkedIn','kkYouTube'].forEach(id=>{if(el(id))el(id).value=sendiri[id.replace(/^kk/,'').toLowerCase()]||''}); if(el('kkQr'))el('kkQr').value=sendiri.qr||'TIDAK';
    pratinjau(d);
  }
  function pratinjau(d){d=d||get();
    const f=d.atasNama?(d.fotoAgen||''):(d.foto||''); const links=[['📱','WhatsApp',d.whatsapp?'https://wa.me/'+d.whatsapp.replace(/\D/g,'').replace(/^0/,'62'):'' ],['📷','Instagram',normalizeUrl(d.instagram)],['🎵','TikTok',normalizeUrl(d.tiktok)],['📘','Facebook',normalizeUrl(d.facebook)],['💼','LinkedIn',normalizeUrl(d.linkedin)],['▶️','YouTube',normalizeUrl(d.youtube)]].filter(x=>x[2]);
    const socials=links.map(x=>'<a href="'+esc(x[2])+'" target="_blank" rel="noopener">'+x[0]+' '+esc(x[1])+'</a>').join('');
    const qrDigits=(d.whatsapp||'').replace(/\D/g,'').replace(/^0/,'62');
    const waLink=qrDigits?'https://wa.me/'+qrDigits:'';
    const qrSrc=(d.qr==='YA'&&waLink)?'https://quickchart.io/qr?size=180&margin=2&text='+encodeURIComponent(waLink):'';
    const qrNote=(d.qr==='YA'&&waLink)?'<div class="kk-qr-wrap"><div class="kk-qr-head"><b>QR WhatsApp</b><small>Yang akan tampil pada dokumen nasabah.</small></div><img class="kk-qr" src="'+esc(qrSrc)+'" alt="QR WhatsApp konsultan" loading="eager"></div>':'';
    const tandaAtasNama=d.atasNama
      ? '<div class="catatan" style="background:#B45309;color:#fff;padding:6px 10px;border-radius:6px;margin-bottom:8px">Pratinjau dokumen saat ini memakai identitas '+esc(d.nama)+(d.kodeAgen?' ('+esc(d.kodeAgen)+')':'')+'. Formulir di atas tetap identitasmu sendiri.</div>'
      : '';
    if(el('kartuKonsultanPreview')) el('kartuKonsultanPreview').innerHTML=tandaAtasNama+'<div class="kartu-konsultan-preview"><div class="kk-avatar">'+(f?'<img src="'+esc(f)+'" alt="Foto konsultan">':'<span>👤</span>')+'</div><div class="kk-main"><div class="kk-label">KONSULTAN ANDA</div><h3>'+esc(d.nama||'Nama konsultan')+'</h3><p>'+esc(d.jabatan||'Financial Consultant')+'</p><div class="kk-socials">'+(socials||'<span class="catatan">Media sosial belum diisi.</span>')+'</div>'+qrNote+'</div></div>';
  }
  /* ---------- Data lama perangkat ----------
     Key lama (login kode akses lama / versi sebelum akun email) tidak punya
     catatan pemilik, sehingga tidak pernah dipakai otomatis oleh akun
     Identity. Selama akun ini belum punya Kartu Konsultan sendiri, data itu
     hanya ditawarkan dalam bentuk samaran; menyalinnya adalah pilihan
     pengguna. Data lama tidak dipindahkan, diubah, atau dihapus. */
  function samar(v,belakang){v=String(v||'').trim(); if(!v)return '';
    return belakang?'…'+v.replace(/\D/g,'').slice(-4):v.charAt(0)+'…'}
  function dataLama(){
    const blok=el('kkNama')&&el('kkNama').closest('.blok'); if(!blok)return;
    let box=el('kkDataLama');
    const d=DATA(), s=sesi();
    let k={}, a={}, an={};
    const tampil=s.mode==='identity'&&!!d&&!d.ada('konsultan')&&(()=>{
      k=d.lama('konsultan'); a=d.lama('agen'); an=d.lama('atasNama');
      return ['nama','whatsapp','email','instagram','tiktok','facebook','linkedin','youtube'].some(x=>String(k[x]||'').trim())
        ||String(a.hp||'').trim()||(Array.isArray(an.daftar)&&an.daftar.length);
    })();
    if(!tampil){if(box)box.hidden=true;return}
    if(!box){
      box=document.createElement('div'); box.id='kkDataLama'; box.className='blok tanpa-cetak';
      blok.parentNode.insertBefore(box,blok);
      box.addEventListener('click',e=>{
        const b=e.target.closest('button'); if(!b)return;
        if(b.id==='kkDataLamaSalin')salinDataLama(); else if(b.id==='kkDataLamaAbaikan')abaikanDataLama();
      });
    }
    const rincian=[k.nama&&('nama berawalan '+samar(k.nama)),(a.hp||k.whatsapp)&&('nomor berakhiran '+samar(a.hp||k.whatsapp,1)),
      Array.isArray(an.daftar)&&an.daftar.length&&(an.daftar.length+' agen di daftar tim')].filter(Boolean).join(', ');
    box.hidden=false;
    box.innerHTML='<h2>Data identitas lama di perangkat ini</h2><p class="catatan">Perangkat ini masih menyimpan identitas dokumen dari login sebelumnya'
      +(rincian?' ('+esc(rincian)+')':'')+'. Pemiliknya tidak tercatat, jadi tidak dipakai otomatis untuk akun ini. Salin hanya bila data itu milikmu; data lama tetap utuh.</p>'
      +'<button type="button" class="sakelar" id="kkDataLamaSalin">Salin ke akun saya</button> <button type="button" class="sakelar" id="kkDataLamaAbaikan">Abaikan</button>';
  }
  function salinDataLama(){
    const d=DATA(); if(!d||sesi().mode!=='identity')return;
    try{
      d.tulis('konsultan',Object.assign({},d.lama('konsultan')));
      const lamaAgen=d.lama('agen'), ag=agent();
      if(!ag.hp&&lamaAgen.hp){ag.hp=lamaAgen.hp; d.tulis('agen',ag);}
      const lamaAn=d.lama('atasNama'), an=anBaca();
      if(!an.daftar.length&&Array.isArray(lamaAn.daftar)&&lamaAn.daftar.length){an.daftar=lamaAn.daftar.slice(); an.aktif=false; d.tulis('atasNama',an);}
    }catch(_){if(el('kkStatus'))el('kkStatus').textContent='Penyimpanan perangkat penuh. Data lama belum tersalin seluruhnya.';}
    render(); anRender(); anSegarkanPenyaji();
    if(el('kkStatus'))el('kkStatus').textContent='Data lama disalin ke akun ini. Periksa lalu Simpan bila ada yang perlu diubah.';
  }
  function abaikanDataLama(){
    try{DATA().tulis('konsultan',read())}catch(_){}
    dataLama();
  }
  function init(){if(!el('kkSimpan'))return; const d=getSendiri(); ['kkNama','kkJabatan','kkWhatsApp','kkEmail','kkInstagram','kkTikTok','kkFacebook','kkLinkedIn','kkYouTube'].forEach(id=>{const key=id.replace(/^kk/,'').toLowerCase();if(el(id))el(id).value=d[key]||''}); if(el('kkQr'))el('kkQr').value=d.qr||'TIDAK'; el('kkSimpan').addEventListener('click',save); el('kkReset').addEventListener('click',()=>{
      if(!confirm('Pulihkan identitas konsultan ke data login kamu?\n\nMode "Dibuat untuk agen lain" akan dimatikan. Daftar tim dan foto profile tetap tersimpan.'))return;
      /* Pemulihan menyeluruh. Tidak cukup menghapus konsultan.v1 saja:
         insuranceHub.agen.v1 ikut disalin saat menyimpan, jadi kalau pernah
         tertimpa identitas agen lain, nama itu tetap muncul sebagai cadangan
         dan identitasmu terasa "tidak bisa kembali". Nama dan nomor
         dikembalikan ke data login (level.v1), satu-satunya sumber yang tidak
         pernah tersentuh mode atas nama. */
      try{DATA().hapus('konsultan')}catch(_){}
      try{
        const an=anBaca(); an.aktif=false; anTulis(an);
        anSetSegmen('Tidak'); anSpanduk();
      }catch(_){}
      /* Nomor HP tidak dikosongkan: itu milik Identitas Agen (Aktivitas &
         Poin), dan sesudah pemulihan kartu kembali memakainya. */
      try{
        const l=level(), a=agent();
        a.nama=l.namaAgen||'';
        DATA().tulis('agen',a);
      }catch(_){}
      render(); anRender(); anSegarkanPenyaji();
      if(el('kkStatus'))el('kkStatus').textContent='Identitas dipulihkan ke '+(level().namaAgen||'data login')+'. Silakan lengkapi lalu Simpan. Foto profile dan daftar tim tidak dihapus.';
    }); render(); }
  /* ================= Dibuat untuk agen lain =================
     Kamu tetap masuk sebagai dirimu sendiri. Yang berubah hanya identitas
     yang tercetak di dokumen nasabah, supaya ilustrasi yang kamu bantu
     buatkan untuk anggota tim keluar dengan nama mereka. */
  function anBaca(){const v=bacaData('atasNama');
    if(!Array.isArray(v.daftar))v.daftar=[]; return v;}
  function anTulis(v){try{DATA().tulis('atasNama',v)}catch(_){}}
  /* Kolom penyaji di seluruh layar kalkulator ikut disegarkan setiap kali
     mode berganti, supaya nama pada dokumen berubah saat itu juga. */
  function anSegarkanPenyaji(){
    try{
      if(window.InsuranceHubUmum && typeof window.InsuranceHubUmum.isiIdentitasAgen==='function')
        window.InsuranceHubUmum.isiIdentitasAgen();
    }catch(_){}
  }

  function anStatus(t){if(el('kkAnStatus'))el('kkAnStatus').textContent=t||'';}
  function anSegmen(){const b=el('kkAnMode')?.querySelector('[aria-pressed="true"]');return b?b.dataset.nilai:'Tidak';}
  function anSetSegmen(v){el('kkAnMode')?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.nilai===v)));}

  function anIsiDaftar(an){
    const sel=el('kkAnPilih'); if(!sel)return;
    sel.innerHTML='<option value="">— ketik manual —</option>'+
      an.daftar.map((x,i)=>'<option value="'+i+'">'+esc(x.nama||'')+(x.kode?' · '+esc(x.kode):'')+'</option>').join('');
    const idx=an.daftar.findIndex(x=>x.kode===an.kode&&x.nama===an.nama);
    sel.value=idx>=0?String(idx):'';
  }

  /* Kolom teks mode "atas nama": id kkAnXxx -> field xxx (huruf kecil). */
  const AN_FIELD=[['kkAnNama','nama'],['kkAnKode','kode'],['kkAnJabatan','jabatan'],
    ['kkAnWa','whatsapp'],['kkAnEmail','email'],['kkAnInstagram','instagram'],
    ['kkAnTikTok','tiktok'],['kkAnFacebook','facebook'],['kkAnLinkedIn','linkedin'],
    ['kkAnYouTube','youtube']];

  function anFotoPratinjau(an){
    const box=el('kkAnFotoPratinjau'); if(!box)return;
    box.innerHTML=an.foto
      ? '<img src="'+esc(an.foto)+'" alt="Foto agen" style="width:64px;height:64px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px"><span>Foto '+esc(an.nama||'agen')+' akan dipakai pada dokumen.</span>'
      : 'Belum ada foto. Dokumen akan tampil tanpa foto konsultan.';
  }

  function anRender(){
    const an=anBaca();
    anSetSegmen(an.aktif?'Ya':'Tidak');
    AN_FIELD.forEach(([id,k])=>{ if(el(id))el(id).value=an[k]||''; });
    if(el('kkAnQr'))el('kkAnQr').value=an.qr||'TIDAK';
    anFotoPratinjau(an);
    anIsiDaftar(an);
    anSpanduk();
  }

  function anDariForm(){
    const an=anBaca();
    an.aktif = anSegmen()==='Ya';
    AN_FIELD.forEach(([id,k])=>{ an[k]=el(id)?.value.trim()||''; });
    an.qr=el('kkAnQr')?.value||'TIDAK';
    if(an.aktif && !an.nama){ an.aktif=false; anSetSegmen('Tidak');
      anStatus('Isi nama agen dulu sebelum mengaktifkan mode ini.'); }
    anTulis(an); anSpanduk(); render();
    anSegarkanPenyaji();
    try{window.dispatchEvent(new Event('insurancehub:consultant-refresh'))}catch(_){}
    return an;
  }

  /* Spanduk pengingat di layar. Tidak ikut tercetak. */
  function anSpanduk(){
    const an=anBaca();
    let bar=document.getElementById('kkAnSpanduk');
    if(!an.aktif||!an.nama){ if(bar)bar.remove(); return; }
    if(!bar){
      bar=document.createElement('div');
      bar.id='kkAnSpanduk';
      bar.className='tanpa-cetak';
      bar.style.cssText='position:sticky;top:0;z-index:60;background:#B45309;color:#fff;'+
        'padding:7px 12px;font-size:13px;display:flex;gap:10px;align-items:center;'+
        'justify-content:center;flex-wrap:wrap;line-height:1.35';
      document.body.insertBefore(bar,document.body.firstChild);
    }
    bar.innerHTML='<span>Dokumen dibuat atas nama <b>'+esc(an.nama)+
      (an.kode?' ('+esc(an.kode)+')':'')+'</b></span>'+
      '<button type="button" id="kkAnMatikan" style="background:#fff;color:#B45309;'+
      'border:0;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer">'+
      'Kembali ke nama saya</button>';
    const tombol=document.getElementById('kkAnMatikan');
    if(tombol)tombol.addEventListener('click',function(){
      const v=anBaca(); v.aktif=false; anTulis(v);
      anSetSegmen('Tidak'); anSpanduk(); render();
      anSegarkanPenyaji();
      try{window.dispatchEvent(new Event('insurancehub:consultant-refresh'))}catch(_){}
      anStatus('Kembali memakai namamu sendiri.');
    });
  }

  function anInit(){
    if(!el('kkAnSimpan'))return;
    el('kkAnMode')?.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b)return;
      anSetSegmen(b.dataset.nilai); const an=anDariForm();
      anStatus(an.aktif?('Dokumen akan tercetak atas nama '+(an.nama||'—')+'.')
                       :'Dokumen memakai namamu sendiri.');
    });
    ['kkAnNama','kkAnKode','kkAnJabatan','kkAnWa'].forEach(id=>
      el(id)?.addEventListener('input',()=>{anDariForm();}));
    el('kkAnPilih')?.addEventListener('change',e=>{
      const an=anBaca(); const i=e.target.value;
      if(i===''){anStatus('Ketik data agen secara manual.');return;}
      const p=an.daftar[Number(i)]; if(!p)return;
      AN_FIELD.forEach(([id,k])=>{ if(el(id))el(id).value=p[k]||''; });
      if(el('kkAnQr'))el('kkAnQr').value=p.qr||'TIDAK';
      const v=anBaca(); v.foto=p.foto||''; anTulis(v);
      anDariForm(); anFotoPratinjau(anBaca());
      anStatus('Memakai data '+(p.nama||'')+'.');
    });
    el('kkAnSimpan').addEventListener('click',()=>{
      const an=anDariForm();
      if(!an.nama){anStatus('Nama agen belum diisi.');return;}
      const i=an.daftar.findIndex(x=>(x.kode||'')===(an.kode||'')&&(x.nama||'')===(an.nama||''));
      const isi={qr:an.qr||'TIDAK',foto:an.foto||''};
      AN_FIELD.forEach(([,k])=>{ isi[k]=an[k]||''; });
      if(i>=0)an.daftar[i]=isi; else an.daftar.push(isi);
      anTulis(an); anIsiDaftar(an);
      anStatus('Tersimpan di daftar tim ('+an.daftar.length+' agen).');
    });
    /* Foto diperkecil ke 320x320 JPEG sebelum disimpan, sama seperti foto
       profil agen. Tanpa ini satu foto kamera bisa menghabiskan kuota
       localStorage sendirian. */
    el('kkAnFoto')?.addEventListener('change',ev=>{
      const berkas=ev.target.files&&ev.target.files[0]; if(!berkas)return;
      const pembaca=new FileReader();
      pembaca.onload=()=>{
        const img=new Image();
        img.onload=()=>{
          try{
            const S=320, c=document.createElement('canvas'); c.width=S; c.height=S;
            const g=c.getContext('2d');
            const sisi=Math.min(img.width,img.height);
            g.drawImage(img,(img.width-sisi)/2,(img.height-sisi)/2,sisi,sisi,0,0,S,S);
            const data=c.toDataURL('image/jpeg',0.82);
            const an=anBaca(); an.foto=data;
            try{ anTulis(an); }
            catch(_){ anStatus('Penyimpanan perangkat penuh. Foto tidak tersimpan.'); return; }
            if(!anBaca().foto){
              anStatus('Penyimpanan perangkat penuh. Foto tidak tersimpan.'); return; }
            anFotoPratinjau(an); render();
            anStatus('Foto agen tersimpan. Tekan "Simpan ke tim" agar ikut tersimpan di daftar.');
          }catch(_){ anStatus('Foto gagal diproses.'); }
        };
        img.onerror=()=>anStatus('Berkas itu bukan gambar yang bisa dibaca.');
        img.src=pembaca.result;
      };
      pembaca.onerror=()=>anStatus('Foto gagal dibaca.');
      pembaca.readAsDataURL(berkas);
      ev.target.value='';
    });
    el('kkAnFotoHapus')?.addEventListener('click',()=>{
      const an=anBaca(); an.foto=''; anTulis(an);
      anFotoPratinjau(an); render(); anStatus('Foto agen dihapus.');
    });
    el('kkAnQr')?.addEventListener('change',()=>{anDariForm();});
    el('kkAnHapus').addEventListener('click',()=>{
      const an=anBaca();
      const i=an.daftar.findIndex(x=>(x.kode||'')===(an.kode||'')&&(x.nama||'')===(an.nama||''));
      if(i<0){anStatus('Data ini belum ada di daftar tim.');return;}
      if(!confirm('Hapus '+(an.daftar[i].nama||'')+' dari daftar tim?'))return;
      an.daftar.splice(i,1); anTulis(an); anIsiDaftar(an);
      anStatus('Dihapus dari daftar tim.');
    });
    anRender();
  }

  window.InsuranceHubAtasNama={baca:anBaca,aktif:()=>{const a=anBaca();return !!(a.aktif&&a.nama)},spanduk:anSpanduk};
  window.InsuranceHubConsultantCard={read:get,readSendiri:getSendiri,render,save};
  window.addEventListener('insurancehub:consultant-refresh',render);
  /* Foto akun baru diketahui sesudah sesi Identity siap, dan bisa berganti
     dari halaman depan atau Identitas Agen. Hanya pratinjau yang digambar
     ulang; isian formulir yang belum disimpan tidak disentuh. */
  window.addEventListener('psg:identity-ready',()=>{
    /* Akun berganti (atau sesi baru siap): formulir, mode atas nama, dan
       daftar tim diisi ulang dari data akun itu. Akun sama: hanya pratinjau,
       supaya isian yang belum disimpan tidak hilang. */
    if(kunciSesi()===sesiDigambar){pratinjau();return}
    render(); anRender(); anSegarkanPenyaji();
  });
  window.addEventListener('psg:identity-photo-updated',()=>pratinjau());
  /* Nomor HP disimpan di Aktivitas & Poin tanpa event. Sesudah handler
     simpannya selesai, kolom WhatsApp dan pratinjau mengikuti nomor terbaru. */
  document.addEventListener('click',e=>{
    if(!(e.target instanceof Element)||!e.target.closest('#aktSimpanHp,#aktSimpanAgen'))return;
    setTimeout(()=>{if(el('kkWhatsApp'))el('kkWhatsApp').value=getSendiri().whatsapp||''; pratinjau();},0);
  });
  function anPasang(){ anInit(); anSpanduk(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',anPasang,{once:true});
  else anPasang();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
