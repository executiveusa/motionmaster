# Handoff — push this repository to its final home

**Read this first. It is the whole job.**

## The situation

`executiveusa/motionmaster` is the final home. It currently holds **one commit**:

```
7f72974d151ce3e19cbbed537e11fa39c77a6ae4  refs/heads/main
```

That commit is a README saying *"motion grapics plug in for claude and codex"*. Nothing
else has ever been pushed there.

**This repository has not been pushed anywhere.** The old remote,
`executiveusa/motion-master-`, is also at its own original commit (`32a4a6c`) and does
**not** contain the work. The only copy of the work is the git history in this working
tree.

## The job

Push this repository's history and tree to `executiveusa/motionmaster`, making it the
final home.

## How

```bash
cd /workspace/motion-master
GITHUB_TOKEN=<a fine-grained token with Contents: read and write on executiveusa/motionmaster> \
  scripts/push-to-final-home.sh
```

The script does the whole thing:

1. authenticates `gh` with the token (`--with-token`, so the token is never on a command
   line);
2. points `origin` at `https://github.com/executiveusa/motionmaster.git` and keeps the old
   repository behind as the remote `motion-master-`;
3. prints the remotes, the HEAD and the pack size;
4. force-pushes `main` **with a lease pinned to `7f72974`** — the exact commit it
   replaces. If anybody has pushed to the target since that was checked, the push
   **refuses** instead of overwriting their work. That is deliberate: it is a
   force push, and the lease is the only thing standing between it and someone else's
   commit;
5. prints the remote heads afterwards, so the result can be checked.

`gh` is already installed (`/usr/local/bin/gh`, v2.63.2). `git` is configured with
`http.sslVerify=false` for this sandbox.

### If the script refuses

That means the target moved. Look at what is there first:

```bash
git ls-remote --heads https://github.com/executiveusa/motionmaster.git
git fetch origin main && git log --oneline origin/main -3
```

If the new commit is only a README edit, re-run with the lease updated:

```bash
GITHUB_TOKEN=... MOTION_MASTER_FINAL_LEASE=<new-commit-sha> scripts/push-to-final-home.sh
```

## After the push — check these

```bash
git ls-remote --heads https://github.com/executiveusa/motionmaster.git   # main == 79af783
git clone https://github.com/executiveusa/motionmaster.git /tmp/check && cd /tmp/check
git log --oneline -3            # 26 commits, newest first
ls                             # the tree
du -sh .                       # about 190 MB, most of it sound and film
```

The clone must have the files, not just the commits:

```bash
ls library/sfx/earshot | wc -l      # 252
ls library/sfx/uisfx/sounds         # 12 packs
ls site/public/film                 # the hero film
```

## Do not

- **do not push to `executiveusa/motion-master-`** — that repository is the old home
  and is kept only for reference;
- **do not delete the old remote** — `scripts/push-to-final-home.sh` keeps it as
  `motion-master-` on purpose;
- **do not commit the bundle** (`/workspace/motion-master.bundle`, 160 MB) — it is a
  recovery artefact, not source;
- **do not re-run `git gc --aggressive`** — it takes minutes and the pack is already
  compact at 153 MB.

## If this working tree has been lost

The whole history is in one file — a **git bundle**, which carries every commit and the
whole tree:

```bash
git clone motion-master.bundle recovered
cd recovered && git checkout main
git remote add origin https://github.com/executiveusa/motionmaster.git
# then push as above
```

The bundle is 160 MB, so it travels as five parts. Put them in one directory and
reassemble:

```bash
cat motion-master.bundle.part* > motion-master.bundle
sha256sum -c SHA256SUMS.txt
```

The bundle's own checksum is `71b8f5e291cca9c7f8368a28ae2b2e4cefec8b04ca4c8854818a88a8359f6ccf`.
The reassembly has been verified byte-for-byte.

If the bundle is not reachable either, the **working tree** is in the same place as the
bundle: copy `motion-master/` and run `git init && git add -A` — the files are the
product, and the history is a nicety.

## What the repository is

Motion Master: a motion-design agent for ChatGPT, Codex, Claude and Cursor. It
storyboards, choreographs and renders motion design in code, and hands back a finished
video, the project and the source.

- **19 MCP tools** and **38 bundled skills** — the plugin an agent installs.
- **A console on the front page** — click or chat, and the agent makes the film.
- **A library of 3,988 prompts** in 756 categories, every item carrying its licence.
- **1,470 sound effects** in 35 kinds, from three sources, normalised to one level.
- **A HyperFrames generator** that builds a film, gates it and renders an MP4.

The verified state is in `docs/` — `13-THE-CONSOLE.md`, `15-THE-SOUND.md`,
`09-RELEASE-REPORT.md` — and in the gate scripts.
