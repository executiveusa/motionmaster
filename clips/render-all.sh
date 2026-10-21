#!/usr/bin/env bash
# Render every Motion Master proof clip.
#
# Sandbox notes (see docs/03-DESIGN-LOCK.md and agent memory):
#   - remotion.media is blocked, so we point at a local Chrome Headless Shell.
#   - Chrome does not trust the sandbox proxy CA, hence --ignore-certificate-errors.
#   - No GPU, so software rendering (swangle). PNG intermediates avoid gradient banding.
set -euo pipefail

cd "$(dirname "$0")"

CHROME="${CHROME_BIN:-/opt/chrome-headless-shell-linux64/chrome-headless-shell}"
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

# 3. Posters — first frame of each clip, for the contact sheet.
for id in launch-title kinetic-type product-loop footage-title; do
  ffmpeg -v error -y -i "$OUT_DIR/$id.mp4" -vframes 1 -q:v 3 "$OUT_DIR/$id.jpg"
done

echo "── done"
ls -la "$OUT_DIR"
