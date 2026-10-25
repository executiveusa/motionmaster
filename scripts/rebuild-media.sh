#!/usr/bin/env bash
# rebuild-media.sh — re-render the proof clips, rebuild the film's frame
# sequences, and re-render the hero film.
#
# Run from the repo root:
#     scripts/rebuild-media.sh
#
# The clips are the product's proof. When a clip's words change, the film that
# plays those frames has to be cut again from the new ones — so this does the
# whole chain, in order, and stops at the first thing that fails.
#
# Sandbox notes (see clips/render-all.sh):
#   - remotion.media is blocked, so Chrome Headless Shell is pointed at by hand;
#   - no GPU, so software rendering (swangle);
#   - ffmpeg reads stdin by default, so -nostdin is always passed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CHROME="${CHROME_BIN:-/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell}"
: "${CHROME:?no Chrome Headless Shell found — set CHROME_BIN}"
CLIPS="$ROOT/site/public/clips"
FRAMES="$ROOT/hero/frames"

step () { printf '\n\033[1m── %s\033[0m\n' "$1"; }

step "1/4  the two clips whose words changed"
cd "$ROOT/clips"
BROWSER_FLAGS=(--browser-executable="$CHROME" --ignore-certificate-errors --gl=swangle --concurrency=1)
npx remotion render KineticType  "$CLIPS/kinetic-type.mp4"  "${BROWSER_FLAGS[@]}"
npx remotion render ProductLoop "$CLIPS/product-loop.mp4" "${BROWSER_FLAGS[@]}"

step "2/4  posters for the two changed clips"
ffmpeg -v error -nostdin -y -ss 3.4 -i "$CLIPS/kinetic-type.mp4" -vframes 1 -q:v 3 "$CLIPS/kinetic-type.jpg"
ffmpeg -v error -nostdin -y -ss 10.5 -i "$CLIPS/product-loop.mp4" -vframes 1 -q:v 3 "$CLIPS/product-loop.jpg"

step "3/4  the film's frame sequences"
rm -rf "$FRAMES"
mkdir -p "$FRAMES"
extract () {
  local mp4="$1" dir="$2"
  mkdir -p "$FRAMES/$dir"
  ffmpeg -v error -nostdin -y -i "$mp4" -start_number 1 "$FRAMES/$dir/%05d.png"
  printf '  %-20s %s frames\n' "$dir" "$(ls "$FRAMES/$dir" | wc -l)"
}
extract "$CLIPS/launch-title.mp4"  launch-title
extract "$CLIPS/kinetic-type.mp4"  kinetic-type-full
extract "$CLIPS/product-loop.mp4"  product-loop
extract "$CLIPS/footage-title.mp4" footage-title

step "4/4  the hero film"
cd "$ROOT/hero"
node render.mjs --out "$ROOT/hero/motion-master-hero.mp4" --fps 30 --duration 104

# The film is served from the site.
cp "$ROOT/hero/motion-master-hero.mp4" "$CLIPS/../film/motion-master-hero.mp4"
ffmpeg -v error -nostdin -y -ss 3.5 -i "$ROOT/hero/motion-master-hero.mp4" -vframes 1 -q:v 3 "$ROOT/site/public/film/hero-poster.jpg"

printf '\n\033[1mdone\033[0m\n'
ls -la "$ROOT/site/public/film"
