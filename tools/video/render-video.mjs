#!/usr/bin/env node
/* ============================================================
   Prototype pre-render video Sales Idea (alat developer).
   ------------------------------------------------------------
   Bukan bagian runtime PWA: tidak dimuat index.html / sw.js dan tidak
   mengubah berkas production. Cerita: Asset Creation, Retirement Planning,
   Keranjang Kehidupan, dan Education Planning (16:9; 9:16 untuk HP:
   asset-portrait, retirement-portrait, basket-portrait, education-portrait).

     node tools/video/render-video.mjs --cerita asset|asset-portrait|retirement|retirement-portrait|basket|basket-portrait|education|education-portrait|jari|jari-portrait|singapore|singapore-portrait [--out <folder>]
          [--fps 30] [--jeda-scene 0] [--ffmpeg <path>] [--browser <path>] [--tanpa-encode]
     node tools/video/render-video.mjs --cek <folder>/asset.json

   Semua waktu diambil dari kode production yang sama dengan PWA:
   1. Analisis (konteks browser A): tiap scene diputar lewat pemutar
      production (PSGStoryPlayer); dari timeline-nya dibaca durasi dan
      saat ketukan. Ketukan dibaca dengan memanggil fungsi tick scene
      langsung (fungsi murni dari waktu), tanpa seek.
   2. Jadwal audio = aturan narator PSGNarasi (src/sales-idea-keranjang.js)
      untuk rekaman: segmen ke-j mulai begitu ketukan j terbuka DAN segmen
      sebelumnya tuntas. Bila ketukan terbuka saat narator menunggu,
      narator mulai lewat ucapkan() dengan jeda awal (setTimeout lanjut,
      dibaca dari sumbernya); bila ketukan sudah terbuka saat segmen
      sebelumnya tuntas, segmen langsung menyambung. Lama segmen = jumlah
      (end − start) klip manifest. Panjang scene = maks(durasi timeline,
      akhir audio) + --jeda-scene (bawaan 0 = tidak ada timing baru).
   3. Capture (konteks browser B, segar): frame f → waktu t = f / fps;
      scene aktif di-seek MAJU ke τ = t − awal scene (animasi ambient
      ikut ke τ). Seek mundur ditolak. Frame = PNG 1280×720 (9:16: 720×1280).
   4. Audio: klip MP3 manifest di-decode Chromium (48 kHz) dan
      ditempatkan pada jadwal → WAV PCM 16-bit mono.
   5. Encode MP4 H.264 + AAC dengan ffmpeg (libx264 + aac) bila ada.
      Tanpa encoder itu: capture + audio tetap dibuat dan diverifikasi,
      MP4 dilaporkan terblokir (keluar 4), tidak ada MP4 palsu.

   Tombol/UI PWA (← Sales Idea, Narasi, ✕, bar kontrol, Panduan untuk
   agen, kartu akhir) disembunyikan dengan CSS yang hanya disuntikkan ke
   halaman render. Output wajib di luar repo.

   Playwright bukan dependensi repo: dipakai dari instalasi global
   (NODE_PATH), sama seperti test browser lain.
   Keluar: 0 = lulus (MP4 dibuat, atau --tanpa-encode), 4 = capture &
   audio lulus tetapi encode terblokir codec, 3 = --cek: render usang,
   2 = Playwright tidak ada, 1 = gagal/validasi gagal.
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALAT = path.relative(ROOT, fileURLToPath(import.meta.url));
const VERSI_FORMAT = 1;
/* Versi mesin render = cara capture (seek maju per frame), jadwal audio, dan
   encode. Naikkan bila salah satunya berubah sehingga render lama tidak lagi
   setara. --cek membandingkan versi ini dan parameter render efektif cerita
   (lihat parameterBerubah), bukan hash berkas alat: menambah konfigurasi
   cerita lain tidak membuat render lama usang. Metadata tanpa field 'mesin' /
   'enkode' dibuat oleh mesin 1 dengan encode ENKODE_MESIN1. */
const MESIN = 1;
const ENKODE_V = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p'];
const ENKODE_A = ['-c:a', 'aac', '-b:a', '128k'];
const ENKODE_MESIN1 = '-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k';

/* ---------------- cerita yang didukung ---------------- */
const CERITA = {
  asset: {
    judul: 'Asset Creation', pilih: 'asset', sel: '.acs', attr: 'data-acs', jumlah: 6,
    manifest: 'src/sales-idea-asset-audio.js', glob: 'PSGAssetAudio',
    /* berkas yang menentukan gambar/suara hasil render (untuk deteksi render usang) */
    input: ['index.html', 'src/styles.css', 'src/branding.css', 'src/sales-idea-player.js', 'src/sales-idea-player.css',
      'src/sales-idea.js', 'src/sales-idea-keranjang.js', 'src/psg-karakter.js', 'src/psg-karakter.css',
      'src/sales-idea-asset.js', 'src/sales-idea-asset.css', 'src/sales-idea-asset-audio.js'],
    /* UI PWA yang disembunyikan di hasil render (hanya di halaman render) */
    css: [
      '#layarSalesIdea .si-footer{display:none!important}',
      '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
      '#layarSalesIdea .acs-cue{display:none!important}',
      '#layarSalesIdea .sil-kartu{display:none!important}'
    ].join('\n')
  },
  retirement: {
    judul: 'Retirement Planning', pilih: 'retirement', sel: '.rps', attr: 'data-rps', jumlah: 6,
    manifest: 'src/sales-idea-retirement-audio.js', glob: 'PSGRetirementAudio',
    input: ['index.html', 'src/styles.css', 'src/branding.css', 'src/sales-idea-player.js', 'src/sales-idea-player.css',
      'src/sales-idea.js', 'src/sales-idea-keranjang.js', 'src/psg-karakter.js', 'src/psg-karakter.css',
      'src/sales-idea-retirement.js', 'src/sales-idea-retirement.css', 'src/sales-idea-retirement-audio.js'],
    css: [
      '#layarSalesIdea .si-footer{display:none!important}',
      '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
      '#layarSalesIdea .sil-kartu{display:none!important}'
    ].join('\n')
  },
  education: {
    judul: 'Education Planning', pilih: 'education', sel: '.eps', attr: 'data-eps', jumlah: 10,
    manifest: 'src/sales-idea-education-audio.js', glob: 'PSGEducationAudio',
    input: ['index.html', 'src/styles.css', 'src/branding.css', 'src/sales-idea-player.js', 'src/sales-idea-player.css',
      'src/sales-idea.js', 'src/sales-idea-keranjang.js', 'src/psg-karakter.js', 'src/psg-karakter.css',
      'src/sales-idea-education.js', 'src/sales-idea-education.css', 'src/sales-idea-education-audio.js'],
    css: [
      '#layarSalesIdea .si-footer{display:none!important}',
      '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
      '#layarSalesIdea .sil-kartu{display:none!important}'
    ].join('\n')
  },
  /* Keranjang Kehidupan: scene & narator ada di berkas yang sama (src/sales-idea-keranjang.js) */
  basket: {
    judul: 'Keranjang Kehidupan', pilih: 'basket', sel: '.kbs', attr: 'data-kbs', jumlah: 10,
    manifest: 'src/sales-idea-keranjang-audio.js', glob: 'PSGKeranjangAudio',
    input: ['index.html', 'src/styles.css', 'src/branding.css', 'src/sales-idea-player.js', 'src/sales-idea-player.css',
      'src/sales-idea.js', 'src/sales-idea-keranjang.js', 'src/psg-karakter.js', 'src/psg-karakter.css',
      'src/sales-idea-keranjang.css', 'src/sales-idea-keranjang-audio.js'],
    css: [
      '#layarSalesIdea .si-footer{display:none!important}',
      '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
      '#layarSalesIdea .sil-kartu{display:none!important}'
    ].join('\n')
  }
};
/* Dua cerita production tambahan. Kelompok scene memetakan indeks presentasi
   global ke penanda DOM lokal: alasan 10 Jari mengulang data-jps-alasan dari 1. */
