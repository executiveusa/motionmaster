# Animated board library

> **Style these yourself.** These are starter templates, not a finished visual identity. Customize the colors, fonts, shapes, and layouts for your own videos. Adapt the animation examples to your content.

Run `python3 -m http.server 5331 --directory templates/design` from the repository root, then open `http://localhost:5331/animated/`. It includes a searchable list of **267 boards**, Play/Pause, Replay, a scrubber, and previous/next navigation. GitHub displays HTML source; clone/download the repo and use the local server to play it. Opening the player directly as a file is not supported because browsers restrict frame scripting across file URLs. Individual board files can still be opened directly.

## What is preserved

The supplied HTML library's layout structure, CSS keyframe names, animation declarations, timings, easing, and effects remain. The library includes process diagrams, charts, code, comparisons, typography, reveals, masks, motion studies, and static layout references. **246 boards have active browser animations**; the remaining 21 are static/reference layouts. Not every file is an animation.

The library is a collection of examples, not an approved video timeline. Some studies include bounce, zoom, or other strong effects; use only those explicitly appropriate for your production. They do not change the workflow's default no-zoom/no-SFX policy.

## What changed

Personal names, handles, community promotions, project links, logos, screenshots, and identifiable footage were removed or replaced with placeholders. The owner's signature palette, display/handwritten fonts, dotted canvas, marker highlights, heavy outlines, hard shadows, and sticker treatment were replaced by a generic editorial theme. System fonts require no download. Third-party tool names/icons remain in relevant tool examples; those are not the owner's branding.

Sample footage is now two locally generated geometric clips, and camera/screenshot/reference slots use neutral placeholder SVGs. Effects still operate on the original slots. Replace the sample media with your own cleared assets. Example quotes, numbers, and claims describe layouts, not independently verified findings.

## Style and motion are separate

- `theme.css`: shared typography, backgrounds, surfaces, borders, and camera treatment. Start styling here.
- `boards/*.html`: individual layout/content and original keyframes. Some original style values are inline; change those when customizing more deeply.
- `playback.js`: preview clock adapter for native CSS animations and video slots.
- `catalog.js` / `catalog.json`: board list. Update both if adding or renaming boards.
- `assets/`: neutral SVG/video placeholders and two third-party tool icons.

Standalone board pages autoplay their original CSS loops. The gallery controls time with `window.seek(seconds)` through the Web Animations API. Export at the board's native dimensions (typically 1920 × 1080; vertical studies use 1080 × 1920). Check original dimensions before rendering. Media seeking is asynchronous: validate video-bearing renders frame by frame before production; CSS-only templates are the simplest starting point.

Do not use the reference-camera box itself in a finished video. Replace it with your camera layer or remove the guide after checking its clearance. Final-cut narration and source clips remain separate and unchanged.

## License and assets

The repository owner supplied and authorized publication of these adapted HTML board examples. They follow the repository's MIT code/template license. Newly generated placeholder SVGs and clips are also included under that license. The two third-party tool icons (`openai.svg`, `claude.png`) are supplied only to identify tools in examples and are excluded from the MIT grant; their owners retain their rights. No private SKILL.md source content is bundled.
