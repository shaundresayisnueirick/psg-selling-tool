/* UI Pusat Informasi PSG. Hak akses tetap diperiksa ulang oleh API. */
(function () {
  'use strict';
  var BASE = '/api/psg/informasi';
  var KATEGORI = ['Kontes Generali', 'Memo', 'Training', 'Pengumuman Agency'];
  var $ = function (id) { return document.getElementById(id); };
  var dialog = $('psgInformasiDialog');
  if (!dialog || dialog.dataset.siap) return;
  dialog.dataset.siap = '1';
  var listEl = $('psgInformasiList'), detailEl = $('psgInformasiDetail'), statusEl = $('psgInformasiStatus');
  var categoryEl = $('psgInformasiCategories'), adminEl = $('psgInformasiAdmin'), form = $('psgInformasiForm');
  var selectedCategory = '', items = [], selected = null, owner = false;
  var view = 'list', listScroll = 0; /* 'list' = daftar judul ringkas, 'detail' = isi satu informasi */
  var field = function (name) { return form.elements.namedItem(name); };
  var esc = function (s) { return String(s == null ? '' : s); };
  function request(url, options) {
    options = options || {};
    options.credentials = 'same-origin'; options.cache = 'no-store';
    options.headers = Object.assign({ 'X-PSG-Request': '1', Accept: 'application/json' }, options.headers || {});
    return fetch(url, options).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.message || ('Permintaan gagal (' + r.status + ').')); });
      return r;
    });
  }
  /* Badge angka pada lonceng: jumlah informasi Published yang belum dibaca akun
     ini. Dihitung dan disimpan server per akun (GET /belum-dibaca, POST /:id/dibaca). */
  var bell = $('btnPsgInformasi'), badgeEl = $('psgInformasiBadge'), unread = new Set();
  function renderBadge() {
    var n = unread.size;
    if (badgeEl) { badgeEl.hidden = n === 0; badgeEl.textContent = n > 99 ? '99+' : String(n); }
    if (bell) bell.setAttribute('aria-label', 'Buka Pusat Informasi PSG' + (n ? ', ' + n + ' belum dibaca' : ''));
  }
  function setUnread(data) { unread = new Set(data && Array.isArray(data.ids) ? data.ids : []); renderBadge(); }
  function loadUnread() {
    var identity = window.InsuranceHubIdentity;
    if (!(identity && identity.source === 'server:/api/psg/me')) { setUnread(null); return; }
    request(BASE + '/belum-dibaca').then(function (r) { return r.json(); }).then(setUnread).catch(function () {});
  }
  function markRead(item) {
    if (!item || item.status !== 'published' || !unread.has(item.id)) return;
    unread.delete(item.id); renderBadge(); renderList();
    request(BASE + '/' + item.id + '/dibaca', { method: 'POST' }).then(function (r) { return r.json(); }).then(setUnread)
      .catch(function () { unread.add(item.id); renderBadge(); renderList(); });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function infoStatus(message, bad) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('gagal', Boolean(bad));
  }
  function buildCategories() {
    categoryEl.textContent = '';
    [['', 'Semua'], ...KATEGORI.map(function (x) { return [x, x]; })].forEach(function (x) {
      var b = el('button', '', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(selectedCategory === x[0]));
      b.addEventListener('click', function () { selectedCategory = x[0]; buildCategories(); loadItems(); });
      categoryEl.appendChild(b);
    });
  }
  function tanggal(t) {
    if (!t) return '';
    var d = new Date(t + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? t : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }
  /* Daftar dan detail bergantian dalam dialog yang sama (tanpa modal bertumpuk). */
  function setView(v) {
    view = v;
    listEl.hidden = v === 'detail'; categoryEl.hidden = v === 'detail';
    detailEl.hidden = v !== 'detail';
    var panel = dialog.querySelector('.psg-informasi-panel');
    if (v === 'list') { listEl.scrollTop = listScroll; } else if (panel) { panel.scrollTop = 0; }
  }
  function kembaliKeDaftar() {
    var id = selected && selected.id;
    setView('list'); renderList();
    listEl.scrollTop = listScroll;
    var btn = id && Array.prototype.find.call(listEl.children, function (b) { return b.dataset && b.dataset.id === id; });
    if (btn) btn.focus({ preventScroll: true });
  }
  function renderList() {
    listEl.textContent = '';
    if (!items.length) { listEl.appendChild(el('p', '', 'Belum ada informasi pada kategori ini.')); selected = null; setView('list'); return; }
    items.forEach(function (item) {
      var b = el('button', 'psg-informasi-item'); b.type = 'button'; b.dataset.id = item.id; b.setAttribute('aria-current', String(selected && selected.id === item.id));
      var baru = item.status === 'published' && unread.has(item.id);
      if (baru) b.classList.add('belum-dibaca');
      b.setAttribute('aria-label', 'Buka pengumuman: ' + item.judul);
      b.appendChild(el('b', '', (baru ? 'Baru · ' : '') + item.judul));
      b.appendChild(el('span', '', item.kategori + ' · ' + tanggal(item.tanggal) + (owner ? ' · ' + item.status : '')));
      b.addEventListener('click', function () { listScroll = listEl.scrollTop; showDetail(item); markRead(item); });
      listEl.appendChild(b);
    });
    var saatIni = view === 'detail' && selected && items.find(function (x) { return x.id === selected.id; });
    if (saatIni) { showDetail(saatIni); return; }
    selected = null; setView('list');
  }
  function showDetail(item) {
    selected = item; detailEl.textContent = '';
    var kembali = el('button', 'pi-button pi-secondary psg-informasi-back', '← Kembali ke daftar pengumuman'); kembali.type = 'button';
    kembali.addEventListener('click', kembaliKeDaftar); detailEl.appendChild(kembali);
    detailEl.appendChild(el('h3', '', item.judul));
    detailEl.appendChild(el('p', 'pi-meta', item.kategori + ' · ' + tanggal(item.tanggal) + (owner ? ' · ' + item.status : '')));
    detailEl.appendChild(el('div', 'pi-body', item.isi));
    if (item.lampiran && item.lampiran.length) {
      var files = el('div', 'psg-informasi-files'); files.appendChild(el('b', '', 'Lampiran'));
      item.lampiran.forEach(function (f) {
        var row = el('div');
        var open = el('a', '', f.nama); open.href = BASE + '/' + item.id + '/lampiran/' + f.id; open.target = '_blank'; open.rel = 'noopener'; open.setAttribute('aria-label', 'Buka ' + f.nama);
        var download = el('a', '', 'Unduh'); download.href = open.href + '?download=1'; download.setAttribute('download', f.nama); download.style.marginLeft = '12px';
        row.append(open, download); files.appendChild(row);
      });
      detailEl.appendChild(files);
    }
    if (owner) {
      var edit = el('button', 'pi-button pi-secondary', 'Edit informasi'); edit.type = 'button'; edit.style.marginTop = '16px';
      edit.addEventListener('click', function () { editItem(item); }); detailEl.appendChild(edit);
    }
    Array.prototype.forEach.call(listEl.children, function (b) { if (b.dataset) b.setAttribute('aria-current', String(b.dataset.id === item.id)); });
    setView('detail');
  }
  function loadItems() {
    infoStatus('Memuat informasi…');
    var q = owner ? '?admin=1' : '';
    if (selectedCategory) q += (q ? '&' : '?') + 'kategori=' + encodeURIComponent(selectedCategory);
    request(BASE + q).then(function (r) { return r.json(); }).then(function (data) {
      items = Array.isArray(data.informasi) ? data.informasi : [];
      infoStatus(items.length ? '' : 'Belum ada informasi yang diterbitkan.'); renderList();
    }).catch(function (e) { items = []; renderList(); infoStatus(e.message, true); });
  }
  function defaultTanggal() { var d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
  function resetForm() {
    form.reset(); field('id').value = ''; field('tanggal').value = defaultTanggal(); field('status').value = 'draft';
    $('psgInformasiFormTitle').textContent = 'Informasi baru'; $('psgInformasiExistingFiles').textContent = '';
  }
  function fillCategorySelect() {
    var select = field('kategori'); select.textContent = '';
    KATEGORI.forEach(function (k) { var o = el('option', '', k); o.value = k; select.appendChild(o); });
  }
  function editItem(item) {
    field('id').value = item.id; field('judul').value = item.judul; field('kategori').value = item.kategori;
    field('tanggal').value = item.tanggal; field('isi').value = item.isi; field('status').value = item.status;
    $('psgInformasiFormTitle').textContent = 'Edit informasi';
    var files = $('psgInformasiExistingFiles'); files.textContent = '';
    (item.lampiran || []).forEach(function (f) {
      var row = el('div');
      var a = el('a', '', f.nama); a.href = BASE + '/' + item.id + '/lampiran/' + f.id; a.target = '_blank'; a.rel = 'noopener'; row.appendChild(a);
      var remove = el('button', '', 'Hapus lampiran'); remove.type = 'button'; remove.addEventListener('click', function () {
        request(a.href, { method: 'DELETE', headers: { 'X-PSG-Request': '1' } }).then(function () { return loadItems(); }).then(function () { var current = items.find(function (x) { return x.id === item.id; }); if (current) editItem(current); }).catch(function (e) { infoStatus(e.message, true); });
      }); row.appendChild(remove); files.appendChild(row);
    });
    $('psgInformasiFormTitle').scrollIntoView({ block: 'nearest' });
  }
  function refreshOwner() {
    var identity = window.InsuranceHubIdentity;
    owner = Boolean(identity && identity.source === 'server:/api/psg/me' && Array.isArray(identity.roles) && identity.roles.includes('psg_owner'));
    adminEl.hidden = !owner;
  }
  function openDialog() {
    if (!dialog.open) dialog.showModal();
    selected = null; listScroll = 0; view = 'list';
    refreshOwner();
    buildCategories(); fillCategorySelect(); resetForm(); loadItems();
  }
  $('btnPsgInformasi').addEventListener('click', openDialog);
  dialog.addEventListener('click', function (e) { if (e.target === dialog || e.target.closest('[data-pi-close]')) dialog.close(); });
  $('psgInformasiNew').addEventListener('click', function () { resetForm(); form.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  $('psgInformasiCancel').addEventListener('click', resetForm);
  form.addEventListener('submit', function (e) {
    e.preventDefault(); if (!owner) { infoStatus('Hanya PSG Owner yang dapat mengelola informasi.', true); return; }
    var id = field('id').value;
    var tombol = form.querySelector('button[type="submit"]');
    var tombolTeks = tombol ? tombol.textContent : '';
    if (tombol) { if (tombol.disabled) return; tombol.disabled = true; tombol.textContent = 'Menyimpan…'; }
    infoStatus('Menyimpan informasi…');
    var body = { judul: field('judul').value, kategori: field('kategori').value, tanggal: field('tanggal').value, isi: field('isi').value, status: field('status').value };
    var url = id ? BASE + '/' + id : BASE;
    var tersimpan = false;
    request(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'X-PSG-Request': '1' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).then(function (result) {
        id = result.informasi.id; tersimpan = true;
        var file = field('file').files && field('file').files[0];
        if (!file) return null;
        var data = new FormData(); data.append('file', file);
        return request(BASE + '/' + id + '/lampiran', { method: 'POST', body: data });
      }).then(function () { infoStatus('Informasi berhasil disimpan.'); selected = null; resetForm(); loadItems(); loadUnread(); })
      .catch(function (err) {
        infoStatus((tersimpan ? 'Informasi tersimpan, tetapi lampiran gagal diunggah: ' : 'Informasi belum tersimpan: ') + (err && err.message || 'terjadi kesalahan.'), true);
        if (tersimpan) loadItems();
      })
      .then(function () {
        if (tombol) { tombol.disabled = false; tombol.textContent = tombolTeks; }
        if (statusEl.scrollIntoView) statusEl.scrollIntoView({ block: 'nearest' });
      });
  });
  dialog.addEventListener('close', function () { selected = null; view = 'list'; listScroll = 0; loadUnread(); });
  window.addEventListener('psg:identity-ready', function () { loadUnread(); if (dialog.open) { refreshOwner(); loadItems(); } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadUnread(); });
  loadUnread();
})();
