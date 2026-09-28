/* Insurance Hub — shared application core + navigation + Global Customer Profile.
 * Step 9: establishes the first user-facing offline customer data layer.
 */

const el = id => document.getElementById(id);
const rp = n => (n === null || n === undefined || n === '') ? '—' : 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpSingkat = n => {
  if (!n) return 'Rp 0';
  if (n >= 1e9) return 'Rp ' + (n / 1e9).toLocaleString('id-ID', {maximumFractionDigits: 2}) + ' M';
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toLocaleString('id-ID', {maximumFractionDigits: 1}) + ' jt';
  return rp(n);
};
const bAngka = t => Number(String(t ?? '').replace(/[^0-9]/g, '')) || 0;
/* Apostrof ikut di-escape supaya nama seperti D'Souza aman di atribut yang
   memakai kutip tunggal. Entri backslash dibuang karena karakternya tidak
   pernah masuk daftar pencarian, jadi selama ini tidak pernah terpakai. */
const esc = t => String(t === null || t === undefined ? '' : t)
  .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nilaiSegmen = id => {
  const node = el(id);
  const aktif = node && node.querySelector('[aria-pressed="true"]');
  return aktif ? aktif.dataset.nilai : '';
};
const teksBatas = b => b && b.takTerbatas ? 'Tidak terbatas' : (!b || b.nilai == null ? '—' : rp(b.nilai));

const PRODUK = [
  {kode:'GPRO', layar:'GPRO', nama:'Gen Pro', ket:'Proteksi jiwa, pembebasan premi sudah termasuk', siap:true},
  {kode:'COMBO', layar:'COMBO', nama:'Kombinasi Produk (NCP + Cristal Prime + BSL + Gen Aman + iFLEXYGUARD)', ket:'Sampai 9 polis disusun jadi satu rencana', siap:true},
  {kode:'R2', layar:'R2', nama:'Rumah Kedua: KPR vs Gen Aman', ket:'Aset senilai sama, bandingkan beban bulanannya', siap:true},
  {kode:'LF', layar:'LF', nama:'BeSMART Lite Future', ket:'Dana pensiun bertahap + proteksi jiwa', siap:true},
  {kode:'GENWEALTH', layar:'GENWEALTH', nama:'GEN Wealth', ket:'Dwiguna: premi kembali sampai 147% di akhir masa pertanggungan', siap:true},
  {kode:'RAYA', layar:'RAYA', nama:'RAYA Pro Maxima', ket:'Contribution driven: UP dasar + ADB Syariah wajib', siap:true},
  {kode:'BSL', layar:'BSL', nama:'BeSMART Lite - 100 + rider Lite UP + GHP', ket:'Proteksi jiwa sampai 100 tahun, bayar 3/5/10/15/20 tahun', siap:true},
  {kode:'GHP', layar:'GHP', nama:'GenPro + Rider GHP', ket:'UP jiwa dasar dengan diskon tier, rider kesehatan sesuai tagihan, individu & keluarga', siap:true},
  {kode:'GSPA', layar:'GSPA', nama:'Gen Aman (GSPA) + Rider GHPS & Waiver', ket:'Proteksi jiwa sampai usia 100, wakaf & non wakaf, rider kesehatan dan pembebasan kontribusi', siap:true},
  {kode:'KMB', layar:'KMB', nama:'Kombinasi GSPA + Lite Future', ket:'Proteksi jiwa Gen Aman + dana pensiun Lite Future', siap:true},
  {kode:'CRIS', layar:'CRIS', nama:'Cristal Prime', ket:'Sakit kritis 66 kondisi + pengembalian dana', siap:true},
  {kode:'CEM', layar:'CEM', nama:'New Cemerlang Prime', ket:'Proteksi jiwa + pengembalian premi akhir kontrak', siap:true},
  {kode:'FLEX', layar:'FLEX', nama:'iFLEXYGUARD 5', ket:'Manfaat meninggal naik bertahap + Bonus 75', siap:true},
  {kode:'RIZQIA', layar:'RIZQIA', nama:'RIZQIA', ket:'Asuransi jiwa berjangka syariah 10 tahun, kontribusi kembali 100% di akhir kontrak', siap:true},
];
const USIA_PENSIUN = [55, 60, 65, 70, 75];
const pilihan = {}, kustom = {};

// Small UI helpers still used by the legacy-compatible LF/GSPA renderers.
function gspaTier(up, aturan) {
  if (typeof gspaTierEngine === 'function') return gspaTierEngine(up, aturan);
  let d = 0; for (const [batas, nilai] of aturan || []) if (up >= batas) d = nilai; return d;
}
function gspaTarif(tabel, mpp, jk, usia) {
  if (typeof gspaTarifEngine === 'function') return gspaTarifEngine(tabel, mpp, jk, usia);
  const a=tabel[String(mpp)]; const b=a?a[String(jk).toUpperCase()]:null; return b?(b[String(usia)] ?? null):null;
}