CERITA.jari = {
  judul: '10 Jari', pilih: 'jari', jumlah: 9,
  kelompokScene: [
    { sel: '.jps', attr: 'data-jps', awal: 1, jumlah: 6 },
    { sel: '[data-jps-alasan]', attr: 'data-jps-alasan', awal: 7, jumlah: 3 }
  ],
  manifests: [
    { manifest: 'src/sales-idea-jari-audio.js', glob: 'PSGJariAudio', sceneAwal: 1, sceneLokalAwal: 1, jumlah: 6 },
    { manifest: 'src/sales-idea-jari-alasan-audio.js', glob: 'PSGJariAlasanAudio', sceneAwal: 7, sceneLokalAwal: 1, jumlah: 3 }
  ],
  input: ['index.html', 'src/styles.css', 'src/branding.css', 'src/sales-idea-player.js', 'src/sales-idea-player.css',
    'src/sales-idea.js', 'src/psg-karakter.js', 'src/psg-karakter.css', 'src/sales-idea-jari.js', 'src/sales-idea-jari.css'],
  css: [
    '#layarSalesIdea .si-footer{display:none!important}',
    '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
    '#layarSalesIdea .si-reason-highlight{display:none!important}'
  ].join('\n'),
  namaOutput: (tema, potret) => 'jari-' + tema + (potret ? '-portrait' : '')
};
CERITA.singapore = {
  judul: 'Bekerja di Singapura', pilih: 'singapura', sel: '.sgs', attr: 'data-sgs', jumlah: 8,
  manifest: 'src/sales-idea-singapura-audio.js', glob: 'PSGSingapuraAudio',
  input: ['index.html', 'src/styles.css', 'src/branding.css', 'src/sales-idea-player.js', 'src/sales-idea-player.css',
    'src/sales-idea.js', 'src/psg-karakter.js', 'src/psg-karakter.css',
    'src/sales-idea-singapura.js', 'src/sales-idea-singapura.css', 'src/sales-idea-singapura-audio.js'],
  css: [
    '#layarSalesIdea .si-footer{display:none!important}',
    '#layarSalesIdea .si-back-hub,#layarSalesIdea .si-close,#layarSalesIdea [data-kbs-suara]{visibility:hidden!important}',
    '#layarSalesIdea .sgs-cue{display:none!important}'
  ].join('\n'),
  namaOutput: (tema, potret) => 'singapore-' + tema + (potret ? '-portrait' : '')
};
/* Keranjang Kehidupan 9:16 (720×1280) untuk HP: halaman render 360×640 px CSS dengan
   skala piksel 2, yaitu tata letak responsif PWA versi ponsel (panggung di atas,
   teks di bawah) — bukan video 16:9 yang diputar, dipotong, atau diperkecil.
   Scene, timing, narasi, dan audio sama dengan 16:9. CSS tambahan hanya untuk
   halaman render: tombol yang disembunyikan dikeluarkan dari tata letak (judul
   tidak terpotong), panggung ±1,08:1 agar zoom kamera tidak memotong label/tag di
   tepi kiri-kanan, dan teks diperbesar agar terbaca di HP. */
CERITA['basket-portrait'] = Object.assign({}, CERITA.basket, {
  judul: 'Keranjang Kehidupan (9:16)',
  layar: { lebar: 360, tinggi: 640, skala: 2 },
  css: CERITA.basket.css + '\n' + [
    '#layarSalesIdea .kbs > .si-presentation-topbar .si-back-hub,#layarSalesIdea .kbs > .si-presentation-topbar .si-close,#layarSalesIdea .kbs > .si-presentation-topbar [data-kbs-suara]{display:none!important}',
    '#layarSalesIdea .kbs > .si-presentation-topbar{grid-template-columns:minmax(0,1fr)!important;min-height:48px!important}',
    '#layarSalesIdea .kbs > .si-presentation-topbar .si-presentation-brand{grid-column:1!important}',
    '#layarSalesIdea .kbs > .si-presentation-topbar .si-presentation-brand span{display:inline-flex!important}',
    '#layarSalesIdea .kbs > .si-presentation-topbar .si-presentation-brand b{font-size:17px!important}',
    '#layarSalesIdea .kbs-body{grid-template-rows:310px minmax(0,1fr)!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important}',
    '#layarSalesIdea .kbs-text{align-content:center!important;padding:18px 20px!important;gap:10px!important}',
    '#layarSalesIdea .kbs-title{font-size:24px!important;line-height:1.2!important}',
    '#layarSalesIdea .kbs-focus{font-size:16px!important;line-height:1.35!important}',
    '#layarSalesIdea .kbs-isi{font-size:17.5px!important;line-height:1.5!important}'
  ].join('\n'),
  /* logo kanan atas sejajar judul; watermark tipis di kanan bawah panel teks, diukur
     agar ≥ 6 px dari semua baris teks di 10 scene (panel potret hampir penuh teks) */
  branding: {
    logo: 'assets/logo-psg.png', logoTinggi: 44, logoKanan: 24, logoAtas: 26,
    watermarkLebar: 120, watermarkOpasitas: 0.06, watermarkKanan: 40, watermarkBawah: 36
  }
});

/* Retirement Planning 9:16 (720×1280) untuk HP: pola yang sama dengan basket-portrait
   (halaman 360×640 px CSS, skala 2 = tata letak responsif PWA versi ponsel). Panel
   teks mengikuti tinggi isinya dan panggung mengisi sisa layar (seperti PWA ponsel),
   karena panggung Retirement responsif (posisi %, huruf cqmin): panggung yang
   dipendekkan ke tinggi tetap membuat tokoh menutupi teks kartu S2. Scene, timing,
   narasi, dan audio sama dengan 16:9. */
CERITA['retirement-portrait'] = Object.assign({}, CERITA.retirement, {
  judul: 'Retirement Planning (9:16)',
  layar: { lebar: 360, tinggi: 640, skala: 2 },
  css: CERITA.retirement.css + '\n' + [
    '#layarSalesIdea .rps > .si-presentation-topbar .si-back-hub,#layarSalesIdea .rps > .si-presentation-topbar .si-close,#layarSalesIdea .rps > .si-presentation-topbar [data-kbs-suara]{display:none!important}',
    '#layarSalesIdea .rps > .si-presentation-topbar{grid-template-columns:minmax(0,1fr)!important;min-height:48px!important}',
    '#layarSalesIdea .rps > .si-presentation-topbar .si-presentation-brand{grid-column:1!important}',
    '#layarSalesIdea .rps > .si-presentation-topbar .si-presentation-brand span{display:inline-flex!important}',
    '#layarSalesIdea .rps > .si-presentation-topbar .si-presentation-brand b{font-size:17px!important}',
    '#layarSalesIdea .rps-body{grid-template-rows:minmax(0,1fr) auto!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important}',
    '#layarSalesIdea .rps-text{align-content:center!important;padding:16px 20px!important;gap:10px!important}',
    '#layarSalesIdea .rps-title{font-size:22px!important;line-height:1.2!important}',
    '#layarSalesIdea .rps-focus{font-size:15px!important;line-height:1.35!important}',
    '#layarSalesIdea .rps-isi{font-size:16.5px!important;line-height:1.5!important}'
  ].join('\n'),
  /* logo sama dengan basket-portrait; watermark diukur agar tidak menyentuh teks
     yang terlihat di 6 scene, termasuk saat teks masuk (panel penuh teks) */
  branding: {
    logo: 'assets/logo-psg.png', logoTinggi: 44, logoKanan: 24, logoAtas: 26,
    watermarkLebar: 116, watermarkOpasitas: 0.06, watermarkKanan: 40, watermarkBawah: 34
  }
});

/* Asset Creation 9:16 (720×1280) untuk HP: pola yang sama dengan retirement-portrait
   (halaman 360×640 px CSS, skala 2; panel teks mengikuti isinya, panggung mengisi
   sisa layar dan memaskan viewBox-nya sendiri lewat paskan()). Padding bawah kartu
   teks menjadi zona watermark: baris terakhir S2 memanjang hampir selebar kartu.
   Scene, timing, narasi, dan audio sama dengan 16:9. */
CERITA['asset-portrait'] = Object.assign({}, CERITA.asset, {
  judul: 'Asset Creation (9:16)',
  layar: { lebar: 360, tinggi: 640, skala: 2 },
  css: CERITA.asset.css + '\n' + [
    '#layarSalesIdea .acs > .si-presentation-topbar .si-back-hub,#layarSalesIdea .acs > .si-presentation-topbar .si-close,#layarSalesIdea .acs > .si-presentation-topbar [data-kbs-suara]{display:none!important}',
    '#layarSalesIdea .acs > .si-presentation-topbar{grid-template-columns:minmax(0,1fr)!important;min-height:48px!important}',
    '#layarSalesIdea .acs > .si-presentation-topbar .si-presentation-brand{grid-column:1!important}',
    '#layarSalesIdea .acs > .si-presentation-topbar .si-presentation-brand span{display:inline-flex!important}',
    '#layarSalesIdea .acs > .si-presentation-topbar .si-presentation-brand b{font-size:17px!important}',
    '#layarSalesIdea .acs-body{grid-template-rows:minmax(0,1fr) auto!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important}',
    '#layarSalesIdea .acs-text{align-content:center!important;padding:16px 20px 40px!important;gap:10px!important}',
    '#layarSalesIdea .acs-title{font-size:22px!important;line-height:1.2!important}',
    '#layarSalesIdea .acs-focus{font-size:15px!important;line-height:1.35!important}',
    '#layarSalesIdea .acs-isi{font-size:16.5px!important;line-height:1.5!important}'
  ].join('\n'),
  /* sama dengan retirement-portrait; watermark diukur tidak menyentuh teks yang
     terlihat di 6 scene, termasuk saat teks masuk */
  branding: {
    logo: 'assets/logo-psg.png', logoTinggi: 44, logoKanan: 24, logoAtas: 26,
    watermarkLebar: 116, watermarkOpasitas: 0.06, watermarkKanan: 40, watermarkBawah: 34
  }
});

