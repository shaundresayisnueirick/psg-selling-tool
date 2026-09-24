/* Insurance Hub — RAYA Pro Maxima
 * Identitas nasabah selalu mengikuti Profil Nasabah yang sedang aktif.
 * Bandingkan: masa asuransi atau kontribusi dasar. ADB dihitung otomatis
 * dan selalu masuk ke total kontribusi.
 */
(function(){
  'use strict';
  const E=window.RayaProMaximaEngine;
  if(!E) return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const rp=E.formatRp;
  let terakhir=null;

  function profilAktif(){
    try{
      if(window.InsuranceHubCustomerProfile && typeof window.InsuranceHubCustomerProfile.active==='function'){
        return window.InsuranceHubCustomerProfile.active() || null;
      }
      const id=localStorage.getItem('insuranceHub.customerProfile.active.v1')||'';
      const list=JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1')||'[]');
      return list.find(x=>x.id===id)||null;
    }catch(_){return null;}
  }
  function usiaDariProfil(p){
    if(!p||!p.tglLahir) return null;
    return typeof ihUsiaGenerali==='function' ? ihUsiaGenerali(p.tglLahir,new Date()) : null;
  }
  function freqLabel(f){return ({Tahunan:'tahunan',Semesteran:'semesteran',Kuartalan:'kuartalan',Bulanan:'bulanan'})[f]||'tahunan';}
  function annualize(v,f){return Number(v||0)*(E.FREQ[f]||E.FREQ.Tahunan).perYear;}
  function parseNominal(v){return Number(String(v||'').replace(/[^0-9]/g,''))||0;}
  function fmtInput(v){return v?Math.round(v).toLocaleString('id-ID'):'';}

  function readInput(){
    const p=profilAktif();
    const freq=$('rayaFreq')?.value||'Tahunan';
    const basicPer=parseNominal($('rayaKontribusi')?.value||'');
    const plan=$('rayaPlan')?.value||'TJA1';
    const name=String($('rayaNama')?.value||'').trim();
    const dob=$('rayaTglLahir')?.value||'';
    const age=dob ? (typeof ihUsiaGenerali==='function' ? ihUsiaGenerali(dob,new Date()) : usiaDariProfil({tglLahir:dob})) : null;
    return {profile:p,age,name,dob,plan,freq,basicPer,basicAnnual:annualize(basicPer,freq),fromProfile:!!p};
  }
  function renderIdentity(i){
    const info=$('rayaProfileHint');
    if(info){
      info.textContent=i.profile
        ? 'Profil aktif: '+(i.profile.nama||'')+'. Identitas mengikuti profil/selector dan tetap dapat diketik manual.'
        : 'Belum ada Profil Nasabah aktif. Silakan isi nama dan tanggal lahir secara manual.';
    }
    const gi=$('rayaGenderInfo');
    if(gi){gi.textContent=i.profile?.jk ? ('Profil aktif: '+(String(i.profile.jk).toUpperCase()==='WANITA'?'Wanita':'Pria')+' · Gender tidak memengaruhi formula UP dasar RAYA.') : 'Gender tidak diperlukan untuk menghitung UP dasar RAYA.';}
  }

  function calc(){
    const i=readInput();
    const r=E.calculate({age:i.age,plan:i.plan,freq:i.freq,basicContribution:i.basicPer});
    terakhir={i,r};
    renderIdentity(i);
    renderResult(i,r);
  }
  function renderResult(i,r){
    const box=$('rayaHasil'); if(!box)return;
    if(!i.name && !i.dob){box.innerHTML='<p class="catatan">Isi nama dan tanggal lahir nasabah pada bagian Data Nasabah.</p>';return;}
    const status=r.ok
      ?'<div class="raya-status ok">✓ MEMENUHI KETENTUAN DASAR RAYA PRO MAXIMA</div>'
      :'<div class="raya-status warn"><b>⚠ TIDAK MEMENUHI KETENTUAN</b><div class="raya-validation-list">'+r.errors.map(esc).map(x=>'<div>• '+x+'</div>').join('')+'</div><small>Angka simulasi tetap ditampilkan sebagai referensi dan bukan hasil yang memenuhi ketentuan.</small></div>';
    const identity='<div class="raya-result-identitas"><div><span>Nama nasabah</span><b>'+esc(i.name||'—')+'</b></div><div><span>Tanggal lahir</span><b>'+esc(i.dob||'—')+'</b></div><div><span>Usia masuk</span><b>'+(i.age==null?'—':i.age+' tahun')+'</b></div><div><span>Gender</span><b>'+esc(i.profile?.jk||'—')+'</b></div></div>';
    const rows=r.deathRows.map(x=>{
      const age=i.age==null?'—':i.age+x.year-1;
      const annual=x.year>=6?rp(r.annualBenefit):'';
      const contribution=x.year<=5?rp(r.totalAnnual):'';
      const maturity=x.year===r.term?rp(r.maturity):'';
      const surrender=r.surrender[x.year-1]?.value||0;
      return '<tr><td>'+x.year+'</td><td>'+age+'</td><td class="kanan angka">'+contribution+'</td><td class="kanan angka">'+annual+'</td><td class="kanan angka">'+rp(x.death)+'</td><td class="kanan angka">'+rp(r.adbUp)+'</td><td class="kanan angka">'+maturity+'</td><td class="kanan angka">'+(surrender?rp(surrender):'')+'</td></tr>';
    }).join('');
    box.innerHTML=status+identity+
      '<div class="raya-hero-grid">'+
      '<div class="raya-hero"><span>UP DASAR</span><b>'+rp(r.up)+'</b><small>'+r.plan+' · '+r.upFactor+'× kontribusi tahunan dasar</small></div>'+ 
      '<div class="raya-hero accent"><span>ADB WAJIB</span><b>'+rp(r.adbUp)+'</b><small>100% UP dasar, maksimum Rp500 juta</small></div></div>'+ 
      '<div class="ikhtisar"><div class="kartu"><div class="k">Kontribusi dasar</div><div class="v angka">'+rp(r.basicPerPayment)+'</div><small>per '+freqLabel(r.freq)+'</small></div>'+ 
      '<div class="kartu"><div class="k">Kontribusi ADB</div><div class="v angka">'+rp(r.adbPer)+'</div><small>per '+freqLabel(r.freq)+'</small></div>'+ 
      '<div class="kartu"><div class="k">Total kontribusi</div><div class="v angka">'+rp(r.totalPer)+'</div><small>dasar + ADB per '+freqLabel(r.freq)+'</small></div></div>'+ 
      '<div class="blok raya-sub"><h2>Tabel Manfaat Asuransi</h2>'+ 
      '<p class="catatan">Format mengikuti struktur tabel ilustrasi resmi RAYA Pro Maxima. Kontribusi tahunan pada tabel sudah termasuk kontribusi ADB.</p>'+ 
      '<div class="gulir raya-table-wrap"><table class="tahunan raya-official-table"><thead><tr>'+ 
      '<th>TAHUN<br>POLIS</th><th>USIA<br>PESERTA<br>(TAHUN)</th><th>KONTRIBUSI<br>TAHUNAN [1]</th><th>MANFAAT<br>TAHUNAN [2]</th><th>MANFAAT MENINGGAL<br>DUNIA [3]</th><th>MANFAAT<br>ACCIDENTAL<br>DEATH BENEFIT<br>SYARIAH</th><th>MANFAAT AKHIR<br>MASA ASURANSI</th><th>PENEBUSAN<br>POLIS</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+ 
      '<div class="raya-footnotes"><div>Keterangan:</div><div>[1] Tidak termasuk Kontribusi Kondisi Khusus.</div><div>[2] Manfaat Tahunan akan diserahkan pada saat ulang tahun polis.</div><div>[3] Manfaat Meninggal Dunia yang tercantum pada tabel di atas sudah memperhitungkan Manfaat Tahunan yang telah diserahkan (jika ada) kepada Pemegang Polis.</div><div>Besaran Penebusan Polis pada akhir tahun Polis. Apabila pengajuan Penebusan Polis tidak dilakukan pada saat akhir tahun Polis maka pengembalian Dana Tanahud akan diperhitungkan secara proporsional sesuai dengan ketentuan Pengelola.</div></div></div>'+ 
      '<div class="blok raya-note"><b>Catatan penting</b><ul><li>Nama dan tanggal lahir mengikuti Profil Nasabah yang sedang aktif.</li><li>Gender ditampilkan sebagai identitas, tetapi tidak digunakan dalam formula UP dasar.</li><li>ADB wajib: 100% UP dasar, minimum Rp7,5 juta, maksimum Rp500 juta.</li><li>5–15 maksimal usia masuk 55 tahun; 5–20 maksimal 50 tahun.</li><li>Maksimum santunan dasar tetap mengikuti keputusan underwriting.</li></ul></div>';
  }

  function ensureIdentityBeforeAction(){
    const name=String($('rayaNama')?.value||'').trim();
    const dob=$('rayaTglLahir')?.value||'';
    if(!name || !dob){alert('Isi nama dan tanggal lahir nasabah terlebih dahulu.');return false;}
    return true;
  }

  function openBanding(){
    if(!ensureIdentityBeforeAction())return;
    renderBanding();
    window.bukaLayar&&window.bukaLayar('RAYA_BANDING');
  }

  function renderBanding(){
    const w=$('layarRAYABanding'); if(!w)return;
    const base=readInput();
    const p={nama:base.name,tglLahir:base.dob};
    const currentPlan=base.plan;
    w.innerHTML='<div class="kop"><h2>Bandingkan RAYA Pro Maxima</h2><p>Nama dan tanggal lahir mengikuti Profil Nasabah aktif. ADB otomatis dihitung dan ditambahkan ke total kontribusi.</p>'+ 
      '<div class="identitas"><div>Nama nasabah<b>'+esc(p.nama||'—')+'</b></div><div>Usia masuk<b>'+esc(String(base.age==null?'—':base.age))+' tahun</b></div><div>Frekuensi<b>'+esc(base.freq)+'</b></div><div>Plan awal<b>'+esc(currentPlan==='TJA1'?'5–15':'5–20')+'</b></div></div></div>'+ 
      '<div class="blok tanpa-cetak"><h2>Apa yang ingin dibandingkan?</h2><div class="raya-compare-mode"><button type="button" class="sakelar raya-mode" data-mode="term" aria-pressed="true">Bandingkan Masa Asuransi</button><button type="button" class="sakelar raya-mode" data-mode="contribution" aria-pressed="false">Bandingkan Kontribusi Dasar</button></div><div id="rayaBandingForm"></div></div>'+ 
      '<div class="blok" id="rayaBandingHasil"><p class="catatan">Pilih jenis perbandingan.</p></div>'+ 
      '<div class="blok tanpa-cetak raya-actions raya-band-actions"><button type="button" class="aksi sekunder psg-preview-btn" id="rayaBandPreview">👁 Preview</button><button type="button" class="aksi sekunder" id="rayaBandCetak" data-preview-attached="1">🖨 Cetak / PDF</button><button type="button" class="aksi sekunder btn-simpan-library" id="rayaBandSaveLibrary">📚 Simpan ke Library</button></div>';
    w.querySelectorAll('.raya-mode').forEach(b=>b.onclick=()=>{w.querySelectorAll('.raya-mode').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));renderBandingForm(b.dataset.mode);});
    renderBandingForm('term');
  }

  function renderBandingForm(mode){
    const f=$('rayaBandingForm'); if(!f)return;
    const base=readInput();
    if(mode==='term'){
      f.innerHTML='<p class="catatan">Kontribusi dasar tetap sama. Sistem menghitung ADB masing-masing plan lalu menampilkan total kontribusi.</p><div class="baris satu"><div><label>Kontribusi dasar per '+freqLabel(base.freq)+'</label><input id="rayaBandTermContribution" type="text" inputmode="numeric" value="'+esc(fmtInput(base.basicPer))+'"></div></div><button type="button" class="aksi" id="rayaBandTermRun">Bandingkan 5–15 vs 5–20</button>';
      const inp=$('rayaBandTermContribution'); inp?.addEventListener('input',()=>{inp.value=fmtInput(parseNominal(inp.value));});
      $('rayaBandTermRun')?.addEventListener('click',()=>bandingTerm(parseNominal(inp.value)));
    }else{
      f.innerHTML='<p class="catatan">Masa asuransi tetap '+(base.plan==='TJA1'?'5–15':'5–20')+'. Masukkan sampai 3 pilihan kontribusi dasar. ADB dan total kontribusi akan digenerate otomatis.</p><div class="baris">'+[1,2,3].map((n,ix)=>'<div><label>Kontribusi '+n+' per '+freqLabel(base.freq)+'</label><input type="text" inputmode="numeric" class="rayaBandContribution" data-i="'+n+'" value="'+(ix===0?esc(fmtInput(base.basicPer)):'')+'" placeholder="Rp 0"></div>').join('')+'</div><button type="button" class="aksi" id="rayaBandContributionRun">Bandingkan kontribusi</button>';
      f.querySelectorAll('.rayaBandContribution').forEach(inp=>inp.addEventListener('input',()=>inp.value=fmtInput(parseNominal(inp.value))));
      $('rayaBandContributionRun')?.addEventListener('click',()=>bandingContribution(Array.from(f.querySelectorAll('.rayaBandContribution')).map(x=>parseNominal(x.value)).filter(x=>x>0)));
    }
  }

  function scenario(plan,basicPer,freq,age){
    return E.calculate({plan,basicContribution:basicPer,freq,age});
  }
  function card(r,label){
    const valid=r.ok;
    return '<div class="raya-compare-card '+(valid?'':'tidak-valid')+'"><h3>'+esc(label)+'</h3><div class="raya-compare-main">'+rp(r.up)+'</div><div class="raya-card-validity">'+(valid?'✓ Memenuhi ketentuan':'⚠ Tidak memenuhi ketentuan')+'</div><small>UP dasar</small><dl>'+ 
      '<div><dt>Kontribusi dasar</dt><dd>'+rp(r.basicPerPayment)+'</dd></div>'+ 
      '<div><dt>ADB wajib</dt><dd>'+rp(r.adbUp)+'</dd></div>'+ 
      '<div><dt>Kontribusi ADB</dt><dd>'+rp(r.adbPer)+'</dd></div>'+ 
      '<div><dt>Total kontribusi</dt><dd>'+rp(r.totalPer)+'</dd></div>'+ 
      '<div><dt>Manfaat tahunan</dt><dd>'+rp(r.annualBenefit)+'</dd></div>'+ 
      '<div><dt>Manfaat akhir</dt><dd>'+rp(r.maturity)+'</dd></div>'+ 
      '<div><dt>Usia maksimal masuk</dt><dd>'+r.maxEntryAge+' tahun</dd></div></dl></div>';
  }
  function bandingTerm(basicPer){
    const base=readInput();
    const rs=[scenario('TJA1',basicPer,base.freq,base.age),scenario('TJA2',basicPer,base.freq,base.age)];
    $('rayaBandingHasil').innerHTML='<h2>Hasil perbandingan masa asuransi</h2><div class="raya-compare-grid">'+card(rs[0],'5–15 tahun')+card(rs[1],'5–20 tahun')+'</div>'+ 
      '<p class="catatan">Kontribusi dasar sama; perbedaan kontribusi ADB dan total kontribusi mengikuti rate ADB masing-masing masa asuransi. Plan yang tidak memenuhi batas usia ditandai pada kartu.</p>';
    if(base.age!=null && base.age>50){$('rayaBandingHasil').querySelectorAll('.raya-compare-card')[1].classList.add('tidak-valid');}
  }
  function bandingContribution(vals){
    if(vals.length<2){alert('Masukkan minimal 2 pilihan kontribusi dasar.');return;}
    const base=readInput();
    const cards=vals.slice(0,3).map((v,i)=>card(scenario(base.plan,v,base.freq,base.age),'Pilihan '+(i+1)));
    $('rayaBandingHasil').innerHTML='<h2>Hasil perbandingan kontribusi dasar</h2><div class="raya-compare-grid">'+cards.join('')+'</div><p class="catatan">ADB bukan input manual. Setiap pilihan menghasilkan kontribusi ADB otomatis, lalu total kontribusi = kontribusi dasar + kontribusi ADB.</p>';
  }

  function cetak(){
    if(!ensureIdentityBeforeAction()) return;
    if(!terakhir?.r?.ok){alert('Hasil RAYA belum memenuhi ketentuan. Perbaiki data terlebih dahulu sebelum mencetak.');return;}
    const name=String($('rayaNama')?.value||'Nasabah').trim();
    const old=document.title; document.title='RAYA Pro Maxima - '+name; window.print(); setTimeout(()=>document.title=old,1000);
  }
  function preview(){
    if(!ensureIdentityBeforeAction()) return;
    if(!terakhir?.r?.ok){alert('Hasil RAYA belum memenuhi ketentuan. Perbaiki data terlebih dahulu sebelum Preview.');return;}
    if(window.PSGPrintPreview?.open) window.PSGPrintPreview.open();
    else window.print();
  }
  function simpanLibrary(){
    if(!ensureIdentityBeforeAction()) return;
    if(!terakhir?.r?.ok){alert('Hasil RAYA belum memenuhi ketentuan. Perbaiki data terlebih dahulu sebelum menyimpan ke Library.');return;}
    if(window.InsuranceHubLibrary?.saveCurrent){
      window.InsuranceHubLibrary.saveCurrent();
    }else{
      alert('Fitur Library belum tersedia pada halaman ini.');
    }
  }
  function bandingPreview(){
    if(!ensureIdentityBeforeAction()) return;
    if(document.querySelector('#rayaBandingHasil .tidak-valid')){alert('Ada pilihan RAYA yang tidak memenuhi ketentuan. Perbaiki pilihan terlebih dahulu sebelum Preview.');return;}
    if(window.PSGPrintPreview?.open) window.PSGPrintPreview.open();
    else window.print();
  }
  function bandingCetak(){
    if(!ensureIdentityBeforeAction()) return;
    if(document.querySelector('#rayaBandingHasil .tidak-valid')){alert('Ada pilihan RAYA yang tidak memenuhi ketentuan. Perbaiki pilihan terlebih dahulu sebelum mencetak.');return;}
    const name=String($('rayaNama')?.value||'Nasabah').trim();
    const old=document.title;
    document.title='Bandingkan RAYA Pro Maxima - '+name;
    window.print();
    setTimeout(()=>document.title=old,1000);
  }
  function bandingSimpanLibrary(){
    if(!ensureIdentityBeforeAction()) return;
    if(document.querySelector('#rayaBandingHasil .tidak-valid')){alert('Ada pilihan RAYA yang tidak memenuhi ketentuan. Perbaiki pilihan terlebih dahulu sebelum menyimpan ke Library.');return;}
    if(window.InsuranceHubLibrary?.saveCurrent) window.InsuranceHubLibrary.saveCurrent();
    else alert('Fitur Library belum tersedia pada halaman ini.');
  }

  function bind(){
    /* Identitas diisi oleh Customer Profile global, sama seperti Gen Pro standalone.
       Profil aktif menjadi default; selector "Ketik manual" mempertahankan input
       untuk prospek yang belum disimpan. */

    const k=$('rayaKontribusi');
    if(k){k.addEventListener('input',()=>k.value=fmtInput(parseNominal(k.value)));k.addEventListener('change',calc);}
    ['rayaPlan','rayaFreq','rayaNama','rayaTglLahir'].forEach(id=>$(id)?.addEventListener('change',calc));
    ['rayaNama','rayaTglLahir'].forEach(id=>$(id)?.addEventListener('input',calc));

    $('rayaHitung')?.addEventListener('click',()=>{if(ensureIdentityBeforeAction())calc();});
    $('rayaCetak')?.addEventListener('click',cetak);
    $('rayaPreview')?.addEventListener('click',preview);
    $('rayaSaveLibrary')?.addEventListener('click',simpanLibrary);
    $('rayaBandingBuka')?.addEventListener('click',openBanding);

    document.addEventListener('click',function(e){
      const id=e.target?.id;
      if(id==='rayaBandPreview'){e.preventDefault();bandingPreview();}
      else if(id==='rayaBandCetak'){e.preventDefault();bandingCetak();}
      else if(id==='rayaBandSaveLibrary'){e.preventDefault();bandingSimpanLibrary();}
    });

    if(typeof window.bukaLayar==='function' && !window.bukaLayar.__rayaHook){
      const asli=window.bukaLayar;
      const bungkus=function(nama){
        const hasil=asli.apply(this,arguments);
        if(nama==='RAYA')setTimeout(calc,20);
        if(nama==='RAYA_BANDING')setTimeout(renderBanding,20);
        return hasil;
      };
      bungkus.__rayaHook=true;
      Object.keys(asli).forEach(k=>{bungkus[k]=asli[k];});
      window.bukaLayar=bungkus;
      if(window.InsuranceHubNavigation)window.InsuranceHubNavigation.bukaLayar=bungkus;
    }
    calc();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.InsuranceHubRaya={calc,profilAktif,openBanding};
})();
