#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

function playwright() {
  const paths = ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')];
  for (const p of paths) { try { return require(p); } catch (_) {} }
  console.error('Playwright tidak tersedia; targeted browser test tidak dijalankan.');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const types = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let name = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'content-type': types[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

async function main() {
  const { chromium } = playwright();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const edge = process.argv.find((arg, i, all) => all[i - 1] === '--browser');
  const browser = await chromium.launch(edge ? { executablePath: edge } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Jakarta' });
  const failures = [];
  let checks = 0;
  const check = (condition, message) => {
    checks++;
    console.log((condition ? 'PASS ' : 'FAIL ') + message);
    if (!condition) failures.push(message);
  };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('insuranceHub.access.v3', 'ok'));
  await page.clock.setFixedTime(new Date('2026-09-24T10:00:00+07:00'));
  try {
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    await page.evaluate(() => window.bukaLayar('LF'));
    await page.locator('#fTgl').fill('1976-05-20');
    await page.waitForTimeout(250);

    const available = await page.locator('#relUsia .stasiun').evaluateAll(nodes => nodes
      .filter(node => !node.hidden && getComputedStyle(node).display !== 'none')
      .map(node => Number(node.id.slice(2))));
    const unavailable = await page.locator('#relUsia .stasiun').evaluateAll(nodes => nodes
      .filter(node => node.hidden || getComputedStyle(node).display === 'none')
      .map(node => Number(node.id.slice(2))));
    check(available.length > 0, 'kalkulator menampilkan usia tersedia dari hasil engine');
    check(unavailable.every(age => !available.includes(age)), 'usia unavailable tidak ditampilkan di kalkulator');
    check(unavailable.length > 0, 'scenario memuat minimal satu usia unavailable untuk menguji penyaringan');
    check(await page.locator('#relUsia .sakelar').first().textContent() === 'ON', 'pilihan aktif memakai label ON');

    await page.evaluate(() => window.bukaLayar('LF_RINGKAS'));
    await page.waitForTimeout(100);
    const expected = await page.locator('#cipUsia button:not([hidden])').count();
    check(expected === available.length, 'kontrol ringkasan hanya berisi usia yang tersedia');
    const summaryText = await page.locator('#relRingkas').innerText();
    check(unavailable.every(age => !summaryText.includes('USIA ' + age)), 'usia unavailable tidak muncul di ringkasan');
    if (available.length > 1) {
      const turnOff = available[1];
      const chip = page.locator('#cipUsia button[data-usia="' + turnOff + '"]');
      await chip.click();
      check((await chip.textContent()).includes('OFF'), 'toggle ringkasan berubah ke OFF');
      check(!(await page.locator('#relRingkas').innerText()).includes('USIA ' + turnOff), 'usia OFF hilang dari ringkasan');
      await page.emulateMedia({ media: 'print' });
      check(!(await page.locator('#relRingkas').innerText()).includes('USIA ' + turnOff), 'usia OFF tidak ada pada konten cetak');
      await page.emulateMedia({ media: 'screen' });
      const before = await page.locator('#relRingkas').innerText();
      await chip.click();
      check((await page.locator('#relRingkas').innerText()).includes('USIA ' + turnOff), 'toggle ON mengembalikan usia ke ringkasan');
      check(before !== await page.locator('#relRingkas').innerText(), 'ringkasan merespons perubahan toggle');
    } else {
      check(false, 'scenario harus menyediakan minimal dua usia untuk menguji toggle');
    }

    const waiver = await page.locator('#lfWaiverBlok').innerText();
    check(waiver.includes('Rider waiver pada BeSMART Lite Future bersifat wajib'), 'informasi waiver tampil sebagai manfaat');
    check(!waiver.includes('Premi waiver ditambahkan'), 'waiver tidak ditampilkan sebagai premi tambahan baru');
    const waiverCheck = await page.evaluate(age => {
      const inp = { nama: '', jk: nilaiSegmen('fJK'), tglLahir: new Date(el('fTgl').value + 'T00:00:00Z'),
        setoran: nilaiSegmen('fSetoran'), mpp: Number(el('fMPP').value), pensiunUP: Number(el('fUP').value),
        statusAgen: el('fAgen').value, customUP: kustom, pilih: pilihan };
      const result = hitung(inp, TARIF, META);
      const row = result.hasil.find(item => item.retAge === age);
      const annualBase = inp.setoran === 'Bulanan' ? row.premiDasar * 12 : row.premiDasar;
      const headerIndex = [...document.querySelectorAll('#lfWaiverBlok thead th')]
        .findIndex(cell => cell.textContent.includes('Pensiun ' + age));
      const displayed = document.querySelector('#lfWaiverBlok tbody tr td:nth-child(' + (headerIndex + 1) + ')');
      return { expected: annualBase * (inp.mpp - 1), displayed: displayed && displayed.textContent };
    }, available[0]);
    const displayedWaiver = Number(String(waiverCheck.displayed || '').replace(/\D/g, ''));
    check(displayedWaiver === waiverCheck.expected, 'nilai waiver memakai premi dasar dan masa bayar dari hasil engine');
    check(errors.length === 0, 'tidak ada JavaScript error: ' + (errors.join(' | ') || 'bersih'));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log('\n' + (failures.length ? 'FAIL' : 'PASS') + ': ' + (checks - failures.length) + '/' + checks + ' checks');
  if (failures.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  try { server.close(); } catch (_) {}
  process.exitCode = 1;
});
