/* eslint-disable */
/**
 * DEMO 1 — BLUEPRINT
 * Style: lemo-opuscar / styles/blueprint
 *
 * "The whole film happens on one sheet of blueprint paper lying on a dark
 * drafting table. The camera moves over it like an eye reading a drawing."
 * White line work on uneven Prussian blue. Centre lines, dimension lines,
 * leader lines with numbered balloons, a title block, a notes column. 2D line
 * drawing language — 3D rendering never. The drawing is dry and exact.
 *
 * "The designed thing is the character." Here the designed thing is the plan
 * of a film, and the film arrives inside the plan.
 *
 * Shot list (huashu-art-motion's discipline: one idea per shot, 2–6 s each,
 * camera comes and goes, no three pushes in a row, ≤30% text-led):
 *   1  0–6s   the sheet lands on the table, camera drifts in
 *   2  6–13s  the plan draws itself: four frames, centre lines, balloons
 *   3  13–20s the camera reads across; each frame fills with its shot
 *   4  20–26s a hand signs the title block, a note is written
 *   5  26–30s camera pulls back; the sheet is stamped
 */
(() => {
  const W = 1920;
  const H = 1080;
  const DUR = 30;
  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d', { alpha: false });

  const { stroke, roughRect, paper, noise, smoothstep } = window.MM;

  // ── the sheet ──────────────────────────────────────────────────────────────
  const SHEET = { x: 60, y: 58, w: 1800, h: 964 };
  const BLUE = '#12395e';
  const INK = 'rgba(228,240,250,0.86)';
  const FAINT = 'rgba(190,214,236,0.42)';
  const ACCENT = 'rgba(255,120,60,0.9)';

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeIn = (x) => x * x * x;
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));

  // ── the drawing ────────────────────────────────────────────────────────────
  // Four frames in a row: the shot list. Each becomes one of our real shots.
  const FRAMES = [
    { x: 150, w: 340, label: '01 TITLE', dur: '3.5s' },
    { x: 530, w: 340, label: '02 TYPE', dur: '2.5s' },
    { x: 910, w: 340, label: '03 STAGES', dur: '6.0s' },
    { x: 1290, w: 340, label: '04 FOOTAGE', dur: '4.0s' },
  ];
  const FRAME_Y = 300;
  const FRAME_H = 191;

  /** A dash-dot centre line, the classic drafting convention. */
  function centreLine(x1, y1, x2, y2, reveal, alpha) {
    ctx.save();
    ctx.strokeStyle = alpha ? `rgba(190,214,236,${alpha})` : FAINT;
    ctx.lineWidth = 1.1;
    ctx.setLineDash([26, 8, 3, 8]);
    ctx.lineDashOffset = 26 * (1 - reveal);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (x2 - x1) * reveal, y1 + (y2 - y1) * reveal);
    ctx.stroke();
    ctx.restore();
  }

  /** A dimension line with arrow ticks and a figure. */
  function dimension(x1, x2, y, label, reveal) {
    if (reveal <= 0) return;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    const x = x1 + (x2 - x1) * reveal;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    // witness lines and arrow ticks
    ctx.beginPath();
    ctx.moveTo(x1, y - 9);
    ctx.lineTo(x1, y + 9);
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x, y + 9);
    ctx.stroke();
    const tick = (px, dir) => {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + 9 * dir, y - 3.4);
      ctx.lineTo(px + 9 * dir, y + 3.4);
      ctx.closePath();
      ctx.fillStyle = INK;
      ctx.fill();
    };
    tick(x1, 1);
    if (reveal > 0.9) tick(x2, -1);
    if (reveal > 0.5) {
      ctx.font = '500 17px "Plex Mono", monospace';
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.fillText(label, (x1 + x2) / 2, y - 12);
    }
    ctx.restore();
  }

  /** A leader line to a numbered balloon. */
  function balloon(x, y, n, reveal) {
    if (reveal <= 0) return;
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 34, y - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 46, y - 38, 15, 0, Math.PI * 2);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.font = '500 16px "Plex Mono", monospace';
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), x + 46, y - 37);
    ctx.restore();
  }

  function mono(text, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight || 400) + ' ' + size + 'px "Plex Mono", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function sans(text, x, y, size, color, align, weight) {
    ctx.save();
    ctx.font = (weight || 400) + ' ' + size + 'px "Plex Sans", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ── the sheet surface ──────────────────────────────────────────────────────
  let sheetCanvas = null;
  function buildSheet() {
    sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = SHEET.w;
    sheetCanvas.height = SHEET.h;
    const g = sheetCanvas.getContext('2d');
    // Prussian blue, uneven
    g.fillStyle = BLUE;
    g.fillRect(0, 0, SHEET.w, SHEET.h);
    for (let i = 0; i < 160; i++) {
      const x = noise(i * 3.7) * SHEET.w;
      const y = noise(i * 9.1) * SHEET.h;
      const r = 70 + noise(i * 2.9) * 260;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      const up = noise(i * 5.3) > 0.5;
      rg.addColorStop(0, up ? 'rgba(40,92,140,0.10)' : 'rgba(8,28,48,0.12)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // the fold and the worn edge
    g.strokeStyle = 'rgba(10,30,50,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(SHEET.w * 0.5, 0);
    g.lineTo(SHEET.w * 0.5, SHEET.h);
    g.stroke();
  }

  // ── the shots inside the frames ────────────────────────────────────────────
  // Each frame gets a line drawing of one of our real shots. Not the
  // photograph — a drawing of it, because this is a drawing.
  function drawShotInFrame(g, x, y, w, h, kind, t) {
    g.save();
    g.translate(x, y);
    g.strokeStyle = INK;
    g.lineWidth = 1.4;

    if (kind === 0) {
      // 01 TITLE — a wordmark block with a rule under it
      const rev = clamp01(t * 1.4);
      g.globalAlpha = rev;
      g.strokeRect(w * 0.14, h * 0.34, w * 0.5, h * 0.2);
      g.beginPath();
      g.moveTo(w * 0.14, h * 0.66);
      g.lineTo(w * 0.46, h * 0.66);
      g.stroke();
      g.strokeStyle = ACCENT;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(w * 0.14, h * 0.66);
      g.lineTo(w * 0.14 + w * 0.32 * rev, h * 0.66);
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(w * 0.14, h * 0.78 + i * 7);
        g.lineTo(w * 0.14 + (18 + i * 9), h * 0.78 + i * 7);
        g.stroke();
      }
    } else if (kind === 1) {
      // 02 TYPE — six stacked words, the second and fourth accented
      const words = 6;
      for (let i = 0; i < words; i++) {
        const rev = clamp01((t - i * 0.12) * 3);
        if (rev <= 0) continue;
        g.globalAlpha = rev;
        g.strokeStyle = i % 2 === 1 ? ACCENT : INK;
        g.lineWidth = i % 2 === 1 ? 3 : 2.2;
        g.beginPath();
        g.moveTo(w * 0.14, h * 0.2 + i * h * 0.11);
        g.lineTo(w * 0.14 + (w * 0.34 - i * w * 0.02) * rev, h * 0.2 + i * h * 0.11);
        g.stroke();
      }
    } else if (kind === 2) {
      // 03 STAGES — four bars filling
      for (let i = 0; i < 4; i++) {
        const rev = clamp01((t - i * 0.16) * 2.2);
        g.globalAlpha = 0.9;
        g.strokeStyle = INK;
        g.lineWidth = 1.1;
        g.strokeRect(w * 0.16, h * 0.22 + i * h * 0.16, w * 0.6, h * 0.055);
        g.strokeStyle = ACCENT;
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(w * 0.16, h * 0.22 + i * h * 0.16 + h * 0.027);
        g.lineTo(w * 0.16 + w * 0.6 * rev, h * 0.22 + i * h * 0.16 + h * 0.027);
        g.stroke();
      }
    } else {
      // 04 FOOTAGE — a frame with a sweep and a title bar
      g.globalAlpha = 0.9;
      g.strokeRect(w * 0.1, h * 0.12, w * 0.8, h * 0.76);
      g.strokeStyle = ACCENT;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(w * 0.1 + w * 0.8 * clamp01(t * 1.2), h * 0.12);
      g.lineTo(w * 0.1 + w * 0.8 * clamp01(t * 1.2) - w * 0.12, h * 0.88);
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(w * 0.18, h * 0.6);
      g.lineTo(w * 0.52, h * 0.6);
      g.stroke();
    }
    g.restore();
  }

  // ── the camera ─────────────────────────────────────────────────────────────
  // It moves over the sheet like an eye reading a drawing. It comes and it
  // goes: in on the sheet, across the frames, out again.
  function camera(t) {
    const inP = easeInOut(seg(t, 0, 6));
    const outP = easeInOut(seg(t, 26, 30));
    const zoom = 1.1 - 0.1 * inP + 0.06 * outP;
    const panX = -40 + 120 * easeInOut(seg(t, 13, 20)) - 80 * outP;
    const panY = -12 + 18 * easeInOut(seg(t, 13, 20)) + 10 * outP;
    return { zoom, panX, panY };
  }

  // ── the film ───────────────────────────────────────────────────────────────
  window.render = function render(t) {
    if (!sheetCanvas) buildSheet();
    const cam = camera(t);

    // the drafting table
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, W, H);
    const tg = ctx.createRadialGradient(W * 0.5, H * 0.45, 100, W * 0.5, H * 0.45, 1400);
    tg.addColorStop(0, 'rgba(40,52,64,0.45)');
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2 + cam.panX, H / 2 + cam.panY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-W / 2, -H / 2);

    // the sheet, with a shadow on the table
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = BLUE;
    ctx.fillRect(SHEET.x, SHEET.y, SHEET.w, SHEET.h);
    ctx.restore();
    ctx.drawImage(sheetCanvas, SHEET.x, SHEET.y);

    // everything is drawn in sheet space
    ctx.translate(SHEET.x, SHEET.y);

    // ── the plan draws itself ────────────────────────────────────────────────
    const drawP = seg(t, 5.2, 13);
    const planReveal = easeOut(drawP);

    // the four frames
    FRAMES.forEach((f, i) => {
      const r = clamp01((planReveal - i * 0.12) * 3);
      if (r <= 0) return;
      const pts = roughRect(f.x, FRAME_Y, f.w, FRAME_H, 2.2, i * 11);
      stroke(ctx, pts, { kind: 'pen', color: INK, width: 2, reveal: r, alpha: 0.9 });
      // the shot inside the frame comes alive after the box is drawn
      const alive = clamp01((t - 13.2 - i * 0.5) * 0.85);
      if (alive > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(f.x, FRAME_Y, f.w, FRAME_H);
        ctx.clip();
        drawShotInFrame(ctx, f.x, FRAME_Y, f.w, FRAME_H, i, alive);
        ctx.restore();
      }
      // the label under the frame
      if (r > 0.7) {
        ctx.globalAlpha = (r - 0.7) / 0.3;
        mono(f.label, f.x, FRAME_Y + FRAME_H + 30, 16, INK);
        ctx.globalAlpha = 1;
      }
    });

    // centre lines through each frame
    if (planReveal > 0.1) {
      FRAMES.forEach((f, i) => {
        const r = clamp01((planReveal - 0.25 - i * 0.08) * 2);
        centreLine(f.x + f.w / 2, FRAME_Y - 46, f.x + f.w / 2, FRAME_Y + FRAME_H + 46, r, 0.32);
        centreLine(f.x - 40, FRAME_Y + FRAME_H / 2, f.x + f.w + 40, FRAME_Y + FRAME_H / 2, r, 0.32);
      });
    }

    // the dimension line under the frames
    dimension(150, 1630, FRAME_Y + FRAME_H + 78, '21.0 s TOTAL', clamp01((planReveal - 0.5) * 2.2));
    // and one per frame
    FRAMES.forEach((f, i) => {
      const r = clamp01((planReveal - 0.6 - i * 0.1) * 2.4);
      dimension(f.x, f.x + f.w, FRAME_Y - 74, f.dur, r);
    });

    // balloons
    const by = FRAME_Y + FRAME_H + 52;
    FRAMES.forEach((f, i) => {
      const bs = 0.66 + (i / FRAMES.length) * 0.28;
      balloon(f.x + f.w - 92, by, i + 1, clamp01((planReveal - bs) / 0.1));
    });

    // ── the title block ──────────────────────────────────────────────────────
    const TB = { x: 1360, y: 690, w: 400, h: 182 };
    const tbP = easeOut(seg(t, 1.2, 4.2));
    if (tbP > 0) {
      const pts = roughRect(TB.x, TB.y, TB.w, TB.h, 1.8, 77);
      stroke(ctx, pts, { kind: 'pen', color: INK, width: 2, reveal: tbP, alpha: 0.9 });
      ctx.save();
      ctx.globalAlpha = tbP;
      // the rules inside the block
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      for (const yy of [TB.y + 44, TB.y + 88, TB.y + 132]) {
        ctx.beginPath();
        ctx.moveTo(TB.x, yy);
        ctx.lineTo(TB.x + TB.w, yy);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(TB.x + 250, TB.y);
      ctx.lineTo(TB.x + 250, TB.y + 88);
      ctx.stroke();

      mono('MOTION MASTER', TB.x + 16, TB.y + 30, 16, INK, 'left', 500);
      mono('BRIEF', TB.x + 16, TB.y + 62, 13, FAINT);
      mono('21s PRODUCT LOOP', TB.x + 16, TB.y + 82, 15, INK);
      mono('DRAWN BY', TB.x + 16, TB.y + 116, 13, FAINT);
      mono('THE AGENT', TB.x + 16, TB.y + 136, 15, INK);
      mono('FOR', TB.x + 266, TB.y + 116, 13, FAINT);
      mono('MOTION', TB.x + 266, TB.y + 136, 15, INK);
      mono('MASTER', TB.x + 266, TB.y + 154, 15, INK);
      ctx.restore();
    }

    // ── the notes column ─────────────────────────────────────────────────────
    const noteP = easeOut(seg(t, 20.5, 24));
    if (noteP > 0) {
      ctx.save();
      ctx.globalAlpha = noteP;
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(150, 668);
      ctx.lineTo(150, 872);
      ctx.stroke();
      mono('NOTES', 178, 690, 15, FAINT, 'left', 500);
      const notes = [
        'ONE FILM. FOUR SHOTS.',
        'NO FOOTAGE LICENCE NEEDED.',
        'EVERY FRAME RENDERED',
        'FROM CODE.',
      ];
      notes.forEach((n, i) => {
        const r = clamp01((noteP - i * 0.16) * 3);
        if (r <= 0) return;
        mono(n, 178, 730 + i * 32, 17, INK, 'left', 500);
        ctx.globalAlpha = noteP * r;
      });
      ctx.restore();
    }

    // ── the hand signs it ────────────────────────────────────────────────────
    const signP = seg(t, 22.5, 25.5);
    if (signP > 0) {
      const sig = [];
      for (let i = 0; i <= 40; i++) {
        const q = i / 40;
        sig.push({
          x: TB.x + 22 + q * 150 + Math.sin(q * 14) * 9,
          y: TB.y + 158 - Math.sin(q * 9) * 9 - q * 3,
        });
      }
      stroke(ctx, sig, { kind: 'marker', color: 'rgba(240,248,255,0.92)', width: 3.4, reveal: easeOut(signP) });
      // the hand shadow with the pen
      const at = window.MM.alongStroke(sig, easeOut(signP));
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(at.x + 14, at.y + 26, 34, 16, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      window.MM.hand(ctx, at.x, at.y, at.angle + 0.5, { body: '#1b2b3a', cap: '#d4663a' });
    }

    // ── the stamp ────────────────────────────────────────────────────────────
    const stampP = seg(t, 26.2, 27.2);
    if (stampP > 0) {
      ctx.save();
      ctx.translate(TB.x + 300, TB.y + 30);
      ctx.rotate(-0.14);
      ctx.globalAlpha = clamp01((stampP - 0.3) * 2.4) * 0.85;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3;
      ctx.strokeRect(-88, -26, 176, 52);
      ctx.font = '600 26px "Plex Sans", sans-serif';
      ctx.fillStyle = ACCENT;
      ctx.textAlign = 'center';
      ctx.fillText('RENDERED', 0, 9);
      ctx.restore();
    }

    ctx.restore();
    return true;
  };

  window.DUR = DUR;
  window.READY = true;
})();