/* Education Planning 9:16 (720×1280) untuk HP: pola asset-portrait (panel teks mengikuti
   isi, panggung mengisi sisa layar, padding bawah kartu = zona watermark). Khusus S6:
   baris chip setoran di kartu teks disembunyikan — angka yang sama sudah tampil di
   label panggung dan di teks isi — agar panggung S6 tidak menyusut ke ±240 px (label
   panggung ±8 px). Scene, timing, narasi, dan audio sama dengan 16:9. */
CERITA['education-portrait'] = Object.assign({}, CERITA.education, {
  judul: 'Education Planning (9:16)',
  layar: { lebar: 360, tinggi: 640, skala: 2 },
  css: CERITA.education.css + '\n' + [
    '#layarSalesIdea .eps > .si-presentation-topbar .si-back-hub,#layarSalesIdea .eps > .si-presentation-topbar .si-close,#layarSalesIdea .eps > .si-presentation-topbar [data-kbs-suara]{display:none!important}',
    '#layarSalesIdea .eps > .si-presentation-topbar{grid-template-columns:minmax(0,1fr)!important;min-height:48px!important}',
    '#layarSalesIdea .eps > .si-presentation-topbar .si-presentation-brand{grid-column:1!important}',
    '#layarSalesIdea .eps > .si-presentation-topbar .si-presentation-brand span{display:inline-flex!important}',
    '#layarSalesIdea .eps > .si-presentation-topbar .si-presentation-brand b{font-size:17px!important}',
    '#layarSalesIdea .eps-body{grid-template-rows:minmax(0,1fr) auto!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important}',
    '#layarSalesIdea .eps-text{align-content:center!important;padding:16px 20px 40px!important;gap:10px!important}',
    '#layarSalesIdea .eps-title{font-size:22px!important;line-height:1.2!important}',
    '#layarSalesIdea .eps-focus{font-size:15px!important;line-height:1.35!important}',
    '#layarSalesIdea .eps-isi{font-size:16.5px!important;line-height:1.5!important}',
    '#layarSalesIdea .eps[data-eps="6"] .eps-chip-row{display:none!important}'
  ].join('\n'),
  /* sama dengan asset-portrait; watermark diukur tidak menyentuh teks yang terlihat
     di 10 scene, termasuk saat teks masuk */
  branding: {
    logo: 'assets/logo-psg.png', logoTinggi: 44, logoKanan: 24, logoAtas: 26,
    watermarkLebar: 116, watermarkOpasitas: 0.06, watermarkKanan: 40, watermarkBawah: 34
  }
});

/* Portrait render profiles use the same production SVGs and responsive layout,
   with small render-only adjustments for the 360×640 CSS viewport. */
CERITA['jari-portrait'] = Object.assign({}, CERITA.jari, {
  judul: '10 Jari (9:16)', layar: { lebar: 360, tinggi: 640, skala: 2 },
  css: CERITA.jari.css + '\n' + [
    '#layarSalesIdea.aktif .si-content{display:flex!important;flex-direction:column!important;overflow:hidden!important;padding:0!important}',
    '#layarSalesIdea.aktif .si-content > .jps{flex:1 1 auto!important}',
    '#layarSalesIdea .jps-body{grid-template-rows:minmax(180px,1fr) auto!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important}',
    '#layarSalesIdea .jps-text{padding:9px 12px!important;gap:4px!important}',
    '#layarSalesIdea .jps-title{font-size:17px!important}',
    '#layarSalesIdea .jps-focus{font-size:12px!important;line-height:1.3!important}',
    '#layarSalesIdea .jps-isi{font-size:11.5px!important;line-height:1.36!important}',
    '#layarSalesIdea .jps-inti{padding:6px 8px!important}',
    '#layarSalesIdea .jps-inti p{font-size:11px!important;line-height:1.35!important}',
    '#layarSalesIdea .si-content .si-presentation-topbar .si-back-hub,#layarSalesIdea .si-content .si-presentation-topbar .si-close,#layarSalesIdea .si-content .si-presentation-topbar [data-kbs-suara]{display:none!important}',
    '#layarSalesIdea .si-content .si-presentation-topbar{grid-template-columns:minmax(0,1fr)!important;min-height:44px!important;padding:2px 0!important}',
    '#layarSalesIdea .si-content .si-presentation-topbar .si-presentation-brand{grid-column:1!important;min-width:0!important;max-width:none!important}',
    '#layarSalesIdea .si-content .si-presentation-topbar .si-presentation-brand b{font-size:14px!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}',
    '#layarSalesIdea .si-content:has([data-jps-alasan]){display:grid!important;grid-template-rows:auto auto auto!important;align-content:start!important;gap:6px!important}',
    '#layarSalesIdea .si-content:has([data-jps-alasan]) > .si-topline,#layarSalesIdea .si-content:has([data-jps-alasan]) > .si-reason-progress{display:none!important}',
    '#layarSalesIdea .si-content:has([data-jps-alasan]) > .si-presentation-topbar{min-height:44px!important;padding:2px 0!important}',
    '#layarSalesIdea .si-presentation-card[data-jps-alasan]{min-height:0!important;overflow:hidden!important;align-self:start!important;margin:0!important;padding:10px 12px!important;display:flex!important;flex-direction:column!important;gap:3px!important}',
    '#layarSalesIdea .si-presentation-card[data-jps-alasan] .si-presentation-focus{font-size:14px!important;line-height:1.16!important;margin:3px auto!important}',
    '#layarSalesIdea .si-presentation-card[data-jps-alasan] .si-presentation-text{font-size:10.5px!important;line-height:1.3!important}',
    '#layarSalesIdea .si-presentation-card[data-jps-alasan] .si-reason-points{grid-template-columns:1fr!important;gap:4px!important;margin:6px 0 0!important}',
    '#layarSalesIdea .si-presentation-card[data-jps-alasan] .si-reason-points>div{min-height:0!important;padding:5px 7px!important;gap:6px!important;align-items:center!important}',
    '#layarSalesIdea .si-presentation-card[data-jps-alasan] .si-reason-points b{font-size:9.5px!important;line-height:1.2!important}',
    '#layarSalesIdea .reason-highlight{margin:6px 0 0!important;padding:10px 12px!important}',
    '#layarSalesIdea .reason-highlight p{font-size:11px!important;line-height:1.35!important}'
  ].join('\n'),
  branding: { logo: 'assets/logo-psg.png', logoTinggi: 44, logoKanan: 24, logoAtas: 26,
    watermarkLebar: 116, watermarkOpasitas: 0.06, watermarkKanan: 40, watermarkBawah: 34 }
});
CERITA['singapore-portrait'] = Object.assign({}, CERITA.singapore, {
  judul: 'Bekerja di Singapura (9:16)', layar: { lebar: 360, tinggi: 640, skala: 2 },
  css: CERITA.singapore.css + '\n' + [
    '#layarSalesIdea.aktif .si-content{overflow:hidden!important;padding:0!important}',
    '#layarSalesIdea .sgs{grid-template-rows:auto minmax(0,1fr)!important;gap:6px!important}',
    '#layarSalesIdea .sgs-body{grid-template-rows:minmax(180px,1fr) auto!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important}',
    '#layarSalesIdea .sgs > .si-presentation-topbar{min-height:46px!important;padding:2px 0!important}',
    '#layarSalesIdea .sgs > .si-presentation-topbar .si-back-hub,#layarSalesIdea .sgs > .si-presentation-topbar .si-close,#layarSalesIdea .sgs > .si-presentation-topbar [data-kbs-suara]{display:none!important}',
    '#layarSalesIdea .sgs > .si-presentation-topbar{grid-template-columns:minmax(0,1fr)!important}',
    '#layarSalesIdea .sgs > .si-presentation-topbar .si-presentation-brand{grid-column:1!important}',
    '#layarSalesIdea .sgs-text{padding:8px 10px!important;gap:3px!important;border-radius:14px!important}',
    '#layarSalesIdea .sgs-title{font-size:15px!important;line-height:1.16!important}',
    '#layarSalesIdea .sgs-focus{font-size:11.5px!important;line-height:1.25!important}',
    '#layarSalesIdea .sgs-isi{font-size:10.5px!important;line-height:1.3!important}'
  ].join('\n'),
  branding: { logo: 'assets/logo-psg.png', logoTinggi: 44, logoKanan: 24, logoAtas: 26,
    watermarkLebar: 116, watermarkOpasitas: 0.06, watermarkKanan: 40, watermarkBawah: 34 }
});

