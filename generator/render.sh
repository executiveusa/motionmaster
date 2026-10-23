#!/usr/bin/env bash
# render.sh — render a HyperFrames composition in this sandbox.
#
#   generator/render.sh <composition-dir> [output.mp4] [extra hyperframes args...]
#
# The sandbox has no GPU, two CPU cores, and a Chrome that is not on the PATH.
# This script finds the Chrome, points HyperFrames at it, and keeps the render
# to one worker so it fits in the memory limit.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"

COMPOSITION="${1:?usage: render.sh <composition-dir> [output.mp4]}"
OUTPUT="${2:-}"
shift 2 || shift 1 || true

# --- find a Chrome ---------------------------------------------------------
# The sandbox's Chrome paths have moved before, so search a chain rather than
# hard-coding one. Set HYPERFRAMES_BROWSER_PATH to override.
find_chrome() {
  if [ -n "${HYPERFRAMES_BROWSER_PATH:-}" ] && [ -x "$HYPERFRAMES_BROWSER_PATH" ]; then
    echo "$HYPERFRAMES_BROWSER_PATH"; return
  fi
  for c in \
    "$REPO/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell" \
    "/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell" \
    "$HOME/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell" \
    "/opt/google/chrome/chrome" \
    "/usr/bin/chromium" \
    "/usr/bin/google-chrome" \
    "/usr/local/bin/chrome" \
    "/usr/local/bin/chrome-headless-shell"
  do
    for m in $c; do
      [ -x "$m" ] && { echo "$m"; return; }
    done
  done
  return 1
}

CHROME="$(find_chrome || true)"
if [ -z "$CHROME" ]; then
  echo "No Chrome found. Set HYPERFRAMES_BROWSER_PATH to a chrome-headless-shell binary." >&2
  exit 1
fi
export HYPERFRAMES_BROWSER_PATH="$CHROME"

# --- make sure the composition loads GSAP locally --------------------------
mkdir -p "$COMPOSITION"
if [ ! -f "$COMPOSITION/gsap-3.14.2.min.js" ]; then
  cp "$HERE/vendor/gsap-3.14.2.min.js" "$COMPOSITION/gsap-3.14.2.min.js"
fi

# --- run --------------------------------------------------------------------
ARGS=(--workers 1 --no-browser-gpu)
if [ -n "$OUTPUT" ]; then ARGS+=(--output "$OUTPUT"); fi

echo "chrome:  $CHROME"
echo "project: $COMPOSITION"
cd "$REPO"
exec npx --yes hyperframes@0.8.186 render "$COMPOSITION" "${ARGS[@]}" "$@"
