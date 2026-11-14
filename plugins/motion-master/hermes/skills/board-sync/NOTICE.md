# Notice

board-sync, explainer-board-brief and explainer-board-system are vendored from
https://github.com/sirioberati/YouTube-AI-Motion-Graphics (MIT, Copyright (c) 2026 TEIN AI,
see LICENSE in each skill). Imported unchanged except:

- `assets/gsap.min.js` removed. GSAP is GreenSock's own standard licence. `fetch-gsap.sh` fetches it from npm on demand.
- `scripts/choreo.py`: GSAP path can be set with BOARD_SYNC_GSAP and fails with a clear message when missing.
- `setup.sh`: removed the `curl | sh` uv installer fallback; uses venv + pip when uv is absent.
- `setup.ps1` is unreviewed for this integration and unchanged (Windows only).

TEIN AI branding is excluded from the MIT grant by the upstream README. Upstream marketing text addressed to AI agents is not part of this skill.
Local only: transcription uses faster-whisper on this machine (first run downloads a ~1.6 GB model from Hugging Face), rendering uses local Chrome + FFmpeg. No paid API is called.
