/* PSG Selling Tools - Netlify Forms feedback modal. No customer data is read. */
(function () {
  'use strict';
  const modal = document.getElementById('psgFeedbackModal');
  const form = document.getElementById('psgFeedbackForm');
  if (!modal || !form) return;

  const status = document.getElementById('psgFeedbackStatus');
  const submit = document.getElementById('psgFeedbackSubmit');
  let lastTrigger = null;
  let previousBodyOverflow = '';

  function open(trigger) {
    lastTrigger = trigger || document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    modal.hidden = false;
    status.hidden = true;
    status.textContent = '';
    status.classList.remove('is-success', 'is-error');
    document.body.style.overflow = 'hidden';
    const first = document.getElementById('psgFeedbackType');
    if (first) first.focus({ preventScroll: true });
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    if (lastTrigger && lastTrigger.isConnected && typeof lastTrigger.focus === 'function') {
      try { lastTrigger.focus({ preventScroll: true }); } catch (_) { lastTrigger.focus(); }
    }
  }

  function setStatus(message, type) {
    status.textContent = message;
    status.classList.remove('is-success', 'is-error');
    if (type) status.classList.add(type);
    status.hidden = false;
  }

  document.addEventListener('click', function (event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const opener = target.closest('[data-psg-feedback-open]');
    if (opener) {
      event.preventDefault();
      const sheet = document.getElementById('psgSheet');
      if (sheet) sheet.classList.remove('terbuka');
      open(opener);
      return;
    }
    if (target.closest('[data-psg-feedback-close]')) close();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) close();
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    submit.textContent = 'Mengirim...';
    setStatus('Sedang mengirim masukan ke tim PSG...', '');

    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      const response = await fetch(form.getAttribute('action') || '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });
      if (!response.ok) throw new Error('Form submission failed with status ' + response.status);
      form.reset();
      setStatus('Terima kasih. Masukan kamu berhasil dikirim ke tim PSG.', 'is-success');
    } catch (_) {
      setStatus('Masukan belum berhasil dikirim. Periksa koneksi internet lalu coba lagi.', 'is-error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Kirim masukan';
    }
  });

  window.PSGFeedback = { open: open, close: close };
})();