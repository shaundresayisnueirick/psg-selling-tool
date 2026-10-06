/* PSG Selling Tools — Universal Print Preview
 * Preview mengikuti tema layar aktif. Cetak/PDF tetap netral melalui CSS print.
 * v28.1: identitas konsultan otomatis ditempel pada dokumen client-facing.
 */
(function(){
  'use strict';
  const SELECTOR='button.aksi,button.sakelar,button.secondary,button.sekunder';
  const isPrintButton=b=>{const t=(b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return /(cetak|print|simpan\s+(sebagai|ke)\s+pdf|pdf)/i.test(t)};
  const getActive=()=>document.querySelector('[data-psg-preview-source].aktif')||document.querySelector('.layar.aktif')||document.querySelector('main');
  const excluded=id=>['layarLibraryIlustrasi','layarKartuKonsultan','layarProduk','layarProfile','layarAktivitas','layarSlipKomisi'].includes(id);
  /* Bila sebuah ilustrasi lama sedang dibuka dari Library, identitasnya
     diambil dari potret yang tersimpan bersama ilustrasi itu. */
  const consultant=()=>{try{
    if(window.__psgKonsultanCetak) return window.__psgKonsultanCetak;
    return window.InsuranceHubConsultantCard?.read?.()||JSON.parse(localStorage.getItem('insuranceHub.konsultan.v1')||'{}')}catch(_){return {}}};
  const photo=()=>{try{ const c=consultant();
    if(c&&typeof c.foto==='string') return c.foto;
    if(c&&c.atasNama) return c.fotoAgen||'';
    return localStorage.getItem('insuranceHub.agen.foto.v1')||''}catch(_){return ''}};
  const waDigits=v=>String(v||'').replace(/\D/g,'').replace(/^0/,'62');
  const waLink=v=>{const d=waDigits(v);return d?'https://wa.me/'+d:''};
  const qrSrc=v=>{const u=waLink(v);return u?'https://quickchart.io/qr?size=180&margin=2&text='+encodeURIComponent(u):''};
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  /* Yang tercetak adalah nama akunnya, bukan URL panjang: dokumen nasabah
     lebih enak dibaca dengan "@wulan" daripada "https://instagram.com/wulan". */
  function rapihkanTautan(v){
    let t=String(v==null?'':v).trim();
    t=t.replace(/^https?:\/\//i,'').replace(/^www\./i,'');
    t=t.replace(/^(instagram|tiktok|facebook|linkedin|youtube)\.com\//i,'');
    t=t.replace(/\/+$/,'');
    return t||String(v||'');
  }
  function consultantNode(){
    const c=consultant();
    if(!c.nama&&!c.whatsapp&&!c.email)return null;
    const wrap=document.createElement('div'); wrap.className='psg-consultant-print';
    const f=photo(); if(f){const img=document.createElement('img');img.className='psg-consultant-photo';img.src=f;img.alt='Foto konsultan';wrap.appendChild(img)}
    const meta=document.createElement('div');meta.className='psg-consultant-meta';
    const n=document.createElement('div');n.className='psg-consultant-name';n.textContent=c.nama||'Konsultan';meta.appendChild(n);
    const r=document.createElement('div');r.className='psg-consultant-role';r.textContent=c.jabatan||'Financial Consultant';meta.appendChild(r);
    const contact=[c.whatsapp&&('WhatsApp: '+c.whatsapp),c.email&&('Email: '+c.email)].filter(Boolean).join('  ·  ');
    if(contact){const ct=document.createElement('div');ct.className='psg-consultant-contact';ct.textContent=contact;meta.appendChild(ct)}
    /* Media sosial ikut tercetak. Sebelumnya blok ini hanya memuat nama,
       jabatan, WhatsApp, email, dan QR — kolom Instagram sampai YouTube
       tersimpan tetapi tidak pernah muncul di dokumen mana pun. */
    const sosial=[['Instagram','instagram'],['TikTok','tiktok'],['Facebook','facebook'],
      ['LinkedIn','linkedin'],['YouTube','youtube']]
      .filter(function(x){return c[x[1]]})
      .map(function(x){return x[0]+': '+rapihkanTautan(c[x[1]])});
    if(sosial.length){
      const so=document.createElement('div');
      so.className='psg-consultant-social';
      so.textContent=sosial.join('  ·  ');
      meta.appendChild(so);
    }
    wrap.appendChild(meta);
    if(c.qr==='YA'&&c.whatsapp){const src=qrSrc(c.whatsapp);if(src){const q=document.createElement('img');q.className='psg-consultant-qr';q.src=src;q.alt='QR WhatsApp';wrap.appendChild(q)}}
    return wrap;
  }
  /* ---------- Rapat halaman saat mencetak ----------
     Blok yang lebih tinggi dari ambang di bawah diizinkan terbelah antarhalaman,
     supaya tidak melompat utuh ke halaman berikutnya dan meninggalkan ruang
     kosong besar sesudah header. Blok pendek tidak disentuh, jadi kartu-kartu
     kecil tetap utuh persis seperti sekarang.

     Ambangnya sengaja tinggi: hanya blok yang memang tidak muat pada sisa
     halaman yang terpengaruh. Kelasnya dilepas lagi begitu pencetakan selesai,
     jadi tampilan layar tidak pernah berubah. */
  var AMBANG_BLOK_PANJANG = 620;   // piksel CSS

  function tandaiBlokPanjang(){
    try{
      var simpul=document.querySelectorAll('.blok');
      for(var i=0;i<simpul.length;i++){
        var n=simpul[i];
        if(n.offsetParent===null) continue;                 // tidak terlihat
        if(n.getBoundingClientRect().height>AMBANG_BLOK_PANJANG)
          n.classList.add('psg-blok-panjang');
      }
    }catch(_){}
  }

  function lepasBlokPanjang(){
    try{
      var simpul=document.querySelectorAll('.psg-blok-panjang');
      for(var i=0;i<simpul.length;i++) simpul[i].classList.remove('psg-blok-panjang');
    }catch(_){}
  }

  if(typeof window.addEventListener==='function'){
    window.addEventListener('beforeprint',tandaiBlokPanjang);
    window.addEventListener('afterprint',lepasBlokPanjang);
    /* Safari iOS tidak selalu mengirim beforeprint, jadi matchMedia dipakai
       sebagai jalur kedua. */
    try{
      if(typeof window.matchMedia==='function'){
        var mq=window.matchMedia('print');
        var pantau=function(e){ if(e.matches) tandaiBlokPanjang(); else lepasBlokPanjang(); };
        if(typeof mq.addEventListener==='function') mq.addEventListener('change',pantau);
        else if(typeof mq.addListener==='function') mq.addListener(pantau);
      }
    }catch(_){}
  }


  /* ---------- Pecah tabel lebar saat mencetak ----------
     Timeline gabungan bisa punya 10 kolom atau lebih. Dipaksa muat ke satu
     halaman, kolom angka yang nowrap merebut seluruh ruang dan kolom teks
     terakhir tergencet sampai tumpang tindih — persis gejala yang dilaporkan,
     dan tidak tertolong walaupun skala cetak diturunkan ke 50%.

     Mekanisme ini disalin apa adanya dari program-summary.html, yang sudah
     memakainya sejak lama dan hasilnya rapi: tabel dipecah horizontal menjadi
     beberapa bagian, masing-masing selebar halaman, dengan kolom identitas
     (tahun polis, usia, premi) diulang di tiap bagian.

     Sebelumnya mekanisme ini HANYA ada di halaman ringkasan terpisah, tidak
     di dalam aplikasi — karena itu cetakan dari layar program rusak sementara
     cetakan dari halaman ringkasan baik-baik saja. */
/* Sel dipilih menurut POSISI KOLOM, bukan urutan DOM. Baris seperti "Total"
   memakai colspan (mis. colspan=4 untuk Slot–UP). Kalau sel diambil menurut
   urutan DOM, baris itu mendapat lebih banyak kolom daripada judulnya: kolom
   tambahan tidak punya lebar di tabel fixed sehingga angkanya tergencet dan
   bertumpuk, dan pada bagian berikutnya angka Total bergeser ke kolom yang
   salah. Sel yang menutupi beberapa kolom terpilih yang bersebelahan
   digabung kembali dengan colspan yang sesuai. */
function selPadaKolom(tr,kolom){
  const peta=[];
  let pos=0;
  [...tr.children].forEach(c=>{const n=Math.max(1,c.colSpan||1);for(let k=0;k<n;k++)peta[pos+k]=c;pos+=n;});
  const hasil=[];
  kolom.forEach(i=>{
    const c=peta[i];
    const akhir=hasil[hasil.length-1];
    if(c&&akhir&&akhir.src===c){akhir.span++;return;}
    hasil.push({src:c,span:1});
  });
  return hasil.map(h=>{
    const sel=h.src?h.src.cloneNode(true):document.createElement('td');
    if(h.span>1)sel.colSpan=h.span;else sel.removeAttribute('colspan');
    return sel;
  });
}
function makePrintSplit(table){
  const existing=table.parentElement.querySelector(':scope > .print-split');
  if(existing)existing.remove();
  const headRow=table.querySelector('thead tr:first-child');
  const bodyRows=[...table.querySelectorAll('tbody tr')];
  if(!headRow)return false;
  const n=[...headRow.children].reduce((a,c)=>a+Math.max(1,c.colSpan||1),0);
  // Timeline COMBO bisa mempunyai banyak kolom benefit. Untuk PDF, jangan
  // mengecilkan semuanya sampai overlap: pecah horizontal menjadi beberapa
  // tabel yang masing-masing tetap selebar halaman, dengan kolom identitas
  // (tahun/usia/premi) diulang agar pembaca tetap tahu baris yang sama.
  if(n<=6)return false;

  const anchor=[0,1,2].filter(i=>i<n);
  const remaining=[...Array(n).keys()].filter(i=>!anchor.includes(i));
  const groups=[];
  // Untuk layout PDF yang rapi: 4 kolom benefit awal, lalu CI+Angioplasty,
  // lalu Pencairan+UP Aktif+Keterangan. Ini menjaga kolom panjang tidak
  // dipaksa berhimpitan. Jika struktur benefit berbeda, fallback tetap 4 kolom/grup.
  if(remaining.length===9){
    groups.push(remaining.slice(0,4));
    groups.push(remaining.slice(4,6));
    groups.push(remaining.slice(6));
  }else{
    const MAX_DATA_COLS=4;
    for(let i=0;i<remaining.length;i+=MAX_DATA_COLS){
      groups.push(remaining.slice(i,i+MAX_DATA_COLS));
    }
  }
  if(groups.length<2)return false;

  const wrap=document.createElement('div');
  wrap.className='print-split';

  function makeTable(indices,label){
    const part=document.createElement('div');
    part.className='split-part';
    const lab=document.createElement('div');
    lab.className='split-label';
    lab.textContent=label;
    part.appendChild(lab);

    const nt=document.createElement('table');
    nt.className=table.className;
    nt.setAttribute('data-print-timeline-part','1');

    const col=document.createElement('colgroup');
    const count=anchor.length+indices.length;
    for(let i=0;i<count;i++){
      const c=document.createElement('col');
      if(i===0)c.style.width='7%';
      else if(i===1)c.style.width='7%';
      else if(i===2)c.style.width='18%';
      else c.style.width=((100-7-7-18)/(count-3)).toFixed(2)+'%';
      col.appendChild(c);
    }
    nt.appendChild(col);

    const thead=document.createElement('thead');
    const hr=document.createElement('tr');
    selPadaKolom(headRow,[...anchor,...indices]).forEach(c=>hr.appendChild(c));
    thead.appendChild(hr);
    nt.appendChild(thead);

    const tbody=document.createElement('tbody');
    bodyRows.forEach(tr=>{
      const nr=document.createElement('tr');
      selPadaKolom(tr,[...anchor,...indices]).forEach(c=>nr.appendChild(c));
      tbody.appendChild(nr);
    });
    nt.appendChild(tbody);
    part.appendChild(nt);
    return part;
  }

  /* Judul pecahan mengikuti tabelnya bila diberi data-print-label (mis. tabel
     detail komponen program); tanpa penanda tetap "Timeline Program". */
  const judul=table.getAttribute('data-print-label')||'Timeline Program';
  groups.forEach((g,idx)=>{
    const label=judul+' — bagian '+(idx+1)+'/'+groups.length;
    wrap.appendChild(makeTable(g,label));
  });

  table.style.display='none';
  table.parentElement.appendChild(wrap);
  table.dataset.printSplit='1';
  return true;
}

  /* Hanya membersihkan pecahan buatan berkas INI.

     program-summary.html punya pemecah timeline sendiri yang juga berjalan
     pada beforeprint. Dulu fungsi ini menghapus SEMUA .print-split — termasuk
     pecahan buatan halaman itu — lalu hanya memecah ulang bila lebarnya
     melewati ambang. Kalau tidak melewati, timeline 11 kolom dibiarkan utuh
     dan kolom kanannya tergencet sampai satu huruf per baris.

     Sekarang pecahan buatan sini diberi tanda data-psg-split="preview", dan
     hanya yang bertanda itu yang dibersihkan. */
  function bersihkanPecahan(){
    try{
      document.querySelectorAll('.print-split[data-psg-split="preview"]').forEach(x=>x.remove());
      document.querySelectorAll('table[data-psg-split="preview"]').forEach(t=>{
        t.style.display=''; delete t.dataset.printSplit; delete t.dataset.psgSplit;
      });
    }catch(_){}
  }

  /* Lebar kertas yang benar-benar bisa dipakai, dalam piksel CSS pada 96 dpi.
     A4 lanskap 297mm dikurangi margin 8mm kiri-kanan = 281mm ~ 1062px.
     Angka ini sengaja longgar supaya tabel yang selama ini tercetak rapi
     tidak ikut dipecah. */
  var LEBAR_CETAK_MAKS = 1040;

  /* Lebar alami tabel bila tidak dipaksa mengecil. Diukur sementara lalu
     dikembalikan persis seperti semula. */
  function lebarAlami(t){
    var simpan = [t.style.width, t.style.maxWidth, t.style.tableLayout];
    try{
      t.style.width = 'max-content';
      t.style.maxWidth = 'none';
      t.style.tableLayout = 'auto';
      return t.scrollWidth || 0;
    } finally {
      t.style.width = simpan[0];
      t.style.maxWidth = simpan[1];
      t.style.tableLayout = simpan[2];
    }
  }

  function pecahTabelLebar(){
    bersihkanPecahan();
    try{
      const ruang = document.querySelector('.layar.aktif')
        || document.querySelector('[data-psg-preview-source]')
        || document.body;
      ruang.querySelectorAll('table').forEach(function(t){
        /* Jangan sentuh tabel yang sudah dipecah pihak lain, maupun
           potongan hasil pemecahan itu sendiri. */
        if(t.dataset.printSplit === '1') return;
        if(t.closest('.print-split')) return;
        const kepala = t.querySelector('thead tr:first-child');
        if(!kepala || kepala.children.length <= 6) return;
        /* Dua syarat harus terpenuhi: kolomnya banyak DAN tabelnya memang
           tidak muat di kertas. Tabel berkolom banyak yang selama ini
           tercetak rapi tidak disentuh sama sekali. */
        if(lebarAlami(t) <= LEBAR_CETAK_MAKS) return;
        makePrintSplit(t);
        t.dataset.psgSplit = 'preview';
        const wadah = t.parentElement && t.parentElement.querySelector(':scope > .print-split');
        if(wadah) wadah.dataset.psgSplit = 'preview';
      });
    }catch(_){}
  }

  if(typeof window.addEventListener==='function'){
    window.addEventListener('beforeprint', pecahTabelLebar);
    window.addEventListener('afterprint', bersihkanPecahan);
  }

  function attachIdentity(root,mode){
    if(!root||excluded(root.id)||root.querySelector('.psg-consultant-print'))return null;
    const node=consultantNode(); if(!node)return null;
    if(mode==='preview') node.classList.add('psg-consultant-preview');
    root.appendChild(node); return node;
  }
  /* Kombinasi GSPA + BeSMART Lite Future:
     tabel "Bila terdiagnosa penyakit kritis" sudah benar secara isi,
     tetapi pada cetakan nasabah posisinya diminta berada di bagian bawah,
     setelah seluruh manfaat program. Perubahan ini KHUSUS untuk cetak/preview;
     tampilan kalkulator di layar tetap persis seperti semula. */
  function pindahkanWaiverKMBKeBawah(root){
    if(!root) return null;
    const blokRingkas=root.querySelector('#kKotakRingkas');
    if(!blokRingkas) return null;
    const waiver=Array.from(blokRingkas.querySelectorAll(':scope > .blok')).find(function(n){
      const h=n.querySelector('h3');
      return h && h.textContent.trim().toLowerCase()==='bila terdiagnosa penyakit kritis';
    });
    if(!waiver) return null;

    const target=root.querySelector('#kBlokManfaat');
    if(target && target.parentNode){
      target.insertAdjacentElement('afterend',waiver);
    }else{
      root.appendChild(waiver);
    }
    return waiver;
  }

  /* cloneNode menyalin ATRIBUT HTML, bukan keadaan hidup elemen form.
     Akibatnya <select> pada salinan selalu menampilkan opsi pertama, dan
     <input> menampilkan nilai awalnya — bukan yang dipilih atau diketik agen.
     Itu sebabnya "Masa asuransi" RAYA tetap tertulis 15 tahun di Preview
     walaupun yang dipilih 20 tahun.

     Keadaan hidup disalin dari elemen aslinya ke salinan berdasarkan urutan
     kemunculan, lalu ditulis balik ke atribut supaya ikut tercetak. */
  function salinKeadaanForm(asli, clone){
    try{
      const pasangan = [['select','select'],['input','input'],['textarea','textarea']];
      pasangan.forEach(([sel])=>{
        const a = asli.querySelectorAll(sel), b = clone.querySelectorAll(sel);
        for(let i=0;i<a.length && i<b.length;i++){
          const src=a[i], dst=b[i];
          if(sel==='select'){
            const opsi=dst.querySelectorAll('option');
            opsi.forEach(o=>o.removeAttribute('selected'));
            const idx=src.selectedIndex;
            if(idx>=0 && opsi[idx]){ opsi[idx].setAttribute('selected','selected'); dst.value=src.value; }
          } else if(src.type==='checkbox' || src.type==='radio'){
            if(src.checked) dst.setAttribute('checked','checked'); else dst.removeAttribute('checked');
            dst.checked=src.checked;
          } else {
            dst.setAttribute('value', src.value==null?'':src.value);
            dst.value=src.value;
            if(sel==='textarea') dst.textContent=src.value==null?'':src.value;
          }
        }
      });
    }catch(_){}
  }

  /* Blok <details> bertanda data-cetak-buka (mis. "Detail komponen pembentuk
     program") dilipat di layar tetapi isinya bagian dokumen nasabah. Browser
     hanya mencetak judul <details> yang tertutup, jadi blok ini dibuka di
     Preview dan selama mencetak, lalu dikembalikan seperti semula. */
  const DETAIL_CETAK='details[data-cetak-buka]';
  let detailDibuka=[];
  function bukaDetailCetak(){
    document.querySelectorAll(DETAIL_CETAK+':not([open])').forEach(d=>{d.open=true;detailDibuka.push(d)});
  }
  function tutupDetailCetak(){
    detailDibuka.forEach(d=>{d.open=false});
    detailDibuka=[];
  }

  function cleanClone(clone){
    /* Tombol kontrol dibuang. Tombol yang sekaligus menjadi gambar dokumen
       (mis. atap dan lapis Segitiga Financial) ditandai data-preview-preserve:
       tetap tampil, tetapi tidak bisa difokus atau diklik di Preview. */
    clone.querySelectorAll('.tanpa-cetak,[data-preview-hide],button:not([data-preview-preserve])').forEach(n=>n.remove());
    clone.querySelectorAll('button[data-preview-preserve]').forEach(n=>{n.setAttribute('tabindex','-1');n.setAttribute('aria-disabled','true');n.style.pointerEvents='none'});
    clone.querySelectorAll(DETAIL_CETAK).forEach(d=>{d.open=true});
    /* Pindahkan sebelum ID dibersihkan agar helper dapat mengenali struktur
       khusus halaman Kombinasi. */
    pindahkanWaiverKMBKeBawah(clone);
    clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    clone.querySelectorAll('[name]').forEach(n=>n.removeAttribute('name'));
    return clone;
  }
  function close(modal){if(modal)modal.remove();document.documentElement.classList.remove('psg-preview-open');document.body.classList.remove('psg-preview-open')}
  function showPreview(){
    const active=getActive(); if(!active){alert('Tidak ada hasil yang bisa dipreview.');return}
    let modal=document.getElementById('psgPrintPreviewModal'); if(modal)modal.remove();
    modal=document.createElement('div');modal.id='psgPrintPreviewModal';modal.className='psg-print-preview-modal';
    const card=document.createElement('div');card.className='psg-print-preview-card';
    const head=document.createElement('div');head.className='psg-print-preview-head';
    const title=document.createElement('strong');title.textContent='Preview Ilustrasi / Ringkasan';
    const actions=document.createElement('div');actions.className='psg-print-preview-actions';
    const print=document.createElement('button');print.type='button';print.className='aksi';print.textContent='🖨 Cetak / PDF';
    const x=document.createElement('button');x.type='button';x.className='sakelar';x.textContent='✕ Tutup';actions.append(print,x);head.append(title,actions);
    const body=document.createElement('div');body.className='psg-print-preview-body';
    const clone=active.cloneNode(true);
    salinKeadaanForm(active, clone);
    attachIdentity(clone,'preview'); body.appendChild(cleanClone(clone));
    card.append(head,body);modal.appendChild(card);document.body.appendChild(modal);
    x.onclick=()=>close(modal);modal.addEventListener('click',e=>{if(e.target===modal)close(modal)});
    print.onclick=()=>{const oldTitle=document.title;const heading=body.querySelector('h1,h2,h3,.judul,.title');if(heading?.textContent?.trim())document.title=heading.textContent.trim();document.body.classList.add('psg-universal-preview-print');window.print();setTimeout(()=>{document.body.classList.remove('psg-universal-preview-print');document.title=oldTitle},1200)};
    document.documentElement.classList.add('psg-preview-open');document.body.classList.add('psg-preview-open');
  }
  function directPrint(button){
    const active=button.closest('.layar.aktif')||getActive();
    const node=attachIdentity(active);
    const oldTitle=document.title;const heading=active?.querySelector('h1,h2,h3,.judul,.title');if(heading?.textContent?.trim())document.title=heading.textContent.trim();
    window.print();setTimeout(()=>{if(node)node.remove();document.title=oldTitle},1200);
  }
  function attach(){
    document.querySelectorAll(SELECTOR).forEach(b=>{
      if(b.dataset.previewAttached==='1'||b.closest('#psgPrintPreviewModal'))return;if(!isPrintButton(b))return;
      b.dataset.previewAttached='1';
      const p=document.createElement('button');p.type='button';p.className='sakelar psg-preview-btn tanpa-cetak';p.dataset.previewHide='1';p.textContent='👁 Preview';p.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showPreview()});b.insertAdjacentElement('afterend',p);
    });
  }
  let beforePrintNode=null;
  let beforePrintWaiver=null;
  let beforePrintWaiverParent=null;
  let beforePrintWaiverNext=null;

  function ensurePrintWaiverPosition(){
    if(beforePrintWaiver) return;
    const active=getActive();
    if(!active || excluded(active.id)) return;
    const parent=active.querySelector('#kKotakRingkas');
    if(!parent) return;
    const waiver=Array.from(parent.querySelectorAll(':scope > .blok')).find(function(n){
      const h=n.querySelector('h3');
      return h && h.textContent.trim().toLowerCase()==='bila terdiagnosa penyakit kritis';
    });
    if(!waiver) return;
    beforePrintWaiver=waiver;
    beforePrintWaiverParent=waiver.parentNode;
    beforePrintWaiverNext=waiver.nextSibling;
    pindahkanWaiverKMBKeBawah(active);
  }

  function restorePrintWaiverPosition(){
    if(!beforePrintWaiver) return;
    try{
      if(beforePrintWaiverParent){
        if(beforePrintWaiverNext && beforePrintWaiverNext.parentNode===beforePrintWaiverParent)
          beforePrintWaiverParent.insertBefore(beforePrintWaiver,beforePrintWaiverNext);
        else
          beforePrintWaiverParent.appendChild(beforePrintWaiver);
      }
    }catch(_){ }
    beforePrintWaiver=null;
    beforePrintWaiverParent=null;
    beforePrintWaiverNext=null;
  }

  function ensurePrintIdentity(){
    if(beforePrintNode) return;
    const active=getActive();
    if(!active || excluded(active.id)) return;
    beforePrintNode=attachIdentity(active,'print');
  }
  function removePrintIdentity(){
    restorePrintWaiverPosition();
    if(beforePrintNode){beforePrintNode.remove();beforePrintNode=null;}
  }
  function init(){
    attach();
    const mo=new MutationObserver(()=>attach());mo.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('beforeprint',ensurePrintWaiverPosition);
    window.addEventListener('beforeprint',ensurePrintIdentity);
    window.addEventListener('beforeprint',bukaDetailCetak);
    window.addEventListener('afterprint',removePrintIdentity);
    window.addEventListener('afterprint',tutupDetailCetak);
    window.PSGPrintPreview={open:showPreview,attach,printWithConsultant:directPrint};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
