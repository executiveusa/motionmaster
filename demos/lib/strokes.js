/* eslint-disable */
/**
 * A shared stroke engine for the Motion Master demos.
 *
 * Three of them draw: a whiteboard with a marker, an ink painting with a
 * brush, a blueprint with a technical pen. They differ in the material, not
 * in the mechanism, so the mechanism lives here once.
 *
 * The rules come from the skills these demos are built on:
 *
 *   - huashu-art-motion, 17_ink: resample the point list by arc length
 *     before adding texture, or the dry-brush noise changes frequency with
 *     the length of the stroke. Width follows a pressure profile. Bristles
 *     are continuous paths with butt caps, never per-segment strokes, or the
 *     joins read as knots.
 *   - whiteboard-video: the hand travels the stroke it is drawing. The
 *     drawing appears because a pen moved, not because a clip grew.
 *   - lemo-opuscar, blueprint: the drawing is dry and exact. Line work, not
 *     illustration.
 */
(() => {
  const noise = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  /** Catmull-Rom through the points, so a polyline reads as a drawn curve. */
  function smooth(points, samples) {
    if (points.length < 3) return points.slice();
    const out = [];
    const p = [points[0], ...points, points[points.length - 1]];
    for (let i = 0; i < p.length - 3; i++) {
      const [p0, p1, p2, p3] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
      for (let s = 0; s < samples; s++) {
        const t = s / samples;
        const t2 = t * t;
        const t3 = t2 * t;
        out.push({
          x:
            0.5 *
            (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y:
            0.5 *
            (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }

  /** Resample by arc length so texture frequency does not depend on stroke length. */
  function resample(points, step) {
    if (points.length < 2) return points.slice();
    const out = [points[0]];
    let carry = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      let d = step - carry;
      while (d <= len) {
        out.push({ x: a.x + (dx * d) / len, y: a.y + (dy * d) / len });
        d += step;
      }
      carry = (carry + len) % step;
    }
    out.push(points[points.length - 1]);
    return out;
  }

  /**
   * Draw a stroke.
   *
   *   kind: 'marker' (wet, round, even), 'brush' (tapered, can bleed),
   *         'ink' (dry, split into bristles), 'pen' (thin, exact, technical)
   *   reveal: 0..1, how much of the stroke is drawn
   */
  function stroke(ctx, points, opts) {
    const o = opts || {};
    const kind = o.kind || 'marker';
    const color = o.color || '#111';
    const width = o.width || 8;
    const reveal = o.reveal === undefined ? 1 : Math.max(0, Math.min(1, o.reveal));
    if (reveal <= 0) return;

    const pts = resample(smooth(points, 14), kind === 'ink' ? 3.2 : 2.4);
    const total = pts.length;
    const upto = Math.max(1, Math.round(total * reveal));
    const shown = pts.slice(0, upto);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    if (kind === 'ink') {
      // Dry brush: several continuous bristles, each with gaps where the
      // paper shows through. Butt caps, so the joins do not bead.
      const bristles = Math.max(3, Math.round(width / 2.2));
      ctx.lineCap = 'butt';
      for (let b = 0; b < bristles; b++) {
        const off = bristles === 1 ? 0 : (b / (bristles - 1) - 0.5) * width * 0.86;
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i < shown.length; i++) {
          const q = i / Math.max(1, total - 1);
          // pressure: heavy at the start, tapering away as the brush empties
          const prof = smoothstep(0, 0.12, q) * (1 - 0.7 * smoothstep(0.65, 1, q));
          const jitter = (noise(b * 31.7 + i * 0.09) - 0.5) * width * 0.16;
          const nx = -Math.sin(0) , ny = 0;
          const px = shown[i].x + off * 0 + jitter;
          const py = shown[i].y + off * 0 + jitter * 0.3;
          // the bristles break up as the brush runs dry
          const dry = o.dry === undefined ? 0.45 : o.dry;
          const broken = noise(i * 1.9 + b * 7.3) < dry * Math.pow(q, 1.2) * 0.95 + 0.04;
          if (broken) {
            pen = false;
            continue;
          }
          if (!pen) {
            ctx.moveTo(px, py);
            pen = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.globalAlpha = o.alpha === undefined ? 0.86 : o.alpha;
        ctx.lineWidth = Math.max(0.6, (width / bristles) * 1.5);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Wet strokes: one path, width tapering along it.
    const drawTapered = (mult) => {
      for (let i = 1; i < shown.length; i++) {
        const q = i / Math.max(1, total - 1);
        let w = width * mult;
        if (kind === 'brush') {
          w *= smoothstep(0, 0.1, q) * (1 - 0.55 * smoothstep(0.7, 1, q));
          w *= 0.85 + 0.3 * noise(i * 0.7);
        }
        ctx.beginPath();
        ctx.lineWidth = Math.max(0.5, w);
        ctx.moveTo(shown[i - 1].x, shown[i - 1].y);
        ctx.lineTo(shown[i].x, shown[i].y);
        ctx.stroke();
      }
    };
    ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    drawTapered(1);
    ctx.restore();
  }

  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  /**
   * A hand-drawn rectangle: four separate strokes that overshoot their
   * corners slightly, the way a pen does.
   */
  function roughRect(x, y, w, h, jitter, seed) {
    const j = (n) => (noise(seed + n) - 0.5) * jitter;
    const pts = [];
    const push = (x0, y0, x1, y1, n) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push({ x: x0 + (x1 - x0) * t + j(n * 3 + i), y: y0 + (y1 - y0) * t + j(n * 7 + i) });
      }
    };
    push(x + j(1), y + j(2), x + w + j(3), y + j(4), 14);
    push(x + w + j(5), y + j(6), x + w + j(7), y + h + j(8), 10);
    push(x + w + j(9), y + h + j(10), x + j(11), y + h + j(12), 14);
    push(x + j(13), y + h + j(14), x + j(15), y + j(16), 10);
    return pts;
  }

  /**
   * Paper. Cached, because it never changes. Fibres and mottle, and a
   * vignette — the huashu ink card calls for 2,600 short fibre arcs, half
   * brown and half light.
   */
  const paperCache = new Map();
  function paper(ctx, w, h, opts) {
    const o = opts || {};
    const base = o.base || '#efe6d0';
    const key = base + '|' + w + 'x' + h + '|' + (o.fibre || 9);
    let c = paperCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      // low-frequency mottle
      for (let i = 0; i < 90; i++) {
        const x = noise(i * 3.1) * w;
        const y = noise(i * 7.7) * h;
        const r = 60 + noise(i * 2.3) * 220;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        const dark = noise(i * 5.9) > 0.5;
        rg.addColorStop(0, dark ? 'rgba(120,100,70,0.05)' : 'rgba(255,250,235,0.06)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // fibres
      const n = o.fibre || 9;
      for (let i = 0; i < 2600; i++) {
        const x = noise(i * 1.7) * w;
        const y = noise(i * 3.3) * h;
        const len = 4 + noise(i * 4.4) * 22;
        const a = noise(i * 6.1) * Math.PI;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        g.strokeStyle = noise(i * 8.9) > 0.5 ? `rgba(120,96,64,${0.05 + noise(i * 2.2) * 0.08})` : `rgba(255,252,240,${0.12 + noise(i * 3.9) * 0.15})`;
        g.lineWidth = 1;
        g.stroke();
      }
      paperCache.set(key, c);
    }
    ctx.drawImage(c, 0, 0, w, h);
  }

  /**
   * The hand. It travels the stroke that is being drawn — the whiteboard
   * engine draws because a pen moved, so the pen has to be visible moving.
   */
  function hand(ctx, x, y, angle, opts) {
    const o = opts || {};
    const body = o.body || '#2b2b30';
    const cap = o.cap || '#c8442a';
    const skin = o.skin || '#e8b48f';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1.42, 1.42);
    // the marker, held at an angle: barrel, cap band, then the nib
    ctx.fillStyle = '#e6e6e2';
    ctx.beginPath();
    ctx.roundRect(-7.5, -46, 15, 40, 3);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(-7.5, -46, 15, 13, 3);
    ctx.fill();
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.roundRect(-7.5, -14, 15, 9, 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-4.5, -5);
    ctx.lineTo(4.5, -5);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.fill();
    // the hand: a thumb across the barrel and three fingers behind it
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(-2, -30, 11, 13, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, -40, 8, 15, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(13, -30, 7.5, 14, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, -19, 7, 12, 0.06, 0, Math.PI * 2);
    ctx.fill();
    // the palm behind
    ctx.beginPath();
    ctx.ellipse(24, -28, 22, 26, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Position and angle of the hand at a fraction along a stroke. */
  function alongStroke(points, q) {
    if (!points.length) return { x: 0, y: 0, angle: 0 };
    const i = Math.max(0, Math.min(points.length - 1, Math.round(q * (points.length - 1))));
    const p = points[i];
    const n = points[Math.min(points.length - 1, i + 1)];
    return { x: p.x, y: p.y, angle: Math.atan2(n.y - p.y, n.x - p.x) + Math.PI / 2 };
  }

  window.MM = window.MM || {};
  window.MM.stroke = stroke;
  window.MM.roughRect = roughRect;
  window.MM.paper = paper;
  window.MM.hand = hand;
  window.MM.alongStroke = alongStroke;
  window.MM.noise = noise;
  window.MM.smoothstep = smoothstep;
})();