/* ---------------- argumen ---------------- */
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FPS = +arg('--fps', 30);
const SR = 48000;
const JEDA_SCENE = +arg('--jeda-scene', 0);
const TANPA_ENCODE = args.includes('--tanpa-encode');
const BROWSER = arg('--browser');
/* --branding: logo PSG kecil (kanan atas, slot bar judul yang kosong di
   render) + watermark logo yang sangat tipis (bawah-kanan panel teks),
   ditanam saat encode lewat filter overlay ffmpeg. Hanya berkas video:
   frame capture, audio, dan tampilan PWA tidak berubah. */
/* --tema gelap: tema Dark Gold PWA, dipilih lewat kunci localStorage yang
   sama dengan tombol tema (insuranceHub.theme.v3); bawaan terang (Original) */
const TEMA = arg('--tema', 'terang');
if (TEMA !== 'terang' && TEMA !== 'gelap') { console.error('--tema harus terang atau gelap'); process.exit(1); }
/* branding video 16:9 (LOCKED); cerita boleh membawa branding sendiri untuk kanvas lain */
const BRANDING_16X9 = {
  logo: 'assets/logo-psg.png', logoTinggi: 40, logoKanan: 28, logoAtas: 8,
  watermarkLebar: 240, watermarkOpasitas: 0.06, watermarkKanan: 44, watermarkBawah: 28
};
/* masukan ffmpeg: 0 = frame PNG, 1 = WAV, 2 = logo (skala menjaga rasio) */
function filterBranding(b) {
  return '[2:v]format=rgba,split=2[l1][l2];' +
    '[l1]scale=-1:' + b.logoTinggi + ':flags=lanczos[logo];' +
    '[l2]scale=' + b.watermarkLebar + ':-1:flags=lanczos,colorchannelmixer=aa=' + b.watermarkOpasitas + '[wm];' +
    '[0:v][wm]overlay=x=W-w-' + b.watermarkKanan + ':y=H-h-' + b.watermarkBawah + ':format=auto[v1];' +
    '[v1][logo]overlay=x=W-w-' + b.logoKanan + ':y=' + b.logoAtas + ':format=auto[v]';
}

const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');
const log = (...x) => console.log(...x);
const dua = (n) => (n < 10 ? '0' : '') + n;

function muatPlaywright() {
  const require = createRequire(import.meta.url);
  for (const t of ['playwright', path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'playwright')]) {
    try { return require(t); } catch (_) {}
  }
  return null;
}

function referensiManifest(c) {
  return (c.manifests || [{ manifest: c.manifest }]).map((x) => x.manifest).join(', ');
}
function kelompokScene(n) {
  const daftar = C.kelompokScene || [{ sel: C.sel, attr: C.attr, awal: 1, jumlah: C.jumlah }];
  const k = daftar.find((x) => n >= x.awal && n < x.awal + x.jumlah);
  if (!k) throw new Error('tidak ada kelompok DOM untuk scene global ' + n);
  return Object.assign({}, k, { lokal: n - k.awal + 1 });
}
/* Baca manifest apa adanya, lalu normalkan klip ke indeks scene global dan
   tempelkan folder sumbernya pada setiap klip (tanpa menyalin MP3). */
function bacaManifest(c) {
  const specs = c.manifests || [{ manifest: c.manifest, glob: c.glob, sceneAwal: 1, sceneLokalAwal: 1, jumlah: c.jumlah }];
  const segmen = {}, sources = [];
  specs.forEach((sp) => {
    const src = fs.readFileSync(path.join(ROOT, sp.manifest), 'utf8'), w = {};
    new Function('window', src)(w);
    const m = w[sp.glob];
    if (!m || !m.segmen) throw new Error('manifest ' + sp.manifest + ' tidak memuat ' + sp.glob);
    sources.push({ manifest: sp.manifest, glob: sp.glob, versi: m.versi || null, folder: m.folder || '' });
    Object.entries(m.segmen).forEach(([id, klip]) => {
      const match = /^S(\d+)-(\d+)$/.exec(id);
      if (!match) throw new Error('ID segmen tidak dikenal di ' + sp.manifest + ': ' + id);
      const sceneLokal = +match[1];
      if (sceneLokal < sp.sceneLokalAwal || sceneLokal >= sp.sceneLokalAwal + sp.jumlah) return;
      const sceneGlobal = sp.sceneAwal + sceneLokal - sp.sceneLokalAwal;
      const idGlobal = 'S' + dua(sceneGlobal) + '-' + match[2];
      if (segmen[idGlobal]) throw new Error('ID segmen global duplikat: ' + idGlobal);
      segmen[idGlobal] = klip.map((x) => Object.assign({}, x, { folder: m.folder || '' }));
    });
  });
  if (Object.keys(segmen).length === 0) throw new Error('tidak ada klip audio pada manifest ' + referensiManifest(c));
  return { segmen, sources, reference: referensiManifest(c), folder: sources.length === 1 ? sources[0].folder : null,
    versi: sources.map((x) => x.versi).join(', ') };
}
/* jeda awal narator: suara.jeda = setTimeout(lanjut, N) di src/sales-idea-keranjang.js */
function jedaNarator() {
  const src = fs.readFileSync(path.join(ROOT, 'src/sales-idea-keranjang.js'), 'utf8');
  const m = /suara\.jeda\s*=\s*setTimeout\(\s*lanjut\s*,\s*(\d+)\s*\)/.exec(src);
  if (!m) throw new Error('jeda awal narator tidak ditemukan di src/sales-idea-keranjang.js');
  return +m[1];
}
function hashInput(c, manifest, branding) {
  const daftar = c.input.slice();
  const mp3 = new Set();
  manifest.sources.forEach((x) => daftar.push(x.manifest));
  Object.values(manifest.segmen).forEach((k) => k.forEach((x) => mp3.add(path.join(x.folder, x.audio))));
  [...mp3].sort().forEach((f) => daftar.push(f));
  if (branding) daftar.push(branding.logo);
  daftar.push(ALAT);
  const h = {};
  daftar.forEach((f) => { h[f] = sha1(fs.readFileSync(path.join(ROOT, f))); });
  return h;
}

/* ---------------- --cek: render usang? ----------------
   Usang bila (a) salah satu input berubah — sumber scene/CSS/pemutar/narator,
   manifest & MP3 audio, logo branding — atau (b) parameter render efektif
   cerita itu berbeda: CSS halaman render, ukuran halaman & skala piksel,
   resolusi, jumlah scene, jeda narator, manifest, branding (nilai + filter
   ffmpeg), encode, versi mesin. Hash berkas alat tetap dicatat; bila hanya itu
   yang berbeda (mis. konfigurasi cerita lain bertambah), render tidak usang —
   perubahannya dilaporkan. */
