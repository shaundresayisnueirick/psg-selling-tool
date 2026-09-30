/* ============================================================
   Sales Idea — 10 Jari (BAB 1–2): narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-MM" (scene NN, segmen MM) pada larik NARASI_JARI
   di src/sales-idea-jari.js; teksnya = tools/narasi/MASTER-SCRIPT-72.md.
   Satu segmen = satu berkas MP3 ElevenLabs (voice Bian) yang diputar
   utuh: start 0, end = durasi berkas (diukur dari decode Chromium).
   Mengganti audio satu segmen = mengganti berkas & end segmen itu saja.
   ============================================================ */
window.PSGJariAudio = {
  versi: 'jari-bian-2026-09-30',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/jari/',
  segmen: {
    'S01-01': [{ audio: 'jari-S01-01.mp3', start: 0.000, end: 6.112 }],
    'S01-02': [{ audio: 'jari-S01-02.mp3', start: 0.000, end: 6.112 }],
    'S01-03': [{ audio: 'jari-S01-03.mp3', start: 0.000, end: 9.404 }],
    'S01-04': [{ audio: 'jari-S01-04.mp3', start: 0.000, end: 12.747 }],
    'S01-05': [{ audio: 'jari-S01-05.mp3', start: 0.000, end: 6.269 }],
    'S01-06': [{ audio: 'jari-S01-06.mp3', start: 0.000, end: 10.605 }],
    'S01-07': [{ audio: 'jari-S01-07.mp3', start: 0.000, end: 10.266 }],
    'S02-01': [{ audio: 'jari-S02-01.mp3', start: 0.000, end: 10.997 }],
    'S03-01': [{ audio: 'jari-S03-01.mp3', start: 0.000, end: 13.479 }],
    'S04-01': [{ audio: 'jari-S04-01.mp3', start: 0.000, end: 13.244 }],
    'S05-01': [{ audio: 'jari-S05-01.mp3', start: 0.000, end: 14.445 }],
    'S06-01': [{ audio: 'jari-S06-01.mp3', start: 0.000, end: 7.079 }]
  }
};
