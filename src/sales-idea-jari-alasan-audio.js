/* ============================================================
   Sales Idea — 10 Jari (BAB 3: 3 alasan): narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-MM" (scene NN, segmen MM) pada larik NARASI_ALASAN
   di src/sales-idea-jari.js; teksnya = tools/narasi/MASTER-SCRIPT-72.md.
   Satu segmen = satu berkas MP3 ElevenLabs (voice Bian) yang diputar
   utuh: start 0, end = durasi berkas (diukur dari decode Chromium).
   Mengganti audio satu segmen = mengganti berkas & end segmen itu saja.
   ============================================================ */
window.PSGJariAlasanAudio = {
  versi: 'jal-bian-2026-09-30',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/jari-alasan/',
  segmen: {
    'S01-01': [{ audio: 'jari-alasan-S01-01.mp3', start: 0.000, end: 19.644 }],
    'S02-01': [{ audio: 'jari-alasan-S02-01.mp3', start: 0.000, end: 25.547 }],
    'S03-01': [{ audio: 'jari-alasan-S03-01.mp3', start: 0.000, end: 28.447 }]
  }
};
