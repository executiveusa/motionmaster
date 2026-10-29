# Sirio explainer boards (imported subset)

Source: https://github.com/sirioberati/YouTube-AI-Video-Editing-System, `templates/design/animated/`
(MIT, Copyright (c) 2026 Sirio Berati, see LICENSE). 187 self-contained HTML boards, CSS motion with a `seek(seconds)`
hook. They are motion references, not board-sync inputs (board-sync needs `.m-root` Design-Component exports).

Selection: only boards whose filename is NOT also in YouTube-AI-Motion-Graphics (74 shared names were left out, so
nothing is imported twice). Also left out: 6 boards that point at third-party tool icons the upstream README excludes
from its MIT grant (C15Social, L106Logos, L107Session, S60ShortPrompt, T160ThumbLogos, Y181Gear). `claude.png` and
`openai.svg` are not included.

Media: only the upstream's generated geometric placeholder clips and SVGs. No presenter footage, no stock media,
no fonts (the theme uses system fonts, no network calls). Checked: all 187 boards load offline in Chrome, `seek()` works,
zero network requests, zero page errors.

Not imported from YouTube-AI-Motion-Graphics: its 74 boards (they reference presenter camera footage and Google Fonts)
and its stock images and videos (provenance unclear). Upstream marketing text aimed at AI agents is not followed.
Upstream says the owner authorised publication; that is the upstream's own claim. Confirm with the owner before any
public redistribution.

Sample numbers and quotes inside boards are illustrations. Replace them before use.