const KUNCI_BRANDING = ['logo', 'logoTinggi', 'logoKanan', 'logoAtas', 'watermarkLebar', 'watermarkOpasitas', 'watermarkKanan', 'watermarkBawah', 'filter'];
const ambil = (o, k) => (o ? Object.fromEntries(k.map((x) => [x, o[x]])) : null);
const enkodeKini = () => ENKODE_V.concat(ENKODE_A).join(' ');
function parameterBerubah(meta, c) {
  const layar = c.layar || { lebar: 1280, tinggi: 720, skala: 1 };
  const b = meta.branding ? (c.branding || BRANDING_16X9) : null;
  const aud = meta.aturanAudio || {};
  const sama = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  return [
    ['CSS halaman render', sama(meta.renderCss, c.css)],
    /* metadata lama tanpa 'halaman': ukuran keluaran (resolusi) tetap dibandingkan */
    ['ukuran halaman / skala piksel', !meta.halaman || sama(meta.halaman, layar)],
    ['resolusi video', sama(meta.resolusi, { lebar: layar.lebar * layar.skala, tinggi: layar.tinggi * layar.skala })],
    ['jumlah scene', (meta.scene || []).length === c.jumlah],
    ['manifest audio', aud.manifest === referensiManifest(c)],
    ['jeda awal narator', aud.jedaAwalNaratorMd === jedaNarator()],
    ['branding', sama(ambil(meta.branding, KUNCI_BRANDING), b && ambil(Object.assign({ filter: filterBranding(b) }, b), KUNCI_BRANDING))],
    ['parameter encode', (meta.enkode || ENKODE_MESIN1) === enkodeKini()],
    ['versi mesin render', (meta.mesin || 1) === MESIN]
  ].filter((x) => !x[1]).map((x) => x[0]);
}
if (arg('--cek')) {
  const meta = JSON.parse(fs.readFileSync(arg('--cek'), 'utf8'));
  const c = CERITA[meta.cerita];
  if (!c) { log('USANG — cerita ' + meta.cerita + ' tidak lagi dikenal alat'); process.exit(3); }
  const kini = hashInput(c, bacaManifest(c), meta.branding);
  const beda = Object.keys({ ...kini, ...meta.input }).filter((f) => kini[f] !== meta.input[f]);
  const bedaInput = beda.filter((f) => f !== ALAT), bedaParam = parameterBerubah(meta, c);
  if (bedaInput.length || bedaParam.length) {
    log('USANG — berubah sejak render:');
    bedaInput.forEach((f) => log('  input: ' + f));
    bedaParam.forEach((x) => log('  parameter: ' + x));
    process.exit(3);
  }
  log('SEGAR — ' + (Object.keys(kini).length - 1) + ' input dan parameter render efektif sama dengan saat render.' +
    (beda.includes(ALAT) ? ' (Berkas ' + ALAT + ' berubah sejak render, tetapi versi mesin & parameter efektif cerita ini sama.)' : ''));
  process.exit(0);
}

const KUNCI = arg('--cerita');
const C = CERITA[KUNCI];
if (!C) { console.error('Cerita belum didukung prototype: ' + KUNCI + ' (tersedia: ' + Object.keys(CERITA).join(', ') + ')'); process.exit(1); }
/* halaman render: ukuran px CSS + skala piksel; video = (lebar × skala) × (tinggi × skala) */
const LAYAR = C.layar || { lebar: 1280, tinggi: 720, skala: 1 };
const LEBAR = LAYAR.lebar * LAYAR.skala, TINGGI = LAYAR.tinggi * LAYAR.skala;
const FILEKEY = C.namaOutput ? C.namaOutput(TEMA, !!C.layar) : KUNCI;
const BRANDING = args.includes('--branding') ? (C.branding || BRANDING_16X9) : null;
const OUT = path.resolve(arg('--out', path.join(os.tmpdir(), 'psg-video-render')));
if (!path.relative(ROOT, OUT).startsWith('..') && !path.isAbsolute(path.relative(ROOT, OUT))) {
  console.error('Folder output harus di luar repo (render tidak boleh masuk Git): ' + OUT); process.exit(1);
}
if (!(FPS > 0) || !(JEDA_SCENE >= 0)) { console.error('--fps / --jeda-scene tidak valid'); process.exit(1); }

/* ---------------- ffmpeg: harus punya libx264 + aac + mp4 + dekoder png ---------------- */
function periksaFfmpeg(bin) {
  const jalan = (a) => spawnSync(bin, ['-hide_banner'].concat(a), { encoding: 'utf8' });
  const e = jalan(['-encoders']);
  if (e.error || e.status !== 0) return { bin, ada: false, kurang: ['biner tidak ditemukan/tidak jalan'] };
  const mux = jalan(['-muxers']).stdout || '', dek = jalan(['-decoders']).stdout || '';
  const kurang = [];
  if (!/\blibx264\b/.test(e.stdout)) kurang.push('encoder libx264 (H.264)');
  if (!/^\s*A\S*\s+aac\s/m.test(e.stdout)) kurang.push('encoder aac');
  if (!/^\s*\S*E\S*\s+mp4\s/m.test(mux)) kurang.push('muxer mp4');
  if (!/^\s*V\S*\s+png\s/m.test(dek)) kurang.push('dekoder png');
  return { bin, ada: !kurang.length, kurang };
}
function cariFfmpeg() {
  const kandidat = [];
  if (arg('--ffmpeg')) kandidat.push(arg('--ffmpeg'));
  kandidat.push('ffmpeg');
  try { fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('ffmpeg')).forEach((d) => kandidat.push(path.join('/opt/pw-browsers', d, 'ffmpeg-linux'))); } catch (_) {}
  const hasil = kandidat.map(periksaFfmpeg);
  return { pakai: hasil.find((h) => h.ada) || null, diperiksa: hasil };
}

