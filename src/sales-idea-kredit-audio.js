/* ============================================================
   Sales Idea — Proteksi Kredit: narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-MM" (scene NN, segmen MM) pada larik NARASI
   di src/sales-idea-kredit.js; teksnya = tools/narasi/NASKAH-BIAN-PROTEKSI-KREDIT.md.
   Satu segmen = satu berkas MP3 ElevenLabs (voice Bian) yang diputar
   utuh: start 0, end = durasi berkas (diukur dari decode Chromium).
   ============================================================ */
window.PSGKreditAudio = {
  versi: 'pks-bian-2026-10-13',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/kredit/',
  segmen: {
    'S01-01': [{ audio: 'kredit-S01-01.mp3', start: 0.000, end: 5.486 }],
    'S01-02': [{ audio: 'kredit-S01-02.mp3', start: 0.000, end: 8.673 }],
    'S01-03': [{ audio: 'kredit-S01-03.mp3', start: 0.000, end: 5.329 }],
    'S02-01': [{ audio: 'kredit-S02-01.mp3', start: 0.000, end: 7.889 }],
    'S02-02': [{ audio: 'kredit-S02-02.mp3', start: 0.000, end: 7.079 }],
    'S03-01': [{ audio: 'kredit-S03-01.mp3', start: 0.000, end: 6.191 }],
    'S03-02': [{ audio: 'kredit-S03-02.mp3', start: 0.000, end: 6.034 }],
    'S04-01': [{ audio: 'kredit-S04-01.mp3', start: 0.000, end: 4.833 }],
    'S04-02': [{ audio: 'kredit-S04-02.mp3', start: 0.000, end: 8.359 }],
    'S04-03': [{ audio: 'kredit-S04-03.mp3', start: 0.000, end: 7.471 }],
    'S05-01': [{ audio: 'kredit-S05-01.mp3', start: 0.000, end: 5.878 }],
    'S05-02': [{ audio: 'kredit-S05-02.mp3', start: 0.000, end: 8.673 }],
    'S05-03': [{ audio: 'kredit-S05-03.mp3', start: 0.000, end: 4.127 }],
    'S06-01': [{ audio: 'kredit-S06-01.mp3', start: 0.000, end: 7.967 }],
    'S07-01': [{ audio: 'kredit-S07-01.mp3', start: 0.000, end: 6.766 }],
    'S07-02': [{ audio: 'kredit-S07-02.mp3', start: 0.000, end: 10.762 }],
    'S08-01': [{ audio: 'kredit-S08-01.mp3', start: 0.000, end: 10.919 }],
    'S08-02': [{ audio: 'kredit-S08-02.mp3', start: 0.000, end: 13.636 }],
    'S08-03': [{ audio: 'kredit-S08-03.mp3', start: 0.000, end: 7.079 }],
    'S09-01': [{ audio: 'kredit-S09-01.mp3', start: 0.000, end: 13.949 }],
    'S09-02': [{ audio: 'kredit-S09-02.mp3', start: 0.000, end: 17.319 }],
    'S09-03': [{ audio: 'kredit-S09-03.mp3', start: 0.000, end: 18.521 }],
    'S10-01': [{ audio: 'kredit-S10-01.mp3', start: 0.000, end: 5.956 }],
    'S10-02': [{ audio: 'kredit-S10-02.mp3', start: 0.000, end: 3.474 }]
  }
};
