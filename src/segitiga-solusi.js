/* ============================================================
   Solusi Segitiga Financial — Fase 1
   Hanya membaca hasil Segitiga. Belum menyentuh engine produk,
   alternatif, perbandingan, maupun cetak.
   ============================================================ */
(function(){
  'use strict';
  const KEY='insuranceHub.segitiga.v1';
  const el=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const rp=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');

  const INFO={
    health:{title:'HEALTH',icon:'🏥',desc:'Perlindungan terhadap tagihan rumah sakit'},
    life:{title:'LIFE',icon:'❤️',desc:'Pengganti penghasilan & warisan'},
    ci:{title:'CRITICAL ILLNESS',icon:'🛡️',desc:'Pengganti penghasilan saat sakit kritis'},
    pensiun:{title:'TUA / PENSIUN',icon:'🌱',desc:'Persiapan biaya hidup saat pensiun'}
  };

  /*
   * Phase 2A — Product Mapping.
   * Ini hanya mendefinisikan kandidat yang valid secara fungsi.
   * Belum melakukan pemilihan editable, rider, atau kalkulasi premi.
   *
   * default = starting point yang akan dipakai Phase 2B.
   * candidates = produk/kombinasi sejenis yang boleh dipilih nanti.
   */
  const PRODUCT_MAP={
    life:{
      default:'GSPA',
      candidates:[
        {kode:'GSPA', label:'Gen Aman'},
        {kode:'GPRO', label:'Gen Pro'},
        {kode:'BSL', label:'BeSMART Lite 100'},
        {kode:'CEM', label:'New Cemerlang Prime'},
        {kode:'FLEX', label:'iFLEXYGUARD 5'},
        {kode:'RIZQIA', label:'RIZQIA'}
      ]
    },
    health:{
      default:'GSPA_HEALTH',
      candidates:[
        {kode:'GSPA_HEALTH', label:'Gen Aman + GHPS'},
        {kode:'GPRO_HEALTH', label:'Gen Pro + GHP'},
        {kode:'BSL_HEALTH', label:'BeSMART Lite 100 + GHP'}
      ]
    },
    ci:{
      default:'CRIS',
      candidates:[
        {kode:'CRIS', label:'Cristal Prime'}
      ]
    },
    pensiun:{
      default:'LF',
      candidates:[
        {kode:'LF', label:'BeSMART Lite Future'}
      ]
    }
  };

  function produkInfo(k){
    const p=PRODUCT_MAP[k];
    if(!p) return null;
    const d=p.candidates.find(x=>x.kode===p.default) || p.candidates[0];
    return {default:d, candidates:p.candidates};
  }

  const SOLUSI_KEY='insuranceHub.segitiga.solusi.v2';

  function activeProfileId(){
    const s=read();
    return String((s&&s.profileId)||'DEMO_LEO');
  }
  function activeProfileSignature(){
    const s=read()||{};
    return [activeProfileId(),s.nama||'',s.tgl||'',s.jk||'',Number(s.penghasilanBulanan)||0].join('|');
  }
  function loadDraft(){
    try{
      const x=JSON.parse(localStorage.getItem(SOLUSI_KEY)||'null');
      if(!x||typeof x!=='object') return {};
      if(x._profileSignature && x._profileSignature!==activeProfileSignature()) return {};
      if(x._profileId && x._profileId!==activeProfileId()) return {};
      // Legacy solution drafts without profile identity are unsafe to reuse.
      if(!x._profileId || !x._profileSignature) return {};
      return x;
    }catch(_){return {};}
  }
  function saveDraft(d){
    try{
      d._profileId=activeProfileId();
      d._profileSignature=activeProfileSignature();
      localStorage.setItem(SOLUSI_KEY,JSON.stringify(d));
    }catch(_){}
  }

  function validasiTargetLiteFuture(target, h){
    const t=Number(target)||0;
    if(t<=0) return {target:t,parts:[]};
    try{
      const rates=(typeof TARIF!=='undefined')?TARIF:null;
      const meta=(typeof META!=='undefined')?META:null;
      const s=(h&&h._segitigaState&&typeof h._segitigaState==='object')?h._segitigaState:(read()||{});
      const retAge=Number(h?.usiaPensiun)||55;
      const mpp=Number(h?.lamaSiapkan)||5;
      const jk=String(s.jk||'PRIA').toUpperCase()==='WANITA'?'WANITA':'PRIA';
      const lahir=s.tgl?new Date(s.tgl+'T00:00:00Z'):null;
      if(!rates||!meta||!lahir) return {target:t,parts:[]};
      const cekAda=function(up){
        const ip={nama:s.nama||'Nasabah',jk,tglLahir:lahir,usia:h.usia,setoran:'Tahunan',mpp,
          pensiunUP:up,statusAgen:'Reguler Agen',customUP:{},pilih:{}};
        [55,60,65,70,75].forEach(function(a){ ip.pilih[a]=(a===retAge); ip.customUP[a]=null; });
        const rr=engineResult('LF',ip,rates,meta);
        if(!rr.ok) return false;
        const row=rr.result.hasil.find(x=>Number(x.retAge)===retAge && x.setoran!=null);
        return !!row;
      };
      const parts=optimasiLiteFuture(t,{
        cekRow:function(up){
          const ip={nama:s.nama||'Nasabah',jk,tglLahir:lahir,usia:h.usia,setoran:'Tahunan',mpp,
            pensiunUP:up,statusAgen:'Reguler Agen',customUP:{},pilih:{}};
          [55,60,65,70,75].forEach(function(a){ ip.pilih[a]=(a===retAge); ip.customUP[a]=null; });
          const rr=engineResult('LF',ip,rates,meta);
          if(!rr.ok) return null;
          return rr.result.hasil.find(function(x){return Number(x.retAge)===retAge && x.setoran!=null;})||null;
        },
        metode:'Tahunan'
      });
      return {target:parts.length?parts.reduce((a,b)=>a+Number(b||0),0):t,parts};
    }catch(_){ return {target:t,parts:[]}; }
  }

  function defaultDraft(h){
    const d=loadDraft();
    const out={};
    ['life','health','ci','pensiun'].forEach(function(k){
      const p=produkInfo(k);
      const base={
        aktif: status(k,h).cls==='gap',
        produk:p?p.default.kode:'',
        up: k==='life'?h.lifeKurang:(k==='ci'?h.ciKurang:null),
        target: k==='pensiun'?h.penKurang:null
      };
      const saved=d[k]||{};
      out[k]=Object.assign(base,saved);
      // Need result from Segitiga is authoritative on first load for this profile.
      if(k==='ci') out[k].up=Number(h.ciKurang)||0;
      if(k==='life') out[k].up=Number(h.lifeKurang)||0;
      if(k==='pensiun'){
        const v=validasiTargetLiteFuture(Number(h.penKurang)||0,h);
        out[k].target=v.target;
        out[k].targetFinancial=Number(h.penKurang)||0;
        out[k].targetParts=v.parts.slice();
      }
      if(p && !p.candidates.some(x=>x.kode===out[k].produk)) out[k].produk=p.default.kode;
    });
    return out;
  }

  function selectedProduct(k,d){
    const p=produkInfo(k);
    if(!p) return null;
    return p.candidates.find(x=>x.kode===d[k].produk) || p.default;
  }

  function targetLayar(k,kode){
    if(k==='ci') return 'CRIS';
    if(k==='pensiun') return 'LF';
    if(k==='health'){
      if(kode==='GPRO_HEALTH') return 'GPRO';
      if(kode==='BSL_HEALTH') return 'BSL';
      return 'GSPA';
    }
    if(kode==='GPRO') return 'GPRO';
    if(kode==='CEM') return 'CEM';
    if(kode==='FLEX') return 'FLEX';
    if(kode==='RIZQIA') return 'RIZQIA';
    if(kode==='BSL') return 'BSL';
    return 'GSPA';
  }

  function buildOpenPayload(k,kode,d,h){
    const payload={
      source:'SEGITIGA_SOLUSI',
      kebutuhan:k,
      produk:kode,
      nama:h.nama,
      up:k==='life'||k==='ci' ? (Number(d[k].up)||0) : 0,
      target:k==='pensiun' ? (Number(d[k].target)||0) : 0
    };
    try{ localStorage.setItem('insuranceHub.segitiga.solutionBridge.v1',JSON.stringify(payload)); }catch(_){}
    return payload;
  }

  function renderProductEditor(k,h,d){
    const p=produkInfo(k), chosen=selectedProduct(k,d);
    if(!p||!chosen) return '';
    const st=status(k,h);
    const disabled=st.cls!=='gap'?' disabled':'';
    let html='<div class="sgs-editor">';
    html+='<div class="sgs-editor-head"><span>Solusi yang dipilih</span><b>'+esc(chosen.label)+'</b></div>';
    html+='<label class="sgs-select-label">Pilih produk / kombinasi sejenis</label>';
    html+='<select class="sgs-product-select" data-sol-k="'+k+'"'+disabled+'>';
    html+=p.candidates.map(x=>'<option value="'+esc(x.kode)+'"'+(x.kode===chosen.kode?' selected':'')+'>'+esc(x.label)+'</option>').join('');
    html+='</select>';

    if(k==='life' || k==='ci'){
      const val=Number(d[k].up)||0;
      html+='<label class="sgs-select-label">UP default dari gap</label>';
      html+='<div class="sgs-up-row"><input class="sgs-up-input" data-sol-up="'+k+'" inputmode="numeric" value="'+esc(moneyDisplay(val))+'"'+disabled+'><span>Nilai kebutuhan tetap berasal dari Segitiga</span></div>';
    } else if(k==='pensiun'){
      const val=Number(d[k].target)||0;
      html+='<label class="sgs-select-label">Target kebutuhan pensiun</label>';
      html+='<div class="sgs-up-row"><input class="sgs-up-input" data-sol-target="pensiun" inputmode="numeric" value="'+esc(moneyDisplay(val))+'"'+disabled+'><span>Target tetap berasal dari hasil Segitiga</span></div>';
    } else {
      html+='<div class="sgs-health-note">Kebutuhan Health mengikuti rule status pada Segitiga. Plan/rider kesehatan tetap dikonfigurasi pada kalkulator produk agar mengikuti aturan produknya.</div>';
    }
    html+='</div>';
    return html;
  }


  const ALT_KEY='insuranceHub.segitiga.alternatives.v1';

  function loadAlternatives(){
    try{
      const x=JSON.parse(localStorage.getItem(ALT_KEY)||'null');
      if(!Array.isArray(x)) return [];
      const pid=activeProfileId();
      return x.filter(a=>a && a.profileId===pid);
    }catch(_){return [];}
  }
  function saveAlternatives(a){
    try{
      const pid=activeProfileId();
      const currentRaw=JSON.parse(localStorage.getItem(ALT_KEY)||'null');
      const current=Array.isArray(currentRaw)?currentRaw:[];
      const other=current.filter(x=>x && x.profileId!==pid);
      const scoped=(Array.isArray(a)?a:[]).map(x=>Object.assign({},x,{profileId:pid,profileSignature:activeProfileSignature()}));
      localStorage.setItem(ALT_KEY,JSON.stringify(other.concat(scoped)));
    }catch(_){}
  }
  function selectedSolutionSnapshot(h,d){
    const selected={};
    ['life','health','ci','pensiun'].forEach(function(k){
      if(d[k] && d[k].aktif && status(k,h).cls==='gap'){
        selected[k]={
          produk:d[k].produk,
          up:Number(d[k].up)||0,
          target:Number(d[k].target)||0
        };
      }
    });
    return selected;
  }
  function makeAlt(h,d,name){
    return {
      id:'ALT-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
      name:name||'Alternatif '+(loadAlternatives().length+1),
      items:selectedSolutionSnapshot(h,d),
      createdAt:new Date().toISOString(),
      profileId:activeProfileId(),
      profileSignature:activeProfileSignature(),
      profileMode:(read()?.profileId && read().profileId!=='DEMO_LEO')?'CLIENT':'DEMO',
      profileName:h.nama||'Leo — Demo / Sharing'
    };
  }
  function altSummary(alt,h){
    const keys=Object.keys(alt.items||{});
    return keys.map(k=>{
      const p=produkInfo(k);
      const item=alt.items[k];
      const chosen=p && p.candidates.find(x=>x.kode===item.produk);
      return '<span class="sgs-alt-chip">'+INFO[k].icon+' '+esc(chosen?chosen.label:item.produk||INFO[k].title)+'</span>';
    }).join('');
  }
  function bindEditors(h,d){
    document.querySelectorAll('.sgs-product-select').forEach(function(sel){
      sel.addEventListener('change',function(){
        const k=this.getAttribute('data-sol-k');
        d[k].produk=this.value;
        const p=produkInfo(k);
        if(p && !p.candidates.some(x=>x.kode===d[k].produk)) d[k].produk=p.default.kode;
        saveDraft(d);
        render();
      });
    });
    document.querySelectorAll('.sgs-up-input').forEach(function(inp){
      inp.addEventListener('change',function(){
        const k=this.getAttribute('data-sol-up')||this.getAttribute('data-sol-target');
        const v=Math.max(0,Number(String(this.value).replace(/[^\d]/g,''))||0);
        if(k==='pensiun') d[k].target=v; else d[k].up=v;
        saveDraft(d);
      });
      inp.addEventListener('blur',function(){this.value=(Number(String(this.value).replace(/[^\d]/g,''))||0).toLocaleString('id-ID');});
    });
  }

  function read(){
    try{
      const s=JSON.parse(localStorage.getItem(KEY)||'null');
      return s&&typeof s==='object'?s:null;
    }catch(_){return null;}
  }

  function hitung(s){
    if(!s) return null;
    const bul=Number(s.penghasilanBulanan)||0, tah=bul*12;
    /*
     * Data pensiun di Segitiga Financial adalah sumber kebenaran untuk
     * Program Builder. Sebelumnya fungsi bridge ini hanya mengembalikan
     * penKurang, sehingga renderCalculationHub() tidak pernah menerima
     * usiaPensiun dan lamaSiapkan yang dipilih agen. Akibatnya Builder
     * jatuh kembali ke default 55/5.
     *
     * Bila lamaSiapkan belum tersimpan (state lama/null), samakan dengan
     * aturan default Segitiga: pilih masa bayar LF terbesar yang masih muat
     * sampai usia produktif.
     */
    const usiaSekarang = (function(){
      try {
        if(typeof usiaGenerali==='function' && s.tgl) return Number(usiaGenerali(new Date(s.tgl+'T00:00:00Z'))) || 0;
      } catch(_){}
      return 0;
    })();
    const mppOptions=(function(){
      const bawaan=[3,5,10,15,20];
      try{
        if(typeof TARIF==='undefined' || !TARIF) return bawaan;
        const set={};
        Object.keys(TARIF).forEach(function(k){
          const m=/^LF[BT] (\d+)-\d+$/.exec(k);
          if(m) set[Number(m[1])]=true;
        });
        const ada=Object.keys(set).map(Number).sort(function(a,b){return a-b;});
        return ada.length?ada:bawaan;
      }catch(_){return bawaan;}
    })();
    const usiaProduktif=Number(s.usiaProduktif)||60;
    const derivedLama=Number(s.lamaSiapkan)||mppOptions.filter(function(v){return v<=Math.max(0,usiaProduktif-usiaSekarang);}).pop()||mppOptions[0];
    const lamaSiapkan=Number(derivedLama)||5;
    const pilihanUsia=(function(){
      const pilihan=[55,60,65,70,75];
      const batas=usiaSekarang+lamaSiapkan+10;
      const ada=pilihan.filter(function(v){return v>=batas;});
      return ada.length?ada:[75];
    })();
    const usiaPensiun=(pilihanUsia.indexOf(Number(s.usiaPensiun))>=0)?Number(s.usiaPensiun):pilihanUsia[0];
    const ciIdeal=tah*((Number(s.tahunPenggantiCI)||0)+(Number(s.tahunPengobatan)||0));
    const ciPunya=s.punyaCI?(Number(s.upCIDimiliki)||0):0;
    const lifeIdeal=tah*(Number(s.tahunWarisan)||0);
    const lifePunya=s.punyaLife?(Number(s.upLifeDimiliki)||0):0;
    const biaya=bul*((Number(s.persenBiayaPensiun)||0)/100);
    const lama=Math.max(0,(Number(s.usiaHarapan)||0)-usiaPensiun);
    const penIdeal=biaya*12*lama;
    const penPunya=s.punyaPensiun?(Number(s.danaPensiunDimiliki)||0):0;
    const healthCukup=!!s.punyaHealth && s.jenisHealth==='Asuransi kesehatan sesuai tagihan';
    return {
      lifeIdeal,lifePunya,lifeKurang:Math.max(0,lifeIdeal-lifePunya),
      ciIdeal,ciPunya,ciKurang:Math.max(0,ciIdeal-ciPunya),
      penIdeal,penPunya,penKurang:Math.max(0,penIdeal-penPunya),
      healthCukup,healthPunya:!!s.punyaHealth,healthJenis:s.punyaHealth?s.jenisHealth:'',
      prioritas:Array.isArray(s.prioritas)?s.prioritas.slice():[],
      nama:s.nama||'Nasabah',
      usia:usiaSekarang,
      lamaSiapkan:lamaSiapkan,
      usiaPensiun:usiaPensiun,
      usiaPensiunPilihan:pilihanUsia
    };
  }

  function status(k,h){
    if(k==='health') return h.healthCukup
      ? {cls:'cukup',label:'Sudah cukup',detail:'Perlindungan sesuai tagihan sudah dimiliki.'}
      : {cls:'gap',label:'Perlu dilengkapi',detail:h.healthPunya?'Existing: '+h.healthJenis+'.':'Belum ada perlindungan kesehatan sesuai tagihan.'};
    const gap=k==='life'?h.lifeKurang:k==='ci'?h.ciKurang:h.penKurang;
    return gap>0
      ? {cls:'gap',label:'Masih ada gap',detail:'Kebutuhan yang masih perlu ditangani: '+rp(gap)}
      : {cls:'cukup',label:'Sudah terpenuhi',detail:'Tidak ada kekurangan berdasarkan data yang dimasukkan.'};
  }

  function value(k,h){
    if(k==='health') return 'Sesuai kebutuhan/tagihan';
    return rp(k==='life'?h.lifeKurang:k==='ci'?h.ciKurang:h.penKurang);
  }


  function render(){
    const w=el('layarSegitigaSolusi'); if(!w) return;
    // Always read the latest state saved by the main Segitiga page.
    const s=read(), h=hitung(s);
    const usia=(s&&s.tgl)?(function(t){
      const d=new Date(t); if(isNaN(d.getTime())) return null;
      const now=new Date(); let a=now.getFullYear()-d.getFullYear();
      const md=now.getMonth()-d.getMonth();
      if(md<0 || (md===0 && now.getDate()<d.getDate())) a--;
      return a>=0?a:null;
    })(s.tgl):null;
    if(!h){
      w.innerHTML='<div class="kop"><h2>Solusi Segitiga Financial</h2><p class="catatan">Hitung kebutuhan di Segitiga Financial terlebih dahulu.</p></div>';
      return;
    }
    const order=['life','ci','health','pensiun'];
    const pr=h.prioritas.filter(k=>order.indexOf(k)>=0);
    order.forEach(k=>{if(pr.indexOf(k)<0) pr.push(k);});
    const d=defaultDraft(h);
    w.innerHTML=
      '<div class="kop">'+
        '<h2>Solusi Segitiga Financial</h2>'+
        '<p>Rancangan solusi berdasarkan hasil perhitungan di halaman Segitiga Financial.</p>'+
      '</div>'+
      '<div class="blok sgs-client-summary">'+
        '<div class="sgs-client-title">Data yang dihitung</div>'+
        '<div class="sgs-client-grid">'+
          '<div><span>Nama</span><b>'+esc(s.nama||'—')+'</b></div>'+
          '<div><span>Tanggal lahir</span><b>'+esc(s.tgl||'—')+'</b></div>'+
          '<div><span>Usia</span><b>'+(usia==null?'—':usia+' tahun')+'</b></div>'+
          '<div><span>Penghasilan / bulan</span><b>'+rp(s.penghasilanBulanan||0)+'</b></div>'+
        '</div>'+
      '</div>'+

      '<div class="blok"><h3 style="margin-top:0">Pilih solusi untuk program ini</h3>'+
        '<p class="catatan">Setiap kebutuhan yang masih memiliki gap sudah diberi rekomendasi awal. Produk dapat diganti dengan pilihan sejenis yang tersedia.</p>'+
        '<div class="sgs-grid">'+pr.map(function(k,i){
          const inf=INFO[k], st=status(k,h);
          const active=d[k].aktif;
          return '<div class="sgs-card '+st.cls+' '+(active?'sgs-selected':'')+'">'+
            '<div class="sgs-top"><label class="sgs-check"><input type="checkbox" data-sol-active="'+k+'" '+(active?'checked':'')+(st.cls!=='gap'?' disabled':'')+'><span></span></label>'+
            '<span class="sgs-icon">'+inf.icon+'</span><div><div class="sgs-prio">PRIORITAS #'+(i+1)+'</div><h3>'+inf.title+'</h3></div></div>'+
            '<div class="sgs-desc">'+inf.desc+'</div>'+
            '<div class="sgs-row"><span>Gap / kebutuhan</span><b>'+value(k,h)+'</b></div>'+
            '<div class="sgs-status">'+st.label+'</div>'+
            '<p class="catatan">'+esc(st.detail)+'</p>'+
            (st.cls==='gap' ? renderProductEditor(k,h,d) : '')+
          '</div>';
        }).join('')+'</div>'+
      '</div>'+
      '<div class="blok"><h3 style="margin-top:0">Prioritas nasabah</h3><ol class="sgt-urut">'+pr.map(k=>'<li><b>'+INFO[k].title+'</b></li>').join('')+'</ol>'+
      '<p class="catatan">Urutan ini mengikuti concern yang dipilih prospek. Memilih atau mengganti solusi tidak mengubah hasil analisa Segitiga.</p></div>'+
      '<div class="blok sgs-alt-panel"><h3 style="margin-top:0">Alternatif Program</h3>'+
      '<p class="catatan">Pilih kebutuhan dan produk untuk program ini. Setelah siap, simpan sebagai alternatif lalu hitung seluruh kebutuhan dalam alternatif secara bersamaan.</p>'+
      '<div class="sgs-alt-actions"><button type="button" class="aksi" id="sgsSaveAlt">Simpan sebagai Alternatif</button><button type="button" class="sakelar" id="sgsCompareAlt" '+(loadAlternatives().length<2?'disabled':'')+'>Bandingkan Alternatif</button></div>'+
      '<div id="sgsAltList" class="sgs-alt-list"></div></div>'+
      '<div class="blok"><p class="catatan"><b>Fase Profile:</b> Segitiga memiliki mode Demo Leo dan mode Profil Nasabah Aktif. Pergantian mode hanya memengaruhi perhitungan Segitiga, tanpa mengubah profile global aplikasi.</p></div>';
    const profileMode=document.getElementById('sgsProfileMode');
    if(profileMode) profileMode.addEventListener('change',function(){
      setProfileMode(this.value);
    });

    document.querySelectorAll('[data-sol-active]').forEach(function(cb){
      cb.addEventListener('change',function(){
        const k=this.getAttribute('data-sol-active');
        d[k].aktif=this.checked;
        saveDraft(d);
        render();
      });
    });
    bindEditors(h,d);


    const renderAltList=()=>{
      const box=document.getElementById('sgsAltList');
      if(!box) return;
      const alts=loadAlternatives();
      if(!alts.length){
        box.innerHTML='<div class="catatan">Belum ada alternatif yang disimpan.</div>';
        return;
      }
      box.innerHTML=alts.map((a,i)=>
        '<div class="sgs-alt-card"><div><div class="sgs-alt-name">'+esc(a.name)+'</div><div class="sgs-alt-meta">'+(Object.keys(a.items||{}).length)+' kebutuhan dipilih</div><div class="sgs-alt-chips">'+altSummary(a,h)+'</div></div>'+
        '<div class="sgs-alt-buttons"><button type="button" class="aksi sgs-calc-program" data-alt-id="'+esc(a.id)+'">Hitung Program</button><button type="button" class="sakelar sgs-del-alt" data-alt-id="'+esc(a.id)+'">Hapus</button></div></div>'
      ).join('');
      box.querySelectorAll('.sgs-calc-program').forEach(btn=>{
        btn.addEventListener('click',function(){
          const id=this.getAttribute('data-alt-id');
          const alt=loadAlternatives().find(function(a){return a.id===id;});
          if(!alt) return;
          openProgramBuilder(alt,h,s);
          window.scrollTo(0,0);
        });
      });
      box.querySelectorAll('.sgs-del-alt').forEach(btn=>{
        btn.addEventListener('click',function(){
          const id=this.getAttribute('data-alt-id');
          saveAlternatives(loadAlternatives().filter(a=>a.id!==id));
          render();
        });
      });
    };
    const saveBtn=document.getElementById('sgsSaveAlt');
    if(saveBtn) saveBtn.addEventListener('click',function(){
      const alts=loadAlternatives();
      if(alts.length>=3){ alert('Maksimal 3 alternatif untuk satu sesi.'); return; }
      const alt=makeAlt(h,d,'Alternatif '+(alts.length+1));
      if(!Object.keys(alt.items).length){ alert('Pilih minimal satu kebutuhan untuk membuat alternatif.'); return; }
      alts.push(alt);
      saveAlternatives(alts);
      render();
    });

    const cmpBtn=document.getElementById('sgsCompareAlt');
    if(cmpBtn) cmpBtn.addEventListener('click',function(){
      const alts=loadAlternatives();
      if(alts.length<2){ alert('Simpan minimal 2 alternatif untuk dibandingkan.'); return; }
      try{ localStorage.setItem('insuranceHub.segitiga.compare.v1',JSON.stringify(alts)); }catch(_){}
      if(typeof window.bukaLayar==='function') window.bukaLayar('SOLUSI_BANDING');
      setTimeout(renderBanding,20);
    });
    renderAltList();
  }


  /* ---------- Banding alternatif ----------
     Satu prospek bisa punya beberapa jalan: ambil semuanya sekaligus, atau
     mulai dari dua lapis dulu. Halaman ini menyandingkan alternatif yang
     sudah disimpan supaya prospek melihat bedanya tanpa membuka satu per
     satu. Maksimal tiga, karena lebih dari itu kolomnya tidak terbaca. */

  const KEBUTUHAN_URUT=['life','ci','health','pensiun'];

  function bandingDaftar(){
    try{
      const x=JSON.parse(localStorage.getItem('insuranceHub.segitiga.compare.v1')||'null');
      return Array.isArray(x)?x.slice(0,3):[];
    }catch(_){return [];}
  }

  /* Hasil hitungan program TIDAK disimpan di dalam objek alternatif, melainkan
     di penyimpanan tersendiri (PB_KEY) yang dikunci id alternatif. Halaman
     banding sebelumnya mencarinya di dalam alternatif, sehingga selalu
     menyimpulkan "belum dihitung" padahal agen sudah menekan Hitung Program. */
  function draftProgram(altId){
    try{
      const all=JSON.parse(localStorage.getItem(PB_KEY)||'{}')||{};
      return all[altId]||null;
    }catch(_){return null;}
  }

  /* Nama produk yang enak dibaca, bukan kodenya. */
  function namaProduk(need,kode){
    const p=produkInfo(need);
    const c=((p&&p.candidates)||[]).find(function(x){return x.kode===kode;});
    return (c&&c.label)||kode||'';
  }

  /* Bila alternatif belum pernah ditekan Hitung Program, preminya dihitung
     di sini juga. Tanpa ini, kolomnya selalu kosong hanya karena agen belum
     membuka alternatif itu satu per satu — padahal justru banding inilah
     yang ingin dilihat lebih dulu. */
  function hitungKalauPerlu(alt){
    const d=draftProgram(alt.id);
    if(d&&d.program&&Array.isArray(d.program.results)&&d.program.results.length) return d.program;
    const items=(d&&Array.isArray(d.items)&&d.items.length)?d.items:builderItemsDari(alt);
    if(!items.length) return null;
    /* Profil diambil dari keadaan Segitiga bila draft belum menyimpannya.
       Tanpa tanggal lahir, seluruh perhitungan produk gagal dan kolomnya
       tetap kosong. */
    let profile=null;
    try{
      const sg=read()||{};
      profile=profileForProgram((d&&d.profile)||{
        nama:sg.nama, tglLahir:sg.tgl, jk:sg.jk, penghasilan:sg.penghasilanBulanan
      });
    }catch(_){ profile=null; }
    if(!profile || !profile.tglLahir) return null;
    const results=[];
    items.filter(function(i){return i.included!==false;}).forEach(function(item){
      try{ results.push(buildProductCalculation(item.need,item.produk,item,profile)); }
      catch(_){ }
    });
    if(!results.length) return null;
    const program={alternativeId:alt.id,alternativeName:alt.name,profile,results,
      calculatedAt:new Date().toISOString()};
    try{
      const all=JSON.parse(localStorage.getItem(PB_KEY)||'{}')||{};
      const simpan=all[alt.id]||{items:items};
      simpan.items=items; simpan.program=program;
      all[alt.id]=simpan;
      localStorage.setItem(PB_KEY,JSON.stringify(all));
    }catch(_){ }
    return program;
  }

  function builderItemsDari(alt){
    try{ return cloneBuilderItems(alt)||[]; }catch(_){ return []; }
  }

  function angkaProgram(alt){
    if(!alt) return null;
    const d=draftProgram(alt.id);
    const pr=(d&&d.program)||alt.program||hitungKalauPerlu(alt)||null;
    if(!pr||!Array.isArray(pr.results)||!pr.results.length) return null;
    const baik=pr.results.filter(function(r){return r&&r.ok;});
    if(!baik.length) return null;

    /* Premi tiap komponen disimpan menurut cara bayarnya masing-masing, jadi
       disetarakan dulu ke setahun sebelum dijumlahkan. */
    const tahunan=baik.reduce(function(t,r){
      const p=Number(r.premium||0);
      return t + (r.metode==='Bulanan' ? p*12 : p);
    },0);
    const metode=(d&&d.metodeProgram)||baik[0].metode||'Tahunan';
    const bulanan=metode==='Bulanan';
    const total=baik.reduce(function(t,r){return t+Number(r.totalPaid||0);},0);
    const lama=baik.reduce(function(m,r){return Math.max(m,Number(r.paymentTerm||0));},0);
    const health=baik.some(function(r){
      return r.need==='health' || /GHP|GHPS/i.test(String(r.productName||r.product||''));
    });
    return {
      perSetoran: bulanan ? tahunan/12 : tahunan,
      tahunan: tahunan,
      total: total,
      lamaBayar: lama,
      metode: metode,
      health: health,
      jumlahKomponen: baik.length
    };
  }

  function renderBanding(){
    const w=el('layarSolusiBanding'); if(!w) return;
    const alts=bandingDaftar();
    if(alts.length<2){
      w.innerHTML='<div class="kop"><h2>Banding Alternatif</h2>'+
        '<p class="catatan">Simpan minimal dua alternatif di halaman Solusi, '+
        'lalu tekan Bandingkan.</p></div>';
      return;
    }
    const sg=read()||{};
    const nama=(alts[0]&&alts[0].profileName)||sg.nama||'Nasabah';
    const usiaNasabah=(function(){
      if(!sg.tgl) return null;
      if(typeof usiaGenerali==='function'){
        try{ return usiaGenerali(new Date(sg.tgl+'T00:00:00Z')); }catch(_){ }
      }
      return null;
    })();
    const tglTampil=(function(){
      if(!sg.tgl) return '\u2014';
      const b=String(sg.tgl).split('-');
      return b.length===3 ? (b[2]+'-'+b[1]+'-'+b[0]) : sg.tgl;
    })();

    const adaKebutuhan=function(alt,k){ return !!(alt.items&&alt.items[k]); };
    const produkTeks=function(alt,k){
      const it=alt&&alt.items&&alt.items[k];
      if(!it) return 'Tidak diambil';
      const p=produkInfo(k);
      const kode=it.produk||(p&&p.default&&p.default.kode)||'';
      const label=namaProduk(k,kode)||'Dipilih';
      const v=Number(it.up||it.target||0);
      return esc(label)+(v?' \u2014 '+rp(v):'');
    };

    /* Dibuat sebagai kartu berdampingan memakai kelas .banding-kolom, sama
       dengan halaman banding di kalkulator produk. Dengan begitu kotak
       centang "cetak pilihan ini" dan penyusunan cetak yang memisahkan
       "yang membedakan" dari "yang sama" langsung berlaku di sini juga,
       tanpa membuat mekanisme kedua yang berbeda perilakunya. */
    const kolom=alts.map(function(a){
      const g=angkaProgram(a);
      const jml=KEBUTUHAN_URUT.filter(function(k){return adaKebutuhan(a,k);}).length;
      const bintang=(g&&g.health)?' *':'';
      return '<div class="banding-kolom">'+
        '<div class="banding-judul">'+esc(a.name||'Alternatif')+'</div>'+
        '<table class="akt-tabel banding-tabel"><tbody>'+
        '<tr><td>Lapis tertutup</td><td><b>'+jml+' dari 4</b></td></tr>'+
        KEBUTUHAN_URUT.map(function(k){
          const info=INFO[k]||{title:k};
          return '<tr><td>'+esc(info.title)+'</td><td><b>'+produkTeks(a,k)+'</b></td></tr>';
        }).join('')+
        '<tr><td>Premi per tahun</td><td><b>'+(g?rp(g.tahunan)+bintang:'Buka alternatif ini lalu tekan Hitung Program')+'</b></td></tr>'+
        '<tr><td>Lama bayar</td><td><b>'+(g?g.lamaBayar+' tahun':'\u2014')+'</b></td></tr>'+
        '<tr><td>Total sampai masa bayar selesai</td><td><b>'+(g?rp(g.total):'\u2014')+'</b></td></tr>'+
        '</tbody></table>'+
        '<div class="banding-premi"><span>Premi per '+
        ((g&&g.metode==='Bulanan')?'bulan':'tahun')+'</span>'+
        '<b>'+(g?rp(g.perSetoran)+bintang:'Belum dihitung')+'</b></div>'+
        '</div>';
    }).join('');

    const adaHealth=alts.some(function(a){const g=angkaProgram(a);return g&&g.health;});

    w.innerHTML=
      '<div class="kop"><h2>Banding Alternatif</h2>'+
      '<p>Beberapa jalan menuju perlindungan yang sama, disandingkan supaya '+
      'mudah dipilih.</p>'+
      '<div class="identitas">'+
      '<div>Nama nasabah<b>'+esc(nama)+'</b></div>'+
      '<div>Usia<b>'+(usiaNasabah!=null?usiaNasabah+' tahun':'\u2014')+'</b></div>'+
      '<div>Jenis kelamin<b>'+esc((sg&&sg.jk)||'\u2014')+'</b></div>'+
      '<div>Tanggal lahir<b>'+esc(tglTampil)+'</b></div>'+
      '</div></div>'+

      '<div class="banding-gulir"><div class="banding-baris">'+kolom+'</div></div>'+

      '<p class="catatan" style="margin-top:10px">Centang alternatif yang ingin ikut '+
      'dicetak. Tanpa centang, semuanya ikut. Pada hasil cetak, keterangan yang nilainya '+
      'sama cukup ditulis sekali, dan yang berbeda disandingkan.</p>'+
      (adaHealth?'<p class="catatan"><b>*</b> Premi asuransi kesehatan GHP atau GHPS tidak '+
        'mengikat dan tidak ikut dihitung pada total sampai masa bayar selesai.</p>':'')+
      '<p class="catatan">Alternatif yang menutup lebih sedikit lapis bukan berarti keliru. '+
      'Sering kali itu langkah pertama yang paling masuk akal, dan sisanya menyusul '+
      'setelah kemampuannya bertambah.</p>'+

      '<div class="akt-aksi tanpa-cetak">'+
      '<button class="aksi" id="sgsBandingCetak" type="button">Cetak / simpan PDF</button>'+
      '</div>';
  }

  /* Mengembalikan usia pensiun yang benar-benar punya tarif untuk padanan
     usia masuk dan lama bayar saat ini. Bila mesin atau tabelnya belum siap,
     seluruh pilihan dikembalikan supaya layarnya tidak pernah kosong. */
  /* Inti penyaringan: usia pensiun mana yang benar-benar punya tarif untuk
     padanan tanggal lahir, lama bayar, dan target UP saat ini. Target yang
     tidak jatuh pas di daftar tingkat dipecah dulu, dan sebuah usia dianggap
     tersedia hanya bila SELURUH bagian pecahannya punya tarif. */
  /* Masa bayar Lite Future dibaca dari nama lembar tarif, bukan ditulis
     tetap. Sebelumnya hanya 3, 5, dan 10 yang ditawarkan padahal produknya
     juga punya 15 dan 20 tahun. */
  function mppLiteFutureTersedia(){
    const bawaan=[3,5,10,15,20];
    try{
      if(typeof TARIF==='undefined'||!TARIF) return bawaan;
      const set={};
      Object.keys(TARIF).forEach(function(k){
        const m=/^LF[BT] (\d+)-\d+$/.exec(k);
        if(m) set[Number(m[1])]=true;
      });
      const ada=Object.keys(set).map(Number).sort(function(a,b){return a-b;});
      return ada.length?ada:bawaan;
    }catch(_){ return bawaan; }
  }

  /* Pemecahan target yang SADAR KETERSEDIAAN.
     Prinsip final: cari kombinasi UP yang seluruh komponennya tersedia dan
     menghasilkan TOTAL PALING KECIL yang masih >= kebutuhan financial.
     Jadi sistem TIDAK sekadar membulatkan ke satu tier berikutnya.

     Contoh:
       Rp840 jt -> Rp800 jt + Rp100 jt = Rp900 jt (bila keduanya tersedia)
       Rp10,5 M -> Rp10 M + Rp500 jt = Rp10,5 M
     Bila ada beberapa kombinasi dengan total sama, pilih yang komponennya
     paling sedikit. Satu tier boleh muncul lebih dari sekali, sama seperti
     mekanisme pecah UP yang sudah dipakai sebelumnya. */
  /* Optimasi Lite Future: tier hanya dipakai sebagai basis tarif internal,
     sedangkan UP produk secara resmi tetap dapat di-input bebas. Jika target
     tepat tersedia sebagai satu tier, pertahankan tier tersebut. Jika tidak,
     cari kombinasi tier yang memenuhi target lalu pilih berdasarkan TOTAL
     PREMI TERENDAH, bukan sekadar total UP terdekat atau jumlah polis.
     Diskon 5% untuk UP >= Rp1 M sudah dihitung oleh engine per polis, sehingga
     biaya kandidat di bawah ini otomatis mempertimbangkan diskon per polis. */
  function optimasiLiteFuture(target, opts){
    opts=opts||{};
    const tierRaw=(typeof META!=='undefined'&&Array.isArray(META.tierUP))
      ? META.tierUP.slice().sort(function(a,b){return a-b;}) : [];
    const t=Number(target)||0;
    const cekRow=typeof opts.cekRow==='function'?opts.cekRow:null;
    if(!tierRaw.length||t<=0||!cekRow) return [];

    /* Dibatasi DUA polis. Tanpa batas, pencarian termurah bisa memilih lima
       polis demi menghemat 1,22% — penghematan yang tidak sepadan dengan
       lima SPAJ, lima proses underwriting, dan lima polis yang harus
       dijelaskan. Dua polis sudah menangkap sekitar 78% dari seluruh
       penghematan yang mungkin. */
    const maksPolis=Math.max(1, Number(opts.maksPolis)||2);

    const rows={};
    const tersedia=tierRaw.filter(function(u){
      if(rows[u]===undefined) rows[u]=cekRow(u)||false;
      return !!rows[u];
    });
    if(!tersedia.length) return [];

    const biaya=function(u){
      const r=rows[u];
      return Number(r && (r.total!=null?r.total:r.setoran))||0;
    };

    // Tier yang persis sama dengan kebutuhan selalu menang: tanpa pembulatan.
    if(tierRaw.indexOf(t)>=0 && rows[t]) return [t];

    let terbaik=null;
    const timbang=function(bagian){
      const up=bagian.reduce(function(a,b){return a+b;},0);
      if(up<t) return;
      const cost=bagian.reduce(function(a,u){return a+biaya(u);},0);
      /* Urutan penilaian: premi termurah lebih dulu, lalu kelebihan UP
         terkecil, lalu jumlah polis paling sedikit. */
      if(!terbaik || cost<terbaik.cost ||
         (cost===terbaik.cost && up<terbaik.up) ||
         (cost===terbaik.cost && up===terbaik.up && bagian.length<terbaik.bagian.length)){
        terbaik={cost:cost, up:up, bagian:bagian.slice()};
      }
    };

    tersedia.forEach(function(a){ timbang([a]); });
    if(maksPolis>=2){
      for(let i=0;i<tersedia.length;i++){
        for(let j=i;j<tersedia.length;j++){
          timbang([tersedia[i],tersedia[j]]);
        }
      }
    }
    return terbaik?terbaik.bagian.slice().sort(function(a,b){return b-a;}):[];
  }

  function pecahTersedia(target, cekAda){
    const basis=100000000;
    const tierRaw=(typeof META!=='undefined'&&Array.isArray(META.tierUP))
      ? META.tierUP.slice().sort(function(a,b){return a-b;}) : [];
    const t=Number(target)||0;
    if(!tierRaw.length||t<=0) return [];

    const semuaAda=function(daftar){
      return daftar.length>0 && daftar.every(function(u){ return cekAda(u); });
    };

    // Tier yang benar-benar tersedia untuk parameter saat ini.
    const tersedia=tierRaw.filter(function(u){ return cekAda(u); });
    if(!tersedia.length) return [];

    // Bila target pas satu tier yang tersedia, ini otomatis merupakan solusi optimal.
    if(tierRaw.some(function(u){return u===t;}) && cekAda(t)) return [t];

    // Seluruh tier database berbasis Rp100 jt. Ubah target menjadi jumlah
    // unit minimum yang harus dicapai; target non-tier seperti Rp840 jt berarti
    // minimal 9 unit = Rp900 jt, lalu cari kombinasi yang paling dekat.
    const targetUnit=Math.ceil(t/basis - 1e-12);
    const coins=tersedia.map(function(u){ return Math.round(u/basis); });
    const maxCoin=Math.max.apply(null,coins);

    // Solusi optimal tidak perlu melewati target lebih dari satu coin terbesar:
    // kalau melewati lebih jauh, satu coin terbesar sendiri sudah menjadi
    // kandidat yang lebih kecil (atau sama) bila tersedia.
    const maxUnit=targetUnit+maxCoin-1;
    const best=new Array(maxUnit+1).fill(null);
    best[0]={count:0,parts:[]};

    // Unbounded coin-change: satu tier boleh dipakai beberapa kali.
    for(let sum=0;sum<=maxUnit;sum++){
      if(!best[sum]) continue;
      for(let i=0;i<coins.length;i++){
        const next=sum+coins[i];
        if(next>maxUnit) continue;
        const candidate={
          count:best[sum].count+1,
          parts:best[sum].parts.concat([tersedia[i]])
        };
        const current=best[next];
        if(!current || candidate.count<current.count){
          best[next]=candidate;
        }
      }
    }

    // Pilih TOTAL TERKECIL >= target. Jika total sama, jumlah komponen lebih sedikit.
    let terbaik=null;
    for(let sum=targetUnit;sum<=maxUnit;sum++){
      const state=best[sum];
      if(!state) continue;
      const jumlah=sum*basis;
      if(!terbaik || jumlah<terbaik.jumlah ||
         (jumlah===terbaik.jumlah && state.count<terbaik.count)){
        terbaik={jumlah:jumlah,count:state.count,bagian:state.parts.slice()};
      }
      // Begitu menemukan total pertama >= target, tidak ada total yang lebih kecil.
      if(terbaik && terbaik.jumlah===jumlah) break;
    }

    if(terbaik) return terbaik.bagian.sort(function(a,b){return a-b;});

    // Fallback defensif: satu tier terkecil yang menutup target.
    const tunggal=tersedia.find(function(u){ return u>=t; });
    return tunggal?[tunggal]:[];
  }

  function saringUsiaPensiun(item, tglLahir, jkTeks){
    const semua=[55,60,65,70,75];
    try{
      const rates=(typeof TARIF!=='undefined')?TARIF:null;
      const meta=(typeof META!=='undefined')?META:null;
      if(!rates||!meta||!tglLahir||typeof hitung!=='function') return semua;

      const mpp=Number(item&&item.paymentTerm)||5;
      const target=Number(item&&item.target)||1000000000;
      const lahir=(tglLahir instanceof Date) ? tglLahir : new Date(tglLahir+'T00:00:00Z');
      const jk=String(jkTeks||'PRIA').toUpperCase()==='WANITA'?'WANITA':'PRIA';

      /* Ketersediaan diuji per usia pensiun, karena tingkat UP yang tersedia
         berbeda-beda menurut padanan masa bayar dan usia pensiunnya. */
      const adaTarif=function(up,ret){
        const pilih={},custom={};
        semua.forEach(function(a){ pilih[a]=(a===ret); custom[a]=null; });
        const rr=engineResult('LF',{nama:'x',jk:jk,tglLahir:lahir,usia:usiaProgram(tglLahir),setoran:'Tahunan',
          mpp:mpp,pensiunUP:up,statusAgen:'Reguler Agen',customUP:custom,pilih:pilih},rates,meta);
        const r=(rr&&rr.ok&&rr.result&&Array.isArray(rr.result.hasil))?rr.result.hasil.find(function(x){return Number(x.retAge)===ret;}):null;
        return !!(r && r.setoran!=null);
      };

      const boleh=semua.filter(function(ret){
        const bagian=pecahTersedia(target,function(up){ return adaTarif(up,ret); });
        return bagian.length>0;
      });
      return boleh.length?boleh:[];
    }catch(_){ return semua; }
  }

  function saringUsiaPensiunLama(item, tglLahir, jkTeks){
    const semua=[55,60,65,70,75];
    try{
      const rates=(typeof TARIF!=='undefined')?TARIF:null;
      const meta=(typeof META!=='undefined')?META:null;
      if(!rates||!meta||!tglLahir||typeof hitung!=='function') return semua;
      const mpp=Number(item&&item.paymentTerm)||5;
      const target=Number(item&&item.target)||1000000000;
      const bagian=[target];
      const lahir=(tglLahir instanceof Date) ? tglLahir : new Date(tglLahir+'T00:00:00Z');
      const jk=String(jkTeks||'PRIA').toUpperCase()==='WANITA'?'WANITA':'PRIA';
      let boleh=null;

      for(let i=0;i<bagian.length;i++){
        const pilih={},custom={};
        semua.forEach(function(a){ pilih[a]=true; custom[a]=null; });
        const rr=engineResult('LF',{
          nama:'x', jk:jk, tglLahir:lahir, usia:usiaProgram(tglLahir), setoran:'Tahunan',
          mpp:mpp, pensiunUP:bagian[i],
          statusAgen:'Reguler Agen', customUP:custom, pilih:pilih
        },rates,meta);
        const ada=(rr&&rr.ok&&rr.result&&Array.isArray(rr.result.hasil))
          ? rr.result.hasil.filter(function(x){ return x.setoran!=null; }).map(function(x){ return Number(x.retAge); })
          : [];
        boleh=(boleh===null)?ada:boleh.filter(function(a){ return ada.indexOf(a)!==-1; });
      }
      return (boleh && boleh.length) ? boleh : semua;
    }catch(_){ return semua; }
  }

  function usiaPensiunTersedia(item,profile){
    if(profile && profile.tglLahir){
      return saringUsiaPensiun(item, profile.tglLahir, profile.jk);
    }
    // Cadangan: keadaan Segitiga, lalu profil nasabah aktif.
    try{
      const s=read()||{};
      let tgl=s.tgl||'';
      let jk=s.jk||'';
      if(!tgl){
        const aktif=localStorage.getItem('insuranceHub.customerProfile.active.v1');
        const daftar=JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1')||'[]');
        const p=(daftar||[]).find(function(x){return x.id===aktif;});
        if(p){ tgl=p.tglLahir||''; jk=jk||p.jk||''; }
      }
      return saringUsiaPensiun(item, tgl, jk);
    }catch(_){ return [55,60,65,70,75]; }
  }

  /* Daftar yang ditampilkan, sekaligus penyesuaian pilihan yang tersimpan.
     Tanpa ini, nilai lama seperti 55 tetap terpakai walau sudah hilang dari
     daftar, dan perhitungannya gagal dengan pesan "tidak tersedia". */
  function usiaPensiunSiap(item,profile){
    return usiaPensiunTersedia(item,profile);
  }

  function usiaPensiunTerpilih(item,profile){
    const boleh=usiaPensiunSiap(item,profile);
    const kini=Number(item&&item.retirementAge)||0;
    if(!boleh.length) return kini||55;
    if(kini && boleh.indexOf(kini)!==-1) return kini;
    // Jatuh ke usia terdekat yang tersedia, dan disimpan supaya perhitungan ikut.
    const pilihan=boleh[0];
    if(item) item.retirementAge=pilihan;
    return pilihan;
  }

  function registerCalculationHub(){
    const entry={el:'layarSolusiHitung',judul:'Hitung Alternatif',sub:'Hitung seluruh produk dalam satu alternatif',kiri:'SOLUSI_SEGITIGA'};
    try{
      if(window.InsuranceHubNavigation && window.InsuranceHubNavigation.LAYAR)
        window.InsuranceHubNavigation.LAYAR.SOLUSI_HITUNG=entry;
      if(window.LAYAR) window.LAYAR.SOLUSI_HITUNG=entry;
      if(window.APP && window.APP.LAYAR) window.APP.LAYAR.SOLUSI_HITUNG=entry;
    }catch(_){}
  }


  function applyBridgeDefaults(k,kode,item,profile){
    // Only write fields that are unambiguous and already exist in the target calculator.
    const setVal=function(id,v){
      const n=document.getElementById(id);
      if(!n || v===undefined || v===null) return false;
      n.value=String(v);
      n.dispatchEvent(new Event('input',{bubbles:true}));
      n.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    };
    if(k==='life'||k==='ci'){
      const map={GSPA:'gUpDasar',CEM:'mUP',FLEX:'fUP',BSL:'bUP',GPRO:'qUP',CRIS:'cUP'};
      const id=map[kode];
      if(id) setVal(id,Math.round(Number(item.up)||0).toLocaleString('id-ID'));
    }
    if(k==='health'){
      // Health plan is deliberately only a starting value; the existing health UI
      // remains responsible for the actual plan/rider calculation.
      const candidates=['ghpPlan','gPlan','hPlan','gPlanGhps'];
      for(const id of candidates){
        const n=document.getElementById(id);
        if(n){
          const opts=[...n.options||[]];
          const gold=opts.find(o=>/gold standard/i.test(o.textContent||o.value||''));
          if(gold){ n.value=gold.value; n.dispatchEvent(new Event('change',{bubbles:true})); break; }
        }
      }
    }
    if(k==='pensiun'){
      try{localStorage.setItem('insuranceHub.segitiga.lfTarget.v2',String(Math.round(Number(item.target)||0)));}catch(_){}
    }
  }

  function profileForProgram(x){
    const p=x||{};
    return {nama:p.nama||'Nasabah',tglLahir:p.tglLahir||'',jk:String(p.jk||'PRIA').toUpperCase()==='WANITA'?'WANITA':'PRIA',penghasilan:Number(p.penghasilan||0)};
  }

  function usiaProgram(tgl){
    if(!tgl) return null;
    try{
      if(typeof usiaGenerali==='function') return usiaGenerali(new Date(tgl+'T00:00:00Z'));
    }catch(_){ }
    return null;
  }

  function engineResult(productId,input,rates,meta){
    if(!window.InsuranceHubEngine || !window.InsuranceHubEngine.has(productId)) return {ok:false,error:'Engine '+productId+' belum terdaftar.'};
    try{
      const r=window.InsuranceHubEngine.calculate(productId,input,{rates:rates,meta:meta});
      if(r && (r.tersedia===false || r.ok===false)) return {ok:false,error:r.alasan||r.pesan||'Perhitungan tidak tersedia.',result:r};
      return {ok:true,result:r};
    }catch(e){ return {ok:false,error:e&&e.message?e.message:'Engine gagal menghitung.'}; }
  }

  /* Lama bayar dasar Gen Aman + GHPS yang benar-benar tersedia, dibaca dari
     database, bukan daftar tetap. Kandidatnya masa bayar yang ada di tabel
     dasar GSPA sekaligus di batas usia masuk GHPS (saat ini 5/10/15 dengan
     usia maksimal 70/65/60). Tiap kandidat divalidasi dengan jalur yang sama
     dengan perhitungan: tarif dasar lewat engine GSPA, ghpsHitung (batas usia
     masuk + tarif plan terpilih), dan waiverHitung bila Waiver ON. Usia yang
     dipakai adalah usia hasil engine GSPA, sama dengan perhitungannya. */
  function gspaHealthPaymentTermsAvailable(item,profile){
    const dasar=(typeof DATA_GSPA!=='undefined'&&DATA_GSPA&&DATA_GSPA.dasar)||{};
    const batas=(typeof DATA_GHPS!=='undefined'&&DATA_GHPS&&DATA_GHPS.batasUsia)||{};
    const kandidat=Object.keys(dasar).filter(k=>Object.prototype.hasOwnProperty.call(batas,k))
      .map(Number).filter(n=>n>0).sort((a,b)=>a-b);
    const tgl=profile&&profile.tglLahir?new Date(profile.tglLahir+'T00:00:00Z'):null;
    if(!tgl) return {terms:kandidat,usia:null};
    const jk=profile.jk, up=Math.max(100000000,Number(item.up)||100000000);
    const plan=item.healthPlan||'Gold Standard', pakaiWaiver=item.pakaiWaiver===true;
    const metode=item.metode||item._programMetode||'Tahunan';
    let usia=null;
    const terms=kandidat.filter(mpp=>{
      const base=engineResult('GSPA',{nama:profile.nama,jk,tglLahir:tgl,mpp,metode,mode:'By UP',upDasar:up,premiNet:0,modeWakaf:'Non Wakaf',nilaiWakaf:0,persenWakaf:0},typeof DATA_GSPA!=='undefined'?DATA_GSPA:null);
      if(base.result && base.result.usia!=null) usia=base.result.usia;
      if(!base.ok) return false;
      if(typeof ghpsHitung!=='function' || !ghpsHitung(base.result.usia,mpp,plan).sah) return false;
      if(pakaiWaiver && (typeof waiverHitung!=='function' || !waiverHitung(base.result.usia,mpp,jk,up,base.result.diskon).sah)) return false;
      return true;
    });
    return {terms,usia};
  }
  /* Lama bayar yang tersimpan tetapi tidak lagi tersedia (mis. 15 tahun lalu
     usia menjadi 61, atau plan/Waiver berubah) tidak dipertahankan: diganti
     masa bayar tersedia yang terdekat (bila sama jauh, yang lebih pendek).
     Bila tidak ada satu pun yang tersedia, nilainya dibiarkan sehingga
     perhitungan tetap gagal dengan alasan dari engine — tanpa angka palsu. */
  function gspaHealthNormalizeTerm(item,profile){
    const av=gspaHealthPaymentTermsAvailable(item,profile);
    const cur=Number(item.paymentTerm)||5;
    if(!av.terms.length || av.terms.includes(cur)) return Object.assign({changed:false,term:cur},av);
    const next=av.terms.slice().sort((a,b)=>Math.abs(a-cur)-Math.abs(b-cur)||a-b)[0];
    item.paymentTerm=next;
    return Object.assign({changed:true,from:cur,term:next},av);
  }

  function buildProductCalculation(need,kode,item,profile){
    const usia=usiaProgram(profile.tglLahir), jk=profile.jk;
    const tgl=profile.tglLahir?new Date(profile.tglLahir+'T00:00:00Z'):null;
    const metode=item.metode||item._programMetode||'Tahunan';
    if(kode==='GSPA_HEALTH') gspaHealthNormalizeTerm(item,profile);
    const paymentTerm=Number(item.paymentTerm)||({GSPA:5,GPRO:10,CEM:10,FLEX:5,RIZQIA:10,BSL:5,CRIS:10,LF:5}[kode]||5);
    const protectionTerm=Number(item.protectionTerm)||({CEM:25,CRIS:25}[kode]||0);
    const healthConfig=(item.healthConfig && item.healthConfig.enabled) ? item.healthConfig : null;
    let r;
    if(kode==='GSPA'){
      r=engineResult('GSPA',{nama:profile.nama,jk,tglLahir:tgl,mpp:paymentTerm,metode,mode:'By UP',upDasar:Number(item.up)||0,premiNet:0,modeWakaf:'Non Wakaf',nilaiWakaf:0,persenWakaf:0},typeof DATA_GSPA!=='undefined'?DATA_GSPA:null);
      if(r.ok){
        // Waiver Gen Aman mengikuti pilihan toggle komponen.
        const useWaiver=item.pakaiWaiver===true;
        const waiver=useWaiver && typeof waiverHitung==='function'?waiverHitung(r.result.usia,paymentTerm,jk,Number(item.up)||0,r.result.diskon):{sah:true,bulanan:0,tahunan:0};
        if(useWaiver && !waiver.sah) r={ok:false,error:waiver.alasan||'Waiver tidak tersedia.',result:waiver};
        else if(healthConfig){
          const plan=healthConfig.healthPlan||'Gold Standard';
          const rider=typeof ghpsHitung==='function'?ghpsHitung(r.result.usia,paymentTerm,plan):{sah:false,alasan:'Engine GHPS existing tidak tersedia.'};
          if(!rider.sah) r={ok:false,error:rider.alasan||'GHPS tidak tersedia.',result:rider};
          else {
            // Gen Aman + GHPS has a separate embedded UP Jiwa on the Health vehicle.
            // It must be added to the Program death-benefit aggregation, while the
            // standalone Gen Aman UP remains its own coverage. Default minimum is Rp100 juta.
            const embeddedHealthUp = Number(healthConfig.up)||100000000;
            healthConfig.up = embeddedHealthUp;
            const period=(metode==='Bulanan'?r.result.bulanan:r.result.tahunan)+(metode==='Bulanan'?rider.bulanan:rider.tahunan)+(useWaiver?(metode==='Bulanan'?waiver.bulanan:waiver.tahunan):0);
            const limited=(metode==='Bulanan'?r.result.totalBulanan:r.result.totalTahunan)+(useWaiver?(metode==='Bulanan'?waiver.bulanan*12*paymentTerm:waiver.tahunan*paymentTerm):0);
            const baseResult=r.result; r={ok:true,result:{base:baseResult,rider,waiver:useWaiver?waiver:null,pakaiWaiver:useWaiver,healthLifetime:true,healthPlan:plan,healthEmbedded:true,healthEmbeddedUp:embeddedHealthUp,premiumBase:metode==='Bulanan'?baseResult.bulanan:baseResult.tahunan,premiumHealth:metode==='Bulanan'?rider.bulanan:rider.tahunan,premiumWaiver:useWaiver?(metode==='Bulanan'?waiver.bulanan:waiver.tahunan):0,perSetoran:period,premiSesuaiMetode:period,totalDibayar:limited},premium:period,totalPaid:limited,note:'Premi Health/GHPS berjalan terus selama perlindungan kesehatan aktif. Lama bayar hanya untuk premi dasar dan rider selain GHP.'};
          }
        } else if(useWaiver){
          const period=metode==='Bulanan'?r.result.bulanan+waiver.bulanan:r.result.tahunan+waiver.tahunan;
          const total=metode==='Bulanan'?r.result.totalBulanan+waiver.bulanan*12*paymentTerm:r.result.totalTahunan+waiver.tahunan*paymentTerm;
          const baseResult=r.result; r={ok:true,result:Object.assign({},baseResult,{waiver,pakaiWaiver:true}),premium:period,totalPaid:total,note:'Waiver dipilih sebagai rider opsional Gen Aman.'};
        }
      }
    }else if(kode==='GPRO'){
      if(typeof gproHitung!=='function') r={ok:false,error:'Kalkulator Gen Pro existing tidak tersedia pada halaman ini.'};
      else{
        const paket=item.paket||(''+paymentTerm+'-'+(Number(item.protectionTerm)||90));
        const upList=(typeof DATA_GPRO!=='undefined'&&Array.isArray(DATA_GPRO.up))?DATA_GPRO.up:[];
        const idx=upList.indexOf(Number(item.up)||0);
        r=idx<0?{ok:false,error:'UP Gen Pro harus salah satu nominal yang tersedia pada kalkulator produk existing.'}:{ok:false};
        if(idx>=0){
          const rr=gproHitung({paket,jk,usia,metode,indeksUP:idx,bayar:Number(paket.split('-')[0]),lindung:Number(paket.split('-')[1])});
          r=rr&&rr.sah?{ok:true,result:rr,premium:rr.premiPerSetoran,totalPaid:rr.totalDibayar}:{ok:false,error:rr?.alasan||'Gen Pro tidak tersedia untuk konfigurasi ini.',result:rr};
          if(r.ok && healthConfig){
            const gh=engineResult('GHP',{nama:profile.nama,jk:jk==='WANITA'?'Wanita':'Pria',tglLahir:tgl,skema:paket,metode,plan:healthConfig.healthPlan||'Gold Standard',pakaiRider:true,upJiwa:Number(item.up)||0},typeof DATA_GHP!=='undefined'?DATA_GHP:null);
            if(!gh.ok) r=gh;
            else { const combinedPremium=Number(r.premium||0)+Number(gh.result.premiAktif||0); r={ok:true,result:Object.assign({},r.result,{healthEmbedded:true,healthLifetime:true,health:{plan:healthConfig.healthPlan||'Gold Standard',ghp:gh.result}}),premium:combinedPremium,totalPaid:Number(r.totalPaid||0),note:'Premi Health/GHP berjalan terus selama perlindungan kesehatan aktif. Lama bayar hanya untuk premi dasar dan rider selain GHP.'}; }
          }
        }
      }
    }else if(kode==='CEM'){
      r=engineResult('NCP',{nama:profile.nama,jk,tglLahir:tgl,lamaBayar:paymentTerm,lamaLindung:protectionTerm||25,metode,up:Number(item.up)||0},typeof TARIF_CEM!=='undefined'?TARIF_CEM:null);
    }else if(kode==='CRIS'){
      r=engineResult('CRIS',{nama:profile.nama,jk,tglLahir:tgl,lamaBayar:paymentTerm,lamaLindung:protectionTerm||25,metode,up:Number(item.up)||0},typeof TARIF_CRIS!=='undefined'?TARIF_CRIS:null);
    }else if(kode==='FLEX'){
      r=engineResult('FLEX',{nama:profile.nama,tglLahir:tgl,mpp:paymentTerm,metode,up:Number(item.up)||0},typeof TARIF_FLEX!=='undefined'?TARIF_FLEX:null);
    }else if(kode==='BSL'){
      const upTotalInput=Number(item.up)||0;
      const upDasar=Math.round(upTotalInput/(item.pakaiLiteUp===false?1:5));
      r=engineResult('BSL2',{nama:profile.nama,jk,tglLahir:tgl,mpp:paymentTerm,metode,upDasar,pakaiLiteUp:item.pakaiLiteUp!==false},typeof TARIF_BSL_LENGKAP!=='undefined'?TARIF_BSL_LENGKAP:null);
      if(r.ok && healthConfig){
        const G=window.InsuranceHubGhpAturan; const plan=healthConfig.healthPlan||'Gold Standard';
        const hp=(G&&typeof G.premiBulanan==='function')?Number(G.premiBulanan(r.result.usia,plan)||0):0;
        const ht=(G&&typeof G.premiTahunan==='function')?Number(G.premiTahunan(r.result.usia,plan)||0):0;
        if(!hp) r={ok:false,error:'Tarif GHP untuk usia '+r.result.usia+' dan plan '+plan+' tidak tersedia.'};
        else { const healthPrem=metode==='Bulanan'?hp:ht; const basePrem=Number(r.result.premiSesuaiMetode||0); r={ok:true,result:Object.assign({},r.result,{healthEmbedded:true,healthLifetime:true,ghp:{plan,bulanan:hp,tahunan:ht,manfaat:(G&&typeof G.manfaatPlan==='function')?G.manfaatPlan(plan):null},healthPremium:healthPrem,healthPlan:plan}),premium:basePrem+healthPrem,totalPaid:Number(r.result.totalSesuaiMetode||0),note:'Premi Health/GHP berjalan terus selama perlindungan kesehatan aktif. Lama bayar hanya untuk premi dasar dan rider selain GHP.'}; }
      }
    }else if(kode==='RIZQIA'){
      const z=window.InsuranceHubRizqia;
      if(!z||typeof z.hitung!=='function') r={ok:false,error:'Kalkulator RIZQIA existing tidak tersedia pada halaman ini.'};
      else{
        const plan=item.rizqiaPlan||'R10', mode=metode==='Bulanan'?'bulanan':'tahunan';
        const rr=z.hitung({plan,mode,usia,up:Number(item.up)||0});
        r=rr&&rr.ok?{ok:true,result:rr,premium:rr.kontribusi,totalPaid:rr.totalKontribusi}:{ok:false,error:rr?.pesan||'RIZQIA tidak tersedia untuk konfigurasi ini.',result:rr};
      }
    }else if(kode==='GSPA_HEALTH'){
      // GSPA + GHPS; Waiver adalah rider opsional. GHP tetap berjalan selama
      // perlindungan kesehatan aktif, sedangkan mpp hanya untuk dasar/rider non-GHP.
      const up=Math.max(100000000,Number(item.up)||100000000), mpp=paymentTerm;
      const base=engineResult('GSPA',{nama:profile.nama,jk,tglLahir:tgl,mpp,metode,mode:'By UP',upDasar:up,premiNet:0,modeWakaf:'Non Wakaf',nilaiWakaf:0,persenWakaf:0},typeof DATA_GSPA!=='undefined'?DATA_GSPA:null);
      if(!base.ok) r=base;
      else{
        const plan=item.healthPlan||'Gold Standard';
        const rider=typeof ghpsHitung==='function'?ghpsHitung(base.result.usia,mpp,plan):{sah:false,alasan:'Engine GHPS existing tidak tersedia.'};
        // Waiver Gen Aman mengikuti toggle. Jika ON, premi dihitung oleh
        // waiverHitung; GHPS tetap menjadi premi kesehatan terpisah.
        const pakaiWaiver=item.pakaiWaiver===true;
        const waiver=pakaiWaiver && typeof waiverHitung==='function'
          ? waiverHitung(base.result.usia,mpp,jk,up,base.result.diskon)
          : {sah:true,bulanan:0,tahunan:0};
        if(!rider.sah) r={ok:false,error:rider.alasan||'GHPS tidak tersedia.',result:rider};
        else if(pakaiWaiver && !waiver.sah) r={ok:false,error:waiver.alasan||'Waiver tidak tersedia.',result:waiver};
        else{
          const perSetoran=(metode==='Bulanan'?base.result.bulanan:base.result.tahunan)+(metode==='Bulanan'?rider.bulanan:rider.tahunan)+(pakaiWaiver?(metode==='Bulanan'?waiver.bulanan:waiver.tahunan):0);
          // Total bayar hanya untuk komponen dengan masa bayar terbatas. GHP dikecualikan
          // karena premi kesehatan berjalan selama perlindungan aktif.
          const total=(metode==='Bulanan'?base.result.totalBulanan:base.result.totalTahunan)+(pakaiWaiver?(metode==='Bulanan'?waiver.bulanan*12*mpp:waiver.tahunan*mpp):0);
          r={ok:true,result:{base:base.result,rider,waiver:pakaiWaiver?waiver:null,pakaiWaiver,tersedia:true,perSetoran,totalDibayar:total,premiSesuaiMetode:perSetoran,healthLifetime:true,healthPlan:plan},premium:perSetoran,totalPaid:total,note:'Premi Health/GHPS berlaku terus selama perlindungan kesehatan aktif. Lama bayar yang dipilih hanya berlaku untuk premi asuransi dasar dan rider selain GHP.'};
        }
      }
    }else if(kode==='GPRO_HEALTH'){
      const rr=engineResult('GHP',{nama:profile.nama,jk:jk==='WANITA'?'Wanita':'Pria',tglLahir:tgl,skema:item.skema||'10-90',metode,plan:item.healthPlan||'Gold Standard',pakaiRider:true,upJiwa:Number(item.up)||100000000},typeof DATA_GHP!=='undefined'?DATA_GHP:null);
      if(rr.ok) r={ok:true,result:Object.assign({},rr.result,{healthLifetime:true}),premium:rr.result.premiAktif,totalPaid:rr.result.totalTahunan,note:'Premi Health/GHP berlaku seumur hidup sesuai ketentuan rider. Lama bayar yang dipilih hanya berlaku untuk premi asuransi dasar dan rider selain GHP.'}; else r=rr;
    }else if(kode==='BSL_HEALTH'){
      const G=window.InsuranceHubGhpAturan;
      const upDasar=Math.max(50000000,Number(item.up)||50000000);
      const base=engineResult('BSL2',{nama:profile.nama,jk,tglLahir:tgl,mpp:paymentTerm,metode,upDasar,pakaiLiteUp:item.pakaiLiteUp!==false},typeof TARIF_BSL_LENGKAP!=='undefined'?TARIF_BSL_LENGKAP:null);
      if(!base.ok) r=base;
      else if(!G || typeof G.premiBulanan!=='function') r={ok:false,error:'Aturan GHP existing belum tersedia.'};
      else if(typeof G.bolehPadaMpp==='function' && !G.bolehPadaMpp(usia,paymentTerm)) r={ok:false,error:'Usia '+usia+' tidak memenuhi batas masa bayar '+paymentTerm+' tahun untuk rider GHP.'};
      else{
        const tersedia=(typeof G.planTersedia==='function')?G.planTersedia(usia,true):[];
        const plan=item.healthPlan||'Gold Standard';
        if(tersedia.length && !tersedia.includes(plan)) r={ok:false,error:'Plan GHP '+plan+' tidak tersedia untuk usia '+usia+' dan konfigurasi ini.'};
        else{
          const riderBul=Number(G.premiBulanan(usia,plan)||0), riderTah=Number(G.premiTahunan(usia,plan)||0);
          if(!riderBul) r={ok:false,error:'Tarif GHP untuk usia '+usia+' dan plan '+plan+' tidak tersedia.'};
          else{
            const riderPremium=metode==='Bulanan'?riderBul:riderTah;
            const basePremium=Number(base.result.premiSesuaiMetode||0);
            r={ok:true,result:{base:base.result,ghp:{plan,bulanan:riderBul,tahunan:riderTah,manfaat:G.manfaatPlan(plan)},upDasar,upLiteUp:base.result.upLiteUp,upTotal:base.result.upTotal,premiSesuaiMetode:basePremium+riderPremium,totalDibayar:base.result.totalSesuaiMetode,namaPlan:plan,tersedia:true,healthLifetime:true},premium:basePremium+riderPremium,totalPaid:base.result.totalSesuaiMetode,note:'Premi Health/GHP berlaku seumur hidup sesuai ketentuan rider. Lama bayar yang dipilih hanya berlaku untuk premi asuransi dasar dan rider selain GHP.'};
          }
        }
      }
    }else if(kode==='LF'){
      /* Target dana pensiun memakai tier database hanya sebagai basis tarif.
         Jika target persis tersedia, gunakan langsung. Jika tidak, cari kombinasi
         tier yang memenuhi target dan pilih kombinasi dengan TOTAL PREMI TERENDAH,
         karena diskon UP >= Rp1 M berlaku per polis. Preminya tetap digabung untuk
         premi dasar, sedangkan waiver dipertahankan per polis. */
      const retAge=Number(item.retirementAge)||55;
      const targetFinancial=Number(item.targetFinancial||0)||Number(item.target)||0;
      const validated=validasiTargetLiteFuture(targetFinancial,{usiaPensiun:retAge,lamaSiapkan:paymentTerm,usia:usia});
      const targetProgram=validated.parts.length?validated.target:Number(item.target)||targetFinancial;
      item.target=targetProgram;
      item.targetFinancial=targetFinancial;
      item.targetParts=validated.parts.slice();
      const inp={nama:profile.nama,jk,tglLahir:tgl,usia:usia,setoran:metode==='Bulanan'?'Bulanan':'Tahunan',mpp:paymentTerm,pensiunUP:targetProgram,statusAgen:'Reguler Agen',customUP:{},pilih:{}};
      inp.pilih[retAge]=true;
      const targetAsli=Number(item.target)||0;
      const adaTarifLF=function(up){
        const ip=Object.assign({},inp,{pensiunUP:up,customUP:{},pilih:{}});
        [55,60,65,70,75].forEach(function(a){ ip.pilih[a]=(a===retAge); ip.customUP[a]=null; });
        const rr=engineResult('LF',ip,typeof TARIF!=='undefined'?TARIF:null,typeof META!=='undefined'?META:null);
        if(!rr.ok) return false;
        const row=rr.result.hasil.find(function(x){return Number(x.retAge)===retAge && x.setoran!=null;});
        return !!row;
      };
      const bagian=optimasiLiteFuture(targetAsli,{
        cekRow:function(up){
          const ip=Object.assign({},inp,{pensiunUP:up,customUP:{},pilih:{}});
          [55,60,65,70,75].forEach(function(a){ ip.pilih[a]=(a===retAge); ip.customUP[a]=null; });
          const rr=engineResult('LF',ip,typeof TARIF!=='undefined'?TARIF:null,typeof META!=='undefined'?META:null);
          if(!rr.ok) return null;
          return rr.result.hasil.find(function(x){return Number(x.retAge)===retAge && x.setoran!=null;})||null;
        },
        metode:metode
      });
      const perluPecah = bagian.length>0;

      if(perluPecah){
        const hasilPecah=[]; let setoranTotal=0, bayarTotal=0, upTotal=0, gagal=null;
        bagian.forEach(function(up){
          const ip=Object.assign({},inp,{pensiunUP:up,customUP:{},pilih:{}});
          [55,60,65,70,75].forEach(function(a){ ip.pilih[a]=(a===retAge); ip.customUP[a]=null; });
          const rr=engineResult('LF',ip,typeof TARIF!=='undefined'?TARIF:null,typeof META!=='undefined'?META:null);
          if(!rr.ok){ gagal=gagal||rr; return; }
          const row=rr.result.hasil.find(x=>Number(x.retAge)===retAge && x.setoran!=null);
          if(!row){ gagal=gagal||{ok:false,error:'Usia pensiun '+retAge+' tidak tersedia untuk UP '+rp(up)+'.'}; return; }
          setoranTotal+=Number(row.setoran||0);
          bayarTotal+=Number(row.total||0);
          upTotal+=Number(row.up||up);
          hasilPecah.push({up:Number(row.up||up),setoran:Number(row.setoran||0),total:Number(row.total||0),
            premiDasar:Number(row.premiDasar||0),premiWaiver:Number(row.premiWaiver||0),hasil:rr.result});
        });
        if(hasilPecah.length && !gagal){
          r={ok:true,result:Object.assign({},hasilPecah[0].hasil,{
            pecahPolis:hasilPecah, targetAsli:targetAsli, upGabungan:upTotal
          }),premium:setoranTotal,totalPaid:bayarTotal,retirementAge:retAge,
            note:'Target '+rp(targetAsli)+' dipenuhi dengan '+hasilPecah.length+' polis ('+
              hasilPecah.map(function(x){return rp(x.up);}).join(' + ')+' = '+rp(upTotal)+').'};
        }else{
          r=gagal||{ok:false,error:'Kombinasi Lite Future tidak tersedia.'};
        }
      }else{
        r=engineResult('LF',inp,typeof TARIF!=='undefined'?TARIF:null,typeof META!=='undefined'?META:null);
        if(r.ok){ const chosen=r.result.hasil.find(x=>Number(x.retAge)===retAge && x.setoran!=null); if(chosen){ r.premium=chosen.setoran; r.totalPaid=chosen.total; r.retirementAge=retAge; r.selected=chosen; } }
      }
    }else{
      r={ok:false,error:'Produk '+kode+' belum memiliki adapter Program Builder ke kalkulator existing.'};
    }
    if(!r||!r.ok) return {ok:false,need,product:kode,error:r?.error||'Gagal menghitung.',result:r?.result||null};
    const rr=r.result||{};
    const premium=Number(r.premium||rr.premiSesuaiMetode||rr.premiAktif||rr.perSetoran||rr.setoran||rr.premiTahunan||rr.kontribusi||0);
    const totalPaid=Number(r.totalPaid||rr.totalDibayar||rr.totalSesuaiMetode||rr.totalTahunan||rr.total||rr.totalKontribusi||0);
    return {ok:true,need,product:kode,productName:(produkInfo(need)?.candidates.find(x=>x.kode===kode)?.label||kode),premium,totalPaid,metode,paymentTerm,protectionTerm,result:rr,retirementAge:r.retirementAge||item.retirementAge||null,note:r.note||'',healthLifetime:!!(rr.healthLifetime||r.healthLifetime)};
  }

  function programHtml(result,alt,profile){
    const successful=result.results.filter(x=>x.ok), failed=result.results.filter(x=>!x.ok);
    const annual=successful.reduce((s,x)=>s+(x.metode==='Bulanan'?x.premium*12:x.premium),0);
    const total=successful.reduce((s,x)=>s+x.totalPaid,0);
    const rows=successful.map(x=>'<tr><td>'+esc(INFO[x.need]?.title||x.need)+'</td><td>'+esc(x.productName)+'</td><td>'+rp(x.premium)+'</td><td>'+esc(x.metode)+'</td><td>'+esc(String(x.paymentTerm)+' thn')+'</td><td>'+rp(x.totalPaid)+'</td></tr>').join('');
    const fails=failed.map(x=>'<div class="peringatan">'+esc(INFO[x.need]?.title||x.need)+': '+esc(x.error)+'</div>').join('');
    return '<div class="sgs-program-card"><div class="sgs-program-hero"><div><div class="sgs-program-eyebrow">PROGRAM FINANCIAL · '+esc(alt.name)+'</div><h3>'+esc(profile.nama)+'</h3><div class="catatan">'+esc(profile.tglLahir||'')+' · '+esc(profile.jk)+'</div></div><div class="sgs-program-totals"><div><span>Estimasi premi tahunan</span><b>'+rp(annual)+'</b></div><div><span>Total pembayaran terhitung</span><b>'+rp(total)+'</b></div></div></div><div class="blok"><h3>Polis yang disusun menjadi satu program</h3><div class="gulir"><table class="tahunan"><thead><tr><th>Kebutuhan</th><th>Produk</th><th>Premi</th><th>Metode</th><th>Masa bayar</th><th>Total bayar</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+fails+'</div></div>';
  }

  function createProgramSummary(result,alt,profile){
    const successful=result.results.filter(x=>x.ok), selected=successful.map(x=>({productKey:x.product,productName:x.productName,need:x.need,premium:x.premium,totalPaid:x.totalPaid,paymentTerm:x.paymentTerm,metode:x.metode,protectionTerm:x.protectionTerm}));
    const annual=successful.reduce((s,x)=>s+(x.metode==='Bulanan'?x.premium*12:x.premium),0), total=successful.reduce((s,x)=>s+x.totalPaid,0);
    const benefitRows=successful.map(x=>'<tr><td>'+esc(INFO[x.need]?.title||x.need)+'</td><td>'+esc(x.productName)+'</td><td>'+rp((x.result&&(x.result.upDasar||x.result.meninggal||x.result.manfaatMeninggal||x.result.upTotal||x.result.totalUP))||alt.items[x.need]?.up||alt.items[x.need]?.target||0)+'</td><td>'+rp(x.premium)+'</td></tr>').join('');
    const ring='<div class="sorotan"><div class="k">Total premi tahunan program</div><div class="v angka">'+rp(annual)+'</div><div class="t">Gabungan hasil kalkulator produk existing dari '+successful.length+' kebutuhan.</div></div><div class="ikhtisar"><div class="kartu"><div class="k">Total pembayaran terhitung</div><div class="v angka">'+rp(total)+'</div></div><div class="kartu"><div class="k">Kebutuhan berhasil</div><div class="v angka">'+successful.length+'</div></div></div>';
    sessionStorage.setItem('insuranceHub.comboGeneratedSummary',JSON.stringify({version:'segitiga-program-2',customerName:profile.nama,customerTgl:profile.tglLahir,customerAge:usiaProgram(profile.tglLahir),customerJk:profile.jk,targets:{life:alt.items.life?.up||0,ci:alt.items.ci?.up||0,retirement:alt.items.pensiun?.target||0},selected,html:{ringkasan:ring,polis:benefitRows,manfaat:benefitRows,timeline:'<tr><td colspan="4">Timeline setiap produk berasal dari kalkulator existing.</td></tr>',skenario:'',catatanSlot:'',catatanManfaat:'',catatanTimeline:catatanTimelineHtml,catatanSkenario:'',sangkalan:'Hasil menggunakan engine kalkulator produk existing; Program Builder tidak membuat formula premi baru.',kakiAgen:''}}));
  }

  const PB_KEY='insuranceHub.segitiga.programBuilder.v1';

  function loadProgramDraft(altId){
    try{
      const all=JSON.parse(localStorage.getItem(PB_KEY)||'{}');
      const d=all && all[altId] ? all[altId] : null;
      if(!d) return null;
      if(d.profileId && d.profileId!==activeProfileId()) return null;
      if(d.profileSignature && d.profileSignature!==activeProfileSignature()) return null;
      if(!d.profileId || !d.profileSignature) return null;
      return d;
    }catch(_){ return null; }
  }
  function saveProgramDraft(altId,draft){
    try{
      const all=JSON.parse(localStorage.getItem(PB_KEY)||'{}')||{};
      all[altId]=draft;
      localStorage.setItem(PB_KEY,JSON.stringify(all));
    }catch(_){ }
  }

  function cloneBuilderItems(alt){
    const keys=Object.keys(alt.items||{});
    const seen=new Set();
    return keys.map(function(k,i){
      if(seen.has(k)) return null;
      seen.add(k);
      const it=Object.assign({},alt.items[k]||{});
      const defaults={
        id:'PB-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2,6),
        need:k,
        included:true,
        metode:'Tahunan'
      };
      return Object.assign(defaults,it);
    }).filter(Boolean);
  }

  function productCandidatesForNeed(need){
    const p=produkInfo(need);
    return p ? p.candidates.slice() : [];
  }

  function optionHtml(values,current,formatter){
    return (values||[]).map(function(v){
      const value=String(v), label=formatter?formatter(v):value;
      return '<option value="'+esc(value)+'"'+(String(current)===value?' selected':'')+'>'+esc(label)+'</option>';
    }).join('');
  }

  function moneyRaw(v){ return String(Math.round(Number(v)||0)).replace(/\D/g,''); }
  function moneyDisplay(v){ const raw=moneyRaw(v); return raw ? Number(raw).toLocaleString('id-ID') : ''; }
  function moneyInput(value,field,placeholder){ return '<input class="sgs-pb-field sgs-pb-up sgs-pb-money-input" inputmode="numeric" data-field="'+esc(field||'up')+'" value="'+esc(moneyDisplay(value))+'" placeholder="'+esc(placeholder||'0')+'">'; }
  function numberInput(value,placeholder){ return moneyInput(value,'up',placeholder); }

  function embeddedHealthCodeForLife(kode){
    if(kode==='GSPA') return 'GSPA_HEALTH';
    if(kode==='GPRO') return 'GPRO_HEALTH';
    if(kode==='BSL') return 'BSL_HEALTH';
    return null;
  }
  function isEmbeddedLifeProduct(kode){ return !!embeddedHealthCodeForLife(kode); }
  function embeddedLifeMinimum(kode){
    if(kode==='GSPA_HEALTH') return 100000000;
    if(kode==='GPRO_HEALTH') return 10000000;
    if(kode==='BSL_HEALTH') return 50000000;
    return 0;
  }

  function embeddedLifeProductForHealth(kode){
    if(kode==='GSPA_HEALTH') return 'GSPA';
    if(kode==='GPRO_HEALTH') return 'GPRO';
    if(kode==='BSL_HEALTH') return 'BSL';
    return null;
  }

  // Health is a separate GHP/GPHS vehicle. It can coexist with any standalone Life product.
  // Its default UP is always the minimum allowed by the selected Health carrier; the agent may edit it.
  // This keeps the Health rider configurable without reusing the Life gap or duplicating Life coverage.
  function syncEmbeddedHealth(draft){
    const health=draft.items.find(i=>i.need==='health');
    if(!health || !health.produk || !embeddedLifeProductForHealth(health.produk)) return;
    const minUp=embeddedLifeMinimum(health.produk);
    health.linkedToLifeId=null;
    health.linkedLifeProduct=embeddedLifeProductForHealth(health.produk);
    health._lifeCoverageVehicle=true;
    health._standaloneLifeActive=!!draft.items.find(i=>i.need==='life' && i.included!==false);
    if(health._upMode!=='manual') health.up=minUp;
    if(health.produk==='GSPA_HEALTH' && health.pakaiWaiver===undefined) health.pakaiWaiver=true;
    if(health.produk==='BSL_HEALTH' && health.pakaiLiteUp===undefined) health.pakaiLiteUp=true;
    health._healthWasLinked=false;
  }

  function builderConfigHtml(item,profile){
    const need=item.need, kode=item.produk;
    const usia=usiaProgram(profile.tglLahir);
    let h='';
    if(need==='health'){
      const parent=embeddedLifeProductForHealth(kode)||item.linkedLifeProduct||'produk Life + Health';
      const standalone= item._standaloneLifeActive;
      h+='<div class="sgs-pb-note"><b>Health menggunakan '+esc(parent)+'</b>. UP pada kendaraan Health dimulai dari minimum produk dan dapat diedit terpisah dari UP Life. '+(standalone?'Life standalone juga dipilih, sehingga keduanya dihitung sebagai dua coverage yang berbeda.':'Life standalone belum dipilih; Health tetap menggunakan minimum produk sebagai default.')+'</div>';
      /* Kontrol produknya (Plan Health, UP, Lama bayar, Waiver Gen Aman,
         Cara bayar) dirakit sekali saja oleh rantai per-produk di bawah.
         Blok ini dulu ikut menggambar sebagian di antaranya, sehingga pada
         komponen Health muncul dua "Plan Health" dan dua sakelar
         "Waiver Gen Aman" — membingungkan dan tidak jelas mana yang dipakai.
         Di sini cukup keterangannya. */
      h+='<div class="sgs-pb-note">Premi GHP dibayar terus selama perlindungan kesehatan aktif. Pilihan lama bayar di Life hanya untuk premi dasar dan rider selain GHP.</div>';
    }
    if(need==='life' && !['GSPA','GPRO','CEM','FLEX','BSL','RIZQIA'].includes(kode)){
      const target=Number(item.up)||0;
      h+='<div class=\"sgs-pb-grid\">';
      h+='<div><label>UP</label>'+moneyInput(target,'up','0')+'</div>';
      h+='<div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div>';
      h+='</div>';
    }
    if(need==='ci' && kode==='CRIS'){
      const target=Number(item.up)||0;
      h+='<div class=\"sgs-pb-grid\">';
      h+='<div><label>UP</label>'+moneyInput(target,'up','0')+'</div>';
      h+='<div><label>Lama bayar</label><select class=\"sgs-pb-field\" data-field=\"paymentTerm\">'+optionHtml([3,5,10],item.paymentTerm||10,v=>v+' tahun')+'</select></div>';
      h+='<div><label>Lama perlindungan</label><select class=\"sgs-pb-field\" data-field=\"protectionTerm\">'+optionHtml([15,20,25],item.protectionTerm||25,v=>v+' tahun')+'</select></div>';
      h+='</div>';
      h+='<div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div>';
    }
    if(need==='pensiun'){
      h+='<div class="sgs-pb-grid">';
      h+='<div><label>Target dana pensiun (UP program)</label>'+moneyInput(item.target,'target','0')+
        (Number(item.targetFinancial||0)&&Number(item.target)!==Number(item.targetFinancial)?'<p class="catatan">Kebutuhan financial: '+rp(item.targetFinancial)+'. Disesuaikan menjadi UP program: <b>'+rp(item.target)+'</b>'+(Array.isArray(item.targetParts)&&item.targetParts.length?' ('+item.targetParts.map(function(v){return rp(v);}).join(' + ')+')':'')+'.</p>':'')+
        '</div>';
      /* Hanya usia pensiun yang tarifnya benar-benar ada yang ditawarkan.
         Lite Future tidak punya tarif untuk setiap padanan usia masuk dan
         lama bayar, sehingga menampilkan semuanya membuat agen sering
         menemui "tidak tersedia". Daftarnya disaring dengan mencoba
         menghitung tiap usia lebih dulu. */
      const usiaBoleh=usiaPensiunSiap(item,profile);
      h+='<div><label>Usia pensiun</label><select class="sgs-pb-field" data-field="retirementAge">'+
        optionHtml(usiaBoleh.length?usiaBoleh:[55,60,65,70,75],usiaPensiunTerpilih(item,profile),v=>v+' tahun')+
        '</select>'+
        (usiaBoleh.length?'':'<p class="catatan akt-peringatan">Tidak ada usia pensiun '+
          'yang tersedia untuk padanan target dan lama bayar ini. Kurangi lama bayar '+
          'atau ubah target dananya.</p>')+
        '</div>';
      h+='</div><div class="sgs-pb-grid">';
      h+='<div><label>Lama bayar</label><select class="sgs-pb-field" data-field="paymentTerm">'+optionHtml(mppLiteFutureTersedia(),item.paymentTerm||5,v=>v+' tahun')+'</select></div>';
      h+='<div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div>';
      h+='</div>';
    }
    if(kode==='GSPA'){
      /* Waiver dibuka kembali: tarifnya sudah dicocokkan dengan ilustrasi
         resmi Generali. Nilainya mengikuti pilihan agen pada komponen ini. */
      const waiverOn=item.pakaiWaiver===true;
      h+='<div class="sgs-pb-grid"><div><label>UP</label>'+moneyInput(Number(item.up)||100000000,'up','0')+'</div><div><label>Lama bayar</label><select class="sgs-pb-field" data-field="paymentTerm">'+optionHtml([5,10],item.paymentTerm||5,v=>v+' tahun')+'</select></div></div>';
      h+='<div class="sgs-pb-grid"><div><label>Waiver Gen Aman</label><label class="sgs-pb-switch"><input type="checkbox" data-field="pakaiWaiver"'+(waiverOn?' checked':'')+'><span class="sgs-pb-slider"></span><b class="sgs-pb-switch-text">'+(waiverOn?'ON':'OFF')+'</b></label><small class="sgs-pb-help">Membebaskan kontribusi dasar bila peserta terdiagnosa penyakit kritis sesuai ketentuan polis.</small></div><div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div></div>';
    } else if(kode==='GPRO'){
      const packs=(typeof GPRO_PAKET!=='undefined'&&Array.isArray(GPRO_PAKET))?GPRO_PAKET:[];
      const cur=packs.includes(item.paket)?item.paket:(packs[0]||'10-90');
      const ups=(typeof DATA_GPRO!=='undefined'&&Array.isArray(DATA_GPRO.up))?DATA_GPRO.up:[];
      const curUp=ups.includes(Number(item.up))?Number(item.up):(ups[0]||1000000000);
      h+='<div class="sgs-pb-grid"><div><label>Paket Gen Pro</label><select class="sgs-pb-field" data-field="paket">'+optionHtml(packs,cur,p=>typeof gproLabel==='function'?gproLabel(p):p)+'</select></div>';
      h+='<div><label>UP tersedia</label><select class="sgs-pb-field" data-field="up">'+optionHtml(ups,curUp,v=>rp(v))+'</select></div></div>';
      h+='<div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div>';
    } else if(kode==='CEM'){
      h+='<div class="sgs-pb-grid"><div><label>UP</label>'+moneyInput(Number(item.up)||100000000,'up','0')+'</div><div><label>Lama bayar</label><select class="sgs-pb-field" data-field="paymentTerm">'+optionHtml([3,5,10],item.paymentTerm||10,v=>v+' tahun')+'</select></div><div><label>Lama perlindungan</label><select class="sgs-pb-field" data-field="protectionTerm">'+optionHtml([15,20,25],item.protectionTerm||25,v=>v+' tahun')+'</select></div></div>';
      h+='<div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div>';
    } else if(kode==='FLEX'){
      h+='<div class="sgs-pb-grid"><div><label>UP</label>'+moneyInput(Number(item.up)||100000000,'up','0')+'</div><div><label>Lama bayar</label><select class="sgs-pb-field" data-field="paymentTerm">'+optionHtml([5,10],item.paymentTerm||5,v=>v+' tahun')+'</select></div><div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div></div>';
    } else if(kode==='BSL'){
      const liteUpOn=item.pakaiLiteUp!==false;
      const upGabungan=Number(item.up)||100000000;
      const upDasarPreview=liteUpOn?Math.round(upGabungan*0.20):upGabungan;
      const upLitePreview=liteUpOn?Math.round(upGabungan*0.80):0;
      h+='<div class="sgs-pb-grid"><div><label>'+(liteUpOn?'UP Gabungan':'UP Dasar')+'</label>'+moneyInput(upGabungan,'up','0')+'</div><div><label>Lama bayar</label><select class="sgs-pb-field" data-field="paymentTerm">'+optionHtml([3,5,10,15,20],item.paymentTerm||5,v=>v+' tahun')+'</select></div></div>';
      h+='<div class="sgs-pb-grid"><div><label>Rider Lite UP 400%</label><label class="sgs-pb-switch"><input type="checkbox" data-field="pakaiLiteUp"'+(liteUpOn?' checked':'')+'><span class="sgs-pb-slider"></span><b class="sgs-pb-switch-text">'+(liteUpOn?'ON':'OFF')+'</b></label><small class="sgs-pb-help">Rider opsional dan tetap dapat dipilih walaupun Health/GHP tidak diambil.</small></div><div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div></div>';
      if(liteUpOn){
        h+='<div class="sgs-pb-grid"><div><label>UP Dasar (20% dari UP Gabungan)</label><input class="sgs-pb-field sgs-pb-up sgs-pb-money-input sgs-pb-derived" data-derived="up-dasar" value="'+esc(moneyDisplay(upDasarPreview))+'" readonly></div><div><label>UP Lite UP 400% (80% dari UP Gabungan)</label><input class="sgs-pb-field sgs-pb-up sgs-pb-money-input sgs-pb-derived" data-derived="up-lite" value="'+esc(moneyDisplay(upLitePreview))+'" readonly></div></div>';
      }else{
        h+='';
      }
      h+='<div class="sgs-pb-note">'+(liteUpOn?'Saat Lite UP 400% ON, UP Gabungan dibagi otomatis: 20% menjadi UP Dasar dan 80% menjadi UP Lite UP 400%.':'Saat Lite UP 400% OFF, seluruh UP Gabungan menjadi UP Dasar.')+'</div>';
    } else if(kode==='RIZQIA'){
      h+='<div class="sgs-pb-grid"><div><label>UP</label>'+moneyInput(Number(item.up)||100000000,'up','0')+'</div><div><label>Plan</label><select class="sgs-pb-field" data-field="rizqiaPlan">'+optionHtml(['R5','R10'],item.rizqiaPlan||'R10')+'</select></div><div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div></div>';
    } else if(kode==='GSPA_HEALTH'){
      const plans=(typeof DATA_GHPS!=='undefined'&&Array.isArray(DATA_GHPS.urutan))?DATA_GHPS.urutan:['Gold Standard','Gold Deluxe','Diamond Superior','Diamond Deluxe','Platinum Deluxe','Titanium'];
      h+='<div class="sgs-pb-grid"><div><label>Plan Health</label><select class="sgs-pb-field" data-field="healthPlan">'+optionHtml(plans,item.healthPlan||'Gold Standard')+'</select></div><div><label>UP dasar jiwa untuk kombinasi</label>'+moneyInput(Number(item.up)||100000000,'up','0')+'</div></div>';
      const lamaBayar=gspaHealthNormalizeTerm(item,profile);
      h+='<div class="sgs-pb-grid"><div><label>Lama bayar dasar</label><select class="sgs-pb-field" data-field="paymentTerm">'+optionHtml(lamaBayar.terms,item.paymentTerm||5,v=>v+' tahun')+'</select>'+
        (!lamaBayar.terms.length
          ? '<p class="catatan akt-peringatan">Tidak ada lama bayar Gen Aman + GHPS yang tersedia'+(lamaBayar.usia!=null?' untuk usia '+esc(String(lamaBayar.usia))+' tahun':'')+'.</p>'
          : lamaBayar.changed
            ? '<p class="catatan">Lama bayar '+esc(String(lamaBayar.from))+' tahun tidak tersedia'+(lamaBayar.usia!=null?' untuk usia '+esc(String(lamaBayar.usia))+' tahun':'')+' dengan pilihan ini; disesuaikan menjadi '+esc(String(lamaBayar.term))+' tahun.</p>'
            : '')+
        '</div><div><label>Waiver Gen Aman</label><label class="sgs-pb-switch"><input type="checkbox" data-field="pakaiWaiver"'+(item.pakaiWaiver===true?' checked':'')+'><span class="sgs-pb-slider"></span><b class="sgs-pb-switch-text">'+(item.pakaiWaiver===true?'ON':'OFF')+'</b></label><small class="sgs-pb-help">Membebaskan kontribusi dasar bila peserta terdiagnosa penyakit kritis sesuai ketentuan polis.</small></div></div>';
      h+='<div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div>';
    } else if(kode==='GPRO_HEALTH'){
      h+='<div class="sgs-pb-grid"><div><label>Plan Health</label><select class="sgs-pb-field" data-field="healthPlan">'+optionHtml(['Gold Standard','Gold Deluxe','Diamond Superior','Diamond Deluxe','Platinum Deluxe','Titanium'],item.healthPlan||'Gold Standard')+'</select></div><div><label>UP jiwa dasar</label>'+moneyInput(Number(item.up)||100000000,'up','0')+'</div></div>';
      h+='<div class="sgs-pb-grid"><div><label>Skema</label><select class="sgs-pb-field" data-field="skema">'+optionHtml(['10-90'],item.skema||'10-90')+'</select></div><div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div></div>';
    } else if(kode==='BSL_HEALTH'){
      const G=window.InsuranceHubGhpAturan;
      const plans=(G&&typeof G.planTersedia==='function'&&usia!==null)
        ? G.planTersedia(usia,true)
        : ((typeof DATA_GHPS!=='undefined'&&Array.isArray(DATA_GHPS.urutan))?DATA_GHPS.urutan:[]);
      const planCur=plans.includes(item.healthPlan)?item.healthPlan:(plans[0]||'Gold Standard');
      h+='<div class="sgs-pb-grid">'
        +'<div><label>UP dasar BeSMART Lite</label>'+moneyInput(Number(item.up)||50000000,'up','50.000.000')+'</div>'
        +'<div><label>Lama bayar</label><select class="sgs-pb-field" data-field="paymentTerm">'+optionHtml([3,5,10,15,20],item.paymentTerm||5,v=>v+' tahun')+'</select></div>'
        +'</div>';
      h+='<div class="sgs-pb-grid">'
        +'<div><label>Rider Lite UP 400%</label><label class="sgs-pb-switch"><input type="checkbox" data-field="pakaiLiteUp"'+(item.pakaiLiteUp!==false?' checked':'')+'><span class="sgs-pb-slider"></span><b class="sgs-pb-switch-text">'+(item.pakaiLiteUp!==false?'ON':'OFF')+'</b></label></div>'
        +'<div><label>Plan GHP</label><select class="sgs-pb-field" data-field="healthPlan">'+optionHtml(plans,planCur)+'</select></div>'
        +'</div>'
        +'<div class="sgs-pb-note">Lite UP adalah rider opsional. Jika aktif, tambahan UP = 400% dari UP Dasar. Jika dimatikan, hanya UP Dasar yang digunakan. Ketersediaan plan GHP mengikuti usia dan masa bayar pada aturan produk existing.</div>';
    }
    if((need==='life'||need==='ci') && kode!=='GPRO' && kode!=='CEM' && kode!=='FLEX' && kode!=='BSL' && kode!=='RIZQIA' && kode!=='GSPA' && kode!=='CRIS' && kode!=='GSPA_HEALTH' && kode!=='GPRO_HEALTH' && kode!=='BSL_HEALTH'){
      h+='<div class="sgs-pb-grid"><div><label>UP</label>'+numberInput(item.up)+'</div><div><label>Cara bayar program</label><div class="sgs-pb-fixed">Mengikuti pilihan global program</div></div></div>';
    }
    if(usia!==null) h+='<div class="sgs-pb-note">Usia masuk program: <b>'+esc(String(usia))+' tahun</b>. Nilai dan ketersediaan akhir tetap mengikuti database kalkulator produk.</div>';
    return h;
  }

  function benefitPlanSafe(plan){ try{ return (typeof DATA_GHP!=='undefined'&&DATA_GHP.plan&&DATA_GHP.plan[plan])?DATA_GHP.plan[plan]:null; }catch(_){ return null; } }
  function benefitSpecsForResult(x){
    const r=x.result||{}, out=[];
    const add=(key,label,value,kind,detail)=>{const n=Number(value||0); if(n) out.push({key,label,value:n,kind:kind||'benefit',detail:detail||''}); else if(detail) out.push({key,label,value:0,kind:kind||'benefit',detail});};
    if(x.product==='GSPA'){
      add('death','Meninggal dunia',r.santunanNet||r.mdBiasa||x.up,'death');
      if(r.pakaiWaiver) add('waiver','Waiver Gen Aman',0,'rider','Waiver aktif sebagai rider opsional pada Gen Aman: kontribusi santunan dasar dapat dibebaskan bila peserta terdiagnosa salah satu dari 66 penyakit kritis sesuai ketentuan polis.');
      if(r.healthEmbedded && r.healthPlan){ const m=benefitPlanSafe(r.healthPlan); if(m) add('ghp','Manfaat Health / GHP',0,'health','Plan '+r.healthPlan+': kamar '+m.kamar+', wilayah '+m.wilayah+', limit tahunan '+rp(m.limit)+', limit booster '+rp(m.booster)+', '+m.cover+'.'); add('duration','Premi Health','', 'duration','Premi GHP dibayar terus selama perlindungan kesehatan aktif; tidak berhenti bersama masa bayar premi dasar.'); }
      add('accdeath','Tambahan manfaat meninggal akibat kecelakaan',Math.max(0,Number(r.mdKecelakaan||0)-Number(r.mdBiasa||r.santunanNet||x.up||0)),'accident');
      add('transport','Tambahan manfaat transportasi',r.tambahanTransportasi,'extra');
      add('overseas','Tambahan manfaat luar negeri',r.tambahanLuarNegeri,'extra');
      add('haji','Tambahan manfaat haji',r.tambahanHaji,'extra');
      add('maturity','Manfaat akhir masa / usia 100',r.santunanUsia100,'maturity');
      add('duration','Masa perlindungan','', 'duration','Perlindungan jiwa GSPA berjalan sampai usia 100 tahun.');
    } else if(x.product==='GPRO'){
      add('death','Meninggal dunia',r.meninggal||x.up,'death');
      add('accdeath','Tambahan manfaat meninggal transportasi',Math.max(0,Number(r.meninggalTransportasi||0)-Number(r.meninggal||x.up||0)),'accident');
      add('overseas','Tambahan manfaat meninggal luar negeri',Math.max(0,Number(r.meninggalLuarNegeri||0)-Number(r.meninggal||x.up||0)),'extra');
      if(r.healthEmbedded && r.healthPlan){ const m=benefitPlanSafe(r.healthPlan); if(m) add('ghp','Manfaat Health / GHP',0,'health','Plan '+r.healthPlan+': kamar '+m.kamar+', wilayah '+m.wilayah+', limit tahunan '+rp(m.limit)+', limit booster '+rp(m.booster)+', '+m.cover+'.'); add('duration','Premi Health','', 'duration','Premi GHP dibayar terus selama perlindungan kesehatan aktif; tidak berhenti bersama masa bayar premi dasar.'); }
      add('duration','Masa perlindungan','', 'duration','Gen Pro berjalan sesuai kombinasi masa bayar dan masa perlindungan yang dipilih.');
    } else if(x.product==='CEM'){
      add('death','Meninggal dunia',r.meninggal||x.up,'death');
      add('accdeath','Meninggal dunia akibat kecelakaan',Math.max(0,Number(r.meninggalKecelakaan||0)-Number(r.meninggal||x.up||0)),'accident');
      add('maturity','Manfaat akhir kontrak',r.akhirKontrak,'maturity');
      add('duration','Masa perlindungan','', 'duration','NCP berlaku selama '+x.protectionTerm+' tahun sesuai konfigurasi yang dihitung.');
    } else if(x.product==='CRIS'){
      add('death','Manfaat meninggal dunia',r.manfaatMeninggal,'death');
      add('ci','Critical Illness',r.totalKritis,'critical');
      add('angio','Angioplasty',r.angioplasty,'critical');
      add('maturity','Manfaat akhir kontrak',r.akhirKontrak,'maturity');
      add('duration','Masa perlindungan','', 'duration','Cristal Prime berlaku selama '+x.protectionTerm+' tahun sesuai konfigurasi yang dihitung.');
    } else if(x.product==='FLEX'){
      add('death','Meninggal dunia',r.mdBiasa||x.up,'death');
      add('accdeath','Tambahan manfaat meninggal akibat kecelakaan',r.extraAccidentFlex,'accident');
      add('bonus75','Pencairan usia 75 tahun \u2014 50% UP Dasar awal',r.bonus75,'milestone');
      add('maturity','Manfaat akhir masa asuransi usia 99 tahun \u2014 sisa 150% UP Dasar',
        Number(r.akhirMasa||r.akhirKontrak||0),'maturity');
      add('duration','Masa perlindungan','', 'duration','iFLEXYGUARD berjalan sampai usia 99 tahun sesuai ketentuan produk.');
    } else if(x.product==='BSL'){
      add('death','Meninggal dunia',r.mdBiasa||x.up,'death');
      if(r.healthEmbedded && r.healthPlan){ const m=benefitPlanSafe(r.healthPlan); if(m) add('ghp','Manfaat Health / GHP',0,'health','Plan '+r.healthPlan+': kamar '+m.kamar+', wilayah '+m.wilayah+', limit tahunan '+rp(m.limit)+', limit booster '+rp(m.booster)+', '+m.cover+'.'); add('duration','Premi Health','', 'duration','Premi GHP dibayar terus selama perlindungan kesehatan aktif; tidak berhenti bersama masa bayar premi dasar.'); }
      add('maturity','Manfaat akhir masa asuransi usia 100 tahun',r.akhirKontrak,'maturity');
      add('duration','Masa perlindungan','', 'duration','BeSMART Lite berjalan sampai usia 100 tahun sesuai konfigurasi yang dihitung.');
    } else if(x.product==='GSPA_HEALTH'){
      add('death','Meninggal dunia',r.base?.santunanNet||r.base?.upDasar||x.up,'death');
      // UP jiwa yang melekat pada GHPS adalah bagian dari keluarga Gen Aman.
      // Karena itu manfaat akhirnya juga mengikuti booster Gen Aman yang sama.
      const baseGspa=Number(r.base?.upDasar||x.up||0);
      const embeddedUp=Number(r.healthEmbeddedUp||0);
      const finalGspa=Number(r.base?.santunanUsia100||0);
      /* GHPS adalah rider kesehatan. UP jiwa embedded GHPS bukan manfaat
         maturity/survival: bila peserta tetap hidup sampai akhir kontrak,
         yang dicairkan hanya manfaat akhir Gen Aman dasar. UP embedded GHPS
         hanya relevan untuk manfaat jiwa sesuai ketentuan rider. */
      add('maturity','Manfaat akhir masa / usia 100',finalGspa,'maturity');
      const m=benefitPlanSafe(r.healthPlan||r.rider?.plan);
      if(m) add('ghp','Manfaat Health / GHP',0,'health','Plan '+(r.healthPlan||r.rider?.plan)+': kamar '+m.kamar+', wilayah '+m.wilayah+', limit tahunan '+rp(m.limit)+', limit booster '+rp(m.booster)+', '+m.cover+'.');
      if(r.pakaiWaiver) add('waiver','Waiver Gen Aman',0,'rider','Waiver aktif sebagai rider opsional pada Gen Aman: kontribusi santunan dasar dapat dibebaskan bila peserta terdiagnosa salah satu dari 66 penyakit kritis sesuai ketentuan polis. Besaran kontribusi waiver mengikuti UP Dasar, masa bayar, usia, jenis kelamin, dan ketentuan diskon/tarif yang berlaku.');
      add('duration','Masa perlindungan kesehatan','', 'duration','Premi Health/GHPS dibayar terus selama perlindungan kesehatan aktif dan tidak berhenti bersama masa bayar premi dasar.');
    } else if(x.product==='GPRO_HEALTH'){
      add('death','Meninggal dunia',r.upJiwa||x.up,'death');
      const m=r.manfaat||benefitPlanSafe(r.plan);
      if(m) add('ghp','Manfaat Health / GHP',0,'health','Plan '+(r.plan||'GHP')+': kamar '+m.kamar+', wilayah '+m.wilayah+', limit tahunan '+rp(m.limit)+', limit booster '+rp(m.booster)+', '+m.cover+'.');
      add('duration','Masa perlindungan kesehatan','', 'duration','Premi Health/GHP dibayar terus selama perlindungan kesehatan aktif dan tidak berhenti bersama masa bayar premi dasar.');
    } else if(x.product==='BSL_HEALTH'){
      add('death','Meninggal dunia',r.upTotal||r.upDasar||x.up,'death');
      const m=benefitPlanSafe(r.ghp?.plan);
      if(m) add('ghp','Manfaat Health / GHP',0,'health','Plan '+r.ghp.plan+': kamar '+m.kamar+', wilayah '+m.wilayah+', limit tahunan '+rp(m.limit)+', limit booster '+rp(m.booster)+', '+m.cover+'.');
      /* BeSMART Lite 100 + GHP: GHP adalah perlindungan kesehatan dan tidak
         menjadi manfaat hidup. Jika peserta tetap hidup sampai usia 100,
         manfaat hidup mengikuti manfaat hidup BeSMART Lite 100 yang DIPILIH
         dan DIBELI. Karena Lite UP 400% adalah rider yang menambah UP dan
         engine BSL2 sudah menghitung upTotal = UP Dasar + Lite UP 400%, maka
         keduanya ikut dicairkan pada manfaat hidup. Yang tidak ikut adalah GHP. */
      const maturityUp=Number(r.upTotal||r.base?.upTotal||r.upDasar||r.base?.upDasar||x.up||0);
      add('maturity','Manfaat akhir masa asuransi usia 100 tahun',maturityUp,'maturity');
      add('duration','Masa perlindungan kesehatan','', 'duration','Premi Health/GHP dibayar terus selama perlindungan kesehatan aktif dan tidak berhenti bersama masa bayar premi dasar.');
    } else if(x.product==='LF'){
      const sel=x.retirementAge||r.hasil?.find(h=>h.setoran!=null)?.retAge, row=r.hasil?.find(h=>h.retAge===sel && h.setoran!=null);
      if(row){ add('retirement','Target dana pensiun',row.up||x.target,'retirement','Target pada usia pensiun '+sel+' tahun.'); add('duration','Masa persiapan pensiun','', 'duration','Program Lite Future diarahkan ke target dana pada usia pensiun '+sel+' tahun.'); }
    }
    return out;
  }
  function mergeBenefits(results){
    const groups={}, durations=[];
    results.filter(x=>x.ok).forEach(x=>benefitSpecsForResult(x).forEach(b=>{
      if(b.kind==='duration'){ if(b.detail) durations.push(b.detail); return; }
      if(!groups[b.key]) groups[b.key]={label:b.label,total:0,items:[],details:[]};
      if(b.value){ groups[b.key].total+=b.value; groups[b.key].items.push({product:x.productName,value:b.value}); }
      if(b.detail) groups[b.key].details.push(b.detail);
    }));
    return {groups:Object.values(groups).filter(g=>g.total>0 || g.details.length),durations:[...new Set(durations)]};
  }

  /* Rincian premi per komponen.

     Angka "Premi / setoran" pada kartu adalah gabungan beberapa hal sekaligus —
     kontribusi dasar, premi waiver, dan premi kesehatan GHPS. Tanpa rincian,
     agen tidak bisa menjawab pertanyaan paling umum saat presentasi:
     "setelah masa bayar selesai, bayarnya tinggal berapa?"

     Bagian ini memecahnya, dan menandai bahwa premi GHPS TIDAK berhenti
     bersama masa bayar premi dasar. */
  function rincianPremiKomponen(result, item){
    try{
      if(!result || !result.ok) return '';
      const hasil = result.result || {};
      const dasar = Number(hasil.premiumBase) || 0;
      const waiver = Number(hasil.premiumWaiver) || 0;
      const health = Number(hasil.premiumHealth) || 0;
      if(!dasar && !waiver && !health) return '';
      const metode = (item && item.metode) || result.metode || 'Tahunan';
      const satuan = metode === 'Bulanan' ? 'bulan' : 'tahun';
      const mpp = Number(item && item.paymentTerm) || Number(result.paymentTerm) || 0;

      let baris = '';
      /* Label menyebut produknya secara eksplisit. Pada komponen Health,
         premi GHPS biasanya JAUH LEBIH BESAR daripada kontribusi dasar Gen
         Aman — UP jiwanya hanya minimum produk (umumnya Rp100 juta),
         sedangkan premi kesehatan mengikuti plan dan usia. Tanpa label yang
         jelas, urutan angkanya mudah tertukar saat dibaca. */
      /* UP jiwa pada komponen Health tersimpan di healthEmbeddedUp, bukan di
         item.up — item.up adalah UP kebutuhan, bukan UP kendaraan Gen Aman. */
      const upJiwa = Number((result.result && result.result.healthEmbeddedUp))
        || Number(item && item.up) || 0;
      const upTeks = upJiwa ? ' \u2014 UP ' + rp(upJiwa) : '';
      if(dasar) baris += '<tr><td>Kontribusi dasar Gen Aman'+upTeks+'</td>'
        + '<td class="kanan angka">'+rp(dasar)+' /'+satuan+'</td>'
        + '<td class="kanan">'+(mpp?mpp+' tahun':'\u2014')+'</td></tr>';
      if(waiver) baris += '<tr><td>Rider Waiver Gen Aman</td><td class="kanan angka">'+rp(waiver)+' /'+satuan+'</td>'
        + '<td class="kanan">'+(mpp?mpp+' tahun':'\u2014')+'</td></tr>';
      if(health) baris += '<tr><td>Premi kesehatan GHPS'
        + ((result.result && result.result.healthPlan) ? ' \u2014 ' + esc(result.result.healthPlan) : '')
        + '</td><td class="kanan angka">'+rp(health)+' /'+satuan+'</td>'
        + '<td class="kanan">selama perlindungan aktif</td></tr>';

      const sesudah = health;   // hanya GHPS yang berjalan terus
      const catatanSesudah = (health && mpp)
        ? '<tr class="tandai"><td>Sesudah tahun ke-'+mpp+'</td>'
          + '<td class="kanan angka">'+rp(sesudah)+' /'+satuan+'</td>'
          + '<td class="kanan">premi kesehatan saja</td></tr>'
        : '';

      return '<div class="sgs-pb-note" style="margin-top:8px">'
        + '<b>Rincian premi</b>'
        + '<div class="gulir"><table class="tahunan"><thead><tr>'
        + '<th>Komponen</th><th class="kanan">Premi</th><th class="kanan">Dibayar selama</th>'
        + '</tr></thead><tbody>'
        + baris
        + '<tr class="tandai"><td><b>Total '+(mpp?'tahun 1\u2013'+mpp:'per '+satuan)+'</b></td>'
        + '<td class="kanan angka"><b>'+rp(dasar+waiver+health)+' /'+satuan+'</b></td>'
        + '<td class="kanan">\u2014</td></tr>'
        + catatanSesudah
        + '</tbody></table></div>'
        + (health ? '<span class="catatan">Premi kesehatan GHPS tidak berhenti bersama masa bayar '
            + 'kontribusi dasar. Ia terus dibayar selama perlindungan kesehatan masih aktif, dan '
            + 'besarannya menyesuaikan usia tertanggung tiap tahun.</span>' : '')
        + '</div>';
    }catch(_){ return ''; }
  }
  function benefitTextForResult(x){
    return benefitSpecsForResult(x).filter(b=>b.value>0 || b.detail).map(b=>b.value?b.label+': '+rp(b.value):b.detail).join(' · ');
  }

  // ================================================================
  // Program Financial Aggregator — data-driven, product-agnostic
  // ================================================================
  function normalizeProgramResult(x){
    const r=x.result||{}, comps=[], benefits=[], age=Number(x.age||r.usia||r.base?.usia||r.result?.usia||0)||0;
    const term=Number(x.paymentTerm||0)||({GSPA:5,GPRO:10,CEM:10,FLEX:5,RIZQIA:10,BSL:5,CRIS:10,LF:5,GSPA_HEALTH:5,GPRO_HEALTH:10,BSL_HEALTH:5}[x.product]||5);
    // Normalisasi tampilan Ringkasan dari angka per-setoran hasil kalkulator.
    // Jika bayar bulanan, "per tahun" adalah ekuivalen 12 bulan. Jika bayar
    // tahunan, angka tahunan mengikuti premi tahunan produk (Gen Aman = 11 x
    // premi bulanan). Jangan memakai satu konversi untuk kedua mode.
    const annualOf=(perPayment,annual)=> x.metode==='Bulanan'
      ? Number(perPayment||0)*12
      : Number(annual!=null?annual:Number(perPayment||0));
    const addFinite=(id,label,amount,term,meta={})=>{
      const n=Number(amount||0); if(n<=0)return;
      comps.push({id,name:label,amountPerPayment:n,annual:annualOf(n,meta.amountPerYear),paymentTerm:Number(term)||0,recurring:false,
        waiverEligible:meta.waiverEligible!==false,premiumIncluded:meta.premiumIncluded===true,
        sourceProduct:x.product,need:x.need,sourceField:meta.sourceField||label,displayNote:meta.displayNote||''});
    };
    const addRecurring=(id,label,amount,meta={})=>{
      const n=Number(amount||0); if(n<=0)return;
      comps.push({id,name:label,amountPerPayment:n,annual:annualOf(n,meta.amountPerYear),paymentTerm:null,recurring:true,
        waiverEligible:false,premiumIncluded:meta.premiumIncluded===true,
        sourceProduct:x.product,need:x.need,sourceField:meta.sourceField||label});
    };
    const addBenefit=(id,label,amount,meta={})=>{
      const n=Number(amount||0);
      if(n<=0 && !meta.description)return;
      benefits.push({
        id,key:id,label,amount:n,
        category:meta.category||'other',event:meta.event||id,
        activeFromAge:meta.fromAge!=null?Number(meta.fromAge):age,
        activeUntilAge:meta.untilAge!=null?Number(meta.untilAge):null,
        eventAge:meta.eventAge!=null?Number(meta.eventAge):null,
        conditional:meta.conditional===true,
        additive:meta.additive!==false,
        aggregateGroup:meta.aggregateGroup||meta.category||id,
        sourceProduct:x.productName,sourceProductKey:x.product,sourceFamily:meta.sourceFamily||null,
        description:meta.description||'',
        includedInBase:meta.includedInBase===true,
        // Preserve the product's own age/period benefit schedule. The summary
        // engine must never recalculate escalation rules itself.
        amountSchedule:Array.isArray(meta.amountSchedule)?meta.amountSchedule:null,
        baseAmount:meta.baseAmount!=null?Number(meta.baseAmount):null,
        escalationGroup:meta.escalationGroup||null,
        escalationRole:meta.escalationRole||null
      });
    };
    const healthPlan=(plan)=>{
      try{return benefitPlanSafe(plan);}catch(_){return null;}
    };
    const endAge=(fallback)=>age+(Number(x.protectionTerm)||fallback||0)-1;

    if(x.product==='GSPA'){
      /* IMPORTANT: kontribusiDasarBulanan adalah tarif dasar SEBELUM diskon.
         Jangan pakai field itu sebagai premi program. Premi yang tampil di
         kalkulator adalah r.bulanan / r.tahunan setelah diskon. Ini adalah
         penyebab Ringkasan sebelumnya menampilkan Gen Aman lebih tinggi
         (mis. 116.080.800) daripada halaman Hitung (75.452.520). */
      const baseMonth = Number(r.bulanan!=null ? r.bulanan : (x.metode==='Bulanan'?x.premium:Number(x.premium||0)/11));
      const baseYear  = Number(r.tahunan!=null ? r.tahunan : (x.metode==='Tahunan'?x.premium:Number(x.premium||0)*12));
      const w=r.waiver;
      addFinite('gspa-base','Premi dasar Gen Aman',x.metode==='Bulanan'?baseMonth:baseYear,term,{amountPerYear:baseYear,waiverEligible:true,sourceField:'premiKalkulatorAfterDiscount'});
      if(r.pakaiWaiver && w) addFinite('gspa-waiver','Premi Waiver Gen Aman',x.metode==='Bulanan'?w.bulanan:w.tahunan,term,{amountPerYear:w.tahunan,waiverEligible:false,sourceField:'waiver',premiumIncluded:false});
      const hp=r.premiumHealth || r.healthPremium;
      const hpYear=r.premiumHealthTahunan || (x.metode==='Tahunan'?hp:(Number(hp||0)*12));
      if(Number(hp||0)>0) addRecurring('gspa-ghp','Premi GHP/GHPS',hp,{amountPerYear:hpYear,sourceField:'premiumHealth'});
      const gBase=Number(r.santunanNet||r.mdBiasa||x.up||0); const gTimeline=Array.isArray(r.timeline)?r.timeline:[]; const gSched=gTimeline.length?gTimeline.map(b=>({fromAge:Number(b.usia),toAge:Number(b.usia),amount:Number(b.santunan||0)+Number(b.booster||0)})):[]; addBenefit('life-death','Perlindungan meninggal dunia',gBase,{category:'life',event:'death',aggregateGroup:'death_base',sourceFamily:'GSPA',untilAge:100,description:'Manfaat meninggal dunia mengikuti hasil kalkulator Gen Aman, termasuk kenaikan UP Dasar 7,5% setiap 5 tahun sesuai ketentuan produk.',amountSchedule:gSched,baseAmount:gBase,escalationGroup:'GSPA',escalationRole:'primary'});
      if(Number(r.healthEmbeddedUp||0)>0) { const hu=Number(r.healthEmbeddedUp); addBenefit('gspa-ghps-life','UP Jiwa dari GHPS',hu,{category:'life',event:'death',aggregateGroup:'death_base',sourceFamily:'GSPA',untilAge:100,description:'UP jiwa yang melekat pada kendaraan Health/GHPS Gen Aman; menjadi bagian dari UP Gen Aman dan mengikuti kenaikan UP Gen Aman sesuai hasil kalkulator existing.',baseAmount:hu,escalationGroup:'GSPA',escalationRole:'component'}); }
      const tr=Math.max(0,Number(r.tambahanTransportasi||0)); if(tr) addBenefit('death-transport-extra','Tambahan meninggal akibat kecelakaan transportasi umum',tr,{category:'life_conditional',event:'public_transport_death',aggregateGroup:'public_transport',untilAge:100,conditional:true});
      const ov=Math.max(0,Number(r.tambahanLuarNegeri||0)); if(ov) addBenefit('death-overseas-extra','Tambahan meninggal di luar negeri',ov,{category:'life_conditional',event:'overseas_death',aggregateGroup:'overseas',untilAge:100,conditional:true});
      const hj=Math.max(0,Number(r.tambahanHaji||0)); if(hj) addBenefit('death-haji-extra','Tambahan meninggal saat haji / umrah',hj,{category:'life_conditional',event:'hajj_death',aggregateGroup:'hajj',untilAge:100,conditional:true});
      /* Nilai usia 100 dicatat SEKALI saja, sebagai maturity di bawah. Dulu
         juga dicatat sebagai milestone; sejak pencairan bertahap ikut masuk
         daftar pencairan, pencatatan ganda akan membuat Gen Aman muncul dua
         kali dengan angka yang sama. */
      /* Gen Aman membayarkan seluruh santunan beserta kenaikan 7,5% yang sudah
         terbentuk bila tertanggung HIDUP sampai usia 100. Setelah cair, polisnya
         berakhir — dicatat sebagai maturity supaya tabel manfaat menurut usia
         ikut menurunkannya. */
      if(Number(r.santunanUsia100||0)>0){
        addBenefit('gspa-maturity','Manfaat akhir Gen Aman \u2014 hidup sampai usia 100',
          Number(r.santunanUsia100),
          {category:'maturity',event:'maturity',aggregateGroup:'maturity',eventAge:100});
      }
      if(r.pakaiWaiver) addBenefit('waiver','Waiver pembebasan premi',0,{category:'rider',event:'waiver',aggregateGroup:'waiver',untilAge:term?age+term-1:null,description:'Jika kondisi yang dipersyaratkan Waiver terjadi selama masih ada premi yang eligible, premi yang memenuhi ketentuan untuk sisa masa bayar dapat dibebaskan. Premi GHP/GHPS tidak termasuk pembebasan.'});
      /* GHPS tidak membayar manfaat hidup/akhir kontrak. Jadi untuk
         Gen Aman + GHPS, maturity hanya memakai santunan akhir Gen Aman
         dasar dari kalkulator GSPA. UP jiwa embedded GHPS tetap hanya untuk
         manfaat jiwa yang memenuhi ketentuan, bukan dicairkan karena sehat. */
      if(Number(r.base?.santunanUsia100||0)>0){
        addBenefit('gspa-health-maturity','Manfaat akhir Gen Aman — hidup sampai usia 100',
          Number(r.base.santunanUsia100),
          {category:'maturity',event:'maturity',aggregateGroup:'maturity',eventAge:100,
           description:'Jika tetap hidup sampai usia 100, yang dicairkan adalah manfaat akhir Gen Aman dasar sesuai hasil kalkulator. UP jiwa embedded GHPS tidak termasuk manfaat akhir kontrak.'});
      }
      if(r.healthEmbedded && r.healthPlan){
        const m=healthPlan(r.healthPlan);
        addBenefit('health','Perlindungan kesehatan GHP/GHPS',0,{category:'health',event:'health',aggregateGroup:'health_plan',description:m?('Plan '+r.healthPlan+': wilayah '+m.wilayah+'; kamar '+m.kamar+'; limit tahunan '+rp(m.limit)+'; limit booster '+rp(m.booster)+'; '+m.cover+'.'):('Plan '+r.healthPlan+' sesuai ketentuan produk.')});
      }
    } else if(x.product==='GPRO'){
      const bp = r.premiPerSetoran||r.premiSesuaiMetode||x.premium;
      addFinite('gpro-base','Premi dasar Gen Pro',bp,term,{sourceField:'premiPerSetoran',waiverEligible:true});
      addBenefit('life-death','Perlindungan meninggal dunia',r.meninggal||x.up,{category:'life',event:'death',aggregateGroup:'death_base',untilAge:endAge(90)});
      const tr=Math.max(0,Number(r.meninggalTransportasi||0)-Number(r.meninggal||x.up||0)); if(tr) addBenefit('death-transport-extra','Tambahan meninggal akibat kecelakaan transportasi umum',tr,{category:'life_conditional',event:'public_transport_death',aggregateGroup:'public_transport',untilAge:endAge(90),conditional:true});
      const ov=Math.max(0,Number(r.meninggalLuarNegeri||0)-Number(r.meninggal||x.up||0)); if(ov) addBenefit('death-overseas-extra','Tambahan meninggal di luar Indonesia',ov,{category:'life_conditional',event:'overseas_death',aggregateGroup:'overseas',untilAge:endAge(90),conditional:true});
      if(r.healthEmbedded && r.health?.ghp){
        addRecurring('gpro-ghp','Premi GHP',r.health.ghp.premiAktif,{amountPerYear:r.health.ghp.premiTahunan,sourceField:'health.ghp.premiAktif'});
        const m=healthPlan(r.health.plan||r.health.ghp.plan);
        addBenefit('health','Perlindungan kesehatan GHP',0,{category:'health',event:'health',aggregateGroup:'health_plan',description:m?('Plan '+(r.health.plan||r.health.ghp.plan)+': wilayah '+m.wilayah+'; kamar '+m.kamar+'; limit tahunan '+rp(m.limit)+'; limit booster '+rp(m.booster)+'; '+m.cover+'.'):'Mengikuti manfaat GHP pada kalkulator existing.'});
      }
    } else if(x.product==='CEM'){
      addFinite('cem-base','Premi New Cemerlang Prime',x.premium,term,{sourceField:'premium'});
      addBenefit('life-death','Perlindungan meninggal dunia',r.meninggal||x.up,{category:'life',event:'death',aggregateGroup:'death_base',untilAge:endAge(25)});
      const a=Math.max(0,Number(r.meninggalKecelakaan||0)-Number(r.meninggal||x.up||0)); if(a) addBenefit('death-accident-extra','Tambahan meninggal akibat kecelakaan',a,{category:'life_conditional',event:'accident_death',aggregateGroup:'accident',untilAge:endAge(25),conditional:true});
      addBenefit('cem-maturity','Manfaat akhir kontrak',r.akhirKontrak,{category:'maturity',event:'maturity',aggregateGroup:'maturity',eventAge:endAge(25),description:'Dibayarkan pada akhir masa perlindungan sesuai hasil kalkulator.'});
    } else if(x.product==='CRIS'){
      addFinite('cris-base','Premi Cristal Prime',x.premium,term,{sourceField:'premium'});
      const end=endAge(25);
      addBenefit('ci-base','Critical Illness',r.totalKritis,{category:'critical_illness',event:'critical_illness',aggregateGroup:'ci',untilAge:end});
      addBenefit('ci-angio','Angioplasty',r.angioplasty,{category:'critical_illness',event:'angioplasty',aggregateGroup:'angioplasty',untilAge:end,conditional:true});
      // Death benefit is a genuine life-event benefit and must contribute to the
      // aggregated death amount, but must never be added together with maturity.
      addBenefit('cris-death','Manfaat meninggal dunia',r.manfaatMeninggal,{category:'life_conditional',event:'death',aggregateGroup:'death_base',untilAge:end,conditional:true,description:'Jika meninggal sebelum akhir kontrak, manfaat meninggal mengikuti hasil kalkulator Cristal Prime.'});
      addBenefit('cris-maturity','Manfaat akhir kontrak',r.akhirKontrak,{category:'maturity',event:'maturity',aggregateGroup:'maturity',eventAge:end,description:'Jika tetap hidup sampai akhir kontrak, manfaat akhir kontrak mengikuti hasil kalkulator.'});
    } else if(x.product==='FLEX'){
      addFinite('flex-base','Premi iFLEXYGUARD',x.premium,term,{sourceField:'premium'});
      const flexBase=Number(r.mdBiasa||x.up||0); const flexRows=Array.isArray(r.ilustrasi)?r.ilustrasi:[]; const flexSched=flexRows.length?flexRows.map(b=>({fromAge:Number(b.usia),toAge:Number(b.usia),amount:Number(b.rip||0)})):[]; addBenefit('flex-death','Perlindungan meninggal dunia',flexBase,{category:'life',event:'death',aggregateGroup:'death_base',untilAge:99,amountSchedule:flexSched,baseAmount:flexBase,description:'Manfaat meninggal iFLEXYGUARD mengikuti ilustrasi existing, termasuk perubahan manfaat pada tahun ke-6 dan ke-11 serta penyesuaian yang berlaku pada usia tertentu.'});
      if(r.extraAccidentFlex) addBenefit('flex-acc','Tambahan manfaat meninggal akibat kecelakaan',r.extraAccidentFlex,{category:'life_conditional',event:'accident_death',aggregateGroup:'accident',untilAge:99,conditional:true});
      if(r.bonus75) addBenefit('flex-bonus75','Pencairan usia 75 \u2014 50% UP Dasar awal',r.bonus75,{category:'milestone',event:'age75',aggregateGroup:'age75',eventAge:75});
      /* Mesin iFLEXYGUARD menamai nilai ini akhirMasa; akhirKontrak tidak
         pernah ada sehingga manfaat akhir usia 99 selalu bernilai nol dan
         tidak pernah muncul. Nilainya 150% UP dasar, yaitu sisa setelah
         50% dicairkan sebagai bonus usia 75. */
      addBenefit('flex-maturity','Manfaat akhir masa asuransi usia 99 \u2014 sisa 150% UP Dasar',
        Number(r.akhirMasa||r.akhirKontrak||0),
        {category:'maturity',event:'maturity',aggregateGroup:'maturity',eventAge:99});
    } else if(x.product==='BSL'){
      const useLite=r.pakaiLiteUp!==false;
      addFinite('bsl-base','Premi BeSMART Lite 100 — UP Dasar',r.premiDasarBulanan!=null && x.metode==='Bulanan'?r.premiDasarBulanan:r.premiDasarTahunan!=null&&x.metode==='Tahunan'?r.premiDasarTahunan:Number(x.premium||0),term,{amountPerYear:r.premiDasarTahunan,sourceField:'premiDasar'});
      if(useLite && Number(r.premiLiteUpBulanan||r.premiLiteUpTahunan||0)>0) addFinite('bsl-liteup','Premi Lite UP 400%',x.metode==='Bulanan'?r.premiLiteUpBulanan:r.premiLiteUpTahunan,term,{amountPerYear:r.premiLiteUpTahunan,sourceField:'premiLiteUp'});
      // manfaatMeninggal/upTotal already includes Lite UP when it is ON.
      addBenefit('bsl-death','Perlindungan meninggal dunia',r.manfaatMeninggal||r.upTotal||r.upDasar||x.up,{category:'life',event:'death',aggregateGroup:'death_base',untilAge:100});
      if(useLite && Number(r.upLiteUp||0)>0) addBenefit('bsl-liteup-benefit','Lite UP 400%',r.upLiteUp,{category:'rider',event:'death_additional',aggregateGroup:'rider_liteup',untilAge:100,description:'Tambahan UP yang sudah termasuk dalam total manfaat meninggal BeSMART Lite; tidak dijumlahkan lagi sebagai UP Jiwa kedua.'});
      addBenefit('bsl-maturity','Manfaat hidup/akhir masa asuransi',r.manfaatHidup,{category:'maturity',event:'survival',aggregateGroup:'maturity',eventAge:100});
      if(r.healthEmbedded && r.healthPlan){
        const m=healthPlan(r.healthPlan);
        addRecurring('bsl-ghp','Premi GHP',r.healthPremium,{amountPerYear:x.metode==='Tahunan'?r.healthPremium:Number(r.healthPremium||0)*12,sourceField:'healthPremium'});
        addBenefit('health','Perlindungan kesehatan GHP',0,{category:'health',event:'health',aggregateGroup:'health_plan',description:m?('Plan '+r.healthPlan+': wilayah '+m.wilayah+'; kamar '+m.kamar+'; limit tahunan '+rp(m.limit)+'; limit booster '+rp(m.booster)+'; '+m.cover+'.'):'Mengikuti manfaat GHP existing.'});
      }
    } else if(x.product==='GSPA_HEALTH'){
      const base=r.base||{};
      addFinite('gspa-health-base','Premi dasar Gen Aman',x.metode==='Bulanan'?base.bulanan:base.tahunan,term,{amountPerYear:base.tahunan,sourceField:'base.bulanan/tahunan',waiverEligible:true});
      if(r.waiver) addFinite('gspa-health-waiver','Premi Waiver Gen Aman',x.metode==='Bulanan'?r.waiver.bulanan:r.waiver.tahunan,term,{amountPerYear:r.waiver.tahunan,sourceField:'waiver'});
      if(r.rider) addRecurring('gspa-health-ghps','Premi GHPS',x.metode==='Bulanan'?r.rider.bulanan:r.rider.tahunan,{amountPerYear:r.rider.tahunan,sourceField:'rider'});
      const gTimeline=Array.isArray(base.timeline)?base.timeline:[]; const gBase=Number(base.santunanNet||base.upDasar||x.up||0); const gSched=gTimeline.length?gTimeline.map(b=>({fromAge:Number(b.usia),toAge:Number(b.usia),amount:Number(b.santunan||0)+Number(b.booster||0)})):[]; addBenefit('life-death','Perlindungan meninggal dunia',gBase,{category:'life',event:'death',aggregateGroup:'death_base',sourceFamily:'GSPA',untilAge:100,amountSchedule:gSched,baseAmount:gBase,description:'Manfaat meninggal Gen Aman mengikuti hasil kalkulator existing, termasuk kenaikan UP Dasar 7,5% setiap 5 tahun.',escalationGroup:'GSPA',escalationRole:'primary'});
      const plan=r.healthPlan||r.rider?.plan, m=healthPlan(plan);
      addBenefit('health','Perlindungan kesehatan GHPS',0,{category:'health',event:'health',aggregateGroup:'health_plan',description:m?('Plan '+plan+': wilayah '+m.wilayah+'; kamar '+m.kamar+'; limit tahunan '+rp(m.limit)+'; limit booster '+rp(m.booster)+'; '+m.cover+'.'):'Mengikuti manfaat GHPS existing.'});
      if(r.pakaiWaiver) addBenefit('waiver','Waiver pembebasan premi',0,{category:'rider',event:'waiver',aggregateGroup:'waiver',untilAge:term?age+term-1:null,description:'Jika kondisi yang dipersyaratkan Waiver terjadi selama masih ada premi eligible, premi dasar yang memenuhi ketentuan untuk sisa masa bayar dapat dibebaskan. GHPS tetap berjalan.'});
    } else if(x.product==='GPRO_HEALTH'){
      const gh=r.health?.ghp;
      const lifeAnnual=gh?.premiJiwaTahunan ?? (x.metode==='Tahunan'?Number(r.premiSesuaiMetode||0):Number(r.premiSesuaiMetode||0)*12-Number(gh?.premiSehatTahunan||0));
      const lifePay=x.metode==='Bulanan' ? Number(gh?.premiJiwaBulanan||0) : Number(lifeAnnual||0);
      addFinite('gpro-health-life','Premi dasar Gen Pro',lifePay,term,{amountPerYear:lifeAnnual,sourceField:'premiJiwaBulanan/premiJiwaTahunan',waiverEligible:true});
      if(gh) addRecurring('gpro-health-ghp','Premi GHP',gh.premiAktif,{amountPerYear:gh.premiSehatTahunan,sourceField:'premiSehatBulanan/premiSehatTahunan'});
      addBenefit('life-death','Perlindungan meninggal dunia',r.upJiwa||x.up,{category:'life',event:'death',aggregateGroup:'death_base',untilAge:endAge(90)});
      const m=healthPlan(r.plan||gh?.plan);
      addBenefit('health','Perlindungan kesehatan GHP',0,{category:'health',event:'health',aggregateGroup:'health_plan',description:m?('Plan '+(r.plan||gh?.plan)+': wilayah '+m.wilayah+'; kamar '+m.kamar+'; limit tahunan '+rp(m.limit)+'; limit booster '+rp(m.booster)+'; '+m.cover+'.'):'Mengikuti manfaat GHP existing.'});
    } else if(x.product==='BSL_HEALTH'){
      const base=r.base||{};
      addFinite('bsl-health-base','Premi dasar BeSMART Lite 100',x.metode==='Bulanan'?(base.premiDasarBulanan||base.premiBulanan):base.premiDasarTahunan||base.premiTahunan,term,{amountPerYear:base.premiDasarTahunan||base.premiTahunan,sourceField:'base.premiDasar'});
      if(Number(base.premiLiteUpBulanan||base.premiLiteUpTahunan||0)>0) addFinite('bsl-health-liteup','Premi Lite UP 400%',x.metode==='Bulanan'?base.premiLiteUpBulanan:base.premiLiteUpTahunan,term,{amountPerYear:base.premiLiteUpTahunan,sourceField:'base.premiLiteUp'});
      if(r.ghp) addRecurring('bsl-health-ghp','Premi GHP',x.metode==='Bulanan'?r.ghp.bulanan:r.ghp.tahunan,{amountPerYear:r.ghp.tahunan,sourceField:'ghp'});
      addBenefit('life-death','Perlindungan meninggal dunia',r.upTotal||r.upDasar||x.up,{category:'life',event:'death',aggregateGroup:'death_base',untilAge:100});
      if(Number(r.upLiteUp||0)>0) addBenefit('liteup','Lite UP 400%',r.upLiteUp,{category:'rider',event:'death_additional',aggregateGroup:'rider_liteup',untilAge:100,description:'Tambahan UP sudah termasuk dalam total manfaat meninggal; tidak dijumlahkan kembali ke UP Jiwa.'});
      /* Jika sehat/hidup sampai usia 100, manfaat akhir kontrak adalah UP
         dasar BeSMART Lite 100. Rider Lite UP 400% dan GHP bukan manfaat hidup. */
      addBenefit('bsl-health-maturity','Manfaat akhir BeSMART Lite 100 — hidup sampai usia 100',
        r.upDasar||base.upDasar||x.up,
        {category:'maturity',event:'maturity',aggregateGroup:'maturity',eventAge:100,
         description:'Jika tetap hidup sampai usia 100, yang dicairkan adalah UP dasar BeSMART Lite 100. Lite UP 400% dan GHP tidak termasuk manfaat akhir hidup.'});
      const plan=r.ghp?.plan, m=healthPlan(plan);
      addBenefit('health','Perlindungan kesehatan GHP',0,{category:'health',event:'health',aggregateGroup:'health_plan',description:m?('Plan '+plan+': wilayah '+m.wilayah+'; kamar '+m.kamar+'; limit tahunan '+rp(m.limit)+'; limit booster '+rp(m.booster)+'; '+m.cover+'.'):'Mengikuti manfaat GHP existing.'});
    } else if(x.product==='LF'){
      /* Bila targetnya dipecah menjadi beberapa polis, r.hasil hanya memuat
         polis PERTAMA. Membaca dari situ membuat preminya kurang, dan bila
         barisnya tidak ketemu komponennya hilang sama sekali dari rincian —
         itulah sebabnya BeSMART Lite Future tidak pernah muncul di tabel.
         Karena itu hasil pemecahan dipakai lebih dulu bila ada. */
      if(Array.isArray(r.pecahPolis) && r.pecahPolis.length){
        const setoranGabungan=r.pecahPolis.reduce(function(t,p){return t+Number(p.setoran||0);},0);
        const upGabungan=r.pecahPolis.reduce(function(t,p){return t+Number(p.up||0);},0);
        const label='Premi BeSMART Lite Future'+
          (r.pecahPolis.length>1?' ('+r.pecahPolis.length+' polis)':'');
        const dasarGabungan=r.pecahPolis.reduce(function(t,p){return t+Number(p.premiDasar||0);},0);
        /* targetAsli adalah variabel milik fungsi penghitung, tidak terjangkau
           dari sini — memanggilnya membuat seluruh proses membuka ringkasan
           berhenti dengan galat "targetAsli is not defined". Nilainya memang
           sudah ikut disimpan pada hasil, jadi dibaca dari sana.

           Kedua cabang perbandingan itu juga menghasilkan teks yang sama
           persis, sehingga perbandingannya tidak ada gunanya dan dilepas. */
        const rincianUp=r.pecahPolis.map(function(p){return rp(p.up);}).join(' + ');
        const comboText='UP '+rp(upGabungan)+
          (r.pecahPolis.length>1?' ('+rincianUp+')':'');
        addFinite('lf-base','Premi BeSMART Lite Future — Dasar',dasarGabungan,term,{
          amountPerYear:x.metode==='Bulanan'?dasarGabungan*12:dasarGabungan,
          sourceField:'pecahPolis.premiDasar',premiumIncluded:true,waiverEligible:true,displayNote:comboText});
        /* Jangan menjumlahkan premi waiver dari polis LF yang dipecah menjadi
           satu angka lalu kehilangan identitas masa bayarnya. Setiap polis
           mempertahankan nilai waiver + term miliknya sendiri. */
        r.pecahPolis.forEach(function(p,i){
          const waiver=Number(p.premiWaiver||0);
          if(waiver>0){
            addFinite('lf-waiver-premium-'+i,'Premi Waiver BeSMART Lite Future'+
              (r.pecahPolis.length>1?' — Polis '+(i+1):''),waiver,term,{
              amountPerYear:x.metode==='Bulanan'?waiver*12:waiver,
              sourceField:'pecahPolis['+i+'].premiWaiver',premiumIncluded:true,waiverEligible:false,
              displayNote:'Waiver UP '+rp(p.up)});
          }
        });
        addBenefit('lf-waiver','Waiver wajib Lite Future',0,{category:'rider',event:'waiver',
          aggregateGroup:'waiver',untilAge:term?age+term-1:null,
          description:'Waiver merupakan bagian wajib dari konfigurasi Lite Future.'});
        const selPecah=x.retirementAge||Number(r.retirementAge)||0;
        addBenefit('lf-death','Manfaat meninggal sebelum usia pensiun',upGabungan,
          {category:'life_conditional',event:'death',aggregateGroup:'death_base',
           untilAge:selPecah?selPecah-1:null,conditional:true});
        addBenefit('lf-maturity','Dana pensiun cair di usia '+(selPecah||'pensiun'),
          upGabungan,{category:'maturity',event:'maturity',aggregateGroup:'maturity',
          eventAge:selPecah||null});
      }
      const sel=x.retirementAge||r.hasil?.find(h=>h.setoran!=null)?.retAge;
      const row=(Array.isArray(r.pecahPolis)&&r.pecahPolis.length)
        ? null
        : r.hasil?.find(h=>h.retAge===sel && h.setoran!=null);
      if(row){
        const dasar=Number(row.premiDasar||0), waiver=Number(row.premiWaiver||0);
        addFinite('lf-base','Premi BeSMART Lite Future — Dasar',dasar,term,{amountPerYear:x.metode==='Bulanan'?dasar*12:dasar,sourceField:'selected.premiDasar',premiumIncluded:true,waiverEligible:true});
        addFinite('lf-waiver-premium','Premi Waiver BeSMART Lite Future',waiver,term,{amountPerYear:x.metode==='Bulanan'?waiver*12:waiver,sourceField:'selected.premiWaiver',premiumIncluded:true,waiverEligible:false});
        // Lite Future's rate row is built from tarifUP + tarifWaiver in the existing
        // calculator. Do not add a second waiver premium; just expose its status.
        addBenefit('lf-waiver','Waiver wajib Lite Future',0,{category:'rider',event:'waiver',aggregateGroup:'waiver',untilAge:term?age+term-1:null,description:'Waiver merupakan bagian wajib dari konfigurasi Lite Future dan preminya sudah termasuk dalam setoran yang dihitung kalkulator existing. Jika kondisi Waiver terpenuhi sebelum masa bayar selesai, premi yang masih eligible untuk sisa masa bayar dapat dibebaskan sesuai ketentuan.'});
        addBenefit('lf-death','Manfaat meninggal sebelum usia pensiun',row.up||x.target,{category:'life_conditional',event:'death',aggregateGroup:'death_base',untilAge:Number(sel)-1,conditional:true,description:'Jika meninggal sebelum usia pensiun, manfaat ini dibayarkan sebagai manfaat meninggal sesuai hasil kalkulator Lite Future.'});
        addBenefit('lf-maturity','Pencairan dana pada usia pensiun',row.up||x.target,{category:'maturity',event:'survival',aggregateGroup:'maturity',eventAge:Number(sel),description:'Jika tetap hidup sampai usia pensiun yang dipilih, dana dicairkan sesuai hasil kalkulator; setelah itu kontrak berakhir.'});
      }
    }
    return {product:x.product,productName:x.productName,need:x.need,payMode:x.metode,paymentTerm:term,customerAge:age,
      coverageEndAge:benefits.reduce((m,b)=>Math.max(m,Number(b.activeUntilAge||0)),0)||null,
      premiumComponents:comps,benefits,raw:x.result};
  }

  function buildProgramModel(results){
    const normalized=results.map(normalizeProgramResult);
    const components=normalized.flatMap(n=>n.premiumComponents);
    const benefits=normalized.flatMap(n=>n.benefits);
    const E=window.PSGProgramFinancialEngine;
    const phases=E ? E.premiumPhases(components) : [];
    const finiteTerms=components.filter(c=>!c.recurring&&Number(c.paymentTerm)>0).map(c=>Number(c.paymentTerm));
    const maxPaymentTerm=finiteTerms.length?Math.max(...finiteTerms):0;
    const benefitGroups=E ? E.groupBenefits(benefits) : [];
    return {normalized,components,benefits,phases,maxPaymentTerm,benefitGroups};
  }

  function escapeAttrText(v){ return String(v??'').replace(/\s+/g,' ').trim(); }

  function programNarrative(model){
    const out=[];
    /* Fase premi tanpa akhir (Health yang terus berjalan) punya toYear null dan
       ditulis terpisah sebagai "Mulai tahun …" di bawah. Properti "to" tidak
       pernah ada, sehingga dulu fase itu ikut tercetak sebagai "Tahun 16–null". */
    model.phases.filter(p=>p.toYear!==null).forEach(p=>{
      out.push('<div class="program-duration-line"><b>Tahun '+p.fromYear+'–'+p.toYear+'</b><br><b>'+rp(p.totalAnnual)+'</b> per tahun'+(p.hasRecurring?'*':'')+'</div>');
    });
    const tail=model.phases.find(p=>p.toYear===null);
    if(tail){
      out.push('<div class="program-duration-line"><b>Mulai tahun '+tail.fromYear+'</b><br>Premi dengan masa bayar terbatas telah selesai. Premi Health/GHP yang masih aktif tetap berjalan <b>'+rp(tail.totalAnnual)+'</b> per tahun*.</div>');
    }
    return out.join('')||'<div class="program-duration-line">Tidak ada jadwal premi yang dapat ditampilkan.</div>';
  }

  /* Blok Waiver Pembebasan Premi Program. Disimpan di lingkup modul supaya
     penyusun ringkasan bisa mengirimnya lewat html.waiver — dirender di
     halaman ringkasan SESUDAH tabel timeline program. */
  let waiverBlokProgram = '';

  function benefitNarrative(model,profile){
    const currentAge=Number(usiaProgram(profile.tglLahir)||0);
    const E=window.PSGProgramFinancialEngine;
    const all=model.benefits||[];
    const life=E?E.activeBenefits(all,currentAge,b=>b.event==='death'):
      all.filter(b=>b.event==='death'&&b.amount>0&&(b.activeUntilAge==null||currentAge<=b.activeUntilAge));
    const blocks=[];
    waiverBlokProgram = '';       // diisi ulang tiap kali blok manfaat disusun
    const amountAt=(b,age)=>E&&typeof E.resolvedAmount==='function' ? E.resolvedAmount(b,age) : Number(b.amount||0);
    const lifeTotal=life.reduce((s,b)=>s+amountAt(b,currentAge),0);
    /* Keterangan kecil yang menyebut nilai gabungan berasal dari produk mana
       saja. Berguna saat nasabah bertanya lebih rinci: agen tidak perlu
       menghitung ulang di tempat. Sengaja dibuat tipis supaya tidak
       mengalihkan perhatian dari angka utamanya. */
    const asalProduk = function(daftar){
      const nama = [];
      (daftar||[]).forEach(function(b){
        const n = b.sourceProduct || b.sourceProductKey;
        if(n && nama.indexOf(n)===-1) nama.push(n);
      });
      if(!nama.length) return '';
      return '<small class="program-asal">Dari: '+nama.map(esc).join(' + ')+'</small>';
    };

    if(lifeTotal){
      blocks.push('<div class="program-benefit-line"><b>Perlindungan meninggal dunia</b><span>'+rp(lifeTotal)+'</span><small>Total manfaat meninggal yang aktif pada usia sekarang. Manfaat dengan penyebab/kondisi khusus tidak dicampurkan ke angka dasar ini.</small>'+asalProduk(life)+'</div>');
      /* Kalimat "mulai usia X manfaat menjadi Y setelah manfaat yang berakhir
         tidak lagi aktif" dihapus. Selain mengulang tabel manfaat menurut
         usia, kalimatnya keliru: changePoints juga menandai titik KENAIKAN
         manfaat, sehingga kenaikan Gen Aman ikut dinarasikan seolah ada polis
         yang berakhir. Tabelnya sendiri sudah benar dan lebih mudah dibaca. */
      /* Kalimat ini hanya relevan bila nilainya memang berubah. Pada alternatif
         yang seluruh produknya bermasa perlindungan sama dan tidak punya
         manfaat naik bertahap, nilainya tetap — menampilkannya membuat
         ringkasan terasa template dan menurunkan kepercayaan. Karena itu
         alasannya disusun dari keadaan yang benar-benar ada. */
      const adaNaik = all.some(function(b){
        return b.event==='death' && Array.isArray(b.amountSchedule) &&
          b.amountSchedule.length > 1;
      });
      const usiaAkhir = all.filter(function(b){ return b.event==='death'; })
        .map(function(b){ return b.activeUntilAge==null ? 'seumur' : Number(b.activeUntilAge); });
      const adaBedaMasa = new Set(usiaAkhir).size > 1;

      if (adaNaik || adaBedaMasa) {
        const sebab = [];
        if (adaBedaMasa) sebab.push('masa perlindungan tiap polis berbeda');
        if (adaNaik) sebab.push('sebagian manfaat naik bertahap');
        blocks.push('<div class="program-duration-line">Nilainya berubah menurut usia, ' +
          'karena ' + sebab.join(' dan ') + '. Rinciannya ada pada tabel manfaat ' +
          'meninggal menurut usia.</div>');
      } else {
        blocks.push('<div class="program-duration-line">Nilainya tetap sepanjang masa ' +
          'perlindungan, karena seluruh polis dalam alternatif ini bermasa perlindungan ' +
          'sama dan manfaatnya tidak naik bertahap.</div>');
      }
    }

    // GEN AMAN: tampilkan booster hanya jika salah satu komponen Gen Aman
    // benar-benar dipilih (standalone maupun Gen Aman + GHPS). Nilai dan
    // schedule berasal dari kalkulator existing, bukan formula summary.
    const gspaDeath=all.find(b=>(b.sourceProductKey==='GSPA'||b.sourceProductKey==='GSPA_HEALTH')&&b.event==='death');
    if(gspaDeath){
      const src=(model.normalized||[]).find(n=>n.product===gspaDeath.sourceProductKey);
      const rr=src&&src.raw?(src.product==='GSPA_HEALTH'?(src.raw.base||src.raw):src.raw):null;
      const timeline=src?.product==='GSPA_HEALTH'&&src.raw?.base?.timeline?src.raw.base.timeline:(rr&&Array.isArray(rr.timeline)?rr.timeline:[]);
      if(timeline.length){
        const currentRow=timeline.find(b=>Number(b.usia)===currentAge)||timeline[0];
        const schedule=E&&typeof E.programDeathSchedule==='function'?E.programDeathSchedule(all,currentAge):(E&&typeof E.deathSchedule==='function'?E.deathSchedule(all,currentAge):[]);
        let h='<h4>Perkembangan santunan Gen Aman &amp; UP seluruh program</h4><table class="akt-tabel"><thead><tr><th>Periode usia</th><th class="ka">Kenaikan Gen Aman</th><th class="ka">Santunan berjalan Gen Aman</th><th class="ka">UP seluruh program</th></tr></thead><tbody>';
        const gspaFamily=(all||[]).filter(b=>b.event==='death'&&b.escalationGroup==='GSPA'&&(b.activeFromAge==null||currentAge>=b.activeFromAge)&&(b.activeUntilAge==null||currentAge<=b.activeUntilAge));
        const gspaBaseTotal=gspaFamily.reduce((s,b)=>s+Number(b.baseAmount!=null?b.baseAmount:b.amount||0),0);
        const gspaPrimaryBase=Number(gspaDeath.baseAmount||gspaDeath.amount||0);
        const genAmountAt=(a)=>{
          const primaryResolved=amountAt(gspaDeath,a);
          const multiplier=gspaPrimaryBase>0?primaryResolved/gspaPrimaryBase:1;
          return gspaBaseTotal*multiplier;
        };
        for(const row of schedule){
          const usiaB=Number(row.fromAge);
          const genAmount=genAmountAt(usiaB);
          const baseGen=gspaBaseTotal;
          const inc=Math.max(0,genAmount-baseGen);
          const pct=baseGen?inc/baseGen:0;
          const period=row.fromAge===row.toAge?'Usia '+row.fromAge:'Usia '+row.fromAge+'–'+row.toAge;
          h+='<tr'+(usiaB===currentAge?' class="tandai"':'')+'><td>'+esc(period)+'</td><td class="ka">'+(pct>0?'+'+rp(inc)+' ('+(pct*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%)':'—')+'</td><td class="ka">'+rp(genAmount)+'</td><td class="ka">'+rp(row.total)+'</td></tr>';
        }
        h+='<tr class="tandai"><td>Kenaikan UP Dasar Gen Aman</td><td class="ka">7,5%</td><td class="ka">Setiap 5 tahun</td><td class="ka">Ikut berubah mengikuti seluruh manfaat meninggal yang aktif</td></tr>';
        h+='</tbody></table>';
        blocks.push('<div class="program-benefit-line"><b>Kenaikan Manfaat Gen Aman</b>'+h+'<small>UP Dasar Gen Aman meningkat 7,5% setiap 5 tahun. Kolom UP seluruh program merupakan gabungan seluruh manfaat meninggal yang aktif pada usia/periode tersebut.</small></div>');
      }
    }

    const conditional=all.filter(b=>b.amount>0&&b.category==='life_conditional'&&b.event!=='death'&&(b.activeUntilAge==null||currentAge<=b.activeUntilAge));
    const cond=new Map(); conditional.forEach(b=>{const k=b.event;if(!cond.has(k))cond.set(k,{label:b.label,total:0,desc:b.description||''});cond.get(k).total+=Number(b.amount||0);});
    for(const g of cond.values()) blocks.push('<div class="program-benefit-line"><b>'+esc(g.label)+'</b><span>+'+rp(g.total)+'</span><small>'+esc(escapeAttrText(g.desc||'Tambahan manfaat pada kondisi khusus; tidak dijumlahkan ke perlindungan meninggal dasar.'))+'</small></div>');

    const ci=all.filter(b=>b.category==='critical_illness'&&b.amount>0&&(b.activeUntilAge==null||currentAge<=b.activeUntilAge));
    const ciBase=ci.filter(b=>b.event==='critical_illness').reduce((s,b)=>s+Number(b.amount||0),0);
    if(ciBase) blocks.push('<div class="program-benefit-line"><b>Critical Illness</b><span>'+rp(ciBase)+'</span><small>Gabungan manfaat Critical Illness yang aktif saat ini.</small>'+asalProduk(ci.filter(b=>b.event==='critical_illness'))+'</div>');
    const angio=ci.filter(b=>b.event==='angioplasty').reduce((s,b)=>s+Number(b.amount||0),0);
    if(angio) blocks.push('<div class="program-benefit-line"><b>Angioplasty</b><span>'+rp(angio)+'</span><small>Manfaat khusus sesuai ketentuan produk yang dipilih.</small>'+asalProduk(ci.filter(b=>b.event==='angioplasty'))+'</div>');

    // HEALTH: render all available plan facts from the existing GHP database.
    const healthBenefits=all.filter(b=>b.category==='health');
    const seenHealth=new Set();
    for(const b of healthBenefits){
      const planMatch=String(b.description||'').match(/Plan\s+([^:;]+):/i);
      const plan=planMatch?planMatch[1].trim():'';
      const m=plan?benefitPlanSafe(plan):null;
      const key=plan||b.description;
      if(seenHealth.has(key)) continue;
      seenHealth.add(key);
      let details='';
      if(m){
        details='<div class="program-health-detail"><table class="akt-tabel"><tbody>'+
          '<tr><td>Plan</td><td>'+esc(plan)+'</td></tr>'+
          '<tr><td>Wilayah pertanggungan</td><td>'+esc(m.wilayah||'—')+'</td></tr>'+
          '<tr><td>Kamar</td><td>'+esc(m.kamar||'—')+'</td></tr>'+
          '<tr><td>Limit tahunan</td><td class="angka">'+rp(m.limit)+'</td></tr>'+
          '<tr><td>Limit booster</td><td class="angka">'+rp(m.booster)+'</td></tr>'+
          '<tr><td>Dasar pembayaran klaim</td><td>'+esc(m.cover||'—')+'</td></tr>'+
          '</tbody></table></div>';
      } else {
        details='<small>'+esc(escapeAttrText(b.description||'Mengikuti manfaat plan Health yang dipilih.'))+'</small>';
      }
      blocks.push('<div class="program-benefit-line"><b>Perlindungan kesehatan</b>'+details+
        '<small>Premi Health/GHP tetap berjalan selama perlindungan kesehatan aktif dan dapat berubah sesuai ketentuan produk, termasuk penyesuaian terkait usia dan biaya kesehatan.</small></div>');
    }

    // Waiting period / NCB / NCD are product-level Health rules. They are shown once
    // whenever a GHP component exists, using the same existing shared rules as the
    // standalone GHP calculator.
    if(healthBenefits.length){
      const waiting='<table class="akt-tabel"><thead><tr><th>Ketentuan</th><th>Keterangan</th></tr></thead><tbody>'+
        '<tr><td>Perawatan akibat kecelakaan</td><td>Tidak ada masa tunggu</td></tr>'+
        '<tr><td>Penyakit akut</td><td>30 hari</td></tr>'+
        '<tr><td>Penyakit kronis</td><td>12 bulan</td></tr>'+
        '<tr><td>Contestable period</td><td>24 bulan sesuai ketentuan</td></tr>'+
        '</tbody></table>';
      let ncbHtml='';
      let ncdHtml='';
      const plans=[...seenHealth].filter(Boolean);
      try{
        const G=window.InsuranceHubGHP;
        if(G&&typeof G.ncb==='function'){
          ncbHtml=plans.map(function(planName){ const mm=benefitPlanSafe(planName); if(!mm)return ''; return '<h4>NCB — '+esc(planName)+'</h4><table class="akt-tabel"><thead><tr><th>Tahun tanpa klaim</th><th>Perubahan</th><th>Limit booster</th></tr></thead><tbody>'+G.ncb(mm.booster).map(b=>'<tr><td>'+esc(b.tahun===0?'Dasar':'Tahun '+b.tahun)+'</td><td class="angka">'+Math.round(b.kenaikan*100)+'%</td><td class="angka">'+rp(b.nilai)+'</td></tr>').join('')+'</tbody></table>'; }).join('');
        }
        if(G&&Array.isArray(G.NCD)){
          ncdHtml='<h4>NCD — diskon premi tahun berikutnya</h4><table class="akt-tabel"><thead><tr><th>Kondisi tanpa klaim</th><th>Diskon</th></tr></thead><tbody>'+G.NCD.map(d=>'<tr><td>'+esc(d.lama)+'</td><td class="angka">'+Math.round(d.diskon*100)+'%</td></tr>').join('')+'</tbody></table>';
        }
      }catch(_){ }
      const tunggu12=(window.InsuranceHubTunggu12&&typeof window.InsuranceHubTunggu12.html==='function')?window.InsuranceHubTunggu12.html():'';
      blocks.push('<div class="program-benefit-line"><b>Ketentuan perlindungan Health</b>'+waiting+tunggu12+ncbHtml+ncdHtml+
        '<small>NCB/NCD dan ketentuan lain mengikuti plan serta ketentuan produk GHP. Informasi ini adalah ringkasan ketentuan produk, bukan perubahan manfaat polis.</small></div>');
    }

    // WAIVER: one unified program-level explanation/table.
    // The Summary must show the effect of a qualifying event on future eligible
    // premiums across ALL selected waiver-bearing components, not the rider price.
    const waivers=all.filter(b=>b.category==='rider'&&b.event==='waiver');
    if(waivers.length){
      const waiverKeys=[...new Set(waivers.map(w=>w.sourceProductKey||w.sourceProduct).filter(Boolean))];
      const eligibleBySource=new Map();
      for(const key of waiverKeys){
        const comps=(model.components||[]).filter(c=>c.sourceProduct===key && !c.recurring && c.waiverEligible!==false);
        // A waiver premium itself is never an eligible future premium; only the
        // premium components the product's waiver actually protects are counted.
        eligibleBySource.set(key, comps);
      }
      const maxWaiverTerm=Math.max(0,...waivers.map(w=>{
        const srcKey=w.sourceProductKey||w.sourceProduct;
        const src=(model.normalized||[]).find(n=>n.product===srcKey||n.productName===w.sourceProduct);
        return Number(src?.paymentTerm||0);
      }));
      let rows='';
      for(let y=1;y<=maxWaiverTerm;y++){
        let relief=0;
        for(const comps of eligibleBySource.values()){
          for(const c of comps){
            const term=Number(c.paymentTerm||0);
            const annual=Number(c.annual||0);
            if(term>0 && y<=term) relief += annual*(term-y);
          }
        }
        rows += '<tr><td>Akhir tahun '+y+'</td><td class="ka">'+(relief>0?rp(relief):'—')+'</td></tr>';
      }
      const waiverDesc='Jika kondisi yang memenuhi ketentuan Waiver terjadi sebelum masa bayar selesai, premi yang masih memenuhi syarat dari seluruh komponen program yang memiliki Waiver dapat dibebaskan untuk sisa masa bayar.';
      const waiverHealthNote='Premi Health/GHP/GHPS tidak termasuk pembebasan Waiver dan tetap berjalan selama perlindungan kesehatan aktif.';
      const waiverTermNote='Setelah masa bayar komponen yang dilindungi selesai, tidak ada lagi premi eligible dari komponen tersebut yang dapat dibebaskan.';
      const table=rows?'<table class="akt-tabel"><thead><tr><th>Jika risiko terjadi pada</th><th class="ka">Sisa premi eligible yang berpotensi dibebaskan</th></tr></thead><tbody>'+rows+'</tbody></table>':'';
      /* Tidak lagi didorong ke daftar manfaat. Blok ini dipindahkan ke bagian
         paling bawah ringkasan — sesudah tabel timeline program — lewat
         html.waiver, sesuai permintaan penempatan.

         Rumusnya (annual * (term - y), dijumlahkan PER KOMPONEN) memang yang
         benar untuk program dengan masa bayar campuran: komponen 5 tahun
         berhenti menyumbang setelah tahun ke-5, sedangkan komponen 15 tahun
         terus berlanjut. Angkanya menurun bertahap mengikuti selisih masa
         bayar, persis seperti yang diminta. */
      waiverBlokProgram = '<section class="blok"><h3>Waiver Pembebasan Premi Program</h3>'
        + '<p class="catatan">' + esc(waiverDesc) + ' ' + esc(waiverHealthNote) + ' '
        + esc(waiverTermNote) + '</p>' + table + '</section>';
    }

    // Maturity / pension benefits: always state the exact age when available.
    all.filter(b=>b.category==='maturity'&&b.amount>0).sort((a,b)=>(a.eventAge||999)-(b.eventAge||999)).forEach(b=>{
      const ageText=b.eventAge!=null?' pada usia '+b.eventAge+' tahun':'';
      const desc=b.description||('Dibayarkan'+ageText+' sesuai hasil kalkulator.');
      blocks.push('<div class="program-benefit-line"><b>'+esc(b.label)+'</b><span>'+rp(b.amount)+'</span><small>'+esc(escapeAttrText(desc))+(b.eventAge!=null?' <b>Usia jatuh tempo: '+b.eventAge+' tahun.</b>':'')+'</small></div>');
    });
    all.filter(b=>b.category==='milestone'&&b.amount>0).forEach(b=>blocks.push('<div class="program-benefit-line"><b>'+esc(b.label)+'</b><span>'+rp(b.amount)+'</span><small>'+esc(escapeAttrText(b.description||('Dibayarkan pada milestone/usia '+b.eventAge+' sesuai ketentuan produk.')))+(b.eventAge!=null?' Usia: '+b.eventAge+' tahun.':'')+'</small></div>'));

    return blocks.join('')||'<div class="notice">Belum ada manfaat yang dapat diringkas.</div>';
  }

  /* Sebagian produk manfaatnya naik sendiri tanpa menambah premi. Kenaikan
     itu sudah ikut terhitung pada tabel manfaat menurut usia, tetapi tidak
     terbaca kalau tidak dijelaskan — padahal justru inilah yang menarik untuk
     disampaikan ke prospek. Daftarnya disusun dari produk yang benar-benar
     dipakai, bukan ditulis tetap. */
  function naikOtomatis(model){
    const catatan=[];
    const punya=function(kode){
      return (model.normalized||[]).some(function(n){ return n.product===kode; });
    };
    if(punya('GSPA')){
      catatan.push('<li><b>Gen Aman</b> \u2014 uang pertanggungan naik 7,5% dari UP dasar '+
        'setiap 5 tahun, maksimal 150%. Premi tidak ikut naik.</li>');
    }
    if(punya('FLEX')){
      catatan.push('<li><b>iFLEXYGUARD</b> \u2014 manfaat meninggal naik 50% mulai tahun '+
        'polis ke-6, lalu naik 50% lagi mulai tahun ke-11. Premi tetap.</li>');
    }
    if(!catatan.length) return '';
    return '<h3 style="margin-top:14px">Kenaikan manfaat otomatis</h3>'+
      '<ul class="sgs-naik">'+catatan.join('')+'</ul>'+
      '<p class="catatan">Kenaikan ini sudah termasuk dalam tabel manfaat meninggal '+
      'menurut usia di atas, jadi angkanya tidak perlu ditambahkan lagi.</p>';
  }

  function createProgramSummaryFromBuilder(program,alt,profile){
    const E=window.PSGProgramFinancialEngine;
    const successful=program.results.filter(x=>x.ok);
    const model=buildProgramModel(successful);
    const payMode=program.metodeProgram || successful[0]?.metode || 'Tahunan';
    const currentAnnual=model.phases.length?model.phases[0].totalAnnual:0;
    /* Gunakan nilai per-setoran asli dari komponen, jangan membalik angka
       tahunan dengan /12. Beberapa produk (termasuk Gen Aman) memakai
       konvensi tahunan = premi bulanan x 11, sehingga currentAnnual/12
       menghasilkan angka yang berbeda dari kalkulator produk. */
    const activeFinite=model.phases.length
      ? model.components.filter(c=>c.recurring || Number(c.paymentTerm)>=Number(model.phases[0].toYear||0))
      : [];
    const currentMonthlyEquivalent=activeFinite.reduce((sum,c)=>sum+
      (Number(c.annual||0)/(payMode==='Bulanan'?12:11)),0);
    const currentPerSetoran=payMode==='Bulanan'
      ? activeFinite.reduce((sum,c)=>sum+Number(c.amountPerPayment||0),0)
      : currentAnnual;
    const finiteTotal=model.components.filter(c=>!c.recurring).reduce((s,c)=>s+Number(c.annual||0)*Number(c.paymentTerm||0),0);
    const currentAge=Number(usiaProgram(profile.tglLahir)||0);
    const benefitLife=model.benefits.filter(b=>b.event==='death'&&b.amount>0&&(b.activeUntilAge==null||currentAge<=b.activeUntilAge));
    const effectiveBenefitAmount=(b)=>{
      if(Array.isArray(b.amountSchedule)&&b.amountSchedule.length){
        const hit=b.amountSchedule.find(seg=>currentAge>=Number(seg.fromAge||0) && currentAge<=Number(seg.toAge||seg.fromAge||0));
        if(hit){
          if(hit.amount!=null) return Number(hit.amount)||0;
          if(hit.multiplier!=null && b.baseAmount!=null) return Number(b.baseAmount)*Number(hit.multiplier);
        }
      }
      return Number(b.amount||0);
    };
    const totalLife=(E&&typeof E.programDeathSchedule==='function' ? ((E.programDeathSchedule(model.benefits,currentAge)[0]||{}).total||0) : benefitLife.reduce((s,b)=>s+effectiveBenefitAmount(b),0));
    const healthPresent=model.benefits.some(b=>b.category==='health')||model.components.some(c=>c.recurring);
    const waiverPresent=model.benefits.some(b=>b.category==='rider'&&b.event==='waiver');

    const bulanan = payMode==='Bulanan';
    const satuan = bulanan ? 'bulan' : 'tahun';
    const bintang = healthPresent ? ' *' : '';

    /* Komponen premi dipisah dua: yang berhenti setelah masa bayar, dan yang
       terus dibayar selama perlindungan kesehatan aktif. Menjumlahkan keduanya
       jadi satu "total sampai lunas" menyesatkan, karena premi kesehatan tidak
       pernah lunas dan besarnya menyesuaikan usia tiap tahun. */
    const kompBerjalan = model.components.filter(c=>c.recurring);
    const annualBerjalan = kompBerjalan.reduce((t,c)=>t+Number(c.annual||0),0);
    const perSetoran = (v)=> bulanan ? v/12 : v/11;

    /* Waiver dari tiap produk tetap ditampilkan sebagai komponen terpisah.
       Setiap komponen membawa nilai dan masa bayarnya sendiri karena masa bayar
       antar kebutuhan/program dapat berbeda. */
    const komponenGabung = (function(){
      /* Satu komponen yang sama bisa ikut terhitung dua kali bila produk yang
         sama dipakai untuk dua kebutuhan (misalnya Gen Aman untuk Life dan
         sekaligus untuk Health). Sidik jari di bawah membuang duplikat yang
         benar-benar identik, sehingga premi waiver tidak menggelembung. */
      const terlihat={};
      const unik=model.components.filter(function(c){
        const sidik=[c.id,c.sourceProduct||'',Math.round(Number(c.annual)||0),
          Math.round(Number(c.amountPerPayment)||0),Number(c.paymentTerm)||0].join('|');
        if(terlihat[sidik]) return false;
        terlihat[sidik]=true;
        return true;
      });

      /* Nama yang muncul lebih dari sekali diberi keterangan kebutuhannya,
         supaya "Premi dasar Gen Aman" yang tampil dua kali bisa dibedakan. */
      const jumlahNama={};
      unik.forEach(function(c){
        const n=String(c.name||c.label||'');
        jumlahNama[n]=(jumlahNama[n]||0)+1;
      });
      const KEBUTUHAN={life:'Jiwa',ci:'Penyakit Kritis',health:'Kesehatan',pensiun:'Dana Pensiun'};
      unik.forEach(function(c){
        const n=String(c.name||c.label||'');
        if(jumlahNama[n]>1 && c.need && KEBUTUHAN[c.need]){
          c.name=n+' \u2014 '+KEBUTUHAN[c.need];
        }
      });

      /* WAIVER JANGAN DIGABUNG.
         Setiap komponen/program dapat memiliki masa bayar berbeda. Contoh:
         Gen Aman Jiwa 5 tahun, Gen Aman Kesehatan 10 tahun, dan BeSMART Lite Future
         20 tahun. Jika premi waiver digabung menjadi satu baris lalu memakai satu
         paymentTerm (misalnya 20 tahun), total dibayar menjadi salah.

         Karena setiap addFinite sudah membawa annual + paymentTerm dari kalkulator
         produk masing-masing, biarkan setiap waiver tetap sebagai baris sendiri.
         Jika nama dasarnya sama (mis. dua "Premi Waiver Gen Aman"), blok
         disambiguasi jumlahNama di atas akan menambahkan kebutuhan: Jiwa/Kesehatan.
      */
      return unik;
    })();

    const barisKomponen = komponenGabung.map(function(c){
      /* Label komponen disimpan pada medan bernama "name" oleh addFinite dan
         addRecurring, bukan "label". Karena tabel hanya membaca "label",
         seluruh baris jatuh ke kata cadangan "Komponen" — itulah sebabnya
         permintaan ini terasa tidak pernah dikerjakan meski labelnya sudah
         benar sejak awal ("Premi dasar Gen Aman", "Premi Waiver Gen Aman"). */
      const nama = esc(c.name||c.label||c.productName||c.product||'Komponen');
      const lama = c.recurring ? 'Selama perlindungan berjalan'
        : (Number(c.paymentTerm||0)+' tahun');
      const totalKomp = c.recurring ? '\u2014'
        : rp(Number(c.annual||0)*Number(c.paymentTerm||0));
      const sub=c.displayNote?'<small style="display:block;margin-top:3px;opacity:.78">'+esc(c.displayNote)+'</small>':'';
      return '<tr><td>'+nama+(c.recurring?' *':'')+sub+'</td>'+
        '<td class="kanan angka">'+rp(Number(c.annual||0)/11)+'</td>'+
        '<td class="kanan angka">'+rp(Number(c.annual||0))+'</td>'+
        '<td class="kanan">'+lama+'</td>'+
        '<td class="kanan angka">'+totalKomp+'</td></tr>';
    }).join('');

    /* Polis yang jatuh tempo: begitu cair, polis itu berakhir dan manfaat
       meninggalnya keluar dari program. Harus dikatakan, bukan dibiarkan
       tersirat pada tabel usia. */
    const jatuhTempo = (model.normalized||[]).map(function(n){
      /* Selain manfaat akhir kontrak, pencairan bertahap di usia tertentu
         seperti bonus usia 75 iFLEXYGUARD juga uang yang benar-benar
         diterima nasabah — karena itu ikut ditampilkan di daftar pencairan. */
      const semuaCair = (n.benefits||[]).filter(function(b){
        return (b.category==='maturity' || b.category==='milestone') &&
          Number(b.amount||0)>0;
      });
      let mt = semuaCair.find(b=>b.category==='maturity') || null;
      const akhir = Number(n.coverageEndAge||0);
      /* GHPS tidak memiliki manfaat hidup/akhir kontrak. Untuk kombinasi
         Gen Aman + GHPS, daftar pencairan harus tetap menampilkan maturity
         Gen Aman dasar pada usia 100, bukan UP embedded GHPS dan bukan usia
         coverageEndAge+1 (101). */
      if(n.product==='GSPA_HEALTH'){
        const raw=n.raw||{};
        const base=raw.base||{};
        const maturity=Number(base.santunanUsia100||0);
        mt=maturity>0?{category:'maturity',eventAge:100,amount:maturity,
          label:'Manfaat akhir Gen Aman — hidup sampai usia 100',
          description:'Jika tetap hidup sampai usia 100, yang dicairkan hanya manfaat akhir Gen Aman dasar. UP jiwa embedded GHPS tidak termasuk manfaat akhir kontrak.'}:null;
      }
      if(!mt && !akhir) return null;
      /* coverageEndAge adalah tahun TERAKHIR polis masih melindungi, sedangkan
         pencairan terjadi setahun sesudahnya. Contoh Lite Future dengan akhir
         kontrak usia 70 memberi coverageEndAge 69. Karena itu usia jatuh tempo
         diambil dari eventAge manfaat pencairannya bila ada, dan hanya jatuh
         kembali ke coverageEndAge+1 bila eventAge tidak tercatat. */
      const usiaCair = (mt && mt.eventAge != null)
        ? Number(mt.eventAge)
        : (akhir ? akhir + 1 : null);
      const utama = { nama:n.productName||n.product, usia:usiaCair,
                      nilai:mt?Number(mt.amount||0):0 };
      const tahap = semuaCair.filter(function(b){ return b.category==='milestone'; })
        .map(function(b){
          return { nama:(n.productName||n.product), usia:(b.eventAge!=null?Number(b.eventAge):null),
                   nilai:Number(b.amount||0), ket:b.label||'' };
        });
      return [utama].concat(tahap);
    }).filter(Boolean).reduce(function(a,b){ return a.concat(b); }, [])
      .filter(function(j){ return j && (j.nilai>0 || j.usia); })
      .sort(function(a,b){return (a.usia||999)-(b.usia||999);});

    const jadwalMati = (E&&typeof E.programDeathSchedule==='function')
      ? E.programDeathSchedule(model.benefits,currentAge) : [];

    const ring =
      '<div class="sorotan"><div class="k">Premi program per '+satuan+'</div>'+
      '<div class="v angka">'+rp(currentPerSetoran)+bintang+' <small>/'+satuan+'</small></div>'+
      '<div class="t">Digabung dari '+model.components.length+' komponen menjadi satu '+
      'program. Masa bayar terpanjang '+(model.maxPaymentTerm||0)+' tahun.</div></div>'+

      '<div class="ikhtisar">'+
      '<div class="kartu"><div class="k">Premi per bulan</div><div class="v angka">'+
      rp(currentMonthlyEquivalent)+bintang+'</div></div>'+
      '<div class="kartu"><div class="k">Premi per tahun</div><div class="v angka">'+
      rp(currentAnnual)+bintang+'</div></div>'+
      '<div class="kartu"><div class="k">Lama bayar terpanjang</div><div class="v angka">'+
      (model.maxPaymentTerm||0)+' tahun</div></div>'+
      '<div class="kartu"><div class="k">Total sampai masa bayar selesai</div>'+
      '<div class="v angka">'+rp(finiteTotal)+'</div>'+
      (annualBerjalan>0?'<div class="k" style="margin-top:6px">Belum termasuk premi '+
        'kesehatan '+rp(perSetoran(annualBerjalan))+' per '+satuan+', yang dibayar selama '+
        'perlindungan kesehatan masih aktif.</div>':'')+
      '</div></div>'+

      '<h3 style="margin-top:14px">Rincian komponen premi</h3>'+
      '<div class="gulir"><table class="tahunan"><thead><tr>'+
      '<th>Rincian premi</th><th class="kanan">Per bulan</th><th class="kanan">Per tahun</th>'+
      '<th class="kanan">Lama bayar</th><th class="kanan">Total dibayar</th>'+
      '</tr></thead><tbody>'+barisKomponen+
      '<tr class="tandai"><td><b>Total program</b></td>'+
      '<td class="kanan angka"><b>'+rp(currentPerSetoran)+bintang+'</b></td>'+
      '<td class="kanan angka"><b>'+rp(currentAnnual)+bintang+'</b></td>'+
      '<td class="kanan"><b>'+(model.maxPaymentTerm||0)+' tahun</b></td>'+
      '<td class="kanan angka"><b>'+rp(finiteTotal)+'</b></td></tr>'+
      '</tbody></table></div>'+

      (healthPresent?'<p class="catatan"><b>*</b> Premi asuransi kesehatan GHP atau GHPS '+
        'tidak mengikat. Premi itu menyesuaikan usia tertanggung tiap tahun dan dibayar '+
        'selama perlindungan kesehatan masih berjalan, jadi tidak ikut dihitung pada total '+
        'sampai masa bayar selesai.</p>':'')+
      (waiverPresent?'<p class="catatan">Waiver membebaskan premi yang masih tersisa dalam '+
        'masa bayar bila kondisi yang dipersyaratkan terjadi.</p>':'')+

      (jadwalMati.length>1
        ? '<h3 style="margin-top:14px">Manfaat meninggal menurut usia</h3>'+
          '<p class="catatan">Nilainya berubah karena masa perlindungan tiap polis berbeda, '+
          'dan karena sebagian produk manfaatnya memang naik bertahap. Yang tertera adalah '+
          'gabungan seluruh manfaat yang masih aktif pada rentang usia itu.</p>'+
          '<div class="gulir"><table class="tahunan"><thead><tr>'+
          '<th>Usia</th><th class="kanan">Manfaat meninggal gabungan</th>'+
          '</tr></thead><tbody>'+
          jadwalMati.map(function(row){
            return '<tr><td>'+row.fromAge+' sampai '+row.toAge+' tahun</td>'+
              '<td class="kanan angka">'+rp(row.total)+'</td></tr>';
          }).join('')+'</tbody></table></div>'
        : '')+

      (jatuhTempo.length
        ? '<h3 style="margin-top:14px">Polis yang jatuh tempo dan pencairannya</h3>'+
          '<div class="gulir"><table class="tahunan"><thead><tr>'+
          '<th>Polis</th><th>Keterangan</th><th class="kanan">Usia</th>'+
          '<th class="kanan">Yang dicairkan</th></tr></thead><tbody>'+
          jatuhTempo.map(function(j){
            return '<tr><td>'+esc(j.nama)+'</td>'+
              '<td>'+esc(j.ket||'Manfaat akhir kontrak')+'</td>'+
              '<td class="kanan">'+(j.usia?j.usia+' tahun':'\u2014')+'</td>'+
              '<td class="kanan angka">'+(j.nilai?rp(j.nilai):'\u2014')+'</td></tr>';
          }).join('')+'</tbody></table></div>'+
          '<p class="catatan">Setelah dicairkan, polis tersebut berakhir dan manfaat '+
          'meninggalnya tidak lagi menjadi bagian program. Penurunannya sudah tercermin '+
          'pada tabel manfaat meninggal menurut usia di atas.</p>'
        : '')+

      naikOtomatis(model)+

      (healthPresent?'<div class="program-health-warning"><b>Perhatian Premi Health:</b> '+
        'Premi GHP atau GHPS tetap dibayar selama perlindungan kesehatan aktif dan ditandai *.</div>':'')+
      (waiverPresent?'<div class="program-health-warning"><b>Perhatian Waiver:</b> '+
        'Waiver membebaskan premi yang masih tersisa dalam masa bayar bila kondisi yang '+
        'dipersyaratkan terjadi.</div>':'')+

      '<section class="blok"><h3>Perubahan Komitmen Premi</h3>'+programNarrative(model)+'</section>';


    /* Tabel timeline program: nilai manfaat pada tiap tahun polis. Selama ini
       dikirim kosong sehingga halaman ringkasan kehilangan bagian yang paling
       menjelaskan. Kelas timeline-table dipakai halaman ringkasan untuk
       memecah tabel lebar saat mencetak. */
    const timelineHtml = (function(){
      if(!jadwalMati.length) return '';
      const mulai = currentAge;
      const akhir = jadwalMati[jadwalMati.length-1].toAge;
      const baris = [];
      jadwalMati.forEach(function(row){
        const tahunMulai = row.fromAge - mulai + 1;
        const tahunAkhir = row.toAge - mulai + 1;
        const cair = jatuhTempo.filter(function(j){
          return j.usia && j.usia >= row.fromAge && j.usia <= row.toAge && j.nilai;
        });
        baris.push('<tr>'+
          '<td>'+tahunMulai+(tahunAkhir!==tahunMulai?' \u2013 '+tahunAkhir:'')+'</td>'+
          '<td>'+row.fromAge+(row.toAge!==row.fromAge?' \u2013 '+row.toAge:'')+'</td>'+
          '<td class="kanan angka">'+rp(row.total)+'</td>'+
          '<td>'+(cair.length
            ? cair.map(function(j){ return esc(j.nama)+' cair '+rp(j.nilai)+' di usia '+j.usia; }).join('; ')
            : '\u2014')+'</td>'+
          '</tr>');
      });
      return '<table class="tahunan timeline-table"><thead><tr>'+
        '<th>Tahun polis</th><th>Usia</th>'+
        '<th class="kanan">Manfaat meninggal aktif</th>'+
        '<th>Peristiwa</th>'+
        '</tr></thead><tbody>'+baris.join('')+'</tbody></table>';
    })();

    const catatanTimelineHtml = timelineHtml
      ? 'Nilai pada tiap baris adalah gabungan manfaat meninggal yang masih aktif '+
        'pada rentang usia tersebut. Kolom peristiwa menandai polis yang jatuh tempo '+
        'dan dicairkan; setelah cair, manfaatnya tidak lagi menjadi bagian program.'
      : '';

    const manfaat=benefitNarrative(model,profile);
    const duration='<div class="program-duration-line">Masa bayar terpanjang untuk komponen premi terbatas: <b>'+model.maxPaymentTerm+' tahun</b>. Masa perlindungan manfaat dapat lebih panjang dan mengikuti ketentuan masing-masing komponen.</div>';
    const normalizedForAudit=model.normalized.map(n=>({product:n.product,productName:n.productName,premiumComponents:n.premiumComponents,benefits:n.benefits,coverageEndAge:n.coverageEndAge}));
    const detailRows=successful.map(x=>'<tr><td>'+esc(INFO[x.need]?.title||x.need)+'</td><td>'+esc(x.productName)+'</td><td>'+rp(x.premium)+'</td><td>'+esc(x.metode||payMode)+'</td><td>'+esc(String(x.paymentTerm||'-')+' thn')+'</td><td>'+rp(x.totalPaid)+'</td></tr>').join('');
    sessionStorage.setItem('insuranceHub.comboGeneratedSummary',JSON.stringify({version:'segitiga-program-7',customerName:profile.nama,customerTgl:profile.tglLahir,customerAge:currentAge,customerJk:profile.jk,
      /* alt.items bisa tidak ada — misalnya ketika ringkasan dibuka dari draft
         Program Builder, yang menyimpan komponennya sebagai daftar, bukan
         sebagai objek per kebutuhan. Tanpa pengaman ini seluruh proses
         berhenti dengan galat "Cannot read properties of undefined". */
      targets:{life:alt?.items?.life?.up||0,ci:alt?.items?.ci?.up||0,retirement:alt?.items?.pensiun?.target||0},
      selected:successful.map(x=>({productKey:x.product,productName:x.productName,need:x.need,premium:x.premium,totalPaid:x.totalPaid,paymentTerm:x.paymentTerm,metode:x.metode,protectionTerm:x.protectionTerm,retirementAge:x.retirementAge||null,up:x.result?.up||x.result?.upDasar||x.result?.upTotal||x.up||0})),
      programModel:{maxPaymentTerm:model.maxPaymentTerm,phases:model.phases,normalized:normalizedForAudit},
      html:{ringkasan:ring,polis:'<div class="gulir"><table class="tahunan"><thead><tr><th>Kebutuhan</th><th>Produk</th><th>Premi</th><th>Metode</th><th>Masa bayar</th><th>Total bayar</th></tr></thead><tbody>'+detailRows+'</tbody></table></div>',manfaat:manfaat,durasi:duration,timeline:timelineHtml,waiver:waiverBlokProgram,skenario:'',catatanSlot:'Nama produk disimpan sebagai detail sumber perhitungan untuk agen. Halaman utama program disajikan berdasarkan manfaat dan komitmen program.',catatanManfaat:'Manfaat sejenis hanya digabung bila peristiwa dan sifat manfaatnya sama. Manfaat dengan kondisi atau peristiwa berbeda tidak dijumlahkan ke angka utama.',catatanTimeline:catatanTimelineHtml,catatanSkenario:'',sangkalan:'Ilustrasi gabungan beberapa polis yang berdiri sendiri, dihitung dari tarif yang berlaku saat ini. Bukan bagian dari polis dan tidak mengikat secara hukum. Setiap polis tunduk pada Ketentuan Polis resmi PT Asuransi Jiwa Generali Indonesia dan hasil underwriting masing-masing.',kakiAgen:''}}));
  }

  function openProgramBuilder(alt,h,s){
    const payload={source:'SEGITIGA_ALTERNATIVE',alternativeId:alt.id,alternative:alt,profile:profileForProgram({nama:h.nama,tglLahir:s.tgl,jk:s.jk,penghasilan:s.penghasilanBulanan}),segitigaState:s,segitigaHitung:h};
    try{localStorage.setItem('insuranceHub.segitiga.calculate.v1',JSON.stringify(payload));}catch(_){ }
    if(typeof window.bukaLayar==='function') window.bukaLayar('SOLUSI_HITUNG');
    setTimeout(renderCalculationHub,20);
  }

  function renderCalculationHub(){
    const w=el('layarSolusiHitung'); if(!w)return;
    let x=null; try{x=JSON.parse(localStorage.getItem('insuranceHub.segitiga.calculate.v1')||'null');}catch(_){ }
    if(!x||!x.alternative){w.innerHTML='<div class="blok"><p class="catatan">Belum ada alternatif yang siap dibangun.</p></div>';return;}
    const alt=x.alternative, profile=profileForProgram(x.profile);
    // Snapshot dari halaman Segitiga saat tombol Solusi ditekan adalah sumber kebenaran.
    // Jangan bergantung pada legacy localStorage yang bisa tertinggal dari profile aktif.
    const segStateSnapshot=x.segitigaState&&typeof x.segitigaState==='object'?x.segitigaState:(read()||{});
    const segHitSnapshot=x.segitigaHitung&&typeof x.segitigaHitung==='object'?x.segitigaHitung:hitung(segStateSnapshot);
    if(alt.profileId && alt.profileId!==activeProfileId()){ w.innerHTML='<div class="blok"><p class="catatan">Alternatif ini milik profile lain dan tidak dapat digunakan pada profile aktif.</p></div>'; return; }
    let draft=loadProgramDraft(alt.id);
    if(!draft){
      draft={version:2,alternativeId:alt.id,profileId:activeProfileId(),profileSignature:activeProfileSignature(),items:cloneBuilderItems(alt),calculated:null,metodeProgram:'Tahunan',updatedAt:new Date().toISOString()};
      const segStateAwal=segStateSnapshot, segHitAwal=segHitSnapshot;
      draft.items.forEach(it=>{
        if(it.need==='pensiun'){
          if(!it.retirementAge) it.retirementAge=Number(segHitAwal?.usiaPensiun)||55;
          if(!it.paymentTerm) it.paymentTerm=Number(segHitAwal?.lamaSiapkan)||5;
          const v=validasiTargetLiteFuture(Number(segHitAwal?.penKurang||it.target)||0,Object.assign({},segHitAwal||{},{_segitigaState:segStateAwal}));
          if(v.parts.length){ it.target=v.target; it.targetFinancial=Number(segHitAwal?.penKurang||it.targetFinancial||0); it.targetParts=v.parts.slice(); }
        }
        if(!it.paymentTerm)it.paymentTerm=({GSPA:5,GPRO:10,CEM:10,FLEX:5,RIZQIA:10,BSL:5,CRIS:10,LF:5,GSPA_HEALTH:5,GPRO_HEALTH:10,BSL_HEALTH:5}[it.produk]||5);
        if(it.produk==='GSPA' && it.pakaiWaiver===undefined)it.pakaiWaiver=false;
        if(it.produk==='GSPA_HEALTH' && it.pakaiWaiver===undefined)it.pakaiWaiver=true;
        it.metode=draft.metodeProgram;
      });
      draft._segitigaBridgeApplied=true;
      saveProgramDraft(alt.id,draft);
    }
    // Keep Life and Health as independent components. Older drafts are not migrated into a
    // Health vehicle here, because Gen Aman / Gen Pro / BeSMART Lite 100 remain valid Life choices.
    // Segitiga is authoritative for the initial gap target when the prospect has no existing coverage.
    const segState=segStateSnapshot, segHit=segHitSnapshot;
    /* Segitiga menjadi sumber nilai saat pertama kali masuk ke Builder.
       Setelah bridge diterapkan, Builder adalah ruang simulasi dan pilihan
       agen (lama bayar / usia pensiun) tidak boleh ditimpa pada setiap render. */
    if(segHit && !draft._segitigaBridgeApplied){
      draft._segitigaLifeUp=Number(segHit.lifeKurang||0);
      const lifeItem=draft.items.find(i=>i.need==='life');
      const ciItem=draft.items.find(i=>i.need==='ci');
      const penItem=draft.items.find(i=>i.need==='pensiun');
      if(lifeItem && !segHit.lifePunya) lifeItem.up=Number(segHit.lifeKurang||0);
      if(ciItem && !segHit.ciPunya) ciItem.up=Number(segHit.ciKurang||0);
      if(penItem){
        penItem.paymentTerm=Number(segHit.lamaSiapkan)||penItem.paymentTerm||5;
        penItem.retirementAge=Number(segHit.usiaPensiun)||penItem.retirementAge||55;
        penItem.targetFinancial=Number(segHit.penKurang||0);
        const v=validasiTargetLiteFuture(penItem.targetFinancial,Object.assign({},segHit,{_segitigaState:segState}));
        if(v.parts.length){ penItem.target=v.target; penItem.targetParts=v.parts.slice(); }
        else penItem.target=penItem.targetFinancial;
      }
      draft._segitigaBridgeApplied=true;
    } else if(!segHit){
      draft._segitigaLifeUp=Number(alt.items?.life?.up||0);
    }
    draft.items.forEach(i=>{ if(i.need==='life') i._segitigaLifeUp=draft._segitigaLifeUp; });
    syncEmbeddedHealth(draft);
    draft.metodeProgram=draft.metodeProgram==='Bulanan'?'Bulanan':'Tahunan';
    draft.items.forEach(i=>{ i.metode=draft.metodeProgram; i._programMetode=draft.metodeProgram; });
    const order={life:1,ci:2,health:3,pensiun:4};
    draft.items.sort((a,b)=>(order[a.need]||9)-(order[b.need]||9));
    syncEmbeddedHealth(draft);
    persist();
    const needOptions=['life','health','ci','pensiun'];
    const rowHtml=function(item,index){
      const p=produkInfo(item.need), chosen=p&&p.candidates.find(q=>q.kode===item.produk);
      const linkedHealth=false;
      const target=item.need==='pensiun'?Number(item.target)||0:(Number(item.up)||0);
      const headTarget=target?rp(target):'—';
      const includeLabel='Ikut program';
      const availableNeeds=needOptions.filter(k=>k===item.need || !draft.items.some(other=>other.id!==item.id && other.need===k));
      const needProduct='<div class="sgs-pb-grid"><div><label>Kebutuhan</label><select class="sgs-pb-field" data-field="need">'+availableNeeds.map(k=>'<option value="'+k+'"'+(k===item.need?' selected':'')+'>'+esc(INFO[k].title)+'</option>').join('')+'</select></div>'
        +'<div><label>Produk / kombinasi sejenis</label><select class="sgs-pb-field" data-field="produk">'+(p?p.candidates:[]).map(q=>'<option value="'+esc(q.kode)+'"'+(q.kode===item.produk?' selected':'')+'>'+esc(q.label)+'</option>').join('')+'</select></div></div>';
      const includeControl=item.need==='health'
        ? '<div class="sgs-pb-health-required"><b>HEALTH AKTIF</b><span>Untuk tidak mengambil Health, hapus komponen ini.</span></div>'
        : '<label class="sgs-pb-include"><input type="checkbox" data-field="included"'+(item.included!==false?' checked':'')+'><span>'+includeLabel+'</span></label>';
      return '<div class="sgs-pb-card" data-pb-id="'+esc(item.id)+'">'
        +'<div class="sgs-pb-card-head"><div><div class="sgs-program-eyebrow">KOMPONEN '+(index+1)+'</div><h3>'+INFO[item.need].icon+' '+esc(INFO[item.need].title)+'</h3><div class="sgs-pb-target">'+esc(headTarget)+'</div></div>'
        +includeControl+'</div>'
        +needProduct
        +'<div class="sgs-pb-config">'+builderConfigHtml(item,profile)+'</div>'
        +'<div class="sgs-pb-actions"><button type="button" class="aksi sgs-pb-calc">HITUNG</button><button type="button" class="sakelar sgs-pb-delete">Hapus komponen</button><span class="sgs-pb-status">'+(draft.calculated&&draft.calculated[item.id]?'Sudah dihitung':'Belum dihitung')+'</span></div>'
        +'<div class="sgs-pb-result" data-result></div></div>';
    };
    w.innerHTML='<div class="kop"><h2>Program Builder — '+esc(alt.name)+'</h2><p>Susun satu program financial dari beberapa kebutuhan. Setiap komponen tetap editable dan dihitung oleh kalkulator produk existing.</p></div>'
      +'<div class="sgs-pb-toolbar"><div><b>'+esc(profile.nama)+'</b><span>'+esc(profile.tglLahir||'')+' · '+esc(profile.jk)+'</span></div><div class="sgs-pb-global-pay"><label>Cara bayar seluruh program</label><select id="sgsPbGlobalMetode"><option value="Tahunan"'+((draft.metodeProgram||'Tahunan')==='Tahunan'?' selected':'')+'>Tahunan</option><option value="Bulanan"'+((draft.metodeProgram||'Tahunan')==='Bulanan'?' selected':'')+'>Bulanan</option></select></div><button type="button" class="sakelar" id="sgsPbAdd">Tambah kebutuhan atau produk</button></div>'
      +'<div class="sgs-pb-list">'+draft.items.map(rowHtml).join('')+'</div>'
      +'<div class="sgs-pb-footer"><button type="button" class="aksi" id="sgsPbCalculateProgram">Hitung Program</button><button type="button" class="sakelar" id="sgsPbSummary">Buka Ringkasan Program</button></div>'
      +'<div id="sgsPbProgramResult" class="sgs-calc-result"></div>';

    function persist(){draft.updatedAt=new Date().toISOString();saveProgramDraft(alt.id,draft);}
    function getItem(id){return draft.items.find(i=>i.id===id);}
    function rerender(){persist();renderCalculationHub();}
    function syncField(card,item,node){
      const field=node.getAttribute('data-field');
      if(field==='included'){
        item.included=node.checked;
        if(item.need==='health') item._healthWantedIncluded=node.checked;
        if(item.need==='life' && ['CEM','FLEX','RIZQIA'].includes(item.produk)){
          const hi=getItem((draft.items.find(i=>i.need==='health')||{}).id);
          if(hi && hi._upMode!=='manual') hi._upMode='auto';
        }
        syncEmbeddedHealth(draft);
        const sw=node.closest('.sgs-pb-switch'); if(sw){ const tx=sw.querySelector('.sgs-pb-switch-text'); if(tx) tx.textContent=node.checked?'ON':'OFF'; }
        draft.calculated={}; draft.program=null; return;
      }
      if(field==='pakaiLiteUp'){ item.pakaiLiteUp=node.checked; if(item.need==='health'&&item.linkedToLifeId){const parent=getItem(item.linkedToLifeId); if(parent&&parent.healthConfig) parent.healthConfig.pakaiLiteUp=node.checked;} draft.calculated={}; draft.program=null; return; }
      if(field==='pakaiWaiver'){
        item.pakaiWaiver=node.checked;
        if(item.need==='health'&&item.linkedToLifeId){const parent=getItem(item.linkedToLifeId); if(parent&&parent.healthConfig) parent.healthConfig.pakaiWaiver=node.checked;}
        draft.calculated={}; draft.program=null;
        const sw=node.closest('.sgs-pb-switch'); if(sw){ const tx=sw.querySelector('.sgs-pb-switch-text'); if(tx) tx.textContent=item.pakaiWaiver?'ON':'OFF'; }
        return;
      }
      let v=node.value;
      if(field==='metode'){ v=draft.metodeProgram||'Tahunan'; }
      if(['up','target'].includes(field)){ v=Number(String(v).replace(/[^\d]/g,''))||0; }
      if(field==='paymentTerm'||field==='protectionTerm'||field==='retirementAge'){v=Number(v)||0;}
      item[field]=v;
      if(item.need==='pensiun' && (field==='paymentTerm'||field==='retirementAge'||field==='target')){
        const seg=segHitSnapshot||{};
        const usia=Number(profile && usiaProgram(profile.tglLahir))||Number(seg.usia)||0;
        const vv=validasiTargetLiteFuture(Number(item.targetFinancial||item.target)||0,{
          usiaPensiun:Number(item.retirementAge)||55, lamaSiapkan:Number(item.paymentTerm)||5, usia:usia,
          _segitigaState:segStateSnapshot
        });
        if(vv.parts.length){ item.target=vv.target; item.targetParts=vv.parts.slice(); }
        const allowed=usiaPensiunSiap(item,profile);
        if(allowed.length && allowed.indexOf(Number(item.retirementAge))===-1) item.retirementAge=allowed[0];
      }
      if(item.need==='health' && item.linkedToLifeId && field==='healthPlan'){ const parent=getItem(item.linkedToLifeId); if(parent&&parent.healthConfig) parent.healthConfig.healthPlan=v; }
      if(field==='produk'){
        const pp=produkInfo(item.need), candidate=pp&&pp.candidates.find(q=>q.kode===v);
        const produkLama=item.produk;
        item.produk=candidate?candidate.kode:(pp?.default.kode||v);
        const defaults={GSPA:{paymentTerm:5,pakaiWaiver:false},GPRO:{paymentTerm:10,protectionTerm:90,paket:'10-90'},CEM:{paymentTerm:10,protectionTerm:25},FLEX:{paymentTerm:5},RIZQIA:{rizqiaPlan:'R10',paymentTerm:10},BSL:{paymentTerm:5,pakaiLiteUp:true},CRIS:{paymentTerm:10,protectionTerm:25},GSPA_HEALTH:{paymentTerm:5,healthPlan:'Gold Standard',up:100000000,pakaiWaiver:true},GPRO_HEALTH:{paymentTerm:10,healthPlan:'Gold Standard',skema:'10-90',up:10000000},BSL_HEALTH:{paymentTerm:5,healthPlan:'Gold Standard',up:50000000,pakaiLiteUp:true},LF:{paymentTerm:5}};
        /* Bila agen hanya memilih ulang LF yang sama, jangan mengembalikan
           lama bayar/usia pensiun ke default 5 tahun. Default produk hanya
           diterapkan ketika memang berganti produk. */
        if(produkLama!==item.produk) Object.assign(item,defaults[item.produk]||{});
        if(item.need==='health') item._upMode='auto';
        if(item.need==='life'||item.need==='ci') item.up=Number(item.up)||Number(alt.items[item.need]?.up||0);
        if(item.need==='health'){ item._upMode='auto'; }
        if(item.need==='pensiun'){ item.paymentTerm=Number(segHitSnapshot?.lamaSiapkan)||item.paymentTerm||5; item.retirementAge=Number(segHitSnapshot?.usiaPensiun)||item.retirementAge||55; item.targetFinancial=Number(segHitSnapshot?.penKurang||item.targetFinancial||0); const vv=validasiTargetLiteFuture(item.targetFinancial,Object.assign({},segHitSnapshot||{},{_segitigaState:segStateSnapshot})); item.target=vv.parts.length?vv.target:(Number(item.target)||item.targetFinancial); item.targetParts=(vv.parts||[]).slice(); }
      }
      if(field==='need'){
        const duplicate=draft.items.some(other=>other.id!==item.id && other.need===v);
        if(duplicate){ alert('Kebutuhan '+(INFO[v]?.title||v)+' sudah ada di Program Builder.'); return; }
        const pp=produkInfo(v); item.need=v; item.produk=pp?.default.kode||''; item.up=(v==='life'||v==='ci')?Number(alt.items[v]?.up||0):0; item.target=v==='pensiun'?Number(segHitSnapshot?.penKurang||alt.items[v]?.target||0):0;
        if(v==='pensiun'){ item.paymentTerm=Number(segHitSnapshot?.lamaSiapkan)||item.paymentTerm||5; item.retirementAge=Number(segHitSnapshot?.usiaPensiun)||item.retirementAge||55; item.targetFinancial=Number(segHitSnapshot?.penKurang||0); const vv=validasiTargetLiteFuture(item.targetFinancial,Object.assign({},segHitSnapshot||{},{_segitigaState:segStateSnapshot})); if(vv.parts.length){item.target=vv.target;item.targetParts=vv.parts.slice();} }
        item.included=true;
        if(v==='health'){ item._upMode='auto'; item.healthPlan='Gold Standard'; item.pakaiWaiver=undefined; item.pakaiLiteUp=undefined; }
      }
      if(field==='paket'){
        const parts=String(v).split('-').map(Number); if(parts.length===2){item.paket=v;item.paymentTerm=parts[0];item.protectionTerm=parts[1];}
      }
      if(item.need==='pensiun' && field==='produk') item.target=item.target||Number(alt.items.pensiun?.target||0);
    }

    w.querySelectorAll('.sgs-pb-card').forEach(card=>{
      const item=getItem(card.getAttribute('data-pb-id')); if(!item)return;
      card.querySelectorAll('[data-field]').forEach(node=>{
        node.addEventListener('change',function(){
          const field=this.getAttribute('data-field');
          syncField(card,item,this);
          if(field==='pakaiLiteUp'){
            const resultBox=card.querySelector('.sgs-pb-result'); if(resultBox){ resultBox.innerHTML=''; }
            item.lastResult=null;
            syncEmbeddedHealth(draft);
            rerender();
          } else if(field==='need'||field==='produk'||field==='paket'||(item.need==='pensiun' && (field==='paymentTerm'||field==='retirementAge'||field==='target'))
            /* lama bayar Gen Aman + GHPS yang tersedia ikut plan dan Waiver */
            ||(item.produk==='GSPA_HEALTH' && (field==='healthPlan'||field==='pakaiWaiver'))) { syncEmbeddedHealth(draft); rerender(); }
          else persist();
        });
      });
      card.querySelectorAll('.sgs-pb-money-input').forEach(inp=>{
        inp.addEventListener('focus',function(){ this.select(); });
        inp.addEventListener('input',function(){
          const field=this.getAttribute('data-field');
          const raw=String(this.value).replace(/[^\d]/g,'');
          item[field]=Number(raw)||0;
          if(item.need==='health' && field==='up') item._upMode='manual';
          this.value=raw?Number(raw).toLocaleString('id-ID'):'';
          if(item.need==='life' && item.produk==='BSL'){
            const total=Number(raw)||0;
            const on=item.pakaiLiteUp!==false;
            const dasar=on?Math.round(total*0.20):total;
            const lite=on?Math.round(total*0.80):0;
            const d1=card.querySelector('[data-derived="up-dasar"]'); if(d1) d1.value=moneyDisplay(dasar);
            const d2=card.querySelector('[data-derived="up-lite"]'); if(d2) d2.value=moneyDisplay(lite);
          }
          persist();
        });
        inp.addEventListener('blur',function(){
          const field=this.getAttribute('data-field');
          this.value=item[field]?Number(item[field]).toLocaleString('id-ID'):'';
        });
      });
      card.querySelector('.sgs-pb-delete')?.addEventListener('click',function(){draft.items=draft.items.filter(i=>i.id!==item.id);rerender();});
      card.querySelector('.sgs-pb-calc')?.addEventListener('click',function(){
        syncEmbeddedHealth(draft);
        persist();
        const calcItem=item;
        const result=buildProductCalculation(calcItem.need,calcItem.produk,calcItem,profile);
        draft.calculated=draft.calculated||{}; draft.calculated[calcItem.id]=result;  persist();
        const host=card.querySelector('[data-result]');
        host.innerHTML=result.ok
          ? '<div class="sgs-pb-result-ok"><b>✓ '+esc(result.productName)+'</b><div class="sgs-pb-result-grid"><div><span>Premi / setoran</span><b>'+rp(result.premium)+'</b></div><div><span>Total pembayaran</span><b>'+rp(result.totalPaid)+'</b></div></div>'+rincianPremiKomponen(result, item)+'<div class="sgs-pb-note"><b>Ringkasan manfaat:</b> '+esc(benefitTextForResult(result)||'Mengikuti hasil kalkulator existing.')+'</div></div>'
          : '<div class="peringatan">'+esc(result.error||'Perhitungan tidak tersedia.')+'</div>';
        card.querySelector('.sgs-pb-status').textContent=result.ok?'✓ Sudah dihitung':'⚠ Perlu revisi';
        renderProgramAggregate(false);
      });
    });

    function renderProgramAggregate(writeBox){
      const host=el('sgsPbProgramResult'); if(!host)return;
      syncEmbeddedHealth(draft);
      const results=draft.items.filter(i=>i.included!==false).map(i=>draft.calculated?.[i.id]).filter(Boolean);
      const good=results.filter(r=>r.ok);
      const bad=results.filter(r=>!r.ok);
      const annual=good.reduce((s,r)=>s+(r.metode==='Bulanan'?r.premium*12:r.premium),0), total=good.reduce((s,r)=>s+r.totalPaid,0);
      host.innerHTML='<div class="sgs-program-card"><div class="sgs-program-hero"><div><div class="sgs-program-eyebrow">PROGRAM FINANCIAL · '+esc(alt.name)+'</div><h3>'+esc(profile.nama)+'</h3><div class="catatan">'+good.length+' komponen berhasil dihitung'+(bad.length?' · '+bad.length+' perlu revisi':'')+'</div></div><div class="sgs-program-totals"><div><span>Estimasi premi tahunan</span><b>'+rp(annual)+'</b></div><div><span>Total pembayaran</span><b>'+rp(total)+'</b></div></div></div>'
        +'<div class="blok"><h3>Komponen program</h3><div class="gulir"><table class="tahunan"><thead><tr><th>Kebutuhan</th><th>Produk</th><th>Premi</th><th>Metode</th><th>Total bayar</th></tr></thead><tbody>'+good.map(r=>'<tr><td>'+esc(INFO[r.need]?.title||r.need)+'</td><td>'+esc(r.productName)+'</td><td>'+rp(r.premium)+'</td><td>'+esc(r.metode)+'</td><td>'+rp(r.totalPaid)+'</td></tr>').join('')+'</tbody></table></div>'+(bad.map(r=>'<div class="peringatan">'+esc(INFO[r.need]?.title||r.need)+': '+esc(r.error)+'</div>').join(''))+(good.some(r=>r.healthLifetime)?'<div class="sgs-pb-note"><b>Catatan Health:</b> premi GHP/Health berjalan seumur hidup. Lama bayar yang dipilih hanya untuk premi asuransi dasar dan rider selain GHP.</div>':'')+'</div></div>';
      /* Keaktifan tombol dinilai dari hasil hitungan yang tersimpan pada tiap
         komponen, bukan dari draft.program. draft.program dikosongkan setiap
         kali ada isian yang diubah, sehingga menilainya dari sana membuat
         tombol mati lagi walau seluruh komponen sudah berhasil dihitung. */
      /* Tombol sengaja TIDAK pernah dimatikan. Sebelumnya ia dimatikan
         berdasarkan keadaan yang berubah-ubah, dan begitu keadaan itu meleset
         tombolnya mati tanpa penjelasan apa pun — dari sisi agen terlihat
         seperti tombol rusak. Sekarang selalu bisa ditekan, dan bila memang
         belum siap, penanganan kliknya yang memberi tahu apa yang kurang. */
      const summary=el('sgsPbSummary');
      if(summary) summary.disabled=false;
    }

    el('sgsPbGlobalMetode')?.addEventListener('change',function(){
      draft.metodeProgram=this.value;
      draft.items.forEach(i=>{ i.metode=this.value; i._programMetode=this.value; });
      draft.calculated={}; draft.program=null; persist(); renderCalculationHub();
    });
    draft.items.forEach(i=>{ i.metode=draft.metodeProgram||'Tahunan'; i._programMetode=draft.metodeProgram||'Tahunan'; });
    syncEmbeddedHealth(draft);

    el('sgsPbAdd')?.addEventListener('click',function(){
      const orderAdd=['life','ci','health','pensiun'];
      const need=orderAdd.find(n=>!draft.items.some(i=>i.need===n));
      if(!need){ alert('Semua kebutuhan yang tersedia sudah ada di Program Builder.'); return; }
      const p=produkInfo(need);
      const baseUp=need==='life'?Number(alt.items.life?.up||0):need==='ci'?Number(alt.items.ci?.up||0):0;
      const baseTarget=need==='pensiun'?Number(segHitSnapshot?.penKurang||alt.items.pensiun?.target||0):0;
      const pensionTerm=need==='pensiun'?Number(segHitSnapshot?.lamaSiapkan)||0:5;
      const pensionAge=need==='pensiun'?Number(segHitSnapshot?.usiaPensiun)||0:undefined;
      const pensionValidated=need==='pensiun'?validasiTargetLiteFuture(baseTarget,Object.assign({},segHitSnapshot||{},{_segitigaState:segStateSnapshot})):null;
      const newItem={id:'PB-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),need,produk:p?.default.kode||'',up:baseUp,target:need==='pensiun'?(pensionValidated?.target||baseTarget):baseTarget,included:true,metode:draft.metodeProgram||'Tahunan',_programMetode:draft.metodeProgram||'Tahunan',paymentTerm:pensionTerm||5,_upMode:need==='health'?'auto':undefined};
      if(need==='pensiun'){ newItem.targetFinancial=baseTarget; newItem.targetParts=(pensionValidated?.parts||[]).slice(); newItem.retirementAge=pensionAge||undefined; }
      draft.items.push(newItem);
      rerender();
    });
    el('sgsPbCalculateProgram')?.addEventListener('click',function(){
      syncEmbeddedHealth(draft);
      const included=draft.items.filter(i=>i.included!==false);
      if(!included.length){alert('Pilih minimal satu komponen untuk dimasukkan ke program.');return;}
      const results=[];
      included.forEach(item=>{const r=buildProductCalculation(item.need,item.produk,item,profile);draft.calculated=draft.calculated||{};draft.calculated[item.id]=r;results.push(r);});
      const program={alternativeId:alt.id,alternativeName:alt.name,profile,results,calculatedAt:new Date().toISOString()};
      draft.program=program; persist();
      renderProgramAggregate(true);
      const summary=el('sgsPbSummary'); if(summary){ const valid=results.length>0 && results.every(r=>r&&r.ok); summary.disabled=!valid; }
    });
    /* Tombol ini berada di dalam bagian yang digambar ulang setiap kali ada
       isian berubah, sehingga pengikat klik yang dipasang langsung ke
       elemennya ikut hilang begitu layar dirender ulang — itulah sebabnya
       tombolnya terasa mati padahal sebelumnya berfungsi.

       Karena itu kliknya ditangkap di tingkat dokumen dan dipasang sekali
       saja, sehingga tetap bekerja pada elemen baru hasil penggambaran ulang. */
    const bukaRingkasan = function(){
      syncEmbeddedHealth(draft);
      const included=draft.items.filter(i=>i.included!==false);
      const results=included.map(i=>draft.calculated?.[i.id]);
      const valid=results.length>0 && results.length===included.length && results.every(r=>r&&r.ok);
      if(!valid){
        const missing=results.filter(r=>!r).length;
        const failed=results.filter(r=>r&&!r.ok).length;
        const namaGagal=included.filter(function(i,idx){
          const r=results[idx]; return !r || !r.ok;
        }).map(function(i){ return i.need||i.produk||'komponen'; }).join(', ');
        if(namaGagal){
          alert('Belum bisa membuka ringkasan. Tekan HITUNG dulu pada komponen: '+namaGagal+'.');
          return;
        }
        alert(missing||failed ? 'Ringkasan belum dapat dibuka. Pastikan semua komponen program sudah berhasil dihitung.' : 'Belum ada hasil program. Klik Hitung Program terlebih dahulu.');
        return;
      }
      draft.program={alternativeId:alt.id,alternativeName:alt.name,profile,results,metodeProgram:draft.metodeProgram||'Tahunan',calculatedAt:new Date().toISOString()};
      persist();
      createProgramSummaryFromBuilder(draft.program,alt,profile);
      try{sessionStorage.setItem('insuranceHub.externalReturn.v1',JSON.stringify({type:'program-summary',returnPage:'index.html?returnScreen=SOLUSI_SEGITIGA',returnScreen:'SOLUSI_SEGITIGA'}));}catch(_){ }
      location.href='program-summary.html';
    };

    if(!document.__sgsPbSummaryTerpasang){
      document.__sgsPbSummaryTerpasang=true;
      /* Ditangkap pada fase menangkap (capture) agar tetap terpanggil walau
         ada elemen lain di atasnya yang menghentikan peristiwa klik, dan
         dipasang pada dua peristiwa: klik biasa serta sentuhan layar. */
      const tangani=function(e){
        const t=e.target;
        if(!(t instanceof Element)) return;
        const btn=t.closest('#sgsPbSummary');
        if(!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const fn=document.__sgsPbSummaryFn;
        if(typeof fn==='function'){
          try{ fn(); }
          catch(err){ alert('Ringkasan gagal dibuka: '+(err&&err.message?err.message:'sebab tidak diketahui')); }
        }
      };
      document.addEventListener('click',tangani,true);
    }
    // Selalu tunjuk ke draft dan alternatif yang sedang aktif.
    document.__sgsPbSummaryFn = bukaRingkasan;

    renderProgramAggregate(false);
  }

  function daftar(){
    const nav=window.InsuranceHubNavigation;
    if(!nav||!nav.LAYAR) return false;
    nav.LAYAR.SOLUSI_SEGITIGA={el:'layarSegitigaSolusi',judul:'Solusi Segitiga Financial',sub:'Rancangan solusi berdasarkan hasil analisa',kiri:'SEGITIGA'};
    nav.LAYAR.SOLUSI_HITUNG={el:'layarSolusiHitung',judul:'Hitung Alternatif',sub:'Hitung seluruh produk dalam satu alternatif',kiri:'SOLUSI_SEGITIGA'};
    nav.LAYAR.SOLUSI_BANDING={el:'layarSolusiBanding',judul:'Banding Alternatif',sub:'Menyandingkan alternatif yang sudah disimpan',kiri:'SOLUSI_SEGITIGA'};
    return true;
  }

  function buka(h,s){
    // The main Segitiga page is the single source of truth.
    if(s && typeof s==='object'){
      try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(_){}
    }
    if(typeof window.bukaLayar==='function') window.bukaLayar('SOLUSI_SEGITIGA');
    render();
    setTimeout(render,30);
  }

  function css(){
    if(el('sgsStyle')) return;
    const st=document.createElement('style'); st.id='sgsStyle';
    st.textContent=`.sgs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sgs-calc-list{display:flex;flex-direction:column;gap:10px}.sgs-calc-row{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(160px,.8fr) auto;gap:12px;align-items:center;border:1px solid rgba(0,0,0,.09);border-radius:12px;padding:13px 14px;background:#fff}.sgs-calc-product{font-size:12px;opacity:.68;margin-top:4px}.sgs-calc-default{font-size:12px;font-weight:700;opacity:.75}.sgs-calc-state{font-size:11px;font-weight:800;white-space:nowrap}.sgs-calc-main-action{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.sgs-calc-result{margin-top:14px}.sgs-program-card{border:1px solid rgba(0,0,0,.10);border-radius:16px;overflow:hidden;background:#fff}.sgs-program-hero{display:flex;justify-content:space-between;gap:16px;padding:18px;background:rgba(194,140,0,.07)}.sgs-program-eyebrow{font-size:10px;letter-spacing:.8px;font-weight:800;opacity:.62}.sgs-program-hero h3{margin:4px 0 0}.sgs-program-totals{display:flex;gap:18px;text-align:right}.sgs-program-totals span{display:block;font-size:10px;opacity:.62}.sgs-program-totals b{font-size:18px}.sgs-program-actions{display:flex;gap:8px;margin-top:12px}.sgs-alt-card{display:flex;justify-content:space-between;gap:14px;align-items:center}.sgs-alt-buttons{display:flex;gap:8px;flex-wrap:wrap}.sgs-program-card table{width:100%}.sgs-program-card .peringatan{margin-top:10px;padding:9px 10px;border-radius:9px;background:rgba(170,40,40,.07);font-size:12px}@media(max-width:700px){.sgs-calc-row{grid-template-columns:1fr}.sgs-program-hero{flex-direction:column}.sgs-program-totals{text-align:left;flex-direction:column;gap:8px}.sgs-alt-card{align-items:flex-start;flex-direction:column}.sgs-alt-buttons{width:100%}}.sgs-card{border:1px solid rgba(0,0,0,.10);border-radius:14px;padding:16px;background:#fff;transition:.15s}.sgs-card.gap{border-color:rgba(194,140,0,.35)}.sgs-card.cukup{border-color:rgba(40,130,70,.25)}.sgs-card.sgs-selected{box-shadow:0 0 0 2px rgba(194,140,0,.18)}.sgs-top{display:flex;gap:10px;align-items:center}.sgs-icon{font-size:26px}.sgs-prio{font-size:11px;letter-spacing:.7px;opacity:.65;font-weight:700}.sgs-card h3{margin:1px 0 0}.sgs-desc{font-size:12px;opacity:.72;margin:9px 0 13px}.sgs-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid rgba(0,0,0,.07);border-bottom:1px solid rgba(0,0,0,.07)}.sgs-row span{font-size:12px;opacity:.7}.sgs-status{display:inline-block;margin-top:11px;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:700}.sgs-card.gap .sgs-status{background:rgba(194,140,0,.10)}.sgs-card.cukup .sgs-status{background:rgba(40,130,70,.10)}.sgs-editor{margin-top:13px;padding:13px;border-radius:12px;background:rgba(0,0,0,.028);border:1px solid rgba(0,0,0,.08)}.sgs-editor-head{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}.sgs-editor-head span,.sgs-select-label{font-size:10px;text-transform:uppercase;letter-spacing:.65px;font-weight:800;opacity:.62}.sgs-editor-head b{font-size:14px;line-height:1.25}.sgs-product-select{width:100%;padding:10px 34px 10px 11px;border:1px solid rgba(0,0,0,.14);border-radius:9px;background:#fff;font-size:12px;font-weight:700}.sgs-select-label{display:block;margin:10px 0 6px}.sgs-up-row{display:flex;align-items:center;gap:8px}.sgs-up-input{width:100%;min-width:0;padding:10px 11px;border:1px solid rgba(0,0,0,.14);border-radius:9px;font-size:12px;font-weight:700}.sgs-up-row span{font-size:10px;opacity:.62;line-height:1.2}.sgs-health-note{font-size:11px;line-height:1.4;opacity:.68}.sgs-open-row{margin-top:11px}.sgs-open-product{width:100%;font-size:12px}.sgs-open-product:disabled{opacity:.45;cursor:not-allowed}.sgs-check{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;position:relative;flex:0 0 22px}.sgs-check input{position:absolute;opacity:0;width:1px;height:1px}.sgs-check span{width:18px;height:18px;border:2px solid rgba(20,35,45,.25);border-radius:5px;display:block;position:relative}.sgs-check input:checked+span{border-color:#c28c00;background:#c28c00}.sgs-check input:checked+span:after{content:'';position:absolute;left:4px;top:1px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.sgs-check input:disabled+span{opacity:.4}.sgs-pb-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0 0 12px;padding:13px 14px;border:1px solid rgba(0,0,0,.09);border-radius:14px;background:#fff}.sgs-pb-toolbar>div{display:flex;flex-direction:column;gap:3px}.sgs-pb-toolbar span{font-size:11px;opacity:.62}.sgs-pb-list{display:flex;flex-direction:column;gap:12px}.sgs-pb-card{border:1px solid rgba(0,0,0,.11);border-radius:16px;padding:15px;background:#fff}.sgs-pb-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sgs-pb-card-head h3{margin:3px 0 2px}.sgs-pb-target{font-size:11px;opacity:.65}.sgs-pb-include{display:flex;gap:7px;align-items:center;font-size:11px;font-weight:800}.sgs-pb-health-required{display:flex;flex-direction:column;gap:2px;align-items:flex-end;font-size:10px}.sgs-pb-health-required b{font-size:10px;letter-spacing:.5px}.sgs-pb-health-required span{opacity:.62;font-weight:600}.sgs-pb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:11px}.sgs-pb-grid label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.55px;font-weight:800;opacity:.62;margin-bottom:5px}.sgs-pb-field{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid rgba(0,0,0,.14);border-radius:9px;background:#fff;font-size:12px;font-weight:650}.sgs-pb-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}.sgs-pb-status{font-size:11px;font-weight:800;opacity:.7}.sgs-pb-config .sgs-pb-note,.sgs-pb-note{margin-top:9px;font-size:11px;line-height:1.4;opacity:.68}.sgs-pb-note.warning{padding:9px 10px;border-radius:9px;background:rgba(170,40,40,.07);opacity:1}.sgs-pb-result{margin-top:10px}.sgs-pb-result-ok{padding:11px 12px;border:1px solid rgba(40,130,70,.18);border-radius:11px;background:rgba(40,130,70,.045)}.sgs-pb-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:9px}.sgs-pb-result-grid span{display:block;font-size:10px;opacity:.6}.sgs-pb-result-grid b{display:block;font-size:16px;margin-top:2px}.sgs-pb-footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.sgs-pb-footer .btn{min-height:42px}.sgs-program-card{margin-top:2px}.sgs-program-card table{width:100%}@media(max-width:700px){.sgs-pb-toolbar,.sgs-pb-card-head{flex-direction:column}.sgs-pb-grid,.sgs-pb-result-grid{grid-template-columns:1fr}}@media(max-width:700px){.sgs-grid{grid-template-columns:1fr}.sgs-up-row{align-items:flex-start;flex-direction:column}.sgs-up-row span{display:block}}`;
    document.head.appendChild(st);
  }

  function mulai(){
    if(!daftar()){setTimeout(mulai,100);return;}
    css();
    /* Dipakai halaman utama Segitiga untuk menuliskan catatan pembulatan.
     Memakai lama bayar dan usia pensiun dari keadaan Segitiga, sehingga
     susunan yang ditampilkan sama dengan yang nanti dipakai di solusi. */
  window.optimasiLiteFutureRingkas = function(target){
    try{
      const rates=(typeof TARIF!=='undefined')?TARIF:null;
      const meta=(typeof META!=='undefined')?META:null;
      if(!rates||!meta||typeof hitung!=='function') return [];
      const s=read()||{};
      let tgl=s.tgl||'';
      if(!tgl){
        const aktif=localStorage.getItem('insuranceHub.customerProfile.active.v1');
        const daftar=JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1')||'[]');
        const p=(daftar||[]).find(function(x){return x.id===aktif;});
        if(p) tgl=p.tglLahir||'';
      }
      if(!tgl) return [];
      const mpp=Number(s.lamaSiapkan)||5;
      const ret=Number(s.usiaPensiun)||55;
      const jk=String(s.jk||'PRIA').toUpperCase()==='WANITA'?'WANITA':'PRIA';
      const cekRow=function(up){
        const pilih={},custom={};
        [55,60,65,70,75].forEach(function(a){ pilih[a]=(a===ret); custom[a]=null; });
        const h=hitung({nama:'x',jk:jk,tglLahir:new Date(tgl+'T00:00:00Z'),setoran:'Tahunan',
          mpp:mpp,pensiunUP:up,statusAgen:'Bukan agen',customUP:custom,pilih:pilih},rates,meta);
        const r=(h&&Array.isArray(h.hasil))?h.hasil.find(function(x){return Number(x.retAge)===ret;}):null;
        return (r && r.setoran!=null)?r:false;
      };
      return optimasiLiteFuture(Number(target)||0,{cekRow:cekRow})||[];
    }catch(_){ return []; }
  };

  window.InsuranceHubSegitigaSolusi={buka:buka,render:render,renderCalculationHub:renderCalculationHub,renderBanding:renderBanding}; window.renderCalculationHub=renderCalculationHub;
  }
  mulai();
})();
