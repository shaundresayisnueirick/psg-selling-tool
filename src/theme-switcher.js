(function(){
  'use strict';
  /* Global visual skin switcher.
     Original = the untouched/default PWA appearance.
     Dark = a complete dark + gold skin for the whole screen UI.
     Print is intentionally unaffected by the theme. */
  var KEY='insuranceHub.theme.v3';
  /* Tema diingat per kode agen. Agen yang sama masuk lagi mendapat temanya
     yang terakhir; agen yang belum punya catatan mulai dari tema bawaan.
     Peta ini kecil (satu kata per agen) dan sengaja TIDAK ikut dicadangkan,
     karena tema adalah preferensi perangkat, bukan data nasabah. */
  var PETA_KEY='insuranceHub.theme.byAgent.v1';
  var themes=['original','dark'];

  function get(){
    try{
      var t=localStorage.getItem(KEY);
      return themes.indexOf(t)>=0 ? t : 'original';
    }catch(e){ return 'original'; }
  }

  function normalKode(k){
    return String(k==null?'':k).trim().toUpperCase();
  }

  function kodeAgenAktif(){
    try{
      var l=JSON.parse(localStorage.getItem('insuranceHub.level.v1')||'null');
      if(l&&l.kodeAgen) return normalKode(l.kodeAgen);
      var a=JSON.parse(localStorage.getItem('insuranceHub.agen.v1')||'{}');
      return normalKode(a.kode);
    }catch(e){ return ''; }
  }

  function bacaPeta(){
    try{
      var p=JSON.parse(localStorage.getItem(PETA_KEY)||'{}');
      return (p && typeof p==='object') ? p : {};
    }catch(e){ return {}; }
  }

  function catatUntukAgen(t){
    var kode=kodeAgenAktif();
    if(!kode) return;
    try{
      var p=bacaPeta();
      p[kode]=t;
      localStorage.setItem(PETA_KEY, JSON.stringify(p));
    }catch(e){}
  }

  /* Dipanggil access-gate.js sesudah login berhasil. */
  function pakaiAgen(kode){
    var k=normalKode(kode);
    var p=bacaPeta();
    var t=(k && themes.indexOf(p[k])>=0) ? p[k] : 'original';
    try{ localStorage.setItem(KEY,t); }catch(e){}
    apply(t);
    return t;
  }

  function apply(t){
    if(themes.indexOf(t)<0)t='original';
    document.documentElement.setAttribute('data-theme',t);
    document.body.setAttribute('data-theme',t);
    var b=document.getElementById('btnThemeSwitch');
    if(b){
      b.dataset.theme=t;
      b.setAttribute('aria-label', t==='dark' ? 'Kembali ke tema Original' : 'Gunakan tema Dark Gold');
      b.title=t==='dark' ? 'Tema Dark Gold • klik untuk kembali ke Original' : 'Tema Original • klik untuk tema Dark Gold';
      b.textContent=t==='dark' ? '☀' : '☾';
    }
    var g=document.getElementById('btnThemeGate');
    if(g){
      g.setAttribute('aria-label', t==='dark' ? 'Kembali ke tema Original' : 'Gunakan tema Dark Gold');
      g.title=t==='dark' ? 'Tema Dark Gold • klik untuk kembali ke Original' : 'Tema Original • klik untuk tema Dark Gold';
      g.textContent=t==='dark' ? '☀' : '☾';
    }
    try{
      var meta=document.querySelector('meta[name="theme-color"]');
      if(meta)meta.setAttribute('content',t==='dark'?'#07090D':'#A60101');
    }catch(e){}
  }

  function toggle(){
    var next=get()==='original'?'dark':'original';
    try{localStorage.setItem(KEY,next)}catch(e){}
    catatUntukAgen(next);
    apply(next);
  }

  function ensureHeaderButton(){
    var h=document.querySelector('header#bilah, header');
    if(!h)return;
    if(!document.getElementById('btnThemeSwitch')){
      var wrap=h.querySelector('.header-actions');
      var b=document.createElement('button');
      b.type='button';
      b.id='btnThemeSwitch';
      b.className='theme-switcher tanpa-cetak';
      b.addEventListener('click',toggle);
      if(wrap)wrap.insertBefore(b,wrap.firstChild);
      else h.appendChild(b);
    }
  }

  function ensureGateButton(){
    var gate=document.getElementById('insuranceAccessGate');
    if(!gate)return;
    var b=document.getElementById('btnThemeGate');
    if(!b){
      b=document.createElement('button');
      b.type='button';
      b.id='btnThemeGate';
      b.className='theme-gate-switch tanpa-cetak';
      b.addEventListener('click',toggle);
      gate.appendChild(b);
    }
  }

  function ensurePageButton(){
    /* Standalone summary pages have no #bilah header. Keep the same persisted
       theme available there so navigation never silently returns to Original. */
    if(document.getElementById('btnThemeSwitch') || document.getElementById('btnThemePage')) return;
    var actions=document.querySelector('.actions');
    if(!actions)return;
    var b=document.createElement('button');
    b.type='button';
    b.id='btnThemePage';
    b.className='theme-page-switch tanpa-cetak';
    b.addEventListener('click',toggle);
    actions.insertBefore(b,actions.firstChild);
    apply(get());
  }

  function init(){
    apply(get());
    /* Agen yang sudah memakai aplikasi sebelum fitur ini ada belum punya
       catatan. Tema yang sedang aktif dicatatkan sekali sebagai miliknya,
       supaya temanya tidak hilang saat agen lain sempat masuk. */
    try{
      var kode=kodeAgenAktif();
      if(kode && !Object.prototype.hasOwnProperty.call(bacaPeta(),kode)) catatUntukAgen(get());
    }catch(e){}
    ensureHeaderButton();
    ensureGateButton();
    ensurePageButton();
  }

  document.addEventListener('click',function(e){
    /* Gate can be recreated after logout or auth state changes. */
    if(!document.getElementById('btnThemeGate'))ensureGateButton();
    ensurePageButton();
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.PSGTheme={set:function(t){
    if(themes.indexOf(t)<0)t='original';
    try{localStorage.setItem(KEY,t)}catch(e){}
    catatUntukAgen(t);
    apply(t);
  },get:get,toggle:toggle,pakaiAgen:pakaiAgen,untukAgen:function(kode){
    var p=bacaPeta(), k=normalKode(kode);
    return (k && themes.indexOf(p[k])>=0) ? p[k] : 'original';
  }};
})();