/* ---------------- server statis ---------------- */
const TIPE = { html: 'text/html', js: 'text/javascript', css: 'text/css', mp3: 'audio/mpeg', png: 'image/png', svg: 'image/svg+xml', json: 'application/json', webmanifest: 'application/manifest+json', woff2: 'font/woff2', txt: 'text/plain' };
function layani() {
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'content-type': TIPE[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

/* Kait khusus halaman render (addInitScript). Tidak mengubah berkas:
   - timeline yang dibuat pemutar disimpan (window.__render.tl);
   - jam dinding tidak dipakai: play() dan ambient tidak berjalan sendiri,
     setiap frame ditentukan oleh seek dari alat ini;
   - semua seek dicatat per timeline (bukti render hanya maju);
   - narator dibisukan: audio video disusun dari manifest, bukan diputar. */
function kaitRender(opsi) {
  try { sessionStorage.setItem('insuranceHub.access.v3', 'ok'); } catch (_) {}
  try { localStorage.setItem('insuranceHub.theme.v3', opsi && opsi.gelap ? 'dark' : 'original'); } catch (_) {}
  const R = window.__render = { tl: null, nTl: 0, seek: [] };
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  let P;
  Object.defineProperty(window, 'PSGStoryPlayer', {
    configurable: true,
    get: () => P,
    set: (x) => {
      P = x;
      const T = x.Timeline.prototype, siapkan = T.siapkan, seek = T.seek;
      T.siapkan = function () { this.__id = ++R.nTl; R.tl = this; return siapkan.apply(this, arguments); };
      T.play = function () {};
      T.putarAmbient = function () {};
      T.seek = function (t) { R.seek.push([this.__id || 0, t]); return seek.apply(this, arguments); };
    }
  });
}

async function tunggu(pg, fn, arg2, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) { if (await pg.evaluate(fn, arg2)) return true; await pg.waitForTimeout(50); }
  throw new Error('menunggu terlalu lama: ' + fn.toString().slice(0, 80));
}
async function bukaHalaman(br, url) {
  const ctx = await br.newContext({ viewport: { width: LAYAR.lebar, height: LAYAR.tinggi }, deviceScaleFactor: LAYAR.skala, colorScheme: TEMA === 'gelap' ? 'dark' : 'light', reducedMotion: 'no-preference', serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  const galat = [];
  pg.on('pageerror', (e) => galat.push(e.message));
  await pg.addInitScript(kaitRender, { gelap: TEMA === 'gelap' });
  await pg.goto(url);
  await pg.addStyleTag({ content: C.css });
  await tunggu(pg, () => !!document.getElementById('btnSalesIdea') && !!window.PSGStoryPlayer);
  for (let i = 0; i < 4; i++) {
    await pg.evaluate(() => document.getElementById('btnSalesIdea').click());
    try { await tunggu(pg, () => !!document.querySelector('[data-si-choice]'), null, 3000); break; } catch (e) { if (i === 3) throw e; }
  }
  await pg.evaluate((p) => document.querySelector('[data-si-choice="' + p + '"]').click(), C.pilih);
  await tunggu(pg, (s) => !!document.querySelector('#salesIdeaContent ' + s) && !!window.__render.tl, kelompokScene(1).sel);
  const tema = await pg.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (tema !== (TEMA === 'gelap' ? 'dark' : 'original')) throw new Error('tema halaman render ' + tema + ', diharapkan ' + TEMA);
  return { ctx, pg, galat };
}
/* scene ke-n (1-based) dimulai lewat kontrol pemutar production:
   n = 1 → Replay (buat timeline pertama dari awal), n > 1 → Next */
async function mulaiScene(pg, n) {
  const kelompok = kelompokScene(n);
  const id0 = await pg.evaluate(() => window.__render.tl.__id);
  await pg.evaluate((n) => document.getElementById(n === 1 ? 'siReplay' : 'siNext').click(), n);
  await tunggu(pg, ([id0, sel, attr, n]) => {
    const R = window.__render, node = document.querySelector('#salesIdeaContent ' + sel);
    return R.tl && R.tl.__id !== id0 && node && +node.getAttribute(attr) === n;
  }, [id0, kelompok.sel, kelompok.attr, kelompok.lokal]);
  /* tata letak & ResizeObserver scene selesai sebelum frame pertama */
  await pg.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
  /* transisi UI di luar timeline scene (mis. animasi masuk layar
     .layar.aktif → psgMasuk 200 md) dituntaskan: video mulai dari layar
     yang sudah tampil penuh. Yang tak berujung dibiarkan → validasi gagal. */
  return pg.evaluate(() => {
    const tl = window.__render.tl, milik = new Set(tl.anak.concat(tl.ambient));
    return document.getAnimations().filter((a) => !milik.has(a) && a.playState === 'running').map((a) => {
      const e = a.effect && a.effect.target, hingga = a.effect.getComputedTiming().endTime;
      if (isFinite(hingga)) a.finish();
      return { nama: a.animationName || a.transitionProperty || '', di: e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') : '?', tuntas: isFinite(hingga) };
    });
  });
}

/* ---------------- 1. analisis ---------------- */
async function analisis(br, url) {
  const { ctx, pg, galat } = await bukaHalaman(br, url);
  const jumlah = await pg.evaluate(() => document.querySelectorAll('#siProgress li').length);
  if (jumlah !== C.jumlah) throw new Error('player memuat ' + jumlah + ' scene, konfigurasi renderer mengharapkan ' + C.jumlah);
  const scene = [];
  for (let n = 1; n <= jumlah; n++) {
    await mulaiScene(pg, n);
    const kelompok = kelompokScene(n);
    scene.push(await pg.evaluate(([sel, attr, lokal, global]) => {
      const tl = window.__render.tl, node = document.querySelector('#salesIdeaContent ' + sel);
      if (!node || +node.getAttribute(attr) !== lokal) throw new Error('target scene tidak sesuai: ' + attr + '=' + (node && node.getAttribute(attr)) + ', diharapkan ' + lokal);
      const d = tl.durasi, B = [];
      /* tick = fungsi murni dari waktu → dipanggil langsung per 1 md (tanpa seek) */
      if (tl.ticks.length) {
        for (let t = 0; t <= Math.ceil(d); t++) {
          tl.ticks.forEach((fn) => fn(t));
          const k = +node.getAttribute('data-ketuk');
          while (B.length < k) B.push(t);
        }
      }
      return { n: global, localN: lokal, sel, attr, id: tl.__id, durasi: d, anak: tl.anak.length, ambient: tl.ambient.length, ticks: tl.ticks.length, B };
    }, [kelompok.sel, kelompok.attr, kelompok.lokal, n]));
  }
  const versi = ctx.browser().version();
  await ctx.close();
  if (galat.length) throw new Error('galat halaman saat analisis: ' + galat.join(' | '));
  return { scene, versi };
}

/* ---------------- 2. jadwal ---------------- */
function susunJadwal(an, manifest, jedaMulai) {
  let awal = 0;
  const scene = an.scene.map((s) => {
    const segmen = [];
    const nSeg = s.B.length || 1;
    let akhirSebelum = jedaMulai; /* ucapkan() pertama saat scene mulai: lanjut() sesudah jeda awal */
    for (let j = 0; j < nSeg; j++) {
      const id = 'S' + dua(s.n) + '-' + dua(j + 1);
      const klip = manifest.segmen[id];
      if (!klip || !klip.length) throw new Error('manifest tidak punya klip untuk ' + id);
      const buka = s.B.length ? s.B[j] : 0;
      /* ketukan sudah terbuka saat segmen sebelumnya tuntas → menyambung;
         belum → narator menunggu, lalu ucapkan() + jeda awal */
      const mulai = buka <= akhirSebelum ? akhirSebelum : buka + jedaMulai;
      let t = mulai;
      const penempatan = klip.map((c) => { const p = { audio: c.audio, folder: c.folder, start: c.start, end: c.end, mulaiMd: t }; t += (c.end - c.start) * 1000; return p; });
      segmen.push({ id, ketukMd: buka, mulaiMd: mulai, akhirMd: t, klip: penempatan });
      akhirSebelum = t;
    }
    if (manifest.segmen['S' + dua(s.n) + '-' + dua(nSeg + 1)]) throw new Error('manifest punya segmen lebih banyak dari ketukan scene ' + s.n);
    const akhirAudio = segmen[segmen.length - 1].akhirMd;
    const panjang = Math.max(s.durasi, akhirAudio) + JEDA_SCENE;
    const hasil = { n: s.n, id: KUNCI + '-' + s.n, kelompok: { sel: s.sel, attr: s.attr, localN: s.localN }, mulaiMd: awal, durasiTimelineMd: s.durasi, akhirAudioMd: akhirAudio, panjangMd: panjang,
      ketukMd: s.B, animasi: s.anak, ambient: s.ambient, segmen };
    segmen.forEach((g) => { g.mulaiGlobalMd = awal + g.mulaiMd; g.akhirGlobalMd = awal + g.akhirMd; g.klip.forEach((k) => { k.mulaiGlobalMd = awal + k.mulaiMd; k.sampel = Math.round(k.mulaiGlobalMd * SR / 1000); }); });
    awal += panjang;
    return hasil;
  });
  const totalMd = awal;
  const frameTotal = Math.ceil(totalMd * FPS / 1000 - 1e-9);
  /* frame f milik scene yang jendelanya [mulai, mulai + panjang) memuat t = f / fps */
  let f = 0;
  scene.forEach((s) => {
    const a = f;
    while (f < frameTotal && f * 1000 / FPS < s.mulaiMd + s.panjangMd - 1e-9) f++;
    s.frame = { awal: a, jumlah: f - a };
  });
  return { scene, totalMd, frameTotal };
}

/* ---------------- 3. audio ---------------- */
async function susunAudio(br, url, jadwal, folder) {
  const ctx = await br.newContext();
  const pg = await ctx.newPage();
  await pg.goto(url.replace(/index\.html$/, 'robots.txt'));
  const daftar = [];
  jadwal.scene.forEach((s) => s.segmen.forEach((g) => g.klip.forEach((k) => daftar.push({ url: '/' + (k.folder || folder || '') + k.audio, start: k.start, end: k.end, pos: k.sampel, id: g.id }))));
  const total = Math.ceil(jadwal.totalMd * SR / 1000);
  const r = await pg.evaluate(async ({ daftar, total, sr }) => {
    const out = new Float32Array(total), terisi = [], info = [];
    for (const p of daftar) {
      const response = await fetch(p.url);
      if (!response.ok) throw new Error('audio ' + p.id + ' gagal dimuat: HTTP ' + response.status + ' ' + p.url);
      const data = await response.arrayBuffer();
      let ab;
      try { ab = await new OfflineAudioContext(1, 1, sr).decodeAudioData(data); }
      catch (e) { throw new Error('audio ' + p.id + ' gagal di-decode (' + data.byteLength + ' byte, ' + response.headers.get('content-type') + ', ' + p.url + '): ' + e.message); }
      const ch = []; for (let c = 0; c < ab.numberOfChannels; c++) ch.push(ab.getChannelData(c));
      const a = Math.round(p.start * sr), b = Math.min(ab.length, Math.round(p.end * sr)), n = b - a;
      if (p.pos + n > total) throw new Error('klip melewati akhir video: ' + p.id);
      /* toleransi 2 sampel (0,04 md): pembulatan posisi segmen yang menyambung */
      for (const [x, y, id] of terisi) if (Math.min(y, p.pos + n) - Math.max(x, p.pos) > 2) throw new Error('audio tumpang tindih: ' + id + ' & ' + p.id);
      terisi.push([p.pos, p.pos + n, p.id]);
      for (let i = 0; i < n; i++) { let v = 0; for (const d of ch) v += d[a + i]; out[p.pos + i] += v / ch.length; }
      info.push({ id: p.id, sampel: n, harap: Math.round((p.end - p.start) * sr), kanalBerkas: ab.numberOfChannels });
    }
    const i16 = new Int16Array(total);
    let puncak = 0;
    for (let i = 0; i < total; i++) { const v = Math.max(-1, Math.min(1, out[i])); puncak = Math.max(puncak, Math.abs(out[i])); i16[i] = v < 0 ? v * 32768 : v * 32767; }
    const u8 = new Uint8Array(i16.buffer); let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return { b64: btoa(s), info, puncak };
  }, { daftar, total, sr: SR });
  await ctx.close();
  const pcm = Buffer.from(r.b64, 'base64');
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  const wav = Buffer.concat([h, pcm]);
  const file = path.join(OUT, FILEKEY + '.wav');
  fs.writeFileSync(file, wav);
  const selisih = r.info.filter((x) => Math.abs(x.sampel - x.harap) > SR / FPS);
  return { berkas: path.basename(file), sampleRate: SR, kanal: 1, sampel: total, sha1: sha1(wav), puncak: +r.puncak.toFixed(4), klip: r.info.length, klipTerpotong: selisih };
}

/* ---------------- 4. capture (+ encode bila ada) ---------------- */
async function capture(br, url, jadwal, an, ff, wav) {
  const { ctx, pg, galat } = await bukaHalaman(br, url);
  let enc = null, encSelesai = null, encGalat = '';
  const mp4 = path.join(OUT, FILEKEY + '.mp4');
  if (ff) {
    /* diuji dengan ffmpeg n9.0 statis (BtbN, GPL); --branding menambah logo sebagai masukan 2 */
    const peta = BRANDING
      ? ['-i', path.join(ROOT, BRANDING.logo), '-filter_complex', filterBranding(BRANDING), '-map', '[v]', '-map', '1:a:0']
      : ['-map', '0:v:0', '-map', '1:a:0'];
    enc = spawn(ff.bin, ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:0',
      '-i', path.join(OUT, wav.berkas)].concat(peta, [
      ...ENKODE_V, '-r', String(FPS),
      ...ENKODE_A, '-ar', String(SR), '-movflags', '+faststart',
      '-t', (jadwal.totalMd / 1000).toFixed(3), mp4]), { stdio: ['pipe', 'ignore', 'pipe'] });
    enc.stderr.on('data', (d) => { encGalat += d; });
    encSelesai = new Promise((res) => enc.on('close', res));
  }
  const tulis = (buf) => new Promise((res, rej) => {
    let selesai = false;
    const tutup = (e) => {
      if (selesai) return;
      selesai = true;
      enc.stdin.off('error', gagal);
      e ? rej(e) : res();
    };
    const gagal = (e) => tutup(e);
    enc.stdin.once('error', gagal);
    try { enc.stdin.write(buf, tutup); } catch (e) { tutup(e); }
  });
  const folderFrame = path.join(OUT, 'frame');
  fs.mkdirSync(folderFrame, { recursive: true });
  const frame = [], ui = [];
  let mundur = 0;
  for (const s of jadwal.scene) {
    const transisi = await mulaiScene(pg, s.n);
    const kelompok = kelompokScene(s.n);
    const cek = await pg.evaluate(() => {
      const tl = window.__render.tl, layar = document.getElementById('layarSalesIdea');
      const g = (q, p) => { const e = layar.querySelector(q); return e ? getComputedStyle(e)[p] : 'tidak-ada'; };
      return {
        id: tl.__id, durasi: tl.durasi,
        kembali: g('.si-back-hub', 'visibility'), tutup: g('.si-close', 'visibility'), narasi: g('[data-kbs-suara]', 'visibility'),
        kontrol: g('.si-footer', 'display'), panduan: g('.acs-cue,.jps-cue,.sgs-cue', 'display'), kartuAkhir: g('.sil-kartu', 'display'),
        /* animasi yang berjalan sendiri (jam dinding) di layar = frame tidak deterministik */
        liar: document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && layar.contains(a.effect.target)).length
      };
    });
    const acuan = an.scene[s.n - 1];
    if (cek.durasi !== acuan.durasi) throw new Error('durasi timeline scene ' + s.n + ' berbeda antara analisis dan capture');
    ui.push(Object.assign({ n: s.n }, cek, { transisiDituntaskan: transisi }));
    let tauSebelum = -1;
    for (let k = 0; k < s.frame.jumlah; k++) {
      const f = s.frame.awal + k, tau = f * 1000 / FPS - s.mulaiMd;
      if (tau < tauSebelum) { mundur++; throw new Error('seek mundur ditolak (scene ' + s.n + ', frame ' + f + ')'); }
      tauSebelum = tau;
      const st = await pg.evaluate(([tau, sel, attr, lokal]) => {
        const tl = window.__render.tl;
        tl.seek(Math.min(tau, tl.durasi));
        tl.ambient.forEach((a) => { a.currentTime = tau; });
        const node = document.querySelector('#salesIdeaContent ' + sel);
        return { sceneDom: node && +node.getAttribute(attr), lokal, ketuk: node && +node.getAttribute('data-ketuk') };
      }, [tau, kelompok.sel, kelompok.attr, kelompok.lokal]);
      if (!st || st.sceneDom !== st.lokal) throw new Error('scene DOM berubah/tidak cocok saat capture global ' + s.n + ': ' + JSON.stringify(st));
      const png = await pg.screenshot({ clip: { x: 0, y: 0, width: LAYAR.lebar, height: LAYAR.tinggi }, type: 'png' });
      frame.push([f, s.n, +tau.toFixed(3), st.ketuk, sha1(png).slice(0, 16)]);
      if (k === 0) fs.writeFileSync(path.join(folderFrame, FILEKEY + '-S' + dua(s.n) + '-awal.png'), png);
      if (k === s.frame.jumlah - 1) fs.writeFileSync(path.join(folderFrame, FILEKEY + '-S' + dua(s.n) + '-akhir.png'), png);
      if (enc) await tulis(png);
    }
    log('  scene ' + s.n + ': ' + s.frame.jumlah + ' frame (' + (s.panjangMd / 1000).toFixed(2) + ' dtk)');
  }
  const seek = await pg.evaluate(() => window.__render.seek);
  await ctx.close();
  if (galat.length) throw new Error('galat halaman saat capture: ' + galat.join(' | '));
  /* bukti maju: per timeline yang di-capture, argumen seek tidak pernah turun */
  const ids = new Set(ui.map((u) => u.id));
  const perTl = {};
  seek.filter(([id]) => ids.has(id)).forEach(([id, t]) => { (perTl[id] = perTl[id] || []).push(t); });
  const turun = Object.entries(perTl).filter(([, ts]) => ts.some((t, i) => i > 0 && t < ts[i - 1])).map(([id]) => +id);
  let video = { berkas: null, status: 'terblokir' };
  if (enc) {
    enc.stdin.end();
    const kode = await encSelesai;
    video = kode === 0 && fs.existsSync(mp4)
      ? { berkas: path.basename(mp4), status: 'dibuat', ukuranByte: fs.statSync(mp4).size, sha1: sha1(fs.readFileSync(mp4)) }
      : { berkas: null, status: 'gagal', alasan: ('ffmpeg keluar ' + kode + ': ' + encGalat).slice(0, 2000) };
  }
  return { frame, ui, seekPerTimeline: Object.fromEntries(Object.entries(perTl).map(([id, ts]) => [id, ts.length])), seekTurun: turun, mundur, video };
}

/* lembar kontak: frame awal & akhir tiap scene */
async function lembarKontak(br, jadwal) {
  const ctx = await br.newContext({ viewport: { width: 700, height: 200 } });
  const pg = await ctx.newPage();
  const gambar = jadwal.scene.map((s) => ['awal', 'akhir'].map((x) => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, 'frame', FILEKEY + '-S' + dua(s.n) + '-' + x + '.png')).toString('base64')));
  /* ubin sisi terpanjang 320 px: 16:9 → 320×180, 9:16 → 180×320 */
  const ubin = [Math.round(320 * LEBAR / Math.max(LEBAR, TINGGI)), Math.round(320 * TINGGI / Math.max(LEBAR, TINGGI))];
  const b64 = await pg.evaluate(async ([gambar, ubin]) => {
    const [w, h] = ubin, pad = 24, cv = document.createElement('canvas');
    cv.width = 2 * w + 3 * 8; cv.height = gambar.length * (h + pad) + 8;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '13px sans-serif'; g.fillStyle = '#333';
    for (let i = 0; i < gambar.length; i++) {
      for (let j = 0; j < 2; j++) {
        const im = new Image(); im.src = gambar[i][j]; await im.decode();
        const x = 8 + j * (w + 8), y = 8 + i * (h + pad);
        g.fillText('Scene ' + (i + 1) + ' — frame ' + (j ? 'akhir' : 'awal'), x, y + 12);
        g.drawImage(im, x, y + 18, w, h);
      }
    }
    return cv.toDataURL('image/png').split(',')[1];
  }, [gambar, ubin]);
  await ctx.close();
  fs.writeFileSync(path.join(OUT, FILEKEY + '-lembar-frame.png'), Buffer.from(b64, 'base64'));
}

