#!/usr/bin/env node
/* Membuat bagian STATIS tests/contract-baseline.json dari sebuah salinan
   aplikasi yang dianggap benar (baseline produksi).

     node tests/build-baseline.js <root-baseline>

   Bagian RUNTIME ditambahkan oleh:
     node tests/contract-browser.test.js --record --root <root-baseline>
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { snapshot } = require('./lib/snapshot');

const root = path.resolve(process.argv[2] || '.');
const out = path.join(__dirname, 'contract-baseline.json');
let prev = {};
try { prev = JSON.parse(fs.readFileSync(out, 'utf8')); } catch (_) {}
const data = { ...prev, generatedFrom: prev.generatedFrom || null, static: snapshot(root) };
fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
const s = data.static;
console.log('baseline statis ditulis:', path.relative(process.cwd(), out));
console.log(' file JS dilindungi:', Object.keys(s.protectedFiles).length,
  '| storage key:', s.storageKeys.length,
  '| ID index.html:', s.pages['index.html'].ids.length,
  '| script index.html:', s.pages['index.html'].externalScripts.length);
