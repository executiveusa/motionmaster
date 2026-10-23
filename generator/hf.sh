#!/usr/bin/env bash
# hf.sh — run HyperFrames in this sandbox.
#
#   generator/hf.sh check    <project-dir>
#   generator/hf.sh render   <project-dir> [output.mp4]
#   generator/hf.sh snapshot <project-dir> [output-dir] [frames]
#
# HyperFrames is the Apache-2.0 HTML-to-video renderer. It needs a Chrome
# binary, which is not on the PATH here, and it loads GSAP from a local file so
# a render never touches a CDN. This script is the one place that knows both.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
HYPERFRAMES_VERSION="0.8.186"

# --- find a Chrome ---------------------------------------------------------
# The sandbox's Chrome paths have moved before, so search a chain rather than
# hard-coding one. Set HYPERFRAMES_BROWSER_PATH to override.
find_chrome() {
  if [ -n "${HYPERFRAMES_BROWSER_PATH:-}" ] && [ -x "${HYPERFRAMES_BROWSER_PATH}" ]; then
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

COMMAND="${1:?usage: hf.sh <check|render|snapshot> <project-dir> [args...]}"
PROJECT="${2:?usage: hf.sh <check|render|snapshot> <project-dir> [args...]}"
shift 2

# --- make sure the composition loads GSAP locally --------------------------
mkdir -p "$PROJECT"
if [ ! -f "$PROJECT/gsap-3.14.2.min.js" ]; then
  cp "$HERE/vendor/gsap-3.14.2.min.js" "$PROJECT/gsap-3.14.2.min.js"
fi

# --- run --------------------------------------------------------------------
case "$COMMAND" in
  check)
    exec npx --yes "hyperframes@$HYPERFRAMES_VERSION" check "$PROJECT" "$@"
    ;;
  render)
    exec npx --yes "hyperframes@$HYPERFRAMES_VERSION" render "$PROJECT" --workers 1 --no-browser-gpu "$@"
    ;;
  snapshot)
    exec npx --yes "hyperframes@$HYPERFRAMES_VERSION" snapshot "$PROJECT" --no-browser-gpu "$@"
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 2
    ;;
esac