/* ---------------- validasi ---------------- */
function validasi(jadwal, cap, audio) {
  const hasil = [];
  const cek = (nama, ok, info) => hasil.push({ nama, ok: !!ok, info: info == null ? '' : String(info) });
  const frameTarget = Math.ceil(jadwal.totalMd * FPS / 1000 - 1e-9);
  cek('jumlah frame = ceil(total durasi × fps)', cap.frame.length === frameTarget && jadwal.frameTotal === frameTarget, cap.frame.length + ' / ' + frameTarget);
  const urut = cap.frame.every((x, i) => x[0] === i);
  cek('frame berurutan tanpa celah', urut);
  jadwal.scene.forEach((s) => {
    const fr = cap.frame.slice(s.frame.awal, s.frame.awal + s.frame.jumlah);
    cek('scene global ' + s.n + ' ter-capture (DOM ' + s.kelompok.attr + '=' + s.kelompok.localN + ')', fr.length > 0 && fr.every((x) => x[1] === s.n), fr.length + ' frame');
    cek('scene ' + s.n + ' frame awal & akhir tersimpan', ['awal', 'akhir'].every((x) => fs.existsSync(path.join(OUT, 'frame', FILEKEY + '-S' + dua(s.n) + '-' + x + '.png'))));
    /* ketukan yang terlihat di frame (capture) = ketukan analisis, ≤ 1 frame */
    s.ketukMd.forEach((b, j) => {
      const f = fr.find((x) => x[3] >= j + 1);
      const tf = f ? f[2] : Infinity;
      cek('scene ' + s.n + ' ketukan ' + (j + 1) + ' terlihat di frame ≤ 1 frame dari jadwal', tf >= b - 1e-6 && tf - b < 1000 / FPS + 1e-6, 'ketukan ' + b + ' md, frame pertama ' + tf.toFixed(1) + ' md');
    });
    let akhir = -Infinity;
    s.segmen.forEach((g) => {
      cek(g.id + ' tidak tumpang tindih dengan segmen sebelumnya', g.mulaiMd >= akhir - 1e-6, 'mulai ' + g.mulaiMd.toFixed(1) + ' md, sebelumnya selesai ' + (isFinite(akhir) ? akhir.toFixed(1) : '-') + ' md');
      g.klip.forEach((k) => cek(g.id + ' posisi sampel = jadwal (≤ 1 frame)', Math.abs(k.sampel / SR * 1000 - k.mulaiGlobalMd) <= 1000 / FPS, (k.sampel / SR * 1000 - k.mulaiGlobalMd).toFixed(3) + ' md'));
      akhir = g.akhirMd;
    });
    cek('scene ' + s.n + ' audio selesai di dalam scene', akhir <= s.panjangMd + 1e-6, 'audio ' + akhir.toFixed(1) + ' / scene ' + s.panjangMd.toFixed(1) + ' md');
  });
  cek('audio: semua klip utuh (selisih ≤ 1 frame dari manifest)', audio.klipTerpotong.length === 0, audio.klipTerpotong.map((x) => x.id).join(', '));
  cek('audio: tidak clipping', audio.puncak <= 1, 'puncak ' + audio.puncak);
  cek('render hanya maju (tidak ada seek mundur)', cap.mundur === 0 && cap.seekTurun.length === 0, 'timeline dengan seek turun: ' + (cap.seekTurun.join(', ') || '-'));
  cap.ui.forEach((u) => cek('scene ' + u.n + ' UI PWA tersembunyi & tanpa animasi jam dinding',
    ['hidden', 'tidak-ada'].includes(u.kembali) && ['hidden', 'tidak-ada'].includes(u.tutup) && ['hidden', 'tidak-ada'].includes(u.narasi) &&
    u.kontrol === 'none' && ['none', 'tidak-ada'].includes(u.panduan) && ['none', 'tidak-ada'].includes(u.kartuAkhir) && u.liar === 0,
  JSON.stringify(u)));
  return hasil;
}

