/* Insurance Hub — Library Ilustrasi v1
 * Penyimpanan lokal/offline. Tidak mengubah mesin perhitungan produk.
 */
(function(){
  'use strict';
  const KEY='insuranceHub.libraryIlustrasi.v1';
  const SCHEMA_VERSION=2;
  const el=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const rp=v=>{try{return typeof window.rp==='function'?window.rp(v):''}catch(_){return ''}};
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x.map(y=>{if(y&&(!y.createdAt||Number.isNaN(new Date(y.createdAt).getTime()))){y.createdAt=new Date().toISOString()}return y}):[]}catch(_){return []}}
  function write(a){localStorage.setItem(KEY,JSON.stringify(a))}
  function activeProfile(){try{return window.InsuranceHubCustomerProfile?.active?.()||null}catch(_){return null}}
  const MAP={
    FLEX:{label:'iFLEXYGUARD 5',name:'xNama'},
    BSL:{label:'BeSMART Lite',name:'bNama',result:'layarBSLIlus'},
    LF:{label:'BeSMART Lite Future',name:'fNama'},
    CRIS:{label:'Cristal Prime',name:'cNama',result:'layarCRISIlus'},
    CEM:{label:'New Cemerlang Prime',name:'mNama',result:'layarCEMIlus'},
    KMB:{label:'Kombinasi GSPA + Lite Future',name:'kNama'},
    COMBO:{label:'Kombinasi Produk',name:'oNama'},
    GSPA:{label:'Gen Aman / GSPA',name:'gNama'},
    GHP:{label:'GHP GenPro',name:'hNama',result:'layarGHPIlus'},
    GPRO:{label:'Gen Pro',name:'qNama',result:'layarGPRORingkas'},
    RAYA:{label:'RAYA Pro Maxima',name:'rayaNama'},
    DP:{label:'Dana Pensiun',name:'dNama',result:'layarDPRingkas'},
    KPR:{label:'Cicilan Rumah',name:'pNama',result:'layarKPRRingkas'},
    R2:{label:'Rumah Kedua',name:'rNama',result:'layarR2Ringkas'},
    PDK:{label:'Dana Pendidikan',name:'nNama',result:'layarPDKRingkas'},
    COMBO2:{label:'Kombinasi Produk',name:'oNama',result:'layarCOMBORingkas'},
    BAND_PRODUK:{label:'Banding Pilihan Produk'},
    GHP_BANDING:{label:'Banding Plan GHP'},
    GHP_PLAN_BANDING:{label:'Banding Plan GHP'},
    GPRO_BANDING:{label:'Banding Gen Pro'},
    GPRO_BANDING_RINGKAS:{label:'Ringkasan Banding Gen Pro'},
    RAYA_BANDING:{label:'Banding RAYA Pro Maxima'},
    GENWEALTH_BANDING:{label:'Banding GEN Wealth'},
    DP_BANDING:{label:'Banding Dana Pensiun'},
    SOLUSI_BANDING:{label:'Banding Alternatif'}
  };
  const keyToProduct={
    LF_RINGKAS:'LF', BSL_TIME:'BSL', CRIS_ILUS:'CRIS', CEM_ILUS:'CEM', KMB_RINGKAS:'KMB',
    GSPA_TIME:'GSPA', FLEX_ILUS:'FLEX', GHP_ILUS:'GHP', DP_RINGKAS:'DP', KPR_RINGKAS:'KPR',
    R2_RINGKAS:'R2', PDK_RINGKAS:'PDK', COMBO_RINGKAS:'COMBO', GPRO_RINGKAS:'GPRO',
    RAYA:'RAYA',
    BANDING_PRODUK:'BAND_PRODUK', GHP_BANDING:'GHP_BANDING', GHP_PLAN_BANDING:'GHP_PLAN_BANDING',
    GPRO_BANDING:'GPRO_BANDING', GPRO_BANDING_RINGKAS:'GPRO_BANDING_RINGKAS',
    GENWEALTH_BANDING:'GENWEALTH_BANDING', DP_BANDING_MANUAL:'DP_BANDING', SOLUSI_BANDING:'SOLUSI_BANDING'
  };
  const resultKeys=new Set(Object.keys(keyToProduct));
  const selectedBatch=new Set();
  function currentKey(){
    const s=window.InsuranceHubNavigation?.LAYAR||{};
    return Object.keys(s).find(k=>document.getElementById(s[k].el)?.classList.contains('aktif'))||null;
  }
  function currentProduct(){ return keyToProduct[currentKey()]||null; }
  function productLabel(code){return MAP[code]?.label||code||'Ilustrasi'}
  function currentName(code){
    const id=MAP[code]?.name;
    return (id&&el(id)?.value?.trim())||activeProfile()?.nama||'Nasabah';
  }
  function activeSection(){
    const s=window.InsuranceHubNavigation?.LAYAR||{};
    for(const k of Object.keys(s)){const n=el(s[k].el);if(n?.classList.contains('aktif'))return n}
    return null;
  }
  function makeTitle(code){
    const name=currentName(code), product=productLabel(code);
    return window.InsuranceHubNaming?.illustrationName?window.InsuranceHubNaming.illustrationName(product,name):product+' - '+name;
  }
  function categoryFor(code,key){
    const c=String(code||'').toUpperCase(), k=String(key||'').toUpperCase();
    if(c.includes('BANDING') || k.includes('BANDING') || k==='COMPARE') return 'Perbandingan';
    if(['NEEDS','SEGITIGA_RINGKAS'].includes(k)) return 'Analisis';
    if(['DP','PDK','KPR','R2','SOLUSI_SEGITIGA','SOLUSI_HITUNG','FINANCIAL_CALC'].includes(c) || ['DP','PDK','KPR_RINGKAS','R2_RINGKAS','SOLUSI_SEGITIGA','SOLUSI_HITUNG','FINANCIAL_CALC'].includes(k)) return 'Financial Planning';
    return 'Ilustrasi';
  }
  function keyContext(){ return currentKey()||''; }
  function sectionTitle(section){
    const h=section?.querySelector('.kop h2,h2');
    return h?.textContent?.trim()||'';
  }
  function inferProduct(section,key){
    const k=String(key||'').toUpperCase();
    const byKey={NEEDS:'Analisis Kebutuhan',SEGITIGA_RINGKAS:'Ringkasan Kebutuhan Perlindungan',GENWEALTH:'GEN Wealth',RIZQIA_RINGKAS:'RIZQIA',RIZQIA:'RIZQIA',FINANCIAL_CALC:'Kalkulator Finansial',SOLUSI_SEGITIGA:'Solusi Segitiga Financial',SOLUSI_HITUNG:'Hitung Alternatif'};
    if(byKey[k]) return byKey[k];
    const h=sectionTitle(section);
    if(h) return h.replace(/^(Ilustrasi|Ringkasan|Kebutuhan|Hasil)\s*[—-]?\s*/i,'').trim()||h;
    return currentProduct()||'Hasil Konsultasi';
  }
  function familyLabel(x){ return x.familyName || x.customerName || 'Nasabah'; }
  function relationLabel(x){ return x.relationship || 'Diri Sendiri'; }
  function groupKey(x){ return String(x.profileId || ('name:'+String(familyLabel(x)).toLowerCase().trim())); }
  function saveCurrent(){
    const section=activeSection(), key=keyContext();
    if(!section){alert('Buka halaman hasil yang ingin disimpan terlebih dahulu.');return}
    const code=currentProduct()||key||'HASIL';
    const product=inferProduct(section,key);
    const titleBase=makeTitle(code);
    const title=(key==='NEEDS'?'Analisis Kebutuhan - ':key==='SEGITIGA_RINGKAS'?'Ringkasan Kebutuhan - ':product+' - ')+currentName(currentProduct()||code);
    const p=activeProfile();
    const sel=window.InsuranceHubCustomerProfile?.selectedFamily?.()||null;
    const now=new Date();
    const item={id:'IL-'+now.getTime()+'-'+Math.random().toString(36).slice(2,7),title:title||titleBase,product,productCode:code,screenKey:key,customerName:sel?.nama||currentName(currentProduct()||code),profileId:p?.id||null,relationship:sel?.hubungan||'Diri Sendiri',insuredPersonId:sel?.id||'self',insuredDobSnapshot:sel?.tglLahir||'',insuredGenderSnapshot:sel?.jk||'',category:categoryFor(code,key),familyName:p?.nama||currentName(currentProduct()||code),createdAt:now.toISOString(),html:section.innerHTML.slice(0,250000)};
    /* Kalau ilustrasi ini dibuat atas nama agen lain, catat di entrinya.
       Tanpa penanda ini, berbulan-bulan kemudian tidak ada cara membedakan
       ilustrasi milikmu dari yang kamu bantu buatkan untuk anggota tim. */
    try{
      const an=window.InsuranceHubAtasNama&&window.InsuranceHubAtasNama.baca();
      if(an&&an.aktif&&an.nama){ item.atasNamaAgen=an.nama; item.atasNamaKode=an.kode||''; }
    }catch(_){}
    /* Potret identitas konsultan ikut disimpan bersama ilustrasinya.
       Tanpa ini, kartu konsultan digambar ulang dari identitas yang sedang
       aktif saat ilustrasi dibuka — sehingga ilustrasi yang dibuat atas nama
       agen lain akan menampilkan penyaji agen itu (karena ikut tersimpan di
       dalam HTML), tetapi kartu konsultan di bawahnya berubah jadi identitas
       pemilik perangkat. Dokumen yang sudah jadi harus tetap utuh apa
       adanya. */
    try{
      const k=consultantData()||{};
      item.konsultan={nama:k.nama||'',jabatan:k.jabatan||'',whatsapp:k.whatsapp||'',
        email:k.email||'',instagram:k.instagram||'',tiktok:k.tiktok||'',
        facebook:k.facebook||'',linkedin:k.linkedin||'',youtube:k.youtube||'',
        qr:k.qr||'TIDAK',
        foto:(k.atasNama?(k.fotoAgen||''):(localStorage.getItem('insuranceHub.agen.foto.v1')||''))};
    }catch(_){}
    const a=read(); a.unshift(item); write(a.slice(0,200));
    render();
    alert('Tersimpan di Library Nasabah:\n\n'+item.title);
  }
  function deleteOne(id){const a=read().filter(x=>x.id!==id);write(a);render()}
  function toggleFavorite(id){const a=read(),x=a.find(y=>y.id===id);if(!x)return;x.favorite=!x.favorite;write(a);render()}
  function rename(id){const a=read(),x=a.find(y=>y.id===id);if(!x)return;const v=prompt('Nama ilustrasi',x.title);if(v&&v.trim()){x.title=v.trim();write(a);render()}}
  function closeDetail(){
    try{ window.__psgKonsultanCetak = null; }catch(_){}
    const modal=el('libraryDetailModal');
    if(modal) modal.remove();
    document.documentElement.classList.remove('psg-library-detail-open');
    document.body.classList.remove('psg-library-detail-open');
  }
  function view(id){
    const x=read().find(y=>y.id===id);if(!x)return;
    closeDetail();
    /* Selama ilustrasi ini dibuka, blok konsultan yang ditempel saat mencetak
       memakai potret milik ilustrasinya — bukan identitas yang aktif sekarang. */
    try{ window.__psgKonsultanCetak = x.konsultan || null; }catch(_){}
    const modal=document.createElement('div');
    modal.id='libraryDetailModal';
    modal.className='library-detail-modal';
    const card=document.createElement('div');
    card.className='library-detail-card';
    const head=document.createElement('div');
    head.className='library-detail-head';
    const title=document.createElement('strong');
    title.textContent=x.title;
    const actions=document.createElement('div');
    actions.className='library-actions tanpa-cetak';
    const print=document.createElement('button');
    print.type='button';print.className='aksi';print.textContent='🖨 Cetak / PDF';
    const close=document.createElement('button');
    close.type='button';close.className='sakelar';close.textContent='✕ Tutup';
    actions.append(print,close);head.append(title,actions);
    const body=document.createElement('div');
    body.className='library-detail-body';
    const source=document.createElement('section');
    source.className='layar aktif library-detail-source';
    source.setAttribute('data-psg-preview-source','library');
    const dibuat=new Date(x.createdAt); const waktuValid=!Number.isNaN(dibuat.getTime());
    source.innerHTML='<div class="kop"><h2>'+esc(x.title)+'</h2><p>Snapshot Library · Dibuat '+(waktuValid?dibuat.toLocaleDateString('id-ID'):'-')+(waktuValid?', pukul '+dibuat.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'')+'</p></div>'+x.html;
    /* Snapshot membawa atribut listener dari halaman asal, tetapi event
       listener tidak ikut tersimpan dalam innerHTML. Buang tombol Preview
       hasil injeksi lama dan lepas penanda agar attach() membuat satu tombol
       baru dengan handler aktif di modal Library ini. */
    source.querySelectorAll('.psg-preview-btn').forEach(function(n){ n.remove(); });
    source.querySelectorAll('[data-preview-attached]').forEach(function(n){ delete n.dataset.previewAttached; });
    /* Logo yang ikut tersimpan di dalam cuplikan dibuang saat ilustrasi
       ditampilkan kembali. Aturan ukurannya hanya ada di halaman ringkasan
       asalnya, jadi di sini gambarnya tampil seukuran berkas aslinya —
       memenuhi layar, baik di detail maupun di Preview. Logo yang benar
       tetap ditempel oleh preview-cetak.js di kanan atas halaman, ukuran
       22 mm, sama seperti seluruh cetakan lain. */
    try{
      source.querySelectorAll('.print-logo,.brand-top,.logo-cetak,.logo-psg-app,img[src*="logo-psg"]')
        .forEach(function(n){ n.remove(); });
    }catch(_){}
    body.appendChild(source);
    card.append(head,body);modal.appendChild(card);document.body.appendChild(modal);
    close.onclick=closeDetail;
    modal.addEventListener('click',e=>{if(e.target===modal)closeDetail()});
    const cetakIlustrasi=button=>{
      const oldTitle=document.title;document.title=x.title;
      if(window.PSGPrintPreview?.printWithConsultant){ window.PSGPrintPreview.printWithConsultant(button); }
      else { window.print(); }
      setTimeout(()=>{document.title=oldTitle},1200);
    };
    print.onclick=()=>cetakIlustrasi(print);
    source.querySelectorAll('button').forEach(function(button){
      if(/(cetak|print|simpan\s+(sebagai|ke)\s+pdf|pdf)/i.test((button.textContent||'').replace(/\s+/g,' ').trim())){
        button.addEventListener('click',function(){cetakIlustrasi(button);});
      }
    });
    document.documentElement.classList.add('psg-library-detail-open');
    document.body.classList.add('psg-library-detail-open');
    setTimeout(()=>window.PSGPrintPreview?.attach?.(),0);
  }
  function render(){
    const list=el('libraryIlustrasiList');if(!list)return;
    const q=(el('libCari')?.value||'').toLowerCase().trim(), f=el('libFilterProduk')?.value||'', fc=el('libFilterKategori')?.value||'', fs=el('libFilterSort')?.value||'newest';
    const all=read();
    let a=all.filter(x=>(!q||[x.title,x.customerName,x.familyName,x.product,x.category,x.relationship].some(v=>String(v||'').toLowerCase().includes(q)))&&(!f||x.product===f)&&(!fc||x.category===fc));
    a.sort((x,y)=>{if(fs==='favorite')return Number(!!y.favorite)-Number(!!x.favorite)||(new Date(y.createdAt)-new Date(x.createdAt));if(fs==='oldest')return new Date(x.createdAt)-new Date(y.createdAt);if(fs==='name')return String(x.title||'').localeCompare(String(y.title||''),'id',{sensitivity:'base'});return new Date(y.createdAt)-new Date(x.createdAt)});
    const sel=el('libFilterProduk');if(sel){const vals=[...new Set(all.map(x=>x.product).filter(Boolean))].sort();const old=f;sel.innerHTML='<option value="">Semua produk</option>'+vals.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');sel.value=vals.includes(old)?old:''}
    const selCat=el('libFilterKategori');if(selCat){const cats=['Ilustrasi','Perbandingan','Analisis','Financial Planning'];const oldCat=fc;selCat.innerHTML='<option value="">Semua jenis</option>'+cats.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');selCat.value=cats.includes(oldCat)?oldCat:''}
    if(!a.length){list.innerHTML='<div class="empty-state"><h3>Belum ada ilustrasi tersimpan</h3><p class="catatan">Buka hasil ilustrasi, lalu tekan “Simpan ke Library”.</p></div>';return}

    const groups=[];
    const by=new Map();
    a.forEach(x=>{const k=groupKey(x);if(!by.has(k)){const g={key:k,name:familyLabel(x),items:[],members:new Map()};by.set(k,g);groups.push(g)}const g=by.get(k);g.items.push(x);const r=relationLabel(x);if(!g.members.has(r))g.members.set(r,[]);g.members.get(r).push(x)});

    const itemCard=x=>'<article class="library-item-card"><button type="button" class="library-batch-toggle '+(selectedBatch.has(x.id)?'is-on':'')+'" data-id="'+esc(x.id)+'" aria-pressed="'+(selectedBatch.has(x.id)?'true':'false')+'" title="'+(selectedBatch.has(x.id)?'Keluarkan dari paket meeting':'Masukkan ke paket meeting')+'"><span class="library-batch-toggle-dot">✓</span><span class="library-batch-toggle-text">'+(selectedBatch.has(x.id)?'DIPILIH':'PILIH')+'</span></button><div class="library-item-meta"><span class="badge">'+esc(x.category||'Ilustrasi')+'</span><span class="badge library-product-badge">'+esc(x.product||'')+'</span><span class="library-date">'+new Date(x.createdAt).toLocaleDateString('id-ID')+'</span>'+(x.atasNamaAgen?'<span class="badge" style="background:#B45309;color:#fff">Atas nama '+esc(x.atasNamaAgen)+(x.atasNamaKode?' ('+esc(x.atasNamaKode)+')':'')+'</span>':'')+'</div><h4>'+esc(x.title)+'</h4><p><b>Tertanggung:</b> '+esc(x.customerName||'Nasabah')+'</p><div class="library-actions"><button class="aksi lib-view" data-id="'+esc(x.id)+'">Lihat</button><button type="button" class="library-favorite '+(x.favorite?'is-favorite':'')+'" data-id="'+esc(x.id)+'" aria-pressed="'+(x.favorite?'true':'false')+'" title="'+(x.favorite?'Hapus dari favorit':'Tambahkan ke favorit')+'" aria-label="'+(x.favorite?'Hapus dari favorit':'Tambahkan ke favorit')+'">'+(x.favorite?'★':'☆')+'</button><button class="sakelar lib-rename" data-id="'+esc(x.id)+'">Ubah nama</button><button class="sakelar lib-delete" data-id="'+esc(x.id)+'">Hapus</button></div></article>';
    const relationBlock=(rel,items)=>'<details class="library-relation" open><summary><span>👤 '+esc(rel)+'</span><span class="library-count">'+items.length+' item'+(items.length===1?'':'s')+'</span></summary><div class="library-item-grid">'+items.map(itemCard).join('')+'</div></details>';
    list.innerHTML='<div class="library-family-list">'+groups.map(g=>'<details class="library-family" open><summary><div><span class="library-family-name">👨‍👩‍👧 '+esc(g.name)+'</span><span class="library-family-sub">'+g.members.size+' anggota · '+g.items.length+' item</span></div><span class="library-chevron">⌄</span></summary><div class="library-family-body">'+[...g.members.entries()].map(([rel,items])=>relationBlock(rel,items)).join('')+'</div></details>').join('')+'</div>';
    list.querySelectorAll('.lib-view').forEach(b=>b.onclick=()=>view(b.dataset.id));
    list.querySelectorAll('.library-favorite').forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.id));
    list.querySelectorAll('.lib-rename').forEach(b=>b.onclick=()=>rename(b.dataset.id));
    list.querySelectorAll('.lib-delete').forEach(b=>b.onclick=()=>{if(confirm('Hapus ilustrasi ini dari Library?'))deleteOne(b.dataset.id)});
    list.querySelectorAll('.library-batch-toggle').forEach(b=>b.onclick=()=>{const id=b.dataset.id;if(selectedBatch.has(id))selectedBatch.delete(id);else selectedBatch.add(id);render()});
    updateBatchHint();
  }
  function updateBatchHint(){
    const h=el('libBatchHint'); if(h) h.textContent=selectedBatch.size ? selectedBatch.size+' hasil dipilih untuk paket meeting.' : 'Pilih beberapa hasil di Library untuk menyusun satu paket meeting. Tidak perlu menghitung ulang.';
  }
  function closeBatch(){const m=el('libraryBatchModal');if(m)m.remove();document.documentElement.classList.remove('psg-library-batch-open');document.body.classList.remove('psg-library-batch-open')}
  function consultantData(){try{return window.InsuranceHubConsultantCard?.read?.()||JSON.parse(localStorage.getItem('insuranceHub.konsultan.v1')||'{}')}catch(_){return {}}}
  function closeSummary(){const m=el('libraryOnePageModal');if(m)m.remove();document.documentElement.classList.remove('psg-library-summary-open');document.body.classList.remove('psg-library-summary-open')}
  function openSummary(){
    const all=read(), items=all.filter(x=>selectedBatch.has(x.id));
    if(!items.length){alert('Pilih minimal satu hasil untuk membuat Ringkasan 1 Halaman.');return}
    closeSummary();
    const modal=document.createElement('div'); modal.id='libraryOnePageModal'; modal.className='library-summary-modal';
    const card=document.createElement('div'); card.className='library-summary-card';
    /* Identitas diambil dari potret yang tersimpan bersama ilustrasi, bukan
       dari identitas yang sedang aktif sekarang. */
    const c=(items[0]&&items[0].konsultan)||consultantData();
    const family=items[0].familyName||items[0].customerName||'Nasabah';
    const people=[...new Map(items.map(x=>[String(x.insuredPersonId||x.customerName),{name:x.customerName||'Nasabah',rel:x.relationship||'Diri Sendiri'}])).values()];
    const categories=[...new Set(items.map(x=>x.category||'Ilustrasi'))];
    const head=document.createElement('div'); head.className='library-summary-head tanpa-cetak';
    head.innerHTML='<strong>Ringkasan 1 Halaman</strong><div class="library-actions"><button type="button" class="aksi" id="summaryPrint">🖨 Cetak / PDF</button><button type="button" class="sakelar" id="summaryClose">✕ Tutup</button></div>';
    const body=document.createElement('div'); body.className='library-summary-body';
    const now=new Date();
    const social=[]; [['Instagram','instagram'],['TikTok','tiktok'],['Facebook','facebook'],['LinkedIn','linkedin'],['YouTube','youtube']].forEach(([label,key])=>{if(c[key])social.push('<span>'+esc(label)+': '+esc(c[key])+'</span>')});
    /* Saat mode "dibuat untuk agen lain" aktif, dokumen memakai foto agen
       tersebut — bukan foto profil pemilik perangkat. */
    const photo=(()=>{try{
      if(c&&typeof c.foto==='string') return c.foto;       // potret tersimpan
      if(c&&c.atasNama) return c.fotoAgen||'';
      return localStorage.getItem('insuranceHub.agen.foto.v1')||''}catch(_){return ''}})();
    body.innerHTML='<div class="summary-page">'+
      '<div class="summary-brand"><div><div class="summary-kicker">RINGKASAN KONSULTASI</div><h1>'+esc(family)+'</h1><p>'+items.length+' materi terpilih · dibuat '+now.toLocaleDateString('id-ID')+'</p></div><div class="summary-mark">INSURANCE HUB</div></div>'+
      '<div class="summary-grid"><div class="summary-box"><h2>👨‍👩‍👧 Tertanggung yang dibahas</h2>'+people.map(p=>'<div class="summary-person"><b>'+esc(p.name)+'</b><span>'+esc(p.rel)+'</span></div>').join('')+'</div><div class="summary-box"><h2>📂 Materi konsultasi</h2><p>'+categories.map(esc).join(' · ')+'</p><div class="summary-items">'+items.map((x,i)=>'<div class="summary-item"><div><b>'+(i+1)+'. '+esc(x.title)+'</b><span>'+esc(x.category||'Ilustrasi')+' · '+esc(x.relationship||'Diri Sendiri')+'</span></div></div>').join('')+'</div></div></div>'+
      '<div class="summary-note"><b>Catatan:</b> Ringkasan ini hanya merangkum materi yang dipilih dari Library Nasabah. Angka/manfaat tidak dihitung ulang dan tidak menambahkan informasi yang tidak tersimpan pada materi.</div>'+
      '<div class="summary-consultant">'+(photo?'<img src="'+esc(photo)+'" alt="Foto konsultan">':'<div class="summary-avatar">👤</div>')+'<div><div class="summary-kicker">KONSULTAN</div><h3>'+esc(c.nama||'Nama konsultan')+'</h3><p>'+esc(c.jabatan||'Financial Consultant')+'</p><p>'+[c.whatsapp&&('WhatsApp: '+c.whatsapp),c.email&&('Email: '+c.email)].filter(Boolean).map(esc).join(' · ')+'</p><div class="summary-socials">'+social.join(' · ')+'</div></div></div>'+
      '</div>';
    card.append(head,body);modal.appendChild(card);document.body.appendChild(modal);document.documentElement.classList.add('psg-library-summary-open');document.body.classList.add('psg-library-summary-open');
    el('summaryClose').onclick=closeSummary; modal.addEventListener('click',e=>{if(e.target===modal)closeSummary()});
    el('summaryPrint').onclick=()=>{const oldTitle=document.title;document.title='Ringkasan - '+family;window.print();setTimeout(()=>document.title=oldTitle,1000)};
  }
  function openBatch(){
    const all=read(), items=all.filter(x=>selectedBatch.has(x.id));
    if(!items.length){alert('Pilih minimal satu hasil dari Library terlebih dahulu dengan tombol PILIH.');return}
    closeBatch();
    const modal=document.createElement('div'); modal.id='libraryBatchModal'; modal.className='library-batch-modal';
    const card=document.createElement('div'); card.className='library-batch-card';
    const head=document.createElement('div'); head.className='library-batch-head';
    const h=document.createElement('strong'); h.textContent='Paket Meeting Keluarga · '+(items[0].familyName||items[0].customerName||'Nasabah');
    const actions=document.createElement('div'); actions.className='library-actions tanpa-cetak';
    const print=document.createElement('button'); print.type='button'; print.className='aksi'; print.textContent='🖨 Cetak / PDF';
    const close=document.createElement('button'); close.type='button'; close.className='sakelar'; close.textContent='✕ Tutup'; actions.append(print,close); head.append(h,actions);
    const body=document.createElement('div'); body.className='library-batch-body';
    const intro=document.createElement('div'); intro.innerHTML='<div class="kop"><h2>Paket Meeting Keluarga</h2><p>'+esc(items[0].familyName||items[0].customerName||'Nasabah')+' · '+items.length+' hasil tersimpan</p></div>'; body.appendChild(intro);
    items.forEach((x,i)=>{const sec=document.createElement('section');sec.className='library-batch-item';sec.innerHTML='<div class="library-batch-meta"><span class="badge">'+esc(x.category||'Ilustrasi')+'</span><span class="badge">'+esc(x.product||'')+'</span></div><h3>'+esc(x.title)+'</h3><p><b>Tertanggung:</b> '+esc(x.customerName||'Nasabah')+' · '+esc(x.relationship||'Diri Sendiri')+'</p><p class="catatan">Dibuat '+new Date(x.createdAt).toLocaleDateString('id-ID')+'</p><div class="batch-snapshot">'+x.html+'</div>';body.appendChild(sec)});
    /* Logo yang ikut tersimpan di dalam tiap cuplikan dibuang. Aturan ukuran
       logo itu hanya ada di halaman ringkasan asalnya, jadi saat cuplikannya
       dirender di sini gambarnya tampil seukuran berkas aslinya — memenuhi
       layar dan tercetak di tengah dokumen, bukan di kanan atas. Logo yang
       benar tetap ditempel preview-cetak.js di kanan atas, 22 mm. */
    try{
      body.querySelectorAll('.print-logo,.brand-top,.logo-cetak,.logo-psg-app,img[src*="logo-psg"]')
        .forEach(function(n){ n.remove(); });
    }catch(_){}
    card.append(head,body);modal.appendChild(card);document.body.appendChild(modal);document.documentElement.classList.add('psg-library-batch-open');document.body.classList.add('psg-library-batch-open');
    close.onclick=closeBatch; modal.addEventListener('click',e=>{if(e.target===modal)closeBatch()});
    print.onclick=()=>{const oldTitle=document.title;document.title='Paket Meeting - '+(items[0].familyName||items[0].customerName||'Nasabah');window.print();setTimeout(()=>document.title=oldTitle,1000)};
  }
  function ensureSaveButton(){
    const section=activeSection(); if(!section)return;
    if(['layarLibraryIlustrasi','layarKartuKonsultan','layarProduk','layarProfile','layarAktivitas','layarSlipKomisi'].includes(section.id))return;
    const key=currentKey()||'';
    // Any client-facing result with a print/PDF action should be saveable.
    const printButtons=[...section.querySelectorAll('button')].filter(b=>{
      const t=(b.textContent||'').toLowerCase();
      return /(cetak|print|pdf)/.test(t) && !b.classList.contains('btn-simpan-library') && !b.dataset.libraryChecked;
    });
    if(!printButtons.length)return;
    printButtons.forEach(printBtn=>{
      printBtn.dataset.libraryChecked='1';
      const row=printBtn.parentElement;
      if(row && row.querySelector('.btn-simpan-library')) return;
      const save=document.createElement('button');
      save.type='button'; save.className='aksi btn-simpan-library'; save.textContent='📚 Simpan ke Library';
      save.addEventListener('click',saveCurrent);
      if(row) row.appendChild(save); else printBtn.insertAdjacentElement('afterend',save);
    });
  }
  function init(){
    const b=el('libRefresh');if(b)b.onclick=render;
    const q=el('libCari');if(q)q.addEventListener('input',render);
    const f=el('libFilterProduk');if(f)f.addEventListener('change',render);
    const fc=el('libFilterKategori');if(fc)fc.addEventListener('change',render);
    const fs=el('libFilterSort');if(fs)fs.addEventListener('change',render);
    const all=el('libHapusSemua');if(all)all.onclick=()=>{if(confirm('Hapus seluruh item yang tersimpan di Library Nasabah pada perangkat ini?')){write([]);render()}};
    const batch=el('libBatchMeeting');if(batch)batch.onclick=openBatch;
    const summary=el('libOnePageSummary');if(summary)summary.onclick=openSummary;
    render();
    const old=window.bukaLayar;
    if(old&&!old.__libraryWrapped){
      const wrap=function(n){const r=old.apply(this,arguments);setTimeout(()=>{if(n==='LIBRARY_ILUSTRASI')render();else ensureSaveButton()},30);return r};
      wrap.__libraryWrapped=true;window.bukaLayar=wrap;
      if(window.InsuranceHubNavigation)window.InsuranceHubNavigation.bukaLayar=wrap;
    }
    setTimeout(ensureSaveButton,200);
  }
  window.InsuranceHubLibrary={read,saveCurrent,render,makeTitle};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
