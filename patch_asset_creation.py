from pathlib import Path
base=Path('/mnt/data/work_v19')
p=base/'src/sales-idea.js'
s=p.read_text()
s=s.replace('v1.5.2: 10 Jari + Keranjang Kehidupan + Education Planning + Retirement Planning','v1.6.0: 10 Jari + Keranjang Kehidupan + Education Planning + Retirement Planning + Asset Creation')
# insert steps before let current
marker='\n\n  let current = 0;'
steps='''\n\n  const assetCreationSteps = [
    {n:1,title:'3 fungsi asuransi',focus:'INCOME PROTECTION • ASSET PROTECTION • ASSET CREATION',body:'Asuransi dapat dibahas melalui tiga fungsi: melindungi penghasilan, melindungi aset, dan membantu menciptakan aset baru.',scene:'functions'},
    {n:2,title:'Membangun aset untuk warisan',focus:'TARGET ASET: Rp5 MILIAR',body:'Contoh materi: seseorang ingin memiliki properti senilai Rp5 miliar sebagai aset baru dan rencana warisan untuk anak.',scene:'property'},
    {n:3,title:'Pilihan 1 — dengan DP',focus:'DP 30% = Rp1,5 M • CICILAN ≈ Rp27 JT/BLN',body:'Contoh dalam materi: DP 30% atau Rp1,5 miliar, sisa Rp3,5 miliar, ilustrasi bunga 7% selama 20 tahun, cicilan sekitar Rp27 juta per bulan.',scene:'option1'},
    {n:4,title:'Pilihan 2 — tanpa DP',focus:'DP 0 • CICILAN ≈ Rp39,5 JT/BLN',body:'Contoh dalam materi: tanpa DP, kebutuhan pembiayaan Rp5 miliar, dengan ilustrasi bunga 7% selama 20 tahun, cicilan sekitar Rp39,5 juta per bulan.',scene:'option2'},
    {n:5,title:'Pilihan 3 — konsep asset creation',focus:'CONTOH MATERI: ≈ Rp6 JT/BLN → TARGET Rp5 M',body:'Materi memperkenalkan pendekatan berbeda untuk menciptakan aset baru dengan beban bulanan yang lebih ringan. Angka Rp6 juta adalah contoh dari materi dan bukan simulasi KPR dengan asumsi yang sama.',scene:'option3'},
    {n:6,title:'Aset baru untuk anak',focus:'ASET Rp5 MILIAR → WARISAN',body:'Inti percakapan: bagaimana seseorang yang sudah mapan dapat membangun aset baru yang nantinya dapat dipersiapkan sebagai warisan untuk anak.',scene:'inheritance'}
  ];'''
s=s.replace(marker,steps+marker)
# hub add card
old='''<button type="button" class="si-choice-card" data-si-choice="retirement"><div class="si-choice-visual retirement-choice">⌛</div><div><span>SALES IDEA 04</span><h3>Retirement Planning</h3><p>Risiko hidup terlalu lama, kebutuhan aset, compounding, dan proteksi.</p></div><strong>Mulai presentasi →</strong></button>'''
new=old+'''<button type="button" class="si-choice-card" data-si-choice="asset"><div class="si-choice-visual asset-choice">🏠</div><div><span>SALES IDEA 05</span><h3>Asset Creation</h3><p>Mengubah rencana aset menjadi pembahasan warisan untuk anak.</p></div><strong>Mulai presentasi →</strong></button>'''
s=s.replace(old,new)
# render mode
s=s.replace("else if(mode==='retirement')renderRetirement(root);updateNav();", "else if(mode==='retirement')renderRetirement(root);else if(mode==='asset')renderAssetCreation(root);updateNav();")
# insert scene/render before updateNav
marker2='\n  function updateNav(){'
func='''\n  function assetCreationScene(step){
    const n=step.n;
    const txt=(x,y,t,cls='')=>`<text x="${x}" y="${y}" class="ac-txt ${cls}">${t}</text>`;
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
'''
s=s.replace(marker2,func+marker2)
# nav totals
s=s.replace("const total=(mode==='basket'||mode==='education')?10:(mode==='retirement'?6:13); const pos=(mode==='basket'||mode==='education'||mode==='retirement')?current:(current<10?current:current+1);", "const total=(mode==='basket'||mode==='education')?10:((mode==='retirement'||mode==='asset')?6:13); const pos=(mode==='basket'||mode==='education'||mode==='retirement'||mode==='asset')?current:(current<10?current:current+1);")
s=s.replace("const max=(mode==='basket'||mode==='education')?9:(mode==='retirement'?5:12);", "const max=(mode==='basket'||mode==='education')?9:((mode==='retirement'||mode==='asset')?5:12);")
s=s.replace("if(['jari','basket','education','retirement','alasan'].includes(nextMode))", "if(['jari','basket','education','retirement','asset','alasan'].includes(nextMode))")
p.write_text(s)