const LAYAR = {
  PRODUK:{el:'layarProduk',judul:'Insurance Hub',sub:'Alat hitung agen',kanan:{ke:'PROFILE',teks:'Profil'}},
  PROFILE:{el:'layarProfile',judul:'Profil Nasabah',sub:'Data tersimpan offline di perangkat ini',kiri:'PRODUK'},
  KARTU_KONSULTAN:{el:'layarKartuKonsultan',judul:'Kartu Konsultan',sub:'Identitas konsultan untuk materi dan PDF',kiri:'PRODUK'},
  LIBRARY_ILUSTRASI:{el:'layarLibraryIlustrasi',judul:'Library Nasabah',sub:'Simpan dan temukan kembali hasil konsultasi nasabah dan keluarganya',kiri:'PRODUK'},
  SALES_IDEA:{el:'layarSalesIdea',judul:'Sales Idea',sub:'Sales Idea 10 Jari + 3 alasan memiliki asuransi',kiri:'PRODUK'},
  NEEDS:{el:'layarNeeds',judul:'Analisis Kebutuhan',sub:'Kebutuhan sebelum memilih produk',kiri:'PRODUK',kanan:{ke:'COMPARE',teks:'Bandingkan'}},
  COMPARE:{el:'layarCompare',judul:'Perbandingan Solusi',sub:'Produk yang relevan untuk dibahas',kiri:'PRODUK'},
  PLANNING:{el:'layarPlanning',judul:'Financial Planning',sub:'Perencanaan finansial modular',kiri:'PRODUK'},
  LF:{el:'layarLF',judul:'BeSMART Lite Future',sub:'Dana pensiun bertahap',kiri:'PRODUK',kanan:{ke:'LF_RINGKAS',teks:'Ringkasan'}},
  LF_RINGKAS:{el:'layarRingkasan',judul:'Ringkasan nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'LF'},
  BSL:{el:'layarBSL',judul:'BeSMART Lite - 100',sub:'+ rider Lite UP + GHP, bayar 3/5/10/15/20 tahun',kiri:'PRODUK',kanan:{ke:'BSL_TIME',teks:'Timeline'}},
  BSL_TIME:{el:'layarBSLTime',judul:'Timeline nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'BSL'},
  CRIS:{el:'layarCRIS',judul:'Cristal Prime',sub:'Perlindungan sakit kritis',kiri:'PRODUK',kanan:{ke:'CRIS_ILUS',teks:'Ilustrasi'}},
  CRIS_ILUS:{el:'layarCRISIlus',judul:'Ilustrasi nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'CRIS'},
  CEM:{el:'layarCEM',judul:'New Cemerlang Prime',sub:'Proteksi jiwa + premi kembali',kiri:'PRODUK',kanan:{ke:'CEM_ILUS',teks:'Ilustrasi'}},
  CEM_ILUS:{el:'layarCEMIlus',judul:'Ilustrasi nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'CEM'},
  KMB:{el:'layarKMB',judul:'Kombinasi GSPA + LF',sub:'Proteksi jiwa + dana pensiun',kiri:'PRODUK',kanan:{ke:'KMB_RINGKAS',teks:'Ringkasan'}},
  KMB_RINGKAS:{el:'layarKMBRingkas',judul:'Ringkasan nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'KMB'},
  GSPA:{el:'layarGSPA',judul:'Gen Aman + Rider GHPS & Waiver',sub:'Proteksi jiwa sampai usia 100',kiri:'PRODUK',kanan:{ke:'GSPA_TIME',teks:'Timeline'}},
  GSPA_TIME:{el:'layarGSPATime',judul:'Timeline nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'GSPA'},
  FLEX:{el:'layarFLEX',judul:'iFLEXYGUARD 5',sub:'Proteksi jiwa yang naik sendiri',kiri:'PRODUK',kanan:{ke:'FLEX_ILUS',teks:'Ilustrasi'}},
  FLEX_ILUS:{el:'layarFLEXIlus',judul:'Ilustrasi nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'FLEX'},
  GHP:{el:'layarGHP',judul:'GenPro + Rider GHP',sub:'UP jiwa dasar + kesehatan sesuai tagihan',kiri:'PRODUK',kanan:{ke:'GHP_ILUS',teks:'Ilustrasi'}},
  GHP_ILUS:{el:'layarGHPIlus',judul:'Ilustrasi nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'GHP'},
  DP:{el:'layarDP',judul:'Kebutuhan Dana Pensiun',sub:'Hitung dulu kebutuhannya',kiri:'PLANNING',kanan:{ke:'DP_RINGKAS',teks:'Ringkasan'}},
  DP_RINGKAS:{el:'layarDPRingkas',judul:'Ringkasan Kebutuhan Dana Pensiun',sub:'Untuk ditunjukkan ke prospek',kiri:'DP'},
  FINANCIAL_CALC:{el:'layarFinancialCalc',judul:'Kalkulator Finansial',sub:'Kumpulan kalkulator keuangan',kiri:'PRODUK'},
  KPR:{el:'layarKPR',judul:'Simulasi Cicilan Rumah',sub:'Harga, DP, tenor, bunga',kiri:'PRODUK',kanan:{ke:'KPR_RINGKAS',teks:'Ringkasan'}},
  KPR_RINGKAS:{el:'layarKPRRingkas',judul:'Ringkasan prospek',sub:'Untuk ditunjukkan ke prospek',kiri:'KPR'},
  R2:{el:'layarR2',judul:'Rumah Kedua',sub:'KPR dibandingkan Gen Aman',kiri:'PRODUK',kanan:{ke:'R2_RINGKAS',teks:'Ringkasan'}},
  R2_RINGKAS:{el:'layarR2Ringkas',judul:'Ringkasan prospek',sub:'Untuk ditunjukkan ke prospek',kiri:'R2'},
  PDK:{el:'layarPDK',judul:'Kebutuhan Dana Pendidikan',sub:'Hitung dulu kebutuhannya',kiri:'PLANNING',kanan:{ke:'PDK_RINGKAS',teks:'Ringkasan'}},
  PDK_RINGKAS:{el:'layarPDKRingkas',judul:'Ringkasan Ilustrasi Dana Pendidikan',sub:'Untuk ditunjukkan ke prospek',kiri:'PDK'},
  COMBO:{el:'layarCOMBO',judul:'Kombinasi Produk',sub:'NCP + Cristal + BSL + Gen Aman + iFLEXYGUARD',kiri:'PRODUK',kanan:{ke:'COMBO_RINGKAS',teks:'Ringkasan'}},
  COMBO_RINGKAS:{el:'layarCOMBORingkas',judul:'Ringkasan nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'COMBO'},
  GPRO:{el:'layarGPRO',judul:'Gen Pro',sub:'Proteksi jiwa + pembebasan premi',kiri:'PRODUK',kanan:{ke:'GPRO_RINGKAS',teks:'Ringkasan'}},
  GPRO_RINGKAS:{el:'layarGPRORingkas',judul:'Ringkasan nasabah',sub:'Untuk ditunjukkan ke nasabah',kiri:'GPRO'},
  GPRO_BANDING:{el:'layarGPROBanding',judul:'Bandingkan Gen Pro',sub:'Bandingkan beberapa pilihan tanpa mengubah mode single',kiri:'GPRO'},
  GPRO_BANDING_RINGKAS:{el:'layarGPROBandingRingkas',judul:'Ringkasan Perbandingan Gen Pro',sub:'Untuk ditunjukkan ke nasabah',kiri:'GPRO_BANDING'},
  SOLUSI_SEGITIGA:{el:'layarSegitigaSolusi',judul:'Solusi Segitiga Financial',sub:'Rancangan solusi berdasarkan hasil analisa',kiri:'SEGITIGA'},
  RAYA:{el:'layarRAYA',judul:'RAYA Pro Maxima',sub:'Contribution driven + ADB Syariah wajib',kiri:'PRODUK',kanan:{ke:'RAYA_BANDING',teks:'Bandingkan'}},
  RAYA_BANDING:{el:'layarRAYABanding',judul:'Bandingkan RAYA Pro Maxima',sub:'Bandingkan masa asuransi atau kontribusi dasar',kiri:'RAYA'},
  SOLUSI_HITUNG:{el:'layarSolusiHitung',judul:'Hitung Alternatif',sub:'Hitung seluruh produk dalam satu alternatif',kiri:'SOLUSI'}
};

let layarAktif = 'PRODUK';
const riwayatLayar = [];
let sedangKembali = false;
/* Profil dengan kelanjutan: tujuan sesudah profil dipilih atau disimpan
   ({source, topic, target}, tanpa profileId). Hanya di memori — hilang saat
   muat ulang — dan hanya dipasang lewat InsuranceHubCustomerProfile.bukaUntuk()
   (Sales Idea "Mari Kita Hitung"). Tanpa konteks, alur Profil tetap berakhir
   di Dashboard seperti biasa. */
let cpKonteks = null;
function bukaLayar(nama) {
  if (!LAYAR[nama]) nama = 'PRODUK';
  /* Meninggalkan Profil (Back, Home, tab bar, menutup Sales Idea) membatalkan
     kelanjutan; hanya Profil itu sendiri yang boleh membawanya. */
  if (cpKonteks && nama !== 'PROFILE') cpKonteksHapus();
  if (!sedangKembali && nama !== layarAktif) {
    riwayatLayar.push(layarAktif);
    if (riwayatLayar.length > 30) riwayatLayar.shift();
  }
  layarAktif = nama;
  const s = LAYAR[nama];
  Object.keys(LAYAR).forEach(k => {
    const node = el(LAYAR[k].el);
    if (node) node.classList.toggle('aktif', k === nama);
  });
  const b = el('bilah');
  if (b) {
    b.classList.toggle('ada-kiri', !!s.kiri);
    b.classList.toggle('ada-kanan', !!s.kanan);
  }
  if (el('tblKanan')) el('tblKanan').textContent = s.kanan ? s.kanan.teks : '';
  if (el('judul')) el('judul').textContent = s.judul;
  if (el('subJudul')) el('subJudul').textContent = s.sub;
  window.scrollTo(0, 0);
  if (typeof cpAutoFillOnOpen === 'function') cpAutoFillOnOpen(nama);
  if (nama === 'SALES_IDEA') {
    const renderSalesIdea = () => {
      if (window.SalesIdea10Jari && typeof window.SalesIdea10Jari.init === 'function') window.SalesIdea10Jari.init();
      else setTimeout(renderSalesIdea, 40);
    };
    setTimeout(renderSalesIdea, 20);
  }
  if (nama === 'SOLUSI_HITUNG') {
    const renderHitung = () => {
      if (typeof window.renderCalculationHub === 'function') window.renderCalculationHub();
      else setTimeout(renderHitung, 40);
    };
    setTimeout(renderHitung, 20);
  }
  if (nama === 'SOLUSI_SEGITIGA') {
    const renderSolusi = () => {
      if (window.InsuranceHubSegitigaSolusi && typeof window.InsuranceHubSegitigaSolusi.render === 'function') {
        window.InsuranceHubSegitigaSolusi.render();
      } else setTimeout(renderSolusi, 40);
    };
    setTimeout(renderSolusi, 20);
  }
  if (nama === 'SOLUSI_BANDING') {
    const renderBanding = () => {
      if (window.InsuranceHubSegitigaSolusi && typeof window.InsuranceHubSegitigaSolusi.renderBanding === 'function') {
        window.InsuranceHubSegitigaSolusi.renderBanding();
      } else setTimeout(renderBanding, 40);
    };
    setTimeout(renderBanding, 20);
  }
}
window.bukaLayar = bukaLayar;
window.InsuranceHubNavigation = { LAYAR, bukaLayar };

// Library Ilustrasi — navigasi tetap terpisah dari mesin kalkulator.
(function(){
  const b=document.getElementById('btnLibraryIlustrasi');
  if(b) b.addEventListener('click',()=>window.bukaLayar&&window.bukaLayar('LIBRARY_ILUSTRASI'));
})();

// ===== Shared Generali age rule =====
// Usia berdasarkan ulang tahun terdekat (nearest birthday), mengikuti formula
// yang sudah dipakai di engine Cristal Prime: usia bertambah 1 setelah lewat
// setengah tahun sejak ulang tahun terakhir.
/* Rumus usia bersama ada di src/engines/usia.js. */
function usiaGenerali(tglLahir, hariIni) {
  return ihUsiaGenerali(tglLahir, hariIni);
}

// Perhitungan usia memakai rumus yang sama persis dengan mesin produk dan
// ilustrasi resmi: ROUND(YEARFRAC(tanggal lahir, hari ini), 0), yaitu usia
// pada ulang tahun terdekat. Sebelumnya profil memakai cara sendiri yang
// menghitung selisih tahun kalender, sehingga bisa satu tahun lebih tua
// dibanding kalkulator produk untuk nasabah yang ulang tahunnya belum lewat.

function formatUsiaGenerali(tglLahir, hariIni) {
  const usia = usiaGenerali(tglLahir, hariIni);
  return usia == null ? '' : usia + ' tahun';
}

// ===== Global Customer Profile: local, offline-first, intentionally no cloud =====
const CP_KEY = 'insuranceHub.customerProfiles.v1';
const CP_ACTIVE = 'insuranceHub.customerProfile.active.v1';
function cpRead() {
  try { return JSON.parse(localStorage.getItem(CP_KEY) || '[]'); } catch (_) { return []; }
}
function cpWrite(list) {
  try { localStorage.setItem(CP_KEY, JSON.stringify(list)); return true; } catch (_) { return false; }
}
function cpGetActive() {
  try { return localStorage.getItem(CP_ACTIVE) || ''; } catch (_) { return ''; }
}
function cpSetActive(id) {
  let sebelum = '';
  try { sebelum = localStorage.getItem(CP_ACTIVE) || ''; } catch (_) {}
  try { localStorage.setItem(CP_ACTIVE, id || ''); } catch (_) {}
  /* Berganti profil aktif berarti berganti orang. Pilihan tertanggung milik
     profil lama dilepas supaya layar produk kembali ke "Diri Sendiri" dan
     tidak diam-diam memakai anggota keluarga profil sebelumnya. Selector
     yang sudah terlanjur tergambar juga dibuang agar dibangun ulang dengan
     daftar keluarga profil yang baru. */
  if (sebelum !== (id || '')) {
    cpSelectedFamily = null;
    cpManual.clear();
    try {
      document.querySelectorAll('[data-cp-insured-selector]').forEach(n => n.remove());
    } catch (_) {}
  }
}
function cpUid() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'cp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
function cpRp(id){ return bAngka(el(id)?.value || ''); }
function cpSetRp(id,n){ if(el(id)) el(id).value = n ? Math.round(n).toLocaleString('id-ID') : ''; }
function cpChildrenRead(){
  const box=el('cpAnakList'); if(!box) return [];
  return Array.from(box.querySelectorAll('[data-child-row]')).map(row=>({
    nama: row.querySelector('[data-child-name]')?.value.trim() || '',
    tglLahir: row.querySelector('[data-child-dob]')?.value || '',
    jk: row.querySelector('[data-child-jk]')?.value || 'PRIA',
    biayaPendidikanHariIni: bAngka(row.querySelector('[data-child-edu]')?.value || '')
  })).filter(x=>x.nama || x.tglLahir || x.biayaPendidikanHariIni);
}
function cpChildRow(c={}){
  const box=el('cpAnakList'); if(!box) return;
  const row=document.createElement('div'); row.setAttribute('data-child-row','1'); row.className='blok kecil';
  row.innerHTML='<div class="baris"><div><label>Nama anak</label><input data-child-name type="text" placeholder="Nama anak"></div><div><label>Tanggal lahir</label><input data-child-dob type="date"><div class="usia-live" data-child-age>Usia —</div></div></div>'
    +'<div class="baris"><div><label>Jenis kelamin</label><select data-child-jk><option value="PRIA">Pria</option><option value="WANITA">Wanita</option></select></div><div><label>Target biaya pendidikan hari ini</label><input data-child-edu type="text" inputmode="numeric" placeholder="Rp 0"></div></div>'
    +'<div class="baris"><div><button class="sakelar" data-child-delete type="button">Hapus anak</button></div></div>';
  row.querySelector('[data-child-name]').value=c.nama||''; row.querySelector('[data-child-dob]').value=c.tglLahir||'';
  if(row.querySelector('[data-child-jk]')) row.querySelector('[data-child-jk]').value=c.jk||'PRIA';
  const childDob=row.querySelector('[data-child-dob]');
  const childAge=row.querySelector('[data-child-age]');
  const refreshChildAge=()=>{ const usia=formatUsiaGenerali(childDob.value); childAge.textContent=usia?'Usia '+usia:'Usia —'; };
  childDob.addEventListener('input',refreshChildAge);
  refreshChildAge();
  cpSetRpNode(row.querySelector('[data-child-edu]'),c.biayaPendidikanHariIni||0);
  row.querySelector('[data-child-edu]').addEventListener('input',e=>{const n=bAngka(e.target.value);e.target.value=n?n.toLocaleString('id-ID'):'';});
  row.querySelector('[data-child-delete]').addEventListener('click',()=>row.remove());
  box.appendChild(row);
}
function cpSetRpNode(node,n){ if(node) node.value=n?Math.round(n).toLocaleString('id-ID'):''; }
function cpRelasiLainRead(){
  const box=el('cpRelasiLainList'); if(!box) return [];
  return Array.from(box.querySelectorAll('[data-other-family-row]')).map(row=>({
    id: row.dataset.memberId || cpUid(),
    nama: row.querySelector('[data-other-family-name]')?.value.trim() || '',
    tglLahir: row.querySelector('[data-other-family-dob]')?.value || '',
    jk: row.querySelector('[data-other-family-jk]')?.value || 'PRIA',
    hubungan: row.querySelector('[data-other-family-relation]')?.value || 'Relasi lain'
  })).filter(x=>x.nama || x.tglLahir);
}
function cpRelasiLainRow(c={}){
  const box=el('cpRelasiLainList'); if(!box) return;
  const row=document.createElement('div'); row.setAttribute('data-other-family-row','1'); row.dataset.memberId=c.id||cpUid(); row.className='blok kecil';
  row.innerHTML='<div class="baris"><div><label>Nama</label><input data-other-family-name type="text" placeholder="Nama anggota keluarga / relasi"></div><div><label>Hubungan</label><select data-other-family-relation><option>Cucu</option><option>Saudara</option><option>Keponakan</option><option>Menantu</option><option>Kakek</option><option>Nenek</option><option>Relasi lain</option></select></div></div>'
    +'<div class="baris"><div><label>Tanggal lahir</label><input data-other-family-dob type="date"><div class="usia-live" data-other-family-age>Usia —</div></div><div><label>Jenis kelamin</label><select data-other-family-jk><option value="PRIA">Pria</option><option value="WANITA">Wanita</option></select></div></div>'
    +'<div class="baris"><div><button class="sakelar" data-other-family-delete type="button">Hapus relasi</button></div></div>';
  row.querySelector('[data-other-family-name]').value=c.nama||'';
  row.querySelector('[data-other-family-relation]').value=c.hubungan||'Relasi lain';
  row.querySelector('[data-other-family-dob]').value=c.tglLahir||'';
  row.querySelector('[data-other-family-jk]').value=c.jk||'PRIA';
  const dob=row.querySelector('[data-other-family-dob]'), age=row.querySelector('[data-other-family-age]');
  const refresh=()=>{const usia=formatUsiaGenerali(dob.value);age.textContent=usia?'Usia '+usia:'Usia —'};
  dob.addEventListener('input',refresh); refresh();
  row.querySelector('[data-other-family-delete]').addEventListener('click',()=>row.remove());
  box.appendChild(row);
}
function cpRelasiLainFill(items=[]){ const box=el('cpRelasiLainList'); if(!box)return; box.innerHTML=''; items.forEach(cpRelasiLainRow); }
function cpChildrenFill(children=[]){ const box=el('cpAnakList'); if(!box)return; box.innerHTML=''; (children.length?children:[{}]).forEach(cpChildRow); if(!children.length) box.innerHTML=''; }
function cpFormValue() {
  return {
    nama: el('cpNama').value.trim(), tglLahir: el('cpTgl').value,
    jk: nilaiSegmen('cpJK') || 'PRIA', status: el('cpStatus').value,
    pekerjaan: el('cpPekerjaan').value.trim(), penghasilan: bAngka(el('cpPenghasilan').value),
    hp: el('cpHP').value.trim(), pasangan: el('cpPasangan').value.trim(),
    anak: Math.max(0, Math.min(20, Number(el('cpAnak').value || 0))),
    catatan: el('cpCatatan').value.trim(),
    snapshot: {
      pengeluaran: cpRp('cpPengeluaran'), aset: cpRp('cpAset'), utang: cpRp('cpUtang'), kpr: cpRp('cpKPR'),
      danaDarurat: cpRp('cpDanaDarurat'), upJiwa: cpRp('cpUPJiwa'), upCI: cpRp('cpUPCI'), kesehatan: el('cpHealth')?.value || 'BELUM',
      capturedAt: new Date().toISOString(),
      /* Gaya hidup pensiun ikut tersimpan di profil, supaya kalkulator
         Kebutuhan Dana Pensiun bisa mengambilnya otomatis. */
      pensiun: {
        rutin: cpRp('cpDPRutin'), liburan: cpRp('cpDPLiburan'), hobi: cpRp('cpDPHobi'),
        keluarga: cpRp('cpDPKeluarga'), sehat: cpRp('cpDPSehat'), lain: cpRp('cpDPLain')
      }
    },
    children: cpChildrenRead(),
    family: [
      {id:'self', nama:el('cpNama')?.value.trim()||'', tglLahir:el('cpTgl')?.value||'', jk:nilaiSegmen('cpJK')||'PRIA', hubungan:'Diri Sendiri'},
      /* Nama pasangan pada Data Utama adalah sumber utama identitas pasangan.
         Tanggal lahir tetap diambil dari bagian Keluarga & relasi karena
         memang sengaja diisi di sana. Dengan begitu nama tidak bisa berbeda
         antara dua bagian form, sementara DOB yang sudah pernah diisi tetap
         dipertahankan. */
      {id:'spouse', nama:el('cpPasangan')?.value.trim()||el('cpPasanganRelasi')?.value.trim()||'', tglLahir:el('cpPasanganDob')?.value||'', jk:(nilaiSegmen('cpJK')||'PRIA')==='PRIA'?'WANITA':'PRIA', hubungan:(el('cpStatus')?.value||'')==='Menikah'?'Istri':'Pasangan'},
      {id:'father', nama:el('cpAyah')?.value.trim()||'', tglLahir:el('cpAyahDob')?.value||'', jk:'PRIA', hubungan:'Ayah'},
      {id:'mother', nama:el('cpIbu')?.value.trim()||'', tglLahir:el('cpIbuDob')?.value||'', jk:'WANITA', hubungan:'Ibu'},
      ...cpChildrenRead().map((c,i)=>({id:c.id||'child-'+i,nama:c.nama||'',tglLahir:c.tglLahir||'',jk:c.jk||'',hubungan:'Anak',biayaPendidikanHariIni:c.biayaPendidikanHariIni||0})),
      ...cpRelasiLainRead()
    ].filter(x=>x.id==='self' || x.nama || x.tglLahir)
  };
}
function cpFillForm(p) {
  el('cpNama').value = p.nama || ''; el('cpTgl').value = p.tglLahir || '';
  el('cpTgl')?.dispatchEvent(new Event('input',{bubbles:true}));
  el('cpPekerjaan').value = p.pekerjaan || ''; el('cpPenghasilan').value = p.penghasilan ? p.penghasilan.toLocaleString('id-ID') : '';
  el('cpHP').value = p.hp || ''; el('cpPasangan').value = p.pasangan || '';
  const fam = Array.isArray(p.family) ? p.family : [];
  const spouse = fam.find(x=>x.id==='spouse' || /^(istri|suami|pasangan)$/i.test(x.hubungan||''));
  const father = fam.find(x=>x.id==='father' || /^ayah$/i.test(x.hubungan||''));
  const mother = fam.find(x=>x.id==='mother' || /^ibu$/i.test(x.hubungan||''));
  if(el('cpPasanganRelasi')) el('cpPasanganRelasi').value = p.pasangan || spouse?.nama || '';
  if(el('cpPasanganDob')) el('cpPasanganDob').value = spouse?.tglLahir || '';
  if(el('cpAyah')) el('cpAyah').value = father?.nama || '';
  if(el('cpAyahDob')) el('cpAyahDob').value = father?.tglLahir || '';
  if(el('cpIbu')) el('cpIbu').value = mother?.nama || '';
  if(el('cpIbuDob')) el('cpIbuDob').value = mother?.tglLahir || '';
  el('cpAnak').value = Number.isFinite(p.anak) ? p.anak : (p.children?.length || 0); el('cpCatatan').value = p.catatan || '';
  el('cpStatus').value = p.status || 'Belum menikah';
  el('cpJK').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.nilai === (p.jk || 'PRIA')));
  const s=p.snapshot||{}; cpSetRp('cpPengeluaran',s.pengeluaran||0); cpSetRp('cpAset',s.aset||0); cpSetRp('cpUtang',s.utang||0); cpSetRp('cpKPR',s.kpr||0); cpSetRp('cpDanaDarurat',s.danaDarurat||0); cpSetRp('cpUPJiwa',s.upJiwa||0); cpSetRp('cpUPCI',s.upCI||0);
  const dp=s.pensiun||{}; cpSetRp('cpDPRutin',dp.rutin||0); cpSetRp('cpDPLiburan',dp.liburan||0); cpSetRp('cpDPHobi',dp.hobi||0); cpSetRp('cpDPKeluarga',dp.keluarga||0); cpSetRp('cpDPSehat',dp.sehat||0); cpSetRp('cpDPLain',dp.lain||0);
  if(el('cpHealth')) el('cpHealth').value=s.kesehatan||'BELUM'; cpChildrenFill(p.children||[]);
  const fixedIds=new Set(['self','spouse','father','mother']);
  const extras=(Array.isArray(p.family)?p.family:[]).filter(x=>x && !fixedIds.has(x.id) && !/^child-\d+$/.test(String(x.id||'')) && x.nama);
  cpRelasiLainFill(extras);
}
const CP_COMMON = [
  ['fNama','fTgl','fJK'],['bNama','bTgl','bJK'],['cNama','cTgl','cJK'],['mNama','mTgl','mJK'],
  ['kNama','kTgl','kJK'],['gNama','gTgl','gJK'],['xNama','xTgl',null],['hNama','hTgl','hJK'],
  ['oNama','oTgl','oJK'],['qNama','qTgl','qJK'],['dNama','dTgl',null],['pNama',null,null],
  ['rNama','rTgl','rJK'],['nNama',null,null],
  ['gwNama','gwTgl',null],['rayaNama','rayaTglLahir',null]
];
function cpAutofillAll(p) {
  if (!p) return;
  // Keep the existing product fields as the single UI surface; the profile
  // is only a source for identity data and never overwrites product inputs
  // such as UP, payment term, plan, or protection term.
  CP_COMMON.forEach(([nameId,tglId,jkId]) => {
    if (el(nameId)) {
      el(nameId).value = p.nama || '';
      el(nameId).dispatchEvent(new Event('input',{bubbles:true}));
    }
    if (tglId && el(tglId)) {
      el(tglId).value = p.tglLahir || '';
      el(tglId).dispatchEvent(new Event('input',{bubbles:true}));
    }
    if (jkId && el(jkId)) {
      /* Sebagian tools menulis nilai tombolnya "PRIA"/"WANITA", sebagian lagi
         "Pria"/"Wanita". Pencarian yang hanya memakai huruf besar meleset di
         tools yang memakai bentuk kedua, sehingga jenis kelamin wanita tidak
         pernah terpasang dan tetap pria. Kedua bentuk dicoba. */
      const wanita = String(p.jk || 'PRIA').toUpperCase() === 'WANITA';
      const kandidat = wanita ? ['WANITA', 'Wanita'] : ['PRIA', 'Pria'];
      let aktif = null;
      for (let i = 0; i < kandidat.length && !aktif; i++) {
        aktif = el(jkId).querySelector('[data-nilai="' + kandidat[i] + '"]');
      }
      if (aktif) aktif.click();
    }
  });
  // Fields used by the planning/needs tools that are not part of CP_COMMON.
  if (el('naPenghasilan') && p.penghasilan) {
    el('naPenghasilan').value = Number(p.penghasilan).toLocaleString('id-ID');
    el('naPenghasilan').dispatchEvent(new Event('input',{bubbles:true}));
  }
  if (el('naAnak')) {
    el('naAnak').value = Number(p.anak || (p.children?.length||0));
  }
}
function cpApply(p) {
  if (!p) return;
  cpAutofillAll(p);
  cpSetActive(p.id); cpRender();
  /* Satu-satunya titik akhir alur Profil (Simpan baru, Simpan perubahan,
     Gunakan). Dengan konteks kelanjutan: lanjut ke tujuannya. */
  if (cpKonteks) { const tujuan = cpKonteks.target; cpKonteksHapus(); cpLanjutKe(tujuan); return; }
  bukaLayar('PRODUK');
}
/* Profil hanya langkah perantara: sesudah tujuan dibuka, entri PROFILE
   diangkat dari riwayat supaya Back dari tujuan kembali ke layar sebelum
   Profil (mis. Sales Idea pada scene yang sama), bukan ke Profil. */
function cpLanjutKe(tujuan) {
  bukaLayar(LAYAR[tujuan] ? tujuan : 'PRODUK');
  if (riwayatLayar[riwayatLayar.length - 1] === 'PROFILE') riwayatLayar.pop();
}
function cpKonteksHapus() {
  cpKonteks = null;
  const b = el('cpLanjut');
  if (b) b.hidden = true;
}
/* Membuka layar Profil yang sama dengan Dashboard, dengan tujuan lanjutan.
   Tujuan harus layar terdaftar; selain itu Profil dibuka seperti biasa. */
function cpBukaUntuk(k) {
  const target = String((k && k.target) || '');
  if (!target || target === 'PROFILE' || !LAYAR[target]) { bukaLayar('PROFILE'); return false; }
  cpKonteks = { source: String(k.source || ''), topic: String(k.topic || ''), target: target };
  cpBannerLanjut();
  bukaLayar('PROFILE');
  return true;
}
/* Banner kecil di atas form, hanya selama ada konteks kelanjutan (dibuat
   saat pertama dipakai, jadi layar Profil dari Dashboard tidak berubah).
   Kalimatnya netral karena layar ini bisa terlihat oleh prospek. */
function cpBannerLanjut() {
  let b = el('cpLanjut');
  if (!b) {
    const layar = el('layarProfile'); if (!layar) return;
    b = document.createElement('div');
    b.id = 'cpLanjut'; b.className = 'blok cp-lanjut';
    b.innerHTML = '<h2>Lanjutkan pembahasan Anda</h2>'
      + '<p class="catatan">Data ini akan digunakan untuk membantu menghitung kebutuhan Anda.</p>'
      + '<button class="sakelar" id="cpBuatBaru" type="button" style="min-height:44px">+ Buat Profil Baru</button>';
    const kop = layar.querySelector('.kop');
    layar.insertBefore(b, kop ? kop.nextSibling : layar.firstChild);
    b.querySelector('#cpBuatBaru').addEventListener('click', cpFormBaru);
  }
  b.hidden = false;
}
/* "+ Buat Profil Baru": mekanisme Kosongkan form yang sudah ada, termasuk
   keluar dari mode edit, supaya Simpan membuat profil baru yang bersih. */
function cpFormBaru() {
  cpFillForm({});
  const bar = el('cpStatusBar');
  if (bar) { bar.dataset.editId = ''; bar.textContent = 'Form dikosongkan.'; }
  if (el('cpSimpan')) el('cpSimpan').textContent = 'Simpan profil';
  if (el('cpReset')) el('cpReset').textContent = 'Kosongkan form';
  const nama = el('cpNama');
  if (nama) { nama.scrollIntoView({behavior:'smooth', block:'center'}); nama.focus({preventScroll:true}); }
}
function cpSave() {
  const p = cpFormValue();
  if (!p.nama) { el('cpStatusBar').textContent = 'Nama nasabah wajib diisi sebelum disimpan.'; return; }
  const list = cpRead(); const now = new Date().toISOString();
  const id = el('cpStatusBar').dataset.editId || cpUid();
  const existing = list.find(x => x.id === id);
  const record = {...p, id, createdAt: existing?.createdAt || now, updatedAt: now};
  const next = existing ? list.map(x => x.id === id ? record : x) : [record, ...list];
  if (!cpWrite(next)) { el('cpStatusBar').textContent = 'Gagal menyimpan. Penyimpanan lokal perangkat tidak tersedia.'; return; }
  cpSetActive(id); el('cpStatusBar').dataset.editId = '';
  el('cpStatusBar').textContent = 'Profil tersimpan di perangkat ini. Siap dipakai offline.';
  if (el('cpSimpan')) el('cpSimpan').textContent = 'Simpan profil';
  if (el('cpReset')) el('cpReset').textContent = 'Kosongkan form';
  /* Form kembali bersih: isian profil yang baru disimpan tidak boleh
     terbawa ke profil baru berikutnya. */
  cpFillForm({});
  cpRender(); cpApply(record);
}
function cpEdit(id) {
  const p = cpRead().find(x => x.id === id); if (!p) return;
  cpFillForm(p);
  const bar = el('cpStatusBar');
  if (bar) {
    bar.dataset.editId = id;
    bar.textContent = 'Mode edit aktif. Perubahan belum tersimpan. Klik Simpan perubahan untuk memperbarui profil.';
    bar.scrollIntoView({behavior:'smooth', block:'center'});
  }
  const save = el('cpSimpan');
  if (save) save.textContent = 'Simpan perubahan';
  const reset = el('cpReset');
  if (reset) reset.textContent = 'Batal edit';
  // Keep the edited record visible at the top of the profile form so the
  // user immediately sees that Edit really opened the selected profile.
  const formTop = el('layarProfile')?.querySelector('.kop');
  if (formTop) formTop.scrollIntoView({behavior:'smooth', block:'start'});
}
function cpDelete(id) {
  const next = cpRead().filter(x => x.id !== id); cpWrite(next);
  if (cpGetActive() === id) cpSetActive(''); cpRender();
}
function cpRender() {
  const list = cpRead(), active = cpGetActive();
  const bar = el('profilAktifBar');
  if (bar) {
    const p = list.find(x => x.id === active);
    bar.textContent = p ? 'Profil aktif: ' + p.nama + (p.tglLahir ? ' • lahir ' + p.tglLahir : '') + ' • tersimpan offline di perangkat ini.' : 'Belum ada profil nasabah aktif di perangkat ini.';
  }
  const box = el('cpDaftar'); if (!box) return;
  if (!list.length) { box.innerHTML = '<p class="catatan">Belum ada profil tersimpan.</p>'; return; }
  box.innerHTML = list.map(p => {
    const aktif = p.id === active;
    return '<div class="profil-kartu">'
      + '<div class="nama">' + esc(p.nama) + (aktif ? ' <span class="tag medis">Aktif</span>' : '') + '</div>'
      + '<div class="meta">' + (p.tglLahir || 'Tanggal lahir belum diisi') + ' • ' + (p.jk === 'WANITA' ? 'Wanita' : 'Pria')
      + (p.pekerjaan ? ' • ' + esc(p.pekerjaan) : '') + '</div>'
      + '<div class="aksi-row">'
      + '<button class="aksi" type="button" data-cp-use="' + p.id + '">Gunakan di semua kalkulator</button>'
      + '<button class="sakelar" type="button" data-cp-edit="' + p.id + '">Edit</button>'
      + '<button class="sakelar" type="button" data-cp-delete="' + p.id + '">Hapus</button>'
      + '</div></div>';
  }).join('');
}
/* ===== Family insured selector =====
   Profile aktif tetap menjadi default tertanggung. Selector ini hanya memilih
   anggota keluarga untuk mengisi identitas tertanggung pada layar yang sedang
   dibuka; rumus/UP/plan tidak disentuh. */
const CP_INSURED_KEYS = {
  LF:'fNama', BSL:'bNama', CRIS:'cNama', CEM:'mNama', KMB:'kNama', GSPA:'gNama',
  FLEX:'xNama', GHP:'hNama', DP:'dNama', KPR:'pNama', R2:'rNama', PDK:'nNama',
  COMBO:'oNama', GPRO:'qNama', RAYA:'rayaNama'
};
let cpSelectedFamily = null;
/* Layar yang sedang dalam mode "Ketik manual". Isian di layar ini tidak
   ditimpa oleh profil aktif sampai agen memilih anggota keluarga lagi. */
const cpManual = new Set();
function cpFamilyGender(v){ return String(v||'PRIA').toUpperCase()==='WANITA' ? 'WANITA' : 'PRIA'; }
function cpFamilySelectorLabel(m){
  const age = formatUsiaGenerali(m?.tglLahir||'');
  return (m?.nama || 'Tanpa nama') + ' — ' + (m?.hubungan || 'Diri Sendiri') + (age ? ' · '+age : '');
}
function cpSetProductGender(id, jk){
  const box=el(id); if(!box) return;
  const target=cpFamilyGender(jk), candidates=target==='WANITA'?['WANITA','Wanita']:['PRIA','Pria'];
  for(const c of candidates){ const b=box.querySelector('[data-nilai="'+c+'"]'); if(b){b.click();return;} }
}
function cpRenderInsuredSelector(nama){
  const nameId=CP_INSURED_KEYS[nama];
  if(!nameId || !el(nameId)) return;
  const host=el(nameId).closest('.baris') || el(nameId).parentElement;
  if(!host || !host.parentElement) return;
  const profile=cpRead().find(x=>x.id===cpGetActive());
  if(!profile) return;
  const members=cpFamilyMembers(profile);
  if(!members.length) return;
  /* Selector disisipkan sebagai sibling sebelum .baris input utama. Kalau
     sudah ada, dipakai ulang selama masih MILIK profil aktif yang sama.
     Sebelumnya fungsi ini langsung berhenti begitu menemukan selector lama,
     sehingga setelah profil aktif diganti daftar anggota keluarga di
     dropdown masih milik profil sebelumnya — memilih "Anak" di sana akan
     memasukkan nama dan tanggal lahir anak orang lain ke ilustrasi, dan
     usia yang salah berarti tarif yang salah. */
  const lama=host.parentElement.querySelector('[data-cp-insured-selector]');
  if(lama){
    if(lama.dataset.cpProfileId===String(profile.id)) return;
    lama.remove();
  }
  const wrap=document.createElement('div'); wrap.setAttribute('data-cp-insured-selector','1');
  wrap.dataset.cpProfileId=String(profile.id);
  wrap.className='baris satu cp-insured-picker';
  const field=document.createElement('div');
  field.innerHTML='<label>Data tertanggung</label><select aria-label="Pilih tertanggung"></select><p class="catatan">Default mengikuti profil aktif. Pilih anggota keluarga bila ilustrasi dibuat untuk pasangan, anak, orang tua, cucu, atau relasi lain. Pilih <b>Ketik manual</b> bila ingin mengisi nama dan tanggal lahir sendiri tanpa menyimpan profil.</p>';
  const select=field.querySelector('select');
  /* Pilihan "Ketik manual" untuk agen yang langsung memakai kalkulator tanpa
     membuat Profil Nasabah lebih dulu. Tanpa ini, setiap kali layar dibuka
     kembali isian yang diketik tertimpa data profil aktif. */
  select.innerHTML=members.map(m=>'<option value="'+esc(String(m.id||''))+'">'+esc(cpFamilySelectorLabel(m))+'</option>').join('')
    +'<option value="__manual__">Ketik manual (tanpa profil)</option>';
  /* Pilihan sebelumnya hanya dipertahankan bila berasal dari profil yang
     sama. Id anggota bersifat umum ('spouse', 'child-0'), jadi tanpa
     pemeriksaan profileId pilihan "anak" pada profil lama akan ikut terbawa
     ke profil baru yang kebetulan juga punya 'child-0'. */
  let currentId=(cpSelectedFamily?.id && cpSelectedFamily.profileId===profile.id
    && members.some(m=>m.id===cpSelectedFamily.id)) ? cpSelectedFamily.id : 'self';
  if(cpManual.has(nama)) currentId='__manual__';
  select.value=currentId;
  wrap.appendChild(field); host.parentElement.insertBefore(wrap, host);
  const apply=(id)=>{
    if(id==='__manual__'){
      /* Isian dibiarkan apa adanya supaya yang diketik agen tidak hilang. */
      cpManual.add(nama);
      cpSelectedFamily=null;
      return;
    }
    cpManual.delete(nama);
    const m=members.find(x=>x.id===id)||members[0]; if(!m)return;
    cpSelectedFamily={...m,profileId:profile.id,familyName:profile.nama||''};
    el(nameId).value=m.nama||''; el(nameId).dispatchEvent(new Event('input',{bubbles:true}));
    const tglMap={LF:'fTgl',BSL:'bTgl',CRIS:'cTgl',CEM:'mTgl',KMB:'kTgl',GSPA:'gTgl',FLEX:'xTgl',GHP:'hTgl',DP:'dTgl',KPR:'pTgl',R2:'rTgl',GPRO:'qTgl',RAYA:'rayaTglLahir'};
    const jkMap={LF:'fJK',BSL:'bJK',CRIS:'cJK',CEM:'mJK',KMB:'kJK',GSPA:'gJK',FLEX:null,GHP:'hJK',DP:'dJK',KPR:null,R2:'rJK',GPRO:'qJK',RAYA:null};
    const t=tglMap[nama], j=jkMap[nama];
    if(t && el(t)){el(t).value=m.tglLahir||'';el(t).dispatchEvent(new Event('input',{bubbles:true}));}
    if(j) cpSetProductGender(j,m.jk);
  };
  select.addEventListener('change',()=>apply(select.value));
  /* Selecting the profile screen again always starts from self unless the
     user has explicitly chosen another member on the current screen. */
  apply(select.value);
}
function cpRenderAllInsuredSelectors(nama){ setTimeout(()=>cpRenderInsuredSelector(nama),0); }

function cpAutoFillOnOpen(nama) {
  const p=cpRead().find(x=>x.id===cpGetActive());
  if(!p) {
    /* Tanpa profil aktif, kalkulator Dana Pensiun dikosongkan — bukan
       dibiarkan memakai angka profil sebelumnya. */
    if(nama==='DP' && typeof window.InsuranceHubDanaPensiun?.loadActiveProfile === 'function') {
      window.InsuranceHubDanaPensiun.loadActiveProfile(null);
    }
    return;
  }
  const targets=['LF','BSL','CRIS','CEM','KMB','GSPA','FLEX','GHP','DP','KPR','R2','PDK','COMBO','GPRO','RAYA','NEEDS','COMPARE'];
  /* Layar yang dipasang ke mode Ketik manual tidak ikut diisi ulang. */
  if(targets.includes(nama) && !cpManual.has(nama)) cpAutofillAll(p);
  if(nama==='DP' && typeof window.InsuranceHubDanaPensiun?.loadActiveProfile === 'function') {
    window.InsuranceHubDanaPensiun.loadActiveProfile(p);
  }
  cpRenderAllInsuredSelectors(nama);
}

function cpInit() {
  if (!el('cpSimpan')) return;
  const refreshProfileAge=()=>{ const usia=formatUsiaGenerali(el('cpTgl')?.value); if(el('cpUsia')) el('cpUsia').textContent=usia?'Usia '+usia:'Usia —'; };
  el('cpTgl')?.addEventListener('input',refreshProfileAge);
  refreshProfileAge();
  /* Data Utama -> Keluarga & relasi: nama pasangan selalu mengikuti satu
     sumber utama. DOB tidak disentuh, sehingga agen cukup mengisi tanggal
     lahir di bagian Keluarga & relasi. */
  el('cpPasangan')?.addEventListener('input',()=>{
    if(el('cpPasanganRelasi')) el('cpPasanganRelasi').value=el('cpPasangan').value;
  });
  ['cpPenghasilan','cpPengeluaran','cpAset','cpUtang','cpKPR','cpDanaDarurat','cpUPJiwa','cpUPCI','cpDPRutin','cpDPLiburan','cpDPHobi','cpDPKeluarga','cpDPSehat','cpDPLain'].forEach(id=>el(id)?.addEventListener('input',()=>{const n=bAngka(el(id).value);el(id).value=n?n.toLocaleString('id-ID'):'';}));
  if(el('cpTambahAnak')) el('cpTambahAnak').addEventListener('click',()=>cpChildRow({}));
  if(el('cpTambahRelasi')) el('cpTambahRelasi').addEventListener('click',()=>cpRelasiLainRow({}));
  el('cpJK').addEventListener('click', e => { const b=e.target.closest('button'); if(!b)return; el('cpJK').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b)); });
  el('cpSimpan').addEventListener('click', cpSave);
  el('cpReset').addEventListener('click', () => {
    const editing = el('cpStatusBar').dataset.editId;
    if (editing) {
      const original = cpRead().find(x => x.id === editing);
      if (original) cpFillForm(original);
      el('cpStatusBar').dataset.editId='';
      el('cpStatusBar').textContent='Edit dibatalkan. Data tersimpan tetap tidak berubah.';
      el('cpSimpan').textContent='Simpan profil';
      el('cpReset').textContent='Kosongkan form';
      return;
    }
    cpFillForm({});
    el('cpStatusBar').dataset.editId='';
    el('cpStatusBar').textContent='Form dikosongkan.';
  });
  el('cpDaftar').addEventListener('click', e => {
    const use=e.target.closest('[data-cp-use]'), edit=e.target.closest('[data-cp-edit]'), del=e.target.closest('[data-cp-delete]');
    if(use){ const p=cpRead().find(x=>x.id===use.dataset.cpUse); cpApply(p); }
    else if(edit) cpEdit(edit.dataset.cpEdit);
    else if(del && confirm('Hapus profil ini dari perangkat?')) cpDelete(del.dataset.cpDelete);
  });
  cpRender();
}
function cpFamilyMembers(p){
  if(!p) return [];
  const base = Array.isArray(p.family) ? p.family.slice() : [];
  if(!base.some(x=>x.id==='self')) base.unshift({id:'self',nama:p.nama||'',tglLahir:p.tglLahir||'',jk:p.jk||'PRIA',hubungan:'Diri Sendiri'});
  // Backward compatibility: profiles created before the family layer still
  // expose spouse/children as selectable family members without requiring a resave.
  if(!base.some(x=>x.id==='spouse') && p.pasangan) base.push({id:'spouse',nama:p.pasangan,tglLahir:'',jk:(p.jk||'PRIA')==='PRIA'?'WANITA':'PRIA',hubungan:(p.status||'')==='Menikah'?'Istri':'Pasangan'});
  (Array.isArray(p.children)?p.children:[]).forEach((c,i)=>{
    const id='child-'+i;
    if(!base.some(x=>x.id===id)) base.push({id,nama:c.nama||'',tglLahir:c.tglLahir||'',jk:c.jk||'PRIA',hubungan:'Anak',biayaPendidikanHariIni:c.biayaPendidikanHariIni||0});
  });
  return base.filter(x=>x && (x.id==='self' || x.nama || x.tglLahir));
}
window.InsuranceHubCustomerProfile = {read:cpRead, active:()=>cpRead().find(x=>x.id===cpGetActive()) || null, apply:cpApply, family:cpFamilyMembers, selectedFamily:()=>cpSelectedFamily,
  bukaUntuk:cpBukaUntuk, konteks:()=>cpKonteks ? {...cpKonteks} : null, batalKonteks:cpKonteksHapus};

// Render product cards and wire navigation after the DOM has been parsed.
if (el('daftarProduk')) {
  /* Quick Calculator directory: keep all 12 tools, but group them by purpose so the
     dashboard stays compact. Product cards themselves are intentionally unchanged. */
  const quickGroups = [
    {key:'jiwa', icon:'🛡️', title:'Proteksi Jiwa', desc:'Proteksi meninggal sebagai kebutuhan utama.', keys:['GPRO','CEM','FLEX','RIZQIA'], open:true},
    {key:'kritis', icon:'❤️', title:'Penyakit Kritis', desc:'Solusi khusus untuk risiko penyakit kritis.', keys:['CRIS']},
    {key:'jiwa-kesehatan', icon:'🏥', title:'Proteksi Jiwa & Kesehatan', desc:'Produk jiwa dengan opsi atau rider perlindungan kesehatan.', keys:['GSPA','BSL','GHP']},
    {key:'masa-depan', icon:'💰', title:'Dana Masa Depan', desc:'Solusi untuk dana masa depan dan manfaat hidup.', keys:['LF','GENWEALTH','RAYA']},
    {key:'kombinasi', icon:'🔗', title:'Kombinasi Produk', desc:'Gabungkan beberapa solusi dalam satu ilustrasi.', keys:['COMBO','KMB']}
  ];
  const card = p => `
    <button class="produk" data-layar="${p.layar}" data-siap="${p.siap ? 1 : 0}" ${p.siap ? '' : 'disabled'}>
      <span class="judul">${p.nama}<span class="lencana ${p.siap ? 'siap' : 'antre'}">${p.siap ? 'Siap pakai' : 'Belum dibangun'}</span></span>
      <span class="ket">${p.ket}</span></button>`;
  el('daftarProduk').innerHTML = quickGroups.map(g => {
    const items = g.keys.map(k => PRODUK.find(p => p.kode===k)).filter(Boolean);
    return `<details class="quick-group" ${g.open ? 'open' : ''}>
      <summary><span class="quick-group-icon">${g.icon}</span><span class="quick-group-copy"><b>${g.title}</b><small>${g.desc}</small></span></summary>
      <div class="quick-group-products">${items.map(card).join('')}</div>
    </details>`;
  }).join('');
}
document.querySelectorAll('.produk[data-siap="1"]').forEach(b => b.addEventListener('click', () => bukaLayar(b.dataset.layar)));
/* Pintu Profil dari Dashboard/tab bar selalu Profil biasa (tanpa kelanjutan). */
if (el('btnProfil')) el('btnProfil').addEventListener('click', () => { cpKonteksHapus(); bukaLayar('PROFILE'); });
if (el('btnKartuKonsultan')) el('btnKartuKonsultan').addEventListener('click', () => bukaLayar('KARTU_KONSULTAN'));
if (el('btnQuick')) el('btnQuick').addEventListener('click', () => { const q=el('quickCalculator'); if(q) q.scrollIntoView({behavior:'smooth',block:'start'}); });
if (el('btnNeeds')) el('btnNeeds').addEventListener('click', () => { needsLoadActiveProfile(); bukaLayar('NEEDS'); });
if (el('btnCompare')) el('btnCompare').addEventListener('click', () => { if(window.renderComparisonFromSaved) window.renderComparisonFromSaved(); bukaLayar('COMPARE'); });
if (el('btnPlanning')) el('btnPlanning').addEventListener('click', () => bukaLayar('PLANNING'));
if (el('btnFinancialCalc')) el('btnFinancialCalc').addEventListener('click', () => bukaLayar('FINANCIAL_CALC'));
if (el('btnFinancialSegitiga')) el('btnFinancialSegitiga').addEventListener('click', () => bukaLayar('SEGITIGA'));
if (el('btnFinancialKPR')) el('btnFinancialKPR').addEventListener('click', () => bukaLayar('KPR'));
if (el('btnFinancialR2')) el('btnFinancialR2').addEventListener('click', () => bukaLayar('R2'));
if (el('cmpMulaiNeeds')) el('cmpMulaiNeeds').addEventListener('click', () => { needsLoadActiveProfile(); bukaLayar('NEEDS'); });
if (el('cmpProfile')) el('cmpProfile').addEventListener('click', () => bukaLayar('PROFILE'));
if (el('planningPension')) el('planningPension').addEventListener('click', () => bukaLayar('DP'));
if (el('planningEducation')) el('planningEducation').addEventListener('click', () => bukaLayar('PDK'));

// Financial Planning: each calculator's own "Buka ringkasan untuk prospek"
// button must navigate to its existing dedicated summary screen.
// Recalculate first so the summary always reflects the latest inputs.
if (el('dTblRingkas')) el('dTblRingkas').addEventListener('click', () => {
  if (typeof dGambar === 'function') dGambar();
  bukaLayar('DP_RINGKAS');
});
if (el('nTblRingkas')) el('nTblRingkas').addEventListener('click', () => {
  if (typeof nHitung === 'function') nHitung();
  bukaLayar('PDK_RINGKAS');
});

function kembaliLayar() {
  /* Jalur Solusi Segitiga punya konteks yang jelas: tombol panah di
     Program Builder (Hitung Alternatif) harus selalu kembali ke halaman
     Input Alternatif, bukan mengikuti history global yang kadang berisi
     dashboard karena layar dibuka dari link/restore/session. Tombol Home
     tetap menjadi satu-satunya tombol untuk kembali ke dashboard. */
  if (layarAktif === 'SOLUSI_HITUNG') {
    sedangKembali = true;
    bukaLayar('SOLUSI_SEGITIGA');
    sedangKembali = false;
    try {
      if (window.InsuranceHubSegitigaSolusi &&
          typeof window.InsuranceHubSegitigaSolusi.render === 'function') {
        window.InsuranceHubSegitigaSolusi.render();
      }
    } catch (_) {}
    return true;
  }

  if (riwayatLayar.length) {
    const tujuan = riwayatLayar.pop();
    sedangKembali = true;
    bukaLayar(tujuan);
    sedangKembali = false;
    return true;
  }
  const kiri = LAYAR[layarAktif]?.kiri;
  if (kiri) {
    sedangKembali = true;
    bukaLayar(kiri);
    sedangKembali = false;
    return true;
  }
  return false;
}
window.kembaliLayar = kembaliLayar;
if (el('tblKiri')) el('tblKiri').addEventListener('click', () => kembaliLayar());
if (el('tblKanan')) el('tblKanan').addEventListener('click', () => { const k=LAYAR[layarAktif]?.kanan; if(k)bukaLayar(k.ke); });

// Expose small hooks used by Android/back-button integration.
window.tekanKembali = window.tekanKembali || function () { return kembaliLayar(); };


/* ===== Universal tanggal lahir -> usia live =====
   Semua kalkulator memakai rumus usiaGenerali(), sama dengan Profil Nasabah.
   Hanya input date yang benar-benar berada di field berlabel "Tanggal lahir"
   yang diberi usia live, sehingga tanggal janji/SPAJ tidak ikut berubah. */
(function pasangUsiaLiveGlobal(){
  function pasang(node){
    if(!node || node.type!=='date' || node.dataset.usiaLiveTerpasang) return;
    const wrap=node.closest('div');
    const label=wrap ? wrap.querySelector('label') : null;
    if(!label || !/tanggal\s+lahir/i.test(label.textContent||'')) return;
    node.dataset.usiaLiveTerpasang='1';
    let out=wrap.querySelector('.usia-live');
    if(!out){
      out=document.createElement('div'); out.className='usia-live';
      node.insertAdjacentElement('afterend',out);
    }
    out.dataset.globalAge='1';
    const refresh=()=>{
      const u=node.value && typeof usiaGenerali==='function'
        ? usiaGenerali(new Date(node.value+'T00:00:00Z')) : null;
      out.textContent=u==null ? 'Usia —' : 'Usia '+u+' tahun';
    };
    node.addEventListener('input',refresh); node.addEventListener('change',refresh); refresh();
  }
  const scan=()=>document.querySelectorAll('input[type="date"]').forEach(pasang);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan); else setTimeout(scan,0);
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();

cpInit();
