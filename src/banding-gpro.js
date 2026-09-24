/* ============================================================
   Banding Gen Pro
   ------------------------------------------------------------
   Mode ini sengaja berdiri terpisah dari Quick Calculator Gen Pro.
   Mesin hitung yang dipakai tetap gproHitung(), sehingga tidak membuat
   rumus/benefit baru. Mode single Gen Pro tidak disentuh.
   ============================================================ */
(function () {
  'use strict';

  const el = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const rp = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const short = n => {
    n = Number(n) || 0;
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toLocaleString('id-ID', {maximumFractionDigits: 2}) + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toLocaleString('id-ID', {maximumFractionDigits: 1}) + ' jt';
    return rp(n);
  };
  const MAKS = 3;
  let mode = 'UP';;
  let hasil = [];
  let dataDasar = {};

  function navDaftar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.GPRO_BANDING = {
      el: 'layarGPROBanding', judul: 'Bandingkan Gen Pro',
      sub: 'Bandingkan beberapa pilihan tanpa mengubah ilustrasi single', kiri: 'GPRO'
    };
    nav.LAYAR.GPRO_BANDING_RINGKAS = {
      el: 'layarGPROBandingRingkas', judul: 'Ringkasan Perbandingan Gen Pro',
      sub: 'Ringkasan sederhana untuk ditunjukkan ke nasabah', kiri: 'GPRO_BANDING'
    };
    return true;
  }

  function bacaSingle() {
    const tgl = el('qTgl') ? el('qTgl').value : '';
    const usia = tgl && typeof usiaDari === 'function' ? usiaDari(new Date(tgl + 'T00:00:00Z')) : null;
    const jk = typeof nilaiSegmen === 'function' ? nilaiSegmen('qJK') : 'PRIA';
    const paket = el('qPaket') ? (el('qPaket').value || '10-90') : '10-90';
    const indeksUP = el('qUP') ? Number(el('qUP').value || 0) : 0;
    const metode = typeof nilaiSegmen === 'function' ? (nilaiSegmen('qMetode') || 'Bulanan') : 'Bulanan';
    return {nama: el('qNama')?.value || '', tgl, usia, jk, paket, indeksUP, metode};
  }

  function labelPaket(p) {
    if (typeof gproLabel === 'function') return gproLabel(p);
    return p;
  }

  function render() {
    const w = el('layarGPROBanding');
    if (!w) return;
    const d = dataDasar;
    const upOptions = (typeof DATA_GPRO !== 'undefined' ? DATA_GPRO.up : []);
    const paketOptions = (typeof GPRO_PAKET !== 'undefined' ? GPRO_PAKET : []);
    const usiaInfo = d.usia == null ? 'Isi tanggal lahir pada Gen Pro single terlebih dahulu.' :
      ('Usia masuk ' + d.usia + ' tahun' + (d.nama ? ' • ' + d.nama : ''));

    w.innerHTML =
      '<div class="kop"><h2>Bandingkan Pilihan Gen Pro</h2>' +
      '<p>' + esc(usiaInfo) + '</p></div>' +
      '<div class="blok gpro-band-input">' +
        '<h3>Apa yang ingin dibandingkan?</h3>' +
        '<div class="segmen gpro-band-mode" id="gproBandMode">' +
          '<button type="button" data-mode="UP" aria-pressed="' + (mode === 'UP') + '">Bandingkan UP</button>' +
          '<button type="button" data-mode="PAKET" aria-pressed="' + (mode === 'PAKET') + '">Bandingkan Paket</button>' +
        '</div>' +
        '<div class="baris">' +
          '<div><label>Metode bayar</label><div class="gpro-band-static">' + esc(d.metode) + '</div></div>' +
          (mode === 'UP'
            ? '<div><label>Paket Gen Pro</label><select id="gproBandPaket">' + paketOptions.map(p => '<option value="'+esc(p)+'"'+(p===d.paket?' selected':'')+'>'+esc(labelPaket(p))+'</option>').join('') + '</select></div>'
            : '<div><label>Uang pertanggungan</label><select id="gproBandUP">' + upOptions.map((u,i) => '<option value="'+i+'"'+(i===d.indeksUP?' selected':'')+'>'+esc(rp(u))+'</option>').join('') + '</select></div>') +
        '</div>' +
        '<div class="gpro-band-pilih">' +
          '<label>Pilih maksimal ' + MAKS + ' pilihan</label>' +
          '<div id="gproBandChoices" class="gpro-band-choices"></div>' +
          '<p class="catatan" id="gproBandNote">Pilih minimal 2 pilihan untuk melihat perbandingan.</p>' +
        '</div>' +
        '<div class="aksi-row"><button class="aksi" type="button" id="gproBandHitung">Bandingkan Pilihan</button></div>' +
      '</div>' +
      '<div class="blok" id="gproBandPreview"><p class="catatan">Belum ada hasil perbandingan.</p></div>';

    pasangPilihan();
    el('gproBandMode').addEventListener('click', e => {
      const b = e.target.closest('button[data-mode]'); if (!b) return;
      mode = b.dataset.mode;
      render();
    });
    const hp = el('gproBandHitung');
    if (hp) hp.addEventListener('click', hitung);
  }

  function pasangPilihan() {
    const c = el('gproBandChoices');
    if (!c) return;
    const d = dataDasar;
    if (mode === 'UP') {
      const paket = el('gproBandPaket')?.value || d.paket;
      const usia = d.usia;
      const items = (typeof DATA_GPRO !== 'undefined' ? DATA_GPRO.up : []).map((up, i) => {
        const tersedia = usia != null && typeof gproPremi === 'function' ? !!gproPremi(paket, d.jk, usia, i) : false;
        return '<label class="gpro-band-choice ' + (!tersedia ? 'disabled' : '') + '">' +
          '<input type="checkbox" value="'+i+'" '+(!tersedia?'disabled':'')+'><span class="gpro-band-choice-main"><b>'+esc(rp(up))+'</b><small class="gpro-band-pick">Pilih</small></span>'+
          (!tersedia ? '<small class="gpro-band-unavailable">Tidak tersedia</small>' : '') + '</label>';
      }).join('');
      c.innerHTML = items || '<p class="catatan">Data UP Gen Pro belum tersedia.</p>';
    } else {
      const items = (typeof GPRO_PAKET !== 'undefined' ? GPRO_PAKET : []).map(p => {
        let tersedia = false;
        if (d.usia != null && typeof DATA_GPRO !== 'undefined') {
          const b = DATA_GPRO.tarif[p] && DATA_GPRO.tarif[p][String(d.jk).toUpperCase()];
          tersedia = !!(b && b[String(d.usia)]);
        }
        return '<label class="gpro-band-choice ' + (!tersedia ? 'disabled' : '') + '">' +
          '<input type="checkbox" value="'+esc(p)+'" '+(!tersedia?'disabled':'')+'><span class="gpro-band-choice-main"><b>'+esc(labelPaket(p))+'</b><small class="gpro-band-pick">Pilih</small></span>'+
          (!tersedia ? '<small class="gpro-band-unavailable">Tidak tersedia</small>' : '') + '</label>';
      }).join('');
      c.innerHTML = items || '<p class="catatan">Data paket Gen Pro belum tersedia.</p>';
    }
    c.addEventListener('change', e => {
      const boxes = c.querySelectorAll('input[type=checkbox]');
      const active = Array.from(boxes).filter(x => x.checked);
      if (active.length >= MAKS) boxes.forEach(x => { if (!x.checked) x.disabled = true; });
      else boxes.forEach(x => { if (x.closest('.gpro-band-choice')?.classList.contains('disabled')) x.disabled = true; else x.disabled = false; });
      boxes.forEach(x => {
        const card = x.closest('.gpro-band-choice');
        if (card) {
          card.classList.toggle('is-selected', x.checked);
          const tag = card.querySelector('.gpro-band-pick');
          if (tag) tag.textContent = x.checked ? '✓ Dipilih • tekan lagi untuk batal' : 'Pilih';
        }
      });
      const n = active.length;
      const note = el('gproBandNote');
      if (note) note.textContent = n < 2 ? 'Tekan pilihan untuk menyalakan. Tekan lagi untuk membatalkan. Pilih minimal 2.' :
        (n === MAKS ? '3 pilihan dipilih — tekan pilihan yang menyala untuk membatalkan.' : n + ' pilihan dipilih — masih bisa tambah ' + (MAKS-n) + ' pilihan.');
    });
  }

  function hitung() {
    const c = el('gproBandChoices');
    const boxes = c ? Array.from(c.querySelectorAll('input:checked')) : [];
    if (boxes.length < 2) { alert('Pilih minimal 2 pilihan untuk dibandingkan.'); return; }
    if (dataDasar.usia == null) { alert('Isi tanggal lahir pada Gen Pro single terlebih dahulu.'); return; }
    const fixedPackage = mode === 'UP' ? (el('gproBandPaket')?.value || dataDasar.paket) : null;
    const fixedUP = mode === 'PAKET' ? Number(el('gproBandUP')?.value ?? dataDasar.indeksUP) : null;
    hasil = boxes.map(b => {
      const inp = mode === 'UP'
        ? {usia:dataDasar.usia,jk:dataDasar.jk,bayar:parseInt(fixedPackage.split('-')[0],10) === 70 ? Math.max(70-dataDasar.usia,1) : parseInt(fixedPackage.split('-')[0],10),lindung:parseInt(fixedPackage.split('-')[1],10),paket:fixedPackage,indeksUP:Number(b.value),metode:dataDasar.metode}
        : {usia:dataDasar.usia,jk:dataDasar.jk,bayar:parseInt(String(b.value).split('-')[0],10) === 70 ? Math.max(70-dataDasar.usia,1) : parseInt(String(b.value).split('-')[0],10),lindung:parseInt(String(b.value).split('-')[1],10),paket:String(b.value),indeksUP:fixedUP,metode:dataDasar.metode};
      const r = gproHitung(inp);
      return Object.assign(r, {pilihan: mode === 'UP' ? r.up : r.kombinasi, jenis: mode, metode:dataDasar.metode});
    });
    hasil.sort((a,b) => (a.sah?0:1) - (b.sah?0:1));
    tampilPreview();
  }

  function nilaiRow(label, vals, formatter) {
    return '<tr><th>' + esc(label) + '</th>' + vals.map(v => '<td>' + (formatter ? formatter(v) : esc(v)) + '</td>').join('') + '</tr>';
  }

  function sharedBenefits() {
    return '<div class="gpro-shared"><h3>Manfaat yang sama untuk semua pilihan</h3>' +
      '<ul>' +
      '<li><b>Meninggal dunia:</b> santunan sebesar 100% Uang Pertanggungan.</li>' +
      '<li><b>Kecelakaan pada transportasi umum:</b> tambahan santunan sebesar 100% UP, maksimal Rp2 miliar.</li>' +
      '<li><b>Meninggal di luar wilayah Indonesia:</b> tambahan 10% UP, maksimal Rp500 juta.</li>' +
      '<li><b>Pembebasan premi:</b> tanpa premi rider terpisah, bila terdiagnosa salah satu kondisi kritis yang dipertanggungkan, sesuai ketentuan produk.</li>' +
      '</ul>' +
      '<p class="catatan">Nilai manfaat yang mengikuti UP berbeda antar pilihan; manfaat yang ketentuannya sama dijelaskan satu kali di sini.</p></div>';
  }

  function waiverComparisonTable() {
    const valid = hasil.filter(x => x.sah);
    if (!valid.length) return '';
    const maxBayar = Math.max.apply(null, valid.map(r => {
      const parts = String(r.kombinasi || '').split('-').map(Number);
      return parts[0] === 70 ? Math.max(70 - dataDasar.usia, 1) : (parts[0] || 0);
    }));
    if (!maxBayar) return '';
    const head = valid.map((r,i) => '<th>Pilihan ' + (i+1) + '<br><strong>' + esc(mode==='UP' ? short(r.up) : r.kombinasi) + '</strong></th>').join('');
    const rows = [];
    for (let th=1; th<=maxBayar; th++) {
      const cells = valid.map(r => {
        const x = Array.isArray(r.waiver) ? r.waiver[th-1] : null;
        if (!x) return '<td>—</td>';
        return '<td class="angka">' + (x.dibebaskan ? rp(x.dibebaskan) : 'Masa bayar sudah selesai') + '</td>';
      }).join('');
      rows.push('<tr' + (th===1 ? ' class="tandai"' : '') + '><th>Setelah tahun ke-' + th + '</th>' + cells + '</tr>');
    }
    return '<div class="gpro-waiver-compare"><h3>Pembebasan premi bila terdiagnosa kondisi kritis</h3>' +
      '<p class="catatan">Jika salah satu kondisi kritis yang dipertanggungkan terjadi pada tahun tersebut, sisa premi sampai akhir masa bayar dibebaskan. Perlindungan tetap berjalan sesuai ketentuan produk.</p>' +
      '<div class="gulir gpro-band-table-wrap"><table class="tahunan gpro-band-table"><thead><tr><th>Kejadian</th>' + head + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<p class="catatan">Manfaat pembebasan premi sudah termasuk dalam Gen Pro dan bukan rider berbayar terpisah.</p></div>';
  }

  function tabelRingkas() {
    const valid = hasil.filter(x => x.sah);
    if (!valid.length) return '<div class="peringatan">Tidak ada pilihan yang tersedia untuk data nasabah ini.</div>';
    const cols = valid.map((r,i) => '<th>Pilihan ' + (i+1) + '<br><strong>' + esc(mode==='UP' ? short(r.up) : r.kombinasi) + '</strong></th>').join('');
    const rows = [];
    rows.push('<tr><th>UP Jiwa</th>' + valid.map(r => '<td class="angka">'+short(r.up)+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Premi ' + (dataDasar.metode === 'Bulanan' ? 'per bulan' : 'per tahun') + '</th>' + valid.map(r => '<td class="angka">'+rp(r.premiPerSetoran)+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Premi per tahun</th>' + valid.map(r => '<td class="angka">'+rp(r.premiPerTahun)+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Diskon premi</th>' + valid.map(r => '<td class="angka">'+Math.round((r.diskon || 0) * 100)+'%</td>').join('') + '</tr>');
    rows.push('<tr><th>Total dibayar</th>' + valid.map(r => '<td class="angka">'+rp(r.totalDibayar)+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Masa bayar</th>' + valid.map(r => '<td>'+esc(String(r.kombinasi).split('-')[0] === '70' ? 'Sampai usia 70' : String(String(r.kombinasi).split('-')[0])+' tahun')+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Masa perlindungan</th>' + valid.map(r => '<td>Sampai usia '+esc(r.sampaiUsia)+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Meninggal dunia</th>' + valid.map(r => '<td class="angka">'+short(r.meninggal)+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Meninggal karena kecelakaan transportasi umum</th>' + valid.map(r => '<td class="angka">'+short(r.meninggalTransportasi)+'</td>').join('') + '</tr>');
    rows.push('<tr><th>Meninggal di luar wilayah Indonesia</th>' + valid.map(r => '<td class="angka">'+short(r.meninggalLuarNegeri)+'</td>').join('') + '</tr>');
    return '<div class="gulir gpro-band-table-wrap"><table class="tahunan gpro-band-table"><thead><tr><th>Parameter</th>'+cols+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
  }

  function tampilPreview() {
    const w = el('gproBandPreview'); if (!w) return;
    const valid = hasil.filter(x => x.sah);
    w.innerHTML = '<h3>Perbandingan</h3>' + tabelRingkas() + sharedBenefits() + waiverComparisonTable() +
      '<div class="aksi-row"><button class="aksi" type="button" id="gproBandRingkas">Buka ringkasan ilustrasi</button></div>' +
      (hasil.some(x=>!x.sah) ? '<p class="catatan">Pilihan yang tidak tersedia untuk usia masuk tidak dihitung dalam tabel.</p>' : '');
    const b = el('gproBandRingkas'); if (b) b.addEventListener('click', () => {
      if (!valid.length) return;
      renderSummary();
      window.bukaLayar('GPRO_BANDING_RINGKAS');
    });
  }

  function renderSummary() {
    const w = el('layarGPROBandingRingkas'); if (!w) return;
    const valid = hasil.filter(x => x.sah);
    const nama = dataDasar.nama || 'Nasabah';
    const title = mode === 'UP' ? 'Perbandingan beberapa UP Gen Pro' : 'Perbandingan beberapa paket Gen Pro';
    const head = valid.map((r,i) => '<th>Pilihan '+(i+1)+'<br><strong>'+esc(mode==='UP'?short(r.up):r.kombinasi)+'</strong></th>').join('');
    w.innerHTML =
      '<div class="kop gpro-print-kop"><h2>Gen Pro — Perbandingan Pilihan</h2>' +
      '<p>'+esc(title)+'</p><div class="identitas"><div>Nama nasabah<b>'+esc(nama)+'</b></div><div>Usia masuk<b>'+esc(dataDasar.usia)+' tahun</b></div><div>Jenis kelamin<b>'+esc(dataDasar.jk)+'</b></div></div></div>' +
      '<div class="blok"><h2>Perbedaan Utama</h2>'+tabelRingkas()+'</div>' +
      '<div class="blok">'+sharedBenefits()+'</div>' +
      '<div class="blok">'+waiverComparisonTable()+'</div>' +
      '<div class="blok"><h2>Cara membaca pilihan</h2><p class="catatan">Angka yang berbeda ditampilkan berdampingan agar mudah dibandingkan. Manfaat yang ketentuannya sama untuk seluruh pilihan tidak diulang pada setiap kolom.</p></div>' +
      '<div class="blok"><p class="catatan">Semua angka dan manfaat di atas dihitung dari mesin Gen Pro yang sama dengan kalkulator single. Tidak ada manfaat tambahan di luar produk yang sedang dihitung.</p><div class="kaki">Ilustrasi internal PSG untuk membantu penjelasan. Nilai final mengikuti ilustrasi resmi dan Ketentuan Polis PT Asuransi Jiwa Generali Indonesia.</div></div>' +
      '<div class="blok tanpa-cetak"><div class="aksi-row"><button class="aksi" id="gproBandCetak">Cetak / simpan PDF</button></div></div>';
    const b = el('gproBandCetak'); if (b) b.addEventListener('click', cetak);
  }

  function cetak() {
    const old = document.title;
    document.title = 'Perbandingan Gen Pro - ' + (dataDasar.nama || 'Nasabah');
    window.print();
    setTimeout(() => { document.title = old; }, 1000);
  }

  function buka() {
    dataDasar = bacaSingle();
    mode = 'UP';
    hasil = [];
    render();
    window.bukaLayar('GPRO_BANDING');
  }

  function init() {
    navDaftar();
    const b = el('qTblBanding');
    if (b && !b.dataset.gproBanding) {
      b.dataset.gproBanding = '1';
      b.addEventListener('click', buka);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.InsuranceHubBandingGpro = { buka, hitung: () => hasil.slice(), renderSummary };
})();
