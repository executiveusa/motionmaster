#!/usr/bin/env bash
# push-to-final-home.sh — move this repository to its final home.
#
#   GITHUB_TOKEN=ghp_... scripts/push-to-final-home.sh [--dry]
#
# The final home is executiveusa/motionmaster. It currently holds one README
# commit, so this replaces it with the real history: the remote becomes
# `origin`, and the old repository stays behind as `motion-master-` in case
# anything needs to be fetched from it.
#
# The push is a force push with a lease pinned to the commit it is replacing,
# so it refuses to run if anyone has pushed to the target since it was
# checked.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${MOTION_MASTER_FINAL_REPO:-https://github.com/executiveusa/motionmaster.git}"
OLD="${MOTION_MASTER_OLD_REPO:-https://github.com/executiveusa/motion-master-.git}"
# The commit the target is at right now. The lease is pinned to it, so a
# push by somebody else in the meantime stops this one instead of being
# overwritten.
LEASE="${MOTION_MASTER_FINAL_LEASE:-7f72974d151ce3e19cbbed537e11fa39c77a6ae4}"

DRY=0
[ "${1:-}" = "--dry" ] && DRY=1

TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
if [ "$DRY" != "1" ] && [ -z "$TOKEN" ]; then
  cat >&2 <<'MSG'
No token.

Set GITHUB_TOKEN to a fine-grained token with "Contents: read and write" on
executiveusa/motionmaster, then run this again:

    GITHUB_TOKEN=github_pat_... scripts/push-to-final-home.sh

The token is used for the push only and is never written into the
repository.
MSG
  exit 1
fi

cd "$REPO"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is not installed. Install it, or use git with a credential helper." >&2
  exit 1
fi

echo "==> remotes"
git remote remove origin 2>/dev/null || true
git remote add origin "$TARGET"
git remote add motion-master- "$OLD" 2>/dev/null || git remote set-url motion-master- "$OLD"
git remote -v

echo "==> history"
git log --oneline -1
git count-objects -vH | grep -E "size-pack|count" || true

if [ "$DRY" = "1" ]; then
  echo "==> dry run: nothing was pushed"
  exit 0
fi

echo "==> authenticating"
printf '%s' "$TOKEN" | gh auth login --hostname github.com --git-protocol https --with-token >/dev/null
gh auth setup-git >/dev/null

echo "==> pushing"
git push --force-with-lease=main:"$LEASE" origin main

echo "==> done"
git ls-remote --heads origin
