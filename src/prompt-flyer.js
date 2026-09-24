/* ============================================================
   Prompt Flyer AI — dynamic, complete, summary-as-source-of-truth
   ------------------------------------------------------------
   Prompt selalu terlihat dan dibangun dari SELURUH ringkasan layar
   aktif. Tidak ada pemotongan karakter agar data penting pada
   tabel/timeline panjang tidak hilang dari brief AI.
   ============================================================ */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const escText = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

  function judulLayar() {
    const j = el('judul');
    return (j && j.textContent.trim()) || 'Ringkasan';
  }

  function namaNasabah() {
    try {
      const aktif = localStorage.getItem('insuranceHub.customerProfile.active.v1');
      const daftar = JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1') || '[]');
      const p = daftar.find(x => x.id === aktif);
      if (p && p.nama) return p.nama.trim();
    } catch (_) {}
    return '';
  }

  function ringkasanHasil() {
    const aktif = document.querySelector('.layar.aktif');
    if (!aktif) return '';
    const salinan = aktif.cloneNode(true);
    salinan.querySelectorAll('.tanpa-cetak, button, input, select, textarea, script, style').forEach(n => n.remove());
    // SENGAJA tidak memakai slice()/batas karakter. Seluruh ringkasan aktif
    // adalah source of truth agar tabel/timeline panjang tidak terpotong.
    return escText(salinan.innerText || salinan.textContent || '');
  }

  function profilTema(judul, teks) {
    const s = (String(judul) + ' ' + String(teks)).toLowerCase();
    const hasil = [];
    const ada = (re) => re.test(s);

    const pensiun = ada(/pensiun|usia pensiun|lite future|masa pensiun/);
    const warisan = ada(/warisan|menjadi warisan|manfaat kematian|meninggal dunia/);
    const kesehatan = ada(/ghp|kesehatan|rawat inap|kamar|limit tahunan|medical/);
    const kritis = ada(/critical illness|penyakit kritis|ci\b/);
    const jiwa = ada(/jiwa|meninggal dunia|santunan meninggal/);
    const penghasilan = ada(/penghasilan|waiver|premi dibebaskan|kontribusi dibebaskan/);
    const pendidikan = ada(/pendidikan anak|dana pendidikan|kuliah|sekolah/);
    const rumah = ada(/kpr|cicilan rumah|rumah/);
    const kombinasi = ada(/kombinasi|program perlindungan|ringkasan gabungan|beberapa pilihan|komponen program/);

    if (pensiun && warisan) hasil.push('Menyiapkan dana pensiun sekaligus menjaga warisan keluarga');
    else if (pensiun) hasil.push('Menyiapkan dana pensiun dengan perlindungan yang tetap berjalan');
    if (pendidikan) hasil.push('Menjaga dana pendidikan tetap tersedia saat keluarga membutuhkannya');
    if (rumah) hasil.push('Menjaga rumah dan kewajiban keluarga tetap aman dari risiko');
    if (kesehatan && kritis && penghasilan) hasil.push('Menjaga kesehatan, penghasilan, dan ketahanan keuangan keluarga');
    else if (kesehatan && kritis) hasil.push('Menghadapi risiko kesehatan dan penyakit kritis tanpa mengorbankan rencana keuangan');
    else if (kesehatan && jiwa) hasil.push('Menjaga kesehatan sekaligus melindungi keluarga dari dampak finansial risiko jiwa');
    else if (kesehatan) hasil.push('Menjaga biaya kesehatan agar rencana keuangan keluarga tetap berjalan');
    if (jiwa && penghasilan && !pensiun && !kesehatan) hasil.push('Melindungi penghasilan hari ini dan menjaga rencana masa depan keluarga');
    if (kombinasi && hasil.length === 0) hasil.push('Satukan seluruh manfaat yang tersedia menjadi satu strategi perlindungan berdasarkan tujuan utama nasabah');

    // Ini hanya arah kreatif untuk AI, bukan judul final yang dipaksakan.
    if (!hasil.length) hasil.push('Temukan satu tujuan perlindungan paling kuat dari ringkasan dan ubah menjadi tema komunikasi yang spesifik');
    return hasil.slice(0, 2);
  }

  function temaFlyer(judul, teks) {
    const arah = profilTema(judul, teks);
    return arah.join(' / ');
  }

  /* Identitas penyaji diambil dari data agen yang sudah tersimpan, supaya
     flyer memuat siapa yang menyajikan beserta nomor yang bisa dihubungi. */
  function penyaji() {
    try {
      const a = JSON.parse(localStorage.getItem('insuranceHub.agen.v1') || '{}') || {};
      const nama = escText(a.nama || '');
      const hp = escText(a.hp || a.telepon || '');
      if (!nama && !hp) return '';
      return nama + (hp ? ' \u00b7 ' + hp : '');
    } catch (_) { return ''; }
  }

  /* Prompt berbeda menurut jenis halamannya. Halaman analisis kebutuhan
     berbicara tentang masalah dan besarnya kebutuhan; halaman solusi atau
     ilustrasi berbicara tentang programnya. Menyamakan keduanya membuat
     flyer analisis terdengar seperti jualan produk, dan flyer solusi
     kehilangan alasan mengapa programnya disusun. */
  function jenisHalaman(judul, teks) {
    const t = (judul + ' ' + teks).toLowerCase();
    /* Kehadiran angka premi atau setoran adalah penanda paling andal bahwa
       halaman ini sudah bicara solusi, bukan lagi kebutuhan. Diperiksa lebih
       dulu supaya halaman seperti "Rencana Dana Pensiun" — yang namanya
       terdengar seperti kebutuhan tetapi isinya sudah berupa program —
       tidak salah dikenali. */
    const adaAngkaProgram = /premi|setoran|kontribusi|masa bayar|lama bayar/.test(t);
    if (!adaAngkaProgram &&
        /kebutuhan|analisa|analisis|segitiga|dana pensiun|dana pendidikan/.test(t)) {
      return 'kebutuhan';
    }
    if (/banding|perbandingan|alternatif/.test(t)) return 'banding';
    return 'solusi';
  }

  function arahanJenis(jenis) {
    if (jenis === 'kebutuhan') {
      return [
        'JENIS HALAMAN: ANALISIS KEBUTUHAN.',
        'Fokuskan flyer pada BESARNYA KEBUTUHAN dan akibat bila kebutuhan itu tidak disiapkan.',
        'Jangan menawarkan produk, plan, atau premi apa pun di flyer ini walaupun kamu mengetahuinya.',
        'Akhiri dengan ajakan untuk membahas cara memenuhinya, bukan dengan penawaran.'
      ];
    }
    if (jenis === 'banding') {
      return [
        'JENIS HALAMAN: PERBANDINGAN ALTERNATIF.',
        'Sajikan alternatif berdampingan sehingga bedanya terlihat dalam sekali pandang.',
        'Tunjukkan apa yang didapat dan apa yang belum tertutup pada tiap alternatif secara jujur.',
        'Jangan menonjolkan satu alternatif seolah pilihan lain keliru; keputusan ada pada nasabah.'
      ];
    }
    return [
      'JENIS HALAMAN: SOLUSI / ILUSTRASI PROGRAM.',
      'Fokuskan flyer pada APA YANG DITERIMA NASABAH dan kapan diterimanya.',
      'Sebutkan premi beserta periodenya persis seperti sumber, termasuk tanda bintang bila ada.',
      'Bila ada manfaat yang berhenti atau cair pada usia tertentu, katakan apa adanya.'
    ];
  }

  function susunPrompt() {
    const nasabah = namaNasabah();
    const judul = judulLayar();
    const hasil = ringkasanHasil() || 'Belum ada ringkasan hasil yang terbaca pada layar aktif.';
    const arahTema = temaFlyer(judul, hasil);
    const kombinasi = /kombinasi|ringkasan gabungan|beberapa pilihan|komponen program/i.test(judul + ' ' + hasil);

    return [
      'Kamu adalah desainer grafis profesional yang membuat materi penjelasan asuransi untuk calon nasabah di Indonesia.',
      '',
      'TUGAS:',
      'Buat SATU flyer vertikal rasio 4:5, siap dikirim lewat WhatsApp, berdasarkan HASIL RINGKASAN yang saya berikan di bawah.',
      'Flyer harus menjadi versi visual yang lebih sederhana, premium, dan mudah dipahami dari ringkasan tersebut.',
      'Jangan membuat konsep, angka, manfaat, plan, atau janji baru yang tidak didukung ringkasan.',
      '',
      'ATURAN TEMA — WAJIB DINAMIS:',
      '1. Jangan menjadikan nama produk atau nama rider sebagai judul utama.',
      '2. Baca seluruh ringkasan lalu identifikasi tujuan finansial/perlindungan utama yang sedang diselesaikan program ini.',
      '3. Buat TEPAT SATU judul tema utama yang spesifik terhadap kombinasi manfaat yang benar-benar terlihat pada ringkasan.',
      '4. Judul harus menggambarkan fungsi/tujuan program bagi nasabah, bukan sekadar menyebut "perlindungan menyeluruh" atau slogan generik.',
      '5. Jika ada hubungan manfaat yang kuat (contoh: dana pensiun + manfaat meninggal menjadi warisan), gabungkan hubungan tersebut menjadi satu tema yang bermakna.',
      '6. Jangan memakai tema yang sama hanya karena nama produknya berbeda. Tema harus berubah mengikuti isi ringkasan.',
      '7. Arah tema dari sistem hanya berupa petunjuk kreatif. Validasi kembali terhadap seluruh ringkasan dan buat judul final yang paling relevan.',
      'ARAH TEMA DINAMIS DARI SISTEM: ' + arahTema,
      '',
      'ATURAN KHUSUS JIKA INI HASIL KOMBINASI:',
      kombinasi ? '1. Perlakukan seluruh kombinasi sebagai SATU PROGRAM PERLINDUNGAN / SATU STRATEGI untuk satu tujuan nasabah.' : '1. Jika hanya satu program, tetap komunikasikan sebagai satu solusi untuk tujuan nasabah.',
      '2. Jangan membuat flyer seperti katalog beberapa produk yang kebetulan dibeli bersamaan.',
      '3. Cari SATU tema payung dari hubungan manfaat seluruh komponen.',
      '4. Tampilkan produk/rider hanya sebagai komponen pendukung bila memang membantu pemahaman; bukan sebagai headline.',
      '5. Prioritaskan hasil akhir/tujuan program dan manfaat yang saling melengkapi sehingga nasabah melihat satu solusi yang utuh.',
      '',
      'KONTEKS HALAMAN:',
      judul + (nasabah ? ' \u00b7 Nasabah: ' + nasabah : ''),
      (penyaji() ? 'Disajikan oleh: ' + penyaji() : ''),
      '',
      ...arahanJenis(jenisHalaman(judul, hasil)),
      '',
      'BERKAS PDF TERLAMPIR:',
      'Saya melampirkan hasil cetak PDF dari halaman ini. Baca PDF tersebut sebagai',
      'sumber tampilan: ambil logo PSG, warna, dan susunan datanya dari sana.',
      'Bila ada perbedaan antara PDF dan teks ringkasan di bawah, ikuti PDF.',
      'Cantumkan logo PSG pada flyer, dan cantumkan nama penyaji beserta nomor',
      'kontaknya di bagian bawah flyer.',
      '',
      'SUMBER DATA — SOURCE OF TRUTH / WAJIB MENGIKUTI BAGIAN INI:',
      'SELURUH teks ringkasan di bawah adalah sumber fakta utama. Gunakan seluruh bagian, termasuk tabel, timeline, rincian premi, plan, rider, benefit, dan catatan yang tersedia.',
      'Jangan menganggap data yang tidak tertulis di bawah hanya karena kamu mengenal nama produknya.',
      'Jangan mengambil angka atau benefit dari pengetahuan umum, memori model, atau sumber lain.',
      '',
      '=== MULAI RINGKASAN LENGKAP ===',
      hasil,
      '=== SELESAI RINGKASAN LENGKAP ===',
      '',
      'ATURAN AKURASI ANGKA DAN ISI — MUTLAK:',
      '1. Gunakan HANYA angka, nama produk, manfaat, premi/kontribusi, masa bayar, masa perlindungan, plan, limit, usia, dan istilah yang benar-benar ada pada ringkasan.',
      '2. Salin angka persis seperti sumber. Jangan membulatkan, mengubah satuan, mengubah periode, atau menghilangkan digit.',
      '3. Jangan menghitung ulang angka kecuali ringkasan secara eksplisit sudah memberikan hasil perhitungan tersebut.',
      '4. Jangan menambahkan manfaat, jaminan, klaim keunggulan, janji hasil, atau perbandingan yang tidak terdapat pada ringkasan.',
      '5. Jangan menampilkan manfaat yang tidak dipilih, tidak aktif, atau tidak ada pada ringkasan seolah-olah dimiliki nasabah.',
      '6. Jika ada angka premi pada ringkasan, tampilkan angka premi tersebut secara persis dan gunakan label periode yang sesuai dengan sumber.',
      '7. Jika ada angka yang bertentangan, tidak jelas, atau tidak tersedia, jangan menebak. Ikuti data sumber atau hilangkan detail tersebut.',
      '8. Jika ruang flyer terbatas, lebih baik mengurangi jumlah informasi daripada mengubah atau mengarang angka.',
      '9. Jangan membuat tabel yang terlalu padat jika berisiko menyebabkan angka sulit dibaca. Pilih beberapa fakta utama yang paling relevan.',
      '',
      'STRUKTUR FLYER:',
      '- Satu judul tema utama yang spesifik terhadap tujuan/manfaat program.',
      '- Nama dan usia nasabah bila tersedia.',
      '- Satu kalimat singkat tentang kebutuhan/tujuan yang terlihat dari ringkasan.',
      '- Satu blok solusi/program sebagai satu kesatuan.',
      '- 3–5 manfaat atau angka paling relevan dan bernilai bagi nasabah.',
      '- Premi/setoran dan periode pembayaran bila tersedia.',
      '- Manfaat akhir/timeline hanya jika relevan dan tersedia.',
      '- Detail produk/rider hanya sebagai pendukung, bukan headline.',
      '',
      'GAYA DESAIN:',
      '- Modern, premium, bersih, simple tetapi lengkap dan menarik.',
      '- Elegan dan terasa seperti materi konsultasi profesional, bukan brosur katalog produk.',
      '- Prioritaskan keterbacaan di layar HP dan WhatsApp.',
      '- Hierarki visual: TEMA → TUJUAN → SATU SOLUSI PROGRAM → MANFAAT UTAMA → PREMI → DETAIL PENDUKUNG.',
      '- Gunakan logo PSG (Patriot Shining Generation) sebagai identitas visual utama.',
      '- Jangan menambahkan logo perusahaan lain kecuali memang terdapat pada materi sumber.',
      '- Gunakan ikon/ilustrasi relevan seperlunya; jangan membuat flyer terlalu ramai.',
      '- Semua teks panjang wajib wrapping. Tidak boleh ada teks, angka, tabel, atau label yang keluar dari kotaknya.',
      '- Jangan memaksakan semua tabel mentah ke flyer. Ambil fakta paling penting agar hasil tetap simple dan premium.',
      '',
      'ATURAN FINAL SEBELUM MENGHASILKAN FLYER:',
      'Lakukan pemeriksaan internal terhadap setiap angka dan benefit yang akan ditulis. Cocokkan kembali dengan RINGKASAN LENGKAP di atas.',
      'Jika suatu angka/benefit tidak dapat ditemukan di ringkasan, JANGAN TULIS.',
      'Jika flyer harus memilih antara estetika dan akurasi, AKURASI selalu menang.',
      '',
      'HASIL AKHIR:',
      'Satu flyer 4:5 yang komunikatif, modern, premium, elegan, mudah dibaca, memiliki SATU tema yang benar-benar sesuai isi ringkasan, dan tidak mengubah fakta/angka.',
      '',
      'DISCLAIMER KECIL:',
      'Ilustrasi tidak resmi. Seluruh angka merujuk pada ilustrasi resmi, Ketentuan Polis PT Asuransi Jiwa Generali Indonesia, dan hasil underwriting.'
    ].join('\n');
  }

  function salin(teks, tombol) {
    const beres = () => {
      const semula = tombol.textContent;
      tombol.textContent = 'Prompt tersalin';
      setTimeout(() => { tombol.textContent = semula; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(beres).catch(() => cadangan(teks, beres));
    } else cadangan(teks, beres);
  }

  function cadangan(teks, beres) {
    const ta = document.createElement('textarea');
    ta.value = teks;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); beres(); }
    catch (_) { tampilkanManual(teks); }
    document.body.removeChild(ta);
  }

  function panelUntuk(tombolCetak) {
    const id = 'promptFlyerPanel_' + tombolCetak.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    let panel = el(id);
    if (panel) return panel;

    panel = document.createElement('section');
    panel.id = id;
    panel.className = 'blok prompt-flyer-panel tanpa-cetak';
    panel.innerHTML =
      '<h2>Prompt Flyer AI</h2>' +
      '<p class="catatan prompt-flyer-ket">Prompt mengikuti seluruh ringkasan hasil yang sedang tampil. ' +
      'Tekan Salin, lalu tempel di aplikasi AI beserta PDF ringkasan yang sudah kamu simpan.</p>' +
      '<div class="prompt-flyer-tema" data-role="tema"></div>' +
      /* Teks prompt disembunyikan supaya halaman tidak penuh; isinya tetap
         ada di dalam textarea agar bisa disalin. */
      '<textarea data-role="prompt" readonly aria-label="Prompt Flyer AI" hidden></textarea>' +
      '<div class="aksi-row" style="margin-top:8px"><button class="sakelar prompt-flyer" type="button" data-role="copy">Salin prompt flyer</button></div>';

    const anchor = tombolCetak.closest('.tanpa-cetak');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    else if (tombolCetak.parentNode) tombolCetak.parentNode.insertBefore(panel, tombolCetak.nextSibling);
    else return null;

    panel.querySelector('[data-role="copy"]').addEventListener('click', () => {
      salin(panel.querySelector('[data-role="prompt"]').value, panel.querySelector('[data-role="copy"]'));
    });
    return panel;
  }

  function refreshPanel(panel) {
    if (!panel) return;
    const prompt = susunPrompt();
    const tema = temaFlyer(judulLayar(), ringkasanHasil());
    const ta = panel.querySelector('[data-role="prompt"]');
    const t = panel.querySelector('[data-role="tema"]');
    if (ta) ta.value = prompt;
    if (t) t.textContent = 'Arah tema dinamis: ' + tema;
  }

  function tempelkan() {
    const tombolCetak = Array.prototype.slice.call(document.querySelectorAll('button[id]')).filter(function (b) {
      if (!b || b.dataset.promptSudah) return false;
      if (!/cetak/i.test(b.id)) return false;
      if (/rekap|klaim/i.test(b.id)) return false;
      return true;
    });

    tombolCetak.forEach(function (b) {
      b.dataset.promptSudah = '1';
      const panel = panelUntuk(b);
      if (panel) refreshPanel(panel);
    });

    document.querySelectorAll('.prompt-flyer-panel').forEach(refreshPanel);
  }

  function tampilkanManual(teks) {
    const kotak = el('promptFlyerManual');
    if (!kotak) return;
    kotak.hidden = false;
    const ta = kotak.querySelector('textarea');
    if (ta) { ta.value = teks; ta.select(); }
  }

  function siapkanKotakManual() {
    if (el('promptFlyerManual')) return;
    const d = document.createElement('div');
    d.id = 'promptFlyerManual';
    d.className = 'blok tanpa-cetak';
    d.hidden = true;
    d.innerHTML = '<h2>Salin prompt secara manual</h2><p class="catatan">Peramban ini tidak mengizinkan penyalinan otomatis. Tekan lama pada kotak di bawah, pilih semua, lalu salin.</p><textarea rows="8" readonly style="width:100%"></textarea>';
    const main = document.querySelector('main');
    if (main) main.appendChild(d);
  }

  function refresh() { tempelkan(); }

  function mulai() {
    siapkanKotakManual();
    tempelkan();
    if (typeof window.bukaLayar === 'function' && !window.bukaLayar.__promptHook) {
      const asli = window.bukaLayar;
      const bungkus = function () {
        const hasil = asli.apply(this, arguments);
        setTimeout(refresh, 30);
        setTimeout(refresh, 180);
        return hasil;
      };
      bungkus.__promptHook = true;
      bungkus.__naHook = asli.__naHook;
      bungkus.__rzHook = asli.__rzHook;
      window.bukaLayar = bungkus;
      if (window.InsuranceHubNavigation) window.InsuranceHubNavigation.bukaLayar = bungkus;
    }
    document.addEventListener('input', () => setTimeout(refresh, 40), true);
    document.addEventListener('change', () => setTimeout(refresh, 40), true);
  }

  window.InsuranceHubPromptFlyer = { susunPrompt, tempelkan, refresh };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else setTimeout(mulai, 50);
})();
