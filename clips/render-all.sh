#!/usr/bin/env bash
# Render every Motion Master proof clip.
#
# Sandbox notes (see docs/03-DESIGN-LOCK.md and agent memory):
#   - remotion.media is blocked, so we point at a local Chrome Headless Shell.
#   - Chrome does not trust the sandbox proxy CA, hence --ignore-certificate-errors.
#   - No GPU, so software rendering (swangle). PNG intermediates avoid gradient banding.
set -euo pipefail

cd "$(dirname "$0")"

# Prefer whatever Chrome this machine has. The /opt and /usr/local copies are
# sandbox-local and disappear when the sandbox is recycled; the workspace copy
# is the durable one.
CHROME="${CHROME_BIN:-}"
if [ -z "$CHROME" ]; then
  for c in /opt/chrome-headless-shell-linux64/chrome-headless-shell \
           /usr/local/bin/chrome-headless-shell \
           "${HOME:-/workspace/.home}/chrome/chrome-headless-shell-linux64/chrome-headless-shell" \
           /workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell; do
    [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
  done
fi
: "${CHROME:?no Chrome Headless Shell found — set CHROME_BIN}"
OUT_DIR="${OUT_DIR:-../site/public/clips}"
BROWSER_FLAGS=(--browser-executable="$CHROME" --ignore-certificate-errors --gl=swangle --concurrency=1)

mkdir -p public "$OUT_DIR"

render () {
  local comp="$1" out="$2" extra="${3:-}"
  echo "── rendering $comp"
  npx remotion render "$comp" "$out" "${BROWSER_FLAGS[@]}" $extra
}

# 1. The source clip must exist before the composited clip can read it.
render SourceClip public/source.mp4

# 2. The four gallery clips.
render LaunchTitle   "$OUT_DIR/launch-title.mp4"
render KineticType   "$OUT_DIR/kinetic-type.mp4"
render ProductLoop   "$OUT_DIR/product-loop.mp4"
render FootageTitle  "$OUT_DIR/footage-title.mp4"

# 3. Posters — a representative frame of each clip, for the contact sheet.
#    NOT frame 0: several clips start on an empty canvas, and a poster that
#    shows an empty frame is a lie about what the clip contains. The second
#    value is the seek time in seconds.
while read -r id at; do
  [ -z "$id" ] && continue
  ffmpeg -v error -y -ss "$at" -i "$OUT_DIR/$id.mp4" -vframes 1 -q:v 3 "$OUT_DIR/$id.jpg"
done <<'TIMES'
launch-title 3.5
kinetic-type 3.4
product-loop 10.5
footage-title 6.0
TIMES

echo "── done"
ls -la "$OUT_DIR"
