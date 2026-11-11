// Check the two new moving pieces in a real browser:
//   1. the engine film plays on its own, and the sound button speaks;
//   2. a hero card plays its footage when the pointer reaches it;
//   3. reduced motion is a real experience, not an empty one.
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (m, p = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error('timeout ' + m)), 25000);
    pending.set(i, (v) => {
      clearTimeout(t);
      res(v);
    });
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
};
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('page threw: ' + r.exceptionDetails.text);
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const check = (ok, label) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failures.push(label);
};

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
await sleep(3200);

/* 1 — the film plays when it is scrolled to (it must not decode while it is
   off screen, so the scroll is part of the test) */
await evaluate(`document.querySelector('#film').scrollIntoView({behavior:'instant', block:'center'})`);
await sleep(1600);
const film = await evaluate(`(() => {
  const v = document.querySelector('.showcase__video');
  return v ? { exists: true, paused: v.paused, time: v.currentTime, muted: v.muted, w: v.videoWidth, h: v.videoHeight } : { exists: false };
})()`);
check(film.exists, 'the engine film is on the page');
check(film.w === 1920 && film.h === 1080, `the film decoded at 1920x1080 (got ${film.w}x${film.h})`);
check(film.paused === false, 'the film is playing on its own');
check(film.time > 0, `the film clock is running (t=${Number(film.time).toFixed(2)}s)`);
check(film.muted === true, 'the film starts muted');

/* the frame is filled, not letterboxed into a corner */
const fill = await evaluate(`(() => {
  const v = document.querySelector('.showcase__video');
  const r = v.getBoundingClientRect();
  const f = v.parentElement.getBoundingClientRect();
  return { vw: Math.round(r.width), fw: Math.round(f.width) - 40, vh: Math.round(r.height), ratio: +(r.width / r.height).toFixed(2) };
})()`);
check(fill.vw >= fill.fw - 4, `the film fills its frame (${fill.vw}px in ${fill.fw}px)`);
check(Math.abs(fill.ratio - 16 / 9) < 0.03, `the film keeps 16:9 (${fill.ratio})`);

/* 2 — the sound button speaks */
await evaluate(`document.querySelector('[data-film-sound]').click()`);
await sleep(400);
const sound = await evaluate(`(() => {
  const v = document.querySelector('.showcase__video');
  const b = document.querySelector('[data-film-sound]');
  return { muted: v.muted, pressed: b.getAttribute('aria-pressed'), label: b.textContent.trim() };
})()`);
check(sound.muted === false, 'the sound button unmutes the film');
check(sound.pressed === 'true', 'the sound button records its state');
check(/on/i.test(sound.label), `the button says what it did (${sound.label})`);

/* 3 — a hero card plays under the pointer */
await evaluate(`window.scrollTo(0, 0)`);
await sleep(900);
const card = await evaluate(`(() => {
  const v = document.querySelector('.hero__card--c1 .hero__clip');
  if (!v) return { exists: false };
  const r = v.getBoundingClientRect();
  return { exists: true, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), time: v.currentTime };
})()`);
check(card.exists, 'the hero cards carry video');
if (card.exists) {
  const before = card.time;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 12, y: 12, pointerType: 'mouse' });
  await sleep(200);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: card.x, y: card.y, pointerType: 'mouse' });
  await sleep(1600);
  const after = await evaluate(`document.querySelector('.hero__card--c1 .hero__clip').currentTime`);
  check(after > before, `the pointer runs a card's footage (${Number(before).toFixed(2)}s -> ${Number(after).toFixed(2)}s)`);
}

/* 4 — reduced motion is a real experience */
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
await sleep(3200);
await evaluate(`document.querySelector('#film').scrollIntoView({behavior:'instant', block:'center'})`);
await sleep(1400);
const reduced = await evaluate(`(() => {
  const v = document.querySelector('.showcase__video');
  const c = document.querySelector('.hero__card--c1 .hero__clip');
  const h = document.querySelector('#film-title');
  const frame = document.querySelector('.showcase__frame');
  return {
    filmPaused: v?.paused, cardPaused: c?.paused, filmTime: v?.currentTime,
    headingVisible: h ? getComputedStyle(h).opacity : null,
    posterShown: v?.poster ? getComputedStyle(v).backgroundImage !== 'none' : null,
    frameVisible: frame ? Math.round(frame.getBoundingClientRect().height) : null,
  };
})()`);
check(reduced.filmPaused === true, 'reduced motion: the film does not move');
check(Number(reduced.filmTime) === 0, 'reduced motion: the film clock stays at zero');
check(reduced.cardPaused === true, 'reduced motion: the hero cards do not move');
check(Number(reduced.headingVisible) === 1, 'reduced motion: the writing is all there');
check(reduced.frameVisible > 200, `reduced motion: the frame is still there (${reduced.frameVisible}px)`);

console.log(failures.length ? `\nFAILED ${failures.length}` : '\nALL PASS');
process.exit(failures.length ? 1 : 0);
