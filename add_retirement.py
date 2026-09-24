from pathlib import Path
p=Path('/mnt/data/retire_work/src/sales-idea.js')
s=p.read_text()
# Add retirement steps after educationSteps array before let current
marker="\n  let current = 0;\n"
ret="""

  const retirementSteps = [
    {n:1,title:'Tiga risiko utama',focus:'MENINGGAL TERLALU CEPAT • HIDUP TERLALU LAMA • DISABILITAS',body:'Perencanaan keuangan perlu memperhatikan tiga risiko besar: meninggal terlalu cepat, hidup lebih lama dari perkiraan, dan kehilangan kemampuan bekerja.',scene:'risks'},
    {n:2,title:'Fokus: hidup terlalu lama',focus:'RISIKO LIVING TOO LONG',body:'Masa pensiun dapat berlangsung panjang. Tantangannya bukan hanya berhenti bekerja, tetapi memastikan dana tetap cukup selama masa hidup setelah pensiun.',scene:'longlife'},
    {n:3,title:'30 tahun bekerja, 30 tahun pensiun',focus:'USIA 25 → 55 → 85',body:'Ilustrasi materi menggunakan masa produktif sekitar 30 tahun dan masa pensiun sekitar 30 tahun. Penghasilan saat bekerja perlu membantu membiayai dua fase kehidupan tersebut.',scene:'timeline'},
    {n:4,title:'Rasio menabung',focus:'EARN 100% • SPEND 50% • SAVE 50%',body:'Dalam ilustrasi materi, karena masa produktif perlu menopang masa pensiun yang panjang, disarankan menyisihkan sekitar 50% penghasilan. Jika belum mampu, mulai dari angka yang realistis.',scene:'ratio'},
    {n:5,title:'Berapa aset yang dibutuhkan?',focus:'CONTOH: GAYA HIDUP Rp10 JT/BLN → TARGET ASET ≈ Rp27 M',body:'Contoh dalam materi: dengan gaya hidup saat ini Rp10 juta per bulan dan asumsi finansial tertentu, kebutuhan aset pensiun dapat mencapai sekitar Rp27 miliar. Angka ini adalah ilustrasi yang sangat bergantung pada asumsi.',scene:'target'},
    {n:6,title:'Tidak harus menunggu mampu 50%',focus:'MULAI DULU',body:'Belum mampu menabung 50% bukan alasan untuk tidak mulai. Kebiasaan menyisihkan dana sejak sekarang memberi waktu lebih panjang untuk membangun aset.',scene:'start'},
    {n:7,title:'Bunga berbunga bekerja dengan waktu',focus:'Rp1 JT/BLN • 30 TAHUN • 6%/TAHUN',body:'Ilustrasi materi menunjukkan bagaimana setoran rutin dapat berkembang dengan hasil investasi dan efek compounding. Waktu menjadi salah satu aset penting dalam perencanaan pensiun.',scene:'compound'},
    {n:8,title:'Waktu membuat perbedaan',focus:'SETORAN + WAKTU + HASIL INVESTASI',body:'Jangan hanya melihat jumlah setoran. Dalam jangka panjang, hasil yang terus berkembang dapat membuat nilai akhir berbeda jauh dari akumulasi setoran semata.',scene:'compare'},
    {n:9,title:'Jangan lupa risiko disabilitas',focus:'BAGAIMANA JIKA KEMAMPUAN MENGHASILKAN UANG BERHENTI?',body:'Rencana pensiun bergantung pada kemampuan membangun aset. Karena itu, risiko disabilitas juga perlu diantisipasi agar rencana tidak berhenti ketika penghasilan terganggu.',scene:'disability'},
    {n:10,title:'Mulai sekarang dan lindungi rencananya',focus:'START EARLY + COMPOUNDING + PROTECTION',body:'Perencanaan pensiun bukan sekadar menabung. Mulai sedini mungkin, manfaatkan waktu dan pertumbuhan aset, lalu siapkan proteksi terhadap risiko yang dapat mengganggu perjalanan.',scene:'complete'}
  ];
"""
if marker not in s: raise SystemExit('marker not found')
s=s.replace(marker,ret+marker,1)
# hub add card
old='''</button><button type="button" class="si-choice-card" data-si-choice="education"><div class="si-choice-visual education-choice">🎓</div><div><span>SALES IDEA 03</span><h3>Education Planning</h3><p>Tujuan pendidikan, inflasi, mulai lebih awal, dan proteksi.</p></div><strong>Mulai presentasi →</strong></button></div>'''
new='''</button><button type="button" class="si-choice-card" data-si-choice="education"><div class="si-choice-visual education-choice">🎓</div><div><span>SALES IDEA 03</span><h3>Education Planning</h3><p>Tujuan pendidikan, inflasi, mulai lebih awal, dan proteksi.</p></div><strong>Mulai presentasi →</strong></button><button type="button" class="si-choice-card" data-si-choice="retirement"><div class="si-choice-visual retirement-choice">♨</div><div><span>SALES IDEA 04</span><h3>Retirement Planning</h3><p>Risiko hidup terlalu lama, kebutuhan aset, compounding, dan proteksi.</p></div><strong>Mulai presentasi →</strong></button></div>'''
if old not in s: raise SystemExit('hub marker not found')
s=s.replace(old,new,1)
# render mode
s=s.replace("else if(mode==='education')renderEducation(root);updateNav();", "else if(mode==='education')renderEducation(root);else if(mode==='retirement')renderRetirement(root);updateNav();",1)
# insert retirement functions before basketScene
marker2='\n  function basketScene(step){'
retfunc=r'''
  function retirementScene(step){
    const n=step.n;
    const txt=(x,y,t,cls='rptxt')=>`<text class="${cls}" x="${x}" y="${y}">${t}</text>`;
    const person=(x,y,scale=1,older=false)=>`<g class="rp-person" transform="translate(${x} ${y}) scale(${scale})"><circle cx="0" cy="-30" r="13"/><path d="M0 -16 V28 M0 -2 L-19 13 M0 -2 L19 13 M0 28 L-14 51 M0 28 L14 51"/><path d="M-10 -39 Q0 -50 10 -39" fill="none"/></g>`;
    let scene='';
    if(n===1){
      scene=`<g class="rp-risks"><path d="M220 360 V120"/><path d="M220 120 L115 220 M220 120 L325 220"/><circle cx="115" cy="220" r="48"/><circle cx="220" cy="120" r="48"/><circle cx="325" cy="220" r="48"/>${txt(115,214,'MENINGGAL','rptxt small')}${txt(115,235,'TERLALU CEPAT','rptxt small')}${txt(220,114,'HIDUP','rptxt small')}${txt(220,135,'TERLALU LAMA','rptxt small')}${txt(325,214,'DISABILITAS','rptxt small')}${txt(220,400,'3 RISIKO PERENCANAAN KEUANGAN','rptxt title')}</g>`;
    } else if(n===2){
      scene=`<g class="rp-longlife"><path d="M65 320 H375" stroke="#bfc8d1" stroke-width="5"/><path d="M85 320 V180" stroke="#9aa7b3" stroke-width="6"/><path d="M355 320 V145" stroke="#9aa7b3" stroke-width="6"/>${person(100,255,.8)}${person(350,220,1.05,true)}${txt(105,350,'BEKERJA','rptxt label')}${txt(350,350,'PENSIUN','rptxt label')}${txt(220,115,'LIVING TOO LONG','rptxt title')}${txt(220,140,'Dana harus cukup selama hidup','rptxt sub')}</g>`;
    } else if(n===3){
      scene=`<g class="rp-timeline"><line x1="55" y1="275" x2="385" y2="275" stroke="#344054" stroke-width="5"/><line x1="55" y1="255" x2="220" y2="255" stroke="#c62828" stroke-width="28"/><line x1="220" y1="255" x2="385" y2="255" stroke="#d6a23d" stroke-width="28"/><circle cx="55" cy="275" r="8"/><circle cx="220" cy="275" r="8"/><circle cx="385" cy="275" r="8"/>${txt(55,310,'25','rptxt big')}${txt(220,310,'55','rptxt big')}${txt(385,310,'85','rptxt big')}${txt(137,228,'30 TAHUN BEKERJA','rptxt label')}${txt(302,228,'30 TAHUN PENSIUN','rptxt label')}${txt(55,345,'MULAI KERJA','rptxt small')}${txt(220,345,'PENSIUN','rptxt small')}${txt(385,345,'AKHIR ILUSTRASI','rptxt small')}${txt(220,95,'30 TAHUN PRODUKTIF → 30 TAHUN PENSIUN','rptxt title')}</g>`;
    } else if(n===4){
      scene=`<g class="rp-ratio"><rect x="55" y="105" width="330" height="68" rx="18" fill="#eef2f6"/><rect x="55" y="105" width="165" height="68" rx="18" fill="#c62828"/><rect x="220" y="105" width="165" height="68" fill="#d6a23d"/>${txt(137,146,'SAVE 50%','rptxt white')}${txt(302,146,'SPEND 50%','rptxt dark')}${txt(220,215,'EARN 100%','rptxt title')}${txt(220,260,'ILUSTRASI RASIO','rptxt label')}${txt(220,300,'Belum mampu 50%? Mulai dari yang realistis.','rptxt sub')}</g>`;
    } else if(n===5){
      scene=`<g class="rp-target"><rect x="65" y="105" width="310" height="220" rx="24" fill="#fff" stroke="#e4e7ec" stroke-width="3"/><text class="rp-label" x="220" y="145">GAYA HIDUP SAAT INI</text><text class="rp-money" x="220" y="190">Rp10 JT / BLN</text><path d="M110 225 H330" stroke="#e5e7eb" stroke-width="3"/><text class="rp-label" x="220" y="255">CONTOH TARGET ASET PENSIUN</text><text class="rp-target-money" x="220" y="300">≈ Rp27 M</text>${txt(220,350,'Ilustrasi — bergantung pada asumsi','rptxt small')}</g>`;
    } else if(n===6){
      scene=`<g class="rp-start"><circle cx="120" cy="180" r="48" fill="#eef7ee"/><path d="M100 180 L115 195 L142 160" fill="none" stroke="#42a85f" stroke-width="9" stroke-linecap="round"/><path d="M175 285 Q250 210 350 155" fill="none" stroke="#c62828" stroke-width="8"/><circle cx="175" cy="285" r="12" fill="#c62828"/><circle cx="350" cy="155" r="16" fill="#d6a23d"/>${txt(235,110,'MULAI SEKARANG','rptxt title')}${txt(235,350,'Tidak perlu menunggu sempurna.','rptxt sub')}</g>`;
    } else if(n===7){
      scene=`<g class="rp-compound"><line x1="65" y1="330" x2="385" y2="330" stroke="#98a2b3"/><line x1="65" y1="330" x2="65" y2="95" stroke="#98a2b3"/><path d="M65 320 C135 305 175 285 215 250 C260 210 300 155 385 105" fill="none" stroke="#c62828" stroke-width="7"/><path d="M65 320 L385 320" stroke="#d6a23d" stroke-width="5" stroke-dasharray="10 8"/>${txt(65,365,'0','rptxt small')}${txt(385,365,'30 TAHUN','rptxt small')}${txt(220,85,'Rp1 JT / BLN • 30 TAHUN • 6% / TAHUN','rptxt title')}${txt(270,205,'EFEK COMPOUNDING','rptxt label')}</g>`;
    } else if(n===8){
      scene=`<g class="rp-compare"><rect x="65" y="125" width="135" height="190" rx="18" fill="#f4f5f7"/><rect x="240" y="125" width="135" height="190" rx="18" fill="#fff5f5"/><path d="M90 275 H175" stroke="#98a2b3" stroke-width="18"/><path d="M265 275 Q305 235 350 155" fill="none" stroke="#c62828" stroke-width="18" stroke-linecap="round"/>${txt(132,160,'SETORAN','rptxt label')}${txt(132,190,'SAJA','rptxt title')}${txt(307,160,'SETORAN','rptxt label')}${txt(307,190,'+ HASIL','rptxt title')}${txt(132,345,'AKUMULASI','rptxt small')}${txt(307,345,'COMPOUNDING','rptxt small')}</g>`;
    } else if(n===9){
      scene=`<g class="rp-disability"><path d="M60 320 H380" stroke="#d0d5dd" stroke-width="6"/><path d="M75 290 H155 L205 235 L265 290 H365" fill="none" stroke="#c62828" stroke-width="8"/><circle cx="205" cy="235" r="18" fill="#c62828"/>${person(120,280,.7)}<g class="rp-shield"><path d="M310 165 L355 182 V225 Q355 270 310 292 Q265 270 265 225 V182 Z" fill="#eef7ee" stroke="#42a85f" stroke-width="5"/><path d="M288 225 L303 240 L333 207" fill="none" stroke="#42a85f" stroke-width="9" stroke-linecap="round"/></g>${txt(205,115,'DISABILITAS DAPAT MENGGANGGU PERJALANAN','rptxt title')}${txt(205,350,'Rencana perlu memiliki proteksi.','rptxt sub')}</g>`;
    } else {
      scene=`<g class="rp-complete"><circle cx="110" cy="190" r="62" fill="#fff5f5" stroke="#c62828" stroke-width="5"/><circle cx="220" cy="190" r="62" fill="#fff9eb" stroke="#d6a23d" stroke-width="5"/><circle cx="330" cy="190" r="62" fill="#eef7ee" stroke="#42a85f" stroke-width="5"/>${txt(110,185,'START','rptxt label')}${txt(110,208,'EARLY','rptxt label')}${txt(220,185,'COMPOUND','rptxt label')}${txt(220,208,'ING','rptxt label')}${txt(330,185,'PROTEKSI','rptxt label')}${txt(330,208,'RISIKO','rptxt label')}${txt(220,335,'RETIREMENT PLANNING','rptxt title')}${txt(220,365,'Mulai sekarang, manfaatkan waktu, lindungi rencana.','rptxt sub')}</g>`;
    }
    return `<div class="rp-scene rp-scene-${n}"><svg viewBox="0 0 440 440" role="img" aria-label="Retirement Planning langkah ${n}"><defs><linearGradient id="rpBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fbff"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="440" height="440" rx="24" fill="url(#rpBg)"/>${scene}</svg></div>`;
  }

  function renderRetirement(root){
    const s=retirementSteps[current];
    root.innerHTML=`${salesIdeaHeader('Retirement Planning','Visual storytelling tentang perencanaan pensiun')}<div class="si-topline"><div><span class="si-eyebrow">SALES IDEA 04</span><h2>RETIREMENT PLANNING</h2><p>Visual menjadi pemantik. Agen menyampaikan pertanyaan dan penjelasan dengan gaya sendiri.</p></div><div class="si-counter"><b>${current+1}</b><span>/ 10 LANGKAH</span></div></div><div class="si-progress"><span style="width:${(current+1)*10}%"></span></div><div class="rp-layout"><div class="rp-visual-card">${retirementScene(s)}<div class="rp-caption"><span>LANGKAH ${s.n}</span><b>${s.title}</b></div></div><div class="rp-presentation-card"><div class="si-presentation-kicker">FOKUS PRESENTASI • ${s.n}/10</div><div class="si-presentation-focus">${s.focus}</div><div class="si-presentation-text">${s.body}</div><div class="rp-cue">💡 <span>Tampilkan visual, beri jeda, lalu kembangkan percakapan berdasarkan respons prospek.</span></div></div></div>`;
  }
'''
if marker2 not in s: raise SystemExit('basket marker not found')
s=s.replace(marker2, '\n'+retfunc+marker2,1)
# update totals
s=s.replace("const total=(mode==='basket'||mode==='education')?10:13; const pos=(mode==='basket'||mode==='education')?current:(current<10?current:current+1);", "const total=(mode==='basket'||mode==='education'||mode==='retirement')?10:13; const pos=(mode==='basket'||mode==='education'||mode==='retirement')?current:(current<10?current:current+1);",1)
s=s.replace("const max=(mode==='basket'||mode==='education')?9:12;", "const max=(mode==='basket'||mode==='education'||mode==='retirement')?9:12;",1)
s=s.replace("['jari','basket','education','alasan']", "['jari','basket','education','retirement','alasan']",1)
p.write_text(s)

