#!/usr/bin/env python3
"""Cut the page down.

- The footage section repeated a clip the contact sheet already shows, so it
  goes; the Montage bridge is now answered in the questions.
- The four objections become four questions, because the page already has a
  questions section and two of one thing is worse than one of it.
- Every eyebrow kicker goes. They said the section's name in a smaller voice
  than the heading already says it.
- The tricolons go: "One package. Sixteen hosts. Thirty-eight skills." and
  "One prompt. A skill pack that writes motion in code. A file you own."
"""
import re

PATH = 'index.html'
html = open(PATH, encoding='utf-8').read()


def section_span(src, sid):
    m = re.search(r'<section[^>]*id="%s"[^>]*>' % re.escape(sid), src)
    if not m:
        raise SystemExit('section not found: ' + sid)
    start = m.start()
    line_start = src.rfind('\n', 0, start) + 1
    if src[line_start:start].strip() == '':
        start = line_start
    depth = 0
    for tok in re.finditer(r'<section\b|</section>', src[start:]):
        if tok.group(0) == '<section':
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return start, start + tok.end()
    raise SystemExit('unbalanced: ' + sid)


def cut(src, sid):
    a, b = section_span(src, sid)
    # take the comment line above with it
    head = src.rfind('\n', 0, a - 1) + 1
    if src[head:a].strip().startswith('<!--'):
        a = head
    return src[:a] + src[b:]


# ── 1. the footage section goes ──────────────────────────────────────────────
html = cut(html, 'footage')

# ── 2. the objections go, into the questions ─────────────────────────────────
html = cut(html, 'objections')

NEW_QUESTIONS = '''            <details class="faq__item">
              <summary class="faq__q">
                <h3 class="faq__heading">I don&rsquo;t know how to code.</h3>
              </summary>
              <div class="faq__a">
                <p>
                  You don&rsquo;t. You paste a sentence into your agent and it comes back with a
                  video. If you want to change a word later, you type the change — the project is
                  text, and text is something you can read.
                </p>
              </div>
            </details>

            <details class="faq__item">
              <summary class="faq__q">
                <h3 class="faq__heading">Won&rsquo;t it look like AI?</h3>
              </summary>
              <div class="faq__a">
                <p>
                  The motion rules are ours, and they are opinionated: how long a card holds, how
                  fast it leaves, how far a word travels. They are in the skills, and the skills are
                  in the box, not behind a login. The clips on this page were made with them, and
                  you can read the prompt that made each one.
                </p>
              </div>
            </details>

            <details class="faq__item">
              <summary class="faq__q">
                <h3 class="faq__heading">Do I own it?</h3>
              </summary>
              <div class="faq__a">
                <p>
                  The video, the project and the code. Use it commercially, including for clients.
                  No attribution required.
                </p>
              </div>
            </details>

            <details class="faq__item">
              <summary class="faq__q">
                <h3 class="faq__heading">Why can&rsquo;t I buy it?</h3>
              </summary>
              <div class="faq__a">
                <p>
                  Because we are using it ourselves first, and we would rather tell you that than
                  take your money for something we have not finished with. The terms are written
                  down on this page, so you can read them before they change.
                </p>
              </div>
            </details>

'''

marker = '            <details class="faq__item">'
i = html.index(marker)
html = html[:i] + NEW_QUESTIONS + html[i:]

# ── 3. the eyebrow kickers go ───────────────────────────────────────────────
before = html.count('class="eyebrow"')
html = re.sub(r'\n\s*<p class="eyebrow">.*?</p>', '', html)
print('eyebrows removed:', before)

# ── 4. the tricolons go ──────────────────────────────────────────────────────
REPLACEMENTS = [
    ('One package. Sixteen hosts. Thirty-eight skills.',
     'Thirty-eight skills, sixteen hosts.'),
    ('One prompt. A skill pack that writes motion in code. A file you own.',
     'Describe a video in a sentence. An agent writes it in code and renders the file.'),
    ('The four questions everyone asks first.', 'Straight answers.'),
]
for old, new in REPLACEMENTS:
    if old in html:
        html = html.replace(old, new)
        print('rewrote:', old[:48])

# ── 5. a link to a section that no longer exists ─────────────────────────────
html = html.replace('href="#footage"', 'href="#proof"')
html = html.replace('href="#objections"', 'href="#faq"')

open(PATH, 'w', encoding='utf-8').write(html)
print('sections now:', re.findall(r'<section[^>]*id="([a-z]+)"', html))
