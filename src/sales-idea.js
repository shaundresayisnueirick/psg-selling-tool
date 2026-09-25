/* PSG Selling Tools — Sales Idea
 * Interactive training module. Offline-first; no external assets required.
 * v1.4: Sales Idea 01–05 + Presentation Mode
 */
(function(){
  'use strict';

  const fingers = [
    {type:'produk', n:1, key:'S', title:'Sakit Kritis', short:'Sakit kritis', body:'Salah satu dari lima risiko utama yang menjadi dasar pembahasan konsep asuransi.', kristian:'Kalau kita bicara tentang produk asuransi, ujung-ujungnya bisa kita sederhanakan menjadi lima hal: sakit kritis, kecelakaan, cacat, meninggal, dan tua.', cristine:'Saya mengerti, Pak.'},
    {type:'produk', n:2, key:'K', title:'Kecelakaan', short:'Kecelakaan', body:'Risiko kedua dalam SKCMT.', kristian:'Yang kedua adalah kecelakaan. Kita tidak membahas nama produk terlebih dahulu, tetapi memahami risiko yang ingin kita siapkan dan lindungi.', cristine:'Baik, Pak.'},
    {type:'produk', n:3, key:'C', title:'Cacat', short:'Cacat', body:'Risiko ketiga dalam SKCMT.', kristian:'Yang ketiga adalah cacat. Jadi lima jari pertama kita pakai untuk mengingat lima ujung risiko: SKCMT.', cristine:'Sakit kritis, kecelakaan, cacat, meninggal, dan tua.'},
    {type:'produk', n:4, key:'M', title:'Meninggal', short:'Meninggal', body:'Risiko keempat dalam SKCMT.', kristian:'Yang keempat adalah meninggal. Ini juga bagian dari lima ujung kebutuhan perlindungan.', cristine:'Saya paham.'},
    {type:'produk', n:5, key:'T', title:'Tua', short:'Tua', body:'Risiko kelima dalam SKCMT.', kristian:'Yang kelima adalah tua. Jadi lima jari pertama: Sakit Kritis, Kecelakaan, Cacat, Meninggal, Tua — SKCMT.', cristine:'Oke, Pak. Jadi lima jari pertama menggambarkan produknya.'},
    {type:'pertanyaan', n:6, q:1, title:'Apakah kita kebal?', short:'Tidak kebal', body:'Membangun kesadaran bahwa tidak ada orang yang sepenuhnya kebal terhadap lima risiko tersebut.', kristian:'Bu Cristine, menurut Bu Cristine, adakah orang di dunia ini yang kebal terhadap sakit kritis, kecelakaan, cacat, meninggal, dan tua?', cristine:'Tidak ada.', insight:'Kita tidak kebal.'},
    {type:'pertanyaan', n:7, q:2, title:'Apakah kita bisa memilih?', short:'Tidak bisa memilih', body:'Membangun kesadaran bahwa kita tidak dapat memilih risiko yang akan terjadi.', kristian:'Kalau tidak ada yang kebal, apakah kita bisa memilih mau terkena yang mana? Misalnya, “Tuhan, jangan kena yang macam-macam, saya sakit gigi saja.”', cristine:'Tidak bisa pilih, Pak.', insight:'Kita tidak bisa memilih.'},
    {type:'pertanyaan', n:8, q:3, title:'Apakah kita tahu kapan?', short:'Tidak tahu kapan', body:'Membangun kesadaran bahwa waktu terjadinya risiko tidak dapat dipastikan.', kristian:'Apakah kita bisa tahu kapan itu terjadi? Misalnya, “Kalau saya masih muda jangan dulu. Nanti saja umur 70 atau 80 tahun.”', cristine:'Tidak bisa pilih, Pak. Sekarang banyak juga yang usia 30-an sudah kena musibah.', insight:'Kita tidak tahu kapan.'},
    {type:'pertanyaan', n:9, q:4, title:'Butuh uang kecil atau besar?', short:'Butuh uang besar', body:'Menghubungkan risiko dengan kebutuhan dana yang besar.', kristian:'Kalau terkena salah satu dari sakit kritis, kecelakaan, cacat, meninggal, atau tua, kira-kira butuh uang kecil atau uang besar?', cristine:'Uang besar, pastinya.', insight:'Risiko besar dapat membutuhkan dana besar.'},
    {type:'pertanyaan', n:10, q:5, title:'Kantong sendiri atau orang lain?', short:'Kantong orang lain', body:'Mengantar prospek pada pertanyaan tentang sumber dana ketika membutuhkan uang besar.', kristian:'Kalau ingin mendapatkan uang besar, maunya pakai kantong sendiri atau kantong orang lain?', cristine:'Kantong orang lain.', insight:'Di sinilah agen memperkenalkan konsep “kantong asuransi” sebagai mekanisme berbagi risiko.'}
  ];

  const reasons = [
    {n:1, title:'Bukti Nyata', icon:'👁️', body:'Bukti nyata sudah banyak di sekitar kita. Kita sering mendengar teman, keluarga, kenalan, atau tokoh publik mengalami sakit berat atau musibah dan membutuhkan bantuan.', kristian:'Hari ini bukti nyatanya sudah banyak sekali. Kita sering melihat orang terkena musibah dan membutuhkan bantuan. Artinya, risiko itu bukan sekadar teori.', cristine:'Iya, Pak. Saya juga sering melihat cerita seperti itu.'},
    {n:2, title:'No Choice', icon:'🛡️', body:'Ketika risiko besar terjadi, dana besar tetap harus tersedia. Menabung membutuhkan waktu, sementara musibah tidak menunggu dana terkumpul.', kristian:'Kalau kita menabung sendiri, uang besar membutuhkan waktu untuk terkumpul. Kalau musibah datang sebelum dana cukup, kita bisa terpaksa meminjam, meminta bantuan, atau menjual harta. Kalau dana sudah terkumpul pun, dana tersebut bisa terserap untuk biaya musibah. Jadi pertanyaannya: bagaimana menyiapkan dana besar sebelum risiko terjadi?', cristine:'Berarti kita memang perlu menyiapkan sumber dana sebelum kejadian itu datang.'},
    {n:3, title:'Cinta Keluarga', icon:'❤️', body:'Asuransi dapat diposisikan sebagai salah satu bentuk persiapan agar keluarga tetap memiliki dukungan finansial ketika kita sudah tidak ada.', kristian:'Bu Cristine, sayang tidak sama keluarga?', cristine:'Sayang sekali, Pak.', followup:'Terutama kepada anak. Kita tentu ingin membahagiakan anak. Pertanyaannya: kita ingin membahagiakan anak selama seumur hidup kita, atau seumur hidup anak kita?', answer:'Seumur hidup anak saya.', closing:'Kalau punya kesempatan menyayangi dan membahagiakan anak, kita bisa mempersiapkannya sejak sekarang.'}
  ];

  // Keranjang Kehidupan: 10 langkah visual berkesinambungan.
  const basketSteps = [
    {n:1, title:'Bayangkan kehidupan sebagai keranjang batu', body:'Bayangkan kehidupan ini seperti sebuah keranjang batu yang berisi begitu banyak batu.', scene:'basket', kristian:'Coba kita bayangkan kehidupan ini adalah sebuah keranjang batu yang berisi begitu banyak batu.', cristine:'Baik, Pak. Saya bayangkan.'},
    {n:2, title:'Ada batu kecil dan batu besar', body:'Batu-batu di dalam keranjang memiliki ukuran yang berbeda-beda.', scene:'sizes', kristian:'Ada batu yang kecil dan juga ada batu yang besar.', cristine:'Berarti tidak semua beban kehidupan ukurannya sama.'},
    {n:3, title:'Kita menopang keranjang', body:'Anda berdiri di bawah landasan dengan tangan lurus ke atas menopang keranjang tersebut. Di samping Anda ada pasangan dan anak-anak.', scene:'family', kristian:'Di bawah landasan tersebut, Anda menopangnya dengan tangan lurus ke atas. Di sebelah Anda ada pasangan dan anak-anak.', cristine:'Jadi saya yang sedang menopang beban itu.'},
    {n:4, title:'Tanah kehidupan tidak selalu rata', body:'Tanah melambangkan hidup yang penuh ketidakpastian: kadang naik, kadang turun, penuh risiko dan tantangan.', scene:'uncertain', kristian:'Keluarga berdiri di atas tanah yang tidak rata. Tanah ini melambangkan hidup yang penuh ketidakpastian, kadang naik dan kadang turun.', cristine:'Jadi kondisi hidup bisa berubah sewaktu-waktu.'},
    {n:5, title:'Batu-batu = biaya hidup', body:'Batu-batu melambangkan biaya makan, pakaian, transportasi, pendidikan, kesehatan, orang tua, cicilan, pensiun, tabungan, dan investasi.', scene:'costs', kristian:'Batu-batu ini melambangkan biaya hidup: makan, pakaian, transportasi, pendidikan, kesehatan, orang tua, cicilan hutang, pensiun, serta tabungan dan investasi.', cristine:'Ternyata banyak sekali yang harus ditopang.'},
    {n:6, title:'Bagaimana kalau kita lelah?', body:'Menopang keranjang terus-menerus tentu melelahkan. Bagaimana jika kita ingin melepaskan tangan dan beristirahat?', scene:'tired', kristian:'Coba bayangkan, apakah Anda pernah merasa lelah dengan tangan lurus ke atas menopang keranjang batu tersebut? Bagaimana jika Anda melepaskan tangan dan beristirahat sejenak?', cristine:'Kalau saya lepaskan, keranjangnya bisa goyah.'},
    {n:7, title:'Ketika penopang tidak mampu', body:'Jika suatu saat Anda tidak bisa menopang batu tersebut, pasangan dan anak-anak ikut menghadapi beban yang berat.', scene:'fall', kristian:'Kalau suatu saat Anda tidak bisa menopang batu tersebut, apa yang terjadi? Istri dan anak-anak akan menghadapi beban yang sangat berat.', cristine:'Berarti keluarga bisa ikut terkena dampaknya.'},
    {n:8, title:'Bagaimana menjaganya tetap di tempat?', body:'Pertanyaannya: bagaimana memastikan keranjang tetap berada pada tempatnya ketika sesuatu terjadi pada kita?', scene:'question', kristian:'Jadi bagaimana kita bisa menjamin bahwa apa pun yang terjadi pada kita, keranjang batu tersebut tetap berada pada tempatnya?', cristine:'Berarti kita perlu penopang tambahan.'},
    {n:9, title:'Bangun dua pilar', body:'Konsep ini memperkenalkan dua pilar di kedua sisi keranjang sebagai penopang tambahan.', scene:'pillars', kristian:'Hanya ada satu cara dalam ilustrasi ini: membangun dua pilar di kedua sisi.', cristine:'Dua pilar itu yang membantu menopang keranjangnya?'},
    {n:10, title:'Proteksi dan uang', body:'Dua pilar melambangkan proteksi dan uang — dua fondasi yang membantu menjaga keranjang kehidupan tetap tertopang.', scene:'complete', kristian:'Jika kita memiliki dua pilar tersebut, keranjang batu itu tetap berada di sana. Pilar ini melambangkan proteksi dan uang.', cristine:'Saya mengerti. Jadi kita perlu menyiapkan kedua pilar itu.'}
  ];


  const educationSteps = [
    {n:1,title:'Mulai dari tujuan pendidikan',focus:'TARGET PENDIDIKAN ANAK',body:'Anak hari ini masih kecil, tetapi target pendidikan ada di masa depan. Mulailah dengan menentukan tujuan dan waktunya.',scene:'goal'},
    {n:2,title:'Biaya hari ini ≠ biaya nanti',focus:'PRESENT VALUE vs FUTURE VALUE',body:'Biaya kuliah saat ini tidak sama dengan biaya kuliah saat anak nanti kuliah karena ada inflasi.',scene:'pvfv'},
    {n:3,title:'Inflasi membuat target berubah',focus:'Rp300 JUTA HARI INI → ≈ Rp1 MILIAR NANTI',body:'Contoh ilustrasi: Rp300 juta dengan asumsi inflasi 7% selama 18 tahun menjadi sekitar Rp1,0 miliar.',scene:'inflation'},
    {n:4,title:'Mulai lebih awal terasa lebih ringan',focus:'START EARLY',body:'Semakin panjang waktu yang tersedia, semakin ringan beban yang perlu disiapkan setiap bulan.',scene:'bike1'},
    {n:5,title:'Tunda 5 tahun, jalurnya makin berat',focus:'MENUNDA = JALAN LEBIH TERJAL',body:'Jika mulai saat anak berusia 5 tahun, waktu menuju usia 18 tahun tinggal 13 tahun.',scene:'bike2'},
    {n:6,title:'Semakin dekat, semakin berat',focus:'WAKTU MENYEMPIT, SETORAN MEMBESAR',body:'Contoh ilustrasi dari materi: mulai usia 0 ≈ Rp2,6 juta/bulan; usia 5 ≈ Rp4,3 juta; usia 10 ≈ Rp8,2 juta.',scene:'bike3'},
    {n:7,title:'Pertanyaan berikutnya: apa jaminannya?',focus:'APAKAH KITA BISA TERUS MENABUNG?',body:'Menabung saja mengandalkan kemampuan kita untuk terus menyetor. Bagaimana jika risiko terjadi di tengah perjalanan?',scene:'stairs'},
    {n:8,title:'Kalau penopang berhenti di tengah jalan',focus:'RISIKO BISA MEMUTUS PERJALANAN',body:'Tanpa proteksi, perjalanan menuju target pendidikan bisa berhenti ketika kemampuan menabung berhenti.',scene:'stairsRisk'},
    {n:9,title:'Jalan alternatif: lift',focus:'TUJUAN TETAP BISA DICAPAI',body:'Analogi lift: kita menetapkan lantai tujuan sejak awal. Walaupun terjadi sesuatu pada kita di perjalanan, mekanisme proteksi dirancang agar tujuan tetap memiliki jalur menuju target.',scene:'elevator'},
    {n:10,title:'Mulai sedini mungkin + proteksi',focus:'EDUCATION PLANNING = GOAL + WAKTU + PROTEKSI',body:'Mulai sedini mungkin, hitung kebutuhan dengan realistis, dan pastikan rencana pendidikan memiliki proteksi.',scene:'complete'}
  ];


  const retirementSteps = [
    {n:1,title:'3 risiko utama',focus:'MENINGGAL TERLALU CEPAT • HIDUP TERLALU LAMA • DISABILITAS',body:'Perencanaan keuangan perlu melihat tiga risiko besar. Untuk Sales Idea ini, fokus kita adalah risiko hidup terlalu lama.',scene:'risks'},
    {n:2,title:'Masa pensiun bisa panjang',focus:'25 → 55 → 85',body:'Ilustrasi sederhana: sekitar 30 tahun bekerja perlu membantu membiayai sekitar 30 tahun masa pensiun.',scene:'timeline'},
    {n:3,title:'Mulai dari yang realistis',focus:'EARN 100% → SAVE 50% • SPEND 50%',body:'Materi menggunakan ilustrasi menyisihkan 50% penghasilan. Jika belum mampu, jangan menunggu sempurna — mulai dari angka yang realistis.',scene:'ratio'},
    {n:4,title:'Gaya hidup hari ini, target pensiun nanti',focus:'Rp10 JT / BLN HARI INI → TARGET PENSIUN PERLU DIHITUNG',body:'Kalau hari ini gaya hidup kita Rp10 juta per bulan, kebutuhan saat pensiun tidak otomatis sama. Target perlu dihitung berdasarkan waktu, inflasi, dan asumsi hasil.',scene:'target'},
    {n:5,title:'Waktu adalah aset',focus:'Rp1 JT / BLN • 30 TAHUN • 6% / TAHUN',body:'Efek bunga berbunga bekerja dengan waktu. Memulai lebih awal memberi lebih banyak waktu bagi hasil investasi untuk berkembang.',scene:'compound'},
    {n:6,title:'Mulai sekarang, lindungi rencana',focus:'START EARLY + COMPOUNDING + PROTECTION',body:'Mulai membangun dana pensiun sedini mungkin. Lalu siapkan proteksi agar rencana tidak berhenti ketika kemampuan menghasilkan penghasilan terganggu.',scene:'complete'}
  ];

  const assetCreationSteps = [
    {n:1,title:'3 fungsi asuransi',focus:'INCOME PROTECTION • ASSET PROTECTION • ASSET CREATION',body:'Asuransi dapat dibahas melalui tiga fungsi: melindungi penghasilan, melindungi aset, dan membantu menciptakan aset baru.',scene:'functions'},
    {n:2,title:'Membangun aset untuk warisan',focus:'TARGET ASET: Rp5 MILIAR',body:'Contoh materi: seseorang ingin memiliki properti senilai Rp5 miliar sebagai aset baru dan rencana warisan untuk anak.',scene:'property'},
    {n:3,title:'Pilihan 1 — dengan DP',focus:'DP 30% = Rp1,5 M • CICILAN ≈ Rp27 JT/BLN',body:'Contoh dalam materi: DP 30% atau Rp1,5 miliar, sisa Rp3,5 miliar, ilustrasi bunga 7% selama 20 tahun, cicilan sekitar Rp27 juta per bulan.',scene:'option1'},
    {n:4,title:'Pilihan 2 — tanpa DP',focus:'DP 0 • CICILAN ≈ Rp39,5 JT/BLN',body:'Contoh dalam materi: tanpa DP, kebutuhan pembiayaan Rp5 miliar, dengan ilustrasi bunga 7% selama 20 tahun, cicilan sekitar Rp39,5 juta per bulan.',scene:'option2'},
    {n:5,title:'Pilihan 3 — konsep asset creation',focus:'CONTOH MATERI: ≈ Rp6 JT/BLN → TARGET Rp5 M',body:'Materi memperkenalkan pendekatan berbeda untuk menciptakan aset baru dengan beban bulanan yang lebih ringan. Angka Rp6 juta adalah contoh dari materi dan bukan simulasi KPR dengan asumsi yang sama.',scene:'option3'},
    {n:6,title:'Aset baru untuk anak',focus:'ASET Rp5 MILIAR → WARISAN',body:'Inti percakapan: bagaimana seseorang yang sudah mapan dapat membangun aset baru yang nantinya dapat dipersiapkan sebagai warisan untuk anak.',scene:'inheritance'}
  ];

  let current = 0;
  let mode = 'jari';
  const $ = id => document.getElementById(id);
  // Pemutar interaktif (src/sales-idea-player.js) dan penanda listener
  // dokumen: keduanya dibuat sekali saja walau init() dipanggil berulang.
  let pemutar = null;
  let dokumenTerpasang = false;

  function handHtml(side, activeIndex){
    const isLeft = side === 'left';
    const items = isLeft ? [['1','Sakit Kritis','S'],['2','Kecelakaan','K'],['3','Cacat','C'],['4','Meninggal','M'],['5','Tua','T']] : [['6','Kebal?','1'],['7','Bisa memilih?','2'],['8','Tahu kapan?','3'],['9','Butuh uang besar?','4'],['10','Kantong sendiri / orang lain?','5']];
    const mirror = !isLeft;
    const fingerPaths = ['M92 128 C72 122 52 111 38 99 C31 93 31 84 36 78 C41 72 49 72 57 77 L101 104 Z','M102 101 C94 79 91 54 92 29 C92 19 98 13 106 13 C114 13 119 19 119 29 L121 101 Z','M124 101 L123 20 C123 9 129 3 138 3 C147 3 152 10 152 20 L151 101 Z','M151 104 L154 31 C154 20 160 14 169 15 C177 16 181 22 180 32 L176 111 Z','M176 113 L182 56 C183 47 189 42 197 44 C205 46 208 52 206 61 L198 132 Z'];
    const svg = `<svg class="si-real-hand ${mirror?'mirror':''}" viewBox="0 0 240 250" role="img" aria-label="Ilustrasi telapak tangan dengan lima jari"><defs><linearGradient id="skin-${side}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9d9c4"/><stop offset=".45" stop-color="#edb497"/><stop offset="1" stop-color="#d98d6f"/></linearGradient><linearGradient id="skin-hi-${side}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff0e5" stop-opacity=".9"/><stop offset=".5" stop-color="#f4c5a8" stop-opacity=".2"/><stop offset="1" stop-color="#b96f55" stop-opacity=".2"/></linearGradient><filter id="shadow-${side}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#7b3f2b" flood-opacity=".20"/></filter></defs><g filter="url(#shadow-${side})"><path class="si-real-palm" d="M79 104 C72 114 67 132 68 153 C69 177 78 204 96 220 C111 234 140 237 163 225 C181 216 191 197 193 176 C195 155 190 137 181 119 C171 100 155 92 135 91 C111 90 92 94 79 104 Z" fill="url(#skin-${side})"/>${fingerPaths.map((d,i)=>`<path class="si-real-finger f${i+1} ${activeIndex===i?'active':''}" d="${d}" fill="url(#skin-${side})"/>`).join('')}<path class="si-real-highlight" d="M90 111 C83 139 86 177 101 199 C114 218 143 225 163 214" fill="none" stroke="url(#skin-hi-${side})" stroke-width="13" stroke-linecap="round" opacity=".72"/><g class="si-real-lines" fill="none" stroke="#9f624d" stroke-linecap="round"><path d="M89 147 C105 136 123 135 139 145 C153 154 169 154 181 146" stroke-width="2.3" opacity=".55"/><path d="M91 161 C108 151 126 151 141 160 C155 168 169 167 181 158" stroke-width="1.8" opacity=".45"/><path d="M102 183 C118 173 139 175 154 185" stroke-width="1.7" opacity=".42"/><path d="M109 197 C122 192 139 194 148 201" stroke-width="1.5" opacity=".38"/><path d="M83 126 C91 120 98 117 106 116" stroke-width="1.5" opacity=".38"/><path d="M51 91 C60 91 69 95 78 103" stroke-width="2" opacity=".45"/></g><g class="si-real-knuckles" fill="#b9785d" opacity=".32"><ellipse cx="106" cy="103" rx="7" ry="3"/><ellipse cx="138" cy="102" rx="7" ry="3"/><ellipse cx="166" cy="106" rx="7" ry="3"/><ellipse cx="191" cy="116" rx="6" ry="3"/></g></g></svg>`;
    return `<div class="si-hand-wrap ${side}"><div class="si-hand-label">${isLeft?'5 JARI PRODUK':'5 JARI PERTANYAAN'}</div><div class="si-hand-body"><div class="si-real-hand-stage">${svg}</div><div class="si-hand-legend">${items.map((item,i)=>`<div class="si-legend-item ${activeIndex===i?'active':''}"><span class="si-legend-no">${item[0]}</span><div><b>${item[1]}</b><small>${isLeft?item[2]:'Pertanyaan '+item[2]}</small></div></div>`).join('')}</div></div></div>`;
  }

  function closeSalesIdea(){if(pemutar)pemutar.berhenti();document.body.classList.remove('si-modal-open');if(window.bukaLayar)window.bukaLayar('PRODUK');}
  function openSalesIdea(modeName){mode=modeName;current=0;document.body.classList.add('si-modal-open');render();}
  function salesIdeaHeader(title,subtitle){return `<div class="si-presentation-topbar"><button type="button" class="si-back-hub" data-si-hub>← Sales Idea</button><div class="si-presentation-brand"><span>PSG</span><b>${title}</b><small>${subtitle}</small></div><button type="button" class="si-close" data-si-close aria-label="Tutup Sales Idea">✕</button></div>`;}
  function renderHub(root){root.innerHTML=`<div class="si-hub"><div class="si-hub-head"><div><span class="si-eyebrow">PSG • PRESENTATION TOOLS</span><h2>Sales Idea</h2><p>Pilih satu Sales Idea. Materinya akan dibuka sebagai layar presentasi penuh agar visual dapat ditunjukkan langsung kepada prospek.</p></div><button type="button" class="si-close si-close-hub" data-si-close>✕ Tutup</button></div><div class="si-choice-grid"><button type="button" class="si-choice-card" data-si-choice="jari"><div class="si-choice-visual fingers-choice">🖐️</div><div><span>SALES IDEA 01</span><h3>10 Jari</h3><p>5 ujung risiko + 5 pertanyaan untuk membangun kesadaran.</p></div><strong>Mulai presentasi →</strong></button><button type="button" class="si-choice-card" data-si-choice="basket"><div class="si-choice-visual basket-choice">🧺</div><div><span>SALES IDEA 02</span><h3>Keranjang Kehidupan</h3><p>Visual beban kehidupan, keluarga, proteksi, dan uang.</p></div><strong>Mulai presentasi →</strong></button><button type="button" class="si-choice-card" data-si-choice="education"><div class="si-choice-visual education-choice">🎓</div><div><span>SALES IDEA 03</span><h3>Education Planning</h3><p>Tujuan pendidikan, inflasi, mulai lebih awal, dan proteksi.</p></div><strong>Mulai presentasi →</strong></button><button type="button" class="si-choice-card" data-si-choice="retirement"><div class="si-choice-visual retirement-choice">⌛</div><div><span>SALES IDEA 04</span><h3>Retirement Planning</h3><p>Risiko hidup terlalu lama, kebutuhan aset, compounding, dan proteksi.</p></div><strong>Mulai presentasi →</strong></button><button type="button" class="si-choice-card" data-si-choice="asset"><div class="si-choice-visual asset-choice">🏠</div><div><span>SALES IDEA 05</span><h3>Asset Creation</h3><p>Mengubah rencana aset menjadi pembahasan warisan untuk anak.</p></div><strong>Mulai presentasi →</strong></button></div><div class="si-hub-note">Layar presentasi menampilkan visual dan highlight inti. Tidak ada script dialog agen–prospek.</div></div>`;}
  function renderIsi(root){if(mode==='jari')renderFinger(root);else if(mode==='alasan')renderReasons(root);else if(mode==='basket')renderBasket(root);else if(mode==='education')renderEducation(root);else if(mode==='retirement')renderRetirement(root);else if(mode==='asset')renderAssetCreation(root);}
  function render(){
    const root=$('salesIdeaContent');if(!root)return;document.body.classList.add('si-modal-open');
    const p=siapkanPemutar();
    if(mode==='hub'){if(p)p.muat([]);renderHub(root);updateNav();return;}
    if(p){updateNav();p.muat(adeganMode(),mode==='alasan'?current-10:current);return;}
    renderIsi(root);updateNav();
  }

  /* Setiap langkah yang sudah ada menjadi satu scene pemutar. Isi dan
     urutannya tetap dari renderer di atas; pemutar hanya menambah gerak
     masuk yang ringan dan mengendalikan animasi CSS yang sudah ada. */
  const SCENE_VISUAL='.si-hands,.kb-visual-card,.ep-visual-card,.rp-visual-card,.ac-visual-card,.si-reason-progress';
  const SCENE_TEKS='.si-presentation-card,.kb-presentation-card,.ep-presentation-card,.rp-presentation-card,.ac-presentation-card';
  function jumlahLangkah(m){return (m==='basket'||m==='education')?10:((m==='retirement'||m==='asset')?6:(m==='alasan'?3:13));}
  function animasiMasuk(tl,stage){
    tl.add(stage.querySelector(SCENE_VISUAL),[{opacity:0,transform:'translateY(16px) scale(.985)'},{opacity:1,transform:'none'}],{duration:700});
    tl.add(stage.querySelector(SCENE_TEKS),[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:560,delay:260});
  }
  function adeganMode(){
    const m=mode,daftar=[];
    // Retirement Planning: pilot cerita interaktif (src/sales-idea-retirement.js), data tetap retirementSteps.
    if(m==='retirement'&&window.PSGRetirementStory)return window.PSGRetirementStory.adegan({langkah:retirementSteps,header:salesIdeaHeader('Retirement Planning','Visual sederhana untuk membuka percakapan pensiun'),padaLangkah:i=>{current=i;}});
    // Keranjang Kehidupan: cerita interaktif (src/sales-idea-keranjang.js), data tetap basketSteps.
    if(m==='basket'&&window.PSGKeranjangStory)return window.PSGKeranjangStory.adegan({langkah:basketSteps,header:salesIdeaHeader('Keranjang Kehidupan','Visual storytelling tentang beban kehidupan'),padaLangkah:i=>{current=i;}});
    for(let i=0;i<jumlahLangkah(m);i++){
      daftar.push({id:m+'-'+(i+1),siapDi:'akhir',animate:animasiMasuk,render:root=>{current=m==='alasan'?10+i:i;renderIsi(root);}});
    }
    return daftar;
  }
  function siapkanPemutar(){
    if(pemutar)return pemutar;
    const P=window.PSGStoryPlayer,sec=$('layarSalesIdea'),stage=$('salesIdeaContent');
    if(!P||!sec||!stage)return null;
    pemutar=P.buat({root:sec,stage:stage,
      ui:{prev:$('siPrev'),next:$('siNext'),play:$('siPlay'),replay:$('siReplay'),count:$('siStepCount'),progress:$('siProgress')},
      aktif:()=>sec.classList.contains('aktif'),onTutup:closeSalesIdea});
    return pemutar;
  }

  function renderFinger(root){
    const s=current<10?fingers[current]:null;
    if(!s){ renderReasons(root); return; }
    const leftActive=current<5?current:-1, rightActive=current<5?-1:current-5;
    const focus = s.type==='produk'
      ? (current===0?'UJUNG RISIKO: SAKIT KRITIS':current===1?'UJUNG RISIKO: KECELAKAAN':current===2?'UJUNG RISIKO: CACAT':current===3?'UJUNG RISIKO: MENINGGAL':'UJUNG RISIKO: TUA')
      : (current===5?'KITA TIDAK KEBAL':current===6?'KITA TIDAK BISA MEMILIH':current===7?'KITA TIDAK TAHU KAPAN':current===8?'RISIKO DAPAT MEMBUTUHKAN DANA BESAR':'SUMBER DANA: KANTONG SENDIRI ATAU ORANG LAIN?');
    const supporting = s.type==='produk'
      ? 'Lima ujung kebutuhan perlindungan: Sakit Kritis, Kecelakaan, Cacat, Meninggal, dan Tua (SKCMT).'
      : s.insight;
    root.innerHTML=`${salesIdeaHeader('10 Jari','Visual 5 produk + 5 pertanyaan + 3 alasan')}<div class="si-topline"><div><span class="si-eyebrow">SALES IDEA 01</span><h2>10 JARI</h2><p>Gunakan visual ini sebagai alat bantu presentasi. Agen bebas mengembangkan percakapan sesuai respons prospek.</p></div><div class="si-counter"><b>${current+1}</b><span>/ 10 JARI</span></div></div><div class="si-progress"><span style="width:${(current+1)*10}%"></span></div><div class="si-hands">${handHtml('left',leftActive)}${handHtml('right',rightActive)}</div><div class="si-presentation-card ${s.type}"><div class="si-presentation-kicker">${s.type==='produk'?'JARI PRODUK':'JARI PERTANYAAN '+s.q}</div><div class="si-presentation-focus">${focus}</div><div class="si-presentation-text">${s.body}</div>${supporting?`<div class="si-presentation-highlight"><span>●</span><div><b>Inti yang disampaikan</b><p>${supporting}</p></div></div>`:''}</div>${current===9?`<div class="si-transition"><b>10 Jari selesai.</b><span>Lanjutkan ke 3 alasan untuk menambahkan unsur emosional.</span></div>`:''}`;
  }

  function renderReasons(root){
    const r=reasons[current-10], idx=current-10;
    const focus = r.n===1?'RISIKO ITU NYATA':r.n===2?'RISIKO BESAR MEMBUTUHKAN SUMBER DANA BESAR':'MELINDUNGI KELUARGA ADALAH BENTUK CINTA';
    root.innerHTML=`${salesIdeaHeader('3 Alasan Memiliki Asuransi','Lanjutan dari Sales Idea 10 Jari')}<div class="si-topline"><div><span class="si-eyebrow">SALES IDEA 01 • LANJUTAN</span><h2>3 ALASAN MEMILIKI ASURANSI</h2><p>Gunakan sebagai visual penguat setelah konsep 10 Jari. Tidak ada script wajib; agen membangun percakapan secara dinamis.</p></div><div class="si-reason-icon">${r.icon}</div></div><div class="si-reason-progress">${reasons.map((x,i)=>`<span class="${i===idx?'active':''} ${i<idx?'done':''}">${i+1}</span>`).join('')}</div><div class="si-presentation-card reason"><div class="si-presentation-kicker">ALASAN ${r.n}</div><div class="si-presentation-focus">${focus}</div><div class="si-presentation-text">${r.body}</div><div class="si-reason-points"><div><span>01</span><b>${r.n===1?'Bukti di sekitar kita':'Persiapkan sebelum risiko terjadi'}</b></div><div><span>02</span><b>${r.n===1?'Musibah bukan sekadar teori':r.n===2?'Menabung membutuhkan waktu':'Keluarga tetap membutuhkan dukungan'}</b></div><div><span>03</span><b>${r.n===1?'Kejadian nyata membangun kesadaran':r.n===2?'Risiko tidak menunggu dana terkumpul':'Persiapan dilakukan saat kita masih mampu'}</b></div></div></div>${r.closing?`<div class="si-presentation-highlight reason-highlight"><span>♥</span><div><b>Pesan kunci</b><p>${r.closing}</p></div></div>`:''}`;
  }


  function educationScene(step){
    const n=step.n;
    const timeline=n<=3?`<g class="ep-timeline"><line x1="72" y1="235" x2="365" y2="235"/><circle cx="72" cy="235" r="8"/><circle cx="365" cy="235" r="8"/><text x="72" y="260">USIA 0</text><text x="365" y="260">USIA 18</text><g class="ep-child"><circle cx="72" cy="215" r="13"/><path d="M72 228 L72 252 M72 235 L58 247 M72 235 L86 247 M72 252 L62 267 M72 252 L82 267"/></g><g class="ep-cap"><path d="M349 202 L381 216 L349 230 L317 216 Z"/><path d="M329 225 V239 Q349 250 369 239 V225"/><line x1="381" y1="216" x2="381" y2="238"/></g></g>`:'';
    const inflation=n===3?`<g class="ep-inflation"><rect x="92" y="292" width="256" height="48" rx="14"/><text x="220" y="312">INFLASI 7% × 18 TAHUN</text><text x="220" y="331">Rp300 JT → ≈ Rp1,0 M</text></g>`:'';
    const bike=n>=4&&n<=6?`<g class="ep-bike-scene"><path class="ep-slope ${n===4?'easy':n===5?'medium':'steep'}" d="${n===4?'M72 335 Q180 318 355 250':n===5?'M72 350 Q180 315 355 225':'M72 370 Q170 320 355 165'}"/><g class="ep-bike"><circle cx="170" cy="300" r="18"/><circle cx="214" cy="300" r="18"/><path d="M170 300 L187 274 L214 300 L197 300 L187 274 L214 270 L226 300"/><circle cx="187" cy="259" r="9"/><path d="M187 268 L187 286 L201 292"/></g><g class="ep-goal"><circle cx="355" cy="${n===4?250:n===5?225:165}" r="18"/><text x="355" y="${n===4?256:n===5?231:171}">18</text></g></g>`:'';
    const monthly=n===6?`<g class="ep-monthly"><rect x="55" y="248" width="330" height="104" rx="16"/><text x="220" y="272">CONTOH ILUSTRASI SETORAN / BULAN</text><text x="95" y="302">Usia 0</text><text x="165" y="302">Rp2,6 JT</text><text x="95" y="326">Usia 5</text><text x="165" y="326">Rp4,3 JT</text><text x="255" y="326">Usia 10</text><text x="330" y="326">Rp8,2 JT</text></g>`:'';
    const stairs=n>=7&&n<=8?`<g class="ep-stairs"><path class="ep-stair-path" d="M70 370 H105 V340 H140 V310 H175 V280 H210 V250 H245 V220 H280 V190 H315 V160 H350 V130"/><text x="370" y="136">18</text><g class="ep-parent"><circle cx="105" cy="322" r="10"/><path d="M105 332 L105 358 M105 339 L92 349 M105 339 L118 349 M105 358 L96 374 M105 358 L114 374"/></g><g class="ep-child"><circle cx="132" cy="322" r="8"/><path d="M132 330 L132 352 M132 336 L122 345 M132 336 L142 345 M132 352 L125 364 M132 352 L139 364"/></g>${n===8?'<g class="ep-risk-mark"><circle cx="210" cy="246" r="23"/><path d="M198 234 L222 258 M222 234 L198 258"/></g>':''}</g>`:'';
    const elevator=n===9?`<g class="ep-elevator"><rect x="75" y="108" width="105" height="270" rx="12"/><rect x="96" y="145" width="63" height="78" rx="5"/><line x1="127" y1="145" x2="127" y2="223"/><path d="M127 200 V168 M116 180 L127 168 L138 180"/><text x="127" y="250">LIFT</text><path class="ep-lift-line" d="M127 235 V126"/><g class="ep-target"><circle cx="330" cy="145" r="30"/><text x="330" y="153">18</text></g><path class="ep-target-arrow" d="M180 190 C225 158 270 145 298 145"/><g class="ep-family-mini"><circle cx="116" cy="335" r="10"/><circle cx="143" cy="335" r="10"/><path d="M116 345 V366 M143 345 V366 M116 351 L106 360 M116 351 L126 360 M143 351 L133 360 M143 351 L153 360"/></g></g>`:'';
    const complete=n===10?`<g class="ep-complete"><rect x="68" y="280" width="304" height="82" rx="18"/><text x="220" y="307">START EARLY</text><text x="220" y="333">+ PROTEKSI = TUJUAN PENDIDIKAN</text></g>`:'';
    return `<div class="ep-scene ep-scene-${n}"><svg viewBox="0 0 440 440" role="img" aria-label="Education Planning langkah ${n}"><defs><linearGradient id="epSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef8ff"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="440" height="440" rx="24" fill="url(#epSky)"/><circle cx="378" cy="62" r="22" fill="#ffd84a"/><path d="M0 390 Q120 345 220 380 Q330 340 440 385 V440 H0 Z" fill="#cfe8c4"/>${timeline}${inflation}${bike}${monthly}${stairs}${elevator}${complete}</svg></div>`;
  }
  function renderEducation(root){
    const s=educationSteps[current];
    const tags=current===5?`<div class="ep-chip-row"><span>Usia 0 • Rp2,6 jt/bln</span><span>Usia 5 • Rp4,3 jt/bln</span><span>Usia 10 • Rp8,2 jt/bln</span></div>`:'';
    root.innerHTML=`${salesIdeaHeader('Education Planning','Visual storytelling tentang tujuan pendidikan anak')}<div class="si-topline"><div><span class="si-eyebrow">SALES IDEA 03</span><h2>EDUCATION PLANNING</h2><p>Visual menjadi pemantik. Agen menyampaikan pertanyaan dan penjelasan dengan gaya sendiri.</p></div><div class="si-counter"><b>${current+1}</b><span>/ 10 LANGKAH</span></div></div><div class="si-progress"><span style="width:${(current+1)*10}%"></span></div><div class="ep-layout"><div class="ep-visual-card">${educationScene(s)}<div class="ep-caption"><span>LANGKAH ${s.n}</span><b>${s.title}</b></div></div><div class="ep-presentation-card"><div class="si-presentation-kicker">FOKUS PRESENTASI • ${s.n}/10</div><div class="si-presentation-focus">${s.focus}</div><div class="si-presentation-text">${s.body}</div>${tags}<div class="ep-cue">💡 <span>Tampilkan visual, beri jeda, lalu kembangkan percakapan berdasarkan respons prospek.</span></div></div></div>`;
  }


  function retirementScene(step){
    const n=step.n;
    const txt=(x,y,t,cls='rptxt')=>`<text class="${cls}" x="${x}" y="${y}">${t}</text>`;
    const person=(x,y,scale=1)=>`<g class="rp-person" transform="translate(${x} ${y}) scale(${scale})"><circle cx="0" cy="-30" r="13"/><path d="M0 -16 V28 M0 -2 L-19 13 M0 -2 L19 13 M0 28 L-14 51 M0 28 L14 51"/><path d="M-10 -39 Q0 -50 10 -39" fill="none"/></g>`;
    let scene='';
    if(n===1){
      scene=`<g class="rp-simple-risks"><circle cx="110" cy="190" r="58" fill="#fff5f5" stroke="#c62828" stroke-width="4"/><circle cx="220" cy="115" r="58" fill="#fff9eb" stroke="#d6a23d" stroke-width="4"/><circle cx="330" cy="190" r="58" fill="#eef7ee" stroke="#42a85f" stroke-width="4"/>${txt(110,184,'TERLALU','rptxt label')}${txt(110,204,'CEPAT','rptxt label')}${txt(220,109,'TERLALU','rptxt label')}${txt(220,129,'LAMA','rptxt label')}${txt(330,184,'DISABILITAS','rptxt label')}${txt(220,320,'3 RISIKO','rptxt big')}${txt(220,350,'Fokus: hidup terlalu lama','rptxt sub')}</g>`;
    } else if(n===2){
      scene=`<g class="rp-simple-timeline"><line x1="55" y1="235" x2="385" y2="235" stroke="#d6dbe1" stroke-width="12" stroke-linecap="round"/><line x1="55" y1="235" x2="220" y2="235" stroke="#c62828" stroke-width="12" stroke-linecap="round"/><line x1="220" y1="235" x2="385" y2="235" stroke="#d6a23d" stroke-width="12" stroke-linecap="round"/><circle cx="55" cy="235" r="10" fill="#c62828"/><circle cx="220" cy="235" r="10" fill="#c62828"/><circle cx="385" cy="235" r="10" fill="#d6a23d"/>${txt(55,190,'25','rptxt big')}${txt(220,190,'55','rptxt big')}${txt(385,190,'85','rptxt big')}${txt(137,285,'30 TAHUN BEKERJA','rptxt label')}${txt(302,285,'30 TAHUN PENSIUN','rptxt label')}${txt(220,345,'Penghasilan saat bekerja perlu menopang dua fase.','rptxt sub')}</g>`;
    } else if(n===3){
      scene=`<g class="rp-simple-ratio"><rect x="55" y="145" width="330" height="70" rx="18" fill="#f0f2f5"/><rect x="55" y="145" width="165" height="70" rx="18" fill="#c62828"/><rect x="220" y="145" width="165" height="70" rx="18" fill="#d6a23d"/>${txt(137,188,'SAVE 50%','rptxt white')}${txt(302,188,'SPEND 50%','rptxt dark')}${txt(220,110,'EARN 100%','rptxt big')}${txt(220,275,'Belum bisa 50%?','rptxt title')}${txt(220,305,'Mulai dari yang realistis.','rptxt sub')}</g>`;
    } else if(n===4){
      scene=`<g class="rp-simple-target"><rect x="55" y="92" width="330" height="250" rx="26" fill="#fff" stroke="#e4e7ec" stroke-width="3"/><circle cx="150" cy="170" r="58" fill="#fff5f5" stroke="#c62828" stroke-width="4"/>${txt(150,158,'HARI INI','rptxt label')}${txt(150,187,'Rp10 JT','rptxt big')}${txt(150,210,'/ BULAN','rptxt small')}<path d="M220 170 H315" stroke="#c62828" stroke-width="6" stroke-linecap="round"/><path d="M302 155 L320 170 L302 185" fill="none" stroke="#c62828" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="300" cy="250" r="58" fill="#fff9eb" stroke="#d6a23d" stroke-width="4"/>${txt(300,238,'PENSIUN','rptxt label')}${txt(300,270,'?','rptxt money')}${txt(220,325,'TARGET DANA PERLU DIHITUNG','rptxt title')}</g>`;
    } else if(n===5){
      scene=`<g class="rp-simple-compound"><line x1="65" y1="320" x2="385" y2="320" stroke="#cfd5dc" stroke-width="4"/><path d="M65 310 C145 300 190 275 230 235 C280 185 320 140 385 95" fill="none" stroke="#c62828" stroke-width="8" stroke-linecap="round"/><path d="M65 310 L385 310" stroke="#d6a23d" stroke-width="5" stroke-dasharray="9 8"/>${txt(220,75,'Rp1 JT / BLN • 30 TAHUN • 6%','rptxt title')}${txt(220,125,'WAKTU + HASIL = COMPOUNDING','rptxt big')}${txt(65,350,'MULAI','rptxt small')}${txt(385,350,'30 TAHUN','rptxt small')}</g>`;
    } else {
      scene=`<g class="rp-simple-complete"><circle cx="110" cy="190" r="58" fill="#fff5f5" stroke="#c62828" stroke-width="5"/><circle cx="220" cy="190" r="58" fill="#fff9eb" stroke="#d6a23d" stroke-width="5"/><circle cx="330" cy="190" r="58" fill="#eef7ee" stroke="#42a85f" stroke-width="5"/>${txt(110,185,'START','rptxt label')}${txt(110,207,'EARLY','rptxt label')}${txt(220,185,'COMPOUND','rptxt label')}${txt(220,207,'ING','rptxt label')}${txt(330,185,'PROTEKSI','rptxt label')}${txt(330,207,'RISIKO','rptxt label')}${txt(220,315,'RETIREMENT PLANNING','rptxt big')}${txt(220,350,'Bangun dana • manfaatkan waktu • lindungi rencana','rptxt sub')}</g>`;
    }
    return `<div class="rp-scene rp-scene-${n}"><svg viewBox="0 0 440 440" role="img" aria-label="Retirement Planning langkah ${n}"><defs><linearGradient id="rpBgSimple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fbff"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="440" height="440" rx="24" fill="url(#rpBgSimple)"/>${scene}</svg></div>`;
  }

  function renderRetirement(root){
    const s=retirementSteps[current];
    root.innerHTML=`${salesIdeaHeader('Retirement Planning','Visual sederhana untuk membuka percakapan pensiun')}<div class="si-topline"><div><span class="si-eyebrow">SALES IDEA 04</span><h2>RETIREMENT PLANNING</h2><p>Satu visual, satu pesan utama. Agen bebas mengembangkan percakapan.</p></div><div class="si-counter"><b>${current+1}</b><span>/ 6 LANGKAH</span></div></div><div class="si-progress"><span style="width:${(current+1)*100/6}%"></span></div><div class="rp-layout rp-simple-layout"><div class="rp-visual-card">${retirementScene(s)}<div class="rp-caption"><span>LANGKAH ${s.n}</span><b>${s.title}</b></div></div><div class="rp-presentation-card"><div class="si-presentation-kicker">INTI PESAN • ${s.n}/6</div><div class="si-presentation-focus">${s.focus}</div><div class="si-presentation-text">${s.body}</div><div class="rp-cue">💡 Tampilkan visual ini, lalu kembangkan pertanyaan sesuai kondisi prospek.</div></div></div>`;
  }

  function basketScene(step){
    const n=step.n;
    const showStones=n>=2;
    const showFamily=n>=3;
    const showUneven=n>=4;
    const showCosts=n>=5;
    const showTired=n===6;
    const showX=n===7;
    const showFall=n===8;
    const showPillars=n>=9;
    const complete=n===10;

    const stone=(cx,cy,rx,ry,fill,label,cls='')=>`<g class="kb-stone ${cls}" transform="translate(${cx} ${cy})"><ellipse rx="${rx}" ry="${ry}" fill="${fill}"/><ellipse class="kb-stone-gloss" cx="-${Math.max(2,rx*.25)}" cy="-${Math.max(2,ry*.25)}" rx="${Math.max(3,rx*.22)}" ry="${Math.max(2,ry*.16)}"/></g>`;
    const stones = showStones ? `<g class="kb-stones" clip-path="url(#kbBasketClip)">
      ${stone(174,132,27,18,'#4a9bd8','Hutang','blue')}
      ${stone(218,137,25,17,'#d9d9d9','Biaya Hidup','gray')}
      ${stone(261,132,27,18,'#e8c63d','Cicilan','yellow')}
      ${stone(201,115,23,16,'#55b879','Pendidikan','green')}
      ${stone(239,116,24,16,'#d75b61','Kesehatan','red')}
      ${stone(278,116,22,15,'#b66ab8','Pensiun','purple')}
      ${stone(224,151,23,15,'#58a8c8','Tabungan','cyan')}
      ${stone(263,151,23,15,'#e2a85b','Investasi','orange')}
    </g>` : '';

    const person=`<g class="kb-person ${showTired?'tired':''}">
      <circle class="head" cx="222" cy="292" r="17"/>
      <path class="hair" d="M207 289 Q222 269 237 289 Q233 277 222 276 Q211 277 207 289Z"/>
      <path class="body" d="M222 310 L222 365 M222 326 L188 292 M222 326 L256 292 M222 365 L202 402 M222 365 L242 402"/>
      <path class="arms-up" d="M188 292 L178 251 M256 292 L266 251"/>
      ${showTired?'<circle class="sweat" cx="266" cy="260" r="4"/>':''}
    </g>`;

    const family=showFamily?`<g class="kb-family">
      <g transform="translate(93 0)"><circle cx="0" cy="327" r="14"/><path d="M0 342 L0 383 M0 353 L-19 335 M0 353 L19 335 M0 383 L-14 405 M0 383 L14 405"/></g>
      <g transform="translate(326 13)"><circle cx="0" cy="327" r="12"/><path d="M0 340 L0 378 M0 351 L-17 338 M0 351 L17 338 M0 378 L-12 397 M0 378 L12 397"/></g>
      <g transform="translate(368 28)"><circle cx="0" cy="327" r="10"/><path d="M0 338 L0 369 M0 348 L-13 339 M0 348 L13 339 M0 369 L-10 386 M0 369 L10 386"/></g>
    </g>`:'';

    const labels='';

    const falling=showFall?`<g class="kb-falling-stones">
      ${stone(156,282,24,17,'#4a9bd8','Hutang','fall1')}
      ${stone(210,308,22,16,'#e8c63d','Cicilan','fall2')}
      ${stone(275,286,24,17,'#d75b61','Kesehatan','fall3')}
      ${stone(326,312,22,16,'#55b879','Pendidikan','fall4')}
    </g>`:'';

    const pillars=showPillars?`<g class="kb-pillars">
      <g class="pillar pillar-left"><rect x="57" y="190" width="27" height="220" rx="6"/><path d="M47 190 H94 L70.5 164 Z"/></g>
      <g class="pillar pillar-right"><rect x="363" y="190" width="27" height="220" rx="6"/><path d="M353 190 H400 L376.5 164 Z"/></g>
      
    </g>`:'';

    const question=n===8?`<g class="kb-question"><circle cx="222" cy="91" r="34"/><text x="222" y="104">?</text><text class="kb-question-sub" x="222" y="139">Bagaimana menjaganya?</text></g>`:'';
    const cross=showX?`<g class="kb-cross"><path d="M158 280 L286 405 M286 280 L158 405"/></g>`:'';
    const ground=showUneven
      ? `<path class="kb-ground kb-ground-uneven" d="M0 410 L60 378 L116 390 L168 370 L221 390 L276 366 L334 386 L392 370 L440 389 V440 H0 Z"/>`
      : `<path class="kb-ground" d="M0 410 Q105 360 220 399 Q330 360 440 405 V440 H0 Z"/>`;

    return `<div class="kb-scene kb-scene-${n} ${showTired?'is-tired':''} ${showX?'is-risk':''} ${showFall?'is-falling':''} ${complete?'is-complete':''}">
      <svg viewBox="0 0 440 440" role="img" aria-label="Keranjang Kehidupan langkah ${n}">
        <defs>
          <linearGradient id="kbSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff4fb"/><stop offset="1" stop-color="#f8fcfd"/></linearGradient>
          <linearGradient id="kbBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#168fc3"/><stop offset="1" stop-color="#42b7df"/></linearGradient>
          <linearGradient id="kbBasketNew" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3a348"/><stop offset="1" stop-color="#d36d2b"/></linearGradient>
          <linearGradient id="kbBasketInside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a542d" stop-opacity=".48"/><stop offset="1" stop-color="#6f351d" stop-opacity=".18"/></linearGradient>
          <clipPath id="kbBasketClip"><path d="M132 104 Q220 91 308 104 L294 171 Q220 185 146 171 Z"/></clipPath>
          <filter id="kbShadowNew" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#24313a" flood-opacity=".18"/></filter>
        </defs>
        <rect width="440" height="440" rx="22" fill="url(#kbSky)"/>
        <circle class="kb-sun" cx="388" cy="64" r="20"/>
        <g class="kb-house"><path d="M343 365 L374 337 L405 365 V405 H343 Z"/><path d="M337 365 L374 331 L411 365"/><rect x="368" y="378" width="13" height="27"/><rect x="351" y="369" width="12" height="12"/><rect x="386" y="369" width="12" height="12"/></g>
        <g class="kb-trees"><path d="M36 387 V340"/><circle cx="36" cy="328" r="23"/><path d="M70 390 V350"/><path d="M56 350 L70 329 L84 350"/></g>
        ${ground}
        ${pillars}
        <g class="kb-platform-group ${showFall?'tilted':''}">
          <rect class="kb-beam" x="72" y="184" width="296" height="14" rx="7" fill="url(#kbBeam)" filter="url(#kbShadowNew)"/>
          <g class="kb-basket-new">
            <!-- Keranjang terbuka ke atas: badan keranjang berbentuk wadah/trapesium, bukan U terbalik. -->
            <path d="M126 101 Q220 86 314 101 L295 179 Q220 194 145 179 Z" fill="url(#kbBasketNew)" stroke="#c86627" stroke-width="3"/>
            <!-- Rongga bagian dalam dibuat terlihat sebelum batu masuk, sehingga mulut keranjang jelas menghadap ke atas. -->
            <path d="M132 103 Q220 88 308 103 L295 173 Q220 186 145 173 Z" fill="url(#kbBasketInside)" stroke="#a85a2e" stroke-width="2"/>
            ${stones}
            <!-- Bibir depan keranjang berada di depan batu agar seluruh batu terbaca berada DI DALAM keranjang. -->
            <path d="M126 101 Q220 86 314 101" fill="none" stroke="#e27c2e" stroke-width="11" stroke-linecap="round"/>
            <path d="M145 179 Q220 194 295 179" fill="none" stroke="#b95e24" stroke-width="6" stroke-linecap="round"/>
          </g>
        </g>
        ${falling}
        ${labels}
        ${person}
        ${family}
        ${cross}
        ${question}
      </svg>
    </div>`;
  }
  function renderBasket(root){
    const s=basketSteps[current];
    const focusMap=[
      'KEHIDUPAN ADALAH SEBUAH KERANJANG BATU',
      'SETIAP BATU MEMILIKI UKURAN YANG BERBEDA',
      'KITA MENOPANG BEBAN KEHIDUPAN',
      'HIDUP PENUH KETIDAKPASTIAN',
      'BATU-BATU ITU ADALAH BIAYA KEHIDUPAN',
      'KITA BISA LELAH MENOPANGNYA',
      'JIKA PENOPANG TIDAK MAMPU, KELUARGA TERDAMPAK',
      'BAGAIMANA AGAR KERANJANG TETAP BERADA DI TEMPATNYA?',
      'BANGUN DUA PILAR',
      'PROTEKSI + UANG'
    ];
    const tags=current===4?`<div class="kb-legend"><span>Makan</span><span>Pendidikan</span><span>Kesehatan</span><span>Cicilan</span><span>Orang tua</span><span>Pensiun</span><span>Tabungan</span><span>Investasi</span></div>`:'';
    const pillars=current===9?`<div class="kb-pillar-summary"><div><span>◀</span><b>PROTEKSI</b></div><div><b>UANG</b><span>▶</span></div></div>`:'';
    root.innerHTML=`${salesIdeaHeader('Keranjang Kehidupan','Visual storytelling tentang beban kehidupan')}<div class="si-topline"><div><span class="si-eyebrow">SALES IDEA 02</span><h2>KERANJANG KEHIDUPAN</h2><p>Gunakan perubahan visual sebagai pemantik percakapan. Agen tidak perlu membaca script dari layar.</p></div><div class="si-counter"><b>${current+1}</b><span>/ 10 LANGKAH</span></div></div><div class="si-progress"><span style="width:${(current+1)*10}%"></span></div><div class="kb-layout"><div class="kb-visual-card">${basketScene(s)}${tags}${pillars}<div class="kb-visual-caption"><span>LANGKAH ${s.n}</span><b>${s.title}</b></div></div><div class="kb-presentation-card"><div class="si-presentation-kicker">FOKUS PRESENTASI • ${s.n}/10</div><div class="si-presentation-focus">${focusMap[current]}</div><div class="si-presentation-text">${s.body}</div><div class="kb-agent-cue"><span>💡</span><div><b>Panduan untuk agen</b><p>${current===9?'Arahkan perhatian prospek pada dua pilar. Jelaskan makna proteksi dan uang dengan bahasa Anda sendiri.':current===6?'Biarkan visual risiko dan keluarga menjadi pemantik. Tidak perlu membaca narasi kata demi kata.':'Tampilkan visual, berhenti sejenak, lalu kembangkan percakapan berdasarkan respons prospek.'}</p></div></div></div></div>`;
  }

  function assetCreationScene(step){
    const n=step.n;
    const txt=(x,y,t,cls='')=>{ const safe=String(t); const limit=cls.includes('hero')?310:cls.includes('big')?320:cls.includes('money')?300:cls.includes('label')?300:cls.includes('small')||cls.includes('sub')?330:320; const need=safe.length>18; return `<text x="${x}" y="${y}" class="ac-txt ${cls}"${need?` textLength="${limit}" lengthAdjust="spacingAndGlyphs"`:''}>${safe}</text>`; };
    const property=`<g class="ac-property"><path d="M120 285 L220 205 L320 285 V365 H120 Z" fill="#f7d9ad" stroke="#a86a32" stroke-width="4"/><path d="M105 286 L220 190 L335 286" fill="#c95c43" stroke="#8e3e31" stroke-width="4"/><rect x="200" y="305" width="40" height="60" fill="#9dc4dc" stroke="#4b7188" stroke-width="3"/><rect x="145" y="300" width="32" height="30" fill="#9dc4dc"/><rect x="263" y="300" width="32" height="30" fill="#9dc4dc"/></g>`;
    const money=`<g class="ac-money"><circle cx="88" cy="90" r="42" fill="#fff6df" stroke="#d6a23d" stroke-width="3"/>${txt(88,86,'Rp5 M','money')}${txt(88,104,'ASET','small')}</g>`;
    let scene='';
    if(n===1){scene=`<g class="ac-functions"><path d="M220 65 L365 350 H75 Z" fill="#fff" stroke="#344054" stroke-width="4"/>${txt(220,105,'ASSET CREATION','tri')}${txt(220,190,'ASSET PROTECTION','tri')}${txt(220,280,'INCOME PROTECTION','tri')}<path d="M105 153 H335 M123 235 H317" stroke="#c7cdd5" stroke-width="3"/>${txt(220,390,'3 FUNGSI ASURANSI','big')}</g>`;}
    else if(n===2){scene=`${property}${money}${txt(220,80,'TARGET ASET','label')}${txt(220,125,'Rp5 MILIAR','hero')}${txt(220,395,'Aset baru • rencana warisan','sub')}`;}
    else if(n===3){scene=`${property}${txt(220,62,'PILIHAN 1','big')}${txt(220,108,'DP 30%','label')}${txt(220,145,'Rp1,5 MILIAR','money')}${txt(220,188,'SISA Rp3,5 MILIAR','label')}${txt(220,230,'7% • 20 TAHUN','label')}${txt(220,275,'≈ Rp27 JT / BLN','hero')}${txt(220,395,'Contoh dari materi','sub')}`;}
    else if(n===4){scene=`${property}${txt(220,62,'PILIHAN 2','big')}${txt(220,108,'DP 0 • Rp0','label')}${txt(220,150,'SISA Rp5 MILIAR','money')}${txt(220,192,'7% • 20 TAHUN','label')}${txt(220,255,'≈ Rp39,5 JT / BLN','hero')}${txt(220,395,'Contoh dari materi','sub')}`;}
    else if(n===5){scene=`<g class="ac-creation"><circle cx="220" cy="165" r="70" fill="#fff7e8" stroke="#d6a23d" stroke-width="5"/>${txt(220,160,'≈ Rp6 JT','money')}${txt(220,183,'/ BULAN','small')}<path d="M220 240 V305" stroke="#a60101" stroke-width="5"/><path d="M205 289 L220 307 L235 289" fill="none" stroke="#a60101" stroke-width="5"/>${property}<rect x="128" y="318" width="184" height="46" rx="18" fill="#fff3f3" stroke="#e2aaaa" stroke-width="2"/>${txt(220,348,'TARGET Rp5 MILIAR','label')}${txt(220,395,'Contoh materi • mekanisme berbeda','sub')}</g>`;}
    else {scene=`${property}<g class="ac-family"><circle cx="135" cy="350" r="14" fill="#f1bd96" stroke="#8c5d47" stroke-width="2"/><path d="M135 366 V397 M135 374 L119 360 M135 374 L151 360" stroke="#344054" stroke-width="5" stroke-linecap="round"/><circle cx="305" cy="350" r="11" fill="#f1bd96" stroke="#8c5d47" stroke-width="2"/><path d="M305 362 V390 M305 370 L292 359 M305 370 L318 359" stroke="#344054" stroke-width="4" stroke-linecap="round"/></g>${txt(220,72,'ASET BARU','label')}${txt(220,115,'Rp5 MILIAR','hero')}${txt(220,155,'↓','arrow')}${txt(220,192,'WARISAN UNTUK ANAK','big')}${txt(220,425,'Bangun aset • siapkan tujuan • rencanakan warisan','sub')}`;}
    return `<div class="ac-scene ac-scene-${n}"><svg viewBox="0 0 440 440" role="img" aria-label="Asset Creation langkah ${n}"><rect width="440" height="440" rx="24" fill="#f8fbff"/>${scene}</svg></div>`;
  }
  function renderAssetCreation(root){
    const s=assetCreationSteps[current];
    root.innerHTML=`${salesIdeaHeader('Asset Creation','Visual sederhana untuk membuka percakapan aset dan warisan')}<div class="si-topline"><div><span class="si-eyebrow">SALES IDEA 05</span><h2>ASSET CREATION</h2><p>Visual + inti pesan. Agen bebas mengembangkan percakapan sesuai kondisi prospek.</p></div><div class="si-counter"><b>${current+1}</b><span>/ 6 LANGKAH</span></div></div><div class="si-progress"><span style="width:${(current+1)*100/6}%"></span></div><div class="ac-layout"><div class="ac-visual-card">${assetCreationScene(s)}<div class="ac-caption"><span>LANGKAH ${s.n}</span><b>${s.title}</b></div></div><div class="ac-presentation-card"><div class="si-presentation-kicker">INTI PESAN • ${s.n}/6</div><div class="si-presentation-focus">${s.focus}</div><div class="si-presentation-text">${s.body}</div><div class="ac-cue">💡 Tampilkan visual ini, lalu kembangkan pertanyaan sesuai kondisi prospek.</div></div></div>`;
  }

  function updateNav(){
    const prev=$('siPrev'),next=$('siNext'),count=$('siStepCount'),footer=document.querySelector('.si-footer');
    if(mode==='hub'){if(footer)footer.style.display='none';return;} if(footer)footer.style.display='';
    if(pemutar)return; // tombol, counter, dan progress diatur pemutar
    const total=(mode==='basket'||mode==='education')?10:((mode==='retirement'||mode==='asset')?6:13); const pos=(mode==='basket'||mode==='education'||mode==='retirement'||mode==='asset')?current:(current<10?current:current+1);
    if(prev){prev.disabled=current===0;prev.textContent=current===0?'← Awal':'← Sebelumnya';} if(next){next.textContent=current===total-1?'✓ Selesai':'Berikutnya →';} if(count)count.textContent=`Langkah ${pos+1} dari ${total}`;
  }

  function next(){
    if(pemutar&&mode!=='hub'){pemutar.next();return;}
    const max=(mode==='basket'||mode==='education')?9:((mode==='retirement'||mode==='asset')?5:12);
    if(current<max){current++;render();}
    else {current=0;render();}
  }
  function prev(){if(pemutar&&mode!=='hub'){pemutar.back();return;}if(current>0){current--;render();}}
  function reset(){current=0;mode='hub';render();}
  function setMode(nextMode){if(['jari','basket','education','retirement','asset','alasan'].includes(nextMode)){mode=nextMode;current=0;render();}else if(nextMode==='hub'){mode='hub';current=0;render();}}

  function init(){
    const btn=$('btnSalesIdea');
    if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',()=>{mode='hub';current=0;document.body.classList.add('si-modal-open');if(window.bukaLayar)window.bukaLayar('SALES_IDEA');});}
    const nextBtn=$('siNext'),prevBtn=$('siPrev'),resetBtn=$('siReset');
    if(nextBtn&&!nextBtn.dataset.bound){nextBtn.dataset.bound='1';nextBtn.addEventListener('click',next);}
    if(prevBtn&&!prevBtn.dataset.bound){prevBtn.dataset.bound='1';prevBtn.addEventListener('click',prev);}
    if(resetBtn&&!resetBtn.dataset.bound){resetBtn.dataset.bound='1';resetBtn.addEventListener('click',reset);}
    if(!dokumenTerpasang){dokumenTerpasang=true;document.addEventListener('click',e=>{const choice=e.target.closest('[data-si-choice]');if(choice){openSalesIdea(choice.dataset.siChoice);return;}const hub=e.target.closest('[data-si-hub]');if(hub){mode='hub';current=0;render();return;}const close=e.target.closest('[data-si-close]');if(close){closeSalesIdea();return;}});}
    render();
  }

  window.SalesIdea10Jari={init,reset,next,prev,setMode,openSalesIdea,closeSalesIdea};
  document.addEventListener('DOMContentLoaded',init);
})();
