#!/usr/bin/env python3
"""
render-earshot.py — render earshot's bank into sound files.

    python3 scripts/render-earshot.py [--repo <path>] [--out <dir>]

earshot stores its sounds as *recipes* — a render function, its parameters, a
seed — not as audio files. The bank is 252 sounds in 43 families, all made in
code by the MIT-licensed upstream. This script renders each one to a WAV and
writes the catalogue entries beside it.

The rendered files are what the site plays and what a film mixes. The recipes
stay in the catalogue, so any sound can be re-rendered with different
parameters — a faster whoosh, a lower hit — without the catalogue going stale.

Upstream: https://github.com/Leonxlnx/earshot (MIT, Leon Lin).
The vendored bank lives in library/sfx-earshot-bank/.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
UPSTREAM = Path(os.environ.get("EARSHOT_SRC", REPO / "library" / "sfx-earshot" / "earshot")).resolve()

BANK_FILES = ["forge_v2.json", "forge04.json", "fit.json", "pluck.json"]


def load_bank(upstream: Path):
    """Load the bank files the way earshot does, and keep the categories."""
    # `upstream` is the package directory itself, so its parent goes on the
    # path — the package is imported as `earshot`.
    sys.path.insert(0, str(upstream.parent))
    from earshot.forge import bank  # noqa: E402

    bank.reload()
    return bank


def write_wav(path: Path, samples, sr: int) -> int:
    """Write mono 16-bit PCM. Stereo whooshes lose their width; mono does not
    lose their shape, and the film's mix places them anyway."""
    import numpy as np

    data = np.asarray(samples, dtype="float32")
    if data.ndim > 1:
        data = data.mean(axis=1)
    peak = float(np.max(np.abs(data))) if data.size else 0.0
    if peak > 0:
        data = data / peak * 0.999
    pcm = (data * 32767.0).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sr)
        handle.writeframes(pcm.tobytes())
    return path.stat().st_size


def encode_mp3(wav_path: Path, mp3_path: Path) -> int:
    """Encode a rendered sound to mp3, and return its size."""
    import subprocess

    subprocess.run(
        [
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(wav_path),
            "-ar", "44100", "-ac", "1", "-b:a", "128k",
            str(mp3_path),
        ],
        check=True,
    )
    return mp3_path.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=str(REPO))
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    out_dir = Path(args.out) if args.out else repo / "library" / "sfx" / "earshot"
    upstream = UPSTREAM

    if not (upstream / "forge").exists():
        print(f"earshot is not vendored at {upstream}", file=sys.stderr)
        print("clone https://github.com/Leonxlnx/earshot there, or set EARSHOT_SRC", file=sys.stderr)
        return 1

    bank = load_bank(upstream)
    from earshot.forge.dsp import SR  # noqa: E402

    out_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    ids = list(bank.ids())

    for index, sound_id in enumerate(ids, start=1):
        try:
            # checks=False skips re-rendering the entry to compare
            # fingerprints. The bank ships verified; we are rendering, not
            # auditing.
            rendered = bank.render(sound_id, checks=False)
        except Exception as error:  # noqa: BLE001 - one bad sound must not stop the bank
            print(f"  ! {sound_id}: {error}", file=sys.stderr)
            continue

        samples = rendered[0] if isinstance(rendered, tuple) else rendered
        entry = bank.get(sound_id)
        info = bank.category_info(entry["category"]) if "category" in entry else {}

        slug = sound_id.replace("/", "_")
        # The bank is code, so the WAV is a master and the catalogue keeps the
        # recipe. What ships is the mp3: a fifth of the bytes, and the
        # browser plays it without a decoder.
        wav_path = out_dir / f"{slug}.wav"
        mp3_path = out_dir / f"{slug}.mp3"
        write_wav(wav_path, samples, SR)
        size = encode_mp3(wav_path, mp3_path)
        wav_path.unlink(missing_ok=True)

        meta = entry.get("meta", {}) or {}
        entries.append(
            {
                "id": sound_id,
                "source": "earshot",
                "sourceKind": entry.get("category"),
                "member": entry.get("member"),
                "recipe": entry.get("recipe"),
                "target": info.get("target"),
                "use": info.get("use"),
                "kinds": info.get("kinds", entry.get("kinds", [])),
                "notes": entry.get("notes"),
                "durationMs": round(float(meta.get("dur_s", 0)) * 1000),
                "onsetMs": round(float(meta.get("onset_s", 0)) * 1000, 2),
                "peakMs": round(float(meta.get("peak_s", 0)) * 1000, 2),
                "attackMs": round(float(meta.get("attack_ms", 0)), 2),
                "centroidHz": meta.get("centroid_hz"),
                "lufs": meta.get("lufs_m_max"),
                "peakDb": entry.get("peak_db", -1.0),
                "seed": entry.get("seed"),
                "params": entry.get("params"),
                "fn": entry.get("fn", "render"),
                "file": f"sfx/earshot/{slug}.mp3",
                "bytes": size,
            }
        )
        if index % 25 == 0:
            print(f"  {index}/{len(ids)}", file=sys.stderr)

    catalogue = repo / "library" / "sfx-earshot.json"
    catalogue.write_text(
        json.dumps(
            {
                "generated": "scripts/render-earshot.py",
                "source": "https://github.com/Leonxlnx/earshot",
                "licence": "MIT (Leon Lin) — the bank is code, not recordings",
                "count": len(entries),
                "entries": entries,
            },
            indent=1,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"rendered {len(entries)} sounds to {out_dir}")
    print(f"catalogue: {catalogue}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
