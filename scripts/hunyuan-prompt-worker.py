#!/usr/bin/env python3
"""OPTIONAL, owner-operated Hunyuan PromptEnhancer local worker.

Requires a separately installed upstream checkout and downloaded model weights.
Motion Master does not redistribute them, download weights, or start this worker.
The Tencent Hunyuan Community License has territory/use restrictions: obtain
owner/legal approval before enabling this optional provider.

Example (after manual upstream installation, permission and model download):
    MOTION_MASTER_HUNYUAN_AGREE_LICENSE=1 \
    MOTION_MASTER_HUNYUAN_UPSTREAM=/opt/PromptEnhancer \
    MOTION_MASTER_HUNYUAN_MODEL=/opt/models/promptenhancer-7b \
    python3 scripts/hunyuan-prompt-worker.py

Serves POST http://127.0.0.1:8789/enhance ONLY.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8789
LIMIT = 8192


def load_model():
    if os.environ.get("MOTION_MASTER_HUNYUAN_AGREE_LICENSE") != "1":
        raise SystemExit("Owner must explicitly review/accept upstream license before enabling.")
    source = Path(os.environ.get("MOTION_MASTER_HUNYUAN_UPSTREAM", "")).expanduser()
    model_dir = Path(os.environ.get("MOTION_MASTER_HUNYUAN_MODEL", "")).expanduser()
    if not source.is_dir() or not (source / "inference" / "prompt_enhancer.py").is_file():
        raise SystemExit("Installed upstream PromptEnhancer checkout is required.")
    if not model_dir.is_dir():
        raise SystemExit("Locally installed model directory is required.")
    sys.path.insert(0, str(source.resolve()))
    from inference.prompt_enhancer import HunyuanPromptEnhancer
    return HunyuanPromptEnhancer(models_root_path=str(model_dir.resolve()), device_map="auto")


class Handler(BaseHTTPRequestHandler):
    model = None

    def respond(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        if self.path != "/enhance":
            return self.respond(404, {"error": "Not found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.respond(400, {"error": "Invalid length"})
        if size < 1 or size > LIMIT:
            return self.respond(413, {"error": "Prompt too large"})
        try:
            data = json.loads(self.rfile.read(size))
            prompt = data.get("prompt")
            if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 6000:
                return self.respond(400, {"error": "Nonempty prompt required"})
            # Upstream inference is image-specific, so the Node adapter must
            # append this result as a visual suggestion, never replace the brief.
            result = self.model.predict(
                prompt_cot=prompt,
                temperature=0.1,
                top_p=0.9,
                max_new_tokens=320,
            )
            if not isinstance(result, str) or not result.strip():
                return self.respond(502, {"error": "Model returned no visual direction"})
            self.respond(200, {"enhanced": result.strip()[:4000]})
        except Exception:
            # Never disclose user prompts, model paths, or stack traces to clients.
            self.respond(502, {"error": "Hunyuan inference failed"})

    def log_message(self, fmt, *args):
        # Avoid recording prompts or response bodies to stdout.
        pass


if __name__ == "__main__":
    model = load_model()
    Handler.model = model
    HTTPServer((HOST, PORT), Handler).serve_forever()
