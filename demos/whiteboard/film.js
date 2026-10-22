/* eslint-disable */
/**
 * DEMO 3 — WHITEBOARD
 * Skill: gnipbao/codex-whiteboard-video-skill
 *
 * A whiteboard explainer. The drawing appears because a pen moved — the hand
 * travels the stroke, and the marker is on the board until it lifts. Nothing
 * fades in that was not written.
 *
 * The whiteboard skill's own rules, honoured here:
 *   - the hand follows the drawing, it does not appear after the fact
 *   - the surface is a real board, not a white rectangle
 *   - marker colour is limited: black, one red, one blue
 *   - one idea per shot, and the camera comes and goes
 *
 * The story is the product, in the order the product happens:
 *   1  0–6s   the brief is written
 *   2  6–13s  the shot list is drawn
 *   3  13–20s the shot list becomes four real shots, pinned to the board
 *   4  20–26s the shots become one file
 *   5  26–30s the hand lifts
 */
(() => {
  const W = 1920;
  const H = 1080;
  const DUR = 30;
  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d', { alpha: false });

  const { stroke, roughRect, hand, noise, smoothstep } = window.MM;

  const BLACK = '#23252a';
  const RED = '#d1402f';
  const BLUE = '#2b5fa8';
  const GREY = '#8b8f96';

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));

  // ── the stills pinned to the board ─────────────────────────────────────────
  const SHOTS = [
    { file: 'frames/launch-title.jpg', label: '01', time: '0:00' },
    { file: 'frames/kinetic-type.jpg', label: '02', time: '0:03' },
    { file: 'frames/product-loop.jpg', label: '03', time: '0:06' },
    { file: 'frames/footage-title.jpg', label: '04', time: '0:13' },
  ];
  const images = {};
  let loaded = 0;
  for (const s of SHOTS) {
    const img = new Image();
    img.onload = () => {
      loaded++;
    };
    img.src = s.file;
    images[s.file] = img;
  }

  // ── the board ──────────────────────────────────────────────────────────────
  const BOARD = { x: 70, y: 46, w: 1780, h: 950 };
  let boardCanvas = null;

  function buildBoard() {
    boardCanvas = document.createElement('canvas');
    boardCanvas.width = BOARD.w;
    boardCanvas.height = BOARD.h;
    const g = boardCanvas.getContext('2d');
    // a real board is never flat white
    g.fillStyle = '#f6f6f2';
    g.fillRect(0, 0, BOARD.w, BOARD.h);
    // the sheen from the room lights
    const sh = g.createLinearGradient(0, 0, BOARD.w * 0.8, BOARD.h);
    sh.addColorStop(0, 'rgba(255,255,255,0.85)');
    sh.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    sh.addColorStop(0.7, 'rgba(214,216,214,0.18)');
    sh.addColorStop(1, 'rgba(190,194,196,0.3)');
    g.fillStyle = sh;
    g.fillRect(0, 0, BOARD.w, BOARD.h);
    // smudges, from a board that has been used
    for (let i = 0; i < 26; i++) {
      const x = noise(i * 3.3) * BOARD.w;
      const y = noise(i * 7.1) * BOARD.h;
      const r = 30 + noise(i * 2.7) * 130;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(120,126,132,0.035)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // the tray shadow
    const tr = g.createLinearGradient(0, BOARD.h - 46, 0, BOARD.h);
    tr.addColorStop(0, 'rgba(0,0,0,0)');
    tr.addColorStop(1, 'rgba(60,66,72,0.16)');
    g.fillStyle = tr;
    g.fillRect(0, BOARD.h - 46, BOARD.w, 46);
  }

  // ── handwriting ────────────────────────────────────────────────────────────
  /**
   * Write text the way a hand does: the words appear in order, and the pen
   * is on the letter being written. `p` is 0..1 across the whole string.
   */
  function textMetrics(text, size, family) {
    ctx.save();
    ctx.font = '600 ' + size + 'px "' + family + '"';
    const w = ctx.measureText(text).width;
    ctx.restore();
    return w;
  }

  function writeText(text, x, y, size, p, family, color, align) {
    const chars = [...text];
    const shown = Math.floor(chars.length * clamp01(p));
    const full = textMetrics(text, size, family);
    let cx = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
    ctx.save();
    ctx.font = '600 ' + size + 'px "' + family + '"';
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < shown; i++) {
      const ch = chars[i];
      // a hand does not write perfectly straight
      const wob = (noise(i * 4.7) - 0.5) * size * 0.05;
      const rot = (noise(i * 2.9) - 0.5) * 0.035;
      ctx.save();
      ctx.translate(cx, y + wob);
      ctx.rotate(rot);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      cx += ctx.measureText(ch).width;
    }
    ctx.restore();
    return { shown, width: full };
  }

  /** Where the pen is, given a string being written at p. */
  function penAt(text, x, y, size, p, family, align) {
    const chars = [...text];
    const shown = Math.min(chars.length, Math.floor(chars.length * clamp01(p)));
    const full = textMetrics(text, size, family);
    let cx = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
    ctx.save();
    ctx.font = '600 ' + size + 'px "' + family + '"';
    for (let i = 0; i < shown; i++) cx += ctx.measureText(chars[i]).width;
    const last = shown > 0 ? chars[shown - 1] : ' ';
    ctx.restore();
    return { x: cx, y: y + (noise(shown * 3.3) - 0.5) * size * 0.05 };
  }

  // ── the shot list, as it is drawn ──────────────────────────────────────────
  const BOX = { x: 250, y: 400, w: 300, h: 170, gap: 40 };
  const boxX = (i) => BOX.x + i * (BOX.w + BOX.gap);

  // ── the camera ─────────────────────────────────────────────────────────────
  function camera(t) {
    // It sits back, comes in a little for the shot list, and pulls out for
    // the end. It never pushes twice in a row.
    const a = easeOut(seg(t, 5, 9));
    const b = seg(t, 19, 24);
    const zoom = 1.0 + 0.05 * a - 0.05 * easeOut(b);
    const panX = 20 - 40 * a + 30 * easeOut(b);
    const panY = -10 + 20 * a - 10 * easeOut(b);
    return { zoom, panX, panY };
  }

  // ── the film ───────────────────────────────────────────────────────────────
  window.render = function render(t) {
    if (!boardCanvas) buildBoard();
    const cam = camera(t);

    // the room around the board
    ctx.fillStyle = '#1a1c1e';
    ctx.fillRect(0, 0, W, H);
    const room = ctx.createRadialGradient(W * 0.5, H * 0.4, 200, W * 0.5, H * 0.5, 1500);
    room.addColorStop(0, 'rgba(70,76,82,0.5)');
    room.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = room;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2 + cam.panX, H / 2 + cam.panY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-W / 2, -H / 2);

    // the board, with a frame and a shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 44;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#f6f6f2';
    ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
    ctx.restore();
    ctx.drawImage(boardCanvas, BOARD.x, BOARD.y);
    ctx.strokeStyle = '#9aa0a6';
    ctx.lineWidth = 10;
    ctx.strokeRect(BOARD.x - 5, BOARD.y - 5, BOARD.w + 10, BOARD.h + 10);
    // the tray
    ctx.fillStyle = '#7d838a';
    ctx.fillRect(BOARD.x - 5, BOARD.y + BOARD.h + 5, BOARD.w + 10, 16);

    ctx.translate(BOARD.x, BOARD.y);

    // ── 1. the brief ─────────────────────────────────────────────────────────
    const briefP = seg(t, 0.6, 4.4);
    if (briefP > 0) {
      writeText('A 21 second product loop.', 120, 190, 74, briefP, 'Caveat', BLACK);
      const p2 = seg(t, 3.4, 6.0);
      if (p2 > 0) writeText('Four shots. One file.', 120, 288, 74, p2, 'Caveat', RED);
    }

    // ── 2. the shot list ─────────────────────────────────────────────────────
    const listP = seg(t, 6.2, 12.5);
    SHOTS.forEach((s, i) => {
      const r = clamp01((listP - i * 0.16) * 3.2);
      if (r <= 0) return;
      const x = boxX(i);
      const pts = roughRect(x, BOX.y, BOX.w, BOX.h, 2.6, i * 17);
      stroke(ctx, pts, { kind: 'marker', color: BLACK, width: 4.6, reveal: easeOut(r), alpha: 0.9 });
      if (r > 0.75) {
        writeText(s.label, x + 4, BOX.y - 22, 42, (r - 0.75) * 4, 'Caveat', GREY);
        writeText(s.time, x + BOX.w - 92, BOX.y - 22, 42, (r - 0.75) * 4, 'Caveat', GREY);
      }
    });
    // the bracket under the four boxes
    const brP = seg(t, 11.2, 12.8);
    if (brP > 0) {
      const y = BOX.y + BOX.h + 52;
      const x1 = boxX(0) + 10;
      const x2 = boxX(3) + BOX.w - 10;
      const pts = [
        { x: x1, y },
        { x: x1 + 26, y: y + 22 },
        { x: x2 - 26, y: y + 22 },
        { x: x2, y },
      ];
      stroke(ctx, pts, { kind: 'marker', color: BLUE, width: 4, reveal: easeOut(brP), alpha: 0.85 });
      if (brP > 0.6) writeText('the shot list', (x1 + x2) / 2, y + 80, 52, (brP - 0.6) * 2.5, 'Caveat', BLUE, 'center');
    }

    // ── 3. the shot list becomes the shots ──────────────────────────────────
    const pinP = seg(t, 13.2, 19.5);
    SHOTS.forEach((s, i) => {
      // Each shot gets its own window inside pinP, and every window closes.
      const start = (i / SHOTS.length) * 0.72;
      const r = clamp01((pinP - start) / 0.28);
      if (r <= 0) return;
      const img = images[s.file];
      const x = boxX(i);
      const y = BOX.y;
      const w = BOX.w;
      const h = BOX.h;
      ctx.save();
      // the still is pinned over the drawing, and it settles in
      const drop = (1 - easeOut(r)) * 26;
      const tilt = (1 - easeOut(r)) * 0.06;
      ctx.translate(x + w / 2, y + h / 2 + drop);
      ctx.rotate(tilt);
      ctx.globalAlpha = easeOut(r);
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      if (img && img.complete && img.naturalWidth) {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const s2 = Math.min(w / iw, h / ih);
        ctx.drawImage(img, (-iw * s2) / 2, (-ih * s2) / 2, iw * s2, ih * s2);
      }
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(30,32,36,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
      // a pin in the corner
      ctx.save();
      ctx.globalAlpha = easeOut(r);
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(x + w - 26, y + 24, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ── 4. the shots become one file ────────────────────────────────────────
    const fileP = seg(t, 20.4, 25.4);
    if (fileP > 0) {
      // a bracket gathering the four into one
      const y = BOX.y + BOX.h + 196;
      const x1 = boxX(0) + 30;
      const x2 = boxX(3) + BOX.w - 30;
      const pts = [
        { x: x1, y: y - 30 },
        { x: x1, y },
        { x: x2, y },
        { x: x2, y: y - 30 },
      ];
      stroke(ctx, pts, { kind: 'marker', color: BLACK, width: 4.4, reveal: easeOut(fileP), alpha: 0.9 });
      if (fileP > 0.35) {
        writeText('product-loop.mp4', (x1 + x2) / 2, y + 78, 62, (fileP - 0.35) * 1.9, 'Permanent Marker', BLACK, 'center');
      }
      if (fileP > 0.7) {
        writeText('the file you own', (x1 + x2) / 2, y + 132, 46, (fileP - 0.7) * 3.4, 'Caveat', RED, 'center');
      }
    }

    ctx.restore();

    // ── the hand ─────────────────────────────────────────────────────────────
    // The pen is on the board for the whole of the drawing, and lifts at the
    // end. It is never in front of the thing it is drawing.
    const handAt = handPosition(t);
    if (handAt) {
      ctx.save();
      // a soft shadow of the hand on the board
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = '#2a2e33';
      ctx.beginPath();
      ctx.ellipse(handAt.x + 74, handAt.y + 14, 58, 22, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      hand(ctx, handAt.x + 48, handAt.y - 34, handAt.angle, { body: '#2b2e33', cap: RED, skin: '#e9b892' });
    }

    return true;
  };

  /** Where the pen is at time t, and whether it is on the board at all. */
  function handPosition(t) {
    // 1. writing the brief
    if (t > 0.5 && t < 6.2) {
      if (t < 3.4) {
        const p = seg(t, 0.6, 4.4);
        const a = penAt('A 21 second product loop.', 120, 190, 74, p, 'Caveat');
        return { x: a.x, y: a.y, angle: 0.46 + Math.sin(t * 5) * 0.05 };
      }
      const p = seg(t, 3.4, 6.0);
      const a = penAt('Four shots. One file.', 120, 288, 74, p, 'Caveat');
      return { x: a.x, y: a.y, angle: 0.46 + Math.sin(t * 5) * 0.05 };
    }
    // 2. drawing the boxes
    if (t > 6.2 && t < 12.6) {
      const listP = seg(t, 6.2, 12.5);
      for (let i = 0; i < 4; i++) {
        const r = clamp01((listP - i * 0.16) * 3.2);
        if (r <= 0) continue;
        if (r < 1) {
          const pts = roughRect(boxX(i), BOX.y, BOX.w, BOX.h, 2.6, i * 17);
          const at = window.MM.alongStroke(pts, easeOut(r));
          return { x: at.x + BOARD.x, y: at.y + BOARD.y, angle: at.angle - 1.1 };
        }
      }
      // the bracket
      const brP = seg(t, 11.2, 12.8);
      if (brP < 1) {
        const y = BOX.y + BOX.h + 52;
        const x1 = boxX(0) + 10;
        const x2 = boxX(3) + BOX.w - 10;
        const pts = [
          { x: x1, y },
          { x: x1 + 26, y: y + 22 },
          { x: x2 - 26, y: y + 22 },
          { x: x2, y },
        ];
        const at = window.MM.alongStroke(pts, easeOut(brP));
        return { x: at.x + BOARD.x, y: at.y + BOARD.y, angle: at.angle - 1.1 };
      }
    }
    // 3. pinning the shots
    if (t > 13.2 && t < 19.6) {
      const pinP = seg(t, 13.2, 19.5);
      for (let i = 0; i < 4; i++) {
        const start = (i / SHOTS.length) * 0.72;
        const r = clamp01((pinP - start) / 0.28);
        if (r > 0 && r < 0.5) {
          return {
            x: boxX(i) + BOX.w - 26 + BOARD.x,
            y: BOX.y + 24 + BOARD.y,
            angle: -1.1,
          };
        }
      }
    }
    // 4. the file
    if (t > 20.4 && t < 25.6) {
      const fileP = seg(t, 20.4, 25.4);
      if (fileP < 0.4) {
        const y = BOX.y + BOX.h + 196;
        const x1 = boxX(0) + 30;
        const x2 = boxX(3) + BOX.w - 30;
        const pts = [
          { x: x1, y: y - 30 },
          { x: x1, y },
          { x: x2, y },
          { x: x2, y: y - 30 },
        ];
        const at = window.MM.alongStroke(pts, easeOut(fileP / 0.4));
        return { x: at.x + BOARD.x, y: at.y + BOARD.y, angle: at.angle - 1.1 };
      }
      const p2 = (fileP - 0.35) / 0.55;
      const a = penAt('product-loop.mp4', (boxX(0) + 30 + boxX(3) + BOX.w - 30) / 2, BOX.y + BOX.h + 274, 62, p2, 'Permanent Marker', 'center');
      return { x: a.x + BOARD.x, y: a.y + BOARD.y, angle: 0.46 + Math.sin(t * 5) * 0.05 };
    }
    // 5. the hand lifts
    if (t >= 25.6 && t < 27.2) {
      const q = seg(t, 25.6, 27.2);
      return {
        x: (boxX(0) + 30 + boxX(3) + BOX.w - 30) / 2 + BOARD.x + q * 700,
        y: BOX.y + BOX.h + 274 + BOARD.y - q * 420,
        angle: -0.5 + q * 0.8,
      };
    }
    return null;
  }

  window.DUR = DUR;
  window.READY = true;
})();
