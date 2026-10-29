# Sirio / TEIN AI integration (branch `integrate/sirio-voice-sync`)

What was added, all local-only and MIT with attribution (see each NOTICE.md and LICENSE):

1. Three skills in `plugins/motion-master/skills/`: `board-sync` (words -> board timing -> frame-exact Chrome + FFmpeg render,
   QA report, Resolve/Premiere timelines), `explainer-board-brief`, `explainer-board-system`.
   Source: github.com/sirioberati/YouTube-AI-Motion-Graphics.
2. 187 reference boards in `library/boards/sirio-explainer-boards/` (from github.com/sirioberati/YouTube-AI-Video-Editing-System,
   deduplicated against the first repo by filename; outside the 3,988-item catalogue, which is unchanged).

Setup for board-sync: `bash setup.sh` (venv + pip, downloads packages; a ~1.6 GB whisper model only if no words.tsv is given),
then `bash fetch-gsap.sh` (GSAP is GreenSock's own licence, so it is not committed).
Check: `skills/board-sync/selftest/run.sh` (synthetic media, offline after setup).

Limits: board-sync inputs are `.m-root` Design-Component boards (made with a design assistant), not the reference boards.
Not wired into the MCP server yet. setup.ps1 (Windows) is untested. No whisper transcription run was tested here.
