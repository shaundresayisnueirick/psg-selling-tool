/* Parser HTML minimal untuk contract test (tanpa dependensi).
   Cukup untuk tiga halaman statis aplikasi ini: isi <script> dan <style>
   dibuang dulu supaya string HTML di dalam JavaScript tidak terbaca sebagai
   tag sungguhan. */
'use strict';
const crypto = require('crypto');

const normalizeLineEndings = (s) => String(s).replace(/\r\n?/g, '\n');
const sha = (s) => crypto.createHash('sha256').update(normalizeLineEndings(s)).digest('hex');

function blocks(html, tag) {
  const out = [];
  const re = new RegExp('<' + tag + '\\b([^>]*)>([\\s\\S]*?)</' + tag + '>', 'gi');
  let m;
  while ((m = re.exec(html))) out.push({ attrs: parseAttrs(m[1]), body: m[2] });
  return out;
}

function stripCode(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.replace(/>[\s\S]*<\//, '></'))
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function parseAttrs(s) {
  const a = {};
  const re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(s || ''))) {
    a[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
  }
  return a;
}

/* Semua elemen pembuka beserta atributnya, berurutan. */
function elements(html) {
  const src = stripCode(html);
  const out = [];
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*?)?\s*\/?>/g;
  let m;
  while ((m = re.exec(src))) out.push({ tag: m[1].toLowerCase(), attrs: parseAttrs(m[2] || ''), index: m.index });
  return { src, list: out };
}

/* Tombol beserta teks polosnya (untuk hook teks cetak). */
function buttons(html) {
  const src = stripCode(html);
  const out = [];
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let m;
  while ((m = re.exec(src))) {
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    out.push({ attrs: parseAttrs(m[1]), text });
  }
  return out;
}

module.exports = { sha, normalizeLineEndings, blocks, elements, buttons, parseAttrs, stripCode };
