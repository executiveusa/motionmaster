#!/usr/bin/env bash
# Fetch GSAP 3.14.2 from the npm registry into assets/gsap.min.js (git-ignored, never committed).
# GSAP is (c) GreenSock and is under its own standard licence, not this skill's MIT licence:
# https://gsap.com/standard-license/  Read it before redistributing a build that contains it.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
(cd "$T" && npm pack gsap@3.14.2 --silent && tar -xzf gsap-3.14.2.tgz package/dist/gsap.min.js)
mkdir -p assets && cp "$T/package/dist/gsap.min.js" assets/gsap.min.js
echo "gsap.min.js written to $(pwd)/assets"
