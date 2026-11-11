#!/usr/bin/env bash
# Measure the block pool in chunks. Each call takes the pool as far as it can
# inside the time budget and stops; the next call picks up where it left off,
# because the verdicts are written after every block.
#
#   bash scripts/qualify-chunks.sh [seconds]
set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUDGET="${1:-540}"
export HYPERFRAMES_BROWSER_PATH="${HYPERFRAMES_BROWSER_PATH:-/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell}"

cd "$REPO"
timeout --signal=TERM "${BUDGET}s" node scripts/qualify-blocks.mjs --resume
status=$?

measured=$(node -e "const d=require('./library/block-verdicts.json').verdicts;const ok=Object.values(d).filter(v=>v.ok).length;const sn=Object.values(d).filter(v=>v.reasons.some(r=>r.includes('not_mountable'))).length;console.log(\`\${Object.keys(d).length} measured, \${ok} pass, \${Object.keys(d).length-ok-sn} gate failures, \${sn} snippets\`)")
echo "── $measured (timeout status ${status})"
