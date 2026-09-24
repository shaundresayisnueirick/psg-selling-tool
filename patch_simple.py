from pathlib import Path
base=Path('/mnt/data/retire_simple')
# app version
p=base/'src/app-version.js'; s=p.read_text().replace('v1.5.1','v1.5.2'); p.write_text(s)
# service worker
p=base/'sw.js'; s=p.read_text().replace('insurance-hub-v90.58.8','insurance-hub-v90.58.9'); p.write_text(s)
# add compact CSS
p=base/'src/styles.css'; s=p.read_text(); marker='/* SALES IDEA 04 — RETIREMENT PLANNING v1.5.1 */'
css='''\n/* SALES IDEA 04 — RETIREMENT PLANNING v1.5.2 — SIMPLIFIED PRESENTATION */\n.rp-simple-layout{grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:16px}\n.rp-simple-layout .rp-scene{min-height:500px;padding:10px 18px}\n.rp-simple-layout .rp-presentation-card{padding:20px}\n.rp-simple-layout .si-presentation-focus{font-size:23px;line-height:1.18}\n.rp-simple-layout .si-presentation-text{font-size:14px;line-height:1.55}\n.rp-scene .rptxt.big{font-size:23px;font-weight:950;fill:#a60101}\n.rp-scene .rptxt.money{font-size:40px;font-weight:950;fill:#a60101}\n.rp-scene .rptxt.title{font-size:16px;font-weight:900}\n.rp-scene .rptxt.label{font-size:12px;font-weight:850}\n.rp-scene .rptxt.sub{font-size:12px;fill:#667085}\n@media(max-width:980px){.rp-simple-layout{grid-template-columns:1fr}.rp-simple-layout .rp-scene{min-height:420px}}\n@media(max-width:620px){.rp-simple-layout .rp-scene{min-height:330px;padding:5px}.rp-simple-layout .rp-presentation-card{padding:16px}.rp-simple-layout .si-presentation-focus{font-size:21px}}\n'''
s=s+css; p.write_text(s)
# update header comment
p=base/'src/sales-idea.js'; s=p.read_text().replace('v1.5.1: 10 Jari + Keranjang Kehidupan + Education Planning + Retirement Planning','v1.5.2: 10 Jari + Keranjang Kehidupan + Education Planning + Retirement Planning'); p.write_text(s)
# notes
p=base/'CATATAN-PERUBAHAN-ZIP1.md'; s=p.read_text(); s += '''\n\n## v1.5.2 — Retirement Planning Simplified\n- Sales Idea 04 disederhanakan dari 10 menjadi 6 langkah utama agar lebih ringan saat dipresentasikan.\n- Fokus visual: 3 risiko → 25/55/85 → rasio mulai menabung → contoh kebutuhan aset → compounding → start early + protection.\n- Mengurangi teks dan elemen visual yang tidak esensial.\n- Tetap Presentation Mode: visual + inti pesan, tanpa script dialog agen/prospek.\n- App version: v1.5.2; service-worker cache version: insurance-hub-v90.58.9.\n'''; p.write_text(s)
