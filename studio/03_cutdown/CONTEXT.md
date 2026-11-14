# 03_cutdown — cut a recording or a film into short pieces

One job: take what was recorded and make it watchable — the silences gone,
the mistakes gone, the good take kept, and the piece cut to a length that
somebody will finish.

## The sequence

1. **Transcript** — a word-level transcript. Everything after this is driven
   by it.
2. **Cut the silences** — `cut-silences` finds the gaps and trims them.
3. **Cut the mistakes** — `cut-mistakes` finds stutters, repeated words,
   false starts and retakes. It proposes every cut with a reason; a person
   approves; only then are the cuts rendered.
4. **Story** — `video-storytelling` gives the piece its shape.
5. **Graphics** — `style-library` for the cards, the motion-showreel craft
   for the beats.
6. **Render** — gated, like everything else.

## The rules

- **A cut is proposed, then approved.** Nothing moves forward until a person
  has read the last output.
- **Never cut a word.** A cut happens on a silence or a breath, not mid-word.
- **The transcript is the source of truth.** If it and the picture disagree,
  the picture wins and the transcript is fixed.

## The skills

`cut-silences`, `cut-mistakes`, `edit-video`, `short-form-edit`,
`short-form-video`, `video-storytelling`, `motion-showreel`, `style-library`.
