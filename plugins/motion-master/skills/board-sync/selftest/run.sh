#!/usr/bin/env bash
# Offline self-test with synthetic media (a sine tone and made-up word times; no speech, no private footage).
# Needs the skill's .venv (setup.sh), ffmpeg, Chrome/Chromium and assets/gsap.min.js (fetch-gsap.sh).
set -euo pipefail
SK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
PY="${BOARD_SYNC_PY:-$SK/.venv/bin/python}"
mkdir -p "$T/02-cut"; cp -r "$SK/selftest/04-boards" "$SK/selftest/03-board-brief" "$T/"
ffmpeg -v error -y -f lavfi -i sine=frequency=220:duration=14 -ar 48000 "$T/02-cut/demo.wav"
cp "$SK/selftest/words.tsv" "$T/02-cut/demo words.tsv"
cd "$T"; "$PY" "$SK/board_sync.py" --boards 04-boards --wav 02-cut/demo.wav --words "02-cut/demo words.tsv" \
  --script 03-board-brief/script-marked.md --brief 03-board-brief/brief.md --out out >/dev/null
"$PY" - <<'PY'
import json
c1=json.load(open("out/cues/01.cues.json")); c1=c1.get("cues",c1) if isinstance(c1,dict) else c1
t={c["text"]:c["t"] for c in c1}
assert abs(t["Working"]-2.55)<0.1 and abs(t["Light pass"]-5.55)<0.1, t   # land on their spoken words
import os
for f in ("board-track.mp4","preview.mp4","timeline.fcpxml","timeline-premiere.xml","qa-report.md"): assert os.path.getsize("out/"+f)>0, f
print("board-sync selftest OK:", t)
PY
