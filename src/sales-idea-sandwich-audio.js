/* ============================================================
   Sales Idea — Sandwich Generation: narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-01" (scene NN, satu segmen per scene) pada larik
   NARASI di src/sales-idea-sandwich.js; teksnya =
   docs/sales-idea-sandwich-generation-elevenlabs.md.
   Satu scene = satu berkas MP3 ElevenLabs (voice Bian) yang diputar utuh:
   start 0, end = durasi berkas (diukur dari decode Chromium).
   ============================================================ */
window.PSGSandwichAudio = {
  versi: 'sgw-bian-2026-10-14',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/sandwich/',
  segmen: {
    'S01-01': [{ audio: 'sandwich-S01-01.mp3', start: 0.000, end: 7.158 }],
    'S02-01': [{ audio: 'sandwich-S02-01.mp3', start: 0.000, end: 9.091 }],
    'S03-01': [{ audio: 'sandwich-S03-01.mp3', start: 0.000, end: 10.266 }],
    'S04-01': [{ audio: 'sandwich-S04-01.mp3', start: 0.000, end: 10.606 }],
    'S05-01': [{ audio: 'sandwich-S05-01.mp3', start: 0.000, end: 11.468 }],
    'S06-01': [{ audio: 'sandwich-S06-01.mp3', start: 0.000, end: 11.546 }],
    'S07-01': [{ audio: 'sandwich-S07-01.mp3', start: 0.000, end: 11.154 }],
    'S08-01': [{ audio: 'sandwich-S08-01.mp3', start: 0.000, end: 12.356 }]
  }
};
