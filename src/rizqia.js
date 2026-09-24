/* ============================================================
   RIZQIA — Asuransi Jiwa Berjangka Syariah
   Kalkulator berdiri sendiri, memakai tabel di src/data/rizqia.js.

   Bentuk produknya sederhana, jadi mesinnya juga:
   - Masa asuransi selalu 10 tahun.
   - Masa pembayaran 10 tahun (RIZQIA 10) atau 5 tahun (RIZQIA 5).
   - Meninggal sebab apa pun  : 100% manfaat asuransi
   - Meninggal karena kecelakaan: 200% manfaat asuransi
   - Hidup sampai akhir kontrak: 100% kontribusi yang sudah dibayar
   ============================================================ */
(function () {
  'use strict';

  const T = window.TARIF_RIZQIA, INFO = window.INFO_RIZQIA;
  if (!T || !INFO) return;

  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');

  const st = { plan: 'R10', mode: 'tahunan', up: 500000000, usia: null, hasil: null };

  /* Aturan pembelian RIZQIA (di luar tabel tarif) */
  const ATURAN = {
    upMin: 100000000,
    upMaks: 1000000000,
    kelipatan: 1000000,
    minKontribusi: { bulanan: 200000, tahunan: 2400000 }
  };

  /* Tarif di dalam satu baris tabel lurus terhadap uang pertanggungan
     (diperiksa: penyimpangan 0% di seluruh tabel), sehingga kontribusi bisa
     dihitung dari tarif per Rp100 juta untuk uang pertanggungan berapa pun. */
  function tarifPer100(plan, mode, usia) {
    const tabel = T.plan[plan] && T.plan[plan][mode];
    if (!tabel) return null;
    const baris = tabel[usia];
    if (!baris) return null;
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]) return baris[i] / (T.up[i] / 100000000);
    }
    return null;
  }

  /* Uang pertanggungan terkecil yang boleh diambil pada usia dan cara bayar
     tertentu: mengikuti batas produk, batas kontribusi minimum, dan kolom
     tabel yang memang dikosongkan sumbernya. */
  function upMinimum(plan, mode, usia) {
    const tarif = tarifPer100(plan, mode, usia);
    if (!tarif) return null;
    let min = ATURAN.upMin;

    // Kolom yang dikosongkan di tabel berarti tidak tersedia.
    const baris = T.plan[plan][mode][usia];
    for (let i = 0; i < baris.length; i++) {
      if (baris[i]) { min = Math.max(min, T.up[i]); break; }
    }

    // Kontribusi minimum.
    const perluUp = ATURAN.minKontribusi[mode] / tarif * 100000000;
    min = Math.max(min, Math.ceil(perluUp / ATURAN.kelipatan) * ATURAN.kelipatan);
    return min;
  }

  /* ---------- Mesin ---------- */

  function kontribusi(plan, mode, usia, up) {
    const tabel = T.plan[plan] && T.plan[plan][mode];
    if (!tabel) return null;
    const baris = tabel[usia];
    if (!baris) return null;
    const i = T.up.indexOf(up);
    if (i < 0) return null;
    const nilai = baris[i];
    return (nilai === null || nilai === undefined) ? null : nilai;
  }

  function hitung(inp) {
    const { plan, mode, usia, up } = inp;
    if (usia === null || usia === undefined || usia < INFO.usiaMin || usia > INFO.usiaMaks) {
      return { ok: false, pesan: 'Usia masuk RIZQIA adalah ' + INFO.usiaMin + ' sampai ' + INFO.usiaMaks + ' tahun.' };
    }
    const tarif = tarifPer100(plan, mode, usia);
    if (tarif === null) {
      return { ok: false, pesan: 'Tarif untuk usia ' + usia + ' tahun tidak tersedia pada ' +
        INFO.plan[plan].label + '.' };
    }
    if (up > ATURAN.upMaks) {
      return { ok: false, pesan: 'Manfaat asuransi RIZQIA paling besar ' + rp(ATURAN.upMaks) + '.' };
    }
    const minUp = upMinimum(plan, mode, usia);
    if (minUp && up < minUp) {
      return { ok: false, pesan: 'Untuk usia ' + usia + ' tahun dengan pembayaran ' + mode +
        ', manfaat asuransi paling kecil adalah ' + rp(minUp) + '.' };
    }
    const nilai = Math.round(tarif * (up / 100000000));
    const masaBayar = INFO.plan[plan].masaBayar;
    const perTahun = mode === 'bulanan' ? nilai * 12 : nilai;
    const totalKontribusi = perTahun * masaBayar;

    // Baris tabel manfaat, satu baris per tahun polis.
    const baris = [];
    for (let th = 1; th <= INFO.masaAsuransi; th++) {
      const masihBayar = th <= masaBayar;
      baris.push({
        tahun: th,
        usia: usia + th - 1,
        kontribusi: masihBayar ? nilai : 0,
        meninggal: up,
        kecelakaan: up * INFO.manfaat.meninggalKecelakaan,
        akhir: th === INFO.masaAsuransi ? totalKontribusi : 0
      });
    }

    // Peringatan khusus untuk baris tabel yang menyimpang polanya.
    let peringatan = '';
    const th = mode === 'bulanan' ? tarifPer100(plan, 'tahunan', usia) * (up / 100000000) : 0;
    if (mode === 'bulanan' && th && Math.abs((nilai / th) - 0.09) > 0.002) {
      peringatan = 'Kontribusi bulanan pada kelompok usia ini menyimpang dari pola ' +
        'tabel lainnya. Pastikan ke ilustrasi resmi sebelum diajukan ke nasabah.';
    }

    return {
      ok: true, plan, mode, usia, up, masaBayar,
      masaAsuransi: INFO.masaAsuransi,
      kontribusi: nilai, perTahun, totalKontribusi,
      manfaatMeninggal: up,
      manfaatKecelakaan: up * INFO.manfaat.meninggalKecelakaan,
      manfaatAkhir: totalKontribusi,
      baris, peringatan
    };
  }

  /* ---------- Layar ---------- */

  function daftarkanLayar() {
    const nav = window.InsuranceHubNavigation;
    if (!nav || !nav.LAYAR) return false;
    nav.LAYAR.RIZQIA = {
      el: 'layarRizqia', judul: 'RIZQIA',
      sub: 'Asuransi jiwa berjangka syariah', kiri: 'PRODUK',
      kanan: { ke: 'RIZQIA_RINGKAS', teks: 'Ringkasan' }
    };
    nav.LAYAR.RIZQIA_RINGKAS = {
      el: 'layarRizqiaRingkas', judul: 'Ringkasan RIZQIA',
      sub: 'Siap dicetak untuk nasabah', kiri: 'RIZQIA'
    };
    return true;
  }

  function kerangka() {
    const w = el('layarRizqia');
    if (!w) return;

    w.innerHTML =
      '<div class="kop"><h2>RIZQIA</h2>' +
      '<p>Asuransi jiwa berjangka berbasis syariah. Masa asuransi 10 tahun, ' +
      'dengan pengembalian 100% kontribusi bila peserta hidup sampai akhir kontrak.</p></div>' +

      '<div class="blok tanpa-cetak">' +
      '<h2>Data peserta</h2>' +
      '<div class="baris">' +
      '<div><label for="rzNama">Nama peserta</label>' +
      '<input id="rzNama" type="text" placeholder="Nama calon nasabah"></div>' +
      '<div><label for="rzTgl">Tanggal lahir</label><input id="rzTgl" type="date"></div>' +
      '</div>' +
      '<p class="catatan" id="rzUsiaInfo">Usia masuk dihitung dari tanggal lahir.</p>' +

      '<h2 style="margin-top:14px">Pilihan program</h2>' +
      '<div class="baris">' +
      '<div><label for="rzPlan">Masa pembayaran kontribusi</label><select id="rzPlan">' +
      '<option value="R10">RIZQIA 10 Years — bayar 10 tahun</option>' +
      '<option value="R5">RIZQIA 5 Years — bayar 5 tahun</option>' +
      '</select></div>' +
      '<div><label for="rzUp">Manfaat asuransi (uang pertanggungan)</label>' +
      '<input id="rzUp" type="text" inputmode="numeric" value="' + st.up.toLocaleString('id-ID') + '">' +
      '<p class="catatan" id="rzUpInfo">Minimal Rp100.000.000, maksimal Rp1.000.000.000.</p></div>' +
      '</div>' +
      '<div class="baris">' +
      '<div><label for="rzMode">Cara pembayaran</label><select id="rzMode">' +
      '<option value="tahunan">Tahunan</option><option value="bulanan">Bulanan</option>' +
      '</select></div>' +
      '<div><label for="rzMasa">Masa perlindungan</label>' +
      '<input id="rzMasa" type="text" value="10 tahun" readonly></div>' +
      '</div>' +
      '<p class="catatan" id="rzSkema">Skema: bayar 10 tahun, perlindungan 10 tahun.</p>' +
      '<button class="aksi" id="rzHitung" type="button">Hitung kontribusi</button>' +
      '<p class="catatan">Masa asuransi tetap 10 tahun untuk kedua pilihan. ' +
      'Tarif RIZQIA sama untuk pria dan wanita. Usia masuk 0 sampai 60 tahun.</p>' +
      '</div>' +

      '<div id="rzHasil"></div>' +
      '<div id="bandingKotak_RIZQIA" class="blok tanpa-cetak"></div>' +

      '<div class="blok tanpa-cetak">' +
      '<h2>Identitas penyaji</h2>' +
      '<div class="baris">' +
      '<div><label for="rzAgenNama">Nama agen</label><input id="rzAgenNama" type="text"></div>' +
      '<div><label for="rzAgenHP">Nomor HP</label><input id="rzAgenHP" type="tel" inputmode="numeric"></div>' +
      '</div></div>';

    const r = el('layarRizqiaRingkas');
    if (r) r.innerHTML = '<div id="rzRingkasIsi"></div>' +
      '<div class="akt-aksi tanpa-cetak" style="margin-top:14px">' +
      '<button class="aksi" id="rzCetak" type="button">Cetak / simpan PDF</button></div>';
  }

  /* ---------- Tampilan hasil ---------- */

  function gambarHasil() {
    const kotak = el('rzHasil');
    if (!kotak) return;
    const h = st.hasil;
    if (!h) { kotak.innerHTML = ''; return; }
    if (!h.ok) {
      kotak.innerHTML = '<div class="blok"><p class="catatan akt-peringatan">' + esc(h.pesan) + '</p></div>';
      return;
    }
    const labelMode = h.mode === 'bulanan' ? 'per bulan' : 'per tahun';
    kotak.innerHTML =
      '<div class="blok">' +
      '<h2>Hasil perhitungan</h2>' +
      (h.peringatan ? '<p class="catatan akt-peringatan">' + esc(h.peringatan) + '</p>' : '') +
      '<div class="na-kartu-grid">' +
      kartu('Kontribusi ' + labelMode, rp(h.kontribusi),
        INFO.plan[h.plan].label + ', dibayar ' + h.masaBayar + ' tahun.') +
      kartu('Total kontribusi', rp(h.totalKontribusi),
        'Seluruh kontribusi sampai masa pembayaran selesai.') +
      kartu('Manfaat meninggal dunia', rp(h.manfaatMeninggal),
        'Berlaku sejak polis terbit, sebab apa pun sesuai ketentuan polis.') +
      kartu('Meninggal karena kecelakaan', rp(h.manfaatKecelakaan),
        '200% dari manfaat asuransi.') +
      kartu('Manfaat akhir masa asuransi', rp(h.manfaatAkhir),
        'Bila peserta hidup sampai akhir tahun ke-' + h.masaAsuransi + '.') +
      '</div>' +
      '<button class="aksi" id="rzKeRingkas" type="button" style="margin-top:12px">' +
      'Lihat ringkasan untuk nasabah</button>' +
      '</div>';
  }

  function kartu(judul, nilai, catatan) {
    return '<div class="na-kartu"><div class="k">' + esc(judul) + '</div>' +
      '<div class="v angka">' + esc(nilai) + '</div>' +
      '<p class="catatan">' + esc(catatan) + '</p></div>';
  }

  /* ---------- Ringkasan untuk nasabah ---------- */

  function gambarRingkas() {
    const kotak = el('rzRingkasIsi');
    if (!kotak) return;
    const h = st.hasil;
    if (!h || !h.ok) {
      kotak.innerHTML = '<div class="blok"><p class="catatan">Hitung dulu di layar RIZQIA.</p></div>';
      return;
    }
    const nama = (el('rzNama') && el('rzNama').value.trim()) || 'Calon Nasabah';
    const agen = (el('rzAgenNama') && el('rzAgenNama').value.trim()) || '';
    const hp = (el('rzAgenHP') && el('rzAgenHP').value.trim()) || '';
    const labelMode = h.mode === 'bulanan' ? 'Bulanan' : 'Tahunan';

    kotak.innerHTML =
      '<div class="blok">' +
      '<h2>RIZQIA — ' + esc(INFO.plan[h.plan].label) + '</h2>' +
      '<p class="catatan">Asuransi Jiwa Berjangka Syariah &middot; kode produk ' + esc(INFO.kodeProduk) + '</p>' +
      '<table class="akt-tabel"><tbody>' +
      brs('Nama peserta', esc(nama)) +
      brs('Usia masuk', h.usia + ' tahun') +
      brs('Manfaat asuransi', rp(h.up)) +
      brs('Kontribusi dasar berkala', labelMode + ' &middot; <b>' + rp(h.kontribusi) + '</b>') +
      brs(h.mode === 'bulanan' ? 'Kontribusi per Tahun' : 'Kontribusi Tahunan', rp(h.mode === 'bulanan' ? h.kontribusi * 12 : h.kontribusi)) +
      brs('Masa pembayaran kontribusi', h.masaBayar + ' tahun') +
      brs('Masa perlindungan (masa asuransi)', h.masaAsuransi + ' tahun') +
      brs('Skema', h.masaBayar + ' - ' + h.masaAsuransi +
        ' (bayar ' + h.masaBayar + ' tahun, dilindungi ' + h.masaAsuransi + ' tahun)') +
      brs('Total kontribusi dibayar', rp(h.totalKontribusi)) +
      '</tbody></table>' +
      '</div>' +

      '<div class="blok">' +
      '<h2>Manfaat yang diterima</h2>' +
      '<div class="na-kartu-grid">' +
      kartu('Meninggal dunia', rp(h.manfaatMeninggal), '100% manfaat asuransi, sebab apa pun.') +
      kartu('Meninggal karena kecelakaan', rp(h.manfaatKecelakaan), '200% manfaat asuransi.') +
      kartu('Hidup sampai akhir kontrak', rp(h.manfaatAkhir), '100% kontribusi yang telah dibayarkan.') +
      '</div></div>' +

      '<div class="blok">' +
      '<h2>Tabel manfaat per tahun polis</h2>' +
      '<table class="akt-tabel"><thead><tr>' +
      '<th>Akhir tahun polis</th><th>Usia peserta</th>' +
      '<th class="ka">Kontribusi</th><th class="ka">Manfaat akhir polis</th>' +
      '<th class="ka">Meninggal dunia</th><th class="ka">Karena kecelakaan</th>' +
      '</tr></thead><tbody>' +
      h.baris.map(b => '<tr>' +
        '<td>' + b.tahun + '</td><td>' + b.usia + '</td>' +
        '<td class="ka">' + (b.kontribusi ? rp(b.kontribusi) : '—') + '</td>' +
        '<td class="ka">' + (b.akhir ? rp(b.akhir) : '') + '</td>' +
        '<td class="ka">' + rp(b.meninggal) + '</td>' +
        '<td class="ka">' + rp(b.kecelakaan) + '</td></tr>').join('') +
      '</tbody></table>' +
      '<p class="catatan">Kontribusi ditampilkan sesuai cara pembayaran yang dipilih. ' +
      'Pada RIZQIA 5, kontribusi berhenti setelah tahun ke-5 sementara perlindungan berjalan sampai tahun ke-10.</p>' +
      '</div>' +

      '<div class="blok">' +
      '<h2>Catatan produk</h2>' +
      '<ul>' +
      '<li>Produk asuransi jiwa berjangka berbasis syariah.</li>' +
      '<li>Kontribusi dialokasikan 50% sebagai ujrah pengelolaan polis dan 50% sebagai dana Tabarru\u2019.</li>' +
      '<li>Usia calon peserta 31 hari sampai 60 tahun, usia calon pemegang polis 18 sampai 90 tahun.</li>' +
      '<li>Tarif kontribusi sama untuk pria dan wanita.</li>' +
      '<li>Manfaat meninggal dunia tidak berlaku untuk pengecualian yang tercantum dalam polis.</li>' +
      '</ul>' +
      (agen || hp ? '<p class="catatan">Disajikan oleh <b>' + esc(agen || '—') + '</b>' +
        (hp ? ' &middot; <b>' + esc(hp) + '</b>' : '') + '</p>' : '') +
      '</div>';
  }

  function brs(k, v) {
    return '<tr><td style="color:#5B6573">' + k + '</td><td><b>' + v + '</b></td></tr>';
  }

  /* ---------- Usia ---------- */

  function hitungUsia(tgl) {
    if (typeof window.usiaGenerali === 'function') return window.usiaGenerali(tgl);
    const l = new Date(tgl + 'T00:00:00'), k = new Date();
    if (isNaN(l)) return null;
    let u = k.getFullYear() - l.getFullYear();
    const m = k.getMonth() - l.getMonth();
    if (m < 0 || (m === 0 && k.getDate() < l.getDate())) u--;
    return u;
  }

  function segarkanUsia() {
    const t = el('rzTgl'), info = el('rzUsiaInfo');
    if (!t || !info) return;
    if (!t.value) { st.usia = null; info.textContent = 'Usia masuk dihitung dari tanggal lahir.'; segarkanBatas(); return; }
    const u = hitungUsia(t.value);
    st.usia = u;
    info.innerHTML = (u === null) ? 'Tanggal lahir belum terbaca.'
      : 'Usia masuk: <b>' + u + ' tahun</b>' +
        (u > INFO.usiaMaks ? ' — di luar batas usia RIZQIA (maksimal ' + INFO.usiaMaks + ' tahun).' : '');
    segarkanBatas();
  }

  /* ---------- Ambil dari profil nasabah ---------- */

  function isiDariProfil() {
    const p = window.InsuranceHubCustomerProfile && window.InsuranceHubCustomerProfile.active
      ? window.InsuranceHubCustomerProfile.active() : null;
    if (!p) return;
    if (el('rzNama') && !el('rzNama').value) el('rzNama').value = p.nama || '';
    if (el('rzTgl') && !el('rzTgl').value && p.tglLahir) { el('rzTgl').value = p.tglLahir; segarkanUsia(); }
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;

      if (t.closest('#rzHitung')) {
        segarkanUsia();
        st.plan = el('rzPlan').value;
        st.mode = el('rzMode').value;
        st.up = angkaBersih(el('rzUp').value);
        st.hasil = hitung({ plan: st.plan, mode: st.mode, usia: st.usia, up: st.up });
        gambarHasil();
        gambarRingkas();
        return;
      }
      if (t.closest('#rzKeRingkas')) {
        gambarRingkas();
        window.bukaLayar('RIZQIA_RINGKAS');
        return;
      }
      if (t.closest('#rzCetak')) { cetakRingkas(); return; }
    });

    document.addEventListener('change', function (e) {
      if (!e.target) return;
      if (e.target.id === 'rzTgl') { segarkanUsia(); segarkanBatas(); }
      if (e.target.id === 'rzPlan' || e.target.id === 'rzMode') segarkanBatas();
    });

    document.addEventListener('input', function (e) {
      if (!e.target || e.target.id !== 'rzUp') return;
      const n = angkaBersih(e.target.value);
      e.target.value = n ? n.toLocaleString('id-ID') : '';
    });

    // Tombol cetak diikat langsung supaya tidak bergantung pada urutan pemuatan.
    const cetakBtn = el('rzCetak');
    if (cetakBtn) cetakBtn.addEventListener('click', cetakRingkas);
  }

  function angkaBersih(teks) {
    return Number(String(teks || '').replace(/[^0-9]/g, '')) || 0;
  }

  function cetakRingkas() {
    const nama = (el('rzNama') && el('rzNama').value.trim()) || 'Nasabah';
    const judul = 'Ilustrasi RIZQIA - ' + nama.replace(/[\\/:*?"<>|]/g, '').trim();
    if (typeof window.cetak === 'function') { window.cetak(judul); return; }
    const asli = document.title;
    document.title = judul;
    window.print();
    setTimeout(function () { document.title = asli; }, 1000);
  }

  /* Menampilkan batas uang pertanggungan sesuai usia dan cara bayar. */
  function segarkanBatas() {
    const info = el('rzUpInfo'), skema = el('rzSkema');
    const plan = el('rzPlan') ? el('rzPlan').value : 'R10';
    const mode = el('rzMode') ? el('rzMode').value : 'tahunan';
    if (skema) {
      const bayar = INFO.plan[plan].masaBayar;
      skema.textContent = 'Skema: bayar ' + bayar + ' tahun, perlindungan ' +
        INFO.masaAsuransi + ' tahun (' + bayar + ' - ' + INFO.masaAsuransi + ').';
    }
    if (!info) return;
    if (st.usia === null || st.usia === undefined) {
      info.textContent = 'Minimal ' + rp(ATURAN.upMin) + ', maksimal ' + rp(ATURAN.upMaks) +
        '. Isi tanggal lahir untuk melihat batas sebenarnya pada usia ini.';
      return;
    }
    const min = upMinimum(plan, mode, st.usia);
    if (!min) { info.textContent = 'Tarif untuk usia ini tidak tersedia.'; return; }
    info.innerHTML = 'Untuk usia ' + st.usia + ' tahun, pembayaran ' + mode +
      ': minimal <b>' + rp(min) + '</b>, maksimal <b>' + rp(ATURAN.upMaks) + '</b>.' +
      (min > ATURAN.upMin ? ' Batas ini mengikuti kontribusi minimum ' +
        rp(ATURAN.minKontribusi[mode]) + ' dan ketersediaan tabel tarif.' : '');
  }

  /* ---------- Mulai ---------- */

  function mulai() {
    if (!daftarkanLayar()) { setTimeout(mulai, 200); return; }
    kerangka();
    pasang();
    segarkanBatas();

    // Kartu produk di daftar produk.
    if (window.InsuranceHubNavigation && !window.InsuranceHubNavigation.__rzHook) {
      const bukaAsli = window.bukaLayar;
      const bungkus = function (nama) {
        const hasil = bukaAsli.apply(this, arguments);
        if (nama === 'RIZQIA') { isiDariProfil(); segarkanBatas(); }
        if (nama === 'RIZQIA_RINGKAS') { gambarRingkas(); }
        return hasil;
      };
      bungkus.__naHook = bukaAsli.__naHook;
      window.bukaLayar = bungkus;
      window.InsuranceHubNavigation.bukaLayar = bungkus;
      window.InsuranceHubNavigation.__rzHook = true;
    }
  }

  window.InsuranceHubRizqia = { hitung, kontribusi, tarifPer100, upMinimum, ATURAN, INFO, TARIF: T };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
