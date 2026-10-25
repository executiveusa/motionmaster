#!/usr/bin/env python3
"""Rewrite the landing page: new hero, two scroll scenes, less text.

Surgical: every section is replaced by id, so the parts that work (the
contact sheet, the console, the sound browser, the library) are left alone.
"""
import re
import sys

PATH = 'index.html'
html = open(PATH, encoding='utf-8').read()


def section_span(src, sid):
    """Return (start, end) of the <section> whose id="sid"."""
    m = re.search(r'<section[^>]*id="%s"[^>]*>' % re.escape(sid), src)
    if not m:
        raise SystemExit('section not found: ' + sid)
    start = m.start()
    # take the whole line, so the indentation is not doubled
    line_start = src.rfind('\n', 0, start) + 1
    if src[line_start:start].strip() == '':
        start = line_start
    # find the matching </section> by counting <section ...> / </section>
    depth = 0
    for tok in re.finditer(r'<section\b|</section>', src[start:]):
        if tok.group(0) == '<section':
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return start, start + tok.end()
    raise SystemExit('unbalanced section: ' + sid)


def replace_section(src, sid, new):
    a, b = section_span(src, sid)
    return src[:a] + new + src[b:]


def replace_by_marker(src, marker, new):
    i = src.index(marker)
    return src[:i] + new + src[i:]


# ── 1. the hero ───────────────────────────────────────────────────────────────
HERO = '''      <section class="hero" id="top" aria-labelledby="hero-title">
        <div class="shell hero__body">
          <h1 class="display" id="hero-title">Describe the video.<br />Get the file.</h1>
          <p class="hero__lede">
            Describe a video in a sentence. An agent writes it in code and renders the file.
          </p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="#console">Describe a video</a>
            <a class="btn btn--quiet btn--link" href="#library">Browse the library</a>
          </div>
        </div>

        <figure class="hero__film">
          <video
            class="hero__video"
            data-film
            src="/film/motion-master-hero.mp4"
            poster="/film/hero-poster.jpg"
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            aria-label="A motion film: a brief becomes a shot list, the shot list becomes code, the code renders a file."
          ></video>
          <figcaption class="hero__caption">
            <p class="hero__brief">The brief: make a launch film.</p>
            <p class="hero__meta">104 seconds · 1920×1080</p>
          </figcaption>
        </figure>
      </section>'''

html = replace_section(html, 'top', HERO)

# ── 2. the three demo films become a scroll scene ────────────────────────────
REEL = '''      <section class="scene scene--reel" id="demos" data-scene="reel" data-options='{"hold":3}' aria-labelledby="demos-title">
        <div class="scene-stage">
          <h2 class="scene__title" id="demos-title">The same brief, three ways.</h2>

          <div class="scene__strip">
            <figure class="scene__frame">
              <video
                class="scene__video"
                data-demo
                src="/demos/blueprint.mp4"
                poster="/demos/blueprint.jpg"
                muted
                loop
                playsinline
                preload="none"
                aria-label="A blueprint drawing on a drafting table: the shot list is drawn in plan, the shots fill in, and a hand signs the title block."
              ></video>
              <figcaption class="scene__label">Blueprint</figcaption>
            </figure>

            <figure class="scene__frame">
              <video
                class="scene__video"
                data-demo
                src="/demos/ink.mp4"
                poster="/demos/ink.jpg"
                muted
                loop
                playsinline
                preload="none"
                aria-label="Black ink on paper: a stroke draws itself into a title, the ink blooms and settles, and the paper takes the mark."
              ></video>
              <figcaption class="scene__label">Ink</figcaption>
            </figure>

            <figure class="scene__frame">
              <video
                class="scene__video"
                data-demo
                src="/demos/whiteboard.mp4"
                poster="/demos/whiteboard.jpg"
                muted
                loop
                playsinline
                preload="none"
                aria-label="A whiteboard: a marker writes a plan, boxes and arrows appear around it, and the plan is signed off."
              ></video>
              <figcaption class="scene__label">Whiteboard</figcaption>
            </figure>
          </div>

          <p class="scene__caption">Each one is made with a different skill in the pack.</p>
        </div>
      </section>'''

html = replace_section(html, 'demos', REEL)

# ── 3. the source, before the console ────────────────────────────────────────
SOURCE = '''      <section class="scene scene--source" id="source" data-scene="source" data-options='{"hold":2}' aria-labelledby="source-title">
        <div class="scene-stage">
          <h2 class="scene__title" id="source-title">The picture is code you can read.</h2>

          <div class="scene__split">
            <div class="scene__film">
              <video
                class="scene__video"
                src="/clips/launch-title.mp4"
                poster="/clips/launch-title.jpg"
                muted
                loop
                playsinline
                preload="none"
                aria-label="A white title card. A wordmark rises into a masked reveal, an accent rule draws in beneath it, the card holds, then fades out and lifts."
              ></video>
            </div>

            <div class="scene__code">
              <p class="scene__code-file">clips/src/LaunchTitle.tsx</p>
              <pre class="scene__code-body"><code><span class="scene__code-line">const wordmark = enter(26, 22);</span>
<span class="scene__code-line">const rule = interpolate(frame, [48, 70], [0, 1], {</span>
<span class="scene__code-line">  extrapolateLeft: &quot;clamp&quot;,</span>
<span class="scene__code-line">  extrapolateRight: &quot;clamp&quot;,</span>
<span class="scene__code-line">  easing: Easing.bezier(...MOTION.easeEnter),</span>
<span class="scene__code-line">});</span>
<span class="scene__code-line"> </span>
<span class="scene__code-line">const exitFrom = durationInFrames - 30;</span>
<span class="scene__code-line">const exit = interpolate(frame,</span>
<span class="scene__code-line">  [exitFrom, durationInFrames], [0, 1], {</span>
<span class="scene__code-line">  easing: Easing.bezier(...MOTION.easeExit),</span>
<span class="scene__code-line">});</span></code></pre>
            </div>
          </div>
        </div>
      </section>

'''

_a, _b = section_span(html, 'console')
html = html[:_a] + SOURCE + html[_a:]

open(PATH, 'w', encoding='utf-8').write(html)
print('hero, reel scene and source scene written')
