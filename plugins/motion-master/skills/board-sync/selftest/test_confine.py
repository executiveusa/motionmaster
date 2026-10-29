"""Negative probes (run with the skill's python): F1 browser detection and F3 render network confinement.
Synthetic only. Needs playwright + a chromium (system or bundled). Run: python selftest/test_confine.py"""
import http.server, os, sys, tempfile, threading
from pathlib import Path
SK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SK)); sys.path.insert(0, str(SK / "scripts"))
import importlib
import render as R
import board_sync as B
from playwright.sync_api import sync_playwright

# --- F1: the bundled chromium counts as a launchable browser even when no system Chrome/Edge is on PATH
real_which = B.shutil.which
B.shutil.which = lambda *_a, **_k: None
try:
    found = B.browsers()
finally:
    B.shutil.which = real_which
bundled = B.playwright_chromium()
if bundled:
    assert bundled in found, (bundled, found)
    print("F1 ok: bundled chromium reported:", bundled)
else:
    print("F1 skipped: no bundled chromium installed here")

# --- F3: a board cannot reach the network or files outside the allowed roots
hits = []
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        hits.append(self.path); self.send_response(200); self.send_header("content-type", "image/svg+xml"); self.end_headers()
        self.wfile.write(b"<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>")
    def log_message(self, *a): pass
srv = http.server.HTTPServer(("127.0.0.1", 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_address[1]
with tempfile.TemporaryDirectory() as t:
    t = Path(t).resolve(); allowed = t / "ok"; other = t / "other"; allowed.mkdir(); other.mkdir()
    (allowed / "a.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>")
    (other / "secret.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>")
    page_html = (f"<html><body><img id=a src='{(allowed/'a.svg').as_uri()}'><img id=b src='{(other/'secret.svg').as_uri()}'>"
                 f"<img id=c src='http://127.0.0.1:{port}/net'><script>fetch('http://127.0.0.1:{port}/fetch').catch(()=>{{}});"
                 f"try{{new WebSocket('ws://127.0.0.1:{port}/ws')}}catch(e){{}}</script></body></html>")
    (allowed / "p.html").write_text(page_html)
    os.environ["BOARD_SYNC_FILE_ROOTS"] = str(allowed)
    with sync_playwright() as pw:
        b = R.launch_browser(pw)
        ctx = b.new_context(); blocked = []
        R.C.confine_context(ctx, blocked)
        pg = ctx.new_page(); pg.goto((allowed / "p.html").as_uri(), wait_until="load"); pg.wait_for_timeout(500)
        ok = pg.evaluate("() => ({a: document.getElementById('a').complete && document.getElementById('a').naturalWidth, b: document.getElementById('b').naturalWidth, c: document.getElementById('c').naturalWidth})")
        b.close()
    assert not hits, f"the board reached the network: {hits}"
    assert ok["a"] == 1 and ok["b"] == 0 and ok["c"] == 0, ok
    assert any("secret.svg" in u for u in blocked) and any(f":{port}/net" in u for u in blocked), blocked
    print("F3 ok: network hits 0; allowed file loaded; other-folder file and http blocked:", len(blocked), "blocked")
srv.shutdown()
