/* ============================================================
   Sales Idea — Education Planning: narasi rekaman (voice Bian)
   ------------------------------------------------------------
   Kunci = segmen PWA "SNN-MM" (scene NN, segmen MM) pada larik NARASI
   di src/sales-idea-education.js; teksnya = tools/narasi/MASTER-SCRIPT-72.md.
   Satu segmen = satu berkas MP3 ElevenLabs (voice Bian) yang diputar
   utuh: start 0, end = durasi berkas (diukur dari decode Chromium).
   Mengganti audio satu segmen = mengganti berkas & end segmen itu saja.
   ============================================================ */
window.PSGEducationAudio = {
  versi: 'edu-bian-2026-09-30',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/education/',
  segmen: {
    'S01-01': [{ audio: 'education-S01-01.mp3', start: 0.000, end: 4.754 }],
    'S01-02': [{ audio: 'education-S01-02.mp3', start: 0.000, end: 7.157 }],
    'S01-03': [{ audio: 'education-S01-03.mp3', start: 0.000, end: 4.362 }],
    'S02-01': [{ audio: 'education-S02-01.mp3', start: 0.000, end: 1.880 }],
    'S02-02': [{ audio: 'education-S02-02.mp3', start: 0.000, end: 3.552 }],
    'S02-03': [{ audio: 'education-S02-03.mp3', start: 0.000, end: 9.404 }],
    'S03-01': [{ audio: 'education-S03-01.mp3', start: 0.000, end: 5.564 }],
    'S03-02': [{ audio: 'education-S03-02.mp3', start: 0.000, end: 6.347 }],
    'S03-03': [{ audio: 'education-S03-03.mp3', start: 0.000, end: 5.799 }],
    'S04-01': [{ audio: 'education-S04-01.mp3', start: 0.000, end: 4.832 }],
    'S04-02': [{ audio: 'education-S04-02.mp3', start: 0.000, end: 9.795 }],
    'S05-01': [{ audio: 'education-S05-01.mp3', start: 0.000, end: 4.127 }],
    'S05-02': [{ audio: 'education-S05-02.mp3', start: 0.000, end: 6.687 }],
    'S05-03': [{ audio: 'education-S05-03.mp3', start: 0.000, end: 7.235 }],
    'S06-01': [{ audio: 'education-S06-01.mp3', start: 0.000, end: 8.124 }],
    'S06-02': [{ audio: 'education-S06-02.mp3', start: 0.000, end: 5.720 }],
    'S06-03': [{ audio: 'education-S06-03.mp3', start: 0.000, end: 9.795 }],
    'S07-01': [{ audio: 'education-S07-01.mp3', start: 0.000, end: 7.235 }],
    'S07-02': [{ audio: 'education-S07-02.mp3', start: 0.000, end: 7.392 }],
    'S08-01': [{ audio: 'education-S08-01.mp3', start: 0.000, end: 5.328 }],
    'S08-02': [{ audio: 'education-S08-02.mp3', start: 0.000, end: 11.467 }],
    'S09-01': [{ audio: 'education-S09-01.mp3', start: 0.000, end: 7.967 }],
    'S09-02': [{ audio: 'education-S09-02.mp3', start: 0.000, end: 3.866 }],
    'S09-03': [{ audio: 'education-S09-03.mp3', start: 0.000, end: 4.989 }],
    'S09-04': [{ audio: 'education-S09-04.mp3', start: 0.000, end: 8.280 }],
    'S10-01': [{ audio: 'education-S10-01.mp3', start: 0.000, end: 6.687 }],
    'S10-02': [{ audio: 'education-S10-02.mp3', start: 0.000, end: 7.471 }]
  }
};
