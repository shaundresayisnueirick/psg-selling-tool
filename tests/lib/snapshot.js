/* Potret kontrak statis sebuah salinan aplikasi (direktori root).
   Dipakai build-baseline.js untuk membuat baseline, dan contract-static
   untuk membandingkan working tree dengan baseline itu. */
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('./html');

const PAGES = ['index.html', 'comparison-summary.html', 'program-summary.html'];
const PRINT_BTN_CLASSES = ['aksi', 'sakelar', 'secondary', 'sekunder'];
const PRINT_TEXT = /(cetak|print|simpan\s+(sebagai|ke)\s+pdf|pdf)/i;   // sama dengan src/preview-cetak.js

function walk(dir, base) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

function page(root, name) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const scripts = H.blocks(html, 'script');
  const { list } = H.elements(html);
  const ids = [];
  const idAttrs = {};
  const classTokens = new Set();
  const segments = {};
  for (const el of list) {
    const cls = (el.attrs.class || '').split(/\s+/).filter(Boolean);
    cls.forEach((c) => classTokens.add(c));
    if (el.attrs.id) {
      ids.push(el.attrs.id);
      const data = {};
      Object.keys(el.attrs).filter((k) => k.startsWith('data-') || k.startsWith('aria-') || k === 'type' || k === 'for' || k === 'name')
        .sort().forEach((k) => { data[k] = el.attrs[k]; });
      idAttrs[el.attrs.id] = { tag: el.tag, classes: cls.sort(), attrs: data };
    }
  }
  /* Segmen: kontainer .segmen dengan tombol data-nilai + aria-pressed. */
  const src = H.stripCode(html);
  const segRe = /<div\b([^>]*class="[^"]*\bsegmen\b[^"]*"[^>]*)>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = segRe.exec(src))) {
    const a = H.parseAttrs(m[1]);
    if (!a.id) continue;
    segments[a.id] = [...m[2].matchAll(/<button\b([^>]*)>/gi)].map((b) => {
      const ba = H.parseAttrs(b[1]);
      return [ba['data-nilai'], ba['aria-pressed']];
    });
  }
  const printButtons = H.buttons(html)
    .filter((b) => (b.attrs.class || '').split(/\s+/).some((c) => PRINT_BTN_CLASSES.includes(c)) && PRINT_TEXT.test(b.text))
    .map((b) => b.attrs.id || ('text:' + b.text));
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  return {
    inlineScripts: scripts.filter((s) => !s.attrs.src).map((s) => H.sha(s.body.trim())),
    externalScripts: scripts.filter((s) => s.attrs.src).map((s) => s.attrs.src),
    stylesheets: list.filter((e) => e.tag === 'link' && /stylesheet/i.test(e.attrs.rel || '')).map((e) => e.attrs.href),
    ids: [...new Set(ids)].sort(),
    duplicateIds: [...new Set(dup)],
    idAttrs,
    classTokens: [...classTokens].sort(),
    segments,
    printButtons: printButtons.sort(),
  };
}

function snapshot(root) {
  const files = walk(path.join(root, 'src'), root).filter((f) => f.endsWith('.js')).sort();
  const protectedFiles = {};
  for (const f of files) protectedFiles[f] = H.sha(fs.readFileSync(path.join(root, f)));
  const keys = new Set();
  for (const f of files.concat(PAGES)) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    for (const k of s.matchAll(/['"`](insuranceHub\.[A-Za-z0-9_.]+)['"`]/g)) keys.add(k[1]);
  }
  const pages = {};
  for (const p of PAGES) pages[p] = page(root, p);
  return { protectedFiles, storageKeys: [...keys].sort(), pages };
}

module.exports = { snapshot, PAGES, PRINT_TEXT };
