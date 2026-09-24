/* ============================================================
   Banding GEN Wealth
   ------------------------------------------------------------
   Perbandingan memakai engine GEN Wealth yang sama dengan kalkulator utama.
   Yang boleh dibandingkan:
     1) masa pertanggungan
     2) masa pembayaran premi
     3) besar premi
   Semua pilihan valid berasal dari database kombinasi PENGEMBALIAN.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const uang = (n, kode) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return kode === 'USD'
      ? 'USD ' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
      : 'Rp' + Math.round(n).toLocaleString('id-ID');
  };

  const MAKS = 3;
  let hasil = [];
  let mode = 'lindung';

  function daftarLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.GENWEALTH_BANDING = {
      el: 'layarGenWealthBanding',
      judul: 'Banding GEN Wealth',
      sub: 'Bandingkan beberapa skenario GEN Wealth sekaligus',
      kiri: 'GENWEALTH'
    };
    return true;
  }

  function dasarTerakhir() {
    const d = window.__gwTerakhir;
    return d && d.hasil && d.hasil.tersedia ? d : null;
  }

  function engine() { return window.InsuranceHubGenWealth; }

  function opsiLindung(i) {
    const G = engine();
    if (!G) return [];
    return G.MASA_LINDUNG.filter(l => G.pengembalian(i.mata, i.bayar, l) !== null);
  }

  function opsiBayar(i) {
    const G = engine();
    if (!G) return [];
    return G.MASA_BAYAR.filter(b => G.pengembalian(i.mata, b, i.lindung) !== null);
  }

  function opsiMode(i) {
    if (mode === 'bayar') return opsiBayar(i);
    if (mode === 'premi') return [];
    return opsiLindung(i);
  }

  function labelMode() {
    return mode === 'bayar' ? 'lama pembayaran premi' :
      mode === 'premi' ? 'besar premi per tahun' : 'lama pertanggungan';
  }

  function nilaiLabel(v) {
    if (mode === 'bayar') return v + ' tahun';
    if (mode === 'premi') return uang(v, (dasarTerakhir() || {}).isian ? dasarTerakhir().isian.mata : 'IDR');
    return v + ' tahun';
  }

  function parseNominal(v) {
    if (typeof bAngka === 'function') return Number(bAngka(v)) || 0;
    return Number(String(v || '').replace(/[^0-9.-]/g, '')) || 0;
  }

  function formatNominalInput(n) {
    if (!n) return '';
    return Math.round(n).toLocaleString('id-ID');
  }

  function renderPemilih() {
    const w = el('layarGenWealthBanding');
    const d = dasarTerakhir();
    if (!w) return;
    if (!d) {
      w.innerHTML = '<div class="blok"><p class="catatan akt-peringatan">Lengkapi dulu kalkulator GEN Wealth sampai hasil tersedia.</p></div>';
      return;
    }

    const i = d.isian;
    const G = engine();
    const opsi = opsiMode(i);
    const modeOptions = [
      ['lindung', 'Membandingkan lama perlindungan'],
      ['bayar', 'Membandingkan lama bayar'],
      ['premi', 'Membandingkan besarnya premi']
    ];

    let nilaiHtml = '';
    if (mode === 'premi') {
      const min = G && G.PREMI_MIN ? G.PREMI_MIN[i.mata][i.bayar] : 0;
      nilaiHtml = '<div class="baris">' + [0, 1, 2].map(function (n) {
        const val = n === 0 ? i.premiTahunan : 0;
        return '<div><label>Pilihan ' + (n + 1) + '</label>' +
          '<input type="text" inputmode="numeric" class="gw-band-premi-input" data-gw-premi-idx="' + n + '" ' +
          'value="' + esc(formatNominalInput(val)) + '" placeholder="' + (n === 0 ? 'Wajib diisi' : 'Boleh dikosongkan') + '">' +
          '</div>';
      }).join('') + '</div>' +
      '<p class="catatan">Masa bayar ' + i.bayar + ' tahun dan masa pertanggungan ' + i.lindung +
      ' tahun tetap. Minimum premi untuk masa bayar ini: <b>' + uang(min, i.mata) + '/tahun</b>.</p>';
    } else {
      nilaiHtml = '<div class="akt-tab" id="gwBandingPilihan">' +
        opsi.map(function (v) {
          return '<button type="button" data-gw-band="' + v + '" aria-pressed="false">' + esc(nilaiLabel(v)) + '</button>';
        }).join('') + '</div>' +
        (opsi.length < 2 ? '<p class="catatan akt-peringatan">Untuk kombinasi input saat ini, database hanya menyediakan ' +
          opsi.length + ' pilihan yang valid untuk dibandingkan pada sumbu ini.</p>' : '');
    }

    w.innerHTML =
      '<div class="kop"><h2>Bandingkan GEN Wealth</h2>' +
      '<p>Gunakan hasil kalkulator utama sebagai dasar. Pilih satu jenis perbandingan; semua kombinasi yang ditampilkan mengikuti database GEN Wealth.</p>' +
      '<div class="identitas">' +
      '<div>Nama nasabah<b>' + esc(i.nama || '—') + '</b></div>' +
      '<div>Usia masuk<b>' + (d.hasil.usia || i.usia) + ' tahun</b></div>' +
      '<div>Mata uang<b>' + (i.mata === 'USD' ? 'US Dolar' : 'Rupiah') + '</b></div>' +
      '<div>Cara bayar<b>' + esc(i.frekuensi || 'Tahunan') + '</b></div>' +
      '<div>Masa bayar<b>' + i.bayar + ' tahun</b></div>' +
      '<div>Masa pertanggungan<b>' + i.lindung + ' tahun</b></div>' +
      '<div>Premi utama<b>' + uang(i.premiTahunan, i.mata) + '/tahun</b></div>' +
      '</div></div>' +
      '<div class="blok tanpa-cetak"><h2>Yang dibandingkan</h2>' +
      '<div class="baris satu"><div><label for="gwBandingMode">Jenis perbandingan</label>' +
      '<select id="gwBandingMode">' + modeOptions.map(function (x) {
        return '<option value="' + x[0] + '"' + (x[0] === mode ? ' selected' : '') + '>' + esc(x[1]) + '</option>';
      }).join('') + '</select></div></div>' +
      '<p class="catatan">' + esc(mode === 'premi'
        ? 'Pilih nominal premi yang ingin dibandingkan. Masa bayar dan masa pertanggungan mengikuti input utama.'
        : 'Pilih sampai ' + MAKS + ' pilihan yang tersedia. Parameter lain mengikuti input utama.') + '</p>' +
      nilaiHtml +
      '<p class="catatan" id="gwBandingPesan"></p>' +
      '<button class="aksi" id="gwBandingJalan" type="button" style="margin-top:10px">Bandingkan pilihan</button></div>';
  }

  function hitungSkenario(overrides) {
    const d = dasarTerakhir();
    const G = engine();
    if (!d || !G || !G.hitung) return null;
    const i = Object.assign({}, d.isian, overrides || {});
    const r = G.hitung(i);
    return { isian: i, hasil: r, tersedia: !!(r && r.tersedia), alasan: r && r.alasan, nilai: mode === 'premi' ? i.premiTahunan : (mode === 'bayar' ? i.bayar : i.lindung) };
  }

  function buildHasil() {
    const d = dasarTerakhir();
    if (!d) return [];
    const i = d.isian;
    if (mode === 'premi') {
      const vals = Array.prototype.slice.call(document.querySelectorAll('.gw-band-premi-input'))
        .map(n => parseNominal(n.value)).filter(v => v > 0);
      const unik = [];
      vals.forEach(v => { if (unik.indexOf(v) === -1 && unik.length < MAKS) unik.push(v); });
      return unik.map(v => hitungSkenario({ premiTahunan: v }));
    }
    const vals = Array.prototype.slice.call(document.querySelectorAll('#gwBandingPilihan button[aria-pressed="true"]'))
      .map(b => +b.dataset.gwBand).filter(v => isFinite(v));
    if (mode === 'bayar') return vals.map(v => hitungSkenario({ bayar: v }));
    return vals.map(v => hitungSkenario({ lindung: v }));
  }

  function statusValidasi(r) {
    if (!r) return '';
    const gio = r.gio === true || String(r.validasi || '').toUpperCase() === 'GIO';
    return '<div class="gw-validasi-mini">' + (gio ? 'GIO' : 'Medical') + '</div>';
  }

  function kartu(x) {
    if (!x || !x.tersedia) {
      return '<div class="banding-kolom banding-mati"><div class="banding-judul">' +
        esc(x ? nilaiLabel(x.nilai) : 'Pilihan') + '</div><p class="catatan akt-peringatan">' +
        esc((x && x.alasan) || 'Tidak tersedia.') + '</p></div>';
    }
    const r = x.hasil, m = r.mata;
    const title = mode === 'premi' ? uang(r.premiTahunan, m) + '/tahun' :
      (mode === 'bayar' ? r.bayar + ' tahun bayar' : r.lindung + ' tahun perlindungan');
    return '<div class="banding-kolom">' +
      '<div class="banding-judul">' + esc(title) + statusValidasi(r) + '</div>' +
      '<table class="akt-tabel banding-tabel"><tbody>' +
      brs('Masa bayar', r.bayar + ' tahun') +
      brs('Masa pertanggungan', r.lindung + ' tahun') +
      brs('Premi per tahun', uang(r.premiTahunan, m)) +
      brs('Premi per setoran', uang(r.premiPerSetoran, m)) +
      brs('Total premi dibayar', uang(r.totalPremi, m)) +
      brs('Uang pertanggungan', uang(r.up, m)) +
      brs('Manfaat akhir kontrak', uang(r.manfaatAkhir, m)) +
      brs('Meninggal setelah masa bayar', uang(r.up, m)) +
      brs('Meninggal karena kecelakaan', 'hingga ' + uang(r.batasKecelakaan, m)) +
      brs('Underwriting', r.validasi) +
      '</tbody></table>' +
      '<div class="banding-premi"><span>Premi per setoran (' + esc(r.frekuensi) + ')</span><b>' + uang(r.premiPerSetoran, m) + '</b></div>' +
      '<label class="banding-centang"><input type="checkbox" checked data-kolom-cetak="' + (hasil.indexOf(x) + 1) + '"><span>Ikut dicetak</span></label>' +
      '</div>';
  }

  function brs(k, v) { return '<tr><td>' + esc(k) + '</td><td><b>' + v + '</b></td></tr>'; }

  function identitasRingkas() {
    const d = dasarTerakhir();
    if (!d) return {};
    return d.isian;
  }

  function samaDanBeda(data) {
    const urutan = [
      'Masa bayar','Masa pertanggungan','Premi per tahun','Premi per setoran',
      'Total premi dibayar','Uang pertanggungan','Manfaat akhir kontrak',
      'Meninggal setelah masa bayar','Meninggal karena kecelakaan','Underwriting'
    ];
    const get = function (r, label) {
      if (label === 'Masa bayar') return r.bayar + ' tahun';
      if (label === 'Masa pertanggungan') return r.lindung + ' tahun';
      if (label === 'Premi per tahun') return uang(r.premiTahunan, r.mata);
      if (label === 'Premi per setoran') return uang(r.premiPerSetoran, r.mata);
      if (label === 'Total premi dibayar') return uang(r.totalPremi, r.mata);
      if (label === 'Uang pertanggungan') return uang(r.up, r.mata);
      if (label === 'Manfaat akhir kontrak') return uang(r.manfaatAkhir, r.mata);
      if (label === 'Meninggal setelah masa bayar') return uang(r.up, r.mata);
      if (label === 'Meninggal karena kecelakaan') return 'hingga ' + uang(r.batasKecelakaan, r.mata);
      if (label === 'Underwriting') return r.validasi;
      return '—';
    };
    const sama = [], beda = [];
    urutan.forEach(function (label) {
      const vals = data.map(x => get(x.hasil, label));
      if (vals.every(v => v === vals[0])) sama.push({label, value: vals[0]});
      else beda.push({label, values: vals});
    });
    return {sama, beda};
  }

  function renderHasil() {
    const w = el('layarGenWealthBanding');
    if (!w || !hasil.length) return renderPemilih();
    const d = dasarTerakhir();
    const i = identitasRingkas();
    const data = hasil.filter(x => x && x.tersedia);
    const m = data[0] ? data[0].hasil.mata : i.mata;
    const sb = samaDanBeda(data);

    const kepala = '<tr><th>Keterangan</th>' + data.map(x => '<th class="ka">' + esc(mode === 'premi' ? uang(x.hasil.premiTahunan, m) : (mode === 'bayar' ? x.hasil.bayar + ' tahun' : x.hasil.lindung + ' tahun')) + '</th>').join('') + '</tr>';
    const tabelBeda = sb.beda.length
      ? '<div class="blok"><h2>Yang berbeda</h2><div class="gulir"><table class="akt-tabel"><thead>' + kepala + '</thead><tbody>' +
        sb.beda.map(b => '<tr><td>' + esc(b.label) + '</td>' + b.values.map(v => '<td class="ka"><b>' + esc(v) + '</b></td>').join('') + '</tr>').join('') +
        '</tbody></table></div></div>' : '';
    const tabelSama = sb.sama.length
      ? '<div class="blok"><h2>Yang sama pada semua pilihan</h2><table class="akt-tabel"><tbody>' +
        sb.sama.map(b => '<tr><td>' + esc(b.label) + '</td><td><b>' + esc(b.value) + '</b></td></tr>').join('') +
        '</tbody></table></div>' : '';

    /* Ringkasan komprehensif mengikuti isi ringkasan GEN Wealth single:
       selain parameter utama, manfaat dan timeline tetap ditampilkan. Yang
       identik cukup sekali; angka yang berubah tetap berdampingan. */
    const timelineMax = data.reduce(function (n, x) { return Math.max(n, x.hasil.timeline.length); }, 0);
    const timelineRows = [];
    for (let idx = 0; idx < timelineMax; idx++) {
      const first = data[0].hasil.timeline[idx];
      if (!first) continue;
      timelineRows.push('<tr>' +
        '<td>' + first.tahun + '</td><td>' + first.usia + '</td>' +
        data.map(function (x) {
          const b = x.hasil.timeline[idx];
          if (!b) return '<td class="ka">—</td>';
          return '<td class="ka"><div><b>' + uang(b.sebabApaPun, m) + '</b></div>' +
            '<div class="catatan">Meninggal</div>' +
            '<div><b>' + uang(b.totalKecelakaan, m) + '</b></div>' +
            '<div class="catatan">Kecelakaan</div>' +
            (b.manfaatAkhir !== null ? '<div><b>' + uang(b.manfaatAkhir, m) + '</b></div><div class="catatan">Manfaat akhir</div>' : '') +
            '</td>';
        }).join('') + '</tr>');
    }
    const kepalaTimeline = '<tr><th>Tahun</th><th>Usia</th>' + data.map(function (x) {
      const r = x.hasil;
      return '<th class="ka">' + esc(mode === 'premi' ? uang(r.premiTahunan, m) : (r.bayar + ' th bayar · ' + r.lindung + ' th')) + '</th>';
    }).join('') + '</tr>';
    const timelineHtml = '<div class="blok"><h2>Tabel manfaat pertanggungan</h2>' +
      '<div class="gulir"><table class="tahunan"><thead>' + kepalaTimeline + '</thead><tbody>' + timelineRows.join('') +
      '</tbody></table></div><p class="catatan">Meninggal dunia karena sebab apa pun selama masa pembayaran mengikuti premi yang sudah dibayar; setelah masa pembayaran mengikuti uang pertanggungan. Tambahan kecelakaan mengikuti batas manfaat produk. Pada akhir masa pertanggungan, manfaat akhir dibayarkan sebesar uang pertanggungan.</p></div>';

    const ketentuanHtml = '<div class="blok"><h2>Ketentuan pokok yang sama</h2><table class="akt-tabel"><tbody>' +
      '<tr><td>Usia masuk tertanggung</td><td><b>31 hari sampai 70 tahun</b></td></tr>' +
      '<tr><td>Usia masuk pemegang polis</td><td><b>18 sampai 90 tahun</b></td></tr>' +
      '<tr><td>Cara pembayaran premi</td><td><b>' + esc(i.frekuensi || 'Tahunan') + '</b></td></tr>' +
      '<tr><td>Premi minimum masa bayar 2 tahun</td><td><b>' + uang((engine().PREMI_MIN[m] || {})[2], m) + ' per tahun</b></td></tr>' +
      '<tr><td>Premi minimum masa bayar 3 dan 5 tahun</td><td><b>' + uang((engine().PREMI_MIN[m] || {})[3], m) + ' per tahun</b></td></tr>' +
      '</tbody></table></div>';

    w.innerHTML =
      '<div class="kop"><h2>GEN Wealth — Perbandingan Pilihan</h2>' +
      '<p>Untuk <b>' + esc(i.nama || 'Nasabah') + '</b>. Perbandingan: <b>' + esc(labelMode()) + '</b>. Data dan manfaat dihitung ulang menggunakan engine GEN Wealth yang sama dengan kalkulator utama.</p>' +
      '<div class="identitas">' +
      '<div>Usia masuk<b>' + (d.hasil.usia || i.usia) + ' tahun</b></div>' +
      '<div>Mata uang<b>' + (m === 'USD' ? 'US Dolar' : 'Rupiah') + '</b></div>' +
      '<div>Cara bayar<b>' + esc(i.frekuensi || 'Tahunan') + '</b></div>' +
      '<div>Premi utama<b>' + uang(i.premiTahunan, m) + '/tahun</b></div>' +
      '</div></div>' +
      '<div class="banding-gulir"><div class="banding-baris">' + hasil.map(kartu).join('') + '</div></div>' +
      '<p class="catatan" style="margin-top:10px">Setiap kartu adalah satu skenario lengkap. Status <b>GIO/Medical</b> ditampilkan kecil di bawah judul kartu karena berlaku untuk seluruh skenario, bukan untuk setiap baris manfaat.</p>' +
      tabelSama + tabelBeda +
      timelineHtml + ketentuanHtml +
      '<div class="blok"><h2>Ringkasan GEN Wealth</h2>' +
      '<table class="akt-tabel"><tbody>' +
      '<tr><td>Nama tertanggung</td><td><b>' + esc(i.nama || '—') + '</b></td></tr>' +
      '<tr><td>Usia masuk</td><td><b>' + (d.hasil.usia || i.usia) + ' tahun</b></td></tr>' +
      '<tr><td>Mata uang</td><td><b>' + (m === 'USD' ? 'US Dolar' : 'Rupiah') + '</b></td></tr>' +
      '<tr><td>Cara pembayaran</td><td><b>' + esc(i.frekuensi || 'Tahunan') + '</b></td></tr>' +
      '</tbody></table>' +
      '<p class="catatan">Semua pilihan tetap mengikuti ketentuan GEN Wealth: manfaat meninggal selama masa pembayaran berdasarkan premi yang sudah dibayar, setelah masa pembayaran berdasarkan uang pertanggungan, tambahan kecelakaan sesuai batas produk, dan manfaat akhir sebesar uang pertanggungan pada akhir masa pertanggungan.</p></div>' +
      '<div class="akt-aksi tanpa-cetak" style="margin-top:12px">' +
      '<button class="aksi" id="gwBandingCetak" type="button">Cetak / simpan PDF</button>' +
      '<button class="sakelar" id="gwBandingPrompt" type="button">Salin prompt AI</button>' +
      '<button class="sakelar" id="gwBandingUbah" type="button">Ubah pilihan</button>' +
      '</div>';
  }

  function promptAI() {
    const d = dasarTerakhir();
    if (!d) return '';
    const rows = hasil.filter(x => x && x.tersedia).map(function (x) {
      const r = x.hasil;
      return (mode === 'premi' ? uang(r.premiTahunan, r.mata) + '/tahun' : (mode === 'bayar' ? 'bayar ' + r.bayar + ' tahun' : 'perlindungan ' + r.lindung + ' tahun')) +
        ': masa bayar ' + r.bayar + ' tahun, masa perlindungan ' + r.lindung + ' tahun, premi ' + uang(r.premiTahunan, r.mata) + '/tahun, premi per setoran ' + uang(r.premiPerSetoran, r.mata) + ', total premi ' + uang(r.totalPremi, r.mata) + ', UP/manfaat akhir ' + uang(r.up, r.mata) + ', meninggal setelah masa bayar ' + uang(r.up, r.mata) + ', kecelakaan hingga ' + uang(r.batasKecelakaan, r.mata) + ', validasi ' + r.validasi + '.';
    }).join(' | ');
    return 'Buatkan ringkasan/flyer perbandingan GEN Wealth untuk ' + (d.isian.nama || 'nasabah') + '. Gunakan hanya data berikut dan jangan membuat angka atau manfaat baru. Usia masuk ' + d.hasil.usia + ' tahun, mata uang ' + d.isian.mata + ', frekuensi ' + d.isian.frekuensi + '. Jenis perbandingan: ' + labelMode() + '. Pilihan: ' + rows + ' Jelaskan apa yang sama satu kali dan tampilkan perbedaan pilihan secara berdampingan agar prospek mudah memilih. Sertakan manfaat meninggal, manfaat kecelakaan, manfaat akhir, total premi, masa bayar, masa perlindungan, serta status GIO/Medical setiap pilihan. Jangan mengubah angka. Gunakan hasil cetak halaman ini sebagai sumber angka. Sertakan logo PSG.';
  }

  function buka() {
    hasil = [];
    mode = 'lindung';
    renderPemilih();
    window.bukaLayar('GENWEALTH_BANDING');
  }

  function pasang() {
    document.addEventListener('change', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.id === 'gwBandingMode') {
        mode = t.value || 'lindung';
        renderPemilih();
        return;
      }
    });

    document.addEventListener('input', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.matches('.gw-band-premi-input')) {
        const n = parseNominal(t.value);
        t.value = n ? n.toLocaleString('id-ID') : '';
      }
    });

    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('#gwTblBanding')) { buka(); return; }

      const b = t.closest('[data-gw-band]');
      if (b) {
        const aktif = document.querySelectorAll('#gwBandingPilihan button[aria-pressed="true"]').length;
        const nyala = b.getAttribute('aria-pressed') === 'true';
        if (!nyala && aktif >= MAKS) {
          const p = el('gwBandingPesan'); if (p) p.textContent = 'Paling banyak ' + MAKS + ' pilihan sekaligus.';
          return;
        }
        b.setAttribute('aria-pressed', String(!nyala));
        const p = el('gwBandingPesan'); if (p) p.textContent = '';
        return;
      }

      if (t.closest('#gwBandingJalan')) {
        hasil = buildHasil().filter(Boolean);
        const p = el('gwBandingPesan');
        if (hasil.filter(x => x.tersedia).length < 2) {
          if (p) p.textContent = 'Pilih minimal dua pilihan yang valid untuk dibandingkan.';
          return;
        }
        renderHasil();
        window.bukaLayar('GENWEALTH_BANDING');
        return;
      }

      if (t.closest('#gwBandingUbah')) { hasil = []; renderPemilih(); return; }

      if (t.closest('#gwBandingCetak')) {
        const d = dasarTerakhir();
        const old = document.title;
        document.title = 'Perbandingan GEN Wealth - ' + ((d && d.isian.nama) || 'Nasabah');
        document.body.dataset.gwPrintOnlyChecked = '1';
        document.querySelectorAll('#layarGenWealthBanding .banding-kolom').forEach(function (k) {
          const c = k.querySelector('input[data-kolom-cetak]');
          k.classList.toggle('gw-print-hide', !!c && !c.checked);
        });
        window.print();
        setTimeout(function () {
          delete document.body.dataset.gwPrintOnlyChecked;
          document.querySelectorAll('#layarGenWealthBanding .banding-kolom.gw-print-hide').forEach(function (k) { k.classList.remove('gw-print-hide'); });
          document.title = old;
        }, 1000);
        return;
      }

      if (t.closest('#gwBandingPrompt')) {
        const teks = promptAI();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(teks).then(function () {
            t.textContent = 'Prompt tersalin';
            setTimeout(function () { t.textContent = 'Salin prompt AI'; }, 1800);
          }).catch(function () {});
        }
      }
    });
  }

  function mulai() {
    if (!daftarLayar()) { setTimeout(mulai, 200); return; }
    pasang();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();

  window.InsuranceHubBandingGenWealth = { buka, render: renderHasil };
})();
