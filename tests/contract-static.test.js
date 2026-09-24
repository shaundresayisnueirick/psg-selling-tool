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

/* 1. Berkas JS dilindungi */
for (const [f, h] of Object.entries(base.protectedFiles)) {
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
console.log('CONTRACT STATIC: LULUS — ' + checks + ' pemeriksaan, ' +
  Object.keys(base.protectedFiles).length + ' berkas JS identik, ' +
  base.pages['index.html'].ids.length + ' ID, ' + base.storageKeys.length + ' storage key.');