# CSS
css=base/'src/styles.css'
c=css.read_text()
add='''\n/* SALES IDEA 05 — ASSET CREATION / WARISAN */\n.si-choice-card[data-si-choice="asset"] .si-choice-visual{background:linear-gradient(145deg,#fff7e8,#eef8ff)}\n.ac-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.7fr);gap:18px;align-items:start}.ac-visual-card,.ac-presentation-card{border:1px solid #e7e8ec;border-radius:24px;background:#fff;box-shadow:0 14px 38px rgba(20,20,20,.06);overflow:hidden}.ac-scene{min-height:520px;padding:16px 20px;display:grid;place-items:center;background:linear-gradient(180deg,#f7fbff 0%,#fff 100%)}.ac-scene svg{width:100%;max-width:760px;height:auto;display:block}.ac-caption{display:flex;align-items:center;gap:11px;padding:14px 18px;border-top:1px solid #edf0f2}.ac-caption span{font-size:10px;font-weight:950;letter-spacing:.1em;color:#a60101}.ac-caption b{font-size:15px;color:#344054}.ac-presentation-card{padding:22px;position:sticky;top:12px}.ac-presentation-card .si-presentation-focus{text-align:left;margin-left:0;font-size:24px;line-height:1.2}.ac-presentation-card .si-presentation-text{text-align:left;font-size:13px;line-height:1.55}.ac-cue{margin-top:18px;padding:12px 13px;border-radius:14px;background:#f7f8fa;border:1px solid #e8eaee;color:#667085;font-size:11px;line-height:1.5}.ac-scene text{font-family:Arial,sans-serif;text-anchor:middle}.ac-txt{fill:#344054}.ac-txt.big{font-size:20px;font-weight:950;fill:#a60101}.ac-txt.tri{font-size:14px;font-weight:950}.ac-txt.label{font-size:13px;font-weight:850;letter-spacing:.04em}.ac-txt.money{font-size:28px;font-weight:950;fill:#a60101}.ac-txt.hero{font-size:34px;font-weight:950;fill:#a60101}.ac-txt.small{font-size:11px;font-weight:800;fill:#667085}.ac-txt.sub{font-size:11px;font-weight:700;fill:#667085}.ac-txt.arrow{font-size:26px;font-weight:950;fill:#a60101}.ac-property{filter:drop-shadow(0 7px 7px rgba(20,30,40,.10))}.ac-functions{filter:drop-shadow(0 6px 7px rgba(20,30,40,.08))}.ac-money{filter:drop-shadow(0 5px 6px rgba(20,30,40,.08))}\n@media(max-width:980px){.ac-layout{grid-template-columns:1fr}.ac-presentation-card{position:static}.ac-scene{min-height:430px}}\n@media(max-width:620px){.ac-scene{min-height:340px;padding:6px 8px}.ac-presentation-card{padding:17px}.ac-presentation-card .si-presentation-focus{font-size:21px}.ac-caption{align-items:flex-start;flex-direction:column;gap:4px}}\n'''
c += add
css.write_text(c)

# version and sw
av=base/'src/app-version.js'; a=av.read_text().replace('v1.5.3','v1.6.0'); av.write_text(a)
sw=base/'sw.js'; w=sw.read_text().replace('insurance-hub-v90.58.9','insurance-hub-v90.58.10'); sw.write_text(w)
# notes
notes=base/'CATATAN-PERUBAHAN-ZIP1.md'; n=notes.read_text(); n+='''\n\n## v1.6.0 — Sales Idea 05: Asset Creation\n- Menambahkan Sales Idea 05 “Asset Creation” sebagai presentation mode full-screen.\n- Alur 6 langkah: 3 fungsi asuransi → target aset Rp5 M → opsi DP 30%/≈Rp27 jt → opsi tanpa DP/≈Rp39,5 jt → konsep asset creation/≈Rp6 jt → aset Rp5 M sebagai warisan.\n- Angka cicilan ditandai sebagai contoh dari materi; langkah asset creation diberi catatan bahwa mekanismenya berbeda dan bukan simulasi KPR dengan asumsi yang sama.\n- Tetap menggunakan visual + inti pesan tanpa script dialog agen/prospek.\n- App version: v1.6.0; service-worker cache version: insurance-hub-v90.58.10.\n'''; notes.write_text(n)
