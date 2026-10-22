/* eslint-disable */
/**
 * DEMO 2 — INK
 * Style: huashu-art-motion / references/风格配方/17_ink.md
 *   (中国水墨写意 — Chinese ink, the freehand manner)
 *
 * The rules, taken from the style card:
 *
 *   - The paper is the ground. The ink only adds, it never covers: the
 *     pipeline is paper → wash layer → mist → static strokes → motifs.
 *   - Rice paper: #efe6d0, 2,600 short fibre arcs, half brown and half
 *     light, plus a radial vignette that darkens the edges.
 *   - The brush: points are resampled by arc length before the texture is
 *     added, or the dry-brush noise changes frequency with the length of the
 *     stroke. Pressure rises fast and falls slowly. Bristles are continuous
 *     paths with butt caps. The paper showing through is 飞白, flying white.
 *   - Five tones of one ink: 焦 .9 / 浓 .8 / 重 .6 / 淡 .35 / 清 .15.
 *   - The wash grows: a halo that keeps widening after the body has settled.
 *   - Negative space is carved with destination-out, not painted white.
 *   - The picture stays alive. A wash is not a still image switched on.
 *   - A seal, pressed down at the end.
 *
 * The story is the product: four shots, one file, written in ink.
 */
(() => {
  const W = 1920;
  const H = 1080;
  const DUR = 30;
  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d', { alpha: false });

  const { stroke, paper, noise, smoothstep } = window.MM;

  // ink, five tones
  const INK = [16, 14, 12];
  const TONE = { jiao: 0.9, nong: 0.8, zhong: 0.6, dan: 0.35, qing: 0.15 };
  const OCHRE = '#c47a3c';
  const CYAN = '#6f8aa0';
  const VERMILION = '#c4281e';
  const PAPER = '#efe6d0';

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // ── the footage, in ink ────────────────────────────────────────────────────
  const SHOTS = [
    { id: 'launch-title', count: 150, x: 170, y: 560, w: 320, h: 180 },
    { id: 'kinetic-type', count: 150, x: 570, y: 528, w: 320, h: 180 },
    { id: 'product-loop', count: 150, x: 970, y: 560, w: 320, h: 180 },
    { id: 'footage-title', count: 150, x: 1370, y: 528, w: 320, h: 180 },
  ];
  const cache = new Map();
  function inkFrame(id, index) {
    const key = id + ':' + index;
    if (cache.has(key)) return cache.get(key);
    const shot = SHOTS.find((s) => s.id === id);
    const idx = ((index - 1) % shot.count + shot.count) % shot.count + 1;
    const img = new Image();
    img.src = `frames/${id}_${String(idx).padStart(4, '0')}.png`;
    cache.set(key, img);
    if (cache.size > 90) {
      const drop = cache.keys().next().value;
      cache.delete(drop);
    }
    return img;
  }

  // ── the wash ───────────────────────────────────────────────────────────────
  /**
   * A wash blooms on the paper. The body settles; the halo keeps widening
   * after it. Both are multiplied onto the paper, never painted over it.
   */
  function wash(ctx, x, y, w, h, grow, tone) {
    if (grow <= 0) return;
    const g = Math.min(1, grow);
    const halo = 26;
    const blur = 16;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // the outer halo
    ctx.filter = `blur(${halo * (0.4 + g)}px)`;
    ctx.fillStyle = rgba(INK, TONE.dan * 0.1 * g);
    ctx.fillRect(x - halo * g, y - halo * g, w + halo * 2 * g, h + halo * 2 * g);
    // the body
    ctx.filter = `blur(${blur * (1.6 - 0.6 * g)}px)`;
    ctx.fillStyle = rgba(INK, TONE.zhong * 0.14 * g);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  /** Mist bands: pale ellipses that drift across, hiding and revealing. */
  function mist(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 4; i++) {
      const speed = 150 + i * 40;
      const x = ((t * speed + i * 640) % (W + 900)) - 450;
      const y = 250 + i * 170 + Math.sin(t * 0.5 + i) * 40;
      ctx.filter = 'blur(34px)';
      ctx.fillStyle = rgba(PAPER, 0.8);
      ctx.beginPath();
      ctx.ellipse(x, y, 420, 90, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * The brush writes the title. The glyphs are real, but the ink does not sit
   * evenly on them: a dry brush skips, and the paper shows through. That is
   * 飞白, flying white, and it is what stops lettering from looking printed.
   */
  let titleCanvas = null;
  let titleKey = '';
  function makeTitle(text, size, color) {
    const key = text + '|' + size + '|' + color;
    if (titleKey === key && titleCanvas) return titleCanvas;
    const off = document.createElement('canvas');
    off.width = 1400;
    off.height = Math.ceil(size * 1.6);
    const g = off.getContext('2d');
    g.font = '600 ' + size + 'px "Caveat", cursive';
    g.textBaseline = 'alphabetic';
    g.fillStyle = color;
    g.fillText(text, 12, size * 1.1);
    // carve the flying white: short dry skips along the stroke direction
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) {
      const x = noise(i * 3.1) * off.width;
      const y = noise(i * 7.9) * off.height;
      const len = 6 + noise(i * 2.3) * 46;
      const w = 1 + noise(i * 5.7) * 5;
      g.globalAlpha = 0.35 + noise(i * 4.1) * 0.55;
      g.beginPath();
      g.ellipse(x, y, len, w, (noise(i * 8.3) - 0.5) * 0.5, 0, Math.PI * 2);
      g.fill();
    }
    // and a soft bleed around what is left
    g.globalCompositeOperation = 'source-over';
    titleCanvas = off;
    titleKey = key;
    return off;
  }

  function inkTitle(text, x, y, size, reveal, color) {
    if (reveal <= 0) return 0;
    const off = makeTitle(text, size, color);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // the bleed: the ink spreads into the paper a little
    ctx.filter = 'blur(2.2px)';
    ctx.globalAlpha = 0.3;
    const bw = off.width * clamp01(reveal);
    ctx.drawImage(off, 0, 0, bw, off.height, x - 3, y - size * 1.1 - 2, bw, off.height);
    // the stroke itself
    ctx.filter = 'none';
    ctx.globalAlpha = 0.94;
    const w = off.width * clamp01(reveal);
    ctx.drawImage(off, 0, 0, w, off.height, x, y - size * 1.1, w, off.height);
    ctx.restore();
    return x + w;
  }

  // ── the film ───────────────────────────────────────────────────────────────
  window.render = function render(t) {
    // the paper
    paper(ctx, W, H, { base: PAPER, fibre: 9 });
    // the edge vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(90,72,44,0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // ── 1. the title, written in ink ─────────────────────────────────────────
    const titleP = seg(t, 0.8, 4.6);
    if (titleP > 0) {
      inkTitle('Four shots.', 150, 200, 108, titleP, rgba(INK, 0.95));
    }
    const title2P = seg(t, 3.0, 6.4);
    if (title2P > 0) {
      inkTitle('One file.', 150, 340, 108, title2P, rgba(INK, 0.95));
    }

    // ── 2. the four shots bloom ─────────────────────────────────────────────
    const growP = seg(t, 5.6, 12.4);
    SHOTS.forEach((s, i) => {
      const start = (i / SHOTS.length) * 0.66;
      const g = clamp01((growP - start) / 0.34);
      if (g <= 0) return;
      wash(ctx, s.x, s.y, s.w, s.h, g, TONE.zhong);
    });

    // ── 3. the shots, alive, printed onto the paper ──────────────────────────
    const liveP = seg(t, 8.4, 14);
    if (liveP > 0) {
      SHOTS.forEach((s, i) => {
        const start = (i / SHOTS.length) * 0.66;
        const g = clamp01((growP - start) / 0.34);
        if (g <= 0) return;
        const idx = Math.floor((t - 8.4) * 30) + i * 9;
        const img = inkFrame(s.id, idx);
        if (!img.complete || !img.naturalWidth) return;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = easeOut(g) * 0.8;
        // a print, not a photograph: no grey, hard contrast, a little bleed
        ctx.filter = 'grayscale(1) contrast(1.45) brightness(1.06) blur(0.5px)';
        ctx.drawImage(img, s.x, s.y, s.w, s.h);
        ctx.restore();
        // the frame, brushed on
        ctx.save();
        ctx.globalAlpha = 0.5 * g;
        ctx.strokeStyle = rgba(INK, 0.8);
        ctx.lineWidth = 2.2;
        ctx.strokeRect(s.x - 7, s.y - 7, s.w + 14, s.h + 14);
        ctx.restore();
      });
    }

    // ── 4. the motifs ───────────────────────────────────────────────────────
    // Mist across the paper.
    if (t > 6) mist(ctx, t);

    // A bird crosses, eight wingbeats a second.
    if (t > 11 && t < 22) {
      const q = seg(t, 11, 18);
      const bx = -140 + q * (W + 280);
      const by = 200 + Math.sin(t * 0.7) * 40;
      ctx.save();
      ctx.strokeStyle = rgba(INK, 0.75);
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      const flap = Math.sin(t * 50) * 9;
      ctx.beginPath();
      ctx.moveTo(bx - 22, by + flap);
      ctx.quadraticCurveTo(bx - 8, by - 5, bx, by);
      ctx.quadraticCurveTo(bx + 8, by - 5, bx + 22, by + flap);
      ctx.stroke();
      ctx.restore();
    }

    // Bamboo, swaying, at the right edge. Two leaves per node.
    if (t > 8) {
      const sway = Math.sin((t - 8) * 0.55) * 0.11;
      ctx.save();
      ctx.translate(1780, 1040);
      ctx.rotate(sway);
      for (let seg2 = 0; seg2 < 5; seg2++) {
        const y = -seg2 * 148;
        const w = 13 - seg2 * 1.4;
        ctx.strokeStyle = rgba(INK, 0.5);
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(0, y - 138);
        ctx.stroke();
        for (let leaf = 0; leaf < 2; leaf++) {
          const dir = leaf === 0 ? 1 : -1;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(0, y - 96);
          ctx.quadraticCurveTo(dir * 46, y - 140, dir * 96, y - 118);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ── 5. the seal ──────────────────────────────────────────────────────────
    const sealP = seg(t, 22.4, 23.4);
    if (sealP > 0) {
      ctx.save();
      ctx.translate(1610, 880);
      ctx.rotate(-0.06);
      const s = 1.55 - 0.55 * easeOut(sealP);
      ctx.scale(s, s);
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = VERMILION;
      ctx.beginPath();
      ctx.roundRect(-52, -52, 104, 104, 6);
      ctx.fill();
      // the characters, carved out of the seal
      ctx.globalCompositeOperation = 'destination-out';
      ctx.font = '600 40px "Caveat", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Motion', 0, -22);
      ctx.fillText('Master', 0, 22);
      ctx.restore();
    }

    // ── 6. the file, at the end ──────────────────────────────────────────────
    const fileP = seg(t, 24.6, 27.2);
    if (fileP > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.font = '500 34px "Plex Mono", monospace';
      ctx.fillStyle = rgba(INK, 0.78);
      const text = 'product-loop.mp4';
      const w = ctx.measureText(text).width;
      ctx.fillText(text, W / 2 - w / 2, 880);
      ctx.restore();
    }

    return true;
  };

  // Preload every frame. At 30 fps the renderer cannot wait for an image
  // per frame, so they are all fetched first and the film plays from memory.
  const all = [];
  for (const s of SHOTS) {
    for (let i = 1; i <= s.count; i++) {
      const img = new Image();
      img.src = `frames/${s.id}_${String(i).padStart(4, '0')}.png`;
      all.push(img);
    }
  }
  window.PRELOAD = new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      n++;
      if (n >= all.length) resolve(true);
    };
    for (const img of all) {
      if (img.complete) tick();
      else {
        img.onload = tick;
        img.onerror = tick;
      }
    }
  });

  window.DUR = DUR;
  window.READY = true;
})();
