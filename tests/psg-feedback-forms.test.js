'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('index.html');
const js = read('src/psg-feedback.js');
const css = read('src/psg-feedback.css');
const sw = read('sw.js');

assert.match(html, /<form id="psgFeedbackForm"[^>]*name="psg-feedback"[^>]*data-netlify="true"/s, 'Form HTML statis harus dikenali Netlify');
assert.match(html, /name="form-name" value="psg-feedback"/, 'Field form-name Netlify wajib ada');
assert.match(html, /netlify-honeypot="bot-field"/, 'Honeypot anti-spam wajib ada');
for (const field of ['kategori', 'area', 'perangkat', 'browser', 'email', 'pesan']) {
  assert.ok(html.includes('name="' + field + '"'), 'Field formulir hilang: ' + field);
}
assert.ok(html.includes('data-psg-feedback-open'), 'Tombol pembuka formulir harus ada');
assert.ok(html.includes('Usulan pengembangan fitur'), 'Label saran harus profesional');
assert.ok(html.includes('Laporkan kendala teknis'), 'Label laporan masalah harus jelas');
assert.ok(html.includes('M6 6l12 12M18 6L6 18'), 'Tombol tutup harus memakai ikon SVG');
assert.ok(html.includes('focusable="false"'), 'Ikon tutup harus disembunyikan dari pembaca layar');
assert.ok(!html.includes('aria-hidden="true">*</span>'), 'Tanda wajib tidak boleh terpisah di baris label');
assert.ok(html.includes('src/psg-feedback.js'), 'JavaScript formulir harus dimuat');
assert.ok(html.includes('src/psg-feedback.css'), 'CSS formulir harus dimuat');
assert.ok(html.lastIndexOf('src/cetak-besar.css') > html.lastIndexOf('src/psg-feedback.css'), 'cetak-besar.css harus tetap menjadi stylesheet terakhir');
assert.match(js, /new URLSearchParams\(new FormData\(form\)\)/, 'Form harus dikirim sebagai URL-encoded');
assert.match(js, /fetch\(/, 'Pengiriman harus menggunakan fetch');
assert.match(js, /is-success/, 'Status berhasil harus ditampilkan');
assert.match(js, /is-error/, 'Status gagal harus ditampilkan');
assert.doesNotMatch(js, /localStorage|sessionStorage|insuranceHub\.profil|cpNama/, 'Form tidak boleh membaca penyimpanan/data profil nasabah');
assert.match(css, /\.psg-feedback-modal\[hidden\]/, 'Modal harus dapat disembunyikan');
assert.match(sw, /insurance-hub-v117\.1\.18/, 'Versi cache PWA harus dinaikkan');
assert.ok(sw.includes("'./src/psg-feedback.js'"), 'JS baru harus masuk cache PWA');
assert.ok(sw.includes("'./src/psg-feedback.css'"), 'CSS baru harus masuk cache PWA');
console.log('PASS: PSG feedback form statis, honeypot, field, pengiriman, privasi, dan cache PWA terverifikasi.');