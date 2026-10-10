#!/usr/bin/env node
/* Regresi diskon rider Lite UP di mesin Kombinasi Produk.
   Jalankan: node tests/combo-bsl-lite-up-discount.test.js */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const helperMatch = app.match(/function comboBSLFaktorDiskonLiteUp\(totalUP\)\s*\{[\s\S]*?\n\}/);
assert(helperMatch, 'Fungsi faktor diskon Lite UP tidak ditemukan.');

const slotStart = app.indexOf('function comboSlot(inp, s, tarifSemua) {');
const slotEnd = app.indexOf('\n}\n\nfunction comboHitung', slotStart);
assert(slotStart >= 0 && slotEnd > slotStart, 'Fungsi comboSlot tidak ditemukan.');

const rates = require(path.join(root, 'src/data/bsl-lengkap.js')).TARIF_BSL_LENGKAP;
const context = { TARIF_BSL_LENGKAP: rates, COMBO_MIN_UP: 100000000 };
vm.runInNewContext(
  helperMatch[0] + '\n' + app.slice(slotStart, slotEnd + 2) +
  '\nthis.__comboSlot = comboSlot;',
  context
);

assert.strictEqual(context.comboBSLFaktorDiskonLiteUp(2499999999), 1,
  'Diskon tidak boleh berlaku di bawah total UP Rp2,5 miliar.');
assert.strictEqual(context.comboBSLFaktorDiskonLiteUp(2500000000), 0.75,
  'Diskon harus berlaku tepat pada total UP Rp2,5 miliar.');
assert.strictEqual(context.comboBSLFaktorDiskonLiteUp(12500000000), 0.75,
  'Diskon harus berlaku pada total UP Rp12,5 miliar.');

function hitung(up) {
  return context.__comboSlot(
    { usia: 47, jk: 'PRIA', metode: 'Tahunan', tglLahir: '1979-01-01' },
    { produk: 'BSL', lamaBayar: 5, lamaLindung: 100, up },
    {}
  );
}

const diBawahAmbang = hitung(2450000000);
assert.strictEqual(diBawahAmbang.sah, true);
assert.strictEqual(Math.round(diBawahAmbang.premiTahunan), 116397050,
  'Premi pada total UP Rp2,45 miliar harus memakai tarif Lite UP tanpa diskon.');

const tepatAmbang = hitung(2500000000);
assert.strictEqual(tepatAmbang.sah, true);
assert.strictEqual(Math.round(tepatAmbang.premiTahunan), 96508500,
  'Premi pada total UP Rp2,5 miliar harus menerapkan diskon 25% hanya ke Lite UP.');

const ilustrasiUSIN = hitung(12500000000);
assert.strictEqual(ilustrasiUSIN.sah, true);
assert.strictEqual(Math.round(ilustrasiUSIN.premiTahunan), 482542500,
  'Kasus USIN: BSL harus kembali menjadi Rp482.542.500 per tahun.');
assert.strictEqual(Math.round(ilustrasiUSIN.premiTahunan * 5), 2412712500,
  'Total BSL selama lima tahun harus menjadi Rp2.412.712.500.');

const genAmanTanpaWaiverPerTahun = 509183125;
assert.strictEqual(
  Math.round(ilustrasiUSIN.premiTahunan + genAmanTanpaWaiverPerTahun),
  991725625,
  'Total kombinasi USIN tanpa waiver harus menjadi Rp991.725.625 per tahun.'
);
assert.strictEqual(
  Math.round((ilustrasiUSIN.premiTahunan + genAmanTanpaWaiverPerTahun) * 5),
  4958628125,
  'Total kombinasi USIN selama lima tahun harus menjadi Rp4.958.628.125.'
);

console.log('COMBO BSL LITE UP DISCOUNT: LULUS — ambang Rp2,5 miliar, diskon rider saja, dan total kombinasi USIN cocok.');
