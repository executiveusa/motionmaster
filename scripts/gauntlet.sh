#!/usr/bin/env bash
# MOTION MASTER — the gauntlet, runnable.
#
# The bar is the public marketing surface of motionvideo.xyz. Taste alone drifts upward
# every round, so this carries a measurable half:
#   - the-extractor: objective anti-slop signal counts, same rules on both pages
#   - hard measurements: overflow, contrast, bundle size
#   - a blind A/B capture of both pages at the same viewport
#
# See docs/07-GAUNTLET-PLAN.md for the full bar, the reviewer council and the release gates.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
EXTRACTOR="${EXTRACTOR:-$REPO/.research/the-extractor/extractor.mjs}"
BAR="${BAR:-https://motionvideo.xyz/}"
PORT="${PORT:-4173}"
CHROME="${CHROME:-/usr/local/bin/chrome-headless-shell}"
OUT="$REPO/.review/gauntlet"

mkdir -p "$OUT"

log () { printf '\n\033[1m== %s\033[0m\n' "$1"; }

# ── 0. ours must exist and build ────────────────────────────────────────────────
log "build"
if ! (cd "$REPO/site" && npm run build >"$OUT/build.log" 2>&1); then
  echo "BUILD FAILED — see $OUT/build.log"; exit 1
fi
gzip -c "$REPO"/site/dist/assets/*.js 2>/dev/null | wc -c | awk '{printf "js gzip: %.1f KB\n", $1/1024}'

# ── 1. serve ours ──────────────────────────────────────────────────────────────
log "serve"
(cd "$REPO/site" && npx vite preview --port "$PORT" --strictPort >"$OUT/preview.log" 2>&1) &
PREVIEW_PID=$!
trap 'kill $PREVIEW_PID 2>/dev/null' EXIT
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)
  [ "$code" = "200" ] && break
  sleep 0.5
done
echo "ours: http://127.0.0.1:$PORT/ (HTTP $code)"

# ── 2. the measurable half: slop signals, same rules on both pages ─────────────
log "the-extractor — ours"
node "$EXTRACTOR" audit "http://127.0.0.1:$PORT/" --format json >"$OUT/ours.json" 2>"$OUT/ours.err" \
  && node -e "const d=require('$OUT/ours.json');const f=d.findings||d.results||[];const h=f.filter(x=>x.severity==='high');console.log('signals:',f.length,'high:',h.length);h.forEach(x=>console.log('  [HIGH]',x.id,x.label))" \
  || { echo "extractor could not reach our page:"; head -5 "$OUT/ours.err"; }

log "the-extractor — the bar"
node "$EXTRACTOR" audit "$BAR" --format json >"$OUT/bar.json" 2>"$OUT/bar.err" \
  && node -e "const d=require('$OUT/bar.json');const f=d.findings||d.results||[];const h=f.filter(x=>x.severity==='high');console.log('signals:',f.length,'high:',h.length);h.forEach(x=>console.log('  [HIGH]',x.id,x.label))" \
  || { echo "BAR NOT REACHABLE — the comparison for this surface is UNVERIFIED, not passed."; head -5 "$OUT/bar.err"; }

# ── 3. hard measurements ───────────────────────────────────────────────────────
log "responsive + overflow (CDP)"
cat > "$OUT/measure.mjs" <<'JS'
const base = process.argv[2];
const widths = [320, 375, 390, 430, 768, 1024, 1440];
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
for (const w of widths) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Page.navigate', { url: base });
  await new Promise((r) => setTimeout(r, 1800));
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify({sw:document.documentElement.scrollWidth,iw:window.innerWidth,wide:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).slice(0,4).map(e=>(e.tagName+'.'+(typeof e.className==='string'?e.className:'')).slice(0,60)+'|'+Math.round(e.getBoundingClientRect().right))})`,
  });
  const v = JSON.parse(r.result.value);
  const ok = v.sw <= v.iw;
  console.log(`${String(w).padStart(4)}px  scrollWidth=${v.sw} innerWidth=${v.iw}  ${ok ? 'OK' : 'OVERFLOW ' + JSON.stringify(v.wide)}`);
}
JS

"$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars --remote-debugging-port=9222 --user-data-dir="$OUT/chrome-profile" about:blank >"$OUT/chrome.log" 2>&1 &
CHROME_PID=$!
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:9222/json/version && break; sleep 0.5; done
node "$OUT/measure.mjs" "http://127.0.0.1:$PORT/" 2>&1 | tee "$OUT/overflow.txt"
kill $CHROME_PID 2>/dev/null

# ── 4. blind A/B capture ───────────────────────────────────────────────────────
log "blind capture"
for w in 1440 390; do
  h=$([ "$w" = "1440" ] && echo 900 || echo 844)
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=8000 \
    --window-size=$w,$h --screenshot="$OUT/ours-$w.png" "http://127.0.0.1:$PORT/" >/dev/null 2>&1
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=8000 \
    --window-size=$w,$h --screenshot="$OUT/bar-$w.png" "$BAR" >/dev/null 2>&1
  ls -la "$OUT"/*-$w.png 2>/dev/null
done

log "summary"
echo "ours: $OUT/ours.json  bar: $OUT/bar.json  overflow: $OUT/overflow.txt  shots: $OUT/*.png"
echo "The taste verdict is NOT made by this script. A critic with fresh context puts"
echo "ours-$w.png next to bar-$w.png with the labels stripped and says which is better."
echo "If ours does not win, it keeps going."