/* ---------------- utama ---------------- */
(async () => {
  const pw = muatPlaywright();
  if (!pw) { log('Playwright tidak tersedia — render dilewati.'); process.exit(2); }
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = bacaManifest(C);
  const jedaMulai = jedaNarator();
  const input = hashInput(C, manifest, BRANDING);
  const ff = TANPA_ENCODE ? { pakai: null, diperiksa: [] } : cariFfmpeg();
  log('Render ' + C.judul + ' → ' + OUT);
  log('encoder: ' + (TANPA_ENCODE ? 'dilewati (--tanpa-encode)' : ff.pakai ? ff.pakai.bin : 'TIDAK ADA ffmpeg dengan libx264 + aac'));
  log('tema: ' + TEMA);
  log('branding: ' + (BRANDING ? BRANDING.logo + ' (logo kanan atas ' + BRANDING.logoTinggi + ' px; watermark ' + BRANDING.watermarkLebar + ' px, opasitas ' + BRANDING.watermarkOpasitas + ')' : 'tidak'));
  ff.diperiksa.forEach((x) => { if (!x.ada) log('  ' + x.bin + ': kurang ' + x.kurang.join(', ')); });

  const srv = await layani();
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const br = await pw.chromium.launch(BROWSER ? { executablePath: BROWSER } : {});
  let kode = 1;
  try {
    const an = await analisis(br, url);
    if (an.scene.length !== C.jumlah) throw new Error('jumlah scene ' + an.scene.length + ' ≠ ' + C.jumlah);
    const jadwal = susunJadwal(an, manifest, jedaMulai);
    log('analisis: ' + an.scene.length + ' scene, total ' + (jadwal.totalMd / 1000).toFixed(3) + ' dtk, ' + jadwal.frameTotal + ' frame');
    const audio = await susunAudio(br, url, jadwal, manifest.folder);
    log('audio: ' + audio.berkas + ' (' + audio.klip + ' klip)');
    const cap = await capture(br, url, jadwal, an, ff.pakai, audio);
    await lembarKontak(br, jadwal);
    const cekHasil = validasi(jadwal, cap, audio);
    const lulus = cekHasil.every((x) => x.ok);
    const video = TANPA_ENCODE ? { berkas: null, status: 'dilewati', alasan: '--tanpa-encode' }
      : ff.pakai ? cap.video
      : { berkas: null, status: 'terblokir', alasan: 'tidak ada ffmpeg dengan libx264 + aac + muxer mp4', diperiksa: ff.diperiksa };
    const meta = {
      versiFormat: VERSI_FORMAT, alat: ALAT, cerita: KUNCI, judul: C.judul, dibuat: new Date().toISOString(),
      chromium: an.versi, tema: TEMA, resolusi: { lebar: LEBAR, tinggi: TINGGI }, halaman: LAYAR, fps: FPS, jedaSceneMd: JEDA_SCENE,
      mesin: MESIN, enkode: enkodeKini(),
      aturanAudio: { jedaAwalNaratorMd: jedaMulai, sumber: 'src/sales-idea-keranjang.js (PSGNarasi: suara.jeda = setTimeout(lanjut, ' + jedaMulai + '))', manifest: manifest.reference, versiManifest: manifest.versi },
      renderCss: C.css,
      branding: BRANDING ? Object.assign({ filter: filterBranding(BRANDING), diterapkan: !!(ff.pakai && !TANPA_ENCODE) }, BRANDING) : null,
      totalMd: jadwal.totalMd, frameTotal: jadwal.frameTotal,
      scene: jadwal.scene,
      audio, video,
      frameLog: FILEKEY + '.frame.json',
      bukti: { ui: cap.ui, seekPerTimeline: cap.seekPerTimeline, seekTurun: cap.seekTurun },
      validasi: { lulus, cek: cekHasil },
      input,
      waktuRenderDetik: +((Date.now() - t0) / 1000).toFixed(1)
    };
    fs.writeFileSync(path.join(OUT, FILEKEY + '.frame.json'), JSON.stringify({ kolom: ['frame', 'sceneGlobal', 'tauMd', 'ketuk', 'sha1png'], frame: cap.frame }));
    fs.writeFileSync(path.join(OUT, FILEKEY + '.json'), JSON.stringify(meta, null, 1));
    cekHasil.filter((x) => !x.ok).forEach((x) => log('  GAGAL ' + x.nama + ' — ' + x.info));
    log('validasi: ' + cekHasil.filter((x) => x.ok).length + '/' + cekHasil.length + ' lulus');
    log('video: ' + video.status + (video.alasan ? ' — ' + video.alasan : '') + (video.berkas ? ' (' + video.berkas + ')' : ''));
    log('waktu render: ' + meta.waktuRenderDetik + ' dtk; metadata: ' + path.join(OUT, FILEKEY + '.json'));
    kode = !lulus ? 1 : video.status === 'dibuat' || video.status === 'dilewati' ? 0 : video.status === 'terblokir' ? 4 : 1;
  } catch (e) {
    console.error('GAGAL: ' + (e && e.stack || e));
    kode = 1;
  } finally {
    await br.close();
    srv.close();
  }
  process.exit(kode);
})();
