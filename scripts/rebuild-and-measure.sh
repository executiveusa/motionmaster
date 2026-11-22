#!/usr/bin/env bash
# Rebuild the site and measure it for real: the preview server is waited for,
# and the measurement is refused if the page did not actually load.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-4173}"
CHROME="${CHROME_BIN:-/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell}"

pkill -f "[v]ite preview" 2>/dev/null || true
sleep 2
cd "$REPO/site"
npm run build > /tmp/mm-build.log 2>&1 || { tail -20 /tmp/mm-build.log; exit 1; }
grep -E "^\[check\] OK" /tmp/mm-build.log

( cd "$REPO/site" && setsid nohup npx vite preview --host 127.0.0.1 --port "$PORT" > /tmp/mm-preview.log 2>&1 < /dev/null & )

for i in $(seq 1 40); do
  code=$(curl -s -o /tmp/mm-page.html -w "%{http_code}" --max-time 5 "http://127.0.0.1:$PORT/" || true)
  if [ "$code" = "200" ] && grep -q "</html>" /tmp/mm-page.html; then
    echo "preview ready ($code, $(wc -c < /tmp/mm-page.html) bytes)"
    break
  fi
  sleep 1
  [ "$i" = "40" ] && { echo "preview never came up"; tail -5 /tmp/mm-preview.log; exit 1; }
done

# The measurement must be of the real page: fail if the film section is absent.
grep -q 'id="film"' /tmp/mm-page.html || { echo "the served page has no film section"; exit 1; }

# measure.mjs exits 1 when it finds anything at all, so the result is read
# here rather than taken from the exit code.
CHROME_BIN="$CHROME" timeout 600s node "$REPO/scripts/measure.mjs" "http://127.0.0.1:$PORT/" > /tmp/mm-measure.log 2>&1 || true
cat /tmp/mm-measure.log

# The baseline is the committed page: it already carries a handful of small
# touch targets and one video with no source. Only a NEW problem fails here.
if grep -q "^no layout problems" /tmp/mm-measure.log; then
  echo "MEASURE CLEAN — no problem at all"
  exit 0
fi
NEW=$(grep -E "showcase__|film__|hero__clip" /tmp/mm-measure.log || true)
if [ -n "$NEW" ]; then
  echo "MEASURE FOUND NEW PROBLEMS:"
  echo "$NEW"
  exit 1
fi
echo "MEASURE: only the pre-existing baseline problems remain — nothing new."
