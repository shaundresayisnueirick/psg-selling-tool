#!/usr/bin/env node
/* Contract test statis — tanpa dependensi.

     node tests/contract-static.test.js [root]

   Memastikan redesign tidak menyentuh kontrak teknis aplikasi:
   - seluruh berkas JavaScript produksi identik byte per byte dengan baseline
     (engine, data tarif, rumus, navigasi, storage, print, Android bridge)
   - skrip inline di ketiga halaman identik dan urutannya sama
   - urutan 48 classic script tidak berubah (skrip baru hanya boleh ditambah)
   - cetak-besar.css tetap stylesheet terakhir
   - tidak ada ID, class legacy, atribut data- / aria- yang hilang atau berubah
   - segmen (data-nilai + aria-pressed awal) identik
   - tombol hook cetak (teks Cetak/Print/PDF) tetap ada
   - storage key tidak hilang
   - seluruh JS lolos pemeriksaan sintaks
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { snapshot } = require('./lib/snapshot');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'contract-baseline.json'), 'utf8')).static;
const cur = snapshot(root);
const fails = [];
const notes = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };
const isSubseq = (sub, arr) => { let i = 0; for (const x of arr) if (x === sub[i]) i++; return i === sub.length; };

/* Perubahan skrip inline yang disetujui. Setiap entri harus menyebut hash lama,
   hash baru, dan alasannya; selain entri ini skrip inline wajib identik. */
const INLINE_DIIZINKAN = {
  'program-summary.html': [{
    dari: 'a677e3718adabddb70d89776b699908b108cd7c3cccc030d915ac7e539819893',
    ke: 'dea75439026141f77a65c889ba7caab346a6f731707aa734c9963b76d1bc8666',
    alasan: 'Tabel Manfaat Gabungan dibungkus <table> bila isinya hanya <thead>/<tbody>/<tr> (sebelumnya tampil sebagai teks menyambung). Tidak menyentuh angka.',
  }],
};

/* Perubahan berkas JS dilindungi yang disetujui. Setiap entri menyebut hash
   lama, hash baru, dan alasannya; selain entri ini berkas JS wajib identik. */
const JS_DIIZINKAN = {
  'src/preview-cetak.js': [{
    dari: 'abe686a05ed724852a36ff89e964940514f9f719686b4e0fcd09e21fc3c92d29',
    ke: '5047860d6c7868c80548d215371e4c013c139185083ecc462033e47f1f8638a5',
    alasan: 'Pemecah tabel cetak memetakan sel menurut posisi kolom (colspan), bukan urutan DOM. Sebelumnya baris Total ber-colspan mendapat kolom lebih banyak dari judulnya: angka bertumpuk dan Total bergeser ke kolom yang salah. Tidak menyentuh nilai.',
  }],
  'src/sales-idea.js': [{
    dari: 'dfd143970d9e79bc8ec46687724748da98147b9ae78985619a71c83c7a0c747f',
    ke: 'c3926c2b1a9698e27557b919f34ff8f18d84e16ebd88914e2fe3236ba841b5e8',
    alasan: 'Sales Idea memakai pemutar interaktif (src/sales-idea-player.js): tiap langkah yang ada menjadi scene dengan Play/Pause/Replay/Next/Back. init() kini idempoten sehingga listener klik dokumen tidak lagi menumpuk tiap kali layar dibuka. Data, ID, kelas, dan API SalesIdea10Jari tidak berubah.',
  }],
};

/* 1. Berkas JS dilindungi */
for (const [f, h0] of Object.entries(base.protectedFiles)) {
  const z = (JS_DIIZINKAN[f] || []).find((x) => x.dari === h0);
  const h = z ? z.ke : h0;
  if (z) notes.push(f + ': diubah dengan izin — ' + z.alasan);
  ok(cur.protectedFiles[f] !== undefined, 'Berkas JS hilang: ' + f);
  if (cur.protectedFiles[f] !== undefined) ok(cur.protectedFiles[f] === h, 'Berkas JS berubah (dilarang): ' + f);
}
Object.keys(cur.protectedFiles).filter((f) => !base.protectedFiles[f]).forEach((f) => notes.push('JS baru: ' + f));

