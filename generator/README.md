# The generator

Motion graphics rendered as HTML and captured frame by frame, using
[HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0).

A composition is an HTML document with a seekable GSAP timeline. HyperFrames
captures each frame in headless Chrome, encodes with ffmpeg, and hands back a
deterministic MP4: the same composition produces the same frames every time.

## Why this and not a hand-rolled renderer

Because it brings a gate. `hyperframes check` lints the composition, runs it in
a real browser, measures contrast, and reports the things a render will never
tell you — an empty first frame, a silent film, a stretch of nothing moving,
type below the reading floor, a tween that snaps to integer pixels.

On the sample composition below it found six real problems, including one that
renders successfully and delivers the wrong thing: an `<audio>` element with no
`id`, which the renderer silently ignores. The film would have come out mute.

## Layout

```
generator/
  render.sh                 render a composition; finds the browser
  vendor/                   a local copy of GSAP, so no render touches a CDN
  compositions/
    library-map/            the sample: 24 s, the library as a browsable map
      index.html            the composition
      hyperframes.json      the project manifest
      fonts/                self-hosted IBM Plex Sans and Mono
      assets/bed.mp3        the audio bed
```

## Rendering

```bash
generator/render.sh generator/compositions/library-map out.mp4 -f 30 -q delivery
```

The script finds a browser through a chain of candidate paths — the sandbox's
Chrome has moved before — sets `HYPERFRAMES_BROWSER_PATH`, copies GSAP next to
the composition, and renders with one worker so it fits in the memory limit.

Check first. Always:

```bash
npx hyperframes@0.8.186 check generator/compositions/library-map
```

## From the agent

The MCP tool `build_hyperframes_composition` turns a storyboard into a whole
project: the HTML with the doctrine applied, the manifest, and a local copy of
GSAP.

## The composition format

```html
<div id="root"
     data-composition-id="main"
     data-start="0" data-duration="24"
     data-width="1920" data-height="1080">
  <div class="clip" id="act-one"
       data-start="0" data-duration="6" data-track-index="0">…</div>
  <audio id="bed" src="./assets/bed.mp3" data-start="0" data-duration="24"></audio>
</div>

<script>
  const tl = gsap.timeline({ paused: true });
  tl.fromTo("#act-one", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power4.out" }, 0);
  window.__timelines["main"] = tl;
  tl.seek(0);
</script>
```

Rules the gate enforces, all of them learned the hard way:

- every element with timing attributes needs an `id` — without one the
  renderer cannot find it, and a media element without an `id` is silent;
- animate transforms (`x`, `y`, `scale`, `opacity`), never layout properties
  like `letterSpacing`, which snap to integer pixels and stutter;
- frame 0 must not be empty — it is the thumbnail on social players;
- no stretch longer than three seconds where nothing on screen changes;
- reading text stays at 28 px or above on a 1080 px canvas;
- a film needs a sound source unless silence was asked for.
