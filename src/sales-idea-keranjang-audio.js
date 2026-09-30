/* ============================================================
   Sales Idea — Keranjang Kehidupan: narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-MM" (scene NN, segmen MM) pada larik NARASI
   di src/sales-idea-keranjang.js; teksnya = tools/narasi/MASTER-SCRIPT-72.md.
   Satu segmen = satu berkas MP3 ElevenLabs (voice Bian) yang diputar
   utuh: start 0, end = durasi berkas (diukur dari decode Chromium).
   Mengganti audio satu segmen = mengganti berkas & end segmen itu saja.
   ============================================================ */
window.PSGKeranjangAudio = {
  versi: 'kbs-bian-2026-09-30',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/keranjang/',
  segmen: {
    'S01-01': [{ audio: 'keranjang-S01-01.mp3', start: 0.000, end: 10.840 }],
    'S02-01': [{ audio: 'keranjang-S02-01.mp3', start: 0.000, end: 12.930 }],
    'S03-01': [{ audio: 'keranjang-S03-01.mp3', start: 0.000, end: 12.669 }],
    'S04-01': [{ audio: 'keranjang-S04-01.mp3', start: 0.000, end: 11.546 }],
    'S05-01': [{ audio: 'keranjang-S05-01.mp3', start: 0.000, end: 11.885 }],
    'S06-01': [{ audio: 'keranjang-S06-01.mp3', start: 0.000, end: 12.591 }],
    'S07-01': [{ audio: 'keranjang-S07-01.mp3', start: 0.000, end: 12.120 }],
    'S08-01': [{ audio: 'keranjang-S08-01.mp3', start: 0.000, end: 12.512 }],
    'S09-01': [{ audio: 'keranjang-S09-01.mp3', start: 0.000, end: 13.635 }],
    'S10-01': [{ audio: 'keranjang-S10-01.mp3', start: 0.000, end: 14.602 }]
  }
};
