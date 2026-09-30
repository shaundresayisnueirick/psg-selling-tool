/* ============================================================
   Sales Idea — Asset Creation: narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-MM" (scene NN, segmen MM) pada larik NARASI
   di src/sales-idea-asset.js; teksnya = tools/narasi/MASTER-SCRIPT-72.md.
   Satu segmen = satu berkas MP3 ElevenLabs (voice Bian) yang diputar
   utuh: start 0, end = durasi berkas (diukur dari decode Chromium).
   Mengganti audio satu segmen = mengganti berkas & end segmen itu saja.
   ============================================================ */
window.PSGAssetAudio = {
  versi: 'acs-bian-2026-09-30',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/asset/',
  segmen: {
    'S01-01': [{ audio: 'asset-S01-01.mp3', start: 0.000, end: 3.395 }],
    'S01-02': [{ audio: 'asset-S01-02.mp3', start: 0.000, end: 4.911 }],
    'S01-03': [{ audio: 'asset-S01-03.mp3', start: 0.000, end: 7.079 }],
    'S02-01': [{ audio: 'asset-S02-01.mp3', start: 0.000, end: 5.955 }],
    'S02-02': [{ audio: 'asset-S02-02.mp3', start: 0.000, end: 4.832 }],
    'S03-01': [{ audio: 'asset-S03-01.mp3', start: 0.000, end: 7.888 }],
    'S03-02': [{ audio: 'asset-S03-02.mp3', start: 0.000, end: 10.527 }],
    'S04-01': [{ audio: 'asset-S04-01.mp3', start: 0.000, end: 6.034 }],
    'S04-02': [{ audio: 'asset-S04-02.mp3', start: 0.000, end: 8.202 }],
    'S05-01': [{ audio: 'asset-S05-01.mp3', start: 0.000, end: 8.751 }],
    'S05-02': [{ audio: 'asset-S05-02.mp3', start: 0.000, end: 9.168 }],
    'S05-03': [{ audio: 'asset-S05-03.mp3', start: 0.000, end: 7.627 }],
    'S06-01': [{ audio: 'asset-S06-01.mp3', start: 0.000, end: 9.639 }],
    'S06-02': [{ audio: 'asset-S06-02.mp3', start: 0.000, end: 4.440 }]
  }
};
