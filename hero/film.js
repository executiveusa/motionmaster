/* eslint-disable */
/**
 * MOTION MASTER — hero film.
 *
 * A single 104-second film, rendered frame by frame: picture is a function of
 * time. `window.render(t)` draws the frame at time t and resolves when the
 * pixels are ready.
 *
 * The rules this film is built to, taken from the motionmaxxing craft law
 * that ships in this repository (skills/motionmaxxing):
 *
 *   - No page chrome. No corner labels, no tracked-caps labels, no counters,
 *     no timecodes, no resolution text, no header or footer bars, no progress
 *     bars, no letter-typed headlines.
 *   - Every frame is a world: ground, light, depth. No flat swatch grounds.
 *   - The camera always drifts. Never a locked-off frame.
 *   - Cut on motion, never on rest.
 *   - Land decelerates (ease-out, arriving from oversize); leave accelerates
 *     (ease-in).
 *   - No dead frame: something in every frame is alive.
 *   - One focal point per frame.
 *   - Words move at speech rhythm, whole words, never a caret.
 *   - The end card holds for less than 1.4 seconds.
 *
 * The footage in the panels is REAL. The four gallery clips were rendered by
 * the compositions in clips/src; these are their actual frames, not a mock-up.
 */
(() => {
  const W = 1920;
  const H = 1080;
  const FPS = 30;
  const DUR = 104;

  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d', { alpha: false });

  // ── maths ──────────────────────────────────────────────────────────────────
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => clamp(v, 0, 1);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeIn = (x) => x * x * x;
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, p) => a + (b - a) * p;
  /** Deterministic hash noise — the film must be identical every render. */
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // ── colour ─────────────────────────────────────────────────────────────────
  const GROUND_TOP = [10, 10, 13];
  const GROUND_BOTTOM = [17, 17, 21];
  const KEY = [255, 190, 128]; // the warm key light
  const FILL = [96, 132, 190]; // the cool fill
  const ACCENT = [255, 74, 28];
  const INK = [244, 244, 242];

  const rgba = (c, a) => `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;

  // ── assets ─────────────────────────────────────────────────────────────────
  const CLIPS = {
    launch: { dir: 'frames/launch-title', count: 420 },
    kinetic: { dir: 'frames/kinetic-type-full', count: 270 },
    product: { dir: 'frames/product-loop', count: 630 },
    footage: { dir: 'frames/footage-title', count: 480 },
  };
  /** The frame index a clip actually shows at a given step. Clips loop. */
  function wrapIndex(clip, index) {
    const c = CLIPS[clip];
    if (!c) return 1;
    return ((Math.floor(index) - 1) % c.count + c.count) % c.count + 1;
  }

  const cache = new Map();
  const pending = new Map();
  const CACHE_MAX = 220;

  function frameImage(clip, index) {
    const c = CLIPS[clip];
    if (!c) return Promise.resolve(null);
    const idx = wrapIndex(clip, index);
    const key = clip + ':' + idx;
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    if (pending.has(key)) return pending.get(key);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        cache.set(key, img);
        pending.delete(key);
        if (cache.size > CACHE_MAX) {
          // Evict the oldest quarter.
          const drop = Math.floor(CACHE_MAX / 4);
          let i = 0;
          for (const k of cache.keys()) {
            if (i++ >= drop) break;
            cache.delete(k);
          }
        }
        resolve(img);
      };
      img.onerror = () => {
        pending.delete(key);
        resolve(null);
      };
      img.src = c.dir + '/' + String(idx).padStart(5, '0') + '.png';
    });
    pending.set(key, p);
    return p;
  }

  // ── type ───────────────────────────────────────────────────────────────────
  /** Canvas has no letter-spacing, so track it by hand. */
  function trackedText(c, text, x, y, size, weight, tracking, color, align) {
    c.save();
    c.font = weight + ' ' + size + 'px "Plex Sans", system-ui, sans-serif';
    c.textBaseline = 'alphabetic';
    c.fillStyle = color;
    const chars = [...text];
    let total = 0;
    for (const ch of chars) total += c.measureText(ch).width + tracking;
    total -= tracking;
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (const ch of chars) {
      c.fillText(ch, cx, y);
      cx += c.measureText(ch).width + tracking;
    }
    c.restore();
    return total;
  }

  function monoText(c, text, x, y, size, color) {
    c.save();
    c.font = '500 ' + size + 'px "Plex Mono", ui-monospace, monospace';
    c.textBaseline = 'alphabetic';
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.restore();
  }

  // ── the world ──────────────────────────────────────────────────────────────
  /**
   * Ground, light and haze. Never a flat fill: the ground is a vertical
   * gradient, the key light is a drifting pool, and two soft shafts give the
   * frame depth. The light pool drifts with the camera so the world never
   * sits still.
   */
  function drawWorld(c, t, cam) {
    const g = c.createLinearGradient(0, -200 * cam.z, 0, H + 200 * cam.z);
    g.addColorStop(0, rgba(GROUND_TOP, 1));
    g.addColorStop(0.55, rgba(GROUND_BOTTOM, 1));
    g.addColorStop(1, rgba([6, 6, 8], 1));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // key light pool, upper left, drifting
    const kx = W * (0.26 + 0.05 * Math.sin(t * 0.07));
    const ky = H * (0.2 + 0.04 * Math.cos(t * 0.05));
    let rg = c.createRadialGradient(kx, ky, 0, kx, ky, 1150 * cam.z);
    rg.addColorStop(0, rgba(KEY, 0.3));
    rg.addColorStop(0.4, rgba(KEY, 0.09));
    rg.addColorStop(1, rgba(KEY, 0));
    c.fillStyle = rg;
    c.fillRect(0, 0, W, H);

    // cool fill, lower right
    const fx = W * (0.78 + 0.06 * Math.cos(t * 0.045));
    const fy = H * (0.82 + 0.05 * Math.sin(t * 0.06));
    rg = c.createRadialGradient(fx, fy, 0, fx, fy, 900 * cam.z);
    rg.addColorStop(0, rgba(FILL, 0.16));
    rg.addColorStop(1, rgba(FILL, 0));
    c.fillStyle = rg;
    c.fillRect(0, 0, W, H);

    // haze shafts — three layers at different speeds, so the air has depth
    for (let i = 0; i < 3; i++) {
      const drift = t * (0.016 + i * 0.009);
      const x = W * (0.16 + i * 0.31) + Math.sin(drift) * 150;
      const w = 320 + i * 190;
      const a = 0.05 - i * 0.012;
      const sg = c.createLinearGradient(x, 0, x + w, 0);
      sg.addColorStop(0, rgba(KEY, 0));
      sg.addColorStop(0.5, rgba(KEY, a));
      sg.addColorStop(1, rgba(KEY, 0));
      c.save();
      c.translate(x + w / 2, H * 0.5);
      c.rotate(-0.22);
      c.fillStyle = sg;
      c.fillRect(-w / 2, -H * 1.2, w, H * 2.4);
      c.restore();
    }
  }

  /** Fine animated grain. Deterministic, so the render is reproducible. */
  function drawGrain(c, t, amount) {
    const step = 4;
    c.save();
    c.globalAlpha = amount;
    for (let i = 0; i < 2600; i++) {
      const n = hash(i + Math.floor(t * 24) * 71.3);
      const x = (n * 1931.7) % W;
      const y = (hash(i * 3.1 + 7) * 1093.3) % H;
      const v = hash(i * 5.7 + 13) * 255;
      c.fillStyle = `rgba(${v | 0},${v | 0},${v | 0},0.5)`;
      c.fillRect(x, y, step, step);
    }
    c.restore();
  }

  /** A vignette, so the frame has a centre of gravity. */
  function drawVignette(c, strength) {
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  /**
   * A panel of real footage floating in the world: a 16:9 frame with a soft
   * edge, a light catching its border, and depth-of-field blur when it is
   * behind the focal plane.
   */
  function drawPanel(c, img, x, y, w, h, opts) {
    const o = opts || {};
    const blur = o.blur || 0;
    const rot = o.rot || 0;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    if (!img || alpha <= 0.001) return;

    c.save();
    c.globalAlpha = alpha;
    c.translate(x + w / 2, y + h / 2);
    if (rot) c.rotate(rot);
    if (blur > 0.2) c.filter = 'blur(' + blur.toFixed(2) + 'px)';

    // the light catching the top edge of the panel
    if (!o.noEdge) {
      c.save();
      c.filter = 'blur(6px)';
      c.strokeStyle = rgba(KEY, 0.16);
      c.lineWidth = 3;
      c.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      c.restore();
    }

    c.drawImage(img, -w / 2, -h / 2, w, h);
    c.restore();
  }

  /**
   * A reflection of the panels on the floor beneath them. It grounds the
   * frames in a set instead of floating them in a void, and it fills the
   * lower third of the frame with something alive.
   */
  function drawReflections(c, panels, alpha) {
    if (alpha <= 0.001) return;
    c.save();
    c.globalAlpha = alpha;
    for (const q of panels) {
      if (!q.img) continue;
      const w = q.w;
      const h = (w * 9) / 16;
      const gy = q.y + h / 2 + 26; // the floor line
      c.save();
      c.filter = 'blur(13px)';
      c.translate(q.x, gy);
      c.scale(1, -0.42);
      c.globalAlpha = alpha * 0.17;
      c.drawImage(q.img, -w / 2, -h / 2, w, h);
      c.restore();
    }
    // fade the reflections out into the ground
    const g = c.createLinearGradient(0, H * 0.62, 0, H);
    g.addColorStop(0, 'rgba(9,9,12,0)');
    g.addColorStop(0.55, 'rgba(9,9,12,0.72)');
    g.addColorStop(1, 'rgba(9,9,12,1)');
    c.globalAlpha = 1;
    c.fillStyle = g;
    c.fillRect(0, H * 0.62, W, H * 0.38);
    c.restore();
  }

  // ── the brief ──────────────────────────────────────────────────────────────
  const BRIEF = ['Twenty-one seconds.', 'Four stages.', 'One accent.'];

  /**
   * MOVEMENT 1 — the brief.
   * Words arrive whole, one clause at a time, decelerating from oversize into
   * place. Then they lift off the ground and drift apart.
   */
  function movement1(c, t) {
    const cam = { z: 1 + 0.07 * seg(t, 0, 20) };
    drawWorld(c, t, cam);

    const focus = H * 0.44;
    const left = W * 0.11;
    const avail = W * 0.78;
    // Fit every clause to the frame: the longest one sets the size for all,
    // so the three lines share a baseline and a weight.
    ctx.save();
    ctx.font = '700 100px "Plex Sans", system-ui, sans-serif';
    let widest = 0;
    for (const line of BRIEF) {
      let w = 0;
      for (const ch of line) w += ctx.measureText(ch).width - 3.4;
      widest = Math.max(widest, w);
    }
    ctx.restore();
    const size = Math.min(168, (avail / widest) * 100);

    for (let i = 0; i < BRIEF.length; i++) {
      const at = 1.6 + i * 1.7;
      const p = seg(t, at, at + 1.25);
      if (p <= 0) continue;

      const arrive = easeOut(p);
      // Arrival decelerates from oversize.
      const scale = lerp(1.34, 1, arrive);
      const drop = lerp(-54, 0, arrive);
      const alpha = clamp01(p * 3);

      // after settling, the words lift and drift apart
      const lift = seg(t, at + 4.4, at + 8.5);
      const liftY = -easeIn(lift) * 260 * (1 + i * 0.35);
      const spread = easeInOut(lift) * (i - 1) * 46;
      const fade = 1 - clamp01((lift - 0.55) * 2.4);

      c.save();
      c.globalAlpha = alpha * fade;
      c.translate(left + spread, focus + i * 230 + drop + liftY);
      c.scale(scale, scale);
      trackedText(c, BRIEF[i], 0, 0, size, 700, -3.4, rgba(INK, 0.95), 'left');
      c.restore();
    }
    drawGrain(c, t, 0.05);
    drawVignette(c, 0.55);
  }

  // ── movement 2 — the plan ──────────────────────────────────────────────────
  /**
   * Four shots of the plan, floating in depth. The camera orbits; the far
   * panels fall out of focus; the near one takes over the frame.
   */
  function movement2(c, t, imgs) {
    const p = seg(t, 20, 27); // panels fly in and settle
    const camPush = seg(t, 30, 50);
    const cam = { z: 1 + 0.02 * Math.sin(t * 0.11) + 0.05 * camPush };

    drawWorld(c, t, cam);

    // the orbit: the world slides sideways as the camera moves around it
    const orbit = Math.sin((t - 20) * 0.085) * 130;
    const orbit2 = Math.sin((t - 20) * 0.085 + 0.7) * 90;

    const panels = [
      { clip: 'launch', x: W * 0.16, y: H * 0.5, w: 470, z: 0.45, rot: -0.04 },
      { clip: 'kinetic', x: W * 0.44, y: H * 0.46, w: 700, z: 1.0, rot: 0.012 },
      { clip: 'product', x: W * 0.72, y: H * 0.52, w: 500, z: 0.62, rot: 0.045 },
      { clip: 'footage', x: W * 0.93, y: H * 0.4, w: 390, z: 0.3, rot: 0.085 },
    ];

    const drawn = [];
    for (let i = 0; i < panels.length; i++) {
      const q = panels[i];
      const arrive = easeOut(seg(t, 20 + i * 0.55, 20 + i * 0.55 + 2.2));
      if (arrive <= 0) continue;

      // parallax: nearer panels travel more
      const px = q.x * W * 0 + q.x + orbit * (0.25 + q.z) - (1 - arrive) * (i % 2 ? 900 : -900);
      const py = q.y + orbit2 * (0.2 + q.z) * 0.4 + (1 - arrive) * 120;
      const scale = lerp(0.86, 1, arrive) * (1 + 0.1 * camPush * q.z);
      const w = q.w * scale;
      const h = (w * 9) / 16;
      const blur = (1 - q.z) * 5 + camPush * (1 - q.z) * 26;

      const img = imgs[q.clip];
      drawPanel(c, img, px - w / 2, py - h / 2, w, h, {
        blur,
        rot: q.rot + (1 - arrive) * 0.06,
        alpha: arrive,
      });
      drawn.push({ img, x: px, y: py, w });
    }

    drawReflections(c, drawn, 1);

    // the near panel takes over: it grows until it fills the frame
    const fill = easeInOut(seg(t, 44, 50));
    if (fill > 0) {
      const w = lerp(700, W * 1.0, fill);
      const h = (w * 9) / 16;
      c.save();
      c.globalAlpha = fill;
      drawPanel(c, imgs.kinetic, W / 2 - w / 2, H / 2 - h / 2, w, h, { noEdge: true });
      c.restore();
    }

    drawGrain(c, t, 0.045);
    drawVignette(c, 0.6);
  }

  // ── movement 3 — the code ──────────────────────────────────────────────────
  const CODE_LINES = [
    ['const LINES = [', 'plain'],
    ['  { text: "DESCRIBE", accent: false },', 'plain'],
    ['  { text: "IT.", accent: true },', 'accent'],
    ['  { text: "WATCH", accent: false },', 'plain'],
    ['  { text: "IT.", accent: true },', 'accent'],
    ['  { text: "OWN", accent: false },', 'plain'],
    ['  { text: "IT.", accent: true },', 'accent'],
    ['];', 'plain'],
    ['', 'plain'],
    ['const STAGGER = 3; // frames @30fps = 90ms', 'comment'],
    ['const WORD_DUR = 14; // frames @30fps = 466ms', 'comment'],
    ['', 'plain'],
    ['const from = 10 + i * STAGGER;', 'plain'],
    ['const inP = interpolate(frame, [from, from + WORD_DUR], [0, 1], {', 'plain'],
    ['  extrapolateLeft: "clamp",', 'plain'],
    ['  extrapolateRight: "clamp",', 'plain'],
    ['  easing: Easing.bezier(...MOTION.easeEnter),', 'key'],
    ['});', 'plain'],
    ['', 'plain'],
    ['// exit in reverse order, ease-in', 'comment'],
    ['const outP = interpolate(frame,', 'plain'],
    ['  [exitFromForWord, exitFromForWord + 16], [0, 1], {', 'plain'],
    ['  extrapolateLeft: "clamp",', 'plain'],
    ['  extrapolateRight: "clamp",', 'plain'],
    ['});', 'plain'],
  ];

  function drawCodePanel(c, t) {
    const inP = easeOut(seg(t, 52, 53.6));
    const outP = easeIn(seg(t, 73.5, 75.2));
    if (inP <= 0) return;

    const w = 760;
    const h = H;
    const x = W - w * inP + w * outP;
    const alpha = inP * (1 - outP);

    c.save();
    c.globalAlpha = alpha;

    // the surface: a dark plane, lit from the left where the key light is
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(8,8,10,0.97)');
    g.addColorStop(1, 'rgba(15,15,19,0.97)');
    c.fillStyle = g;
    c.fillRect(x, 0, w, h);

    // a hairline of light down the leading edge
    const eg = c.createLinearGradient(x - 26, 0, x + 6, 0);
    eg.addColorStop(0, rgba(KEY, 0));
    eg.addColorStop(1, rgba(KEY, 0.3));
    c.fillStyle = eg;
    c.fillRect(x - 26, 0, 32, h);
    c.fillStyle = rgba(KEY, 0.4);
    c.fillRect(x - 1, 0, 2, h);

    // the code, scrolling slowly
    const scroll = easeInOut(seg(t, 58, 70)) * 150;
    c.save();
    c.beginPath();
    c.rect(x, 0, w, h);
    c.clip();
    let y = 190 - scroll;
    for (const [line, kind] of CODE_LINES) {
      if (y > -30 && y < H + 30) {
        let col = 'rgba(190,190,198,0.86)';
        if (kind === 'accent') col = rgba(ACCENT, 0.95);
        if (kind === 'comment') col = 'rgba(120,120,132,0.9)';
        if (kind === 'key') col = 'rgba(255,214,160,0.95)';
        monoText(c, line, x + 46, y, 21, col);
      }
      y += 34;
    }
    c.restore();

    // a cursor that travels in, parks, clicks and leaves
    const cur = cursorPath(t);
    if (cur) {
      c.save();
      c.translate(cur.x, cur.y);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, 34);
      c.lineTo(8, 27);
      c.lineTo(14, 39);
      c.lineTo(19, 36);
      c.lineTo(13, 24);
      c.lineTo(23, 23);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(250,250,252,0.98)';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, 34);
      c.lineTo(8, 27);
      c.lineTo(14, 39);
      c.lineTo(19, 36);
      c.lineTo(13, 24);
      c.lineTo(23, 23);
      c.closePath();
      c.fill();
      c.restore();

      // the click: a ripple at the point of contact
      const rip = seg(t, cur.clickAt, cur.clickAt + 0.6);
      if (rip > 0 && rip < 1) {
        c.save();
        c.strokeStyle = rgba(ACCENT, (1 - rip) * 0.7);
        c.lineWidth = 2;
        c.beginPath();
        c.arc(cur.x, cur.y, rip * 46, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    }
    c.restore();
  }

  /** Where the pointer is at time t, and when it clicks. */
  function cursorPath(t) {
    const start = 54.6;
    const clickAt = 60.4;
    const leaveAt = 70.4;
    if (t < start || t > leaveAt + 0.6) return null;
    const from = { x: W * 0.42, y: H * 0.72 };
    const to = { x: W * 0.66, y: H * 0.47 };
    let p;
    if (t < clickAt) p = easeInOut(seg(t, start, clickAt));
    else p = 1;
    if (t > leaveAt) {
      const q = easeInOut(seg(t, leaveAt, leaveAt + 0.6));
      return {
        x: lerp(to.x, W * 0.96, q),
        y: lerp(to.y, H * 0.12, q),
        clickAt,
      };
    }
    return {
      x: lerp(from.x, to.x, p),
      y: lerp(from.y, to.y, p),
      clickAt,
    };
  }

  function movement3(c, t, imgs) {
    const cam = { z: 1.03 + 0.03 * seg(t, 50, 56) };
    drawWorld(c, t, cam);

    // the near panel now fills the frame and plays
    const w = W * 1.0;
    const h = (w * 9) / 16;
    drawPanel(c, imgs.kinetic, W / 2 - w / 2, H / 2 - h / 2, w, h, { noEdge: true });

    // the code slides in over it
    drawCodePanel(c, t);

    drawGrain(c, t, 0.04);
    drawVignette(c, 0.42);
  }

  // ── movement 4 — the render ────────────────────────────────────────────────
  /**
   * Three shots, cut on motion. A strip of film travels sideways and the
   * shots land in the frame on their own peaks.
   */
  function movement4(c, t, imgs) {
    const cam = { z: 1 + 0.02 * Math.sin(t * 0.13) };
    drawWorld(c, t, cam);

    const shots = [
      { clip: 'launch', at: 78.0 },
      { clip: 'product', at: 84.0 },
      { clip: 'footage', at: 90.0 },
    ];
    const shotLen = 6.0;

    for (const s of shots) {
      const local = t - s.at;
      if (local < -0.02 || local > shotLen + 0.02) continue;
      const img = imgs[s.clip];
      if (!img) continue;

      // cut on motion: the shot arrives hard and pushes in
      const w = W * 1.0 * (1 + 0.016 * local);
      const h = (w * 9) / 16;
      const alpha = local < 0.12 ? clamp01(local / 0.12) : 1;
      drawPanel(c, img, W / 2 - w / 2, H / 2 - h / 2, w, h, { alpha, noEdge: true });

      // a wipe bar crosses on the cut
      if (local < 0.34) {
        const wp = local / 0.34;
        const bx = lerp(-300, W + 300, easeInOut(wp));
        const gg = c.createLinearGradient(bx - 200, 0, bx + 200, 0);
        gg.addColorStop(0, rgba(KEY, 0));
        gg.addColorStop(0.5, rgba(KEY, 0.5));
        gg.addColorStop(1, rgba(KEY, 0));
        c.fillStyle = gg;
        c.fillRect(bx - 200, 0, 400, H);
      }
    }

    drawGrain(c, t, 0.05);
    drawVignette(c, 0.5);
  }

  // ── movement 5 — the file ──────────────────────────────────────────────────
  function movement5(c, t, imgs) {
    const cam = { z: 1 + 0.02 * Math.sin(t * 0.1) };
    drawWorld(c, t, cam);

    const p = seg(t, 96, 99.4);
    const w = lerp(W * 1.3, 720, easeInOut(p));
    const h = (w * 9) / 16;
    const x = W / 2 - w / 2;
    const y = H * 0.44 - h / 2;

    // the shots collapse into one strip
    const strip = p < 0.999 ? imgs.footage : imgs.footage;
    drawPanel(c, strip, x, y, w, h, { alpha: p, rot: lerp(0.05, 0, easeInOut(p)) });

    // the file name lands on it
    const nameP = easeOut(seg(t, 99.6, 100.6));
    if (nameP > 0) {
      c.save();
      c.globalAlpha = nameP;
      c.translate(W / 2, y + h + 108);
      c.scale(lerp(1.25, 1, nameP), lerp(1.25, 1, nameP));
      monoText(c, 'product-loop.mp4', 0, 0, 34, rgba(INK, 0.82));
      c.restore();
    }

    // the end card: under 1.4 seconds
    const ecP = seg(t, 101.6, 102.2);
    if (ecP > 0) {
      const ecOut = easeIn(seg(t, 103.2, 104));
      c.save();
      c.globalAlpha = ecP * (1 - ecOut);
      c.translate(W / 2, H * 0.79);
      c.scale(lerp(1.2, 1, easeOut(ecP)), lerp(1.2, 1, easeOut(ecP)));
      trackedText(c, 'Motion Master', 0, 0, 76, 700, -2, rgba(INK, 0.95), 'center');
      c.restore();
    }

    drawGrain(c, t, 0.05);
    drawVignette(c, 0.55);
  }

  // ── the render loop ────────────────────────────────────────────────────────
  /** Which clip frame is needed at time t. */
  function neededFrames(t) {
    const need = {};
    const add = (clip, idx) => {
      need[clip] = wrapIndex(clip, idx);
    };
    // movement 2
    if (t >= 19 && t < 50) {
      const local = t - 20;
      add('launch', Math.floor(local * 30) + 1);
      add('kinetic', Math.floor(local * 30) + 1);
      add('product', Math.floor(local * 30) + 1);
      add('footage', Math.floor(local * 30) + 1);
    }
    // movement 3
    if (t >= 44 && t < 76) add('kinetic', Math.floor((t - 44) * 30) + 1);
    // movement 4
    if (t >= 77.9 && t < 96.1) {
      const local = t - 78;
      if (local < 6.1) add('launch', Math.floor(local * 30) + 1);
      const local2 = t - 84;
      if (local2 >= 0 && local2 < 6.1) add('product', Math.floor(local2 * 30) + 1);
      const local3 = t - 90;
      if (local3 >= 0 && local3 < 6.1) add('footage', Math.floor(local3 * 30) + 1);
    }
    // movement 5
    if (t >= 95.9) add('footage', 1);
    return need;
  }

  window.render = function render(t) {
    const need = neededFrames(t);
    const keys = Object.keys(need);
    return Promise.all(keys.map((k) => frameImage(k, need[k]))).then(() => {
      const imgs = {};
      for (const k of keys) imgs[k] = cache.get(k + ':' + need[k]) || null;

      ctx.save();
      ctx.fillStyle = '#08080a';
      ctx.fillRect(0, 0, W, H);

      if (t < 20) movement1(ctx, t);
      else if (t < 50) movement2(ctx, t, imgs);
      else if (t < 77.5) movement3(ctx, t, imgs);
      else if (t < 96) movement4(ctx, t, imgs);
      else movement5(ctx, t, imgs);

      ctx.restore();
      return true;
    });
  };

  window.DUR = DUR;
  window.FPS = FPS;
  window.W = W;
  window.H = H;
  window.READY = true;
})();
