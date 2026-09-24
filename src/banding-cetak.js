/* ============================================================
   Cetak Perbandingan
   ------------------------------------------------------------
   Mengubah cara kerja seluruh halaman banding di aplikasi.

   Sebelumnya: kolom banding dilihat di layar, lalu agen memilih
   SATU pilihan, kembali ke kalkulator, dan mencetak satu
   ilustrasi. Untuk menawarkan tiga pilihan ke satu prospek,
   agen harus mengulang tiga kali.

   Sekarang: tiap kolom punya kotak centang. Agen mencentang
   satu sampai tiga pilihan, lalu menekan cetak, dan keluar SATU
   PDF berisi ringkasan perbandingan seluruh pilihan itu.
   Kalau yang dicentang hanya satu, hasilnya jadi penawaran satu
   program biasa.

   Modul ini tidak menghitung apa pun. Dia membaca kolom yang
   sudah digambar halaman banding mana pun, lalu menyusun ulang
   isinya jadi tabel perbandingan: baris yang nilainya berbeda
   ditampilkan berdampingan, baris yang nilainya sama di semua
   pilihan ditulis sekali saja supaya tidak berulang.

   Karena bekerja dari tampilan, satu modul ini berlaku untuk
   semua produk sekaligus, termasuk halaman banding yang dibuat
   belakangan.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const esc = (t) => String(t === null || t === undefined ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* Batas jumlah pilihan yang boleh dicentang, menurut layar bandingnya. */
  const BATAS = {
    layarSolusiBanding: 3,
    layarBandingProduk: 3,
    layarGhpBanding: 3,
    layarGhpPlanBanding: 3,
    layarGPROBanding: 3,
    layarGPROBandingRingkas: 3
  };
  const BATAS_KHUSUS = { LF: 2, KMB: 2 };   // Lite Future dan Kombinasi cukup dua

  function batasUntuk(wadah) {
    const produk = wadah.getAttribute('data-produk-banding');
    if (produk && BATAS_KHUSUS[produk]) return BATAS_KHUSUS[produk];
    return BATAS[wadah.id] || 3;
  }

  /* ---------- Kotak centang di tiap kolom ---------- */

  function pasangCentang() {
    document.querySelectorAll('.banding-kolom').forEach(function (kolom) {
      if (kolom.classList.contains('banding-mati')) return;
      const judul = kolom.querySelector('.banding-judul');
      if (!judul) return;
      if (kolom.querySelector('.banding-centang input[data-kolom-cetak]')) return;

      const saudara = Array.prototype.slice.call(kolom.parentNode ? kolom.parentNode.querySelectorAll(':scope > .banding-kolom') : []);
      const nomor = saudara.filter(function (k) { return !k.classList.contains('banding-mati'); }).indexOf(kolom) + 1;
      const label = document.createElement('label');
      label.className = 'banding-centang';
      label.innerHTML = '<input type="checkbox" checked data-kolom-cetak="' + nomor + '"><span>Ikut dicetak</span>';
      const premi = kolom.querySelector('.banding-premi');
      if (premi && premi.parentNode) premi.insertAdjacentElement('afterend', label);
      else kolom.appendChild(label);
    });
    segarkanCatatan();
  }


  function kolomTerpilih(wadah) {
    return Array.prototype.slice.call(wadah.querySelectorAll('.banding-kolom'))
      .filter(function (k) {
        const c = k.querySelector('.banding-centang input');
        return c && c.checked;
      });
  }

  function wadahAktif() {
    const kandidat = Object.keys(BATAS).map(el).filter(Boolean);
    return kandidat.find(function (n) { return n.classList.contains('aktif'); }) || null;
  }

  function segarkanCatatan() {
    const w = wadahAktif();
    if (!w) return;
    const total = w.querySelectorAll('[data-kolom-cetak]').length;
    const n = total ? (total - kolomTidakDicetak(w).length) : kolomTerpilih(w).length;
    let p = w.querySelector('.banding-catatan-cetak');
    if (!p) {
      const aksi = w.querySelector('.akt-aksi');
      if (!aksi) return;
      if(!aksi.querySelector('[data-banding-preview]')){ const pv=document.createElement('button'); pv.type='button'; pv.className='sakelar'; pv.dataset.bandingPreview='1'; pv.textContent='Ringkasan / Preview'; aksi.insertBefore(pv,aksi.firstChild); }
      p = document.createElement('p');
      p.className = 'catatan banding-catatan-cetak tanpa-cetak';
      aksi.insertAdjacentElement('beforebegin', p);
    }
    const teksBaru = n === 0
      ? 'Centang minimal satu pilihan untuk dicetak.'
      : (n === 1
        ? 'Satu pilihan dicentang. Hasil cetaknya berupa penawaran satu program.'
        : n + ' pilihan dicentang. Hasil cetaknya berupa satu halaman perbandingan.');
    if (p.textContent !== teksBaru) p.textContent = teksBaru;
  }

  /* ---------- Membaca isi kolom ---------- */

  /* Tiap kolom banding berisi tabel dengan baris "label | nilai". Isinya
     dibaca apa adanya, jadi modul ini ikut mengerti kolom produk apa pun. */
  function bacaKolom(kolom) {
    const judulNode = kolom.querySelector('.banding-judul');
    const judul = judulNode ? judulNode.textContent.trim() : 'Pilihan';
    const isi = [];
    kolom.querySelectorAll('table tr').forEach(function (tr) {
      const sel = tr.querySelectorAll('td');
      if (sel.length < 2) return;
      isi.push({
        label: sel[0].textContent.trim(),
        nilai: sel[1].textContent.trim()
      });
    });
    const premi = kolom.querySelector('.banding-premi');
    let premiLabel = '', premiNilai = '';
    if (premi) {
      const s = premi.querySelector('span'), b = premi.querySelector('b');
      premiLabel = s ? s.textContent.trim() : 'Premi';
      premiNilai = b ? b.textContent.trim() : '';
    }
    const peringatan = kolom.querySelector('.akt-peringatan');
    return {
      judul: judul, isi: isi,
      premiLabel: premiLabel, premiNilai: premiNilai,
      peringatan: peringatan ? peringatan.textContent.trim() : ''
    };
  }

  /* ---------- Menyusun ringkasan cetak ---------- */

  function susunRingkasan(kolom) {
    const data = kolom.map(bacaKolom);
    if (!data.length) return '';

    // Urutan baris mengikuti kolom pertama, lalu ditambah baris milik kolom
    // lain yang belum muncul, supaya tidak ada keterangan yang hilang.
    const urutan = [];
    data.forEach(function (d) {
      d.isi.forEach(function (b) {
        if (urutan.indexOf(b.label) === -1) urutan.push(b.label);
      });
    });

    const nilaiDi = function (d, label) {
      const b = d.isi.find(function (x) { return x.label === label; });
      return b ? b.nilai : '\u2014';
    };

    const beda = [], sama = [];
    urutan.forEach(function (label) {
      const nilai = data.map(function (d) { return nilaiDi(d, label); });
      const semuaSama = nilai.every(function (v) { return v === nilai[0]; });
      (semuaSama && data.length > 1 ? sama : beda).push({ label: label, nilai: nilai });
    });

    const satu = data.length === 1;
    const kepala = '<tr><th>Keterangan</th>' +
      data.map(function (d) { return '<th class="ka">' + esc(d.judul) + '</th>'; }).join('') +
      '</tr>';

    let html = '<div class="cetak-banding">';
    html += '<h2>' + (satu ? 'Ringkasan Penawaran' : 'Ringkasan Perbandingan Penawaran') + '</h2>';
    // Nama dan usia calon nasabah wajib ada di setiap cetakan, termasuk
    // versi perbandingan — bukan hanya di versi satu program.
    const identitas = bacaIdentitas();
    if (identitas) html += '<p class="cetak-banding-identitas">' + identitas + '</p>';

    // Premi ditaruh paling atas: itu angka yang paling dicari nasabah.
    if (data.some(function (d) { return d.premiNilai; })) {
      html += '<table class="akt-tabel cetak-banding-premi"><thead>' + kepala + '</thead><tbody>' +
        '<tr><td>' + esc(data[0].premiLabel || 'Premi') + '</td>' +
        data.map(function (d) { return '<td class="ka"><b>' + esc(d.premiNilai) + '</b></td>'; }).join('') +
        '</tr></tbody></table>';
    }

    if (beda.length) {
      html += '<h3>' + (satu ? 'Rincian' : 'Yang membedakan') + '</h3>' +
        '<table class="akt-tabel"><thead>' + kepala + '</thead><tbody>' +
        beda.map(function (b) {
          return '<tr><td>' + esc(b.label) + '</td>' +
            b.nilai.map(function (v) { return '<td class="ka">' + esc(v) + '</td>'; }).join('') +
            '</tr>';
        }).join('') + '</tbody></table>';
    }

    if (sama.length) {
      html += '<h3>Sama pada semua pilihan</h3>' +
        '<table class="akt-tabel"><tbody>' +
        sama.map(function (b) {
          return '<tr><td>' + esc(b.label) + '</td><td><b>' + esc(b.nilai[0]) + '</b></td></tr>';
        }).join('') + '</tbody></table>';
    }

    const catatan = data.filter(function (d) { return d.peringatan; });
    if (catatan.length) {
      html += '<h3>Catatan</h3><ul>' +
        catatan.map(function (d) {
          return '<li><b>' + esc(d.judul) + '</b>: ' + esc(d.peringatan) + '</li>';
        }).join('') + '</ul>';
    }

    // Lampiran penjelasan: NCB, NCD, masa tunggu, dan catatan produk. Isinya
    // sama lengkap dengan versi satu program, sesuai permintaan.
    const lampiran = ambilLampiran(kolom);
    if (lampiran) html += lampiran;

    html += '</div>';
    return html;
  }

  /* Nama dan usia dibaca dari kop halaman banding, tanpa menghitung ulang. */
  function bacaIdentitas() {
    const w = wadahAktif();
    if (!w) return '';
    const kop = w.querySelector('.kop p');
    return kop ? esc(kop.textContent.trim()) : '';
  }

  /* Halaman banding boleh menyediakan lampiran penjelasannya sendiri. */
  function ambilLampiran(kolom) {
    const w = wadahAktif();
    if (!w) return '';
    const G = window.InsuranceHubGhpAturan;

    if (G && G.lampiranDetail) {
      const plan = planUntukLampiran(w, kolom);
      if (plan.length) {
        try { return G.lampiranDetail(plan); } catch (_) { return ''; }
      }
    }
    const bawaan = w.querySelector('.lampiran-cetak');
    return bawaan ? bawaan.innerHTML : '';
  }

  /* Plan GHP mana yang penjelasannya perlu dilampirkan pada cetakan.
     Halaman banding plan memakai judul kolomnya. Halaman banding skenario
     memakai plan yang sedang dipilih di kalkulator, dan hanya bila rider
     kesehatannya memang diambil. */
  function planUntukLampiran(w, kolom) {
    const G = window.InsuranceHubGhpAturan;
    const semua = G ? G.semuaPlan() : [];
    const sah = function (n) { return n && semua.indexOf(n) !== -1; };

    if (w.id === 'layarGhpPlanBanding' || w.id === 'layarGhpBanding') {
      return kolom.map(function (k) {
        const j = k.querySelector('.banding-judul');
        return j ? j.textContent.trim() : '';
      }).filter(sah);
    }

    if (w.id === 'layarBandingProduk') {
      const produk = w.getAttribute('data-produk-banding');
      const nilai = function (id) { const n = el(id); return n ? n.value : ''; };
      const seg = function (id) {
        return (typeof nilaiSegmen === 'function') ? nilaiSegmen(id) : '';
      };
      let plan = '';
      if (produk === 'GHP' && seg('hRider') === 'Ya') plan = nilai('hPlan');
      else if (produk === 'GSPA' && seg('gRider') === 'Ya') plan = nilai('gPlanGhps');
      else if (produk === 'BSL' && seg('bRider') === 'Ya') plan = nilai('bPlanGhp');
      return sah(plan) ? [plan] : [];
    }
    return [];
  }

  /* ---------- Preview yang identik dengan hasil cetak ---------- */
  function preview(wadah) {
    const dipilih=kolomTerpilih(wadah);
    if(!dipilih.length){ segarkanCatatan(); return false; }
    let modal=document.getElementById('bandingPreviewModal');
    if(!modal){
      modal=document.createElement('div'); modal.id='bandingPreviewModal';
      modal.className='banding-preview-modal';
      modal.innerHTML='<div class="banding-preview-card"><div class="banding-preview-head"><b>Preview Ringkasan Perbandingan</b><button type="button" class="sakelar" data-preview-close>✕</button></div><div class="banding-preview-body"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-preview-close]'))modal.remove();});
    }
    modal.querySelector('.banding-preview-body').innerHTML=susunRingkasan(dipilih);
    return true;
  }

  /* ---------- Cetak ---------- */

  function cetak(wadah, judulBerkas) {
    const buangKolom = kolomTidakDicetak(wadah);
    const semua = Array.prototype.slice.call(wadah.querySelectorAll('.banding-kolom'))
      .filter(function (k) { return !k.classList.contains('banding-mati'); });
    const dipilih = semua.length
      ? semua.filter(function (k, i) { return buangKolom.indexOf(i + 1) === -1; })
      : kolomTerpilih(wadah);
    if (!dipilih.length) {
      segarkanCatatan();
      return false;
    }
    let kotak = wadah.querySelector('.cetak-banding-wadah');
    if (!kotak) {
      kotak = document.createElement('div');
      kotak.className = 'cetak-banding-wadah';
      wadah.appendChild(kotak);
    }
    kotak.innerHTML = susunRingkasan(dipilih);
    wadah.classList.add('sedang-cetak-banding');

    const asli = document.title;
    document.title = judulBerkas || 'Perbandingan Penawaran';
    window.print();
    setTimeout(function () {
      document.title = asli;
      wadah.classList.remove('sedang-cetak-banding');
    }, 1000);
    return true;
  }

  /* ---------- Peristiwa ---------- */

  function pasang() {
    document.addEventListener('change', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest('.banding-centang')) return;

      // Setiap kartu/kolom bisa dinyalakan atau dimatikan secara independen.
      // Bila semuanya OFF, artinya agen tidak memilih secara khusus, sehingga
      // saat cetak kita kembali ke perilaku awal: cetak semuanya.
      if (t.hasAttribute('data-kolom-cetak')) {
        segarkanCatatan();
        return;
      }

      const w = wadahAktif();
      if (!w) return;
      const batas = batasUntuk(w);
      if (t.checked && kolomTerpilih(w).length > batas) {
        t.checked = false;
        const p = w.querySelector('.banding-catatan-cetak');
        if (p) p.textContent = 'Paling banyak ' + batas + ' pilihan yang bisa dicetak bersamaan.';
        return;
      }
      segarkanCatatan();
    });

    // Semua tombol cetak di halaman banding diarahkan ke sini.
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const prev=t.closest('[data-banding-preview]');
      if(prev){ const w=wadahAktif(); if(w){ e.preventDefault(); e.stopImmediatePropagation(); preview(w); } return; }
      const tombolTabel = t.closest('#gproBandCetak');
      if (tombolTabel) {
        const w = wadahTabelAktif();
        if (w) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const buang = kolomTidakDicetak(w);
          sembunyikanKolom(w, buang);
          const asli = document.title;
          const kop = w.querySelector('.kop h2');
          document.title = (kop ? kop.textContent.trim() : 'Perbandingan') + ' - Penawaran';
          window.print();
          setTimeout(function () {
            document.title = asli;
            kembalikanKolom(w);
          }, 1000);
        }
        return;
      }

      const tombol = t.closest('#bandingGhpCetak, #bandingProdukCetak, #ghpBandingCetak, #sgsBandingCetak');
      if (!tombol) return;
      const w = wadahAktif() || wadahTabelAktif();
      if (!w) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      // Pilihan yang tidak dicentang disembunyikan lebih dulu, lalu
      // dikembalikan setelah dialog cetak selesai.
      const buang = kolomTidakDicetak(w);
      sembunyikanKolom(w, buang);
      const kop = w.querySelector('.kop h2');
      cetak(w, (kop ? kop.textContent.trim() : 'Perbandingan') + ' - Penawaran');
      setTimeout(function () { kembalikanKolom(w); }, 1200);
    }, true);
  }

  /* ---------- Halaman banding berbentuk tabel ----------
     Sebagian halaman banding (Gen Pro) menyajikan pilihan sebagai kolom
     tabel, bukan kartu, sehingga kotak centang per kartu tidak bisa dipakai.
     Di sini dibuat panel pemilih kolom: agen mencentang pilihan mana yang
     ikut dicetak, dan saat mencetak kolom yang tidak dicentang disembunyikan
     dari seluruh tabel di halaman itu. */

  /* Semua layar yang menampilkan hasil banding, apa pun bentuknya. */
  const WADAH_BANDING = [
    'layarSolusiBanding',
    'layarBandingProduk', 'layarGhpBanding', 'layarGhpPlanBanding',
    'layarGPROBanding', 'layarGPROBandingRingkas'
  ];

  function wadahTabelAktif() {
    return WADAH_BANDING.map(el).find(function (n) {
      return n && n.classList.contains('aktif');
    }) || null;
  }

  /* Bentuk halamannya bisa kartu berdampingan atau tabel berkolom. Panel
     pemilih dibuat sama untuk keduanya supaya agen tidak perlu tahu bedanya. */
  function daftarPilihan(w) {
    const kartu = Array.prototype.slice.call(w.querySelectorAll('.banding-kolom'))
      .filter(function (k) { return !k.classList.contains('banding-mati'); });
    if (kartu.length >= 2) {
      return {
        bentuk: 'kartu',
        label: kartu.map(function (k) {
          const j = k.querySelector('.banding-judul');
          return j ? j.textContent.replace(/\s+/g, ' ').trim() : 'Pilihan';
        }),
        simpul: kartu
      };
    }
    let maks = 0;
    w.querySelectorAll('table tr').forEach(function (tr) {
      maks = Math.max(maks, tr.children.length);
    });
    const th = w.querySelectorAll('table thead th');
    const label = [];
    for (let i = 1; i < maks; i++) {
      const h = th[i];
      label.push(h ? h.textContent.replace(/\s+/g, ' ').trim() : ('Pilihan ' + i));
    }
    return { bentuk: 'tabel', label: label, simpul: null };
  }

  function jumlahKolom(w) {
    const th = w.querySelectorAll('table thead th');
    let maks = 0;
    w.querySelectorAll('table tr').forEach(function (tr) {
      maks = Math.max(maks, tr.children.length);
    });
    return { maks: maks, judul: Array.prototype.slice.call(th) };
  }

  function pasangPemilihKolom() {
    const w = wadahTabelAktif();
    if (!w) return;
    const info = daftarPilihan(w);
    const jml = info.label.length;
    // Kartu sudah memiliki toggle di masing-masing kartu. Panel tambahan
    // hanya diperlukan untuk halaman yang benar-benar berbentuk tabel.
    if (jml < 2 || info.bentuk !== 'tabel') return;

    let panel = w.querySelector('.pilih-kolom-cetak');
    const tanda = info.bentuk + ':' + info.label.join('|');
    if (panel && panel.dataset.tanda === tanda) return;
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'blok tanpa-cetak pilih-kolom-cetak';
      const gulir = w.querySelector('.banding-gulir');
      if (gulir && gulir.parentNode) gulir.parentNode.insertBefore(panel, gulir);
      else {
        const aksi = w.querySelector('.aksi-row, .akt-aksi');
        const induk = aksi ? aksi.closest('.blok') : null;
        if (induk && induk.parentNode) induk.parentNode.insertBefore(panel, induk);
        else w.appendChild(panel);
      }
    }
    panel.dataset.tanda = tanda;
    panel.dataset.bentuk = info.bentuk;

    panel.innerHTML = '<h3>Pilih yang ikut dicetak</h3>' +
      '<p class="catatan">Semua tercentang berarti semuanya ikut ke PDF. Hilangkan ' +
      'centang pada pilihan yang tidak ingin dicetak. Boleh dua dari tiga.</p>' +
      '<div class="pilih-kolom-baris">' +
      info.label.map(function (teks, i) {
        return '<label class="banding-centang"><input type="checkbox" checked ' +
          'data-kolom-cetak="' + (i + 1) + '"><span>' + esc(teks) + '</span></label>';
      }).join('') +
      '</div>';
  }

  function kolomTidakDicetak(w) {
    const semua = Array.prototype.slice.call(w.querySelectorAll('[data-kolom-cetak]'));
    const aktif = semua.filter(function (c) { return c.checked; });
    // Tidak ada yang ON = tidak ada pilihan khusus; cetak semuanya.
    if (!aktif.length) return [];
    return semua.filter(function (c) { return !c.checked; })
      .map(function (c) { return +c.dataset.kolomCetak; });
  }

  /* Menyembunyikan kolom tertentu di seluruh tabel pada halaman itu. */
  function sembunyikanKolom(w, daftar) {
    const info = daftarPilihan(w);
    if (info.bentuk === 'kartu') {
      daftar.forEach(function (i) {
        const kartu = info.simpul[i - 1];
        if (kartu) { kartu.dataset.sembunyiCetak = '1'; kartu.style.display = 'none'; }
      });
      return;
    }
    w.querySelectorAll('table tr').forEach(function (tr) {
      daftar.forEach(function (i) {
        const sel = tr.children[i];
        if (sel) { sel.dataset.sembunyiCetak = '1'; sel.style.display = 'none'; }
      });
    });
  }

  function kembalikanKolom(w) {
    w.querySelectorAll('[data-sembunyi-cetak]').forEach(function (n) {
      n.style.display = '';
      delete n.dataset.sembunyiCetak;
    });
  }

  function segarkan() { pasangCentang(); pasangPemilihKolom(); }

  /* Kolom banding digambar ulang setiap kali agen menekan Bandingkan, dan
     waktunya tidak selalu sama. Pengamat perubahan ini memastikan kotak
     centang "Ikut dicetak" selalu terpasang begitu kolomnya muncul, tanpa
     bergantung pada jeda waktu. */
  let pengamatBanding = null;
  let sedangMenata = false;

  function pasangPengamat() {
    if (typeof MutationObserver !== 'function' || document.__pengamatBanding) return;
    document.__pengamatBanding = true;
    pengamatBanding = new MutationObserver(function () {
      if (sedangMenata) return;
      clearTimeout(pasangPengamat.__jeda);
      pasangPengamat.__jeda = setTimeout(function () {
        sedangMenata = true;
        try { pasangCentang(); } catch (_) {}
        // Perubahan yang baru saja dibuat modul ini sendiri dibuang dari
        // antrean, supaya tidak memanggil dirinya lagi.
        if (pengamatBanding) pengamatBanding.takeRecords();
        sedangMenata = false;
      }, 80);
    });
    ['layarSolusiBanding', 'layarBandingProduk', 'layarGhpBanding',
      'layarGhpPlanBanding', 'layarGPROBanding', 'layarGPROBandingRingkas']
      .forEach(function (id) {
        const n = el(id);
        if (n) pengamatBanding.observe(n, { childList: true, subtree: true });
      });
  }

  function mulai() {
    pasang();
    pasangPengamat();
    segarkan();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__cetakBandingHook) {
      const asli = window.bukaLayar;
      const bungkus = function () {
        const hasil = asli.apply(this, arguments);
        setTimeout(segarkan, 40);
        return hasil;
      };
      bungkus.__cetakBandingHook = true;
      ['__naHook', '__rzHook', '__promptHook', '__umumHook', '__ghpBandingHook',
        '__bandingProdukHook', '__pdkAnakHook', '__ghpSambungHook']
        .forEach(function (k) { bungkus[k] = asli[k]; });
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
    // Kolom banding digambar ulang setiap kali agen menekan Bandingkan.
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('[data-banding-jalan], [data-ghp-jalan], #hTblBanding')) {
        setTimeout(segarkan, 60);
      }
    });
  }

  window.InsuranceHubCetakBanding = { susunRingkasan, bacaKolom, kolomTerpilih, cetak, preview, segarkan };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    setTimeout(mulai, 100);
  }
})();