# CSS append
css=Path('/mnt/data/retire_work/src/styles.css')
c=css.read_text()
insert='''\n/* SALES IDEA 04 — RETIREMENT PLANNING v1.5.1 */\n.si-choice-card[data-si-choice="retirement"] .si-choice-visual{background:linear-gradient(145deg,#f3f6ff,#fff5ea)}\n.rp-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(340px,.72fr);gap:20px;align-items:start}.rp-visual-card,.rp-presentation-card{border:1px solid #e7e8ec;border-radius:24px;background:#fff;box-shadow:0 14px 38px rgba(20,20,20,.06);overflow:hidden}.rp-scene{min-height:560px;padding:12px 24px;display:grid;place-items:center;background:linear-gradient(180deg,#f7fbff 0%,#fff 100%)}.rp-scene svg{width:100%;max-width:820px;height:auto;display:block}.rp-caption{display:flex;align-items:center;gap:11px;padding:14px 18px;border-top:1px solid #edf0f2}.rp-caption span{font-size:10px;font-weight:950;letter-spacing:.1em;color:#a60101}.rp-caption b{font-size:15px;color:#344054}.rp-presentation-card{padding:24px;position:sticky;top:12px}.rp-presentation-card .si-presentation-focus{text-align:left;margin-left:0;font-size:25px}.rp-presentation-card .si-presentation-text{text-align:left;margin-left:0}.rp-cue{margin-top:18px;padding:12px 13px;border-radius:14px;background:#f7f8fa;border:1px solid #e8eaee;color:#667085;font-size:11px;line-height:1.5}.rp-scene text{font-family:inherit;text-anchor:middle}.rp-scene .rptxt{fill:#344054}.rp-scene .rptxt.title{font-size:15px;font-weight:900;letter-spacing:.02em}.rp-scene .rptxt.label{font-size:12px;font-weight:850}.rp-scene .rptxt.small{font-size:10px;font-weight:750}.rp-scene .rptxt.sub{font-size:11px;fill:#667085}.rp-scene .rptxt.big{font-size:22px;font-weight:950;fill:#a60101}.rp-scene .rptxt.white{font-size:14px;font-weight:900;fill:#fff}.rp-scene .rptxt.dark{font-size:14px;font-weight:900;fill:#6b5200}.rp-scene .rp-money,.rp-scene .rp-target-money{font-family:inherit;text-anchor:middle;font-weight:950;fill:#a60101}.rp-scene .rp-money{font-size:28px}.rp-scene .rp-target-money{font-size:38px}.rp-scene .rp-label{font-family:inherit;text-anchor:middle;font-size:11px;font-weight:850;fill:#667085;letter-spacing:.06em}.rp-person circle{fill:#f2b48f;stroke:#8c5a45;stroke-width:3}.rp-person path{fill:none;stroke:#344054;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}.rp-risks path{stroke:#aab3bd;stroke-width:4;fill:none}.rp-risks circle{fill:#fff;stroke:#c62828;stroke-width:4}.rp-risks .rptxt{fill:#a60101}.rp-timeline line{stroke-linecap:round}.rp-compound path,.rp-compare path{stroke-linecap:round}.rp-complete circle{filter:drop-shadow(0 5px 7px rgba(0,0,0,.08))}\n@media(max-width:980px){.rp-layout{grid-template-columns:1fr}.rp-presentation-card{position:static}.rp-scene{min-height:440px}}\n@media(max-width:620px){.rp-scene{min-height:340px;padding:5px 8px}.rp-presentation-card{padding:18px}.rp-presentation-card .si-presentation-focus{font-size:22px}.rp-caption{align-items:flex-start;flex-direction:column;gap:4px}}\n'''
css.write_text(c+insert)

# version
av=Path('/mnt/data/retire_work/src/app-version.js')
a=av.read_text().replace("v1.5.0","v1.5.1")
av.write_text(a)
sw=Path('/mnt/data/retire_work/sw.js')
w=sw.read_text().replace("insurance-hub-v90.58.7","insurance-hub-v90.58.8")
sw.write_text(w)

# update comments / cache
for fp in [Path('/mnt/data/retire_work/src/sales-idea.js'), Path('/mnt/data/retire_work/src/styles.css')]:
    txt=fp.read_text().replace('v1.4.2: 10 Jari + Keranjang Kehidupan','v1.5.1: 10 Jari + Keranjang Kehidupan + Education Planning + Retirement Planning')
    txt=txt.replace('SALES IDEA — FULL SCREEN PRESENTATION + EDUCATION PLANNING v1.5.0','SALES IDEA — FULL SCREEN PRESENTATION + EDUCATION PLANNING + RETIREMENT PLANNING v1.5.1')
    fp.write_text(txt)
