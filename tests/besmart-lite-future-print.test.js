#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadPlaywright() {
  for (const candidate of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) {
    try { return require(candidate); } catch (_) {}
  }
  console.error('Playwright tidak tersedia; targeted print test tidak dijalankan.');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const mime = { html:'text/html; charset=utf-8', js:'application/javascript', css:'text/css', json:'application/json', png:'image/png', svg:'image/svg+xml', webp:'image/webp' };
const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control':'no-store' });
  fs.createReadStream(file).pipe(res);
});

async function main() {
  const { chromium } = loadPlaywright();
  const browserPath = process.argv.find((arg, index, all) => all[index - 1] === '--browser');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(browserPath ? { executablePath:browserPath } : {});
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'Asia/Jakarta' });
  const failures = [];
  let checks = 0;
  const check = (ok, message) => {
    checks++;
    console.log((ok ? 'PASS ' : 'FAIL ') + message);
    if (!ok) failures.push(message);
  };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('insuranceHub.access.v3', 'ok');
    localStorage.setItem('insuranceHub.konsultan.v1', JSON.stringify({
      nama:'Erwin Effendi', jabatan:'Business Director', whatsapp:'082271139393', qr:'YA'
    }));
    localStorage.setItem('insuranceHub.agen.foto.v1', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ccircle cx="32" cy="32" r="32" fill="%233b7859"/%3E%3C/svg%3E');
  });
  await page.route('https://quickchart.io/qr?**', route => route.fulfill({
    status:200, contentType:'image/svg+xml',
    body:'<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="white"/><path fill="black" d="M8 8h48v48H8zM20 20v24h24V20zM124 8h48v48h-48zM136 20v24h24V20zM8 124h48v48H8zM20 136v24h24v-24zM72 8h12v12H72zM92 8h12v12H92zM72 28h12v12H72zM92 48h12v12H92zM68 72h12v12H68zM88 72h12v12H88zM108 72h12v12h-12zM128 72h12v12h-12zM148 72h12v12h-12zM68 92h12v12H68zM108 92h12v12h-12zM128 92h12v12h-12zM148 92h12v12h-12zM72 112h12v12H72zM92 112h12v12H92zM112 112h12v12h-12zM132 112h12v12h-12zM72 132h12v12H72zM92 152h12v12H92zM112 132h12v12h-12zM152 152h12v12h-12z"/></svg>'
  }));

  try {
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil:'load' });
    await page.evaluate(() => window.bukaLayar('LF'));
    await page.locator('#fNama').fill('Shaundre');
    await page.locator('#fTgl').fill('1984-12-31');
    await page.locator('#fAgenNama').fill('Erwin Effendi');
    await page.locator('#fAgenHP').fill('082271139393');
    await page.locator('#fMPP').selectOption('5');
    await page.locator('#fUP').selectOption('1000000000');
    await page.waitForTimeout(150);
    await page.evaluate(() => window.bukaLayar('LF_RINGKAS'));
    await page.waitForTimeout(100);

    const report = await page.evaluate(() => ({
      customer:document.querySelector('#identitas')?.innerText || '',
      selectedAges:[...document.querySelectorAll('#relRingkas .stasiun.ada .usia')].map(node => node.textContent.trim()),
      waiverRows:document.querySelectorAll('#lfWaiverBlok tbody tr').length,
      screenChartHeight:getComputedStyle(document.querySelector('#grafikPensiun .lf-chart-area')).height,
      disclaimer:document.querySelector('#sangkalan')?.textContent || ''
    }));
    check(report.customer.includes('Shaundre') && report.customer.includes('42 tahun'), 'skenario PDF sama: Shaundre, 42 tahun');
    check(report.selectedAges.join(',') === 'USIA 60,USIA 65,USIA 70,USIA 75', 'empat pilihan usia aktif sama seperti PDF contoh');
    check(report.waiverRows === 4, 'empat baris waiver tetap tersedia');
    check(report.disclaimer.length > 100, 'disclaimer sumber tetap utuh');
    check(report.screenChartHeight === '320px', 'tinggi grafik tampilan layar tidak berubah');

    await page.emulateMedia({ media:'print' });
    const printMetrics = await page.evaluate(() => {
      const area=document.querySelector('#grafikPensiun .lf-chart-area');
      const labels=[...document.querySelectorAll('#grafikPensiun .lf-chart-gridline span')];
      const lastLabel=labels[labels.length-1];
      const areaRect=area.getBoundingClientRect();
      const labelRect=lastLabel?.getBoundingClientRect();
      return {
        chartHeight:getComputedStyle(area).height,
        chartBlocksWhole:[...document.querySelectorAll('#layarRingkasan > .blok:has(> #grafikPensiun), #layarRingkasan > .blok:has(> #grafikJiwa)')].every(node => getComputedStyle(node).breakInside === 'avoid'),
        chartLabels:labels.map(n=>n.textContent.trim()),
        bottomLabelVisible:!!labelRect && labelRect.bottom <= areaRect.bottom + 1,
        waiverTableLayout:getComputedStyle(document.querySelector('#lfWaiverBlok table')).tableLayout,
        waiverWidth:document.querySelector('#lfWaiverBlok table').getBoundingClientRect().width,
        pageWidth:document.documentElement.clientWidth
      };
    });
    check(printMetrics.chartHeight === '190px', 'grafik dipadatkan khusus cetak tanpa mengecilkan teks label');
    check(printMetrics.chartBlocksWhole, 'setiap diagram dan judulnya dipertahankan sebagai satu blok cetak');
    check(printMetrics.bottomLabelVisible && printMetrics.chartLabels.length > 2, 'label sumbu bawah grafik tetap terlihat');
    check(printMetrics.waiverTableLayout === 'fixed' && printMetrics.waiverWidth <= printMetrics.pageWidth, 'tabel waiver tetap berada dalam lebar kertas');

    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    const printIdentity = await page.evaluate(() => ({
      photo:!!document.querySelector('.psg-consultant-print img.psg-consultant-photo'),
      qr:!!document.querySelector('.psg-consultant-print img.psg-consultant-qr'),
      wide:document.body.classList.contains('print-wide')
    }));
    check(printIdentity.photo && printIdentity.qr, 'foto agen dan QR tetap disertakan pada versi cetak');
    check(!printIdentity.wide, 'tabel waiver ini tidak memicu orientasi landscape');

    const pdf = await page.pdf({ format:'A4', printBackground:true, preferCSSPageSize:true });
    const pdfSource = pdf.toString('latin1');
    const pageCount = Number((pdfSource.match(/\/Count\s+(\d+)/) || [])[1] || 0);
    const mediaBox = pdfSource.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
    const portrait = !!mediaBox && Number(mediaBox[1]) < Number(mediaBox[2]);
    check(pageCount === 3, 'PDF runtime berjumlah 3 halaman A4 (sebelumnya 5)');
    check(portrait, 'PDF tetap portrait dan tidak beralih ke landscape');
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