/* 2. Storage key */
for (const k of base.storageKeys) ok(cur.storageKeys.includes(k), 'Storage key hilang: ' + k);
cur.storageKeys.filter((k) => !base.storageKeys.includes(k)).forEach((k) => fails.push('Storage key BARU (tidak boleh): ' + k));

/* 3. Halaman */
for (const [name, b] of Object.entries(base.pages)) {
  const c = cur.pages[name];
  ok(!!c, 'Halaman hilang: ' + name);
  if (!c) continue;
  const izin = INLINE_DIIZINKAN[name] || [];
  const inlineBase = b.inlineScripts.map((h) => { const z = izin.find((x) => x.dari === h); return z ? z.ke : h; });
  izin.forEach((z) => notes.push(name + ': skrip inline diubah dengan izin — ' + z.alasan));
  ok(isSubseq(inlineBase, c.inlineScripts), name + ': skrip inline berubah/urutannya berubah');
  const extFiltered = c.externalScripts.filter((s) => b.externalScripts.includes(s));
  ok(JSON.stringify(extFiltered) === JSON.stringify(b.externalScripts), name + ': urutan classic script berubah');
  if (name === 'index.html') {
    const lastBase = c.externalScripts.lastIndexOf(b.externalScripts[b.externalScripts.length - 1]);
    const extra = c.externalScripts.filter((s) => !b.externalScripts.includes(s));
    extra.forEach((s) => ok(c.externalScripts.indexOf(s) > lastBase, name + ': skrip baru harus sesudah skrip baseline terakhir: ' + s));
  }
  b.stylesheets.forEach((s) => ok(c.stylesheets.includes(s), name + ': stylesheet hilang: ' + s));
  if (b.stylesheets[b.stylesheets.length - 1] === 'src/cetak-besar.css') {
    ok(c.stylesheets[c.stylesheets.length - 1] === 'src/cetak-besar.css', name + ': cetak-besar.css harus stylesheet terakhir');
  }
  ok(c.duplicateIds.length === 0, name + ': ID ganda: ' + c.duplicateIds.join(', '));
  for (const id of b.ids) ok(c.ids.includes(id), name + ': ID hilang: #' + id);
  for (const [id, a] of Object.entries(b.idAttrs)) {
    const ca = c.idAttrs[id];
    if (!ca) continue;
    ok(ca.tag === a.tag, name + ': tag #' + id + ' berubah ' + a.tag + ' -> ' + ca.tag);
    a.classes.forEach((cl) => ok(ca.classes.includes(cl), name + ': class legacy hilang pada #' + id + ': .' + cl));
    for (const [k, v] of Object.entries(a.attrs)) ok(ca.attrs[k] === v, name + ': atribut ' + k + ' pada #' + id + ' berubah');
  }
  for (const cl of b.classTokens) ok(c.classTokens.includes(cl), name + ': class legacy hilang: .' + cl);
  for (const [id, seg] of Object.entries(b.segments)) {
    ok(JSON.stringify(c.segments[id]) === JSON.stringify(seg), name + ': segmen #' + id + ' berubah (data-nilai/aria-pressed)');
  }
  for (const p of b.printButtons) ok(c.printButtons.includes(p), name + ': hook tombol cetak hilang: ' + p);
}

/* 4. Sintaks seluruh JS */
for (const f of Object.keys(cur.protectedFiles)) {
  try { new vm.Script(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }); checks++; }
  catch (e) { fails.push('Sintaks JS gagal: ' + f + ' — ' + e.message); }
}

notes.forEach((n) => console.log('  catatan: ' + n));
if (fails.length) {
  console.log('\nCONTRACT STATIC: GAGAL (' + fails.length + ' dari ' + checks + ' pemeriksaan)');
  fails.slice(0, 80).forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
const jsIzin = Object.keys(base.protectedFiles).filter((f) => (JS_DIIZINKAN[f] || []).some((x) => x.dari === base.protectedFiles[f])).length;
console.log('CONTRACT STATIC: LULUS — ' + checks + ' pemeriksaan, ' +
  (Object.keys(base.protectedFiles).length - jsIzin) + ' berkas JS identik' + (jsIzin ? ' + ' + jsIzin + ' diubah dengan izin' : '') + ', ' +
  base.pages['index.html'].ids.length + ' ID, ' + base.storageKeys.length + ' storage key.');
