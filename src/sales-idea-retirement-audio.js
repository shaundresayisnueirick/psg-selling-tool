/* ============================================================
   Sales Idea — Retirement Planning: narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-MM" (scene NN, segmen MM) pada larik NARASI
   di src/sales-idea-retirement.js; teksnya = tools/narasi/MASTER-SCRIPT-72.md.
   Satu segmen = satu berkas MP3 ElevenLabs (voice Bian) yang diputar
   utuh: start 0, end = durasi berkas (diukur dari decode Chromium).
   Mengganti audio satu segmen = mengganti berkas & end segmen itu saja.
   ============================================================ */
window.PSGRetirementAudio = {
  versi: 'ret-bian-2026-09-30',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/retirement/',
  segmen: {
    'S01-01': [{ audio: 'retirement-S01-01.mp3', start: 0.000, end: 20.271 }],
    'S02-01': [{ audio: 'retirement-S02-01.mp3', start: 0.000, end: 23.875 }],
    'S03-01': [{ audio: 'retirement-S03-01.mp3', start: 0.000, end: 17.946 }],
    'S04-01': [{ audio: 'retirement-S04-01.mp3', start: 0.000, end: 16.274 }],
    'S05-01': [{ audio: 'retirement-S05-01.mp3', start: 0.000, end: 27.794 }],
    'S06-01': [{ audio: 'retirement-S06-01.mp3', start: 0.000, end: 18.128 }]
  }
};
