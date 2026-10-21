#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME_BIN:-/usr/local/bin/chrome-headless-shell}"
OUT_DIR="../site/public/clips"
FLAGS=(--browser-executable="$CHROME" --ignore-certificate-errors --gl=swangle --concurrency=1)
mkdir -p public "$OUT_DIR"
for comp in LaunchTitle ProductLoop FootageTitle; do
  id=$(echo "$comp" | tr 'A-Z' 'a-z')
  echo "── rendering $comp"
  npx remotion render "$comp" "$OUT_DIR/$id.mp4" "${FLAGS[@]}"
done
for id in launch-title kinetic-type product-loop footage-title; do
  ffmpeg -v error -y -i "$OUT_DIR/$id.mp4" -vframes 1 -q:v 3 "$OUT_DIR/$id.jpg"
done
echo "── done"; ls -la "$OUT_DIR"
