#!/usr/bin/env python3
"""Pocket TTS Indonesian -> WAV untuk generator narasi Sales Idea.

Dipanggil oleh tools/narasi/generate.mjs. Membaca daftar tugas JSON,
memuat model SEKALI, lalu menulis satu WAV (PCM 16-bit mono) per segmen.
Tidak memakai API key atau layanan berbayar. Jaringan hanya dipakai
huggingface_hub untuk mengunduh model & suara pada pemakaian pertama
(selanjutnya dari cache Hugging Face lokal).

  python pocket_tts_wav.py --cek
  python pocket_tts_wav.py --model hf://... --suara hf://... --tugas tugas.json --hasil hasil.json

tugas.json : {"tugas": [{"id": "S01-01", "teks": "...", "wav": "/abs/S01-01.wav", "seed": 123}]}
hasil.json : [{"id": "S01-01", "ok": true, "detik": 12.34}, ...]  (ditulis tiap segmen selesai)

Kode keluar: 0 sukses, 2 argumen salah, 3 pocket_tts/torch/numpy tidak
terpasang, 4 model/suara gagal dimuat, 5 ada segmen yang gagal dibuat.
"""
import argparse
import json
import os
import sys
import time
import wave

for _aliran in (sys.stdout, sys.stderr):
    try:
        _aliran.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass


def log(pesan):
    print(pesan, file=sys.stderr, flush=True)


def cek():
    """Periksa pustaka tanpa memuat model (cepat, tanpa jaringan)."""
    try:
        import numpy  # noqa: F401
        import torch
        import pocket_tts  # noqa: F401
    except ImportError as e:
        print(json.dumps({"ok": False, "galat": str(e), "python": sys.version.split()[0]}))
        return 3
    from importlib.metadata import PackageNotFoundError, version
    try:
        versi = version("pocket-tts")
    except PackageNotFoundError:
        versi = "?"
    print(json.dumps({"ok": True, "python": sys.version.split()[0], "pocket_tts": versi, "torch": torch.__version__}))
    return 0


def tulis_json(jalur, isi):
    sementara = jalur + ".part"
    with open(sementara, "w", encoding="utf-8") as f:
        json.dump(isi, f, ensure_ascii=False, indent=1)
    os.replace(sementara, jalur)


def tulis_wav(jalur, audio, sample_rate):
    """float [-1, 1] -> WAV PCM 16-bit mono; kembalikan durasi (detik)."""
    import numpy as np
    x = np.clip(np.asarray(audio, dtype=np.float32).reshape(-1), -1.0, 1.0)
    if not x.size:
        raise ValueError("audio kosong")
    sementara = jalur + ".part"
    with wave.open(sementara, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(sample_rate))
        w.writeframes((x * 32767.0).astype("<i2").tobytes())
    os.replace(sementara, jalur)
    return x.size / float(sample_rate)


def main():
    p = argparse.ArgumentParser(description="Pocket TTS Indonesian -> WAV (generator narasi Sales Idea)")
    p.add_argument("--cek", action="store_true", help="periksa pustaka saja, tanpa memuat model")
    p.add_argument("--model", help="config model, mis. hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml")
    p.add_argument("--suara", help="audio contoh suara (path lokal, https:// atau hf://)")
    p.add_argument("--tugas", help="berkas JSON daftar tugas")
    p.add_argument("--hasil", help="berkas JSON hasil (ditulis bertahap)")
    a = p.parse_args()
    if a.cek:
        return cek()
    if not (a.model and a.suara and a.tugas and a.hasil):
        p.print_usage(sys.stderr)
        log("Galat: --model, --suara, --tugas, dan --hasil wajib diisi.")
        return 2

    try:
        import torch
        from pocket_tts import TTSModel
    except ImportError as e:
        log("Galat: Pocket TTS belum terpasang di Python ini (" + sys.executable + "): " + str(e))
        log("Pasang dengan: " + sys.executable + " -m pip install pocket-tts")
        return 3

    with open(a.tugas, encoding="utf-8") as f:
        tugas = json.load(f)["tugas"]

    t0 = time.time()
    try:
        log("Memuat model " + a.model + " ...")
        model = TTSModel.load_model(config=a.model)
        log("Memuat suara " + a.suara + " ...")
        suara = model.get_state_for_audio_prompt(a.suara)
    except Exception as e:  # noqa: BLE001 - pesan diteruskan apa adanya ke admin
        log("Galat: model/suara gagal dimuat: " + type(e).__name__ + ": " + str(e))
        return 4
    log("Model siap dalam %.1f dtk (sample rate %d Hz)." % (time.time() - t0, model.sample_rate))

    hasil, gagal = [], 0
    for i, t in enumerate(tugas, 1):
        mulai = time.time()
        try:
            torch.manual_seed(int(t["seed"]))
            audio = model.generate_audio(suara, t["teks"])
            detik = tulis_wav(t["wav"], audio.detach().cpu().numpy(), model.sample_rate)
            hasil.append({"id": t["id"], "ok": True, "detik": round(detik, 3)})
            log("[%d/%d] %s: %.1f dtk audio (%.1f dtk proses)" % (i, len(tugas), t["id"], detik, time.time() - mulai))
        except Exception as e:  # noqa: BLE001
            gagal += 1
            hasil.append({"id": t["id"], "ok": False, "galat": type(e).__name__ + ": " + str(e)})
            log("[%d/%d] %s: GAGAL, %s: %s" % (i, len(tugas), t["id"], type(e).__name__, e))
        tulis_json(a.hasil, hasil)
    return 5 if gagal else 0


if __name__ == "__main__":
    sys.exit(main())
