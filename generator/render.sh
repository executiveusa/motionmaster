#!/usr/bin/env bash
# render.sh — render a HyperFrames composition in this sandbox.
#
#   generator/render.sh <composition-dir> [output.mp4] [extra hyperframes args...]
#
# The sandbox has no GPU, two CPU cores, and a Chrome that is not on the PATH.
# This script finds the Chrome, points HyperFrames at it, and keeps the render
# to one worker so it fits in the memory limit.
#
# It is a thin wrapper around hf.sh, which is the one place that knows where
# the Chrome is and how GSAP is loaded locally.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMPOSITION="${1:?usage: render.sh <composition-dir> [output.mp4]}"
OUTPUT="${2:-}"
shift 2 || shift 1 || true

if [ -n "$OUTPUT" ]; then
  exec "$HERE/hf.sh" render "$COMPOSITION" --output "$OUTPUT" "$@"
fi
exec "$HERE/hf.sh" render "$COMPOSITION" "$@"
