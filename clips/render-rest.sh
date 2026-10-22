#!/usr/bin/env bash
# Re-render a subset of the proof clips. Composition name -> clip id is an explicit map;
# deriving the id from the composition name silently drops the hyphen.
set -euo pipefail
cd "$(dirname "$0")"
# Prefer whatever Chrome this machine has; the symlink is sandbox-local.
CHROME="${CHROME_BIN:-}"
if [ -z "$CHROME" ]; then
  for c in /opt/chrome-headless-shell-linux64/chrome-headless-shell /usr/local/bin/chrome-headless-shell \
           "$(command -v chrome-headless-shell 2>/dev/null)"; do
    [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
  done
fi
: "${CHROME:?no Chrome Headless Shell found — set CHROME_BIN}"
OUT_DIR="../site/public/clips"
FLAGS=(--browser-executable="$CHROME" --ignore-certificate-errors --gl=swangle --concurrency=1)
mkdir -p public "$OUT_DIR"

declare -A IDS=(
  [SourceClip]="source-clip"
  [LaunchTitle]="launch-title"
  [KineticType]="kinetic-type"
  [ProductLoop]="product-loop"
  [FootageTitle]="footage-title"
)

render_one () {
  local comp="$1" out="$2" extra="${3:-}"
  echo "-- rendering $comp -> $out"
  npx remotion render "$comp" "$out" "${FLAGS[@]}" $extra
}

# The source clip must exist before the composited clip can read it.
[ -f public/source.mp4 ] || render_one SourceClip public/source.mp4

for comp in "${!IDS[@]}"; do
  [ "$comp" = "SourceClip" ] && continue
  render_one "$comp" "$OUT_DIR/${IDS[$comp]}.mp4"
done

# The same poster timestamps as render-all.sh: frame 0 is an empty canvas on
# three of the four clips, and a poster that shows an empty frame lies.
while read -r id at; do
  [ -z "$id" ] && continue
  ffmpeg -v error -nostdin -y -ss "$at" -i "$OUT_DIR/$id.mp4" -vframes 1 -q:v 3 "$OUT_DIR/$id.jpg"
done <<'TIMES'
launch-title 3.5
kinetic-type 3.4
product-loop 10.5
footage-title 6.0
TIMES
echo "-- done"; ls -la "$OUT_DIR"
