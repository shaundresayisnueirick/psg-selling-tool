#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadPlaywright() {
  for (const item of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright')]) {
    try { return require(item); } catch (_) {}
  }
  console.error('Playwright tidak tersedia; targeted browser test tidak dijalankan.');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const mime = { html: 'text/html; charset=utf-8', js: 'application/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let target = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
  if (target.endsWith('/')) target += 'index.html';
  const file = path.resolve(root, '.' + target);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

async function main() {
  const { chromium } = loadPlaywright();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const edge = process.argv.find((arg, i, all) => all[i - 1] === '--browser');
  const browser = await chromium.launch(edge ? { executablePath: edge } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Jakarta' });
  const failures = [], errors = [];
  let checks = 0;
  const check = (ok, label, detail) => {
    checks++;
    console.log((ok ? 'PASS ' : 'FAIL ') + checks + '. ' + label.replace(/^\d+\.\s*/, '') + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
    if (!ok) failures.push(label);
  };
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    const ali = { id: 'ali-id', nama: 'Ali', tglLahir: '1984-08-06', jk: 'PRIA', status: 'Menikah', pekerjaan: 'Guru', penghasilan: 12000000,
      hp: '081234567890', pasangan: 'Sari', anak: 1, catatan: 'Catatan Ali', snapshot: { pengeluaran: 3000000, pensiun: {rutin:4000000} },
      children: [{id:'anak-1',nama:'Dina',tglLahir:'2012-04-03',jk:'WANITA',biayaPendidikanHariIni:1000000}],
      family: [{id:'self',nama:'Ali',tglLahir:'1984-08-06',jk:'PRIA',hubungan:'Diri Sendiri'}, {id:'spouse',nama:'Sari',tglLahir:'1985-01-02',jk:'WANITA',hubungan:'Istri'},
        {id:'child-0',nama:'Dina',tglLahir:'2012-04-03',jk:'WANITA',hubungan:'Anak'}, {id:'rel-1',nama:'Budi',tglLahir:'1950-01-01',jk:'PRIA',hubungan:'Ayah'}], createdAt:now, updatedAt:now };
    localStorage.setItem('insuranceHub.customerProfiles.v1', JSON.stringify([ali]));
    localStorage.setItem('insuranceHub.customerProfile.active.v1', ali.id);
    sessionStorage.setItem('insuranceHub.access.v3', 'ok');
  });
  try {
    await page.clock.setFixedTime(new Date('2026-10-09T10:00:00+07:00'));
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
    const form = () => page.evaluate(() => ({ name: document.querySelector('#cpNama').value, date: document.querySelector('#cpTgl').value,
      dateText: document.querySelector('#cpTglManual').value, edit: document.querySelector('#cpStatusBar').dataset.editId || '',
      save: document.querySelector('#cpSimpan').textContent.trim(), reset: document.querySelector('#cpReset').textContent.trim(),
      spouse: document.querySelector('#cpPasangan').value, childRows: document.querySelectorAll('#cpAnakList [data-child-row]').length }));
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1')));
    const storedAli = () => page.evaluate(() => JSON.parse(localStorage.getItem('insuranceHub.customerProfiles.v1')).find(p => p.id === 'ali-id'));
    const blank = state => !state.name && !state.date && !state.dateText && !state.edit && state.save === 'Simpan profil' && state.reset === 'Kosongkan form';

    await page.evaluate(() => window.bukaLayar('PROFILE'));
    check(blank(await form()), '1. buka Profil menampilkan form kosong');
    const initialDateUX = await page.evaluate(() => {
      const text = document.querySelector('#cpTglManual'), picker = document.querySelector('#cpTglPicker');
      const indicator = getComputedStyle(picker, '::-webkit-calendar-picker-indicator');
      return { placeholder: text.placeholder, value: text.value, marker: picker.getAttribute('data-kosong'),
        overlay: getComputedStyle(picker, '::before').content, indicatorOpacity: indicator.opacity,
        lightFilter: indicator.filter };
    });
    check(initialDateUX.placeholder === 'DD/MM/YYYY' && initialDateUX.value === '', '25. placeholder hanya tampil sebagai placeholder input teks', initialDateUX);
    check(initialDateUX.marker !== null && initialDateUX.overlay === 'none', '26. input date kosong tidak lagi menggambar overlay placeholder di atas ikon', initialDateUX);
    check(Number(initialDateUX.indicatorOpacity) > 0 && initialDateUX.lightFilter === 'none', '27. ikon kalender native terlihat pada light mode', initialDateUX);
    const darkIndicator = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const iconRule = [...document.styleSheets].flatMap(sheet => [...sheet.cssRules])
        .find(rule => rule.selectorText === '[data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator');
      const indicator = getComputedStyle(document.querySelector('#cpTglPicker'), '::-webkit-calendar-picker-indicator');
      return { theme: document.documentElement.getAttribute('data-theme'), opacity: indicator.opacity, filter: iconRule?.style.filter || '' };
    });
    check(darkIndicator.theme === 'dark' && Number(darkIndicator.opacity) > 0 && darkIndicator.filter === 'invert(1)', '28. ikon kalender native tetap terlihat dan mengikuti dark mode', darkIndicator);
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    await page.locator('[data-cp-edit="ali-id"]').click();
    let state = await form();
    check(state.name === 'Ali' && state.date === '1984-08-06' && state.dateText === '06/08/1984', '2. Edit Ali memuat data dan tanggal tampil DD/MM/YYYY', state);
    check(state.save === 'Simpan perubahan' && state.reset === 'Batal edit', '3. tombol berubah ke mode edit');
    const initialAli = await storedAli();
    await page.locator('#cpReset').click();
    state = await form();
    check(blank(state), '4. Batal Edit mengosongkan form dan mengakhiri mode edit', state);
    check(JSON.stringify(await storedAli()) === JSON.stringify(initialAli), '5. Batal Edit tidak mengubah data Ali tersimpan');
    check((await page.locator('#cpStatusBar').textContent()).includes('Data tersimpan tetap tidak berubah'), '6. status membenarkan data tersimpan tetap');

    await page.locator('[data-cp-edit="ali-id"]').click();
    await page.locator('#cpNama').fill('Ali Baru');
    await page.locator('#cpSimpan').click();
    await page.waitForTimeout(100);
    const updatedAli = await storedAli();
    check(updatedAli.nama === 'Ali Baru' && updatedAli.id === 'ali-id', '7. Simpan perubahan memperbarui record Ali yang sama');
    check(blank(await form()), '8. sesudah save, form kosong dan tombol kembali ke Simpan Profil');
    check(updatedAli.children[0].nama === 'Dina' && updatedAli.family.some(x => x.nama === 'Sari') && updatedAli.family.some(x => x.nama === 'Budi'), '9. family tersimpan tetap utuh setelah edit/save');
    check(await page.evaluate(() => localStorage.getItem('insuranceHub.customerProfile.active.v1')) === 'ali-id', '10. profile aktif tidak hilang setelah save');
    await page.evaluate(() => window.bukaLayar('PRODUK'));
    await page.evaluate(() => window.bukaLayar('PROFILE'));
    check(blank(await form()), '11. keluar layar dan masuk kembali membuka form kosong');
    check((await page.locator('#cpDaftar').innerText()).includes('Ali Baru'), '12. daftar tetap menampilkan profil tersimpan yang terbaru');
    await page.locator('[data-cp-use="ali-id"]').click();
    await page.waitForTimeout(80);
    check(await page.evaluate(() => localStorage.getItem('insuranceHub.customerProfile.active.v1')) === 'ali-id', '13. Gunakan di semua kalkulator menetapkan profile aktif');
    check(await page.locator('#fNama').inputValue() === 'Ali Baru', '14. kalkulator menerima data dari profile aktif');
    await page.evaluate(() => window.bukaLayar('PROFILE'));
    check(blank(await form()), '15. profile aktif tidak otomatis mengisi form Profil');

    await page.locator('#cpNama').fill('Tanggal Uji');
    const manual = page.locator('#cpTglManual');
    await manual.click();
    await manual.pressSequentially('0');
    check(await manual.inputValue() === '0', '29. satu digit awal tetap apa adanya');
    await manual.pressSequentially('6');
    check(await manual.inputValue() === '06/', '30. slash otomatis ditambahkan setelah dua digit hari');
    await manual.pressSequentially('0');
    check(await manual.inputValue() === '06/0', '31. input bulan berlanjut setelah slash otomatis');
    await manual.pressSequentially('8');
    check(await manual.inputValue() === '06/08/', '32. slash otomatis ditambahkan setelah dua digit bulan');
    await manual.pressSequentially('1984');
    check(await manual.inputValue() === '06/08/1984', '33. tahun berhenti pada empat digit');
    await manual.pressSequentially('5');
    check(await manual.inputValue() === '06/08/1984', 'tahun tidak menerima digit kelima');
    await manual.press('/');
    check(await manual.inputValue() === '06/08/1984', '34. mengetik slash manual tidak menghasilkan slash ganda');
    await manual.fill('06/08/1984');
    await manual.evaluate(input => input.setSelectionRange(3, 3));
    await manual.press('Backspace');
    check(await manual.inputValue() === '0/08/1984', '35. Backspace di separator menghapus digit sebelumnya dengan segmen tanggal tetap');
    await manual.fill('06/08/1984');
    await manual.evaluate(input => input.setSelectionRange(2, 2));
    await manual.press('Delete');
    check(await manual.inputValue() === '06/8/1984', '36. Delete di separator menghapus digit berikutnya dengan segmen tanggal tetap');
    await manual.fill('06/08/1984');
    await manual.evaluate(input => input.setSelectionRange(1, 2));
    await manual.press('5');
    check(await manual.inputValue() === '05/08/1984', '37. edit digit di tengah tanggal mempertahankan posisi segmen');
    await page.locator('#cpTglManual').fill('06/08/1984');
    check(await page.locator('#cpTglManual').inputValue() === '06/08/1984', '38. paste tanggal DD/MM/YYYY tetap valid tanpa slash ganda');
    check(await page.locator('#cpTgl').inputValue() === '1984-08-06', '39. ketikan 06/08/1984 diparsing sebagai 6 Agustus (ISO 1984-08-06)');
    const expectedAge = await page.evaluate(() => ihUsiaGenerali('1984-08-06', new Date('2026-10-09T00:00:00Z')));
    check((await page.locator('#cpUsia').innerText()).includes(String(expectedAge)), '17. age display memakai engine usia Generali existing');
    await page.locator('#cpSimpan').click();
    check((await saved()).some(p => p.nama === 'Tanggal Uji' && p.tglLahir === '1984-08-06'), '18. tanggal ketik disimpan dalam schema ISO lama');
    check(blank(await form()), '19. simpan profil baru juga mengosongkan form');

    await page.evaluate(() => window.bukaLayar('PROFILE'));
    await page.locator('#cpNama').fill('Kalender Uji');
    await page.locator('#cpTglPicker').fill('1990-01-01');
    await page.locator('#cpTglPicker').dispatchEvent('change');
    check(await page.locator('#cpTgl').inputValue() === '1990-01-01' && await page.locator('#cpTglManual').inputValue() === '01/01/1990', '20. pemilih kalender tetap menyinkronkan tanggal ke field teks dan ISO');
    await page.locator('#cpSimpan').click();
    check((await saved()).some(p => p.nama === 'Kalender Uji' && p.tglLahir === '1990-01-01'), '21. tanggal dari kalender tersimpan dalam schema ISO lama');

    await page.evaluate(() => window.bukaLayar('PROFILE'));
    await page.locator('#cpNama').fill('Tanggal Invalid');
    for (const invalid of ['32/08/1984', '06/13/1984', '29/02/1983', '10/10/2030', '01/01/1900']) {
      await page.locator('#cpTglManual').fill(invalid);
      await page.locator('#cpTglManual').dispatchEvent('blur');
      check(await page.locator('#cpTgl').inputValue() === '' && await page.locator('#cpTglManual').getAttribute('aria-invalid') === 'true', `22. tanggal tidak valid ditolak: ${invalid}`);
    }
    await page.locator('#cpSimpan').click();
    check(!(await saved()).some(p => p.nama === 'Tanggal Invalid'), '23. profil tidak tersimpan dengan tanggal invalid');
    check(errors.length === 0, '24. tidak ada JavaScript error', errors);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n${checks - failures.length}/${checks} targeted checks PASS`);
  if (failures.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
