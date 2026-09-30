/* ============================================================
   Sales Idea — Bekerja di Singapura: narasi rekaman (voice Bian)
   ------------------------------------------------------------
   MASTER AUDIO MAP hasil audit. Kunci = segmen PWA "SNN-MM": scene
   NN dan segmen MM pada larik NARASI di sales-idea-singapura.js (27
   segmen). Nilai = larik klip { audio, start, end } dalam detik;
   klip diputar berurutan. S05-03 memakai dua berkas.

   Timestamp diukur dari audio aktual: titik potong ada di tengah
   jeda kalimat, jadi klip yang bersebelahan tidak tumpang tindih dan
   tidak ada kalimat yang hilang. Bagian berkas di luar klip (narasi
   tambahan) tidak pernah diputar.

   Hanya 13 berkas yang dipakai (assets/narasi/singapore/). Catatan:
   S05-01 pada audio tidak mengucapkan "dan" (diterima apa adanya).
   Mengganti satu segmen = mengganti entri segmen itu saja.
   ============================================================ */
window.PSGSingapuraAudio = {
  versi: 'sg-bian-2026-09-29',
  suara: 'Bian — Neutral, Calm and Clear',
  folder: 'assets/narasi/singapore/',
  segmen: {
    'S01-01': [{ audio: 'S01-01.mp3', start: 0.000, end: 10.277 }],
    'S01-02': [{ audio: 'S01-01.mp3', start: 10.277, end: 21.786 }],
    'S02-01': [{ audio: 'S01-02.mp3', start: 0.000, end: 10.495 }],
    'S02-02': [{ audio: 'S01-02.mp3', start: 10.495, end: 19.487 }],
    'S02-03': [{ audio: 'S01-03.mp3', start: 0.000, end: 11.223 }],
    'S02-04': [{ audio: 'S01-03.mp3', start: 11.223, end: 17.084 }],
    'S03-01': [{ audio: 'S02-01.mp3', start: 0.000, end: 10.033 }],
    'S03-02': [{ audio: 'S02-01.mp3', start: 10.033, end: 18.913 }],
    'S04-01': [{ audio: 'S02-02.mp3', start: 0.000, end: 5.455 }],
    'S04-02': [{ audio: 'S02-02.mp3', start: 5.455, end: 12.627 }],
    'S04-03': [{ audio: 'S02-02.mp3', start: 12.627, end: 17.973 }],
    'S04-04': [{ audio: 'S02-02.mp3', start: 17.973, end: 27.794 }],
    'S05-01': [{ audio: 'S05-01.mp3', start: 0.000, end: 6.268 }],
    'S05-02': [{ audio: 'S05-01.mp3', start: 6.268, end: 10.005 }],
    'S05-03': [{ audio: 'S05-01.mp3', start: 10.005, end: 15.882 },
               { audio: 'S05-02.mp3', start: 0.000, end: 4.855 }],
    'S06-01': [{ audio: 'S06-01.mp3', start: 0.000, end: 3.357 }],
    'S06-02': [{ audio: 'S06-01.mp3', start: 3.357, end: 7.308 }],
    'S06-03': [{ audio: 'S06-01.mp3', start: 7.308, end: 13.087 }],
    'S06-04': [{ audio: 'S06-02.mp3', start: 0.000, end: 7.215 }],
    'S07-01': [{ audio: 'S07-01.mp3', start: 0.000, end: 13.479 }],
    'S07-02': [{ audio: 'S07-02.mp3', start: 0.000, end: 4.558 }],
    'S07-03': [{ audio: 'S07-02.mp3', start: 4.558, end: 13.960 }],
    'S07-04': [{ audio: 'S07-02.mp3', start: 13.960, end: 21.159 }],
    'S08-01': [{ audio: 'S08-01.mp3', start: 0.000, end: 8.090 }],
    'S08-02': [{ audio: 'S08-01.mp3', start: 8.090, end: 13.732 }],
    'S08-03': [{ audio: 'S08-01.mp3', start: 13.732, end: 16.927 }],
    'S08-04': [{ audio: 'S08-02.mp3', start: 0.000, end: 5.251 }]
  }
};
